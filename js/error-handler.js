/**
 * Sistema de Manejo de Errores - NO Silenciar Errores
 * Los errores se muestran completos en la consola del navegador
 */

window.ErrorHandler = {
  /**
   * Configuración de errores
   */
  config: {
    showStackTrace: true,
    logToConsole: true,
    rethrowErrors: true,
    debugMode: true,
    showOverlay: true,
    maxVisibleErrors: 5,
  },

  /**
   * Captura y muestra un error SIN silenciarlo
   * @param {Error} error - El error capturado
   * @param {string} context - Contexto donde ocurrió el error
   * @param {object} options - Opciones: { fatal: boolean, data: object }
   */
  handle(error, context = 'Error desconocido', options = {}) {
    const { fatal = false, data = null } = options;

    // 🔥 MOSTRAR ERROR COMPLETO EN CONSOLA
    if (this.config.logToConsole) {
      console.group(`❌ ERROR EN: ${context}`);
      console.error('Mensaje:', error.message);
      console.error('Error completo:', error);

      if (this.config.showStackTrace && error.stack) {
        console.error('Stack Trace:', error.stack);
      }

      if (data) {
        console.error('Datos adicionales:', data);
      }

      console.groupEnd();
    }

    // Mostrar toast al usuario
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      const mensaje = fatal
        ? `ERROR CRÍTICO en ${context}: ${error.message}`
        : `Error en ${context}: ${error.message}`;
      Utils.showToast(mensaje, 'error');
    }

    if (this.config.showOverlay) {
      this.showErrorOverlay(context, error, data);
    }

    // Re-lanzar error si es fatal o está configurado
    if (fatal || this.config.rethrowErrors) {
      throw error;
    }

    return null;
  },

  /**
   * Wrapper para funciones async que muestra errores
   */
  async wrap(fn, context = 'Función async') {
    try {
      return await fn();
    } catch (error) {
      return this.handle(error, context);
    }
  },

  /**
   * Log de advertencia (no es error pero importante)
   */
  warn(message, data = null) {
    console.group(`⚠️ ADVERTENCIA`);
    console.warn(message);
    if (data) console.warn('Datos:', data);
    console.groupEnd();
  },

  /**
   * Activar/desactivar modo debug
   */
  setDebugMode(enabled) {
    this.config.debugMode = enabled;
    this.config.rethrowErrors = enabled;
    console.log(`🔧 Modo Debug: ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
    console.log(`   - Los errores ${enabled ? 'SE RELANZARÁN' : 'NO se relanzarán'}`);
  },
};

window.ErrorHandler.ensureOverlay = function ensureOverlay() {
  if (typeof document === 'undefined') {
    return null;
  }

  const existing = document.getElementById('global-error-overlay');
  if (existing) {
    return existing;
  }

  const overlay = document.createElement('div');
  overlay.id = 'global-error-overlay';
  overlay.style.position = 'fixed';
  overlay.style.bottom = '16px';
  overlay.style.right = '16px';
  overlay.style.width = '360px';
  overlay.style.maxHeight = '60vh';
  overlay.style.overflow = 'auto';
  overlay.style.background = '#1b1b1b';
  overlay.style.color = '#fff';
  overlay.style.border = '2px solid #d32f2f';
  overlay.style.borderRadius = '8px';
  overlay.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
  overlay.style.zIndex = '99999';
  overlay.style.fontFamily = 'monospace';

  const header = document.createElement('div');
  header.textContent = '🔥 Errores en tiempo real';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.padding = '10px 12px';
  header.style.background = '#2d2d2d';
  header.style.fontWeight = 'bold';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Cerrar';
  closeBtn.style.background = '#d32f2f';
  closeBtn.style.color = '#fff';
  closeBtn.style.border = 'none';
  closeBtn.style.padding = '4px 8px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.borderRadius = '4px';
  closeBtn.addEventListener('click', () => overlay.remove());

  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'error-overlay-body';
  body.style.padding = '8px 12px';
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '12px';

  overlay.appendChild(header);
  overlay.appendChild(body);

  (document.body || document.documentElement).appendChild(overlay);
  return overlay;
};

window.ErrorHandler.showErrorOverlay = function showErrorOverlay(context, error, data) {
  const overlay = this.ensureOverlay();
  if (!overlay) return;

  const body = overlay.querySelector('.error-overlay-body');
  if (!body) return;

  const entry = document.createElement('div');
  entry.style.background = '#2b2b2b';
  entry.style.border = '1px solid #444';
  entry.style.borderRadius = '6px';
  entry.style.padding = '8px';

  const title = document.createElement('div');
  title.style.fontWeight = 'bold';
  title.style.marginBottom = '4px';
  title.textContent = `${new Date().toLocaleTimeString()} · ${context}`;

  const message = document.createElement('div');
  message.textContent = error?.message || 'Error sin mensaje';
  message.style.color = '#ffd54f';
  message.style.whiteSpace = 'pre-wrap';

  entry.appendChild(title);
  entry.appendChild(message);

  if (error && error.stack) {
    const stack = document.createElement('pre');
    stack.textContent = error.stack;
    stack.style.whiteSpace = 'pre-wrap';
    stack.style.fontSize = '11px';
    stack.style.marginTop = '6px';
    stack.style.color = '#b0bec5';
    entry.appendChild(stack);
  }

  if (data) {
    const dataBlock = document.createElement('pre');
    dataBlock.textContent = JSON.stringify(data, null, 2);
    dataBlock.style.whiteSpace = 'pre-wrap';
    dataBlock.style.fontSize = '11px';
    dataBlock.style.marginTop = '6px';
    dataBlock.style.color = '#80cbc4';
    entry.appendChild(dataBlock);
  }

  body.prepend(entry);

  while (body.children.length > window.ErrorHandler.config.maxVisibleErrors) {
    body.removeChild(body.lastChild);
  }
};

// Capturar errores globales no manejados
window.addEventListener('error', (event) => {
  console.group('🔥 ERROR NO MANEJADO (Global)');
  console.error('Mensaje:', event.message);
  console.error('Archivo:', event.filename);
  console.error('Línea:', event.lineno, 'Columna:', event.colno);
  console.error('Error:', event.error);
  if (event.error && event.error.stack) {
    console.error('Stack:', event.error.stack);
  }
  console.groupEnd();

  if (window.ErrorHandler?.config.showOverlay) {
    const fallbackError = event.error || new Error(event.message);
    window.ErrorHandler.showErrorOverlay('Error global', fallbackError, {
      archivo: event.filename,
      linea: event.lineno,
      columna: event.colno,
    });
  }
});

// Capturar promesas rechazadas no manejadas
window.addEventListener('unhandledrejection', (event) => {
  console.group('🔥 PROMESA RECHAZADA NO MANEJADA');
  console.error('Razón:', event.reason);
  if (event.reason && event.reason.stack) {
    console.error('Stack:', event.reason.stack);
  }
  console.groupEnd();

  if (window.ErrorHandler?.config.showOverlay) {
    const rejectionReason =
      event.reason instanceof Error
        ? event.reason
        : new Error(typeof event.reason === 'string' ? event.reason : 'Promesa rechazada');
    window.ErrorHandler.showErrorOverlay('Promesa rechazada', rejectionReason);
  }
});

console.log('✅ Error Handler inicializado - Los errores NO se silenciarán');
