/**
 * Utilidades para manejo seguro de contraseñas
 * Usa bcrypt para hashing criptográficamente seguro
 */

const bcrypt = require('bcrypt');

// Número de rondas de salt (12 es un buen balance entre seguridad y rendimiento)
const SALT_ROUNDS = 12;

/**
 * Hashear contraseña usando bcrypt
 * @param {string} plainPassword - Contraseña en texto plano
 * @returns {Promise<string>} Hash de la contraseña
 */
async function hashPassword(plainPassword) {
  try {
    const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    return hash;
  } catch (error) {
    throw new Error('Error al hashear contraseña: ' + error.message);
  }
}

/**
 * Comparar contraseña en texto plano con hash
 * @param {string} plainPassword - Contraseña en texto plano
 * @param {string} hashedPassword - Hash almacenado
 * @returns {Promise<boolean>} true si coinciden, false si no
 */
async function comparePassword(plainPassword, hashedPassword) {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    throw new Error('Error al verificar contraseña: ' + error.message);
  }
}

/**
 * Validar fortaleza de contraseña
 * Requisitos:
 * - Mínimo 8 caracteres
 * - Al menos 1 letra mayúscula
 * - Al menos 1 letra minúscula
 * - Al menos 1 número
 * - Recomendado: caracteres especiales
 *
 * @param {string} password - Contraseña a validar
 * @returns {object} { valid: boolean, message: string }
 */
function validatePasswordStrength(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(password);

  // Verificar longitud mínima
  if (password.length < minLength) {
    return {
      valid: false,
      message: `La contraseña debe tener al menos ${minLength} caracteres`,
    };
  }

  // Verificar mayúscula
  if (!hasUpperCase) {
    return {
      valid: false,
      message: 'La contraseña debe incluir al menos una letra mayúscula',
    };
  }

  // Verificar minúscula
  if (!hasLowerCase) {
    return {
      valid: false,
      message: 'La contraseña debe incluir al menos una letra minúscula',
    };
  }

  // Verificar número
  if (!hasNumber) {
    return {
      valid: false,
      message: 'La contraseña debe incluir al menos un número',
    };
  }

  // Advertencia si no tiene caracteres especiales (no bloquear, solo advertir)
  if (!hasSpecialChar) {
    return {
      valid: true,
      warning: 'Recomendado: incluir caracteres especiales (!@#$%^&*) para mayor seguridad',
    };
  }

  return { valid: true };
}

/**
 * Verificar si un hash es de bcrypt
 * @param {string} hash - Hash a verificar
 * @returns {boolean} true si es hash de bcrypt
 */
function isBcryptHash(hash) {
  return hash && typeof hash === 'string' && hash.startsWith('$2');
}

module.exports = {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  isBcryptHash,
};
