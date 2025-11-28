/**
 * GENERADOR DE ANEXO TRANSACCIONAL SIMPLIFICADO (ATS) - SRI ECUADOR
 *
 * Genera reporte mensual obligatorio según esquema ATS v3.0
 * Incluye compras, ventas, retenciones y anulados
 *
 * OBLIGATORIO PARA: Todos los contribuyentes con actividad económica
 * FRECUENCIA: Mensual (hasta el 28 del mes siguiente)
 * MULTA: $30 - $1,500 por cada mes no presentado
 *
 * Implementación: 2025-11-18
 * Esquema: http://www.sri.gob.ec/DocumentXML/ats/ats.xsd
 */

const { create } = require('xmlbuilder2');

/**
 * CODIFICAR RUC PARA EL ATS
 * Formato: RUC + verificador calculado
 * @param {string} ruc - RUC del contribuyente
 * @returns {string} RUC codificado
 */
function codificarRUC(ruc) {
  if (!ruc || ruc.length !== 13) {
    throw new Error('RUC inválido');
  }
  return ruc;
}

/**
 * GENERAR ATS (ANEXO TRANSACCIONAL SIMPLIFICADO)
 * @param {object} datos - Datos del mes para el ATS
 * @returns {object} { xml, nombreArchivo, resumen }
 */
