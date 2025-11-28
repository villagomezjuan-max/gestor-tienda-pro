// ============================================
// SISTEMA DE NOTIFICACIONES FLOTANTES ESTILO WHATSAPP
// ============================================
// Sistema global para todas las notificaciones de la aplicación
// Elimina cualquier sidebar/panel fijo - TODO es flotante

window.WhatsAppNotifications = {
  notifications: [],
  maxNotifications: 5,
  currentId: 1,

  // ============================================
  // MOSTRAR NOTIFICACIÓN FLOTANTE
  // ============================================
  show(message, type = 'info', options = {}) {
    const notification = {
      id: this.currentId++,
      message,
      type,
      timestamp: new Date(),
      duration: options.duration || this.getDefaultDuration(type),
      position: options.position || 'top-right',
      actions: options.actions || [],
      persistent: options.persistent || false,
    };

    // Agregar a la lista
    this.notifications.push(notification);

    // Crear elemento de notificación
    const element = this.createNotificationElement(notification);

    // Posicionar y mostrar
    this.positionNotification(element, notification.position);

    // Auto-remover si no es persistente
    if (!notification.persistent) {
      setTimeout(() => {
        this.remove(notification.id);
      }, notification.duration);
    }

    // Limitar cantidad de notificaciones
    if (this.notifications.length > this.maxNotifications) {
      const oldest = this.notifications.shift();
      this.remove(oldest.id);
    }

    console.log(`📢 [WhatsAppNotifications] ${type}: ${message}`);
    return notification.id;
  },

  // ============================================
  // CREAR ELEMENTO DE NOTIFICACIÓN
  // ============================================
  createNotificationElement(notification) {
    const container = document.createElement('div');
    container.id = `whatsapp-notification-${notification.id}`;
    container.className = `whatsapp-notification ${notification.type} position-${notification.position}`;

    const iconMap = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle',
      cita: 'fa-calendar-plus',
      venta: 'fa-shopping-cart',
      inventario: 'fa-boxes',
      cliente: 'fa-user-plus',
    };

    const colorMap = {
      success: '#25d366',
      error: '#ff4757',
      warning: '#ffa502',
      info: '#667eea',
      cita: '#667eea',
      venta: '#25d366',
      inventario: '#ff6b35',
      cliente: '#764ba2',
    };

    const icon = iconMap[notification.type] || 'fa-bell';
    const color = colorMap[notification.type] || '#667eea';

    container.innerHTML = `
            <div class="notification-content" style="--accent-color: ${color}">
                <div class="notification-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="notification-body">
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
                </div>
                ${notification.actions.length > 0 ? this.createActionsHTML(notification.actions, notification.id) : ''}
                <div class="notification-close" onclick="WhatsAppNotifications.remove(${notification.id})">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="notification-progress" style="background: ${color}"></div>
        `;

    document.body.appendChild(container);

    // Animación de entrada
    setTimeout(() => {
      container.classList.add('show');
    }, 100);

    return container;
  },

  // ============================================
  // CREAR BOTONES DE ACCIÓN
  // ============================================
  createActionsHTML(actions, notificationId) {
    if (actions.length === 0) return '';

    return `
            <div class="notification-actions">
                ${actions
                  .map(
                    (action) => `
                    <button class="notification-btn" 
                            style="background: var(--accent-color)"
                            onclick="${action.callback}; WhatsAppNotifications.remove(${notificationId});">
                        <i class="fas ${action.icon || 'fa-check'}"></i>
                        ${action.label}
                    </button>
                `
                  )
                  .join('')}
            </div>
        `;
  },

  // ============================================
  // POSICIONAR NOTIFICACIÓN
  // ============================================
  positionNotification(element, position) {
    const existingNotifications = document.querySelectorAll(
      `.whatsapp-notification.position-${position}.show`
    );
    const offset = existingNotifications.length * 120; // Altura + margen

    const positions = {
      'top-right': { top: 20 + offset, right: 20 },
      'top-left': { top: 20 + offset, left: 20 },
      'bottom-right': { bottom: 20 + offset, right: 20 },
      'bottom-left': { bottom: 20 + offset, left: 20 },
      'top-center': { top: 20 + offset, left: '50%', transform: 'translateX(-50%)' },
      'bottom-center': { bottom: 20 + offset, left: '50%', transform: 'translateX(-50%)' },
    };

    const pos = positions[position] || positions['top-right'];

    Object.keys(pos).forEach((key) => {
      element.style[key] = typeof pos[key] === 'number' ? `${pos[key]}px` : pos[key];
    });
  },

  // ============================================
  // REMOVER NOTIFICACIÓN
  // ============================================
  remove(id) {
    const element = document.getElementById(`whatsapp-notification-${id}`);
    if (element) {
      element.classList.add('hide');

      setTimeout(() => {
        element.remove();
        // Reposicionar notificaciones restantes
        this.repositionNotifications();
      }, 300);
    }

    // Remover de la lista
    this.notifications = this.notifications.filter((n) => n.id !== id);
  },

  // ============================================
  // REPOSICIONAR DESPUÉS DE REMOVER
  // ============================================
  repositionNotifications() {
    const positions = [
      'top-right',
      'top-left',
      'bottom-right',
      'bottom-left',
      'top-center',
      'bottom-center',
    ];

    positions.forEach((position) => {
      const notifications = document.querySelectorAll(
        `.whatsapp-notification.position-${position}.show`
      );

      notifications.forEach((notification, index) => {
        const offset = index * 120;

        if (position.includes('top')) {
          notification.style.top = `${20 + offset}px`;
        } else if (position.includes('bottom')) {
          notification.style.bottom = `${20 + offset}px`;
        }
      });
    });
  },

  // ============================================
  // UTILIDADES
  // ============================================
  getDefaultDuration(type) {
    const durations = {
      success: 4000,
      info: 5000,
      warning: 6000,
      error: 8000,
      cita: 7000,
      venta: 5000,
      inventario: 5000,
      cliente: 4000,
    };
    return durations[type] || 5000;
  },

  formatTime(timestamp) {
    const now = new Date();
    const diff = now - timestamp;

    if (diff < 60000) {
      // Menos de 1 minuto
      return 'Ahora';
    } else if (diff < 3600000) {
      // Menos de 1 hora
      const minutes = Math.floor(diff / 60000);
      return `Hace ${minutes}m`;
    } else if (diff < 86400000) {
      // Menos de 1 día
      const hours = Math.floor(diff / 3600000);
      return `Hace ${hours}h`;
    } else {
      return timestamp.toLocaleDateString('es');
    }
  },

  // ============================================
  // LIMPIAR TODAS LAS NOTIFICACIONES
  // ============================================
  clear() {
    this.notifications.forEach((notification) => {
      this.remove(notification.id);
    });
    this.notifications = [];
  },

  // ============================================
  // MÉTODOS DE CONVENIENCIA
  // ============================================
  success(message, options = {}) {
    return this.show(message, 'success', options);
  },

  error(message, options = {}) {
    return this.show(message, 'error', options);
  },

  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  },

  info(message, options = {}) {
    return this.show(message, 'info', options);
  },

  cita(message, options = {}) {
    return this.show(message, 'cita', options);
  },

  venta(message, options = {}) {
    return this.show(message, 'venta', options);
  },

  inventario(message, options = {}) {
    return this.show(message, 'inventario', options);
  },

  cliente(message, options = {}) {
    return this.show(message, 'cliente', options);
  },

  // ============================================
  // CREAR ESTILOS
  // ============================================
  init() {
    this.createStyles();
    console.log('✅ Sistema de notificaciones WhatsApp inicializado');
  },

  createStyles() {
    if (document.getElementById('whatsappNotificationStyles')) return;

    const styles = document.createElement('style');
    styles.id = 'whatsappNotificationStyles';
    styles.innerHTML = `
            /* ================================================
               NOTIFICACIONES WHATSAPP FLOTANTES 
               ================================================ */
            .whatsapp-notification {
                position: fixed;
                width: 380px;
                max-width: calc(100vw - 40px);
                background: #2a2f32;
                border-radius: 15px;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
                z-index: 20000;
                transform: translateX(400px);
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                overflow: hidden;
                border: 1px solid #3a3f42;
            }

            .whatsapp-notification.show {
                transform: translateX(0);
                opacity: 1;
            }

            .whatsapp-notification.hide {
                transform: translateX(400px);
                opacity: 0;
            }

            .whatsapp-notification.position-top-left,
            .whatsapp-notification.position-bottom-left {
                transform: translateX(-400px);
            }

            .whatsapp-notification.position-top-left.show,
            .whatsapp-notification.position-bottom-left.show {
                transform: translateX(0);
            }

            .whatsapp-notification.position-top-left.hide,
            .whatsapp-notification.position-bottom-left.hide {
                transform: translateX(-400px);
            }

            .notification-content {
                padding: 20px;
                display: flex;
                align-items: flex-start;
                gap: 15px;
                position: relative;
            }

            .notification-icon {
                width: 45px;
                height: 45px;
                border-radius: 50%;
                background: var(--accent-color);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            }

            .notification-icon i {
                font-size: 20px;
                color: white;
            }

            .notification-body {
                flex: 1;
                min-width: 0;
            }

            .notification-message {
                color: #e1f5fe;
                font-size: 15px;
                line-height: 1.4;
                margin-bottom: 6px;
                word-wrap: break-word;
            }

            .notification-time {
                color: #9e9e9e;
                font-size: 12px;
            }

            .notification-actions {
                display: flex;
                gap: 10px;
                margin-top: 15px;
                flex-wrap: wrap;
            }

            .notification-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 20px;
                color: white;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }

            .notification-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            }

            .notification-btn i {
                font-size: 12px;
            }

            .notification-close {
                position: absolute;
                top: 15px;
                right: 15px;
                width: 25px;
                height: 25px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                color: #9e9e9e;
            }

            .notification-close:hover {
                background: rgba(255, 255, 255, 0.2);
                color: #e1f5fe;
                transform: scale(1.1);
            }

            .notification-close i {
                font-size: 12px;
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                width: 100%;
                animation: progressShrink var(--duration, 5s) linear;
                border-radius: 0 0 15px 15px;
            }

            @keyframes progressShrink {
                from { width: 100%; }
                to { width: 0%; }
            }

            /* Variantes de color específicas */
            .whatsapp-notification.success .notification-progress {
                background: #25d366;
            }

            .whatsapp-notification.error .notification-progress {
                background: #ff4757;
            }

            .whatsapp-notification.warning .notification-progress {
                background: #ffa502;
            }

            .whatsapp-notification.info .notification-progress {
                background: #667eea;
            }

            /* Hover effect para toda la notificación */
            .whatsapp-notification:hover {
                transform: scale(1.02);
                box-shadow: 0 16px 50px rgba(0, 0, 0, 0.5);
            }

            .whatsapp-notification:hover .notification-progress {
                animation-play-state: paused;
            }

            /* Responsive */
            @media (max-width: 480px) {
                .whatsapp-notification {
                    width: calc(100vw - 20px);
                    left: 10px !important;
                    right: 10px !important;
                    transform: translateY(-100px);
                }

                .whatsapp-notification.show {
                    transform: translateY(0);
                }

                .whatsapp-notification.hide {
                    transform: translateY(-100px);
                }

                .notification-content {
                    padding: 16px;
                }

                .notification-icon {
                    width: 40px;
                    height: 40px;
                }

                .notification-icon i {
                    font-size: 18px;
                }

                .notification-message {
                    font-size: 14px;
                }
            }

            /* Animaciones de entrada más suaves */
            .whatsapp-notification {
                animation: notificationBounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            }

            @keyframes notificationBounceIn {
                0% {
                    transform: translateX(400px) scale(0.3);
                    opacity: 0;
                }
                50% {
                    transform: translateX(-10px) scale(1.05);
                }
                70% {
                    transform: translateX(5px) scale(0.9);
                }
                100% {
                    transform: translateX(0) scale(1);
                    opacity: 1;
                }
            }
        `;

    document.head.appendChild(styles);
  },
};

// Inicializar automáticamente
document.addEventListener('DOMContentLoaded', () => {
  WhatsAppNotifications.init();
});

// Hacer compatible con el sistema de toast existente
window.showToast = function (message, type = 'info', duration = 5000) {
  WhatsAppNotifications.show(message, type, { duration });
};

// Alias global
window.toast = WhatsAppNotifications;
