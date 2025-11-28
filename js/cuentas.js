// ============================================
// MÓDULO: CUENTAS POR COBRAR Y PAGAR
// ============================================
// Gestión de créditos y deudas

window.Cuentas = {
  // ============================================
  // RENDERIZAR VISTA PRINCIPAL
  // ============================================
  async render(container) {
    const cuentasPorCobrar = await Database.getCollection('cuentasPorCobrar');
    const cuentasPorPagar = await Database.getCollection('cuentasPorPagar');

    // Calcular totales
    const totalPorCobrar = cuentasPorCobrar
      .filter((c) => c.estado !== 'pagada')
      .reduce((sum, c) => sum + c.montoRestante, 0);

    const totalPorPagar = cuentasPorPagar
      .filter((c) => c.estado !== 'pagada')
      .reduce((sum, c) => sum + c.montoRestante, 0);

    const vencidas = [...cuentasPorCobrar, ...cuentasPorPagar].filter(
      (c) => c.estado === 'vencida'
    ).length;

    container.innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-file-invoice-dollar"></i> Cuentas por Cobrar y Pagar</h2>
      </div>

      <div class="stats-grid">
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
            <h3>${Utils.formatCurrency(totalPorCobrar - totalPorPagar)}</h3>
            <p>Balance</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab-btn active" onclick="Cuentas.cambiarTab('cobrar')">
          <i class="fas fa-arrow-down"></i> Por Cobrar
        </button>
        <button class="tab-btn" onclick="Cuentas.cambiarTab('pagar')">
          <i class="fas fa-arrow-up"></i> Por Pagar
        </button>
        <button class="tab-btn" onclick="Cuentas.cambiarTab('calendario')">
          <i class="fas fa-calendar"></i> Calendario
        </button>
      </div>

      <!-- Contenido de tabs -->
      <div id="tabContent">
        ${await this.renderTabCobrar()}
      </div>
    `;
  },

  // ============================================
  // TAB: CUENTAS POR COBRAR
  // ============================================
  async renderTabCobrar() {
    const cuentas = await Database.getCollection('cuentasPorCobrar');

    // Actualizar estados según vencimiento
    await this.actualizarEstadosCuentas(cuentas, 'cuentasPorCobrar');

    return `
      <div class="data-table">
        <div class="table-header">
          <div class="table-filters">
            <input 
              type="text" 
              id="searchCuentaCobrar" 
              class="form-control" 
              placeholder="Buscar..."
              onkeyup="Cuentas.filtrarCobrar()"
            >
            <select id="filterEstadoCobrar" class="form-control" onchange="Cuentas.filtrarCobrar()">
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="vencida">Vencidas</option>
              <option value="pagada">Pagadas</option>
            </select>
          </div>
        </div>

        <div class="table-body">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Nº Venta</th>
                <th>Emisión</th>
                <th>Vencimiento</th>
                <th>Total</th>
                <th>Pagado</th>
                <th>Restante</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="cuentasCobrarBody">
              ${this.renderFilasCobrar(cuentas)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderFilasCobrar(cuentas) {
    if (cuentas.length === 0) {
      return '<tr><td colspan="9" class="text-center">No hay cuentas por cobrar</td></tr>';
    }

    return cuentas
      .reverse()
      .map(
        (c) => `
      <tr class="${c.estado === 'vencida' ? 'row-danger' : ''}">
        <td><strong>${c.clienteNombre}</strong></td>
        <td>${c.numeroVenta}</td>
        <td>${c.fechaEmision}</td>
        <td>${c.fechaVencimiento}</td>
        <td>${Utils.formatCurrency(c.montoTotal)}</td>
        <td>${Utils.formatCurrency(c.montoPagado)}</td>
        <td>${Utils.formatCurrency(c.montoRestante)}</td>
        <td>
          <span class="badge badge-${
            c.estado === 'pagada' ? 'success' : c.estado === 'vencida' ? 'danger' : 'warning'
          }">
            ${c.estado}
            ${c.diasVencidos > 0 ? ` (+${c.diasVencidos}d)` : ''}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-secondary" onclick="Cuentas.verDetalle('${c.id}', 'cobrar')" title="Ver detalle">
              <i class="fas fa-eye"></i>
            </button>
            ${
              c.estado !== 'pagada'
                ? `
              <button class="btn btn-sm btn-success" onclick="Cuentas.registrarPagoCuenta('${c.id}', 'cobrar')" title="Registrar pago">
                <i class="fas fa-dollar-sign"></i>
              </button>
            `
                : ''
            }
          </div>
        </td>
      </tr>
    `
      )
      .join('');
  },

  // ============================================
  // TAB: CUENTAS POR PAGAR
  // ============================================
  async renderTabPagar() {
    const cuentas = await Database.getCollection('cuentasPorPagar');

    // Actualizar estados según vencimiento
    await this.actualizarEstadosCuentas(cuentas, 'cuentasPorPagar');

    return `
      <div class="data-table">
        <div class="table-header">
          <div class="table-filters">
            <input 
              type="text" 
              id="searchCuentaPagar" 
              class="form-control" 
              placeholder="Buscar..."
              onkeyup="Cuentas.filtrarPagar()"
            >
            <select id="filterEstadoPagar" class="form-control" onchange="Cuentas.filtrarPagar()">
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="vencida">Vencidas</option>
              <option value="pagada">Pagadas</option>
            </select>
          </div>
        </div>

        <div class="table-body">
          <table>
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Nº Compra</th>
                <th>Emisión</th>
                <th>Vencimiento</th>
                <th>Total</th>
                <th>Pagado</th>
                <th>Restante</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="cuentasPagarBody">
              ${this.renderFilasPagar(cuentas)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderFilasPagar(cuentas) {
    if (cuentas.length === 0) {
      return '<tr><td colspan="9" class="text-center">No hay cuentas por pagar</td></tr>';
    }

    return cuentas
      .reverse()
      .map(
        (c) => `
      <tr class="${c.estado === 'vencida' ? 'row-danger' : ''}">
        <td><strong>${c.proveedorNombre}</strong></td>
        <td>${c.numeroCompra}</td>
        <td>${c.fechaEmision}</td>
        <td>${c.fechaVencimiento}</td>
        <td>${Utils.formatCurrency(c.montoTotal)}</td>
        <td>${Utils.formatCurrency(c.montoPagado)}</td>
        <td>${Utils.formatCurrency(c.montoRestante)}</td>
        <td>
          <span class="badge badge-${
            c.estado === 'pagada' ? 'success' : c.estado === 'vencida' ? 'danger' : 'warning'
          }">
            ${c.estado}
            ${c.diasVencidos > 0 ? ` (+${c.diasVencidos}d)` : ''}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-secondary" onclick="Cuentas.verDetalle('${c.id}', 'pagar')" title="Ver detalle">
              <i class="fas fa-eye"></i>
            </button>
            ${
              c.estado !== 'pagada'
                ? `
              <button class="btn btn-sm btn-success" onclick="Cuentas.registrarPagoCuenta('${c.id}', 'pagar')" title="Registrar pago">
                <i class="fas fa-dollar-sign"></i>
              </button>
            `
                : ''
            }
          </div>
        </td>
      </tr>
    `
      )
      .join('');
  },

  // ============================================
  // TAB: CALENDARIO DE VENCIMIENTOS
  // ============================================
  async renderTabCalendario() {
    const cobrar = (await Database.getCollection('cuentasPorCobrar')).filter(
      (c) => c.estado !== 'pagada'
    );
    const pagar = (await Database.getCollection('cuentasPorPagar')).filter(
      (c) => c.estado !== 'pagada'
    );
    const todas = [...cobrar, ...pagar].sort(
      (a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento)
    );

    return `
      <div class="calendario-vencimientos">
        <h3>Próximos Vencimientos</h3>
        
        ${
          todas.length > 0
            ? `
          <div class="timeline">
            ${todas
              .map((c) => {
                const esCobrar = c.tipo === 'cobrar';
                const diasParaVencer = this.calcularDiasParaVencer(c.fechaVencimiento);
                const vencida = diasParaVencer < 0;

                return `
                <div class="timeline-item ${vencida ? 'vencida' : ''}">
                  <div class="timeline-marker ${esCobrar ? 'cobrar' : 'pagar'}">
                    <i class="fas fa-${esCobrar ? 'arrow-down' : 'arrow-up'}"></i>
                  </div>
                  <div class="timeline-content">
                    <div class="timeline-header">
                      <strong>${esCobrar ? c.clienteNombre : c.proveedorNombre}</strong>
                      <span class="timeline-date">${c.fechaVencimiento}</span>
                    </div>
                    <div class="timeline-body">
                      <p>${esCobrar ? 'Cuenta por Cobrar' : 'Cuenta por Pagar'}: ${Utils.formatCurrency(c.montoRestante)}</p>
                      <span class="badge badge-${vencida ? 'danger' : 'warning'}">
                        ${
                          vencida
                            ? `Vencida hace ${Math.abs(diasParaVencer)} días`
                            : diasParaVencer === 0
                              ? 'Vence HOY'
                              : `Vence en ${diasParaVencer} días`
                        }
                      </span>
                    </div>
                    <div class="timeline-actions">
                      <button class="btn btn-sm btn-success" onclick="Cuentas.registrarPagoCuenta('${c.id}', '${esCobrar ? 'cobrar' : 'pagar'}')">
                        <i class="fas fa-dollar-sign"></i> Registrar Pago
                      </button>
                    </div>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        `
            : '<p class="text-muted">No hay cuentas pendientes</p>'
        }
      </div>
    `;
  },

  // ============================================
  // CAMBIAR TAB
  // ============================================
  cambiarTab(tab) {
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));
    event.target.closest('.tab-btn').classList.add('active');

    // Renderizar contenido
    const content = document.getElementById('tabContent');
    switch (tab) {
      case 'cobrar':
        content.innerHTML = this.renderTabCobrar();
        break;
      case 'pagar':
        content.innerHTML = this.renderTabPagar();
        break;
      case 'calendario':
        content.innerHTML = this.renderTabCalendario();
        break;
    }
  },

  // ============================================
  // FILTRAR CUENTAS
  // ============================================
  async filtrarCobrar() {
    const cuentas = await Database.getCollection('cuentasPorCobrar');
    const search = document.getElementById('searchCuentaCobrar').value.toLowerCase();
    const estado = document.getElementById('filterEstadoCobrar').value;

    let filtradas = cuentas;

    if (search) {
      filtradas = filtradas.filter(
        (c) =>
          c.clienteNombre.toLowerCase().includes(search) ||
          c.numeroVenta.toLowerCase().includes(search)
      );
    }

    if (estado) {
      filtradas = filtradas.filter((c) => c.estado === estado);
    }

    document.getElementById('cuentasCobrarBody').innerHTML = this.renderFilasCobrar(filtradas);
  },

  async filtrarPagar() {
    const cuentas = await Database.getCollection('cuentasPorPagar');
    const search = document.getElementById('searchCuentaPagar').value.toLowerCase();
    const estado = document.getElementById('filterEstadoPagar').value;

    let filtradas = cuentas;

    if (search) {
      filtradas = filtradas.filter(
        (c) =>
          c.proveedorNombre.toLowerCase().includes(search) ||
          c.numeroCompra.toLowerCase().includes(search)
      );
    }

    if (estado) {
      filtradas = filtradas.filter((c) => c.estado === estado);
    }

    document.getElementById('cuentasPagarBody').innerHTML = this.renderFilasPagar(filtradas);
  },

  // ============================================
  // ACTUALIZAR ESTADOS DE CUENTAS
  // ============================================
  async actualizarEstadosCuentas(cuentas, coleccion) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (const cuenta of cuentas) {
      if (cuenta.estado !== 'pagada') {
        const fechaVenc = new Date(cuenta.fechaVencimiento);
        fechaVenc.setHours(0, 0, 0, 0);

        const diasDif = Math.floor((hoy - fechaVenc) / (1000 * 60 * 60 * 24));

        cuenta.diasVencidos = diasDif > 0 ? diasDif : 0;

        if (diasDif > 0) {
          cuenta.estado = 'vencida';
          await Database.update(coleccion, cuenta.id, cuenta);
        }
      }
    }
  },

  // ============================================
  // VER DETALLE DE CUENTA
  // ============================================
  async verDetalle(cuentaId, tipo) {
    const coleccion = tipo === 'cobrar' ? 'cuentasPorCobrar' : 'cuentasPorPagar';
    const cuenta = await Database.getItem(coleccion, cuentaId);

    if (!cuenta) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalDetalleCuenta';
    modal.innerHTML = `
      <div class="modal-container modal-large">
        <div class="modal-header">
          <h3><i class="fas fa-file-invoice"></i> Detalle de Cuenta por ${tipo === 'cobrar' ? 'Cobrar' : 'Pagar'}</h3>
          <button class="btn-close" onclick="document.getElementById('modalDetalleCuenta').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="cuenta-detalle">
            <div class="info-grid">
              <div><strong>${tipo === 'cobrar' ? 'Cliente' : 'Proveedor'}:</strong> ${tipo === 'cobrar' ? cuenta.clienteNombre : cuenta.proveedorNombre}</div>
              <div><strong>Número:</strong> ${tipo === 'cobrar' ? cuenta.numeroVenta : cuenta.numeroCompra}</div>
              <div><strong>Emisión:</strong> ${cuenta.fechaEmision}</div>
              <div><strong>Vencimiento:</strong> ${cuenta.fechaVencimiento}</div>
              <div><strong>Estado:</strong> 
                <span class="badge badge-${cuenta.estado === 'pagada' ? 'success' : cuenta.estado === 'vencida' ? 'danger' : 'warning'}">
                  ${cuenta.estado}
                </span>
              </div>
            </div>

            <div class="cuenta-montos">
              <div><span>Total:</span> <strong>${Utils.formatCurrency(cuenta.montoTotal)}</strong></div>
              <div><span>Pagado:</span> <strong class="text-success">${Utils.formatCurrency(cuenta.montoPagado)}</strong></div>
              <div><span>Restante:</span> <strong class="text-danger">${Utils.formatCurrency(cuenta.montoRestante)}</strong></div>
            </div>

            ${
              cuenta.pagos && cuenta.pagos.length > 0
                ? `
              <h4>Historial de Pagos</h4>
              <table class="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  ${cuenta.pagos
                    .map(
                      (p) => `
                    <tr>
                      <td>${p.fecha}</td>
                      <td>${Utils.formatCurrency(p.monto)}</td>
                      <td>${p.metodoPago}</td>
                      <td>${p.referencia || '-'}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            `
                : ''
            }
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalDetalleCuenta').remove()">
            Cerrar
          </button>
          ${
            cuenta.estado !== 'pagada'
              ? `
            <button class="btn btn-success" onclick="Cuentas.registrarPagoCuenta('${cuentaId}', '${tipo}'); document.getElementById('modalDetalleCuenta').remove();">
              <i class="fas fa-dollar-sign"></i> Registrar Pago
            </button>
          `
              : ''
          }
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  // ============================================
  // REGISTRAR PAGO
  // ============================================
  async registrarPagoCuenta(cuentaId, tipo) {
    const coleccion = tipo === 'cobrar' ? 'cuentasPorCobrar' : 'cuentasPorPagar';
    const cuenta = await Database.getItem(coleccion, cuentaId);

    if (!cuenta) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalRegistrarPago';
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3><i class="fas fa-dollar-sign"></i> Registrar Pago</h3>
          <button class="btn-close" onclick="document.getElementById('modalRegistrarPago').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="pago-info">
            <p><strong>${tipo === 'cobrar' ? 'Cliente' : 'Proveedor'}:</strong> ${tipo === 'cobrar' ? cuenta.clienteNombre : cuenta.proveedorNombre}</p>
            <p><strong>Total:</strong> ${Utils.formatCurrency(cuenta.montoTotal)}</p>
            <p><strong>Pagado:</strong> ${Utils.formatCurrency(cuenta.montoPagado)}</p>
            <p><strong>Restante:</strong> ${Utils.formatCurrency(cuenta.montoRestante)}</p>
          </div>

          <div class="form-group">
            <label>Monto a Pagar *</label>
            <input 
              type="number" 
              id="montoPagoCuenta" 
              class="form-control" 
              step="0.01" 
              min="0.01" 
              max="${cuenta.montoRestante}" 
              value="${cuenta.montoRestante}"
              required
            >
          </div>

          <div class="form-group">
            <label>Método de Pago *</label>
            <select id="metodoPagoCuenta" class="form-control">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <div class="form-group">
            <label>Referencia</label>
            <input type="text" id="referenciaPagoCuenta" class="form-control">
          </div>

          <div class="form-group">
            <label>Notas</label>
            <textarea id="notasPagoCuenta" class="form-control" rows="2"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalRegistrarPago').remove()">
            Cancelar
          </button>
          <button class="btn btn-success" onclick="Cuentas.guardarPago('${cuentaId}', '${tipo}')">
            <i class="fas fa-check"></i> Guardar Pago
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  async guardarPago(cuentaId, tipo) {
    const coleccion = tipo === 'cobrar' ? 'cuentasPorCobrar' : 'cuentasPorPagar';
    const cuenta = await Database.getItem(coleccion, cuentaId);

    if (!cuenta) return;

    const monto = parseFloat(document.getElementById('montoPagoCuenta').value);
    const metodo = document.getElementById('metodoPagoCuenta').value;
    const referencia = document.getElementById('referenciaPagoCuenta').value;
    const notas = document.getElementById('notasPagoCuenta').value;

    // Validaciones
    if (isNaN(monto) || monto <= 0) {
      Utils.showToast('Monto inválido', 'error');
      return;
    }

    if (monto > cuenta.montoRestante) {
      Utils.showToast('El monto excede el saldo pendiente', 'error');
      return;
    }

    // Registrar pago
    const pago = {
      fecha: Utils.getCurrentDate(),
      monto: monto,
      metodoPago: metodo,
      referencia: referencia,
      notas: notas,
      registradoPor: Auth.getCurrentUser().username,
    };

    if (!cuenta.pagos) cuenta.pagos = [];
    cuenta.pagos.push(pago);
    cuenta.montoPagado += monto;
    cuenta.montoRestante -= monto;

    // Actualizar estado
    if (cuenta.montoRestante <= 0.01) {
      cuenta.estado = 'pagada';
      cuenta.montoRestante = 0;
    }

    cuenta.updatedAt = new Date().toISOString();

    await Database.update(coleccion, cuentaId, cuenta);

    // Actualizar venta/compra relacionada si es necesario
    if (tipo === 'cobrar' && cuenta.ventaId) {
      const venta = await Database.getItem('ventas', cuenta.ventaId);
      if (venta) {
        venta.estado = cuenta.estado === 'pagada' ? 'completada' : 'pendiente';
        await Database.update('ventas', cuenta.ventaId, venta);
      }
    } else if (tipo === 'pagar' && cuenta.compraId) {
      const compra = await Database.getItem('compras', cuenta.compraId);
      if (compra) {
        compra.montoPagado = cuenta.montoPagado;
        compra.montoRestante = cuenta.montoRestante;
        compra.estadoPago = cuenta.estado === 'pagada' ? 'pagada' : 'parcial';
        compra.pagos = cuenta.pagos;
        await Database.update('compras', cuenta.compraId, compra);
      }
    }

    // Mostrar notificación con información del estado
    const estadoMensaje =
      cuenta.estado === 'pagada'
        ? '✅ Pago registrado - Cuenta completamente pagada'
        : `💰 Pago registrado - Pendiente: $${cuenta.montoRestante.toFixed(2)}`;

    Utils.showToast(estadoMensaje, 'success', {
      actionUrl: '#cuentas',
      actionLabel: 'Ver cuentas',
      duration: 5000,
    });

    document.getElementById('modalRegistrarPago').remove();

    // Actualizar sin recargar página
    if (window.DataRefreshManager) {
      const container = document.querySelector('.page-content');
      if (container) await this.render(container);
    } else {
      App.loadModule('cuentas');
    }
  },

  // ============================================
  // UTILIDADES
  // ============================================
  calcularDiasParaVencer(fechaVencimiento) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(fechaVencimiento);
    vencimiento.setHours(0, 0, 0, 0);

    return Math.floor((vencimiento - hoy) / (1000 * 60 * 60 * 24));
  },
};
