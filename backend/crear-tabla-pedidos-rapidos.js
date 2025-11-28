#!/usr/bin/env node
/**
 * Migración: Crear tabla pedidos_rapidos
 * Esta tabla almacena plantillas de pedidos frecuentes para agilizar compras
 */

const path = require('path');

const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data', 'gestor_tienda.db');

console.log('📦 Creando tabla pedidos_rapidos...');
console.log(`📂 Base de datos: ${dbPath}\n`);

try {
  const db = new Database(dbPath);

  // Crear tabla pedidos_rapidos
  db.exec(`
    CREATE TABLE IF NOT EXISTS pedidos_rapidos (
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

  console.log('✅ Tabla pedidos_rapidos creada exitosamente');

  // Verificar que la tabla existe y tiene las columnas correctas
  const tableInfo = db.prepare('PRAGMA table_info(pedidos_rapidos)').all();
  const columns = tableInfo.map((c) => c.name);

  console.log('📋 Columnas creadas:', columns.join(', '));

  // Crear índices solo si las columnas existen
  if (columns.includes('negocio_id')) {
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_pedidos_rapidos_negocio ON pedidos_rapidos(negocio_id)`
    );
    console.log('✅ Índice idx_pedidos_rapidos_negocio creado');
  }

  if (columns.includes('proveedor_id')) {
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_pedidos_rapidos_proveedor ON pedidos_rapidos(proveedor_id)`
    );
    console.log('✅ Índice idx_pedidos_rapidos_proveedor creado');
  }

  if (columns.includes('activo')) {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_pedidos_rapidos_activo ON pedidos_rapidos(activo)`);
    console.log('✅ Índice idx_pedidos_rapidos_activo creado');
  }

  // Verificar estructura
  const columnsDetail = db.prepare('PRAGMA table_info(pedidos_rapidos)').all();
  console.log('\n📋 Estructura de la tabla:');
  console.table(
    columnsDetail.map((c) => ({
      Columna: c.name,
      Tipo: c.type,
      'Permite NULL': c.notnull ? 'NO' : 'SÍ',
      'Valor por defecto': c.dflt_value || '—',
    }))
  );

  // Contar registros
  const count = db.prepare('SELECT COUNT(*) as total FROM pedidos_rapidos').get();
  console.log(`\n📊 Total de registros: ${count.total}`);

  db.close();
  console.log('\n✅ Migración completada exitosamente');
} catch (error) {
  console.error('❌ Error en la migración:', error);
  process.exit(1);
}
