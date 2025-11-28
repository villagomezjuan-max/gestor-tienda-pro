// ============================================
// MÓDULO: ATAJOS DE TECLADO
// ============================================
// Sistema de atajos de teclado para acciones comunes

const KeyboardShortcuts = {
  // Mapa de atajos configurados
  shortcuts: {},

  // Estado del modal de ayuda
  helpModalOpen: false,

  /**
   * Inicializa el sistema de atajos de teclado
   */
  init() {
    console.log('Inicializando sistema de atajos de teclado...');

    // Configurar atajos por defecto
    this.setupDefaultShortcuts();

    // Event listener global para teclas
    document.addEventListener('keydown', (e) => {
      this.handleKeyPress(e);
    });

    console.log('Sistema de atajos de teclado inicializado');
  },

  /**
   * Configura los atajos de teclado por defecto
   */
  setupDefaultShortcuts() {
    // Ayuda (?)
    this.register('?', {
      description: 'Mostrar ayuda de atajos',
      action: () => this.showHelp(),
      global: true,
    });

    // F1 - Abrir chatbot
    this.register('F1', {
      description: 'Abrir asistente IA',
      action: () => {
        if (window.ChatAssistant) {
          ChatAssistant.toggleChat();
        }
      },
      global: true,
    });

    // F2 - Nueva venta
    this.register('F2', {
      description: 'Ir a Nueva Venta (POS)',
      action: () => App.loadModule('ventas'),
      global: true,
    });

    // F3 - Buscar producto
    this.register('F3', {
      description: 'Buscar productos',
      action: () => App.loadModule('productos'),
      global: true,
    });

    // Ctrl+S - Guardar (prevenir default del navegador)
    this.register('Ctrl+S', {
      description: 'Guardar (donde aplique)',
      action: (e) => {
        e.preventDefault();
        // Buscar botones de guardar visibles
        const saveButtons = document.querySelectorAll(
          'button[type="submit"]:not([style*="display: none"]), .btn-primary:not([style*="display: none"])'
        );
        if (saveButtons.length > 0) {
          saveButtons[0].click();
        }
      },
      global: true,
    });

    // ESC - Cerrar modales
    this.register('Escape', {
      description: 'Cerrar modales/diálogos',
      action: () => {
        // Cerrar modales visibles
        const modals = document.querySelectorAll('.modal-overlay, .global-search-overlay');
        modals.forEach((modal) => {
          const closeBtn = modal.querySelector('.btn-close, .global-search-close');
          if (closeBtn) {
            closeBtn.click();
          } else {
            modal.remove();
          }
        });
      },
      global: true,
    });

    // Alt+1-9 - Cambiar entre módulos
    for (let i = 1; i <= 9; i++) {
      this.register(`Alt+${i}`, {
        description: `Ir al módulo ${i}`,
        action: () => this.navigateToModule(i),
        global: true,
      });
    }

    // Ctrl+H - Ir a inicio/dashboard
    this.register('Ctrl+H', {
      description: 'Ir al Dashboard',
      action: () => App.loadModule('dashboard'),
      global: true,
    });

    // Ctrl+P - Imprimir
    this.register('Ctrl+P', {
      description: 'Imprimir página actual',
      action: (e) => {
        e.preventDefault();
        window.print();
      },
      global: true,
    });

    // Ctrl+B - Gestión de backups
    this.register('Ctrl+B', {
      description: 'Ir a Backup y Datos',
      action: () => App.loadModule('backup'),
      global: true,
    });
  },

  /**
   * Registra un nuevo atajo de teclado
   * @param {string} key - Combinación de teclas (ej: 'Ctrl+S', 'F1', 'a')
   * @param {Object} config - Configuración del atajo
   */
  register(key, config) {
    this.shortcuts[key.toLowerCase()] = {
      description: config.description || '',
      action: config.action,
      global: config.global || false,
    };
  },

  /**
   * Maneja el evento de pulsación de tecla
   * @param {KeyboardEvent} e - Evento de teclado
   */
  handleKeyPress(e) {
    if (!e || typeof e.key === 'undefined' || e.key === null) {
      return;
    }
    // No ejecutar atajos si estamos en un input o textarea (excepto globales)
    const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

    // Construir la combinación de teclas
    const keys = [];

    if (e.ctrlKey) keys.push('ctrl');
    if (e.altKey) keys.push('alt');
    if (e.shiftKey) keys.push('shift');
    if (e.metaKey) keys.push('meta');

    // Agregar la tecla principal
    const keyValue = typeof e.key === 'string' ? e.key : String(e.key || '');
    if (!keyValue) {
      return;
    }

    const mainKey = keyValue.length === 1 ? keyValue.toLowerCase() : keyValue;
    keys.push(mainKey);

    const combination = keys.join('+');
    const shortcut = this.shortcuts[combination];

    // Si existe el atajo y es global o no estamos en un campo de entrada
    if (shortcut && (shortcut.global || !isInputField)) {
      shortcut.action(e);
    }
  },

  /**
   * Navega al módulo según el número
   * @param {number} moduleNumber - Número del módulo (1-9)
   */
  navigateToModule(moduleNumber) {
    const modules = [
      'dashboard', // Alt+1
      'ventas', // Alt+2
      'productos', // Alt+3
      'clientes', // Alt+4
      'compras', // Alt+5
      'estadisticas', // Alt+6
      'publicidad', // Alt+7
      'notificaciones_inteligentes', // Alt+8
      'configuracion', // Alt+9
    ];

    const module = modules[moduleNumber - 1];
    if (module && App) {
      App.loadModule(module);
    }
  },

  /**
   * Muestra el modal de ayuda con todos los atajos disponibles
   */
  showHelp() {
    if (this.helpModalOpen) return;

    this.helpModalOpen = true;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'keyboardShortcutsModal';

    // Agrupar atajos por categoría
    const categories = {
      General: ['?', 'escape', 'ctrl+h'],
      Navegación: [
        'f1',
        'f2',
        'f3',
        'alt+1',
        'alt+2',
        'alt+3',
        'alt+4',
        'alt+5',
        'alt+6',
        'alt+7',
        'alt+8',
        'alt+9',
      ],
      Acciones: ['ctrl+s', 'ctrl+p', 'ctrl+b', 'ctrl+k'],
    };

    let shortcutsHTML = '';

    Object.keys(categories).forEach((category) => {
      shortcutsHTML += `
        <div class="shortcuts-category">
          <h4 class="shortcuts-category-title">${category}</h4>
          <div class="shortcuts-list">
            ${categories[category]
              .map((key) => {
                const shortcut = this.shortcuts[key];
                if (!shortcut) return '';

                return `
                <div class="shortcut-item">
                  <div class="shortcut-keys">
                    ${this.formatKeyCombo(key)}
                  </div>
                  <div class="shortcut-description">
                    ${shortcut.description}
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>
      `;
    });

    modal.innerHTML = `
      <div class="modal-container" style="max-width: 700px;">
        <div class="modal-header">
          <h3><i class="fas fa-keyboard"></i> Atajos de Teclado</h3>
          <button class="btn-close" onclick="KeyboardShortcuts.closeHelp()">×</button>
        </div>
        <div class="modal-body shortcuts-modal-body">
          ${shortcutsHTML}
          
          <div class="shortcuts-tip">
            <i class="fas fa-lightbulb"></i>
            <p>Presiona <kbd>?</kbd> en cualquier momento para ver esta ayuda</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="KeyboardShortcuts.closeHelp()">
            Cerrar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Cerrar al hacer click fuera
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeHelp();
      }
    });
  },

  /**
   * Cierra el modal de ayuda
   */
  closeHelp() {
    const modal = document.getElementById('keyboardShortcutsModal');
    if (modal) {
      modal.remove();
      this.helpModalOpen = false;
    }
  },

  /**
   * Formatea una combinación de teclas para mostrar
   * @param {string} combo - Combinación de teclas
   * @returns {string} HTML formateado
   */
  formatKeyCombo(combo) {
    const parts = combo.split('+');
    return parts
      .map((part) => {
        // Traducir nombres de teclas
        const translations = {
          ctrl: 'Ctrl',
          alt: 'Alt',
          shift: 'Shift',
          meta: '⌘',
          escape: 'ESC',
          '?': '?',
        };

        const key = translations[part.toLowerCase()] || part.toUpperCase();
        return `<kbd>${key}</kbd>`;
      })
      .join('<span class="key-plus">+</span>');
  },
};

// Exportar módulo globalmente
window.KeyboardShortcuts = KeyboardShortcuts;

// Iniciar automáticamente cuando la página esté lista
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => KeyboardShortcuts.init());
} else {
  KeyboardShortcuts.init();
}
