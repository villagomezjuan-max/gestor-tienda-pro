/**
 * ============================================
 * DATA REFRESH MANAGER
 * ============================================
 * Sistema centralizado para actualizar datos sin recargar la página
 * Mantiene el estado del módulo activo y sincroniza la UI automáticamente
 */

(function () {
  'use strict';

  window.DataRefreshManager = {
    // Caché de listeners por módulo
    listeners: new Map(),

    // Estado actual del módulo
    currentModule: null,
    currentState: {},

    /**
     * Inicializar el gestor
     */
    init() {
      console.log('🔄 DataRefreshManager inicializado');

      // Detectar cambio de módulo
      if (window.App) {
        const originalLoadModule = window.App.loadModule;
        window.App.loadModule = async (moduleName) => {
          this.currentModule = moduleName;
          return await originalLoadModule.call(window.App, moduleName);
        };
      }
    },

    /**
     * Registrar un listener para un tipo de datos
     * @param {string} dataType - Tipo de datos (clientes, productos, ventas, etc.)
     * @param {Function} callback - Función a ejecutar cuando se actualicen los datos
     * @param {string} moduleId - ID opcional del módulo que escucha
     */
    on(dataType, callback, moduleId = null) {
      if (!this.listeners.has(dataType)) {
        this.listeners.set(dataType, []);
      }

      this.listeners.get(dataType).push({
        callback,
        moduleId: moduleId || this.currentModule,
      });

      console.log(`📡 Listener registrado para: ${dataType} (${moduleId || this.currentModule})`);
    },

    /**
     * Eliminar listeners de un módulo
     * @param {string} moduleId - ID del módulo
     */
    off(moduleId) {
      this.listeners.forEach((listeners, dataType) => {
        this.listeners.set(
          dataType,
          listeners.filter((l) => l.moduleId !== moduleId)
        );
      });
    },

    /**
     * Notificar que los datos han cambiado
     * @param {string} dataType - Tipo de datos que cambió
     * @param {Object} data - Datos actualizados (opcional)
     * @param {Object} options - Opciones adicionales
     */
    async notify(dataType, data = null, options = {}) {
      console.log(`🔔 Notificando cambio en: ${dataType}`, options);

      const listeners = this.listeners.get(dataType) || [];

      for (const listener of listeners) {
        try {
          await listener.callback(data, options);
        } catch (error) {
          console.error(`Error en listener de ${dataType}:`, error);
        }
      }

      // Emitir evento global para compatibilidad
      window.dispatchEvent(
        new CustomEvent('data-updated', {
          detail: { dataType, data, options },
        })
      );
    },

    /**
     * Guardar el estado actual del módulo
     * @param {Object} state - Estado a guardar
     */
    saveModuleState(state) {
      if (this.currentModule) {
        this.currentState[this.currentModule] = {
          ...state,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(
          `module_state_${this.currentModule}`,
          JSON.stringify(this.currentState[this.currentModule])
        );
      }
    },

    /**
     * Recuperar el estado guardado del módulo
     * @param {string} moduleId - ID del módulo (opcional, usa el actual si no se especifica)
     * @returns {Object|null} Estado guardado o null
     */
    getModuleState(moduleId = null) {
      const module = moduleId || this.currentModule;
      if (!module) return null;

      // Intentar cargar desde memoria
      if (this.currentState[module]) {
        return this.currentState[module];
      }

      // Intentar cargar desde sessionStorage
      try {
        const stored = sessionStorage.getItem(`module_state_${module}`);
        if (stored) {
          this.currentState[module] = JSON.parse(stored);
          return this.currentState[module];
        }
      } catch (error) {
        console.warn('Error al recuperar estado del módulo:', error);
      }

      return null;
    },

    /**
     * Limpiar el estado de un módulo
     * @param {string} moduleId - ID del módulo (opcional)
     */
    clearModuleState(moduleId = null) {
      const module = moduleId || this.currentModule;
      if (module) {
        delete this.currentState[module];
        sessionStorage.removeItem(`module_state_${module}`);
      }
    },

    /**
     * Actualizar datos y notificar sin recargar página
     * @param {string} dataType - Tipo de datos
     * @param {Function} updateFn - Función que realiza la actualización
     * @param {Object} options - Opciones
     */
    async update(dataType, updateFn, options = {}) {
      const {
        showLoading = true,
        showToast = true,
        toastMessage = 'Datos actualizados correctamente',
        preserveState = true,
      } = options;

      try {
        // Guardar estado actual antes de actualizar
        if (preserveState) {
          this.saveModuleState({
            scrollPosition: window.scrollY,
            ...options.state,
          });
        }

        // Mostrar indicador de carga si es necesario
        if (showLoading && window.Utils) {
          const loader = document.createElement('div');
          loader.id = 'data-refresh-loader';
          loader.className = 'data-refresh-loader';
          loader.innerHTML = '<div class="spinner"></div>';
          document.body.appendChild(loader);
        }

        // Ejecutar la actualización
        const result = await updateFn();

        // Notificar a los listeners
        await this.notify(dataType, result, options);

        // Mostrar mensaje de éxito
        if (showToast && window.Utils) {
          Utils.showToast(toastMessage, 'success');
        }

        // Restaurar estado si es necesario
        if (preserveState) {
          const state = this.getModuleState();
          if (state && state.scrollPosition !== undefined) {
            setTimeout(() => {
              window.scrollTo(0, state.scrollPosition);
            }, 100);
          }
        }

        return result;
      } catch (error) {
        console.error(`Error al actualizar ${dataType}:`, error);
        if (window.Utils) {
          Utils.showToast(error?.message || 'Error al actualizar datos', 'error');
        }
        throw error;
      } finally {
        // Remover indicador de carga
        const loader = document.getElementById('data-refresh-loader');
        if (loader) {
          loader.remove();
        }
      }
    },

    /**
     * Helper para actualizar una tabla/lista específica
     * @param {string} containerId - ID del contenedor
     * @param {Function} renderFn - Función que genera el HTML actualizado
     * @param {Array} data - Datos actualizados
     */
    async updateTable(containerId, renderFn, data) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.warn(`Contenedor ${containerId} no encontrado`);
        return;
      }

      // Guardar scroll de la tabla si existe
      const scrollParent = container.closest('.table-body');
      const scrollTop = scrollParent ? scrollParent.scrollTop : 0;

      // Actualizar contenido
      container.innerHTML = await renderFn(data);

      // Restaurar scroll
      if (scrollParent) {
        scrollParent.scrollTop = scrollTop;
      }

      // Aplicar efectos de transición
      container.classList.add('fade-in');
      setTimeout(() => {
        container.classList.remove('fade-in');
      }, 300);
    },

    /**
     * Helper para actualizar estadísticas
     * @param {Object} stats - Objeto con los valores de estadísticas
     */
    updateStats(stats) {
      Object.entries(stats).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element) {
          // Animar cambio de valor
          element.classList.add('stat-updating');
          setTimeout(() => {
            element.textContent = value;
            element.classList.remove('stat-updating');
          }, 150);
        }
      });
    },
  };

  // CSS para el loader y animaciones
  const style = document.createElement('style');
  style.textContent = `
    .data-refresh-loader {
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--card-bg, #fff);
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideIn 0.3s ease;
    }

    .data-refresh-loader .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--primary-light, #e3f2fd);
      border-top-color: var(--primary-color, #2196f3);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .fade-in {
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .stat-updating {
      animation: pulse 0.3s ease;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); color: var(--primary-color, #2196f3); }
    }
  `;
  document.head.appendChild(style);

  // Inicializar automáticamente
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      DataRefreshManager.init();
    });
  } else {
    DataRefreshManager.init();
  }
})();
