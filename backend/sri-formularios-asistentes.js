/**
 * ASISTENTES PARA FORMULARIOS 103 Y 104 DEL SRI
 *
 * Formulario 103: Retenciones en la Fuente del Impuesto a la Renta
 * Formulario 104: Impuesto al Valor Agregado (IVA)
 *
 * Estos asistentes ayudan a precarga datos desde el sistema
 * para facilitar la declaración mensual en línea del SRI
 *
 * Implementación: 2025-11-18
 */

/**
 * GENERAR DATOS PARA FORMULARIO 103 (RETENCIONES IR)
 * @param {object} opciones - { anio, mes, obtenerRetenciones }
 * @returns {Promise<object>} Datos estructurados para el formulario 103
 */
async function generarDatosFormulario103(opciones) {
  const { anio, mes, obtenerRetenciones } = opciones;

  // Obtener todas las retenciones del mes
  const retenciones = obtenerRetenciones ? await obtenerRetenciones(anio, mes) : [];

  // Agrupar por código de retención
  const retencionesAgrupadas = {};
  let totalRetenido = 0;

  retenciones.forEach((retencion) => {
    const codigo = retencion.codigoRetencion;

    if (!retencionesAgrupadas[codigo]) {
      retencionesAgrupadas[codigo] = {
        codigo,
        descripcion: retencion.descripcionRetencion,
        baseImponible: 0,
        valorRetenido: 0,
        cantidad: 0,
      };
    }

    retencionesAgrupadas[codigo].baseImponible += retencion.baseImponible || 0;
    retencionesAgrupadas[codigo].valorRetenido += retencion.valorRetenido || 0;
    retencionesAgrupadas[codigo].cantidad++;

    totalRetenido += retencion.valorRetenido || 0;
  });

  // Convertir a array y ordenar
  const detalle = Object.values(retencionesAgrupadas).sort(
    (a, b) => parseInt(a.codigo) - parseInt(b.codigo)
  );

  return {
    periodo: `${mes.toString().padStart(2, '0')}/${anio}`,
    totalRetenciones: retenciones.length,
    totalRetenido,
    detallePorCodigo: detalle,
    resumen: {
      casilla302: totalRetenido, // Total retenciones efectuadas
      // Otros campos según necesidad
    },
    archivo: `form103_${anio}${mes.toString().padStart(2, '0')}.json`,
  };
}

/**
 * GENERAR DATOS PARA FORMULARIO 104 (IVA)
 * @param {object} opciones - { anio, mes, obtenerVentas, obtenerCompras }
 * @returns {Promise<object>} Datos estructurados para el formulario 104
 */
async function generarDatosFormulario104(opciones) {
  const { anio, mes, obtenerVentas, obtenerCompras } = opciones;

  // Obtener ventas y compras del mes
  const ventas = obtenerVentas ? await obtenerVentas(anio, mes) : [];
  const compras = obtenerCompras ? await obtenerCompras(anio, mes) : [];

  // === CALCULAR VENTAS ===
  let ventasTarifa0 = 0;
  let ventasTarifa12 = 0;
  let ventasTarifa15 = 0;
  let ivaVentas12 = 0;
  let ivaVentas15 = 0;

  ventas.forEach((venta) => {
    if (venta.tarifaIVA === 0) {
      ventasTarifa0 += venta.subtotal || 0;
    } else if (venta.tarifaIVA === 12) {
      ventasTarifa12 += venta.subtotal || 0;
      ivaVentas12 += venta.iva || 0;
    } else if (venta.tarifaIVA === 15) {
      ventasTarifa15 += venta.subtotal || 0;
      ivaVentas15 += venta.iva || 0;
    }
  });

  // === CALCULAR COMPRAS ===
  let comprasTarifa0 = 0;
  let comprasTarifa12 = 0;
  let comprasTarifa15 = 0;
  let ivaCompras12 = 0;
  let ivaCompras15 = 0;

  compras.forEach((compra) => {
    if (compra.tarifaIVA === 0) {
      comprasTarifa0 += compra.subtotal || 0;
    } else if (compra.tarifaIVA === 12) {
      comprasTarifa12 += compra.subtotal || 0;
      ivaCompras12 += compra.iva || 0;
    } else if (compra.tarifaIVA === 15) {
      comprasTarifa15 += compra.subtotal || 0;
      ivaCompras15 += compra.iva || 0;
    }
  });

  // === CALCULAR CRÉDITO TRIBUTARIO ===
  // IVA de compras es crédito tributario (puede compensar IVA de ventas)
  const creditoTributario = ivaCompras12 + ivaCompras15;
  const ivaVentas = ivaVentas12 + ivaVentas15;
  const ivaCausado = ivaVentas - creditoTributario;
  const ivaPagar = Math.max(0, ivaCausado); // Si es negativo, es crédito a favor

  return {
    periodo: `${mes.toString().padStart(2, '0')}/${anio}`,

    // VENTAS (Casillas 4xx)
    ventas: {
      tarifa0: ventasTarifa0,
      tarifa12: ventasTarifa12,
      tarifa15: ventasTarifa15,
      totalVentas: ventasTarifa0 + ventasTarifa12 + ventasTarifa15,
      ivaVentas12,
      ivaVentas15,
      totalIvaVentas: ivaVentas12 + ivaVentas15,
    },

    // COMPRAS (Casillas 5xx)
    compras: {
      tarifa0: comprasTarifa0,
      tarifa12: comprasTarifa12,
      tarifa15: comprasTarifa15,
      totalCompras: comprasTarifa0 + comprasTarifa12 + comprasTarifa15,
      ivaCompras12,
      ivaCompras15,
      totalIvaCompras: ivaCompras12 + ivaCompras15,
    },

    // RESUMEN (Casillas 6xx)
    resumen: {
      creditoTributario,
      ivaCausado,
      ivaPagar,
      estadoCredito: ivaCausado < 0 ? 'favor' : 'pagar',
    },

    // CASILLAS DEL FORMULARIO 104
    casillas: {
      // VENTAS
      401: ventasTarifa0, // Ventas tarifa 0%
      411: ventasTarifa12, // Ventas tarifa 12%
      421: ventasTarifa15, // Ventas tarifa 15%
      499: ventasTarifa0 + ventasTarifa12 + ventasTarifa15, // Total ventas

      // IVA VENTAS
      413: ivaVentas12, // IVA ventas 12%
      423: ivaVentas15, // IVA ventas 15%
      497: ivaVentas12 + ivaVentas15, // Total IVA ventas

      // COMPRAS
      501: comprasTarifa0, // Compras tarifa 0%
      511: comprasTarifa12, // Compras tarifa 12%
      521: comprasTarifa15, // Compras tarifa 15%
      599: comprasTarifa0 + comprasTarifa12 + comprasTarifa15, // Total compras

      // IVA COMPRAS (CRÉDITO TRIBUTARIO)
      513: ivaCompras12, // Crédito IVA 12%
      523: ivaCompras15, // Crédito IVA 15%
      609: creditoTributario, // Total crédito tributario

      // RESUMEN
      699: ivaCausado, // IVA causado
      799: ivaPagar, // IVA a pagar
    },

    archivo: `form104_${anio}${mes.toString().padStart(2, '0')}.json`,
  };
}

