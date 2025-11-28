/**
 * ACTUALIZACIÓN DE EMERGENCIA: Agregar columna proveedor_identificacion
 * a TODAS las bases de datos (incluyendo tenants dinámicos)
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  ACTUALIZACIÓN URGENTE: proveedor_identificacion         ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Buscar TODAS las bases de datos .db en el directorio
const dataDir = path.join(__dirname, '..', 'data');
const backendDataDir = path.join(__dirname, 'data');

const searchDirs = [dataDir, backendDataDir];
const dbFiles = [];

searchDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      if (file.endsWith('.db')) {
        const fullPath = path.join(dir, file);
        if (!dbFiles.includes(fullPath)) {
          dbFiles.push(fullPath);
        }
      }
    });
  }
});

console.log(`🔍 Encontradas ${dbFiles.length} bases de datos:\n`);
dbFiles.forEach((f) => console.log(`   - ${path.basename(f)}`));
console.log('');

let actualizadas = 0;
let yaExistian = 0;
let errores = 0;

dbFiles.forEach((dbPath) => {
  const dbName = path.basename(dbPath);
  console.log(`📂 Procesando: ${dbName}`);

  try {
    const db = new Database(dbPath);

    // Verificar si existe la tabla compras
    const tablaCompras = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='compras'")
      .get();

    if (!tablaCompras) {
      console.log(`   ⏭️  No tiene tabla compras (omitiendo)\n`);
      db.close();
      return;
    }

    // Verificar si ya tiene la columna
    const columnas = db.prepare('PRAGMA table_info(compras)').all();
    const tieneColumna = columnas.some((c) => c.name === 'proveedor_identificacion');

    if (tieneColumna) {
      console.log(`   ✓ Ya tiene proveedor_identificacion\n`);
      yaExistian++;
      db.close();
      return;
    }

    // Agregar columna
    console.log(`   🔧 Agregando columna proveedor_identificacion...`);
    db.prepare('ALTER TABLE compras ADD COLUMN proveedor_identificacion TEXT').run();

    // Verificar
    const nuevasColumnas = db.prepare('PRAGMA table_info(compras)').all();
    const agregada = nuevasColumnas.some((c) => c.name === 'proveedor_identificacion');

    if (agregada) {
      console.log(`   ✅ Columna agregada exitosamente\n`);
      actualizadas++;
    } else {
      console.log(`   ❌ Error al agregar columna\n`);
      errores++;
    }

    db.close();
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
    errores++;
  }
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ Actualizadas: ${actualizadas}`);
console.log(`✓ Ya existían: ${yaExistian}`);
if (errores > 0) {
  console.log(`❌ Errores: ${errores}`);
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (actualizadas > 0) {
  console.log('🎯 SIGUIENTE PASO:');
  console.log('   Reinicia el servidor: node backend/server.js\n');
}
