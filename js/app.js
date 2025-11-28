/* ========================================
   APLICACIÓN PRINCIPAL
   Inicialización y gestión de módulos
   Gestor Tienda Pro
   ======================================== */

// Aplicación principal
const App = {
  // Módulo actual
  currentModule: 'dashboard',

  // Datos en caché
  cache: {},
  businessType: 'tienda_general',
  isTallerBusiness: false,
  activeModules: new Set([
    'ventas',
    'historial_ventas',
    'productos',
    'inventario',
    'clientes',
    'finanzas',
    'documentos',
    'configuracion',
    'importador',
    'marketing',
    'publicidad',
    'notificaciones',
    'notificaciones_inteligentes',
    'sistema',
  ]),
  moduleNavMap: {
    ventas: 'ventas',
    'historial-ventas': 'ventas',
    'ordenes-trabajo': 'ordenes_trabajo',
    vehiculos: 'vehiculos',
    'mis-tareas': 'mis_tareas',
    agenda: 'agenda',
    catalogo: 'catalogo',
    productos: 'productos',
    compras: 'compras',
    stock: 'inventario',
    clientes: 'clientes',
    proveedores: 'proveedores',
    finanzas: 'finanzas',
    marketing: 'marketing',
    publicidad: 'publicidad',
    notificaciones_inteligentes: 'notificaciones_inteligentes',
    recordatorios: 'notificaciones_inteligentes',
    documentos: 'documentos',
    importador: 'importador',
    configuracion: 'configuracion',
    backup: 'backup',
    logs: 'logs',
    'historial-notificaciones': 'historial_notificaciones',
    'admin-hub': 'gestor_central',
  },
  moduleAliasMap: {
    caja: 'ventas',
    promociones: 'marketing',
    cotizaciones: 'ventas',
    servicios: 'ordenes_trabajo',
    diagnosticos: 'ordenes_trabajo',
    citas: 'agenda',
    mesas: 'agenda',
    comandas: 'ordenes_trabajo',
    menu: 'productos',
    cocina: 'ordenes_trabajo',
    delivery: 'notificaciones_inteligentes',
    recordatorios: 'notificaciones_inteligentes',
    medicamentos: 'productos',
    recetas: 'documentos',
    vencimientos: 'notificaciones_inteligentes',
    medidas: 'inventario',
    documentos_sri: 'documentos',
    cuentas: 'finanzas',
    'finanzas-mejorado': 'finanzas',
    contabilidad: 'finanzas',
    estadisticas: 'finanzas',
    nominas: 'nominas',
    empleados: 'nominas',
    personal: 'nominas',
    asistencia: 'nominas',
  },

  normalizeModuleId(value) {
    const key = (value || '').toString().trim();
    if (!key) {
      return '';
    }
    return this.moduleAliasMap[key] || key;
  },

  mapNavModuleToBusinessModule(navId) {
    const key = (navId || '').toString().trim();
    if (!key) {
      return null;
    }
    const mapped = this.moduleNavMap[key];
    return mapped ? this.normalizeModuleId(mapped) : null;
  },

  async syncBusinessContext(negocioId) {
    if (!negocioId) {
      return;
    }

    let switchedByAuth = false;
    const hasAuth = typeof Auth !== 'undefined' && Auth;

    if (hasAuth && typeof Auth.cambiarNegocio === 'function') {
      try {
        const currentNegocioId =
          (typeof Auth.getCurrentBusinessId === 'function' && Auth.getCurrentBusinessId()) ||
          (Auth.getSession && Auth.getSession()?.negocioId) ||
          null;

        if (currentNegocioId !== negocioId) {
          const result = await Auth.cambiarNegocio(negocioId);
          switchedByAuth = Boolean(result && result.success);
          if (!switchedByAuth && typeof Auth.setCurrentBusinessContext === 'function') {
            Auth.setCurrentBusinessContext(negocioId);
          }
        } else if (typeof Auth.setCurrentBusinessContext === 'function') {
          Auth.setCurrentBusinessContext(negocioId);
        }
      } catch (error) {
        console.warn('No se pudo sincronizar el contexto del negocio.', error);
        if (typeof Auth.setCurrentBusinessContext === 'function') {
          Auth.setCurrentBusinessContext(negocioId);
        }
      }
    } else if (hasAuth && typeof Auth.setCurrentBusinessContext === 'function') {
      Auth.setCurrentBusinessContext(negocioId);
    }

    if (
      !switchedByAuth &&
      typeof Database !== 'undefined' &&
      typeof Database.switchBusiness === 'function'
    ) {
      try {
        const currentDbBusiness =
          typeof Database.getCurrentBusiness === 'function' ? Database.getCurrentBusiness() : null;
        if (currentDbBusiness !== negocioId) {
          Database.switchBusiness(negocioId);
        }
      } catch (dbError) {
        console.warn('No se pudo sincronizar la base de datos con el negocio actual.', dbError);
      }
    }

    if (!switchedByAuth && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('negocio_actual', negocioId);
      } catch (storageError) {
        console.warn('No se pudo persistir el negocio actual en localStorage.', storageError);
      }
    }
  },

  setActiveModules(modules) {
    const normalized = Array.isArray(modules)
      ? modules.map((id) => this.normalizeModuleId(id)).filter(Boolean)
      : [];
    const fallback = ['ventas', 'productos', 'clientes', 'inventario'];
    this.activeModules = new Set(normalized.length ? normalized : fallback);
  },

  async loadActiveBusinessModules() {
    try {
      await Auth.ready();
      const response = await Auth._request('/negocios/mis');
      if (response && Array.isArray(response.negocios)) {
        const negocioActualId = response.negocioActual || response.negocios[0]?.id;
        const activeNegocio =
          response.negocios.find((item) => item.id === negocioActualId) || response.negocios[0];
        if (negocioActualId) {
          await this.syncBusinessContext(negocioActualId);
        } else if (activeNegocio?.id) {
          await this.syncBusinessContext(activeNegocio.id);
        }
        if (activeNegocio && Array.isArray(activeNegocio.modulos)) {
          this.setActiveModules(activeNegocio.modulos);
          this.applyBusinessVisibility();
          return;
        }
      }
    } catch (error) {
      console.warn('No se pudieron cargar los módulos del negocio activo.', error);
    }
    this.setActiveModules([]);
    this.applyBusinessVisibility();
  },

  /**
   * Inicializa la aplicación
   */
  async init() {
    console.log('Inicializando Gestor Tienda Pro...');

    try {
      await Auth.ready();
      // Verificación simple de autenticación
      if (!Auth.isAuthenticated()) {
        const sessionRestored = await Auth.verifySession();
        if (!sessionRestored || !Auth.isAuthenticated()) {
          window.location.href = 'index.html';
          return;
        }
      }

      await this.loadActiveBusinessModules();

      // La nueva base de datos se inicializa automáticamente.

      // Precargar datos esenciales
      const [productos, clientes, ventas] = await Promise.all([
        Database.getCollection('productos'),
        Database.getCollection('clientes'),
        Database.getCollection('ventas'),
      ]);

      // Verificar datos esenciales
      if (!productos || !clientes || !ventas) {
        throw new Error('Error al cargar datos esenciales');
      }

      // Configurar UI
      this.setupUI();

      // Cargar información de usuario
      this.loadUserInfo();

      // Cargar módulo inicial
      this.loadModule('dashboard');

      console.log('Aplicación inicializada correctamente');
    } catch (error) {
      console.error('Error al inicializar la aplicación:', error);
    }
  },

  /**
   * Configura la interfaz de usuario
   */
  setupUI() {
    // Toggle del menú móvil
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarClose = document.getElementById('sidebarClose');

    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.add('show');
        sidebarOverlay.classList.add('show');
      });
    }

    if (sidebarClose) {
      sidebarClose.addEventListener('click', () => {
        sidebar.classList.remove('show');
        sidebarOverlay.classList.remove('show');
      });
    }

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('show');
        sidebarOverlay.classList.remove('show');
      });
    }

    // Navegación entre módulos optimizada
    document.querySelectorAll('.nav-item[data-module]').forEach((item) => {
      item.addEventListener('click', async (e) => {
        e.preventDefault();
        const module = item.getAttribute('data-module');

        // Cerrar sidebar inmediatamente
        sidebar.classList.remove('show');
        sidebarOverlay.classList.remove('show');

        // Cargar módulo
        await this.loadModule(module);
      });
    });

    // Toggle del menú de usuario
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');

    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });

      document.addEventListener('click', () => {
        userDropdown.classList.remove('show');
      });

      const profileLink = userDropdown.querySelector('[data-action="open-profile"]');
      if (profileLink) {
        profileLink.addEventListener('click', (event) => {
          event.preventDefault();
          this.loadModule('perfil');
          userDropdown.classList.remove('show');
        });
      }

      const configLink = userDropdown.querySelector('[data-action="open-configuracion"]');
      if (configLink) {
        configLink.addEventListener('click', (event) => {
          event.preventDefault();
          this.loadModule('configuracion');
          userDropdown.classList.remove('show');
        });
      }
    }

    // Cerrar sesión
    const logoutBtns = [
      document.getElementById('logoutBtn'),
      document.getElementById('logoutBtnHeader'),
    ];

    logoutBtns.forEach((btn) => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();

          // Usar confirmación nativa para evitar problemas
          if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            console.log('🚪 Cerrando sesión...');

            // Cerrar sesión
            const success = Auth.logout();

            if (success) {
              console.log('✅ Sesión cerrada correctamente');

              // Mostrar mensaje si Utils está disponible
              if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Sesión cerrada correctamente', 'success');
              }

              // Redireccionar inmediatamente
              setTimeout(() => {
                window.location.href = 'index.html';
              }, 300);
            } else {
              console.error('❌ Error al cerrar sesión');

              if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Error al cerrar sesión', 'error');
              } else {
                alert('Error al cerrar sesión');
              }
            }
          }
        });
      }
    });

    // El nuevo theme-manager.js ahora gestiona el botón de tema automáticamente.

    // Ocultar elementos por rol
    if (!Auth.isSuperAdmin()) {
      document.querySelectorAll('.super-admin-only').forEach((el) => {
        el.style.display = 'none';
      });
    } else {
      document.querySelectorAll('.super-admin-only').forEach((el) => {
        el.style.display = '';
      });
    }

    // Ocultar elementos solo para admin
    if (!Auth.isAdmin()) {
      document.querySelectorAll('.admin-only').forEach((el) => {
        el.style.display = 'none';
      });
    }

    // Ocultar elementos solo para tecnicos
    const session = Auth.getSession();
    if (session) {
      const roleUtils = window.RoleUtils || null;
      const normalizedRole = roleUtils
        ? roleUtils.normalize(session.rol)
        : (session.rol || '').toString().toLowerCase();

      const tecnicoId = roleUtils ? roleUtils.ROLE_TECNICO : 'tecnico';
      if (normalizedRole !== tecnicoId) {
        document.querySelectorAll('.tecnico-only').forEach((el) => {
          el.style.display = 'none';
        });
      }
    }

    this.applyBusinessVisibility();
  },

  /**
   * Ajusta la visibilidad de módulos según el tipo de negocio y módulos activos
   */
  applyBusinessVisibility() {
    const resolvedTypeRaw = this.resolveBusinessType();
    const normalizedType = this.normalizeBusinessType(resolvedTypeRaw);
    const modulesSuggestTaller =
      this.activeModules instanceof Set &&
      (this.activeModules.has('taller') ||
        this.activeModules.has('ordenes_trabajo') ||
        this.activeModules.has('vehiculos'));

    // Verificar si es super admin O administrador del negocio
    const isSuper =
      typeof Auth !== 'undefined' && typeof Auth.isSuperAdmin === 'function' && Auth.isSuperAdmin();
    const isAdmin =
      typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();
    const hasAdminPrivileges = isSuper || isAdmin;

    const mostrarTaller =
      hasAdminPrivileges || modulesSuggestTaller || normalizedType === 'mecanica_automotriz';

    this.businessType = normalizedType;
    this.isTallerBusiness = mostrarTaller;

    let fallbackToDashboard = false;

    // Módulos que SIEMPRE están visibles para TODOS los usuarios y tiendas
    const alwaysVisibleModules = new Set([
      'ventas',
      'historial-ventas',
      'productos',
      'clientes',
      'dashboard',
      'inventario',
      'stock',
    ]);

    console.log('🔍 Aplicando visibilidad de módulos:', {
      activeModules: Array.from(this.activeModules || []),
      alwaysVisible: Array.from(alwaysVisibleModules),
      hasAdminPrivileges,
      businessType: normalizedType,
    });

    document.querySelectorAll('.nav-item[data-module]').forEach((item) => {
      const navModule = item.getAttribute('data-module');
      const mappedModule = this.mapNavModuleToBusinessModule(navModule);

      let allowed = true;

      // Módulos SIEMPRE visibles se muestran sin ninguna restricción
      if (alwaysVisibleModules.has(navModule)) {
        allowed = true;
        console.log(`✅ Módulo ${navModule} siempre visible`);
      }
      // Los administradores ven TODOS los módulos de su negocio
      else if (!hasAdminPrivileges && mappedModule) {
        allowed = this.activeModules instanceof Set ? this.activeModules.has(mappedModule) : true;
        console.log(
          `🔐 Módulo ${navModule} (${mappedModule}): ${allowed ? 'permitido' : 'bloqueado'}`
        );
      }

      if (!hasAdminPrivileges && item.hasAttribute('data-business')) {
        const targetBusiness = item.getAttribute('data-business');
        if (targetBusiness === 'taller' && !mostrarTaller) {
          allowed = false;
          console.log(`🔧 Módulo ${navModule} ocultado (taller no disponible)`);
        }
      }

      if (allowed) {
        item.style.display = '';
        item.style.visibility = 'visible';
        item.style.opacity = '1';
      } else {
        item.style.display = 'none';
        if (!hasAdminPrivileges && navModule === this.currentModule) {
          fallbackToDashboard = true;
        }
      }
    });

    document
      .querySelectorAll('[data-business="taller"]:not(.nav-item[data-module])')
      .forEach((element) => {
        element.style.display = mostrarTaller ? '' : 'none';
      });

    if (
      !hasAdminPrivileges &&
      !mostrarTaller &&
      ['vehiculos', 'mis-tareas', 'agenda', 'catalogo', 'ordenes-trabajo'].includes(
        this.currentModule
      )
    ) {
      fallbackToDashboard = true;
    }

    // No forzar dashboard si estamos en un módulo siempre disponible
    const alwaysAvailableModules = new Set([
      'ventas',
      'historial-ventas',
      'productos',
      'clientes',
      'inventario',
      'dashboard',
    ]);

    if (
      !hasAdminPrivileges &&
      fallbackToDashboard &&
      !alwaysAvailableModules.has(this.currentModule) &&
      this.currentModule !== 'dashboard'
    ) {
      this.loadModule('dashboard');
    }
  },

  resolveBusinessType() {
    const readers = [
      () => Database.get('configuracion'),
      () => Database.get('configuracionAvanzada'),
      () => Database.get('configTienda'),
    ];

    for (const read of readers) {
      try {
        const config = read();
        if (!config) {
          continue;
        }

        if (config.tipoNegocio) {
          return config.tipoNegocio;
        }

        if (config.tipoTienda) {
          return config.tipoTienda;
        }

        if (config.general && config.general.tipoNegocio) {
          return config.general.tipoNegocio;
        }
      } catch (error) {
        console.warn('No se pudo leer tipo de negocio desde una de las configuraciones.', error);
      }
    }

    return 'tienda_general';
  },

  normalizeBusinessType(tipo) {
    const value = (tipo || '').toString().trim().toLowerCase();

    if (['mecanica_automotriz', 'taller', 'taller_mecanico', 'mecanica'].includes(value)) {
      return 'mecanica_automotriz';
    }

    if (['personalizado', 'personalizada', 'otro'].includes(value)) {
      return 'personalizado';
    }

    if (['tienda_general', 'general', 'retail'].includes(value)) {
      return 'tienda_general';
    }

    return value || 'tienda_general';
  },

  /**
   * Verifica si un módulo está disponible para el tipo de negocio actual
   * @param {string} moduleName
   * @returns {boolean}
   */
  isModuleAvailableForBusiness(moduleName) {
    // Módulos siempre disponibles para TODOS los usuarios y tiendas
    const alwaysAvailable = new Set([
      'ventas',
      'historial-ventas',
      'productos',
      'clientes',
      'inventario',
      'dashboard',
    ]);

    if (alwaysAvailable.has(moduleName)) {
      return true;
    }

    // Super admin y administradores tienen acceso a TODO
    const isSuper =
      typeof Auth !== 'undefined' && typeof Auth.isSuperAdmin === 'function' && Auth.isSuperAdmin();
    const isAdmin =
      typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin();

    if ((moduleName === 'admin-hub' || moduleName === 'gestor_central') && !isSuper) {
      return false;
    }

    if (isSuper || isAdmin) {
      return true;
    }

    const mappedModule = this.mapNavModuleToBusinessModule(moduleName);
    if (
      mappedModule &&
      this.activeModules instanceof Set &&
      !this.activeModules.has(mappedModule)
    ) {
      console.log(`❌ Módulo ${moduleName} no está en los módulos activos del negocio`);
      return false;
    }

    const restrictedModules = new Set([
      'vehiculos',
      'mis-tareas',
      'agenda',
      'catalogo',
      'ordenes-trabajo',
    ]);
    if (restrictedModules.has(moduleName) && !this.isTallerBusiness) {
      return false;
    }

    return true;
  },

  /**
   * Carga información del usuario en la UI
   */
  async loadUserInfo() {
    const session = Auth.getSession();
    if (!session) return;

    // Nombre de usuario en el header
    const userNameElements = document.querySelectorAll('#currentUserName, #userName');
    userNameElements.forEach((el) => {
      if (el) el.textContent = session.nombre;
    });

    // Rol del usuario
    const userRoleElement = document.getElementById('userRole');
    if (userRoleElement) {
      userRoleElement.textContent = this.formatRoleLabel(session.rol);
    }

    // Cargar información del negocio actual y nombre de la tienda
    try {
      const response = await Auth._request('/negocios/actual');
      if (response && response.success && response.negocio) {
        const negocio = response.negocio;
        // PRIORIZAR nombreComercial sobre otros nombres
        const nombreTienda =
          negocio.nombreComercial ||
          negocio.configTienda?.nombre ||
          negocio.nombre ||
          'Gestor Tienda';

        // Actualizar nombre de la tienda en la sidebar
        const storeNameElement = document.getElementById('storeName');
        if (storeNameElement) {
          storeNameElement.textContent = nombreTienda;
        }

        // Actualizar nombre de la tienda en el header
        const storeNameHeaderElement = document.getElementById('storeNameHeader');
        if (storeNameHeaderElement) {
          storeNameHeaderElement.textContent = nombreTienda;
        }

        console.log('✅ Información de tienda cargada:', nombreTienda);
        console.log('📋 Detalles del negocio:', {
          nombreComercial: negocio.nombreComercial,
          nombreNegocio: negocio.nombre,
          tipo: negocio.tipo,
        });
      }
    } catch (error) {
      console.warn('No se pudo cargar información del negocio:', error);
    }
  },

  formatRoleLabel(role) {
    const utils = window.RoleUtils || null;
    const normalized = utils ? utils.normalize(role) : (role || '').toString().toLowerCase();

    if (utils) {
      switch (normalized) {
        case utils.ROLE_SUPER_ADMIN:
          return 'Superadministrador';
        case utils.ROLE_ADMIN:
          return 'Administrador';
        case utils.ROLE_TECNICO:
          return 'Técnico';
        case utils.ROLE_VENDEDOR:
          return 'Vendedor';
        default:
          return normalized || 'Usuario';
      }
    }

    if (normalized === 'superadmin') return 'Superadministrador';
    if (normalized === 'admin') return 'Administrador';
    if (normalized === 'tecnico' || normalized === 'mecanico') return 'Técnico';
    if (normalized === 'vendedor') return 'Vendedor';
    return normalized || 'Usuario';
  },

  /**
   * Carga un módulo específico
   * @param {string} moduleName - Nombre del módulo
   */
  async loadModule(moduleName) {
    const contentArea = document.getElementById('contentArea');
    const pageTitle = document.getElementById('pageTitle');

    console.log(`📦 Intentando cargar módulo: ${moduleName}`);

    if (!contentArea) {
      console.error('❌ No se encontró contentArea');
      return;
    }

    // Evitar carga duplicada si ya estamos cargando este módulo
    if (this._loadingModule === moduleName) {
      console.log(`⏳ Módulo ${moduleName} ya está cargándose, esperando...`);
      return;
    }

    // Evitar recarga si es el mismo módulo y no hay cambio de negocio
    if (this.currentModule === moduleName && !window.isBusinessSwitching) {
      console.log(`⚡ Módulo ${moduleName} ya cargado, omitiendo recarga`);
      return;
    }

    this._loadingModule = moduleName;

    // Ajustar clases de layout especiales por módulo
    const layoutClasses = ['content-area--historial'];
    layoutClasses.forEach((cls) => contentArea.classList.remove(cls));
    if (moduleName === 'historial-ventas') {
      contentArea.classList.add('content-area--historial');
    }

    if (!this.isModuleAvailableForBusiness(moduleName)) {
      console.warn(`⚠️ Módulo ${moduleName} no disponible para este negocio`);
      if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
        Utils.showToast('Módulo no disponible para este tipo de negocio', 'info');
      }
      return;
    }

    console.log(`✅ Módulo ${moduleName} disponible, procediendo a cargar...`);

    // Actualizar navegación activa
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.remove('active');
    });

    const activeItem = document.querySelector(`[data-module="${moduleName}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }

    // Mostrar loading
    const loadingOverlay = document.getElementById('loadingOverlay');

    if (moduleName === 'admin-hub' && !Auth.isSuperAdmin()) {
      if (loadingOverlay) loadingOverlay.style.display = 'none';
      if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
        Utils.showToast('No tienes permisos para acceder al Gestor Central.', 'error');
      }
      return;
    }

    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    // Actualizar título
    const titles = {
      dashboard: 'Dashboard',
      ventas: 'Nueva Venta (POS)',
      'historial-ventas': 'Historial de Ventas',
      vehiculos: 'Gestión de Vehículos',
      'ordenes-trabajo': 'Órdenes de Trabajo',
      'mis-tareas': 'Mis Tareas',
      agenda: 'Agenda del Taller',
      productos: 'Productos',
      compras: 'Compras',
      stock: 'Control de Stock',
      clientes: 'Clientes',
      proveedores: 'Proveedores',
      finanzas: 'Finanzas',
      marketing: 'Marketing Personalizado IA',
      publicidad: 'Publicidad en Redes Sociales',
      recordatorios: 'Notificaciones IA',
      notificaciones_inteligentes: 'Notificaciones IA',
      documentos: 'Documentos SRI',
      catalogo: 'Catálogo Técnico',
      usuarios: 'Gestión de Usuarios',
      logs: 'Logs del Sistema',
      'historial-notificaciones': 'Historial de Notificaciones',
      configuracion: 'Configuración',
      backup: 'Backup y Datos',
      perfil: 'Mi Perfil',
      importador: 'Importar CSV',
      'admin-hub': 'Gestor Central',
    };

    if (pageTitle) {
      pageTitle.textContent = titles[moduleName] || moduleName;
    }

    // Ocultar o mostrar el menú lateral según el módulo
    const mainContent = document.querySelector('.main-content');
    if (moduleName === 'ventas') {
      document.body.classList.add('ventas-fullscreen');
    } else {
      document.body.classList.remove('ventas-fullscreen');
    }

    this.currentModule = moduleName;

    // Cargar contenido del módulo
    try {
      const container = contentArea;
      switch (moduleName) {
        case 'dashboard':
          if (window.Dashboard) {
            await Dashboard.render(container);
          } else {
            this.renderDashboard(container);
          }
          break;
        case 'ventas':
          console.log('🛒 Cargando módulo de ventas (POS)');
          if (window.VentasMejorado) {
            console.log('✅ VentasMejorado está disponible');
            await VentasMejorado.renderPOS(container);
            console.log('✅ POS renderizado');
          } else {
            console.error('❌ VentasMejorado no está disponible en window');
          }
          break;
        case 'historial-ventas':
          console.log('📜 Cargando historial de ventas');
          if (window.VentasMejorado) {
            console.log('✅ VentasMejorado está disponible');
            await VentasMejorado.renderHistorial(container);
            console.log('✅ Historial renderizado');
          } else {
            console.error('❌ VentasMejorado no está disponible en window');
          }
          break;
        case 'vehiculos':
          if (window.Vehiculos) {
            container.innerHTML = Vehiculos.render();
            Vehiculos.init();
          }
          break;
        case 'ordenes-trabajo':
          if (window.OrdenesTrabajo) {
            container.innerHTML = OrdenesTrabajo.render();
            OrdenesTrabajo.init();
          }
          break;
        case 'mis-tareas':
          if (window.MisTareas) {
            container.innerHTML = MisTareas.render();
            MisTareas.init();
          }
          break;
        case 'agenda':
          if (window.Agenda) {
            container.innerHTML = Agenda.render();
            Agenda.init();
          }
          break;
        case 'productos':
          if (window.Productos) await Productos.render(container);
          break;
        case 'inventario':
          // Redirigir inventario al módulo stock
          console.log('[App] Redirigiendo inventario -> stock');
          return this.loadModule('stock');
        case 'compras':
          if (window.Compras) await Compras.render(container);
          break;
        case 'stock':
          console.log('[App] Cargando módulo Stock...', {
            hasProductos: !!window.Productos,
            hasRenderStock: typeof window.Productos?.renderStock === 'function',
            container,
          });

          // Esperar a que Productos se cargue si aún no está disponible
          if (!window.Productos) {
            console.warn('[App] Productos no está disponible aún, esperando...');

            // Intentar esperar hasta 3 segundos
            let attempts = 0;
            const maxAttempts = 30; // 30 * 100ms = 3000ms

            while (!window.Productos && attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 100));
              attempts++;
            }

            console.log('[App] Después de espera:', {
              hasProductos: !!window.Productos,
              attempts,
              timeWaited: attempts * 100 + 'ms',
            });
          }

          // Verificar si Productos está disponible
          if (!window.Productos) {
            console.error('[App] ERROR: window.Productos no está definido después de esperar');
            container.innerHTML = `
              <div class="card">
                <div class="card-body" style="text-align: center; padding: 40px;">
                  <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #e74c3c; margin-bottom: 20px;"></i>
                  <h3>Error al cargar Control de Stock</h3>
                  <p>El módulo Productos no se ha cargado correctamente.</p>
                  <p style="color: #95a5a6; font-size: 14px; margin-top: 10px;">
                    Verifica que el archivo <code>js/productos.js</code> existe y se carga correctamente.
                  </p>
                  <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 20px;">
                    <i class="fas fa-sync"></i> Recargar página
                  </button>
                </div>
              </div>
            `;
            break;
          }

          // Verificar si renderStock existe
          if (typeof window.Productos.renderStock !== 'function') {
            console.error('[App] ERROR: Productos.renderStock no es una función');
            container.innerHTML = `
              <div class="card">
                <div class="card-body" style="text-align: center; padding: 40px;">
                  <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #e74c3c; margin-bottom: 20px;"></i>
                  <h3>Error en módulo de Stock</h3>
                  <p>El método renderStock no está disponible.</p>
                  <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-sync"></i> Recargar página
                  </button>
                </div>
              </div>
            `;
            break;
          }

          // Todo OK, renderizar
          console.log('[App] Llamando a Productos.renderStock...');
          await window.Productos.renderStock(container);
          console.log('[App] ✅ Stock renderizado exitosamente');
          break;
        case 'clientes':
          if (window.Clientes) await Clientes.render(container);
          break;
        case 'proveedores':
          if (window.Proveedores) await Proveedores.render(container);
          break;
        case 'finanzas':
          if (window.Finanzas) await Finanzas.render(container);
          break;
        case 'nominas':
          if (window.Nominas) await Nominas.render(container);
          break;
        case 'marketing':
          if (window.Marketing) await Marketing.render(container);
          break;
        case 'publicidad':
          if (window.Publicidad) Publicidad.render(container);
          break;
        case 'recordatorios':
          console.warn(
            'El módulo "recordatorios" está deprecado, redirigiendo a Notificaciones IA.'
          );
          if (window.NotificationHub) {
            await NotificationHub.init();
            NotificationHub.render(container);
          } else if (window.Recordatorios) {
            Recordatorios.render(container);
          }
          break;
        case 'notificaciones_inteligentes':
          if (window.NotificationHub) {
            await NotificationHub.init();
            NotificationHub.render(container);
          } else {
            container.innerHTML = `
              <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                  <strong>Módulo no disponible</strong>
                  <p>El sistema de Notificaciones IA no está cargado.</p>
                </div>
              </div>
            `;
          }
          break;
        case 'documentos':
          if (window.Facturacion && typeof Facturacion.render === 'function') {
            Facturacion.render(container);
          }
          break;
        case 'sri-panel':
          if (window.SRIPanel && typeof SRIPanel.render === 'function') {
            container.innerHTML = SRIPanel.render();
            SRIPanel.initialize();
          } else {
            container.innerHTML = `
              <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                Módulo SRI Panel no disponible
              </div>
            `;
          }
          break;
        case 'catalogo':
          if (window.Catalogo && typeof Catalogo.render === 'function') {
            await Catalogo.render(container);
          }
          break;
        case 'usuarios':
          await this.renderUsuarios(container);
          break;
        case 'logs':
          if (window.Logs) {
            container.innerHTML = Logs.render();
            Logs.init();
          }
          break;
        case 'historial-notificaciones':
          if (window.HistorialNotificaciones) {
            container.innerHTML = HistorialNotificaciones.render();
            HistorialNotificaciones.init();
          }
          break;
        case 'configuracion':
          // Usar el módulo de configuración avanzada si está disponible
          if (window.ConfiguracionAvanzada) {
            ConfiguracionAvanzada.render(container);
          } else if (window.ConfigTienda) {
            container.innerHTML = ConfigTienda.render();
          } else {
            this.renderConfiguracion(container);
          }
          break;
        case 'backup':
          if (window.Backup) Backup.render(container);
          break;
        case 'importador':
          if (window.Importador) Importador.render(container);
          break;
        case 'admin-hub':
          if (window.AdminHub) {
            await AdminHub.render(container);
          }
          break;
        case 'super-admin':
          if (window.SuperAdminTools) {
            try {
              superAdminTools = new SuperAdminTools();
              await superAdminTools.initialize();
            } catch (error) {
              console.error('Error inicializando Super Admin Tools:', error);
              container.innerHTML = `
                <div class="alert alert-error">
                  <i class="fas fa-exclamation-circle"></i>
                  <div>
                    <strong>Error al cargar Super Admin Tools</strong>
                    <p>${error.message}</p>
                    <p class="text-muted">Verifica que tengas permisos de super_admin</p>
                  </div>
                </div>
              `;
            }
          } else {
            container.innerHTML = `
              <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                  <strong>Módulo no disponible</strong>
                  <p>El módulo Super Admin Tools no está cargado.</p>
                </div>
              </div>
            `;
          }
          break;
        case 'perfil':
          if (window.Perfil) {
            container.innerHTML = Perfil.render();
            await Perfil.init();
          } else {
            this.renderPerfil(container);
          }
          break;
        default:
          container.innerHTML = `
            <div class="empty-state">
              <i class="fas fa-exclamation-triangle"></i>
              <h3>Módulo no encontrado</h3>
              <p>El módulo "${moduleName}" no está disponible o está en desarrollo.</p>
            </div>
          `;
      }
    } catch (error) {
      console.error('Error al cargar módulo:', error);
      contentArea.innerHTML = `
        <div class="alert alert-error">
          <i class="fas fa-exclamation-circle"></i>
          <div>
            <strong>Error al cargar el módulo</strong>
            <p>${error.message}</p>
          </div>
        </div>
      `;
    } finally {
      // Limpiar bandera de carga
      this._loadingModule = null;

      if (window.Utils && typeof Utils.applyResponsiveTables === 'function') {
        Utils.applyResponsiveTables(contentArea);
      }
      if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
  },

  /**
   * Renderiza el dashboard principal
   * @param {HTMLElement} container - Contenedor
   */
  async renderDashboard(container) {
    const ventas = await Database.getCollection('ventas');
    const productos = await Database.getCollection('productos');
    const recordatorios = await Database.getCollection('recordatorios');

    // Calcular estadísticas del día
    const hoy = Utils.startOfDay();
    const ventasHoy = ventas.filter((v) => {
      const fechaVenta = new Date(v.fecha);
      return fechaVenta >= hoy && v.estado === 'completada';
    });

    const totalVentasHoy = Utils.sumBy(ventasHoy, 'total');
    const productosStock = productos.filter((p) => p.stock > 0).length;
    const productosStockBajo = productos.filter((p) => p.stock <= p.stockMinimo).length;
    const recordatoriosPendientes = recordatorios.filter((r) => !r.completado).length;

    container.innerHTML = `
      <!-- Cards de estadísticas -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon success">
              <i class="fas fa-dollar-sign"></i>
            </div>
          </div>
          <div class="stat-card-value">${Utils.formatCurrency(totalVentasHoy)}</div>
          <div class="stat-card-label">Ventas de Hoy</div>
          <div class="stat-card-change positive">
            <i class="fas fa-arrow-up"></i> ${ventasHoy.length} transacciones
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon primary">
              <i class="fas fa-box"></i>
            </div>
          </div>
          <div class="stat-card-value">${productosStock}</div>
          <div class="stat-card-label">Productos en Stock</div>
          <div class="stat-card-change ${productosStockBajo > 0 ? 'negative' : 'positive'}">
            <i class="fas fa-exclamation-triangle"></i> ${productosStockBajo} bajos
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon warning">
              <i class="fas fa-bell"></i>
            </div>
          </div>
          <div class="stat-card-value">${recordatoriosPendientes}</div>
          <div class="stat-card-label">Recordatorios Pendientes</div>
          <div class="stat-card-change">
            <i class="fas fa-clock"></i> Próximos eventos
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon danger">
              <i class="fas fa-chart-line"></i>
            </div>
          </div>
          <div class="stat-card-value">${productos.length}</div>
          <div class="stat-card-label">Total Productos</div>
          <div class="stat-card-change positive">
            <i class="fas fa-check"></i> Inventario activo
          </div>
        </div>
      </div>

      <!-- Accesos rápidos -->
      <div class="card mt-3">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-rocket"></i> Accesos Rápidos</h3>
        </div>
        <div class="card-body">
          <div class="grid grid-4 gap-md">
            <button class="btn btn-primary" type="button" data-module-trigger="ventas">
              <i class="fas fa-cash-register"></i> Nueva Venta
            </button>
            <button class="btn btn-secondary" type="button" data-module-trigger="productos">
              <i class="fas fa-box"></i> Productos
            </button>
            <button class="btn btn-success" type="button" data-module-trigger="estadisticas">
              <i class="fas fa-chart-bar"></i> Estadísticas
            </button>
            <button class="btn btn-warning" type="button" data-module-trigger="recordatorios">
              <i class="fas fa-bell"></i> Recordatorios
            </button>
          </div>
        </div>
      </div>

      <!-- Productos con stock bajo -->
      ${
        productosStockBajo > 0
          ? `
        <div class="card mt-3">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-exclamation-triangle text-warning"></i> Productos con Stock Bajo</h3>
          </div>
          <div class="card-body">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock Actual</th>
                    <th>Stock Mínimo</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  ${productos
                    .filter((p) => p.stock <= p.stockMinimo)
                    .slice(0, 5)
                    .map(
                      (p) => `
                    <tr>
                      <td>${p.nombre}</td>
                      <td><span class="badge badge-danger">${p.stock}</span></td>
                      <td>${p.stockMinimo}</td>
                      <td>
                        <button class="btn btn-sm btn-primary" type="button" data-module-trigger="compras">
                          <i class="fas fa-shopping-cart"></i> Comprar
                        </button>
                      </td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `
          : ''
      }

      <!-- Bienvenida -->
      <div class="alert alert-info mt-3">
        <i class="fas fa-info-circle"></i>
        <div>
          <strong>¡Bienvenido al Gestor Tienda Pro!</strong>
          <p>Sistema completo de gestión para tu negocio. Navega por el menú lateral para acceder a todas las funcionalidades.</p>
        </div>
      </div>
    `;
    this.bindDashboardActions(container);
  },

  bindDashboardActions(container) {
    if (!container) {
      return;
    }

    const triggers = container.querySelectorAll('[data-module-trigger]');
    triggers.forEach((button) => {
      if (!button) {
        return;
      }

      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const targetModule = button.getAttribute('data-module-trigger');
        if (targetModule) {
          await this.loadModule(targetModule);
        }
      });
    });
  },

  bindUsuariosEvents(container) {
    if (!container) {
      return;
    }

    const createBtn = container.querySelector('[data-user-action="create"]');
    if (createBtn) {
      createBtn.addEventListener('click', (event) => {
        event.preventDefault();
        this.showCreateUserModal();
      });
    }

    container.querySelectorAll('[data-user-action="edit"]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const userId = button.getAttribute('data-user-id');
        if (userId) {
          this.editUser(userId);
        }
      });
    });

    container.querySelectorAll('[data-user-action="delete"]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const userId = button.getAttribute('data-user-id');
        if (userId) {
          this.deleteUser(userId);
        }
      });
    });
  },

  /**
   * Renderiza gestión de usuarios (solo admin)
   */
  async renderUsuarios(container) {
    if (!Auth.isAdmin()) {
      container.innerHTML = `
        <div class="alert alert-error">
          <i class="fas fa-lock"></i>
          <div>No tienes permisos para acceder a esta sección.</div>
        </div>
      `;
      return;
    }

    let usuarios = [];
    try {
      const fetched = await Auth.getAllUsers();
      usuarios = Array.isArray(fetched) ? fetched : [];
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
        Utils.showToast('No se pudieron cargar los usuarios', 'error');
      }
    }

    const session = Auth.getSession();
    const currentUserId = session?.id || session?.userId || null;

    container.innerHTML = `
      <div class="data-table">
        <div class="table-header">
          <h3 class="table-title">Usuarios del Sistema</h3>
          <button class="btn btn-primary" type="button" data-user-action="create">
            <i class="fas fa-plus"></i> Nuevo Usuario
          </button>
        </div>
        <div class="table-body">
          <table>
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
                  <td><span class="badge ${u.rol === 'admin' ? 'badge-primary' : 'badge-secondary'}">${u.rol}</span></td>
                  <td><span class="badge ${u.activo ? 'badge-success' : 'badge-danger'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary" type="button" data-user-action="edit" data-user-id="${u.id}" title="Editar">
                          <i class="fas fa-edit"></i>
                        </button>
                        ${
                          u.id !== currentUserId
                            ? `
                          <button class="btn btn-sm btn-danger" type="button" data-user-action="delete" data-user-id="${u.id}" title="Eliminar">
                            <i class="fas fa-trash"></i>
                          </button>
                        `
                            : ''
                        }
                    </div>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindUsuariosEvents(container);
  },

  /**
   * Renderiza perfil del usuario (método legacy - usar módulo Perfil)
   */
  renderPerfil(container) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        <div>
          <strong>Cargando perfil...</strong>
          <p>Por favor espera mientras se carga el módulo de perfil.</p>
        </div>
      </div>
    `;
    console.warn('Módulo Perfil no cargado, usando renderizado legacy');
  },

  /**
   * Renderiza configuración del sistema
   */
  renderConfiguracion(container) {
    const data = Database.load();
    const config = data.configuracion || {};

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-cog"></i> Configuración del Negocio</h3>
        </div>
        <div class="card-body">
          <form id="configForm">
            <div class="grid grid-2 gap-lg">
              <div class="form-group">
                <label>Nombre del Negocio</label>
                <input type="text" name="nombreNegocio" value="${config.nombreNegocio || ''}" required>
              </div>
              <div class="form-group">
                <label>RUC / NIT</label>
                <input type="text" name="ruc" value="${config.ruc || ''}">
              </div>
              <div class="form-group">
                <label>Teléfono</label>
                <input type="tel" name="telefono" value="${config.telefono || ''}">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" value="${config.email || ''}">
              </div>
              <div class="form-group">
                <label>Dirección</label>
                <input type="text" name="direccion" value="${config.direccion || ''}">
              </div>
              <div class="form-group">
                <label>Moneda</label>
                <select name="moneda">
                  <option value="USD" ${config.moneda === 'USD' ? 'selected' : ''}>USD - Dólar</option>
                  <option value="EUR" ${config.moneda === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                </select>
              </div>
              <div class="form-group">
                <label>IVA (%)</label>
                <input type="number" name="iva" value="${config.iva || 15}" step="0.01">
              </div>
              <div class="form-group">
                <label>Stock Mínimo por Defecto</label>
                <input type="number" name="stockMinimo" value="${config.stockMinimo || 10}">
              </div>
            </div>
            <button type="submit" class="btn btn-primary mt-3">
              <i class="fas fa-save"></i> Guardar Configuración
            </button>
          </form>
        </div>
      </div>
    `;

    document.getElementById('configForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const newConfig = {};
      formData.forEach((value, key) => {
        newConfig[key] = value;
      });

      data.configuracion = newConfig;
      Database.save(data);
      showToast('Configuración guardada correctamente', 'success');
    });
  },

  showCreateUserModal() {
    if (window.UserManagement && typeof UserManagement.showCreateUserModal === 'function') {
      UserManagement.showCreateUserModal();
      return;
    }
    this.notifyMissingUserManagement('crear usuarios');
  },

  editUser(userId) {
    if (window.UserManagement && typeof UserManagement.editUser === 'function') {
      UserManagement.editUser(userId);
      return;
    }
    this.notifyMissingUserManagement('editar usuarios');
  },

  deleteUser(userId) {
    if (window.UserManagement && typeof UserManagement.deleteUser === 'function') {
      UserManagement.deleteUser(userId);
      return;
    }
    this.notifyMissingUserManagement('eliminar usuarios');
  },

  notifyMissingUserManagement(action) {
    const message = `No se pudo ${action}. El módulo de gestión de usuarios no está disponible.`;
    if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
      Utils.showToast(message, 'info');
    } else {
      console.warn(message);
    }
  },

  /**
   * Registra Service Worker para PWA
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js');
        console.log('Service Worker registrado:', registration);
      } catch (error) {
        console.log('Error al registrar Service Worker:', error);
      }
    }
  },
};

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar Agente IA Flotante
  if (typeof AgendaIAAgent !== 'undefined') {
    console.log('🤖 Inicializando Agente IA...');
    // AgendaIAAgent es un objeto singleton, no una clase
    AgendaIAAgent.init();
  } else {
    console.warn('⚠️ AgendaIAAgent no está definido. El botón flotante no se creará.');
  }

  // Registrar Service Worker de saneamiento para evitar SW heredados defectuosos
  App.registerServiceWorker();
});

// Exportar App globalmente
window.App = App;
