const db = require('better-sqlite3')('./data/gestor_tienda.db');

console.log('=== Verificando estructura de tablas de compras ===\n');

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'compra%'")
  .all();
console.log('Tablas encontradas:', JSON.stringify(tables, null, 2));

console.log('\n--- Columnas de compras ---');
try {
  const cols = db.prepare('PRAGMA table_info(compras)').all();
  console.log(
    JSON.stringify(
      cols.map((c) => c.name),
      null,
      2
    )
  );
} catch (e) {
  console.log('Error:', e.message);
}

console.log('\n--- Columnas de compras_detalle ---');
try {
  const cols = db.prepare('PRAGMA table_info(compras_detalle)').all();
  console.log(
    JSON.stringify(
      cols.map((c) => c.name),
      null,
      2
    )
  );
} catch (e) {
  console.log('Error:', e.message);
}

// Verificar tenant database si existe
console.log('\n=== Verificando base de datos del tenant super_admin ===');
const fs = require('fs');
const tenantDbPath = './data/tenant_super_admin.db';
if (fs.existsSync(tenantDbPath)) {
  const tenantDb = require('better-sqlite3')(tenantDbPath);

  const tenantTables = tenantDb
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'compra%'")
    .all();
  console.log('Tablas en tenant:', JSON.stringify(tenantTables, null, 2));

  console.log('\n--- Columnas de compras en tenant ---');
  try {
    const cols = tenantDb.prepare('PRAGMA table_info(compras)').all();
    console.log(
      JSON.stringify(
        cols.map((c) => c.name),
        null,
        2
      )
    );
  } catch (e) {
    console.log('Error:', e.message);
  }

  console.log('\n--- Columnas de compras_detalle en tenant ---');
  try {
    const cols = tenantDb.prepare('PRAGMA table_info(compras_detalle)').all();
    console.log(
      JSON.stringify(
        cols.map((c) => c.name),
        null,
        2
      )
    );
  } catch (e) {
    console.log('Error:', e.message);
  }

  tenantDb.close();
} else {
  console.log('No existe base de datos de tenant');
}

db.close();
console.log('\n=== Verificación completada ===');
