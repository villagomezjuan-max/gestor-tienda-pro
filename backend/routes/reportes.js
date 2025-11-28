/**
 * Rutas de Reportes y Estadísticas
 * Gestor Tienda Pro - Sistema Multi-Tenant
 *
 * Usa las vistas SQL definidas en schema.sql para generar reportes
 */

const express = require('express');

const { authenticate } = require('../middleware/auth');
const { validateTenantAccess } = require('../middleware/tenant');
const { normalizeNumber, round2, formatCurrency } = require('../utils/numbers');
const { query } = require('../utils/query-builder');

const router = express.Router();

// Función helper para validar fechas
function isValidDate(dateString) {
  if (!dateString) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

// Función helper para sanitizar límite
function sanitizeLimit(limit, defaultLimit = 30, maxLimit = 1000) {
  const parsed = parseInt(limit, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return defaultLimit;
  return Math.min(parsed, maxLimit);
}

/**
 * GET /api/reportes/ventas-diarias
 * Reporte de ventas agrupadas por día
 *
 * Query params:
 *  - fechaInicio: Fecha inicio (YYYY-MM-DD)
 *  - fechaFin: Fecha fin (YYYY-MM-DD)
 *  - limit: Límite de resultados (default: 30)
 */
router.get('/ventas-diarias', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db;
    const { fechaInicio, fechaFin, limit } = req.query;

    // Validar fechas
    if (fechaInicio && !isValidDate(fechaInicio)) {
      return res
        .status(400)
        .json({ success: false, message: 'Fecha de inicio inválida. Use formato YYYY-MM-DD' });
    }
    if (fechaFin && !isValidDate(fechaFin)) {
      return res
        .status(400)
        .json({ success: false, message: 'Fecha de fin inválida. Use formato YYYY-MM-DD' });
    }

    const qb = query('vista_ventas_diarias');

    if (fechaInicio) {
      qb.where('dia', '>=', fechaInicio);
    }

    if (fechaFin) {
      qb.where('dia', '<=', fechaFin);
    }

    qb.orderBy('dia', 'DESC');

    const sanitizedLimit = sanitizeLimit(limit, 30, 365); // Máximo 365 días
    qb.limit(sanitizedLimit);

    const { query: sqlQuery, params } = qb.build();
    const rows = tenantDb.prepare(sqlQuery).all(params);

    const ventas = rows.map((row) => ({
      dia: row.dia,
      totalVentas: row.total_ventas,
      subtotal: round2(row.subtotal),
      iva: round2(row.iva),
      descuento: round2(row.descuento),
      total: round2(row.total),
    }));

    // Calcular totales
    const totales = ventas.reduce(
      (acc, venta) => ({
        totalVentas: acc.totalVentas + venta.totalVentas,
        subtotal: acc.subtotal + venta.subtotal,
        iva: acc.iva + venta.iva,
        descuento: acc.descuento + venta.descuento,
        total: acc.total + venta.total,
      }),
      { totalVentas: 0, subtotal: 0, iva: 0, descuento: 0, total: 0 }
    );

    res.json({
      success: true,
      ventas,
      totales: {
        ...totales,
        subtotal: round2(totales.subtotal),
        iva: round2(totales.iva),
        descuento: round2(totales.descuento),
        total: round2(totales.total),
      },
      periodo: {
        inicio: fechaInicio || 'N/A',
        fin: fechaFin || 'N/A',
      },
    });
  } catch (error) {
    console.error('Error en reporte de ventas diarias:', error);
    res.status(500).json({
      success: false,
      message: 'No se pudo generar el reporte de ventas diarias.',
    });
  }
});

/**
 * GET /api/reportes/productos-mas-vendidos
 * Top de productos más vendidos
 *
 * Query params:
 *  - limit: Cantidad de productos (default: 20)
 */
router.get('/productos-mas-vendidos', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db;
    const limit = sanitizeLimit(req.query.limit, 20, 100);

    const rows = tenantDb
      .prepare(
        `
      SELECT * FROM vista_productos_mas_vendidos
      LIMIT ?
    `
      )
      .all(limit);

    const productos = rows.map((row) => ({
      productoId: row.producto_id,
      nombre: row.producto_nombre,
      totalVendido: normalizeNumber(row.total_vendido, 0),
      numeroVentas: normalizeNumber(row.num_ventas, 0),
      ingresosGenerados: round2(row.ingresos_generados),
    }));

    const totales = productos.reduce(
      (acc, prod) => ({
        totalVendido: acc.totalVendido + prod.totalVendido,
        ingresosGenerados: acc.ingresosGenerados + prod.ingresosGenerados,
      }),
      { totalVendido: 0, ingresosGenerados: 0 }
    );

    res.json({
      success: true,
      productos,
      totales: {
        totalVendido: totales.totalVendido,
        ingresosGenerados: round2(totales.ingresosGenerados),
      },
    });
  } catch (error) {
    console.error('Error en reporte de productos más vendidos:', error);
    res.status(500).json({
      success: false,
      message: 'No se pudo generar el reporte de productos más vendidos.',
    });
  }
});

/**
 * GET /api/reportes/clientes-top
 * Top de mejores clientes
 *
 * Query params:
 *  - limit: Cantidad de clientes (default: 20)
 */
