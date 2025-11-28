#!/usr/bin/env node
/**
 * Script: Recrear tabla pedidos_rapidos con estructura correcta
 */

const path = require('path');

const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data', 'gestor_tienda.db');

console.log('🔄 Recreando tabla pedidos_rapidos...');

try {
  const db = new Database(dbPath);

  // Eliminar tabla existente
  db.exec('DROP TABLE IF EXISTS pedidos_rapidos');
  console.log('🗑️  Tabla anterior eliminada');

  // Crear tabla con estructura correcta
  db.exec(`
    CREATE TABLE pedidos_rapidos (
      id TEXT PRIMARY KEY,
      negocio_id TEXT NOT NULL,
      nombre TEXT NOT NULL,
      proveedor_id TEXT,
      proveedor_nombre TEXT,
      productos TEXT NOT NULL,
      notas TEXT,
      veces_usado INTEGER DEFAULT 0,
      ultimo_uso TEXT,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  console.log('✅ Tabla pedidos_rapidos creada con estructura correcta');

  // Crear índices
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pedidos_rapidos_negocio 
    ON pedidos_rapidos(negocio_id);
    
    CREATE INDEX IF NOT EXISTS idx_pedidos_rapidos_activo 
    ON pedidos_rapidos(activo);
  `);

  console.log('✅ Índices creados');

  // Verificar estructura
  const columns = db.prepare('PRAGMA table_info(pedidos_rapidos)').all();
  console.log('\n📋 Estructura final:');
  console.table(
    columns.map((c) => ({
      Columna: c.name,
      Tipo: c.type,
      'No Null': c.notnull ? 'Sí' : 'No',
      Default: c.dflt_value || '—',
    }))
  );

  db.close();
  console.log('\n✅ Migración completada exitosamente');
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
