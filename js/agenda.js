/* ========================================
   MÓDULO: AGENDA DEL TALLER AUTOMOTRIZ
   Sistema completo de citas, servicios y programación
   ======================================== */

const Agenda = {
  // Estado del módulo
  calendar: null,
  currentView: 'timeGridWeek',
  currentDate: new Date(),
  selectedDate: null,
  technicians: [],
  clientesCache: [],
  ordenesFinalizadas: [],
  overlayRefs: {
    nuevaCita: null,
    entrega: null,
    detallesEvento: null,
  },
  autoRefreshTimers: {
    stats: null,
    eventos: null,
  },

  // Configuración general
  config: {
    horarioAtencion: {
      inicio: '08:00',
      fin: '18:00',
      sabado: {
        habilitado: true,
        inicio: '09:00',
        fin: '13:00',
      },
      domingo: {
        habilitado: false,
        inicio: '09:00',
        fin: '12:00',
      },
    },
    duracionesPorDefecto: {
      cambio_aceite: 60,
      revision_frenos: 90,
      diagnostico: 120,
      mantenimiento_mayor: 240,
      reparacion_motor: 480,
      default: 60,
    },
    coloresPorTipo: {
      mantenimiento: '#28a745',
      reparacion: '#dc3545',
      diagnostico: '#ffc107',
      entrega: '#17a2b8',
      cita_cliente: '#6f42c1',
      recordatorio: '#fd7e14',
      default: '#007bff',
    },
  },

  // ============================================
  // RENDERIZAR VISTA PRINCIPAL
  // ============================================
  render() {
    return `
            <section class="agenda-shell">
                <div class="agenda-header-card agenda-card">
                    <div class="agenda-heading">
                        <div>
                            <p class="agenda-eyebrow">Operaciones del Taller</p>
                            <h2><i class="fas fa-calendar-alt"></i> Agenda del Taller</h2>
                            <p class="agenda-description">Coordina citas, bahías y entregas desde una sola vista.</p>
                        </div>
                        <div class="agenda-heading-meta">
                            <span><i class="fas fa-sync"></i> Actualización automática cada 5 min</span>
                            <span><i class="fas fa-user-cog"></i> Equipo asignado en tiempo real</span>
                        </div>
                    </div>
                    <div class="agenda-actions">
                        <div class="agenda-primary-actions">
                            <button class="btn btn-primary" onclick="Agenda.mostrarModalNuevaCita()">
                                <i class="fas fa-plus"></i> Nueva Cita
                            </button>
                            <button class="btn btn-success" onclick="Agenda.mostrarModalEntrega()">
                                <i class="fas fa-car-side"></i> Programar Entrega
                            </button>
                            <button class="btn btn-info" onclick="Agenda.mostrarVistaRecordatorios()">
                                <i class="fas fa-bell"></i> Recordatorios
                            </button>
                        </div>
                        <div class="agenda-view-switch">
                            <span class="agenda-view-label">Vista</span>
                            <div class="btn-group agenda-view-group">
                                <button class="btn btn-outline-secondary" onclick="Agenda.cambiarVista('dayGridMonth')" id="btnVistaMonth">
                                    <i class="fas fa-calendar"></i> Mes
                                </button>
                                <button class="btn btn-outline-secondary" onclick="Agenda.cambiarVista('timeGridWeek')" id="btnVistaWeek">
                                    <i class="fas fa-calendar-week"></i> Semana
                                </button>
                                <button class="btn btn-outline-secondary" onclick="Agenda.cambiarVista('timeGridDay')" id="btnVistaDay">
                                    <i class="fas fa-calendar-day"></i> Día
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <section class="agenda-stats-grid" id="agendaStats">
                    <article class="agenda-stat-card">
                        <div class="stat-icon stat-icon-primary">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div>
                            <p>Citas Hoy</p>
                            <span id="citasHoy">0</span>
                        </div>
                    </article>
                    <article class="agenda-stat-card">
                        <div class="stat-icon stat-icon-success">
                            <i class="fas fa-car-side"></i>
                        </div>
                        <div>
                            <p>Entregas Hoy</p>
                            <span id="entregasHoy">0</span>
                        </div>
                    </article>
                    <article class="agenda-stat-card">
                        <div class="stat-icon stat-icon-warning">
                            <i class="fas fa-warehouse"></i>
                        </div>
                        <div>
                            <p>Bahías Ocupadas</p>
                            <span id="bahiasOcupadas">0</span>
                        </div>
                    </article>
                </section>

                <div class="agenda-content agenda-layout">
                    <aside class="agenda-sidebar">
                        <div class="agenda-card panel-card">
                            <div class="panel-header">
                                <h4><i class="fas fa-filter"></i> Filtros</h4>
                                <p>Refina la vista del calendario.</p>
                            </div>
                            <div class="filter-grid">
                                <div class="filter-group">
                                    <label for="filtroTecnico">Técnico</label>
                                    <div class="select-wrapper">
                                        <select id="filtroTecnico" class="agenda-select" onchange="Agenda.aplicarFiltros()">
                                            <option value="">Todos los técnicos</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="filter-group">
                                    <label for="filtroTipoServicio">Tipo de servicio</label>
                                    <div class="select-wrapper">
                                        <select id="filtroTipoServicio" class="agenda-select" onchange="Agenda.aplicarFiltros()">
                                            <option value="">Todos los servicios</option>
                                            <option value="mantenimiento">Mantenimiento</option>
                                            <option value="reparacion">Reparación</option>
                                            <option value="diagnostico">Diagnóstico</option>
                                            <option value="entrega">Entregas</option>
                                            <option value="cita_cliente">Citas con Cliente</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="filter-group">
                                    <label for="filtroEstado">Estado</label>
                                    <div class="select-wrapper">
                                        <select id="filtroEstado" class="agenda-select" onchange="Agenda.aplicarFiltros()">
                                            <option value="">Todos los estados</option>
                                            <option value="programado">Programado</option>
                                            <option value="en_proceso">En Proceso</option>
                                            <option value="completado">Completado</option>
                                            <option value="cancelado">Cancelado</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="agenda-card panel-card">
                            <div class="panel-header">
                                <h4><i class="fas fa-palette"></i> Leyenda</h4>
                                <p>Colores por tipo de servicio.</p>
                            </div>
                            <div class="legend-grid">
                                <div class="legend-item">
                                    <span class="legend-dot" style="background-color: #28a745;"></span>
                                    <span>Mantenimiento</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-dot" style="background-color: #dc3545;"></span>
                                    <span>Reparación</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-dot" style="background-color: #ffc107;"></span>
                                    <span>Diagnóstico</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-dot" style="background-color: #17a2b8;"></span>
                                    <span>Entrega</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-dot" style="background-color: #6f42c1;"></span>
                                    <span>Cita Cliente</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-dot" style="background-color: #fd7e14;"></span>
                                    <span>Recordatorio</span>
                                </div>
                            </div>
                        </div>

                        <div class="agenda-card panel-card quick-actions-card">
                            <div class="panel-header">
                                <h4><i class="fas fa-bolt"></i> Acciones rápidas</h4>
                                <p>Atajos para el día a día.</p>
                            </div>
                            <div class="quick-actions-list">
                                <button class="btn btn-outline-primary" onclick="Agenda.verCitasHoy()">
                                    <i class="fas fa-sun"></i> Ver Citas de Hoy
                                </button>
                                <button class="btn btn-outline-success" onclick="Agenda.verEntregasPendientes()">
                                    <i class="fas fa-clipboard-check"></i> Entregas Pendientes
                                </button>
                                <button class="btn btn-outline-warning" onclick="Agenda.verRecordatoriosVencidos()">
                                    <i class="fas fa-exclamation-triangle"></i> Recordatorios Vencidos
                                </button>
                                <button class="btn btn-outline-info" onclick="Agenda.exportarAgenda()">
                                    <i class="fas fa-file-export"></i> Exportar Agenda
                                </button>
                            </div>
                        </div>
                    </aside>

                    <div class="agenda-main">
                        <div class="agenda-card agenda-calendar-card">
                            <div class="calendar-card-header">
                                <div>
                                    <h4><i class="fas fa-wave-square"></i> Agenda en vivo</h4>
                                    <p>Monitorea disponibilidad por bahía y servicio.</p>
                                </div>
                                <div class="calendar-card-meta">
                                    <span><i class="fas fa-clock"></i> 08h00 - 18h00</span>
                                    <span><i class="fas fa-history"></i> Refresca automático</span>
                                </div>
                            </div>
                            <div id="agenda-calendar"></div>
                        </div>
                    </div>
                </div>
            </section>
        `;
  },

  // ============================================
  // OVERLAYS FLOTANTES
  // ============================================
  crearOverlay(tipo, opciones = {}) {
    const { titulo = '', contenido = '', footer = '', size = 'modal-large' } = opciones;
    this.cerrarOverlay(tipo);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay agenda-overlay';
    overlay.innerHTML = `
            <div class="modal-container ${size}">
                <div class="modal-header">
                    <h3>${titulo}</h3>
                    <button class="btn-close" data-overlay-close>&times;</button>
                </div>
                <div class="modal-body agenda-modal-body">
                    ${contenido}
                </div>
                ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
            </div>
        `;

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.cerrarOverlay(tipo);
      }
    });

    overlay.querySelector('[data-overlay-close]')?.addEventListener('click', () => {
      this.cerrarOverlay(tipo);
    });

    document.body.appendChild(overlay);
    this.overlayRefs[tipo] = overlay;
    return overlay;
  },

  cerrarOverlay(tipo) {
    const overlay = this.overlayRefs[tipo];
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    this.overlayRefs[tipo] = null;
  },

  cerrarTodosOverlays() {
    Object.keys(this.overlayRefs).forEach((tipo) => this.cerrarOverlay(tipo));
  },

  // ============================================
  // INICIALIZAR MÓDULO
  // ============================================
  async init() {
    console.log('🗓️ Inicializando agenda del taller...');

    try {
      // Cargar datos necesarios
      await this.cargarTecnicos();
      await this.cargarClientes();
      await this.cargarOrdenesCompletadas();

      // Inicializar calendario
      await this.inicializarCalendario();

      // Configurar eventos
      this.configurarEventos();

      // Actualizar estadísticas
      await this.actualizarEstadisticas();

      // Configurar auto-actualización
      this.configurarAutoActualizacion();

      console.log('✅ Agenda del taller inicializada');
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR CRÍTICO: Inicialización de Agenda');
      console.error('Mensaje:', error.message);
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      Utils.showToast('Error inicializando agenda: ' + error.message, 'error');
      throw error; // Relanzar - error crítico
    }
  },

  // ============================================
  // INICIALIZAR CALENDARIO
  // ============================================
  async inicializarCalendario() {
    const calendarEl = document.getElementById('agenda-calendar');
    if (!calendarEl) {
      throw new Error('Elemento calendario no encontrado');
    }

    // Destruir calendario existente si existe
    if (this.calendar) {
      this.calendar.destroy();
    }

    // Crear nuevo calendario
    this.calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: this.currentView,
      locale: 'es',
      firstDay: 1, // Lunes como primer día

      // Configuración de header
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      },

      // Botones personalizados
      customButtons: {
        nuevaCita: {
          text: 'Nueva Cita',
          click: () => this.mostrarModalNuevaCita(),
        },
      },

      // Horario de trabajo
      businessHours: {
        daysOfWeek: [1, 2, 3, 4, 5], // Lunes a Viernes
        startTime: this.config.horarioAtencion.inicio,
        endTime: this.config.horarioAtencion.fin,
      },

      // Configuración de horarios
      slotMinTime: this.config.horarioAtencion.inicio,
      slotMaxTime: this.config.horarioAtencion.fin,
      slotDuration: '00:30:00',
      slotLabelInterval: '01:00:00',

      // Eventos
      events: (info, successCallback, failureCallback) => {
        this.cargarEventos(info, successCallback, failureCallback);
      },

      // Callbacks de eventos
      eventClick: (info) => {
        this.mostrarDetallesEvento(info.event);
      },

      dateClick: (info) => {
        this.manejarClickFecha(info);
      },

      eventDrop: (info) => {
        this.manejarMoverEvento(info);
      },

      eventResize: (info) => {
        this.manejarRedimensionarEvento(info);
      },

      // Configuración visual
      height: 'auto',
      aspectRatio: 1.8,

      // Configuración de arrastrar y soltar
      editable: true,
      droppable: true,

      // Configuración de selección
      selectable: true,
      selectMirror: true,
      select: (info) => {
        this.manejarSeleccionFecha(info);
      },
    });

    this.calendar.render();
  },

  // ============================================
  // CARGAR EVENTOS DEL CALENDARIO
  // ============================================
  async cargarEventos(info, successCallback, failureCallback) {
    try {
      const eventos = [];

      // Cargar citas programadas
      const citas = await this.obtenerCitas(info.startStr, info.endStr);
      eventos.push(...citas);

      // Cargar entregas programadas
      const entregas = await this.obtenerEntregas(info.startStr, info.endStr);
      eventos.push(...entregas);

      // Cargar recordatorios
      const recordatorios = await this.obtenerRecordatorios(info.startStr, info.endStr);
      eventos.push(...recordatorios);

      // Aplicar filtros actuales
      const eventosFiltrados = this.aplicarFiltrosEventos(eventos);

      successCallback(eventosFiltrados);
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR: Cargando eventos del calendario');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      failureCallback(error);
    }
  },

  // ============================================
  // OBTENER CITAS
  // ============================================
  async obtenerCitas(fechaInicio, fechaFin) {
    try {
      // 🔄 SINCRONIZACIÓN: Obtener citas desde la API (backend SQLite)
      let citasAPI = [];
      try {
        const response = await Auth._request(
          `/citas?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`
        );
        if (response && Array.isArray(response.data)) {
          citasAPI = response.data;
        } else if (response && Array.isArray(response)) {
          citasAPI = response;
        }

        // Sincronizar con localStorage para compatibilidad
        if (citasAPI.length > 0) {
          const citasLocal = (await Database.getCollection('citas')) || [];

          // Agregar citas de API que no estén en local
          citasAPI.forEach((citaAPI) => {
            const existeLocal = citasLocal.some((c) => c.id === citaAPI.id);
            if (!existeLocal) {
              citasLocal.push(citaAPI);
            }
          });

          // Guardar en localStorage
          await Database.saveCollection('citas', citasLocal);
        }
      } catch (apiError) {
        console.warn(
          '⚠️ No se pudo obtener citas desde API, usando localStorage:',
          apiError.message
        );
      }

      // Usar citas de API si están disponibles, sino usar localStorage
      const todasCitas =
        citasAPI.length > 0 ? citasAPI : (await Database.getCollection('citas')) || [];

      // Filtrar por rango de fechas
      const citas = todasCitas.filter((cita) => {
        const fechaCita = new Date(cita.fecha);
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        return fechaCita >= inicio && fechaCita <= fin;
      });

      return citas.map((cita) => ({
        id: `cita_${cita.id}`,
        title: `${cita.cliente_nombre} - ${cita.vehiculo_placa || cita.vehiculo_descripcion || 'S/P'}`,
        start: `${cita.fecha}T${cita.hora}`,
        end: this.calcularFechaFin(cita.fecha, cita.hora, cita.duracion || 60),
        backgroundColor:
          this.config.coloresPorTipo[cita.tipo_servicio] || this.config.coloresPorTipo.default,
        borderColor:
          this.config.coloresPorTipo[cita.tipo_servicio] || this.config.coloresPorTipo.default,
        extendedProps: {
          tipo: 'cita',
          clienteId: cita.cliente_id,
          vehiculoId: cita.vehiculo_id,
          tecnicoId: cita.tecnico_id,
          tipoServicio: cita.tipo_servicio,
          descripcion: cita.descripcion,
          estado: cita.estado,
          prioridad: cita.prioridad,
          citaId: cita.id,
          clienteNombre: cita.cliente_nombre || cita.clienteNombre || '',
          clienteTelefono: cita.cliente_telefono || cita.clienteTelefono || '',
          vehiculoPlaca: cita.vehiculo_placa || cita.vehiculoPlaca || '',
          conversacionId: cita.conversacion_id || cita.conversacionId || '',
        },
      }));
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR: obtenerCitas');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      return [];
    }
  },

  // ============================================
  // OBTENER ENTREGAS
  // ============================================
  async obtenerEntregas(fechaInicio, fechaFin) {
    try {
      // Usar Database en lugar de fetch API
      const todasOrdenes = (await Database.getCollection('ordenes_trabajo')) || [];

      // Filtrar órdenes finalizadas con fecha de entrega en el rango
      const ordenes = todasOrdenes.filter((orden) => {
        if (orden.estado !== 'finalizado' || !orden.fecha_entrega_estimada) {
          return false;
        }
        const fechaEntrega = new Date(orden.fecha_entrega_estimada);
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        return fechaEntrega >= inicio && fechaEntrega <= fin;
      });

      return ordenes.map((orden) => ({
        id: `entrega_${orden.id}`,
        title: `🚗 Entrega: ${orden.vehiculo_placa} - ${orden.cliente_nombre}`,
        start: `${orden.fecha_entrega_estimada}T${orden.hora_entrega || '10:00'}`,
        end: this.calcularFechaFin(orden.fecha_entrega_estimada, orden.hora_entrega || '10:00', 30),
        backgroundColor: this.config.coloresPorTipo.entrega,
        borderColor: this.config.coloresPorTipo.entrega,
        extendedProps: {
          tipo: 'entrega',
          ordenId: orden.id,
          clienteId: orden.cliente_id,
          vehiculoId: orden.vehiculo_id,
          total: orden.total,
          descripcion: orden.problema_reportado,
        },
      }));
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR: obtenerEntregas');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      return [];
    }
  },

  // ============================================
  // OBTENER RECORDATORIOS
  // ============================================
  async obtenerRecordatorios(fechaInicio, fechaFin) {
    try {
      // Usar Database en lugar de fetch API
      const todosRecordatorios = (await Database.getCollection('recordatorios')) || [];

      // Filtrar por rango de fechas
      const recordatorios = todosRecordatorios.filter((rec) => {
        const fechaRec = new Date(rec.fecha);
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        return fechaRec >= inicio && fechaRec <= fin;
      });

      return recordatorios.map((recordatorio) => ({
        id: `recordatorio_${recordatorio.id}`,
        title: `🔔 ${recordatorio.titulo}`,
        start: `${recordatorio.fecha}T${recordatorio.hora || '09:00'}`,
        end: this.calcularFechaFin(recordatorio.fecha, recordatorio.hora || '09:00', 15),
        backgroundColor: this.config.coloresPorTipo.recordatorio,
        borderColor: this.config.coloresPorTipo.recordatorio,
        textColor: '#000',
        extendedProps: {
          tipo: 'recordatorio',
          descripcion: recordatorio.descripcion,
          completado: recordatorio.completado,
          prioridad: recordatorio.prioridad,
          vehiculoId: recordatorio.vehiculo_id,
          clienteId: recordatorio.cliente_id,
        },
      }));
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR: obtenerRecordatorios');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      return [];
    }
  },

  // ============================================
  // CARGAR DATOS DE SOPORTE
  // ============================================
  async cargarTecnicos() {
    try {
      // Usar Database en lugar de fetch API
      const usuarios = (await Database.getCollection('usuarios')) || [];
      this.technicians = usuarios.filter((u) => u.rol === 'tecnico' || u.rol === 'admin');
      this.actualizarSelectTecnicos();
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR: cargarTecnicos');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
    }
  },

  async cargarClientes() {
    try {
      // Usar Database en lugar de fetch API
      const clientes = (await Database.getCollection('clientes')) || [];
      this.clientesCache = clientes;
      this.actualizarSelectClientes(clientes);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  },

  async cargarOrdenesCompletadas() {
    try {
      // Usar Database en lugar de fetch API
      const todasOrdenes = (await Database.getCollection('ordenes_trabajo')) || [];
      const ordenes = todasOrdenes.filter((o) => o.estado === 'finalizado');
      this.ordenesFinalizadas = ordenes;
      this.actualizarSelectOrdenes(ordenes);
    } catch (error) {
      console.error('Error cargando órdenes completadas:', error);
    }
  },

  // ============================================
  // ACTUALIZAR SELECTS
  // ============================================
  actualizarSelectTecnicos() {
    const selects = ['tecnicoCita', 'filtroTecnico'];
    selects.forEach((selectId) => {
      const select = document.getElementById(selectId);
      if (select) {
        // Limpiar opciones existentes (excepto la primera)
        while (select.children.length > 1) {
          select.removeChild(select.lastChild);
        }

        // Agregar técnicos
        this.technicians.forEach((tecnico) => {
          const option = document.createElement('option');
          option.value = tecnico.id;
          option.textContent = tecnico.nombre;
          select.appendChild(option);
        });
      }
    });
  },

  actualizarSelectClientes(clientes) {
    const select = document.getElementById('clienteCita');
    if (select) {
      // Limpiar opciones existentes (excepto la primera)
      while (select.children.length > 1) {
        select.removeChild(select.lastChild);
      }

      // Agregar clientes
      clientes.forEach((cliente) => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = `${cliente.nombre} - ${cliente.cedula || cliente.telefono}`;
        select.appendChild(option);
      });
    }

    // Configurar evento para cargar vehículos
    if (select) {
      select.onchange = () => this.cargarVehiculosCliente(select.value);
    }
  },

  actualizarSelectOrdenes(ordenes) {
    const select = document.getElementById('ordenEntrega');
    if (select) {
      // Limpiar opciones existentes (excepto la primera)
      while (select.children.length > 1) {
        select.removeChild(select.lastChild);
      }

      // Agregar órdenes
      ordenes.forEach((orden) => {
        const option = document.createElement('option');
        option.value = orden.id;
        option.textContent = `#${orden.numero} - ${orden.vehiculo_placa} - ${orden.cliente_nombre}`;
        select.appendChild(option);
      });
    }
  },

  // ============================================
  // CARGAR VEHÍCULOS DEL CLIENTE
  // ============================================
  async cargarVehiculosCliente(clienteId) {
    const select = document.getElementById('vehiculoCita');
    if (!select || !clienteId) return;

    try {
      const vehiculos = await Auth._request(`/vehiculos?cliente_id=${clienteId}`);
      if (!Array.isArray(vehiculos)) {
        return;
      }

      // Limpiar opciones existentes (excepto la primera)
      while (select.children.length > 1) {
        select.removeChild(select.lastChild);
      }

      // Agregar vehículos
      vehiculos.forEach((vehiculo) => {
        const option = document.createElement('option');
        option.value = vehiculo.id;
        option.textContent = `${vehiculo.marca} ${vehiculo.modelo} - ${vehiculo.placa}`;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('Error cargando vehículos:', error);
    }
  },

  // ============================================
  // FUNCIONES DE UTILIDAD
  // ============================================
  calcularFechaFin(fecha, hora, duracionMinutos) {
    const fechaHora = new Date(`${fecha}T${hora}`);
    fechaHora.setMinutes(fechaHora.getMinutes() + duracionMinutos);
    return fechaHora.toISOString();
  },

  aplicarFiltrosEventos(eventos) {
    const filtroTecnico = document.getElementById('filtroTecnico')?.value;
    const filtroTipoServicio = document.getElementById('filtroTipoServicio')?.value;
    const filtroEstado = document.getElementById('filtroEstado')?.value;

    return eventos.filter((evento) => {
      // Filtro por técnico
      if (filtroTecnico && evento.extendedProps.tecnicoId !== filtroTecnico) {
        return false;
      }

      // Filtro por tipo de servicio
      if (filtroTipoServicio && evento.extendedProps.tipo !== filtroTipoServicio) {
        return false;
      }

      // Filtro por estado
      if (filtroEstado && evento.extendedProps.estado !== filtroEstado) {
        return false;
      }

      return true;
    });
  },

  escapeAttr(value) {
    if (value === undefined || value === null) {
      return '';
    }
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  mostrarConversacionIA(button) {
    if (!button) return;

    const conversacionId = button.getAttribute('data-conversacion-id') || '';
    const clienteId = button.getAttribute('data-cliente-id') || '';
    const clienteNombre = button.getAttribute('data-cliente-nombre') || '';
    const citaId = button.getAttribute('data-cita-id') || '';
    const eventId = button.getAttribute('data-event-id') || '';

    if (
      window.AgendaIAAgent &&
      typeof window.AgendaIAAgent.cargarConversacionDesdeAgenda === 'function'
    ) {
      window.AgendaIAAgent.cargarConversacionDesdeAgenda({
        conversacionId,
        clienteId,
        clienteNombre,
        citaId,
        eventId,
      });
      return;
    }

    if (window.ChatAssistant && typeof window.ChatAssistant.openWhatsAppChat === 'function') {
      if (typeof window.ChatAssistant.setContext === 'function') {
        window.ChatAssistant.setContext('general');
      }
      window.ChatAssistant.openWhatsAppChat('general');
      if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
        Utils.showToast('Conversación IA abierta en el asistente general.', 'info');
      }
      return;
    }

    if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
      Utils.showToast('No se pudo abrir la conversación de esta cita.', 'error');
    } else {
      console.warn('No hay asistente IA disponible para mostrar la conversación.', {
        conversacionId,
        clienteId,
        citaId,
        eventId,
      });
    }
  },

  // ============================================
  // MANEJO DE EVENTOS DE CALENDARIO
  // ============================================
  mostrarDetallesEvento(event) {
    const props = event.extendedProps;
    let html = '';

    if (props.tipo === 'cita') {
      html = this.renderDetallesCita(event);
    } else if (props.tipo === 'entrega') {
      html = this.renderDetallesEntrega(event);
    } else if (props.tipo === 'recordatorio') {
      html = this.renderDetallesRecordatorio(event);
    }

    const footer = `
            <button class="btn btn-secondary" data-overlay-action="close">
                <i class="fas fa-times"></i> Cerrar
            </button>
            <button class="btn btn-outline-danger" data-overlay-action="cancelar">
                <i class="fas fa-ban"></i> Cancelar Evento
            </button>
            <button class="btn btn-primary" data-overlay-action="editar">
                <i class="fas fa-edit"></i> Editar
            </button>
        `;

    const overlay = this.crearOverlay('detallesEvento', {
      titulo: `<i class="fas fa-info-circle"></i> ${event.title}`,
      contenido: html,
      footer,
      size: 'modal-large',
    });

    overlay.querySelector('[data-overlay-action="close"]')?.addEventListener('click', (evt) => {
      evt.preventDefault();
      this.cerrarOverlay('detallesEvento');
    });

    overlay.querySelector('[data-overlay-action="editar"]')?.addEventListener('click', (evt) => {
      evt.preventDefault();
      this.editarEvento(props.tipo, event.id);
    });

    overlay.querySelector('[data-overlay-action="cancelar"]')?.addEventListener('click', (evt) => {
      evt.preventDefault();
      this.cancelarEvento(props.tipo, event.id);
    });
  },

  renderDetallesCita(event) {
    const props = event.extendedProps;
    return `
            <div class="evento-detalle">
                <div class="row">
                    <div class="col-md-6">
                        <h6><i class="fas fa-calendar"></i> Información de la Cita</h6>
                        <table class="table table-sm">
                            <tr><td><strong>Tipo:</strong></td><td>${props.tipoServicio}</td></tr>
                            <tr><td><strong>Estado:</strong></td><td><span class="badge badge-${this.getBadgeColor(props.estado)}">${props.estado}</span></td></tr>
                            <tr><td><strong>Prioridad:</strong></td><td><span class="badge badge-${this.getPriorityColor(props.prioridad)}">${props.prioridad}</span></td></tr>
                            <tr><td><strong>Fecha:</strong></td><td>${event.start.toLocaleDateString()}</td></tr>
                            <tr><td><strong>Hora:</strong></td><td>${event.start.toLocaleTimeString()}</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6><i class="fas fa-user"></i> Cliente y Vehículo</h6>
                        <table class="table table-sm">
                            <tr><td><strong>Cliente ID:</strong></td><td>${props.clienteId}</td></tr>
                            <tr><td><strong>Vehículo ID:</strong></td><td>${props.vehiculoId}</td></tr>
                            <tr><td><strong>Técnico:</strong></td><td>${props.tecnicoId || 'No asignado'}</td></tr>
                        </table>
                    </div>
                </div>
                ${
                  props.descripcion
                    ? `
                    <div class="mt-3">
                        <h6><i class="fas fa-clipboard"></i> Descripción</h6>
                        <p>${props.descripcion}</p>
                    </div>
                `
                    : ''
                }
                <div class="d-flex justify-content-end mt-3">
                    <button class="btn btn-outline-primary btn-sm"
                        data-event-id="${this.escapeAttr(event.id)}"
                        data-cita-id="${this.escapeAttr(props.citaId || '')}"
                        data-cliente-id="${this.escapeAttr(props.clienteId || '')}"
                        data-cliente-nombre="${this.escapeAttr(props.clienteNombre || '')}"
                        data-conversacion-id="${this.escapeAttr(props.conversacionId || '')}"
                        onclick="Agenda.mostrarConversacionIA(this)">
                        <i class="fas fa-comments"></i> Ver conversación IA
                    </button>
                </div>
            </div>
        `;
  },

  renderDetallesEntrega(event) {
    const props = event.extendedProps;
    return `
            <div class="evento-detalle">
                <div class="row">
                    <div class="col-md-6">
                        <h6><i class="fas fa-car-side"></i> Información de Entrega</h6>
                        <table class="table table-sm">
                            <tr><td><strong>Orden:</strong></td><td>#${props.ordenId}</td></tr>
                            <tr><td><strong>Fecha:</strong></td><td>${event.start.toLocaleDateString()}</td></tr>
                            <tr><td><strong>Hora:</strong></td><td>${event.start.toLocaleTimeString()}</td></tr>
                            <tr><td><strong>Total:</strong></td><td>$${props.total?.toLocaleString() || '0'}</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6><i class="fas fa-user"></i> Cliente</h6>
                        <table class="table table-sm">
                            <tr><td><strong>Cliente ID:</strong></td><td>${props.clienteId}</td></tr>
                            <tr><td><strong>Vehículo ID:</strong></td><td>${props.vehiculoId}</td></tr>
                        </table>
                    </div>
                </div>
                ${
                  props.descripcion
                    ? `
                    <div class="mt-3">
                        <h6><i class="fas fa-clipboard"></i> Trabajo Realizado</h6>
                        <p>${props.descripcion}</p>
                    </div>
                `
                    : ''
                }
            </div>
        `;
  },

  renderDetallesRecordatorio(event) {
    const props = event.extendedProps;
    return `
            <div class="evento-detalle">
                <div class="row">
                    <div class="col-md-6">
                        <h6><i class="fas fa-bell"></i> Recordatorio</h6>
                        <table class="table table-sm">
                            <tr><td><strong>Estado:</strong></td><td>
                                <span class="badge badge-${props.completado ? 'success' : 'warning'}">
                                    ${props.completado ? 'Completado' : 'Pendiente'}
                                </span>
                            </td></tr>
                            <tr><td><strong>Prioridad:</strong></td><td><span class="badge badge-${this.getPriorityColor(props.prioridad)}">${props.prioridad || 'Normal'}</span></td></tr>
                            <tr><td><strong>Fecha:</strong></td><td>${event.start.toLocaleDateString()}</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6><i class="fas fa-info"></i> Detalles</h6>
                        <table class="table table-sm">
                            <tr><td><strong>Cliente ID:</strong></td><td>${props.clienteId || 'N/A'}</td></tr>
                            <tr><td><strong>Vehículo ID:</strong></td><td>${props.vehiculoId || 'N/A'}</td></tr>
                        </table>
                    </div>
                </div>
                ${
                  props.descripcion
                    ? `
                    <div class="mt-3">
                        <h6><i class="fas fa-clipboard"></i> Descripción</h6>
                        <p>${props.descripcion}</p>
                    </div>
                `
                    : ''
                }
            </div>
        `;
  },

  // ============================================
  // UTILIADES PARA CLASES CSS
  // ============================================
  getBadgeColor(estado) {
    const colores = {
      programado: 'primary',
      en_proceso: 'warning',
      completado: 'success',
      cancelado: 'danger',
    };
    return colores[estado] || 'secondary';
  },

  getPriorityColor(prioridad) {
    const colores = {
      normal: 'secondary',
      alta: 'warning',
      urgente: 'danger',
    };
    return colores[prioridad] || 'secondary';
  },

  // ============================================
  // ACCIONES DE EVENTOS
  // ============================================
  async editarEvento(tipo, eventId) {
    // Implementar edición según el tipo
    console.log(`Editando evento ${tipo}:`, eventId);
    Utils.showToast('Función de edición en desarrollo', 'info');
  },

  async cancelarEvento(tipo, eventId) {
    if (!confirm('¿Estás seguro de que quieres cancelar este evento?')) {
      return;
    }

    try {
      const id = eventId.split('_')[1];
      let path = '';

      if (tipo === 'cita') {
        path = `/citas/${id}`;
      } else if (tipo === 'entrega') {
        path = `/ordenes-trabajo/${id}`;
      } else if (tipo === 'recordatorio') {
        path = `/recordatorios/${id}`;
      }

      if (!path) {
        throw new Error('Tipo de evento desconocido');
      }

      await Auth._request(path, {
        method: 'PATCH',
        body: { estado: 'cancelado' },
      });

      Utils.showToast('Evento cancelado exitosamente', 'success');
      this.calendar.refetchEvents();
      this.cerrarOverlay('detallesEvento');
    } catch (error) {
      console.error('Error cancelando evento:', error);
      Utils.showToast('Error al cancelar evento', 'error');
    }
  },

  // ============================================
  // MANEJO DE INTERACCIONES DEL CALENDARIO
  // ============================================
  manejarClickFecha(info) {
    this.selectedDate = info.dateStr;

    // Si es una fecha futura, sugerir crear cita
    const fechaSeleccionada = new Date(info.dateStr);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaSeleccionada >= hoy) {
      if (confirm('¿Quieres crear una nueva cita para esta fecha?')) {
        this.mostrarModalNuevaCita(info.dateStr);
      }
    }
  },

  manejarSeleccionFecha(info) {
    if (confirm('¿Quieres crear una nueva cita en este horario?')) {
      this.mostrarModalNuevaCita(
        info.startStr.split('T')[0],
        info.startStr.split('T')[1]?.substring(0, 5)
      );
    }

    // Limpiar selección
    this.calendar.unselect();
  },

  async manejarMoverEvento(info) {
    try {
      const event = info.event;
      const props = event.extendedProps;
      const nuevaFecha = event.start.toISOString().split('T')[0];
      const nuevaHora = event.start.toTimeString().substring(0, 5);

      // Actualizar en la base de datos según el tipo
      let path = '';
      let data = {};
      const baseId = event.id.split('_')[1];

      if (props.tipo === 'cita') {
        path = `/citas/${baseId}`;
        data = { fecha: nuevaFecha, hora: nuevaHora };
      } else if (props.tipo === 'entrega') {
        path = `/ordenes-trabajo/${baseId}`;
        data = { fecha_entrega_estimada: nuevaFecha, hora_entrega: nuevaHora };
      } else if (props.tipo === 'recordatorio') {
        path = `/recordatorios/${baseId}`;
        data = { fecha: nuevaFecha, hora: nuevaHora };
      }

      if (!path) {
        throw new Error('Tipo de evento desconocido');
      }

      await Auth._request(path, {
        method: 'PATCH',
        body: data,
      });

      Utils.showToast('Evento movido exitosamente', 'success');
    } catch (error) {
      console.error('Error moviendo evento:', error);
      Utils.showToast('Error al mover evento', 'error');
      info.revert(); // Revertir el cambio visual
    }
  },

  async manejarRedimensionarEvento(info) {
    try {
      const event = info.event;
      const props = event.extendedProps;

      // Calcular nueva duración
      const duracion = (event.end - event.start) / (1000 * 60); // en minutos

      if (props.tipo === 'cita') {
        const endpoint = `/citas/${event.id.split('_')[1]}`;
        await Auth._request(endpoint, {
          method: 'PATCH',
          body: { duracion },
        });

        Utils.showToast('Duración actualizada exitosamente', 'success');
      } else {
        // Para otros tipos, solo mostrar mensaje informativo
        Utils.showToast(`Nueva duración: ${duracion} minutos`, 'info');
      }
    } catch (error) {
      console.error('Error redimensionando evento:', error);
      Utils.showToast('Error al cambiar duración', 'error');
      info.revert(); // Revertir el cambio visual
    }
  },

  // ============================================
  // MODALES Y FORMULARIOS
  // ============================================
  mostrarModalNuevaCita(fecha = null, hora = null) {
    const contenido = `
            <form id="formNuevaCita" class="agenda-form">
                <div class="form-row agenda-form-row">
                    <div class="form-group">
                        <label>Cliente *</label>
                        <select id="clienteCita" class="form-control" required>
                            <option value="">Selecciona un cliente</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Vehículo *</label>
                        <select id="vehiculoCita" class="form-control" required>
                            <option value="">Selecciona un vehículo</option>
                        </select>
                    </div>
                </div>
                <div class="form-row agenda-form-row">
                    <div class="form-group">
                        <label>Tipo de Servicio *</label>
                        <select id="tipoServicioCita" class="form-control" required>
                            <option value="mantenimiento">Mantenimiento</option>
                            <option value="reparacion">Reparación</option>
                            <option value="diagnostico">Diagnóstico</option>
                            <option value="entrega">Entrega</option>
                            <option value="cita_cliente">Cita con Cliente</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Técnico Asignado</label>
                        <select id="tecnicoCita" class="form-control">
                            <option value="">Asignar automáticamente</option>
                        </select>
                    </div>
                </div>
                <div class="form-row agenda-form-row">
                    <div class="form-group">
                        <label>Fecha *</label>
                        <input type="date" id="fechaCita" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Hora *</label>
                        <input type="time" id="horaCita" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Duración (minutos) *</label>
                        <input type="number" id="duracionCita" class="form-control" min="30" step="30" value="60" required>
                    </div>
                </div>
                <div class="form-row agenda-form-row">
                    <div class="form-group">
                        <label>Prioridad</label>
                        <select id="prioridadCita" class="form-control">
                            <option value="normal">Normal</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Urgente</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Recordatorio</label>
                        <select id="recordatorioCita" class="form-control">
                            <option value="">Sin recordatorio</option>
                            <option value="1_dia">1 día antes</option>
                            <option value="2_horas">2 horas antes</option>
                            <option value="30_minutos">30 minutos antes</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Descripción del Problema</label>
                    <textarea id="descripcionCita" class="form-control" rows="3" placeholder="Describe el problema o servicio requerido..."></textarea>
                </div>
                <div class="form-group">
                    <label>Notas Internas</label>
                    <textarea id="notasCita" class="form-control" rows="2" placeholder="Notas para el equipo del taller..."></textarea>
                </div>
            </form>
        `;

    const footer = `
            <button class="btn btn-secondary" data-overlay-action="close">
                <i class="fas fa-times"></i> Cancelar
            </button>
            <button class="btn btn-primary" data-overlay-action="guardar-cita">
                <i class="fas fa-save"></i> Programar Cita
            </button>
        `;

    const overlay = this.crearOverlay('nuevaCita', {
      titulo: '<i class="fas fa-calendar-plus"></i> Programar Nueva Cita',
      contenido,
      footer,
      size: 'modal-large',
    });

    overlay.querySelector('[data-overlay-action="close"]')?.addEventListener('click', (event) => {
      event.preventDefault();
      this.cerrarOverlay('nuevaCita');
    });

    overlay
      .querySelector('[data-overlay-action="guardar-cita"]')
      ?.addEventListener('click', (event) => {
        event.preventDefault();
        this.guardarNuevaCita();
      });

    this.actualizarSelectTecnicos();
    if (this.clientesCache?.length) {
      this.actualizarSelectClientes(this.clientesCache);
    }

    const vehiculoSelect = overlay.querySelector('#vehiculoCita');
    if (vehiculoSelect) {
      while (vehiculoSelect.children.length > 1) {
        vehiculoSelect.removeChild(vehiculoSelect.lastChild);
      }
    }

    const fechaInput = overlay.querySelector('#fechaCita');
    const horaInput = overlay.querySelector('#horaCita');
    const duracionInput = overlay.querySelector('#duracionCita');
    const tipoServicioSelect = overlay.querySelector('#tipoServicioCita');

    if (fechaInput) {
      if (fecha) {
        fechaInput.value = fecha;
      } else {
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        fechaInput.value = manana.toISOString().split('T')[0];
      }
    }

    if (horaInput) {
      horaInput.value = hora || '09:00';
    }

    if (tipoServicioSelect && duracionInput) {
      const actualizarDuracion = () => {
        const duracion =
          this.config.duracionesPorDefecto[tipoServicioSelect.value] ||
          this.config.duracionesPorDefecto.default;
        duracionInput.value = duracion;
      };
      tipoServicioSelect.addEventListener('change', actualizarDuracion);
      actualizarDuracion();
    }
  },

  mostrarModalEntrega() {
    const contenido = `
            <form id="formEntrega" class="agenda-form">
                <div class="form-group">
                    <label>Orden de Trabajo *</label>
                    <select id="ordenEntrega" class="form-control" required>
                        <option value="">Seleccionar orden...</option>
                    </select>
                </div>
                <div class="form-row agenda-form-row">
                    <div class="form-group">
                        <label>Fecha de Entrega *</label>
                        <input type="date" id="fechaEntrega" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Hora de Entrega *</label>
                        <input type="time" id="horaEntrega" class="form-control" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Notas para el Cliente</label>
                    <textarea id="notasEntrega" class="form-control" rows="3" placeholder="Información adicional para el cliente..."></textarea>
                </div>
                <div class="form-check">
                    <input type="checkbox" id="notificarTelegram" class="form-check-input" checked>
                    <label class="form-check-label" for="notificarTelegram">
                        Notificar al cliente por Telegram
                    </label>
                </div>
            </form>
        `;

    const footer = `
            <button class="btn btn-secondary" data-overlay-action="close">
                <i class="fas fa-times"></i> Cancelar
            </button>
            <button class="btn btn-success" data-overlay-action="guardar-entrega">
                <i class="fas fa-calendar-check"></i> Programar Entrega
            </button>
        `;

    const overlay = this.crearOverlay('entrega', {
      titulo: '<i class="fas fa-car-side"></i> Programar Entrega',
      contenido,
      footer,
      size: 'modal-large',
    });

    overlay.querySelector('[data-overlay-action="close"]')?.addEventListener('click', (event) => {
      event.preventDefault();
      this.cerrarOverlay('entrega');
    });

    overlay
      .querySelector('[data-overlay-action="guardar-entrega"]')
      ?.addEventListener('click', (event) => {
        event.preventDefault();
        this.guardarEntrega();
      });

    this.actualizarSelectOrdenes(this.ordenesFinalizadas || []);

    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaInput = overlay.querySelector('#fechaEntrega');
    const horaInput = overlay.querySelector('#horaEntrega');
    if (fechaInput) {
      fechaInput.value = manana.toISOString().split('T')[0];
    }
    if (horaInput) {
      horaInput.value = '10:00';
    }
  },

  async guardarNuevaCita() {
    try {
      const form = document.getElementById('formNuevaCita');

      // NOTA: El backend espera camelCase (clienteId, vehiculoId, tipoServicio)
      const citaData = {
        clienteId: document.getElementById('clienteCita').value,
        vehiculoId: document.getElementById('vehiculoCita').value,
        tipoServicio: document.getElementById('tipoServicioCita').value,
        fecha: document.getElementById('fechaCita').value,
        hora: document.getElementById('horaCita').value,
        duracion: parseInt(document.getElementById('duracionCita').value),
        tecnicoId: document.getElementById('tecnicoCita').value || null,
        descripcion: document.getElementById('descripcionCita').value,
        notas: document.getElementById('notasCita').value,
        prioridad: document.getElementById('prioridadCita').value,
        recordatorio: document.getElementById('recordatorioCita').value,
        estado: 'programado',
      };

      // Validar campos requeridos
      if (
        !citaData.clienteId ||
        !citaData.vehiculoId ||
        !citaData.tipoServicio ||
        !citaData.fecha ||
        !citaData.hora
      ) {
        Utils.showToast('Por favor completa todos los campos requeridos', 'error');
        return;
      }

      const result = await Auth._request('/citas', {
        method: 'POST',
        body: citaData,
      });

      if (result.success) {
        // Mostrar toast con acción para ver la cita en el calendario
        Utils.showToast(
          'Cita programada exitosamente. Haz clic para ver en el calendario.',
          'success',
          {
            actionUrl: '#agenda',
            actionLabel: 'Ver cita',
            duration: 6000,
          }
        );

        // Crear recordatorio si se solicitó
        if (citaData.recordatorio) {
          await this.crearRecordatorioCita(result.id, citaData);
        }

        // Refrescar calendario
        this.calendar.refetchEvents();

        if (form) {
          form.reset();
        }
        this.cerrarOverlay('nuevaCita');

        // Actualizar estadísticas
        await this.actualizarEstadisticas();
      } else {
        throw new Error(result.message || 'Error al programar cita');
      }
    } catch (error) {
      console.error('Error guardando cita:', error);
      Utils.showToast('Error al programar cita: ' + error.message, 'error');
    }
  },

  async guardarEntrega() {
    try {
      const ordenId = document.getElementById('ordenEntrega').value;
      const fechaEntrega = document.getElementById('fechaEntrega').value;
      const horaEntrega = document.getElementById('horaEntrega').value;
      const notasEntrega = document.getElementById('notasEntrega').value;
      const notificarTelegram = document.getElementById('notificarTelegram').checked;

      if (!ordenId || !fechaEntrega || !horaEntrega) {
        Utils.showToast('Por favor completa todos los campos requeridos', 'error');
        return;
      }

      const result = await Auth._request(`/ordenes-trabajo/${ordenId}`, {
        method: 'PATCH',
        body: {
          fecha_entrega_estimada: fechaEntrega,
          hora_entrega: horaEntrega,
          notas_entrega: notasEntrega,
          estado: 'listo_para_entrega',
        },
      });

      if (result.success) {
        Utils.showToast('Entrega programada exitosamente', 'success');

        // Enviar notificación Telegram si se solicita
        if (notificarTelegram) {
          await this.enviarNotificacionEntrega(ordenId);
        }

        // Refrescar calendario
        this.calendar.refetchEvents();

        this.cerrarOverlay('entrega');

        // Actualizar estadísticas
        await this.actualizarEstadisticas();
      } else {
        throw new Error(result.message || 'Error al programar entrega');
      }
    } catch (error) {
      console.error('Error guardando entrega:', error);
      Utils.showToast('Error al programar entrega: ' + error.message, 'error');
    }
  },

  // ============================================
  // RECORDATORIOS Y NOTIFICACIONES
  // ============================================
  async crearRecordatorioCita(citaId, citaData) {
    try {
      const fechaCita = new Date(`${citaData.fecha}T${citaData.hora}`);
      const fechaRecordatorio = new Date(fechaCita);

      // Calcular fecha del recordatorio según la configuración
      switch (citaData.recordatorio) {
        case '1_dia':
          fechaRecordatorio.setDate(fechaRecordatorio.getDate() - 1);
          break;
        case '2_horas':
          fechaRecordatorio.setHours(fechaRecordatorio.getHours() - 2);
          break;
        case '30_minutos':
          fechaRecordatorio.setMinutes(fechaRecordatorio.getMinutes() - 30);
          break;
      }

      const recordatorioData = {
        titulo: `Recordatorio de Cita`,
        descripcion: `Cita programada para ${citaData.tipoServicio} - Cliente: ${citaData.clienteId}`,
        fecha: fechaRecordatorio.toISOString().split('T')[0],
        hora: fechaRecordatorio.toTimeString().substring(0, 5),
        tipo: 'cita',
        cliente_id: citaData.clienteId,
        vehiculo_id: citaData.vehiculoId,
        completado: false,
      };

      await Auth._request('/recordatorios', {
        method: 'POST',
        body: recordatorioData,
      });
    } catch (error) {
      console.error('Error creando recordatorio:', error);
    }
  },

  async enviarNotificacionEntrega(ordenId) {
    try {
      // Obtener datos de la orden
      const orden = await Auth._request(`/ordenes-trabajo/${ordenId}`);
      if (!orden || !orden.id) {
        return;
      }

      // Usar el sistema de notificaciones Telegram si está disponible
      if (typeof TelegramNotificaciones !== 'undefined' && TelegramNotificaciones.inicializado) {
        // Obtener datos del cliente y vehículo
        const [cliente, vehiculo] = await Promise.all([
          Auth._request(`/clientes/${orden.cliente_id}`),
          Auth._request(`/vehiculos/${orden.vehiculo_id}`),
        ]);

        if (cliente && vehiculo) {
          await TelegramNotificaciones.enviarNotificacionVehiculoListo(cliente, vehiculo, orden);
        }
      }
    } catch (error) {
      console.error('Error enviando notificación de entrega:', error);
    }
  },

  // ============================================
  // ACCIONES RÁPIDAS
  // ============================================
  verCitasHoy() {
    const hoy = new Date().toISOString().split('T')[0];
    this.calendar.gotoDate(hoy);
    this.cambiarVista('timeGridDay');

    // Aplicar filtro para mostrar solo citas
    document.getElementById('filtroTipoServicio').value = 'cita';
    this.aplicarFiltros();
  },

  async verEntregasPendientes() {
    try {
      const entregas = await Auth._request('/ordenes-trabajo?estado=listo_para_entrega');
      if (!Array.isArray(entregas)) {
        return;
      }

      if (entregas.length === 0) {
        Utils.showToast('No hay entregas pendientes', 'info');
        return;
      }

      // Cambiar a vista de mes y resaltar entregas
      this.cambiarVista('dayGridMonth');
      document.getElementById('filtroTipoServicio').value = 'entrega';
      this.aplicarFiltros();

      Utils.showToast(`${entregas.length} entregas pendientes mostradas`, 'info');
    } catch (error) {
      console.error('Error obteniendo entregas pendientes:', error);
      Utils.showToast('Error obteniendo entregas pendientes', 'error');
    }
  },

  async verRecordatoriosVencidos() {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const response = await Auth._request(`/recordatorios?fecha_hasta=${hoy}&completado=0`);

      // Manejar tanto formato array como objeto { data: [] }
      let recordatorios = [];
      if (Array.isArray(response)) {
        recordatorios = response;
      } else if (response && Array.isArray(response.data)) {
        recordatorios = response.data;
      } else if (response && response.success === false) {
        console.warn('Error en respuesta:', response.message);
        return;
      }

      if (recordatorios.length === 0) {
        Utils.showToast('No hay recordatorios vencidos', 'success');
        return;
      }

      // Cambiar a vista de mes y resaltar recordatorios
      this.cambiarVista('dayGridMonth');
      document.getElementById('filtroTipoServicio').value = 'recordatorio';
      this.aplicarFiltros();

      Utils.showToast(`${recordatorios.length} recordatorios vencidos mostrados`, 'warning');
    } catch (error) {
      console.error('Error obteniendo recordatorios vencidos:', error);
      Utils.showToast('Error obteniendo recordatorios vencidos', 'error');
    }
  },

  // ============================================
  // CONFIGURACIÓN Y UTILIDADES
  // ============================================
  cambiarVista(vista) {
    this.currentView = vista;
    if (this.calendar) {
      this.calendar.changeView(vista);
    }

    // Actualizar botones activos
    document.querySelectorAll('.agenda-view-group .btn').forEach((btn) => {
      btn.classList.remove('active');
    });

    const vistaMap = {
      dayGridMonth: 'Month',
      timeGridWeek: 'Week',
      timeGridDay: 'Day',
    };
    const btnVista = document.getElementById(`btnVista${vistaMap[vista] || ''}`);
    if (btnVista) {
      btnVista.classList.add('active');
    }
  },

  aplicarFiltros() {
    if (this.calendar) {
      this.calendar.refetchEvents();
    }
  },

  configurarEventos() {
    // Configurar eventos de filtros
    const filtros = ['filtroTecnico', 'filtroTipoServicio', 'filtroEstado'];
    filtros.forEach((filtroId) => {
      const filtro = document.getElementById(filtroId);
      if (filtro) {
        filtro.addEventListener('change', () => this.aplicarFiltros());
      }
    });
  },

  async actualizarEstadisticas() {
    try {
      const hoy = new Date().toISOString().split('T')[0];

      // Usar Database en lugar de fetch API
      const todasCitas = (await Database.getCollection('citas')) || [];
      const citasHoy = todasCitas.filter((c) => c.fecha === hoy);

      // Estadísticas de entregas de hoy
      const todasOrdenes = (await Database.getCollection('ordenes_trabajo')) || [];
      const entregasHoy = todasOrdenes.filter((o) => o.fecha_entrega_estimada === hoy);

      // Estadísticas de bahías (simuladas)
      const bahiasOcupadas = citasHoy.filter((cita) => cita.estado === 'en_proceso').length;

      // Actualizar DOM - con verificación de existencia
      const citasHoyEl = document.getElementById('citasHoy');
      const entregasHoyEl = document.getElementById('entregasHoy');
      const bahiasOcupadasEl = document.getElementById('bahiasOcupadas');

      if (citasHoyEl) citasHoyEl.textContent = citasHoy.length;
      if (entregasHoyEl) entregasHoyEl.textContent = entregasHoy.length;
      if (bahiasOcupadasEl) bahiasOcupadasEl.textContent = bahiasOcupadas;
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR: actualizarEstadisticas');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      // No relanzar para no romper el interval
    }
  },

  configurarAutoActualizacion() {
    // Actualizar estadísticas cada 5 minutos
    setInterval(
      () => {
        this.actualizarEstadisticas();
      },
      5 * 60 * 1000
    );

    // Refrescar eventos cada 10 minutos
    setInterval(
      () => {
        if (this.calendar) {
          this.calendar.refetchEvents();
        }
      },
      10 * 60 * 1000
    );
  },

  async exportarAgenda() {
    try {
      // Obtener fechas visibles del calendario
      const view = this.calendar.view;
      const fechaInicio = view.activeStart.toISOString().split('T')[0];
      const fechaFin = view.activeEnd.toISOString().split('T')[0];

      const response = await Auth.authenticatedFetch(
        `/api/agenda/exportar?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`,
        {
          method: 'GET',
          headers: {
            Accept: 'text/plain, application/pdf',
          },
        }
      );

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;

        // Determinar extensión según tipo de contenido
        const extension = contentType.includes('pdf') ? '.pdf' : '.txt';
        a.download = `agenda_${fechaInicio}_${fechaFin}${extension}`;

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        Utils.showToast('Agenda exportada exitosamente', 'success');
      } else {
        throw new Error('Error al exportar agenda');
      }
    } catch (error) {
      console.error('Error exportando agenda:', error);
      Utils.showToast('Error al exportar agenda', 'error');
    }
  },

  mostrarVistaRecordatorios() {
    // Redirigir al módulo de recordatorios
    if (typeof App !== 'undefined' && App.loadModule) {
      App.loadModule('notificaciones_inteligentes');
    } else {
      Utils.showToast('Módulo de recordatorios no disponible', 'warning');
    }
  },

  abrirNuevoCliente() {
    // Redirigir al módulo de clientes para crear uno nuevo
    if (typeof App !== 'undefined' && App.loadModule) {
      App.loadModule('clientes');
      Utils.showToast('Abriendo módulo de clientes...', 'info');
    } else {
      Utils.showToast('Módulo de clientes no disponible', 'warning');
    }
  },
};

// Exponer globalmente
window.Agenda = Agenda;
