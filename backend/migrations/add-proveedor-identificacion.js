/**
 * Migración: Agregar columna proveedor_identificacion a tabla compras
 *
 * Esta migración agrega la columna proveedor_identificacion que almacena
 * el RUC/CI del proveedor en cada compra.
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  MIGRACIÓN: Agregar proveedor_identificacion a compras   ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Buscar bases de datos
const possibleDbPaths = [
  path.join(__dirname, '..', 'data', 'gestor_tienda.db'),
  path.join(__dirname, '..', 'data', 'taller_sa.db'),
  path.join(__dirname, '..', '..', 'data', 'gestor_tienda.db'),
  path.join(__dirname, '..', '..', 'data', 'taller_sa.db'),
];

let migratedCount = 0;

for (const dbPath of possibleDbPaths) {
  if (!fs.existsSync(dbPath)) {
    continue;
  }

  console.log(`📂 Encontrada BD: ${path.basename(dbPath)}`);

  try {
    const db = new Database(dbPath);

    // Verificar si la columna ya existe
    const tableInfo = db.prepare('PRAGMA table_info(compras)').all();
    const hasColumn = tableInfo.some((col) => col.name === 'proveedor_identificacion');

    if (hasColumn) {
      console.log('   ✓ La columna proveedor_identificacion ya existe\n');
      db.close();
      continue;
    }

    console.log('   🔧 Agregando columna proveedor_identificacion...');

    // Agregar columna
    db.prepare(
      `
      ALTER TABLE compras 
      ADD COLUMN proveedor_identificacion TEXT
    `
    ).run();

    console.log('   ✅ Columna agregada exitosamente');

    // Verificar
    const newTableInfo = db.prepare('PRAGMA table_info(compras)').all();
    const columnAdded = newTableInfo.some((col) => col.name === 'proveedor_identificacion');

    if (columnAdded) {
      console.log('   ✓ Verificación exitosa\n');
      migratedCount++;
    } else {
      console.log('   ⚠️ La columna no se agregó correctamente\n');
    }

    db.close();
  } catch (error) {
    console.error(`   ❌ Error en ${path.basename(dbPath)}:`, error.message, '\n');
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ Migración completada: ${migratedCount} base(s) de datos actualizadas`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('🎯 SIGUIENTE PASO:');
console.log('   Reinicia el servidor: node backend/server.js');
console.log('   La columna proveedor_identificacion ahora está disponible\n');
