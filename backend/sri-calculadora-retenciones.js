/**
 * Calculadora de Retenciones del SRI Ecuador
 * Calcula automáticamente retenciones de IVA y Renta según normativa vigente
 */

const {
  obtenerCodigoRetencion,
  obtenerCodigoIVAPorPorcentaje,
  REGLAS_RETENCION,
} = require('./sri-retenciones-data');

/**
 * Determina si un contribuyente debe retener IVA
 */
function debeRetenerIVA(contribuyente) {
  // Sector público siempre retiene
  if (contribuyente.tipo === 'SECTOR_PUBLICO') {
    return true;
  }

  // Sociedades designadas como agentes de retención
  if (contribuyente.agenteRetencion === true) {
    return true;
  }

  // Empresas emisoras de tarjetas de crédito
  if (contribuyente.tipo === 'EMISOR_TARJETAS') {
    return true;
  }

  return false;
}

/**
 * Determina si un contribuyente debe retener Renta
 */
function debeRetenerRenta(contribuyente) {
  // Todas las sociedades retienen renta
  if (contribuyente.tipoContribuyente === 'SOCIEDAD') {
    return true;
  }

  // Sector público retiene
  if (contribuyente.tipo === 'SECTOR_PUBLICO') {
    return true;
  }

  // Personas naturales obligadas a llevar contabilidad retienen
  if (
    contribuyente.tipoContribuyente === 'PERSONA_NATURAL' &&
    contribuyente.obligadoContabilidad === true
  ) {
    return true;
  }

  return false;
}

/**
 * Calcula la retención de IVA
 * @param {object} params - Parámetros de cálculo
 * @param {number} params.baseImponible - Base imponible (subtotal sin IVA)
 * @param {number} params.valorIVA - Valor del IVA
 * @param {string} params.tipoTransaccion - BIENES, SERVICIOS, HONORARIOS, ARRENDAMIENTO
 * @param {object} params.comprador - Datos del comprador (quien retiene)
 * @param {object} params.vendedor - Datos del vendedor (a quien se retiene)
 */
function calcularRetencionIVA(params) {
  const { baseImponible, valorIVA, tipoTransaccion, comprador, vendedor } = params;

  // Verificar si debe retener
  if (!debeRetenerIVA(comprador)) {
    return {
      debeRetener: false,
      motivo: 'El comprador no es agente de retención de IVA',
      valorRetencion: 0,
      porcentajeRetencion: 0,
      codigoRetencion: null,
    };
  }

  // Determinar porcentaje de retención
  let porcentajeRetencion = 0;

  if (comprador.tipo === 'SECTOR_PUBLICO') {
    // Sector público retiene 100%
    porcentajeRetencion = 100;
  } else {
    // Agentes de retención privados
    const tipoVendedor = vendedor.tipoContribuyente || 'PERSONA_NATURAL';
    const reglas = REGLAS_RETENCION.IVA.AGENTE_RETENCION;

    if (tipoVendedor === 'PERSONA_NATURAL') {
      porcentajeRetencion = reglas.A_PERSONA_NATURAL[tipoTransaccion] || 0;
    } else {
      porcentajeRetencion = reglas.A_SOCIEDAD[tipoTransaccion] || 0;
    }
  }

  // Obtener código de retención
  const codigoRetencion = obtenerCodigoIVAPorPorcentaje(porcentajeRetencion, tipoTransaccion);

  if (!codigoRetencion) {
    return {
      debeRetener: false,
      motivo: 'No se encontró código de retención válido',
      valorRetencion: 0,
      porcentajeRetencion: 0,
      codigoRetencion: null,
    };
  }

  // Calcular valor de la retención
  const valorRetencion = (valorIVA * porcentajeRetencion) / 100;

  return {
    debeRetener: true,
    valorRetencion: parseFloat(valorRetencion.toFixed(2)),
    porcentajeRetencion,
    codigoRetencion,
    baseImponible: parseFloat(baseImponible.toFixed(2)),
    valorIVA: parseFloat(valorIVA.toFixed(2)),
    tipoTransaccion,
  };
}

/**
 * Calcula la retención de Renta
 * @param {object} params - Parámetros de cálculo
 * @param {number} params.baseImponible - Base imponible (valor antes de IVA)
 * @param {string} params.codigoRetencion - Código de retención a aplicar
 * @param {object} params.comprador - Datos del comprador (quien retiene)
 * @param {object} params.vendedor - Datos del vendedor (a quien se retiene)
 */
function calcularRetencionRenta(params) {
  const { baseImponible, codigoRetencion, comprador } = params;

  // Verificar si debe retener
  if (!debeRetenerRenta(comprador)) {
    return {
      debeRetener: false,
      motivo: 'El comprador no está obligado a retener renta',
      valorRetencion: 0,
      porcentajeRetencion: 0,
      codigoRetencion: null,
    };
  }

  // Obtener información del código
  const infoRetencion = obtenerCodigoRetencion(codigoRetencion, 'RENTA');

  if (!infoRetencion || !infoRetencion.vigente) {
    return {
      debeRetener: false,
      motivo: 'Código de retención inválido o no vigente',
      valorRetencion: 0,
      porcentajeRetencion: 0,
      codigoRetencion: null,
    };
  }

  // Calcular valor de la retención
  const valorRetencion = (baseImponible * infoRetencion.porcentaje) / 100;

  return {
    debeRetener: true,
    valorRetencion: parseFloat(valorRetencion.toFixed(2)),
    porcentajeRetencion: infoRetencion.porcentaje,
    codigoRetencion: infoRetencion.codigo,
    baseImponible: parseFloat(baseImponible.toFixed(2)),
    descripcion: infoRetencion.descripcion,
  };
}

