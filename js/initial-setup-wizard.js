/* ========================================
   ASISTENTE DE CONFIGURACIÓN INICIAL
   Selector de tipo de negocio y configuración
   ======================================== */

const InitialSetupWizard = {
  /**
   * Verifica si el sistema necesita configuración inicial
   * DESHABILITADO: Los usuarios van directo a su tienda asignada
   */
  needsSetup() {
    // SOLUCIÓN: Ya no mostramos el asistente automáticamente
    // Las tiendas se crean desde el panel de administración
    console.log('✅ [InitialSetup] Sistema multi-tenant activo: usuarios van directo a su tienda');
    return false;

    // Código original comentado por si se necesita en el futuro:
    // const config = Database.get('configuracion');
    // return !config || !config.inicializado || config.inicializado === false;
  },

  /**
   * Muestra el asistente de configuración
   */
  show() {
    if (!this.needsSetup()) {
      return false;
    }

    // Crear overlay modal
    const overlay = document.createElement('div');
    overlay.id = 'setup-wizard-overlay';
    overlay.className = 'setup-wizard-overlay';

    const modal = document.createElement('div');
    modal.className = 'setup-wizard-modal';

    modal.innerHTML = `
            <div class="setup-wizard-content">
                <div class="setup-header">
                    <h2>🔧 Configuración Inicial del Sistema</h2>
                    <p>Bienvenido al Gestor de Tienda Pro. Configuremos tu negocio.</p>
                </div>
                
                <div class="setup-steps">
                    <!-- Paso 1: Tipo de Negocio -->
                    <div id="step-business-type" class="setup-step active">
                        <h3>1. Tipo de Negocio</h3>
                        <p>Selecciona el tipo de negocio para precargar las categorías adecuadas:</p>
                        
                        <div class="business-types">
                            <label class="business-type-card selected" data-type="mecanica_automotriz">
                                <input type="radio" name="businessType" value="mecanica_automotriz" checked>
                                <div class="card-content">
                                    <div class="card-icon">🔧</div>
                                    <h4>Taller Mecánico</h4>
                                    <p>Repuestos automotrices, aceites, filtros, servicios de mecánica</p>
                                    <ul>
                                        <li>Órdenes de trabajo</li>
                                        <li>Gestión de vehículos</li>
                                        <li>Recordatorios de mantenimiento</li>
                                        <li>40+ categorías especializadas</li>
                                    </ul>
                                </div>
                            </label>
                            
                            <label class="business-type-card" data-type="tienda_general">
                                <input type="radio" name="businessType" value="tienda_general">
                                <div class="card-content">
                                    <div class="card-icon">🏪</div>
                                    <h4>Tienda General</h4>
                                    <p>Productos generales, inventario básico</p>
                                    <ul>
                                        <li>Gestión de inventario</li>
                                        <li>Ventas y compras</li>
                                        <li>Categorías básicas</li>
                                        <li>Sistema POS</li>
                                    </ul>
                                </div>
                            </label>
                            
                            <label class="business-type-card" data-type="personalizado">
                                <input type="radio" name="businessType" value="personalizado">
                                <div class="card-content">
                                    <div class="card-icon">⚙️</div>
                                    <h4>Personalizado</h4>
                                    <p>Configuración manual de categorías</p>
                                    <ul>
                                        <li>Sin categorías predefinidas</li>
                                        <li>Configuración manual</li>
                                        <li>Máxima flexibilidad</li>
                                        <li>Para uso especializado</li>
                                    </ul>
                                </div>
                            </label>
                        </div>
                        
                        <div class="step-actions">
                            <button class="btn btn-primary" onclick="InitialSetupWizard.nextStep()">
                                Continuar
                            </button>
                        </div>
                    </div>
                    
                    <!-- Paso 2: Información del Negocio -->
                    <div id="step-business-info" class="setup-step">
                        <h3>2. Información del Negocio (Ecuador)</h3>
                        <p>Completa los datos de tu negocio. Los campos con * son obligatorios según la normativa del SRI.</p>
                        
                        <form id="business-info-form" class="setup-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Nombre Comercial / Razón Social *</label>
                                    <input type="text" id="nombreNegocio" required 
                                           placeholder="Ej: Taller Mecánico Los Andes S.A.">
                                </div>
                                <div class="form-group">
                                    <label>RUC *</label>
                                    <input type="text" id="ruc" required
                                           placeholder="13 dígitos, sin guiones"
                                           pattern="[0-9]{13}"
                                           title="Debe ingresar un RUC válido de 13 dígitos.">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Teléfono *</label>
                                    <input type="tel" id="telefono" required 
                                           placeholder="Ej: 0991234567">
                                </div>
                                <div class="form-group">
                                    <label>Email</label>
                                    <input type="email" id="email" 
                                           placeholder="contacto@negocio.com">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Dirección Matriz *</label>
                                <input type="text" id="direccion" required
                                       placeholder="Dirección completa del establecimiento principal">
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Moneda</label>
                                    <select id="moneda" disabled>
                                        <option value="USD" selected>Dólar (USD) - Ecuador</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>IVA (%) *</label>
                                    <input type="number" id="iva" value="15" min="0" max="30" step="0.1" required>
                                </div>
                            </div>

                            <div class="form-group form-check">
                                <input type="checkbox" id="obligadoContabilidad" class="form-check-input">
                                <label for="obligadoContabilidad" class="form-check-label">¿Obligado a llevar contabilidad?</label>
                            </div>
                        </form>
                        
                        <div class="step-actions">
                            <button class="btn btn-secondary" onclick="InitialSetupWizard.prevStep()">
                                Anterior
                            </button>
                            <button class="btn btn-primary" onclick="InitialSetupWizard.nextStep()">
                                Continuar
                            </button>
                        </div>
                    </div>
                    
                    <!-- Paso 3: Configuración Final -->
                    <div id="step-final-setup" class="setup-step">
                        <h3>3. Configuración Final</h3>
                        <div class="setup-summary">
                            <div class="summary-section">
                                <h4>Resumen de Configuración</h4>
                                <div id="setup-summary-content">
                                    <!-- Se llenará dinámicamente -->
                                </div>
                            </div>
                            
                            <div class="setup-progress">
                                <h4>Progreso de Inicialización</h4>
                                <div class="progress-list">
                                    <div class="progress-item" id="progress-cleanup">
                                        <span class="progress-icon">⏳</span>
                                        <span>Limpiando datos de demostración...</span>
                                    </div>
                                    <div class="progress-item" id="progress-categories">
                                        <span class="progress-icon">⏳</span>
                                        <span>Cargando categorías...</span>
                                    </div>
                                    <div class="progress-item" id="progress-config">
                                        <span class="progress-icon">⏳</span>
                                        <span>Guardando configuración...</span>
                                    </div>
                                    <div class="progress-item" id="progress-complete">
                                        <span class="progress-icon">⏳</span>
                                        <span>Finalizando configuración...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="step-actions">
                            <button class="btn btn-secondary" onclick="InitialSetupWizard.prevStep()">
                                Anterior
                            </button>
                            <button class="btn btn-success" id="btn-finish-setup" onclick="InitialSetupWizard.finishSetup()">
                                🚀 Finalizar Configuración
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="setup-indicator">
                    <div class="step-indicators">
                        <div class="step-dot active" data-step="1">1</div>
                        <div class="step-line"></div>
                        <div class="step-dot" data-step="2">2</div>
                        <div class="step-line"></div>
                        <div class="step-dot" data-step="3">3</div>
                    </div>
                </div>
            </div>
        `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Agregar estilos si no existen
    this.addStyles();

    // Configurar eventos
    this.setupEventListeners();

    return true;
  },

  currentStep: 1,
  totalSteps: 3,
  setupData: {},

  /**
   * Navega al siguiente paso
   */
  nextStep() {
    if (this.currentStep < this.totalSteps) {
      // Validar paso actual
      if (!this.validateCurrentStep()) {
        return;
      }

      // Guardar datos del paso actual
      this.saveCurrentStepData();

      // Ir al siguiente paso
      this.currentStep++;
      this.updateStepDisplay();

      // Si es el paso final, mostrar resumen
      if (this.currentStep === 3) {
        this.showSetupSummary();
      }
    }
  },

  /**
   * Navega al paso anterior
   */
  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateStepDisplay();
    }
  },

  /**
   * Valida el paso actual
   */
  validateCurrentStep() {
    switch (this.currentStep) {
      case 1:
        const selectedType = document.querySelector('input[name="businessType"]:checked');
        return selectedType !== null;

      case 2:
        const nombreNegocio = document.getElementById('nombreNegocio').value.trim();
        const telefono = document.getElementById('telefono').value.trim();

        if (!nombreNegocio) {
          Utils.showToast('Por favor ingresa el nombre del negocio', 'error');
          return false;
        }

        if (!telefono) {
          Utils.showToast('Por favor ingresa el teléfono', 'error');
          return false;
        }

        return true;

      default:
        return true;
    }
  },

  /**
   * Guarda los datos del paso actual
   */
  saveCurrentStepData() {
    switch (this.currentStep) {
      case 1:
        this.setupData.businessType = document.querySelector(
          'input[name="businessType"]:checked'
        ).value;
        break;

      case 2:
        this.setupData.businessInfo = {
          nombreNegocio: document.getElementById('nombreNegocio').value.trim(),
          ruc: document.getElementById('ruc').value.trim(),
          telefono: document.getElementById('telefono').value.trim(),
          email: document.getElementById('email').value.trim(),
          direccion: document.getElementById('direccion').value.trim(),
          moneda: document.getElementById('moneda').value,
          iva: parseFloat(document.getElementById('iva').value) || 15,
          obligadoContabilidad: document.getElementById('obligadoContabilidad').checked,
        };
        break;
    }
  },

  /**
   * Actualiza la visualización de pasos
   */
  updateStepDisplay() {
    // Ocultar todos los pasos
    document.querySelectorAll('.setup-step').forEach((step) => {
      step.classList.remove('active');
    });

    // Mostrar paso actual
    document.getElementById(`step-${this.getStepId()}`).classList.add('active');

    // Actualizar indicadores
    document.querySelectorAll('.step-dot').forEach((dot, index) => {
      if (index + 1 <= this.currentStep) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  },

  /**
   * Obtiene el ID del paso actual
   */
  getStepId() {
    switch (this.currentStep) {
      case 1:
        return 'business-type';
      case 2:
        return 'business-info';
      case 3:
        return 'final-setup';
      default:
        return 'business-type';
    }
  },

  /**
   * Muestra el resumen de configuración
   */
  showSetupSummary() {
    const summaryContent = document.getElementById('setup-summary-content');
    const businessTypes = {
      mecanica_automotriz: 'Taller Mecánico',
      tienda_general: 'Tienda General',
      personalizado: 'Personalizado',
    };

    summaryContent.innerHTML = `
            <div class="summary-item">
                <strong>Tipo de Negocio:</strong> ${businessTypes[this.setupData.businessType]}
            </div>
            <div class="summary-item">
                <strong>Nombre:</strong> ${this.setupData.businessInfo.nombreNegocio}
            </div>
            <div class="summary-item">
                <strong>Teléfono:</strong> ${this.setupData.businessInfo.telefono}
            </div>
            ${
              this.setupData.businessInfo.email
                ? `
            <div class="summary-item">
                <strong>Email:</strong> ${this.setupData.businessInfo.email}
            </div>
            `
                : ''
            }
            <div class="summary-item">
                <strong>Moneda:</strong> ${this.setupData.businessInfo.moneda}
            </div>
            <div class="summary-item">
                <strong>IVA:</strong> ${this.setupData.businessInfo.iva}%
            </div>
            ${
              this.setupData.businessType === 'mecanica_automotriz'
                ? `
            <div class="summary-note">
                <strong>📋 Se cargarán automáticamente:</strong>
                <ul>
                    <li>40+ categorías de repuestos automotrices</li>
                    <li>Sistema de órdenes de trabajo</li>
                    <li>Gestión de vehículos y clientes</li>
                    <li>Recordatorios de mantenimiento</li>
                </ul>
            </div>
            `
                : ''
            }
        `;
  },

  /**
   * Finaliza la configuración
   */
  async finishSetup() {
    const finishButton = document.getElementById('btn-finish-setup');
    finishButton.disabled = true;
    finishButton.innerHTML = '⏳ Configurando...';

    try {
      // 1. Limpiar datos de demostración
      this.updateProgress('progress-cleanup', 'loading', 'Limpiando datos de demostración...');

      if (this.setupData.businessType !== 'personalizado') {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simular tiempo
        const cleanupResult = CleanupDemoData.cleanDemoData();
        if (!cleanupResult.success) {
          throw new Error('Error limpiando datos: ' + cleanupResult.message);
        }
        this.updateProgress('progress-cleanup', 'success', 'Datos de demostración eliminados');
      } else {
        this.updateProgress(
          'progress-cleanup',
          'success',
          'Datos conservados para configuración manual'
        );
      }

      // 2. Cargar categorías específicas
      this.updateProgress('progress-categories', 'loading', 'Cargando categorías...');
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (this.setupData.businessType === 'mecanica_automotriz') {
        const categoriesResult = CleanupDemoData.preloadAutomotiveCategories();
        if (!categoriesResult.success) {
          throw new Error('Error cargando categorías: ' + categoriesResult.message);
        }
        this.updateProgress(
          'progress-categories',
          'success',
          `${categoriesResult.count} categorías automotrices cargadas`
        );
      } else if (this.setupData.businessType === 'tienda_general') {
        // Cargar categorías básicas
        const basicCategories = [
          { id: 'cat_general', nombre: 'General', descripcion: 'Productos generales' },
          { id: 'cat_electronica', nombre: 'Electrónica', descripcion: 'Productos electrónicos' },
          { id: 'cat_hogar', nombre: 'Hogar', descripcion: 'Artículos para el hogar' },
          { id: 'cat_ropa', nombre: 'Ropa', descripcion: 'Prendas de vestir' },
          { id: 'cat_alimentos', nombre: 'Alimentos', descripcion: 'Productos alimenticios' },
        ].map((cat) => ({ ...cat, createdAt: new Date().toISOString() }));

        Database.saveCollection('categorias', basicCategories);
        this.updateProgress(
          'progress-categories',
          'success',
          `${basicCategories.length} categorías básicas cargadas`
        );
      } else {
        this.updateProgress('progress-categories', 'success', 'Listo para configuración manual');
      }

      // 3. Guardar configuración
      this.updateProgress('progress-config', 'loading', 'Guardando configuración...');
      await new Promise((resolve) => setTimeout(resolve, 300));

      const config = {
        ...this.setupData.businessInfo,
        tipoNegocio: this.setupData.businessType,
        inicializado: true,
        categorias_precargadas: this.setupData.businessType !== 'personalizado',
        fechaInicializacion: new Date().toISOString(),
        version: Database.VERSION,
      };

      Database.set('configuracion', config);
      this.updateProgress('progress-config', 'success', 'Configuración guardada');

      // 4. Finalizar
      this.updateProgress('progress-complete', 'loading', 'Finalizando...');
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.updateProgress('progress-complete', 'success', '¡Configuración completada!');

      // Mostrar mensaje de éxito
      setTimeout(() => {
        Utils.showToast('¡Sistema configurado exitosamente!', 'success');
        this.close();

        // Recargar la página para aplicar cambios
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }, 1000);
    } catch (error) {
      console.error('Error en configuración:', error);
      Utils.showToast('Error en la configuración: ' + error.message, 'error');
      finishButton.disabled = false;
      finishButton.innerHTML = '🚀 Finalizar Configuración';
    }
  },

  /**
   * Actualiza el progreso de una tarea
   */
  updateProgress(itemId, status, message) {
    const item = document.getElementById(itemId);
    const icon = item.querySelector('.progress-icon');
    const text = item.querySelector('span:last-child');

    switch (status) {
      case 'loading':
        icon.textContent = '⏳';
        item.className = 'progress-item loading';
        break;
      case 'success':
        icon.textContent = '✅';
        item.className = 'progress-item success';
        break;
      case 'error':
        icon.textContent = '❌';
        item.className = 'progress-item error';
        break;
    }

    text.textContent = message;
  },

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Selección de tipo de negocio
    document.querySelectorAll('input[name="businessType"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        document.querySelectorAll('.business-type-card').forEach((card) => {
          card.classList.remove('selected');
        });
        e.target.closest('.business-type-card').classList.add('selected');
      });
    });

    // Tecla Escape para cerrar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('setup-wizard-overlay')) {
        // Solo cerrar si no es el primer uso
        const config = Database.get('configuracion');
        if (config && config.inicializado) {
          this.close();
        }
      }
    });
  },

  /**
   * Cierra el asistente
   */
  close() {
    const overlay = document.getElementById('setup-wizard-overlay');
    if (overlay) {
      overlay.remove();
    }
  },

  /**
   * Agrega estilos CSS del asistente
   */
  addStyles() {
    if (document.getElementById('setup-wizard-styles')) {
      return; // Ya están cargados
    }

    const styles = document.createElement('style');
    styles.id = 'setup-wizard-styles';
    styles.textContent = `
            .setup-wizard-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(8px);
                animation: fadeInOverlay 0.3s ease-out;
            }

            @keyframes fadeInOverlay {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .setup-wizard-modal {
                background: var(--bg-color, #1a1a1a);
                color: var(--text-color, #ffffff);
                border-radius: 16px;
                max-width: 800px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px rgba(0,0,0,0.5);
                position: relative;
                border: 1px solid var(--border-color, #333);
                animation: slideInModal 0.4s ease-out;
                --bg-color: #1a1a1a;
                --text-color: #ffffff;
                --border-color: #333;
                --card-bg: #2d2d2d;
                --accent-color: #00d4aa;
                --secondary-color: #555;
            }

            @keyframes slideInModal {
                from { 
                    opacity: 0; 
                    transform: translateY(-50px) scale(0.9);
                }
                to { 
                    opacity: 1; 
                    transform: translateY(0) scale(1);
                }
            }

            /* Modo claro */
            @media (prefers-color-scheme: light) {
                .setup-wizard-modal {
                    --bg-color: #ffffff;
                    --text-color: #1a1a1a;
                    --border-color: #e0e0e0;
                    --card-bg: #f8f9fa;
                    --accent-color: #007bff;
                    --secondary-color: #6c757d;
                }
            }

            .setup-wizard-content {
                padding: 2rem;
            }

            .setup-header {
                text-align: center;
                margin-bottom: 2rem;
                padding-bottom: 1rem;
                border-bottom: 2px solid var(--border-color);
                position: relative;
            }

            .setup-header::before {
                content: '';
                position: absolute;
                top: -2rem;
                right: 1rem;
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, var(--accent-color), #4facfe);
                border-radius: 50%;
                opacity: 0.1;
            }

            .setup-header h2 {
                color: var(--text-color);
                margin: 0 0 0.5rem 0;
                font-size: 1.8rem;
                font-weight: 700;
            }

            .setup-header p {
                color: var(--secondary-color);
                margin: 0;
                font-size: 1rem;
            }

            .setup-step {
                display: none;
            }

            .setup-step.active {
                display: block;
                animation: fadeIn 0.3s ease-in;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .business-types {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1rem;
                margin: 1.5rem 0;
            }

            .business-type-card {
                border: 2px solid var(--border-color);
                border-radius: 12px;
                padding: 1.5rem;
                cursor: pointer;
                transition: all 0.3s ease;
                display: block;
                background: var(--card-bg);
                position: relative;
                overflow: hidden;
            }

            .business-type-card::before {
                content: '';
                position: absolute;
                top: -50%;
                right: -50%;
                width: 100%;
                height: 100%;
                background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                transform: rotate(45deg);
                transition: all 0.5s ease;
                opacity: 0;
            }

            .business-type-card:hover {
                border-color: var(--accent-color);
                transform: translateY(-4px);
                box-shadow: 0 10px 25px rgba(0, 212, 170, 0.2);
            }

            .business-type-card:hover::before {
                opacity: 1;
                animation: shimmer 0.6s ease-out;
            }

            @keyframes shimmer {
                0% { transform: translateX(-100%) rotate(45deg); }
                100% { transform: translateX(100%) rotate(45deg); }
            }

            .business-type-card.selected {
                border-color: var(--accent-color);
                background: rgba(0, 212, 170, 0.1);
                box-shadow: 0 8px 25px rgba(0, 212, 170, 0.3);
                transform: translateY(-2px);
            }

            .business-type-card input {
                display: none;
            }

            .card-content {
                text-align: center;
            }

            .card-icon {
                font-size: 2.5rem;
                margin-bottom: 0.5rem;
            }

            .card-content h4 {
                margin: 0.5rem 0;
                color: var(--text-color);
                font-weight: 600;
            }

            .card-content p {
                color: var(--secondary-color);
                margin: 0.5rem 0;
                font-size: 0.9rem;
                line-height: 1.4;
            }

            .card-content ul {
                text-align: left;
                margin: 1rem 0;
                padding-left: 1.2rem;
            }

            .card-content li {
                color: var(--secondary-color);
                font-size: 0.85rem;
                margin: 0.3rem 0;
                line-height: 1.3;
            }

            .card-content li::before {
                content: '✓';
                color: var(--accent-color);
                margin-right: 0.5rem;
                font-weight: bold;
            }

            .setup-form {
                margin: 1.5rem 0;
            }

            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
                margin-bottom: 1rem;
            }

            .form-group {
                margin-bottom: 1rem;
            }

            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
                color: var(--text-color);
            }

            .form-group input,
            .form-group select {
                width: 100%;
                padding: 0.75rem;
                border: 2px solid var(--border-color);
                border-radius: 8px;
                font-size: 1rem;
                transition: all 0.3s ease;
                background: var(--card-bg);
                color: var(--text-color);
                box-sizing: border-box;
            }

            .form-group input:focus,
            .form-group select:focus {
                outline: none;
                border-color: var(--accent-color);
                box-shadow: 0 0 0 3px rgba(0, 212, 170, 0.2);
                transform: translateY(-1px);
            }

            .form-group input::placeholder {
                color: var(--secondary-color);
                opacity: 0.7;
            }

            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
                color: var(--text-color);
                font-size: 0.9rem;
            }

            .form-check {
                display: flex;
                align-items: center;
                margin-top: 1rem;
            }

            .form-check-input {
                width: auto;
                margin-right: 0.5rem;
            }

            .form-check-label {
                margin-bottom: 0;
            }

            .setup-summary {
                background: var(--card-bg);
                border-radius: 8px;
                padding: 1.5rem;
                margin: 1rem 0;
                border: 1px solid var(--border-color);
            }

            .summary-section h4,
            .setup-progress h4 {
                margin: 0 0 1rem 0;
                color: var(--text-color);
            }

            .summary-item {
                margin: 0.5rem 0;
                padding: 0.5rem;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid var(--border-color);
                border-radius: 6px;
            }

            .summary-note {
                margin-top: 1rem;
                padding: 1rem;
                background: rgba(79, 172, 254, 0.08);
                border-left: 4px solid var(--accent-color);
                border-radius: 6px;
                color: var(--text-color);
            }

            .summary-note ul {
                margin: 0.5rem 0;
                padding-left: 1.5rem;
            }

            .progress-list {
                margin: 1rem 0;
            }

            .progress-item {
                display: flex;
                align-items: center;
                padding: 0.75rem;
                margin: 0.5rem 0;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 6px;
                border-left: 4px solid var(--border-color);
                color: var(--text-color);
            }

            .progress-item.loading {
                border-left-color: #f39c12;
                animation: pulse 1s infinite;
            }

            .progress-item.success {
                border-left-color: #27ae60;
            }

            .progress-item.error {
                border-left-color: #e74c3c;
            }

            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }

            .progress-icon {
                margin-right: 1rem;
                font-size: 1.2rem;
            }

            .step-actions {
                display: flex;
                justify-content: space-between;
                margin-top: 2rem;
                padding-top: 1rem;
                border-top: 1px solid var(--border-color);
            }

            .step-indicators {
                display: flex;
                align-items: center;
                justify-content: center;
                margin-top: 2rem;
                padding-top: 1rem;
                border-top: 1px solid var(--border-color);
            }

            .step-dot {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: var(--border-color);
                color: var(--text-color);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                transition: all 0.3s ease;
            }

            .step-dot.active {
                background: var(--accent-color);
                color: #0b1513;
            }

            .step-line {
                width: 100px;
                height: 2px;
                background: var(--border-color);
                margin: 0 10px;
            }

            .btn {
                padding: 0.75rem 2rem;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: 600;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-block;
                text-align: center;
                position: relative;
                overflow: hidden;
            }

            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            }

            .btn:active {
                transform: translateY(0);
            }

            .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }

            .btn-primary {
                background: linear-gradient(135deg, var(--accent-color), #4facfe);
                color: white;
                border: 2px solid var(--accent-color);
            }

            .btn-secondary {
                background: var(--secondary-color);
                color: white;
                border: 2px solid var(--secondary-color);
            }

            .btn-success {
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                border: 2px solid #28a745;
            }

            .btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                transition: left 0.5s ease;
            }

            .btn:hover::before {
                left: 100%;
            }

            @media (max-width: 768px) {
                .setup-wizard-modal {
                    width: 95%;
                    margin: 1rem;
                }
                
                .setup-wizard-content {
                    padding: 1rem;
                }
                
                .business-types {
                    grid-template-columns: 1fr;
                }
                
                .form-row {
                    grid-template-columns: 1fr;
                }
                
                .step-actions {
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .step-line {
                    width: 50px;
                }
            }
        `;

    document.head.appendChild(styles);
  },
};

// Exponer globalmente
window.InitialSetupWizard = InitialSetupWizard;

// Auto-inicializar si es necesario
document.addEventListener('DOMContentLoaded', () => {
  // Verificar si ya existe una instancia del wizard
  if (document.getElementById('setup-wizard-overlay')) {
    return; // Ya está mostrado
  }

  // Esperar un poco para que se carguen otros scripts
  setTimeout(() => {
    if (InitialSetupWizard.needsSetup()) {
      InitialSetupWizard.show();
    }
  }, 500);
});
