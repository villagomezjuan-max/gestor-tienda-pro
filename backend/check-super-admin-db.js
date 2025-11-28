const path = require('path');

const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data', 'super_admin.db');
console.log('Verificando BD:', dbPath);

try {
  const db = new Database(dbPath);

  // Verificar tablas
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all();
  console.log('\nTablas en la base de datos:');
  tables.forEach((t) => console.log('  -', t.name));

  // Verificar estructura de compras
  console.log('\n--- Estructura de compras ---');
  const comprasCols = db.prepare('PRAGMA table_info(compras)').all();
  if (comprasCols.length > 0) {
    console.log('Columnas:', comprasCols.map((c) => c.name).join(', '));

    // Contar registros
    const count = db.prepare('SELECT COUNT(*) as c FROM compras').get();
    console.log('Registros:', count.c);

    // Obtener una muestra
    if (count.c > 0) {
      const sample = db.prepare('SELECT * FROM compras LIMIT 1').get();
      console.log('Muestra:', JSON.stringify(sample, null, 2));
    }
  } else {
    console.log('❌ Tabla compras no existe');
  }

  // Verificar estructura de compras_detalle
  console.log('\n--- Estructura de compras_detalle ---');
  const detalleCols = db.prepare('PRAGMA table_info(compras_detalle)').all();
  if (detalleCols.length > 0) {
    console.log('Columnas:', detalleCols.map((c) => c.name).join(', '));

    // Contar registros
    const count = db.prepare('SELECT COUNT(*) as c FROM compras_detalle').get();
    console.log('Registros:', count.c);
  } else {
    console.log('❌ Tabla compras_detalle no existe');
  }

  db.close();
  console.log('\n✅ Verificación completada');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
