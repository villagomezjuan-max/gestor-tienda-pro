/**
 * Rutas de autenticación
 * Maneja login, logout, refresh tokens, cambio de contraseña
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const { authenticate } = require('../middleware/auth');
const { loginLimiter, passwordChangeLimiter } = require('../middleware/rate-limit');
const { getUserNegocios, getUserNegocioPrincipal } = require('../utils/negocios');
const { hashPassword, comparePassword, validatePasswordStrength } = require('../utils/password');
const { normalizeRole, ROLE_SUPER_ADMIN } = require('../utils/roles');
const { resolveSuperAdminUsername } = require('../utils/super-admin');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/token');

let authColumnsEnsured = false;
const isProduction = process.env.NODE_ENV === 'production';
const sameSiteMode = isProduction ? 'strict' : 'lax';

/**
 * Crear rutas de autenticación
 * @param {object} providers
 * @param {Function} providers.getMasterDB - Retorna la conexión a la base principal (gestor_tienda.db)
 * @param {Function} [providers.getTenantDB] - Retorna la conexión a la base específica del negocio
 * @returns {Router} Router de Express
 */
module.exports = function createAuthRoutes({ getMasterDB, getTenantDB }) {
  if (typeof getMasterDB !== 'function') {
    throw new Error('getMasterDB es requerido para inicializar rutas de autenticación');
  }

  const resolveMasterDB = () => getMasterDB();

  function ensureAuthColumns(masterDb) {
    if (authColumnsEnsured) {
      return;
    }

    try {
      const existingColumns = new Set(
        masterDb
          .prepare('PRAGMA table_info(usuarios)')
          .all()
          .map((col) => col.name)
      );

      if (!existingColumns.has('intentos_fallidos')) {
        masterDb
          .prepare('ALTER TABLE usuarios ADD COLUMN intentos_fallidos INTEGER NOT NULL DEFAULT 0')
          .run();
      }

      if (!existingColumns.has('bloqueado_hasta')) {
        masterDb.prepare('ALTER TABLE usuarios ADD COLUMN bloqueado_hasta TEXT').run();
      }

      if (!existingColumns.has('requiere_cambio_password')) {
        masterDb
          .prepare(
            'ALTER TABLE usuarios ADD COLUMN requiere_cambio_password INTEGER NOT NULL DEFAULT 0'
          )
          .run();
      }

      authColumnsEnsured = true;
    } catch (error) {
      console.warn('⚠️ No se pudieron asegurar columnas de autenticación:', error.message);
    }
  }

  function buildUserBusinessContext(masterDb, user, requestedNegocioId) {
    let negociosAsignados = [];
    let negociosIds = [];
    let negocioPrincipal = user.negocio_principal || null;
    const normalizedRole = normalizeRole(user.rol);

    try {
      negociosAsignados = getUserNegocios(masterDb, user.id);

      if (negociosAsignados.length) {
        negociosIds = negociosAsignados.map((negocio) => negocio.id);
        const principal = getUserNegocioPrincipal(masterDb, user.id);

        if (principal?.id) {
          negocioPrincipal = principal.id;
        } else if (negocioPrincipal && !negociosIds.includes(negocioPrincipal)) {
          negocioPrincipal = negociosIds[0];
        } else if (!negocioPrincipal) {
          negocioPrincipal = negociosIds[0];
        }
      }
    } catch (error) {
      console.warn('⚠️ Error cargando negocios del usuario, usando fallback:', error.message);
    }

    if (normalizedRole === ROLE_SUPER_ADMIN) {
      try {
        const superNegocioId = 'super_admin';
        const negociosActivos = masterDb
          .prepare(`SELECT id, nombre, tipo, estado FROM negocios WHERE estado = 'activo'`)
          .all();

        const existentes = new Set(negociosAsignados.map((negocio) => negocio.id));

        negociosActivos.forEach((negocio) => {
          if (!negocio?.id) {
            return;
          }

          if (!existentes.has(negocio.id)) {
            negociosAsignados.push({
              ...negocio,
              rol_en_negocio: ROLE_SUPER_ADMIN,
              es_negocio_principal: negocio.id === superNegocioId ? 1 : 0,
            });
            existentes.add(negocio.id);
          }
        });

        if (!existentes.has(superNegocioId)) {
          const superNegocio = masterDb
            .prepare(`SELECT id, nombre, tipo, estado FROM negocios WHERE id = ?`)
            .get(superNegocioId) || {
            id: superNegocioId,
            nombre: 'Super Admin',
            tipo: 'central',
            estado: 'activo',
          };

          negociosAsignados.push({
            ...superNegocio,
            rol_en_negocio: ROLE_SUPER_ADMIN,
            es_negocio_principal: 1,
          });
          existentes.add(superNegocioId);
        }

        const activosIds = negociosActivos.map((negocio) => negocio.id).filter(Boolean);

        if (!activosIds.includes(superNegocioId)) {
          activosIds.unshift(superNegocioId);
        }

        negociosIds = Array.from(new Set([...negociosIds, ...activosIds]));

        const preferida =
          requestedNegocioId && negociosIds.includes(requestedNegocioId)
            ? requestedNegocioId
            : null;
        const principalValido =
          negocioPrincipal && negociosIds.includes(negocioPrincipal) ? negocioPrincipal : null;
        const almacenado =
          user.negocio_principal && negociosIds.includes(user.negocio_principal)
            ? user.negocio_principal
            : null;
        const fallback = negociosIds.includes(superNegocioId) ? superNegocioId : negociosIds[0];

        negocioPrincipal = preferida || principalValido || almacenado || fallback;
      } catch (error) {
        console.warn(
          '⚠️ No se pudieron cargar todos los negocios para super_admin:',
          error.message
        );
      }
    }

    if (!negocioPrincipal) {
      negocioPrincipal = 'super_admin';
    }

    if (!negociosIds.length) {
      negociosIds = [negocioPrincipal];
    }

    negociosIds = Array.from(new Set(negociosIds.filter(Boolean)));

    // CAMBIO: Ya no validamos el requestedNegocioId, siempre usamos el negocio principal del usuario
    // Esto permite login automático sin selector de tienda
    const negocioSeleccionado = negocioPrincipal || negociosIds[0] || 'super_admin';

    const negocioValido = masterDb
      .prepare('SELECT id, estado FROM negocios WHERE id = ?')
      .get(negocioSeleccionado);

    if (!negocioValido || negocioValido.estado !== 'activo') {
      return { error: 'DISABLED', negociosIds, negociosAsignados };
    }

    return { negocioSeleccionado, negociosIds, negociosAsignados };
  }

  // ============================================
  // POST /api/auth/login
  // Iniciar sesión con usuario y contraseña
  // ============================================
  router.post(
    '/login',
    loginLimiter,
    [
      body('username').trim().notEmpty().withMessage('Usuario requerido'),
      body('password').notEmpty().withMessage('Contraseña requerida'),
      body('negocioId').optional().trim(),
    ],
    async (req, res) => {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array(),
        });
      }

      const { username, password, negocioId } = req.body;
      const rawUsername = typeof username === 'string' ? username.trim() : '';
      const lookupUsername = resolveSuperAdminUsername(rawUsername);

      try {
        const masterDb = resolveMasterDB();
        ensureAuthColumns(masterDb);

        const user = masterDb
          .prepare('SELECT * FROM usuarios WHERE username = ? AND activo = 1')
          .get(lookupUsername);

        if (!user) {
          console.warn(
            `⚠️ Intento de login fallido - usuario no encontrado: ${rawUsername || lookupUsername}`
          );
          return res.status(401).json({
            success: false,
            message: 'Credenciales incorrectas',
          });
        }

        // BLOQUEO DE CUENTA DESHABILITADO - Siempre permitir login
        // if (user.bloqueado_hasta) {
        //   const bloqueadoHasta = new Date(user.bloqueado_hasta);
        //   if (bloqueadoHasta > new Date()) {
        //     const minutosRestantes = Math.ceil((bloqueadoHasta - new Date()) / 60000);
        //     return res.status(403).json({
        //       success: false,
        //       message: `Cuenta bloqueada temporalmente. Intenta en ${minutosRestantes} minutos.`,
        //       code: 'ACCOUNT_LOCKED'
        //     });
        //   }
        // }

        const passwordMatch = await comparePassword(password, user.password);

        if (!passwordMatch) {
          // BLOQUEO DE CUENTA DESHABILITADO - Solo registrar intento fallido sin bloquear
          console.warn(
            `⚠️ Intento de login fallido - contraseña incorrecta: ${rawUsername || lookupUsername}`
          );

          return res.status(401).json({
            success: false,
            message: 'Credenciales incorrectas',
          });
        }

        // Resetear intentos fallidos en login exitoso
        masterDb
          .prepare(
            "UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = datetime('now') WHERE id = ?"
          )
          .run(user.id);

        if (user.requiere_cambio_password === 1) {
          return res.status(403).json({
            success: false,
            requirePasswordChange: true,
            message: 'Debes cambiar tu contraseña antes de continuar',
            userId: user.id,
            code: 'PASSWORD_CHANGE_REQUIRED',
          });
        }

        // Detección automática del negocio del usuario (sin validar negocioId de entrada)
        const negocioContext = buildUserBusinessContext(masterDb, user, null);

        if (negocioContext.error === 'DISABLED') {
          return res.status(403).json({
            success: false,
            message: 'El negocio solicitado no está disponible',
            code: 'BUSINESS_DISABLED',
          });
        }

        const { negocioSeleccionado, negociosIds, negociosAsignados } = negocioContext;

        const normalizedRole = normalizeRole(user.rol);

        const accessToken = generateAccessToken(
          user.id,
          user.username,
          normalizedRole,
          negocioSeleccionado,
          negociosIds
        );
        const refreshToken = generateRefreshToken(user.id);

        try {
          masterDb
            .prepare(
              `
            INSERT INTO auditoria_accesos (usuario_id, accion, ip, user_agent, exitoso)
            VALUES (?, 'login', ?, ?, 1)
          `
            )
            .run(user.id, req.ip || 'unknown', req.get('user-agent') || 'unknown');
        } catch (auditError) {
          console.warn('No se pudo registrar auditoría:', auditError.message);
        }

        console.log(`✅ Login exitoso: ${user.username}`);

        // Establecer tokens en cookies httpOnly (más seguro)
        res.cookie('access_token', accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: sameSiteMode,
          maxAge: 15 * 60 * 1000, // 15 minutos
        });

        res.cookie('refresh_token', refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: sameSiteMode,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        });

        // Respuesta sin tokens (están en cookies)
        res.json({
          success: true,
          message: 'Inicio de sesión exitoso',
          user: {
            id: user.id,
            username: user.username,
            nombre: user.nombre,
            email: user.email,
            rol: normalizedRole,
            negocioId: negocioSeleccionado,
            negocios: negociosIds,
            negociosDetalle: negociosAsignados,
          },
        });
      } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({
          success: false,
          message: 'Error interno del servidor',
        });
      }
    }
  );

  // ============================================
  // POST /api/auth/refresh
  // Renovar access token usando refresh token
  // ============================================
  router.post('/refresh', async (req, res) => {
    const negocioId = req.body?.negocioId;
    const tokenFromBody = req.body?.refreshToken;
    const tokenFromCookie = req.cookies?.refresh_token || req.cookies?.refreshToken;
    const refreshToken = tokenFromBody || tokenFromCookie;

    // Tokens ahora viven en cookies httpOnly; mantenemos soporte para payload legacy
    if (!refreshToken) {
      console.warn(
        '⚠️ Intento de refresh sin token. Cookies disponibles:',
        Object.keys(req.cookies || {})
      );
      return res.status(401).json({
        success: false,
        message: 'Refresh token requerido. Por favor inicia sesión nuevamente.',
        code: 'NO_REFRESH_TOKEN',
      });
    }

    // Verificar refresh token
    const verification = verifyRefreshToken(refreshToken);

    if (!verification.valid) {
      console.warn('❌ Refresh token inválido:', verification.error);

      // Limpiar cookies inválidas
      res.clearCookie('access_token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: sameSiteMode,
        path: '/',
      });

      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: sameSiteMode,
        path: '/',
      });

      return res.status(401).json({
        success: false,
        message: 'Sesión expirada. Por favor inicia sesión nuevamente.',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    try {
      const masterDb = resolveMasterDB();
      ensureAuthColumns(masterDb);

      const user = masterDb
        .prepare(
          'SELECT id, username, rol, negocio_principal FROM usuarios WHERE id = ? AND activo = 1'
        )
        .get(verification.payload.userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado o inactivo',
          code: 'USER_NOT_FOUND',
        });
      }

      const negocioContext = buildUserBusinessContext(masterDb, user, negocioId);

      if (negocioContext.error === 'INVALID') {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a este negocio',
          code: 'INVALID_BUSINESS_ACCESS',
          allowedBusinesses: negocioContext.negociosIds,
        });
      }

      if (negocioContext.error === 'DISABLED') {
        return res.status(403).json({
          success: false,
          message: 'El negocio solicitado no está disponible',
          code: 'BUSINESS_DISABLED',
        });
      }

      const { negocioSeleccionado, negociosIds } = negocioContext;

      const normalizedRole = normalizeRole(user.rol);

      const newAccessToken = generateAccessToken(
        user.id,
        user.username,
        normalizedRole,
        negocioSeleccionado,
        negociosIds
      );

      // Actualizar cookie con nuevo access token
      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: sameSiteMode,
        maxAge: 15 * 60 * 1000,
      });

      res.json({
        success: true,
        message: 'Token renovado',
      });
    } catch (error) {
      console.error('❌ Error en refresh token:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  });

  // ============================================
  // POST /api/auth/logout
  // Cerrar sesión (opcional: blacklist de tokens)
  // ============================================
  router.post('/logout', authenticate, (req, res) => {
    try {
      const masterDb = resolveMasterDB();

      masterDb
        .prepare(
          `
        INSERT INTO auditoria_accesos (usuario_id, accion, ip, exitoso)
        VALUES (?, 'logout', ?, 1)
      `
        )
        .run(req.user.userId, req.ip || 'unknown');
    } catch (error) {
      console.warn('No se pudo registrar auditoría de logout:', error.message);
    }

    console.log(`👋 Logout exitoso: ${req.user.username}`);

    // Limpiar cookies httpOnly con todas las opciones necesarias
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: sameSiteMode,
      path: '/',
    };

    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    // También limpiar variantes alternativas por si acaso
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente',
    });
  });

  // ============================================
  // POST /api/auth/change-password
  // Cambiar contraseña del usuario autenticado
  // ============================================
  router.post(
    '/change-password',
    authenticate,
    passwordChangeLimiter,
    [
      body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
      body('newPassword').notEmpty().withMessage('Nueva contraseña requerida'),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

      try {
        // Validar fortaleza de nueva contraseña
        const strength = validatePasswordStrength(newPassword);
        if (!strength.valid) {
          return res.status(400).json({
            success: false,
            message: strength.message,
          });
        }

        const masterDb = resolveMasterDB();

        const user = masterDb.prepare('SELECT * FROM usuarios WHERE id = ?').get(userId);

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'Usuario no encontrado',
          });
        }

        // Verificar contraseña actual
        const passwordMatch = await comparePassword(currentPassword, user.password);

        if (!passwordMatch) {
          console.warn(`⚠️ Intento de cambio de contraseña fallido: ${user.username}`);
          return res.status(401).json({
            success: false,
            message: 'Contraseña actual incorrecta',
          });
        }

        // Verificar que la nueva contraseña sea diferente
        const samePassword = await comparePassword(newPassword, user.password);
        if (samePassword) {
          return res.status(400).json({
            success: false,
            message: 'La nueva contraseña debe ser diferente a la actual',
          });
        }

        // Hashear nueva contraseña
        const hashedNewPassword = await hashPassword(newPassword);

        // Actualizar contraseña
        masterDb
          .prepare(
            "UPDATE usuarios SET password = ?, requiere_cambio_password = 0, updated_at = datetime('now') WHERE id = ?"
          )
          .run(hashedNewPassword, user.id);

        masterDb
          .prepare(
            `
          INSERT INTO auditoria_accesos (usuario_id, accion, ip, exitoso)
          VALUES (?, 'cambio_password', ?, 1)
        `
          )
          .run(userId, req.ip || 'unknown');

        console.log(`🔐 Contraseña cambiada: ${user.username}`);

        res.json({
          success: true,
          message: 'Contraseña actualizada exitosamente',
        });
      } catch (error) {
        console.error('❌ Error al cambiar contraseña:', error);
        res.status(500).json({
          success: false,
          message: 'Error interno del servidor',
        });
      }
    }
  );

  // ============================================
  // GET /api/auth/me
  // Obtener información del usuario autenticado
  // ============================================
  router.get('/me', authenticate, (req, res) => {
    try {
      const masterDb = resolveMasterDB();
      ensureAuthColumns(masterDb);

      const user = masterDb
        .prepare(
          'SELECT id, username, nombre, email, rol, ultimo_acceso FROM usuarios WHERE id = ?'
        )
        .get(req.user.userId);

      if (!user) {
        console.warn(`⚠️ Usuario no encontrado en /me: ${req.user.userId}`);
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        });
      }

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error('❌ Error en /me:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  });

  // ============================================
  // POST /api/auth/first-login-change-password
  // Cambiar contraseña en primer login (sin autenticación previa)
  // ============================================
  router.post(
    '/first-login-change-password',
    loginLimiter,
    [
      body('userId').notEmpty().withMessage('userId requerido'),
      body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
      body('newPassword').notEmpty().withMessage('Nueva contraseña requerida'),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { userId, currentPassword, newPassword, negocioId } = req.body;

      try {
        const strength = validatePasswordStrength(newPassword);
        if (!strength.valid) {
          return res.status(400).json({
            success: false,
            message: strength.message,
          });
        }

        const masterDb = resolveMasterDB();
        ensureAuthColumns(masterDb);
        const user = masterDb
          .prepare('SELECT * FROM usuarios WHERE id = ? AND requiere_cambio_password = 1')
          .get(userId);

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'Usuario no encontrado o no requiere cambio de contraseña',
          });
        }

        const passwordMatch = await comparePassword(currentPassword, user.password);
        if (!passwordMatch) {
          return res.status(401).json({
            success: false,
            message: 'Contraseña actual incorrecta',
          });
        }

        const hashedNewPassword = await hashPassword(newPassword);
        masterDb
          .prepare('UPDATE usuarios SET password = ?, requiere_cambio_password = 0 WHERE id = ?')
          .run(hashedNewPassword, userId);

        console.log(`🔐 Primer cambio de contraseña: ${user.username}`);

        res.json({
          success: true,
          message: 'Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.',
        });
      } catch (error) {
        console.error('❌ Error en first-login-change-password:', error);
        res.status(500).json({
          success: false,
          message: 'Error interno del servidor',
        });
      }
    }
  );

  return router;
};
