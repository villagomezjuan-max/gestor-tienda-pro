// ============================================
// HELPER: Notification Helper
// ============================================
// Utilidad universal para enviar notificaciones desde cualquier módulo

/**
 * Tipos de evento soportados
 */
const NOTIFICATION_TYPES = {
  STOCK_BAJO: 'stock_bajo',
  PRODUCTO_VENCER: 'producto_vencer',
  ORDEN_TRABAJO: 'orden_trabajo',
  TAREA: 'tarea',
  RECORDATORIO: 'recordatorio',
  CITA: 'cita',
  VENTA: 'venta',
  COMPRA: 'compra',
  RESUMEN_DIARIO: 'resumen_diario',
};

/**
 * Enviar notificación al hub
 * @param {string} tipo - Tipo de evento (usar NOTIFICATION_TYPES)
 * @param {object} data - Datos del evento
 * @returns {Promise<object | null>} Resultado o null si falla
 */
async function sendNotification(tipo, data) {
  if (!global.notificationHub) {
    console.warn('⚠️ NotificationHub no inicializado');
    return null;
  }

  try {
    const eventData = {
      negocio_id: data.negocio_id,
      tipo_evento: tipo,
      modulo_origen: data.modulo || 'unknown',
      referencia_id: data.referencia_id || null,
      contexto: data.contexto || {},
      titulo: data.titulo,
      mensaje: data.mensaje,
      usuarios_destino: data.usuarios || [],
      programado_para: data.programado_para || null,
      expira_en: data.expira_en || null,
    };

    const result = await global.notificationHub.createEvent(eventData);
    console.log(`✅ Notificación creada: ${result.id} | Score: ${result.score_final?.toFixed(1)}`);

    return result;
  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
    return null;
  }
}

/**
 * Enviar notificación de stock bajo
 */
async function notifyStockBajo(producto, negocio_id) {
  return sendNotification(NOTIFICATION_TYPES.STOCK_BAJO, {
    negocio_id,
    modulo: 'inventario',
    referencia_id: producto.id,
    titulo: `Stock bajo: ${producto.nombre}`,
    mensaje: `Quedan solo ${producto.stock} unidades de ${producto.nombre}. Stock mínimo: ${producto.stock_minimo}`,
    contexto: {
      producto_id: producto.id,
      producto_codigo: producto.codigo,
      producto_nombre: producto.nombre,
      stock_actual: producto.stock,
      stock_minimo: producto.stock_minimo,
      categoria: producto.categoria_nombre || '',
      proveedor: producto.proveedor_nombre || '',
    },
  });
}

/**
 * Enviar notificación de producto por vencer
 */
async function notifyProductoVencer(producto, negocio_id, diasRestantes) {
  return sendNotification(NOTIFICATION_TYPES.PRODUCTO_VENCER, {
    negocio_id,
    modulo: 'inventario',
    referencia_id: producto.id,
    titulo: `Producto próximo a vencer: ${producto.nombre}`,
    mensaje: `${producto.nombre} vence en ${diasRestantes} día(s)`,
    contexto: {
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      fecha_vencimiento: producto.fecha_vencimiento,
      dias_restantes: diasRestantes,
      lote: producto.lote || '',
      cantidad: producto.stock,
    },
  });
}

/**
 * Enviar notificación de orden de trabajo
 */
async function notifyOrdenTrabajo(orden, negocio_id, accion = 'creada') {
  const acciones = {
    creada: 'Nueva orden de trabajo',
    actualizada: 'Orden actualizada',
    completada: 'Orden completada',
    entregada: 'Orden lista para entrega',
  };

  return sendNotification(NOTIFICATION_TYPES.ORDEN_TRABAJO, {
    negocio_id,
    modulo: 'taller',
    referencia_id: orden.id,
    titulo: `${acciones[accion]}: ${orden.numero || orden.id}`,
    mensaje: `${orden.vehiculo_placa} - ${orden.cliente_nombre}${orden.estado ? ` (${orden.estado})` : ''}`,
    contexto: {
      orden_id: orden.id,
      numero: orden.numero,
      estado: orden.estado,
      vehiculo_id: orden.vehiculo_id,
      vehiculo_placa: orden.vehiculo_placa,
      cliente_id: orden.cliente_id,
      cliente_nombre: orden.cliente_nombre,
      tecnico_id: orden.tecnico_id,
      fecha_ingreso: orden.fecha_ingreso,
      fecha_estimada: orden.fecha_estimada,
      total: orden.total,
      accion,
    },
    usuarios: orden.tecnico_id ? [orden.tecnico_id] : [],
  });
}

/**
 * Enviar notificación de tarea
 */
