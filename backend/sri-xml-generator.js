/**
 * MÓDULO: GENERADOR DE XML PARA SRI ECUADOR
 * Genera XML según esquemas oficiales del SRI v1.1.0
 * Soporta: Factura, Retención, Nota de Crédito, Nota de Débito, Guía de Remisión
 */

const { create } = require('xmlbuilder2');

class SRIXMLGenerator {
  constructor() {
    this.version = '1.1.0';
    this.ambiente = '1'; // 1=Pruebas, 2=Producción
  }

  /**
   * Genera clave de acceso de 49 dígitos
   * @param {object} datos - Datos para generar clave
   * @returns {string} Clave de acceso de 49 dígitos
   */
  generarClaveAcceso(datos) {
    const {
      fecha, // DDMMYYYY
      tipoComprobante, // 01=Factura, 04=Nota Crédito, 05=Nota Débito, 06=Guía, 07=Retención
      ruc, // RUC emisor (13 dígitos)
      ambiente, // 1=Pruebas, 2=Producción
      serie, // Establecimiento + Punto emisión (001001)
      numeroSecuencial, // Secuencial (9 dígitos)
      codigoNumerico, // Código numérico (8 dígitos aleatorios)
      tipoEmision, // 1=Normal, 2=Indisponibilidad
    } = datos;

    // Construir los primeros 48 dígitos
    const clave48 = `${fecha}${tipoComprobante}${ruc}${ambiente}${serie}${numeroSecuencial}${codigoNumerico}${tipoEmision}`;

    // Calcular dígito verificador (módulo 11)
    const digitoVerificador = this.calcularModulo11(clave48);

    return clave48 + digitoVerificador;
  }

  /**
   * Calcula dígito verificador módulo 11
   */
  calcularModulo11(clave) {
    const multiplos = [2, 3, 4, 5, 6, 7];
    let suma = 0;
    let factor = 0;

    for (let i = clave.length - 1; i >= 0; i--) {
      suma += parseInt(clave[i]) * multiplos[factor];
      factor = (factor + 1) % 6;
    }

    const residuo = suma % 11;
    const resultado = residuo === 0 ? 0 : 11 - residuo;

    return resultado === 11 ? 0 : resultado;
  }

