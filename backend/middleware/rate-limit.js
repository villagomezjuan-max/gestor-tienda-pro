/**
 * Middleware de Rate Limiting
 * DESHABILITADO COMPLETAMENTE - Todos los limiters son passthrough
 */

/**
 * Middleware passthrough - no hace nada, solo pasa al siguiente middleware
 */
const passthrough = (req, res, next) => next();

/**
 * Todos los rate limiters deshabilitados - solo pasan la petición
 */
const apiLimiter = passthrough;
const loginLimiter = passthrough;
const criticalLimiter = passthrough;
const passwordChangeLimiter = passthrough;
const registerLimiter = passthrough;
const iaLimiter = passthrough;
const ventasLimiter = passthrough;

/**
 * Crear rate limiter personalizado - retorna passthrough (deshabilitado)
 */
function createCustomLimiter() {
  return passthrough;
}

/**
 * Verificar si una ruta es de IA
 */
function isIaRoute(path) {
  if (!path || typeof path !== 'string') return false;
  const normalized = path.toLowerCase();
  return normalized.includes('/ia/') || normalized.includes('/admin/ia/');
}

module.exports = {
  apiLimiter,
  loginLimiter,
  criticalLimiter,
  passwordChangeLimiter,
  registerLimiter,
  iaLimiter,
  ventasLimiter,
  createCustomLimiter,
  isIaRoute,
};
