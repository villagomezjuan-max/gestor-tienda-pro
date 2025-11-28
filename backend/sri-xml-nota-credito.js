/**
 * Generador de XML para Notas de Crédito - SRI Ecuador
 * Esquema: NotaCredito_V1.1.0.xsd
 */

const { create } = require('xmlbuilder2');

/**
 * Calcula el dígito verificador usando módulo 11
 */
function calcularDigitoVerificador(claveAcceso) {
  const digitos = claveAcceso.split('').map(Number);
  let suma = 0;
  let factor = 2;

  for (let i = digitos.length - 1; i >= 0; i--) {
    suma += digitos[i] * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const residuo = suma % 11;
  const resultado = 11 - residuo;

  if (resultado === 11) return 0;
  if (resultado === 10) return 1;
  return resultado;
}

/**
 * Genera la clave de acceso de 49 dígitos
 */
function generarClaveAcceso(datos) {
  const { fecha, tipoComprobante, ruc, ambiente, establecimiento, puntoEmision, secuencial } =
    datos;

  // Formato fecha: ddmmyyyy
  const [dia, mes, anio] = fecha.split('/');
  const fechaFormato = `${dia}${mes}${anio}`;

  // Tipo de comprobante: 04 = Nota de Crédito
  const tipo = tipoComprobante || '04';

  // RUC del emisor (13 dígitos)
  const rucFormato = ruc.padStart(13, '0');

  // Ambiente: 1=Pruebas, 2=Producción
  const amb = ambiente || '1';

  // Serie (establecimiento + punto emisión): 6 dígitos
  const serie = `${establecimiento.padStart(3, '0')}${puntoEmision.padStart(3, '0')}`;

  // Secuencial: 9 dígitos
  const secuencialFormato = secuencial.toString().padStart(9, '0');

  // Código numérico: 8 dígitos aleatorios
  const codigoNumerico = Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, '0');

  // Tipo emisión: 1=Normal
  const tipoEmision = '1';

  // Construir clave sin dígito verificador (48 dígitos)
  const claveParcial = `${fechaFormato}${tipo}${rucFormato}${amb}${serie}${secuencialFormato}${codigoNumerico}${tipoEmision}`;

  // Calcular dígito verificador
  const digitoVerificador = calcularDigitoVerificador(claveParcial);

  return `${claveParcial}${digitoVerificador}`;
}

/**
 * Formatea número de comprobante
 */
function formatearNumeroComprobante(establecimiento, puntoEmision, secuencial) {
  return `${establecimiento.padStart(3, '0')}-${puntoEmision.padStart(3, '0')}-${secuencial.toString().padStart(9, '0')}`;
}

/**
 * Genera XML de Nota de Crédito según esquema SRI v1.1.0
 */
