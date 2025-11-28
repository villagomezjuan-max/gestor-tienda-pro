/**
 * Generador de RIDE para Comprobantes de Retención - SRI Ecuador
 * RIDE = Representación Impresa de Documento Electrónico
 */

const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Genera el código QR con la información del comprobante
 */
async function generarQRCode(claveAcceso) {
  try {
    const qrDataURL = await QRCode.toDataURL(claveAcceso, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 150,
      margin: 1,
    });

    // Convertir Data URL a Buffer
    const base64Data = qrDataURL.replace(/^data:image\/png;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    console.error('Error generando QR:', error);
    throw error;
  }
}

/**
 * Formatea número de comprobante
 */
function formatearNumeroComprobante(establecimiento, puntoEmision, secuencial) {
  return `${establecimiento.padStart(3, '0')}-${puntoEmision.padStart(3, '0')}-${secuencial.toString().padStart(9, '0')}`;
}

/**
 * Renderiza el RIDE completo en PDF
 */
async function renderizarRIDE(doc, datos, qrBuffer) {
  const pageWidth = 595.28; // A4 width
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = 50;

  // Encabezado - Información del emisor
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text(datos.razonSocial, margin, yPosition, { width: contentWidth * 0.6, align: 'left' });
  yPosition += 15;

  doc.fontSize(8).font('Helvetica');
  doc.text(`RUC: ${datos.ruc}`, margin, yPosition);
  yPosition += 12;
  doc.text(`Dirección Matriz: ${datos.dirMatriz}`, margin, yPosition, {
    width: contentWidth * 0.6,
  });
  yPosition += 12;

  if (datos.contribuyenteEspecial) {
    doc.text(`Contribuyente Especial: ${datos.contribuyenteEspecial}`, margin, yPosition);
    yPosition += 12;
  }

  doc.text(`Obligado a llevar Contabilidad: ${datos.obligadoContabilidad}`, margin, yPosition);
  yPosition += 12;

  // Cuadro derecho - Información del comprobante
  const boxRight = margin + contentWidth * 0.65;
  const boxTop = 50;
  const boxWidth = contentWidth * 0.35;

  doc.rect(boxRight, boxTop, boxWidth, 100).stroke();

  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('COMPROBANTE DE', boxRight + 5, boxTop + 5, { width: boxWidth - 10, align: 'center' });
  doc.text('RETENCIÓN', boxRight + 5, boxTop + 18, { width: boxWidth - 10, align: 'center' });

  doc.fontSize(8).font('Helvetica');
  const numeroComprobante = formatearNumeroComprobante(
    datos.establecimiento,
    datos.puntoEmision,
    datos.secuencial
  );
  doc.text(`No. ${numeroComprobante}`, boxRight + 5, boxTop + 35, {
    width: boxWidth - 10,
    align: 'center',
  });

  doc.text(`NÚMERO DE AUTORIZACIÓN`, boxRight + 5, boxTop + 52, {
    width: boxWidth - 10,
    align: 'center',
  });
  doc.fontSize(7);
  doc.text(datos.claveAcceso, boxRight + 5, boxTop + 65, { width: boxWidth - 10, align: 'center' });

  doc.fontSize(8);
  doc.text(`Fecha Emisión: ${datos.fechaEmision}`, boxRight + 5, boxTop + 82, {
    width: boxWidth - 10,
    align: 'center',
  });

  yPosition = boxTop + 110;

  // Información del sujeto retenido
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('INFORMACIÓN DEL SUJETO RETENIDO', margin, yPosition);
  yPosition += 15;

  doc.fontSize(8).font('Helvetica');
  doc.text(`Razón Social: ${datos.razonSocialSujetoRetenido}`, margin, yPosition);
  yPosition += 12;
  doc.text(`Identificación: ${datos.identificacionSujetoRetenido}`, margin, yPosition);
  yPosition += 12;
  doc.text(`Período Fiscal: ${datos.periodoFiscal}`, margin, yPosition);
  yPosition += 20;

  // Documentos sustento
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('DOCUMENTOS SUSTENTO Y RETENCIONES', margin, yPosition);
  yPosition += 15;

  // Tabla de documentos
  datos.docsSustento.forEach((docSustento) => {
    // Encabezado documento
    doc.fontSize(8).font('Helvetica-Bold');
    doc.rect(margin, yPosition, contentWidth, 15).fill('#EEEEEE');
    doc.fillColor('#000000');
    doc.text(`Comprobante: ${docSustento.numDocSustento}`, margin + 5, yPosition + 3);
    doc.text(
      `Fecha: ${docSustento.fechaEmisionDocSustento}`,
      margin + contentWidth - 120,
      yPosition + 3
    );
    yPosition += 18;

    doc.font('Helvetica');
    doc.text(`Base Imponible: $${docSustento.totalSinImpuestos.toFixed(2)}`, margin + 5, yPosition);
    doc.text(
      `Total: $${docSustento.importeTotal.toFixed(2)}`,
      margin + contentWidth - 120,
      yPosition
    );
    yPosition += 15;

    // Tabla de retenciones
    const tableTop = yPosition;
    const colWidths = [80, 80, 200, 80, 80];
    const headers = ['Impuesto', 'Código', 'Descripción', 'Base Imp.', 'Valor Ret.'];

    // Encabezados
    doc.fontSize(7).font('Helvetica-Bold');
    let xPos = margin;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'center' });
      xPos += colWidths[i];
    });

    yPosition += 12;
    doc
      .moveTo(margin, yPosition)
      .lineTo(margin + contentWidth, yPosition)
      .stroke();
    yPosition += 3;

    // Datos de retenciones
    doc.font('Helvetica');
    (docSustento.retenciones || []).forEach((ret) => {
      const tipoImpuesto = ret.codigo === '1' ? 'RENTA' : 'IVA';
      const infoRetencion = obtenerDescripcionRetencion(ret.codigoRetencion, tipoImpuesto);

      xPos = margin;
      doc.text(tipoImpuesto, xPos, yPosition, { width: colWidths[0], align: 'center' });
      xPos += colWidths[0];

      doc.text(ret.codigoRetencion, xPos, yPosition, { width: colWidths[1], align: 'center' });
      xPos += colWidths[1];

      doc.text(infoRetencion.descripcion || 'N/A', xPos + 2, yPosition, {
        width: colWidths[2] - 4,
      });
      xPos += colWidths[2];

      doc.text(`$${ret.baseImponible.toFixed(2)}`, xPos, yPosition, {
        width: colWidths[3],
        align: 'right',
      });
      xPos += colWidths[3];

      doc.text(`$${ret.valorRetenido.toFixed(2)}`, xPos, yPosition, {
        width: colWidths[4],
        align: 'right',
      });

      yPosition += 12;
    });

    yPosition += 10;
  });

  // Total de retenciones
  const totalRetenciones = datos.docsSustento.reduce((sum, doc) => {
    return sum + (doc.retenciones || []).reduce((s, r) => s + r.valorRetenido, 0);
  }, 0);

  doc.fontSize(9).font('Helvetica-Bold');
  doc.text(`TOTAL RETENIDO: $${totalRetenciones.toFixed(2)}`, margin, yPosition, {
    width: contentWidth,
    align: 'right',
  });
  yPosition += 25;

  // Información adicional
  if (datos.infoAdicional && datos.infoAdicional.length > 0) {
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('INFORMACIÓN ADICIONAL', margin, yPosition);
    yPosition += 12;

    doc.fontSize(8).font('Helvetica');
    datos.infoAdicional.forEach((campo) => {
      doc.text(`${campo.nombre}: ${campo.valor}`, margin, yPosition);
      yPosition += 12;
    });

    yPosition += 10;
  }

  // Código QR y pie de página
  const qrY = 700;
  doc.image(qrBuffer, margin, qrY, { width: 100, height: 100 });

  doc.fontSize(7).font('Helvetica');
  doc.text('CLAVE DE ACCESO:', margin + 110, qrY);
  doc.text(datos.claveAcceso, margin + 110, qrY + 10, { width: 300 });

  doc.text(
    'Ambiente: ' + (datos.ambiente === '1' ? 'PRUEBAS' : 'PRODUCCIÓN'),
    margin + 110,
    qrY + 25
  );
  doc.text('Emisión: NORMAL', margin + 110, qrY + 35);

  doc.fontSize(6);
  doc.text('Autorizado por el SRI', margin, qrY + 110, { width: contentWidth, align: 'center' });
  doc.text('www.sri.gob.ec', margin, qrY + 120, { width: contentWidth, align: 'center' });
}

