-- ============================================
-- Migración: Configuración global de IA
-- Centraliza credenciales y permisos por tienda
-- ============================================

CREATE TABLE IF NOT EXISTS ia_global_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    provider TEXT NOT NULL DEFAULT 'gemini',
    api_key TEXT,
    model TEXT,
    base_url TEXT,
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2000,
    updated_by TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (updated_by) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS ia_feature_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    negocio_id TEXT NOT NULL,
    feature TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    updated_by TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE (negocio_id, feature),
    FOREIGN KEY (updated_by) REFERENCES usuarios(id)
);

-- Garantizar fila única para configuración global
INSERT INTO ia_global_config (id, provider)
SELECT 1, 'gemini'
WHERE NOT EXISTS (SELECT 1 FROM ia_global_config WHERE id = 1);
