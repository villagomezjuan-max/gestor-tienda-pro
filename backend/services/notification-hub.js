// ============================================
// SERVICIO: Notification Hub - Centro de Notificaciones Inteligentes
// ============================================
// Hub central que orquesta eventos, IA y canales de envío

const axios = require('axios');
const Database = require('better-sqlite3');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

const AIOrchestrator = require('./ai-orchestrator');

const MISSING_TABLE_HINT =
  'Ejecuta la migración 003_notificaciones_inteligentes.sql o el script backend/scripts/install-notifications.js.';
const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  canal_sistema: 1,
  canal_telegram: 0,
  canal_push: 1,
  canal_email: 0,
  tipo_stock_bajo: 1,
  tipo_productos_vencer: 1,
  tipo_ordenes_trabajo: 1,
  tipo_tareas_agenda: 1,
  tipo_ventas: 1,
  tipo_recordatorios: 1,
  horario_silencioso_activo: 0,
  horario_silencioso_inicio: '22:00',
  horario_silencioso_fin: '06:00',
  frecuencia_resumen: 'diario',
  hora_resumen: '08:00',
  agrupacion_minutos: 30,
  limite_diario: 50,
  lunes: 1,
  martes: 1,
  miercoles: 1,
  jueves: 1,
  viernes: 1,
  sabado: 0,
  domingo: 0,
});

class NotificationHub {
  constructor(dbPath, config = {}) {
    this.db = new Database(dbPath);
    this.config = {
      batchWindow: config.batchWindow || 30, // minutos
      maxDailyPerUser: config.maxDailyPerUser || 50,
      retryAttempts: config.retryAttempts || 3,
      enableIA: config.enableIA !== false,
      ...config,
    };

    const deepseekKey = config.deepseekApiKey || process.env.DEEPSEEK_API_KEY || '';
    const geminiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || '';

    this.health = {
      ia: {
        enabled: false,
        deepseekConfigured: Boolean(deepseekKey),
        geminiConfigured: Boolean(geminiKey),
        lastError: null,
      },
      migrations: {
        missingTables: [],
        ok: true,
      },
      lastQueueProcess: null,
    };

    // Cola en memoria (simple, para producción usar Redis/BullMQ)
    this.pendingQueue = [];
    this.processing = false;
    this.schedulerJobs = [];

    if (!this.health.ia.deepseekConfigured && !this.health.ia.geminiConfigured) {
      this.config.enableIA = false;
      console.warn(
        '⚠️ NotificationHub: IA deshabilitada porque no se detectaron claves de Deepseek ni Gemini.'
      );
    }

    // Inicializar orquestador IA sólo si hay claves válidas
    if (this.config.enableIA) {
      try {
        this.aiOrchestrator = new AIOrchestrator({
          geminiApiKey: geminiKey,
          deepseekApiKey: deepseekKey,
          cacheEnabled: true,
        });
        this.health.ia.enabled = true;
      } catch (error) {
        this.health.ia.lastError = error.message;
        this.config.enableIA = false;
        console.warn(
          '⚠️ NotificationHub: ejecutando sin IA por error al inicializar el orquestador.',
          error.message
        );
      }
    } else {
      console.info('ℹ️ NotificationHub funcionando en modo básico (sin IA).');
    }

    // Inicializar tablas si no existen
    this._ensureTables();

    // Iniciar procesadores automáticos
    this._startSchedulers();

    console.log('✅ NotificationHub inicializado');
  }

  _registerMissingTable(tableName) {
    if (!tableName) {
      return;
    }

    if (!this.health.migrations.missingTables.includes(tableName)) {
      this.health.migrations.missingTables.push(tableName);
    }
    this.health.migrations.ok = false;
  }

  /**
   * Asegurar que existen las tablas necesarias
   */
  _ensureTables() {
    // Las tablas se crean con la migración 003_notificaciones_inteligentes.sql
    // Aquí solo verificamos
    const tables = [
      'notificacion_eventos',
      'notificacion_logs',
      'usuarios_notificacion_preferencias',
    ];
    tables.forEach((table) => {
      const exists = this.db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(table);
      if (!exists) {
        if (!this.health.migrations.missingTables.includes(table)) {
          this.health.migrations.missingTables.push(table);
        }
        this.health.migrations.ok = false;
        console.warn(`⚠️ Tabla ${table} no existe. ${MISSING_TABLE_HINT}`);
      }
    });

    if (this.health.migrations.missingTables.length === 0) {
      this.health.migrations.ok = true;
    }
  }

