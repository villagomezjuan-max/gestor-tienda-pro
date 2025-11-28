/**
 * SCRIPT SIMPLE DE DATOS DE PRUEBA PARA SUPER_ADMIN
 * Agrega: 8 clientes con carros, 15 productos, 1 proveedor, 1 compra
 */

const crypto = require('crypto');
const path = require('path');

const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'super_admin.db');

function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

function getCurrentDateTime() {
  return new Date().toISOString();
}

function seedDatosPrueba() {
  console.log('🚀 Agregando datos de prueba a SUPER_ADMIN...\n');

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  try {
    const timestamp = Date.now();

    // 1. PROVEEDOR SIMPLE
    console.log('📦 Creando proveedor de prueba...');
    const proveedorId = generateId();
    db.prepare(
      `
      INSERT INTO proveedores (id, nombre, contacto, telefono, email, direccion, notas, activo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      proveedorId,
      'Repuestos Automotriz RM',
      'Roberto Martínez',
      '099-765-4321',
      'ventas@repuestosrm.com',
      'Santo Domingo, Ecuador',
      'Proveedor de repuestos - Datos de prueba',
      1,
      getCurrentDateTime(),
      getCurrentDateTime()
    );
    console.log('✅ Proveedor creado\n');

    // 2. CATEGORÍA
    console.log('📁 Verificando categoría...');
    let categoriaId = db
      .prepare(`SELECT id FROM categorias WHERE nombre = 'Repuestos Automotrices'`)
      .get()?.id;
    if (!categoriaId) {
      categoriaId = generateId();
      db.prepare(
        `
        INSERT INTO categorias (id, nombre, descripcion, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `
      ).run(
        categoriaId,
        'Repuestos Automotrices',
        'Repuestos y accesorios',
        getCurrentDateTime(),
        getCurrentDateTime()
      );
    }
    console.log('✅ Categoría lista\n');

    // 3. 15 PRODUCTOS DE PRUEBA
    console.log('🔧 Agregando 15 productos...');
    const productos = [
      {
        codigo: `PRD-${timestamp}-001`,
        nombre: 'Filtro de Aceite Universal',
        precio_compra: 8.5,
        precio_venta: 12.0,
        stock: 45,
      },
      {
        codigo: `PRD-${timestamp}-002`,
        nombre: 'Filtro de Aire K&N',
        precio_compra: 32.0,
        precio_venta: 45.0,
        stock: 20,
      },
      {
        codigo: `PRD-${timestamp}-003`,
        nombre: 'Filtro de Combustible Diesel',
        precio_compra: 15.0,
        precio_venta: 22.0,
        stock: 30,
      },
      {
        codigo: `PRD-${timestamp}-004`,
        nombre: 'Pastillas de Freno Delanteras',
        precio_compra: 45.0,
        precio_venta: 65.0,
        stock: 25,
      },
      {
        codigo: `PRD-${timestamp}-005`,
        nombre: 'Pastillas de Freno Traseras',
        precio_compra: 35.0,
        precio_venta: 52.0,
        stock: 28,
      },
      {
        codigo: `PRD-${timestamp}-006`,
        nombre: 'Discos de Freno Ventilados (Par)',
        precio_compra: 85.0,
        precio_venta: 125.0,
        stock: 12,
      },
      {
        codigo: `PRD-${timestamp}-007`,
        nombre: 'Bujías NGK Iridium Set 4',
        precio_compra: 28.0,
        precio_venta: 42.0,
        stock: 18,
      },
      {
        codigo: `PRD-${timestamp}-008`,
        nombre: 'Aceite Motor Mobil 1 5W-30 4L',
        precio_compra: 42.0,
        precio_venta: 58.0,
        stock: 35,
      },
      {
        codigo: `PRD-${timestamp}-009`,
        nombre: 'Aceite Motor Castrol 5W-40 5L',
        precio_compra: 48.0,
        precio_venta: 68.0,
        stock: 28,
      },
      {
        codigo: `PRD-${timestamp}-010`,
        nombre: 'Kit de Distribución Completo',
        precio_compra: 125.0,
        precio_venta: 180.0,
        stock: 8,
      },
      {
        codigo: `PRD-${timestamp}-011`,
        nombre: 'Amortiguadores Delanteros Par',
        precio_compra: 95.0,
        precio_venta: 140.0,
        stock: 10,
      },
      {
        codigo: `PRD-${timestamp}-012`,
        nombre: 'Batería 12V 60Ah 540A',
        precio_compra: 85.0,
        precio_venta: 120.0,
        stock: 15,
      },
      {
        codigo: `PRD-${timestamp}-013`,
        nombre: 'Kit Embrague Completo',
        precio_compra: 165.0,
        precio_venta: 240.0,
        stock: 6,
      },
      {
        codigo: `PRD-${timestamp}-014`,
        nombre: 'Radiador de Aluminio',
        precio_compra: 135.0,
        precio_venta: 195.0,
        stock: 7,
      },
      {
        codigo: `PRD-${timestamp}-015`,
        nombre: 'Llantas 205/55R16 Set 4',
        precio_compra: 280.0,
        precio_venta: 380.0,
        stock: 16,
      },
    ];

    const insertProducto = db.prepare(`
      INSERT INTO productos (id, codigo, nombre, descripcion, categoria_id, proveedor_id, precio_compra, precio_venta, stock, stock_minimo, activo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const productosIds = [];
    productos.forEach((prod, idx) => {
      const prodId = generateId();
      productosIds.push({ id: prodId, ...prod });
      insertProducto.run(
        prodId,
        prod.codigo,
        prod.nombre,
        `Producto de prueba - ${prod.nombre}`,
        categoriaId,
        proveedorId,
        prod.precio_compra,
        prod.precio_venta,
        prod.stock,
        5,
        1,
        getCurrentDateTime(),
        getCurrentDateTime()
      );
      console.log(`  ✓ ${idx + 1}. ${prod.nombre}`);
    });
    console.log('✅ 15 productos creados\n');

    // 4. 8 CLIENTES CON CARROS
    console.log('👥 Agregando 8 clientes con sus vehículos...');
    const clientes = [
      {
        nombre: 'Carlos Méndez',
        cedula: `1715${timestamp % 100000}1`,
        telefono: '0998765432',
        email: 'carlos.mendez@test.com',
        vehiculo: {
          marca: 'Toyota',
          modelo: 'Corolla',
          anio: 2018,
          placa: `ABC-${timestamp % 1000}1`,
          color: 'Plata',
          km: 85000,
        },
      },
      {
        nombre: 'María Salazar',
        cedula: `1723${timestamp % 100000}2`,
        telefono: '0987654321',
        email: 'maria.salazar@test.com',
        vehiculo: {
          marca: 'Chevrolet',
          modelo: 'Spark',
          anio: 2020,
          placa: `DEF-${timestamp % 1000}2`,
          color: 'Rojo',
          km: 45000,
        },
      },
      {
        nombre: 'Roberto Vega',
        cedula: `1709${timestamp % 100000}3`,
        telefono: '0996543210',
        email: 'roberto.vega@test.com',
        vehiculo: {
          marca: 'Nissan',
          modelo: 'Sentra',
          anio: 2019,
          placa: `GHI-${timestamp % 1000}3`,
          color: 'Negro',
          km: 72000,
        },
      },
      {
        nombre: 'Ana Morales',
        cedula: `1734${timestamp % 100000}4`,
        telefono: '0995432109',
        email: 'ana.morales@test.com',
        vehiculo: {
          marca: 'Honda',
          modelo: 'Civic',
          anio: 2017,
          placa: `JKL-${timestamp % 1000}4`,
          color: 'Azul',
          km: 95000,
        },
      },
      {
        nombre: 'Diego Castillo',
        cedula: `1712${timestamp % 100000}5`,
        telefono: '0994321098',
        email: 'diego.castillo@test.com',
        vehiculo: {
          marca: 'Mazda',
          modelo: 'CX-5',
          anio: 2021,
          placa: `MNO-${timestamp % 1000}5`,
          color: 'Blanco',
          km: 32000,
        },
      },
      {
        nombre: 'Gabriela Ruiz',
        cedula: `1745${timestamp % 100000}6`,
        telefono: '0993210987',
        email: 'gabriela.ruiz@test.com',
        vehiculo: {
          marca: 'Hyundai',
          modelo: 'Tucson',
          anio: 2019,
          placa: `PQR-${timestamp % 1000}6`,
          color: 'Gris',
          km: 68000,
        },
      },
      {
        nombre: 'Luis Sánchez',
        cedula: `1756${timestamp % 100000}7`,
        telefono: '0992109876',
        email: 'luis.sanchez@test.com',
        vehiculo: {
          marca: 'Kia',
          modelo: 'Sportage',
          anio: 2020,
          placa: `STU-${timestamp % 1000}7`,
          color: 'Verde',
          km: 55000,
        },
      },
      {
        nombre: 'Patricia Herrera',
        cedula: `1767${timestamp % 100000}8`,
        telefono: '0991098765',
        email: 'patricia.herrera@test.com',
        vehiculo: {
          marca: 'Volkswagen',
          modelo: 'Jetta',
          anio: 2018,
          placa: `VWX-${timestamp % 1000}8`,
          color: 'Plateado',
          km: 78000,
        },
      },
    ];

    const insertCliente = db.prepare(`
      INSERT INTO clientes (id, nombre, cedula, telefono, email, direccion, ciudad, categoria, total_comprado, activo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertVehiculo = db.prepare(`
      INSERT INTO vehiculos (id, cliente_id, marca, modelo, anio, placa, vin, color, kilometraje, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    clientes.forEach((cliente, idx) => {
      const clienteId = generateId();
      const vehiculoId = generateId();

      insertCliente.run(
        clienteId,
        cliente.nombre,
        cliente.cedula,
        cliente.telefono,
        cliente.email,
        'Santo Domingo, Ecuador',
        'Santo Domingo',
        'Regular',
        0,
        1,
        getCurrentDateTime(),
        getCurrentDateTime()
      );

      insertVehiculo.run(
        vehiculoId,
        clienteId,
        cliente.vehiculo.marca,
        cliente.vehiculo.modelo,
        cliente.vehiculo.anio,
        cliente.vehiculo.placa,
        `VIN${timestamp}${idx}`,
        cliente.vehiculo.color,
        cliente.vehiculo.km,
        getCurrentDateTime(),
        getCurrentDateTime()
      );

      console.log(
        `  ✓ ${idx + 1}. ${cliente.nombre} - ${cliente.vehiculo.marca} ${cliente.vehiculo.modelo} (${cliente.vehiculo.placa})`
      );
    });
    console.log('✅ 8 clientes con vehículos creados\n');

    // 5. COMPRA SIMULANDO FACTURA CON 15 PRODUCTOS
    console.log('🧾 Creando compra de prueba (factura simulada)...');
    const compraId = generateId();
    const numeroCompra = `COMP-TEST-${timestamp}`;
    const fechaCompra = '2025-11-02';

    let subtotalCompra = 0;
    const itemsCompra = productosIds.map((prod, idx) => {
      const cantidad = Math.floor(Math.random() * 4) + 2; // Entre 2 y 5 unidades
      const total = prod.precio_compra * cantidad;
      subtotalCompra += total;
      return {
        producto_id: prod.id,
        nombre: prod.nombre,
        cantidad,
        precio: prod.precio_compra,
        total,
      };
    });

    const ivaCompra = subtotalCompra * 0.15; // IVA 15%
    const totalCompra = subtotalCompra + ivaCompra;

    db.prepare(
      `
      INSERT INTO compras (id, numero, fecha, proveedor_id, proveedor_nombre, moneda, subtotal, iva, otros_impuestos, total, estado, estado_pago, monto_pagado, notas, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      compraId,
      numeroCompra,
      fechaCompra,
      proveedorId,
      'Repuestos Automotriz RM',
      'USD',
      subtotalCompra.toFixed(2),
      ivaCompra.toFixed(2),
      0,
      totalCompra.toFixed(2),
      'completada',
      'pagado',
      totalCompra.toFixed(2),
      'Compra de prueba simulando factura RM',
      getCurrentDateTime(),
      getCurrentDateTime()
    );

    const insertDetalleCompra = db.prepare(`
      INSERT INTO compras_detalle (compra_id, producto_id, producto_nombre, descripcion, unidad, cantidad, precio_unitario, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    itemsCompra.forEach((item) => {
      insertDetalleCompra.run(
        compraId,
        item.producto_id,
        item.nombre,
        `Item de prueba - ${item.nombre}`,
        'unidad',
        item.cantidad,
        item.precio.toFixed(2),
        item.total.toFixed(2)
      );
    });

    console.log(`✅ Compra creada: ${numeroCompra}`);
    console.log(`   Subtotal: $${subtotalCompra.toFixed(2)}`);
    console.log(`   IVA 15%: $${ivaCompra.toFixed(2)}`);
    console.log(`   TOTAL: $${totalCompra.toFixed(2)}\n`);

    // RESUMEN
    console.log('═══════════════════════════════════════════════════════');
    console.log('✨ DATOS DE PRUEBA AGREGADOS EXITOSAMENTE ✨');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📦 1 Proveedor de prueba');
    console.log('🔧 15 Productos');
    console.log('👥 8 Clientes con sus vehículos');
    console.log('🧾 1 Compra (factura simulada)');
    console.log('═══════════════════════════════════════════════════════\n');

    db.close();
    console.log('🎉 ¡Listo para hacer pruebas!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    db.close();
    process.exit(1);
  }
}

seedDatosPrueba();
