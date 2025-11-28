#!/usr/bin/env node

/**
 * CLI MEJORADO - Gemini PDF a JSON
 * Crea JSONs compatibles con Gestor Tienda Pro
 *
 * Requisitos:
 *  - Node.js >= 18
 *  - npm install @google/generative-ai
 *
 * Uso:
 *  node gemini_pdf_2_json_cli.js <PDF_PATH> [OUTPUT_DIR] [OPCIONES]
 *
 * Opciones:
 *  --model <MODEL_NAME>   Especifica el modelo a usar (ej: gemini-2.5-flash)
 *  --apiKey <API_KEY>       Usa una API key específica (sobrescribe la variable de entorno)
 *  --help, -h               Muestra esta ayuda
 */

import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import process from 'process';

// ====== PROMPT MEJORADO (igual al backend) ======
const SYSTEM_PROMPT = `Eres un servicio especializado en extraer datos estructurados de facturas.

REGLA CRÍTICA PARA CANTIDAD: La cantidad SIEMPRE es un número ENTERO (1, 2, 3, 10, 100) sin decimales.

NUNCA confundas estos valores:
  - CANTIDAD: número entero pequeño (generalmente 1-100), aparece en la columna "CANT" o "QTY"
  - CÓDIGO: texto alfanumérico (AX12, BT-500, etc.), ignóralo para la cantidad
  - PRECIO: número decimal (11.50, 23.99, etc.), aparece en columna "PRECIO" o "P.UNIT"
  - SUBTOTAL: número decimal (34.50, 47.98, etc.), aparece en columna "SUBTOTAL" o "TOTAL"

PROCESO PASO A PASO:
1. Busca la fila de encabezados: CANT | PRODUCTO | PRECIO | SUBTOTAL (o similares)
2. Para cada fila de producto DESPUÉS del encabezado:
   a) La PRIMERA columna numérica PEQUEÑA es la CANTIDAD (número entero entre 1-1000)
   b) El texto descriptivo es el PRODUCTO
   c) El siguiente número decimal es el PRECIO UNITARIO
   d) El último número es el SUBTOTAL
3. Verifica: SUBTOTAL = CANTIDAD × PRECIO (si no coincide, calcula cantidad = subtotal / precio)

EJEMPLOS:
Entrada: "2 | Aceite 20W50 | 11.50 | 23.00"
→ {cantidad: 2, nombre: "Aceite 20W50", precioUnitario: 11.50, subtotal: 23.00}

Entrada: "Filtro Aire ABC-500 | 1 | 15.99 | 15.99"
→ {cantidad: 1, nombre: "Filtro Aire ABC-500", precioUnitario: 15.99, subtotal: 15.99}

ESTRUCTURA JSON REQUERIDA (compatible con Gestor Tienda Pro):
{
  "proveedor": { 
    "nombre": "NOMBRE_PROVEEDOR", 
    "ruc": "RUC_SI_EXISTE" 
  },
  "fecha": "YYYY-MM-DD",
  "numero_factura": "NUMERO",
  "subtotal": SUBTOTAL_TOTAL_NUMERO,
  "iva": IVA_TOTAL_NUMERO,
  "otrosImpuestos": 0,
  "total": TOTAL_FACTURA_NUMERO,
  "moneda": "USD",
  "items": [
    {
      "nombre": "Producto sin cantidad en nombre",
      "descripcion": "Descripción breve del producto",
      "unidad": "unidad",
      "cantidad": ENTERO_SIN_DECIMALES,
      "precioUnitario": PRECIO_DECIMAL,
      "subtotal": SUBTOTAL_DECIMAL
    }
  ]
}

IMPORTANTE: 
- Responde SOLO con JSON válido, sin comentarios ni markdown
- NO incluyas la cantidad en el campo "nombre" del producto
- La cantidad DEBE ser un número entero (1, 2, 10, etc.)
- Todos los precios DEBEN ser números decimales con máximo 4 decimales`;

