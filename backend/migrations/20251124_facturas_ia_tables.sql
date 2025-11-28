BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS ia_facturas_extracciones (
    id TEXT PRIMARY KEY,
    negocio_id TEXT NOT NULL,
    usuario_id TEXT,
    usuario_email TEXT,
    proveedor_nombre TEXT,
    proveedor_identificacion TEXT,
    comprador_nombre TEXT,
    numero_factura TEXT,
    fecha_emision TEXT,
    moneda TEXT DEFAULT 'USD',
    subtotal REAL DEFAULT 0,
    iva REAL DEFAULT 0,
    descuento REAL DEFAULT 0,
    otros_impuestos REAL DEFAULT 0,
    total REAL DEFAULT 0,
    modelo TEXT,
    estado TEXT DEFAULT 'completado',
    validacion_confianza TEXT,
    validacion_puntaje INTEGER DEFAULT 0,
    detalles_validacion TEXT,
    datos_json TEXT NOT NULL,
    pdf_nombre TEXT,
    pdf_size INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ia_facturas_productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extraccion_id TEXT NOT NULL,
    nombre TEXT,
    descripcion TEXT,
    unidad TEXT,
    cantidad REAL DEFAULT 0,
    precio_unitario REAL DEFAULT 0,
    subtotal REAL DEFAULT 0,
    impuestos REAL DEFAULT 0,
    total REAL DEFAULT 0,
    categoria TEXT,
    metadata TEXT,
    FOREIGN KEY (extraccion_id) REFERENCES ia_facturas_extracciones(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ia_facturas_negocio ON ia_facturas_extracciones(negocio_id);
CREATE INDEX IF NOT EXISTS idx_ia_facturas_fecha ON ia_facturas_extracciones(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_ia_facturas_numero ON ia_facturas_extracciones(numero_factura);
CREATE INDEX IF NOT EXISTS idx_ia_facturas_proveedor ON ia_facturas_extracciones(proveedor_identificacion);
CREATE INDEX IF NOT EXISTS idx_ia_facturas_productos_extraccion ON ia_facturas_productos(extraccion_id);

COMMIT;
