const { GoogleGenerativeAI } = require('@google/generative-ai');

// ============================================
// CONSTANTES PARA EXTRACCIÓN DE FACTURAS
// ============================================

const INVOICE_EXTRACTION_SYSTEM_PROMPT = [
  'Analiza este documento PDF (factura) y extrae TODOS los datos con máxima precisión.',
  '',
  '=== IMPORTANTE ===',
  '- Lee CADA línea del documento, incluyendo encabezados, tablas, pies de página',
  '- Los números deben ser numéricos (float/int), NO strings',
  '- Elimina símbolos de moneda ($, €, MXN, USD, etc.)',
  '- Si un campo no está visible, déjalo vacío ("" ) o en 0',
  '- EXTRAE TODOS LOS PRODUCTOS sin omitir ninguno',
  '',
  '=== REGLAS CRÍTICAS DE EXTRACCIÓN ===',
  '1. EMISOR/PROVEEDOR (Parte Superior del Documento):',
  '   Ubicación: PRIMERO que aparece, generalmente arriba o lateral izquierdo',
  '   Extraer TODO lo visible: Nombre, RUC/RFC, Dirección, etc.',
  '2. EXTRAER TODOS LOS PRODUCTOS:',
  '   - Lee CADA LÍNEA de la tabla de productos, no omitas ninguno.',
  '3. CANTIDAD:',
  '   - SIEMPRE número ENTERO (1, 2, 7, 10, 100)',
  '   - NO confundir con código o precio.',
  '4. NÚMERO DE FACTURA:',
  '   - Formato: ###-###-#########',
  '',
  'Devuelve SOLO JSON válido, sin markdown ni comentarios.',
].join('\n');

const INVOICE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    vendedor: {
      type: 'OBJECT',
      description: 'Datos completos del emisor/vendedor/proveedor (parte superior de la factura)',
      properties: {
        nombre: { type: 'STRING', nullable: true },
        razon_social: { type: 'STRING', nullable: true },
        direccion: { type: 'STRING', nullable: true },
        rfc_tax_id: { type: 'STRING', nullable: true, description: 'RUC (Ecuador) o RFC (México)' },
        telefono: { type: 'STRING', nullable: true },
        email: { type: 'STRING', nullable: true },
      },
    },
    comprador: {
      type: 'OBJECT',
      description: 'Datos del receptor/cliente/comprador',
      properties: {
        nombre: { type: 'STRING', nullable: true },
        rfc_tax_id: { type: 'STRING', nullable: true, description: 'RUC/RFC/CI' },
      },
    },
    detalles_factura: {
      type: 'OBJECT',
      description: 'Información de la factura',
      properties: {
        numero: { type: 'STRING', nullable: true, description: 'Número o Serie-Folio' },
        fecha_emision: {
          type: 'STRING',
          nullable: true,
          description: 'Fecha en formato YYYY-MM-DD',
        },
        moneda: { type: 'STRING', nullable: true, description: 'MXN, USD, EUR, etc.' },
      },
    },
    productos: {
      type: 'ARRAY',
      description: 'Lista de todos los productos/conceptos de la factura',
      items: {
        type: 'OBJECT',
        properties: {
          descripcion: { type: 'STRING' },
          cantidad: { type: 'NUMBER' },
          precio_unitario: { type: 'NUMBER' },
          subtotal: { type: 'NUMBER' },
          total: { type: 'NUMBER' },
        },
        required: ['descripcion', 'cantidad', 'precio_unitario', 'subtotal', 'total'],
      },
    },
    totales: {
      type: 'OBJECT',
      description: 'Resumen de totales de la factura',
      properties: {
        subtotal: { type: 'NUMBER' },
        iva: { type: 'NUMBER' },
        total: { type: 'NUMBER' },
      },
      required: ['subtotal', 'iva', 'total'],
    },
  },
  required: ['productos', 'totales'],
};

// ============================================
// SERVICIO DE IA CENTRALIZADO
// ============================================

/**
 * Interpreta errores comunes de la API de Gemini.
 * @param {Error} error - El error original.
 * @returns {object|null} Un objeto con detalles del error interpretado o null.
 */
function interpretGeminiError(error) {
  if (!error) return null;

  const status = error.status || error.statusCode;
  const message = error.message || '';
  const diagnostic = (message + ' ' + (error.code || '')).toLowerCase();

  const buildResult = (statusCode, userMessage, reason) => ({
    statusCode,
    userMessage,
    reason,
    logMessage: message,
  });

  if (status === 401 || /unauthenticated|invalid api key|api key/.test(diagnostic)) {
    return buildResult(401, 'API Key de Gemini inválida o expirada.', 'UNAUTHENTICATED');
  }
  if (status === 429 || /quota|rate limit|resource_exhausted/.test(diagnostic)) {
    return buildResult(429, 'Límite de cuota de API de Gemini excedido.', 'QUOTA_EXCEEDED');
  }
  if (status === 403 || /permission|forbidden/.test(diagnostic)) {
    return buildResult(
      403,
      'La cuenta de Gemini no tiene permisos para este modelo.',
      'PERMISSION_DENIED'
    );
  }
  return null;
}

/**
 * Procesa un PDF de factura usando Gemini Vision.
 * @param {Buffer} pdfBuffer - Buffer del archivo PDF.
 * @param {string} apiKey - API Key de Gemini.
 * @param {string} modelName - Nombre del modelo a usar (ej. 'gemini-2.5-flash').
 * @returns {Promise<object>} Datos extraídos del PDF en formato JSON.
 */
async function extractInvoiceWithGeminiVision(pdfBuffer, apiKey, modelName = 'gemini-2.5-flash') {
  console.log(`[AIService] 📄 Procesando PDF con modelo: ${modelName}...`);

  if (!apiKey) throw new Error('API Key de Gemini no proporcionada.');
  if (!pdfBuffer) throw new Error('Buffer de PDF no proporcionado.');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const visionModel = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: {
        role: 'system',
        parts: [{ text: INVOICE_EXTRACTION_SYSTEM_PROMPT }],
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    });

    const pdfBase64 = pdfBuffer.toString('base64');

    const result = await visionModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
            {
              text: 'Extrae todos los datos de esta factura en formato JSON según el esquema proporcionado.',
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: INVOICE_SCHEMA,
      },
    });

    const response = result?.response;
    if (!response) {
      throw new Error('Gemini Vision no devolvió una respuesta válida.');
    }

    const rawText =
      typeof response.text === 'function' ? response.text() : String(response.text || '');
    const parsed = JSON.parse(rawText);

    console.log('[AIService] ✅ Extracción con Gemini Vision completada.');
    return parsed;
  } catch (error) {
    const interpreted = interpretGeminiError(error);
    if (interpreted) {
      console.error(`[AIService] Error de Gemini (${interpreted.reason}):`, interpreted.logMessage);
      const handledError = new Error(interpreted.userMessage);
      handledError.statusCode = interpreted.statusCode;
      throw handledError;
    }

    console.error('[AIService] ❌ Error inesperado:', error.message);
    throw error;
  }
}

module.exports = {
  extractInvoiceWithGeminiVision,
};
