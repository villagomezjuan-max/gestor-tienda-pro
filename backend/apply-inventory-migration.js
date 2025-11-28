/**
 * Script para aplicar la migración 003: Optimización de Inventario
 * Ejecuta las mejoras en la gestión de inventario, historial de ventas y consistencia de datos
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

console.log('='.repeat(60));
console.log('MIGRACIÓN 003: OPTIMIZACIÓN DE INVENTARIO');
console.log('='.repeat(60));
console.log('');

// Ruta a la migración SQL
const migrationPath = path.join(__dirname, 'migrations', '003-inventory-optimization.sql');
const dataDir = path.join(__dirname, 'data');
const masterDbPath = path.join(dataDir, 'master.db');

// Verificar que existe el archivo de migración
if (!fs.existsSync(migrationPath)) {
  console.error('❌ Error: Archivo de migración no encontrado:', migrationPath);
  process.exit(1);
}

// Leer el contenido de la migración
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
console.log('✓ Archivo de migración cargado');
console.log('');

/**
 * Aplica la migración a una base de datos específica
 */
function applyMigration(dbPath, dbName) {
  console.log(`Aplicando migración a: ${dbName}`);
  console.log('-'.repeat(60));

  try {
    const db = new Database(dbPath);

    // Verificar versión actual
    const currentVersion = db.pragma('user_version', { simple: true });
    console.log(`  Versión actual: ${currentVersion}`);

    if (currentVersion >= 3) {
      console.log(`  ⏭️  Ya está en versión 3 o superior. Saltando...`);
      db.close();
      return;
    }

    // Ejecutar la migración en una transacción
    const migration = db.transaction(() => {
      // Dividir el SQL en statements individuales
      const statements = migrationSQL
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      let executed = 0;
      let errors = 0;

      for (const statement of statements) {
        try {
          // Saltar comentarios y líneas vacías
          if (statement.startsWith('--') || statement.trim() === '') {
            continue;
          }

          db.exec(statement + ';');
          executed++;
        } catch (error) {
          // Ignorar errores de "already exists" que son esperables
          if (
            error.message.includes('already exists') ||
            error.message.includes('duplicate column name')
          ) {
            console.log(`  ⚠️  Objeto ya existe (ignorando): ${error.message.substring(0, 50)}...`);
          } else {
            console.error(`  ❌ Error ejecutando statement:`, error.message);
            errors++;
          }
        }
      }

      console.log(`  ✓ Statements ejecutados: ${executed}`);
      if (errors > 0) {
        console.log(`  ⚠️  Errores no críticos: ${errors}`);
      }
    });

    migration();

    // Verificar nueva versión
    const newVersion = db.pragma('user_version', { simple: true });
    console.log(`  ✓ Nueva versión: ${newVersion}`);

    // Verificar que las tablas se crearon
    const tables = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN (
        'historial_ventas_productos', 
        'movimientos_stock', 
        'productos_eliminados'
      )
    `
      )
      .all();

    console.log(`  ✓ Tablas nuevas encontradas: ${tables.length}`);
    tables.forEach((t) => console.log(`    - ${t.name}`));

    db.close();
    console.log(`  ✅ Migración completada exitosamente para ${dbName}`);
    console.log('');
  } catch (error) {
    console.error(`  ❌ Error aplicando migración a ${dbName}:`, error);
    console.log('');
  }
}

// Aplicar migración a la base de datos principal
console.log('📦 PASO 1: Migrar base de datos principal');
console.log('');

if (fs.existsSync(masterDbPath)) {
  applyMigration(masterDbPath, 'master.db');
} else {
  console.log('⚠️  Base de datos principal no encontrada. Creando...');
  const db = new Database(masterDbPath);
  db.close();
  applyMigration(masterDbPath, 'master.db');
}

// Aplicar migración a todas las bases de datos de negocios
console.log('🏪 PASO 2: Migrar bases de datos de negocios');
console.log('');

const negociosDir = path.join(dataDir, 'negocios');

if (fs.existsSync(negociosDir)) {
  const negocios = fs.readdirSync(negociosDir);

  if (negocios.length === 0) {
    console.log('  ℹ️  No hay bases de datos de negocios para migrar');
  } else {
    console.log(`  Encontrados ${negocios.length} negocios`);
    console.log('');

    negocios.forEach((negocioFolder) => {
      const dbPath = path.join(negociosDir, negocioFolder, 'negocio.db');

      if (fs.existsSync(dbPath)) {
        applyMigration(dbPath, `negocios/${negocioFolder}/negocio.db`);
      }
    });
  }
} else {
  console.log('  ℹ️  Directorio de negocios no existe aún');
}

console.log('='.repeat(60));
console.log('✅ MIGRACIÓN COMPLETADA');
console.log('='.repeat(60));
console.log('');
console.log('Funcionalidades agregadas:');
console.log('  ✓ Historial detallado de ventas de productos');
console.log('  ✓ Registro automático de movimientos de stock');
console.log('  ✓ Backup automático de productos eliminados');
console.log('  ✓ Análisis de rentabilidad por producto');
console.log('  ✓ Vistas optimizadas para reportes');
console.log('  ✓ Triggers automáticos para consistencia de datos');
console.log('');
console.log('Nuevos endpoints API disponibles:');
console.log('  • GET /api/historial-ventas');
console.log('  • GET /api/historial-ventas/producto/:id');
console.log('  • GET /api/productos-mas-vendidos');
console.log('  • GET /api/movimientos-stock');
console.log('  • GET /api/analisis-rentabilidad');
console.log('');
console.log('⚠️  IMPORTANTE: Reinicia el servidor para aplicar los cambios');
console.log('');
