/**
 * VALIDADOR DE INTEGRIDAD DEL MÓDULO TALLER
 *
 * Verifica que todas las relaciones de las tablas estén correctamente configuradas
 * y que no haya datos huérfanos o referencias rotas
 */

const path = require('path');

const Database = require('better-sqlite3');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function verificarIntegridadTaller(dbPath) {
  log('\n🔍 VERIFICANDO INTEGRIDAD DEL MÓDULO TALLER', 'cyan');
  log('='.repeat(80), 'cyan');

  const db = new Database(dbPath);
  const errores = [];
  const advertencias = [];

  try {
    // 1. Verificar vehículos sin cliente
    log('\n1️⃣  Verificando vehículos...', 'cyan');
    const vehiculosSinCliente = db
      .prepare(
        `
      SELECT v.id, v.marca, v.modelo, v.placa
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE c.id IS NULL
    `
      )
      .all();

    if (vehiculosSinCliente.length > 0) {
      errores.push(`${vehiculosSinCliente.length} vehículos sin cliente válido`);
      vehiculosSinCliente.forEach((v) => {
        log(
          `   ❌ Vehículo ${v.placa || v.id} (${v.marca} ${v.modelo}) - Cliente no existe`,
          'red'
        );
      });
    } else {
      log('   ✅ Todos los vehículos tienen cliente válido', 'green');
    }

    // 2. Verificar órdenes de trabajo
    log('\n2️⃣  Verificando órdenes de trabajo...', 'cyan');

    // OTs con cliente inválido
    const otSinCliente = db
      .prepare(
        `
      SELECT ot.id, ot.numero, ot.cliente_id
      FROM ordenes_trabajo ot
      LEFT JOIN clientes c ON ot.cliente_id = c.id
      WHERE c.id IS NULL
    `
      )
      .all();

    if (otSinCliente.length > 0) {
      errores.push(`${otSinCliente.length} órdenes de trabajo con cliente inválido`);
      otSinCliente.forEach((ot) => {
        log(`   ❌ OT ${ot.numero} - Cliente ${ot.cliente_id} no existe`, 'red');
      });
    }

    // OTs con vehículo inválido
    const otSinVehiculo = db
      .prepare(
        `
      SELECT ot.id, ot.numero, ot.vehiculo_id
      FROM ordenes_trabajo ot
      LEFT JOIN vehiculos v ON ot.vehiculo_id = v.id
      WHERE v.id IS NULL
    `
      )
      .all();

    if (otSinVehiculo.length > 0) {
      errores.push(`${otSinVehiculo.length} órdenes de trabajo con vehículo inválido`);
      otSinVehiculo.forEach((ot) => {
        log(`   ❌ OT ${ot.numero} - Vehículo ${ot.vehiculo_id} no existe`, 'red');
      });
    }

    // OTs con técnico inválido
    const otTecnicoInvalido = db
      .prepare(
        `
      SELECT ot.id, ot.numero, ot.tecnico_asignado_id
      FROM ordenes_trabajo ot
      LEFT JOIN usuarios u ON ot.tecnico_asignado_id = u.id
      WHERE ot.tecnico_asignado_id IS NOT NULL AND u.id IS NULL
    `
      )
      .all();

    if (otTecnicoInvalido.length > 0) {
      advertencias.push(`${otTecnicoInvalido.length} órdenes con técnico que no existe`);
      otTecnicoInvalido.forEach((ot) => {
        log(`   ⚠️  OT ${ot.numero} - Técnico ${ot.tecnico_asignado_id} no existe`, 'yellow');
      });
    }

    if (otSinCliente.length === 0 && otSinVehiculo.length === 0) {
      log('   ✅ Todas las órdenes de trabajo tienen referencias válidas', 'green');
    }

    // 3. Verificar repuestos de OT
    log('\n3️⃣  Verificando repuestos en órdenes de trabajo...', 'cyan');

    const repuestosSinOT = db
      .prepare(
        `
      SELECT otr.id, otr.orden_id, otr.nombre_repuesto
      FROM ordenes_trabajo_repuestos otr
      LEFT JOIN ordenes_trabajo ot ON otr.orden_id = ot.id
      WHERE ot.id IS NULL
    `
      )
      .all();

    if (repuestosSinOT.length > 0) {
      errores.push(`${repuestosSinOT.length} repuestos huérfanos (OT no existe)`);
      repuestosSinOT.forEach((r) => {
        log(`   ❌ Repuesto "${r.nombre_repuesto}" - OT ${r.orden_id} no existe`, 'red');
      });
    }

    const repuestosProductoInvalido = db
      .prepare(
        `
      SELECT otr.id, otr.orden_id, otr.nombre_repuesto, otr.producto_id
      FROM ordenes_trabajo_repuestos otr
      LEFT JOIN productos p ON otr.producto_id = p.id
      WHERE otr.producto_id IS NOT NULL AND p.id IS NULL
    `
      )
      .all();

    if (repuestosProductoInvalido.length > 0) {
      advertencias.push(`${repuestosProductoInvalido.length} repuestos con producto_id inválido`);
      repuestosProductoInvalido.forEach((r) => {
        log(
          `   ⚠️  Repuesto "${r.nombre_repuesto}" en OT - Producto ${r.producto_id} no existe`,
          'yellow'
        );
      });
    }

    if (repuestosSinOT.length === 0) {
      log('   ✅ Todos los repuestos están correctamente vinculados', 'green');
    }

    // 4. Verificar servicios de OT
    log('\n4️⃣  Verificando servicios en órdenes de trabajo...', 'cyan');

    const serviciosSinOT = db
      .prepare(
        `
      SELECT ots.id, ots.orden_id, ots.servicio_nombre
      FROM ordenes_trabajo_servicios ots
      LEFT JOIN ordenes_trabajo ot ON ots.orden_id = ot.id
      WHERE ot.id IS NULL
    `
      )
      .all();

    if (serviciosSinOT.length > 0) {
      errores.push(`${serviciosSinOT.length} servicios huérfanos (OT no existe)`);
      serviciosSinOT.forEach((s) => {
        log(`   ❌ Servicio "${s.servicio_nombre}" - OT ${s.orden_id} no existe`, 'red');
      });
    } else {
      log('   ✅ Todos los servicios están correctamente vinculados', 'green');
    }

    // 5. Verificar citas
    log('\n5️⃣  Verificando citas...', 'cyan');

    const citasSinCliente = db
      .prepare(
        `
      SELECT c.id, c.fecha, c.hora, c.cliente_id
      FROM citas c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE cl.id IS NULL
    `
      )
      .all();

    if (citasSinCliente.length > 0) {
      errores.push(`${citasSinCliente.length} citas con cliente inválido`);
      citasSinCliente.forEach((c) => {
        log(`   ❌ Cita ${c.fecha} ${c.hora} - Cliente ${c.cliente_id} no existe`, 'red');
      });
    }

    const citasSinVehiculo = db
      .prepare(
        `
      SELECT c.id, c.fecha, c.hora, c.vehiculo_id
      FROM citas c
      LEFT JOIN vehiculos v ON c.vehiculo_id = v.id
      WHERE v.id IS NULL
    `
      )
      .all();

    if (citasSinVehiculo.length > 0) {
      errores.push(`${citasSinVehiculo.length} citas con vehículo inválido`);
      citasSinVehiculo.forEach((c) => {
        log(`   ❌ Cita ${c.fecha} ${c.hora} - Vehículo ${c.vehiculo_id} no existe`, 'red');
      });
    }

    if (citasSinCliente.length === 0 && citasSinVehiculo.length === 0) {
      log('   ✅ Todas las citas tienen referencias válidas', 'green');
    }

    // 6. Verificar compatibilidad de catálogo técnico
    log('\n6️⃣  Verificando catálogo técnico...', 'cyan');

    // Verificar si la tabla existe
    const tablasExistentes = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='productos_compatibilidad'
    `
      )
      .all();

    if (tablasExistentes.length === 0) {
      advertencias.push(
        'Tabla productos_compatibilidad no existe (catálogo técnico no implementado)'
      );
      log('   ⚠️  Catálogo técnico no está implementado en esta base de datos', 'yellow');
    } else {
      const compatibilidadSinProducto = db
        .prepare(
          `
        SELECT pc.id, pc.producto_id
        FROM productos_compatibilidad pc
        LEFT JOIN productos p ON pc.producto_id = p.id
        WHERE p.id IS NULL
      `
        )
        .all();

      if (compatibilidadSinProducto.length > 0) {
        errores.push(
          `${compatibilidadSinProducto.length} registros de compatibilidad sin producto`
        );
        log(`   ❌ ${compatibilidadSinProducto.length} compatibilidades huérfanas`, 'red');
      } else {
        log('   ✅ Todas las compatibilidades tienen producto válido', 'green');
      }
    }

    // 7. Estadísticas generales
    log('\n📊 ESTADÍSTICAS GENERALES', 'cyan');
    log('='.repeat(80), 'cyan');

    const stats = {
      vehiculos: db.prepare('SELECT COUNT(*) as total FROM vehiculos').get().total,
      clientes: db.prepare('SELECT COUNT(*) as total FROM clientes').get().total,
      ordenes: db.prepare('SELECT COUNT(*) as total FROM ordenes_trabajo').get().total,
      citas: db.prepare('SELECT COUNT(*) as total FROM citas').get().total,
      servicios: db.prepare('SELECT COUNT(*) as total FROM ordenes_trabajo_servicios').get().total,
      repuestos: db.prepare('SELECT COUNT(*) as total FROM ordenes_trabajo_repuestos').get().total,
    };

    log(`   • Clientes: ${stats.clientes}`, 'cyan');
    log(`   • Vehículos: ${stats.vehiculos}`, 'cyan');
    log(`   • Órdenes de Trabajo: ${stats.ordenes}`, 'cyan');
    log(`   • Citas programadas: ${stats.citas}`, 'cyan');
    log(`   • Servicios registrados: ${stats.servicios}`, 'cyan');
    log(`   • Repuestos utilizados: ${stats.repuestos}`, 'cyan');

    // 8. Resumen final
    log('\n📋 RESUMEN', 'cyan');
    log('='.repeat(80), 'cyan');

    if (errores.length === 0 && advertencias.length === 0) {
      log('✅ SISTEMA ÍNTEGRO - No se encontraron problemas', 'green');
    } else {
      if (errores.length > 0) {
        log(`\n❌ ERRORES CRÍTICOS: ${errores.length}`, 'red');
        errores.forEach((e) => log(`   • ${e}`, 'red'));
      }

      if (advertencias.length > 0) {
        log(`\n⚠️  ADVERTENCIAS: ${advertencias.length}`, 'yellow');
        advertencias.forEach((a) => log(`   • ${a}`, 'yellow'));
      }
    }
  } catch (error) {
    log(`\n❌ Error durante la verificación: ${error.message}`, 'red');
    console.error(error);
  } finally {
    db.close();
  }

  return { errores, advertencias };
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const dbPath = process.argv[2] || path.join(__dirname, '..', 'data', 'gestor_tienda.db');

  log(`\n📂 Base de datos: ${dbPath}\n`, 'cyan');

  const resultado = verificarIntegridadTaller(dbPath);

  process.exit(resultado.errores.length > 0 ? 1 : 0);
}

module.exports = { verificarIntegridadTaller };
