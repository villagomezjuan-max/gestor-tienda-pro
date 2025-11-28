-- ============================================
-- MIGRACIÓN: Sistema de Nóminas y Gestión de Personal
-- Versión: 1.0
-- Fecha: 2025-11-25
-- ============================================

-- ============================================
-- TABLA: empleados
-- Información completa del personal
-- ============================================
CREATE TABLE IF NOT EXISTS empleados (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    usuario_id TEXT,
    
    -- Datos personales
    cedula TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    fecha_nacimiento TEXT,
    genero TEXT, -- M, F, Otro
    estado_civil TEXT, -- soltero, casado, divorciado, viudo, union_libre
    direccion TEXT,
    telefono TEXT,
    email TEXT,
    contacto_emergencia TEXT,
    telefono_emergencia TEXT,
    foto TEXT,
    
    -- Datos laborales
    cargo TEXT NOT NULL,
    departamento TEXT, -- taller, ventas, administracion, bodega
    tipo_contrato TEXT NOT NULL DEFAULT 'indefinido', -- indefinido, temporal, prueba, por_obra
    fecha_ingreso TEXT NOT NULL,
    fecha_salida TEXT,
    
    -- Datos salariales
    tipo_salario TEXT NOT NULL DEFAULT 'mensual', -- mensual, quincenal, semanal, por_hora
    salario_base REAL NOT NULL DEFAULT 0,
    tiene_comision INTEGER DEFAULT 0,
    porcentaje_comision REAL DEFAULT 0,
    cuenta_bancaria TEXT,
    banco TEXT,
    tipo_cuenta TEXT, -- ahorros, corriente
    
    -- Seguridad social Ecuador
    afiliado_iess INTEGER DEFAULT 1,
    codigo_sectorial_iess TEXT,
    
    -- Especialidades (para técnicos)
    especialidades TEXT, -- JSON: ["motor", "frenos", "electricidad"]
    
    -- Estado
    estado TEXT NOT NULL DEFAULT 'activo', -- activo, inactivo, vacaciones, licencia, despedido
    motivo_baja TEXT,
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_empleados_cedula ON empleados(cedula);
CREATE INDEX IF NOT EXISTS idx_empleados_nombre ON empleados(nombre);
CREATE INDEX IF NOT EXISTS idx_empleados_estado ON empleados(estado);
CREATE INDEX IF NOT EXISTS idx_empleados_departamento ON empleados(departamento);
CREATE INDEX IF NOT EXISTS idx_empleados_negocio ON empleados(negocio_id);

-- ============================================
-- TABLA: empleados_horarios
-- Horarios de trabajo definidos
-- ============================================
CREATE TABLE IF NOT EXISTS empleados_horarios (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    empleado_id TEXT NOT NULL,
    dia_semana INTEGER NOT NULL, -- 0=domingo, 1=lunes, ..., 6=sabado
    hora_entrada TEXT NOT NULL, -- HH:MM
    hora_salida TEXT NOT NULL, -- HH:MM
    hora_almuerzo_inicio TEXT,
    hora_almuerzo_fin TEXT,
    es_dia_libre INTEGER DEFAULT 0,
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_empleados_horarios_empleado ON empleados_horarios(empleado_id);
CREATE INDEX IF NOT EXISTS idx_empleados_horarios_negocio ON empleados_horarios(negocio_id);

-- ============================================
-- TABLA: asistencia
-- Control de asistencia diaria
-- ============================================
CREATE TABLE IF NOT EXISTS asistencia (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    empleado_id TEXT NOT NULL,
    fecha TEXT NOT NULL,
    
    -- Marcajes
    hora_entrada TEXT,
    hora_salida TEXT,
    hora_almuerzo_salida TEXT,
    hora_almuerzo_regreso TEXT,
    
    -- Cálculos
    horas_trabajadas REAL DEFAULT 0,
    horas_extra REAL DEFAULT 0,
    horas_nocturnas REAL DEFAULT 0,
    minutos_tardanza INTEGER DEFAULT 0,
    
    -- Estado
    estado TEXT DEFAULT 'presente', -- presente, ausente, tardanza, permiso, vacaciones, feriado
    justificacion TEXT,
    aprobado INTEGER DEFAULT 0,
    aprobado_por TEXT,
    
    -- Ubicación (opcional)
    latitud_entrada REAL,
    longitud_entrada REAL,
    latitud_salida REAL,
    longitud_salida REAL,
    
    notas TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    FOREIGN KEY (aprobado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE(empleado_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_asistencia_empleado ON asistencia(empleado_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_fecha ON asistencia(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencia_estado ON asistencia(estado);
CREATE INDEX IF NOT EXISTS idx_asistencia_negocio ON asistencia(negocio_id);

-- ============================================
-- TABLA: permisos_solicitudes
-- Solicitudes de permisos, vacaciones, licencias
-- ============================================
CREATE TABLE IF NOT EXISTS permisos_solicitudes (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    empleado_id TEXT NOT NULL,
    
    tipo TEXT NOT NULL, -- vacaciones, enfermedad, personal, maternidad, paternidad, calamidad, sin_goce
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT NOT NULL,
    dias_solicitados REAL NOT NULL,
    
    motivo TEXT,
    documento_adjunto TEXT, -- ruta al archivo
    
    estado TEXT DEFAULT 'pendiente', -- pendiente, aprobado, rechazado, cancelado
    aprobado_por TEXT,
    fecha_respuesta TEXT,
    comentario_respuesta TEXT,
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    FOREIGN KEY (aprobado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_permisos_empleado ON permisos_solicitudes(empleado_id);
CREATE INDEX IF NOT EXISTS idx_permisos_estado ON permisos_solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_permisos_fecha ON permisos_solicitudes(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_permisos_negocio ON permisos_solicitudes(negocio_id);

-- ============================================
-- TABLA: vacaciones_saldo
-- Saldo de vacaciones por empleado
-- ============================================
CREATE TABLE IF NOT EXISTS vacaciones_saldo (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    empleado_id TEXT NOT NULL UNIQUE,
    anio INTEGER NOT NULL,
    dias_correspondientes REAL DEFAULT 15, -- Por ley Ecuador
    dias_usados REAL DEFAULT 0,
    dias_pendientes REAL DEFAULT 15,
    dias_acumulados REAL DEFAULT 0, -- De años anteriores
    
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vacaciones_empleado ON vacaciones_saldo(empleado_id);
CREATE INDEX IF NOT EXISTS idx_vacaciones_negocio ON vacaciones_saldo(negocio_id);

-- ============================================
-- TABLA: nominas
-- Cabecera de nóminas procesadas
-- ============================================
CREATE TABLE IF NOT EXISTS nominas (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    
    periodo_inicio TEXT NOT NULL,
    periodo_fin TEXT NOT NULL,
    tipo_periodo TEXT NOT NULL, -- mensual, quincenal, semanal
    fecha_pago TEXT NOT NULL,
    
    total_ingresos REAL NOT NULL DEFAULT 0,
    total_deducciones REAL NOT NULL DEFAULT 0,
    total_neto REAL NOT NULL DEFAULT 0,
    total_empleados INTEGER DEFAULT 0,
    
    estado TEXT DEFAULT 'borrador', -- borrador, procesada, pagada, anulada
    procesado_por TEXT,
    fecha_procesamiento TEXT,
    
    notas TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (procesado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_nominas_periodo ON nominas(periodo_inicio, periodo_fin);
CREATE INDEX IF NOT EXISTS idx_nominas_estado ON nominas(estado);
CREATE INDEX IF NOT EXISTS idx_nominas_negocio ON nominas(negocio_id);

-- ============================================
-- TABLA: nominas_detalle
-- Detalle de nómina por empleado
-- ============================================
CREATE TABLE IF NOT EXISTS nominas_detalle (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    nomina_id TEXT NOT NULL,
    empleado_id TEXT NOT NULL,
    
    -- Días trabajados
    dias_trabajados REAL DEFAULT 0,
    horas_normales REAL DEFAULT 0,
    horas_extra_50 REAL DEFAULT 0, -- Recargo 50%
    horas_extra_100 REAL DEFAULT 0, -- Recargo 100%
    horas_nocturnas REAL DEFAULT 0,
    
    -- Ingresos
    salario_base REAL DEFAULT 0,
    valor_hora_extra_50 REAL DEFAULT 0,
    valor_hora_extra_100 REAL DEFAULT 0,
    valor_horas_nocturnas REAL DEFAULT 0,
    comisiones REAL DEFAULT 0,
    bonificaciones REAL DEFAULT 0,
    otros_ingresos REAL DEFAULT 0,
    total_ingresos REAL DEFAULT 0,
    
    -- Deducciones
    aporte_iess_personal REAL DEFAULT 0, -- 9.45%
    prestamos_iess REAL DEFAULT 0,
    impuesto_renta REAL DEFAULT 0,
    anticipos REAL DEFAULT 0,
    multas REAL DEFAULT 0,
    pensiones_alimenticias REAL DEFAULT 0,
    otras_deducciones REAL DEFAULT 0,
    total_deducciones REAL DEFAULT 0,
    
    -- Provisiones patronales (informativo)
    aporte_iess_patronal REAL DEFAULT 0, -- 11.15%
    decimo_tercero REAL DEFAULT 0,
    decimo_cuarto REAL DEFAULT 0,
    fondos_reserva REAL DEFAULT 0,
    vacaciones REAL DEFAULT 0,
    
    -- Totales
    neto_pagar REAL DEFAULT 0,
    
    -- Pagado
    fecha_pago TEXT,
    metodo_pago TEXT, -- transferencia, efectivo, cheque
    referencia_pago TEXT,
    
    notas TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (nomina_id) REFERENCES nominas(id) ON DELETE CASCADE,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_nominas_detalle_nomina ON nominas_detalle(nomina_id);
CREATE INDEX IF NOT EXISTS idx_nominas_detalle_empleado ON nominas_detalle(empleado_id);
CREATE INDEX IF NOT EXISTS idx_nominas_detalle_negocio ON nominas_detalle(negocio_id);

-- ============================================
-- TABLA: anticipos
-- Anticipos de sueldo
-- ============================================
CREATE TABLE IF NOT EXISTS anticipos (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    empleado_id TEXT NOT NULL,
    
    monto REAL NOT NULL,
    fecha_solicitud TEXT NOT NULL,
    fecha_descuento TEXT, -- En qué nómina se descontará
    
    motivo TEXT,
    estado TEXT DEFAULT 'pendiente', -- pendiente, aprobado, rechazado, descontado
    aprobado_por TEXT,
    
    nomina_detalle_id TEXT, -- Referencia cuando ya se descontó
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    FOREIGN KEY (aprobado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (nomina_detalle_id) REFERENCES nominas_detalle(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_anticipos_empleado ON anticipos(empleado_id);
CREATE INDEX IF NOT EXISTS idx_anticipos_estado ON anticipos(estado);
CREATE INDEX IF NOT EXISTS idx_anticipos_negocio ON anticipos(negocio_id);

-- ============================================
-- TABLA: prestamos_empleados
-- Préstamos a empleados
-- ============================================
CREATE TABLE IF NOT EXISTS prestamos_empleados (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    empleado_id TEXT NOT NULL,
    
    monto_total REAL NOT NULL,
    cuotas INTEGER NOT NULL,
    monto_cuota REAL NOT NULL,
    cuotas_pagadas INTEGER DEFAULT 0,
    saldo_pendiente REAL NOT NULL,
    
    fecha_prestamo TEXT NOT NULL,
    fecha_inicio_descuento TEXT NOT NULL,
    tasa_interes REAL DEFAULT 0,
    
    motivo TEXT,
    estado TEXT DEFAULT 'activo', -- activo, pagado, cancelado
    aprobado_por TEXT,
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    FOREIGN KEY (aprobado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_prestamos_empleado ON prestamos_empleados(empleado_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON prestamos_empleados(estado);
CREATE INDEX IF NOT EXISTS idx_prestamos_negocio ON prestamos_empleados(negocio_id);

-- ============================================
-- TABLA: trabajos_empleado
-- Relación de trabajos realizados por cada empleado
-- (Para cálculo de comisiones)
-- ============================================
CREATE TABLE IF NOT EXISTS trabajos_empleado (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    empleado_id TEXT NOT NULL,
    orden_trabajo_id TEXT NOT NULL,
    
    descripcion TEXT,
    horas_trabajadas REAL DEFAULT 0,
    valor_mano_obra REAL DEFAULT 0,
    comision_generada REAL DEFAULT 0,
    
    fecha TEXT NOT NULL,
    estado TEXT DEFAULT 'completado', -- asignado, en_proceso, completado
    
    nomina_detalle_id TEXT, -- Referencia cuando ya se pagó
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    FOREIGN KEY (orden_trabajo_id) REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
    FOREIGN KEY (nomina_detalle_id) REFERENCES nominas_detalle(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_trabajos_empleado_empleado ON trabajos_empleado(empleado_id);
CREATE INDEX IF NOT EXISTS idx_trabajos_empleado_orden ON trabajos_empleado(orden_trabajo_id);
CREATE INDEX IF NOT EXISTS idx_trabajos_empleado_fecha ON trabajos_empleado(fecha);
CREATE INDEX IF NOT EXISTS idx_trabajos_empleado_negocio ON trabajos_empleado(negocio_id);

-- ============================================
-- TABLA: config_nomina
-- Configuración del sistema de nóminas
-- ============================================
CREATE TABLE IF NOT EXISTS config_nomina (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    negocio_id TEXT,
    
    -- Tarifas IESS Ecuador 2025
    aporte_personal_iess REAL DEFAULT 9.45,
    aporte_patronal_iess REAL DEFAULT 11.15,
    
    -- Salario básico unificado
    salario_basico REAL DEFAULT 460.00, -- 2025 Ecuador
    
    -- Horas extra
    recargo_hora_extra_50 REAL DEFAULT 50, -- %
    recargo_hora_extra_100 REAL DEFAULT 100, -- %
    recargo_hora_nocturna REAL DEFAULT 25, -- %
    
    -- Jornada laboral
    horas_jornada_diaria REAL DEFAULT 8,
    horas_jornada_semanal REAL DEFAULT 40,
    hora_inicio_nocturna TEXT DEFAULT '19:00',
    hora_fin_nocturna TEXT DEFAULT '06:00',
    
    -- Décimos
    decimo_tercero_mensualizado INTEGER DEFAULT 0, -- 0=acumulado, 1=mensualizado
    decimo_cuarto_mensualizado INTEGER DEFAULT 0,
    
    -- Fondos de reserva
    fondos_reserva_porcentaje REAL DEFAULT 8.33,
    fondos_reserva_desde_meses INTEGER DEFAULT 13, -- A partir del mes 13
    
    -- Vacaciones
    dias_vacaciones_anuales REAL DEFAULT 15,
    
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Insertar configuración por defecto
INSERT OR IGNORE INTO config_nomina (id) VALUES (1);

-- ============================================
-- TABLA: feriados
-- Calendario de feriados
-- ============================================
CREATE TABLE IF NOT EXISTS feriados (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    fecha TEXT NOT NULL,
    nombre TEXT NOT NULL,
    tipo TEXT DEFAULT 'nacional', -- nacional, local, puente
    recuperable INTEGER DEFAULT 0,
    anio INTEGER NOT NULL,
    
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feriados_fecha ON feriados(fecha);
CREATE INDEX IF NOT EXISTS idx_feriados_anio ON feriados(anio);
CREATE INDEX IF NOT EXISTS idx_feriados_negocio ON feriados(negocio_id);

-- Insertar feriados Ecuador 2025
INSERT OR IGNORE INTO feriados (id, fecha, nombre, tipo, anio) VALUES
('fer-2025-01', '2025-01-01', 'Año Nuevo', 'nacional', 2025),
('fer-2025-02', '2025-02-28', 'Carnaval', 'nacional', 2025),
('fer-2025-03', '2025-03-01', 'Carnaval', 'nacional', 2025),
('fer-2025-04', '2025-04-18', 'Viernes Santo', 'nacional', 2025),
('fer-2025-05', '2025-05-01', 'Día del Trabajo', 'nacional', 2025),
('fer-2025-06', '2025-05-24', 'Batalla de Pichincha', 'nacional', 2025),
('fer-2025-07', '2025-08-10', 'Primer Grito de Independencia', 'nacional', 2025),
('fer-2025-08', '2025-10-09', 'Independencia de Guayaquil', 'nacional', 2025),
('fer-2025-09', '2025-11-02', 'Día de los Difuntos', 'nacional', 2025),
('fer-2025-10', '2025-11-03', 'Independencia de Cuenca', 'nacional', 2025),
('fer-2025-11', '2025-12-25', 'Navidad', 'nacional', 2025);

-- ============================================
-- VISTA: vista_empleados_activos
-- ============================================
CREATE VIEW IF NOT EXISTS vista_empleados_activos AS
SELECT 
    e.*,
    u.username,
    (SELECT COUNT(*) FROM trabajos_empleado te WHERE te.empleado_id = e.id AND strftime('%Y-%m', te.fecha) = strftime('%Y-%m', 'now')) as trabajos_mes,
    (SELECT SUM(te.comision_generada) FROM trabajos_empleado te WHERE te.empleado_id = e.id AND strftime('%Y-%m', te.fecha) = strftime('%Y-%m', 'now')) as comisiones_mes
FROM empleados e
LEFT JOIN usuarios u ON e.usuario_id = u.id
WHERE e.estado = 'activo';

-- ============================================
-- VISTA: vista_asistencia_hoy
-- ============================================
CREATE VIEW IF NOT EXISTS vista_asistencia_hoy AS
SELECT 
    e.id as empleado_id,
    e.nombre || ' ' || e.apellido as nombre_completo,
    e.cargo,
    e.departamento,
    a.hora_entrada,
    a.hora_salida,
    a.horas_trabajadas,
    a.horas_extra,
    a.estado as estado_asistencia,
    CASE 
        WHEN a.id IS NULL THEN 'sin_marcar'
        WHEN a.hora_entrada IS NOT NULL AND a.hora_salida IS NULL THEN 'trabajando'
        WHEN a.hora_salida IS NOT NULL THEN 'jornada_completa'
        ELSE 'desconocido'
    END as estado_actual
FROM empleados e
LEFT JOIN asistencia a ON e.id = a.empleado_id AND a.fecha = date('now')
WHERE e.estado = 'activo';

-- ============================================
-- VISTA: vista_permisos_pendientes
-- ============================================
CREATE VIEW IF NOT EXISTS vista_permisos_pendientes AS
SELECT 
    ps.*,
    e.nombre || ' ' || e.apellido as nombre_empleado,
    e.cargo,
    e.departamento
FROM permisos_solicitudes ps
JOIN empleados e ON ps.empleado_id = e.id
WHERE ps.estado = 'pendiente'
ORDER BY ps.created_at DESC;
