/**
 * CATÁLOGO DE DATOS PARA GUÍAS DE REMISIÓN - SRI ECUADOR
 *
 * Catálogo completo de motivos de traslado, tipos de transporte
 * y datos requeridos según normativa SRI para Guías de Remisión
 *
 * Esquema: GuiaRemision v1.1.0
 * Fecha implementación: 2025-11-18
 */

/**
 * MOTIVOS DE TRASLADO - Tabla oficial SRI
 * Código de 2 dígitos obligatorio en el XML
 */
const MOTIVOS_TRASLADO = [
  { codigo: '01', descripcion: 'Venta', requiereDestinatario: true, afectaInventario: true },
  { codigo: '02', descripcion: 'Compra', requiereDestinatario: true, afectaInventario: true },
  { codigo: '03', descripcion: 'Devolución', requiereDocumentoRef: true, afectaInventario: true },
  {
    codigo: '04',
    descripcion: 'Consignación',
    requiereDestinatario: true,
    afectaInventario: false,
  },
  {
    codigo: '05',
    descripcion: 'Traslado entre establecimientos de la misma empresa',
    requiereDestinatario: true,
    afectaInventario: true,
  },
  {
    codigo: '06',
    descripcion: 'Traslado por emisor itinerante de comprobantes de venta',
    requiereRuta: true,
    afectaInventario: false,
  },
  {
    codigo: '07',
    descripcion: 'Traslado para transformación',
    requiereDestinatario: true,
    afectaInventario: true,
  },
  { codigo: '08', descripcion: 'Importación', requiereAduanas: true, afectaInventario: true },
  { codigo: '09', descripcion: 'Exportación', requiereAduanas: true, afectaInventario: true },
  { codigo: '10', descripcion: 'Otros', requiereObservacion: true, afectaInventario: false },
];

/**
 * TIPOS DE IDENTIFICACIÓN DEL TRANSPORTISTA
 */
const TIPOS_IDENTIFICACION_TRANSPORTISTA = [
  { codigo: '04', descripcion: 'RUC', longitud: 13, formato: /^\d{13}$/, requiereRUC: true },
  { codigo: '05', descripcion: 'Cédula', longitud: 10, formato: /^\d{10}$/, requiereRUC: false },
  {
    codigo: '06',
    descripcion: 'Pasaporte',
    longitud: null,
    formato: /^[A-Z0-9]{6,20}$/,
    requiereRUC: false,
  },
  {
    codigo: '07',
    descripcion: 'Consumidor Final',
    longitud: 13,
    formato: /^9999999999999$/,
    requiereRUC: false,
  },
  {
    codigo: '08',
    descripcion: 'Identificación del exterior',
    longitud: null,
    formato: /^.{1,20}$/,
    requiereRUC: false,
  },
];

/**
 * VALIDACIONES PARA GUÍA DE REMISIÓN
 */
const VALIDACIONES_GUIA = {
  // Fecha: La guía debe emitirse el día del traslado o hasta 5 días antes
  diasAntesTraslado: 5,
  diasDespuesTraslado: 0,

  // Direcciones
  direccionMinLength: 10,
  direccionMaxLength: 300,

  // Transportista
  placaVehiculoFormato: /^[A-Z]{3}[-]?\d{3,4}$/i,

  // Ruta
  maxDestinatarios: 10,
  maxProductosPorDestinatario: 100,

  // Peso/Cantidad
  pesoMinimo: 0.01, // kg
  cantidadMinima: 1,
};

/**
 * VALIDAR DATOS DE GUÍA DE REMISIÓN
 * @param {object} guia - Datos de la guía
 * @returns {object} { valida: boolean, errores: string[] }
 */
