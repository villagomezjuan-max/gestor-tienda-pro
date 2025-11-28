BEGIN TRANSACTION;

-- Agregar nuevas columnas a la tabla compras para almacenar desglose impositivo.
ALTER TABLE compras ADD COLUMN moneda TEXT DEFAULT 'USD';
ALTER TABLE compras ADD COLUMN subtotal REAL NOT NULL DEFAULT 0;
ALTER TABLE compras ADD COLUMN iva REAL NOT NULL DEFAULT 0;
ALTER TABLE compras ADD COLUMN otros_impuestos REAL NOT NULL DEFAULT 0;

-- Reconstruir compras_detalle para permitir producto_id NULL y añadir campos descriptivos.
CREATE TABLE IF NOT EXISTS compras_detalle__new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    compra_id TEXT NOT NULL,
    producto_id TEXT,
    producto_nombre TEXT,
    descripcion TEXT,
    unidad TEXT,
    cantidad REAL NOT NULL DEFAULT 1,
    precio_unitario REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL,
    CHECK (cantidad > 0),
    CHECK (precio_unitario >= 0),
    CHECK (total >= 0)
);

INSERT INTO compras_detalle__new (id, compra_id, producto_id, producto_nombre, descripcion, unidad, cantidad, precio_unitario, total)
SELECT id, compra_id, producto_id, producto_nombre, NULL AS descripcion, NULL AS unidad, cantidad, precio_unitario, total
FROM compras_detalle;

DROP TABLE compras_detalle;
ALTER TABLE compras_detalle__new RENAME TO compras_detalle;

CREATE INDEX IF NOT EXISTS idx_compras_detalle_compra ON compras_detalle(compra_id);
CREATE INDEX IF NOT EXISTS idx_compras_detalle_producto ON compras_detalle(producto_id);

COMMIT;
