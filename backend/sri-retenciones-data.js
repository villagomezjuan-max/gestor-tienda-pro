/**
 * Tabla de Códigos de Retención del SRI Ecuador 2025
 * Actualizado según Resolución NAC-DGERCGC25-00000001
 * Fuente: SRI - Servicio de Rentas Internas
 */

/**
 * RETENCIONES EN LA FUENTE DEL IMPUESTO A LA RENTA
 */
const RETENCIONES_RENTA = {
  // HONORARIOS PROFESIONALES Y DEMÁS PAGOS POR SERVICIOS RELACIONADOS CON EL TÍTULO PROFESIONAL
  303: {
    codigo: '303',
    descripcion: 'Honorarios profesionales y dietas',
    porcentaje: 10,
    tipo: 'RENTA',
    vigente: true,
  },
  304: {
    codigo: '304',
    descripcion: 'Servicios predomina el intelecto no relacionados con el título profesional',
    porcentaje: 8,
    tipo: 'RENTA',
    vigente: true,
  },
  // SERVICIOS
  307: {
    codigo: '307',
    descripcion: 'Servicios predomina mano de obra',
    porcentaje: 2,
    tipo: 'RENTA',
    vigente: true,
  },
  308: {
    codigo: '308',
    descripcion: 'Utilización o aprovechamiento de la imagen o renombre',
    porcentaje: 10,
    tipo: 'RENTA',
    vigente: true,
  },
  309: {
    codigo: '309',
    descripcion: 'Servicios prestados por medios de comunicación',
    porcentaje: 1,
    tipo: 'RENTA',
    vigente: true,
  },
  310: {
    codigo: '310',
    descripcion: 'Servicios de publicidad y comunicación',
    porcentaje: 1,
    tipo: 'RENTA',
    vigente: true,
  },
  311: {
    codigo: '311',
    descripcion: 'Transporte privado de pasajeros o transporte público o privado de carga',
    porcentaje: 1,
    tipo: 'RENTA',
    vigente: true,
  },
  312: {
    codigo: '312',
    descripcion: 'Transferencia de bienes muebles de naturaleza corporal',
    porcentaje: 1,
    tipo: 'RENTA',
    vigente: true,
  },
  319: {
    codigo: '319',
    descripcion: 'Otras retenciones aplicables el 2%',
    porcentaje: 2,
    tipo: 'RENTA',
    vigente: true,
  },
  320: {
    codigo: '320',
    descripcion: 'Otras retenciones aplicables el 8%',
    porcentaje: 8,
    tipo: 'RENTA',
    vigente: true,
  },
  // ARRENDAMIENTO MERCANTIL
  322: {
    codigo: '322',
    descripcion: 'Arrendamiento mercantil',
    porcentaje: 1,
    tipo: 'RENTA',
    vigente: true,
  },
  323: {
    codigo: '323',
    descripcion: 'Arrendamiento bienes inmuebles',
    porcentaje: 8,
    tipo: 'RENTA',
    vigente: true,
  },
  // SEGUROS Y REASEGUROS
  325: {
    codigo: '325',
    descripcion: 'Seguros y reaseguros (primas y cesiones)',
    porcentaje: 1,
    tipo: 'RENTA',
    vigente: true,
  },
  // RENDIMIENTOS FINANCIEROS
  327: {
    codigo: '327',
    descripcion: 'Rendimientos financieros por pago o crédito en cuenta',
    porcentaje: 2,
    tipo: 'RENTA',
    vigente: true,
  },
  328: {
    codigo: '328',
    descripcion: 'Rendimientos financieros depósitos Inst. Financieras',
    porcentaje: 2,
    tipo: 'RENTA',
    vigente: true,
  },
  // LOTERÍAS, RIFAS Y APUESTAS
  331: {
    codigo: '331',
    descripcion: 'Loterías, rifas, apuestas y similares',
    porcentaje: 15,
    tipo: 'RENTA',
    vigente: true,
  },
  332: {
    codigo: '332',
    descripcion: 'Venta de combustibles a comercializadoras',
    porcentaje: 2,
    tipo: 'RENTA',
    vigente: false, // Suspendido según normativa
  },
  // ACTIVIDADES ESPECÍFICAS
  340: {
    codigo: '340',
    descripcion:
      'Compra de bienes de origen agrícola, avícola, pecuario, apícola, cunícula, bioacuático y forestal',
    porcentaje: 1,
    tipo: 'RENTA',
    vigente: true,
  },
  341: {
    codigo: '341',
    descripcion:
      'Regalías por concepto de franquicias de acuerdo a Ley de Propiedad Intelectual - pago a personas naturales',
    porcentaje: 8,
    tipo: 'RENTA',
    vigente: true,
  },
  342: {
    codigo: '342',
    descripcion:
      'Cánones, derechos de autor, marcas, patentes y similares - pago a personas naturales',
    porcentaje: 8,
    tipo: 'RENTA',
    vigente: true,
  },
  343: {
    codigo: '343',
    descripcion:
      'Regalías por concepto de franquicias de acuerdo a Ley de Propiedad Intelectual - pago a sociedades',
    porcentaje: 8,
    tipo: 'RENTA',
    vigente: true,
  },
  344: {
    codigo: '344',
    descripcion: 'Cánones, derechos de autor, marcas, patentes y similares - pago a sociedades',
    porcentaje: 8,
    tipo: 'RENTA',
    vigente: true,
  },
  // PAGOS AL EXTERIOR
  345: {
    codigo: '345',
    descripcion: 'Pagos al exterior no sujetos a convenio de doble tributación',
    porcentaje: 25,
    tipo: 'RENTA',
    vigente: true,
  },
  346: {
    codigo: '346',
    descripcion: 'Pagos al exterior sujetos a convenio de doble tributación',
    porcentaje: 0, // Variable según convenio
    tipo: 'RENTA',
    vigente: true,
  },
  // ANTICRESIS
  348: {
    codigo: '348',
    descripcion: 'Anticipo dividendos',
    porcentaje: 0, // No genera retención
    tipo: 'RENTA',
    vigente: true,
  },
  // DIVIDENDOS
  350: {
    codigo: '350',
    descripcion: 'Dividendos distribuidos a personas naturales residentes',
    porcentaje: 0, // No retención si la sociedad pagó IR
    tipo: 'RENTA',
    vigente: true,
  },
  351: {
    codigo: '351',
    descripcion: 'Dividendos distribuidos a sociedades residentes',
    porcentaje: 0, // No retención
    tipo: 'RENTA',
    vigente: true,
  },
  // OTRAS RETENCIONES
  403: {
    codigo: '403',
    descripcion: 'Otras retenciones aplicables el 1%',
    porcentaje: 1,
    tipo: 'RENTA',
    vigente: true,
  },
};