function validarGuiaRemision(guia) {
  const errores = [];

  // 1. Validar información básica
  if (!guia.establecimiento || !guia.puntoEmision || !guia.secuencial) {
    errores.push('Datos de establecimiento incompletos');
  }

  // 2. Validar motivo de traslado
  const motivo = MOTIVOS_TRASLADO.find((m) => m.codigo === guia.motivoTraslado);
  if (!motivo) {
    errores.push('Motivo de traslado inválido');
  } else {
    // Validaciones específicas por motivo
    if (motivo.requiereDestinatario && (!guia.destinatarios || guia.destinatarios.length === 0)) {
      errores.push(`El motivo "${motivo.descripcion}" requiere al menos un destinatario`);
    }

    if (motivo.requiereDocumentoRef && !guia.documentoReferencia) {
      errores.push(`El motivo "${motivo.descripcion}" requiere documento de referencia`);
    }

    if (motivo.requiereObservacion && !guia.observacion) {
      errores.push(`El motivo "${motivo.descripcion}" requiere observación detallada`);
    }
  }

  // 3. Validar fechas
  const fechaInicio = new Date(guia.fechaInicioTransporte);
  const fechaEmision = new Date(guia.fechaEmision);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diffDias = Math.floor((fechaInicio - fechaEmision) / (1000 * 60 * 60 * 24));

  if (diffDias < 0 || diffDias > VALIDACIONES_GUIA.diasAntesTraslado) {
    errores.push(
      `La guía debe emitirse máximo ${VALIDACIONES_GUIA.diasAntesTraslado} días antes del traslado`
    );
  }

  if (fechaInicio > new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000)) {
    errores.push('La fecha de traslado no puede ser mayor a 30 días futuros');
  }

  // 4. Validar transportista
  if (guia.transportista) {
    const tipoId = TIPOS_IDENTIFICACION_TRANSPORTISTA.find(
      (t) => t.codigo === guia.transportista.tipoIdentificacion
    );

    if (!tipoId) {
      errores.push('Tipo de identificación del transportista inválido');
    } else {
      if (tipoId.longitud && guia.transportista.identificacion.length !== tipoId.longitud) {
        errores.push(`${tipoId.descripcion} debe tener ${tipoId.longitud} dígitos`);
      }

      if (!tipoId.formato.test(guia.transportista.identificacion)) {
        errores.push(`Formato de ${tipoId.descripcion} inválido`);
      }
    }

    // Validar placa si hay vehículo
    if (
      guia.transportista.placa &&
      !VALIDACIONES_GUIA.placaVehiculoFormato.test(guia.transportista.placa)
    ) {
      errores.push('Formato de placa de vehículo inválido (Ej: ABC-1234)');
    }

    if (!guia.transportista.razonSocial || guia.transportista.razonSocial.length < 3) {
      errores.push('Razón social del transportista requerida');
    }
  } else {
    errores.push('Datos del transportista requeridos');
  }

  // 5. Validar dirección de partida
  if (
    !guia.direccionPartida ||
    guia.direccionPartida.length < VALIDACIONES_GUIA.direccionMinLength
  ) {
    errores.push(
      `Dirección de partida debe tener mínimo ${VALIDACIONES_GUIA.direccionMinLength} caracteres`
    );
  }

  // 6. Validar destinatarios
  if (!guia.destinatarios || guia.destinatarios.length === 0) {
    errores.push('Debe incluir al menos un destinatario');
  } else {
    if (guia.destinatarios.length > VALIDACIONES_GUIA.maxDestinatarios) {
      errores.push(`Máximo ${VALIDACIONES_GUIA.maxDestinatarios} destinatarios por guía`);
    }

    guia.destinatarios.forEach((dest, idx) => {
      // Validar identificación
      const tipoId = TIPOS_IDENTIFICACION_TRANSPORTISTA.find(
        (t) => t.codigo === dest.tipoIdentificacion
      );
      if (!tipoId) {
        errores.push(`Destinatario ${idx + 1}: Tipo de identificación inválido`);
      }

      // Validar dirección
      if (!dest.direccion || dest.direccion.length < VALIDACIONES_GUIA.direccionMinLength) {
        errores.push(`Destinatario ${idx + 1}: Dirección muy corta`);
      }

      // Validar productos
      if (!dest.productos || dest.productos.length === 0) {
        errores.push(`Destinatario ${idx + 1}: Debe incluir al menos un producto`);
      } else {
        dest.productos.forEach((prod, pidx) => {
          if (!prod.cantidad || prod.cantidad < VALIDACIONES_GUIA.cantidadMinima) {
            errores.push(`Destinatario ${idx + 1}, Producto ${pidx + 1}: Cantidad inválida`);
          }

          if (!prod.descripcion || prod.descripcion.length < 3) {
            errores.push(`Destinatario ${idx + 1}, Producto ${pidx + 1}: Descripción requerida`);
          }
        });
      }
    });
  }

  return {
    valida: errores.length === 0,
    errores,
  };
}

