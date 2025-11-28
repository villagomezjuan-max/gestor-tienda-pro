/**
 * Script para agregar datos de prueba (15 productos, 6 clientes, 8 vehiculos)
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

function seedTestData() {
  console.log('🌱 Agregando datos de prueba...');

  try {
    // Verificar que la base de datos existe
    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`Base de datos no encontrada en: ${DB_PATH}`);
    }

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    console.log('🔗 Conectado a la base de datos');

    const now = new Date().toISOString();

    // Insertar proveedores de prueba
    console.log('🏭 Creando proveedores de prueba...');
    const proveedores = [
      {
        id: 'prov_test_001',
        nombre: 'Proveedor de Partes Express',
        telefono: '099-111-2222',
        email: 'ventas@partesexpress.com',
      },
      {
        id: 'prov_test_002',
        nombre: 'Suministros Automotrices Global',
        telefono: '098-333-4444',
        email: 'info@globalauto.com',
      },
    ];

    const insertProveedor = db.prepare(`
      INSERT OR IGNORE INTO proveedores (id, nombre, telefono, email, activo, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `);

    proveedores.forEach((prov) => {
      insertProveedor.run(prov.id, prov.nombre, prov.telefono, prov.email, now);
    });

    // Insertar categorías de prueba
    console.log('📂 Creando categorías de prueba...');
    const categorias = [
      {
        id: 'cat_test_electricos',
        nombre: 'Componentes Eléctricos',
        descripcion: 'Baterías, alternadores, sensores y más',
      },
      {
        id: 'cat_test_motor',
        nombre: 'Componentes de Motor',
        descripcion: 'Correas, bombas, bujías y más',
      },
    ];

    const insertCategoria = db.prepare(`
      INSERT OR IGNORE INTO categorias (id, nombre, descripcion, created_at)
      VALUES (?, ?, ?, ?)
    `);

    categorias.forEach((cat) => {
      insertCategoria.run(cat.id, cat.nombre, cat.descripcion, now);
    });

    // Insertar 15 productos de prueba
    console.log('📦 Creando 15 productos de prueba...');
    const productos = [
      {
        codigo: 'P-E01',
        nombre: 'Batería 12V 650A',
        categoria: 'cat_test_electricos',
        proveedor: 'prov_test_001',
        precioCompra: 80.0,
        precioVenta: 110.0,
        stock: 20,
      },
      {
        codigo: 'P-E02',
        nombre: 'Alternador 120A',
        categoria: 'cat_test_electricos',
        proveedor: 'prov_test_001',
        precioCompra: 150.0,
        precioVenta: 220.0,
        stock: 10,
      },
      {
        codigo: 'P-E03',
        nombre: 'Sensor de Oxígeno',
        categoria: 'cat_test_electricos',
        proveedor: 'prov_test_002',
        precioCompra: 45.0,
        precioVenta: 65.0,
        stock: 30,
      },
      {
        codigo: 'P-E04',
        nombre: 'Bobina de Encendido',
        categoria: 'cat_test_electricos',
        proveedor: 'prov_test_001',
        precioCompra: 25.0,
        precioVenta: 40.0,
        stock: 40,
      },
      {
        codigo: 'P-E05',
        nombre: 'Focos LED H4 (par)',
        categoria: 'cat_test_electricos',
        proveedor: 'prov_test_002',
        precioCompra: 30.0,
        precioVenta: 50.0,
        stock: 50,
      },
      {
        codigo: 'P-M01',
        nombre: 'Correa de Distribución',
        categoria: 'cat_test_motor',
        proveedor: 'prov_test_002',
        precioCompra: 40.0,
        precioVenta: 60.0,
        stock: 25,
      },
      {
        codigo: 'P-M02',
        nombre: 'Bomba de Agua',
        categoria: 'cat_test_motor',
        proveedor: 'prov_test_001',
        precioCompra: 60.0,
        precioVenta: 90.0,
        stock: 15,
      },
      {
        codigo: 'P-M03',
        nombre: 'Juego de Bujías (4u)',
        categoria: 'cat_test_motor',
        proveedor: 'prov_test_002',
        precioCompra: 15.0,
        precioVenta: 25.0,
        stock: 60,
      },
      {
        codigo: 'P-M04',
        nombre: 'Termostato',
        categoria: 'cat_test_motor',
        proveedor: 'prov_test_001',
        precioCompra: 12.0,
        precioVenta: 20.0,
        stock: 35,
      },
      {
        codigo: 'P-M05',
        nombre: 'Empaque de Culata',
        categoria: 'cat_test_motor',
        proveedor: 'prov_test_002',
        precioCompra: 50.0,
        precioVenta: 75.0,
        stock: 12,
      },
      {
        codigo: 'P-M06',
        nombre: 'Tensor de Correa',
        categoria: 'cat_test_motor',
        proveedor: 'prov_test_001',
        precioCompra: 35.0,
        precioVenta: 55.0,
        stock: 22,
      },
      {
        codigo: 'P-E06',
        nombre: 'Motor de Arranque',
        categoria: 'cat_test_electricos',
        proveedor: 'prov_test_001',
        precioCompra: 120.0,
        precioVenta: 180.0,
        stock: 8,
      },
      {
        codigo: 'P-M07',
        nombre: 'Radiador de Aluminio',
        categoria: 'cat_test_motor',
        proveedor: 'prov_test_002',
        precioCompra: 200.0,
        precioVenta: 280.0,
        stock: 5,
      },
      {
        codigo: 'P-M08',
        nombre: 'Kit de Embrague',
        categoria: 'cat_test_motor',
        proveedor: 'prov_test_002',
        precioCompra: 180.0,
        precioVenta: 250.0,
        stock: 7,
      },
      {
        codigo: 'P-E07',
        nombre: 'Sensor MAF',
        categoria: 'cat_test_electricos',
        proveedor: 'prov_test_001',
        precioCompra: 55.0,
        precioVenta: 80.0,
        stock: 18,
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

    // Insertar 6 clientes de prueba
    console.log('👥 Creando 6 clientes de prueba...');
    const clientes = [
      {
        nombre: 'Elena Vargas',
        cedula: '1712345678',
        telefono: '0981234567',
        email: 'elena.v@email.com',
        categoria: 'Frecuente',
      },
      {
        nombre: 'Roberto Morales',
        cedula: '1309876543',
        telefono: '0998765432',
        email: 'roberto.m@email.com',
        categoria: 'Nuevo',
      },
      {
        nombre: 'Lucía Castro',
        cedula: '0987654321',
        telefono: '0976543210',
        email: 'lucia.c@email.com',
        categoria: 'Frecuente',
      },
      {
        nombre: 'Andrés Paredes',
        cedula: '0123456789',
        telefono: '0965432109',
        email: 'andres.p@email.com',
        categoria: 'Empresarial',
      },
      {
        nombre: 'Gabriela Rivas',
        cedula: '1801234567',
        telefono: '0954321098',
        email: 'gabriela.r@email.com',
        categoria: 'Nuevo',
      },
      {
        nombre: 'Fernando Guzmán',
        cedula: '1098765432',
        telefono: '0943210987',
        email: 'fernando.g@email.com',
        categoria: 'Frecuente',
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

    // Insertar 8 vehículos de prueba
    console.log('🚗 Creando 8 vehículos de prueba...');
    const vehiculos = [
      {
        clienteId: clienteIds[0],
        marca: 'Kia',
        modelo: 'Sportage',
        anio: 2021,
        placa: 'PBA-1111',
        color: 'Gris',
      },
      {
        clienteId: clienteIds[0],
        marca: 'Hyundai',
        modelo: 'Tucson',
        anio: 2022,
        placa: 'PBA-1112',
        color: 'Blanco',
      },
      {
        clienteId: clienteIds[1],
        marca: 'Chevrolet',
        modelo: 'D-Max',
        anio: 2019,
        placa: 'GBC-2222',
        color: 'Rojo',
      },
      {
        clienteId: clienteIds[2],
        marca: 'Mazda',
        modelo: 'CX-5',
        anio: 2020,
        placa: 'MFA-3333',
        color: 'Azul',
      },
      {
        clienteId: clienteIds[3],
        marca: 'Ford',
        modelo: 'Ranger',
        anio: 2018,
        placa: 'LDE-4444',
        color: 'Negro',
      },
      {
        clienteId: clienteIds[3],
        marca: 'Toyota',
        modelo: 'Hilux',
        anio: 2023,
        placa: 'LDE-4445',
        color: 'Plata',
      },
      {
        clienteId: clienteIds[4],
        marca: 'Nissan',
        modelo: 'Frontier',
        anio: 2021,
        placa: 'AFE-5555',
        color: 'Naranja',
      },
      {
        clienteId: clienteIds[5],
        marca: 'Mitsubishi',
        modelo: 'L200',
        anio: 2022,
        placa: 'TGH-6666',
        color: 'Verde',
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

    console.log('✅ Datos de prueba agregados correctamente');
    console.log('📊 Resumen de datos creados:');

    const stats = {
      proveedores: db
        .prepare("SELECT COUNT(*) as count FROM proveedores WHERE id LIKE 'prov_test_%'")
        .get().count,
      categorias: db
        .prepare("SELECT COUNT(*) as count FROM categorias WHERE id LIKE 'cat_test_%'")
        .get().count,
      productos: db.prepare("SELECT COUNT(*) as count FROM productos WHERE codigo LIKE 'P-%'").get()
        .count,
      clientes: db
        .prepare(
          "SELECT COUNT(*) as count FROM clientes WHERE cedula LIKE '17%' OR cedula LIKE '13%' OR cedula LIKE '09%' OR cedula LIKE '01%' OR cedula LIKE '18%' OR cedula LIKE '10%'"
        )
        .get().count,
      vehiculos: db
        .prepare(
          "SELECT COUNT(*) as count FROM vehiculos WHERE placa LIKE 'PBA-%' OR placa LIKE 'GBC-%' OR placa LIKE 'MFA-%' OR placa LIKE 'LDE-%' OR placa LIKE 'AFE-%' OR placa LIKE 'TGH-%'"
        )
        .get().count,
    };

    Object.entries(stats).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });

    db.close();
  } catch (error) {
    console.error('❌ Error al agregar datos de prueba:', error.message);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  seedTestData();
}

module.exports = { seedTestData };
