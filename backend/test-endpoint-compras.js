/**
 * Prueba directa del endpoint GET /api/compras
 * Simula exactamente lo que hace el servidor
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

// Cargar configuración de negocios
const configPath = path.join(__dirname, 'data', 'config_negocios.json');
const configNegocios = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('=== TEST ENDPOINT GET /api/compras ===\n');

// Usar super_admin como en la configuración
const negocioId = 'super_admin';
const negocio = configNegocios.negocios.find((n) => n.id === negocioId);

if (!negocio) {
  console.error(`❌ Negocio no encontrado: ${negocioId}`);
  process.exit(1);
}

const dbPath = path.join(__dirname, 'data', negocio.db_file);
console.log(`📂 BD a usar: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Base de datos no existe: ${dbPath}`);
  process.exit(1);
}

const tenantDb = new Database(dbPath);
tenantDb.pragma('foreign_keys = ON');

// Funciones auxiliares (copiadas del server.js)
function round2(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return 0;
  return Math.round(num * 100) / 100;
}

function normalizeNumber(val, fallback = 0) {
  if (val === null || val === undefined || val === '' || val === 'NaN') {
    return fallback;
  }
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
}

function mapCompraDetalleRow(row) {
  if (!row) return null;

  const cantidad = round2(normalizeNumber(row.cantidad, 1));
  const precioUnitario = round2(normalizeNumber(row.precio_unitario, 0));
  const subtotal = round2(cantidad * precioUnitario);

  return {
    id: row.id,
    compra_id: row.compra_id,
    compraId: row.compra_id,
    producto_id: row.producto_id,
    productoId: row.producto_id,
    producto_nombre: row.producto_nombre || '',
    productoNombre: row.producto_nombre || '',
    descripcion: row.descripcion || '',
    unidad: row.unidad || 'und',
    cantidad,
    precio_unitario: round2(precioUnitario),
    precioUnitario: round2(precioUnitario),
    subtotal: round2(subtotal),
    total: round2(subtotal),
  };
}

function buildCompraDetalleMap(tenantDb, compraIds = [], negocioId = null) {
  const map = new Map();
  if (!Array.isArray(compraIds) || !compraIds.length) {
    return map;
  }

  const placeholders = compraIds.map(() => '?').join(', ');
  let query = `SELECT * FROM compras_detalle WHERE compra_id IN (${placeholders})`;
  const params = [...compraIds];

  if (negocioId) {
    query += ' AND (negocio_id = ? OR negocio_id IS NULL)';
    params.push(negocioId);
  }

  query += ' ORDER BY id ASC';

  console.log(`📝 Query detalle: ${query}`);
  console.log(`📝 Params: ${JSON.stringify(params)}`);

  const detalleRows = tenantDb.prepare(query).all(...params);
  console.log(`📊 Filas de detalle encontradas: ${detalleRows.length}`);

  detalleRows.forEach((row) => {
    const mapped = mapCompraDetalleRow(row);
    if (!map.has(row.compra_id)) {
      map.set(row.compra_id, []);
    }
    if (mapped) {
      map.get(row.compra_id).push(mapped);
    }
  });

  return map;
}

function mapCompraRow(row, detalleRows = []) {
  if (!row) return null;

  const subtotal = round2(normalizeNumber(row.subtotal, 0));
  const iva = round2(normalizeNumber(row.iva, 0));
  const otrosImpuestos = round2(normalizeNumber(row.otros_impuestos, 0));
  const total = round2(normalizeNumber(row.total, subtotal + iva + otrosImpuestos));
  const montoPagado = round2(normalizeNumber(row.monto_pagado, 0));

  let metadata = row.metadata;
  if (metadata && typeof metadata === 'string') {
    const trimmed = metadata.trim();
    if (trimmed) {
      try {
        metadata = JSON.parse(trimmed);
      } catch (error) {
        metadata = trimmed;
      }
    } else {
      metadata = null;
    }
  }

  const estadoPago = (row.estado_pago || row.estadoPago || 'pendiente').toLowerCase();

  return {
    ...row,
    subtotal,
    iva,
    otros_impuestos: otrosImpuestos,
    otrosImpuestos,
    total,
    monto_pagado: montoPagado,
    montoPagado,
    estadoPago,
    estado_pago: estadoPago,
    moneda: (row.moneda || 'USD').toString().toUpperCase(),
    metadata,
    items: Array.isArray(detalleRows) ? detalleRows : [],
  };
}

function loadComprasWithDetails(tenantDb, rows = [], negocioId = null) {
  if (!Array.isArray(rows) || !rows.length) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  console.log(`📝 IDs de compras: ${JSON.stringify(ids)}`);

  const detalleMap = buildCompraDetalleMap(tenantDb, ids, negocioId);

  return rows.map((row) => mapCompraRow(row, detalleMap.get(row.id) || []));
}

// SIMULAR EL ENDPOINT
try {
  console.log('\n--- Simulando GET /api/compras ---\n');

  const params = negocioId ? { negocioId } : {};
  const query = negocioId
    ? 'SELECT * FROM compras WHERE negocio_id = @negocioId OR negocio_id IS NULL ORDER BY fecha DESC'
    : 'SELECT * FROM compras ORDER BY fecha DESC';

  console.log(`📝 Query principal: ${query}`);
  console.log(`📝 Params: ${JSON.stringify(params)}`);

  const rows = tenantDb.prepare(query).all(params);
  console.log(`📊 Compras encontradas: ${rows.length}`);

  if (rows.length > 0) {
    console.log(`\n📋 Primera compra (raw):`);
    console.log(JSON.stringify(rows[0], null, 2));
  }

  const compras = loadComprasWithDetails(tenantDb, rows, negocioId);

  console.log(`\n✅ Compras procesadas: ${compras.length}`);

  if (compras.length > 0) {
    console.log(`\n📋 Primera compra procesada:`);
    const firstCompra = { ...compras[0] };
    // Truncar campos largos para legibilidad
    if (firstCompra.pdf_base64 && firstCompra.pdf_base64.length > 100) {
      firstCompra.pdf_base64 = firstCompra.pdf_base64.substring(0, 100) + '...(truncado)';
    }
    console.log(JSON.stringify(firstCompra, null, 2));
  }

  console.log('\n✅ TEST EXITOSO - El endpoint debería funcionar correctamente');
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error('Stack:', error.stack);
}

tenantDb.close();
