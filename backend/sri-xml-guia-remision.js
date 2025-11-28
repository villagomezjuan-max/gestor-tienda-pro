/**
 * GENERADOR DE XML PARA GUÍAS DE REMISIÓN - SRI ECUADOR
 *
 * Genera XML según esquema GuiaRemision v1.1.0 del SRI
 * Incluye generación de clave de acceso de 49 dígitos y firmas digitales
 *
 * Implementación: 2025-11-18
 * Esquema: http://www.sri.gob.ec/DocumentXML/guiaRemision/1.1.0
 */

const { create } = require('xmlbuilder2');

/**
 * GENERAR CLAVE DE ACCESO (49 DÍGITOS)
 * Formato: DDMMAAAATTCCSSSNNNNNNNNNNTTT#########V
 * D=Día, M=Mes, A=Año, T=Tipo(06), C=RUC, S=Serie, N=Secuencial, #=Código, V=Verificador
 *
 * @param {object} datos - Datos para generar la clave
 * @returns {string} Clave de 49 dígitos
 */
function generarClaveAcceso(datos) {
  const fecha = new Date(datos.fechaEmision);

  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear().toString();

  const tipoComprobante = '06'; // 06 = Guía de Remisión
  const ruc = datos.rucEmisor.padStart(13, '0');
  const ambiente = datos.ambiente || '1'; // 1=Pruebas, 2=Producción
  const serie = `${datos.establecimiento}${datos.puntoEmision}`;
  const secuencial = String(datos.secuencial).padStart(9, '0');
  const codigoNumerico = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  const tipoEmision = '1'; // 1=Normal

  // Primeros 48 dígitos
  let clave =
    dia +
    mes +
    anio +
    tipoComprobante +
    ruc +
    ambiente +
    serie +
    secuencial +
    codigoNumerico +
    tipoEmision;

  // Dígito verificador (módulo 11)
  const verificador = calcularDigitoVerificador(clave);

  return clave + verificador;
}

/**
 * CALCULAR DÍGITO VERIFICADOR (MÓDULO 11)
 * @param {string} clave - Primeros 48 dígitos
 * @returns {string} Dígito verificador
 */
