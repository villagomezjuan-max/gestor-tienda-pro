/**
 * Script para habilitar permisos de IA en todos los negocios
 * Ejecutar: node backend/habilitar-permisos-ia.js
 */

const path = require('path');

const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data', 'gestor_tienda.db');

const IA_FEATURES = ['facturas', 'assistant', 'marketing'];

try {
  console.log('🔧 Habilitando permisos de IA para todos los negocios...\n');

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  // Obtener todos los negocios activos
  const negocios = db
    .prepare(
      `
    SELECT id, nombre
    FROM negocios
    WHERE estado = 'activo'
  `
    )
    .all();

  if (!negocios.length) {
    console.log('⚠️  No se encontraron negocios activos.');
    db.close();
    process.exit(0);
  }

  console.log(`📋 Encontrados ${negocios.length} negocios activos:\n`);

  const tx = db.transaction(() => {
    negocios.forEach((negocio) => {
      console.log(`  - ${negocio.nombre} (${negocio.id})`);

      IA_FEATURES.forEach((feature) => {
        const exists = db
          .prepare(
            `
          SELECT 1 FROM ia_feature_permissions
          WHERE negocio_id = ? AND feature = ?
        `
          )
          .get(negocio.id, feature);

        if (exists) {
          // Actualizar a habilitado
          db.prepare(
            `
            UPDATE ia_feature_permissions
            SET enabled = 1,
                updated_at = datetime('now')
            WHERE negocio_id = ? AND feature = ?
          `
          ).run(negocio.id, feature);
          console.log(`    ✓ ${feature}: actualizado a habilitado`);
        } else {
          // Insertar nuevo permiso habilitado
          db.prepare(
            `
            INSERT INTO ia_feature_permissions (negocio_id, feature, enabled, updated_at)
            VALUES (?, ?, 1, datetime('now'))
          `
          ).run(negocio.id, feature);
          console.log(`    ✓ ${feature}: creado y habilitado`);
        }
      });

      console.log('');
    });
  });

  tx();

  // Verificar resultados
  console.log('\n📊 Resumen de permisos habilitados:\n');

  const summary = db
    .prepare(
      `
    SELECT negocio_id, feature, enabled
    FROM ia_feature_permissions
    ORDER BY negocio_id, feature
  `
    )
    .all();

  const grouped = summary.reduce((acc, row) => {
    if (!acc[row.negocio_id]) {
      acc[row.negocio_id] = [];
    }
    acc[row.negocio_id].push({
      feature: row.feature,
      enabled: row.enabled === 1,
    });
    return acc;
  }, {});

  Object.entries(grouped).forEach(([negocioId, features]) => {
    const negocio = negocios.find((n) => n.id === negocioId);
    console.log(`${negocio?.nombre || negocioId}:`);
    features.forEach((f) => {
      const status = f.enabled ? '✅' : '❌';
      console.log(`  ${status} ${f.feature}`);
    });
    console.log('');
  });

  db.close();
  console.log('✅ Permisos de IA habilitados correctamente para todos los negocios.\n');
} catch (error) {
  console.error('❌ Error habilitando permisos de IA:', error);
  process.exit(1);
}
