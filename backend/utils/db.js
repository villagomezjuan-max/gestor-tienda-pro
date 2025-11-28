/**
 * UTILIDADES DE BASE DE DATOS MULTI-TENANT
 *
 * Proporciona funciones para acceder a las bases de datos de cada negocio/tenant
 * de forma segura y centralizada.
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

// Cache de conexiones a bases de datos
const dbConnections = new Map();

// Directorio donde se almacenan las bases de datos
const DATA_DIR = path.join(__dirname, '..', 'data');

// Archivo de configuración de negocios
const CONFIG_NEGOCIOS_PATH = path.join(DATA_DIR, 'config_negocios.json');

/**
 * Obtiene la configuración de negocios desde config_negocios.json
 */
function getConfigNegocios() {
  if (!fs.existsSync(CONFIG_NEGOCIOS_PATH)) {
    throw new Error(`Archivo de configuración no encontrado: ${CONFIG_NEGOCIOS_PATH}`);
  }

  const configData = fs.readFileSync(CONFIG_NEGOCIOS_PATH, 'utf-8');
  return JSON.parse(configData);
}

/**
 * Obtiene el path de la base de datos para un negocio específico
 * @param {string} negocioId - ID del negocio
 * @returns {string} Path absoluto a la base de datos
 */
function getDBPath(negocioId) {
  const configNegocios = getConfigNegocios();
  const negocio = configNegocios.negocios.find((n) => n.id === negocioId);

  if (!negocio) {
    throw new Error(`Negocio no encontrado: ${negocioId}`);
  }

  return path.join(DATA_DIR, negocio.db_file);
}

/**
 * Obtiene o crea una conexión a la base de datos de un tenant/negocio
 * @param {string} negocioId - ID del negocio/tenant
 * @returns {Database} Instancia de la base de datos del tenant
 */
function getTenantDb(negocioId) {
  if (!negocioId) {
    throw new Error('negocioId es requerido para getTenantDb');
  }

  // Si ya existe conexión, retornarla
  if (dbConnections.has(negocioId)) {
    return dbConnections.get(negocioId);
  }

  // Obtener path de la base de datos
  const dbPath = getDBPath(negocioId);

  // Verificar que la base de datos existe
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Base de datos no existe para el negocio: ${negocioId}. Path: ${dbPath}`);
  }

  // Crear conexión
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Cachear conexión
  dbConnections.set(negocioId, db);

  console.log(`📂 Conexión DB establecida para negocio: ${negocioId}`);

  return db;
}

/**
 * Obtiene la base de datos master (gestor_tienda.db)
 * @returns {Database} Instancia de la base de datos master
 */
function getMasterDb() {
  const masterDbPath = path.join(DATA_DIR, 'gestor_tienda.db');

  if (!dbConnections.has('master')) {
    if (!fs.existsSync(masterDbPath)) {
      throw new Error(`Base de datos master no encontrada: ${masterDbPath}`);
    }

    const db = new Database(masterDbPath);
    db.pragma('foreign_keys = ON');
    dbConnections.set('master', db);

    console.log('📂 Conexión DB master establecida');
  }

  return dbConnections.get('master');
}

/**
 * Cierra una conexión específica de base de datos
 * @param {string} negocioId - ID del negocio
 */
function closeTenantDb(negocioId) {
  if (dbConnections.has(negocioId)) {
    const db = dbConnections.get(negocioId);
    db.close();
    dbConnections.delete(negocioId);
    console.log(`🔒 Conexión DB cerrada para negocio: ${negocioId}`);
  }
}

/**
 * Cierra todas las conexiones de base de datos
 */
function closeAllDatabases() {
  dbConnections.forEach((db, negocioId) => {
    try {
      db.close();
      console.log(`🔒 Conexión cerrada: ${negocioId}`);
    } catch (error) {
      console.error(`Error cerrando conexión ${negocioId}:`, error);
    }
  });
  dbConnections.clear();
}

/**
 * Verifica si existe una base de datos para un negocio
 * @param {string} negocioId - ID del negocio
 * @returns {boolean} True si existe la base de datos
 */
function tenantDbExists(negocioId) {
  try {
    const dbPath = getDBPath(negocioId);
    return fs.existsSync(dbPath);
  } catch (error) {
    console.warn(`tenantDbExists(${negocioId}) falló: ${error.message}`);
    return false;
  }
}

/**
 * Lista todos los negocios configurados
 * @returns {Array} Lista de negocios con sus configuraciones
 */
function listNegocios() {
  const configNegocios = getConfigNegocios();
  return configNegocios.negocios || [];
}

// Limpiar conexiones al cerrar proceso
process.on('exit', closeAllDatabases);
process.on('SIGINT', () => {
  closeAllDatabases();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeAllDatabases();
  process.exit(0);
});

module.exports = {
  getTenantDb,
  getMasterDb,
  getDBPath,
  closeTenantDb,
  closeAllDatabases,
  tenantDbExists,
  listNegocios,
};
