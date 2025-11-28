#!/usr/bin/env node
/**
 * Script de debug para identificar problemas en la importación
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'gestor_tienda.db');
const PRODUCTOS_JSON = path.join(__dirname, '..', '..', 'productos.json');

function debugImport() {
  console.log('🔍 Debug de importación...');

  try {
    // Conectar a la base de datos
    const db = new Database(DB_PATH);

    // Desactivar claves foráneas temporalmente para debug
    db.pragma('foreign_keys = OFF');
    console.log('⚠️  Claves foráneas desactivadas para debug');

    const now = new Date().toISOString();

    // Verificar datos existentes
    console.log('\n📊 Estado actual de la base de datos:');
    const stats = {
      categorias: db.prepare('SELECT COUNT(*) as count FROM categorias').get().count,
      productos: db.prepare('SELECT COUNT(*) as count FROM productos').get().count,
      proveedores: db.prepare('SELECT COUNT(*) as count FROM proveedores').get().count,
    };

    console.log(`   - Categorías existentes: ${stats.categorias}`);
    console.log(`   - Productos existentes: ${stats.productos}`);
    console.log(`   - Proveedores existentes: ${stats.proveedores}`);

    // Mostrar algunas categorías existentes
    console.log('\n📂 Categorías existentes:');
    const categoriasExistentes = db.prepare('SELECT id, nombre FROM categorias LIMIT 5').all();
    categoriasExistentes.forEach((cat) => {
      console.log(`   - ${cat.id}: ${cat.nombre}`);
    });

    // Probar insertar una categoría simple
    console.log('\n🧪 Probando insertar categoría de prueba...');
    const insertCategoria = db.prepare(`
      INSERT OR IGNORE INTO categorias (id, nombre, descripcion, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const categoriaTestId = `cat_test_${Date.now()}`;
    const result = insertCategoria.run(
      categoriaTestId,
      'Categoría Test',
      'Categoría de prueba para debug',
      now
    );

    console.log(`✅ Categoría test insertada: ${result.changes} cambios`);

    // Probar insertar un proveedor simple
    console.log('\n🧪 Probando insertar proveedor de prueba...');
    const insertProveedor = db.prepare(`
      INSERT OR IGNORE INTO proveedores (id, nombre, contacto, telefono, email, direccion, notas, activo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const proveedorTestId = `prov_test_${Date.now()}`;
    const resultProv = insertProveedor.run(
      proveedorTestId,
      'Proveedor Test',
      'Contacto test',
      '+593-9-0000000',
      'test@test.com',
      'Dirección test',
      'Notas test',
      now
    );

    console.log(`✅ Proveedor test insertado: ${resultProv.changes} cambios`);

    // Probar insertar un producto simple
    console.log('\n🧪 Probando insertar producto de prueba...');
    const insertProducto = db.prepare(`
      INSERT OR IGNORE INTO productos (id, codigo, nombre, descripcion, categoria_id, proveedor_id, precio_compra, precio_venta, stock, activo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const productoTestId = `prod_test_${Date.now()}`;
    const resultProd = insertProducto.run(
      productoTestId,
      'TEST-001',
      'Producto Test',
      'Producto de prueba para debug',
      categoriaTestId, // Usar la categoría que acabamos de crear
      proveedorTestId, // Usar el proveedor que acabamos de crear
      25.0,
      35.0,
      10,
      now
    );

    console.log(`✅ Producto test insertado: ${resultProd.changes} cambios`);

    // Leer el JSON y mostrar estructura
    if (fs.existsSync(PRODUCTOS_JSON)) {
      console.log('\n📄 Estructura del JSON:');
      const rawData = fs.readFileSync(PRODUCTOS_JSON, 'utf8');
      const catalogoData = JSON.parse(rawData);

      console.log(
        `   - Productos en JSON: ${catalogoData.catalogo_autopartes_ecuador.productos.length} categorías`
      );

      catalogoData.catalogo_autopartes_ecuador.productos.forEach((categoria) => {
        console.log(`   - ${categoria.tipo_producto}: ${categoria.ejemplos.length} productos`);
      });

      // Probar insertar el primer producto del JSON
      console.log('\n🧪 Probando insertar primer producto del JSON...');
      const primerCategoria = catalogoData.catalogo_autopartes_ecuador.productos[0];
      const primerProducto = primerCategoria.ejemplos[0];

      console.log(`Intentando insertar: ${primerProducto.nombre_producto}`);

      // Crear categoría para este producto
      const categoriaJsonId = `cat_json_${Date.now()}`;
      insertCategoria.run(
        categoriaJsonId,
        primerCategoria.tipo_producto,
        `Productos de ${primerCategoria.tipo_producto.toLowerCase()}`,
        now
      );

      // Crear producto
      const productoJsonId = `prod_json_${Date.now()}`;
      const resultJson = insertProducto.run(
        productoJsonId,
        primerProducto.sku_numero_parte_comun,
        primerProducto.nombre_producto,
        primerProducto.descripcion_corta,
        categoriaJsonId,
        null, // Sin proveedor por ahora
        45.0, // Precio de ejemplo
        65.0, // Precio de ejemplo
        15, // Stock de ejemplo
        now
      );

      console.log(`✅ Producto JSON insertado: ${resultJson.changes} cambios`);
    } else {
      console.log('❌ No se encontró el archivo productos.json');
    }

    // Estadísticas finales
    console.log('\n📊 Estado final de la base de datos:');
    const statsFinal = {
      categorias: db.prepare('SELECT COUNT(*) as count FROM categorias').get().count,
      productos: db.prepare('SELECT COUNT(*) as count FROM productos').get().count,
      proveedores: db.prepare('SELECT COUNT(*) as count FROM proveedores').get().count,
    };

    console.log(
      `   - Categorías: ${statsFinal.categorias} (incremento: +${statsFinal.categorias - stats.categorias})`
    );
    console.log(
      `   - Productos: ${statsFinal.productos} (incremento: +${statsFinal.productos - stats.productos})`
    );
    console.log(
      `   - Proveedores: ${statsFinal.proveedores} (incremento: +${statsFinal.proveedores - stats.proveedores})`
    );

    db.close();
    console.log('\n✅ Debug completado exitosamente');
  } catch (error) {
    console.error('❌ Error durante el debug:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  debugImport();
}

module.exports = { debugImport };
