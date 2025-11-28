/**
 * SCRIPT DE SEEDING PARA SUPER_ADMIN
 * Agrega datos de prueba: 8 clientes con vehículos, 1 proveedor y 15 productos
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

function seedData() {
  console.log('🚀 Iniciando seeding de datos para SUPER_ADMIN...\n');

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  try {
    // 1. CREAR PROVEEDOR: RM Auto Repuestos
    console.log('📦 Creando proveedor RM Auto Repuestos...');
    const proveedorId = generateId();
    const proveedor = {
      id: proveedorId,
      nombre: 'RM Auto Repuestos',
      contacto: 'Roberto Martínez',
      telefono: '0987654321',
      email: 'ventas@rmautorepuestos.com',
      direccion: 'Av. América N45-123 y Naciones Unidas, Quito',
      notas: 'Proveedor principal de repuestos automotrices - Importador directo',
      activo: 1,
      created_at: getCurrentDateTime(),
      updated_at: getCurrentDateTime(),
    };

    db.prepare(
      `
      INSERT INTO proveedores (id, nombre, contacto, telefono, email, direccion, notas, activo, created_at, updated_at)
      VALUES (@id, @nombre, @contacto, @telefono, @email, @direccion, @notas, @activo, @created_at, @updated_at)
    `
    ).run(proveedor);
    console.log('✅ Proveedor creado exitosamente\n');

    // 2. CREAR CATEGORÍA PARA REPUESTOS
    console.log('📁 Creando categoría Repuestos Automotrices...');
    const categoriaId = generateId();
    const insertOrUpdateCategoria = db.prepare(`
      INSERT INTO categorias (id, nombre, descripcion, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(nombre) DO UPDATE SET updated_at = excluded.updated_at
      RETURNING id
    `);
    const categoriaResult = insertOrUpdateCategoria.get(
      categoriaId,
      'Repuestos Automotrices',
      'Repuestos y accesorios para vehículos',
      getCurrentDateTime(),
      getCurrentDateTime()
    );
    const categoriaIdFinal = categoriaResult ? categoriaResult.id : categoriaId;
    console.log('✅ Categoría creada:', categoriaIdFinal, '\n');

    // 3. CREAR 15 PRODUCTOS DE REPUESTOS
    console.log('🔧 Creando 15 productos de repuestos...');
    const timestamp = Date.now();
    const productos = [
      {
        codigo: `RM-FIL-ACE-${timestamp}-001`,
        nombre: 'Filtro de Aceite Mann W610/1',
        descripcion: 'Filtro de aceite para motor, compatible con vehículos Toyota, Honda',
        precio_compra: 8.5,
        precio_venta: 12.0,
        stock: 45,
      },
      {
        codigo: `RM-FIL-AIR-${timestamp}-002`,
        nombre: 'Filtro de Aire K&N 33-2070',
        descripcion: 'Filtro de aire de alto flujo, reutilizable',
        precio_compra: 32.0,
        precio_venta: 45.0,
        stock: 20,
      },
      {
        codigo: `RM-FIL-COM-${timestamp}-003`,
        nombre: 'Filtro de Combustible Bosch 0450905969',
        descripcion: 'Filtro de combustible diesel, alta eficiencia',
        precio_compra: 15.0,
        precio_venta: 22.0,
        stock: 30,
      },
      {
        codigo: `RM-PAS-FRE-${timestamp}-004`,
        nombre: 'Pastillas de Freno Delanteras Brembo P56038',
        descripcion: 'Pastillas cerámicas premium para freno delantero',
        precio_compra: 45.0,
        precio_venta: 65.0,
        stock: 25,
      },
      {
        codigo: `RM-PAS-FRE-${timestamp}-005`,
        nombre: 'Pastillas de Freno Traseras ATE 13.0460-7179.2',
        descripcion: 'Pastillas de freno trasero de alta durabilidad',
        precio_compra: 35.0,
        precio_venta: 52.0,
        stock: 28,
      },
      {
        codigo: `RM-DIS-FRE-${timestamp}-006`,
        nombre: 'Discos de Freno Ventilados Zimmermann 100.3377.20',
        descripcion: 'Par de discos ventilados 280mm, para eje delantero',
        precio_compra: 85.0,
        precio_venta: 125.0,
        stock: 12,
      },
      {
        codigo: `RM-BUJ-NGK-${timestamp}-007`,
        nombre: 'Bujías NGK Iridium IFR6T11 (Set 4 unidades)',
        descripcion: 'Bujías de iridio larga duración, juego de 4',
        precio_compra: 28.0,
        precio_venta: 42.0,
        stock: 18,
      },
      {
        codigo: `RM-ACE-MOT-${timestamp}-008`,
        nombre: 'Aceite de Motor Mobil 1 ESP Formula 5W-30 (4L)',
        descripcion: 'Aceite sintético premium para motores gasolina y diesel',
        precio_compra: 42.0,
        precio_venta: 58.0,
        stock: 35,
      },
      {
        codigo: `RM-ACE-MOT-${timestamp}-009`,
        nombre: 'Aceite de Motor Castrol Edge 5W-40 (5L)',
        descripcion: 'Aceite sintético con tecnología Fluid Titanium',
        precio_compra: 48.0,
        precio_venta: 68.0,
        stock: 28,
      },
      {
        codigo: `RM-KIT-DIS-${timestamp}-010`,
        nombre: 'Kit de Distribución Gates K015607XS',
        descripcion: 'Kit completo: correa, tensor, rodillos, bomba de agua',
        precio_compra: 125.0,
        precio_venta: 180.0,
        stock: 8,
      },
      {
        codigo: `RM-ABS-DEL-${timestamp}-011`,
        nombre: 'Amortiguadores Delanteros Monroe G16394 (Par)',
        descripcion: 'Amortiguadores hidráulicos con tecnología Gas Magnum',
        precio_compra: 95.0,
        precio_venta: 140.0,
        stock: 10,
      },
      {
        codigo: `RM-BAT-12V-${timestamp}-012`,
        nombre: 'Batería Bosch S4 12V 60Ah 540A',
        descripcion: 'Batería libre de mantenimiento, arranque en frío 540A',
        precio_compra: 85.0,
        precio_venta: 120.0,
        stock: 15,
      },
      {
        codigo: `RM-EMB-RAD-${timestamp}-013`,
        nombre: 'Embrague LUK RepSet 623302609',
        descripcion: 'Kit completo: disco, plato y cojinete',
        precio_compra: 165.0,
        precio_venta: 240.0,
        stock: 6,
      },
      {
        codigo: `RM-RAD-REF-${timestamp}-014`,
        nombre: 'Radiador de Refrigeración Valeo 734299',
        descripcion: 'Radiador aluminio con tanques plásticos',
        precio_compra: 135.0,
        precio_venta: 195.0,
        stock: 7,
      },
      {
        codigo: `RM-LLA-ALE-${timestamp}-015`,
        nombre: 'Llantas Michelin Primacy 4 205/55R16 (Set 4)',
        descripcion: 'Neumáticos de alto rendimiento, set de 4 unidades',
        precio_compra: 280.0,
        precio_venta: 380.0,
        stock: 16,
      },
    ];

    const insertProducto = db.prepare(`
      INSERT INTO productos (id, codigo, nombre, descripcion, categoria_id, proveedor_id, precio_compra, precio_venta, stock, stock_minimo, activo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    productos.forEach((prod, idx) => {
      const prodId = generateId();
      insertProducto.run(
        prodId,
        prod.codigo,
        prod.nombre,
        prod.descripcion,
        categoriaIdFinal,
        proveedorId,
        prod.precio_compra,
        prod.precio_venta,
        prod.stock,
        5, // stock_minimo
        1, // activo
        getCurrentDateTime(),
        getCurrentDateTime()
      );
      console.log(`  ✓ ${idx + 1}. ${prod.nombre}`);
    });
    console.log('✅ 15 productos creados exitosamente\n');

    // 4. CREAR 8 CLIENTES CON SUS VEHÍCULOS
    console.log('👥 Creando 8 clientes con sus vehículos...');
    const clienteTimestamp = Date.now();
    const clientes = [
      {
        nombre: 'Carlos Méndez Torres',
        cedula: `1715${clienteTimestamp % 1000000}`,
        telefono: '0998765432',
        email: 'carlos.mendez@email.com',
        direccion: 'Calle Los Granados E45-234 y Amazonas',
        ciudad: 'Quito',
        vehiculo: {
          marca: 'Toyota',
          modelo: 'Corolla',
          anio: 2018,
          placa: `PBX-${clienteTimestamp % 10000}`,
          vin: `2T1BU4EE0JC${clienteTimestamp % 1000000}`,
          color: 'Plata',
          kilometraje: 85000,
        },
      },
      {
        nombre: 'María Fernanda Salazar',
        cedula: `1723${(clienteTimestamp % 1000000) + 1}`,
        telefono: '0987654321',
        email: 'mf.salazar@email.com',
        direccion: 'Av. 10 de Agosto N23-456',
        ciudad: 'Quito',
        vehiculo: {
          marca: 'Chevrolet',
          modelo: 'Spark GT',
          anio: 2020,
          placa: `PCX-${(clienteTimestamp % 10000) + 1}`,
          vin: `KL1CM6H08EC${(clienteTimestamp % 1000000) + 1}`,
          color: 'Rojo',
          kilometraje: 45000,
        },
      },
      {
        nombre: 'Roberto Andrés Vega',
        cedula: `1709${(clienteTimestamp % 1000000) + 2}`,
        telefono: '0996543210',
        email: 'r.vega@email.com',
        direccion: 'Calle El Inca S24-567 y Los Laureles',
        ciudad: 'Quito',
        vehiculo: {
          marca: 'Nissan',
          modelo: 'Sentra',
          anio: 2019,
          placa: `PBY-${(clienteTimestamp % 10000) + 2}`,
          vin: `3N1AB7AP0KL${(clienteTimestamp % 1000000) + 2}`,
          color: 'Negro',
          kilometraje: 72000,
        },
      },
      {
        nombre: 'Ana Patricia Morales',
        cedula: `1734${(clienteTimestamp % 1000000) + 3}`,
        telefono: '0995432109',
        email: 'ana.morales@email.com',
        direccion: 'Av. Shyris N45-678 y Portugal',
        ciudad: 'Quito',
        vehiculo: {
          marca: 'Honda',
          modelo: 'Civic',
          anio: 2017,
          placa: `PCZ-${(clienteTimestamp % 10000) + 3}`,
          vin: `2HGFC2F59HH${(clienteTimestamp % 1000000) + 3}`,
          color: 'Azul',
          kilometraje: 95000,
        },
      },
      {
        nombre: 'Diego Fernando Castillo',
        cedula: `1712${(clienteTimestamp % 1000000) + 4}`,
        telefono: '0994321098',
        email: 'df.castillo@email.com',
        direccion: 'Calle Juan León Mera N24-789',
        ciudad: 'Quito',
        vehiculo: {
          marca: 'Mazda',
          modelo: 'CX-5',
          anio: 2021,
          placa: `PDA-${(clienteTimestamp % 10000) + 4}`,
          vin: `JM3KFBDM5M0${(clienteTimestamp % 1000000) + 4}`,
          color: 'Blanco',
          kilometraje: 32000,
        },
      },
      {
        nombre: 'Gabriela Alejandra Ruiz',
        cedula: `1745${(clienteTimestamp % 1000000) + 5}`,
        telefono: '0993210987',
        email: 'gaby.ruiz@email.com',
        direccion: 'Av. República del Salvador N34-890',
        ciudad: 'Quito',
        vehiculo: {
          marca: 'Hyundai',
          modelo: 'Tucson',
          anio: 2019,
          placa: `PDB-${(clienteTimestamp % 10000) + 5}`,
          vin: `KM8J3CA49KU${(clienteTimestamp % 1000000) + 5}`,
          color: 'Gris',
          kilometraje: 68000,
        },
      },
      {
        nombre: 'Luis Alberto Sánchez',
        cedula: `1756${(clienteTimestamp % 1000000) + 6}`,
        telefono: '0992109876',
        email: 'luis.sanchez@email.com',
        direccion: 'Calle Eloy Alfaro S35-901 y Portugal',
        ciudad: 'Quito',
        vehiculo: {
          marca: 'Kia',
          modelo: 'Sportage',
          anio: 2020,
          placa: `PDC-${(clienteTimestamp % 10000) + 6}`,
          vin: `KNDPM3AC4L7${(clienteTimestamp % 1000000) + 6}`,
          color: 'Verde',
          kilometraje: 55000,
        },
      },
      {
        nombre: 'Patricia Isabel Herrera',
        cedula: `1767${(clienteTimestamp % 1000000) + 7}`,
        telefono: '0991098765',
        email: 'p.herrera@email.com',
        direccion: 'Av. Occidental N36-012 y Gaspar de Villarroel',
        ciudad: 'Quito',
        vehiculo: {
          marca: 'Volkswagen',
          modelo: 'Jetta',
          anio: 2018,
          placa: `PDD-${(clienteTimestamp % 10000) + 7}`,
          vin: `3VW2B7AJ4JM${(clienteTimestamp % 1000000) + 7}`,
          color: 'Plateado',
          kilometraje: 78000,
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

      // Insertar cliente
      insertCliente.run(
        clienteId,
        cliente.nombre,
        cliente.cedula,
        cliente.telefono,
        cliente.email,
        cliente.direccion,
        cliente.ciudad,
        'Regular',
        0, // total_comprado inicial
        1, // activo
        getCurrentDateTime(),
        getCurrentDateTime()
      );

      // Insertar vehículo
      insertVehiculo.run(
        vehiculoId,
        clienteId,
        cliente.vehiculo.marca,
        cliente.vehiculo.modelo,
        cliente.vehiculo.anio,
        cliente.vehiculo.placa,
        cliente.vehiculo.vin,
        cliente.vehiculo.color,
        cliente.vehiculo.kilometraje,
        getCurrentDateTime(),
        getCurrentDateTime()
      );

      console.log(
        `  ✓ ${idx + 1}. ${cliente.nombre} - ${cliente.vehiculo.marca} ${cliente.vehiculo.modelo} (${cliente.vehiculo.placa})`
      );
    });
    console.log('✅ 8 clientes y vehículos creados exitosamente\n');

    // 5. CREAR UNA COMPRA SIMULANDO LA FACTURA RM
    console.log('🧾 Creando compra de factura RM Auto Repuestos...');
    const compraId = generateId();
    const numeroCompra = `COMP-${Date.now()}`;
    const fechaCompra = '2025-11-02';

    // Calcular totales
    let subtotalCompra = 0;
    const itemsCompra = productos.slice(0, 15).map((prod) => {
      const cantidad = Math.floor(Math.random() * 5) + 2; // Entre 2 y 6 unidades
      const total = prod.precio_compra * cantidad;
      subtotalCompra += total;
      return {
        producto: prod,
        cantidad,
        total,
      };
    });

    const ivaCompra = subtotalCompra * 0.15; // IVA 15% Ecuador
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
      'RM Auto Repuestos',
      'USD',
      subtotalCompra.toFixed(2),
      ivaCompra.toFixed(2),
      0,
      totalCompra.toFixed(2),
      'completada',
      'pagado',
      totalCompra.toFixed(2),
      'Factura de prueba - RM Auto Repuestos',
      getCurrentDateTime(),
      getCurrentDateTime()
    );

    // Insertar detalles de compra
    const insertDetalleCompra = db.prepare(`
      INSERT INTO compras_detalle (compra_id, producto_id, producto_nombre, descripcion, unidad, cantidad, precio_unitario, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    itemsCompra.forEach((item) => {
      insertDetalleCompra.run(
        compraId,
        null, // producto_id puede ser null si no está en inventario
        item.producto.nombre,
        item.producto.descripcion,
        'unidad',
        item.cantidad,
        item.producto.precio_compra.toFixed(2),
        item.total.toFixed(2)
      );
    });

    console.log(`✅ Compra creada: ${numeroCompra}`);
    console.log(`   📊 Subtotal: $${subtotalCompra.toFixed(2)}`);
    console.log(`   📊 IVA (15%): $${ivaCompra.toFixed(2)}`);
    console.log(`   📊 TOTAL: $${totalCompra.toFixed(2)}\n`);

    // RESUMEN FINAL
    console.log('═══════════════════════════════════════════════════════');
    console.log('✨ SEEDING COMPLETADO EXITOSAMENTE ✨');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📦 1 Proveedor: RM Auto Repuestos`);
    console.log(`🔧 15 Productos de repuestos automotrices`);
    console.log(`👥 8 Clientes con sus vehículos`);
    console.log(`🧾 1 Compra registrada (factura de prueba)`);
    console.log('═══════════════════════════════════════════════════════\n');

    db.close();
    console.log('🎉 Base de datos cerrada. ¡Listo para usar!\n');
  } catch (error) {
    console.error('❌ Error durante el seeding:', error.message);
    console.error(error);
    db.close();
    process.exit(1);
  }
}

// Ejecutar
seedData();
