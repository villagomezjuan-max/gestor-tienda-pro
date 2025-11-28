// ============================================
// MÓDULO: NOTIFICACIONES PUSH
// ============================================
// Sistema de notificaciones push y permisos

const PushNotifications = {
  // Estado de las notificaciones
  permission: null,
  registration: null,

  getFlag(key) {
    try {
      if (window.TenantStorage && typeof TenantStorage.getItem === 'function') {
        return TenantStorage.getItem(key);
      }
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`PushNotifications.getFlag: no se pudo obtener ${key}`, error);
      return null;
    }
  },

  setFlag(key, value) {
    try {
      if (window.TenantStorage && typeof TenantStorage.setItem === 'function') {
        if (value === null || value === undefined) {
          TenantStorage.removeItem(key);
        } else {
          TenantStorage.setItem(key, value);
        }
      } else if (typeof localStorage !== 'undefined') {
        if (value === null || value === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, value);
        }
      }
    } catch (error) {
      console.warn(`PushNotifications.setFlag: no se pudo guardar ${key}`, error);
    }
  },

  /**
   * Inicializa el sistema de notificaciones
   */
  async init() {
    console.log('Inicializando sistema de notificaciones...');

    // Verificar soporte
    if (!('Notification' in window)) {
      console.log('Este navegador no soporta notificaciones');
      return;
    }

    // Obtener estado actual del permiso
    this.permission = Notification.permission;

    // Si ya están permitidas, configurar
    if (this.permission === 'granted') {
      await this.setupNotifications();
    }

    // Verificar recordatorios pendientes cada minuto
    this.startNotificationChecker();

    console.log('Sistema de notificaciones inicializado');
  },

  /**
   * Solicita permiso para notificaciones
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      Utils.showToast('Este navegador no soporta notificaciones', 'error');
      return false;
    }

    if (this.permission === 'granted') {
      Utils.showToast('Las notificaciones ya están habilitadas', 'info');
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;

      if (permission === 'granted') {
        Utils.showToast('Notificaciones habilitadas correctamente', 'success');
        await this.setupNotifications();

        // Mostrar notificación de prueba
        this.showTestNotification();
        return true;
      } else if (permission === 'denied') {
        Utils.showToast('Permisos de notificación denegados', 'warning');
        return false;
      } else {
        Utils.showToast('Permisos de notificación no otorgados', 'warning');
        return false;
      }
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      Utils.showToast('Error al solicitar permisos de notificación', 'error');
      return false;
    }
  },

  /**
   * Configura las notificaciones
   */
  async setupNotifications() {
    try {
      // Registrar Service Worker si no está registrado
      if ('serviceWorker' in navigator) {
        this.registration = await navigator.serviceWorker.ready;
        console.log('Service Worker listo para notificaciones');
      }
    } catch (error) {
      console.error('Error al configurar notificaciones:', error);
    }
  },

  /**
   * Muestra una notificación de prueba
   */
  showTestNotification() {
    this.showNotification({
      title: 'Notificaciones Activadas',
      body: 'Recibirás alertas de recordatorios y eventos importantes',
      icon: '/icons/icon-192x192.png',
      tag: 'test-notification',
    });
  },

  /**
   * Muestra una notificación
   * @param {Object} options - Opciones de la notificación
   */
  async showNotification(options) {
    if (this.permission !== 'granted') {
      console.log('No hay permisos para mostrar notificaciones');
      return;
    }

    const defaultOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [100, 50, 100],
      requireInteraction: false,
      tag: 'notification-' + Date.now(),
    };

    const notificationOptions = { ...defaultOptions, ...options };

    try {
      if (this.registration && this.registration.showNotification) {
        // Usar Service Worker para notificaciones persistentes
        await this.registration.showNotification(
          options.title || 'Gestor Tienda Pro',
          notificationOptions
        );
      } else {
        // Usar API de notificaciones estándar
        new Notification(options.title || 'Gestor Tienda Pro', notificationOptions);
      }

      console.log('Notificación mostrada:', options.title);
    } catch (error) {
      console.error('Error al mostrar notificación:', error);
    }
  },

  /**
   * Inicia el verificador de recordatorios
   */
  startNotificationChecker() {
    // Verificar cada minuto
    setInterval(() => {
      this.checkReminders();
    }, 60000); // 60 segundos

    // Verificar inmediatamente
    setTimeout(() => {
      this.checkReminders();
    }, 5000);
  },

  /**
   * Verifica recordatorios que necesitan notificación
   */
  checkReminders() {
    if (this.permission !== 'granted') {
      return;
    }

    const recordatorios = Database.getCollection('recordatorios');
    const ahora = new Date();

    recordatorios.forEach((recordatorio) => {
      if (recordatorio.completado) return;

      const fechaRecordatorio = new Date(recordatorio.fecha + ' ' + recordatorio.hora);
      const diferencia = fechaRecordatorio - ahora;

      // Notificar 15 minutos antes
      const quincMinutos = 15 * 60 * 1000;

      if (diferencia > 0 && diferencia <= quincMinutos) {
        // Verificar si ya se notificó
        const yaNotificado = this.getFlag(`notified_${recordatorio.id}`);

        if (!yaNotificado) {
          this.notifyReminder(recordatorio);
          this.setFlag(`notified_${recordatorio.id}`, 'true');
        }
      }

      // Notificar si ya pasó la hora (vencido)
      if (diferencia < 0 && diferencia > -60000) {
        // Hace menos de 1 minuto
        const yaNotificadoVencido = this.getFlag(`notified_overdue_${recordatorio.id}`);

        if (!yaNotificadoVencido) {
          this.notifyOverdueReminder(recordatorio);
          this.setFlag(`notified_overdue_${recordatorio.id}`, 'true');
        }
      }
    });

    // Verificar productos con stock bajo
    this.checkLowStock();
  },

  /**
   * Notifica un recordatorio próximo
   * @param {Object} recordatorio - Recordatorio a notificar
   */
  notifyReminder(recordatorio) {
    const iconos = {
      publicidad: '📢',
      pago: '💰',
      cobro: '💵',
      reabastecimiento: '📦',
      reunion: '🤝',
      tarea: '✅',
      general: '📌',
    };

    const icono = iconos[recordatorio.tipo] || '📌';

    this.showNotification({
      title: `${icono} Recordatorio Próximo`,
      body: `${recordatorio.titulo} - ${recordatorio.fecha} ${recordatorio.hora}`,
      tag: `reminder-${recordatorio.id}`,
      requireInteraction: true,
      actions: [
        {
          action: 'complete',
          title: 'Marcar Completado',
        },
        {
          action: 'view',
          title: 'Ver Detalles',
        },
      ],
      data: {
        type: 'reminder',
        id: recordatorio.id,
        url: '/dashboard.html#recordatorios',
      },
    });

    // Vibración especial
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  },

  /**
   * Notifica un recordatorio vencido
   * @param {Object} recordatorio - Recordatorio vencido
   */
  notifyOverdueReminder(recordatorio) {
    this.showNotification({
      title: '⚠️ Recordatorio Vencido',
      body: `${recordatorio.titulo} - ${recordatorio.fecha} ${recordatorio.hora}`,
      tag: `reminder-overdue-${recordatorio.id}`,
      requireInteraction: true,
      data: {
        type: 'reminder-overdue',
        id: recordatorio.id,
        url: '/dashboard.html#recordatorios',
      },
    });

    // También mostrar toast con acción para usuarios en la app
    if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
      Utils.showToast(
        `📌 ${recordatorio.titulo} - En ${Math.round((new Date(recordatorio.fecha + ' ' + recordatorio.hora) - new Date()) / 60000)} min`,
        'warning',
        {
          actionUrl: '#recordatorios',
          actionLabel: 'Ver recordatorio',
          duration: 10000,
        }
      );
    }
  },

  /**
   * Verifica productos con stock bajo y notifica
   */
  checkLowStock() {
    const productos = Database.getCollection('productos');
    const productosStockBajo = productos.filter((p) => p.stock <= p.stockMinimo && p.stock > 0);

    if (productosStockBajo.length > 0) {
      const yaNotificado = this.getFlag('notified_low_stock_' + new Date().toDateString());

      if (!yaNotificado) {
        this.showNotification({
          title: '⚠️ Alerta de Stock Bajo',
          body: `${productosStockBajo.length} producto(s) con stock bajo`,
          tag: 'low-stock-alert',
          data: {
            type: 'low-stock',
            url: '/dashboard.html#productos',
          },
        });

        // También mostrar toast con acción dentro de la app
        if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
          Utils.showToast(
            `⚠️ ${productosStockBajo.length} producto(s) con stock bajo. Haz clic para revisar el inventario.`,
            'warning',
            {
              actionUrl: '#productos',
              actionLabel: 'Ver productos',
              duration: 10000,
            }
          );
        }

        this.setFlag('notified_low_stock_' + new Date().toDateString(), 'true');
      }
    }
  },

  /**
   * Obtiene el estado de los permisos
   * @returns {string} Estado del permiso
   */
  getPermissionStatus() {
    if (!('Notification' in window)) {
      return 'not-supported';
    }
    return Notification.permission;
  },

  /**
   * Verifica si las notificaciones están habilitadas
   * @returns {boolean} True si están habilitadas
   */
  isEnabled() {
    return this.permission === 'granted';
  },

  /**
   * Muestra un modal para solicitar permisos
   */
  showPermissionModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'notificationPermissionModal';

    modal.innerHTML = `
      <div class="modal-container" style="max-width: 500px;">
        <div class="modal-header">
          <h3><i class="fas fa-bell"></i> Habilitar Notificaciones</h3>
          <button class="btn-close" onclick="document.getElementById('notificationPermissionModal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div style="text-align: center; padding: 2rem 0;">
            <i class="fas fa-bell" style="font-size: 4rem; color: var(--warning-color); margin-bottom: 1rem;"></i>
            <p style="font-size: 1.125rem; margin-bottom: 1rem;">
              <strong>Recibe alertas importantes</strong>
            </p>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
              Te notificaremos sobre:
            </p>
            <ul style="text-align: left; max-width: 350px; margin: 0 auto 1.5rem;">
              <li style="margin-bottom: 0.5rem;">
                <i class="fas fa-check" style="color: var(--success-color);"></i>
                Recordatorios próximos (15 min antes)
              </li>
              <li style="margin-bottom: 0.5rem;">
                <i class="fas fa-check" style="color: var(--success-color);"></i>
                Productos con stock bajo
              </li>
              <li style="margin-bottom: 0.5rem;">
                <i class="fas fa-check" style="color: var(--success-color);"></i>
                Cuentas por cobrar vencidas
              </li>
              <li style="margin-bottom: 0.5rem;">
                <i class="fas fa-check" style="color: var(--success-color);"></i>
                Eventos importantes
              </li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('notificationPermissionModal').remove()">
            Ahora No
          </button>
          <button class="btn btn-primary" onclick="PushNotifications.requestPermission().then(() => document.getElementById('notificationPermissionModal').remove())">
            <i class="fas fa-bell"></i> Habilitar Notificaciones
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },
};

// Exportar módulo globalmente
window.PushNotifications = PushNotifications;

// Iniciar automáticamente
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PushNotifications.init());
} else {
  PushNotifications.init();
}
