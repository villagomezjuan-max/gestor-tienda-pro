/**
 * MÓDULO: GENERADOR DE RIDE (Representación Impresa de Documento Electrónico)
 * Genera RIDE oficial según especificaciones del SRI Ecuador
 * Incluye código de barras bidimensional (QR Code)
 */

const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

class SRIRIDEGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '../temp/ride');

    // Crear directorio si no existe
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Genera RIDE en formato PDF
   * @param {object} datos - Datos del comprobante autorizado
   * @param {string} outputPath - Ruta de salida (opcional)
   * @returns {Promise<string>} Ruta del PDF generado
   */
  async generarRIDE(datos, outputPath = null) {
    try {
      const {
        tipoComprobante = 'FACTURA',
        claveAcceso,
        numeroAutorizacion,
        fechaAutorizacion,
        ambiente,
        emisor,
        comprador,
        detalles,
        totales,
        infoAdicional = [],
      } = datos;

      // Generar QR Code
      const qrBuffer = await this.generarQRCode(claveAcceso);

      // Definir ruta de salida
      const filename = outputPath || path.join(this.outputDir, `RIDE_${claveAcceso}.pdf`);

      // Crear PDF
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
      });

      const stream = fs.createWriteStream(filename);
      doc.pipe(stream);

      // Renderizar contenido
      await this.renderizarRIDE(doc, {
        tipoComprobante,
        claveAcceso,
        numeroAutorizacion,
        fechaAutorizacion,
        ambiente,
        emisor,
        comprador,
        detalles,
        totales,
        infoAdicional,
        qrBuffer,
      });

      doc.end();

      // Esperar a que termine
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      console.log(`✅ RIDE generado: ${filename}`);
      return filename;
    } catch (error) {
      console.error('❌ Error generando RIDE:', error.message);
      throw new Error(`Error generando RIDE: ${error.message}`);
    }
  }

  /**
   * Renderiza el contenido del RIDE
   */
  async renderizarRIDE(doc, datos) {
    const {
      tipoComprobante,
      claveAcceso,
      numeroAutorizacion,
      fechaAutorizacion,
      ambiente,
      emisor,
      comprador,
      detalles,
      totales,
      infoAdicional,
      qrBuffer,
    } = datos;

    let y = 40;

    // ============================================
    // ENCABEZADO
    // ============================================

    // Logo y datos del emisor (izquierda)
    doc.fontSize(14).font('Helvetica-Bold').text(emisor.razonSocial, 40, y, { width: 300 });

    y += 20;
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`RUC: ${emisor.ruc}`, 40, y)
      .text(`${emisor.direccionMatriz}`, 40, y + 15, { width: 300 })
      .text(`Tel: ${emisor.telefono || 'N/A'}`, 40, y + 35);

    // Información del comprobante (derecha)
    const xDer = 360;
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(tipoComprobante, xDer, 40, { width: 200, align: 'center' });

    doc.rect(xDer, 60, 200, 100).stroke();

    doc
      .fontSize(9)
      .font('Helvetica')
      .text(
        `No: ${this.formatearNumeroComprobante(emisor.establecimiento, emisor.puntoEmision, datos.secuencial || '000000001')}`,
        xDer + 10,
        70
      )
      .text(`NÚMERO DE AUTORIZACIÓN`, xDer + 10, 90)
      .text(numeroAutorizacion || claveAcceso, xDer + 10, 105, { width: 180, align: 'center' })
      .text(`FECHA AUTORIZACIÓN`, xDer + 10, 125)
      .text(this.formatearFecha(fechaAutorizacion), xDer + 10, 140, { align: 'center' });

    y = 180;

    // ============================================
    // DATOS DEL COMPRADOR
    // ============================================

    doc.fontSize(10).font('Helvetica-Bold').text('DATOS DEL COMPRADOR', 40, y);

    y += 20;
    doc.rect(40, y, 520, 60).stroke();

    doc
      .fontSize(9)
      .font('Helvetica')
      .text(`Razón Social: ${comprador.razonSocial}`, 50, y + 10)
      .text(`Identificación: ${comprador.identificacion}`, 50, y + 25)
      .text(`Dirección: ${comprador.direccion || 'N/A'}`, 50, y + 40);

    y += 80;

    // ============================================
    // TABLA DE DETALLES
    // ============================================

    doc.fontSize(10).font('Helvetica-Bold').text('DETALLES', 40, y);

    y += 20;

    // Encabezados de tabla
    doc.rect(40, y, 520, 20).stroke();

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('Código', 45, y + 5, { width: 70 })
      .text('Descripción', 120, y + 5, { width: 200 })
      .text('Cant', 325, y + 5, { width: 40, align: 'right' })
      .text('P. Unit', 370, y + 5, { width: 60, align: 'right' })
      .text('Desc', 435, y + 5, { width: 50, align: 'right' })
      .text('Total', 490, y + 5, { width: 65, align: 'right' });

    y += 20;

    // Detalles
    doc.font('Helvetica');
    for (const detalle of detalles) {
      // Verificar si hay espacio
      if (y > 700) {
        doc.addPage();
        y = 40;
      }

      doc.rect(40, y, 520, 20).stroke();

      doc
        .text(detalle.codigo || '', 45, y + 5, { width: 70 })
        .text(detalle.descripcion, 120, y + 5, { width: 200 })
        .text(detalle.cantidad.toString(), 325, y + 5, { width: 40, align: 'right' })
        .text(detalle.precioUnitario.toFixed(2), 370, y + 5, { width: 60, align: 'right' })
        .text((detalle.descuento || 0).toFixed(2), 435, y + 5, { width: 50, align: 'right' })
        .text(detalle.subtotal.toFixed(2), 490, y + 5, { width: 65, align: 'right' });

      y += 20;
    }

    // ============================================
    // TOTALES
    // ============================================

    y += 10;

    doc
      .fontSize(9)
      .font('Helvetica')
      .text('SUBTOTAL 12%:', 370, y)
      .text(`$${totales.subtotal12.toFixed(2)}`, 490, y, { width: 65, align: 'right' });

    y += 15;
    doc
      .text('SUBTOTAL 0%:', 370, y)
      .text(`$${totales.subtotal0.toFixed(2)}`, 490, y, { width: 65, align: 'right' });

    y += 15;
    doc
      .text('SUBTOTAL SIN IMPUESTOS:', 370, y)
      .text(`$${totales.subtotal.toFixed(2)}`, 490, y, { width: 65, align: 'right' });

    y += 15;
    doc
      .text('DESCUENTO:', 370, y)
      .text(`$${totales.descuento.toFixed(2)}`, 490, y, { width: 65, align: 'right' });

    y += 15;
    doc
      .text('IVA 12%:', 370, y)
      .text(`$${totales.iva.toFixed(2)}`, 490, y, { width: 65, align: 'right' });

    y += 15;
    doc
      .font('Helvetica-Bold')
      .text('TOTAL:', 370, y)
      .text(`$${totales.total.toFixed(2)}`, 490, y, { width: 65, align: 'right' });

    // ============================================
    // INFORMACIÓN ADICIONAL
    // ============================================

    if (infoAdicional.length > 0) {
      y += 30;

      doc.fontSize(10).font('Helvetica-Bold').text('INFORMACIÓN ADICIONAL', 40, y);

      y += 20;
      doc.fontSize(8).font('Helvetica');

      for (const campo of infoAdicional) {
        doc.text(`${campo.nombre}: ${campo.valor}`, 40, y, { width: 300 });
        y += 12;
      }
    }

    // ============================================
    // CLAVE DE ACCESO Y QR
    // ============================================

    // Nueva página si es necesario
    if (y > 650) {
      doc.addPage();
      y = 40;
    } else {
      y += 30;
    }

    doc.fontSize(10).font('Helvetica-Bold').text('CLAVE DE ACCESO', 40, y);

    y += 20;
    doc.fontSize(8).font('Courier').text(claveAcceso, 40, y, { width: 300 });

    // QR Code
    if (qrBuffer) {
      doc.image(qrBuffer, 400, y - 20, { width: 150, height: 150 });
    }

    y += 30;

    // ============================================
    // PIE DE PÁGINA
    // ============================================

    y += 120;

    doc
      .fontSize(8)
      .font('Helvetica')
      .text(`Ambiente: ${ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'}`, 40, y)
      .text(`Emisión: NORMAL`, 40, y + 12)
      .text(`Clave de acceso: ${claveAcceso}`, 40, y + 24, { width: 520 });

    y += 50;
    doc
      .fontSize(7)
      .font('Helvetica-Oblique')
      .text(
        'Este documento es una representación gráfica del comprobante electrónico autorizado por el SRI.',
        40,
        y,
        {
          width: 520,
          align: 'center',
        }
      )
      .text('Verifique la autenticidad en: www.sri.gob.ec', 40, y + 15, {
        width: 520,
        align: 'center',
      });
  }

  /**
   * Genera código QR
   */
  async generarQRCode(claveAcceso) {
    try {
      const buffer = await QRCode.toBuffer(claveAcceso, {
        errorCorrectionLevel: 'M',
        type: 'png',
        width: 300,
        margin: 1,
      });

      return buffer;
    } catch (error) {
      console.error('Error generando QR:', error.message);
      return null;
    }
  }

  /**
   * Formatea número de comprobante
   */
  formatearNumeroComprobante(establecimiento, puntoEmision, secuencial) {
    const est = establecimiento.padStart(3, '0');
    const pto = puntoEmision.padStart(3, '0');
    const sec = secuencial.padStart(9, '0');
    return `${est}-${pto}-${sec}`;
  }

  /**
   * Formatea fecha
   */
  formatearFecha(fecha) {
    if (!fecha) return 'N/A';

    const d = new Date(fecha);
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = (d.getMonth() + 1).toString().padStart(2, '0');
    const anio = d.getFullYear();
    const hora = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');

    return `${dia}/${mes}/${anio} ${hora}:${min}`;
  }
}

module.exports = SRIRIDEGenerator;
