/* ========================================
   MÓDULO: ÓRDENES DE TRABAJO
   Sistema completo para taller mecánico
   ======================================== */

const OrdenesTrabajo = {
  ordenesCache: [],
  tecnicosCache: [],
  shareCache: new Map(),
  _dbClient: null,

  getDb() {
    if (this._dbClient) {
      return this._dbClient;
    }

    const candidates = [];
    if (typeof window !== 'undefined') {
      if (window.DatabaseAPI) candidates.push(window.DatabaseAPI);
      if (window.Database) candidates.push(window.Database);
    }
    if (typeof DatabaseAPI !== 'undefined') candidates.push(DatabaseAPI);
    if (typeof Database !== 'undefined') candidates.push(Database);

    this._dbClient = candidates.find((client) => client && typeof client === 'object') || null;

    if (!this._dbClient) {
      console.warn('OrdenesTrabajo: no se encontró proveedor de datos disponible.');
    }

    return this._dbClient;
  },

  hasDbMethod(method) {
    const db = this.getDb();
    return !!(db && typeof db[method] === 'function');
  },

  async fetchClientes() {
    const db = this.getDb();
    if (!db) return [];

    if (typeof db.getClientes === 'function') {
      return await db.getClientes();
    }

    if (typeof db.getCollection === 'function') {
      const clientes = await db.getCollection('clientes');
      return Array.isArray(clientes) ? clientes : [];
    }

    return [];
  },

  async fetchTecnicos() {
    const db = this.getDb();
    if (!db) return [];

    if (typeof db.getTecnicos === 'function') {
      return await db.getTecnicos();
    }

    if (typeof db.getCollection === 'function') {
      const usuarios = await db.getCollection('usuarios');
      if (!Array.isArray(usuarios)) return [];
      const roleUtils = window.RoleUtils || null;
      return usuarios.filter((u) => {
        if (roleUtils) {
          return roleUtils.is(u.rol, [
            roleUtils.ROLE_TECNICO,
            roleUtils.ROLE_ADMIN,
            roleUtils.ROLE_SUPER_ADMIN,
          ]);
        }

        const rol = (u.rol || '').toString().toLowerCase();
        return (
          rol.startsWith('tec') || rol.startsWith('mec') || rol === 'admin' || rol === 'superadmin'
        );
      });
    }

    return [];
  },

  /**
   * Obtiene el porcentaje de IVA configurado
   */
  getIvaConfig() {
    try {
      // Intentar obtener de la configuración del sistema
      if (
        window.ConfiguracionTienda &&
        typeof window.ConfiguracionTienda.getConfig === 'function'
      ) {
        const config = window.ConfiguracionTienda.getConfig();
        if (config && typeof config.iva === 'number') {
          return config.iva;
        }
      }

      // Intentar obtener del Database
      const db = this.getDb();
      if (db && typeof db.getConfig === 'function') {
        const config = db.getConfig();
        if (config && typeof config.iva === 'number') {
          return config.iva;
        }
      }

      // Valor por defecto
      return 19;
    } catch (error) {
      console.warn('Error obteniendo configuración IVA, usando valor por defecto:', error);
      return 19;
    }
  },

  async fetchOrdenesTrabajo(params = {}) {
    const db = this.getDb();
    if (!db) return [];

    if (typeof db.getOrdenesTrabajo === 'function') {
      return await db.getOrdenesTrabajo(params);
    }

    if (typeof db.getCollection === 'function') {
      let ordenes = await db.getCollection('ordenes_trabajo');
      if (!Array.isArray(ordenes)) ordenes = [];

      const { estado, tecnicoId } = params;
      if (estado || tecnicoId) {
        ordenes = ordenes.filter((orden) => {
          const matchEstado = estado ? orden.estado === estado : true;
          const matchTecnico = tecnicoId
            ? String(orden.tecnico_asignado_id || '') === String(tecnicoId)
            : true;
          return matchEstado && matchTecnico;
        });
      }

      return ordenes;
    }

    return [];
  },

  async fetchOrdenTrabajoById(id) {
    const db = this.getDb();
    if (!db) return null;

    if (typeof db.getOrdenTrabajoById === 'function') {
      return await db.getOrdenTrabajoById(id);
    }

    if (typeof db.findById === 'function') {
      return await db.findById('ordenes_trabajo', id);
    }

    if (typeof db.getCollection === 'function') {
      const ordenes = await db.getCollection('ordenes_trabajo');
      if (Array.isArray(ordenes)) {
        return ordenes.find((orden) => String(orden.id) === String(id)) || null;
      }
    }

    return null;
  },

  async fetchVehiculoById(id) {
    const db = this.getDb();
    if (!db) return null;

    if (typeof db.getVehiculoById === 'function') {
      return await db.getVehiculoById(id);
    }

    if (typeof db.findById === 'function') {
      return await db.findById('vehiculos', id);
    }

    if (typeof db.getCollection === 'function') {
      const vehiculos = await db.getCollection('vehiculos');
      if (Array.isArray(vehiculos)) {
        return vehiculos.find((vehiculo) => String(vehiculo.id) === String(id)) || null;
      }
    }

    return null;
  },

  async fetchVehiculosByCliente(clienteId) {
    const db = this.getDb();
    if (!db) return [];

    if (typeof db.getVehiculos === 'function') {
      return await db.getVehiculos({ clienteId });
    }

    if (typeof db.getCollection === 'function') {
      const vehiculos = await db.getCollection('vehiculos');
      if (!Array.isArray(vehiculos)) return [];
      return vehiculos.filter(
        (vehiculo) => String(vehiculo.cliente_id || '') === String(clienteId)
      );
    }

    return [];
  },

  async createOrdenTrabajo(payload) {
    const db = this.getDb();
    if (!db) {
      throw new Error('Servicio de datos no disponible');
    }

    if (typeof db.createOrdenTrabajo === 'function') {
      return await db.createOrdenTrabajo(payload);
    }

    if (typeof db.addItem === 'function') {
      const data = { ...payload };
      if (!data.id) {
        const fallbackId =
          typeof Utils !== 'undefined' && typeof Utils.generateId === 'function'
            ? Utils.generateId('ot')
            : `ot_${Date.now()}`;
        data.id = fallbackId;
      }
      if (!data.numero) {
        data.numero = data.id;
      }
      db.addItem('ordenes_trabajo', data);
      return { success: true, orden: data };
    }

    throw new Error('No se pudo crear la orden: método no disponible');
  },

  async updateOrdenTrabajoRegistro(ordenId, payload) {
    const db = this.getDb();
    if (!db) {
      throw new Error('Servicio de datos no disponible');
    }

    if (typeof db.updateOrdenTrabajo === 'function') {
      return await db.updateOrdenTrabajo(ordenId, payload);
    }

    if (typeof db.updateItem === 'function') {
      db.updateItem('ordenes_trabajo', ordenId, payload);
      const orden = await this.fetchOrdenTrabajoById(ordenId);
      return { success: true, orden };
    }

    throw new Error('No se pudo actualizar la orden: método no disponible');
  },

  async updateEstadoOrdenTrabajoRegistro(ordenId, cambios) {
    const db = this.getDb();
    if (!db) {
      throw new Error('Servicio de datos no disponible');
    }

    if (typeof db.updateEstadoOrdenTrabajo === 'function') {
      return await db.updateEstadoOrdenTrabajo(ordenId, cambios);
    }

    if (typeof db.updateItem === 'function') {
      db.updateItem('ordenes_trabajo', ordenId, cambios);
      const orden = await this.fetchOrdenTrabajoById(ordenId);
      return { success: true, orden };
    }

    throw new Error('No se pudo actualizar el estado de la orden: método no disponible');
  },

  async deleteOrdenTrabajoRegistro(ordenId) {
    const db = this.getDb();
    if (!db) {
      throw new Error('Servicio de datos no disponible');
    }

    if (typeof db.deleteOrdenTrabajo === 'function') {
      return await db.deleteOrdenTrabajo(ordenId);
    }

    if (typeof db.deleteItem === 'function') {
      db.deleteItem('ordenes_trabajo', ordenId);
      return { success: true };
    }

    throw new Error('No se pudo eliminar la orden: método no disponible');
  },

  async registrarRecordatorio(recordatorio) {
    const db = this.getDb();
    if (!db) return;

    if (typeof db.request === 'function') {
      await db.request('/recordatorios', {
        method: 'POST',
        body: recordatorio,
      });
      return;
    }

    if (typeof db.addItem === 'function') {
      db.addItem('recordatorios', recordatorio);
    }
  },

  formatearMoneda(valor) {
    const amount = Number.isFinite(Number(valor)) ? Number(valor) : 0;
    const hasUtils = typeof Utils !== 'undefined' && typeof Utils.formatCurrency === 'function';
    if (hasUtils) {
      let currencyCode = 'USD';
      if (typeof window !== 'undefined' && window.AppConfig) {
        currencyCode = window.AppConfig.currencyCode || window.AppConfig.currency || currencyCode;
      }
      return Utils.formatCurrency(amount, currencyCode);
    }
    return amount.toLocaleString('es-ES', { style: 'currency', currency: 'USD' });
  },

  /**
   * Renderiza la vista principal de órdenes de trabajo
   */
  render() {
    return `
            <div class="page-header">
                <h2><i class="fas fa-tools"></i> Órdenes de Trabajo</h2>
                <div class="header-actions compact">
                    <button class="btn btn-sm btn-primary" onclick="OrdenesTrabajo.mostrarFormulario()">
                        <i class="fas fa-plus"></i>
                        <span>Nueva Orden</span>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="OrdenesTrabajo.mostrarFiltros()">
                        <i class="fas fa-filter"></i>
                        <span>Filtros</span>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="OrdenesTrabajo.exportarReporte()">
                        <i class="fas fa-file-export"></i>
                        <span>Exportar</span>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="OrdenesTrabajo.crearConIA()" title="Crear orden con asistente IA conversacional">
                        <i class="fas fa-robot"></i>
                        <span>Crear con IA</span>
                    </button>
                </div>
            </div>

            <div class="filters-section" id="filtros-ordenes" style="display: none;">
                <div class="filters-grid">
                    <div class="filter-group">
                        <label>Estado:</label>
                        <select id="filtro-estado" onchange="OrdenesTrabajo.aplicarFiltros()">
                            <option value="">Todos los estados</option>
                            <option value="recibido">Recibido</option>
                            <option value="en_proceso">En Proceso</option>
                            <option value="espera_repuestos">Espera Repuestos</option>
                            <option value="finalizado">Finalizado</option>
                            <option value="entregado">Entregado</option>
                            <option value="cancelado">Cancelado</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Técnico:</label>
                        <select id="filtro-tecnico" onchange="OrdenesTrabajo.aplicarFiltros()">
                            <option value="">Todos los técnicos</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Fecha desde:</label>
                        <input type="date" id="filtro-fecha-desde" onchange="OrdenesTrabajo.aplicarFiltros()">
                    </div>
                    <div class="filter-group">
                        <label>Fecha hasta:</label>
                        <input type="date" id="filtro-fecha-hasta" onchange="OrdenesTrabajo.aplicarFiltros()">
                    </div>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <i class="fas fa-inbox"></i>
                    <div class="stat-content">
                        <h3 id="ordenes-recibidas">0</h3>
                        <p>Recibidas</p>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-cogs"></i>
                    <div class="stat-content">
                        <h3 id="ordenes-proceso">0</h3>
                        <p>En Proceso</p>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-clock"></i>
                    <div class="stat-content">
                        <h3 id="ordenes-espera">0</h3>
                        <p>Esperando Repuestos</p>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-check-circle"></i>
                    <div class="stat-content">
                        <h3 id="ordenes-completadas">0</h3>
                        <p>Finalizadas</p>
                    </div>
                </div>
            </div>

            <div id="lista-ordenes-trabajo" class="content-area">
                <p>Cargando órdenes de trabajo...</p>
            </div>
        `;
  },

  /**
   * Inicializa el módulo
   */
  async init() {
    console.log('🛠️ Inicializando módulo de Órdenes de Trabajo...');
    await this.cargarTecnicos();
    await this.cargarOrdenes();
  },

  /**
   * Carga y muestra las órdenes de trabajo
   */
  async cargarOrdenes() {
    const lista = document.getElementById('lista-ordenes-trabajo');
    if (!lista) return;

    lista.innerHTML =
      '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando órdenes de trabajo...</div>';

    try {
      const ordenes = (await this.fetchOrdenesTrabajo()) || [];
      this.ordenesCache = Array.isArray(ordenes) ? ordenes : [];
      if (this.shareCache && typeof this.shareCache.clear === 'function') {
        this.shareCache.clear();
      }

      if (this.ordenesCache.length === 0) {
        lista.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-tools"></i>
                        <h3>No hay órdenes de trabajo</h3>
                        <p>Crea la primera orden de trabajo para comenzar</p>
                        <button class="btn btn-primary" onclick="OrdenesTrabajo.mostrarFormulario()">
                            <i class="fas fa-plus"></i> Nueva Orden
                        </button>
                    </div>
                `;
        this.actualizarEstadisticas();
        return;
      }

      this.renderizarListaOrdenes(this.ordenesCache);
      this.actualizarEstadisticas();
    } catch (error) {
      console.error('Error cargando órdenes de trabajo:', error);
      lista.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error al cargar órdenes</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-secondary" onclick="OrdenesTrabajo.cargarOrdenes()">
                        <i class="fas fa-sync"></i> Reintentar
                    </button>
                </div>
            `;
    }
  },

  /**
   * Renderiza la lista de órdenes de trabajo
   */
  renderizarListaOrdenes(ordenes) {
    const lista = document.getElementById('lista-ordenes-trabajo');

    lista.innerHTML = `
            <div class="table-responsive">
                <table class="data-table responsive-table">
                    <thead>
                        <tr>
                            <th>Orden #</th>
                            <th>Cliente</th>
                            <th>Vehículo</th>
                            <th>Problema</th>
                            <th>Recepción</th>
                            <th>Entrega Est.</th>
                            <th>Estado</th>
                            <th>Técnico</th>
                            <th>Total</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ordenes.map((orden) => this.renderizarFilaOrden(orden)).join('')}
                    </tbody>
                </table>
            </div>
        `;
  },

  /**
   * Renderiza una fila de orden de trabajo
   */
  renderizarFilaOrden(orden) {
    const estado = this.obtenerEstadoInfo(orden.estado);
    const fechaRecepcion = new Date(orden.fecha_recepcion).toLocaleDateString();
    const fechaEntrega = orden.fecha_entrega_estimada
      ? new Date(orden.fecha_entrega_estimada).toLocaleDateString()
      : '-';
    const sanitize = (valor) => {
      if (typeof Utils !== 'undefined' && typeof Utils.sanitize === 'function') {
        return Utils.sanitize(valor);
      }
      return (valor || '').toString();
    };
    const problema = orden.problema_reportado
      ? orden.problema_reportado.length > 50
        ? `${orden.problema_reportado.substring(0, 50)}...`
        : orden.problema_reportado
      : 'Sin descripción';

    // Determinar badge de estado con clases Excel
    let estadoBadge = 'excel-badge-muted';
    if (estado.clase === 'success') estadoBadge = 'excel-badge-success';
    else if (estado.clase === 'warning') estadoBadge = 'excel-badge-warning';
    else if (estado.clase === 'danger') estadoBadge = 'excel-badge-danger';
    else if (estado.clase === 'info') estadoBadge = 'excel-badge-info';
    else if (estado.clase === 'primary') estadoBadge = 'excel-badge-accent';

    return `
            <tr>
                <td>
                    <strong class="font-mono">#${orden.numero}</strong>
                    ${orden.prioridad === 'alta' ? '<span class="excel-badge excel-badge-danger" style="margin-left:4px">!</span>' : ''}
                </td>
                <td>
                    <div>
                        <strong>${sanitize(orden.cliente_nombre || 'Cliente no registrado')}</strong>
                        ${orden.cliente_telefono ? `<small class="text-muted">${sanitize(orden.cliente_telefono)}</small>` : ''}
                    </div>
                </td>
                <td>
                    <div>
                        <strong class="font-mono">${sanitize(orden.vehiculo_placa || 'Sin placa')}</strong>
                        <small class="text-muted">${sanitize(`${orden.vehiculo_marca || ''} ${orden.vehiculo_modelo || ''}`)}</small>
                    </div>
                </td>
                <td>
                    <span class="text-muted" style="font-size:0.82rem">${sanitize(problema)}</span>
                </td>
                <td class="text-muted">${fechaRecepcion}</td>
                <td>
                    <span class="${this.obtenerClaseFechaEntrega(orden.fecha_entrega_estimada)}">
                        ${fechaEntrega}
                    </span>
                </td>
                <td class="text-center">
                    <span class="excel-badge ${estadoBadge}">${estado.texto}</span>
                </td>
                <td class="text-muted">${sanitize(orden.tecnico_nombre || 'Sin asignar')}</td>
                <td class="text-right">
                    <strong>${this.formatearMoneda(orden.total)}</strong>
                </td>
                <td class="text-center sticky-action">
                    <div class="excel-actions">
                        <button class="excel-btn-action btn-view" onclick="OrdenesTrabajo.verDetalle('${orden.id}')" 
                                title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="excel-btn-action btn-edit" onclick="OrdenesTrabajo.editarOrden('${orden.id}')" 
                                title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${this.renderizarAccionesEstado(orden)}
                        <div class="dropdown">
                            <button class="excel-btn-action" onclick="OrdenesTrabajo.toggleDropdown(this)">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu">
                                <a href="#" onclick="OrdenesTrabajo.imprimirOrden('${orden.id}')">
                                    <i class="fas fa-print"></i> Imprimir
                                </a>
                                <a href="#" onclick="OrdenesTrabajo.mostrarOpcionesCompartir('${orden.id}')">
                                    <i class="fas fa-share-alt"></i> Compartir
                                </a>
                                <a href="#" onclick="OrdenesTrabajo.duplicarOrden('${orden.id}')">
                                    <i class="fas fa-copy"></i> Duplicar
                                </a>
                                <a href="#" onclick="OrdenesTrabajo.crearRecordatorio('${orden.id}')">
                                    <i class="fas fa-bell"></i> Recordatorio
                                </a>
                                <div class="dropdown-divider"></div>
                                <a href="#" onclick="OrdenesTrabajo.eliminarOrden('${orden.id}')" class="text-danger">
                                    <i class="fas fa-trash"></i> Eliminar
                                </a>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
  },

  /**
   * Obtiene información de estado con clase CSS
   */
  obtenerEstadoInfo(estado) {
    const estados = {
      recibido: { clase: 'info', texto: 'Recibido' },
      en_proceso: { clase: 'warning', texto: 'En Proceso' },
      espera_repuestos: { clase: 'secondary', texto: 'Espera Repuestos' },
      finalizado: { clase: 'success', texto: 'Finalizado' },
      entregado: { clase: 'success', texto: 'Entregado' },
      cancelado: { clase: 'danger', texto: 'Cancelado' },
    };
    return estados[estado] || { clase: 'secondary', texto: estado };
  },

  /**
   * Obtiene clase CSS para fecha de entrega
   */
  obtenerClaseFechaEntrega(fechaEntrega) {
    if (!fechaEntrega) return '';

    const hoy = new Date();
    const entrega = new Date(fechaEntrega);
    const diasRestantes = Math.ceil((entrega - hoy) / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) return 'text-danger'; // Atrasada
    if (diasRestantes <= 1) return 'text-warning'; // Próxima
    return '';
  },

  /**
   * Renderiza acciones específicas según el estado
   */
  renderizarAccionesEstado(orden) {
    switch (orden.estado) {
      case 'recibido':
        return `
                    <button class="btn btn-sm btn-warning" onclick="OrdenesTrabajo.iniciarTrabajo('${orden.id}')" 
                            title="Iniciar trabajo">
                        <i class="fas fa-play"></i>
                    </button>
                `;
      case 'en_proceso':
        return `
                    <button class="btn btn-sm btn-info" onclick="OrdenesTrabajo.esperarRepuestos('${orden.id}')" 
                            title="Marcar esperando repuestos">
                        <i class="fas fa-pause"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="OrdenesTrabajo.finalizarOrden('${orden.id}')" 
                            title="Finalizar">
                        <i class="fas fa-check"></i>
                    </button>
                `;
      case 'espera_repuestos':
        return `
                    <button class="btn btn-sm btn-warning" onclick="OrdenesTrabajo.reanudarTrabajo('${orden.id}')" 
                            title="Reanudar trabajo">
                        <i class="fas fa-play"></i>
                    </button>
                `;
      case 'finalizado':
        return `
                    <button class="btn btn-sm btn-success" onclick="OrdenesTrabajo.entregarVehiculo('${orden.id}')" 
                            title="Entregar vehículo">
                        <i class="fas fa-handshake"></i>
                    </button>
                `;
      default:
        return '';
    }
  },

  /**
   * Crear nueva orden de trabajo para un vehículo específico
   */
  async nuevaOrdenParaVehiculo(vehiculoId) {
    try {
      const vehiculo = await this.fetchVehiculoById(vehiculoId);
      await this.mostrarFormulario(null, vehiculo);
    } catch (error) {
      console.error('Error cargando vehículo:', error);
      Utils.showToast('Error al cargar datos del vehículo', 'error');
    }
  },

  /**
   * Muestra/oculta los filtros
   */
  mostrarFiltros() {
    const filtros = document.getElementById('filtros-ordenes');
    if (filtros) {
      filtros.style.display = filtros.style.display === 'none' ? 'block' : 'none';
    }
  },

  /**
   * Aplica los filtros seleccionados
   */
  aplicarFiltros() {
    if (!this.ordenesCache) return;

    const filtroEstado = document.getElementById('filtro-estado')?.value;
    const filtroTecnico = document.getElementById('filtro-tecnico')?.value;
    const filtroFechaDesde = document.getElementById('filtro-fecha-desde')?.value;
    const filtroFechaHasta = document.getElementById('filtro-fecha-hasta')?.value;

    const ordenesFiltradas = this.ordenesCache.filter((orden) => {
      const cumpleEstado = !filtroEstado || orden.estado === filtroEstado;
      const cumpleTecnico =
        !filtroTecnico || String(orden.tecnico_asignado_id || '') === filtroTecnico;

      let cumpleFecha = true;
      if (filtroFechaDesde || filtroFechaHasta) {
        const fechaOrden = new Date(orden.fecha_recepcion);
        if (filtroFechaDesde) {
          cumpleFecha = cumpleFecha && fechaOrden >= new Date(filtroFechaDesde);
        }
        if (filtroFechaHasta) {
          cumpleFecha = cumpleFecha && fechaOrden <= new Date(filtroFechaHasta);
        }
      }

      return cumpleEstado && cumpleTecnico && cumpleFecha;
    });

    this.renderizarListaOrdenes(ordenesFiltradas);
  },

  /**
   * Toggle dropdown menu
   */
  toggleDropdown(button) {
    const dropdown = button.nextElementSibling;
    dropdown.classList.toggle('show');

    // Cerrar otros dropdowns
    document.querySelectorAll('.dropdown-menu.show').forEach((menu) => {
      if (menu !== dropdown) {
        menu.classList.remove('show');
      }
    });
  },

  /**
   * Muestra el formulario para crear/editar orden de trabajo
   */
  async mostrarFormulario(ordenId = null, vehiculoPrecargado = null) {
    const titulo = ordenId ? 'Editar Orden de Trabajo' : 'Nueva Orden de Trabajo';
    let orden = {};

    if (ordenId) {
      try {
        orden = await this.fetchOrdenTrabajoById(ordenId);
      } catch (error) {
        console.error('Error cargando datos de la orden:', error);
        Utils.showToast('Error al cargar datos de la orden', 'error');
        return;
      }
    }

    let clientes = [];
    let tecnicos = [];

    try {
      const [clientesResp, tecnicosResp] = await Promise.all([
        this.fetchClientes(),
        this.fetchTecnicos(),
      ]);
      clientes = Array.isArray(clientesResp) ? clientesResp : [];
      tecnicos = Array.isArray(tecnicosResp) ? tecnicosResp : [];
    } catch (error) {
      console.error('Error cargando catálogos base para órdenes:', error);
      Utils.showToast('No se pudo cargar la información necesaria', 'error');
      return;
    }

    clientes.sort((a, b) =>
      (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
    );
    tecnicos.sort((a, b) =>
      (a.nombre || a.username || '').localeCompare(b.nombre || b.username || '', 'es', {
        sensitivity: 'base',
      })
    );

    const sanitize = (valor) => {
      if (typeof Utils !== 'undefined' && typeof Utils.sanitize === 'function') {
        return Utils.sanitize(valor);
      }
      return (valor || '').toString();
    };

    const modal = `
            <div class="modal-overlay" id="modal-orden-trabajo">
                <div class="modal-content extra-large">
                    <div class="modal-header">
                        <h3><i class="fas fa-tools"></i> ${titulo}</h3>
                        <button class="modal-close" onclick="Utils.closeModal('modal-orden-trabajo')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <form id="form-orden-trabajo" onsubmit="OrdenesTrabajo.guardarOrden(event, '${ordenId || ''}')">
                        <div class="modal-body">
                            <div class="form-tabs">
                                <div class="tab-buttons">
                                    <button type="button" class="tab-btn active" data-tab="cliente-vehiculo">Cliente y Vehículo</button>
                                    <button type="button" class="tab-btn" data-tab="trabajo">Detalles del Trabajo</button>
                                    <button type="button" class="tab-btn" data-tab="repuestos">Repuestos y Servicios</button>
                                    <button type="button" class="tab-btn" data-tab="observaciones">Observaciones</button>
                                </div>
                                
                                <div class="tab-content active" id="tab-cliente-vehiculo">
                                    <div class="form-sections">
                                        <div class="form-section">
                                            <h4><i class="fas fa-user"></i> Datos del Cliente</h4>
                                            <div class="form-row">
                                                <div class="form-group">
                                                    <label for="clienteId">Cliente *</label>
                                                    <select id="clienteId" name="clienteId" required onchange="OrdenesTrabajo.cargarVehiculosCliente(this.value)">
                                                        <option value="">Seleccionar cliente</option>
                                                        ${clientes
                                                          .map(
                                                            (c) => `
                                                            <option value="${c.id}" ${c.id === orden.cliente_id ? 'selected' : ''}>
                                                                ${sanitize(c.nombre)} - ${sanitize(c.telefono || 'Sin teléfono')}
                                                            </option>
                                                        `
                                                          )
                                                          .join('')}
                                                    </select>
                                                    <small>¿Cliente nuevo? <a href="#" onclick="Clientes.mostrarFormulario(); Utils.closeModal('modal-orden-trabajo')">Registrar cliente</a></small>
                                                </div>
                                                <div class="form-group">
                                                    <label for="clienteContacto">Teléfono de contacto</label>
                                                    <input type="tel" id="clienteContacto" name="clienteContacto" 
                                                           value="${sanitize(orden.cliente_telefono || orden.cliente_contacto || '')}" 
                                                           placeholder="Teléfono para notificaciones">
                                                </div>
                                            </div>
                                        </div>

                                        <div class="form-section">
                                            <h4><i class="fas fa-car"></i> Datos del Vehículo</h4>
                                            <div class="form-row">
                                                <div class="form-group">
                                                    <label for="vehiculoId">Vehículo</label>
                                                    <select id="vehiculoId" name="vehiculoId">
                                                        <option value="">Seleccionar vehículo registrado</option>
                                                    </select>
                                                    <small>¿Vehículo nuevo? Complete los datos manualmente</small>
                                                </div>
                                                <div class="form-group">
                                                    <label for="vehiculoPlaca">Placa *</label>
                                                    <input type="text" id="vehiculoPlaca" name="vehiculoPlaca" 
                                                           value="${sanitize(vehiculoPrecargado?.placa || orden.vehiculo_placa || '')}" 
                                                           required style="text-transform: uppercase;">
                                                </div>
                                            </div>
                                            
                                            <div class="form-row">
                                                <div class="form-group">
                                                    <label for="vehiculoMarca">Marca *</label>
                                                    <input type="text" id="vehiculoMarca" name="vehiculoMarca" 
                                                           value="${sanitize(vehiculoPrecargado?.marca || orden.vehiculo_marca || '')}" 
                                                           required>
                                                </div>
                                                <div class="form-group">
                                                    <label for="vehiculoModelo">Modelo *</label>
                                                    <input type="text" id="vehiculoModelo" name="vehiculoModelo" 
                                                           value="${sanitize(vehiculoPrecargado?.modelo || orden.vehiculo_modelo || '')}" 
                                                           required>
                                                </div>
                                                <div class="form-group">
                                                    <label for="vehiculoAnio">Año</label>
                                                    <input type="number" id="vehiculoAnio" name="vehiculoAnio" 
                                                           value="${sanitize(vehiculoPrecargado?.anio || orden.vehiculo_anio || '')}" 
                                                           min="1990" max="${new Date().getFullYear() + 1}">
                                                </div>
                                            </div>

                                            <div class="form-row">
                                                <div class="form-group">
                                                    <label for="kilometraje">Kilometraje Actual</label>
                                                    <input type="number" id="kilometraje" name="kilometraje" 
                                                           value="${sanitize(orden.kilometraje || '')}" 
                                                           placeholder="Kilometraje al momento del ingreso">
                                                </div>
                                                <div class="form-group">
                                                    <label for="combustible">Nivel de Combustible</label>
                                                    <select id="combustible" name="combustible">
                                                        <option value="">No especificado</option>
                                                        <option value="vacio" ${orden.combustible === 'vacio' ? 'selected' : ''}>Vacío</option>
                                                        <option value="1/4" ${orden.combustible === '1/4' ? 'selected' : ''}>1/4</option>
                                                        <option value="1/2" ${orden.combustible === '1/2' ? 'selected' : ''}>1/2</option>
                                                        <option value="3/4" ${orden.combustible === '3/4' ? 'selected' : ''}>3/4</option>
                                                        <option value="lleno" ${orden.combustible === 'lleno' ? 'selected' : ''}>Lleno</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="tab-content" id="tab-trabajo">
                                    <div class="form-sections">
                                        <div class="form-section">
                                            <h4><i class="fas fa-wrench"></i> Información del Trabajo</h4>
                                            <div class="form-group">
                                                <label for="problemaReportado">Problema Reportado por el Cliente *</label>
                                                <textarea id="problemaReportado" name="problemaReportado" rows="3" required
                                                          placeholder="Describe el problema o síntoma reportado por el cliente...">${sanitize(orden.problema_reportado || '')}</textarea>
                                            </div>
                                            
                                            <div class="form-group">
                                                <label for="diagnosticoInicial">Diagnóstico Inicial</label>
                                                <textarea id="diagnosticoInicial" name="diagnosticoInicial" rows="3"
                                                          placeholder="Diagnóstico inicial del técnico...">${sanitize(orden.diagnostico_inicial || '')}</textarea>
                                            </div>

                                            <div class="form-row">
                                                <div class="form-group">
                                                    <label for="tecnicoAsignadoId">Técnico Asignado</label>
                                                    <select id="tecnicoAsignadoId" name="tecnicoAsignadoId">
                                                        <option value="">Asignar más tarde</option>
                                                        ${tecnicos
                                                          .map(
                                                            (t) => `
                                                            <option value="${t.id}" ${t.id === orden.tecnico_asignado_id ? 'selected' : ''}>
                                                                ${sanitize(t.nombre || t.username || 'Técnico')} - ${sanitize(t.especialidad || 'General')}
                                                            </option>
                                                        `
                                                          )
                                                          .join('')}
                                                    </select>
                                                </div>
                                                <div class="form-group">
                                                    <label for="prioridad">Prioridad</label>
                                                    <select id="prioridad" name="prioridad">
                                                        <option value="normal" ${orden.prioridad === 'normal' ? 'selected' : ''}>Normal</option>
                                                        <option value="alta" ${orden.prioridad === 'alta' ? 'selected' : ''}>Alta</option>
                                                        <option value="urgente" ${orden.prioridad === 'urgente' ? 'selected' : ''}>Urgente</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div class="form-row">
                                                <div class="form-group">
                                                    <label for="fechaEntregaEstimada">Fecha de Entrega Estimada</label>
                                                    <input type="date" id="fechaEntregaEstimada" name="fechaEntregaEstimada" 
                                                           value="${orden.fecha_entrega_estimada ? orden.fecha_entrega_estimada.split('T')[0] : ''}">
                                                </div>
                                                <div class="form-group">
                                                    <label for="presupuestoEstimado">Presupuesto Estimado</label>
                                                    <input type="number" id="presupuestoEstimado" name="presupuestoEstimado" 
                                                           value="${sanitize(orden.presupuesto_estimado || '')}" 
                                                           step="0.01" placeholder="0.00">
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="tab-content" id="tab-repuestos">
                                    <div class="form-sections">
                                        <div class="form-section">
                                            <h4><i class="fas fa-cogs"></i> Repuestos y Servicios</h4>
                                            <div id="items-orden">
                                                <div class="items-header">
                                                    <button type="button" class="btn btn-sm btn-primary" onclick="OrdenesTrabajo.agregarItem()">
                                                        <i class="fas fa-plus"></i> Agregar Item
                                                    </button>
                                                </div>
                                                <div id="lista-items">
                                                    <!-- Los items se cargarán dinámicamente -->
                                                </div>
                                                <div class="totales-section">
                                                    <div class="total-row">
                                                        <span>Subtotal:</span>
                                                        <span id="subtotal-orden">$0.00</span>
                                                    </div>
                                                    <div class="total-row">
                                                        <span>IVA (${this.getIvaConfig()}%):</span>
                                                        <span id="iva-orden">$0.00</span>
                                                    </div>
                                                    <div class="total-row final">
                                                        <span>Total:</span>
                                                        <span id="total-orden">$0.00</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="tab-content" id="tab-observaciones">
                                    <div class="form-sections">
                                        <div class="form-section">
                                            <h4><i class="fas fa-sticky-note"></i> Observaciones Adicionales</h4>
                                            <div class="form-group">
                                                <label for="observacionesInternas">Observaciones Internas</label>
                                                <textarea id="observacionesInternas" name="observacionesInternas" rows="4"
                                                          placeholder="Notas internas del taller...">${sanitize(orden.observaciones_internas || '')}</textarea>
                                            </div>
                                            
                                            <div class="form-group">
                                                <label for="instruccionesCliente">Instrucciones del Cliente</label>
                                                <textarea id="instruccionesCliente" name="instruccionesCliente" rows="3"
                                                          placeholder="Instrucciones específicas del cliente...">${sanitize(orden.instrucciones_cliente || '')}</textarea>
                                            </div>

                                            <div class="form-row">
                                                <div class="form-group">
                                                    <div class="checkbox-group">
                                                        <input type="checkbox" id="requiereContacto" name="requiereContacto" 
                                                               ${orden.requiere_contacto ? 'checked' : ''}>
                                                        <label for="requiereContacto">Requiere contacto antes de proceder</label>
                                                    </div>
                                                </div>
                                                <div class="form-group">
                                                    <div class="checkbox-group">
                                                        <input type="checkbox" id="notificarAvances" name="notificarAvances" 
                                                               ${orden.notificar_avances ? 'checked' : ''}>
                                                        <label for="notificarAvances">Notificar avances por WhatsApp</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="Utils.closeModal('modal-orden-trabajo')">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> ${ordenId ? 'Actualizar' : 'Crear'} Orden
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    document.body.insertAdjacentHTML('beforeend', modal);

    // Configurar tabs del formulario
    this.configurarTabsFormulario();

    const clienteSeleccionado =
      orden.cliente_id ||
      vehiculoPrecargado?.cliente_id ||
      document.getElementById('clienteId')?.value;
    const vehiculoSeleccionado = orden.vehiculo_id || vehiculoPrecargado?.id || null;

    if (clienteSeleccionado) {
      await this.cargarVehiculosCliente(clienteSeleccionado, vehiculoSeleccionado);
    }

    if (vehiculoPrecargado) {
      this.autocompletarVehiculo(vehiculoPrecargado);
    }

    if (ordenId && orden.items) {
      this.cargarItemsOrden(orden.items);
    }
  },

  /**
   * Configura las pestañas del formulario
   */
  configurarTabsFormulario() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        // Remover clase active de todos
        tabButtons.forEach((btn) => btn.classList.remove('active'));
        tabContents.forEach((content) => content.classList.remove('active'));

        // Agregar clase active al seleccionado
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(`tab-${tabId}`).classList.add('active');
      });
    });
  },

  /**
   * Carga los vehículos de un cliente específico
   */
  async cargarVehiculosCliente(clienteId, vehiculoSeleccionado = null) {
    if (!clienteId) return;

    try {
      const vehiculosResp = await this.fetchVehiculosByCliente(clienteId);
      const vehiculos = Array.isArray(vehiculosResp) ? vehiculosResp : [];
      const selectVehiculo = document.getElementById('vehiculoId');
      if (!selectVehiculo) return;

      const sanitize = (valor) => {
        if (typeof Utils !== 'undefined' && typeof Utils.sanitize === 'function') {
          return Utils.sanitize(valor);
        }
        return (valor || '').toString();
      };

      const valorPrevio = vehiculoSeleccionado || selectVehiculo.value;
      selectVehiculo.innerHTML = '<option value="">Seleccionar vehículo registrado</option>';

      vehiculos.forEach((vehiculo) => {
        selectVehiculo.innerHTML += `
                    <option value="${vehiculo.id}">
                        ${sanitize(vehiculo.placa)} - ${sanitize(vehiculo.marca)} ${sanitize(vehiculo.modelo)} (${sanitize(vehiculo.anio || 'S/A')})
                    </option>
                `;
      });

      const valorSeleccion = valorPrevio ? String(valorPrevio) : '';
      if (valorSeleccion) {
        selectVehiculo.value = valorSeleccion;
        const vehiculoData = vehiculos.find((v) => String(v.id) === valorSeleccion);
        if (vehiculoData) {
          this.autocompletarVehiculo(vehiculoData);
        }
      }

      selectVehiculo.onchange = (e) => {
        const vehiculoData = vehiculos.find((v) => String(v.id) === e.target.value);
        if (vehiculoData) {
          this.autocompletarVehiculo(vehiculoData);
        }
      };
    } catch (error) {
      console.error('Error cargando vehículos del cliente:', error);
      Utils.showToast('No se pudieron cargar los vehículos del cliente', 'error');
    }
  },

  /**
   * Autocompleta los datos del vehículo seleccionado
   */
  autocompletarVehiculo(vehiculo) {
    document.getElementById('vehiculoPlaca').value = vehiculo.placa || '';
    document.getElementById('vehiculoMarca').value = vehiculo.marca || '';
    document.getElementById('vehiculoModelo').value = vehiculo.modelo || '';
    document.getElementById('vehiculoAnio').value = vehiculo.anio || '';
    document.getElementById('kilometraje').value = vehiculo.kilometraje || '';
  },

  /**
   * Agrega un item a la orden de trabajo
   */
  agregarItem() {
    const listaItems = document.getElementById('lista-items');
    const itemIndex = listaItems.children.length;

    const itemHtml = `
            <div class="item-row" data-index="${itemIndex}">
                <div class="item-controls">
                    <select name="items[${itemIndex}][tipo]" class="form-control item-tipo" onchange="OrdenesTrabajo.cambiarTipoItem(this)">
                        <option value="repuesto">Repuesto</option>
                        <option value="servicio">Servicio</option>
                        <option value="mano_obra">Mano de Obra</option>
                    </select>
                </div>
                <div class="item-controls">
                    <input type="text" name="items[${itemIndex}][descripcion]" class="form-control" 
                           placeholder="Descripción del item" required>
                </div>
                <div class="item-controls">
                    <input type="number" name="items[${itemIndex}][cantidad]" class="form-control item-cantidad" 
                           value="1" min="0.1" step="0.1" onchange="OrdenesTrabajo.calcularTotales()">
                </div>
                <div class="item-controls">
                    <input type="number" name="items[${itemIndex}][precio_unitario]" class="form-control item-precio" 
                           placeholder="0.00" step="0.01" onchange="OrdenesTrabajo.calcularTotales()">
                </div>
                <div class="item-controls">
                    <span class="item-total">$0.00</span>
                </div>
                <div class="item-controls">
                    <button type="button" class="btn btn-sm btn-danger" onclick="OrdenesTrabajo.eliminarItem(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

    listaItems.insertAdjacentHTML('beforeend', itemHtml);
  },

  /**
   * Elimina un item de la orden
   */
  eliminarItem(button) {
    button.closest('.item-row').remove();
    this.calcularTotales();
  },

  /**
   * Cambia el tipo de item (repuesto/servicio/mano de obra)
   */
  cambiarTipoItem(select) {
    // Aquí se pueden agregar lógicas específicas según el tipo
    this.calcularTotales();
  },

  /**
   * Calcula los totales de la orden
   */
  calcularTotales() {
    const items = document.querySelectorAll('.item-row');
    let subtotal = 0;

    items.forEach((item) => {
      const cantidad = parseFloat(item.querySelector('.item-cantidad').value) || 0;
      const precio = parseFloat(item.querySelector('.item-precio').value) || 0;
      const total = cantidad * precio;

      item.querySelector('.item-total').textContent = this.formatearMoneda(total);
      subtotal += total;
    });

    const iva = subtotal * 0.19; // 19% de IVA
    const total = subtotal + iva;

    document.getElementById('subtotal-orden').textContent = this.formatearMoneda(subtotal);
    document.getElementById('iva-orden').textContent = this.formatearMoneda(iva);
    document.getElementById('total-orden').textContent = this.formatearMoneda(total);
  },

  /**
   * Carga los items de una orden existente
   */
  cargarItemsOrden(items) {
    const listaItems = document.getElementById('lista-items');
    listaItems.innerHTML = '';

    items.forEach((item, index) => {
      this.agregarItem();
      const itemRow = listaItems.lastElementChild;

      itemRow.querySelector(`select[name="items[${index}][tipo]"]`).value = item.tipo;
      itemRow.querySelector(`input[name="items[${index}][descripcion]"]`).value = item.descripcion;
      itemRow.querySelector(`input[name="items[${index}][cantidad]"]`).value = item.cantidad;
      itemRow.querySelector(`input[name="items[${index}][precio_unitario]"]`).value =
        item.precio_unitario;
    });

    this.calcularTotales();
  },

  /**
   * Guarda la orden de trabajo
   */
  async guardarOrden(event, ordenId) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const ordenData = Object.fromEntries(formData.entries());

    // Procesar items
    const items = [];
    const itemsData = {};

    // Agrupar datos de items
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('items[')) {
        const match = key.match(/items\[(\d+)\]\[(\w+)\]/);
        if (match) {
          const index = match[1];
          const field = match[2];
          if (!itemsData[index]) itemsData[index] = {};
          itemsData[index][field] = value;
        }
      }
    }

    // Convertir a array
    Object.values(itemsData).forEach((item) => {
      if (item.descripcion && item.cantidad && item.precio_unitario) {
        items.push({
          tipo: item.tipo,
          descripcion: item.descripcion,
          cantidad: parseFloat(item.cantidad),
          precio_unitario: parseFloat(item.precio_unitario),
          total: parseFloat(item.cantidad) * parseFloat(item.precio_unitario),
        });
      }
    });

    // Calcular totales
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    ordenData.subtotal = subtotal;
    ordenData.iva = subtotal * 0.19;
    ordenData.total = subtotal + ordenData.iva;
    ordenData.requiereContacto = formData.has('requiereContacto');
    ordenData.notificarAvances = formData.has('notificarAvances');
    ordenData.items = items;

    Object.keys(ordenData).forEach((key) => {
      if (key.startsWith('items[')) {
        delete ordenData[key];
      }
    });

    const normalizarCampo = (key) => {
      if (ordenData[key] === '') {
        ordenData[key] = null;
      }
    };

    [
      'vehiculoId',
      'tecnicoAsignadoId',
      'clienteContacto',
      'vehiculoAnio',
      'kilometraje',
      'presupuestoEstimado',
    ].forEach(normalizarCampo);

    if (!ordenId) {
      ordenData.estado = ordenData.estado || 'recibido';
    } else {
      delete ordenData.estado;
    }

    try {
      const payload = {
        ...ordenData,
        items,
        subtotal,
        iva: ordenData.iva,
        total: ordenData.total,
        requiereContacto: ordenData.requiereContacto,
        notificarAvances: ordenData.notificarAvances,
      };

      const result = ordenId
        ? await this.updateOrdenTrabajoRegistro(ordenId, payload)
        : await this.createOrdenTrabajo(payload);

      if (result?.success === false) {
        throw new Error(result.message || 'No se pudo guardar la orden de trabajo.');
      }

      Utils.showToast(
        ordenId ? 'Orden actualizada exitosamente' : 'Orden creada exitosamente',
        'success'
      );
      Utils.closeModal('modal-orden-trabajo');

      // Actualizar sin recargar página
      if (window.DataRefreshManager) {
        await this.cargarOrdenes();
      } else {
        await this.cargarOrdenes();
      }

      if (!ordenId && ordenData.fechaEntregaEstimada) {
        const nuevaOrdenId = result?.orden?.id || result?.ordenId || null;
        if (nuevaOrdenId) {
          this.crearRecordatorioAutomatico(nuevaOrdenId, ordenData.fechaEntregaEstimada);
        }
      }
    } catch (error) {
      console.error('Error guardando orden:', error);
      Utils.showToast('Error al guardar orden: ' + error.message, 'error');
    }
  },

  /**
   * Carga la lista de técnicos
   */
  async cargarTecnicos() {
    try {
      let tecnicos = await this.fetchTecnicos();
      tecnicos = Array.isArray(tecnicos) ? tecnicos : [];
      this.tecnicosCache = tecnicos;

      const filtroTecnico = document.getElementById('filtro-tecnico');
      if (filtroTecnico) {
        const valorPrevio = filtroTecnico.value;
        filtroTecnico.innerHTML = '<option value="">Todos los técnicos</option>';

        const sanitize = (valor) => {
          if (typeof Utils !== 'undefined' && typeof Utils.sanitize === 'function') {
            return Utils.sanitize(valor);
          }
          return (valor || '').toString();
        };

        tecnicos.forEach((tecnico) => {
          const nombre = tecnico.nombre || tecnico.username || 'Técnico';
          filtroTecnico.innerHTML += `
                        <option value="${tecnico.id}">${sanitize(nombre)}</option>
                    `;
        });

        if (valorPrevio) {
          filtroTecnico.value = valorPrevio;
        }
      }
    } catch (error) {
      console.error('Error cargando técnicos:', error);
      Utils.showToast('No se pudieron cargar los técnicos', 'error');
    }
  },
  /**
   * Funciones para cambio de estados de órdenes
   */
  async iniciarTrabajo(ordenId) {
    await this.cambiarEstadoOrden(ordenId, 'en_proceso', 'Trabajo iniciado');
  },

  async esperarRepuestos(ordenId) {
    await this.cambiarEstadoOrden(ordenId, 'espera_repuestos', 'Orden en espera de repuestos');
  },

  async reanudarTrabajo(ordenId) {
    await this.cambiarEstadoOrden(ordenId, 'en_proceso', 'Trabajo reanudado');
  },

  async finalizarOrden(ordenId) {
    const confirmacion = await Utils.confirm(
      '¿Finalizar Orden?',
      '¿Está seguro de que el trabajo ha sido completado?',
      'Finalizar'
    );

    if (confirmacion) {
      await this.cambiarEstadoOrden(ordenId, 'finalizado', 'Trabajo finalizado');
    }
  },

  async entregarVehiculo(ordenId) {
    const confirmacion = await Utils.confirm(
      '¿Entregar Vehículo?',
      '¿Confirma que el vehículo será entregado al cliente?',
      'Entregar'
    );

    if (confirmacion) {
      await this.cambiarEstadoOrden(ordenId, 'entregado', 'Vehículo entregado');
    }
  },

  /**
   * Cambia el estado de una orden de trabajo
   */
  async cambiarEstadoOrden(ordenId, nuevoEstado, mensaje) {
    try {
      const result = await this.updateEstadoOrdenTrabajoRegistro(ordenId, {
        estado: nuevoEstado,
        fecha_cambio: new Date().toISOString(),
        observacion: mensaje,
      });

      if (result?.success === false) {
        throw new Error(result.message || 'No se pudo actualizar el estado de la orden.');
      }

      Utils.showToast(mensaje, 'success');
      await this.cargarOrdenes();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      Utils.showToast('Error al cambiar estado de la orden', 'error');
    }
  },

  /**
   * Ver detalles completos de una orden de trabajo
   */
  async verDetalle(ordenId) {
    try {
      const orden = await this.fetchOrdenTrabajoById(ordenId);

      const modal = `
                <div class="modal-overlay" id="modal-detalle-orden">
                    <div class="modal-content extra-large">
                        <div class="modal-header">
                            <h3><i class="fas fa-tools"></i> Orden de Trabajo #${orden.numero}</h3>
                            <button class="modal-close" onclick="Utils.closeModal('modal-detalle-orden')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="modal-body">
                            <div class="detail-sections">
                                ${this.renderizarDetalleOrden(orden)}
                            </div>
                        </div>
                        
                        <div class="modal-footer">
                            <button class="btn btn-primary" onclick="OrdenesTrabajo.editarOrden('${ordenId}'); Utils.closeModal('modal-detalle-orden')">
                                <i class="fas fa-edit"></i> Editar Orden
                            </button>
                            <button class="btn btn-info" onclick="OrdenesTrabajo.imprimirOrden('${ordenId}')">
                                <i class="fas fa-print"></i> Imprimir
                            </button>
                            <button class="btn btn-secondary" onclick="Utils.closeModal('modal-detalle-orden')">
                                <i class="fas fa-times"></i> Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            `;

      document.body.insertAdjacentHTML('beforeend', modal);
    } catch (error) {
      console.error('Error cargando detalle de la orden:', error);
      Utils.showToast('Error al cargar información de la orden', 'error');
    }
  },

  /**
   * Renderiza el detalle completo de una orden
   */
  renderizarDetalleOrden(orden) {
    const sanitize = (valor) => {
      if (typeof Utils !== 'undefined' && typeof Utils.sanitize === 'function') {
        return Utils.sanitize(valor);
      }
      return (valor || '').toString();
    };
    return `
            <div class="detail-grid">
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> Información General</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Número de Orden:</label>
                            <span>#${orden.numero}</span>
                        </div>
                        <div class="info-item">
                            <label>Estado:</label>
                            <span class="badge badge-${this.obtenerEstadoInfo(orden.estado).clase}">
                                ${this.obtenerEstadoInfo(orden.estado).texto}
                            </span>
                        </div>
                        <div class="info-item">
                            <label>Fecha de Recepción:</label>
                            <span>${new Date(orden.fecha_recepcion).toLocaleDateString()}</span>
                        </div>
                        <div class="info-item">
                            <label>Entrega Estimada:</label>
                            <span>${orden.fecha_entrega_estimada ? new Date(orden.fecha_entrega_estimada).toLocaleDateString() : 'No definida'}</span>
                        </div>
                        <div class="info-item">
                            <label>Técnico Asignado:</label>
                            <span>${sanitize(orden.tecnico_nombre || 'Sin asignar')}</span>
                        </div>
                        <div class="info-item">
                            <label>Prioridad:</label>
                            <span class="priority-badge ${orden.prioridad}">${orden.prioridad || 'Normal'}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4><i class="fas fa-user"></i> Cliente</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Nombre:</label>
                            <span>${sanitize(orden.cliente_nombre)}</span>
                        </div>
                        <div class="info-item">
                            <label>Teléfono:</label>
                            <span>${sanitize(orden.cliente_telefono || 'No registrado')}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4><i class="fas fa-car"></i> Vehículo</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Placa:</label>
                            <span>${sanitize(orden.vehiculo_placa)}</span>
                        </div>
                        <div class="info-item">
                            <label>Marca/Modelo:</label>
                            <span>${sanitize(`${orden.vehiculo_marca || ''} ${orden.vehiculo_modelo || ''}`)}</span>
                        </div>
                        <div class="info-item">
                            <label>Año:</label>
                            <span>${sanitize(orden.vehiculo_anio || 'No especificado')}</span>
                        </div>
                        <div class="info-item">
                            <label>Kilometraje:</label>
                            <span>${sanitize(orden.kilometraje ? `${orden.kilometraje.toLocaleString()} km` : 'No registrado')}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4><i class="fas fa-wrench"></i> Trabajo Realizado</h4>
                    <div class="trabajo-detalle">
                        <div class="info-item full-width">
                            <label>Problema Reportado:</label>
                            <p>${sanitize(orden.problema_reportado)}</p>
                        </div>
                        ${
                          orden.diagnostico_inicial
                            ? `
                            <div class="info-item full-width">
                                <label>Diagnóstico:</label>
                                <p>${sanitize(orden.diagnostico_inicial)}</p>
                            </div>
                        `
                            : ''
                        }
                    </div>
                </div>

                ${
                  orden.items && orden.items.length > 0
                    ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-list"></i> Repuestos y Servicios</h4>
                        <div class="table-responsive">
                            <table class="mini-table">
                                <thead>
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Descripción</th>
                                        <th>Cantidad</th>
                                        <th>Precio Unit.</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${orden.items
                                      .map(
                                        (item) => `
                                        <tr>
                                            <td><span class="badge badge-info">${sanitize(item.tipo)}</span></td>
                                            <td>${sanitize(item.descripcion)}</td>
                                            <td>${item.cantidad}</td>
                                            <td>${this.formatearMoneda(item.precio_unitario)}</td>
                                            <td>${this.formatearMoneda(item.cantidad * item.precio_unitario)}</td>
                                        </tr>
                                    `
                                      )
                                      .join('')}
                                </tbody>
                                <tfoot>
                                    <tr class="total-row">
                                        <td colspan="4"><strong>Total:</strong></td>
                                        <td><strong>${this.formatearMoneda(orden.total)}</strong></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                `
                    : ''
                }
            </div>
        `;
  },

  /**
   * Editar orden de trabajo
   */
  editarOrden(ordenId) {
    this.mostrarFormulario(ordenId);
  },

  /**
   * Crear recordatorio para una orden
   */
  async crearRecordatorio(ordenId) {
    Utils.showToast('Función de recordatorios en desarrollo', 'info');
  },

  /**
   * Crear recordatorio automático
   */
  async crearRecordatorioAutomatico(ordenId, fechaEntrega) {
    try {
      const recordatorio = {
        titulo: `Entrega de vehículo - Orden #${ordenId}`,
        descripcion: `Recordatorio: Vehículo listo para entrega`,
        fecha: fechaEntrega,
        tipo: 'entrega',
        orden_trabajo_id: ordenId,
      };

      await this.registrarRecordatorio(recordatorio);
    } catch (error) {
      console.error('Error creando recordatorio automático:', error);
    }
  },

  /**
   * Imprimir orden de trabajo
   */
  async imprimirOrden(ordenId) {
    try {
      const orden = await this.fetchOrdenTrabajoById(ordenId);
      const items = Array.isArray(orden.items) ? orden.items : [];
      const formatMoney = (value) => this.formatearMoneda(value).replace(/\u00a0/g, ' ');
      const sanitize = (value) => {
        if (typeof Utils !== 'undefined' && typeof Utils.sanitize === 'function') {
          return Utils.sanitize(value);
        }
        return (value || '').toString();
      };
      const formatDate = (value) =>
        value ? new Date(value).toLocaleDateString() : 'No especificada';

      const itemsRows = items
        .map(
          (item) => `
                <tr>
                    <td>${sanitize(item.descripcion)}</td>
                    <td>${sanitize(item.cantidad)}</td>
                    <td>${formatMoney(item.precio_unitario)}</td>
                    <td>${formatMoney(item.cantidad * item.precio_unitario)}</td>
                </tr>
            `
        )
        .join('');

      const itemsSection = items.length
        ? `
                <div class="section">
                    <h3>Repuestos y Servicios</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Descripción</th>
                                <th>Cantidad</th>
                                <th>Precio Unit.</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3"><strong>Total:</strong></td>
                                <td><strong>${formatMoney(orden.total)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `
        : '';

      const htmlContent = `
                <html>
                    <head>
                        <title>Orden de Trabajo #${sanitize(orden.numero)}</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
                            .section { margin: 20px 0; }
                            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                            .info-item { margin: 5px 0; }
                            .label { font-weight: bold; }
                            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; }
                            @media print { body { margin: 0; } }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>ORDEN DE TRABAJO</h1>
                            <h2>#${sanitize(orden.numero)}</h2>
                        </div>
                        
                        <div class="section">
                            <h3>Información General</h3>
                            <div class="info-grid">
                                <div class="info-item"><span class="label">Fecha:</span> ${formatDate(orden.fecha_recepcion)}</div>
                                <div class="info-item"><span class="label">Estado:</span> ${sanitize(this.obtenerEstadoInfo(orden.estado).texto)}</div>
                                <div class="info-item"><span class="label">Cliente:</span> ${sanitize(orden.cliente_nombre)}</div>
                                <div class="info-item"><span class="label">Teléfono:</span> ${sanitize(orden.cliente_telefono || 'No registrado')}</div>
                            </div>
                        </div>

                        <div class="section">
                            <h3>Vehículo</h3>
                            <div class="info-grid">
                                <div class="info-item"><span class="label">Placa:</span> ${sanitize(orden.vehiculo_placa || '')}</div>
                                <div class="info-item"><span class="label">Marca/Modelo:</span> ${sanitize(`${orden.vehiculo_marca || ''} ${orden.vehiculo_modelo || ''}`)}</div>
                                <div class="info-item"><span class="label">Año:</span> ${sanitize(orden.vehiculo_anio || 'No especificado')}</div>
                                <div class="info-item"><span class="label">Kilometraje:</span> ${sanitize(orden.kilometraje || 'No registrado')}</div>
                            </div>
                        </div>

                        <div class="section">
                            <h3>Trabajo a Realizar</h3>
                            <p><span class="label">Problema Reportado:</span><br>${sanitize(orden.problema_reportado)}</p>
                            ${orden.diagnostico_inicial ? `<p><span class="label">Diagnóstico:</span><br>${sanitize(orden.diagnostico_inicial)}</p>` : ''}
                        </div>

                        ${itemsSection}
                        
                        <div class="section" style="margin-top: 50px;">
                            <p>______________________ &nbsp;&nbsp;&nbsp;&nbsp; ______________________</p>
                            <p style="margin-left: 20px;">Firma Cliente &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Firma Técnico</p>
                        </div>
                    </body>
                </html>
            `;

      const ventanaImpresion = window.open('', '_blank');
      ventanaImpresion.document.write(htmlContent);
      ventanaImpresion.document.close();
      ventanaImpresion.print();
    } catch (error) {
      console.error('Error imprimiendo orden:', error);
      Utils.showToast('Error al generar impresión', 'error');
    }
  },

  /**
   * Duplicar orden de trabajo
   */
  async duplicarOrden(ordenId) {
    Utils.showToast('Función de duplicar orden en desarrollo', 'info');
  },

  /**
   * Eliminar orden de trabajo
   */
  async eliminarOrden(ordenId) {
    const confirmacion = await Utils.confirm(
      '¿Eliminar Orden?',
      'Esta acción no se puede deshacer. ¿Estás seguro?',
      'Eliminar'
    );

    if (!confirmacion) return;

    try {
      const result = await this.deleteOrdenTrabajoRegistro(ordenId);

      if (result?.success === false) {
        throw new Error(result.message || 'No se pudo eliminar la orden de trabajo.');
      }

      Utils.showToast('Orden eliminada exitosamente', 'success');

      // Actualizar sin recargar página
      if (window.DataRefreshManager) {
        await this.cargarOrdenes();
      } else {
        await this.cargarOrdenes();
      }
    } catch (error) {
      console.error('Error eliminando orden:', error);
      Utils.showToast('Error al eliminar orden: ' + error.message, 'error');
    }
  },

  async obtenerOrdenCompartible(ordenId) {
    const cacheKey = String(ordenId);
    if (this.shareCache.has(cacheKey)) {
      return this.shareCache.get(cacheKey);
    }

    const orden = await this.fetchOrdenTrabajoById(ordenId);
    if (!orden) {
      throw new Error('Orden no encontrada');
    }

    const resumen = this.generarResumenOrden(orden);
    const payload = { orden, resumen };
    this.shareCache.set(cacheKey, payload);
    return payload;
  },

  generarResumenOrden(orden) {
    const formatDate = (value) =>
      value ? new Date(value).toLocaleDateString() : 'No especificada';
    const formatMoney = (value) => this.formatearMoneda(value).replace(/\u00a0/g, ' ');

    const lines = [];
    lines.push(`ORDEN DE TRABAJO #${orden.numero || orden.id}`);
    lines.push(`Estado: ${this.obtenerEstadoInfo(orden.estado).texto}`);
    lines.push(`Cliente: ${orden.cliente_nombre || 'Sin cliente'}`);
    lines.push(`Contacto: ${orden.cliente_telefono || orden.clienteContacto || 'No registrado'}`);
    lines.push(
      `Vehículo: ${orden.vehiculo_marca || ''} ${orden.vehiculo_modelo || ''} (${orden.vehiculo_placa || 'Sin placa'})`.trim()
    );
    lines.push(`Técnico: ${orden.tecnico_nombre || 'Sin asignar'}`);
    lines.push(`Recepción: ${formatDate(orden.fecha_recepcion)}`);
    lines.push(`Entrega estimada: ${formatDate(orden.fecha_entrega_estimada)}`);
    lines.push(`Total estimado: ${formatMoney(orden.total || 0)}`);
    lines.push('');

    if (orden.problema_reportado) {
      lines.push('Problema reportado:');
      lines.push(orden.problema_reportado);
      lines.push('');
    }

    if (orden.diagnostico_inicial) {
      lines.push('Diagnóstico inicial:');
      lines.push(orden.diagnostico_inicial);
      lines.push('');
    }

    if (Array.isArray(orden.items) && orden.items.length) {
      lines.push('Detalle de trabajo:');
      orden.items.slice(0, 20).forEach((item, index) => {
        const itemTotal =
          item.total !== undefined
            ? item.total
            : (item.cantidad || 0) * (item.precio_unitario || 0);
        lines.push(
          `${index + 1}. [${item.tipo || 'item'}] ${item.descripcion} x${item.cantidad} = ${formatMoney(itemTotal)}`
        );
      });
      if (orden.items.length > 20) {
        lines.push(`... (${orden.items.length - 20} items adicionales)`);
      }
      lines.push('');
    }

    if (orden.observaciones && orden.observaciones.trim()) {
      lines.push('Observaciones del cliente:');
      lines.push(orden.observaciones.trim());
      lines.push('');
    }

    if (orden.observaciones_internas && orden.observaciones_internas.trim()) {
      lines.push('Notas internas:');
      lines.push(orden.observaciones_internas.trim());
      lines.push('');
    }

    lines.push('Gracias por confiar en nuestro taller.');
    return lines.join('\n');
  },

  async mostrarOpcionesCompartir(ordenId) {
    try {
      if (document.getElementById('modal-compartir-orden')) {
        Utils.closeModal('modal-compartir-orden');
      }
      const { orden, resumen } = await this.obtenerOrdenCompartible(ordenId);
      const resumenEscapado =
        typeof Utils !== 'undefined' && typeof Utils.escapeHTML === 'function'
          ? Utils.escapeHTML(resumen)
          : resumen.replace(
              /[&<>]/g,
              (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] || char
            );

      const body = `
                <p>Selecciona la opción para compartir la orden de trabajo:</p>
                <div class="share-actions" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                    <button type="button" class="btn btn-success" onclick="OrdenesTrabajo.compartirPorWhatsApp('${ordenId}')">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                    <button type="button" class="btn btn-primary" onclick="OrdenesTrabajo.compartirPorSistema('${ordenId}')">
                        <i class="fas fa-share-alt"></i> Compartir
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="OrdenesTrabajo.copiarResumenOrden('${ordenId}')">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                    <button type="button" class="btn btn-info" onclick="OrdenesTrabajo.descargarResumenOrden('${ordenId}')">
                        <i class="fas fa-file-download"></i> Descargar TXT
                    </button>
                </div>
                <div class="share-preview" style="margin-top: 8px;">
                    <textarea readonly class="share-summary" style="width: 100%; min-height: 160px; padding: 10px; font-family: monospace;">${resumenEscapado}</textarea>
                </div>
                <p class="share-hint">Para enviar como PDF utiliza la opción Imprimir y guarda como PDF.</p>
            `;

      const footer = `
                <button class="btn btn-secondary" onclick="Utils.closeModal('modal-compartir-orden')">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            `;

      Utils.createModal(
        'modal-compartir-orden',
        `Compartir Orden #${orden.numero || orden.id}`,
        body,
        footer,
        'large'
      );
    } catch (error) {
      console.error('Error preparando orden para compartir:', error);
      Utils.showToast('No se pudo preparar la orden para compartir', 'error');
    }
  },

  async compartirPorWhatsApp(ordenId) {
    try {
      const { resumen } = await this.obtenerOrdenCompartible(ordenId);
      const url = `https://wa.me/?text=${encodeURIComponent(resumen)}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error al compartir por WhatsApp:', error);
      Utils.showToast('No se pudo abrir WhatsApp', 'error');
    }
  },

  async compartirPorSistema(ordenId) {
    try {
      const { orden, resumen } = await this.obtenerOrdenCompartible(ordenId);
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Orden de Trabajo #${orden.numero || ordenId}`,
            text: resumen,
          });
          Utils.showToast('Orden compartida', 'success');
        } catch (shareError) {
          if (shareError && shareError.name !== 'AbortError') {
            throw shareError;
          }
        }
      } else {
        await this.copiarResumenOrden(ordenId, { silent: true });
        Utils.showToast('Resumen copiado al portapapeles', 'info');
      }
    } catch (error) {
      console.error('Error al compartir orden:', error);
      Utils.showToast('No se pudo compartir la orden', 'error');
    }
  },

  async copiarResumenOrden(ordenId, options = {}) {
    try {
      const { resumen } = await this.obtenerOrdenCompartible(ordenId);
      const success = await Utils.copyToClipboard(resumen);
      if (!options.silent) {
        Utils.showToast(
          success ? 'Resumen copiado al portapapeles' : 'No se pudo copiar el resumen',
          success ? 'success' : 'error'
        );
      }
      return success;
    } catch (error) {
      console.error('Error al copiar resumen de la orden:', error);
      if (!options.silent) {
        Utils.showToast('No se pudo copiar el resumen', 'error');
      }
      return false;
    }
  },

  async descargarResumenOrden(ordenId) {
    try {
      const { orden, resumen } = await this.obtenerOrdenCompartible(ordenId);
      const numero = (orden.numero || ordenId || 'orden').toString();
      const filename = `orden-trabajo-${numero.replace(/[^a-z0-9_-]+/gi, '_')}.txt`;
      Utils.downloadFile(resumen, filename, 'text/plain');
      Utils.showToast('Resumen descargado correctamente', 'success');
    } catch (error) {
      console.error('Error al descargar el resumen:', error);
      Utils.showToast('No se pudo descargar el resumen', 'error');
    }
  },

  /**
   * Exportar reporte de órdenes
   */
  async exportarReporte() {
    Utils.showToast('Función de exportar reporte en desarrollo', 'info');
  },

  /**
   * Crear orden de trabajo con asistente IA conversacional
   */
  crearConIA() {
    // Verificar si el agente IA está disponible
    if (window.OrdenesTrabajoIAAgent && typeof OrdenesTrabajoIAAgent.abrirChat === 'function') {
      OrdenesTrabajoIAAgent.abrirChat();
    } else {
      // Fallback: cargar el agente dinámicamente o mostrar mensaje
      if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
        Utils.showToast('Cargando asistente IA...', 'info');
      }
      // Intentar inicializar si existe pero no está listo
      if (window.OrdenesTrabajoIAAgent && typeof OrdenesTrabajoIAAgent.init === 'function') {
        OrdenesTrabajoIAAgent.init();
        setTimeout(() => {
          if (typeof OrdenesTrabajoIAAgent.abrirChat === 'function') {
            OrdenesTrabajoIAAgent.abrirChat();
          }
        }, 100);
      } else {
        Utils.showToast?.(
          'El asistente IA no está disponible. Intenta recargar la página.',
          'warning'
        );
        this.mostrarFormulario();
      }
    }
  },

  /**
   * Actualizar estadísticas del dashboard
   */
  async actualizarEstadisticas() {
    if (!this.ordenesCache) return;

    const stats = {
      recibidas: 0,
      proceso: 0,
      espera: 0,
      completadas: 0,
    };

    this.ordenesCache.forEach((orden) => {
      switch (orden.estado) {
        case 'recibido':
          stats.recibidas++;
          break;
        case 'en_proceso':
          stats.proceso++;
          break;
        case 'espera_repuestos':
          stats.espera++;
          break;
        case 'finalizado':
        case 'entregado':
          stats.completadas++;
          break;
      }
    });

    // Actualizar elementos del DOM
    const elementos = {
      'ordenes-recibidas': stats.recibidas,
      'ordenes-proceso': stats.proceso,
      'ordenes-espera': stats.espera,
      'ordenes-completadas': stats.completadas,
    };

    Object.entries(elementos).forEach(([id, valor]) => {
      const elemento = document.getElementById(id);
      if (elemento) elemento.textContent = valor;
    });
  },
};

// Exponer globalmente
window.OrdenesTrabajo = OrdenesTrabajo;
