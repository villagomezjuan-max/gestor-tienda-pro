/* ========================================
   CONFIGURACIÓN UNIFICADA DE INTELIGENCIA ARTIFICIAL
   Panel para gestionar todos los proveedores de IA
   ======================================== */

const IAConfigPanel = {
  currentProvider: null,
  testingConnection: false,

  // ============================================
  // RENDERIZAR PANEL
  // ============================================
  render() {
    const status = IAUnifiedEngine.getStatus();
    const providers = IAUnifiedEngine.getProviders();
    const selectedProvider =
      status.provider || IAUnifiedEngine.config?.provider || this.currentProvider || 'openai';
    const providerInfo = IAUnifiedEngine.providers[selectedProvider];
    const providerName = providerInfo?.name || status.providerName;
    const availableModels =
      status.availableModels && status.availableModels.length
        ? status.availableModels
        : IAUnifiedEngine.getAvailableModels
          ? IAUnifiedEngine.getAvailableModels()
          : [];

    this.currentProvider = selectedProvider;

    return `
            <div class="ia-config-panel">
                <!-- Estado Actual -->
                <div class="ia-status-card ${status.initialized ? 'connected' : 'disconnected'}">
                    <div class="status-icon">
                        <i class="fas fa-${status.initialized ? 'check-circle' : 'exclamation-circle'}"></i>
                    </div>
                    <div class="status-info">
                        <h4>${status.initialized ? '✅ IA Configurada' : '⚠️ IA No Configurada'}</h4>
                        ${
                          status.initialized
                            ? `
                            <p><strong>Proveedor General:</strong> ${providerName || 'No seleccionado'}</p>
                            <p><strong>Modelo General:</strong> ${status.model || 'No seleccionado'}</p>
                        `
                            : `
                            <p>Configura un proveedor de IA para comenzar</p>
                        `
                        }
                    </div>
                </div>

                <!-- Selector de Proveedor General -->
                <div class="config-section">
                    <h3><i class="fas fa-brain"></i> IA para Funciones Generales</h3>
                    <p class="section-description">
                        Selecciona el proveedor de IA para el asistente de chat, marketing, etc.
                    </p>
                    
                    <div class="providers-grid">
                        ${providers.map((provider) => this.renderProviderCard(provider)).join('')}
                    </div>
                </div>

                <!-- Configuración del Proveedor General -->
                <div id="providerConfig" class="config-section">
                    ${this.renderProviderConfig(selectedProvider)}
                </div>

                <!-- Configuración Avanzada General -->
                <div class="config-section">
                    <h3><i class="fas fa-sliders-h"></i> Configuración Avanzada (General)</h3>
                    
                    <div class="form-group">
                        <label>
                            Temperatura (Creatividad)
                            <i class="fas fa-question-circle" title="0 = Más preciso, 1 = Más creativo"></i>
                        </label>
                        <div class="slider-container">
                            <input type="range" id="iaTemperature" class="form-range" 
                                   min="0" max="1" step="0.1" 
                                   value="${IAUnifiedEngine.config.temperature}"
                                   data-action="updateTemperature">
                            <span class="slider-value" id="temperatureValue">${IAUnifiedEngine.config.temperature}</span>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            Tokens Máximos
                            <i class="fas fa-question-circle" title="Longitud máxima de la respuesta"></i>
                        </label>
                        <input type="number" id="iaMaxTokens" class="form-control" 
                               value="${IAUnifiedEngine.config.maxTokens}"
                               min="100" max="8000" step="100"
                               data-action="updateMaxTokens">
                    </div>
                </div>

                <!-- Botones de Acción -->
                <div class="config-actions">
                    <button class="btn btn-primary" data-action="saveConfiguration">
                        <i class="fas fa-save"></i> Guardar Toda la Configuración
                    </button>
                    <button class="btn btn-success" data-action="testConnection">
                        <i class="fas fa-vial"></i> Probar Conexión General
                    </button>
                    <button class="btn btn-secondary" data-action="resetConfiguration">
                        <i class="fas fa-redo"></i> Resetear
                    </button>
                </div>

                <!-- Resultado de Prueba -->
                <div id="testResult" class="test-result" style="display: none;"></div>
            </div>

            ${this.renderStyles()}
        `;
  },

  renderFacturaExtractorConfig() {
    return '';
  },

  // ============================================
  // RENDERIZAR CARD DE PROVEEDOR
  // ============================================
  renderProviderCard(provider) {
    const isSelected = provider.id === this.currentProvider;
    const requiresKey = provider.requiresApiKey
      ? '<span class="requires-key"><i class="fas fa-key"></i> Requiere API Key</span>'
      : '<span class="local-provider"><i class="fas fa-server"></i> Local</span>';

    return `
            <div class="provider-card ${isSelected ? 'selected' : ''}" 
                 data-provider="${provider.id}"
                 data-action="selectProvider"
                 role="button"
                 tabindex="0">
                <div class="provider-icon">
                    <i class="fas ${provider.icon}"></i>
                </div>
                <h4>${provider.name}</h4>
                ${requiresKey}
                ${isSelected ? '<div class="selected-badge"><i class="fas fa-check"></i></div>' : ''}
            </div>
        `;
  },

  // ============================================
  // RENDERIZAR CONFIGURACIÓN DEL PROVEEDOR
  // ============================================
  renderProviderConfig(providerId) {
    const provider = IAUnifiedEngine.providers[providerId];
    if (!provider) return '';

    // Obtener configuración específica del proveedor
    const providerConfig = IAUnifiedEngine.getProviderConfig(providerId);
    const currentApiKey = providerConfig.apiKey || '';
    const currentBaseURL =
      providerConfig.baseURL || (providerId === 'lmstudio' ? 'http://localhost:1234/v1' : '');
    const currentModel = providerConfig.model || '';
    const availableModels = providerConfig.availableModels || [];

    let configHTML = `
            <h3><i class="fas fa-cog"></i> Configuración de ${provider.name}</h3>
        `;

    if (provider.requiresApiKey) {
      configHTML += `
                <div class="form-group">
                    <label>
                        API Key
                        <i class="fas fa-question-circle" 
                           title="Ingresa tu API Key del proveedor"></i>
                    </label>
                    <div class="input-with-button">
                        <input type="password" 
                               id="iaApiKey" 
                               class="form-control" 
                               placeholder="Pega tu API Key aquí..."
                               value="${currentApiKey}">
                        <button class="btn btn-secondary" data-action="toggleApiKeyVisibility" data-target="#iaApiKey">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                    <small class="form-text">
                        ${this.getProviderInstructions(providerId)}
                    </small>
                </div>
            `;
    }

    if (providerId === 'lmstudio') {
      configHTML += `
                <div class="form-group">
                    <label>
                        URL del Servidor
                        <i class="fas fa-question-circle" 
                           title="URL donde corre LM Studio"></i>
                    </label>
                    <input type="text" 
                           id="iaBaseURL" 
                           class="form-control" 
                           placeholder="http://localhost:1234/v1"
                           value="${currentBaseURL}">
                    <small class="form-text">
                        Asegúrate de que LM Studio esté corriendo y el servidor habilitado.
                    </small>
                </div>
            `;
    }

    // Selector de Modelos
    configHTML += `
            <div class="form-group" id="modelSelector" style="${availableModels.length ? 'display: block;' : 'display: none;'}">
                <label>
                    Modelo a Usar
                    <i class="fas fa-question-circle" title="Selecciona el modelo de IA"></i>
                </label>
                <select id="iaModelSelect" class="form-control" data-action="selectModel">
                    <option value="">Selecciona un modelo...</option>
                    ${availableModels
                      .map(
                        (model) => `
                        <option value="${model.id}" ${model.id === currentModel ? 'selected' : ''}>
                            ${model.name || model.id}
                        </option>
                    `
                      )
                      .join('')}
                </select>
            </div>
        `;

    configHTML += `
            <div class="config-actions">
                <button class="btn btn-primary" data-action="verifyAndLoadModels">
                    <i class="fas fa-sync"></i> Verificar y Cargar Modelos
                </button>
                <button class="btn btn-success" data-action="saveConfiguration">
                    <i class="fas fa-save"></i> Guardar Configuración
                </button>
            </div>
        `;

    return configHTML;
  },

  // ============================================
  // INSTRUCCIONES POR PROVEEDOR
  // ============================================
  getProviderInstructions(providerId) {
    const instructions = {
      openai:
        'Obtén tu API Key en <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a>',
      deepseek:
        'Obtén tu API Key en <a href="https://platform.deepseek.com" target="_blank">DeepSeek Platform</a>',
      gemini:
        'Obtén tu API Key en <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a>',
      lmstudio:
        'No requiere API Key. Descarga LM Studio de <a href="https://lmstudio.ai" target="_blank">lmstudio.ai</a>',
    };
    return instructions[providerId] || '';
  },

  // ============================================
  // SELECCIONAR PROVEEDOR
  // ============================================
  async selectProvider(providerId) {
    if (!providerId) {
      return;
    }

    this.currentProvider = providerId;

    if (this._boundRoot) {
      this._boundRoot.querySelectorAll('.provider-card').forEach((card) => {
        card.classList.toggle('selected', card.dataset.provider === providerId);
      });
    }

    // Aplicar configuración al motor
    IAUnifiedEngine.applyProviderConfig(providerId);

    const configDiv = this._boundRoot?.querySelector('#providerConfig');
    if (configDiv) {
      configDiv.innerHTML = this.renderProviderConfig(providerId);
    }
  },

  // ============================================
  // VERIFICAR Y CARGAR MODELOS
  // ============================================
  async verifyAndLoadModels() {
    const apiKey = this._boundRoot?.querySelector('#iaApiKey')?.value?.trim();
    const baseURL = this._boundRoot?.querySelector('#iaBaseURL')?.value?.trim();
    const providerId = this.currentProvider || IAUnifiedEngine.config.provider;
    const verifyBtn = this._boundRoot?.querySelector('[data-action="verifyAndLoadModels"]');

    if (IAUnifiedEngine.providers[providerId]?.requiresApiKey && !apiKey) {
      Utils.showToast('Por favor ingresa la API Key', 'error');
      return;
    }

    // Mostrar estado de carga
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    }

    Utils.showToast('🔍 Conectando con la API para obtener modelos...', 'info');

    try {
      // Usar la nueva función que consulta la API real
      const result = await IAUnifiedEngine.verifyApiKeyAndFetchModels(providerId, apiKey, baseURL);

      if (result.success && result.verified) {
        Utils.showToast(
          `✅ ${result.message || `Conexión exitosa! ${result.models.length} modelos obtenidos`}`,
          'success'
        );

        // Guardar la API key y modelos en la configuración
        IAUnifiedEngine.setProviderConfig(providerId, {
          apiKey: apiKey,
          baseURL: baseURL,
          availableModels: result.models,
        });

        // Actualizar modelos disponibles en el motor
        IAUnifiedEngine.availableModels = result.models;

        // Re-renderizar para mostrar los modelos obtenidos de la API
        const configDiv = this._boundRoot?.querySelector('#providerConfig');
        if (configDiv) {
          configDiv.innerHTML = this.renderProviderConfig(providerId);
        }

        // Mostrar el selector de modelos
        const modelSelector = this._boundRoot?.querySelector('#modelSelector');
        if (modelSelector) {
          modelSelector.style.display = 'block';
        }
      } else {
        Utils.showToast(`❌ ${result.error || 'Error verificando API key'}`, 'error');
      }
    } catch (error) {
      console.error('Error verificando conexión:', error);
      Utils.showToast(`❌ Error: ${error.message}`, 'error');
    } finally {
      // Restaurar botón
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '<i class="fas fa-sync"></i> Verificar y Cargar Modelos';
      }
    }
  },

  // ============================================
  // SELECCIONAR MODELO
  // ============================================
  async selectModel(modelId) {
    if (!modelId) return;

    await IAUnifiedEngine.changeModel(modelId);
    Utils.showToast(`Modelo "${modelId}" seleccionado`, 'success');
  },

  // ============================================
  // ACTUALIZAR TEMPERATURA
  // ============================================
  updateTemperature(value) {
    const numeric = parseFloat(value);
    if (!Number.isFinite(numeric)) {
      return;
    }

    IAUnifiedEngine.config.temperature = numeric;
    const label = this._boundRoot?.querySelector('#temperatureValue');
    if (label) {
      const formatted = numeric.toFixed(1).replace(/\.0$/, '');
      label.textContent = formatted;
    }
  },

  // ============================================
  // ACTUALIZAR MAX TOKENS
  // ============================================
  updateMaxTokens(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return;
    }
    IAUnifiedEngine.config.maxTokens = parsed;
  },

  // ============================================
  // GUARDAR CONFIGURACIÓN
  // ============================================
  async saveConfiguration() {
    try {
      // Guardar configuración general
      const apiKeyInput = this._boundRoot?.querySelector('#iaApiKey');
      const baseUrlInput = this._boundRoot?.querySelector('#iaBaseURL');
      const modelSelect = this._boundRoot?.querySelector('#iaModelSelect');

      const providerId = this.currentProvider || IAUnifiedEngine.config.provider;

      const configData = {
        apiKey: apiKeyInput ? apiKeyInput.value.trim() : undefined,
        baseURL: baseUrlInput ? baseUrlInput.value.trim() : undefined,
        model: modelSelect ? modelSelect.value : undefined,
      };

      // Actualizar configuración específica del proveedor
      IAUnifiedEngine.setProviderConfig(providerId, configData);

      // Aplicar como configuración activa
      IAUnifiedEngine.applyProviderConfig(providerId);

      await IAUnifiedEngine.saveConfig();

      // Sincronizar con el panel de configuración avanzada principal
      if (window.ConfiguracionAvanzada && typeof ConfiguracionAvanzada.guardarIA === 'function') {
        await ConfiguracionAvanzada.guardarIA({ source: 'panel' });
      } else {
        Utils.showToast('Configuración de IA guardada.', 'success');
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
      Utils.showToast('Error guardando configuración', 'error');
    }
  },

  // ============================================
  // PROBAR CONEXIÓN
  // ============================================
  async testConnection() {
    if (this.testingConnection) return;

    this.testingConnection = true;
    const resultDiv = this._boundRoot?.querySelector('#testResult');
    if (resultDiv) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML =
        '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Probando conexión...</div>';
    }

    try {
      const response = await IAUnifiedEngine.sendMessage(
        '¿Estás funcionando correctamente? Responde con un simple "Sí, funciono correctamente"',
        'Eres un asistente de IA. Responde de manera concisa.'
      );

      if (resultDiv) {
        resultDiv.innerHTML = `
                <div class="test-success">
                    <i class="fas fa-check-circle"></i>
                    <h4>✅ Conexión Exitosa</h4>
                    <p><strong>Respuesta de la IA:</strong></p>
                    <blockquote>${response}</blockquote>
                </div>
            `;
      }

      Utils.showToast('Prueba exitosa!', 'success');
    } catch (error) {
      if (resultDiv) {
        resultDiv.innerHTML = `
                <div class="test-error">
                    <i class="fas fa-times-circle"></i>
                    <h4>❌ Error en la Conexión</h4>
                    <p>${error.message}</p>
                </div>
            `;
      }

      Utils.showToast('Error en la prueba', 'error');
    } finally {
      this.testingConnection = false;
    }
  },

  // ============================================
  // RESETEAR CONFIGURACIÓN
  // ============================================
  resetConfiguration() {
    if (!confirm('¿Estás seguro de que quieres resetear toda la configuración de IA?')) {
      return;
    }

    if (window.TenantStorage && typeof TenantStorage.removeItem === 'function') {
      TenantStorage.removeItem('ia_unified_config');
      TenantStorage.removeItem('ia_config');
    } else {
      localStorage.removeItem('ia_unified_config');
      localStorage.removeItem('ia_config');
    }

    IAUnifiedEngine.config = {
      provider: 'openai',
      apiKey: '',
      model: '',
      baseURL: '',
      temperature: 0.7,
      maxTokens: 2000,
    };

    IAUnifiedEngine.currentProvider = 'openai';
    IAUnifiedEngine.currentModel = '';
    IAUnifiedEngine.availableModels = [];

    Utils.showToast('Configuración de IA reseteada.', 'info');

    if (window.ConfiguracionAvanzada && typeof ConfiguracionAvanzada.cambiarTab === 'function') {
      ConfiguracionAvanzada.cambiarTab('ia');
    }
  },

  // ============================================
  // TOGGLE VISIBILIDAD API KEY
  // ============================================
  toggleApiKeyVisibility(button) {
    if (!button) {
      return;
    }

    const targetSelector = button.dataset.target || '#iaApiKey';
    const input = this._boundRoot?.querySelector(targetSelector);
    if (!input) {
      return;
    }

    const icon = button.querySelector('i');

    if (input.type === 'password') {
      input.type = 'text';
      icon?.classList.remove('fa-eye');
      icon?.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon?.classList.remove('fa-eye-slash');
      icon?.classList.add('fa-eye');
    }
  },

  attachListeners(rootElement) {
    if (!rootElement) {
      return;
    }

    if (this._boundRoot && this._boundRoot !== rootElement) {
      this.detachListeners();
    }

    this._boundRoot = rootElement;

    if (!this._handleClick) {
      this._handleClick = (event) => {
        const target = event.target.closest('[data-action]');
        if (!target || !this._boundRoot.contains(target)) {
          return;
        }

        const action = target.dataset.action;

        switch (action) {
          case 'selectProvider':
            this.selectProvider(target.dataset.provider, target);
            break;
          case 'toggleApiKeyVisibility':
            this.toggleApiKeyVisibility(target);
            break;
          case 'saveConfiguration':
            this.saveConfiguration();
            break;
          case 'testConnection':
            this.testConnection();
            break;
          case 'resetConfiguration':
            this.resetConfiguration();
            break;
          case 'verifyAndLoadModels':
            this.verifyAndLoadModels();
            break;
          default:
            break;
        }
      };

      this._handleChange = (event) => {
        const target = event.target;
        if (!target.dataset || !target.dataset.action || !this._boundRoot.contains(target)) {
          return;
        }

        if (target.dataset.action === 'selectModel') {
          this.selectModel(target.value);
        } else if (target.dataset.action === 'updateMaxTokens') {
          this.updateMaxTokens(target.value);
        }
      };

      this._handleInput = (event) => {
        const target = event.target;
        if (!target.dataset || !target.dataset.action || !this._boundRoot.contains(target)) {
          return;
        }

        if (target.dataset.action === 'updateTemperature') {
          this.updateTemperature(target.value);
        }
      };

      this._handleKeyDown = (event) => {
        const target = event.target;
        if (!target.dataset || target.dataset.action !== 'selectProvider') {
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.selectProvider(target.dataset.provider, target);
        }
      };
    }

    this._boundRoot.addEventListener('click', this._handleClick);
    this._boundRoot.addEventListener('change', this._handleChange);
    this._boundRoot.addEventListener('input', this._handleInput);
    this._boundRoot.addEventListener('keydown', this._handleKeyDown);
  },

  detachListeners() {
    if (!this._boundRoot) {
      return;
    }

    this._boundRoot.removeEventListener('click', this._handleClick);
    this._boundRoot.removeEventListener('change', this._handleChange);
    this._boundRoot.removeEventListener('input', this._handleInput);
    this._boundRoot.removeEventListener('keydown', this._handleKeyDown);
    this._boundRoot = null;
  },

  // ============================================
  // ESTILOS
  // ============================================
  renderStyles() {
    return `
            <style>
                .ia-config-panel {
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 20px;
                }
                
                .ia-status-card {
                    background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
                    color: var(--text-inverse);
                    padding: 25px;
                    border-radius: 15px;
                    margin-bottom: 30px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    box-shadow: var(--shadow-lg);
                }
                
                .ia-status-card.disconnected {
                    background: linear-gradient(135deg, #f87171, #ef4444);
                }
                
                .status-icon {
                    font-size: 48px;
                }
                
                .status-info h4 {
                    margin: 0 0 10px 0;
                    font-size: 24px;
                }
                
                .status-info p {
                    margin: 5px 0;
                    opacity: 0.9;
                }
                
                .config-section {
                    background: var(--bg-primary);
                    padding: 25px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                    box-shadow: var(--shadow-sm);
                    border: 1px solid var(--border-light);
                    transition: background-color var(--transition-fast), border-color var(--transition-fast);
                }
                
                .config-section h3 {
                    margin: 0 0 10px 0;
                    color: var(--text-primary);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .section-description {
                    color: var(--text-secondary);
                    margin-bottom: 20px;
                }
                
                .providers-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-top: 20px;
                }
                
                .provider-card {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-light);
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    cursor: pointer;
                    transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast), background-color var(--transition-fast);
                    position: relative;
                    box-shadow: var(--shadow-sm);
                }
                
                .provider-card:hover {
                    transform: translateY(-5px);
                    box-shadow: var(--shadow-md);
                    border-color: var(--primary-color);
                }
                
                .provider-card.selected {
                    background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
                    color: var(--text-inverse);
                    border-color: var(--primary-color);
                    box-shadow: var(--shadow-md);
                }
                
                .provider-icon {
                    font-size: 48px;
                    margin-bottom: 15px;
                    color: var(--primary-color);
                }
                
                .provider-card.selected .provider-icon {
                    color: var(--text-inverse);
                }
                
                .provider-card h4 {
                    margin: 0 0 10px 0;
                    font-size: 16px;
                }
                
                .requires-key, .local-provider {
                    font-size: 12px;
                    opacity: 0.8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                }
                
                .selected-badge {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: var(--bg-primary);
                    color: var(--success-color);
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    border: 1px solid var(--border-light);
                    box-shadow: var(--shadow-sm);
                }
                
                .input-with-button {
                    display: flex;
                    gap: 10px;
                }
                
                .input-with-button input {
                    flex: 1;
                }
                
                .form-group {
                    margin-bottom: 20px;
                }
                
                .form-group label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: var(--text-primary);
                }
                
                .form-group label i {
                    color: var(--primary-color);
                    cursor: help;
                }
                
                .form-control {
                    width: 100%;
                    padding: 10px 15px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    font-size: 14px;
                    transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background-color var(--transition-fast);
                    background: var(--bg-primary);
                    color: var(--text-primary);
                }
                
                .form-control:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px var(--focus-ring);
                }
                
                .form-text {
                    display: block;
                    margin-top: 8px;
                    font-size: 12px;
                    color: var(--text-secondary);
                }
                
                .form-text a {
                    color: var(--primary-color);
                    text-decoration: none;
                }
                
                .form-text a:hover {
                    text-decoration: underline;
                }
                
                .slider-container {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                
                .form-range {
                    flex: 1;
                }
                
                .slider-value {
                    font-weight: 600;
                    color: var(--primary-color);
                    min-width: 40px;
                    text-align: center;
                }
                
                .model-selector select {
                    font-size: 14px;
                }
                
                .model-info {
                    margin-top: 15px;
                    padding: 12px;
                    background: var(--primary-soft);
                    border-left: 4px solid var(--primary-color);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: var(--text-primary);
                }
                
                .config-actions {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    margin-top: 20px;
                }
                
                .test-result {
                    margin-top: 20px;
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid var(--border-light);
                    background: var(--bg-secondary);
                }
                
                .test-result .loading {
                    text-align: center;
                    color: var(--primary-color);
                    font-size: 16px;
                }
                
                .test-success {
                    background: var(--success-soft);
                    border: 1px solid var(--success-color);
                    color: var(--success-color);
                }
                
                .test-success i {
                    font-size: 48px;
                    color: var(--success-color);
                }
                
                .test-success blockquote {
                    background: var(--bg-primary);
                    padding: 15px;
                    border-left: 4px solid var(--success-color);
                    margin: 15px 0 0 0;
                    font-style: italic;
                    border-radius: var(--radius-md);
                    color: var(--text-primary);
                }
                
                .test-error {
                    background: var(--error-soft);
                    border: 1px solid var(--error-color);
                    color: var(--error-color);
                }
                
                .test-error i {
                    font-size: 48px;
                    color: var(--error-color);
                }
                
                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
                }
                
                .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
                    color: var(--text-inverse);
                }
                
                .btn-success {
                    background: var(--success-color);
                    color: var(--text-inverse);
                }
                
                .btn-secondary {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                    border: 1px solid var(--border-light);
                }
                
                @media (max-width: 768px) {
                    .providers-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .ia-status-card {
                        flex-direction: column;
                        text-align: center;
                    }
                    
                    .config-actions {
                        flex-direction: column;
                    }
                    
                    .btn {
                        width: 100%;
                        justify-content: center;
                    }
                }
            </style>
        `;
  },
};

// Exponer globalmente
window.IAConfigPanel = IAConfigPanel;
