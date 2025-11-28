/**
 * AuthService
 *
 * Servicio centralizado de autenticación que conecta Auth con Super-Admin.
 * Gestiona sesiones, usuarios, y sincroniza cambios entre ambos módulos.
 */

const crypto = require('crypto');
const path = require('path');

const Database = require('better-sqlite3');

const configService = require('./ConfigurationService');

class AuthService {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, '..', 'data', 'gestor_tienda.db');
    this.db = null;
    this.activeSessions = new Map(); // sessionToken -> userData
  }

  /**
   * Conectar a la base de datos
   */
  connect() {
    if (!this.db) {
      this.db = new Database(this.dbPath);
    }
    return this.db;
  }

  /**
   * Cerrar conexión
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Generar token de sesión único
   */
  generarToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash de contraseña usando SHA-256
   * @param {string} password - Contraseña en texto plano
   */
  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Autenticar usuario
   * @param {string} usuario - Nombre de usuario
   * @param {string} password - Contraseña
   * @param {number} negocio_id - ID del negocio
   */
  async autenticar(usuario, password, negocio_id) {
    const db = this.connect();
    const securityConfig = configService.getSecurityConfig();

    // Buscar usuario
    const user = db
      .prepare(
        `
      SELECT 
        u.*,
        r.nombre as rol_nombre,
        r.permisos as rol_permisos
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE u.usuario = ?
        AND u.negocio_id = ?
    `
      )
      .get(usuario, negocio_id);

    if (!user) {
      this.registrarIntentoFallido(usuario, negocio_id, 'Usuario no encontrado');
      throw new Error('Usuario o contraseña incorrectos');
    }

    // Verificar si el usuario está bloqueado
    if (user.bloqueado === 1) {
      throw new Error('Usuario bloqueado. Contacte al administrador.');
    }

    // Verificar si el usuario está inactivo
    const diasInactividad = securityConfig.inactive_user_days || 90;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasInactividad);

    if (user.ultimo_acceso && new Date(user.ultimo_acceso) < fechaLimite) {
      throw new Error(
        `Usuario inactivo por más de ${diasInactividad} días. Contacte al administrador.`
      );
    }

    // Verificar intentos fallidos
    const maxIntentos = securityConfig.max_login_attempts || 5;
    if (user.intentos_fallidos >= maxIntentos) {
      // Bloquear usuario automáticamente
      db.prepare('UPDATE usuarios SET bloqueado = 1 WHERE id = ?').run(user.id);
      throw new Error(`Usuario bloqueado después de ${maxIntentos} intentos fallidos.`);
    }

    // Verificar contraseña
    const passwordHash = this.hashPassword(password);
    if (user.password !== passwordHash) {
      // Incrementar intentos fallidos
      db.prepare('UPDATE usuarios SET intentos_fallidos = intentos_fallidos + 1 WHERE id = ?').run(
        user.id
      );

      this.registrarIntentoFallido(usuario, negocio_id, 'Contraseña incorrecta');
      throw new Error('Usuario o contraseña incorrectos');
    }

    // Autenticación exitosa
    // Resetear intentos fallidos y actualizar último acceso
    db.prepare(
      `
      UPDATE usuarios 
      SET intentos_fallidos = 0,
          ultimo_acceso = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    ).run(user.id);

    // Generar token de sesión
    const token = this.generarToken();
    const sessionTimeout = securityConfig.session_timeout_minutes || 480; // 8 horas por defecto
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + sessionTimeout);

    // Guardar sesión
    db.prepare(
      `
      INSERT INTO sesiones (usuario_id, token, expires_at, negocio_id)
      VALUES (?, ?, ?, ?)
    `
    ).run(user.id, token, expiresAt.toISOString(), negocio_id);

    // Guardar en caché de memoria
    this.activeSessions.set(token, {
      usuario_id: user.id,
      usuario: user.usuario,
      nombre: user.nombre,
      rol_id: user.rol_id,
      rol_nombre: user.rol_nombre,
      negocio_id: user.negocio_id,
      expires_at: expiresAt,
    });

    // Registrar evento de auditoría
    this.registrarEvento({
      tipo: 'login_exitoso',
      usuario_id: user.id,
      negocio_id,
      descripcion: `Usuario ${user.usuario} inició sesión exitosamente`,
    });

    // Parsear permisos
    let permisos = {};
    if (user.rol_permisos) {
      try {
        permisos = JSON.parse(user.rol_permisos);
      } catch (error) {
        console.error('Error parseando permisos:', error);
      }
    }

    return {
      token,
      usuario: {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre,
        email: user.email,
        rol_id: user.rol_id,
        rol_nombre: user.rol_nombre,
        permisos,
        negocio_id: user.negocio_id,
      },
      expires_at: expiresAt.toISOString(),
    };
  }

  /**
   * Validar token de sesión
   * @param {string} token - Token de sesión
   */
  async validarToken(token) {
    // Verificar en caché primero
    if (this.activeSessions.has(token)) {
      const session = this.activeSessions.get(token);
      if (new Date() < session.expires_at) {
        return session;
      } else {
        // Sesión expirada
        this.activeSessions.delete(token);
      }
    }

    // Verificar en base de datos
    const db = this.connect();
    const session = db
      .prepare(
        `
      SELECT 
        s.*,
        u.usuario,
        u.nombre,
        u.email,
        u.rol_id,
        u.bloqueado,
        r.nombre as rol_nombre,
        r.permisos as rol_permisos
      FROM sesiones s
      JOIN usuarios u ON s.usuario_id = u.id
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE s.token = ?
        AND s.active = 1
    `
      )
      .get(token);

    if (!session) {
      throw new Error('Sesión inválida o expirada');
    }

    // Verificar expiración
    if (new Date() > new Date(session.expires_at)) {
      db.prepare('UPDATE sesiones SET active = 0 WHERE token = ?').run(token);
      throw new Error('Sesión expirada');
    }

    // Verificar si el usuario está bloqueado
    if (session.bloqueado === 1) {
      this.cerrarSesion(token);
      throw new Error('Usuario bloqueado');
    }

    // Actualizar caché
    this.activeSessions.set(token, {
      usuario_id: session.usuario_id,
      usuario: session.usuario,
      nombre: session.nombre,
      email: session.email,
      rol_id: session.rol_id,
      rol_nombre: session.rol_nombre,
      negocio_id: session.negocio_id,
      expires_at: new Date(session.expires_at),
    });

    // Parsear permisos
    let permisos = {};
    if (session.rol_permisos) {
      try {
        permisos = JSON.parse(session.rol_permisos);
      } catch (error) {
        console.error('Error parseando permisos:', error);
      }
    }

    return {
      usuario_id: session.usuario_id,
      usuario: session.usuario,
      nombre: session.nombre,
      email: session.email,
      rol_id: session.rol_id,
      rol_nombre: session.rol_nombre,
      permisos,
      negocio_id: session.negocio_id,
    };
  }

  /**
   * Cerrar sesión
   * @param {string} token - Token de sesión
   */
  async cerrarSesion(token) {
    const db = this.connect();

    // Obtener datos de sesión antes de cerrarla
    const session = db
      .prepare('SELECT usuario_id, negocio_id FROM sesiones WHERE token = ?')
      .get(token);

    // Desactivar sesión en BD
    db.prepare('UPDATE sesiones SET active = 0 WHERE token = ?').run(token);

    // Eliminar de caché
    this.activeSessions.delete(token);

    // Registrar evento
    if (session) {
      this.registrarEvento({
        tipo: 'logout',
        usuario_id: session.usuario_id,
        negocio_id: session.negocio_id,
        descripcion: 'Usuario cerró sesión',
      });
    }
  }

  /**
   * Invalidar todas las sesiones de un usuario
   * Llamado desde Super-Admin cuando se modifica/bloquea un usuario
   * @param {number} usuario_id - ID del usuario
   */
  async invalidarSesionesUsuario(usuario_id) {
    const db = this.connect();

    console.log(`🔒 Invalidando todas las sesiones del usuario ${usuario_id}`);

    // Desactivar todas las sesiones activas del usuario
    const result = db
      .prepare(
        `
      UPDATE sesiones 
      SET active = 0 
      WHERE usuario_id = ? 
        AND active = 1
    `
      )
      .run(usuario_id);

    // Eliminar de caché de memoria
    for (const [token, session] of this.activeSessions.entries()) {
      if (session.usuario_id === usuario_id) {
        this.activeSessions.delete(token);
      }
    }

    console.log(`   ✅ ${result.changes} sesiones invalidadas`);

    return result.changes;
  }

  /**
   * Invalidar todas las sesiones de un negocio
   * @param {number} negocio_id - ID del negocio
   */
  async invalidarSesionesNegocio(negocio_id) {
    const db = this.connect();

    console.log(`🔒 Invalidando todas las sesiones del negocio ${negocio_id}`);

    const result = db
      .prepare(
        `
      UPDATE sesiones 
      SET active = 0 
      WHERE negocio_id = ? 
        AND active = 1
    `
      )
      .run(negocio_id);

    // Eliminar de caché
    for (const [token, session] of this.activeSessions.entries()) {
      if (session.negocio_id === negocio_id) {
        this.activeSessions.delete(token);
      }
    }

    console.log(`   ✅ ${result.changes} sesiones invalidadas`);

    return result.changes;
  }

  /**
   * Bloquear usuario (desde Super-Admin)
   * Invalida todas sus sesiones automáticamente
   * @param {number} usuario_id - ID del usuario
   * @param {string} motivo - Motivo del bloqueo
   */
  async bloquearUsuario(usuario_id, motivo = 'Bloqueado por administrador') {
    const db = this.connect();

    // Obtener datos del usuario
    const usuario = db
      .prepare('SELECT usuario, negocio_id FROM usuarios WHERE id = ?')
      .get(usuario_id);

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    // Bloquear usuario
    db.prepare('UPDATE usuarios SET bloqueado = 1 WHERE id = ?').run(usuario_id);

    // Invalidar todas sus sesiones
    await this.invalidarSesionesUsuario(usuario_id);

    // Registrar evento
    this.registrarEvento({
      tipo: 'usuario_bloqueado',
      usuario_id,
      negocio_id: usuario.negocio_id,
      descripcion: `Usuario ${usuario.usuario} bloqueado: ${motivo}`,
      metadata: { motivo },
    });

    console.log(`✅ Usuario ${usuario.usuario} bloqueado y sesiones cerradas`);
  }

  /**
   * Desbloquear usuario
   * @param {number} usuario_id - ID del usuario
   */
  async desbloquearUsuario(usuario_id) {
    const db = this.connect();

    const usuario = db
      .prepare('SELECT usuario, negocio_id FROM usuarios WHERE id = ?')
      .get(usuario_id);

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    // Desbloquear y resetear intentos fallidos
    db.prepare(
      `
      UPDATE usuarios 
      SET bloqueado = 0, intentos_fallidos = 0 
      WHERE id = ?
    `
    ).run(usuario_id);

    this.registrarEvento({
      tipo: 'usuario_desbloqueado',
      usuario_id,
      negocio_id: usuario.negocio_id,
      descripcion: `Usuario ${usuario.usuario} desbloqueado`,
    });

    console.log(`✅ Usuario ${usuario.usuario} desbloqueado`);
  }

  /**
   * Registrar intento fallido de login
   */
  registrarIntentoFallido(usuario, negocio_id, motivo) {
    this.registrarEvento({
      tipo: 'login_fallido',
      usuario_id: null,
      negocio_id,
      descripcion: `Intento fallido de login: ${usuario} - ${motivo}`,
      metadata: { usuario, motivo },
    });
  }

  /**
   * Registrar evento en el sistema de auditoría
   */
  registrarEvento({ tipo, usuario_id = null, negocio_id, descripcion, metadata = null }) {
    const db = this.connect();

    const metadataStr = metadata ? JSON.stringify(metadata) : null;

    db.prepare(
      `
      INSERT INTO eventos_sistema (
        tipo, modulo, descripcion, negocio_id, usuario_id, metadata
      )
      VALUES (?, 'Auth', ?, ?, ?, ?)
    `
    ).run(tipo, descripcion, negocio_id, usuario_id, metadataStr);
  }

  /**
   * Limpiar sesiones expiradas
   * Ejecutar periódicamente desde un cron job
   */
  async limpiarSesionesExpiradas() {
    const db = this.connect();

    const result = db
      .prepare(
        `
      UPDATE sesiones 
      SET active = 0 
      WHERE active = 1 
        AND expires_at < datetime('now')
    `
      )
      .run();

    // Limpiar caché
    for (const [token, session] of this.activeSessions.entries()) {
      if (new Date() > session.expires_at) {
        this.activeSessions.delete(token);
      }
    }

    if (result.changes > 0) {
      console.log(`🧹 ${result.changes} sesiones expiradas limpiadas`);
    }

    return result.changes;
  }

  /**
   * Obtener sesiones activas de un usuario
   * @param {number} usuario_id - ID del usuario
   */
  getSesionesActivas(usuario_id) {
    const db = this.connect();

    return db
      .prepare(
        `
      SELECT 
        s.id,
        s.token,
        s.created_at,
        s.expires_at,
        s.last_activity
      FROM sesiones s
      WHERE s.usuario_id = ?
        AND s.active = 1
        AND s.expires_at > datetime('now')
      ORDER BY s.created_at DESC
    `
      )
      .all(usuario_id);
  }

  /**
   * Renovar sesión (extender tiempo de expiración)
   * @param {string} token - Token de sesión
   */
  async renovarSesion(token) {
    const db = this.connect();
    const securityConfig = configService.getSecurityConfig();

    const sessionTimeout = securityConfig.session_timeout_minutes || 480;
    const newExpiresAt = new Date();
    newExpiresAt.setMinutes(newExpiresAt.getMinutes() + sessionTimeout);

    db.prepare(
      `
      UPDATE sesiones 
      SET expires_at = ?,
          last_activity = CURRENT_TIMESTAMP
      WHERE token = ?
    `
    ).run(newExpiresAt.toISOString(), token);

    // Actualizar caché
    if (this.activeSessions.has(token)) {
      const session = this.activeSessions.get(token);
      session.expires_at = newExpiresAt;
      this.activeSessions.set(token, session);
    }

    return newExpiresAt;
  }
}

// Exportar instancia singleton
const authService = new AuthService();
authService.connect();

// Limpiar sesiones expiradas cada 30 minutos
setInterval(
  () => {
    authService.limpiarSesionesExpiradas().catch((error) => {
      console.error('Error limpiando sesiones:', error);
    });
  },
  30 * 60 * 1000
);

module.exports = authService;
module.exports.AuthService = AuthService;
