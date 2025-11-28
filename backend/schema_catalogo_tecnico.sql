-- ============================================
-- ESQUEMA MEJORADO PARA CATÁLOGO TÉCNICO
-- Sistema de Repuestos Automotrices
-- Gestor Tienda Pro v2.0
-- ============================================

-- ============================================
-- TABLA: marcas_vehiculos
-- Marcas de vehículos disponibles
-- ============================================
CREATE TABLE IF NOT EXISTS marcas_vehiculos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    pais_origen TEXT,
    logo_url TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_marcas_vehiculos_nombre ON marcas_vehiculos(nombre);

-- ============================================
-- TABLA: modelos_vehiculos
-- Modelos específicos por marca
-- ============================================
CREATE TABLE IF NOT EXISTS modelos_vehiculos (
    id TEXT PRIMARY KEY,
    marca_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    tipo_vehiculo TEXT, -- Sedán, SUV, Camioneta, etc.
    anio_inicio INTEGER,
    anio_fin INTEGER,
    motor_defecto TEXT, -- Motor más común para este modelo
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (marca_id) REFERENCES marcas_vehiculos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_modelos_vehiculos_marca ON modelos_vehiculos(marca_id);
CREATE INDEX IF NOT EXISTS idx_modelos_vehiculos_nombre ON modelos_vehiculos(nombre);
CREATE INDEX IF NOT EXISTS idx_modelos_vehiculos_anio ON modelos_vehiculos(anio_inicio, anio_fin);

-- ============================================
-- TABLA: categorias_tecnicas
-- Categorías específicas para repuestos automotrices
-- ============================================
CREATE TABLE IF NOT EXISTS categorias_tecnicas (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    categoria_padre_id TEXT, -- Para crear jerarquías (Motor -> Filtros -> Filtro de Aceite)
    codigo_sistema TEXT, -- Código del sistema automotriz (01=Motor, 02=Transmisión, etc.)
    icono TEXT,
    color TEXT,
    orden_visualizacion INTEGER DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (categoria_padre_id) REFERENCES categorias_tecnicas(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_categorias_tecnicas_nombre ON categorias_tecnicas(nombre);
CREATE INDEX IF NOT EXISTS idx_categorias_tecnicas_padre ON categorias_tecnicas(categoria_padre_id);
CREATE INDEX IF NOT EXISTS idx_categorias_tecnicas_sistema ON categorias_tecnicas(codigo_sistema);

-- ============================================
-- TABLA: especificaciones_tecnicas
-- Especificaciones técnicas para repuestos
-- ============================================
CREATE TABLE IF NOT EXISTS especificaciones_tecnicas (
    id TEXT PRIMARY KEY,
    producto_id TEXT NOT NULL,
    especificacion_clave TEXT NOT NULL, -- 'viscosidad', 'medidas', 'torque', etc.
    especificacion_valor TEXT NOT NULL,
    unidad_medida TEXT, -- 'SAE', 'mm', 'Nm', etc.
    descripcion TEXT,
    
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    
    UNIQUE(producto_id, especificacion_clave)
);

CREATE INDEX IF NOT EXISTS idx_especificaciones_producto ON especificaciones_tecnicas(producto_id);
CREATE INDEX IF NOT EXISTS idx_especificaciones_clave ON especificaciones_tecnicas(especificacion_clave);

-- ============================================
-- TABLA: productos_compatibilidad
-- Compatibilidad de repuestos con vehículos específicos
-- ============================================
CREATE TABLE IF NOT EXISTS productos_compatibilidad (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id TEXT NOT NULL,
    marca_vehiculo_id TEXT,
    modelo_vehiculo_id TEXT,
    anio_inicio INTEGER,
    anio_fin INTEGER,
    motor TEXT, -- Tipo de motor específico
    transmision TEXT, -- Manual/Automática
    version TEXT, -- Versión específica del modelo
    posicion TEXT, -- Delantero/Trasero/Izquierdo/Derecho para repuestos específicos
    notas_compatibilidad TEXT,
    verificado INTEGER DEFAULT 0, -- Si la compatibilidad ha sido verificada
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (marca_vehiculo_id) REFERENCES marcas_vehiculos(id) ON DELETE CASCADE,
    FOREIGN KEY (modelo_vehiculo_id) REFERENCES modelos_vehiculos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_compatibilidad_producto ON productos_compatibilidad(producto_id);
CREATE INDEX IF NOT EXISTS idx_compatibilidad_marca ON productos_compatibilidad(marca_vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_compatibilidad_modelo ON productos_compatibilidad(modelo_vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_compatibilidad_anio ON productos_compatibilidad(anio_inicio, anio_fin);

-- ============================================
-- TABLA: numeros_parte
-- Números de parte originales y aftermarket
-- ============================================
CREATE TABLE IF NOT EXISTS numeros_parte (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id TEXT NOT NULL,
    numero_parte TEXT NOT NULL,
    tipo_parte TEXT NOT NULL, -- 'OEM', 'Aftermarket', 'Generico'
    fabricante TEXT, -- Fabricante del número de parte
    descripcion TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    
    UNIQUE(numero_parte, tipo_parte)
);

CREATE INDEX IF NOT EXISTS idx_numeros_parte_producto ON numeros_parte(producto_id);
CREATE INDEX IF NOT EXISTS idx_numeros_parte_numero ON numeros_parte(numero_parte);
CREATE INDEX IF NOT EXISTS idx_numeros_parte_tipo ON numeros_parte(tipo_parte);

-- ============================================
-- TABLA: productos_relacionados
-- Productos que se venden juntos o son complementarios
-- ============================================
CREATE TABLE IF NOT EXISTS productos_relacionados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_principal_id TEXT NOT NULL,
    producto_relacionado_id TEXT NOT NULL,
    tipo_relacion TEXT NOT NULL, -- 'complementario', 'alternativo', 'kit', 'accesorio'
    orden_recomendacion INTEGER DEFAULT 0,
    
    FOREIGN KEY (producto_principal_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_relacionado_id) REFERENCES productos(id) ON DELETE CASCADE,
    
    UNIQUE(producto_principal_id, producto_relacionado_id)
);

CREATE INDEX IF NOT EXISTS idx_productos_relacionados_principal ON productos_relacionados(producto_principal_id);
CREATE INDEX IF NOT EXISTS idx_productos_relacionados_relacionado ON productos_relacionados(producto_relacionado_id);

-- ============================================
-- TABLA: precios_historicos
-- Historial de precios para análisis de tendencias
-- ============================================
CREATE TABLE IF NOT EXISTS precios_historicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id TEXT NOT NULL,
    precio_compra REAL,
    precio_venta REAL,
    proveedor_id TEXT,
    fecha_vigencia TEXT NOT NULL,
    motivo_cambio TEXT, -- 'inflacion', 'promocion', 'incremento_proveedor'
    
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_precios_historicos_producto ON precios_historicos(producto_id);
CREATE INDEX IF NOT EXISTS idx_precios_historicos_fecha ON precios_historicos(fecha_vigencia);

-- ============================================
-- VISTA: productos_completos
-- Vista con información completa de productos
-- ============================================
CREATE VIEW IF NOT EXISTS vista_productos_completos AS
SELECT 
    p.id,
    p.codigo,
    p.nombre,
    p.descripcion,
    p.precio_compra,
    p.precio_venta,
    p.stock,
    p.stock_minimo,
    p.imagen,
    p.activo,
    c.nombre as categoria_nombre,
    ct.nombre as categoria_tecnica_nombre,
    ct.codigo_sistema,
    pr.nombre as proveedor_nombre,
    pr.telefono as proveedor_telefono,
    COUNT(DISTINCT pc.id) as vehiculos_compatibles,
    COUNT(DISTINCT np.id) as numeros_parte_total,
    GROUP_CONCAT(DISTINCT np.numero_parte) as numeros_parte_lista
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN categorias_tecnicas ct ON p.categoria_id = ct.id
LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
LEFT JOIN productos_compatibilidad pc ON p.id = pc.producto_id
LEFT JOIN numeros_parte np ON p.id = np.producto_id AND np.activo = 1
GROUP BY p.id;

-- ============================================
-- VISTA: compatibilidad_vehiculos
-- Vista de compatibilidad con información de vehículos
-- ============================================
CREATE VIEW IF NOT EXISTS vista_compatibilidad_vehiculos AS
SELECT 
    pc.*,
    p.codigo as producto_codigo,
    p.nombre as producto_nombre,
    mv.nombre as marca_nombre,
    mdv.nombre as modelo_nombre,
    mdv.tipo_vehiculo
FROM productos_compatibilidad pc
JOIN productos p ON pc.producto_id = p.id
LEFT JOIN marcas_vehiculos mv ON pc.marca_vehiculo_id = mv.id
LEFT JOIN modelos_vehiculos mdv ON pc.modelo_vehiculo_id = mdv.id
WHERE p.activo = 1;

-- Actualizar versión del esquema
PRAGMA user_version = 4;