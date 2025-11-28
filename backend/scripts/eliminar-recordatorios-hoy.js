const path = require('path');

const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'data', 'gestor_tienda.db');
const db = new Database(dbPath);

console.log('🗑️  Eliminando recordatorios pendientes creados hoy...\n');

try {
  const result = db
    .prepare(
      `
    DELETE FROM recordatorios 
    WHERE completado = 0 
    AND DATE(created_at) = DATE('now', 'localtime')
  `
    )
    .run();

  console.log(`✅ Eliminados ${result.changes} recordatorios pendientes creados hoy`);

  const stats = db
    .prepare(
      `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN completado = 0 THEN 1 ELSE 0 END) as pendientes,
      SUM(CASE WHEN completado = 1 THEN 1 ELSE 0 END) as completados
    FROM recordatorios
  `
    )
    .get();

  console.log('\n📈 Estadísticas finales:');
  console.log(`   Total: ${stats.total}`);
  console.log(`   Pendientes: ${stats.pendientes}`);
  console.log(`   Completados: ${stats.completados}`);
} catch (error) {
  console.error('❌ Error:', error);
} finally {
  db.close();
  console.log('\n✅ Base de datos cerrada');
}