/**
 * OBTENER MOTIVOS DE TRASLADO DISPONIBLES
 * @returns {Array} Lista de motivos con información completa
 */
function obtenerMotivosTraslado() {
  return MOTIVOS_TRASLADO.map((m) => ({
    ...m,
    validaciones: {
      requiereDestinatario: m.requiereDestinatario || false,
      requiereDocumentoRef: m.requiereDocumentoRef || false,
      requiereRuta: m.requiereRuta || false,
      requiereAduanas: m.requiereAduanas || false,
      requiereObservacion: m.requiereObservacion || false,
      afectaInventario: m.afectaInventario || false,
    },
  }));
}

/**
 * CALCULAR IMPACTO EN INVENTARIO
 * @param {object} guia - Datos de la guía
 * @returns {object} Información del impacto
 */
function calcularImpactoInventario(guia) {
  const motivo = MOTIVOS_TRASLADO.find((m) => m.codigo === guia.motivoTraslado);

  if (!motivo || !motivo.afectaInventario) {
    return { afecta: false, tipo: 'ninguno' };
  }

  // Determinar tipo de movimiento según motivo
  const tiposMovimiento = {
    '01': 'salida', // Venta
    '02': 'entrada', // Compra
    '03': 'entrada', // Devolución
    '05': 'transferencia', // Traslado entre establecimientos
    '07': 'salida', // Transformación
    '08': 'entrada', // Importación
    '09': 'salida', // Exportación
  };

  const tipo = tiposMovimiento[guia.motivoTraslado] || 'salida';

  // Calcular totales por destinatario
  const detallesPorDestinatario = guia.destinatarios.map((dest) => {
    const productos = dest.productos.map((p) => ({
      codigoInterno: p.codigoInterno,
      descripcion: p.descripcion,
      cantidad: p.cantidad,
      establecimientoOrigen: guia.establecimiento,
      establecimientoDestino: dest.establecimiento || null,
    }));

    return {
      destinatario: dest.razonSocial,
      identificacion: dest.identificacion,
      productos,
    };
  });

  return {
    afecta: true,
    tipo,
    fecha: guia.fechaInicioTransporte,
    detalles: detallesPorDestinatario,
    observacion:
      tipo === 'transferencia'
        ? 'Traslado entre establecimientos - actualizar ubicación'
        : `Movimiento de ${tipo} por guía de remisión`,
  };
}

/**
 * VALIDAR FORMATO DE PLACA
 * @param {string} placa - Placa del vehículo
 * @returns {boolean} true si es válida
 */
function validarPlacaVehiculo(placa) {
  if (!placa) return false;
  return VALIDACIONES_GUIA.placaVehiculoFormato.test(placa);
}

/**
 * OBTENER TIPOS DE IDENTIFICACIÓN PARA TRANSPORTISTA
 * @returns {Array} Lista de tipos válidos
 */
function obtenerTiposIdentificacionTransportista() {
  return TIPOS_IDENTIFICACION_TRANSPORTISTA;
}

module.exports = {
  MOTIVOS_TRASLADO,
  TIPOS_IDENTIFICACION_TRANSPORTISTA,
  VALIDACIONES_GUIA,
  validarGuiaRemision,
  obtenerMotivosTraslado,
  calcularImpactoInventario,
  validarPlacaVehiculo,
  obtenerTiposIdentificacionTransportista,
};
