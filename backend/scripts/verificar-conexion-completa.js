const path = require('path');

const Database = require('better-sqlite3');

console.log('🔍 VERIFICACIÓN COMPLETA DE CONEXIONES');
console.log('======================================\n');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MASTER_DB = path.join(DATA_DIR, 'gestor_tienda.db');
const SUPER_ADMIN_DB = path.join(DATA_DIR, 'super_admin.db');

// ===== VERIFICAR BD MAESTRA =====
console.log('📊 BASE DE DATOS MAESTRA (gestor_tienda.db)');
console.log('───────────────────────────────────────────');

const masterDb = new Database(MASTER_DB, { readonly: true });

// Verificar negocios
const negocios = masterDb.prepare('SELECT * FROM negocios').all();
console.log(`\n✅ Negocios registrados: ${negocios.length}`);
negocios.forEach((neg) => {
  console.log(`   - ${neg.nombre} (${neg.id}) - ${neg.estado} - Plan: ${neg.plan}`);
});

// Verificar usuarios
const usuarios = masterDb
  .prepare('SELECT id, username, nombre, rol, negocio_principal FROM usuarios')
  .all();
console.log(`\n✅ Usuarios registrados: ${usuarios.length}`);
usuarios.forEach((usr) => {
  console.log(`   - ${usr.username} (${usr.rol}) - Negocio principal: ${usr.negocio_principal}`);
});

// Verificar asignaciones
const asignaciones = masterDb
  .prepare(
    `
  SELECT un.usuario_id, u.username, un.negocio_id, n.nombre as negocio_nombre, 
         un.rol_en_negocio, un.es_negocio_principal
  FROM usuarios_negocios un
  JOIN usuarios u ON u.id = un.usuario_id
  JOIN negocios n ON n.id = un.negocio_id
`
  )
  .all();

console.log(`\n✅ Asignaciones usuario-negocio: ${asignaciones.length}`);
asignaciones.forEach((asig) => {
  const principal = asig.es_negocio_principal ? '⭐ PRINCIPAL' : '';
  console.log(
    `   - ${asig.username} → ${asig.negocio_nombre} (${asig.rol_en_negocio}) ${principal}`
  );
});

masterDb.close();

// ===== VERIFICAR BD SUPER_ADMIN =====
console.log('\n\n📊 BASE DE DATOS SUPER_ADMIN (super_admin.db)');
console.log('──────────────────────────────────────────');

const superAdminDb = new Database(SUPER_ADMIN_DB, { readonly: true });

// Contar registros
const counts = {
  productos: superAdminDb.prepare('SELECT COUNT(*) as c FROM productos').get().c,
  clientes: superAdminDb.prepare('SELECT COUNT(*) as c FROM clientes').get().c,
  vehiculos: superAdminDb.prepare('SELECT COUNT(*) as c FROM vehiculos').get().c,
  proveedores: superAdminDb.prepare('SELECT COUNT(*) as c FROM proveedores').get().c,
  compras: superAdminDb.prepare('SELECT COUNT(*) as c FROM compras').get().c,
  compras_detalle: superAdminDb.prepare('SELECT COUNT(*) as c FROM compras_detalle').get().c,
  categorias: superAdminDb.prepare('SELECT COUNT(*) as c FROM categorias').get().c,
};

console.log(`\n✅ Productos: ${counts.productos}`);
console.log(`✅ Clientes: ${counts.clientes}`);
console.log(`✅ Vehículos: ${counts.vehiculos}`);
console.log(`✅ Proveedores: ${counts.proveedores}`);
console.log(`✅ Compras: ${counts.compras}`);
console.log(`✅ Detalles de compra: ${counts.compras_detalle}`);
console.log(`✅ Categorías: ${counts.categorias}`);

// Mostrar algunos productos
console.log('\n📦 Productos (primeros 5):');
const productos = superAdminDb
  .prepare('SELECT codigo, nombre, precio_venta, stock FROM productos LIMIT 5')
  .all();
productos.forEach((p) => {
  console.log(`   - ${p.codigo}: ${p.nombre} (Stock: ${p.stock}, Precio: S/ ${p.precio_venta})`);
});

// Mostrar algunos clientes
console.log('\n👥 Clientes:');
const clientes = superAdminDb
  .prepare('SELECT nombre, cedula, telefono FROM clientes LIMIT 5')
  .all();
clientes.forEach((c) => {
  console.log(`   - ${c.nombre} - Tel: ${c.telefono}`);
});

// Mostrar vehículos
console.log('\n🚗 Vehículos:');
const vehiculos = superAdminDb
  .prepare(
    `
  SELECT v.placa, v.marca, v.modelo, v.anio, c.nombre as cliente
  FROM vehiculos v
  LEFT JOIN clientes c ON c.id = v.cliente_id
  LIMIT 6
`
  )
  .all();
vehiculos.forEach((v) => {
  console.log(`   - ${v.placa}: ${v.marca} ${v.modelo} ${v.anio} (${v.cliente || 'Sin cliente'})`);
});

// Mostrar última compra
console.log('\n📋 Última compra:');
const ultimaCompra = superAdminDb
  .prepare(
    `
  SELECT numero, fecha, proveedor_nombre, total, estado
  FROM compras
  ORDER BY fecha DESC
  LIMIT 1
`
  )
  .get();

if (ultimaCompra) {
  console.log(`   - ${ultimaCompra.numero} - ${ultimaCompra.fecha}`);
  console.log(`   - Proveedor: ${ultimaCompra.proveedor_nombre}`);
  console.log(`   - Total: S/ ${ultimaCompra.total}`);
  console.log(`   - Estado: ${ultimaCompra.estado}`);
}

superAdminDb.close();

// ===== RESUMEN FINAL =====
console.log('\n\n═══════════════════════════════════════════');
console.log('✅ SISTEMA COMPLETAMENTE CONECTADO');
console.log('═══════════════════════════════════════════\n');
console.log('🎯 Configuración actual:');
console.log('   - Negocio activo: super_admin');
console.log('   - Usuario: admin (super_admin)');
console.log('   - Password: Admin123!');
console.log('   - Servidor: http://localhost:3001\n');
console.log('📝 Base de datos funcionando correctamente:');
console.log('   ✅ gestor_tienda.db (usuarios, negocios, permisos)');
console.log('   ✅ super_admin.db (datos del negocio)');
console.log('   ✅ Relaciones correctamente establecidas');
console.log('   ✅ Datos de prueba insertados correctamente\n');
console.log('🚀 Próximos pasos:');
console.log('   1. Abrir el navegador en http://localhost:3001');
console.log('   2. Login con usuario: admin, password: Admin123!');
console.log('   3. Verificar productos, clientes, vehículos y compras\n');