function generarNotaCredito(datos) {
  const {
    // Información tributaria
    ambiente = '1',
    tipoEmision = '1',
    razonSocial,
    nombreComercial,
    ruc,
    claveAcceso: claveAccesoManual,
    codDoc = '04', // 04 = Nota de Crédito
    establecimiento = '001',
    puntoEmision = '001',
    secuencial,
    dirMatriz,

    // Información de la nota de crédito
    fechaEmision, // dd/mm/yyyy
    dirEstablecimiento,
    contribuyenteEspecial = '',
    obligadoContabilidad = 'SI',

    // Documento modificado (factura original)
    codDocModificado = '01', // 01=Factura
    numDocModificado, // 001-001-000000001
    fechaEmisionDocSustento, // dd/mm/yyyy

    // Motivo
    motivo = 'Devolución de mercadería',

    // Identificación del comprador
    tipoIdentificacionComprador = '04', // 04=RUC, 05=Cédula
    razonSocialComprador,
    identificacionComprador,

    // Totales
    totalSinImpuestos,
    totalDescuento = 0,

    // Detalles de productos/servicios
    detalles = [],

    // Información adicional
    infoAdicional = [],
  } = datos;

  // Generar clave de acceso si no se proporciona
  const claveAcceso =
    claveAccesoManual ||
    generarClaveAcceso({
      fecha: fechaEmision,
      tipoComprobante: codDoc,
      ruc,
      ambiente,
      establecimiento,
      puntoEmision,
      secuencial,
    });

  // Crear documento XML
  const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('notaCredito', {
    id: 'comprobante',
    version: '1.1.0',
  });

  // Información Tributaria
  const infoTributaria = root.ele('infoTributaria');
  infoTributaria.ele('ambiente').txt(ambiente);
  infoTributaria.ele('tipoEmision').txt(tipoEmision);
  infoTributaria.ele('razonSocial').txt(razonSocial);
  if (nombreComercial) {
    infoTributaria.ele('nombreComercial').txt(nombreComercial);
  }
  infoTributaria.ele('ruc').txt(ruc);
  infoTributaria.ele('claveAcceso').txt(claveAcceso);
  infoTributaria.ele('codDoc').txt(codDoc);
  infoTributaria.ele('estab').txt(establecimiento.padStart(3, '0'));
  infoTributaria.ele('ptoEmi').txt(puntoEmision.padStart(3, '0'));
  infoTributaria.ele('secuencial').txt(secuencial.toString().padStart(9, '0'));
  infoTributaria.ele('dirMatriz').txt(dirMatriz);

  // Información de la Nota de Crédito
  const infoNotaCredito = root.ele('infoNotaCredito');
  infoNotaCredito.ele('fechaEmision').txt(fechaEmision);
  if (dirEstablecimiento) {
    infoNotaCredito.ele('dirEstablecimiento').txt(dirEstablecimiento);
  }
  if (contribuyenteEspecial) {
    infoNotaCredito.ele('contribuyenteEspecial').txt(contribuyenteEspecial);
  }
  infoNotaCredito.ele('obligadoContabilidad').txt(obligadoContabilidad);
  infoNotaCredito.ele('tipoIdentificacionComprador').txt(tipoIdentificacionComprador);
  infoNotaCredito.ele('razonSocialComprador').txt(razonSocialComprador);
  infoNotaCredito.ele('identificacionComprador').txt(identificacionComprador);
  infoNotaCredito.ele('codDocModificado').txt(codDocModificado);
  infoNotaCredito.ele('numDocModificado').txt(numDocModificado);
  infoNotaCredito.ele('fechaEmisionDocSustento').txt(fechaEmisionDocSustento);
  infoNotaCredito.ele('totalSinImpuestos').txt(totalSinImpuestos.toFixed(2));
  infoNotaCredito.ele('valorModificacion').txt((totalSinImpuestos + totalDescuento).toFixed(2));
  infoNotaCredito.ele('moneda').txt('DOLAR');

  // Totalizar impuestos
  const totalConImpuestos = infoNotaCredito.ele('totalConImpuestos');
  const impuestosAgrupados = {};

  detalles.forEach((detalle) => {
    (detalle.impuestos || []).forEach((impuesto) => {
      const key = `${impuesto.codigo}_${impuesto.codigoPorcentaje}`;
      if (!impuestosAgrupados[key]) {
        impuestosAgrupados[key] = {
          codigo: impuesto.codigo,
          codigoPorcentaje: impuesto.codigoPorcentaje,
          tarifa: impuesto.tarifa,
          baseImponible: 0,
          valor: 0,
        };
      }
      impuestosAgrupados[key].baseImponible += impuesto.baseImponible;
      impuestosAgrupados[key].valor += impuesto.valor;
    });
  });

  Object.values(impuestosAgrupados).forEach((impuesto) => {
    const totalImpuesto = totalConImpuestos.ele('totalImpuesto');
    totalImpuesto.ele('codigo').txt(impuesto.codigo);
    totalImpuesto.ele('codigoPorcentaje').txt(impuesto.codigoPorcentaje);
    totalImpuesto.ele('baseImponible').txt(impuesto.baseImponible.toFixed(2));
    totalImpuesto.ele('valor').txt(impuesto.valor.toFixed(2));
  });

  infoNotaCredito.ele('motivo').txt(motivo);

  // Detalles
  const detallesElement = root.ele('detalles');

  detalles.forEach((detalle) => {
    const detalleElement = detallesElement.ele('detalle');

    if (detalle.codigoPrincipal) {
      detalleElement.ele('codigoPrincipal').txt(detalle.codigoPrincipal);
    }
    if (detalle.codigoAuxiliar) {
      detalleElement.ele('codigoAuxiliar').txt(detalle.codigoAuxiliar);
    }

    detalleElement.ele('descripcion').txt(detalle.descripcion);
    detalleElement.ele('cantidad').txt(detalle.cantidad.toString());
    detalleElement.ele('precioUnitario').txt(detalle.precioUnitario.toFixed(6));
    detalleElement.ele('descuento').txt((detalle.descuento || 0).toFixed(2));
    detalleElement.ele('precioTotalSinImpuesto').txt(detalle.precioTotalSinImpuesto.toFixed(2));

    // Detalles adicionales del producto
    if (detalle.detallesAdicionales && detalle.detallesAdicionales.length > 0) {
      const detallesAdicionalesElement = detalleElement.ele('detallesAdicionales');
      detalle.detallesAdicionales.forEach((det) => {
        detallesAdicionalesElement.ele('detAdicional', { nombre: det.nombre }).txt(det.valor);
      });
    }

    // Impuestos del detalle
    const impuestosElement = detalleElement.ele('impuestos');
    (detalle.impuestos || []).forEach((impuesto) => {
      const impuestoElement = impuestosElement.ele('impuesto');
      impuestoElement.ele('codigo').txt(impuesto.codigo); // 2=IVA, 3=ICE
      impuestoElement.ele('codigoPorcentaje').txt(impuesto.codigoPorcentaje);
      impuestoElement.ele('tarifa').txt(impuesto.tarifa.toString());
      impuestoElement.ele('baseImponible').txt(impuesto.baseImponible.toFixed(2));
      impuestoElement.ele('valor').txt(impuesto.valor.toFixed(2));
    });
  });

  // Información adicional
  if (infoAdicional && infoAdicional.length > 0) {
    const infoAdicionalElement = root.ele('infoAdicional');

    infoAdicional.forEach((campo) => {
      infoAdicionalElement.ele('campoAdicional', { nombre: campo.nombre }).txt(campo.valor);
    });
  }

  // Generar XML como string
  const xml = root.end({ prettyPrint: true });

  return {
    xml,
    claveAcceso,
    numeroComprobante: formatearNumeroComprobante(establecimiento, puntoEmision, secuencial),
  };
}

module.exports = {
  generarNotaCredito,
  generarClaveAcceso,
  calcularDigitoVerificador,
  formatearNumeroComprobante,
};
