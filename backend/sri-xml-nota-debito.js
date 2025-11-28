/**
 * Generador de XML para Notas de Débito - SRI Ecuador
 * Esquema: NotaDebito_V1.0.0.xsd
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

  // Tipo de comprobante: 05 = Nota de Débito
  const tipo = tipoComprobante || '05';

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
 * Genera XML de Nota de Débito según esquema SRI v1.0.0
 */
function generarNotaDebito(datos) {
  const {
    // Información tributaria
    ambiente = '1',
    tipoEmision = '1',
    razonSocial,
    nombreComercial,
    ruc,
    claveAcceso: claveAccesoManual,
    codDoc = '05', // 05 = Nota de Débito
    establecimiento = '001',
    puntoEmision = '001',
    secuencial,
    dirMatriz,

    // Información de la nota de débito
    fechaEmision, // dd/mm/yyyy
    dirEstablecimiento,
    contribuyenteEspecial = '',
    obligadoContabilidad = 'SI',

    // Documento modificado (factura original)
    codDocModificado = '01', // 01=Factura
    numDocModificado, // 001-001-000000001
    fechaEmisionDocSustento, // dd/mm/yyyy

    // Identificación del comprador
    tipoIdentificacionComprador = '04', // 04=RUC, 05=Cédula
    razonSocialComprador,
    identificacionComprador,

    // Totales
    totalSinImpuestos,

    // Motivos (una nota de débito puede tener varios motivos)
    motivos = [],

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
  const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('notaDebito', {
    id: 'comprobante',
    version: '1.0.0',
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

  // Información de la Nota de Débito
  const infoNotaDebito = root.ele('infoNotaDebito');
  infoNotaDebito.ele('fechaEmision').txt(fechaEmision);
  if (dirEstablecimiento) {
    infoNotaDebito.ele('dirEstablecimiento').txt(dirEstablecimiento);
  }
  if (contribuyenteEspecial) {
    infoNotaDebito.ele('contribuyenteEspecial').txt(contribuyenteEspecial);
  }
  infoNotaDebito.ele('obligadoContabilidad').txt(obligadoContabilidad);
  infoNotaDebito.ele('tipoIdentificacionComprador').txt(tipoIdentificacionComprador);
  infoNotaDebito.ele('razonSocialComprador').txt(razonSocialComprador);
  infoNotaDebito.ele('identificacionComprador').txt(identificacionComprador);
  infoNotaDebito.ele('codDocModificado').txt(codDocModificado);
  infoNotaDebito.ele('numDocModificado').txt(numDocModificado);
  infoNotaDebito.ele('fechaEmisionDocSustento').txt(fechaEmisionDocSustento);

  // Totalizar impuestos de todos los motivos
  const impuestosAgrupados = {};

  motivos.forEach((motivo) => {
    (motivo.impuestos || []).forEach((impuesto) => {
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

  infoNotaDebito.ele('totalSinImpuestos').txt(totalSinImpuestos.toFixed(2));

  // Total con impuestos
  const totalConImpuestos = infoNotaDebito.ele('totalConImpuestos');

  Object.values(impuestosAgrupados).forEach((impuesto) => {
    const totalImpuesto = totalConImpuestos.ele('totalImpuesto');
    totalImpuesto.ele('codigo').txt(impuesto.codigo);
    totalImpuesto.ele('codigoPorcentaje').txt(impuesto.codigoPorcentaje);
    totalImpuesto.ele('baseImponible').txt(impuesto.baseImponible.toFixed(2));
    totalImpuesto.ele('valor').txt(impuesto.valor.toFixed(2));
  });

  const totalImpuestos = Object.values(impuestosAgrupados).reduce((sum, imp) => sum + imp.valor, 0);
  infoNotaDebito.ele('valorTotal').txt((totalSinImpuestos + totalImpuestos).toFixed(2));

  // Motivos
  const motivosElement = root.ele('motivos');

  motivos.forEach((motivo) => {
    const motivoElement = motivosElement.ele('motivo');
    motivoElement.ele('razon').txt(motivo.razon);
    motivoElement.ele('valor').txt(motivo.valor.toFixed(2));
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
  generarNotaDebito,
  generarClaveAcceso,
  calcularDigitoVerificador,
  formatearNumeroComprobante,
};
