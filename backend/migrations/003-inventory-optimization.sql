-- ============================================
-- MIGRACIÓN 003: OPTIMIZACIÓN DE INVENTARIO
-- ============================================
-- Mejora la gestión de inventario y consistencia de datos
-- Agrega historial detallado de ventas y movimientos

-- ============================================
-- TABLA: historial_ventas_productos
-- Historial detallado de todos los productos vendidos
-- ============================================
CREATE TABLE IF NOT EXISTS historial_ventas_productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    negocio_id TEXT NOT NULL,
    venta_id TEXT NOT NULL,
    producto_id TEXT,
    producto_codigo TEXT,
    producto_nombre TEXT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario REAL NOT NULL DEFAULT 0,
    precio_compra_referencia REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL DEFAULT 0,
    descuento REAL NOT NULL DEFAULT 0,
    iva REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    costo_total REAL NOT NULL DEFAULT 0,
    ganancia_bruta REAL NOT NULL DEFAULT 0,
    margen_porcentaje REAL NOT NULL DEFAULT 0,
    fecha_venta TEXT NOT NULL,
    hora_venta TEXT,
    cliente_id TEXT,
    cliente_nombre TEXT,
    vendedor TEXT,
    metodo_pago TEXT,
    estado_venta TEXT DEFAULT 'completada',
    tipo_item TEXT DEFAULT 'producto', -- producto o servicio
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
    
    CHECK (cantidad > 0),
    CHECK (precio_unitario >= 0),
    CHECK (total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_historial_ventas_producto_id ON historial_ventas_productos(producto_id);
CREATE INDEX IF NOT EXISTS idx_historial_ventas_venta_id ON historial_ventas_productos(venta_id);
CREATE INDEX IF NOT EXISTS idx_historial_ventas_fecha ON historial_ventas_productos(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_historial_ventas_cliente ON historial_ventas_productos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_historial_ventas_negocio ON historial_ventas_productos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_historial_ventas_tipo ON historial_ventas_productos(tipo_item);

-- ============================================
-- TABLA: movimientos_stock
-- Registro de todos los movimientos de inventario
-- ============================================
CREATE TABLE IF NOT EXISTS movimientos_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    negocio_id TEXT NOT NULL,
    producto_id TEXT NOT NULL,
    producto_codigo TEXT,
    producto_nombre TEXT NOT NULL,
    tipo_movimiento TEXT NOT NULL, -- entrada, salida, ajuste, devolucion
    cantidad INTEGER NOT NULL,
    stock_anterior INTEGER NOT NULL DEFAULT 0,
    stock_nuevo INTEGER NOT NULL DEFAULT 0,
    motivo TEXT, -- Venta, Compra, Ajuste manual, Devolución, etc.
    referencia_id TEXT, -- ID de la venta, compra, etc.
    referencia_numero TEXT, -- Número de factura, compra, etc.
    usuario TEXT,
    notas TEXT,
    fecha TEXT NOT NULL,
    hora TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    
    CHECK (cantidad >= 0)
);

CREATE INDEX IF NOT EXISTS idx_movimientos_stock_producto ON movimientos_stock(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_fecha ON movimientos_stock(fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_tipo ON movimientos_stock(tipo_movimiento);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_referencia ON movimientos_stock(referencia_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_negocio ON movimientos_stock(negocio_id);

-- ============================================
-- TABLA: productos_eliminados
-- Backup de productos eliminados con su stock
-- ============================================
CREATE TABLE IF NOT EXISTS productos_eliminados (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    producto_id_original TEXT NOT NULL,
    codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria_id TEXT,
    categoria_nombre TEXT,
    proveedor_id TEXT,
    proveedor_nombre TEXT,
    precio_compra REAL NOT NULL DEFAULT 0,
    precio_venta REAL NOT NULL DEFAULT 0,
    stock_al_eliminar INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 10,
    imagen TEXT,
    usuario_elimino TEXT,
    motivo_eliminacion TEXT,
    fecha_eliminacion TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_productos_eliminados_fecha ON productos_eliminados(fecha_eliminacion);
CREATE INDEX IF NOT EXISTS idx_productos_eliminados_negocio ON productos_eliminados(negocio_id);
CREATE INDEX IF NOT EXISTS idx_productos_eliminados_original ON productos_eliminados(producto_id_original);

-- ============================================
-- VISTA: vista_historial_ventas_detallado
-- Vista completa del historial de ventas con análisis financiero
-- ============================================
DROP VIEW IF EXISTS vista_historial_ventas_detallado;
CREATE VIEW vista_historial_ventas_detallado AS
SELECT
    h.id,
    h.venta_id,
    h.producto_id,
    h.producto_codigo,
    h.producto_nombre,
    h.cantidad,
    h.precio_unitario,
    h.precio_compra_referencia,
    h.subtotal,
    h.descuento,
    h.iva,
    h.total,
    h.costo_total,
    h.ganancia_bruta,
    h.margen_porcentaje,
    h.fecha_venta,
    h.hora_venta,
    h.cliente_id,
    h.cliente_nombre,
    h.vendedor,
    h.metodo_pago,
    h.estado_venta,
    h.tipo_item,
    v.numero AS venta_numero,
    v.total AS venta_total,
    p.stock AS stock_actual,
    p.stock_minimo,
    c.categoria AS cliente_categoria
FROM historial_ventas_productos h
LEFT JOIN ventas v ON h.venta_id = v.id
LEFT JOIN productos p ON h.producto_id = p.id
LEFT JOIN clientes c ON h.cliente_id = c.id
ORDER BY h.fecha_venta DESC, h.hora_venta DESC;

-- ============================================
-- VISTA: vista_productos_mas_vendidos_mejorado
-- Análisis mejorado de productos más vendidos con rentabilidad
-- ============================================
DROP VIEW IF EXISTS vista_productos_mas_vendidos_mejorado;
CREATE VIEW vista_productos_mas_vendidos_mejorado AS
SELECT
    h.producto_id,
    h.producto_codigo,
    h.producto_nombre,
    h.tipo_item,
    COUNT(DISTINCT h.venta_id) AS numero_ventas,
    SUM(h.cantidad) AS cantidad_total_vendida,
    SUM(h.total) AS ingresos_totales,
    SUM(h.costo_total) AS costo_total,
    SUM(h.ganancia_bruta) AS ganancia_total,
    AVG(h.margen_porcentaje) AS margen_promedio,
    AVG(h.precio_unitario) AS precio_promedio,
    MIN(h.fecha_venta) AS primera_venta,
    MAX(h.fecha_venta) AS ultima_venta,
    p.stock AS stock_actual,
    p.stock_minimo
FROM historial_ventas_productos h
LEFT JOIN productos p ON h.producto_id = p.id
WHERE h.estado_venta = 'completada'
GROUP BY h.producto_id, h.producto_codigo, h.producto_nombre, h.tipo_item
ORDER BY cantidad_total_vendida DESC;

-- ============================================
-- VISTA: vista_movimientos_stock_recientes
-- Movimientos de stock más recientes
-- ============================================
DROP VIEW IF EXISTS vista_movimientos_stock_recientes;
CREATE VIEW vista_movimientos_stock_recientes AS
SELECT
    m.id,
    m.producto_id,
    m.producto_codigo,
    m.producto_nombre,
    m.tipo_movimiento,
    m.cantidad,
    m.stock_anterior,
    m.stock_nuevo,
    m.motivo,
    m.referencia_numero,
    m.usuario,
    m.fecha,
    m.hora,
    p.stock AS stock_actual,
    p.nombre AS producto_nombre_actual
FROM movimientos_stock m
LEFT JOIN productos p ON m.producto_id = p.id
ORDER BY m.fecha DESC, m.hora DESC, m.id DESC
LIMIT 100;

-- ============================================
-- VISTA: vista_analisis_rentabilidad_productos
-- Análisis de rentabilidad por producto
-- ============================================
DROP VIEW IF EXISTS vista_analisis_rentabilidad_productos;
CREATE VIEW vista_analisis_rentabilidad_productos AS
SELECT
    p.id,
    p.codigo,
    p.nombre,
    p.stock,
    p.stock_minimo,
    p.precio_compra,
    p.precio_venta,
    ((p.precio_venta - p.precio_compra) / NULLIF(p.precio_compra, 0) * 100) AS margen_teorico,
    COALESCE(h.cantidad_vendida, 0) AS cantidad_vendida_total,
    COALESCE(h.ingresos_totales, 0) AS ingresos_totales,
    COALESCE(h.ganancia_real, 0) AS ganancia_real,
    COALESCE(h.margen_real, 0) AS margen_real_promedio,
    c.nombre AS categoria,
    pr.nombre AS proveedor
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
LEFT JOIN (
    SELECT
        producto_id,
        SUM(cantidad) AS cantidad_vendida,
        SUM(total) AS ingresos_totales,
        SUM(ganancia_bruta) AS ganancia_real,
        AVG(margen_porcentaje) AS margen_real
    FROM historial_ventas_productos
    WHERE estado_venta = 'completada'
    GROUP BY producto_id
) h ON p.id = h.producto_id
WHERE p.activo = 1
ORDER BY ganancia_real DESC;

-- ============================================
-- TRIGGER: registrar_venta_en_historial
-- Registra automáticamente cada detalle de venta en el historial
-- ============================================
DROP TRIGGER IF EXISTS registrar_venta_en_historial;
CREATE TRIGGER registrar_venta_en_historial
AFTER INSERT ON ventas_detalle
BEGIN
    INSERT INTO historial_ventas_productos (
        negocio_id,
        venta_id,
        producto_id,
        producto_codigo,
        producto_nombre,
        cantidad,
        precio_unitario,
        precio_compra_referencia,
        subtotal,
        descuento,
        iva,
        total,
        costo_total,
        ganancia_bruta,
        margen_porcentaje,
        fecha_venta,
        hora_venta,
        cliente_id,
        cliente_nombre,
        vendedor,
        metodo_pago,
        estado_venta,
        tipo_item
    )
    SELECT
        NEW.negocio_id,
        NEW.venta_id,
        NEW.producto_id,
        p.codigo,
        NEW.producto_nombre,
        NEW.cantidad,
        NEW.precio_unitario,
        COALESCE(p.precio_compra, 0),
        (NEW.precio_unitario * NEW.cantidad),
        0, -- descuento a nivel de item (si se implementa)
        0, -- IVA a nivel de item (calculado en la venta)
        NEW.total,
        (COALESCE(p.precio_compra, 0) * NEW.cantidad),
        (NEW.total - (COALESCE(p.precio_compra, 0) * NEW.cantidad)),
        CASE 
            WHEN COALESCE(p.precio_compra, 0) > 0 
            THEN ((NEW.precio_unitario - COALESCE(p.precio_compra, 0)) / p.precio_compra * 100)
            ELSE 0
        END,
        v.fecha,
        COALESCE(v.hora, '00:00'),
        v.cliente_id,
        v.cliente_nombre,
        COALESCE(v.vendedor, 'Sistema'),
        v.metodo_pago,
        v.estado,
        CASE 
            WHEN NEW.producto_id IS NOT NULL THEN 'producto'
            ELSE 'servicio'
        END
    FROM ventas v
    LEFT JOIN productos p ON NEW.producto_id = p.id
    WHERE v.id = NEW.venta_id;
END;

-- ============================================
-- TRIGGER: registrar_movimiento_stock_venta
-- Registra el movimiento de stock al crear un detalle de venta
-- ============================================
DROP TRIGGER IF EXISTS registrar_movimiento_stock_venta;
CREATE TRIGGER registrar_movimiento_stock_venta
AFTER INSERT ON ventas_detalle
WHEN NEW.producto_id IS NOT NULL
BEGIN
    INSERT INTO movimientos_stock (
        negocio_id,
        producto_id,
        producto_codigo,
        producto_nombre,
        tipo_movimiento,
        cantidad,
        stock_anterior,
        stock_nuevo,
        motivo,
        referencia_id,
        referencia_numero,
        usuario,
        fecha,
        hora
    )
    SELECT
        NEW.negocio_id,
        NEW.producto_id,
        p.codigo,
        p.nombre,
        'salida',
        NEW.cantidad,
        p.stock + NEW.cantidad, -- Stock antes de la venta
        p.stock, -- Stock después de la venta
        'Venta',
        NEW.venta_id,
        v.numero,
        COALESCE(v.vendedor, 'Sistema'),
        v.fecha,
        COALESCE(v.hora, '00:00')
    FROM productos p, ventas v
    WHERE p.id = NEW.producto_id AND v.id = NEW.venta_id;
END;

-- ============================================
-- TRIGGER: registrar_movimiento_stock_compra
-- Registra el movimiento de stock al crear un detalle de compra
-- ============================================
DROP TRIGGER IF EXISTS registrar_movimiento_stock_compra;
CREATE TRIGGER registrar_movimiento_stock_compra
AFTER INSERT ON compras_detalle
WHEN NEW.producto_id IS NOT NULL
BEGIN
    INSERT INTO movimientos_stock (
        negocio_id,
        producto_id,
        producto_codigo,
        producto_nombre,
        tipo_movimiento,
        cantidad,
        stock_anterior,
        stock_nuevo,
        motivo,
        referencia_id,
        referencia_numero,
        fecha,
        hora
    )
    SELECT
        NEW.negocio_id,
        NEW.producto_id,
        p.codigo,
        p.nombre,
        'entrada',
        NEW.cantidad,
        p.stock - NEW.cantidad, -- Stock antes de la compra
        p.stock, -- Stock después de la compra
        'Compra',
        NEW.compra_id,
        c.numero,
        c.fecha,
        COALESCE(SUBSTR(c.created_at, 12, 5), '00:00')
    FROM productos p, compras c
    WHERE p.id = NEW.producto_id AND c.id = NEW.compra_id;
END;

-- ============================================
-- TRIGGER: backup_producto_eliminado
-- Guarda un backup del producto antes de eliminarlo
-- ============================================
DROP TRIGGER IF EXISTS backup_producto_eliminado;
CREATE TRIGGER backup_producto_eliminado
BEFORE DELETE ON productos
BEGIN
    INSERT INTO productos_eliminados (
        id,
        negocio_id,
        producto_id_original,
        codigo,
        nombre,
        descripcion,
        categoria_id,
        categoria_nombre,
        proveedor_id,
        proveedor_nombre,
        precio_compra,
        precio_venta,
        stock_al_eliminar,
        stock_minimo,
        imagen,
        fecha_eliminacion
    )
    SELECT
        lower(hex(randomblob(16))),
        OLD.negocio_id,
        OLD.id,
        OLD.codigo,
        OLD.nombre,
        OLD.descripcion,
        OLD.categoria_id,
        c.nombre,
        OLD.proveedor_id,
        p.nombre,
        OLD.precio_compra,
        OLD.precio_venta,
        OLD.stock,
        OLD.stock_minimo,
        OLD.imagen,
        datetime('now')
    FROM (SELECT OLD.id AS id) AS producto
    LEFT JOIN categorias c ON OLD.categoria_id = c.id
    LEFT JOIN proveedores p ON OLD.proveedor_id = p.id;
    
    -- Registrar movimiento de stock si había inventario
    INSERT INTO movimientos_stock (
        negocio_id,
        producto_id,
        producto_codigo,
        producto_nombre,
        tipo_movimiento,
        cantidad,
        stock_anterior,
        stock_nuevo,
        motivo,
        fecha,
        hora
    )
    SELECT
        OLD.negocio_id,
        OLD.id,
        OLD.codigo,
        OLD.nombre,
        'ajuste',
        OLD.stock,
        OLD.stock,
        0,
        'Producto eliminado del sistema',
        date('now'),
        time('now')
    WHERE OLD.stock > 0;
END;

-- ============================================
-- Insertar configuración inicial si no existe
-- ============================================
INSERT OR IGNORE INTO configuracion (key, value, tipo, descripcion) VALUES
    ('inventario_auto_deducir', 'true', 'boolean', 'Deducir automáticamente stock al registrar venta'),
    ('inventario_permitir_negativo', 'false', 'boolean', 'Permitir stock negativo en productos'),
    ('inventario_alerta_stock_bajo', 'true', 'boolean', 'Mostrar alertas cuando el stock esté bajo'),
    ('inventario_backup_eliminaciones', 'true', 'boolean', 'Guardar backup de productos eliminados');

PRAGMA user_version = 3;
