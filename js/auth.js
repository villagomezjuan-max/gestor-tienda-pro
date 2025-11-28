/* ========================================
   SISTEMA DE AUTENTICACIÓN v2.0 - SEGURO
   JWT Tokens + Refresh Tokens + Validación Backend
   Gestor Tienda Pro
   ======================================== */

const ROLE_SUPER_ADMIN = 'super_admin';
const ROLE_ADMIN = 'admin';
const ROLE_VENDEDOR = 'vendedor';
const ROLE_TECNICO = 'tecnico';
const DEFAULT_ROLE = ROLE_VENDEDOR;

const LEGACY_ROLE_MAP = {
  superadmin: ROLE_SUPER_ADMIN,
  'super-admin': ROLE_SUPER_ADMIN,
  admin: ROLE_ADMIN,
  administrador: ROLE_ADMIN,
  gerente: ROLE_ADMIN,
  ventas: ROLE_VENDEDOR,
  vendedor: ROLE_VENDEDOR,
  user: ROLE_VENDEDOR,
  technician: ROLE_TECNICO,
  tecnico: ROLE_TECNICO,
  mecanico: ROLE_TECNICO,
};

function normalizeRoleClient(rawRole) {
  if (!rawRole) {
    return DEFAULT_ROLE;
  }
  const key = rawRole.toString().trim().toLowerCase();
  return LEGACY_ROLE_MAP[key] || key || DEFAULT_ROLE;
}

function roleMatches(role, targets) {
  if (!targets) {
    return false;
  }
  const normalized = normalizeRoleClient(role);
  const list = Array.isArray(targets) ? targets : [targets];
  return list.map((target) => normalizeRoleClient(target)).includes(normalized);
}

const RoleUtils = {
  ROLE_SUPER_ADMIN,
  ROLE_ADMIN,
  ROLE_VENDEDOR,
  ROLE_TECNICO,
  DEFAULT_ROLE,
  normalize: normalizeRoleClient,
  is: roleMatches,
};

if (typeof window !== 'undefined') {
  window.RoleUtils = RoleUtils;
}

