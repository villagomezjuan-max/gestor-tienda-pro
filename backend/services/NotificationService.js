/**
 * NotificationService
 *
 * Servicio centralizado para gestión de notificaciones del sistema.
 * Se conecta automáticamente con el módulo de Reportes para crear
 * notificaciones cuando se detectan eventos importantes (stock bajo, etc.)
 */

const path = require('path');

const Database = require('better-sqlite3');

const configService = require('./ConfigurationService');

class NotificationService {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, '..', 'data', 'gestor_tienda.db');
    this.db = null;
  }

  /**
   * Conectar a la base de datos
   */
  connect() {
    if (!this.db) {
      this.db = new Database(this.dbPath);
    }
    return this.db;
  }

  /**
   * Cerrar conexión
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Crear una notificación en el sistema
   * @param {object} notification - Datos de la notificación
   * @param {string} notification.titulo - Título de la notificación
   * @param {string} notification.mensaje - Mensaje detallado
   * @param {string} notification.tipo - Tipo (info, warning, error, success)
   * @param {string} notification.prioridad - Prioridad (baja, media, alta, urgente)
   * @param {number} notification.negocio_id - ID del negocio
   * @param {number} notification.usuario_id - ID del usuario (opcional)
   * @param {object} notification.metadata - Datos adicionales (opcional)
   */
  async createNotification({
    titulo,
    mensaje,
    tipo = 'info',
    prioridad = 'media',
    negocio_id,
    usuario_id = null,
    metadata = null,
  }) {
    const db = this.connect();

    const metadataStr = metadata ? JSON.stringify(metadata) : null;

    const result = db
      .prepare(
        `
      INSERT INTO notificaciones (titulo, mensaje, tipo, prioridad, negocio_id, usuario_id, metadata, leida)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `
      )
      .run(titulo, mensaje, tipo, prioridad, negocio_id, usuario_id, metadataStr);

    return {
      id: result.lastInsertRowid,
      titulo,
      mensaje,
      tipo,
      prioridad,
      negocio_id,
      usuario_id,
      metadata,
      leida: false,
      fecha_creacion: new Date().toISOString(),
    };
  }

  /**
   * Procesar evento y crear notificaciones según triggers configurados
   * @param {string} eventoTipo - Tipo de evento (stock_bajo, venta_completada, etc.)
   * @param {object} datos - Datos del evento
   * @param {number} negocio_id - ID del negocio
   */
  async procesarEvento(eventoTipo, datos, negocio_id) {
    // Obtener triggers activos para este tipo de evento
    const triggers = configService.getNotificationTriggers(eventoTipo, true);

    if (triggers.length === 0) {
      console.log(`ℹ️  No hay triggers activos para el evento: ${eventoTipo}`);
      return [];
    }

    const notificaciones = [];

    for (const trigger of triggers) {
      try {
        // Reemplazar variables en la plantilla de mensaje
        let mensaje = trigger.plantilla_mensaje;
        Object.keys(datos).forEach((key) => {
          const regex = new RegExp(`\\{${key}\\}`, 'g');
          mensaje = mensaje.replace(regex, datos[key]);
        });

        // Crear la notificación
        const notif = await this.createNotification({
          titulo: trigger.nombre,
          mensaje,
          tipo: this.mapearPrioridadATipo(trigger.prioridad),
          prioridad: trigger.prioridad,
          negocio_id,
          metadata: {
            evento_tipo: eventoTipo,
            trigger_id: trigger.id,
            datos_evento: datos,
          },
        });

        notificaciones.push(notif);

        // Enviar a canales configurados (sistema, email, telegram, etc.)
        await this.enviarACanales(notif, trigger.canales_predeterminados);
      } catch (error) {
        console.error(`❌ Error procesando trigger ${trigger.nombre}:`, error);
      }
    }

    return notificaciones;
  }

  /**
   * Mapear prioridad a tipo de notificación
   */
  mapearPrioridadATipo(prioridad) {
    switch (prioridad) {
      case 'urgente':
        return 'error';
      case 'alta':
        return 'warning';
      case 'media':
        return 'info';
      case 'baja':
        return 'success';
      default:
        return 'info';
    }
  }

  /**
   * Enviar notificación a los canales configurados
   * @param {object} notificacion - Datos de la notificación
   * @param {Array<string>} canales - Canales a enviar (solo 'sistema' implementado)
   */
  async enviarACanales(notificacion, canales) {
    const canalesArray = Array.isArray(canales) ? canales : JSON.parse(canales || '[]');

    for (const canal of canalesArray) {
      try {
        switch (canal) {
          case 'sistema':
            // Ya está guardada en la BD
            console.log(`📬 Notificación guardada: ${notificacion.titulo}`);
            break;

          default:
            // Otros canales no implementados aún (email, telegram, sms)
            console.log(`⚠️  Canal '${canal}' no implementado - notificación solo en sistema`);
        }
      } catch (error) {
        console.error(`❌ Error enviando a canal ${canal}:`, error);
      }
    }
  }

  /**
   * Verificar stock bajo y crear notificaciones
   * Se ejecuta desde el módulo de Reportes cuando se detecta stock bajo
   * @param {number} negocio_id - ID del negocio
   */
  async verificarStockBajo(negocio_id) {
    const db = this.connect();

    // Obtener productos con stock bajo (stock <= stock_minimo)
    const productosStockBajo = db
      .prepare(
        `
      SELECT 
        id,
        nombre,
        codigo,
        stock,
        stock_minimo
      FROM productos
      WHERE negocio_id = ?
        AND stock <= stock_minimo
        AND stock > 0
    `
      )
      .all(negocio_id);

    const notificaciones = [];

    for (const producto of productosStockBajo) {
      const notifs = await this.procesarEvento(
        'stock_bajo',
        {
          producto: producto.nombre,
          codigo: producto.codigo,
          stock: producto.stock,
          stock_minimo: producto.stock_minimo,
          producto_id: producto.id,
        },
        negocio_id
      );

      notificaciones.push(...notifs);
    }

    // Obtener productos agotados (stock = 0)
    const productosAgotados = db
      .prepare(
        `
      SELECT 
        id,
        nombre,
        codigo
      FROM productos
      WHERE negocio_id = ?
        AND stock = 0
    `
      )
      .all(negocio_id);

    for (const producto of productosAgotados) {
      const notifs = await this.procesarEvento(
        'stock_agotado',
        {
          producto: producto.nombre,
          codigo: producto.codigo,
          producto_id: producto.id,
        },
        negocio_id
      );

      notificaciones.push(...notifs);
    }

    return notificaciones;
  }

  /**
   * Notificar venta completada
   * @param {object} venta - Datos de la venta
   * @param {number} negocio_id - ID del negocio
   */
  async notificarVentaCompletada(venta, negocio_id) {
    return await this.procesarEvento(
      'venta_completada',
      {
        numero: venta.numero_factura || venta.id,
        total: `$${venta.total.toFixed(2)}`,
        cliente: venta.cliente_nombre || 'Cliente General',
        venta_id: venta.id,
      },
      negocio_id
    );
  }

  /**
   * Notificar orden de trabajo asignada
   * @param {object} orden - Datos de la orden
   * @param {number} negocio_id - ID del negocio
   */
  async notificarOrdenAsignada(orden, negocio_id) {
    return await this.procesarEvento(
      'orden_trabajo_asignada',
      {
        numero: orden.numero || orden.id,
        cliente: orden.cliente_nombre,
        tecnico: orden.tecnico_nombre,
        orden_id: orden.id,
      },
      negocio_id
    );
  }

  /**
   * Notificar nuevo cliente registrado
   * @param {object} cliente - Datos del cliente
   * @param {number} negocio_id - ID del negocio
   */
  async notificarNuevoCliente(cliente, negocio_id) {
    return await this.procesarEvento(
      'cliente_nuevo',
      {
        nombre: cliente.nombre,
        cedula: cliente.cedula || cliente.ruc,
        cliente_id: cliente.id,
      },
      negocio_id
    );
  }

  /**
   * Obtener notificaciones de un negocio
   * @param {number} negocio_id - ID del negocio
   * @param {boolean} soloNoLeidas - Solo notificaciones no leídas
   * @param {number} limit - Límite de resultados
   */
  getNotificaciones(negocio_id, soloNoLeidas = false, limit = 50) {
    const db = this.connect();

    let query = `
      SELECT *
      FROM notificaciones
      WHERE negocio_id = ?
    `;

    if (soloNoLeidas) {
      query += ' AND leida = 0';
    }

    query += ' ORDER BY fecha_creacion DESC LIMIT ?';

    const notificaciones = db.prepare(query).all(negocio_id, limit);

    // Parsear metadata
    notificaciones.forEach((notif) => {
      if (notif.metadata) {
        try {
          notif.metadata = JSON.parse(notif.metadata);
        } catch (error) {
          console.warn(`Notificación ${notif.id} tiene metadata inválida: ${error.message}`);
          notif.metadata = null;
        }
      }
    });

    return notificaciones;
  }

  /**
   * Marcar notificación como leída
   * @param {number} id - ID de la notificación
   */
  marcarComoLeida(id) {
    const db = this.connect();
    db.prepare('UPDATE notificaciones SET leida = 1 WHERE id = ?').run(id);
  }

  /**
   * Marcar todas las notificaciones de un negocio como leídas
   * @param {number} negocio_id - ID del negocio
   */
  marcarTodasComoLeidas(negocio_id) {
    const db = this.connect();
    db.prepare('UPDATE notificaciones SET leida = 1 WHERE negocio_id = ? AND leida = 0').run(
      negocio_id
    );
  }

  /**
   * Eliminar notificaciones antiguas
   * @param {number} diasAntiguedad - Días de antigüedad
   */
  limpiarNotificacionesAntiguas(diasAntiguedad = 30) {
    const db = this.connect();
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

    const result = db
      .prepare(
        `
      DELETE FROM notificaciones
      WHERE fecha_creacion < ?
        AND leida = 1
    `
      )
      .run(fechaLimite.toISOString());

    return result.changes;
  }
}

// Exportar instancia singleton
const notificationService = new NotificationService();
notificationService.connect();

module.exports = notificationService;
module.exports.NotificationService = NotificationService;
