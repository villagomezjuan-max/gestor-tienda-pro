-- ============================================
-- MIGRACIÓN: Agregar soporte de permisos de módulos por usuario
-- Fecha: 2025
-- ============================================

-- ============================================
-- TABLA: usuario_modulos_permitidos
-- Relación de qué módulos tiene habilitados cada usuario en cada negocio
-- ============================================
CREATE TABLE IF NOT EXISTS usuario_modulos_permitidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id TEXT NOT NULL,
    negocio_id TEXT NOT NULL,
    modulo_id TEXT NOT NULL,
    habilitado INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    -- Una entrada por usuario, negocio y módulo
    UNIQUE(usuario_id, negocio_id, modulo_id),
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_usuario_modulos_usuario ON usuario_modulos_permitidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_modulos_negocio ON usuario_modulos_permitidos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_usuario_modulos_habilitado ON usuario_modulos_permitidos(habilitado);

-- ============================================
-- TABLA: negocio_modulos_default
-- Módulos por defecto para cada tipo de negocio
-- ============================================
CREATE TABLE IF NOT EXISTS negocio_modulos_default (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    negocio_tipo TEXT NOT NULL UNIQUE,
    modulos_json TEXT NOT NULL, -- JSON array de módulos recomendados
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_negocio_modulos_tipo ON negocio_modulos_default(negocio_tipo);

-- Insertar configuración por defecto de módulos por tipo
INSERT OR IGNORE INTO negocio_modulos_default (negocio_tipo, modulos_json) VALUES
('mecanica', '["ventas","productos","clientes","inventario","ordenes_trabajo","vehiculos","agenda","catalogo","mis_tareas","recordatorios","finanzas","documentos","historial_ventas","estadisticas","analisis_financiero"]'),
('tiendas', '["ventas","productos","clientes","inventario","compras","proveedores","finanzas","documentos","historial_ventas","estadisticas","marketing","recordatorios","publicidad","contactos"]'),
('ferreteria', '["ventas","productos","clientes","inventario","compras","proveedores","catalogo","finanzas","documentos","historial_ventas","contactos","importador","analisis_financiero","estadisticas"]'),
('restaurante', '["ventas","productos","clientes","inventario","agenda","contactos","recordatorios","marketing","finanzas","documentos","historial_ventas","estadisticas","analisis_financiero","notificaciones"]'),
('farmacia', '["ventas","productos","clientes","inventario","recordatorios","contabilidad","cuentas_por_cobrar_pagar","finanzas","documentos","historial_ventas","contactos","importador","estadisticas","analisis_financiero","notificaciones"]'),
('general', '["ventas","productos","clientes","inventario","finanzas","documentos","historial_ventas","estadisticas"]');

-- ============================================
-- VISTA ÚTIL: Módulos habilitados por usuario
-- ============================================
DROP VIEW IF EXISTS vista_usuario_modulos;
CREATE VIEW IF NOT EXISTS vista_usuario_modulos AS
SELECT
    ump.usuario_id,
    ump.negocio_id,
    ump.modulo_id,
    ump.habilitado,
    u.username,
    u.rol,
    u.activo
FROM usuario_modulos_permitidos ump
LEFT JOIN usuarios u ON ump.usuario_id = u.id
WHERE ump.habilitado = 1;

-- ============================================
-- Versión de esquema actualizada
-- ============================================
PRAGMA user_version = 4;
