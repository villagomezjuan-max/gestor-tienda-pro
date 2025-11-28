-- Migración: Agregar campos de seguridad a usuarios
-- Fecha: 2025-11-01
-- Descripción: Agrega campos necesarios para el nuevo sistema de autenticación seguro

-- Agregar campos de seguridad a tabla usuarios
ALTER TABLE usuarios ADD COLUMN debe_cambiar_password INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN ultimo_acceso TEXT;
ALTER TABLE usuarios ADD COLUMN intentos_fallidos INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN bloqueado_hasta TEXT;
ALTER TABLE usuarios ADD COLUMN created_at TEXT DEFAULT (datetime('now'));
ALTER TABLE usuarios ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));

-- Crear tabla de auditoría de accesos
CREATE TABLE IF NOT EXISTS auditoria_accesos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id TEXT,
  accion TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  exitoso INTEGER DEFAULT 1,
  detalles TEXT,
  timestamp TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_accesos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_timestamp ON auditoria_accesos(timestamp);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria_accesos(accion);
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);

-- Crear tabla de sesiones (opcional, para futuras mejoras)
CREATE TABLE IF NOT EXISTS sesiones (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  refresh_token_jti TEXT UNIQUE NOT NULL,
  ip TEXT,
  user_agent TEXT,
  expira_en TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_jti ON sesiones(refresh_token_jti);
CREATE INDEX IF NOT EXISTS idx_sesiones_expira ON sesiones(expira_en);
