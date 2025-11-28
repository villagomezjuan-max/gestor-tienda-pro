/**
 * Middleware de seguridad multi-tenant
 * Valida que los usuarios solo accedan a sus negocios asignados
 */

/**
 * Middleware para validar acceso al negocio (tenant)
 * DEBE usarse DESPUÉS del middleware authenticate
 *
 * Verifica que:
 * 1. El usuario esté autenticado
 * 2. El negocio solicitado exista
 * 3. El usuario tenga permisos para acceder a ese negocio
 *
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 * @param {Function} next - Next middleware
 */
function validateTenantAccess(req, res, next) {
  // Verificar que el usuario esté autenticado
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autorizado - Autenticación requerida',
      code: 'NOT_AUTHENTICATED',
    });
  }

  // Obtener el negocio solicitado del header o del token
  const requestedNegocio = req.negocioId || req.headers['x-negocio-id'] || req.user?.negocioId;

  if (!requestedNegocio) {
    if (req.user?.isSuperAdmin) {
      req.negocioId = 'super_admin';
      return next();
    }

    return res.status(400).json({
      success: false,
      message: 'ID de negocio requerido',
      code: 'MISSING_TENANT_ID',
    });
  }

  if (req.user?.isSuperAdmin) {
    req.negocioId = requestedNegocio;
    return next();
  }

  // Verificar que el usuario tenga acceso al negocio
  const userNegocios = Array.isArray(req.user.negocios)
    ? req.user.negocios
    : [req.user.negocioId].filter(Boolean);

  if (!userNegocios.includes(requestedNegocio)) {
    console.warn(
      `⚠️ Intento de acceso no autorizado: Usuario ${req.user.username} intentó acceder a negocio ${requestedNegocio}`
    );
    console.warn(`   Negocios permitidos: ${userNegocios.join(', ')}`);

    return res.status(403).json({
      success: false,
      message: 'No tienes acceso a este negocio',
      code: 'INVALID_TENANT',
      allowedBusinesses: userNegocios,
    });
  }

  // Validación exitosa - continuar
  next();
}

/**
 * Middleware para establecer aislamiento de archivos por negocio
 * Crea/verifica directorios específicos del negocio en uploads/
 *
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 * @param {Function} next - Next middleware
 */
function isolateFilesByTenant(req, res, next) {
  const fs = require('fs');
  const path = require('path');

  const negocioId = req.negocioId;

  if (!negocioId) {
    return res.status(400).json({
      success: false,
      message: 'ID de negocio requerido para subir archivos',
      code: 'MISSING_TENANT_ID',
    });
  }

  // Crear estructura de carpetas por negocio
  const uploadsBase = path.join(__dirname, '..', 'uploads', negocioId);
  const subdirs = ['facturas', 'vehiculos', 'documentos', 'invoices'];

  try {
    // Crear directorio base del negocio
    if (!fs.existsSync(uploadsBase)) {
      fs.mkdirSync(uploadsBase, { recursive: true });
    }

    // Crear subdirectorios
    subdirs.forEach((subdir) => {
      const subdirPath = path.join(uploadsBase, subdir);
      if (!fs.existsSync(subdirPath)) {
        fs.mkdirSync(subdirPath, { recursive: true });
      }
    });

    // Agregar rutas al request para uso posterior
    req.tenantUploadsPath = uploadsBase;
    req.tenantPaths = {
      facturas: path.join(uploadsBase, 'facturas'),
      vehiculos: path.join(uploadsBase, 'vehiculos'),
      documentos: path.join(uploadsBase, 'documentos'),
      invoices: path.join(uploadsBase, 'invoices'),
    };

    next();
  } catch (error) {
    console.error('❌ Error creando estructura de archivos para tenant:', error);
    return res.status(500).json({
      success: false,
      message: 'Error configurando almacenamiento de archivos',
      code: 'FILE_SYSTEM_ERROR',
    });
  }
}

