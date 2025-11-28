// js/pdf-generator.js
// Módulo para generar documentos PDF (RIDE) usando jsPDF y jspdf-autotable
// Optimizado para formato A4 compacto y profesional

/**
 * Genera la representación impresa (RIDE) de una factura en formato A4 optimizado.
 * @param {object} facturaData - Datos de la factura.
 * @param {object} tiendaConfig - Configuración de la tienda.
 */
function generarFacturaPDF(facturaData, tiendaConfig) {
  if (!window.jspdf) {
    console.error('jsPDF no está disponible en el navegador.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Colores modernos
  const primaryColor = [41, 128, 185]; // Azul profesional
  const accentColor = [52, 152, 219]; // Azul claro
  const successColor = [39, 174, 96]; // Verde
  const textDark = [0, 0, 0]; // Negro
  const textGray = [52, 73, 94]; // Gris oscuro
  const lineGray = [189, 195, 199]; // Gris claro para líneas
  const bgLight = [236, 240, 241]; // Fondo gris muy claro

  // --- Datos del Emisor ---
  const razonSocial =
    tiendaConfig.razon_social || tiendaConfig.nombre || tiendaConfig.nombreTienda || 'Mi Tienda';
  const nombreComercial =
    tiendaConfig.nombreComercial || tiendaConfig.nombre || tiendaConfig.nombreTienda || razonSocial;
  const ruc = tiendaConfig.ruc || tiendaConfig.identificacion || '9999999999999';
  const direccionMatriz =
    tiendaConfig.direccionMatriz || tiendaConfig.direccion || 'santo domingo, Ecuador';
  const telefono = tiendaConfig.telefono || '+593986458439';
  const email = tiendaConfig.email || 'go.micorreo@hotmail.com';
  const cliente = facturaData.cliente || {};

  // --- Encabezado en 2 columnas (más compacto) ---
  let yPos = 15;

  // Columna izquierda - Datos del emisor
  doc.setFillColor(...primaryColor);
  doc.rect(10, yPos, 120, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(razonSocial, 15, yPos + 6);

  yPos += 10;
  doc.setTextColor(...textDark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`RAZÓN SOCIAL`, 12, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(nombreComercial, 45, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`RUC`, 12, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(ruc, 45, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`UBICACIÓN`, 12, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(direccionMatriz, 45, yPos, { maxWidth: 80 });

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`TELÉFONO`, 12, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(telefono, 45, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`CORREO`, 12, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(email, 45, yPos);

  // Columna derecha - Información de factura
  const rightX = 135;
  yPos = 15;

  doc.setFillColor(...accentColor);
  doc.rect(rightX, yPos, 65, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA', rightX + 32.5, yPos + 6, { align: 'center' });

  yPos += 10;
  doc.setFillColor(...bgLight);
  doc.rect(rightX, yPos, 65, 30, 'F');

  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(facturaData.numero || 'VTA-2025-11-03-0003', rightX + 32.5, yPos + 5, {
    align: 'center',
  });

  yPos += 9;
  doc.setTextColor(...textGray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`FECHA DE EMISIÓN`, rightX + 2, yPos);
  doc.setFont('helvetica', 'bold');
  const fechaEmision = facturaData.fecha
    ? new Date(facturaData.fecha).toLocaleDateString('es-EC')
    : '2025-11-03 19:42';
  doc.text(fechaEmision, rightX + 2, yPos + 4);

  yPos += 9;
  doc.setFont('helvetica', 'normal');
  doc.text(`ATRIBUIDO POR`, rightX + 2, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text('Sistema', rightX + 2, yPos + 4);

  // --- Línea separadora ---
  yPos = 55;
  doc.setDrawColor(...lineGray);
  doc.setLineWidth(0.5);
  doc.line(10, yPos, 200, yPos);

  // --- Datos del Vendedor y Cliente (2 columnas) ---
  yPos += 5;

  // Vendedor (izquierda)
  doc.setFillColor(...bgLight);
  doc.rect(10, yPos, 90, 30, 'F');
  doc.setDrawColor(...lineGray);
  doc.rect(10, yPos, 90, 30);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text('Datos del Vendedor', 12, yPos + 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`RAZÓN SOCIAL`, 12, yPos + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(razonSocial, 12, yPos + 14, { maxWidth: 85 });

  doc.setFont('helvetica', 'normal');
  doc.text(`DIRECCIÓN`, 12, yPos + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(direccionMatriz, 12, yPos + 22, { maxWidth: 85 });

  doc.setFont('helvetica', 'normal');
  doc.text(`TELÉFONO`, 12, yPos + 26);
  doc.setFont('helvetica', 'bold');
  doc.text(telefono, 45, yPos + 26);

  // Cliente (derecha)
  doc.setFillColor(255, 255, 255);
  doc.rect(105, yPos, 95, 30, 'F');
  doc.setDrawColor(...lineGray);
  doc.rect(105, yPos, 95, 30);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text('Datos del Cliente', 107, yPos + 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`RAZÓN SOCIAL`, 107, yPos + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(cliente.nombre || 'Cliente Genérico', 107, yPos + 14, { maxWidth: 90 });

  doc.setFont('helvetica', 'normal');
  doc.text(`RUC/C.I.`, 107, yPos + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(cliente.identificacion || '9999999999', 130, yPos + 18);

  doc.setFont('helvetica', 'normal');
  doc.text(`DIRECCIÓN`, 107, yPos + 22);
  doc.setFont('helvetica', 'bold');
  doc.text(cliente.direccion || 'N/A', 107, yPos + 26, { maxWidth: 90 });

  // --- Tabla de productos ---
  yPos += 35;

  const tableColumn = [
    { header: 'CANT.', dataKey: 'cantidad' },
    { header: 'DESCRIPCIÓN', dataKey: 'descripcion' },
    { header: 'P. UNIT.', dataKey: 'precioUnit' },
    { header: 'TOTAL', dataKey: 'total' },
  ];

  const tableRows = facturaData.items.map((item) => ({
    cantidad: item.cantidad || 1,
    descripcion: item.descripcion || item.nombre || 'lyohe castrol',
    precioUnit: `${parseFloat(item.precio_unitario || item.precio || 0).toFixed(2)} US$`,
    total: `${parseFloat(item.precio_total || item.subtotal || 0).toFixed(2)} US$`,
  }));

  doc.autoTable({
    startY: yPos,
    columns: tableColumn,
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: textDark,
    },
    columnStyles: {
      cantidad: { halign: 'center', cellWidth: 20 },
      descripcion: { halign: 'left', cellWidth: 100 },
      precioUnit: { halign: 'right', cellWidth: 35 },
      total: { halign: 'right', cellWidth: 35 },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { left: 10, right: 10 },
  });

  // --- Sección de totales (diseño de 2 columnas) ---
  yPos = doc.lastAutoTable.finalY + 8;

  // Columna izquierda - Detalles de pago
  doc.setFillColor(...bgLight);
  doc.rect(10, yPos, 90, 35, 'F');
  doc.setDrawColor(...lineGray);
  doc.rect(10, yPos, 90, 35);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text('Detalles de Pago', 12, yPos + 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`MÉTODO DE PAGO:`, 12, yPos + 12);
  doc.setFont('helvetica', 'bold');
  doc.text('Efectivo', 50, yPos + 12);

  doc.setFont('helvetica', 'normal');
  doc.text(`MONTO RECIBIDO:`, 12, yPos + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${parseFloat(facturaData.total || 0).toFixed(2)} US$`, 50, yPos + 18);

  doc.setFont('helvetica', 'normal');
  doc.text(`CAMBIO:`, 12, yPos + 24);
  doc.setFont('helvetica', 'bold');
  doc.text('0.00 US$', 50, yPos + 24);

  doc.setFont('helvetica', 'normal');
  doc.text(`ESTADO:`, 12, yPos + 30);
  doc.setTextColor(...successColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Completada', 50, yPos + 30);

  // Columna derecha - Resumen financiero
  const summaryX = 105;
  doc.setFillColor(255, 255, 255);
  doc.rect(summaryX, yPos, 95, 35, 'F');
  doc.setDrawColor(...lineGray);
  doc.rect(summaryX, yPos, 95, 35);

  doc.setTextColor(...textDark);
  doc.setFontSize(8);

  const summaryY = yPos + 7;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', summaryX + 5, summaryY);
  doc.setFont('helvetica', 'bold');
  doc.text(`${parseFloat(facturaData.subtotal_iva || 0).toFixed(2)} US$`, summaryX + 90, summaryY, {
    align: 'right',
  });

  doc.setFont('helvetica', 'normal');
  doc.text('Descuento:', summaryX + 5, summaryY + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `-${parseFloat(facturaData.descuento || 0).toFixed(2)} US$`,
    summaryX + 90,
    summaryY + 6,
    { align: 'right' }
  );

  doc.setFont('helvetica', 'normal');
  doc.text('IVA:', summaryX + 5, summaryY + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${parseFloat(facturaData.iva || 0).toFixed(2)} US$`, summaryX + 90, summaryY + 12, {
    align: 'right',
  });

  // Total destacado
  doc.setFillColor(...successColor);
  doc.rect(summaryX + 5, summaryY + 16, 85, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', summaryX + 8, summaryY + 21);
  doc.setFontSize(12);
  doc.text(`${parseFloat(facturaData.total || 0).toFixed(2)} US$`, summaryX + 87, summaryY + 21, {
    align: 'right',
  });

  // --- Código de barras ---
  yPos = doc.lastAutoTable.finalY + 48;
  const claveAcceso = facturaData.claveAcceso || facturaData.clave_acceso;
  const barcodeValue = claveAcceso || facturaData.numero || 'VTA-2025-11-03-0003';

  let barcodeImage = null;
  if (barcodeValue && window.JsBarcode) {
    try {
      const canvas = document.createElement('canvas');
      window.JsBarcode(canvas, barcodeValue, {
        format: 'CODE128',
        displayValue: false,
        margin: 0,
        height: 50,
        width: 2,
        background: '#ffffff',
        lineColor: '#000000',
      });
      barcodeImage = canvas.toDataURL('image/png');
    } catch (error) {
      console.warn('No se pudo generar el código de barras:', error);
    }
  }

  if (barcodeImage) {
    const barcodeWidth = 100;
    const barcodeHeight = 18;
    const barcodeX = (210 - barcodeWidth) / 2;
    doc.addImage(
      barcodeImage,
      'PNG',
      barcodeX,
      yPos,
      barcodeWidth,
      barcodeHeight,
      undefined,
      'FAST'
    );

    doc.setFontSize(7);
    doc.setTextColor(...textGray);
    doc.setFont('helvetica', 'normal');
    doc.text(barcodeValue, 105, yPos + barcodeHeight + 4, { align: 'center' });
  }

  // --- Pie de página ---
  yPos = 275;
  doc.setFillColor(...primaryColor);
  doc.rect(10, yPos, 190, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('¡Gracias por su compra!', 105, yPos + 5, { align: 'center' });
  doc.text(`Autorizado por Sistema`, 105, yPos + 9, { align: 'center' });

  // --- Guardar el PDF ---
  const numeroDocumento =
    facturaData.numero ||
    facturaData.secuencial ||
    new Date()
      .toISOString()
      .replace(/[:T.-]/g, '')
      .slice(0, 14);
  doc.save(`Factura-${numeroDocumento}.pdf`);
}

window.generarFacturaPDF = generarFacturaPDF;
