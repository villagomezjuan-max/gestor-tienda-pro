const Database = require('better-sqlite3');

const dbFiles = ['gestor_tienda.db', 'mecanica.db'];

dbFiles.forEach((dbFile) => {
  try {
    console.log(`\n📁 ${dbFile}:`);
    const db = new Database(`data/${dbFile}`);

    const tables = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('usuarios', 'usuarios_negocios', 'negocios')
    `
      )
      .all();

    if (tables.length > 0) {
      console.log(`  ✅ Tablas: ${tables.map((t) => t.name).join(', ')}`);

      // Verificar usuarios
      if (tables.some((t) => t.name === 'usuarios')) {
        const count = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
        console.log(`  👤 Usuarios: ${count.count}`);
      }
    } else {
      console.log('  ❌ No tiene tablas multi-tenant');
    }

    db.close();
  } catch (e) {
    console.log(`  ❌ ERROR: ${e.message}`);
  }
});
