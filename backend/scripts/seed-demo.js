#!/usr/bin/env node
/**
 * Script para agregar datos de demostración
 * Gestor Tienda Pro
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

// Ruta de la base de datos
const DB_PATH = process.env.DB_PATH || './data/gestor_tienda.db';

function generateId(prefix = 'id') {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${random}`;
}

function seedDemoData() {
  console.log('🌱 Agregando datos de demostración...');

  try {
    // Verificar que la base de datos existe
    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`Base de datos no encontrada en: ${DB_PATH}`);
    }

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    console.log('🔗 Conectado a la base de datos');

    // Limpiar datos existentes (solo de demo)
    console.log('🧹 Limpiando datos anteriores...');

    // Verificar si ya hay datos
    const existingProducts = db.prepare('SELECT COUNT(*) as count FROM productos').get();
    if (existingProducts.count > 0) {
      console.log('⚠️ Ya existen datos en el sistema. Saltando inserción de demo.');
      return;
    }

    const now = new Date().toISOString();

    // Insertar proveedores
    console.log('🏭 Creando proveedores...');
    const proveedores = [
      {
        id: 'prov_001',
        nombre: 'Distribuidora AutoPartes',
        telefono: '022-345-678',
        email: 'ventas@autopartes.com',
      },
      {
        id: 'prov_002',
        nombre: 'Lubricantes del Norte',
        telefono: '022-876-543',
        email: 'info@lubrinorte.com',
      },
      {
        id: 'prov_003',
        nombre: 'Repuestos Universales',
        telefono: '022-111-222',
        email: 'contacto@repuestosuni.com',
      },
    ];

    const insertProveedor = db.prepare(`
      INSERT OR IGNORE INTO proveedores (id, nombre, telefono, email, activo, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `);

    proveedores.forEach((prov) => {
      insertProveedor.run(prov.id, prov.nombre, prov.telefono, prov.email, now);
    });

    // Insertar categorías adicionales
    console.log('📂 Creando categorías...');
    const categorias = [
      {
        id: 'cat_aceites',
        nombre: 'Aceites y Lubricantes',
        descripcion: 'Aceites para motor y transmisión',
      },
      {
        id: 'cat_filtros',
        nombre: 'Filtros',
        descripcion: 'Filtros de aire, aceite y combustible',
      },
      {
        id: 'cat_frenos',
        nombre: 'Sistema de Frenos',
        descripcion: 'Pastillas, discos y líquido de frenos',
      },
      {
        id: 'cat_suspension',
        nombre: 'Suspensión',
        descripcion: 'Amortiguadores y componentes de suspensión',
      },
      { id: 'cat_neumaticos', nombre: 'Neumáticos', descripcion: 'Neumáticos y rines' },
    ];

    const insertCategoria = db.prepare(`
      INSERT OR IGNORE INTO categorias (id, nombre, descripcion, created_at)
      VALUES (?, ?, ?, ?)
    `);

    categorias.forEach((cat) => {
      insertCategoria.run(cat.id, cat.nombre, cat.descripcion, now);
    });

    // Insertar productos
    console.log('📦 Creando productos...');
    const productos = [
      {
        codigo: 'ACE001',
        nombre: 'Aceite Motor 5W-30',
        categoria: 'cat_aceites',
        proveedor: 'prov_002',
        precioCompra: 25.5,
        precioVenta: 35.0,
        stock: 50,
      },
      {
        codigo: 'ACE002',
        nombre: 'Aceite Motor 20W-50',
        categoria: 'cat_aceites',
        proveedor: 'prov_002',
        precioCompra: 22.0,
        precioVenta: 30.0,
        stock: 35,
      },
      {
        codigo: 'FIL001',
        nombre: 'Filtro de Aceite Universal',
        categoria: 'cat_filtros',
        proveedor: 'prov_001',
        precioCompra: 8.5,
        precioVenta: 12.0,
        stock: 80,
      },
      {
        codigo: 'FIL002',
        nombre: 'Filtro de Aire K&N',
        categoria: 'cat_filtros',
        proveedor: 'prov_001',
        precioCompra: 35.0,
        precioVenta: 50.0,
        stock: 25,
      },
      {
        codigo: 'FRE001',
        nombre: 'Pastillas de Freno Delanteras',
        categoria: 'cat_frenos',
        proveedor: 'prov_003',
        precioCompra: 45.0,
        precioVenta: 65.0,
        stock: 20,
      },
      {
        codigo: 'FRE002',
        nombre: 'Líquido de Frenos DOT 4',
        categoria: 'cat_frenos',
        proveedor: 'prov_002',
        precioCompra: 12.0,
        precioVenta: 18.0,
        stock: 30,
      },
      {
        codigo: 'SUS001',
        nombre: 'Amortiguador Delantero',
        categoria: 'cat_suspension',
        proveedor: 'prov_003',
        precioCompra: 120.0,
        precioVenta: 180.0,
        stock: 10,
      },
      {
        codigo: 'NEU001',
        nombre: 'Neumático 185/65R14',
        categoria: 'cat_neumaticos',
        proveedor: 'prov_001',
        precioCompra: 85.0,
        precioVenta: 120.0,
        stock: 16,
      },
    ];

    const insertProducto = db.prepare(`
      INSERT OR IGNORE INTO productos (id, codigo, nombre, categoria_id, proveedor_id, precio_compra, precio_venta, stock, activo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    productos.forEach((prod) => {
      const id = generateId('prod');
      insertProducto.run(
        id,
        prod.codigo,
        prod.nombre,
        prod.categoria,
        prod.proveedor,
        prod.precioCompra,
        prod.precioVenta,
        prod.stock,
        now
      );
    });

    // Insertar clientes
    console.log('👥 Creando clientes...');
    const clientes = [
      {
        nombre: 'Juan Carlos Pérez',
        cedula: '1234567890',
        telefono: '0987654321',
        email: 'juan@email.com',
        categoria: 'Premium',
      },
      {
        nombre: 'María González',
        cedula: '0987654320',
        telefono: '0912345678',
        email: 'maria@email.com',
        categoria: 'Regular',
      },
      {
        nombre: 'Carlos Rodríguez',
        cedula: '1122334455',
        telefono: '0998877665',
        email: 'carlos@email.com',
        categoria: 'Regular',
      },
      {
        nombre: 'Ana Martínez',
        cedula: '2233445566',
        telefono: '0987766554',
        email: 'ana@email.com',
        categoria: 'VIP',
      },
      {
        nombre: 'Luis Fernández',
        cedula: '3344556677',
        telefono: '0976655443',
        email: 'luis@email.com',
        categoria: 'Regular',
      },
    ];

    const insertCliente = db.prepare(`
      INSERT OR IGNORE INTO clientes (id, nombre, cedula, telefono, email, categoria, activo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const clienteIds = [];
    clientes.forEach((cliente) => {
      const id = generateId('cli');
      clienteIds.push(id);
      insertCliente.run(
        id,
        cliente.nombre,
        cliente.cedula,
        cliente.telefono,
        cliente.email,
        cliente.categoria,
        now
      );
    });

    // Insertar vehículos
    console.log('🚗 Creando vehículos...');
    const vehiculos = [
      {
        clienteId: clienteIds[0],
        marca: 'Toyota',
        modelo: 'Corolla',
        anio: 2020,
        placa: 'ABC-1234',
        color: 'Blanco',
      },
      {
        clienteId: clienteIds[1],
        marca: 'Chevrolet',
        modelo: 'Spark',
        anio: 2019,
        placa: 'DEF-5678',
        color: 'Rojo',
      },
      {
        clienteId: clienteIds[2],
        marca: 'Nissan',
        modelo: 'Sentra',
        anio: 2021,
        placa: 'GHI-9012',
        color: 'Azul',
      },
      {
        clienteId: clienteIds[3],
        marca: 'Honda',
        modelo: 'Civic',
        anio: 2022,
        placa: 'JKL-3456',
        color: 'Negro',
      },
      {
        clienteId: clienteIds[4],
        marca: 'Hyundai',
        modelo: 'Accent',
        anio: 2020,
        placa: 'MNO-7890',
        color: 'Gris',
      },
    ];

    const insertVehiculo = db.prepare(`
      INSERT OR IGNORE INTO vehiculos (id, cliente_id, marca, modelo, anio, placa, color, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    vehiculos.forEach((veh) => {
      const id = generateId('veh');
      insertVehiculo.run(
        id,
        veh.clienteId,
        veh.marca,
        veh.modelo,
        veh.anio,
        veh.placa,
        veh.color,
        now
      );
    });

    // Insertar algunas ventas de ejemplo
    console.log('💰 Creando ventas de ejemplo...');
    const ventas = [
      {
        clienteId: clienteIds[0],
        items: [
          { codigo: 'ACE001', cantidad: 2 },
          { codigo: 'FIL001', cantidad: 1 },
        ],
      },
      {
        clienteId: clienteIds[1],
        items: [
          { codigo: 'FRE001', cantidad: 1 },
          { codigo: 'FRE002', cantidad: 1 },
        ],
      },
    ];

    const insertVenta = db.prepare(`
      INSERT INTO ventas (id, numero, fecha, cliente_id, cliente_nombre, subtotal, iva, total, estado, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completada', ?)
    `);

    const insertVentaDetalle = db.prepare(`
      INSERT INTO ventas_detalle (venta_id, producto_id, producto_nombre, cantidad, precio_unitario, total)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    ventas.forEach((venta, index) => {
      const ventaId = generateId('venta');
      const numero = `V-${String(index + 1).padStart(4, '0')}`;
      const fecha = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      let subtotal = 0;
      const cliente = db.prepare('SELECT nombre FROM clientes WHERE id = ?').get(venta.clienteId);

      // Calcular subtotal
      venta.items.forEach((item) => {
        const producto = db
          .prepare('SELECT id, nombre, precio_venta FROM productos WHERE codigo = ?')
          .get(item.codigo);
        if (producto) {
          subtotal += producto.precio_venta * item.cantidad;
        }
      });

      const iva = subtotal * 0.12; // 12% IVA
      const total = subtotal + iva;

      insertVenta.run(
        ventaId,
        numero,
        fecha,
        venta.clienteId,
        cliente?.nombre || 'Cliente',
        subtotal,
        iva,
        total,
        now
      );

      // Insertar detalles
      venta.items.forEach((item) => {
        const producto = db
          .prepare('SELECT id, nombre, precio_venta FROM productos WHERE codigo = ?')
          .get(item.codigo);
        if (producto) {
          const totalLinea = producto.precio_venta * item.cantidad;
          insertVentaDetalle.run(
            ventaId,
            producto.id,
            producto.nombre,
            item.cantidad,
            producto.precio_venta,
            totalLinea
          );
        }
      });
    });

    console.log('✅ Datos de demostración agregados correctamente');
    console.log('📊 Resumen de datos creados:');

    const stats = {
      proveedores: db.prepare('SELECT COUNT(*) as count FROM proveedores').get().count,
      categorias: db.prepare('SELECT COUNT(*) as count FROM categorias').get().count,
      productos: db.prepare('SELECT COUNT(*) as count FROM productos').get().count,
      clientes: db.prepare('SELECT COUNT(*) as count FROM clientes').get().count,
      vehiculos: db.prepare('SELECT COUNT(*) as count FROM vehiculos').get().count,
      ventas: db.prepare('SELECT COUNT(*) as count FROM ventas').get().count,
    };

    Object.entries(stats).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });

    db.close();
  } catch (error) {
    console.error('❌ Error al agregar datos de demostración:', error.message);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  seedDemoData();
}

module.exports = { seedDemoData };
