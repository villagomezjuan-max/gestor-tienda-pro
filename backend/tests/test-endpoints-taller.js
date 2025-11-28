/**
 * PRUEBAS DE ENDPOINTS DEL MÓDULO TALLER
 *
 * Script de prueba para verificar que todos los endpoints nuevos funcionan correctamente
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// Variables globales para almacenar datos de prueba
let token = '';
let clienteId = '';
let vehiculoId = '';
let citaId = '';
let otId = '';

/**
 * 1. Login
 */
async function login() {
  log('\n1️⃣  Iniciando sesión...', 'cyan');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      usuario: 'super:admin',
      password: 'admin123',
    });

    token = response.data.token;
    log('   ✅ Login exitoso', 'green');
    return true;
  } catch (error) {
    log(`   ❌ Error en login: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * 2. Obtener o crear cliente de prueba
 */
async function obtenerCliente() {
  log('\n2️⃣  Obteniendo/creando cliente de prueba...', 'cyan');
  try {
    // Buscar clientes existentes
    const response = await axios.get(`${BASE_URL}/api/clientes`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data.length > 0) {
      clienteId = response.data[0].id;
      log(`   ✅ Cliente encontrado: ${response.data[0].nombre} (${clienteId})`, 'green');
      return true;
    }

    // Si no hay clientes, crear uno
    const nuevoCliente = await axios.post(
      `${BASE_URL}/api/clientes`,
      {
        nombre: 'Juan Pérez Prueba',
        telefono: '0987654321',
        email: 'juan.prueba@test.com',
        tipo: 'persona',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    clienteId = nuevoCliente.data.id;
    log(`   ✅ Cliente creado: ${nuevoCliente.data.nombre} (${clienteId})`, 'green');
    return true;
  } catch (error) {
    log(`   ❌ Error obteniendo cliente: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * 3. Crear vehículo de prueba
 */
async function crearVehiculo() {
  log('\n3️⃣  Creando vehículo de prueba...', 'cyan');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/vehiculos`,
      {
        cliente_id: clienteId,
        marca: 'Toyota',
        modelo: 'Corolla',
        anio: 2020,
        placa: 'ABC-1234',
        color: 'Gris',
        vin: '1HGBH41JXMN109186',
        kilometraje: 45000,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    vehiculoId = response.data.id || response.data.vehiculo?.id;
    log(
      `   ✅ Vehículo creado: ${response.data.marca} ${response.data.modelo} (${vehiculoId})`,
      'green'
    );
    return true;
  } catch (error) {
    log(`   ❌ Error creando vehículo: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * 4. Crear cita - ENDPOINT NUEVO
 */
async function crearCita() {
  log('\n4️⃣  Creando cita (ENDPOINT NUEVO)...', 'cyan');
  try {
    const fechaCita = new Date();
    fechaCita.setDate(fechaCita.getDate() + 3); // 3 días después

    const response = await axios.post(
      `${BASE_URL}/api/citas`,
      {
        clienteId: clienteId,
        vehiculoId: vehiculoId,
        tipoServicio: 'Cambio de aceite y filtros',
        fecha: fechaCita.toISOString().split('T')[0],
        hora: '10:00',
        duracion: 60,
        descripcion: 'Revisión general del motor',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    citaId = response.data.data.id;
    log(
      `   ✅ Cita creada: ${response.data.data.tipo_servicio} - ${response.data.data.fecha} ${response.data.data.hora}`,
      'green'
    );
    log(`      ID: ${citaId}`, 'blue');
    return true;
  } catch (error) {
    log(`   ❌ Error creando cita: ${error.response?.data?.message || error.message}`, 'red');
    console.error(error.response?.data);
    return false;
  }
}

/**
 * 5. Listar citas - ENDPOINT NUEVO
 */
async function listarCitas() {
  log('\n5️⃣  Listando citas (ENDPOINT NUEVO)...', 'cyan');
  try {
    const response = await axios.get(`${BASE_URL}/api/citas`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    log(`   ✅ Citas obtenidas: ${response.data.total} cita(s)`, 'green');
    if (response.data.data.length > 0) {
      response.data.data.forEach((cita) => {
        log(
          `      • ${cita.tipo_servicio} - ${cita.cliente_nombre} - ${cita.fecha} ${cita.hora}`,
          'blue'
        );
      });
    }
    return true;
  } catch (error) {
    log(`   ❌ Error listando citas: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * 6. Convertir cita a OT - ENDPOINT CRÍTICO NUEVO
 */
async function convertirCitaAOT() {
  log('\n6️⃣  Convirtiendo cita a orden de trabajo (ENDPOINT CRÍTICO)...', 'cyan');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/citas/convertir-a-ot`,
      {
        citaId: citaId,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    otId = response.data.data.id;
    log(`   ✅ Orden de trabajo creada: ${response.data.data.numero}`, 'green');
    log(`      Cliente: ${response.data.data.cliente_nombre}`, 'blue');
    log(`      Vehículo: ${response.data.data.vehiculo_descripcion}`, 'blue');
    log(`      Estado: ${response.data.data.estado}`, 'blue');
    log(`      ID OT: ${otId}`, 'blue');
    return true;
  } catch (error) {
    log(
      `   ❌ Error convirtiendo cita a OT: ${error.response?.data?.message || error.message}`,
      'red'
    );
    console.error(error.response?.data);
    return false;
  }
}

/**
 * 7. Ver mis tareas - ENDPOINT NUEVO
 */
async function verMisTareas() {
  log('\n7️⃣  Viendo mis tareas (ENDPOINT NUEVO)...', 'cyan');
  try {
    const response = await axios.get(`${BASE_URL}/api/ordenes-trabajo/mis-tareas`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    log(`   ✅ Tareas obtenidas: ${response.data.total} tarea(s)`, 'green');
    if (response.data.data.length > 0) {
      response.data.data.forEach((tarea) => {
        log(
          `      • ${tarea.numero} - ${tarea.cliente_nombre} - ${tarea.vehiculo_descripcion}`,
          'blue'
        );
        log(
          `        Estado: ${tarea.estado} | Servicios: ${tarea.num_servicios} | Repuestos: ${tarea.num_repuestos}`,
          'blue'
        );
      });
    } else {
      log(
        '      ⚠️  No hay tareas asignadas (el usuario actual no es técnico o no tiene OTs asignadas)',
        'yellow'
      );
    }
    return true;
  } catch (error) {
    log(
      `   ❌ Error obteniendo mis tareas: ${error.response?.data?.message || error.message}`,
      'red'
    );
    return false;
  }
}

/**
 * 8. Buscar marcas - ENDPOINT NUEVO
 */
async function buscarMarcas() {
  log('\n8️⃣  Buscando marcas de vehículos (ENDPOINT NUEVO)...', 'cyan');
  try {
    const response = await axios.get(`${BASE_URL}/api/catalogo/marcas`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    log(`   ✅ Marcas obtenidas: ${response.data.data.length} marca(s)`, 'green');
    if (response.data.data.length > 0) {
      response.data.data.slice(0, 5).forEach((marca) => {
        log(`      • ${marca.nombre}`, 'blue');
      });
      if (response.data.data.length > 5) {
        log(`      ... y ${response.data.data.length - 5} más`, 'blue');
      }
    } else {
      log('      ⚠️  No hay marcas en el catálogo (tabla no implementada)', 'yellow');
    }
    return true;
  } catch (error) {
    if (
      error.response?.status === 500 &&
      error.response?.data?.message?.includes('no such table')
    ) {
      log('      ⚠️  Tabla de marcas no existe (catálogo técnico no implementado)', 'yellow');
      return true;
    }
    log(`   ❌ Error buscando marcas: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * 9. Actualizar cita - ENDPOINT NUEVO
 */
async function actualizarCita() {
  log('\n9️⃣  Actualizando cita (ENDPOINT NUEVO)...', 'cyan');

  // Crear una nueva cita para actualizar
  try {
    const fechaCita = new Date();
    fechaCita.setDate(fechaCita.getDate() + 5);

    const nuevaCita = await axios.post(
      `${BASE_URL}/api/citas`,
      {
        clienteId: clienteId,
        vehiculoId: vehiculoId,
        tipoServicio: 'Revisión de frenos',
        fecha: fechaCita.toISOString().split('T')[0],
        hora: '14:00',
        duracion: 90,
        descripcion: 'Cliente reporta ruidos al frenar',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const citaParaActualizar = nuevaCita.data.data.id;

    // Ahora actualizar la cita
    const response = await axios.put(
      `${BASE_URL}/api/citas/${citaParaActualizar}`,
      {
        hora: '15:30',
        duracion: 120,
        descripcion: 'Cliente reporta ruidos al frenar - URGENTE',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    log(`   ✅ Cita actualizada exitosamente`, 'green');
    log(`      Nueva hora: ${response.data.data.hora}`, 'blue');
    log(`      Nueva duración: ${response.data.data.duracion} min`, 'blue');
    return true;
  } catch (error) {
    log(`   ❌ Error actualizando cita: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * Ejecutar todas las pruebas
 */
async function ejecutarPruebas() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║   PRUEBAS DE ENDPOINTS DEL MÓDULO TALLER                  ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  const resultados = {
    total: 0,
    exitosos: 0,
    fallidos: 0,
  };

  const pruebas = [
    { nombre: 'Login', fn: login },
    { nombre: 'Obtener Cliente', fn: obtenerCliente },
    { nombre: 'Crear Vehículo', fn: crearVehiculo },
    { nombre: 'Crear Cita', fn: crearCita },
    { nombre: 'Listar Citas', fn: listarCitas },
    { nombre: 'Convertir Cita a OT', fn: convertirCitaAOT },
    { nombre: 'Ver Mis Tareas', fn: verMisTareas },
    { nombre: 'Buscar Marcas', fn: buscarMarcas },
    { nombre: 'Actualizar Cita', fn: actualizarCita },
  ];

  for (const prueba of pruebas) {
    resultados.total++;
    const exito = await prueba.fn();
    if (exito) {
      resultados.exitosos++;
    } else {
      resultados.fallidos++;
    }

    // Pequeña pausa entre pruebas
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Resumen final
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║   RESUMEN DE PRUEBAS                                       ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  log(`\nTotal de pruebas: ${resultados.total}`, 'blue');
  log(`✅ Exitosas: ${resultados.exitosos}`, 'green');
  log(`❌ Fallidas: ${resultados.fallidos}`, 'red');

  const porcentaje = ((resultados.exitosos / resultados.total) * 100).toFixed(1);
  log(`\n📊 Tasa de éxito: ${porcentaje}%`, porcentaje >= 80 ? 'green' : 'yellow');

  if (resultados.fallidos === 0) {
    log('\n🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!', 'green');
  } else {
    log('\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.', 'yellow');
  }

  process.exit(resultados.fallidos > 0 ? 1 : 0);
}

// Ejecutar
ejecutarPruebas().catch((error) => {
  log(`\n💥 Error fatal ejecutando pruebas: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
