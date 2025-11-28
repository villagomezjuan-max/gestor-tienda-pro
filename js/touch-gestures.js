// ============================================
// MÓDULO: GESTOS TOUCH MÓVILES
// ============================================
// Sistema de gestos táctiles para mejorar experiencia móvil

const TouchGestures = {
  // Configuración de gestos
  config: {
    swipeThreshold: 50, // Distancia mínima para detectar swipe (px)
    longPressDelay: 500, // Tiempo para long press (ms)
    doubleTapDelay: 300, // Tiempo máximo entre taps para double tap
    pinchThreshold: 50, // Distancia mínima para detectar pinch
  },

  // Estado de los gestos
  state: {
    touchStartX: 0,
    touchStartY: 0,
    touchEndX: 0,
    touchEndY: 0,
    touchStartTime: 0,
    lastTapTime: 0,
    longPressTimer: null,
    initialDistance: 0,
    currentScale: 1,
  },

  // Elementos con gestos especiales
  gestureElements: new Map(),

  /**
   * Inicializa el sistema de gestos táctiles
   */
  init() {
    console.log('Inicializando gestos táctiles...');

    // Solo inicializar en dispositivos táctiles
    if (!('ontouchstart' in window)) {
      console.log('No es dispositivo táctil, gestos deshabilitados');
      return;
    }

    this.setupGlobalGestures();
    this.setupTableGestures();
    this.setupModalGestures();

    console.log('Gestos táctiles inicializados');
  },

  /**
   * Configura gestos globales
   */
  setupGlobalGestures() {
    // Swipe horizontal en el content area para navegación
    const contentArea = document.getElementById('contentArea');
    if (contentArea) {
      this.enableSwipe(contentArea, {
        onSwipeLeft: () => {
          // Siguiente en historial (si aplica)
          console.log('Swipe left detectado');
        },
        onSwipeRight: () => {
          // Volver (si aplica)
          console.log('Swipe right detectado');
          this.handleBackNavigation();
        },
      });
    }
  },

  /**
   * Configura gestos en tablas
   */
  setupTableGestures() {
    // Observar tablas dinámicas
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Buscar tablas en el nodo agregado
            const tables = node.querySelectorAll ? node.querySelectorAll('table') : [];
            tables.forEach((table) => {
              this.enableTableRefresh(table);
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  },

  /**
   * Configura gestos en modales
   */
  setupModalGestures() {
    // Observar modales
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList && node.classList.contains('modal-overlay')) {
            this.enableModalSwipeDown(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
    });
  },

  /**
   * Habilita swipe en un elemento
   * @param {HTMLElement} element - Elemento donde habilitar swipe
   * @param {Object} callbacks - Callbacks para cada dirección
   */
  enableSwipe(element, callbacks = {}) {
    element.addEventListener(
      'touchstart',
      (e) => {
        this.state.touchStartX = e.touches[0].clientX;
        this.state.touchStartY = e.touches[0].clientY;
        this.state.touchStartTime = Date.now();
      },
      { passive: true }
    );

    element.addEventListener(
      'touchend',
      (e) => {
        this.state.touchEndX = e.changedTouches[0].clientX;
        this.state.touchEndY = e.changedTouches[0].clientY;

        this.handleSwipe(callbacks);
      },
      { passive: true }
    );
  },

  /**
   * Maneja la detección de swipe
   * @param {Object} callbacks - Callbacks para cada dirección
   */
  handleSwipe(callbacks) {
    const deltaX = this.state.touchEndX - this.state.touchStartX;
    const deltaY = this.state.touchEndY - this.state.touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Verificar si es un swipe válido (más horizontal que vertical)
    if (absDeltaX > this.config.swipeThreshold && absDeltaX > absDeltaY) {
      if (deltaX > 0 && callbacks.onSwipeRight) {
        callbacks.onSwipeRight();
      } else if (deltaX < 0 && callbacks.onSwipeLeft) {
        callbacks.onSwipeLeft();
      }
    } else if (absDeltaY > this.config.swipeThreshold && absDeltaY > absDeltaX) {
      if (deltaY > 0 && callbacks.onSwipeDown) {
        callbacks.onSwipeDown();
      } else if (deltaY < 0 && callbacks.onSwipeUp) {
        callbacks.onSwipeUp();
      }
    }
  },

  /**
   * Habilita long press en un elemento
   * @param {HTMLElement} element - Elemento
   * @param {Function} callback - Callback al detectar long press
   */
  enableLongPress(element, callback) {
    element.addEventListener(
      'touchstart',
      (e) => {
        this.state.longPressTimer = setTimeout(() => {
          callback(e);
          // Vibración háptica si está disponible
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }, this.config.longPressDelay);
      },
      { passive: true }
    );

    element.addEventListener(
      'touchend',
      () => {
        if (this.state.longPressTimer) {
          clearTimeout(this.state.longPressTimer);
        }
      },
      { passive: true }
    );

    element.addEventListener(
      'touchmove',
      () => {
        if (this.state.longPressTimer) {
          clearTimeout(this.state.longPressTimer);
        }
      },
      { passive: true }
    );
  },

  /**
   * Habilita double tap en un elemento
   * @param {HTMLElement} element - Elemento
   * @param {Function} callback - Callback al detectar double tap
   */
  enableDoubleTap(element, callback) {
    element.addEventListener(
      'touchend',
      (e) => {
        const currentTime = Date.now();
        const tapInterval = currentTime - this.state.lastTapTime;

        if (tapInterval < this.config.doubleTapDelay && tapInterval > 0) {
          callback(e);
          // Vibración háptica
          if (navigator.vibrate) {
            navigator.vibrate([30, 50, 30]);
          }
        }

        this.state.lastTapTime = currentTime;
      },
      { passive: true }
    );
  },

  /**
   * Habilita refresh con swipe down en tablas
   * @param {HTMLElement} table - Tabla
   */
  enableTableRefresh(table) {
    const wrapper = table.closest('.table-wrapper') || table.parentElement;
    if (!wrapper) return;

    let startY = 0;
    let pulling = false;
    let refreshIndicator = null;

    wrapper.addEventListener(
      'touchstart',
      (e) => {
        // Solo si estamos en el tope del scroll
        if (wrapper.scrollTop === 0) {
          startY = e.touches[0].clientY;
          pulling = true;

          // Crear indicador de refresh
          if (!refreshIndicator) {
            refreshIndicator = document.createElement('div');
            refreshIndicator.className = 'pull-refresh-indicator';
            refreshIndicator.innerHTML = '<i class="fas fa-sync-alt"></i>';
            wrapper.prepend(refreshIndicator);
          }
        }
      },
      { passive: true }
    );

    wrapper.addEventListener(
      'touchmove',
      (e) => {
        if (!pulling) return;

        const currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;

        if (pullDistance > 0 && pullDistance < 100) {
          if (refreshIndicator) {
            refreshIndicator.style.transform = `translateY(${pullDistance}px)`;
            refreshIndicator.style.opacity = pullDistance / 100;
          }
        }
      },
      { passive: true }
    );

    wrapper.addEventListener(
      'touchend',
      (e) => {
        if (!pulling) return;

        const endY = e.changedTouches[0].clientY;
        const pullDistance = endY - startY;

        if (pullDistance > 80) {
          // Trigger refresh
          if (refreshIndicator) {
            refreshIndicator.classList.add('refreshing');
          }

          // Simular refresh
          setTimeout(() => {
            if (refreshIndicator) {
              refreshIndicator.remove();
              refreshIndicator = null;
            }

            // Recargar módulo actual
            if (App && App.currentModule) {
              App.loadModule(App.currentModule);
            }

            Utils.showToast('Datos actualizados', 'success');
          }, 1000);
        } else {
          // Cancelar refresh
          if (refreshIndicator) {
            refreshIndicator.style.transform = '';
            refreshIndicator.style.opacity = '';
          }
        }

        pulling = false;
      },
      { passive: true }
    );
  },

  /**
   * Habilita swipe down para cerrar modal
   * @param {HTMLElement} modal - Modal
   */
  enableModalSwipeDown(modal) {
    const modalContainer = modal.querySelector(
      '.modal-container, .global-search-container, .chat-assistant-window'
    );
    if (!modalContainer) return;

    this.enableSwipe(modalContainer, {
      onSwipeDown: () => {
        // Cerrar modal con animación
        modal.style.animation = 'slideOutDown 0.3s ease';
        setTimeout(() => {
          modal.remove();
        }, 300);
      },
    });
  },

  /**
   * Maneja la navegación hacia atrás
   */
  handleBackNavigation() {
    // Verificar si hay modal abierto
    const modals = document.querySelectorAll('.modal-overlay:not([style*="display: none"])');
    if (modals.length > 0) {
      // Cerrar el último modal
      const lastModal = modals[modals.length - 1];
      const closeBtn = lastModal.querySelector('.btn-close, .global-search-close');
      if (closeBtn) {
        closeBtn.click();
      } else {
        lastModal.remove();
      }
      return;
    }

    // Si no hay modales, volver al dashboard
    if (App && App.currentModule !== 'dashboard') {
      App.loadModule('dashboard');
      Utils.showToast('Volver al inicio', 'info');
    }
  },

  /**
   * Habilita pinch to zoom en un elemento
   * @param {HTMLElement} element - Elemento
   * @param {Function} callback - Callback con el scale
   */
  enablePinchZoom(element, callback) {
    let initialDistance = 0;
    let currentScale = 1;

    element.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialDistance = this.getDistance(e.touches[0], e.touches[1]);
      }
    });

    element.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialDistance;
        currentScale = scale;

        if (callback) {
          callback(scale);
        }
      }
    });

    element.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        initialDistance = 0;
      }
    });
  },

  /**
   * Calcula la distancia entre dos puntos táctiles
   * @param {Touch} touch1 - Primer toque
   * @param {Touch} touch2 - Segundo toque
   * @returns {number} Distancia
   */
  getDistance(touch1, touch2) {
    const deltaX = touch2.clientX - touch1.clientX;
    const deltaY = touch2.clientY - touch1.clientY;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  },
};

// Exportar módulo globalmente
window.TouchGestures = TouchGestures;

// Iniciar automáticamente cuando la página esté lista
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => TouchGestures.init());
} else {
  TouchGestures.init();
}