router.get('/clientes-top', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db;
    const limit = sanitizeLimit(req.query.limit, 20, 100);

    const rows = tenantDb
      .prepare(
        `
      SELECT * FROM vista_clientes_top
      LIMIT ?
    `
      )
      .all(limit);

    const clientes = rows.map((row) => ({
      clienteId: row.id,
      nombre: row.nombre,
      categoria: row.categoria,
      numeroCompras: normalizeNumber(row.num_compras, 0),
      totalComprado: round2(row.total_comprado),
      ultimaCompra: row.ultima_compra,
    }));

    const totales = clientes.reduce(
      (acc, cliente) => ({
        numeroCompras: acc.numeroCompras + cliente.numeroCompras,
        totalComprado: acc.totalComprado + cliente.totalComprado,
      }),
      { numeroCompras: 0, totalComprado: 0 }
    );

    res.json({
      success: true,
      clientes,
      totales: {
        numeroCompras: totales.numeroCompras,
        totalComprado: round2(totales.totalComprado),
      },
    });
  } catch (error) {
    console.error('Error en reporte de clientes top:', error);
    res.status(500).json({
      success: false,
      message: 'No se pudo generar el reporte de mejores clientes.',
    });
  }
});

/**
 * GET /api/reportes/stock-bajo
 * Productos con stock bajo o agotado
 */
router.get('/stock-bajo', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db;

    const rows = tenantDb
      .prepare(
        `
      SELECT * FROM vista_productos_stock_bajo
      ORDER BY stock ASC
    `
      )
      .all();

    const productos = rows.map((row) => ({
      productoId: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      stock: normalizeNumber(row.stock, 0),
      stockMinimo: normalizeNumber(row.stock_minimo, 0),
      categoria: row.categoria,
      proveedor: row.proveedor,
    }));

    res.json({
      success: true,
      productos,
      total: productos.length,
      criticos: productos.filter((p) => p.stock === 0).length,
      advertencia: productos.filter((p) => p.stock > 0 && p.stock <= p.stockMinimo).length,
    });
  } catch (error) {
    console.error('Error en reporte de stock bajo:', error);
    res.status(500).json({
      success: false,
      message: 'No se pudo generar el reporte de stock bajo.',
    });
  }
});

/**
 * GET /api/reportes/dashboard
 * Métricas principales para el dashboard
 */
router.get('/dashboard', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db;
    const hoy = new Date().toISOString().split('T')[0];
    const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0];

    // Ventas del día
    const ventasHoy = tenantDb
      .prepare(
        `
      SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(total), 0) as total_monto
      FROM ventas
      WHERE DATE(fecha) = ? AND estado = 'completada'
    `
      )
      .get(hoy);

    // Ventas del mes
    const ventasMes = tenantDb
      .prepare(
        `
      SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(total), 0) as total_monto
      FROM ventas
      WHERE DATE(fecha) >= ? AND estado = 'completada'
    `
      )
      .get(primerDiaMes);

    // Productos con stock crítico
    const stockCritico = tenantDb
      .prepare(
        `
      SELECT COUNT(*) as total
      FROM productos
      WHERE stock <= stock_minimo AND activo = 1
    `
      )
      .get();

    // Cuentas por cobrar pendientes
    const cuentasCobrar = tenantDb
      .prepare(
        `
      SELECT 
        COUNT(*) as total_cuentas,
        COALESCE(SUM(monto - monto_pagado), 0) as total_saldo
      FROM cuentas_por_cobrar
      WHERE estado IN ('pendiente', 'parcial')
    `
      )
      .get();

    // Cuentas por pagar pendientes
    const cuentasPagar = tenantDb
      .prepare(
        `
      SELECT 
        COUNT(*) as total_cuentas,
        COALESCE(SUM(monto - monto_pagado), 0) as total_saldo
      FROM cuentas_por_pagar
      WHERE estado IN ('pendiente', 'parcial')
    `
      )
      .get();

    // Total de clientes activos
    const clientes = tenantDb
      .prepare(
        `
      SELECT COUNT(*) as total
      FROM clientes
      WHERE activo = 1
    `
      )
      .get();

    // Total de productos activos
    const productos = tenantDb
      .prepare(
        `
      SELECT COUNT(*) as total
      FROM productos
      WHERE activo = 1
    `
      )
      .get();

    res.json({
      success: true,
      metricas: {
        ventasHoy: {
          cantidad: ventasHoy.total_ventas,
          monto: round2(ventasHoy.total_monto),
        },
        ventasMes: {
          cantidad: ventasMes.total_ventas,
          monto: round2(ventasMes.total_monto),
        },
        stockCritico: stockCritico.total,
        cuentasPorCobrar: {
          cantidad: cuentasCobrar.total_cuentas,
          saldo: round2(cuentasCobrar.total_saldo),
        },
        cuentasPorPagar: {
          cantidad: cuentasPagar.total_cuentas,
          saldo: round2(cuentasPagar.total_saldo),
        },
        clientesActivos: clientes.total,
        productosActivos: productos.total,
      },
      fecha: hoy,
    });
  } catch (error) {
    console.error('Error en dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'No se pudieron cargar las métricas del dashboard.',
    });
  }
});

module.exports = router;