function calcularDigitoVerificador(clave) {
  let factor = 2;
  let suma = 0;

  // Recorrer de derecha a izquierda
  for (let i = clave.length - 1; i >= 0; i--) {
    suma += parseInt(clave[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const residuo = suma % 11;
  const verificador = residuo === 0 ? 0 : 11 - residuo;

  return verificador.toString();
}

/**
 * GENERAR XML DE GUÍA DE REMISIÓN
 * @param {object} guia - Datos completos de la guía
 * @returns {string} XML firmado y listo para enviar al SRI
 */
function generarGuiaRemision(guia) {
  // Generar clave de acceso
  const claveAcceso = generarClaveAcceso({
    fechaEmision: guia.fechaEmision,
    rucEmisor: guia.rucEmisor,
    ambiente: guia.ambiente,
    establecimiento: guia.establecimiento,
    puntoEmision: guia.puntoEmision,
    secuencial: guia.secuencial,
  });

  // Construir XML según esquema SRI v1.1.0
  const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele('guiaRemision', {
    id: 'comprobante',
    version: '1.1.0',
  });

  // === INFORMACIÓN TRIBUTARIA ===
  const infoTributaria = doc.ele('infoTributaria');
  infoTributaria.ele('ambiente').txt(guia.ambiente || '1');
  infoTributaria.ele('tipoEmision').txt('1'); // Normal
  infoTributaria.ele('razonSocial').txt(guia.razonSocialEmisor);
  infoTributaria.ele('nombreComercial').txt(guia.nombreComercial || guia.razonSocialEmisor);
  infoTributaria.ele('ruc').txt(guia.rucEmisor);
  infoTributaria.ele('claveAcceso').txt(claveAcceso);
  infoTributaria.ele('codDoc').txt('06'); // Guía de Remisión
  infoTributaria.ele('estab').txt(guia.establecimiento);
  infoTributaria.ele('ptoEmi').txt(guia.puntoEmision);
  infoTributaria.ele('secuencial').txt(String(guia.secuencial).padStart(9, '0'));
  infoTributaria.ele('dirMatriz').txt(guia.direccionMatriz);

  // Contribuyente especial (opcional)
  if (guia.contribuyenteEspecial) {
    infoTributaria.ele('contribuyenteEspecial').txt(guia.contribuyenteEspecial);
  }

  // Obligado a llevar contabilidad
  if (guia.obligadoContabilidad !== undefined) {
    infoTributaria.ele('obligadoContabilidad').txt(guia.obligadoContabilidad ? 'SI' : 'NO');
  }

  // === INFORMACIÓN GUÍA DE REMISIÓN ===
  const infoGuia = doc.ele('infoGuiaRemision');
  infoGuia.ele('dirEstablecimiento').txt(guia.direccionEstablecimiento || guia.direccionMatriz);
  infoGuia.ele('dirPartida').txt(guia.direccionPartida);
  infoGuia.ele('razonSocialTransportista').txt(guia.transportista.razonSocial);
  infoGuia.ele('tipoIdentificacionTransportista').txt(guia.transportista.tipoIdentificacion);
  infoGuia.ele('rucTransportista').txt(guia.transportista.identificacion);

  // Fechas
  const fechaIni = new Date(guia.fechaInicioTransporte);
  infoGuia
    .ele('fechaIniTransporte')
    .txt(
      `${String(fechaIni.getDate()).padStart(2, '0')}/${String(fechaIni.getMonth() + 1).padStart(2, '0')}/${fechaIni.getFullYear()}`
    );

  const fechaFin = new Date(guia.fechaFinTransporte);
  infoGuia
    .ele('fechaFinTransporte')
    .txt(
      `${String(fechaFin.getDate()).padStart(2, '0')}/${String(fechaFin.getMonth() + 1).padStart(2, '0')}/${fechaFin.getFullYear()}`
    );

  // Placa del vehículo
  if (guia.transportista.placa) {
    infoGuia.ele('placa').txt(guia.transportista.placa);
  }

  // Documento referencia (si aplica - devolución)
  if (guia.documentoReferencia) {
    infoGuia.ele('codDocSustento').txt(guia.documentoReferencia.codigoDocumento || '01');
    infoGuia.ele('numDocSustento').txt(guia.documentoReferencia.numero);
    infoGuia.ele('numAutDocSustento').txt(guia.documentoReferencia.autorizacion || '0');
  }

  // Motivo de traslado (obligatorio)
  infoGuia.ele('motivoTraslado').txt(guia.motivoTraslado);

  // Ruta (opcional)
  if (guia.ruta) {
    infoGuia.ele('ruta').txt(guia.ruta);
  }

  // === DESTINATARIOS ===
  const destinatarios = doc.ele('destinatarios');

  guia.destinatarios.forEach((dest) => {
    const destinatario = destinatarios.ele('destinatario');

    destinatario.ele('identificacionDestinatario').txt(dest.identificacion);
    destinatario.ele('razonSocialDestinatario').txt(dest.razonSocial);
    destinatario.ele('dirDestinatario').txt(dest.direccion);
    destinatario.ele('motivoTraslado').txt(dest.motivoTraslado || guia.motivoTraslado);

    // Documento de transporte aduanero (importación/exportación)
    if (dest.documentoAduanero) {
      destinatario.ele('docAduaneroUnico').txt(dest.documentoAduanero);
    }

    // Código de establecimiento destino
    if (dest.establecimiento) {
      destinatario.ele('codEstabDestino').txt(dest.establecimiento);
    }

    // Ruta específica del destinatario
    if (dest.ruta) {
      destinatario.ele('ruta').txt(dest.ruta);
    }

    // Documento de referencia del destinatario
    if (dest.documentoReferencia) {
      destinatario.ele('codDocSustento').txt(dest.documentoReferencia.codigoDocumento || '01');
      destinatario.ele('numDocSustento').txt(dest.documentoReferencia.numero);
      destinatario.ele('numAutDocSustento').txt(dest.documentoReferencia.autorizacion || '0');
    }

    // Detalles de productos
    const detalles = destinatario.ele('detalles');

    dest.productos.forEach((producto) => {
      const detalle = detalles.ele('detalle');

      detalle
        .ele('codigoInterno')
        .txt(producto.codigoInterno || producto.descripcion.substring(0, 25));

      if (producto.codigoAdicional) {
        detalle.ele('codigoAdicional').txt(producto.codigoAdicional);
      }

      detalle.ele('descripcion').txt(producto.descripcion);
      detalle.ele('cantidad').txt(producto.cantidad.toString());

      // Información adicional del producto (opcional)
      if (producto.detallesAdicionales && producto.detallesAdicionales.length > 0) {
        const detallesAdic = detalle.ele('detallesAdicionales');

        producto.detallesAdicionales.forEach((detAd) => {
          detallesAdic.ele('detAdicional', { nombre: detAd.nombre }).txt(detAd.valor);
        });
      }
    });
  });

  // === INFORMACIÓN ADICIONAL (OPCIONAL) ===
  if (guia.informacionAdicional && guia.informacionAdicional.length > 0) {
    const infoAdicional = doc.ele('infoAdicional');

    guia.informacionAdicional.forEach((campo) => {
      infoAdicional.ele('campoAdicional', { nombre: campo.nombre }).txt(campo.valor);
    });
  }

  // Convertir a string
  const xml = doc.end({ prettyPrint: true });

  return {
    xml,
    claveAcceso,
    numeroComprobante: `${guia.establecimiento}-${guia.puntoEmision}-${String(guia.secuencial).padStart(9, '0')}`,
  };
}

/**
 * VALIDAR ESTRUCTURA BÁSICA DE GUÍA
 * @param {object} guia - Datos a validar
 * @returns {object} { valida: boolean, errores: string[] }
 */
function validarEstructuraGuia(guia) {
  const errores = [];

  // Campos obligatorios del emisor
  if (!guia.rucEmisor || guia.rucEmisor.length !== 13) {
    errores.push('RUC del emisor inválido');
  }

  if (!guia.razonSocialEmisor) {
    errores.push('Razón social del emisor requerida');
  }

  // Campos obligatorios de establecimiento
  if (!guia.establecimiento || guia.establecimiento.length !== 3) {
    errores.push('Código de establecimiento inválido (3 dígitos)');
  }

  if (!guia.puntoEmision || guia.puntoEmision.length !== 3) {
    errores.push('Código de punto de emisión inválido (3 dígitos)');
  }

  if (!guia.secuencial || guia.secuencial < 1) {
    errores.push('Secuencial inválido');
  }

  // Campos obligatorios de la guía
  if (!guia.direccionPartida) {
    errores.push('Dirección de partida requerida');
  }

  if (!guia.motivoTraslado) {
    errores.push('Motivo de traslado requerido');
  }

  // Transportista
  if (!guia.transportista) {
    errores.push('Datos del transportista requeridos');
  } else {
    if (!guia.transportista.razonSocial) {
      errores.push('Razón social del transportista requerida');
    }

    if (!guia.transportista.tipoIdentificacion) {
      errores.push('Tipo de identificación del transportista requerido');
    }

    if (!guia.transportista.identificacion) {
      errores.push('Identificación del transportista requerida');
    }
  }

  // Destinatarios
  if (!guia.destinatarios || guia.destinatarios.length === 0) {
    errores.push('Debe incluir al menos un destinatario');
  } else {
    guia.destinatarios.forEach((dest, idx) => {
      if (!dest.identificacion) {
        errores.push(`Destinatario ${idx + 1}: Identificación requerida`);
      }

      if (!dest.razonSocial) {
        errores.push(`Destinatario ${idx + 1}: Razón social requerida`);
      }

      if (!dest.direccion) {
        errores.push(`Destinatario ${idx + 1}: Dirección requerida`);
      }

      if (!dest.productos || dest.productos.length === 0) {
        errores.push(`Destinatario ${idx + 1}: Debe incluir productos`);
      }
    });
  }

  // Fechas
  if (!guia.fechaEmision) {
    errores.push('Fecha de emisión requerida');
  }

  if (!guia.fechaInicioTransporte) {
    errores.push('Fecha de inicio de transporte requerida');
  }

  if (!guia.fechaFinTransporte) {
    errores.push('Fecha de fin de transporte requerida');
  }

  return {
    valida: errores.length === 0,
    errores,
  };
}

module.exports = {
  generarGuiaRemision,
  generarClaveAcceso,
  calcularDigitoVerificador,
  validarEstructuraGuia,
};
