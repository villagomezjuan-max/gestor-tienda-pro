/**
 * Generador de XML para Comprobantes de Retención - SRI Ecuador
 * Esquema: ComprobanteRetencion_V2.1.0.xsd
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

  // Tipo de comprobante: 07 = Comprobante de Retención
  const tipo = tipoComprobante || '07';

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
 * Genera XML de Comprobante de Retención según esquema SRI v2.1.0
 */
function generarComprobanteRetencion(datos) {
  const {
    // Información tributaria
    ambiente = '1', // 1=Pruebas, 2=Producción
    tipoEmision = '1', // 1=Normal
    razonSocial,
    nombreComercial,
    ruc,
    claveAcceso: claveAccesoManual,
    codDoc = '07', // 07 = Comprobante de Retención
    establecimiento = '001',
    puntoEmision = '001',
    secuencial,
    dirMatriz,

    // Información del comprobante
    fechaEmision, // dd/mm/yyyy
    dirEstablecimiento,
    contribuyenteEspecial = '',
    obligadoContabilidad = 'SI',

    // Información del sujeto retenido
    tipoIdentificacionSujetoRetenido = '04', // 04=RUC, 05=Cédula, 06=Pasaporte
    razonSocialSujetoRetenido,
    identificacionSujetoRetenido,
    periodoFiscal, // MM/YYYY

    // Docto Sustento (factura u otro comprobante que se retiene)
    docsSustento = [], // Array de documentos sustento
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
  const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('comprobanteRetencion', {
    id: 'comprobante',
    version: '2.0.0',
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

  // Información del Comprobante de Retención
  const infoCompRetencion = root.ele('infoCompRetencion');
  infoCompRetencion.ele('fechaEmision').txt(fechaEmision);
  if (dirEstablecimiento) {
    infoCompRetencion.ele('dirEstablecimiento').txt(dirEstablecimiento);
  }
  if (contribuyenteEspecial) {
    infoCompRetencion.ele('contribuyenteEspecial').txt(contribuyenteEspecial);
  }
  infoCompRetencion.ele('obligadoContabilidad').txt(obligadoContabilidad);
  infoCompRetencion.ele('tipoIdentificacionSujetoRetenido').txt(tipoIdentificacionSujetoRetenido);
  infoCompRetencion.ele('razonSocialSujetoRetenido').txt(razonSocialSujetoRetenido);
  infoCompRetencion.ele('identificacionSujetoRetenido').txt(identificacionSujetoRetenido);
  infoCompRetencion.ele('periodoFiscal').txt(periodoFiscal);

  // Documentos Sustento (facturas que se retienen)
  const doctosSustento = root.ele('docsSustento');

  docsSustento.forEach((docSustento) => {
    const docSustentoElement = doctosSustento.ele('docSustento');

    docSustentoElement.ele('codSustento').txt(docSustento.codSustento); // 01=Factura, etc
    docSustentoElement.ele('codDocSustento').txt(docSustento.codDocSustento); // 01=Factura
    docSustentoElement.ele('numDocSustento').txt(docSustento.numDocSustento); // 001-001-000000001
    docSustentoElement.ele('fechaEmisionDocSustento').txt(docSustento.fechaEmisionDocSustento); // dd/mm/yyyy

    if (docSustento.fechaRegistroContable) {
      docSustentoElement.ele('fechaRegistroContable').txt(docSustento.fechaRegistroContable);
    }

    if (docSustento.numAutDocSustento) {
      docSustentoElement.ele('numAutDocSustento').txt(docSustento.numAutDocSustento);
    }

    if (docSustento.pagoLocExt) {
      docSustentoElement.ele('pagoLocExt').txt(docSustento.pagoLocExt); // 01=Local, 02=Exterior
    }

    if (docSustento.tipoRegi) {
      docSustentoElement.ele('tipoRegi').txt(docSustento.tipoRegi);
    }

    if (docSustento.paisEfecPago && docSustento.pagoLocExt === '02') {
      docSustentoElement.ele('paisEfecPago').txt(docSustento.paisEfecPago);
    }

    if (docSustento.aplicConvDobTrib && docSustento.pagoLocExt === '02') {
      docSustentoElement.ele('aplicConvDobTrib').txt(docSustento.aplicConvDobTrib);
    }

    if (docSustento.pagExtSujRetNorLeg && docSustento.pagoLocExt === '02') {
      docSustentoElement.ele('pagExtSujRetNorLeg').txt(docSustento.pagExtSujRetNorLeg);
    }

    docSustentoElement.ele('totalSinImpuestos').txt(docSustento.totalSinImpuestos.toFixed(2));
    docSustentoElement.ele('importeTotal').txt(docSustento.importeTotal.toFixed(2));

    // Impuestos del documento sustento
    const impuestosDocSustento = docSustentoElement.ele('impuestosDocSustento');

    (docSustento.impuestos || []).forEach((impuesto) => {
      const impuestoDocSustentoElement = impuestosDocSustento.ele('impuestoDocSustento');
      impuestoDocSustentoElement.ele('codImpuestoDocSustento').txt(impuesto.codigo); // 2=IVA
      impuestoDocSustentoElement.ele('codigoPorcentaje').txt(impuesto.codigoPorcentaje); // 0,2,3=0%,12%,14%
      impuestoDocSustentoElement.ele('baseImponible').txt(impuesto.baseImponible.toFixed(2));
      impuestoDocSustentoElement.ele('tarifa').txt(impuesto.tarifa.toString());
      impuestoDocSustentoElement.ele('valorImpuesto').txt(impuesto.valorImpuesto.toFixed(2));
    });

    // Retenciones aplicadas
    const retenciones = docSustentoElement.ele('retenciones');

    (docSustento.retenciones || []).forEach((retencion) => {
      const retencionElement = retenciones.ele('retencion');
      retencionElement.ele('codigo').txt(retencion.codigo); // 1=Renta, 2=IVA
      retencionElement.ele('codigoRetencion').txt(retencion.codigoRetencion); // 303, 725, etc
      retencionElement.ele('baseImponible').txt(retencion.baseImponible.toFixed(2));
      retencionElement.ele('porcentajeRetener').txt(retencion.porcentajeRetener.toString());
      retencionElement.ele('valorRetenido').txt(retencion.valorRetenido.toFixed(2));

      if (retencion.codDocSustento) {
        retencionElement.ele('codDocSustento').txt(retencion.codDocSustento);
      }

      if (retencion.numDocSustento) {
        retencionElement.ele('numDocSustento').txt(retencion.numDocSustento);
      }

      if (retencion.fechaEmisionDocSustento) {
        retencionElement.ele('fechaEmisionDocSustento').txt(retencion.fechaEmisionDocSustento);
      }
    });

    // Pagos (opcional)
    if (docSustento.pagos && docSustento.pagos.length > 0) {
      const pagos = docSustentoElement.ele('pagos');

      docSustento.pagos.forEach((pago) => {
        const pagoElement = pagos.ele('pago');
        pagoElement.ele('formaPago').txt(pago.formaPago); // 01=SIN UTILIZACION, 19=TARJETA, 20=OTROS
        pagoElement.ele('total').txt(pago.total.toFixed(2));

        if (pago.plazo) {
          pagoElement.ele('plazo').txt(pago.plazo);
        }
        if (pago.unidadTiempo) {
          pagoElement.ele('unidadTiempo').txt(pago.unidadTiempo);
        }
      });
    }
  });

  // Información adicional (opcional)
  if (datos.infoAdicional && datos.infoAdicional.length > 0) {
    const infoAdicional = root.ele('infoAdicional');

    datos.infoAdicional.forEach((campo) => {
      infoAdicional.ele('campoAdicional', { nombre: campo.nombre }).txt(campo.valor);
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
  generarComprobanteRetencion,
  generarClaveAcceso,
  calcularDigitoVerificador,
  formatearNumeroComprobante,
};
