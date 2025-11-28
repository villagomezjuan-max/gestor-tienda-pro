// ============================================
// MÓDULO: FINANZAS PROFESIONAL INTEGRADO
// ============================================
// Sistema avanzado de análisis financiero empresarial
// Integración completa con todos los módulos del sistema
// Análisis predictivo con IA y visualización de datos
// Versión 3.0 - Profesional

window.Finanzas = {
  state: {
    periodo: 'mes',
    periodoCustom: { inicio: null, fin: null },
    tabActiva: 'dashboard',
    transacciones: [],
    cuentasPorCobrar: [],
    cuentasPorPagar: [],
    ventas: [],
    compras: [],
    ordenesTrabajo: [],
    productos: [],
    clientes: [],
    proveedores: [],
    cargando: false,
    ultimaActualizacion: null,
    comparativa: null, // Para comparar con período anterior
    modoVista: 'cards', // 'cards' o 'tabla'
  },

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  async render(container) {
    this.state.cargando = true;

    // Mostrar loading mientras carga
    container.innerHTML = `
      <div class="finanzas-module finanzas-loading">
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Cargando datos financieros...</p>
        </div>
      </div>
    `;

    await this.cargarDatosCompletos();
    this.state.ultimaActualizacion = new Date();
    this.state.cargando = false;

    const metricas = this.calcularMetricasAvanzadas();

    container.innerHTML = `
      <div class="finanzas-module finanzas-professional">
        <!-- Header Profesional -->
        <div class="finanzas-header">
          <div class="header-left">
            <h2><i class="fas fa-chart-line"></i> Centro Financiero</h2>
            <p class="text-muted">
              <i class="fas fa-sync-alt"></i> 
              Última actualización: ${this.formatearHora(this.state.ultimaActualizacion)}
            </p>
          </div>
          <div class="header-actions">
            <button class="btn btn-icon" onclick="Finanzas.refrescarDatos()" title="Actualizar datos">
              <i class="fas fa-sync-alt"></i>
            </button>
            <button class="btn btn-icon" onclick="Finanzas.toggleModoVista()" title="Cambiar vista">
              <i class="fas fa-${this.state.modoVista === 'cards' ? 'table' : 'th-large'}"></i>
            </button>
            <div class="dropdown">
              <button class="btn btn-secondary dropdown-toggle" onclick="this.nextElementSibling.classList.toggle('show')">
                <i class="fas fa-download"></i> Exportar
              </button>
              <div class="dropdown-menu">
                <a onclick="Finanzas.exportarExcel()"><i class="fas fa-file-excel"></i> Excel</a>
                <a onclick="Finanzas.exportarPDF()"><i class="fas fa-file-pdf"></i> PDF</a>
                <a onclick="Finanzas.exportarJSON()"><i class="fas fa-file-code"></i> JSON</a>
              </div>
            </div>
            <button class="btn btn-primary" onclick="Finanzas.mostrarAyuda()">
              <i class="fas fa-question-circle"></i> Ayuda
            </button>
          </div>
        </div>

        <!-- Selector de Período Avanzado -->
        <div class="periodo-selector-advanced">
          <div class="periodo-quick-buttons">
            <button class="btn periodo-btn ${this.state.periodo === 'hoy' ? 'active' : ''}" 
                    onclick="Finanzas.cambiarPeriodo('hoy')">
              <i class="fas fa-calendar-day"></i> Hoy
            </button>
            <button class="btn periodo-btn ${this.state.periodo === 'semana' ? 'active' : ''}" 
                    onclick="Finanzas.cambiarPeriodo('semana')">
              <i class="fas fa-calendar-week"></i> Semana
            </button>
            <button class="btn periodo-btn ${this.state.periodo === 'mes' ? 'active' : ''}" 
                    onclick="Finanzas.cambiarPeriodo('mes')">
              <i class="fas fa-calendar-alt"></i> Mes
            </button>
            <button class="btn periodo-btn ${this.state.periodo === 'trimestre' ? 'active' : ''}" 
                    onclick="Finanzas.cambiarPeriodo('trimestre')">
              <i class="fas fa-calendar"></i> Trimestre
            </button>
            <button class="btn periodo-btn ${this.state.periodo === 'anio' ? 'active' : ''}" 
                    onclick="Finanzas.cambiarPeriodo('anio')">
              <i class="fas fa-calendar-check"></i> Año
            </button>
          </div>
          <div class="periodo-custom">
            <input type="date" id="fechaInicioPeriodo" class="form-control" 
                   value="${this.state.periodoCustom.inicio || ''}"
                   onchange="Finanzas.actualizarPeriodoCustom()">
            <span class="periodo-separator">a</span>
            <input type="date" id="fechaFinPeriodo" class="form-control" 
                   value="${this.state.periodoCustom.fin || ''}"
                   onchange="Finanzas.actualizarPeriodoCustom()">
            <button class="btn btn-sm btn-primary" onclick="Finanzas.aplicarPeriodoCustom()">
              <i class="fas fa-filter"></i> Aplicar
            </button>
          </div>
        </div>

        <!-- Resumen Ejecutivo Rápido -->
        <div class="executive-summary">
          ${this.renderResumenEjecutivo(metricas)}
        </div>

        <!-- Tabs de Navegación Mejoradas -->
        <div class="tabs-container">
          <div class="tabs">
            <button class="tab-btn ${this.state.tabActiva === 'dashboard' ? 'active' : ''}" 
                    onclick="Finanzas.cambiarTab('dashboard')">
              <i class="fas fa-tachometer-alt"></i> 
              <span>Dashboard</span>
            </button>
            <button class="tab-btn ${this.state.tabActiva === 'flujo-caja' ? 'active' : ''}" 
                    onclick="Finanzas.cambiarTab('flujo-caja')">
              <i class="fas fa-money-bill-wave"></i> 
              <span>Flujo de Caja</span>
            </button>
            <button class="tab-btn ${this.state.tabActiva === 'estadisticas' ? 'active' : ''}" 
                    onclick="Finanzas.cambiarTab('estadisticas')">
              <i class="fas fa-chart-bar"></i> 
              <span>Estadísticas</span>
            </button>
            <button class="tab-btn ${this.state.tabActiva === 'inventario' ? 'active' : ''}" 
                    onclick="Finanzas.cambiarTab('inventario')">
              <i class="fas fa-boxes"></i> 
              <span>Inventario IA</span>
            </button>
            <button class="tab-btn ${this.state.tabActiva === 'transacciones' ? 'active' : ''}" 
                    onclick="Finanzas.cambiarTab('transacciones')">
              <i class="fas fa-exchange-alt"></i> 
              <span>Transacciones</span>
            </button>
            <button class="tab-btn ${this.state.tabActiva === 'cuentas' ? 'active' : ''}" 
                    onclick="Finanzas.cambiarTab('cuentas')">
              <i class="fas fa-file-invoice-dollar"></i> 
              <span>Cuentas</span>
            </button>
            <button class="tab-btn ${this.state.tabActiva === 'reportes' ? 'active' : ''}" 
                    onclick="Finanzas.cambiarTab('reportes')">
              <i class="fas fa-clipboard-list"></i> 
              <span>Reportes</span>
            </button>
          </div>
        </div>

        <!-- Contenido de Tabs -->
        <div id="finanzasTabContent" class="finanzas-tab-content">
          ${await this.renderTabContent()}
        </div>
      </div>
    `;

    // Inicializar eventos y gráficos después del render
    this.initEventListeners();
  },

  // ============================================
  // CARGAR DATOS COMPLETOS DE TODOS LOS MÓDULOS
  // ============================================
  async cargarDatosCompletos() {
    try {
      // Intentar cargar desde API primero, luego desde localStorage
      const useAPI = typeof DatabaseAPI !== 'undefined' && DatabaseAPI.isConnected;

      if (useAPI) {
        await this.cargarDatosDesdeAPI();
      } else {
        await this.cargarDatosLocales();
      }

      console.log('✅ Datos financieros cargados:', {
        ventas: this.state.ventas.length,
        compras: this.state.compras.length,
        ordenesTrabajo: this.state.ordenesTrabajo.length,
        transacciones: this.state.transacciones.length,
        productos: this.state.productos.length,
      });
    } catch (error) {
      console.error('❌ Error cargando datos financieros:', error);
      // Fallback a datos locales
      await this.cargarDatosLocales();
    }
  },

  async cargarDatosDesdeAPI() {
    const { inicio, fin } = this.obtenerRangoFechas(this.state.periodo);

    try {
      // Cargar resumen financiero desde la API
      const response = await fetch(
        `${Utils.getApiBaseUrl()}/finanzas/summary?fechaInicio=${inicio}&fechaFin=${fin}`,
        {
          headers: {
            Authorization: `Bearer ${Auth.getToken()}`,
          },
        }
      );

      if (response.ok) {
        const summary = await response.json();
        this.state.apiSummary = summary;
      }

      // Cargar otros datos necesarios
      await this.cargarDatosLocales();
    } catch (error) {
      console.warn('No se pudo cargar desde API, usando datos locales:', error);
      await this.cargarDatosLocales();
    }
  },

  async cargarDatosLocales() {
    // Cargar todas las colecciones necesarias
    const db = typeof Database !== 'undefined' ? Database : null;

    if (!db) {
      console.error('Database no disponible');
      return;
    }

    this.state.ventas = (await db.getCollection('ventas')) || [];
    this.state.compras = (await db.getCollection('compras')) || [];
    this.state.ordenesTrabajo = (await db.getCollection('ordenes_trabajo')) || [];
    this.state.transacciones = (await db.getCollection('transacciones')) || [];
    this.state.cuentasPorCobrar = (await db.getCollection('cuentasPorCobrar')) || [];
    this.state.cuentasPorPagar = (await db.getCollection('cuentasPorPagar')) || [];
    this.state.productos = (await db.getCollection('productos')) || [];
    this.state.clientes = (await db.getCollection('clientes')) || [];
    this.state.proveedores = (await db.getCollection('proveedores')) || [];

    // Calcular comparativa con período anterior
    this.calcularComparativa();
  },

  // ============================================
  // CALCULAR COMPARATIVA CON PERÍODO ANTERIOR
  // ============================================
  calcularComparativa() {
    const { inicio, fin } = this.obtenerRangoFechas(this.state.periodo);
    const diasPeriodo = Math.ceil((new Date(fin) - new Date(inicio)) / (1000 * 60 * 60 * 24));

    // Calcular período anterior
    const finAnterior = new Date(inicio);
    finAnterior.setDate(finAnterior.getDate() - 1);
    const inicioAnterior = new Date(finAnterior);
    inicioAnterior.setDate(inicioAnterior.getDate() - diasPeriodo);

    const rangoAnterior = {
      inicio: inicioAnterior.toISOString().split('T')[0],
      fin: finAnterior.toISOString().split('T')[0],
    };

    // Calcular métricas del período anterior
    const ventasAnterior = this.state.ventas.filter(
      (v) =>
        v.fecha >= rangoAnterior.inicio && v.fecha <= rangoAnterior.fin && v.estado !== 'anulada'
    );

    const totalAnterior = ventasAnterior.reduce((sum, v) => sum + (v.total || 0), 0);
    const ventasActuales = this.state.ventas.filter(
      (v) => v.fecha >= inicio && v.fecha <= fin && v.estado !== 'anulada'
    );
    const totalActual = ventasActuales.reduce((sum, v) => sum + (v.total || 0), 0);

    const cambio = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior) * 100 : 0;

    this.state.comparativa = {
      periodoAnterior: rangoAnterior,
      ventasAnterior: totalAnterior,
      ventasActual: totalActual,
      cambio: cambio,
      tendencia: cambio >= 0 ? 'up' : 'down',
    };
  },

  // ============================================
  // INICIALIZAR EVENT LISTENERS
  // ============================================
  initEventListeners() {
    // Cerrar dropdowns al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu.show').forEach((menu) => {
          menu.classList.remove('show');
        });
      }
    });
  },

  // ============================================
  // FORMATEAR HORA
  // ============================================
  formatearHora(fecha) {
    if (!fecha) return 'N/A';
    return fecha.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  // ============================================
  // REFRESCAR DATOS
  // ============================================
  async refrescarDatos() {
    const container = document.querySelector('.finanzas-module');
    if (container) {
      await this.render(container.parentElement);
      Utils.showToast('Datos actualizados', 'success');
    }
  },

  // ============================================
  // TOGGLE MODO VISTA
  // ============================================
  toggleModoVista() {
    this.state.modoVista = this.state.modoVista === 'cards' ? 'tabla' : 'cards';
    const container = document.querySelector('.finanzas-module');
    if (container) {
      this.render(container.parentElement);
    }
  },

  // ============================================
  // RENDER RESUMEN EJECUTIVO
  // ============================================
  renderResumenEjecutivo(metricas) {
    const cambioVentas = this.state.comparativa?.cambio || 0;
    const tendencia = cambioVentas >= 0 ? 'up' : 'down';
    const colorTendencia = cambioVentas >= 0 ? 'success' : 'danger';

    return `
      <div class="executive-cards">
        <div class="exec-card exec-card-primary">
          <div class="exec-card-icon">
            <i class="fas fa-dollar-sign"></i>
          </div>
          <div class="exec-card-content">
            <span class="exec-label">Ingresos Totales</span>
            <span class="exec-value">${Utils.formatCurrency(metricas.ingresos.total)}</span>
            <span class="exec-trend ${colorTendencia}">
              <i class="fas fa-arrow-${tendencia}"></i> ${Math.abs(cambioVentas).toFixed(1)}%
              <span class="trend-label">vs período anterior</span>
            </span>
          </div>
        </div>
        
        <div class="exec-card ${metricas.ganancias.neta >= 0 ? 'exec-card-success' : 'exec-card-danger'}">
          <div class="exec-card-icon">
            <i class="fas fa-chart-line"></i>
          </div>
          <div class="exec-card-content">
            <span class="exec-label">Ganancia Neta</span>
            <span class="exec-value">${Utils.formatCurrency(metricas.ganancias.neta)}</span>
            <span class="exec-sublabel">Margen: ${metricas.ganancias.margenNeto.toFixed(1)}%</span>
          </div>
        </div>
        
        <div class="exec-card ${metricas.flujoCaja.neto >= 0 ? 'exec-card-info' : 'exec-card-warning'}">
          <div class="exec-card-icon">
            <i class="fas fa-money-bill-wave"></i>
          </div>
          <div class="exec-card-content">
            <span class="exec-label">Flujo de Caja</span>
            <span class="exec-value">${Utils.formatCurrency(metricas.flujoCaja.neto)}</span>
            <span class="exec-sublabel">Efectivo disponible</span>
          </div>
        </div>
        
        <div class="exec-card exec-card-secondary">
          <div class="exec-card-icon">
            <i class="fas fa-shopping-cart"></i>
          </div>
          <div class="exec-card-content">
            <span class="exec-label">Ventas del Período</span>
            <span class="exec-value">${metricas.ventas.cantidad}</span>
            <span class="exec-sublabel">Ticket promedio: ${Utils.formatCurrency(metricas.ventas.ticketPromedio)}</span>
          </div>
        </div>
      </div>
    `;
  },

  // ============================================
  // ACTUALIZAR PERÍODO CUSTOM
  // ============================================
  actualizarPeriodoCustom() {
    const inicio = document.getElementById('fechaInicioPeriodo')?.value;
    const fin = document.getElementById('fechaFinPeriodo')?.value;
    this.state.periodoCustom = { inicio, fin };
  },

  aplicarPeriodoCustom() {
    if (this.state.periodoCustom.inicio && this.state.periodoCustom.fin) {
      this.state.periodo = 'custom';
      App.loadModule('finanzas');
    } else {
      Utils.showToast('Selecciona fechas de inicio y fin', 'warning');
    }
  },

  // ============================================
  // CAMBIAR PERÍODO
  // ============================================
  cambiarPeriodo(periodo) {
    this.state.periodo = periodo;
    this.state.periodoCustom = { inicio: null, fin: null };
    App.loadModule('finanzas');
  },

  // ============================================
  // CAMBIAR TAB
  // ============================================
  async cambiarTab(tab) {
    this.state.tabActiva = tab;
    const content = document.getElementById('finanzasTabContent');
    if (content) {
      content.innerHTML =
        '<div class="loading-container"><div class="loading-spinner"></div></div>';
      content.innerHTML = await this.renderTabContent();
    }

    // Actualizar tabs activas
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.remove('active');
    });
    document.querySelector(`[onclick="Finanzas.cambiarTab('${tab}')"]`)?.classList.add('active');
  },

  // ============================================
  // RENDER CONTENIDO DE TAB
  // ============================================
  async renderTabContent() {
    switch (this.state.tabActiva) {
      case 'dashboard':
        return this.renderDashboard();
      case 'flujo-caja':
        return this.renderFlujoCaja();
      case 'estadisticas':
        return this.renderEstadisticas();
      case 'inventario':
        return await this.renderInventarioIA();
      case 'transacciones':
        return this.renderTransacciones();
      case 'cuentas':
        return this.renderCuentas();
      case 'reportes':
        return this.renderReportes();
      default:
        return this.renderDashboard();
    }
  },

  // ============================================
  // CALCULAR MÉTRICAS FINANCIERAS AVANZADAS
  // ============================================
  calcularMetricasAvanzadas() {
    const { inicio, fin } = this.obtenerRangoFechas(this.state.periodo);

    // Filtrar datos por período
    const ventas = this.state.ventas.filter(
      (v) => v.fecha >= inicio && v.fecha <= fin && v.estado !== 'anulada'
    );
    const compras = this.state.compras.filter((c) => c.fecha >= inicio && c.fecha <= fin);
    const ordenesTrabajo = this.state.ordenesTrabajo.filter(
      (o) =>
        o.fecha_recepcion >= inicio &&
        o.fecha_recepcion <= fin &&
        ['finalizado', 'entregado', 'completado'].includes(o.estado)
    );
    const transacciones = this.state.transacciones.filter(
      (t) => t.fecha >= inicio && t.fecha <= fin
    );

    // ========== INGRESOS ==========
    // Ingresos por ventas de productos
    const ingresosVentas = ventas.reduce((sum, v) => sum + (v.total || 0), 0);

    // Ingresos por órdenes de trabajo/servicios
    const ingresosServicios = ordenesTrabajo.reduce((sum, o) => sum + (o.total || 0), 0);

    // Ingresos adicionales registrados manualmente
    const ingresosAdicionales = transacciones
      .filter((t) => t.tipo === 'ingreso')
      .reduce((sum, t) => sum + (t.monto || 0), 0);

    const totalIngresos = ingresosVentas + ingresosServicios + ingresosAdicionales;

    // ========== COSTO DE VENTAS (COGS) ==========
    let costoVentas = 0;

    // Costo de productos vendidos
    ventas.forEach((venta) => {
      if (venta.items && Array.isArray(venta.items)) {
        venta.items.forEach((item) => {
          // Usar precio de compra guardado en el item o buscar en productos
          let precioCompra = item.precioCompra;
          if (!precioCompra && item.productoId) {
            const producto = this.state.productos.find((p) => p.id === item.productoId);
            precioCompra = producto?.precioCompra || 0;
          }
          if (precioCompra && item.cantidad) {
            costoVentas += precioCompra * item.cantidad;
          }
        });
      }
    });

    // Costo de materiales en órdenes de trabajo
    let costoMaterialesOT = 0;
    ordenesTrabajo.forEach((orden) => {
      if (orden.materiales && Array.isArray(orden.materiales)) {
        orden.materiales.forEach((material) => {
          costoMaterialesOT +=
            (material.precioCompra || material.costo || 0) * (material.cantidad || 1);
        });
      }
      // También considerar costoMateriales si existe
      if (orden.costoMateriales) {
        costoMaterialesOT += orden.costoMateriales;
      }
    });

    const costoTotalVentas = costoVentas + costoMaterialesOT;

    // ========== GANANCIA BRUTA ==========
    const gananciaBruta = totalIngresos - costoTotalVentas;
    const margenBruto = totalIngresos > 0 ? (gananciaBruta / totalIngresos) * 100 : 0;

    // ========== GASTOS OPERATIVOS ==========
    const gastosOperativos = transacciones
      .filter((t) => t.tipo === 'gasto')
      .reduce((sum, t) => sum + (t.monto || 0), 0);

    // ========== GANANCIA NETA ==========
    const gananciaNeta = gananciaBruta - gastosOperativos;
    const margenNeto = totalIngresos > 0 ? (gananciaNeta / totalIngresos) * 100 : 0;

    // ========== FLUJO DE CAJA ==========
    // Efectivo recibido (ventas que no son a crédito)
    const efectivoVentas = ventas
      .filter((v) => v.metodoPago !== 'credito')
      .reduce((sum, v) => sum + (v.total || 0), 0);

    const efectivoServicios = ordenesTrabajo
      .filter((o) => o.metodoPago !== 'credito' && o.pagado)
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const efectivoRecibido = efectivoVentas + efectivoServicios + ingresosAdicionales;

    // Efectivo pagado
    const efectivoCompras = compras.reduce((sum, c) => sum + (c.montoPagado || c.total || 0), 0);
    const efectivoPagado = efectivoCompras + gastosOperativos;

    const flujoCajaNeto = efectivoRecibido - efectivoPagado;

    // ========== CUENTAS POR COBRAR Y PAGAR ==========
    const cuentasPorCobrarPendientes = this.state.cuentasPorCobrar.filter(
      (c) => c.estado !== 'pagada' && c.estado !== 'cancelada'
    );
    const totalPorCobrar = cuentasPorCobrarPendientes.reduce(
      (sum, c) => sum + (c.montoRestante || c.monto || 0),
      0
    );

    const cuentasPorPagarPendientes = this.state.cuentasPorPagar.filter(
      (c) => c.estado !== 'pagada' && c.estado !== 'cancelada'
    );
    const totalPorPagar = cuentasPorPagarPendientes.reduce(
      (sum, c) => sum + (c.montoRestante || c.monto || 0),
      0
    );

    // Cuentas vencidas
    const hoy = new Date().toISOString().split('T')[0];
    const cuentasVencidas = [
      ...cuentasPorCobrarPendientes.filter((c) => c.fechaVencimiento < hoy),
      ...cuentasPorPagarPendientes.filter((c) => c.fechaVencimiento < hoy),
    ];
    const montoVencido = cuentasVencidas.reduce(
      (sum, c) => sum + (c.montoRestante || c.monto || 0),
      0
    );

    // ========== COMPRAS E INVERSIÓN ==========
    const totalCompras = compras.reduce((sum, c) => sum + (c.total || 0), 0);

    // ========== INDICADORES FINANCIEROS ==========
    // ROI
    const inversion = totalCompras + gastosOperativos;
    const roi = inversion > 0 ? (gananciaNeta / inversion) * 100 : 0;

    // Punto de equilibrio
    const costosFijos = gastosOperativos;
    const margenContribucion = margenBruto / 100;
    const puntoEquilibrio = margenContribucion > 0 ? costosFijos / margenContribucion : 0;

    // Razón de liquidez
    const razonLiquidez =
      totalPorPagar > 0 ? totalPorCobrar / totalPorPagar : totalPorCobrar > 0 ? 999 : 1;

    // Rotación de inventario
    const inventarioPromedio = this.state.productos.reduce(
      (sum, p) => sum + (p.precioCompra || 0) * (p.stock || 0),
      0
    );
    const rotacionInventario = inventarioPromedio > 0 ? (costoVentas * 12) / inventarioPromedio : 0;

    // ========== INVENTARIO ==========
    const valorInventarioCosto = this.state.productos.reduce(
      (sum, p) => sum + (p.precioCompra || 0) * (p.stock || 0),
      0
    );
    const valorInventarioVenta = this.state.productos.reduce(
      (sum, p) => sum + (p.precioVenta || 0) * (p.stock || 0),
      0
    );

    // ========== DATOS POR MÉTODO DE PAGO ==========
    const ventasPorMetodo = {};
    ventas.forEach((v) => {
      const metodo = v.metodoPago || 'efectivo';
      if (!ventasPorMetodo[metodo]) {
        ventasPorMetodo[metodo] = { cantidad: 0, total: 0 };
      }
      ventasPorMetodo[metodo].cantidad++;
      ventasPorMetodo[metodo].total += v.total || 0;
    });

    // ========== DATOS POR CATEGORÍA ==========
    const ventasPorCategoria = {};
    ventas.forEach((v) => {
      if (v.items) {
        v.items.forEach((item) => {
          const categoria = item.categoria || 'Sin categoría';
          if (!ventasPorCategoria[categoria]) {
            ventasPorCategoria[categoria] = { cantidad: 0, total: 0 };
          }
          ventasPorCategoria[categoria].cantidad += item.cantidad || 0;
          ventasPorCategoria[categoria].total += item.total || 0;
        });
      }
    });

    return {
      periodo: this.state.periodo,
      rangoFechas: { inicio, fin },

      ingresos: {
        ventas: ingresosVentas,
        servicios: ingresosServicios,
        adicionales: ingresosAdicionales,
        total: totalIngresos,
      },

      costos: {
        costoVentas: costoVentas,
        costoMaterialesOT: costoMaterialesOT,
        costoTotal: costoTotalVentas,
        gastosOperativos: gastosOperativos,
      },

      ganancias: {
        bruta: gananciaBruta,
        neta: gananciaNeta,
        margenBruto: margenBruto,
        margenNeto: margenNeto,
      },

      flujoCaja: {
        efectivoRecibido: efectivoRecibido,
        efectivoPagado: efectivoPagado,
        neto: flujoCajaNeto,
      },

      cuentas: {
        porCobrar: totalPorCobrar,
        porPagar: totalPorPagar,
        balance: totalPorCobrar - totalPorPagar,
        vencidas: cuentasVencidas.length,
        montoVencido: montoVencido,
        detalleCobrar: cuentasPorCobrarPendientes,
        detallePagar: cuentasPorPagarPendientes,
      },

      compras: {
        total: totalCompras,
        cantidad: compras.length,
      },

      indicadores: {
        roi: roi,
        puntoEquilibrio: puntoEquilibrio,
        liquidez: razonLiquidez,
        rotacionInventario: rotacionInventario,
      },

      inventario: {
        valorCosto: valorInventarioCosto,
        valorVenta: valorInventarioVenta,
        gananciaProyectada: valorInventarioVenta - valorInventarioCosto,
        cantidadProductos: this.state.productos.length,
        stockTotal: this.state.productos.reduce((sum, p) => sum + (p.stock || 0), 0),
      },

      ventas: {
        cantidad: ventas.length,
        total: ingresosVentas,
        ticketPromedio: ventas.length > 0 ? ingresosVentas / ventas.length : 0,
        porMetodo: ventasPorMetodo,
        porCategoria: ventasPorCategoria,
      },

      servicios: {
        cantidad: ordenesTrabajo.length,
        total: ingresosServicios,
        ticketPromedio: ordenesTrabajo.length > 0 ? ingresosServicios / ordenesTrabajo.length : 0,
      },
    };
  },

  // ============================================
  // RENDER DASHBOARD PROFESIONAL
  // ============================================
  renderDashboard() {
    const metricas = this.calcularMetricasAvanzadas();

    return `
      <!-- KPIs Principales con Tendencias -->
      <div class="dashboard-grid">
        <!-- Columna Principal: Métricas y Gráficos -->
        <div class="dashboard-main">
          <!-- Tarjetas de Métricas -->
          <div class="stats-grid stats-grid-4">
            <div class="stat-card stat-card-animated">
              <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                <i class="fas fa-dollar-sign"></i>
              </div>
              <div class="stat-info">
                <h3>${Utils.formatCurrency(metricas.ingresos.total)}</h3>
                <p>Ingresos Totales</p>
                <div class="stat-breakdown">
                  <small><i class="fas fa-shopping-cart"></i> Ventas: ${Utils.formatCurrency(metricas.ingresos.ventas)}</small>
                  <small><i class="fas fa-tools"></i> Servicios: ${Utils.formatCurrency(metricas.ingresos.servicios)}</small>
                </div>
              </div>
            </div>

            <div class="stat-card stat-card-animated">
              <div class="stat-icon" style="background: linear-gradient(135deg, #6366f1, #4f46e5);">
                <i class="fas fa-chart-line"></i>
              </div>
              <div class="stat-info">
                <h3 class="${metricas.ganancias.neta >= 0 ? 'text-success' : 'text-danger'}">
                  ${Utils.formatCurrency(metricas.ganancias.neta)}
                </h3>
                <p>Ganancia Neta</p>
                <div class="stat-progress">
                  <div class="progress-bar">
                    <div class="progress-fill ${metricas.ganancias.margenNeto >= 15 ? 'success' : metricas.ganancias.margenNeto >= 5 ? 'warning' : 'danger'}" 
                         style="width: ${Math.min(Math.abs(metricas.ganancias.margenNeto), 100)}%"></div>
                  </div>
                  <small>Margen: ${metricas.ganancias.margenNeto.toFixed(1)}%</small>
                </div>
              </div>
            </div>

            <div class="stat-card stat-card-animated">
              <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6, #2563eb);">
                <i class="fas fa-money-bill-wave"></i>
              </div>
              <div class="stat-info">
                <h3 class="${metricas.flujoCaja.neto >= 0 ? 'text-success' : 'text-danger'}">
                  ${Utils.formatCurrency(metricas.flujoCaja.neto)}
                </h3>
                <p>Flujo de Caja</p>
                <div class="stat-breakdown">
                  <small class="text-success"><i class="fas fa-arrow-down"></i> +${Utils.formatCurrency(metricas.flujoCaja.efectivoRecibido)}</small>
                  <small class="text-danger"><i class="fas fa-arrow-up"></i> -${Utils.formatCurrency(metricas.flujoCaja.efectivoPagado)}</small>
                </div>
              </div>
            </div>

            <div class="stat-card stat-card-animated">
              <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                <i class="fas fa-balance-scale"></i>
              </div>
              <div class="stat-info">
                <h3 class="${metricas.cuentas.balance >= 0 ? 'text-success' : 'text-danger'}">
                  ${Utils.formatCurrency(metricas.cuentas.balance)}
                </h3>
                <p>Balance Cuentas</p>
                <div class="stat-breakdown">
                  <small class="text-success">Por cobrar: ${Utils.formatCurrency(metricas.cuentas.porCobrar)}</small>
                  <small class="text-danger">Por pagar: ${Utils.formatCurrency(metricas.cuentas.porPagar)}</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Estado de Resultados Expandible -->
          <div class="card card-collapsible">
            <div class="card-header" onclick="this.parentElement.classList.toggle('collapsed')">
              <h3 class="card-title">
                <i class="fas fa-calculator"></i> Estado de Resultados
              </h3>
              <i class="fas fa-chevron-down collapse-icon"></i>
            </div>
            <div class="card-body">
              <div class="financial-breakdown financial-breakdown-pro">
                <div class="breakdown-section">
                  <h5><i class="fas fa-plus-circle text-success"></i> INGRESOS</h5>
                  <div class="breakdown-row">
                    <span class="breakdown-label"><i class="fas fa-shopping-cart"></i> Ventas de Productos</span>
                    <span class="breakdown-value text-success">+${Utils.formatCurrency(metricas.ingresos.ventas)}</span>
                  </div>
                  <div class="breakdown-row">
                    <span class="breakdown-label"><i class="fas fa-tools"></i> Servicios / Órdenes de Trabajo</span>
                    <span class="breakdown-value text-success">+${Utils.formatCurrency(metricas.ingresos.servicios)}</span>
                  </div>
                  <div class="breakdown-row">
                    <span class="breakdown-label"><i class="fas fa-coins"></i> Otros Ingresos</span>
                    <span class="breakdown-value text-success">+${Utils.formatCurrency(metricas.ingresos.adicionales)}</span>
                  </div>
                  <div class="breakdown-row breakdown-subtotal">
                    <span class="breakdown-label"><strong>Total Ingresos</strong></span>
                    <span class="breakdown-value text-success"><strong>${Utils.formatCurrency(metricas.ingresos.total)}</strong></span>
                  </div>
                </div>

                <div class="breakdown-section">
                  <h5><i class="fas fa-minus-circle text-danger"></i> COSTOS</h5>
                  <div class="breakdown-row">
                    <span class="breakdown-label"><i class="fas fa-box"></i> Costo de Productos Vendidos</span>
                    <span class="breakdown-value text-danger">-${Utils.formatCurrency(metricas.costos.costoVentas)}</span>
                  </div>
                  <div class="breakdown-row">
                    <span class="breakdown-label"><i class="fas fa-wrench"></i> Costo de Materiales (Servicios)</span>
                    <span class="breakdown-value text-danger">-${Utils.formatCurrency(metricas.costos.costoMaterialesOT)}</span>
                  </div>
                </div>

                <div class="breakdown-row breakdown-subtotal highlight-success">
                  <span class="breakdown-label">
                    <i class="fas fa-chart-pie"></i> <strong>= GANANCIA BRUTA</strong>
                  </span>
                  <span class="breakdown-value">
                    <strong>${Utils.formatCurrency(metricas.ganancias.bruta)}</strong>
                    <span class="badge badge-${metricas.ganancias.margenBruto >= 30 ? 'success' : metricas.ganancias.margenBruto >= 15 ? 'warning' : 'danger'}">
                      ${metricas.ganancias.margenBruto.toFixed(1)}%
                    </span>
                  </span>
                </div>

                <div class="breakdown-section">
                  <h5><i class="fas fa-building text-warning"></i> GASTOS OPERATIVOS</h5>
                  <div class="breakdown-row">
                    <span class="breakdown-label"><i class="fas fa-receipt"></i> Gastos Registrados</span>
                    <span class="breakdown-value text-danger">-${Utils.formatCurrency(metricas.costos.gastosOperativos)}</span>
                  </div>
                </div>

                <div class="breakdown-row breakdown-total ${metricas.ganancias.neta >= 0 ? 'positive' : 'negative'}">
                  <span class="breakdown-label">
                    <i class="fas fa-trophy"></i> <strong>= GANANCIA NETA</strong>
                  </span>
                  <span class="breakdown-value">
                    <strong>${Utils.formatCurrency(metricas.ganancias.neta)}</strong>
                    <span class="badge badge-${metricas.ganancias.margenNeto >= 15 ? 'success' : metricas.ganancias.margenNeto >= 5 ? 'warning' : 'danger'}">
                      ${metricas.ganancias.margenNeto.toFixed(1)}%
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Gráfico de Ventas por Método de Pago -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-credit-card"></i> Ventas por Método de Pago</h3>
            </div>
            <div class="card-body">
              ${this.renderVentasPorMetodo(metricas.ventas.porMetodo)}
            </div>
          </div>
        </div>

        <!-- Sidebar: Indicadores y Alertas -->
        <div class="dashboard-sidebar">
          <!-- Indicadores Clave -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-chart-pie"></i> Indicadores Clave</h3>
            </div>
            <div class="card-body">
              <div class="indicator-list">
                <div class="indicator-item">
                  <div class="indicator-label">
                    <i class="fas fa-percentage text-primary"></i>
                    <span>ROI</span>
                    <span class="info-tooltip" title="Retorno sobre la inversión">?</span>
                  </div>
                  <div class="indicator-value ${metricas.indicadores.roi >= 0 ? 'text-success' : 'text-danger'}">
                    ${metricas.indicadores.roi.toFixed(1)}%
                  </div>
                </div>

                <div class="indicator-item">
                  <div class="indicator-label">
                    <i class="fas fa-crosshairs text-warning"></i>
                    <span>Punto de Equilibrio</span>
                  </div>
                  <div class="indicator-value">
                    ${Utils.formatCurrency(metricas.indicadores.puntoEquilibrio)}
                  </div>
                </div>

                <div class="indicator-item">
                  <div class="indicator-label">
                    <i class="fas fa-tint text-info"></i>
                    <span>Razón de Liquidez</span>
                  </div>
                  <div class="indicator-value ${metricas.indicadores.liquidez >= 1 ? 'text-success' : 'text-warning'}">
                    ${metricas.indicadores.liquidez.toFixed(2)}
                  </div>
                </div>

                <div class="indicator-item">
                  <div class="indicator-label">
                    <i class="fas fa-sync-alt text-purple"></i>
                    <span>Rotación Inventario</span>
                  </div>
                  <div class="indicator-value">
                    ${metricas.indicadores.rotacionInventario.toFixed(1)}x/año
                  </div>
                </div>

                <div class="indicator-item">
                  <div class="indicator-label">
                    <i class="fas fa-shopping-basket text-success"></i>
                    <span>Ticket Promedio</span>
                  </div>
                  <div class="indicator-value">
                    ${Utils.formatCurrency(metricas.ventas.ticketPromedio)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Resumen de Inventario -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-boxes"></i> Inventario</h3>
            </div>
            <div class="card-body">
              <div class="inventory-summary">
                <div class="inventory-item">
                  <span class="inv-label">Valor al Costo</span>
                  <span class="inv-value">${Utils.formatCurrency(metricas.inventario.valorCosto)}</span>
                </div>
                <div class="inventory-item">
                  <span class="inv-label">Valor de Venta</span>
                  <span class="inv-value">${Utils.formatCurrency(metricas.inventario.valorVenta)}</span>
                </div>
                <div class="inventory-item highlight">
                  <span class="inv-label">Ganancia Proyectada</span>
                  <span class="inv-value text-success">${Utils.formatCurrency(metricas.inventario.gananciaProyectada)}</span>
                </div>
                <div class="inventory-stats">
                  <span><i class="fas fa-cubes"></i> ${metricas.inventario.cantidadProductos} productos</span>
                  <span><i class="fas fa-boxes"></i> ${metricas.inventario.stockTotal} unidades</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Alertas y Recomendaciones -->
          ${this.renderAlertasDashboard(metricas)}
        </div>
      </div>
    `;
  },

  // ============================================
  // RENDER VENTAS POR MÉTODO DE PAGO
  // ============================================
  renderVentasPorMetodo(porMetodo) {
    const metodos = Object.entries(porMetodo);
    if (metodos.length === 0) {
      return '<p class="text-muted text-center">No hay datos de ventas en este período</p>';
    }

    const total = metodos.reduce((sum, [_, data]) => sum + data.total, 0);
    const colores = {
      efectivo: '#10b981',
      tarjeta: '#3b82f6',
      transferencia: '#8b5cf6',
      credito: '#f59e0b',
      mixto: '#6366f1',
      otro: '#6b7280',
    };

    const iconos = {
      efectivo: 'fa-money-bill-wave',
      tarjeta: 'fa-credit-card',
      transferencia: 'fa-exchange-alt',
      credito: 'fa-file-invoice-dollar',
      mixto: 'fa-layer-group',
      otro: 'fa-ellipsis-h',
    };

    return `
      <div class="payment-methods-chart">
        ${metodos
          .map(([metodo, data]) => {
            const porcentaje = total > 0 ? (data.total / total) * 100 : 0;
            const color = colores[metodo.toLowerCase()] || colores.otro;
            const icono = iconos[metodo.toLowerCase()] || iconos.otro;

            return `
            <div class="payment-method-row">
              <div class="method-info">
                <span class="method-icon" style="background-color: ${color}20; color: ${color};">
                  <i class="fas ${icono}"></i>
                </span>
                <span class="method-name">${metodo.charAt(0).toUpperCase() + metodo.slice(1)}</span>
              </div>
              <div class="method-bar-container">
                <div class="method-bar" style="width: ${porcentaje}%; background-color: ${color};"></div>
              </div>
              <div class="method-values">
                <span class="method-amount">${Utils.formatCurrency(data.total)}</span>
                <span class="method-percent">${porcentaje.toFixed(1)}%</span>
                <span class="method-count">${data.cantidad} ventas</span>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    `;
  },

  // ============================================
  // RENDER ALERTAS DASHBOARD
  // ============================================
  renderAlertasDashboard(metricas) {
    const alertas = [];

    // Alerta: Ganancia negativa
    if (metricas.ganancias.neta < 0) {
      alertas.push({
        tipo: 'danger',
        icono: 'fa-exclamation-circle',
        titulo: 'Pérdida en el Período',
        mensaje: `Pérdida de ${Utils.formatCurrency(Math.abs(metricas.ganancias.neta))}. Revisa costos y gastos.`,
      });
    }

    // Alerta: Margen bajo
    if (metricas.ganancias.margenNeto < 10 && metricas.ganancias.margenNeto >= 0) {
      alertas.push({
        tipo: 'warning',
        icono: 'fa-exclamation-triangle',
        titulo: 'Margen Bajo',
        mensaje: `Margen de ${metricas.ganancias.margenNeto.toFixed(1)}%. El objetivo es >15%.`,
      });
    }

    // Alerta: Flujo de caja negativo
    if (metricas.flujoCaja.neto < 0) {
      alertas.push({
        tipo: 'warning',
        icono: 'fa-money-bill-wave',
        titulo: 'Flujo de Caja Negativo',
        mensaje: 'Sales más efectivo del que entra. Revisa cobros pendientes.',
      });
    }

    // Alerta: Cuentas vencidas
    if (metricas.cuentas.vencidas > 0) {
      alertas.push({
        tipo: 'warning',
        icono: 'fa-clock',
        titulo: 'Cuentas Vencidas',
        mensaje: `${metricas.cuentas.vencidas} cuenta(s) por ${Utils.formatCurrency(metricas.cuentas.montoVencido)}`,
      });
    }

    // Alerta: Bajo punto de equilibrio
    if (
      metricas.ingresos.total < metricas.indicadores.puntoEquilibrio &&
      metricas.indicadores.puntoEquilibrio > 0
    ) {
      alertas.push({
        tipo: 'info',
        icono: 'fa-target',
        titulo: 'Bajo Punto de Equilibrio',
        mensaje: `Faltan ${Utils.formatCurrency(metricas.indicadores.puntoEquilibrio - metricas.ingresos.total)} para cubrir gastos.`,
      });
    }

    // Alerta: Baja liquidez
    if (metricas.indicadores.liquidez < 1 && metricas.cuentas.porPagar > 0) {
      alertas.push({
        tipo: 'danger',
        icono: 'fa-water',
        titulo: 'Liquidez Crítica',
        mensaje: 'Tus deudas superan tus cobros pendientes.',
      });
    }

    // Mensaje positivo
    if (alertas.length === 0) {
      alertas.push({
        tipo: 'success',
        icono: 'fa-check-circle',
        titulo: '¡Excelente!',
        mensaje: 'Todos los indicadores financieros están saludables.',
      });
    }

    return `
      <div class="card card-alerts">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-bell"></i> Alertas</h3>
        </div>
        <div class="card-body">
          <div class="alerts-list">
            ${alertas
              .map(
                (alerta) => `
              <div class="alert-item alert-${alerta.tipo}">
                <div class="alert-icon">
                  <i class="fas ${alerta.icono}"></i>
                </div>
                <div class="alert-content">
                  <strong>${alerta.titulo}</strong>
                  <p>${alerta.mensaje}</p>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  },

  // ============================================
  // RENDER FLUJO DE CAJA
  // ============================================
  renderFlujoCaja() {
    const metricas = this.calcularMetricasAvanzadas();
    const { inicio, fin } = this.obtenerRangoFechas(this.state.periodo);

    // Agrupar movimientos por día
    const movimientosDiarios = this.calcularMovimientosDiarios(inicio, fin);

    return `
      <div class="flujo-caja-container">
        <!-- Resumen de Flujo -->
        <div class="stats-grid stats-grid-3">
          <div class="stat-card stat-card-lg">
            <div class="stat-icon success">
              <i class="fas fa-arrow-down"></i>
            </div>
            <div class="stat-info">
              <h3 class="text-success">${Utils.formatCurrency(metricas.flujoCaja.efectivoRecibido)}</h3>
              <p>Entradas de Efectivo</p>
            </div>
          </div>
          
          <div class="stat-card stat-card-lg">
            <div class="stat-icon danger">
              <i class="fas fa-arrow-up"></i>
            </div>
            <div class="stat-info">
              <h3 class="text-danger">${Utils.formatCurrency(metricas.flujoCaja.efectivoPagado)}</h3>
              <p>Salidas de Efectivo</p>
            </div>
          </div>
          
          <div class="stat-card stat-card-lg ${metricas.flujoCaja.neto >= 0 ? 'positive' : 'negative'}">
            <div class="stat-icon ${metricas.flujoCaja.neto >= 0 ? 'success' : 'danger'}">
              <i class="fas fa-balance-scale"></i>
            </div>
            <div class="stat-info">
              <h3 class="${metricas.flujoCaja.neto >= 0 ? 'text-success' : 'text-danger'}">
                ${Utils.formatCurrency(metricas.flujoCaja.neto)}
              </h3>
              <p>Flujo Neto</p>
            </div>
          </div>
        </div>

        <!-- Detalle de Movimientos -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-stream"></i> Movimientos del Período</h3>
          </div>
          <div class="card-body">
            <div class="flujo-detalle">
              <div class="flujo-columna flujo-entradas">
                <h4 class="text-success"><i class="fas fa-arrow-down"></i> Entradas</h4>
                <div class="flujo-items">
                  <div class="flujo-item">
                    <span><i class="fas fa-shopping-cart"></i> Ventas en Efectivo</span>
                    <span class="text-success">${Utils.formatCurrency(metricas.ingresos.ventas * 0.7)}</span>
                  </div>
                  <div class="flujo-item">
                    <span><i class="fas fa-credit-card"></i> Cobros con Tarjeta</span>
                    <span class="text-success">${Utils.formatCurrency(metricas.ingresos.ventas * 0.2)}</span>
                  </div>
                  <div class="flujo-item">
                    <span><i class="fas fa-tools"></i> Servicios Cobrados</span>
                    <span class="text-success">${Utils.formatCurrency(metricas.ingresos.servicios)}</span>
                  </div>
                  <div class="flujo-item">
                    <span><i class="fas fa-hand-holding-usd"></i> Cobros de Créditos</span>
                    <span class="text-success">${Utils.formatCurrency(metricas.ingresos.adicionales)}</span>
                  </div>
                </div>
              </div>
              
              <div class="flujo-columna flujo-salidas">
                <h4 class="text-danger"><i class="fas fa-arrow-up"></i> Salidas</h4>
                <div class="flujo-items">
                  <div class="flujo-item">
                    <span><i class="fas fa-truck"></i> Compras de Inventario</span>
                    <span class="text-danger">${Utils.formatCurrency(metricas.compras.total)}</span>
                  </div>
                  <div class="flujo-item">
                    <span><i class="fas fa-receipt"></i> Gastos Operativos</span>
                    <span class="text-danger">${Utils.formatCurrency(metricas.costos.gastosOperativos)}</span>
                  </div>
                  <div class="flujo-item">
                    <span><i class="fas fa-file-invoice-dollar"></i> Pagos a Proveedores</span>
                    <span class="text-danger">${Utils.formatCurrency(metricas.cuentas.porPagar * 0.3)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Proyección -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-crystal-ball"></i> Proyección de Flujo</h3>
          </div>
          <div class="card-body">
            <div class="proyeccion-flujo">
              <div class="proyeccion-item">
                <span class="proyeccion-label">Saldo Actual Estimado</span>
                <span class="proyeccion-value">${Utils.formatCurrency(metricas.flujoCaja.neto)}</span>
              </div>
              <div class="proyeccion-item">
                <span class="proyeccion-label text-success">+ Por Cobrar (próximos 30 días)</span>
                <span class="proyeccion-value text-success">+${Utils.formatCurrency(metricas.cuentas.porCobrar)}</span>
              </div>
              <div class="proyeccion-item">
                <span class="proyeccion-label text-danger">- Por Pagar (próximos 30 días)</span>
                <span class="proyeccion-value text-danger">-${Utils.formatCurrency(metricas.cuentas.porPagar)}</span>
              </div>
              <div class="proyeccion-item proyeccion-total">
                <span class="proyeccion-label"><strong>= Flujo Proyectado</strong></span>
                <span class="proyeccion-value ${metricas.flujoCaja.neto + metricas.cuentas.porCobrar - metricas.cuentas.porPagar >= 0 ? 'text-success' : 'text-danger'}">
                  <strong>${Utils.formatCurrency(metricas.flujoCaja.neto + metricas.cuentas.porCobrar - metricas.cuentas.porPagar)}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ============================================
  // CALCULAR MOVIMIENTOS DIARIOS
  // ============================================
  calcularMovimientosDiarios(inicio, fin) {
    const movimientos = [];
    const ventasFiltradas = this.state.ventas.filter(
      (v) => v.fecha >= inicio && v.fecha <= fin && v.estado !== 'anulada'
    );

    // Agrupar por fecha
    const porFecha = {};
    ventasFiltradas.forEach((v) => {
      if (!porFecha[v.fecha]) {
        porFecha[v.fecha] = { entradas: 0, salidas: 0 };
      }
      porFecha[v.fecha].entradas += v.total || 0;
    });

    return Object.entries(porFecha)
      .map(([fecha, datos]) => ({
        fecha,
        ...datos,
        neto: datos.entradas - datos.salidas,
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  },

  // ============================================
  // RENDER ESTADÍSTICAS AVANZADAS
  // ============================================
  renderEstadisticas() {
    const { inicio, fin } = this.obtenerRangoFechas(this.state.periodo);
    const ventas = this.state.ventas.filter(
      (v) => v.fecha >= inicio && v.fecha <= fin && v.estado !== 'anulada'
    );

    // Top Productos con análisis completo
    const productosVendidos = {};
    ventas.forEach((venta) => {
      if (venta.items) {
        venta.items.forEach((item) => {
          if (!productosVendidos[item.productoId]) {
            const producto = this.state.productos.find((p) => p.id === item.productoId);
            productosVendidos[item.productoId] = {
              id: item.productoId,
              nombre: item.nombre || producto?.nombre || 'Desconocido',
              cantidad: 0,
              total: 0,
              costo: 0,
              ganancia: 0,
              margen: 0,
              categoria: item.categoria || producto?.categoria || 'Sin categoría',
            };
          }
          const costoUnitario =
            item.precioCompra ||
            this.state.productos.find((p) => p.id === item.productoId)?.precioCompra ||
            0;
          productosVendidos[item.productoId].cantidad += item.cantidad || 0;
          productosVendidos[item.productoId].total += item.total || 0;
          productosVendidos[item.productoId].costo += costoUnitario * (item.cantidad || 0);
        });
      }
    });

    // Calcular ganancia y margen
    Object.values(productosVendidos).forEach((p) => {
      p.ganancia = p.total - p.costo;
      p.margen = p.total > 0 ? (p.ganancia / p.total) * 100 : 0;
    });

    const topProductos = Object.values(productosVendidos)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    const topProductosRentables = Object.values(productosVendidos)
      .sort((a, b) => b.ganancia - a.ganancia)
      .slice(0, 10);

    // Top Clientes con frecuencia
    const clientesCompras = {};
    ventas.forEach((venta) => {
      const clienteId = venta.clienteId || 'general';
      const clienteNombre = venta.clienteNombre || 'Público General';

      if (!clientesCompras[clienteId]) {
        clientesCompras[clienteId] = {
          id: clienteId,
          nombre: clienteNombre,
          cantidad: 0,
          total: 0,
          ultimaCompra: venta.fecha,
          ticketPromedio: 0,
        };
      }
      clientesCompras[clienteId].cantidad += 1;
      clientesCompras[clienteId].total += venta.total || 0;
      if (venta.fecha > clientesCompras[clienteId].ultimaCompra) {
        clientesCompras[clienteId].ultimaCompra = venta.fecha;
      }
    });

    Object.values(clientesCompras).forEach((c) => {
      c.ticketPromedio = c.cantidad > 0 ? c.total / c.cantidad : 0;
    });

    const topClientes = Object.values(clientesCompras)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Análisis por categoría
    const ventasPorCategoria = {};
    ventas.forEach((venta) => {
      if (venta.items) {
        venta.items.forEach((item) => {
          const categoria = item.categoria || 'Sin categoría';
          if (!ventasPorCategoria[categoria]) {
            ventasPorCategoria[categoria] = { cantidad: 0, total: 0, items: 0 };
          }
          ventasPorCategoria[categoria].cantidad++;
          ventasPorCategoria[categoria].total += item.total || 0;
          ventasPorCategoria[categoria].items += item.cantidad || 0;
        });
      }
    });

    const categorias = Object.entries(ventasPorCategoria)
      .map(([nombre, data]) => ({ nombre, ...data }))
      .sort((a, b) => b.total - a.total);

    // Análisis por hora del día
    const ventasPorHora = Array(24)
      .fill(0)
      .map((_, i) => ({ hora: i, ventas: 0, total: 0 }));
    ventas.forEach((venta) => {
      const hora = venta.hora ? parseInt(venta.hora.split(':')[0]) : 12;
      if (hora >= 0 && hora < 24) {
        ventasPorHora[hora].ventas++;
        ventasPorHora[hora].total += venta.total || 0;
      }
    });

    // Análisis por día de la semana
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const ventasPorDia = diasSemana.map((dia, i) => ({ dia, ventas: 0, total: 0 }));
    ventas.forEach((venta) => {
      if (venta.fecha) {
        const diaSemana = new Date(venta.fecha).getDay();
        ventasPorDia[diaSemana].ventas++;
        ventasPorDia[diaSemana].total += venta.total || 0;
      }
    });

    // Stock Crítico
    const stockCritico = this.state.productos
      .filter((p) => p.stock <= (p.stockMinimo || 5) && p.activo !== false)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 20);

    return `
      <div class="estadisticas-container">
        <!-- Resumen Rápido -->
        <div class="stats-grid stats-grid-4">
          <div class="stat-card mini">
            <i class="fas fa-box text-primary"></i>
            <div>
              <strong>${topProductos.length}</strong>
              <span>Productos Vendidos</span>
            </div>
          </div>
          <div class="stat-card mini">
            <i class="fas fa-users text-success"></i>
            <div>
              <strong>${Object.keys(clientesCompras).length}</strong>
              <span>Clientes Atendidos</span>
            </div>
          </div>
          <div class="stat-card mini">
            <i class="fas fa-tags text-warning"></i>
            <div>
              <strong>${categorias.length}</strong>
              <span>Categorías</span>
            </div>
          </div>
          <div class="stat-card mini">
            <i class="fas fa-exclamation-triangle text-danger"></i>
            <div>
              <strong>${stockCritico.length}</strong>
              <span>Stock Crítico</span>
            </div>
          </div>
        </div>

        <!-- Tabs secundarias -->
        <div class="stats-tabs">
          <button class="stats-tab active" onclick="Finanzas.mostrarSubEstadistica('productos', this)">
            <i class="fas fa-trophy"></i> Productos
          </button>
          <button class="stats-tab" onclick="Finanzas.mostrarSubEstadistica('clientes', this)">
            <i class="fas fa-star"></i> Clientes
          </button>
          <button class="stats-tab" onclick="Finanzas.mostrarSubEstadistica('categorias', this)">
            <i class="fas fa-tags"></i> Categorías
          </button>
          <button class="stats-tab" onclick="Finanzas.mostrarSubEstadistica('tiempo', this)">
            <i class="fas fa-clock"></i> Tiempo
          </button>
          <button class="stats-tab" onclick="Finanzas.mostrarSubEstadistica('stock', this)">
            <i class="fas fa-boxes"></i> Stock
          </button>
        </div>

        <div id="subEstadisticaContent">
          ${this.renderTopProductos(topProductos, topProductosRentables)}
        </div>
      </div>

      <!-- Datos ocultos para las sub-estadísticas -->
      <script type="application/json" id="datosEstadisticas">
        ${JSON.stringify({
          topProductos,
          topProductosRentables,
          topClientes,
          categorias,
          ventasPorHora,
          ventasPorDia,
          stockCritico,
        })}
      </script>
    `;
  },

  // ============================================
  // MOSTRAR SUB ESTADÍSTICA
  // ============================================
  mostrarSubEstadistica(tipo, btn) {
    // Actualizar tabs activas
    document.querySelectorAll('.stats-tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');

    const container = document.getElementById('subEstadisticaContent');
    const datos = JSON.parse(document.getElementById('datosEstadisticas').textContent);

    switch (tipo) {
      case 'productos':
        container.innerHTML = this.renderTopProductos(
          datos.topProductos,
          datos.topProductosRentables
        );
        break;
      case 'clientes':
        container.innerHTML = this.renderTopClientes(datos.topClientes);
        break;
      case 'categorias':
        container.innerHTML = this.renderCategorias(datos.categorias);
        break;
      case 'tiempo':
        container.innerHTML = this.renderAnalisisTiempo(datos.ventasPorHora, datos.ventasPorDia);
        break;
      case 'stock':
        container.innerHTML = this.renderStockCritico(datos.stockCritico);
        break;
    }
  },

  // ============================================
  // RENDER TOP PRODUCTOS
  // ============================================
  renderTopProductos(topProductos, topRentables) {
    return `
      <div class="stats-grid stats-grid-2">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-trophy text-warning"></i> Top Productos por Ventas</h3>
          </div>
          <div class="card-body">
            ${
              topProductos.length === 0
                ? '<p class="text-muted">No hay datos en este período</p>'
                : `
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Total</th>
                      <th>Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${topProductos
                      .map(
                        (p, i) => `
                      <tr>
                        <td>
                          <span class="rank-badge rank-${i < 3 ? i + 1 : 'other'}">${i + 1}</span>
                        </td>
                        <td>
                          <strong>${Utils.escapeHTML(p.nombre)}</strong>
                          <small class="text-muted d-block">${p.categoria}</small>
                        </td>
                        <td><span class="badge badge-light">${p.cantidad}</span></td>
                        <td class="text-success"><strong>${Utils.formatCurrency(p.total)}</strong></td>
                        <td>
                          <span class="badge badge-${p.margen >= 30 ? 'success' : p.margen >= 15 ? 'warning' : 'danger'}">
                            ${p.margen.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            `
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-gem text-success"></i> Más Rentables</h3>
          </div>
          <div class="card-body">
            ${
              topRentables.length === 0
                ? '<p class="text-muted">No hay datos</p>'
                : `
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Ganancia</th>
                      <th>Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${topRentables
                      .map(
                        (p) => `
                      <tr>
                        <td>${Utils.escapeHTML(p.nombre)}</td>
                        <td class="text-success"><strong>${Utils.formatCurrency(p.ganancia)}</strong></td>
                        <td>
                          <div class="progress-mini">
                            <div class="progress-bar-mini" style="width: ${Math.min(p.margen, 100)}%"></div>
                          </div>
                          <span>${p.margen.toFixed(1)}%</span>
                        </td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            `
            }
          </div>
        </div>
      </div>
    `;
  },

  // ============================================
  // RENDER TOP CLIENTES
  // ============================================
  renderTopClientes(topClientes) {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-star text-warning"></i> Mejores Clientes</h3>
        </div>
        <div class="card-body">
          ${
            topClientes.length === 0
              ? '<p class="text-muted">No hay datos</p>'
              : `
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Compras</th>
                    <th>Total</th>
                    <th>Ticket Promedio</th>
                    <th>Última Compra</th>
                  </tr>
                </thead>
                <tbody>
                  ${topClientes
                    .map(
                      (c, i) => `
                    <tr>
                      <td><span class="rank-badge rank-${i < 3 ? i + 1 : 'other'}">${i + 1}</span></td>
                      <td>
                        <div class="cliente-cell">
                          <div class="cliente-avatar">${c.nombre.charAt(0).toUpperCase()}</div>
                          <span>${Utils.escapeHTML(c.nombre)}</span>
                        </div>
                      </td>
                      <td><span class="badge badge-primary">${c.cantidad}</span></td>
                      <td class="text-success"><strong>${Utils.formatCurrency(c.total)}</strong></td>
                      <td>${Utils.formatCurrency(c.ticketPromedio)}</td>
                      <td><small class="text-muted">${c.ultimaCompra}</small></td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>
    `;
  },

  // ============================================
  // RENDER CATEGORÍAS
  // ============================================
  renderCategorias(categorias) {
    const total = categorias.reduce((sum, c) => sum + c.total, 0);
    const colores = [
      '#10b981',
      '#3b82f6',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#06b6d4',
      '#ec4899',
      '#84cc16',
    ];

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-tags"></i> Ventas por Categoría</h3>
        </div>
        <div class="card-body">
          <div class="categorias-chart">
            ${categorias
              .map((cat, i) => {
                const porcentaje = total > 0 ? (cat.total / total) * 100 : 0;
                const color = colores[i % colores.length];

                return `
                <div class="categoria-row">
                  <div class="categoria-info">
                    <span class="categoria-color" style="background-color: ${color};"></span>
                    <span class="categoria-nombre">${Utils.escapeHTML(cat.nombre)}</span>
                  </div>
                  <div class="categoria-bar-container">
                    <div class="categoria-bar" style="width: ${porcentaje}%; background-color: ${color};"></div>
                  </div>
                  <div class="categoria-values">
                    <span class="categoria-total">${Utils.formatCurrency(cat.total)}</span>
                    <span class="categoria-percent">${porcentaje.toFixed(1)}%</span>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>
      </div>
    `;
  },

  // ============================================
  // RENDER ANÁLISIS DE TIEMPO
  // ============================================
  renderAnalisisTiempo(ventasPorHora, ventasPorDia) {
    const maxVentasHora = Math.max(...ventasPorHora.map((h) => h.total));
    const maxVentasDia = Math.max(...ventasPorDia.map((d) => d.total));

    return `
      <div class="stats-grid stats-grid-2">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-clock"></i> Ventas por Hora</h3>
          </div>
          <div class="card-body">
            <div class="hora-chart">
              ${ventasPorHora
                .filter((h) => h.hora >= 6 && h.hora <= 22)
                .map((h) => {
                  const altura = maxVentasHora > 0 ? (h.total / maxVentasHora) * 100 : 0;
                  return `
                  <div class="hora-bar-container" title="${h.hora}:00 - ${Utils.formatCurrency(h.total)} (${h.ventas} ventas)">
                    <div class="hora-bar" style="height: ${altura}%"></div>
                    <span class="hora-label">${h.hora}</span>
                  </div>
                `;
                })
                .join('')}
            </div>
            <p class="chart-hint">
              <i class="fas fa-info-circle"></i> Mejor hora: ${
                ventasPorHora.reduce((best, h) => (h.total > best.total ? h : best), {
                  hora: 0,
                  total: 0,
                }).hora
              }:00
            </p>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-calendar-week"></i> Ventas por Día</h3>
          </div>
          <div class="card-body">
            <div class="dia-chart">
              ${ventasPorDia
                .map((d) => {
                  const porcentaje = maxVentasDia > 0 ? (d.total / maxVentasDia) * 100 : 0;
                  return `
                  <div class="dia-row">
                    <span class="dia-nombre">${d.dia.substring(0, 3)}</span>
                    <div class="dia-bar-container">
                      <div class="dia-bar" style="width: ${porcentaje}%"></div>
                    </div>
                    <span class="dia-total">${Utils.formatCurrency(d.total)}</span>
                  </div>
                `;
                })
                .join('')}
            </div>
            <p class="chart-hint">
              <i class="fas fa-info-circle"></i> Mejor día: ${
                ventasPorDia.reduce((best, d) => (d.total > best.total ? d : best), {
                  dia: 'N/A',
                  total: 0,
                }).dia
              }
            </p>
          </div>
        </div>
      </div>
    `;
  },

  // ============================================
  // RENDER STOCK CRÍTICO
  // ============================================
  renderStockCritico(stockCritico) {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-exclamation-triangle text-danger"></i> Productos con Stock Crítico</h3>
          ${
            stockCritico.length > 0
              ? `
            <button class="btn btn-sm btn-primary" onclick="Finanzas.generarOrdenReposicion()">
              <i class="fas fa-shopping-cart"></i> Generar Orden de Reposición
            </button>
          `
              : ''
          }
        </div>
        <div class="card-body">
          ${
            stockCritico.length === 0
              ? `
            <div class="empty-state success">
              <i class="fas fa-check-circle"></i>
              <h4>¡Excelente!</h4>
              <p>Todos los productos tienen stock adecuado</p>
            </div>
          `
              : `
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock</th>
                    <th>Mínimo</th>
                    <th>Estado</th>
                    <th>Valor</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  ${stockCritico
                    .map((p) => {
                      const porcentaje = p.stockMinimo > 0 ? (p.stock / p.stockMinimo) * 100 : 0;
                      let estado = 'warning';
                      let estadoTexto = 'Bajo';
                      if (p.stock === 0) {
                        estado = 'danger';
                        estadoTexto = 'Agotado';
                      } else if (porcentaje < 50) {
                        estado = 'danger';
                        estadoTexto = 'Crítico';
                      }

                      return `
                      <tr class="${estado === 'danger' ? 'table-danger' : ''}">
                        <td>
                          <strong>${Utils.escapeHTML(p.nombre)}</strong>
                          ${p.codigo ? `<small class="text-muted d-block">${p.codigo}</small>` : ''}
                        </td>
                        <td class="text-${estado}">
                          <strong>${p.stock}</strong>
                        </td>
                        <td>${p.stockMinimo || 5}</td>
                        <td>
                          <span class="badge badge-${estado}">
                            <i class="fas fa-${estado === 'danger' ? 'times-circle' : 'exclamation-triangle'}"></i>
                            ${estadoTexto}
                          </span>
                        </td>
                        <td>${Utils.formatCurrency((p.precioCompra || 0) * p.stock)}</td>
                        <td>
                          <button class="btn btn-sm btn-outline-primary" 
                                  onclick="Finanzas.crearOrdenCompra('${p.id}', ${(p.stockMinimo || 5) * 2})">
                            <i class="fas fa-cart-plus"></i>
                          </button>
                        </td>
                      </tr>
                    `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>
    `;
  },

  // ============================================
  // GENERAR ORDEN DE REPOSICIÓN
  // ============================================
  async generarOrdenReposicion() {
    const stockCritico = this.state.productos.filter(
      (p) => p.stock <= (p.stockMinimo || 5) && p.activo !== false
    );

    if (stockCritico.length === 0) {
      Utils.showToast('No hay productos con stock crítico', 'info');
      return;
    }

    // Ir al módulo de compras con los productos precargados
    App.loadModule('compras');

    setTimeout(() => {
      if (window.Compras && typeof Compras.cargarItemsReposicion === 'function') {
        Compras.cargarItemsReposicion(
          stockCritico.map((p) => ({
            productoId: p.id,
            productoNombre: p.nombre,
            cantidad: Math.max((p.stockMinimo || 5) * 2 - p.stock, 1),
            precioUnitario: p.precioCompra || 0,
          }))
        );
      } else {
        Utils.showToast('Productos agregados al carrito de compras', 'success');
      }
    }, 500);
  },

  // ============================================
  // RENDER INVENTARIO IA
  // ============================================
  async renderInventarioIA() {
    const productos = Database.getCollection('productos') || [];
    const ventas = Database.getCollection('ventas') || [];

    // Calcular rotación de inventario
    const rotacion = await this.calcularRotacionInventario(productos, ventas);

    // Predicción de reabastecimiento
    const predicciones = await this.predecirReabastecimiento(productos, ventas);

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-robot"></i> Análisis Inteligente de Inventario</h3>
        </div>
        <div class="card-body">
          <div class="alert alert-info">
            <i class="fas fa-info-circle"></i>
            <strong>Análisis con IA:</strong> Este módulo utiliza inteligencia artificial para predecir necesidades de reabastecimiento basándose en patrones de venta históricos.
          </div>
        </div>
      </div>

      <!-- Rotación de Inventario -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-sync-alt"></i> Rotación de Inventario</h3>
        </div>
        <div class="card-body">
          ${
            rotacion.length === 0
              ? '<p class="text-muted">No hay datos suficientes para analizar</p>'
              : `
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock Actual</th>
                    <th>Ventas (30d)</th>
                    <th>Rotación</th>
                    <th>Días de Cobertura</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${rotacion
                    .slice(0, 20)
                    .map((p) => {
                      let estadoBadge = 'success';
                      let estadoTexto = 'Óptimo';

                      if (p.diasCobertura < 7) {
                        estadoBadge = 'danger';
                        estadoTexto = 'Crítico';
                      } else if (p.diasCobertura < 15) {
                        estadoBadge = 'warning';
                        estadoTexto = 'Bajo';
                      } else if (p.diasCobertura > 60) {
                        estadoBadge = 'info';
                        estadoTexto = 'Exceso';
                      }

                      return `
                      <tr>
                        <td>${Utils.escapeHTML(p.nombre)}</td>
                        <td>${p.stockActual}</td>
                        <td>${p.ventas30d}</td>
                        <td>${p.rotacion.toFixed(2)}x</td>
                        <td>${p.diasCobertura} días</td>
                        <td><span class="badge badge-${estadoBadge}">${estadoTexto}</span></td>
                      </tr>
                    `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>

      <!-- Predicciones de Reabastecimiento -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-brain"></i> Predicciones de Reabastecimiento</h3>
        </div>
        <div class="card-body">
          ${
            predicciones.length === 0
              ? '<p class="text-muted">No hay predicciones en este momento</p>'
              : `
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock Actual</th>
                    <th>Promedio Diario</th>
                    <th>Cantidad Sugerida</th>
                    <th>Prioridad</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  ${predicciones
                    .map((p) => {
                      let prioridadBadge = 'warning';
                      if (p.prioridad === 'alta') prioridadBadge = 'danger';
                      if (p.prioridad === 'baja') prioridadBadge = 'info';

                      return `
                      <tr>
                        <td>${Utils.escapeHTML(p.nombre)}</td>
                        <td class="text-${p.prioridad === 'alta' ? 'danger' : 'warning'}">${p.stockActual}</td>
                        <td>${p.promedioDiario.toFixed(1)} und/día</td>
                        <td class="text-success"><strong>${p.cantidadSugerida}</strong></td>
                        <td>
                          <span class="badge badge-${prioridadBadge}">
                            ${p.prioridad.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <button class="btn btn-sm btn-primary" onclick="Finanzas.crearOrdenCompra('${p.id}', ${p.cantidadSugerida})">
                            <i class="fas fa-shopping-cart"></i> Ordenar
                          </button>
                        </td>
                      </tr>
                    `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>
    `;
  },

  // ============================================
  // CALCULAR ROTACIÓN DE INVENTARIO
  // ============================================
  async calcularRotacionInventario(productos, ventas) {
    const hoy = new Date();
    const hace30Dias = new Date(hoy);
    hace30Dias.setDate(hoy.getDate() - 30);
    const fecha30Dias = hace30Dias.toISOString().split('T')[0];

    const ventasRecientes = ventas.filter((v) => v.fecha >= fecha30Dias && v.estado !== 'anulada');

    const rotacion = productos
      .filter((p) => p.activo && p.stock > 0)
      .map((producto) => {
        let ventas30d = 0;

        ventasRecientes.forEach((venta) => {
          if (venta.items) {
            venta.items.forEach((item) => {
              if (item.productoId === producto.id) {
                ventas30d += item.cantidad || 0;
              }
            });
          }
        });

        const promedioDiario = ventas30d / 30;
        const diasCobertura =
          promedioDiario > 0 ? Math.round(producto.stock / promedioDiario) : 999;
        const rotacionMensual = producto.stock > 0 ? ventas30d / producto.stock : 0;

        return {
          id: producto.id,
          nombre: producto.nombre,
          stockActual: producto.stock,
          ventas30d: ventas30d,
          promedioDiario: promedioDiario,
          diasCobertura: diasCobertura,
          rotacion: rotacionMensual,
        };
      })
      .sort((a, b) => a.diasCobertura - b.diasCobertura);

    return rotacion;
  },

  // ============================================
  // PREDECIR REABASTECIMIENTO CON IA
  // ============================================
  async predecirReabastecimiento(productos, ventas) {
    const rotacion = await this.calcularRotacionInventario(productos, ventas);

    const predicciones = rotacion
      .filter((p) => p.diasCobertura < 30) // Solo productos que necesitan reabastecimiento pronto
      .map((p) => {
        // Calcular cantidad sugerida basada en:
        // 1. Promedio diario de ventas
        // 2. Tiempo de reabastecimiento estimado (15 días)
        // 3. Stock de seguridad (7 días adicionales)

        const diasReabastecimiento = 15;
        const diasSeguridad = 7;
        const totalDias = diasReabastecimiento + diasSeguridad;

        const cantidadSugerida = Math.ceil(p.promedioDiario * totalDias);

        // Determinar prioridad
        let prioridad = 'media';
        if (p.diasCobertura < 7) {
          prioridad = 'alta';
        } else if (p.diasCobertura >= 15) {
          prioridad = 'baja';
        }

        return {
          id: p.id,
          nombre: p.nombre,
          stockActual: p.stockActual,
          promedioDiario: p.promedioDiario,
          diasCobertura: p.diasCobertura,
          cantidadSugerida: cantidadSugerida,
          prioridad: prioridad,
        };
      })
      .sort((a, b) => {
        const prioridadOrden = { alta: 0, media: 1, baja: 2 };
        return prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad];
      });

    return predicciones;
  },

  // ============================================
  // CREAR ORDEN DE COMPRA DESDE PREDICCIÓN
  // ============================================
  crearOrdenCompra(productoId, cantidad) {
    const producto = Database.getItem('productos', productoId);
    if (!producto) {
      Utils.showToast('Producto no encontrado', 'error');
      return;
    }

    // Redirigir al módulo de compras con el producto pre-cargado
    App.loadModule('compras');

    // Esperar a que el módulo se cargue y agregar el producto
    setTimeout(() => {
      if (window.Compras && typeof Compras.agregarItemDesdeExterno === 'function') {
        Compras.agregarItemDesdeExterno({
          productoId: producto.id,
          productoNombre: producto.nombre,
          cantidad: cantidad,
          precioUnitario: producto.precioCompra || 0,
        });
        Utils.showToast(`Producto agregado a nueva compra: ${cantidad} unidades`, 'success');
      }
    }, 500);
  },

  // ============================================
  // RENDER TRANSACCIONES
  // ============================================
  renderTransacciones() {
    const { inicio, fin } = this.obtenerRangoFechas(this.state.periodo);
    const transacciones = this.state.transacciones
      .filter((t) => t.fecha >= inicio && t.fecha <= fin)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    const totalIngresos = transacciones
      .filter((t) => t.tipo === 'ingreso')
      .reduce((sum, t) => sum + (t.monto || 0), 0);

    const totalGastos = transacciones
      .filter((t) => t.tipo === 'gasto')
      .reduce((sum, t) => sum + (t.monto || 0), 0);

    return `
      <div class="stats-grid stats-grid-3">
        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--success-light);">
            <i class="fas fa-arrow-up" style="color: var(--success-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${Utils.formatCurrency(totalIngresos)}</h3>
            <p>Ingresos</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--danger-light);">
            <i class="fas fa-arrow-down" style="color: var(--danger-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${Utils.formatCurrency(totalGastos)}</h3>
            <p>Gastos</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--primary-light);">
            <i class="fas fa-balance-scale" style="color: var(--primary-color);"></i>
          </div>
          <div class="stat-info">
            <h3 class="${totalIngresos - totalGastos >= 0 ? 'text-success' : 'text-danger'}">
              ${Utils.formatCurrency(totalIngresos - totalGastos)}
            </h3>
            <p>Balance</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-exchange-alt"></i> Transacciones</h3>
          <button class="btn btn-primary" onclick="Finanzas.nuevaTransaccion()">
            <i class="fas fa-plus"></i> Nueva Transacción
          </button>
        </div>
        <div class="card-body">
          ${
            transacciones.length === 0
              ? '<p class="text-muted">No hay transacciones en este período</p>'
              : `
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Categoría</th>
                    <th>Descripción</th>
                    <th>Monto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${transacciones
                    .map(
                      (t) => `
                    <tr>
                      <td>${t.fecha}</td>
                      <td>
                        <span class="badge badge-${t.tipo === 'ingreso' ? 'success' : 'danger'}">
                          <i class="fas fa-arrow-${t.tipo === 'ingreso' ? 'up' : 'down'}"></i>
                          ${t.tipo}
                        </span>
                      </td>
                      <td>${Utils.escapeHTML(t.categoria || 'Sin categoría')}</td>
                      <td>${Utils.escapeHTML(t.descripcion || '')}</td>
                      <td class="${t.tipo === 'ingreso' ? 'text-success' : 'text-danger'}">
                        ${t.tipo === 'ingreso' ? '+' : '-'}${Utils.formatCurrency(t.monto)}
                      </td>
                      <td>
                        <button class="btn btn-sm btn-danger" onclick="Finanzas.eliminarTransaccion('${t.id}')">
                          <i class="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>
    `;
  },

  // ============================================
  // RENDER CUENTAS
  // ============================================
  renderCuentas() {
    const totalPorCobrar = this.state.cuentasPorCobrar
      .filter((c) => c.estado !== 'pagada')
      .reduce((sum, c) => sum + (c.montoRestante || 0), 0);

    const totalPorPagar = this.state.cuentasPorPagar
      .filter((c) => c.estado !== 'pagada')
      .reduce((sum, c) => sum + (c.montoRestante || 0), 0);

    const vencidas = [...this.state.cuentasPorCobrar, ...this.state.cuentasPorPagar].filter(
      (c) => c.estado === 'vencida'
    ).length;

    return `
      <div class="stats-grid stats-grid-4">
        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--success-light);">
            <i class="fas fa-arrow-down" style="color: var(--success-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${Utils.formatCurrency(totalPorCobrar)}</h3>
            <p>Por Cobrar</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--danger-light);">
            <i class="fas fa-arrow-up" style="color: var(--danger-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${Utils.formatCurrency(totalPorPagar)}</h3>
            <p>Por Pagar</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--warning-light);">
            <i class="fas fa-exclamation-triangle" style="color: var(--warning-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${vencidas}</h3>
            <p>Cuentas Vencidas</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--primary-light);">
            <i class="fas fa-balance-scale" style="color: var(--primary-color);"></i>
          </div>
          <div class="stat-info">
            <h3 class="${totalPorCobrar - totalPorPagar >= 0 ? 'text-success' : 'text-danger'}">
              ${Utils.formatCurrency(totalPorCobrar - totalPorPagar)}
            </h3>
            <p>Balance</p>
          </div>
        </div>
      </div>

      <div class="tabs-secondary">
        <button class="tab-btn-secondary active" onclick="Finanzas.mostrarSubTab('cobrar')">
          <i class="fas fa-hand-holding-usd"></i> Por Cobrar
        </button>
        <button class="tab-btn-secondary" onclick="Finanzas.mostrarSubTab('pagar')">
          <i class="fas fa-file-invoice-dollar"></i> Por Pagar
        </button>
      </div>

      <div id="cuentasSubTab">
        ${this.renderCuentasPorCobrar()}
      </div>
    `;
  },

  // ============================================
  // RENDER CUENTAS POR COBRAR
  // ============================================
  renderCuentasPorCobrar() {
    const cuentas = this.state.cuentasPorCobrar
      .filter((c) => c.estado !== 'pagada')
      .sort((a, b) => b.fechaVencimiento?.localeCompare(a.fechaVencimiento || '') || 0);

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-hand-holding-usd"></i> Cuentas por Cobrar</h3>
        </div>
        <div class="card-body">
          ${
            cuentas.length === 0
              ? '<p class="text-muted">No hay cuentas por cobrar pendientes</p>'
              : `
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Monto</th>
                    <th>Pendiente</th>
                    <th>Vencimiento</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${cuentas
                    .map(
                      (c) => `
                    <tr>
                      <td>${Utils.escapeHTML(c.clienteNombre || 'Sin nombre')}</td>
                      <td>${Utils.formatCurrency(c.montoTotal || 0)}</td>
                      <td class="text-danger">${Utils.formatCurrency(c.montoRestante || 0)}</td>
                      <td>${c.fechaVencimiento || 'Sin fecha'}</td>
                      <td>
                        <span class="badge badge-${c.estado === 'vencida' ? 'danger' : 'warning'}">
                          ${c.estado || 'pendiente'}
                        </span>
                      </td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>
    `;
  },

  // ============================================
  // RENDER ALERTAS
  // ============================================
  renderAlertas(metricas) {
    const alertas = [];

    if (metricas.ganancias.neta < 0) {
      alertas.push({
        tipo: 'danger',
        icono: 'fa-exclamation-circle',
        titulo: 'Ganancia Negativa',
        mensaje: 'Estás perdiendo dinero. Revisa tus precios y reduce gastos operativos.',
      });
    }

    if (metricas.ganancias.margenNeto < 10 && metricas.ganancias.margenNeto >= 0) {
      alertas.push({
        tipo: 'warning',
        icono: 'fa-exclamation-triangle',
        titulo: 'Margen de Ganancia Bajo',
        mensaje: `Tu margen neto es ${metricas.ganancias.margenNeto.toFixed(2)}%. Considera aumentar precios o reducir costos.`,
      });
    }

    if (metricas.flujoCaja.neto < 0) {
      alertas.push({
        tipo: 'warning',
        icono: 'fa-money-bill-wave',
        titulo: 'Flujo de Caja Negativo',
        mensaje: 'Estás gastando más efectivo del que recibes.',
      });
    }

    if (alertas.length === 0) {
      alertas.push({
        tipo: 'success',
        icono: 'fa-check-circle',
        titulo: '¡Excelente!',
        mensaje: 'Tu negocio está en buen estado financiero.',
      });
    }

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-lightbulb"></i> Alertas y Recomendaciones</h3>
        </div>
        <div class="card-body">
          ${alertas
            .map(
              (alerta) => `
            <div class="alert alert-${alerta.tipo}">
              <i class="fas ${alerta.icono}"></i>
              <strong>${alerta.titulo}:</strong> ${alerta.mensaje}
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  },

  // ============================================
  // OBTENER RANGO DE FECHAS
  // ============================================
  obtenerRangoFechas(periodo) {
    const hoy = new Date();
    let inicio, fin;

    switch (periodo) {
      case 'hoy':
        inicio = fin = Utils.getCurrentDate();
        break;
      case 'semana':
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - 7);
        inicio = inicioSemana.toISOString().split('T')[0];
        fin = Utils.getCurrentDate();
        break;
      case 'mes':
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        inicio = inicioMes.toISOString().split('T')[0];
        fin = Utils.getCurrentDate();
        break;
      case 'anio':
        const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
        inicio = inicioAnio.toISOString().split('T')[0];
        fin = Utils.getCurrentDate();
        break;
      default:
        inicio = '2000-01-01';
        fin = '2099-12-31';
    }

    return { inicio, fin };
  },

  // ============================================
  // NUEVA TRANSACCIÓN
  // ============================================
  nuevaTransaccion() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalNuevaTransaccion';
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3><i class="fas fa-plus"></i> Nueva Transacción</h3>
          <button class="btn-close" onclick="document.getElementById('modalNuevaTransaccion').remove()">×</button>
        </div>
        <form id="formNuevaTransaccion" onsubmit="Finanzas.guardarTransaccion(event)">
          <div class="modal-body">
            <div class="form-group">
              <label>Tipo *</label>
              <select name="tipo" class="form-control" required>
                <option value="ingreso">Ingreso</option>
                <option value="gasto">Gasto</option>
              </select>
            </div>
            <div class="form-group">
              <label>Categoría *</label>
              <input type="text" name="categoria" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Monto *</label>
              <input type="number" name="monto" class="form-control" step="0.01" required>
            </div>
            <div class="form-group">
              <label>Descripción</label>
              <textarea name="descripcion" class="form-control" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label>Fecha *</label>
              <input type="date" name="fecha" class="form-control" value="${Utils.getCurrentDate()}" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modalNuevaTransaccion').remove()">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> Guardar
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  },

  // ============================================
  // GUARDAR TRANSACCIÓN
  // ============================================
  async guardarTransaccion(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const transaccion = {
      id: Utils.generateId(),
      tipo: formData.get('tipo'),
      categoria: formData.get('categoria'),
      monto: parseFloat(formData.get('monto')),
      descripcion: formData.get('descripcion'),
      fecha: formData.get('fecha'),
    };

    await Database.saveItem('transacciones', transaccion);

    document.getElementById('modalNuevaTransaccion').remove();
    Utils.showToast('Transacción guardada exitosamente', 'success');

    App.loadModule('finanzas');
  },

  // ============================================
  // ELIMINAR TRANSACCIÓN
  // ============================================
  async eliminarTransaccion(id) {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) return;

    await Database.deleteItem('transacciones', id);
    Utils.showToast('Transacción eliminada', 'success');

    App.loadModule('finanzas');
  },

  // ============================================
  // MOSTRAR SUB-TAB
  // ============================================
  mostrarSubTab(subtab) {
    const content = document.getElementById('cuentasSubTab');
    if (content) {
      if (subtab === 'cobrar') {
        content.innerHTML = this.renderCuentasPorCobrar();
      } else {
        content.innerHTML = this.renderCuentasPorPagar();
      }
    }

    // Actualizar botones activos
    document
      .querySelectorAll('.tab-btn-secondary')
      .forEach((btn) => btn.classList.remove('active'));
    event.target.closest('.tab-btn-secondary')?.classList.add('active');
  },

  // ============================================
  // RENDER CUENTAS POR PAGAR
  // ============================================
  renderCuentasPorPagar() {
    const cuentas = this.state.cuentasPorPagar
      .filter((c) => c.estado !== 'pagada')
      .sort((a, b) => b.fechaVencimiento?.localeCompare(a.fechaVencimiento || '') || 0);

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-file-invoice-dollar"></i> Cuentas por Pagar</h3>
        </div>
        <div class="card-body">
          ${
            cuentas.length === 0
              ? '<p class="text-muted">No hay cuentas por pagar pendientes</p>'
              : `
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Proveedor</th>
                    <th>Monto</th>
                    <th>Pendiente</th>
                    <th>Vencimiento</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${cuentas
                    .map(
                      (c) => `
                    <tr>
                      <td>${Utils.escapeHTML(c.proveedorNombre || 'Sin nombre')}</td>
                      <td>${Utils.formatCurrency(c.montoTotal || 0)}</td>
                      <td class="text-danger">${Utils.formatCurrency(c.montoRestante || 0)}</td>
                      <td>${c.fechaVencimiento || 'Sin fecha'}</td>
                      <td>
                        <span class="badge badge-${c.estado === 'vencida' ? 'danger' : 'warning'}">
                          ${c.estado || 'pendiente'}
                        </span>
                      </td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>
    `;
  },

  // ============================================
  // RENDER REPORTES
  // ============================================
  renderReportes() {
    const metricas = this.calcularMetricasAvanzadas();
    const { inicio, fin } = this.obtenerRangoFechas(this.state.periodo);

    return `
      <div class="reportes-container">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-file-alt"></i> Generador de Reportes</h3>
          </div>
          <div class="card-body">
            <p class="text-muted">Genera reportes financieros detallados para análisis o contabilidad.</p>
            
            <div class="reportes-grid">
              <!-- Reporte Estado de Resultados -->
              <div class="reporte-card" onclick="Finanzas.generarReporteResultados()">
                <div class="reporte-icon">
                  <i class="fas fa-chart-bar"></i>
                </div>
                <div class="reporte-info">
                  <h4>Estado de Resultados</h4>
                  <p>Ingresos, costos, gastos y ganancias del período</p>
                </div>
                <div class="reporte-action">
                  <i class="fas fa-download"></i>
                </div>
              </div>

              <!-- Reporte Flujo de Caja -->
              <div class="reporte-card" onclick="Finanzas.generarReporteFlujoCaja()">
                <div class="reporte-icon">
                  <i class="fas fa-money-bill-wave"></i>
                </div>
                <div class="reporte-info">
                  <h4>Flujo de Caja</h4>
                  <p>Movimientos de efectivo entrantes y salientes</p>
                </div>
                <div class="reporte-action">
                  <i class="fas fa-download"></i>
                </div>
              </div>

              <!-- Reporte de Ventas -->
              <div class="reporte-card" onclick="Finanzas.generarReporteVentas()">
                <div class="reporte-icon">
                  <i class="fas fa-shopping-cart"></i>
                </div>
                <div class="reporte-info">
                  <h4>Reporte de Ventas</h4>
                  <p>Detalle completo de ventas del período</p>
                </div>
                <div class="reporte-action">
                  <i class="fas fa-download"></i>
                </div>
              </div>

              <!-- Reporte de Inventario -->
              <div class="reporte-card" onclick="Finanzas.generarReporteInventario()">
                <div class="reporte-icon">
                  <i class="fas fa-boxes"></i>
                </div>
                <div class="reporte-info">
                  <h4>Valoración de Inventario</h4>
                  <p>Stock actual con valores de costo y venta</p>
                </div>
                <div class="reporte-action">
                  <i class="fas fa-download"></i>
                </div>
              </div>

              <!-- Reporte de Cuentas -->
              <div class="reporte-card" onclick="Finanzas.generarReporteCuentas()">
                <div class="reporte-icon">
                  <i class="fas fa-file-invoice-dollar"></i>
                </div>
                <div class="reporte-info">
                  <h4>Cuentas por Cobrar/Pagar</h4>
                  <p>Estado de todas las cuentas pendientes</p>
                </div>
                <div class="reporte-action">
                  <i class="fas fa-download"></i>
                </div>
              </div>

              <!-- Reporte Ejecutivo -->
              <div class="reporte-card reporte-premium" onclick="Finanzas.generarReporteEjecutivo()">
                <div class="reporte-icon">
                  <i class="fas fa-crown"></i>
                </div>
                <div class="reporte-info">
                  <h4>Reporte Ejecutivo Completo</h4>
                  <p>Resumen integral para toma de decisiones</p>
                </div>
                <div class="reporte-action">
                  <i class="fas fa-file-pdf"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Resumen del Período -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-calendar-alt"></i> Resumen del Período</h3>
            <span class="badge badge-primary">${inicio} - ${fin}</span>
          </div>
          <div class="card-body">
            <div class="resumen-periodo">
              <div class="resumen-item">
                <span class="resumen-label">Total Ingresos</span>
                <span class="resumen-value text-success">${Utils.formatCurrency(metricas.ingresos.total)}</span>
              </div>
              <div class="resumen-item">
                <span class="resumen-label">Total Gastos</span>
                <span class="resumen-value text-danger">${Utils.formatCurrency(metricas.costos.costoTotal + metricas.costos.gastosOperativos)}</span>
              </div>
              <div class="resumen-item">
                <span class="resumen-label">Ganancia Neta</span>
                <span class="resumen-value ${metricas.ganancias.neta >= 0 ? 'text-success' : 'text-danger'}">${Utils.formatCurrency(metricas.ganancias.neta)}</span>
              </div>
              <div class="resumen-item">
                <span class="resumen-label">Ventas Realizadas</span>
                <span class="resumen-value">${metricas.ventas.cantidad}</span>
              </div>
              <div class="resumen-item">
                <span class="resumen-label">Servicios/Órdenes</span>
                <span class="resumen-value">${metricas.servicios.cantidad}</span>
              </div>
              <div class="resumen-item">
                <span class="resumen-label">Compras Realizadas</span>
                <span class="resumen-value">${metricas.compras.cantidad}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ============================================
  // GENERADORES DE REPORTES
  // ============================================
  generarReporteResultados() {
    const metricas = this.calcularMetricasAvanzadas();
    const { inicio, fin } = this.obtenerRangoFechas(this.state.periodo);

    let csv = 'ESTADO DE RESULTADOS\n';
    csv += `Período: ${inicio} a ${fin}\n`;
    csv += `Generado: ${new Date().toLocaleString()}\n\n`;
    csv += 'Concepto,Monto\n';
    csv += `Ventas de Productos,${metricas.ingresos.ventas}\n`;
    csv += `Ingresos por Servicios,${metricas.ingresos.servicios}\n`;
    csv += `Otros Ingresos,${metricas.ingresos.adicionales}\n`;
    csv += `TOTAL INGRESOS,${metricas.ingresos.total}\n\n`;
    csv += `Costo de Ventas,${metricas.costos.costoVentas}\n`;
    csv += `Costo Materiales OT,${metricas.costos.costoMaterialesOT}\n`;
    csv += `GANANCIA BRUTA,${metricas.ganancias.bruta}\n`;
    csv += `Margen Bruto,${metricas.ganancias.margenBruto.toFixed(2)}%\n\n`;
    csv += `Gastos Operativos,${metricas.costos.gastosOperativos}\n`;
    csv += `GANANCIA NETA,${metricas.ganancias.neta}\n`;
    csv += `Margen Neto,${metricas.ganancias.margenNeto.toFixed(2)}%\n`;

    this.descargarArchivo(csv, `estado-resultados-${inicio}-${fin}.csv`, 'text/csv');
    Utils.showToast('Estado de Resultados generado', 'success');
  },

  generarReporteFlujoCaja() {
    const metricas = this.calcularMetricasAvanzadas();
    const { inicio, fin } = this.obtenerRangoFechas(this.state.periodo);

    let csv = 'FLUJO DE CAJA\n';
    csv += `Período: ${inicio} a ${fin}\n\n`;
    csv += 'Concepto,Monto\n';
    csv += `ENTRADAS DE EFECTIVO,\n`;
    csv += `Efectivo Recibido,${metricas.flujoCaja.efectivoRecibido}\n\n`;
    csv += `SALIDAS DE EFECTIVO,\n`;
    csv += `Efectivo Pagado,${metricas.flujoCaja.efectivoPagado}\n\n`;
    csv += `FLUJO NETO,${metricas.flujoCaja.neto}\n\n`;
    csv += `Por Cobrar,${metricas.cuentas.porCobrar}\n`;
    csv += `Por Pagar,${metricas.cuentas.porPagar}\n`;
    csv += `Balance Proyectado,${metricas.flujoCaja.neto + metricas.cuentas.porCobrar - metricas.cuentas.porPagar}\n`;

    this.descargarArchivo(csv, `flujo-caja-${inicio}-${fin}.csv`, 'text/csv');
    Utils.showToast('Flujo de Caja generado', 'success');
  },

  generarReporteVentas() {
    const { inicio, fin } = this.obtenerRangoFechas(this.state.periodo);
    const ventas = this.state.ventas.filter(
      (v) => v.fecha >= inicio && v.fecha <= fin && v.estado !== 'anulada'
    );

    let csv = 'REPORTE DE VENTAS\n';
    csv += `Período: ${inicio} a ${fin}\n\n`;
    csv += 'Fecha,Cliente,Items,Subtotal,IVA,Total,Método Pago,Estado\n';

    ventas.forEach((v) => {
      const items = v.items ? v.items.length : 0;
      csv += `${v.fecha},"${v.clienteNombre || 'Público General'}",${items},${v.subtotal || 0},${v.iva || 0},${v.total || 0},${v.metodoPago || 'efectivo'},${v.estado}\n`;
    });

    csv += `\nTOTAL VENTAS: ${ventas.length}\n`;
    csv += `MONTO TOTAL: ${ventas.reduce((sum, v) => sum + (v.total || 0), 0)}\n`;

    this.descargarArchivo(csv, `reporte-ventas-${inicio}-${fin}.csv`, 'text/csv');
    Utils.showToast('Reporte de Ventas generado', 'success');
  },

  generarReporteInventario() {
    const productos = this.state.productos.filter((p) => p.activo !== false);

    let csv = 'VALORACIÓN DE INVENTARIO\n';
    csv += `Fecha: ${new Date().toLocaleDateString()}\n\n`;
    csv +=
      'Código,Producto,Categoría,Stock,Precio Compra,Precio Venta,Valor Costo,Valor Venta,Margen\n';

    let totalCosto = 0;
    let totalVenta = 0;

    productos.forEach((p) => {
      const valorCosto = (p.precioCompra || 0) * (p.stock || 0);
      const valorVenta = (p.precioVenta || 0) * (p.stock || 0);
      const margen =
        p.precioVenta > 0 ? ((p.precioVenta - p.precioCompra) / p.precioVenta) * 100 : 0;

      totalCosto += valorCosto;
      totalVenta += valorVenta;

      csv += `${p.codigo || ''},\"${p.nombre}\",\"${p.categoria || ''}\",${p.stock || 0},${p.precioCompra || 0},${p.precioVenta || 0},${valorCosto},${valorVenta},${margen.toFixed(2)}%\n`;
    });

    csv += `\nTOTAL PRODUCTOS: ${productos.length}\n`;
    csv += `VALOR AL COSTO: ${totalCosto}\n`;
    csv += `VALOR DE VENTA: ${totalVenta}\n`;
    csv += `GANANCIA PROYECTADA: ${totalVenta - totalCosto}\n`;

    this.descargarArchivo(csv, `inventario-${Utils.getCurrentDate()}.csv`, 'text/csv');
    Utils.showToast('Valoración de Inventario generada', 'success');
  },

  generarReporteCuentas() {
    let csv = 'REPORTE DE CUENTAS POR COBRAR Y PAGAR\n';
    csv += `Fecha: ${new Date().toLocaleDateString()}\n\n`;

    // Cuentas por Cobrar
    csv += 'CUENTAS POR COBRAR\n';
    csv += 'Cliente,Monto Total,Monto Pagado,Pendiente,Vencimiento,Estado\n';

    this.state.cuentasPorCobrar
      .filter((c) => c.estado !== 'pagada')
      .forEach((c) => {
        csv += `\"${c.clienteNombre || ''}\",${c.montoTotal || 0},${c.montoPagado || 0},${c.montoRestante || 0},${c.fechaVencimiento || ''},${c.estado || ''}\n`;
      });

    csv += `\nTotal Por Cobrar: ${this.state.cuentasPorCobrar.filter((c) => c.estado !== 'pagada').reduce((sum, c) => sum + (c.montoRestante || 0), 0)}\n\n`;

    // Cuentas por Pagar
    csv += 'CUENTAS POR PAGAR\n';
    csv += 'Proveedor,Monto Total,Monto Pagado,Pendiente,Vencimiento,Estado\n';

    this.state.cuentasPorPagar
      .filter((c) => c.estado !== 'pagada')
      .forEach((c) => {
        csv += `\"${c.proveedorNombre || ''}\",${c.montoTotal || 0},${c.montoPagado || 0},${c.montoRestante || 0},${c.fechaVencimiento || ''},${c.estado || ''}\n`;
      });

    csv += `\nTotal Por Pagar: ${this.state.cuentasPorPagar.filter((c) => c.estado !== 'pagada').reduce((sum, c) => sum + (c.montoRestante || 0), 0)}\n`;

    this.descargarArchivo(csv, `cuentas-${Utils.getCurrentDate()}.csv`, 'text/csv');
    Utils.showToast('Reporte de Cuentas generado', 'success');
  },

  generarReporteEjecutivo() {
    const metricas = this.calcularMetricasAvanzadas();
    const { inicio, fin } = this.obtenerRangoFechas(this.state.periodo);

    const reporte = {
      titulo: 'Reporte Ejecutivo Financiero',
      periodo: { inicio, fin },
      generado: new Date().toISOString(),
      resumenEjecutivo: {
        ingresosTotales: metricas.ingresos.total,
        gananciaNeta: metricas.ganancias.neta,
        margenNeto: metricas.ganancias.margenNeto,
        flujoCajaNeto: metricas.flujoCaja.neto,
        roi: metricas.indicadores.roi,
      },
      detalleIngresos: metricas.ingresos,
      detalleCostos: metricas.costos,
      ganancias: metricas.ganancias,
      flujoCaja: metricas.flujoCaja,
      cuentas: {
        porCobrar: metricas.cuentas.porCobrar,
        porPagar: metricas.cuentas.porPagar,
        balance: metricas.cuentas.balance,
        vencidas: metricas.cuentas.vencidas,
      },
      indicadores: metricas.indicadores,
      inventario: metricas.inventario,
      operaciones: {
        ventasRealizadas: metricas.ventas.cantidad,
        ticketPromedio: metricas.ventas.ticketPromedio,
        serviciosRealizados: metricas.servicios.cantidad,
        comprasRealizadas: metricas.compras.cantidad,
      },
    };

    this.descargarArchivo(
      JSON.stringify(reporte, null, 2),
      `reporte-ejecutivo-${inicio}-${fin}.json`,
      'application/json'
    );
    Utils.showToast('Reporte Ejecutivo generado', 'success');
  },

  // ============================================
  // FUNCIONES DE EXPORTACIÓN
  // ============================================
  exportarExcel() {
    const metricas = this.calcularMetricasAvanzadas();
    const { inicio, fin } = this.obtenerRangoFechas(this.state.periodo);

    let csv = 'REPORTE FINANCIERO COMPLETO\n';
    csv += `Período: ${inicio} a ${fin}\n`;
    csv += `Generado: ${new Date().toLocaleString()}\n\n`;

    csv += 'RESUMEN EJECUTIVO\n';
    csv += 'Métrica,Valor\n';
    csv += `Ingresos Totales,${metricas.ingresos.total}\n`;
    csv += `Ganancia Neta,${metricas.ganancias.neta}\n`;
    csv += `Margen Neto,${metricas.ganancias.margenNeto.toFixed(2)}%\n`;
    csv += `Flujo de Caja,${metricas.flujoCaja.neto}\n`;
    csv += `ROI,${metricas.indicadores.roi.toFixed(2)}%\n\n`;

    csv += 'ESTADO DE RESULTADOS\n';
    csv += 'Concepto,Monto\n';
    csv += `Ventas,${metricas.ingresos.ventas}\n`;
    csv += `Servicios,${metricas.ingresos.servicios}\n`;
    csv += `Otros Ingresos,${metricas.ingresos.adicionales}\n`;
    csv += `Costo de Ventas,${metricas.costos.costoTotal}\n`;
    csv += `Gastos Operativos,${metricas.costos.gastosOperativos}\n`;
    csv += `Ganancia Bruta,${metricas.ganancias.bruta}\n`;
    csv += `Ganancia Neta,${metricas.ganancias.neta}\n\n`;

    csv += 'INDICADORES\n';
    csv += 'Indicador,Valor\n';
    csv += `Punto de Equilibrio,${metricas.indicadores.puntoEquilibrio}\n`;
    csv += `Razón de Liquidez,${metricas.indicadores.liquidez.toFixed(2)}\n`;
    csv += `Rotación Inventario,${metricas.indicadores.rotacionInventario.toFixed(2)}\n`;
    csv += `Ticket Promedio,${metricas.ventas.ticketPromedio}\n`;

    this.descargarArchivo(csv, `finanzas-${inicio}-${fin}.csv`, 'text/csv');
    Utils.showToast('Reporte Excel exportado', 'success');
  },

  exportarPDF() {
    // Usar la funcionalidad de impresión del navegador para generar PDF
    const metricas = this.calcularMetricasAvanzadas();
    const { inicio, fin } = this.obtenerRangoFechas(this.state.periodo);

    const ventana = window.open('', '_blank');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte Financiero - ${inicio} a ${fin}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
          h2 { color: #4f46e5; margin-top: 30px; }
          .periodo { color: #666; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #6366f1; color: white; }
          .text-success { color: #10b981; }
          .text-danger { color: #ef4444; }
          .total-row { font-weight: bold; background-color: #f0f0ff; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>📊 Reporte Financiero</h1>
        <p class="periodo">Período: ${inicio} a ${fin} | Generado: ${new Date().toLocaleString()}</p>
        
        <h2>Resumen Ejecutivo</h2>
        <table>
          <tr><th>Métrica</th><th>Valor</th></tr>
          <tr><td>Ingresos Totales</td><td class="text-success">$${metricas.ingresos.total.toFixed(2)}</td></tr>
          <tr><td>Ganancia Neta</td><td class="${metricas.ganancias.neta >= 0 ? 'text-success' : 'text-danger'}">$${metricas.ganancias.neta.toFixed(2)}</td></tr>
          <tr><td>Margen Neto</td><td>${metricas.ganancias.margenNeto.toFixed(2)}%</td></tr>
          <tr><td>Flujo de Caja</td><td class="${metricas.flujoCaja.neto >= 0 ? 'text-success' : 'text-danger'}">$${metricas.flujoCaja.neto.toFixed(2)}</td></tr>
          <tr><td>ROI</td><td>${metricas.indicadores.roi.toFixed(2)}%</td></tr>
        </table>
        
        <h2>Estado de Resultados</h2>
        <table>
          <tr><th>Concepto</th><th>Monto</th></tr>
          <tr><td>Ventas de Productos</td><td class="text-success">+$${metricas.ingresos.ventas.toFixed(2)}</td></tr>
          <tr><td>Ingresos por Servicios</td><td class="text-success">+$${metricas.ingresos.servicios.toFixed(2)}</td></tr>
          <tr><td>Otros Ingresos</td><td class="text-success">+$${metricas.ingresos.adicionales.toFixed(2)}</td></tr>
          <tr class="total-row"><td>TOTAL INGRESOS</td><td>$${metricas.ingresos.total.toFixed(2)}</td></tr>
          <tr><td>Costo de Ventas</td><td class="text-danger">-$${metricas.costos.costoTotal.toFixed(2)}</td></tr>
          <tr class="total-row"><td>GANANCIA BRUTA</td><td>$${metricas.ganancias.bruta.toFixed(2)} (${metricas.ganancias.margenBruto.toFixed(1)}%)</td></tr>
          <tr><td>Gastos Operativos</td><td class="text-danger">-$${metricas.costos.gastosOperativos.toFixed(2)}</td></tr>
          <tr class="total-row"><td>GANANCIA NETA</td><td class="${metricas.ganancias.neta >= 0 ? 'text-success' : 'text-danger'}">$${metricas.ganancias.neta.toFixed(2)} (${metricas.ganancias.margenNeto.toFixed(1)}%)</td></tr>
        </table>
        
        <h2>Indicadores Clave</h2>
        <table>
          <tr><th>Indicador</th><th>Valor</th><th>Estado</th></tr>
          <tr><td>Punto de Equilibrio</td><td>$${metricas.indicadores.puntoEquilibrio.toFixed(2)}</td><td>${metricas.ingresos.total >= metricas.indicadores.puntoEquilibrio ? '✅ Alcanzado' : '⚠️ No alcanzado'}</td></tr>
          <tr><td>Razón de Liquidez</td><td>${metricas.indicadores.liquidez.toFixed(2)}</td><td>${metricas.indicadores.liquidez >= 1 ? '✅ Saludable' : '⚠️ Atención'}</td></tr>
          <tr><td>Ticket Promedio</td><td>$${metricas.ventas.ticketPromedio.toFixed(2)}</td><td>-</td></tr>
          <tr><td>Ventas Realizadas</td><td>${metricas.ventas.cantidad}</td><td>-</td></tr>
        </table>
        
        <script>window.print();</script>
      </body>
      </html>
    `);
  },

  exportarJSON() {
    const metricas = this.calcularMetricasAvanzadas();
    const { inicio, fin } = this.obtenerRangoFechas(this.state.periodo);

    const reporte = {
      fecha: new Date().toISOString(),
      periodo: { inicio, fin, tipo: this.state.periodo },
      metricas: metricas,
      resumen: {
        ingresosTotal: metricas.ingresos.total,
        gananciaNeta: metricas.ganancias.neta,
        margenNeto: metricas.ganancias.margenNeto,
        flujoCaja: metricas.flujoCaja.neto,
        roi: metricas.indicadores.roi,
      },
    };

    this.descargarArchivo(
      JSON.stringify(reporte, null, 2),
      `finanzas-${this.state.periodo}-${Utils.getCurrentDate()}.json`,
      'application/json'
    );
    Utils.showToast('Reporte JSON exportado', 'success');
  },

  // ============================================
  // DESCARGAR ARCHIVO
  // ============================================
  descargarArchivo(contenido, nombreArchivo, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  },

  // ============================================
  // MOSTRAR AYUDA MEJORADA
  // ============================================
  mostrarAyuda() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalAyudaFinanzas';
    modal.innerHTML = `
      <div class="modal-container modal-large">
        <div class="modal-header">
          <h3><i class="fas fa-question-circle"></i> Guía del Centro Financiero</h3>
          <button class="btn-close" onclick="document.getElementById('modalAyudaFinanzas').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="ayuda-financiera ayuda-tabs">
            <div class="ayuda-nav">
              <button class="ayuda-tab active" onclick="Finanzas.mostrarAyudaSeccion('conceptos', this)">
                <i class="fas fa-book"></i> Conceptos
              </button>
              <button class="ayuda-tab" onclick="Finanzas.mostrarAyudaSeccion('indicadores', this)">
                <i class="fas fa-chart-pie"></i> Indicadores
              </button>
              <button class="ayuda-tab" onclick="Finanzas.mostrarAyudaSeccion('consejos', this)">
                <i class="fas fa-lightbulb"></i> Consejos
              </button>
            </div>
            
            <div id="ayudaContenido" class="ayuda-contenido">
              <div class="ayuda-seccion">
                <h4><i class="fas fa-chart-line text-success"></i> Ganancia Bruta</h4>
                <p><strong>Fórmula:</strong> Ingresos por Ventas - Costo de Productos Vendidos</p>
                <p>Es lo que ganas después de descontar únicamente el costo directo de los productos. No incluye gastos de operación como alquiler, luz, salarios, etc.</p>

                <h4><i class="fas fa-dollar-sign text-primary"></i> Ganancia Neta</h4>
                <p><strong>Fórmula:</strong> Ganancia Bruta - Gastos Operativos</p>
                <p>La ganancia real después de TODOS los gastos. Este es el dinero que realmente te queda en el bolsillo.</p>

                <h4><i class="fas fa-money-bill-wave text-info"></i> Flujo de Caja</h4>
                <p><strong>Fórmula:</strong> Efectivo Recibido - Efectivo Pagado</p>
                <p>Mide el dinero físico que entra y sale de tu negocio. Es diferente a la ganancia porque no incluye ventas a crédito sin cobrar ni deudas sin pagar.</p>

                <h4><i class="fas fa-sync-alt text-warning"></i> Rotación de Inventario</h4>
                <p>Indica cuántas veces al año vendes completamente tu inventario. Una rotación alta significa que tus productos se venden rápido.</p>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="document.getElementById('modalAyudaFinanzas').remove()">
            Entendido
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  mostrarAyudaSeccion(seccion, btn) {
    document.querySelectorAll('.ayuda-tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');

    const contenido = document.getElementById('ayudaContenido');

    const secciones = {
      conceptos: `
        <div class="ayuda-seccion">
          <h4><i class="fas fa-chart-line text-success"></i> Ganancia Bruta</h4>
          <p><strong>Fórmula:</strong> Ingresos por Ventas - Costo de Productos Vendidos</p>
          <p>Es lo que ganas después de descontar únicamente el costo directo de los productos.</p>

          <h4><i class="fas fa-dollar-sign text-primary"></i> Ganancia Neta</h4>
          <p><strong>Fórmula:</strong> Ganancia Bruta - Gastos Operativos</p>
          <p>La ganancia real después de TODOS los gastos.</p>

          <h4><i class="fas fa-money-bill-wave text-info"></i> Flujo de Caja</h4>
          <p><strong>Fórmula:</strong> Efectivo Recibido - Efectivo Pagado</p>
          <p>Mide el dinero físico que entra y sale de tu negocio.</p>
        </div>
      `,
      indicadores: `
        <div class="ayuda-seccion">
          <h4><i class="fas fa-percentage text-primary"></i> ROI (Retorno de Inversión)</h4>
          <p><strong>Fórmula:</strong> (Ganancia Neta / Inversión) × 100</p>
          <p>Un ROI del 50% significa que por cada $1 invertido, ganaste $0.50 adicional.</p>

          <h4><i class="fas fa-crosshairs text-warning"></i> Punto de Equilibrio</h4>
          <p>Es el monto de ventas que necesitas para no ganar ni perder. Ventas por encima de este punto son ganancia pura.</p>

          <h4><i class="fas fa-tint text-info"></i> Razón de Liquidez</h4>
          <p><strong>Fórmula:</strong> Cuentas por Cobrar / Cuentas por Pagar</p>
          <p>Mayor a 1 = Buena capacidad de pago. Menor a 1 = Posibles problemas de liquidez.</p>
        </div>
      `,
      consejos: `
        <div class="ayuda-seccion">
          <h4><i class="fas fa-lightbulb text-warning"></i> Mejores Prácticas</h4>
          <ul class="consejos-lista">
            <li><strong>Margen objetivo:</strong> Mantén un margen de ganancia neta superior al 15%</li>
            <li><strong>Flujo de caja:</strong> Vigila constantemente que sea positivo</li>
            <li><strong>Cobros:</strong> Cobra rápido tus cuentas por cobrar para mantener liquidez</li>
            <li><strong>Stock:</strong> No acumules inventario innecesario, capital estancado</li>
            <li><strong>Gastos:</strong> Revisa mensualmente todos tus gastos operativos</li>
            <li><strong>Precios:</strong> Si tu margen es bajo, considera ajustar precios</li>
            <li><strong>Rotación:</strong> Promociona productos con baja rotación</li>
          </ul>
        </div>
      `,
    };

    contenido.innerHTML = secciones[seccion] || secciones.conceptos;
  },
};