// ====== FUNCIÓN PRINCIPAL ======
async function procesarFactura(pdfPath, outputDir, { modelName, apiKey }) {
  try {
    console.log(`\n📄 Procesando: ${path.basename(pdfPath)}`);
    console.log(`🔧 Modelo: ${modelName}\n`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Validar PDF existe
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF no encontrado: ${pdfPath}`);
    }

    // Crear directorio de salida si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Creado directorio: ${outputDir}`);
    }

    // Leer PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfBuffer.toString('base64');

    console.log('🚀 Enviando a Gemini...');

    // Llamar a Gemini
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: pdfBase64,
                mimeType: 'application/pdf',
              },
            },
            {
              text: `${SYSTEM_PROMPT}\n\nAnaliza la siguiente factura y devuelve el JSON con la estructura indicada.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
    });

    let responseText = result.response.text();
    console.log('✅ Respuesta recibida\n');

    // Limpiar respuesta (remover markdown si existe)
    responseText = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // Parsear JSON
    let jsonData;
    try {
      jsonData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Error parseando JSON de Gemini:');
      console.error(responseText.substring(0, 500));
      throw new Error('Gemini no devolvió JSON válido');
    }

    // Validar estructura mínima
    if (!jsonData.items || !Array.isArray(jsonData.items)) {
      throw new Error("JSON no contiene array 'items'");
    }

    // Normalizar números
    jsonData.subtotal = Number(jsonData.subtotal || 0);
    jsonData.iva = Number(jsonData.iva || 0);
    jsonData.otrosImpuestos = Number(jsonData.otrosImpuestos || 0);
    jsonData.total = Number(jsonData.total || 0);

    jsonData.items = jsonData.items.map((item) => ({
      ...item,
      cantidad: Math.max(1, Math.round(Number(item.cantidad || 1))),
      precioUnitario: Number((item.precioUnitario || 0).toFixed(4)),
      subtotal: Number((item.subtotal || 0).toFixed(4)),
    }));

    // Recalcular totales
    const subtotalCalculado = jsonData.items.reduce(
      (sum, item) => sum + item.cantidad * item.precioUnitario,
      0
    );

    jsonData.subtotal = Number(subtotalCalculado.toFixed(2));
    jsonData.iva = jsonData.iva || Number((subtotalCalculado * 0.15).toFixed(2));
    jsonData.total = Number(
      (jsonData.subtotal + jsonData.iva + jsonData.otrosImpuestos).toFixed(2)
    );

    // Agregar metadata
    jsonData._metadata = {
      procesadoPor: 'gemini-cli',
      modelo: modelName,
      fecha: new Date().toISOString(),
      archivoOrigen: path.basename(pdfPath),
    };

    // Guardar JSON
    const baseName = path.basename(pdfPath, path.extname(pdfPath));
    const jsonPath = path.join(outputDir, `${baseName}.json`);

    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');

    // Resumen
    console.log('═══════════════════════════════════════════════');
    console.log('✅ PROCESAMIENTO EXITOSO');
    console.log('═══════════════════════════════════════════════');
    console.log(`📄 JSON guardado: ${jsonPath}`);
    console.log(`🛒 Items extraídos: ${jsonData.items.length}`);
    console.log(`💰 Total: $${jsonData.total.toFixed(2)}`);
    console.log(`🏢 Proveedor: ${jsonData.proveedor?.nombre || 'No detectado'}`);
    console.log(`📅 Fecha: ${jsonData.fecha || 'No detectada'}`);
    console.log('═══════════════════════════════════════════════\n');

    // Mostrar items
    console.log('📦 Items detectados:');
    jsonData.items.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.nombre} (x${item.cantidad}) - $${item.subtotal.toFixed(2)}`);
    });
    console.log('');

    return { success: true, jsonPath, data: jsonData };
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

// ====== CLI ======
async function main() {
  const args = process.argv.slice(2);

  const helpRequested = args.some((arg) => arg === '--help' || arg === '-h');
  if (args.length === 0 || helpRequested) {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║   CLI GEMINI PDF → JSON - Gestor Tienda Pro          ║
╚═══════════════════════════════════════════════════════╝

Uso:
  node gemini_pdf_2_json_cli.js <PDF_PATH> [OUTPUT_DIR] [OPCIONES]

Argumentos:
  <PDF_PATH>          Ruta al archivo PDF a procesar.
  [OUTPUT_DIR]        Directorio para guardar el JSON. 
                      (Por defecto, el mismo directorio del PDF)

Opciones:
  --model <MODEL_NAME>  Especifica el modelo de Gemini a usar.
                        Por defecto: 'gemini-2.5-flash'.
  --apiKey <API_KEY>    Usa una API key específica.
                        Por defecto: lee la variable de entorno GEMINI_API_KEY.
  --help, -h            Muestra esta ayuda.

Ejemplos:
  node gemini_pdf_2_json_cli.js factura.pdf
  node gemini_pdf_2_json_cli.js C:\\facturas\\factura.pdf .\\procesados
  node gemini_pdf_2_json_cli.js fact.pdf --model gemini-2.5-pro
  node gemini_pdf_2_json_cli.js fact.pdf --apiKey "AIza..."

Requisitos:
  - Node.js >= 18
  - npm install @google/generative-ai

Configurar API Key (PowerShell):
  $env:GEMINI_API_KEY = "tu-api-key"
  # O permanente:
  [System.Environment]::SetEnvironmentVariable('GEMINI_API_KEY', 'tu-key', 'User')
    `);
    process.exit(0);
  }

  // Parsear argumentos de opciones
  let modelName, apiKey;
  const optionIndices = new Set();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && i + 1 < args.length) {
      modelName = args[i + 1];
      optionIndices.add(i);
      optionIndices.add(i + 1);
      i++;
    } else if (args[i] === '--apiKey' && i + 1 < args.length) {
      apiKey = args[i + 1];
      optionIndices.add(i);
      optionIndices.add(i + 1);
      i++;
    } else if (args[i].startsWith('--')) {
      optionIndices.add(i);
    }
  }

  // Los argumentos posicionales son los que no son opciones
  const positionalArgs = args.filter((_, i) => !optionIndices.has(i));

  const pdfPath = positionalArgs[0] ? path.resolve(positionalArgs[0]) : null;
  const outputDir = positionalArgs[1]
    ? path.resolve(positionalArgs[1])
    : pdfPath
      ? path.dirname(pdfPath)
      : '.';

  if (!pdfPath) {
    console.error('❌ ERROR: Debes especificar la ruta al archivo PDF.');
    process.exit(1);
  }

  // ====== CONFIG ======
  const config = {
    modelName: modelName || 'gemini-2.5-flash',
    apiKey: apiKey || process.env.GEMINI_API_KEY,
  };

  if (!config.apiKey) {
    console.error('❌ ERROR: No se encontró la API Key.');
    console.error(
      '   Proporciónala con --apiKey o configura la variable de entorno GEMINI_API_KEY.'
    );
    process.exit(1);
  }

  const result = await procesarFactura(pdfPath, outputDir, config);

  process.exit(result.success ? 0 : 1);
}

main();
