/* ========================================
   SECURITY GUARD - Protección de Autenticación
   Previene acceso no autorizado a páginas protegidas
   Gestor Tienda Pro v2.0
   ======================================== */

(function () {
  'use strict';

  // Configuración de páginas públicas (accesibles sin login)
  const PUBLIC_PAGES = ['/index.html', '/login.html', '/', ''];

  // Configuración de páginas de administración (requieren rol admin)
  const ADMIN_PAGES = ['/usuarios.html'];

  /**
   * Obtener la ruta actual normalizada
   */
  function getCurrentPath() {
    let path = window.location.pathname;

    // Normalizar la ruta
    if (path === '' || path === '/') {
      return '/';
    }

    // Si no tiene extensión, podría ser ruta de carpeta
    if (!path.includes('.')) {
      path += '/';
    }

    return path;
  }

  /**
   * Verificar si la página actual es pública
   */
  function isPublicPage() {
    const currentPath = getCurrentPath();

    // Verificar si está en la lista de páginas públicas
    return PUBLIC_PAGES.some((publicPath) => {
      if (publicPath === currentPath) return true;
      if (currentPath.endsWith(publicPath)) return true;
      return false;
    });
  }

  /**
   * Verificar si la página requiere rol de administrador
   */
  function isAdminPage() {
    const currentPath = getCurrentPath();

    return ADMIN_PAGES.some((adminPath) => {
      if (currentPath.endsWith(adminPath)) return true;
      return false;
    });
  }

  /**
   * VERIFICACIÓN TEMPRANA - Nivel 1
   * Se ejecuta inmediatamente, antes de cargar contenido
   * Previene carga de la página si no hay sesión activa
   */
  function earlySecurityCheck() {
    // Si es página pública, permitir acceso
    if (isPublicPage()) {
      console.log('🌐 Página pública detectada, acceso permitido');
      return true;
    }

    // Para páginas protegidas, verificar presencia de sesión activa
    // IMPORTANTE: Esta es solo una verificación preliminar
    // La verificación profunda se hará después con el backend
    const hasActiveSession = localStorage.getItem('session_active');

    if (!hasActiveSession) {
      console.warn('🚫 Acceso denegado: No hay sesión activa');

      // Dar un momento para que el usuario pueda ver el mensaje
      setTimeout(() => {
        window.location.replace('login.html');
      }, 100);

      // No lanzar error inmediatamente, permitir que los scripts terminen de cargar
      return false;
    }

    console.log('✅ Verificación temprana pasada: Sesión activa');
    return true;
  }

  /**
   * VERIFICACIÓN PROFUNDA - Nivel 2
   * Se ejecuta cuando Auth module está disponible
   * Verifica validez del token con el backend
   */
  async function deepSecurityCheck() {
    // Si es página pública, no verificar
    if (isPublicPage()) {
      return true;
    }

    try {
      // Esperar a que Auth module esté disponible
      if (typeof Auth === 'undefined') {
        console.error('❌ Auth module no disponible');
        throw new Error('Auth module not loaded');
      }

      // Esperar inicialización de Auth
      await Auth.ready();

      // Verificar si está autenticado (verificación suave, sin redirigir)
      if (!Auth.isAuthenticated()) {
        console.log('⚠️ Usuario no autenticado, verificando sesión con backend...');

        // Intentar verificar sesión con el backend (esto intentará refresh si es necesario)
        const sessionValid = await Auth.verifySession();

        if (!sessionValid) {
          console.error('❌ Sesión inválida o expirada');
          throw new Error('Session invalid or expired');
        }

        // Verificar de nuevo después de verifySession
        if (!Auth.isAuthenticated()) {
          console.error('❌ Autenticación fallida después de verificación');
          throw new Error('Authentication failed');
        }
      }

      // Verificar permisos de administrador si es necesario
      if (isAdminPage()) {
        if (!Auth.isAdmin() && !Auth.isSuperAdmin()) {
          console.error('❌ Acceso denegado: Se requieren permisos de administrador');

          // Mostrar mensaje de error
          if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast('No tienes permisos para acceder a esta página', 'error');
          }

          // Redireccionar al dashboard
          setTimeout(() => {
            window.location.replace('dashboard.html');
          }, 2000);

          throw new Error('Insufficient permissions');
        }
      }

      console.log('✅ Verificación profunda completada: Sesión válida');

      // Actualizar última actividad
      if (Auth._lastActivity !== undefined) {
        Auth._lastActivity = Date.now();
      }

      return true;
    } catch (error) {
      console.error('❌ Error en verificación de seguridad:', error);

      // Redireccionar a login en caso de error
      window.location.replace('login.html');

      throw error;
    }
  }

  /**
   * PROTECCIÓN CONTRA MANIPULACIÓN - Nivel 3
   * Previene modificación de funciones de autenticación
   */
  function protectAuthFunctions() {
    // Congelar objeto Auth para prevenir modificaciones
    if (typeof Auth !== 'undefined' && typeof Object.freeze === 'function') {
      try {
        // Proteger métodos críticos
        const criticalMethods = [
          'isAuthenticated',
          'isAdmin',
          'isSuperAdmin',
          'hasRole',
          'getUser',
          'getAccessToken',
        ];

        criticalMethods.forEach((method) => {
          if (Auth[method] && typeof Auth[method] === 'function') {
            Object.defineProperty(Auth, method, {
              writable: false,
              configurable: false,
            });
          }
        });

        console.log('🔒 Protección de funciones críticas activada');
      } catch (error) {
        console.warn('⚠️ No se pudo aplicar protección completa:', error.message);
      }
    }
  }

  /**
   * MONITOREO DE ACTIVIDAD - Nivel 4
   * Detecta inactividad y cierra sesión automáticamente
   */
  function setupInactivityMonitor() {
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
    let inactivityTimer = null;

    function resetInactivityTimer() {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }

      inactivityTimer = setTimeout(() => {
        console.warn('⏰ Sesión cerrada por inactividad');

        if (typeof Auth !== 'undefined' && Auth.logout) {
          Auth.logout();
        } else {
          localStorage.clear();
          sessionStorage.clear();
          window.location.replace('login.html');
        }
      }, INACTIVITY_TIMEOUT);
    }

    // Eventos que indican actividad
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    // Throttle para no saturar
    let lastActivity = 0;
    function handleActivity() {
      const now = Date.now();
      if (now - lastActivity > 5000) {
        // Máximo cada 5 segundos
        lastActivity = now;
        resetInactivityTimer();
      }
    }

    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Iniciar contador
    resetInactivityTimer();

    console.log('⏱️ Monitor de inactividad activado (30 minutos)');
  }

  // Sistema de throttling para logs de seguridad (v1.2)
  const securityLogThrottle = {
    lastLogTime: 0,
    minInterval: 30000, // 30 segundos entre logs al servidor (aumentado)
    pendingLogs: [],
    maxPendingLogs: 10,
    batchInterval: 60000, // Enviar batch cada 60 segundos
    batchTimerId: null,
    isEnabled: true, // Flag para deshabilitar logs si hay problemas de auth
    consecutiveErrors: 0,
    maxConsecutiveErrors: 3,

    shouldLog() {
      if (!this.isEnabled) return false;
      const now = Date.now();
      return now - this.lastLogTime >= this.minInterval;
    },

    markLogged() {
      this.lastLogTime = Date.now();
      this.consecutiveErrors = 0;
    },

    markError() {
      this.consecutiveErrors++;
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        console.warn('🔇 Security logs deshabilitados temporalmente por errores consecutivos');
        this.isEnabled = false;
        // Re-habilitar después de 5 minutos
        setTimeout(
          () => {
            this.isEnabled = true;
            this.consecutiveErrors = 0;
            console.log('🔊 Security logs re-habilitados');
          },
          5 * 60 * 1000
        );
      }
    },

    addToPending(log) {
      this.pendingLogs.push(log);
      if (this.pendingLogs.length > this.maxPendingLogs) {
        this.pendingLogs.shift(); // Remover el más antiguo
      }
    },

    startBatchSender() {
      if (this.batchTimerId) return;
      this.batchTimerId = setInterval(() => {
        this.flushPendingLogs();
      }, this.batchInterval);
    },

    async flushPendingLogs() {
      if (!this.isEnabled || this.pendingLogs.length === 0) return;
      if (typeof Auth === 'undefined' || !Auth.isAuthenticated()) return;

      const logsToSend = [...this.pendingLogs];
      this.pendingLogs = [];

      try {
        // Enviar solo el resumen, no todos los logs individuales
        await Auth._request('/logs/security', {
          method: 'POST',
          body: {
            event: 'batch_security_events',
            count: logsToSend.length,
            summary: logsToSend
              .slice(0, 3)
              .map((l) => l.event)
              .join(', '),
            timestamp: new Date().toISOString(),
          },
        });
        this.markLogged();
      } catch (err) {
        // Silenciar errores, ya tenemos los logs locales
        this.markError();
      }
    },
  };

  /**
   * LOGGING DE SEGURIDAD
   * Registra intentos de acceso y anomalías
   * Solo guarda localmente por defecto, envía al servidor con throttling agresivo
   */
  function logSecurityEvent(event) {
    const securityLog = {
      timestamp: new Date().toISOString(),
      event: event,
      page: getCurrentPath(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
    };

    // Guardar en sessionStorage (se limpia al cerrar navegador)
    try {
      const logs = JSON.parse(sessionStorage.getItem('security_logs') || '[]');
      logs.push(securityLog);

      // Mantener solo últimos 50 logs
      if (logs.length > 50) {
        logs.shift();
      }

      sessionStorage.setItem('security_logs', JSON.stringify(logs));
    } catch (error) {
      // Silenciar errores de storage
    }

    // Solo eventos críticos se envían inmediatamente al servidor
    const criticalEvents = ['security_check_failed', 'critical_error', 'unauthorized_access'];
    const isCritical = criticalEvents.some((ce) => event.includes(ce));

    // Verificar si Auth está disponible y autenticado
    if (typeof Auth === 'undefined' || !Auth.isAuthenticated()) {
      // No intentar enviar logs si no hay autenticación
      return;
    }

    // Iniciar el batch sender si no está corriendo
    securityLogThrottle.startBatchSender();

    if (isCritical && securityLogThrottle.shouldLog()) {
      // Eventos críticos: enviar inmediatamente con throttle
      Auth._request('/logs/security', {
        method: 'POST',
        body: securityLog,
      })
        .then(() => {
          securityLogThrottle.markLogged();
        })
        .catch(() => {
          securityLogThrottle.markError();
        });
    } else {
      // Eventos normales: acumular para batch
      securityLogThrottle.addToPending(securityLog);
    }
  }

  // ============================================
  // INICIALIZACIÓN
  // ============================================

  try {
    console.log('🛡️ Security Guard inicializando...');

    // Nivel 1: Verificación temprana (inmediata)
    earlySecurityCheck();
    logSecurityEvent('early_check_passed');

    // Nivel 2: Verificación profunda (cuando DOM esté listo)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', async () => {
        try {
          await deepSecurityCheck();
          logSecurityEvent('deep_check_passed');

          // Nivel 3: Protección contra manipulación
          setTimeout(() => {
            protectAuthFunctions();
          }, 1000);

          // Nivel 4: Monitor de inactividad (solo en páginas protegidas)
          if (!isPublicPage()) {
            setupInactivityMonitor();
          }
        } catch (error) {
          logSecurityEvent(`security_check_failed: ${error.message}`);
          throw error;
        }
      });
    } else {
      // DOM ya está listo
      deepSecurityCheck()
        .then(() => {
          logSecurityEvent('deep_check_passed');
          protectAuthFunctions();

          if (!isPublicPage()) {
            setupInactivityMonitor();
          }
        })
        .catch((error) => {
          logSecurityEvent(`security_check_failed: ${error.message}`);
        });
    }

    console.log('🛡️ Security Guard activado');
  } catch (error) {
    console.error('❌ Error crítico en Security Guard:', error);
    logSecurityEvent(`critical_error: ${error.message}`);

    // Si falla completamente, bloquear acceso
    if (!isPublicPage()) {
      window.location.replace('login.html');
    }
  }

  // Exponer funciones públicas necesarias
  window.SecurityGuard = {
    isPublicPage,
    isAdminPage,
    getCurrentPath,
    logSecurityEvent,
  };
})();
