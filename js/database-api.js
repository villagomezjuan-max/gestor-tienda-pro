/* ========================================
   SISTEMA DE BASE DE DATOS API
   Conexión con el backend REST API
   Gestor Tienda Pro v2.0
   ======================================== */

function sanitizeBaseUrl(rawUrl) {
  const fallback = 'http://localhost:3001/api';
  if (!rawUrl || typeof rawUrl !== 'string') {
    return fallback;
  }

  let normalized = rawUrl.trim();
  if (!normalized) {
    return fallback;
  }

  normalized = normalized.replace(/\s+/g, '');

  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `http://${normalized}`;
  }

  try {
    const parsed = new URL(normalized);
    let pathname = parsed.pathname.replace(/\/+$/, '');
    const hasApiSegment = /\/api(\/|$)/i.test(pathname);

    if (!hasApiSegment) {
      pathname = `${pathname ? pathname : ''}/api`;
      pathname = pathname.replace(/\/+/g, '/');
      if (!pathname.startsWith('/')) {
        pathname = `/${pathname}`;
      }
    }

    parsed.pathname = pathname || '/api';
    normalized = parsed.toString().replace(/\/+$/, '');
  } catch (error) {
    if (!/\/api$/i.test(normalized)) {
      normalized = normalized.replace(/\/+$/, '');
      normalized = `${normalized}/api`;
    }
  }

  return normalized || fallback;
}

function detectApiBaseUrl() {
  const fallback = 'http://localhost:3001/api';

  if (typeof window === 'undefined') {
    return fallback;
  }

  const candidates = [];

  if (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL.trim()) {
    candidates.push(window.API_BASE_URL);
  }

  if (typeof Utils !== 'undefined') {
    if (typeof Utils.getApiBaseUrl === 'function') {
      candidates.push(Utils.getApiBaseUrl());
    } else if (typeof Utils.apiUrl === 'function') {
      candidates.push(Utils.apiUrl(''));
    }
  }

  try {
    if (!candidates.length && typeof window.localStorage !== 'undefined') {
      const stored = window.localStorage.getItem('api_base_url');
      if (stored && stored.trim()) {
        candidates.push(stored);
      }
    }
  } catch (error) {
    // 🔥 NO SILENCIAR - Mostrar error completo
    console.group('⚠️ ERROR: DatabaseAPI - Leyendo api_base_url');
    console.error('Error completo:', error);
    console.error('Stack trace:', error.stack);
    console.groupEnd();
  }

  const selected = candidates.find((value) => typeof value === 'string' && value.trim());
  if (selected) {
    return sanitizeBaseUrl(selected);
  }

  if (typeof window.location !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const devPorts = new Set(['3000', '4173', '5173', '5500', '5501', '5502', '5503']);
    const needsBackendPortOverride = !port || devPorts.has(port);
    const backendPort = needsBackendPortOverride ? '3001' : port;
    const portSegment = backendPort ? `:${backendPort}` : '';
    return sanitizeBaseUrl(`${protocol}//${hostname}${portSegment}/api`);
  }

  return fallback;
}

const DETECTED_API_BASE_URL = detectApiBaseUrl();

// Conservar referencia a la base de datos legacy basada en localStorage
const LegacyDatabase = (typeof window !== 'undefined' && window.Database) || null;

// Configuración del API
const API_CONFIG = {
  BASE_URL: DETECTED_API_BASE_URL,
  TIMEOUT: 10000,
  FALLBACK_TO_LOCALSTORAGE: true,
};

if (typeof window !== 'undefined') {
  window.API_BASE_URL = API_CONFIG.BASE_URL;
  if (typeof console !== 'undefined' && typeof console.info === 'function') {
    console.info(`DatabaseAPI: BASE_URL detectado ${API_CONFIG.BASE_URL}`);
  }
}

