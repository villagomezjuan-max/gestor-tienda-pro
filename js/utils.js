/* ========================================
   FUNCIONES AUXILIARES Y UTILIDADES
   Gestor Tienda Pro
   ======================================== */

// Utilidades globales del sistema
const Utils = {
  /**
   * Genera un ID único
   * @returns {string} ID único
   */
  generateId() {
    return '_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  },

  /**
   * Formatea una fecha
   * @param {Date|string} date - Fecha a formatear
   * @param {string} format - Formato ('short', 'long', 'datetime')
   * @returns {string} Fecha formateada
   */
  formatDate(date, format = 'short') {
    if (!date) return '-';
    const d = new Date(date);

    if (isNaN(d.getTime())) return '-';

    const options = {
      short: { year: 'numeric', month: '2-digit', day: '2-digit' },
      long: { year: 'numeric', month: 'long', day: 'numeric' },
      datetime: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      },
    };

    return d.toLocaleDateString('es-ES', options[format] || options.short);
  },

  /**
   * Obtiene la fecha actual en formato YYYY-MM-DD
   * @returns {string} Fecha actual
   */
  getCurrentDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Obtiene la hora actual en formato HH:MM
   * @returns {string} Hora actual
   */
  getCurrentTime() {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  getApiBaseUrl() {
    if (
      typeof window !== 'undefined' &&
      typeof window.API_BASE_URL === 'string' &&
      window.API_BASE_URL.trim()
    ) {
      return window.API_BASE_URL.trim().replace(/\/+$/, '');
    }

    try {
      let stored = null;
      if (window.TenantStorage && typeof TenantStorage.getItem === 'function') {
        stored = TenantStorage.getItem('api_base_url');
      } else if (typeof localStorage !== 'undefined') {
        stored = localStorage.getItem('api_base_url');
      }
      if (stored) {
        return stored.replace(/\/+$/, '');
      }
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('⚠️ ERROR: Utils - Leyendo API Base URL');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
    }

    const { protocol, hostname, port } = window.location;
    const developmentPorts = new Set(['3000', '4173', '5173', '5500', '5501', '5502', '5503']);
    const defaultApiSuffix = '/api';
    let origin;

    if (port && developmentPorts.has(port)) {
      origin = `${protocol}//${hostname}:3001`;
    } else {
      const portString = port ? `:${port}` : '';
      origin = `${protocol}//${hostname}${portString}`;
    }

    return `${origin}${defaultApiSuffix}`.replace(/\/+$/, '');
  },

  setApiBaseUrl(url) {
    if (!url) {
      return;
    }

    const normalized = url.trim().replace(/\s+/g, '').replace(/\/+$/, '');

    try {
      if (window.TenantStorage && typeof TenantStorage.setItem === 'function') {
        TenantStorage.setItem('api_base_url', normalized);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('api_base_url', normalized);
      }
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('⚠️ ERROR: Utils - Guardando API Base URL');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
    }

    if (typeof window !== 'undefined') {
      window.API_BASE_URL = normalized;
      if (window.DatabaseAPI && typeof window.DatabaseAPI.setBaseUrl === 'function') {
        window.DatabaseAPI.setBaseUrl(normalized, { persist: false });
      }
    }
  },

  apiUrl(path = '') {
    const base = (this.getApiBaseUrl() || '').replace(/\/+$/, '');
    if (!path) {
      return base;
    }

    let normalizedPath = path.startsWith('/') ? path : `/${path}`;

    if (base.endsWith('/api') && normalizedPath.startsWith('/api')) {
      normalizedPath = normalizedPath.replace(/^\/api/, '');
    }

    if (!normalizedPath.startsWith('/')) {
      normalizedPath = `/${normalizedPath}`;
    }

    return `${base}${normalizedPath}`;
  },

  /**
   * Formatea un número como moneda
   * @param {number} amount - Cantidad a formatear
   * @param {string} currency - Moneda (USD por defecto)
   * @returns {string} Cantidad formateada
   */
  formatCurrency(amount, currency = 'USD') {
    if (amount === null || amount === undefined) return '$0.00';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },

  /**
   * Formatea un número
   * @param {number} number - Número a formatear
   * @param {number} decimals - Decimales (2 por defecto)
   * @returns {string} Número formateado
   */
  formatNumber(number, decimals = 2) {
    if (number === null || number === undefined) return '0';
    return Number(number)
      .toFixed(decimals)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  /**
   * Calcula porcentaje
   * @param {number} value - Valor actual
   * @param {number} total - Total
   * @returns {number} Porcentaje
   */
  calculatePercentage(value, total) {
    if (!total || total === 0) return 0;
    return ((value / total) * 100).toFixed(2);
  },

  /**
   * Cierra un modal por ID
   * @param {string} modalId - ID del modal a cerrar
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.remove();
    }
  },

  /**
   * Sanitiza texto para prevenir XSS
   * @param {string} text - Texto a sanitizar
   * @returns {string} Texto sanitizado
   */
  sanitize(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Valida email
   * @param {string} email - Email a validar
   * @returns {boolean} Válido o no
   */
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  /**
   * Valida teléfono
   * @param {string} phone - Teléfono a validar
   * @returns {boolean} Válido o no
   */
  validatePhone(phone) {
    const re = /^[\d\s\-\+\(\)]+$/;
    return re.test(phone) && phone.replace(/\D/g, '').length >= 7;
  },

  /**
   * Debounce para limitar ejecuciones
   * @param {Function} func - Función a ejecutar
   * @param {number} wait - Tiempo de espera en ms
   * @returns {Function} Función con debounce
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Copia texto al portapapeles
   * @param {string} text - Texto a copiar
   * @returns {Promise<boolean>} Éxito o no
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback para navegadores antiguos
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  },

  /**
   * Descarga datos como archivo
   * @param {string} data - Datos a descargar
   * @param {string} filename - Nombre del archivo
   * @param {string} type - Tipo MIME
   */
  downloadFile(data, filename, type = 'text/plain') {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Crea y muestra un modal genérico
   * @param {string} id - ID del modal
   * @param {string} title - Título del modal
   * @param {string} body - Contenido HTML del cuerpo
   * @param {string} footer - Contenido HTML del pie
   * @param {string} size - 'small', 'large', 'xlarge'
   */
  createModal(id, title, body, footer, size = '') {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = id;

    const sizeClass = size ? `modal-${size}` : '';

    modal.innerHTML = `
      <div class="modal-container ${sizeClass}">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="btn-close" data-action="close-modal"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">${body}</div>
        <div class="modal-footer">${footer}</div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listener para cerrar modal
    const closeBtn = modal.querySelector('[data-action="close-modal"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal(id));
    }

    // Cerrar modal al hacer clic fuera del contenedor
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal(id);
      }
    });

    return modal;
  },

  /**
   * Obtiene los datos de un formulario como un objeto
   * @param {string | HTMLFormElement} formElement - ID del formulario o el elemento del formulario
   * @returns {Object} Datos del formulario
   */
  getFormData(formElement) {
    const form =
      typeof formElement === 'string' ? document.getElementById(formElement) : formElement;
    if (!form) return {};

    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    return data;
  },

  /**
   * Lee archivo
   * @param {File} file - Archivo a leer
   * @returns {Promise<string>} Contenido del archivo
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  },

  /**
   * Calcula diferencia de días entre fechas
   * @param {Date|string} date1 - Primera fecha
   * @param {Date|string} date2 - Segunda fecha
   * @returns {number} Diferencia en días
   */
  daysDifference(date1, date2 = new Date()) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Obtiene inicio del día
   * @param {Date|string} date - Fecha
   * @returns {Date} Inicio del día
   */
  startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  /**
   * Obtiene fin del día
   * @param {Date|string} date - Fecha
   * @returns {Date} Fin del día
   */
  endOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  },

  /**
   * Genera color aleatorio
   * @returns {string} Color hexadecimal
   */
  randomColor() {
    return (
      '#' +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0')
    );
  },

  /**
   * Trunca texto
   * @param {string} text - Texto a truncar
   * @param {number} length - Longitud máxima
   * @returns {string} Texto truncado
   */
  truncate(text, length = 50) {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  },

  /**
   * Ordena array de objetos
   * @param {Array} array - Array a ordenar
   * @param {string} key - Clave para ordenar
   * @param {string} order - Orden ('asc' o 'desc')
   * @returns {Array} Array ordenado
   */
  sortBy(array, key, order = 'asc') {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  },

  /**
   * Agrupa array por clave
   * @param {Array} array - Array a agrupar
   * @param {string} key - Clave para agrupar
   * @returns {Object} Objeto agrupado
   */
  groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key];
      result[group] = result[group] || [];
      result[group].push(item);
      return result;
    }, {});
  },

  /**
   * Suma valores de array
   * @param {Array} array - Array de objetos
   * @param {string} key - Clave a sumar
   * @returns {number} Suma total
   */
  sumBy(array, key) {
    return array.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
  },

  /**
   * Muestra notificación toast mejorada con soporte para acciones
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo ('success', 'error', 'warning', 'info')
   * @param {number|Object} options - Duración en ms o objeto de opciones
   * @param {number} options.duration - Duración en ms (se calcula automáticamente si no se especifica)
   * @param {Function} options.action - Callback al hacer clic en el toast
   * @param {string} options.actionLabel - Etiqueta del botón de acción
   * @param {string} options.actionUrl - URL a la que navegar al hacer clic
   * @param {boolean} options.persistent - Si es true, no desaparece hasta hacer clic
   */
  showToast(message, type = 'info', options = {}) {
    if (!message) {
      return;
    }

    // Compatibilidad: si options es un número, tratarlo como duración
    if (typeof options === 'number') {
      options = { duration: options };
    }

    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle',
    };
    const icon = icons[type] || icons.info;

    // Calcular duración automática basada en longitud del mensaje y tipo
    const calculateDuration = () => {
      // Tiempo base según tipo (errores y warnings necesitan más tiempo)
      const baseDuration = {
        success: 3000,
        info: 4000,
        warning: 5000,
        error: 6000,
      };

      // Agregar tiempo extra por cada 50 caracteres (150ms por cada 50 chars)
      const charBonus = Math.ceil(message.length / 50) * 150;

      // Mínimo 3 segundos, máximo 12 segundos
      return Math.min(12000, Math.max(3000, (baseDuration[type] || 4000) + charBonus));
    };

    const duration = options.persistent ? Infinity : options.duration || calculateDuration();
    const hasAction = !!(options.action || options.actionUrl || options.actionLabel);

    const toast = document.createElement('div');
    toast.className = `toast ${type}${hasAction ? ' toast-with-action toast-clickable' : ''}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');

    // Construir contenido del toast
    let actionButton = '';
    if (hasAction && options.actionLabel) {
      actionButton = `<button class="toast-action-btn">${this.sanitize(options.actionLabel)}</button>`;
    }

    // Barra de progreso para indicar tiempo restante
    const progressBar = !options.persistent
      ? '<div class="toast-progress"><div class="toast-progress-bar"></div></div>'
      : '';

    toast.innerHTML = `
      <i class="fas ${icon}"></i>
      <span>${this.sanitize(message)}</span>
      ${actionButton}
      ${progressBar}
    `;

    // Si hay acción, añadir cursor pointer
    if (hasAction) {
      toast.style.cursor = 'pointer';
      toast.title = options.actionLabel || 'Clic para más detalles';
    }

    container.appendChild(toast);

    // Forzar animación
    requestAnimationFrame(() => {
      toast.classList.add('show');
      // Iniciar animación de la barra de progreso
      const progressBarEl = toast.querySelector('.toast-progress-bar');
      if (progressBarEl && duration !== Infinity) {
        progressBarEl.style.transition = `width ${duration}ms linear`;
        progressBarEl.style.width = '0%';
      }
    });

    // Limitar acumulación de notificaciones
    const maxToasts = 4;
    while (container.childElementCount > maxToasts) {
      const first = container.firstElementChild;
      if (first && first !== toast) {
        first.classList.remove('show');
        first.addEventListener('transitionend', () => first.remove(), { once: true });
        break;
      } else {
        break;
      }
    }

    const hideToast = () => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };

    // Variables para pausar/reanudar
    let timeoutId = null;
    let remainingTime = duration;
    let startTime = Date.now();
    let isPaused = false;

    const startTimer = () => {
      if (duration === Infinity) return;
      startTime = Date.now();
      timeoutId = setTimeout(hideToast, remainingTime);

      // Reanudar animación de barra de progreso
      const progressBarEl = toast.querySelector('.toast-progress-bar');
      if (progressBarEl) {
        progressBarEl.style.transition = `width ${remainingTime}ms linear`;
        progressBarEl.style.width = '0%';
      }
    };

    const pauseTimer = () => {
      if (duration === Infinity || isPaused) return;
      isPaused = true;
      clearTimeout(timeoutId);
      remainingTime = remainingTime - (Date.now() - startTime);

      // Pausar animación de barra de progreso
      const progressBarEl = toast.querySelector('.toast-progress-bar');
      if (progressBarEl) {
        const computedWidth = window.getComputedStyle(progressBarEl).width;
        progressBarEl.style.transition = 'none';
        progressBarEl.style.width = computedWidth;
      }
    };

    const resumeTimer = () => {
      if (duration === Infinity || !isPaused) return;
      isPaused = false;
      startTimer();
    };

    // Iniciar temporizador
    startTimer();

    // Pausar al pasar el mouse encima para que el usuario pueda leer
    toast.addEventListener('mouseenter', pauseTimer);
    toast.addEventListener('mouseleave', resumeTimer);

    // También pausar con touch (móviles)
    toast.addEventListener('touchstart', pauseTimer, { passive: true });
    toast.addEventListener(
      'touchend',
      () => {
        // Dar un pequeño delay antes de reanudar en móvil
        setTimeout(resumeTimer, 500);
      },
      { passive: true }
    );

    // Manejar clic en el toast
    toast.addEventListener('click', (e) => {
      clearTimeout(timeoutId);

      // Si hay una acción, ejecutarla
      if (options.action && typeof options.action === 'function') {
        options.action();
      }

      // Si hay URL, navegar a ella
      if (options.actionUrl) {
        if (options.actionUrl.startsWith('#')) {
          window.location.hash = options.actionUrl;
        } else {
          window.location.href = options.actionUrl;
        }
      }

      hideToast();
    });
  },

  /**
   * Muestra notificación toast con acción - método simplificado
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo ('success', 'error', 'warning', 'info')
   * @param {string} actionUrl - URL a la que navegar al hacer clic
   * @param {string} actionLabel - Etiqueta del botón (opcional)
   */
  showActionToast(message, type, actionUrl, actionLabel = 'Ver detalles') {
    this.showToast(message, type, {
      actionUrl,
      actionLabel,
      duration: 8000, // Más tiempo para que el usuario note que puede hacer clic
    });
  },

  /**
   * Muestra notificación de alerta que requiere atención
   * Esta notificación es persistente y no desaparece hasta que el usuario la cierra
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo ('error', 'warning')
   * @param {Object} options - Opciones adicionales
   */
  showAlertToast(message, type = 'warning', options = {}) {
    this.showToast(message, type, {
      ...options,
      persistent: true,
      actionLabel: options.actionLabel || 'Entendido',
    });
  },

  /**
   * Muestra modal de confirmación
   * @param {string} message - Mensaje de confirmación
   * @param {Function} onConfirm - Callback al confirmar
   * @param {Function} onCancel - Callback al cancelar
   */
  showConfirm(message, onConfirm, onCancel = null) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-container" style="max-width: 400px;">
        <div class="modal-header">
          <h3><i class="fas fa-question-circle"></i> Confirmación</h3>
        </div>
        <div class="modal-body">
          <p>${this.sanitize(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelBtn">
            <i class="fas fa-times"></i> Cancelar
          </button>
          <button class="btn btn-primary" id="confirmBtn">
            <i class="fas fa-check"></i> Confirmar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const remove = () => modal.remove();

    modal.querySelector('#confirmBtn').addEventListener('click', () => {
      remove();
      if (onConfirm) onConfirm();
    });

    modal.querySelector('#cancelBtn').addEventListener('click', () => {
      remove();
      if (onCancel) onCancel();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        remove();
        if (onCancel) onCancel();
      }
    });
  },

  /**
   * Muestra confirmación con promesa para flujos async
   * @param {string} titleOrMessage - Título o mensaje si no se envía título
   * @param {string} [message] - Mensaje cuando se envía título
   * @param {string} [confirmText] - Texto del botón confirmar
   * @param {string} [cancelText] - Texto del botón cancelar
   * @returns {Promise<boolean>} Resultado de la confirmación
   */
  confirm(titleOrMessage, message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
    const hasExplicitMessage = typeof message === 'string';
    const title = hasExplicitMessage ? titleOrMessage : 'Confirmación';
    const body = hasExplicitMessage ? message : titleOrMessage;

    const safeTitle = this.sanitize(title || 'Confirmación');
    const safeBody = this.sanitize(body || '');
    const safeConfirm = this.sanitize(confirmText || 'Confirmar');
    const safeCancel = this.sanitize(cancelText || 'Cancelar');

    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-container" style="max-width: 420px;">
          <div class="modal-header">
            <h3><i class="fas fa-question-circle"></i> ${safeTitle}</h3>
          </div>
          <div class="modal-body">
            <p>${safeBody}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="asyncConfirmCancel">
              <i class="fas fa-times"></i> ${safeCancel}
            </button>
            <button class="btn btn-primary" id="asyncConfirmAccept">
              <i class="fas fa-check"></i> ${safeConfirm}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      let resolved = false;
      const handleClose = (result) => {
        if (resolved) return;
        resolved = true;
        document.removeEventListener('keydown', handleKeydown);
        if (modal && modal.parentNode) {
          modal.remove();
        }
        resolve(result);
      };

      const handleKeydown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          handleClose(false);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          handleClose(true);
        }
      };

      document.addEventListener('keydown', handleKeydown);

      modal.querySelector('#asyncConfirmAccept').addEventListener('click', () => handleClose(true));
      modal
        .querySelector('#asyncConfirmCancel')
        .addEventListener('click', () => handleClose(false));

      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          handleClose(false);
        }
      });
    });
  },

  /**
   * Muestra overlay de carga
   * @param {boolean} show - Mostrar u ocultar
   */
  showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  },

  /**
   * Sanitiza HTML para prevenir XSS
   * @param {string} str - String a sanitizar
   * @returns {string} String sanitizado
   */
  sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Escapa caracteres HTML especiales
   * @param {string} str - String a escapar
   * @returns {string} String escapado
   */
  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (char) => {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return map[char];
    });
  },

  /**
   * Valida y sanitiza input según el tipo
   * @param {any} value - Valor a validar
   * @param {string} type - Tipo de dato ('text', 'number', 'email', 'phone', 'date')
   * @param {number} maxLength - Longitud máxima permitida
   * @returns {Object} {valid: boolean, sanitized: any, error: string}
   */
  validateInput(value, type = 'text', maxLength = 1000) {
    // Convertir a string si no lo es
    let strValue = String(value || '');

    // Validar longitud máxima
    if (strValue.length > maxLength) {
      return {
        valid: false,
        sanitized: null,
        error: `Longitud máxima de ${maxLength} caracteres excedida`,
      };
    }

    // Validar según tipo
    switch (type) {
      case 'text':
        return {
          valid: true,
          sanitized: this.sanitizeHTML(strValue),
          error: null,
        };

      case 'number':
        const num = Number(strValue);
        if (isNaN(num)) {
          return {
            valid: false,
            sanitized: null,
            error: 'Debe ser un número válido',
          };
        }
        return {
          valid: true,
          sanitized: num,
          error: null,
        };

      case 'email':
        if (!this.validateEmail(strValue)) {
          return {
            valid: false,
            sanitized: null,
            error: 'Email inválido',
          };
        }
        return {
          valid: true,
          sanitized: this.sanitizeHTML(strValue.trim().toLowerCase()),
          error: null,
        };

      case 'phone':
        if (!this.validatePhone(strValue)) {
          return {
            valid: false,
            sanitized: null,
            error: 'Teléfono inválido',
          };
        }
        return {
          valid: true,
          sanitized: strValue.replace(/\s+/g, ''),
          error: null,
        };

      case 'date':
        const date = new Date(strValue);
        if (isNaN(date.getTime())) {
          return {
            valid: false,
            sanitized: null,
            error: 'Fecha inválida',
          };
        }
        return {
          valid: true,
          sanitized: date.toISOString(),
          error: null,
        };

      default:
        return {
          valid: true,
          sanitized: this.sanitizeHTML(strValue),
          error: null,
        };
    }
  },

  prepareResponsiveTable(table) {
    if (!table || !(table instanceof Element)) return;
    if (table.dataset && table.dataset.responsive === 'false') return;

    const headers = Array.from(table.querySelectorAll('thead th')).map((th) =>
      th.textContent.trim()
    );
    const bodies = Array.from(table.tBodies || []);

    bodies.forEach((tbody) => {
      Array.from(tbody.rows).forEach((row) => {
        Array.from(row.cells).forEach((cell, index) => {
          if (!cell.getAttribute('data-label') && headers[index]) {
            cell.setAttribute('data-label', headers[index]);
          }
        });
      });
    });

    if (
      !table.classList.contains('responsive-table') &&
      !table.classList.contains('js-responsive-table')
    ) {
      table.classList.add('responsive-table');
    }
  },

  applyResponsiveTables(root = document) {
    if (!root) return;

    const isTable = root instanceof HTMLTableElement;
    const selector =
      '.data-table table, table[data-responsive], table.js-responsive-table, table.responsive-table';
    const nodeList = isTable ? [root] : Array.from(root.querySelectorAll(selector));

    nodeList.forEach((table) => this.prepareResponsiveTable(table));
  },
};