// Detectar URL base automáticamente
function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, port } = window.location;
    // Si estamos en producción (Render, etc.)
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}/api`;
    }
    // Desarrollo local
    return 'http://localhost:3001/api';
  }
  return 'http://localhost:3001/api';
}

const Auth = {
  API_URL: getApiBaseUrl() + '/auth',
  _accessToken: null,
  _refreshToken: null,
  _user: null,
  _sessionCheckInterval: null,
  _lastActivity: Date.now(),
  _activityTimeout: null,
  _readyPromise: null,
  _apiBaseUrl: null,
  _csrfToken: null,
  _offline: false,
  _refreshAttempted: false,
  _refreshInProgress: null, // Promesa de refresh en progreso para evitar múltiples refreshes simultáneos
  _lastRefreshTime: 0, // Timestamp del último refresh exitoso
  _minRefreshInterval: 5000, // Mínimo 5 segundos entre refreshes
  roles: RoleUtils,

  async init() {
    if (this._readyPromise) {
      return this._readyPromise;
    }

    this._readyPromise = (async () => {
      this._apiBaseUrl = this.API_URL.replace(/\/auth(?:\/)?$/, '');

      // Obtener CSRF token del servidor
      try {
        const response = await fetch(getApiBaseUrl() + '/csrf-token', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          this._csrfToken = data.csrfToken;
          console.log('✅ CSRF token obtenido');
        }
      } catch (error) {
        // 🔥 NO SILENCIAR - Mostrar error completo
        console.group('⚠️ ERROR: No se pudo obtener CSRF token');
        console.error('Error completo:', error);
        console.error('Stack trace:', error.stack);
        console.groupEnd();
      }

      // Verificar sesión inmediatamente en init para tener datos del usuario
      // pero solo si hay indicios de sesión activa (cookie o localStorage)
      const hasSessionHint = localStorage.getItem('session_active') === 'true';
      if (hasSessionHint) {
        try {
          await this.verifySession();
        } catch (error) {
          console.warn('No se pudo verificar sesión en init:', error.message);
        }
      }

      // Limpiar intervalo anterior si existe
      if (this._sessionCheckInterval) {
        clearInterval(this._sessionCheckInterval);
      }

      // Detectar actividad del usuario
      this._setupActivityDetection();

      // Verificar sesión cada 15 minutos en lugar de 5
      this._sessionCheckInterval = setInterval(
        () => {
          if (this.isAuthenticated()) {
            // Solo verificar si ha habido actividad reciente
            const timeSinceActivity = Date.now() - this._lastActivity;
            if (timeSinceActivity < 30 * 60 * 1000) {
              // 30 minutos de inactividad
              this.verifySession().catch(() => {
                console.warn('Error verificando sesión');
              });
            }
          }
        },
        15 * 60 * 1000
      );

      return true;
    })();

    return this._readyPromise;
  },

  async ready() {
    return this._readyPromise || this.init();
  },

  normalizeRole(role) {
    return RoleUtils.normalize(role);
  },

  _normalizeUser(user) {
    if (!user || typeof user !== 'object') {
      return null;
    }
    return {
      ...user,
      rol: RoleUtils.normalize(user.rol),
    };
  },

  _cleanupUnauthorizedBusinessData(user) {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const allowed = new Set();

      if (user?.negocioId) {
        allowed.add(user.negocioId);
      }

      let negociosLista = null;

      if (Array.isArray(user?.negocios)) {
        negociosLista = user.negocios;
      } else if (typeof user?.negocios === 'string') {
        try {
          const parsedNegocios = JSON.parse(user.negocios);
          if (Array.isArray(parsedNegocios)) {
            negociosLista = parsedNegocios;
          }
        } catch (parseError) {
          console.warn('No se pudo parsear lista de negocios del usuario:', parseError);
        }
      }

      if (Array.isArray(negociosLista)) {
        negociosLista.forEach((negocioId) => {
          if (negocioId) {
            allowed.add(negocioId);
          }
        });
      }

      if (!allowed.size && user?.rol === ROLE_SUPER_ADMIN) {
        allowed.add('super_admin');
      }

      const prefix = 'gestorTiendaProDB_';
      const keysToRemove = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) {
          continue;
        }

        if (key.startsWith(prefix)) {
          const negocioId = key.slice(prefix.length);
          if (!allowed.has(negocioId)) {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Eliminar almacenamiento legacy compartido para evitar mezclar datos
      if (localStorage.getItem('gestorTiendaProDB')) {
        localStorage.removeItem('gestorTiendaProDB');
      }
    } catch (error) {
      console.warn('No se pudo limpiar datos locales por negocio:', error);
    }
  },

  _getApiBaseUrl() {
    if (!this._apiBaseUrl) {
      this._apiBaseUrl = this.API_URL.replace(/\/auth(?:\/)?$/, '');
    }
    return this._apiBaseUrl;
  },

  async _request(path, options = {}) {
    await this.ready();

    const baseUrlRaw = this._getApiBaseUrl() || '';
    const baseUrl = baseUrlRaw.replace(/\/+$/, '');
    const config = { ...options };
    const headers = { ...(options.headers || {}) };
    let body = options.body;

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

    if (!isFormData && body !== undefined && body !== null) {
      const isPlainObject = Object.prototype.toString.call(body) === '[object Object]';
      if (isPlainObject) {
        body = JSON.stringify(body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else if (typeof body === 'string') {
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    // Incluir CSRF token en peticiones que modifican datos
    if (
      this._csrfToken &&
      (config.method === 'POST' ||
        config.method === 'PUT' ||
        config.method === 'DELETE' ||
        config.method === 'PATCH')
    ) {
      headers['X-CSRF-Token'] = this._csrfToken;
    }

    config.headers = headers;
    config.credentials = 'include'; // IMPORTANTE: Incluir cookies
    if (body !== undefined) {
      config.body = body;
    }
    let requestUrl = '';
    if (typeof path === 'string' && /^https?:\/\//i.test(path)) {
      requestUrl = path;
    } else {
      let normalizedPath = typeof path === 'string' ? path : '';
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = `/${normalizedPath}`;
      }

      if (normalizedPath.startsWith('/api/')) {
        normalizedPath = normalizedPath.replace(/^\/api(\/|$)/, '/');
      }

      requestUrl = `${baseUrl}${normalizedPath}`;
    }

    const response = await this.authenticatedFetch(requestUrl, config);

    let parsedBody = null;
    if (response.status !== 204) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          parsedBody = await response.json();
        } catch (parseError) {
          console.warn('Auth._request: no se pudo parsear JSON', parseError);
          parsedBody = null;
        }
      } else {
        try {
          const text = await response.text();
          parsedBody = text || null;
        } catch (textError) {
          parsedBody = null;
        }
      }
    }

    if (!response.ok) {
      const message =
        parsedBody && typeof parsedBody === 'object'
          ? parsedBody.message || parsedBody.error || 'Error en la operación solicitada'
          : typeof parsedBody === 'string' && parsedBody.trim()
            ? parsedBody
            : response.statusText || 'Error en la solicitud';

      const error = new Error(message);
      error.status = response.status;
      error.details = parsedBody;
      throw error;
    }

    return parsedBody;
  },

  _setupActivityDetection() {
    // Eventos que indican actividad del usuario
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    const updateActivity = () => {
      this._lastActivity = Date.now();
    };

    // Throttle: actualizar actividad máximo cada 30 segundos
    let throttleTimer = null;
    const throttledUpdate = () => {
      if (!throttleTimer) {
        updateActivity();
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
        }, 30000);
      }
    };

    activityEvents.forEach((event) => {
      document.addEventListener(event, throttledUpdate, { passive: true });
    });

    console.log('✅ Detección de actividad del usuario activada');
  },

  async login(username, password, negocioId = null) {
    try {
      // Asegurarse de que Auth está inicializado y tenemos CSRF token
      await this.ready();

      // Si aún no hay CSRF token, obtenerlo ahora
      if (!this._csrfToken) {
        try {
          const csrfResponse = await fetch('http://localhost:3001/api/csrf-token', {
            credentials: 'include',
          });
          if (csrfResponse.ok) {
            const csrfData = await csrfResponse.json();
            this._csrfToken = csrfData.csrfToken;
          }
        } catch (csrfError) {
          console.error('Error obteniendo CSRF token:', csrfError);
        }
      }

      // El negocioId será detectado automáticamente por el backend
      const response = await fetch(`${this.API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this._csrfToken || '',
        },
        credentials: 'include', // IMPORTANTE: Incluir cookies
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requirePasswordChange) {
          return {
            success: false,
            requirePasswordChange: true,
            userId: data.userId,
            message: data.message,
          };
        }

        return {
          success: false,
          message: data.message || 'Credenciales incorrectas',
          intentosRestantes: data.intentosRestantes,
          code: data.code,
          allowedBusinesses: Array.isArray(data.allowedBusinesses)
            ? data.allowedBusinesses
            : undefined,
        };
      }

      const normalizedUser = this._normalizeUser(data.user);

      // Los tokens ahora están en cookies httpOnly (no accesibles desde JS)
      // Solo guardamos el usuario y el negocio
      this._user = normalizedUser;
      this._cleanupUnauthorizedBusinessData(normalizedUser);
      this._apiBaseUrl = this.API_URL.replace(/\/auth$/, '');

      // Guardar el negocioId del login para enrutamiento correcto de peticiones
      const fallbackNegocio = normalizedUser?.negocios?.[0] || null;
      const userNegocioId = negocioId || normalizedUser?.negocioId || fallbackNegocio || null;

      if (userNegocioId) {
        localStorage.setItem('negocio_actual', userNegocioId);
        localStorage.setItem('negocio_login', userNegocioId);
      } else {
        localStorage.removeItem('negocio_actual');
      }

      // Marcar que hay sesión activa (para verificación rápida)
      localStorage.setItem('session_active', 'true');

      console.log('✅ Sesión iniciada:', data.user.username, '- Negocio:', userNegocioId);
      return { success: true, user: normalizedUser };
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR CRÍTICO: Login');
      console.error('Mensaje:', error.message);
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      return {
        success: false,
        message: 'Error conectando con el servidor. Verifica que el backend esté ejecutándose.',
      };
    }
  },

  _showSessionExpiredNotification() {
    // Crear notificación visual temporal
    if (typeof document === 'undefined') return;

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">Sesión Expirada</div>
          <div style="opacity: 0.9; font-size: 13px;">Redirigiendo al inicio de sesión...</div>
        </div>
      </div>
    `;

    // Agregar animación CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);
  },

  async logout() {
    try {
      // Llamar al backend para limpiar cookies httpOnly
      await fetch(`${this.API_URL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this._csrfToken,
        },
        credentials: 'include',
      }).catch((error) => {
        console.warn('Error al notificar logout al servidor (no crítico):', error.message);
      });
    } finally {
      this._accessToken = null;
      this._refreshToken = null;
      this._user = null;
      this._csrfToken = null;
      localStorage.removeItem('session_active');
      localStorage.removeItem('negocio_actual');

      if (this._sessionCheckInterval) {
        clearInterval(this._sessionCheckInterval);
        this._sessionCheckInterval = null;
      }

      this._readyPromise = null;
      this._apiBaseUrl = null;

      console.log('👋 Sesión cerrada');
      window.location.href = 'login.html';
    }
  },

  async refreshAccessToken(negocioId = null) {
    // Si estamos offline, no intentar
    if (this._offline) {
      return false;
    }

    // Evitar refreshes muy frecuentes
    const now = Date.now();
    if (now - this._lastRefreshTime < this._minRefreshInterval) {
      console.log('⏳ Refresh muy reciente, esperando...');
      return this._refreshInProgress || false;
    }

    // Si ya hay un refresh en progreso, esperar ese resultado
    if (this._refreshInProgress) {
      console.log('⏳ Refresh en progreso, esperando resultado...');
      return this._refreshInProgress;
    }

    // Crear una promesa de refresh que otros puedan esperar
    this._refreshInProgress = (async () => {
      try {
        let targetNegocioId = negocioId || localStorage.getItem('negocio_actual');

        if (!targetNegocioId && this._user) {
          targetNegocioId = this._user.negocioId || this._user.negocios?.[0] || null;
        }

        const response = await fetch(`${this.API_URL}/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': this._csrfToken,
          },
          credentials: 'include', // IMPORTANTE: Incluir cookies
          body: JSON.stringify({ negocioId: targetNegocioId }),
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            console.warn('❌ Refresh token inválido o expirado');
            localStorage.removeItem('session_active');
            this._user = null;
          } else {
            console.log('🔌 Refresh token no disponible, activando modo offline');
            this._offline = true;
          }
          return false;
        }

        const data = await response.json();

        // El nuevo access token está en cookie httpOnly
        // Actualizar el negocio actual en el usuario si cambió
        if (this._user && targetNegocioId) {
          this._user.negocioId = targetNegocioId;
          localStorage.setItem('negocio_actual', targetNegocioId);
        }
        if (this._user) {
          this._cleanupUnauthorizedBusinessData(this._user);
        }

        this._lastRefreshTime = Date.now();
        console.log(
          '🔄 Access token renovado exitosamente para negocio:',
          targetNegocioId || 'default'
        );
        return true;
      } catch (error) {
        const isNetworkError =
          error.message?.includes('fetch') || error.message?.includes('network');
        if (isNetworkError) {
          console.warn('⚠️ Error de red al renovar token, continuando en modo offline');
          this._offline = true;
        } else {
          console.group('❌ ERROR: Renovando token');
          console.error('Error completo:', error);
          console.error('Stack trace:', error.stack);
          console.groupEnd();
          localStorage.removeItem('session_active');
          this._user = null;
        }
        return false;
      } finally {
        this._refreshInProgress = null;
      }
    })();

    return this._refreshInProgress;
  },

  async cambiarNegocio(negocioId) {
    try {
      if (!this._user) {
        throw new Error('No hay sesión activa');
      }

      const negociosDisponibles = this._user.negocios || [];
      if (!negociosDisponibles.includes(negocioId)) {
        throw new Error('No tienes acceso a este negocio');
      }

      // Refrescar el token con el nuevo negocio
      const refreshed = await this.refreshAccessToken(negocioId);

      if (!refreshed) {
        throw new Error('No se pudo cambiar de negocio');
      }

      // NUEVO: Notificar al sistema de Database para cambiar el contexto
      if (typeof Database !== 'undefined' && Database.switchBusiness) {
        Database.switchBusiness(negocioId);
      }

      console.log('✅ Negocio cambiado a:', negocioId);
      this._cleanupUnauthorizedBusinessData(this._user);
      return { success: true, negocioId };
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR: Cambiando de negocio');
      console.error('Mensaje:', error.message);
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      return {
        success: false,
        message: error?.message || 'No se pudo cambiar de negocio',
      };
    }
  },

  getCurrentNegocioId() {
    if (this._user) {
      return this._user.negocioId || this._user.negocios?.[0] || null;
    }

    const stored = localStorage.getItem('negocio_actual') || localStorage.getItem('negocio_login');
    return stored || null;
  },

  async verifySession() {
    try {
      // Si ya sabemos que estamos offline, no intentar
      if (this._offline) {
        console.log('🔌 Modo offline activo, saltando verificación de backend');
        return this._user ? true : false;
      }

      // Con cookies httpOnly, no necesitamos verificar tokens en JS
      // Solo verificamos con el backend
      const response = await fetch(`${this.API_URL}/me`, {
        credentials: 'include', // Incluir cookies
      });

      if (response.status === 401) {
        // Token expirado, intentar refresh una sola vez
        if (!this._refreshAttempted) {
          this._refreshAttempted = true;
          console.log('⚠️ Sesión expirada, intentando renovar token...');
          const refreshed = await this.refreshAccessToken();
          this._refreshAttempted = false;
          if (refreshed) {
            console.log('✅ Token renovado exitosamente');
            return this.verifySession();
          }
        }

        // Si no se pudo renovar el token, la sesión expiró definitivamente
        console.warn('❌ No se pudo renovar la sesión, redirigiendo a login...');
        this._user = null;
        localStorage.removeItem('session_active');
        localStorage.removeItem('negocio_actual');

        // Notificar al usuario antes de redirigir
        if (
          typeof window !== 'undefined' &&
          window.location.pathname !== '/login.html' &&
          !window.location.pathname.endsWith('login.html')
        ) {
          this._showSessionExpiredNotification();
          // Redirigir después de 2 segundos para que el usuario vea el mensaje
          setTimeout(() => {
            window.location.href = '/login.html?expired=true';
          }, 2000);
        }
        return false;
      }

      if (!response.ok) {
        localStorage.removeItem('session_active');
        return false;
      }

      const data = await response.json();
      this._user = this._normalizeUser(data.user);
      this._cleanupUnauthorizedBusinessData(this._user);
      localStorage.setItem('session_active', 'true');
      return true;
    } catch (error) {
      const message = (error?.message || '').toLowerCase();
      const networkIssue =
        message.includes('failed to fetch') ||
        message.includes('network') ||
        message.includes('connection refused') ||
        message.includes('net::err');

      if (networkIssue) {
        console.warn('Auth.verifySession: backend no disponible, continuando en modo offline.');
        this._offline = true;
        if (this._user) {
          localStorage.setItem('session_active', 'true');
          return true;
        }
        return false;
      }

      console.error('Error verificando sesión:', error);
      this._offline = false;
      localStorage.removeItem('session_active');
      return false;
    }
  },

  isAuthenticated() {
    // Con cookies httpOnly, verificamos si hay sesión activa
    return Boolean(this._user && localStorage.getItem('session_active'));
  },

  /**
   * Espera a que la sesión esté verificada antes de continuar
   * Útil para páginas que necesitan datos del usuario inmediatamente
   */
  async ensureAuthenticated() {
    await this.ready();

    if (this._user) {
      return true;
    }

    // Si no tenemos usuario, intentar verificar sesión
    if (localStorage.getItem('session_active') === 'true') {
      try {
        const verified = await this.verifySession();
        return verified;
      } catch (error) {
        console.warn('Error verificando autenticación:', error);
        return false;
      }
    }

    return false;
  },

  getUser() {
    return this._user;
  },

  getAccessToken() {
    return this._accessToken;
  },

  getSession() {
    return this._user;
  },

  isAdmin() {
    return RoleUtils.is(this._user?.rol, [ROLE_ADMIN, ROLE_SUPER_ADMIN]);
  },

  isSuperAdmin() {
    return RoleUtils.is(this._user?.rol, ROLE_SUPER_ADMIN);
  },

  // Cambiar el contexto del negocio actual (para admin hub multi-tenant)
  setCurrentBusinessContext(negocioId) {
    if (!negocioId) return;
    localStorage.setItem('negocio_actual', negocioId);
    localStorage.setItem('negocio_login', negocioId);

    if (typeof Database !== 'undefined' && typeof Database.switchBusiness === 'function') {
      try {
        Database.switchBusiness(negocioId);
      } catch (error) {
        console.warn('No se pudo sincronizar Database.switchBusiness:', error);
      }
    }

    console.log('📍 Contexto de negocio cambiado a:', negocioId);
  },

  getCurrentBusinessId() {
    const session = this.getSession();
    if (session?.negocioId) {
      return session.negocioId;
    }

    if (Array.isArray(session?.negocios) && session.negocios.length) {
      return session.negocios[0];
    }

    const stored = localStorage.getItem('negocio_actual') || localStorage.getItem('negocio_login');
    if (stored) {
      return stored;
    }

    if (typeof Database !== 'undefined' && typeof Database.getCurrentBusiness === 'function') {
      try {
        const current = Database.getCurrentBusiness();
        if (current && current !== 'default') {
          return current;
        }
      } catch (error) {
        console.warn('No se pudo obtener negocio desde Database:', error);
      }
    }

    return null;
  },

  hasRole(rol) {
    return RoleUtils.is(this._user?.rol, rol);
  },

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await this._request('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });

      if (response && typeof response === 'object') {
        return {
          success: response.success !== false,
          message: response.message || 'Contraseña actualizada correctamente',
        };
      }

      return {
        success: true,
        message: 'Contraseña actualizada correctamente',
      };
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR: Cambiando contraseña');
      console.error('Mensaje:', error.message);
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      return {
        success: false,
        message: error?.message || 'Error de conexión',
      };
    }
  },

  async firstLoginChangePassword(userId, currentPassword, newPassword, negocioId = 'mecanica') {
    try {
      const response = await fetch(`${this.API_URL}/first-login-change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, currentPassword, newPassword, negocioId }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, message: data.message };
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Error en cambio de contraseña inicial:', error);
      return { success: false, message: 'Error de conexión' };
    }
  },

  async getAllUsers() {
    try {
      const data = await this._request('/usuarios');
      const payload = Array.isArray(data)
        ? data
        : data && Array.isArray(data.usuarios)
          ? data.usuarios
          : [];

      return payload.map((user) => this._normalizeUser(user)).filter(Boolean);
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR: Obteniendo usuarios');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      throw error; // Relanzar para que el llamador lo maneje
    }
  },

  async createUser(userData) {
    try {
      const response = await this._request('/usuarios', {
        method: 'POST',
        body: userData,
      });

      if (response && typeof response === 'object') {
        return {
          success: response.success !== false,
          message: response.message || 'Usuario creado correctamente',
          user: response.usuario || null,
        };
      }

      return {
        success: true,
        message: 'Usuario creado correctamente',
        user: response || null,
      };
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR: Creando usuario');
      console.error('Mensaje:', error.message);
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      return {
        success: false,
        message: error?.message || 'No se pudo crear el usuario',
      };
    }
  },

  async updateUser(userId, updates) {
    try {
      const response = await this._request(`/usuarios/${userId}`, {
        method: 'PUT',
        body: updates,
      });

      if (response && typeof response === 'object') {
        return {
          success: response.success !== false,
          message: response.message || 'Usuario actualizado correctamente',
          user: response.usuario || null,
        };
      }

      return {
        success: true,
        message: 'Usuario actualizado correctamente',
        user: response || null,
      };
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR: Actualizando usuario');
      console.error('Mensaje:', error.message);
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      return {
        success: false,
        message: error?.message || 'No se pudo actualizar el usuario',
      };
    }
  },

  async deleteUser(userId) {
    try {
      const response = await this._request(`/usuarios/${userId}`, {
        method: 'DELETE',
      });

      if (response && typeof response === 'object') {
        return {
          success: response.success !== false,
          message: response.message || 'Usuario eliminado correctamente',
        };
      }

      return {
        success: true,
        message: 'Usuario eliminado correctamente',
      };
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR: Eliminando usuario');
      console.error('Mensaje:', error.message);
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      return {
        success: false,
        message: error?.message || 'No se pudo eliminar el usuario',
      };
    }
  },

  _resolveNegocioId(overrideId = null) {
    if (overrideId && typeof overrideId === 'string' && overrideId.trim()) {
      return overrideId.trim();
    }

    const current = this.getCurrentBusinessId();
    if (current) {
      return current;
    }

    const session = this.getSession();
    if (session?.negocioId) {
      return session.negocioId;
    }

    if (Array.isArray(session?.negocios) && session.negocios.length) {
      return session.negocios[0];
    }

    const stored = localStorage.getItem('negocio_actual') || localStorage.getItem('negocio_login');
    if (stored) {
      return stored;
    }

    if (typeof Database !== 'undefined' && typeof Database.getCurrentBusiness === 'function') {
      try {
        const currentDb = Database.getCurrentBusiness();
        if (currentDb && currentDb !== 'default') {
          return currentDb;
        }
      } catch (error) {
        console.warn('No se pudo obtener negocio desde Database.getCurrentBusiness:', error);
      }
    }

    return null;
  },

  async authenticatedFetch(url, options = {}) {
    const config = { ...options };
    const { skipTenantHeader = false, negocioId: overrideNegocioId = null } = config;

    delete config.skipTenantHeader;
    delete config.negocioId;

    const headers = { ...(options.headers || {}) };
    const method = (config.method || 'GET').toUpperCase();

    if (!skipTenantHeader) {
      const negocioId = this._resolveNegocioId(overrideNegocioId);
      if (!negocioId) {
        throw new Error(
          'No se pudo determinar el negocio actual. Selecciona una tienda antes de continuar.'
        );
      }
      headers['X-Negocio-Id'] = negocioId;
    }

    // IMPORTANTE: Incluir cookies httpOnly
    config.credentials = config.credentials || 'include';

    // Incluir CSRF token si es operación que modifica datos
    if (
      this._csrfToken &&
      (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH')
    ) {
      headers['X-CSRF-Token'] = this._csrfToken;
    }

    config.headers = headers;

    let response = await fetch(url, config);

    if (response.status === 401) {
      // Token expirado, intentar refresh (solo una vez)
      if (!this._refreshAttempted) {
        this._refreshAttempted = true;
        const refreshed = await this.refreshAccessToken();

        if (refreshed) {
          // Reintentar request con nuevo token (en cookie)
          response = await fetch(url, config);
          this._refreshAttempted = false;
        } else {
          // Refresh falló - redirigir a login
          console.warn('⚠️ Sesión expirada - redirigiendo a login');
          localStorage.removeItem('session_active');
          this._user = null;

          // Redirigir solo si no estamos ya en login.html
          if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
          }
          throw new Error('Sesión expirada');
        }
      } else {
        // Ya se intentó refresh y falló
        this._refreshAttempted = false;
        throw new Error('No autorizado');
      }
    } else {
      // Reset flag en respuesta exitosa
      this._refreshAttempted = false;
    }

    return response;
  },

  /**
   * Verifica que el usuario esté autenticado, redirige a login si no lo está
   * Usar en páginas que requieren autenticación
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      console.warn('⚠️ Acceso no autorizado - redirigiendo a login');

      // Guardar la URL actual para redirigir después del login
      if (!window.location.pathname.includes('login.html')) {
        sessionStorage.setItem('returnUrl', window.location.pathname + window.location.search);
      }

      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  /**
   * Obtiene la URL de retorno guardada y la limpia
   */
  getReturnUrl() {
    const returnUrl = sessionStorage.getItem('returnUrl');
    sessionStorage.removeItem('returnUrl');
    return returnUrl || 'dashboard.html';
  },
};

// Inicializar Auth de forma asíncrona
(async function () {
  if (document.readyState === 'loading') {
    await new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', resolve);
    });
  }
  await Auth.init();
})();

window.Auth = Auth;
