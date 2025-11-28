-- ============================================
-- MIGRACIÓN: Agregar campos de perfil de usuario
-- Versión: 002
-- Fecha: 2025-11-04
-- Descripción: Agrega campos telefono, direccion, ciudad y foto_perfil a la tabla usuarios
-- ============================================

-- Deshabilitar foreign keys temporalmente
PRAGMA foreign_keys = OFF;

-- Intentar agregar las columnas (SQLite ignorará si ya existen)
-- Nota: En SQLite no existe ALTER TABLE ... IF NOT EXISTS
-- Por lo que es seguro ejecutar estas sentencias incluso si las columnas existen

-- Agregar columna telefono
ALTER TABLE usuarios ADD COLUMN telefono TEXT;

-- Agregar columna direccion
ALTER TABLE usuarios ADD COLUMN direccion TEXT;

-- Agregar columna ciudad
ALTER TABLE usuarios ADD COLUMN ciudad TEXT;

-- Agregar columna foto_perfil
ALTER TABLE usuarios ADD COLUMN foto_perfil TEXT;

-- Reactivar foreign keys
PRAGMA foreign_keys = ON;

-- Verificar la estructura de la tabla
SELECT 'Migración 002 completada: Campos de perfil agregados a usuarios' AS status;
PRAGMA table_info(usuarios);

