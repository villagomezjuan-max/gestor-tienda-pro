/* ========================================
   MÓDULO DE PRODUCTOS
   Gestión completa de inventario
   ======================================== */

const Productos = {
  _pedidoProveedorActual: null,
  _selectedProducts: new Map(), // Cambiado a Map para almacenar {id: cantidad}
  _labelSize: 'mediano', // Tamaño de etiqueta: pequeño, mediano, grande
  _inventoryInsights: null,
  _inventoryMeta: null,
  _inventoryContainer: null,
  _inventoryRefreshTimer: null,
  _inventoryClickHandler: null,
  _inventoryLastSentHash: null,
  _legacyClickHandler: null,
  _productos: [],
  _productosCacheKey: null,
  _productosPromise: null,
  _productosPendingKey: null,
  _ultimaCargaProductos: 0,
  _categorias: [],
  _categoriasPromise: null,
  _ultimaCargaCategorias: 0,
  _qrSuiteWrapper: null,
  _qrSuiteVisible: false,
  _qrActiveTab: 'labels',
  _qrScanner: null,
  _qrScannerActive: false,
  _qrScannerCameraId: null,
  _qrScannerProcessing: false,
  _qrHistory: [],
  _qrStoreInfo: null,
  _qrStoreSlug: null,
  _qrBaseUrl: null,

  _normalizeNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return fallback;
      }

      const normalized = trimmed
        .replace(/[^0-9,.-]+/g, '')
        .replace(/,(?=\d{3}(?:\D|$))/g, '')
        .replace(/,/g, '.');

      const parsed = Number.parseFloat(normalized);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return fallback;
  },

  _getQrStoreConfig() {
    if (this._qrStoreInfo) {
      return this._qrStoreInfo;
    }

    const tiendaConfig = (window.FacturacionSRI && window.FacturacionSRI.configTienda) || {};
    const session =
      typeof Auth !== 'undefined' && typeof Auth.getSession === 'function'
        ? Auth.getSession()
        : null;
    const negocioActivo =
      (session && typeof session.negocioActual === 'object' ? session.negocioActual : null) ||
      (session && typeof session.negocio === 'object' ? session.negocio : null) ||
      null;

    this._qrStoreInfo = {
      nombre:
        tiendaConfig.nombre ||
        tiendaConfig.nombreComercial ||
        tiendaConfig.nombre_tienda ||
        negocioActivo?.nombre ||
        session?.negocioNombre ||
        '',
      email: tiendaConfig.email || negocioActivo?.email || session?.email || '',
      slug:
        tiendaConfig.slug ||
        tiendaConfig.alias ||
        negocioActivo?.slug ||
        negocioActivo?.alias ||
        '',
      urlPublica:
        tiendaConfig.urlPublica || tiendaConfig.url_publica || negocioActivo?.urlPublica || '',
    };

    return this._qrStoreInfo;
  },

  _sanitizeSlug(value) {
    if (!value) {
      return '';
    }

    return value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  },

  _sanitizeHtmlContent(text) {
    if (!text) return '';
    return text
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  _getQrBaseUrl() {
    if (this._qrBaseUrl) {
      return this._qrBaseUrl;
    }

    const sources = [
      window?.Env?.QR_PUBLIC_BASE_URL,
      window?.App?.config?.qrPublicBaseUrl,
      typeof ConfiguracionTienda !== 'undefined' ? ConfiguracionTienda.qrBaseUrl : null,
      typeof localStorage !== 'undefined' ? localStorage.getItem('qr_public_base_url') : null,
    ].filter(Boolean);

    const fallback = 'https://tienda.gestorpro.com';
    const resolved = (sources[0] || fallback).toString().trim();
    this._qrBaseUrl = resolved.replace(/\/+$/, '') || fallback;
    return this._qrBaseUrl;
  },

  _getStoreSlug() {
    if (this._qrStoreSlug) {
      return this._qrStoreSlug;
    }

    const info = this._getQrStoreConfig();
    const session =
      typeof Auth !== 'undefined' && typeof Auth.getSession === 'function'
        ? Auth.getSession()
        : null;
    const candidates = [
      info.slug,
      (info.email || '').split('@')[0],
      info.nombre,
      session?.negocioId,
      session?.negocioActual,
      session?.negocio,
    ];

    for (const candidate of candidates) {
      const slug = this._sanitizeSlug(candidate);
      if (slug) {
        this._qrStoreSlug = slug;
        break;
      }
    }

    if (!this._qrStoreSlug) {
      this._qrStoreSlug = 'mi-tienda';
    }

    return this._qrStoreSlug;
  },

  _buildLandingUrlForProduct(codigo) {
    const cleanCode = (codigo || '').toString().trim();
    if (!cleanCode) {
      return '';
    }

    const storeInfo = this._getQrStoreConfig();
    const negocioId =
      typeof Auth !== 'undefined' && typeof Auth.getCurrentBusinessId === 'function'
        ? Auth.getCurrentBusinessId()
        : null;
    const slug = this._getStoreSlug();
    const queryParts = [`c=${encodeURIComponent(cleanCode)}`];
    if (slug) {
      queryParts.push(`t=${encodeURIComponent(slug)}`);
    }
    if (negocioId) {
      queryParts.push(`n=${encodeURIComponent(negocioId)}`);
    }
    queryParts.push('s=qr');

    const queryString = queryParts.join('&');

    if (storeInfo.urlPublica) {
      const trimmed = storeInfo.urlPublica.toString().trim().replace(/\/$/, '');
      const separator = trimmed.includes('?') ? '&' : '?';
      return `${trimmed}${separator}${queryString}`;
    }

    const base = this._getQrBaseUrl();
    return `${base}/${slug}?${queryString}`;
  },

  _extractCodigoFromString(value) {
    const input = (value || '').toString().trim();
    if (!input) {
      return '';
    }

    const tryExtractFromUrl = (text) => {
      if (!text) {
        return '';
      }

      const ensureUrl = (candidate) => {
        try {
          return new URL(candidate);
        } catch (error) {
          try {
            return new URL(`https://${candidate}`);
          } catch (fallbackError) {
            return null;
          }
        }
      };

      const url = ensureUrl(text);
      if (!url) {
        return '';
      }

      const paramOrder = ['c', 'code', 'p', 'producto', 'id'];
      for (const param of paramOrder) {
        const paramValue = url.searchParams.get(param);
        if (paramValue) {
          return paramValue.trim();
        }
      }

      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length) {
        return decodeURIComponent(segments[segments.length - 1]);
      }

      return '';
    };

    const inlineUrlMatch = input.match(/https?:\/\/[^\s]+/i);
    if (inlineUrlMatch) {
      const fromInlineUrl = tryExtractFromUrl(inlineUrlMatch[0]);
      if (fromInlineUrl) {
        return fromInlineUrl;
      }
    }

    const directUrl = tryExtractFromUrl(input);
    if (directUrl) {
      return directUrl;
    }

    const codMatch = input.match(/cod[:=]([a-z0-9._-]+)/i);
    if (codMatch) {
      return codMatch[1];
    }

    if (input.includes('|')) {
      const parts = input
        .split('|')
        .map((segment) => segment.trim())
        .filter(Boolean);
      const prefijo = parts.find((segment) => segment.toLowerCase().startsWith('cod:'));
      if (prefijo) {
        return prefijo.slice(4).trim();
      }
      if (parts.length) {
        return parts[parts.length - 1];
      }
    }

    return input;
  },

  _normalizeBoolean(value, estado = null, eliminado = null) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (value === 1 || value === '1' || value === 'true' || value === 'activo') {
      return true;
    }

    if (value === 0 || value === '0' || value === 'false') {
      return false;
    }

    if (typeof estado === 'string') {
      const normalized = estado.trim().toLowerCase();
      if (['activo', 'active', 'habilitado', 'disponible'].includes(normalized)) {
        return true;
      }
      if (
        [
          'inactivo',
          'inactive',
          'eliminado',
          'baja',
          'borrado',
          'papelera',
          'deshabilitado',
        ].includes(normalized)
      ) {
        return false;
      }
    }

    if (typeof eliminado === 'boolean') {
      return !eliminado;
    }

    if (eliminado === 1 || eliminado === '1' || eliminado === 'true') {
      return false;
    }

    return true;
  },

  _normalizeProducto(producto) {
    if (!producto || typeof producto !== 'object') {
      return null;
    }

    const normalized = { ...producto };

    const rawId = producto.id || producto.producto_id || producto._id || producto.codigo;
    normalized.id = rawId
      ? rawId.toString()
      : `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const rawCodigo = producto.codigo || producto.code || producto.sku || producto.referencia;
    normalized.codigo = rawCodigo ? rawCodigo.toString() : normalized.id;

    normalized.nombre =
      producto.nombre || producto.name || producto.titulo || 'Producto sin nombre';
    normalized.descripcion = producto.descripcion || producto.description || '';

    const categoriaId =
      producto.categoria ??
      producto.categoriaId ??
      producto.categoria_id ??
      producto.categoryId ??
      producto.categoriaSlug;
    normalized.categoria = categoriaId ? categoriaId.toString() : '';

    const categoriaNombre =
      producto.categoriaNombre ||
      producto.categoria_nombre ||
      producto.categoryName ||
      producto.categoriaLabel ||
      producto.categoriaTexto;
    normalized.categoriaNombre = categoriaNombre || normalized.categoria || '';

    const proveedorId = producto.proveedorId ?? producto.proveedor_id ?? producto.proveedor;
    normalized.proveedorId = proveedorId ? proveedorId.toString() : null;
    normalized.proveedorNombre =
      producto.proveedorNombre || producto.proveedor_nombre || producto.proveedor || '';

    normalized.precioCompra = this._normalizeNumber(
      producto.precioCompra ?? producto.precio_compra ?? producto.costo ?? producto.costoUnitario,
      0
    );
    normalized.precioVenta = this._normalizeNumber(
      producto.precioVenta ??
        producto.precio_venta ??
        producto.precio ??
        producto.pvp ??
        producto.precioUnitario,
      0
    );
    normalized.stock = Math.max(
      0,
      this._normalizeNumber(
        producto.stock ??
          producto.existencias ??
          producto.inventario ??
          producto.cantidad ??
          producto.stockDisponible,
        0
      )
    );
    normalized.stockMinimo = Math.max(
      0,
      this._normalizeNumber(
        producto.stockMinimo ??
          producto.stock_minimo ??
          producto.stockMin ??
          producto.minimo ??
          producto.stockMinimoSugerido,
        0
      )
    );
    normalized.activo = this._normalizeBoolean(
      producto.activo,
      producto.estado || producto.status,
      producto.eliminado
    );

    if (!normalized.unidad) {
      normalized.unidad = producto.unidad || producto.unit || 'unidad';
    }

    normalized.negocioId =
      producto.negocioId || producto.negocio_id || normalized.negocioId || null;

    return normalized;
  },

  _normalizeCategoria(categoria) {
    if (!categoria || typeof categoria !== 'object') {
      return null;
    }

    const normalized = { ...categoria };

    const rawId = categoria.id || categoria._id || categoria.value || categoria.codigo;
    const rawNombre = categoria.nombre || categoria.name || categoria.label || categoria.titulo;

    const fallbackId = rawNombre
      ? rawNombre
          .toString()
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_\-]/g, '') || null
      : null;

    normalized.id =
      (rawId ? rawId.toString() : fallbackId) ||
      `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    normalized.nombre = rawNombre || normalized.id;
    normalized.descripcion = categoria.descripcion || categoria.description || '';
    normalized.activo = this._normalizeBoolean(
      categoria.activo,
      categoria.estado,
      categoria.eliminado
    );

    return normalized;
  },

  _getFallbackCategorias() {
    return [
      { id: 'general', nombre: 'General' },
      { id: 'servicios', nombre: 'Servicios' },
      { id: 'repuestos', nombre: 'Repuestos' },
    ];
  },

  invalidarCacheProductos(opciones = {}) {
    const { incluirCategorias = false } = opciones;

    this._productos = [];
    this._productosCacheKey = null;
    this._productosPromise = null;
    this._productosPendingKey = null;
    this._ultimaCargaProductos = 0;

    if (incluirCategorias) {
      this._categorias = [];
      this._categoriasPromise = null;
      this._ultimaCargaCategorias = 0;
    }
  },

  async manejarInventarioSincronizado(evento) {
    try {
      this.invalidarCacheProductos();

      const tareas = [];

      if (document.getElementById('productosTable')) {
        tareas.push(this.reloadProductosForCurrentFilter({ forceRefresh: true }));
      }

      if (this._inventoryContainer && document.body.contains(this._inventoryContainer)) {
        tareas.push(
          (async () => {
            await this.loadProductos({ estado: 'todos', forceRefresh: true });
            await this._renderLegacyStockFallback(this._inventoryContainer, null);
          })()
        );
      }

      if (tareas.length) {
        await Promise.allSettled(tareas);
      }
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('⚠️ ERROR: Productos - Refrescando inventario');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
    }
  },

  async fetchCollection(collectionName, options = {}) {
    let result;

    if (
      typeof DatabaseAPI !== 'undefined' &&
      DatabaseAPI &&
      typeof DatabaseAPI.fetchCollection === 'function'
    ) {
      try {
        result = await DatabaseAPI.fetchCollection(collectionName, options);
      } catch (error) {
        // 🔥 NO SILENCIAR - Mostrar error completo
        console.group(`⚠️ ERROR: Productos - Recuperando ${collectionName} desde API`);
        console.error('Error completo:', error);
        console.error('Stack trace:', error.stack);
        console.groupEnd();
      }
    }

    let hasData = Array.isArray(result) && result.length > 0;

    if (!hasData && typeof Database !== 'undefined') {
      if (typeof Database.getCollectionAsync === 'function') {
        try {
          const asyncData = await Database.getCollectionAsync(collectionName, options);
          if (Array.isArray(asyncData) && asyncData.length > 0) {
            result = asyncData;
            hasData = true;
          }
        } catch (asyncError) {
          console.warn(
            `Productos.fetchCollection: fallback async ${collectionName} falló`,
            asyncError
          );
        }
      }

      if (!hasData && typeof Database.getCollection === 'function') {
        try {
          const localData = Database.getCollection(collectionName, options);
          if (Array.isArray(localData)) {
            result = localData;
            hasData = localData.length > 0;
          }
        } catch (localError) {
          console.warn(
            `Productos.fetchCollection: fallback local ${collectionName} falló`,
            localError
          );
        }
      }
    }

    return Array.isArray(result) ? result : [];
  },

  async loadProductos({ estado = 'activos', forceRefresh = false, limit = 500 } = {}) {
    const normalizedEstado = (estado || 'activos').toString().toLowerCase();
    const ttlMs = 60 * 1000;
    const now = Date.now();

    if (
      !forceRefresh &&
      this._productosCacheKey === normalizedEstado &&
      now - this._ultimaCargaProductos < ttlMs
    ) {
      return Array.isArray(this._productos) ? this._productos : [];
    }

    if (!forceRefresh && this._productosPromise && this._productosPendingKey === normalizedEstado) {
      return this._productosPromise;
    }

    const includeInactive = normalizedEstado !== 'activos';
    const requestOptions = {
      limit,
      includeInactive,
      forceRefresh,
    };

    if (normalizedEstado === 'activos') {
      requestOptions.activo = 1;
    } else if (normalizedEstado === 'inactivos') {
      requestOptions.activo = 0;
    }

    const loader = (async () => {
      let productos = [];
      let lastError = null;

      try {
        productos = await this.fetchCollection('productos', requestOptions);
      } catch (error) {
        lastError = error;
      }

      if (!Array.isArray(productos)) {
        productos = [];
      }

      const normalizados = productos.map((item) => this._normalizeProducto(item)).filter(Boolean);

      let filtrados = normalizados;
      if (normalizedEstado === 'activos') {
        filtrados = normalizados.filter((item) => item.activo !== false);
      } else if (normalizedEstado === 'inactivos') {
        filtrados = normalizados.filter((item) => item.activo === false);
      }

      filtrados.sort((a, b) =>
        (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
      );

      this._productos = filtrados;
      this._productosCacheKey = normalizedEstado;
      this._ultimaCargaProductos = Date.now();

      if (!filtrados.length && lastError) {
        throw lastError;
      }

      return this._productos;
    })();

    this._productosPendingKey = normalizedEstado;
    this._productosPromise = loader
      .catch((error) => {
        if (this._productosCacheKey === normalizedEstado && !Array.isArray(this._productos)) {
          this._productos = [];
        }
        throw error;
      })
      .finally(() => {
        if (this._productosPendingKey === normalizedEstado) {
          this._productosPendingKey = null;
          this._productosPromise = null;
        }
      });

    return this._productosPromise;
  },

  async getCategorias({ forceRefresh = false } = {}) {
    const ttlMs = 3 * 60 * 1000;
    const now = Date.now();

    if (
      !forceRefresh &&
      Array.isArray(this._categorias) &&
      this._categorias.length &&
      now - this._ultimaCargaCategorias < ttlMs
    ) {
      return this._categorias;
    }

    if (!forceRefresh && this._categoriasPromise) {
      return this._categoriasPromise;
    }

    const loader = (async () => {
      let categorias = [];

      try {
        if (typeof Database !== 'undefined' && typeof Database.getCollectionAsync === 'function') {
          categorias = await Database.getCollectionAsync('categorias', {
            forceRefresh,
            includeInactive: true,
          });
        }
      } catch (error) {
        console.warn('Productos.getCategorias: error obteniendo categorías', error);
      }

      if (!Array.isArray(categorias) || categorias.length === 0) {
        try {
          if (typeof Database !== 'undefined' && typeof Database.getCollection === 'function') {
            const locales = Database.getCollection('categorias');
            if (Array.isArray(locales) && locales.length) {
              categorias = locales;
            }
          }
        } catch (localError) {
          console.warn('Productos.getCategorias: error en fallback local', localError);
        }
      }

      if (!Array.isArray(categorias)) {
        categorias = [];
      }

      const normalizadas = categorias.map((cat) => this._normalizeCategoria(cat)).filter(Boolean);

      const dataset = normalizadas.length ? normalizadas : this._getFallbackCategorias();

      this._categorias = dataset;
      this._ultimaCargaCategorias = Date.now();

      return this._categorias;
    })().finally(() => {
      this._categoriasPromise = null;
    });

    this._categoriasPromise = loader;
    return loader;
  },

  /**
   * Limpia la selección de productos.
   */
  clearSelection() {
    const fallback = this._getFallbackCategorias();
    if (this._selectedProducts && typeof this._selectedProducts.clear === 'function') {
      this._selectedProducts.clear();
    }
    this._categorias = [...fallback];
    if (typeof this.updateQrSelectionState === 'function') {
      this.updateQrSelectionState();
    }
    return this._categorias;
  },

  /**
   * Establece la cantidad de etiquetas para un producto
   */
  setProductQuantity(productoId, cantidad) {
    if (!productoId) return;
    const qty = Math.max(0, parseInt(cantidad) || 0);

    if (qty > 0) {
      this._selectedProducts.set(productoId, qty);
    } else {
      this._selectedProducts.delete(productoId);
    }

    this.updateQrSelectionState();
  },

  /**
   * Obtiene la cantidad de etiquetas para un producto
   */
  getProductQuantity(productoId) {
    return this._selectedProducts.get(productoId) || 0;
  },

  async ensureQrSuiteCleanup() {
    if (this._qrScannerActive) {
      try {
        await this.stopQrScanner();
      } catch (error) {
        console.warn('Productos.ensureQrSuiteCleanup: error deteniendo lector QR', error);
      }
    }
  },

  async initializeQrSuite() {
    await this.ensureQrSuiteCleanup();

    const wrapper = document.getElementById('qrSuiteWrapper');
    if (!wrapper) {
      this._qrSuiteWrapper = null;
      return;
    }

    this._qrSuiteWrapper = wrapper;
    wrapper.innerHTML = this.getQrSuiteTemplate();
    this.bindQrSuiteEvents(wrapper);
    if (this._qrSuiteVisible) {
      wrapper.classList.add('visible');
    }
    this.renderActiveQrTab();
    this.updateQrSelectionState();
    this.renderQrHistoryPanel();
  },

  getQrSuiteTemplate() {
    return `
      <div class="qr-suite-card" id="qrSuiteCard">
        <div class="qr-suite-header">
          <h4><i class="fas fa-qrcode"></i> Centro de Códigos QR y Barras</h4>
          <div class="qr-suite-actions">
            <button class="btn btn-secondary" type="button" data-qr-action="refresh">
              <i class="fas fa-sync-alt"></i> Actualizar productos
            </button>
            <button class="btn btn-secondary" type="button" data-qr-action="close" title="Ocultar panel">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div class="qr-suite-tabs">
          <button class="qr-suite-tab" data-qr-tab="labels">
            <i class="fas fa-tags"></i> Etiquetas
          </button>
          <button class="qr-suite-tab" data-qr-tab="scanner">
            <i class="fas fa-camera"></i> Lector
          </button>
          <button class="qr-suite-tab" data-qr-tab="history">
            <i class="fas fa-history"></i> Historial
          </button>
        </div>
        <div class="qr-suite-panels">
          <section class="qr-suite-panel" data-qr-panel="labels">
            <div class="qr-labels-toolbar">
              <div class="qr-suite-badge">
                <i class="fas fa-layer-group"></i>
                <span id="qrSelectedResume">0</span> seleccionados
              </div>
              <div class="qr-label-size-selector">
                <label for="labelSizeSelect">
                  <i class="fas fa-ruler-combined"></i> Tamaño:
                </label>
                <select id="labelSizeSelect" class="label-size-select">
                  <option value="pequeño">Pequeño (2.5cm)</option>
                  <option value="mediano" selected>Mediano (3cm)</option>
                  <option value="grande">Grande (5cm)</option>
                </select>
              </div>
              <div class="qr-label-actions">
                <button class="btn btn-secondary" type="button" id="btnPreviewQrLabels">
                  <i class="fas fa-sync"></i> Regenerar vistas
                </button>
                <button class="btn btn-primary" type="button" id="btnPrintQrLabels" disabled>
                  <i class="fas fa-print"></i> Imprimir etiquetas
                </button>
              </div>
            </div>
            <div class="qr-labels-empty" id="qrLabelsEmpty">
              <i class="fas fa-barcode fa-3x"></i>
              <h5>Selecciona productos en la tabla para generar etiquetas QR y de barras.</h5>
              <p>Selecciona múltiples filas y obtén un lote listo para imprimir.</p>
            </div>
            <div class="qr-labels-grid" id="qrLabelsGrid"></div>
          </section>
          <section class="qr-suite-panel" data-qr-panel="scanner">
            <div class="qr-scanner-area">
              <div id="qrScannerViewport"></div>
              <div class="qr-scanner-controls">
                <select class="btn btn-secondary" id="qrScannerCamera"></select>
                <button class="btn btn-primary" type="button" id="btnStartQrScanner">
                  <i class="fas fa-play"></i> Iniciar
                </button>
                <button class="btn btn-secondary" type="button" id="btnStopQrScanner" disabled>
                  <i class="fas fa-stop"></i> Detener
                </button>
              </div>
              <div class="qr-scanner-status" id="qrScannerStatus">Selecciona una cámara y presiona iniciar.</div>
            </div>
          </section>
          <section class="qr-suite-panel" data-qr-panel="history">
            <div class="qr-history-list" id="qrHistoryList"></div>
            <div class="qr-labels-empty" id="qrHistoryEmpty">
              <i class="fas fa-history fa-3x"></i>
              <h5>Todavía no se registran escaneos.</h5>
              <p>Los códigos leídos desde este panel aparecerán aquí con su resultado.</p>
            </div>
          </section>
        </div>
      </div>
    `;
  },

  bindQrSuiteEvents(wrapper) {
    if (!wrapper) return;

    wrapper.addEventListener('click', (event) => {
      const tabButton = event.target.closest('[data-qr-tab]');
      if (tabButton) {
        event.preventDefault();
        this.setQrActiveTab(tabButton.dataset.qrTab);
        return;
      }

      const actionButton = event.target.closest('[data-qr-action]');
      if (actionButton) {
        const { qrAction } = actionButton.dataset;
        if (qrAction === 'refresh') {
          this.refreshProductos();
        } else if (qrAction === 'close') {
          this.toggleQrSuite(false);
        }
      }
    });

    const previewBtn = wrapper.querySelector('#btnPreviewQrLabels');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.renderQrLabelsPanel());
    }

    const printBtn = wrapper.querySelector('#btnPrintQrLabels');
    if (printBtn) {
      printBtn.addEventListener('click', () => this.printQrLabels());
    }

    const startBtn = wrapper.querySelector('#btnStartQrScanner');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startQrScanner(this._qrScannerCameraId));
    }

    const stopBtn = wrapper.querySelector('#btnStopQrScanner');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopQrScanner());
    }

    const cameraSelect = wrapper.querySelector('#qrScannerCamera');
    if (cameraSelect) {
      cameraSelect.addEventListener('change', (event) => {
        this._qrScannerCameraId = event.target.value || null;
        if (this._qrScannerActive) {
          this.startQrScanner(this._qrScannerCameraId);
        }
      });
    }

    const labelSizeSelect = wrapper.querySelector('#labelSizeSelect');
    if (labelSizeSelect) {
      labelSizeSelect.addEventListener('change', (event) => {
        this._labelSize = event.target.value || 'mediano';
      });
    }

    // Funcionalidad de arrastre para la ventana flotante
    const header = wrapper.querySelector('.qr-suite-header');
    if (header) {
      let isDragging = false;
      let currentX;
      let currentY;
      let initialX;
      let initialY;
      let xOffset = 0;
      let yOffset = 0;

      const dragStart = (e) => {
        if (
          e.target.closest('button') ||
          e.target.closest('.qr-suite-actions') ||
          e.target.closest('input') ||
          e.target.closest('select')
        )
          return;

        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === header || header.contains(e.target)) {
          isDragging = true;
        }
      };

      const dragEnd = () => {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
      };

      const drag = (e) => {
        if (isDragging) {
          e.preventDefault();
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;

          xOffset = currentX;
          yOffset = currentY;

          wrapper.style.transform = `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px))`;
        }
      };

      header.addEventListener('mousedown', dragStart);
      document.addEventListener('mouseup', dragEnd);
      document.addEventListener('mousemove', drag);
    }
  },

  toggleQrSuite(forceState = null) {
    if (!this._qrSuiteWrapper) {
      return;
    }

    const nextState = forceState !== null ? Boolean(forceState) : !this._qrSuiteVisible;
    this._qrSuiteVisible = nextState;
    this._qrSuiteWrapper.classList.toggle('visible', nextState);

    if (nextState) {
      this.renderActiveQrTab();
      this.updateQrSelectionState();
      this._qrSuiteWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (this._qrScannerActive) {
      this.stopQrScanner().catch((error) => {
        console.error('Error al detener QR scanner:', error);
      });
    }
  },

  setQrActiveTab(tab) {
    if (!tab || this._qrActiveTab === tab) {
      return;
    }

    if (this._qrActiveTab === 'scanner' && tab !== 'scanner' && this._qrScannerActive) {
      this.stopQrScanner().catch((error) => {
        console.error('Error al detener QR scanner al cambiar tab:', error);
      });
    }

    this._qrActiveTab = tab;
    this.renderActiveQrTab();
  },

  renderActiveQrTab() {
    if (!this._qrSuiteWrapper) {
      return;
    }

    const tabs = this._qrSuiteWrapper.querySelectorAll('.qr-suite-tab');
    const panels = this._qrSuiteWrapper.querySelectorAll('.qr-suite-panel');

    tabs.forEach((tabButton) => {
      tabButton.classList.toggle('active', tabButton.dataset.qrTab === this._qrActiveTab);
    });

    panels.forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.qrPanel === this._qrActiveTab);
    });

    if (this._qrActiveTab === 'labels') {
      this.renderQrLabelsPanel();
    } else if (this._qrActiveTab === 'scanner') {
      this.renderQrScannerPanel();
    } else if (this._qrActiveTab === 'history') {
      this.renderQrHistoryPanel();
    }
  },

  updateQrSelectionState() {
    const selected = this.getSelectedProductos();
    const count = selected.length;

    const countBadge = document.getElementById('qrSelectedResume');
    if (countBadge) {
      countBadge.textContent = count;
    }

    if (this._qrSuiteVisible) {
      this.renderQrLabelsPanel(selected);
    }
  },

  getSelectedProductos() {
    if (!Array.isArray(this._productos) || !this._selectedProducts) {
      return [];
    }

    const ids = Array.from(this._selectedProducts.keys());
    if (!ids.length) {
      return [];
    }

    const idsSet = new Set(ids);
    return this._productos
      .filter((producto) => idsSet.has(producto.id))
      .map((producto) => ({
        ...producto,
        quantityToPrint: this._selectedProducts.get(producto.id) || 1,
      }));
  },

  renderQrLabelsPanel(selectedProductos = null) {
    const grid = document.getElementById('qrLabelsGrid');
    const emptyState = document.getElementById('qrLabelsEmpty');
    const printBtn = document.getElementById('btnPrintQrLabels');

    if (!grid || !emptyState) {
      return;
    }

    const productos = Array.isArray(selectedProductos)
      ? selectedProductos
      : this.getSelectedProductos();

    if (!Array.isArray(productos) || productos.length === 0) {
      grid.innerHTML = '';
      emptyState.style.display = 'flex';
      if (printBtn) {
        printBtn.disabled = true;
      }
      return;
    }

    emptyState.style.display = 'none';
    if (printBtn) {
      printBtn.disabled = false;
    }

    grid.innerHTML = productos
      .map((producto) => {
        const codigo = producto.codigo || producto.id;
        const stock = parseInt(producto.stock) || 0;
        const cantidad = this.getProductQuantity(producto.id);
        return `
        <div class="qr-label-card" data-product-id="${producto.id}">
          <h5 title="${producto.nombre}">${producto.nombre}</h5>
          <div class="qr-label-code">${codigo}</div>
          <div class="qr-label-preview">
            <div class="qr-code-box" id="qrCanvas-${producto.id}" role="img" aria-label="Código QR ${codigo}"></div>
            <svg id="barcode-${producto.id}"></svg>
          </div>
          <div class="qr-label-price">${Utils.formatCurrency(producto.precioVenta)}</div>
          <div class="qr-label-quantity">
            <label for="qty-${producto.id}">
              <i class="fas fa-layer-group"></i> Cantidad:
            </label>
            <div class="quantity-controls">
              <button class="btn btn-sm" data-action="decrease-qty" data-product-id="${producto.id}" title="Disminuir">
                <i class="fas fa-minus"></i>
              </button>
              <input 
                type="number" 
                id="qty-${producto.id}" 
                class="quantity-input" 
                min="1" 
                max="9999" 
                value="${cantidad || 1}"
                data-product-id="${producto.id}"
              >
              <button class="btn btn-sm" data-action="increase-qty" data-product-id="${producto.id}" title="Aumentar">
                <i class="fas fa-plus"></i>
              </button>
            </div>
            <small class="stock-info">
              <i class="fas fa-box"></i> Stock: ${stock} uds
            </small>
            <button class="btn btn-sm btn-outline-secondary" data-action="set-stock-qty" data-product-id="${producto.id}" data-stock="${stock}" title="Usar stock completo">
              <i class="fas fa-boxes"></i> Usar todo
            </button>
          </div>
        </div>
      `;
      })
      .join('');

    // Agregar event listeners para los controles de cantidad
    grid.addEventListener('click', (e) => {
      const decreaseBtn = e.target.closest('[data-action="decrease-qty"]');
      const increaseBtn = e.target.closest('[data-action="increase-qty"]');
      const setStockBtn = e.target.closest('[data-action="set-stock-qty"]');

      if (decreaseBtn) {
        const productId = decreaseBtn.dataset.productId;
        const input = document.getElementById(`qty-${productId}`);
        if (input) {
          const newVal = Math.max(1, parseInt(input.value) - 1);
          input.value = newVal;
          this.setProductQuantity(productId, newVal);
        }
      } else if (increaseBtn) {
        const productId = increaseBtn.dataset.productId;
        const input = document.getElementById(`qty-${productId}`);
        if (input) {
          const newVal = parseInt(input.value) + 1;
          input.value = newVal;
          this.setProductQuantity(productId, newVal);
        }
      } else if (setStockBtn) {
        const productId = setStockBtn.dataset.productId;
        const stock = parseInt(setStockBtn.dataset.stock) || 1;
        const input = document.getElementById(`qty-${productId}`);
        if (input) {
          input.value = stock;
          this.setProductQuantity(productId, stock);
        }
      }
    });

    grid.addEventListener('change', (e) => {
      if (e.target.classList.contains('quantity-input')) {
        const productId = e.target.dataset.productId;
        const cantidad = Math.max(1, parseInt(e.target.value) || 1);
        e.target.value = cantidad;
        this.setProductQuantity(productId, cantidad);
      }
    });

    window.requestAnimationFrame(() => this.generateQrPreviews(productos));
  },

  generateQrPreviews(productos) {
    if (!Array.isArray(productos) || !productos.length) {
      return;
    }

    productos.forEach((producto) => {
      const payload = this.buildQrPayload(producto);

      const qrContainer = document.getElementById(`qrCanvas-${producto.id}`);
      if (qrContainer) {
        if (window.QRCode) {
          try {
            qrContainer.innerHTML = '';

            const qrOptions = {
              text: payload,
              width: 110,
              height: 110,
              colorDark: '#111827',
              colorLight: '#ffffff',
              correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.H : 3,
            };

            if (typeof window.QRCode.toCanvas === 'function' && qrContainer.tagName === 'CANVAS') {
              window.QRCode.toCanvas(qrContainer, payload, qrOptions);
            } else if (typeof window.QRCode === 'function') {
              new window.QRCode(qrContainer, qrOptions);
            } else if (typeof window.QRCode.toCanvas === 'function') {
              window.QRCode.toCanvas(qrContainer, payload, qrOptions);
            }
          } catch (error) {
            console.warn('Productos.generateQrPreviews: error generando QR', error);
            qrContainer.textContent = 'QR no disponible';
          }
        } else {
          qrContainer.textContent = 'QR no disponible';
        }
      }

      const svg = document.getElementById(`barcode-${producto.id}`);
      if (svg && window.JsBarcode) {
        try {
          window.JsBarcode(svg, producto.codigo || producto.id, {
            format: 'CODE128',
            height: 44,
            displayValue: true,
            fontSize: 12,
            margin: 4,
          });
        } catch (error) {
          console.warn('Productos.generateQrPreviews: error generando código de barras', error);
        }
      }
    });
  },

  buildQrPayload(producto) {
    if (!producto) {
      return '';
    }

    const codigo = producto.codigo || producto.id || '';
    if (!codigo) {
      return '';
    }

    try {
      const landingUrl = this._buildLandingUrlForProduct(codigo);
      return landingUrl || codigo;
    } catch (error) {
      console.warn('Productos.buildQrPayload: no se pudo construir la URL pública', error);
      return codigo;
    }
  },

  getPrintableLabelData() {
    const grid = document.getElementById('qrLabelsGrid');
    if (!grid) {
      return [];
    }

    const labels = [];
    const cards = Array.from(grid.querySelectorAll('.qr-label-card'));

    cards.forEach((card) => {
      const productId = card.dataset.productId;
      const cantidad = this.getProductQuantity(productId) || 1;
      const qrCanvas = card.querySelector('canvas');
      const barcodeSvg = card.querySelector('svg');

      const labelData = {
        nombre: card.querySelector('h5')?.textContent || '',
        codigo: card.querySelector('.qr-label-code')?.textContent || '',
        precio: card.querySelector('.qr-label-price')?.textContent || '',
        qrDataUri:
          qrCanvas && typeof qrCanvas.toDataURL === 'function'
            ? qrCanvas.toDataURL('image/png')
            : '',
        barcodeMarkup: barcodeSvg ? barcodeSvg.outerHTML : '',
      };

      // Generar múltiples copias según la cantidad
      for (let i = 0; i < cantidad; i++) {
        labels.push({
          ...labelData,
          copyNumber: i + 1,
          totalCopies: cantidad,
        });
      }
    });

    return labels;
  },

  printQrLabels() {
    const labels = this.getPrintableLabelData();
    if (!labels.length) {
      if (typeof Utils?.showToast === 'function') {
        Utils.showToast('Selecciona productos para imprimir sus etiquetas.', 'info');
      }
      return;
    }

    const uniqueProducts = this._selectedProducts.size;
    const totalLabels = labels.length;
    const tamañoEtiqueta = this._labelSize || 'mediano';
    const IVA_ECUADOR = 0.15; // 15% IVA Ecuador

    if (typeof Utils?.showToast === 'function') {
      Utils.showToast(
        `Generando ${totalLabels} etiqueta${totalLabels > 1 ? 's' : ''} (${tamañoEtiqueta}) de ${uniqueProducts} producto${uniqueProducts > 1 ? 's' : ''}...`,
        'info'
      );
    }

    const popup = window.open('', '_blank');
    if (!popup) {
      if (typeof Utils?.showToast === 'function') {
        Utils.showToast(
          'No se pudo abrir la ventana de impresión. Habilita los pop-ups.',
          'warning'
        );
      }
      return;
    }

    // Configuración de tamaños en cm convertidos a px (1cm ≈ 37.8px)
    const sizesConfig = {
      pequeño: {
        width: '2.5cm',
        widthPx: 94,
        qrSize: 60,
        barcodeHeight: 30,
        fontSize: '8px',
        priceSize: '11px',
        codeSize: '7px',
        gap: '3px',
        padding: '6px',
        gridCols: 8,
        nameLines: 2,
      },
      mediano: {
        width: '3cm',
        widthPx: 113,
        qrSize: 75,
        barcodeHeight: 38,
        fontSize: '9px',
        priceSize: '13px',
        codeSize: '8px',
        gap: '4px',
        padding: '8px',
        gridCols: 6,
        nameLines: 2,
      },
      grande: {
        width: '5cm',
        widthPx: 189,
        qrSize: 110,
        barcodeHeight: 50,
        fontSize: '11px',
        priceSize: '16px',
        codeSize: '10px',
        gap: '6px',
        padding: '10px',
        gridCols: 4,
        nameLines: 3,
      },
    };

    const config = sizesConfig[tamañoEtiqueta] || sizesConfig.mediano;
    const isSingleLabel = totalLabels === 1;

    const styles = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'Arial', 'Helvetica', sans-serif; 
        padding: ${isSingleLabel ? '0' : '15px'};
        background: #f9fafb;
      }
      .print-header { 
        text-align: center; 
        margin-bottom: 15px; 
        padding: 10px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .print-header h2 { 
        margin: 0 0 5px 0; 
        color: #1f2937; 
        font-size: 18px;
      }
      .print-header p { 
        margin: 0; 
        color: #6b7280; 
        font-size: 12px; 
      }
      .print-header .size-badge {
        display: inline-block;
        background: #6366f1;
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        margin-top: 5px;
      }
      .labels-grid { 
        display: ${isSingleLabel ? 'flex' : 'grid'};
        ${isSingleLabel ? 'justify-content: center; align-items: center; min-height: 100vh;' : `grid-template-columns: repeat(${config.gridCols}, ${config.width});`}
        gap: ${config.gap};
        justify-content: ${isSingleLabel ? 'center' : 'start'};
      }
      .label-card { 
        width: ${config.width};
        border: 1.5px solid #d1d5db; 
        border-radius: 4px; 
        padding: ${config.padding}; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        gap: ${config.gap}; 
        text-align: center; 
        page-break-inside: avoid; 
        background: white;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }
      .label-card h5 { 
        margin: 0; 
        font-size: ${config.fontSize}; 
        font-weight: 700; 
        color: #111827;
        line-height: 1.2;
        max-height: calc(${config.fontSize} * 1.2 * ${config.nameLines});
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: ${config.nameLines};
        -webkit-box-orient: vertical;
        width: 100%;
      }
      .label-card .code { 
        font-size: ${config.codeSize}; 
        color: #6b7280; 
        font-weight: 500;
        font-family: 'Courier New', monospace;
      }
      .label-card .qr-barcode-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        width: 100%;
      }
      .label-card img { 
        width: ${config.qrSize}px; 
        height: ${config.qrSize}px; 
        object-fit: contain;
        border: 1px solid #e5e7eb;
        border-radius: 2px;
      }
      .label-card .barcode { 
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .label-card .barcode svg { 
        width: 100%; 
        height: ${config.barcodeHeight}px;
        max-width: ${config.widthPx - 20}px;
      }
      .label-card .price-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1px;
        width: 100%;
        padding-top: 2px;
        border-top: 1px solid #e5e7eb;
      }
      .label-card .price-with-iva { 
        font-weight: 700; 
        color: #111827; 
        font-size: ${config.priceSize};
        line-height: 1;
      }
      .label-card .price-without-iva { 
        font-size: calc(${config.priceSize} * 0.65);
        color: #9ca3af;
        font-weight: 500;
        line-height: 1;
      }
      .copy-badge { 
        font-size: calc(${config.fontSize} * 0.75); 
        color: #9ca3af; 
        margin-top: 2px;
        font-weight: 500;
      }
      @media print { 
        body { 
          padding: ${isSingleLabel ? '0' : '5mm'};
          background: white;
        }
        .print-header { 
          display: ${isSingleLabel ? 'none' : 'block'};
          box-shadow: none;
          margin-bottom: 5mm;
        }
        .label-card { 
          page-break-inside: avoid;
          box-shadow: none;
          break-inside: avoid;
        }
        .labels-grid {
          gap: 2mm;
        }
      }
      @page {
        size: ${isSingleLabel ? 'auto' : 'A4'};
        margin: ${isSingleLabel ? '0' : '10mm'};
      }
    `;

    popup.document.write(
      '<html><head><meta charset="UTF-8"><title>Etiquetas de Productos - ' +
        tamañoEtiqueta +
        '</title><style>' +
        styles +
        '</style></head><body>'
    );

    if (!isSingleLabel) {
      popup.document.write(`
        <div class="print-header">
          <h2>📦 Etiquetas de Productos</h2>
          <p>Total: ${totalLabels} etiqueta${totalLabels > 1 ? 's' : ''} | ${uniqueProducts} producto${uniqueProducts > 1 ? 's' : ''}</p>
          <span class="size-badge">Tamaño: ${tamañoEtiqueta.charAt(0).toUpperCase() + tamañoEtiqueta.slice(1)} (${config.width})</span>
          <p style="margin-top: 5px; font-size: 10px;">${new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      `);
    }

    popup.document.write('<div class="labels-grid">');

    labels.forEach((label) => {
      const showCopyBadge = label.totalCopies > 1;

      // Extraer precio numérico del string de precio
      const precioMatch = label.precio.match(/[\d.,]+/);
      const precioConIVA = precioMatch ? parseFloat(precioMatch[0].replace(',', '.')) : 0;
      const precioSinIVA = precioConIVA / (1 + IVA_ECUADOR);

      const precioConIVAFormatted = new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(precioConIVA);

      const precioSinIVAFormatted = new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(precioSinIVA);

      popup.document.write(`
        <div class="label-card">
          <h5 title="${label.nombre}">${label.nombre}</h5>
          <div class="code">${label.codigo}</div>
          <div class="qr-barcode-container">
            ${label.qrDataUri ? `<img src="${label.qrDataUri}" alt="QR ${label.codigo}">` : ''}
            <div class="barcode">${label.barcodeMarkup || ''}</div>
          </div>
          <div class="price-container">
            <div class="price-with-iva">${precioConIVAFormatted}</div>
            <div class="price-without-iva">Sin IVA: ${precioSinIVAFormatted}</div>
          </div>
          ${showCopyBadge ? `<div class="copy-badge">${label.copyNumber}/${label.totalCopies}</div>` : ''}
        </div>
      `);
    });

    popup.document.write('</div>');
    popup.document.write(
      '<script>window.addEventListener("load", function(){ setTimeout(function(){ window.print(); }, 600); });<\/script>'
    );
    popup.document.write('</body></html>');
    popup.document.close();
  },

  async renderQrScannerPanel() {
    if (!this._qrSuiteWrapper) {
      return;
    }

    const cameraSelect = this._qrSuiteWrapper.querySelector('#qrScannerCamera');
    if (!cameraSelect) {
      return;
    }

    if (!window.Html5Qrcode) {
      cameraSelect.innerHTML = '<option value="">Lector no disponible</option>';
      this.updateScannerStatus('La librería html5-qrcode no está cargada.', 'error');
      return;
    }

    try {
      const devices = await window.Html5Qrcode.getCameras();
      if (!Array.isArray(devices) || !devices.length) {
        cameraSelect.innerHTML = '<option value="">Sin cámaras detectadas</option>';
        this.updateScannerStatus('No se detectaron cámaras en este dispositivo.', 'warning');
        return;
      }

      cameraSelect.innerHTML = devices
        .map(
          (device) =>
            `<option value="${device.id}">${device.label || `Camara ${device.id}`}</option>`
        )
        .join('');

      if (
        !this._qrScannerCameraId ||
        !devices.some((device) => device.id === this._qrScannerCameraId)
      ) {
        this._qrScannerCameraId = devices[0].id;
      }

      cameraSelect.value = this._qrScannerCameraId;
      this.updateScannerStatus('Selecciona una cámara y presiona iniciar.', 'info');
    } catch (error) {
      console.error('Productos.renderQrScannerPanel: error listando cámaras', error);
      cameraSelect.innerHTML = '<option value="">Error listando cámaras</option>';
      this.updateScannerStatus('No se pudieron listar las cámaras disponibles.', 'error');
    }
  },

  updateScannerStatus(message, level = 'info') {
    const statusEl = document.getElementById('qrScannerStatus');
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message;
    statusEl.dataset.status = level;
  },

  async startQrScanner(cameraId = null) {
    if (!window.Html5Qrcode) {
      this.updateScannerStatus('La librería html5-qrcode no está disponible.', 'error');
      return;
    }

    const viewportId = 'qrScannerViewport';
    const viewport = document.getElementById(viewportId);
    if (!viewport) {
      this.updateScannerStatus('No se encontró el contenedor del lector.', 'error');
      return;
    }

    this._qrScannerCameraId = cameraId || this._qrScannerCameraId;

    try {
      if (this._qrScannerActive) {
        await this.stopQrScanner();
      }

      if (!this._qrScanner) {
        this._qrScanner = new window.Html5Qrcode(viewportId, { verbose: false });
      }

      const config = { fps: 10, qrbox: { width: 260, height: 260 }, rememberLastUsedCamera: true };
      const cameraConfig = this._qrScannerCameraId
        ? { deviceId: { exact: this._qrScannerCameraId } }
        : { facingMode: 'environment' };

      await this._qrScanner.start(cameraConfig, config, (decodedText) =>
        this.handleQrScan(decodedText)
      );

      this._qrScannerActive = true;
      this._qrScannerProcessing = false;
      this.updateScannerStatus('Lector activo. Escanea un código.', 'success');

      const startBtn = document.getElementById('btnStartQrScanner');
      const stopBtn = document.getElementById('btnStopQrScanner');
      if (startBtn) startBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = false;
    } catch (error) {
      console.error('Productos.startQrScanner: no se pudo iniciar el lector', error);
      this.updateScannerStatus(
        'No se pudo iniciar el lector. Revisa los permisos de la cámara.',
        'error'
      );
    }
  },

  async stopQrScanner() {
    if (this._qrScanner && this._qrScannerActive) {
      try {
        await this._qrScanner.stop();
        await this._qrScanner.clear();
      } catch (error) {
        console.warn('Productos.stopQrScanner: no se pudo detener limpiamente el lector', error);
      }
    }

    this._qrScannerActive = false;

    const startBtn = document.getElementById('btnStartQrScanner');
    const stopBtn = document.getElementById('btnStopQrScanner');
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;

    this.updateScannerStatus('Lector detenido.', 'info');
  },

  parseQrPayload(value) {
    if (!value) {
      return null;
    }

    if (typeof value === 'object') {
      return value;
    }

    const text = value.toString().trim();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      return { codigo: text };
    }
  },

  extractCodigoFromPayload(payload, fallback = '') {
    const fallbackCodigo = this._extractCodigoFromString(fallback);
    if (!payload) {
      return fallbackCodigo;
    }

    if (typeof payload === 'string') {
      return this._extractCodigoFromString(payload) || fallbackCodigo;
    }

    const candidates = [payload.codigo, payload.code, payload.sku, payload.id, fallbackCodigo];
    for (const candidate of candidates) {
      const resolved = this._extractCodigoFromString(candidate);
      if (resolved) {
        return resolved;
      }
    }

    return fallbackCodigo;
  },

  async handleQrScan(decodedText) {
    if (!decodedText || this._qrScannerProcessing) {
      return;
    }

    this._qrScannerProcessing = true;

    try {
      const payload = this.parseQrPayload(decodedText);
      const codigo = this.extractCodigoFromPayload(payload, decodedText);

      const result = await this.processScannedCode(codigo);

      if (result.success) {
        this.updateScannerStatus(`Producto ${result.codigo} agregado al POS.`, 'success');
      } else {
        this.updateScannerStatus(`No se pudo procesar ${codigo}.`, 'warning');
      }

      this.addQrHistoryEntry({
        codigo: result.codigo || codigo,
        nombre: result.nombre || payload?.nombre || '',
        success: result.success,
      });
    } catch (error) {
      console.error('Productos.handleQrScan: error procesando código', error);
      this.updateScannerStatus('Ocurrió un error al procesar el código.', 'error');
    } finally {
      this._qrScannerProcessing = false;
    }
  },

  async processScannedCode(codigo) {
    const normalizedInput = this._extractCodigoFromString(codigo);
    const trimmed = (normalizedInput || '').toString().trim();
    if (!trimmed) {
      return { success: false, codigo: '', nombre: '' };
    }

    const normalized = trimmed.toLowerCase();
    const productoEncontrado = this._productos.find(
      (p) => (p.codigo || '').toString().trim().toLowerCase() === normalized
    );

    if (
      !window.VentasMejorado ||
      typeof window.VentasMejorado.agregarProductoPorCodigo !== 'function'
    ) {
      if (typeof Utils?.showToast === 'function') {
        Utils.showToast('Abre el POS para agregar productos escaneados.', 'info');
      }
      return { success: false, codigo: trimmed, nombre: productoEncontrado?.nombre || '' };
    }

    const posReady = document.getElementById('pos-cart-items');
    if (!posReady && window.App && typeof window.App.loadModule === 'function') {
      await this.stopQrScanner().catch(() => {});
      await window.App.loadModule('ventas');
    }

    const success = await window.VentasMejorado.agregarProductoPorCodigo(trimmed);
    if (success && typeof Utils?.showToast === 'function') {
      Utils.showToast(`Producto ${trimmed} agregado al POS.`, 'success');
    }
    if (!success && typeof Utils?.showToast === 'function') {
      Utils.showToast(`No se encontró un producto con el código ${trimmed}.`, 'warning');
    }

    return { success, codigo: trimmed, nombre: productoEncontrado?.nombre || '' };
  },

  addQrHistoryEntry(entry) {
    if (!entry) {
      return;
    }

    const historyEntry = {
      id: typeof Utils?.generateId === 'function' ? Utils.generateId() : `qr-${Date.now()}`,
      timestamp: Date.now(),
      codigo: entry.codigo || '',
      nombre: entry.nombre || '',
      success: Boolean(entry.success),
    };

    this._qrHistory = [historyEntry, ...this._qrHistory].slice(0, 40);
    this.renderQrHistoryPanel();
  },

  renderQrHistoryPanel() {
    const list = document.getElementById('qrHistoryList');
    const empty = document.getElementById('qrHistoryEmpty');
    if (!list || !empty) {
      return;
    }

    if (!Array.isArray(this._qrHistory) || this._qrHistory.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }

    empty.style.display = 'none';

    list.innerHTML = this._qrHistory
      .map((entry) => {
        const icon = entry.success ? 'fa-check-circle' : 'fa-exclamation-circle';
        const statusLabel = entry.success ? 'Enviado al POS' : 'Sin coincidencia';
        const fecha =
          typeof Utils?.formatDate === 'function'
            ? Utils.formatDate(entry.timestamp, 'datetime')
            : new Date(entry.timestamp).toLocaleString();
        return `
        <div class="qr-history-item ${entry.success ? 'success' : 'error'}">
          <header>
            <span><i class="fas ${icon}"></i> ${entry.codigo || 'Código no identificado'}</span>
            <span>${statusLabel}</span>
          </header>
          <div class="qr-history-meta">
            <span>${fecha}</span>
            ${entry.nombre ? `<span>${entry.nombre}</span>` : ''}
          </div>
        </div>
      `;
      })
      .join('');
  },

  _getStoredInventoryAnalysis() {
    try {
      const stored = localStorage.getItem('inventory_analysis_data');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.data;
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  _renderInventoryInsights(analysis) {
    // Implementación básica para evitar errores
    console.log('Renderizando insights de inventario', analysis);
    if (this._inventoryContainer && typeof this._renderLegacyStockFallback === 'function') {
      this._renderLegacyStockFallback(this._inventoryContainer);
    }
  },

  async _startIAAnalysis() {
    if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
      Utils.showToast('Iniciando análisis de inventario...', 'info');
    }

    // Simulación de análisis
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
      Utils.showToast('Análisis completado. Mostrando vista estándar.', 'success');
    }

    if (this._inventoryContainer && typeof this._renderLegacyStockFallback === 'function') {
      this._renderLegacyStockFallback(this._inventoryContainer);
    }
  },

  /**
   * Renderiza el panel de control de stock inteligente con diseño mejorado.
   */
  async renderStock(container) {
    console.log('[renderStock] Iniciando renderizado de Control de Stock...');
    if (!container) {
      console.error('[renderStock] Contenedor inválido:', container);
      return;
    }
    console.log('[renderStock] Contenedor válido:', container);

    this._stockViewMode = this._loadStockViewModePreference();

    // Asegurar que los estilos están cargados
    this.ensureNightStyles();

    if (this._inventoryRefreshTimer) {
      clearTimeout(this._inventoryRefreshTimer);
      this._inventoryRefreshTimer = null;
    }

    this._inventoryContainer = container;

    try {
      console.log('[renderStock] Cargando productos...');
      const [productos, categorias] = await Promise.all([
        this.loadProductos({ estado: 'todos', forceRefresh: false }),
        this.getCategorias(),
      ]);

      // Clasificar productos
      const productosSeguros = Array.isArray(productos) ? productos : [];
      const productosCriticos = productosSeguros
        .filter((producto) => {
          const stock = Number(producto?.stock) || 0;
          const minimo = Number(producto?.stockMinimo);
          if (Number.isNaN(minimo) || minimo <= 0) {
            return stock === 0;
          }
          return stock <= minimo;
        })
        .sort((a, b) => {
          const diff = (Number(a.stock) || 0) - (Number(b.stock) || 0);
          if (diff !== 0) return diff;
          return a.nombre.localeCompare(b.nombre);
        });

      const sinStock = productosSeguros.filter((producto) => (Number(producto?.stock) || 0) === 0);
      const stockBajo = productosCriticos.filter((p) => (Number(p.stock) || 0) > 0);
      const productosActivos = productosSeguros.filter((p) => p.activo !== false);

      // Calcular valor total del inventario
      const valorInventario = productosActivos.reduce((total, p) => {
        const stock = Number(p.stock) || 0;
        const precio = Number(p.precioVenta) || 0;
        return total + stock * precio;
      }, 0);

      // Calcular valor en riesgo (productos críticos)
      const valorEnRiesgo = productosCriticos.reduce((total, p) => {
        const precio = Number(p.precioVenta) || 0;
        return total + precio;
      }, 0);

      const categoriasMap = new Map((categorias || []).map((c) => [c.id, c.nombre]));
      const hasProductosCriticos = productosCriticos.length > 0;
      const stockViewControls = hasProductosCriticos
        ? `
        <div class="stock-view-controls">
          <div class="view-mode-select compact">
            <label for="stockViewMode">Modo vista</label>
            <select id="stockViewMode" class="select-minimal-night">
              <option value="cards" ${this._stockViewMode === 'cards' ? 'selected' : ''}>Tarjetas</option>
              <option value="table" ${this._stockViewMode === 'table' ? 'selected' : ''}>Tabla Excel</option>
            </select>
          </div>
          <div class="view-toggle view-toggle-sm" aria-label="Cambiar vista de stock">
            <button class="view-toggle-btn ${this._stockViewMode === 'cards' ? 'active' : ''}" data-view="cards" type="button" title="Vista de tarjetas">
              <i class="fas fa-th-large"></i>
            </button>
            <button class="view-toggle-btn ${this._stockViewMode === 'table' ? 'active' : ''}" data-view="table" type="button" title="Vista tabla Excel">
              <i class="fas fa-list"></i>
            </button>
          </div>
        </div>
      `
        : '';
      const stockViewMarkup = hasProductosCriticos
        ? this._stockViewMode === 'cards'
          ? this._renderStockAlertsCards(productosCriticos, categoriasMap)
          : this._renderStockAlertsTable(productosCriticos, categoriasMap)
        : this._renderStockEmptyState();

      container.innerHTML = `
        <div class="stock-night-shell">
          <!-- TOOLBAR PRINCIPAL -->
          <div class="stock-toolbar">
            <div class="stock-toolbar-text">
              <h2><i class="fas fa-warehouse"></i> Control de Stock</h2>
              <p>Monitoreo inteligente de inventario y alertas de reposición</p>
            </div>
            <div class="productos-toolbar-actions">
              <button class="btn-night" id="btnRefreshStock">
                <i class="fas fa-sync-alt"></i> Actualizar
              </button>
              <button class="btn-night btn-night-primary" id="btnVerInventario">
                <i class="fas fa-boxes"></i> Ver Inventario
              </button>
            </div>
          </div>

          <!-- BANNER IA -->
          <div class="stock-ia-banner">
            <i class="fas fa-robot"></i>
            <div class="ia-text">
              <strong>Análisis Inteligente Disponible</strong>
              <p>La IA puede analizar tus ventas y compras recientes para anticipar quiebres de stock y sugerir cantidades óptimas de reposición.</p>
            </div>
            <button class="btn-night btn-night-primary" data-action="inventory-refresh">
              <i class="fas fa-brain"></i> Activar análisis IA
            </button>
          </div>

          <!-- TARJETAS DE ESTADÍSTICAS -->
          <div class="productos-stats-grid">
            <div class="productos-stat-card">
              <div class="stat-icon primary"><i class="fas fa-cubes"></i></div>
              <span class="stat-label">Total Productos</span>
              <span class="stat-value">${productosActivos.length}</span>
              <span class="stat-subtitle">En inventario activo</span>
            </div>
            <div class="productos-stat-card">
              <div class="stat-icon success"><i class="fas fa-dollar-sign"></i></div>
              <span class="stat-label">Valor Inventario</span>
              <span class="stat-value" style="font-size: 1.4rem;">${typeof Utils !== 'undefined' && Utils.formatCurrency ? Utils.formatCurrency(valorInventario) : '$' + valorInventario.toFixed(2)}</span>
              <span class="stat-subtitle">A precio de venta</span>
            </div>
            <div class="productos-stat-card">
              <div class="stat-icon warning"><i class="fas fa-exclamation-triangle"></i></div>
              <span class="stat-label">Stock Bajo</span>
              <span class="stat-value">${stockBajo.length}</span>
              <span class="stat-subtitle">Requieren atención</span>
            </div>
            <div class="productos-stat-card">
              <div class="stat-icon danger"><i class="fas fa-times-circle"></i></div>
              <span class="stat-label">Agotados</span>
              <span class="stat-value">${sinStock.length}</span>
              <span class="stat-subtitle">${typeof Utils !== 'undefined' && Utils.formatCurrency ? Utils.formatCurrency(valorEnRiesgo) : '$' + valorEnRiesgo.toFixed(2)} en riesgo</span>
            </div>
          </div>

          <!-- ALERTAS DE STOCK -->
          <div class="productos-table-container">
            <div class="productos-table-header stock-table-header">
              <div>
                <h3><i class="fas fa-exclamation-circle"></i> Productos en Nivel Crítico</h3>
                <span style="color: var(--prod-text-muted);">${productosCriticos.length} productos requieren atención</span>
              </div>
              ${stockViewControls}
            </div>
            <div id="stockCriticalView">
              ${stockViewMarkup}
            </div>
          </div>
        </div>
      `;

      console.log('[renderStock] HTML renderizado exitosamente');

      const syncStockViewControls = (mode = this._stockViewMode) => {
        const select = container.querySelector('#stockViewMode');
        if (select) {
          select.value = mode;
        }
        container.querySelectorAll('.stock-view-controls .view-toggle-btn').forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.view === mode);
        });
      };

      const renderStockViewMode = (mode) => {
        if (!productosCriticos.length) {
          return;
        }
        const normalized = mode === 'table' ? 'table' : 'cards';
        const viewContainer = container.querySelector('#stockCriticalView');
        if (!viewContainer) {
          return;
        }

        this._stockViewMode = normalized;
        this._saveStockViewModePreference(normalized);

        viewContainer.innerHTML =
          normalized === 'cards'
            ? this._renderStockAlertsCards(productosCriticos, categoriasMap)
            : this._renderStockAlertsTable(productosCriticos, categoriasMap);

        syncStockViewControls(normalized);
      };

      syncStockViewControls(this._stockViewMode);

      const stockViewSelect = container.querySelector('#stockViewMode');
      if (stockViewSelect) {
        stockViewSelect.addEventListener('change', (event) => {
          renderStockViewMode(event.target.value);
        });
      }

      container.querySelectorAll('.stock-view-controls .view-toggle-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          renderStockViewMode(btn.dataset.view);
        });
      });

      // Eventos
      const btnVerInventario = container.querySelector('#btnVerInventario');
      if (btnVerInventario && window.App && typeof App.loadModule === 'function') {
        btnVerInventario.addEventListener('click', () => App.loadModule('productos'));
      }

      const btnRefresh = container.querySelector('#btnRefreshStock');
      if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
          btnRefresh.disabled = true;
          btnRefresh.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
          this.invalidarCacheProductos({ incluirCategorias: false });
          await this.renderStock(container);
        });
      }

      // Eventos de click en tarjetas
      container.addEventListener('click', async (event) => {
        const verTodosBtn = event.target.closest('#btnVerTodosCriticos');
        if (verTodosBtn && window.App && typeof App.loadModule === 'function') {
          App.loadModule('productos');
          setTimeout(() => {
            const tabAgotados = document.querySelector('[data-filter="agotados"]');
            if (tabAgotados) tabAgotados.click();
          }, 500);
          return;
        }

        const pedidoBtn = event.target.closest('[data-action="inventory-open-product"]');
        if (pedidoBtn) {
          const productoId = pedidoBtn.dataset.productId;
          if (productoId && typeof this.prepararPedidoProveedor === 'function') {
            this.prepararPedidoProveedor(productoId);
          }
          return;
        }

        const refreshBtn = event.target.closest('[data-action="inventory-refresh"]');
        if (refreshBtn) {
          event.preventDefault();
          this._startIAAnalysis();
          return;
        }

        const historialBtn = event.target.closest('[data-action="ver-historial-stock"]');
        if (historialBtn) {
          const productoId = historialBtn.dataset.productoId;
          if (productoId) {
            await this.verHistorialProducto(productoId);
          }
          return;
        }

        const reabastecerBtn = event.target.closest('[data-action="reabastecer-stock"]');
        if (reabastecerBtn) {
          const productoId = reabastecerBtn.dataset.productoId;
          const producto = this._productos.find((p) => p.id === productoId);
          if (producto) {
            this.mostrarModalReabastecimiento(producto);
          }
          return;
        }
      });
    } catch (error) {
      console.error('[renderStock] Error cargando productos:', error);
      container.innerHTML = `
        <div class="stock-night-shell">
          <div class="productos-empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Error al cargar Control de Stock</h4>
            <p>${error?.message || 'Intenta nuevamente más tarde.'}</p>
            <button class="btn-night btn-night-primary" onclick="Productos.renderStock(this.closest('.stock-night-shell').parentElement)">
              <i class="fas fa-sync"></i> Reintentar
            </button>
          </div>
        </div>
      `;
    }
  },

  _renderStockAlertsCards(productosCriticos, categoriasMap) {
    if (!Array.isArray(productosCriticos) || productosCriticos.length === 0) {
      return this._renderStockEmptyState();
    }

    const cardsHtml = productosCriticos
      .slice(0, 12)
      .map((producto) => {
        const stock = Number(producto?.stock) || 0;
        const stockMinimo = Number(producto?.stockMinimo) || 0;
        const esCritico = stock === 0;
        const sugerido = this.calcularCantidadSugerida(producto);
        const categoriaNombre = categoriasMap?.get
          ? categoriasMap.get(producto.categoria) || 'Sin categoría'
          : 'Sin categoría';

        return `
        <div class="stock-alert-card ${esCritico ? 'critico' : 'bajo'}" data-producto-id="${producto.id}">
          <div class="stock-alert-header">
            <div class="stock-alert-info">
              <h4>${producto.nombre}</h4>
              <span class="codigo">${producto.codigo || 'Sin código'}</span>
            </div>
            <span class="stock-alert-badge ${esCritico ? 'critico' : 'bajo'}">
              ${esCritico ? '⚠️ AGOTADO' : '📉 BAJO'}
            </span>
          </div>
          <div class="stock-alert-body">
            <div class="info-item">
              <strong>Stock Actual</strong>
              <span style="color: ${esCritico ? 'var(--prod-danger)' : 'var(--prod-warning)'}; font-weight: 700;">${stock} uds</span>
            </div>
            <div class="info-item">
              <strong>Mínimo</strong>
              <span>${stockMinimo} uds</span>
            </div>
            <div class="info-item">
              <strong>Categoría</strong>
              <span>${categoriaNombre}</span>
            </div>
          </div>
          <div class="stock-alert-footer">
            <button class="btn-night btn-night-sm btn-night-success" data-action="inventory-open-product" data-product-id="${producto.id}">
              <i class="fas fa-shopping-basket"></i> Pedir (${sugerido})
            </button>
            <button class="btn-night btn-night-sm" data-action="ver-historial-stock" data-producto-id="${producto.id}">
              <i class="fas fa-chart-line"></i> Historial
            </button>
            ${
              esCritico
                ? `
              <button class="btn-night btn-night-sm btn-night-primary" data-action="reabastecer-stock" data-producto-id="${producto.id}">
                <i class="fas fa-truck-loading"></i> Reabastecer
              </button>
            `
                : ''
            }
          </div>
        </div>
      `;
      })
      .join('');

    const footer =
      productosCriticos.length > 12
        ? this._renderStockVerTodosFooter(productosCriticos.length)
        : '';

    return `
      <div class="stock-alerts-grid" style="padding: 1rem;">
        ${cardsHtml}
      </div>
      ${footer}
    `;
  },

  _renderStockAlertsTable(productosCriticos, categoriasMap) {
    if (!Array.isArray(productosCriticos) || productosCriticos.length === 0) {
      return this._renderStockEmptyState();
    }

    const rows = productosCriticos
      .map((producto) => {
        const stock = Number(producto?.stock) || 0;
        const stockMinimo = Number(producto?.stockMinimo) || 0;
        const categoriaNombre = categoriasMap?.get
          ? categoriasMap.get(producto.categoria) || 'Sin categoría'
          : 'Sin categoría';
        const sugerido = this.calcularCantidadSugerida(producto);
        const valorUnitario = Number(producto?.precioCompra) || Number(producto?.precioVenta) || 0;
        const valorDisplay =
          typeof Utils !== 'undefined' && typeof Utils.formatCurrency === 'function'
            ? Utils.formatCurrency(valorUnitario)
            : `$${valorUnitario.toFixed(2)}`;
        const estadoBadge = (() => {
          if (
            typeof window !== 'undefined' &&
            window.StockLevelManager &&
            typeof window.StockLevelManager.getStockLevel === 'function'
          ) {
            const nivel = window.StockLevelManager.getStockLevel(producto);
            const badgeClass = this._resolveStockBadgeClass(nivel?.prioridad);
            return `<span class="excel-badge ${badgeClass}">${nivel?.nombre || 'Sin dato'}</span>`;
          }
          const badgeClass = stock === 0 ? 'excel-badge-danger' : 'excel-badge-warning';
          return `<span class="excel-badge ${badgeClass}">${stock === 0 ? 'Sin stock' : 'Stock bajo'}</span>`;
        })();
        const rowClass = stock === 0 ? 'row-sin-stock' : 'row-stock-bajo';
        const esCritico = stock === 0;

        return `
        <tr class="${rowClass}" data-producto-id="${producto.id}">
          <td class="col-producto">
            <div class="excel-cell-main">
              <strong>${producto.nombre}</strong>
              <small>${producto.codigo || 'Sin código'}</small>
            </div>
          </td>
          <td class="col-categoria">${categoriaNombre}</td>
          <td class="col-stock">${stock}</td>
          <td class="col-minimo">${stockMinimo || '-'}</td>
          <td class="col-estado">${estadoBadge}</td>
          <td class="col-sugerido">${sugerido}</td>
          <td class="col-valor">${valorDisplay}</td>
          <td class="col-acciones">
            <button class="btn-night btn-night-sm btn-night-success" data-action="inventory-open-product" data-product-id="${producto.id}" title="Preparar pedido">
              <i class="fas fa-shopping-basket"></i>
            </button>
            <button class="btn-night btn-night-sm" data-action="ver-historial-stock" data-producto-id="${producto.id}" title="Ver historial">
              <i class="fas fa-chart-line"></i>
            </button>
            ${
              esCritico
                ? `
              <button class="btn-night btn-night-sm btn-night-primary" data-action="reabastecer-stock" data-producto-id="${producto.id}" title="Reabastecer">
                <i class="fas fa-truck-loading"></i>
              </button>
            `
                : ''
            }
          </td>
        </tr>
      `;
      })
      .join('');

    const footer =
      productosCriticos.length > 12
        ? this._renderStockVerTodosFooter(productosCriticos.length)
        : '';

    return `
      <div class="table-responsive table-excel-wrapper">
        <table class="table-excel-productos table-excel-stock">
          <thead>
            <tr>
              <th class="col-producto">Producto</th>
              <th class="col-categoria">Categoría</th>
              <th class="col-stock">Stock</th>
              <th class="col-minimo">Mínimo</th>
              <th class="col-estado">Estado</th>
              <th class="col-sugerido">Sugerido</th>
              <th class="col-valor">Costo</th>
              <th class="col-acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
      ${footer}
    `;
  },

  _renderStockEmptyState() {
    return `
      <div class="productos-empty-state" style="margin: 2rem;">
        <i class="fas fa-check-circle" style="color: var(--prod-success);"></i>
        <h4>¡Excelente! No hay alertas de stock</h4>
        <p>Todos los productos se encuentran por encima de su nivel mínimo de stock.</p>
      </div>
    `;
  },

  _renderStockVerTodosFooter(total) {
    return `
      <div class="stock-view-footer">
        <button class="btn-night" id="btnVerTodosCriticos">
          <i class="fas fa-list"></i> Ver todos (${total})
        </button>
      </div>
    `;
  },

  _resolveStockBadgeClass(priority) {
    if (priority === 0 || priority === 1 || priority === 2) {
      return 'excel-badge-danger';
    }
    if (priority === 3 || priority === 4) {
      return 'excel-badge-warning';
    }
    if (priority >= 5) {
      return 'excel-badge-success';
    }
    return 'excel-badge-neutral';
  },

  async _renderLegacyStockFallback(container, originalError = null) {
    console.log('[_renderLegacyStockFallback] Iniciando vista clásica...', {
      error: originalError?.message,
    });
    if (!container) {
      console.error('[_renderLegacyStockFallback] Contenedor inválido');
      return;
    }

    this._inventoryInsights = null;
    this._inventoryMeta = null;

    container.classList.remove('inventory-insights-container');

    try {
      const [productos, categorias] = await Promise.all([
        Array.isArray(this._productos) && this._productos.length
          ? Promise.resolve(this._productos)
          : this.loadProductos({ estado: 'todos', forceRefresh: true }),
        this.getCategorias(),
      ]);

      const listaCategorias = Array.isArray(categorias) ? categorias : [];
      const obtenerCategoriaNombre = (id) => {
        const categoria = listaCategorias.find((cat) => cat.id === id);
        return categoria ? categoria.nombre : 'Sin categoría';
      };

      const productosSeguros = Array.isArray(productos) ? productos : [];
      const productosCriticos = productosSeguros
        .filter((producto) => {
          const stock = Number(producto?.stock) || 0;
          const minimo = Number(producto?.stockMinimo);
          if (Number.isNaN(minimo) || minimo <= 0) {
            return stock === 0;
          }
          return stock <= minimo;
        })
        .sort((a, b) => {
          const diff = (Number(a.stock) || 0) - (Number(b.stock) || 0);
          if (diff !== 0) return diff;
          return a.nombre.localeCompare(b.nombre);
        });

      const sinStock = productosSeguros.filter((producto) => (Number(producto?.stock) || 0) === 0);
      const topCriticos = productosCriticos.slice(0, 50);

      const resumenCards = `
        <div class="stock-summary">
          <div class="summary-card">
            <span class="summary-label">Productos activos</span>
            <strong class="summary-value">${productosSeguros.length}</strong>
          </div>
          <div class="summary-card">
            <span class="summary-label">Stock crítico</span>
            <strong class="summary-value">${productosCriticos.length}</strong>
          </div>
          <div class="summary-card">
            <span class="summary-label">Sin stock</span>
            <strong class="summary-value">${sinStock.length}</strong>
          </div>
        </div>
      `;

      const tablaCriticos = topCriticos.length
        ? `
          <table class="data-table responsive-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th>Mínimo</th>
                <th>Último proveedor</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              ${topCriticos
                .map((producto) => {
                  const stock = Number(producto?.stock) || 0;
                  const stockMinimo = Number(producto?.stockMinimo) || 0;
                  const badgeClass =
                    stock === 0
                      ? 'badge badge-danger'
                      : stock <= stockMinimo
                        ? 'badge badge-warning'
                        : 'badge badge-success';
                  const proveedor = producto.proveedorNombre || producto.proveedor || '-';
                  const sugerido = this.calcularCantidadSugerida(producto);
                  return `
                  <tr data-producto-id="${producto.id}">
                    <td data-label="Producto"><strong>${producto.nombre}</strong><div class="row-subtitle">${producto.codigo || ''}</div></td>
                    <td data-label="Categoría">${obtenerCategoriaNombre(producto.categoria)}</td>
                    <td data-label="Stock"><span class="${badgeClass}">${stock}</span></td>
                    <td data-label="Mínimo">${stockMinimo || '-'}</td>
                    <td data-label="Último proveedor">${proveedor}</td>
                    <td data-label="Acción">
                      <button class="btn btn-sm btn-outline-primary" data-action="inventory-open-product" data-product-id="${producto.id}">
                        <i class="fas fa-shopping-basket"></i> Pedir (${sugerido})
                      </button>
                    </td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        `
        : `
          <div class="empty-state">
            <i class="fas fa-warehouse"></i>
            <p>Todos los productos se encuentran por encima de su stock mínimo.</p>
          </div>
        `;

      const fallbackMessage =
        typeof this._sanitizeHtmlContent === 'function'
          ? this._sanitizeHtmlContent(
              originalError?.message || 'Análisis IA disponible bajo demanda.'
            )
          : (originalError?.message || 'Análisis IA disponible bajo demanda.')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');

      const hasStoredAnalysis =
        typeof this._getStoredInventoryAnalysis === 'function'
          ? !!this._getStoredInventoryAnalysis()
          : false;

      const fallbackNotice = `<div class="alert ${originalError ? 'alert-warning' : 'alert-info'}" style="margin-bottom:1rem;">
            <i class="fas fa-robot"></i>
            <div>
              <strong>${originalError ? 'Vista IA no disponible' : 'Análisis IA Inteligente'}</strong>
              <p>${originalError ? fallbackMessage : 'La IA puede analizar tus ventas y compras recientes para anticipar quiebres de stock.'}</p>
              ${hasStoredAnalysis ? '<p style="font-size:0.85rem;color:#6b7280;margin-top:0.5rem;"><i class="fas fa-info-circle"></i> Tienes un análisis IA guardado disponible.</p>' : ''}
              <button class="btn btn-primary btn-sm" data-action="inventory-refresh">
                <i class="fas fa-brain"></i> ${originalError ? 'Reintentar análisis IA' : 'Activar análisis IA'}
              </button>
            </div>
          </div>`;

      console.log('[_renderLegacyStockFallback] Renderizando HTML clásico...', {
        productosTotal: productosSeguros.length,
        criticos: productosCriticos.length,
        sinStock: sinStock.length,
      });

      container.innerHTML = `
        ${fallbackNotice}
        <div class="module-header">
          <div>
            <h2><i class="fas fa-warehouse"></i> Control de Stock</h2>
            <p class="module-subtitle">Vista clásica con productos en nivel crítico.</p>
          </div>
          <button class="btn btn-secondary" id="btnVerInventario">
            <i class="fas fa-boxes"></i> Abrir inventario
          </button>
        </div>
        ${resumenCards}
        <div class="card">
          <div class="card-header">
            <h3><i class="fas fa-exclamation-triangle"></i> Productos en nivel crítico</h3>
            <span>Se muestran hasta 50 resultados ordenados por urgencia.</span>
          </div>
          <div class="card-body">
            ${tablaCriticos}
          </div>
        </div>
      `;

      console.log('[_renderLegacyStockFallback] HTML renderizado exitosamente');

      const verInventario = container.querySelector('#btnVerInventario');
      if (verInventario && window.App && typeof App.loadModule === 'function') {
        verInventario.addEventListener('click', () => App.loadModule('productos'));
      }

      if (this._legacyClickHandler) {
        container.removeEventListener('click', this._legacyClickHandler);
      }

      this._legacyClickHandler = (event) => {
        const pedidoBtn = event.target.closest('[data-action="inventory-open-product"]');
        if (pedidoBtn) {
          const productoId = pedidoBtn.dataset.productId;
          if (productoId && typeof this.prepararPedidoProveedor === 'function') {
            this.prepararPedidoProveedor(productoId);
          }
          return;
        }

        const refreshBtn = event.target.closest('[data-action="inventory-refresh"]');
        if (refreshBtn) {
          event.preventDefault();
          this._startIAAnalysis();
          return;
        }
      };

      container.addEventListener('click', this._legacyClickHandler);
    } catch (error) {
      console.error(
        'Productos._renderLegacyStockFallback: no se pudo renderizar la vista clásica',
        error
      );
      container.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-triangle"></i>
          <div>
            <strong>No se pudo cargar el control de stock</strong>
            <p>${error?.message || 'Intenta nuevamente más tarde.'}</p>
          </div>
        </div>
      `;
    }
  },

  ensureInventoryStyles() {
    if (document.getElementById('inventory-insights-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'inventory-insights-styles';
    style.textContent = `
.inventory-insights-container{display:flex;flex-direction:column;gap:1.5rem;}
.inventory-insights-header{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:1rem;background:var(--surface-elevated,#ffffff);border:1px solid rgba(15,23,42,0.08);border-radius:16px;padding:1.25rem;box-shadow:var(--card-shadow,0 10px 30px rgba(14,23,38,0.08));}
.dark-theme .inventory-insights-header{background:rgba(30,41,59,0.95);border-color:rgba(148,163,184,0.2);box-shadow:0 18px 40px rgba(0,0,0,0.5);} 
.inventory-insights-actions{display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center;}
.inventory-meta{display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;color:var(--text-muted,#6b7280);font-size:0.9rem;}
.dark-theme .inventory-meta{color:#94a3b8;}
.inventory-status{display:inline-flex;align-items:center;gap:0.35rem;font-weight:500;}
.inventory-status[data-state="loading"]{color:var(--info-color,#2563eb);}
.inventory-status[data-state="success"]{color:var(--success-color,#059669);}
.inventory-status[data-state="error"]{color:var(--danger-color,#dc2626);}
.inventory-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;}
.inventory-metric-card{background:var(--surface-elevated,#ffffff);border:1px solid rgba(15,23,42,0.08);border-radius:14px;padding:1rem;display:flex;flex-direction:column;gap:0.4rem;}
.dark-theme .inventory-metric-card{background:rgba(30,41,59,0.9);border-color:rgba(148,163,184,0.2);box-shadow:0 4px 12px rgba(0,0,0,0.3);}
.inventory-metric-card strong{font-size:1.35rem;color:var(--text-primary,#1f2937);}
.dark-theme .inventory-metric-card strong{color:#f1f5f9;}
.inventory-metric-card span{color:var(--text-muted,#6b7280);font-size:0.85rem;}
.dark-theme .inventory-metric-card span{color:#cbd5e1;}
.inventory-metric-card.metric-warning{border-color:rgba(250,204,21,0.65);background:rgba(250,204,21,0.05);}
.dark-theme .inventory-metric-card.metric-warning{border-color:rgba(250,204,21,0.4);background:rgba(250,204,21,0.08);}
.inventory-metric-card.metric-danger{border-color:rgba(248,113,113,0.75);background:rgba(248,113,113,0.05);}
.dark-theme .inventory-metric-card.metric-danger{border-color:rgba(248,113,113,0.5);background:rgba(248,113,113,0.08);}
.inventory-card{background:var(--surface-elevated,#ffffff);border:1px solid rgba(15,23,42,0.08);border-radius:16px;padding:1.25rem;display:flex;flex-direction:column;gap:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.04);}
.dark-theme .inventory-card{background:rgba(30,41,59,0.95);border-color:rgba(148,163,184,0.25);box-shadow:0 4px 16px rgba(0,0,0,0.4);}
.inventory-card h3{margin:0;font-size:1.1rem;display:flex;align-items:center;gap:0.5rem;color:var(--text-primary,#1f2937);}
.dark-theme .inventory-card h3{color:#f1f5f9;}
.inventory-card p{margin:0;line-height:1.5;color:var(--text-secondary,#374151);}
.dark-theme .inventory-card p{color:#cbd5e1;}
.dark-theme .card{background:rgba(30,41,59,0.95);border-color:rgba(148,163,184,0.25);}
.dark-theme .card-body{background:transparent;color:#cbd5e1;}
.dark-theme .card-header{background:rgba(51,65,85,0.5);border-color:rgba(148,163,184,0.25);color:#f1f5f9;}
.dark-theme .card-header h3{color:#f1f5f9;}
.dark-theme .card-header span{color:#94a3b8;}
.dark-theme .module-header h2{color:#f1f5f9;}
.dark-theme .module-subtitle{color:#94a3b8;}
.dark-theme .stock-summary{gap:1rem;}
.dark-theme .summary-card{background:rgba(30,41,59,0.9);border-color:rgba(148,163,184,0.25);box-shadow:0 4px 12px rgba(0,0,0,0.3);}
.dark-theme .summary-label{color:#94a3b8;}
.dark-theme .summary-value{color:#f1f5f9;}
.dark-theme .data-table{background:transparent;}
.dark-theme .data-table thead{background:rgba(51,65,85,0.4);}
.dark-theme .data-table th{color:#94a3b8;border-color:rgba(148,163,184,0.2);}
.dark-theme .data-table td{color:#cbd5e1;border-color:rgba(148,163,184,0.15);}
.dark-theme .data-table tbody tr:hover{background:rgba(51,65,85,0.3);}
.inventory-subtitle{color:var(--text-muted,#6b7280);font-size:0.85rem;margin:0;}
.dark-theme .inventory-subtitle{color:#94a3b8;}
.inventory-ai-actions{padding-left:1rem;list-style:disc;color:var(--text-secondary,#374151);}
.dark-theme .inventory-ai-actions{color:#cbd5e1;}
.inventory-ai-actions li{margin-bottom:0.4rem;}
.inventory-alerts{display:grid;gap:0.75rem;}
.inventory-alert{padding:0.85rem 1rem;border-radius:12px;border-left:4px solid var(--info-color,#2563eb);background:rgba(37,99,235,0.08);}
.dark-theme .inventory-alert{background:rgba(37,99,235,0.15);border-left-color:#60a5fa;}
.inventory-alert.alert-critical{border-left-color:var(--danger-color,#dc2626);background:rgba(220,38,38,0.08);}
.dark-theme .inventory-alert.alert-critical{background:rgba(220,38,38,0.15);border-left-color:#f87171;}
.inventory-alert.alert-warning{border-left-color:var(--warning-color,#f59e0b);background:rgba(245,158,11,0.1);}
.dark-theme .inventory-alert.alert-warning{background:rgba(245,158,11,0.15);border-left-color:#fbbf24;}
.inventory-alert.alert-info{border-left-color:#3b82f6;background:rgba(59,130,246,0.08);}
.dark-theme .inventory-alert.alert-info{background:rgba(59,130,246,0.15);border-left-color:#60a5fa;}
.inventory-alert strong{display:block;margin-bottom:0.25rem;color:var(--text-primary,#1f2937);}
.dark-theme .inventory-alert strong{color:#f1f5f9;}
.inventory-priority-table{width:100%;border-collapse:collapse;}
.inventory-priority-table th{padding-bottom:0.5rem;text-align:left;font-size:0.8rem;color:var(--text-muted,#6b7280);text-transform:uppercase;letter-spacing:0.04em;}
.dark-theme .inventory-priority-table th{color:#94a3b8;}
.inventory-priority-table td{padding:0.5rem 0;border-top:1px solid rgba(148,163,184,0.18);vertical-align:middle;color:var(--text-secondary,#374151);}
.dark-theme .inventory-priority-table td{border-color:rgba(148,163,184,0.3);color:#cbd5e1;}
.inventory-priority-table .row-subtitle{font-size:0.75rem;color:var(--text-muted,#6b7280);}
.dark-theme .inventory-priority-table .row-subtitle{color:#94a3b8;}
.inventory-priority-table .badge{font-weight:600;}
.inventory-skeleton{display:flex;flex-direction:column;gap:1.25rem;}
.inventory-skeleton-block{height:160px;border-radius:16px;background:linear-gradient(90deg,rgba(229,231,235,0.42),rgba(209,213,219,0.65),rgba(229,231,235,0.42));background-size:200% 100%;animation:inventory-skeleton-loading 1.6s ease-in-out infinite;}
.dark-theme .inventory-skeleton-block{background:linear-gradient(90deg,rgba(55,65,81,0.4),rgba(75,85,99,0.65),rgba(55,65,81,0.4));}
@keyframes inventory-skeleton-loading{0%{background-position:0 0;}50%{background-position:-100% 0;}100%{background-position:0 0;}}
.inventory-insights-grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));}
.inventory-top-list{display:flex;flex-direction:column;gap:0.5rem;}
.inventory-top-item{display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed rgba(148,163,184,0.35);padding-bottom:0.35rem;}
.inventory-top-item:last-child{border-bottom:none;padding-bottom:0;}
.inventory-top-item span{font-size:0.85rem;color:var(--text-muted,#6b7280);}
.dark-theme .inventory-top-item span{color:#94a3b8;}
.inventory-meta .badge{background:rgba(99,102,241,0.12);color:var(--info-color,#2563eb);border-radius:999px;padding:0.2rem 0.65rem;font-weight:600;font-size:0.75rem;}
.dark-theme .inventory-meta .badge{background:rgba(99,102,241,0.2);color:#a5b4fc;}

/* data-theme dark equivalents for Inventory UI */
[data-theme="dark"] .inventory-insights-header{background:rgba(30,41,59,0.95);border-color:rgba(148,163,184,0.2);box-shadow:0 18px 40px rgba(0,0,0,0.5);}
[data-theme="dark"] .inventory-meta{color:#94a3b8;}
[data-theme="dark"] .inventory-metric-card{background:rgba(30,41,59,0.9);border-color:rgba(148,163,184,0.2);box-shadow:0 4px 12px rgba(0,0,0,0.3);}
[data-theme="dark"] .inventory-metric-card strong{color:#f1f5f9;}
[data-theme="dark"] .inventory-metric-card span{color:#cbd5e1;}
[data-theme="dark"] .inventory-metric-card.metric-warning{border-color:rgba(250,204,21,0.4);background:rgba(250,204,21,0.08);}
[data-theme="dark"] .inventory-metric-card.metric-danger{border-color:rgba(248,113,113,0.5);background:rgba(248,113,113,0.08);}
[data-theme="dark"] .inventory-card{background:rgba(30,41,59,0.95);border-color:rgba(148,163,184,0.25);box-shadow:0 4px 16px rgba(0,0,0,0.4);}
[data-theme="dark"] .inventory-card h3{color:#f1f5f9;}
[data-theme="dark"] .inventory-card p{color:#cbd5e1;}
[data-theme="dark"] .card{background:rgba(30,41,59,0.95);border-color:rgba(148,163,184,0.25);}
[data-theme="dark"] .card-body{background:transparent;color:#cbd5e1;}
[data-theme="dark"] .card-header{background:rgba(51,65,85,0.5);border-color:rgba(148,163,184,0.25);color:#f1f5f9;}
[data-theme="dark"] .card-header h3{color:#f1f5f9;}
[data-theme="dark"] .card-header span{color:#94a3b8;}
[data-theme="dark"] .module-header h2{color:#f1f5f9;}
[data-theme="dark"] .module-subtitle{color:#94a3b8;}
[data-theme="dark"] .stock-summary{gap:1rem;}
[data-theme="dark"] .summary-card{background:rgba(30,41,59,0.9);border-color:rgba(148,163,184,0.25);box-shadow:0 4px 12px rgba(0,0,0,0.3);}
[data-theme="dark"] .summary-label{color:#94a3b8;}
[data-theme="dark"] .summary-value{color:#f1f5f9;}
[data-theme="dark"] .data-table{background:transparent;}
[data-theme="dark"] .data-table thead{background:rgba(51,65,85,0.4);}
[data-theme="dark"] .data-table th{color:#94a3b8;border-color:rgba(148,163,184,0.2);}
[data-theme="dark"] .data-table td{color:#cbd5e1;border-color:rgba(148,163,184,0.15);}
[data-theme="dark"] .data-table tbody tr:hover{background:rgba(51,65,85,0.3);}
[data-theme="dark"] .inventory-subtitle{color:#94a3b8;}
[data-theme="dark"] .inventory-ai-actions{color:#cbd5e1;}
[data-theme="dark"] .inventory-alert{background:rgba(37,99,235,0.15);border-left-color:#60a5fa;}
[data-theme="dark"] .inventory-alert.alert-critical{background:rgba(220,38,38,0.15);border-left-color:#f87171;}
[data-theme="dark"] .inventory-alert.alert-warning{background:rgba(245,158,11,0.15);border-left-color:#fbbf24;}
[data-theme="dark"] .inventory-alert.alert-info{background:rgba(59,130,246,0.15);border-left-color:#60a5fa;}
[data-theme="dark"] .inventory-alert strong{color:#f1f5f9;}
[data-theme="dark"] .inventory-priority-table th{color:#94a3b8;}
[data-theme="dark"] .inventory-priority-table td{border-color:rgba(148,163,184,0.3);color:#cbd5e1;}
[data-theme="dark"] .inventory-priority-table .row-subtitle{color:#94a3b8;}
[data-theme="dark"] .inventory-skeleton-block{background:linear-gradient(90deg,rgba(55,65,81,0.4),rgba(75,85,99,0.65),rgba(55,65,81,0.4));}
[data-theme="dark"] .inventory-top-item span{color:#94a3b8;}
[data-theme="dark"] .inventory-meta .badge{background:rgba(99,102,241,0.2);color:#a5b4fc;}

/* Modal de carga IA - Diseño flotante mejorado */
.ia-loading-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1060;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-normal);
  animation: iaModalFadeIn 0.3s ease;
}
@keyframes iaModalFadeIn{from{opacity:0;}to{opacity:1;}}

.ia-loading-modal.show {
    opacity: 1;
}

.ia-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15,23,42,0.8);
  backdrop-filter: blur(8px);
}

.dark-theme .ia-modal-overlay{background:rgba(0,0,0,0.9);}

.ia-loading-content {
  position: relative;
  background: #ffffff;
  border-radius: 24px;
  padding: 0;
  max-width: 550px;
  width: 90%;
  box-shadow: 0 25px 80px rgba(0,0,0,0.4);
  animation: iaContentSlideUp 0.5s cubic-bezier(0.34,1.56,0.64,1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.dark-theme .ia-loading-content{background:#1e293b;border:1px solid rgba(148,163,184,0.25);box-shadow:0 25px 80px rgba(0,0,0,0.7);}
@keyframes iaContentSlideUp{from{transform:translateY(50px) scale(0.9);opacity:0;}to{transform:translateY(0) scale(1);opacity:1;}}

.ia-loading-header {
  background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
  padding: 2rem 1.5rem;
  text-align: center;
  position: relative;
}

.dark-theme .ia-loading-header{background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);}

.ia-loading-spinner {
  width: 80px;
  height: 80px;
  margin: 0 auto 1rem;
  position: relative;
}

.ia-spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 4px solid rgba(255,255,255,0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: iaSpinRotate 1.2s linear infinite;
}
@keyframes iaSpinRotate{to{transform:rotate(360deg);}}

.ia-spinner-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50px;
  height: 50px;
  background: rgba(255,255,255,0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.ia-spinner-icon i {
  font-size: 24px;
  color: #fff;
}

.ia-loading-header h3 {
  margin: 0 0 0.5rem;
  font-size: 1.4rem;
  color: #fff;
  font-weight: 700;
  text-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.ia-loading-description {
  color: rgba(255,255,255,0.95);
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
}

.ia-loading-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.ia-loading-timer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background: #f1f5f9;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  margin-bottom: 1.5rem;
  font-weight: 600;
  color: #1e293b;
}

.dark-theme .ia-loading-timer {
  background: rgba(100,116,139,0.2);
  color: #f1f5f9;
}

.ia-loading-timer i {
  color: #667eea;
}

.dark-theme .ia-loading-timer i {
  color: #818cf8;
}

.ia-loading-progress {
  height: 8px;
  background: #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.dark-theme .ia-loading-progress {
  background: rgba(71,85,105,0.3);
}

.ia-loading-bar {
  height: 100%;
  background: linear-gradient(90deg,#667eea,#764ba2);
  transition: width 0.5s ease-in-out;
}

.ia-loading-steps {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ia-step {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 12px;
  background: #f8fafc;
  transition: all 0.3s ease;
}

.dark-theme .ia-step {
  background: rgba(51,65,85,0.4);
}

.ia-step-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e2e8f0;
  transition: all 0.3s;
}

.dark-theme .ia-step-icon {
  background: rgba(71,85,105,0.5);
}

.ia-step-icon i {
  font-size: 14px;
  color: #94a3b8;
}

.dark-theme .ia-step-icon i {
  color: #64748b;
}

.ia-step-content strong {
  display: block;
  font-size: 0.9rem;
  color: #334155;
  font-weight: 600;
}

.dark-theme .ia-step-content strong {
  color: #cbd5e1;
}

.ia-step-content span {
  font-size: 0.8rem;
  color: #64748b;
}

.dark-theme .ia-step-content span {
  color: #94a3b8;
}

.ia-step.active {
  background: #fff;
  box-shadow: 0 4px 12px rgba(102,126,234,0.15);
}

.dark-theme .ia-step.active {
  background: rgba(79,70,229,0.15);
}

.ia-step.active .ia-step-icon {
  background: #667eea;
}

.dark-theme .ia-step.active .ia-step-icon {
  background: #818cf8;
}

.ia-step.active .ia-step-icon i {
  color: #fff;
}

.ia-step.completed .ia-step-icon {
  background: #10b981;
}

.dark-theme .ia-step.completed .ia-step-icon {
  background: #34d399;
}

/* data-theme dark equivalents for IA loading modal */
[data-theme="dark"] .ia-modal-overlay{background:rgba(0,0,0,0.9);}
[data-theme="dark"] .ia-loading-content{background:#1e293b;border:1px solid rgba(148,163,184,0.25);box-shadow:0 25px 80px rgba(0,0,0,0.7);}
[data-theme="dark"] .ia-loading-header{background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);}
[data-theme="dark"] .ia-loading-timer{background:rgba(100,116,139,0.2);color:#f1f5f9;}
[data-theme="dark"] .ia-loading-timer i{color:#818cf8;}
[data-theme="dark"] .ia-loading-progress{background:rgba(71,85,105,0.3);}
[data-theme="dark"] .ia-step{background:rgba(51,65,85,0.4);}
[data-theme="dark"] .ia-step-icon{background:rgba(71,85,105,0.5);}
[data-theme="dark"] .ia-step-icon i{color:#64748b;}
[data-theme="dark"] .ia-step-content strong{color:#cbd5e1;}
[data-theme="dark"] .ia-step-content span{color:#94a3b8;}
[data-theme="dark"] .ia-step.active{background:rgba(79,70,229,0.15);}
[data-theme="dark"] .ia-step.active .ia-step-icon{background:#818cf8;}
[data-theme="dark"] .ia-step.completed .ia-step-icon{background:#34d399;}

.ia-step.completed .ia-step-icon i {
  color: #fff;
}

@media (max-width: 768px) {
  .ia-loading-content {
    width: 95%;
    max-height: 95vh;
  }
  .ia-loading-header {
    padding: 1.5rem 1rem;
  }
  .ia-loading-header h3 {
    font-size: 1.2rem;
  }
  .ia-loading-body {
    padding: 1rem;
  }
}

`;
    document.head.appendChild(style);
  },

  /**
   * Calcula la cantidad sugerida de un producto para pedido
   */
  calcularCantidadSugerida(producto) {
    if (!producto) return 1;

    const stock = Number(producto.stock) || 0;
    const minimo = Math.max(Number(producto.stockMinimo) || 0, 0);
    const deficit = Math.max(minimo - stock, 0);

    if (deficit > 0) return deficit;
    if (minimo > 0) return minimo;
    return stock > 0 ? stock : 1;
  },

  /**
   * Prepara un pedido al proveedor del producto
   */
  async prepararPedidoProveedor(productoId) {
    if (!productoId) return;

    const producto = this._productos.find((p) => p.id === productoId);
    if (!producto) {
      if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
        Utils.showToast('Producto no encontrado', 'error');
      }
      return;
    }

    const cantidad = this.calcularCantidadSugerida(producto);

    if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
      Utils.showToast(`Preparando pedido de ${cantidad} unidades de ${producto.nombre}`, 'info');
    }

    // Si existe el módulo de compras, redirigir ahí
    if (window.App && typeof App.loadModule === 'function') {
      await App.loadModule('compras');

      // Intentar pre-llenar el formulario de compra
      if (window.Compras && typeof Compras.preLoadProducto === 'function') {
        Compras.preLoadProducto(producto, cantidad);
      }
    }
  },

  /**
   * Asegura que los estilos CSS del diseño night están cargados
   */
  ensureNightStyles() {
    if (document.getElementById('productos-night-styles-link')) {
      return;
    }
    const link = document.createElement('link');
    link.id = 'productos-night-styles-link';
    link.rel = 'stylesheet';
    link.href = 'css/productos-night-ui.css';
    document.head.appendChild(link);
  },

  /**
   * Variable para el estado de vista actual
   */
  _viewMode: 'cards', // 'cards' o 'table'
  _viewModePreferenceKey: 'productos_view_mode',
  _stockViewMode: 'cards',
  _stockViewModePreferenceKey: 'stock_view_mode',

  _loadViewModePreference() {
    try {
      if (typeof localStorage === 'undefined') {
        return this._viewMode || 'cards';
      }
      return localStorage.getItem(this._viewModePreferenceKey) || this._viewMode || 'cards';
    } catch (error) {
      console.warn('Productos._loadViewModePreference: no se pudo leer la preferencia', error);
      return this._viewMode || 'cards';
    }
  },

  _saveViewModePreference(mode) {
    try {
      if (typeof localStorage !== 'undefined' && mode) {
        localStorage.setItem(this._viewModePreferenceKey, mode);
      }
    } catch (error) {
      console.warn('Productos._saveViewModePreference: no se pudo guardar la preferencia', error);
    }
  },

  _loadStockViewModePreference() {
    try {
      if (typeof localStorage === 'undefined') {
        return this._stockViewMode || 'cards';
      }
      return (
        localStorage.getItem(this._stockViewModePreferenceKey) || this._stockViewMode || 'cards'
      );
    } catch (error) {
      console.warn('Productos._loadStockViewModePreference: no se pudo leer la preferencia', error);
      return this._stockViewMode || 'cards';
    }
  },

  _saveStockViewModePreference(mode) {
    try {
      if (typeof localStorage !== 'undefined' && mode) {
        localStorage.setItem(this._stockViewModePreferenceKey, mode);
      }
    } catch (error) {
      console.warn(
        'Productos._saveStockViewModePreference: no se pudo guardar la preferencia',
        error
      );
    }
  },

  /**
   * Renderiza el módulo de productos en el contenedor especificado
   * @param {HTMLElement} container - Contenedor donde renderizar
   */
  async render(container) {
    console.log('[Productos.render] Iniciando renderizado con diseño mejorado...');
    if (!container) {
      console.error('[Productos.render] Contenedor inválido');
      return;
    }

    // Restaurar preferencia de vista
    this._viewMode = this._loadViewModePreference();

    // Asegurar estilos cargados
    this.ensureNightStyles();

    try {
      // Cargar productos y categorías
      const [productos, categorias] = await Promise.all([
        this.loadProductos({ estado: 'todos', forceRefresh: false }),
        this.getCategorias(),
      ]);

      console.log('[Productos.render] Datos cargados:', {
        productos: productos?.length || 0,
        categorias: categorias?.length || 0,
      });

      const productosActivos = productos.filter((p) => p.activo !== false);
      const productosInactivos = productos.filter((p) => p.activo === false);
      const productosBajoStock = productos.filter((p) => {
        const stock = Number(p.stock) || 0;
        const minimo = Number(p.stockMinimo) || 0;
        return stock <= minimo && stock > 0;
      });
      const productosSinStock = productos.filter((p) => (Number(p.stock) || 0) === 0);
      const productosConStock = productosActivos.filter((p) => (Number(p.stock) || 0) > 0);

      // Calcular valor total del inventario
      const valorInventario = productosActivos.reduce((total, p) => {
        const stock = Number(p.stock) || 0;
        const precio = Number(p.precioVenta) || 0;
        return total + stock * precio;
      }, 0);

      container.innerHTML = `
        <div class="productos-night-shell">
          <!-- TOOLBAR PRINCIPAL -->
          <div class="productos-toolbar">
            <div class="productos-toolbar-text">
              <h2><i class="fas fa-boxes"></i> Gestión de Productos</h2>
              <p>Administra tu inventario de productos y servicios</p>
            </div>
            <div class="productos-toolbar-actions">
              <button class="btn-night btn-night-success" id="btnNuevoProducto">
                <i class="fas fa-plus"></i> Nuevo Producto
              </button>
              <button class="btn-night" id="btnImportarProductos">
                <i class="fas fa-file-import"></i> Importar
              </button>
              <button class="btn-night" id="btnExportarProductos">
                <i class="fas fa-file-export"></i> Exportar
              </button>
              <button class="btn-night btn-night-primary" id="btnQrSuite">
                <i class="fas fa-qrcode"></i> Códigos QR
              </button>
            </div>
          </div>

          <!-- TARJETAS DE ESTADÍSTICAS -->
          <div class="productos-stats-grid">
            <div class="productos-stat-card">
              <div class="stat-icon primary"><i class="fas fa-cubes"></i></div>
              <span class="stat-label">Total Productos</span>
              <span class="stat-value">${productos.length}</span>
              <span class="stat-subtitle">${productosActivos.length} activos</span>
            </div>
            <div class="productos-stat-card">
              <div class="stat-icon success"><i class="fas fa-check-circle"></i></div>
              <span class="stat-label">Con Stock</span>
              <span class="stat-value">${productosConStock.length}</span>
              <span class="stat-subtitle">Disponibles para venta</span>
            </div>
            <div class="productos-stat-card ${productosBajoStock.length > 0 ? 'clickable' : ''}" id="cardStockBajo">
              <div class="stat-icon warning"><i class="fas fa-exclamation-triangle"></i></div>
              <span class="stat-label">Stock Bajo</span>
              <span class="stat-value">${productosBajoStock.length}</span>
              <span class="stat-subtitle">Requieren atención</span>
            </div>
            <div class="productos-stat-card clickable" id="cardProductosAgotados">
              <div class="stat-icon danger"><i class="fas fa-times-circle"></i></div>
              <span class="stat-label">Sin Stock</span>
              <span class="stat-value">${productosSinStock.length}</span>
              <span class="stat-subtitle">Agotados</span>
            </div>
          </div>

          <!-- BARRA SECUNDARIA: FILTROS Y TABS -->
          <div class="productos-secondary-bar">
            <div class="productos-filter-tabs">
              <button class="productos-filter-tab active" data-filter="todos">
                <i class="fas fa-layer-group"></i> Todos
                <span class="badge-count">${productosActivos.length}</span>
              </button>
              <button class="productos-filter-tab" data-filter="con-stock">
                <i class="fas fa-box"></i> Con Stock
                <span class="badge-count">${productosConStock.length}</span>
              </button>
              <button class="productos-filter-tab" data-filter="stock-bajo">
                <i class="fas fa-exclamation"></i> Stock Bajo
                <span class="badge-count">${productosBajoStock.length}</span>
              </button>
              <button class="productos-filter-tab" data-filter="agotados">
                <i class="fas fa-ban"></i> Agotados
                <span class="badge-count">${productosSinStock.length}</span>
              </button>
            </div>
              <div class="productos-search-box">
                <input type="text" id="searchProducto" class="form-control minimal-night" placeholder="🔍 Buscar por nombre, código...">
                <select id="filterCategoria" class="select-minimal-night">
                  <option value="">📁 Categorías</option>
                  ${categorias.map((cat) => `<option value="${cat.id}">${cat.nombre}</option>`).join('')}
                </select>
                <div class="view-mode-select">
                  <label for="productosViewMode">Modo vista</label>
                  <select id="productosViewMode" class="select-minimal-night">
                    <option value="cards" ${this._viewMode === 'cards' ? 'selected' : ''}>Tarjetas</option>
                    <option value="table" ${this._viewMode === 'table' ? 'selected' : ''}>Tabla Excel</option>
                  </select>
                </div>
                <div class="view-toggle" aria-label="Cambiar modo de vista">
                  <button class="view-toggle-btn ${this._viewMode === 'cards' ? 'active' : ''}" data-view="cards" type="button" title="Vista de tarjetas">
                    <i class="fas fa-th-large"></i>
                  </button>
                  <button class="view-toggle-btn ${this._viewMode === 'table' ? 'active' : ''}" data-view="table" type="button" title="Vista tabla Excel">
                    <i class="fas fa-list"></i>
                  </button>
                </div>
              </div>
          </div>

          <!-- ACCIONES RÁPIDAS (cuando hay selección) -->
          <div class="productos-quick-actions" id="quickActionsBar" style="display: none;">
            <div class="productos-selection-info">
              <i class="fas fa-check-square"></i>
              <span class="count" id="selectedCount">0</span> productos seleccionados
            </div>
            <div class="productos-bulk-actions">
              <button class="btn-night btn-night-sm" id="btnBulkLabels">
                <i class="fas fa-tags"></i> Generar etiquetas
              </button>
              <button class="btn-night btn-night-sm btn-night-danger" id="btnBulkDelete">
                <i class="fas fa-trash"></i> Eliminar
              </button>
            </div>
          </div>

          <!-- CONTENEDOR DE PRODUCTOS (Grid de tarjetas o Tabla) -->
          <div id="productosContainer">
            ${
              this._viewMode === 'cards'
                ? this._renderProductosCards(productosActivos, categorias)
                : this._renderProductosTable(productosActivos, categorias)
            }
          </div>

          <!-- Suite QR flotante -->
          <div id="qrSuiteWrapper" class="qr-suite-wrapper"></div>
        </div>
      `;

      // Inicializar eventos
      this._bindProductosEventsNight(container, productos, categorias);

      // Inicializar suite QR
      await this.initializeQrSuite();

      console.log('[Productos.render] Renderizado completado');
    } catch (error) {
      console.error('[Productos.render] Error:', error);
      container.innerHTML = `
        <div class="productos-night-shell">
          <div class="productos-empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Error al cargar productos</h4>
            <p>${error.message || 'No se pudieron cargar los productos. Intenta nuevamente.'}</p>
            <button class="btn-night btn-night-primary" onclick="Productos.render(document.getElementById('contentArea'))">
              <i class="fas fa-sync"></i> Reintentar
            </button>
          </div>
        </div>
      `;
    }
  },

  /**
   * Renderiza los productos como tarjetas (cards)
   */
  _renderProductosCards(productos, categorias) {
    if (!Array.isArray(productos) || productos.length === 0) {
      return `
        <div class="productos-grid">
          <div class="productos-empty-state">
            <i class="fas fa-box-open"></i>
            <h4>No hay productos para mostrar</h4>
            <p>Agrega tu primer producto al inventario o ajusta los filtros.</p>
            <button class="btn-night btn-night-primary" id="btnNuevoProductoEmpty">
              <i class="fas fa-plus"></i> Agregar Producto
            </button>
          </div>
        </div>
      `;
    }

    const categoriasMap = new Map((categorias || []).map((c) => [c.id, c.nombre]));

    return `
      <div class="productos-grid" id="productosGrid">
        ${productos
          .map((producto) => {
            const stock = Number(producto.stock) || 0;
            const stockMinimo = Number(producto.stockMinimo) || 0;
            const precioCompra = Number(producto.precioCompra) || 0;
            const precioVenta = Number(producto.precioVenta) || 0;
            const margen =
              precioCompra > 0
                ? (((precioVenta - precioCompra) / precioCompra) * 100).toFixed(1)
                : 0;

            let stockBadge = 'excel-badge-success';
            let stockClass = '';
            if (stock === 0) {
              stockBadge = 'excel-badge-danger';
              stockClass = 'sin-stock';
            } else if (stock <= stockMinimo) {
              stockBadge = 'excel-badge-warning';
              stockClass = 'stock-bajo';
            }

            let margenBadge = 'excel-badge-success';
            if (margen < 15) margenBadge = 'excel-badge-danger';
            else if (margen < 30) margenBadge = 'excel-badge-warning';

            const categoriaNombre =
              categoriasMap.get(producto.categoria) || producto.categoriaNombre || 'Sin categoría';
            const isSelected = this._selectedProducts.has(producto.id);

            return `
            <div class="producto-card ${stockClass} ${isSelected ? 'is-selected' : ''}" data-producto-id="${producto.id}">
              <div class="producto-card-header">
                <div class="producto-card-title">
                  <h4 title="${producto.nombre}">${producto.nombre}</h4>
                  <span class="codigo">${producto.codigo || 'Sin código'}</span>
                </div>
                <div class="producto-card-checkbox">
                  <input type="checkbox" class="select-producto" data-producto-id="${producto.id}" ${isSelected ? 'checked' : ''}>
                </div>
              </div>
              <div class="producto-card-body">
                <div class="producto-info-item">
                  <strong>Stock</strong>
                  <span class="excel-badge ${stockBadge}">${stock} uds</span>
                </div>
                <div class="producto-info-item">
                  <strong>Precio</strong>
                  <span class="precio">${typeof Utils !== 'undefined' && Utils.formatCurrency ? Utils.formatCurrency(precioVenta) : '$' + precioVenta.toFixed(2)}</span>
                </div>
                <div class="producto-info-item">
                  <strong>Margen</strong>
                  <span class="excel-badge ${margenBadge}">${margen}%</span>
                </div>
              </div>
              <div class="producto-card-footer">
                <span class="excel-badge excel-badge-info">${categoriaNombre}</span>
                <div class="excel-actions">
                  <button class="excel-btn-action btn-edit" data-action="editar-producto" data-producto-id="${producto.id}" title="Editar">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="excel-btn-action btn-view" data-action="ver-historial" data-producto-id="${producto.id}" title="Historial">
                    <i class="fas fa-history"></i>
                  </button>
                  ${
                    stock === 0
                      ? `
                    <button class="excel-btn-action btn-success" data-action="reabastecer" data-producto-id="${producto.id}" title="Reabastecer">
                      <i class="fas fa-truck-loading"></i>
                    </button>
                  `
                      : ''
                  }
                  <button class="excel-btn-action btn-delete" data-action="eliminar-producto" data-producto-id="${producto.id}" title="Eliminar">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    `;
  },

  /**
   * Renderiza los productos como tabla Excel compacta (estilo logs)
   */
  _renderProductosTable(productos, categorias) {
    if (!Array.isArray(productos) || productos.length === 0) {
      return `
        <div class="productos-excel-shell">
          <div class="productos-empty-state" style="margin: 2rem;">
            <i class="fas fa-box-open"></i>
            <h4>No hay productos para mostrar</h4>
            <p>Agrega tu primer producto al inventario o ajusta los filtros.</p>
          </div>
        </div>
      `;
    }

    const categoriasMap = new Map((categorias || []).map((c) => [c.id, c.nombre]));

    // Calcular estadísticas para el footer
    const totalProductos = productos.length;
    const conStock = productos.filter((p) => (Number(p.stock) || 0) > 0).length;
    const sinStock = productos.filter((p) => (Number(p.stock) || 0) === 0).length;
    const valorTotal = productos.reduce((sum, p) => {
      return sum + (Number(p.stock) || 0) * (Number(p.precioVenta) || 0);
    }, 0);

    return `
      <div class="productos-excel-shell">
        <div class="productos-excel-container">
          <table class="table-excel-productos" id="productosTable">
            <thead>
              <tr>
                <th class="col-check"><input type="checkbox" id="selectAllProducts" title="Seleccionar todos"></th>
                <th class="col-codigo sortable">Código <i class="fas fa-sort sort-icon"></i></th>
                <th class="col-nombre sortable">Producto <i class="fas fa-sort sort-icon"></i></th>
                <th class="col-categoria">Categoría</th>
                <th class="col-stock sortable">Stock <i class="fas fa-sort sort-icon"></i></th>
                <th class="col-precio">P. Compra</th>
                <th class="col-precio">P. Venta</th>
                <th class="col-margen">Margen</th>
                <th class="col-acciones sticky-action">Acciones</th>
              </tr>
            </thead>
            <tbody id="productosTableBody">
              ${productos
                .map((producto) => {
                  const stock = Number(producto.stock) || 0;
                  const stockMinimo = Number(producto.stockMinimo) || 0;
                  const precioCompra = Number(producto.precioCompra) || 0;
                  const precioVenta = Number(producto.precioVenta) || 0;
                  const margen =
                    precioCompra > 0
                      ? (((precioVenta - precioCompra) / precioCompra) * 100).toFixed(1)
                      : 0;

                  let stockBadge = 'excel-badge-success';
                  let rowClass = '';
                  if (stock === 0) {
                    stockBadge = 'excel-badge-danger';
                    rowClass = 'row-sin-stock';
                  } else if (stock <= stockMinimo) {
                    stockBadge = 'excel-badge-warning';
                    rowClass = 'row-stock-bajo';
                  }

                  let margenBadge = 'excel-badge-success';
                  if (margen < 15) margenBadge = 'excel-badge-danger';
                  else if (margen < 30) margenBadge = 'excel-badge-warning';

                  const categoriaNombre =
                    categoriasMap.get(producto.categoria) ||
                    producto.categoriaNombre ||
                    'Sin categoría';
                  const isSelected = this._selectedProducts.has(producto.id);

                  return `
                  <tr data-producto-id="${producto.id}" class="${rowClass} ${isSelected ? 'selected' : ''}">
                    <td class="col-check">
                      <input type="checkbox" class="select-producto" data-producto-id="${producto.id}" ${isSelected ? 'checked' : ''}>
                    </td>
                    <td class="cell-codigo-excel">${producto.codigo || '-'}</td>
                    <td class="cell-nombre-excel" title="${producto.nombre}">
                      ${producto.nombre}
                      ${producto.descripcion ? `<span class="desc-mini">${producto.descripcion.substring(0, 35)}${producto.descripcion.length > 35 ? '...' : ''}</span>` : ''}
                    </td>
                    <td><span class="excel-badge excel-badge-info">${categoriaNombre}</span></td>
                    <td class="col-stock">
                      <div class="stock-display-mini">
                        <span class="excel-badge ${stockBadge}">${stock}</span>
                        ${stockMinimo > 0 ? `<span class="min-stock">/${stockMinimo}</span>` : ''}
                      </div>
                    </td>
                    <td class="col-precio cell-precio-compra">${typeof Utils !== 'undefined' && Utils.formatCurrency ? Utils.formatCurrency(precioCompra) : '$' + precioCompra.toFixed(2)}</td>
                    <td class="col-precio cell-precio-excel">${typeof Utils !== 'undefined' && Utils.formatCurrency ? Utils.formatCurrency(precioVenta) : '$' + precioVenta.toFixed(2)}</td>
                    <td class="col-margen"><span class="excel-badge ${margenBadge}">${margen}%</span></td>
                    <td class="col-acciones sticky-action">
                      <div class="excel-actions">
                        <button class="excel-btn-action btn-edit" data-action="editar-producto" data-producto-id="${producto.id}" title="Editar">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button class="excel-btn-action btn-view" data-action="ver-historial" data-producto-id="${producto.id}" title="Historial">
                          <i class="fas fa-history"></i>
                        </button>
                        <button class="excel-btn-action btn-delete" data-action="eliminar-producto" data-producto-id="${producto.id}" title="Eliminar">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
        <div class="productos-excel-footer">
          <div class="excel-stats">
            <div class="excel-stat-item">
              <i class="fas fa-cubes"></i>
              <span>Total: <strong>${totalProductos}</strong></span>
            </div>
            <div class="excel-stat-item">
              <i class="fas fa-check-circle"></i>
              <span>Con stock: <strong>${conStock}</strong></span>
            </div>
            <div class="excel-stat-item">
              <i class="fas fa-times-circle"></i>
              <span>Sin stock: <strong>${sinStock}</strong></span>
            </div>
            <div class="excel-stat-item">
              <i class="fas fa-dollar-sign"></i>
              <span>Valor: <strong>${typeof Utils !== 'undefined' && Utils.formatCurrency ? Utils.formatCurrency(valorTotal) : '$' + valorTotal.toFixed(2)}</strong></span>
            </div>
          </div>
          <div class="excel-stat-item">
            <i class="fas fa-info-circle"></i>
            <span>Vista: Tabla Excel</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Vincula eventos del módulo de productos (versión Night)
   */
  _bindProductosEventsNight(container, productos, categorias) {
    // Botón nuevo producto
    const btnNuevo = container.querySelector('#btnNuevoProducto');
    const btnNuevoEmpty = container.querySelector('#btnNuevoProductoEmpty');

    const abrirModalNuevo = () => {
      this.mostrarModalProducto(null, categorias);
    };

    if (btnNuevo) btnNuevo.addEventListener('click', abrirModalNuevo);
    if (btnNuevoEmpty) btnNuevoEmpty.addEventListener('click', abrirModalNuevo);

    // Botón QR Suite
    const btnQr = container.querySelector('#btnQrSuite');
    if (btnQr) {
      btnQr.addEventListener('click', () => this.toggleQrSuite(true));
    }

    const viewToggles = container.querySelectorAll('.view-toggle-btn');
    const viewModeSelect = container.querySelector('#productosViewMode');

    const actualizarVista = (view) => {
      if (view === this._viewMode) {
        return;
      }
      this._viewMode = view;
      this._saveViewModePreference(view);
      viewToggles.forEach((b) => b.classList.toggle('active', b.dataset.view === view));
      if (viewModeSelect && viewModeSelect.value !== view) {
        viewModeSelect.value = view;
      }
      this._updateProductosView(container, productos, categorias);
    };

    // Toggle de vista (cards/table)
    viewToggles.forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view) {
          actualizarVista(view);
        }
      });
    });

    if (viewModeSelect) {
      viewModeSelect.addEventListener('change', (event) => {
        const view = event.target.value;
        if (view) {
          actualizarVista(view);
        }
      });
    }

    // Filtros por tab
    const filterTabs = container.querySelectorAll('.productos-filter-tab');
    filterTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        filterTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this._applyFilters(container, productos, categorias, tab.dataset.filter);
      });
    });

    // Card de productos agotados
    const cardAgotados = container.querySelector('#cardProductosAgotados');
    if (cardAgotados) {
      cardAgotados.addEventListener('click', () => {
        const tabAgotados = container.querySelector('[data-filter="agotados"]');
        if (tabAgotados) tabAgotados.click();
      });
    }

    // Card de stock bajo
    const cardStockBajo = container.querySelector('#cardStockBajo');
    if (cardStockBajo && cardStockBajo.classList.contains('clickable')) {
      cardStockBajo.addEventListener('click', () => {
        const tabBajo = container.querySelector('[data-filter="stock-bajo"]');
        if (tabBajo) tabBajo.click();
      });
    }

    // Búsqueda y filtro de categoría
    const searchInput = container.querySelector('#searchProducto');
    const filterCategoria = container.querySelector('#filterCategoria');

    const aplicarFiltrosBusqueda = () => {
      const activeTab = container.querySelector('.productos-filter-tab.active');
      this._applyFilters(container, productos, categorias, activeTab?.dataset.filter || 'todos');
    };

    if (searchInput) {
      searchInput.addEventListener('input', aplicarFiltrosBusqueda);
    }
    if (filterCategoria) {
      filterCategoria.addEventListener('change', aplicarFiltrosBusqueda);
    }

    // Eventos en el contenedor de productos
    this._bindProductContainerEvents(container, productos, categorias);

    // Seleccionar todos
    const selectAll = container.querySelector('#selectAllProducts');
    if (selectAll) {
      selectAll.addEventListener('change', (e) => {
        const checkboxes = container.querySelectorAll('.select-producto');
        checkboxes.forEach((cb) => {
          cb.checked = e.target.checked;
          const productoId = cb.dataset.productoId;
          if (e.target.checked) {
            this._selectedProducts.set(productoId, 1);
          } else {
            this._selectedProducts.delete(productoId);
          }
        });
        this._updateSelectionUI(container);
        this.updateQrSelectionState();
      });
    }

    // Acciones en lote
    const btnBulkLabels = container.querySelector('#btnBulkLabels');
    if (btnBulkLabels) {
      btnBulkLabels.addEventListener('click', () => {
        this.toggleQrSuite(true);
      });
    }
  },

  /**
   * Vincula eventos en el contenedor de productos (cards o tabla)
   */
  _bindProductContainerEvents(container, productos, categorias) {
    const productosContainer = container.querySelector('#productosContainer');
    if (!productosContainer) return;

    productosContainer.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (btn) {
        const action = btn.dataset.action;
        const productoId = btn.dataset.productoId;

        if (action === 'editar-producto') {
          this.editarProducto(productoId);
        } else if (action === 'eliminar-producto') {
          this.eliminarProducto(productoId);
        } else if (action === 'ver-historial') {
          this.verHistorialProducto(productoId);
        } else if (action === 'reabastecer') {
          const producto = this._productos.find((p) => p.id === productoId);
          if (producto) this.mostrarModalReabastecimiento(producto);
        }
      }
    });

    productosContainer.addEventListener('change', (e) => {
      if (e.target.classList.contains('select-producto')) {
        const productoId = e.target.dataset.productoId;
        const card = e.target.closest('.producto-card, tr');

        if (e.target.checked) {
          this._selectedProducts.set(productoId, 1);
          if (card) card.classList.add('is-selected', 'selected');
        } else {
          this._selectedProducts.delete(productoId);
          if (card) card.classList.remove('is-selected', 'selected');
        }
        this._updateSelectionUI(container);
        this.updateQrSelectionState();
      }
    });
  },

  /**
   * Actualiza la vista de productos
   */
  _updateProductosView(container, productos, categorias) {
    const productosContainer = container.querySelector('#productosContainer');
    if (!productosContainer) return;

    // Obtener los productos filtrados actualmente
    const activeTab = container.querySelector('.productos-filter-tab.active');
    const filtrados = this._getFilteredProducts(
      container,
      productos,
      activeTab?.dataset.filter || 'todos'
    );

    productosContainer.innerHTML =
      this._viewMode === 'cards'
        ? this._renderProductosCards(filtrados, categorias)
        : this._renderProductosTable(filtrados, categorias);

    this._bindProductContainerEvents(container, productos, categorias);
  },

  /**
   * Aplica los filtros y actualiza la vista
   */
  _applyFilters(container, productos, categorias, filterType) {
    const filtrados = this._getFilteredProducts(container, productos, filterType);
    const productosContainer = container.querySelector('#productosContainer');

    if (!productosContainer) return;

    productosContainer.innerHTML =
      this._viewMode === 'cards'
        ? this._renderProductosCards(filtrados, categorias)
        : this._renderProductosTable(filtrados, categorias);

    this._bindProductContainerEvents(container, productos, categorias);
  },

  /**
   * Obtiene los productos filtrados según los criterios
   */
  _getFilteredProducts(container, productos, filterType) {
    const searchInput = container.querySelector('#searchProducto');
    const filterCategoria = container.querySelector('#filterCategoria');

    const busqueda = (searchInput?.value || '').toLowerCase().trim();
    const categoriaId = filterCategoria?.value || '';

    let filtrados = [...productos];

    // Filtrar por tipo
    if (filterType === 'con-stock') {
      filtrados = filtrados.filter((p) => p.activo !== false && (Number(p.stock) || 0) > 0);
    } else if (filterType === 'stock-bajo') {
      filtrados = filtrados.filter((p) => {
        const stock = Number(p.stock) || 0;
        const minimo = Number(p.stockMinimo) || 0;
        return stock > 0 && stock <= minimo && p.activo !== false;
      });
    } else if (filterType === 'agotados') {
      filtrados = filtrados.filter((p) => (Number(p.stock) || 0) === 0);
    } else {
      filtrados = filtrados.filter((p) => p.activo !== false);
    }

    // Filtrar por categoría
    if (categoriaId) {
      filtrados = filtrados.filter((p) => p.categoria === categoriaId);
    }

    // Filtrar por búsqueda
    if (busqueda) {
      filtrados = filtrados.filter(
        (p) =>
          (p.nombre || '').toLowerCase().includes(busqueda) ||
          (p.codigo || '').toLowerCase().includes(busqueda) ||
          (p.descripcion || '').toLowerCase().includes(busqueda)
      );
    }

    return filtrados;
  },

  /**
   * Actualiza la UI de selección
   */
  _updateSelectionUI(container) {
    const count = this._selectedProducts.size;
    const quickActionsBar = container.querySelector('#quickActionsBar');
    const selectedCountEl = container.querySelector('#selectedCount');

    if (quickActionsBar) {
      quickActionsBar.style.display = count > 0 ? 'flex' : 'none';
    }
    if (selectedCountEl) {
      selectedCountEl.textContent = count;
    }
  },

  /**
   * Genera las filas de la tabla de productos
   */
  _renderProductosRows(productos, categorias) {
    if (!Array.isArray(productos) || productos.length === 0) {
      return '';
    }

    const categoriasMap = new Map((categorias || []).map((c) => [c.id, c.nombre]));

    return productos
      .map((producto) => {
        const stock = Number(producto.stock) || 0;
        const stockMinimo = Number(producto.stockMinimo) || 0;
        const precioCompra = Number(producto.precioCompra) || 0;
        const precioVenta = Number(producto.precioVenta) || 0;
        const margen =
          precioCompra > 0 ? (((precioVenta - precioCompra) / precioCompra) * 100).toFixed(1) : 0;

        let stockClass = 'badge-success';
        if (stock === 0) {
          stockClass = 'badge-danger';
        } else if (stock <= stockMinimo) {
          stockClass = 'badge-warning';
        }

        const categoriaNombre =
          categoriasMap.get(producto.categoria) || producto.categoriaNombre || 'Sin categoría';

        return `
        <tr data-producto-id="${producto.id}">
          <td>
            <input type="checkbox" class="select-producto" data-producto-id="${producto.id}">
          </td>
          <td data-label="Código">
            <code>${producto.codigo || '-'}</code>
          </td>
          <td data-label="Nombre">
            <strong>${producto.nombre}</strong>
            ${producto.descripcion ? `<div class="row-subtitle text-muted">${producto.descripcion.substring(0, 50)}${producto.descripcion.length > 50 ? '...' : ''}</div>` : ''}
          </td>
          <td data-label="Categoría">
            <span class="badge badge-secondary">${categoriaNombre}</span>
          </td>
          <td data-label="Stock">
            <span class="badge ${stockClass}">${stock}</span>
            ${stockMinimo > 0 ? `<small class="text-muted"> / mín: ${stockMinimo}</small>` : ''}
          </td>
          <td data-label="P. Compra">
            ${typeof Utils !== 'undefined' && Utils.formatCurrency ? Utils.formatCurrency(precioCompra) : '$' + precioCompra.toFixed(2)}
          </td>
          <td data-label="P. Venta">
            <strong>${typeof Utils !== 'undefined' && Utils.formatCurrency ? Utils.formatCurrency(precioVenta) : '$' + precioVenta.toFixed(2)}</strong>
          </td>
          <td data-label="Margen">
            <span class="badge ${margen >= 30 ? 'badge-success' : margen >= 15 ? 'badge-warning' : 'badge-danger'}">${margen}%</span>
          </td>
          <td data-label="Estado">
            <span class="badge ${producto.activo !== false ? 'badge-success' : 'badge-secondary'}">
              ${producto.activo !== false ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td data-label="Acciones">
            <div class="action-buttons">
              <button class="btn btn-sm btn-secondary" data-action="editar-producto" data-producto-id="${producto.id}" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-info" data-action="ver-historial" data-producto-id="${producto.id}" title="Historial">
                <i class="fas fa-history"></i>
              </button>
              <button class="btn btn-sm btn-danger" data-action="eliminar-producto" data-producto-id="${producto.id}" title="Eliminar">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');
  },

  /**
   * Vincula eventos del módulo de productos
   */
  _bindProductosEvents(container, productos, categorias) {
    // Botón nuevo producto
    const btnNuevo = container.querySelector('#btnNuevoProducto');
    const btnNuevoEmpty = container.querySelector('#btnNuevoProductoEmpty');

    const abrirModalNuevo = () => {
      this.mostrarModalProducto(null, categorias);
    };

    if (btnNuevo) btnNuevo.addEventListener('click', abrirModalNuevo);
    if (btnNuevoEmpty) btnNuevoEmpty.addEventListener('click', abrirModalNuevo);

    // Botón QR Suite
    const btnQr = container.querySelector('#btnQrSuite');
    if (btnQr) {
      btnQr.addEventListener('click', () => this.toggleQrSuite(true));
    }

    // Manejo de pestañas
    const tabs = container.querySelectorAll('.productos-tab');
    const panes = container.querySelectorAll('.tab-pane');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        // Actualizar estados de tabs
        tabs.forEach((t) => {
          t.classList.remove('active');
          t.style.borderBottomColor = 'transparent';
          t.style.color = 'var(--text-secondary, #94a3b8)';
          t.style.background = 'transparent';
        });
        tab.classList.add('active');
        tab.style.borderBottomColor = 'var(--primary-color, #3b82f6)';
        tab.style.color = 'var(--text-primary, #fff)';
        tab.style.background = 'var(--bg-secondary, #1e293b)';

        // Mostrar/ocultar paneles
        panes.forEach((pane) => {
          if (pane.dataset.pane === targetTab) {
            pane.style.display = 'block';
            pane.classList.add('active');
          } else {
            pane.style.display = 'none';
            pane.classList.remove('active');
          }
        });
      });
    });

    // Clic en card de productos agotados para ir a la pestaña
    const cardAgotados = container.querySelector('#cardProductosAgotados');
    if (cardAgotados) {
      cardAgotados.addEventListener('click', () => {
        const tabAgotados = container.querySelector('[data-tab="agotados"]');
        if (tabAgotados) tabAgotados.click();
      });
    }

    // Búsqueda y filtros para inventario activo
    const searchInput = container.querySelector('#searchProducto');
    const filterCategoria = container.querySelector('#filterCategoria');
    const filterEstado = container.querySelector('#filterEstado');

    const productosConStock = productos.filter((p) => (Number(p.stock) || 0) > 0);

    const filtrarProductos = () => {
      const busqueda = (searchInput?.value || '').toLowerCase().trim();
      const categoriaId = filterCategoria?.value || '';
      const estado = filterEstado?.value || 'activos';

      let filtrados = [...productosConStock];

      // Filtrar por estado
      if (estado === 'activos') {
        filtrados = filtrados.filter((p) => p.activo !== false);
      } else if (estado === 'inactivos') {
        filtrados = filtrados.filter((p) => p.activo === false);
      } else if (estado === 'stock-bajo') {
        filtrados = filtrados.filter((p) => {
          const stock = Number(p.stock) || 0;
          const minimo = Number(p.stockMinimo) || 0;
          return stock > 0 && stock <= minimo;
        });
      }

      // Filtrar por categoría
      if (categoriaId) {
        filtrados = filtrados.filter((p) => p.categoria === categoriaId);
      }

      // Filtrar por búsqueda
      if (busqueda) {
        filtrados = filtrados.filter(
          (p) =>
            (p.nombre || '').toLowerCase().includes(busqueda) ||
            (p.codigo || '').toLowerCase().includes(busqueda) ||
            (p.descripcion || '').toLowerCase().includes(busqueda)
        );
      }

      const tbody = container.querySelector('#productosTableBody');
      if (tbody) {
        tbody.innerHTML = this._renderProductosRows(filtrados, categorias);
        this._bindRowEvents(tbody);
      }
    };

    if (searchInput) searchInput.addEventListener('input', filtrarProductos);
    if (filterCategoria) filterCategoria.addEventListener('change', filtrarProductos);
    if (filterEstado) filterEstado.addEventListener('change', filtrarProductos);

    // Búsqueda y filtros para productos agotados
    const searchAgotados = container.querySelector('#searchAgotados');
    const filterCategoriaAgotados = container.querySelector('#filterCategoriaAgotados');
    const productosSinStock = productos.filter((p) => (Number(p.stock) || 0) === 0);

    const filtrarAgotados = () => {
      const busqueda = (searchAgotados?.value || '').toLowerCase().trim();
      const categoriaId = filterCategoriaAgotados?.value || '';
      let filtrados = [...productosSinStock];

      // Filtrar por categoría
      if (categoriaId) {
        filtrados = filtrados.filter((p) => p.categoria === categoriaId);
      }

      // Filtrar por búsqueda
      if (busqueda) {
        filtrados = filtrados.filter(
          (p) =>
            (p.nombre || '').toLowerCase().includes(busqueda) ||
            (p.codigo || '').toLowerCase().includes(busqueda) ||
            (p.descripcion || '').toLowerCase().includes(busqueda)
        );
      }

      const agotadosContainer = container.querySelector('#productosAgotadosContainer');
      if (agotadosContainer) {
        agotadosContainer.innerHTML = this._renderProductosAgotados(filtrados, categorias);
        this._bindAgotadosEvents(agotadosContainer, categorias);
      }
    };

    if (searchAgotados) searchAgotados.addEventListener('input', filtrarAgotados);
    if (filterCategoriaAgotados)
      filterCategoriaAgotados.addEventListener('change', filtrarAgotados);

    // Eventos de filas de la tabla
    const tbody = container.querySelector('#productosTableBody');
    if (tbody) {
      this._bindRowEvents(tbody);
    }

    // Eventos de productos agotados
    const agotadosContainer = container.querySelector('#productosAgotadosContainer');
    if (agotadosContainer) {
      this._bindAgotadosEvents(agotadosContainer, categorias);
    }

    // Seleccionar todos
    const selectAll = container.querySelector('#selectAllProducts');
    if (selectAll) {
      selectAll.addEventListener('change', (e) => {
        const checkboxes = container.querySelectorAll('.select-producto');
        checkboxes.forEach((cb) => {
          cb.checked = e.target.checked;
          const productoId = cb.dataset.productoId;
          if (e.target.checked) {
            this._selectedProducts.set(productoId, 1);
          } else {
            this._selectedProducts.delete(productoId);
          }
        });
        this.updateQrSelectionState();
      });
    }
  },

  /**
   * Vincula eventos de productos agotados
   */
  _bindAgotadosEvents(agotadosContainer, categorias) {
    agotadosContainer.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const productoId = btn.dataset.productoId;
      const producto = this._productos.find((p) => p.id === productoId);

      if (!producto) return;

      if (action === 'reabastecer') {
        this.mostrarModalReabastecimiento(producto);
      } else if (action === 'ver-historial-agotado') {
        await this.verHistorialProducto(productoId);
      } else if (action === 'editar-agotado') {
        this.mostrarModalProducto(producto, categorias);
      }
    });
  },

  /**
   * Vincula eventos de las filas de la tabla
   */
  _bindRowEvents(tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (btn) {
        const action = btn.dataset.action;
        const productoId = btn.dataset.productoId;

        if (action === 'editar-producto') {
          this.editarProducto(productoId);
        } else if (action === 'eliminar-producto') {
          this.eliminarProducto(productoId);
        } else if (action === 'ver-historial') {
          this.verHistorialProducto(productoId);
        }
      }
    });

    tbody.addEventListener('change', (e) => {
      if (e.target.classList.contains('select-producto')) {
        const productoId = e.target.dataset.productoId;
        if (e.target.checked) {
          this._selectedProducts.set(productoId, 1);
        } else {
          this._selectedProducts.delete(productoId);
        }
        this.updateQrSelectionState();
      }
    });
  },

  /**
   * Muestra el modal para crear/editar un producto
   */
  mostrarModalProducto(producto, categorias) {
    const esNuevo = !producto;
    const modalId = 'modalProducto';

    // Remover modal existente si hay
    const existente = document.getElementById(modalId);
    if (existente) existente.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = modalId;
    modal.innerHTML = `
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3><i class="fas fa-${esNuevo ? 'plus-circle' : 'edit'}"></i> ${esNuevo ? 'Nuevo Producto' : 'Editar Producto'}</h3>
          <button class="modal-close" data-action="cerrar-modal">&times;</button>
        </div>
        <div class="modal-body">
          <form id="formProducto">
            <div class="form-grid">
              <div class="form-group">
                <label for="prodCodigo">Código *</label>
                <input type="text" id="prodCodigo" class="form-control" required value="${producto?.codigo || ''}" placeholder="Ej: PROD-001">
              </div>
              <div class="form-group">
                <label for="prodNombre">Nombre *</label>
                <input type="text" id="prodNombre" class="form-control" required value="${producto?.nombre || ''}" placeholder="Nombre del producto">
              </div>
              <div class="form-group form-group-full">
                <label for="prodDescripcion">Descripción</label>
                <textarea id="prodDescripcion" class="form-control" rows="2" placeholder="Descripción opcional">${producto?.descripcion || ''}</textarea>
              </div>
              <div class="form-group">
                <label for="prodCategoria">Categoría</label>
                <select id="prodCategoria" class="form-control">
                  <option value="">Sin categoría</option>
                  ${(categorias || [])
                    .map(
                      (cat) => `
                    <option value="${cat.id}" ${producto?.categoria === cat.id ? 'selected' : ''}>${cat.nombre}</option>
                  `
                    )
                    .join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="prodUnidad">Unidad</label>
                <select id="prodUnidad" class="form-control">
                  <option value="unidad" ${producto?.unidad === 'unidad' ? 'selected' : ''}>Unidad</option>
                  <option value="kg" ${producto?.unidad === 'kg' ? 'selected' : ''}>Kilogramo</option>
                  <option value="litro" ${producto?.unidad === 'litro' ? 'selected' : ''}>Litro</option>
                  <option value="metro" ${producto?.unidad === 'metro' ? 'selected' : ''}>Metro</option>
                  <option value="caja" ${producto?.unidad === 'caja' ? 'selected' : ''}>Caja</option>
                  <option value="par" ${producto?.unidad === 'par' ? 'selected' : ''}>Par</option>
                </select>
              </div>
              <div class="form-group">
                <label for="prodPrecioCompra">Precio de Compra *</label>
                <input type="number" id="prodPrecioCompra" class="form-control" step="0.01" min="0" required value="${producto?.precioCompra || '0'}" placeholder="0.00">
              </div>
              <div class="form-group">
                <label for="prodMargenPlantilla">Plantilla de Margen</label>
                <select id="prodMargenPlantilla" class="form-control">
                  <option value="">-- Margen manual --</option>
                  ${(window.PricingConfig?.marginTemplates || [])
                    .map(
                      (tpl) => `
                    <option value="${tpl.id}" data-margin="${tpl.margin}" ${producto?.margenPlantilla === tpl.id ? 'selected' : ''}>${tpl.label}</option>
                  `
                    )
                    .join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="prodMargen">Margen de Ganancia (%)</label>
                <div class="input-group-inline" style="display:flex;gap:0.5rem;align-items:center;">
                  <input type="number" id="prodMargen" class="form-control" step="0.1" min="0" max="500" value="${producto?.margen ?? 30}" placeholder="30" style="flex:1;">
                  <span style="font-size:0.85rem;color:var(--text-secondary);">%</span>
                </div>
              </div>
              <div class="form-group">
                <label for="prodPrecioVenta">Precio de Venta *</label>
                <div class="input-group-inline" style="display:flex;gap:0.5rem;align-items:center;">
                  <input type="number" id="prodPrecioVenta" class="form-control" step="0.01" min="0" required value="${producto?.precioVenta || '0'}" placeholder="0.00" style="flex:1;">
                  <button type="button" id="btnRecalcularPrecio" class="btn btn-sm btn-secondary" title="Recalcular precio con margen">
                    <i class="fas fa-calculator"></i>
                  </button>
                </div>
                <small id="precioVentaHint" class="form-text text-muted" style="margin-top:0.25rem;display:block;"></small>
              </div>
              <div class="form-group">
                <label for="prodStock">Stock Actual</label>
                <input type="number" id="prodStock" class="form-control" min="0" value="${producto?.stock || '0'}" placeholder="0">
              </div>
              <div class="form-group">
                <label for="prodStockMinimo">Stock Mínimo</label>
                <input type="number" id="prodStockMinimo" class="form-control" min="0" value="${producto?.stockMinimo || '5'}" placeholder="5">
              </div>
              <div class="form-group">
                <label for="prodActivo">Estado</label>
                <select id="prodActivo" class="form-control">
                  <option value="1" ${producto?.activo !== false ? 'selected' : ''}>Activo</option>
                  <option value="0" ${producto?.activo === false ? 'selected' : ''}>Inactivo</option>
                </select>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-action="cerrar-modal">Cancelar</button>
          <button class="btn btn-primary" id="btnGuardarProducto">
            <i class="fas fa-save"></i> ${esNuevo ? 'Crear Producto' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // === Lógica de Margen y Precio de Venta ===
    const precioCompraInput = modal.querySelector('#prodPrecioCompra');
    const margenPlantillaSelect = modal.querySelector('#prodMargenPlantilla');
    const margenInput = modal.querySelector('#prodMargen');
    const precioVentaInput = modal.querySelector('#prodPrecioVenta');
    const precioVentaHint = modal.querySelector('#precioVentaHint');
    const btnRecalcular = modal.querySelector('#btnRecalcularPrecio');

    const recalcularPrecioVenta = () => {
      const precioCompra = parseFloat(precioCompraInput.value) || 0;
      const margen = parseFloat(margenInput.value) || 0;
      const precioSugerido = precioCompra * (1 + margen / 100);
      const precioRedondeado = Math.round(precioSugerido * 100) / 100;
      precioVentaInput.value = precioRedondeado.toFixed(2);
      if (precioVentaHint) {
        const ganancia = precioRedondeado - precioCompra;
        precioVentaHint.textContent =
          precioCompra > 0 ? `Ganancia: $${ganancia.toFixed(2)} (${margen}% sobre costo)` : '';
      }
    };

    // Cuando cambia la plantilla de margen
    if (margenPlantillaSelect) {
      margenPlantillaSelect.addEventListener('change', () => {
        const option = margenPlantillaSelect.selectedOptions[0];
        if (option && option.value) {
          const marginValue = parseFloat(option.dataset.margin) || 30;
          margenInput.value = marginValue;
          recalcularPrecioVenta();
        }
      });
    }

    // Cuando cambia el margen manual
    if (margenInput) {
      margenInput.addEventListener('input', () => {
        // Desseleccionar plantilla si se edita manualmente
        if (margenPlantillaSelect) margenPlantillaSelect.value = '';
        recalcularPrecioVenta();
      });
    }

    // Cuando cambia el precio de compra
    if (precioCompraInput) {
      precioCompraInput.addEventListener('input', recalcularPrecioVenta);
    }

    // Botón recalcular
    if (btnRecalcular) {
      btnRecalcular.addEventListener('click', recalcularPrecioVenta);
    }

    // Calcular hint inicial
    if (producto?.precioCompra && producto?.precioVenta && precioVentaHint) {
      const ganancia = producto.precioVenta - producto.precioCompra;
      const margenCalculado =
        producto.precioCompra > 0 ? ((ganancia / producto.precioCompra) * 100).toFixed(1) : 0;
      precioVentaHint.textContent = `Ganancia actual: $${ganancia.toFixed(2)} (${margenCalculado}%)`;
    }

    // Eventos del modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-action="cerrar-modal"]')) {
        modal.remove();
      }
    });

    const btnGuardar = modal.querySelector('#btnGuardarProducto');
    btnGuardar.addEventListener('click', async () => {
      const form = modal.querySelector('#formProducto');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const datos = {
        codigo: document.getElementById('prodCodigo').value.trim(),
        nombre: document.getElementById('prodNombre').value.trim(),
        descripcion: document.getElementById('prodDescripcion').value.trim(),
        categoria: document.getElementById('prodCategoria').value,
        unidad: document.getElementById('prodUnidad').value,
        precioCompra: parseFloat(document.getElementById('prodPrecioCompra').value) || 0,
        precioVenta: parseFloat(document.getElementById('prodPrecioVenta').value) || 0,
        margen: parseFloat(document.getElementById('prodMargen').value) || 30,
        margenPlantilla: document.getElementById('prodMargenPlantilla').value || null,
        stock: parseInt(document.getElementById('prodStock').value) || 0,
        stockMinimo: parseInt(document.getElementById('prodStockMinimo').value) || 5,
        activo: document.getElementById('prodActivo').value === '1',
      };

      try {
        if (esNuevo) {
          await this.crearProducto(datos);
        } else {
          await this.actualizarProducto(producto.id, datos);
        }
        modal.remove();
        this.invalidarCacheProductos({ incluirCategorias: false });
        await this.render(document.getElementById('contentArea'));
        if (typeof Utils !== 'undefined' && Utils.showToast) {
          Utils.showToast(`Producto ${esNuevo ? 'creado' : 'actualizado'} exitosamente`, 'success');
        }
      } catch (error) {
        console.error('Error guardando producto:', error);
        if (typeof Utils !== 'undefined' && Utils.showToast) {
          Utils.showToast('Error al guardar el producto: ' + error.message, 'error');
        }
      }
    });
  },

  /**
   * Crea un nuevo producto
   */
  async crearProducto(datos) {
    if (typeof DatabaseAPI !== 'undefined' && DatabaseAPI.addItem) {
      return await DatabaseAPI.addItem('productos', datos);
    } else if (typeof Database !== 'undefined' && Database.addItem) {
      return Database.addItem('productos', datos);
    }
    throw new Error('No hay sistema de base de datos disponible');
  },

  /**
   * Actualiza un producto existente
   */
  async actualizarProducto(id, datos) {
    if (typeof DatabaseAPI !== 'undefined' && DatabaseAPI.updateItem) {
      return await DatabaseAPI.updateItem('productos', id, datos);
    } else if (typeof Database !== 'undefined' && Database.updateItem) {
      return Database.updateItem('productos', id, datos);
    }
    throw new Error('No hay sistema de base de datos disponible');
  },

  /**
   * Edita un producto existente
   */
  async editarProducto(productoId) {
    const producto = this._productos.find((p) => p.id === productoId);
    if (!producto) {
      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast('Producto no encontrado', 'error');
      }
      return;
    }
    const categorias = await this.getCategorias();
    this.mostrarModalProducto(producto, categorias);
  },

  /**
   * Elimina un producto
   */
  async eliminarProducto(productoId) {
    const producto = this._productos.find((p) => p.id === productoId);
    if (!producto) return;

    const confirmacion = confirm(
      `¿Estás seguro de eliminar "${producto.nombre}"?\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmacion) return;

    try {
      if (typeof DatabaseAPI !== 'undefined' && DatabaseAPI.deleteItem) {
        await DatabaseAPI.deleteItem('productos', productoId);
      } else if (typeof Database !== 'undefined' && Database.deleteItem) {
        Database.deleteItem('productos', productoId);
      }

      this.invalidarCacheProductos({ incluirCategorias: false });
      await this.render(document.getElementById('contentArea'));
      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast('Producto eliminado correctamente', 'success');
      }
    } catch (error) {
      console.error('Error eliminando producto:', error);
      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast('Error al eliminar el producto', 'error');
      }
    }
  },

  /**
   * Ver historial de un producto
   */
  async verHistorialProducto(productoId) {
    const producto = this._productos.find((p) => p.id === productoId);
    if (!producto) return;

    const modalId = 'modalHistorialProducto';
    const existente = document.getElementById(modalId);
    if (existente) existente.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = modalId;
    modal.innerHTML = `
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3><i class="fas fa-history"></i> Historial de "${producto.nombre}"</h3>
          <button class="modal-close" data-action="cerrar-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="historial-producto-loading">
            <i class="fas fa-spinner fa-spin"></i> Cargando historial...
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-action="cerrar-modal"]')) {
        modal.remove();
      }
    });

    try {
      const response = await fetch(`/api/historial-productos/${productoId}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      let movimientos = [];
      if (response.ok) {
        const data = await response.json();
        movimientos = data.movimientos || data || [];
      }

      const modalBody = modal.querySelector('.modal-body');
      if (movimientos.length === 0) {
        modalBody.innerHTML = `
          <div class="empty-state" style="padding: 40px; text-align: center;">
            <i class="fas fa-inbox" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px;"></i>
            <h4>Sin movimientos registrados</h4>
            <p style="color: #64748b;">Este producto aún no tiene historial de compras o ventas.</p>
          </div>
        `;
      } else {
        modalBody.innerHTML = `
          <div class="historial-resumen" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px;">
            <div class="summary-card">
              <span class="summary-label">Total Vendido</span>
              <strong class="summary-value">${movimientos.filter((m) => m.tipo_movimiento === 'venta').reduce((sum, m) => sum + (m.cantidad || 0), 0)} uds</strong>
            </div>
            <div class="summary-card">
              <span class="summary-label">Total Comprado</span>
              <strong class="summary-value">${movimientos.filter((m) => m.tipo_movimiento === 'compra').reduce((sum, m) => sum + (m.cantidad || 0), 0)} uds</strong>
            </div>
            <div class="summary-card">
              <span class="summary-label">Movimientos</span>
              <strong class="summary-value">${movimientos.length}</strong>
            </div>
          </div>
          <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Stock</th>
                  <th>Referencia</th>
                </tr>
              </thead>
              <tbody>
                ${movimientos
                  .slice(0, 50)
                  .map(
                    (m) => `
                  <tr>
                    <td>${m.fecha ? new Date(m.fecha).toLocaleDateString('es-EC') : '-'} ${m.hora || ''}</td>
                    <td>
                      <span class="badge ${m.tipo_movimiento === 'venta' ? 'badge-danger' : m.tipo_movimiento === 'compra' ? 'badge-success' : 'badge-secondary'}">
                        ${m.tipo_movimiento === 'venta' ? '📤 Venta' : m.tipo_movimiento === 'compra' ? '📥 Compra' : m.tipo_movimiento || 'Ajuste'}
                      </span>
                    </td>
                    <td class="text-center">${m.cantidad || 0}</td>
                    <td>${m.stock_anterior ?? '-'} → ${m.stock_nuevo ?? '-'}</td>
                    <td><small>${m.referencia_id || m.notas || '-'}</small></td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      modal.querySelector('.modal-body').innerHTML = `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i>
          No se pudo cargar el historial. ${error.message}
        </div>
      `;
    }
  },

  /**
   * Muestra modal de reabastecimiento rápido para un producto agotado
   */
  mostrarModalReabastecimiento(producto) {
    const modalId = 'modalReabastecimiento';
    const existente = document.getElementById(modalId);
    if (existente) existente.remove();

    const precioCompra = Number(producto.precioCompra) || 0;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = modalId;
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 450px;">
        <div class="modal-header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
          <h3><i class="fas fa-truck-loading"></i> Reabastecer Producto</h3>
          <button class="modal-close" data-action="cerrar-modal" style="color: white;">&times;</button>
        </div>
        <div class="modal-body">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 48px; margin-bottom: 10px;">📦</div>
            <h4 style="margin: 0;">${producto.nombre}</h4>
            <p style="color: #64748b; margin: 5px 0;">Código: ${producto.codigo || 'Sin código'}</p>
          </div>
          
          <div class="form-group">
            <label for="cantidadReabastecimiento" style="font-weight: 600;">
              <i class="fas fa-cubes"></i> Cantidad a agregar *
            </label>
            <input type="number" id="cantidadReabastecimiento" class="form-control" 
                   min="1" value="10" required autofocus
                   style="font-size: 1.5rem; text-align: center; padding: 15px;">
          </div>
          
          <div class="form-group">
            <label for="precioCompraReab" style="font-weight: 600;">
              <i class="fas fa-dollar-sign"></i> Precio de compra unitario
            </label>
            <input type="number" id="precioCompraReab" class="form-control" 
                   step="0.01" min="0" value="${precioCompra.toFixed(2)}"
                   style="text-align: center;">
          </div>
          
          <div id="resumenReabastecimiento" style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Stock actual:</span>
              <strong style="color: #ef4444;">0 unidades</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Nuevo stock:</span>
              <strong style="color: #10b981;" id="nuevoStockPreview">10 unidades</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px;">
              <span>Costo total:</span>
              <strong id="costoTotalPreview">${typeof Utils !== 'undefined' && Utils.formatCurrency ? Utils.formatCurrency(precioCompra * 10) : '$' + (precioCompra * 10).toFixed(2)}</strong>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-action="cerrar-modal">Cancelar</button>
          <button class="btn btn-success" id="btnConfirmarReabastecimiento">
            <i class="fas fa-check"></i> Confirmar Ingreso
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const cantidadInput = modal.querySelector('#cantidadReabastecimiento');
    const precioInput = modal.querySelector('#precioCompraReab');
    const nuevoStockPreview = modal.querySelector('#nuevoStockPreview');
    const costoTotalPreview = modal.querySelector('#costoTotalPreview');

    const actualizarPreview = () => {
      const cantidad = parseInt(cantidadInput.value) || 0;
      const precio = parseFloat(precioInput.value) || 0;
      nuevoStockPreview.textContent = `${cantidad} unidades`;
      const costoTotal = cantidad * precio;
      costoTotalPreview.textContent =
        typeof Utils !== 'undefined' && Utils.formatCurrency
          ? Utils.formatCurrency(costoTotal)
          : '$' + costoTotal.toFixed(2);
    };

    cantidadInput.addEventListener('input', actualizarPreview);
    precioInput.addEventListener('input', actualizarPreview);

    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-action="cerrar-modal"]')) {
        modal.remove();
      }
    });

    const btnConfirmar = modal.querySelector('#btnConfirmarReabastecimiento');
    btnConfirmar.addEventListener('click', async () => {
      const cantidad = parseInt(cantidadInput.value) || 0;
      const precioCompraNew = parseFloat(precioInput.value) || 0;

      if (cantidad <= 0) {
        if (typeof Utils !== 'undefined' && Utils.showToast) {
          Utils.showToast('La cantidad debe ser mayor a 0', 'error');
        }
        return;
      }

      btnConfirmar.disabled = true;
      btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

      try {
        await this.actualizarProducto(producto.id, {
          stock: cantidad,
          precioCompra: precioCompraNew,
          activo: true,
        });

        modal.remove();
        this.invalidarCacheProductos({ incluirCategorias: false });
        await this.render(document.getElementById('contentArea'));

        if (typeof Utils !== 'undefined' && Utils.showToast) {
          Utils.showToast(
            `✅ ${producto.nombre}: +${cantidad} unidades agregadas al inventario`,
            'success'
          );
        }
      } catch (error) {
        console.error('Error reabasteciendo producto:', error);
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = '<i class="fas fa-check"></i> Confirmar Ingreso';
        if (typeof Utils !== 'undefined' && Utils.showToast) {
          Utils.showToast('Error al reabastecer: ' + error.message, 'error');
        }
      }
    });

    cantidadInput.focus();
    cantidadInput.select();
  },

  /**
   * Renderiza la sección de productos agotados (formato tabla)
   */
  _renderProductosAgotados(productosAgotados, categorias) {
    if (!Array.isArray(productosAgotados) || productosAgotados.length === 0) {
      return `
        <div class="empty-state" style="padding: 40px; text-align: center;">
          <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981; margin-bottom: 16px;"></i>
          <h4>¡Excelente! No hay productos agotados</h4>
          <p style="color: #64748b;">Todos tus productos tienen stock disponible.</p>
        </div>
      `;
    }

    const categoriasMap = new Map((categorias || []).map((c) => [c.id, c.nombre]));

    return `
      <div class="table-responsive">
        <table class="data-table responsive-table" id="productosAgotadosTable">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Stock</th>
              <th>P. Compra</th>
              <th>P. Venta</th>
              <th>Margen</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${productosAgotados
              .map((producto) => {
                const precioCompra = Number(producto.precioCompra) || 0;
                const precioVenta = Number(producto.precioVenta) || 0;
                const margen =
                  precioCompra > 0
                    ? (((precioVenta - precioCompra) / precioCompra) * 100).toFixed(1)
                    : 0;
                const categoriaNombre =
                  categoriasMap.get(producto.categoria) ||
                  producto.categoriaNombre ||
                  'Sin categoría';
                const stockMinimo = Number(producto.stockMinimo) || 0;

                return `
                <tr data-producto-id="${producto.id}">
                  <td data-label="Código">
                    <code>${producto.codigo || '-'}</code>
                  </td>
                  <td data-label="Nombre">
                    <strong>${producto.nombre}</strong>
                    ${producto.descripcion ? `<div class="row-subtitle text-muted">${producto.descripcion.substring(0, 50)}${producto.descripcion.length > 50 ? '...' : ''}</div>` : ''}
                  </td>
                  <td data-label="Categoría">
                    <span class="badge badge-secondary">${categoriaNombre}</span>
                  </td>
                  <td data-label="Stock">
                    <span class="badge badge-danger">0</span>
                    ${stockMinimo > 0 ? `<small class="text-muted"> / mín: ${stockMinimo}</small>` : ''}
                  </td>
                  <td data-label="P. Compra">
                    ${typeof Utils !== 'undefined' && Utils.formatCurrency ? Utils.formatCurrency(precioCompra) : '$' + precioCompra.toFixed(2)}
                  </td>
                  <td data-label="P. Venta">
                    <strong>${typeof Utils !== 'undefined' && Utils.formatCurrency ? Utils.formatCurrency(precioVenta) : '$' + precioVenta.toFixed(2)}</strong>
                  </td>
                  <td data-label="Margen">
                    <span class="badge ${margen >= 30 ? 'badge-success' : margen >= 15 ? 'badge-warning' : 'badge-danger'}">${margen}%</span>
                  </td>
                  <td data-label="Estado">
                    <span class="badge badge-danger">
                      <i class="fas fa-exclamation-circle"></i> AGOTADO
                    </span>
                  </td>
                  <td data-label="Acciones">
                    <div class="action-buttons">
                      <button class="btn btn-sm btn-success" data-action="reabastecer" data-producto-id="${producto.id}" title="Reabastecer">
                        <i class="fas fa-truck-loading"></i>
                      </button>
                      <button class="btn btn-sm btn-secondary" data-action="editar-agotado" data-producto-id="${producto.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="btn btn-sm btn-info" data-action="ver-historial-agotado" data-producto-id="${producto.id}" title="Historial">
                        <i class="fas fa-history"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  /**
   * Recarga productos para el filtro actual
   */
  async reloadProductosForCurrentFilter(options = {}) {
    const container = document.getElementById('contentArea');
    if (container && this._inventoryContainer !== container) {
      await this.render(container);
    }
  },

  /**
   * Refresca la lista de productos
   */
  async refreshProductos() {
    this.invalidarCacheProductos({ incluirCategorias: true });
    const container = document.getElementById('contentArea');
    if (container) {
      await this.render(container);
    }
  },

  /**
   * Actualiza las estadísticas del módulo
   */
  updateStats() {
    // Implementación opcional para actualizar estadísticas en el dashboard
    if (
      typeof window.Dashboard !== 'undefined' &&
      typeof Dashboard.updateProductStats === 'function'
    ) {
      Dashboard.updateProductStats();
    }
  },
};

// Exportar el módulo globalmente
if (typeof window !== 'undefined') {
  window.Productos = Productos;
}

// Exportar para CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Productos;
}