  /**
   * Iniciar schedulers automáticos
   */
  _startSchedulers() {
    // Procesar cola cada 5 minutos
    const processJob = cron.schedule('*/5 * * * *', () => {
      this.processQueue().catch((err) => console.error('Error en procesamiento de cola:', err));
    });

    // Resumen diario a las 8:00 AM
    const summaryJob = cron.schedule('0 8 * * *', () => {
      this.generateDailySummaries().catch((err) => console.error('Error en resumen diario:', err));
    });

    // Limpiar eventos expirados cada hora
    const cleanupJob = cron.schedule('0 * * * *', () => {
      this.cleanupExpiredEvents();
    });

    this.schedulerJobs.push(processJob, summaryJob, cleanupJob);

    console.log('⏰ Schedulers de notificaciones iniciados');
  }

  /**
   * Crear evento de notificación
   */
  async createEvent(eventData) {
    const {
      negocio_id,
      tipo_evento,
      modulo_origen,
      referencia_id = null,
      contexto = {},
      titulo,
      mensaje,
      usuarios_destino = [],
      programado_para = null,
      expira_en = null,
    } = eventData;

    // Validaciones
    if (!negocio_id || !tipo_evento || !modulo_origen) {
      throw new Error('Datos incompletos para crear evento');
    }

    const evento_id = uuidv4();
    let score_urgencia = 5.0;
    let score_impacto = 5.0;
    let razon_ia = null;
    let mensaje_enriquecido = null;

    // Análisis con IA si está habilitado
    if (this.config.enableIA && this.aiOrchestrator) {
      try {
        // WORKFLOW 1: Scoring con Deepseek
        const analysis = await this.aiOrchestrator.analyzeEventPriority({
          tipo_evento,
          modulo_origen,
          contexto,
          titulo,
          mensaje,
        });

        score_urgencia = analysis.urgencia || 5.0;
        score_impacto = analysis.impacto || 5.0;
        razon_ia = analysis.razon;

        // Guardar análisis en caché
        this._saveIAContext(
          'scoring',
          {
            evento_id,
            tipo_evento,
            contexto,
          },
          analysis
        );

        // WORKFLOW 2: Enriquecimiento con Gemini
        const enriched = await this.aiOrchestrator.enrichMessage(
          { tipo_evento, titulo, mensaje, contexto },
          analysis
        );

        mensaje_enriquecido = `${enriched.emoji || '📢'} ${enriched.titulo}\n${enriched.mensaje}`;
        if (enriched.cta) {
          mensaje_enriquecido += `\n\n👉 ${enriched.cta}`;
        }

        // Guardar enriquecimiento
        this._saveIAContext(
          'enriquecimiento',
          {
            evento_id,
            mensaje_original: mensaje,
          },
          enriched
        );
      } catch (error) {
        console.error('Error en procesamiento IA:', error);
        this.health.ia.lastError = error.message;
        // Continuar sin IA en caso de error
      }
    } else {
      razon_ia = razon_ia || 'Procesamiento IA deshabilitado.';
    }

    // Insertar evento
    const stmt = this.db.prepare(`
      INSERT INTO notificacion_eventos (
        id, negocio_id, tipo_evento, modulo_origen, referencia_id,
        contexto, score_urgencia, score_impacto, razon_ia,
        titulo, mensaje, mensaje_enriquecido,
        programado_para, expira_en, estado, usuarios_destino
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)
    `);

    stmt.run(
      evento_id,
      negocio_id,
      tipo_evento,
      modulo_origen,
      referencia_id,
      JSON.stringify(contexto),
      score_urgencia,
      score_impacto,
      razon_ia,
      titulo,
      mensaje,
      mensaje_enriquecido,
      programado_para,
      expira_en,
      JSON.stringify(usuarios_destino)
    );

    console.log(
      `📝 Evento creado: ${evento_id} | Score: ${score_urgencia.toFixed(1)}/${score_impacto.toFixed(1)}`
    );

    // Agregar a cola de procesamiento si es inmediato
    if (!programado_para) {
      this.pendingQueue.push(evento_id);
      // Procesar inmediatamente si es alta prioridad
      if (score_urgencia >= 8 || score_impacto >= 8) {
        setImmediate(() => this.processQueue());
      }
    }

    return {
      id: evento_id,
      score_urgencia,
      score_impacto,
      estado: 'pendiente',
    };
  }

