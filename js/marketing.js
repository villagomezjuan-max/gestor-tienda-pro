/* ============================================
   Módulo de Marketing Personalizado con IA
   Permite segmentar clientes y generar campañas
   ============================================ */

window.Marketing = {
  container: null,
  clientes: [],
  productos: [],
  categorias: [],
  vehiculos: [],
  ventas: [],
  productMap: new Map(),
  categoryMap: new Map(),
  clientInsights: [],
  globalProductStats: {},
  stockInsights: {},
  savedCampaigns: [],
  state: {
    filters: {
      search: '',
      categoria: '',
      ciudad: '',
      vehiculo: '',
      segmento: '',
    },
    selectedClients: new Set(),
    availablePromotions: [],
    activePromotions: [],
    notes: '',
    generating: false,
    results: null,
  },

  async render(container) {
    this.container = container;
    await this.bootstrap();
    this.renderLayout();
    this.renderClientsTable();
    this.renderPromotionsList();
    this.renderSelectedChips();
    this.renderContextWidgets();
    this.renderResults();
    this.renderSavedCampaigns();
    this.attachEvents();
    this.updateActionsState();

    // Auto-sugerir clientes y promociones (más autónomo)
    this.autoSuggestBestClients();
    this.autoActivateRelevantPromotions();
  },

  /**
   * Auto-sugerir mejores clientes basado en análisis inteligente
   * Hace el sistema más autónomo
   */
  autoSuggestBestClients() {
    if (this.clientInsights.length === 0) return;

    // Buscar clientes con alta probabilidad de compra
    const highValueClients = this.clientInsights
      .filter((c) => c.purchaseProbability >= 60 || c.engagementScore >= 70)
      .slice(0, 5);

    if (highValueClients.length > 0 && this.state.selectedClients.size === 0) {
      // Auto-seleccionar los mejores clientes
      highValueClients.forEach((client) => {
        this.state.selectedClients.add(client.id);
      });

      this.renderClientsTable();
      this.renderSelectedChips();
      this.updateActionsState();

      // Mostrar notificación discreta
      setTimeout(() => {
        Utils.showToast?.(
          `✨ ${highValueClients.length} clientes sugeridos automáticamente basados en análisis IA`,
          'info',
          4000
        );
      }, 500);
    }
  },

  /**
   * Auto-activar promociones relevantes
   * Hace el sistema más autónomo
   */
  autoActivateRelevantPromotions() {
    if (this.state.activePromotions.length > 0) return; // Ya hay promociones activas

    // Activar promociones que coincidan con productos en stock bajo o más vendidos
    const relevantPromotions = this.state.availablePromotions.filter((promo) => {
      const matches = this.matchPromotionProducts(promo);
      return matches.length > 0;
    });

    if (relevantPromotions.length > 0) {
      // Activar la primera promoción relevante
      const promo = relevantPromotions[0];
      this.state.activePromotions.push(promo);
      promo.activa = true;

      this.renderPromotionsList();
      this.updateActionsState();
    }
  },

  async bootstrap() {
    // === DATOS BÁSICOS ===
    this.clientes = Database.getCollection('clientes') || [];
    this.productos = Database.getCollection('productos') || [];
    this.categorias = Database.getCollection('categorias') || [];
    this.vehiculos = Database.getCollection('vehiculos') || [];
    this.ventas = (Database.getCollection('ventas') || []).filter(
      (v) => v && v.estado !== 'cancelada'
    );
    this.savedCampaigns = Database.getCollection('campanias_marketing') || [];

    // === DATOS AVANZADOS PARA MARKETING PROFESIONAL ===

    // 1. Órdenes de trabajo (para talleres automotrices)
    this.ordenesTabajo = Database.getCollection('ordenes_trabajo') || [];

    // 2. Notificaciones históricas (para análisis de respuesta)
    this.notificacionesEnviadas = Database.getCollection('notificaciones_enviadas') || [];

    // 3. Cuentas por cobrar (clientes con deudas)
    this.cuentasPorCobrar = Database.getCollection('cuentas_por_cobrar') || [];

    // 4. Compras (para análisis de márgenes)
    this.compras = Database.getCollection('compras') || [];

    // 5. Publicidades anteriores (para análisis de efectividad)
    this.publicidadesGuardadas = Database.getCollection('publicidades_guardadas') || [];

    // 6. Configuración del negocio
    this.configTienda = Database.get('configTienda') || {};
    this.configuracion = Database.get('configuracion') || {};

    // 7. Citas/Agendas (para talleres y servicios)
    this.citas = Database.getCollection('citas') || [];

    // === CONSTRUCCIÓN DE MAPAS Y ANÁLISIS ===
    this.productMap = new Map(this.productos.map((p) => [p.id, p]));
    this.categoryMap = new Map(this.categorias.map((c) => [c.id, c.nombre]));

    this.state.availablePromotions = this.loadPromotions();
    this.state.activePromotions = this.state.availablePromotions.filter((p) => p.activa);

    // === ANÁLISIS PROFESIONALES (DEBE IR ANTES DE buildClientInsights) ===
    this.productMargins = this.buildProductMargins();
    this.customerEngagement = this.buildCustomerEngagement();
    this.serviceSchedule = this.buildServiceSchedule();

    // Análisis avanzado de clientes con todos los datos disponibles
    this.clientInsights = this.buildClientInsights();
    this.stockInsights = this.buildStockInsights();
  },

  loadPromotions() {
    const stored = Database.getCollection('promociones_marketing');
    if (Array.isArray(stored) && stored.length) {
      return stored.map((p) => ({ ...p }));
    }
    const defaults = this.getDefaultPromotions();
    Database.saveCollection('promociones_marketing', defaults);
    return defaults;
  },

  getDefaultPromotions() {
    return [
      {
        id: 'oil-service-premium',
        titulo: 'Servicio premium de aceite y filtro',
        descripcion:
          'Cambio de aceite sintético 5W30, filtro original, escaneo de códigos y 20 puntos de inspección.',
        incentivo: '10% de descuento si agenda antes del viernes o recordatorio a 5.000 km.',
        vehiculosObjetivo: 'Pick-up, SUV y vehículos con más de 8.000 km desde el último servicio.',
        canales: ['whatsapp', 'email'],
        keywords: ['aceite', 'filtro', 'lubricante'],
        editable: true,
        activa: true,
      },
      {
        id: 'brake-safe-pack',
        titulo: 'Pack frenos seguros',
        descripcion:
          'Pastillas delanteras + rectificación de discos + purgado de sistema y prueba en ruta.',
        incentivo: '15% de descuento en mano de obra o meses sin intereses.',
        vehiculosObjetivo:
          'Clientes con SUV o camionetas que usan el vehículo para trabajo pesado.',
        canales: ['whatsapp', 'llamada'],
        keywords: ['freno', 'pastilla', 'disco'],
        editable: true,
        activa: false,
      },
      {
        id: 'lighting-upgrade',
        titulo: 'Upgrade completo de iluminación',
        descripcion:
          'Kit de faros LED + instalación + enfoque de luces y revisión de sistema eléctrico.',
        incentivo: 'Combo 2x1 en focos auxiliares o 20% off en instalación de luces exploradoras.',
        vehiculosObjetivo:
          'Vehículos que circulan en zonas rurales o clientes con accesorios off-road.',
        canales: ['redes_sociales', 'whatsapp'],
        keywords: ['faro', 'led', 'iluminacion', 'luces'],
        editable: true,
        activa: false,
      },
      {
        id: 'injector-clean',
        titulo: 'Limpieza de inyectores + escaneo',
        descripcion:
          'Descarbonización profesional, limpieza de inyectores y ajuste de mezcla con escáner.',
        incentivo: 'Incluye diagnóstico gratuito de consumo y calibración ligera.',
        vehiculosObjetivo: 'Autos con consumo elevado o quejas de tirones y pérdida de potencia.',
        canales: ['email', 'whatsapp'],
        keywords: ['inyector', 'descarbonizacion', 'combustible'],
        editable: true,
        activa: true,
      },
      {
        id: 'detailing-pack',
        titulo: 'Detailing express interior + ozono',
        descripcion:
          'Lavado interior profundo, hidratación de plásticos y tratamiento antibacteriano con ozono.',
        incentivo: 'Segundo vehículo con 40% de descuento durante el mismo mes.',
        vehiculosObjetivo: 'Clientes familiares o con mascotas en el vehículo.',
        canales: ['redes_sociales', 'whatsapp'],
        keywords: ['detailing', 'limpieza', 'tapiceria'],
        editable: true,
        activa: false,
      },
    ];
  },

  buildClientInsights() {
    const ventasPorCliente = new Map();
    const productStats = {};
    const now = new Date();

    this.ventas.forEach((venta) => {
      if (!venta || !venta.clienteId) return;
      if (!ventasPorCliente.has(venta.clienteId)) ventasPorCliente.set(venta.clienteId, []);
      ventasPorCliente.get(venta.clienteId).push(venta);
    });

    const insights = this.clientes.map((cliente) => {
      const ventasCliente = ventasPorCliente.get(cliente.id) || [];
      let total = 0;
      let orders = 0;
      let lastPurchase = null;
      let lastItems = [];
      const productMap = new Map();
      const categoryCounter = new Map();

      ventasCliente.forEach((venta) => {
        total += Number(venta.total || 0);
        orders += 1;
        const fecha = this.parseDate(venta.fecha, venta.hora);
        if (!lastPurchase || fecha > lastPurchase) {
          lastPurchase = fecha;
          lastItems = (venta.items || []).map((item) => ({ ...item }));
        }

        (venta.items || []).forEach((item) => {
          if (!item || !item.productoId) return;
          const current = productMap.get(item.productoId) || {
            productoId: item.productoId,
            nombre: item.nombre,
            cantidad: 0,
            subtotal: 0,
            ultimaCompra: fecha,
          };
          current.cantidad += Number(item.cantidad || 0);
          current.subtotal += Number(item.subtotal || item.precio * (item.cantidad || 0) || 0);
          if (fecha > current.ultimaCompra) current.ultimaCompra = fecha;
          productMap.set(item.productoId, current);

          if (!productStats[item.productoId]) {
            productStats[item.productoId] = {
              cantidad: 0,
              total: 0,
              ultimaFecha: fecha,
            };
          }
          productStats[item.productoId].cantidad += Number(item.cantidad || 0);
          productStats[item.productoId].total += Number(
            item.subtotal || item.precio * (item.cantidad || 0) || 0
          );
          if (fecha > productStats[item.productoId].ultimaFecha) {
            productStats[item.productoId].ultimaFecha = fecha;
          }

          const producto = this.productMap.get(item.productoId);
          if (producto && producto.categoria) {
            const catNombre = this.categoryMap.get(producto.categoria) || producto.categoria;
            categoryCounter.set(
              catNombre,
              (categoryCounter.get(catNombre) || 0) + Number(item.cantidad || 0)
            );
          }
        });
      });

      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5)
        .map((entry) => {
          const producto = this.productMap.get(entry.productoId);
          return {
            productoId: entry.productoId,
            nombre: entry.nombre || producto?.nombre || 'Producto',
            cantidad: entry.cantidad,
            subtotal: entry.subtotal,
            categoria: producto
              ? this.categoryMap.get(producto.categoria) || producto.categoria
              : null,
            ultimaCompra: entry.ultimaCompra,
          };
        });

      const favoriteCategories = Array.from(categoryCounter.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([categoria, cantidad]) => ({ categoria, cantidad }));

      const vehiculosCliente = this.vehiculos.filter(
        (v) => v && (v.cliente_id === cliente.id || v.clienteId === cliente.id)
      );

      const daysSinceLast = lastPurchase
        ? Math.floor((now - lastPurchase) / (1000 * 60 * 60 * 24))
        : null;
      const avgTicket = orders ? total / orders : 0;

      const segment = this.getSegmentLabel({ orders, total, daysSinceLast });

      return {
        id: cliente.id,
        nombre: cliente.nombre || 'Cliente sin nombre',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        ciudad: cliente.ciudad || '',
        categoriaCRM: cliente.categoria || 'Regular',
        notas: cliente.notas || '',
        telegram: cliente.telegram_chat_id || '',
        totalGastado: total,
        numeroCompras: orders,
        ticketPromedio: avgTicket,
        ultimaCompra: lastPurchase,
        ultimaCompraItems: lastItems,
        diasDesdeUltima: daysSinceLast,
        topProductos: topProducts,
        categoriasFavoritas: favoriteCategories,
        vehiculos: vehiculosCliente.map((v) => ({
          id: v.id,
          marca: v.marca,
          modelo: v.modelo,
          anio: v.anio,
          placa: v.placa,
          color: v.color,
          kilometraje: v.kilometraje,
          notas: v.notas,
        })),
        segmento: segment,
      };
    });

    this.globalProductStats = productStats;

    // Enriquecer cada insight con análisis profesional
    const enrichedInsights = insights.map((insight) => this.enrichClientInsight(insight));

    return enrichedInsights.sort((a, b) => b.totalGastado - a.totalGastado);
  },

  getSegmentLabel({ orders, total, daysSinceLast }) {
    if (total >= 2000 || orders >= 6) return 'Premium';
    if (orders >= 3 && (daysSinceLast === null || daysSinceLast <= 45)) return 'Frecuente';
    if (daysSinceLast !== null && daysSinceLast > 120) return 'Inactivo';
    if (orders <= 1 && total < 150) return 'Ocasional';
    return 'Regular';
  },

  buildStockInsights() {
    const overstock = this.productos
      .filter((p) => {
        const minimo = Number(p.stockMinimo || p.stock_minimo || 10);
        return Number(p.stock || 0) >= minimo * 2 && Number(p.stock || 0) > 0;
      })
      .sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0))
      .slice(0, 6);

    const lowStock = this.productos
      .filter((p) => {
        const minimo = Number(p.stockMinimo || p.stock_minimo || 10);
        return Number(p.stock || 0) > 0 && Number(p.stock || 0) <= minimo;
      })
      .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
      .slice(0, 6);

    const dormant = this.productos
      .filter((p) => {
        const stat = this.globalProductStats[p.id];
        if (!stat) return true;
        const days = stat.ultimaFecha
          ? Math.floor((new Date() - stat.ultimaFecha) / (1000 * 60 * 60 * 24))
          : 999;
        return days > 90;
      })
      .slice(0, 6);

    const fastMoving = Object.entries(this.globalProductStats)
      .sort((a, b) => b[1].cantidad - a[1].cantidad)
      .slice(0, 6)
      .map(([productId, data]) => {
        const producto = this.productMap.get(productId);
        if (!producto) return null;
        return {
          id: productId,
          nombre: producto.nombre,
          cantidad: data.cantidad,
          ultimaFecha: data.ultimaFecha,
          stock: producto.stock,
          categoria: this.categoryMap.get(producto.categoria) || producto.categoria,
        };
      })
      .filter(Boolean);

    return { overstock, lowStock, dormant, fastMoving };
  },

  renderLayout() {
    const categoriasOptions = ['<option value="">Todas las categorías</option>']
      .concat(this.categorias.map((c) => `<option value="${c.id}">${c.nombre}</option>`))
      .join('');

    const ciudades = Array.from(new Set(this.clientes.map((c) => c.ciudad).filter(Boolean)));
    const ciudadOptions = ['<option value="">Todas las ciudades</option>']
      .concat(ciudades.map((c) => `<option value="${c}">${c}</option>`))
      .join('');

    const vehiculoMarcas = Array.from(new Set(this.vehiculos.map((v) => v.marca).filter(Boolean)));
    const vehiculoOptions = ['<option value="">Todos los vehículos</option>']
      .concat(vehiculoMarcas.map((m) => `<option value="${m}">${m}</option>`))
      .join('');

    const segmentos = ['Premium', 'Frecuente', 'Regular', 'Ocasional', 'Inactivo'];
    const segmentoOptions = ['<option value="">Todos los segmentos</option>']
      .concat(segmentos.map((s) => `<option value="${s}">${s}</option>`))
      .join('');

    this.container.innerHTML = `
      <div class="marketing-page">
        <!-- Header mejorado con guía visual -->
        <div class="page-header">
          <div>
            <h2><i class="fas fa-lightbulb"></i> Marketing Personalizado IA</h2>
            <p style="margin: 0.5rem 0 0 0; opacity: 0.9; font-size: 0.95rem;">
              Crea campañas personalizadas usando inteligencia artificial. Selecciona clientes, elige promociones y genera mensajes únicos.
            </p>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" id="btnResetSeleccion" title="Limpiar todos los clientes seleccionados">
              <i class="fas fa-undo"></i> Limpiar selección
            </button>
            <button class="btn btn-primary" id="btnGenerateCampaign" title="Generar mensajes personalizados con IA">
              <i class="fas fa-magic"></i> Generar mensajes IA
            </button>
            <button class="btn btn-success" id="btnGuardarCampania" title="Guardar esta campaña para usarla después">
              <i class="fas fa-save"></i> Guardar campaña
            </button>
          </div>
        </div>

        <div class="marketing-layout">
          <section class="marketing-card" id="segmentPanel">
            <header>
              <h3><i class="fas fa-users"></i> Segmentación inteligente</h3>
              <div class="header-actions">
                <button class="btn btn-light" data-segment-action="top5">Top 5 por ventas</button>
                <button class="btn btn-light" data-segment-action="frecuentes">Clientes frecuentes</button>
                <button class="btn btn-light" data-segment-action="inactivos">Inactivos &gt; 60 días</button>
              </div>
            </header>
            <!-- Filtros mejorados con iconos y labels -->
            <div class="marketing-filters">
              <div style="grid-column: 1 / -1; margin-bottom: 0.5rem;">
                <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem; font-size: 0.9rem;">
                  <i class="fas fa-filter" style="color: #6366f1; margin-right: 0.5rem;"></i>
                  Filtros de búsqueda
                </label>
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; color: #6b7280; margin-bottom: 0.25rem; font-weight: 600;">
                  <i class="fas fa-search" style="margin-right: 0.25rem;"></i> Buscar
                </label>
                <input type="search" id="clientSearch" class="form-control" placeholder="Nombre, teléfono, placa o producto...">
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; color: #6b7280; margin-bottom: 0.25rem; font-weight: 600;">
                  <i class="fas fa-tags" style="margin-right: 0.25rem;"></i> Categoría
                </label>
                <select id="filterCategoria" class="form-control">${categoriasOptions}</select>
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; color: #6b7280; margin-bottom: 0.25rem; font-weight: 600;">
                  <i class="fas fa-map-marker-alt" style="margin-right: 0.25rem;"></i> Ciudad
                </label>
                <select id="filterCiudad" class="form-control">${ciudadOptions}</select>
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; color: #6b7280; margin-bottom: 0.25rem; font-weight: 600;">
                  <i class="fas fa-car" style="margin-right: 0.25rem;"></i> Vehículo
                </label>
                <select id="filterVehiculo" class="form-control">${vehiculoOptions}</select>
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; color: #6b7280; margin-bottom: 0.25rem; font-weight: 600;">
                  <i class="fas fa-users" style="margin-right: 0.25rem;"></i> Segmento
                </label>
                <select id="filterSegmento" class="form-control">${segmentoOptions}</select>
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; color: #6b7280; margin-bottom: 0.25rem; font-weight: 600;">
                  <i class="fas fa-calendar" style="margin-right: 0.25rem;"></i> Última compra
                </label>
                <select id="filterCompra" class="form-control">
                  <option value="">Todas las fechas</option>
                  <option value="30">Últimos 30 días</option>
                  <option value="90">Últimos 90 días</option>
                  <option value="180">Últimos 180 días</option>
                  <option value="365">Último año</option>
                </select>
              </div>
            </div>
            <!-- Resumen de selección mejorado -->
            <div class="selected-clients-header">
              <div>
                <strong id="selectedClientsCount">
                  <i class="fas fa-check-circle" style="margin-right: 0.5rem;"></i>
                  0 clientes seleccionados
                </strong>
                <span id="selectedClientsValue" class="inline-muted">
                  <i class="fas fa-dollar-sign" style="margin-right: 0.25rem;"></i>
                  Total acumulado: $0.00
                </span>
              </div>
              <label class="inline-muted" title="Seleccionar todos los clientes visibles en la tabla">
                <input type="checkbox" id="selectAllClients"> 
                <i class="fas fa-check-square" style="margin-right: 0.25rem;"></i>
                Seleccionar todos
              </label>
            </div>
            <div class="selected-clients-chips" id="selectedClientsChips"></div>
            <div class="client-table-wrapper">
              <table class="marketing-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Cliente</th>
                    <th>Vehículos</th>
                    <th>Compras</th>
                    <th>Total</th>
                    <th>Favoritos</th>
                    <th>Última compra</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="clientsTableBody"></tbody>
              </table>
            </div>
          </section>

          <section class="marketing-card" id="promotionsPanel">
            <header>
              <h3><i class="fas fa-tags"></i> Promociones y campañas</h3>
              <div class="header-actions">
                <button class="btn btn-secondary" id="btnAddPromotion"><i class="fas fa-plus"></i> Nueva promoción</button>
              </div>
            </header>
            <div class="promotion-list" id="promotionList"></div>
            <div class="summary-card" id="activePromotionsSummary">
              <h4>Promociones activas</h4>
              <p class="inline-muted" id="activePromotionsText">Selecciona promociones para incluir en la campaña.</p>
            </div>
          </section>

          <section class="marketing-card" id="contextPanel">
            <header>
              <h3><i class="fas fa-database"></i> Insights de inventario</h3>
            </header>
            <div class="stock-widget" id="stockWidget"></div>
            <!-- Notas mejoradas con guía -->
            <div>
              <label for="customNotes" style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">
                <i class="fas fa-sticky-note" style="color: #6366f1; margin-right: 0.5rem;"></i>
                Instrucciones para la IA
              </label>
              <p style="font-size: 0.85rem; color: #6b7280; margin-bottom: 0.75rem; line-height: 1.5;">
                Escribe aquí cualquier información adicional que quieras que la IA considere al generar los mensajes. 
                Por ejemplo: promociones especiales, horarios extendidos, servicios nuevos, etc.
              </p>
              <textarea id="customNotes" class="form-control notes-input" 
                placeholder="Ejemplos:
• Resaltar la promoción de cambio de aceite premium
• Ofrecer diagnóstico gratuito de frenos
• Mencionar horario extendido los sábados
• Incluir descuento del 15% en primera visita"></textarea>
            </div>
          </section>
        </div>

        <section class="marketing-card" id="campaignPanel">
          <header>
            <h3><i class="fas fa-brain"></i> Propuesta creativa IA</h3>
          </header>
          <div class="campaign-results">
            <!-- Guía simplificada - Más autónomo -->
            <div class="ia-suggestion-box">
              <h4 class="ia-suggestion-box-title">
                <i class="fas fa-robot"></i>
                Sistema Automático Inteligente
              </h4>
              <div class="ia-suggestion-box-content">
                <p>
                  <i class="fas fa-magic"></i>
                  <strong>El sistema ya seleccionó automáticamente</strong> los mejores clientes y promociones relevantes.
                </p>
                <p>
                  <i class="fas fa-check-circle"></i>
                  Solo necesitas hacer click en <strong>"Generar mensajes IA"</strong> y listo.
                </p>
                <p>
                  <i class="fas fa-lightbulb"></i>
                  Puedes ajustar la selección si lo deseas, pero no es necesario.
                </p>
              </div>
            </div>
            <div class="campaign-summary" id="campaignSummary">
              <div class="empty-state">
                <i class="fas fa-robot"></i>
                <p>
                  <strong>Sistema Listo</strong>
                </p>
                <p>
                  El sistema ha preparado automáticamente clientes y promociones.
                </p>
                <p>
                  Haz click en <strong>"Generar mensajes IA"</strong> para continuar.
                </p>
              </div>
            </div>
            <div>
              <h3 style="display:none;" id="messagesTitle">Mensajes personalizados</h3>
              <div class="messages-grid" id="campaignMessages"></div>
            </div>
          </div>
        </section>

        <section class="marketing-card" id="savedCampaignsPanel">
          <header>
            <h3><i class="fas fa-archive"></i> Campañas guardadas</h3>
          </header>
          <div class="saved-campaigns">
            <div class="saved-campaigns-list" id="savedCampaignsList"></div>
          </div>
        </section>
      </div>
    `;
  },

  attachEvents() {
    this.container.querySelector('#clientSearch').addEventListener('input', (e) => {
      this.state.filters.search = e.target.value.toLowerCase();
      this.renderClientsTable();
    });

    this.container.querySelector('#filterCategoria').addEventListener('change', (e) => {
      this.state.filters.categoria = e.target.value;
      this.renderClientsTable();
    });

    this.container.querySelector('#filterCiudad').addEventListener('change', (e) => {
      this.state.filters.ciudad = e.target.value;
      this.renderClientsTable();
    });

    this.container.querySelector('#filterVehiculo').addEventListener('change', (e) => {
      this.state.filters.vehiculo = e.target.value;
      this.renderClientsTable();
    });

    this.container.querySelector('#filterSegmento').addEventListener('change', (e) => {
      this.state.filters.segmento = e.target.value;
      this.renderClientsTable();
    });

    this.container.querySelector('#filterCompra').addEventListener('change', (e) => {
      const value = e.target.value;
      this.state.filters.rangoDias = value ? Number(value) : '';
      this.renderClientsTable();
    });

    this.container.querySelector('#selectAllClients').addEventListener('change', (e) => {
      const filtered = this.getFilteredClients();
      if (e.target.checked) {
        filtered.forEach((client) => this.state.selectedClients.add(client.id));
      } else {
        filtered.forEach((client) => this.state.selectedClients.delete(client.id));
      }
      this.renderClientsTable();
      this.renderSelectedChips();
      this.updateActionsState();
    });

    this.container.querySelector('#segmentPanel').addEventListener('click', (e) => {
      const action = e.target.getAttribute('data-segment-action');
      if (!action) return;
      this.handleQuickSegment(action);
    });

    this.container.querySelector('#promotionList').addEventListener('click', (e) => {
      const card = e.target.closest('.promotion-card');
      if (!card) return;
      const promoId = card.dataset.id;
      if (
        e.target.matches('[data-action="toggle"]') ||
        e.target.closest('[data-action="toggle"]')
      ) {
        this.togglePromotion(promoId);
      }
      if (e.target.matches('[data-action="edit"]') || e.target.closest('[data-action="edit"]')) {
        this.openPromotionEditor(promoId);
      }
    });

    this.container.querySelector('#btnAddPromotion').addEventListener('click', () => {
      this.openPromotionEditor();
    });

    this.container.querySelector('#customNotes').addEventListener('input', (e) => {
      this.state.notes = e.target.value;
    });

    this.container.querySelector('#btnResetSeleccion').addEventListener('click', () => {
      this.state.selectedClients.clear();
      this.renderClientsTable();
      this.renderSelectedChips();
      this.updateActionsState();
    });

    this.container.querySelector('#btnGenerateCampaign').addEventListener('click', () => {
      this.generateCampaign();
    });

    this.container.querySelector('#btnGuardarCampania').addEventListener('click', () => {
      this.guardarCampania();
    });

    this.container.querySelector('#campaignMessages').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn || btn.disabled) return;
      const index = Number(btn.dataset.index);
      switch (btn.dataset.action) {
        case 'copy':
          this.copyMessage(index);
          break;
        case 'whatsapp':
          this.openWhatsAppMessage(index);
          break;
        case 'share':
          this.shareMessage(index);
          break;
        case 'recordatorio':
          this.createReminderFromMessage(index);
          break;
        default:
          break;
      }
    });

    this.container.querySelector('#savedCampaignsList').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.action === 'ver') {
        this.openSavedCampaign(id);
      }
      if (btn.dataset.action === 'eliminar') {
        this.deleteSavedCampaign(id);
      }
    });
  },

  getFilteredClients() {
    return this.clientInsights.filter((client) => {
      if (this.state.filters.search) {
        const term = this.state.filters.search;
        const matchesText =
          client.nombre?.toLowerCase().includes(term) ||
          client.telefono?.toLowerCase().includes(term) ||
          client.ciudad?.toLowerCase().includes(term) ||
          client.vehiculos.some(
            (v) =>
              (v.placa || '').toLowerCase().includes(term) ||
              (v.marca || '').toLowerCase().includes(term)
          ) ||
          client.topProductos.some((p) => (p.nombre || '').toLowerCase().includes(term));
        if (!matchesText) return false;
      }

      if (this.state.filters.categoria) {
        const hasCategory = client.categoriasFavoritas.some(
          (cat) =>
            cat.categoriaId === this.state.filters.categoria ||
            cat.categoria === this.state.filters.categoria
        );
        if (!hasCategory) return false;
      }

      if (this.state.filters.ciudad && client.ciudad !== this.state.filters.ciudad) {
        return false;
      }

      if (this.state.filters.vehiculo) {
        const hasMarca = client.vehiculos.some((v) => v.marca === this.state.filters.vehiculo);
        if (!hasMarca) return false;
      }

      if (this.state.filters.segmento && client.segmento !== this.state.filters.segmento) {
        return false;
      }

      if (this.state.filters.rangoDias) {
        const dias = client.diasDesdeUltima;
        if (dias === null || dias > this.state.filters.rangoDias) return false;
      }

      return true;
    });
  },

  renderClientsTable() {
    const tbody = this.container.querySelector('#clientsTableBody');
    if (!tbody) return;

    const filtered = this.getFilteredClients();

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center">No se encontraron clientes con los filtros seleccionados.</td></tr>`;
      this.container.querySelector('#selectAllClients').checked = false;
      this.updateSelectionSummary();
      return;
    }

    tbody.innerHTML = filtered
      .map((client) => {
        const selected = this.state.selectedClients.has(client.id) ? 'checked' : '';
        const vehiculosText = client.vehiculos.length
          ? client.vehiculos
              .map((v) => `${v.marca || ''} ${v.modelo || ''} ${v.anio || ''}`.trim())
              .slice(0, 2)
              .join('<br>')
          : '<span class="inline-muted">Sin vehículos</span>';
        const favoritos = client.topProductos.length
          ? client.topProductos
              .slice(0, 2)
              .map((p) => `${p.nombre} (${p.cantidad})`)
              .join('<br>')
          : '<span class="inline-muted">-</span>';
        const ultimaCompra = client.ultimaCompra
          ? this.formatRelativeDate(client.ultimaCompra)
          : 'Sin compras';

        return `
        <tr>
          <td data-label="Seleccionar"><input type="checkbox" data-client-id="${client.id}" ${selected}></td>
          <td data-label="Cliente">
            <strong>${client.nombre}</strong><br>
            <span class="inline-muted">${client.segmento} · ${client.categoriaCRM}</span>
          </td>
          <td data-label="Vehículos">${vehiculosText}</td>
          <td data-label="Compras">
            ${client.numeroCompras} compras<br>
            <span class="inline-muted">Ticket: ${this.formatCurrency(client.ticketPromedio)}</span>
          </td>
          <td data-label="Total">${this.formatCurrency(client.totalGastado)}</td>
          <td data-label="Favoritos">${favoritos}</td>
          <td data-label="Última compra">${ultimaCompra}</td>
          <td data-label="Acciones">
            <button class="btn btn-sm btn-secondary" data-action="detalle-cliente" data-client-id="${client.id}">
              <i class="fas fa-eye"></i>
            </button>
          </td>
        </tr>
      `;
      })
      .join('');

    tbody.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.addEventListener('change', (e) => {
        const id = e.target.dataset.clientId;
        if (e.target.checked) {
          this.state.selectedClients.add(id);
        } else {
          this.state.selectedClients.delete(id);
        }
        this.updateSelectionSummary();
        this.renderSelectedChips();
        this.updateActionsState();
      });
    });

    tbody.querySelectorAll('button[data-action="detalle-cliente"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.openClientDetail(btn.dataset.clientId);
      });
    });

    const selectAll = this.container.querySelector('#selectAllClients');
    if (selectAll) {
      const allSelected = filtered.every((client) => this.state.selectedClients.has(client.id));
      selectAll.checked = filtered.length > 0 && allSelected;
    }

    this.updateSelectionSummary();
  },

  updateSelectionSummary() {
    const selectedInsights = this.getSelectedClientInsights();
    const total = selectedInsights.reduce((acc, client) => acc + client.totalGastado, 0);
    const count = selectedInsights.length;
    const label = count === 1 ? 'cliente seleccionado' : 'clientes seleccionados';

    this.container.querySelector('#selectedClientsCount').textContent = `${count} ${label}`;
    this.container.querySelector('#selectedClientsValue').textContent =
      `Total acumulado: ${this.formatCurrency(total)}`;
  },

  renderSelectedChips() {
    const chipsContainer = this.container.querySelector('#selectedClientsChips');
    if (!chipsContainer) return;

    const selectedInsights = this.getSelectedClientInsights();

    if (!selectedInsights.length) {
      chipsContainer.innerHTML =
        '<span class="inline-muted">Selecciona clientes para personalizar la campaña.</span>';
      return;
    }

    chipsContainer.innerHTML = selectedInsights
      .map(
        (client) => `
      <span class="client-chip">
        ${client.nombre}
        <button type="button" data-remove-client="${client.id}"><i class="fas fa-times"></i></button>
      </span>
    `
      )
      .join('');

    chipsContainer.querySelectorAll('button[data-remove-client]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.selectedClients.delete(btn.dataset.removeClient);
        this.renderClientsTable();
        this.renderSelectedChips();
        this.updateActionsState();
      });
    });
  },

  handleQuickSegment(action) {
    if (!this.clientInsights.length) return;

    if (action === 'top5') {
      const top = this.clientInsights.slice(0, 5);
      this.state.selectedClients = new Set(top.map((c) => c.id));
    }

    if (action === 'frecuentes') {
      const frequent = this.clientInsights.filter((c) => c.numeroCompras >= 3);
      this.state.selectedClients = new Set(frequent.map((c) => c.id));
    }

    if (action === 'inactivos') {
      const inactive = this.clientInsights.filter(
        (c) => c.diasDesdeUltima === null || c.diasDesdeUltima > 60
      );
      this.state.selectedClients = new Set(inactive.map((c) => c.id).slice(0, 12));
    }

    this.renderClientsTable();
    this.renderSelectedChips();
    this.updateActionsState();
  },

  renderPromotionsList() {
    const list = this.container.querySelector('#promotionList');
    if (!list) return;

    if (!this.state.availablePromotions.length) {
      list.innerHTML =
        '<div class="empty-state"><i class="fas fa-tag"></i><p>Agrega promociones personalizadas para mostrarlas aquí.</p></div>';
      this.updateActivePromotionsSummary();
      return;
    }

    list.innerHTML = this.state.availablePromotions
      .map((promo) => {
        const matched = this.matchPromotionProducts(promo);
        const activeClass = this.state.activePromotions.some((p) => p.id === promo.id)
          ? 'active'
          : '';
        const productosTxt = matched.length
          ? matched
              .slice(0, 3)
              .map((prod) => prod.nombre)
              .join(', ')
          : 'Sin productos vinculados';

        return `
        <div class="promotion-card ${activeClass}" data-id="${promo.id}">
          <div>
            <strong>${promo.titulo}</strong>
            <div class="promotion-meta">
              <span><i class="fas fa-users"></i> ${promo.vehiculosObjetivo || 'Aplicable a todos'}</span>
              <span><i class="fas fa-bullseye"></i> ${promo.canales?.join(', ') || 'General'}</span>
            </div>
          </div>
          <p class="inline-muted">${promo.descripcion}</p>
          <p class="inline-muted"><strong>Incentivo:</strong> ${promo.incentivo || 'Configura un incentivo.'}</p>
          <p class="inline-muted"><strong>Productos:</strong> ${productosTxt}</p>
          <div class="promotion-actions">
            <button class="btn btn-sm btn-primary" data-action="toggle">${activeClass ? 'Quitar' : 'Usar'}</button>
            ${promo.editable !== false ? `<button class="btn btn-sm btn-secondary" data-action="edit"><i class="fas fa-edit"></i></button>` : ''}
          </div>
        </div>
      `;
      })
      .join('');

    this.updateActivePromotionsSummary();
  },

  matchPromotionProducts(promo) {
    if (!promo || !Array.isArray(promo.keywords) || !promo.keywords.length) return [];
    const keywords = promo.keywords.map((k) => k.toLowerCase());
    return this.productos.filter((prod) => {
      const text = `${prod.nombre} ${prod.descripcion || ''}`.toLowerCase();
      return keywords.some((keyword) => text.includes(keyword));
    });
  },

  togglePromotion(promoId) {
    const promo = this.state.availablePromotions.find((p) => p.id === promoId);
    if (!promo) return;

    const already = this.state.activePromotions.find((p) => p.id === promoId);
    if (already) {
      this.state.activePromotions = this.state.activePromotions.filter((p) => p.id !== promoId);
      promo.activa = false;
    } else {
      this.state.activePromotions.push(promo);
      promo.activa = true;
    }

    Database.saveCollection('promociones_marketing', this.state.availablePromotions);
    this.renderPromotionsList();
    this.updateActionsState();
  },

  openPromotionEditor(promoId = null) {
    const existing = promoId ? this.state.availablePromotions.find((p) => p.id === promoId) : null;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalPromocionMarketing';

    modal.innerHTML = `
      <div class="modal-container" style="max-width: 640px;">
        <div class="modal-header">
          <h3><i class="fas fa-tags"></i> ${existing ? 'Editar promoción' : 'Nueva promoción'}</h3>
          <button class="btn-close" onclick="document.getElementById('modalPromocionMarketing').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Título</label>
            <input type="text" id="promoTitulo" class="form-control" value="${existing?.titulo || ''}">
          </div>
          <div class="form-group">
            <label>Descripción</label>
            <textarea id="promoDescripcion" class="form-control" rows="3">${existing?.descripcion || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Incentivo / beneficio</label>
            <textarea id="promoIncentivo" class="form-control" rows="3">${existing?.incentivo || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Público objetivo</label>
            <input type="text" id="promoVehiculos" class="form-control" value="${existing?.vehiculosObjetivo || ''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Canales sugeridos (separados por coma)</label>
              <input type="text" id="promoCanales" class="form-control" value="${existing?.canales?.join(', ') || ''}">
            </div>
            <div class="form-group">
              <label>Palabras clave de productos</label>
              <input type="text" id="promoKeywords" class="form-control" value="${existing?.keywords?.join(', ') || ''}">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalPromocionMarketing').remove()">Cancelar</button>
          <button class="btn btn-primary" id="btnSavePromo">Guardar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btnSavePromo').addEventListener('click', () => {
      const titulo = modal.querySelector('#promoTitulo').value.trim();
      if (!titulo) {
        Utils.showToast('Ingresa un título para la promoción', 'warning');
        return;
      }

      const promoData = {
        id: existing?.id || Utils.generateId(),
        titulo,
        descripcion: modal.querySelector('#promoDescripcion').value.trim(),
        incentivo: modal.querySelector('#promoIncentivo').value.trim(),
        vehiculosObjetivo: modal.querySelector('#promoVehiculos').value.trim(),
        canales: modal
          .querySelector('#promoCanales')
          .value.split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        keywords: modal
          .querySelector('#promoKeywords')
          .value.split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        editable: true,
        activa: existing?.activa || false,
      };

      if (existing) {
        const idx = this.state.availablePromotions.findIndex((p) => p.id === existing.id);
        this.state.availablePromotions[idx] = promoData;
        const activeIdx = this.state.activePromotions.findIndex((p) => p.id === existing.id);
        if (activeIdx !== -1) {
          this.state.activePromotions[activeIdx] = promoData;
        }
      } else {
        this.state.availablePromotions.push(promoData);
      }

      Database.saveCollection('promociones_marketing', this.state.availablePromotions);
      modal.remove();
      this.renderPromotionsList();
      this.updateActionsState();
      Utils.showToast('Promoción guardada', 'success');
    });
  },

  updateActivePromotionsSummary() {
    const summary = this.container.querySelector('#activePromotionsSummary');
    const text = this.container.querySelector('#activePromotionsText');

    if (!summary || !text) return;

    if (!this.state.activePromotions.length) {
      text.textContent = 'Selecciona promociones para incluir en la campaña.';
      return;
    }

    text.innerHTML = this.state.activePromotions
      .map((p) => `<span class="badge badge-primary">${p.titulo}</span>`)
      .join(' ');
  },

  renderContextWidgets() {
    const widget = this.container.querySelector('#stockWidget');
    if (!widget) return;

    const negocio = this.getBusinessInfo();

    const formatProductList = (items, emptyText, formatter) => {
      if (!items || !items.length) return `<li>${emptyText}</li>`;
      return items.map(formatter).join('');
    };

    widget.innerHTML = `
      <div class="summary-card">
        <h4>Negocio</h4>
        <ul>
          <li>${negocio.nombre || 'Nombre no configurado'}</li>
          <li>Ciudad: ${negocio.ciudad || negocio.direccion || 'Sin dirección'}</li>
          <li>Contacto: ${negocio.telefono || negocio.email || 'Sin datos'}</li>
        </ul>
      </div>
      <div class="summary-card">
        <h4>Exceso de stock</h4>
        <ul>
          ${formatProductList(this.stockInsights.overstock, 'Inventario balanceado', (prod) => `<li>${prod.nombre} · Stock ${prod.stock}</li>`)}
        </ul>
      </div>
      <div class="summary-card">
        <h4>Baja rotación</h4>
        <ul>
          ${formatProductList(this.stockInsights.dormant, 'Todos los productos han rotado en los últimos 90 días', (prod) => `<li>${prod.nombre} · ${this.categoryMap.get(prod.categoria) || prod.categoria || 'Sin categoría'}</li>`)}
        </ul>
      </div>
      <div class="summary-card">
        <h4>Más vendidos</h4>
        <ul>
          ${formatProductList(this.stockInsights.fastMoving, 'Aún no hay información suficiente', (prod) => `<li>${prod.nombre} · ${prod.cantidad} uds en 90 días</li>`)}
        </ul>
      </div>
    `;
  },

  updateActionsState() {
    const btnGenerate = this.container.querySelector('#btnGenerateCampaign');
    const btnGuardar = this.container.querySelector('#btnGuardarCampania');

    const canGenerate =
      this.state.selectedClients.size > 0 && this.state.activePromotions.length > 0;

    btnGenerate.disabled = this.state.generating || !canGenerate;
    btnGuardar.disabled = !this.state.results;
  },

  async generateCampaign() {
    if (this.state.generating) return;

    const selectedInsights = this.getSelectedClientInsights();
    if (!selectedInsights.length) {
      Utils.showToast('Selecciona al menos un cliente.', 'warning');
      return;
    }

    if (!this.state.activePromotions.length) {
      Utils.showToast('Activa al menos una promoción para generar la campaña.', 'warning');
      return;
    }

    this.state.generating = true;
    this.updateActionsState();

    this.showLoadingState();

    try {
      const context = this.buildCampaignContext(selectedInsights);
      const summary = await this.generateCampaignSummary(context);
      const messages = [];

      for (const client of selectedInsights) {
        const message = await this.generateMessageForClient(client, context, summary);
        messages.push(message);
      }

      this.state.results = { summary, messages, context };
      this.renderResults();
      Utils.showToast('Campaña generada correctamente', 'success');
    } catch (error) {
      console.error('Error generando campaña:', error);
      Utils.showToast('No se pudo generar la campaña. Revisa la configuración de IA.', 'danger');
      this.showErrorState(error.message);
    } finally {
      this.state.generating = false;
      this.updateActionsState();
    }
  },

  showLoadingState() {
    const summary = this.container.querySelector('#campaignSummary');
    const messages = this.container.querySelector('#campaignMessages');
    const title = this.container.querySelector('#messagesTitle');

    if (summary) {
      summary.innerHTML = `
        <div class="ia-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Analizando clientes, inventario y promociones...</p>
        </div>
      `;
    }

    if (messages) {
      messages.innerHTML = '';
    }

    if (title) title.style.display = 'none';
  },

  showErrorState(message) {
    const summary = this.container.querySelector('#campaignSummary');
    if (summary) {
      summary.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>${message || 'Error al generar la propuesta.'}</p>
        </div>
      `;
    }
  },

  buildCampaignContext(selectedInsights) {
    const metrics = this.buildSelectionMetrics(selectedInsights);
    const productSnapshot = this.buildProductSnapshot(selectedInsights);

    // === ANÁLISIS PROFESIONAL DE ENGAGEMENT ===
    const engagementPromedio = {
      clientesConDeudas: selectedInsights.filter((c) => c.engagement?.tieneDeudas).length,
      montoTotalDeudas: selectedInsights.reduce(
        (sum, c) => sum + (c.engagement?.montoDeuda || 0),
        0
      ),
      clientesConCitasPendientes: selectedInsights.filter((c) => c.engagement?.citasPendientes > 0)
        .length,
      clientesConOrdenesActivas: selectedInsights.filter((c) => c.engagement?.ordenesActivas > 0)
        .length,
      engagementScorePromedio:
        selectedInsights.reduce((sum, c) => sum + (c.engagementScore || 0), 0) /
        selectedInsights.length,
      probabilidadCompraPromedio:
        selectedInsights.reduce((sum, c) => sum + (c.purchaseProbability || 0), 0) /
        selectedInsights.length,
    };

    // === ANÁLISIS DE SERVICIOS PRÓXIMOS ===
    const serviciosProximos = selectedInsights
      .flatMap((c) => c.vehiculos || [])
      .filter((v) => v.proximoServicio)
      .map((v) => ({
        clienteNombre: selectedInsights.find((c) => c.id === v.clienteId)?.nombre,
        vehiculo: `${v.marca} ${v.modelo} ${v.placa}`,
        tipoServicio: v.proximoServicio.tipo,
        kmFaltantes: v.proximoServicio.kmFaltantes,
        urgencia: v.proximoServicio.urgencia,
      }))
      .sort((a, b) => a.kmFaltantes - b.kmFaltantes)
      .slice(0, 10);

    // === PRODUCTOS CON ANÁLISIS DE MÁRGENES ===
    const productosConMargen = productSnapshot
      .map((p) => ({
        ...p,
        margen: this.productMargins[p.id],
      }))
      .filter((p) => p.margen);

    return {
      negocio: this.getBusinessInfo(),
      promociones: this.state.activePromotions,
      clientes: selectedInsights.map((client) => ({
        id: client.id,
        nombre: client.nombre,
        segmento: client.segmento,
        totalGastado: client.totalGastado,
        numeroCompras: client.numeroCompras,
        ticketPromedio: client.ticketPromedio,
        diasDesdeUltima: client.diasDesdeUltima,
        vehiculos: client.vehiculos,
        categoriasFavoritas: client.categoriasFavoritas,
        topProductos: client.topProductos.map((tp) => ({
          productoId: tp.productoId,
          nombre: tp.nombre,
          cantidad: tp.cantidad,
          categoria: tp.categoria,
          margen: tp.margen, // Incluir margen
        })),
        // === DATOS PROFESIONALES DEL CLIENTE ===
        engagementScore: client.engagementScore,
        purchaseProbability: client.purchaseProbability,
        lifetimeValue: client.lifetimeValue,
        engagement: client.engagement,
        preferenciaComunicacion: client.engagement?.preferenciaComunicacion,
      })),
      stock: this.stockInsights,
      productosRelevantes: productosConMargen,
      notas: this.state.notes,
      metricas: metrics,

      // === CONTEXTO PROFESIONAL ADICIONAL ===
      engagement: engagementPromedio,
      serviciosProximos,
      campanasPrevias: this.savedCampaigns.slice(-5).map((c) => ({
        fecha: c.fecha,
        clientesImpactados: c.messages?.length || 0,
        titulo: c.summary?.campaign_title,
      })),
      fechaActual: new Date().toISOString().split('T')[0],
      mes: new Date().toLocaleString('es', { month: 'long' }),
    };
  },

  buildSelectionMetrics(selectedInsights) {
    const total = selectedInsights.reduce((acc, client) => acc + client.totalGastado, 0);
    const pedidos = selectedInsights.reduce((acc, client) => acc + client.numeroCompras, 0);
    const segments = selectedInsights.reduce((acc, client) => {
      acc[client.segmento] = (acc[client.segmento] || 0) + 1;
      return acc;
    }, {});
    const channels = selectedInsights.reduce(
      (acc, client) => {
        if (client.telefono) acc.whatsapp += 1;
        if (client.email) acc.email += 1;
        if (client.telegram) acc.telegram += 1;
        return acc;
      },
      { whatsapp: 0, email: 0, telegram: 0 }
    );
    const categorias = {};
    selectedInsights.forEach((client) => {
      client.categoriasFavoritas.forEach((cat) => {
        categorias[cat.categoria] = (categorias[cat.categoria] || 0) + cat.cantidad;
      });
    });
    const categoriasTop = Object.entries(categorias)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([categoria, cantidad]) => ({ categoria, cantidad }));

    const vehiculos = {};
    selectedInsights.forEach((client) => {
      client.vehiculos.forEach((v) => {
        const key = v.marca || 'Otro';
        vehiculos[key] = (vehiculos[key] || 0) + 1;
      });
    });

    return {
      totalClientes: selectedInsights.length,
      totalVentas: total,
      ticketPromedio: selectedInsights.length ? total / selectedInsights.length : 0,
      pedidosTotales: pedidos,
      segmentos: segments,
      canales: channels,
      categoriasTop,
      vehiculos: Object.entries(vehiculos).map(([marca, cantidad]) => ({ marca, cantidad })),
    };
  },

  buildProductSnapshot(selectedInsights) {
    const snapshot = new Map();
    const addProduct = (productId, reason, prioridad = 1) => {
      const product = this.productMap.get(productId);
      if (!product) return;
      const existing = snapshot.get(productId) || {
        id: productId,
        nombre: product.nombre,
        codigo: product.codigo,
        categoria: this.categoryMap.get(product.categoria) || product.categoria,
        stock: product.stock,
        stockMinimo: product.stockMinimo || product.stock_minimo || 10,
        precioVenta: product.precioVenta,
        fuentes: new Set(),
        prioridad: 0,
      };
      existing.fuentes.add(reason);
      existing.prioridad = Math.max(existing.prioridad, prioridad);
      snapshot.set(productId, existing);
    };

    selectedInsights.forEach((client) => {
      client.topProductos.forEach((producto) => {
        if (producto.productoId)
          addProduct(producto.productoId, `Historial de ${client.nombre}`, 2);
      });
    });

    this.state.activePromotions.forEach((promo) => {
      const matches = this.matchPromotionProducts(promo);
      matches.forEach((prod) => addProduct(prod.id, `Promoción ${promo.titulo}`, 3));
    });

    this.stockInsights.overstock.forEach((prod) => addProduct(prod.id, 'Exceso de stock', 1));

    return Array.from(snapshot.values())
      .sort((a, b) => b.prioridad - a.prioridad)
      .slice(0, 15)
      .map((entry) => ({
        id: entry.id,
        nombre: entry.nombre,
        codigo: entry.codigo,
        categoria: entry.categoria,
        stock: entry.stock,
        stockMinimo: entry.stockMinimo,
        precioVenta: entry.precioVenta,
        fuentes: Array.from(entry.fuentes),
      }));
  },

  async generateCampaignSummary(context) {
    const systemPrompt =
      'Eres un director de marketing automotriz senior. Diseña planes accionables, éticos y centrados en el cliente.';
    const schema = {
      campaign_title: 'string',
      big_idea: 'string',
      positioning: 'string',
      key_offers: [{ nombre: 'string', propuesta_valor: 'string', urgencia: 'string' }],
      channel_plan: [{ canal: 'string', mensaje_clave: 'string', CTA: 'string' }],
      kpis: [{ indicador: 'string', meta: 'string' }],
    };

    const payload = {
      business: context.negocio,
      metrics: context.metricas,
      promotions: context.promociones,
      inventory: context.stock,
      product_snapshot: context.productosRelevantes,
      notes: context.notas,
    };

    const userMessage = `Genera un plan de campaña en español usando el siguiente contexto. Estructura la respuesta en JSON estricto que siga el esquema proporcionado.

Contexto:
${JSON.stringify(payload, null, 2)}

Esquema esperado:
${JSON.stringify(schema, null, 2)}

No agregues texto fuera del JSON.`;

    const fallbackSummary = JSON.stringify({
      campaign_title: 'Campaña personalizada',
      big_idea:
        'Construye confianza reforzando el mantenimiento preventivo adaptado a cada vehículo.',
      positioning: 'Taller especialista en servicio integral para flotillas livianas.',
      key_offers: [],
      channel_plan: [],
      kpis: [],
    });

    const response = await this.callIA(systemPrompt, userMessage, fallbackSummary);

    const parsed = this.safeParseJson(response);
    if (parsed) {
      return parsed;
    }

    const rawText = typeof response === 'string' ? response.trim() : '';
    if (rawText) {
      return {
        campaign_title: 'Propuesta de campaña IA',
        big_idea: rawText,
        positioning: '',
        key_offers: [],
        channel_plan: [],
        kpis: [],
        raw_text: rawText,
      };
    }

    return JSON.parse(fallbackSummary);
  },

  async generateMessageForClient(client, context, summary) {
    const systemPrompt =
      'Eres un copywriter automotriz experto en personalización. Mantén la privacidad y evita promesas exageradas.';

    const availablePromotions = context.promociones.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      descripcion: p.descripcion,
      incentivo: p.incentivo,
      canales: p.canales,
    }));

    const payload = {
      client: {
        id: client.id,
        nombre: client.nombre,
        segmento: client.segmento,
        totalGastado: client.totalGastado,
        numeroCompras: client.numeroCompras,
        diasDesdeUltima: client.diasDesdeUltima,
        vehiculos: client.vehiculos,
        topProductos: client.topProductos,
      },
      business: context.negocio,
      promotions: availablePromotions,
      product_pool: context.productosRelevantes,
      global_summary: summary,
      notes: context.notas,
    };

    const schema = {
      client_id: 'string',
      subject: 'string',
      preferred_channel: 'string',
      tone: 'string',
      message: 'string',
      recommendations: [{ producto: 'string', motivo: 'string', oferta: 'string' }],
    };

    const userMessage = `Redacta un mensaje personalizado en español neutro para el cliente indicado. Usa máximo 120 palabras, incluye saludo con nombre y menciona su vehículo principal si existe. Cierra con un CTA claro. Prioriza canales disponibles (WhatsApp si hay teléfono, email si hay correo).

Devuelve solo JSON según el esquema y evita incluir datos sensibles.

Datos del cliente:
${JSON.stringify(payload, null, 2)}

Esquema esperado:
${JSON.stringify(schema, null, 2)}

No agregues texto fuera del JSON.`;

    const fallbackMessage = {
      client_id: client.id,
      subject: 'Recomendación de servicio personalizado',
      preferred_channel: client.telefono ? 'whatsapp' : 'email',
      tone: 'cercano',
      message: `Hola ${client.nombre}, nos gustaría programar el próximo mantenimiento de tu vehículo. Tenemos promociones activas pensadas para ti y una revisión rápida sin costo. ¿Te agendamos esta semana?`,
      recommendations: [],
    };

    const response = await this.callIA(systemPrompt, userMessage, JSON.stringify(fallbackMessage));
    const parsed = this.safeParseJson(response);
    if (parsed) {
      return parsed;
    }

    const rawText = typeof response === 'string' ? response.trim() : '';
    if (rawText) {
      return {
        client_id: client.id,
        subject: fallbackMessage.subject,
        preferred_channel: client.telefono ? 'whatsapp' : client.email ? 'email' : 'whatsapp',
        tone: 'cercano',
        message: rawText,
        recommendations: [],
        raw_text: rawText,
      };
    }

    return fallbackMessage;
  },

  async callIA(systemPrompt, userMessage, fallback) {
    try {
      if (window.IAUnifiedEngine) {
        if (!IAUnifiedEngine.initialized) {
          await IAUnifiedEngine.init();
        }
        if (IAUnifiedEngine.isConfigured && IAUnifiedEngine.isConfigured()) {
          const content = await IAUnifiedEngine.sendMessage(userMessage, systemPrompt);
          if (content) return content;
        }
      }

      if (window.Publicidad && typeof Publicidad.generarTextoConIA === 'function') {
        const prompt = systemPrompt ? `${systemPrompt}\n\n${userMessage}` : userMessage;
        const content = await Publicidad.generarTextoConIA.call(Publicidad, prompt);
        if (content) return content;
      }
    } catch (error) {
      console.warn('Fallo al invocar IA unificada:', error);
    }

    return fallback;
  },

  safeParseJson(text) {
    if (!text) return null;
    let content = text.trim();

    const blockMatch = content.match(/```json([\s\S]*?)```/i);
    if (blockMatch) {
      content = blockMatch[1].trim();
    }

    content = content.replace(/```/g, '').trim();

    const extracted = this.extractJsonPayload(content);
    if (!extracted) {
      console.info('Respuesta de IA sin JSON estructurado, se mostrará como texto plano.');
      return null;
    }

    try {
      return JSON.parse(extracted);
    } catch (error) {
      console.info(
        'No se pudo parsear JSON de IA, se mostrará como texto plano. Detalle:',
        error?.message || error
      );
      return null;
    }
  },

  extractJsonPayload(raw) {
    if (!raw) return null;

    const sanitized = raw.replace(/^[^{\[]+/, '').replace(/[^}\]]+$/, '');
    if (!sanitized.includes('{') && !sanitized.includes('[')) {
      return null;
    }

    const stack = [];
    let startIndex = -1;
    let inString = false;
    let escape = false;

    for (let i = 0; i < raw.length; i++) {
      const char = raw[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (char === '\\') {
        if (inString) {
          escape = true;
        }
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === '{' || char === '[') {
        if (stack.length === 0) {
          startIndex = i;
        }
        stack.push(char);
      } else if (char === '}' || char === ']') {
        if (!stack.length) {
          continue;
        }

        const last = stack[stack.length - 1];
        if ((char === '}' && last !== '{') || (char === ']' && last !== '[')) {
          return null;
        }

        stack.pop();
        if (!stack.length && startIndex !== -1) {
          return raw.slice(startIndex, i + 1);
        }
      }
    }

    if (!stack.length && startIndex === -1 && (raw.startsWith('{') || raw.startsWith('['))) {
      return raw;
    }

    if (!stack.length && startIndex !== -1) {
      return raw.slice(startIndex);
    }

    if (sanitized.startsWith('{') || sanitized.startsWith('[')) {
      return sanitized;
    }

    return null;
  },

  renderResults() {
    const summaryContainer = this.container.querySelector('#campaignSummary');
    const messagesContainer = this.container.querySelector('#campaignMessages');
    const title = this.container.querySelector('#messagesTitle');
    const sanitize = (value) => {
      if (value === null || value === undefined) return '';
      const text = String(value);
      if (typeof Utils !== 'undefined' && typeof Utils.escapeHTML === 'function') {
        return Utils.escapeHTML(text);
      }
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const formatMultiline = (value) => sanitize(value).replace(/\n/g, '<br>');

    if (!summaryContainer || !messagesContainer) return;

    if (!this.state.results) {
      summaryContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-lightbulb"></i>
          <p>Selecciona clientes y promociones para generar la propuesta.</p>
        </div>
      `;
      messagesContainer.innerHTML = '';
      if (title) title.style.display = 'none';
      return;
    }

    const summary = this.state.results.summary;
    const offers = summary.key_offers || [];
    const channels = summary.channel_plan || [];
    const kpis = summary.kpis || [];
    const bigIdeaHtml = formatMultiline(summary.big_idea || '-');
    const positioningHtml = formatMultiline(summary.positioning || '-');
    const rawTextHtml = summary.raw_text ? formatMultiline(summary.raw_text) : '';

    summaryContainer.innerHTML = `
      <div class="summary-card">
        <h4>${sanitize(summary.campaign_title || 'Campaña personalizada')}</h4>
        <p class="inline-muted">Idea central: ${bigIdeaHtml || '-'}</p>
        <p class="inline-muted">Posicionamiento: ${positioningHtml || '-'}</p>
        ${rawTextHtml ? `<div class="summary-raw-text">${rawTextHtml}</div>` : ''}
      </div>
      <div class="summary-grid">
        <div class="summary-card">
          <h4>Ofertas clave</h4>
          <ul>
            ${offers.length ? offers.map((o) => `<li>${sanitize(o.nombre)}: ${sanitize(o.propuesta_valor)}</li>`).join('') : '<li>Aún no se definieron ofertas.</li>'}
          </ul>
        </div>
        <div class="summary-card">
          <h4>Canales</h4>
          <ul>
            ${channels.length ? channels.map((c) => `<li>${sanitize(c.canal)}: ${sanitize(c.mensaje_clave)}</li>`).join('') : '<li>Define el plan de medios.</li>'}
          </ul>
        </div>
        <div class="summary-card">
          <h4>KPIs</h4>
          <ul>
            ${kpis.length ? kpis.map((k) => `<li>${sanitize(k.indicador)}: ${sanitize(k.meta)}</li>`).join('') : '<li>Configura indicadores medibles.</li>'}
          </ul>
        </div>
      </div>
    `;

    if (this.state.results.messages?.length) {
      messagesContainer.innerHTML = this.state.results.messages
        .map((msg, index) => {
          // Extraer mensaje limpio usando la función centralizada
          const messageObj =
            typeof msg === 'string' ? this.safeParseJson(msg) || { message: msg } : msg;
          const client = this.clientInsights.find(
            (c) => c.id === (messageObj.client_id || msg.client_id)
          );

          // Obtener mensaje limpio sin JSON ni código
          let messageText = this.extractCleanMessage(msg);

          // Si el mensaje está vacío, usar fallback
          if (!messageText || messageText.trim() === '') {
            messageText = `Hola ${client?.nombre || 'Cliente'}, tenemos una promoción especial para ti. ¿Te gustaría conocer más detalles?`;
          }

          const recomendaciones = messageObj.recommendations || [];
          const vehiculo = client?.vehiculos?.[0];
          const vehiculoText = vehiculo
            ? `${vehiculo.marca || ''} ${vehiculo.modelo || ''} ${vehiculo.anio || ''}`.trim()
            : '';
          const phoneDigits = this.normalizePhoneNumber(client?.telefono || '');
          const hasValidPhone = phoneDigits.length >= 7;
          const preferredChannel = messageObj.preferred_channel || 'whatsapp';

          const messageHtml = formatMultiline(messageText);
          return `
          <article class="message-card">
            <header>
              <h4>${sanitize(client?.nombre || 'Cliente')}</h4>
              ${vehiculoText ? `<span>${sanitize(vehiculoText)}</span>` : ''}
              <span class="inline-muted">Canal sugerido: ${sanitize(preferredChannel)}</span>
            </header>
            <div class="message-body">${messageHtml}</div>
            ${
              recomendaciones.length
                ? `
            <div class="message-meta">
              ${recomendaciones.map((rec) => `<span><i class="fas fa-plus"></i> ${sanitize(rec.producto)}: ${sanitize(rec.motivo)}</span>`).join('')}
            </div>`
                : ''
            }
            <div class="message-actions">
              <button class="btn btn-sm btn-secondary" data-action="copy" data-index="${index}" title="Copiar mensaje al portapapeles"><i class="fas fa-copy"></i> Copiar</button>
              <button class="btn btn-sm btn-success" data-action="whatsapp" data-index="${index}" ${hasValidPhone ? '' : 'disabled title="Registra un teléfono válido para usar WhatsApp"'}><i class="fab fa-whatsapp"></i> WhatsApp</button>
              <button class="btn btn-sm btn-primary" data-action="share" data-index="${index}" title="Compartir mensaje"><i class="fas fa-share-alt"></i> Compartir</button>
              <button class="btn btn-sm btn-warning" data-action="recordatorio" data-index="${index}" title="Crear recordatorio"><i class="fas fa-bell"></i> Recordatorio</button>
            </div>
          </article>
        `;
        })
        .join('');
      if (title) title.style.display = 'block';
    } else {
      messagesContainer.innerHTML = `<div class="empty-state"><i class="fas fa-envelope-open"></i><p>No se generaron mensajes personalizados.</p></div>`;
      if (title) title.style.display = 'none';
    }
  },

  /**
   * Extrae el contenido limpio de un mensaje, eliminando JSON y formato técnico
   */
  extractCleanMessage(message) {
    if (!message) return '';

    let messageObj = message;
    let content = '';

    // Si es string, intentar parsear como JSON
    if (typeof message === 'string') {
      // Eliminar bloques de código markdown
      let cleaned = message
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      // Si parece JSON, intentar parsear
      if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
        try {
          messageObj = JSON.parse(cleaned);
          content = messageObj.message || messageObj.text || '';
        } catch (e) {
          // Si falla el parseo, intentar extraer con regex
          const match = cleaned.match(/"message"\s*:\s*"([^"]*)"/);
          if (match && match[1]) {
            content = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
          } else {
            // Si no hay match, usar el texto limpiado (podría no ser JSON)
            content = cleaned;
          }
        }
      } else {
        content = cleaned;
      }
    } else if (typeof message === 'object') {
      content = message.message || message.text || '';
    }

    // Limpieza final: si el contenido aún parece JSON, extraer el mensaje
    if (content && (content.trim().startsWith('{') || content.trim().startsWith('['))) {
      try {
        const parsed = JSON.parse(content);
        content = parsed.message || parsed.text || '';
      } catch (e) {
        // Intentar con regex como último recurso
        const match = content.match(/"message"\s*:\s*"([^"]*)"/);
        if (match && match[1]) {
          content = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
      }
    }

    // Limpiar escapes de JSON
    if (content) {
      content = content
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'");
    }

    return content.trim();
  },

  copyMessage(index) {
    const message = this.state.results?.messages?.[index];
    if (!message) return;

    const content = this.extractCleanMessage(message);

    if (!content || content === '{}' || content === '[]') {
      Utils.showToast('No hay mensaje para copiar', 'warning');
      return;
    }

    navigator.clipboard
      .writeText(content)
      .then(() => Utils.showToast('Mensaje copiado al portapapeles', 'success'))
      .catch(() => Utils.showToast('No se pudo copiar el mensaje', 'warning'));
  },

  normalizePhoneNumber(phone) {
    if (!phone) return '';
    const digits = String(phone).replace(/\D+/g, '');
    if (digits.startsWith('00')) {
      return digits.slice(2);
    }
    return digits;
  },

  openWhatsAppMessage(index) {
    const message = this.state.results?.messages?.[index];
    if (!message) return;

    // Extraer mensaje limpio usando la función centralizada
    const messageObj =
      typeof message === 'string' ? this.safeParseJson(message) || { message: message } : message;
    const client = this.clientInsights.find(
      (c) => c.id === (messageObj.client_id || message.client_id)
    );
    const phoneDigits = this.normalizePhoneNumber(client?.telefono || '');

    if (!phoneDigits || phoneDigits.length < 7) {
      Utils.showToast('El cliente no tiene un número de WhatsApp válido.', 'warning');
      return;
    }

    let content = this.extractCleanMessage(message);

    // Si el contenido está vacío, usar fallback
    if (!content || content.trim() === '') {
      content = `Hola ${client?.nombre || 'Cliente'}, tenemos una promoción especial para ti.`;
    }

    const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(content)}`;
    window.open(url, '_blank', 'noopener');
  },

  async shareMessage(index) {
    const message = this.state.results?.messages?.[index];
    if (!message) return;

    // Extraer mensaje limpio usando la función centralizada
    const messageObj =
      typeof message === 'string' ? this.safeParseJson(message) || { message: message } : message;
    const client = this.clientInsights.find(
      (c) => c.id === (messageObj.client_id || message.client_id)
    );

    let messageText = this.extractCleanMessage(message);

    // Si está vacío, usar fallback
    if (!messageText || messageText.trim() === '') {
      messageText = `Hola ${client?.nombre || 'Cliente'}, tenemos una promoción especial para ti.`;
    }

    const vehiculo = client?.vehiculos?.[0];
    const vehiculoText = vehiculo
      ? `${vehiculo.marca || ''} ${vehiculo.modelo || ''} ${vehiculo.anio || ''}`.trim()
      : '';
    const detalles = [];
    if (client?.nombre) detalles.push(`Cliente: ${client.nombre}`);
    if (client?.telefono) detalles.push(`Teléfono: ${client.telefono}`);
    if (client?.email) detalles.push(`Email: ${client.email}`);
    if (vehiculoText) detalles.push(`Vehículo: ${vehiculoText}`);
    if (client?.ciudad) detalles.push(`Ciudad: ${client.ciudad}`);

    const recomendaciones = (messageObj.recommendations || [])
      .map((rec) => {
        const oferta = rec.oferta ? ` (${rec.oferta})` : '';
        const motivo = rec.motivo ? ` - ${rec.motivo}` : '';
        return `• ${rec.producto || 'Recomendación'}${oferta}${motivo}`.trim();
      })
      .filter((text) => text && text !== '•');

    const parts = [];
    if (messageText) parts.push(messageText.trim());
    if (detalles.length) parts.push(`Datos del cliente:\n${detalles.join('\n')}`);
    if (recomendaciones.length)
      parts.push(`Recomendaciones sugeridas:\n${recomendaciones.join('\n')}`);
    const shareText = parts.join('\n\n');
    const title = this.state.results?.summary?.campaign_title || 'Campaña personalizada';

    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText });
        Utils.showToast('Contenido listo para compartir.', 'success');
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') {
          return;
        }
        console.warn('No se pudo compartir con Web Share API:', error);
      }
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(shareText)
        .then(() =>
          Utils.showToast('Contenido copiado. Pégalo en la app que prefieras.', 'success')
        )
        .catch(() => Utils.showToast('No se pudo copiar el contenido para compartir.', 'warning'));
    } else {
      Utils.showToast('Copia el texto manualmente para compartirlo.', 'warning');
    }
  },

  createReminderFromMessage(index) {
    const message = this.state.results?.messages?.[index];
    if (!message) return;

    // Extraer mensaje limpio
    const messageObj =
      typeof message === 'string' ? this.safeParseJson(message) || { message: message } : message;
    const client = this.clientInsights.find(
      (c) => c.id === (messageObj.client_id || message.client_id)
    );

    let messageText = messageObj.message || messageObj.text || '';

    // Si está vacío, usar fallback
    if (!messageText || typeof messageText === 'object') {
      messageText = 'Seguimiento de campaña de marketing';
    }

    // Limpiar si parece JSON
    if (messageText.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(messageText);
        messageText = parsed.message || parsed.text || messageText;
      } catch (e) {
        // Mantener texto original
      }
    }

    const recordatorio = {
      id: Utils.generateId(),
      titulo: `Campaña ${this.state.results.summary?.campaign_title || 'Marketing personalizado'}`,
      descripcion: messageText.slice(0, 180),
      tipo: 'marketing',
      prioridad: 'media',
      fecha: Utils.getCurrentDate ? Utils.getCurrentDate() : new Date().toISOString().slice(0, 10),
      hora: Utils.getCurrentTime ? Utils.getCurrentTime() : '09:00',
      recurrente: 'ninguno',
      completado: false,
      color: '#6366f1',
      notificado: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clienteId: client?.id || null,
    };

    Database.add('recordatorios', recordatorio);
    Utils.showToast('Recordatorio creado', 'success');
  },

  guardarCampania() {
    if (!this.state.results) {
      Utils.showToast('Genera una campaña antes de guardarla.', 'warning');
      return;
    }

    const data = {
      id: Utils.generateId(),
      titulo: this.state.results.summary?.campaign_title || 'Campaña personalizada',
      resumen: this.state.results.summary,
      mensajes: this.state.results.messages,
      contexto: this.state.results.context,
      promociones: this.state.activePromotions,
      notas: this.state.notes,
      createdAt: new Date().toISOString(),
    };

    Database.add('campanias_marketing', data);
    this.savedCampaigns = Database.getCollection('campanias_marketing') || [];
    this.renderSavedCampaigns();
    Utils.showToast('Campaña guardada', 'success');
  },

  renderSavedCampaigns() {
    const list = this.container.querySelector('#savedCampaignsList');
    if (!list) return;

    if (!this.savedCampaigns.length) {
      list.innerHTML =
        '<div class="empty-state"><i class="fas fa-archive"></i><p>No hay campañas guardadas.</p></div>';
      return;
    }

    list.innerHTML = this.savedCampaigns
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map((campaign) => {
        const fecha = campaign.createdAt ? this.formatDate(new Date(campaign.createdAt)) : '-';
        return `
          <div class="saved-campaign-card">
            <div>
              <strong>${campaign.titulo}</strong>
              <p class="inline-muted">${fecha}</p>
            </div>
            <footer>
              <span class="inline-muted">${campaign.mensajes?.length || 0} mensajes personalizados</span>
              <div class="btn-group">
                <button class="btn btn-sm btn-secondary" data-action="ver" data-id="${campaign.id}">Ver</button>
                <button class="btn btn-sm btn-danger" data-action="eliminar" data-id="${campaign.id}">Eliminar</button>
              </div>
            </footer>
          </div>
        `;
      })
      .join('');
  },

  openSavedCampaign(id) {
    const campaign = this.savedCampaigns.find((c) => c.id === id);
    if (!campaign) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalCampaniaGuardada';

    // Función helper para extraer mensaje limpio
    const extractCleanMessage = (msg) => {
      const messageObj =
        typeof msg === 'string' ? this.safeParseJson(msg) || { message: msg } : msg;
      let text = messageObj.message || messageObj.text || '';

      if (!text || typeof text === 'object') {
        return 'Mensaje no disponible';
      }

      // Limpiar si parece JSON
      if (text.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(text);
          text = parsed.message || parsed.text || text;
        } catch (e) {
          // Mantener texto original
        }
      }

      return text;
    };

    modal.innerHTML = `
      <div class="modal-container" style="max-width: 780px;">
        <div class="modal-header">
          <h3><i class="fas fa-archive"></i> ${campaign.titulo}</h3>
          <button class="btn-close" onclick="document.getElementById('modalCampaniaGuardada').remove()">×</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <h4>Resumen</h4>
          <div style="background: rgba(99,102,241,0.08); padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem;">
            <p><strong>Idea central:</strong> ${campaign.resumen?.big_idea || 'No especificada'}</p>
            <p><strong>Posicionamiento:</strong> ${campaign.resumen?.positioning || 'No especificado'}</p>
          </div>
          <h4>Mensajes</h4>
          ${
            (campaign.mensajes || [])
              .map((msg) => {
                const messageObj =
                  typeof msg === 'string' ? this.safeParseJson(msg) || { message: msg } : msg;
                const clienteName =
                  this.clientInsights.find((c) => c.id === (messageObj.client_id || msg.client_id))
                    ?.nombre || 'Cliente';
                const channel = messageObj.preferred_channel || msg.preferred_channel || 'whatsapp';
                const cleanMessage = extractCleanMessage(msg);

                return `
              <article class="message-card" style="margin-bottom: 1rem;">
                <header>
                  <h4>${clienteName}</h4>
                  <span class="inline-muted">Canal: ${channel}</span>
                </header>
                <div class="message-body">${cleanMessage}</div>
              </article>
            `;
              })
              .join('') || '<p class="inline-muted">No se guardaron mensajes en esta campaña.</p>'
          }
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalCampaniaGuardada').remove()">Cerrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  deleteSavedCampaign(id) {
    const confirmDelete = () => {
      Database.saveCollection(
        'campanias_marketing',
        this.savedCampaigns.filter((c) => c.id !== id)
      );
      this.savedCampaigns = Database.getCollection('campanias_marketing') || [];
      this.renderSavedCampaigns();
      Utils.showToast('Campaña eliminada', 'success');
    };

    if (typeof Utils !== 'undefined' && Utils.showConfirm) {
      Utils.showConfirm('¿Eliminar campaña guardada?', confirmDelete);
    } else if (confirm('¿Eliminar campaña guardada?')) {
      confirmDelete();
    }
  },

  openClientDetail(clientId) {
    const client = this.clientInsights.find((c) => c.id === clientId);
    if (!client) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalDetalleClienteMarketing';

    const vehiculosHtml = client.vehiculos.length
      ? client.vehiculos
          .map(
            (v) =>
              `<li>${v.marca || ''} ${v.modelo || ''} ${v.anio || ''} · ${v.placa || 'sin placa'}</li>`
          )
          .join('')
      : '<li>Sin vehículos registrados</li>';

    const historicoHtml = client.topProductos.length
      ? client.topProductos.map((p) => `<li>${p.nombre} (${p.cantidad})</li>`).join('')
      : '<li>Sin compras registradas</li>';

    modal.innerHTML = `
      <div class="modal-container" style="max-width: 640px;">
        <div class="modal-header">
          <h3><i class="fas fa-user"></i> ${client.nombre}</h3>
          <button class="btn-close" onclick="document.getElementById('modalDetalleClienteMarketing').remove()">×</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <p><strong>Segmento:</strong> ${client.segmento}</p>
          <p><strong>Ticket promedio:</strong> ${this.formatCurrency(client.ticketPromedio)}</p>
          <p><strong>Días desde última compra:</strong> ${client.diasDesdeUltima ?? 'Sin compras'}</p>
          <hr>
          <h4>Vehículos</h4>
          <ul>${vehiculosHtml}</ul>
          <h4>Productos frecuentes</h4>
          <ul>${historicoHtml}</ul>
          <h4>Notas</h4>
          <p>${client.notas || 'Sin notas'}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalDetalleClienteMarketing').remove()">Cerrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  getSelectedClientInsights() {
    return this.clientInsights.filter((client) => this.state.selectedClients.has(client.id));
  },

  getBusinessInfo() {
    const configTienda = Database.get('configTienda') || {};
    const configuracion = Database.get('configuracion') || {};
    return {
      nombre: configTienda.nombre || configuracion.nombreNegocio || '',
      telefono: configTienda.telefono || configuracion.telefono || '',
      email: configTienda.email || configuracion.email || '',
      direccion: configTienda.direccion || configuracion.direccion || '',
      ciudad: configTienda.ciudad || '',
      ruc: configTienda.ruc || configuracion.ruc || '',
    };
  },

  parseDate(fecha, hora) {
    if (!fecha) return null;
    const base = hora ? `${fecha}T${hora}` : `${fecha}T00:00:00`;
    const parsed = new Date(base);
    return isNaN(parsed.getTime()) ? null : parsed;
  },

  formatCurrency(amount) {
    if (typeof Utils !== 'undefined' && typeof Utils.formatCurrency === 'function') {
      return Utils.formatCurrency(amount || 0);
    }
    return `$${Number(amount || 0).toFixed(2)}`;
  },

  formatDate(date) {
    if (!date) return '-';
    if (typeof Utils !== 'undefined' && typeof Utils.formatDate === 'function') {
      return Utils.formatDate(date, 'long');
    }
    return new Date(date).toLocaleDateString();
  },

  formatRelativeDate(date) {
    if (!date) return 'Sin compras';
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Hoy';
    if (diff === 1) return 'Hace 1 día';
    if (diff < 30) return `Hace ${diff} días`;
    const months = Math.floor(diff / 30);
    if (months === 1) return 'Hace 1 mes';
    if (months < 12) return `Hace ${months} meses`;
    const years = Math.floor(months / 12);
    return years === 1 ? 'Hace 1 año' : `Hace ${years} años`;
  },

  // ============================================
  // ANÁLISIS PROFESIONAL DE MÁRGENES
  // ============================================
  buildProductMargins() {
    const margins = {};

    this.productos.forEach((producto) => {
      const precioCompra = Number(producto.precio_compra || producto.precioCompra || 0);
      const precioVenta = Number(producto.precio_venta || producto.precioVenta || 0);

      if (precioVenta > 0 && precioCompra > 0) {
        const margen = precioVenta - precioCompra;
        const margenPorcentaje = (margen / precioVenta) * 100;

        margins[producto.id] = {
          productoId: producto.id,
          nombre: producto.nombre,
          precioCompra,
          precioVenta,
          margen,
          margenPorcentaje,
          stock: Number(producto.stock || 0),
          categoria: this.categoryMap.get(producto.categoria) || producto.categoria,
        };
      }
    });

    return margins;
  },

  // ============================================
  // ANÁLISIS DE ENGAGEMENT DE CLIENTES
  // ============================================
  buildCustomerEngagement() {
    const engagement = {};

    this.clientes.forEach((cliente) => {
      const notificaciones = this.notificacionesEnviadas.filter(
        (n) => n && (n.destinatario_id === cliente.id || n.cliente_id === cliente.id)
      );

      const ordenesCliente = this.ordenesTabajo.filter(
        (o) => o && (o.cliente_id === cliente.id || o.clienteId === cliente.id)
      );

      const deudas = this.cuentasPorCobrar.filter(
        (c) => c && c.cliente_id === cliente.id && c.estado !== 'pagada'
      );

      const citasCliente = this.citas.filter((c) => c && c.cliente_id === cliente.id);

      engagement[cliente.id] = {
        clienteId: cliente.id,
        notificacionesRecibidas: notificaciones.length,
        ultimaNotificacion:
          notificaciones.length > 0
            ? new Date(
                Math.max(...notificaciones.map((n) => new Date(n.fecha || n.created_at).getTime()))
              )
            : null,
        tieneDeudas: deudas.length > 0,
        montoDeuda: deudas.reduce((sum, d) => sum + Number(d.monto || d.saldo || 0), 0),
        ordenesActivas: ordenesCliente.filter(
          (o) => o.estado !== 'completada' && o.estado !== 'cancelada'
        ).length,
        citasPendientes: citasCliente.filter(
          (c) => c.estado === 'pendiente' || c.estado === 'confirmada'
        ).length,
        proximaCita:
          citasCliente
            .filter((c) => c.estado !== 'cancelada' && new Date(c.fecha) > new Date())
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0] || null,
        tieneTelegram: Boolean(cliente.telegram_chat_id),
        tieneWhatsApp: Boolean(cliente.telefono),
        tieneEmail: Boolean(cliente.email),
        preferenciaComunicacion: cliente.preferencia_comunicacion || 'whatsapp',
      };
    });

    return engagement;
  },

  // ============================================
  // ANÁLISIS DE SERVICIOS PRÓXIMOS
  // ============================================
  buildServiceSchedule() {
    const schedule = {};

    this.vehiculos.forEach((vehiculo) => {
      const ordenesVehiculo = this.ordenesTabajo
        .filter((o) => o && o.vehiculo_id === vehiculo.id)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      const ultimaOrden = ordenesVehiculo[0];
      const kilometrajeActual = Number(vehiculo.kilometraje || 0);

      // Calcular próximo servicio basado en kilometraje
      let proximoServicio = null;
      if (kilometrajeActual > 0) {
        const intervalosServicio = [
          5000, 10000, 15000, 20000, 30000, 40000, 50000, 60000, 80000, 100000,
        ];
        const proximoKm =
          intervalosServicio.find((km) => km > kilometrajeActual) || kilometrajeActual + 10000;
        const kmFaltantes = proximoKm - kilometrajeActual;

        proximoServicio = {
          tipo: this.getTipoServicio(proximoKm),
          kilometraje: proximoKm,
          kmFaltantes,
          urgencia: kmFaltantes < 1000 ? 'alta' : kmFaltantes < 3000 ? 'media' : 'baja',
        };
      }

      schedule[vehiculo.id] = {
        vehiculoId: vehiculo.id,
        clienteId: vehiculo.cliente_id || vehiculo.clienteId,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        placa: vehiculo.placa,
        kilometrajeActual,
        ultimoServicio: ultimaOrden ? new Date(ultimaOrden.fecha) : null,
        diasDesdeUltimoServicio: ultimaOrden
          ? Math.floor((new Date() - new Date(ultimaOrden.fecha)) / (1000 * 60 * 60 * 24))
          : null,
        proximoServicio,
      };
    });

    return schedule;
  },

  // ============================================
  // DETERMINAR TIPO DE SERVICIO POR KILOMETRAJE
  // ============================================
  getTipoServicio(km) {
    if (km % 100000 === 0) return 'Servicio Mayor (100k)';
    if (km % 60000 === 0) return 'Servicio Mayor (60k)';
    if (km % 30000 === 0) return 'Servicio Intermedio (30k)';
    if (km % 20000 === 0) return 'Servicio Completo (20k)';
    if (km % 10000 === 0) return 'Servicio Estándar (10k)';
    if (km % 5000 === 0) return 'Cambio de Aceite (5k)';
    return 'Servicio de Rutina';
  },

  // ============================================
  // ENRIQUECER INSIGHTS DE CLIENTES
  // ============================================
  enrichClientInsight(clientInsight) {
    // Validación de datos básicos
    if (!clientInsight || !clientInsight.id) {
      console.warn('enrichClientInsight: clientInsight inválido', clientInsight);
      return clientInsight;
    }

    const engagement = this.customerEngagement[clientInsight.id] || {};

    // Enriquecer vehículos con datos de servicio (con validación)
    const vehiculosConServicio = (clientInsight.vehiculos || []).map((v) => {
      if (!v || !v.id) return v;
      return {
        ...v,
        ...(this.serviceSchedule[v.id] || {}),
      };
    });

    // Enriquecer productos con datos de margen (con validación)
    const productosConMargen = (clientInsight.topProductos || []).map((p) => {
      if (!p || !p.productoId) return p;
      return {
        ...p,
        margen: this.productMargins[p.productoId] || null,
      };
    });

    return {
      ...clientInsight,
      engagement,
      vehiculos: vehiculosConServicio,
      topProductos: productosConMargen,
      // Score de engagement (0-100)
      engagementScore: this.calculateEngagementScore(clientInsight, engagement),
      // Valor de vida del cliente proyectado
      lifetimeValue: this.calculateLifetimeValue(clientInsight),
      // Probabilidad de compra (0-100)
      purchaseProbability: this.calculatePurchaseProbability(clientInsight, engagement),
    };
  },

  // ============================================
  // CALCULAR SCORE DE ENGAGEMENT
  // ============================================
  calculateEngagementScore(client, engagement) {
    let score = 0;

    // Actividad reciente (30 puntos)
    if (client.diasDesdeUltima !== null) {
      if (client.diasDesdeUltima <= 30) score += 30;
      else if (client.diasDesdeUltima <= 90) score += 20;
      else if (client.diasDesdeUltima <= 180) score += 10;
    }

    // Frecuencia de compra (25 puntos)
    if (client.numeroCompras >= 10) score += 25;
    else if (client.numeroCompras >= 5) score += 20;
    else if (client.numeroCompras >= 3) score += 15;
    else if (client.numeroCompras >= 1) score += 10;

    // Valor total gastado (20 puntos)
    if (client.totalGastado >= 5000) score += 20;
    else if (client.totalGastado >= 2000) score += 15;
    else if (client.totalGastado >= 1000) score += 10;
    else if (client.totalGastado >= 500) score += 5;

    // Canales de comunicación (15 puntos)
    const canales =
      (engagement.tieneTelegram ? 5 : 0) +
      (engagement.tieneWhatsApp ? 5 : 0) +
      (engagement.tieneEmail ? 5 : 0);
    score += canales;

    // Engagement con notificaciones (10 puntos)
    if (engagement.notificacionesRecibidas > 0) {
      const diasDesdeNotif = engagement.ultimaNotificacion
        ? Math.floor((new Date() - engagement.ultimaNotificacion) / (1000 * 60 * 60 * 24))
        : 999;
      if (diasDesdeNotif <= 30) score += 10;
      else if (diasDesdeNotif <= 90) score += 5;
    }

    return Math.min(100, score);
  },

  // ============================================
  // CALCULAR VALOR DE VIDA DEL CLIENTE
  // ============================================
  calculateLifetimeValue(client) {
    if (client.numeroCompras === 0) return 0;

    // Valor promedio por compra
    const avgOrderValue = client.totalGastado / client.numeroCompras;

    // Frecuencia anual estimada
    const diasDesdeInicio =
      client.diasDesdeUltima !== null
        ? client.diasDesdeUltima + client.numeroCompras * 60 // Estimar duración de relación
        : 365;
    const comprasAnuales = (client.numeroCompras / diasDesdeInicio) * 365;

    // Proyección a 3 años
    const lifetimeYears = 3;
    const retentionRate =
      client.segmento === 'Premium' ? 0.9 : client.segmento === 'Frecuente' ? 0.8 : 0.7;

    return avgOrderValue * comprasAnuales * lifetimeYears * retentionRate;
  },

  // ============================================
  // CALCULAR PROBABILIDAD DE COMPRA
  // ============================================
  calculatePurchaseProbability(client, engagement) {
    let probability = 50; // Base 50%

    // Ajuste por recencia
    if (client.diasDesdeUltima !== null) {
      if (client.diasDesdeUltima <= 30) probability += 20;
      else if (client.diasDesdeUltima <= 60) probability += 10;
      else if (client.diasDesdeUltima <= 90) probability += 5;
      else if (client.diasDesdeUltima > 180) probability -= 20;
    }

    // Ajuste por frecuencia
    if (client.numeroCompras >= 5) probability += 15;
    else if (client.numeroCompras >= 3) probability += 10;
    else if (client.numeroCompras === 1) probability -= 10;

    // Ajuste por engagement
    if (engagement.citasPendientes > 0) probability += 25;
    if (engagement.ordenesActivas > 0) probability += 15;

    // Ajuste por servicios próximos
    const vehiculoConServicioCercano = client.vehiculos.some(
      (v) => this.serviceSchedule[v.id]?.proximoServicio?.urgencia === 'alta'
    );
    if (vehiculoConServicioCercano) probability += 20;

    // Ajuste por deudas
    if (engagement.tieneDeudas && engagement.montoDeuda > client.ticketPromedio) {
      probability -= 15;
    }

    return Math.max(0, Math.min(100, probability));
  },

  // ============================================
  // INTEGRACIÓN CON PUBLICIDAD (NUEVA)
  // ============================================

  /**
   * Generar publicidad segmentada usando datos de clientes
   * @param {Object} producto - Producto a promocionar
   * @param {Object} promocion - Tipo de promoción
   * @param {Array} redesSociales - Redes sociales objetivo
   * @param {Array} clientesSegmento - Clientes del segmento
   * @returns {Promise<Object>} - Contenido generado
   */
  async generarPublicidadSegmentada(producto, promocion, redesSociales, clientesSegmento = []) {
    if (!window.Publicidad || typeof Publicidad.generarPublicidadCompleta !== 'function') {
      console.error('Módulo Publicidad no disponible');
      Utils.showToast('Módulo de Publicidad no está cargado', 'error');
      return null;
    }

    const state = { producto, promocion, redesSociales };

    // Preparar datos de marketing si hay clientes seleccionados
    const options = {};
    if (clientesSegmento.length > 0) {
      const insights = clientesSegmento.map(
        (c) => this.clientInsights.find((ci) => ci.id === c.id) || c
      );

      // Analizar segmento
      const segmento = this.identificarSegmento(insights);
      const topCategorias = this.getTopCategoriasSegmento(insights);
      const ticketPromedio =
        insights.reduce((sum, c) => sum + (c.ticketPromedio || 0), 0) / insights.length;
      const probabilidadPromedio =
        insights.reduce((sum, c) => sum + (c.purchaseProbability || 0), 0) / insights.length;

      options.clientesObjetivo = insights;
      options.segmento = segmento;
      options.datosMarketing = {
        topCategorias,
        ticketPromedio,
        probabilidadCompraPromedio: probabilidadPromedio,
        comportamiento: this.getComportamientoSegmento(insights),
      };
    }

    console.log('📊 Generando publicidad con datos de marketing:', options);
    return await Publicidad.generarPublicidadCompleta(state, options);
  },

  identificarSegmento(insights) {
    if (!insights.length) return 'General';

    const promedioGasto =
      insights.reduce((sum, c) => sum + (c.totalGastado || 0), 0) / insights.length;
    const promedioCompras =
      insights.reduce((sum, c) => sum + (c.numeroCompras || 0), 0) / insights.length;

    if (promedioGasto > 1000 && promedioCompras >= 5) return 'Clientes Premium';
    if (promedioCompras >= 3) return 'Clientes Frecuentes';
    if (promedioCompras === 1) return 'Clientes Nuevos';
    return 'Clientes Regulares';
  },

  getTopCategoriasSegmento(insights) {
    const categorias = {};
    insights.forEach((c) => {
      (c.categoriasFavoritas || []).forEach((cat) => {
        categorias[cat] = (categorias[cat] || 0) + 1;
      });
    });

    return Object.entries(categorias)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);
  },

  getComportamientoSegmento(insights) {
    const promedioRecencia =
      insights.reduce((sum, c) => sum + (c.diasDesdeUltima || 0), 0) / insights.length;

    if (promedioRecencia < 30) return 'Muy activos, compran frecuentemente';
    if (promedioRecencia < 60) return 'Activos, responden bien a ofertas';
    if (promedioRecencia < 90) return 'Moderadamente activos, necesitan incentivo';
    return 'Inactivos, requieren reactivación con ofertas atractivas';
  },

  // ============================================
  // ENVÍO DE CAMPAÑAS AUTOMÁTICO (NUEVA)
  // ============================================

  /**
   * Enviar campaña a través del sistema de notificaciones
   * @param {Object} campaign - Datos de la campaña
   * @param {Array} selectedClients - Clientes seleccionados
   * @param {Object} messages - Mensajes personalizados por cliente
   * @returns {Promise<Object>} - Resultado del envío
   */
  async enviarCampañaAutomatica(campaign, selectedClients, messages) {
    if (!campaign || !selectedClients || !messages) {
      Utils.showToast('Faltan datos para enviar la campaña', 'error');
      return { success: false };
    }

    Utils.showToast('Enviando campaña...', 'info');

    try {
      const campaignId = `campaign_${Date.now()}`;
      let enviadosExitosos = 0;
      let errores = 0;

      // Enviar notificación a cada cliente
      for (const client of selectedClients) {
        const message = messages[client.id];
        if (!message) continue;

        try {
          const response = await fetch('/api/notifications/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Auth.getAccessToken()}`,
            },
            body: JSON.stringify({
              tipo_evento: 'campaña_marketing',
              negocio_id: Auth.getCurrentBusinessId(),
              referencia_id: campaignId,
              contexto: JSON.stringify({
                cliente_id: client.id,
                segmento: client.segmento,
                productos: client.topProductos || [],
                promocion: campaign.promocion || {},
                probabilidad_compra: client.purchaseProbability,
              }),
              titulo: campaign.titulo || 'Oferta especial para ti',
              mensaje: message.message || message.text || message,
              usuarios_destino: [client.id],
              canales: [
                message.preferred_channel ||
                  client.engagement?.preferenciaComunicacion ||
                  'whatsapp',
              ],
            }),
          });

          if (response.ok) {
            enviadosExitosos++;
          } else {
            errores++;
            console.error(`Error enviando a ${client.nombre}:`, await response.text());
          }
        } catch (error) {
          errores++;
          console.error(`Error enviando notificación a ${client.nombre}:`, error);
        }
      }

      // Guardar campaña con métricas
      const savedCampaign = {
        id: campaignId,
        fecha: new Date().toISOString(),
        titulo: campaign.titulo || campaign.summary?.campaign_title || 'Campaña sin título',
        clientesImpactados: selectedClients.length,
        messages: messages,
        summary: campaign.summary || {},
        status: 'enviada',
        metrics: {
          sent: enviadosExitosos,
          errors: errores,
          opened: 0,
          clicked: 0,
          converted: 0,
        },
      };

      this.savedCampaigns.push(savedCampaign);
      Database.saveCollection('campanias_marketing', this.savedCampaigns);

      Utils.showToast(
        `Campaña enviada: ${enviadosExitosos} exitosos, ${errores} errores`,
        errores === 0 ? 'success' : 'warning'
      );

      return {
        success: true,
        campaignId,
        sent: enviadosExitosos,
        errors: errores,
      };
    } catch (error) {
      console.error('Error enviando campaña:', error);
      Utils.showToast('Error al enviar la campaña', 'error');
      return { success: false, error: error.message };
    }
  },

  // ============================================
  // TRACKING DE EFECTIVIDAD (NUEVA)
  // ============================================

  /**
   * Registrar acción de tracking de campaña
   * @param {string} campaignId - ID de la campaña
   * @param {string} clientId - ID del cliente
   * @param {string} action - Acción: 'opened', 'clicked', 'converted'
   */
  async trackCampaignAction(campaignId, clientId, action) {
    try {
      // Enviar al backend
      await fetch(`/api/notifications/${campaignId}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Auth.getAccessToken()}`,
        },
        body: JSON.stringify({ action, clientId }),
      });

      // Actualizar métricas locales
      const campaign = this.savedCampaigns.find((c) => c.id === campaignId);
      if (campaign && campaign.metrics) {
        campaign.metrics[action] = (campaign.metrics[action] || 0) + 1;
        Database.saveCollection('campanias_marketing', this.savedCampaigns);
      }

      // Si convirtió, aumentar probability del cliente
      if (action === 'converted') {
        const clientInsight = this.clientInsights.find((c) => c.id === clientId);
        if (clientInsight) {
          clientInsight.purchaseProbability = Math.min(100, clientInsight.purchaseProbability + 10);
          clientInsight.engagementScore = Math.min(100, clientInsight.engagementScore + 5);
          console.log(
            `✅ Cliente ${clientId}: Probability aumentada a ${clientInsight.purchaseProbability}%`
          );
        }
      }

      console.log(`📊 Tracking: ${action} registrado para ${clientId} en campaña ${campaignId}`);
    } catch (error) {
      console.error('Error en tracking:', error);
    }
  },

  /**
   * Obtener métricas de efectividad de campañas
   * @returns {Array} - Métricas de todas las campañas
   */
  getCampaignMetrics() {
    return this.savedCampaigns.map((campaign) => ({
      id: campaign.id,
      fecha: campaign.fecha,
      titulo: campaign.titulo,
      clientesImpactados: campaign.clientesImpactados,
      metrics: campaign.metrics || {},
      tasaApertura:
        campaign.metrics?.sent > 0
          ? ((campaign.metrics.opened / campaign.metrics.sent) * 100).toFixed(1)
          : '0',
      tasaConversion:
        campaign.metrics?.sent > 0
          ? ((campaign.metrics.converted / campaign.metrics.sent) * 100).toFixed(1)
          : '0',
      roi: campaign.metrics?.converted > 0 ? 'Positivo' : 'Pendiente',
    }));
  },
};