// ========================================
// COMPONENTE BARRA DE PROGRESO FLOTANTE
// ========================================
const ProgressBar = {
  element: null,
  interval: null,

  show(text = 'Iniciando...') {
    if (this.element) this.hide();

    this.element = document.createElement('div');
    this.element.id = 'floating-progress-bar';
    this.element.className = 'floating-progress-bar';
    this.element.innerHTML = `
      <span class="progress-bar-text">${text}</span>
      <div class="progress-bar-container">
        <div class="progress-bar-inner"></div>
      </div>
    `;
    document.body.appendChild(this.element);

    // Forzar un reflow para aplicar la transición
    setTimeout(() => {
      this.element.classList.add('show');
    }, 10);
  },

  update(text, percentage) {
    if (!this.element) return;

    const textEl = this.element.querySelector('.progress-bar-text');
    const innerBar = this.element.querySelector('.progress-bar-inner');

    if (text) textEl.textContent = text;
    if (percentage !== null) innerBar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
  },

  error(text) {
    if (!this.element) return;
    this.update(text, 100);
    this.element.classList.add('error');
    setTimeout(() => this.hide(), 5000); // Ocultar después de 5 segundos
  },

  success(text) {
    if (!this.element) return;
    this.update(text, 100);
    this.element.classList.add('success');
    setTimeout(() => this.hide(), 2000); // Ocultar después de 2 segundos
  },

  hide() {
    if (!this.element) return;
    this.element.classList.remove('show');

    // Eliminar del DOM después de la transición
    setTimeout(() => {
      this.element?.remove();
      this.element = null;
    }, 400);
  },
};

