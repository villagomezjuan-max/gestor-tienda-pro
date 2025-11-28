/* ========================================
   MOTOR UNIFICADO DE INTELIGENCIA ARTIFICIAL
   Sistema centralizado para múltiples proveedores de IA
   ======================================== */

// Constantes de configuración
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODELS_ENDPOINT = `${GEMINI_API_BASE_URL}/models`;

const IAUnifiedEngine = {
  // Estado del motor
  initialized: false,
  currentProvider: null,
  currentModel: null,
  availableModels: [],
  serverConfig: null,
  featureState: {},
  featureCatalog: {},
  negocioId: null,

  // Configuración actual
  config: {
    provider: 'openai', // openai, deepseek, gemini, lmstudio
    apiKey: '',
    model: '',
    baseURL: '', // Para LM Studio
    temperature: 0.7,
    maxTokens: 2000,
    providers: {},
  },

  // Agentes disponibles
  agents: {
    citas: null,
    marketing: null,
    general: null,
    ventas: null,
    vehiculos: null,
  },

  // Proveedores soportados
  providers: {
    openai: {
      name: 'OpenAI (GPT)',
      icon: 'fa-brain',
      apiEndpoint: 'https://api.openai.com/v1',
      modelsEndpoint: 'https://api.openai.com/v1/models',
      requiresApiKey: true,
      supportsStreaming: true,
      defaultModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    },
    deepseek: {
      name: 'DeepSeek',
      icon: 'fa-lightbulb',
      apiEndpoint: 'https://api.deepseek.com',
      modelsEndpoint: 'https://api.deepseek.com/v1/models',
      requiresApiKey: true,
      supportsStreaming: true,
      defaultModels: ['deepseek-chat', 'deepseek-reasoner'],
    },
    gemini: {
      name: 'Google Gemini',
      icon: 'fa-google',
      apiEndpoint: GEMINI_API_BASE_URL,
      modelsEndpoint: GEMINI_MODELS_ENDPOINT,
      requiresApiKey: true,
      supportsStreaming: true,
      defaultModels: [
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-2.0-flash',
        'gemini-2.5-flash-lite',
      ],
    },
    lmstudio: {
      name: 'LM Studio (Local)',
      icon: 'fa-server',
      apiEndpoint: 'http://localhost:1234/v1',
      modelsEndpoint: 'http://localhost:1234/v1/models',
      requiresApiKey: false,
      supportsStreaming: true,
      defaultModels: [],
    },
  },

  getDefaultProviderConfig(providerId) {
    const defaults = {
      apiKey: '',
      model: '',
      baseURL: providerId === 'lmstudio' ? 'http://localhost:1234/v1' : '',
      availableModels: [],
      lastVerified: null,
    };
    return { ...defaults };
  },

  ensureProviderConfig(providerId) {
    if (!providerId) {
      return this.getDefaultProviderConfig('openai');
    }

    if (!this.config.providers || typeof this.config.providers !== 'object') {
      this.config.providers = {};
    }

    const normalized = this.normalizeProviderId(providerId);
    if (!this.config.providers[normalized]) {
      this.config.providers[normalized] = this.getDefaultProviderConfig(normalized);
    }

    return this.config.providers[normalized];
  },

  ensureAllProviderConfigs() {
    Object.keys(this.providers).forEach((providerId) => {
      this.ensureProviderConfig(providerId);
    });
  },

  getProviderConfig(providerId) {
    const normalized = this.normalizeProviderId(providerId);
    const config = this.ensureProviderConfig(normalized);
    return { ...config };
  },

  setProviderConfig(providerId, data = {}) {
    if (!providerId) {
      return;
    }

    const normalized = this.normalizeProviderId(providerId);
    const entry = this.ensureProviderConfig(normalized);

    const safeAssign = (key, value) => {
      if (value === undefined) {
        return;
      }
      entry[key] = value ?? '';
    };

    safeAssign('apiKey', data.apiKey);
    safeAssign('model', data.model);
    safeAssign('baseURL', data.baseURL);

    if (Array.isArray(data.availableModels)) {
      entry.availableModels = data.availableModels;
    }

    if (data.lastVerified !== undefined) {
      entry.lastVerified = data.lastVerified;
    }

    if (normalized === this.normalizeProviderId(this.currentProvider || this.config.provider)) {
      this.applyProviderConfig(normalized);
    }
  },

  syncCurrentProviderEntry() {
    const providerId = this.normalizeProviderId(
      this.currentProvider || this.config.provider || 'openai'
    );
    const entry = this.ensureProviderConfig(providerId);
    entry.apiKey = this.config.apiKey || '';
    entry.model = this.config.model || '';
    entry.baseURL =
      this.config.baseURL ||
      (providerId === 'lmstudio' ? entry.baseURL || 'http://localhost:1234/v1' : '');
    if (Array.isArray(this.availableModels)) {
      entry.availableModels = [...this.availableModels];
    }
  },

  applyProviderConfig(providerId) {
    const normalized = this.normalizeProviderId(providerId || this.config.provider);
    const entry = this.ensureProviderConfig(normalized);

    this.config.provider = normalized;
    this.currentProvider = normalized;
    this.config.apiKey = entry.apiKey || '';
    this.config.model = entry.model || '';
    this.config.baseURL =
      entry.baseURL || (normalized === 'lmstudio' ? 'http://localhost:1234/v1' : '');
    this.currentModel = this.config.model;
    this.availableModels = Array.isArray(entry.availableModels) ? [...entry.availableModels] : [];
  },

  getFirstStoredValue(keys = []) {
    if (!Array.isArray(keys)) {
      return '';
    }

    for (const key of keys) {
      if (!key) {
        continue;
      }
      const value = this.getScopedValue(key);
      if (value) {
        return value;
      }
    }
    return '';
  },

  hydrateProviderFromLegacy(providerId) {
    const mapping = this.providerKeyMap?.[providerId];
    if (!mapping) {
      return;
    }

    const entry = this.ensureProviderConfig(providerId);

    if (!entry.apiKey) {
      const legacyApiKey = this.getFirstStoredValue(mapping.apiKeys);
      if (legacyApiKey) {
        entry.apiKey = legacyApiKey;
      }
    }

    if (!entry.model) {
      const legacyModel = this.getFirstStoredValue(mapping.modelKeys);
      if (legacyModel) {
        entry.model = legacyModel;
      }
    }

    if (!entry.baseURL && Array.isArray(mapping.urlKeys) && mapping.urlKeys.length) {
      const legacyUrl = this.getFirstStoredValue(mapping.urlKeys);
      if (legacyUrl) {
        entry.baseURL = legacyUrl;
      }
    }
  },

  migrateLegacyProviderData() {
    try {
      const storedProvider =
        this.getScopedValue('ia_proveedor') || this.getScopedValue('ia_provider');
      if (storedProvider) {
        const normalized = this.normalizeProviderId(storedProvider);
        if (normalized && this.providers[normalized]) {
          this.config.provider = normalized;
          this.currentProvider = normalized;
        }
      }
    } catch (error) {
      console.warn(
        'IAUnifiedEngine.migrateLegacyProviderData: no se pudo leer proveedor previo.',
        error
      );
    }

    Object.keys(this.providers).forEach((providerId) => {
      this.hydrateProviderFromLegacy(providerId);
    });
  },

  providerKeyMap: {
    gemini: {
      // Prioridad: API Key general > API Key específica de facturas
      apiKeys: ['ia_gemini_api_key', 'ia_facturas_gemini_apikey', 'ia_facturas_gemini_api_key'],
      modelKeys: ['ia_gemini_model', 'ia_facturas_gemini_model'],
      urlKeys: [],
    },
    deepseek: {
      apiKeys: ['ia_deepseek_api_key'],
      modelKeys: ['ia_deepseek_model'],
      urlKeys: [],
    },
    openai: {
      apiKeys: ['ia_openai_api_key'],
      modelKeys: ['ia_openai_model'],
      urlKeys: [],
    },
    lmstudio: {
      apiKeys: ['ia_lmstudio_api_key', 'ia_llmstudio_api_key'],
      modelKeys: ['ia_lmstudio_model', 'ia_llmstudio_model'],
      urlKeys: ['ia_lmstudio_url', 'ia_llmstudio_url', 'ia_api_url'],
    },
  },

  getScopedValue(key) {
    if (window.TenantStorage && typeof TenantStorage.getItem === 'function') {
      return TenantStorage.getItem(key);
    }
    return localStorage.getItem(key);
  },

  setScopedValue(key, value) {
    if (window.TenantStorage && typeof TenantStorage.setItem === 'function') {
      TenantStorage.setItem(key, value);
      return;
    }
    localStorage.setItem(key, value);
  },

  removeScopedValue(key) {
    if (window.TenantStorage && typeof TenantStorage.removeItem === 'function') {
      TenantStorage.removeItem(key);
      return;
    }
    localStorage.removeItem(key);
  },

  normalizeProviderId(provider) {
    const raw = (provider || '').toString().trim().toLowerCase();
    if (!raw) {
      return 'openai';
    }

    if (raw === 'google_gemini' || raw === 'gemini' || raw === 'gemini-pro') {
      return 'gemini';
    }

    if (raw === 'lmstudio' || raw === 'lm_studio' || raw === 'lm-studio') {
      return 'lmstudio';
    }

    return raw;
  },

  mapProviderForStorage(provider) {
    const normalized = this.normalizeProviderId(provider);
    if (normalized === 'gemini') {
      return 'google_gemini';
    }
    if (normalized === 'lmstudio') {
      return 'lm_studio';
    }
    return normalized;
  },

  isRateLimitMessage(message) {
    if (!message || typeof message !== 'string') {
      return false;
    }
    const normalized = message.toLowerCase();
    return (
      normalized.includes('límite de peticiones') ||
      normalized.includes('limite de peticiones') ||
      normalized.includes('límite de consultas') ||
      normalized.includes('limite de consultas') ||
      normalized.includes('rate limit') ||
      normalized.includes('too many requests') ||
      normalized.includes('ia_rate_limit') ||
      normalized.includes('excedido el límite') ||
      normalized.includes('excedido el limite')
    );
  },

  pickFirstFromConfig(configMap, keys) {
    if (!configMap || typeof configMap !== 'object' || !Array.isArray(keys)) {
      return undefined;
    }

    for (const key of keys) {
      if (!key) continue;
      const value = configMap[key];
      if (value !== undefined && value !== null) {
        return value;
      }
    }

    return undefined;
  },

  // ============================================
  // INICIALIZAR MOTOR DE IA
  // ============================================
  async init() {
    console.log('🤖 Inicializando Motor Unificado de IA...');

    try {
      // Cargar configuración guardada
      await this.loadConfig();

      // Verificar conexión si hay configuración
      if (this.isConfigured()) {
        await this.verifyConnection();
      }

      // Inicializar agentes
      this.initializeAgents();

      this.initialized = true;
      this._initializationPromise = null; // Limpiar promise después de completar
      console.log('✅ Motor de IA inicializado correctamente');

      return true;
    } catch (error) {
      console.error('❌ Error inicializando motor de IA:', error);
      this._initializationPromise = null; // Limpiar promise en caso de error
      return false;
    }
  },

  async initialize(options = {}) {
    const force = options?.force === true;

    // Si ya está inicializado y no se fuerza, retornar inmediatamente
    if (this.initialized && !force) {
      return true;
    }

    // Si ya hay una inicialización en progreso, esperar a que termine
    if (this._initializationPromise && !force) {
      console.log('⏳ Inicialización ya en progreso, esperando...');
      return this._initializationPromise;
    }

    if (force) {
      this.initialized = false;
    }

    // Guardar la promesa de inicialización
    this._initializationPromise = this.init();
    return this._initializationPromise;
  },

  // ============================================
  // CONFIGURACIÓN DESDE EL SERVIDOR
  // ============================================
  async fetchServerConfig() {
    try {
      const data = await Auth._request('/ia/config');

      if (!data?.success) {
        const message = data?.message || 'No se pudo obtener la configuración de IA.';
        throw new Error(message);
      }

      return data.config || {};
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error('No se pudo conectar con el backend de IA.');
      throw err;
    }
  },

  async refreshServerConfig() {
    const config = await this.fetchServerConfig();
    return this.applyServerConfig(config);
  },

  applyServerConfig(serverConfig = {}) {
    if (!serverConfig || typeof serverConfig !== 'object') {
      return null;
    }

    const normalizedProvider = this.normalizeProviderId(
      serverConfig.provider || this.config.provider || 'gemini'
    );

    this.serverConfig = {
      ...serverConfig,
      provider: normalizedProvider,
    };

    if (Object.prototype.hasOwnProperty.call(serverConfig, 'features')) {
      this.featureState = {
        ...(serverConfig.features || {}),
      };
    } else if (!this.featureState) {
      this.featureState = {};
    }

    if (Object.prototype.hasOwnProperty.call(serverConfig, 'featureCatalog')) {
      this.featureCatalog = {
        ...(serverConfig.featureCatalog || {}),
      };
    } else if (!this.featureCatalog) {
      this.featureCatalog = {};
    }

    if (Object.prototype.hasOwnProperty.call(serverConfig, 'negocioId')) {
      this.negocioId = serverConfig.negocioId || null;
    }

    this.config.provider = normalizedProvider;
    this.currentProvider = normalizedProvider;

    const entry = this.ensureProviderConfig(normalizedProvider);
    entry.apiKey = '';
    entry.model = serverConfig.model || entry.model || '';
    entry.baseURL =
      serverConfig.baseURL ||
      entry.baseURL ||
      (normalizedProvider === 'lmstudio' ? entry.baseURL || 'http://localhost:1234/v1' : '');

    this.config.apiKey = '';
    this.config.model = entry.model;
    this.currentModel = entry.model;

    if (normalizedProvider === 'lmstudio') {
      this.config.baseURL = entry.baseURL;
    } else {
      this.config.baseURL = '';
    }

    this.config.temperature = serverConfig.temperature ?? this.config.temperature;
    this.config.maxTokens = serverConfig.maxTokens ?? this.config.maxTokens;

    const mapModels = (items = []) => {
      return items
        .map((item) => {
          if (!item) {
            return null;
          }

          if (typeof item === 'string') {
            return { id: item, name: item };
          }

          if (typeof item === 'object') {
            const id = item.id || item.name || item.model;
            if (!id) {
              return null;
            }
            return {
              id,
              name: item.name || item.displayName || id,
            };
          }

          return null;
        })
        .filter(Boolean);
    };

    if (Array.isArray(serverConfig.allowedModels) && serverConfig.allowedModels.length) {
      const mapped = mapModels(serverConfig.allowedModels);
      this.availableModels = mapped;
      entry.availableModels = [...mapped];
    } else if (serverConfig.model) {
      this.availableModels = mapModels([serverConfig.model]);
    }

    this.config.hasApiKey = Boolean(serverConfig.hasApiKey);
    this.config.isConfigured = Boolean(serverConfig.isConfigured);

    return this.serverConfig;
  },

  getFeatureState() {
    return {
      ...(this.featureState || {}),
    };
  },

  isFeatureEnabled(featureId) {
    if (!featureId) {
      return false;
    }
    return Boolean(this.featureState?.[featureId]);
  },

  getFeatureCatalog() {
    return {
      ...(this.featureCatalog || {}),
    };
  },

  // ============================================
  // CARGAR CONFIGURACIÓN
  // ============================================
  async loadConfig() {
    try {
      const savedConfig = this.getScopedValue('ia_unified_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        const mergedProviders = {
          ...(this.config.providers || {}),
          ...(parsed.providers || {}),
        };

        this.config = {
          ...this.config,
          ...parsed,
          providers: mergedProviders,
        };
      }

      const advancedConfig = this.getScopedValue('ia_config');
      if (advancedConfig) {
        const advanced = JSON.parse(advancedConfig);
        if (advanced.provider) {
          const normalized = this.normalizeProviderId(advanced.provider);
          this.config.provider = normalized;
        }

        const activeProvider = this.config.provider;
        const entry = this.ensureProviderConfig(activeProvider);

        if (advanced.apiKey) {
          entry.apiKey = advanced.apiKey;
        }
        if (advanced.model) {
          entry.model = advanced.model;
        }
        if (advanced.baseURL) {
          entry.baseURL = advanced.baseURL;
        }
      }
    } catch (error) {
      console.error('Error cargando configuración local:', error);
    }

    // Migrar configuraciones heredadas antes de aplicar datos del servidor
    this.migrateLegacyProviderData();

    try {
      const cachedServerConfig = this.getScopedValue('ia_server_config');
      if (cachedServerConfig && !this.serverConfig) {
        const parsed = JSON.parse(cachedServerConfig);
        if (parsed && typeof parsed === 'object') {
          this.applyServerConfig(parsed);
        }
      }
    } catch (error) {
      console.warn('No se pudo aplicar configuración IA en caché:', error);
    }

    try {
      if (typeof this.fetchServerConfig === 'function') {
        const serverConfig = await this.fetchServerConfig();
        if (serverConfig) {
          this.applyServerConfig(serverConfig);
        }
      }
    } catch (error) {
      console.warn(
        'No se pudo sincronizar configuración IA desde el servidor:',
        error.message || error
      );
    }

    this.ensureAllProviderConfigs();
    this.applyProviderConfig(this.config.provider);
    this.syncCurrentProviderEntry();

    this.setScopedValue('ia_unified_config', JSON.stringify(this.config));
    if (this.serverConfig) {
      this.setScopedValue('ia_server_config', JSON.stringify(this.serverConfig));
    }

    console.log('📝 Configuración de IA cargada:', {
      provider: this.config.provider,
      hasApiKey: !!this.serverConfig?.hasApiKey,
      hasLocalApiKey: !!this.config.apiKey,
      model: this.config.model,
      featureState: this.featureState,
      availableModels: this.availableModels.length,
    });

    // Log de diagnóstico adicional para Gemini
    if (this.config.provider === 'gemini') {
      console.log('🔍 Diagnóstico Gemini:', {
        apiKeySource: this.config.apiKey ? 'Local' : 'Server',
        apiKeyLength: (this.config.apiKey || '').length,
        modelSelected: this.config.model,
        endpoint: GEMINI_API_BASE_URL,
      });
    }
  },

  // ============================================
  // GUARDAR CONFIGURACIÓN
  // ============================================
  async saveConfig() {
    try {
      this.setScopedValue('ia_unified_config', JSON.stringify(this.config));

      this.setScopedValue(
        'ia_config',
        JSON.stringify({
          provider: this.config.provider,
          apiKey: this.config.apiKey,
          model: this.config.model,
          baseURL: this.config.baseURL,
        })
      );

      await this.syncGlobalConfigIfAuthorized();

      console.log('💾 Configuración guardada');
      return true;
    } catch (error) {
      console.error('Error guardando configuración:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('No se pudo guardar la configuración de IA.');
    }
  },

  async syncGlobalConfigIfAuthorized() {
    const auth = window.Auth;
    if (!auth || typeof auth.isSuperAdmin !== 'function' || !auth.isSuperAdmin()) {
      return null;
    }

    const payload = {
      provider: this.config.provider,
      apiKey: typeof this.config.apiKey === 'string' ? this.config.apiKey.trim() : '',
      model: typeof this.config.model === 'string' ? this.config.model.trim() : '',
      baseURL: typeof this.config.baseURL === 'string' ? this.config.baseURL.trim() : '',
    };

    if (Number.isFinite(this.config.temperature)) {
      payload.temperature = this.config.temperature;
    }

    if (Number.isFinite(this.config.maxTokens)) {
      payload.maxTokens = Math.round(this.config.maxTokens);
    }

    let data;

    try {
      data = await Auth._request('/admin/ia/config', {
        method: 'POST',
        body: payload,
      });
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudo conectar con el servidor para guardar la configuración global de IA.';
      if (this.isRateLimitMessage(message)) {
        console.warn('⚠️ Sincronización IA detenida por límite de peticiones:', message);
        if (window.Utils?.showToast) {
          Utils.showToast(
            'Límite de peticiones alcanzado. Usa la configuración local y reintenta luego.',
            'warning'
          );
        }
        return { success: false, rateLimited: true, message };
      }
      throw new Error(message);
    }

    if (!data?.success) {
      const message = data?.message || 'No se pudo guardar la configuración global de IA.';
      if (this.isRateLimitMessage(message)) {
        console.warn('⚠️ Sincronización IA rechazada por límite de peticiones:', message);
        if (window.Utils?.showToast) {
          Utils.showToast(
            'Límite de peticiones alcanzado. La configuración local seguirá activa.',
            'warning'
          );
        }
        return { success: false, rateLimited: true, message };
      }
      throw new Error(message);
    }

    const previousApiKey = this.config.apiKey;
    const previousModel = this.config.model;
    const previousBaseURL = this.config.baseURL;

    if (data.config) {
      this.applyServerConfig(data.config);
      this.setScopedValue('ia_server_config', JSON.stringify(data.config));
    }

    if (previousApiKey) {
      const entry = this.ensureProviderConfig(this.config.provider);
      entry.apiKey = previousApiKey;
      this.config.apiKey = previousApiKey;
    }

    if (previousModel) {
      this.config.model = previousModel;
      this.currentModel = previousModel;
    }

    if (typeof previousBaseURL === 'string' && previousBaseURL) {
      const entry = this.ensureProviderConfig(this.config.provider);
      entry.baseURL = previousBaseURL;
      this.config.baseURL = previousBaseURL;
    }

    this.syncCurrentProviderEntry();
    console.log('☁️ Configuración global de IA sincronizada con el servidor.');

    return data;
  },

  // ============================================
  // VERIFICAR CONEXIÓN Y API KEY
  // ============================================
  async verifyConnection() {
    try {
      const provider = this.providers[this.config.provider];
      const providerName = provider?.name || this.config.provider;
      console.log(`🔍 Verificando configuración con ${providerName}...`);

      const models = await this.fetchAvailableModels(this.config.provider);
      this.availableModels = Array.isArray(models) ? models : [];

      console.log(`✅ ${this.availableModels.length} modelos disponibles para ${providerName}`);
      return {
        success: true,
        models: this.availableModels,
        provider: providerName,
      };
    } catch (error) {
      console.error('❌ Error verificando conexión:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // ============================================
  // VERIFICAR API KEY Y OBTENER MODELOS DINÁMICAMENTE
  // ============================================
  async verifyApiKeyAndFetchModels(providerId, apiKey, baseURL = null) {
    try {
      console.log(`🔑 Verificando API key para ${providerId}...`);

      const data = await Auth._request('/admin/ia/verify-and-fetch-models', {
        method: 'POST',
        body: JSON.stringify({
          provider: providerId,
          apiKey: apiKey,
          baseURL: baseURL,
        }),
      });

      if (!data?.success) {
        throw new Error(data?.message || 'Error verificando API key');
      }

      const models = (data.models || []).map((m) => ({
        id: m.id,
        name: m.displayName || m.name || m.id,
        description: m.description || '',
      }));

      console.log(`✅ API key válida. ${models.length} modelos obtenidos de la API`);

      return {
        success: true,
        verified: true,
        models: models,
        totalModels: models.length,
        message: data.message,
      };
    } catch (error) {
      console.error('❌ Error verificando API key:', error);
      return {
        success: false,
        verified: false,
        error: error.message,
        models: [],
      };
    }
  },

  // ============================================
  // OBTENER MODELOS DISPONIBLES
  // ============================================
  async fetchAvailableModels(providerId = null) {
    const targetProvider = providerId || this.config.provider || this.currentProvider || 'gemini';

    try {
      const data = await Auth._request(
        `/admin/ia/models?provider=${encodeURIComponent(targetProvider)}`
      );

      if (!data?.success) {
        console.warn(
          `No se pudieron obtener modelos para ${targetProvider}:`,
          data?.message || 'Respuesta sin éxito'
        );
        return this.getDefaultModelsForProvider(targetProvider);
      }

      if (Array.isArray(data.models) && data.models.length) {
        return data.models.map((model) => ({
          id: model.id,
          name: model.displayName || model.name || model.id,
          description: model.description || '',
        }));
      }

      return this.getDefaultModelsForProvider(targetProvider);
    } catch (error) {
      console.warn('Error obteniendo modelos desde el servidor:', error);
      return this.getDefaultModelsForProvider(targetProvider);
    }
  },

  getDefaultModelsForProvider(providerId) {
    const normalized = this.normalizeProviderId(providerId);

    const defaults = {
      gemini: [
        {
          id: 'gemini-2.5-flash',
          name: 'Gemini 2.5 Flash (Recomendado)',
          description: 'Mejor relación precio-rendimiento, ideal para la mayoría de tareas',
        },
        {
          id: 'gemini-2.5-pro',
          name: 'Gemini 2.5 Pro',
          description: 'Modelo thinking avanzado para análisis complejos',
        },
        {
          id: 'gemini-2.5-flash-lite',
          name: 'Gemini 2.5 Flash Lite',
          description: 'Ultra rápido y económico',
        },
        {
          id: 'gemini-2.0-flash',
          name: 'Gemini 2.0 Flash',
          description: 'Modelo de trabajo con 1M tokens de contexto',
        },
      ],
      openai: [
        {
          id: 'gpt-4o',
          name: 'GPT-4o (Recomendado)',
          description: 'Modelo más avanzado y multimodal de OpenAI',
        },
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          description: 'Versión eficiente, rápida y económica',
        },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'GPT-4 optimizado para producción' },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          description: 'Modelo rápido y muy económico',
        },
      ],
      deepseek: [
        {
          id: 'deepseek-chat',
          name: 'DeepSeek V3 Chat (Recomendado)',
          description: 'DeepSeek-V3.2 modo normal - potente y económico',
        },
        {
          id: 'deepseek-reasoner',
          name: 'DeepSeek V3 Reasoner',
          description: 'DeepSeek-V3.2 modo thinking - razonamiento profundo',
        },
      ],
      lmstudio: [
        { id: 'local-model', name: 'Modelo Local', description: 'Modelo cargado en LM Studio' },
      ],
    };

    return defaults[normalized] || defaults.gemini;
  },

  // ============================================
  // PARSEAR RESPUESTA DE MODELOS
  // ============================================
  // ============================================
  // INICIALIZAR AGENTES
  // ============================================
  initializeAgents() {
    // Registrar agente de citas
    if (window.AgendaIAAgent) {
      this.agents.citas = window.AgendaIAAgent;
      console.log('✅ Agente de Citas registrado');
    }

    // Registrar agente de marketing/general
    if (window.ChatAssistant) {
      this.agents.marketing = window.ChatAssistant;
      this.agents.general = window.ChatAssistant;
      console.log('✅ Agente de Marketing registrado');
    }

    if (window.VehiculosIAAgent) {
      this.agents.vehiculos = window.VehiculosIAAgent;
      console.log('✅ Agente de Vehículos registrado');
    }
  },

  // ============================================
  // COMPLETAR CHAT (Método principal)
  // ============================================
  async chatCompletion(messages, options = {}) {
    if (!Array.isArray(messages) || !messages.length) {
      throw new Error('No hay mensajes para procesar.');
    }

    const sanitizedMessages = messages
      .filter((msg) => msg && typeof msg === 'object')
      .map((msg) => ({
        role: msg.role || 'user',
        content: typeof msg.content === 'string' ? msg.content : '',
      }))
      .filter((msg) => msg.content);

    if (!sanitizedMessages.length) {
      throw new Error('No hay contenido válido para enviar a la IA.');
    }

    const agentType =
      typeof options.agentType === 'string'
        ? options.agentType
        : typeof options.agent === 'string'
          ? options.agent
          : 'general';

    return await this.callServerChat(sanitizedMessages, {
      ...options,
      agentType,
    });
  },

  async callServerChat(messages, options = {}) {
    const payload = {
      messages,
      agentType: options.agentType || 'general',
    };

    const temperature = options.temperature ?? this.serverConfig?.temperature;
    if (typeof temperature === 'number') {
      payload.temperature = temperature;
    }

    const maxTokens = options.maxTokens ?? this.serverConfig?.maxTokens;
    if (typeof maxTokens === 'number') {
      payload.maxTokens = maxTokens;
    }

    const model = options.model || this.serverConfig?.model || this.config.model;
    if (model) {
      payload.model = model;
    }

    if (options.systemPrompt && !messages.some((msg) => msg.role === 'system')) {
      payload.systemPrompt = options.systemPrompt;
    }

    if (options.userMessage && !messages.some((msg) => msg.role === 'user')) {
      payload.userMessage = options.userMessage;
    }

    let data;
    try {
      data = await Auth._request('/ia/chat', {
        method: 'POST',
        body: payload,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo obtener la respuesta de IA.';
      // Detectar si es un error de rate limiting y dar mensaje más amigable
      if (this.isRateLimitMessage(message)) {
        const retryMatch = message.match(/(\d+)\s*segundos/);
        const retrySeconds = retryMatch ? parseInt(retryMatch[1], 10) : 60;
        const retryMinutes = Math.ceil(retrySeconds / 60);
        throw new Error(
          `Has excedido el límite de consultas de IA. Por favor espera ${retryMinutes > 1 ? retryMinutes + ' minutos' : retrySeconds + ' segundos'} antes de intentar de nuevo.`
        );
      }
      throw new Error(message);
    }

    if (!data?.success) {
      const message = data?.message || 'No se pudo obtener la respuesta de IA.';
      // Detectar si es un error de rate limiting
      if (this.isRateLimitMessage(message)) {
        const retryMatch = message.match(/(\d+)\s*segundos/);
        const retrySeconds = retryMatch ? parseInt(retryMatch[1], 10) : 60;
        const retryMinutes = Math.ceil(retrySeconds / 60);
        throw new Error(
          `Has excedido el límite de consultas de IA. Por favor espera ${retryMinutes > 1 ? retryMinutes + ' minutos' : retrySeconds + ' segundos'} antes de intentar de nuevo.`
        );
      }
      throw new Error(message);
    }

    return {
      content: data.message || '',
      model: data.model || model,
      feature: data.feature || payload.agentType,
      usage: data.usage || null,
      raw: data,
    };
  },

  // ============================================
  // MÉTODO SIMPLIFICADO PARA MENSAJES
  // ============================================
  async sendMessage(userMessage, systemPrompt = '', agentType = 'general') {
    const messages = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: userMessage,
    });

    try {
      const response = await this.chatCompletion(messages, { agentType });
      return response.content;
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      throw error;
    }
  },

  // ============================================
  // CAMBIAR PROVEEDOR
  // ============================================
  async changeProvider(provider, apiKey = null, baseURL = null) {
    if (!this.providers[provider]) {
      throw new Error('Proveedor no válido');
    }

    this.config.provider = provider;
    this.currentProvider = provider;

    if (apiKey) {
      this.config.apiKey = apiKey;
    }

    if (baseURL) {
      this.config.baseURL = baseURL;
    }

    // Guardar configuración
    await this.saveConfig();

    // Verificar conexión
    return await this.verifyConnection();
  },

  // ============================================
  // CAMBIAR MODELO
  // ============================================
  async changeModel(modelId) {
    this.config.model = modelId;
    this.currentModel = modelId;
    await this.saveConfig();
    console.log('✅ Modelo cambiado a:', modelId);
  },

  // ============================================
  // OBTENER INFO DEL ESTADO
  // ============================================
  getStatus() {
    return {
      initialized: this.initialized,
      provider: this.currentProvider,
      providerName: this.providers[this.currentProvider]?.name,
      model: this.currentModel,
      hasApiKey: !!this.serverConfig?.hasApiKey,
      serverConfigured: !!this.serverConfig?.isConfigured,
      availableModels: this.availableModels,
      features: this.getFeatureState(),
      agents: Object.keys(this.agents).filter((key) => this.agents[key]),
    };
  },

  // ============================================
  // MÉTODOS DE UTILIDAD
  // ============================================

  // Obtener lista de proveedores
  getProviders() {
    return Object.entries(this.providers).map(([id, provider]) => ({
      id,
      name: provider.name,
      icon: provider.icon,
      requiresApiKey: provider.requiresApiKey,
      isLocal: id === 'lmstudio',
    }));
  },

  // Obtener modelos del proveedor actual
  getAvailableModels() {
    return this.availableModels;
  },

  // Verificar si está configurado
  isConfigured() {
    if (this.serverConfig) {
      return Boolean(this.serverConfig.isConfigured);
    }

    return !!(
      this.config.provider &&
      (this.config.apiKey || this.config.provider === 'lmstudio') &&
      this.config.model
    );
  },
};

// Exponer globalmente
window.IAUnifiedEngine = IAUnifiedEngine;

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    IAUnifiedEngine.init();
  });
} else {
  IAUnifiedEngine.init();
}
