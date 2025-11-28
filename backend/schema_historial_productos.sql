-- ============================================
-- SISTEMA DE HISTORIAL DE PRODUCTOS
-- ============================================
-- Esquema para tracking de movimientos de inventario y análisis

-- Tabla: historial_productos
-- Registra todos los movimientos de stock de cada producto
CREATE TABLE IF NOT EXISTS historial_productos (
    id TEXT PRIMARY KEY,
    negocio_id TEXT NOT NULL,
    producto_id TEXT NOT NULL,
    producto_nombre TEXT NOT NULL,
    tipo_movimiento TEXT NOT NULL, -- 'venta', 'compra', 'ajuste_entrada', 'ajuste_salida', 'devolucion'
    cantidad INTEGER NOT NULL,
    stock_anterior INTEGER NOT NULL,
    stock_nuevo INTEGER NOT NULL,
    precio REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    referencia_id TEXT, -- ID de la venta, compra o ajuste relacionado
    usuario_id TEXT,
    notas TEXT,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (negocio_id) REFERENCES negocios(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_historial_negocio ON historial_productos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_historial_producto ON historial_productos(producto_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_productos(fecha);
CREATE INDEX IF NOT EXISTS idx_historial_tipo ON historial_productos(tipo_movimiento);

-- Tabla: productos_mas_vendidos
-- Vista materializada de los productos más vendidos (para consultas rápidas)
CREATE TABLE IF NOT EXISTS productos_mas_vendidos (
    id TEXT PRIMARY KEY,
    negocio_id TEXT NOT NULL,
    producto_id TEXT NOT NULL,
    producto_nombre TEXT NOT NULL,
    producto_codigo TEXT,
    total_vendido INTEGER NOT NULL DEFAULT 0,
    total_ingresos REAL NOT NULL DEFAULT 0,
    ultima_venta DATE,
    frecuencia_dias REAL, -- Días promedio entre ventas
    stock_actual INTEGER NOT NULL DEFAULT 0,
    proveedor_id TEXT,
    proveedor_nombre TEXT,
    updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (negocio_id) REFERENCES negocios(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mas_vendidos_negocio ON productos_mas_vendidos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_mas_vendidos_total ON productos_mas_vendidos(total_vendido DESC);

-- Tabla: pedidos_rapidos
-- Plantillas de pedidos basadas en historial
CREATE TABLE IF NOT EXISTS pedidos_rapidos (
    id TEXT PRIMARY KEY,
    negocio_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'automatico', 'sugerido'
    productos TEXT NOT NULL, -- JSON: [{producto_id, cantidad, precio}]
    total_estimado REAL NOT NULL DEFAULT 0,
    frecuencia_dias INTEGER, -- Cada cuántos días se debe hacer este pedido
    ultimo_pedido DATE,
    proximo_pedido DATE,
    activo INTEGER NOT NULL DEFAULT 1,
    created_by TEXT,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME,
    
    FOREIGN KEY (negocio_id) REFERENCES negocios(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pedidos_rapidos_negocio ON pedidos_rapidos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_rapidos_proximo ON pedidos_rapidos(proximo_pedido);

-- Vista: resumen_productos
-- Resumen completo del rendimiento de cada producto
CREATE VIEW IF NOT EXISTS v_resumen_productos AS
SELECT 
    p.id,
    p.negocio_id,
    p.codigo,
    p.nombre,
    p.stock,
    p.stock_minimo,
    p.precio_compra,
    p.precio_venta,
    p.categoria_id,
    c.nombre as categoria_nombre,
    p.proveedor_id,
    pr.nombre as proveedor_nombre,
    
    -- Estadísticas de ventas
    COALESCE(
        (SELECT SUM(cantidad) 
         FROM historial_productos 
         WHERE producto_id = p.id AND tipo_movimiento = 'venta'),
        0
    ) as total_vendido,
    
    COALESCE(
        (SELECT SUM(total) 
         FROM historial_productos 
         WHERE producto_id = p.id AND tipo_movimiento = 'venta'),
        0
    ) as ingresos_totales,
    
    (SELECT MAX(fecha) 
     FROM historial_productos 
     WHERE producto_id = p.id AND tipo_movimiento = 'venta'
    ) as ultima_venta,
    
    -- Estadísticas de compras
    COALESCE(
        (SELECT SUM(cantidad) 
         FROM historial_productos 
         WHERE producto_id = p.id AND tipo_movimiento = 'compra'),
        0
    ) as total_comprado,
    
    (SELECT MAX(fecha) 
     FROM historial_productos 
     WHERE producto_id = p.id AND tipo_movimiento = 'compra'
    ) as ultima_compra,
    
    -- Rotación (últimos 30 días)
    COALESCE(
        (SELECT SUM(cantidad) 
         FROM historial_productos 
         WHERE producto_id = p.id 
         AND tipo_movimiento = 'venta'
         AND fecha >= date('now', '-30 days')),
        0
    ) as ventas_30_dias,
    
    -- Días de stock restante (estimado)
    CASE 
        WHEN COALESCE(
            (SELECT SUM(cantidad) 
             FROM historial_productos 
             WHERE producto_id = p.id 
             AND tipo_movimiento = 'venta'
             AND fecha >= date('now', '-30 days')),
            0
        ) > 0
        THEN CAST(p.stock * 30.0 / COALESCE(
            (SELECT SUM(cantidad) 
             FROM historial_productos 
             WHERE producto_id = p.id 
             AND tipo_movimiento = 'venta'
             AND fecha >= date('now', '-30 days')),
            1
        ) AS INTEGER)
        ELSE 999
    END as dias_stock_restante,
    
    p.activo,
    p.created_at,
    p.updated_at
    
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN proveedores pr ON p.proveedor_id = pr.id;

-- Vista: productos_bajo_rotacion
-- Productos que no se han vendido recientemente
CREATE VIEW IF NOT EXISTS v_productos_bajo_rotacion AS
SELECT 
    p.id,
    p.negocio_id,
    p.codigo,
    p.nombre,
    p.stock,
    p.stock * p.precio_compra as valor_inventario,
    COALESCE(
        julianday('now') - julianday(
            (SELECT MAX(fecha) 
             FROM historial_productos 
             WHERE producto_id = p.id AND tipo_movimiento = 'venta')
        ),
        999
    ) as dias_sin_venta
FROM productos p
WHERE p.activo = 1
  AND COALESCE(
        julianday('now') - julianday(
            (SELECT MAX(fecha) 
             FROM historial_productos 
             WHERE producto_id = p.id AND tipo_movimiento = 'venta')
        ),
        999
    ) > 30
ORDER BY dias_sin_venta DESC;

-- Vista: productos_alta_rotacion
-- Productos más vendidos en los últimos 30 días
CREATE VIEW IF NOT EXISTS v_productos_alta_rotacion AS
SELECT 
    p.id,
    p.negocio_id,
    p.codigo,
    p.nombre,
    p.stock,
    p.stock_minimo,
    COALESCE(
        (SELECT SUM(cantidad) 
         FROM historial_productos 
         WHERE producto_id = p.id 
         AND tipo_movimiento = 'venta'
         AND fecha >= date('now', '-30 days')),
        0
    ) as ventas_30_dias,
    COALESCE(
        (SELECT SUM(total) 
         FROM historial_productos 
         WHERE producto_id = p.id 
         AND tipo_movimiento = 'venta'
         AND fecha >= date('now', '-30 days')),
        0
    ) as ingresos_30_dias
FROM productos p
WHERE p.activo = 1
AND (
    SELECT COUNT(*) 
    FROM historial_productos 
    WHERE producto_id = p.id 
    AND tipo_movimiento = 'venta'
    AND fecha >= date('now', '-30 days')
) > 0
ORDER BY ventas_30_dias DESC;
