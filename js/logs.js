// ============================================
// MÓDULO: LOGS DEL SISTEMA - ESTILO EXCEL MINIMALISTA
// Solo lectura - Registro automático por módulos
// ============================================

const Logs = {
  logsData: [],
  filteredLogs: [],
  activeModule: 'todos',
  searchQuery: '',
  sortColumn: 'fecha',
  sortDirection: 'desc',

  // Definición de módulos del sistema
  MODULES: {
    productos: { icon: 'fa-box', label: 'Productos', color: '#22c55e' },
    ventas: { icon: 'fa-shopping-cart', label: 'Ventas', color: '#3b82f6' },
    compras: { icon: 'fa-truck', label: 'Compras', color: '#8b5cf6' },
    clientes: { icon: 'fa-users', label: 'Clientes', color: '#06b6d4' },
    proveedores: { icon: 'fa-industry', label: 'Proveedores', color: '#f59e0b' },
    inventario: { icon: 'fa-warehouse', label: 'Inventario', color: '#10b981' },
    facturas: { icon: 'fa-file-invoice', label: 'Facturas', color: '#ec4899' },
    ordenes_trabajo: { icon: 'fa-tools', label: 'Órdenes', color: '#6366f1' },
    citas: { icon: 'fa-calendar', label: 'Citas', color: '#14b8a6' },
    usuarios: { icon: 'fa-user-shield', label: 'Usuarios', color: '#f43f5e' },
    vehiculos: { icon: 'fa-car', label: 'Vehículos', color: '#84cc16' },
    configuracion: { icon: 'fa-cog', label: 'Config', color: '#64748b' },
    seguridad: { icon: 'fa-shield-alt', label: 'Seguridad', color: '#ef4444' },
    sistema: { icon: 'fa-server', label: 'Sistema', color: '#94a3b8' },
  },

  // ============================================
  // RENDERIZAR VISTA PRINCIPAL
  // ============================================
  render() {
    return `
      <div class="logs-excel-shell">
        <div class="logs-excel-header">
          <div class="logs-excel-title">
            <i class="fas fa-history"></i>
            <h2>Logs del Sistema</h2>
            <span class="logs-readonly-badge">
              <i class="fas fa-lock"></i> Solo lectura
            </span>
          </div>
          <div class="logs-excel-controls">
            <div class="logs-search-wrapper">
              <i class="fas fa-search"></i>
              <input type="text" 
                     id="logsSearchInput" 
                     class="logs-search-input" 
                     placeholder="Buscar en logs...">
            </div>
            <button class="logs-ctrl-btn" id="logsRefreshBtn" title="Actualizar">
              <i class="fas fa-sync-alt"></i>
            </button>
            <button class="logs-ctrl-btn" id="logsExportBtn" title="Exportar CSV">
              <i class="fas fa-download"></i>
            </button>
          </div>
        </div>
        
        <div class="logs-module-bar" id="logsModuleBar">
          <!-- Los chips de módulos se generan dinámicamente -->
        </div>
        
        <div class="logs-table-container">
          <table class="logs-excel-table">
            <thead>
              <tr>
                <th class="col-fecha sortable" data-column="fecha">
                  Fecha <i class="fas fa-sort sort-icon"></i>
                </th>
                <th class="col-modulo">Módulo</th>
                <th class="col-accion sortable" data-column="accion">
                  Acción <i class="fas fa-sort sort-icon"></i>
                </th>
                <th class="col-tabla sortable" data-column="tabla_afectada">
                  Tabla <i class="fas fa-sort sort-icon"></i>
                </th>
                <th class="col-usuario sortable" data-column="usuario_nombre">
                  Usuario <i class="fas fa-sort sort-icon"></i>
                </th>
                <th class="col-registro">ID Registro</th>
                <th class="col-detalles">Detalles</th>
                <th class="col-acciones">Ver</th>
              </tr>
            </thead>
            <tbody id="logsTableBody">
              <tr>
                <td colspan="8">
                  <div class="logs-loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando logs...</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="logs-excel-footer">
          <div class="logs-stats" id="logsStats">
            <span class="logs-stat-item">
              <i class="fas fa-database"></i>
              Total: <strong id="logsTotalCount">0</strong>
            </span>
            <span class="logs-stat-item">
              <i class="fas fa-filter"></i>
              Mostrando: <strong id="logsFilteredCount">0</strong>
            </span>
          </div>
          <span class="logs-excel-subtitle">
            Los logs son inmutables y no pueden ser editados
          </span>
        </div>
      </div>
    `;
  },

  // ============================================
  // INICIALIZAR MÓDULO
  // ============================================
  async init() {
    console.log('� Inicializando módulo de Logs (estilo Excel)...');

    if (window.Auth && typeof window.Auth.ready === 'function') {
      await window.Auth.ready();
    }

    this.bindEvents();
    await this.cargarLogs();
  },

  bindEvents() {
    // Búsqueda
    document.getElementById('logsSearchInput')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.aplicarFiltros();
    });

    // Refrescar
    document.getElementById('logsRefreshBtn')?.addEventListener('click', () => {
      this.cargarLogs(true);
    });

    // Exportar
    document.getElementById('logsExportBtn')?.addEventListener('click', () => {
      this.exportarCSV();
    });

    // Ordenamiento en columnas
    document.querySelectorAll('.logs-excel-table th.sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const column = th.dataset.column;
        if (this.sortColumn === column) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortColumn = column;
          this.sortDirection = 'desc';
        }
        this.actualizarIndicadoresSort();
        this.aplicarFiltros();
      });
    });

    // Delegación para módulos y botón ver
    document.getElementById('logsModuleBar')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.logs-module-chip');
      if (chip) {
        this.activeModule = chip.dataset.module;
        this.actualizarChipsActivos();
        this.aplicarFiltros();
      }
    });

    document.getElementById('logsTableBody')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.log-view-btn');
      if (btn) {
        const logId = btn.dataset.logId;
        this.mostrarDetalles(logId);
      }
    });
  },

  // ============================================
  // CARGAR LOGS
  // ============================================
  async cargarLogs(showSpinner = false) {
    const tbody = document.getElementById('logsTableBody');
    if (!tbody) return;

    if (showSpinner) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="logs-loading-state">
              <i class="fas fa-spinner fa-spin"></i>
              <p>Actualizando logs...</p>
            </div>
          </td>
        </tr>
      `;
    }

    try {
      this.logsData = await DatabaseAPI.request('/logs');

      // Asignar módulo a cada log basándose en tabla_afectada
      this.logsData = this.logsData.map((log) => ({
        ...log,
        modulo: this.detectarModulo(log.tabla_afectada, log.accion),
      }));

      this.generarChipsModulos();
      this.aplicarFiltros();
    } catch (error) {
      console.error('Error al cargar logs:', error);
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="logs-empty-state">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Error al cargar los logs</p>
              <small>${error.message || 'No se pudo conectar al servidor'}</small>
            </div>
          </td>
        </tr>
      `;
    }
  },

  // ============================================
  // DETECTAR MÓDULO SEGÚN TABLA
  // ============================================
  detectarModulo(tabla, accion) {
    if (!tabla) return 'sistema';

    const tablaLower = tabla.toLowerCase();
    const accionLower = (accion || '').toLowerCase();

    // Mapeo de tablas a módulos
    const mapeoTablas = {
      productos: 'productos',
      producto: 'productos',
      inventario: 'inventario',
      stock: 'inventario',
      ventas: 'ventas',
      venta: 'ventas',
      compras: 'compras',
      compra: 'compras',
      clientes: 'clientes',
      cliente: 'clientes',
      proveedores: 'proveedores',
      proveedor: 'proveedores',
      facturas: 'facturas',
      factura: 'facturas',
      ordenes_trabajo: 'ordenes_trabajo',
      orden_trabajo: 'ordenes_trabajo',
      ordenes: 'ordenes_trabajo',
      citas: 'citas',
      cita: 'citas',
      usuarios: 'usuarios',
      usuario: 'usuarios',
      vehiculos: 'vehiculos',
      vehiculo: 'vehiculos',
      configuracion: 'configuracion',
      config: 'configuracion',
      seguridad: 'seguridad',
      security: 'seguridad',
    };

    // Buscar coincidencia directa
    for (const [key, modulo] of Object.entries(mapeoTablas)) {
      if (tablaLower.includes(key)) {
        return modulo;
      }
    }

    // Detectar por acción si incluye security
    if (accionLower.includes('security')) {
      return 'seguridad';
    }

    return 'sistema';
  },

  // ============================================
  // GENERAR CHIPS DE MÓDULOS
  // ============================================
  generarChipsModulos() {
    const bar = document.getElementById('logsModuleBar');
    if (!bar) return;

    // Contar logs por módulo
    const conteos = { todos: this.logsData.length };
    this.logsData.forEach((log) => {
      const mod = log.modulo || 'sistema';
      conteos[mod] = (conteos[mod] || 0) + 1;
    });

    // Generar chip "Todos"
    let html = `
      <button class="logs-module-chip ${this.activeModule === 'todos' ? 'active' : ''}" 
              data-module="todos">
        <i class="fas fa-layer-group"></i>
        Todos
        <span class="chip-count">${conteos.todos}</span>
      </button>
    `;

    // Generar chips por módulo (solo los que tienen logs)
    Object.entries(this.MODULES).forEach(([key, config]) => {
      if (conteos[key] && conteos[key] > 0) {
        html += `
          <button class="logs-module-chip ${this.activeModule === key ? 'active' : ''}" 
                  data-module="${key}">
            <i class="fas ${config.icon}"></i>
            ${config.label}
            <span class="chip-count">${conteos[key]}</span>
          </button>
        `;
      }
    });

    bar.innerHTML = html;
  },

  actualizarChipsActivos() {
    document.querySelectorAll('.logs-module-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.module === this.activeModule);
    });
  },

  actualizarIndicadoresSort() {
    document.querySelectorAll('.logs-excel-table th.sortable').forEach((th) => {
      const icon = th.querySelector('.sort-icon');
      if (th.dataset.column === this.sortColumn) {
        th.classList.add('sorted');
        icon.className = `fas fa-sort-${this.sortDirection === 'asc' ? 'up' : 'down'} sort-icon`;
      } else {
        th.classList.remove('sorted');
        icon.className = 'fas fa-sort sort-icon';
      }
    });
  },

  // ============================================
  // APLICAR FILTROS Y ORDENAMIENTO
  // ============================================
  aplicarFiltros() {
    let logs = [...this.logsData];

    // Filtrar por módulo
    if (this.activeModule !== 'todos') {
      logs = logs.filter((log) => log.modulo === this.activeModule);
    }

    // Filtrar por búsqueda
    if (this.searchQuery) {
      logs = logs.filter((log) => {
        const searchableText = [
          log.accion,
          log.tabla_afectada,
          log.usuario_nombre,
          log.registro_id,
          log.detalles,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(this.searchQuery);
      });
    }

    // Ordenar
    logs.sort((a, b) => {
      let valA = a[this.sortColumn] || '';
      let valB = b[this.sortColumn] || '';

      if (this.sortColumn === 'fecha') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredLogs = logs;
    this.renderizarTabla();
    this.actualizarEstadisticas();
  },

  // ============================================
  // RENDERIZAR TABLA
  // ============================================
  renderizarTabla() {
    const tbody = document.getElementById('logsTableBody');
    if (!tbody) return;

    if (!this.filteredLogs.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="logs-empty-state">
              <i class="fas fa-inbox"></i>
              <p>No se encontraron registros</p>
              <small>Ajusta los filtros o espera nuevos eventos</small>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filteredLogs.map((log) => this.renderizarFila(log)).join('');
  },

  renderizarFila(log) {
    const accionInfo = this.obtenerAccionInfo(log.accion);
    const moduloConfig = this.MODULES[log.modulo] || this.MODULES.sistema;
    const fechaFormateada = this.formatearFecha(log.fecha);
    const detallesPreview = this.obtenerPreviewDetalles(log.detalles);

    return `
      <tr>
        <td class="col-fecha">${fechaFormateada}</td>
        <td class="col-modulo">
          <span class="log-module-badge" style="border-color: ${moduloConfig.color}40; color: ${moduloConfig.color}">
            <i class="fas ${moduloConfig.icon}"></i>
            ${moduloConfig.label}
          </span>
        </td>
        <td class="col-accion">
          <span class="log-action-badge ${accionInfo.clase}">${accionInfo.texto}</span>
        </td>
        <td class="col-tabla">${log.tabla_afectada || '-'}</td>
        <td class="col-usuario">${log.usuario_nombre || 'Sistema'}</td>
        <td class="col-registro">${log.registro_id || '-'}</td>
        <td class="col-detalles">
          <span class="log-details-cell" title="${this.escaparHtml(detallesPreview)}">
            ${this.escaparHtml(detallesPreview)}
          </span>
        </td>
        <td class="col-acciones">
          <button class="log-view-btn" data-log-id="${log.id}" title="Ver detalles">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>
    `;
  },

  // ============================================
  // UTILIDADES
  // ============================================
  formatearFecha(fecha) {
    if (!fecha) return '-';
    const d = new Date(fecha);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${hora}:${min}`;
  },

  // ============================================
  // MOSTRAR DETALLES EN MODAL
  // ============================================
  mostrarDetalles(logId) {
    const log = this.logsData.find((l) => String(l.id) === String(logId));
    if (!log) return;

    // Cerrar modal existente
    this.cerrarModal();

    const moduloConfig = this.MODULES[log.modulo] || this.MODULES.sistema;
    const accionInfo = this.obtenerAccionInfo(log.accion);

    let detallesFormateados = '-';
    try {
      const parsed = JSON.parse(log.detalles || '{}');
      detallesFormateados = JSON.stringify(parsed, null, 2);
    } catch {
      detallesFormateados = log.detalles || '-';
    }

    const modalHTML = `
      <div class="logs-detail-modal is-visible" id="logsDetailModal">
        <div class="logs-detail-content">
          <div class="logs-detail-header">
            <h3>
              <i class="fas ${moduloConfig.icon}" style="color: ${moduloConfig.color}"></i>
              Detalle del Log #${log.id}
            </h3>
            <button class="logs-detail-close" id="logsDetailClose">&times;</button>
          </div>
          <div class="logs-detail-body">
            <div class="logs-detail-grid">
              <div class="logs-detail-item">
                <label>Fecha</label>
                <span>${this.formatearFecha(log.fecha)}</span>
              </div>
              <div class="logs-detail-item">
                <label>Módulo</label>
                <span style="color: ${moduloConfig.color}">${moduloConfig.label}</span>
              </div>
              <div class="logs-detail-item">
                <label>Acción</label>
                <span class="log-action-badge ${accionInfo.clase}">${accionInfo.texto}</span>
              </div>
              <div class="logs-detail-item">
                <label>Tabla</label>
                <span>${log.tabla_afectada || '-'}</span>
              </div>
              <div class="logs-detail-item">
                <label>Usuario</label>
                <span>${log.usuario_nombre || 'Sistema'}</span>
              </div>
              <div class="logs-detail-item">
                <label>ID Registro</label>
                <span>${log.registro_id || '-'}</span>
              </div>
            </div>
            
            <!-- Sección de Análisis IA -->
            <div class="logs-ia-section" id="logsIaSection">
              <div class="logs-ia-header">
                <button class="logs-ia-btn" id="logsAnalyzeBtn" data-log-id="${log.id}">
                  <i class="fas fa-robot"></i> Analizar con IA
                </button>
              </div>
              <div class="logs-ia-result" id="logsIaResult" style="display: none;"></div>
            </div>
            
            <label style="font-size: 0.68rem; text-transform: uppercase; color: var(--logs-text-muted); display: block; margin-bottom: 0.5rem; margin-top: 1rem;">
              Datos Completos (solo lectura)
            </label>
            <div class="logs-detail-json">
              <pre>${this.escaparHtml(detallesFormateados)}</pre>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Eventos del modal
    document.getElementById('logsDetailClose')?.addEventListener('click', () => this.cerrarModal());
    document.getElementById('logsDetailModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'logsDetailModal') {
        this.cerrarModal();
      }
    });

    // Evento para análisis IA
    document.getElementById('logsAnalyzeBtn')?.addEventListener('click', () => {
      this.analizarLogConIA(log);
    });

    // Cerrar con ESC
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        this.cerrarModal();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  },

  // ============================================
  // ANÁLISIS CON IA
  // ============================================
  async analizarLogConIA(log) {
    const resultDiv = document.getElementById('logsIaResult');
    const btn = document.getElementById('logsAnalyzeBtn');

    if (!resultDiv || !btn) return;

    // Mostrar loading
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando...';
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
      <div class="logs-ia-loading">
        <i class="fas fa-brain fa-pulse"></i>
        <span>La IA está analizando este evento...</span>
      </div>
    `;

    try {
      // Intentar usar la IA del sistema si está disponible
      const analisis = await this.obtenerAnalisisIA(log);

      resultDiv.innerHTML = `
        <div class="logs-ia-analysis">
          <div class="logs-ia-title">
            <i class="fas fa-lightbulb"></i> Análisis del Evento
          </div>
          <div class="logs-ia-content">
            <p class="logs-ia-summary">${analisis.resumen}</p>
            <div class="logs-ia-details">
              <div class="logs-ia-detail-item">
                <span class="logs-ia-label">Tipo de Evento:</span>
                <span class="logs-ia-value">${analisis.tipoEvento}</span>
              </div>
              <div class="logs-ia-detail-item">
                <span class="logs-ia-label">Impacto:</span>
                <span class="logs-ia-value logs-ia-impact-${analisis.impactoClase}">${analisis.impacto}</span>
              </div>
              <div class="logs-ia-detail-item">
                <span class="logs-ia-label">Datos Clave:</span>
                <span class="logs-ia-value">${analisis.datosClave}</span>
              </div>
            </div>
            ${
              analisis.recomendacion
                ? `
            <div class="logs-ia-recommendation">
              <i class="fas fa-info-circle"></i> ${analisis.recomendacion}
            </div>
            `
                : ''
            }
          </div>
        </div>
      `;

      btn.innerHTML = '<i class="fas fa-check"></i> Análisis completado';
      btn.style.background = 'rgba(34, 197, 94, 0.2)';
      btn.style.borderColor = '#22c55e';
      btn.style.color = '#22c55e';
    } catch (error) {
      console.error('Error en análisis IA:', error);

      // Fallback a análisis local
      const analisisLocal = this.generarAnalisisLocal(log);

      resultDiv.innerHTML = `
        <div class="logs-ia-analysis">
          <div class="logs-ia-title">
            <i class="fas fa-lightbulb"></i> Análisis del Evento
          </div>
          <div class="logs-ia-content">
            <p class="logs-ia-summary">${analisisLocal.resumen}</p>
            <div class="logs-ia-details">
              <div class="logs-ia-detail-item">
                <span class="logs-ia-label">Tipo de Evento:</span>
                <span class="logs-ia-value">${analisisLocal.tipoEvento}</span>
              </div>
              <div class="logs-ia-detail-item">
                <span class="logs-ia-label">Impacto:</span>
                <span class="logs-ia-value logs-ia-impact-${analisisLocal.impactoClase}">${analisisLocal.impacto}</span>
              </div>
              <div class="logs-ia-detail-item">
                <span class="logs-ia-label">Datos Clave:</span>
                <span class="logs-ia-value">${analisisLocal.datosClave}</span>
              </div>
            </div>
            ${
              analisisLocal.recomendacion
                ? `
            <div class="logs-ia-recommendation">
              <i class="fas fa-info-circle"></i> ${analisisLocal.recomendacion}
            </div>
            `
                : ''
            }
          </div>
        </div>
      `;

      btn.innerHTML = '<i class="fas fa-check"></i> Análisis completado';
      btn.disabled = false;
    }
  },

  async obtenerAnalisisIA(log) {
    // Intentar usar el servicio de IA si está disponible
    if (window.IAService && typeof window.IAService.analyze === 'function') {
      const prompt = this.construirPromptAnalisis(log);
      const respuesta = await window.IAService.analyze(prompt);
      return this.parsearRespuestaIA(respuesta, log);
    }

    // Si hay un endpoint de IA disponible
    if (window.DatabaseAPI) {
      try {
        const response = await DatabaseAPI.request('/ia/analyze-log', {
          method: 'POST',
          body: JSON.stringify({ log }),
        });
        if (response && response.analisis) {
          return response.analisis;
        }
      } catch (e) {
        // Continuar con análisis local
      }
    }

    // Fallback a análisis local
    return this.generarAnalisisLocal(log);
  },

  construirPromptAnalisis(log) {
    return `Analiza este log del sistema y explica qué sucedió de forma clara:
    - Fecha: ${log.fecha}
    - Acción: ${log.accion}
    - Módulo: ${log.modulo}
    - Tabla: ${log.tabla_afectada}
    - Usuario: ${log.usuario_nombre}
    - Detalles: ${log.detalles}`;
  },

  parsearRespuestaIA(respuesta, log) {
    // Parsear respuesta de IA si es texto
    return {
      resumen: respuesta || this.generarAnalisisLocal(log).resumen,
      tipoEvento: this.obtenerTipoEvento(log),
      impacto: this.obtenerImpacto(log),
      impactoClase: this.obtenerImpactoClase(log),
      datosClave: this.extraerDatosClave(log),
      recomendacion: this.obtenerRecomendacion(log),
    };
  },

  generarAnalisisLocal(log) {
    const moduloConfig = this.MODULES[log.modulo] || this.MODULES.sistema;
    const accionInfo = this.obtenerAccionInfo(log.accion);

    // Construir resumen natural
    let resumen = this.construirResumenNatural(log, moduloConfig, accionInfo);

    return {
      resumen,
      tipoEvento: this.obtenerTipoEvento(log),
      impacto: this.obtenerImpacto(log),
      impactoClase: this.obtenerImpactoClase(log),
      datosClave: this.extraerDatosClave(log),
      recomendacion: this.obtenerRecomendacion(log),
    };
  },

  construirResumenNatural(log, moduloConfig, accionInfo) {
    const usuario = log.usuario_nombre || 'El sistema';
    const fecha = this.formatearFecha(log.fecha);
    let payload = {};

    try {
      payload = JSON.parse(log.detalles || '{}');
      if (payload.payload) payload = payload.payload;
    } catch {}

    // Generar descripción según el tipo de acción y módulo
    let descripcion = '';

    switch (log.modulo) {
      case 'productos':
        if (accionInfo.texto === 'CREAR') {
          descripcion = `${usuario} agregó un nuevo producto${payload.nombre ? ` llamado "${payload.nombre}"` : ''}${payload.precio ? ` con precio $${payload.precio}` : ''}.`;
        } else if (accionInfo.texto === 'EDITAR') {
          descripcion = `${usuario} modificó la información de un producto${payload.nombre ? ` (${payload.nombre})` : ''}.`;
        } else if (accionInfo.texto === 'ELIMINAR') {
          descripcion = `${usuario} eliminó un producto del inventario.`;
        } else {
          descripcion = `${usuario} realizó una operación en el módulo de productos.`;
        }
        break;

      case 'ventas':
        if (accionInfo.texto === 'CREAR') {
          descripcion = `${usuario} registró una nueva venta${payload.total ? ` por $${payload.total}` : ''}${payload.cliente_nombre ? ` al cliente ${payload.cliente_nombre}` : ''}.`;
        } else {
          descripcion = `${usuario} realizó una operación de venta.`;
        }
        break;

      case 'compras':
        if (accionInfo.texto === 'CREAR') {
          descripcion = `${usuario} registró una nueva compra${payload.proveedorNombre ? ` del proveedor ${payload.proveedorNombre}` : ''}${payload.total ? ` por $${payload.total}` : ''}.`;
        } else {
          descripcion = `${usuario} realizó una operación en compras.`;
        }
        break;

      case 'clientes':
        if (accionInfo.texto === 'CREAR') {
          descripcion = `${usuario} registró un nuevo cliente${payload.nombre ? `: ${payload.nombre}` : ''}${payload.telefono ? ` con teléfono ${payload.telefono}` : ''}.`;
        } else if (accionInfo.texto === 'EDITAR') {
          descripcion = `${usuario} actualizó los datos de un cliente.`;
        } else {
          descripcion = `${usuario} realizó una operación con clientes.`;
        }
        break;

      case 'ordenes_trabajo':
        if (accionInfo.texto === 'CREAR') {
          descripcion = `${usuario} creó una nueva orden de trabajo${payload.clienteId ? ` para un cliente` : ''}${payload.descripcion ? `: "${payload.descripcion.substring(0, 50)}..."` : ''}.`;
        } else {
          descripcion = `${usuario} realizó una operación en órdenes de trabajo.`;
        }
        break;

      case 'seguridad':
        descripcion = `Evento de seguridad: ${log.accion}. Este registro documenta actividad relacionada con la seguridad del sistema.`;
        break;

      default:
        descripcion = `${usuario} ejecutó la acción "${accionInfo.texto}" en el módulo de ${moduloConfig.label} el ${fecha}.`;
    }

    return descripcion;
  },

  obtenerTipoEvento(log) {
    const accionInfo = this.obtenerAccionInfo(log.accion);
    const tipos = {
      CREAR: 'Creación de registro',
      EDITAR: 'Modificación de datos',
      ELIMINAR: 'Eliminación de registro',
      SEGURIDAD: 'Evento de seguridad',
      LOGIN: 'Acceso al sistema',
    };
    return tipos[accionInfo.texto] || 'Operación del sistema';
  },

  obtenerImpacto(log) {
    const accion = (log.accion || '').toLowerCase();
    if (accion.includes('delete')) return 'Alto - Datos eliminados';
    if (accion.includes('security')) return 'Medio - Evento monitoreado';
    if (accion.includes('create')) return 'Bajo - Nuevo registro';
    if (accion.includes('update')) return 'Bajo - Actualización';
    return 'Informativo';
  },

  obtenerImpactoClase(log) {
    const accion = (log.accion || '').toLowerCase();
    if (accion.includes('delete')) return 'high';
    if (accion.includes('security')) return 'medium';
    return 'low';
  },

  extraerDatosClave(log) {
    let payload = {};
    try {
      payload = JSON.parse(log.detalles || '{}');
      if (payload.payload) payload = payload.payload;
    } catch {
      return 'Sin datos adicionales';
    }

    const claves = [];
    const camposImportantes = [
      'nombre',
      'cliente_nombre',
      'proveedorNombre',
      'total',
      'estado',
      'telefono',
      'email',
      'codigo',
    ];

    for (const campo of camposImportantes) {
      if (payload[campo]) {
        const label = campo
          .replace(/_/g, ' ')
          .replace(/([A-Z])/g, ' $1')
          .trim();
        claves.push(`${label}: ${payload[campo]}`);
      }
    }

    return claves.length > 0 ? claves.slice(0, 3).join(' | ') : 'Ver detalles completos abajo';
  },

  obtenerRecomendacion(log) {
    const accion = (log.accion || '').toLowerCase();
    const modulo = log.modulo;

    if (accion.includes('delete')) {
      return 'Este registro fue eliminado. Si fue un error, contacte al administrador para revisar los respaldos.';
    }
    if (accion.includes('security')) {
      return 'Los eventos de seguridad son monitoreados automáticamente. Revise si la actividad es esperada.';
    }
    if (modulo === 'productos' && accion.includes('create')) {
      return 'Verifique que el producto tenga stock inicial y precios correctos.';
    }
    if (modulo === 'ventas') {
      return 'Las ventas afectan el inventario y los reportes financieros.';
    }

    return '';
  },

  cerrarModal() {
    const modal = document.getElementById('logsDetailModal');
    if (modal) modal.remove();
  },

  // ============================================
  // EXPORTAR A CSV
  // ============================================
  exportarCSV() {
    const logs = this.filteredLogs;
    if (!logs.length) {
      alert('No hay logs para exportar');
      return;
    }

    const headers = [
      'ID',
      'Fecha',
      'Módulo',
      'Acción',
      'Tabla',
      'Usuario',
      'ID Registro',
      'Detalles',
    ];
    const rows = logs.map((log) => [
      log.id,
      log.fecha,
      log.modulo,
      log.accion,
      log.tabla_afectada || '',
      log.usuario_nombre || 'Sistema',
      log.registro_id || '',
      (log.detalles || '').replace(/"/g, '""'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-sistema-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  obtenerAccionInfo(accion) {
    const accionLower = (accion || '').toLowerCase();
    if (accionLower.includes('create') || accionLower.includes('post')) {
      return { clase: 'create', texto: 'CREAR' };
    }
    if (
      accionLower.includes('update') ||
      accionLower.includes('put') ||
      accionLower.includes('patch')
    ) {
      return { clase: 'update', texto: 'EDITAR' };
    }
    if (accionLower.includes('delete')) {
      return { clase: 'delete', texto: 'ELIMINAR' };
    }
    if (accionLower.includes('security')) {
      return { clase: 'security', texto: 'SEGURIDAD' };
    }
    if (accionLower.includes('login')) {
      return { clase: 'login', texto: 'LOGIN' };
    }
    return { clase: 'other', texto: accion?.substring(0, 12) || 'OTRO' };
  },

  obtenerPreviewDetalles(detalles) {
    if (!detalles) return '-';

    try {
      const parsed = JSON.parse(detalles);
      if (typeof parsed === 'object' && parsed !== null) {
        // Extraer información relevante
        const keys = Object.keys(parsed).slice(0, 3);
        const preview = keys
          .map((k) => {
            let val = parsed[k];
            if (typeof val === 'object') val = '{...}';
            if (typeof val === 'string' && val.length > 20) val = val.substring(0, 20) + '...';
            return `${k}: ${val}`;
          })
          .join(', ');
        return preview || '-';
      }
      return String(parsed).substring(0, 60);
    } catch {
      return String(detalles).substring(0, 60);
    }
  },

  escaparHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  actualizarEstadisticas() {
    const totalEl = document.getElementById('logsTotalCount');
    const filteredEl = document.getElementById('logsFilteredCount');

    if (totalEl) totalEl.textContent = this.logsData.length;
    if (filteredEl) filteredEl.textContent = this.filteredLogs.length;
  },
};

// Exportar el módulo
window.Logs = Logs;
