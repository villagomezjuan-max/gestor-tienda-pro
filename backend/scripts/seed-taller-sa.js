/**
 * Script para poblar SUPER_ADMIN con datos ficticios de prueba
 * - 5 clientes con sus vehículos
 * - 1 proveedor (datos de factura)
 * - 20 productos de repuestos
 * - 10 compras con 15 productos cada una
 */

const path = require('path');

const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'super_admin.db');

console.log('🔧 Iniciando población de datos para SUPER_ADMIN...\n');

const db = new Database(DB_PATH);

try {
  db.exec('BEGIN TRANSACTION');

  // ============================================
  // 1. PROVEEDOR (datos de factura RM)
  // ============================================
  console.log('📦 Creando proveedor...');

  const proveedorId = 'PROV-' + Date.now();
  db.prepare(
    `
        INSERT INTO proveedores (
            id, nombre, contacto, telefono, email, direccion, notas
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    proveedorId,
    'REPUESTOS MARTÍNEZ S.A.C.',
    'RUC: 20547896321',
    '01-4567890',
    'ventas@repuestosmartinez.com',
    'Av. Industrial 458, Lima',
    'Proveedor principal de repuestos automotrices - Crédito 30 días'
  );

  console.log(`✅ Proveedor creado (ID: ${proveedorId})\n`);

  // ============================================
  // 2. PRODUCTOS DE REPUESTOS
  // ============================================
  console.log('🔩 Creando 20 productos...');

  const productos = [
    // Filtros
    {
      codigo: 'FLT-001',
      nombre: 'Filtro de Aceite',
      categoria: 'filtros',
      precio: 45.5,
      stock: 150,
    },
    { codigo: 'FLT-002', nombre: 'Filtro de Aire', categoria: 'filtros', precio: 38.0, stock: 120 },
    {
      codigo: 'FLT-003',
      nombre: 'Filtro de Combustible',
      categoria: 'filtros',
      precio: 52.0,
      stock: 90,
    },

    // Aceites
    {
      codigo: 'ACE-001',
      nombre: 'Aceite Motor 15W40 x 4L',
      categoria: 'lubricantes',
      precio: 95.0,
      stock: 200,
    },
    {
      codigo: 'ACE-002',
      nombre: 'Aceite Motor 20W50 x 4L',
      categoria: 'lubricantes',
      precio: 98.0,
      stock: 180,
    },
    {
      codigo: 'ACE-003',
      nombre: 'Aceite Transmisión ATF',
      categoria: 'lubricantes',
      precio: 125.0,
      stock: 80,
    },

    // Frenos
    {
      codigo: 'FRN-001',
      nombre: 'Pastillas Freno Delanteras',
      categoria: 'frenos',
      precio: 180.0,
      stock: 100,
    },
    {
      codigo: 'FRN-002',
      nombre: 'Pastillas Freno Traseras',
      categoria: 'frenos',
      precio: 165.0,
      stock: 95,
    },
    {
      codigo: 'FRN-003',
      nombre: 'Disco Freno Delantero',
      categoria: 'frenos',
      precio: 220.0,
      stock: 60,
    },
    {
      codigo: 'FRN-004',
      nombre: 'Líquido Frenos DOT4 x 500ml',
      categoria: 'frenos',
      precio: 35.0,
      stock: 150,
    },

    // Motor
    {
      codigo: 'MTR-001',
      nombre: 'Bujías NGK (juego 4 unid)',
      categoria: 'motor',
      precio: 85.0,
      stock: 120,
    },
    {
      codigo: 'MTR-002',
      nombre: 'Correa Distribución',
      categoria: 'motor',
      precio: 280.0,
      stock: 45,
    },
    {
      codigo: 'MTR-003',
      nombre: 'Kit Embrague Completo',
      categoria: 'motor',
      precio: 650.0,
      stock: 30,
    },
    { codigo: 'MTR-004', nombre: 'Termostato Motor', categoria: 'motor', precio: 68.0, stock: 70 },

    // Suspensión
    {
      codigo: 'SUS-001',
      nombre: 'Amortiguador Delantero',
      categoria: 'suspension',
      precio: 320.0,
      stock: 50,
    },
    {
      codigo: 'SUS-002',
      nombre: 'Amortiguador Trasero',
      categoria: 'suspension',
      precio: 290.0,
      stock: 55,
    },
    {
      codigo: 'SUS-003',
      nombre: 'Terminal Dirección',
      categoria: 'suspension',
      precio: 95.0,
      stock: 80,
    },

    // Eléctricos
    {
      codigo: 'ELC-001',
      nombre: 'Batería 12V 65Ah',
      categoria: 'electricos',
      precio: 380.0,
      stock: 40,
    },
    { codigo: 'ELC-002', nombre: 'Alternador', categoria: 'electricos', precio: 550.0, stock: 25 },
    {
      codigo: 'ELC-003',
      nombre: 'Motor Arranque',
      categoria: 'electricos',
      precio: 480.0,
      stock: 28,
    },
  ];

  // Crear categoría genérica para repuestos (o usar existente)
  let categoriaId;
  const catExistente = db
    .prepare('SELECT id FROM categorias WHERE nombre = ?')
    .get('Repuestos Automotrices');

  if (catExistente) {
    categoriaId = catExistente.id;
    console.log(`   Usando categoría existente (ID: ${categoriaId})`);
  } else {
    categoriaId = 'CAT-' + Date.now();
    db.prepare(
      `
            INSERT INTO categorias (id, nombre, descripcion)
            VALUES (?, ?, ?)
        `
    ).run(categoriaId, 'Repuestos Automotrices', 'Categoría general de repuestos y accesorios');
    console.log(`   Categoría creada (ID: ${categoriaId})`);
  }

  const insertProducto = db.prepare(`
        INSERT INTO productos (
            id, codigo, nombre, categoria_id, proveedor_id,
            precio_compra, precio_venta, stock, stock_minimo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

  const productosIds = [];
  productos.forEach((p) => {
    const productoId = 'PROD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const precioVenta = (p.precio * 1.35).toFixed(2); // Margen 35%
    insertProducto.run(
      productoId,
      p.codigo,
      p.nombre,
      categoriaId,
      proveedorId,
      p.precio,
      precioVenta,
      p.stock,
      10
    );
    productosIds.push({ id: productoId, ...p });
  });

  console.log(`✅ ${productos.length} productos creados\n`);

  // ============================================
  // 3. CLIENTES CON VEHÍCULOS
  // ============================================
  console.log('👥 Creando 5 clientes con vehículos...');

  const clientes = [
    {
      tipo: 'persona',
      nombre: 'Carlos',
      apellido: 'Ramírez Torres',
      documento: '45789632',
      telefono: '987654321',
      email: 'carlos.ramirez@email.com',
      vehiculos: [
        {
          marca: 'Toyota',
          modelo: 'Corolla',
          año: 2018,
          placa: 'ABC-123',
          color: 'Blanco',
          vin: 'JT2BG22K0X0123456',
        },
      ],
    },
    {
      tipo: 'persona',
      nombre: 'María',
      apellido: 'López Sánchez',
      documento: '52147896',
      telefono: '965874123',
      email: 'maria.lopez@email.com',
      vehiculos: [
        {
          marca: 'Honda',
          modelo: 'Civic',
          año: 2019,
          placa: 'DEF-456',
          color: 'Gris',
          vin: '2HGFC2F59KH123789',
        },
      ],
    },
    {
      tipo: 'empresa',
      nombre: 'Transportes El Rápido SAC',
      ruc: '20548796321',
      telefono: '014567890',
      email: 'admin@elrapido.com',
      vehiculos: [
        {
          marca: 'Hyundai',
          modelo: 'H100',
          año: 2017,
          placa: 'GHI-789',
          color: 'Blanco',
          vin: 'KMJWA37DBHU123456',
        },
        {
          marca: 'Hyundai',
          modelo: 'H100',
          año: 2017,
          placa: 'GHI-790',
          color: 'Blanco',
          vin: 'KMJWA37DBHU123457',
        },
      ],
    },
    {
      tipo: 'persona',
      nombre: 'Jorge',
      apellido: 'Díaz Morales',
      documento: '47856321',
      telefono: '998765432',
      email: 'jorge.diaz@email.com',
      vehiculos: [
        {
          marca: 'Nissan',
          modelo: 'Sentra',
          año: 2020,
          placa: 'JKL-012',
          color: 'Negro',
          vin: '3N1AB7AP8LY123456',
        },
      ],
    },
    {
      tipo: 'persona',
      nombre: 'Ana',
      apellido: 'Fernández Cruz',
      documento: '51236987',
      telefono: '956321478',
      email: 'ana.fernandez@email.com',
      vehiculos: [
        {
          marca: 'Kia',
          modelo: 'Rio',
          año: 2021,
          placa: 'MNO-345',
          color: 'Rojo',
          vin: 'KNADE163X66123456',
        },
      ],
    },
  ];

  const insertCliente = db.prepare(`
        INSERT INTO clientes (
            id, nombre, telefono, email, direccion
        ) VALUES (?, ?, ?, ?, ?)
    `);

  const insertVehiculo = db.prepare(`
        INSERT INTO vehiculos (
            id, cliente_id, marca, modelo, anio, placa, color,
            vin, kilometraje
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

  clientes.forEach((c) => {
    const clienteId = 'CLI-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const nombreCompleto =
      c.tipo === 'empresa' ? c.nombre : `${c.nombre} ${c.apellido} (${c.documento || c.ruc})`;

    insertCliente.run(clienteId, nombreCompleto, c.telefono, c.email, 'Lima, Perú');

    c.vehiculos.forEach((v) => {
      const vehiculoId = 'VEH-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      insertVehiculo.run(
        vehiculoId,
        clienteId,
        v.marca,
        v.modelo,
        v.año,
        v.placa,
        v.color,
        v.vin,
        Math.floor(Math.random() * 80000) + 20000
      );
    });
  });

  console.log(
    `✅ ${clientes.length} clientes creados con ${clientes.reduce((sum, c) => sum + c.vehiculos.length, 0)} vehículos\n`
  );

  // ============================================
  // 4. COMPRAS CON DETALLES
  // ============================================
  console.log('📋 Creando 10 compras con 15 productos cada una...');

  const insertCompra = db.prepare(`
        INSERT INTO compras (
            id, numero, proveedor_id, fecha, 
            subtotal, iva, total, estado, notas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

  const insertDetalle = db.prepare(`
        INSERT INTO compras_detalle (
            compra_id, producto_id, cantidad, precio_unitario, total
        ) VALUES (?, ?, ?, ?, ?)
    `);

  const updateStock = db.prepare(`
        UPDATE productos 
        SET stock = stock + ? 
        WHERE id = ?
    `);

  for (let i = 1; i <= 10; i++) {
    // Fecha aleatoria últimos 3 meses
    const diasAtras = Math.floor(Math.random() * 90);
    const fechaCompra = new Date();
    fechaCompra.setDate(fechaCompra.getDate() - diasAtras);
    const fechaCompraStr = fechaCompra.toISOString().split('T')[0];

    const fechaVencimiento = new Date(fechaCompra);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
    const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];

    // Seleccionar 15 productos aleatorios
    const productosAleatorios = [...productosIds].sort(() => Math.random() - 0.5).slice(0, 15);

    let subtotal = 0;
    const detalles = [];

    productosAleatorios.forEach((p) => {
      const cantidad = Math.floor(Math.random() * 20) + 5; // 5-25 unidades
      const precioUnitario = p.precio;
      const subtotalItem = cantidad * precioUnitario;
      subtotal += subtotalItem;

      detalles.push({
        productoId: p.id,
        cantidad,
        precioUnitario,
        subtotal: subtotalItem,
      });
    });

    const impuestos = subtotal * 0.18; // IGV 18%
    const total = subtotal + impuestos;

    const compraId = 'COMP-' + Date.now() + '-' + i;
    insertCompra.run(
      compraId,
      `RM-2024-${String(i).padStart(4, '0')}`,
      proveedorId,
      fechaCompraStr,
      subtotal.toFixed(2),
      impuestos.toFixed(2),
      total.toFixed(2),
      'completada',
      `Compra de prueba #${i} - Stock inicial`
    );

    detalles.forEach((d) => {
      insertDetalle.run(
        compraId,
        d.productoId,
        d.cantidad,
        d.precioUnitario,
        d.subtotal.toFixed(2)
      );

      // Actualizar stock
      updateStock.run(d.cantidad, d.productoId);
    });

    console.log(
      `  ✓ Compra ${i}/10 creada (${detalles.length} productos, Total: S/ ${total.toFixed(2)})`
    );
  }

  db.exec('COMMIT');
  console.log('\n✅ Población de datos completada exitosamente!');
  console.log('\n📊 Resumen:');
  console.log(`   - 1 proveedor`);
  console.log(`   - 20 productos de repuestos`);
  console.log(`   - 5 clientes con 7 vehículos`);
  console.log(`   - 10 compras con 150 productos en total`);
} catch (error) {
  db.exec('ROLLBACK');
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  db.close();
}
