const path = require('path');

const Database = require('better-sqlite3');

console.log('🔧 AGREGANDO COLUMNAS FALTANTES A LA TABLA USUARIOS');
console.log('═══════════════════════════════════════════════════\n');

const DB_PATH = path.join(__dirname, '..', 'data', 'gestor_tienda.db');
const db = new Database(DB_PATH);

try {
  // Verificar columnas actuales
  const columns = db.prepare('PRAGMA table_info(usuarios)').all();
  const columnNames = columns.map((c) => c.name);

  console.log('📋 Columnas actuales:', columnNames.join(', '));
  console.log('');

  // Columnas que necesitamos agregar
  const columnsToAdd = [
    { name: 'intentos_fallidos', type: 'INTEGER', default: '0' },
    { name: 'bloqueado_hasta', type: 'DATETIME', default: 'NULL' },
    { name: 'token_recuperacion', type: 'TEXT', default: 'NULL' },
    { name: 'token_expiracion', type: 'DATETIME', default: 'NULL' },
    { name: 'ultimo_cambio_password', type: 'DATETIME', default: 'NULL' },
    { name: 'requiere_cambio_password', type: 'INTEGER', default: '0' },
  ];

  // Agregar cada columna si no existe
  for (const col of columnsToAdd) {
    if (!columnNames.includes(col.name)) {
      const sql = `ALTER TABLE usuarios ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}`;
      console.log(`➕ Agregando columna: ${col.name} (${col.type})`);
      db.prepare(sql).run();
      console.log(`   ✅ Columna ${col.name} agregada exitosamente`);
    } else {
      console.log(`   ⏭️  Columna ${col.name} ya existe`);
    }
  }

  console.log('\n✅ Todas las columnas han sido verificadas y agregadas\n');

  // Verificar resultado final
  const finalColumns = db.prepare('PRAGMA table_info(usuarios)').all();
  console.log('📋 Columnas finales (' + finalColumns.length + ' total):');
  console.log('   ' + finalColumns.map((c) => c.name).join(', '));
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  db.close();
}

console.log('\n✅ Proceso completado exitosamente');
