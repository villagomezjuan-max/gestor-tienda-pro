/**
 * SCRIPT DE VERIFICACIÓN DE DATOS - SUPER_ADMIN
 * Verifica que los datos de prueba se insertaron correctamente
 */

const path = require('path');

const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'super_admin.db');

function verificarDatos() {
  console.log('🔍 Verificando datos en SUPER_ADMIN...\n');

  const db = new Database(DB_PATH, { readonly: true });

  try {
    // Verificar proveedor
    const proveedores = db.prepare(`SELECT * FROM proveedores WHERE nombre LIKE '%RM Auto%'`).all();
    console.log('📦 PROVEEDORES RM Auto Repuestos:', proveedores.length);
    if (proveedores.length > 0) {
      console.log(`   → ${proveedores[0].nombre} (${proveedores[0].telefono})\n`);
    }

    // Verificar categoría
    const categorias = db.prepare(`SELECT * FROM categorias WHERE nombre LIKE '%Repuestos%'`).all();
    console.log('📁 CATEGORÍAS Repuestos:', categorias.length);
    if (categorias.length > 0) {
      console.log(`   → ${categorias[0].nombre}\n`);
    }

    // Verificar productos
    const productos = db
      .prepare(
        `SELECT * FROM productos WHERE proveedor_id IN (SELECT id FROM proveedores WHERE nombre LIKE '%RM Auto%')`
      )
      .all();
    console.log('🔧 PRODUCTOS de RM Auto Repuestos:', productos.length);
    if (productos.length > 0) {
      productos.slice(0, 5).forEach((prod, idx) => {
        console.log(`   ${idx + 1}. ${prod.nombre} - Stock: ${prod.stock} - $${prod.precio_venta}`);
      });
      if (productos.length > 5) {
        console.log(`   ... y ${productos.length - 5} productos más`);
      }
      console.log();
    }

    // Verificar clientes
    const clientes = db.prepare('SELECT * FROM clientes ORDER BY created_at DESC LIMIT 10').all();
    console.log('👥 CLIENTES (últimos registrados):', clientes.length);
    clientes.forEach((cliente, idx) => {
      console.log(`   ${idx + 1}. ${cliente.nombre} - ${cliente.cedula} - ${cliente.telefono}`);
    });
    console.log();

    // Verificar vehículos
    const vehiculos = db
      .prepare(
        `
      SELECT v.*, c.nombre as cliente_nombre 
      FROM vehiculos v 
      JOIN clientes c ON v.cliente_id = c.id 
      ORDER BY v.created_at DESC LIMIT 10
    `
      )
      .all();
    console.log('🚗 VEHÍCULOS (últimos registrados):', vehiculos.length);
    vehiculos.forEach((vehiculo, idx) => {
      console.log(
        `   ${idx + 1}. ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio} (${vehiculo.placa}) - ${vehiculo.cliente_nombre}`
      );
    });
    console.log();

    // Verificar compras
    const compras = db
      .prepare(`SELECT * FROM compras WHERE proveedor_nombre LIKE '%RM Auto%'`)
      .all();
    console.log('🧾 COMPRAS de RM Auto Repuestos:', compras.length);
    if (compras.length > 0) {
      compras.forEach((compra, idx) => {
        console.log(
          `   ${idx + 1}. ${compra.numero} - Fecha: ${compra.fecha} - Total: $${compra.total}`
        );
      });
      console.log();

      // Verificar detalles de la última compra
      const ultimaCompra = compras[compras.length - 1];
      const detalles = db
        .prepare('SELECT * FROM compras_detalle WHERE compra_id = ?')
        .all(ultimaCompra.id);
      console.log(`   📋 Detalles de compra ${ultimaCompra.numero}:`, detalles.length, 'items');
      detalles.slice(0, 5).forEach((det, idx) => {
        console.log(
          `      ${idx + 1}. ${det.producto_nombre} - Cant: ${det.cantidad} x $${det.precio_unitario} = $${det.total}`
        );
      });
      if (detalles.length > 5) {
        console.log(`      ... y ${detalles.length - 5} items más`);
      }
      console.log();
    }

    // Resumen general
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RESUMEN GENERAL DE LA BASE DE DATOS');
    console.log('═══════════════════════════════════════════════════════');

    const stats = {
      proveedores: db.prepare('SELECT COUNT(*) as count FROM proveedores WHERE activo = 1').get()
        .count,
      categorias: db.prepare('SELECT COUNT(*) as count FROM categorias').get().count,
      productos: db.prepare('SELECT COUNT(*) as count FROM productos WHERE activo = 1').get().count,
      clientes: db.prepare('SELECT COUNT(*) as count FROM clientes WHERE activo = 1').get().count,
      vehiculos: db.prepare('SELECT COUNT(*) as count FROM vehiculos').get().count,
      compras: db.prepare('SELECT COUNT(*) as count FROM compras').get().count,
      ventas: db.prepare('SELECT COUNT(*) as count FROM ventas').get().count,
    };

    console.log(`📦 Proveedores activos: ${stats.proveedores}`);
    console.log(`📁 Categorías: ${stats.categorias}`);
    console.log(`🔧 Productos activos: ${stats.productos}`);
    console.log(`👥 Clientes activos: ${stats.clientes}`);
    console.log(`🚗 Vehículos registrados: ${stats.vehiculos}`);
    console.log(`🧾 Compras registradas: ${stats.compras}`);
    console.log(`💰 Ventas registradas: ${stats.ventas}`);
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('✅ Verificación completada exitosamente\n');

    db.close();
  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
    console.error(error);
    db.close();
    process.exit(1);
  }
}

// Ejecutar
verificarDatos();
