-- ============================================
-- ESQUEMA DE BASE DE DATOS SQL
-- Gestor Tienda Pro v1.0
-- ============================================
-- Este archivo contiene el esquema completo de la base de datos
-- Incluye: Tablas, Índices, Vistas y Triggers

-- ============================================
-- TABLA: usuarios
-- Usuarios del sistema con autenticación
-- ============================================
CREATE TABLE IF NOT EXISTS config_tienda (
    id INTEGER PRIMARY KEY,
    nombre TEXT,
    razon_social TEXT,
    ruc TEXT,
    direccion TEXT,
    telefono TEXT,
    email TEXT,
    establecimiento TEXT,
    punto_emision TEXT,
    obligado_contabilidad INTEGER DEFAULT 0 -- 0 for false, 1 for true
);

-- ============================================
-- TABLAS: Configuración Global de IA
-- Centraliza credenciales y permisos por negocio
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

INSERT INTO ia_global_config (id, provider)
SELECT 1, 'gemini'
WHERE NOT EXISTS (SELECT 1 FROM ia_global_config WHERE id = 1);

CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    nombre TEXT,
    email TEXT,
    rol TEXT NOT NULL,
    telefono TEXT,
    direccion TEXT,
    ciudad TEXT,
    foto_perfil TEXT,
    telegram_chat_id TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);


CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- ============================================
-- TABLA: categorias
-- Categorías de productos
-- ============================================
CREATE TABLE IF NOT EXISTS categorias (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_categorias_nombre ON categorias(nombre);
CREATE INDEX IF NOT EXISTS idx_categorias_negocio ON categorias(negocio_id);

-- ============================================
-- TABLA: proveedores
-- Proveedores de productos
-- ============================================
CREATE TABLE IF NOT EXISTS proveedores (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    nombre TEXT NOT NULL,
    contacto TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    notas TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre);
CREATE INDEX IF NOT EXISTS idx_proveedores_negocio ON proveedores(negocio_id);

-- ============================================
-- TABLA: productos
-- Inventario de productos
-- ============================================
CREATE TABLE IF NOT EXISTS productos (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria_id TEXT NOT NULL,
    proveedor_id TEXT,
    precio_compra REAL NOT NULL DEFAULT 0,
    precio_venta REAL NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 10,
    imagen TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
    
    CHECK (precio_compra >= 0),
    CHECK (precio_venta >= 0),
    CHECK (stock >= 0),
    CHECK (stock_minimo >= 0)
);

CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_proveedor ON productos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_productos_negocio ON productos(negocio_id);

-- ============================================
-- TABLA: clientes
-- Base de datos de clientes
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    nombre TEXT NOT NULL,
    cedula TEXT UNIQUE,
    telefono TEXT,
    celular TEXT,
    whatsapp TEXT,
    email TEXT,
    direccion TEXT,
    ciudad TEXT,
    categoria TEXT DEFAULT 'Regular',
    total_comprado REAL NOT NULL DEFAULT 0,
    notas TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    vehiculo_favorito_id TEXT,
    telegram_chat_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (vehiculo_favorito_id) REFERENCES vehiculos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_cedula ON clientes(cedula);
CREATE INDEX IF NOT EXISTS idx_clientes_categoria ON clientes(categoria);
CREATE INDEX IF NOT EXISTS idx_clientes_negocio ON clientes(negocio_id);

-- ============================================
-- TABLA: ventas
-- Cabecera de ventas
-- ============================================
CREATE TABLE IF NOT EXISTS ventas (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    numero TEXT NOT NULL UNIQUE,
    fecha TEXT NOT NULL,
    hora TEXT,
    cliente_id TEXT,
    cliente_nombre TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    iva REAL NOT NULL DEFAULT 0,
    descuento REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    metodo_pago TEXT,
    estado TEXT NOT NULL DEFAULT 'completada',
    notas TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
    
    CHECK (subtotal >= 0),
    CHECK (iva >= 0),
    CHECK (descuento >= 0),
    CHECK (total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ventas_numero ON ventas(numero);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_metodo_pago ON ventas(metodo_pago);
CREATE INDEX IF NOT EXISTS idx_ventas_negocio ON ventas(negocio_id);

-- ============================================
-- TABLA: ventas_detalle
-- Detalle de productos vendidos en cada venta
-- ============================================
CREATE TABLE IF NOT EXISTS ventas_detalle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    negocio_id TEXT,
    venta_id TEXT NOT NULL,
    producto_id TEXT NOT NULL,
    producto_nombre TEXT,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
    
    CHECK (cantidad > 0),
    CHECK (precio_unitario >= 0),
    CHECK (total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ventas_detalle_venta ON ventas_detalle(venta_id);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_producto ON ventas_detalle(producto_id);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_negocio ON ventas_detalle(negocio_id);

-- ============================================
-- TABLA: compras
-- Cabecera de compras a proveedores
-- ============================================
CREATE TABLE IF NOT EXISTS compras (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    numero TEXT NOT NULL UNIQUE,
    fecha TEXT NOT NULL,
    proveedor_id TEXT,
    proveedor_nombre TEXT,
    proveedor_identificacion TEXT,
    moneda TEXT DEFAULT 'USD',
    subtotal REAL NOT NULL DEFAULT 0,
    iva REAL NOT NULL DEFAULT 0,
    otros_impuestos REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'completada',
    estado_pago TEXT DEFAULT 'pendiente',
    monto_pagado REAL NOT NULL DEFAULT 0,
    notas TEXT,
    metadata TEXT,
    pdf_base64 TEXT,
    pdf_nombre TEXT,
    pdf_size INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
    
    CHECK (total >= 0),
    CHECK (monto_pagado >= 0),
    CHECK (monto_pagado <= total)
);

CREATE INDEX IF NOT EXISTS idx_compras_numero ON compras(numero);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras(fecha);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_estado ON compras(estado);
CREATE INDEX IF NOT EXISTS idx_compras_negocio ON compras(negocio_id);

-- ============================================
-- TABLA: compras_detalle
-- Detalle de productos comprados
-- ============================================
CREATE TABLE IF NOT EXISTS compras_detalle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    negocio_id TEXT,
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

CREATE INDEX IF NOT EXISTS idx_compras_detalle_compra ON compras_detalle(compra_id);
CREATE INDEX IF NOT EXISTS idx_compras_detalle_producto ON compras_detalle(producto_id);
CREATE INDEX IF NOT EXISTS idx_compras_detalle_negocio ON compras_detalle(negocio_id);

-- ============================================
-- TABLAS: ia_facturas_extracciones / productos
-- Historial detallado de ejecuciones del extractor IA
-- ============================================
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

-- ============================================
-- TABLA: cuentas_por_cobrar
-- Cuentas pendientes de clientes
-- ============================================
CREATE TABLE IF NOT EXISTS cuentas_por_cobrar (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    cliente_id TEXT NOT NULL,
    venta_id TEXT,
    monto REAL NOT NULL,
    monto_pagado REAL NOT NULL DEFAULT 0,
    fecha TEXT NOT NULL,
    fecha_vencimiento TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    notas TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL,
    
    CHECK (monto > 0),
    CHECK (monto_pagado >= 0),
    CHECK (monto_pagado <= monto)
);

CREATE INDEX IF NOT EXISTS idx_cuentas_cobrar_cliente ON cuentas_por_cobrar(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_cobrar_estado ON cuentas_por_cobrar(estado);
CREATE INDEX IF NOT EXISTS idx_cuentas_cobrar_vencimiento ON cuentas_por_cobrar(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_cuentas_cobrar_negocio ON cuentas_por_cobrar(negocio_id);

-- ============================================
-- TABLA: cuentas_por_pagar
-- Cuentas pendientes a proveedores
-- ============================================
CREATE TABLE IF NOT EXISTS cuentas_por_pagar (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    proveedor_id TEXT NOT NULL,
    compra_id TEXT,
    monto REAL NOT NULL,
    monto_pagado REAL NOT NULL DEFAULT 0,
    fecha TEXT NOT NULL,
    fecha_vencimiento TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    notas TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE,
    FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE SET NULL,
    
    CHECK (monto > 0),
    CHECK (monto_pagado >= 0),
    CHECK (monto_pagado <= monto)
);

CREATE INDEX IF NOT EXISTS idx_cuentas_pagar_proveedor ON cuentas_por_pagar(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_pagar_estado ON cuentas_por_pagar(estado);
CREATE INDEX IF NOT EXISTS idx_cuentas_pagar_vencimiento ON cuentas_por_pagar(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_cuentas_pagar_negocio ON cuentas_por_pagar(negocio_id);

-- ============================================
-- TABLA: transacciones
-- Registro de todas las transacciones financieras
-- ============================================
CREATE TABLE IF NOT EXISTS transacciones (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    categoria TEXT,
    monto REAL NOT NULL,
    fecha TEXT NOT NULL,
    descripcion TEXT,
    metodo_pago TEXT,
    referencia_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    CHECK (monto > 0)
);

CREATE INDEX IF NOT EXISTS idx_transacciones_tipo ON transacciones(tipo);
CREATE INDEX IF NOT EXISTS idx_transacciones_categoria ON transacciones(categoria);
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON transacciones(fecha);

-- ============================================
-- TABLA: recordatorios
-- Recordatorios y alarmas
-- ============================================
-- ... existing content ...
CREATE TABLE IF NOT EXISTS recordatorios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    fecha_recordatorio DATETIME NOT NULL,
    cliente_id INTEGER,
    vehiculo_id INTEGER,
    tipo TEXT, -- 'Llamada', 'Mensaje', 'Email'
    completado INTEGER DEFAULT 0,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id)
);

-- Módulos de Documentos Fiscales (SRI Ecuador)

CREATE TABLE IF NOT EXISTS facturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    venta_id INTEGER,
    numero TEXT NOT NULL UNIQUE,
    fecha DATETIME NOT NULL,
    subtotal_iva REAL NOT NULL,
    subtotal_cero REAL NOT NULL,
    descuento REAL NOT NULL,
    iva REAL NOT NULL,
    total REAL NOT NULL,
    estado TEXT DEFAULT 'emitida', -- emitida, anulada
    autorizacion_sri TEXT,
    fecha_autorizacion DATETIME,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (venta_id) REFERENCES ventas(id)
);

CREATE TABLE IF NOT EXISTS factura_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    descuento REAL DEFAULT 0,
    precio_total REAL NOT NULL,
    iva_aplicado REAL NOT NULL, -- El porcentaje de IVA, ej: 12
    FOREIGN KEY (factura_id) REFERENCES facturas(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

CREATE TABLE IF NOT EXISTS retenciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor_id INTEGER NOT NULL,
    compra_id INTEGER,
    numero TEXT NOT NULL UNIQUE,
    fecha DATETIME NOT NULL,
    total_retenido REAL NOT NULL,
    estado TEXT DEFAULT 'emitida',
    autorizacion_sri TEXT,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (compra_id) REFERENCES compras(id)
);

CREATE TABLE IF NOT EXISTS retencion_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    retencion_id INTEGER NOT NULL,
    codigo_impuesto TEXT NOT NULL, -- Ej: '1' para Renta, '2' para IVA
    codigo_retencion TEXT NOT NULL, -- Ej: '312' para servicios
    base_imponible REAL NOT NULL,
    porcentaje_retencion REAL NOT NULL,
    valor_retenido REAL NOT NULL,
    FOREIGN KEY (retencion_id) REFERENCES retenciones(id)
);

-- Agrega aquí las demás tablas (guias_remision, notas_credito, etc.)
-- según se vayan implementando.


CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha ON recordatorios(fecha_recordatorio);
CREATE INDEX IF NOT EXISTS idx_recordatorios_completado ON recordatorios(completado);
CREATE INDEX IF NOT EXISTS idx_recordatorios_tipo ON recordatorios(tipo);

-- ============================================
-- TABLA: publicidad
-- Publicidad programada para redes sociales
-- ============================================
CREATE TABLE IF NOT EXISTS publicidad (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    red_social TEXT,
    fecha TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    imagen TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_publicidad_fecha ON publicidad(fecha);
CREATE INDEX IF NOT EXISTS idx_publicidad_estado ON publicidad(estado);

-- ============================================
-- TABLA: publicaciones
-- Registro de publicaciones realizadas
-- ============================================
CREATE TABLE IF NOT EXISTS publicaciones (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    red_social TEXT,
    fecha TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'publicada',
    metricas TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_publicaciones_fecha ON publicaciones(fecha);
CREATE INDEX IF NOT EXISTS idx_publicaciones_red_social ON publicaciones(red_social);

-- ============================================
-- TABLA: publicidades_guardadas
-- Publicidades generadas y guardadas
-- ============================================
CREATE TABLE IF NOT EXISTS publicidades_guardadas (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    producto_id TEXT,
    producto_data TEXT,
    promocion TEXT,
    redes_sociales TEXT,
    textos_publicacion TEXT,
    prompt_imagen TEXT,
    fecha_creacion TEXT NOT NULL,
    usado INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_publicidades_guardadas_producto ON publicidades_guardadas(producto_id);
CREATE INDEX IF NOT EXISTS idx_publicidades_guardadas_usado ON publicidades_guardadas(usado);



-- ============================================
-- TABLA: configuracion
-- Configuración general del sistema
-- ============================================
CREATE TABLE IF NOT EXISTS configuracion (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'string',
    descripcion TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Insertar configuración por defecto (solo si no existe)
INSERT OR IGNORE INTO configuracion (key, value, tipo, descripcion) VALUES
    ('nombreNegocio', 'Mi Tienda', 'string', 'Nombre del negocio'),
    ('ruc', '', 'string', 'RUC o NIT'),
    ('direccion', '', 'string', 'Dirección del negocio'),
    ('telefono', '', 'string', 'Teléfono de contacto'),
    ('email', '', 'string', 'Email de contacto'),
    ('moneda', 'USD', 'string', 'Moneda del sistema'),
    ('iva', '15', 'number', 'Porcentaje de IVA'),
    ('stockMinimo', '10', 'number', 'Stock mínimo por defecto'),
    ('tema', 'light', 'string', 'Tema de la interfaz'),
    ('version', '1.0.0', 'string', 'Versión de la base de datos');

-- ============================================
-- TABLA: imagenes
-- Almacenamiento separado de imágenes
-- ============================================
CREATE TABLE IF NOT EXISTS imagenes (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    referencia_id TEXT,
    mime_type TEXT,
    tamano INTEGER,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_imagenes_tipo ON imagenes(tipo);
CREATE INDEX IF NOT EXISTS idx_imagenes_referencia ON imagenes(referencia_id);

-- ============================================
-- TABLA: logs_sistema
-- Registro de acciones importantes (auditoría)
-- ============================================
CREATE TABLE IF NOT EXISTS logs_sistema (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id TEXT,
    accion TEXT NOT NULL,
    tabla TEXT,
    registro_id TEXT,
    datos_anteriores TEXT,
    datos_nuevos TEXT,
    ip TEXT,
    user_agent TEXT,
    fecha TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs_sistema(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_accion ON logs_sistema(accion);
CREATE INDEX IF NOT EXISTS idx_logs_fecha ON logs_sistema(fecha);

-- ============================================
-- Versión del esquema
-- ============================================
PRAGMA user_version = 1;

-- ============================================
-- TABLA: vehiculos
-- Información detallada de los vehículos
-- ============================================
CREATE TABLE IF NOT EXISTS vehiculos (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    cliente_id TEXT NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    anio INTEGER,
    placa TEXT UNIQUE,
    vin TEXT UNIQUE,
    color TEXT,
    kilometraje REAL DEFAULT 0,
    fecha_ultimo_servicio TEXT,
    notas TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente_id ON vehiculos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_placa ON vehiculos(placa);
CREATE INDEX IF NOT EXISTS idx_vehiculos_vin ON vehiculos(vin);
CREATE INDEX IF NOT EXISTS idx_vehiculos_negocio ON vehiculos(negocio_id);

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

-- ============================================
-- TABLA: ordenes_trabajo
-- Cabecera de órdenes de trabajo para talleres
-- ============================================
CREATE TABLE IF NOT EXISTS ordenes_trabajo (
    id TEXT PRIMARY KEY,
    negocio_id TEXT,
    numero TEXT NOT NULL UNIQUE,
    cliente_id TEXT NOT NULL,
    vehiculo_id TEXT NOT NULL,
    fecha_recepcion TEXT NOT NULL,
    fecha_entrega_estimada TEXT,
    fecha_entrega_real TEXT,
    problema_reportado TEXT,
    diagnostico_inicial TEXT,
    tecnico_asignado_id TEXT,
    estado TEXT NOT NULL DEFAULT 'recibido', -- recibido, en_proceso, espera_repuestos, finalizado, entregado, cancelado
    subtotal_servicios REAL NOT NULL DEFAULT 0,
    subtotal_repuestos REAL NOT NULL DEFAULT 0,
    descuento REAL NOT NULL DEFAULT 0,
    iva REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    monto_pagado REAL NOT NULL DEFAULT 0,
    ruta_factura TEXT, -- Ruta al PDF generado o subido
    observaciones TEXT,
    autorizacion_cliente INTEGER DEFAULT 0, -- 0 o 1, para marcar si el cliente autorizó el trabajo
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE RESTRICT,
    FOREIGN KEY (tecnico_asignado_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ordenes_trabajo_numero ON ordenes_trabajo(numero);
CREATE INDEX IF NOT EXISTS idx_ordenes_trabajo_cliente ON ordenes_trabajo(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_trabajo_vehiculo ON ordenes_trabajo(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_trabajo_estado ON ordenes_trabajo(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_trabajo_tecnico ON ordenes_trabajo(tecnico_asignado_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_trabajo_negocio ON ordenes_trabajo(negocio_id);

-- ============================================
-- TABLA: ordenes_trabajo_servicios
-- Detalle de servicios realizados en cada orden de trabajo
-- ============================================
CREATE TABLE IF NOT EXISTS ordenes_trabajo_servicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    negocio_id TEXT NOT NULL,
    orden_id TEXT NOT NULL,
    servicio_nombre TEXT NOT NULL,
    descripcion TEXT,
    horas_labor REAL NOT NULL DEFAULT 0,
    precio_hora REAL NOT NULL DEFAULT 0,
    precio_total_servicio REAL NOT NULL DEFAULT 0,
    
    FOREIGN KEY (orden_id) REFERENCES ordenes_trabajo(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ot_servicios_orden ON ordenes_trabajo_servicios(orden_id);
CREATE INDEX IF NOT EXISTS idx_ot_servicios_negocio ON ordenes_trabajo_servicios(negocio_id);

-- ============================================
-- TABLA: ordenes_trabajo_repuestos
-- Detalle de repuestos utilizados en cada orden de trabajo
-- ============================================
CREATE TABLE IF NOT EXISTS ordenes_trabajo_repuestos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    negocio_id TEXT NOT NULL,
    orden_id TEXT NOT NULL,
    producto_id TEXT, -- Puede ser un producto del inventario o un item fuera de inventario
    nombre_repuesto TEXT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario REAL NOT NULL DEFAULT 0,
    precio_total_repuesto REAL NOT NULL DEFAULT 0,
    
    FOREIGN KEY (orden_id) REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ot_repuestos_orden ON ordenes_trabajo_repuestos(orden_id);
CREATE INDEX IF NOT EXISTS idx_ot_repuestos_producto ON ordenes_trabajo_repuestos(producto_id);
CREATE INDEX IF NOT EXISTS idx_ot_repuestos_negocio ON ordenes_trabajo_repuestos(negocio_id);

-- ============================================
-- ACTUALIZACIONES DE TABLAS EXISTENTES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_cedula ON clientes(cedula);
CREATE INDEX IF NOT EXISTS idx_clientes_categoria ON clientes(categoria);
CREATE INDEX IF NOT EXISTS idx_clientes_vehiculo_favorito ON clientes(vehiculo_favorito_id);
CREATE INDEX IF NOT EXISTS idx_clientes_telegram_chat_id ON clientes(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha ON recordatorios(fecha_recordatorio);
CREATE INDEX IF NOT EXISTS idx_recordatorios_completado ON recordatorios(completado);
CREATE INDEX IF NOT EXISTS idx_recordatorios_tipo ON recordatorios(tipo);
CREATE INDEX IF NOT EXISTS idx_recordatorios_cliente ON recordatorios(cliente_id);
CREATE INDEX IF NOT EXISTS idx_recordatorios_vehiculo ON recordatorios(vehiculo_id);

-- ============================================
-- TABLA: citas
-- Citas programadas del taller
-- ============================================
CREATE TABLE IF NOT EXISTS citas (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cliente_id TEXT NOT NULL,
    vehiculo_id TEXT NOT NULL,
    tipo_servicio TEXT NOT NULL,
    fecha TEXT NOT NULL,
    hora TEXT NOT NULL,
    duracion INTEGER DEFAULT 60, -- en minutos
    tecnico_id TEXT,
    descripcion TEXT,
    notas TEXT,
    prioridad TEXT DEFAULT 'normal', -- normal, alta, urgente
    recordatorio TEXT, -- 1_dia, 2_horas, 30_minutos
    estado TEXT DEFAULT 'programado', -- programado, en_proceso, completado, cancelado
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE,
    FOREIGN KEY (tecnico_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_citas_cliente_id ON citas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_citas_vehiculo_id ON citas(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha);
CREATE INDEX IF NOT EXISTS idx_citas_tecnico_id ON citas(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);

-- Actualizar versión del esquema
PRAGMA user_version = 3;

-- ============================================
-- TABLA: notificaciones_enviadas
-- Historial completo de notificaciones enviadas (actualizado para Telegram)
-- ============================================
DROP TABLE IF EXISTS notificaciones_enviadas;
CREATE TABLE notificaciones_enviadas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT,  -- ID del chat de Telegram
    cliente_id TEXT,  -- Referencia al cliente
    vehiculo_id TEXT,  -- Referencia al vehículo
    tipo_servicio TEXT,  -- Tipo de servicio de mantenimiento
    mensaje TEXT NOT NULL,  -- Contenido del mensaje enviado
    telegram_message_id TEXT,  -- ID del mensaje en Telegram
    fecha_envio TEXT NOT NULL DEFAULT (datetime('now')),
    entregado INTEGER DEFAULT 1,  -- 1 si se entregó correctamente
    tipo TEXT DEFAULT 'notificacion',  -- notificacion, recordatorio, etc.
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_enviadas_fecha ON notificaciones_enviadas(fecha_envio);
CREATE INDEX IF NOT EXISTS idx_notificaciones_enviadas_chat_id ON notificaciones_enviadas(chat_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_enviadas_cliente ON notificaciones_enviadas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_enviadas_vehiculo ON notificaciones_enviadas(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_enviadas_tipo_servicio ON notificaciones_enviadas(tipo_servicio);

-- ============================================
-- VISTAS ÚTILES (redefinidas al final tras migraciones)
-- ============================================

DROP VIEW IF EXISTS vista_productos_stock_bajo;
CREATE VIEW IF NOT EXISTS vista_productos_stock_bajo AS
SELECT
    p.id,
    p.codigo,
    p.nombre,
    p.stock,
    p.stock_minimo,
    c.nombre AS categoria,
    pr.nombre AS proveedor
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
WHERE p.stock <= p.stock_minimo AND p.activo = 1;

DROP VIEW IF EXISTS vista_ventas_diarias;
CREATE VIEW IF NOT EXISTS vista_ventas_diarias AS
SELECT
    DATE(fecha) AS dia,
    COUNT(*) AS total_ventas,
    SUM(subtotal) AS subtotal,
    SUM(iva) AS iva,
    SUM(descuento) AS descuento,
    SUM(total) AS total
FROM ventas
WHERE estado = 'completada'
GROUP BY DATE(fecha);

DROP VIEW IF EXISTS vista_productos_mas_vendidos;
CREATE VIEW IF NOT EXISTS vista_productos_mas_vendidos AS
SELECT
    vd.producto_id,
    vd.producto_nombre,
    SUM(vd.cantidad) AS total_vendido,
    COUNT(DISTINCT vd.venta_id) AS num_ventas,
    SUM(vd.total) AS ingresos_generados
FROM ventas_detalle vd
INNER JOIN ventas v ON vd.venta_id = v.id
WHERE v.estado = 'completada'
GROUP BY vd.producto_id, vd.producto_nombre
ORDER BY total_vendido DESC;

DROP VIEW IF EXISTS vista_clientes_top;
CREATE VIEW IF NOT EXISTS vista_clientes_top AS
SELECT
    c.id,
    c.nombre,
    c.categoria,
    COUNT(v.id) AS num_compras,
    COALESCE(SUM(v.total), 0) AS total_comprado,
    MAX(v.fecha) AS ultima_compra
FROM clientes c
LEFT JOIN ventas v ON c.id = v.cliente_id AND v.estado = 'completada'
GROUP BY c.id, c.nombre, c.categoria
ORDER BY total_comprado DESC;

-- ============================================
-- Versión del esquema
-- ============================================
