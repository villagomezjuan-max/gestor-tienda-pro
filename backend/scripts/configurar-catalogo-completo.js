#!/usr/bin/env node
/**
 * Script maestro para importar y configurar el catálogo técnico completo
 * Ejecuta importación de productos JSON + productos ecuatorianos + verificaciones
 * Gestor Tienda Pro v2.0
 */

const path = require('path');

const Database = require('better-sqlite3');

const { ampliarCatalogoProductos } = require('./ampliar-catalogo-productos');
const { importarProductosMejorados } = require('./import-productos-mejorados');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'gestor_tienda.db');

function verificarEstructuraBD() {
  console.log('🔍 Verificando estructura de base de datos...');

  const db = new Database(DB_PATH);

  try {
    // Verificar tablas del catálogo técnico
    const tablasRequeridas = [
      'marcas_vehiculos',
      'modelos_vehiculos',
      'categorias_tecnicas',
      'productos',
      'especificaciones_tecnicas',
      'numeros_parte',
      'productos_compatibilidad',
      'proveedores',
    ];

    const tablasExistentes = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `
      )
      .all()
      .map((t) => t.name);

    const tablasFaltantes = tablasRequeridas.filter((tabla) => !tablasExistentes.includes(tabla));

    if (tablasFaltantes.length > 0) {
      console.log('❌ Faltan las siguientes tablas del catálogo técnico:');
      tablasFaltantes.forEach((tabla) => console.log(`   - ${tabla}`));
      console.log('\n💡 Ejecute primero el esquema del catálogo técnico:');
      console.log('   node backend/scripts/init-database.js');
      console.log('   sqlite3 data/gestor_tienda.db < backend/schema_catalogo_tecnico.sql');
      return false;
    }

    console.log('✅ Todas las tablas requeridas existen');

    // Verificar índices importantes
    const indicesImportantes = [
      'idx_productos_codigo',
      'idx_marcas_vehiculos_nombre',
      'idx_compatibilidad_marca',
      'idx_numeros_parte_numero',
    ];

    const indicesExistentes = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
    `
      )
      .all()
      .map((i) => i.name);

    const indicesFaltantes = indicesImportantes.filter(
      (indice) => !indicesExistentes.includes(indice)
    );

    if (indicesFaltantes.length > 0) {
      console.log('⚠️  Faltan algunos índices importantes:');
      indicesFaltantes.forEach((indice) => console.log(`   - ${indice}`));
    } else {
      console.log('✅ Índices principales verificados');
    }

    return true;
  } catch (error) {
    console.error('❌ Error verificando estructura:', error.message);
    return false;
  } finally {
    db.close();
  }
}