/**
 * RETENCIONES DEL IMPUESTO AL VALOR AGREGADO (IVA)
 */
const RETENCIONES_IVA = {
  // BIENES
  721: {
    codigo: '721',
    descripcion: 'Retención 10% IVA - Bienes',
    porcentaje: 10,
    tipo: 'IVA',
    aplicaA: 'BIENES',
    vigente: true,
  },
  722: {
    codigo: '722',
    descripcion: 'Retención 20% IVA - Bienes',
    porcentaje: 20,
    tipo: 'IVA',
    aplicaA: 'BIENES',
    vigente: true,
  },
  723: {
    codigo: '723',
    descripcion: 'Retención 30% IVA - Bienes',
    porcentaje: 30,
    tipo: 'IVA',
    aplicaA: 'BIENES',
    vigente: true,
  },
  725: {
    codigo: '725',
    descripcion: 'Retención 50% IVA - Bienes',
    porcentaje: 50,
    tipo: 'IVA',
    aplicaA: 'BIENES',
    vigente: true,
  },
  727: {
    codigo: '727',
    descripcion: 'Retención 70% IVA - Bienes',
    porcentaje: 70,
    tipo: 'IVA',
    aplicaA: 'BIENES',
    vigente: true,
  },
  729: {
    codigo: '729',
    descripcion: 'Retención 100% IVA - Bienes',
    porcentaje: 100,
    tipo: 'IVA',
    aplicaA: 'BIENES',
    vigente: true,
  },
  // SERVICIOS
  731: {
    codigo: '731',
    descripcion: 'Retención 10% IVA - Servicios',
    porcentaje: 10,
    tipo: 'IVA',
    aplicaA: 'SERVICIOS',
    vigente: true,
  },
  732: {
    codigo: '732',
    descripcion: 'Retención 20% IVA - Servicios',
    porcentaje: 20,
    tipo: 'IVA',
    aplicaA: 'SERVICIOS',
    vigente: true,
  },
  733: {
    codigo: '733',
    descripcion: 'Retención 30% IVA - Servicios',
    porcentaje: 30,
    tipo: 'IVA',
    aplicaA: 'SERVICIOS',
    vigente: true,
  },
  735: {
    codigo: '735',
    descripcion: 'Retención 50% IVA - Servicios',
    porcentaje: 50,
    tipo: 'IVA',
    aplicaA: 'SERVICIOS',
    vigente: true,
  },
  737: {
    codigo: '737',
    descripcion: 'Retención 70% IVA - Servicios',
    porcentaje: 70,
    tipo: 'IVA',
    aplicaA: 'SERVICIOS',
    vigente: true,
  },
  739: {
    codigo: '739',
    descripcion: 'Retención 100% IVA - Servicios',
    porcentaje: 100,
    tipo: 'IVA',
    aplicaA: 'SERVICIOS',
    vigente: true,
  },
  // HONORARIOS PROFESIONALES
  741: {
    codigo: '741',
    descripcion: 'Retención 10% IVA - Honorarios profesionales',
    porcentaje: 10,
    tipo: 'IVA',
    aplicaA: 'HONORARIOS',
    vigente: true,
  },
  742: {
    codigo: '742',
    descripcion: 'Retención 20% IVA - Honorarios profesionales',
    porcentaje: 20,
    tipo: 'IVA',
    aplicaA: 'HONORARIOS',
    vigente: true,
  },
  743: {
    codigo: '743',
    descripcion: 'Retención 30% IVA - Honorarios profesionales',
    porcentaje: 30,
    tipo: 'IVA',
    aplicaA: 'HONORARIOS',
    vigente: true,
  },
  745: {
    codigo: '745',
    descripcion: 'Retención 50% IVA - Honorarios profesionales',
    porcentaje: 50,
    tipo: 'IVA',
    aplicaA: 'HONORARIOS',
    vigente: true,
  },
  747: {
    codigo: '747',
    descripcion: 'Retención 70% IVA - Honorarios profesionales',
    porcentaje: 70,
    tipo: 'IVA',
    aplicaA: 'HONORARIOS',
    vigente: true,
  },
  749: {
    codigo: '749',
    descripcion: 'Retención 100% IVA - Honorarios profesionales',
    porcentaje: 100,
    tipo: 'IVA',
    aplicaA: 'HONORARIOS',
    vigente: true,
  },
  // ARRENDAMIENTO MERCANTIL
  751: {
    codigo: '751',
    descripcion: 'Retención 10% IVA - Arrendamiento mercantil',
    porcentaje: 10,
    tipo: 'IVA',
    aplicaA: 'ARRENDAMIENTO',
    vigente: true,
  },
  752: {
    codigo: '752',
    descripcion: 'Retención 20% IVA - Arrendamiento mercantil',
    porcentaje: 20,
    tipo: 'IVA',
    aplicaA: 'ARRENDAMIENTO',
    vigente: true,
  },
  753: {
    codigo: '753',
    descripcion: 'Retención 30% IVA - Arrendamiento mercantil',
    porcentaje: 30,
    tipo: 'IVA',
    aplicaA: 'ARRENDAMIENTO',
    vigente: true,
  },
};

