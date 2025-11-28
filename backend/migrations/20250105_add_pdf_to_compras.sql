-- Migración: Agregar soporte para almacenar PDFs de facturas en compras
-- Fecha: 2025-01-05
-- Descripción: Permite almacenar facturas digitalizadas en formato Base64

BEGIN TRANSACTION;

-- Agregar columnas para almacenamiento de PDFs
ALTER TABLE compras ADD COLUMN pdf_base64 TEXT;
ALTER TABLE compras ADD COLUMN pdf_nombre TEXT;
ALTER TABLE compras ADD COLUMN pdf_size INTEGER;

COMMIT;
