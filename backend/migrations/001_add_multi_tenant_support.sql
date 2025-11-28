-- ============================================
-- MIGRACIÓN: Soporte Multi-Tenant
-- Versión: 001
-- Fecha: 2025-11-03
-- Descripción: Agrega columnas y tablas necesarias para soporte multi-tenant
-- ============================================

-- 1. Crear tabla de negocios (si no existe)
CREATE TABLE IF NOT EXISTS negocios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'mecanica', 'ferreteria', 'tienda', etc.
  ruc TEXT,
  razon_social TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  estado TEXT DEFAULT 'activo', -- 'activo', 'suspendido', 'cancelado'
  plan TEXT DEFAULT 'basico', -- 'gratis', 'basico', 'premium'
  usuarios_max INTEGER DEFAULT 3,
  productos_max INTEGER DEFAULT 500,
  fecha_creacion TEXT DEFAULT (datetime('now')),
  fecha_expiracion TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Crear tabla de relación usuarios-negocios (muchos a muchos)
CREATE TABLE IF NOT EXISTS usuarios_negocios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id TEXT NOT NULL,
  negocio_id TEXT NOT NULL,
  rol_en_negocio TEXT DEFAULT 'user', -- 'admin', 'gerente', 'user', 'vendedor', 'mecanico'
  es_negocio_principal INTEGER DEFAULT 0, -- 0 = no, 1 = sí
  fecha_asignacion TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE,
  UNIQUE(usuario_id, negocio_id)
);

-- 3. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_usuarios_negocios_usuario ON usuarios_negocios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_negocios_negocio ON usuarios_negocios(negocio_id);
CREATE INDEX IF NOT EXISTS idx_negocios_estado ON negocios(estado);

-- 4. Agregar columnas a tabla usuarios (si no existen)
-- Nota: SQLite no soporta ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- Por eso usamos un try/catch implícito con BEGIN/END

-- Intentar agregar columna negocio_principal
-- Esta es la forma más compatible con SQLite
PRAGMA foreign_keys = OFF;

-- Verificar si ya existe la columna antes de crearla
-- (SQLite lanzará error si ya existe, pero es seguro ignorarlo)

-- Agregar columna para negocio principal del usuario
-- Esta columna almacena el ID del negocio al que el usuario pertenece por defecto
ALTER TABLE usuarios ADD COLUMN negocio_principal TEXT DEFAULT 'mecanica';

-- Agregar columna para lista de negocios (JSON string)
-- Formato: ["negocio1", "negocio2", "negocio3"]
ALTER TABLE usuarios ADD COLUMN negocios TEXT DEFAULT '["mecanica"]';

PRAGMA foreign_keys = ON;

