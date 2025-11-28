#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════
 * 🧹 HERRAMIENTA 4: LIMPIEZA Y MANTENIMIENTO
 * ═══════════════════════════════════════════════════════════
 *
 * Opciones:
 * 1. Eliminar datos de prueba
 * 2. Limpiar tablas vacías
 * 3. Optimizar todas las DBs
 * 4. Resetear stocks a 0
 * 5. Eliminar compras/ventas de un período
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const MASTER_DB = path.join(__dirname, '..', 'backend', 'data', 'gestor_tienda.db');
const DATA_DIR = path.join(__dirname, '..', 'backend', 'data');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function pregunta(texto) {
  return new Promise((resolve) => {
    rl.question(texto, resolve);
  });
}

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════');
console.log('\x1b[32m%s\x1b[0m', '🧹 LIMPIEZA Y MANTENIMIENTO DEL SISTEMA');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════\n');

async function main() {
  const masterDb = new Database(MASTER_DB);

  try {
    console.log('OPCIONES DE MANTENIMIENTO:\n');
    console.log('1. Eliminar datos de prueba (productos, clientes test)');
    console.log('2. Limpiar registros huérfanos (referencias rotas)');
    console.log('3. Optimizar todas las bases de datos (VACUUM)');
    console.log('4. Resetear stocks a 0 (todos los productos)');
    console.log('5. Eliminar compras/ventas por fecha');
    console.log('6. Eliminar todas las compras/ventas (PELIGROSO)');
    console.log('7. Salir\n');

    const opcion = await pregunta('Seleccione una opción (1-7): ');
    console.log('');

    switch (opcion.trim()) {
      case '1':
        await eliminarDatosPrueba(masterDb);
        break;
      case '2':
        await limpiarHuerfanos(masterDb);
        break;
      case '3':
        await optimizarDBs(masterDb);
        break;
      case '4':
        await resetearStocks(masterDb);
        break;
      case '5':
        await eliminarPorFecha(masterDb);
        break;
      case '6':
        await eliminarTodo(masterDb);
        break;
      case '7':
        console.log('Saliendo...\n');
        break;
      default:
        console.log('\x1b[31mOpción no válida.\x1b[0m\n');
    }
  } catch (error) {
    console.error('\n\x1b[31m❌ ERROR:\x1b[0m', error.message);
    process.exit(1);
  } finally {
    masterDb.close();
    rl.close();
  }
}

async function eliminarDatosPrueba(masterDb) {
  console.log('🧹 ELIMINAR DATOS DE PRUEBA\n');

  const negocios = masterDb.prepare('SELECT * FROM negocios').all();

  console.log('⚠️  Se eliminarán registros que contengan:');
  console.log('   • "test", "prueba", "demo" en nombres');
  console.log('   • Productos con código "TEST-XXX"');
  console.log('   • Clientes con nombre "Test"\n');

  const confirmar = await pregunta('¿Continuar? (s/n): ');
  if (confirmar.toLowerCase() !== 's') {
    console.log('Operación cancelada.\n');
    return;
  }

  console.log('\n🧹 Limpiando datos de prueba...\n');

  let totalEliminados = 0;

  negocios.forEach((negocio) => {
    const dbFile = path.join(DATA_DIR, `${negocio.id}.db`);
    if (!fs.existsSync(dbFile)) return;

    try {
      const tenantDb = new Database(dbFile);

      // Eliminar productos de prueba
      const productos = tenantDb
        .prepare(
          `
        DELETE FROM productos 
        WHERE LOWER(nombre) LIKE '%test%' 
        OR LOWER(nombre) LIKE '%prueba%' 
        OR LOWER(codigo) LIKE 'test%'
      `
        )
        .run();

      // Eliminar clientes de prueba
      const clientes = tenantDb
        .prepare(
          `
        DELETE FROM clientes 
        WHERE LOWER(nombre) LIKE '%test%' 
        OR LOWER(nombre) LIKE '%prueba%'
      `
        )
        .run();

      const total = productos.changes + clientes.changes;

      if (total > 0) {
        console.log(`\x1b[32m✅\x1b[0m ${negocio.nombre}: ${total} registros eliminados`);
        totalEliminados += total;
      }

      tenantDb.close();
    } catch (error) {
      console.log(`\x1b[31m❌\x1b[0m ${negocio.nombre}: ${error.message}`);
    }
  });

  console.log(`\n\x1b[32m✅ Total eliminados: ${totalEliminados} registros\x1b[0m\n`);
}

