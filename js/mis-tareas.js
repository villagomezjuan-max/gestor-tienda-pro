// ============================================
// MÓDULO: MIS TAREAS
// ============================================
// MÓDULO: MIS TAREAS (TALLER MECÁNICO)
// Seguimiento profesional de órdenes asignadas al técnico actual.
// ============================================

const MisTareas = {
  state: {
    loading: false,
    tasks: [],
    filtered: [],
    metrics: null,
    lastError: null,
    lastSync: null,
  },
  filters: {
    estado: 'en_proceso',
    prioridad: 'todas',
    soloRetrasadas: false,
    search: '',
  },
  finalStates: new Set(['finalizado', 'entregado', 'cancelado']),
  dom: {
    lista: null,
    metricas: null,
    alertas: null,
    filtroEstado: null,
    filtroPrioridad: null,
    toggleRetrasadas: null,
    buscador: null,
  },
  searchDebounceTimer: null,

  render() {
    const estado = this.filters.estado;
    const prioridad = this.filters.prioridad;
    const checked = this.filters.soloRetrasadas ? 'checked' : '';

    return `
      <div class="page-header">
        <h2><i class="fas fa-tasks"></i> Mis Tareas</h2>
        <div class="header-actions">
          <button class="btn btn-secondary" data-mis-tareas-action="refresh" onclick="MisTareas.cargarTareas(true)">
            <i class="fas fa-sync"></i> Actualizar
          </button>
        </div>
      </div>

      <div class="module-toolbar" id="mis-tareas-toolbar">
        <div class="toolbar-grid">
          <div class="filter-group">
            <label for="misTareasFiltroEstado">Estado</label>
            <select id="misTareasFiltroEstado">
              <option value="todos"${estado === 'todos' ? ' selected' : ''}>Todos</option>
              <option value="recibido"${estado === 'recibido' ? ' selected' : ''}>Recibido</option>
              <option value="en_proceso"${estado === 'en_proceso' ? ' selected' : ''}>En proceso</option>
              <option value="espera_repuestos"${estado === 'espera_repuestos' ? ' selected' : ''}>Esperando repuestos</option>
              <option value="finalizado"${estado === 'finalizado' ? ' selected' : ''}>Finalizado</option>
              <option value="entregado"${estado === 'entregado' ? ' selected' : ''}>Entregado</option>
              <option value="cancelado"${estado === 'cancelado' ? ' selected' : ''}>Cancelado</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="misTareasFiltroPrioridad">Prioridad</label>
            <select id="misTareasFiltroPrioridad">
              <option value="todas"${prioridad === 'todas' ? ' selected' : ''}>Todas</option>
              <option value="urgente"${prioridad === 'urgente' ? ' selected' : ''}>Urgente</option>
              <option value="alta"${prioridad === 'alta' ? ' selected' : ''}>Alta</option>
              <option value="normal"${prioridad === 'normal' ? ' selected' : ''}>Normal</option>
            </select>
          </div>

          <div class="filter-group toggle-group">
            <label for="misTareasRetrasadas">Solo retrasadas</label>
            <label class="switch">
              <input type="checkbox" id="misTareasRetrasadas" ${checked}>
              <span class="slider round"></span>
            </label>
          </div>

          <div class="filter-group search-group">
            <label for="misTareasBuscador">Buscar</label>
            <div class="input-icon">
              <i class="fas fa-search"></i>
              <input type="search" id="misTareasBuscador" placeholder="Cliente, vehículo u orden..." value="${this.filters.search}">
            </div>
          </div>
        </div>
      </div>

      <!-- PANEL DEL ASISTENTE IA AUTÓNOMO -->
      <div id="asistente-ia-panel" class="asistente-panel hidden">
          <div class="asistente-header">
              <div class="asistente-avatar">
                  <i class="fas fa-robot"></i>
              </div>
              <div class="asistente-mensaje">
                  <h4 id="asistente-saludo">🤖 Asistente IA cargando...</h4>
                  <p id="asistente-resumen">Analizando tu carga de trabajo...</p>
              </div>
              <div class="asistente-actions">
                  <button class="btn btn-sm btn-ia-magic" onclick="MisTareas.mostrarPanelAvanzado()" title="📊 Ver Panel de Control IA Avanzado">
                      <i class="fas fa-brain"></i> Panel IA
                  </button>
                  <button class="btn btn-sm btn-outline-light" onclick="MisTareas.actualizarAnalisisIA()" title="Actualizar análisis">
                      <i class="fas fa-sync-alt"></i>
                  </button>
              </div>
          </div>
          <div class="asistente-sugerencias" id="asistente-sugerencias">
              <div class="sugerencia-chip"><i class="fas fa-spinner fa-spin"></i> Cargando métricas...</div>
          </div>
      </div>

      <div class="stats-grid compact" id="mis-tareas-metricas"></div>
      <div id="mis-tareas-alertas"></div>
      <div id="lista-mis-tareas" class="content-area"></div>
    `;
  },

  async init() {
    console.log('🛠️ Inicializando módulo de Mis Tareas...');
    this.injectStyles(); // Inyectar estilos del asistente
    if (window.Auth && typeof window.Auth.ready === 'function') {
      await window.Auth.ready();
    }
    this.cacheDomRefs();
    this.attachEventHandlers();

    // Inicializar Asistente IA si existe
    if (typeof window.AsistenteTareasIA !== 'undefined') {
      try {
        const briefing = await window.AsistenteTareasIA.init();
        this.renderAsistentePanel(briefing);

        // Escuchar actualizaciones en tiempo real
        window.addEventListener('asistente-ia:actualizacion', (e) => {
          this.actualizarAlertasIA(e.detail);
        });
      } catch (e) {
        console.error('Error iniciando Asistente IA:', e);
        this.renderErrorIA(e);
      }
    } else {
      console.warn('AsistenteTareasIA no está definido');
      this.renderErrorIA({
        message:
          'El módulo de IA no se cargó correctamente. Verifica tu conexión o recarga la página.',
      });
    }

    await this.cargarTareas();
  },

  cacheDomRefs() {
    this.dom.lista = document.getElementById('lista-mis-tareas');
    this.dom.metricas = document.getElementById('mis-tareas-metricas');
    this.dom.alertas = document.getElementById('mis-tareas-alertas');
    this.dom.filtroEstado = document.getElementById('misTareasFiltroEstado');
    this.dom.filtroPrioridad = document.getElementById('misTareasFiltroPrioridad');
    this.dom.toggleRetrasadas = document.getElementById('misTareasRetrasadas');
    this.dom.buscador = document.getElementById('misTareasBuscador');
  },

  attachEventHandlers() {
    if (this.dom.filtroEstado) {
      this.dom.filtroEstado.value = this.filters.estado;
      this.dom.filtroEstado.addEventListener('change', (event) => {
        this.filters.estado = event.target.value;
        this.refreshView();
      });
    }

    if (this.dom.filtroPrioridad) {
      this.dom.filtroPrioridad.value = this.filters.prioridad;
      this.dom.filtroPrioridad.addEventListener('change', (event) => {
        this.filters.prioridad = event.target.value;
        this.refreshView();
      });
    }

    if (this.dom.toggleRetrasadas) {
      this.dom.toggleRetrasadas.checked = this.filters.soloRetrasadas;
      this.dom.toggleRetrasadas.addEventListener('change', (event) => {
        this.filters.soloRetrasadas = event.target.checked;
        this.refreshView();
      });
    }

    if (this.dom.buscador) {
      this.dom.buscador.value = this.filters.search;
      this.dom.buscador.addEventListener('input', (event) => {
        const value = event.target.value || '';
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
          this.filters.search = value.trim();
          this.refreshView();
        }, 200);
      });
    }
  },

  getDataProvider() {
    if (
      typeof window.DatabaseAPI !== 'undefined' &&
      typeof window.DatabaseAPI.getOrdenesTrabajo === 'function'
    ) {
      return window.DatabaseAPI;
    }
    if (
      typeof window.Database !== 'undefined' &&
      typeof window.Database.getOrdenesTrabajo === 'function'
    ) {
      return window.Database;
    }
    return null;
  },

  getActiveSession() {
    if (typeof window.Auth === 'undefined') {
      return null;
    }
    try {
      if (typeof Auth.getSession === 'function') {
        return Auth.getSession();
      }
      if (Auth.session) {
        return Auth.session;
      }
    } catch (error) {
      console.warn('MisTareas: no se pudo obtener la sesión activa.', error);
    }
    return null;
  },

  async cargarTareas(force = false) {
    if (!this.dom.lista) {
      this.cacheDomRefs();
    }

    if (
      force &&
      typeof window.DatabaseAPI !== 'undefined' &&
      typeof window.DatabaseAPI.clearCache === 'function'
    ) {
      window.DatabaseAPI.clearCache();
    }

    this.setLoading(true);

    try {
      const session = this.getActiveSession();
      if (!session || !session.userId) {
        this.state.tasks = [];
        this.state.metrics = this.computeMetrics([]);
        this.state.lastError = null;
        this.renderMetrics();
        this.renderAlertas();
        this.renderEmptyState('Inicia sesión para ver tus órdenes asignadas.');
        return;
      }

      const dataProvider = this.getDataProvider();
      if (!dataProvider) {
        throw new Error('Servicio de órdenes no disponible.');
      }

      const userRole = (session.rol || '').toLowerCase();
      if (!['tecnico', 'mecanico', 'admin', 'superadmin'].includes(userRole)) {
        this.state.tasks = [];
        this.state.lastError = null;
        this.state.metrics = this.computeMetrics([]);
        this.refreshView();
        this.renderEmptyState(
          'Este panel solo muestra órdenes asignadas a técnicos, mecánicos o administradores.'
        );
        return;
      }

      const params = { tecnicoId: session.userId };
      const tareas = await dataProvider.getOrdenesTrabajo(params);
      this.state.tasks = Array.isArray(tareas) ? tareas : [];
      this.state.lastError = null;
      this.state.metrics = this.computeMetrics(this.state.tasks);
      this.state.lastSync = new Date();
      this.refreshView();
    } catch (error) {
      console.error('MisTareas: error al cargar tareas:', error);
      this.state.tasks = [];
      this.state.metrics = this.computeMetrics([]);
      this.state.lastError = error.message;
      this.refreshView();
    } finally {
      this.setLoading(false);
    }
  },

  setLoading(flag) {
    this.state.loading = flag;

    const refreshBtn = document.querySelector('[data-mis-tareas-action="refresh"]');
    if (refreshBtn) {
      refreshBtn.disabled = flag;
      refreshBtn.classList.toggle('is-loading', flag);
    }

    if (flag && this.dom.lista) {
      this.dom.lista.innerHTML =
        '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Sincronizando tus órdenes...</div>';
    }
  },

  refreshView() {
    this.state.filtered = this.applyFilters(this.state.tasks);
    this.renderMetrics();
    this.renderAlertas();
    this.renderTareas();
  },

  applyFilters(tasks) {
    let filtered = Array.isArray(tasks) ? [...tasks] : [];
    const estado = this.filters.estado;
    const prioridad = this.filters.prioridad;
    const soloRetrasadas = this.filters.soloRetrasadas;
    const search = (this.filters.search || '').toLowerCase();

    if (estado && estado !== 'todos') {
      filtered = filtered.filter((tarea) => (tarea.estado || '').toLowerCase() === estado);
    }

    if (prioridad && prioridad !== 'todas') {
      filtered = filtered.filter(
        (tarea) => (tarea.prioridad || 'normal').toLowerCase() === prioridad
      );
    }

    if (soloRetrasadas) {
      filtered = filtered.filter((tarea) => this.buildDeadlineInfo(tarea).status === 'overdue');
    }

    if (search) {
      filtered = filtered.filter((tarea) => {
        const hayCoincidencia = [
          tarea.numero,
          tarea.cliente_nombre,
          tarea.vehiculo_placa,
          tarea.vehiculo_marca,
          tarea.vehiculo_modelo,
          tarea.problema_reportado,
        ].some((campo) => (campo || '').toString().toLowerCase().includes(search));
        return hayCoincidencia;
      });
    }

    const estadoPeso = {
      en_proceso: 0,
      recibido: 1,
      espera_repuestos: 2,
      finalizado: 3,
      entregado: 4,
      cancelado: 5,
    };

    filtered.sort((a, b) => {
      const pesoA = estadoPeso[(a.estado || '').toLowerCase()] ?? 10;
      const pesoB = estadoPeso[(b.estado || '').toLowerCase()] ?? 10;
      if (pesoA !== pesoB) {
        return pesoA - pesoB;
      }

      const fechaA = a.fecha_entrega_estimada
        ? Date.parse(a.fecha_entrega_estimada)
        : Number.MAX_SAFE_INTEGER;
      const fechaB = b.fecha_entrega_estimada
        ? Date.parse(b.fecha_entrega_estimada)
        : Number.MAX_SAFE_INTEGER;
      return fechaA - fechaB;
    });

    return filtered;
  },

  computeMetrics(tasks) {
    const metrics = {
      total: tasks.length,
      activos: 0,
      enProceso: 0,
      espera: 0,
      finalizados: 0,
      entregados: 0,
      cancelados: 0,
      urgentes: 0,
      altas: 0,
      atrasadas: 0,
      porEntregarHoy: 0,
      completadasHoy: 0,
      atrasoEjemplos: [],
      hoyEjemplos: [],
    };

    if (!Array.isArray(tasks) || !tasks.length) {
      return metrics;
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    tasks.forEach((tarea) => {
      const estado = (tarea.estado || '').toLowerCase();

      switch (estado) {
        case 'en_proceso':
          metrics.enProceso += 1;
          metrics.activos += 1;
          break;
        case 'recibido':
          metrics.activos += 1;
          break;
        case 'espera_repuestos':
          metrics.espera += 1;
          metrics.activos += 1;
          break;
        case 'finalizado':
          metrics.finalizados += 1;
          break;
        case 'entregado':
          metrics.entregados += 1;
          break;
        case 'cancelado':
          metrics.cancelados += 1;
          break;
        default:
          metrics.activos += 1;
      }

      const prioridad = (tarea.prioridad || 'normal').toLowerCase();
      if (prioridad === 'urgente') {
        metrics.urgentes += 1;
      } else if (prioridad === 'alta') {
        metrics.altas += 1;
      }

      const deadlineInfo = this.buildDeadlineInfo(tarea);
      if (deadlineInfo.status === 'overdue') {
        metrics.atrasadas += 1;
        if (metrics.atrasoEjemplos.length < 3) {
          metrics.atrasoEjemplos.push(`#${tarea.numero || tarea.id} · ${deadlineInfo.label}`);
        }
      }

      if (deadlineInfo.status === 'due-today') {
        metrics.porEntregarHoy += 1;
        if (metrics.hoyEjemplos.length < 3) {
          metrics.hoyEjemplos.push(`#${tarea.numero || tarea.id}`);
        }
      }

      if (this.finalStates.has(estado) && tarea.fecha_entrega_real) {
        const entregaReal = new Date(tarea.fecha_entrega_real);
        if (entregaReal >= startOfToday && entregaReal <= endOfToday) {
          metrics.completadasHoy += 1;
        }
      }
    });

    return metrics;
  },

  renderMetrics() {
    if (!this.dom.metricas) {
      return;
    }

    const metrics = this.state.metrics || this.computeMetrics([]);

    this.dom.metricas.innerHTML = `
      <div class="stat-card mini">
        <i class="fas fa-briefcase"></i>
        <div>
          <h3>${metrics.total}</h3>
          <p>Total asignadas</p>
        </div>
      </div>
      <div class="stat-card mini">
        <i class="fas fa-cogs"></i>
        <div>
          <h3>${metrics.activos}</h3>
          <p>En seguimiento</p>
        </div>
      </div>
      <div class="stat-card mini">
        <i class="fas fa-exclamation-triangle"></i>
        <div>
          <h3>${metrics.atrasadas}</h3>
          <p>Tareas retrasadas</p>
        </div>
      </div>
      <div class="stat-card mini">
        <i class="fas fa-bolt"></i>
        <div>
          <h3>${metrics.urgentes}</h3>
          <p>Urgentes</p>
        </div>
      </div>
      <div class="stat-card mini">
        <i class="fas fa-calendar-day"></i>
        <div>
          <h3>${metrics.porEntregarHoy}</h3>
          <p>Entregas hoy</p>
        </div>
      </div>
    `;
  },

  renderAlertas() {
    if (!this.dom.alertas) {
      return;
    }

    if (this.state.lastError) {
      this.dom.alertas.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-triangle"></i>
          <strong>Error:</strong> ${this.escape(this.state.lastError)}
        </div>
      `;
      return;
    }

    const metrics = this.state.metrics || this.computeMetrics([]);
    const warnings = [];

    if (metrics.atrasadas > 0) {
      warnings.push(`
        <div class="alert alert-warning">
          <i class="fas fa-clock"></i>
          <strong>${metrics.atrasadas} órdenes retrasadas.</strong>
          ${metrics.atrasoEjemplos.length ? `<span class="alert-detalle">Ejemplos: ${metrics.atrasoEjemplos.join(', ')}</span>` : ''}
        </div>
      `);
    }

    if (metrics.porEntregarHoy > 0) {
      warnings.push(`
        <div class="alert alert-info">
          <i class="fas fa-calendar-check"></i>
          ${metrics.porEntregarHoy} entregas programadas para hoy. ${metrics.hoyEjemplos.length ? `<span class="alert-detalle">${metrics.hoyEjemplos.join(', ')}</span>` : ''}
        </div>
      `);
    }

    if (metrics.completadasHoy > 0) {
      warnings.push(`
        <div class="alert alert-success">
          <i class="fas fa-check-circle"></i>
          ${metrics.completadasHoy} órdenes cerradas hoy. ¡Buen trabajo!
        </div>
      `);
    }

    if (this.state.lastSync) {
      warnings.push(`
        <div class="alert alert-light">
          <i class="fas fa-sync-alt"></i>
          Sincronizado: ${this.formatDate(this.state.lastSync, { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      `);
    }

    this.dom.alertas.innerHTML = warnings.join('');
  },

  renderTareas() {
    if (!this.dom.lista) {
      return;
    }

    if (this.state.lastError) {
      this.dom.lista.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-circle"></i>
          <h3>No se pudieron cargar tus tareas</h3>
          <p>${this.escape(this.state.lastError)}</p>
          <button class="btn btn-primary" onclick="MisTareas.cargarTareas(true)">
            <i class="fas fa-sync"></i> Reintentar
          </button>
        </div>
      `;
      return;
    }

    if (!this.state.filtered.length) {
      this.renderEmptyState('No hay tareas que coincidan con los filtros actuales.');
      return;
    }

    this.dom.lista.innerHTML = `
      <div class="table-responsive">
                  <table class="data-table responsive-table">          <thead>
            <tr>
              <th>Prioridad</th>
              <th>Orden</th>
              <th>Cliente</th>
              <th>Vehículo</th>
              <th>Detalle</th>
              <th>Entrega</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${this.state.filtered.map((tarea) => this.renderTaskRow(tarea)).join('')}
          </tbody>
        </table>
      </div>
    `;

    if (window.Utils && typeof window.Utils.applyResponsiveTables === 'function') {
      const table = this.dom.lista.querySelector('table');
      if (table) {
        window.Utils.applyResponsiveTables(table);
      }
    }
  },

  renderEmptyState(message) {
    if (!this.dom.lista) {
      return;
    }
    this.dom.lista.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-check-circle"></i>
        <h3>${this.escape(message)}</h3>
        <p>Si esperabas ver una orden específica, revisa los filtros aplicados o actualiza la vista.</p>
      </div>
    `;
  },

  renderTaskRow(tarea) {
    const estadoInfo = this.obtenerEstadoInfo(tarea.estado);
    const prioridadBadge = this.renderPriorityBadge(tarea.prioridad);
    const deadlineInfo = this.buildDeadlineInfo(tarea);
    const problema = tarea.problema_reportado || 'Sin descripción';
    const cliente = tarea.cliente_nombre || 'Cliente no registrado';
    const vehiculo =
      [tarea.vehiculo_placa, tarea.vehiculo_marca, tarea.vehiculo_modelo]
        .filter(Boolean)
        .join(' · ') || 'Vehículo no asignado';

    return `
      <tr class="${deadlineInfo.rowClass}">
        <td data-label="Prioridad">${prioridadBadge}</td>
        <td data-label="Orden"><strong>#${this.escape(tarea.numero || tarea.id)}</strong></td>
        <td data-label="Cliente">${this.escape(cliente)}</td>
        <td data-label="Vehículo">${this.escape(vehiculo)}</td>
        <td data-label="Detalle">
          <span class="detalle-problema" title="${this.escape(problema)}">${this.escape(this.truncate(problema, 70))}</span>
        </td>
        <td data-label="Entrega">
          <span class="deadline-pill ${deadlineInfo.pillClass}" title="${deadlineInfo.tooltip}">
            ${deadlineInfo.label}
          </span>
        </td>
        <td data-label="Estado"><span class="badge badge-${estadoInfo.clase}">${estadoInfo.texto}</span></td>
        <td data-label="Acciones">
          <div class="action-buttons">
            ${this.renderActionButtons(tarea, deadlineInfo)}
          </div>
        </td>
      </tr>
    `;
  },

  renderPriorityBadge(prioridad) {
    const value = (prioridad || 'normal').toLowerCase();
    const map = {
      urgente: { clase: 'urgent', texto: 'URG' },
      alta: { clase: 'high', texto: 'ALT' },
      normal: { clase: 'normal', texto: 'NOR' },
    };
    const meta = map[value] || map.normal;
    return `<span class="priority-badge ${meta.clase}">${meta.texto}</span>`;
  },

  obtenerEstadoInfo(estado) {
    const estados = {
      recibido: { clase: 'info', texto: 'Recibido' },
      en_proceso: { clase: 'warning', texto: 'En proceso' },
      espera_repuestos: { clase: 'secondary', texto: 'Esperando repuestos' },
      finalizado: { clase: 'success', texto: 'Finalizado' },
      entregado: { clase: 'success', texto: 'Entregado' },
      cancelado: { clase: 'danger', texto: 'Cancelado' },
    };
    return (
      estados[(estado || '').toLowerCase()] || {
        clase: 'secondary',
        texto: this.escape(estado || 'Desconocido'),
      }
    );
  },

  buildDeadlineInfo(tarea) {
    if (this.finalStates.has((tarea.estado || '').toLowerCase())) {
      const entregaReal = tarea.fecha_entrega_real
        ? this.formatRelativeToNow(tarea.fecha_entrega_real)
        : 'Cerrada';
      return {
        status: 'closed',
        label: entregaReal,
        tooltip: tarea.fecha_entrega_real
          ? `Entregada el ${this.formatDate(tarea.fecha_entrega_real, { dateStyle: 'medium', timeStyle: 'short' })}`
          : 'Orden cerrada',
        pillClass: 'pill-closed',
        rowClass: 'tarea-cerrada',
      };
    }

    if (!tarea.fecha_entrega_estimada) {
      return {
        status: 'no-date',
        label: 'Sin fecha',
        tooltip: 'No se definió una fecha de entrega estimada.',
        pillClass: 'pill-neutral',
        rowClass: '',
      };
    }

    const target = new Date(tarea.fecha_entrega_estimada);
    const now = new Date();
    const diffMs = target - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffMs < 0) {
      const retrasoDias = Math.abs(Math.ceil(diffDays));
      return {
        status: 'overdue',
        label: `Retraso ${retrasoDias}d`,
        tooltip: `Retrasado desde ${this.formatDate(target, { dateStyle: 'medium' })}`,
        pillClass: 'pill-danger',
        rowClass: 'tarea-retrasada',
      };
    }

    if (diffHours <= 8) {
      return {
        status: 'due-today',
        label: 'Hoy',
        tooltip: `Entrega programada para hoy a las ${target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        pillClass: 'pill-warning',
        rowClass: 'tarea-hoy',
      };
    }

    if (diffDays <= 2) {
      return {
        status: 'due-soon',
        label: `Faltan ${Math.ceil(diffDays)}d`,
        tooltip: `Entrega estimada el ${this.formatDate(target, { dateStyle: 'medium', timeStyle: 'short' })}`,
        pillClass: 'pill-info',
        rowClass: '',
      };
    }

    return {
      status: 'scheduled',
      label: this.formatDate(target, { dateStyle: 'medium' }),
      tooltip: `Entrega estimada el ${this.formatDate(target, { dateStyle: 'full', timeStyle: 'short' })}`,
      pillClass: 'pill-neutral',
      rowClass: '',
    };
  },

  renderActionButtons(tarea, deadlineInfo) {
    const estado = (tarea.estado || '').toLowerCase();
    const buttons = [];

    buttons.push(`
      <button class="btn btn-sm btn-info" title="Ver detalles" onclick="OrdenesTrabajo.verDetalle('${tarea.id}')">
        <i class="fas fa-eye"></i>
      </button>
    `);

    if (estado === 'recibido') {
      buttons.push(`
        <button class="btn btn-sm btn-warning" title="Iniciar" onclick="MisTareas.actualizarEstado('${tarea.id}', 'en_proceso')">
          <i class="fas fa-play"></i>
        </button>
      `);
    }

    if (estado === 'en_proceso') {
      buttons.push(`
        <button class="btn btn-sm btn-secondary" title="Esperando repuestos" onclick="MisTareas.actualizarEstado('${tarea.id}', 'espera_repuestos')">
          <i class="fas fa-hourglass-half"></i>
        </button>
      `);
      buttons.push(`
        <button class="btn btn-sm btn-success" title="Finalizar" onclick="MisTareas.actualizarEstado('${tarea.id}', 'finalizado')">
          <i class="fas fa-check"></i>
        </button>
      `);
    }

    if (estado === 'espera_repuestos') {
      buttons.push(`
        <button class="btn btn-sm btn-warning" title="Reanudar" onclick="MisTareas.actualizarEstado('${tarea.id}', 'en_proceso')">
          <i class="fas fa-redo"></i>
        </button>
      `);
      buttons.push(`
        <button class="btn btn-sm btn-success" title="Finalizar" onclick="MisTareas.actualizarEstado('${tarea.id}', 'finalizado')">
          <i class="fas fa-check"></i>
        </button>
      `);
    }

    if (estado === 'finalizado') {
      buttons.push(`
        <button class="btn btn-sm btn-primary" title="Entregar vehículo" onclick="MisTareas.actualizarEstado('${tarea.id}', 'entregado')">
          <i class="fas fa-car"></i>
        </button>
      `);
    }

    if (estado === 'entregado' && deadlineInfo.status !== 'closed') {
      buttons.push(`
        <button class="btn btn-sm btn-outline-secondary" title="Historial" onclick="OrdenesTrabajo.verDetalle('${tarea.id}')">
          <i class="fas fa-clipboard-list"></i>
        </button>
      `);
    }

    // Botón de Asistente IA (siempre visible para tareas activas)
    if (!['finalizado', 'entregado', 'cancelado'].includes(estado)) {
      buttons.push(`
            <button class="btn btn-sm btn-ia-magic" title="Consultar Asistente IA" onclick="MisTareas.consultarIA('${tarea.id}')">
                <i class="fas fa-magic"></i>
            </button>
        `);
    }

    return buttons.join('');
  },

  async actualizarEstado(tareaId, nuevoEstado) {
    try {
      const mensajes = {
        en_proceso: 'Orden marcada como en proceso',
        espera_repuestos: 'Orden en espera de repuestos',
        finalizado: 'Orden finalizada',
        entregado: 'Vehículo entregado al cliente',
      };

      const confirmables = new Set(['finalizado', 'entregado']);
      if (confirmables.has(nuevoEstado)) {
        const mensaje =
          nuevoEstado === 'finalizado'
            ? '¿Confirmas que el trabajo ha sido completado?'
            : '¿Confirmas que el vehículo fue entregado al cliente?';
        const titulo = nuevoEstado === 'finalizado' ? 'Finalizar orden' : 'Entregar vehículo';
        const accion = nuevoEstado === 'finalizado' ? 'Finalizar' : 'Entregar';
        const confirmado = await Utils.confirm(titulo, mensaje, accion);
        if (!confirmado) {
          return;
        }
      }

      const provider = this.getDataProvider();
      if (!provider || typeof provider.updateEstadoOrdenTrabajo !== 'function') {
        throw new Error('No se pudo actualizar el estado: servicio no disponible.');
      }

      await provider.updateEstadoOrdenTrabajo(tareaId, { estado: nuevoEstado });
      if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
        Utils.showToast(mensajes[nuevoEstado] || 'Estado actualizado', 'success');
      }
      await this.cargarTareas(true);
    } catch (error) {
      console.error('MisTareas: error actualizando estado', error);
      if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
        Utils.showToast('No se pudo actualizar el estado de la orden.', 'error');
      }
    }
  },

  truncate(texto, max) {
    if (!texto) {
      return '';
    }
    if (texto.length <= max) {
      return texto;
    }
    return `${texto.substring(0, max - 1)}…`;
  },

  escape(value) {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof Utils !== 'undefined' && typeof Utils.sanitize === 'function') {
      return Utils.sanitize(value);
    }
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  formatDate(value, options = { dateStyle: 'medium' }) {
    try {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) {
        return '';
      }
      return new Intl.DateTimeFormat('es-EC', options).format(date);
    } catch (error) {
      return '';
    }
  },

  formatRelativeToNow(value) {
    const target = new Date(value);
    const now = new Date();
    const diffMs = now - target;
    if (Number.isNaN(target.getTime())) {
      return 'Fecha no disponible';
    }
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return 'Hoy';
    }
    if (diffDays === 1) {
      return 'Ayer';
    }
    return diffDays > 1 ? `Hace ${diffDays} días` : `En ${Math.abs(diffDays)} días`;
  },

  // ============================================================
  // FUNCIONES DEL ASISTENTE IA
  // ============================================================

  injectStyles() {
    const styleId = 'mis-tareas-ia-styles';
    if (document.getElementById(styleId)) return;

    const css = `
          /* PANEL ASISTENTE IA - Compatible con tema oscuro */
          .asistente-panel {
              background: linear-gradient(135deg, var(--card-bg, #1e293b) 0%, var(--card-bg-hover, #334155) 100%);
              border-left: 4px solid #6366f1;
              padding: 1rem 1.2rem;
              margin-bottom: 1.5rem;
              border-radius: 12px;
              display: flex;
              flex-direction: column;
              gap: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.3);
              transition: all 0.3s ease;
              color: var(--text-color, #e2e8f0);
          }
          .asistente-panel.hidden { display: none; }
          .asistente-panel.estado-critico { 
              border-left-color: #ef4444; 
              background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%);
          }
          .asistente-panel.estado-alerta { 
              border-left-color: #f59e0b; 
              background: linear-gradient(135deg, #451a03 0%, #78350f 100%);
          }
          .asistente-panel.estado-optimista { 
              border-left-color: #22c55e; 
              background: linear-gradient(135deg, #052e16 0%, #166534 100%);
          }
          
          .asistente-header { display: flex; align-items: center; gap: 15px; }
          .asistente-avatar { 
              font-size: 2rem; 
              color: #6366f1; 
              background: rgba(99, 102, 241, 0.2);
              width: 55px; height: 55px;
              display: flex; align-items: center; justify-content: center;
              border-radius: 50%;
              box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
              animation: pulse-glow 2s infinite;
          }
          @keyframes pulse-glow {
              0%, 100% { box-shadow: 0 0 15px rgba(99, 102, 241, 0.4); }
              50% { box-shadow: 0 0 25px rgba(99, 102, 241, 0.7); }
          }
          .asistente-mensaje { flex: 1; }
          .asistente-mensaje h4 { margin: 0 0 5px 0; font-size: 1.1rem; color: var(--text-color, #fff); font-weight: 600; }
          .asistente-mensaje p { margin: 0; color: var(--text-muted, #94a3b8); font-size: 0.9rem; line-height: 1.4; }
          .asistente-actions { display: flex; gap: 8px; }
          .asistente-actions button { 
              background: rgba(255,255,255,0.1); 
              border: 1px solid rgba(255,255,255,0.2);
              color: #fff;
              padding: 8px 12px;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.2s;
          }
          .asistente-actions button:hover { 
              background: rgba(255,255,255,0.2); 
              transform: translateY(-2px);
          }
          
          .asistente-sugerencias { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 5px; }
          .sugerencia-chip {
              background: rgba(255,255,255,0.1);
              padding: 6px 14px;
              border-radius: 20px;
              font-size: 0.85rem;
              color: var(--text-color, #e2e8f0);
              border: 1px solid rgba(255,255,255,0.15);
              display: flex; align-items: center; gap: 6px;
              transition: all 0.2s ease;
              cursor: default;
          }
          .sugerencia-chip:hover { 
              transform: translateY(-2px); 
              box-shadow: 0 4px 12px rgba(0,0,0,0.2);
              background: rgba(255,255,255,0.15);
          }
          .sugerencia-chip i { color: #fbbf24; }
          .chip-repuestos { border-color: #22d3ee; }
          .chip-repuestos i { color: #22d3ee; }
          .chip-optimizacion { border-color: #22c55e; }
          .chip-optimizacion i { color: #22c55e; }
          .chip-notificaciones { border-color: #818cf8; }
          .chip-notificaciones i { color: #818cf8; }
          
          /* Botón mágico de IA */
          .btn-ia-magic {
              background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
              color: white;
              border: none;
              box-shadow: 0 2px 10px rgba(139, 92, 246, 0.4);
          }
          .btn-ia-magic:hover {
              background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
              color: white;
              transform: scale(1.08);
              box-shadow: 0 4px 15px rgba(139, 92, 246, 0.6);
          }
          
          /* Modal de IA */
          .ia-modal-content { padding: 15px; }
          .ia-section { margin-bottom: 25px; }
          .ia-section h5 { 
              color: #8b5cf6; 
              margin-bottom: 12px; 
              padding-bottom: 8px;
              border-bottom: 2px solid rgba(139, 92, 246, 0.3);
              display: flex;
              align-items: center;
              gap: 8px;
          }
          .ia-checklist { list-style: none; padding: 0; margin: 0; }
          .ia-checklist li { 
              margin-bottom: 10px; 
              background: var(--card-bg, #1e293b);
              padding: 10px 15px;
              border-radius: 8px;
          }
          .ia-checklist label { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
          .ia-checklist input[type="checkbox"] { 
              width: 18px; height: 18px; 
              accent-color: #8b5cf6;
          }
          
          .prediccion-card { 
              padding: 18px; 
              border-radius: 10px; 
              background: var(--card-bg, #1e293b); 
              border: 1px solid var(--border-color, #334155);
          }
          .prediccion-card.alto { 
              background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%);
              border-color: #ef4444; 
              color: #fecaca; 
          }
          .prediccion-card.medio { 
              background: linear-gradient(135deg, #451a03 0%, #78350f 100%);
              border-color: #f59e0b; 
              color: #fef3c7; 
          }
          .prediccion-card.bajo { 
              background: linear-gradient(135deg, #052e16 0%, #166534 100%);
              border-color: #22c55e; 
              color: #bbf7d0; 
          }
          .probabilidad { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 10px; 
              font-size: 1.15rem; 
          }
          .probabilidad strong { font-size: 1.4rem; }
          .razones-lista { 
              margin-top: 12px; 
              padding-left: 20px; 
              font-size: 0.9rem;
              opacity: 0.9;
          }
          .razones-lista li { margin-bottom: 6px; }
          
          .repuestos-grid { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
              gap: 12px; 
          }
          .repuesto-card { 
              background: var(--card-bg, #1e293b);
              border: 1px solid var(--border-color, #334155);
              border-radius: 10px; 
              padding: 15px; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              gap: 8px;
              transition: all 0.2s;
          }
          .repuesto-card:hover { 
              transform: scale(1.05); 
              box-shadow: 0 6px 20px rgba(0,0,0,0.3);
              border-color: #22d3ee;
          }
          .repuesto-card i { font-size: 1.8rem; color: #22d3ee; }
          .repuesto-card .cantidad { 
              font-size: 0.85rem; 
              color: var(--text-muted, #94a3b8);
              background: rgba(34, 211, 238, 0.2);
              padding: 2px 8px;
              border-radius: 10px;
          }
          
          /* Estilos del Panel Avanzado */
          .panel-avanzado-ia { 
              padding: 25px;
              color: var(--text-color, #e2e8f0);
          }
          .panel-header { 
              text-align: center; 
              margin-bottom: 35px;
              padding-bottom: 20px;
              border-bottom: 2px solid rgba(139, 92, 246, 0.3);
          }
          .panel-header h4 { 
              color: #a78bfa; 
              margin-bottom: 8px;
              font-size: 1.5rem;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
          }
          .panel-header p { color: var(--text-muted, #94a3b8); font-size: 0.95rem; }
          
          .config-section, .stats-section, .acciones-section, .optimizacion-section, .aprendizaje-section {
              margin-bottom: 30px;
              padding: 20px;
              background: var(--card-bg, #1e293b);
              border-radius: 12px;
              border: 1px solid var(--border-color, #334155);
          }
          
          .config-section h5, .stats-section h5, .acciones-section h5, .optimizacion-section h5, .aprendizaje-section h5 {
              color: #a78bfa;
              margin-bottom: 18px;
              padding-bottom: 12px;
              border-bottom: 2px solid rgba(167, 139, 250, 0.3);
              display: flex;
              align-items: center;
              gap: 10px;
              font-size: 1.1rem;
          }
          
          .config-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
              gap: 15px;
          }
          
          .config-item {
              background: var(--card-bg-hover, #334155);
              padding: 18px;
              border-radius: 10px;
              border-left: 4px solid #64748b;
              display: flex;
              flex-direction: column;
              gap: 8px;
              transition: all 0.2s;
          }
          
          .config-item.activo { border-left-color: #22c55e; }
          .config-item.activo strong { color: #22c55e; }
          .config-item.inactivo { border-left-color: #ef4444; opacity: 0.7; }
          .config-item.inactivo strong { color: #ef4444; }
          .config-item i { font-size: 1.6rem; color: #8b5cf6; }
          .config-item span { font-size: 0.9rem; color: var(--text-muted, #94a3b8); }
          .config-item strong { font-size: 1rem; color: var(--text-color, #fff); }
          
          .stats-cards {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
              gap: 15px;
          }
          
          .stat-card-mini {
              background: linear-gradient(135deg, var(--card-bg-hover, #334155) 0%, var(--card-bg, #1e293b) 100%);
              padding: 22px 18px;
              border-radius: 12px;
              text-align: center;
              border: 1px solid var(--border-color, #334155);
              transition: all 0.2s;
          }
          .stat-card-mini:hover {
              transform: translateY(-3px);
              box-shadow: 0 8px 25px rgba(0,0,0,0.3);
          }
          
          .stat-card-mini i { 
              font-size: 2.2rem; 
              color: #8b5cf6; 
              margin-bottom: 12px;
              display: block;
          }
          .stat-card-mini strong { 
              display: block; 
              font-size: 2.2rem; 
              color: var(--text-color, #fff);
              margin-bottom: 6px;
              background: linear-gradient(135deg, #a78bfa 0%, #6366f1 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
          }
          .stat-card-mini span { font-size: 0.85rem; color: var(--text-muted, #94a3b8); }
          
          .tabla-repuestos table, .tabla-aprendizaje table {
              width: 100%;
              background: var(--card-bg-hover, #334155);
              border-collapse: collapse;
              border-radius: 10px;
              overflow: hidden;
          }
          
          .tabla-repuestos th, .tabla-aprendizaje th {
              background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
              color: white;
              padding: 14px 12px;
              text-align: left;
              font-weight: 600;
          }
          
          .tabla-repuestos td, .tabla-aprendizaje td {
              padding: 12px;
              border-bottom: 1px solid var(--border-color, #475569);
              color: var(--text-color, #e2e8f0);
          }
          .tabla-repuestos tr:hover, .tabla-aprendizaje tr:hover {
              background: rgba(139, 92, 246, 0.1);
          }
          
          .optimizacion-card {
              background: var(--card-bg-hover, #334155);
              padding: 22px;
              border-radius: 10px;
              border-left: 4px solid #22c55e;
          }
          
          .optimizacion-card p { margin-bottom: 12px; color: var(--text-color, #e2e8f0); }
          
          /* Modal overlay personalizado */
          .modal-overlay-ia {
              position: fixed;
              top: 0; left: 0; right: 0; bottom: 0;
              background: rgba(0, 0, 0, 0.85);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 10000;
              backdrop-filter: blur(5px);
          }
          .modal-content-ia {
              background: var(--card-bg, #1e293b);
              border-radius: 16px;
              padding: 30px;
              max-width: 1200px;
              max-height: 90vh;
              overflow-y: auto;
              border: 1px solid var(--border-color, #334155);
              box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          }
      `;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  },

  renderAsistentePanel(briefing) {
    const panel = document.getElementById('asistente-ia-panel');
    if (!panel || !briefing) return;

    panel.classList.remove('hidden');
    panel.className = `asistente-panel estado-${briefing.estado_animo || 'optimista'}`;

    const saludoEl = document.getElementById('asistente-saludo');
    if (saludoEl) saludoEl.textContent = briefing.saludo;

    const resumenEl = document.getElementById('asistente-resumen');
    if (resumenEl) {
      resumenEl.innerHTML = briefing.resumen;
    }

    const sugerenciasContainer = document.getElementById('asistente-sugerencias');
    if (sugerenciasContainer) {
      let chipsHTML = '';

      // Métricas principales primero
      if (briefing.metricas_avanzadas) {
        const m = briefing.metricas_avanzadas;
        chipsHTML += `
                  <div class="sugerencia-chip"><i class="fas fa-hourglass-half"></i> ${m.tiempo_total_estimado || 'Sin tareas'}</div>
                  <div class="sugerencia-chip"><i class="fas fa-calendar-day"></i> ${m.tareas_hoy || 0} entregas hoy</div>
                  <div class="sugerencia-chip"><i class="fas fa-chart-line"></i> ${m.eficiencia_predicha || '100%'} eficiencia</div>
              `;
      }

      // Sugerencias de acción (máximo 2)
      if (briefing.sugerencias && briefing.sugerencias.length > 0) {
        briefing.sugerencias.slice(0, 2).forEach((s) => {
          const texto = s.length > 30 ? s.substring(0, 30) + '...' : s;
          chipsHTML += `<div class="sugerencia-chip" title="${s}"><i class="fas fa-lightbulb"></i> ${texto}</div>`;
        });
      }

      // Mostrar acciones autónomas recientes
      if (window.AsistenteTareasIA && window.AsistenteTareasIA.state.repuestosSugeridos.size > 0) {
        chipsHTML += `<div class="sugerencia-chip chip-repuestos"><i class="fas fa-tools"></i> ${window.AsistenteTareasIA.state.repuestosSugeridos.size} repuestos sugeridos</div>`;
      }

      if (window.AsistenteTareasIA && window.AsistenteTareasIA.state.optimizacionCalculada) {
        chipsHTML += `<div class="sugerencia-chip chip-optimizacion"><i class="fas fa-route"></i> Ruta optimizada</div>`;
      }

      if (window.AsistenteTareasIA && window.AsistenteTareasIA.state.clientesNotificados.size > 0) {
        chipsHTML += `<div class="sugerencia-chip chip-notificaciones"><i class="fas fa-bell"></i> ${window.AsistenteTareasIA.state.clientesNotificados.size} notificados</div>`;
      }

      sugerenciasContainer.innerHTML = chipsHTML;
    }
  },

  renderErrorIA(error) {
    const panel = document.getElementById('asistente-ia-panel');
    if (!panel) return;

    panel.classList.remove('hidden');
    panel.className = 'asistente-panel estado-critico';

    const saludoEl = document.getElementById('asistente-saludo');
    if (saludoEl) saludoEl.textContent = 'Asistente no disponible';

    const resumenEl = document.getElementById('asistente-resumen');
    if (resumenEl)
      resumenEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${error.message || 'Error desconocido al iniciar IA'}`;

    const sugerenciasContainer = document.getElementById('asistente-sugerencias');
    if (sugerenciasContainer) sugerenciasContainer.innerHTML = '';
  },

  async actualizarAnalisisIA() {
    if (window.AsistenteTareasIA) {
      const btn = document.querySelector('#asistente-ia-panel button');
      if (btn) btn.classList.add('fa-spin');

      const briefing = await window.AsistenteTareasIA.generarBriefingDiario();
      this.renderAsistentePanel(briefing);

      if (btn) btn.classList.remove('fa-spin');
    }
  },

  actualizarAlertasIA(detail) {
    // Actualizar UI basado en eventos en tiempo real del asistente
    if (detail.riesgos && detail.riesgos.length > 0) {
      const panel = document.getElementById('asistente-ia-panel');
      if (panel) {
        panel.classList.add('estado-alerta');
        document.getElementById('asistente-resumen').innerHTML =
          `⚠️ <strong>Alerta:</strong> ${detail.riesgos[0].mensaje}`;
      }
    }
  },

  async consultarIA(tareaId) {
    const tarea = this.state.tasks.find((t) => t.id === tareaId);
    if (!tarea || !window.AsistenteTareasIA) return;

    const btn = event.currentTarget;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
      const checklist = await window.AsistenteTareasIA.generarChecklistInteligente(tarea);
      const prediccion = window.AsistenteTareasIA.predecirEntrega(tarea);

      // Obtener sugerencias de repuestos para esta tarea
      const repuestosSugeridos = window.AsistenteTareasIA.predecirRepuestosNecesarios(
        tarea.problema_reportado || '',
        `${tarea.vehiculo_marca} ${tarea.vehiculo_modelo}`
      );

      let html = `
              <div class="ia-modal-content">
                  <div class="ia-section">
                      <h5><i class="fas fa-clipboard-check"></i> Checklist Sugerido</h5>
                      <ul class="ia-checklist">
                          ${checklist
                            .map(
                              (item) => `
                              <li>
                                  <label>
                                      <input type="checkbox"> <span>${item}</span>
                                  </label>
                              </li>
                          `
                            )
                            .join('')}
                      </ul>
                  </div>
                  
                  ${
                    repuestosSugeridos.length > 0
                      ? `
                  <div class="ia-section">
                      <h5><i class="fas fa-tools"></i> Repuestos Sugeridos (${Math.round(repuestosSugeridos[0].confianza * 100)}% confianza)</h5>
                      <div class="repuestos-grid">
                          ${repuestosSugeridos
                            .map(
                              (r) => `
                              <div class="repuesto-card">
                                  <i class="fas fa-cog"></i>
                                  <span><strong>${r.nombre}</strong></span>
                                  <span class="cantidad">x${r.cantidadSugerida}</span>
                              </div>
                          `
                            )
                            .join('')}
                      </div>
                  </div>
                  `
                      : ''
                  }
                  
                  <div class="ia-section">
                      <h5><i class="fas fa-chart-line"></i> Predicción de Entrega</h5>
                      <div class="prediccion-card ${prediccion.nivel_riesgo}">
                          <div class="probabilidad">
                              <span>Probabilidad de éxito:</span>
                              <strong>${Math.round(prediccion.probabilidad_exito)}%</strong>
                          </div>
                          <p class="sugerencia"><i class="fas fa-info-circle"></i> ${prediccion.sugerencia}</p>
                          ${
                            prediccion.razones.length > 0
                              ? `
                              <ul class="razones-lista">
                                  ${prediccion.razones.map((r) => `<li>${r}</li>`).join('')}
                              </ul>
                          `
                              : ''
                          }
                      </div>
                  </div>
              </div>
          `;

      // Usar el sistema de modales existente o un alert simple si no hay
      if (typeof Utils !== 'undefined' && Utils.modal) {
        Utils.modal({
          title: `Asistente IA - Orden #${tarea.numero}`,
          content: html,
          buttons: [{ text: 'Cerrar', class: 'btn-secondary', action: 'close' }],
        });
      } else {
        alert('Checklist sugerido:\n' + checklist.join('\n- '));
      }
    } catch (e) {
      console.error(e);
      alert('No se pudo consultar al asistente en este momento.');
    } finally {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
  },

  /**
   * Panel Avanzado de Control de IA
   */
  mostrarPanelAvanzado() {
    if (!window.AsistenteTareasIA) {
      alert('El asistente de IA no está disponible.');
      return;
    }

    const state = window.AsistenteTareasIA.state;
    const config = window.AsistenteTareasIA.config;

    // Generar reporte de acciones autónomas
    const repuestosSugeridos = [];
    state.repuestosSugeridos.forEach((lista, timestamp) => {
      repuestosSugeridos.push(...lista.map((r) => ({ ...r, timestamp })));
    });

    const html = `
          <div class="panel-avanzado-ia">
              <div class="panel-header">
                  <h4><i class="fas fa-brain"></i> Panel de Control Autónomo - Asistente IA</h4>
                  <p>Monitoreo en tiempo real de acciones inteligentes</p>
              </div>
              
              <!-- Métricas de Configuración -->
              <div class="config-section">
                  <h5><i class="fas fa-sliders-h"></i> Configuración Actual</h5>
                  <div class="config-grid">
                      <div class="config-item ${config.notificarClientes ? 'activo' : 'inactivo'}">
                          <i class="fas fa-bell"></i>
                          <span>Notificaciones Automáticas</span>
                          <strong>${config.notificarClientes ? 'ACTIVO' : 'INACTIVO'}</strong>
                      </div>
                      <div class="config-item ${config.aprenderTiempos ? 'activo' : 'inactivo'}">
                          <i class="fas fa-graduation-cap"></i>
                          <span>Aprendizaje Continuo</span>
                          <strong>${config.aprenderTiempos ? 'ACTIVO' : 'INACTIVO'}</strong>
                      </div>
                      <div class="config-item ${config.sugerirRepuestos ? 'activo' : 'inactivo'}">
                          <i class="fas fa-tools"></i>
                          <span>Sugerencia de Repuestos</span>
                          <strong>${config.sugerirRepuestos ? 'ACTIVO' : 'INACTIVO'}</strong>
                      </div>
                      <div class="config-item ${config.optimizarRutas ? 'activo' : 'inactivo'}">
                          <i class="fas fa-route"></i>
                          <span>Optimización de Rutas</span>
                          <strong>${config.optimizarRutas ? 'ACTIVO' : 'INACTIVO'}</strong>
                      </div>
                  </div>
              </div>
              
              <!-- Estadísticas de Acciones -->
              <div class="stats-section">
                  <h5><i class="fas fa-chart-bar"></i> Acciones Ejecutadas</h5>
                  <div class="stats-cards">
                      <div class="stat-card-mini">
                          <i class="fas fa-comment-dots"></i>
                          <strong>${state.clientesNotificados.size}</strong>
                          <span>Clientes Notificados</span>
                      </div>
                      <div class="stat-card-mini">
                          <i class="fas fa-cogs"></i>
                          <strong>${repuestosSugeridos.length}</strong>
                          <span>Repuestos Sugeridos</span>
                      </div>
                      <div class="stat-card-mini">
                          <i class="fas fa-history"></i>
                          <strong>${state.historialPredicciones.length}</strong>
                          <span>Predicciones Aprendidas</span>
                      </div>
                      <div class="stat-card-mini">
                          <i class="fas fa-exclamation-triangle"></i>
                          <strong>${state.alertasActivas.length}</strong>
                          <span>Alertas Activas</span>
                      </div>
                  </div>
              </div>
              
              <!-- Repuestos Sugeridos -->
              ${
                repuestosSugeridos.length > 0
                  ? `
              <div class="acciones-section">
                  <h5><i class="fas fa-tools"></i> Últimos Repuestos Sugeridos</h5>
                  <div class="tabla-repuestos">
                      <table>
                          <thead>
                              <tr>
                                  <th>Repuesto</th>
                                  <th>Cantidad</th>
                                  <th>Stock Actual</th>
                                  <th>Urgencia</th>
                                  <th>Razón</th>
                              </tr>
                          </thead>
                          <tbody>
                              ${repuestosSugeridos
                                .slice(0, 10)
                                .map(
                                  (r) => `
                                  <tr>
                                      <td><strong>${r.repuesto}</strong></td>
                                      <td>${r.cantidadSugerida}</td>
                                      <td><span class="badge ${r.stockActual === 0 ? 'badge-danger' : 'badge-warning'}">${r.stockActual}</span></td>
                                      <td><span class="badge badge-${r.urgencia === 'alta' ? 'danger' : 'warning'}">${r.urgencia}</span></td>
                                      <td style="font-size: 0.85em;">${r.razon}</td>
                                  </tr>
                              `
                                )
                                .join('')}
                          </tbody>
                      </table>
                  </div>
              </div>
              `
                  : '<p class="text-muted"><i class="fas fa-check-circle"></i> No hay repuestos pendientes por sugerir.</p>'
              }
              
              <!-- Optimización de Ruta -->
              ${
                state.optimizacionCalculada
                  ? `
              <div class="optimizacion-section">
                  <h5><i class="fas fa-route"></i> Optimización Calculada</h5>
                  <div class="optimizacion-card">
                      <p><strong>Razón:</strong> ${state.optimizacionCalculada.razon}</p>
                      <p><strong>Mejora Estimada:</strong> ${state.optimizacionCalculada.mejora_estimada}</p>
                      <p><strong>Orden Sugerido:</strong> ${state.optimizacionCalculada.orden_sugerido.length} tareas priorizadas</p>
                  </div>
              </div>
              `
                  : ''
              }
              
              <!-- Historial de Aprendizaje -->
              ${
                state.historialPredicciones.length > 0
                  ? `
              <div class="aprendizaje-section">
                  <h5><i class="fas fa-brain"></i> Aprendizaje Continuo (Últimas 5 predicciones)</h5>
                  <div class="tabla-aprendizaje">
                      <table>
                          <thead>
                              <tr>
                                  <th>Problema</th>
                                  <th>Estimado</th>
                                  <th>Real</th>
                                  <th>Desviación</th>
                                  <th>Fecha</th>
                              </tr>
                          </thead>
                          <tbody>
                              ${state.historialPredicciones
                                .slice(-5)
                                .reverse()
                                .map(
                                  (h) => `
                                  <tr>
                                      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${h.problema}</td>
                                      <td>${Math.round(h.duracion_estimada)}min</td>
                                      <td>${Math.round(h.duracion_real)}min</td>
                                      <td><span class="badge ${h.desviacion > 30 ? 'badge-danger' : h.desviacion > 10 ? 'badge-warning' : 'badge-success'}">${h.desviacion > 0 ? '+' : ''}${Math.round(h.desviacion)}min</span></td>
                                      <td>${new Date(h.fecha).toLocaleDateString('es-EC')}</td>
                                  </tr>
                              `
                                )
                                .join('')}
                          </tbody>
                      </table>
                  </div>
              </div>
              `
                  : '<p class="text-muted"><i class="fas fa-info-circle"></i> Aún no hay suficientes datos para aprendizaje continuo.</p>'
              }
          </div>
      `;

    // Usar sistema de modales si está disponible
    if (typeof Utils !== 'undefined' && Utils.modal) {
      Utils.modal({
        title: 'Panel Avanzado IA - Asistente Autónomo',
        content: html,
        size: 'large',
        buttons: [
          { text: 'Configurar', class: 'btn-primary', action: () => this.configurarAsistenteIA() },
          { text: 'Cerrar', class: 'btn-secondary', action: 'close' },
        ],
      });
    } else {
      // Fallback: crear modal personalizado
      const modalDiv = document.createElement('div');
      modalDiv.className = 'modal-overlay-ia';
      modalDiv.innerHTML = `
              <div class="modal-content-ia" style="max-width: 1200px; max-height: 90vh; overflow-y: auto;">
                  ${html}
                  <div style="text-align: right; margin-top: 20px;">
                      <button class="btn btn-secondary" onclick="this.closest('.modal-overlay-ia').remove()">Cerrar</button>
                  </div>
              </div>
          `;
      modalDiv.style.cssText =
        'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';
      document.body.appendChild(modalDiv);
    }
  },

  configurarAsistenteIA() {
    alert(
      'Panel de configuración en desarrollo. Actualmente todas las características están activas.'
    );
  },
};

window.MisTareas = MisTareas;