async function notifyTarea(tarea, negocio_id, tipo = 'recordatorio') {
  const diasRestantes = tarea.fecha_vencimiento
    ? Math.ceil((new Date(tarea.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  let titulo = tarea.titulo;
  let mensaje = tarea.descripcion || '';

  if (tipo === 'recordatorio' && diasRestantes !== null) {
    titulo = `Tarea próxima: ${tarea.titulo}`;
    mensaje = `Vence en ${diasRestantes} día(s)`;
  }

  return sendNotification(NOTIFICATION_TYPES.TAREA, {
    negocio_id,
    modulo: 'agenda',
    referencia_id: tarea.id,
    titulo,
    mensaje,
    contexto: {
      tarea_id: tarea.id,
      titulo: tarea.titulo,
      descripcion: tarea.descripcion,
      vencimiento: tarea.fecha_vencimiento,
      dias_restantes: diasRestantes,
      prioridad: tarea.prioridad,
      estado: tarea.estado,
      responsable_id: tarea.responsable_id,
    },
    usuarios: tarea.responsable_id ? [tarea.responsable_id] : [],
    programado_para: tipo === 'programada' ? tarea.fecha_vencimiento : null,
  });
}

/**
 * Enviar notificación de cita
 */
async function notifyCita(cita, negocio_id, tipo = 'recordatorio') {
  const horasRestantes = cita.fecha_hora
    ? Math.ceil((new Date(cita.fecha_hora) - new Date()) / (1000 * 60 * 60))
    : null;

  return sendNotification(NOTIFICATION_TYPES.CITA, {
    negocio_id,
    modulo: 'agenda',
    referencia_id: cita.id,
    titulo: `Cita: ${cita.cliente_nombre || cita.descripcion}`,
    mensaje: `${cita.descripcion}${horasRestantes ? ` - En ${horasRestantes}h` : ''}`,
    contexto: {
      cita_id: cita.id,
      cliente_id: cita.cliente_id,
      cliente_nombre: cita.cliente_nombre,
      fecha_hora: cita.fecha_hora,
      horas_restantes: horasRestantes,
      descripcion: cita.descripcion,
      tipo: cita.tipo,
      estado: cita.estado,
    },
    usuarios: cita.usuario_asignado_id ? [cita.usuario_asignado_id] : [],
    programado_para: tipo === 'programada' ? cita.fecha_hora : null,
  });
}

/**
 * Enviar notificación de recordatorio genérico
 */
async function notifyRecordatorio(recordatorio, negocio_id) {
  return sendNotification(NOTIFICATION_TYPES.RECORDATORIO, {
    negocio_id,
    modulo: 'recordatorios',
    referencia_id: recordatorio.id,
    titulo: recordatorio.titulo,
    mensaje: recordatorio.descripcion || '',
    contexto: {
      recordatorio_id: recordatorio.id,
      tipo: recordatorio.tipo,
      fecha: recordatorio.fecha,
      prioridad: recordatorio.prioridad,
      completado: recordatorio.completado,
    },
    programado_para: recordatorio.fecha,
    usuarios: recordatorio.usuario_id ? [recordatorio.usuario_id] : [],
  });
}

/**
 * Enviar notificación de venta
 */
async function notifyVenta(venta, negocio_id) {
  return sendNotification(NOTIFICATION_TYPES.VENTA, {
    negocio_id,
    modulo: 'ventas',
    referencia_id: venta.id,
    titulo: `Nueva venta: $${venta.total?.toFixed(2)}`,
    mensaje: `${venta.cliente_nombre || 'Cliente general'} - ${venta.items_count || 0} item(s)`,
    contexto: {
      venta_id: venta.id,
      numero: venta.numero,
      cliente_id: venta.cliente_id,
      cliente_nombre: venta.cliente_nombre,
      total: venta.total,
      items: venta.items_count,
      metodo_pago: venta.metodo_pago,
      vendedor_id: venta.vendedor_id,
    },
  });
}

/**
 * Enviar notificación de compra
 */
async function notifyCompra(compra, negocio_id) {
  return sendNotification(NOTIFICATION_TYPES.COMPRA, {
    negocio_id,
    modulo: 'compras',
    referencia_id: compra.id,
    titulo: `Compra registrada: $${compra.total?.toFixed(2)}`,
    mensaje: `${compra.proveedor_nombre} - ${compra.items_count || 0} item(s)`,
    contexto: {
      compra_id: compra.id,
      numero: compra.numero,
      proveedor_id: compra.proveedor_id,
      proveedor_nombre: compra.proveedor_nombre,
      total: compra.total,
      items: compra.items_count,
      fecha_compra: compra.fecha,
    },
  });
}

/**
 * Batch: enviar múltiples notificaciones
 */
async function sendNotificationBatch(notificaciones) {
  const results = [];

  for (const notif of notificaciones) {
    const result = await sendNotification(notif.tipo, notif.data);
    results.push({ ...notif, result });
  }

  return results;
}

/**
 * Verificar si NotificationHub está disponible
 */
function isNotificationHubAvailable() {
  return !!global.notificationHub;
}

module.exports = {
  // Tipos
  NOTIFICATION_TYPES,

  // Funciones principales
  sendNotification,
  sendNotificationBatch,

  // Helpers específicos
  notifyStockBajo,
  notifyProductoVencer,
  notifyOrdenTrabajo,
  notifyTarea,
  notifyCita,
  notifyRecordatorio,
  notifyVenta,
  notifyCompra,

  // Utilidades
  isNotificationHubAvailable,
};
