// ============================================
// MÓDULO: CONTABILIDAD
// ============================================
// Gestión financiera básica

window.Contabilidad = {
  async render(container) {
    const transacciones = (await Database.getCollection('transacciones')) || [];
    const { ingresos, gastos, balance } = FinanzasMejorado.calcularMetricasCompletas('mes');

    container.innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-calculator"></i> Contabilidad</h2>
        <button class="btn btn-primary" onclick="Contabilidad.mostrarFormulario()">
          <i class="fas fa-plus"></i> Nueva Transacción
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--success-light);">
            <i class="fas fa-arrow-up" style="color: var(--success-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${Utils.formatCurrency(ingresos)}</h3>
            <p>Ingresos del Mes</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--danger-light);">
            <i class="fas fa-arrow-down" style="color: var(--danger-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${Utils.formatCurrency(gastos)}</h3>
            <p>Gastos del Mes</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--primary-light);">
            <i class="fas fa-balance-scale" style="color: var(--primary-color);"></i>
          </div>
          <div class="stat-info">
            <h3 class="${balance >= 0 ? 'text-success' : 'text-danger'}">${Utils.formatCurrency(balance)}</h3>
            <p>Balance</p>
          </div>
        </div>
      </div>

      <div class="data-table">
        <div class="table-header">
          <h3>Transacciones</h3>
          <div class="table-filters">
            <select id="filterTipo" class="form-control" onchange="Contabilidad.filtrar()">
              <option value="">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="gasto">Gastos</option>
            </select>
          </div>
        </div>
        <div class="table-body">
          <table>
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
            <tbody id="transaccionesBody">
              ${this.renderTransacciones(transacciones)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderTransacciones(transacciones) {
    if (transacciones.length === 0) {
      return '<tr><td colspan="6" class="text-center">No hay transacciones</td></tr>';
    }

    return transacciones
      .reverse()
      .map(
        (t) => `
      <tr>
        <td>${t.fecha}</td>
        <td>
          <span class="badge badge-${t.tipo === 'ingreso' ? 'success' : 'danger'}">
            <i class="fas fa-arrow-${t.tipo === 'ingreso' ? 'up' : 'down'}"></i> ${t.tipo}
          </span>
        </td>
        <td>${t.categoria}</td>
        <td>${t.descripcion}</td>
        <td class="${t.tipo === 'ingreso' ? 'text-success' : 'text-danger'}">
          ${t.tipo === 'ingreso' ? '+' : '-'}${Utils.formatCurrency(t.monto)}
        </td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="Contabilidad.eliminar('${t.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `
      )
      .join('');
  },

  mostrarFormulario() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalTransaccion';
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3><i class="fas fa-dollar-sign"></i> Nueva Transacción</h3>
          <button class="btn-close" onclick="document.getElementById('modalTransaccion').remove()">×</button>
        </div>
        <div class="modal-body">
          <form id="formTransaccion">
            <div class="form-group">
              <label>Tipo *</label>
              <select name="tipo" class="form-control" required>
                <option value="ingreso">Ingreso</option>
                <option value="gasto">Gasto</option>
              </select>
            </div>
            <div class="form-group">
              <label>Categoría *</label>
              <select name="categoria" class="form-control" required>
                <option value="Ventas">Ventas</option>
                <option value="Servicios">Servicios</option>
                <option value="Operativos">Gastos Operativos</option>
                <option value="Administrativos">Gastos Administrativos</option>
                <option value="Personal">Personal</option>
                <option value="Marketing">Marketing</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
            <div class="form-group">
              <label>Monto *</label>
              <input type="number" name="monto" class="form-control" step="0.01" min="0" required>
            </div>
            <div class="form-group">
              <label>Descripción *</label>
              <input type="text" name="descripcion" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Fecha *</label>
              <input type="date" name="fecha" class="form-control" value="${Utils.getCurrentDate()}" required>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalTransaccion').remove()">Cancelar</button>
          <button class="btn btn-primary" onclick="Contabilidad.guardar()">
            <i class="fas fa-save"></i> Guardar
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  guardar() {
    const form = document.getElementById('formTransaccion');
    const formData = new FormData(form);

    const transaccion = {
      id: Utils.generateId(),
      tipo: formData.get('tipo'),
      categoria: formData.get('categoria'),
      monto: parseFloat(formData.get('monto')),
      descripcion: formData.get('descripcion'),
      fecha: formData.get('fecha'),
      createdAt: new Date().toISOString(),
    };

    Database.add('transacciones', transaccion);
    document.getElementById('modalTransaccion').remove();
    Utils.showToast('Transacción registrada', 'success');

    // Actualizar sin recargar
    if (window.DataRefreshManager) {
      const container = document.querySelector('.page-content');
      if (container) this.render(container);
    } else {
      App.loadModule('contabilidad');
    }
  },

  eliminar(id) {
    Utils.showConfirm('¿Eliminar esta transacción?', async () => {
      Database.deleteItem('transacciones', id);
      Utils.showToast('Transacción eliminada', 'success');

      // Actualizar sin recargar
      if (window.DataRefreshManager) {
        const container = document.querySelector('.page-content');
        if (container) await Contabilidad.render(container);
      } else {
        App.loadModule('contabilidad');
      }
    });
  },

  async filtrar() {
    const tipo = document.getElementById('filterTipo').value;
    const transacciones = (await Database.getCollection('transacciones')) || [];

    const filtradas = tipo ? transacciones.filter((t) => t.tipo === tipo) : transacciones;
    document.getElementById('transaccionesBody').innerHTML = this.renderTransacciones(filtradas);
  },
};
