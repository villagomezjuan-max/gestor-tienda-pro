const {
  MODULE_CATALOG,
  OBLIGATORY_MODULES,
  DEFAULT_BUSINESS_MODULES,
} = require('./module-catalog');

/**
 * ENDPOINTS DE API PARA GESTIÓN DE MÓDULOS POR USUARIO
 * Agregar estos endpoints al server.js después de los endpoints de usuarios
 *
 * Endpoints:
 * - GET /api/usuarios/:userId/modulos - Obtener módulos habilitados para un usuario
 * - GET /api/usuarios/:userId/modulos/disponibles - Obtener todos los módulos disponibles
 * - PUT /api/usuarios/:userId/modulos - Actualizar módulos habilitados (solo super_admin)
 * - POST /api/usuarios/:userId/modulos/resetear - Resetear a default según negocio
 */

function ensureDependencies(dependencies = {}) {
  const requiredKeys = ['app', 'authenticate', 'requireRole', 'ROLE_SUPER_ADMIN', 'getMasterDB'];
  const missing = requiredKeys.filter((key) => !dependencies[key]);

  if (missing.length) {
    throw new Error(
      `registerModuleEndpoints: faltan dependencias requeridas: ${missing.join(', ')}`
    );
  }
}

function registerModuleEndpoints(dependencies = {}) {
  ensureDependencies(dependencies);

  const { app, authenticate, requireRole, ROLE_SUPER_ADMIN, getMasterDB } = dependencies;

  // ============================================
  // GET /api/usuarios/:userId/modulos
  // Obtener módulos habilitados para un usuario en un negocio
  // ============================================
  app.get('/api/usuarios/:userId/modulos', authenticate, (req, res) => {
    try {
      const { userId } = req.params;
      const negocioId = req.headers['x-negocio-id'] || req.negocioId;

      if (!negocioId) {
        return res.status(400).json({
          success: false,
          message: 'ID de negocio requerido',
          code: 'MISSING_NEGOCIO_ID',
        });
      }

      // Solo super_admin puede ver módulos de otros usuarios
      if (userId !== req.user.userId && !req.user.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para ver módulos de otros usuarios',
          code: 'FORBIDDEN',
        });
      }

      const master = getMasterDB();

      // Si es super_admin o el usuario es el mismo, retornar TODO (para poder seleccionar)
      // Si es usuario normal, retornar solo habilitados
      if (req.user.isSuperAdmin || userId === req.user.userId) {
        // Super admin ve todos los módulos, usuario ve solo habilitados
        const query = `
        SELECT ump.modulo_id, ump.habilitado, ump.negocio_id
        FROM usuario_modulos_permitidos ump
        WHERE ump.usuario_id = ? AND ump.negocio_id = ?
      `;

        const modulos = master.prepare(query).all(userId, negocioId);

        return res.json({
          success: true,
          modulos: modulos.map((m) => ({
            id: m.modulo_id,
            habilitado: m.habilitado === 1,
          })),
          isSuperAdmin: req.user.isSuperAdmin,
          userId: userId,
          negocioId: negocioId,
        });
      }

      return res.status(403).json({
        success: false,
        message: 'No autorizado',
        code: 'FORBIDDEN',
      });
    } catch (error) {
      console.error('Error obteniendo módulos:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ============================================
  // GET /api/usuarios/:userId/modulos/disponibles
  // Obtener todos los módulos disponibles para seleccionar
  // Llamado por el modal de permisos en Gestor Central
  // ============================================
  app.get(
    '/api/usuarios/:userId/modulos/disponibles',
    authenticate,
    requireRole(ROLE_SUPER_ADMIN),
    (req, res) => {
      try {
        const { userId } = req.params;
        const negocioId = req.headers['x-negocio-id'] || req.negocioId;

        if (!negocioId) {
          return res.status(400).json({
            success: false,
            message: 'ID de negocio requerido',
          });
        }

        const master = getMasterDB();

        // Obtener el tipo de negocio para sugerir módulos
        const negocio = master.prepare('SELECT tipo FROM negocios WHERE id = ?').get(negocioId);
        const negocioTipo = negocio?.tipo || 'general';

        // Obtener módulos default para este tipo
        const moduleDefaults = master
          .prepare('SELECT modulos_json FROM negocio_modulos_default WHERE negocio_tipo = ?')
          .get(negocioTipo);
        const defaultModulos = moduleDefaults
          ? JSON.parse(moduleDefaults.modulos_json)
          : [...DEFAULT_BUSINESS_MODULES];
        const defaultConObligatorios = Array.from(
          new Set([...defaultModulos, ...OBLIGATORY_MODULES])
        );

        // Obtener módulos actualmente habilitados para este usuario
        const enabledModulos = master
          .prepare(
            `
      SELECT modulo_id FROM usuario_modulos_permitidos 
      WHERE usuario_id = ? AND negocio_id = ? AND habilitado = 1
    `
          )
          .all(userId, negocioId);

        const enabledSet = new Set(enabledModulos.map((m) => m.modulo_id));
        const preseleccionados = MODULE_CATALOG.filter((opcion) => opcion.preseleccionado).map(
          (opcion) => opcion.id
        );

        if (enabledSet.size === 0) {
          [...defaultConObligatorios, ...preseleccionados].forEach((id) => enabledSet.add(id));
        }

        // Obtener usuario info
        const usuario = master
          .prepare('SELECT username, rol FROM usuarios WHERE id = ?')
          .get(userId);

        res.json({
          success: true,
          usuario: {
            id: userId,
            username: usuario?.username,
            rol: usuario?.rol,
          },
          negocio: {
            id: negocioId,
            tipo: negocioTipo,
          },
          modulos: {
            disponibles: MODULE_CATALOG,
            recomendados: defaultConObligatorios,
            habilitados: Array.from(enabledSet),
            obligatorios: OBLIGATORY_MODULES,
          },
        });
      } catch (error) {
        console.error('Error obteniendo módulos disponibles:', error);
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    }
  );

  // ============================================
  // PUT /api/usuarios/:userId/modulos
  // Actualizar módulos habilitados para un usuario (SOLO SUPER ADMIN)
  // Body: { modulos: ['ventas', 'productos', ...] }
  // ============================================
  app.put(
    '/api/usuarios/:userId/modulos',
    authenticate,
    requireRole(ROLE_SUPER_ADMIN),
    (req, res) => {
      try {
        const { userId } = req.params;
        const { modulos } = req.body;
        const negocioId = req.headers['x-negocio-id'] || req.negocioId;

        if (!negocioId) {
          return res.status(400).json({
            success: false,
            message: 'ID de negocio requerido',
          });
        }

        if (!Array.isArray(modulos)) {
          return res.status(400).json({
            success: false,
            message: 'Los módulos deben ser un array',
          });
        }

        const master = getMasterDB();

        // Validar que el usuario existe
        const usuario = master
          .prepare('SELECT id, username FROM usuarios WHERE id = ?')
          .get(userId);
        if (!usuario) {
          return res.status(404).json({
            success: false,
            message: 'Usuario no encontrado',
          });
        }

        // Validar que el negocio existe
        const negocio = master.prepare('SELECT id FROM negocios WHERE id = ?').get(negocioId);
        if (!negocio) {
          return res.status(404).json({
            success: false,
            message: 'Negocio no encontrado',
          });
        }

        // Módulos obligatorios que siempre deben estar habilitados
        const modulosSet = new Set(modulos);
        for (const oblig of OBLIGATORY_MODULES) {
          if (!modulosSet.has(oblig)) {
            return res.status(400).json({
              success: false,
              message: `El módulo obligatorio "${oblig}" debe estar habilitado`,
              obligatorios: OBLIGATORY_MODULES,
            });
          }
        }

        // Borrar permisos anteriores para este usuario en este negocio
        master
          .prepare('DELETE FROM usuario_modulos_permitidos WHERE usuario_id = ? AND negocio_id = ?')
          .run(userId, negocioId);

        // Insertar nuevos permisos
        const insertStmt = master.prepare(`
      INSERT INTO usuario_modulos_permitidos (usuario_id, negocio_id, modulo_id, habilitado)
      VALUES (?, ?, ?, 1)
    `);

        for (const modulo of modulos) {
          insertStmt.run(userId, negocioId, modulo);
        }

        console.log(
          `✅ Módulos actualizados para usuario ${usuario.username} en negocio ${negocioId}: ${modulos.join(', ')}`
        );

        // Retornar configuración actualizada
        const actualizado = master
          .prepare(
            `
      SELECT modulo_id FROM usuario_modulos_permitidos
      WHERE usuario_id = ? AND negocio_id = ? AND habilitado = 1
    `
          )
          .all(userId, negocioId);

        res.json({
          success: true,
          message: 'Módulos actualizados exitosamente',
          usuario: {
            id: userId,
            username: usuario.username,
          },
          negocio: negocioId,
          modulos_habilitados: actualizado.map((m) => m.modulo_id),
        });
      } catch (error) {
        console.error('Error actualizando módulos:', error);
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    }
  );

  // ============================================
  // POST /api/usuarios/:userId/modulos/resetear
  // Resetear módulos a valores por defecto según tipo de negocio
  // ============================================
  app.post(
    '/api/usuarios/:userId/modulos/resetear',
    authenticate,
    requireRole(ROLE_SUPER_ADMIN),
    (req, res) => {
      try {
        const { userId } = req.params;
        const negocioId = req.headers['x-negocio-id'] || req.negocioId;

        if (!negocioId) {
          return res.status(400).json({
            success: false,
            message: 'ID de negocio requerido',
          });
        }

        const master = getMasterDB();

        // Obtener usuario
        const usuario = master
          .prepare('SELECT id, username FROM usuarios WHERE id = ?')
          .get(userId);
        if (!usuario) {
          return res.status(404).json({
            success: false,
            message: 'Usuario no encontrado',
          });
        }

        // Obtener negocio y su tipo
        const negocio = master.prepare('SELECT id, tipo FROM negocios WHERE id = ?').get(negocioId);
        if (!negocio) {
          return res.status(404).json({
            success: false,
            message: 'Negocio no encontrado',
          });
        }

        // Obtener módulos default para este tipo
        const moduleDefaults = master
          .prepare('SELECT modulos_json FROM negocio_modulos_default WHERE negocio_tipo = ?')
          .get(negocio.tipo);
        const defaultModulos = moduleDefaults
          ? JSON.parse(moduleDefaults.modulos_json)
          : [...DEFAULT_BUSINESS_MODULES];
        const preseleccionados = MODULE_CATALOG.filter((opcion) => opcion.preseleccionado).map(
          (opcion) => opcion.id
        );
        const defaultsConPreseleccion = Array.from(
          new Set([...defaultModulos, ...OBLIGATORY_MODULES, ...preseleccionados])
        );

        // Borrar permisos anteriores
        master
          .prepare('DELETE FROM usuario_modulos_permitidos WHERE usuario_id = ? AND negocio_id = ?')
          .run(userId, negocioId);

        // Insertar módulos default
        const insertStmt = master.prepare(`
      INSERT INTO usuario_modulos_permitidos (usuario_id, negocio_id, modulo_id, habilitado)
      VALUES (?, ?, ?, 1)
    `);

        for (const modulo of defaultsConPreseleccion) {
          insertStmt.run(userId, negocioId, modulo);
        }

        console.log(
          `✅ Módulos reseteados para usuario ${usuario.username} en ${negocio.tipo}: ${defaultsConPreseleccion.join(', ')}`
        );

        res.json({
          success: true,
          message: 'Módulos reseteados a valores por defecto',
          usuario: usuario.username,
          tipo_negocio: negocio.tipo,
          modulos_default: defaultsConPreseleccion,
        });
      } catch (error) {
        console.error('Error reseteando módulos:', error);
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    }
  );

  // ============================================
  // GET /api/negocios/:negocioId/usuarios-modulos
  // Obtener configuración de módulos para TODOS los usuarios de un negocio
  // SOLO SUPER ADMIN
  // ============================================
  app.get(
    '/api/negocios/:negocioId/usuarios-modulos',
    authenticate,
    requireRole(ROLE_SUPER_ADMIN),
    (req, res) => {
      try {
        const { negocioId } = req.params;
        const master = getMasterDB();

        // Validar que negocio existe
        const negocio = master
          .prepare('SELECT id, nombre, tipo FROM negocios WHERE id = ?')
          .get(negocioId);
        if (!negocio) {
          return res.status(404).json({
            success: false,
            message: 'Negocio no encontrado',
          });
        }

        // Obtener todos los usuarios de este negocio
        const usuariosNegocio = master
          .prepare(
            `
      SELECT DISTINCT un.usuario_id, u.username, u.rol
      FROM usuario_negocio un
      LEFT JOIN usuarios u ON un.usuario_id = u.id
      WHERE un.negocio_id = ?
      ORDER BY u.username
    `
          )
          .all(negocioId);

        // Para cada usuario, obtener sus módulos
        const resultado = [];
        for (const usuario of usuariosNegocio) {
          const modulos = master
            .prepare(
              `
        SELECT modulo_id FROM usuario_modulos_permitidos
        WHERE usuario_id = ? AND negocio_id = ? AND habilitado = 1
        ORDER BY modulo_id
      `
            )
            .all(usuario.usuario_id, negocioId);

          resultado.push({
            usuario_id: usuario.usuario_id,
            username: usuario.username,
            rol: usuario.rol,
            modulos: modulos.map((m) => m.modulo_id),
          });
        }

        res.json({
          success: true,
          negocio: {
            id: negocio.id,
            nombre: negocio.nombre,
            tipo: negocio.tipo,
          },
          usuarios: resultado,
        });
      } catch (error) {
        console.error('Error obteniendo usuarios-módulos:', error);
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    }
  );
}

module.exports = { registerModuleEndpoints };
