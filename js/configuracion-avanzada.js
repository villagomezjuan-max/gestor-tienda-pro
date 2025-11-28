// ============================================
// MÓDULO: CONFIGURACIÓN AVANZADA DEL SISTEMA
// ============================================
// Gestión completa de todas las configuraciones del programa

window.ConfiguracionAvanzada = {
  STORAGE_KEY: 'configuracionAvanzada',
  autoThemeMediaQuery: null,
  autoThemeListener: null,
  _listenersInitialized: false,
  countryOptions: [
    { value: 'Ecuador', label: 'Ecuador' },
    { value: 'Argentina', label: 'Argentina' },
    { value: 'Bolivia', label: 'Bolivia' },
    { value: 'Brasil', label: 'Brasil' },
    { value: 'Chile', label: 'Chile' },
    { value: 'Colombia', label: 'Colombia' },
    { value: 'Costa Rica', label: 'Costa Rica' },
    { value: 'Cuba', label: 'Cuba' },
    { value: 'El Salvador', label: 'El Salvador' },
    { value: 'España', label: 'España' },
    { value: 'Estados Unidos', label: 'Estados Unidos' },
    { value: 'Guatemala', label: 'Guatemala' },
    { value: 'Honduras', label: 'Honduras' },
    { value: 'México', label: 'México' },
    { value: 'Nicaragua', label: 'Nicaragua' },
    { value: 'Panamá', label: 'Panamá' },
    { value: 'Paraguay', label: 'Paraguay' },
    { value: 'Perú', label: 'Perú' },
    { value: 'Puerto Rico', label: 'Puerto Rico' },
    { value: 'República Dominicana', label: 'República Dominicana' },
    { value: 'Uruguay', label: 'Uruguay' },
    { value: 'Venezuela', label: 'Venezuela' },
    { value: 'Otro', label: 'Otro' },
  ],
  ecuadorCityCatalog: [
    { city: 'Quito', province: 'Pichincha', postal: '170150' },
    { city: 'Guayaquil', province: 'Guayas', postal: '090150' },
    { city: 'Cuenca', province: 'Azuay', postal: '010150' },
    { city: 'Santo Domingo', province: 'Santo Domingo de los Tsáchilas', postal: '230103' },
    { city: 'Machala', province: 'El Oro', postal: '070101' },
    { city: 'Manta', province: 'Manabí', postal: '130203' },
    { city: 'Portoviejo', province: 'Manabí', postal: '130102' },
    { city: 'Ambato', province: 'Tungurahua', postal: '180150' },
    { city: 'Latacunga', province: 'Cotopaxi', postal: '050102' },
    { city: 'Riobamba', province: 'Chimborazo', postal: '060150' },
    { city: 'Loja', province: 'Loja', postal: '110150' },
    { city: 'Ibarra', province: 'Imbabura', postal: '100150' },
    { city: 'Quevedo', province: 'Los Ríos', postal: '120301' },
    { city: 'Babahoyo', province: 'Los Ríos', postal: '120401' },
    { city: 'Tena', province: 'Napo', postal: '150101' },
    { city: 'Puyo', province: 'Pastaza', postal: '160150' },
    { city: 'Nueva Loja', province: 'Sucumbíos', postal: '210150' },
    { city: 'Esmeraldas', province: 'Esmeraldas', postal: '080150' },
    { city: 'Tulcán', province: 'Carchi', postal: '040102' },
    { city: 'Zamora', province: 'Zamora Chinchipe', postal: '190101' },
    { city: 'Macas', province: 'Morona Santiago', postal: '140101' },
    { city: 'Francisco de Orellana', province: 'Orellana', postal: '220150' },
    { city: 'Puerto Ayora', province: 'Galápagos', postal: '200350' },
  ],
  phoneCountryCodes: [
    { code: '+593', country: 'Ecuador' },
    { code: '+54', country: 'Argentina' },
    { code: '+591', country: 'Bolivia' },
    { code: '+55', country: 'Brasil' },
    { code: '+56', country: 'Chile' },
    { code: '+57', country: 'Colombia' },
    { code: '+506', country: 'Costa Rica' },
    { code: '+53', country: 'Cuba' },
    { code: '+503', country: 'El Salvador' },
    { code: '+34', country: 'España' },
    { code: '+1', country: 'Estados Unidos / Canadá' },
    { code: '+502', country: 'Guatemala' },
    { code: '+504', country: 'Honduras' },
    { code: '+52', country: 'México' },
    { code: '+505', country: 'Nicaragua' },
    { code: '+507', country: 'Panamá' },
    { code: '+595', country: 'Paraguay' },
    { code: '+51', country: 'Perú' },
    { code: '+1-787', country: 'Puerto Rico' },
    { code: '+1-809', country: 'República Dominicana' },
    { code: '+598', country: 'Uruguay' },
    { code: '+58', country: 'Venezuela' },
  ],

  /**
   * Obtiene un valor con alcance por negocio
   * CRÍTICO: SIEMPRE usar TenantStorage para mantener separación multi-tenant
   */
  getScopedValue(key) {
    // Primero intentar con TenantStorage (recomendado)
    if (window.TenantStorage && typeof TenantStorage.getItem === 'function') {
      return TenantStorage.getItem(key);
    }

    // Fallback: construir clave con prefijo de negocio
    const negocioId = Database.getCurrentBusiness();
    const scopedKey = `gestor_tienda::${negocioId}::${key}`;
    return localStorage.getItem(scopedKey);
  },

  /**
   * Establece un valor con alcance por negocio
   * CRÍTICO: SIEMPRE usar TenantStorage para mantener separación multi-tenant
   */
  setScopedValue(key, value) {
    // Primero intentar con TenantStorage (recomendado)
    if (window.TenantStorage && typeof TenantStorage.setItem === 'function') {
      TenantStorage.setItem(key, value);
      return;
    }

    // Fallback: construir clave con prefijo de negocio
    const negocioId = Database.getCurrentBusiness();
    const scopedKey = `gestor_tienda::${negocioId}::${key}`;

    if (value === null || value === undefined) {
      localStorage.removeItem(scopedKey);
    } else {
      localStorage.setItem(scopedKey, value);
    }
  },

  /**
   * Elimina un valor con alcance por negocio
   * CRÍTICO: SIEMPRE usar TenantStorage para mantener separación multi-tenant
   */
  removeScopedValue(key) {
    // Primero intentar con TenantStorage (recomendado)
    if (window.TenantStorage && typeof TenantStorage.removeItem === 'function') {
      TenantStorage.removeItem(key);
      return;
    }

    // Fallback: construir clave con prefijo de negocio
    const negocioId = Database.getCurrentBusiness();
    const scopedKey = `gestor_tienda::${negocioId}::${key}`;
    localStorage.removeItem(scopedKey);
  },

  // ============================================
  // RENDERIZAR INTERFAZ PRINCIPAL
  // ============================================
  async render(container) {
    // Cargar estilos modernos
    this.loadModernStyles();

    // Cargar configuración del backend primero
    await this.cargarConfiguracionDesdeBackend();

    const config = this.obtenerConfiguracion();

    // Validar que config tenga estructura mínima
    if (!config || !config.general) {
      console.warn('⚠️ Configuración incompleta, usando valores por defecto');
      const configDefecto = this.obtenerConfiguracionDefecto();
      const actualConfig = { ...configDefecto, ...config };
      this.aplicarPreferenciasVisuales(actualConfig.visual);
      return this.renderConfiguración(container, actualConfig);
    }

    this.aplicarPreferenciasVisuales(config.visual);
    this.renderConfiguración(container, config);
  },

  loadModernStyles() {
    if (!document.getElementById('config-modern-styles')) {
      const link = document.createElement('link');
      link.id = 'config-modern-styles';
      link.rel = 'stylesheet';
      link.href = 'css/configuracion-avanzada-moderna.css';
      document.head.appendChild(link);
    }
  },

  async cargarConfiguracionDesdeBackend() {
    try {
      const session = Auth.getSession();
      const negocioId =
        (typeof Auth.getCurrentBusinessId === 'function' && Auth.getCurrentBusinessId()) ||
        session?.negocioId ||
        null;

      if (!negocioId) {
        console.warn('⚠️ No se pudo determinar el negocio para sincronizar configuración.');
        return;
      }

      // Obtener datos del negocio actual desde el backend
      const response = await Auth._request('/negocios/actual', { negocioId });
      if (!response?.negocio) {
        return;
      }

      const negocio = response.negocio;
      const backendConfigTienda = negocio.configTienda || {};
      const configLocal = this.obtenerConfiguracion();
      configLocal.general = configLocal.general || {};
      configLocal.sri = this.normalizarSriConfig(configLocal.sri);

      const general = configLocal.general;
      const sri = configLocal.sri;
      let generalActualizado = false;
      let sriActualizado = false;

      const prefer = (...values) => {
        for (const value of values) {
          if (value === null || value === undefined) {
            continue;
          }
          const normalized = typeof value === 'string' ? value.trim() : value;
          if (
            normalized !== undefined &&
            normalized !== null &&
            (typeof normalized !== 'string' || normalized.length > 0)
          ) {
            return normalized;
          }
        }
        return undefined;
      };

      const assignIfPresent = (target, key, value, transform) => {
        if (value === undefined || value === null) {
          return false;
        }
        let normalized = typeof value === 'string' ? value.trim() : value;
        if (typeof transform === 'function') {
          normalized = transform(normalized);
        }
        if (normalized === undefined || normalized === null) {
          return false;
        }
        if (typeof normalized === 'string' && normalized.length === 0) {
          return false;
        }
        if (target[key] !== normalized) {
          target[key] = normalized;
          return true;
        }
        return false;
      };

      const nombreNegocio = prefer(
        negocio.nombre,
        backendConfigTienda.nombre,
        general.nombreNegocio,
        negocio.nombreComercial
      );
      const nombreComercial = prefer(
        backendConfigTienda.nombre,
        negocio.nombreComercial,
        general.nombreComercial,
        nombreNegocio
      );
      const razonSocial = prefer(
        backendConfigTienda.razonSocial,
        general.razonSocial,
        nombreComercial,
        nombreNegocio
      );
      const ruc = prefer(backendConfigTienda.ruc, general.ruc);
      const direccionPrincipal = prefer(
        backendConfigTienda.direccion,
        general.direccionMatriz,
        general.direccion
      );
      const telefono = prefer(backendConfigTienda.telefono, general.telefono);
      const email = prefer(backendConfigTienda.email, general.email);
      const obligadoFlag =
        backendConfigTienda.obligadoContabilidad === true ||
        backendConfigTienda.obligadoContabilidad === 1
          ? 'SI'
          : backendConfigTienda.obligadoContabilidad === false ||
              backendConfigTienda.obligadoContabilidad === 0
            ? 'NO'
            : general.obligadoContabilidad;

      if (assignIfPresent(general, 'nombreNegocio', nombreNegocio)) generalActualizado = true;
      if (assignIfPresent(general, 'nombreComercial', nombreComercial)) generalActualizado = true;
      if (assignIfPresent(general, 'razonSocial', razonSocial)) generalActualizado = true;
      if (assignIfPresent(general, 'ruc', ruc)) generalActualizado = true;
      if (assignIfPresent(general, 'direccionMatriz', direccionPrincipal))
        generalActualizado = true;
      if (assignIfPresent(general, 'direccion', direccionPrincipal)) generalActualizado = true;
      if (assignIfPresent(general, 'telefono', telefono)) generalActualizado = true;
      if (assignIfPresent(general, 'email', email)) generalActualizado = true;

      if (obligadoFlag && general.obligadoContabilidad !== obligadoFlag) {
        general.obligadoContabilidad = obligadoFlag;
        generalActualizado = true;
      }

      if (negocio.icono && general.icono !== negocio.icono) {
        general.icono = negocio.icono;
        generalActualizado = true;
      }

      if (negocio.tipo) {
        const tipoLocal = this.mapearTipoBackendALocal(negocio.tipo);
        if (general.tipoNegocio !== tipoLocal) {
          general.tipoNegocio = tipoLocal;
          generalActualizado = true;
        }
      }

      if (negocio.descripcion && general.descripcion !== negocio.descripcion) {
        general.descripcion = negocio.descripcion;
        generalActualizado = true;
      }

      const direccionSucursal = prefer(
        general.direccionSucursal,
        backendConfigTienda.direccionSucursal
      );
      const establecimiento = prefer(backendConfigTienda.establecimiento, sri.establecimiento);
      const puntoEmision = prefer(backendConfigTienda.puntoEmision, sri.puntoEmision);

      if (assignIfPresent(sri, 'razonSocial', razonSocial)) sriActualizado = true;
      if (assignIfPresent(sri, 'nombreComercial', nombreComercial)) sriActualizado = true;
      if (assignIfPresent(sri, 'ruc', ruc)) sriActualizado = true;
      if (assignIfPresent(sri, 'direccionMatriz', direccionPrincipal)) sriActualizado = true;
      if (assignIfPresent(sri, 'direccionSucursal', direccionSucursal)) sriActualizado = true;
      if (assignIfPresent(sri, 'telefono', telefono)) sriActualizado = true;
      if (assignIfPresent(sri, 'emailNotificaciones', email)) sriActualizado = true;
      if (assignIfPresent(sri, 'establecimiento', establecimiento)) sriActualizado = true;
      if (assignIfPresent(sri, 'puntoEmision', puntoEmision)) sriActualizado = true;

      if (obligadoFlag && sri.obligadoContabilidad !== obligadoFlag) {
        sri.obligadoContabilidad = obligadoFlag;
        sriActualizado = true;
      }

      if (generalActualizado || sriActualizado) {
        configLocal.general = general;
        configLocal.sri = sri;
        Database.set(this.STORAGE_KEY, configLocal);
        console.log('✅ Configuración sincronizada con datos del backend');
      }

      const configTiendaLocal = Database.get('configTienda') || {};
      const actualizadoTienda = {
        ...configTiendaLocal,
        nombre:
          nombreComercial ||
          configTiendaLocal.nombre ||
          nombreNegocio ||
          configTiendaLocal.nombreTienda ||
          'Mi Tienda',
        nombreTienda:
          nombreComercial || configTiendaLocal.nombreTienda || nombreNegocio || 'Mi Tienda',
        razonSocial: razonSocial || configTiendaLocal.razonSocial || '',
        ruc: ruc || configTiendaLocal.ruc || '',
        direccion: direccionPrincipal || configTiendaLocal.direccion || '',
        telefono: telefono || configTiendaLocal.telefono || '',
        email: email || configTiendaLocal.email || '',
        establecimiento: establecimiento || configTiendaLocal.establecimiento || '001',
        puntoEmision: puntoEmision || configTiendaLocal.puntoEmision || '001',
        obligadoContabilidad: obligadoFlag || configTiendaLocal.obligadoContabilidad || 'NO',
      };

      if (JSON.stringify(actualizadoTienda) !== JSON.stringify(configTiendaLocal)) {
        Database.set('configTienda', actualizadoTienda);
      }
    } catch (error) {
      console.warn('⚠️ No se pudo cargar configuración desde backend:', error);
      // No es crítico, continuar con configuración local
    }
  },

  mapearTipoBackendALocal(tipoBackend) {
    // Mapear los tipos del backend a los tipos locales
    const mapeo = {
      general: 'tienda_general',
      mecanica: 'mecanica_automotriz',
      ferreteria: 'ferreteria',
      farmacia: 'farmacia',
      restaurante: 'restaurante',
      personalizado: 'personalizado',
    };

    return mapeo[tipoBackend] || 'tienda_general';
  },

  renderConfiguración(container, config) {
    container.innerHTML = `
      <div class="config-layout-container">
        <!-- Sidebar de Navegación -->
        <div class="config-sidebar">
          <div class="config-sidebar-header">
            <i class="fas fa-sliders-h"></i>
            <h2>Configuración</h2>
          </div>
          
          <nav class="config-nav">
            <button class="config-nav-item active" data-tab="general" data-action="cambiarTab" data-target="general">
              <i class="fas fa-store"></i><span>General</span>
            </button>
            <button class="config-nav-item" data-tab="ventas" data-action="cambiarTab" data-target="ventas">
              <i class="fas fa-cash-register"></i><span>Ventas</span>
            </button>
            <button class="config-nav-item" data-tab="inventario" data-action="cambiarTab" data-target="inventario">
              <i class="fas fa-boxes"></i><span>Inventario</span>
            </button>
            <button class="config-nav-item" data-tab="publicidad" data-action="cambiarTab" data-target="publicidad">
              <i class="fas fa-bullhorn"></i><span>Publicidad</span>
            </button>
            <button class="config-nav-item" data-tab="usuarios" data-action="cambiarTab" data-target="usuarios">
              <i class="fas fa-users-cog"></i><span>Usuarios</span>
            </button>
            <button class="config-nav-item" data-tab="notificaciones" data-action="cambiarTab" data-target="notificaciones">
              <i class="fas fa-bell"></i><span>Notificaciones</span>
            </button>
            <button class="config-nav-item" data-tab="visual" data-action="cambiarTab" data-target="visual">
              <i class="fas fa-palette"></i><span>Apariencia</span>
            </button>
            <button class="config-nav-item" data-tab="reportes" data-action="cambiarTab" data-target="reportes">
              <i class="fas fa-file-alt"></i><span>Reportes</span>
            </button>
            <button class="config-nav-item" data-tab="telegram" data-action="cambiarTab" data-target="telegram">
              <i class="fab fa-telegram"></i><span>Telegram</span>
            </button>
            <button class="config-nav-item" data-tab="sri" data-action="cambiarTab" data-target="sri">
              <i class="fas fa-file-invoice-dollar"></i><span>Facturación SRI</span>
            </button>
            <button class="config-nav-item" data-tab="ia" data-action="cambiarTab" data-target="ia">
              <i class="fas fa-robot"></i><span>Inteligencia Artificial</span>
            </button>
            <button class="config-nav-item" data-tab="backup" data-action="cambiarTab" data-target="backup">
              <i class="fas fa-database"></i><span>Backup</span>
            </button>
            <button class="config-nav-item" data-tab="avanzado" data-action="cambiarTab" data-target="avanzado">
              <i class="fas fa-cogs"></i><span>Avanzado</span>
            </button>
          </nav>
        </div>

        <!-- Contenido Principal -->
        <div class="config-main-content">
          <div class="config-section-header">
            <div class="config-section-title">
              <i class="fas fa-cog"></i>
              <span id="configSectionTitle">Configuración General</span>
            </div>
            <div class="config-actions-top">
              <button class="btn btn-warning btn-sm" data-action="exportarConfiguracion">
                <i class="fas fa-download"></i> Exportar
              </button>
              <button class="btn btn-success btn-sm" data-action="importarConfiguracion">
                <i class="fas fa-upload"></i> Importar
              </button>
              <button class="btn btn-danger btn-sm" data-action="restaurarDefecto">
                <i class="fas fa-undo"></i> Restaurar
              </button>
            </div>
          </div>

          <div id="configContent" class="config-content-wrapper">
            ${this.renderTabGeneral(config)}
          </div>
        </div>
      </div>
    `;

    // Resetear el estado de listeners antes de configurar nuevos (para permitir re-renderizado)
    this.resetListeners();
    // Setup event listeners después de renderizar
    this.setupEventListeners();
  },

  aplicarPreferenciasVisuales(visualConfig = {}) {
    if (!visualConfig) {
      return;
    }

    const temaPreferido = this.mapThemeValue(visualConfig.tema || 'auto');

    // Aplicar y persistir el tema
    if (temaPreferido === 'auto') {
      this.habilitarTemaAutomatico();
    } else {
      this.cambiarTema(temaPreferido);
    }

    if (visualConfig.colorPrincipal) {
      this.aplicarColorPrincipal(visualConfig.colorPrincipal);
    }

    this.cambiarTamañoFuente(visualConfig.tamañoFuente || 'normal');
  },

  mapThemeValue(value, fallback = 'auto') {
    let token = (value ?? '').toString().trim().toLowerCase();

    if (typeof token.normalize === 'function') {
      token = token.normalize('NFD');
    }

    token = token.replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');

    if (['auto', 'automatico', 'automatic', 'system', 'sistema'].includes(token)) {
      return 'auto';
    }

    if (window.ThemeManager && typeof ThemeManager.normalizeTheme === 'function') {
      const normalized = ThemeManager.normalizeTheme(value, { fallback: null });
      if (normalized) {
        return normalized;
      }
    }

    if (
      ['dark', 'darkmode', 'modooscuro', 'oscuro', 'nocturno', 'night', 'negro'].includes(token)
    ) {
      return 'dark';
    }

    if (['light', 'lightmode', 'modoclaro', 'claro', 'dia', 'day', 'blanco'].includes(token)) {
      return 'light';
    }

    return fallback;
  },

  getCountryOptions(selected) {
    const current = (selected || '').toString().trim();
    const hasOption = this.countryOptions.some((option) => option.value === current);
    const options = [...this.countryOptions];

    if (current && !hasOption) {
      options.splice(options.length - 1, 0, { value: current, label: current });
    }

    return options
      .map(
        (option) =>
          `<option value="${option.value}" ${option.value === current ? 'selected' : ''}>${option.label}</option>`
      )
      .join('');
  },

  getEcuadorCityOptions() {
    return this.ecuadorCityCatalog
      .map((item) => `<option value="${item.city}">${item.city} - ${item.province}</option>`)
      .join('');
  },

  getEcuadorPostalOptions() {
    const seen = new Map();
    this.ecuadorCityCatalog.forEach((item) => {
      if (!item.postal || seen.has(item.postal)) {
        return;
      }
      seen.set(item.postal, `${item.postal} - ${item.city}, ${item.province}`);
    });

    return Array.from(seen.entries())
      .map(([postal, label]) => `<option value="${postal}">${label}</option>`)
      .join('');
  },

  getPhoneCodeOptions() {
    return this.phoneCountryCodes
      .map((entry) => `<option value="${entry.code}">${entry.code} (${entry.country})</option>`)
      .join('');
  },

  normalizarTipoNegocio(valor) {
    const tipo = (valor || '').toString().trim().toLowerCase();

    if (['mecanica_automotriz', 'taller', 'taller_mecanico', 'mecanica'].includes(tipo)) {
      return 'mecanica_automotriz';
    }

    if (['personalizado', 'personalizada', 'otro'].includes(tipo)) {
      return 'personalizado';
    }

    if (['tienda_general', 'general', 'retail'].includes(tipo)) {
      return 'tienda_general';
    }

    return tipo || 'tienda_general';
  },

  mapTipoNegocioParaConfigTienda(tipo) {
    const canonical = this.normalizarTipoNegocio(tipo);
    if (canonical === 'mecanica_automotriz') {
      return 'taller';
    }
    if (canonical === 'personalizado') {
      return 'personalizada';
    }
    if (canonical === 'tienda_general') {
      return 'abarrotes';
    }
    return canonical;
  },

  /**
   * Función helper para guardar una sección de configuración
   * Centraliza la lógica de guardado, mensajes y logs
   * @param {string} seccion - Nombre de la sección (ventas, inventario, etc.)
   * @param {Object} config - Objeto de configuración completo
   * @param {Object} options - Opciones adicionales
   * @returns {boolean} - true si se guardó correctamente
   */
  _guardarSeccion(seccion, config, options = {}) {
    const { onSuccess = null, onError = null, showToast = true, syncCallback = null } = options;

    try {
      const guardado = Database.set(this.STORAGE_KEY, config);

      if (guardado) {
        if (showToast) {
          Utils.showToast(`Configuración de ${seccion} guardada exitosamente`, 'success');
        }
        console.log(
          `✅ Configuración de ${seccion} guardada para negocio:`,
          Database.getCurrentBusiness()
        );

        // Ejecutar callback de sincronización si existe
        if (syncCallback && typeof syncCallback === 'function') {
          syncCallback(config);
        }

        // Ejecutar callback de éxito si existe
        if (onSuccess && typeof onSuccess === 'function') {
          onSuccess(config);
        }

        return true;
      } else {
        if (showToast) {
          Utils.showToast(`Error al guardar configuración de ${seccion}`, 'error');
        }
        console.error(`❌ Error al guardar configuración de ${seccion}`);

        // Ejecutar callback de error si existe
        if (onError && typeof onError === 'function') {
          onError();
        }

        return false;
      }
    } catch (error) {
      console.error(`❌ Excepción al guardar configuración de ${seccion}:`, error);
      if (showToast) {
        Utils.showToast(`Error al guardar configuración de ${seccion}`, 'error');
      }

      if (onError && typeof onError === 'function') {
        onError(error);
      }

      return false;
    }
  },

  sincronizarConfiguracionesPrincipales(general) {
    if (!general || typeof general !== 'object') {
      return;
    }

    const tipoNegocio = this.normalizarTipoNegocio(general.tipoNegocio);

    try {
      const configBase = Database.get('configuracion') || {};
      const actualizado = {
        ...configBase,
        nombreNegocio: general.nombreNegocio || configBase.nombreNegocio || 'Mi Tienda',
        ruc: general.ruc || configBase.ruc || '',
        direccion: general.direccion || general.direccionMatriz || configBase.direccion || '',
        telefono: general.telefono || configBase.telefono || '',
        email: general.email || configBase.email || '',
        moneda: general.moneda || configBase.moneda || 'USD',
        tipoNegocio,
      };
      Database.set('configuracion', actualizado);
    } catch (error) {
      console.warn('No se pudo sincronizar la configuración base', error);
    }

    try {
      const configTienda = Database.get('configTienda');
      const tipoTienda = this.mapTipoNegocioParaConfigTienda(tipoNegocio);

      if (configTienda) {
        const actualizado = {
          ...configTienda,
          tipoTienda: tipoTienda || configTienda.tipoTienda,
          nombreTienda: general.nombreNegocio || configTienda.nombreTienda || 'Mi Tienda',
          telefono: general.telefono || configTienda.telefono || '',
          email: general.email || configTienda.email || '',
          direccion: general.direccionMatriz || general.direccion || configTienda.direccion || '',
          ciudad: general.ciudad || configTienda.ciudad || '',
          pais: general.pais || configTienda.pais || 'Ecuador',
        };
        Database.set('configTienda', actualizado);
      } else {
        Database.set('configTienda', {
          tipoTienda: tipoTienda || 'personalizada',
          nombreTienda: general.nombreNegocio || 'Mi Tienda',
          telefono: general.telefono || '',
          email: general.email || '',
          direccion: general.direccionMatriz || general.direccion || '',
          ciudad: general.ciudad || '',
          pais: general.pais || 'Ecuador',
          categorias: [],
          configurado: true,
          fechaConfiguracion: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.warn('No se pudo sincronizar la configuración de tienda', error);
    }

    if (window.App && typeof App.applyBusinessVisibility === 'function') {
      App.applyBusinessVisibility();
    }
  },

  // ============================================
  // TAB: CONFIGURACIÓN GENERAL
  // ============================================
  renderTabGeneral(config) {
    const defaults = this.obtenerConfiguracionDefecto().general;
    const stored = config.general || {};
    const general = {
      ...defaults,
      ...stored,
    };

    general.razonSocial = general.razonSocial || general.nombreNegocio || '';
    general.nombreComercial = general.nombreComercial || general.nombreNegocio || '';
    general.direccionMatriz = general.direccionMatriz || general.direccion || '';
    general.direccionSucursal = general.direccionSucursal || '';
    general.contribuyenteEspecial = general.contribuyenteEspecial || '';
    general.numeroResolucion = general.numeroResolucion || '';
    general.regimenTributario = general.regimenTributario || '';
    general.obligadoContabilidad =
      (general.obligadoContabilidad || 'NO').toUpperCase() === 'SI' ? 'SI' : 'NO';
    general.pais = general.pais || 'Ecuador';
    general.moneda = general.moneda || 'USD';
    const businessType = this.normalizarTipoNegocio(general.tipoNegocio);
    general.tipoNegocio = businessType;

    return `
      <div class="config-section active" id="tab-general">
        <h3><i class="fas fa-store"></i> Configuración General del Negocio</h3>

        <div class="config-subsection">
          <h4>Datos fiscales del emisor</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Razón Social *</label>
              <input type="text" id="razonSocial" class="form-control" value="${general.razonSocial || ''}" placeholder="Nombre legal registrado en el RUC">
            </div>
            <div class="config-group">
              <label>Nombre Comercial</label>
              <input type="text" id="nombreComercial" class="form-control" value="${general.nombreComercial || ''}" placeholder="Nombre comercial público">
            </div>
            <div class="config-group">
              <label>RUC *</label>
              <input type="text" id="rucNegocio" class="form-control" value="${general.ruc || ''}" maxlength="13" placeholder="1234567890001">
            </div>
            <div class="config-group">
              <label>Número Contribuyente Especial</label>
              <input type="text" id="contribuyenteEspecial" class="form-control" value="${general.contribuyenteEspecial || ''}" placeholder="Número de resolución (si aplica)">
            </div>
            <div class="config-group">
              <label>Obligado a llevar contabilidad *</label>
              <select id="obligadoContabilidadGeneral" class="form-control">
                <option value="SI" ${general.obligadoContabilidad === 'SI' ? 'selected' : ''}>Sí</option>
                <option value="NO" ${general.obligadoContabilidad === 'NO' ? 'selected' : ''}>No</option>
              </select>
            </div>
            <div class="config-group">
              <label>Régimen Tributario</label>
              <input type="text" id="regimenTributario" class="form-control" value="${general.regimenTributario || ''}" placeholder="Ej.: RIMPE - Negocio Popular">
            </div>
            <div class="config-group">
              <label>Resolución / Autorización</label>
              <input type="text" id="numeroResolucion" class="form-control" value="${general.numeroResolucion || ''}" placeholder="Número de resolución (opcional)">
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Direcciones y contacto</h4>
          <div class="config-grid">
            <div class="config-group full-width">
              <label>Dirección Matriz *</label>
              <input type="text" id="direccionMatriz" class="form-control" value="${general.direccionMatriz || ''}" placeholder="Dirección principal registrada en el SRI">
            </div>
            <div class="config-group full-width">
              <label>Dirección Establecimiento</label>
              <input type="text" id="direccionSucursal" class="form-control" value="${general.direccionSucursal || ''}" placeholder="Dirección del punto de emisión (si difiere)">
            </div>
            <div class="config-group">
              <label>Ciudad</label>
              <input type="text" id="ciudadNegocio" class="form-control" value="${general.ciudad || ''}" placeholder="Quito" list="configCiudadList" autocomplete="off">
            </div>
            <div class="config-group">
              <label>Código Postal</label>
              <input type="text" id="codigoPostal" class="form-control" value="${general.codigoPostal || ''}" placeholder="170150" list="configCodigoPostalList" autocomplete="off">
            </div>
            <div class="config-group">
              <label>País</label>
              <select id="paisNegocio" class="form-control">
                ${this.getCountryOptions(general.pais)}
              </select>
            </div>
            <div class="config-group">
              <label>Teléfono</label>
              <input type="text" id="telefonoNegocio" class="form-control" value="${general.telefono || ''}" placeholder="+593 999999999" list="configTelefonoList" autocomplete="off">
            </div>
            <div class="config-group">
              <label>Email</label>
              <input type="email" id="emailNegocio" class="form-control" value="${general.email || ''}" placeholder="info@mitienda.com">
            </div>
            <div class="config-group">
              <label>Sitio Web</label>
              <input type="url" id="webNegocio" class="form-control" value="${general.sitioWeb || ''}" placeholder="https://www.mitienda.com">
            </div>
          </div>
          <datalist id="configCiudadList">
            ${this.getEcuadorCityOptions()}
          </datalist>
          <datalist id="configCodigoPostalList">
            ${this.getEcuadorPostalOptions()}
          </datalist>
          <datalist id="configTelefonoList">
            ${this.getPhoneCodeOptions()}
          </datalist>
        </div>

        <div class="config-subsection">
          <h4>Identidad del negocio</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Nombre Interno *</label>
              <input type="text" id="nombreNegocio" class="form-control" value="${general.nombreNegocio || ''}" placeholder="Nombre visible en el sistema">
            </div>
            <div class="config-group">
              <label>Icono de la Tienda</label>
              <div class="icon-selector-wrapper">
                <div class="current-icon-display icon-picker-toggle">
                  <span class="icon-preview" id="selectedIconPreview">${general.icono || '🏪'}</span>
                  <span class="icon-change-text">Click para cambiar</span>
                </div>
                <input type="hidden" id="iconoNegocio" value="${general.icono || '🏪'}">
                <div class="icon-picker-dropdown" id="iconPickerDropdown" style="display: none;">
                  <div class="icon-picker-search">
                    <input type="text" placeholder="Buscar icono..." class="icon-search-input">
                  </div>
                  <div class="icon-picker-grid" id="iconPickerGrid">
                    ${this.renderIconGrid()}
                  </div>
                </div>
              </div>
            </div>
            <div class="config-group">
              <label>Tipo de Negocio</label>
              <select id="tipoNegocio" class="form-control">
                <option value="tienda_general" ${businessType === 'tienda_general' ? 'selected' : ''}>Tienda General / Retail</option>
                <option value="abarrotes" ${businessType === 'abarrotes' ? 'selected' : ''}>Abarrotes/Supermercado</option>
                <option value="electronica" ${businessType === 'electronica' ? 'selected' : ''}>Electrónica</option>
                <option value="ropa" ${businessType === 'ropa' ? 'selected' : ''}>Ropa y Accesorios</option>
                <option value="ferreteria" ${businessType === 'ferreteria' ? 'selected' : ''}>Ferretería</option>
                <option value="farmacia" ${businessType === 'farmacia' ? 'selected' : ''}>Farmacia</option>
                <option value="libreria" ${businessType === 'libreria' ? 'selected' : ''}>Librería</option>
                <option value="restaurante" ${businessType === 'restaurante' ? 'selected' : ''}>Restaurante</option>
                <option value="mecanica_automotriz" ${businessType === 'mecanica_automotriz' ? 'selected' : ''}>Taller Mecánico</option>
                <option value="personalizado" ${businessType === 'personalizado' ? 'selected' : ''}>Otro / Personalizado</option>
              </select>
            </div>
            <div class="config-group">
              <label>Moneda</label>
              <select id="moneda" class="form-control">
                <option value="USD" ${general.moneda === 'USD' ? 'selected' : ''}>USD - Dólar</option>
                <option value="EUR" ${general.moneda === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                <option value="COP" ${general.moneda === 'COP' ? 'selected' : ''}>COP - Peso Colombiano</option>
                <option value="MXN" ${general.moneda === 'MXN' ? 'selected' : ''}>MXN - Peso Mexicano</option>
                <option value="PEN" ${general.moneda === 'PEN' ? 'selected' : ''}>PEN - Sol Peruano</option>
                <option value="ARS" ${general.moneda === 'ARS' ? 'selected' : ''}>ARS - Peso Argentino</option>
                <option value="CLP" ${general.moneda === 'CLP' ? 'selected' : ''}>CLP - Peso Chileno</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Descripción del negocio</h4>
          <div class="config-group full-width">
            <textarea id="descripcionNegocio" class="form-control" rows="3" placeholder="Describe tu negocio...">${general.descripcion || ''}</textarea>
          </div>
        </div>

        <div class="config-actions">
          <button class="btn btn-success btn-lg btn-save-config" data-section="general">
            <i class="fas fa-save"></i> Guardar Configuración General
          </button>
        </div>
      </div>
    `;
  },

  // ============================================
  // TAB: CONFIGURACIÓN DE VENTAS
  // ============================================
  renderTabVentas(config) {
    return `
      <div class="config-section" id="tab-ventas">
        <h3><i class="fas fa-cash-register"></i> Configuración de Ventas y POS</h3>
        
        <div class="config-subsection">
          <h4>Impuestos y Tasas</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>IVA Principal (%)</label>
              <input type="number" id="ivaPrincipal" class="form-control" value="${config.ventas.ivaPrincipal || 15}" min="0" max="100" step="0.1">
            </div>
            <div class="config-group">
              <label>IVA Reducido (%)</label>
              <input type="number" id="ivaReducido" class="form-control" value="${config.ventas.ivaReducido || 0}" min="0" max="100" step="0.1">
            </div>
            <div class="config-group">
              <label>Aplicar IVA por Defecto</label>
              <select id="aplicarIvaDefecto" class="form-control">
                <option value="si" ${config.ventas.aplicarIvaDefecto === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.ventas.aplicarIvaDefecto === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Métodos de Pago</h4>
          <div class="config-grid">
            <div class="config-group">
              <label><input type="checkbox" id="pagoEfectivo" ${config.ventas.metodoPago.efectivo ? 'checked' : ''}> Efectivo</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="pagoTarjeta" ${config.ventas.metodoPago.tarjeta ? 'checked' : ''}> Tarjeta de Crédito/Débito</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="pagoTransferencia" ${config.ventas.metodoPago.transferencia ? 'checked' : ''}> Transferencia Bancaria</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="pagoCredito" ${config.ventas.metodoPago.credito ? 'checked' : ''}> Crédito/A cuenta</label>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Políticas de Descuentos</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Descuento Máximo (%)</label>
              <input type="number" id="descuentoMaximo" class="form-control" value="${config.ventas.descuentoMaximo || 50}" min="0" max="100">
            </div>
            <div class="config-group">
              <label>Requiere Autorización para Descuentos Mayores a (%)</label>
              <input type="number" id="descuentoAutorizacion" class="form-control" value="${config.ventas.descuentoAutorizacion || 20}" min="0" max="100">
            </div>
            <div class="config-group">
              <label>Permitir Descuentos en Productos en Promoción</label>
              <select id="descuentoPromo" class="form-control">
                <option value="si" ${config.ventas.descuentoPromo === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.ventas.descuentoPromo === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4><i class="fas fa-percentage"></i> Plantillas de Margen de Ganancia</h4>
          <p class="config-help-text">Define plantillas de margen que podrás seleccionar al crear o editar productos.</p>
          <div id="marginTemplatesContainer">
            ${this.renderMarginTemplates(config)}
          </div>
          <button type="button" class="btn btn-outline-primary btn-sm" id="btnAddMarginTemplate" style="margin-top:0.75rem;">
            <i class="fas fa-plus"></i> Agregar Plantilla
          </button>
        </div>

        <div class="config-subsection">
          <h4><i class="fas fa-tags"></i> Códigos de Descuento para Clientes</h4>
          <p class="config-help-text">Códigos que tus clientes pueden usar en el POS para obtener descuentos especiales.</p>
          <div id="discountCodesContainer">
            ${this.renderDiscountCodes(config)}
          </div>
          <button type="button" class="btn btn-outline-primary btn-sm" id="btnAddDiscountCode" style="margin-top:0.75rem;">
            <i class="fas fa-plus"></i> Agregar Código de Descuento
          </button>
        </div>

        <div class="config-subsection">
          <h4>Formato de Tickets y Facturas</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Tamaño de Papel</label>
              <select id="tamañoPapel" class="form-control">
                <option value="80mm" ${config.ventas.tamañoPapel === '80mm' ? 'selected' : ''}>80mm (Ticket)</option>
                <option value="a4" ${config.ventas.tamañoPapel === 'a4' ? 'selected' : ''}>A4 (Factura)</option>
                <option value="carta" ${config.ventas.tamañoPapel === 'carta' ? 'selected' : ''}>Carta</option>
              </select>
            </div>
            <div class="config-group">
              <label>Mostrar Logo en Ticket</label>
              <select id="mostrarLogo" class="form-control">
                <option value="si" ${config.ventas.mostrarLogo === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.ventas.mostrarLogo === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
            <div class="config-group">
              <label>Imprimir Automáticamente</label>
              <select id="imprimirAuto" class="form-control">
                <option value="si" ${config.ventas.imprimirAuto === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.ventas.imprimirAuto === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
            <div class="config-group full-width">
              <label>Mensaje en Ticket (Pie de Página)</label>
              <textarea id="mensajeTicket" class="form-control" rows="2" placeholder="¡Gracias por su compra!">${config.ventas.mensajeTicket || '¡Gracias por su compra!'}</textarea>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Otras Configuraciones</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Solicitar Cliente en Cada Venta</label>
              <select id="solicitarCliente" class="form-control">
                <option value="si" ${config.ventas.solicitarCliente === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.ventas.solicitarCliente === 'no' ? 'selected' : ''}>No</option>
                <option value="opcional" ${config.ventas.solicitarCliente === 'opcional' ? 'selected' : ''}>Opcional</option>
              </select>
            </div>
            <div class="config-group">
              <label>Redondeo de Total</label>
              <select id="redondeoTotal" class="form-control">
                <option value="ninguno" ${config.ventas.redondeoTotal === 'ninguno' ? 'selected' : ''}>Sin redondeo</option>
                <option value="05" ${config.ventas.redondeoTotal === '05' ? 'selected' : ''}>A $0.05</option>
                <option value="10" ${config.ventas.redondeoTotal === '10' ? 'selected' : ''}>A $0.10</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-actions">
          <button class="btn btn-success btn-lg btn-save-config" data-section="ventas">
            <i class="fas fa-save"></i> Guardar Configuración de Ventas
          </button>
        </div>
      </div>
    `;
  },

  // ============================================
  // TAB: CONFIGURACIÓN DE INVENTARIO
  // ============================================
  renderTabInventario(config) {
    return `
      <div class="config-section" id="tab-inventario">
        <h3><i class="fas fa-boxes"></i> Configuración de Inventario</h3>
        
        <div class="config-subsection">
          <h4>Control de Stock</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Stock Mínimo por Defecto</label>
              <input type="number" id="stockMinimo" class="form-control" value="${config.inventario.stockMinimo || 10}" min="0">
            </div>
            <div class="config-group">
              <label>Stock Crítico (Alerta Roja)</label>
              <input type="number" id="stockCritico" class="form-control" value="${config.inventario.stockCritico || 5}" min="0">
            </div>
            <div class="config-group">
              <label>Permitir Ventas con Stock Negativo</label>
              <select id="stockNegativo" class="form-control">
                <option value="no" ${config.inventario.stockNegativo === 'no' ? 'selected' : ''}>No</option>
                <option value="si" ${config.inventario.stockNegativo === 'si' ? 'selected' : ''}>Sí</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Alertas de Inventario</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Notificar Stock Bajo</label>
              <select id="notificarStockBajo" class="form-control">
                <option value="si" ${config.inventario.notificarStockBajo === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.inventario.notificarStockBajo === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
            <div class="config-group">
              <label>Notificar Productos Próximos a Vencer</label>
              <select id="notificarVencimiento" class="form-control">
                <option value="si" ${config.inventario.notificarVencimiento === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.inventario.notificarVencimiento === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
            <div class="config-group">
              <label>Días de Anticipación para Vencimiento</label>
              <input type="number" id="diasVencimiento" class="form-control" value="${config.inventario.diasVencimiento || 30}" min="1">
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Gestión de Lotes y Vencimientos</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Controlar Lotes de Productos</label>
              <select id="controlarLotes" class="form-control">
                <option value="si" ${config.inventario.controlarLotes === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.inventario.controlarLotes === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
            <div class="config-group">
              <label>Método de Salida de Inventario</label>
              <select id="metodoSalida" class="form-control">
                <option value="fifo" ${config.inventario.metodoSalida === 'fifo' ? 'selected' : ''}>FIFO (Primero en entrar, primero en salir)</option>
                <option value="lifo" ${config.inventario.metodoSalida === 'lifo' ? 'selected' : ''}>LIFO (Último en entrar, primero en salir)</option>
                <option value="fefo" ${config.inventario.metodoSalida === 'fefo' ? 'selected' : ''}>FEFO (Primero en vencer, primero en salir)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Proveedores</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Solicitar Proveedor en Compras</label>
              <select id="solicitarProveedor" class="form-control">
                <option value="si" ${config.inventario.solicitarProveedor === 'si' ? 'selected' : ''}>Sí (Obligatorio)</option>
                <option value="opcional" ${config.inventario.solicitarProveedor === 'opcional' ? 'selected' : ''}>Opcional</option>
                <option value="no" ${config.inventario.solicitarProveedor === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
            <div class="config-group">
              <label>Días para Pago a Proveedores (Crédito)</label>
              <input type="number" id="diasPagoProveedor" class="form-control" value="${config.inventario.diasPagoProveedor || 30}" min="0">
            </div>
          </div>
        </div>

        <div class="config-actions">
          <button class="btn btn-success btn-lg btn-save-config" data-section="inventario">
            <i class="fas fa-save"></i> Guardar Configuración de Inventario
          </button>
        </div>
      </div>
    `;
  },

  // ============================================
  // TAB: CONFIGURACIÓN DE PUBLICIDAD
  // ============================================
  renderTabPublicidad(config) {
    return `
      <div class="config-section" id="tab-publicidad">
        <h3><i class="fas fa-bullhorn"></i> Configuración de Publicidad y Marketing</h3>
        
        <div class="config-subsection">
          <h4>Redes Sociales</h4>
          <div class="config-grid">
            <div class="config-group">
              <label><input type="checkbox" id="redFacebook" ${config.publicidad.redes.facebook ? 'checked' : ''}> Facebook</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="redInstagram" ${config.publicidad.redes.instagram ? 'checked' : ''}> Instagram</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="redTwitter" ${config.publicidad.redes.twitter ? 'checked' : ''}> Twitter</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="redTikTok" ${config.publicidad.redes.tiktok ? 'checked' : ''}> TikTok</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="redWhatsApp" ${config.publicidad.redes.whatsapp ? 'checked' : ''}> WhatsApp Business</label>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Configuración de IA para Publicidad</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Proveedor de IA</label>
              <select id="proveedorIA" class="form-control" data-action="toggleProviderIA" data-params="this.value">
                <option value="local" ${config.publicidad.ia.proveedor === 'local' ? 'selected' : ''}>IA Local (Simulada)</option>
                <option value="gemini" ${config.publicidad.ia.proveedor === 'gemini' ? 'selected' : ''}>Google Gemini</option>
                <option value="deepseek" ${config.publicidad.ia.proveedor === 'deepseek' ? 'selected' : ''}>DeepSeek</option>
                <option value="llmstudio" ${config.publicidad.ia.proveedor === 'llmstudio' ? 'selected' : ''}>LLM Studio</option>
              </select>
            </div>
            
            <div id="config-ia-gemini" class="config-group full-width" style="display: none;">
              <label>API Key de Google Gemini</label>
              <input type="password" id="geminiApiKey" class="form-control" value="${config.publicidad.ia.geminiApiKey || ''}" placeholder="Ingresa tu API Key">
            </div>
            
            <div id="config-ia-deepseek" class="config-group full-width" style="display: none;">
              <label>API Key de DeepSeek</label>
              <input type="password" id="deepseekApiKey" class="form-control" value="${config.publicidad.ia.deepseekApiKey || ''}" placeholder="Ingresa tu API Key">
            </div>
            
            <div id="config-ia-llmstudio" class="config-group full-width" style="display: none;">
              <label>URL del Servidor LLM Studio</label>
              <input type="text" id="llmstudioUrl" class="form-control" value="${config.publicidad.ia.llmstudioUrl || 'http://localhost:1234/v1'}" placeholder="http://localhost:1234/v1">
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Frecuencia de Publicaciones</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Frecuencia Recomendada</label>
              <select id="frecuenciaPublicacion" class="form-control">
                <option value="diaria" ${config.publicidad.frecuencia === 'diaria' ? 'selected' : ''}>Diaria</option>
                <option value="3veces" ${config.publicidad.frecuencia === '3veces' ? 'selected' : ''}>3 veces por semana</option>
                <option value="semanal" ${config.publicidad.frecuencia === 'semanal' ? 'selected' : ''}>Semanal</option>
                <option value="mensual" ${config.publicidad.frecuencia === 'mensual' ? 'selected' : ''}>Mensual</option>
              </select>
            </div>
            <div class="config-group">
              <label>Hora Preferida para Publicar</label>
              <input type="time" id="horaPublicacion" class="form-control" value="${config.publicidad.horaPublicacion || '09:00'}">
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Enlaces de Redes Sociales</h4>
          <div class="config-grid">
            <div class="config-group full-width">
              <label>Facebook</label>
              <input type="url" id="enlaceFacebook" class="form-control" value="${config.publicidad.enlaces.facebook || ''}" placeholder="https://facebook.com/tutienda">
            </div>
            <div class="config-group full-width">
              <label>Instagram</label>
              <input type="url" id="enlaceInstagram" class="form-control" value="${config.publicidad.enlaces.instagram || ''}" placeholder="https://instagram.com/tutienda">
            </div>
            <div class="config-group full-width">
              <label>WhatsApp Business</label>
              <input type="tel" id="enlaceWhatsApp" class="form-control" value="${config.publicidad.enlaces.whatsapp || ''}" placeholder="+593999999999">
            </div>
          </div>
        </div>

        <div class="config-actions">
          <button class="btn btn-success btn-lg btn-save-config" data-section="publicidad">
            <i class="fas fa-save"></i> Guardar Configuración de Publicidad
          </button>
        </div>
      </div>
    `;
  },

  // ============================================
  // TAB: CONFIGURACIÓN DE USUARIOS
  // ============================================
  renderTabUsuarios(config) {
    const usuarios = Database.getCollection('usuarios') || [];

    return `
      <div class="config-section" id="tab-usuarios">
        <h3><i class="fas fa-users-cog"></i> Gestión de Usuarios y Permisos</h3>
        
        <div class="config-subsection">
          <div class="table-header">
            <h4>Usuarios del Sistema</h4>
            <button class="btn btn-primary" data-action="mostrarModalUsuario" data-params="">
              <i class="fas fa-plus"></i> Nuevo Usuario
            </button>
          </div>
          
          <div class="table-responsive">
            <table class="config-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${usuarios
                  .map(
                    (u) => `
                  <tr>
                    <td><strong>${u.username}</strong></td>
                    <td>${u.nombre}</td>
                    <td>${u.email || '-'}</td>
                    <td><span class="badge ${u.rol === 'admin' ? 'badge-primary' : 'badge-secondary'}">${u.rol === 'admin' ? 'Administrador' : 'Usuario'}</span></td>
                    <td><span class="badge ${u.activo ? 'badge-success' : 'badge-danger'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                      <button class="btn btn-sm btn-secondary" data-action="editarUsuario" data-params="'${u.id}'" title="Editar">
                        <i class="fas fa-edit"></i>
                      </button>
                      ${
                        u.id !== Auth.getSession()?.userId
                          ? `
                        <button class="btn btn-sm btn-danger" data-action="eliminarUsuario" data-params="'${u.id}'" title="Eliminar">
                          <i class="fas fa-trash"></i>
                        </button>
                      `
                          : ''
                      }
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Configuración de Sesiones</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Tiempo de Inactividad (minutos)</label>
              <input type="number" id="tiempoInactividad" class="form-control" value="${config.usuarios.tiempoInactividad || 60}" min="5">
            </div>
            <div class="config-group">
              <label>Permitir Múltiples Sesiones</label>
              <select id="multiplesSesiones" class="form-control">
                <option value="si" ${config.usuarios.multiplesSesiones === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.usuarios.multiplesSesiones === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-actions">
          <button class="btn btn-success btn-lg btn-save-config" data-section="usuarios">
            <i class="fas fa-save"></i> Guardar Configuración de Usuarios
          </button>
        </div>
      </div>
    `;
  },

  // ============================================
  // TAB: CONFIGURACIÓN DE NOTIFICACIONES
  // ============================================
  renderTabNotificaciones(config) {
    return `
      <div class="config-section" id="tab-notificaciones">
        <h3><i class="fas fa-bell"></i> Configuración de Notificaciones</h3>
        
        <div class="config-subsection">
          <h4>Tipos de Notificaciones</h4>
          <div class="config-grid">
            <div class="config-group">
              <label><input type="checkbox" id="notifVentas" ${config.notificaciones.ventas ? 'checked' : ''}> Ventas Realizadas</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="notifStockBajo" ${config.notificaciones.stockBajo ? 'checked' : ''}> Stock Bajo</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="notifVencimiento" ${config.notificaciones.vencimiento ? 'checked' : ''}> Productos por Vencer</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="notifPagos" ${config.notificaciones.pagos ? 'checked' : ''}> Pagos Pendientes</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="notifRecordatorios" ${config.notificaciones.recordatorios ? 'checked' : ''}> Recordatorios</label>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Canales de Notificación</h4>
          <div class="config-grid">
            <div class="config-group">
              <label><input type="checkbox" id="canalSistema" ${config.notificaciones.canales.sistema ? 'checked' : ''}> Notificaciones del Sistema</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="canalEmail" ${config.notificaciones.canales.email ? 'checked' : ''}> Email</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="canalSonido" ${config.notificaciones.canales.sonido ? 'checked' : ''}> Sonido</label>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Horario de Notificaciones</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Hora Inicio</label>
              <input type="time" id="horaInicioNotif" class="form-control" value="${config.notificaciones.horario.inicio || '08:00'}">
            </div>
            <div class="config-group">
              <label>Hora Fin</label>
              <input type="time" id="horaFinNotif" class="form-control" value="${config.notificaciones.horario.fin || '20:00'}">
            </div>
          </div>
        </div>

        <div class="config-actions">
          <button class="btn btn-success btn-lg btn-save-config" data-section="notificaciones">
            <i class="fas fa-save"></i> Guardar Configuración de Notificaciones
          </button>
        </div>
      </div>
    `;
  },

  // ============================================
  // TAB: CONFIGURACIÓN VISUAL/APARIENCIA
  // ============================================
  renderTabVisual(config) {
    const temaActual = this.mapThemeValue(config.visual.tema);
    return `
      <div class="config-section" id="tab-visual">
        <h3><i class="fas fa-palette"></i> Apariencia y Personalización</h3>
        
        <div class="config-subsection">
          <h4>Tema</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Modo de Color</label>
              <select id="modoColor" class="form-control" data-action="cambiarTema" data-params="this.value">
                <option value="light" ${temaActual === 'light' ? 'selected' : ''}>Claro</option>
                <option value="dark" ${temaActual === 'dark' ? 'selected' : ''}>Oscuro</option>
                <option value="auto" ${temaActual === 'auto' ? 'selected' : ''}>Automático</option>
              </select>
            </div>
            <div class="config-group">
              <label>Color Principal</label>
              <input type="color" id="colorPrincipal" class="form-control" value="${config.visual.colorPrincipal || '#6366f1'}">
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Logo de la Tienda</h4>
          <div class="config-grid">
            <div class="config-group full-width">
              <label>URL del Logo</label>
              <input type="url" id="logoUrl" class="form-control" value="${config.visual.logoUrl || ''}" placeholder="https://ejemplo.com/logo.png">
              <small>Puedes usar una URL de imagen o subirla a un servicio como Imgur</small>
            </div>
            <div class="config-group">
              <label>Mostrar Logo en Sidebar</label>
              <select id="mostrarLogoSidebar" class="form-control">
                <option value="si" ${config.visual.mostrarLogoSidebar === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.visual.mostrarLogoSidebar === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Tamaño de Fuente</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Tamaño Base</label>
              <select id="tamañoFuente" class="form-control" data-action="cambiarTamañoFuente" data-params="this.value">
                <option value="pequeño" ${config.visual.tamañoFuente === 'pequeño' ? 'selected' : ''}>Pequeño</option>
                <option value="normal" ${config.visual.tamañoFuente === 'normal' ? 'selected' : ''}>Normal</option>
                <option value="grande" ${config.visual.tamañoFuente === 'grande' ? 'selected' : ''}>Grande</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-actions">
          <button class="btn btn-success btn-lg btn-save-config" data-section="visual">
            <i class="fas fa-save"></i> Guardar Configuración Visual
          </button>
        </div>
      </div>
    `;
  },

  // ============================================
  // TAB: CONFIGURACIÓN DE REPORTES
  // ============================================
  renderTabReportes(config) {
    return `
      <div class="config-section" id="tab-reportes">
        <h3><i class="fas fa-file-alt"></i> Configuración de Reportes</h3>
        
        <div class="config-subsection">
          <h4>Formato de Exportación</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Formato por Defecto</label>
              <select id="formatoReporte" class="form-control">
                <option value="pdf" ${config.reportes.formato === 'pdf' ? 'selected' : ''}>PDF</option>
                <option value="excel" ${config.reportes.formato === 'excel' ? 'selected' : ''}>Excel</option>
                <option value="csv" ${config.reportes.formato === 'csv' ? 'selected' : ''}>CSV</option>
              </select>
            </div>
            <div class="config-group">
              <label>Incluir Logo en Reportes</label>
              <select id="logoReportes" class="form-control">
                <option value="si" ${config.reportes.incluirLogo === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.reportes.incluirLogo === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Campos a Incluir</h4>
          <div class="config-grid">
            <div class="config-group">
              <label><input type="checkbox" id="reportePrecios" ${config.reportes.campos.precios ? 'checked' : ''}> Precios de Compra</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="reporteCostos" ${config.reportes.campos.costos ? 'checked' : ''}> Costos</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="reporteMargenes" ${config.reportes.campos.margenes ? 'checked' : ''}> Márgenes de Ganancia</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="reporteProveedores" ${config.reportes.campos.proveedores ? 'checked' : ''}> Información de Proveedores</label>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Reportes Automáticos</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Generar Reporte Diario</label>
              <select id="reporteDiario" class="form-control">
                <option value="si" ${config.reportes.automatico.diario === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.reportes.automatico.diario === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
            <div class="config-group">
              <label>Generar Reporte Semanal</label>
              <select id="reporteSemanal" class="form-control">
                <option value="si" ${config.reportes.automatico.semanal === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.reportes.automatico.semanal === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
            <div class="config-group">
              <label>Generar Reporte Mensual</label>
              <select id="reporteMensual" class="form-control">
                <option value="si" ${config.reportes.automatico.mensual === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.reportes.automatico.mensual === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-actions">
          <button class="btn btn-success btn-lg btn-save-config" data-section="reportes">
            <i class="fas fa-save"></i> Guardar Configuración de Reportes
          </button>
        </div>
      </div>
    `;
  },

  // ============================================
  // TAB: CONFIGURACIÓN DE TELEGRAM
  // ============================================
  renderTabTelegram(config) {
    const estadoTelegram = window.TelegramNotificaciones
      ? TelegramNotificaciones.obtenerEstado()
      : null;

    return `
      <div class="config-section" id="tab-telegram">
        <h3><i class="fab fa-telegram"></i> Integración con Telegram</h3>
        
        ${
          estadoTelegram && estadoTelegram.inicializado
            ? `
          <div class="alert alert-success">
            <i class="fas fa-check-circle"></i>
            <strong>Telegram Conectado</strong> - El bot está funcionando correctamente
          </div>
        `
            : ''
        }
        
        <div class="config-subsection">
          <h4>Configuración del Bot</h4>
          <div class="alert alert-info telegram-help-box">
            <div class="telegram-help-section">
              <div class="telegram-help-title">
                <i class="fas fa-robot"></i>
                <strong>¿Cómo obtener tu Bot Token?</strong>
              </div>
              <ol class="telegram-help-steps">
                <li>Habla con <a href="https://t.me/BotFather" target="_blank">@BotFather</a> en Telegram</li>
                <li>Envía el comando <code>/newbot</code></li>
                <li>Sigue las instrucciones y copia el token que te da</li>
              </ol>
            </div>
            <div class="telegram-help-section">
              <div class="telegram-help-title">
                <i class="fas fa-id-card"></i>
                <strong>¿Cómo obtener tu Chat ID?</strong>
              </div>
              <ol class="telegram-help-steps">
                <li>Habla con <a href="https://t.me/userinfobot" target="_blank">@userinfobot</a></li>
                <li>Te dirá tu Chat ID (es un número)</li>
                <li>También puedes agregar el bot a un grupo y usar el Chat ID del grupo</li>
              </ol>
            </div>
          </div>
          
          <!-- Panel de Estado del Bot -->
          <div id="telegramBotStatus" class="telegram-bot-status">
            <div class="bot-status-icon">
              <i class="fab fa-telegram"></i>
            </div>
            <div class="bot-status-info">
              <span class="bot-status-label">Estado del Bot</span>
              <span class="bot-status-value" id="telegramStatusText">No configurado</span>
            </div>
          </div>
          
          <div class="config-grid">
            <div class="config-group full-width">
              <label><input type="checkbox" id="telegramActivo" ${config.telegram.activo ? 'checked' : ''}> Activar Integración con Telegram</label>
            </div>
            
            <div class="config-group full-width">
              <label>Bot Token *</label>
              <div class="telegram-token-input">
                <input type="password" id="telegramBotToken" class="form-control" value="${config.telegram.botToken || ''}" placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz">
                <button class="btn btn-icon" type="button" onclick="this.previousElementSibling.type = this.previousElementSibling.type === 'password' ? 'text' : 'password'; this.querySelector('i').classList.toggle('fa-eye'); this.querySelector('i').classList.toggle('fa-eye-slash');" title="Mostrar/ocultar token">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-primary" data-action="probarConexionTelegram" data-params="">
                  <i class="fas fa-plug"></i> Verificar Bot
                </button>
              </div>
              <small>Tu token del bot de Telegram (obtenido de @BotFather)</small>
            </div>
          </div>
          
          <!-- Panel de acceso rápido al bot (se muestra después de verificar) -->
          <div id="telegramBotQuickAccess" class="telegram-quick-access" style="display: none;">
            <div class="quick-access-header">
              <i class="fas fa-check-circle"></i>
              <strong>¡Bot verificado correctamente!</strong>
            </div>
            <div class="quick-access-body">
              <p>Tu bot <strong id="telegramBotName">@bot</strong> está listo. Sigue estos pasos:</p>
              <div class="quick-access-steps">
                <div class="quick-step">
                  <span class="step-number">1</span>
                  <div class="step-content">
                    <strong>Abre tu bot en Telegram</strong>
                    <a id="telegramBotLink" href="#" target="_blank" class="btn btn-telegram">
                      <i class="fab fa-telegram"></i> Abrir Bot en Telegram
                    </a>
                  </div>
                </div>
                <div class="quick-step">
                  <span class="step-number">2</span>
                  <div class="step-content">
                    <strong>Envía /start al bot</strong>
                    <span class="step-hint">Esto registrará tu Chat ID</span>
                  </div>
                </div>
                <div class="quick-step">
                  <span class="step-number">3</span>
                  <div class="step-content">
                    <strong>Detecta tu Chat ID</strong>
                    <button class="btn btn-success" data-action="obtenerChatIdsAutomaticamente" data-params="">
                      <i class="fas fa-magic"></i> Detectar Chat ID Ahora
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4><i class="fas fa-users"></i> Usuarios de Telegram</h4>
          
          <div class="telegram-users-panel">
            <div class="form-group">
              <label><i class="fas fa-search"></i> Detectar Automáticamente</label>
              <div class="telegram-detect-row">
                <button class="btn btn-success" data-action="obtenerChatIdsAutomaticamente" data-params="">
                  <i class="fas fa-magic"></i> Detectar Chat IDs
                </button>
                <button class="btn btn-secondary" data-action="limpiarUpdatesTelegram" data-params="" title="Limpiar mensajes antiguos del bot">
                  <i class="fas fa-broom"></i> Limpiar
                </button>
              </div>
              <small>Detecta automáticamente los Chat IDs de quienes han escrito al bot</small>
            </div>
            
            <div class="form-group">
              <label><i class="fas fa-keyboard"></i> Agregar Manualmente</label>
              <div class="telegram-manual-row">
                <input type="text" id="nuevoChatId" class="form-control" placeholder="Ej: 123456789">
                <button class="btn btn-primary" data-action="agregarChatIdTelegram" data-params="">
                  <i class="fas fa-plus"></i> Agregar
                </button>
              </div>
            </div>
          </div>

          <!-- Configuración del Asistente Virtual -->
          <div class="telegram-assistant-config">
            <label><i class="fas fa-user-tie"></i> Nombre del Asistente Virtual</label>
            <div class="assistant-name-row">
              <input type="text" id="telegramNombreAsistente" class="form-control" 
                value="${config.telegram.nombreAsistente || 'Sara'}" 
                placeholder="Ej: Sara, María, Carlos...">
              <small>Este nombre se usará para saludar a los usuarios</small>
            </div>
          </div>
          
          <div id="listaChatIds" class="config-table-container">
            ${this.renderTablaUsuariosTelegram(config)}
          </div>
        </div>

        <div class="config-subsection">
          <h4>Tipos de Notificaciones</h4>
          <div class="config-grid">
            <div class="config-group">
              <label><input type="checkbox" id="telegramStockBajo" ${config.telegram.enviarStockBajo ? 'checked' : ''}> Stock Bajo / Crítico</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="telegramProductosVencer" ${config.telegram.enviarProductosVencer ? 'checked' : ''}> Productos por Vencer</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="telegramVentas" ${config.telegram.enviarVentas ? 'checked' : ''}> Ventas Realizadas</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="telegramPagos" ${config.telegram.enviarPagos ? 'checked' : ''}> Pagos Pendientes</label>
            </div>
            <div class="config-group">
              <label><input type="checkbox" id="telegramRecordatorios" ${config.telegram.enviarRecordatorios ? 'checked' : ''}> Recordatorios</label>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Resumen Diario</h4>
          <div class="config-grid">
            <div class="config-group">
              <label><input type="checkbox" id="telegramResumenDiario" ${config.telegram.stockBajoDiario ? 'checked' : ''}> Enviar Resumen Diario</label>
            </div>
            <div class="config-group">
              <label>Hora del Resumen</label>
              <input type="time" id="telegramHoraResumen" class="form-control" value="${config.telegram.horaResumenDiario || '08:00'}">
            </div>
          </div>
        </div>

        <div class="config-actions">
          <button class="btn btn-warning" data-action="enviarMensajePruebaTelegram" data-params="">
            <i class="fas fa-paper-plane"></i> Enviar Mensaje de Prueba
          </button>
          <button class="btn btn-success btn-lg btn-save-config" data-section="telegram">
            <i class="fas fa-save"></i> Guardar Configuración de Telegram
          </button>
        </div>

        <!-- Panel de Chat con IA -->
        <div class="config-subsection telegram-chat-section">
          <h4><i class="fas fa-robot"></i> Asistente IA por Telegram</h4>
          <div class="alert alert-info">
            <i class="fas fa-lightbulb"></i>
            <strong>Asistente Inteligente:</strong> Los usuarios pueden escribir al bot en lenguaje natural para consultar stock, ventas, productos y más. El bot responde automáticamente usando IA.
          </div>
          
          <div class="telegram-ia-status" id="telegramIAStatus">
            <div class="ia-status-header">
              <span class="ia-status-indicator" id="iaStatusIndicator">
                <i class="fas fa-circle"></i>
              </span>
              <span id="iaStatusText">Verificando estado...</span>
            </div>
            <div class="ia-status-actions">
              <button class="btn btn-sm btn-primary" data-action="iniciarTelegramIA">
                <i class="fas fa-play"></i> Iniciar
              </button>
              <button class="btn btn-sm btn-secondary" data-action="detenerTelegramIA">
                <i class="fas fa-stop"></i> Detener
              </button>
              <button class="btn btn-sm btn-info" data-action="toggleTelegramChat">
                <i class="fas fa-comments"></i> Ver Chat
              </button>
            </div>
          </div>

          <div class="telegram-chat-panel" id="telegramChatPanel" style="display: none;">
            <div class="chat-header">
              <span><i class="fab fa-telegram"></i> Historial de Conversaciones</span>
              <button class="btn btn-sm btn-danger" data-action="limpiarHistorialTelegram" title="Limpiar historial">
                <i class="fas fa-trash"></i>
              </button>
            </div>
            <div class="chat-messages" id="telegramChatMessages">
              <div class="empty-chat">
                <i class="fas fa-comments"></i>
                <p>No hay mensajes aún</p>
                <small>Los mensajes de Telegram aparecerán aquí</small>
              </div>
            </div>
            <div class="chat-footer">
              <small id="chatStats">0 mensajes | 0 conversaciones activas</small>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderTabSri(config) {
    const sri = this.normalizarSriConfig(config.sri);
    const endpoints = this.obtenerEndpointsSri(sri.ambiente);
    const recepcionUrl = sri.wsRecepcion || endpoints.recepcion;
    const autorizacionUrl = sri.wsAutorizacion || endpoints.autorizacion;
    const consultaUrl = sri.wsConsulta || endpoints.consulta;

    return `
      <div class="config-section" id="tab-sri">
        <h3><i class="fas fa-file-invoice-dollar"></i> Integración con el SRI</h3>

        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          Completa estos campos con la información autorizada por el Servicio de Rentas Internas para emitir comprobantes electrónicos. Conserva las credenciales de producción en un entorno seguro.
        </div>

        <div class="config-subsection">
          <h4>Estado de la Integración</h4>
          <div class="config-grid">
            <div class="config-group full-width">
              <label><input type="checkbox" id="sriHabilitado" ${sri.habilitado ? 'checked' : ''}> Habilitar emisión electrónica con el SRI</label>
            </div>
            <div class="config-group">
              <label>Ambiente</label>
              <select id="sriAmbiente" class="form-control" data-action="handleAmbienteSriChange" data-params="this.value">
                <option value="pruebas" ${sri.ambiente === 'pruebas' ? 'selected' : ''}>Pruebas (CERTIFICACIÓN)</option>
                <option value="produccion" ${sri.ambiente === 'produccion' ? 'selected' : ''}>Producción (OFICIAL)</option>
              </select>
            </div>
            <div class="config-group">
              <label>Tipo de Emisión</label>
              <select id="sriTipoEmision" class="form-control">
                <option value="normal" ${sri.tipoEmision === 'normal' ? 'selected' : ''}>Normal</option>
                <option value="contingencia" ${sri.tipoEmision === 'contingencia' ? 'selected' : ''}>Contingencia</option>
              </select>
            </div>
            <div class="config-group">
              <label>Reintentos automáticos</label>
              <input type="number" id="sriReintentos" class="form-control" value="${sri.reintentos}" min="0" max="10">
            </div>
            <div class="config-group">
              <label>Timeout envío (segundos)</label>
              <input type="number" id="sriTimeout" class="form-control" value="${sri.timeout}" min="10" max="180">
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Datos del Emisor</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Razón Social *</label>
              <input type="text" id="sriRazonSocial" class="form-control" value="${sri.razonSocial}" placeholder="Nombre legal registrado en el RUC">
            </div>
            <div class="config-group">
              <label>Nombre Comercial</label>
              <input type="text" id="sriNombreComercial" class="form-control" value="${sri.nombreComercial}" placeholder="Nombre comercial">
            </div>
            <div class="config-group">
              <label>RUC *</label>
              <input type="text" id="sriRuc" class="form-control" value="${sri.ruc}" maxlength="13" placeholder="13 dígitos">
            </div>
            <div class="config-group">
              <label>Contribuyente Especial</label>
              <input type="text" id="sriContribuyenteEspecial" class="form-control" value="${sri.contribuyenteEspecial}" placeholder="Número de resolución (opcional)">
            </div>
            <div class="config-group">
              <label>Obligado a llevar contabilidad</label>
              <select id="sriObligadoContabilidad" class="form-control">
                <option value="SI" ${sri.obligadoContabilidad === 'SI' ? 'selected' : ''}>Sí</option>
                <option value="NO" ${sri.obligadoContabilidad === 'NO' ? 'selected' : ''}>No</option>
              </select>
            </div>
            <div class="config-group full-width">
              <label>Dirección Matriz *</label>
              <input type="text" id="sriDireccionMatriz" class="form-control" value="${sri.direccionMatriz}" placeholder="Dirección principal registrada">
            </div>
            <div class="config-group full-width">
              <label>Dirección Establecimiento</label>
              <input type="text" id="sriDireccionSucursal" class="form-control" value="${sri.direccionSucursal}" placeholder="Dirección de emisión">
            </div>
            <div class="config-group">
              <label>Correo de notificación</label>
              <input type="email" id="sriEmailNotificaciones" class="form-control" value="${sri.emailNotificaciones}" placeholder="facturacion@tuempresa.com">
            </div>
            <div class="config-group">
              <label>Teléfono de contacto</label>
              <input type="text" id="sriTelefono" class="form-control" value="${sri.telefono}" placeholder="0999999999">
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Secuenciales autorizados</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Código de establecimiento *</label>
              <input type="text" id="sriEstablecimiento" class="form-control" value="${sri.establecimiento}" maxlength="3" placeholder="Ej. 001">
            </div>
            <div class="config-group">
              <label>Punto de emisión *</label>
              <input type="text" id="sriPuntoEmision" class="form-control" value="${sri.puntoEmision}" maxlength="3" placeholder="Ej. 001">
            </div>
            <div class="config-group">
              <label>Secuencial Factura (siguiente)</label>
              <input type="text" id="sriSecuencialFactura" class="form-control" value="${sri.secuencialFactura}" placeholder="Ej. 101">
            </div>
            <div class="config-group">
              <label>Secuencial Retención</label>
              <input type="text" id="sriSecuencialRetencion" class="form-control" value="${sri.secuencialRetencion}" placeholder="Ej. 1">
            </div>
            <div class="config-group">
              <label>Secuencial Guía de Remisión</label>
              <input type="text" id="sriSecuencialGuia" class="form-control" value="${sri.secuencialGuia}" placeholder="Ej. 1">
            </div>
            <div class="config-group">
              <label>Secuencial Nota de Crédito</label>
              <input type="text" id="sriSecuencialNotaCredito" class="form-control" value="${sri.secuencialNotaCredito}" placeholder="Ej. 1">
            </div>
            <div class="config-group">
              <label>Secuencial Nota de Débito</label>
              <input type="text" id="sriSecuencialNotaDebito" class="form-control" value="${sri.secuencialNotaDebito}" placeholder="Ej. 1">
            </div>
            <div class="config-group">
              <label>Secuencial Liquidación Compras</label>
              <input type="text" id="sriSecuencialLiquidacion" class="form-control" value="${sri.secuencialLiquidacion}" placeholder="Ej. 1">
            </div>
            <div class="config-group">
              <label>Secuencial Proforma</label>
              <input type="text" id="sriSecuencialProforma" class="form-control" value="${sri.secuencialProforma}" placeholder="Ej. 1">
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Certificado Digital (Firma Electrónica)</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Tipo de certificado</label>
              <select id="sriCertificadoTipo" class="form-control">
                <option value="archivo" ${sri.certificadoTipo === 'archivo' ? 'selected' : ''}>Archivo (.p12 / .pfx)</option>
                <option value="token" ${sri.certificadoTipo === 'token' ? 'selected' : ''}>Token USB</option>
              </select>
            </div>
            <div class="config-group">
              <label>Alias (opcional)</label>
              <input type="text" id="sriCertificadoAlias" class="form-control" value="${sri.certificadoAlias}" placeholder="Alias definido en el certificado">
            </div>
            <div class="config-group">
              <label>Clave del certificado *</label>
              <input type="password" id="sriCertificadoClave" class="form-control" value="${sri.certificadoClave}" placeholder="Contraseña del archivo de firma">
            </div>
            <div class="config-group full-width">
              <label>Certificado en base64 (solo si usas archivo)</label>
              <textarea id="sriCertificadoBase64" class="form-control" rows="4" placeholder="Pega aquí el contenido codificado del archivo .p12">${sri.certificadoBase64}</textarea>
              <small>Si tu firma está en archivo, convierte el .p12 a texto base64 y pégalo aquí para que el backend pueda firmar los comprobantes.</small>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Servicios Web del SRI</h4>
          <div class="config-grid">
            <div class="config-group full-width">
              <label>Recepción de Comprobantes</label>
              <input type="url" id="sriRecepcionUrl" class="form-control" value="${recepcionUrl}" data-default="${endpoints.recepcion}" data-custom="${sri.wsRecepcion ? 'true' : 'false'}" data-action="marcarSriInputPersonalizado" data-on-event="input" data-params="this">
            </div>
            <div class="config-group full-width">
              <label>Autorización de Comprobantes</label>
              <input type="url" id="sriAutorizacionUrl" class="form-control" value="${autorizacionUrl}" data-default="${endpoints.autorizacion}" data-custom="${sri.wsAutorizacion ? 'true' : 'false'}" data-action="marcarSriInputPersonalizado" data-on-event="input" data-params="this">
            </div>
            <div class="config-group full-width">
              <label>Consulta de Autorizaciones</label>
              <input type="url" id="sriConsultaUrl" class="form-control" value="${consultaUrl}" data-default="${endpoints.consulta}" data-custom="${sri.wsConsulta ? 'true' : 'false'}" data-action="marcarSriInputPersonalizado" data-on-event="input" data-params="this">
            </div>
          </div>
        </div>

        <div class="config-actions">
          <button class="btn btn-secondary" data-action="probarSri" data-params="">
            <i class="fas fa-plug"></i> Probar conexión
          </button>
          <button class="btn btn-success btn-lg btn-save-config" data-section="sri">
            <i class="fas fa-save"></i> Guardar configuración SRI
          </button>
        </div>
      </div>
    `;
  },

  // ============================================
  // TAB: CONFIGURACIÓN DE BACKUP
  // ============================================
  renderTabBackup(config) {
    return `
      <div class="config-section" id="tab-backup">
        <h3><i class="fas fa-database"></i> Configuración de Backup y Seguridad</h3>
        
        <div class="config-subsection">
          <h4>Backups Automáticos</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Activar Backups Automáticos</label>
              <select id="backupAuto" class="form-control">
                <option value="si" ${config.backup.automatico === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.backup.automatico === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
            <div class="config-group">
              <label>Frecuencia de Backup</label>
              <select id="frecuenciaBackup" class="form-control">
                <option value="diario" ${config.backup.frecuencia === 'diario' ? 'selected' : ''}>Diario</option>
                <option value="semanal" ${config.backup.frecuencia === 'semanal' ? 'selected' : ''}>Semanal</option>
                <option value="mensual" ${config.backup.frecuencia === 'mensual' ? 'selected' : ''}>Mensual</option>
              </select>
            </div>
            <div class="config-group">
              <label>Hora de Backup</label>
              <input type="time" id="horaBackup" class="form-control" value="${config.backup.hora || '02:00'}">
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Retención de Backups</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Número de Backups a Conservar</label>
              <input type="number" id="numeroBackups" class="form-control" value="${config.backup.numeroBackups || 7}" min="1" max="30">
            </div>
            <div class="config-group">
              <label>Eliminar Backups Antiguos Automáticamente</label>
              <select id="eliminarBackupsViejos" class="form-control">
                <option value="si" ${config.backup.eliminarViejos === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.backup.eliminarViejos === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Acciones Rápidas</h4>
          <div class="config-actions-inline">
            <button class="btn btn-primary" data-action="crearBackupManual" data-params="">
              <i class="fas fa-save"></i> Crear Backup Manual
            </button>
            <button class="btn btn-warning" data-action="restaurarBackup" data-params="">
              <i class="fas fa-upload"></i> Restaurar Backup
            </button>
          </div>
        </div>

        <div class="config-actions">
          <button class="btn btn-success btn-lg btn-save-config" data-section="backup">
            <i class="fas fa-save"></i> Guardar Configuración de Backup
          </button>
        </div>
      </div>
    `;
  },

  // ============================================
  // TAB: CONFIGURACIÓN AVANZADA
  // ============================================
  renderTabAvanzado(config) {
    return `
      <div class="config-section" id="tab-avanzado">
        <h3><i class="fas fa-cogs"></i> Configuración Avanzada</h3>
        
        <div class="config-subsection">
          <h4>Regionalización</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Idioma</label>
              <select id="idioma" class="form-control">
                <option value="es" ${config.avanzado.idioma === 'es' ? 'selected' : ''}>Español</option>
                <option value="en" ${config.avanzado.idioma === 'en' ? 'selected' : ''}>English</option>
                <option value="pt" ${config.avanzado.idioma === 'pt' ? 'selected' : ''}>Português</option>
              </select>
            </div>
            <div class="config-group">
              <label>Zona Horaria</label>
              <select id="zonaHoraria" class="form-control">
                <option value="America/Guayaquil" ${config.avanzado.zonaHoraria === 'America/Guayaquil' ? 'selected' : ''}>América/Guayaquil (ECT)</option>
                <option value="America/Bogota" ${config.avanzado.zonaHoraria === 'America/Bogota' ? 'selected' : ''}>América/Bogotá (COT)</option>
                <option value="America/Lima" ${config.avanzado.zonaHoraria === 'America/Lima' ? 'selected' : ''}>América/Lima (PET)</option>
                <option value="America/Mexico_City" ${config.avanzado.zonaHoraria === 'America/Mexico_City' ? 'selected' : ''}>América/Ciudad de México (CST)</option>
              </select>
            </div>
            <div class="config-group">
              <label>Formato de Fecha</label>
              <select id="formatoFecha" class="form-control">
                <option value="DD/MM/YYYY" ${config.avanzado.formatoFecha === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
                <option value="MM/DD/YYYY" ${config.avanzado.formatoFecha === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
                <option value="YYYY-MM-DD" ${config.avanzado.formatoFecha === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Rendimiento</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Modo de Rendimiento</label>
              <select id="modoRendimiento" class="form-control">
                <option value="normal" ${config.avanzado.rendimiento === 'normal' ? 'selected' : ''}>Normal</option>
                <option value="alto" ${config.avanzado.rendimiento === 'alto' ? 'selected' : ''}>Alto Rendimiento</option>
                <option value="bajo" ${config.avanzado.rendimiento === 'bajo' ? 'selected' : ''}>Ahorro de Recursos</option>
              </select>
            </div>
            <div class="config-group">
              <label>Animaciones</label>
              <select id="animaciones" class="form-control">
                <option value="si" ${config.avanzado.animaciones === 'si' ? 'selected' : ''}>Activadas</option>
                <option value="no" ${config.avanzado.animaciones === 'no' ? 'selected' : ''}>Desactivadas</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Seguridad</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Requerir Contraseña para Acciones Críticas</label>
              <select id="contraseñaCritica" class="form-control">
                <option value="si" ${config.avanzado.contraseñaCritica === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.avanzado.contraseñaCritica === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
            <div class="config-group">
              <label>Registrar Actividad de Usuarios</label>
              <select id="registrarActividad" class="form-control">
                <option value="si" ${config.avanzado.registrarActividad === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.avanzado.registrarActividad === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-subsection">
          <h4>Depuración</h4>
          <div class="config-grid">
            <div class="config-group">
              <label>Modo Desarrollador</label>
              <select id="modoDesarrollador" class="form-control">
                <option value="si" ${config.avanzado.modoDesarrollador === 'si' ? 'selected' : ''}>Activado</option>
                <option value="no" ${config.avanzado.modoDesarrollador === 'no' ? 'selected' : ''}>Desactivado</option>
              </select>
            </div>
            <div class="config-group">
              <label>Mostrar Logs en Consola</label>
              <select id="mostrarLogs" class="form-control">
                <option value="si" ${config.avanzado.mostrarLogs === 'si' ? 'selected' : ''}>Sí</option>
                <option value="no" ${config.avanzado.mostrarLogs === 'no' ? 'selected' : ''}>No</option>
              </select>
            </div>
          </div>
        </div>

        <div class="config-actions">
          <button class="btn btn-success btn-lg btn-save-config" data-section="avanzado">
            <i class="fas fa-save"></i> Guardar Configuración Avanzada
          </button>
        </div>
      </div>
    `;
  },

  // ============================================
  // TAB: CONFIGURACIÓN DE INTELIGENCIA ARTIFICIAL
  // ============================================
  renderTabIA() {
    // Usar el panel unificado de IA
    if (window.IAConfigPanel) {
      return `
        <div class="config-section active" id="tab-ia">
          ${IAConfigPanel.render()}
        </div>
      `;
    }

    // Fallback si el panel no está disponible
    return `
      <div class="config-section active" id="tab-ia">
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i>
          <strong>Error:</strong> El panel de configuración de IA no está disponible.
          Por favor, recarga la página.
        </div>
      </div>
    `;
  },

  // ============================================
  // MÉTODOS PARA PLANTILLAS DE MARGEN Y DESCUENTOS
  // ============================================

  renderMarginTemplates(config) {
    const templates = config.ventas?.marginTemplates ||
      window.PricingConfig?.marginTemplates || [
        {
          id: 'retail_plus',
          label: 'Cliente final',
          margin: 35,
          description: 'Margen estándar para mostrador',
        },
        {
          id: 'retail_base',
          label: 'Retail liviano',
          margin: 30,
          description: 'Promociones o productos de rotación media',
        },
        {
          id: 'mayorista',
          label: 'Mayorista',
          margin: 20,
          description: 'Distribuidores y clientes con volumen',
        },
        {
          id: 'corporativo',
          label: 'Corporativo',
          margin: 25,
          description: 'Empresas con convenios',
        },
      ];

    if (!templates.length) {
      return '<p class="text-muted">No hay plantillas configuradas. Agrega una nueva.</p>';
    }

    return `
      <div class="pricing-templates-list">
        ${templates
          .map(
            (tpl, idx) => `
          <div class="pricing-template-item" data-index="${idx}">
            <div class="pricing-template-row">
              <div class="pricing-template-field">
                <label>Nombre</label>
                <input type="text" class="form-control form-control-sm" name="marginTemplateLabel" value="${this.escapeHtml(tpl.label || '')}" placeholder="Ej: Cliente VIP">
              </div>
              <div class="pricing-template-field" style="width:100px;">
                <label>Margen %</label>
                <input type="number" class="form-control form-control-sm" name="marginTemplateMargin" value="${tpl.margin || 30}" min="0" max="500" step="0.5">
              </div>
              <div class="pricing-template-field" style="flex:2;">
                <label>Descripción</label>
                <input type="text" class="form-control form-control-sm" name="marginTemplateDesc" value="${this.escapeHtml(tpl.description || '')}" placeholder="Descripción opcional">
              </div>
              <div class="pricing-template-actions">
                <button type="button" class="btn btn-sm btn-danger btn-remove-margin-template" title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
      <style>
        .pricing-templates-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .pricing-template-item { background: var(--bg-tertiary, #f8f9fa); border: 1px solid var(--border-color, #dee2e6); border-radius: 8px; padding: 0.75rem; }
        .pricing-template-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
        .pricing-template-field { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; min-width: 120px; }
        .pricing-template-field label { font-size: 0.75rem; color: var(--text-secondary); font-weight: 500; }
        .pricing-template-actions { display: flex; align-items: flex-end; }
        .discount-codes-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .discount-code-item { background: var(--bg-tertiary, #f8f9fa); border: 1px solid var(--border-color, #dee2e6); border-radius: 8px; padding: 0.75rem; }
        .discount-code-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
        .discount-code-field { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; min-width: 100px; }
        .discount-code-field label { font-size: 0.75rem; color: var(--text-secondary); font-weight: 500; }
        .discount-code-actions { display: flex; align-items: flex-end; }
        .config-help-text { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; }
      </style>
    `;
  },

  renderDiscountCodes(config) {
    const codes = config.ventas?.discountCodes ||
      window.PricingConfig?.discountCodes || [
        { code: 'VIP15', label: 'VIP 15%', discountPercent: 15 },
        { code: 'FAMILIA10', label: 'Familia 10%', discountPercent: 10 },
        {
          code: 'STAFF20',
          label: 'Staff interno 20%',
          discountPercent: 20,
          restrictTo: 'empleados',
        },
      ];

    if (!codes.length) {
      return '<p class="text-muted">No hay códigos de descuento configurados. Agrega uno nuevo.</p>';
    }

    return `
      <div class="discount-codes-list">
        ${codes
          .map(
            (dc, idx) => `
          <div class="discount-code-item" data-index="${idx}">
            <div class="discount-code-row">
              <div class="discount-code-field" style="width:120px;">
                <label>Código</label>
                <input type="text" class="form-control form-control-sm" name="discountCode" value="${this.escapeHtml(dc.code || '')}" placeholder="Ej: VIP20" style="text-transform:uppercase;">
              </div>
              <div class="discount-code-field">
                <label>Etiqueta</label>
                <input type="text" class="form-control form-control-sm" name="discountLabel" value="${this.escapeHtml(dc.label || '')}" placeholder="Ej: Descuento VIP">
              </div>
              <div class="discount-code-field" style="width:100px;">
                <label>Descuento %</label>
                <input type="number" class="form-control form-control-sm" name="discountPercent" value="${dc.discountPercent || 10}" min="0" max="100" step="0.5">
              </div>
              <div class="discount-code-field">
                <label>Restringido a</label>
                <select class="form-control form-control-sm" name="discountRestrictTo">
                  <option value="" ${!dc.restrictTo ? 'selected' : ''}>Todos los clientes</option>
                  <option value="empleados" ${dc.restrictTo === 'empleados' ? 'selected' : ''}>Solo empleados</option>
                  <option value="mayoristas" ${dc.restrictTo === 'mayoristas' ? 'selected' : ''}>Solo mayoristas</option>
                  <option value="vip" ${dc.restrictTo === 'vip' ? 'selected' : ''}>Clientes VIP</option>
                </select>
              </div>
              <div class="discount-code-actions">
                <button type="button" class="btn btn-sm btn-danger btn-remove-discount-code" title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  },

  escapeHtml(text) {
    if (!text) return '';
    return text
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  toggleProviderConfig(provider) {
    document.querySelectorAll('.provider-config').forEach((el) => (el.style.display = 'none'));
    if (provider !== 'local') {
      const configEl = document.getElementById(`config-${provider}`);
      if (configEl) configEl.style.display = 'block';
    }
  },

  normalizarProveedorIA(provider) {
    const mapa = {
      google_gemini: 'gemini',
      gemini: 'gemini',
      deepseek: 'deepseek',
      openai: 'openai',
      lm_studio: 'lmstudio',
      lmstudio: 'lmstudio',
    };
    return mapa[provider] || 'openai';
  },

  toggleProviderFields(provider) {
    const normalizado = this.normalizarProveedorIA(provider);

    if (window.IAConfigPanel) {
      const card = document.querySelector(`.provider-card[data-provider="${normalizado}"]`);
      if (card) {
        if (!card.classList.contains('selected')) {
          card.click();
        } else if (typeof IAConfigPanel.renderProviderConfig === 'function') {
          const configDiv = document.getElementById('providerConfig');
          if (configDiv) {
            configDiv.innerHTML = IAConfigPanel.renderProviderConfig(normalizado);
          }
        }
      } else {
        IAUnifiedEngine.config.provider = normalizado;
        IAUnifiedEngine.currentProvider = normalizado;
      }
      return;
    }

    if (typeof this.toggleProviderConfig === 'function') {
      this.toggleProviderConfig(normalizado);
    }
  },

  async discoverAndTestModels(provider) {
    const apiKey = document.getElementById(`${provider}ApiKey`).value;
    const modelSelect = document.getElementById(`${provider}Model`);
    const verifyButton = document.querySelector(`#config-${provider} button`);
    modelSelect.innerHTML = '<option>Verificando...</option>';
    verifyButton.disabled = true;

    try {
      let url, headers;
      if (provider === 'google_gemini') {
        // Usar endpoint consistente v1beta
        url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
        headers = {};
      } else {
        const apiUrl =
          provider === 'lm_studio'
            ? document.getElementById('iaApiUrl').value
            : 'https://api.deepseek.com/v1';
        url = `${apiUrl}/models`;
        headers = { Authorization: `Bearer ${apiKey}` };
      }

      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`Error de red: ${response.statusText}`);

      const data = await response.json();
      const models =
        provider === 'google_gemini'
          ? data.models
              .filter((m) => m.supportedGenerationMethods.includes('generateContent'))
              .map((m) => m.name.replace('models/', ''))
          : data.data.map((m) => m.id);

      if (!models || models.length === 0) {
        modelSelect.innerHTML = '<option>No se encontraron modelos</option>';
        throw new Error(`No se encontraron modelos para ${provider}.`);
      }

      this.loadModels(provider, null, models);
      const modelToTest =
        models.find((m) => m.includes('pro')) ||
        models.find((m) => m.includes('chat')) ||
        models[0];

      await new Promise((resolve) => setTimeout(resolve, 500));
      await this.testModel(provider, modelToTest, apiKey);
      Utils.showToast(`¡Éxito! Modelos de ${provider} cargados y probados.`, 'success');
    } catch (e) {
      console.error(`Error descubriendo modelos de ${provider}:`, e);
      modelSelect.innerHTML = '<option>Error al verificar</option>';
      Utils.showToast(e.message || `Error al verificar la API key de ${provider}.`, 'danger');
    } finally {
      verifyButton.disabled = false;
    }
  },

  async testModel(provider, model, apiKey) {
    try {
      const testPrompt = 'Hola';
      let url, body, headers;

      if (provider === 'google_gemini') {
        // Usar endpoint consistente v1beta con API key codificada
        url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        body = { contents: [{ parts: [{ text: testPrompt }] }] };
        headers = { 'Content-Type': 'application/json' };
      } else {
        const apiUrl =
          provider === 'lm_studio'
            ? document.getElementById('iaApiUrl').value
            : 'https://api.deepseek.com/v1';
        url = `${apiUrl}/chat/completions`;
        body = { model, messages: [{ role: 'user', content: testPrompt }], max_tokens: 5 };
        headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
      }

      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (response.status === 429)
        throw new Error('Demasiadas solicitudes a la IA. Espera un momento.');
      if (!response.ok)
        throw new Error(`La prueba del modelo ${model} falló (código: ${response.status})`);
      return true;
    } catch (e) {
      console.error(`Error probando modelo ${model}:`, e);
      throw e;
    }
  },

  loadModels(provider, selectedModel, models) {
    const modelSelect = document.getElementById(`${provider}Model`);
    if (models) {
      modelSelect.innerHTML = models
        .map((m) => `<option value="${m}" ${m === selectedModel ? 'selected' : ''}>${m}</option>`)
        .join('');
    }
  },

  async guardarIA(options = {}) {
    const useUnifiedPanel = options?.source === 'panel' || !document.getElementById('iaProveedor');

    const auth = window.Auth;
    const canManageSettings =
      auth &&
      ((typeof auth.isSuperAdmin === 'function' && auth.isSuperAdmin()) ||
        (typeof auth.isAdmin === 'function' && auth.isAdmin()));

    if (!canManageSettings) {
      if (window.Utils && typeof Utils.showToast === 'function') {
        Utils.showToast('No tienes permisos para actualizar la configuración de IA.', 'error');
      }
      return;
    }

    let providerId = 'openai';
    let apiKey = '';
    let model = '';
    let baseURL = '';

    if (useUnifiedPanel && window.IAUnifiedEngine) {
      const engineConfig = IAUnifiedEngine.config || {};
      providerId = engineConfig.provider || 'openai';
      apiKey = engineConfig.apiKey || '';
      model = engineConfig.model || '';
      baseURL = engineConfig.baseURL || '';
    } else {
      const providerSelect = document.getElementById('iaProveedor');
      if (!providerSelect) {
        Utils.showToast('No se encontró el panel de configuración de IA para guardar.', 'warning');
        return;
      }

      providerId = providerSelect.value || 'google_gemini';
      apiKey =
        document.getElementById('geminiApiKey')?.value ||
        document.getElementById('deepseekApiKey')?.value ||
        document.getElementById('lm_studioApiKey')?.value ||
        '';
      model =
        document.getElementById('google_geminiModel')?.value ||
        document.getElementById('deepseekModel')?.value ||
        document.getElementById('lm_studioModel')?.value ||
        '';
      baseURL = document.getElementById('iaApiUrl')?.value || '';
    }

    const normalizeProvider = (value) => {
      const map = {
        google_gemini: 'gemini',
        gemini: 'gemini',
        deepseek: 'deepseek',
        openai: 'openai',
        lmstudio: 'lmstudio',
        lm_studio: 'lmstudio',
      };
      return map[value] || value || 'openai';
    };

    const provider = normalizeProvider(providerId);

    const storageMatrix = {
      gemini: {
        providerValue: 'google_gemini',
        apiKeyKey: 'ia_gemini_api_key',
        modelKey: 'ia_gemini_model',
        extra: [
          { key: 'ia_facturas_gemini_apikey', value: apiKey },
          { key: 'ia_facturas_gemini_model', value: model },
        ],
      },
      deepseek: {
        providerValue: 'deepseek',
        apiKeyKey: 'ia_deepseek_api_key',
        modelKey: 'ia_deepseek_model',
      },
      openai: {
        providerValue: 'openai',
        apiKeyKey: 'ia_openai_api_key',
        modelKey: 'ia_openai_model',
      },
      lmstudio: {
        providerValue: 'lm_studio',
        apiKeyKey: 'ia_lmstudio_api_key',
        modelKey: 'ia_lmstudio_model',
        urlKey: 'ia_lmstudio_url',
      },
    };

    const mapping = storageMatrix[provider] || { providerValue: provider };

    // Guardar configuración con alcance por tienda
    this.setScopedValue('ia_proveedor', mapping.providerValue || provider);
    this.setScopedValue('ia_model', model || '');

    if (mapping.apiKeyKey) {
      this.setScopedValue(mapping.apiKeyKey, apiKey || '');
    }

    if (mapping.modelKey) {
      this.setScopedValue(mapping.modelKey, model || '');
    }

    if (mapping.urlKey) {
      this.setScopedValue(mapping.urlKey, baseURL || '');
    }

    if (Array.isArray(mapping.extra)) {
      mapping.extra.forEach((entry) => {
        this.setScopedValue(entry.key, entry.value || '');
      });
    }

    if (window.IAUnifiedEngine) {
      try {
        IAUnifiedEngine.config.provider = provider;
        IAUnifiedEngine.currentProvider = provider;
        IAUnifiedEngine.config.apiKey = apiKey || IAUnifiedEngine.config.apiKey;
        IAUnifiedEngine.config.model = model || IAUnifiedEngine.config.model;
        if (provider === 'lmstudio') {
          IAUnifiedEngine.config.baseURL = baseURL || IAUnifiedEngine.config.baseURL;
        }
        if (options?.source !== 'panel') {
          await IAUnifiedEngine.saveConfig();
        }
      } catch (error) {
        console.warn(
          'No se pudo sincronizar el motor unificado de IA con la configuración guardada.',
          error
        );
      }
    }

    // Mantener consistencia con la configuración local (para renderizado)
    const localConfig = this.obtenerConfiguracion();
    if (!localConfig.publicidad) {
      localConfig.publicidad = { ia: {} };
    }
    const iaConfig = localConfig.publicidad.ia;
    iaConfig.proveedor = mapping.providerValue || provider;
    iaConfig.geminiApiKey = provider === 'gemini' ? apiKey : iaConfig.geminiApiKey;
    iaConfig.deepseekApiKey = provider === 'deepseek' ? apiKey : iaConfig.deepseekApiKey;
    iaConfig.llmstudioApiKey = provider === 'lmstudio' ? apiKey : iaConfig.llmstudioApiKey;
    iaConfig.llmstudioUrl = provider === 'lmstudio' ? baseURL : iaConfig.llmstudioUrl;
    Database.set(this.STORAGE_KEY, localConfig);

    // Guardar en la base de datos global (super admin)
    const temperature = window.IAUnifiedEngine?.config?.temperature ?? 0.7;
    const maxTokens = window.IAUnifiedEngine?.config?.maxTokens ?? 2000;

    try {
      const payload = {
        provider,
        apiKey,
        model,
        temperature,
        maxTokens,
      };

      if (provider === 'lmstudio' && baseURL) {
        payload.baseURL = baseURL;
      }

      await Auth._request('/admin/ia/config', {
        method: 'POST',
        body: payload,
      });
      Utils.showToast('Configuración de IA guardada correctamente.', 'success');
    } catch (error) {
      console.error('Error guardando configuración de IA:', error);
      Utils.showToast(`Error al guardar: ${error.message || 'No se pudo guardar'}`, 'error');
    }
  },

  // ============================================
  // CAMBIAR ENTRE TABS
  // ============================================
  cambiarTab(tabName) {
    // Actualizar navegación
    document.querySelectorAll('.config-nav-item').forEach((tab) => tab.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    // Actualizar título de sección
    const titleMap = {
      general: 'Configuración General',
      ventas: 'Ventas y POS',
      inventario: 'Inventario y Stock',
      publicidad: 'Publicidad y Marketing',
      usuarios: 'Usuarios y Permisos',
      notificaciones: 'Notificaciones',
      visual: 'Apariencia y Temas',
      reportes: 'Reportes y Exportación',
      telegram: 'Integración Telegram',
      sri: 'Facturación Electrónica SRI',
      ia: 'Inteligencia Artificial',
      backup: 'Copias de Seguridad',
      avanzado: 'Opciones Avanzadas',
    };

    const titleEl = document.getElementById('configSectionTitle');
    if (titleEl) {
      titleEl.textContent = titleMap[tabName] || 'Configuración';
    }

    const configContent = document.getElementById('configContent');
    if (!configContent) {
      console.warn(
        '⚠️ Contenedor de configuración no encontrado. ¿Se cargó el panel correctamente?'
      );
      return;
    }
    configContent.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>'; // Indicador de carga

    const config = this.obtenerConfiguracion();
    let content = '';

    switch (tabName) {
      case 'general':
        content = this.renderTabGeneral(config);
        break;
      case 'ventas':
        content = this.renderTabVentas(config);
        break;
      case 'inventario':
        content = this.renderTabInventario(config);
        break;
      case 'publicidad':
        content = this.renderTabPublicidad(config);
        break;
      case 'usuarios':
        content = this.renderTabUsuarios(config);
        break;
      case 'notificaciones':
        content = this.renderTabNotificaciones(config);
        break;
      case 'visual':
        content = this.renderTabVisual(config);
        break;
      case 'reportes':
        content = this.renderTabReportes(config);
        break;
      case 'telegram':
        content = this.renderTabTelegram(config);
        break;
      case 'sri':
        content = this.renderTabSri(config);
        break;
      case 'ia':
        content = this.renderTabIA(config);
        break;
      case 'backup':
        content = this.renderTabBackup(config);
        break;
      case 'avanzado':
        content = this.renderTabAvanzado(config);
        break;
      default:
        content = this.renderTabGeneral(config);
    }

    configContent.innerHTML = content;

    if (
      tabName === 'ia' &&
      window.IAConfigPanel &&
      typeof IAConfigPanel.attachListeners === 'function'
    ) {
      const iaContainer = configContent.querySelector('#tab-ia') || configContent;
      IAConfigPanel.attachListeners(iaContainer);
    } else if (window.IAConfigPanel && typeof IAConfigPanel.detachListeners === 'function') {
      IAConfigPanel.detachListeners();
    }

    // Post-renderizado para tabs específicas
    if (tabName === 'ia') {
      this.toggleProviderFields(config.ia?.provider || 'google_gemini');
    }
    if (tabName === 'publicidad') {
      const providerSeleccionado = config?.publicidad?.ia?.proveedor || 'gemini';
      this.toggleProviderIA(providerSeleccionado);
    }
    if (tabName === 'telegram') {
      // Verificar estado del bot si hay token configurado
      this.verificarEstadoBotTelegram(config);
    }

    // Configurar listeners específicos del contenido del tab (botones de guardar, etc.)
    this.setupTabContentListeners();
  },

  // ============================================
  // VERIFICAR ESTADO DEL BOT DE TELEGRAM
  // ============================================
  async verificarEstadoBotTelegram(config) {
    const statusPanel = document.getElementById('telegramBotStatus');
    const statusText = document.getElementById('telegramStatusText');
    const quickAccessPanel = document.getElementById('telegramBotQuickAccess');
    
    if (!statusPanel || !statusText) return;
    
    // Si hay info del bot guardada, mostrarla
    if (config.telegram?.botInfo?.username) {
      statusPanel.className = 'telegram-bot-status status-success';
      statusText.innerHTML = `<i class="fas fa-check-circle"></i> Conectado: @${config.telegram.botInfo.username}`;
      
      // Mostrar panel de acceso rápido
      if (quickAccessPanel) {
        quickAccessPanel.style.display = 'block';
        const botNameEl = document.getElementById('telegramBotName');
        const botLinkEl = document.getElementById('telegramBotLink');
        
        if (botNameEl) botNameEl.textContent = `@${config.telegram.botInfo.username}`;
        if (botLinkEl) botLinkEl.href = `https://t.me/${config.telegram.botInfo.username}`;
      }
      return;
    }
    
    // Si hay token pero no info del bot, verificar automáticamente
    if (config.telegram?.botToken) {
      statusPanel.className = 'telegram-bot-status status-checking';
      statusText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando bot...';
      
      if (window.TelegramNotificaciones) {
        const backup = TelegramNotificaciones.config.botToken;
        TelegramNotificaciones.config.botToken = config.telegram.botToken;
        
        try {
          const resultado = await TelegramNotificaciones.probarConexion();
          
          if (resultado.exito) {
            statusPanel.className = 'telegram-bot-status status-success';
            statusText.innerHTML = `<i class="fas fa-check-circle"></i> Conectado: @${resultado.botInfo.username}`;
            
            // Mostrar panel de acceso rápido
            if (quickAccessPanel) {
              quickAccessPanel.style.display = 'block';
              const botNameEl = document.getElementById('telegramBotName');
              const botLinkEl = document.getElementById('telegramBotLink');
              
              if (botNameEl) botNameEl.textContent = `@${resultado.botInfo.username}`;
              if (botLinkEl) botLinkEl.href = `https://t.me/${resultado.botInfo.username}`;
            }
            
            // Guardar info del bot
            const configActual = this.obtenerConfiguracion(true);
            configActual.telegram.botInfo = {
              id: resultado.botInfo.id,
              username: resultado.botInfo.username,
              firstName: resultado.botInfo.first_name,
              verificadoEn: new Date().toISOString()
            };
            Database.set(this.STORAGE_KEY, configActual);
          } else {
            statusPanel.className = 'telegram-bot-status status-error';
            statusText.innerHTML = `<i class="fas fa-exclamation-circle"></i> Token inválido`;
          }
        } catch (error) {
          statusPanel.className = 'telegram-bot-status status-error';
          statusText.innerHTML = `<i class="fas fa-exclamation-circle"></i> Error de conexión`;
        }
        
        TelegramNotificaciones.config.botToken = backup;
      }
    } else {
      // No hay token configurado
      statusPanel.className = 'telegram-bot-status';
      statusText.textContent = 'No configurado';
    }

    // Actualizar estado del Telegram IA Assistant
    this.actualizarEstadoTelegramIA();
  },

  // ============================================
  // OBTENER CONFIGURACIÓN ACTUAL
  // ============================================
  obtenerConfiguracion(silent = false) {
    const negocioActual = Database.getCurrentBusiness();
    if (!silent) {
      console.log(`📖 Cargando configuración para negocio: ${negocioActual}`);
    }

    const configGuardada = Database.get(this.STORAGE_KEY);
    if (configGuardada) {
      if (!silent) {
        console.log(`✅ Configuración cargada para negocio: ${negocioActual}`);
      }
      const defaults = this.obtenerConfiguracionDefecto();
      configGuardada.general = { ...defaults.general, ...(configGuardada.general || {}) };
      if (!configGuardada.visual) {
        configGuardada.visual = { tema: 'auto' };
      }
      const normalizedTheme = this.mapThemeValue(configGuardada.visual.tema);
      if (configGuardada.visual.tema !== normalizedTheme) {
        configGuardada.visual.tema = normalizedTheme;
        Database.set(this.STORAGE_KEY, configGuardada);
      }
      configGuardada.sri = this.normalizarSriConfig(configGuardada.sri);
      return configGuardada;
    }

    console.log(
      `ℹ️ No hay configuración guardada para negocio ${negocioActual}, usando valores por defecto`
    );
    return this.obtenerConfiguracionDefecto();
  },

  // ============================================
  // CONFIGURACIÓN POR DEFECTO
  // ============================================
  obtenerConfiguracionDefecto() {
    return {
      general: {
        nombreNegocio: 'Mi Tienda',
        razonSocial: 'Mi Tienda',
        nombreComercial: 'Mi Tienda',
        tipoNegocio: 'abarrotes',
        ruc: '',
        contribuyenteEspecial: '',
        obligadoContabilidad: 'NO',
        regimenTributario: '',
        numeroResolucion: '',
        telefono: '',
        email: '',
        sitioWeb: '',
        direccionMatriz: '',
        direccionSucursal: '',
        direccion: '',
        ciudad: 'Quito',
        pais: 'Ecuador',
        codigoPostal: '',
        moneda: 'USD',
        descripcion: '',
      },
      ventas: {
        ivaPrincipal: 15,
        ivaReducido: 0,
        aplicarIvaDefecto: 'si',
        metodoPago: {
          efectivo: true,
          tarjeta: true,
          transferencia: true,
          credito: true,
        },
        descuentoMaximo: 50,
        descuentoAutorizacion: 20,
        descuentoPromo: 'no',
        tamañoPapel: '80mm',
        mostrarLogo: 'si',
        imprimirAuto: 'no',
        mensajeTicket: '¡Gracias por su compra!',
        solicitarCliente: 'opcional',
        redondeoTotal: 'ninguno',
      },
      inventario: {
        stockMinimo: 10,
        stockCritico: 5,
        stockNegativo: 'no',
        notificarStockBajo: 'si',
        notificarVencimiento: 'si',
        diasVencimiento: 30,
        controlarLotes: 'no',
        metodoSalida: 'fifo',
        solicitarProveedor: 'opcional',
        diasPagoProveedor: 30,
      },
      publicidad: {
        redes: {
          facebook: true,
          instagram: true,
          twitter: false,
          tiktok: false,
          whatsapp: true,
        },
        ia: {
          proveedor: 'local',
          geminiApiKey: '',
          deepseekApiKey: '',
          llmstudioUrl: 'http://localhost:1234/v1',
        },
        frecuencia: 'semanal',
        horaPublicacion: '09:00',
        enlaces: {
          facebook: '',
          instagram: '',
          whatsapp: '',
        },
      },
      usuarios: {
        tiempoInactividad: 60,
        multiplesSesiones: 'si',
      },
      notificaciones: {
        ventas: true,
        stockBajo: true,
        vencimiento: true,
        pagos: true,
        recordatorios: true,
        canales: {
          sistema: true,
          email: false,
          sonido: true,
        },
        horario: {
          inicio: '08:00',
          fin: '20:00',
        },
      },
      telegram: {
        activo: false,
        botToken: '',
        chatIds: [],
        chatInfo: {}, // Información adicional de cada chat (nombre, tipo, username)
        enviarStockBajo: true,
        enviarProductosVencer: true,
        enviarVentas: false,
        enviarPagos: true,
        enviarRecordatorios: true,
        stockBajoDiario: true,
        horaResumenDiario: '08:00',
      },
      sri: {
        habilitado: false,
        ambiente: 'pruebas',
        tipoEmision: 'normal',
        razonSocial: '',
        nombreComercial: '',
        ruc: '',
        contribuyenteEspecial: '',
        obligadoContabilidad: 'NO',
        direccionMatriz: '',
        direccionSucursal: '',
        emailNotificaciones: '',
        telefono: '',
        establecimiento: '001',
        puntoEmision: '001',
        secuencialFactura: '1',
        secuencialRetencion: '1',
        secuencialGuia: '1',
        secuencialNotaCredito: '1',
        secuencialNotaDebito: '1',
        secuencialLiquidacion: '1',
        secuencialProforma: '1',
        certificadoTipo: 'archivo',
        certificadoAlias: '',
        certificadoBase64: '',
        certificadoClave: '',
        wsRecepcion: '',
        wsAutorizacion: '',
        wsConsulta: '',
        reintentos: 3,
        timeout: 60,
        ultimoHandshake: null,
      },
      visual: {
        tema: 'auto',
        colorPrincipal: '#6366f1',
        logoUrl: '',
        mostrarLogoSidebar: 'no',
        tamañoFuente: 'normal',
      },
      reportes: {
        formato: 'pdf',
        incluirLogo: 'si',
        campos: {
          precios: true,
          costos: true,
          margenes: true,
          proveedores: true,
        },
        automatico: {
          diario: 'no',
          semanal: 'no',
          mensual: 'no',
        },
      },
      backup: {
        automatico: 'si',
        frecuencia: 'diario',
        hora: '02:00',
        numeroBackups: 7,
        eliminarViejos: 'si',
      },
      avanzado: {
        idioma: 'es',
        zonaHoraria: 'America/Guayaquil',
        formatoFecha: 'DD/MM/YYYY',
        rendimiento: 'normal',
        animaciones: 'si',
        contraseñaCritica: 'no',
        registrarActividad: 'si',
        modoDesarrollador: 'no',
        mostrarLogs: 'no',
      },
    };
  },

  // ============================================
  // GUARDAR CONFIGURACIONES
  // ============================================
  guardarGeneral() {
    const config = this.obtenerConfiguracion();
    const getValue = (id) => document.getElementById(id)?.value?.trim() || '';

    const requiredFields = [
      { id: 'razonSocial', label: 'Razón Social' },
      { id: 'rucNegocio', label: 'RUC' },
      { id: 'direccionMatriz', label: 'Dirección matriz' },
      { id: 'nombreNegocio', label: 'Nombre interno del negocio' },
    ];

    for (const field of requiredFields) {
      if (!getValue(field.id)) {
        Utils.showToast(`El campo "${field.label}" es obligatorio.`, 'error');
        document.getElementById(field.id)?.focus();
        return;
      }
    }

    const rucValue = getValue('rucNegocio');
    if (rucValue && !/^\d{13}$/.test(rucValue)) {
      Utils.showToast('El RUC debe contener exactamente 13 dígitos.', 'error');
      document.getElementById('rucNegocio')?.focus();
      return;
    }

    const obligado =
      (document.getElementById('obligadoContabilidadGeneral')?.value || 'NO').toUpperCase() === 'SI'
        ? 'SI'
        : 'NO';
    const tipoNegocioSeleccionado = document.getElementById('tipoNegocio')?.value || 'otro';
    const tipoNegocio = this.normalizarTipoNegocio(tipoNegocioSeleccionado);

    config.general = {
      nombreNegocio: getValue('nombreNegocio'),
      razonSocial: getValue('razonSocial') || getValue('nombreNegocio'),
      nombreComercial: getValue('nombreComercial') || getValue('nombreNegocio'),
      icono: getValue('iconoNegocio') || '🏪',
      tipoNegocio,
      ruc: rucValue,
      contribuyenteEspecial: getValue('contribuyenteEspecial'),
      obligadoContabilidad: obligado,
      regimenTributario: getValue('regimenTributario'),
      numeroResolucion: getValue('numeroResolucion'),
      telefono: getValue('telefonoNegocio'),
      email: document.getElementById('emailNegocio')?.value?.trim() || '',
      sitioWeb: document.getElementById('webNegocio')?.value?.trim() || '',
      direccionMatriz: getValue('direccionMatriz'),
      direccionSucursal: getValue('direccionSucursal'),
      direccion: getValue('direccionMatriz'),
      ciudad: getValue('ciudadNegocio'),
      pais: document.getElementById('paisNegocio')?.value || 'Ecuador',
      codigoPostal: getValue('codigoPostal'),
      moneda: document.getElementById('moneda')?.value || 'USD',
      descripcion: document.getElementById('descripcionNegocio')?.value?.trim() || '',
    };

    // Usar función helper con callbacks de sincronización
    return this._guardarSeccion('general', config, {
      syncCallback: (cfg) => {
        // Sincronizar con otras configuraciones del sistema
        this.sincronizarConfiguracionesPrincipales(cfg.general);

        // Guardar configuración completa en el backend (tabla negocios)
        this.sincronizarConfiguracionConBackend(cfg)
          .then(() => {
            console.log('✅ Configuración sincronizada con backend');
          })
          .catch((error) => {
            console.warn('⚠️ No se pudo sincronizar con backend:', error);
          });
      },
    });
  },

  async sincronizarConfiguracionConBackend(configCompleto) {
    try {
      const session = Auth.getSession();
      const negocioId =
        (typeof Auth.getCurrentBusinessId === 'function' && Auth.getCurrentBusinessId()) ||
        session?.negocioId ||
        null;

      if (!negocioId) {
        console.warn('No hay negocio activo para sincronizar');
        return;
      }
      const configuracion = configCompleto || this.obtenerConfiguracion();
      const general = configuracion.general || {};
      const sri = configuracion.sri || {};

      const nombreBase = (
        general.nombreNegocio ||
        general.nombreComercial ||
        general.razonSocial ||
        sri.razonSocial ||
        'Mi Tienda'
      ).trim();
      const nombreComercial = (general.nombreComercial || sri.nombreComercial || nombreBase).trim();
      const razonSocial = (general.razonSocial || sri.razonSocial || nombreComercial).trim();
      const ruc = (general.ruc || sri.ruc || '').trim();
      const direccionMatriz = (
        general.direccionMatriz ||
        general.direccion ||
        sri.direccionMatriz ||
        ''
      ).trim();
      const direccionSucursal = (general.direccionSucursal || sri.direccionSucursal || '').trim();
      const telefono = (general.telefono || sri.telefono || '').trim();
      const email = (general.email || sri.emailNotificaciones || '').trim();
      const obligadoRaw = (general.obligadoContabilidad || sri.obligadoContabilidad || 'NO')
        .toString()
        .toUpperCase();
      const obligadoBoolean = ['SI', 'TRUE', '1'].includes(obligadoRaw);
      const establecimiento = (sri.establecimiento || '001').trim();
      const puntoEmision = (sri.puntoEmision || '001').trim();

      const payload = {
        nombre: nombreBase,
        nombreComercial,
        tipo: this.mapearTipoNegocioParaBackend(general.tipoNegocio),
        icono: general.icono || '🏪',
        descripcion: general.descripcion || `${razonSocial} - ${direccionMatriz}`.trim(),
        razonSocial,
        ruc,
        direccion: direccionMatriz,
        direccionMatriz,
        direccionSucursal,
        telefono,
        email,
        obligadoContabilidad: obligadoBoolean,
        contribuyenteEspecial: general.contribuyenteEspecial || '',
        regimenTributario: general.regimenTributario || '',
        numeroResolucion: general.numeroResolucion || '',
        establecimiento,
        puntoEmision,
        configTienda: {
          nombre: nombreComercial,
          razonSocial,
          ruc,
          direccion: direccionMatriz,
          telefono,
          email,
          establecimiento,
          puntoEmision,
          obligadoContabilidad: obligadoBoolean,
        },
      };

      if (general.sitioWeb) {
        payload.sitioWeb = general.sitioWeb;
      }
      if (sri.emailNotificaciones) {
        payload.emailNotificaciones = sri.emailNotificaciones;
      }

      const response = await Auth._request(`/negocios/${negocioId}`, {
        method: 'PUT',
        negocioId,
        body: payload,
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Sincronización rechazada por el backend');
      }

      console.log('✅ Configuración sincronizada con backend correctamente');
    } catch (error) {
      console.error('❌ Error sincronizando configuración con backend:', error);
      throw error;
    }
  },

  mapearTipoNegocioParaBackend(tipoLocal) {
    // Mapear los tipos locales a los tipos que espera el backend
    const mapeo = {
      tienda_general: 'general',
      abarrotes: 'general',
      electronica: 'general',
      ropa: 'general',
      ferreteria: 'ferreteria',
      farmacia: 'farmacia',
      libreria: 'general',
      restaurante: 'restaurante',
      mecanica_automotriz: 'mecanica',
      personalizado: 'personalizado',
      otro: 'personalizado',
    };

    return mapeo[tipoLocal] || 'general';
  },

  async guardarIconoBackend(icono) {
    try {
      const response = await Auth._request('/negocios/icono', {
        method: 'PUT',
        body: JSON.stringify({ icono }),
      });

      if (response.success) {
        console.log('✅ Icono guardado en backend:', icono);
      }
    } catch (error) {
      console.error('Error guardando icono en backend:', error);
      // No mostramos error al usuario ya que se guardó localmente
    }
  },

  guardarVentas() {
    const config = this.obtenerConfiguracion();

    // Recopilar plantillas de margen
    const marginTemplates = [];
    document.querySelectorAll('.pricing-template-item').forEach((item) => {
      const label = item.querySelector('[name="marginTemplateLabel"]')?.value?.trim() || '';
      const margin = parseFloat(item.querySelector('[name="marginTemplateMargin"]')?.value) || 30;
      const description = item.querySelector('[name="marginTemplateDesc"]')?.value?.trim() || '';
      if (label) {
        const id = label
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');
        marginTemplates.push({ id, label, margin, description });
      }
    });

    // Recopilar códigos de descuento
    const discountCodes = [];
    document.querySelectorAll('.discount-code-item').forEach((item) => {
      const code = (item.querySelector('[name="discountCode"]')?.value || '').trim().toUpperCase();
      const label = item.querySelector('[name="discountLabel"]')?.value?.trim() || '';
      const discountPercent =
        parseFloat(item.querySelector('[name="discountPercent"]')?.value) || 10;
      const restrictTo = item.querySelector('[name="discountRestrictTo"]')?.value || '';
      if (code) {
        const entry = { code, label: label || code, discountPercent };
        if (restrictTo) entry.restrictTo = restrictTo;
        discountCodes.push(entry);
      }
    });

    config.ventas = {
      ivaPrincipal: parseFloat(document.getElementById('ivaPrincipal').value) || 15,
      ivaReducido: parseFloat(document.getElementById('ivaReducido').value) || 0,
      aplicarIvaDefecto: document.getElementById('aplicarIvaDefecto').value,
      metodoPago: {
        efectivo: document.getElementById('pagoEfectivo').checked,
        tarjeta: document.getElementById('pagoTarjeta').checked,
        transferencia: document.getElementById('pagoTransferencia').checked,
        credito: document.getElementById('pagoCredito').checked,
      },
      descuentoMaximo: parseFloat(document.getElementById('descuentoMaximo').value) || 50,
      descuentoAutorizacion:
        parseFloat(document.getElementById('descuentoAutorizacion').value) || 20,
      descuentoPromo: document.getElementById('descuentoPromo').value,
      marginTemplates,
      discountCodes,
      tamañoPapel: document.getElementById('tamañoPapel').value,
      mostrarLogo: document.getElementById('mostrarLogo').value,
      imprimirAuto: document.getElementById('imprimirAuto').value,
      mensajeTicket: document.getElementById('mensajeTicket').value,
      solicitarCliente: document.getElementById('solicitarCliente').value,
      redondeoTotal: document.getElementById('redondeoTotal').value,
    };

    // Actualizar PricingConfig global si existe
    if (window.PricingConfig) {
      window.PricingConfig.marginTemplates = marginTemplates.length
        ? marginTemplates
        : window.PricingConfig.marginTemplates;
      window.PricingConfig.discountCodes = discountCodes.length
        ? discountCodes
        : window.PricingConfig.discountCodes;
    }

    return this._guardarSeccion('ventas', config);
  },

  guardarInventario() {
    const config = this.obtenerConfiguracion();
    config.inventario = {
      stockMinimo: parseInt(document.getElementById('stockMinimo').value) || 10,
      stockCritico: parseInt(document.getElementById('stockCritico').value) || 5,
      stockNegativo: document.getElementById('stockNegativo').value,
      notificarStockBajo: document.getElementById('notificarStockBajo').value,
      notificarVencimiento: document.getElementById('notificarVencimiento').value,
      diasVencimiento: parseInt(document.getElementById('diasVencimiento').value) || 30,
      controlarLotes: document.getElementById('controlarLotes').value,
      metodoSalida: document.getElementById('metodoSalida').value,
      solicitarProveedor: document.getElementById('solicitarProveedor').value,
      diasPagoProveedor: parseInt(document.getElementById('diasPagoProveedor').value) || 30,
    };

    return this._guardarSeccion('inventario', config);
  },

  guardarPublicidad() {
    const config = this.obtenerConfiguracion();
    config.publicidad = {
      redes: {
        facebook: document.getElementById('redFacebook').checked,
        instagram: document.getElementById('redInstagram').checked,
        twitter: document.getElementById('redTwitter').checked,
        tiktok: document.getElementById('redTikTok').checked,
        whatsapp: document.getElementById('redWhatsApp').checked,
      },
      ia: {
        proveedor: document.getElementById('proveedorIA').value,
        geminiApiKey: document.getElementById('geminiApiKey')?.value || '',
        deepseekApiKey: document.getElementById('deepseekApiKey')?.value || '',
        llmstudioUrl: document.getElementById('llmstudioUrl')?.value || 'http://localhost:1234/v1',
      },
      frecuencia: document.getElementById('frecuenciaPublicacion').value,
      horaPublicacion: document.getElementById('horaPublicacion').value,
      enlaces: {
        facebook: document.getElementById('enlaceFacebook').value,
        instagram: document.getElementById('enlaceInstagram').value,
        whatsapp: document.getElementById('enlaceWhatsApp').value,
      },
    };

    // Sincronizar claves con alcance por tienda para el módulo de Publicidad
    return this._guardarSeccion('publicidad', config, {
      syncCallback: (cfg) => {
        this.setScopedValue('ia_proveedor', cfg.publicidad.ia.proveedor);
        this.setScopedValue('ia_gemini_api_key', cfg.publicidad.ia.geminiApiKey);
        this.setScopedValue('ia_deepseek_api_key', cfg.publicidad.ia.deepseekApiKey);
        this.setScopedValue('ia_api_url', cfg.publicidad.ia.llmstudioUrl);
      },
    });
  },

  toggleProviderIA(provider) {
    document.querySelectorAll('[id^="config-ia-"]').forEach((el) => {
      el.style.display = 'none';
    });
    if (provider !== 'local') {
      const element = document.getElementById(`config-ia-${provider}`);
      if (element) {
        element.style.display = 'block';
      }
    }
  },

  guardarUsuarios() {
    const config = this.obtenerConfiguracion();
    config.usuarios = {
      tiempoInactividad: parseInt(document.getElementById('tiempoInactividad').value) || 60,
      multiplesSesiones: document.getElementById('multiplesSesiones').value,
    };

    return this._guardarSeccion('usuarios', config);
  },

  guardarNotificaciones() {
    const config = this.obtenerConfiguracion();
    config.notificaciones = {
      ventas: document.getElementById('notifVentas').checked,
      stockBajo: document.getElementById('notifStockBajo').checked,
      vencimiento: document.getElementById('notifVencimiento').checked,
      pagos: document.getElementById('notifPagos').checked,
      recordatorios: document.getElementById('notifRecordatorios').checked,
      canales: {
        sistema: document.getElementById('canalSistema').checked,
        email: document.getElementById('canalEmail').checked,
        sonido: document.getElementById('canalSonido').checked,
      },
      horario: {
        inicio: document.getElementById('horaInicioNotif').value,
        fin: document.getElementById('horaFinNotif').value,
      },
    };

    return this._guardarSeccion('notificaciones', config);
  },

  // ============================================
  // GESTIÓN DE TELEGRAM
  // ============================================
  guardarTelegram() {
    const config = this.obtenerConfiguracion();
    
    // Preservar usuarios existentes
    const usuariosExistentes = config.telegram?.usuarios || {};
    
    config.telegram = {
      activo: document.getElementById('telegramActivo').checked,
      botToken: document.getElementById('telegramBotToken').value.trim(),
      chatIds: config.telegram?.chatIds || [],
      chatInfo: config.telegram?.chatInfo || {},
      usuarios: usuariosExistentes, // Preservar usuarios configurados
      nombreAsistente: document.getElementById('telegramNombreAsistente')?.value?.trim() || 'Sara',
      enviarStockBajo: document.getElementById('telegramStockBajo').checked,
      enviarProductosVencer: document.getElementById('telegramProductosVencer').checked,
      enviarVentas: document.getElementById('telegramVentas').checked,
      enviarPagos: document.getElementById('telegramPagos').checked,
      enviarRecordatorios: document.getElementById('telegramRecordatorios').checked,
      stockBajoDiario: document.getElementById('telegramResumenDiario').checked,
      horaResumenDiario: document.getElementById('telegramHoraResumen').value,
    };

    // Sincronizar con el módulo de Telegram
    return this._guardarSeccion('Telegram', config, {
      syncCallback: (cfg) => {
        if (window.TelegramNotificaciones) {
          TelegramNotificaciones.guardarConfiguracion(cfg.telegram);
        }
      },
    });
  },

  async probarConexionTelegram() {
    const botToken = document.getElementById('telegramBotToken').value.trim();
    const statusPanel = document.getElementById('telegramBotStatus');
    const quickAccessPanel = document.getElementById('telegramBotQuickAccess');
    const statusText = document.getElementById('telegramStatusText');

    if (!botToken) {
      Utils.showToast('Ingresa un Bot Token primero', 'warning');
      if (statusPanel) {
        statusPanel.className = 'telegram-bot-status status-error';
        statusText.textContent = 'Token no ingresado';
      }
      return;
    }

    // Mostrar estado de verificación
    if (statusPanel) {
      statusPanel.className = 'telegram-bot-status status-checking';
      statusText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    }

    // Guardar temporalmente
    if (window.TelegramNotificaciones) {
      const backup = TelegramNotificaciones.config.botToken;
      TelegramNotificaciones.config.botToken = botToken;

      const resultado = await TelegramNotificaciones.probarConexion();

      if (resultado.exito) {
        Utils.showToast(resultado.mensaje, 'success');
        
        // Actualizar panel de estado
        if (statusPanel) {
          statusPanel.className = 'telegram-bot-status status-success';
          statusText.innerHTML = `<i class="fas fa-check-circle"></i> Conectado: @${resultado.botInfo.username}`;
        }
        
        // Mostrar panel de acceso rápido
        if (quickAccessPanel) {
          quickAccessPanel.style.display = 'block';
          const botNameEl = document.getElementById('telegramBotName');
          const botLinkEl = document.getElementById('telegramBotLink');
          
          if (botNameEl) {
            botNameEl.textContent = `@${resultado.botInfo.username}`;
          }
          if (botLinkEl) {
            botLinkEl.href = `https://t.me/${resultado.botInfo.username}`;
          }
        }
        
        // Guardar info del bot Y el token en la configuración
        const config = this.obtenerConfiguracion();
        config.telegram.botToken = botToken; // ← Guardar el token
        config.telegram.botInfo = {
          id: resultado.botInfo.id,
          username: resultado.botInfo.username,
          firstName: resultado.botInfo.first_name,
          verificadoEn: new Date().toISOString()
        };
        Database.set(this.STORAGE_KEY, config);
        
        // También sincronizar con el módulo de Telegram
        if (window.TelegramNotificaciones) {
          TelegramNotificaciones.guardarConfiguracion(config.telegram);
        }
        
      } else {
        Utils.showToast(resultado.mensaje, 'error');
        
        // Actualizar panel de estado
        if (statusPanel) {
          statusPanel.className = 'telegram-bot-status status-error';
          statusText.innerHTML = `<i class="fas fa-times-circle"></i> Error de conexión`;
        }
        
        // Ocultar panel de acceso rápido
        if (quickAccessPanel) {
          quickAccessPanel.style.display = 'none';
        }
      }

      TelegramNotificaciones.config.botToken = backup;
    } else {
      Utils.showToast('Módulo de Telegram no está cargado', 'warning');
      if (statusPanel) {
        statusPanel.className = 'telegram-bot-status status-error';
        statusText.textContent = 'Módulo no disponible';
      }
    }
  },

  agregarChatIdTelegram() {
    const chatId = document.getElementById('nuevoChatId').value.trim();

    if (!chatId) {
      Utils.showToast('Ingresa un Chat ID', 'warning');
      return;
    }

    const config = this.obtenerConfiguracion();

    if (!config.telegram.chatIds) {
      config.telegram.chatIds = [];
    }

    if (config.telegram.chatIds.includes(chatId)) {
      Utils.showToast('Este Chat ID ya está agregado', 'warning');
      return;
    }

    config.telegram.chatIds.push(chatId);
    Database.set(this.STORAGE_KEY, config);

    // Limpiar input
    document.getElementById('nuevoChatId').value = '';

    // Actualizar vista
    this.cambiarTab('telegram');

    Utils.showToast('Chat ID agregado exitosamente', 'success');
  },

  eliminarChatIdTelegram(chatId) {
    Utils.showConfirm('¿Eliminar este Chat ID?', () => {
      const config = this.obtenerConfiguracion();
      const index = config.telegram.chatIds.indexOf(chatId);

      if (index > -1) {
        config.telegram.chatIds.splice(index, 1);
        Database.set(ConfiguracionAvanzada.STORAGE_KEY, config);

        // Actualizar vista
        this.cambiarTab('telegram');

        Utils.showToast('Chat ID eliminado', 'success');
      }
    });
  },

  async enviarMensajePruebaTelegram(chatId = null) {
    // Primero guardar la configuración actual
    this.guardarTelegram();

    // Esperar un momento para que se guarde
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (window.TelegramNotificaciones && TelegramNotificaciones.inicializado) {
      if (chatId) {
        // Enviar solo a un Chat ID específico
        const mensaje =
          '🎉 *Mensaje de Prueba*\n\n' +
          '✅ Tu Chat ID está configurado correctamente.\n' +
          '📱 Recibirás notificaciones de:\n' +
          '  • Stock bajo o crítico\n' +
          '  • Productos por vencer\n' +
          '  • Ventas importantes\n' +
          '  • Recordatorios\n\n' +
          '👍 ¡Todo funciona perfecto!';

        const exito = await TelegramNotificaciones.enviarMensajeAChatId(chatId, mensaje);
        if (exito) {
          Utils.showToast(`Mensaje enviado a ${chatId}`, 'success');
        } else {
          Utils.showToast(`Error al enviar mensaje a ${chatId}`, 'error');
        }
      } else {
        await TelegramNotificaciones.enviarMensajePrueba();
      }
    } else {
      Utils.showToast('Telegram no está configurado o activado', 'warning');
    }
  },

  // ============================================
  // OBTENER CHAT IDS AUTOMÁTICAMENTE
  // ============================================
  async obtenerChatIdsAutomaticamente() {
    const botToken = document.getElementById('telegramBotToken').value.trim();
    const detectBtn = document.querySelector('[data-action="obtenerChatIdsAutomaticamente"]');

    if (!botToken) {
      Utils.showToast('⚠️ Primero ingresa el Bot Token y haz clic en "Verificar Bot"', 'warning');
      return;
    }

    // Deshabilitar botón mientras se busca
    if (detectBtn) {
      detectBtn.disabled = true;
      detectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
    }

    if (!window.TelegramNotificaciones) {
      Utils.showToast('Módulo de Telegram no está cargado', 'error');
      if (detectBtn) {
        detectBtn.disabled = false;
        detectBtn.innerHTML = '<i class="fas fa-magic"></i> Detectar Chat IDs';
      }
      return;
    }

    // Configurar temporalmente el bot token
    const backupToken = TelegramNotificaciones.config.botToken;
    TelegramNotificaciones.config.botToken = botToken;

    try {
      const resultado = await TelegramNotificaciones.obtenerChatIdsAutomaticamente();

      if (!resultado.exito) {
        Utils.showToast(resultado.mensaje, 'warning');
        TelegramNotificaciones.config.botToken = backupToken;
        if (detectBtn) {
          detectBtn.disabled = false;
          detectBtn.innerHTML = '<i class="fas fa-magic"></i> Detectar Chat IDs';
        }
        return;
      }

      // Obtener configuración actual
      const config = this.obtenerConfiguracion();

      if (!config.telegram.chatIds) {
        config.telegram.chatIds = [];
      }

      if (!config.telegram.chatInfo) {
        config.telegram.chatInfo = {};
      }

      let nuevosAgregados = 0;

      // Agregar los Chat IDs encontrados
      resultado.detalles.forEach((detalle) => {
        if (!config.telegram.chatIds.includes(detalle.chatId)) {
          config.telegram.chatIds.push(detalle.chatId);
          config.telegram.chatInfo[detalle.chatId] = {
            nombre: detalle.nombre,
            tipo: detalle.tipo,
            username: detalle.username,
            fechaAgregado: new Date().toISOString(),
          };
          nuevosAgregados++;
        }
      });

      // Guardar configuración con el token incluido
      config.telegram.botToken = botToken;
      Database.set(this.STORAGE_KEY, config);

      // Restaurar token
      TelegramNotificaciones.config.botToken = backupToken;

      // Recargar la pestaña para mostrar los nuevos Chat IDs
      this.cambiarTab('telegram');

      if (nuevosAgregados > 0) {
        Utils.showToast(`✅ Se agregaron ${nuevosAgregados} Chat ID(s) automáticamente`, 'success');
      } else {
        Utils.showToast('📭 No se encontraron nuevos Chat IDs. ¿Enviaste /start al bot?', 'info');
      }
    } catch (error) {
      console.error('Error al obtener Chat IDs:', error);
      Utils.showToast('Error al buscar Chat IDs: ' + error.message, 'error');
      TelegramNotificaciones.config.botToken = backupToken;
    } finally {
      if (detectBtn) {
        detectBtn.disabled = false;
        detectBtn.innerHTML = '<i class="fas fa-magic"></i> Detectar Chat IDs';
      }
    }
  },

  // ============================================
  // RENDERIZAR TABLA DE USUARIOS TELEGRAM
  // ============================================
  renderTablaUsuariosTelegram(config) {
    const chatIds = config.telegram?.chatIds || [];
    const usuarios = config.telegram?.usuarios || {};
    
    if (chatIds.length === 0) {
      return `
        <div class="empty-state">
          <i class="fab fa-telegram"></i>
          <p>No hay usuarios de Telegram configurados</p>
          <small>Usa "Detectar Chat IDs" o agrégalos manualmente</small>
        </div>
      `;
    }

    const tiposUsuario = window.TelegramNotificaciones?.TIPOS_USUARIO || {
      ADMIN: { nombre: 'Administrador', emoji: '👑' },
      SECRETARIO: { nombre: 'Secretario/a', emoji: '💼' },
      CLIENTE: { nombre: 'Cliente', emoji: '👤' }
    };

    return `
      <div class="telegram-users-legend">
        <span class="legend-item"><span class="badge badge-admin">👑 Admin</span> Acceso total</span>
        <span class="legend-item"><span class="badge badge-secretario">💼 Secretario</span> Citas y órdenes</span>
        <span class="legend-item"><span class="badge badge-cliente">👤 Cliente</span> Solo sus servicios</span>
      </div>
      <table class="config-table telegram-users-table">
        <thead>
          <tr>
            <th style="width: 120px"><i class="fas fa-hashtag"></i> Chat ID</th>
            <th><i class="fas fa-user"></i> Nombre</th>
            <th style="width: 160px"><i class="fas fa-user-tag"></i> Tipo</th>
            <th style="width: 120px"><i class="fas fa-cogs"></i> Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${chatIds.map((chatId) => {
            const usuario = usuarios[chatId] || {};
            const chatInfo = config.telegram?.chatInfo?.[chatId];
            const nombre = usuario.nombre || chatInfo?.nombre || '';
            const tipo = usuario.tipo || 'CLIENTE';
            const tipoInfo = tiposUsuario[tipo] || tiposUsuario.CLIENTE;
            
            return `
              <tr data-chatid="${chatId}">
                <td><code class="chat-id-code">${chatId}</code></td>
                <td>
                  <input type="text" class="form-control form-control-sm telegram-user-nombre" 
                    data-chatid="${chatId}"
                    value="${this.escapeHtml(nombre)}" 
                    placeholder="Nombre del usuario"
                    onchange="ConfiguracionAvanzada.actualizarNombreUsuarioTelegram('${chatId}', this.value)">
                </td>
                <td>
                  <select class="form-control form-control-sm telegram-user-tipo" 
                    data-chatid="${chatId}"
                    onchange="ConfiguracionAvanzada.cambiarTipoUsuarioTelegram('${chatId}', this.value)">
                    <option value="ADMIN" ${tipo === 'ADMIN' ? 'selected' : ''}>👑 Administrador</option>
                    <option value="SECRETARIO" ${tipo === 'SECRETARIO' ? 'selected' : ''}>💼 Secretario/a</option>
                    <option value="CLIENTE" ${tipo === 'CLIENTE' ? 'selected' : ''}>👤 Cliente</option>
                  </select>
                </td>
                <td class="actions-cell">
                  <button class="btn btn-sm btn-info" data-action="enviarMensajePruebaTelegram" data-params="'${chatId}'" title="Enviar mensaje de prueba">
                    <i class="fas fa-paper-plane"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" data-action="eliminarChatIdTelegram" data-params="'${chatId}'" title="Eliminar">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  // ============================================
  // CAMBIAR TIPO DE USUARIO TELEGRAM
  // ============================================
  cambiarTipoUsuarioTelegram(chatId, tipo) {
    if (!window.TelegramNotificaciones) {
      Utils.showToast('Módulo de Telegram no disponible', 'error');
      return;
    }

    const tiposValidos = ['ADMIN', 'SECRETARIO', 'CLIENTE'];
    if (!tiposValidos.includes(tipo)) {
      Utils.showToast('Tipo de usuario no válido', 'error');
      return;
    }

    // Actualizar en TelegramNotificaciones
    TelegramNotificaciones.setTipoUsuario(chatId, tipo);

    // También actualizar en la config local
    const config = this.obtenerConfiguracion();
    if (!config.telegram.usuarios) config.telegram.usuarios = {};
    if (!config.telegram.usuarios[chatId]) config.telegram.usuarios[chatId] = {};
    
    config.telegram.usuarios[chatId].tipo = tipo;
    config.telegram.usuarios[chatId].permisos = TelegramNotificaciones.TIPOS_USUARIO[tipo]?.permisos || [];
    
    Database.set(this.STORAGE_KEY, config);

    const tipoNombre = TelegramNotificaciones.TIPOS_USUARIO[tipo]?.nombre || tipo;
    Utils.showToast(`Usuario actualizado a: ${tipoNombre}`, 'success');
  },

  // ============================================
  // ACTUALIZAR NOMBRE DE USUARIO TELEGRAM
  // ============================================
  actualizarNombreUsuarioTelegram(chatId, nombre) {
    const config = this.obtenerConfiguracion();
    
    if (!config.telegram.usuarios) config.telegram.usuarios = {};
    if (!config.telegram.usuarios[chatId]) config.telegram.usuarios[chatId] = {};
    
    config.telegram.usuarios[chatId].nombre = nombre;
    Database.set(this.STORAGE_KEY, config);

    // También actualizar en TelegramNotificaciones
    if (window.TelegramNotificaciones) {
      TelegramNotificaciones.setUsuario(chatId, { nombre });
    }
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // ============================================
  // LIMPIAR UPDATES DE TELEGRAM
  // ============================================
  async limpiarUpdatesTelegram() {
    const botToken = document.getElementById('telegramBotToken').value.trim();

    if (!botToken) {
      Utils.showToast('Configura el Bot Token primero', 'warning');
      return;
    }

    if (!window.TelegramNotificaciones) {
      Utils.showToast('Módulo de Telegram no está cargado', 'error');
      return;
    }

    Utils.showToast('Limpiando mensajes antiguos...', 'info');

    // Configurar temporalmente el bot token
    const backupToken = TelegramNotificaciones.config.botToken;
    TelegramNotificaciones.config.botToken = botToken;

    try {
      await TelegramNotificaciones.limpiarUpdates();
      Utils.showToast('✅ Mensajes antiguos limpiados', 'success');
    } catch (error) {
      console.error('Error al limpiar updates:', error);
      Utils.showToast('Error al limpiar mensajes', 'error');
    } finally {
      TelegramNotificaciones.config.botToken = backupToken;
    }
  },

  // ============================================
  // TELEGRAM IA ASSISTANT
  // ============================================
  async iniciarTelegramIA() {
    if (!window.TelegramIAAssistant) {
      Utils.showToast('El módulo de Telegram IA no está cargado', 'error');
      return;
    }

    const config = this.obtenerConfiguracion();
    if (!config.telegram?.botToken) {
      Utils.showToast('Configura y verifica el Bot Token primero', 'warning');
      return;
    }

    try {
      // Asegurar que tenga la configuración correcta
      TelegramIAAssistant.config.botToken = config.telegram.botToken;
      TelegramIAAssistant.config.enabled = true;
      
      await TelegramIAAssistant.init();
      
      this.actualizarEstadoTelegramIA();
      Utils.showToast('✅ Asistente IA de Telegram iniciado', 'success');
    } catch (error) {
      console.error('Error iniciando Telegram IA:', error);
      Utils.showToast('Error al iniciar el asistente', 'error');
    }
  },

  detenerTelegramIA() {
    if (!window.TelegramIAAssistant) {
      return;
    }

    TelegramIAAssistant.detenerPolling();
    this.actualizarEstadoTelegramIA();
    Utils.showToast('Asistente IA detenido', 'info');
  },

  actualizarEstadoTelegramIA() {
    const indicator = document.getElementById('iaStatusIndicator');
    const statusText = document.getElementById('iaStatusText');
    
    if (!indicator || !statusText) return;

    if (!window.TelegramIAAssistant) {
      indicator.className = 'ia-status-indicator status-off';
      indicator.innerHTML = '<i class="fas fa-circle"></i>';
      statusText.textContent = 'Módulo no cargado';
      return;
    }

    const estado = TelegramIAAssistant.getEstado();
    
    if (estado.activo && estado.polling) {
      indicator.className = 'ia-status-indicator status-on';
      indicator.innerHTML = '<i class="fas fa-circle"></i>';
      statusText.textContent = `Activo - ${estado.conversacionesActivas} conversaciones`;
    } else {
      indicator.className = 'ia-status-indicator status-off';
      indicator.innerHTML = '<i class="fas fa-circle"></i>';
      statusText.textContent = 'Inactivo';
    }
  },

  toggleTelegramChat() {
    const panel = document.getElementById('telegramChatPanel');
    if (!panel) return;

    const visible = panel.style.display !== 'none';
    panel.style.display = visible ? 'none' : 'block';

    if (!visible) {
      this.cargarHistorialTelegramChat();
      // Escuchar nuevos mensajes
      this.setupTelegramChatListener();
    }
  },

  setupTelegramChatListener() {
    // Remover listener anterior si existe
    if (this._telegramChatListener) {
      window.removeEventListener('telegram-nuevo-mensaje', this._telegramChatListener);
    }

    this._telegramChatListener = (e) => {
      this.agregarMensajeAlChat(e.detail);
      this.actualizarEstadisticasChat();
    };

    window.addEventListener('telegram-nuevo-mensaje', this._telegramChatListener);
  },

  cargarHistorialTelegramChat() {
    const container = document.getElementById('telegramChatMessages');
    if (!container) return;

    if (!window.TelegramIAAssistant) {
      container.innerHTML = `
        <div class="empty-chat">
          <i class="fas fa-robot"></i>
          <p>Módulo de Telegram IA no cargado</p>
          <small>Recarga la página para activarlo</small>
        </div>
      `;
      return;
    }

    const historial = TelegramIAAssistant.getHistorial();
    
    if (historial.length === 0) {
      container.innerHTML = `
        <div class="empty-chat">
          <i class="fas fa-comments"></i>
          <p>No hay mensajes aún</p>
          <small>Los mensajes de Telegram aparecerán aquí</small>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    historial.forEach(msg => {
      this.agregarMensajeAlChat(msg, false);
    });

    // Scroll al final
    container.scrollTop = container.scrollHeight;
    this.actualizarEstadisticasChat();
  },

  agregarMensajeAlChat(msg, scroll = true) {
    const container = document.getElementById('telegramChatMessages');
    if (!container) return;

    // Limpiar estado vacío si existe
    const emptyState = container.querySelector('.empty-chat');
    if (emptyState) {
      emptyState.remove();
    }

    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${msg.tipo === 'entrante' ? 'incoming' : 'outgoing'}`;
    
    const hora = new Date(msg.timestamp).toLocaleTimeString('es-EC', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    if (msg.tipo === 'entrante') {
      msgEl.innerHTML = `
        <div class="message-header">
          <span class="message-user">
            <i class="fas fa-user"></i> ${msg.usuario?.nombre || 'Usuario'}
            ${msg.usuario?.username ? `<small>@${msg.usuario.username}</small>` : ''}
          </span>
          <span class="message-time">${hora}</span>
        </div>
        <div class="message-content">${this.escapeHtml(msg.mensaje)}</div>
      `;
    } else {
      msgEl.innerHTML = `
        <div class="message-header">
          <span class="message-user">
            <i class="fas fa-robot"></i> Asistente
          </span>
          <span class="message-time">${hora}</span>
        </div>
        <div class="message-content">${this.escapeHtml(msg.mensaje)}</div>
      `;
    }

    container.appendChild(msgEl);

    if (scroll) {
      container.scrollTop = container.scrollHeight;
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  actualizarEstadisticasChat() {
    const stats = document.getElementById('chatStats');
    if (!stats || !window.TelegramIAAssistant) return;

    const estado = TelegramIAAssistant.getEstado();
    stats.textContent = `${estado.mensajesEnHistorial} mensajes | ${estado.conversacionesActivas} conversaciones activas`;
  },

  limpiarHistorialTelegram() {
    if (!window.TelegramIAAssistant) return;

    if (confirm('¿Estás seguro de que quieres limpiar todo el historial de chat?')) {
      TelegramIAAssistant.limpiarHistorial();
      this.cargarHistorialTelegramChat();
      Utils.showToast('Historial limpiado', 'info');
    }
  },

  // ============================================
  // CONFIGURACIÓN SRI
  // ============================================
  marcarSriInputPersonalizado(element) {
    if (!element) return;
    const valor = element.value.trim();
    const valorReferencia = element.dataset.default || '';
    element.dataset.custom = valor && valor !== valorReferencia ? 'true' : 'false';
  },

  handleAmbienteSriChange(ambiente) {
    const endpoints = this.obtenerEndpointsSri(ambiente);
    const mapping = [
      { id: 'sriRecepcionUrl', valor: endpoints.recepcion },
      { id: 'sriAutorizacionUrl', valor: endpoints.autorizacion },
      { id: 'sriConsultaUrl', valor: endpoints.consulta },
    ];

    mapping.forEach((item) => {
      const input = document.getElementById(item.id);
      if (!input) return;
      const esPersonalizado = input.dataset.custom === 'true' && input.value.trim() !== '';
      if (!esPersonalizado) {
        input.value = item.valor;
        input.dataset.custom = 'false';
      }
      input.dataset.default = item.valor;
    });
  },

  obtenerEndpointsSri(ambiente = 'pruebas') {
    const endpoints = {
      pruebas: {
        recepcion:
          'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesService?wsdl',
        autorizacion:
          'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesService?wsdl',
        consulta:
          'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesService?wsdl',
      },
      produccion: {
        recepcion:
          'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesService?wsdl',
        autorizacion:
          'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesService?wsdl',
        consulta:
          'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesService?wsdl',
      },
    };
    return endpoints[ambiente] || endpoints.pruebas;
  },

  normalizarSriCodigo(valor, length = 3) {
    const limpio = String(valor ?? '')
      .replace(/[^0-9]/g, '')
      .slice(-length);
    return limpio.padStart(length, '0');
  },

  normalizarSriSecuencial(valor) {
    const numero = parseInt(String(valor ?? '').replace(/[^0-9]/g, ''), 10);
    if (!Number.isFinite(numero) || numero < 1) {
      return '1';
    }
    return String(numero);
  },

  normalizarSriConfig(sriConfig = null) {
    const defaults = this.obtenerConfiguracionDefecto().sri;
    const raw = sriConfig || {};
    const merged = {
      ...defaults,
      ...raw,
    };

    merged.habilitado = Boolean(raw?.habilitado);
    merged.ambiente = ['produccion', 'pruebas'].includes(merged.ambiente)
      ? merged.ambiente
      : defaults.ambiente;
    merged.tipoEmision = ['normal', 'contingencia'].includes(merged.tipoEmision)
      ? merged.tipoEmision
      : defaults.tipoEmision;
    merged.obligadoContabilidad = merged.obligadoContabilidad === 'SI' ? 'SI' : 'NO';
    merged.establecimiento = this.normalizarSriCodigo(merged.establecimiento, 3);
    merged.puntoEmision = this.normalizarSriCodigo(merged.puntoEmision, 3);
    merged.secuencialFactura = this.normalizarSriSecuencial(merged.secuencialFactura);
    merged.secuencialRetencion = this.normalizarSriSecuencial(merged.secuencialRetencion);
    merged.secuencialGuia = this.normalizarSriSecuencial(merged.secuencialGuia);
    merged.secuencialNotaCredito = this.normalizarSriSecuencial(merged.secuencialNotaCredito);
    merged.secuencialNotaDebito = this.normalizarSriSecuencial(merged.secuencialNotaDebito);
    merged.secuencialLiquidacion = this.normalizarSriSecuencial(merged.secuencialLiquidacion);
    merged.secuencialProforma = this.normalizarSriSecuencial(merged.secuencialProforma);

    const reintentos = parseInt(merged.reintentos, 10);
    merged.reintentos = Number.isFinite(reintentos)
      ? Math.min(Math.max(reintentos, 0), 10)
      : defaults.reintentos;

    const timeout = parseInt(merged.timeout, 10);
    merged.timeout = Number.isFinite(timeout)
      ? Math.min(Math.max(timeout, 10), 300)
      : defaults.timeout;

    merged.wsRecepcion = raw?.wsRecepcion || '';
    merged.wsAutorizacion = raw?.wsAutorizacion || '';
    merged.wsConsulta = raw?.wsConsulta || '';

    return merged;
  },

  tomarSriDesdeFormulario() {
    const getValue = (id) => document.getElementById(id)?.value?.trim() ?? '';
    const sri = {
      habilitado: document.getElementById('sriHabilitado')?.checked || false,
      ambiente: getValue('sriAmbiente') || 'pruebas',
      tipoEmision: getValue('sriTipoEmision') || 'normal',
      reintentos: getValue('sriReintentos'),
      timeout: getValue('sriTimeout'),
      razonSocial: getValue('sriRazonSocial'),
      nombreComercial: getValue('sriNombreComercial'),
      ruc: getValue('sriRuc'),
      contribuyenteEspecial: getValue('sriContribuyenteEspecial'),
      obligadoContabilidad: getValue('sriObligadoContabilidad') || 'NO',
      direccionMatriz: getValue('sriDireccionMatriz'),
      direccionSucursal: getValue('sriDireccionSucursal'),
      emailNotificaciones: getValue('sriEmailNotificaciones'),
      telefono: getValue('sriTelefono'),
      establecimiento: getValue('sriEstablecimiento') || '001',
      puntoEmision: getValue('sriPuntoEmision') || '001',
      secuencialFactura: getValue('sriSecuencialFactura') || '1',
      secuencialRetencion: getValue('sriSecuencialRetencion') || '1',
      secuencialGuia: getValue('sriSecuencialGuia') || '1',
      secuencialNotaCredito: getValue('sriSecuencialNotaCredito') || '1',
      secuencialNotaDebito: getValue('sriSecuencialNotaDebito') || '1',
      secuencialLiquidacion: getValue('sriSecuencialLiquidacion') || '1',
      secuencialProforma: getValue('sriSecuencialProforma') || '1',
      certificadoTipo: getValue('sriCertificadoTipo') || 'archivo',
      certificadoAlias: getValue('sriCertificadoAlias'),
      certificadoClave: getValue('sriCertificadoClave'),
      certificadoBase64: document.getElementById('sriCertificadoBase64')?.value?.trim() ?? '',
      wsRecepcion: getValue('sriRecepcionUrl'),
      wsAutorizacion: getValue('sriAutorizacionUrl'),
      wsConsulta: getValue('sriConsultaUrl'),
    };

    sri.establecimiento = this.normalizarSriCodigo(sri.establecimiento, 3);
    sri.puntoEmision = this.normalizarSriCodigo(sri.puntoEmision, 3);
    sri.secuencialFactura = this.normalizarSriSecuencial(sri.secuencialFactura);
    sri.secuencialRetencion = this.normalizarSriSecuencial(sri.secuencialRetencion);
    sri.secuencialGuia = this.normalizarSriSecuencial(sri.secuencialGuia);
    sri.secuencialNotaCredito = this.normalizarSriSecuencial(sri.secuencialNotaCredito);
    sri.secuencialNotaDebito = this.normalizarSriSecuencial(sri.secuencialNotaDebito);
    sri.secuencialLiquidacion = this.normalizarSriSecuencial(sri.secuencialLiquidacion);
    sri.secuencialProforma = this.normalizarSriSecuencial(sri.secuencialProforma);

    return this.normalizarSriConfig(sri);
  },

  validarSriFormulario(sri) {
    const errores = [];
    if (!sri) {
      errores.push('No se pudo leer la configuración SRI.');
      return errores;
    }

    if (!sri.establecimiento || !sri.puntoEmision) {
      errores.push('Debes indicar el establecimiento y punto de emisión autorizados.');
    }

    if (sri.habilitado) {
      if (!/^[0-9]{13}$/.test(sri.ruc || '')) {
        errores.push('Ingresa un RUC válido de 13 dígitos.');
      }
      if (!sri.razonSocial) {
        errores.push('La razón social es obligatoria.');
      }
      if (!sri.direccionMatriz) {
        errores.push('La dirección matriz es obligatoria.');
      }
      if (!sri.certificadoClave) {
        errores.push('Registra la clave del certificado digital.');
      }
      if (sri.certificadoTipo === 'archivo' && !sri.certificadoBase64) {
        errores.push('Pega el contenido base64 del archivo de firma electrónica.');
      }
      if (!sri.wsRecepcion || !sri.wsAutorizacion) {
        errores.push('Debes definir las URLs de recepción y autorización del SRI.');
      }
    }

    return errores;
  },

  sincronizarConfigGeneralConSri(config, sri) {
    if (!config || !sri) return;
    if (!config.general) config.general = {};
    if (sri.razonSocial) config.general.nombreNegocio = sri.razonSocial;
    if (sri.ruc) config.general.ruc = sri.ruc;
    if (sri.direccionMatriz) config.general.direccion = sri.direccionMatriz;
    if (sri.telefono) config.general.telefono = sri.telefono;
    if (sri.emailNotificaciones) config.general.email = sri.emailNotificaciones;
  },

  sincronizarConfigTiendaConSri(sri) {
    if (!sri) return;
    const configTienda = Database.get('configTienda');
    if (!configTienda) return;

    const actualizado = {
      ...configTienda,
      establecimiento: sri.establecimiento,
      puntoEmision: sri.puntoEmision,
    };

    if (sri.razonSocial) actualizado.nombreTienda = sri.razonSocial;
    if (sri.ruc) actualizado.ruc = sri.ruc;
    if (sri.direccionMatriz) actualizado.direccion = sri.direccionMatriz;
    if (sri.telefono) actualizado.telefono = sri.telefono;
    if (sri.emailNotificaciones) actualizado.email = sri.emailNotificaciones;

    Database.set('configTienda', actualizado);
  },

  guardarSri() {
    const config = this.obtenerConfiguracion();
    const sri = this.tomarSriDesdeFormulario();
    const errores = this.validarSriFormulario(sri);

    if (errores.length > 0) {
      Utils.showToast(errores[0], 'warning');
      return false;
    }

    config.sri = sri;
    this.sincronizarConfigGeneralConSri(config, sri);

    // Usar función helper con callbacks de sincronización
    const guardado = this._guardarSeccion('SRI', config, {
      syncCallback: (cfg) => {
        this.sincronizarConfigTiendaConSri(cfg.sri);
        this.sincronizarConfiguracionConBackend(cfg).catch((error) => {
          console.warn('⚠️ No se pudo sincronizar configuración SRI con backend:', error);
        });

        // Sincronizar con módulo SRI si está disponible
        if (window.SRIIntegration) {
          if (typeof SRIIntegration.refresh === 'function') {
            SRIIntegration.refresh();
          } else if (typeof SRIIntegration.updateConfig === 'function') {
            SRIIntegration.updateConfig(cfg.sri);
          }
        }
      },
      onSuccess: () => {
        this.cambiarTab('sri');
      },
    });

    return guardado;
  },

  async probarSri() {
    const sri = this.tomarSriDesdeFormulario();
    const errores = this.validarSriFormulario(sri);

    if (sri.habilitado && errores.length > 0) {
      Utils.showToast(errores[0], 'warning');
      return;
    }

    if (!window.SRIIntegration || typeof SRIIntegration.testHandshake !== 'function') {
      Utils.showToast(
        'El módulo de integración SRI aún no está disponible en esta vista.',
        'warning'
      );
      return;
    }

    try {
      Utils.showToast('Verificando conectividad con el SRI...', 'info');
      const resultado = await SRIIntegration.testHandshake(sri);
      if (resultado?.exito) {
        Utils.showToast(resultado.mensaje || 'Conexión exitosa con el SRI.', 'success');
      } else {
        Utils.showToast(
          resultado?.mensaje || 'No se pudo validar la conexión con el SRI.',
          'error'
        );
      }
    } catch (error) {
      console.error('Error al probar la integración SRI:', error);
      Utils.showToast('Error al intentar comunicarse con el SRI: ' + error.message, 'error');
    }
  },

  guardarVisual() {
    const config = this.obtenerConfiguracion();
    const selectedTheme = this.mapThemeValue(document.getElementById('modoColor').value);
    config.visual = {
      tema: selectedTheme,
      colorPrincipal: document.getElementById('colorPrincipal').value,
      logoUrl: document.getElementById('logoUrl').value,
      mostrarLogoSidebar: document.getElementById('mostrarLogoSidebar').value,
      tamañoFuente: document.getElementById('tamañoFuente').value,
    };

    // Aplicar cambios visuales inmediatamente después de guardar
    return this._guardarSeccion('apariencia', config, {
      onSuccess: (cfg) => {
        this.aplicarColorPrincipal(cfg.visual.colorPrincipal);
        this.cambiarTamañoFuente(cfg.visual.tamañoFuente);
        this.cambiarTema(selectedTheme);
      },
    });
  },

  guardarReportes() {
    const config = this.obtenerConfiguracion();
    config.reportes = {
      formato: document.getElementById('formatoReporte').value,
      incluirLogo: document.getElementById('logoReportes').value,
      campos: {
        precios: document.getElementById('reportePrecios').checked,
        costos: document.getElementById('reporteCostos').checked,
        margenes: document.getElementById('reporteMargenes').checked,
        proveedores: document.getElementById('reporteProveedores').checked,
      },
      automatico: {
        diario: document.getElementById('reporteDiario').value,
        semanal: document.getElementById('reporteSemanal').value,
        mensual: document.getElementById('reporteMensual').value,
      },
    };

    return this._guardarSeccion('reportes', config);
  },

  guardarBackup() {
    const config = this.obtenerConfiguracion();
    config.backup = {
      automatico: document.getElementById('backupAuto').value,
      frecuencia: document.getElementById('frecuenciaBackup').value,
      hora: document.getElementById('horaBackup').value,
      numeroBackups: parseInt(document.getElementById('numeroBackups').value) || 7,
      eliminarViejos: document.getElementById('eliminarBackupsViejos').value,
    };

    return this._guardarSeccion('backup', config);
  },

  guardarAvanzado() {
    const config = this.obtenerConfiguracion();
    config.avanzado = {
      idioma: document.getElementById('idioma').value,
      zonaHoraria: document.getElementById('zonaHoraria').value,
      formatoFecha: document.getElementById('formatoFecha').value,
      rendimiento: document.getElementById('modoRendimiento').value,
      animaciones: document.getElementById('animaciones').value,
      contraseñaCritica: document.getElementById('contraseñaCritica').value,
      registrarActividad: document.getElementById('registrarActividad').value,
      modoDesarrollador: document.getElementById('modoDesarrollador').value,
      mostrarLogs: document.getElementById('mostrarLogs').value,
    };

    return this._guardarSeccion('avanzada', config);
  },

  // ============================================
  // GESTIÓN DE USUARIOS
  // ============================================
  mostrarModalUsuario(userId = null) {
    const usuario = userId ? Database.getItem('usuarios', userId) : null;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalUsuario';
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3><i class="fas fa-user"></i> ${usuario ? 'Editar' : 'Nuevo'} Usuario</h3>
          <button class="btn-close" data-action="closeModal">×</button>
        </div>
        <div class="modal-body">
          <form id="formUsuario">
            <div class="form-group">
              <label>Nombre de Usuario *</label>
              <input type="text" id="username" class="form-control" value="${usuario?.username || ''}" ${usuario ? 'readonly' : ''} required>
            </div>
            <div class="form-group">
              <label>Nombre Completo *</label>
              <input type="text" id="nombre" class="form-control" value="${usuario?.nombre || ''}" required>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="email" class="form-control" value="${usuario?.email || ''}">
            </div>
            <div class="form-group">
              <label>Contraseña ${usuario ? '(Dejar en blanco para no cambiar)' : '*'}</label>
              <input type="password" id="password" class="form-control" ${!usuario ? 'required' : ''}>
            </div>
            <div class="form-group">
              <label>Rol *</label>
              <select id="rol" class="form-control" required>
                <option value="user" ${usuario?.rol === 'user' ? 'selected' : ''}>Usuario</option>
                <option value="admin" ${usuario?.rol === 'admin' ? 'selected' : ''}>Administrador</option>
              </select>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="activo" ${usuario?.activo !== false ? 'checked' : ''}>
                Usuario Activo
              </label>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-action="closeModal">Cancelar</button>
          <button class="btn btn-primary" class="btn-save-config btn-save-Usuario('${userId || ''}')">
            <i class="fas fa-save"></i> Guardar
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  guardarUsuario(userId) {
    const username = document.getElementById('username').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rol = document.getElementById('rol').value;
    const activo = document.getElementById('activo').checked;

    if (!username || !nombre) {
      Utils.showToast('Complete los campos requeridos', 'warning');
      return;
    }

    if (userId) {
      // Editar usuario existente
      const updates = { nombre, email, rol, activo };
      if (password) {
        updates.password = password;
      }
      const result = Auth.updateUser(userId, updates);
      if (result.success) {
        Utils.showToast(result.message, 'success');
        document.getElementById('modalUsuario').remove();
        this.cambiarTab('usuarios');
      } else {
        Utils.showToast(result.message, 'error');
      }
    } else {
      // Crear nuevo usuario
      if (!password) {
        Utils.showToast('La contraseña es requerida', 'warning');
        return;
      }
      const result = Auth.createUser({ username, nombre, email, password, rol, activo });
      if (result.success) {
        Utils.showToast(result.message, 'success');
        document.getElementById('modalUsuario').remove();
        this.cambiarTab('usuarios');
      } else {
        Utils.showToast(result.message, 'error');
      }
    }
  },

  editarUsuario(userId) {
    this.mostrarModalUsuario(userId);
  },

  eliminarUsuario(userId) {
    Utils.showConfirm('¿Estás seguro de eliminar este usuario?', () => {
      const result = Auth.deleteUser(userId);
      if (result.success) {
        Utils.showToast(result.message, 'success');
        this.cambiarTab('usuarios');
      } else {
        Utils.showToast(result.message, 'error');
      }
    });
  },

  // ============================================
  // FUNCIONES AUXILIARES
  // ============================================
  aplicarColorPrincipal(color) {
    const normalizado = this.normalizarColorHex(color);
    if (!normalizado) {
      return;
    }

    const root = document.documentElement;
    root.style.setProperty('--primary-color', normalizado);
    root.style.setProperty('--primary-dark', this.ajustarColor(normalizado, -0.25));
    root.style.setProperty('--primary-light', this.ajustarColor(normalizado, 0.2));
  },

  normalizarColorHex(color) {
    if (!color) {
      return null;
    }
    let hex = color.trim();
    if (!hex) {
      return null;
    }
    if (hex.startsWith('#')) {
      hex = hex.slice(1);
    }
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      return null;
    }
    return `#${hex.toLowerCase()}`;
  },

  ajustarColor(hex, porcentaje) {
    const normalizado = this.normalizarColorHex(hex);
    if (!normalizado) {
      return hex;
    }

    const value = parseInt(normalizado.slice(1), 16);
    let r = (value >> 16) & 0xff;
    let g = (value >> 8) & 0xff;
    let b = value & 0xff;

    const ajustarCanal = (canal) => {
      if (porcentaje >= 0) {
        return Math.round(canal + (255 - canal) * porcentaje);
      }
      return Math.round(canal * (1 + porcentaje));
    };

    r = Math.min(255, Math.max(0, ajustarCanal(r)));
    g = Math.min(255, Math.max(0, ajustarCanal(g)));
    b = Math.min(255, Math.max(0, ajustarCanal(b)));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  },

  cambiarTema(tema) {
    const preferencia = this.mapThemeValue(tema);
    document.documentElement.dataset.themePreference = preferencia;
    this.detachAutoThemeListener();

    if (preferencia === 'auto') {
      this.habilitarTemaAutomatico();
      return;
    }

    this.aplicarTemaConcreto(preferencia, { persist: true });
  },

  cambiarTamañoFuente(tamaño) {
    const sizeMap = {
      pequeño: '14px',
      pequeno: '14px',
      small: '14px',
      normal: '16px',
      grande: '18px',
      large: '18px',
    };

    const llave = tamaño?.toString().toLowerCase() || 'normal';
    const valor = sizeMap[llave] || sizeMap.normal;
    document.documentElement.style.fontSize = valor;
    document.documentElement.dataset.fontSize = llave;
  },

  aplicarTemaConcreto(theme, options = {}) {
    const persist = options.persist !== false;

    if (window.themeManager) {
      if (persist) {
        window.themeManager.setTheme(theme);
      } else {
        window.themeManager.applyTheme(theme);
      }
      return;
    }

    // Fallback si ThemeManager no está disponible
    const raiz = document.documentElement;
    raiz.setAttribute('data-theme', theme);
    raiz.classList.toggle('dark-mode', theme === 'dark');
    raiz.classList.toggle('light-mode', theme === 'light');
    raiz.classList.toggle('dark-theme', theme === 'dark');
    raiz.classList.toggle('light-theme', theme === 'light');

    if (document.body) {
      document.body.classList.toggle('dark-mode', theme === 'dark');
      document.body.classList.toggle('light-mode', theme === 'light');
      document.body.classList.toggle('dark-theme', theme === 'dark');
      document.body.classList.toggle('light-theme', theme === 'light');
      document.body.setAttribute('data-theme', theme);
    }

    if (persist) {
      try {
        if (window.TenantStorage && typeof TenantStorage.setItem === 'function') {
          TenantStorage.setItem('gestor_tienda_theme', theme);
        } else {
          localStorage.setItem('gestor_tienda_theme', theme);
        }
      } catch (error) {
        console.warn('No se pudo persistir el tema:', error);
      }
    }
  },

  habilitarTemaAutomatico() {
    const aplicarPreferido = () => {
      const esOscuro =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.aplicarTemaConcreto(esOscuro ? 'dark' : 'light', { persist: false });
    };

    aplicarPreferido();

    // Limpiar preferencia guardada para permitir modo auto
    try {
      if (window.themeManager && typeof window.themeManager.clearTheme === 'function') {
        window.themeManager.clearTheme();
      } else if (window.TenantStorage && typeof TenantStorage.removeItem === 'function') {
        TenantStorage.removeItem('gestor_tienda_theme');
      } else {
        localStorage.removeItem('gestor_tienda_theme');
      }
    } catch (error) {
      console.warn('No se pudo limpiar el tema persistido:', error);
    }

    if (window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => aplicarPreferido();

      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', handler);
      } else if (typeof media.addListener === 'function') {
        media.addListener(handler);
      }

      this.autoThemeMediaQuery = media;
      this.autoThemeListener = handler;
    }
  },

  detachAutoThemeListener() {
    if (this.autoThemeMediaQuery && this.autoThemeListener) {
      if (typeof this.autoThemeMediaQuery.removeEventListener === 'function') {
        this.autoThemeMediaQuery.removeEventListener('change', this.autoThemeListener);
      } else if (typeof this.autoThemeMediaQuery.removeListener === 'function') {
        this.autoThemeMediaQuery.removeListener(this.autoThemeListener);
      }
    }

    this.autoThemeMediaQuery = null;
    this.autoThemeListener = null;
  },

  crearBackupManual() {
    // Delegar al módulo de Backup
    if (window.Backup) {
      Backup.crearBackup();
    } else {
      Utils.showToast('Módulo de backup no disponible', 'warning');
    }
  },

  restaurarBackup() {
    // Delegar al módulo de Backup
    if (window.Backup) {
      Backup.restaurarBackup();
    } else {
      Utils.showToast('Módulo de backup no disponible', 'warning');
    }
  },

  exportarConfiguracion() {
    const config = this.obtenerConfiguracion();
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `configuracion-${Utils.getCurrentDate()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    Utils.showToast('Configuración exportada exitosamente', 'success');
  },

  importarConfiguracion() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const config = JSON.parse(event.target.result);
          Database.set(ConfiguracionAvanzada.STORAGE_KEY, config);
          Utils.showToast('Configuración importada exitosamente', 'success');

          // Actualizar sin recargar
          if (window.DataRefreshManager) {
            const container = document.querySelector('.page-content');
            if (container) await ConfiguracionAvanzada.render(container);
          } else {
            App.loadModule('configuracion');
          }
        } catch (error) {
          Utils.showToast('Error al importar configuración', 'error');
          console.error(error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  restaurarDefecto() {
    Utils.showConfirm(
      '¿Estás seguro de restaurar la configuración por defecto? Esta acción no se puede deshacer.',
      async () => {
        const configDefecto = this.obtenerConfiguracionDefecto();
        Database.set(ConfiguracionAvanzada.STORAGE_KEY, configDefecto);
        Utils.showToast('Configuración restaurada a valores por defecto', 'success');

        // Actualizar sin recargar
        if (window.DataRefreshManager) {
          const container = document.querySelector('.page-content');
          if (container) await this.render(container);
        } else {
          App.loadModule('configuracion');
        }
      }
    );
  },

  // ============================================
  // ICON PICKER FUNCTIONALITY
  // ============================================

  allIcons: [
    // Negocios y comercio
    '🏪',
    '🛒',
    '🏬',
    '🏢',
    '🏭',
    '🏗️',
    '🏦',
    '💼',
    '📊',
    '💰',
    // Comida y bebidas
    '🍔',
    '🍕',
    '🍟',
    '🌮',
    '🌯',
    '🥙',
    '🥗',
    '🍝',
    '🍜',
    '🍲',
    '🍱',
    '🍛',
    '🍣',
    '🍤',
    '🥘',
    '🍳',
    '🥚',
    '🧇',
    '🥞',
    '🧈',
    '🍞',
    '🥐',
    '🥖',
    '🥨',
    '🥯',
    '🧀',
    '🍖',
    '🍗',
    '🥩',
    '🥓',
    '☕',
    '🍵',
    '🧃',
    '🥤',
    '🍷',
    '🍺',
    '🍻',
    '🥂',
    '🍾',
    '🧊',
    // Tecnología
    '💻',
    '🖥️',
    '⌨️',
    '🖱️',
    '🖨️',
    '📱',
    '📲',
    '☎️',
    '📞',
    '📟',
    '📠',
    '📺',
    '📻',
    '🎙️',
    '🎚️',
    '🎛️',
    '⏱️',
    '⏰',
    '⌚',
    '📡',
    // Ropa y moda
    '👕',
    '👔',
    '🥼',
    '🦺',
    '👗',
    '👘',
    '👙',
    '👚',
    '👛',
    '👜',
    '👝',
    '🎒',
    '👞',
    '👟',
    '🥾',
    '🥿',
    '👠',
    '👡',
    '👢',
    '👑',
    '👒',
    '🎩',
    '🎓',
    '🧢',
    '⛑️',
    '💄',
    '💍',
    '💎',
    '🔗',
    '📿',
    // Herramientas y construcción
    '🔧',
    '🔨',
    '⚒️',
    '🛠️',
    '⛏️',
    '🪓',
    '🔩',
    '⚙️',
    '🪛',
    '🗜️',
    '🔪',
    '🗡️',
    '⚔️',
    '🪚',
    '🪜',
    '⛓️',
    '🧰',
    '🧲',
    '🪝',
    '🧱',
    // Salud y farmacia
    '💊',
    '💉',
    '🩹',
    '🩺',
    '🌡️',
    '🧬',
    '🔬',
    '🧪',
    '🧫',
    '🩸',
    '🏥',
    '⚕️',
    '🏥',
    '🚑',
    '⚗️',
    '💆',
    '💇',
    '🧖',
    '🧴',
    '🧼',
    // Educación y papelería
    '📚',
    '📖',
    '📝',
    '📄',
    '📃',
    '📑',
    '📊',
    '📈',
    '📉',
    '🗒️',
    '🗓️',
    '📆',
    '📅',
    '📇',
    '🗃️',
    '🗂️',
    '📂',
    '📁',
    '📋',
    '📌',
    '📍',
    '📎',
    '🖇️',
    '📏',
    '📐',
    '✂️',
    '🖊️',
    '🖋️',
    '✒️',
    '🖍️',
    '📝',
    '✏️',
    '🖌️',
    '🖍️',
    '📓',
    '📔',
    '📒',
    '📕',
    '📗',
    '📘',
    // Automoción y taller
    '🚗',
    '🚕',
    '🚙',
    '🚌',
    '🚎',
    '🏎️',
    '🚓',
    '🚑',
    '🚒',
    '🚐',
    '🛻',
    '🚚',
    '🚛',
    '🚜',
    '🦯',
    '🦽',
    '🦼',
    '🛴',
    '🚲',
    '🛵',
    '🏍️',
    '⚙️',
    '🔧',
    '🛠️',
    '⛽',
    '🛢️',
    '🚥',
    '🚦',
    '🚧',
    '⚠️',
    // Arte y creatividad
    '🎨',
    '🖼️',
    '🖌️',
    '🖍️',
    '✏️',
    '🎭',
    '🎪',
    '🎬',
    '🎤',
    '🎧',
    '🎼',
    '🎹',
    '🥁',
    '🎷',
    '🎺',
    '🎸',
    '🪕',
    '🎻',
    '📷',
    '📸',
    '📹',
    '📽️',
    '🎥',
    '📺',
    '📻',
    '📀',
    '💿',
    '📼',
    '🎞️',
    '📺',
    // Deportes
    '⚽',
    '🏀',
    '🏈',
    '⚾',
    '🥎',
    '🎾',
    '🏐',
    '🏉',
    '🥏',
    '🎱',
    '🪀',
    '🏓',
    '🏸',
    '🏒',
    '🏑',
    '🥍',
    '🏏',
    '🥅',
    '⛳',
    '🪁',
    '🏹',
    '🎣',
    '🤿',
    '🥊',
    '🥋',
    '🎽',
    '🛹',
    '🛷',
    '⛸️',
    '🥌',
    // Naturaleza y jardín
    '🌱',
    '🌿',
    '☘️',
    '🍀',
    '🎋',
    '🎍',
    '🌾',
    '🌵',
    '🌴',
    '🌳',
    '🌲',
    '🌰',
    '🥀',
    '🌹',
    '🌺',
    '🌻',
    '🌼',
    '🌷',
    '🌸',
    '💐',
    '🍁',
    '🍂',
    '🍃',
    '🌾',
    '🪴',
    '🎄',
    '🎃',
    '🎁',
    '🎀',
    '🎊',
    // Animales
    '🐶',
    '🐱',
    '🐭',
    '🐹',
    '🐰',
    '🦊',
    '🐻',
    '🐼',
    '🐨',
    '🐯',
    '🦁',
    '🐮',
    '🐷',
    '🐸',
    '🐵',
    '🐔',
    '🐧',
    '🐦',
    '🐤',
    '🦆',
    '🦅',
    '🦉',
    '🦇',
    '🐺',
    '🐗',
    '🐴',
    '🦄',
    '🐝',
    '🐛',
    '🦋',
    // Símbolos y señales
    '✅',
    '❌',
    '⭐',
    '🌟',
    '💫',
    '✨',
    '⚡',
    '🔥',
    '💥',
    '💢',
    '❗',
    '❓',
    '💯',
    '🔔',
    '🔕',
    '🎯',
    '🎪',
    '🎭',
    '🎬',
    '🎨',
    '🏆',
    '🥇',
    '🥈',
    '🥉',
    '🏅',
    '🎖️',
    '🎗️',
    '🏵️',
    '🎫',
    '🎟️',
  ],

  renderIconGrid() {
    return this.allIcons
      .map(
        (icon) =>
          `<div class="icon-option" data-action="selectIcon" data-params="'${icon}'" data-icon="${icon}">
        ${icon}
      </div>`
      )
      .join('');
  },

  toggleIconPicker() {
    const dropdown = document.getElementById('iconPickerDropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';

    // Cerrar al hacer click fuera
    if (dropdown.style.display === 'block') {
      setTimeout(() => {
        document.addEventListener('click', this.closeIconPickerOutside);
      }, 100);
    }
  },

  closeIconPickerOutside(e) {
    const dropdown = document.getElementById('iconPickerDropdown');
    const wrapper = e.target.closest('.icon-selector-wrapper');

    if (!wrapper && dropdown) {
      dropdown.style.display = 'none';
      document.removeEventListener('click', ConfiguracionAvanzada.closeIconPickerOutside);
    }
  },

  selectIcon(icon) {
    document.getElementById('iconoNegocio').value = icon;
    document.getElementById('selectedIconPreview').textContent = icon;
    document.getElementById('iconPickerDropdown').style.display = 'none';
    document.removeEventListener('click', this.closeIconPickerOutside);
    Utils.showToast(`Icono seleccionado: ${icon}`, 'info');
  },

  filterIcons(searchText) {
    const grid = document.getElementById('iconPickerGrid');
    const options = grid.querySelectorAll('.icon-option');
    const search = searchText.toLowerCase();

    options.forEach((option) => {
      const icon = option.dataset.icon;
      // Mostrar todos si no hay búsqueda
      if (!search) {
        option.style.display = 'flex';
      } else {
        // Ocultar por ahora - en el futuro se puede agregar búsqueda por categoría
        option.style.display = 'flex';
      }
    });
  },

  // ============================================
  // SETUP EVENT LISTENERS (Reemplaza eventos inline)
  // ============================================
  setupEventListeners() {
    // Evitar configurar listeners múltiples veces
    if (this._listenersInitialized) {
      return;
    }
    this._listenersInitialized = true;

    // Botones de header (usando data-action)
    document
      .querySelector('[data-action="exportarConfiguracion"]')
      ?.addEventListener('click', () => this.exportarConfiguracion());
    document
      .querySelector('[data-action="importarConfiguracion"]')
      ?.addEventListener('click', () => this.importarConfiguracion());
    document
      .querySelector('[data-action="restaurarDefecto"]')
      ?.addEventListener('click', () => this.restaurarDefecto());

    // Tabs - usar delegación de eventos para evitar duplicados
    const tabContainer =
      document.querySelector('.config-nav') ||
      document.querySelector('.config-tabs') ||
      document.querySelector('.config-sidebar-menu');
    if (tabContainer) {
      // Siempre configurar el listener en elementos nuevos (resetListeners limpia el flag)
      tabContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="cambiarTab"]');
        if (btn) {
          const tabName = btn.dataset.target;
          this.cambiarTab(tabName);
        }
      });
    }

    // Icon picker
    document
      .querySelector('.icon-picker-toggle')
      ?.addEventListener('click', () => this.toggleIconPicker());
    document
      .querySelector('.icon-search-input')
      ?.addEventListener('input', (e) => this.filterIcons(e.target.value));

    // Configurar listeners de contenido del tab
    this.setupTabContentListeners();
  },

  // Listeners específicos del contenido de cada tab (se pueden re-aplicar)
  setupTabContentListeners() {
    // Botones de guardar configuración - usar delegación de eventos
    const configContent = document.getElementById('configContent');
    if (configContent) {
      // Usar delegación de eventos sin flag - el listener se configura una sola vez
      // porque el contenedor configContent siempre es el mismo, solo su innerHTML cambia
      if (!configContent._saveListenerAdded) {
        configContent._saveListenerAdded = true;
        configContent.addEventListener('click', (e) => {
          const btn = e.target.closest('.btn-save-config');
          if (!btn) return;

          const section = btn.dataset.section;
          if (!section) return;

          const methodName = 'guardar' + section.charAt(0).toUpperCase() + section.slice(1);

          if (typeof this[methodName] === 'function') {
            this[methodName]();
            return;
          }

          if (
            section === 'ia' &&
            window.IAConfigPanel &&
            typeof IAConfigPanel.saveConfiguration === 'function'
          ) {
            IAConfigPanel.saveConfiguration();
            return;
          }

          console.warn(`Método ${methodName} no encontrado para la sección ${section}`);
        });
      }

      // === Listeners para Plantillas de Margen y Códigos de Descuento ===
      if (!configContent._pricingListenersAdded) {
        configContent._pricingListenersAdded = true;

        // Agregar plantilla de margen
        configContent.addEventListener('click', (e) => {
          if (e.target.closest('#btnAddMarginTemplate')) {
            this.addMarginTemplate();
          }
          if (e.target.closest('.btn-remove-margin-template')) {
            const item = e.target.closest('.pricing-template-item');
            if (item) item.remove();
          }
          if (e.target.closest('#btnAddDiscountCode')) {
            this.addDiscountCode();
          }
          if (e.target.closest('.btn-remove-discount-code')) {
            const item = e.target.closest('.discount-code-item');
            if (item) item.remove();
          }
        });
      }
      
      // === Listeners para acciones generales con data-action ===
      if (!configContent._actionListenersAdded) {
        configContent._actionListenersAdded = true;
        
        configContent.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action]');
          if (!btn) return;
          
          const action = btn.dataset.action;
          const params = btn.dataset.params;
          
          // Mapeo de acciones a métodos
          const actionMap = {
            'probarConexionTelegram': () => this.probarConexionTelegram(),
            'obtenerChatIdsAutomaticamente': () => this.obtenerChatIdsAutomaticamente(),
            'agregarChatIdTelegram': () => this.agregarChatIdTelegram(),
            'limpiarUpdatesTelegram': () => this.limpiarUpdatesTelegram(),
            'enviarMensajePruebaTelegram': () => {
              // Extraer el parámetro chatId si existe
              const chatId = params ? params.replace(/['"]/g, '') : null;
              this.enviarMensajePruebaTelegram(chatId);
            },
            'eliminarChatIdTelegram': () => {
              const chatId = params ? params.replace(/['"]/g, '') : null;
              if (chatId) this.eliminarChatIdTelegram(chatId);
            },
            // Acciones del Telegram IA Assistant
            'iniciarTelegramIA': () => this.iniciarTelegramIA(),
            'detenerTelegramIA': () => this.detenerTelegramIA(),
            'toggleTelegramChat': () => this.toggleTelegramChat(),
            'limpiarHistorialTelegram': () => this.limpiarHistorialTelegram()
          };
          
          if (actionMap[action]) {
            e.preventDefault();
            e.stopPropagation();
            actionMap[action]();
          }
        });
      }
    }
  },

  addMarginTemplate() {
    const container = document.getElementById('marginTemplatesContainer');
    if (!container) return;

    let list = container.querySelector('.pricing-templates-list');
    if (!list) {
      container.innerHTML = '<div class="pricing-templates-list"></div>';
      list = container.querySelector('.pricing-templates-list');
    }

    const idx = list.querySelectorAll('.pricing-template-item').length;
    const newItem = document.createElement('div');
    newItem.className = 'pricing-template-item';
    newItem.dataset.index = idx;
    newItem.innerHTML = `
      <div class="pricing-template-row">
        <div class="pricing-template-field">
          <label>Nombre</label>
          <input type="text" class="form-control form-control-sm" name="marginTemplateLabel" value="" placeholder="Ej: Cliente VIP">
        </div>
        <div class="pricing-template-field" style="width:100px;">
          <label>Margen %</label>
          <input type="number" class="form-control form-control-sm" name="marginTemplateMargin" value="30" min="0" max="500" step="0.5">
        </div>
        <div class="pricing-template-field" style="flex:2;">
          <label>Descripción</label>
          <input type="text" class="form-control form-control-sm" name="marginTemplateDesc" value="" placeholder="Descripción opcional">
        </div>
        <div class="pricing-template-actions">
          <button type="button" class="btn btn-sm btn-danger btn-remove-margin-template" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    list.appendChild(newItem);
  },

  addDiscountCode() {
    const container = document.getElementById('discountCodesContainer');
    if (!container) return;

    let list = container.querySelector('.discount-codes-list');
    if (!list) {
      container.innerHTML = '<div class="discount-codes-list"></div>';
      list = container.querySelector('.discount-codes-list');
    }

    const idx = list.querySelectorAll('.discount-code-item').length;
    const newItem = document.createElement('div');
    newItem.className = 'discount-code-item';
    newItem.dataset.index = idx;
    newItem.innerHTML = `
      <div class="discount-code-row">
        <div class="discount-code-field" style="width:120px;">
          <label>Código</label>
          <input type="text" class="form-control form-control-sm" name="discountCode" value="" placeholder="Ej: VIP20" style="text-transform:uppercase;">
        </div>
        <div class="discount-code-field">
          <label>Etiqueta</label>
          <input type="text" class="form-control form-control-sm" name="discountLabel" value="" placeholder="Ej: Descuento VIP">
        </div>
        <div class="discount-code-field" style="width:100px;">
          <label>Descuento %</label>
          <input type="number" class="form-control form-control-sm" name="discountPercent" value="10" min="0" max="100" step="0.5">
        </div>
        <div class="discount-code-field">
          <label>Restringido a</label>
          <select class="form-control form-control-sm" name="discountRestrictTo">
            <option value="" selected>Todos los clientes</option>
            <option value="empleados">Solo empleados</option>
            <option value="mayoristas">Solo mayoristas</option>
            <option value="vip">Clientes VIP</option>
          </select>
        </div>
        <div class="discount-code-actions">
          <button type="button" class="btn btn-sm btn-danger btn-remove-discount-code" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    list.appendChild(newItem);
  },

  // Método para resetear el estado de listeners (útil cuando se destruye el panel)
  resetListeners() {
    this._listenersInitialized = false;
  },
};

// Aplicar preferencias visuales tan pronto como la app esté lista
(function initVisualPreferences() {
  const aplicar = () => {
    try {
      // Usar modo silencioso para evitar spam de logs
      const config = ConfiguracionAvanzada.obtenerConfiguracion(true);
      if (config && config.visual) {
        ConfiguracionAvanzada.aplicarPreferenciasVisuales(config.visual);
      }
    } catch (error) {
      console.warn('No se pudieron aplicar las preferencias visuales iniciales:', error);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicar, { once: true });
  } else {
    aplicar();
  }
})();
