// ============================================
// MÓDULO: NÓMINAS Y GESTIÓN DE PERSONAL
// Sistema completo de RRHH profesional
// ============================================

window.Nominas = {
  state: {
    tabActiva: 'dashboard',
    empleados: [],
    asistenciaHoy: [],
    permisosPendientes: [],
    nominas: [],
    estadisticas: {},
    empleadoSeleccionado: null,
    config: {},
  },

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  async render(container) {
    await this.cargarDatos();

    container.innerHTML = `
            <div class="nominas-module">
                <div class="page-header">
                    <div>
                        <h2><i class="fas fa-users-cog"></i> Nóminas y Personal</h2>
                        <p class="text-muted">Gestión de empleados, asistencia, pagos y beneficios</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-secondary" onclick="Nominas.exportarReporte()">
                            <i class="fas fa-file-excel"></i> Exportar
                        </button>
                        <button class="btn btn-primary" onclick="Nominas.mostrarConfiguracion()">
                            <i class="fas fa-cog"></i> Configuración
                        </button>
                    </div>
                </div>

                <!-- Tabs de Navegación -->
                <div class="tabs nominas-tabs">
                    <button class="tab-btn ${this.state.tabActiva === 'dashboard' ? 'active' : ''}" 
                            onclick="Nominas.cambiarTab('dashboard')">
                        <i class="fas fa-tachometer-alt"></i> <span>Dashboard</span>
                    </button>
                    <button class="tab-btn ${this.state.tabActiva === 'empleados' ? 'active' : ''}" 
                            onclick="Nominas.cambiarTab('empleados')">
                        <i class="fas fa-user-tie"></i> <span>Empleados</span>
                    </button>
                    <button class="tab-btn ${this.state.tabActiva === 'asistencia' ? 'active' : ''}" 
                            onclick="Nominas.cambiarTab('asistencia')">
                        <i class="fas fa-clock"></i> <span>Asistencia</span>
                    </button>
                    <button class="tab-btn ${this.state.tabActiva === 'permisos' ? 'active' : ''}" 
                            onclick="Nominas.cambiarTab('permisos')">
                        <i class="fas fa-calendar-check"></i> <span>Permisos</span>
                    </button>
                    <button class="tab-btn ${this.state.tabActiva === 'nominas' ? 'active' : ''}" 
                            onclick="Nominas.cambiarTab('nominas')">
                        <i class="fas fa-money-check-alt"></i> <span>Nóminas</span>
                    </button>
                    <button class="tab-btn ${this.state.tabActiva === 'anticipos' ? 'active' : ''}" 
                            onclick="Nominas.cambiarTab('anticipos')">
                        <i class="fas fa-hand-holding-usd"></i> <span>Anticipos</span>
                    </button>
                </div>

                <!-- Contenido de Tabs -->
                <div id="nominasTabContent">
                    ${await this.renderTabContent()}
                </div>
            </div>
        `;
  },

  // ============================================
  // CARGAR DATOS
  // ============================================
  async cargarDatos() {
    try {
      const [empleados, asistencia, permisos, nominas, estadisticas, config] = await Promise.all([
        this.fetchAPI('/api/nominas/empleados?estado=activo'),
        this.fetchAPI('/api/nominas/asistencia/hoy'),
        this.fetchAPI('/api/nominas/permisos?estado=pendiente'),
        this.fetchAPI('/api/nominas/nominas'),
        this.fetchAPI('/api/nominas/estadisticas'),
        this.fetchAPI('/api/nominas/config'),
      ]);

      this.state.empleados = empleados || [];
      this.state.asistenciaHoy = asistencia || [];
      this.state.permisosPendientes = permisos || [];
      this.state.nominas = nominas || [];
      this.state.estadisticas = estadisticas || {};
      this.state.config = config || {};
    } catch (error) {
      console.error('Error cargando datos de nóminas:', error);
    }
  },

  async fetchAPI(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error en la petición');
      return await response.json();
    } catch (error) {
      console.error('Error fetch:', error);
      return null;
    }
  },

  // ============================================
  // CAMBIAR TAB
  // ============================================
  async cambiarTab(tab) {
    this.state.tabActiva = tab;
    const content = document.getElementById('nominasTabContent');
    if (content) {
      content.innerHTML = await this.renderTabContent();
    }

    document.querySelectorAll('.nominas-tabs .tab-btn').forEach((btn) => {
      btn.classList.remove('active');
    });
    document.querySelector(`[onclick="Nominas.cambiarTab('${tab}')"]`)?.classList.add('active');
  },

  // ============================================
  // RENDER CONTENIDO DE TAB
  // ============================================
  async renderTabContent() {
    switch (this.state.tabActiva) {
      case 'dashboard':
        return this.renderDashboard();
      case 'empleados':
        return this.renderEmpleados();
      case 'asistencia':
        return this.renderAsistencia();
      case 'permisos':
        return this.renderPermisos();
      case 'nominas':
        return this.renderNominas();
      case 'anticipos':
        return this.renderAnticipos();
      default:
        return this.renderDashboard();
    }
  },

  // ============================================
  // DASHBOARD
  // ============================================
  renderDashboard() {
    const stats = this.state.estadisticas;
    const asistencia = stats.asistencia_hoy || {};
    const presentes = asistencia.presentes || 0;
    const total = asistencia.total_empleados || 0;
    const porcentaje = total > 0 ? ((presentes / total) * 100).toFixed(0) : 0;

    return `
            <div class="nominas-dashboard">
                <!-- Tarjetas de Resumen -->
                <div class="stats-grid-4">
                    <div class="stat-card">
                        <div class="stat-icon" style="background: var(--primary-light); color: var(--primary-color);">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value">${stats.empleados_activos || 0}</span>
                            <span class="stat-label">Empleados Activos</span>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon" style="background: var(--success-light); color: var(--success-color);">
                            <i class="fas fa-user-check"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value">${presentes}/${total}</span>
                            <span class="stat-label">Presentes Hoy (${porcentaje}%)</span>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon" style="background: var(--warning-light); color: var(--warning-color);">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value">${stats.permisos_pendientes || 0}</span>
                            <span class="stat-label">Permisos Pendientes</span>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon" style="background: var(--info-light); color: var(--info-color);">
                            <i class="fas fa-hand-holding-usd"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value">$${(stats.anticipos_pendientes?.monto || 0).toFixed(2)}</span>
                            <span class="stat-label">Anticipos Pendientes</span>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <!-- Asistencia de Hoy -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title"><i class="fas fa-clipboard-check"></i> Asistencia de Hoy</h3>
                            <button class="btn btn-sm btn-primary" onclick="Nominas.cambiarTab('asistencia')">
                                Ver todo
                            </button>
                        </div>
                        <div class="card-body">
                            <div class="asistencia-lista">
                                ${this.state.asistenciaHoy
                                  .slice(0, 6)
                                  .map(
                                    (a) => `
                                    <div class="asistencia-item">
                                        <div class="empleado-avatar">
                                            ${a.foto ? `<img src="${a.foto}" alt="">` : `<i class="fas fa-user"></i>`}
                                        </div>
                                        <div class="empleado-info">
                                            <span class="nombre">${a.nombre_completo}</span>
                                            <span class="cargo">${a.cargo || 'Sin cargo'}</span>
                                        </div>
                                        <div class="asistencia-estado">
                                            ${this.getBadgeEstadoAsistencia(a.estado_actual)}
                                            ${a.hora_entrada ? `<small>${a.hora_entrada}</small>` : ''}
                                        </div>
                                    </div>
                                `
                                  )
                                  .join('')}
                                ${this.state.asistenciaHoy.length === 0 ? '<p class="text-muted text-center">No hay registros de asistencia</p>' : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Permisos Pendientes -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title"><i class="fas fa-calendar-alt"></i> Solicitudes Pendientes</h3>
                            <button class="btn btn-sm btn-primary" onclick="Nominas.cambiarTab('permisos')">
                                Ver todo
                            </button>
                        </div>
                        <div class="card-body">
                            <div class="permisos-lista">
                                ${this.state.permisosPendientes
                                  .slice(0, 5)
                                  .map(
                                    (p) => `
                                    <div class="permiso-item">
                                        <div class="permiso-info">
                                            <span class="nombre">${p.nombre_empleado}</span>
                                            <span class="tipo">${this.getTipoPermisoLabel(p.tipo)}</span>
                                        </div>
                                        <div class="permiso-fechas">
                                            <small>${p.fecha_inicio} - ${p.fecha_fin}</small>
                                            <span class="dias">${p.dias_solicitados} días</span>
                                        </div>
                                        <div class="permiso-acciones">
                                            <button class="btn btn-xs btn-success" onclick="Nominas.responderPermiso('${p.id}', 'aprobado')">
                                                <i class="fas fa-check"></i>
                                            </button>
                                            <button class="btn btn-xs btn-danger" onclick="Nominas.responderPermiso('${p.id}', 'rechazado')">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </div>
                                    </div>
                                `
                                  )
                                  .join('')}
                                ${this.state.permisosPendientes.length === 0 ? '<p class="text-muted text-center">No hay solicitudes pendientes</p>' : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Acciones Rápidas -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-bolt"></i> Acciones Rápidas</h3>
                    </div>
                    <div class="card-body">
                        <div class="acciones-rapidas">
                            <button class="accion-btn" onclick="Nominas.mostrarFormularioEmpleado()">
                                <i class="fas fa-user-plus"></i>
                                <span>Nuevo Empleado</span>
                            </button>
                            <button class="accion-btn" onclick="Nominas.mostrarProcesarNomina()">
                                <i class="fas fa-calculator"></i>
                                <span>Procesar Nómina</span>
                            </button>
                            <button class="accion-btn" onclick="Nominas.mostrarFormularioAnticipo()">
                                <i class="fas fa-money-bill-wave"></i>
                                <span>Registrar Anticipo</span>
                            </button>
                            <button class="accion-btn" onclick="Nominas.marcarAsistenciaMasiva()">
                                <i class="fas fa-clipboard-list"></i>
                                <span>Asistencia Masiva</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  },

  // ============================================
  // EMPLEADOS
  // ============================================
  renderEmpleados() {
    return `
            <div class="empleados-section">
                <div class="section-header">
                    <div class="filtros-empleados">
                        <input type="text" id="buscarEmpleado" class="form-control" 
                               placeholder="Buscar empleado..." onkeyup="Nominas.filtrarEmpleados()">
                        <select id="filtroDepartamento" class="form-control" onchange="Nominas.filtrarEmpleados()">
                            <option value="">Todos los departamentos</option>
                            <option value="taller">Taller</option>
                            <option value="ventas">Ventas</option>
                            <option value="administracion">Administración</option>
                            <option value="bodega">Bodega</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="Nominas.mostrarFormularioEmpleado()">
                        <i class="fas fa-plus"></i> Nuevo Empleado
                    </button>
                </div>

                <div class="empleados-grid" id="listaEmpleados">
                    ${this.state.empleados.map((e) => this.renderEmpleadoCard(e)).join('')}
                    ${this.state.empleados.length === 0 ? '<p class="text-muted text-center">No hay empleados registrados</p>' : ''}
                </div>
            </div>
        `;
  },

  renderEmpleadoCard(empleado) {
    const especialidades = empleado.especialidades ? JSON.parse(empleado.especialidades) : [];

    return `
            <div class="empleado-card" onclick="Nominas.verEmpleado('${empleado.id}')">
                <div class="empleado-card-header">
                    <div class="empleado-avatar-lg">
                        ${empleado.foto ? `<img src="${empleado.foto}" alt="">` : `<i class="fas fa-user"></i>`}
                    </div>
                    <span class="badge badge-${empleado.estado === 'activo' ? 'success' : 'secondary'}">${empleado.estado}</span>
                </div>
                <div class="empleado-card-body">
                    <h4>${empleado.nombre} ${empleado.apellido}</h4>
                    <p class="cargo">${empleado.cargo || 'Sin cargo'}</p>
                    <p class="departamento"><i class="fas fa-building"></i> ${empleado.departamento || 'Sin departamento'}</p>
                    <p class="cedula"><i class="fas fa-id-card"></i> ${empleado.cedula}</p>
                </div>
                <div class="empleado-card-footer">
                    <div class="stats-mini">
                        <span><i class="fas fa-briefcase"></i> ${empleado.total_trabajos || 0} trabajos</span>
                        <span><i class="fas fa-dollar-sign"></i> $${(empleado.comisiones_pendientes || 0).toFixed(2)}</span>
                    </div>
                    ${
                      especialidades.length > 0
                        ? `
                        <div class="especialidades-tags">
                            ${especialidades
                              .slice(0, 3)
                              .map((e) => `<span class="tag">${e}</span>`)
                              .join('')}
                        </div>
                    `
                        : ''
                    }
                </div>
            </div>
        `;
  },

  // ============================================
  // ASISTENCIA
  // ============================================
  renderAsistencia() {
    const hoy = new Date().toISOString().split('T')[0];

    return `
            <div class="asistencia-section">
                <div class="section-header">
                    <div class="filtros-asistencia">
                        <input type="date" id="fechaAsistencia" class="form-control" 
                               value="${hoy}" onchange="Nominas.cargarAsistenciaFecha()">
                    </div>
                    <div class="asistencia-acciones">
                        <button class="btn btn-success" onclick="Nominas.marcarEntradaTodos()">
                            <i class="fas fa-sign-in-alt"></i> Marcar Entradas
                        </button>
                        <button class="btn btn-warning" onclick="Nominas.marcarSalidaTodos()">
                            <i class="fas fa-sign-out-alt"></i> Marcar Salidas
                        </button>
                    </div>
                </div>

                <!-- Resumen del día -->
                <div class="asistencia-resumen">
                    <div class="resumen-item presentes">
                        <i class="fas fa-user-check"></i>
                        <span class="numero" id="conteoPresentes">${this.state.asistenciaHoy.filter((a) => a.estado_actual === 'trabajando' || a.estado_actual === 'jornada_completa').length}</span>
                        <span class="label">Presentes</span>
                    </div>
                    <div class="resumen-item ausentes">
                        <i class="fas fa-user-times"></i>
                        <span class="numero" id="conteoAusentes">${this.state.asistenciaHoy.filter((a) => a.estado_actual === 'sin_marcar').length}</span>
                        <span class="label">Sin marcar</span>
                    </div>
                    <div class="resumen-item tardanzas">
                        <i class="fas fa-user-clock"></i>
                        <span class="numero" id="conteoTardanzas">${this.state.asistenciaHoy.filter((a) => a.estado_asistencia === 'tardanza').length}</span>
                        <span class="label">Tardanzas</span>
                    </div>
                </div>

                <!-- Tabla de asistencia -->
                <div class="table-responsive">
                    <table class="table table-asistencia">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Cargo</th>
                                <th>Entrada</th>
                                <th>Salida</th>
                                <th>Horas</th>
                                <th>H. Extra</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tablaAsistencia">
                            ${this.state.asistenciaHoy
                              .map(
                                (a) => `
                                <tr>
                                    <td>
                                        <div class="empleado-cell">
                                            <div class="avatar-sm">
                                                ${a.foto ? `<img src="${a.foto}" alt="">` : `<i class="fas fa-user"></i>`}
                                            </div>
                                            <span>${a.nombre_completo}</span>
                                        </div>
                                    </td>
                                    <td>${a.cargo || '-'}</td>
                                    <td>${a.hora_entrada || '-'}</td>
                                    <td>${a.hora_salida || '-'}</td>
                                    <td>${a.horas_trabajadas || '0.00'}</td>
                                    <td>${a.horas_extra || '0.00'}</td>
                                    <td>${this.getBadgeEstadoAsistencia(a.estado_actual)}</td>
                                    <td>
                                        <div class="btn-group">
                                            ${
                                              !a.hora_entrada
                                                ? `
                                                <button class="btn btn-xs btn-success" onclick="Nominas.marcarEntrada('${a.empleado_id}')" title="Marcar entrada">
                                                    <i class="fas fa-sign-in-alt"></i>
                                                </button>
                                            `
                                                : ''
                                            }
                                            ${
                                              a.hora_entrada && !a.hora_salida
                                                ? `
                                                <button class="btn btn-xs btn-warning" onclick="Nominas.marcarSalida('${a.empleado_id}')" title="Marcar salida">
                                                    <i class="fas fa-sign-out-alt"></i>
                                                </button>
                                            `
                                                : ''
                                            }
                                            <button class="btn btn-xs btn-secondary" onclick="Nominas.editarAsistencia('${a.empleado_id}')" title="Editar">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `
                              )
                              .join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
  },

  // ============================================
  // PERMISOS
  // ============================================
  renderPermisos() {
    return `
            <div class="permisos-section">
                <div class="section-header">
                    <div class="filtros-permisos">
                        <select id="filtroEstadoPermiso" class="form-control" onchange="Nominas.filtrarPermisos()">
                            <option value="">Todos los estados</option>
                            <option value="pendiente" selected>Pendientes</option>
                            <option value="aprobado">Aprobados</option>
                            <option value="rechazado">Rechazados</option>
                        </select>
                        <select id="filtroTipoPermiso" class="form-control" onchange="Nominas.filtrarPermisos()">
                            <option value="">Todos los tipos</option>
                            <option value="vacaciones">Vacaciones</option>
                            <option value="enfermedad">Enfermedad</option>
                            <option value="personal">Personal</option>
                            <option value="maternidad">Maternidad</option>
                            <option value="paternidad">Paternidad</option>
                            <option value="calamidad">Calamidad Doméstica</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="Nominas.mostrarFormularioPermiso()">
                        <i class="fas fa-plus"></i> Nueva Solicitud
                    </button>
                </div>

                <div class="permisos-grid" id="listaPermisos">
                    ${this.state.permisosPendientes.map((p) => this.renderPermisoCard(p)).join('')}
                    ${this.state.permisosPendientes.length === 0 ? '<p class="text-muted text-center">No hay solicitudes pendientes</p>' : ''}
                </div>
            </div>
        `;
  },

  renderPermisoCard(permiso) {
    return `
            <div class="permiso-card">
                <div class="permiso-card-header">
                    <div class="empleado-mini">
                        <i class="fas fa-user"></i>
                        <span>${permiso.nombre_empleado}</span>
                    </div>
                    <span class="badge badge-${this.getColorEstadoPermiso(permiso.estado)}">${permiso.estado}</span>
                </div>
                <div class="permiso-card-body">
                    <div class="permiso-tipo">
                        <i class="${this.getIconoTipoPermiso(permiso.tipo)}"></i>
                        <span>${this.getTipoPermisoLabel(permiso.tipo)}</span>
                    </div>
                    <div class="permiso-fechas">
                        <div class="fecha">
                            <span class="label">Desde</span>
                            <span class="valor">${permiso.fecha_inicio}</span>
                        </div>
                        <div class="fecha">
                            <span class="label">Hasta</span>
                            <span class="valor">${permiso.fecha_fin}</span>
                        </div>
                        <div class="fecha">
                            <span class="label">Días</span>
                            <span class="valor">${permiso.dias_solicitados}</span>
                        </div>
                    </div>
                    ${permiso.motivo ? `<p class="motivo">${permiso.motivo}</p>` : ''}
                </div>
                ${
                  permiso.estado === 'pendiente'
                    ? `
                    <div class="permiso-card-footer">
                        <button class="btn btn-success" onclick="Nominas.responderPermiso('${permiso.id}', 'aprobado')">
                            <i class="fas fa-check"></i> Aprobar
                        </button>
                        <button class="btn btn-danger" onclick="Nominas.responderPermiso('${permiso.id}', 'rechazado')">
                            <i class="fas fa-times"></i> Rechazar
                        </button>
                    </div>
                `
                    : ''
                }
            </div>
        `;
  },

  // ============================================
  // NÓMINAS
  // ============================================
  renderNominas() {
    return `
            <div class="nominas-section">
                <div class="section-header">
                    <div class="filtros-nominas">
                        <select id="filtroAnioNomina" class="form-control" onchange="Nominas.filtrarNominas()">
                            <option value="2025">2025</option>
                            <option value="2024">2024</option>
                        </select>
                        <select id="filtroEstadoNomina" class="form-control" onchange="Nominas.filtrarNominas()">
                            <option value="">Todos los estados</option>
                            <option value="borrador">Borrador</option>
                            <option value="procesada">Procesada</option>
                            <option value="pagada">Pagada</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="Nominas.mostrarProcesarNomina()">
                        <i class="fas fa-calculator"></i> Procesar Nómina
                    </button>
                </div>

                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Período</th>
                                <th>Tipo</th>
                                <th>Empleados</th>
                                <th>Total Ingresos</th>
                                <th>Total Deducciones</th>
                                <th>Neto a Pagar</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.state.nominas
                              .map(
                                (n) => `
                                <tr>
                                    <td>${n.periodo_inicio} - ${n.periodo_fin}</td>
                                    <td>${this.getTipoPeriodoLabel(n.tipo_periodo)}</td>
                                    <td>${n.total_empleados}</td>
                                    <td class="text-success">$${parseFloat(n.total_ingresos).toFixed(2)}</td>
                                    <td class="text-danger">$${parseFloat(n.total_deducciones).toFixed(2)}</td>
                                    <td class="text-primary"><strong>$${parseFloat(n.total_neto).toFixed(2)}</strong></td>
                                    <td>${this.getBadgeEstadoNomina(n.estado)}</td>
                                    <td>
                                        <div class="btn-group">
                                            <button class="btn btn-xs btn-info" onclick="Nominas.verNomina('${n.id}')" title="Ver detalle">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            ${
                                              n.estado === 'procesada'
                                                ? `
                                                <button class="btn btn-xs btn-success" onclick="Nominas.pagarNomina('${n.id}')" title="Marcar como pagada">
                                                    <i class="fas fa-check-circle"></i>
                                                </button>
                                            `
                                                : ''
                                            }
                                            <button class="btn btn-xs btn-secondary" onclick="Nominas.exportarNomina('${n.id}')" title="Exportar">
                                                <i class="fas fa-file-pdf"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `
                              )
                              .join('')}
                            ${this.state.nominas.length === 0 ? '<tr><td colspan="8" class="text-center text-muted">No hay nóminas procesadas</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
  },

  // ============================================
  // ANTICIPOS
  // ============================================
  renderAnticipos() {
    return `
            <div class="anticipos-section">
                <div class="section-header">
                    <div class="filtros-anticipos">
                        <select id="filtroEstadoAnticipo" class="form-control" onchange="Nominas.filtrarAnticipos()">
                            <option value="">Todos los estados</option>
                            <option value="pendiente">Pendientes</option>
                            <option value="aprobado">Aprobados</option>
                            <option value="descontado">Descontados</option>
                            <option value="rechazado">Rechazados</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="Nominas.mostrarFormularioAnticipo()">
                        <i class="fas fa-plus"></i> Nuevo Anticipo
                    </button>
                </div>

                <div class="anticipos-lista" id="listaAnticipos">
                    <!-- Se cargará dinámicamente -->
                    <p class="text-muted text-center">Cargando anticipos...</p>
                </div>
            </div>
        `;
  },

  // ============================================
  // HELPERS
  // ============================================
  getBadgeEstadoAsistencia(estado) {
    const estados = {
      sin_marcar: '<span class="badge badge-secondary">Sin marcar</span>',
      trabajando: '<span class="badge badge-success">Trabajando</span>',
      jornada_completa: '<span class="badge badge-info">Jornada completa</span>',
      tardanza: '<span class="badge badge-warning">Tardanza</span>',
      ausente: '<span class="badge badge-danger">Ausente</span>',
    };
    return estados[estado] || '<span class="badge badge-secondary">Desconocido</span>';
  },

  getBadgeEstadoNomina(estado) {
    const estados = {
      borrador: '<span class="badge badge-secondary">Borrador</span>',
      procesada: '<span class="badge badge-warning">Procesada</span>',
      pagada: '<span class="badge badge-success">Pagada</span>',
      anulada: '<span class="badge badge-danger">Anulada</span>',
    };
    return estados[estado] || '<span class="badge badge-secondary">Desconocido</span>';
  },

  getTipoPermisoLabel(tipo) {
    const tipos = {
      vacaciones: 'Vacaciones',
      enfermedad: 'Enfermedad',
      personal: 'Personal',
      maternidad: 'Maternidad',
      paternidad: 'Paternidad',
      calamidad: 'Calamidad Doméstica',
      sin_goce: 'Sin Goce de Sueldo',
    };
    return tipos[tipo] || tipo;
  },

  getIconoTipoPermiso(tipo) {
    const iconos = {
      vacaciones: 'fas fa-umbrella-beach',
      enfermedad: 'fas fa-medkit',
      personal: 'fas fa-user-clock',
      maternidad: 'fas fa-baby',
      paternidad: 'fas fa-baby-carriage',
      calamidad: 'fas fa-home',
      sin_goce: 'fas fa-calendar-times',
    };
    return iconos[tipo] || 'fas fa-calendar';
  },

  getColorEstadoPermiso(estado) {
    const colores = {
      pendiente: 'warning',
      aprobado: 'success',
      rechazado: 'danger',
      cancelado: 'secondary',
    };
    return colores[estado] || 'secondary';
  },

  getTipoPeriodoLabel(tipo) {
    const tipos = {
      mensual: 'Mensual',
      quincenal: 'Quincenal',
      semanal: 'Semanal',
    };
    return tipos[tipo] || tipo;
  },

  // ============================================
  // ACCIONES
  // ============================================
  async marcarEntrada(empleadoId) {
    try {
      const response = await fetch('/api/nominas/asistencia/entrada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleado_id: empleadoId }),
      });

      const data = await response.json();
      if (response.ok) {
        Utils.showToast(`Entrada registrada: ${data.hora}`, 'success');
        await this.cargarDatos();
        this.cambiarTab('asistencia');
      } else {
        Utils.showToast(data.error || 'Error al registrar entrada', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      Utils.showToast('Error al registrar entrada', 'error');
    }
  },

  async marcarSalida(empleadoId) {
    try {
      const response = await fetch('/api/nominas/asistencia/salida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleado_id: empleadoId }),
      });

      const data = await response.json();
      if (response.ok) {
        Utils.showToast(`Salida registrada: ${data.hora} (${data.horas_trabajadas}h)`, 'success');
        await this.cargarDatos();
        this.cambiarTab('asistencia');
      } else {
        Utils.showToast(data.error || 'Error al registrar salida', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      Utils.showToast('Error al registrar salida', 'error');
    }
  },

  async responderPermiso(permisoId, estado) {
    try {
      const response = await fetch(`/api/nominas/permisos/${permisoId}/responder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });

      if (response.ok) {
        Utils.showToast(`Solicitud ${estado === 'aprobado' ? 'aprobada' : 'rechazada'}`, 'success');
        await this.cargarDatos();
        this.cambiarTab('permisos');
      } else {
        Utils.showToast('Error al procesar solicitud', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      Utils.showToast('Error al procesar solicitud', 'error');
    }
  },

  // ============================================
  // MODALES
  // ============================================
  mostrarFormularioEmpleado(empleadoId = null) {
    const titulo = empleadoId ? 'Editar Empleado' : 'Nuevo Empleado';

    const modal = `
            <div class="modal-overlay" id="modal-empleado">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-plus"></i> ${titulo}</h3>
                        <button class="modal-close" onclick="Utils.closeModal('modal-empleado')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="form-empleado" onsubmit="Nominas.guardarEmpleado(event)">
                        <div class="modal-body">
                            <div class="form-tabs-mini">
                                <button type="button" class="tab-mini active" data-tab="personal">Personal</button>
                                <button type="button" class="tab-mini" data-tab="laboral">Laboral</button>
                                <button type="button" class="tab-mini" data-tab="salarial">Salarial</button>
                            </div>
                            
                            <div class="tab-content-mini active" id="tab-personal">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Cédula *</label>
                                        <input type="text" name="cedula" required maxlength="13">
                                    </div>
                                    <div class="form-group">
                                        <label>Nombre *</label>
                                        <input type="text" name="nombre" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Apellido *</label>
                                        <input type="text" name="apellido" required>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Fecha Nacimiento</label>
                                        <input type="date" name="fecha_nacimiento">
                                    </div>
                                    <div class="form-group">
                                        <label>Género</label>
                                        <select name="genero">
                                            <option value="">Seleccionar</option>
                                            <option value="M">Masculino</option>
                                            <option value="F">Femenino</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Estado Civil</label>
                                        <select name="estado_civil">
                                            <option value="">Seleccionar</option>
                                            <option value="soltero">Soltero/a</option>
                                            <option value="casado">Casado/a</option>
                                            <option value="divorciado">Divorciado/a</option>
                                            <option value="viudo">Viudo/a</option>
                                            <option value="union_libre">Unión Libre</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Teléfono</label>
                                        <input type="tel" name="telefono">
                                    </div>
                                    <div class="form-group">
                                        <label>Email</label>
                                        <input type="email" name="email">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Dirección</label>
                                    <input type="text" name="direccion">
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Contacto Emergencia</label>
                                        <input type="text" name="contacto_emergencia">
                                    </div>
                                    <div class="form-group">
                                        <label>Teléfono Emergencia</label>
                                        <input type="tel" name="telefono_emergencia">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="tab-content-mini" id="tab-laboral">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Cargo *</label>
                                        <input type="text" name="cargo" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Departamento</label>
                                        <select name="departamento">
                                            <option value="">Seleccionar</option>
                                            <option value="taller">Taller</option>
                                            <option value="ventas">Ventas</option>
                                            <option value="administracion">Administración</option>
                                            <option value="bodega">Bodega</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Tipo de Contrato</label>
                                        <select name="tipo_contrato">
                                            <option value="indefinido">Indefinido</option>
                                            <option value="temporal">Temporal</option>
                                            <option value="prueba">Período de Prueba</option>
                                            <option value="por_obra">Por Obra</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Fecha de Ingreso *</label>
                                        <input type="date" name="fecha_ingreso" required>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Especialidades (para técnicos)</label>
                                    <div class="checkbox-grid">
                                        <label><input type="checkbox" name="especialidades" value="motor"> Motor</label>
                                        <label><input type="checkbox" name="especialidades" value="frenos"> Frenos</label>
                                        <label><input type="checkbox" name="especialidades" value="electricidad"> Electricidad</label>
                                        <label><input type="checkbox" name="especialidades" value="suspension"> Suspensión</label>
                                        <label><input type="checkbox" name="especialidades" value="transmision"> Transmisión</label>
                                        <label><input type="checkbox" name="especialidades" value="aire_acondicionado"> A/C</label>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="tab-content-mini" id="tab-salarial">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Tipo de Salario</label>
                                        <select name="tipo_salario">
                                            <option value="mensual">Mensual</option>
                                            <option value="quincenal">Quincenal</option>
                                            <option value="semanal">Semanal</option>
                                            <option value="por_hora">Por Hora</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Salario Base *</label>
                                        <input type="number" name="salario_base" step="0.01" required>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>
                                            <input type="checkbox" name="tiene_comision" onchange="document.getElementById('porcentaje_comision').disabled = !this.checked"> 
                                            Tiene Comisión
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label>% Comisión</label>
                                        <input type="number" id="porcentaje_comision" name="porcentaje_comision" step="0.01" min="0" max="100" disabled>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Banco</label>
                                        <select name="banco">
                                            <option value="">Seleccionar</option>
                                            <option value="Banco Pichincha">Banco Pichincha</option>
                                            <option value="Banco Guayaquil">Banco Guayaquil</option>
                                            <option value="Produbanco">Produbanco</option>
                                            <option value="Banco del Pacífico">Banco del Pacífico</option>
                                            <option value="Banco Internacional">Banco Internacional</option>
                                            <option value="Banco Bolivariano">Banco Bolivariano</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Cuenta Bancaria</label>
                                        <input type="text" name="cuenta_bancaria">
                                    </div>
                                    <div class="form-group">
                                        <label>Tipo de Cuenta</label>
                                        <select name="tipo_cuenta">
                                            <option value="">Seleccionar</option>
                                            <option value="ahorros">Ahorros</option>
                                            <option value="corriente">Corriente</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" name="afiliado_iess" checked> 
                                        Afiliado al IESS
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="Utils.closeModal('modal-empleado')">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Guardar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', modal);
    this.configurarTabsMini();
  },

  mostrarProcesarNomina() {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    const modal = `
            <div class="modal-overlay" id="modal-procesar-nomina">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-calculator"></i> Procesar Nómina</h3>
                        <button class="modal-close" onclick="Utils.closeModal('modal-procesar-nomina')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="form-procesar-nomina" onsubmit="Nominas.procesarNomina(event)">
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Tipo de Período</label>
                                <select name="tipo_periodo" required>
                                    <option value="mensual">Mensual</option>
                                    <option value="quincenal">Quincenal</option>
                                    <option value="semanal">Semanal</option>
                                </select>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Fecha Inicio *</label>
                                    <input type="date" name="periodo_inicio" value="${primerDiaMes}" required>
                                </div>
                                <div class="form-group">
                                    <label>Fecha Fin *</label>
                                    <input type="date" name="periodo_fin" value="${ultimoDiaMes}" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Fecha de Pago *</label>
                                <input type="date" name="fecha_pago" value="${hoy.toISOString().split('T')[0]}" required>
                            </div>
                            
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle"></i>
                                <div>
                                    <strong>Información</strong>
                                    <p>Se procesará la nómina para ${this.state.empleados.length} empleados activos.</p>
                                    <p>Se calcularán: salarios, horas extra, comisiones, deducciones IESS y provisiones.</p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="Utils.closeModal('modal-procesar-nomina')">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-play"></i> Procesar Nómina
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', modal);
  },

  mostrarFormularioAnticipo() {
    const modal = `
            <div class="modal-overlay" id="modal-anticipo">
                <div class="modal-content small">
                    <div class="modal-header">
                        <h3><i class="fas fa-money-bill-wave"></i> Solicitar Anticipo</h3>
                        <button class="modal-close" onclick="Utils.closeModal('modal-anticipo')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="form-anticipo" onsubmit="Nominas.guardarAnticipo(event)">
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Empleado *</label>
                                <select name="empleado_id" required>
                                    <option value="">Seleccionar empleado</option>
                                    ${this.state.empleados
                                      .map(
                                        (e) => `
                                        <option value="${e.id}">${e.nombre} ${e.apellido}</option>
                                    `
                                      )
                                      .join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Monto *</label>
                                <input type="number" name="monto" step="0.01" min="0" required>
                            </div>
                            <div class="form-group">
                                <label>Motivo</label>
                                <textarea name="motivo" rows="2"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="Utils.closeModal('modal-anticipo')">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Guardar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', modal);
  },

  // ============================================
  // GUARDAR DATOS
  // ============================================
  async guardarEmpleado(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    // Obtener especialidades como array
    const especialidades = Array.from(
      form.querySelectorAll('input[name="especialidades"]:checked')
    ).map((cb) => cb.value);

    const data = {
      cedula: formData.get('cedula'),
      nombre: formData.get('nombre'),
      apellido: formData.get('apellido'),
      fecha_nacimiento: formData.get('fecha_nacimiento'),
      genero: formData.get('genero'),
      estado_civil: formData.get('estado_civil'),
      direccion: formData.get('direccion'),
      telefono: formData.get('telefono'),
      email: formData.get('email'),
      contacto_emergencia: formData.get('contacto_emergencia'),
      telefono_emergencia: formData.get('telefono_emergencia'),
      cargo: formData.get('cargo'),
      departamento: formData.get('departamento'),
      tipo_contrato: formData.get('tipo_contrato'),
      fecha_ingreso: formData.get('fecha_ingreso'),
      tipo_salario: formData.get('tipo_salario'),
      salario_base: parseFloat(formData.get('salario_base')) || 0,
      tiene_comision: form.querySelector('[name="tiene_comision"]').checked ? 1 : 0,
      porcentaje_comision: parseFloat(formData.get('porcentaje_comision')) || 0,
      banco: formData.get('banco'),
      cuenta_bancaria: formData.get('cuenta_bancaria'),
      tipo_cuenta: formData.get('tipo_cuenta'),
      afiliado_iess: form.querySelector('[name="afiliado_iess"]').checked ? 1 : 0,
      especialidades: especialidades,
    };

    try {
      const response = await fetch('/api/nominas/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        Utils.showToast('Empleado guardado exitosamente', 'success');
        Utils.closeModal('modal-empleado');
        await this.cargarDatos();
        this.cambiarTab('empleados');
      } else {
        const error = await response.json();
        Utils.showToast(error.error || 'Error al guardar empleado', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      Utils.showToast('Error al guardar empleado', 'error');
    }
  },

  async procesarNomina(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const data = {
      periodo_inicio: formData.get('periodo_inicio'),
      periodo_fin: formData.get('periodo_fin'),
      tipo_periodo: formData.get('tipo_periodo'),
      fecha_pago: formData.get('fecha_pago'),
    };

    try {
      Utils.showToast('Procesando nómina...', 'info');

      const response = await fetch('/api/nominas/procesar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        Utils.showToast(
          `Nómina procesada: ${result.total_empleados} empleados, $${result.total_neto}`,
          'success'
        );
        Utils.closeModal('modal-procesar-nomina');
        await this.cargarDatos();
        this.cambiarTab('nominas');
      } else {
        Utils.showToast(result.error || 'Error al procesar nómina', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      Utils.showToast('Error al procesar nómina', 'error');
    }
  },

  async guardarAnticipo(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const data = {
      empleado_id: formData.get('empleado_id'),
      monto: parseFloat(formData.get('monto')),
      motivo: formData.get('motivo'),
      fecha_solicitud: new Date().toISOString().split('T')[0],
    };

    try {
      const response = await fetch('/api/nominas/anticipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        Utils.showToast('Anticipo registrado exitosamente', 'success');
        Utils.closeModal('modal-anticipo');
        await this.cargarDatos();
      } else {
        Utils.showToast('Error al registrar anticipo', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      Utils.showToast('Error al registrar anticipo', 'error');
    }
  },

  // ============================================
  // HELPERS
  // ============================================
  configurarTabsMini() {
    const tabs = document.querySelectorAll('.tab-mini');
    const contents = document.querySelectorAll('.tab-content-mini');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        contents.forEach((c) => c.classList.remove('active'));

        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(`tab-${tabId}`).classList.add('active');
      });
    });
  },

  filtrarEmpleados() {
    // Implementar filtrado
  },

  exportarReporte() {
    Utils.showToast('Exportando reporte...', 'info');
    // Implementar exportación
  },

  mostrarConfiguracion() {
    // Mostrar modal de configuración
  },
};
