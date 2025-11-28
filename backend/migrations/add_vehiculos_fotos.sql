-- Script para migrar base de datos existente
-- Agrega la tabla de fotos de vehículos

-- ============================================
-- TABLA: vehiculos_fotos
-- Fotos de vehículos
-- ============================================
CREATE TABLE IF NOT EXISTS vehiculos_fotos (
    id TEXT PRIMARY KEY,
    vehiculo_id TEXT NOT NULL,
    url TEXT NOT NULL,
    nombre_archivo TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_fotos_vehiculo_id ON vehiculos_fotos(vehiculo_id);

-- Mensaje de confirmación
SELECT 'Tabla vehiculos_fotos creada exitosamente' as mensaje;
