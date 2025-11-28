/**
 * Catálogo de Motivos para Notas de Crédito y Débito - SRI Ecuador
 * Actualizado según normativa vigente 2025
 */

/**
 * MOTIVOS DE NOTAS DE CRÉDITO
 * Razones por las cuales se puede emitir una nota de crédito
 */
const MOTIVOS_NOTA_CREDITO = {
  1: {
    codigo: '1',
    descripcion: 'Devolución de mercadería',
    tipo: 'CREDITO',
    requiereDetalle: true,
    afectaInventario: true,
    nota: 'Se debe especificar qué productos se devuelven y en qué cantidad',
  },
  2: {
    codigo: '2',
    descripcion: 'Descuento otorgado',
    tipo: 'CREDITO',
    requiereDetalle: true,
    afectaInventario: false,
    nota: 'Descuento adicional concedido después de la emisión de la factura',
  },
  3: {
    codigo: '3',
    descripcion: 'Anulación de factura',
    tipo: 'CREDITO',
    requiereDetalle: false,
    afectaInventario: true,
    nota: 'Anula completamente la factura original',
  },
  4: {
    codigo: '4',
    descripcion: 'Rebaja o devolución parcial',
    tipo: 'CREDITO',
    requiereDetalle: true,
    afectaInventario: true,
    nota: 'Devolución de parte de los productos facturados',
  },
  5: {
    codigo: '5',
    descripcion: 'Error en precio',
    tipo: 'CREDITO',
    requiereDetalle: true,
    afectaInventario: false,
    nota: 'Se facturó un precio mayor al acordado',
  },
  6: {
    codigo: '6',
    descripcion: 'Error en cantidad',
    tipo: 'CREDITO',
    requiereDetalle: true,
    afectaInventario: true,
    nota: 'Se facturó una cantidad mayor a la entregada',
  },
  7: {
    codigo: '7',
    descripcion: 'Productos defectuosos',
    tipo: 'CREDITO',
    requiereDetalle: true,
    afectaInventario: true,
    nota: 'Devolución por defectos de fabricación o calidad',
  },
  8: {
    codigo: '8',
    descripcion: 'Bonificación',
    tipo: 'CREDITO',
    requiereDetalle: true,
    afectaInventario: false,
    nota: 'Bonificación o descuento promocional posterior',
  },
  9: {
    codigo: '9',
    descripcion: 'Otros',
    tipo: 'CREDITO',
    requiereDetalle: true,
    afectaInventario: false,
    nota: 'Cualquier otro motivo válido no especificado',
  },
};

/**
 * MOTIVOS DE NOTAS DE DÉBITO
 * Razones por las cuales se puede emitir una nota de débito
 */
const MOTIVOS_NOTA_DEBITO = {
  1: {
    codigo: '1',
    descripcion: 'Intereses por mora',
    tipo: 'DEBITO',
    requiereCalculo: true,
    afectaInventario: false,
    nota: 'Cobro de intereses por retraso en el pago',
  },
  2: {
    codigo: '2',
    descripcion: 'Gastos de cobranza',
    tipo: 'DEBITO',
    requiereCalculo: false,
    afectaInventario: false,
    nota: 'Gastos incurridos en la gestión de cobro',
  },
  3: {
    codigo: '3',
    descripcion: 'Error en factura (precio menor)',
    tipo: 'DEBITO',
    requiereCalculo: true,
    afectaInventario: false,
    nota: 'Se facturó un precio menor al acordado',
  },
  4: {
    codigo: '4',
    descripcion: 'Error en cantidad (menor)',
    tipo: 'DEBITO',
    requiereCalculo: true,
    afectaInventario: true,
    nota: 'Se facturó una cantidad menor a la entregada',
  },
  5: {
    codigo: '5',
    descripcion: 'Gastos de transporte no incluidos',
    tipo: 'DEBITO',
    requiereCalculo: false,
    afectaInventario: false,
    nota: 'Cobro adicional por transporte no contemplado',
  },
  6: {
    codigo: '6',
    descripcion: 'Gastos adicionales',
    tipo: 'DEBITO',
    requiereCalculo: false,
    afectaInventario: false,
    nota: 'Otros gastos no incluidos en la factura original',
  },
  7: {
    codigo: '7',
    descripcion: 'Recargo por servicios adicionales',
    tipo: 'DEBITO',
    requiereCalculo: false,
    afectaInventario: false,
    nota: 'Cobro por servicios extras no facturados inicialmente',
  },
  8: {
    codigo: '8',
    descripcion: 'Ajuste de precio por tipo de cambio',
    tipo: 'DEBITO',
    requiereCalculo: true,
    afectaInventario: false,
    nota: 'Ajuste por variación en tipo de cambio (ventas internacionales)',
  },
  9: {
    codigo: '9',
    descripcion: 'Otros',
    tipo: 'DEBITO',
    requiereCalculo: false,
    afectaInventario: false,
    nota: 'Cualquier otro motivo válido no especificado',
  },
};

