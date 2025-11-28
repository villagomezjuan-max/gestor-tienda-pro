/**
 * Middleware de autenticación
 * Verifica tokens JWT y protege rutas
 *
 * ROLES DEL SISTEMA:
 * - SUPER_ADMIN: Usuario del sistema central "Mi Negocio Principal" (acceso total)
 * - admin: Administrador de una tienda individual
 * - vendedor: Empleado de ventas
 * - tecnico: Empleado técnico
 */

const path = require('path');

const Database = require('better-sqlite3');

const {
  normalizeRole,
  isRole,
  ROLE_SUPER_ADMIN,
  ROLE_ADMIN,
  ROLE_VENDEDOR,
  ROLE_TECNICO,
} = require('../utils/roles');
const { verifyAccessToken } = require('../utils/token');

let masterDbInstance = null;

function getMasterDb() {
  if (!masterDbInstance) {
    const dbPath = path.join(__dirname, '..', 'data', 'gestor_tienda.db');
    masterDbInstance = new Database(dbPath);
    masterDbInstance.pragma('foreign_keys = ON');
  }
  return masterDbInstance;
}

process.once('exit', () => {
  if (masterDbInstance) {
    try {
      masterDbInstance.close();
    } catch (error) {
      console.warn('⚠️ No se pudo cerrar la conexión de autenticación:', error.message);
    }
  }
});

function resolveUserRecord(payload) {
  try {
    const master = getMasterDb();
    let record = null;

    if (payload?.userId) {
      record = master
        .prepare(
          `
        SELECT id, username, rol, activo
        FROM usuarios
        WHERE id = ?
      `
        )
        .get(payload.userId);
    }

    if (!record && payload?.username) {
      record = master
        .prepare(
          `
        SELECT id, username, rol, activo
        FROM usuarios
        WHERE username = ?
      `
        )
        .get(payload.username);
    }

    return record || null;
  } catch (error) {
    console.warn('⚠️ No se pudo validar el usuario desde el token:', error.message);
    return null;
  }
}

/**
 * Middleware para autenticar peticiones
 * Verifica que el usuario tenga un token JWT válido
 *
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 * @param {Function} next - Next middleware
 */
function authenticate(req, res, next) {
  // Intentar obtener token de cookie primero (más seguro)
  let token = req.cookies?.access_token;
  let tokenSource = 'cookie';

  // Fallback: obtener token del header Authorization (para compatibilidad)
  if (!token) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(`⚠️ Autenticación fallida en ${req.path}: No se proporcionó token`);
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Token no proporcionado',
        code: 'NO_TOKEN',
      });
    }

    // Extraer token (remover "Bearer ")
    token = authHeader.substring(7);
    tokenSource = 'header';
  }

  // Log de diagnóstico
  console.log(`🔐 Autenticando ${req.method} ${req.path} - Token desde: ${tokenSource}`);

  // Verificar token
  const verification = verifyAccessToken(token);

  if (!verification.valid) {
    console.error(`❌ Token inválido en ${req.path}: ${verification.error}`);
    return res.status(401).json({
      success: false,
      message: verification.error || 'Token inválido',
      code: 'INVALID_TOKEN',
    });
  }

  const userRecord = resolveUserRecord(verification.payload);

  if (!userRecord) {
    console.error(
      `❌ Usuario no encontrado en ${req.path}: userId=${verification.payload?.userId}`
    );
    return res.status(401).json({
      success: false,
      message: 'No autorizado - Usuario inválido o inexistente',
      code: 'USER_NOT_FOUND',
    });
  }

  if (userRecord.activo === 0) {
    console.warn(`⚠️ Intento de acceso con cuenta inactiva en ${req.path}: ${userRecord.username}`);
    return res.status(403).json({
      success: false,
      message: 'Cuenta inactiva. Contacta al administrador.',
      code: 'USER_INACTIVE',
    });
  }

  const effectiveRole = normalizeRole(userRecord.rol || verification.payload.rol);

  // Adjuntar datos del usuario a la request para uso posterior
  req.user = {
    ...verification.payload,
    userId: userRecord.id,
    username: userRecord.username,
    rol: effectiveRole,
    isSuperAdmin: effectiveRole === ROLE_SUPER_ADMIN,
  };

  // Unificar lista de negocios con la información más reciente de la base de datos
  try {
    const master = getMasterDb();
    const negociosDb = master
      .prepare(
        `
        SELECT negocio_id
        FROM usuarios_negocios
        WHERE usuario_id = ?
      `
      )
      .all(req.user.userId)
      .map((row) => row.negocio_id)
      .filter(Boolean);

    if (req.user.isSuperAdmin) {
      try {
        const activos = master
          .prepare(`SELECT id FROM negocios WHERE estado = 'activo'`)
          .all()
          .map((row) => row.id)
          .filter(Boolean);

        activos.forEach((id) => {
          if (!negociosDb.includes(id)) {
            negociosDb.push(id);
          }
        });

        if (!negociosDb.includes('super_admin')) {
          negociosDb.push('super_admin');
        }
      } catch (error) {
        console.warn(
          '⚠️ No se pudieron sincronizar todos los negocios para super_admin:',
          error.message
        );
      }
    }

    if (negociosDb.length) {
      if (Array.isArray(req.user.negocios)) {
        req.user.negocios = Array.from(new Set([...req.user.negocios, ...negociosDb]));
      } else if (typeof req.user.negocios === 'string' && req.user.negocios.trim()) {
        try {
          const parsed = JSON.parse(req.user.negocios);
          const merged = Array.isArray(parsed) ? parsed : [];
          req.user.negocios = Array.from(new Set([...merged, ...negociosDb]));
        } catch (parseError) {
          req.user.negocios = Array.from(new Set(negociosDb));
        }
      } else {
        req.user.negocios = Array.from(new Set(negociosDb));
      }
    }
  } catch (error) {
    console.warn('⚠️ No se pudo sincronizar los negocios del usuario:', error.message);
  }

  // Cargar negocios del usuario desde la información disponible
  try {
    if (Array.isArray(req.user.negocios)) {
      req.user.negocios = req.user.negocios.filter(Boolean);
    } else if (typeof req.user.negocios === 'string' && req.user.negocios.trim()) {
      const parsed = JSON.parse(req.user.negocios);
      if (!Array.isArray(parsed)) {
        throw new Error('Formato de negocios inválido');
      }
      req.user.negocios = parsed.filter(Boolean);
    } else if (req.user.negocioId) {
      req.user.negocios = [req.user.negocioId];
    } else {
      throw new Error('Usuario sin negocios asignados');
    }

    if (!req.user.negocios.length) {
      throw new Error('Lista de negocios vacía');
    }
  } catch (error) {
    console.error(`❌ Error procesando negocios del usuario en ${req.path}:`, error.message);
    return res.status(401).json({
      success: false,
      message: 'No autorizado - Negocios del usuario no disponibles',
      code: 'TENANT_ASSIGNMENT_ERROR',
    });
  }

  if (!req.user.negocioId) {
    req.user.negocioId = req.user.negocios[0];
  }

  if (req.user.isSuperAdmin && Array.isArray(req.user.negocios)) {
    if (!req.user.negocios.includes('super_admin')) {
      req.user.negocios.push('super_admin');
    }

    const ordered = Array.from(new Set(req.user.negocios));
    ordered.sort((a, b) => {
      if (a === 'super_admin' && b !== 'super_admin') return -1;
      if (b === 'super_admin' && a !== 'super_admin') return 1;
      return a.localeCompare(b);
    });
    req.user.negocios = ordered;
    req.user.negocioId = ordered[0];
  }

  console.log(`✅ Usuario autenticado: ${req.user.username}, negocio: ${req.user.negocioId}`);

  // Continuar con el siguiente middleware/controlador
  next();
}