/**
 * Clase Paginator para gestionar paginación de tablas
 * Maneja la división de datos en páginas y genera controles de navegación
 */
class Paginator {
  /**
   * Constructor del paginador
   * @param {Array} items - Array de items a paginar
   * @param {number} itemsPerPage - Cantidad de items por página (default: 20)
   * @param {string} storageKey - Clave para persistir página actual en sessionStorage
   */
  constructor(items, itemsPerPage = 20, storageKey = null) {
    this.items = items || [];
    this.itemsPerPage = itemsPerPage;
    this.storageKey = storageKey;

    // Intentar cargar página guardada en sessionStorage
    if (this.storageKey) {
      const savedPage = sessionStorage.getItem(this.storageKey);
      this.currentPage = savedPage ? parseInt(savedPage) : 1;
    } else {
      this.currentPage = 1;
    }

    // Validar página actual
    if (this.currentPage < 1 || this.currentPage > this.getTotalPages()) {
      this.currentPage = 1;
    }
  }

  /**
   * Obtiene el número total de páginas
   * @returns {number} Total de páginas
   */
  getTotalPages() {
    return Math.ceil(this.items.length / this.itemsPerPage) || 1;
  }

  /**
   * Obtiene los items de la página actual
   * @returns {Array} Items de la página actual
   */
  getCurrentPageItems() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.items.slice(start, end);
  }

  /**
   * Va a una página específica
   * @param {number} page - Número de página
   */
  goToPage(page) {
    const totalPages = this.getTotalPages();
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;

      // Guardar en sessionStorage si hay clave
      if (this.storageKey) {
        sessionStorage.setItem(this.storageKey, this.currentPage.toString());
      }
    }
  }

  /**
   * Va a la página anterior
   */
  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  /**
   * Va a la página siguiente
   */
  nextPage() {
    if (this.currentPage < this.getTotalPages()) {
      this.goToPage(this.currentPage + 1);
    }
  }

  /**
   * Va a la primera página
   */
  firstPage() {
    this.goToPage(1);
  }

  /**
   * Va a la última página
   */
  lastPage() {
    this.goToPage(this.getTotalPages());
  }

  /**
   * Obtiene información de la página actual
   * @returns {Object} Info de página (inicio, fin, total)
   */
  getPageInfo() {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(start + this.itemsPerPage - 1, this.items.length);

    return {
      start,
      end,
      total: this.items.length,
      currentPage: this.currentPage,
      totalPages: this.getTotalPages(),
    };
  }

  /**
   * Renderiza los controles de paginación
   * @param {string} containerId - ID del contenedor donde renderizar
   * @param {Function} onPageChange - Callback al cambiar de página
   * @returns {string} HTML de los controles
   */
  renderControls(containerId, onPageChange) {
    const info = this.getPageInfo();
    const totalPages = this.getTotalPages();

    // Si no hay items o solo una página, no mostrar controles
    if (this.items.length === 0) {
      return '<div class="pagination-info">No hay registros para mostrar</div>';
    }

    if (totalPages === 1) {
      return `
        <div class="pagination-container">
          <div class="pagination-info">
            Mostrando ${info.start} - ${info.end} de ${info.total} registros
          </div>
        </div>
      `;
    }

    // Generar números de página a mostrar (máximo 7)
    let pageNumbers = [];
    const maxButtons = 7;

    if (totalPages <= maxButtons) {
      // Mostrar todas las páginas
      pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // Mostrar páginas alrededor de la actual
      const halfButtons = Math.floor(maxButtons / 2);
      let startPage = Math.max(1, this.currentPage - halfButtons);
      let endPage = Math.min(totalPages, startPage + maxButtons - 1);

      // Ajustar si estamos cerca del final
      if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
      }

      pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

      // Agregar primera página y ellipsis si es necesario
      if (startPage > 1) {
        pageNumbers.unshift('...');
        pageNumbers.unshift(1);
      }

      // Agregar última página y ellipsis si es necesario
      if (endPage < totalPages) {
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }

    // Construir HTML
    const html = `
      <div class="pagination-container">
        <div class="pagination-info">
          Mostrando ${info.start} - ${info.end} de ${info.total} registros
        </div>
        <div class="pagination-controls">
          <button 
            class="pagination-btn" 
            onclick="${containerId}.paginator.firstPage(); ${containerId}.renderPage();"
            ${this.currentPage === 1 ? 'disabled' : ''}
            title="Primera página"
          >
            <i class="fas fa-angle-double-left"></i>
          </button>
          
          <button 
            class="pagination-btn" 
            onclick="${containerId}.paginator.previousPage(); ${containerId}.renderPage();"
            ${this.currentPage === 1 ? 'disabled' : ''}
            title="Página anterior"
          >
            <i class="fas fa-angle-left"></i>
          </button>
          
          <div class="pagination-pages">
            ${pageNumbers
              .map((num) => {
                if (num === '...') {
                  return '<span class="pagination-ellipsis">...</span>';
                }
                return `
                <button 
                  class="pagination-btn ${num === this.currentPage ? 'active' : ''}" 
                  onclick="${containerId}.paginator.goToPage(${num}); ${containerId}.renderPage();"
                >
                  ${num}
                </button>
              `;
              })
              .join('')}
          </div>
          
          <button 
            class="pagination-btn" 
            onclick="${containerId}.paginator.nextPage(); ${containerId}.renderPage();"
            ${this.currentPage === totalPages ? 'disabled' : ''}
            title="Página siguiente"
          >
            <i class="fas fa-angle-right"></i>
          </button>
          
          <button 
            class="pagination-btn" 
            onclick="${containerId}.paginator.lastPage(); ${containerId}.renderPage();"
            ${this.currentPage === totalPages ? 'disabled' : ''}
            title="Última página"
          >
            <i class="fas fa-angle-double-right"></i>
          </button>
        </div>
        <div class="pagination-select">
          <label>
            Items por página:
            <select onchange="${containerId}.changeItemsPerPage(this.value)">
              <option value="10" ${this.itemsPerPage === 10 ? 'selected' : ''}>10</option>
              <option value="20" ${this.itemsPerPage === 20 ? 'selected' : ''}>20</option>
              <option value="50" ${this.itemsPerPage === 50 ? 'selected' : ''}>50</option>
              <option value="100" ${this.itemsPerPage === 100 ? 'selected' : ''}>100</option>
            </select>
          </label>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Actualiza los items y resetea a la primera página
   * @param {Array} newItems - Nuevos items
   */
  updateItems(newItems) {
    this.items = newItems || [];
    this.currentPage = 1;

    if (this.storageKey) {
      sessionStorage.setItem(this.storageKey, '1');
    }
  }

  /**
   * Cambia la cantidad de items por página
   * @param {number} newItemsPerPage - Nueva cantidad
   */
  changeItemsPerPage(newItemsPerPage) {
    this.itemsPerPage = parseInt(newItemsPerPage);
    this.currentPage = 1;

    if (this.storageKey) {
      sessionStorage.setItem(this.storageKey, '1');
    }
  }
}

// Exportar Paginator globalmente
window.Paginator = Paginator;

/**
 * Hash simple para contraseñas (simulación)
 * @param {string} text - Texto a hashear
 * @returns {string} Hash
 */
function simpleHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// ========================================
// CIFRADO SEGURO PARA API KEYS
// Usa Web Crypto API (AES-GCM)
// ========================================

/**
 * Módulo de cifrado seguro para datos sensibles como API Keys
 * Utiliza AES-GCM con clave derivada de PBKDF2
 */
const SecureCrypto = {
  // Identificador único para derivar la clave (basado en el dominio + salt fijo)
  _getSalt() {
    // Combinamos el hostname con un salt fijo para crear una clave única por instalación
    const hostname = window.location.hostname || 'localhost';
    const fixedSalt = 'GestorTiendaPro_2024_SecureKey';
    return hostname + '_' + fixedSalt;
  },

  /**
   * Deriva una clave criptográfica a partir de un passphrase
   * @param {string} passphrase - Texto base para derivar la clave
   * @returns {Promise<CryptoKey>} Clave para cifrado AES-GCM
   */
  async _deriveKey(passphrase) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(this._getSalt()),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Cifra un texto usando AES-GCM
   * @param {string} plainText - Texto a cifrar
   * @param {string} passphrase - Contraseña para derivar la clave (opcional, usa default)
   * @returns {Promise<string>} Texto cifrado en base64 (incluye IV)
   */
  async encrypt(plainText, passphrase = 'GTiendaPro_DefaultKey_v1') {
    if (!plainText) return '';

    try {
      const encoder = new TextEncoder();
      const key = await this._deriveKey(passphrase);

      // Generar IV aleatorio de 12 bytes
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Cifrar
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoder.encode(plainText)
      );

      // Combinar IV + datos cifrados
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);

      // Convertir a base64 y añadir prefijo para identificar que está cifrado
      return 'enc:' + btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('[SecureCrypto] Error cifrando:', error);
      return '';
    }
  },

  /**
   * Descifra un texto cifrado con AES-GCM
   * @param {string} encryptedText - Texto cifrado (con prefijo 'enc:')
   * @param {string} passphrase - Contraseña para derivar la clave (opcional, usa default)
   * @returns {Promise<string>} Texto descifrado
   */
  async decrypt(encryptedText, passphrase = 'GTiendaPro_DefaultKey_v1') {
    if (!encryptedText) return '';

    // Si no tiene el prefijo de cifrado, devolver tal cual (compatibilidad)
    if (!encryptedText.startsWith('enc:')) {
      return encryptedText;
    }

    try {
      const key = await this._deriveKey(passphrase);

      // Remover prefijo y decodificar base64
      const base64Data = encryptedText.slice(4);
      const combined = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      // Separar IV (12 bytes) y datos cifrados
      const iv = combined.slice(0, 12);
      const encryptedData = combined.slice(12);

      // Descifrar
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encryptedData
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('[SecureCrypto] Error descifrando:', error);
      return '';
    }
  },

  /**
   * Verifica si un texto está cifrado
   * @param {string} text - Texto a verificar
   * @returns {boolean} true si está cifrado
   */
  isEncrypted(text) {
    return typeof text === 'string' && text.startsWith('enc:');
  },

  /**
   * Oculta parcialmente una API Key para mostrar (ej: AIza***...***xyz)
   * @param {string} apiKey - API Key completa
   * @returns {string} API Key parcialmente oculta
   */
  maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 10) return '***';
    const prefix = apiKey.slice(0, 4);
    const suffix = apiKey.slice(-4);
    return `${prefix}${'*'.repeat(8)}...${suffix}`;
  },
};

// Exportar utilidades globalmente
window.Utils = Utils;
window.simpleHash = simpleHash;
window.SecureCrypto = SecureCrypto;
