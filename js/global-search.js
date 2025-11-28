// ============================================
// MÓDULO: BÚSQUEDA GLOBAL
// ============================================
// Sistema de búsqueda global con ⌘K (Ctrl+K)
// Busca en productos, clientes, ventas, proveedores

const GlobalSearch = {
  // Estado del buscador
  isOpen: false,
  currentResults: [],
  selectedIndex: 0,
  searchHistory: [],
  MAX_HISTORY: 10,

  /**
   * Inicializa el sistema de búsqueda global
   * Configura atajos de teclado y carga historial
   */
  init() {
    console.log('Inicializando búsqueda global...');

    // Cargar historial de búsquedas
    this.loadHistory();

    // Atajo de teclado: Ctrl+K o Cmd+K
    document.addEventListener('keydown', (e) => {
      // Ctrl+K o Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }

      // ESC para cerrar
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }

      // Navegación con flechas cuando está abierto
      if (this.isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.selectNext();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.selectPrevious();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.executeSelected();
        }
      }
    });

    console.log('Búsqueda global inicializada');
  },

  /**
   * Alterna la visibilidad del buscador
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  },

  /**
   * Abre el buscador
   */
  open() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.render();

    // Focus en el input después de renderizar
    setTimeout(() => {
      const input = document.getElementById('globalSearchInput');
      if (input) input.focus();
    }, 100);
  },

  /**
   * Cierra el buscador
   */
  close() {
    this.isOpen = false;
    const modal = document.getElementById('globalSearchModal');
    if (modal) {
      modal.remove();
    }
    this.currentResults = [];
    this.selectedIndex = 0;
  },

  /**
   * Renderiza el modal de búsqueda
   */
  render() {
    // Remover modal existente si hay
    const existingModal = document.getElementById('globalSearchModal');
    if (existingModal) existingModal.remove();

    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'global-search-overlay';
    modal.id = 'globalSearchModal';

    modal.innerHTML = `
      <div class="global-search-container">
        <div class="global-search-header">
          <div class="search-icon">
            <i class="fas fa-search"></i>
          </div>
          <input
            type="text"
            id="globalSearchInput"
            class="global-search-input"
            placeholder="Buscar productos, clientes, ventas, proveedores..."
            autocomplete="off"
          />
          <button class="global-search-close" onclick="GlobalSearch.close()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="global-search-body" id="globalSearchResults">
          ${this.renderInitialState()}
        </div>

        <div class="global-search-footer">
          <div class="search-shortcuts">
            <span><kbd>↑</kbd><kbd>↓</kbd> Navegar</span>
            <span><kbd>Enter</kbd> Seleccionar</span>
            <span><kbd>ESC</kbd> Cerrar</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Click fuera del container para cerrar
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.close();
      }
    });

    // Event listener para el input
    const input = document.getElementById('globalSearchInput');
    if (input) {
      input.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });
    }
  },

  /**
   * Renderiza el estado inicial (historial + sugerencias)
   * @returns {string} HTML del estado inicial
   */
  renderInitialState() {
    const history = this.searchHistory.slice(0, 5);

    return `
      <div class="search-section">
        ${
          history.length > 0
            ? `
          <div class="search-section-header">
            <i class="fas fa-history"></i>
            Búsquedas recientes
          </div>
          <div class="search-results">
            ${history
              .map(
                (query) => `
              <div class="search-result-item" onclick="GlobalSearch.searchFromHistory('${query}')">
                <i class="fas fa-clock"></i>
                <span>${Utils.escapeHTML(query)}</span>
              </div>
            `
              )
              .join('')}
          </div>
        `
            : ''
        }

        <div class="search-section-header">
          <i class="fas fa-bolt"></i>
          Accesos rápidos
        </div>
        <div class="search-results">
          <div class="search-result-item" onclick="App.loadModule('ventas'); GlobalSearch.close();">
            <i class="fas fa-cash-register"></i>
            <span>Nueva Venta (POS)</span>
          </div>
          <div class="search-result-item" onclick="App.loadModule('productos'); GlobalSearch.close();">
            <i class="fas fa-box"></i>
            <span>Ver Productos</span>
          </div>
          <div class="search-result-item" onclick="App.loadModule('clientes'); GlobalSearch.close();">
            <i class="fas fa-users"></i>
            <span>Ver Clientes</span>
          </div>
          <div class="search-result-item" onclick="App.loadModule('estadisticas'); GlobalSearch.close();">
            <i class="fas fa-chart-bar"></i>
            <span>Estadísticas</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Maneja la búsqueda con debounce
   * @param {string} query - Texto de búsqueda
   */
  handleSearch: Utils.debounce(function (query) {
    GlobalSearch.search(query);
  }, 300),

  /**
   * Ejecuta la búsqueda
   * @param {string} query - Texto de búsqueda
   */
  search(query) {
    query = query.trim();

    if (query.length < 2) {
      // Mostrar estado inicial
      const resultsContainer = document.getElementById('globalSearchResults');
      if (resultsContainer) {
        resultsContainer.innerHTML = this.renderInitialState();
      }
      this.currentResults = [];
      this.selectedIndex = 0;
      return;
    }

    // Realizar búsqueda en todas las colecciones
    const results = {
      productos: this.buscarEnProductos(query),
      clientes: this.buscarEnClientes(query),
      ventas: this.buscarEnVentas(query),
      proveedores: this.buscarEnProveedores(query),
    };

    // Aplanar resultados en un solo array
    this.currentResults = [
      ...results.productos,
      ...results.clientes,
      ...results.ventas,
      ...results.proveedores,
    ];

    this.selectedIndex = 0;

    // Renderizar resultados
    this.renderResults(results, query);

    // Guardar en historial
    this.addToHistory(query);
  },

  /**
   * Busca en la colección de productos
   * @param {string} query - Texto de búsqueda
   * @returns {Array} Resultados encontrados
   */
  buscarEnProductos(query) {
    const productos = Database.getCollection('productos');
    const queryLower = query.toLowerCase();

    return productos
      .filter((p) => {
        return (
          p.nombre?.toLowerCase().includes(queryLower) ||
          p.codigo?.toLowerCase().includes(queryLower) ||
          p.descripcion?.toLowerCase().includes(queryLower)
        );
      })
      .slice(0, 5)
      .map((p) => ({
        type: 'producto',
        id: p.id,
        title: p.nombre,
        subtitle: `Código: ${p.codigo} | Stock: ${p.stock} | ${Utils.formatCurrency(p.precioVenta)}`,
        icon: 'fa-box',
        action: () => {
          App.loadModule('productos');
          this.close();
        },
      }));
  },

  /**
   * Busca en la colección de clientes
   * @param {string} query - Texto de búsqueda
   * @returns {Array} Resultados encontrados
   */
  buscarEnClientes(query) {
    const clientes = Database.getCollection('clientes');
    const queryLower = query.toLowerCase();

    return clientes
      .filter((c) => {
        return (
          c.nombre?.toLowerCase().includes(queryLower) ||
          c.cedula?.includes(query) ||
          c.telefono?.includes(query) ||
          c.email?.toLowerCase().includes(queryLower)
        );
      })
      .slice(0, 5)
      .map((c) => ({
        type: 'cliente',
        id: c.id,
        title: c.nombre,
        subtitle: `${c.cedula || ''} | ${c.telefono || ''} | ${c.email || ''}`,
        icon: 'fa-user',
        action: () => {
          App.loadModule('clientes');
          this.close();
        },
      }));
  },

  /**
   * Busca en la colección de ventas
   * @param {string} query - Texto de búsqueda
   * @returns {Array} Resultados encontrados
   */
  buscarEnVentas(query) {
    const ventas = Database.getCollection('ventas');
    const queryLower = query.toLowerCase();

    return ventas
      .filter((v) => {
        return (
          v.numero?.toLowerCase().includes(queryLower) ||
          v.cliente?.toLowerCase().includes(queryLower)
        );
      })
      .slice(0, 5)
      .map((v) => ({
        type: 'venta',
        id: v.id,
        title: `Venta ${v.numero}`,
        subtitle: `Cliente: ${v.cliente} | ${Utils.formatDate(v.fecha)} | ${Utils.formatCurrency(v.total)}`,
        icon: 'fa-receipt',
        action: () => {
          App.loadModule('historial-ventas');
          this.close();
        },
      }));
  },

  /**
   * Busca en la colección de proveedores
   * @param {string} query - Texto de búsqueda
   * @returns {Array} Resultados encontrados
   */
  buscarEnProveedores(query) {
    const proveedores = Database.getCollection('proveedores');
    const queryLower = query.toLowerCase();

    return proveedores
      .filter((p) => {
        return (
          p.nombre?.toLowerCase().includes(queryLower) ||
          p.contacto?.toLowerCase().includes(queryLower) ||
          p.telefono?.includes(query) ||
          p.email?.toLowerCase().includes(queryLower)
        );
      })
      .slice(0, 5)
      .map((p) => ({
        type: 'proveedor',
        id: p.id,
        title: p.nombre,
        subtitle: `Contacto: ${p.contacto || ''} | ${p.telefono || ''} | ${p.email || ''}`,
        icon: 'fa-truck',
        action: () => {
          App.loadModule('proveedores');
          this.close();
        },
      }));
  },

  /**
   * Renderiza los resultados de búsqueda
   * @param {Object} results - Resultados agrupados por categoría
   * @param {string} query - Query de búsqueda
   */
  renderResults(results, query) {
    const resultsContainer = document.getElementById('globalSearchResults');
    if (!resultsContainer) return;

    const totalResults = this.currentResults.length;

    if (totalResults === 0) {
      resultsContainer.innerHTML = `
        <div class="search-empty">
          <i class="fas fa-search"></i>
          <p>No se encontraron resultados para "<strong>${Utils.escapeHTML(query)}</strong>"</p>
        </div>
      `;
      return;
    }

    let html = '<div class="search-section">';

    // Productos
    if (results.productos.length > 0) {
      html += `
        <div class="search-section-header">
          <i class="fas fa-box"></i>
          Productos (${results.productos.length})
        </div>
        <div class="search-results">
          ${results.productos.map((item, index) => this.renderResultItem(item, index)).join('')}
        </div>
      `;
    }

    // Clientes
    if (results.clientes.length > 0) {
      html += `
        <div class="search-section-header">
          <i class="fas fa-user"></i>
          Clientes (${results.clientes.length})
        </div>
        <div class="search-results">
          ${results.clientes
            .map((item, index) => {
              const globalIndex = results.productos.length + index;
              return this.renderResultItem(item, globalIndex);
            })
            .join('')}
        </div>
      `;
    }

    // Ventas
    if (results.ventas.length > 0) {
      html += `
        <div class="search-section-header">
          <i class="fas fa-receipt"></i>
          Ventas (${results.ventas.length})
        </div>
        <div class="search-results">
          ${results.ventas
            .map((item, index) => {
              const globalIndex = results.productos.length + results.clientes.length + index;
              return this.renderResultItem(item, globalIndex);
            })
            .join('')}
        </div>
      `;
    }

    // Proveedores
    if (results.proveedores.length > 0) {
      html += `
        <div class="search-section-header">
          <i class="fas fa-truck"></i>
          Proveedores (${results.proveedores.length})
        </div>
        <div class="search-results">
          ${results.proveedores
            .map((item, index) => {
              const globalIndex =
                results.productos.length + results.clientes.length + results.ventas.length + index;
              return this.renderResultItem(item, globalIndex);
            })
            .join('')}
        </div>
      `;
    }

    html += '</div>';

    resultsContainer.innerHTML = html;
  },

  /**
   * Renderiza un item de resultado
   * @param {Object} item - Item a renderizar
   * @param {number} index - Índice en la lista de resultados
   * @returns {string} HTML del item
   */
  renderResultItem(item, index) {
    const isSelected = index === this.selectedIndex;
    return `
      <div 
        class="search-result-item ${isSelected ? 'selected' : ''}" 
        onclick="GlobalSearch.executeResult(${index})"
        data-index="${index}"
      >
        <i class="fas ${item.icon}"></i>
        <div class="result-info">
          <div class="result-title">${Utils.escapeHTML(item.title)}</div>
          <div class="result-subtitle">${Utils.escapeHTML(item.subtitle)}</div>
        </div>
      </div>
    `;
  },

  /**
   * Selecciona el siguiente resultado
   */
  selectNext() {
    if (this.currentResults.length === 0) return;

    this.selectedIndex = (this.selectedIndex + 1) % this.currentResults.length;
    this.updateSelectedItem();
  },

  /**
   * Selecciona el resultado anterior
   */
  selectPrevious() {
    if (this.currentResults.length === 0) return;

    this.selectedIndex =
      (this.selectedIndex - 1 + this.currentResults.length) % this.currentResults.length;
    this.updateSelectedItem();
  },

  /**
   * Actualiza el item seleccionado visualmente
   */
  updateSelectedItem() {
    const items = document.querySelectorAll('.search-result-item');
    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('selected');
      }
    });
  },

  /**
   * Ejecuta la acción del resultado seleccionado
   */
  executeSelected() {
    if (this.currentResults.length === 0) return;
    this.executeResult(this.selectedIndex);
  },

  /**
   * Ejecuta la acción de un resultado específico
   * @param {number} index - Índice del resultado
   */
  executeResult(index) {
    const result = this.currentResults[index];
    if (!result) return;

    if (result.action) {
      result.action();
    }
  },

  /**
   * Busca desde el historial
   * @param {string} query - Query del historial
   */
  searchFromHistory(query) {
    const input = document.getElementById('globalSearchInput');
    if (input) {
      input.value = query;
      this.search(query);
    }
  },

  /**
   * Agrega una búsqueda al historial
   * @param {string} query - Query a agregar
   */
  addToHistory(query) {
    if (!query || query.length < 2) return;

    // Remover duplicados
    this.searchHistory = this.searchHistory.filter((q) => q !== query);

    // Agregar al inicio
    this.searchHistory.unshift(query);

    // Limitar tamaño
    if (this.searchHistory.length > this.MAX_HISTORY) {
      this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY);
    }

    // Guardar en localStorage
    this.saveHistory();
  },

  /**
   * Guarda el historial en localStorage
   */
  saveHistory() {
    try {
      if (window.TenantStorage && typeof TenantStorage.setJSON === 'function') {
        TenantStorage.setJSON('globalSearchHistory', this.searchHistory);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('globalSearchHistory', JSON.stringify(this.searchHistory));
      }
    } catch (error) {
      console.error('Error al guardar historial de búsqueda:', error);
    }
  },

  /**
   * Carga el historial desde localStorage
   */
  loadHistory() {
    try {
      let history = null;
      if (window.TenantStorage && typeof TenantStorage.getJSON === 'function') {
        history = TenantStorage.getJSON('globalSearchHistory', null);
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('globalSearchHistory');
        history = raw ? JSON.parse(raw) : null;
      }
      if (history) {
        this.searchHistory = history;
      }
    } catch (error) {
      console.error('Error al cargar historial de búsqueda:', error);
      this.searchHistory = [];
    }
  },

  /**
   * Limpia el historial de búsqueda
   */
  clearHistory() {
    this.searchHistory = [];
    this.saveHistory();
    if (window.TenantStorage && typeof TenantStorage.removeItem === 'function') {
      TenantStorage.removeItem('globalSearchHistory');
    } else if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('globalSearchHistory');
    }
  },
};

// Exportar módulo globalmente
window.GlobalSearch = GlobalSearch;

// Iniciar automáticamente cuando la página esté lista
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => GlobalSearch.init());
} else {
  GlobalSearch.init();
}
