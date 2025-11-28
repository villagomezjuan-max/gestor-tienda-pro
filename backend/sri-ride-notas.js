/**
 * Generador de RIDE para Notas de Crédito y Débito - SRI Ecuador
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
  const estab = establecimiento.padStart(3, '0');
  const punto = puntoEmision.padStart(3, '0');
  const secNum = secuencial.toString().padStart(9, '0');
  return `${estab}-${punto}-${secNum}`;
}

/**
 * Genera RIDE para Nota de Crédito
 */
async function generarRIDENotaCredito(datos) {
  try {
    const rideDir = path.join(__dirname, '..', 'temp', 'ride');
    if (!fs.existsSync(rideDir)) {
      fs.mkdirSync(rideDir, { recursive: true });
    }

    const qrBuffer = await generarQRCode(datos.claveAcceso);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Nota de Crédito ${datos.secuencial}`,
        Author: datos.razonSocial,
        Subject: 'Nota de Crédito Electrónica',
      },
    });

    const fileName = `RIDE_NC_${datos.claveAcceso}.pdf`;
    const filePath = path.join(rideDir, fileName);

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Renderizar contenido
    let y = 50;

    // Encabezado
    doc.fontSize(12).font('Helvetica-Bold').text(datos.razonSocial, 50, y);
    y += 20;
    doc.fontSize(9).font('Helvetica').text(`RUC: ${datos.ruc}`, 50, y);
    y += 15;
    doc.text(`Dirección: ${datos.dirMatriz}`, 50, y, { width: 300 });
    y += 15;
    doc.text(`Obligado a llevar Contabilidad: ${datos.obligadoContabilidad}`, 50, y);

    // Cuadro de nota
    doc.rect(380, 50, 165, 90).stroke();
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('NOTA DE CRÉDITO', 380, 60, { width: 165, align: 'center' });
    const numComprobante = formatearNumeroComprobante(
      datos.establecimiento,
      datos.puntoEmision,
      datos.secuencial
    );
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(`No. ${numComprobante}`, 380, 80, { width: 165, align: 'center' });
    doc.fontSize(7).text('AUTORIZACIÓN:', 385, 100);
    doc.text(datos.claveAcceso, 385, 110, { width: 155 });
    doc.fontSize(8).text(`Fecha: ${datos.fechaEmision}`, 385, 125);

    y = 150;

    // Cliente
    doc.fontSize(10).font('Helvetica-Bold').text('CLIENTE', 50, y);
    y += 15;
    doc.fontSize(9).font('Helvetica').text(`${datos.razonSocialComprador}`, 50, y);
    y += 12;
    doc.text(`${datos.identificacionComprador}`, 50, y);
    y += 20;

    // Documento modificado
    doc.fontSize(10).font('Helvetica-Bold').text('COMPROBANTE QUE SE MODIFICA', 50, y);
    y += 15;
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(`${datos.numDocModificado} - Fecha: ${datos.fechaEmisionDocSustento}`, 50, y);
    y += 12;
    doc.text(`Motivo: ${datos.motivo}`, 50, y, { width: 500 });
    y += 25;

    // Detalles
    doc.fontSize(10).font('Helvetica-Bold').text('DETALLE', 50, y);
    y += 15;

    // Tabla simple
    doc.fontSize(8).font('Helvetica');
    datos.detalles.forEach((detalle) => {
      doc.text(`${detalle.descripcion}`, 50, y, { width: 300 });
      doc.text(`${detalle.cantidad}`, 360, y, { width: 40, align: 'right' });
      doc.text(`$${detalle.precioUnitario.toFixed(2)}`, 410, y, { width: 60, align: 'right' });
      doc.text(`$${detalle.precioTotalSinImpuesto.toFixed(2)}`, 480, y, {
        width: 65,
        align: 'right',
      });
      y += 15;
    });

    y += 10;

    // Totales
    doc.fontSize(9).font('Helvetica').text('SUBTOTAL:', 400, y);
    doc.text(`$${datos.totalSinImpuestos.toFixed(2)}`, 480, y, { width: 65, align: 'right' });
    y += 12;

    doc.font('Helvetica-Bold').text('TOTAL:', 400, y);
    doc.text(`$${datos.valorTotal.toFixed(2)}`, 480, y, { width: 65, align: 'right' });

    // QR al final
    doc.image(qrBuffer, 50, 700, { width: 80, height: 80 });
    doc.fontSize(7).font('Helvetica').text('Clave de Acceso:', 140, 700);
    doc.text(datos.claveAcceso, 140, 710, { width: 400 });
    doc.text(`Ambiente: ${datos.ambiente === '1' ? 'PRUEBAS' : 'PRODUCCIÓN'}`, 140, 730);

    doc.end();

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
    console.error('Error generando RIDE de nota de crédito:', error);
    throw error;
  }
}

/**
 * Genera RIDE para Nota de Débito
 */
async function generarRIDENotaDebito(datos) {
  try {
    const rideDir = path.join(__dirname, '..', 'temp', 'ride');
    if (!fs.existsSync(rideDir)) {
      fs.mkdirSync(rideDir, { recursive: true });
    }

    const qrBuffer = await generarQRCode(datos.claveAcceso);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Nota de Débito ${datos.secuencial}`,
        Author: datos.razonSocial,
        Subject: 'Nota de Débito Electrónica',
      },
    });

    const fileName = `RIDE_ND_${datos.claveAcceso}.pdf`;
    const filePath = path.join(rideDir, fileName);

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Renderizar contenido
    let y = 50;

    // Encabezado
    doc.fontSize(12).font('Helvetica-Bold').text(datos.razonSocial, 50, y);
    y += 20;
    doc.fontSize(9).font('Helvetica').text(`RUC: ${datos.ruc}`, 50, y);
    y += 15;
    doc.text(`Dirección: ${datos.dirMatriz}`, 50, y, { width: 300 });
    y += 15;
    doc.text(`Obligado a llevar Contabilidad: ${datos.obligadoContabilidad}`, 50, y);

    // Cuadro de nota
    doc.rect(380, 50, 165, 90).stroke();
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('NOTA DE DÉBITO', 380, 60, { width: 165, align: 'center' });
    const numComprobante = formatearNumeroComprobante(
      datos.establecimiento,
      datos.puntoEmision,
      datos.secuencial
    );
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(`No. ${numComprobante}`, 380, 80, { width: 165, align: 'center' });
    doc.fontSize(7).text('AUTORIZACIÓN:', 385, 100);
    doc.text(datos.claveAcceso, 385, 110, { width: 155 });
    doc.fontSize(8).text(`Fecha: ${datos.fechaEmision}`, 385, 125);

    y = 150;

    // Cliente
    doc.fontSize(10).font('Helvetica-Bold').text('CLIENTE', 50, y);
    y += 15;
    doc.fontSize(9).font('Helvetica').text(`${datos.razonSocialComprador}`, 50, y);
    y += 12;
    doc.text(`${datos.identificacionComprador}`, 50, y);
    y += 20;

    // Documento modificado
    doc.fontSize(10).font('Helvetica-Bold').text('COMPROBANTE QUE SE MODIFICA', 50, y);
    y += 15;
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(`${datos.numDocModificado} - Fecha: ${datos.fechaEmisionDocSustento}`, 50, y);
    y += 25;

    // Motivos
    doc.fontSize(10).font('Helvetica-Bold').text('MOTIVOS', 50, y);
    y += 15;

    doc.fontSize(9).font('Helvetica');
    datos.motivos.forEach((motivo) => {
      doc.text(`• ${motivo.razon}`, 50, y, { width: 400 });
      doc.text(`$${motivo.valor.toFixed(2)}`, 480, y, { width: 65, align: 'right' });
      y += 15;
    });

    y += 10;

    // Totales
    doc.fontSize(9).font('Helvetica').text('SUBTOTAL:', 400, y);
    doc.text(`$${datos.totalSinImpuestos.toFixed(2)}`, 480, y, { width: 65, align: 'right' });
    y += 12;

    doc.font('Helvetica-Bold').text('TOTAL:', 400, y);
    doc.text(`$${datos.valorTotal.toFixed(2)}`, 480, y, { width: 65, align: 'right' });

    // QR al final
    doc.image(qrBuffer, 50, 700, { width: 80, height: 80 });
    doc.fontSize(7).font('Helvetica').text('Clave de Acceso:', 140, 700);
    doc.text(datos.claveAcceso, 140, 710, { width: 400 });
    doc.text(`Ambiente: ${datos.ambiente === '1' ? 'PRUEBAS' : 'PRODUCCIÓN'}`, 140, 730);

    doc.end();

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
    console.error('Error generando RIDE de nota de débito:', error);
    throw error;
  }
}

module.exports = {
  generarRIDENotaCredito,
  generarRIDENotaDebito,
};
