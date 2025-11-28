-- ============================================
-- MIGRACIÓN: Sistema de Notificaciones Inteligentes
-- Versión: 1.0.0
-- Fecha: 2025-11-11
-- ============================================

-- Tabla de preferencias de notificación por usuario
CREATE TABLE IF NOT EXISTS usuarios_notificacion_preferencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id TEXT NOT NULL,
    negocio_id TEXT,
    
    -- Canales habilitados
    canal_sistema INTEGER DEFAULT 1,
    canal_telegram INTEGER DEFAULT 0,
    canal_push INTEGER DEFAULT 1,
    canal_email INTEGER DEFAULT 0,
    
    -- Tipos de notificación
    tipo_stock_bajo INTEGER DEFAULT 1,
    tipo_productos_vencer INTEGER DEFAULT 1,
    tipo_ordenes_trabajo INTEGER DEFAULT 1,
    tipo_tareas_agenda INTEGER DEFAULT 1,
    tipo_ventas INTEGER DEFAULT 0,
    tipo_recordatorios INTEGER DEFAULT 1,
    tipo_compras INTEGER DEFAULT 0,
    tipo_citas INTEGER DEFAULT 1,
    
    -- Configuración de frecuencia
    frecuencia_resumen TEXT DEFAULT 'diario', -- 'tiempo_real', 'diario', 'semanal', 'personalizado'
    hora_resumen TEXT DEFAULT '08:00',
    agrupacion_minutos INTEGER DEFAULT 30, -- Agrupar notificaciones en ventanas de X minutos
    
    -- Horarios silenciosos
    horario_silencioso_activo INTEGER DEFAULT 0,
    horario_silencioso_inicio TEXT DEFAULT '22:00',
    horario_silencioso_fin TEXT DEFAULT '07:00',
    
    -- Días de la semana (1=activo, 0=silenciado)
    lunes INTEGER DEFAULT 1,
    martes INTEGER DEFAULT 1,
    miercoles INTEGER DEFAULT 1,
    jueves INTEGER DEFAULT 1,
    viernes INTEGER DEFAULT 1,
    sabado INTEGER DEFAULT 0,
    domingo INTEGER DEFAULT 0,
    
    -- Prioridad y filtros
    solo_prioridad_alta INTEGER DEFAULT 0,
    limite_diario INTEGER DEFAULT 50, -- Máximo de notificaciones por día
    
    -- Metadatos
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    UNIQUE(usuario_id, negocio_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_usuario ON usuarios_notificacion_preferencias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_negocio ON usuarios_notificacion_preferencias(negocio_id);

-- Tabla de eventos/calendario dinámico gestionado por IA
CREATE TABLE IF NOT EXISTS notificacion_eventos (
    id TEXT PRIMARY KEY,
    negocio_id TEXT NOT NULL,
    
    -- Origen del evento
    tipo_evento TEXT NOT NULL, -- 'stock_bajo', 'producto_vencer', 'orden_trabajo', 'tarea', 'recordatorio', 'compra', 'venta', 'cita'
    modulo_origen TEXT NOT NULL, -- Módulo que generó el evento
    referencia_id TEXT, -- ID del registro relacionado (producto_id, orden_id, etc)
    
    -- Contexto del evento (JSON)
    contexto TEXT NOT NULL, -- JSON con datos específicos del evento
    
    -- Priorización IA
    score_urgencia REAL DEFAULT 5.0, -- 0-10 calculado por Deepseek
    score_impacto REAL DEFAULT 5.0, -- 0-10 calculado por Deepseek
    score_final REAL GENERATED ALWAYS AS ((score_urgencia * 0.6) + (score_impacto * 0.4)) STORED,
    razon_ia TEXT, -- Explicación del scoring por IA
    
    -- Contenido enriquecido por IA
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    mensaje_enriquecido TEXT, -- Versión generada por Gemini (opcional)
    cta_texto TEXT, -- Call-to-action
    cta_url TEXT,
    
    -- Programación
    programado_para TEXT, -- Cuándo enviar (NULL = inmediato)
    expira_en TEXT, -- Fecha de expiración del evento
    
    -- Estados
    estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'enviado', 'agrupado', 'cancelado', 'expirado'
    grupo_id TEXT, -- ID del grupo si fue agrupado con otros eventos
    
    -- Usuarios destinatarios
    usuarios_destino TEXT, -- JSON array de usuario_ids
    
    -- Metadatos
    created_at TEXT DEFAULT (datetime('now')),
    procesado_at TEXT,
    enviado_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_eventos_negocio ON notificacion_eventos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON notificacion_eventos(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_estado ON notificacion_eventos(estado);
CREATE INDEX IF NOT EXISTS idx_eventos_score ON notificacion_eventos(score_final DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_programado ON notificacion_eventos(programado_para);
CREATE INDEX IF NOT EXISTS idx_eventos_grupo ON notificacion_eventos(grupo_id);

-- Tabla de logs de notificaciones enviadas (auditoría)
CREATE TABLE IF NOT EXISTS notificacion_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evento_id TEXT NOT NULL,
    usuario_id TEXT NOT NULL,
    negocio_id TEXT,
    
    -- Canal usado
    canal TEXT NOT NULL, -- 'sistema', 'telegram', 'push', 'email'
    
    -- Estado del envío
    estado TEXT NOT NULL, -- 'exito', 'fallido', 'pendiente'
    codigo_error TEXT,
    mensaje_error TEXT,
    
    -- Métricas
    tiempo_respuesta_ms INTEGER,
    intentos INTEGER DEFAULT 1,
    
    -- Metadatos Telegram
    telegram_message_id TEXT,
    telegram_chat_id TEXT,
    
    -- Timestamps
    enviado_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (evento_id) REFERENCES notificacion_eventos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_logs_evento ON notificacion_logs(evento_id);
CREATE INDEX IF NOT EXISTS idx_logs_usuario ON notificacion_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_negocio ON notificacion_logs(negocio_id);
CREATE INDEX IF NOT EXISTS idx_logs_canal ON notificacion_logs(canal);
CREATE INDEX IF NOT EXISTS idx_logs_estado ON notificacion_logs(estado);
CREATE INDEX IF NOT EXISTS idx_logs_fecha ON notificacion_logs(enviado_at);

-- Tabla de contexto para IA (caché de análisis)
CREATE TABLE IF NOT EXISTS notificacion_contexto_ia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    negocio_id TEXT NOT NULL,
    tipo_analisis TEXT NOT NULL, -- 'scoring', 'enriquecimiento', 'agrupacion'
    
    -- Input/Output
    input_hash TEXT NOT NULL UNIQUE, -- Hash del contexto de entrada
    output_data TEXT NOT NULL, -- JSON con respuesta IA
    
    -- Metadatos IA
    modelo_usado TEXT NOT NULL, -- 'deepseek-reasoner', 'gemini-2.5-flash', etc
    tokens_consumidos INTEGER,
    latencia_ms INTEGER,
    
    -- TTL
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT, -- Fecha de expiración del caché
    usado_veces INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_contexto_negocio ON notificacion_contexto_ia(negocio_id);
CREATE INDEX IF NOT EXISTS idx_contexto_hash ON notificacion_contexto_ia(input_hash);
CREATE INDEX IF NOT EXISTS idx_contexto_expira ON notificacion_contexto_ia(expires_at);

-- Vista para dashboard de notificaciones
CREATE VIEW IF NOT EXISTS v_notificaciones_dashboard AS
SELECT 
    ne.id,
    ne.negocio_id,
    ne.tipo_evento,
    ne.titulo,
    ne.mensaje,
    ne.score_final,
    ne.estado,
    ne.programado_para,
    ne.created_at,
    COUNT(DISTINCT nl.id) as total_envios,
    SUM(CASE WHEN nl.estado = 'exito' THEN 1 ELSE 0 END) as envios_exitosos,
    SUM(CASE WHEN nl.estado = 'fallido' THEN 1 ELSE 0 END) as envios_fallidos,
    AVG(nl.tiempo_respuesta_ms) as tiempo_promedio_ms
FROM notificacion_eventos ne
LEFT JOIN notificacion_logs nl ON ne.id = nl.evento_id
GROUP BY ne.id;

-- Vista de estadísticas por usuario
CREATE VIEW IF NOT EXISTS v_notificaciones_usuario_stats AS
SELECT 
    nl.usuario_id,
    nl.negocio_id,
    nl.canal,
    COUNT(*) as total_notificaciones,
    SUM(CASE WHEN nl.estado = 'exito' THEN 1 ELSE 0 END) as exitosas,
    SUM(CASE WHEN nl.estado = 'fallido' THEN 1 ELSE 0 END) as fallidas,
    AVG(nl.tiempo_respuesta_ms) as tiempo_promedio,
    DATE(nl.enviado_at) as fecha
FROM notificacion_logs nl
GROUP BY nl.usuario_id, nl.negocio_id, nl.canal, DATE(nl.enviado_at);

-- Trigger para actualizar updated_at en preferencias
CREATE TRIGGER IF NOT EXISTS trg_notif_prefs_updated
AFTER UPDATE ON usuarios_notificacion_preferencias
BEGIN
    UPDATE usuarios_notificacion_preferencias 
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

-- Trigger para limpiar logs antiguos (retención 90 días)
CREATE TRIGGER IF NOT EXISTS trg_cleanup_old_logs
AFTER INSERT ON notificacion_logs
BEGIN
    DELETE FROM notificacion_logs 
    WHERE enviado_at < datetime('now', '-90 days');
END;

-- Trigger para limpiar caché IA expirado
CREATE TRIGGER IF NOT EXISTS trg_cleanup_ia_cache
AFTER INSERT ON notificacion_contexto_ia
BEGIN
    DELETE FROM notificacion_contexto_ia 
    WHERE expires_at IS NOT NULL 
    AND expires_at < datetime('now');
END;
