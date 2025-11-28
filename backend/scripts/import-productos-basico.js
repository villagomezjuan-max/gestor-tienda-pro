#!/usr/bin/env node
/**
 * Script simplificado para importar productos del JSON usando solo las tablas básicas
 * Se enfoca en productos, categorias y proveedores sin las tablas de compatibilidad
 * Gestor Tienda Pro v2.0
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'gestor_tienda.db');
const PRODUCTOS_JSON = path.join(__dirname, '..', '..', 'productos.json');

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Proveedores reales en Ecuador con información completa
const proveedoresEcuador = {
  'Tecnova S.A.': {
    direccion: 'Av. Carlos Luis Plaza Dañín, Guayaquil',
    telefono: '+593-4-2682500',
    email: 'ventas@tecnova.com.ec',
    especialidad: 'Distribuidora Bosch, repuestos originales',
  },
  ECUACOMPRA: {
    direccion: 'Av. 6 de Diciembre N24-253, Quito',
    telefono: '+593-2-2438700',
    email: 'info@ecuacompra.com',
    especialidad: 'Marketplace B2B, múltiples marcas',
  },
  'Maxcar Ecuador': {
    direccion: 'Av. Pedro Vicente Maldonado, Quito',
    telefono: '+593-2-3829500',
    email: 'ventas@maxcar.com.ec',
    especialidad: 'Brembo, KYB, Monroe oficial',
  },
  Disauto: {
    direccion: 'Av. Eloy Alfaro 4129, Quito',
    telefono: '+593-2-2464800',
    email: 'comercial@disauto.com.ec',
    especialidad: 'Gates, Continental, repuestos europeos',
  },
  'La Casa del Amortiguador': {
    direccion: 'Av. Pichincha E6-125, Quito',
    telefono: '+593-2-2550987',
    email: 'info@casaamortiguador.ec',
    especialidad: 'Monroe, KYB, Gabriel especialista',
  },
  'Motor Autoparts': {
    direccion: 'Av. Juan Tanca Marengo, Guayaquil',
    telefono: '+593-4-2595400',
    email: 'ventas@motorautoparts.ec',
    especialidad: 'GMB, NPW, bombas de agua japonesas',
  },
  'Mann Filter Ecuador': {
    direccion: 'Parque Industrial Pascuales, Guayaquil',
    telefono: '+593-4-2017800',
    email: 'info@mann-filter.ec',
    especialidad: 'Filtros Mann Filter exclusivo',
  },
  'Bosch Car Service Ecuador': {
    direccion: 'Av. República del Salvador N36-84, Quito',
    telefono: '+593-2-2459700',
    email: 'info@bosch.com.ec',
    especialidad: 'Bosch original y Aftermarket',
  },
};

function importarProductosBasico() {
  console.log('🔄 Iniciando importación básica de productos...');

  try {
    // Verificar que existe el archivo de productos
    if (!fs.existsSync(PRODUCTOS_JSON)) {
      throw new Error(`No se encontró el archivo productos.json en: ${PRODUCTOS_JSON}`);
    }

    // Leer datos del JSON
    const rawData = fs.readFileSync(PRODUCTOS_JSON, 'utf8');
    const catalogoData = JSON.parse(rawData);

    console.log(`📄 Archivo productos.json cargado correctamente`);

    // Conectar a la base de datos
    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    console.log('🔗 Conexión a la base de datos establecada');

    const now = new Date().toISOString();

    // Preparar statements para las tablas básicas
    const insertCategoria = db.prepare(`
      INSERT OR IGNORE INTO categorias (id, nombre, descripcion, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const insertProveedor = db.prepare(`
      INSERT OR IGNORE INTO proveedores (id, nombre, contacto, telefono, email, direccion, notas, activo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const insertProducto = db.prepare(`
      INSERT OR REPLACE INTO productos (id, codigo, nombre, descripcion, categoria_id, proveedor_id, precio_compra, precio_venta, stock, activo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    // Iniciar transacción
    const transaction = db.transaction(() => {
      // Crear proveedores mejorados
      console.log('🏪 Insertando proveedores especializados...');
      const proveedoresMap = new Map();

      Object.entries(proveedoresEcuador).forEach(([nombre, datos]) => {
        const proveedorId = generateId('prov');
        const notasCompletas = `${datos.especialidad}\nTel: ${datos.telefono}\nEmail: ${datos.email}`;

        insertProveedor.run(
          proveedorId,
          nombre,
          `${datos.telefono} - ${datos.email}`,
          datos.telefono,
          datos.email,
          datos.direccion,
          notasCompletas,
          now
        );

        proveedoresMap.set(nombre, proveedorId);
      });

      // Procesar cada categoría de productos
      let totalProductos = 0;

      catalogoData.catalogo_autopartes_ecuador.productos.forEach((categoria) => {
        const tipoProducto = categoria.tipo_producto;
        console.log(`📦 Procesando categoría: ${tipoProducto}`);

        // Crear o usar categoría existente
        const categoriaId = generateId('cat');
        insertCategoria.run(
          categoriaId,
          tipoProducto,
          `Productos relacionados con ${tipoProducto.toLowerCase()}`,
          now
        );

        // Procesar cada producto de la categoría
        categoria.ejemplos.forEach((producto) => {
          const productoId = generateId('prod');
          const sku = producto.sku_numero_parte_comun;

          // Calcular precios estimados basados en promedios ecuatorianos
          const precioBase = {
            'Sistemas de Frenos': { min: 45, max: 180 },
            'Sistemas de Suspensión': { min: 85, max: 320 },
            'Sistemas de Motor': { min: 35, max: 250 },
            'Sistemas de Inyección': { min: 120, max: 450 },
            Filtros: { min: 15, max: 65 },
          };

          const rango = precioBase[tipoProducto] || { min: 25, max: 150 };
          const precioCompra = rango.min + Math.random() * (rango.max - rango.min);
          const precioVenta = precioCompra * 1.45; // Margen 45%

          // Seleccionar un proveedor apropiado según la marca
          let proveedorId = null;
          const marca = producto.marca_producto.toLowerCase();

          if (marca.includes('bosch')) {
            proveedorId =
              proveedoresMap.get('Bosch Car Service Ecuador') || proveedoresMap.get('Tecnova S.A.');
          } else if (marca.includes('brembo')) {
            proveedorId = proveedoresMap.get('Maxcar Ecuador');
          } else if (marca.includes('monroe') || marca.includes('kyb')) {
            proveedorId = proveedoresMap.get('La Casa del Amortiguador');
          } else if (marca.includes('gates')) {
            proveedorId = proveedoresMap.get('Disauto');
          } else if (marca.includes('mann')) {
            proveedorId = proveedoresMap.get('Mann Filter Ecuador');
          } else if (marca.includes('gmb')) {
            proveedorId = proveedoresMap.get('Motor Autoparts');
          } else {
            // Proveedor por defecto
            proveedorId = proveedoresMap.get('ECUACOMPRA');
          }

          // Insertar producto principal
          insertProducto.run(
            productoId,
            sku,
            producto.nombre_producto,
            producto.descripcion_corta,
            categoriaId,
            proveedorId,
            Math.round(precioCompra * 100) / 100,
            Math.round(precioVenta * 100) / 100,
            Math.floor(Math.random() * 50) + 10, // Stock aleatorio 10-60
            now
          );

          totalProductos++;
        });
      });

      console.log(`✅ ${totalProductos} productos procesados`);
    });

    // Ejecutar transacción
    transaction();

    // Mostrar estadísticas finales
    const stats = {
      categorias: db.prepare('SELECT COUNT(*) as count FROM categorias').get().count,
      productos: db.prepare('SELECT COUNT(*) as count FROM productos WHERE activo = 1').get().count,
      proveedores: db.prepare('SELECT COUNT(*) as count FROM proveedores WHERE activo = 1').get()
        .count,
      valor_inventario:
        db
          .prepare('SELECT SUM(precio_venta * stock) as total FROM productos WHERE activo = 1')
          .get().total || 0,
    };

    console.log('\n🎉 Importación básica completada exitosamente!');
    console.log('📊 Estadísticas finales:');
    console.log(`   - Categorías: ${stats.categorias}`);
    console.log(`   - Productos activos: ${stats.productos}`);
    console.log(`   - Proveedores: ${stats.proveedores}`);
    console.log(`   - Valor total inventario: $${stats.valor_inventario.toFixed(2)}`);

    // Mostrar productos por categoría
    console.log('\n📂 Productos por categoría:');
    const productosPorCategoria = db
      .prepare(
        `
      SELECT 
        c.nombre as categoria,
        COUNT(p.id) as productos,
        ROUND(AVG(p.precio_venta), 2) as precio_promedio
      FROM categorias c
      INNER JOIN productos p ON c.id = p.categoria_id
      WHERE p.activo = 1
      GROUP BY c.id, c.nombre
      ORDER BY productos DESC
    `
      )
      .all();

    productosPorCategoria.forEach((cat) => {
      console.log(
        `   📦 ${cat.categoria}: ${cat.productos} productos (Promedio: $${cat.precio_promedio})`
      );
    });

    // Mostrar proveedores con más productos
    console.log('\n🏪 Proveedores principales:');
    const proveedoresConProductos = db
      .prepare(
        `
      SELECT 
        pr.nombre as proveedor,
        COUNT(p.id) as productos,
        ROUND(SUM(p.precio_venta * p.stock), 2) as valor_inventario
      FROM proveedores pr
      INNER JOIN productos p ON pr.id = p.proveedor_id
      WHERE p.activo = 1 AND pr.activo = 1
      GROUP BY pr.id, pr.nombre
      ORDER BY productos DESC
    `
      )
      .all();

    proveedoresConProductos.forEach((prov) => {
      console.log(
        `   🏪 ${prov.proveedor}: ${prov.productos} productos ($${prov.valor_inventario})`
      );
    });

    db.close();
    console.log('✅ Base de datos cerrada correctamente');
  } catch (error) {
    console.error('❌ Error durante la importación:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  importarProductosBasico();
}

module.exports = { importarProductosBasico };
