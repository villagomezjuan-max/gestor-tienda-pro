// ============================================
// MÓDULO: SISTEMA FINANCIERO MEJORADO
// ============================================
// Sistema de análisis financiero preciso y completo
// Corrige errores de cálculo y sincroniza todos los módulos

window.FinanzasMejorado = {
  // ============================================
  // CALCULAR MÉTRICAS FINANCIERAS PRECISAS
  // ============================================
  calcularMetricasCompletas(periodo = 'mes') {
    const { inicio, fin } = this.obtenerRangoFechas(periodo);

    // Obtener todas las colecciones necesarias
    const ventas = (Database.getCollection('ventas') || []).filter(
      (v) => v.fecha >= inicio && v.fecha <= fin && v.estado !== 'anulada'
    );
    const compras = (Database.getCollection('compras') || []).filter(
      (c) => c.fecha >= inicio && c.fecha <= fin
    );
    const transacciones = (Database.getCollection('transacciones') || []).filter(
      (t) => t.fecha >= inicio && t.fecha <= fin
    );
    const cuentasPorCobrar = Database.getCollection('cuentasPorCobrar') || [];
    const cuentasPorPagar = Database.getCollection('cuentasPorPagar') || [];

    // 1. CALCULAR INGRESOS (Ventas + Ingresos adicionales de contabilidad)
    const ingresosVentas = ventas.reduce((sum, v) => sum + (v.total || 0), 0);
    const ingresosAdicionales = transacciones
      .filter((t) => t.tipo === 'ingreso')
      .reduce((sum, t) => sum + (t.monto || 0), 0);
    const totalIngresos = ingresosVentas + ingresosAdicionales;

    // 2. CALCULAR COSTO DE VENTAS (COGS - Cost of Goods Sold)
    // Este es el costo REAL de los productos que se vendieron
    let costoVentas = 0;
    ventas.forEach((venta) => {
      if (venta.items && Array.isArray(venta.items)) {
        venta.items.forEach((item) => {
          // FIX: Usar el costo histórico guardado en el item de la venta.
          // Si no existe, se omite para no usar datos imprecisos.
          if (item.precioCompra && item.cantidad) {
            costoVentas += item.precioCompra * item.cantidad;
          }
        });
      }
    });

    // 3. CALCULAR GANANCIA BRUTA
    // Ganancia Bruta = Ingresos por Ventas - Costo de Ventas
    const gananciaBruta = ingresosVentas - costoVentas;
    const margenBruto = ingresosVentas > 0 ? (gananciaBruta / ingresosVentas) * 100 : 0;

    // 4. CALCULAR GASTOS OPERATIVOS
    // Total de compras del período (inversión en inventario)
    const totalCompras = compras.reduce((sum, c) => sum + (c.total || 0), 0);
    // Gastos adicionales registrados en contabilidad
    const gastosOperativos = transacciones
      .filter((t) => t.tipo === 'gasto')
      .reduce((sum, t) => sum + (t.monto || 0), 0);
    const totalGastos = gastosOperativos; // No incluimos compras aquí porque son inversión

    // 5. CALCULAR GANANCIA NETA
    // Ganancia Neta = Ganancia Bruta - Gastos Operativos
    const gananciaNeta = gananciaBruta - gastosOperativos;
    const margenNeto = ingresosVentas > 0 ? (gananciaNeta / ingresosVentas) * 100 : 0;

    // 6. FLUJO DE CAJA
    // Dinero que realmente entró y salió
    const efectivoRecibido = ventas
      .filter((v) => v.metodoPago !== 'credito')
      .reduce((sum, v) => sum + (v.total || 0), 0);
    const efectivoPagado =
      compras.reduce((sum, c) => sum + (c.montoPagado || 0), 0) + gastosOperativos;
    const flujoCaja = efectivoRecibido - efectivoPagado;

    // 7. CUENTAS POR COBRAR Y PAGAR
    const totalPorCobrar = cuentasPorCobrar
      .filter((c) => c.estado !== 'pagada')
      .reduce((sum, c) => sum + (c.montoRestante || 0), 0);
    const totalPorPagar = cuentasPorPagar
      .filter((c) => c.estado !== 'pagada')
      .reduce((sum, c) => sum + (c.montoRestante || 0), 0);

    // Cuentas vencidas
    const cuentasVencidas = [...cuentasPorCobrar, ...cuentasPorPagar].filter(
      (c) => c.estado === 'vencida'
    );
    const montoVencido = cuentasVencidas.reduce((sum, c) => sum + (c.montoRestante || 0), 0);

    // 8. ROI (Retorno de Inversión)
    // ROI = (Ganancia Neta / Inversión) × 100
    const inversion = totalCompras;
    const roi = inversion > 0 ? (gananciaNeta / inversion) * 100 : 0;

    // 9. PUNTO DE EQUILIBRIO
    // Cuánto necesitamos vender para cubrir gastos
    const costosFijos = gastosOperativos;
    const margenContribucion = margenBruto / 100;
    const puntoEquilibrio = margenContribucion > 0 ? costosFijos / margenContribucion : 0;

    // 10. INVENTARIO
    const productos = Database.getCollection('productos') || [];
    const valorInventario = productos.reduce(
      (sum, p) => sum + (p.precioCompra || 0) * (p.stock || 0),
      0
    );
    const valorInventarioVenta = productos.reduce(
      (sum, p) => sum + (p.precioVenta || 0) * (p.stock || 0),
      0
    );

    return {
      periodo: periodo,
      rangoFechas: { inicio, fin },

      // Ingresos
      ingresos: {
        ventas: ingresosVentas,
        adicionales: ingresosAdicionales,
        total: totalIngresos,
      },

      // Costos y Gastos
      costos: {
        costoVentas: costoVentas,
        gastosOperativos: gastosOperativos,
        totalGastos: totalGastos,
      },

      // Ganancias
      ganancias: {
        bruta: gananciaBruta,
        margenBruto: margenBruto,
        neta: gananciaNeta,
        margenNeto: margenNeto,
      },

      // Compras e Inversión
      compras: {
        total: totalCompras,
        cantidad: compras.length,
      },

      // Flujo de Caja
      flujoCaja: {
        efectivoRecibido: efectivoRecibido,
        efectivoPagado: efectivoPagado,
        neto: flujoCaja,
      },

      // Cuentas por Cobrar/Pagar
      cuentas: {
        porCobrar: totalPorCobrar,
        porPagar: totalPorPagar,
        balance: totalPorCobrar - totalPorPagar,
        vencidas: cuentasVencidas.length,
        montoVencido: montoVencido,
      },

      // Indicadores
      indicadores: {
        roi: roi,
        puntoEquilibrio: puntoEquilibrio,
        razonLiquidez: totalPorPagar > 0 ? totalPorCobrar / totalPorPagar : 0,
      },

      // Inventario
      inventario: {
        valorCosto: valorInventario,
        valorVenta: valorInventarioVenta,
        gananciaProyectada: valorInventarioVenta - valorInventario,
      },

      // Ventas
      ventas: {
        cantidad: ventas.length,
        total: ingresosVentas,
        ticketPromedio: ventas.length > 0 ? ingresosVentas / ventas.length : 0,
      },
    };
  },

  // ============================================
  // OBTENER RANGO DE FECHAS SEGÚN PERÍODO
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
  // RENDERIZAR DASHBOARD FINANCIERO MEJORADO
  // ============================================
  render(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-chart-line"></i> Análisis Financiero Completo</h2>
        <div class="header-actions">
          <button class="btn btn-secondary" onclick="FinanzasMejorado.exportarReporte()">
            <i class="fas fa-file-excel"></i> Exportar
          </button>
          <button class="btn btn-primary" onclick="FinanzasMejorado.mostrarAyuda()">
            <i class="fas fa-question-circle"></i> Ayuda
          </button>
        </div>
      </div>

      <!-- Selector de Período -->
      <div class="periodo-selector">
        <button class="btn ${this.periodoActual === 'hoy' ? 'btn-primary' : 'btn-secondary'}" 
                onclick="FinanzasMejorado.cambiarPeriodo('hoy')">Hoy</button>
        <button class="btn ${this.periodoActual === 'semana' ? 'btn-primary' : 'btn-secondary'}" 
                onclick="FinanzasMejorado.cambiarPeriodo('semana')">Semana</button>
        <button class="btn ${this.periodoActual === 'mes' ? 'btn-primary' : 'btn-secondary'}" 
                onclick="FinanzasMejorado.cambiarPeriodo('mes')">Mes</button>
        <button class="btn ${this.periodoActual === 'anio' ? 'btn-primary' : 'btn-secondary'}" 
                onclick="FinanzasMejorado.cambiarPeriodo('anio')">Año</button>
      </div>

      <div id="contenidoFinanzas">
        ${this.renderizarContenido()}
      </div>
    `;
  },

  periodoActual: 'mes',

  cambiarPeriodo(periodo) {
    this.periodoActual = periodo;
    // NOTA: Recarga el módulo completo porque cambia todo el período de datos
    App.loadModule('finanzas-mejorado');
  },

  // ============================================
  // RENDERIZAR CONTENIDO FINANCIERO
  // ============================================
  renderizarContenido() {
    const metricas = this.calcularMetricasCompletas(this.periodoActual);

    return `
      <!-- Métricas Principales -->
      <div class="stats-grid stats-grid-4">
        <!-- Ingresos Totales -->
        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--success-light);">
            <i class="fas fa-dollar-sign" style="color: var(--success-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${Utils.formatCurrency(metricas.ingresos.total)}</h3>
            <p>Ingresos Totales</p>
            <small>Ventas: ${Utils.formatCurrency(metricas.ingresos.ventas)}</small>
          </div>
        </div>

        <!-- Ganancia Neta -->
        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--primary-light);">
            <i class="fas fa-chart-line" style="color: var(--primary-color);"></i>
          </div>
          <div class="stat-info">
            <h3 class="${metricas.ganancias.neta >= 0 ? 'text-success' : 'text-danger'}">
              ${Utils.formatCurrency(metricas.ganancias.neta)}
            </h3>
            <p>Ganancia Neta</p>
            <small>Margen: ${metricas.ganancias.margenNeto.toFixed(2)}%</small>
          </div>
        </div>

        <!-- Flujo de Caja -->
        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--info-light);">
            <i class="fas fa-money-bill-wave" style="color: var(--info-color);"></i>
          </div>
          <div class="stat-info">
            <h3 class="${metricas.flujoCaja.neto >= 0 ? 'text-success' : 'text-danger'}">
              ${Utils.formatCurrency(metricas.flujoCaja.neto)}
            </h3>
            <p>Flujo de Caja</p>
            <small>Efectivo neto</small>
          </div>
        </div>

        <!-- Balance Cuentas -->
        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--warning-light);">
            <i class="fas fa-balance-scale" style="color: var(--warning-color);"></i>
          </div>
          <div class="stat-info">
            <h3 class="${metricas.cuentas.balance >= 0 ? 'text-success' : 'text-danger'}">
              ${Utils.formatCurrency(metricas.cuentas.balance)}
            </h3>
            <p>Balance</p>
            <small>Cobrar - Pagar</small>
          </div>
        </div>
      </div>

      <!-- Desglose de Ganancias -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-calculator"></i> Desglose de Ganancias</h3>
        </div>
        <div class="card-body">
          <div class="financial-breakdown">
            <div class="breakdown-row">
              <span class="breakdown-label">Ingresos por Ventas</span>
              <span class="breakdown-value text-success">${Utils.formatCurrency(metricas.ingresos.ventas)}</span>
            </div>
            <div class="breakdown-row">
              <span class="breakdown-label">- Costo de Productos Vendidos</span>
              <span class="breakdown-value text-danger">${Utils.formatCurrency(metricas.costos.costoVentas)}</span>
            </div>
            <div class="breakdown-row breakdown-subtotal">
              <span class="breakdown-label">= Ganancia Bruta</span>
              <span class="breakdown-value">
                ${Utils.formatCurrency(metricas.ganancias.bruta)} 
                <small>(${metricas.ganancias.margenBruto.toFixed(2)}%)</small>
              </span>
            </div>
            <div class="breakdown-row">
              <span class="breakdown-label">- Gastos Operativos</span>
              <span class="breakdown-value text-danger">${Utils.formatCurrency(metricas.costos.gastosOperativos)}</span>
            </div>
            <div class="breakdown-row breakdown-total">
              <span class="breakdown-label">= Ganancia Neta</span>
              <span class="breakdown-value ${metricas.ganancias.neta >= 0 ? 'text-success' : 'text-danger'}">
                ${Utils.formatCurrency(metricas.ganancias.neta)} 
                <small>(${metricas.ganancias.margenNeto.toFixed(2)}%)</small>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Indicadores Financieros -->
      <div class="stats-grid stats-grid-3">
        <!-- ROI -->
        <div class="card">
          <div class="card-header">
            <h4><i class="fas fa-percentage"></i> ROI</h4>
          </div>
          <div class="card-body text-center">
            <h2 class="${metricas.indicadores.roi >= 0 ? 'text-success' : 'text-danger'}">
              ${metricas.indicadores.roi.toFixed(2)}%
            </h2>
            <p>Retorno de Inversión</p>
            <small class="text-muted">
              ${
                metricas.indicadores.roi >= 0
                  ? `Por cada $1 invertido, ganas $${(1 + metricas.indicadores.roi / 100).toFixed(2)}`
                  : 'Inversión sin retorno en este período'
              }
            </small>
          </div>
        </div>

        <!-- Punto de Equilibrio -->
        <div class="card">
          <div class="card-header">
            <h4><i class="fas fa-crosshairs"></i> Punto de Equilibrio</h4>
          </div>
          <div class="card-body text-center">
            <h2>${Utils.formatCurrency(metricas.indicadores.puntoEquilibrio)}</h2>
            <p>Ventas Necesarias</p>
            <small class="text-muted">
              Para cubrir gastos fijos
            </small>
          </div>
        </div>

        <!-- Razón de Liquidez -->
        <div class="card">
          <div class="card-header">
            <h4><i class="fas fa-tint"></i> Liquidez</h4>
          </div>
          <div class="card-body text-center">
            <h2 class="${metricas.indicadores.razonLiquidez >= 1 ? 'text-success' : 'text-warning'}">
              ${metricas.indicadores.razonLiquidez.toFixed(2)}
            </h2>
            <p>Razón de Liquidez</p>
            <small class="text-muted">
              ${metricas.indicadores.razonLiquidez >= 1 ? 'Buena capacidad de pago' : 'Liquidez limitada'}
            </small>
          </div>
        </div>
      </div>

      <!-- Inventario -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-boxes"></i> Análisis de Inventario</h3>
        </div>
        <div class="card-body">
          <div class="stats-grid stats-grid-3">
            <div class="stat-mini">
              <label>Valor de Costo</label>
              <strong>${Utils.formatCurrency(metricas.inventario.valorCosto)}</strong>
            </div>
            <div class="stat-mini">
              <label>Valor de Venta</label>
              <strong>${Utils.formatCurrency(metricas.inventario.valorVenta)}</strong>
            </div>
            <div class="stat-mini">
              <label>Ganancia Proyectada</label>
              <strong class="text-success">${Utils.formatCurrency(metricas.inventario.gananciaProyectada)}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Cuentas por Cobrar y Pagar -->
      <div class="stats-grid stats-grid-2">
        <!-- Por Cobrar -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-hand-holding-usd"></i> Por Cobrar</h3>
          </div>
          <div class="card-body">
            <h2 class="text-success">${Utils.formatCurrency(metricas.cuentas.porCobrar)}</h2>
            <p>Total pendiente de cobro</p>
            ${
              metricas.cuentas.vencidas > 0
                ? `
              <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                ${metricas.cuentas.vencidas} cuenta(s) vencida(s)
              </div>
            `
                : ''
            }
          </div>
        </div>

        <!-- Por Pagar -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-hand-holding-usd"></i> Por Pagar</h3>
          </div>
          <div class="card-body">
            <h2 class="text-danger">${Utils.formatCurrency(metricas.cuentas.porPagar)}</h2>
            <p>Total pendiente de pago</p>
            ${
              metricas.cuentas.montoVencido > 0
                ? `
              <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                ${Utils.formatCurrency(metricas.cuentas.montoVencido)} vencido
              </div>
            `
                : ''
            }
          </div>
        </div>
      </div>

      <!-- Alertas y Recomendaciones -->
      ${this.renderizarAlertas(metricas)}
    `;
  },

  // ============================================
  // RENDERIZAR ALERTAS Y RECOMENDACIONES
  // ============================================
  renderizarAlertas(metricas) {
    const alertas = [];

    // Alerta: Ganancia negativa
    if (metricas.ganancias.neta < 0) {
      alertas.push({
        tipo: 'danger',
        icono: 'fa-exclamation-circle',
        titulo: 'Ganancia Negativa',
        mensaje: `Estás perdiendo dinero. Revisa tus precios y reduce gastos operativos.`,
      });
    }

    // Alerta: Margen bajo
    if (metricas.ganancias.margenNeto < 10 && metricas.ganancias.margenNeto >= 0) {
      alertas.push({
        tipo: 'warning',
        icono: 'fa-exclamation-triangle',
        titulo: 'Margen de Ganancia Bajo',
        mensaje: `Tu margen neto es ${metricas.ganancias.margenNeto.toFixed(2)}%. Considera aumentar precios o reducir costos.`,
      });
    }

    // Alerta: Flujo de caja negativo
    if (metricas.flujoCaja.neto < 0) {
      alertas.push({
        tipo: 'warning',
        icono: 'fa-money-bill-wave',
        titulo: 'Flujo de Caja Negativo',
        mensaje: 'Estás gastando más efectivo del que recibes. Revisa tus pagos y cobros.',
      });
    }

    // Alerta: Cuentas vencidas
    if (metricas.cuentas.vencidas > 0) {
      alertas.push({
        tipo: 'warning',
        icono: 'fa-clock',
        titulo: 'Cuentas Vencidas',
        mensaje: `Tienes ${metricas.cuentas.vencidas} cuenta(s) vencida(s). Gestiona tus cobros y pagos.`,
      });
    }

    // Alerta: Por debajo del punto de equilibrio
    if (metricas.ingresos.ventas < metricas.indicadores.puntoEquilibrio) {
      alertas.push({
        tipo: 'info',
        icono: 'fa-chart-line',
        titulo: 'Por Debajo del Punto de Equilibrio',
        mensaje: `Necesitas vender ${Utils.formatCurrency(metricas.indicadores.puntoEquilibrio - metricas.ingresos.ventas)} más para cubrir todos tus gastos.`,
      });
    }

    // Mensaje positivo
    if (alertas.length === 0) {
      alertas.push({
        tipo: 'success',
        icono: 'fa-check-circle',
        titulo: '¡Excelente!',
        mensaje: 'Tu negocio está en buen estado financiero. Continúa así.',
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
  // EXPORTAR REPORTE FINANCIERO
  // ============================================
  exportarReporte() {
    const metricas = this.calcularMetricasCompletas(this.periodoActual);

    const reporte = {
      fecha: new Date().toISOString(),
      periodo: this.periodoActual,
      rango: metricas.rangoFechas,
      metricas: metricas,
      resumen: {
        ingresosTotal: metricas.ingresos.total,
        gananciaNeta: metricas.ganancias.neta,
        margenNeto: metricas.ganancias.margenNeto,
        flujoCaja: metricas.flujoCaja.neto,
        roi: metricas.indicadores.roi,
      },
    };

    const dataStr = JSON.stringify(reporte, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-financiero-${this.periodoActual}-${Utils.getCurrentDate()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    Utils.showToast('Reporte exportado exitosamente', 'success');
  },

  // ============================================
  // MOSTRAR AYUDA FINANCIERA
  // ============================================
  mostrarAyuda() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalAyudaFinanciera';
    modal.innerHTML = `
      <div class="modal-container modal-large">
        <div class="modal-header">
          <h3><i class="fas fa-question-circle"></i> Guía de Indicadores Financieros</h3>
          <button class="btn-close" onclick="document.getElementById('modalAyudaFinanciera').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="ayuda-financiera">
            <h4><i class="fas fa-chart-line"></i> Ganancia Bruta</h4>
            <p><strong>Fórmula:</strong> Ingresos por Ventas - Costo de Productos Vendidos</p>
            <p>Indica cuánto ganas después de descontar el costo directo de los productos vendidos.</p>

            <h4><i class="fas fa-dollar-sign"></i> Ganancia Neta</h4>
            <p><strong>Fórmula:</strong> Ganancia Bruta - Gastos Operativos</p>
            <p>La ganancia real después de todos los gastos. Este es el dinero que realmente ganas.</p>

            <h4><i class="fas fa-percentage"></i> Margen de Ganancia</h4>
            <p><strong>Fórmula:</strong> (Ganancia / Ventas) × 100</p>
            <p>Porcentaje de cada venta que es ganancia. Un margen del 20% significa que de cada $100 vendidos, $20 son ganancia.</p>

            <h4><i class="fas fa-money-bill-wave"></i> Flujo de Caja</h4>
            <p><strong>Fórmula:</strong> Efectivo Recibido - Efectivo Pagado</p>
            <p>El dinero real que entra y sale. No incluye ventas a crédito que aún no se han cobrado.</p>

            <h4><i class="fas fa-chart-bar"></i> ROI (Retorno de Inversión)</h4>
            <p><strong>Fórmula:</strong> (Ganancia Neta / Inversión) × 100</p>
            <p>Mide la eficiencia de tu inversión. Un ROI del 50% significa que por cada $1 invertido, ganaste $0.50.</p>

            <h4><i class="fas fa-crosshairs"></i> Punto de Equilibrio</h4>
            <p><strong>Fórmula:</strong> Gastos Fijos / (Margen de Ganancia Bruta)</p>
            <p>La cantidad de ventas que necesitas para cubrir todos tus gastos sin ganar ni perder.</p>

            <h4><i class="fas fa-tint"></i> Razón de Liquidez</h4>
            <p><strong>Fórmula:</strong> Cuentas por Cobrar / Cuentas por Pagar</p>
            <p>Mide tu capacidad de pago. Un valor mayor a 1 indica buena liquidez.</p>

            <h4><i class="fas fa-lightbulb"></i> Consejos</h4>
            <ul>
              <li>Mantén un margen de ganancia neta superior al 15%</li>
              <li>Vigila constantemente tu flujo de caja</li>
              <li>Cobra a tiempo tus cuentas por cobrar</li>
              <li>Reduce gastos operativos innecesarios</li>
              <li>Ajusta precios si tu margen es muy bajo</li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="document.getElementById('modalAyudaFinanciera').remove()">
            Entendido
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },
};
