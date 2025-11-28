/**
 * Utilidades de normalización de números
 * Unifica parseLocaleNumber y normalizeNumber en un solo módulo
 */

/**
 * Parsea un número con formato local (comas/puntos)
 * Soporta formatos: 1,234.56 | 1.234,56 | 1234 | 1234.56 | 1234,56
 *
 * @param {string|number} value - Valor a parsear
 * @returns {number|null} - Número parseado o null si no es válido
 */
function parseLocaleNumber(value) {
  // Si ya es un número válido, retornarlo directamente
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // Remover caracteres que no sean números, comas o puntos
  const sanitized = trimmed.replace(/[^0-9.,-]/g, '');
  if (!sanitized) return null;

  // Identificar separador decimal
  const lastComma = sanitized.lastIndexOf(',');
  const lastDot = sanitized.lastIndexOf('.');
  let normalized = sanitized;

  // Determinar formato según posición de comas y puntos
  if (lastComma > lastDot) {
    // Formato europeo: 1.234,56 -> remover puntos, convertir coma en punto
    normalized = normalized.replace(/\./g, '');
    normalized = normalized.replace(',', '.');
  } else if (lastDot > lastComma && lastComma !== -1) {
    // Formato americano con miles: 1,234.56 -> remover comas
    normalized = normalized.replace(/,/g, '');
  } else if (lastComma !== -1 && lastDot === -1) {
    // Solo comas: podría ser 1234,56 (decimal) o 1,234 (miles)
    // Asumimos decimal si solo hay una coma
    normalized = normalized.replace(/\./g, '');
    normalized = normalized.replace(',', '.');
  } else {
    // Solo puntos o sin separadores: 1234.56 o 1234
    normalized = normalized.replace(/,/g, '');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Normaliza un valor a número, con fallback
 *
 * @param {*} value - Valor a normalizar
 * @param {number} fallback - Valor por defecto si falla
 * @returns {number} - Número normalizado
 */
function normalizeNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }
    const parsed = parseLocaleNumber(trimmed);
    if (parsed !== null) {
      return parsed;
    }
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

/**
 * Redondea un número a 2 decimales
 *
 * @param {number} value - Número a redondear
 * @returns {number} - Número redondeado
 */
function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

/**
 * Redondea un número a N decimales
 *
 * @param {number} value - Número a redondear
 * @param {number} decimals - Cantidad de decimales
 * @returns {number} - Número redondeado
 */
function roundN(value, decimals = 2) {
  return Number(Number(value || 0).toFixed(decimals));
}

/**
 * Formatea un número como moneda
 *
 * @param {number} value - Valor a formatear
 * @param {string} currency - Código de moneda (USD, EUR, etc.)
 * @param {string} locale - Locale (es-EC, en-US, etc.)
 * @returns {string} - Número formateado
 */
function formatCurrency(value, currency = 'USD', locale = 'es-EC') {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(value || 0);
}

/**
 * Verifica si un valor parece ser numérico
 *
 * @param {*} value - Valor a verificar
 * @returns {boolean} - true si parece numérico
 */
function looksNumeric(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return true;
  if (typeof value !== 'string') return false;
  return /[0-9]/.test(value);
}

/**
 * Calcula porcentaje de IVA
 *
 * @param {number} subtotal - Subtotal sin IVA
 * @param {number} ivaRate - Tasa de IVA (12 para 12%)
 * @returns {number} - Monto de IVA
 */
function calculateIVA(subtotal, ivaRate = 12) {
  const rate = ivaRate / 100;
  return round2(subtotal * rate);
}

/**
 * Calcula total con IVA
 *
 * @param {number} subtotal - Subtotal sin IVA
 * @param {number} ivaRate - Tasa de IVA (12 para 12%)
 * @returns {number} - Total con IVA
 */
function calculateTotal(subtotal, ivaRate = 12) {
  const iva = calculateIVA(subtotal, ivaRate);
  return round2(subtotal + iva);
}

module.exports = {
  parseLocaleNumber,
  normalizeNumber,
  round2,
  roundN,
  formatCurrency,
  looksNumeric,
  calculateIVA,
  calculateTotal,
};
