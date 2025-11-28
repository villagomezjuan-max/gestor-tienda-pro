const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'data', 'gestor_tienda.db');
if (!fs.existsSync(dbPath)) {
  console.error('Base de datos no encontrada en', dbPath);
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

function getColumns(table) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all();
  return info.map((col) => col.name);
}

function hasColumn(table, column) {
  return getColumns(table).includes(column);
}

function checkUnique(table, column) {
  if (!hasColumn(table, column)) return null;
  const { total, uniqueCount } = db
    .prepare(`SELECT COUNT(*) AS total, COUNT(DISTINCT ${column}) AS uniqueCount FROM ${table}`)
    .get();
  return total === uniqueCount
    ? null
    : { table, column, total, uniqueCount, duplicates: total - uniqueCount };
}

function checkMissingReferences(child, column, parent, parentColumn = 'id') {
  if (!hasColumn(child, column)) return null;
  if (!hasColumn(parent, parentColumn)) return null;
  const rows = db
    .prepare(
      `
    SELECT DISTINCT ${column} AS value
    FROM ${child}
    WHERE ${column} IS NOT NULL AND ${column} NOT IN (SELECT ${parentColumn} FROM ${parent})
    LIMIT 5
  `
    )
    .all();
  if (rows.length === 0) return null;
  const count = db
    .prepare(
      `SELECT COUNT(*) AS c FROM ${child} WHERE ${column} IS NOT NULL AND ${column} NOT IN (SELECT ${parentColumn} FROM ${parent})`
    )
    .get().c;
  return {
    child,
    column,
    parent,
    parentColumn,
    missingCount: count,
    sample: rows.map((r) => r.value),
  };
}

function runChecks() {
  const uniqueCandidates = [
    { table: 'negocios', column: 'id' },
    { table: 'productos', column: 'id' },
    { table: 'ventas', column: 'id' },
    { table: 'usuarios', column: 'id' },
    { table: 'clientes', column: 'id' },
  ];

  const relationships = [
    { child: 'productos', column: 'negocio_id', parent: 'negocios' },
    { child: 'productos', column: 'proveedor_id', parent: 'proveedores' },
    { child: 'ventas', column: 'negocio_id', parent: 'negocios' },
    { child: 'ventas_detalle', column: 'venta_id', parent: 'ventas' },
    { child: 'ventas_detalle', column: 'producto_id', parent: 'productos' },
    { child: 'clientes', column: 'negocio_id', parent: 'negocios' },
    { child: 'pedidos_rapidos', column: 'negocio_id', parent: 'negocios' },
    { child: 'recordatorios', column: 'negocio_id', parent: 'negocios' },
    { child: 'ordenes_trabajo', column: 'negocio_id', parent: 'negocios' },
    { child: 'ordenes_trabajo_servicios', column: 'orden_trabajo_id', parent: 'ordenes_trabajo' },
  ];

  const duplicates = uniqueCandidates
    .map(({ table, column }) => checkUnique(table, column))
    .filter(Boolean);

  const missingRefs = relationships
    .map(({ child, column, parent, parentColumn }) =>
      checkMissingReferences(child, column, parent, parentColumn)
    )
    .filter(Boolean);

  return { duplicates, missingRefs };
}

const report = runChecks();

console.log('\n=== Auditoría de duplicados y referencias ===');
if (report.duplicates.length === 0) {
  console.log('✅ No se detectaron duplicados en claves únicas comprobadas.');
} else {
  console.log('⚠️ Duplicados detectados:');
  report.duplicates.forEach((item) => {
    console.log(
      `- ${item.table}.${item.column}: ${item.duplicates} filas duplicadas (total ${item.total}, únicos ${item.uniqueCount})`
    );
  });
}

if (report.missingRefs.length === 0) {
  console.log('✅ Todas las referencias comprobadas tienen padres válidos.');
} else {
  console.log('⚠️ Referencias huérfanas detectadas:');
  report.missingRefs.forEach((item) => {
    console.log(
      `- ${item.child}.${item.column} referencia ${item.parent}.${item.parentColumn} faltante (${item.missingCount} filas). Ejemplos: ${item.sample.join(', ')}`
    );
  });
}

db.close();