/**
 * Middleware para validar que un recurso pertenece al negocio actual
 * Útil para endpoints que acceden a recursos específicos (clientes, ventas, etc.)
 *
 * @param {string} resourceType - Tipo de recurso ('cliente', 'venta', 'producto', etc.)
 * @param {string} idParam - Nombre del parámetro que contiene el ID del recurso (default: 'id')
 * @returns {Function} Middleware function
 */
const tableColumnCache = new Map();

function tableHasColumn(db, tableName, columnName) {
  const dbIdentifier = db?.name || 'default';
  const cacheKey = `${dbIdentifier}:${tableName}:${columnName}`;
  if (tableColumnCache.has(cacheKey)) {
    return tableColumnCache.get(cacheKey);
  }

  try {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const exists = Array.isArray(columns) && columns.some((col) => col.name === columnName);
    tableColumnCache.set(cacheKey, exists);
    return exists;
  } catch (error) {
    console.warn(`⚠️ No se pudo inspeccionar la tabla ${tableName}:`, error.message);
    tableColumnCache.set(cacheKey, false);
    return false;
  }
}

function validateResourceOwnership(resourceType, idParam = 'id') {
  return (req, res, next) => {
    const resourceId = req.params[idParam] || req.body[idParam];

    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: `ID de ${resourceType} requerido`,
        code: 'MISSING_RESOURCE_ID',
      });
    }

    const db = req.db;
    const negocioId = req.negocioId;

    try {
      // Mapeo de tipos de recurso a tablas
      const tableMap = {
        cliente: 'clientes',
        venta: 'ventas',
        producto: 'productos',
        vehiculo: 'vehiculos',
        orden: 'ordenes_trabajo',
        proveedor: 'proveedores',
        compra: 'compras',
      };

      const tableName = tableMap[resourceType];

      if (!tableName) {
        console.warn(`⚠️ Tipo de recurso no soportado para validación: ${resourceType}`);
        return next(); // Continuar sin validación
      }

      const hasNegocioColumn = tableHasColumn(db, tableName, 'negocio_id');

      if (hasNegocioColumn && !negocioId) {
        return res.status(400).json({
          success: false,
          message: 'ID de negocio no disponible para validar el recurso',
          code: 'MISSING_TENANT_ID',
        });
      }

      if (hasNegocioColumn) {
        const resource = db
          .prepare(
            `
          SELECT id
          FROM ${tableName}
          WHERE id = @id AND negocio_id = @negocioId
        `
          )
          .get({ id: resourceId, negocioId });

        if (!resource) {
          const exists = db
            .prepare(`SELECT negocio_id FROM ${tableName} WHERE id = @id`)
            .get({ id: resourceId });

          if (exists) {
            console.warn(
              `⚠️ Acceso denegado al recurso ${resourceType} ${resourceId} para negocio ${negocioId}`
            );
            return res.status(403).json({
              success: false,
              message: 'No tienes acceso a este recurso',
              code: 'RESOURCE_ACCESS_DENIED',
            });
          }

          return res.status(404).json({
            success: false,
            message: `${resourceType} no encontrado`,
            code: 'RESOURCE_NOT_FOUND',
          });
        }
      } else {
        const resource = db
          .prepare(`SELECT id FROM ${tableName} WHERE id = @id`)
          .get({ id: resourceId });

        if (!resource) {
          return res.status(404).json({
            success: false,
            message: `${resourceType} no encontrado`,
            code: 'RESOURCE_NOT_FOUND',
          });
        }
      }

      next();
    } catch (error) {
      console.error(`❌ Error validando ownership de ${resourceType}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error validando acceso al recurso',
        code: 'VALIDATION_ERROR',
      });
    }
  };
}

/**
 * Middleware para rate limiting por negocio
 * DESHABILITADO: Siempre permite todas las peticiones
 */
function rateLimitByTenant() {
  return (req, res, next) => next();
}

module.exports = {
  validateTenantAccess,
  isolateFilesByTenant,
  validateResourceOwnership,
  rateLimitByTenant,
};
