/**
 * ConfigurationService
 *
 * Servicio centralizado para acceder a configuraciones del sistema
 * desde la base de datos, eliminando datos hardcodeados del código.
 */

const path = require('path');

const Database = require('better-sqlite3');

class ConfigurationService {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, '..', 'data', 'gestor_tienda.db');
    this.db = null;
    this.cache = {
      iaModels: null,
      iaFeatures: null,
      paymentMethods: null,
      transactionStates: null,
      securityConfig: null,
      notificationTriggers: null,
      lastUpdate: null,
    };
    this.cacheTimeout = 300000; // 5 minutos
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
   * Limpiar caché
   */
  clearCache() {
    this.cache = {
      iaModels: null,
      iaFeatures: null,
      paymentMethods: null,
      transactionStates: null,
      securityConfig: null,
      notificationTriggers: null,
      lastUpdate: null,
    };
  }

  /**
   * Verificar si el caché es válido
   */
  isCacheValid() {
    if (!this.cache.lastUpdate) return false;
    const now = Date.now();
    return now - this.cache.lastUpdate < this.cacheTimeout;
  }

  /**
   * Obtener modelos de IA disponibles
   * @param {string} provider - Filtrar por proveedor (gemini, openai, deepseek)
   * @param {boolean} activeOnly - Solo modelos activos
   */
  getIAModels(provider = null, activeOnly = true) {
    if (this.cache.iaModels && this.isCacheValid()) {
      let models = this.cache.iaModels;
      if (provider) models = models.filter((m) => m.provider === provider);
      if (activeOnly) models = models.filter((m) => m.is_active);
      return models;
    }

    const db = this.connect();
    let query = 'SELECT * FROM ia_models';
    const conditions = [];
    const params = [];

    if (provider) {
      conditions.push('provider = ?');
      params.push(provider);
    }
    if (activeOnly) {
      conditions.push('is_active = 1');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY sort_order';

    const models = db.prepare(query).all(...params);

    if (!provider && activeOnly === true) {
      this.cache.iaModels = models;
      this.cache.lastUpdate = Date.now();
    }

    return models;
  }

  /**
   * Obtener características de IA
   * @param {boolean} activeOnly - Solo características activas
   */
  getIAFeatures(activeOnly = true) {
    if (this.cache.iaFeatures && this.isCacheValid() && activeOnly) {
      return this.cache.iaFeatures;
    }

    const db = this.connect();
    let query = 'SELECT * FROM ia_features';

    if (activeOnly) {
      query += ' WHERE is_active = 1';
    }

    const features = db.prepare(query).all();

    if (activeOnly) {
      this.cache.iaFeatures = features;
      this.cache.lastUpdate = Date.now();
    }

    return features;
  }

  /**
   * Obtener métodos de pago
   * @param {boolean} activeOnly - Solo métodos activos
   */
  getPaymentMethods(activeOnly = true) {
    if (this.cache.paymentMethods && this.isCacheValid() && activeOnly) {
      return this.cache.paymentMethods;
    }

    const db = this.connect();
    let query = 'SELECT * FROM payment_methods';

    if (activeOnly) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY sort_order';

    const methods = db.prepare(query).all();

    if (activeOnly) {
      this.cache.paymentMethods = methods;
      this.cache.lastUpdate = Date.now();
    }

    return methods;
  }

  /**
   * Obtener estados de transacciones
   * @param {string} tipo - Filtrar por tipo (venta, compra, orden, general)
   */
  getTransactionStates(tipo = null) {
    if (this.cache.transactionStates && this.isCacheValid() && !tipo) {
      return this.cache.transactionStates;
    }

    const db = this.connect();
    let query = 'SELECT * FROM transaction_states';

    if (tipo) {
      query += ' WHERE tipo = ? OR tipo = "general"';
      return db.prepare(query).all(tipo);
    }

    const states = db.prepare(query).all();

    if (!tipo) {
      this.cache.transactionStates = states;
      this.cache.lastUpdate = Date.now();
    }

    return states;
  }

  /**
   * Obtener configuración de seguridad
   * @param {string} key - Clave específica a obtener
   */
  getSecurityConfig(key = null) {
    if (this.cache.securityConfig && this.isCacheValid() && !key) {
      return this.cache.securityConfig;
    }

    const db = this.connect();

    if (key) {
      const config = db
        .prepare('SELECT * FROM security_configuration WHERE config_key = ?')
        .get(key);
      if (!config) return null;
      return this.parseConfigValue(config);
    }

    const configs = db.prepare('SELECT * FROM security_configuration').all();
    const parsed = {};

    configs.forEach((config) => {
      parsed[config.config_key] = this.parseConfigValue(config);
    });

    if (!key) {
      this.cache.securityConfig = parsed;
      this.cache.lastUpdate = Date.now();
    }

    return parsed;
  }

  /**
   * Parsear valor de configuración según su tipo
   */
  parseConfigValue(config) {
    const { config_value, data_type } = config;

    switch (data_type) {
      case 'number':
        return parseFloat(config_value);
      case 'boolean':
        return config_value === 'true' || config_value === '1';
      case 'array':
        try {
          return JSON.parse(config_value);
        } catch {
          console.error('Error parsing array config:', config_value);
          return [];
        }
      case 'object':
        try {
          return JSON.parse(config_value);
        } catch {
          console.error('Error parsing object config:', config_value);
          return {};
        }
      default:
        return config_value;
    }
  }

  /**
   * Obtener triggers de notificaciones
   * @param {string} eventoTipo - Filtrar por tipo de evento
   * @param {boolean} activeOnly - Solo triggers activos
   */
  getNotificationTriggers(eventoTipo = null, activeOnly = true) {
    if (this.cache.notificationTriggers && this.isCacheValid() && !eventoTipo && activeOnly) {
      return this.cache.notificationTriggers;
    }

    const db = this.connect();
    let query = 'SELECT * FROM notification_triggers';
    const conditions = [];
    const params = [];

    if (eventoTipo) {
      conditions.push('evento_tipo = ?');
      params.push(eventoTipo);
    }
    if (activeOnly) {
      conditions.push('crear_notificacion = 1');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const triggers = db.prepare(query).all(...params);

    // Parsear canales_predeterminados como JSON
    triggers.forEach((trigger) => {
      if (trigger.canales_predeterminados) {
        try {
          trigger.canales_predeterminados = JSON.parse(trigger.canales_predeterminados);
        } catch {
          trigger.canales_predeterminados = [];
        }
      }
    });

    if (!eventoTipo && activeOnly) {
      this.cache.notificationTriggers = triggers;
      this.cache.lastUpdate = Date.now();
    }

    return triggers;
  }

  /**
   * Obtener configuración SRI para un negocio
   * @param {number} negocioId - ID del negocio
   */
  getSRIConfig(negocioId) {
    const db = this.connect();
    const config = db
      .prepare('SELECT * FROM sri_configuration WHERE negocio_id = ?')
      .get(negocioId);

    if (!config) {
      throw new Error(`No se encontró configuración SRI para el negocio ${negocioId}`);
    }

    return config;
  }

  /**
   * Actualizar configuración de seguridad
   * @param {string} key - Clave de configuración
   * @param {*} value - Nuevo valor
   */
  updateSecurityConfig(key, value) {
    const db = this.connect();
    const existing = db
      .prepare('SELECT data_type FROM security_configuration WHERE config_key = ?')
      .get(key);

    if (!existing) {
      throw new Error(`Configuración de seguridad '${key}' no existe`);
    }

    let configValue = value;
    if (existing.data_type === 'array' || existing.data_type === 'object') {
      configValue = JSON.stringify(value);
    } else if (existing.data_type === 'boolean') {
      configValue = value ? 'true' : 'false';
    } else {
      configValue = String(value);
    }

    db.prepare('UPDATE security_configuration SET config_value = ? WHERE config_key = ?').run(
      configValue,
      key
    );

    this.clearCache();
  }

  /**
   * Actualizar ambiente SRI para un negocio
   * @param {number} negocioId - ID del negocio
   * @param {string} ambiente - 'pruebas' o 'produccion'
   */
  updateSRIAmbiente(negocioId, ambiente) {
    if (!['pruebas', 'produccion'].includes(ambiente)) {
      throw new Error('Ambiente debe ser "pruebas" o "produccion"');
    }

    const db = this.connect();
    db.prepare('UPDATE sri_configuration SET ambiente = ? WHERE negocio_id = ?').run(
      ambiente,
      negocioId
    );
  }

  /**
   * Activar/desactivar un modelo de IA
   * @param {string} provider - Proveedor del modelo
   * @param {string} modelId - ID del modelo
   * @param {boolean} isActive - Estado activo
   */
  updateIAModelStatus(provider, modelId, isActive) {
    const db = this.connect();
    db.prepare('UPDATE ia_models SET is_active = ? WHERE provider = ? AND model_id = ?').run(
      isActive ? 1 : 0,
      provider,
      modelId
    );

    this.clearCache();
  }

  /**
   * Activar/desactivar un método de pago
   * @param {string} id - ID del método de pago
   * @param {boolean} isActive - Estado activo
   */
  updatePaymentMethodStatus(id, isActive) {
    const db = this.connect();
    db.prepare('UPDATE payment_methods SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);

    this.clearCache();
  }
}

// Exportar instancia singleton
const configService = new ConfigurationService();
configService.connect();

module.exports = configService;
module.exports.ConfigurationService = ConfigurationService;