/**
 * TIPOS DE DOCUMENTOS MODIFICADOS (comprobantes que se pueden modificar)
 */
const TIPOS_DOCUMENTOS_MODIFICADOS = {
  '01': {
    codigo: '01',
    descripcion: 'Factura',
    permiteNotaCredito: true,
    permiteNotaDebito: true,
  },
  '03': {
    codigo: '03',
    descripcion: 'Liquidación de compra de bienes y prestación de servicios',
    permiteNotaCredito: true,
    permiteNotaDebito: true,
  },
  '04': {
    codigo: '04',
    descripcion: 'Nota de crédito',
    permiteNotaCredito: false,
    permiteNotaDebito: false,
    nota: 'No se pueden emitir notas sobre notas',
  },
  '05': {
    codigo: '05',
    descripcion: 'Nota de débito',
    permiteNotaCredito: false,
    permiteNotaDebito: false,
    nota: 'No se pueden emitir notas sobre notas',
  },
  41: {
    codigo: '41',
    descripcion: 'Comprobante de venta emitido por reembolso',
    permiteNotaCredito: true,
    permiteNotaDebito: true,
  },
};

/**
 * VALIDACIONES PARA NOTAS
 */
const VALIDACIONES_NOTAS = {
  // Tiempo máximo para emitir nota de crédito/débito después de la factura
  DIAS_MAX_EMISION: 180, // 6 meses según normativa SRI

  // Una nota no puede superar el monto de la factura
  VALIDAR_MONTO_MAXIMO: true,

  // Requiere autorización del SRI del comprobante modificado
  REQUIERE_AUTORIZACION_ORIGINAL: true,

  // Validar período fiscal
  VALIDAR_PERIODO_FISCAL: true,
};

/**
 * Obtiene información de un motivo de nota de crédito
 */
function obtenerMotivoNotaCredito(codigo) {
  codigo = String(codigo);
  return MOTIVOS_NOTA_CREDITO[codigo] || null;
}

/**
 * Obtiene información de un motivo de nota de débito
 */
function obtenerMotivoNotaDebito(codigo) {
  codigo = String(codigo);
  return MOTIVOS_NOTA_DEBITO[codigo] || null;
}

/**
 * Obtiene todos los motivos disponibles para un tipo de nota
 */
function obtenerMotivosDisponibles(tipoNota = 'CREDITO') {
  if (tipoNota === 'CREDITO') {
    return Object.values(MOTIVOS_NOTA_CREDITO);
  } else if (tipoNota === 'DEBITO') {
    return Object.values(MOTIVOS_NOTA_DEBITO);
  }
  return [];
}

/**
 * Valida si un documento puede ser modificado con una nota
 */
function validarDocumentoModificable(codigoDocumento, tipoNota) {
  const documento = TIPOS_DOCUMENTOS_MODIFICADOS[codigoDocumento];

  if (!documento) {
    return {
      valido: false,
      mensaje: 'Tipo de documento no válido',
    };
  }

  if (tipoNota === 'CREDITO' && !documento.permiteNotaCredito) {
    return {
      valido: false,
      mensaje: documento.nota || 'Este documento no permite notas de crédito',
    };
  }

  if (tipoNota === 'DEBITO' && !documento.permiteNotaDebito) {
    return {
      valido: false,
      mensaje: documento.nota || 'Este documento no permite notas de débito',
    };
  }

  return {
    valido: true,
    mensaje: 'Documento válido para modificación',
  };
}