async function limpiarHuerfanos(masterDb) {
  console.log('🧹 LIMPIAR REGISTROS HUÉRFANOS\n');

  console.log('Limpiando referencias rotas:\n');
  console.log('   • Ventas_detalle sin producto');
  console.log('   • Compras_detalle sin producto');
  console.log('   • Ventas sin cliente válido\n');

  const confirmar = await pregunta('¿Continuar? (s/n): ');
  if (confirmar.toLowerCase() !== 's') {
    console.log('Operación cancelada.\n');
    return;
  }

  console.log('\n🧹 Limpiando...\n');

  const negocios = masterDb.prepare('SELECT * FROM negocios').all();
  let totalEliminados = 0;

  negocios.forEach((negocio) => {
    const dbFile = path.join(DATA_DIR, `${negocio.id}.db`);
    if (!fs.existsSync(dbFile)) return;

    try {
      const tenantDb = new Database(dbFile);

      // Limpiar ventas_detalle huérfanas
      const ventasDetalle = tenantDb
        .prepare(
          `
        DELETE FROM ventas_detalle 
        WHERE producto_id IS NOT NULL 
        AND producto_id NOT IN (SELECT id FROM productos)
      `
        )
        .run();

      // Limpiar compras_detalle huérfanas
      const comprasDetalle = tenantDb
        .prepare(
          `
        DELETE FROM compras_detalle 
        WHERE producto_id IS NOT NULL 
        AND producto_id NOT IN (SELECT id FROM productos)
      `
        )
        .run();

      const total = ventasDetalle.changes + comprasDetalle.changes;

      if (total > 0) {
        console.log(`\x1b[32m✅\x1b[0m ${negocio.nombre}: ${total} registros huérfanos eliminados`);
        totalEliminados += total;
      }

      tenantDb.close();
    } catch (error) {
      console.log(`\x1b[31m❌\x1b[0m ${negocio.nombre}: ${error.message}`);
    }
  });

  console.log(`\n\x1b[32m✅ Total eliminados: ${totalEliminados} registros huérfanos\x1b[0m\n`);
}

async function optimizarDBs(masterDb) {
  console.log('⚡ OPTIMIZAR BASES DE DATOS\n');

  const confirmar = await pregunta('¿Ejecutar VACUUM en todas las DBs? (s/n): ');
  if (confirmar.toLowerCase() !== 's') {
    console.log('Operación cancelada.\n');
    return;
  }

  console.log('\n⚡ Optimizando...\n');

  const negocios = masterDb.prepare('SELECT * FROM negocios').all();

  negocios.forEach((negocio) => {
    const dbFile = path.join(DATA_DIR, `${negocio.id}.db`);
    if (!fs.existsSync(dbFile)) return;

    try {
      const antes = fs.statSync(dbFile).size;
      const tenantDb = new Database(dbFile);

      tenantDb.exec('VACUUM');
      tenantDb.exec('ANALYZE');

      tenantDb.close();

      const despues = fs.statSync(dbFile).size;
      const ahorro = (((antes - despues) / antes) * 100).toFixed(2);

      console.log(
        `\x1b[32m✅\x1b[0m ${negocio.nombre}: ${(antes / 1024).toFixed(2)} KB → ${(despues / 1024).toFixed(2)} KB (-${ahorro}%)`
      );
    } catch (error) {
      console.log(`\x1b[31m❌\x1b[0m ${negocio.nombre}: ${error.message}`);
    }
  });

  console.log('\n\x1b[32m✅ Optimización completada\x1b[0m\n');
}

async function resetearStocks(masterDb) {
  console.log('\x1b[31m⚠️  RESETEAR TODOS LOS STOCKS A 0\x1b[0m\n');

  console.log('⚠️  ADVERTENCIA: Esta acción pondrá el stock de TODOS los productos en 0\n');

  const confirmar1 = await pregunta('Escriba "RESETEAR" para confirmar: ');
  if (confirmar1 !== 'RESETEAR') {
    console.log('Operación cancelada.\n');
    return;
  }

  console.log('\n🔄 Reseteando stocks...\n');

  const negocios = masterDb.prepare('SELECT * FROM negocios').all();
  let totalProductos = 0;

  negocios.forEach((negocio) => {
    const dbFile = path.join(DATA_DIR, `${negocio.id}.db`);
    if (!fs.existsSync(dbFile)) return;

    try {
      const tenantDb = new Database(dbFile);

      const result = tenantDb
        .prepare(
          `
        UPDATE productos SET stock = 0, updated_at = datetime('now')
      `
        )
        .run();

      if (result.changes > 0) {
        console.log(`\x1b[32m✅\x1b[0m ${negocio.nombre}: ${result.changes} productos`);
        totalProductos += result.changes;
      }

      tenantDb.close();
    } catch (error) {
      console.log(`\x1b[31m❌\x1b[0m ${negocio.nombre}: ${error.message}`);
    }
  });

  console.log(`\n\x1b[32m✅ Stocks reseteados: ${totalProductos} productos\x1b[0m\n`);
}

