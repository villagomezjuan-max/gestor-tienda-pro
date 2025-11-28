// ============================================
// RUTAS: API de Notificaciones Inteligentes
// ============================================

const express = require('express');

const { authenticate, requireRole } = require('../middleware/auth');
const { ROLE_SUPER_ADMIN, ROLE_ADMIN } = require('../utils/roles');

function createNotificationRoutes(notificationHub, db) {
  const router = express.Router();

  const tableExistsCache = new Map();
  const tableExists = (name) => {
    if (!name) {
      return false;
    }

    if (tableExistsCache.has(name)) {
      return tableExistsCache.get(name);
    }

    try {
      const row = db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name = ? LIMIT 1`
        )
        .get(name);
      const exists = Boolean(row);
      if (exists) {
        tableExistsCache.set(name, true);
        return true;
      }

      tableExistsCache.delete(name);
      return false;
    } catch (error) {
      console.warn(`No se pudo verificar existencia de tabla ${name}:`, error.message);
      tableExistsCache.delete(name);
      return false;
    }
  };

  // Todas las rutas requieren autenticación
  router.use(authenticate);

  /**
   * GET /api/notifications/events
   * Obtener eventos de notificación
   */
  router.get('/events', (req, res) => {
    try {
      const { tipo, estado, limit = 50, offset = 0 } = req.query;
      const usuario = req.user;

      let query = `
        SELECT * FROM notificacion_eventos
        WHERE 1=1
      `;
      const params = [];

      // Filtrar por negocio del usuario (si no es super admin)
      if (usuario.rol !== ROLE_SUPER_ADMIN) {
        query += ` AND negocio_id = ?`;
        params.push(usuario.negocio_id);
      }

      if (tipo) {
        query += ` AND tipo_evento = ?`;
        params.push(tipo);
      }

      if (estado) {
        query += ` AND estado = ?`;
        params.push(estado);
      }

      query += ` ORDER BY score_final DESC, created_at DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      const eventos = db.prepare(query).all(...params);

      // Parsear JSON
      const eventosParsed = eventos.map((e) => ({
        ...e,
        contexto: JSON.parse(e.contexto || '{}'),
        usuarios_destino: JSON.parse(e.usuarios_destino || '[]'),
      }));

      res.json({
        success: true,
        data: eventosParsed,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: eventos.length,
        },
      });
    } catch (error) {
      console.error('Error obteniendo eventos:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener eventos',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/notifications/events
   * Crear nuevo evento de notificación
   */
  router.post('/events', async (req, res) => {
    try {
      const usuario = req.user;
      const eventData = {
        negocio_id: usuario.negocio_id,
        ...req.body,
      };

      const result = await notificationHub.createEvent(eventData);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error creando evento:', error);
      res.status(500).json({
        success: false,
        error: 'Error al crear evento',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/notifications/preferences
   * Obtener preferencias del usuario actual
   */
  router.get('/preferences', (req, res) => {
    try {
      const usuario = req.user;
      const prefs = notificationHub.getUserPreferences(usuario.id, usuario.negocio_id);

      res.json({
        success: true,
        data: prefs || {},
      });
    } catch (error) {
      console.error('Error obteniendo preferencias:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener preferencias',
        message: error.message,
      });
    }
  });

  /**
   * PUT /api/notifications/preferences
   * Actualizar preferencias del usuario
   */
  router.put('/preferences', (req, res) => {
    try {
      const usuario = req.user;
      const prefs = req.body;

      // Validar campos booleanos
      const booleanFields = [
        'canal_sistema',
        'canal_telegram',
        'canal_push',
        'canal_email',
        'tipo_stock_bajo',
        'tipo_productos_vencer',
        'tipo_ordenes_trabajo',
        'tipo_tareas_agenda',
        'tipo_ventas',
        'tipo_recordatorios',
        'horario_silencioso_activo',
        'solo_prioridad_alta',
      ];

      const validPrefs = {};
      booleanFields.forEach((field) => {
        if (field in prefs) {
          validPrefs[field] = prefs[field] ? 1 : 0;
        }
      });

      // Campos de texto
      [
        'frecuencia_resumen',
        'hora_resumen',
        'horario_silencioso_inicio',
        'horario_silencioso_fin',
      ].forEach((field) => {
        if (field in prefs) {
          validPrefs[field] = prefs[field];
        }
      });

      // Campos numéricos
      ['agrupacion_minutos', 'limite_diario'].forEach((field) => {
        if (field in prefs) {
          validPrefs[field] = parseInt(prefs[field]) || 0;
        }
      });

      // Días de la semana
      ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].forEach(
        (field) => {
          if (field in prefs) {
            validPrefs[field] = prefs[field] ? 1 : 0;
          }
        }
      );

      // Verificar si existen preferencias
      const existing = db
        .prepare(
          `
        SELECT id FROM usuarios_notificacion_preferencias
        WHERE usuario_id = ? AND negocio_id = ?
      `
        )
        .get(usuario.id, usuario.negocio_id);

      if (existing) {
        // Actualizar
        const fields = Object.keys(validPrefs)
          .map((k) => `${k} = ?`)
          .join(', ');
        const values = Object.values(validPrefs);

        db.prepare(
          `
          UPDATE usuarios_notificacion_preferencias
          SET ${fields}, updated_at = datetime('now')
          WHERE usuario_id = ? AND negocio_id = ?
        `
        ).run(...values, usuario.id, usuario.negocio_id);
      } else {
        // Insertar
        const fields = ['usuario_id', 'negocio_id', ...Object.keys(validPrefs)];
        const placeholders = fields.map(() => '?').join(', ');
        const values = [usuario.id, usuario.negocio_id, ...Object.values(validPrefs)];

        db.prepare(
          `
          INSERT INTO usuarios_notificacion_preferencias (${fields.join(', ')})
          VALUES (${placeholders})
        `
        ).run(...values);
      }

      res.json({
        success: true,
        message: 'Preferencias actualizadas',
      });
    } catch (error) {
      console.error('Error actualizando preferencias:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar preferencias',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/notifications/logs
   * Obtener historial de notificaciones enviadas
   */
  router.get('/logs', (req, res) => {
    try {
      const { limit = 100, offset = 0, canal, estado } = req.query;
      const usuario = req.user;

      let query = `
        SELECT nl.*, ne.titulo, ne.tipo_evento
        FROM notificacion_logs nl
        LEFT JOIN notificacion_eventos ne ON nl.evento_id = ne.id
        WHERE nl.usuario_id = ?
      `;
      const params = [usuario.id];

      if (canal) {
        query += ` AND nl.canal = ?`;
        params.push(canal);
      }

      if (estado) {
        query += ` AND nl.estado = ?`;
        params.push(estado);
      }

      query += ` ORDER BY nl.enviado_at DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      let logs = [];

      if (tableExists('notificacion_logs')) {
        if (!tableExists('notificacion_eventos')) {
          console.warn('⚠️ Vista de eventos para notificaciones no disponible. Se omite la unión.');
          query = `
            SELECT *
            FROM notificacion_logs
            WHERE usuario_id = ?
            ${canal ? ' AND canal = ?' : ''}
            ${estado ? ' AND estado = ?' : ''}
            ORDER BY enviado_at DESC LIMIT ? OFFSET ?
          `;
        }

        logs = db.prepare(query).all(...params);
      } else {
        console.warn('⚠️ Tabla notificacion_logs no encontrada. Devolviendo historial vacío.');
      }

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      console.error('Error obteniendo logs:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener historial',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/notifications/stats
   * Obtener estadísticas de notificaciones
   */
  router.get('/stats', (req, res) => {
    try {
      const usuario = req.user;
      const negocio_id = usuario.rol === ROLE_SUPER_ADMIN ? null : usuario.negocio_id;

      const stats = notificationHub.getStats(negocio_id);

      const warnings = [];
      if (stats?.health?.migrations && stats.health.migrations.ok === false) {
        warnings.push(
          'Faltan migraciones de notificaciones. Ejecuta el instalador para habilitar todas las métricas.'
        );
      }
      if (!stats?.ia_habilitada) {
        warnings.push('Motor IA deshabilitado o sin credenciales. Se usarán scores básicos.');
      }

      // Stats adicionales del usuario
      let userStats = [];
      if (tableExists('notificacion_logs')) {
        userStats = db
          .prepare(
            `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN estado = 'exito' THEN 1 ELSE 0 END) as exitosas,
            canal
          FROM notificacion_logs
          WHERE usuario_id = ?
          AND DATE(enviado_at) >= DATE('now', '-30 days')
          GROUP BY canal
        `
          )
          .all(usuario.id);
      } else {
        console.warn('⚠️ Tabla notificacion_logs no encontrada. Estadísticas de usuario vacías.');
      }

      res.json({
        success: true,
        data: {
          ...stats,
          usuario: userStats,
          warnings,
        },
      });
    } catch (error) {
      console.error('Error obteniendo stats:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener estadísticas',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/notifications/health
   * Estado general del Notification Hub
   */
  router.get('/health', (req, res) => {
    try {
      const health = notificationHub.getHealth();
      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      console.error('Error obteniendo health de NotificationHub:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener estado del NotificationHub',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/notifications/process-queue
   * Forzar procesamiento de cola (admin)
   */
  router.post('/process-queue', requireRole([ROLE_SUPER_ADMIN, ROLE_ADMIN]), async (req, res) => {
    try {
      await notificationHub.processQueue();

      res.json({
        success: true,
        message: 'Cola procesada',
      });
    } catch (error) {
      console.error('Error procesando cola:', error);
      res.status(500).json({
        success: false,
        error: 'Error al procesar cola',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/notifications/dashboard
   * Dashboard consolidado para vista principal
   */
  router.get('/dashboard', (req, res) => {
    try {
      const usuario = req.user;

      const dashboard = db
        .prepare(
          `
        SELECT * FROM v_notificaciones_dashboard
        WHERE negocio_id = ?
        AND created_at >= datetime('now', '-7 days')
        ORDER BY score_final DESC
        LIMIT 20
      `
        )
        .all(usuario.negocio_id);

      const pendientes = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM notificacion_eventos
        WHERE negocio_id = ? AND estado = 'pendiente'
      `
        )
        .get(usuario.negocio_id);

      res.json({
        success: true,
        data: {
          recientes: dashboard,
          pendientes: pendientes?.count || 0,
          actualizacion: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error obteniendo dashboard:', error);
      if (/no such table/i.test(error.message) || /no such view/i.test(error.message)) {
        return res.json({
          success: true,
          data: {
            recientes: [],
            pendientes: 0,
            actualizacion: new Date().toISOString(),
          },
          warning: 'Vista de dashboard no encontrada. Ejecuta las migraciones de notificaciones.',
        });
      }
      res.status(500).json({
        success: false,
        error: 'Error al obtener dashboard',
        message: error.message,
      });
    }
  });

  return router;
}

module.exports = createNotificationRoutes;
