const Database = require('better-sqlite3');
const db = new Database('./data/super_admin.db', { readonly: true });

console.log('=== RESUMEN SUPER_ADMIN ===\n');

const stats = {
  proveedores: db.prepare('SELECT COUNT(*) as total FROM proveedores').get().total,
  productos: db.prepare('SELECT COUNT(*) as total FROM productos').get().total,
  clientes: db.prepare('SELECT COUNT(*) as total FROM clientes').get().total,
  vehiculos: db.prepare('SELECT COUNT(*) as total FROM vehiculos').get().total,
  compras: db.prepare('SELECT COUNT(*) as total FROM compras').get().total,
  detalles: db.prepare('SELECT COUNT(*) as total FROM compras_detalle').get().total,
};

console.log('Proveedores:', stats.proveedores);
console.log('Productos:', stats.productos);
console.log('Clientes:', stats.clientes);
console.log('Vehículos:', stats.vehiculos);
console.log('Compras:', stats.compras);
console.log('Detalles compra:', stats.detalles);

console.log('\n--- Últimos 3 clientes ---');
const clientes = db
  .prepare('SELECT nombre, telefono FROM clientes ORDER BY ROWID DESC LIMIT 3')
  .all();
clientes.forEach((c) => console.log(`- ${c.nombre} (${c.telefono})`));

console.log('\n--- Stock de productos (primeros 5) ---');
const productos = db.prepare('SELECT codigo, nombre, stock FROM productos LIMIT 5').all();
productos.forEach((p) => console.log(`- ${p.codigo}: ${p.nombre} (Stock: ${p.stock})`));

console.log('\n--- Vehículos registrados ---');
const vehiculos = db
  .prepare(
    `
    SELECT v.placa, v.marca, v.modelo, v.anio, c.nombre as cliente
    FROM vehiculos v
    JOIN clientes c ON v.cliente_id = c.id
    LIMIT 5
`
  )
  .all();
vehiculos.forEach((v) =>
  console.log(`- ${v.placa}: ${v.marca} ${v.modelo} ${v.anio} (${v.cliente})`)
);

db.close();
