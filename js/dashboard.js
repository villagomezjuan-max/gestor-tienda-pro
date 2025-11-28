// ============================================
// MÓDULO: DASHBOARD CON GRÁFICOS
// ============================================
// Dashboard principal con estadísticas visuales y gráficos usando Chart.js

const Dashboard = {
  // Referencias a las instancias de Chart.js
  charts: {
    ventas: null,
    productos: null,
    categorias: null,
  },

  /**
   * Renderiza el dashboard completo
   * @param {HTMLElement} container - Contenedor donde renderizar
   */
  async render(container) {
    // Mostrar indicador de carga
    container.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; min-height: 400px;">
        <div class="spinner"></div>
        <p style="margin-left: 1rem;">Cargando datos del dashboard...</p>
      </div>
    `;

    // Obtener datos reales desde el backend
    let ventas = [];
    let productos = [];
    let clientes = [];
    let recordatorios = [];
    let stats = null;

    try {
      console.log('📊 Dashboard: Cargando datos desde API...');

      // Usar DatabaseAPI para obtener datos reales
      if (window.DatabaseAPI && typeof DatabaseAPI.request === 'function') {
        // Cargar datos en paralelo
        const [ventasRes, productosRes, clientesRes, statsRes] = await Promise.allSettled([
          DatabaseAPI.request('/ventas').catch((err) => {
            console.warn('Error cargando ventas:', err);
            return [];
          }),
          DatabaseAPI.request('/productos').catch((err) => {
            console.warn('Error cargando productos:', err);
            return [];
          }),
          DatabaseAPI.request('/clientes').catch((err) => {
            console.warn('Error cargando clientes:', err);
            return [];
          }),
          DatabaseAPI.request('/dashboard/stats').catch((err) => {
            console.warn('Error cargando estadísticas:', err);
            return null;
          }),
        ]);

        ventas = ventasRes.status === 'fulfilled' ? ventasRes.value || [] : [];
        productos = productosRes.status === 'fulfilled' ? productosRes.value || [] : [];
        clientes = clientesRes.status === 'fulfilled' ? clientesRes.value || [] : [];
        stats = statsRes.status === 'fulfilled' ? statsRes.value : null;

        console.log(
          `✅ Datos cargados: ${ventas.length} ventas, ${productos.length} productos, ${clientes.length} clientes`
        );
        console.log('📊 Estadísticas:', stats);
      } else {
        console.warn('⚠️ DatabaseAPI no disponible, usando Database legacy');
        // Fallback a Database legacy
        ventas = (await Database.getCollection('ventas')) || [];
        productos = (await Database.getCollection('productos')) || [];
        clientes = (await Database.getCollection('clientes')) || [];
      }

      // Recordatorios pueden venir de local
      recordatorios = (await Database.getCollection('recordatorios')) || [];
    } catch (error) {
      console.error('❌ Error cargando datos del dashboard:', error);
      Utils.showToast?.('Error cargando datos. Mostrando información disponible.', 'warning');
    }

    // Asegurar que sean arrays
    if (!Array.isArray(ventas)) ventas = [];
    if (!Array.isArray(productos)) productos = [];
    if (!Array.isArray(clientes)) clientes = [];
    if (!Array.isArray(recordatorios)) recordatorios = [];

    // Calcular KPIs (usar stats del backend si está disponible)
    const kpis = stats
      ? this.calcularKPIsDesdeStats(stats, recordatorios)
      : this.calcularKPIs(ventas, productos, recordatorios);

    // Productos con stock bajo - CORREGIDO para detectar correctamente
    const productosStockBajo = productos.filter((p) => {
      const stock = Number(p.stock || 0);
      const stockMinimo = Number(p.stockMinimo || p.stock_minimo || 0);
      return stock <= stockMinimo;
    });

    console.log('📊 KPIs calculados:', kpis);
    console.log('📦 Total de productos cargados:', productos.length);
    console.log('⚠️ Productos con stock bajo detectados:', productosStockBajo.length);
    if (productosStockBajo.length > 0) {
      console.log(
        '🔍 Productos con stock bajo:',
        productosStockBajo.map((p) => ({
          nombre: p.nombre,
          stock: p.stock,
          stockMinimo: p.stockMinimo || p.stock_minimo,
        }))
      );
    }

    container.innerHTML = `
      <!-- Header con botón de actualizar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg);">
        <h2 style="margin: 0; color: var(--text-primary);">
          <i class="fas fa-chart-line"></i> Dashboard en Tiempo Real
        </h2>
        <button class="btn btn-primary" onclick="Dashboard.actualizarDatos()" id="btnActualizarDashboard">
          <i class="fas fa-sync-alt"></i> Actualizar Datos
        </button>
      </div>

      <!-- KPIs superiores -->
      <div class="dashboard-kpis">
        <div class="kpi-card kpi-success">
          <div class="kpi-icon">
            <i class="fas fa-dollar-sign"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">${Utils.formatCurrency(kpis.ventasHoy)}</div>
            <div class="kpi-label">Ventas Hoy</div>
            <div class="kpi-change ${kpis.cambioVentasDia >= 0 ? 'positive' : 'negative'}">
              <i class="fas fa-arrow-${kpis.cambioVentasDia >= 0 ? 'up' : 'down'}"></i>
              ${Math.abs(kpis.cambioVentasDia).toFixed(1)}% vs ayer
            </div>
          </div>
        </div>

        <div class="kpi-card kpi-primary">
          <div class="kpi-icon">
            <i class="fas fa-calendar-week"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">${Utils.formatCurrency(kpis.ventasSemana)}</div>
            <div class="kpi-label">Ventas Semana</div>
            <div class="kpi-change ${kpis.cambioVentasSemana >= 0 ? 'positive' : 'negative'}">
              <i class="fas fa-arrow-${kpis.cambioVentasSemana >= 0 ? 'up' : 'down'}"></i>
              ${Math.abs(kpis.cambioVentasSemana).toFixed(1)}% vs sem. anterior
            </div>
          </div>
        </div>

        <div class="kpi-card kpi-info">
          <div class="kpi-icon">
            <i class="fas fa-calendar-alt"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">${Utils.formatCurrency(kpis.ventasMes)}</div>
            <div class="kpi-label">Ventas Mes</div>
            <div class="kpi-change ${kpis.cambioVentasMes >= 0 ? 'positive' : 'negative'}">
              <i class="fas fa-arrow-${kpis.cambioVentasMes >= 0 ? 'up' : 'down'}"></i>
              ${Math.abs(kpis.cambioVentasMes).toFixed(1)}% vs mes anterior
            </div>
          </div>
        </div>

        <div class="kpi-card kpi-warning">
          <div class="kpi-icon">
            <i class="fas fa-box"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">${kpis.totalProductos || productos.length}</div>
            <div class="kpi-label">Productos Totales</div>
            <div class="kpi-change ${(kpis.productosStockBajo || productosStockBajo.length) > 0 ? 'negative' : 'positive'}">
              <i class="fas fa-exclamation-triangle"></i>
              ${kpis.productosStockBajo || productosStockBajo.length} con stock bajo
            </div>
          </div>
        </div>
      </div>

      <!-- Gráficos principales -->
      <div class="dashboard-charts">
        <!-- Gráfico de ventas (30 días) -->
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">
              <i class="fas fa-chart-line"></i>
              Ventas Últimos 30 Días
            </h3>
            <div class="chart-actions">
              <button class="btn btn-sm btn-secondary" onclick="Dashboard.exportarGrafico('ventas')">
                <i class="fas fa-download"></i>
              </button>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="ventasChart"></canvas>
          </div>
        </div>

        <!-- Gráfico de productos más vendidos -->
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">
              <i class="fas fa-chart-bar"></i>
              Top 10 Productos Más Vendidos
            </h3>
            <div class="chart-actions">
              <button class="btn btn-sm btn-secondary" onclick="Dashboard.exportarGrafico('productos')">
                <i class="fas fa-download"></i>
              </button>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="productosChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Gráfico de categorías y alertas -->
      <div class="dashboard-bottom">
        <!-- Distribución por categorías -->
        <div class="chart-card chart-donut">
          <div class="chart-header">
            <h3 class="chart-title">
              <i class="fas fa-chart-pie"></i>
              Ventas por Categoría
            </h3>
          </div>
          <div class="chart-body">
            <canvas id="categoriasChart"></canvas>
          </div>
        </div>

        <!-- Productos con stock bajo -->
        ${
          productosStockBajo.length > 0
            ? `
          <div class="alert-card alert-warning-panel">
            <div class="alert-header">
              <h3 class="alert-title">
                <i class="fas fa-exclamation-triangle"></i>
                ⚠️ ${productosStockBajo.length} Producto${productosStockBajo.length > 1 ? 's' : ''} con Stock Bajo
              </h3>
              <button class="btn btn-sm btn-primary" onclick="App.loadModule('productos')">
                <i class="fas fa-box"></i> Ver Todos
              </button>
            </div>
            <div class="alert-body">
              <div class="stock-alerts">
                ${productosStockBajo
                  .slice(0, 8)
                  .map((p) => {
                    const stock = Number(p.stock || 0);
                    const stockMinimo = Number(p.stockMinimo || p.stock_minimo || 0);
                    const porcentaje =
                      stockMinimo > 0 ? ((stock / stockMinimo) * 100).toFixed(0) : 0;
                    return `
                  <div class="stock-alert-item ${stock === 0 ? 'stock-critico' : ''}">
                    <div class="stock-alert-info">
                      <div class="stock-alert-name">
                        ${stock === 0 ? '🔴' : '⚠️'} ${Utils.escapeHTML(p.nombre)}
                      </div>
                      <div class="stock-alert-stock">
                        Stock: <strong class="${stock === 0 ? 'text-danger' : 'text-warning'}">${stock}</strong>
                        / Mínimo: <strong>${stockMinimo}</strong>
                        ${stock > 0 ? `<span class="badge badge-sm badge-warning">${porcentaje}% del mínimo</span>` : '<span class="badge badge-sm badge-danger">AGOTADO</span>'}
                      </div>
                    </div>
                    <button class="btn btn-sm btn-success" onclick="App.loadModule('compras')" title="Realizar compra">
                      <i class="fas fa-shopping-cart"></i> Comprar
                    </button>
                  </div>
                `;
                  })
                  .join('')}
              </div>
              ${
                productosStockBajo.length > 8
                  ? `
                <div style="text-align: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-light);">
                  <button class="btn btn-sm btn-secondary" onclick="App.loadModule('stock')">
                    <i class="fas fa-warehouse"></i> Ver ${productosStockBajo.length - 8} productos más con stock bajo
                  </button>
                </div>
              `
                  : ''
              }
            </div>
          </div>
        `
            : `
          <div class="alert-card alert-success-panel">
            <div class="alert-header">
              <h3 class="alert-title">
                <i class="fas fa-check-circle"></i>
                ✅ Stock Saludable
              </h3>
              <button class="btn btn-sm btn-secondary" onclick="Dashboard.actualizarDatos()" title="Actualizar información">
                <i class="fas fa-sync"></i>
              </button>
            </div>
            <div class="alert-body">
              <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--success-color); margin-bottom: 1rem; opacity: 0.8;"></i>
                <p style="color: var(--text-primary); margin: 0; font-size: 1.1rem; font-weight: 500;">Todos los productos tienen stock suficiente</p>
                <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 0.9rem;">${productos.length} productos monitoreados</p>
              </div>
            </div>
          </div>
        `
        }
      </div>

      <!-- Accesos rápidos -->
      <div class="dashboard-actions">
        <button class="action-btn action-primary" onclick="App.loadModule('ventas')">
          <i class="fas fa-cash-register"></i>
          <span>Nueva Venta</span>
        </button>
        <button class="action-btn action-secondary" onclick="App.loadModule('productos')">
          <i class="fas fa-box"></i>
          <span>Gestionar Productos</span>
        </button>
        <button class="action-btn action-success" onclick="App.loadModule('estadisticas')">
          <i class="fas fa-chart-bar"></i>
          <span>Ver Reportes</span>
        </button>
        <button class="action-btn action-warning" onclick="App.loadModule('notificaciones_inteligentes')">
          <i class="fas fa-bell"></i>
          <span>Notificaciones IA (${kpis.recordatoriosPendientes})</span>
        </button>
      </div>

      <!-- Carga de trabajo de técnicos -->
      <div class="card mt-3">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-users-cog"></i> Carga de Trabajo de Técnicos</h3>
        </div>
        <div class="card-body" id="tecnico-workload">
          <p>Cargando...</p>
        </div>
      </div>

      <!-- Widget de Recordatorios de Taller -->
      <div class="card mt-3">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-bell"></i> Recordatorios de Mantenimiento</h3>
          <div class="card-actions">
            <button class="btn btn-sm btn-primary" onclick="RecordatoriosAutomaticos.crearRecordatoriosAutomaticos()">
              <i class="fas fa-sync"></i> Generar Automáticos
            </button>
            <button class="btn btn-sm btn-secondary" onclick="App.loadModule('notificaciones_inteligentes')">
              <i class="fas fa-eye"></i> Ver Todos
            </button>
          </div>
        </div>
        <div class="card-body" id="recordatorios-automaticos-widget">
          <p>Cargando recordatorios...</p>
        </div>
      </div>

      <!-- Widget de Productos Más Vendidos (Historial) -->
      <div class="card mt-3">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-fire"></i> Productos Más Vendidos (Últimos 30 días)</h3>
          <div class="card-actions">
            <button class="btn btn-sm btn-secondary" onclick="Dashboard.actualizarHistorial()">
              <i class="fas fa-sync"></i> Actualizar
            </button>
          </div>
        </div>
        <div class="card-body" id="productos-mas-vendidos-widget">
          <p>Cargando datos del historial...</p>
        </div>
      </div>
    `;

    // Inicializar gráficos después de renderizar el HTML
    setTimeout(() => {
      this.initCharts(ventas, productos, stats);
      this.renderTecnicoWorkload();
      this.renderRecordatoriosWidget();
      this.renderProductosMasVendidos();
    }, 100);
  },

  /**
   * Calcula los KPIs desde las estadísticas del backend
   * @param {Object} stats - Estadísticas del backend
   * @param {Array} recordatorios - Array de recordatorios
   * @returns {Object} KPIs calculados
   */
  calcularKPIsDesdeStats(stats, recordatorios) {
    if (!stats || !stats.stats) {
      return this.calcularKPIs([], [], recordatorios);
    }

    const s = stats.stats;

    // Calcular cambios porcentuales
    const cambioVentasDia =
      s.ventasAyer.total > 0
        ? ((s.ventasHoy.total - s.ventasAyer.total) / s.ventasAyer.total) * 100
        : s.ventasHoy.total > 0
          ? 100
          : 0;

    const cambioVentasSemana =
      s.ventasSemanaAnterior.total > 0
        ? ((s.ventasSemana.total - s.ventasSemanaAnterior.total) / s.ventasSemanaAnterior.total) *
          100
        : s.ventasSemana.total > 0
          ? 100
          : 0;

    const cambioVentasMes =
      s.ventasMesAnterior.total > 0
        ? ((s.ventasMes.total - s.ventasMesAnterior.total) / s.ventasMesAnterior.total) * 100
        : s.ventasMes.total > 0
          ? 100
          : 0;

    const recordatoriosPendientes = Array.isArray(recordatorios)
      ? recordatorios.filter((r) => !r.completado).length
      : 0;

    return {
      ventasHoy: s.ventasHoy.total,
      cambioVentasDia,
      ventasSemana: s.ventasSemana.total,
      cambioVentasSemana,
      ventasMes: s.ventasMes.total,
      cambioVentasMes,
      recordatoriosPendientes,
      totalProductos: s.productos?.total || 0,
      productosStockBajo: s.productos?.stockBajo || 0,
      totalClientes: s.clientes?.total || 0,
    };
  },

  /**
   * Calcula los KPIs del dashboard
   * @param {Array} ventas - Array de ventas
   * @param {Array} productos - Array de productos
   * @param {Array} recordatorios - Array de recordatorios
   * @returns {Object} KPIs calculados
   */
  calcularKPIs(ventas, productos, recordatorios) {
    // Validar que los parámetros sean arrays
    if (!Array.isArray(ventas)) {
      console.warn('⚠️ ventas no es un array, usando array vacío');
      ventas = [];
    }
    if (!Array.isArray(productos)) {
      console.warn('⚠️ productos no es un array, usando array vacío');
      productos = [];
    }
    if (!Array.isArray(recordatorios)) {
      console.warn('⚠️ recordatorios no es un array, usando array vacío');
      recordatorios = [];
    }

    const ahora = new Date();
    const hoy = Utils.startOfDay(ahora);
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(inicioSemana.getDate() - ahora.getDay());

    const inicioSemanaAnterior = new Date(inicioSemana);
    inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 7);

    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0);

    // Filtrar ventas completadas
    const ventasCompletadas = ventas.filter((v) => v.estado === 'completada');

    // Ventas de hoy
    const ventasHoy = ventasCompletadas.filter((v) => {
      const fecha = new Date(v.fecha);
      return fecha >= hoy;
    });
    const totalVentasHoy = Utils.sumBy(ventasHoy, 'total');

    // Ventas de ayer
    const ventasAyer = ventasCompletadas.filter((v) => {
      const fecha = new Date(v.fecha);
      return fecha >= ayer && fecha < hoy;
    });
    const totalVentasAyer = Utils.sumBy(ventasAyer, 'total');

    // Cambio de ventas día
    const cambioVentasDia =
      totalVentasAyer > 0 ? ((totalVentasHoy - totalVentasAyer) / totalVentasAyer) * 100 : 0;

    // Ventas de esta semana
    const ventasSemana = ventasCompletadas.filter((v) => {
      const fecha = new Date(v.fecha);
      return fecha >= inicioSemana;
    });
    const totalVentasSemana = Utils.sumBy(ventasSemana, 'total');

    // Ventas semana anterior
    const ventasSemanaAnterior = ventasCompletadas.filter((v) => {
      const fecha = new Date(v.fecha);
      return fecha >= inicioSemanaAnterior && fecha < inicioSemana;
    });
    const totalVentasSemanaAnterior = Utils.sumBy(ventasSemanaAnterior, 'total');

    // Cambio de ventas semana
    const cambioVentasSemana =
      totalVentasSemanaAnterior > 0
        ? ((totalVentasSemana - totalVentasSemanaAnterior) / totalVentasSemanaAnterior) * 100
        : 0;

    // Ventas de este mes
    const ventasMes = ventasCompletadas.filter((v) => {
      const fecha = new Date(v.fecha);
      return fecha >= inicioMes;
    });
    const totalVentasMes = Utils.sumBy(ventasMes, 'total');

    // Ventas mes anterior
    const ventasMesAnterior = ventasCompletadas.filter((v) => {
      const fecha = new Date(v.fecha);
      return fecha >= inicioMesAnterior && fecha <= finMesAnterior;
    });
    const totalVentasMesAnterior = Utils.sumBy(ventasMesAnterior, 'total');

    // Cambio de ventas mes
    const cambioVentasMes =
      totalVentasMesAnterior > 0
        ? ((totalVentasMes - totalVentasMesAnterior) / totalVentasMesAnterior) * 100
        : 0;

    // Recordatorios pendientes
    const recordatoriosPendientes = recordatorios.filter((r) => !r.completado).length;

    // Productos con stock bajo
    const productosStockBajo = productos.filter(
      (p) => p.stock <= (p.stockMinimo || p.stock_minimo || 0)
    ).length;

    return {
      ventasHoy: totalVentasHoy,
      cambioVentasDia,
      ventasSemana: totalVentasSemana,
      cambioVentasSemana,
      ventasMes: totalVentasMes,
      cambioVentasMes,
      recordatoriosPendientes,
      totalProductos: productos.length,
      productosStockBajo,
    };
  },

  /**
   * Inicializa todos los gráficos
   * @param {Array} ventas - Array de ventas
   * @param {Array} productos - Array de productos
   * @param {Object} stats - Estadísticas del backend (opcional)
   */
  initCharts(ventas, productos, stats = null) {
    // Destruir gráficos existentes si los hay
    Object.values(this.charts).forEach((chart) => {
      if (chart) chart.destroy();
    });

    this.renderVentasChart(ventas);

    // Si tenemos stats del backend, usar esos datos para los gráficos
    if (stats && stats.stats) {
      this.renderProductosChartFromStats(stats.stats);
      this.renderCategoriasChartFromStats(stats.stats);
    } else {
      this.renderProductosChart(ventas, productos);
      this.renderCategoriasChart(ventas, productos);
    }
  },

  /**
   * Renderiza el gráfico de ventas de los últimos 30 días
   * @param {Array} ventas - Array de ventas
   */
  renderVentasChart(ventas) {
    const canvas = document.getElementById('ventasChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Obtener datos de los últimos 30 días
    const datos30Dias = this.obtenerVentasUltimos30Dias(ventas);

    this.charts.ventas = new Chart(ctx, {
      type: 'line',
      data: {
        labels: datos30Dias.labels,
        datasets: [
          {
            label: 'Ventas',
            data: datos30Dias.valores,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: 'bold',
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function (context) {
                return 'Ventas: ' + Utils.formatCurrency(context.parsed.y);
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return '$' + value.toLocaleString();
              },
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  },

  /**
   * Renderiza el gráfico de productos desde stats del backend
   * @param {Object} stats - Estadísticas del backend
   */
  renderProductosChartFromStats(stats) {
    const canvas = document.getElementById('productosChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const topProductos = stats.topProductos || [];

    if (topProductos.length === 0) {
      // Mostrar mensaje de "sin datos"
      const parent = canvas.parentElement;
      parent.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; min-height: 300px; color: var(--text-secondary);">
          <div style="text-align: center;">
            <i class="fas fa-chart-bar" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
            <p>No hay datos de productos vendidos</p>
          </div>
        </div>
      `;
      return;
    }

    const labels = topProductos.map((p) => p.nombre);
    const valores = topProductos.map((p) => p.cantidadVendida);

    this.charts.productos = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Cantidad Vendida',
            data: valores,
            backgroundColor: [
              '#6366f1',
              '#8b5cf6',
              '#ec4899',
              '#f59e0b',
              '#10b981',
              '#3b82f6',
              '#ef4444',
              '#06b6d4',
              '#84cc16',
              '#f97316',
            ],
            borderWidth: 0,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: 'bold',
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function (context) {
                return 'Vendidos: ' + context.parsed.y + ' unidades';
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  },

  /**
   * Renderiza el gráfico de categorías desde stats del backend
   * @param {Object} stats - Estadísticas del backend
   */
  renderCategoriasChartFromStats(stats) {
    const canvas = document.getElementById('categoriasChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const ventasPorCategoria = stats.ventasPorCategoria || [];

    if (ventasPorCategoria.length === 0) {
      // Mostrar mensaje de "sin datos"
      const parent = canvas.parentElement;
      parent.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; min-height: 300px; color: var(--text-secondary);">
          <div style="text-align: center;">
            <i class="fas fa-chart-pie" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
            <p>No hay datos de ventas por categoría</p>
          </div>
        </div>
      `;
      return;
    }

    const labels = ventasPorCategoria.map((c) => c.categoriaNombre);
    const valores = ventasPorCategoria.map((c) => c.totalVentas);

    this.charts.categorias = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: valores,
            backgroundColor: [
              '#6366f1',
              '#8b5cf6',
              '#ec4899',
              '#f59e0b',
              '#10b981',
              '#3b82f6',
              '#ef4444',
              '#06b6d4',
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 12,
              },
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: 'bold',
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = Utils.formatCurrency(context.parsed);
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  },

  /**
   * Renderiza el gráfico de productos más vendidos
   * @param {Array} ventas - Array de ventas
   * @param {Array} productos - Array de productos
   */
  renderProductosChart(ventas, productos) {
    const canvas = document.getElementById('productosChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Calcular productos más vendidos
    const topProductos = this.calcularTopProductos(ventas, productos);

    this.charts.productos = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: topProductos.labels,
        datasets: [
          {
            label: 'Cantidad Vendida',
            data: topProductos.valores,
            backgroundColor: [
              '#6366f1',
              '#8b5cf6',
              '#ec4899',
              '#f59e0b',
              '#10b981',
              '#3b82f6',
              '#ef4444',
              '#06b6d4',
              '#84cc16',
              '#f97316',
            ],
            borderWidth: 0,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: 'bold',
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function (context) {
                return 'Vendidos: ' + context.parsed.y + ' unidades';
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  },

  /**
   * Renderiza el gráfico de distribución por categorías
   * @param {Array} ventas - Array de ventas
   * @param {Array} productos - Array de productos
   */
  renderCategoriasChart(ventas, productos) {
    const canvas = document.getElementById('categoriasChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Calcular ventas por categoría
    const ventasPorCategoria = this.calcularVentasPorCategoria(ventas, productos);

    this.charts.categorias = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ventasPorCategoria.labels,
        datasets: [
          {
            data: ventasPorCategoria.valores,
            backgroundColor: [
              '#6366f1',
              '#8b5cf6',
              '#ec4899',
              '#f59e0b',
              '#10b981',
              '#3b82f6',
              '#ef4444',
              '#06b6d4',
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 12,
              },
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: 'bold',
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = Utils.formatCurrency(context.parsed);
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  },

  /**
   * Obtiene datos de ventas de los últimos 30 días
   * @param {Array} ventas - Array de ventas
   * @returns {Object} Labels y valores
   */
  obtenerVentasUltimos30Dias(ventas) {
    const labels = [];
    const valores = [];
    const ventasPorDia = {};

    // Inicializar últimos 30 días
    for (let i = 29; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const key = fecha.toISOString().split('T')[0];
      labels.push(fecha.getDate() + '/' + (fecha.getMonth() + 1));
      ventasPorDia[key] = 0;
    }

    // Sumar ventas por día
    ventas
      .filter((v) => v.estado === 'completada')
      .forEach((v) => {
        const key = new Date(v.fecha).toISOString().split('T')[0];
        if (ventasPorDia.hasOwnProperty(key)) {
          ventasPorDia[key] += v.total || 0;
        }
      });

    // Convertir a array de valores
    Object.values(ventasPorDia).forEach((total) => {
      valores.push(total);
    });

    return { labels, valores };
  },

  /**
   * Calcula los productos más vendidos
   * @param {Array} ventas - Array de ventas
   * @param {Array} productos - Array de productos
   * @returns {Object} Labels y valores
   */
  calcularTopProductos(ventas, productos) {
    const conteo = {};

    // Contar productos vendidos
    ventas
      .filter((v) => v.estado === 'completada')
      .forEach((v) => {
        (v.items || []).forEach((item) => {
          const productoId = item.productoId;
          if (!conteo[productoId]) {
            conteo[productoId] = {
              cantidad: 0,
              nombre: item.producto,
            };
          }
          conteo[productoId].cantidad += item.cantidad || 0;
        });
      });

    // Ordenar y tomar top 10
    const sorted = Object.values(conteo)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    const labels = sorted.map((p) => p.nombre);
    const valores = sorted.map((p) => p.cantidad);

    return { labels, valores };
  },

  /**
   * Calcula ventas por categoría
   * @param {Array} ventas - Array de ventas
   * @param {Array} productos - Array de productos
   * @returns {Object} Labels y valores
   */
  calcularVentasPorCategoria(ventas, productos) {
    const categorias = Database.getCollection('categorias');
    const ventasPorCategoria = {};

    // Inicializar categorías
    categorias.forEach((cat) => {
      ventasPorCategoria[cat.id] = {
        nombre: cat.nombre,
        total: 0,
      };
    });

    // Sumar ventas por categoría
    ventas
      .filter((v) => v.estado === 'completada')
      .forEach((v) => {
        (v.items || []).forEach((item) => {
          const producto = productos.find((p) => p.id === item.productoId);
          if (producto && producto.categoria) {
            if (ventasPorCategoria[producto.categoria]) {
              ventasPorCategoria[producto.categoria].total += item.total || 0;
            }
          }
        });
      });

    // Filtrar categorías con ventas y ordenar
    const sorted = Object.values(ventasPorCategoria)
      .filter((cat) => cat.total > 0)
      .sort((a, b) => b.total - a.total);

    const labels = sorted.map((c) => c.nombre);
    const valores = sorted.map((c) => c.total);

    return { labels, valores };
  },

  /**
   * Exporta un gráfico como imagen
   * @param {string} chartType - Tipo de gráfico ('ventas', 'productos', 'categorias')
   */
  exportarGrafico(chartType) {
    const chart = this.charts[chartType];
    if (!chart) {
      Utils.showToast('Gráfico no disponible', 'warning');
      return;
    }

    const url = chart.toBase64Image();
    const link = document.createElement('a');
    link.download = `grafico_${chartType}_${new Date().getTime()}.png`;
    link.href = url;
    link.click();

    Utils.showToast('Gráfico exportado', 'success');
  },

  /**
   * Renderiza el panel de carga de trabajo de los técnicos
   */
  async renderTecnicoWorkload() {
    const container = document.getElementById('tecnico-workload');
    if (!container) return;

    try {
      // Intentar cargar desde la API primero
      let tecnicos = [];
      let ordenes = [];

      if (window.DatabaseAPI && typeof DatabaseAPI.request === 'function') {
        try {
          const [tecnicosRes, ordenesRes] = await Promise.allSettled([
            DatabaseAPI.request('/tecnicos'),
            DatabaseAPI.request('/ordenes-trabajo'),
          ]);

          tecnicos = tecnicosRes.status === 'fulfilled' ? tecnicosRes.value || [] : [];
          ordenes = ordenesRes.status === 'fulfilled' ? ordenesRes.value || [] : [];

          console.log(`✅ Técnicos cargados: ${tecnicos.length}, Órdenes: ${ordenes.length}`);
        } catch (error) {
          console.warn('⚠️ Error cargando desde API, usando datos locales:', error);
        }
      }

      // Fallback a datos locales si la API falla
      if (!Array.isArray(tecnicos) || tecnicos.length === 0) {
        tecnicos = (await Database.getCollection('tecnicos')) || [];
        ordenes = (await Database.getCollection('ordenes_trabajo')) || [];
      }

      if (tecnicos.length === 0) {
        container.innerHTML = `
          <div class="empty-state-mini">
            <i class="fas fa-users"></i>
            <p>No hay técnicos registrados</p>
            <button class="btn btn-sm btn-primary" onclick="App.loadModule('ordenes-trabajo')" style="margin-top: 0.5rem;">
              <i class="fas fa-plus"></i> Registrar Técnico
            </button>
          </div>
        `;
        return;
      }

      const ordenesEnProceso = ordenes.filter(
        (o) => o.estado === 'en_proceso' || o.estado === 'en_progreso'
      );

      const workload = tecnicos.map((tecnico) => {
        const tareas = ordenesEnProceso.filter(
          (o) => o.tecnico_asignado_id === tecnico.id || o.tecnicoAsignadoId === tecnico.id
        );
        return {
          ...tecnico,
          tareas: tareas.length,
          especialidad: tecnico.especialidad || 'General',
        };
      });

      container.innerHTML = workload
        .map(
          (t) => `
        <div class="workload-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 0.5rem;">
          <div class="workload-info" style="flex: 1;">
            <div class="workload-tecnico" style="font-weight: 600; color: var(--text-primary);">
              <i class="fas fa-user-cog"></i> ${Utils.escapeHTML(t.nombre)}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
              ${Utils.escapeHTML(t.especialidad)}
            </div>
          </div>
          <div class="workload-bar" style="flex: 2; margin: 0 1rem; height: 24px; background: var(--bg-primary); border-radius: 12px; overflow: hidden; position: relative;">
            <div class="workload-fill" style="height: 100%; border-radius: 12px; width: ${Math.min(t.tareas * 20, 100)}%; background: ${t.tareas === 0 ? '#2ed573' : t.tareas > 3 ? '#ff4757' : t.tareas > 1 ? '#ffa502' : '#2ed573'}; transition: width 0.3s ease;"></div>
          </div>
          <div class="workload-count" style="min-width: 60px; text-align: center; font-weight: 700; font-size: 1.1rem; color: ${t.tareas === 0 ? 'var(--success-color)' : t.tareas > 3 ? 'var(--danger-color)' : t.tareas > 1 ? 'var(--warning-color)' : 'var(--success-color)'}">
            ${t.tareas} ${t.tareas === 1 ? 'tarea' : 'tareas'}
          </div>
        </div>
      `
        )
        .join('');
    } catch (error) {
      console.group('⚠️ ERROR: Dashboard - Cargando técnicos');
      console.error('Mensaje:', error.message);
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      container.innerHTML = `
        <div class="error-state-mini" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: var(--warning-color); margin-bottom: 0.5rem;"></i>
          <p>Error al cargar datos de técnicos</p>
          <button class="btn btn-sm btn-secondary" onclick="Dashboard.renderTecnicoWorkload()" style="margin-top: 0.5rem;">
            <i class="fas fa-sync"></i> Reintentar
          </button>
        </div>
      `;
    }
  },

  /**
   * Renderiza el widget de recordatorios automáticos
   */
  async renderRecordatoriosWidget() {
    const container = document.getElementById('recordatorios-automaticos-widget');
    if (!container) return;

    try {
      let recordatorios = [];

      // Intentar cargar desde la API primero
      if (window.DatabaseAPI && typeof DatabaseAPI.request === 'function') {
        try {
          const response = await DatabaseAPI.request('/notificaciones-recordatorios?limit=10');

          // Manejar diferentes formatos de respuesta
          if (Array.isArray(response)) {
            recordatorios = response;
          } else if (response && Array.isArray(response.recordatorios)) {
            recordatorios = response.recordatorios;
          } else if (response && response.success && Array.isArray(response.recordatorios)) {
            recordatorios = response.recordatorios;
          }

          console.log(`✅ Recordatorios cargados: ${recordatorios.length}`);
        } catch (error) {
          console.warn('⚠️ Error cargando recordatorios desde API, usando datos locales:', error);
        }
      }

      // Fallback a datos locales
      if (!Array.isArray(recordatorios) || recordatorios.length === 0) {
        if (window.Database && typeof Database.getCollection === 'function') {
          recordatorios = (await Database.getCollection('recordatorios')) || [];
        }
      }

      // Filtrar solo recordatorios pendientes y próximos
      const hoy = new Date();
      const recordatoriosPendientes = recordatorios
        .filter((r) => {
          if (r.completado) return false;
          const fechaRecordatorio = new Date(r.fecha);
          return fechaRecordatorio >= hoy;
        })
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
        .slice(0, 5);

      if (recordatoriosPendientes.length === 0) {
        container.innerHTML = `
          <div class="empty-state-mini" style="text-align: center; padding: 2rem;">
            <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--success-color); opacity: 0.5; margin-bottom: 1rem;"></i>
            <p style="color: var(--text-primary); margin: 0; font-weight: 500;">✅ No hay recordatorios pendientes</p>
            <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.5rem;">Todos los mantenimientos están al día</p>
            ${
              window.RecordatoriosAutomaticos
                ? `
              <button class="btn btn-sm btn-primary" onclick="RecordatoriosAutomaticos.crearRecordatoriosAutomaticos()" style="margin-top: 1rem;">
                <i class="fas fa-sync"></i> Generar Recordatorios
              </button>
            `
                : ''
            }
          </div>
        `;
        return;
      }

      // Renderizar recordatorios
      if (
        window.RecordatoriosAutomaticos &&
        typeof RecordatoriosAutomaticos.renderizarWidgetRecordatorios === 'function'
      ) {
        container.innerHTML =
          RecordatoriosAutomaticos.renderizarWidgetRecordatorios(recordatoriosPendientes);
      } else {
        // Renderizado básico si el módulo no está disponible
        container.innerHTML = `
          <div class="recordatorios-list">
            ${recordatoriosPendientes
              .map((r) => {
                const fecha = new Date(r.fecha);
                const diasRestantes = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
                const urgente = diasRestantes <= 3;

                return `
                <div class="recordatorio-item" style="padding: 0.75rem; background: var(--bg-secondary); border-left: 4px solid ${urgente ? 'var(--danger-color)' : 'var(--warning-color)'}; border-radius: 6px; margin-bottom: 0.5rem;">
                  <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                      <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">
                        ${urgente ? '🔴' : '⚠️'} ${Utils.escapeHTML(r.mensaje || r.titulo || 'Recordatorio')}
                      </div>
                      <div style="font-size: 0.8125rem; color: var(--text-secondary);">
                        📅 ${fecha.toLocaleDateString('es-ES')} ${r.cliente_nombre ? `• Cliente: ${Utils.escapeHTML(r.cliente_nombre)}` : ''}
                      </div>
                      ${
                        diasRestantes <= 7
                          ? `
                        <div style="margin-top: 0.5rem;">
                          <span class="badge badge-sm ${urgente ? 'badge-danger' : 'badge-warning'}">
                            ${diasRestantes === 0 ? 'HOY' : diasRestantes === 1 ? 'MAÑANA' : `En ${diasRestantes} días`}
                          </span>
                        </div>
                      `
                          : ''
                      }
                    </div>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
          <div style="text-align: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-light);">
            <button class="btn btn-sm btn-secondary" onclick="App.loadModule('notificaciones_inteligentes')">
              <i class="fas fa-eye"></i> Ver Todos los Recordatorios
            </button>
          </div>
        `;
      }
    } catch (error) {
      console.group('⚠️ ERROR: Dashboard - Cargando recordatorios');
      console.error('Mensaje:', error.message);
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      container.innerHTML = `
        <div class="error-state-mini" style="text-align: center; padding: 2rem;">
          <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: var(--warning-color); margin-bottom: 0.5rem;"></i>
          <p style="color: var(--text-secondary);">Error al cargar recordatorios</p>
          <button class="btn btn-sm btn-secondary" onclick="Dashboard.renderRecordatoriosWidget()" style="margin-top: 0.5rem;">
            <i class="fas fa-sync"></i> Reintentar
          </button>
        </div>
      `;
    }
  },

  /**
   * Renderiza el widget de productos más vendidos desde el historial
   */
  async renderProductosMasVendidos() {
    const container = document.getElementById('productos-mas-vendidos-widget');
    if (!container) return;

    try {
      console.log('📊 Cargando productos más vendidos desde historial...');

      let productosMasVendidos = [];

      // Intentar cargar desde la API del historial primero
      if (window.DatabaseAPI && typeof DatabaseAPI.request === 'function') {
        try {
          productosMasVendidos = await DatabaseAPI.request(
            '/productos-mas-vendidos?limit=10&orden=vendido'
          );
          console.log(`✅ Productos más vendidos cargados: ${productosMasVendidos?.length || 0}`);
        } catch (error) {
          console.warn('⚠️ Error cargando desde API de historial:', error);
        }
      }

      // Si no hay datos, intentar obtener desde las estadísticas del dashboard
      if (!Array.isArray(productosMasVendidos) || productosMasVendidos.length === 0) {
        console.log('📊 Intentando cargar desde estadísticas del dashboard...');
        try {
          const stats = await DatabaseAPI.request('/dashboard/stats');
          if (stats && stats.stats && stats.stats.topProductos) {
            productosMasVendidos = stats.stats.topProductos.map((p) => ({
              producto_nombre: p.nombre,
              total_vendido: p.cantidadVendida,
              total_ingresos: p.totalVentas,
              stock_actual: 0, // No disponible en este endpoint
              ultima_venta: null, // No disponible en este endpoint
            }));
            console.log(`✅ Datos desde dashboard stats: ${productosMasVendidos.length}`);
          }
        } catch (error) {
          console.warn('⚠️ Error cargando desde dashboard/stats:', error);
        }
      }

      if (!Array.isArray(productosMasVendidos) || productosMasVendidos.length === 0) {
        container.innerHTML = `
          <div class="empty-state-mini" style="text-align: center; padding: 2rem;">
            <i class="fas fa-box-open" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
            <p style="color: var(--text-primary); margin: 0; font-weight: 500;">No hay datos de ventas registrados</p>
            <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.5rem;">Las estadísticas aparecerán cuando se registren ventas</p>
            <button class="btn btn-sm btn-primary" onclick="App.loadModule('ventas')" style="margin-top: 1rem;">
              <i class="fas fa-cash-register"></i> Registrar Primera Venta
            </button>
          </div>
        `;
        return;
      }

      // Renderizar la tabla de productos más vendidos
      container.innerHTML = `
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">#</th>
                <th>Producto</th>
                <th style="text-align: center; width: 120px;">Unidades</th>
                <th style="text-align: right; width: 140px;">Ingresos</th>
                <th style="text-align: center; width: 140px;">Última Venta</th>
              </tr>
            </thead>
            <tbody>
              ${productosMasVendidos
                .slice(0, 10)
                .map((p, index) => {
                  const totalVendido = Number(p.total_vendido || p.totalVendido || 0);
                  const totalIngresos = Number(p.total_ingresos || p.totalIngresos || 0);
                  const ultimaVenta = p.ultima_venta || p.ultimaVenta || null;
                  const stockActual = Number(p.stock_actual || p.stockActual || 0);

                  // Calcular días desde la última venta
                  let diasDesdeUltimaVenta = '-';
                  let claseUrgencia = '';
                  if (ultimaVenta) {
                    const fechaUltimaVenta = new Date(ultimaVenta);
                    const hoy = new Date();
                    const diffTime = Math.abs(hoy - fechaUltimaVenta);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 0) {
                      diasDesdeUltimaVenta = '<span class="badge badge-success">Hoy</span>';
                    } else if (diffDays === 1) {
                      diasDesdeUltimaVenta = '<span class="badge badge-info">Ayer</span>';
                    } else if (diffDays <= 7) {
                      diasDesdeUltimaVenta = `<span class="badge badge-secondary">Hace ${diffDays}d</span>`;
                    } else {
                      diasDesdeUltimaVenta = `Hace ${diffDays}d`;
                    }
                  }

                  // Determinar color por posición
                  const colorMedalla =
                    index === 0
                      ? '#FFD700'
                      : index === 1
                        ? '#C0C0C0'
                        : index === 2
                          ? '#CD7F32'
                          : 'var(--primary-color)';

                  return `
                  <tr style="${index < 3 ? 'background: var(--bg-secondary);' : ''}">
                    <td style="text-align: center; font-weight: 700; font-size: 1.1rem; color: ${colorMedalla};">
                      ${index < 3 ? (index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉') : index + 1}
                    </td>
                    <td>
                      <div style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">
                        ${Utils.escapeHTML(p.producto_nombre || p.productoNombre || 'Sin nombre')}
                      </div>
                      ${
                        stockActual > 0
                          ? `
                        <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem;">
                          📦 Stock: <strong class="${stockActual <= 5 ? 'text-warning' : 'text-success'}">${stockActual}</strong> unidades
                        </div>
                      `
                          : ''
                      }
                    </td>
                    <td style="text-align: center;">
                      <span class="badge badge-success" style="font-size: 0.95rem; padding: 0.4rem 0.75rem; font-weight: 600;">
                        ${totalVendido}
                      </span>
                    </td>
                    <td style="text-align: right; font-weight: 700; color: var(--success-color); font-size: 1rem;">
                      ${Utils.formatCurrency(totalIngresos)}
                    </td>
                    <td style="text-align: center; font-size: 0.875rem;">
                      ${diasDesdeUltimaVenta}
                    </td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
        <div style="text-align: center; padding: 1rem; border-top: 1px solid var(--border-light); background: var(--bg-secondary);">
          <button class="btn btn-sm btn-primary" onclick="App.loadModule('productos')">
            <i class="fas fa-chart-bar"></i> Ver Análisis Completo de Rotación
          </button>
          <button class="btn btn-sm btn-secondary" onclick="Dashboard.renderProductosMasVendidos()" style="margin-left: 0.5rem;">
            <i class="fas fa-sync"></i> Actualizar
          </button>
        </div>
      `;
    } catch (error) {
      console.group('⚠️ ERROR: Dashboard - Cargando productos más vendidos');
      console.error('Mensaje:', error.message);
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();

      container.innerHTML = `
        <div class="error-state-mini" style="text-align: center; padding: 2rem;">
          <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: var(--warning-color); margin-bottom: 1rem;"></i>
          <p style="color: var(--text-primary); margin: 0; font-weight: 500;">Error al cargar productos más vendidos</p>
          <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.5rem;">${error.message}</p>
          <button class="btn btn-sm btn-secondary" onclick="Dashboard.renderProductosMasVendidos()" style="margin-top: 1rem;">
            <i class="fas fa-sync"></i> Reintentar
          </button>
        </div>
      `;
    }
  },

  /**
   * Actualiza el historial de productos
   */
  async actualizarHistorial() {
    Utils.showToast?.('Actualizando historial de productos...', 'info');
    await this.renderProductosMasVendidos();
    Utils.showToast?.('Historial actualizado', 'success');
  },

  /**
   * Actualiza los datos del dashboard
   */
  async actualizarDatos() {
    const btn = document.getElementById('btnActualizarDashboard');
    if (!btn) return;

    // Desactivar botón y mostrar spinner
    btn.disabled = true;
    const iconOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';

    try {
      // Recargar el dashboard
      const container = document.getElementById('contentArea');
      if (container) {
        await this.render(container);
        Utils.showToast?.('Dashboard actualizado correctamente', 'success');
      }
    } catch (error) {
      console.error('Error actualizando dashboard:', error);
      Utils.showToast?.('Error al actualizar el dashboard', 'error');
    } finally {
      // Restaurar botón
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = iconOriginal;
      }
    }
  },
};

// Exportar módulo globalmente
window.Dashboard = Dashboard;
