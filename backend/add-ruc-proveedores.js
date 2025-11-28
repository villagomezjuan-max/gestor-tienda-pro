/**
 * Agregar columna RUC a tabla proveedores en todas las bases de datos
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  ACTUALIZACIÓN: Agregar columna RUC a proveedores        ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

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

console.log(`🔍 Encontradas ${dbFiles.length} bases de datos\n`);

let actualizadas = 0;
let yaExistian = 0;

dbFiles.forEach((dbPath) => {
  const dbName = path.basename(dbPath);
  console.log(`📂 ${dbName}:`);

  try {
    const db = new Database(dbPath);

    // Verificar si existe la tabla proveedores
    const tablaProveedores = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='proveedores'")
      .get();

    if (!tablaProveedores) {
      console.log('   ⏭️  No tiene tabla proveedores\n');
      db.close();
      return;
    }

    // Verificar columnas actuales
    const columnas = db.prepare('PRAGMA table_info(proveedores)').all();
    const tieneRuc = columnas.some((c) => c.name === 'ruc');

    if (tieneRuc) {
      console.log('   ✓ Ya tiene columna RUC\n');
      yaExistian++;
      db.close();
      return;
    }

    // Agregar columna RUC
    console.log('   🔧 Agregando columna RUC...');
    db.prepare('ALTER TABLE proveedores ADD COLUMN ruc TEXT').run();
    console.log('   ✅ Columna RUC agregada\n');
    actualizadas++;

    db.close();
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ Actualizadas: ${actualizadas}`);
console.log(`✓ Ya existían: ${yaExistian}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
