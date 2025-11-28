/* ========================================
   SISTEMA DE NIVELES DE STOCK (SEMÁFORO)
   Gestión centralizada de alertas por niveles
   ======================================== */

const StockLevelManager = {
  // Configuración de umbrales
  config: {
    umbralVerde: 1.2, // 120% del stock mínimo
    umbralAmarillo: 1.0, // 100% del stock mínimo (exacto)
    umbralNaranja: 10, // Stock absoluto <= 10 unidades
    umbralCritico: 2, // Stock absoluto <= 2 unidades
    stockMinimoDefault: 10, // Valor por defecto si no está configurado
  },

  // Niveles de stock con metadatos
  niveles: {
    'sin-stock': {
      nombre: 'Sin Stock',
      color: '#000000',
      bgColor: '#f0f0f0',
      badge: '⚫',
      icon: 'fa-times-circle',
      prioridad: 0,
      accion: 'block',
      mensaje: 'Producto sin stock - No disponible para venta',
    },
    'critico-1': {
      nombre: 'Crítico (1 unidad)',
      color: '#ffffff',
      bgColor: '#dc3545',
      badge: '🔴',
      icon: 'fa-exclamation-triangle',
      prioridad: 1,
      accion: 'alert-immediate',
      mensaje: '¡ÚLTIMA UNIDAD! Reabastecer inmediatamente',
    },
    'critico-2': {
      nombre: 'Crítico (2 unidades)',
      color: '#ffffff',
      bgColor: '#dc3545',
      badge: '🔴',
      icon: 'fa-exclamation-triangle',
      prioridad: 2,
      accion: 'alert-immediate',
      mensaje: 'Stock crítico - Solo 2 unidades disponibles',
    },
    naranja: {
      nombre: 'Muy Bajo',
      color: '#000000',
      bgColor: '#fd7e14',
      badge: '🟠',
      icon: 'fa-exclamation',
      prioridad: 3,
      accion: 'alert-urgent',
      mensaje: 'Stock muy bajo - Comprar urgente',
    },
    amarillo: {
      nombre: 'Bajo',
      color: '#000000',
      bgColor: '#ffc107',
      badge: '🟡',
      icon: 'fa-info-circle',
      prioridad: 4,
      accion: 'alert-soon',
      mensaje: 'Stock bajo - Planificar reabastecimiento',
    },
    'verde-bajo': {
      nombre: 'Aceptable',
      color: '#000000',
      bgColor: '#90ee90',
      badge: '🟢',
      icon: 'fa-check-circle',
      prioridad: 5,
      accion: 'monitor',
      mensaje: 'Stock aceptable - Monitorear',
    },
    verde: {
      nombre: 'Normal',
      color: '#ffffff',
      bgColor: '#28a745',
      badge: '✅',
      icon: 'fa-check-circle',
      prioridad: 6,
      accion: 'ok',
      mensaje: 'Stock normal',
    },
  },

  /**
   * Calcula el nivel de stock de un producto
   * @param {Object} producto - Objeto producto con stock y stockMinimo
   * @returns {Object} Información completa del nivel
   */
  getStockLevel(producto) {
    if (!producto) {
      return this.niveles['sin-stock'];
    }

    const stock = Number(producto.stock) || 0;
    const stockMinimo = Number(producto.stockMinimo) || this.config.stockMinimoDefault;
    const umbralVerde = stockMinimo * this.config.umbralVerde;

    // Sin stock
    if (stock === 0) {
      return { ...this.niveles['sin-stock'], stock, stockMinimo };
    }

    // Crítico - 1 unidad
    if (stock === 1) {
      return { ...this.niveles['critico-1'], stock, stockMinimo };
    }

    // Crítico - 2 unidades
    if (stock === 2) {
      return { ...this.niveles['critico-2'], stock, stockMinimo };
    }

    // Naranja - Muy bajo (hasta 10 unidades)
    if (stock <= this.config.umbralNaranja) {
      return { ...this.niveles['naranja'], stock, stockMinimo };
    }

    // Amarillo - Bajo (igual o menor al mínimo)
    if (stock <= stockMinimo) {
      return { ...this.niveles['amarillo'], stock, stockMinimo };
    }

    // Verde bajo - Aceptable (hasta 120% del mínimo)
    if (stock <= umbralVerde) {
      return { ...this.niveles['verde-bajo'], stock, stockMinimo };
    }

    // Verde - Normal
    return { ...this.niveles['verde'], stock, stockMinimo };
  },

  /**
   * Genera HTML para badge de stock
   * @param {Object} producto - Producto
   * @param {Object} options - Opciones de renderizado
   * @returns {String} HTML del badge
   */
  renderStockBadge(producto, options = {}) {
    const nivel = this.getStockLevel(producto);
    const showIcon = options.showIcon !== false;
    const showText = options.showText !== false;
    const size = options.size || 'md'; // sm, md, lg

    const sizeClasses = {
      sm: 'stock-badge-sm',
      md: 'stock-badge-md',
      lg: 'stock-badge-lg',
    };

    return `
      <span class="stock-level-badge ${sizeClasses[size]}" 
            style="background-color: ${nivel.bgColor}; color: ${nivel.color};"
            title="${nivel.mensaje}"
            data-stock-level="${nivel.prioridad}">
        ${showIcon ? `<i class="fas ${nivel.icon}"></i>` : ''}
        ${showText ? `<span>${nivel.stock}</span>` : nivel.badge}
      </span>
    `;
  },

  /**
   * Genera clase CSS para el nivel de stock
   * @param {Object} producto - Producto
   * @returns {String} Clase CSS
   */
  getStockClass(producto) {
    const nivel = this.getStockLevel(producto);
    return `stock-level-${nivel.prioridad}`;
  },

  /**
   * Valida si un producto puede venderse
   * @param {Object} producto - Producto
   * @param {Number} cantidadSolicitada - Cantidad a vender
   * @returns {Object} Resultado de validación
   */
  validarDisponibilidad(producto, cantidadSolicitada) {
    const stock = Number(producto.stock) || 0;
    const cantidad = Number(cantidadSolicitada) || 1;
    const nivel = this.getStockLevel(producto);

    // Sin stock
    if (stock === 0) {
      return {
        valido: false,
        tipo: 'error',
        mensaje: `${producto.nombre} no tiene stock disponible`,
        stockDisponible: 0,
        cantidadMaxima: 0,
        requiereConfirmacion: false,
        bloquear: true,
      };
    }

    // Stock insuficiente
    if (cantidad > stock) {
      return {
        valido: false,
        tipo: 'warning',
        mensaje: `Stock insuficiente para ${producto.nombre}. Disponible: ${stock}, Solicitado: ${cantidad}`,
        stockDisponible: stock,
        cantidadMaxima: stock,
        requiereConfirmacion: true,
        bloquear: false,
        sugerencia: `Puedes agregar hasta ${stock} unidades`,
      };
    }

    // Stock suficiente pero crítico (1-2 unidades)
    if (nivel.prioridad <= 2) {
      const quedaran = stock - cantidad;
      return {
        valido: true,
        tipo: 'warning',
        mensaje: `⚠️ Advertencia: ${producto.nombre} tiene stock crítico (${stock} unidades). Después de esta venta quedarán ${quedaran} unidades.`,
        stockDisponible: stock,
        cantidadMaxima: stock,
        requiereConfirmacion: true,
        bloquear: false,
        advertencia: `Stock crítico - Considera notificar al proveedor`,
      };
    }

    // Stock bajo pero suficiente
    if (nivel.prioridad <= 4) {
      const quedaran = stock - cantidad;
      return {
        valido: true,
        tipo: 'info',
        mensaje: `Stock bajo en ${producto.nombre}. Disponible: ${stock}, Quedarán: ${quedaran}`,
        stockDisponible: stock,
        cantidadMaxima: stock,
        requiereConfirmacion: false,
        bloquear: false,
        advertencia: quedaran <= 2 ? 'Quedará en nivel crítico' : null,
      };
    }

    // Stock normal
    return {
      valido: true,
      tipo: 'success',
      mensaje: 'Stock disponible',
      stockDisponible: stock,
      cantidadMaxima: stock,
      requiereConfirmacion: false,
      bloquear: false,
    };
  },

  /**
   * Obtiene productos filtrados por nivel de stock
   * @param {Array} productos - Lista de productos
   * @param {Array} niveles - Niveles a filtrar (prioridades)
   * @returns {Array} Productos filtrados
   */
  filtrarPorNivel(productos, niveles = [0, 1, 2, 3]) {
    if (!Array.isArray(productos)) return [];

    return productos
      .filter((p) => {
        const nivel = this.getStockLevel(p);
        return niveles.includes(nivel.prioridad);
      })
      .sort((a, b) => {
        const nivelA = this.getStockLevel(a);
        const nivelB = this.getStockLevel(b);
        return nivelA.prioridad - nivelB.prioridad;
      });
  },

  /**
   * Genera estadísticas de stock por niveles
   * @param {Array} productos - Lista de productos
   * @returns {Object} Estadísticas
   */
  generarEstadisticas(productos) {
    if (!Array.isArray(productos)) return {};

    const stats = {
      total: productos.length,
      sinStock: 0,
      criticos: 0,
      naranjas: 0,
      amarillos: 0,
      verdes: 0,
      porNivel: {},
    };

    productos.forEach((p) => {
      const nivel = this.getStockLevel(p);

      if (nivel.prioridad === 0) stats.sinStock++;
      else if (nivel.prioridad <= 2) stats.criticos++;
      else if (nivel.prioridad === 3) stats.naranjas++;
      else if (nivel.prioridad === 4) stats.amarillos++;
      else stats.verdes++;

      const key = `nivel_${nivel.prioridad}`;
      stats.porNivel[key] = (stats.porNivel[key] || 0) + 1;
    });

    stats.requierenAtencion = stats.sinStock + stats.criticos + stats.naranjas;
    stats.porcentajeSaludable = ((stats.verdes / stats.total) * 100).toFixed(1);

    return stats;
  },

  /**
   * Calcula cantidad sugerida para reabastecimiento
   * @param {Object} producto - Producto
   * @returns {Number} Cantidad sugerida
   */
  calcularCantidadReabastecimiento(producto) {
    const stock = Number(producto.stock) || 0;
    const stockMinimo = Number(producto.stockMinimo) || this.config.stockMinimoDefault;
    const nivel = this.getStockLevel(producto);

    // Sin stock o crítico: ordenar el doble del mínimo
    if (nivel.prioridad <= 2) {
      return stockMinimo * 2 - stock;
    }

    // Stock bajo: ordenar hasta alcanzar 150% del mínimo
    if (nivel.prioridad <= 4) {
      return Math.max(stockMinimo * 1.5 - stock, stockMinimo);
    }

    // Stock normal: no requiere reabastecimiento inmediato
    return 0;
  },

  /**
   * Inicializa estilos CSS para badges
   */
  initStyles() {
    const styleId = 'stock-level-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .stock-level-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.85rem;
        white-space: nowrap;
        transition: all 0.2s ease;
      }

      .stock-level-badge:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }

      .stock-badge-sm {
        padding: 2px 6px;
        font-size: 0.75rem;
      }

      .stock-badge-md {
        padding: 4px 8px;
        font-size: 0.85rem;
      }

      .stock-badge-lg {
        padding: 6px 12px;
        font-size: 1rem;
      }

      .stock-level-badge i {
        font-size: 0.9em;
      }

      /* Clases de nivel para aplicar a cards/rows */
      .stock-level-0 { border-left: 4px solid #000000 !important; }
      .stock-level-1,
      .stock-level-2 { border-left: 4px solid #dc3545 !important; }
      .stock-level-3 { border-left: 4px solid #fd7e14 !important; }
      .stock-level-4 { border-left: 4px solid #ffc107 !important; }
      .stock-level-5 { border-left: 4px solid #90ee90 !important; }
      .stock-level-6 { border-left: 4px solid #28a745 !important; }

      /* Producto deshabilitado (sin stock) */
      .product-disabled {
        opacity: 0.5;
        pointer-events: none;
        position: relative;
      }

      .product-disabled::after {
        content: 'SIN STOCK';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-15deg);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 1.2rem;
        z-index: 10;
      }
    `;
    document.head.appendChild(style);
  },
};

// Inicializar estilos al cargar
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => StockLevelManager.initStyles());
  } else {
    StockLevelManager.initStyles();
  }
}

// Exportar globalmente
window.StockLevelManager = StockLevelManager;