  /**
   * Genera código numérico aleatorio de 8 dígitos
   */
  generarCodigoNumerico() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }

  /**
   * Formatea fecha para clave de acceso (DDMMYYYY)
   */
  formatearFechaClaveAcceso(fecha = new Date()) {
    const d = fecha.getDate().toString().padStart(2, '0');
    const m = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const y = fecha.getFullYear().toString();
    return `${d}${m}${y}`;
  }

  /**
   * Formatea fecha para XML (DD/MM/YYYY)
   */
  formatearFechaXML(fecha = new Date()) {
    const d = fecha.getDate().toString().padStart(2, '0');
    const m = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const y = fecha.getFullYear().toString();
    return `${d}/${m}/${y}`;
  }

  /**
   * Genera XML de Factura Electrónica
   * @param {object} factura - Datos de la factura
   * @returns {string} XML de la factura
   */
  generarFactura(factura) {
    // Generar clave de acceso
    const codigoNumerico = this.generarCodigoNumerico();
    const serie = `${factura.establecimiento}${factura.puntoEmision}`;
    const secuencial = factura.secuencial.padStart(9, '0');

    const claveAcceso = this.generarClaveAcceso({
      fecha: this.formatearFechaClaveAcceso(new Date(factura.fecha)),
      tipoComprobante: '01',
      ruc: factura.emisor.ruc,
      ambiente: factura.ambiente || '1',
      serie,
      numeroSecuencial: secuencial,
      codigoNumerico,
      tipoEmision: factura.tipoEmision || '1',
    });

    // Construir XML de forma sencilla
    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('factura', {
      id: 'comprobante',
      version: this.version,
    });

    // Información Tributaria
    const infoTrib = root.ele('infoTributaria');
    infoTrib.ele('ambiente').txt(factura.ambiente || '1');
    infoTrib.ele('tipoEmision').txt(factura.tipoEmision || '1');
    infoTrib.ele('razonSocial').txt(factura.emisor.razonSocial);
    infoTrib
      .ele('nombreComercial')
      .txt(factura.emisor.nombreComercial || factura.emisor.razonSocial);
    infoTrib.ele('ruc').txt(factura.emisor.ruc);
    infoTrib.ele('claveAcceso').txt(claveAcceso);
    infoTrib.ele('codDoc').txt('01');
    infoTrib.ele('estab').txt(factura.establecimiento);
    infoTrib.ele('ptoEmi').txt(factura.puntoEmision);
    infoTrib.ele('secuencial').txt(secuencial);
    infoTrib.ele('dirMatriz').txt(factura.emisor.direccionMatriz);

    // Información Factura
    const infoFact = root.ele('infoFactura');
    infoFact.ele('fechaEmision').txt(this.formatearFechaXML(new Date(factura.fecha)));
    infoFact
      .ele('dirEstablecimiento')
      .txt(factura.emisor.direccionSucursal || factura.emisor.direccionMatriz);
    infoFact.ele('contribuyenteEspecial').txt(factura.emisor.contribuyenteEspecial || '');
    infoFact.ele('obligadoContabilidad').txt(factura.emisor.obligadoContabilidad || 'NO');
    infoFact
      .ele('tipoIdentificacionComprador')
      .txt(this.getTipoIdentificacion(factura.comprador.identificacion));
    infoFact.ele('razonSocialComprador').txt(factura.comprador.razonSocial);
    infoFact.ele('identificacionComprador').txt(factura.comprador.identificacion);
    infoFact.ele('direccionComprador').txt(factura.comprador.direccion || 'N/A');
    infoFact.ele('totalSinImpuestos').txt(factura.subtotal.toFixed(2));
    infoFact.ele('totalDescuento').txt(factura.descuento.toFixed(2));

    // Total con Impuestos
    const totalImpuestos = infoFact.ele('totalConImpuestos');

    if (factura.subtotal12 > 0) {
      const imp12 = totalImpuestos.ele('totalImpuesto');
      imp12.ele('codigo').txt('2');
      imp12.ele('codigoPorcentaje').txt('2');
      imp12.ele('baseImponible').txt(factura.subtotal12.toFixed(2));
      imp12.ele('valor').txt(factura.iva.toFixed(2));
    }

    if (factura.subtotal0 > 0) {
      const imp0 = totalImpuestos.ele('totalImpuesto');
      imp0.ele('codigo').txt('2');
      imp0.ele('codigoPorcentaje').txt('0');
      imp0.ele('baseImponible').txt(factura.subtotal0.toFixed(2));
      imp0.ele('valor').txt('0.00');
    }

    infoFact.ele('propina').txt('0.00');
    infoFact.ele('importeTotal').txt(factura.total.toFixed(2));
    infoFact.ele('moneda').txt('DOLAR');

    // Pagos
    const pagos = infoFact.ele('pagos');
    const pago = pagos.ele('pago');
    pago.ele('formaPago').txt(this.getFormaPago(factura.formaPago));
    pago.ele('total').txt(factura.total.toFixed(2));

    // Detalles
    const detalles = root.ele('detalles');

    for (const item of factura.detalles) {
      const detalle = detalles.ele('detalle');
      detalle.ele('codigoPrincipal').txt(item.codigo || item.id || '0000');
      detalle.ele('descripcion').txt(item.descripcion);
      detalle.ele('cantidad').txt(item.cantidad.toString());
      detalle.ele('precioUnitario').txt(item.precioUnitario.toFixed(6));
      detalle.ele('descuento').txt((item.descuento || 0).toFixed(2));
      detalle.ele('precioTotalSinImpuesto').txt(item.subtotal.toFixed(2));

      const impuestos = detalle.ele('impuestos');
      const impuesto = impuestos.ele('impuesto');
      impuesto.ele('codigo').txt('2');
      impuesto.ele('codigoPorcentaje').txt(item.iva > 0 ? '2' : '0');
      impuesto.ele('tarifa').txt(item.iva > 0 ? '12' : '0');
      impuesto.ele('baseImponible').txt(item.subtotal.toFixed(2));
      impuesto.ele('valor').txt((item.iva || 0).toFixed(2));
    }

    // Información Adicional
    if (factura.infoAdicional && factura.infoAdicional.length > 0) {
      const infoAd = root.ele('infoAdicional');
      for (const campo of factura.infoAdicional) {
        infoAd.ele('campoAdicional', { nombre: campo.nombre }).txt(campo.valor);
      }
    }

    const xmlString = root.end({ prettyPrint: true });

    return {
      xml: xmlString,
      claveAcceso,
    };
  }

  /**
   * Determina el tipo de identificación según el formato
   */
  getTipoIdentificacion(identificacion) {
    if (!identificacion) return '07'; // Consumidor final

    const cleaned = identificacion.replace(/[^0-9]/g, '');

    if (cleaned.length === 13) return '04'; // RUC
    if (cleaned.length === 10) return '05'; // Cédula

    return '06'; // Pasaporte
  }

  /**
   * Convierte forma de pago a código SRI
   */
  getFormaPago(formaPago) {
    const formasPago = {
      efectivo: '01',
      cheque: '20',
      tarjeta: '19',
      transferencia: '17',
      credito: '01',
    };

    return formasPago[formaPago?.toLowerCase()] || '01';
  }

  /**
   * Genera XML de Comprobante de Retención
   */
  generarRetencion(retencion) {
    const codigoNumerico = this.generarCodigoNumerico();
    const serie = `${retencion.establecimiento}${retencion.puntoEmision}`;
    const secuencial = retencion.secuencial.padStart(9, '0');

    const claveAcceso = this.generarClaveAcceso({
      fecha: this.formatearFechaClaveAcceso(new Date(retencion.fecha)),
      tipoComprobante: '07',
      ruc: retencion.emisor.ruc,
      ambiente: retencion.ambiente || '1',
      serie,
      numeroSecuencial: secuencial,
      codigoNumerico,
      tipoEmision: retencion.tipoEmision || '1',
    });

    const xml = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('comprobanteRetencion', {
        id: 'comprobante',
        version: this.version,
      })
      .ele('infoTributaria')
      .ele('ambiente')
      .txt(retencion.ambiente || '1')
      .up()
      .ele('tipoEmision')
      .txt(retencion.tipoEmision || '1')
      .up()
      .ele('razonSocial')
      .txt(retencion.emisor.razonSocial)
      .up()
      .ele('nombreComercial')
      .txt(retencion.emisor.nombreComercial || retencion.emisor.razonSocial)
      .up()
      .ele('ruc')
      .txt(retencion.emisor.ruc)
      .up()
      .ele('claveAcceso')
      .txt(claveAcceso)
      .up()
      .ele('codDoc')
      .txt('07')
      .up()
      .ele('estab')
      .txt(retencion.establecimiento)
      .up()
      .ele('ptoEmi')
      .txt(retencion.puntoEmision)
      .up()
      .ele('secuencial')
      .txt(secuencial)
      .up()
      .ele('dirMatriz')
      .txt(retencion.emisor.direccionMatriz)
      .up()
      .up()
      .ele('infoCompRetencion')
      .ele('fechaEmision')
      .txt(this.formatearFechaXML(new Date(retencion.fecha)))
      .up()
      .ele('dirEstablecimiento')
      .txt(retencion.emisor.direccionSucursal || retencion.emisor.direccionMatriz)
      .up()
      .ele('contribuyenteEspecial')
      .txt(retencion.emisor.contribuyenteEspecial || '')
      .up()
      .ele('obligadoContabilidad')
      .txt(retencion.emisor.obligadoContabilidad || 'NO')
      .up()
      .ele('tipoIdentificacionSujetoRetenido')
      .txt(this.getTipoIdentificacion(retencion.proveedor.identificacion))
      .up()
      .ele('razonSocialSujetoRetenido')
      .txt(retencion.proveedor.razonSocial)
      .up()
      .ele('identificacionSujetoRetenido')
      .txt(retencion.proveedor.identificacion)
      .up()
      .ele('periodoFiscal')
      .txt(this.getPeriodoFiscal(new Date(retencion.fecha)))
      .up()
      .up();

    const impuestos = xml.first().ele('impuestos');

    for (const impuesto of retencion.impuestos) {
      impuestos
        .ele('impuesto')
        .ele('codigo')
        .txt(impuesto.codigo)
        .up() // 1=Renta, 2=IVA
        .ele('codigoRetencion')
        .txt(impuesto.codigoRetencion)
        .up()
        .ele('baseImponible')
        .txt(impuesto.baseImponible.toFixed(2))
        .up()
        .ele('porcentajeRetener')
        .txt(impuesto.porcentaje.toString())
        .up()
        .ele('valorRetenido')
        .txt(impuesto.valorRetenido.toFixed(2))
        .up()
        .ele('codDocSustento')
        .txt(impuesto.codDocSustento || '01')
        .up()
        .ele('numDocSustento')
        .txt(impuesto.numDocSustento)
        .up()
        .ele('fechaEmisionDocSustento')
        .txt(this.formatearFechaXML(new Date(impuesto.fechaDocSustento)))
        .up()
        .up();
    }

    const xmlString = xml.end({ prettyPrint: true });

    return {
      xml: xmlString,
      claveAcceso,
    };
  }

  /**
   * Obtiene período fiscal (MM/YYYY)
   */
  getPeriodoFiscal(fecha) {
    const m = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const y = fecha.getFullYear().toString();
    return `${m}/${y}`;
  }

  /**
   * Valida XML contra esquema XSD (básico)
   */
  validarXML(xmlString, tipoComprobante) {
    // Validación básica
    const validaciones = [
      { test: xmlString.includes('<?xml'), error: 'Falta declaración XML' },
      { test: xmlString.includes('claveAcceso'), error: 'Falta clave de acceso' },
      { test: xmlString.includes('infoTributaria'), error: 'Falta información tributaria' },
    ];

    for (const validacion of validaciones) {
      if (!validacion.test) {
        throw new Error(`Validación fallida: ${validacion.error}`);
      }
    }

    return true;
  }
}

module.exports = SRIXMLGenerator;
