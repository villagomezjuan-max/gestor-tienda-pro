const path = require('path');

const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data', 'super_admin.db');
const db = new Database(dbPath);

console.log('\n=== SUPER_ADMIN.DB ===');
console.log('Columnas de tabla compras:\n');

const cols = db.prepare('PRAGMA table_info(compras)').all();
cols.forEach((c) => console.log(`  ${c.cid}. ${c.name} (${c.type})`));

const tiene = cols.some((c) => c.name === 'proveedor_identificacion');
console.log(`\n¿Tiene proveedor_identificacion? ${tiene ? 'SÍ ✓' : 'NO ✗'}`);

const tieneMetadata = cols.some((c) => c.name === 'metadata');
console.log(`¿Tiene metadata? ${tieneMetadata ? 'SÍ ✓' : 'NO ✗'}`);

if (!tiene) {
  console.log('\n🔧 Agregando columna proveedor_identificacion...');
  try {
    db.prepare('ALTER TABLE compras ADD COLUMN proveedor_identificacion TEXT').run();
    console.log('✅ Columna agregada exitosamente');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

if (!tieneMetadata) {
  console.log('\n🔧 Agregando columna metadata...');
  try {
    db.prepare('ALTER TABLE compras ADD COLUMN metadata TEXT').run();
    console.log('✅ Columna metadata agregada exitosamente');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

db.close();
console.log('');
