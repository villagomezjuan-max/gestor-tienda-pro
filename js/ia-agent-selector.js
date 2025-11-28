/* ========================================
   SELECTOR DE AGENTES IA UNIFICADO
   ======================================== */

const IAAgentSelector = {
  initialized: false,
  storagePrefix: 'ia_agent_selector',
  _listenersRegistered: false,

  init() {
    if (this.initialized) return;
    console.log('🚀 Inicializando IAAgentSelector Unificado...');
    this.crearBotonFlotante();
    this.registerGlobalListeners();
    this.initialized = true;
  },

  registerGlobalListeners() {
    if (this._listenersRegistered) return;
    this._listenersRegistered = true;

    this._boundResizeHandler = () => this.handleResize();
    this._boundBusinessHandler = () => this.handleBusinessChange();

    window.addEventListener('resize', this._boundResizeHandler);
    window.addEventListener('businessChanged', this._boundBusinessHandler);
  },

  getStorageKey(suffix) {
    return `${this.storagePrefix}_${suffix}`;
  },

  readStorage(key, fallback = null) {
    const storageKey = this.getStorageKey(key);
    try {
      if (window.TenantStorage && typeof TenantStorage.getJSON === 'function') {
        const value = TenantStorage.getJSON(storageKey, null);
        return value !== null && value !== undefined ? value : fallback;
      }

      const raw = window.localStorage ? window.localStorage.getItem(storageKey) : null;
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn('IAAgentSelector.readStorage: error leyendo', storageKey, error);
      return fallback;
    }
  },

  writeStorage(key, value) {
    const storageKey = this.getStorageKey(key);
    try {
      if (value === null || value === undefined) {
        if (window.TenantStorage && typeof TenantStorage.removeItem === 'function') {
          TenantStorage.removeItem(storageKey);
        } else if (window.localStorage) {
          window.localStorage.removeItem(storageKey);
        }
        return;
      }

      if (window.TenantStorage && typeof TenantStorage.setJSON === 'function') {
        TenantStorage.setJSON(storageKey, value);
      } else if (window.localStorage) {
        window.localStorage.setItem(storageKey, JSON.stringify(value));
      }
    } catch (error) {
      console.warn('IAAgentSelector.writeStorage: error escribiendo', storageKey, error);
    }
  },

  clampPosition(left, top, elemento) {
    const width = elemento ? elemento.offsetWidth : 80;
    const height = elemento ? elemento.offsetHeight : 80;
    const padding = 8;
    const maxX = Math.max(padding, window.innerWidth - width - padding);
    const maxY = Math.max(padding, window.innerHeight - height - padding);

    return {
      left: Math.min(Math.max(left, padding), maxX),
      top: Math.min(Math.max(top, padding), maxY),
    };
  },

  saveButtonPosition(elemento) {
    if (!elemento) return;
    const rect = elemento.getBoundingClientRect();
    const clamped = this.clampPosition(rect.left, rect.top, elemento);
    this.writeStorage('button_position', {
      left: Math.round(clamped.left),
      top: Math.round(clamped.top),
    });
  },

  restoreButtonPosition(elemento) {
    if (!elemento) return;
    const stored = this.readStorage('button_position', null);

    if (stored && typeof stored.left === 'number' && typeof stored.top === 'number') {
      const clamped = this.clampPosition(stored.left, stored.top, elemento);
      elemento.style.left = `${clamped.left}px`;
      elemento.style.top = `${clamped.top}px`;
      elemento.style.right = 'auto';
      elemento.style.bottom = 'auto';

      if (clamped.left !== stored.left || clamped.top !== stored.top) {
        this.writeStorage('button_position', clamped);
      }
    } else {
      elemento.style.left = '';
      elemento.style.top = '';
      elemento.style.right = '';
      elemento.style.bottom = '';
    }
  },

  positionSelectorNearButton() {
    const selector = document.getElementById('whatsappAgentSelector');
    const button = document.getElementById('whatsappIAButton');

    if (!selector || !button) return;

    const buttonRect = button.getBoundingClientRect();
    if (!buttonRect || (buttonRect.width === 0 && buttonRect.height === 0)) {
      return;
    }

    const computed = window.getComputedStyle(selector);
    const wasHidden = computed.display === 'none';
    let previousDisplay;
    let previousVisibility;

    if (wasHidden) {
      previousDisplay = selector.style.display;
      previousVisibility = selector.style.visibility;
      selector.style.visibility = 'hidden';
      selector.style.display = 'block';
    }

    const selectorWidth = selector.offsetWidth || 320;
    const selectorHeight = selector.offsetHeight || 240;

    if (wasHidden) {
      selector.style.display = previousDisplay || 'none';
      selector.style.visibility = previousVisibility || '';
    }

    const margin = 16;
    let left = buttonRect.left + buttonRect.width / 2 - selectorWidth / 2;
    let top = buttonRect.top - selectorHeight - margin;

    if (top < margin) {
      top = buttonRect.bottom + margin;
    }

    const maxLeft = window.innerWidth - selectorWidth - margin;
    const maxTop = window.innerHeight - selectorHeight - margin;

    left = Math.max(margin, Math.min(left, maxLeft));
    top = Math.max(margin, Math.min(top, maxTop));

    selector.style.left = `${Math.round(left)}px`;
    selector.style.top = `${Math.round(top)}px`;
    selector.style.right = 'auto';
    selector.style.bottom = 'auto';
  },

  handleResize() {
    const button = document.getElementById('whatsappIAButton');
    if (button) {
      this.restoreButtonPosition(button);
    }
    this.positionSelectorNearButton();
  },

  handleBusinessChange() {
    const button = document.getElementById('whatsappIAButton');
    if (button) {
      this.restoreButtonPosition(button);
    }
    this.ocultarSelector();
  },

  hacerArrastrable(elemento) {
    if (!elemento || elemento.dataset.dragInitialized === 'true') {
      if (elemento) {
        elemento.dataset.wasDragged = elemento.dataset.wasDragged || 'false';
      }
      return;
    }

    const manager = this;
    let pendingDrag = false;
    let isDragging = false;
    let moved = false;
    let offsetX = 0;
    let offsetY = 0;
    let startX = 0;
    let startY = 0;
    let activePointerId = null;

    elemento.dataset.wasDragged = 'false';
    elemento.dataset.dragInitialized = 'true';

    const clampAndApply = (rawLeft, rawTop) => {
      const clamped = manager.clampPosition(rawLeft, rawTop, elemento);
      elemento.style.left = `${Math.round(clamped.left)}px`;
      elemento.style.top = `${Math.round(clamped.top)}px`;
      elemento.style.right = 'auto';
      elemento.style.bottom = 'auto';
      return clamped;
    };

    const freezeAnimatedPosition = () => {
      const rect = elemento.getBoundingClientRect();
      const computed = window.getComputedStyle(elemento);
      const transform = computed.transform;

      let translateX = 0;
      let translateY = 0;

      if (transform && transform !== 'none') {
        try {
          const matrix = new DOMMatrix(transform);
          translateX = matrix.m41;
          translateY = matrix.m42;
        } catch (error) {
          const matches = transform.match(/matrix\(([^)]+)\)/);
          if (matches && matches[1]) {
            const parts = matches[1].split(',').map(Number);
            if (parts.length >= 6) {
              translateX = parts[4] || 0;
              translateY = parts[5] || 0;
            }
          }
        }
      }

      clampAndApply(rect.left - translateX, rect.top - translateY);
      elemento.style.transform = 'none';
    };

    const activateDrag = (clientX, clientY) => {
      freezeAnimatedPosition();
      pendingDrag = false;
      isDragging = true;
      moved = false;
      startX = clientX;
      startY = clientY;
      const rect = elemento.getBoundingClientRect();
      offsetX = clientX - rect.left;
      offsetY = clientY - rect.top;
      elemento.classList.add('dragging');
      elemento.style.transition = 'none';
    };

    const updateDrag = (clientX, clientY) => {
      if (!isDragging) {
        return;
      }

      clampAndApply(clientX - offsetX, clientY - offsetY);

      if (!moved) {
        const deltaX = clientX - startX;
        const deltaY = clientY - startY;
        if (Math.hypot(deltaX, deltaY) > 6) {
          moved = true;
        }
      }

      manager.positionSelectorNearButton();
    };

    const endDrag = () => {
      pendingDrag = false;
      if (!isDragging) {
        return;
      }

      isDragging = false;
      elemento.classList.remove('dragging');
      elemento.style.transition = '';

      manager.saveButtonPosition(elemento);
      manager.positionSelectorNearButton();

      if (moved) {
        elemento.dataset.wasDragged = 'true';
        setTimeout(() => {
          elemento.dataset.wasDragged = 'false';
        }, 250);
      }

      moved = false;
    };

    if ('PointerEvent' in window) {
      const onPointerDown = (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) {
          return;
        }
        activePointerId = event.pointerId;
        pendingDrag = true;
        startX = event.clientX;
        startY = event.clientY;
        if (elemento.setPointerCapture) {
          try {
            elemento.setPointerCapture(activePointerId);
          } catch (captureError) {
            /* ignore capture failures to keep drag responsive */
          }
        }
        if (event.cancelable) {
          event.preventDefault();
        }
      };

      const onPointerMove = (event) => {
        if (activePointerId === null || event.pointerId !== activePointerId) {
          return;
        }
        if (!isDragging && pendingDrag) {
          const deltaX = event.clientX - startX;
          const deltaY = event.clientY - startY;
          if (Math.hypot(deltaX, deltaY) > 6) {
            activateDrag(event.clientX, event.clientY);
          }
        }

        if (isDragging) {
          updateDrag(event.clientX, event.clientY);
        }

        if (event.cancelable) {
          event.preventDefault();
        }
      };

      const onPointerStop = (event) => {
        if (activePointerId === null || (event && event.pointerId !== activePointerId)) {
          return;
        }
        if (!isDragging) {
          pendingDrag = false;
        }
        if (elemento.releasePointerCapture) {
          try {
            elemento.releasePointerCapture(activePointerId);
          } catch (_) {
            /* ignore */
          }
        }
        activePointerId = null;
        endDrag();
        if (event && event.cancelable) {
          event.preventDefault();
        }
      };

      elemento.addEventListener('pointerdown', onPointerDown);
      elemento.addEventListener('pointermove', onPointerMove);
      elemento.addEventListener('pointerup', onPointerStop);
      elemento.addEventListener('pointercancel', onPointerStop);
      elemento.addEventListener('lostpointercapture', onPointerStop);
    } else {
      const onMouseMove = (event) => {
        if (!isDragging && pendingDrag) {
          const deltaX = event.clientX - startX;
          const deltaY = event.clientY - startY;
          if (Math.hypot(deltaX, deltaY) > 6) {
            activateDrag(event.clientX, event.clientY);
          }
        }

        if (isDragging) {
          updateDrag(event.clientX, event.clientY);
          event.preventDefault();
        }
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        endDrag();
      };

      elemento.addEventListener('mousedown', (event) => {
        if (event.button !== 0) {
          return;
        }
        pendingDrag = true;
        startX = event.clientX;
        startY = event.clientY;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        event.preventDefault();
      });

      const onTouchMove = (event) => {
        const touch = event.touches[0];
        if (!touch) {
          return;
        }
        if (!isDragging && pendingDrag) {
          const deltaX = touch.clientX - startX;
          const deltaY = touch.clientY - startY;
          if (Math.hypot(deltaX, deltaY) > 6) {
            activateDrag(touch.clientX, touch.clientY);
          }
        }

        if (isDragging) {
          updateDrag(touch.clientX, touch.clientY);
          event.preventDefault();
        }
      };

      const onTouchEnd = () => {
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        document.removeEventListener('touchcancel', onTouchEnd);
        endDrag();
      };

      elemento.addEventListener(
        'touchstart',
        (event) => {
          const touch = event.touches[0];
          if (!touch) {
            return;
          }
          startDrag(touch.clientX, touch.clientY);
          document.addEventListener('touchmove', onTouchMove, { passive: false });
          document.addEventListener('touchend', onTouchEnd);
          document.addEventListener('touchcancel', onTouchEnd);
        },
        { passive: true }
      );
    }
  },

  crearBotonFlotante() {
    let button = document.getElementById('whatsappIAButton');
    let selector = document.getElementById('whatsappAgentSelector');

    if (button && selector && button.dataset.initialized === 'true') {
      return;
    }

    if (!selector) {
      selector = document.createElement('div');
      selector.id = 'whatsappAgentSelector';
      selector.className = 'whatsapp-agent-selector';
      selector.style.display = 'none';
      document.body.appendChild(selector);
    } else {
      selector.style.display = 'none';
      selector.classList.remove('show');
    }

    this.actualizarAgentesDisponibles();

    if (!button) {
      button = document.createElement('div');
      button.id = 'whatsappIAButton';
      button.className = 'whatsapp-ia-button';
      button.setAttribute('role', 'button');
      button.setAttribute('tabindex', '0');
      button.setAttribute('aria-label', 'Abrir asistentes inteligentes');
      button.innerHTML = `
                <span class="pulse-ring"></span>
                <div class="assistant-icon">
                    <i class="fas fa-robot"></i>
                </div>
            `;
      document.body.appendChild(button);
    }

    this.restoreButtonPosition(button);

    if (button.dataset.initialized !== 'true') {
      this.hacerArrastrable(button);

      const handleButtonActivate = () => {
        if (button.dataset.wasDragged === 'true') {
          button.dataset.wasDragged = 'false';
          return;
        }
        this.toggleSelector();
      };

      button.addEventListener('click', handleButtonActivate);
      button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleButtonActivate();
        }
      });

      button.dataset.initialized = 'true';
    }

    if (!selector.dataset.initialized) {
      selector.addEventListener('click', (event) => {
        const agentCard = event.target.closest('.agent-card');
        if (agentCard) {
          event.stopPropagation();
          this.selectAgent(agentCard.dataset.agent);
        }
      });
      selector.dataset.initialized = 'true';
    }

    if (!this._outsideClickHandler) {
      this._outsideClickHandler = (event) => {
        if (!selector.contains(event.target) && !button.contains(event.target)) {
          this.ocultarSelector();
        }
      };
      document.addEventListener('click', this._outsideClickHandler);
    }

    this.positionSelectorNearButton();
    console.log('✅ Botón Flotante y Selector de Agentes IA Unificado Creado');
  },

  actualizarAgentesDisponibles() {
    const selector = document.getElementById('whatsappAgentSelector');
    if (!selector) return;

    const agentes = this.getAvailableAgents();

    let cardsHTML = agentes
      .map(
        (agent) => `
            <button class="agent-card" data-agent="${agent.id}" style="--agent-color: ${agent.color};">
                <div class="agent-icon">
                    <i class="fas ${agent.icon}"></i>
                </div>
                <div class="agent-info">
                    <h5>${agent.name}</h5>
                    <p>${agent.description}</p>
                </div>
                <div class="agent-arrow">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </button>
        `
      )
      .join('');

    selector.innerHTML = `
            <div class="agent-selector-header">
                <div class="greeting-icon">
                    <i class="fas fa-hand-sparkles"></i>
                </div>
                <h3>¡Hola! 👋</h3>
                <p>Soy tu asistente inteligente</p>
                <h4>¿En qué puedo ayudarte hoy?</h4>
            </div>
            <div class="agents-grid">
                ${cardsHTML}
            </div>
            <div class="agent-selector-footer">
                <small><i class="fas fa-shield-alt"></i> Tus datos están seguros</small>
            </div>
        `;
  },

  toggleSelector() {
    const selector = document.getElementById('whatsappAgentSelector');
    if (!selector) return;

    this.actualizarAgentesDisponibles();

    const isVisible = selector.classList.contains('show');
    if (isVisible) {
      this.ocultarSelector();
    } else {
      selector.style.display = 'block';
      this.positionSelectorNearButton();
      requestAnimationFrame(() => selector.classList.add('show'));
    }
  },

  ocultarSelector() {
    const selector = document.getElementById('whatsappAgentSelector');
    if (!selector) return;
    selector.classList.remove('show');
    setTimeout(() => {
      selector.style.display = 'none';
    }, 200);
  },

  selectAgent(agentId) {
    console.log('🤖 [IAAgentSelector] Seleccionando agente:', agentId);
    this.ocultarSelector();

    switch (agentId) {
      case 'citas':
        if (window.AgendaIAAgent && typeof window.AgendaIAAgent.abrirChatWhatsApp === 'function') {
          window.AgendaIAAgent.abrirChatWhatsApp();
        } else {
          this.mostrarError('El agente de citas no está disponible o no se pudo abrir.');
        }
        break;
      case 'marketing':
        if (window.ChatAssistant && typeof window.ChatAssistant.openWhatsAppChat === 'function') {
          window.ChatAssistant.openWhatsAppChat('marketing');
        } else {
          this.mostrarError('El asistente de marketing no está disponible.');
        }
        break;
      case 'general':
        if (window.ChatAssistant && typeof window.ChatAssistant.openWhatsAppChat === 'function') {
          window.ChatAssistant.openWhatsAppChat('general');
        } else {
          this.mostrarError('El asistente de ayuda general no está disponible.');
        }
        break;
      case 'vehiculos':
        if (window.VehiculosIAAgent && typeof window.VehiculosIAAgent.openChat === 'function') {
          window.VehiculosIAAgent.openChat();
        } else {
          this.mostrarError('El asistente de vehículos no está disponible.');
        }
        break;
      case 'ordenes-trabajo':
        if (
          window.OrdenesTrabajoIAAgent &&
          typeof window.OrdenesTrabajoIAAgent.abrirChat === 'function'
        ) {
          window.OrdenesTrabajoIAAgent.abrirChat();
        } else {
          this.mostrarError('El asistente de órdenes de trabajo no está disponible.');
        }
        break;
      default:
        this.mostrarError('Agente no reconocido.');
    }
  },

  getAvailableAgents() {
    const agentes = [];

    // Agente de Citas - SIEMPRE primero
    if (window.AgendaIAAgent) {
      agentes.push({
        id: 'citas',
        name: '📅 Agendar Cita',
        icon: 'fa-calendar-check',
        description: 'Programa citas para clientes',
        color: '#667eea',
      });
    }

    // Asistente de Ayuda General
    if (window.ChatAssistant) {
      agentes.push({
        id: 'general',
        name: '💬 Ayuda General',
        icon: 'fa-life-ring',
        description: 'Resuelve dudas del sistema',
        color: '#14b8a6',
      });
    }

    // Asistente de Marketing
    if (window.ChatAssistant) {
      agentes.push({
        id: 'marketing',
        name: '📢 Marketing',
        icon: 'fa-bullhorn',
        description: 'Estrategias y promociones',
        color: '#f97316',
      });
    }

    // Gestión de Vehículos
    if (window.VehiculosIAAgent) {
      agentes.push({
        id: 'vehiculos',
        name: '🚗 Registrar Vehículo',
        icon: 'fa-car',
        description: 'Registro rápido con IA',
        color: '#0ea5e9',
      });
    }

    // Órdenes de Trabajo con IA
    if (window.OrdenesTrabajoIAAgent) {
      agentes.push({
        id: 'ordenes-trabajo',
        name: '🔧 Crear Orden',
        icon: 'fa-tools',
        description: 'Órdenes de trabajo con IA',
        color: '#ff9800',
      });
    }

    return agentes;
  },

  mostrarError(mensaje) {
    if (window.Utils && window.Utils.showToast) {
      Utils.showToast(mensaje, 'error');
    } else {
      alert(mensaje);
    }
  },
};

// Exponer globalmente
window.IAAgentSelector = IAAgentSelector;

// Auto-inicializar
document.addEventListener('DOMContentLoaded', () => {
  // Retraso para asegurar que otros módulos de IA se carguen primero
  setTimeout(() => IAAgentSelector.init(), 1500);
});
