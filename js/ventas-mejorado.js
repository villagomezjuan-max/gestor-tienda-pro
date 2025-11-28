const VentasMejorado = {
  state: {
    productos: [],
    clientes: [],
    carrito: [],
    clienteSeleccionado: null,
    busqueda: '',
    descuentoPorcentaje: 0,
    descuentoMonto: 0,
    categoriaFiltro: '',
    historial: [],
    historialResumen: null,
    historialFiltros: null,
    historialCargando: false,
    historialCharts: {},
    // Estado para navegación móvil
    mobileCurrentView: 'products', // 'products' | 'cart' | 'payment'
    mobilePaymentMethod: 'efectivo',
    mobilePaymentAmount: 0,
  },

  historialDom: {},
  ventaCache: new Map(),
  _qrScannerInstance: null,
  _qrScannerOverlay: null,
  _qrScannerScriptPromise: null,
  _qrScannerProcessing: false,
  _qrScannerLastResult: '',
  _qrScannerLastScanTs: 0,
  _qrPreferredCameraId: null,
  _qrScannerStatusEl: null,
  _qrAvailableCameras: [],
  _qrFloatingCollapsed: false,
  _qrVisibilityListener: null,
  _qrBeforeUnloadListener: null,
  _qrAutoStopInterval: null,
  _qrDragStartX: 0,
  _qrDragStartY: 0,
  _qrDragOffsetX: 0,
  _qrDragOffsetY: 0,
  _qrIsDragging: false,
  _qrAutoCloseTimer: null,
  _qrAutoCloseSeconds: 60, // 1 minuto por defecto
  _qrTimeRemaining: 60,
  _qrTimerInterval: null,
  _qrIndicadorBtn: null,
  _persistenceKey: 'ventas_mejorado_cart',
  _persistenceVersion: '1.0',
  _persistenceInitialized: false,

  // ========================================
  // FUNCIONES MÓVILES
  // ========================================

  isMobileView() {
    return window.innerWidth <= 768;
  },

  initMobileNavigation() {
    if (!this.isMobileView()) {
      console.log('⚠️ No es vista móvil, abortando inicialización');
      return;
    }

    console.log('🔧 Iniciando navegación móvil...');

    // Crear barra de navegación móvil
    const posContainer = document.querySelector('.pos-container-mejorado');
    if (!posContainer) {
      console.warn(
        '⚠️ No se encontró .pos-container-mejorado - página no requiere navegación móvil'
      );
      return;
    }

    console.log('✓ Contenedor POS encontrado');

    // Insertar tabs móvil si no existen
    if (!document.querySelector('.mobile-nav-tabs')) {
      console.log('📲 Creando tabs móviles...');
      const navTabs = document.createElement('div');
      navTabs.className = 'mobile-nav-tabs';
      navTabs.innerHTML = `
        <button class="mobile-nav-tab active" data-view="products">
          <i class="fas fa-box"></i>
          <span>Productos</span>
        </button>
        <button class="mobile-nav-tab" data-view="cart">
          <i class="fas fa-shopping-cart"></i>
          <span>Carrito</span>
          <span class="tab-badge" id="mobile-cart-badge" style="display: none;">0</span>
        </button>
        <button class="mobile-nav-tab" data-view="payment">
          <i class="fas fa-credit-card"></i>
          <span>Pagar</span>
        </button>
      `;

      posContainer.insertBefore(navTabs, posContainer.firstChild);
      console.log('✅ Tabs móviles creadas');

      // Agregar eventos a las tabs
      navTabs.querySelectorAll('.mobile-nav-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
          const view = tab.dataset.view;
          console.log('👆 Tab clickeada:', view);
          this.showMobileView(view);
        });
      });
    } else {
      console.log('ℹ️ Tabs móviles ya existen');
    }

    // Envolver las secciones en contenedor móvil si no existe
    if (!document.querySelector('.mobile-views-container')) {
      console.log('📦 Creando contenedor de vistas...');
      const productsSection = posContainer.querySelector('.pos-products-section');
      const cartSection = posContainer.querySelector('.pos-cart-section');

      const viewsContainer = document.createElement('div');
      viewsContainer.className = 'mobile-views-container';

      if (productsSection) {
        viewsContainer.appendChild(productsSection);
        console.log('✓ Sección productos agregada');
      }
      if (cartSection) {
        viewsContainer.appendChild(cartSection);
        console.log('✓ Sección carrito agregada');
      }

      posContainer.appendChild(viewsContainer);
      console.log('✅ Contenedor de vistas creado');
    } else {
      console.log('ℹ️ Contenedor de vistas ya existe');
    }

    // Crear sección de pago si no existe
    if (!document.querySelector('.pos-payment-section')) {
      console.log('💳 Creando sección de pago...');
      this.createPaymentSection();
      console.log('✅ Sección de pago creada');
    } else {
      console.log('ℹ️ Sección de pago ya existe');
    }

    // Mostrar vista inicial
    console.log('🎯 Mostrando vista inicial: products');
    this.showMobileView('products');
    this.updateMobileCartBadge();
    console.log('✅✅✅ Navegación móvil completamente inicializada');
  },

  createPaymentSection() {
    const container =
      document.querySelector('.mobile-views-container') ||
      document.querySelector('.pos-container-mejorado');
    if (!container) return;

    const paymentSection = document.createElement('div');
    paymentSection.className = 'pos-payment-section';
    paymentSection.innerHTML = `
      <div class="payment-mobile-container">
        <div class="payment-total-summary">
          <div class="payment-total-label">Total a Pagar</div>
          <div class="payment-total-amount" id="mobile-payment-total">$0.00</div>
        </div>

        <div class="payment-methods-mobile">
          <h4 style="margin: 0 0 12px 0; color: var(--text-primary);">
            <i class="fas fa-wallet"></i> Método de Pago
          </h4>
          <button class="payment-method-btn active" data-method="efectivo">
            <i class="fas fa-money-bill-wave"></i>
            <span>Efectivo</span>
            <div class="radio-indicator"></div>
          </button>
          <button class="payment-method-btn" data-method="tarjeta">
            <i class="fas fa-credit-card"></i>
            <span>Tarjeta</span>
            <div class="radio-indicator"></div>
          </button>
          <button class="payment-method-btn" data-method="transferencia">
            <i class="fas fa-exchange-alt"></i>
            <span>Transferencia</span>
            <div class="radio-indicator"></div>
          </button>
        </div>

        <div class="payment-details-mobile" id="mobile-payment-details">
          <!-- Detalles de pago según método -->
        </div>

        <button class="btn-process-payment-mobile" id="btn-mobile-process-payment">
          <i class="fas fa-check-circle"></i>
          <span>Procesar Venta</span>
        </button>
      </div>
    `;

    container.appendChild(paymentSection);

    // Agregar eventos
    this.setupPaymentEvents();
  },

  setupPaymentEvents() {
    // Eventos de método de pago
    document.querySelectorAll('.payment-method-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document
          .querySelectorAll('.payment-method-btn')
          .forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.mobilePaymentMethod = btn.dataset.method;
        this.updatePaymentDetails();
      });
    });

    // Evento de procesar pago
    const btnProcess = document.getElementById('btn-mobile-process-payment');
    if (btnProcess) {
      btnProcess.addEventListener('click', () => {
        this.procesarPagoMobile();
      });
    }
  },

  updatePaymentDetails() {
    const detailsContainer = document.getElementById('mobile-payment-details');
    if (!detailsContainer) return;

    const { total } = this.calcularTotales();
    const method = this.state.mobilePaymentMethod;

    if (method === 'efectivo') {
      detailsContainer.innerHTML = `
        <div class="payment-input-group">
          <label><i class="fas fa-money-bill"></i> Efectivo Recibido</label>
          <input type="number" id="mobile-efectivo-recibido" 
                 placeholder="0.00" 
                 step="0.01" 
                 min="${total}"
                 value="${total}">
        </div>
        <div class="payment-change-display" id="mobile-cambio-display">
          <div class="payment-change-label">Cambio</div>
          <div class="payment-change-amount">$0.00</div>
        </div>
      `;

      const input = document.getElementById('mobile-efectivo-recibido');
      if (input) {
        input.addEventListener('input', () => {
          this.calculateChange();
        });
        // Calcular cambio inicial
        this.calculateChange();
      }
    } else if (method === 'tarjeta') {
      detailsContainer.innerHTML = `
        <div class="payment-input-group">
          <label><i class="fas fa-credit-card"></i> Número de Referencia</label>
          <input type="text" id="mobile-referencia-tarjeta" 
                 placeholder="Últimos 4 dígitos (opcional)">
        </div>
        <div style="background: var(--info-light, #dbeafe); padding: 12px; border-radius: var(--radius-md); margin-top: 12px;">
          <small style="color: var(--info-dark, #1e40af); display: block; text-align: center;">
            <i class="fas fa-info-circle"></i> Procesar transacción en terminal POS
          </small>
        </div>
      `;
    } else {
      detailsContainer.innerHTML = `
        <div class="payment-input-group">
          <label><i class="fas fa-exchange-alt"></i> Número de Transferencia</label>
          <input type="text" id="mobile-referencia-transferencia" 
                 placeholder="Número de referencia (opcional)">
        </div>
        <div style="background: var(--info-light, #dbeafe); padding: 12px; border-radius: var(--radius-md); margin-top: 12px;">
          <small style="color: var(--info-dark, #1e40af); display: block; text-align: center;">
            <i class="fas fa-info-circle"></i> Verificar transferencia antes de procesar
          </small>
        </div>
      `;
    }
  },

  calculateChange() {
    const input = document.getElementById('mobile-efectivo-recibido');
    const changeDisplay = document.querySelector('#mobile-cambio-display .payment-change-amount');

    if (!input || !changeDisplay) return;

    const { total } = this.calcularTotales();
    const recibido = parseFloat(input.value) || 0;
    const cambio = Math.max(0, recibido - total);

    changeDisplay.textContent = Utils.formatCurrency(cambio);

    // Cambiar color si hay cambio negativo
    const container = document.getElementById('mobile-cambio-display');
    if (recibido < total) {
      container.style.background = 'var(--error-light, #fee)';
      container.style.color = 'var(--error-dark, #991b1b)';
    } else {
      container.style.background = 'var(--success-light, #d1fae5)';
      container.style.color = 'var(--success-dark, #065f46)';
    }
  },

  showMobileView(viewName) {
    if (!this.isMobileView()) return;

    this.state.mobileCurrentView = viewName;

    // Actualizar tabs activas
    document.querySelectorAll('.mobile-nav-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.view === viewName);
    });

    // Ocultar todas las vistas
    document
      .querySelectorAll('.pos-products-section, .pos-cart-section, .pos-payment-section')
      .forEach((section) => {
        section.classList.remove('mobile-view-active');
      });

    // Mostrar vista seleccionada
    let sectionToShow;
    if (viewName === 'products') {
      sectionToShow = document.querySelector('.pos-products-section');
    } else if (viewName === 'cart') {
      sectionToShow = document.querySelector('.pos-cart-section');
    } else if (viewName === 'payment') {
      sectionToShow = document.querySelector('.pos-payment-section');
      this.updatePaymentView();
    }

    if (sectionToShow) {
      sectionToShow.classList.add('mobile-view-active');
    }

    // Actualizar botón "Volver"
    this.updateBackButton();
  },

  updateBackButton() {
    if (!this.isMobileView()) return;

    const btnBack = document.getElementById('btn-back-dashboard');
    if (!btnBack) return;

    const btnText = btnBack.querySelector('span');
    if (!btnText) return;

    if (this.state.mobileCurrentView === 'products') {
      btnText.textContent = 'Dashboard';
    } else if (this.state.mobileCurrentView === 'cart') {
      btnText.textContent = 'Productos';
    } else if (this.state.mobileCurrentView === 'payment') {
      btnText.textContent = 'Carrito';
    }
  },

  updateMobileCartBadge() {
    const badge = document.getElementById('mobile-cart-badge');
    if (!badge) return;

    const itemCount = this.state.carrito.length;
    if (itemCount > 0) {
      badge.textContent = itemCount;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  },

  updatePaymentView() {
    const { total } = this.calcularTotales();
    const totalElement = document.getElementById('mobile-payment-total');

    if (totalElement) {
      totalElement.textContent = Utils.formatCurrency(total);
    }

    this.updatePaymentDetails();

    // Deshabilitar botón si carrito está vacío
    const btnProcess = document.getElementById('btn-mobile-process-payment');
    if (btnProcess) {
      btnProcess.disabled = this.state.carrito.length === 0;
    }
  },

  async procesarPagoMobile() {
    if (this.state.carrito.length === 0) {
      Utils.showToast('El carrito está vacío', 'warning');
      return;
    }

    const { total } = this.calcularTotales();
    const method = this.state.mobilePaymentMethod;

    // Validar efectivo recibido si es el método seleccionado
    if (method === 'efectivo') {
      const input = document.getElementById('mobile-efectivo-recibido');
      const recibido = parseFloat(input?.value) || 0;

      if (recibido < total) {
        Utils.showToast('El efectivo recibido es menor al total', 'error');
        return;
      }
    }

    // Mostrar el modal de pago normal del sistema
    this.mostrarModalPago();
  },

  // ========================================
  // FIN FUNCIONES MÓVILES
  // ========================================

  getDefaultHistorialFilters() {
    const hoy = new Date();
    const hace30 = new Date(hoy.getTime() - 29 * 24 * 60 * 60 * 1000);
    const format = (date) => date.toISOString().split('T')[0];

    return {
      search: '',
      fechaDesde: format(hace30),
      fechaHasta: format(hoy),
      metodoPago: '',
      estado: '',
      clienteId: '',
    };
  },

  async ensureClientesCargados() {
    if (Array.isArray(this.state.clientes) && this.state.clientes.length) {
      return;
    }

    try {
      const clientesRes = await Auth._request('/pos/clientes', { method: 'GET' });
      this.state.clientes = this.normalizarClientesRespuesta(clientesRes);
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('⚠️ ERROR: Cargando clientes para filtros');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      this.state.clientes = [];
    }
    // Suscribirse a actualizaciones de ventas
    DataRefreshManager.on('ventas', () => {
      if (document.getElementById('historial-ventas-container')) {
        Utils.showToast('Se ha registrado una nueva venta.', 'info', {
          buttons: [
            {
              text: 'Actualizar',
              className: 'btn-primary',
              onClick: () => this.recargarHistorial(),
            },
          ],
        });
      }
    });
  },

  async recargarHistorial() {
    const container = document.getElementById('historial-ventas-container');
    if (container) {
      await this.renderHistorial(container);
      Utils.showToast('Historial de ventas actualizado.', 'success');
    }
  },

  normalizarProductosRespuesta(respuesta) {
    const coleccion = Array.isArray(respuesta)
      ? respuesta
      : Array.isArray(respuesta?.productos)
        ? respuesta.productos
        : Array.isArray(respuesta?.data)
          ? respuesta.data
          : [];

    return coleccion.map((producto) => this.normalizarProducto(producto)).filter(Boolean);
  },

  normalizarProducto(producto) {
    if (!producto || typeof producto !== 'object') {
      return null;
    }

    const rawId =
      producto.id ??
      producto.producto_id ??
      producto._id ??
      producto.codigo ??
      producto.code ??
      null;
    const normalizedId = rawId
      ? rawId.toString()
      : `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const rawCodigo =
      producto.codigo || producto.code || producto.sku || producto.referencia || normalizedId;
    const codigoNormalizado = rawCodigo ? rawCodigo.toString().trim() : normalizedId;

    const categoriaId = producto.categoriaId || producto.categoria_id || null;
    const categoriaCruda =
      producto.categoriaNombre || producto.categoria_nombre || producto.categoria || '';
    const categoriaBase = categoriaCruda || categoriaId || '';
    const categoriaEtiqueta = categoriaBase ? String(categoriaBase).trim() : '';

    const precioVenta =
      Number.parseFloat(producto.precioVenta ?? producto.precio_venta ?? producto.precio ?? 0) || 0;
    const precioCompra =
      Number.parseFloat(producto.precioCompra ?? producto.precio_compra ?? 0) || 0;
    const stock = Number.parseFloat(producto.stock ?? producto.cantidad ?? 0) || 0;
    const stockMinimo =
      Number.parseFloat(producto.stockMinimo ?? producto.stock_minimo ?? producto.stockMin ?? 0) ||
      0;

    const activo =
      typeof producto.activo === 'boolean'
        ? producto.activo
        : producto.activo === 1 || producto.estado === 'activo' || producto.estado === 1;

    return {
      ...producto,
      id: normalizedId,
      codigo: codigoNormalizado,
      categoriaId,
      categoria: categoriaEtiqueta || 'Sin categoría',
      categoriaNombre: categoriaCruda ? String(categoriaCruda).trim() : categoriaEtiqueta || '',
      precioVenta,
      precioCompra,
      stock,
      stockMinimo,
      activo,
    };
  },

  normalizarClientesRespuesta(respuesta) {
    const coleccion = Array.isArray(respuesta)
      ? respuesta
      : Array.isArray(respuesta?.clientes)
        ? respuesta.clientes
        : Array.isArray(respuesta?.data)
          ? respuesta.data
          : [];

    return coleccion.map((cliente) => ({
      ...cliente,
      documento:
        cliente?.documento || cliente?.cedula || cliente?.identificacion || cliente?.ruc || '',
    }));
  },

  async init() {
    // Asegurar que la autenticación esté lista antes de hacer peticiones
    try {
      const isAuthenticated = await Auth.ensureAuthenticated();
      if (!isAuthenticated) {
        console.warn('⚠️ Usuario no autenticado, redirigiendo a login...');
        window.location.href = 'login.html';
        return;
      }
    } catch (authError) {
      console.error('Error verificando autenticación:', authError);
      Utils.showToast('Sesión no válida. Redirigiendo a login...', 'error');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
      return;
    }

    // Cargar datos iniciales desde el servidor
    try {
      const selectedClientId = this.state.clienteSeleccionado?.id || null;
      const [productosRes, clientesRes] = await Promise.all([
        Auth._request('/pos/productos', { method: 'GET' }),
        Auth._request('/pos/clientes', { method: 'GET' }),
      ]);

      this.state.productos = this.normalizarProductosRespuesta(productosRes);
      this.state.clientes = this.normalizarClientesRespuesta(clientesRes);
      this.state.clienteSeleccionado = selectedClientId
        ? this.state.clientes.find((c) => c.id === selectedClientId) || null
        : null;

      console.log(
        '✅ POS inicializado:',
        this.state.productos.length,
        'productos,',
        this.state.clientes.length,
        'clientes'
      );
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR CRÍTICO: Cargando datos del POS');
      console.error('Mensaje:', error.message);
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      Utils.showToast('Error cargando datos. Intenta recargar la página.', 'error');
      this.state.productos = [];
      this.state.clientes = [];
      throw error; // Relanzar - error crítico
    }
  },

  async renderPOS(container) {
    if (!container) return;

    this._initializeStatePersistence();

    // Asegurar que los datos estén cargados
    if (!this.state.productos.length || !this.state.clientes.length) {
      await this.init();
    }

    container.innerHTML = this.getPOSTemplate();
    this.bindPOSEvents();
    this.renderizarCategorias();
    this.renderizarClienteSelector();
    this.renderizarProductos();
    this.renderizarCarrito();

    // Debug viewport
    console.log('📱 Viewport actual:', window.innerWidth + 'x' + window.innerHeight);
    console.log('📱 ¿Es móvil?:', this.isMobileView());

    // Inicializar navegación móvil si es necesario
    if (this.isMobileView()) {
      console.log('🚀 Inicializando navegación móvil...');
      setTimeout(() => {
        this.initMobileNavigation();
        console.log('✅ Navegación móvil inicializada');
      }, 100);
    } else {
      console.log('🖥️ Modo desktop - navegación móvil no necesaria');
    }

    // Iniciar escáner QR automáticamente (minimizado con timer de 1 minuto)
    setTimeout(() => {
      console.log('📷 Iniciando escáner QR automáticamente...');
      this.abrirLectorQrPos(true); // true = iniciar minimizado
    }, 500);

    // Escuchar cambios de tamaño de ventana con debounce
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const isMobile = this.isMobileView();
        console.log('📏 Resize detectado:', window.innerWidth, '- Es móvil:', isMobile);
        if (isMobile) {
          this.initMobileNavigation();
        }
      }, 250); // Esperar 250ms después del último resize
    });
  },

  _initializeStatePersistence() {
    if (this._persistenceInitialized) {
      return;
    }
    if (typeof ModuleStatePersistence === 'undefined') {
      return;
    }
    this._persistenceInitialized = true;
    const record = ModuleStatePersistence.register(this._persistenceKey, {
      version: this._persistenceVersion,
      onSave: () => this._capturePersistenceSnapshot(),
    });
    if (record && record.state) {
      this._restorePersistedState(record.state);
      console.log('✅ Estado persistido del POS restaurado', record.state);
    }
  },

  _capturePersistenceSnapshot() {
    return {
      carrito: this.state.carrito,
      clienteSeleccionado: this.state.clienteSeleccionado,
      descuentoPorcentaje: this.state.descuentoPorcentaje,
      descuentoMonto: this.state.descuentoMonto,
      mobileCurrentView: this.state.mobileCurrentView,
      mobilePaymentMethod: this.state.mobilePaymentMethod,
      mobilePaymentAmount: this.state.mobilePaymentAmount,
    };
  },

  _restorePersistedState(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') return;
    if (Array.isArray(snapshot.carrito)) {
      this.state.carrito = snapshot.carrito;
    }
    if (snapshot.clienteSeleccionado) {
      this.state.clienteSeleccionado = snapshot.clienteSeleccionado;
    }
    if (typeof snapshot.descuentoPorcentaje === 'number') {
      this.state.descuentoPorcentaje = snapshot.descuentoPorcentaje;
    }
    if (typeof snapshot.descuentoMonto === 'number') {
      this.state.descuentoMonto = snapshot.descuentoMonto;
    }
    if (snapshot.mobileCurrentView) {
      this.state.mobileCurrentView = snapshot.mobileCurrentView;
    }
    if (snapshot.mobilePaymentMethod) {
      this.state.mobilePaymentMethod = snapshot.mobilePaymentMethod;
    }
    if (typeof snapshot.mobilePaymentAmount === 'number') {
      this.state.mobilePaymentAmount = snapshot.mobilePaymentAmount;
    }
  },

  _persistCurrentState() {
    if (typeof ModuleStatePersistence === 'undefined') return;
    ModuleStatePersistence.saveState(
      this._persistenceKey,
      this._capturePersistenceSnapshot(),
      this._persistenceVersion
    );
  },

  getPOSTemplate() {
    return `
      <div class="pos-container-mejorado pos-layout-header">
        <!-- BARRA SUPERIOR CON CONTROLES DE FACTURACIÓN -->
        <div class="pos-header-bar">
          <div class="pos-header-left">
            <div class="cliente-selector-header">
              <i class="fas fa-user"></i>
              <input type="text" id="cliente-search" class="cliente-search-header" placeholder="Cliente...">
              <div class="cliente-dropdown" id="cliente-dropdown" style="display: none;"></div>
              <span class="cliente-selected-header" id="cliente-selected">General</span>
            </div>
          </div>
          <div class="pos-header-center">
            <div class="pos-totals-header">
              <div class="total-item">
                <span class="total-label">Subtotal</span>
                <span class="total-value" id="cart-subtotal">0.00</span>
              </div>
              <div class="total-item">
                <span class="total-label">IVA 15%</span>
                <span class="total-value" id="cart-iva">0.00</span>
              </div>
              <div class="total-item total-main">
                <span class="total-label">TOTAL</span>
                <span class="total-value total-big" id="cart-total">0.00</span>
              </div>
            </div>
          </div>
          <div class="pos-header-right">
            <button class="btn-header-action btn-descuento" id="btn-toggle-descuento" title="Descuento">
              <i class="fas fa-percent"></i>
            </button>
            <div class="descuento-popup" id="descuento-inputs" style="display: none;">
              <input type="number" id="descuento-porcentaje" min="0" max="100" step="0.1" value="0" placeholder="%">
              <input type="number" id="descuento-monto" min="0" step="0.01" value="0" placeholder="$">
            </div>
            <button class="btn-header-action btn-clear-header" id="btn-limpiar" title="Limpiar">
              <i class="fas fa-trash-alt"></i>
            </button>
            <button class="btn-header-action btn-process-header" id="btn-pagar" disabled title="Procesar Venta">
              <i class="fas fa-check"></i>
              <span>Procesar</span>
            </button>
            <span class="cart-count-header" id="cart-count-header">0</span>
          </div>
        </div>

        <!-- ÁREA PRINCIPAL -->
        <div class="pos-main-area">
          <div class="pos-products-section">
            <div class="pos-search-bar">
              <button class="btn-back-dashboard" id="btn-back-dashboard" title="Volver al Dashboard">
                <i class="fas fa-arrow-left"></i>
                <span>Volver</span>
              </button>
              <div class="search-input-wrapper">
                <i class="fas fa-search"></i>
                <input type="search" id="pos-search" class="search-input" placeholder="Buscar por nombre, código o categoría...">
              </div>
              <div class="pos-view-toggle" id="pos-view-toggle">
                <button class="btn-view-mode active" data-view="grid" title="Vista de tarjetas">
                  <i class="fas fa-th-large"></i>
                </button>
                <button class="btn-view-mode" data-view="list" title="Vista de lista">
                  <i class="fas fa-list"></i>
                </button>
              </div>
              <button class="btn-qr-scanner" id="btn-qr-scanner" title="Escanear QR / Códigos">
                <i class="fas fa-qrcode"></i>
              </button>
              <button class="btn-reload-products" id="btn-reload-products" title="Recargar Productos">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
            <div class="pos-category-filter" id="pos-category-filter">
              <!-- Las categorías se renderizarán aquí -->
            </div>
            <div class="products-list-header" id="products-list-header">
              <span>Código</span>
              <span>Producto</span>
              <span>Precio</span>
              <span>Acción</span>
            </div>
            <div class="pos-products-grid-mejorado" id="pos-product-grid">
              <!-- Los productos se renderizarán aquí -->
            </div>
          </div>
          
          <!-- CARRITO - Solo productos -->
          <div class="pos-cart-section pos-cart-compact">
            <div class="carrito-header-compact">
              <span><i class="fas fa-shopping-cart"></i> Carrito</span>
              <button class="btn-expand-cart" id="btn-expand-cart" title="Expandir">
                <i class="fas fa-expand-alt"></i>
              </button>
            </div>
            <div class="pos-cart-items-mejorado" id="pos-cart-items">
              <!-- Los items del carrito se renderizarán aquí -->
            </div>
          </div>
        </div>
      </div>

      <!-- Elementos ocultos para compatibilidad -->
      <div id="descuento-row" style="display: none;"></div>
      <span id="cart-descuento" style="display: none;">0</span>
    `;
  },

  bindPOSEvents() {
    // Botón volver al dashboard
    const btnBack = document.getElementById('btn-back-dashboard');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        // En móvil, si no está en productos, volver a productos
        if (this.isMobileView() && this.state.mobileCurrentView !== 'products') {
          this.showMobileView('products');
        } else {
          // En desktop o desde productos, volver al dashboard
          if (typeof App !== 'undefined' && typeof App.loadModule === 'function') {
            App.loadModule('dashboard');
          }
        }
      });
    }

    const searchInput = document.getElementById('pos-search');
    searchInput.addEventListener('input', (e) => {
      this.state.busqueda = e.target.value;
      this.renderizarProductos();
    });

    // Toggle de vista Grid/Lista
    const viewToggle = document.getElementById('pos-view-toggle');
    const listHeader = document.getElementById('products-list-header');
    if (viewToggle) {
      viewToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-view-mode');
        if (btn) {
          const view = btn.dataset.view;
          const productGrid = document.getElementById('pos-product-grid');
          
          // Actualizar botones activos
          viewToggle.querySelectorAll('.btn-view-mode').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          // Aplicar clase de vista
          if (view === 'list') {
            productGrid.classList.add('view-list');
            if (listHeader) listHeader.classList.add('visible');
          } else {
            productGrid.classList.remove('view-list');
            if (listHeader) listHeader.classList.remove('visible');
          }
          
          // Guardar preferencia
          localStorage.setItem('pos-view-mode', view);
        }
      });
      
      // Restaurar preferencia guardada
      const savedView = localStorage.getItem('pos-view-mode');
      if (savedView === 'list') {
        const productGrid = document.getElementById('pos-product-grid');
        const listBtn = viewToggle.querySelector('[data-view="list"]');
        if (productGrid && listBtn) {
          productGrid.classList.add('view-list');
          if (listHeader) listHeader.classList.add('visible');
          viewToggle.querySelectorAll('.btn-view-mode').forEach(b => b.classList.remove('active'));
          listBtn.classList.add('active');
        }
      }
    }

    const btnQrScanner = document.getElementById('btn-qr-scanner');
    if (btnQrScanner) {
      btnQrScanner.addEventListener('click', () => this.abrirLectorQrPos());
    }

    const productGrid = document.getElementById('pos-product-grid');
    productGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.pos-product-card-mejorado');
      if (card && !card.classList.contains('disabled')) {
        const productId = card.dataset.productId;
        this.agregarAlCarrito(productId);
      }
    });

    const cartItems = document.getElementById('pos-cart-items');
    cartItems.addEventListener('click', (e) => {
      // Handle remove button
      const removeBtn = e.target.closest('.btn-remove-item');
      if (removeBtn) {
        const productId = removeBtn.dataset.productId;
        this.removerDelCarrito(productId);
        return;
      }

      // Handle quantity change buttons
      const qtyBtn = e.target.closest('.btn-qty-control');
      if (qtyBtn) {
        const productId = qtyBtn.dataset.productId;
        const change = parseInt(qtyBtn.dataset.change, 10);
        this.actualizarCantidad(productId, change);
        return;
      }
    });

    // Handle quantity input change
    cartItems.addEventListener('change', (e) => {
      if (e.target.classList.contains('quantity-input')) {
        const productId = e.target.dataset.productId;
        const newQty = parseInt(e.target.value, 10);
        const item = this.state.carrito.find((i) => i.id === productId);
        if (item) {
          const producto = this.state.productos.find((p) => p.id === productId);
          if (newQty <= 0) {
            this.removerDelCarrito(productId);
          } else if (producto && newQty > producto.stock) {
            Utils.showToast(`Stock máximo: ${producto.stock}`, 'warning');
            e.target.value = item.cantidad;
          } else {
            item.cantidad = newQty;
            this.renderizarCarrito();
          }
        }
      }
    });

    const payButton = document.getElementById('btn-pagar');
    payButton.addEventListener('click', () => {
      // En móvil, navegar a vista de pago
      if (this.isMobileView() && this.state.carrito.length > 0) {
        this.showMobileView('payment');
      } else {
        this.mostrarModalPago();
      }
    });

    // Botón expandir carrito
    const btnExpandCart = document.getElementById('btn-expand-cart');
    if (btnExpandCart) {
      btnExpandCart.addEventListener('click', () => this.mostrarCarritoExpandido());
    }

    const clearButton = document.getElementById('btn-limpiar');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        if (this.state.carrito.length > 0) {
          if (confirm('¿Desea limpiar el carrito?')) {
            this.state.carrito = [];
            this.state.descuentoPorcentaje = 0;
            this.state.descuentoMonto = 0;
            this.renderizarCarrito();
          }
        }
      });
    }

    // Botón recargar productos
    const btnReload = document.getElementById('btn-reload-products');
    if (btnReload) {
      btnReload.addEventListener('click', async () => {
        btnReload.disabled = true;
        btnReload.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        await this.init();
        this.renderizarCategorias();
        this.renderizarClienteSelector();
        this.renderizarProductos();
        btnReload.disabled = false;
        btnReload.innerHTML = '<i class="fas fa-sync-alt"></i>';
        Utils.showToast('Productos actualizados', 'success');
      });
    }

    // Buscador de cliente
    const clienteSearch = document.getElementById('cliente-search');
    const clienteDropdown = document.getElementById('cliente-dropdown');
    const clienteSelected = document.getElementById('cliente-selected');

    if (clienteSearch && clienteDropdown && clienteSelected) {
      clienteSearch.addEventListener('focus', () => {
        this.mostrarListaClientes();
      });

      clienteSearch.addEventListener('input', (e) => {
        this.filtrarClientes(e.target.value);
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.cliente-selector-header') && !e.target.closest('.cliente-search-box')) {
          clienteDropdown.style.display = 'none';
        }
      });
    }

    // Toggle descuento
    const btnToggleDescuento = document.getElementById('btn-toggle-descuento');
    const descuentoInputs = document.getElementById('descuento-inputs');
    if (btnToggleDescuento && descuentoInputs) {
      btnToggleDescuento.addEventListener('click', () => {
        const isVisible = descuentoInputs.style.display !== 'none';
        descuentoInputs.style.display = isVisible ? 'none' : 'block';
      });
    }

    // Descuento por porcentaje
    const descuentoPorcentajeInput = document.getElementById('descuento-porcentaje');
    if (descuentoPorcentajeInput) {
      descuentoPorcentajeInput.addEventListener('input', (e) => {
        this.state.descuentoPorcentaje = parseFloat(e.target.value) || 0;
        this.state.descuentoMonto = 0;
        document.getElementById('descuento-monto').value = 0;
        this.renderizarCarrito();
      });
    }

    // Descuento por monto
    const descuentoMontoInput = document.getElementById('descuento-monto');
    if (descuentoMontoInput) {
      descuentoMontoInput.addEventListener('input', (e) => {
        this.state.descuentoMonto = parseFloat(e.target.value) || 0;
        this.state.descuentoPorcentaje = 0;
        document.getElementById('descuento-porcentaje').value = 0;
        this.renderizarCarrito();
      });
    }
  },

  renderizarCategorias() {
    const filterContainer = document.getElementById('pos-category-filter');
    if (!filterContainer) return;

    const categorias = [...new Set(this.state.productos.map((p) => p.categoria).filter(Boolean))];

    if (categorias.length === 0) {
      filterContainer.style.display = 'none';
      return;
    }

    filterContainer.style.display = 'flex';
    filterContainer.innerHTML = `
      <button class="category-btn ${!this.state.categoriaFiltro ? 'active' : ''}" data-categoria="">
        <i class="fas fa-th"></i> Todas
      </button>
      ${categorias
        .map(
          (cat) => `
        <button class="category-btn ${this.state.categoriaFiltro === cat ? 'active' : ''}" data-categoria="${cat}">
          ${cat}
        </button>
      `
        )
        .join('')}
    `;

    filterContainer.onclick = (e) => {
      const btn = e.target.closest('.category-btn');
      if (btn) {
        this.state.categoriaFiltro = btn.dataset.categoria;
        this.renderizarCategorias();
        this.renderizarProductos();
      }
    };
  },

  renderizarClienteSelector() {
    this.actualizarClienteSeleccionado();
  },

  actualizarClienteSeleccionado() {
    const clienteSelected = document.getElementById('cliente-selected');
    if (!clienteSelected) return;

    if (this.state.clienteSeleccionado) {
      const cliente = this.state.clienteSeleccionado;
      clienteSelected.innerHTML = `<i class="fas fa-check-circle"></i> ${cliente.nombre}${cliente.documento ? ' - ' + cliente.documento : ''}`;
      clienteSelected.classList.add('selected');
    } else {
      clienteSelected.innerHTML = 'Cliente General';
      clienteSelected.classList.remove('selected');
    }
  },

  mostrarListaClientes() {
    const dropdown = document.getElementById('cliente-dropdown');
    if (!dropdown) return;

    this.filtrarClientes('');
    dropdown.style.display = 'block';
  },

  filtrarClientes(termino) {
    const dropdown = document.getElementById('cliente-dropdown');
    if (!dropdown) return;

    const terminoLower = termino.toLowerCase();
    const clientesFiltrados = this.state.clientes.filter((c) => {
      const nombre = (c.nombre || '').toLowerCase();
      const documento = (c.documento || '').toLowerCase();
      return nombre.includes(terminoLower) || documento.includes(terminoLower);
    });

    if (clientesFiltrados.length === 0 && termino !== '') {
      dropdown.innerHTML = '<div class="cliente-dropdown-empty">No se encontraron clientes</div>';
    } else {
      dropdown.innerHTML = `
        <div class="cliente-dropdown-item" data-cliente-id="">
          <i class="fas fa-user"></i> Cliente General
        </div>
        ${clientesFiltrados
          .map(
            (c) => `
          <div class="cliente-dropdown-item" data-cliente-id="${c.id}">
            <i class="fas fa-user-check"></i>
            <div class="cliente-info">
              <span class="cliente-nombre">${c.nombre}</span>
              ${c.documento ? `<span class="cliente-doc">${c.documento}</span>` : ''}
            </div>
          </div>
        `
          )
          .join('')}
      `;
    }

    dropdown.style.display = 'block';

    // Agregar eventos a los items
    dropdown.querySelectorAll('.cliente-dropdown-item').forEach((item) => {
      item.addEventListener('click', () => {
        const clienteId = item.dataset.clienteId;
        this.seleccionarCliente(clienteId);
      });
    });
  },

  seleccionarCliente(clienteId) {
    const clienteSearch = document.getElementById('cliente-search');
    const dropdown = document.getElementById('cliente-dropdown');

    if (clienteId) {
      this.state.clienteSeleccionado = this.state.clientes.find((c) => c.id === clienteId);
    } else {
      this.state.clienteSeleccionado = null;
    }

    this.actualizarClienteSeleccionado();
    this.actualizarPanelClienteModal();
    this.actualizarPanelFacturacionModal();

    if (clienteSearch) clienteSearch.value = '';
    if (dropdown) dropdown.style.display = 'none';

    this._persistCurrentState();
  },

  renderizarProductos() {
    const grid = document.getElementById('pos-product-grid');
    if (!grid) return;

    const terminoBusqueda = this.state.busqueda.toLowerCase();

    const productosAMostrar = this.state.productos.filter((p) => {
      // Evitar mostrar productos desactivados aunque tengan stock
      if (p.activo === false) {
        return false;
      }

      // Filtro de búsqueda
      if (terminoBusqueda) {
        const matchNombre = p.nombre.toLowerCase().includes(terminoBusqueda);
        const matchCodigo = p.codigo && p.codigo.toLowerCase().includes(terminoBusqueda);
        const matchCategoria = p.categoria && p.categoria.toLowerCase().includes(terminoBusqueda);
        if (!matchNombre && !matchCodigo && !matchCategoria) return false;
      }

      // Filtro de categoría
      if (this.state.categoriaFiltro && p.categoria !== this.state.categoriaFiltro) {
        return false;
      }

      // Solo mostrar productos con stock > 0
      return p.stock > 0;
    });

    if (productosAMostrar.length === 0) {
      grid.innerHTML = `
        <div class="empty-state-pos">
          <i class="fas fa-box-open"></i>
          <p>No se encontraron productos${terminoBusqueda ? ' con ese criterio' : ' disponibles'}</p>
          ${terminoBusqueda ? '<small>Intenta con otro término de búsqueda</small>' : ''}
        </div>
      `;
      return;
    }

    grid.innerHTML = productosAMostrar
      .map((p) => {
        const nivelStock = StockLevelManager.getStockLevel(p);
        const stockClass =
          nivelStock.prioridad === 3
            ? 'stock-alto'
            : nivelStock.prioridad === 2
              ? 'stock-medio'
              : nivelStock.prioridad === 1
                ? 'stock-bajo'
                : '';

        return `
        <div class="pos-product-card-mejorado" data-product-id="${p.id}">
          <div class="product-card-badge">
            ${p.codigo ? `<span class="product-code-badge">${p.codigo}</span>` : ''}
            <span class="product-stock-badge ${stockClass}">
              <i class="fas fa-box"></i> ${p.stock}
            </span>
          </div>
          <div class="product-card-content">
            <div class="product-name">${p.nombre}</div>
            ${p.categoria ? `<div class="product-category"><i class="fas fa-tag"></i> ${p.categoria}</div>` : ''}
          </div>
          <div class="product-card-price">
            <span class="price-label">Precio</span>
            <span class="price-value">${Utils.formatCurrency(p.precioVenta)}</span>
          </div>
          <div class="product-card-action">
            <i class="fas fa-plus-circle"></i>
            <span>Agregar</span>
          </div>
        </div>
      `;
      })
      .join('');
  },

  extraerCodigoDesdeLectura(valor) {
    const input = (valor || '').toString().trim();
    if (!input) {
      return '';
    }

    // Helper: Extraer código desde URL
    const extractFromUrl = (text) => {
      if (!text) {
        return '';
      }
      try {
        const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
        const url = new URL(candidate);

        // Intentar extraer de parámetros comunes
        const param =
          url.searchParams.get('code') ||
          url.searchParams.get('c') ||
          url.searchParams.get('p') ||
          url.searchParams.get('producto') ||
          url.searchParams.get('id');
        if (param) {
          return param.trim();
        }

        // Extraer del último segmento de la ruta
        const segments = url.pathname.split('/').filter(Boolean);
        if (segments.length) {
          return decodeURIComponent(segments[segments.length - 1]);
        }
      } catch (error) {
        // No es una URL válida
      }
      return '';
    };

    // 1. Intentar extraer desde URL si contiene http/https
    const urlMatch = input.match(/https?:\/\/[^\s]+/i);
    const fromUrl = extractFromUrl(urlMatch ? urlMatch[0] : input);
    if (fromUrl) {
      return fromUrl;
    }

    // 2. Buscar patrón COD:XXXX o CODE:XXXX
    const codigoMatch = input.match(/(?:COD|CODE)[:=\s]([A-Z0-9._-]+)/i);
    if (codigoMatch) {
      return codigoMatch[1];
    }

    // 3. Buscar patrón JSON-like {code: "XXX"} o {"codigo": "XXX"}
    try {
      const jsonMatch = input.match(
        /\{[^}]*(?:"code"|"codigo"|'code'|'codigo')\s*:\s*["']([^"']+)["'][^}]*\}/i
      );
      if (jsonMatch) {
        return jsonMatch[1];
      }
    } catch (e) {
      // No es JSON válido
    }

    // 4. Si contiene pipe |, extraer el último segmento o buscar prefijo COD:
    if (input.includes('|')) {
      const partes = input.split('|').map((segmento) => segmento.trim());
      const prefijo = partes.find((segmento) => segmento.startsWith('COD:'));
      if (prefijo) {
        return prefijo.slice(4);
      }
      // Retornar el último segmento no vacío
      return partes.filter(Boolean).pop() || '';
    }

    // 5. Retornar el input completo (podría ser el código directamente)
    return input;
  },

  async agregarProductoPorCodigo(codigo) {
    const originalValue = (codigo || '').toString().trim();
    const parsedValue = this.extraerCodigoDesdeLectura(codigo);
    const rawValue = parsedValue ? parsedValue.toString().trim() : '';
    if (!rawValue) {
      this.updateQrScannerStatus('⚠️ Código vacío o inválido', 'error');
      return false;
    }

    // Búsqueda mejorada con múltiples verificadores
    const normalized = rawValue.toLowerCase();
    const producto = this.buscarProductoPorCodigo(normalized);

    if (!producto) {
      this.updateQrScannerStatus(
        `❌ Producto no encontrado: ${rawValue.substring(0, 20)}`,
        'error'
      );
      Utils.showToast(`No se encontró un producto con el código: ${rawValue}`, 'warning');
      return false;
    }

    // Verificar disponibilidad antes de agregar
    if (!producto.activo) {
      this.updateQrScannerStatus('⚠️ Producto inactivo', 'error');
      Utils.showToast(`El producto ${producto.nombre} está inactivo`, 'warning');
      return false;
    }

    if (producto.stock <= 0) {
      this.updateQrScannerStatus('⚠️ Sin stock disponible', 'error');
      Utils.showToast(`${producto.nombre} está sin stock. Haz clic para ir a productos.`, 'error', {
        actionUrl: '#productos',
        actionLabel: 'Gestionar stock',
        duration: 6000,
      });
      return false;
    }

    // Verificar si ya está en el carrito y si hay stock suficiente
    const itemEnCarrito = this.state.carrito.find((item) => item.id === producto.id);
    if (itemEnCarrito && itemEnCarrito.cantidad >= producto.stock) {
      this.updateQrScannerStatus('⚠️ Stock máximo alcanzado', 'error');
      Utils.showToast(
        `Stock máximo alcanzado para ${producto.nombre}. Haz clic para reabastecer.`,
        'warning',
        {
          actionUrl: '#compras',
          actionLabel: 'Crear compra',
          duration: 6000,
        }
      );
      return false;
    }

    // ✅ Todo OK - Agregar al carrito
    this.agregarAlCarrito(producto.id);
    this.updateQrScannerStatus(`✅ ${producto.nombre} agregado`, 'success');

    // Feedback visual adicional
    this.mostrarFeedbackProductoAgregado(producto);
    return true;
  },

  buscarProductoPorCodigo(codigoNormalizado) {
    // Búsqueda exacta por código
    let producto = this.state.productos.find(
      (p) => (p.codigo || '').toString().trim().toLowerCase() === codigoNormalizado
    );

    // Si no se encuentra, buscar por ID
    if (!producto) {
      producto = this.state.productos.find(
        (p) => (p.id || '').toString().trim().toLowerCase() === codigoNormalizado
      );
    }

    // Si aún no se encuentra, buscar por SKU o referencia
    if (!producto) {
      producto = this.state.productos.find(
        (p) =>
          (p.sku || '').toString().trim().toLowerCase() === codigoNormalizado ||
          (p.referencia || '').toString().trim().toLowerCase() === codigoNormalizado
      );
    }

    return producto;
  },

  mostrarFeedbackProductoAgregado(producto) {
    // Crear notificación flotante temporal
    const feedback = document.createElement('div');
    feedback.className = 'qr-scan-feedback';
    feedback.innerHTML = `
      <div class="scan-feedback-content">
        <i class="fas fa-check-circle"></i>
        <div class="scan-feedback-info">
          <strong>${producto.nombre}</strong>
          <small>${Utils.formatCurrency(producto.precioVenta)} • Stock: ${producto.stock}</small>
        </div>
      </div>
    `;

    document.body.appendChild(feedback);

    // Animar entrada
    setTimeout(() => feedback.classList.add('show'), 10);

    // Remover después de 2 segundos
    setTimeout(() => {
      feedback.classList.remove('show');
      setTimeout(() => feedback.remove(), 300);
    }, 2000);
  },

  async ensureQrScannerLibrary() {
    if (window.Html5Qrcode) {
      return;
    }

    if (!this._qrScannerScriptPromise) {
      this._qrScannerScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'js/vendor/html5-qrcode.min.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error('No se pudo cargar html5-qrcode'));
        document.head.appendChild(script);
      });
    }

    await this._qrScannerScriptPromise;
  },

  async abrirLectorQrPos(iniciarMinimizado = true) {
    if (this._qrScannerOverlay) {
      // Si ya está abierto, traerlo al frente y expandirlo si está minimizado
      this._qrScannerOverlay.style.zIndex = '100000';
      const modal = this._qrScannerOverlay.querySelector('.pos-qr-scanner-modal');
      if (modal && modal.classList.contains('is-collapsed')) {
        this.toggleQrScannerCollapse();
      }
      Utils.showToast('Cámara QR activa', 'info');
      return;
    }

    try {
      await this.ensureQrScannerLibrary();
    } catch (error) {
      console.group('❌ ERROR: Cargando librería QR');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      Utils.showToast('No se pudo cargar el lector QR.', 'error');
      return;
    }

    // Iniciar colapsado por defecto
    this._qrFloatingCollapsed = iniciarMinimizado;
    this._qrTimeRemaining = this._qrAutoCloseSeconds;

    this._qrAvailableCameras = await Html5Qrcode.getCameras().catch(() => []);
    if (
      Array.isArray(this._qrAvailableCameras) &&
      this._qrAvailableCameras.length &&
      !this._qrPreferredCameraId
    ) {
      this._qrPreferredCameraId = this._qrAvailableCameras[0]?.id || null;
    }

    const multipleCameras =
      Array.isArray(this._qrAvailableCameras) && this._qrAvailableCameras.length > 1;
    const cameraOptions = multipleCameras
      ? this._qrAvailableCameras
          .map((camera, index) => {
            const label = camera.label || `Cámara ${index + 1}`;
            const value = camera.id || `camera-${index}`;
            const selected = value === this._qrPreferredCameraId ? 'selected' : '';
            return `<option value="${value}" ${selected}>${label}</option>`;
          })
          .join('')
      : '';

    const overlay = document.createElement('div');
    overlay.className = 'pos-qr-scanner-overlay';
    overlay.id = 'pos-qr-scanner-overlay';
    overlay.innerHTML = `
      <div class="pos-qr-scanner-modal draggable" data-floating="true">
        <!-- Header expandido -->
        <div class="scanner-header" data-drag-handle="true">
          <div class="scanner-title">
            <i class="fas fa-video"></i>
            <span>Cámara QR</span>
            <span class="timer-badge" id="qr-timer-badge">${this.formatearTiempo(this._qrTimeRemaining)}</span>
          </div>
          <div class="scanner-actions">
            <button class="scanner-action" data-action="config-timer" title="Configurar tiempo">
              <i class="fas fa-clock"></i>
            </button>
            <button class="scanner-action" data-action="toggle-collapse" title="Minimizar">
              <i class="fas fa-minus"></i>
            </button>
            <button class="scanner-action" data-action="close-scanner" aria-label="Cerrar">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <!-- Controles de cámara (expandidos) -->
        ${
          multipleCameras
            ? `
          <div class="scanner-controls">
            <label for="pos-qr-camera-select">Cámara</label>
            <div class="scanner-select-wrapper">
              <i class="fas fa-camera"></i>
              <select id="pos-qr-camera-select">${cameraOptions}</select>
            </div>
          </div>
        `
            : ''
        }

        <!-- Visor de cámara (siempre visible) -->
        <div id="pos-qr-reader" class="pos-qr-reader" data-drag-handle="true"></div>

        <!-- Hints y status (expandidos) -->
        <p class="scanner-hint">
          <i class="fas fa-info-circle"></i>
          Arrastra para mover • Se cerrará automáticamente
        </p>
        <p class="scanner-status" id="pos-qr-status">Iniciando cámara...</p>

        <!-- Controles flotantes mini (solo visibles cuando está colapsado) -->
        <div class="mini-floating-controls">
          <button type="button" class="mini-float-btn" data-action="toggle-collapse" title="Restaurar cámara">
            <i class="fas fa-expand-alt"></i>
          </button>
          <button type="button" class="mini-float-btn" data-action="close-scanner" title="Cerrar cámara">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this._qrScannerOverlay = overlay;
    
    // Asegurar que el escáner esté por encima de cualquier modal
    overlay.style.zIndex = '100000';
    
    this._qrScannerStatusEl = overlay.querySelector('#pos-qr-status');
    const modal = overlay.querySelector('.pos-qr-scanner-modal');
    if (modal) {
      modal.dataset.state = this._qrFloatingCollapsed ? 'collapsed' : 'expanded';
      // Aplicar estado inicial colapsado si corresponde
      if (this._qrFloatingCollapsed) {
        modal.classList.add('is-collapsed');
      }
    }

    // Eventos para TODOS los botones de cerrar (expandido y minimizado)
    const closeBtns = overlay.querySelectorAll('[data-action="close-scanner"]');
    closeBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.cerrarLectorQrPos();
      });
    });

    // Eventos para TODOS los botones de colapsar/expandir (expandido y minimizado)
    const collapseBtns = overlay.querySelectorAll('[data-action="toggle-collapse"]');
    collapseBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[QR] Collapse button clicked');
        this.toggleQrScannerCollapse();
      });
    });

    const configTimerBtn = overlay.querySelector('[data-action="config-timer"]');
    configTimerBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.configurarTimerQr();
    });

    // Hacer el modal arrastrable
    this.habilitarDragQrScanner();

    // Iniciar timer de auto-cierre
    this.iniciarTimerAutoClose();

    // Crear indicador en toolbar
    this.crearIndicadorCamaraActiva();

    const select = overlay.querySelector('#pos-qr-camera-select');
    if (select) {
      select.addEventListener('change', (event) => {
        const newCamera = event.target.value || null;
        this.switchQrCamera(newCamera);
      });
    }

    this._qrVisibilityListener = () => {
      if (document.hidden) {
        this.cerrarLectorQrPos();
      }
    };
    document.addEventListener('visibilitychange', this._qrVisibilityListener);

    this._qrBeforeUnloadListener = () => this.cerrarLectorQrPos();
    window.addEventListener('beforeunload', this._qrBeforeUnloadListener);

    this._qrAutoStopInterval = window.setInterval(() => {
      if (typeof App !== 'undefined' && App.currentModule && App.currentModule !== 'ventas') {
        this.cerrarLectorQrPos();
      }
    }, 2500);

    try {
      const formats = window.Html5QrcodeSupportedFormats
        ? [window.Html5QrcodeSupportedFormats.QR_CODE, window.Html5QrcodeSupportedFormats.CODE_128]
        : undefined;
      this._qrScannerInstance = new Html5Qrcode('pos-qr-reader', {
        formatsToSupport: formats,
        rememberLastUsedCamera: true,
      });

      await this.startQrCamera(this._qrPreferredCameraId);
      Utils.showToast('Lector listo. Escanea cualquier QR o código de barras.', 'info');
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR: Iniciando cámara QR');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      Utils.showToast('No se pudo iniciar la cámara. Revisa los permisos.', 'error');
      this.cerrarLectorQrPos();
    }
  },

  updateQrScannerStatus(message, status = 'info') {
    if (!this._qrScannerStatusEl) {
      return;
    }

    this._qrScannerStatusEl.textContent = message;
    this._qrScannerStatusEl.classList.remove('success', 'error', 'info');
    this._qrScannerStatusEl.classList.add(status);
  },

  _buildCameraConfig(deviceId) {
    if (deviceId) {
      return { deviceId: { exact: deviceId } };
    }
    return { facingMode: { ideal: 'environment' } };
  },

  async startQrCamera(deviceId) {
    if (!this._qrScannerInstance) {
      return;
    }

    const config = this._buildCameraConfig(deviceId);
    this.updateQrScannerStatus('Activando cámara...', 'info');

    await this._qrScannerInstance.start(
      config,
      {
        fps: 15,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      },
      (decodedText) => this.onQrScanSuccess(decodedText),
      (errorMessage) => this.onQrScanError(errorMessage)
    );

    this._qrPreferredCameraId = deviceId || this._qrPreferredCameraId;
    this._qrScannerProcessing = false;
    this.updateQrScannerStatus('Lector activo. Solo apunta al producto y listo.', 'success');
  },

  async switchQrCamera(deviceId) {
    if (!this._qrScannerInstance) {
      return;
    }

    this.updateQrScannerStatus('Cambiando cámara...', 'info');
    try {
      await this._qrScannerInstance.stop();
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('⚠️ ERROR: Deteniendo cámara previa');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
    }

    try {
      await this.startQrCamera(deviceId);
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR: Cambiando de cámara');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      this.updateQrScannerStatus('Error al activar la cámara seleccionada.', 'error');
    }
  },

  habilitarDragQrScanner() {
    const modal = this._qrScannerOverlay?.querySelector('.pos-qr-scanner-modal');
    const header = modal?.querySelector('.scanner-header');
    const reader = modal?.querySelector('.pos-qr-reader');
    if (!modal) return;

    const beginDrag = (clientX, clientY) => {
      this._qrIsDragging = true;
      const rect = modal.getBoundingClientRect();
      this._qrDragOffsetX = clientX - rect.left;
      this._qrDragOffsetY = clientY - rect.top;
      modal.style.transition = 'none';
      if (header) header.style.cursor = 'grabbing';
    };

    const onMouseDown = (e) => {
      // Solo iniciar drag desde header (modo expandido) o reader (modo colapsado)
      const isHeaderDrag =
        header &&
        e.target.closest('.scanner-header') &&
        !e.target.closest('.scanner-action, select');
      const isReaderDrag =
        reader &&
        e.target.closest('.pos-qr-reader') &&
        this._qrFloatingCollapsed &&
        !e.target.closest('.mini-floating-controls');

      if (!isHeaderDrag && !isReaderDrag) return;

      beginDrag(e.clientX, e.clientY);
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!this._qrIsDragging) return;

      let newX = e.clientX - this._qrDragOffsetX;
      let newY = e.clientY - this._qrDragOffsetY;

      // Límites de la ventana
      const maxX = window.innerWidth - modal.offsetWidth;
      const maxY = window.innerHeight - modal.offsetHeight;

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      modal.style.left = newX + 'px';
      modal.style.top = newY + 'px';
      modal.style.right = 'auto';
      modal.style.bottom = 'auto';
    };

    const onMouseUp = () => {
      if (this._qrIsDragging) {
        this._qrIsDragging = false;
        modal.style.transition = '';
        if (header) header.style.cursor = 'move';
      }
    };

    modal.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Touch support
    const onTouchStart = (e) => {
      const isHeaderDrag =
        header &&
        e.target.closest('.scanner-header') &&
        !e.target.closest('.scanner-action, select');
      const isReaderDrag =
        reader &&
        e.target.closest('.pos-qr-reader') &&
        this._qrFloatingCollapsed &&
        !e.target.closest('.mini-floating-controls');

      if (!isHeaderDrag && !isReaderDrag) return;

      const touch = e.touches[0];
      beginDrag(touch.clientX, touch.clientY);
      e.preventDefault();
    };

    modal.addEventListener('touchstart', onTouchStart, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (!this._qrIsDragging) return;
      const touch = e.touches[0];
      let newX = touch.clientX - this._qrDragOffsetX;
      let newY = touch.clientY - this._qrDragOffsetY;
      const maxX = window.innerWidth - modal.offsetWidth;
      const maxY = window.innerHeight - modal.offsetHeight;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      modal.style.left = newX + 'px';
      modal.style.top = newY + 'px';
      modal.style.right = 'auto';
      modal.style.bottom = 'auto';
    });

    document.addEventListener('touchend', () => {
      if (this._qrIsDragging) {
        this._qrIsDragging = false;
        modal.style.transition = '';
        if (header) header.style.cursor = 'move';
      }
    });
  },

  iniciarTimerAutoClose() {
    this.detenerTimerAutoClose();

    this._qrTimerInterval = setInterval(() => {
      this._qrTimeRemaining--;
      this.actualizarTimerDisplay();

      if (this._qrTimeRemaining <= 0) {
        Utils.showToast('Cámara cerrada automáticamente (ahorro de recursos)', 'info');
        this.cerrarLectorQrPos();
      } else if (this._qrTimeRemaining === 30) {
        Utils.showToast('La cámara se cerrará en 30 segundos', 'warning');
      }
    }, 1000);
  },

  detenerTimerAutoClose() {
    if (this._qrTimerInterval) {
      clearInterval(this._qrTimerInterval);
      this._qrTimerInterval = null;
    }
  },

  actualizarTimerDisplay() {
    const tiempoFormateado = this.formatearTiempo(this._qrTimeRemaining);

    // Actualizar badge del modal expandido
    const badge = document.getElementById('qr-timer-badge');
    if (badge) {
      badge.textContent = tiempoFormateado;

      // Cambiar color según tiempo restante
      if (this._qrTimeRemaining <= 30) {
        badge.classList.add('warning');
      } else {
        badge.classList.remove('warning');
      }
    }

    // Actualizar indicador externo
    if (this._qrIndicadorBtn) {
      const timerSpan = this._qrIndicadorBtn.querySelector('.timer-text');
      if (timerSpan) {
        timerSpan.textContent = tiempoFormateado;
      }
    }
  },

  formatearTiempo(segundos) {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  configurarTimerQr() {
    // Evitar múltiples modales - eliminar cualquier modal existente
    const modalExistente = document.querySelector('.qr-timer-modal-overlay');
    if (modalExistente) {
      modalExistente.remove();
    }
    
    const opciones = [
      { label: '1 minuto', valor: 60, icon: 'fa-hourglass-start' },
      { label: '3 minutos', valor: 180, icon: 'fa-hourglass-half' },
      { label: '5 minutos', valor: 300, icon: 'fa-hourglass-end' },
      { label: '10 minutos', valor: 600, icon: 'fa-clock' },
      { label: 'Sin límite', valor: 999999, icon: 'fa-infinity' },
    ];

    const opcionesHTML = opciones
      .map(
        (op) =>
          `<button class="timer-option-btn" data-seconds="${op.valor}">
        <i class="fas ${op.icon}"></i>
        <span>${op.label}</span>
      </button>`
      )
      .join('');

    const modal = document.createElement('div');
    modal.className = 'qr-timer-modal-overlay';
    modal.innerHTML = `
      <div class="qr-timer-modal">
        <div class="qr-timer-header">
          <div class="qr-timer-title">
            <i class="fas fa-stopwatch"></i>
            <span>Configurar Auto-cierre</span>
          </div>
          <button class="qr-timer-close" aria-label="Cerrar">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="qr-timer-body">
          <p class="qr-timer-hint">
            <i class="fas fa-info-circle"></i>
            La cámara consume recursos. Configura el tiempo de auto-cierre.
          </p>
          <div class="qr-timer-options">
            ${opcionesHTML}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Animación de entrada
    requestAnimationFrame(() => {
      modal.classList.add('visible');
    });

    const cerrarModal = () => {
      modal.classList.remove('visible');
      setTimeout(() => modal.remove(), 200);
    };

    modal.querySelector('.qr-timer-close').addEventListener('click', cerrarModal);

    modal.querySelectorAll('.timer-option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const segundos = parseInt(btn.dataset.seconds);
        this._qrAutoCloseSeconds = segundos;
        this._qrTimeRemaining = segundos;
        this.actualizarTimerDisplay();
        cerrarModal();
        Utils.showToast(`Timer configurado: ${btn.textContent.trim()}`, 'success');
      });
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) cerrarModal();
    });
  },

  crearIndicadorCamaraActiva() {
    // Remover indicador previo si existe
    this.removerIndicadorCamaraActiva();

    const btnQr = document.getElementById('btn-qr-scanner');
    if (!btnQr) return;

    const indicador = document.createElement('div');
    indicador.className = 'camera-active-indicator';
    indicador.id = 'camera-active-indicator';
    indicador.innerHTML = `
      <div class="indicator-content">
        <div class="pulse-ring"></div>
        <i class="fas fa-video"></i>
        <span class="indicator-text">
          <strong>CÁMARA ACTIVA</strong>
          <small class="timer-text">${this.formatearTiempo(this._qrTimeRemaining)}</small>
        </span>
      </div>
      <button class="btn-close-camera" title="Cerrar cámara">
        <i class="fas fa-times"></i>
      </button>
    `;

    // Insertar después del botón QR
    btnQr.parentNode.insertBefore(indicador, btnQr.nextSibling);
    this._qrIndicadorBtn = indicador;

    // Agregar evento de cierre
    const btnClose = indicador.querySelector('.btn-close-camera');
    btnClose?.addEventListener('click', () => {
      this.cerrarLectorQrPos();
    });

    // Animar entrada
    setTimeout(() => indicador.classList.add('show'), 10);
  },

  removerIndicadorCamaraActiva() {
    const indicador = document.getElementById('camera-active-indicator');
    if (indicador) {
      indicador.classList.remove('show');
      setTimeout(() => indicador.remove(), 300);
    }
    this._qrIndicadorBtn = null;
  },

  async cerrarLectorQrPos() {
    if (this._qrScannerInstance) {
      try {
        await this._qrScannerInstance.stop();
      } catch (stopError) {
        console.warn('POS QR: no se pudo detener correctamente', stopError);
      }
      try {
        await this._qrScannerInstance.clear();
      } catch (clearError) {
        console.warn('POS QR: no se pudo limpiar el lector', clearError);
      }
    }

    if (this._qrScannerOverlay) {
      this._qrScannerOverlay.remove();
    }

    if (this._qrVisibilityListener) {
      document.removeEventListener('visibilitychange', this._qrVisibilityListener);
      this._qrVisibilityListener = null;
    }

    if (this._qrBeforeUnloadListener) {
      window.removeEventListener('beforeunload', this._qrBeforeUnloadListener);
      this._qrBeforeUnloadListener = null;
    }

    if (this._qrAutoStopInterval) {
      window.clearInterval(this._qrAutoStopInterval);
      this._qrAutoStopInterval = null;
    }

    // Detener timer
    this.detenerTimerAutoClose();

    // Remover indicador
    this.removerIndicadorCamaraActiva();

    this._qrScannerInstance = null;
    this._qrScannerOverlay = null;
    this._qrScannerStatusEl = null;
    this._qrScannerProcessing = false;
    this._qrAvailableCameras = [];
    this._qrFloatingCollapsed = false;
    this._qrIsDragging = false;
  },

  toggleQrScannerCollapse() {
    if (!this._qrScannerOverlay) {
      console.error('[QR] No overlay found');
      return;
    }

    const modal = this._qrScannerOverlay.querySelector('.pos-qr-scanner-modal');
    if (!modal) {
      console.error('[QR] No modal found');
      return;
    }

    this._qrFloatingCollapsed = !this._qrFloatingCollapsed;
    modal.classList.toggle('is-collapsed', this._qrFloatingCollapsed);
    modal.dataset.state = this._qrFloatingCollapsed ? 'collapsed' : 'expanded';

    console.log('[QR] Toggle collapse:', this._qrFloatingCollapsed, 'Classes:', modal.className);
  },

  async onQrScanSuccess(decodedText) {
    const value = (decodedText || '').toString().trim();
    if (!value || this._qrScannerProcessing) {
      return;
    }

    const now = Date.now();
    if (value === this._qrScannerLastResult && now - this._qrScannerLastScanTs < 1200) {
      return;
    }

    this._qrScannerProcessing = true;
    try {
      const success = await this.agregarProductoPorCodigo(value);
      if (success) {
        this._qrScannerLastResult = value;
        this._qrScannerLastScanTs = now;
      }
    } finally {
      this._qrScannerProcessing = false;
    }
  },

  onQrScanError(errorMessage) {
    // Reducir ruido de errores esperados (no-code-found)
    if (typeof errorMessage === 'string' && errorMessage.includes('NotFound')) {
      return;
    }
    console.debug('POS QR: error de lectura', errorMessage);
  },

  agregarAlCarrito(productId) {
    const producto = this.state.productos.find((p) => p.id === productId);
    if (!producto) {
      console.error('❌ Producto no encontrado:', productId);
      return;
    }

    // Validaciones previas
    if (!producto.activo) {
      Utils.showToast(`${producto.nombre} está inactivo`, 'warning');
      return;
    }

    if (producto.stock <= 0) {
      Utils.showToast(
        `${producto.nombre} sin stock disponible. Haz clic para gestionar inventario.`,
        'error',
        {
          actionUrl: '#productos',
          actionLabel: 'Ir a Productos',
          duration: 6000,
        }
      );
      return;
    }

    const itemEnCarrito = this.state.carrito.find((item) => item.id === productId);

    if (itemEnCarrito) {
      // Ya existe en el carrito - incrementar cantidad
      if (itemEnCarrito.cantidad < producto.stock) {
        itemEnCarrito.cantidad++;
        Utils.showToast(`${producto.nombre} (${itemEnCarrito.cantidad})`, 'success');
      } else {
        Utils.showToast(
          `Stock máximo alcanzado: ${producto.stock} unidades. Haz clic para reabastecer.`,
          'warning',
          {
            actionUrl: '#compras',
            actionLabel: 'Crear compra',
            duration: 6000,
          }
        );
        return;
      }
    } else {
      // Agregar nuevo producto al carrito
      this.state.carrito.push({ ...producto, cantidad: 1 });
      Utils.showToast(`✅ ${producto.nombre} agregado`, 'success');
    }

    // Persistir estado
    this._persistCurrentState();

    // Actualizar UI
    this.renderizarCarrito();

    // Feedback móvil
    if (this.isMobileView()) {
      this.updateMobileCartBadge();

      // Animación de badge
      const badge = document.getElementById('mobile-cart-badge');
      if (badge) {
        badge.classList.add('pulse');
        setTimeout(() => badge.classList.remove('pulse'), 600);
      }
    }

    // Efecto sonoro opcional (si está habilitado)
    this.reproducirSonidoCarrito();
  },

  reproducirSonidoCarrito() {
    // Sonido sutil de confirmación (opcional)
    if (window.AudioContext || window.webkitAudioContext) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (e) {
        // Silenciar errores de audio
      }
    }
  },

  removerDelCarrito(productId) {
    this.state.carrito = this.state.carrito.filter((item) => item.id !== productId);
    this.renderizarCarrito();

    // Actualizar badge móvil
    if (this.isMobileView()) {
      this.updateMobileCartBadge();
    }

    this._persistCurrentState();
  },

  actualizarCantidad(productId, change) {
    const itemEnCarrito = this.state.carrito.find((item) => item.id === productId);
    if (!itemEnCarrito) return;

    const producto = this.state.productos.find((p) => p.id === productId);
    const nuevaCantidad = itemEnCarrito.cantidad + change;

    if (nuevaCantidad <= 0) {
      this.removerDelCarrito(productId);
    } else if (producto && nuevaCantidad > producto.stock) {
      Utils.showToast(`Stock máximo alcanzado para ${producto.nombre}`, 'warning');
    } else {
      itemEnCarrito.cantidad = nuevaCantidad;
      this.renderizarCarrito();
    }
  },

  renderizarCarrito() {
    const cartItems = document.getElementById('pos-cart-items');
    const subtotalEl = document.getElementById('cart-subtotal');
    const ivaEl = document.getElementById('cart-iva');
    const totalEl = document.getElementById('cart-total');
    const payButton = document.getElementById('btn-pagar');
    const cartCount = document.querySelector('.cart-count-header') || document.querySelector('.cart-count');

    // Estado vacío
    if (this.state.carrito.length === 0) {
      this.renderizarCarritoVacio(cartItems);
      this.deshabilitarBotonPago(payButton);
      this.ocultarBadgeCarrito(cartCount);
      this.actualizarTotalesUI(subtotalEl, ivaEl, totalEl, {
        subtotal: 0,
        iva: 0,
        total: 0,
        descuento: 0,
      });
      return;
    }

    // Renderizar items del carrito
    this.renderizarItemsCarrito(cartItems);
    this.habilitarBotonPago(payButton);
    this.mostrarBadgeCarrito(cartCount, this.state.carrito.length);

    // Calcular y mostrar totales
    const totales = this.calcularTotales();
    this.actualizarTotalesUI(subtotalEl, ivaEl, totalEl, totales);
    this.mostrarDescuentoSiAplica(totales.descuento);

    // Actualizar badge móvil si es necesario
    if (this.isMobileView()) {
      this.updateMobileCartBadge();
    }
  },

  renderizarCarritoVacio(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="empty-cart-mejorado">
        <i class="fas fa-shopping-cart"></i>
        <p>Carrito vacío</p>
        <small>Agrega productos para comenzar</small>
      </div>
    `;
  },

  renderizarItemsCarrito(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="carrito-items">
        ${this.state.carrito.map((item) => this.generarHTMLItemCarrito(item)).join('')}
      </div>
    `;
  },

  generarHTMLItemCarrito(item) {
    return `
      <div class="cart-item-mejorado" data-product-id="${item.id}">
        <div class="item-info">
          <span class="item-name">${item.nombre}</span>
          ${item.codigo ? `<span class="item-code">#${item.codigo}</span>` : ''}
        </div>
        <div class="quantity-controls">
          <button class="btn-qty-control" data-product-id="${item.id}" data-change="-1" title="Disminuir">
            <i class="fas fa-minus"></i>
          </button>
          <input type="number" class="quantity-input" value="${item.cantidad}" min="1" max="${item.stock}" data-product-id="${item.id}">
          <button class="btn-qty-control" data-product-id="${item.id}" data-change="1" title="Aumentar">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <span class="item-price">${Utils.formatCurrency(item.precioVenta * item.cantidad)}</span>
        <button class="btn-remove-item" data-product-id="${item.id}" title="Eliminar">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  },

  deshabilitarBotonPago(button) {
    if (button) button.disabled = true;
  },

  habilitarBotonPago(button) {
    if (button) button.disabled = false;
  },

  ocultarBadgeCarrito(badge) {
    if (badge) badge.style.display = 'none';
  },

  mostrarBadgeCarrito(badge, cantidad) {
    if (badge) {
      badge.textContent = cantidad;
      badge.style.display = 'block';
    }
  },

  actualizarTotalesUI(subtotalEl, ivaEl, totalEl, totales) {
    if (subtotalEl) subtotalEl.textContent = Utils.formatCurrency(totales.subtotal);
    if (ivaEl) ivaEl.textContent = Utils.formatCurrency(totales.iva);
    if (totalEl) totalEl.textContent = Utils.formatCurrency(totales.total);
  },

  mostrarDescuentoSiAplica(descuento) {
    const descuentoRow = document.getElementById('descuento-row');
    const descuentoValue = document.getElementById('cart-descuento');

    if (!descuentoRow || !descuentoValue) return;

    if (descuento > 0) {
      descuentoRow.style.display = 'flex';
      descuentoValue.textContent = '-' + Utils.formatCurrency(descuento);
    } else {
      descuentoRow.style.display = 'none';
    }
  },

  obtenerHtmlClienteFlotante() {
    if (this.state.clienteSeleccionado) {
      const cliente = this.state.clienteSeleccionado;
      const documento = cliente.documento || '';
      return `
        <div class="cliente-seleccionado-flotante">
          <i class="fas fa-check-circle"></i>
          <span>${cliente.nombre}</span>
        </div>
        ${documento ? `<span class="cliente-general">${documento}</span>` : ''}
      `;
    }

    return '<span class="cliente-general">Cliente General</span>';
  },

  renderizarBloqueFacturacion(total) {
    const tienda =
      window.FacturacionSRI && window.FacturacionSRI.configTienda
        ? window.FacturacionSRI.configTienda
        : typeof FacturacionSRI !== 'undefined'
          ? FacturacionSRI.configTienda
          : {};

    const cliente = this.state.clienteSeleccionado;
    const totalFormateado =
      typeof Utils !== 'undefined' && Utils.formatCurrency
        ? Utils.formatCurrency(total)
        : Number(total || 0).toFixed(2);

    const items = [
      { label: 'Negocio', valor: tienda?.nombre || 'Sin configurar' },
      { label: 'RUC', valor: tienda?.ruc || '--' },
      { label: 'Establecimiento', valor: tienda?.establecimiento || '--' },
      { label: 'Punto Emisión', valor: tienda?.puntoEmision || '--' },
      { label: 'Obligado Contab.', valor: tienda?.obligadoContabilidad || '--' },
      { label: 'Cliente', valor: cliente?.nombre || 'Cliente General' },
      { label: 'Identificación', valor: cliente?.documento || 'Consumidor Final' },
      { label: 'Total Venta', valor: totalFormateado },
    ];

    return `
      <div class="facturacion-flotante-header">
        <i class="fas fa-file-invoice"></i>
        <span>Datos de Facturación</span>
      </div>
      <div class="facturacion-flotante-datos">
        ${items
          .map(
            (item) => `
          <div class="facturacion-pill">
            <span class="label">${item.label}</span>
            <span class="valor">${item.valor}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  },

  // Renderizar datos de facturación compactos para el header
  renderizarFacturacionHeader() {
    const tienda =
      window.FacturacionSRI && window.FacturacionSRI.configTienda
        ? window.FacturacionSRI.configTienda
        : typeof FacturacionSRI !== 'undefined'
          ? FacturacionSRI.configTienda
          : {};

    const cliente = this.state.clienteSeleccionado;
    const { total } = this.calcularTotales();
    const totalFormateado =
      typeof Utils !== 'undefined' && Utils.formatCurrency
        ? Utils.formatCurrency(total)
        : Number(total || 0).toFixed(2);

    return `
      <div class="header-facturacion-compact">
        <div class="facturacion-item-compact">
          <span class="fac-label">Establecimiento</span>
          <span class="fac-valor">${tienda?.establecimiento || '001'}-${tienda?.puntoEmision || '001'}</span>
        </div>
        <div class="facturacion-item-compact">
          <span class="fac-label">Cliente</span>
          <span class="fac-valor cliente-valor">${cliente?.nombre || 'Consumidor Final'}</span>
        </div>
        <div class="facturacion-item-compact">
          <span class="fac-label">RUC/CI</span>
          <span class="fac-valor">${cliente?.documento || '9999999999999'}</span>
        </div>
        <div class="facturacion-item-compact total-compact">
          <span class="fac-label">Total</span>
          <span class="fac-valor total-valor">${totalFormateado}</span>
        </div>
      </div>
    `;
  },

  actualizarPanelClienteModal() {
    const info = document.getElementById('cliente-flotante-info');
    if (info) {
      info.innerHTML = this.obtenerHtmlClienteFlotante();
    }
  },

  actualizarPanelFacturacionModal() {
    const bloque = document.getElementById('facturacion-flotante');
    if (bloque) {
      const { total } = this.calcularTotales();
      bloque.innerHTML = this.renderizarBloqueFacturacion(total);
    }
  },

  mostrarSelectorClienteModal() {
    if (!Array.isArray(this.state.clientes) || this.state.clientes.length === 0) {
      Utils.showToast('No hay clientes disponibles para seleccionar', 'info');
      return;
    }

    const existente = document.getElementById('modal-selector-cliente');
    if (existente) existente.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay modal-selector-cliente-overlay';
    overlay.id = 'modal-selector-cliente';
    overlay.innerHTML = `
      <div class="modal modal-selector-cliente">
        <div class="selector-cliente-header">
          <h3><i class="fas fa-users"></i> Seleccionar cliente</h3>
          <button class="modal-close" aria-label="Cerrar" onclick="document.getElementById('modal-selector-cliente').remove()">&times;</button>
        </div>
        <div class="selector-cliente-body">
          <div class="selector-cliente-search">
            <i class="fas fa-search"></i>
            <input type="text" id="selector-cliente-input" placeholder="Busca por nombre o identificación">
          </div>
          <div class="selector-cliente-list" id="selector-cliente-list">
            ${this.renderizarListaClientesModalHTML('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const inputBusqueda = overlay.querySelector('#selector-cliente-input');
    const lista = overlay.querySelector('#selector-cliente-list');

    const refrescar = (termino) => {
      lista.innerHTML = this.renderizarListaClientesModalHTML(termino);
      this.configurarEventosListaClienteModal(lista, overlay);
    };

    refrescar('');

    inputBusqueda?.addEventListener('input', (e) => {
      refrescar(e.target.value || '');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  },

  renderizarListaClientesModalHTML(termino = '') {
    const terminoLower = termino.trim().toLowerCase();
    const clientesFiltrados = this.state.clientes.filter((c) => {
      const nombre = (c.nombre || '').toLowerCase();
      const documento = (c.documento || '').toLowerCase();
      if (!terminoLower) return true;
      return nombre.includes(terminoLower) || documento.includes(terminoLower);
    });

    const esGeneralSeleccionado = !this.state.clienteSeleccionado;
    let html = `
      <div class="selector-cliente-item ${esGeneralSeleccionado ? 'selected' : ''}" data-cliente-id="">
        <div class="selector-cliente-avatar"><i class="fas fa-user"></i></div>
        <div class="selector-cliente-textos">
          <strong>Cliente General</strong>
          <small>Consumidor Final</small>
        </div>
      </div>
    `;

    if (clientesFiltrados.length === 0) {
      html +=
        '<div class="selector-cliente-empty">No se encontraron clientes con ese criterio</div>';
      return html;
    }

    html += clientesFiltrados
      .map(
        (cliente) => `
      <div class="selector-cliente-item ${this.state.clienteSeleccionado?.id === cliente.id ? 'selected' : ''}" data-cliente-id="${cliente.id}">
        <div class="selector-cliente-avatar"><i class="fas fa-user-check"></i></div>
        <div class="selector-cliente-textos">
          <strong>${cliente.nombre}</strong>
          <small>${cliente.documento || 'Sin identificación'}</small>
        </div>
      </div>
    `
      )
      .join('');

    return html;
  },

  configurarEventosListaClienteModal(contenedor, overlay) {
    if (!contenedor) return;

    contenedor.querySelectorAll('.selector-cliente-item').forEach((item) => {
      item.addEventListener('click', () => {
        const clienteId = item.dataset.clienteId;
        this.seleccionarCliente(clienteId || null);
        overlay?.remove();
        Utils.showToast('Cliente actualizado para la venta', 'success');
      });
    });
  },

  // Estado de la vista del carrito
  carritoVistaActual: localStorage.getItem('carrito_vista') || 'cards', // 'cards' o 'rows'

  toggleCarritoVista(vista) {
    this.carritoVistaActual = vista;
    localStorage.setItem('carrito_vista', vista);
    this.actualizarModalCarrito();
    
    // Actualizar botones activos
    document.querySelectorAll('.btn-vista-toggle').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.vista === vista) btn.classList.add('active');
    });
  },

  renderizarProductosCarrito() {
    if (this.state.carrito.length === 0) {
      return `
        <div class="empty-cart-expanded">
          <i class="fas fa-shopping-cart"></i>
          <h3>Carrito vacío</h3>
          <p>Agrega productos para comenzar tu venta</p>
        </div>
      `;
    }

    if (this.carritoVistaActual === 'rows') {
      return this.renderizarVistaFilas();
    }
    return this.renderizarVistaTarjetas();
  },

  renderizarVistaTarjetas() {
    return `
      <div class="carrito-productos-grid">
        ${this.state.carrito.map((item) => {
          const producto = this.state.productos.find((p) => p.id === item.id);
          const stockDisponible = producto?.stock || 0;
          return `
            <div class="producto-expandido-card">
              <div class="producto-expandido-header">
                <div class="producto-info">
                  <h4>${item.nombre}</h4>
                  ${item.codigo ? `<span class="producto-codigo">#${item.codigo}</span>` : ''}
                  ${item.categoria ? `<span class="producto-categoria"><i class="fas fa-tag"></i> ${item.categoria}</span>` : ''}
                </div>
                <button class="btn-remove-producto" onclick="VentasMejorado.removerDelCarrito('${item.id}'); VentasMejorado.actualizarModalCarrito();">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
              
              <div class="producto-expandido-body">
                <div class="producto-precio-info">
                  <div class="precio-unitario">
                    <span class="label">Precio Unit.</span>
                    <span class="valor">${Utils.formatCurrency(item.precioVenta)}</span>
                  </div>
                  <div class="stock-info">
                    <span class="label">Stock Disp.</span>
                    <span class="valor stock-badge">${stockDisponible}</span>
                  </div>
                </div>
                
                <div class="producto-cantidad-control">
                  <button class="btn-cantidad" onclick="VentasMejorado.actualizarCantidad('${item.id}', -1); VentasMejorado.actualizarModalCarrito();">
                    <i class="fas fa-minus"></i>
                  </button>
                  <input type="number" 
                         class="input-cantidad-expandido" 
                         value="${item.cantidad}" 
                         min="1" 
                         max="${stockDisponible}"
                         data-product-id="${item.id}"
                         onchange="VentasMejorado.cambiarCantidadDirecta('${item.id}', this.value); VentasMejorado.actualizarModalCarrito();">
                  <button class="btn-cantidad" onclick="VentasMejorado.actualizarCantidad('${item.id}', 1); VentasMejorado.actualizarModalCarrito();" ${item.cantidad >= stockDisponible ? 'disabled' : ''}>
                    <i class="fas fa-plus"></i>
                  </button>
                </div>
                
                <div class="producto-subtotal">
                  <span class="label">Subtotal</span>
                  <span class="valor-total">${Utils.formatCurrency(item.precioVenta * item.cantidad)}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderizarVistaFilas() {
    return `
      <div class="carrito-lista-excel">
        <div class="carrito-excel-header">
          <div class="excel-col excel-col-producto">Producto</div>
          <div class="excel-col excel-col-codigo">Código</div>
          <div class="excel-col excel-col-precio">Precio</div>
          <div class="excel-col excel-col-stock">Stock</div>
          <div class="excel-col excel-col-cantidad">Cantidad</div>
          <div class="excel-col excel-col-subtotal">Subtotal</div>
          <div class="excel-col excel-col-accion"></div>
        </div>
        <div class="carrito-excel-body">
          ${this.state.carrito.map((item, index) => {
            const producto = this.state.productos.find((p) => p.id === item.id);
            const stockDisponible = producto?.stock || 0;
            return `
              <div class="carrito-excel-row ${index % 2 === 0 ? 'row-even' : 'row-odd'}">
                <div class="excel-col excel-col-producto" title="${item.nombre}">
                  <span class="producto-nombre-excel">${item.nombre}</span>
                  ${item.categoria ? `<span class="categoria-tag-mini"><i class="fas fa-tag"></i> ${item.categoria}</span>` : ''}
                </div>
                <div class="excel-col excel-col-codigo">
                  <span class="codigo-badge-excel">${item.codigo || '-'}</span>
                </div>
                <div class="excel-col excel-col-precio">${Utils.formatCurrency(item.precioVenta)}</div>
                <div class="excel-col excel-col-stock">
                  <span class="stock-badge-excel ${stockDisponible <= 3 ? 'stock-bajo' : ''}">${stockDisponible}</span>
                </div>
                <div class="excel-col excel-col-cantidad">
                  <div class="cantidad-control-excel">
                    <button class="btn-qty-excel" onclick="VentasMejorado.actualizarCantidad('${item.id}', -1); VentasMejorado.actualizarModalCarrito();">
                      <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" 
                           class="input-qty-excel" 
                           value="${item.cantidad}" 
                           min="1" 
                           max="${stockDisponible}"
                           onchange="VentasMejorado.cambiarCantidadDirecta('${item.id}', this.value); VentasMejorado.actualizarModalCarrito();">
                    <button class="btn-qty-excel" onclick="VentasMejorado.actualizarCantidad('${item.id}', 1); VentasMejorado.actualizarModalCarrito();" ${item.cantidad >= stockDisponible ? 'disabled' : ''}>
                      <i class="fas fa-plus"></i>
                    </button>
                  </div>
                </div>
                <div class="excel-col excel-col-subtotal">
                  <span class="subtotal-valor-excel">${Utils.formatCurrency(item.precioVenta * item.cantidad)}</span>
                </div>
                <div class="excel-col excel-col-accion">
                  <button class="btn-delete-excel" onclick="VentasMejorado.removerDelCarrito('${item.id}'); VentasMejorado.actualizarModalCarrito();">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  mostrarCarritoExpandido() {
    const { subtotal, descuento, iva, total } = this.calcularTotales();

    // Iniciar escáner QR automáticamente si no está activo (minimizado con timer de 1 minuto)
    if (!this._qrScannerOverlay) {
      setTimeout(() => {
        console.log('📷 Iniciando escáner QR desde carrito...');
        this.abrirLectorQrPos(true); // true = iniciar minimizado
      }, 300);
    } else {
      // Si ya existe, asegurar que esté visible y reiniciar timer
      this._qrScannerOverlay.style.zIndex = '100000';
      this._qrTimeRemaining = this._qrAutoCloseSeconds;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay modal-carrito-expandido';
    modal.id = 'modal-carrito-expandido';
    modal.innerHTML = `
      <div class="modal-carrito-grande">
        <div class="modal-carrito-header">
          <div class="header-row-top">
            <div class="header-left">
              <h2>
                <i class="fas fa-shopping-cart"></i>
                Carrito de Compras
                <span class="badge-items">${this.state.carrito.length} ${this.state.carrito.length === 1 ? 'producto' : 'productos'}</span>
              </h2>
              <button class="btn-qr-carrito" onclick="VentasMejorado.abrirLectorQrPos()" title="Escanear QR/Código de barras">
                <i class="fas fa-qrcode"></i>
                <span>Escanear</span>
              </button>
            </div>
            <div class="header-center" id="header-facturacion-data">
              ${this.renderizarFacturacionHeader()}
            </div>
            <div class="header-right">
              <div class="vista-toggle-group">
                <button class="btn-vista-toggle ${this.carritoVistaActual === 'cards' ? 'active' : ''}" data-vista="cards" onclick="VentasMejorado.toggleCarritoVista('cards')" title="Vista tarjetas">
                  <i class="fas fa-th-large"></i>
                </button>
                <button class="btn-vista-toggle ${this.carritoVistaActual === 'rows' ? 'active' : ''}" data-vista="rows" onclick="VentasMejorado.toggleCarritoVista('rows')" title="Vista lista Excel">
                  <i class="fas fa-list"></i>
                </button>
              </div>
              <button class="btn-close-modal" onclick="document.getElementById('modal-carrito-expandido').remove()">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
        
        <div class="modal-carrito-body">
          <div class="modal-carrito-layout">
            <div class="carrito-panel productos-panel" id="carrito-productos-container">
              ${this.renderizarProductosCarrito()}
            </div>

            <aside class="carrito-panel resumen-panel">
              <div class="resumen-flotante" id="resumen-flotante-modal">
            <!-- Cliente -->
            <div class="cliente-flotante">
              <div class="cliente-flotante-header">
                <i class="fas fa-user"></i>
                <span>Cliente</span>
                <button class="btn-cambiar-cliente" onclick="VentasMejorado.mostrarSelectorClienteModal()">
                  <i class="fas fa-exchange-alt"></i>
                  <span>Cambiar</span>
                </button>
              </div>
              <div class="cliente-flotante-info" id="cliente-flotante-info">
                ${this.obtenerHtmlClienteFlotante()}
              </div>
            </div>
            
            <!-- Descuento -->
            <div class="descuento-flotante">
              <button class="btn-toggle-desc-flotante" onclick="document.getElementById('desc-inputs-flotante').style.display = document.getElementById('desc-inputs-flotante').style.display === 'none' ? 'flex' : 'none'">
                <i class="fas fa-tag"></i>
                <span>Descuento</span>
              </button>
              <div class="desc-inputs-flotante" id="desc-inputs-flotante" style="display: none;">
                <input type="number" id="desc-porcentaje-modal" min="0" max="100" step="0.1" value="${this.state.descuentoPorcentaje}" placeholder="%" 
                       onchange="VentasMejorado.state.descuentoPorcentaje = parseFloat(this.value) || 0; VentasMejorado.state.descuentoMonto = 0; VentasMejorado.actualizarSoloResumen();">
                <input type="number" id="desc-monto-modal" min="0" step="0.01" value="${this.state.descuentoMonto}" placeholder="$" 
                       onchange="VentasMejorado.state.descuentoMonto = parseFloat(this.value) || 0; VentasMejorado.state.descuentoPorcentaje = 0; VentasMejorado.actualizarSoloResumen();">
              </div>
            </div>
            
            <!-- Resumen -->
            <div class="resumen-compra-compacto" id="resumen-valores">
              <div class="resumen-row-compact">
                <span class="label">Subtotal:</span>
                <span class="valor">${Utils.formatCurrency(subtotal)}</span>
              </div>
              ${
                descuento > 0
                  ? `
                <div class="resumen-row-compact descuento">
                  <span class="label">Descuento:</span>
                  <span class="valor">-${Utils.formatCurrency(descuento)}</span>
                </div>
              `
                  : ''
              }
              <div class="resumen-row-compact">
                <span class="label">IVA (15%):</span>
                <span class="valor">${Utils.formatCurrency(iva)}</span>
              </div>
              <div class="resumen-divider-compact"></div>
              <div class="resumen-row-compact total">
                <span class="label">Total a Pagar:</span>
                <span class="valor">${Utils.formatCurrency(total)}</span>
              </div>
            </div>
            <div class="acciones-flotantes">
              <button class="btn-flotante btn-secondary" onclick="document.getElementById('modal-carrito-expandido').remove()">
                <i class="fas fa-arrow-left"></i>
                <span>Seguir Comprando</span>
              </button>
              <button class="btn-flotante btn-primary" onclick="document.getElementById('modal-carrito-expandido').remove(); VentasMejorado.mostrarModalPago();" ${this.state.carrito.length === 0 ? 'disabled' : ''}>
                <i class="fas fa-cash-register"></i>
                <span>Procesar Venta</span>
              </button>
            </div>
          </div>
        </aside>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.actualizarPanelFacturacionModal();
  },

  actualizarModalCarrito() {
    const modal = document.getElementById('modal-carrito-expandido');
    if (modal) {
      // Actualizar el contenedor de productos con la vista actual
      const container = modal.querySelector('#carrito-productos-container');
      if (container) {
        container.innerHTML = this.renderizarProductosCarrito();

        // Actualizar resumen y paneles
        this.actualizarSoloResumen();
        this.actualizarPanelClienteModal();
        this.actualizarPanelFacturacionModal();

        // Actualizar badge de productos
        const badge = modal.querySelector('.badge-items');
        if (badge) {
          badge.textContent = `${this.state.carrito.length} ${this.state.carrito.length === 1 ? 'producto' : 'productos'}`;
        }
      }
    }
    this.renderizarCarrito();
  },

  actualizarSoloResumen() {
    const resumenDiv = document.getElementById('resumen-valores');
    if (!resumenDiv) return;

    const { subtotal, descuento, iva, total } = this.calcularTotales();

    resumenDiv.innerHTML = `
      <div class="resumen-row-compact">
        <span class="label">Subtotal:</span>
        <span class="valor">${Utils.formatCurrency(subtotal)}</span>
      </div>
      ${
        descuento > 0
          ? `
        <div class="resumen-row-compact descuento">
          <span class="label">Descuento:</span>
          <span class="valor">-${Utils.formatCurrency(descuento)}</span>
        </div>
      `
          : ''
      }
      <div class="resumen-row-compact">
        <span class="label">IVA (15%):</span>
        <span class="valor">${Utils.formatCurrency(iva)}</span>
      </div>
      <div class="resumen-divider-compact"></div>
      <div class="resumen-row-compact total">
        <span class="label">Total a Pagar:</span>
        <span class="valor">${Utils.formatCurrency(total)}</span>
      </div>
    `;

    // Actualizar inputs de descuento si existen
    const descPorcentajeInput = document.getElementById('desc-porcentaje-modal');
    const descMontoInput = document.getElementById('desc-monto-modal');
    if (descPorcentajeInput) descPorcentajeInput.value = this.state.descuentoPorcentaje;
    if (descMontoInput) descMontoInput.value = this.state.descuentoMonto;

    // Actualizar datos de facturación en el header
    this.actualizarFacturacionHeader();
  },

  actualizarFacturacionHeader() {
    const headerData = document.getElementById('header-facturacion-data');
    if (headerData) {
      headerData.innerHTML = this.renderizarFacturacionHeader();
    }
  },

  cambiarCantidadDirecta(productId, nuevaCantidad) {
    const cantidad = parseInt(nuevaCantidad) || 1;
    const itemEnCarrito = this.state.carrito.find((item) => item.id === productId);
    if (!itemEnCarrito) return;

    const producto = this.state.productos.find((p) => p.id === productId);

    if (cantidad <= 0) {
      this.removerDelCarrito(productId);
    } else if (producto && cantidad > producto.stock) {
      Utils.showToast(`Stock máximo: ${producto.stock}`, 'warning');
      itemEnCarrito.cantidad = producto.stock;
    } else {
      itemEnCarrito.cantidad = cantidad;
    }
  },

  calcularTotales() {
    const subtotal = this.state.carrito.reduce(
      (acc, item) => acc + item.precioVenta * item.cantidad,
      0
    );

    // Calcular descuento
    let descuento = 0;
    if (this.state.descuentoPorcentaje > 0) {
      descuento = subtotal * (this.state.descuentoPorcentaje / 100);
    } else if (this.state.descuentoMonto > 0) {
      descuento = Math.min(this.state.descuentoMonto, subtotal);
    }

    const subtotalConDescuento = subtotal - descuento;
    const iva = subtotalConDescuento * 0.15; // IVA 15%
    const total = subtotalConDescuento + iva;

    return { subtotal, descuento, iva, total };
  },

  mostrarModalPago() {
    const { subtotal, descuento, iva, total } = this.calcularTotales();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-pago';
    modal.innerHTML = `
      <div class="modal modal-pago-profesional">
        <div class="modal-header">
          <h3><i class="fas fa-cash-register"></i> Finalizar Venta</h3>
          <button class="modal-close" onclick="document.getElementById('modal-pago').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="total-pagar-grande">
            <div class="label">Total a Pagar</div>
            <div class="valor">${Utils.formatCurrency(total)}</div>
          </div>
          
          <div class="payment-methods-grid">
            <button class="btn-payment-method" data-method="efectivo">
              <i class="fas fa-money-bill-wave"></i>
              <span>Efectivo</span>
            </button>
            <button class="btn-payment-method" data-method="tarjeta">
              <i class="fas fa-credit-card"></i>
              <span>Tarjeta</span>
            </button>
            <button class="btn-payment-method" data-method="transferencia">
              <i class="fas fa-exchange-alt"></i>
              <span>Transferencia</span>
            </button>
          </div>
          
          <div class="payment-details" id="payment-details" style="display: none;"></div>
          
          <button class="btn-procesar-pago" id="btn-procesar-pago" disabled>
            <i class="fas fa-check-circle"></i>
            <span>Procesar Pago</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.configurarEventosPago(total);

    const defaultMetodo = document.querySelector('.btn-payment-method[data-method="efectivo"]');
    if (defaultMetodo) {
      defaultMetodo.click();
    }
  },

  configurarEventosPago(total) {
    const metodoBtns = document.querySelectorAll('.btn-payment-method');
    const detallesDiv = document.getElementById('payment-details');
    const btnProcesar = document.getElementById('btn-procesar-pago');
    let metodoSeleccionado = null;
    let montoPagado = 0;

    metodoBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        metodoBtns.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        metodoSeleccionado = btn.dataset.method;

        if (metodoSeleccionado === 'efectivo') {
          this.mostrarDetallesEfectivo(total, detallesDiv, btnProcesar);
        } else if (metodoSeleccionado === 'tarjeta') {
          this.mostrarDetallesTarjeta(total, detallesDiv, btnProcesar);
        } else if (metodoSeleccionado === 'transferencia') {
          this.mostrarDetallesTransferencia(total, detallesDiv, btnProcesar);
        }
      });
    });

    btnProcesar.addEventListener('click', () => {
      if (metodoSeleccionado) {
        const datosAdicionales = this.obtenerDatosPago(metodoSeleccionado);
        this.finalizarVenta(metodoSeleccionado, datosAdicionales);
      }
    });
  },

  mostrarDetallesEfectivo(total, container, btnProcesar) {
    container.style.display = 'block';
    container.innerHTML = `
      <div class="payment-input-group">
        <label><i class="fas fa-hand-holding-usd"></i> Monto Recibido</label>
        <input type="number" id="monto-recibido" step="0.01" min="${total}" placeholder="0.00" autocomplete="off">
      </div>
      <div class="cambio-display" id="cambio-display" style="display: none;">
        <span class="label"><i class="fas fa-coins"></i> Cambio</span>
        <span class="valor" id="cambio-valor">$0.00</span>
      </div>
    `;

    const montoInput = document.getElementById('monto-recibido');
    const cambioDisplay = document.getElementById('cambio-display');
    const cambioValor = document.getElementById('cambio-valor');

    const totalFormateado = Number(total || 0).toFixed(2);
    montoInput.value = totalFormateado;
    montoInput.focus();

    montoInput.addEventListener('input', (e) => {
      const monto = parseFloat(e.target.value) || 0;
      const totalRedondeado = Math.round(total * 100) / 100;
      const montoRedondeado = Math.round(monto * 100) / 100;

      // Usar comparación con tolerancia para evitar problemas de precisión decimal
      if (
        montoRedondeado >= totalRedondeado ||
        Math.abs(montoRedondeado - totalRedondeado) < 0.01
      ) {
        const cambio = montoRedondeado - totalRedondeado;
        cambioDisplay.style.display = 'flex';
        cambioValor.textContent = Utils.formatCurrency(Math.max(0, cambio));
        btnProcesar.disabled = false;
      } else {
        cambioDisplay.style.display = 'none';
        btnProcesar.disabled = true;
      }
    });

    if (total <= 0) {
      cambioDisplay.style.display = 'flex';
      cambioValor.textContent = Utils.formatCurrency(0);
      btnProcesar.disabled = false;
    } else {
      // Disparar el evento después de un pequeño delay para asegurar que se procese
      setTimeout(() => {
        montoInput.dispatchEvent(new Event('input', { bubbles: true }));
      }, 50);
    }

    // Atajos de montos rápidos
    const montosRapidos = document.createElement('div');
    montosRapidos.className = 'montos-rapidos';
    montosRapidos.style.cssText = 'display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;';

    const billetes = [5, 10, 20, 50, 100];
    billetes.forEach((billete) => {
      const btn = document.createElement('button');
      btn.className = 'btn-monto-rapido';
      btn.style.cssText =
        'flex: 1; padding: 0.5rem; border: 2px solid #3a3f52; border-radius: 8px; background: #1e2130; color: #e8eaed; cursor: pointer; font-weight: 600; transition: all 0.2s;';
      btn.textContent = `$${billete}`;
      btn.addEventListener('click', () => {
        const montoActual = parseFloat(montoInput.value) || 0;
        montoInput.value = (montoActual + billete).toFixed(2);
        montoInput.dispatchEvent(new Event('input'));
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#667eea';
        btn.style.borderColor = '#667eea';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#1e2130';
        btn.style.borderColor = '#3a3f52';
      });
      montosRapidos.appendChild(btn);
    });

    container.appendChild(montosRapidos);
  },

  mostrarDetallesTarjeta(total, container, btnProcesar) {
    container.style.display = 'block';
    container.innerHTML = `
      <div class="payment-input-group">
        <label><i class="fas fa-credit-card"></i> Últimos 4 dígitos</label>
        <input type="text" id="tarjeta-digitos" maxlength="4" pattern="[0-9]{4}" placeholder="1234">
      </div>
      <div class="payment-input-group">
        <label><i class="fas fa-building"></i> Banco / Emisor</label>
        <input type="text" id="tarjeta-banco" placeholder="Banco">
      </div>
      <div class="payment-input-group">
        <label><i class="fas fa-receipt"></i> Número de Autorización</label>
        <input type="text" id="tarjeta-autorizacion" placeholder="123456">
      </div>
    `;

    const digitosInput = document.getElementById('tarjeta-digitos');
    const autorizacionInput = document.getElementById('tarjeta-autorizacion');

    digitosInput.focus();

    const validarTarjeta = () => {
      const digitos = digitosInput.value.trim();
      const autorizacion = autorizacionInput.value.trim();
      btnProcesar.disabled = !(digitos.length === 4 && autorizacion.length > 0);
    };

    digitosInput.addEventListener('input', validarTarjeta);
    autorizacionInput.addEventListener('input', validarTarjeta);
  },

  mostrarDetallesTransferencia(total, container, btnProcesar) {
    container.style.display = 'block';
    container.innerHTML = `
      <div class="payment-input-group">
        <label><i class="fas fa-university"></i> Banco Origen</label>
        <input type="text" id="transferencia-banco" placeholder="Banco">
      </div>
      <div class="payment-input-group">
        <label><i class="fas fa-hashtag"></i> Número de Referencia</label>
        <input type="text" id="transferencia-referencia" placeholder="REF123456">
      </div>
      <div class="payment-input-group">
        <label><i class="fas fa-calendar"></i> Fecha / Hora</label>
        <input type="datetime-local" id="transferencia-fecha" value="${new Date().toISOString().slice(0, 16)}">
      </div>
    `;

    const referenciaInput = document.getElementById('transferencia-referencia');

    referenciaInput.focus();

    referenciaInput.addEventListener('input', () => {
      btnProcesar.disabled = referenciaInput.value.trim().length === 0;
    });
  },

  obtenerDatosPago(metodo) {
    const datos = { metodo };

    if (metodo === 'efectivo') {
      datos.monto_recibido = parseFloat(document.getElementById('monto-recibido').value) || 0;
      datos.cambio = datos.monto_recibido - this.calcularTotales().total;
    } else if (metodo === 'tarjeta') {
      datos.ultimos_digitos = document.getElementById('tarjeta-digitos').value;
      datos.banco = document.getElementById('tarjeta-banco').value;
      datos.autorizacion = document.getElementById('tarjeta-autorizacion').value;
    } else if (metodo === 'transferencia') {
      datos.banco = document.getElementById('transferencia-banco').value;
      datos.referencia = document.getElementById('transferencia-referencia').value;
      datos.fecha_hora = document.getElementById('transferencia-fecha').value;
    }

    return datos;
  },

  esErrorConexion(error) {
    if (!error) {
      return false;
    }

    const mensaje = (error.message || error.toString() || '').toLowerCase();
    return (
      error instanceof TypeError ||
      mensaje.includes('failed to fetch') ||
      mensaje.includes('networkerror') ||
      mensaje.includes('connection refused') ||
      mensaje.includes('net::err')
    );
  },

  async guardarVentaOffline(ventaData) {
    if (typeof Database === 'undefined' || typeof Database.getCollection !== 'function') {
      throw new Error('Base de datos local no disponible para modo offline.');
    }

    const ventas = Database.getCollection('ventas') || [];
    const pendientes = Database.getCollection('ventasPendientes') || [];
    const identificador =
      typeof Utils !== 'undefined' && typeof Utils.generateId === 'function'
        ? Utils.generateId()
        : Date.now().toString(36);
    const numero = `OFF-${identificador}`;
    const timestamp = new Date().toISOString();

    const registro = {
      ...ventaData,
      id: numero,
      numero,
      estado: 'pendiente',
      sincronizado: false,
      offline: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    ventas.push(registro);
    pendientes.push(registro);
    Database.saveCollection('ventas', ventas);
    Database.saveCollection('ventasPendientes', pendientes);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ventaOfflineGuardada', { detail: { numero, total: registro.total } })
      );
    }

    return registro;
  },

  actualizarStockLocalDespuesVenta(items = []) {
    if (!Array.isArray(items) || !items.length) {
      return;
    }

    const localProductos =
      typeof Database !== 'undefined' && typeof Database.getCollection === 'function'
        ? Database.getCollection('productos') || []
        : [];

    const mapa = new Map(localProductos.map((producto) => [producto.id, { ...producto }]));

    items.forEach((item) => {
      const productoId = item.producto_id || item.productoId || item.id || item.idProducto;
      if (!productoId) {
        return;
      }

      const registroMapeado =
        mapa.get(productoId) || this.state.productos.find((producto) => producto.id === productoId);
      if (!registroMapeado) {
        return;
      }

      const cantidadVendida = Number(item.cantidad) || 0;
      const stockActual = Number(registroMapeado.stock) || 0;
      registroMapeado.stock = Math.max(0, stockActual - cantidadVendida);
      registroMapeado.updatedAt = new Date().toISOString();
      mapa.set(productoId, { ...registroMapeado });
    });

    const listaFinal = Array.from(mapa.values());

    if (typeof Database !== 'undefined' && typeof Database.saveCollection === 'function') {
      Database.saveCollection('productos', listaFinal);
    }

    this.state.productos = this.state.productos.map((producto) => {
      const actualizado = mapa.get(producto.id);
      return actualizado ? { ...producto, stock: actualizado.stock } : producto;
    });
  },

  async postProcesarVenta(datosFactura, opciones = {}) {
    const { toastMensaje = '', toastTipo = 'success', recargarDesdeServidor = true } = opciones;

    this.state.carrito = [];
    this.state.descuentoPorcentaje = 0;
    this.state.descuentoMonto = 0;
    this.state.clienteSeleccionado = null;

    const porcentajeInput = document.getElementById('descuento-porcentaje');
    const montoInput = document.getElementById('descuento-monto');
    const clienteSearchInput = document.getElementById('cliente-search');
    if (porcentajeInput) porcentajeInput.value = 0;
    if (montoInput) montoInput.value = 0;
    if (clienteSearchInput) clienteSearchInput.value = '';

    this.renderizarCarrito();
    this.actualizarClienteSeleccionado();

    if (recargarDesdeServidor) {
      try {
        const productosRecargados = await Auth._request('/pos/productos', { method: 'GET' });
        this.state.productos = this.normalizarProductosRespuesta(productosRecargados);
      } catch (error) {
        console.warn('No se pudieron recargar productos desde el servidor:', error);
      }
    } else {
      this.actualizarStockLocalDespuesVenta(datosFactura.items || []);
    }

    this.renderizarCategorias();
    this.renderizarProductos();

    let facturaMostrada = false;
    if (
      typeof FacturacionSRI !== 'undefined' &&
      typeof FacturacionSRI.mostrarFactura === 'function'
    ) {
      try {
        FacturacionSRI.mostrarFactura(datosFactura);
        facturaMostrada = true;
      } catch (facturaError) {
        console.warn('No se pudo mostrar la factura electrónica:', facturaError);
      }
    }

    if (!facturaMostrada && toastMensaje) {
      Utils.showToast(toastMensaje, toastTipo);
    } else if (toastMensaje && facturaMostrada && toastTipo !== 'success') {
      Utils.showToast(toastMensaje, toastTipo);
    }
  },

  async finalizarVenta(metodoPago) {
    const datosPago = this.obtenerDatosPago(metodoPago);

    const modal = document.getElementById('modal-pago');
    if (modal) modal.remove();

    const { subtotal, descuento, iva, total } = this.calcularTotales();

    const ventaData = {
      cliente_id: this.state.clienteSeleccionado?.id || null,
      items: this.state.carrito.map((item) => ({
        producto_id: item.id,
        producto_nombre: item.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precioVenta,
        total: item.precioVenta * item.cantidad,
      })),
      subtotal,
      iva,
      descuento,
      total,
      metodo_pago: metodoPago,
      datos_pago: datosPago,
      estado: 'completada',
    };

    // USAR TIEMPO SERVIDOR ANTI-FRAUDE
    const fechaServidor = window.TiempoServidor?.obtenerFechaFormateada() || new Date().toLocaleDateString('es-EC');
    const horaServidor = window.TiempoServidor?.obtenerHora() || new Date().toLocaleTimeString('es-EC');

    const datosFacturaBase = {
      fecha: fechaServidor,
      hora: horaServidor,
      cliente: {
        nombre: this.state.clienteSeleccionado?.nombre || 'CONSUMIDOR FINAL',
        cedula:
          this.state.clienteSeleccionado?.cedula || this.state.clienteSeleccionado?.ruc || null,
        direccion: this.state.clienteSeleccionado?.direccion || null,
        telefono: this.state.clienteSeleccionado?.telefono || null,
        celular: this.state.clienteSeleccionado?.celular || null,
        whatsapp:
          this.state.clienteSeleccionado?.whatsapp ||
          this.state.clienteSeleccionado?.celular ||
          null,
        email: this.state.clienteSeleccionado?.email || null,
      },
      items: this.state.carrito.map((item) => ({
        codigo: item.codigo || null,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioVenta: item.precioVenta,
        productoId: item.id,
      })),
      subtotal,
      descuento,
      iva,
      total,
      metodo_pago: metodoPago,
      datos_pago: datosPago,
    };

    try {
      const response = await Auth._request('/ventas', {
        method: 'POST',
        body: JSON.stringify(ventaData),
      });

      if (response && response.success) {
        const numeroFactura = response.numero || response.venta_id || response.id || Date.now();
        const datosFactura = { ...datosFacturaBase, numero: numeroFactura };

        // --- INICIO DE LA MODIFICACIÓN: Integración con SRI ---
        if (window.SRIIntegration && window.SRIIntegration.isConfigured()) {
          console.log('Facturación SRI detectada y configurada. Intentando emitir comprobante...');
          try {
            // No es necesario esperar (await) para no bloquear el flujo principal.
            // El servicio ya muestra sus propios toasts de éxito o error.
            window.SRIIntegration.emitirFactura(datosFactura);
          } catch (sriError) {
            console.error('Error al iniciar la emisión SRI (no bloqueante):', sriError);
            Utils.showToast(
              'La venta se guardó, pero hubo un error al enviar la factura electrónica.',
              'warning'
            );
          }
        } else {
          console.log('Facturación SRI no configurada o deshabilitada. Saltando emisión.');
        }
        // --- FIN DE LA MODIFICACIÓN ---

        // Notificar a otros módulos que las ventas han cambiado
        DataRefreshManager.notify('ventas');

        // 📱 ENVIAR NOTIFICACIÓN A TELEGRAM
        if (window.TelegramNotificaciones && TelegramNotificaciones.inicializado) {
          try {
            // Notificar la venta si está configurado
            TelegramNotificaciones.notificarVenta({
              numero: numeroFactura,
              clienteNombre: datosFactura.cliente?.nombre || 'Cliente general',
              total: datosFactura.total,
              productos: datosFactura.items || [],
              metodoPago: metodoPago
            });
            
            // Verificar stock bajo de productos vendidos
            for (const item of datosFactura.items || []) {
              if (item.productoId) {
                const producto = this.state.productos.find(p => p.id === item.productoId);
                if (producto) {
                  const stockActual = (producto.stock || 0) - item.cantidad;
                  TelegramNotificaciones.enviarAlertaStockInmediata(
                    producto,
                    stockActual,
                    'Venta'
                  );
                }
              }
            }
          } catch (telegramError) {
            console.warn('Error al enviar notificación Telegram:', telegramError);
          }
        }

        await this.postProcesarVenta(datosFactura, {
          toastMensaje: `Venta #${numeroFactura} realizada con éxito`,
          toastTipo: 'success',
          recargarDesdeServidor: true,
        });
      } else {
        throw new Error(response?.message || 'Error al procesar la venta');
      }
    } catch (error) {
      console.error('Error al finalizar la venta:', error);

      if (this.esErrorConexion(error)) {
        try {
          const ventaOffline = await this.guardarVentaOffline(ventaData);
          const numeroOffline = ventaOffline.numero;
          const datosFactura = { ...datosFacturaBase, numero: numeroOffline };

          await this.postProcesarVenta(datosFactura, {
            toastMensaje: `Venta almacenada offline (#${numeroOffline}). Se sincronizará al reconectar.`,
            toastTipo: 'warning',
            recargarDesdeServidor: false,
          });
        } catch (offlineError) {
          console.error('No se pudo guardar la venta en modo offline:', offlineError);
          Utils.showToast(
            'Sin conexión con el servidor y no fue posible guardar la venta localmente.',
            'error'
          );
        }
      } else {
        Utils.showToast(error.message || 'Error al procesar la venta', 'error');
      }
    }
  },

  async renderHistorial(container) {
    if (!container) {
      return;
    }

    await this.ensureClientesCargados();

    const filtrosIniciales = this.getDefaultHistorialFilters();
    this.state.historialResumen = null;
    this.state.historial = [];
    this.state.historialFiltros = { ...filtrosIniciales };

    container.innerHTML = this.getHistorialLayout(filtrosIniciales);
    this.cacheHistorialDomReferences(container);
    this.bindHistorialEvents();

    await this.cargarHistorialDatos();
  },

  getHistorialLayout(filtros = {}) {
    const safe = (value) => {
      if (!value) return '';
      return typeof Utils !== 'undefined' && typeof Utils.sanitize === 'function'
        ? Utils.sanitize(String(value))
        : String(value);
    };

    const clientesOptions = [
      '<option value="">Todos los clientes</option>',
      ...this.state.clientes.map(
        (cliente) => `
        <option value="${safe(cliente.id)}"${cliente.id === filtros.clienteId ? ' selected' : ''}>
          ${safe(cliente.nombre || cliente.documento || 'Cliente sin nombre')}
        </option>
      `
      ),
    ].join('');

    const metodo = filtros.metodoPago || '';
    const metodoLower = metodo.toLowerCase();
    const metodoExtras =
      metodo &&
      !['efectivo', 'tarjeta', 'transferencia', 'cheque', 'deposito'].includes(metodoLower)
        ? `<option value="${safe(metodo)}" selected>${safe(metodo)}</option>`
        : '';

    const estado = filtros.estado || '';
    const estadoLower = estado.toLowerCase();
    const estadoExtras =
      estado && !['completada', 'pendiente', 'anulada', 'borrador'].includes(estadoLower)
        ? `<option value="${safe(estado)}" selected>${safe(estado)}</option>`
        : '';

    return `
      <div id="historial-ventas-container" class="ventas-historial-container">
        <div class="historial-loading" id="historial-global-loader" aria-hidden="true">
          <i class="fas fa-circle-notch fa-spin"></i>
          <span>Procesando información...</span>
        </div>
        <div class="historial-header">
          <div class="historial-header-titles">
            <h2><i class="fas fa-receipt"></i> Historial de Ventas</h2>
            <p class="historial-subtitle">Panel integral para reimprimir facturas y alinear ventas con finanzas, marketing e inventario.</p>
          </div>
          <div class="historial-header-actions">
            <button class="btn btn-secondary" id="btn-back-dashboard-historial"><i class="fas fa-arrow-left"></i> Volver</button>
            <button class="btn btn-primary" id="btn-ir-pos"><i class="fas fa-plus-circle"></i> Nueva Venta</button>
          </div>
        </div>

        <div class="historial-quick-actions" id="historial-quick-actions">
          <button type="button" data-module="finanzas-mejorado"><i class="fas fa-chart-line"></i> Finanzas</button>
          <button type="button" data-module="contabilidad"><i class="fas fa-balance-scale"></i> Contabilidad</button>
          <button type="button" data-module="cuentas"><i class="fas fa-file-invoice-dollar"></i> Cuentas por Cobrar/Pagar</button>
          <button type="button" data-module="estadisticas"><i class="fas fa-chart-area"></i> Estadísticas</button>
          <button type="button" data-module="marketing"><i class="fas fa-bullhorn"></i> Marketing IA</button>
          <button type="button" data-module="publicidad"><i class="fas fa-ad"></i> Publicidad</button>
          <button type="button" data-module="recordatorios"><i class="fas fa-bell"></i> Notificaciones IA</button>
          <button type="button" data-module="inventario"><i class="fas fa-boxes"></i> Inventario</button>
        </div>

        <form id="historial-filtros" class="historial-filters">
          <div class="filter-field filter-field--search">
            <label for="historial-search">Buscar</label>
            <div class="input-icon">
              <i class="fas fa-search"></i>
              <input type="text" id="historial-search" placeholder="Número, cliente, producto o nota" value="${safe(filtros.search || '')}">
            </div>
          </div>
          <div class="filter-field">
            <label for="historial-cliente">Cliente</label>
            <select id="historial-cliente">
              ${clientesOptions}
            </select>
          </div>
          <div class="filter-field">
            <label for="filter-fecha-desde">Desde</label>
            <input type="date" id="filter-fecha-desde" value="${safe(filtros.fechaDesde || '')}">
          </div>
          <div class="filter-field">
            <label for="filter-fecha-hasta">Hasta</label>
            <input type="date" id="filter-fecha-hasta" value="${safe(filtros.fechaHasta || '')}">
          </div>
          <div class="filter-field">
            <label for="historial-metodo">Método de pago</label>
            <select id="historial-metodo">
              <option value=""${!metodo ? ' selected' : ''}>Todos</option>
              <option value="efectivo"${metodoLower === 'efectivo' ? ' selected' : ''}>Efectivo</option>
              <option value="tarjeta"${metodoLower === 'tarjeta' ? ' selected' : ''}>Tarjeta</option>
              <option value="transferencia"${metodoLower === 'transferencia' ? ' selected' : ''}>Transferencia</option>
              <option value="cheque"${metodoLower === 'cheque' ? ' selected' : ''}>Cheque</option>
              <option value="deposito"${metodoLower === 'deposito' ? ' selected' : ''}>Depósito</option>
              ${metodoExtras}
            </select>
          </div>
          <div class="filter-field">
            <label for="historial-estado">Estado</label>
            <select id="historial-estado">
              <option value=""${!estado ? ' selected' : ''}>Todos</option>
              <option value="completada"${estadoLower === 'completada' ? ' selected' : ''}>Completada</option>
              <option value="pendiente"${estadoLower === 'pendiente' ? ' selected' : ''}>Pendiente</option>
              <option value="anulada"${estadoLower === 'anulada' ? ' selected' : ''}>Anulada</option>
              <option value="borrador"${estadoLower === 'borrador' ? ' selected' : ''}>Borrador</option>
              ${estadoExtras}
            </select>
          </div>
          <div class="filter-field filter-field--rangos">
            <label>Rangos rápidos</label>
            <div class="range-buttons">
              <button type="button" class="btn-chip" data-range="today">Hoy</button>
              <button type="button" class="btn-chip" data-range="week">Esta semana</button>
              <button type="button" class="btn-chip" data-range="month">Este mes</button>
              <button type="button" class="btn-chip" data-range="quarter">Últimos 90 días</button>
            </div>
          </div>
          <div class="filter-actions">
            <button type="submit" class="btn btn-primary" id="btn-historial-filtrar"><i class="fas fa-filter"></i> Aplicar</button>
            <button type="button" class="btn btn-secondary" id="btn-historial-limpiar"><i class="fas fa-eraser"></i> Limpiar</button>
            <button type="button" class="btn btn-tertiary" id="btn-historial-recargar"><i class="fas fa-sync-alt"></i> Refrescar</button>
            <button type="button" class="btn btn-tertiary" id="btn-historial-exportar"><i class="fas fa-file-csv"></i> Exportar CSV</button>
            <button type="button" class="btn btn-tertiary" id="btn-historial-resumen"><i class="fas fa-file-pdf"></i> Informe Smart</button>
          </div>
        </form>

        <section class="historial-summary" id="historial-summary">
          <div class="summary-card">
            <div class="summary-card-header">
              <span class="summary-label">Ingresos</span>
              <span class="summary-delta" id="historial-variacion-ingresos"></span>
            </div>
            <span class="summary-value" id="historial-total-ingresos">--</span>
            <small id="historial-periodo-fechas"></small>
          </div>
          <div class="summary-card">
            <div class="summary-card-header">
              <span class="summary-label">Ventas</span>
              <span class="summary-delta" id="historial-variacion-ventas"></span>
            </div>
            <span class="summary-value" id="historial-total-ventas">--</span>
            <small id="historial-clientes-unicos">Clientes únicos: --</small>
          </div>
          <div class="summary-card">
            <div class="summary-card-header">
              <span class="summary-label">Ticket promedio</span>
            </div>
            <span class="summary-value" id="historial-ticket-promedio">--</span>
            <small id="historial-descuento-total">Descuentos: --</small>
          </div>
          <div class="summary-card">
            <div class="summary-card-header">
              <span class="summary-label">Flujo de caja</span>
            </div>
            <span class="summary-value" id="historial-flujo-balance">--</span>
            <small id="historial-flujo-detalle">Ingresos: -- | Egresos: --</small>
          </div>
        </section>

        <section class="historial-charts">
          <div class="chart-card">
            <div class="chart-header">
              <h3><i class="fas fa-chart-line"></i> Tendencia diaria</h3>
            </div>
            <div class="chart-body">
              <canvas id="historial-chart-diario"></canvas>
              <div class="chart-empty" id="historial-chart-diario-empty">Sin datos diarios en el rango seleccionado.</div>
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-header">
              <h3><i class="fas fa-percentage"></i> Métodos de pago</h3>
            </div>
            <div class="chart-body">
              <canvas id="historial-chart-metodos"></canvas>
              <div class="chart-empty" id="historial-chart-metodos-empty">Sin información de métodos de pago.</div>
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-header">
              <h3><i class="fas fa-box-open"></i> Top productos</h3>
            </div>
            <div class="chart-body">
              <canvas id="historial-chart-productos"></canvas>
              <div class="chart-empty" id="historial-chart-productos-empty">No se detectaron productos vendidos en este rango.</div>
            </div>
          </div>
        </section>

        <div class="historial-main">
          <div class="historial-table-card">
            <div class="historial-table-header">
              <div>
                <h3><i class="fas fa-list"></i> Ventas registradas</h3>
                <small id="historial-total-registros">--</small>
              </div>
            </div>
            <div class="historial-table-wrapper">
              <div class="list-loader hidden" id="historial-list-loader">
                <i class="fas fa-circle-notch fa-spin"></i> Actualizando ventas...
              </div>
              <table class="historial-table">
                <thead>
                  <tr>
                    <th>Venta</th>
                    <th>Cliente</th>
                    <th>Método</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th class="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody id="historial-ventas-tbody"></tbody>
              </table>
              <div class="empty-state hidden" id="historial-empty-state">
                <i class="fas fa-inbox"></i>
                <p>No se encontraron ventas según el filtro aplicado.</p>
              </div>
            </div>
          </div>
          <aside class="historial-insights">
            <div class="insight-card">
              <div class="insight-header">
                <h4><i class="fas fa-exclamation-triangle"></i> Alertas IA</h4>
              </div>
              <ul id="historial-alertas-list" class="insight-list"></ul>
            </div>
            <div class="insight-card">
              <div class="insight-header">
                <h4><i class="fas fa-lightbulb"></i> Campañas sugeridas</h4>
              </div>
              <ul id="historial-campanas-list" class="insight-list"></ul>
            </div>
            <div class="insight-card">
              <div class="insight-header">
                <h4><i class="fas fa-boxes"></i> Inventario crítico</h4>
              </div>
              <ul id="historial-inventario-list" class="insight-list"></ul>
            </div>
          </aside>
        </div>
      </div>
    `;
  },

  cacheHistorialDomReferences(container) {
    this.historialDom = {
      container,
      loader: container.querySelector('#historial-global-loader'),
      filtrosForm: container.querySelector('#historial-filtros'),
      searchInput: container.querySelector('#historial-search'),
      clienteSelect: container.querySelector('#historial-cliente'),
      fechaDesdeInput: container.querySelector('#filter-fecha-desde'),
      fechaHastaInput: container.querySelector('#filter-fecha-hasta'),
      metodoSelect: container.querySelector('#historial-metodo'),
      estadoSelect: container.querySelector('#historial-estado'),
      quickActions: container.querySelector('#historial-quick-actions'),
      rangeButtons: container.querySelectorAll('.btn-chip[data-range]'),
      exportBtn: container.querySelector('#btn-historial-exportar'),
      resumenBtn: container.querySelector('#btn-historial-resumen'),
      recargarBtn: container.querySelector('#btn-historial-recargar'),
      resetBtn: container.querySelector('#btn-historial-limpiar'),
      resumenContainer: container.querySelector('#historial-summary'),
      ingresosValue: container.querySelector('#historial-total-ingresos'),
      ventasValue: container.querySelector('#historial-total-ventas'),
      ticketPromedioValue: container.querySelector('#historial-ticket-promedio'),
      descuentoTotal: container.querySelector('#historial-descuento-total'),
      clientesUnicos: container.querySelector('#historial-clientes-unicos'),
      periodoFechas: container.querySelector('#historial-periodo-fechas'),
      flujoBalanceValue: container.querySelector('#historial-flujo-balance'),
      flujoDetalle: container.querySelector('#historial-flujo-detalle'),
      variacionIngresos: container.querySelector('#historial-variacion-ingresos'),
      variacionVentas: container.querySelector('#historial-variacion-ventas'),
      totalRegistros: container.querySelector('#historial-total-registros'),
      ventasTbody: container.querySelector('#historial-ventas-tbody'),
      emptyState: container.querySelector('#historial-empty-state'),
      listLoader: container.querySelector('#historial-list-loader'),
      alertasList: container.querySelector('#historial-alertas-list'),
      campanasList: container.querySelector('#historial-campanas-list'),
      inventarioList: container.querySelector('#historial-inventario-list'),
      charts: {
        diarioCanvas: container.querySelector('#historial-chart-diario'),
        diarioEmpty: container.querySelector('#historial-chart-diario-empty'),
        metodosCanvas: container.querySelector('#historial-chart-metodos'),
        metodosEmpty: container.querySelector('#historial-chart-metodos-empty'),
        productosCanvas: container.querySelector('#historial-chart-productos'),
        productosEmpty: container.querySelector('#historial-chart-productos-empty'),
      },
      volverBtn: container.querySelector('#btn-back-dashboard-historial'),
      posBtn: container.querySelector('#btn-ir-pos'),
    };
  },

  bindHistorialEvents() {
    const dom = this.historialDom || {};

    dom.volverBtn?.addEventListener('click', () => {
      if (typeof App !== 'undefined' && typeof App.loadModule === 'function') {
        App.loadModule('dashboard');
      }
    });

    dom.posBtn?.addEventListener('click', () => {
      if (typeof App !== 'undefined' && typeof App.loadModule === 'function') {
        App.loadModule('ventas');
      }
    });

    dom.filtrosForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.actualizarFiltrosDesdeDom();
      this.cargarHistorialDatos();
    });

    dom.resetBtn?.addEventListener('click', () => this.restablecerFiltros());
    dom.exportBtn?.addEventListener('click', () => this.exportarHistorialCSV());
    dom.resumenBtn?.addEventListener('click', () => this.descargarResumenVentas());
    dom.recargarBtn?.addEventListener('click', () => this.cargarHistorialDatos(true));

    if (dom.searchInput && typeof Utils !== 'undefined' && typeof Utils.debounce === 'function') {
      const debounced = Utils.debounce(() => {
        this.actualizarFiltrosDesdeDom();
        this.cargarHistorialDatos();
      }, 400);
      dom.searchInput.addEventListener('input', debounced);
    }

    dom.quickActions?.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-module]');
      if (!button) return;
      this.navegarAModulo(button.dataset.module);
    });

    if (dom.rangeButtons && dom.rangeButtons.forEach) {
      dom.rangeButtons.forEach((btn) => {
        btn.addEventListener('click', (event) => {
          const range = event.currentTarget.dataset.range;
          this.aplicarRangoRapido(range);
        });
      });
    }

    dom.ventasTbody?.addEventListener('click', (event) => {
      const actionBtn = event.target.closest('button[data-action]');
      if (!actionBtn) return;
      const ventaId = actionBtn.dataset.id;
      const action = actionBtn.dataset.action;
      if (!ventaId || !action) return;

      if (action === 'detalle') {
        this.verDetalleVenta(ventaId);
      } else if (action === 'reimprimir') {
        this.reimprimirVenta(ventaId);
      } else if (action === 'marketing') {
        this.abrirMarketingParaVenta(ventaId);
      } else if (action === 'inventario') {
        this.abrirInventarioParaVenta(ventaId);
      }
    });
  },

  actualizarFiltrosDesdeDom() {
    const dom = this.historialDom || {};
    const filtros = { ...this.state.historialFiltros };
    filtros.search = (dom.searchInput?.value || '').trim();
    filtros.clienteId = dom.clienteSelect?.value || '';
    filtros.fechaDesde = dom.fechaDesdeInput?.value || '';
    filtros.fechaHasta = dom.fechaHastaInput?.value || '';
    filtros.metodoPago = dom.metodoSelect?.value || '';
    filtros.estado = dom.estadoSelect?.value || '';
    this.state.historialFiltros = filtros;
  },

  setHistorialFiltersInDom(filtros) {
    const dom = this.historialDom || {};
    if (dom.searchInput) dom.searchInput.value = filtros.search || '';
    if (dom.clienteSelect) dom.clienteSelect.value = filtros.clienteId || '';
    if (dom.fechaDesdeInput) dom.fechaDesdeInput.value = filtros.fechaDesde || '';
    if (dom.fechaHastaInput) dom.fechaHastaInput.value = filtros.fechaHasta || '';
    if (dom.metodoSelect) dom.metodoSelect.value = filtros.metodoPago || '';
    if (dom.estadoSelect) dom.estadoSelect.value = filtros.estado || '';
  },

  buildHistorialQuery(filters) {
    const params = new URLSearchParams();
    if (filters.fechaDesde) params.append('fechaDesde', filters.fechaDesde);
    if (filters.fechaHasta) params.append('fechaHasta', filters.fechaHasta);
    if (filters.metodoPago) params.append('metodoPago', filters.metodoPago);
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.clienteId) params.append('clienteId', filters.clienteId);
    if (filters.search) params.append('search', filters.search);
    const query = params.toString();
    return query ? `?${query}` : '';
  },

  async cargarHistorialDatos(force = false) {
    if (this.state.historialCargando && !force) {
      return;
    }

    this.state.historialCargando = true;
    this.setHistorialLoading(true);

    try {
      const query = this.buildHistorialQuery(this.state.historialFiltros || {});
      const [ventasRes, resumenRes] = await Promise.all([
        Auth._request(`/api/historial-ventas${query}`),
        Auth._request(`/api/historial-ventas/resumen${query}`),
      ]);

      this.state.historial = Array.isArray(ventasRes) ? ventasRes : [];
      this.state.historialResumen = resumenRes?.data || null;

      this.renderHistorialResumen();
      this.renderHistorialList();
      this.renderHistorialInsights();
      await this.renderHistorialCharts();
    } catch (error) {
      console.error('Error cargando historial de ventas:', error);
      this.mostrarHistorialError(
        'No fue posible cargar el historial de ventas. Intenta nuevamente.'
      );
    } finally {
      this.state.historialCargando = false;
      this.setHistorialLoading(false);
    }
  },

  setHistorialLoading(show) {
    const dom = this.historialDom || {};
    if (dom.loader) {
      dom.loader.classList.toggle('visible', !!show);
      dom.loader.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
    if (dom.listLoader) {
      dom.listLoader.classList.toggle('hidden', !show);
    }
  },

  mostrarHistorialError(message) {
    const dom = this.historialDom || {};
    if (!dom.ventasTbody) return;
    dom.ventasTbody.innerHTML = `
      <tr>
        <td colspan="6" class="historial-error">${Utils.sanitize(message || 'Error desconocido')}</td>
      </tr>
    `;
    dom.emptyState?.classList.add('hidden');
  },

  renderHistorialResumen() {
    const dom = this.historialDom || {};
    const resumen = this.state.historialResumen;

    const ingresos = resumen?.totales?.ingresos ?? 0;
    const ventas = resumen?.totales?.ventas ?? 0;
    const ticket = resumen?.totales?.ticketPromedio ?? 0;
    const descuento = resumen?.totales?.descuento ?? 0;
    const clientesUnicos = resumen?.totales?.clientesUnicos ?? 0;
    const flujo = resumen?.finanzas?.flujoCaja ?? null;

    if (dom.ingresosValue) dom.ingresosValue.textContent = Utils.formatCurrency(ingresos);
    if (dom.ventasValue) dom.ventasValue.textContent = ventas.toString();
    if (dom.ticketPromedioValue) dom.ticketPromedioValue.textContent = Utils.formatCurrency(ticket);
    if (dom.descuentoTotal)
      dom.descuentoTotal.textContent = `Descuentos: ${Utils.formatCurrency(descuento)}`;
    if (dom.clientesUnicos) dom.clientesUnicos.textContent = `Clientes únicos: ${clientesUnicos}`;

    if (dom.periodoFechas) {
      const desde = resumen?.periodo?.desde || this.state.historialFiltros?.fechaDesde || '--';
      const hasta = resumen?.periodo?.hasta || this.state.historialFiltros?.fechaHasta || '--';
      dom.periodoFechas.textContent = `Del ${desde} al ${hasta}`;
    }

    if (dom.flujoBalanceValue) {
      const balance = flujo ? flujo.balance : 0;
      dom.flujoBalanceValue.textContent = Utils.formatCurrency(balance);
    }

    if (dom.flujoDetalle) {
      const ingresosTotales = flujo
        ? Utils.formatCurrency(flujo.ingresos)
        : Utils.formatCurrency(0);
      const egresosTotales = flujo ? Utils.formatCurrency(flujo.egresos) : Utils.formatCurrency(0);
      dom.flujoDetalle.textContent = `Ingresos: ${ingresosTotales} | Egresos: ${egresosTotales}`;
    }

    if (dom.variacionIngresos)
      dom.variacionIngresos.innerHTML = this.formatDelta(resumen?.totales?.variacionIngresos);
    if (dom.variacionVentas)
      dom.variacionVentas.innerHTML = this.formatDelta(resumen?.totales?.variacionVentas);
  },

  formatDelta(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '';
    }
    const num = Number(value);
    const trend = num > 0 ? 'up' : num < 0 ? 'down' : 'flat';
    const icon =
      trend === 'up' ? 'fa-arrow-up' : trend === 'down' ? 'fa-arrow-down' : 'fa-arrows-alt-h';
    const trendClass = trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : 'neutral';
    return `<span class="${trendClass}"><i class="fas ${icon}"></i> ${Math.abs(num).toFixed(2)}%</span>`;
  },

  formatEstadoBadge(estado) {
    const raw = (estado || '').toString().trim();
    const normalized = raw.toLowerCase();
    let badgeClass = 'excel-badge-muted';
    if (normalized === 'completada') badgeClass = 'excel-badge-success';
    else if (normalized === 'pendiente') badgeClass = 'excel-badge-warning';
    else if (normalized === 'anulada') badgeClass = 'excel-badge-danger';
    return `<span class="excel-badge ${badgeClass}">${Utils.sanitize(raw || 'Sin estado')}</span>`;
  },

  formatMetodoPago(metodo) {
    if (!metodo) {
      return '<span class="excel-badge excel-badge-muted">N/D</span>';
    }
    const normalized = metodo.toString().toLowerCase();
    let icon = 'fa-money-bill-wave';
    let badgeClass = 'excel-badge-success';
    if (normalized.includes('tarjeta')) {
      icon = 'fa-credit-card';
      badgeClass = 'excel-badge-info';
    } else if (normalized.includes('transfer')) {
      icon = 'fa-university';
      badgeClass = 'excel-badge-accent';
    } else if (normalized.includes('cheque')) {
      icon = 'fa-receipt';
      badgeClass = 'excel-badge-warning';
    }
    return `<span class="excel-badge ${badgeClass}"><i class="fas ${icon}"></i> ${Utils.sanitize(metodo)}</span>`;
  },

  formatDateTime(fecha, hora) {
    if (!fecha) return '--';
    try {
      const composed = hora ? `${fecha}T${hora}` : `${fecha}T00:00:00`;
      const date = new Date(composed);
      if (Number.isNaN(date.getTime())) {
        return fecha;
      }
      return `${date.toLocaleDateString('es-EC')} ${date.toLocaleTimeString('es-EC')}`;
    } catch (error) {
      return fecha;
    }
  },

  renderHistorialList() {
    const dom = this.historialDom || {};
    if (!dom.ventasTbody) return;

    const ventas = Array.isArray(this.state.historial) ? this.state.historial : [];
    if (dom.totalRegistros) {
      dom.totalRegistros.textContent = `${ventas.length} registros`;
    }

    if (!ventas.length) {
      dom.ventasTbody.innerHTML = '';
      dom.emptyState?.classList.remove('hidden');
      return;
    }

    dom.emptyState?.classList.add('hidden');
    dom.ventasTbody.innerHTML = ventas
      .map(
        (venta) => `
      <tr>
        <td>
          <div>
            <strong class="font-mono">#${Utils.sanitize(venta.numero || venta.id || 'S/N')}</strong>
            <small class="text-muted">${this.formatDateTime(venta.fecha, venta.hora)}</small>
          </div>
        </td>
        <td>
          <div>
            <strong>${Utils.sanitize(venta.cliente_nombre || 'Consumidor Final')}</strong>
            <small class="font-mono text-muted">${Utils.sanitize(venta.cliente_id || '')}</small>
          </div>
        </td>
        <td class="text-center">${this.formatMetodoPago(venta.metodo_pago)}</td>
        <td class="text-center">${this.formatEstadoBadge(venta.estado)}</td>
        <td class="text-right"><strong>${Utils.formatCurrency(venta.total)}</strong></td>
        <td class="text-center sticky-action">
          <div class="excel-actions">
            <button type="button" class="excel-btn-action btn-view" data-action="detalle" data-id="${venta.id}" title="Ver detalle">
              <i class="fas fa-eye"></i>
            </button>
            <button type="button" class="excel-btn-action" data-action="reimprimir" data-id="${venta.id}" title="Reimprimir factura">
              <i class="fas fa-print"></i>
            </button>
            <button type="button" class="excel-btn-action btn-success" data-action="marketing" data-id="${venta.id}" title="Campaña Marketing IA">
              <i class="fas fa-bullhorn"></i>
            </button>
            <button type="button" class="excel-btn-action btn-edit" data-action="inventario" data-id="${venta.id}" title="Revisar inventario">
              <i class="fas fa-boxes"></i>
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');
  },

  renderHistorialInsights() {
    const dom = this.historialDom || {};
    const alertas = this.state.historialResumen?.ia?.alertas || [];
    const campanas = this.state.historialResumen?.marketing?.campanasSugeridas || [];
    const inventario = this.state.historialResumen?.inventario?.criticos || [];

    if (dom.alertasList) {
      dom.alertasList.innerHTML = alertas.length
        ? alertas
            .map(
              (alerta) => `
            <li class="insight-item insight-${Utils.sanitize(alerta.tipo || 'info')}">
              <i class="fas fa-${alerta.tipo === 'danger' ? 'exclamation-circle' : alerta.tipo === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
              <span>${Utils.sanitize(alerta.mensaje || '')}</span>
            </li>
          `
            )
            .join('')
        : '<li class="insight-item muted">Sin alertas para este periodo.</li>';
    }

    if (dom.campanasList) {
      dom.campanasList.innerHTML = campanas.length
        ? campanas
            .map(
              (campana) => `
            <li class="insight-item">
              <i class="fas fa-lightbulb"></i>
              <div>
                <strong>${Utils.sanitize(campana.titulo || '')}</strong>
                <p>${Utils.sanitize(campana.descripcion || '')}</p>
              </div>
            </li>
          `
            )
            .join('')
        : '<li class="insight-item muted">Sin campañas sugeridas.</li>';
    }

    if (dom.inventarioList) {
      dom.inventarioList.innerHTML = inventario.length
        ? inventario
            .map(
              (producto) => `
            <li class="insight-item">
              <i class="fas fa-box"></i>
              <div>
                <strong>${Utils.sanitize(producto.nombre || '')}</strong>
                <p>Stock: ${producto.stockActual} | Mínimo: ${producto.stockMinimo}</p>
                <small>Vendidos últimos 30 días: ${producto.vendidosUltimos30Dias}</small>
              </div>
            </li>
          `
            )
            .join('')
        : '<li class="insight-item muted">No hay productos críticos.</li>';
    }
  },

  async renderHistorialCharts() {
    const dom = this.historialDom || {};
    if (!dom.charts) return;

    const resumen = this.state.historialResumen;
    if (!resumen) {
      this.toggleChartEmpty('diario', true);
      this.toggleChartEmpty('metodos', true);
      this.toggleChartEmpty('productos', true);
      this.destroyHistorialCharts();
      return;
    }

    await this.asegurarChartJs();
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js no disponible');
      return;
    }

    this.destroyHistorialCharts();

    const diarioData = resumen.series?.diario || [];
    const metodosData = resumen.desglose?.metodosPago || [];
    const productosData = resumen.top?.productos || [];

    if (diarioData.length && dom.charts.diarioCanvas) {
      this.toggleChartEmpty('diario', false);
      this.state.historialCharts.diario = new Chart(dom.charts.diarioCanvas, {
        type: 'line',
        data: {
          labels: diarioData.map((item) => item.fecha),
          datasets: [
            {
              label: 'Ingresos',
              data: diarioData.map((item) => item.total),
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              tension: 0.3,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              ticks: {
                callback: (value) => Utils.formatCurrency(value),
              },
            },
          },
        },
      });
    } else {
      this.toggleChartEmpty('diario', true);
    }

    if (metodosData.length && dom.charts.metodosCanvas) {
      this.toggleChartEmpty('metodos', false);
      this.state.historialCharts.metodos = new Chart(dom.charts.metodosCanvas, {
        type: 'doughnut',
        data: {
          labels: metodosData.map((item) => item.metodo),
          datasets: [
            {
              data: metodosData.map((item) => item.monto),
              backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
        },
      });
    } else {
      this.toggleChartEmpty('metodos', true);
    }

    if (productosData.length && dom.charts.productosCanvas) {
      this.toggleChartEmpty('productos', false);
      this.state.historialCharts.productos = new Chart(dom.charts.productosCanvas, {
        type: 'bar',
        data: {
          labels: productosData.map((item) => item.nombre),
          datasets: [
            {
              label: 'Ingresos',
              data: productosData.map((item) => item.ingresos),
              backgroundColor: 'rgba(16, 185, 129, 0.7)',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { maxRotation: 45, minRotation: 0 } },
            y: {
              ticks: {
                callback: (value) => Utils.formatCurrency(value),
              },
            },
          },
        },
      });
    } else {
      this.toggleChartEmpty('productos', true);
    }
  },

  async asegurarChartJs() {
    if (typeof Chart !== 'undefined') {
      return;
    }
    if (this._chartJsPromise) {
      return this._chartJsPromise;
    }

    this._chartJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar Chart.js'));
      document.head.appendChild(script);
    });

    try {
      await this._chartJsPromise;
    } catch (error) {
      console.error(error);
    }
  },

  destroyHistorialCharts() {
    if (!this.state.historialCharts) {
      this.state.historialCharts = {};
      return;
    }
    Object.keys(this.state.historialCharts).forEach((key) => {
      const chart = this.state.historialCharts[key];
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
      this.state.historialCharts[key] = null;
    });
  },

  toggleChartEmpty(key, show) {
    const charts = this.historialDom?.charts;
    if (!charts) return;

    const config = {
      diario: { canvas: charts.diarioCanvas, empty: charts.diarioEmpty },
      metodos: { canvas: charts.metodosCanvas, empty: charts.metodosEmpty },
      productos: { canvas: charts.productosCanvas, empty: charts.productosEmpty },
    }[key];

    if (!config) return;

    if (config.canvas) {
      config.canvas.classList.toggle('hidden', !!show);
    }
    if (config.empty) {
      config.empty.classList.toggle('hidden', !show);
    }
  },

  exportarHistorialCSV() {
    const ventas = Array.isArray(this.state.historial) ? this.state.historial : [];
    if (!ventas.length) {
      Utils.showToast('No hay información para exportar.', 'info');
      return;
    }

    const headers = [
      'Numero',
      'Fecha',
      'Cliente',
      'MetodoPago',
      'Estado',
      'Subtotal',
      'IVA',
      'Descuento',
      'Total',
    ];
    const rows = ventas.map((venta) => [
      (venta.numero || venta.id || '').toString(),
      this.formatDateTime(venta.fecha, venta.hora),
      (venta.cliente_nombre || 'Consumidor Final').replace(/;/g, ','),
      venta.metodo_pago || '',
      venta.estado || '',
      Number(venta.subtotal || 0).toFixed(2),
      Number(venta.iva || 0).toFixed(2),
      Number(venta.descuento || 0).toFixed(2),
      Number(venta.total || 0).toFixed(2),
    ]);

    const csvContent = [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historial-ventas-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  descargarResumenVentas() {
    const resumen = this.state.historialResumen;
    if (!resumen) {
      Utils.showToast('Genera primero el resumen con los filtros deseados.', 'info');
      return;
    }

    const ventas = Array.isArray(this.state.historial) ? this.state.historial.slice(0, 20) : [];
    const ventasHtml = ventas
      .map(
        (venta) => `
      <tr>
        <td>#${Utils.sanitize(venta.numero || venta.id || 'S/N')}</td>
        <td>${this.formatDateTime(venta.fecha, venta.hora)}</td>
        <td>${Utils.sanitize(venta.cliente_nombre || 'Consumidor Final')}</td>
        <td>${Utils.formatCurrency(venta.total)}</td>
      </tr>
    `
      )
      .join('');

    const doc = `<!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>Informe Historial de Ventas</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            h1 { margin-bottom: 0.5rem; }
            h2 { margin-top: 1.5rem; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            th, td { border: 1px solid #e5e7eb; padding: 0.5rem; text-align: left; }
            th { background: #f3f4f6; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f9fafb; }
            .muted { color: #6b7280; }
          </style>
        </head>
        <body>
          <h1>Informe Ejecutivo Historial de Ventas</h1>
          <p class="muted">Periodo: ${resumen.periodo?.desde || '-'} al ${resumen.periodo?.hasta || '-'}</p>

          <div class="grid">
            <div class="card"><strong>Ingresos</strong><br>${Utils.formatCurrency(resumen.totales?.ingresos)}</div>
            <div class="card"><strong>Ventas</strong><br>${resumen.totales?.ventas || 0}</div>
            <div class="card"><strong>Ticket Promedio</strong><br>${Utils.formatCurrency(resumen.totales?.ticketPromedio)}</div>
            <div class="card"><strong>Balance de Caja</strong><br>${Utils.formatCurrency(resumen.finanzas?.flujoCaja?.balance || 0)}</div>
          </div>

          <h2>Top productos</h2>
          <ul>
            ${(resumen.top?.productos || [])
              .slice(0, 5)
              .map(
                (producto) =>
                  `<li>${Utils.sanitize(producto.nombre || '')} - ${Utils.formatCurrency(producto.ingresos)}</li>`
              )
              .join('')}
          </ul>

          <h2>Campañas sugeridas</h2>
          <ul>
            ${(resumen.marketing?.campanasSugeridas || []).map((campana) => `<li><strong>${Utils.sanitize(campana.titulo || '')}:</strong> ${Utils.sanitize(campana.descripcion || '')}</li>`).join('') || '<li>No hay campañas sugeridas.</li>'}
          </ul>

          <h2>Ventas recientes</h2>
          <table>
            <thead><tr><th>Venta</th><th>Fecha</th><th>Cliente</th><th>Total</th></tr></thead>
            <tbody>${ventasHtml}</tbody>
          </table>
        </body>
      </html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Utils.showToast('Permite ventanas emergentes para descargar el informe.', 'warning');
      return;
    }
    printWindow.document.write(doc);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  },

  restablecerFiltros() {
    const filtros = this.getDefaultHistorialFilters();
    this.state.historialFiltros = { ...filtros };
    this.setHistorialFiltersInDom(filtros);
    this.cargarHistorialDatos(true);
  },

  aplicarRangoRapido(rango) {
    if (!rango) return;

    const hoy = new Date();
    let desde = new Date(hoy);

    const format = (date) => date.toISOString().split('T')[0];

    if (rango === 'today') {
      desde = new Date(hoy);
    } else if (rango === 'week') {
      const day = hoy.getDay();
      const diff = day === 0 ? 6 : day - 1;
      desde.setDate(hoy.getDate() - diff);
    } else if (rango === 'month') {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    } else if (rango === 'quarter') {
      desde = new Date(hoy.getTime() - 89 * 24 * 60 * 60 * 1000);
    }

    const filtros = {
      ...this.state.historialFiltros,
      fechaDesde: format(desde),
      fechaHasta: format(hoy),
    };

    this.state.historialFiltros = filtros;
    this.setHistorialFiltersInDom(filtros);
    this.cargarHistorialDatos();
  },

  navegarAModulo(moduleId) {
    if (!moduleId || typeof App === 'undefined' || typeof App.loadModule !== 'function') {
      Utils.showToast('No se pudo abrir el módulo solicitado.', 'info');
      return;
    }
    App.loadModule(moduleId);
  },

  async cargarVentas() {
    await this.cargarHistorialDatos(true);
  },

  filtrarVentas() {
    this.actualizarFiltrosDesdeDom();
    this.cargarHistorialDatos();
  },

  limpiarFiltros() {
    this.restablecerFiltros();
  },

  /**
   * Obtener una venta por ID desde la API o caché
   * @param {string|number} ventaId - ID de la venta
   * @param {object} options - Opciones: { forceRefresh: boolean }
   * @returns {Promise<object|null>} - Datos de la venta o null
   */
  async obtenerVentaPorId(ventaId, options = {}) {
    try {
      // Verificar caché primero si no se fuerza refresh
      if (!options.forceRefresh && this.ventaCache.has(ventaId)) {
        console.log(`📦 Venta ${ventaId} obtenida desde caché`);
        return this.ventaCache.get(ventaId);
      }

      // Hacer petición a la API
      console.log(`🔄 Obteniendo venta ${ventaId} desde API...`);

      let response;
      if (window.DatabaseAPI && typeof window.DatabaseAPI.request === 'function') {
        response = await window.DatabaseAPI.request(`/ventas/${ventaId}`, {
          method: 'GET',
        });
      } else {
        // Fallback sin DatabaseAPI
        const token = Auth?.getAccessToken?.() || localStorage.getItem('access_token');
        const headers = {
          'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/ventas/${ventaId}`, {
          method: 'GET',
          headers,
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        response = await res.json();
      }

      const venta = response?.venta || response?.data || response;

      if (venta && venta.id) {
        // Guardar en caché
        this.ventaCache.set(ventaId, venta);
        console.log(`✅ Venta ${ventaId} cargada y almacenada en caché`);
        return venta;
      }

      console.warn(`⚠️ No se encontró la venta ${ventaId}`);
      return null;
    } catch (error) {
      console.error(`❌ Error al obtener venta ${ventaId}:`, error);
      return null;
    }
  },

  async verDetalleVenta(ventaId) {
    try {
      const venta = await this.obtenerVentaPorId(ventaId, { forceRefresh: true });
      if (!venta) {
        Utils.showToast('No se pudo cargar el detalle de la venta', 'error');
        return;
      }

      const fecha = venta.fecha ? new Date(`${venta.fecha}T${venta.hora || '00:00:00'}`) : null;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'modal-detalle-venta';
      modal.innerHTML = `
        <div class="modal modal-large">
          <div class="modal-header">
            <h3><i class="fas fa-file-invoice"></i> Detalle de Venta #${Utils.sanitize(venta.numero || venta.id || 'S/N')}</h3>
            <button class="modal-close" onclick="document.getElementById('modal-detalle-venta').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="venta-detalle-grid">
              <div class="detalle-info">
                <p><strong>Fecha:</strong> ${fecha ? fecha.toLocaleString('es-EC') : Utils.sanitize(venta.fecha || '--')}</p>
                <p><strong>Cliente:</strong> ${Utils.sanitize(venta.cliente_nombre || 'Consumidor Final')}</p>
                <p><strong>Método de Pago:</strong> ${Utils.sanitize(venta.metodo_pago || 'N/D')}</p>
                <p><strong>Estado:</strong> ${Utils.sanitize(venta.estado || 'Sin estado')}</p>
              </div>
              <div class="detalle-items">
                <h4>Items</h4>
                <table class="items-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio Unit.</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(venta.items || [])
                      .map(
                        (item) => `
                      <tr>
                        <td>${Utils.sanitize(item.producto_nombre || item.nombre || '')}</td>
                        <td>${item.cantidad}</td>
                        <td>${Utils.formatCurrency(item.precio_unitario || item.precio)}</td>
                        <td>${Utils.formatCurrency(item.total)}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
              <div class="detalle-totales">
                <p>Subtotal: <strong>${Utils.formatCurrency(venta.subtotal)}</strong></p>
                <p>IVA (15%): <strong>${Utils.formatCurrency(venta.iva)}</strong></p>
                ${venta.descuento > 0 ? `<p>Descuento: <strong>${Utils.formatCurrency(venta.descuento)}</strong></p>` : ''}
                <p class="total-final">Total: <strong>${Utils.formatCurrency(venta.total)}</strong></p>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    } catch (error) {
      console.error('Error al ver detalle:', error);
      Utils.showToast('Error al cargar el detalle', 'error');
    }
  },

  async reimprimirVenta(ventaId) {
    if (!ventaId) {
      Utils.showToast('Selecciona una venta válida para reimprimir.', 'info');
      return;
    }

    try {
      Utils.showToast('Preparando factura para reimpresión...', 'info');

      const venta = await this.obtenerVentaPorId(ventaId, { forceRefresh: true });
      if (!venta) {
        Utils.showToast('No se encontró la venta seleccionada.', 'error');
        return;
      }

      const fechaISO = venta.fecha
        ? new Date(`${venta.fecha}T${venta.hora || '00:00:00'}`)
        : new Date();
      const fecha = fechaISO.toLocaleDateString('es-EC');
      const hora = fechaISO.toLocaleTimeString('es-EC');

      const datosPagoRaw = venta.datos_pago || venta.datosPago || null;
      let datosPago = null;
      if (datosPagoRaw) {
        if (typeof datosPagoRaw === 'string') {
          try {
            datosPago = JSON.parse(datosPagoRaw);
          } catch (parseError) {
            console.warn('No se pudo parsear datos_pago almacenado en la venta:', parseError);
            datosPago = null;
          }
        } else {
          datosPago = datosPagoRaw;
        }
      }

      const datosFactura = {
        numero: venta.numero || venta.id,
        fecha,
        hora,
        metodo_pago: venta.metodo_pago || 'efectivo',
        datos_pago: datosPago,
        subtotal: Number(venta.subtotal || 0),
        descuento: Number(venta.descuento || 0),
        iva: Number(venta.iva || 0),
        total: Number(venta.total || 0),
        cliente: {
          nombre: venta.cliente_nombre || 'CONSUMIDOR FINAL',
          cedula: venta.cliente_cedula || venta.cliente_id || '',
          direccion: venta.cliente_direccion || venta.direccion || '',
          telefono: venta.cliente_telefono || '',
          celular: venta.cliente_celular || '',
          whatsapp: venta.cliente_whatsapp || venta.cliente_celular || '',
          email: venta.cliente_email || '',
        },
        items: (venta.items || []).map((item) => ({
          codigo: item.producto_codigo || item.codigo || '',
          nombre: item.producto_nombre || item.nombre || 'Producto',
          cantidad: Number(item.cantidad || 0),
          precioVenta: Number(item.precio_unitario || item.precio || 0),
          productoId: item.producto_id || item.id || null,
        })),
      };

      if (
        typeof FacturacionSRI !== 'undefined' &&
        typeof FacturacionSRI.mostrarFactura === 'function'
      ) {
        if (typeof FacturacionSRI.cargarConfiguracion === 'function') {
          try {
            await FacturacionSRI.cargarConfiguracion();
          } catch (configError) {
            // 🔥 NO SILENCIAR - Mostrar error completo
            console.group('⚠️ ERROR: Cargando configuración SRI');
            console.error('Error completo:', configError);
            console.error('Stack trace:', configError.stack);
            console.groupEnd();
          }
        }
        FacturacionSRI.mostrarFactura(datosFactura);
        Utils.showToast('Factura lista para imprimir o enviar.', 'success');
      } else {
        Utils.showToast('El módulo de facturación no está disponible.', 'warning');
      }
    } catch (error) {
      console.error('No se pudo reimprimir la venta:', error);
      Utils.showToast('No logramos reimprimir la factura. Intenta nuevamente.', 'error');
    }
  },

  async abrirMarketingParaVenta(ventaId) {
    const venta = await this.obtenerVentaPorId(ventaId);
    if (!venta) {
      Utils.showToast('No encontramos la venta para preparar la campaña.', 'warning');
      return;
    }

    try {
      const payload = {
        origen: 'historial-ventas',
        tipo: 'campana-venta',
        ventaId,
        cliente: {
          id: venta.cliente_id || null,
          nombre: venta.cliente_nombre || 'Consumidor Final',
          email: venta.cliente_email || null,
          telefono: venta.cliente_telefono || venta.cliente_celular || null,
          whatsapp: venta.cliente_whatsapp || venta.cliente_celular || null,
        },
        monto: Number(venta.total || 0),
        productos: (venta.items || []).map((item) => ({
          id: item.producto_id || item.id,
          nombre: item.producto_nombre || item.nombre,
          cantidad: Number(item.cantidad || 0),
          total: Number(item.total || (item.precio_unitario || 0) * (item.cantidad || 0)),
        })),
      };

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('marketingDesdeHistorial', JSON.stringify(payload));
      }

      this.navegarAModulo('marketing');
      Utils.showToast('Abriendo marketing IA con contexto de la venta...', 'success');
    } catch (error) {
      console.error('Error preparando datos para marketing:', error);
      Utils.showToast('No se pudo abrir marketing con esta venta.', 'error');
    }
  },

  async abrirInventarioParaVenta(ventaId) {
    const venta = await this.obtenerVentaPorId(ventaId);
    if (!venta) {
      Utils.showToast('No encontramos detalles de la venta seleccionada.', 'warning');
      return;
    }

    try {
      const productos = (venta.items || [])
        .map((item) => ({
          id: item.producto_id || item.id,
          nombre: item.producto_nombre || item.nombre,
          cantidadVendida: Number(item.cantidad || 0),
        }))
        .filter((producto) => producto.id);

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(
          'inventarioDesdeHistorial',
          JSON.stringify({
            origen: 'historial-ventas',
            ventaId,
            productos,
          })
        );
      }

      this.navegarAModulo('inventario');
      Utils.showToast('Abriendo inventario con productos de la venta...', 'success');
    } catch (error) {
      console.error('Error preparando datos para inventario:', error);
      Utils.showToast('No se pudo abrir inventario para esta venta.', 'error');
    }
  },
};

// Exportar al scope global para que App.js pueda acceder
window.VentasMejorado = VentasMejorado;

// Inicializar el módulo cuando el script se carga
VentasMejorado.init();
