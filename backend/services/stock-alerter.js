// ============================================
// SERVICIO: Stock Alerter - Alertas de Inventario
// ============================================
// Se ejecuta en segundo plano para verificar niveles de stock y enviar alertas.

const cron = require('node-cron');

const { getTenantDb } = require('../utils/db');

class StockAlerter {
  /**
   * @param {object} db - Instancia de la base de datos principal (no-tenant).
   * @param {object} notificationHub - Instancia del centro de notificaciones.
   */
  constructor(db, notificationHub) {
    this.db = db;
    this.notificationHub = notificationHub;
    this.job = null;
    this.lastAlerts = new Map(); // Para evitar enviar la misma alerta repetidamente
  }
  /**
   * Inicia el verificador periódico.
   */
  init() {
    // Se ejecuta cada hora en el minuto 15.
    this.job = cron.schedule(
      '15 * * * *',
      () => {
        console.log('⏰ Ejecutando verificación de stock bajo...');
        this.checkAndAlertAllTenants().catch((err) => {
          console.error('Error en la verificación de stock bajo:', err);
        });
      },
      {
        scheduled: true,
        timezone: 'America/Guayaquil',
      }
    );

    console.log('✅ Stock Alerter iniciado. Verificación programada cada hora.');
  }

  /**
   * Detiene el verificador.
   */
  stop() {
    if (this.job) {
      this.job.stop();
      console.log('🛑 Stock Alerter detenido.');
    }
  }

  /**
   * Itera sobre todos los tenants activos y verifica su stock.
   */
  async checkAndAlertAllTenants() {
    try {
      const tenants = this.db.prepare('SELECT id, nombre FROM negocios WHERE activo = 1').all();
      console.log(`Verificando stock para ${tenants.length} negocio(s) activo(s).`);

      for (const tenant of tenants) {
        await this.checkAndAlert(tenant.id, tenant.nombre);
      }
    } catch (error) {
      console.error('Error fatal al obtener la lista de tenants:', error);
    }
  }

  /**
   * Verifica el stock para un tenant específico y envía alertas si es necesario.
   * @param {number} tenantId - ID del negocio (tenant).
   * @param {string} tenantName - Nombre del negocio.
   */
  async checkAndAlert(tenantId, tenantName) {
    let tenantDb;
    try {
      tenantDb = getTenantDb(tenantId);
      if (!tenantDb) {
        console.warn(`No se pudo obtener la DB para el tenant ${tenantId}`);
        return;
      }

      const lowStockProducts = tenantDb
        .prepare(
          ` 
        SELECT * FROM vista_productos_stock_bajo 
        ORDER BY stock ASC 
      `
        )
        .all();

      if (lowStockProducts.length === 0) {
        // Limpiar alertas anteriores si el stock se ha normalizado
        this.lastAlerts.delete(tenantId);
        return;
      }

      // Evitar spam: generar un hash del estado actual del stock bajo
      const currentStateHash = this.generateStateHash(lowStockProducts);
      if (this.lastAlerts.get(tenantId) === currentStateHash) {
        console.log(
          `Stock bajo sin cambios para ${tenantName} (${tenantId}). No se enviará alerta repetida.`
        );
        return;
      }

      const { mensaje, totalCriticos, totalBajos } = this.formatAlertMessage(
        lowStockProducts,
        tenantName
      );

      // Crear evento en el Notification Hub
      await this.notificationHub.createEvent({
        negocio_id: tenantId,
        tipo_evento: 'stock_bajo',
        modulo_origen: 'stock_alerter',
        titulo: `🚨 Alerta de Stock: ${totalCriticos + totalBajos} productos`,
        mensaje: mensaje,
        contexto: {
          totalProductos: lowStockProducts.length,
          totalCriticos,
          totalBajos,
          tenant: tenantName,
        },
      });

      console.log(`📢 Alerta de stock bajo enviada para ${tenantName} (${tenantId}).`);
      this.lastAlerts.set(tenantId, currentStateHash);
    } catch (error) {
      console.error(`Error procesando stock para el tenant ${tenantId} (${tenantName}):`, error);
    }
  }

  /**
   * Formatea el mensaje de alerta.
   * @param {Array} products - Lista de productos con stock bajo.
   * @param {string} tenantName - Nombre del negocio.
   * @returns {object} - Objeto con el mensaje formateado y conteos.
   */
  formatAlertMessage(products, tenantName) {
    const configInv = { stockCritico: 5 }; // Usar un default o buscarlo en la config si es necesario

    const productosCriticos = products.filter(
      (p) => p.stock <= configInv.stockCritico && p.stock > 0
    );
    const productosAgotados = products.filter((p) => p.stock === 0);
    const productosBajos = products.filter((p) => p.stock > configInv.stockCritico);

    let mensaje = `🚨 *ALERTA DE STOCK - ${tenantName.toUpperCase()}* 🚨\n\n`;

    if (productosAgotados.length > 0) {
      mensaje += `⛔ *Agotados* (${productosAgotados.length}):\n`;
      productosAgotados.slice(0, 5).forEach((p) => {
        mensaje += `• ${p.nombre}: *${p.stock}* unidades\n`;
      });
      if (productosAgotados.length > 5) mensaje += `... y ${productosAgotados.length - 5} más\n`;
      mensaje += '\n';
    }

    if (productosCriticos.length > 0) {
      mensaje += `⚠️ *Críticos* (${productosCriticos.length}):\n`;
      productosCriticos.slice(0, 5).forEach((p) => {
        mensaje += `• ${p.nombre}: *${p.stock}* unidades\n`;
      });
      if (productosCriticos.length > 5) mensaje += `... y ${productosCriticos.length - 5} más\n`;
      mensaje += '\n';
    }

    if (productosBajos.length > 0) {
      mensaje += `🟡 *Bajos* (${productosBajos.length}):\n`;
      productosBajos.slice(0, 5).forEach((p) => {
        mensaje += `• ${p.nombre}: ${p.stock} unidades\n`;
      });
      if (productosBajos.length > 5) mensaje += `... y ${productosBajos.length - 5} más\n`;
    }

    mensaje += `\n📅 ${new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}`;

    return {
      mensaje,
      totalCriticos: productosCriticos.length + productosAgotados.length,
      totalBajos: productosBajos.length,
    };
  }

  /**
   * Genera un hash simple para representar el estado del stock bajo.
   * @param {Array} products - Lista de productos.
   * @returns {string} - Hash MD5 del estado.
   */
  generateStateHash(products) {
    const crypto = require('crypto');
    const stateString = products.map((p) => `${p.id}:${p.stock}`).join(',');
    return crypto.createHash('md5').update(stateString).digest('hex');
  }
}

module.exports = StockAlerter;