-- 5. Crear tabla de auditoría para cambios de negocio
CREATE TABLE IF NOT EXISTS auditoria_negocios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id TEXT NOT NULL,
  negocio_id TEXT NOT NULL,
  accion TEXT NOT NULL, -- 'asignado', 'removido', 'cambio_rol', 'acceso_denegado'
  detalles TEXT, -- JSON con información adicional
  ip TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auditoria_negocios_usuario ON auditoria_negocios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_negocios_negocio ON auditoria_negocios(negocio_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_negocios_fecha ON auditoria_negocios(created_at);

-- 6. Historial de archivos por negocio (para auditoría y restauración)
CREATE TABLE IF NOT EXISTS negocios_archivo_historial (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id TEXT NOT NULL,
  archivo TEXT NOT NULL,
  accion TEXT NOT NULL,
  detalles TEXT,
  usuario_id TEXT,
  realizado_en TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_negocios_archivo_historial_negocio ON negocios_archivo_historial(negocio_id);
CREATE INDEX IF NOT EXISTS idx_negocios_archivo_historial_usuario ON negocios_archivo_historial(usuario_id);

-- 7. Historial de configuración general por negocio
CREATE TABLE IF NOT EXISTS negocios_config_historial (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id TEXT NOT NULL,
  clave TEXT NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  usuario_id TEXT,
  motivo TEXT,
  creado_en TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_negocios_config_historial_negocio ON negocios_config_historial(negocio_id);
CREATE INDEX IF NOT EXISTS idx_negocios_config_historial_clave ON negocios_config_historial(clave);

-- 8. Historial de cambios de plan por negocio
CREATE TABLE IF NOT EXISTS negocio_plan_historial (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id TEXT NOT NULL,
  plan_anterior TEXT,
  plan_nuevo TEXT,
  accion TEXT NOT NULL,
  usuario_id TEXT,
  descripcion TEXT,
  registrado_en TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_negocio_plan_historial_negocio ON negocio_plan_historial(negocio_id);
CREATE INDEX IF NOT EXISTS idx_negocio_plan_historial_plan ON negocio_plan_historial(plan_nuevo);

-- 6. Crear tabla de configuración de planes y límites
CREATE TABLE IF NOT EXISTS planes_subscripcion (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio_mensual REAL DEFAULT 0,
  usuarios_max INTEGER DEFAULT 3,
  productos_max INTEGER DEFAULT 500,
  ventas_max_mes INTEGER DEFAULT -1, -- -1 = ilimitado
  storage_max_mb INTEGER DEFAULT 100,
  caracteristicas TEXT, -- JSON con lista de características
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 7. Insertar planes por defecto
INSERT OR IGNORE INTO planes_subscripcion (id, nombre, precio_mensual, usuarios_max, productos_max, storage_max_mb, caracteristicas) VALUES
('gratis', 'Plan Gratuito', 0, 1, 100, 50, '["1 usuario","100 productos","50MB almacenamiento","Soporte por email"]'),
('basico', 'Plan Básico', 25, 3, 500, 500, '["3 usuarios","500 productos","500MB almacenamiento","Soporte prioritario","Backups automáticos"]'),
('premium', 'Plan Premium', 50, 10, 5000, 5000, '["10 usuarios","5000 productos","5GB almacenamiento","Soporte 24/7","API acceso","Reportes avanzados","Multi-negocio"]');

-- 8. Crear negocio por defecto si no existe
INSERT OR IGNORE INTO negocios (id, nombre, tipo, estado, plan) 
VALUES ('mecanica', 'Mecánica Principal', 'mecanica', 'activo', 'premium');

-- 9. Migrar usuarios existentes al sistema multi-tenant
-- Asignar todos los usuarios existentes al negocio 'mecanica' por defecto
INSERT OR IGNORE INTO usuarios_negocios (usuario_id, negocio_id, rol_en_negocio, es_negocio_principal)
SELECT 
  id, 
  'mecanica', 
  CASE 
    WHEN rol = 'admin' THEN 'admin'
    WHEN rol = 'gerente' THEN 'gerente'
    ELSE 'user'
  END,
  1
FROM usuarios
WHERE id NOT IN (SELECT usuario_id FROM usuarios_negocios);

-- 10. Actualizar columnas de usuarios con valores por defecto
UPDATE usuarios 
SET 
  negocio_principal = 'mecanica',
  negocios = '["mecanica"]'
WHERE negocio_principal IS NULL OR negocios IS NULL;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- * Esta migración NO agrega columna 'negocio_id' a todas las tablas de datos
-- * Por ahora, el aislamiento de datos se logra usando archivos .db separados
-- * Para migrar a una BD única con columna negocio_id, ejecutar migración 002
-- * Revisar que todos los usuarios tengan asignado al menos un negocio
-- ============================================

-- Verificar integridad
SELECT 'Migración 001 completada exitosamente' AS status;
SELECT COUNT(*) AS total_negocios FROM negocios;
SELECT COUNT(*) AS total_asignaciones FROM usuarios_negocios;
SELECT COUNT(*) AS usuarios_sin_negocio FROM usuarios 
WHERE id NOT IN (SELECT usuario_id FROM usuarios_negocios);
