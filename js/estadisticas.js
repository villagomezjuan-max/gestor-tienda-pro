// ============================================
// MÓDULO: ESTADÍSTICAS Y REPORTES
// ============================================
// Análisis completo del negocio

window.Estadisticas = {
  async render(container) {
    const stats = await this.calcularEstadisticas();

    container.innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-chart-line"></i> Estadísticas y Reportes</h2>
        <button class="btn btn-primary" onclick="Estadisticas.exportarReporte()">
          <i class="fas fa-download"></i> Exportar Reporte
        </button>
      </div>

      <!-- Filtros de Período -->
      <div class="periodo-selector">
        <button class="btn ${this.periodo === 'hoy' ? 'btn-primary' : 'btn-secondary'}" onclick="Estadisticas.cambiarPeriodo('hoy')">Hoy</button>
        <button class="btn ${this.periodo === 'semana' ? 'btn-primary' : 'btn-secondary'}" onclick="Estadisticas.cambiarPeriodo('semana')">Semana</button>
        <button class="btn ${this.periodo === 'mes' ? 'btn-primary' : 'btn-secondary'}" onclick="Estadisticas.cambiarPeriodo('mes')">Mes</button>
        <button class="btn ${this.periodo === 'anio' ? 'btn-primary' : 'btn-secondary'}" onclick="Estadisticas.cambiarPeriodo('anio')">Año</button>
      </div>

      <!-- KPIs Principales -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--success-light);">
            <i class="fas fa-dollar-sign" style="color: var(--success-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${Utils.formatCurrency(stats.ventas.total)}</h3>
            <p>Total Ventas</p>
            <small>${stats.ventas.cantidad} transacciones</small>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--primary-light);">
            <i class="fas fa-shopping-cart" style="color: var(--primary-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${Utils.formatCurrency(stats.compras.total)}</h3>
            <p>Total Compras</p>
            <small>${stats.compras.cantidad} transacciones</small>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--warning-light);">
            <i class="fas fa-chart-line" style="color: var(--warning-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${Utils.formatCurrency(stats.ganancias)}</h3>
            <p>Ganancia Bruta</p>
            <small>${stats.margen.toFixed(1)}% margen</small>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--info-light);">
            <i class="fas fa-receipt" style="color: var(--info-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${Utils.formatCurrency(stats.ventas.ticketPromedio)}</h3>
            <p>Ticket Promedio</p>
            <small>Por venta</small>
          </div>
        </div>
      </div>

      <!-- Productos Más Vendidos -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-trophy"></i> Top 10 Productos Más Vendidos</h3>
        </div>
        <div class="card-body">
          ${this.renderTopProductos(stats.topProductos)}
        </div>
      </div>

      <!-- Clientes Top -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-star"></i> Top 10 Mejores Clientes</h3>
        </div>
        <div class="card-body">
          ${this.renderTopClientes(stats.topClientes)}
        </div>
      </div>

      <!-- Stock Crítico -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-exclamation-triangle"></i> Productos con Stock Crítico</h3>
        </div>
        <div class="card-body">
          ${this.renderStockCritico(stats.stockCritico)}
        </div>
      </div>

      <!-- Métodos de Pago -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-credit-card"></i> Ventas por Método de Pago</h3>
        </div>
        <div class="card-body">
          ${this.renderMetodosPago(stats.metodosPago)}
        </div>
      </div>
    `;
  },

  periodo: 'mes',

  cambiarPeriodo(periodo) {
    this.periodo = periodo;
    // NOTA: Recarga el módulo completo porque cambia todo el período de datos
    App.loadModule('estadisticas');
  },

  async calcularEstadisticas() {
    const { inicio, fin } = this.obtenerRangoFechas();

    // Obtener datos
    const ventas = (await Database.getCollection('ventas')).filter(
      (v) => v.fecha >= inicio && v.fecha <= fin && v.estado !== 'anulada'
    );

    const compras = (await Database.getCollection('compras')).filter(
      (c) => c.fecha >= inicio && c.fecha <= fin
    );

    const productos = await Database.getCollection('productos');
    const clientes = await Database.getCollection('clientes');

    // Calcular ventas
    const totalVentas = ventas.reduce((sum, v) => sum + v.total, 0);
    const cantidadVentas = ventas.length;
    const ticketPromedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

    // Calcular compras
    const totalCompras = compras.reduce((sum, c) => sum + c.total, 0);

    // Calcular ganancias CORRECTAMENTE
    // Ganancia = Ingresos - Costo de Productos Vendidos (no el total de compras)
    let costoProductosVendidos = 0;
    ventas.forEach((venta) => {
      if (venta.items && Array.isArray(venta.items)) {
        venta.items.forEach((item) => {
          const producto = Database.getItem('productos', item.productoId);
          if (producto && producto.precioCompra) {
            costoProductosVendidos += producto.precioCompra * item.cantidad;
          }
        });
      }
    });

    const ganancias = totalVentas - costoProductosVendidos;
    const margen = totalVentas > 0 ? (ganancias / totalVentas) * 100 : 0;

    // Top productos vendidos
    const productosVendidos = {};
    ventas.forEach((venta) => {
      venta.items.forEach((item) => {
        if (!item?.productoId) {
          return;
        }
        if (!productosVendidos[item.productoId]) {
          productosVendidos[item.productoId] = {
            id: item.productoId,
            nombre: item.nombre,
            cantidad: 0,
            total: 0,
          };
        }
        productosVendidos[item.productoId].cantidad += item.cantidad;
        productosVendidos[item.productoId].total += item.subtotal;
      });
    });

    const topProductos = Object.values(productosVendidos)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    // Top clientes
    const topClientes = clientes
      .filter((c) => c.totalComprado > 0)
      .sort((a, b) => b.totalComprado - a.totalComprado)
      .slice(0, 10);

    // Stock crítico
    const stockCritico = productos.filter((p) => p.stock <= p.stockMinimo);

    // Métodos de pago
    const metodosPago = {};
    ventas.forEach((v) => {
      const metodo = v.metodoPago || 'efectivo';
      if (!metodosPago[metodo]) {
        metodosPago[metodo] = { monto: 0, cantidad: 0 };
      }
      metodosPago[metodo].monto += v.total;
      metodosPago[metodo].cantidad++;
    });

    return {
      ventas: {
        total: totalVentas,
        cantidad: cantidadVentas,
        ticketPromedio: ticketPromedio,
      },
      compras: {
        total: totalCompras,
        cantidad: compras.length,
      },
      ganancias: ganancias,
      margen: margen,
      topProductos: topProductos,
      topClientes: topClientes,
      stockCritico: stockCritico,
      metodosPago: metodosPago,
    };
  },

  obtenerRangoFechas() {
    const hoy = new Date();
    let inicio, fin;

    switch (this.periodo) {
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

  renderTopProductos(productos) {
    if (productos.length === 0) {
      return '<p class="text-muted">No hay datos suficientes</p>';
    }

    return `
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Producto</th>
            <th>Cantidad Vendida</th>
            <th>Total Vendido</th>
          </tr>
        </thead>
        <tbody>
          ${productos
            .map(
              (p, i) => `
            <tr>
              <td><strong>${i + 1}</strong></td>
              <td>${p.nombre}</td>
              <td>${p.cantidad} unidades</td>
              <td>${Utils.formatCurrency(p.total)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  },

  renderTopClientes(clientes) {
    if (clientes.length === 0) {
      return '<p class="text-muted">No hay clientes registrados</p>';
    }

    return `
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Cliente</th>
            <th>Total Comprado</th>
            <th>Nº Compras</th>
            <th>Ticket Promedio</th>
          </tr>
        </thead>
        <tbody>
          ${clientes
            .map(
              (c, i) => `
            <tr>
              <td><strong>${i + 1}</strong></td>
              <td>${c.nombre}</td>
              <td>${Utils.formatCurrency(c.totalComprado)}</td>
              <td>${c.numeroCompras}</td>
              <td>${Utils.formatCurrency(c.ticketPromedio || 0)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  },

  renderStockCritico(productos) {
    if (productos.length === 0) {
      return '<p class="text-success">✓ Todos los productos tienen stock suficiente</p>';
    }

    return `
      <table class="table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Stock Actual</th>
            <th>Stock Mínimo</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${productos
            .map(
              (p) => `
            <tr>
              <td><strong>${p.nombre}</strong></td>
              <td><span class="badge badge-${p.stock === 0 ? 'danger' : 'warning'}">${p.stock}</span></td>
              <td>${p.stockMinimo}</td>
              <td>
                ${
                  p.stock === 0
                    ? '<span class="text-danger">Sin Stock</span>'
                    : '<span class="text-warning">Stock Bajo</span>'
                }
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  },

  renderMetodosPago(metodos) {
    if (Object.keys(metodos).length === 0) {
      return '<p class="text-muted">No hay ventas en este período</p>';
    }

    return `
      <table class="table">
        <thead>
          <tr>
            <th>Método de Pago</th>
            <th>Cantidad</th>
            <th>Total</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(metodos)
            .map(([metodo, datos]) => {
              const totalGeneral = Object.values(metodos).reduce((sum, m) => sum + m.monto, 0);
              const porcentaje =
                totalGeneral > 0 ? ((datos.monto / totalGeneral) * 100).toFixed(1) : 0;

              return `
              <tr>
                <td><strong>${metodo.charAt(0).toUpperCase() + metodo.slice(1)}</strong></td>
                <td>${datos.cantidad} ventas</td>
                <td>${Utils.formatCurrency(datos.monto)}</td>
                <td>${porcentaje}%</td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    `;
  },

  exportarReporte() {
    const stats = this.calcularEstadisticas();
    const reporte = {
      fecha: new Date().toISOString(),
      periodo: this.periodo,
      datos: stats,
    };

    const dataStr = JSON.stringify(reporte, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_${this.periodo}_${Utils.getCurrentDate()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    Utils.showToast('Reporte exportado', 'success');
  },
};