/**
 * Obtiene descripción de código de retención
 */
function obtenerDescripcionRetencion(codigo, tipo) {
  const { obtenerCodigoRetencion } = require('./sri-retenciones-data');
  const info = obtenerCodigoRetencion(codigo, tipo);
  return info || { descripcion: 'Retención', porcentaje: 0 };
}

/**
 * Genera el RIDE completo para comprobante de retención
 */
async function generarRIDERetencion(datos) {
  try {
    // Crear directorio si no existe
    const rideDir = path.join(__dirname, '..', 'temp', 'ride');
    if (!fs.existsSync(rideDir)) {
      fs.mkdirSync(rideDir, { recursive: true });
    }

    // Generar código QR
    const qrBuffer = await generarQRCode(datos.claveAcceso);

    // Crear documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `Comprobante de Retención ${datos.secuencial}`,
        Author: datos.razonSocial,
        Subject: 'Comprobante de Retención Electrónica',
        Creator: 'Gestor Tienda Pro',
      },
    });

    // Nombre del archivo
    const fileName = `RIDE_RETENCION_${datos.claveAcceso}.pdf`;
    const filePath = path.join(rideDir, fileName);

    // Stream para guardar
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Renderizar contenido
    await renderizarRIDE(doc, datos, qrBuffer);

    // Finalizar documento
    doc.end();

    // Esperar a que termine de escribir
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    return {
      success: true,
      filePath,
      fileName,
      claveAcceso: datos.claveAcceso,
    };
  } catch (error) {
    console.error('Error generando RIDE de retención:', error);
    throw error;
  }
}

module.exports = {
  generarRIDERetencion,
  generarQRCode,
  formatearNumeroComprobante,
};
