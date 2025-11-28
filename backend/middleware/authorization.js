const { hasPermission, normalizeRole } = require('../utils/roles');

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Autenticación requerida',
        code: 'NOT_AUTHENTICATED',
      });
    }

    if (!permission) {
      return next();
    }

    if (!hasPermission(req.user.rol, permission)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado - Permisos insuficientes',
        requiredPermission: permission,
        userRole: normalizeRole(req.user.rol),
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    next();
  };
}

module.exports = {
  requirePermission,
};
