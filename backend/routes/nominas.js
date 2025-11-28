// ============================================
// RUTAS: Nóminas y Gestión de Personal
// API REST completa para el módulo de RRHH
// ============================================

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// ============================================
// EMPLEADOS
// ============================================

// Obtener todos los empleados
router.get('/empleados', async (req, res) => {
  try {
    const db = req.db;
    const { estado, departamento, buscar } = req.query;

    let query = `
            SELECT e.*, 
                   u.username,
                   (SELECT COUNT(*) FROM trabajos_empleado te WHERE te.empleado_id = e.id) as total_trabajos,
                   (SELECT SUM(te.comision_generada) FROM trabajos_empleado te WHERE te.empleado_id = e.id AND te.nomina_detalle_id IS NULL) as comisiones_pendientes
            FROM empleados e
            LEFT JOIN usuarios u ON e.usuario_id = u.id
            WHERE 1=1
        `;
    const params = [];

    if (estado) {
      query += ' AND e.estado = ?';
      params.push(estado);
    }

    if (departamento) {
      query += ' AND e.departamento = ?';
      params.push(departamento);
    }

    if (buscar) {
      query += ' AND (e.nombre LIKE ? OR e.apellido LIKE ? OR e.cedula LIKE ?)';
      const busqueda = `%${buscar}%`;
      params.push(busqueda, busqueda, busqueda);
    }

    query += ' ORDER BY e.nombre, e.apellido';

    const empleados = await db.all(query, params);
    res.json(empleados);
  } catch (error) {
    console.error('Error obteniendo empleados:', error);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

// Obtener empleado por ID
router.get('/empleados/:id', async (req, res) => {
  try {
    const db = req.db;
    const empleado = await db.get(
      `
            SELECT e.*, u.username
            FROM empleados e
            LEFT JOIN usuarios u ON e.usuario_id = u.id
            WHERE e.id = ?
        `,
      [req.params.id]
    );

    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    // Obtener horarios
    const horarios = await db.all(
      'SELECT * FROM empleados_horarios WHERE empleado_id = ? ORDER BY dia_semana',
      [req.params.id]
    );

    // Obtener saldo de vacaciones
    const vacaciones = await db.get('SELECT * FROM vacaciones_saldo WHERE empleado_id = ?', [
      req.params.id,
    ]);

    empleado.horarios = horarios;
    empleado.vacaciones = vacaciones;

    res.json(empleado);
  } catch (error) {
    console.error('Error obteniendo empleado:', error);
    res.status(500).json({ error: 'Error al obtener empleado' });
  }
});

// Crear empleado
router.post('/empleados', async (req, res) => {
  try {
    const db = req.db;
    const id = uuidv4();
    const data = req.body;

    await db.run(
      `
            INSERT INTO empleados (
                id, negocio_id, usuario_id, cedula, nombre, apellido, 
                fecha_nacimiento, genero, estado_civil, direccion, 
                telefono, email, contacto_emergencia, telefono_emergencia,
                cargo, departamento, tipo_contrato, fecha_ingreso,
                tipo_salario, salario_base, tiene_comision, porcentaje_comision,
                cuenta_bancaria, banco, tipo_cuenta, afiliado_iess,
                especialidades, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        id,
        data.negocio_id,
        data.usuario_id,
        data.cedula,
        data.nombre,
        data.apellido,
        data.fecha_nacimiento,
        data.genero,
        data.estado_civil,
        data.direccion,
        data.telefono,
        data.email,
        data.contacto_emergencia,
        data.telefono_emergencia,
        data.cargo,
        data.departamento,
        data.tipo_contrato || 'indefinido',
        data.fecha_ingreso,
        data.tipo_salario || 'mensual',
        data.salario_base || 0,
        data.tiene_comision || 0,
        data.porcentaje_comision || 0,
        data.cuenta_bancaria,
        data.banco,
        data.tipo_cuenta,
        data.afiliado_iess !== false ? 1 : 0,
        JSON.stringify(data.especialidades || []),
        data.estado || 'activo',
      ]
    );

    // Crear saldo de vacaciones inicial
    const anioActual = new Date().getFullYear();
    await db.run(
      `
            INSERT INTO vacaciones_saldo (id, negocio_id, empleado_id, anio, dias_correspondientes, dias_pendientes)
            VALUES (?, ?, ?, ?, 15, 15)
        `,
      [uuidv4(), data.negocio_id, id, anioActual]
    );

    // Guardar horarios si vienen
    if (data.horarios && Array.isArray(data.horarios)) {
      for (const horario of data.horarios) {
        await db.run(
          `
                    INSERT INTO empleados_horarios (id, negocio_id, empleado_id, dia_semana, hora_entrada, hora_salida, hora_almuerzo_inicio, hora_almuerzo_fin, es_dia_libre)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
          [
            uuidv4(),
            data.negocio_id,
            id,
            horario.dia_semana,
            horario.hora_entrada,
            horario.hora_salida,
            horario.hora_almuerzo_inicio,
            horario.hora_almuerzo_fin,
            horario.es_dia_libre || 0,
          ]
        );
      }
    }

    res.status(201).json({ id, message: 'Empleado creado exitosamente' });
  } catch (error) {
    console.error('Error creando empleado:', error);
    res.status(500).json({ error: 'Error al crear empleado' });
  }
});

// Actualizar empleado
router.put('/empleados/:id', async (req, res) => {
  try {
    const db = req.db;
    const data = req.body;

    await db.run(
      `
            UPDATE empleados SET
                nombre = ?, apellido = ?, fecha_nacimiento = ?, genero = ?,
                estado_civil = ?, direccion = ?, telefono = ?, email = ?,
                contacto_emergencia = ?, telefono_emergencia = ?,
                cargo = ?, departamento = ?, tipo_contrato = ?,
                tipo_salario = ?, salario_base = ?, tiene_comision = ?, porcentaje_comision = ?,
                cuenta_bancaria = ?, banco = ?, tipo_cuenta = ?,
                afiliado_iess = ?, especialidades = ?, estado = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `,
      [
        data.nombre,
        data.apellido,
        data.fecha_nacimiento,
        data.genero,
        data.estado_civil,
        data.direccion,
        data.telefono,
        data.email,
        data.contacto_emergencia,
        data.telefono_emergencia,
        data.cargo,
        data.departamento,
        data.tipo_contrato,
        data.tipo_salario,
        data.salario_base,
        data.tiene_comision,
        data.porcentaje_comision,
        data.cuenta_bancaria,
        data.banco,
        data.tipo_cuenta,
        data.afiliado_iess,
        JSON.stringify(data.especialidades || []),
        data.estado,
        req.params.id,
      ]
    );

    res.json({ message: 'Empleado actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando empleado:', error);
    res.status(500).json({ error: 'Error al actualizar empleado' });
  }
});

// ============================================
// ASISTENCIA
// ============================================

// Obtener asistencia por fecha
router.get('/asistencia', async (req, res) => {
  try {
    const db = req.db;
    const { fecha, empleado_id, desde, hasta } = req.query;

    let query = `
            SELECT a.*, 
                   e.nombre || ' ' || e.apellido as nombre_empleado,
                   e.cargo, e.departamento
            FROM asistencia a
            JOIN empleados e ON a.empleado_id = e.id
            WHERE 1=1
        `;
    const params = [];

    if (fecha) {
      query += ' AND a.fecha = ?';
      params.push(fecha);
    }

    if (empleado_id) {
      query += ' AND a.empleado_id = ?';
      params.push(empleado_id);
    }

    if (desde && hasta) {
      query += ' AND a.fecha BETWEEN ? AND ?';
      params.push(desde, hasta);
    }

    query += ' ORDER BY a.fecha DESC, e.nombre';

    const asistencia = await db.all(query, params);
    res.json(asistencia);
  } catch (error) {
    console.error('Error obteniendo asistencia:', error);
    res.status(500).json({ error: 'Error al obtener asistencia' });
  }
});

// Marcar entrada
router.post('/asistencia/entrada', async (req, res) => {
  try {
    const db = req.db;
    const { empleado_id, latitud, longitud } = req.body;
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0].substring(0, 5);

    // Verificar si ya tiene registro hoy
    const existente = await db.get('SELECT * FROM asistencia WHERE empleado_id = ? AND fecha = ?', [
      empleado_id,
      fecha,
    ]);

    if (existente && existente.hora_entrada) {
      return res.status(400).json({ error: 'Ya registró entrada hoy' });
    }

    // Obtener horario del empleado para calcular tardanza
    const diaSemana = new Date().getDay();
    const horario = await db.get(
      'SELECT * FROM empleados_horarios WHERE empleado_id = ? AND dia_semana = ?',
      [empleado_id, diaSemana]
    );

    let minutosTardanza = 0;
    let estado = 'presente';

    if (horario && horario.hora_entrada) {
      const [hE, mE] = horario.hora_entrada.split(':').map(Number);
      const [hA, mA] = hora.split(':').map(Number);
      const minutosEsperado = hE * 60 + mE;
      const minutosActual = hA * 60 + mA;

      if (minutosActual > minutosEsperado + 5) {
        // 5 minutos de tolerancia
        minutosTardanza = minutosActual - minutosEsperado;
        estado = 'tardanza';
      }
    }

    if (existente) {
      await db.run(
        `
                UPDATE asistencia SET 
                    hora_entrada = ?, latitud_entrada = ?, longitud_entrada = ?,
                    minutos_tardanza = ?, estado = ?, updated_at = datetime('now')
                WHERE id = ?
            `,
        [hora, latitud, longitud, minutosTardanza, estado, existente.id]
      );
    } else {
      await db.run(
        `
                INSERT INTO asistencia (id, negocio_id, empleado_id, fecha, hora_entrada, latitud_entrada, longitud_entrada, minutos_tardanza, estado)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
        [
          uuidv4(),
          req.body.negocio_id,
          empleado_id,
          fecha,
          hora,
          latitud,
          longitud,
          minutosTardanza,
          estado,
        ]
      );
    }

    res.json({ message: 'Entrada registrada', hora, tardanza: minutosTardanza });
  } catch (error) {
    console.error('Error registrando entrada:', error);
    res.status(500).json({ error: 'Error al registrar entrada' });
  }
});

// Marcar salida
router.post('/asistencia/salida', async (req, res) => {
  try {
    const db = req.db;
    const { empleado_id, latitud, longitud } = req.body;
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0].substring(0, 5);

    const asistencia = await db.get(
      'SELECT * FROM asistencia WHERE empleado_id = ? AND fecha = ?',
      [empleado_id, fecha]
    );

    if (!asistencia) {
      return res.status(400).json({ error: 'No tiene registro de entrada hoy' });
    }

    if (asistencia.hora_salida) {
      return res.status(400).json({ error: 'Ya registró salida hoy' });
    }

    // Calcular horas trabajadas
    const [hE, mE] = asistencia.hora_entrada.split(':').map(Number);
    const [hS, mS] = hora.split(':').map(Number);
    let horasTrabajadas = (hS * 60 + mS - hE * 60 - mE) / 60;

    // Restar tiempo de almuerzo si aplica
    if (asistencia.hora_almuerzo_salida && asistencia.hora_almuerzo_regreso) {
      const [hAS, mAS] = asistencia.hora_almuerzo_salida.split(':').map(Number);
      const [hAR, mAR] = asistencia.hora_almuerzo_regreso.split(':').map(Number);
      const almuerzo = (hAR * 60 + mAR - hAS * 60 - mAS) / 60;
      horasTrabajadas -= almuerzo;
    }

    // Calcular horas extra (más de 8 horas)
    let horasExtra = 0;
    if (horasTrabajadas > 8) {
      horasExtra = horasTrabajadas - 8;
      horasTrabajadas = 8;
    }

    await db.run(
      `
            UPDATE asistencia SET 
                hora_salida = ?, latitud_salida = ?, longitud_salida = ?,
                horas_trabajadas = ?, horas_extra = ?, updated_at = datetime('now')
            WHERE id = ?
        `,
      [hora, latitud, longitud, horasTrabajadas.toFixed(2), horasExtra.toFixed(2), asistencia.id]
    );

    res.json({
      message: 'Salida registrada',
      hora,
      horas_trabajadas: horasTrabajadas.toFixed(2),
      horas_extra: horasExtra.toFixed(2),
    });
  } catch (error) {
    console.error('Error registrando salida:', error);
    res.status(500).json({ error: 'Error al registrar salida' });
  }
});

// Obtener asistencia de hoy
router.get('/asistencia/hoy', async (req, res) => {
  try {
    const db = req.db;
    const fecha = new Date().toISOString().split('T')[0];

    const asistencia = await db.all(
      `
            SELECT 
                e.id as empleado_id,
                e.nombre || ' ' || e.apellido as nombre_completo,
                e.cargo,
                e.departamento,
                e.foto,
                a.hora_entrada,
                a.hora_salida,
                a.horas_trabajadas,
                a.horas_extra,
                a.minutos_tardanza,
                a.estado as estado_asistencia,
                CASE 
                    WHEN a.id IS NULL THEN 'sin_marcar'
                    WHEN a.hora_entrada IS NOT NULL AND a.hora_salida IS NULL THEN 'trabajando'
                    WHEN a.hora_salida IS NOT NULL THEN 'jornada_completa'
                    ELSE 'desconocido'
                END as estado_actual
            FROM empleados e
            LEFT JOIN asistencia a ON e.id = a.empleado_id AND a.fecha = ?
            WHERE e.estado = 'activo'
            ORDER BY e.nombre
        `,
      [fecha]
    );

    res.json(asistencia);
  } catch (error) {
    console.error('Error obteniendo asistencia de hoy:', error);
    res.status(500).json({ error: 'Error al obtener asistencia' });
  }
});

// ============================================
// PERMISOS Y VACACIONES
// ============================================

// Obtener solicitudes de permisos
router.get('/permisos', async (req, res) => {
  try {
    const db = req.db;
    const { estado, empleado_id } = req.query;

    let query = `
            SELECT ps.*, 
                   e.nombre || ' ' || e.apellido as nombre_empleado,
                   e.cargo, e.departamento
            FROM permisos_solicitudes ps
            JOIN empleados e ON ps.empleado_id = e.id
            WHERE 1=1
        `;
    const params = [];

    if (estado) {
      query += ' AND ps.estado = ?';
      params.push(estado);
    }

    if (empleado_id) {
      query += ' AND ps.empleado_id = ?';
      params.push(empleado_id);
    }

    query += ' ORDER BY ps.created_at DESC';

    const permisos = await db.all(query, params);
    res.json(permisos);
  } catch (error) {
    console.error('Error obteniendo permisos:', error);
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
});

// Crear solicitud de permiso
router.post('/permisos', async (req, res) => {
  try {
    const db = req.db;
    const id = uuidv4();
    const data = req.body;

    await db.run(
      `
            INSERT INTO permisos_solicitudes (id, negocio_id, empleado_id, tipo, fecha_inicio, fecha_fin, dias_solicitados, motivo, documento_adjunto)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        id,
        data.negocio_id,
        data.empleado_id,
        data.tipo,
        data.fecha_inicio,
        data.fecha_fin,
        data.dias_solicitados,
        data.motivo,
        data.documento_adjunto,
      ]
    );

    res.status(201).json({ id, message: 'Solicitud creada exitosamente' });
  } catch (error) {
    console.error('Error creando solicitud:', error);
    res.status(500).json({ error: 'Error al crear solicitud' });
  }
});

// Aprobar/Rechazar permiso
router.put('/permisos/:id/responder', async (req, res) => {
  try {
    const db = req.db;
    const { estado, comentario, aprobado_por } = req.body;

    await db.run(
      `
            UPDATE permisos_solicitudes SET
                estado = ?, comentario_respuesta = ?, aprobado_por = ?,
                fecha_respuesta = datetime('now'), updated_at = datetime('now')
            WHERE id = ?
        `,
      [estado, comentario, aprobado_por, req.params.id]
    );

    // Si es aprobado y es vacaciones, actualizar saldo
    const permiso = await db.get('SELECT * FROM permisos_solicitudes WHERE id = ?', [
      req.params.id,
    ]);
    if (estado === 'aprobado' && permiso.tipo === 'vacaciones') {
      await db.run(
        `
                UPDATE vacaciones_saldo SET
                    dias_usados = dias_usados + ?,
                    dias_pendientes = dias_pendientes - ?,
                    updated_at = datetime('now')
                WHERE empleado_id = ?
            `,
        [permiso.dias_solicitados, permiso.dias_solicitados, permiso.empleado_id]
      );
    }

    res.json({ message: 'Solicitud procesada exitosamente' });
  } catch (error) {
    console.error('Error procesando solicitud:', error);
    res.status(500).json({ error: 'Error al procesar solicitud' });
  }
});

// ============================================
// NÓMINAS
// ============================================

// Obtener nóminas
router.get('/nominas', async (req, res) => {
  try {
    const db = req.db;
    const { estado, anio } = req.query;

    let query = `
            SELECT n.*, 
                   u.nombre as procesado_por_nombre
            FROM nominas n
            LEFT JOIN usuarios u ON n.procesado_por = u.id
            WHERE 1=1
        `;
    const params = [];

    if (estado) {
      query += ' AND n.estado = ?';
      params.push(estado);
    }

    if (anio) {
      query += ' AND strftime("%Y", n.periodo_inicio) = ?';
      params.push(anio);
    }

    query += ' ORDER BY n.periodo_inicio DESC';

    const nominas = await db.all(query, params);
    res.json(nominas);
  } catch (error) {
    console.error('Error obteniendo nóminas:', error);
    res.status(500).json({ error: 'Error al obtener nóminas' });
  }
});

// Obtener detalle de nómina
router.get('/nominas/:id', async (req, res) => {
  try {
    const db = req.db;

    const nomina = await db.get('SELECT * FROM nominas WHERE id = ?', [req.params.id]);
    if (!nomina) {
      return res.status(404).json({ error: 'Nómina no encontrada' });
    }

    const detalles = await db.all(
      `
            SELECT nd.*, 
                   e.nombre || ' ' || e.apellido as nombre_empleado,
                   e.cedula, e.cargo, e.departamento
            FROM nominas_detalle nd
            JOIN empleados e ON nd.empleado_id = e.id
            WHERE nd.nomina_id = ?
            ORDER BY e.nombre
        `,
      [req.params.id]
    );

    nomina.detalles = detalles;
    res.json(nomina);
  } catch (error) {
    console.error('Error obteniendo nómina:', error);
    res.status(500).json({ error: 'Error al obtener nómina' });
  }
});

// Crear/Procesar nómina
router.post('/nominas/procesar', async (req, res) => {
  try {
    const db = req.db;
    const { periodo_inicio, periodo_fin, tipo_periodo, fecha_pago, procesado_por, negocio_id } =
      req.body;

    const nominaId = uuidv4();

    // Obtener configuración de nómina
    const config = await db.get('SELECT * FROM config_nomina WHERE id = 1');

    // Obtener empleados activos
    const empleados = await db.all(`
            SELECT * FROM empleados WHERE estado = 'activo'
        `);

    let totalIngresos = 0;
    let totalDeducciones = 0;
    let totalNeto = 0;

    // Crear nómina en borrador
    await db.run(
      `
            INSERT INTO nominas (id, negocio_id, periodo_inicio, periodo_fin, tipo_periodo, fecha_pago, estado, procesado_por, fecha_procesamiento)
            VALUES (?, ?, ?, ?, ?, ?, 'borrador', ?, datetime('now'))
        `,
      [nominaId, negocio_id, periodo_inicio, periodo_fin, tipo_periodo, fecha_pago, procesado_por]
    );

    // Procesar cada empleado
    for (const empleado of empleados) {
      // Obtener asistencia del período
      const asistencia = await db.all(
        `
                SELECT * FROM asistencia 
                WHERE empleado_id = ? AND fecha BETWEEN ? AND ?
            `,
        [empleado.id, periodo_inicio, periodo_fin]
      );

      // Calcular horas
      let horasNormales = 0;
      let horasExtra50 = 0;
      let horasExtra100 = 0;
      let diasTrabajados = asistencia.length;

      asistencia.forEach((a) => {
        horasNormales += parseFloat(a.horas_trabajadas || 0);
        // Simplificado: horas extra al 50%
        horasExtra50 += parseFloat(a.horas_extra || 0);
      });

      // Calcular salario
      let salarioBase = empleado.salario_base;
      if (empleado.tipo_salario === 'por_hora') {
        salarioBase = horasNormales * empleado.salario_base;
      }

      // Calcular horas extra
      const valorHora = salarioBase / 240; // 30 días * 8 horas
      const valorHoraExtra50 = horasExtra50 * valorHora * 1.5;
      const valorHoraExtra100 = horasExtra100 * valorHora * 2;

      // Obtener comisiones del período
      const comisiones = await db.get(
        `
                SELECT COALESCE(SUM(comision_generada), 0) as total
                FROM trabajos_empleado
                WHERE empleado_id = ? AND fecha BETWEEN ? AND ? AND nomina_detalle_id IS NULL
            `,
        [empleado.id, periodo_inicio, periodo_fin]
      );

      // Obtener anticipos pendientes
      const anticipos = await db.get(
        `
                SELECT COALESCE(SUM(monto), 0) as total
                FROM anticipos
                WHERE empleado_id = ? AND estado = 'aprobado' AND nomina_detalle_id IS NULL
            `,
        [empleado.id]
      );

      // Calcular totales
      const totalIngresosEmpleado =
        salarioBase + valorHoraExtra50 + valorHoraExtra100 + (comisiones?.total || 0);

      // Deducciones
      const aporteIESSPersonal = empleado.afiliado_iess
        ? totalIngresosEmpleado * (config.aporte_personal_iess / 100)
        : 0;
      const aporteIESSPatronal = empleado.afiliado_iess
        ? totalIngresosEmpleado * (config.aporte_patronal_iess / 100)
        : 0;

      const totalDeduccionesEmpleado = aporteIESSPersonal + (anticipos?.total || 0);
      const netoAPagar = totalIngresosEmpleado - totalDeduccionesEmpleado;

      // Provisiones
      const decimoTercero = totalIngresosEmpleado / 12;
      const decimoCuarto = config.salario_basico / 12;
      const fondosReserva = totalIngresosEmpleado * (config.fondos_reserva_porcentaje / 100);
      const vacaciones = totalIngresosEmpleado / 24;

      // Insertar detalle
      const detalleId = uuidv4();
      await db.run(
        `
                INSERT INTO nominas_detalle (
                    id, negocio_id, nomina_id, empleado_id,
                    dias_trabajados, horas_normales, horas_extra_50, horas_extra_100,
                    salario_base, valor_hora_extra_50, valor_hora_extra_100,
                    comisiones, total_ingresos,
                    aporte_iess_personal, anticipos, total_deducciones,
                    aporte_iess_patronal, decimo_tercero, decimo_cuarto, fondos_reserva, vacaciones,
                    neto_pagar
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
        [
          detalleId,
          negocio_id,
          nominaId,
          empleado.id,
          diasTrabajados,
          horasNormales.toFixed(2),
          horasExtra50.toFixed(2),
          horasExtra100.toFixed(2),
          salarioBase.toFixed(2),
          valorHoraExtra50.toFixed(2),
          valorHoraExtra100.toFixed(2),
          (comisiones?.total || 0).toFixed(2),
          totalIngresosEmpleado.toFixed(2),
          aporteIESSPersonal.toFixed(2),
          (anticipos?.total || 0).toFixed(2),
          totalDeduccionesEmpleado.toFixed(2),
          aporteIESSPatronal.toFixed(2),
          decimoTercero.toFixed(2),
          decimoCuarto.toFixed(2),
          fondosReserva.toFixed(2),
          vacaciones.toFixed(2),
          netoAPagar.toFixed(2),
        ]
      );

      // Marcar anticipos como descontados
      await db.run(
        `
                UPDATE anticipos SET nomina_detalle_id = ?, estado = 'descontado'
                WHERE empleado_id = ? AND estado = 'aprobado' AND nomina_detalle_id IS NULL
            `,
        [detalleId, empleado.id]
      );

      // Marcar trabajos como pagados
      await db.run(
        `
                UPDATE trabajos_empleado SET nomina_detalle_id = ?
                WHERE empleado_id = ? AND fecha BETWEEN ? AND ? AND nomina_detalle_id IS NULL
            `,
        [detalleId, empleado.id, periodo_inicio, periodo_fin]
      );

      totalIngresos += totalIngresosEmpleado;
      totalDeducciones += totalDeduccionesEmpleado;
      totalNeto += netoAPagar;
    }

    // Actualizar totales de la nómina
    await db.run(
      `
            UPDATE nominas SET
                total_ingresos = ?, total_deducciones = ?, total_neto = ?,
                total_empleados = ?, estado = 'procesada'
            WHERE id = ?
        `,
      [
        totalIngresos.toFixed(2),
        totalDeducciones.toFixed(2),
        totalNeto.toFixed(2),
        empleados.length,
        nominaId,
      ]
    );

    res.status(201).json({
      id: nominaId,
      message: 'Nómina procesada exitosamente',
      total_empleados: empleados.length,
      total_neto: totalNeto.toFixed(2),
    });
  } catch (error) {
    console.error('Error procesando nómina:', error);
    res.status(500).json({ error: 'Error al procesar nómina' });
  }
});

// Marcar nómina como pagada
router.put('/nominas/:id/pagar', async (req, res) => {
  try {
    const db = req.db;

    await db.run(
      `
            UPDATE nominas SET estado = 'pagada', updated_at = datetime('now')
            WHERE id = ?
        `,
      [req.params.id]
    );

    // Actualizar detalles con fecha de pago
    await db.run(
      `
            UPDATE nominas_detalle SET fecha_pago = datetime('now')
            WHERE nomina_id = ?
        `,
      [req.params.id]
    );

    res.json({ message: 'Nómina marcada como pagada' });
  } catch (error) {
    console.error('Error pagando nómina:', error);
    res.status(500).json({ error: 'Error al pagar nómina' });
  }
});

// ============================================
// ANTICIPOS
// ============================================

router.get('/anticipos', async (req, res) => {
  try {
    const db = req.db;
    const { estado, empleado_id } = req.query;

    let query = `
            SELECT a.*, 
                   e.nombre || ' ' || e.apellido as nombre_empleado,
                   e.cargo
            FROM anticipos a
            JOIN empleados e ON a.empleado_id = e.id
            WHERE 1=1
        `;
    const params = [];

    if (estado) {
      query += ' AND a.estado = ?';
      params.push(estado);
    }

    if (empleado_id) {
      query += ' AND a.empleado_id = ?';
      params.push(empleado_id);
    }

    query += ' ORDER BY a.created_at DESC';

    const anticipos = await db.all(query, params);
    res.json(anticipos);
  } catch (error) {
    console.error('Error obteniendo anticipos:', error);
    res.status(500).json({ error: 'Error al obtener anticipos' });
  }
});

router.post('/anticipos', async (req, res) => {
  try {
    const db = req.db;
    const id = uuidv4();
    const data = req.body;

    await db.run(
      `
            INSERT INTO anticipos (id, negocio_id, empleado_id, monto, fecha_solicitud, fecha_descuento, motivo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      [
        id,
        data.negocio_id,
        data.empleado_id,
        data.monto,
        data.fecha_solicitud,
        data.fecha_descuento,
        data.motivo,
      ]
    );

    res.status(201).json({ id, message: 'Anticipo solicitado exitosamente' });
  } catch (error) {
    console.error('Error creando anticipo:', error);
    res.status(500).json({ error: 'Error al crear anticipo' });
  }
});

router.put('/anticipos/:id/responder', async (req, res) => {
  try {
    const db = req.db;
    const { estado, aprobado_por } = req.body;

    await db.run(
      `
            UPDATE anticipos SET estado = ?, aprobado_por = ?, updated_at = datetime('now')
            WHERE id = ?
        `,
      [estado, aprobado_por, req.params.id]
    );

    res.json({ message: 'Anticipo procesado exitosamente' });
  } catch (error) {
    console.error('Error procesando anticipo:', error);
    res.status(500).json({ error: 'Error al procesar anticipo' });
  }
});

// ============================================
// CONFIGURACIÓN
// ============================================

router.get('/nominas/config', async (req, res) => {
  try {
    const db = req.db;
    const config = await db.get('SELECT * FROM config_nomina WHERE id = 1');
    res.json(config || {});
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

router.put('/nominas/config', async (req, res) => {
  try {
    const db = req.db;
    const data = req.body;

    await db.run(
      `
            UPDATE config_nomina SET
                aporte_personal_iess = ?, aporte_patronal_iess = ?,
                salario_basico = ?, recargo_hora_extra_50 = ?, recargo_hora_extra_100 = ?,
                recargo_hora_nocturna = ?, horas_jornada_diaria = ?, horas_jornada_semanal = ?,
                dias_vacaciones_anuales = ?, updated_at = datetime('now')
            WHERE id = 1
        `,
      [
        data.aporte_personal_iess,
        data.aporte_patronal_iess,
        data.salario_basico,
        data.recargo_hora_extra_50,
        data.recargo_hora_extra_100,
        data.recargo_hora_nocturna,
        data.horas_jornada_diaria,
        data.horas_jornada_semanal,
        data.dias_vacaciones_anuales,
      ]
    );

    res.json({ message: 'Configuración actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

// ============================================
// ESTADÍSTICAS Y REPORTES
// ============================================

router.get('/nominas/estadisticas', async (req, res) => {
  try {
    const db = req.db;
    const { anio } = req.query;
    const anioActual = anio || new Date().getFullYear();

    // Total empleados
    const empleadosActivos = await db.get(
      'SELECT COUNT(*) as total FROM empleados WHERE estado = "activo"'
    );

    // Nóminas del año
    const nominasAnio = await db.all(
      `
            SELECT 
                strftime('%m', periodo_inicio) as mes,
                SUM(total_ingresos) as ingresos,
                SUM(total_deducciones) as deducciones,
                SUM(total_neto) as neto
            FROM nominas
            WHERE strftime('%Y', periodo_inicio) = ? AND estado IN ('procesada', 'pagada')
            GROUP BY strftime('%m', periodo_inicio)
            ORDER BY mes
        `,
      [String(anioActual)]
    );

    // Permisos pendientes
    const permisosPendientes = await db.get(
      'SELECT COUNT(*) as total FROM permisos_solicitudes WHERE estado = "pendiente"'
    );

    // Anticipos pendientes
    const anticiposPendientes = await db.get(
      'SELECT COUNT(*) as total, COALESCE(SUM(monto), 0) as monto FROM anticipos WHERE estado = "pendiente"'
    );

    // Asistencia hoy
    const hoy = new Date().toISOString().split('T')[0];
    const asistenciaHoy = await db.get(
      `
            SELECT 
                (SELECT COUNT(*) FROM empleados WHERE estado = 'activo') as total_empleados,
                (SELECT COUNT(*) FROM asistencia WHERE fecha = ? AND hora_entrada IS NOT NULL) as presentes,
                (SELECT COUNT(*) FROM asistencia WHERE fecha = ? AND estado = 'tardanza') as tardanzas
        `,
      [hoy, hoy]
    );

    res.json({
      empleados_activos: empleadosActivos?.total || 0,
      nominas_mensuales: nominasAnio,
      permisos_pendientes: permisosPendientes?.total || 0,
      anticipos_pendientes: anticiposPendientes,
      asistencia_hoy: asistenciaHoy,
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Obtener feriados
router.get('/feriados', async (req, res) => {
  try {
    const db = req.db;
    const { anio } = req.query;
    const anioActual = anio || new Date().getFullYear();

    const feriados = await db.all('SELECT * FROM feriados WHERE anio = ? ORDER BY fecha', [
      anioActual,
    ]);

    res.json(feriados);
  } catch (error) {
    console.error('Error obteniendo feriados:', error);
    res.status(500).json({ error: 'Error al obtener feriados' });
  }
});

module.exports = router;
