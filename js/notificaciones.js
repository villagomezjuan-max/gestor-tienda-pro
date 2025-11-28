// ============================================
// MÓDULO: SISTEMA DE NOTIFICACIONES FLOTANTES
// ============================================
// Sistema centralizado de notificaciones toast para toda la aplicación
// Todas las notificaciones son flotantes, no hay paneles laterales
// Incluye persistencia en historial y envío a Telegram

const Notificaciones = {
  /**
   * Contenedor de notificaciones activas
   */
  notificacionesActivas: [],

  /**
   * Historial de notificaciones no leídas
   */
  historialNoLeidas: [],

  /**
   * Duración por defecto de las notificaciones (ms)
   */
  duracionPorDefecto: 4000,

  /**
   * Posición de las notificaciones
   * Opciones: 'top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'
   */
  posicion: 'top-right',

  /**
   * Máximo de toasts simultáneos visibles
   */
  maxNotificaciones: 4,

  /**
   * Contenedor DOM actual para los toast flotantes
   */
  toastContainer: null,

  /**
   * Configuración de persistencia y Telegram
   */
  config: {
    guardarHistorial: true, // Guardar en BD
    enviarTelegram: true,   // Enviar a Telegram automáticamente
    tiposImportantes: ['error', 'warning'], // Tipos que se envían a Telegram
    tiposCriticos: ['error'], // Tipos críticos (rojo parpadeante)
  },

  /**
   * Inicializa el sistema de notificaciones
   * Asegura que el contenedor de toast existe en el DOM
   */
  init() {
    const legacyToast = document.getElementById('toast');
    if (legacyToast) {
      // Remover contenedor antiguo que dejaba espacio en el layout
      legacyToast.remove();
    }

    this.toastContainer = document.getElementById('toastContainer');
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'toastContainer';
      this.toastContainer.className = 'toast-container';
      document.body.appendChild(this.toastContainer);
    }

    this.aplicarPosicion();
    this.cargarHistorialNoLeidas();
    this.actualizarIndicadorConexion();
    console.log('Sistema de notificaciones flotantes inicializado');
  },

  /**
   * Muestra una notificación flotante (toast)
   * @param {string} mensaje - Mensaje a mostrar
   * @param {string} tipo - Tipo de notificación: 'success', 'error', 'warning', 'info'
   * @param {number} duracion - Duración en milisegundos (opcional)
   * @param {Object} opciones - Opciones adicionales (guardarHistorial, enviarTelegram, importancia)
   */
  mostrar(mensaje, tipo = 'info', duracion = null, opciones = {}) {
    const icono = this.obtenerIcono(tipo);
    const mensajeSanitizado = this.sanitizarHTML(mensaje);

    // Generar ID único para la notificación
    const notificacionId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.crearToast({
      tipo,
      duracion,
      contenidoHTML: `<i class="fas ${icono}"></i><span>${mensajeSanitizado}</span>`,
      notificacionId,
    });

    // Guardar en historial y enviar a Telegram si corresponde
    this.procesarNotificacion({
      id: notificacionId,
      mensaje: mensaje,
      tipo: tipo,
      fecha: new Date().toISOString(),
      leida: false,
      importancia: opciones.importancia || this.calcularImportancia(tipo),
      ...opciones,
    });
  },

  /**
   * Calcula la importancia de la notificación según el tipo
   */
  calcularImportancia(tipo) {
    const importancias = {
      error: 'critica',    // Rojo parpadeante
      warning: 'alta',     // Amarillo parpadeante
      success: 'normal',
      info: 'baja',
    };
    return importancias[tipo] || 'normal';
  },

  /**
   * Procesa la notificación: guarda en historial y envía a Telegram
   */
  async procesarNotificacion(notificacion) {
    // Agregar a historial local de no leídas
    if (!notificacion.noGuardar) {
      this.historialNoLeidas.push(notificacion);
      this.guardarHistorialNoLeidas();
      this.actualizarIndicadorConexion();
    }

    // Guardar en base de datos si está habilitado
    if (this.config.guardarHistorial && !notificacion.noGuardar) {
      this.guardarEnBaseDatos(notificacion);
    }

    // Enviar a Telegram si está configurado y es un tipo importante
    if (this.config.enviarTelegram && 
        this.config.tiposImportantes.includes(notificacion.tipo) &&
        !notificacion.noEnviarTelegram) {
      this.enviarATelegram(notificacion);
    }
  },

  /**
   * Guarda la notificación en la base de datos
   */
  async guardarEnBaseDatos(notificacion) {
    try {
      // Usar Auth._request para asegurar autenticación correcta
      if (typeof Auth !== 'undefined' && Auth._request) {
        await Auth._request('/api/notificaciones-enviadas', {
          method: 'POST',
          body: JSON.stringify({
            mensaje: notificacion.mensaje,
            tipo: notificacion.tipo,
            tipo_servicio: notificacion.tipo,
            fecha_envio: notificacion.fecha,
            entregado: 1,
          }),
        });
      }
    } catch (error) {
      // Silenciar - no es crítico si falla el guardado
    }
  },

  /**
   * Envía la notificación a Telegram
   */
  async enviarATelegram(notificacion) {
    try {
      if (typeof TelegramNotificaciones !== 'undefined' && 
          TelegramNotificaciones.inicializado &&
          TelegramNotificaciones.config.activo) {
        
        // Usar la nueva función dedicada
        await TelegramNotificaciones.enviarNotificacionSistema(notificacion);
      }
    } catch (error) {
      console.warn('No se pudo enviar notificación a Telegram:', error);
    }
  },

  /**
   * Carga el historial de notificaciones no leídas desde localStorage
   */
  cargarHistorialNoLeidas() {
    try {
      const key = this.obtenerKeyStorage();
      const data = localStorage.getItem(key);
      if (data) {
        this.historialNoLeidas = JSON.parse(data);
        // Limpiar notificaciones antiguas (más de 24 horas)
        const ahora = Date.now();
        this.historialNoLeidas = this.historialNoLeidas.filter(n => {
          const fecha = new Date(n.fecha).getTime();
          return (ahora - fecha) < 24 * 60 * 60 * 1000;
        });
        this.guardarHistorialNoLeidas();
      }
    } catch (error) {
      console.warn('Error cargando historial no leídas:', error);
      this.historialNoLeidas = [];
    }
  },

  /**
   * Guarda el historial de notificaciones no leídas
   */
  guardarHistorialNoLeidas() {
    try {
      const key = this.obtenerKeyStorage();
      localStorage.setItem(key, JSON.stringify(this.historialNoLeidas));
    } catch (error) {
      console.warn('Error guardando historial no leídas:', error);
    }
  },

  /**
   * Obtiene la key de storage específica del tenant
   */
  obtenerKeyStorage() {
    const tenantId = window.Auth?.getCurrentUser?.()?.negocioId || 'default';
    return `notificaciones_no_leidas_${tenantId}`;
  },

  /**
   * Actualiza el indicador visual en el connection indicator
   */
  actualizarIndicadorConexion() {
    const indicator = document.getElementById('connectionIndicator');
    if (!indicator) return;

    // Buscar o crear el badge de notificaciones
    let badge = indicator.querySelector('.connection-indicator__notif-badge');
    
    const noLeidas = this.historialNoLeidas.filter(n => !n.leida);
    const criticas = noLeidas.filter(n => n.importancia === 'critica');
    const altas = noLeidas.filter(n => n.importancia === 'alta');

    if (noLeidas.length === 0) {
      // Remover badge si no hay notificaciones
      if (badge) badge.remove();
      indicator.classList.remove('has-notifications', 'has-critical', 'has-warning');
      return;
    }

    // Crear badge si no existe
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'connection-indicator__notif-badge';
      badge.title = 'Notificaciones sin leer';
      indicator.appendChild(badge);
      
      // Agregar evento click
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        this.navegarANotificaciones();
      });
    }

    // Actualizar contenido del badge
    badge.textContent = noLeidas.length > 9 ? '9+' : noLeidas.length;

    // Aplicar clases según importancia
    indicator.classList.add('has-notifications');
    badge.classList.remove('critical', 'warning', 'normal');
    indicator.classList.remove('has-critical', 'has-warning');

    if (criticas.length > 0) {
      badge.classList.add('critical');
      indicator.classList.add('has-critical');
    } else if (altas.length > 0) {
      badge.classList.add('warning');
      indicator.classList.add('has-warning');
    } else {
      badge.classList.add('normal');
    }
  },

  /**
   * Navega al historial de notificaciones
   */
  navegarANotificaciones() {
    const noLeidas = this.historialNoLeidas.filter(n => !n.leida);
    
    if (noLeidas.length === 1) {
      // Si hay solo una, mostrarla en un modal
      this.mostrarNotificacionModal(noLeidas[0]);
    } else {
      // Si hay más de una, ir al historial completo
      if (typeof loadModule === 'function') {
        loadModule('historial-notificaciones');
      } else if (window.location.pathname.includes('dashboard')) {
        window.location.hash = '#historial-notificaciones';
      }
    }
  },

  /**
   * Muestra una notificación en un modal
   */
  mostrarNotificacionModal(notificacion) {
    const iconos = {
      error: 'fa-exclamation-circle text-danger',
      warning: 'fa-exclamation-triangle text-warning',
      success: 'fa-check-circle text-success',
      info: 'fa-info-circle text-info',
    };

    const html = `
      <div class="modal-overlay notif-modal-overlay" onclick="Notificaciones.cerrarModal()">
        <div class="modal-content notif-modal" onclick="event.stopPropagation()" style="max-width: 400px;">
          <div class="modal-header">
            <h3><i class="fas ${iconos[notificacion.tipo] || 'fa-bell'}"></i> Notificación</h3>
            <button class="modal-close" onclick="Notificaciones.cerrarModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <p style="font-size: 1.1rem; margin-bottom: 1rem;">${this.sanitizarHTML(notificacion.mensaje)}</p>
            <small class="text-muted">
              <i class="fas fa-clock"></i> ${new Date(notificacion.fecha).toLocaleString()}
            </small>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" onclick="Notificaciones.marcarLeida('${notificacion.id}'); Notificaciones.cerrarModal();">
              <i class="fas fa-check"></i> Marcar como leída
            </button>
          </div>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.id = 'notif-modal-container';
    container.innerHTML = html;
    document.body.appendChild(container);
  },

  /**
   * Cierra el modal de notificación
   */
  cerrarModal() {
    const container = document.getElementById('notif-modal-container');
    if (container) container.remove();
  },

  /**
   * Marca una notificación como leída
   */
  marcarLeida(notificacionId) {
    const notif = this.historialNoLeidas.find(n => n.id === notificacionId);
    if (notif) {
      notif.leida = true;
      this.guardarHistorialNoLeidas();
      this.actualizarIndicadorConexion();
    }
  },

  /**
   * Marca todas las notificaciones como leídas
   */
  marcarTodasLeidas() {
    this.historialNoLeidas.forEach(n => n.leida = true);
    this.guardarHistorialNoLeidas();
    this.actualizarIndicadorConexion();
  },

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  obtenerConteoNoLeidas() {
    return this.historialNoLeidas.filter(n => !n.leida).length;
  },

  /**
   * Muestra notificación de éxito
   * @param {string} mensaje - Mensaje a mostrar
   * @param {number} duracion - Duración opcional
   * @param {Object} opciones - Opciones adicionales
   */
  exito(mensaje, duracion = null, opciones = {}) {
    this.mostrar(mensaje, 'success', duracion, { noGuardar: true, ...opciones });
  },

  /**
   * Muestra notificación de error
   * @param {string} mensaje - Mensaje a mostrar
   * @param {number} duracion - Duración opcional
   * @param {Object} opciones - Opciones adicionales
   */
  error(mensaje, duracion = null, opciones = {}) {
    this.mostrar(mensaje, 'error', duracion || 5000, opciones); // Errores duran más tiempo y se guardan
  },

  /**
   * Muestra notificación de advertencia
   * @param {string} mensaje - Mensaje a mostrar
   * @param {number} duracion - Duración opcional
   * @param {Object} opciones - Opciones adicionales
   */
  advertencia(mensaje, duracion = null, opciones = {}) {
    this.mostrar(mensaje, 'warning', duracion, opciones);
  },

  /**
   * Muestra notificación informativa
   * @param {string} mensaje - Mensaje a mostrar
   * @param {number} duracion - Duración opcional
   * @param {Object} opciones - Opciones adicionales
   */
  info(mensaje, duracion = null, opciones = {}) {
    this.mostrar(mensaje, 'info', duracion, { noGuardar: true, ...opciones });
  },

  /**
   * Sanitiza HTML para prevenir XSS
   * @param {string} texto - Texto a sanitizar
   * @returns {string} Texto sanitizado
   */
  sanitizarHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  },

  /**
   * Oculta la notificación actual inmediatamente
   */
  ocultar() {
    const ultimo = this.notificacionesActivas.pop();
    if (ultimo) {
      this.cerrarToast(ultimo);
    }
  },

  /**
   * Muestra notificación de carga/procesando
   * @param {string} mensaje - Mensaje a mostrar
   * @returns {Function} Función para ocultar la notificación
   */
  cargando(mensaje = 'Procesando...') {
    const mensajeSanitizado = this.sanitizarHTML(mensaje);
    const toast = this.crearToast({
      tipo: 'info',
      persistente: true,
      contenidoHTML: `<i class="fas fa-spinner fa-spin"></i><span>${mensajeSanitizado}</span>`,
    });

    return () => toast.close();
  },

  /**
   * Muestra notificación persistente (no se oculta automáticamente)
   * @param {string} mensaje - Mensaje a mostrar
   * @param {string} tipo - Tipo de notificación
   * @returns {Function} Función para ocultar la notificación
   */
  persistente(mensaje, tipo = 'info') {
    const icono = this.obtenerIcono(tipo);
    const mensajeSanitizado = this.sanitizarHTML(mensaje);
    const toast = this.crearToast({
      tipo,
      persistente: true,
      contenidoHTML: `
        <i class="fas ${icono}"></i>
        <span>${mensajeSanitizado}</span>
        <button class="toast-close-btn" style="margin-left: 10px; background: transparent; border: none; color: inherit; cursor: pointer;">
          <i class="fas fa-times"></i>
        </button>
      `,
    });

    const closeBtn = toast.element.querySelector('.toast-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        toast.close();
      });
    }

    return () => toast.close();
  },

  /**
   * Muestra una notificación con acción
   * @param {string} mensaje - Mensaje a mostrar
   * @param {string} textoBoton - Texto del botón de acción
   * @param {Function} callback - Función a ejecutar al hacer clic
   * @param {string} tipo - Tipo de notificación
   * @param {number} duracion - Duración en ms (0 = permanente hasta acción)
   */
  conAccion(mensaje, textoBoton, callback, tipo = 'info', duracion = 0) {
    const icono = this.obtenerIcono(tipo);
    const mensajeSanitizado = this.sanitizarHTML(mensaje);
    const botonSanitizado = this.sanitizarHTML(textoBoton);
    const toast = this.crearToast({
      tipo,
      duracion,
      persistente: duracion === 0,
      contenidoHTML: `
        <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
          <i class="fas ${icono}"></i>
          <span style="flex: 1;">${mensajeSanitizado}</span>
          <button class="btn btn-sm btn-primary toast-action-btn" style="margin-left: auto; white-space: nowrap;">
            ${botonSanitizado}
          </button>
          <button class="toast-close-btn" style="background: transparent; border: none; color: inherit; cursor: pointer; padding: 5px;">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `,
    });

    const actionBtn = toast.element.querySelector('.toast-action-btn');
    if (actionBtn) {
      actionBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (typeof callback === 'function') {
          callback();
        }
        toast.close();
      });
    }

    const closeBtn = toast.element.querySelector('.toast-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        toast.close();
      });
    }
  },

  /**
   * Obtiene el icono asociado a un tipo de notificación
   */
  obtenerIcono(tipo) {
    const iconos = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle',
    };
    return iconos[tipo] || iconos.info;
  },

  /**
   * Asegura que el contenedor tenga la posición configurada
   */
  aplicarPosicion() {
    if (!this.toastContainer) {
      return;
    }

    const posiciones = {
      'top-right': {
        top: '20px',
        right: '20px',
        bottom: '',
        left: '',
        align: 'flex-end',
        direction: 'column',
      },
      'top-left': {
        top: '20px',
        left: '20px',
        bottom: '',
        right: '',
        align: 'flex-start',
        direction: 'column',
      },
      'bottom-right': {
        bottom: '20px',
        right: '20px',
        top: '',
        left: '',
        align: 'flex-end',
        direction: 'column-reverse',
      },
      'bottom-left': {
        bottom: '20px',
        left: '20px',
        top: '',
        right: '',
        align: 'flex-start',
        direction: 'column-reverse',
      },
      'top-center': {
        top: '20px',
        left: '50%',
        right: '',
        bottom: '',
        align: 'center',
        direction: 'column',
        transform: 'translateX(-50%)',
      },
      'bottom-center': {
        bottom: '20px',
        left: '50%',
        right: '',
        top: '',
        align: 'center',
        direction: 'column-reverse',
        transform: 'translateX(-50%)',
      },
    };

    const config = posiciones[this.posicion] || posiciones['top-right'];

    this.toastContainer.style.top = config.top || '';
    this.toastContainer.style.right = config.right || '';
    this.toastContainer.style.bottom = config.bottom || '';
    this.toastContainer.style.left = config.left || '';
    this.toastContainer.style.alignItems = config.align;
    this.toastContainer.style.flexDirection = config.direction;
    this.toastContainer.style.transform = config.transform || '';
  },

  /**
   * Crea un toast flotante consistente con el nuevo sistema
   */
  crearToast({ tipo = 'info', contenidoHTML, duracion = null, persistente = false }) {
    if (!this.toastContainer) {
      this.init();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = contenidoHTML;
    this.toastContainer.appendChild(toast);

    const registro = { element: toast, timeoutId: null };
    registro.close = () => this.cerrarToast(registro);

    // Animación de entrada
    requestAnimationFrame(() => toast.classList.add('show'));

    const duracionFinal =
      typeof duracion === 'number' && duracion > 0 ? duracion : this.duracionPorDefecto;

    if (!persistente) {
      registro.timeoutId = setTimeout(
        () => this.cerrarToast(registro),
        Math.max(1500, duracionFinal)
      );
    }

    toast.addEventListener('click', () => this.cerrarToast(registro));

    this.notificacionesActivas.push(registro);
    this.limitarNotificaciones();

    return registro;
  },

  /**
   * Cierra y elimina un toast del DOM
   */
  cerrarToast(registro) {
    if (!registro || !registro.element) {
      return;
    }

    if (registro.timeoutId) {
      clearTimeout(registro.timeoutId);
    }

    const elemento = registro.element;
    elemento.classList.remove('show');
    elemento.addEventListener('transitionend', () => elemento.remove(), { once: true });

    this.notificacionesActivas = this.notificacionesActivas.filter((item) => item !== registro);
  },

  /**
   * Mantiene la cantidad de notificaciones dentro del máximo permitido
   */
  limitarNotificaciones() {
    while (this.notificacionesActivas.length > this.maxNotificaciones) {
      const registro = this.notificacionesActivas.shift();
      this.cerrarToast(registro);
    }
  },
};

// Exportar el módulo globalmente
window.Notificaciones = Notificaciones;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    Notificaciones.init();
  });
} else {
  Notificaciones.init();
}

// Mantener compatibilidad con Utils.showToast
// Redirigir las llamadas a showToast al nuevo sistema
if (window.Utils && window.Utils.showToast) {
  window.Utils.showToast = function (mensaje, tipo = 'info', duracion = 3000) {
    Notificaciones.mostrar(mensaje, tipo, duracion);
  };
}
