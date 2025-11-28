/**
 * ENDPOINTS ADICIONALES PARA MÓDULO TALLER
 *
 * Endpoints faltantes mencionados en el análisis pero no implementados en server.js
 */

const express = require('express');

/**
 * Crea el router del módulo taller con las dependencias necesarias
 */
function createTallerRouter(dependencies = {}) {
  const router = express.Router();
  const { getDB } = dependencies;

  // Middleware para inyectar la base de datos del tenant
  router.use((req, res, next) => {
    if (req.negocioId && getDB) {
      try {
        req.db = getDB(req.negocioId);
      } catch (error) {
        console.error('Error al obtener DB para tenant:', error);
        // Si no hay DB específica, usar la del request
      }
    }
    // Si req.db ya está definido (de server.js), usar esa
    if (!req.db && req.negocioId && typeof getDB === 'undefined') {
      // Fallback: intentar obtener db de otra manera
      req.db = req.app.locals.getTenantDB ? req.app.locals.getTenantDB(req.negocioId) : null;
    }
    next();
  });
  const IACitasProcessor = require('../ia-citas-processor');

  /**
   * GET /api/citas
   * Obtiene lista de citas con filtros
   */
  router.get('/citas', (req, res) => {
    try {
      const db = req.db;
      const { fechaInicio, fechaFin, tecnicoId, estado } = req.query;

      let query = `
      SELECT 
        c.*,
        cl.nombre as cliente_nombre,
        cl.telefono as cliente_telefono,
        v.marca || ' ' || v.modelo || ' ' || COALESCE(v.placa, '') as vehiculo_descripcion,
        u.nombre as tecnico_nombre
      FROM citas c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      INNER JOIN vehiculos v ON c.vehiculo_id = v.id
      LEFT JOIN usuarios u ON c.tecnico_id = u.id
      WHERE 1=1
    `;

      const params = [];

      if (fechaInicio) {
        query += ' AND c.fecha >= ?';
        params.push(fechaInicio);
      }

      if (fechaFin) {
        query += ' AND c.fecha <= ?';
        params.push(fechaFin);
      }

      if (tecnicoId) {
        query += ' AND c.tecnico_id = ?';
        params.push(tecnicoId);
      }

      if (estado) {
        query += ' AND c.estado = ?';
        params.push(estado);
      }

      query += ' ORDER BY c.fecha, c.hora';

      const citas = db.prepare(query).all(...params);

      res.json({
        success: true,
        data: citas,
        total: citas.length,
      });
    } catch (error) {
      console.error('Error obteniendo citas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener citas',
        error: error.message,
      });
    }
  });

  /**
   * POST /api/citas/procesar-ia
   * Procesa un mensaje con IA para extraer información de cita
   */
  router.post('/citas/procesar-ia', async (req, res) => {
    try {
      const db = req.db;
      const { mensaje, citaParcial = {}, negocioId, iaConfig } = req.body;

      if (!mensaje || typeof mensaje !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Mensaje requerido',
        });
      }

      // Obtener contexto de clientes y vehículos recientes
      const clientes_recientes = db
        .prepare(
          `
      SELECT id, nombre, cedula, telefono
      FROM clientes
      WHERE activo = 1
      ORDER BY created_at DESC
      LIMIT 50
    `
        )
        .all();

      const vehiculos_frecuentes = db
        .prepare(
          `
      SELECT 
        v.id, v.marca, v.modelo, v.placa, v.cliente_id,
        c.nombre as cliente_nombre
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      ORDER BY v.created_at DESC
      LIMIT 50
    `
        )
        .all();

      // Configurar procesador IA
      const processor = new IACitasProcessor({
        provider: iaConfig?.provider,
        apiKey: iaConfig?.apiKey,
        model: iaConfig?.model,
      });

      const contexto = {
        clientes_recientes,
        vehiculos_frecuentes,
        fecha_actual: new Date().toISOString(),
        dia_semana: new Date().toLocaleDateString('es', { weekday: 'long' }),
        iaConfig,
      };

      // Procesar con IA
      const respuesta = await processor.procesarSolicitudCita(mensaje, contexto, citaParcial);

      res.json({
        success: true,
        data: respuesta,
      });
    } catch (error) {
      console.error('Error procesando con IA:', error);
      res.status(500).json({
        success: false,
        message: 'Error procesando mensaje con IA',
        error: error.message,
      });
    }
  });

  /**
   * GET /api/clientes/buscar-nombres
   * Búsqueda de clientes por nombre para autocompletado
   */
  router.get('/clientes/buscar-nombres', (req, res) => {
    try {
      const db = req.db;
      const { q, limit = 10 } = req.query;

      if (!q || q.trim().length < 2) {
        return res.json({
          success: true,
          data: [],
        });
      }

      const searchTerm = `%${q.trim()}%`;

      const clientes = db
        .prepare(
          `
      SELECT 
        id,
        nombre,
        cedula,
        telefono,
        email
      FROM clientes
      WHERE activo = 1 
        AND (
          nombre LIKE ? 
          OR cedula LIKE ?
          OR telefono LIKE ?
        )
      ORDER BY nombre ASC
      LIMIT ?
    `
        )
        .all(searchTerm, searchTerm, searchTerm, parseInt(limit));

      res.json({
        success: true,
        data: clientes,
      });
    } catch (error) {
      console.error('Error buscando clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar clientes',
        error: error.message,
      });
    }
  });

  /**
   * GET /api/citas/verificar-disponibilidad
   * Verifica si hay espacio disponible en una fecha/hora específica
   */
  router.get('/citas/verificar-disponibilidad', (req, res) => {
    try {
      const db = req.db;
      const { fecha, hora, duracion = 60, tecnicoId } = req.query;

      if (!fecha || !hora) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere fecha y hora',
        });
      }

      // Convertir fecha y hora a timestamps para comparación
      const fechaHoraSolicitada = new Date(`${fecha}T${hora}`);
      const duracionMs = parseInt(duracion) * 60 * 1000;
      const finSolicitado = new Date(fechaHoraSolicitada.getTime() + duracionMs);

      // Buscar citas que se solapen
      let query = `
      SELECT 
        c.*,
        cl.nombre as cliente_nombre,
        u.nombre as tecnico_nombre
      FROM citas c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN usuarios u ON c.tecnico_id = u.id
      WHERE c.fecha = ? AND c.estado NOT IN ('cancelado', 'completado')
    `;

      const params = [fecha];

      if (tecnicoId) {
        query += ' AND c.tecnico_id = ?';
        params.push(tecnicoId);
      }

      const citasExistentes = db.prepare(query).all(...params);

      // Verificar solapamientos
      const conflictos = citasExistentes.filter((cita) => {
        const inicioCita = new Date(`${cita.fecha}T${cita.hora}`);
        const finCita = new Date(inicioCita.getTime() + (cita.duracion || 60) * 60 * 1000);

        // Hay conflicto si:
        // - El inicio solicitado está dentro de una cita existente
        // - El fin solicitado está dentro de una cita existente
        // - La cita solicitada envuelve completamente una existente
        return (
          (fechaHoraSolicitada >= inicioCita && fechaHoraSolicitada < finCita) ||
          (finSolicitado > inicioCita && finSolicitado <= finCita) ||
          (fechaHoraSolicitada <= inicioCita && finSolicitado >= finCita)
        );
      });

      const disponible = conflictos.length === 0;

      res.json({
        success: true,
        disponible,
        conflictos: conflictos.map((c) => ({
          id: c.id,
          cliente: c.cliente_nombre,
          tecnico: c.tecnico_nombre,
          hora_inicio: c.hora,
          duracion: c.duracion,
          tipo_servicio: c.tipo_servicio,
        })),
        sugerencias: disponible
          ? []
          : generarSugerenciasHorario(fechaHoraSolicitada, citasExistentes, duracion),
      });
    } catch (error) {
      console.error('Error verificando disponibilidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar disponibilidad',
        error: error.message,
      });
    }
  });

  /**
   * Generar sugerencias de horarios disponibles
   */
  function generarSugerenciasHorario(fechaBase, citasExistentes, duracion) {
    const sugerencias = [];
    const horaInicio = 8; // 8:00 AM
    const horaFin = 18; // 6:00 PM
    const intervalo = 30; // minutos

    for (let hora = horaInicio; hora < horaFin; hora++) {
      for (let minutos = 0; minutos < 60; minutos += intervalo) {
        const horaStr = `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        const fechaHora = new Date(fechaBase);
        fechaHora.setHours(hora, minutos, 0, 0);
        const fin = new Date(fechaHora.getTime() + duracion * 60 * 1000);

        // Verificar si este horario está libre
        const libre = !citasExistentes.some((cita) => {
          const inicioCita = new Date(`${cita.fecha}T${cita.hora}`);
          const finCita = new Date(inicioCita.getTime() + (cita.duracion || 60) * 60 * 1000);
          return (
            (fechaHora >= inicioCita && fechaHora < finCita) ||
            (fin > inicioCita && fin <= finCita) ||
            (fechaHora <= inicioCita && fin >= finCita)
          );
        });

        if (libre) {
          sugerencias.push(horaStr);
          if (sugerencias.length >= 5) break;
        }
      }
      if (sugerencias.length >= 5) break;
    }

    return sugerencias;
  }

  /**
   * POST /api/citas/crear-completa
   * Crea una cita con auto-creación de cliente y vehículo si no existen
   */
  router.post('/citas/crear-completa', async (req, res) => {
    try {
      const db = req.db;
      const {
        // Datos del cliente
        cliente_id,
        cliente_nombre,
        cliente_cedula,
        cliente_telefono,
        cliente_email,
        cliente_direccion,
        cliente_ciudad,

        // Datos del vehículo
        vehiculo_id,
        vehiculo_marca,
        vehiculo_modelo,
        vehiculo_placa,
        vehiculo_color,
        vehiculo_anio,
        vehiculo_kilometraje,
        vehiculo_vin,

        // Datos de la cita
        tipoServicio,
        fecha,
        hora,
        duracion = 60,
        tecnicoId,
        descripcion,
        problema,
        prioridad = 'normal',
        estado = 'pendiente',

        negocioId,
      } = req.body;

      // Validaciones básicas
      if (!tipoServicio || !fecha || !hora) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos: tipoServicio, fecha, hora',
        });
      }

      let clienteIdFinal = cliente_id;
      let vehiculoIdFinal = vehiculo_id;

      // PASO 1: Crear o validar cliente
      if (!clienteIdFinal && cliente_nombre) {
        // Buscar cliente existente por nombre o cédula
        let clienteExistente = null;

        if (cliente_cedula) {
          clienteExistente = db
            .prepare('SELECT id FROM clientes WHERE cedula = ? AND activo = 1')
            .get(cliente_cedula);
        }

        if (!clienteExistente && cliente_telefono) {
          clienteExistente = db
            .prepare('SELECT id FROM clientes WHERE telefono = ? AND activo = 1')
            .get(cliente_telefono);
        }

        if (clienteExistente) {
          clienteIdFinal = clienteExistente.id;
        } else {
          // Crear nuevo cliente
          clienteIdFinal = `cliente_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          db.prepare(
            `
          INSERT INTO clientes (
            id, negocio_id, nombre, cedula, telefono, email, 
            direccion, ciudad, activo, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
        `
          ).run(
            clienteIdFinal,
            negocioId || 'default',
            cliente_nombre,
            cliente_cedula || null,
            cliente_telefono || null,
            cliente_email || null,
            cliente_direccion || null,
            cliente_ciudad || null
          );
        }
      }

      // PASO 2: Crear o validar vehículo
      if (!vehiculoIdFinal && vehiculo_marca && vehiculo_modelo) {
        // Buscar vehículo existente por placa
        let vehiculoExistente = null;

        if (vehiculo_placa) {
          vehiculoExistente = db
            .prepare('SELECT id FROM vehiculos WHERE placa = ?')
            .get(vehiculo_placa);
        }

        if (vehiculoExistente) {
          vehiculoIdFinal = vehiculoExistente.id;
        } else {
          // Crear nuevo vehículo
          vehiculoIdFinal = `vehiculo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          db.prepare(
            `
          INSERT INTO vehiculos (
            id, negocio_id, cliente_id, marca, modelo, placa, color,
            anio, kilometraje, vin, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `
          ).run(
            vehiculoIdFinal,
            negocioId || null,
            clienteIdFinal,
            vehiculo_marca,
            vehiculo_modelo,
            vehiculo_placa || null,
            vehiculo_color || null,
            vehiculo_anio || null,
            vehiculo_kilometraje || null,
            vehiculo_vin || null
          );
        }
      }

      // Validar que tenemos cliente y vehículo
      if (!clienteIdFinal) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere información del cliente (nombre y teléfono mínimo)',
        });
      }

      if (!vehiculoIdFinal) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere información del vehículo (marca y modelo mínimo)',
        });
      }

      // PASO 3: Crear la cita
      const citaId = `cita_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const descripcionFinal = problema
        ? `${descripcion || tipoServicio}\n\nProblema reportado: ${problema}`
        : descripcion || tipoServicio;

      db.prepare(
        `
      INSERT INTO citas (
        id, cliente_id, vehiculo_id, tipo_servicio, fecha, hora,
        duracion, tecnico_id, descripcion, prioridad, estado, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `
      ).run(
        citaId,
        clienteIdFinal,
        vehiculoIdFinal,
        tipoServicio,
        fecha,
        hora,
        duracion,
        tecnicoId || null,
        descripcionFinal,
        prioridad,
        estado
      );

      // Obtener la cita creada con todos los datos
      const citaCreada = db
        .prepare(
          `
      SELECT 
        c.*,
        cl.nombre as cliente_nombre,
        cl.telefono as cliente_telefono,
        cl.cedula as cliente_cedula,
        v.marca || ' ' || v.modelo || ' ' || COALESCE(v.placa, '') as vehiculo_descripcion,
        v.marca as vehiculo_marca,
        v.modelo as vehiculo_modelo,
        v.placa as vehiculo_placa,
        u.nombre as tecnico_nombre
      FROM citas c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      INNER JOIN vehiculos v ON c.vehiculo_id = v.id
      LEFT JOIN usuarios u ON c.tecnico_id = u.id
      WHERE c.id = ?
    `
        )
        .get(citaId);

      // 🔔 CREAR NOTIFICACIÓN AUTOMÁTICA PARA LA CITA
      try {
        if (global.notificationHub) {
          const fechaHoraCita = new Date(`${fecha}T${hora}`);
          const ahora = new Date();
          const horasRestantes = Math.ceil((fechaHoraCita - ahora) / (1000 * 60 * 60));

          await global.notificationHub.createEvent({
            negocio_id: negocioId || 'default',
            tipo_evento: 'cita',
            modulo_origen: 'agenda',
            referencia_id: citaId,
            titulo: `Cita programada: ${citaCreada.cliente_nombre}`,
            mensaje: `${citaCreada.tipo_servicio} - ${fecha} a las ${hora}${horasRestantes > 0 ? ` (En ${horasRestantes}h)` : ''}`,
            contexto: {
              cita_id: citaId,
              cliente_id: clienteIdFinal,
              cliente_nombre: citaCreada.cliente_nombre,
              cliente_telefono: citaCreada.cliente_telefono,
              vehiculo_id: vehiculoIdFinal,
              vehiculo_descripcion: citaCreada.vehiculo_descripcion,
              fecha_hora: `${fecha}T${hora}`,
              horas_restantes: horasRestantes,
              tipo_servicio: tipoServicio,
              prioridad: prioridad,
            },
            programado_para: fechaHoraCita.toISOString(),
          });
          console.log(`✅ Notificación creada para cita ${citaId}`);
        }
      } catch (notifError) {
        console.warn('⚠️ No se pudo crear notificación para la cita:', notifError.message);
      }

      res.status(201).json({
        success: true,
        message: 'Cita creada exitosamente',
        data: citaCreada,
        nuevos: {
          cliente_creado: cliente_id ? false : true,
          vehiculo_creado: vehiculo_id ? false : true,
        },
      });
    } catch (error) {
      console.error('Error creando cita completa:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear cita',
        error: error.message,
      });
    }
  });

  /**
   * POST /api/citas
   * Crea una nueva cita
   */
  router.post('/citas', (req, res) => {
    try {
      const db = req.db;
      const {
        clienteId,
        vehiculoId,
        tipoServicio,
        fecha,
        hora,
        duracion = 60,
        tecnicoId,
        descripcion,
        estado = 'pendiente',
      } = req.body;

      // Validaciones
      if (!clienteId || !vehiculoId || !tipoServicio || !fecha || !hora) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos: clienteId, vehiculoId, tipoServicio, fecha, hora',
        });
      }

      // Verificar que el cliente existe
      const cliente = db.prepare('SELECT id FROM clientes WHERE id = ?').get(clienteId);
      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado',
        });
      }

      // Verificar que el vehículo existe y pertenece al cliente
      const vehiculo = db
        .prepare('SELECT id, cliente_id FROM vehiculos WHERE id = ?')
        .get(vehiculoId);
      if (!vehiculo) {
        return res.status(404).json({
          success: false,
          message: 'Vehículo no encontrado',
        });
      }

      if (vehiculo.cliente_id !== clienteId) {
        return res.status(400).json({
          success: false,
          message: 'El vehículo no pertenece al cliente seleccionado',
        });
      }

      // Verificar técnico si se proporciona
      if (tecnicoId) {
        const tecnico = db
          .prepare('SELECT id FROM usuarios WHERE id = ? AND rol IN (?, ?)')
          .get(tecnicoId, 'tecnico', 'admin');
        if (!tecnico) {
          return res.status(404).json({
            success: false,
            message: 'Técnico no encontrado o no tiene permisos',
          });
        }
      }

      const citaId = `cita_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const stmt = db.prepare(`
      INSERT INTO citas (
        id, cliente_id, vehiculo_id, tipo_servicio, fecha, hora,
        duracion, tecnico_id, descripcion, estado, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

      stmt.run(
        citaId,
        clienteId,
        vehiculoId,
        tipoServicio,
        fecha,
        hora,
        duracion,
        tecnicoId || null,
        descripcion || null,
        estado
      );

      // Obtener la cita creada con datos relacionados
      const citaCreada = db
        .prepare(
          `
      SELECT 
        c.*,
        cl.nombre as cliente_nombre,
        v.marca || ' ' || v.modelo as vehiculo_descripcion,
        u.nombre as tecnico_nombre
      FROM citas c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      INNER JOIN vehiculos v ON c.vehiculo_id = v.id
      LEFT JOIN usuarios u ON c.tecnico_id = u.id
      WHERE c.id = ?
    `
        )
        .get(citaId);

      res.status(201).json({
        success: true,
        message: 'Cita creada exitosamente',
        data: citaCreada,
      });
    } catch (error) {
      console.error('Error creando cita:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear cita',
        error: error.message,
      });
    }
  });

  /**
   * PUT /api/citas/:id
   * Actualiza una cita existente
   */
  router.put('/citas/:id', (req, res) => {
    try {
      const db = req.db;
      const { id } = req.params;
      const { fecha, hora, duracion, tecnicoId, estado, descripcion } = req.body;

      // Verificar que la cita existe
      const citaExistente = db.prepare('SELECT id FROM citas WHERE id = ?').get(id);
      if (!citaExistente) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada',
        });
      }

      const updates = [];
      const params = [];

      if (fecha) {
        updates.push('fecha = ?');
        params.push(fecha);
      }

      if (hora) {
        updates.push('hora = ?');
        params.push(hora);
      }

      if (duracion) {
        updates.push('duracion = ?');
        params.push(duracion);
      }

      if (tecnicoId !== undefined) {
        updates.push('tecnico_id = ?');
        params.push(tecnicoId);
      }

      if (estado) {
        updates.push('estado = ?');
        params.push(estado);
      }

      if (descripcion !== undefined) {
        updates.push('descripcion = ?');
        params.push(descripcion);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar',
        });
      }

      updates.push("updated_at = datetime('now')");
      params.push(id);

      const query = `UPDATE citas SET ${updates.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...params);

      // Obtener la cita actualizada
      const citaActualizada = db
        .prepare(
          `
      SELECT 
        c.*,
        cl.nombre as cliente_nombre,
        v.marca || ' ' || v.modelo as vehiculo_descripcion,
        u.nombre as tecnico_nombre
      FROM citas c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      INNER JOIN vehiculos v ON c.vehiculo_id = v.id
      LEFT JOIN usuarios u ON c.tecnico_id = u.id
      WHERE c.id = ?
    `
        )
        .get(id);

      res.json({
        success: true,
        message: 'Cita actualizada exitosamente',
        data: citaActualizada,
      });
    } catch (error) {
      console.error('Error actualizando cita:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar cita',
        error: error.message,
      });
    }
  });

  /**
   * DELETE /api/citas/:id
   * Cancela/elimina una cita
   */
  router.delete('/citas/:id', (req, res) => {
    try {
      const db = req.db;
      const { id } = req.params;

      const cita = db.prepare('SELECT id FROM citas WHERE id = ?').get(id);
      if (!cita) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada',
        });
      }

      db.prepare('DELETE FROM citas WHERE id = ?').run(id);

      res.json({
        success: true,
        message: 'Cita cancelada exitosamente',
      });
    } catch (error) {
      console.error('Error cancelando cita:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cancelar cita',
        error: error.message,
      });
    }
  });

  /**
   * POST /api/citas/convertir-a-ot
   * Convierte una cita en una orden de trabajo
   */
  router.post('/citas/convertir-a-ot', (req, res) => {
    try {
      const db = req.db;
      const { citaId } = req.body;

      if (!citaId) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita requerido',
        });
      }

      // Obtener la cita con toda su información
      const cita = db
        .prepare(
          `
      SELECT 
        c.*,
        v.marca, v.modelo, v.placa, v.kilometraje
      FROM citas c
      INNER JOIN vehiculos v ON c.vehiculo_id = v.id
      WHERE c.id = ?
    `
        )
        .get(citaId);

      if (!cita) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada',
        });
      }

      // Generar número de OT
      const ultimaOT = db
        .prepare('SELECT numero FROM ordenes_trabajo ORDER BY numero DESC LIMIT 1')
        .get();
      let numeroOT = 1;
      if (ultimaOT && ultimaOT.numero) {
        const match = ultimaOT.numero.match(/\d+/);
        if (match) {
          numeroOT = parseInt(match[0]) + 1;
        }
      }
      const numeroFormateado = `OT-${String(numeroOT).padStart(6, '0')}`;

      const otId = `ot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Crear la orden de trabajo
      const stmtOT = db.prepare(`
      INSERT INTO ordenes_trabajo (
        id, numero, cliente_id, vehiculo_id, 
        fecha_recepcion, problema_reportado, diagnostico_inicial,
        tecnico_asignado_id, estado, kilometraje,
        subtotal_servicios, subtotal_repuestos, descuento, iva, total,
        created_at
      ) VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, 'recibido', ?, 0, 0, 0, 0, 0, datetime('now'))
    `);

      stmtOT.run(
        otId,
        numeroFormateado,
        cita.cliente_id,
        cita.vehiculo_id,
        cita.descripcion || cita.tipo_servicio || 'Servicio programado desde cita',
        `Servicio programado: ${cita.tipo_servicio}`,
        cita.tecnico_id || null,
        cita.kilometraje || null
      );

      // Actualizar la cita como completada/convertida
      db.prepare("UPDATE citas SET estado = ?, updated_at = datetime('now') WHERE id = ?").run(
        'convertida',
        citaId
      );

      // Obtener la OT creada
      const otCreada = db
        .prepare(
          `
      SELECT 
        ot.*,
        cl.nombre as cliente_nombre,
        v.marca || ' ' || v.modelo || ' ' || COALESCE(v.placa, '') as vehiculo_descripcion,
        u.nombre as tecnico_nombre
      FROM ordenes_trabajo ot
      INNER JOIN clientes cl ON ot.cliente_id = cl.id
      INNER JOIN vehiculos v ON ot.vehiculo_id = v.id
      LEFT JOIN usuarios u ON ot.tecnico_asignado_id = u.id
      WHERE ot.id = ?
    `
        )
        .get(otId);

      res.status(201).json({
        success: true,
        message: 'Orden de trabajo creada exitosamente desde la cita',
        data: otCreada,
      });
    } catch (error) {
      console.error('Error convirtiendo cita a OT:', error);
      res.status(500).json({
        success: false,
        message: 'Error al convertir cita a orden de trabajo',
        error: error.message,
      });
    }
  });

  /**
   * GET /api/ordenes-trabajo/mis-tareas
   * Obtiene las órdenes de trabajo asignadas al técnico actual
   */
  router.get('/ordenes-trabajo/mis-tareas', (req, res) => {
    try {
      const db = req.db;
      const tecnicoId = req.user?.userId || req.user?.id;

      if (!tecnicoId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
      }

      const ordenesQuery = `
      SELECT 
        ot.*,
        cl.nombre as cliente_nombre,
        cl.telefono as cliente_telefono,
        v.marca || ' ' || v.modelo || ' ' || COALESCE(v.placa, '') as vehiculo_descripcion,
        v.marca, v.modelo, v.placa, v.kilometraje,
        (SELECT COUNT(*) FROM ordenes_trabajo_servicios WHERE orden_id = ot.id) as num_servicios,
        (SELECT COUNT(*) FROM ordenes_trabajo_repuestos WHERE orden_id = ot.id) as num_repuestos
      FROM ordenes_trabajo ot
      INNER JOIN clientes cl ON ot.cliente_id = cl.id
      INNER JOIN vehiculos v ON ot.vehiculo_id = v.id
      WHERE ot.tecnico_asignado_id = ?
        AND ot.estado NOT IN ('entregado', 'cancelado')
      ORDER BY 
        CASE ot.estado
          WHEN 'urgente' THEN 1
          WHEN 'en_proceso' THEN 2
          WHEN 'espera_repuestos' THEN 3
          WHEN 'recibido' THEN 4
          ELSE 5
        END,
        ot.fecha_recepcion DESC
    `;

      const ordenes = db.prepare(ordenesQuery).all(tecnicoId);

      res.json({
        success: true,
        data: ordenes,
        total: ordenes.length,
      });
    } catch (error) {
      console.error('Error obteniendo mis tareas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener tareas asignadas',
        error: error.message,
      });
    }
  });

  /**
   * GET /api/catalogo/marcas
   * Obtiene todas las marcas de vehículos
   */
  router.get('/catalogo/marcas', (req, res) => {
    try {
      const db = req.db;

      const marcas = db
        .prepare(
          `
      SELECT id, nombre, pais_origen, logo_url
      FROM marcas_vehiculos
      WHERE activo = 1
      ORDER BY nombre
    `
        )
        .all();

      res.json({
        success: true,
        data: marcas,
      });
    } catch (error) {
      console.error('Error obteniendo marcas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener marcas de vehículos',
        error: error.message,
      });
    }
  });

  /**
   * GET /api/catalogo/modelos
   * Obtiene modelos de vehículos por marca
   */
  router.get('/catalogo/modelos', (req, res) => {
    try {
      const db = req.db;
      const { marcaId } = req.query;

      if (!marcaId) {
        return res.status(400).json({
          success: false,
          message: 'marcaId es requerido',
        });
      }

      const modelos = db
        .prepare(
          `
      SELECT id, nombre, tipo_vehiculo, anio_inicio, anio_fin, motor_defecto
      FROM modelos_vehiculos
      WHERE marca_id = ? AND activo = 1
      ORDER BY nombre
    `
        )
        .all(marcaId);

      res.json({
        success: true,
        data: modelos,
      });
    } catch (error) {
      console.error('Error obteniendo modelos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener modelos de vehículos',
        error: error.message,
      });
    }
  });

  /**
   * POST /api/catalogo/repuestos/buscar
   * Busca repuestos compatibles con un vehículo
   */
  router.post('/catalogo/repuestos/buscar', (req, res) => {
    try {
      const db = req.db;
      const { marcaId, modeloId, anio, termino } = req.body;

      let query = `
      SELECT DISTINCT
        p.id, p.codigo, p.nombre, p.descripcion,
        p.precio_venta, p.stock, p.categoria_id,
        c.nombre as categoria_nombre,
        np.numero_parte_oem, np.numero_parte_aftermarket
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN productos_compatibilidad pc ON p.id = pc.producto_id
      LEFT JOIN numeros_parte np ON p.id = np.producto_id
      WHERE p.activo = 1
    `;

      const params = [];

      if (marcaId && modeloId) {
        query += ' AND pc.marca_vehiculo_id = ? AND pc.modelo_vehiculo_id = ?';
        params.push(marcaId, modeloId);

        if (anio) {
          query += ' AND (pc.anio_inicio IS NULL OR pc.anio_inicio <= ?)';
          query += ' AND (pc.anio_fin IS NULL OR pc.anio_fin >= ?)';
          params.push(anio, anio);
        }
      }

      if (termino) {
        query += ` AND (
        p.nombre LIKE ? OR 
        p.codigo LIKE ? OR 
        p.descripcion LIKE ? OR
        np.numero_parte_oem LIKE ? OR
        np.numero_parte_aftermarket LIKE ?
      )`;
        const terminoBusqueda = `%${termino}%`;
        params.push(
          terminoBusqueda,
          terminoBusqueda,
          terminoBusqueda,
          terminoBusqueda,
          terminoBusqueda
        );
      }

      query += ' ORDER BY p.nombre LIMIT 50';

      const repuestos = db.prepare(query).all(...params);

      res.json({
        success: true,
        data: repuestos,
        total: repuestos.length,
      });
    } catch (error) {
      console.error('Error buscando repuestos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar repuestos',
        error: error.message,
      });
    }
  });

  return router;
}

module.exports = createTallerRouter;