/**
 * Determina automáticamente el código de retención de renta según actividad
 */
function determinarCodigoRenta(actividad) {
  const mapeo = {
    HONORARIOS_PROFESIONALES: '303',
    SERVICIOS_PROFESIONALES: '304',
    SERVICIOS_MANO_OBRA: '307',
    ARRENDAMIENTO_INMUEBLES: '323',
    ARRENDAMIENTO_MERCANTIL: '322',
    COMPRA_BIENES: '312',
    TRANSPORTE: '311',
    PUBLICIDAD: '310',
    SEGUROS: '325',
    RENDIMIENTOS_FINANCIEROS: '327',
    PRODUCTOS_AGRICOLAS: '340',
    OTROS_SERVICIOS: '319',
    OTROS_8_PORCIENTO: '320',
  };

  return mapeo[actividad] || '319'; // Default: otros 2%
}

/**
 * Calcula todas las retenciones aplicables a una transacción
 */
function calcularRetencionesPorTransaccion(params) {
  const {
    subtotal, // Sin IVA
    valorIVA,
    tipoTransaccion, // BIENES, SERVICIOS, HONORARIOS
    actividadEconomica, // Para retención renta
    comprador,
    vendedor,
    codigoRentaManual = null, // Si se especifica código manual
  } = params;

  const resultados = {
    subtotal: parseFloat(subtotal.toFixed(2)),
    valorIVA: parseFloat(valorIVA.toFixed(2)),
    total: parseFloat((subtotal + valorIVA).toFixed(2)),
    retenciones: [],
  };

  // Calcular retención IVA
  const retencionIVA = calcularRetencionIVA({
    baseImponible: subtotal,
    valorIVA,
    tipoTransaccion,
    comprador,
    vendedor,
  });

  if (retencionIVA.debeRetener) {
    resultados.retenciones.push({
      tipo: 'IVA',
      ...retencionIVA,
    });
  }

  // Calcular retención Renta
  const codigoRenta = codigoRentaManual || determinarCodigoRenta(actividadEconomica);
  const retencionRenta = calcularRetencionRenta({
    baseImponible: subtotal,
    codigoRetencion: codigoRenta,
    comprador,
    vendedor,
  });

  if (retencionRenta.debeRetener) {
    resultados.retenciones.push({
      tipo: 'RENTA',
      ...retencionRenta,
    });
  }

  // Calcular totales
  resultados.totalRetenciones = resultados.retenciones.reduce(
    (sum, ret) => sum + ret.valorRetencion,
    0
  );
  resultados.totalRetenciones = parseFloat(resultados.totalRetenciones.toFixed(2));

  resultados.totalAPagar = parseFloat((resultados.total - resultados.totalRetenciones).toFixed(2));

  return resultados;
}

/**
 * Valida si una retención calculada es correcta
 */
function validarRetencion(retencion) {
  const errores = [];

  if (!retencion.codigoRetencion) {
    errores.push('Código de retención no especificado');
  }

  if (retencion.valorRetencion < 0) {
    errores.push('Valor de retención no puede ser negativo');
  }

  if (retencion.porcentajeRetencion < 0 || retencion.porcentajeRetencion > 100) {
    errores.push('Porcentaje de retención inválido');
  }

  if (retencion.baseImponible <= 0) {
    errores.push('Base imponible debe ser mayor a cero');
  }

  return {
    valida: errores.length === 0,
    errores,
  };
}

/**
 * Genera resumen de retenciones para comprobante
 */
function generarResumenRetenciones(retenciones) {
  const resumen = {
    totalIVA: 0,
    totalRenta: 0,
    total: 0,
    detalles: [],
  };

  retenciones.forEach((ret) => {
    if (ret.tipo === 'IVA') {
      resumen.totalIVA += ret.valorRetencion;
    } else if (ret.tipo === 'RENTA') {
      resumen.totalRenta += ret.valorRetencion;
    }

    resumen.detalles.push({
      tipo: ret.tipo,
      codigo: ret.codigoRetencion,
      porcentaje: ret.porcentajeRetencion,
      base: ret.baseImponible,
      valor: ret.valorRetencion,
    });
  });

  resumen.totalIVA = parseFloat(resumen.totalIVA.toFixed(2));
  resumen.totalRenta = parseFloat(resumen.totalRenta.toFixed(2));
  resumen.total = parseFloat((resumen.totalIVA + resumen.totalRenta).toFixed(2));

  return resumen;
}

module.exports = {
  debeRetenerIVA,
  debeRetenerRenta,
  calcularRetencionIVA,
  calcularRetencionRenta,
  calcularRetencionesPorTransaccion,
  determinarCodigoRenta,
  validarRetencion,
  generarResumenRetenciones,
};
