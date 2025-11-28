/**
 * ASYNC HANDLER UTILITY
 *
 * Envuelve funciones async de Express para manejar errores automáticamente
 * Evita tener que usar try-catch en cada ruta
 */

/**
 * Envuelve una función async de Express para capturar errores automáticamente
 * @param {Function} fn - Función async a envolver
 * @returns {Function} Función envuelta que maneja errores
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = { asyncHandler };