  /**
   * Obtener preferencias de un usuario
   */
  getUserPreferences(usuario_id, negocio_id) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM usuarios_notificacion_preferencias
        WHERE usuario_id = ? AND (negocio_id = ? OR negocio_id IS NULL)
        ORDER BY negocio_id DESC
        LIMIT 1
      `);

      const prefs = stmt.get(usuario_id, negocio_id);

      if (!prefs) {
        return { ...DEFAULT_NOTIFICATION_PREFERENCES };
      }

      return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...prefs };
    } catch (error) {
      if (/no such (table|column)/i.test(error.message)) {
        console.warn(
          '⚠️ NotificationHub: tabla de preferencias no encontrada. Usando valores por defecto.'
        );
        this._registerMissingTable('usuarios_notificacion_preferencias');
        return { ...DEFAULT_NOTIFICATION_PREFERENCES };
      }

      console.error('Error obteniendo preferencias de usuario:', error);
      throw error;
    }
  }

  /**
   * Verificar si está en horario silencioso
   */
  _isQuietHours(preferences) {
    if (!preferences.horario_silencioso_activo) return false;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dayOfWeek = now.getDay(); // 0=domingo, 6=sábado

    // Verificar día de la semana
    const dayEnabled = {
      0: preferences.domingo,
      1: preferences.lunes,
      2: preferences.martes,
      3: preferences.miercoles,
      4: preferences.jueves,
      5: preferences.viernes,
      6: preferences.sabado,
    }[dayOfWeek];

    if (!dayEnabled) return true; // Día silenciado

    // Verificar horario
    if (
      currentTime >= preferences.horario_silencioso_inicio ||
      currentTime <= preferences.horario_silencioso_fin
    ) {
      return true;
    }

    return false;
  }

  /**
   * Procesar cola de eventos pendientes
   */
  async processQueue() {
    if (this.processing || this.pendingQueue.length === 0) {
      return;
    }

    this.processing = true;
    console.log(`🔄 Procesando ${this.pendingQueue.length} eventos en cola...`);

    try {
      this.health.lastQueueProcess = new Date().toISOString();
      // Obtener eventos de la cola
      const eventIds = [...this.pendingQueue];
      this.pendingQueue = [];

      const eventos = this.db
        .prepare(
          `
        SELECT * FROM notificacion_eventos
        WHERE id IN (${eventIds.map(() => '?').join(',')})
        AND estado = 'pendiente'
        AND (programado_para IS NULL OR programado_para <= datetime('now'))
        AND (expira_en IS NULL OR expira_en > datetime('now'))
        ORDER BY score_final DESC
      `
        )
        .all(...eventIds);

      if (eventos.length === 0) {
        console.log('No hay eventos válidos para procesar');
        return;
      }

      // WORKFLOW 3: Sugerir agrupación con IA
      let grupos = [];
      if (this.config.enableIA && eventos.length >= 2) {
        try {
          grupos = await this.aiOrchestrator.suggestGrouping(eventos);
        } catch (error) {
          console.error('Error en agrupación IA:', error);
        }
      }

      // Procesar eventos agrupados
      for (const grupo of grupos) {
        await this._sendGroupedNotification(grupo, eventos);
      }

      // Procesar eventos individuales no agrupados
      const eventosAgrupados = new Set(grupos.flatMap((g) => g.eventos));
      const eventosSinAgrupar = eventos.filter((e) => !eventosAgrupados.has(e.id));

      for (const evento of eventosSinAgrupar) {
        await this._sendEventNotification(evento);
      }

      console.log(`✅ Procesados ${eventos.length} eventos (${grupos.length} grupos)`);
    } catch (error) {
      console.error('Error procesando cola:', error);
      this.health.lastError = error.message;
    } finally {
      this.processing = false;
    }
  }

  /**
   * Enviar notificación de evento individual
   */
  async _sendEventNotification(evento) {
    const usuarios = JSON.parse(evento.usuarios_destino || '[]');

    if (usuarios.length === 0) {
      // Obtener usuarios del negocio con preferencias activas
      const usuariosNegocio = this.db
        .prepare(
          `
        SELECT DISTINCT u.id, u.telegram_chat_id
        FROM usuarios u
        LEFT JOIN usuarios_notificacion_preferencias p ON u.id = p.usuario_id
        WHERE u.activo = 1
        AND (
          p.tipo_${evento.tipo_evento} = 1 
          OR p.id IS NULL
        )
      `
        )
        .all();

      usuarios.push(...usuariosNegocio.map((u) => u.id));
    }

    for (const usuario_id of usuarios) {
      await this._sendToUser(evento, usuario_id);
    }

    // Marcar como enviado
    this.db
      .prepare(
        `
      UPDATE notificacion_eventos
      SET estado = 'enviado', enviado_at = datetime('now')
      WHERE id = ?
    `
      )
      .run(evento.id);
  }

  /**
   * Enviar notificación agrupada
   */
  async _sendGroupedNotification(grupo, eventos) {
    const grupo_id = uuidv4();
    const eventosGrupo = eventos.filter((e) => grupo.eventos.includes(e.id));

    // Crear mensaje agrupado
    const mensaje =
      `📦 ${grupo.titulo_grupo}\n\n` +
      eventosGrupo.map((e) => `• ${e.titulo}`).join('\n') +
      `\n\n${grupo.razon}`;

    // Obtener usuarios únicos
    const usuariosSet = new Set();
    eventosGrupo.forEach((e) => {
      const users = JSON.parse(e.usuarios_destino || '[]');
      users.forEach((u) => usuariosSet.add(u));
    });

    // Enviar a cada usuario
    for (const usuario_id of usuariosSet) {
      await this._sendToUser(
        {
          ...eventosGrupo[0],
          mensaje,
          titulo: grupo.titulo_grupo,
        },
        usuario_id,
        grupo_id
      );
    }

    // Marcar eventos como agrupados
    this.db
      .prepare(
        `
      UPDATE notificacion_eventos
      SET estado = 'agrupado', grupo_id = ?, enviado_at = datetime('now')
      WHERE id IN (${grupo.eventos.map(() => '?').join(',')})
    `
      )
      .run(grupo_id, ...grupo.eventos);
  }

  /**
   * Enviar notificación a usuario específico
   */
  async _sendToUser(evento, usuario_id, grupo_id = null) {
    const prefs = this.getUserPreferences(usuario_id, evento.negocio_id);

    // Verificar horario silencioso
    if (this._isQuietHours(prefs)) {
      console.log(`🔇 Usuario ${usuario_id} en horario silencioso`);
      return;
    }

    // Verificar límite diario
    const today = new Date().toISOString().split('T')[0];
    const countToday = this.db
      .prepare(
        `
      SELECT COUNT(*) as count FROM notificacion_logs
      WHERE usuario_id = ? AND DATE(enviado_at) = ?
    `
      )
      .get(usuario_id, today);

    if (countToday.count >= prefs.limite_diario) {
      console.log(`⚠️ Usuario ${usuario_id} alcanzó límite diario (${prefs.limite_diario})`);
      return;
    }

    // Determinar canales a usar
    const canales = [];
    if (prefs.canal_telegram) canales.push('telegram');
    if (prefs.canal_push) canales.push('push');
    if (prefs.canal_sistema) canales.push('sistema');

    if (canales.length === 0) {
      console.log(`⚠️ Usuario ${usuario_id} sin canales habilitados`);
      return;
    }

    // Enviar por cada canal
    for (const canal of canales) {
      await this._sendViaChannel(canal, evento, usuario_id, grupo_id);
    }
  }

  /**
   * Enviar por canal específico
   */
  _getTelegramConfig(negocio_id) {
    try {
      // Priorizar configuración específica del negocio, luego fallback a global
      const stmt = this.db.prepare(`
            SELECT valor FROM configuracion_tienda 
            WHERE clave = 'configuracionAvanzada' 
            AND (negocio_id = ? OR negocio_id IS NULL)
            ORDER BY negocio_id DESC 
            LIMIT 1
        `);
      const configRow = stmt.get(negocio_id);

      if (!configRow || !configRow.valor) {
        return null;
      }

      const config = JSON.parse(configRow.valor);
      return config.telegram || null;
    } catch (error) {
      if (error.message.includes('no such table')) {
        console.warn(
          'Tabla configuracion_tienda no encontrada. El envío de notificaciones de Telegram fallará.'
        );
      } else {
        console.error('Error obteniendo configuración de Telegram:', error);
      }
      return null;
    }
  }

  /**
   * Enviar por canal específico
   */
  async _sendViaChannel(canal, evento, usuario_id, grupo_id = null) {
    const startTime = Date.now();
    let estado = 'exito';
    let codigo_error = null;
    let mensaje_error = null;
    let metadata = {};

    try {
      switch (canal) {
        case 'telegram': {
          const telegramConfig = this._getTelegramConfig(evento.negocio_id);
          if (!telegramConfig || !telegramConfig.botToken) {
            throw new Error('Bot Token de Telegram no configurado');
          }

          const usuario = this.db
            .prepare('SELECT telegram_chat_id FROM usuarios WHERE id = ?')
            .get(usuario_id);
          if (!usuario?.telegram_chat_id) {
            throw new Error(`Usuario ${usuario_id} sin chat_id de Telegram`);
          }

          const botToken = telegramConfig.botToken;
          const chatId = usuario.telegram_chat_id;
          const texto = evento.mensaje_enriquecido || evento.mensaje;

          const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
          const payload = {
            chat_id: chatId,
            text: texto,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
          };

          const response = await axios.post(url, payload, { timeout: 10000 });

          if (!response.data.ok) {
            throw new Error(response.data.description || 'Error desconocido de la API de Telegram');
          }

          metadata.telegram_chat_id = chatId;
          metadata.telegram_message_id = response.data.result.message_id.toString();
          break;
        }
        case 'push':
          // Integración con notificaciones push del navegador
          metadata.push_endpoint = 'browser';
          break;

        case 'sistema':
          // Notificación interna del sistema (toast/panel)
          metadata.sistema_tipo = 'toast';
          break;

        default:
          throw new Error(`Canal desconocido: ${canal}`);
      }
    } catch (error) {
      estado = 'fallido';
      codigo_error = error.response?.data?.error_code?.toString() || error.code || 'UNKNOWN';
      mensaje_error = error.response?.data?.description || error.message;
      console.error(`Error enviando por ${canal} al usuario ${usuario_id}:`, mensaje_error);
    }

    // Registrar log
    this.db
      .prepare(
        `
      INSERT INTO notificacion_logs (
        evento_id, usuario_id, negocio_id, canal,
        estado, codigo_error, mensaje_error,
        tiempo_respuesta_ms, telegram_message_id, telegram_chat_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        evento.id,
        usuario_id,
        evento.negocio_id,
        canal,
        estado,
        codigo_error,
        mensaje_error,
        Date.now() - startTime,
        metadata.telegram_message_id || null,
        metadata.telegram_chat_id || null
      );

