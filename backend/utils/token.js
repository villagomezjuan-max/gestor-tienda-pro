/**
 * Utilidades para manejo de tokens JWT
 * Maneja generación y verificación de tokens de acceso y refresh
 */

const crypto = require('crypto');

const jwt = require('jsonwebtoken');

// Cargar configuración desde variables de entorno
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Validar que los secrets estén configurados
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET y JWT_REFRESH_SECRET deben estar definidos en el archivo .env');
}

/**
 * Generar token de acceso (access token)
 * Token de corta duración para autenticar peticiones
 *
 * @param {string} userId - ID del usuario
 * @param {string} username - Nombre de usuario
 * @param {string} rol - Rol del usuario (admin, user, etc)
 * @param {string} negocioId - ID del negocio principal
 * @param {Array<string>} negocios - Lista de IDs de negocios a los que tiene acceso
 * @returns {string} JWT token
 */
function generateAccessToken(userId, username, rol, negocioId, negocios = null) {
  const payload = {
    userId,
    username,
    rol,
    negocioId: negocioId || 'tienda_principal',
    type: 'access',
  };

  // Agregar lista de negocios si se proporciona
  if (negocios && Array.isArray(negocios) && negocios.length > 0) {
    payload.negocios = negocios;
  } else {
    // Fallback: solo el negocio principal
    payload.negocios = [negocioId || 'tienda_principal'];
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'gestor-tienda-pro',
    audience: 'gestor-tienda-api',
  });
}

/**
 * Generar token de refresco (refresh token)
 * Token de larga duración para renovar access tokens
 *
 * @param {string} userId - ID del usuario
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(userId) {
  return jwt.sign(
    {
      userId,
      type: 'refresh',
      jti: crypto.randomBytes(16).toString('hex'), // JWT ID único para invalidación
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'gestor-tienda-pro',
      audience: 'gestor-tienda-api',
    }
  );
}

/**
 * Verificar token de acceso
 *
 * @param {string} token - Token JWT a verificar
 * @returns {object} { valid: boolean, payload?: object, error?: string }
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'gestor-tienda-pro',
      audience: 'gestor-tienda-api',
    });

    if (decoded.type !== 'access') {
      console.warn('⚠️ Token de tipo incorrecto:', decoded.type);
      throw new Error('Tipo de token inválido');
    }

    return { valid: true, payload: decoded };
  } catch (error) {
    let errorMessage = 'Token inválido';

    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token expirado';
      console.warn(`⚠️ Token expirado. Expiró el: ${new Date(error.expiredAt).toISOString()}`);
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Token mal formado';
      console.error(`❌ Token mal formado: ${error.message}`);
      // Log del token sin mostrar el contenido completo
      if (token) {
        console.error(`  Token length: ${token.length}, starts with: ${token.substring(0, 20)}...`);
      } else {
        console.error('  Token is null or undefined');
      }
    } else if (error.name === 'NotBeforeError') {
      errorMessage = 'Token aún no válido';
      console.warn(`⚠️ Token no válido aún. Válido desde: ${new Date(error.date).toISOString()}`);
    } else {
      console.error(`❌ Error desconocido verificando token:`, error.message);
      console.error(`  Error name: ${error.name}`);
    }

    return { valid: false, error: errorMessage };
  }
}

/**
 * Verificar token de refresco
 *
 * @param {string} token - Refresh token JWT a verificar
 * @returns {object} { valid: boolean, payload?: object, error?: string }
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'gestor-tienda-pro',
      audience: 'gestor-tienda-api',
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Tipo de token inválido');
    }

    return { valid: true, payload: decoded };
  } catch (error) {
    let errorMessage = 'Refresh token inválido';

    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Refresh token expirado';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Refresh token mal formado';
    }

    return { valid: false, error: errorMessage };
  }
}

/**
 * Decodificar token sin verificar (útil para debugging)
 * NUNCA usar para validación de seguridad
 *
 * @param {string} token - Token JWT
 * @returns {object | null} Payload decodificado o null si falla
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

/**
 * Obtener tiempo restante de un token (en segundos)
 *
 * @param {string} token - Token JWT
 * @returns {number|null} Segundos restantes o null si inválido/expirado
 */
function getTokenTimeRemaining(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const remaining = decoded.exp - now;

  return remaining > 0 ? remaining : 0;
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenTimeRemaining,
};
