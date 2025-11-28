/**
 * Utilidades de mapeo de datos de base de datos
 * Convierte rows de SQLite a objetos JavaScript con convenciones camelCase y snake_case
 */

const { normalizeNumber } = require('./numbers');

/**
 * Convierte snake_case a camelCase
 *
 * @param {string} str - String en snake_case
 * @returns {string} - String en camelCase
 */
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Mapeo genérico de row de base de datos
 *
 * @param {object} row - Row de base de datos
 * @param {object} options - Opciones de mapeo
 * @returns {object | null} - Objeto mapeado
 *
 * @example
 * mapDatabaseRow(row, {
 *   dualKeys: true, // Genera tanto snake_case como camelCase
 *   aliases: { total_comprado: 'totalComprado' },
 *   computed: {
 *     fullName: (row) => `${row.nombre} ${row.apellido}`,
 *     isActive: (row) => row.activo === 1
 *   },
 *   numbers: ['total_comprado', 'saldo_pendiente'], // Normalizar como números
 *   booleans: ['activo', 'es_principal'] // Convertir a boolean
 * })
 */
function mapDatabaseRow(row, options = {}) {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const {
    dualKeys = false,
    aliases = {},
    computed = {},
    numbers = [],
    booleans = [],
    dates = [],
  } = options;

  const result = {};

  // Mapear campos básicos
  Object.keys(row).forEach((key) => {
    const value = row[key];

    // Aplicar normalización según tipo
    let processedValue = value;

    if (numbers.includes(key)) {
      processedValue = normalizeNumber(value, 0);
    } else if (booleans.includes(key)) {
      processedValue = Boolean(value === 1 || value === true);
    } else if (dates.includes(key) && value) {
      processedValue = new Date(value).toISOString();
    }

    // Usar alias si existe, sino generar camelCase
    const alias = aliases[key];
    if (alias) {
      result[alias] = processedValue;
    } else {
      const camelKey = snakeToCamel(key);
      result[camelKey] = processedValue;

      // Si dualKeys está activo, mantener también la versión snake_case
      if (dualKeys && camelKey !== key) {
        result[key] = processedValue;
      }
    }
  });

  // Aplicar campos computados
  Object.keys(computed).forEach((key) => {
    if (typeof computed[key] === 'function') {
      result[key] = computed[key](row, result);
    } else {
      result[key] = computed[key];
    }
  });

  return result;
}

/**
 * Mapea un cliente de la base de datos
 *
 * @param {object} row - Row de cliente
 * @returns {object | null} - Cliente mapeado
 */
function mapClienteRow(row) {
  if (!row) return null;

  const totalComprado = normalizeNumber(row.total_comprado_sum ?? row.total_comprado, 0);
  const numeroCompras = normalizeNumber(row.numero_compras, 0);
  const ticketPromedio = numeroCompras > 0 ? Number((totalComprado / numeroCompras).toFixed(2)) : 0;

  return mapDatabaseRow(row, {
    dualKeys: true,
    numbers: ['total_comprado', 'saldo_pendiente', 'limite_credito'],
    booleans: ['activo'],
    computed: {
      totalComprado,
      numeroCompras,
      ticketPromedio,
      saldoPendiente: normalizeNumber(row.saldo_pendiente, 0),
      limiteCredito: normalizeNumber(row.limite_credito, 0),
    },
  });
}

/**
 * Mapea un vehículo de la base de datos
 *
 * @param {object} row - Row de vehículo
 * @returns {object | null} - Vehículo mapeado
 */
function mapVehiculoRow(row) {
  if (!row) return null;

  return mapDatabaseRow(row, {
    dualKeys: true,
    numbers: ['kilometraje', 'anio'],
    aliases: {
      cliente_id: 'clienteId',
      cliente_nombre: 'clienteNombre',
      fecha_ultimo_servicio: 'fechaUltimoServicio',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
    },
  });
}

/**
 * Mapea una orden de trabajo de la base de datos
 *
 * @param {object} row - Row de orden de trabajo
 * @returns {object | null} - Orden mapeada
 */
function mapOrdenTrabajoRow(row) {
  if (!row) return null;

  return mapDatabaseRow(row, {
    dualKeys: true,
    numbers: [
      'subtotal_servicios',
      'subtotal_repuestos',
      'descuento',
      'iva',
      'total',
      'monto_pagado',
      'presupuesto_estimado',
      'kilometraje',
      'vehiculo_anio',
    ],
    booleans: ['requiere_contacto', 'notificar_avances'],
  });
}

/**
 * Mapea un usuario de la base de datos
 *
 * @param {object} row - Row de usuario
 * @returns {object | null} - Usuario mapeado
 */
function mapUsuarioRow(row) {
  if (!row) return null;

  return mapDatabaseRow(row, {
    dualKeys: true,
    booleans: ['activo'],
    computed: {
      debeCambiarPassword: row.requiere_cambio_password === 1,
      ultimoAcceso: row.ultimo_acceso || null,
    },
  });
}

/**
 * Mapea un producto de la base de datos
 *
 * @param {object} row - Row de producto
 * @returns {object | null} - Producto mapeado
 */
function mapProductoRow(row) {
  if (!row) return null;

  return mapDatabaseRow(row, {
    dualKeys: true,
    numbers: ['precio_compra', 'precio_venta', 'stock', 'stock_minimo'],
    booleans: ['activo'],
    aliases: {
      categoria_id: 'categoriaId',
      proveedor_id: 'proveedorId',
      precio_compra: 'precioCompra',
      precio_venta: 'precioVenta',
      stock_minimo: 'stockMinimo',
    },
  });
}

/**
 * Mapea una venta de la base de datos
 *
 * @param {object} row - Row de venta
 * @returns {object | null} - Venta mapeada
 */
function mapVentaRow(row) {
  if (!row) return null;

  return mapDatabaseRow(row, {
    dualKeys: true,
    numbers: ['subtotal', 'iva', 'descuento', 'total'],
    aliases: {
      cliente_id: 'clienteId',
      cliente_nombre: 'clienteNombre',
      metodo_pago: 'metodoPago',
    },
  });
}

/**
 * Mapea una compra de la base de datos
 *
 * @param {object} row - Row de compra
 * @returns {object | null} - Compra mapeada
 */
function mapCompraRow(row) {
  if (!row) return null;

  return mapDatabaseRow(row, {
    dualKeys: true,
    numbers: ['subtotal', 'iva', 'otros_impuestos', 'total', 'monto_pagado'],
    aliases: {
      proveedor_id: 'proveedorId',
      proveedor_nombre: 'proveedorNombre',
      otros_impuestos: 'otrosImpuestos',
      monto_pagado: 'montoPagado',
      estado_pago: 'estadoPago',
    },
  });
}

module.exports = {
  snakeToCamel,
  mapDatabaseRow,
  mapClienteRow,
  mapVehiculoRow,
  mapOrdenTrabajoRow,
  mapUsuarioRow,
  mapProductoRow,
  mapVentaRow,
  mapCompraRow,
  // Aliases sin sufijo 'Row' para retrocompatibilidad
  mapCliente: mapClienteRow,
  mapVehiculo: mapVehiculoRow,
  mapOrdenTrabajo: mapOrdenTrabajoRow,
  mapUsuario: mapUsuarioRow,
  mapProducto: mapProductoRow,
  mapVenta: mapVentaRow,
  mapCompra: mapCompraRow,
};