/**
 * Reglas para determinar el porcentaje de retención aplicable
 */
const REGLAS_RETENCION = {
  // Retención IVA según tipo de contribuyente
  IVA: {
    // Agentes de retención obligatorios
    AGENTE_RETENCION: {
      A_PERSONA_NATURAL: {
        BIENES: 30, // Código 723
        SERVICIOS: 70, // Código 737
        HONORARIOS: 100, // Código 749
      },
      A_SOCIEDAD: {
        BIENES: 30, // Código 723
        SERVICIOS: 70, // Código 737
        HONORARIOS: 100, // Código 749
      },
    },
    // Entidades del sector público
    SECTOR_PUBLICO: {
      TODOS: 100, // Retienen el 100% en todos los casos
    },
    // Empresas emisoras de tarjetas de crédito
    TARJETAS_CREDITO: {
      ESTABLECIMIENTOS: 30, // Código 723
    },
  },
  // Retención Renta según actividad económica
  RENTA: {
    PREDOMINA_INTELECTO: {
      CON_TITULO: 10, // Código 303
      SIN_TITULO: 8, // Código 304
    },
    PREDOMINA_MANO_OBRA: 2, // Código 307
    ARRENDAMIENTO_INMUEBLES: 8, // Código 323
    COMPRA_BIENES: 1, // Código 312
    SERVICIOS_GENERAL: 2, // Código 319
    TRANSPORTE: 1, // Código 311
    PUBLICIDAD: 1, // Código 310
    SEGUROS: 1, // Código 325
    RENDIMIENTOS_FINANCIEROS: 2, // Código 327
    LOTERIAS: 15, // Código 331
    PRODUCTOS_AGRICOLAS: 1, // Código 340
  },
};

