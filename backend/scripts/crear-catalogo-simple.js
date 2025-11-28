#!/usr/bin/env node
/**
 * Script simplificado para crear catálogo básico sin complejidades
 */

const Database = require('better-sqlite3');

function main() {
  try {
    console.log('🚗 Iniciando creación de catálogo básico...');

    const path = require('path');
    const fs = require('fs');
    const rawEnvPath = process.env.DB_PATH;
    const sanitizedEnvPath = rawEnvPath ? rawEnvPath.split(/\r?\n/)[0].trim() : undefined;
    const dbPath =
      sanitizedEnvPath && sanitizedEnvPath.length > 0
        ? sanitizedEnvPath
        : path.resolve(__dirname, '..', 'data', 'gestor_tienda.db');
    console.log(`📁 Ruta base de datos: ${dbPath}`);

    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      throw new Error(`El directorio de la base de datos no existe: ${dbDir}`);
    }

    try {
      fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (accessError) {
      console.warn(
        `⚠️  No se pudo verificar acceso de lectura/escritura a la base de datos (${accessError.message}).`
      );
    }

    const db = new Database(dbPath);
    console.log('✅ Base de datos conectada');

    db.pragma('foreign_keys = ON');

    const now = new Date().toISOString();

    // Verificar si ya existen productos
    const productCount = db.prepare('SELECT COUNT(*) as count FROM productos').get();
    console.log(`📊 Productos actuales en BD: ${productCount.count}`);

    // Insertar algunas categorías básicas si no existen
    const insertCategoria = db.prepare(`
      INSERT INTO categorias (id, nombre, descripcion, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const categorias = [
      {
        id: 'cat_aceites',
        nombre: 'Aceites y Lubricantes',
        descripcion: 'Aceites para motor y transmisión',
      },
      {
        id: 'cat_filtros',
        nombre: 'Filtros',
        descripcion: 'Filtros de aceite, aire y combustible',
      },
      {
        id: 'cat_frenos',
        nombre: 'Sistema de Frenos',
        descripcion: 'Pastillas, discos y líquidos',
      },
      { id: 'cat_suspension', nombre: 'Suspensión', descripcion: 'Amortiguadores y resortes' },
      { id: 'cat_neumaticos', nombre: 'Neumáticos', descripcion: 'Neumáticos y llantas' },
      { id: 'cat_bateria', nombre: 'Baterías', descripcion: 'Baterías de arranque' },
    ];

    const categoriaIdPorNombre = {};
    const buscarCategoriaPorNombre = db.prepare('SELECT id FROM categorias WHERE nombre = ?');
    const buscarCategoriaPorId = db.prepare('SELECT id FROM categorias WHERE id = ?');

    categorias.forEach((cat) => {
      const existentePorNombre = buscarCategoriaPorNombre.get(cat.nombre);
      const existentePorId = buscarCategoriaPorId.get(cat.id);

      if (existentePorNombre) {
        categoriaIdPorNombre[cat.nombre] = existentePorNombre.id;
        return;
      }

      if (existentePorId) {
        categoriaIdPorNombre[cat.nombre] = existentePorId.id;
        return;
      }

      try {
        insertCategoria.run(cat.id, cat.nombre, cat.descripcion, now);
        categoriaIdPorNombre[cat.nombre] = cat.id;
      } catch (catError) {
        console.warn(`⚠️  No se pudo crear la categoría "${cat.nombre}": ${catError.message}`);
      }
    });

    console.log('✅ Categorías básicas creadas o reutilizadas');

    // Insertar algunos productos básicos
    const insertProducto = db.prepare(`
      INSERT OR IGNORE INTO productos (id, codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock, activo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const productos = [
      {
        id: 'prod_ace_001',
        codigo: 'ACE-5W30',
        nombre: 'Aceite Motor 5W-30 Sintético',
        descripcion: 'Aceite sintético premium 4 litros',
        categoriaNombre: 'Aceites y Lubricantes',
        precioCompra: 25.5,
        precioVenta: 38.0,
        stock: 50,
      },
      {
        id: 'prod_fil_001',
        codigo: 'FIL-ACE',
        nombre: 'Filtro de Aceite Universal',
        descripcion: 'Filtro aceite compatible múltiples vehículos',
        categoriaNombre: 'Filtros',
        precioCompra: 8.0,
        precioVenta: 12.5,
        stock: 100,
      },
      {
        id: 'prod_past_001',
        codigo: 'PAST-DEL',
        nombre: 'Pastillas Freno Delanteras',
        descripcion: 'Pastillas cerámicas alta calidad',
        categoriaNombre: 'Sistema de Frenos',
        precioCompra: 45.0,
        precioVenta: 68.0,
        stock: 24,
      },
      {
        id: 'prod_amor_001',
        codigo: 'AMOR-DEL',
        nombre: 'Amortiguador Delantero',
        descripcion: 'Amortiguador hidráulico premium',
        categoriaNombre: 'Suspensión',
        precioCompra: 75.0,
        precioVenta: 115.0,
        stock: 12,
      },
      {
        id: 'prod_neu_001',
        codigo: 'NEU-185',
        nombre: 'Neumático 185/65R14',
        descripcion: 'Neumático radial all season',
        categoriaNombre: 'Neumáticos',
        precioCompra: 65.0,
        precioVenta: 95.0,
        stock: 20,
      },
      {
        id: 'prod_bat_001',
        codigo: 'BAT-70AH',
        nombre: 'Batería 70Ah 12V',
        descripcion: 'Batería libre mantenimiento',
        categoriaNombre: 'Baterías',
        precioCompra: 85.0,
        precioVenta: 125.0,
        stock: 8,
      },
    ];

    productos.forEach((prod) => {
      const categoriaId = categoriaIdPorNombre[prod.categoriaNombre];

      if (!categoriaId) {
        console.warn(
          `⚠️  Categoría no encontrada para el producto "${prod.nombre}" (${prod.categoriaNombre}). Se omite.`
        );
        return;
      }

      insertProducto.run(
        prod.id,
        prod.codigo,
        prod.nombre,
        prod.descripcion,
        categoriaId,
        prod.precioCompra,
        prod.precioVenta,
        prod.stock,
        now
      );
    });

    console.log('✅ Productos básicos agregados');

    // Mostrar estadísticas
    const stats = {
      categorias: db.prepare('SELECT COUNT(*) as count FROM categorias').get().count,
      productos: db.prepare('SELECT COUNT(*) as count FROM productos').get().count,
      valor_inventario: db
        .prepare('SELECT SUM(precio_venta * stock) as total FROM productos WHERE activo = 1')
        .get().total,
    };

    console.log('📊 Estadísticas finales:');
    console.log(`   - Categorías: ${stats.categorias}`);
    console.log(`   - Productos: ${stats.productos}`);
    console.log(`   - Valor inventario: $${(stats.valor_inventario || 0).toFixed(2)}`);

    db.close();
    console.log('🎉 Catálogo básico creado exitosamente!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