async function eliminarPorFecha(masterDb) {
  console.log('🗑️  ELIMINAR COMPRAS/VENTAS POR FECHA\n');

  const fechaDesde = await pregunta('Fecha desde (YYYY-MM-DD): ');
  const fechaHasta = await pregunta('Fecha hasta (YYYY-MM-DD): ');

  console.log(`\n⚠️  Se eliminarán compras y ventas entre ${fechaDesde} y ${fechaHasta}\n`);

  const confirmar = await pregunta('¿Continuar? (s/n): ');
  if (confirmar.toLowerCase() !== 's') {
    console.log('Operación cancelada.\n');
    return;
  }

  console.log('\n🗑️  Eliminando registros...\n');

  const negocios = masterDb.prepare('SELECT * FROM negocios').all();
  let totalEliminados = 0;

  negocios.forEach((negocio) => {
    const dbFile = path.join(DATA_DIR, `${negocio.id}.db`);
    if (!fs.existsSync(dbFile)) return;

    try {
      const tenantDb = new Database(dbFile);

      const compras = tenantDb
        .prepare(
          `
        DELETE FROM compras 
        WHERE fecha >= ? AND fecha <= ?
      `
        )
        .run(fechaDesde, fechaHasta);

      const ventas = tenantDb
        .prepare(
          `
        DELETE FROM ventas 
        WHERE fecha >= ? AND fecha <= ?
      `
        )
        .run(fechaDesde, fechaHasta);

      const total = compras.changes + ventas.changes;

      if (total > 0) {
        console.log(`\x1b[32m✅\x1b[0m ${negocio.nombre}: ${total} registros`);
        totalEliminados += total;
      }

      tenantDb.close();
    } catch (error) {
      console.log(`\x1b[31m❌\x1b[0m ${negocio.nombre}: ${error.message}`);
    }
  });

  console.log(`\n\x1b[32m✅ Total eliminados: ${totalEliminados} registros\x1b[0m\n`);
}

async function eliminarTodo(masterDb) {
  console.log('\x1b[31m🗑️  ELIMINAR TODAS LAS COMPRAS Y VENTAS\x1b[0m\n');

  console.log('⚠️  ⚠️  ⚠️  PELIGRO ⚠️  ⚠️  ⚠️\n');
  console.log('Esta acción eliminará TODAS las compras y ventas del sistema.\n');
  console.log('Los productos NO se eliminarán, pero su stock NO se revertirá.\n');

  const confirmar1 = await pregunta('Primera confirmación - Escriba "ELIMINAR TODO": ');
  if (confirmar1 !== 'ELIMINAR TODO') {
    console.log('Operación cancelada.\n');
    return;
  }

  const confirmar2 = await pregunta('Segunda confirmación - Escriba "SI ESTOY SEGURO": ');
  if (confirmar2 !== 'SI ESTOY SEGURO') {
    console.log('Operación cancelada.\n');
    return;
  }

  console.log('\n🗑️  Eliminando todos los registros...\n');

  const negocios = masterDb.prepare('SELECT * FROM negocios').all();
  let totalEliminados = 0;

  negocios.forEach((negocio) => {
    const dbFile = path.join(DATA_DIR, `${negocio.id}.db`);
    if (!fs.existsSync(dbFile)) return;

    try {
      const tenantDb = new Database(dbFile);

      tenantDb.prepare('DELETE FROM compras_detalle').run();
      const compras = tenantDb.prepare('DELETE FROM compras').run();

      tenantDb.prepare('DELETE FROM ventas_detalle').run();
      const ventas = tenantDb.prepare('DELETE FROM ventas').run();

      const total = compras.changes + ventas.changes;

      console.log(`\x1b[32m✅\x1b[0m ${negocio.nombre}: ${total} registros eliminados`);
      totalEliminados += total;

      tenantDb.close();
    } catch (error) {
      console.log(`\x1b[31m❌\x1b[0m ${negocio.nombre}: ${error.message}`);
    }
  });

  console.log(`\n\x1b[32m✅ Total eliminados: ${totalEliminados} registros\x1b[0m\n`);
}

main();
