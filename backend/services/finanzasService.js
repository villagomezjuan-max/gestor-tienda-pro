const { getTenantDb } = require('../utils/db');

class FinanzasService {
  constructor(negocioId) {
    if (!negocioId) {
      throw new Error('El ID del negocio es requerido para instanciar FinanzasService.');
    }
    this.negocioId = negocioId;
    this.db = getTenantDb(negocioId);
  }

  /**
   * Calcula un resumen financiero general dentro de un rango de fechas.
   * @param {string} fechaInicio 'YYYY-MM-DD'
   * @param {string} fechaFin 'YYYY-MM-DD'
   * @returns {Promise<object>} Resumen con ingresos, costos, gastos y ganancias.
   */
  async getFinancialSummary(fechaInicio, fechaFin) {
    const ingresosBrutos = await this.calcularIngresos(fechaInicio, fechaFin);
    const costoDeVentas = await this.calcularCostoDeVentas(fechaInicio, fechaFin);
    const gastosOperativos = await this.calcularGastosOperativos(fechaInicio, fechaFin);

    const gananciaBruta = ingresosBrutos - costoDeVentas;
    const gananciaNeta = gananciaBruta - gastosOperativos;

    return {
      periodo: {
        inicio: fechaInicio,
        fin: fechaFin,
      },
      ingresosBrutos,
      costoDeVentas,
      gananciaBruta,
      gastosOperativos,
      gananciaNeta,
    };
  }

  /**
   * Calcula los ingresos totales de ventas y órdenes de trabajo.
   */
  async calcularIngresos(fechaInicio, fechaFin) {
    const ventasPromise = this.db('ventas')
      .sum('total as totalVentas')
      .where('estado', 'completada')
      .whereBetween('fecha', [fechaInicio, fechaFin])
      .first();

    const ordenesPromise = this.db('ordenes_trabajo')
      .sum('total as totalOrdenes')
      .whereIn('estado', ['finalizado', 'entregado'])
      .whereBetween('fecha_recepcion', [fechaInicio, fechaFin])
      .first();

    const [ventasResult, ordenesResult] = await Promise.all([ventasPromise, ordenesPromise]);

    const totalVentas = ventasResult.totalVentas || 0;
    const totalOrdenes = ordenesResult.totalOrdenes || 0;

    return totalVentas + totalOrdenes;
  }

  /**
   * Calcula el costo total de los productos vendidos.
   */
  async calcularCostoDeVentas(fechaInicio, fechaFin) {
    const result = await this.db('ventas_detalle as vd')
      .join('ventas as v', 'v.id', 'vd.venta_id')
      .join('productos as p', 'p.id', 'vd.producto_id')
      .where('v.estado', 'completada')
      .whereBetween('v.fecha', [fechaInicio, fechaFin])
      .sum(this.db.raw('vd.cantidad * p.precio_compra as costoTotal'))
      .first();

    return result.costoTotal || 0;
  }

  /**
   * Calcula los gastos operativos registrados en la tabla de compras.
   */
  async calcularGastosOperativos(fechaInicio, fechaFin) {
    // Asume que todas las compras son gastos operativos.
    // Esto podría refinarse si hubiera una categorización de gastos.
    const result = await this.db('compras')
      .sum('total as totalGastos')
      .where('estado', 'completada')
      .whereBetween('fecha', [fechaInicio, fechaFin])
      .first();

    return result.totalGastos || 0;
  }

  /**
   * Obtiene un listado de cuentas por cobrar.
   * @param {string} estado - Filtra por estado (e.g., 'pendiente', 'parcial').
   * @param {boolean} vencidas - Si es true, filtra solo las vencidas.
   * @returns {Promise<object>} Objeto con la lista de cuentas y totales.
   */
  async getCuentasPorCobrar(estado, vencidas) {
    let query = this.db('cuentas_por_cobrar as cpc')
      .join('clientes as c', 'c.id', 'cpc.cliente_id')
      .select('cpc.*', 'c.nombre as cliente_nombre', 'c.telefono as cliente_telefono');

    if (estado) {
      query.where('cpc.estado', estado);
    } else {
      query.whereIn('cpc.estado', ['pendiente', 'parcial']);
    }

    if (vencidas) {
      const hoy = new Date().toISOString().split('T')[0];
      query.where('cpc.fecha_vencimiento', '<', hoy);
    }

    query.orderBy('cpc.fecha_vencimiento', 'ASC');

    const rows = await query;

    const cuentas = rows.map((row) => ({
      ...row,
      saldo: row.monto - row.monto_pagado,
    }));

    const totales = cuentas.reduce(
      (acc, cuenta) => ({
        monto: acc.monto + cuenta.monto,
        montoPagado: acc.montoPagado + cuenta.monto_pagado,
        saldo: acc.saldo + cuenta.saldo,
      }),
      { monto: 0, montoPagado: 0, saldo: 0 }
    );

    return { cuentas, totales, total: cuentas.length };
  }

  /**
   * Obtiene un listado de cuentas por pagar.
   * @param {string} estado - Filtra por estado (e.g., 'pendiente', 'parcial').
   * @param {boolean} vencidas - Si es true, filtra solo las vencidas.
   * @returns {Promise<object>} Objeto con la lista de cuentas y totales.
   */
  async getCuentasPorPagar(estado, vencidas) {
    let query = this.db('cuentas_por_pagar as cpp')
      .leftJoin('proveedores as p', 'p.id', 'cpp.proveedor_id')
      .select('cpp.*', 'p.nombre as proveedor_nombre', 'p.telefono as proveedor_telefono');

    if (estado) {
      query.where('cpp.estado', estado);
    } else {
      query.whereIn('cpp.estado', ['pendiente', 'parcial']);
    }

    if (vencidas) {
      const hoy = new Date().toISOString().split('T')[0];
      query.where('cpp.fecha_vencimiento', '<', hoy);
    }

    query.orderBy('cpp.fecha_vencimiento', 'ASC');

    const rows = await query;

    const cuentas = rows.map((row) => ({
      ...row,
      saldo: row.monto - row.monto_pagado,
    }));

    const totales = cuentas.reduce(
      (acc, cuenta) => ({
        monto: acc.monto + cuenta.monto,
        montoPagado: acc.montoPagado + cuenta.monto_pagado,
        saldo: acc.saldo + cuenta.saldo,
      }),
      { monto: 0, montoPagado: 0, saldo: 0 }
    );

    return { cuentas, totales, total: cuentas.length };
  }
}

module.exports = FinanzasService;
