/**
 * GENERADOR DE RIDE PARA GUÍAS DE REMISIÓN - SRI ECUADOR
 *
 * Genera Representación Impresa De Documentos Electrónicos (RIDE)
 * según especificaciones del SRI para Guías de Remisión
 *
 * Formato: PDF A4 con código QR
 * Implementación: 2025-11-18
 */

const fs = require('fs');

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * GENERAR RIDE DE GUÍA DE REMISIÓN
 * @param {object} guia - Datos de la guía con XML y clave de acceso
 * @param {string} rutaSalida - Path donde guardar el PDF
 * @returns {Promise<string>} Path del archivo generado
 */
async function generarRIDEGuiaRemision(guia, rutaSalida) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        // Crear documento PDF
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 30, bottom: 30, left: 40, right: 40 },
        });

        const stream = fs.createWriteStream(rutaSalida);
        doc.pipe(stream);

        // === ENCABEZADO ===
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .fillColor('#2c3e50')
          .text('GUÍA DE REMISIÓN', { align: 'center' });

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#7f8c8d')
          .text('DOCUMENTO ELECTRÓNICO', { align: 'center' });

        doc.moveDown(1);

        // === INFORMACIÓN DEL EMISOR (2 columnas) ===
        const colIzq = 40;
        const colDer = 320;
        let y = doc.y;

        // Columna izquierda - Datos del emisor
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#2c3e50')
          .text(guia.razonSocialEmisor, colIzq, y, { width: 250 });

        y += 20;
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#34495e')
          .text(`RUC: ${guia.rucEmisor}`, colIzq, y);

        y += 15;
        doc.text(`Dirección Matriz:`, colIzq, y);
        y += 12;
        doc.fontSize(8).fillColor('#7f8c8d').text(guia.direccionMatriz, colIzq, y, { width: 250 });

        if (guia.contribuyenteEspecial) {
          y += 20;
          doc
            .fontSize(9)
            .fillColor('#e74c3c')
            .text(`Contribuyente Especial: ${guia.contribuyenteEspecial}`, colIzq, y);
        }

        if (guia.obligadoContabilidad) {
          y += 15;
          doc.fillColor('#34495e').text('OBLIGADO A LLEVAR CONTABILIDAD: SÍ', colIzq, y);
        }

        // Columna derecha - Número y autorización
        y = doc.y - 80; // Volver arriba para segunda columna

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#2c3e50').text('No.', colDer, y);

        y += 15;
        doc.fontSize(14).fillColor('#2980b9').text(guia.numeroComprobante, colDer, y);

        y += 25;
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#34495e')
          .text('NÚMERO DE AUTORIZACIÓN:', colDer, y, { width: 230 });

        y += 15;
        doc.fontSize(8).fillColor('#7f8c8d').text(guia.claveAcceso, colDer, y, { width: 230 });

        y += 20;
        doc
          .fontSize(9)
          .fillColor('#34495e')
          .text(`Fecha Emisión: ${formatearFecha(guia.fechaEmision)}`, colDer, y);

        y += 15;
        doc.text(`Ambiente: ${guia.ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'}`, colDer, y);

        doc.moveDown(3);

        // Generar código QR
        const qrData = `${guia.claveAcceso}|${formatearFecha(guia.fechaEmision)}|${guia.rucEmisor}`;
        const qrImage = await QRCode.toDataURL(qrData, { width: 100 });
        const qrBuffer = Buffer.from(qrImage.split(',')[1], 'base64');

        doc.image(qrBuffer, colDer + 50, y + 20, { width: 80 });

        // === INFORMACIÓN DE TRANSPORTE ===
        doc.moveDown(2);
        y = doc.y + 60;

        // Línea separadora
        doc.strokeColor('#bdc3c7').lineWidth(1).moveTo(40, y).lineTo(555, y).stroke();

        y += 15;
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#2c3e50')
          .text('INFORMACIÓN DEL TRANSPORTE', 40, y);

        y += 20;
        doc.fontSize(9).font('Helvetica').fillColor('#34495e');

        // Dirección de partida
        doc.text('Dirección de Partida:', 40, y);
        y += 12;
        doc.fontSize(8).fillColor('#7f8c8d').text(guia.direccionPartida, 40, y, { width: 515 });

        y += 20;
        doc
          .fontSize(9)
          .fillColor('#34495e')
          .text(`Fecha Inicio Transporte: ${formatearFecha(guia.fechaInicioTransporte)}`, 40, y);

        y += 15;
        doc.text(`Fecha Fin Transporte: ${formatearFecha(guia.fechaFinTransporte)}`, 40, y);

        y += 15;
        const motivo = obtenerDescripcionMotivo(guia.motivoTraslado);
        doc.text(`Motivo de Traslado: ${guia.motivoTraslado} - ${motivo}`, 40, y);

        // === DATOS DEL TRANSPORTISTA ===
        y += 25;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#2c3e50')
          .text('DATOS DEL TRANSPORTISTA', 40, y);

        y += 20;
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#34495e')
          .text(`Razón Social: ${guia.transportista.razonSocial}`, 40, y);

        y += 15;
        doc.text(`Identificación: ${guia.transportista.identificacion}`, 40, y);

        if (guia.transportista.placa) {
          y += 15;
          doc.text(`Placa del Vehículo: ${guia.transportista.placa}`, 40, y);
        }

        // === DESTINATARIOS Y PRODUCTOS ===
        y += 30;
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#2c3e50')
          .text('DESTINATARIOS Y PRODUCTOS', 40, y);

        y += 20;

        guia.destinatarios.forEach((dest, idx) => {
          // Verificar espacio en la página
          if (y > 700) {
            doc.addPage();
            y = 50;
          }

          // Destinatario
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#2980b9')
            .text(`Destinatario ${idx + 1}: ${dest.razonSocial}`, 40, y);

          y += 15;
          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor('#7f8c8d')
            .text(`${dest.identificacion} - ${dest.direccion}`, 40, y, { width: 515 });

          y += 20;

          // Tabla de productos
          const tablaY = y;
          const colCodigo = 40;
          const colDescripcion = 120;
          const colCantidad = 480;

          // Encabezado de tabla
          doc
            .fontSize(8)
            .font('Helvetica-Bold')
            .fillColor('#ffffff')
            .rect(colCodigo, tablaY, 515, 20)
            .fill('#34495e');

          doc
            .fillColor('#ffffff')
            .text('CÓDIGO', colCodigo + 5, tablaY + 6)
            .text('DESCRIPCIÓN', colDescripcion + 5, tablaY + 6)
            .text('CANTIDAD', colCantidad + 5, tablaY + 6);

          y = tablaY + 25;

          // Filas de productos
          dest.productos.forEach((prod, pidx) => {
            const rowColor = pidx % 2 === 0 ? '#ecf0f1' : '#ffffff';

            doc.rect(colCodigo, y, 515, 18).fill(rowColor);

            doc
              .fontSize(7)
              .font('Helvetica')
              .fillColor('#2c3e50')
              .text(prod.codigoInterno || 'N/A', colCodigo + 5, y + 5, { width: 70 })
              .text(prod.descripcion, colDescripcion + 5, y + 5, { width: 350 })
              .text(prod.cantidad.toString(), colCantidad + 5, y + 5, { width: 60 });

            y += 18;
          });

          y += 15;
        });

        // === PIE DE PÁGINA ===
        const piePaginaY = 750;

        doc
          .fontSize(7)
          .fillColor('#95a5a6')
          .text(
            'Este documento es una representación impresa de un comprobante electrónico autorizado por el SRI.',
            40,
            piePaginaY,
            { width: 515, align: 'center' }
          );

        doc
          .fontSize(6)
          .text('Verifique la autenticidad en: www.sri.gob.ec', 40, piePaginaY + 12, {
            width: 515,
            align: 'center',
          });

        // Finalizar documento
        doc.end();

        stream.on('finish', () => {
          resolve(rutaSalida);
        });
      } catch (error) {
        reject(error);
      }
    })();
  });
}

/**
 * FORMATEAR FECHA PARA VISUALIZACIÓN
 * @param {string|Date} fecha - Fecha a formatear
 * @returns {string} Fecha en formato DD/MM/YYYY
 */
function formatearFecha(fecha) {
  const f = new Date(fecha);
  const dia = String(f.getDate()).padStart(2, '0');
  const mes = String(f.getMonth() + 1).padStart(2, '0');
  const anio = f.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

/**
 * OBTENER DESCRIPCIÓN DEL MOTIVO DE TRASLADO
 * @param {string} codigo - Código del motivo (01-10)
 * @returns {string} Descripción del motivo
 */
function obtenerDescripcionMotivo(codigo) {
  const motivos = {
    '01': 'Venta',
    '02': 'Compra',
    '03': 'Devolución',
    '04': 'Consignación',
    '05': 'Traslado entre establecimientos',
    '06': 'Traslado por emisor itinerante',
    '07': 'Traslado para transformación',
    '08': 'Importación',
    '09': 'Exportación',
    10: 'Otros',
  };

  return motivos[codigo] || 'No especificado';
}

module.exports = {
  generarRIDEGuiaRemision,
};