/**
 * Obtiene información de un código de retención
 */
function obtenerCodigoRetencion(codigo, tipo = 'RENTA') {
  codigo = String(codigo);

  if (tipo === 'RENTA') {
    return RETENCIONES_RENTA[codigo] || null;
  } else if (tipo === 'IVA') {
    return RETENCIONES_IVA[codigo] || null;
  }

  return null;
}

/**
 * Obtiene todos los códigos vigentes de un tipo
 */
function obtenerCodigosVigentes(tipo = 'RENTA') {
  if (tipo === 'RENTA') {
    return Object.values(RETENCIONES_RENTA).filter((r) => r.vigente);
  } else if (tipo === 'IVA') {
    return Object.values(RETENCIONES_IVA).filter((r) => r.vigente);
  }

  return [];
}

/**
 * Busca códigos de retención por descripción
 */
function buscarCodigoPorDescripcion(busqueda, tipo = 'RENTA') {
  busqueda = busqueda.toLowerCase();
  const codigos = tipo === 'RENTA' ? RETENCIONES_RENTA : RETENCIONES_IVA;

  return Object.values(codigos).filter(
    (r) => r.vigente && r.descripcion.toLowerCase().includes(busqueda)
  );
}

/**
 * Obtiene el código de retención IVA según porcentaje y tipo
 */
function obtenerCodigoIVAPorPorcentaje(porcentaje, aplicaA = 'SERVICIOS') {
  const rangos = {
    BIENES: { 10: '721', 20: '722', 30: '723', 50: '725', 70: '727', 100: '729' },
    SERVICIOS: { 10: '731', 20: '732', 30: '733', 50: '735', 70: '737', 100: '739' },
    HONORARIOS: { 10: '741', 20: '742', 30: '743', 50: '745', 70: '747', 100: '749' },
    ARRENDAMIENTO: { 10: '751', 20: '752', 30: '753' },
  };

  return rangos[aplicaA]?.[porcentaje] || null;
}

module.exports = {
  RETENCIONES_RENTA,
  RETENCIONES_IVA,
  REGLAS_RETENCION,
  obtenerCodigoRetencion,
  obtenerCodigosVigentes,
  buscarCodigoPorDescripcion,
  obtenerCodigoIVAPorPorcentaje,
};
