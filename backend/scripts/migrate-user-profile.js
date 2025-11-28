/**
 * Script para ejecutar migración 002: Campos de perfil de usuario
 * Agrega campos telefono, direccion, ciudad, foto_perfil a la tabla usuarios
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

// Configuración
const DATA_DIR = path.join(__dirname, '..', 'data');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const MIGRATION_FILE = '002_add_user_profile_fields.sql';

console.log('🔧 Iniciando migración de campos de perfil de usuario...');

// Función para aplicar migración a una base de datos
function applyMigration(dbPath, dbName) {
  console.log(`\n📂 Procesando: ${dbName}`);

  try {
    const db = new Database(dbPath);
    db.pragma('foreign_keys = OFF');

    // Leer archivo de migración
    const migrationPath = path.join(MIGRATIONS_DIR, MIGRATION_FILE);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Ejecutar migración
    db.exec(migrationSQL);

    console.log(`  ✅ Migración aplicada exitosamente a ${dbName}`);

    db.pragma('foreign_keys = ON');
    db.close();
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log(`  ℹ️  Las columnas ya existen en ${dbName} (omitiendo)`);
    } else {
      console.error(`  ❌ Error en ${dbName}:`, error.message);
    }
  }
}

// Asegurar que exista el directorio de datos
if (!fs.existsSync(DATA_DIR)) {
  console.error('❌ El directorio de datos no existe:', DATA_DIR);
  process.exit(1);
}

// Buscar todas las bases de datos
const dbFiles = fs.readdirSync(DATA_DIR).filter((file) => file.endsWith('.db'));

if (dbFiles.length === 0) {
  console.warn('⚠️  No se encontraron bases de datos para migrar');
  process.exit(0);
}

console.log(`📊 Bases de datos encontradas: ${dbFiles.length}`);

// Aplicar migración a cada base de datos
dbFiles.forEach((dbFile) => {
  const dbPath = path.join(DATA_DIR, dbFile);
  applyMigration(dbPath, dbFile);
});

console.log('\n✅ Migración completada para todas las bases de datos');
console.log('💡 Los nuevos campos están disponibles:');
console.log('   - telefono: Número de teléfono del usuario');
console.log('   - direccion: Dirección del usuario');
console.log('   - ciudad: Ciudad del usuario');
console.log('   - foto_perfil: URL de la foto de perfil');
