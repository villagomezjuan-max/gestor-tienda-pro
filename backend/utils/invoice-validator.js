/**
 * Validador de Coherencia Matemática de Facturas
 * Basado en el validador del programa Python de extracción de facturas
 *
 * Verifica que los cálculos de la factura sean coherentes:
 * - Suma de productos = Subtotal
 * - Subtotal - Descuentos + Impuestos - Retenciones = Total
 */

/**
 * Convierte un valor a número flotante de forma segura
 * @param {*} val - Valor a convertir
 * @returns {number} - Número flotante
 */
function getFloat(val) {
  if (typeof val === 'number') {
    return val;
  }
  if (typeof val === 'string' && val.trim()) {
    // Eliminar símbolos de moneda y comas
    const cleaned = val.replace(/[$,€MXN USD]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0.0 : parsed;
  }
  return 0.0;
}

/**
 * Valida la coherencia matemática de una factura extraída
 * @param {object} data - Datos de la factura
 * @returns {object} - Resultado de la validación
 */
function validateInvoiceData(data) {
  const results = {
    is_valid: true,
    errors: [],
    warnings: [],
    details: {},
    score: 100, // Puntaje de confianza (0-100)
  };

  try {
    // 1. VALIDAR SUMA DE PRODUCTOS VS SUBTOTAL
    const productos = data.productos || data.items || [];
    let calc_subtotal_prod = 0.0;
    let productsWithIssues = 0;

    for (let i = 0; i < productos.length; i++) {
      const p = productos[i];
      const cant = getFloat(p.cantidad);
      const precio = getFloat(p.precio_unitario || p.precioUnitario);
      const subtotal_prod = getFloat(p.subtotal);
      const total_prod = getFloat(p.total);

      // Validar cálculo de línea
      const expected_subtotal = cant * precio;
      const diff_linea = Math.abs(expected_subtotal - subtotal_prod);

      if (diff_linea > 0.1 && subtotal_prod > 0) {
        results.warnings.push(
          `⚠️ Producto #${i + 1}: Cantidad (${cant}) × Precio (${precio.toFixed(2)}) = ${expected_subtotal.toFixed(2)}, pero subtotal dice ${subtotal_prod.toFixed(2)}`
        );
        productsWithIssues++;
        results.score -= 5;
      }

      // Sumar al subtotal calculado
      if (subtotal_prod > 0) {
        calc_subtotal_prod += subtotal_prod;
      } else if (total_prod > 0) {
        calc_subtotal_prod += total_prod;
      } else {
        calc_subtotal_prod += expected_subtotal;
      }
    }

    // Obtener subtotal extraído
    const extracted_subtotal = getFloat(data.totales?.subtotal || data.subtotal || 0);

    // Margen de tolerancia para redondeo
    const diff_subtotal = Math.abs(calc_subtotal_prod - extracted_subtotal);

    results.details.calc_subtotal_productos = calc_subtotal_prod;
    results.details.extracted_subtotal = extracted_subtotal;
    results.details.diff_subtotal = diff_subtotal;

    if (diff_subtotal > 1.0) {
      results.warnings.push(
        `⚠️ Discrepancia en Subtotal: Suma de productos ($${calc_subtotal_prod.toFixed(2)}) vs Subtotal extraído ($${extracted_subtotal.toFixed(2)}) - Diferencia: $${diff_subtotal.toFixed(2)}`
      );
      results.score -= 10;
    }

    // 2. VALIDAR OPERACIÓN ARITMÉTICA FINAL
    // Total = Subtotal - Descuentos + Impuestos - Retenciones
    const extracted_iva = getFloat(data.totales?.iva || data.iva || 0);
    const extracted_descuento = getFloat(data.totales?.descuento || data.descuento || 0);
    const extracted_otros = getFloat(data.totales?.otros_impuestos || data.otrosImpuestos || 0);
    const extracted_total = getFloat(data.totales?.total || data.total || 0);

    // Retenciones
    const ret_iva = getFloat(data.totales?.iva_retenido || 0);
    const ret_isr = getFloat(data.totales?.isr_retenido || 0);
    const total_retenciones = ret_iva + ret_isr;

    // Calcular total esperado
    const calc_total =
      extracted_subtotal -
      extracted_descuento +
      extracted_iva +
      extracted_otros -
      total_retenciones;
    const diff_total = Math.abs(calc_total - extracted_total);

    results.details.calc_total = calc_total;
    results.details.extracted_total = extracted_total;
    results.details.diff_total = diff_total;
    results.details.formula = `${extracted_subtotal.toFixed(2)} - ${extracted_descuento.toFixed(2)} + ${extracted_iva.toFixed(2)} + ${extracted_otros.toFixed(2)} - ${total_retenciones.toFixed(2)} = ${calc_total.toFixed(2)}`;

    if (diff_total > 1.0) {
      results.errors.push(
        `❌ Error Matemático: (Subtotal - Desc + IVA + Otros - Ret) = $${calc_total.toFixed(2)}, pero el documento dice $${extracted_total.toFixed(2)} - Diferencia: $${diff_total.toFixed(2)}`
      );
      results.is_valid = false;
      results.score -= 20;
    }

    // 3. VALIDAR IVA (aproximadamente 16% del subtotal en México, 12% en Ecuador)
    if (extracted_iva > 0 && extracted_subtotal > 0) {
      const porcentaje_iva = (extracted_iva / extracted_subtotal) * 100;
      results.details.porcentaje_iva = porcentaje_iva;

      if (porcentaje_iva < 5 || porcentaje_iva > 25) {
        results.warnings.push(
          `⚠️ El IVA ($${extracted_iva.toFixed(2)}) representa ${porcentaje_iva.toFixed(2)}% del subtotal. Verifica si es correcto.`
        );
        results.score -= 5;
      }
    }

    // 4. VALIDAR QUE HAY PRODUCTOS
    if (productos.length === 0) {
      results.errors.push('❌ No se detectaron productos en la factura');
      results.is_valid = false;
      results.score -= 30;
    }

    // 5. VALIDAR CAMPOS OBLIGATORIOS
    const required_fields = [
      { path: ['vendedor', 'proveedor'], field: 'nombre', label: 'Nombre del Vendedor' },
      { path: ['comprador'], field: 'nombre', label: 'Nombre del Comprador' },
      {
        path: ['detalles_factura'],
        field: 'numero',
        label: 'Número de Factura',
        alt: 'numero_factura',
      },
      {
        path: ['detalles_factura'],
        field: 'fecha_emision',
        label: 'Fecha de Emisión',
        alt: 'fecha',
      },
    ];

    required_fields.forEach((req) => {
      let found = false;
      for (const p of req.path) {
        if (data[p] && (data[p][req.field] || (req.alt && data[p][req.alt]))) {
          found = true;
          break;
        }
      }
      if (!found && req.alt && data[req.alt]) {
        found = true;
      }
      if (!found) {
        results.warnings.push(`⚠️ Campo requerido faltante: ${req.label}`);
        results.score -= 3;
      }
    });

    // 6. CALCULAR PUNTAJE FINAL
    results.score = Math.max(0, Math.min(100, results.score));

    // Determinar nivel de confianza
    if (results.score >= 90) {
      results.confidence = 'HIGH';
      results.confidence_label = '✅ Alta Confianza';
    } else if (results.score >= 70) {
      results.confidence = 'MEDIUM';
      results.confidence_label = '⚠️ Confianza Media';
    } else {
      results.confidence = 'LOW';
      results.confidence_label = '❌ Baja Confianza';
    }

    // Resumen
    results.summary = {
      total_productos: productos.length,
      productos_con_problemas: productsWithIssues,
      total_errores: results.errors.length,
      total_advertencias: results.warnings.length,
      puntaje: results.score,
      confianza: results.confidence,
    };
  } catch (error) {
    results.warnings.push(`⚠️ No se pudo validar completamente: ${error.message}`);
    results.score -= 10;
  }

  return results;
}

/**
 * Normaliza los datos de una factura para que coincidan con el schema esperado
 * Convierte entre diferentes formatos (Ecuador SRI vs México CFDI)
 * @param {object} data - Datos crudos de la factura
 * @returns {object} - Datos normalizados
 */
function normalizeInvoiceData(data) {
  const normalized = {
    vendedor: data.vendedor || data.proveedor || {},
    comprador: data.comprador || {},
    detalles_factura: data.detalles_factura || {},
    productos: data.productos || data.items || [],
    totales: data.totales || {},
    observaciones: data.observaciones || '',
    notas: data.notas || '',
    moneda: data.moneda || data.detalles_factura?.moneda || 'MXN',
  };

  // Migrar campos de nivel superior si existen
  if (data.numero_factura && !normalized.detalles_factura.numero) {
    normalized.detalles_factura.numero = data.numero_factura;
  }
  if (data.fecha && !normalized.detalles_factura.fecha_emision) {
    normalized.detalles_factura.fecha_emision = data.fecha;
  }
  if (data.subtotal !== undefined && !normalized.totales.subtotal) {
    normalized.totales.subtotal = data.subtotal;
  }
  if (data.iva !== undefined && !normalized.totales.iva) {
    normalized.totales.iva = data.iva;
  }
  if (data.total !== undefined && !normalized.totales.total) {
    normalized.totales.total = data.total;
  }
  if (data.otrosImpuestos !== undefined && !normalized.totales.otros_impuestos) {
    normalized.totales.otros_impuestos = data.otrosImpuestos;
  }

  // Normalizar productos
  normalized.productos = normalized.productos.map((p) => ({
    clave: p.clave || p.codigo || '',
    descripcion: p.descripcion || p.nombre || '',
    unidad: p.unidad || '',
    cantidad: getFloat(p.cantidad),
    precio_unitario: getFloat(p.precio_unitario || p.precioUnitario),
    descuento: getFloat(p.descuento || 0),
    subtotal: getFloat(p.subtotal),
    impuestos: getFloat(p.impuestos || 0),
    total: getFloat(p.total),
    categoria: p.categoria || '',
    categoriaId: p.categoriaId || null,
    proveedorId: p.proveedorId || null,
    proveedorNombre: p.proveedorNombre || '',
  }));

  return normalized;
}

module.exports = {
  validateInvoiceData,
  normalizeInvoiceData,
  getFloat,
};