function ejecutarReporteCompleto() {
  console.log('\n📊 Generando reporte completo del catálogo...');

  const db = new Database(DB_PATH);

  try {
    // Estadísticas generales
    const estadisticas = {
      marcas_vehiculos: db
        .prepare('SELECT COUNT(*) as count FROM marcas_vehiculos WHERE activo = 1')
        .get().count,
      modelos_vehiculos: db
        .prepare('SELECT COUNT(*) as count FROM modelos_vehiculos WHERE activo = 1')
        .get().count,
      categorias_tecnicas: db.prepare('SELECT COUNT(*) as count FROM categorias').get().count,
      productos_total: db.prepare('SELECT COUNT(*) as count FROM productos WHERE activo = 1').get()
        .count,
      productos_con_oem: db
        .prepare(
          `
        SELECT COUNT(DISTINCT p.id) as count 
        FROM productos p 
        INNER JOIN numeros_parte np ON p.id = np.producto_id 
        WHERE np.tipo_parte = 'OEM' AND p.activo = 1
      `
        )
        .get().count,
      especificaciones_tecnicas: db
        .prepare('SELECT COUNT(*) as count FROM especificaciones_tecnicas')
        .get().count,
      compatibilidades: db
        .prepare('SELECT COUNT(*) as count FROM productos_compatibilidad WHERE verificado = 1')
        .get().count,
      proveedores: db.prepare('SELECT COUNT(*) as count FROM proveedores WHERE activo = 1').get()
        .count,
    };

    console.log('📈 Estadísticas generales:');
    console.log(`   🚗 Marcas de vehículos: ${estadisticas.marcas_vehiculos}`);
    console.log(`   🚙 Modelos de vehículos: ${estadisticas.modelos_vehiculos}`);
    console.log(`   📂 Categorías técnicas: ${estadisticas.categorias_tecnicas}`);
    console.log(`   📦 Productos activos: ${estadisticas.productos_total}`);
    console.log(`   🔧 Productos con OEM: ${estadisticas.productos_con_oem}`);
    console.log(`   📋 Especificaciones técnicas: ${estadisticas.especificaciones_tecnicas}`);
    console.log(`   🔗 Compatibilidades verificadas: ${estadisticas.compatibilidades}`);
    console.log(`   🏪 Proveedores activos: ${estadisticas.proveedores}`);

    // Top 5 marcas con más productos
    console.log('\n🏆 Top 5 marcas de repuestos:');
    const topMarcas = db
      .prepare(
        `
      SELECT 
        CASE 
          WHEN np.fabricante != 'Original' THEN np.fabricante
          ELSE 'Productos OEM'
        END as marca,
        COUNT(DISTINCT p.id) as productos
      FROM productos p
      INNER JOIN numeros_parte np ON p.id = np.producto_id
      WHERE p.activo = 1
      GROUP BY marca
      ORDER BY productos DESC
      LIMIT 5
    `
      )
      .all();

    topMarcas.forEach((marca, index) => {
      console.log(`   ${index + 1}. ${marca.marca}: ${marca.productos} productos`);
    });

    // Categorías con más productos
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

    // Vehículos con más compatibilidades
    console.log('\n🚗 Vehículos con más repuestos disponibles:');
    const vehiculosCompatibles = db
      .prepare(
        `
      SELECT 
        mv.nombre as marca,
        mdv.nombre as modelo,
        COUNT(DISTINCT pc.producto_id) as repuestos_disponibles
      FROM productos_compatibilidad pc
      INNER JOIN marcas_vehiculos mv ON pc.marca_vehiculo_id = mv.id
      INNER JOIN modelos_vehiculos mdv ON pc.modelo_vehiculo_id = mdv.id
      WHERE mv.activo = 1 AND pc.verificado = 1
      GROUP BY mv.id, mdv.id
      ORDER BY repuestos_disponibles DESC
      LIMIT 8
    `
      )
      .all();

    vehiculosCompatibles.forEach((vehiculo) => {
      console.log(
        `   🚙 ${vehiculo.marca} ${vehiculo.modelo}: ${vehiculo.repuestos_disponibles} repuestos`
      );
    });

    // Valor total del inventario
    const valorInventario = db
      .prepare(
        `
      SELECT 
        SUM(precio_compra * stock) as valor_compra,
        SUM(precio_venta * stock) as valor_venta,
        SUM(stock) as unidades_total
      FROM productos 
      WHERE activo = 1
    `
      )
      .get();

    console.log('\n💰 Valor del inventario:');
    console.log(`   💵 Valor de compra: $${(valorInventario.valor_compra || 0).toFixed(2)}`);
    console.log(`   💸 Valor de venta: $${(valorInventario.valor_venta || 0).toFixed(2)}`);
    console.log(`   📊 Unidades totales: ${valorInventario.unidades_total || 0}`);
    console.log(
      `   📈 Margen promedio: ${(((valorInventario.valor_venta - valorInventario.valor_compra) / valorInventario.valor_compra) * 100).toFixed(1)}%`
    );

    // Productos sin especificaciones técnicas
    const sinEspecificaciones = db
      .prepare(
        `
      SELECT COUNT(p.id) as count
      FROM productos p
      LEFT JOIN especificaciones_tecnicas et ON p.id = et.producto_id
      WHERE et.producto_id IS NULL AND p.activo = 1
    `
      )
      .get().count;

    if (sinEspecificaciones > 0) {
      console.log(`\n⚠️  Productos sin especificaciones técnicas: ${sinEspecificaciones}`);
    }

    // Productos sin números OEM
    const sinOEM = db
      .prepare(
        `
      SELECT COUNT(DISTINCT p.id) as count
      FROM productos p
      LEFT JOIN numeros_parte np ON p.id = np.producto_id AND np.tipo_parte = 'OEM'
      WHERE np.producto_id IS NULL AND p.activo = 1
    `
      )
      .get().count;

    if (sinOEM > 0) {
      console.log(`⚠️  Productos sin número OEM: ${sinOEM}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error generando reporte:', error.message);
    return false;
  } finally {
    db.close();
  }
}

async function configurarCatalogoCompleto() {
  console.log('🚀 Configurando catálogo técnico completo para Ecuador...\n');

  try {
    // 1. Verificar estructura de base de datos
    if (!verificarEstructuraBD()) {
      console.log('❌ La estructura de base de datos no está completa');
      process.exit(1);
    }

    console.log('');

    // 2. Importar productos del JSON con datos mejorados
    console.log('📥 Paso 1: Importando productos del archivo JSON...');
    await importarProductosMejorados();

    console.log('\n');

    // 3. Ampliar con productos específicos de Ecuador
    console.log('📥 Paso 2: Ampliando con productos específicos para Ecuador...');
    await ampliarCatalogoProductos();

    console.log('\n');

    // 4. Generar reporte completo
    console.log('📊 Paso 3: Generando reporte del catálogo...');
    ejecutarReporteCompleto();

    console.log('\n🎉 ¡Configuración del catálogo técnico completada exitosamente!');
    console.log('\n💡 Próximos pasos recomendados:');
    console.log('   1. Revisar y ajustar precios según tu margen deseado');
    console.log('   2. Verificar información de proveedores y actualizar contactos');
    console.log('   3. Añadir fotos de productos desde el panel de administración');
    console.log('   4. Configurar alertas de stock mínimo');
    console.log('   5. Entrenar al personal en el uso del nuevo catálogo técnico');
  } catch (error) {
    console.error('\n❌ Error durante la configuración:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  configurarCatalogoCompleto();
}

module.exports = {
  configurarCatalogoCompleto,
  verificarEstructuraBD,
  ejecutarReporteCompleto,
};