    return estado === 'exito';
  }

  /**
   * Generar resúmenes diarios
   */
  async generateDailySummaries() {
    console.log('📊 Generando resúmenes diarios...');

    // Obtener eventos del día por negocio
    const negocios = this.db
      .prepare(
        `
      SELECT DISTINCT negocio_id FROM notificacion_eventos
      WHERE DATE(created_at) = DATE('now')
    `
      )
      .all();

    for (const { negocio_id } of negocios) {
      try {
        const eventos = this.db
          .prepare(
            `
          SELECT * FROM notificacion_eventos
          WHERE negocio_id = ? AND DATE(created_at) = DATE('now')
          ORDER BY score_final DESC
        `
          )
          .all(negocio_id);

        if (eventos.length === 0) continue;

        // Obtener info del negocio
        const negocioInfo = { nombre: negocio_id }; // TODO: obtener de tabla negocios

        // WORKFLOW 4: Generar resumen con Gemini
        if (this.config.enableIA) {
          const resumen = await this.aiOrchestrator.generateDailySummary(eventos, negocioInfo);

          // Crear evento de resumen
          await this.createEvent({
            negocio_id,
            tipo_evento: 'resumen_diario',
            modulo_origen: 'notification_hub',
            titulo: '📊 Resumen Diario',
            mensaje: resumen.contenido,
            contexto: {
              eventos_incluidos: resumen.eventos_incluidos,
              generado_por_ia: true,
            },
          });
        }
      } catch (error) {
        console.error(`Error generando resumen para ${negocio_id}:`, error);
      }
    }
  }

  /**
   * Limpiar eventos expirados
   */
  cleanupExpiredEvents() {
    const result = this.db
      .prepare(
        `
      UPDATE notificacion_eventos
      SET estado = 'expirado'
      WHERE expira_en IS NOT NULL
      AND expira_en < datetime('now')
      AND estado = 'pendiente'
    `
      )
      .run();

    if (result.changes > 0) {
      console.log(`🧹 ${result.changes} eventos expirados marcados`);
    }
  }

  /**
   * Guardar contexto IA en caché
   */
  _saveIAContext(tipo_analisis, input, output) {
    const crypto = require('crypto');
    const input_hash = crypto.createHash('md5').update(JSON.stringify(input)).digest('hex');

    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + 24); // 24 horas

    try {
      this.db
        .prepare(
          `
        INSERT OR REPLACE INTO notificacion_contexto_ia (
          negocio_id, tipo_analisis, input_hash, output_data,
          modelo_usado, tokens_consumidos, latencia_ms, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          input.negocio_id || 'global',
          tipo_analisis,
          input_hash,
          JSON.stringify(output),
          output.modelo_usado || 'unknown',
          output.tokens || 0,
          output.latencia_ms || 0,
          expires_at.toISOString()
        );
    } catch (error) {
      console.error('Error guardando contexto IA:', error);
    }
  }

  /**
   * Obtener estadísticas
   */
  getStats(negocio_id = null) {
    const params = negocio_id ? { negocioId: negocio_id } : {};
    const emptyEventos = {
      total: 0,
      pendientes: 0,
      enviados: 0,
      score_promedio: 0,
    };
    const emptyLogs = {
      total: 0,
      exitosos: 0,
      fallidos: 0,
      tiempo_promedio: 0,
    };

    let eventos = { ...emptyEventos };
    let logs = { ...emptyLogs };

    try {
      const eventosResult = this.db
        .prepare(
          `
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
          SUM(CASE WHEN estado = 'enviado' THEN 1 ELSE 0 END) AS enviados,
          AVG(score_final) AS score_promedio
        FROM notificacion_eventos
        ${negocio_id ? 'WHERE negocio_id = @negocioId' : ''}
      `
        )
        .get(params);

      if (eventosResult) {
        eventos = { ...emptyEventos, ...eventosResult };
      }
    } catch (error) {
      if (/no such (table|column)/i.test(error.message)) {
        console.warn(
          '⚠️ NotificationHub: tabla notificacion_eventos no encontrada. Estadísticas vacías.'
        );
        this._registerMissingTable('notificacion_eventos');
      } else {
        console.error('Error obteniendo estadísticas de eventos:', error);
        throw error;
      }
    }

    try {
      const logsResult = this.db
        .prepare(
          `
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN estado = 'exito' THEN 1 ELSE 0 END) AS exitosos,
          SUM(CASE WHEN estado = 'fallido' THEN 1 ELSE 0 END) AS fallidos,
          AVG(tiempo_respuesta_ms) AS tiempo_promedio
        FROM notificacion_logs
        ${negocio_id ? 'WHERE negocio_id = @negocioId' : ''}
      `
        )
        .get(params);

      if (logsResult) {
        logs = { ...emptyLogs, ...logsResult };
      }
    } catch (error) {
      if (/no such (table|column)/i.test(error.message)) {
        console.warn(
          '⚠️ NotificationHub: tabla notificacion_logs no encontrada. Estadísticas vacías.'
        );
        this._registerMissingTable('notificacion_logs');
      } else {
        console.error('Error obteniendo estadísticas de logs:', error);
        throw error;
      }
    }

    return {
      eventos,
      logs,
      cola_pendiente: this.pendingQueue.length,
      ia_habilitada: this.config.enableIA && !!this.aiOrchestrator,
      ia_stats: this.aiOrchestrator?.getStats?.() || null,
      health: this.getHealth(),
    };
  }

  getHealth() {
    const migrations = this.health.migrations.missingTables.length
      ? {
          ok: false,
          missingTables: [...new Set(this.health.migrations.missingTables)],
          hint: MISSING_TABLE_HINT,
        }
      : { ok: true, missingTables: [] };

    const ia = {
      enabled: this.config.enableIA && !!this.aiOrchestrator,
      deepseekConfigured: this.health.ia.deepseekConfigured,
      geminiConfigured: this.health.ia.geminiConfigured,
      lastError: this.health.ia.lastError,
    };

    return {
      migrations,
      ia,
      queue: {
        pending: this.pendingQueue.length,
        processing: this.processing,
        lastRun: this.health.lastQueueProcess,
      },
    };
  }

  /**
   * Cerrar conexión
   */
  close() {
    if (Array.isArray(this.schedulerJobs)) {
      this.schedulerJobs.forEach((job) => {
        try {
          if (job && typeof job.stop === 'function') {
            job.stop();
          }
        } catch (error) {
          console.warn('Error deteniendo scheduler de NotificationHub:', error.message);
        }
      });
      this.schedulerJobs = [];
    }

    this.db.close();
    console.log('NotificationHub cerrado');
  }
}

module.exports = NotificationHub;
