const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

const CONFIG_FILE = path.join(__dirname, 'data', 'config_negocios.json');
const DATA_DIR = path.join(__dirname, 'data');

console.log('=== Diagnóstico completo del módulo de compras ===\n');

// 1. Verificar configuración de negocios
console.log('1. Verificando configuración de negocios...');
if (fs.existsSync(CONFIG_FILE)) {
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  console.log(
    '   Negocios configurados:',
    config.negocios?.map((n) => n.id).join(', ') || 'ninguno'
  );
  console.log('   Negocio actual:', config.negocio_actual);
} else {
  console.log('   ❌ No existe config_negocios.json');
}

// 2. Verificar BD principal
console.log('\n2. Verificando base de datos principal (gestor_tienda.db)...');
const mainDbPath = path.join(DATA_DIR, 'gestor_tienda.db');
if (fs.existsSync(mainDbPath)) {
  const db = new Database(mainDbPath);

  // Verificar tabla compras
  const hasCompras = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='compras'")
    .get();
  console.log('   Tabla compras:', hasCompras ? '✅ existe' : '❌ NO existe');

  if (hasCompras) {
    const comprasCount = db.prepare('SELECT COUNT(*) as count FROM compras').get();
    console.log('   Registros en compras:', comprasCount.count);

    // Verificar columnas
    const cols = db
      .prepare('PRAGMA table_info(compras)')
      .all()
      .map((c) => c.name);
    console.log('   Columnas:', cols.join(', '));
  }

  // Verificar tabla compras_detalle
  const hasDetalle = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='compras_detalle'")
    .get();
  console.log('   Tabla compras_detalle:', hasDetalle ? '✅ existe' : '❌ NO existe');

  if (hasDetalle) {
    const detalleCount = db.prepare('SELECT COUNT(*) as count FROM compras_detalle').get();
    console.log('   Registros en compras_detalle:', detalleCount.count);

    // Verificar columnas
    const cols = db
      .prepare('PRAGMA table_info(compras_detalle)')
      .all()
      .map((c) => c.name);
    console.log('   Columnas:', cols.join(', '));
  }

  db.close();
} else {
  console.log('   ❌ No existe la base de datos principal');
}

// 3. Verificar BD del tenant super_admin si existe
console.log('\n3. Verificando base de datos del negocio super_admin...');
const tenantDbPath = path.join(DATA_DIR, 'negocio_super_admin.db');
if (fs.existsSync(tenantDbPath)) {
  const db = new Database(tenantDbPath);

  const hasCompras = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='compras'")
    .get();
  console.log('   Tabla compras:', hasCompras ? '✅ existe' : '❌ NO existe');

  if (hasCompras) {
    const comprasCount = db.prepare('SELECT COUNT(*) as count FROM compras').get();
    console.log('   Registros en compras:', comprasCount.count);
  }

  const hasDetalle = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='compras_detalle'")
    .get();
  console.log('   Tabla compras_detalle:', hasDetalle ? '✅ existe' : '❌ NO existe');

  db.close();
} else {
  console.log('   No existe base de datos separada para super_admin');
}

// 4. Listar todas las bases de datos .db en el directorio data
console.log('\n4. Bases de datos en el directorio data:');
const dbFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.db'));
dbFiles.forEach((f) => {
  const stats = fs.statSync(path.join(DATA_DIR, f));
  console.log(`   ${f} (${(stats.size / 1024).toFixed(2)} KB)`);
});

// 5. Simular la lógica del endpoint de compras
console.log('\n5. Simulando lógica del endpoint /api/compras...');
try {
  const configNegocios = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  const negocioId = 'super_admin';
  const negocio = configNegocios.negocios.find((n) => n.id === negocioId);

  if (!negocio) {
    console.log('   ❌ Negocio super_admin no encontrado en configuración');
  } else {
    console.log('   ✅ Negocio super_admin encontrado');
    console.log('   Archivo BD:', negocio.db_file);

    const dbPath = path.join(DATA_DIR, negocio.db_file);
    if (!fs.existsSync(dbPath)) {
      console.log('   ❌ El archivo de base de datos no existe:', dbPath);
    } else {
      console.log('   ✅ El archivo de base de datos existe');

      const db = new Database(dbPath);

      // Probar la consulta exacta del endpoint
      try {
        const query =
          'SELECT * FROM compras WHERE negocio_id = ? OR negocio_id IS NULL ORDER BY fecha DESC';
        const rows = db.prepare(query).all(negocioId);
        console.log('   ✅ Consulta SELECT compras exitosa. Registros:', rows.length);

        if (rows.length > 0) {
          // Probar consulta de detalles
          const ids = rows.map((r) => r.id);
          const placeholders = ids.map(() => '?').join(', ');
          const detalleQuery = `SELECT * FROM compras_detalle WHERE compra_id IN (${placeholders})`;
          const detalles = db.prepare(detalleQuery).all(...ids);
          console.log('   ✅ Consulta SELECT compras_detalle exitosa. Registros:', detalles.length);
        }
      } catch (e) {
        console.log('   ❌ Error en consulta:', e.message);
      }

      db.close();
    }
  }
} catch (e) {
  console.log('   ❌ Error:', e.message);
}

console.log('\n=== Diagnóstico completado ===');