/**
 * Valida que una nota cumpla con las restricciones del SRI
 */
function validarNota(datos) {
  const errores = [];

  // Validar monto
  if (VALIDACIONES_NOTAS.VALIDAR_MONTO_MAXIMO) {
    if (datos.montoNota > datos.montoDocumentoOriginal) {
      errores.push('El monto de la nota no puede superar el monto del documento original');
    }
  }

  // Validar fecha
  if (datos.fechaEmisionNota && datos.fechaEmisionOriginal) {
    const fechaNota = new Date(datos.fechaEmisionNota.split('/').reverse().join('-'));
    const fechaOriginal = new Date(datos.fechaEmisionOriginal.split('/').reverse().join('-'));
    const diasDiferencia = Math.floor((fechaNota - fechaOriginal) / (1000 * 60 * 60 * 24));

    if (diasDiferencia > VALIDACIONES_NOTAS.DIAS_MAX_EMISION) {
      errores.push(
        `No se puede emitir la nota después de ${VALIDACIONES_NOTAS.DIAS_MAX_EMISION} días de emitida la factura`
      );
    }

    if (diasDiferencia < 0) {
      errores.push('La fecha de la nota no puede ser anterior a la del documento original');
    }
  }

  // Validar autorización del documento original
  if (VALIDACIONES_NOTAS.REQUIERE_AUTORIZACION_ORIGINAL) {
    if (!datos.autorizacionDocumentoOriginal || datos.autorizacionDocumentoOriginal.length !== 49) {
      errores.push('Se requiere la clave de acceso (autorización) del documento original');
    }
  }

  // Validar motivo
  const tipoNota = datos.tipoNota || 'CREDITO';
  const motivo =
    tipoNota === 'CREDITO'
      ? obtenerMotivoNotaCredito(datos.codigoMotivo)
      : obtenerMotivoNotaDebito(datos.codigoMotivo);

  if (!motivo) {
    errores.push('Código de motivo inválido');
  }

  return {
    valida: errores.length === 0,
    errores,
  };
}

/**
 * Calcula el impacto en inventario de una nota
 */
function calcularImpactoInventario(tipoNota, codigoMotivo, detalles) {
  const motivo =
    tipoNota === 'CREDITO'
      ? obtenerMotivoNotaCredito(codigoMotivo)
      : obtenerMotivoNotaDebito(codigoMotivo);

  if (!motivo || !motivo.afectaInventario) {
    return {
      afectaInventario: false,
      movimientos: [],
    };
  }

  const movimientos = [];

  detalles.forEach((detalle) => {
    if (detalle.cantidad && detalle.codigoProducto) {
      movimientos.push({
        codigoProducto: detalle.codigoProducto,
        cantidad: detalle.cantidad,
        tipo: tipoNota === 'CREDITO' ? 'DEVOLUCION' : 'SALIDA_ADICIONAL',
        motivo: motivo.descripcion,
      });
    }
  });

  return {
    afectaInventario: true,
    movimientos,
  };
}

/**
 * Genera sugerencia de motivo según descripción
 */
function sugerirMotivo(descripcionBusqueda, tipoNota = 'CREDITO') {
  descripcionBusqueda = descripcionBusqueda.toLowerCase();
  const motivos = tipoNota === 'CREDITO' ? MOTIVOS_NOTA_CREDITO : MOTIVOS_NOTA_DEBITO;

  const resultados = Object.values(motivos).filter((motivo) =>
    motivo.descripcion.toLowerCase().includes(descripcionBusqueda)
  );

  return resultados.length > 0 ? resultados[0] : null;
}

module.exports = {
  MOTIVOS_NOTA_CREDITO,
  MOTIVOS_NOTA_DEBITO,
  TIPOS_DOCUMENTOS_MODIFICADOS,
  VALIDACIONES_NOTAS,
  obtenerMotivoNotaCredito,
  obtenerMotivoNotaDebito,
  obtenerMotivosDisponibles,
  validarDocumentoModificable,
  validarNota,
  calcularImpactoInventario,
  sugerirMotivo,
};
