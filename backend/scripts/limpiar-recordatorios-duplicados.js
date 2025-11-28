/**
 * Script para limpiar recordatorios duplicados
 * Este script elimina recordatorios duplicados basándose en vehiculo_id, servicio_tipo y fecha
 */

const path = require('path');

const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'data', 'gestor_tienda.db');
const db = new Database(dbPath);

console.log('🧹 Iniciando limpieza de recordatorios duplicados...');
console.log(`📁 Base de datos: ${dbPath}\n`);

try {
  // Iniciar transacción
  db.exec('BEGIN TRANSACTION');

  // Obtener todos los recordatorios duplicados (basándose en vehiculo_id, titulo y fecha)
  const duplicados = db
    .prepare(
      `
    SELECT 
      vehiculo_id, 
      titulo,
      DATE(fecha) as fecha_dia,
      COUNT(*) as cantidad,
      GROUP_CONCAT(id) as ids,
      MIN(created_at) as primera_creacion
    FROM recordatorios
    WHERE completado = 0
    AND vehiculo_id IS NOT NULL
    GROUP BY vehiculo_id, titulo, DATE(fecha)
    HAVING COUNT(*) > 1
  `
    )
    .all();

  console.log(`📊 Encontrados ${duplicados.length} grupos de recordatorios duplicados\n`);

  let totalEliminados = 0;

  // Para cada grupo de duplicados, mantener solo el más antiguo
  for (const grupo of duplicados) {
    const ids = grupo.ids.split(',');
    console.log(`🔍 Procesando grupo: ${grupo.vehiculo_id} - ${grupo.titulo} - ${grupo.fecha_dia}`);
    console.log(`   Cantidad de duplicados: ${grupo.cantidad}`);
    console.log(`   IDs: ${ids.slice(0, 3).join(', ')}${ids.length > 3 ? '...' : ''}`);

    // Obtener el ID más antiguo basándose en created_at
    const recordatoriosOrdenados = db
      .prepare(
        `
      SELECT id FROM recordatorios 
      WHERE id IN (${ids.map(() => '?').join(',')})
      ORDER BY created_at ASC
    `
      )
      .all(...ids);

    const idMasAntiguo = recordatoriosOrdenados[0].id;
    const idsAEliminar = ids.filter((id) => id !== idMasAntiguo);

    for (const id of idsAEliminar) {
      const result = db.prepare('DELETE FROM recordatorios WHERE id = ?').run(id);
      if (result.changes > 0) {
        totalEliminados++;
      }
    }

    console.log(`   ✅ Mantenido: ${idMasAntiguo}`);
    console.log(`   ❌ Eliminados: ${idsAEliminar.length}\n`);
  }

  // Confirmar transacción
  db.exec('COMMIT');

  console.log('\n✨ Limpieza completada exitosamente!');
  console.log(`📊 Total de recordatorios eliminados: ${totalEliminados}`);
  console.log(`📊 Grupos procesados: ${duplicados.length}`);

  // Mostrar estadísticas finales
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

  console.log('\n📈 Estadísticas actuales:');
  console.log(`   Total de recordatorios: ${stats.total}`);
  console.log(`   Pendientes: ${stats.pendientes}`);
  console.log(`   Completados: ${stats.completados}`);
} catch (error) {
  // Revertir en caso de error
  db.exec('ROLLBACK');
  console.error('\n❌ Error durante la limpieza:', error);
  process.exit(1);
} finally {
  db.close();
}

console.log('\n✅ Base de datos cerrada correctamente');