// Sistema de base de datos con API Backend
const DatabaseAPI = {
  cache: new Map(),
  cacheExpiry: new Map(),
  CACHE_DURATION: 30000,
  csrfToken: null,
  csrfTokenFetchedAt: 0,
  csrfPromise: null,
  CSRF_TTL: 15 * 60 * 1000,

  getHeaders(extraHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    let negocioHeader = null;

    try {
      if (typeof Auth !== 'undefined' && typeof Auth.getCurrentBusinessId === 'function') {
        negocioHeader = Auth.getCurrentBusinessId();
      }

      if (!negocioHeader && typeof localStorage !== 'undefined') {
        negocioHeader =
          localStorage.getItem('negocio_actual') || localStorage.getItem('negocio_login') || null;
      }
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('⚠️ ERROR: DatabaseAPI - Determinando negocio actual');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
    }

    if (negocioHeader) {
      headers['X-Negocio-Id'] = negocioHeader;
    }

    if (typeof Auth !== 'undefined' && typeof Auth.getAccessToken === 'function') {
      const token = Auth.getAccessToken();
      if (token && !headers.Authorization) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  },

  async getCsrfToken(forceRefresh = false) {
    const now = Date.now();

    if (!forceRefresh && this.csrfToken && now - this.csrfTokenFetchedAt < this.CSRF_TTL) {
      return this.csrfToken;
    }

    if (forceRefresh) {
      this.csrfToken = null;
      this.csrfTokenFetchedAt = 0;
      this.csrfPromise = null;
    } else if (this.csrfPromise) {
      return this.csrfPromise;
    }

    const fetchToken = (async () => {
      const response = await fetch(`${API_CONFIG.BASE_URL}/csrf-token`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} obteniendo CSRF token`);
      }

      let data = null;
      try {
        data = await response.json();
      } catch (parseError) {
        // 🔥 NO SILENCIAR - Mostrar error completo
        console.group('⚠️ ERROR: DatabaseAPI - Parseando respuesta CSRF');
        console.error('Error completo:', parseError);
        console.error('Stack trace:', parseError.stack);
        console.groupEnd();
      }

      if (!data || !data.csrfToken) {
        throw new Error('Respuesta CSRF inválida');
      }

      this.csrfToken = data.csrfToken;
      this.csrfTokenFetchedAt = Date.now();
      return this.csrfToken;
    })();

    this.csrfPromise = fetchToken;

    try {
      return await fetchToken;
    } finally {
      this.csrfPromise = null;
    }
  },

  resetCsrfToken() {
    this.csrfToken = null;
    this.csrfTokenFetchedAt = 0;
    this.csrfPromise = null;
  },

  async request(endpoint, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;

    const {
      headers: customHeaders = {},
      method: rawMethod = 'GET',
      body: rawBody,
      ...restOptions
    } = options;

    const method = (rawMethod || 'GET').toUpperCase();
    const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const hasCustomCsrfHeader = Object.keys(customHeaders || {}).some(
      (key) => typeof key === 'string' && key.toLowerCase() === 'x-csrf-token'
    );

    let body = rawBody;
    const isFormData = typeof FormData !== 'undefined' && rawBody instanceof FormData;

    if (method === 'GET' || method === 'HEAD') {
      body = undefined;
    } else if (!isFormData && rawBody && typeof rawBody === 'object') {
      body = JSON.stringify(rawBody);
    }

    const buildHeaders = async (forceCsrfRefresh = false) => {
      const headers = this.getHeaders(customHeaders);

      if (needsCsrf && !hasCustomCsrfHeader) {
        try {
          const token = await this.getCsrfToken(forceCsrfRefresh);
          if (token) {
            headers['X-CSRF-Token'] = token;
          }
        } catch (csrfError) {
          // 🔥 NO SILENCIAR - Mostrar error completo
          console.group('⚠️ ERROR: DatabaseAPI - Obteniendo token CSRF');
          console.error('Error completo:', csrfError);
          console.error('Stack trace:', csrfError.stack);
          console.groupEnd();
        }
      }

      return headers;
    };

    const executeRequest = async (forceCsrfRefresh = false) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      try {
        const headers = await buildHeaders(forceCsrfRefresh);
        const fetchOptions = {
          method,
          headers,
          ...restOptions,
          signal: controller.signal,
        };

        if (typeof body !== 'undefined') {
          fetchOptions.body = body;
        }

        if (typeof fetchOptions.credentials === 'undefined') {
          fetchOptions.credentials = 'include';
        }

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    try {
      let response = await executeRequest();

      if (
        response.status === 401 &&
        typeof Auth !== 'undefined' &&
        typeof Auth.refreshAccessToken === 'function'
      ) {
        const refreshed = await Auth.refreshAccessToken();
        if (refreshed) {
          response = await executeRequest();
        } else {
          if (typeof Auth !== 'undefined' && typeof Auth.logout === 'function') {
            Auth.logout();
          }
          throw new Error('Sesión expirada. Inicia sesión nuevamente.');
        }
      } else if (response.status === 401) {
        throw new Error('Sesión no autorizada. Inicia sesión nuevamente.');
      }

      if (response.status === 403 && needsCsrf) {
        let responsePreview = '';
        try {
          responsePreview = await response.clone().text();
        } catch (previewError) {
          responsePreview = '';
        }

        if (responsePreview && responsePreview.toLowerCase().includes('invalid csrf token')) {
          this.resetCsrfToken();
          response = await executeRequest(true);
        }
      }

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch (parseError) {
          errorBody = '';
        }

        let parsedBody = null;
        if (errorBody) {
          try {
            parsedBody = JSON.parse(errorBody);
          } catch (jsonError) {
            parsedBody = null;
          }
        }

        const message =
          parsedBody?.error ||
          parsedBody?.message ||
          errorBody ||
          `HTTP ${response.status}: ${response.statusText}`;

        const error = new Error(message);
        error.status = response.status;
        error.statusText = response.statusText;
        error.body = parsedBody || errorBody;
        error.endpoint = endpoint;
        throw error;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          return await response.json();
        } catch (parseError) {
          console.warn('DatabaseAPI: respuesta JSON inválida', parseError);
          return null;
        }
      }

      return null;
    } catch (error) {
      const status =
        typeof error === 'object' && error !== null && typeof error.status === 'number'
          ? error.status
          : null;
      const isAuthError = status === 401 || status === 403;
      const isNetworkIssue = status === null || status === 0;

      console.error(`Error en petición a ${url}:`, error.message || error);

      if (API_CONFIG.FALLBACK_TO_LOCALSTORAGE && method === 'GET' && isNetworkIssue) {
        return this.fallbackToLocalStorage(endpoint);
      }

      if (isAuthError && typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
        Utils.showToast('No tienes acceso a este negocio o la sesión expiró.', 'error');
      }

      throw error;
    }
  },

  /**
   * Fallback a localStorage cuando el backend no está disponible
   */
  fallbackToLocalStorage(endpoint) {
    console.warn('Usando fallback a localStorage para:', endpoint);

    // Mapeo básico de endpoints a colecciones localStorage
    const endpointMap = {
      '/clientes': 'clientes',
      '/productos': 'productos',
      '/ventas': 'ventas',
      '/vehiculos': 'vehiculos',
      '/compras': 'compras',
      '/proveedores': 'proveedores',
    };

    const collection = endpointMap[endpoint] || endpoint.replace(/^\//, '');

    try {
      let negocioId = null;
      if (typeof Auth !== 'undefined' && typeof Auth.getCurrentBusinessId === 'function') {
        negocioId = Auth.getCurrentBusinessId();
      }
      if (!negocioId) {
        negocioId = localStorage.getItem('negocio_actual');
      }

      const dbKey = negocioId ? `gestorTiendaProDB_${negocioId}` : 'gestorTiendaProDB';
      const data = localStorage.getItem(dbKey);

      const parsed = data ? JSON.parse(data) : {};
      return parsed[collection] || [];
    } catch (error) {
      console.error('Error en fallback localStorage:', error);
      return [];
    }
  },

  /**
   * Obtiene datos de caché si están disponibles y no han expirado
   */
  getFromCache(key) {
    const now = Date.now();
    if (this.cache.has(key) && this.cacheExpiry.get(key) > now) {
      return this.cache.get(key);
    }
    return null;
  },

  /**
   * Guarda datos en caché
   */
  setCache(key, data) {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  },

  /**
   * Limpia el caché
   */
  clearCache(key = null) {
    if (key === null) {
      this.cache.clear();
      this.cacheExpiry.clear();
      return;
    }

    this.cache.delete(key);
    this.cacheExpiry.delete(key);
  },

  /**
   * Normaliza respuestas de colecciones que pueden venir envueltas en objetos
   */
  normalizeCollectionResponse(payload, preferredKey = null) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      if (preferredKey && Array.isArray(payload[preferredKey])) {
        return payload[preferredKey];
      }

      if (Array.isArray(payload.data)) {
        return payload.data;
      }

      if (Array.isArray(payload.items)) {
        return payload.items;
      }

      if (Array.isArray(payload.results)) {
        return payload.results;
      }

      if (Array.isArray(payload.list)) {
        return payload.list;
      }
    }

    return [];
  },

  // ============================================
  // MÉTODOS DE CLIENTES
  // ============================================

  /**
   * Obtiene todos los clientes
   */
  async getClientes(params = {}) {
    const cacheKey = `clientes_${JSON.stringify(params)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = `/clientes${queryString ? `?${queryString}` : ''}`;
      const data = await this.request(endpoint);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error obteniendo clientes:', error);
      return [];
    }
  },

  /**
   * Obtiene un cliente por ID
   */
  async getClienteById(id) {
    const cacheKey = `cliente_${id}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.request(`/clientes/${id}`);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error obteniendo cliente:', error);
      return null;
    }
  },

  /**
   * Busca clientes
   */
  async buscarClientes(query) {
    try {
      return await this.request(`/clientes/buscar?q=${encodeURIComponent(query)}`);
    } catch (error) {
      console.error('Error buscando clientes:', error);
      return [];
    }
  },

  /**
   * Crea un nuevo cliente
   */
  async createCliente(clienteData) {
    try {
      const data = await this.request('/clientes', {
        method: 'POST',
        body: clienteData,
      });
      this.clearCache(); // Limpiar caché después de crear
      return data;
    } catch (error) {
      console.error('Error creando cliente:', error);
      throw error;
    }
  },

  /**
   * Actualiza un cliente existente
   */
  async updateCliente(id, updates) {
    try {
      const data = await this.request(`/clientes/${id}`, {
        method: 'PUT',
        body: updates,
      });
      this.clearCache(); // Limpiar caché después de actualizar
      return data;
    } catch (error) {
      console.error('Error actualizando cliente:', error);
      throw error;
    }
  },

  /**
   * Elimina un cliente
   */
  async deleteCliente(id) {
    try {
      const data = await this.request(`/clientes/${id}`, {
        method: 'DELETE',
      });
      this.clearCache(); // Limpiar caché después de eliminar
      return data;
    } catch (error) {
      console.error('Error eliminando cliente:', error);
      throw error;
    }
  },

  // ============================================
  // MÉTODOS DE PRODUCTOS
  // ============================================

  async getProductos(params = {}) {
    const searchParams = new URLSearchParams();
    const includeInactive = params.includeInactive === true;
    const forceRefresh = params.forceRefresh === true;

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (key === 'forceRefresh' || key === 'includeInactive') {
        return;
      }

      if (key === 'limit') {
        const limitValue = Math.max(1, Number(value));
        searchParams.set('limit', Math.min(limitValue, 500).toString());
        return;
      }

      if (key === 'activo') {
        const normalized = typeof value === 'string' ? value.toLowerCase() : value;
        const isActive =
          normalized === '1' || normalized === 'true' || normalized === 1 || normalized === true;
        searchParams.set('activo', isActive ? '1' : '0');
        return;
      }

      if (key === 'conStock') {
        const shouldFilter =
          value === true ||
          value === 1 ||
          value === '1' ||
          (typeof value === 'string' && value.toLowerCase() === 'true');
        if (shouldFilter) {
          searchParams.set('stock', 'disponibles');
        }
        return;
      }

      searchParams.set(key, value);
    });

    if (!searchParams.has('activo') && !includeInactive) {
      searchParams.set('activo', '1');
    }

    const queryString = searchParams.toString();
    const cacheKey = `productos_${queryString || 'all'}`;

    if (!forceRefresh) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    try {
      const endpoint = `/productos${queryString ? `?${queryString}` : ''}`;
      const data = await this.request(endpoint);
      const result = this.normalizeCollectionResponse(data, 'productos');
      this.setCache(cacheKey, result);
      this.setCache('collection_productos', result);
      return result;
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      return [];
    }
  },

  async buscarProductos(query, limit = 10, options = {}) {
    try {
      let actualLimit = limit;
      let extraOptions = options;

      if (typeof limit === 'object' && limit !== null) {
        extraOptions = limit;
        actualLimit = extraOptions.limit !== undefined ? extraOptions.limit : 10;
      }

      if (typeof actualLimit !== 'number') {
        actualLimit = Number(actualLimit);
      }

      if (!Number.isFinite(actualLimit) || actualLimit <= 0) {
        actualLimit = 10;
      }

      const normalized = (query || '').toString().trim();
      if (!normalized) {
        return await this.getProductos({ limit: actualLimit, ...extraOptions });
      }

      const params = new URLSearchParams({
        q: normalized,
        limit: Math.max(1, Number(actualLimit)).toString(),
      });

      if (extraOptions && typeof extraOptions === 'object' && !Array.isArray(extraOptions)) {
        Object.entries(extraOptions).forEach(([key, value]) => {
          if (key === 'limit') {
            return;
          }
          if (value === undefined || value === null) {
            return;
          }

          if (key === 'conStock') {
            const shouldFilter =
              value === true ||
              value === 1 ||
              value === '1' ||
              (typeof value === 'string' && value.toLowerCase() === 'true');
            if (shouldFilter) {
              params.set('stock', 'disponibles');
            }
            return;
          }

          params.set(key, value);
        });
      }

      return await this.request(`/productos/buscar?${params}`);
    } catch (error) {
      console.error('Error buscando productos:', error);
      return [];
    }
  },

  async createProducto(producto) {
    try {
      const data = await this.request('/productos', {
        method: 'POST',
        body: producto,
      });
      this.clearCache();
      return data;
    } catch (error) {
      console.error('Error creando producto:', error);
      throw error;
    }
  },

  async updateProducto(id, updates) {
    try {
      const data = await this.request(`/productos/${id}`, {
        method: 'PUT',
        body: updates,
      });
      this.clearCache();
      return data;
    } catch (error) {
      console.error('Error actualizando producto:', error);
      throw error;
    }
  },

  async deleteProducto(id) {
    try {
      const data = await this.request(`/productos/${id}`, {
        method: 'DELETE',
      });
      this.clearCache();
      return data;
    } catch (error) {
      console.error('Error eliminando producto:', error);
      throw error;
    }
  },

  // ============================================
  // MÉTODOS DE VEHÍCULOS
  // ============================================

  /**
   * Obtiene todos los vehículos
   */
  async getVehiculos(params = {}) {
    const cacheKey = `vehiculos_${JSON.stringify(params)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = `/vehiculos${queryString ? `?${queryString}` : ''}`;
      const data = await this.request(endpoint);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error obteniendo vehículos:', error);
      return [];
    }
  },

  /**
   * Obtiene un vehículo por ID
   */
  async getVehiculoById(id) {
    const cacheKey = `vehiculo_${id}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.request(`/vehiculos/${id}`);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error obteniendo vehículo:', error);
      return null;
    }
  },

  /**
   * Busca vehículos
   */
  async buscarVehiculos(query) {
    try {
      return await this.request(`/vehiculos/buscar?q=${encodeURIComponent(query)}`);
    } catch (error) {
      console.error('Error buscando vehículos:', error);
      return [];
    }
  },

  /**
   * Crea un nuevo vehículo
   */
  async createVehiculo(vehiculoData) {
    try {
      const data = await this.request('/vehiculos', {
        method: 'POST',
        body: vehiculoData,
      });
      this.clearCache(); // Limpiar caché después de crear
      return data;
    } catch (error) {
      console.error('Error creando vehículo:', error);
      throw error;
    }
  },

  /**
   * Actualiza un vehículo existente
   */
  async updateVehiculo(id, updates) {
    try {
      const data = await this.request(`/vehiculos/${id}`, {
        method: 'PUT',
        body: updates,
      });
      this.clearCache(); // Limpiar caché después de actualizar
      return data;
    } catch (error) {
      console.error('Error actualizando vehículo:', error);
      throw error;
    }
  },

  /**
   * Elimina un vehículo
   */
  async deleteVehiculo(id) {
    try {
      const data = await this.request(`/vehiculos/${id}`, {
        method: 'DELETE',
      });
      this.clearCache(); // Limpiar caché después de eliminar
      return data;
    } catch (error) {
      console.error('Error eliminando vehículo:', error);
      throw error;
    }
  },

  // ============================================
  // MÉTODOS DE TÉCNICOS
  // ============================================

  async getTecnicos() {
    const cacheKey = 'tecnicos_list';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.request('/tecnicos');
      this.setCache(cacheKey, data);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error obteniendo técnicos:', error);
      return [];
    }
  },

  // ============================================
  // MÉTODOS DE ÓRDENES DE TRABAJO
  // ============================================

  async getOrdenesTrabajo(params = {}) {
    const cacheKey = `ordenes_trabajo_${JSON.stringify(params)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = `/ordenes-trabajo${queryString ? `?${queryString}` : ''}`;
      const data = await this.request(endpoint);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error obteniendo órdenes de trabajo:', error);
      return [];
    }
  },

  async getOrdenTrabajoById(id) {
    const cacheKey = `orden_trabajo_${id}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.request(`/ordenes-trabajo/${id}`);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error obteniendo orden de trabajo:', error);
      throw error;
    }
  },

  async createOrdenTrabajo(ordenData) {
    try {
      const data = await this.request('/ordenes-trabajo', {
        method: 'POST',
        body: ordenData,
      });
      this.clearCache();
      return data;
    } catch (error) {
      console.error('Error creando orden de trabajo:', error);
      throw error;
    }
  },

  async updateOrdenTrabajo(id, updates) {
    try {
      const data = await this.request(`/ordenes-trabajo/${id}`, {
        method: 'PUT',
        body: updates,
      });
      this.clearCache();
      return data;
    } catch (error) {
      console.error('Error actualizando orden de trabajo:', error);
      throw error;
    }
  },

  async updateEstadoOrdenTrabajo(id, payload) {
    try {
      const data = await this.request(`/ordenes-trabajo/${id}/estado`, {
        method: 'PUT',
        body: payload,
      });
      this.clearCache();
      return data;
    } catch (error) {
      console.error('Error actualizando estado de la orden de trabajo:', error);
      throw error;
    }
  },

  async deleteOrdenTrabajo(id) {
    try {
      const data = await this.request(`/ordenes-trabajo/${id}`, {
        method: 'DELETE',
      });
      this.clearCache();
      return data;
    } catch (error) {
      console.error('Error eliminando orden de trabajo:', error);
      throw error;
    }
  },

  // ============================================
  // MÉTODOS DE COMPRAS
  // ============================================

  /**
   * Crea una nueva compra
   */
  async createCompra(compraData) {
    try {
      const data = await this.request('/compras', {
        method: 'POST',
        body: compraData,
      });
      this.clearCache(); // Limpiar caché después de crear
      return data;
    } catch (error) {
      console.error('Error creando compra:', error);
      throw error;
    }
  },

  /**
   * Obtiene todas las compras
   */
  async getCompras() {
    const cacheKey = 'compras_list';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.request('/compras');
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error obteniendo compras:', error);
      return [];
    }
  },

  /**
   * Obtiene todas las ventas
   */
  async getVentas() {
    const cacheKey = 'ventas_list';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.request('/ventas');
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error obteniendo ventas:', error);
      return [];
    }
  },

  /**
   * Elimina una compra por ID
   */
  async eliminarCompra(compraId) {
    try {
      const data = await this.request(`/compras/${compraId}`, {
        method: 'DELETE',
      });
      // Invalidar caché
      this.clearCache('compras_list');
      return data;
    } catch (error) {
      console.error('Error eliminando compra:', error);
      throw error;
    }
  },

  // ============================================
  // MÉTODOS DE CONFIGURACIÓN
  // ============================================

  /**
   * Obtiene la configuración
   */
  async getConfiguracion(prefix = null) {
    const cacheKey = `config_${prefix || 'all'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const params = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
      const data = await this.request(`/configuracion${params}`);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      return {};
    }
  },

  /**
   * Actualiza la configuración en lote
   */
  async updateConfiguracion(updates) {
    try {
      const data = await this.request('/configuracion/bulk', {
        method: 'POST',
        body: updates,
      });
      this.clearCache(); // Limpiar caché después de actualizar
      return data;
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      throw error;
    }
  },

  // ============================================
  // MÉTODOS LEGACY (Compatibilidad)
  // ============================================

  /**
   * Compatibilidad: Obtiene una colección específica
   */
  async fetchCollection(collectionName, options = {}) {
    const methodMap = {
      clientes: () => this.getClientes(),
      vehiculos: () => this.getVehiculos(),
      productos: () =>
        this.getProductos({
          limit: options.limit || 500,
          includeInactive: options.includeInactive === true,
          forceRefresh: options.forceRefresh === true,
        }),
      tecnicos: () => this.getTecnicos(),
      ordenes_trabajo: () => this.getOrdenesTrabajo(),
      ventas: () => this.getVentas(),
      compras: () => this.getCompras(),
    };

    if (methodMap[collectionName]) {
      return await methodMap[collectionName]();
    }

    return [];
  },

  /**
   * Compatibilidad: Busca por ID
   */
  async fetchById(collectionName, id) {
    const methodMap = {
      clientes: (id) => this.getClienteById(id),
      vehiculos: (id) => this.getVehiculoById(id),
    };

    if (methodMap[collectionName]) {
      return await methodMap[collectionName](id);
    }

    return null;
  },
};

DatabaseAPI.config = API_CONFIG;
DatabaseAPI.getBaseUrl = () => API_CONFIG.BASE_URL;
DatabaseAPI.setBaseUrl = (newBaseUrl, options = {}) => {
  if (typeof newBaseUrl !== 'string') {
    return API_CONFIG.BASE_URL;
  }

  const normalized = sanitizeBaseUrl(newBaseUrl);
  API_CONFIG.BASE_URL = normalized;

  if (typeof window !== 'undefined') {
    window.API_BASE_URL = normalized;
  }

  if (options.clearCache !== false && typeof DatabaseAPI.clearCache === 'function') {
    DatabaseAPI.clearCache();
  }

  if (options.persist !== false) {
    try {
      if (
        typeof window !== 'undefined' &&
        window.TenantStorage &&
        typeof window.TenantStorage.setItem === 'function'
      ) {
        window.TenantStorage.setItem('api_base_url', normalized);
      } else if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('api_base_url', normalized);
      }
    } catch (error) {
      console.warn('DatabaseAPI: no se pudo persistir api_base_url', error);
    }
  }

  console.info(`DatabaseAPI: BASE_URL actualizado a ${normalized}`);
  return API_CONFIG.BASE_URL;
};

// Mantener acceso público al cliente de API
window.DatabaseAPI = DatabaseAPI;

// ============================================
// PUENTE DE COMPATIBILIDAD (LEGADO + API)
// ============================================

const legacyGetCollection =
  LegacyDatabase && typeof LegacyDatabase.getCollection === 'function'
    ? LegacyDatabase.getCollection.bind(LegacyDatabase)
    : () => [];

const legacySaveCollection =
  LegacyDatabase && typeof LegacyDatabase.saveCollection === 'function'
    ? LegacyDatabase.saveCollection.bind(LegacyDatabase)
    : null;

const legacyGetItem =
  LegacyDatabase && typeof LegacyDatabase.getItem === 'function'
    ? LegacyDatabase.getItem.bind(LegacyDatabase)
    : () => null;

function syncCollectionFromAPI(collectionName, options = {}) {
  const {
    skipCache = false,
    includeInactive = false,
    forceRefresh = false,
    limit = undefined,
  } = options;
  const cacheKey = `collection_${collectionName}`;

  if (!skipCache) {
    const cached = DatabaseAPI.getFromCache(cacheKey);
    if (Array.isArray(cached)) {
      return Promise.resolve(cached);
    }
  }

  const apiOptions = {
    includeInactive,
    forceRefresh,
    limit,
  };

  return DatabaseAPI.fetchCollection(collectionName, apiOptions)
    .then((data) => {
      if (Array.isArray(data)) {
        DatabaseAPI.setCache(cacheKey, data);
        if (legacySaveCollection) {
          legacySaveCollection(collectionName, data);
        }
      }
      return Array.isArray(data) ? data : [];
    })
    .catch((error) => {
      console.warn(
        `DatabaseAPI: no se pudo sincronizar ${collectionName}`,
        error?.message || error
      );
      return [];
    });
}

const DatabaseBridge = {
  ...(LegacyDatabase || {}),
  api: DatabaseAPI,

  /**
   * Obtiene una colección manteniendo compatibilidad síncrona.
   * Lanza una sincronización en segundo plano con el backend.
   */
  getCollection(collectionName, options = {}) {
    const { forceRefresh = false, includeInactive = false, limit } = options || {};
    const cacheKey = `collection_${collectionName}`;

    if (!forceRefresh) {
      const cached = DatabaseAPI.getFromCache(cacheKey);
      if (Array.isArray(cached)) {
        return cached;
      }
    }

    // Disparar sincronización en background
    syncCollectionFromAPI(collectionName, {
      skipCache: forceRefresh,
      includeInactive,
      forceRefresh,
      limit,
    });

    const localData = legacyGetCollection(collectionName);
    return Array.isArray(localData) ? localData : [];
  },

  /**
   * Variante asíncrona para quienes requieran esperar la sincronización con el backend.
   */
  async getCollectionAsync(collectionName, options = {}) {
    const data = await syncCollectionFromAPI(collectionName, {
      skipCache: options.forceRefresh === true,
      includeInactive: options.includeInactive === true,
      forceRefresh: options.forceRefresh === true,
      limit: options.limit,
    });
    if (Array.isArray(data)) {
      return data;
    }
    const fallback = legacyGetCollection(collectionName);
    return Array.isArray(fallback) ? fallback : [];
  },

  /**
   * Obtiene un item del almacenamiento local y sincroniza en segundo plano.
   */
  getItem(collectionName, id, options = {}) {
    const localItem = legacyGetItem(collectionName, id);
    if (!localItem || options.forceRefresh) {
      DatabaseAPI.fetchById(collectionName, id)
        .then((item) => {
          if (item && legacySaveCollection) {
            const current = legacyGetCollection(collectionName) || [];
            const index = current.findIndex((row) => row.id === id);
            if (index !== -1) {
              current[index] = { ...current[index], ...item };
            } else {
              current.push(item);
            }
            legacySaveCollection(collectionName, current);
          }
        })
        .catch((error) => {
          console.warn(
            `DatabaseAPI: no se pudo refrescar ${collectionName}/${id}`,
            error?.message || error
          );
        });
    }
    return localItem || null;
  },

  /**
   * Variante asíncrona para obtener un item directamente desde el backend.
   */
  async getItemAsync(collectionName, id) {
    const item = await DatabaseAPI.fetchById(collectionName, id);
    if (item && legacySaveCollection) {
      const current = legacyGetCollection(collectionName) || [];
      const index = current.findIndex((row) => row.id === id);
      if (index !== -1) {
        current[index] = { ...current[index], ...item };
      } else {
        current.push(item);
      }
      legacySaveCollection(collectionName, current);
    }
    return item;
  },
};

// Reemplazar el Database global por el puente de compatibilidad
window.Database = DatabaseBridge;