/**
 * EXPORTAR DATOS A JSON PARA IMPORTACIÓN MANUAL EN SRI
 * @param {object} datos - Datos del formulario
 * @param {string} tipo - '103' o '104'
 * @returns {string} JSON formateado
 */
function exportarParaSRI(datos, tipo) {
  const exportacion = {
    sistema: 'Gestor Tienda Pro',
    fechaExportacion: new Date().toISOString(),
    tipoFormulario: tipo,
    periodo: datos.periodo,
    datos:
      tipo === '103'
        ? {
            retenciones: datos.detallePorCodigo,
            resumen: datos.resumen,
          }
        : {
            ventas: datos.ventas,
            compras: datos.compras,
            casillas: datos.casillas,
            resumen: datos.resumen,
          },
    instrucciones:
      tipo === '103'
        ? 'Ingrese estos valores en el Formulario 103 en línea del SRI (www.sri.gob.ec)'
        : 'Ingrese estos valores en el Formulario 104 en línea del SRI (www.sri.gob.ec)',
  };

  return JSON.stringify(exportacion, null, 2);
}

/**
 * VALIDAR PERÍODO FISCAL
 * @param {number} anio - Año fiscal
 * @param {number} mes - Mes fiscal (1-12)
 * @returns {object} { valido: boolean, mensaje: string }
 */
function validarPeriodoFiscal(anio, mes) {
  const ahora = new Date();
  const anioActual = ahora.getFullYear();
  const mesActual = ahora.getMonth() + 1;

  if (anio < 2000 || anio > anioActual + 1) {
    return { valido: false, mensaje: 'Año inválido' };
  }

  if (mes < 1 || mes > 12) {
    return { valido: false, mensaje: 'Mes inválido (1-12)' };
  }

  // No permitir períodos futuros más de 1 mes adelante
  if (anio === anioActual && mes > mesActual + 1) {
    return { valido: false, mensaje: 'No se puede generar para períodos muy futuros' };
  }

  if (anio > anioActual) {
    return { valido: false, mensaje: 'No se puede generar para años futuros' };
  }

  return { valido: true, mensaje: 'Período válido' };
}

/**
 * CALCULAR FECHA LÍMITE DE PRESENTACIÓN
 * Según el 9no dígito del RUC
 * @param {string} ruc - RUC del contribuyente
 * @param {number} mes - Mes a declarar
 * @param {number} anio - Año a declarar
 * @returns {object} { fecha: Date, dias: number }
 */
function calcularFechaLimite(ruc, mes, anio) {
  if (!ruc || ruc.length !== 13) {
    throw new Error('RUC inválido');
  }

  const novenoDigito = parseInt(ruc[8]);

  // Tabla de fechas según 9no dígito del RUC
  const diasPresentacion = {
    1: 10,
    2: 12,
    3: 14,
    4: 16,
    5: 18,
    6: 20,
    7: 22,
    8: 24,
    9: 26,
    0: 28,
  };

  const dia = diasPresentacion[novenoDigito] || 28;

  // El siguiente mes
  let mesPresentacion = mes + 1;
  let anioPresentacion = anio;

  if (mesPresentacion > 12) {
    mesPresentacion = 1;
    anioPresentacion++;
  }

  const fechaLimite = new Date(anioPresentacion, mesPresentacion - 1, dia);

  // Calcular días restantes
  const ahora = new Date();
  const diasRestantes = Math.floor((fechaLimite - ahora) / (1000 * 60 * 60 * 24));

  return {
    fecha: fechaLimite,
    dias: diasRestantes,
    urgente: diasRestantes <= 5,
    vencido: diasRestantes < 0,
  };
}

module.exports = {
  generarDatosFormulario103,
  generarDatosFormulario104,
  exportarParaSRI,
  validarPeriodoFiscal,
  calcularFechaLimite,
};