/**
 * Middleware para requerir un rol específico
 * Debe usarse DESPUÉS del middleware authenticate
 *
 * @param {...string} allowedRoles - Roles permitidos (admin, user, etc)
 * @returns {Function} Middleware function
 *
 * @example
 * // Solo admin
 * app.delete('/api/usuarios/:id', authenticate, requireRole('admin'), deleteUser);
 *
 * // Admin o gerente
 * app.post('/api/productos', authenticate, requireRole('admin', 'gerente'), createProduct);
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Autenticación requerida',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const normalizedAllowed = allowedRoles.map(normalizeRole);

    // Verificar que el rol del usuario esté en la lista de roles permitidos
    if (!normalizedAllowed.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado - Permisos insuficientes',
        requiredRoles: allowedRoles,
        userRole: req.user.rol,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    // Usuario tiene rol permitido, continuar
    next();
  };
}

/**
 * Middleware opcional de autenticación
 * Similar a authenticate, pero no rechaza si no hay token
 * Útil para rutas que pueden ser públicas o autenticadas
 *
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 * @param {Function} next - Next middleware
 */
function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  // Si no hay header, continuar sin usuario
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.substring(7);
  const verification = verifyAccessToken(token);

  // Si el token es válido, adjuntar usuario
  if (verification.valid) {
    const userRecord = resolveUserRecord(verification.payload);

    if (userRecord && userRecord.activo !== 0) {
      const effectiveRole = normalizeRole(userRecord.rol || verification.payload.rol);
      req.user = {
        ...verification.payload,
        userId: userRecord.id,
        username: userRecord.username,
        rol: effectiveRole,
        isSuperAdmin: effectiveRole === ROLE_SUPER_ADMIN,
      };
    } else {
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
}

/**
 * Middleware para verificar que el usuario sea el propietario del recurso
 * Útil para operaciones como "editar mi perfil", "ver mis pedidos", etc.
 *
 * @param {string} paramName - Nombre del parámetro que contiene el userId (default: 'id')
 * @returns {Function} Middleware function
 */
function requireOwnerOrAdmin(paramName = 'id') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const resourceUserId = req.params[paramName] || req.body[paramName];

    // Admin puede acceder a cualquier recurso
    if (isRole(req.user.rol, [ROLE_ADMIN, ROLE_SUPER_ADMIN])) {
      return next();
    }

    // Usuario normal solo puede acceder a sus propios recursos
    if (req.user.userId !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a este recurso',
        code: 'NOT_OWNER',
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  optionalAuthenticate,
  requireOwnerOrAdmin,
};
