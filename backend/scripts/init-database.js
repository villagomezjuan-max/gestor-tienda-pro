#!/usr/bin/env node
/**
 * Script de inicialización de la base de datos
 * Gestor Tienda Pro
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

// Rutas de archivos
const DB_PATH = process.env.DB_PATH || './data/gestor_tienda.db';
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.sql');

function initializeDatabase() {
  console.log('🚀 Inicializando base de datos...');

  try {
    // Crear directorio de datos si no existe
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`✅ Directorio creado: ${dataDir}`);
    }

    // Leer el archivo schema.sql
    if (!fs.existsSync(SCHEMA_PATH)) {
      throw new Error(`No se encontró el archivo schema.sql en: ${SCHEMA_PATH}`);
    }

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    console.log('📄 Archivo schema.sql leído correctamente');

    // Conectar a la base de datos
    const db = new Database(DB_PATH, { verbose: console.log });
    db.pragma('foreign_keys = ON');

    console.log('🔗 Conexión a la base de datos establecida');

    // Ejecutar el esquema
    db.exec(schema);
    console.log('📋 Esquema aplicado correctamente');

    // Insertar datos iniciales básicos
    const insertAdmin = db.prepare(`
      INSERT OR IGNORE INTO usuarios (id, username, password, nombre, rol, activo)
      VALUES ('admin_001', 'admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador', 'SUPER_ADMIN', 1)
    `);

    const insertCategoria = db.prepare(`
      INSERT OR IGNORE INTO categorias (id, nombre, descripcion)
      VALUES ('cat_general', 'General', 'Categoría general de productos')
    `);

    insertAdmin.run();
    insertCategoria.run();

    console.log('👤 Usuario super administrador creado (admin/password)');
    console.log('📦 Categoría general creada');

    // Verificar la instalación
    const tableCount = db
      .prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
      .get();
    console.log(`📊 ${tableCount.count} tablas creadas en la base de datos`);

    db.close();
    console.log('✅ Base de datos inicializada correctamente');
    console.log(`📍 Ubicación: ${path.resolve(DB_PATH)}`);
    console.log('🔐 Credenciales por defecto: admin / password');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error.message);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