function generarATS(datos) {
  const {
    // Identificación del declarante
    ruc,
    razonSocial,

    // Período fiscal
    anio, // 2025
    mes, // 01-12

    // Número de resolución NAC (si aplica)
    numEstabRuc = '001', // Número de establecimientos registrados en RUC
    totalVentas = 0,
    codigosNoObjIva = null,

    // Datos del periodo
    compras = [],
    ventas = [],
    ventasEstablecimiento = [],
    exportaciones = [],
    facturasAnuladas = [],

    // Retenciones
    comprasEstablecimiento = [],
    retencionesRecibidas = [],

    // Rendimientos financieros
    rendFinancieros = [],

    // Comprobantes electrónicos
    autorizaciones = [],
  } = datos;

  // Construir XML según esquema ATS v3.0
  const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele('iva', {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:schemaLocation': 'http://www.sri.gob.ec/DocumentXML/ats/ats.xsd',
  });

  // === IDENTIFICACIÓN DEL CONTRIBUYENTE ===
  const infoTributaria = doc.ele('TipoIDInformante', ruc.substring(10) === '001' ? 'R' : 'C');
  infoTributaria.ele('IdInformante').txt(codificarRUC(ruc));
  infoTributaria.ele('razonSocial').txt(razonSocial);
  infoTributaria.ele('Anio').txt(anio.toString());
  infoTributaria.ele('Mes').txt(mes.toString().padStart(2, '0'));

  if (numEstabRuc) {
    infoTributaria.ele('numEstabRuc').txt(numEstabRuc);
  }

  if (totalVentas !== undefined) {
    infoTributaria.ele('totalVentas').txt(totalVentas.toFixed(2));
  }

  if (codigosNoObjIva) {
    infoTributaria.ele('codigosNoObjIva').txt(codigosNoObjIva);
  }

  // === COMPRAS ===
  if (compras.length > 0) {
    const comprasElement = doc.ele('compras');

    compras.forEach((compra) => {
      const detalleCompra = comprasElement.ele('detalleCompras');

      detalleCompra.ele('codSustento').txt(compra.codSustento || '01'); // 01=Crédito Tributario
      detalleCompra.ele('tpIdProv').txt(compra.tpIdProv || '01'); // 01=RUC
      detalleCompra.ele('idProv').txt(compra.idProv);
      detalleCompra.ele('tipoComprobante').txt(compra.tipoComprobante || '01'); // 01=Factura
      detalleCompra.ele('parteRel').txt(compra.parteRel || 'NO');
      detalleCompra.ele('fechaRegistro').txt(compra.fechaRegistro); // DD/MM/YYYY
      detalleCompra.ele('establecimiento').txt(compra.establecimiento);
      detalleCompra.ele('puntoEmision').txt(compra.puntoEmision);
      detalleCompra.ele('secuencial').txt(compra.secuencial);
      detalleCompra.ele('fechaEmision').txt(compra.fechaEmision); // DD/MM/YYYY
      detalleCompra.ele('autorizacion').txt(compra.autorizacion || '0');
      detalleCompra.ele('baseNoGraIva').txt((compra.baseNoGraIva || 0).toFixed(2));
      detalleCompra.ele('baseImponible').txt((compra.baseImponible || 0).toFixed(2));
      detalleCompra.ele('baseImpGrav').txt((compra.baseImpGrav || 0).toFixed(2));
      detalleCompra.ele('baseImpExe').txt((compra.baseImpExe || 0).toFixed(2));
      detalleCompra.ele('montoIce').txt((compra.montoIce || 0).toFixed(2));
      detalleCompra.ele('montoIva').txt((compra.montoIva || 0).toFixed(2));

      // Valores retenidos
      if (compra.valRetBien10 !== undefined) {
        detalleCompra.ele('valRetBien10').txt(compra.valRetBien10.toFixed(2));
      }
      if (compra.valRetServ20 !== undefined) {
        detalleCompra.ele('valRetServ20').txt(compra.valRetServ20.toFixed(2));
      }
      if (compra.valorRetBienes !== undefined) {
        detalleCompra.ele('valorRetBienes').txt(compra.valorRetBienes.toFixed(2));
      }
      if (compra.valRetServ50 !== undefined) {
        detalleCompra.ele('valRetServ50').txt(compra.valRetServ50.toFixed(2));
      }
      if (compra.valorRetServicios !== undefined) {
        detalleCompra.ele('valorRetServicios').txt(compra.valorRetServicios.toFixed(2));
      }
      if (compra.valRetServ100 !== undefined) {
        detalleCompra.ele('valRetServ100').txt(compra.valRetServ100.toFixed(2));
      }

      // Retención IVA
      if (compra.valorRetIva !== undefined) {
        detalleCompra.ele('valorRetIva').txt(compra.valorRetIva.toFixed(2));
      }

      // Forma de pago
      if (compra.formaPago) {
        const formasDePago = detalleCompra.ele('formasDePago');
        compra.formaPago.forEach((fp) => {
          const formaPagoElement = formasDePago.ele('formaPago');
          formaPagoElement.ele('formaPago').txt(fp.codigo);
        });
      }

      // Detalle de air (retenciones)
      if (compra.air && compra.air.length > 0) {
        const detalleAir = detalleCompra.ele('air');

        compra.air.forEach((retencion) => {
          const airElement = detalleAir.ele('detalleAir');
          airElement.ele('codRetAir').txt(retencion.codigo);
          airElement.ele('baseImpAir').txt(retencion.base.toFixed(2));
          airElement.ele('porcentajeAir').txt(retencion.porcentaje.toFixed(2));
          airElement.ele('valRetAir').txt(retencion.valor.toFixed(2));
        });
      }
    });
  }

  // === VENTAS ===
  if (ventas.length > 0) {
    const ventasElement = doc.ele('ventas');

    ventas.forEach((venta) => {
      const detalleVenta = ventasElement.ele('detalleVentas');

      detalleVenta.ele('tpIdCliente').txt(venta.tpIdCliente || '04'); // 04=RUC, 05=Cedula, 07=Consumidor Final
      detalleVenta.ele('idCliente').txt(venta.idCliente);
      detalleVenta.ele('parteRelVtas').txt(venta.parteRel || 'NO');
      detalleVenta.ele('tipoComprobante').txt(venta.tipoComprobante || '01'); // 01=Factura
      detalleVenta.ele('tipoEmision').txt(venta.tipoEmision || 'E'); // E=Electrónica, F=Física
      detalleVenta.ele('numeroComprobantes').txt(venta.numeroComprobantes || '1');
      detalleVenta.ele('baseNoGraIva').txt((venta.baseNoGraIva || 0).toFixed(2));
      detalleVenta.ele('baseImponible').txt((venta.baseImponible || 0).toFixed(2));
      detalleVenta.ele('baseImpGrav').txt((venta.baseImpGrav || 0).toFixed(2));
      detalleVenta.ele('montoIva').txt((venta.montoIva || 0).toFixed(2));
      detalleVenta.ele('montoIce').txt((venta.montoIce || 0).toFixed(2));
      detalleVenta.ele('valorRetIva').txt((venta.valorRetIva || 0).toFixed(2));
      detalleVenta.ele('valorRetRenta').txt((venta.valorRetRenta || 0).toFixed(2));

      // Formas de cobro
      if (venta.formasCobro && venta.formasCobro.length > 0) {
        const formasDePago = detalleVenta.ele('formasDePago');
        venta.formasCobro.forEach((fp) => {
          const formaPagoElement = formasDePago.ele('formaPago');
          formaPagoElement.ele('formaPago').txt(fp.codigo);
          formaPagoElement.ele('total').txt(fp.total.toFixed(2));
        });
      }
    });
  }

  // === VENTAS POR ESTABLECIMIENTO ===
  if (ventasEstablecimiento.length > 0) {
    const ventasEstElement = doc.ele('ventasEstablecimiento');

    ventasEstablecimiento.forEach((ve) => {
      const ventaEst = ventasEstElement.ele('ventaEst');
      ventaEst.ele('codEstab').txt(ve.establecimiento);
      ventaEst.ele('ventasEstab').txt(ve.totalVentas.toFixed(2));
      ventaEst.ele('ivaComp').txt(ve.ivaCompensado.toFixed(2));
    });
  }

  // === ANULADOS ===
  if (facturasAnuladas.length > 0) {
    const anuladosElement = doc.ele('anulados');

    facturasAnuladas.forEach((anulado) => {
      const detalleAnulado = anuladosElement.ele('detalleAnulados');
      detalleAnulado.ele('tipoComprobante').txt(anulado.tipoComprobante);
      detalleAnulado.ele('establecimiento').txt(anulado.establecimiento);
      detalleAnulado.ele('puntoEmision').txt(anulado.puntoEmision);
      detalleAnulado.ele('secuencialInicio').txt(anulado.secuencialInicio);
      detalleAnulado.ele('secuencialFin').txt(anulado.secuencialFin);
      detalleAnulado.ele('autorizacion').txt(anulado.autorizacion || '0');
    });
  }

  // Convertir a string
  const xml = doc.end({ prettyPrint: true });

  // Generar nombre de archivo según SRI
  // Formato: [RUC]AT[AAAAMM].xml
  const nombreArchivo = `${ruc}AT${anio}${mes.toString().padStart(2, '0')}.xml`;

  // Calcular resumen
  const resumen = {
    totalCompras: compras.length,
    totalVentas: ventas.length,
    totalAnulados: facturasAnuladas.length,
    montoTotalCompras: compras.reduce((sum, c) => sum + (c.importeTotal || 0), 0),
    montoTotalVentas: ventas.reduce((sum, v) => sum + (v.baseImpGrav || 0) + (v.montoIva || 0), 0),
    ivaCompras: compras.reduce((sum, c) => sum + (c.montoIva || 0), 0),
    ivaVentas: ventas.reduce((sum, v) => sum + (v.montoIva || 0), 0),
    retencionesEfectuadas: compras.reduce(
      (sum, c) => sum + (c.valorRetIva || 0) + (c.valorRetBienes || 0) + (c.valorRetServicios || 0),
      0
    ),
    retencionesRecibidas: ventas.reduce(
      (sum, v) => sum + (v.valorRetIva || 0) + (v.valorRetRenta || 0),
      0
    ),
  };

  return {
    xml,
    nombreArchivo,
    resumen,
    periodo: `${mes.toString().padStart(2, '0')}/${anio}`,
  };
}

