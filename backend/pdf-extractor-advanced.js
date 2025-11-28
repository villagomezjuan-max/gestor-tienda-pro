/**
 * EXTRACTOR AVANZADO DE PDF CON DETECCIÓN DE TABLAS
 * Sistema híbrido que detecta estructura de tablas automáticamente
 * sin usar IA para máxima precisión en cantidades
 */

const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

class AdvancedPDFExtractor {
  constructor() {
    this.COLUMN_PATTERNS = {
      cantidad: /^(cant|qty|cantidad|uds?|pzas?|unid|ctd|cnt|c\.?)\.?$/i,
      producto: /^(producto|descripci[oó]n|art[íi]culo|detalle|item|desc)\.?$/i,
      precioUnit: /^(p\.?\s*unit|precio\s*unit|p[\.\/]u|unit|p\s*u|precio|prec)\.?$/i,
      subtotal: /^(subtotal|sub\s*total|total|importe|valor|import)\.?$/i,
      codigo: /^(c[oó]d|code|ref|sku|art)\.?$/i,
    };

    // Palabras que indican fin de tabla de productos
    this.TABLE_END_KEYWORDS = [
      'subtotal',
      'sub-total',
      'sub total',
      'iva',
      'impuesto',
      'tax',
      'total',
      'neto',
      'a pagar',
      'descuento',
      'recargo',
      'observaciones',
      'notas',
      'comentarios',
      'forma de pago',
      'método de pago',
      'vencimiento',
      'validez',
    ];
  }

  async extractFromBuffer(buffer) {
    try {
      console.log('[PDF Extractor] Iniciando extracción...');
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;

      console.log(`[PDF Extractor] PDF cargado: ${pdf.numPages} páginas`);

      const allPages = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageData = await this.extractTableFromPage(textContent, pageNum);
        allPages.push(pageData);
      }

      const result = this.consolidateInvoiceData(allPages);
      console.log(`[PDF Extractor] ✅ Extracción completada: ${result.items.length} items`);
      return result;
    } catch (error) {
      console.error('[PDF Extractor] ❌ Error:', error.message);
      throw error;
    }
  }

  async extractTableFromPage(textContent, pageNum) {
    const items = textContent.items
      .map((item) => ({
        text: item.str.trim(),
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        width: item.width,
        height: item.height,
        font: item.fontName,
      }))
      .filter((item) => item.text.length > 0);

    // Agrupar por líneas (misma posición Y)
    const lines = this.groupIntoLines(items);

    console.log(`[PDF Extractor] Página ${pageNum}: ${lines.length} líneas detectadas`);

    // Detectar encabezado de tabla
    const headerLine = this.detectTableHeader(lines);
    if (!headerLine) {
      console.log(`[PDF Extractor] Página ${pageNum}: No se detectó tabla estructurada`);
      return { pageNum, items: [], metadata: this.extractMetadata(lines) };
    }

    // Mapear columnas
    const columnMap = this.mapColumns(headerLine);
    console.log(`[PDF Extractor] Página ${pageNum} - Columnas:`, Object.keys(columnMap));

    // Extraer filas de productos
    const productRows = this.extractProductRows(lines, headerLine, columnMap);

    // Extraer metadata
    const metadata = this.extractMetadata(lines);

    console.log(`[PDF Extractor] Página ${pageNum}: ${productRows.length} productos extraídos`);

    return { pageNum, items: productRows, metadata };
  }

  groupIntoLines(items, tolerance = 5) {
    const lines = [];
    const sorted = [...items].sort((a, b) => b.y - a.y);

    sorted.forEach((item) => {
      let placed = false;
      for (const line of lines) {
        if (Math.abs(line.y - item.y) <= tolerance) {
          line.items.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) {
        lines.push({ y: item.y, items: [item] });
      }
    });

    // Ordenar items dentro de cada línea por X
    lines.forEach((line) => {
      line.items.sort((a, b) => a.x - b.x);
    });

    return lines.sort((a, b) => b.y - a.y);
  }

  detectTableHeader(lines) {
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const line = lines[i];
      const texts = line.items.map((item) => item.text.toLowerCase());

      const hasQtyColumn = texts.some((t) => this.COLUMN_PATTERNS.cantidad.test(t));
      const hasProductColumn = texts.some((t) => this.COLUMN_PATTERNS.producto.test(t));

      if (hasQtyColumn || hasProductColumn) {
        return line;
      }
    }
    return null;
  }

  mapColumns(headerLine) {
    const columnMap = {};

    headerLine.items.forEach((item, index) => {
      const text = item.text.toLowerCase().replace(/[^a-záéíóúñ]/gi, '');

      if (this.COLUMN_PATTERNS.cantidad.test(item.text)) {
        columnMap.cantidad = { index, x: item.x, width: 50 };
      } else if (this.COLUMN_PATTERNS.producto.test(item.text)) {
        columnMap.producto = { index, x: item.x, width: 200 };
      } else if (this.COLUMN_PATTERNS.precioUnit.test(item.text)) {
        columnMap.precioUnit = { index, x: item.x, width: 80 };
      } else if (this.COLUMN_PATTERNS.subtotal.test(item.text)) {
        columnMap.subtotal = { index, x: item.x, width: 80 };
      } else if (this.COLUMN_PATTERNS.codigo.test(item.text)) {
        columnMap.codigo = { index, x: item.x, width: 80 };
      }
    });

    // Si no hay columna de cantidad pero hay código, usar código como referencia
    if (!columnMap.cantidad && columnMap.codigo) {
      columnMap.cantidad = { ...columnMap.codigo, isCodigo: true };
    }

    return columnMap;
  }

  extractProductRows(lines, headerLine, columnMap) {
    const products = [];
    const headerIndex = lines.indexOf(headerLine);
    const tolerance = 40;

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];

      // Verificar si llegamos al final de la tabla
      const lineText = line.items.map((item) => item.text.toLowerCase()).join(' ');
      const isTableEnd = this.TABLE_END_KEYWORDS.some(
        (keyword) => lineText.includes(keyword) && !lineText.match(/\d+\s*x\s*\d+/)
      );

      if (isTableEnd) {
        console.log('[PDF Extractor] Fin de tabla detectado en línea:', lineText.substring(0, 50));
        break;
      }

      const row = this.parseProductRow(line, columnMap, tolerance);

      if (row && row.nombre && row.cantidad > 0) {
        products.push(row);
      }
    }

    return products;
  }

  parseProductRow(line, columnMap, tolerance) {
    const findInColumn = (colName) => {
      if (!columnMap[colName]) return null;
      const targetX = columnMap[colName].x;
      const colWidth = columnMap[colName].width || 50;

      const candidates = line.items.filter((item) => {
        const inRange = item.x >= targetX - tolerance && item.x <= targetX + colWidth + tolerance;
        return inRange;
      });

      if (candidates.length === 0) return null;

      // Si hay múltiples candidatos, tomar el más cercano
      candidates.sort((a, b) => Math.abs(a.x - targetX) - Math.abs(b.x - targetX));
      return candidates[0].text;
    };

    const findAllInColumn = (colName) => {
      if (!columnMap[colName]) return [];
      const targetX = columnMap[colName].x;
      const colWidth = columnMap[colName].width || 200;

      return line.items
        .filter((item) => {
          return item.x >= targetX - tolerance && item.x <= targetX + colWidth + tolerance;
        })
        .map((item) => item.text);
    };

    // Extraer valores
    let cantidadText = findInColumn('cantidad');
    const productoTexts = findAllInColumn('producto');
    const precioText = findInColumn('precioUnit');
    const subtotalText = findInColumn('subtotal');

    // Si no encontramos cantidad pero sí código, buscar el primer número
    if (!cantidadText || cantidadText.match(/^[A-Z]/i)) {
      const allNumbers = line.items
        .map((item) => item.text)
        .filter((text) => /^\d+$/.test(text) || /^\d+[.,]\d{1,2}$/.test(text));

      if (allNumbers.length > 0) {
        // El primer número pequeño es probablemente la cantidad
        cantidadText =
          allNumbers.find((num) => {
            const val = this.parseNumber(num);
            return val && val >= 1 && val <= 1000;
          }) || allNumbers[0];
      }
    }

    const productoText = productoTexts.join(' ').trim();

    if (!productoText || productoText.length < 2) return null;

    // Parsear números
    const cantidad = this.parseNumber(cantidadText);
    const precioUnitario = this.parseNumber(precioText);
    const subtotalParsed = this.parseNumber(subtotalText);

    // Validación: si no hay cantidad pero hay precio y subtotal, calcular
    let cantidadFinal = cantidad;
    if ((!cantidadFinal || cantidadFinal <= 0) && precioUnitario > 0 && subtotalParsed > 0) {
      cantidadFinal = Math.round(subtotalParsed / precioUnitario);
      console.log(`[PDF Extractor] Cantidad calculada para "${productoText}": ${cantidadFinal}`);
    }

    if (!cantidadFinal || cantidadFinal <= 0) {
      cantidadFinal = 1;
    }

    // Validación: cantidad debe ser razonable (1-10000)
    if (cantidadFinal > 10000) {
      console.warn(`[PDF Extractor] Cantidad sospechosa (${cantidadFinal}), usando 1`);
      cantidadFinal = 1;
    }

    const subtotal = subtotalParsed || cantidadFinal * (precioUnitario || 0);

    return {
      nombre: this.cleanProductName(productoText),
      descripcion: this.generateDescription(productoText),
      unidad: 'unidad',
      cantidad: Math.round(cantidadFinal),
      precioUnitario: Number((precioUnitario || 0).toFixed(4)),
      subtotal: Number(subtotal.toFixed(4)),
    };
  }

  parseNumber(text) {
    if (!text || typeof text !== 'string') return null;

    // Remover todo excepto dígitos, puntos y comas
    const cleaned = text.replace(/[^\d.,]/g, '');
    if (!cleaned) return null;

    // Detectar formato
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');

    let normalized = cleaned;
    if (lastComma > lastDot) {
      // Formato europeo: 1.234,56
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot !== -1 && lastComma !== -1 && lastComma < lastDot) {
      // Formato americano: 1,234.56
      normalized = cleaned.replace(/,/g, '');
    } else if (lastComma !== -1 && lastDot === -1) {
      // Solo comas: puede ser separador de miles o decimal
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        // Probablemente decimal: 12,50
        normalized = cleaned.replace(',', '.');
      } else {
        // Probablemente miles: 1,234
        normalized = cleaned.replace(/,/g, '');
      }
    }

    const number = parseFloat(normalized);
    return isNaN(number) ? null : number;
  }

  cleanProductName(text) {
    // Remover prefijos de cantidad
    let cleaned = text.replace(/^\d+\s*(x|unid|pcs|pz|u)?\s*/i, '').trim();

    // Remover códigos al inicio (ej: AX12, BT-500)
    cleaned = cleaned.replace(/^[A-Z]{1,4}[-\s]?\d{1,5}\s+/i, '').trim();

    // Limitar longitud
    if (cleaned.length > 100) {
      cleaned = cleaned.substring(0, 100).trim();
    }

    return cleaned || text;
  }

  generateDescription(nombre) {
    const words = nombre.split(/\s+/).filter(Boolean);
    return words.slice(0, 8).join(' ');
  }

  extractMetadata(lines) {
    const metadata = {
      ruc: null,
      fecha: null,
      numero_factura: null,
      proveedor: null,
      direccion: null,
      telefono: null,
    };

    const allText = lines.map((l) => l.items.map((i) => i.text).join(' ')).join('\n');

    // RUC (Ecuador: 13 dígitos)
    const rucMatch =
      allText.match(/(?:ruc|r\.u\.c\.?)\s*:?\s*(\d{13})/i) || allText.match(/\b(\d{13})\b/);
    if (rucMatch) metadata.ruc = rucMatch[1];

    // Fecha (varios formatos)
    const dateMatch =
      allText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/) ||
      allText.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (dateMatch) {
      let [, d, m, y] = dateMatch;
      if (y.length === 2) y = `20${y}`;
      if (y.length === 4 && parseInt(y) > 2000) {
        // Formato ISO
        metadata.fecha = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else {
        metadata.fecha = `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }

    // Número de factura
    const facturaMatch = allText.match(
      /(?:factura|fact|comprobante|no\.?|#|n[uú]m)\s*:?\s*([A-Z0-9\-]+)/i
    );
    if (facturaMatch) metadata.numero_factura = facturaMatch[1];

    // Teléfono
    const telMatch = allText.match(/(?:tel|teléfono|telf|phone)\s*:?\s*([\d\s\-\(\)]+)/i);
    if (telMatch) {
      metadata.telefono = telMatch[1].replace(/\D/g, '').substring(0, 15);
    }

    return metadata;
  }

  consolidateInvoiceData(pages) {
    const allItems = pages.flatMap((p) => p.items);

    // Combinar metadata de todas las páginas
    const metadata = pages.reduce((acc, page) => {
      Object.keys(page.metadata).forEach((key) => {
        if (page.metadata[key] && !acc[key]) {
          acc[key] = page.metadata[key];
        }
      });
      return acc;
    }, {});

    if (allItems.length === 0) {
      console.warn('[PDF Extractor] No se encontraron items en el PDF');
      return null;
    }

    const subtotal = allItems.reduce((sum, item) => sum + item.subtotal, 0);
    const iva = subtotal * 0.15; // IVA Ecuador 15%
    const total = subtotal + iva;

    return {
      proveedor: {
        nombre: metadata.proveedor || null,
        ruc: metadata.ruc || null,
      },
      fecha: metadata.fecha || null,
      numero_factura: metadata.numero_factura || null,
      moneda: 'USD',
      subtotal: Number(subtotal.toFixed(2)),
      iva: Number(iva.toFixed(2)),
      otrosImpuestos: 0,
      total: Number(total.toFixed(2)),
      items: allItems,
    };
  }
}

module.exports = { AdvancedPDFExtractor };