/**
 * VALIDAR DATOS PARA ATS
 * @param {object} datos - Datos a validar
 * @returns {object} { valido: boolean, errores: string[] }
 */
function validarDatosATS(datos) {
  const errores = [];

  // Validar RUC
  if (!datos.ruc || datos.ruc.length !== 13) {
    errores.push('RUC inválido (debe tener 13 dígitos)');
  }

  // Validar razón social
  if (!datos.razonSocial || datos.razonSocial.length < 3) {
    errores.push('Razón social requerida');
  }

  // Validar período
  if (!datos.anio || datos.anio < 2000 || datos.anio > 2100) {
    errores.push('Año inválido');
  }

  if (!datos.mes || datos.mes < 1 || datos.mes > 12) {
    errores.push('Mes inválido (1-12)');
  }

  // Validar que haya al menos alguna transacción
  const tieneCompras = datos.compras && datos.compras.length > 0;
  const tieneVentas = datos.ventas && datos.ventas.length > 0;

  if (!tieneCompras && !tieneVentas) {
    errores.push('Debe incluir al menos compras o ventas');
  }

  // Validar estructura de compras
  if (datos.compras) {
    datos.compras.forEach((compra, idx) => {
      if (!compra.idProv) {
        errores.push(`Compra ${idx + 1}: ID proveedor requerido`);
      }

      if (!compra.fechaEmision) {
        errores.push(`Compra ${idx + 1}: Fecha de emisión requerida`);
      }

      if (!compra.establecimiento || compra.establecimiento.length !== 3) {
        errores.push(`Compra ${idx + 1}: Establecimiento inválido (3 dígitos)`);
      }

      if (!compra.puntoEmision || compra.puntoEmision.length !== 3) {
        errores.push(`Compra ${idx + 1}: Punto de emisión inválido (3 dígitos)`);
      }

      if (!compra.secuencial || compra.secuencial.length < 1) {
        errores.push(`Compra ${idx + 1}: Secuencial requerido`);
      }
    });
  }

  // Validar estructura de ventas
  if (datos.ventas) {
    datos.ventas.forEach((venta, idx) => {
      if (!venta.idCliente) {
        errores.push(`Venta ${idx + 1}: ID cliente requerido`);
      }

      if (!venta.numeroComprobantes || venta.numeroComprobantes < 1) {
        errores.push(`Venta ${idx + 1}: Número de comprobantes inválido`);
      }
    });
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}

/**
 * GENERAR ATS DESDE BASE DE DATOS
 * Función auxiliar que recopila datos de diferentes módulos
 * @param {object} opciones - { ruc, razonSocial, anio, mes, obtenerCompras, obtenerVentas, obtenerAnulados }
 * @returns {Promise<object>} Resultado de generarATS()
 */
async function generarATSDesdeDB(opciones) {
  const { ruc, razonSocial, anio, mes, obtenerCompras, obtenerVentas, obtenerAnulados } = opciones;

  // Obtener datos de los diferentes módulos
  const compras = obtenerCompras ? await obtenerCompras(anio, mes) : [];
  const ventas = obtenerVentas ? await obtenerVentas(anio, mes) : [];
  const facturasAnuladas = obtenerAnulados ? await obtenerAnulados(anio, mes) : [];

  // Generar ATS
  return generarATS({
    ruc,
    razonSocial,
    anio,
    mes,
    compras,
    ventas,
    facturasAnuladas,
  });
}

module.exports = {
  generarATS,
  validarDatosATS,
  generarATSDesdeDB,
  codificarRUC,
};
