// ============================================
// MÓDULO: HISTORIAL DE NOTIFICACIONES - ESTILO EXCEL
// Registro completo de todas las notificaciones del sistema
// ============================================

const HistorialNotificaciones = {
  notificacionesData: [],
  filteredNotificaciones: [],
  activeCategory: 'todos',
  searchQuery: '',
  sortColumn: 'fecha',
  sortDirection: 'desc',

  // Categorías de notificaciones
  CATEGORIES: {
    todos: { icon: 'fa-layer-group', label: 'Todos', color: '#6366f1' },
    error: { icon: 'fa-exclamation-circle', label: 'Errores', color: '#ef4444' },
    warning: { icon: 'fa-exclamation-triangle', label: 'Advertencias', color: '#f59e0b' },
    success: { icon: 'fa-check-circle', label: 'Éxito', color: '#22c55e' },
    info: { icon: 'fa-info-circle', label: 'Info', color: '#3b82f6' },
    telegram: { icon: 'fa-telegram', label: 'Telegram', color: '#0088cc' },
    sistema: { icon: 'fa-server', label: 'Sistema', color: '#64748b' },
  },

  // ============================================
  // RENDERIZAR VISTA PRINCIPAL
  // ============================================
  render() {
    return `
      <div class="notif-history-shell">
        <div class="notif-history-header">
          <div class="notif-history-title">
            <i class="fas fa-bell-slash"></i>
            <h2>Historial de Notificaciones</h2>
            <span class="notif-history-badge" id="notifUnreadBadge" style="display: none;">
              <i class="fas fa-circle"></i> <span id="notifUnreadCount">0</span> sin leer
            </span>
          </div>
          <div class="notif-history-controls">
            <div class="notif-search-wrapper">
              <i class="fas fa-search"></i>
              <input type="text" 
                     id="notifSearchInput" 
                     class="notif-search-input" 
                     placeholder="Buscar notificaciones...">
            </div>
            <button class="notif-ctrl-btn" id="notifMarkAllReadBtn" title="Marcar todas como leídas">
              <i class="fas fa-check-double"></i>
            </button>
            <button class="notif-ctrl-btn" id="notifRefreshBtn" title="Actualizar">
              <i class="fas fa-sync-alt"></i>
            </button>
            <button class="notif-ctrl-btn" id="notifExportBtn" title="Exportar CSV">
              <i class="fas fa-download"></i>
            </button>
          </div>
        </div>
        
        <!-- Pestañas de categorías -->
        <div class="notif-category-bar" id="notifCategoryBar">
          <!-- Los chips de categorías se generan dinámicamente -->
        </div>
        
        <!-- Sección de notificaciones no leídas -->
        <div class="notif-unread-section" id="notifUnreadSection" style="display: none;">
          <div class="notif-unread-header">
            <h3><i class="fas fa-bell"></i> Notificaciones sin leer</h3>
            <button class="btn btn-sm btn-ghost" id="notifCollapseUnread">
              <i class="fas fa-chevron-up"></i>
            </button>
          </div>
          <div class="notif-unread-list" id="notifUnreadList"></div>
        </div>
        
        <!-- Tabla principal -->
        <div class="notif-table-container">
          <table class="notif-history-table">
            <thead>
              <tr>
                <th class="col-estado">Estado</th>
                <th class="col-fecha sortable" data-column="fecha">
                  Fecha/Hora <i class="fas fa-sort sort-icon"></i>
                </th>
                <th class="col-tipo">Tipo</th>
                <th class="col-mensaje sortable" data-column="mensaje">
                  Mensaje <i class="fas fa-sort sort-icon"></i>
                </th>
                <th class="col-usuario sortable" data-column="usuario">
                  Usuario <i class="fas fa-sort sort-icon"></i>
                </th>
                <th class="col-tienda sortable" data-column="tienda">
                  Tienda <i class="fas fa-sort sort-icon"></i>
                </th>
                <th class="col-canal">Canal</th>
                <th class="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody id="notifTableBody">
              <tr>
                <td colspan="8">
                  <div class="notif-loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando historial...</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="notif-history-footer">
          <div class="notif-stats" id="notifStats">
            <span class="notif-stat-item">
              <i class="fas fa-database"></i>
              Total: <strong id="notifTotalCount">0</strong>
            </span>
            <span class="notif-stat-item">
              <i class="fas fa-filter"></i>
              Mostrando: <strong id="notifFilteredCount">0</strong>
            </span>
            <span class="notif-stat-item">
              <i class="fas fa-bell"></i>
              Sin leer: <strong id="notifPendingCount">0</strong>
            </span>
          </div>
          <span class="notif-history-subtitle">
            Historial completo de notificaciones del sistema
          </span>
        </div>
      </div>
    `;
  },

  // ============================================
  // INICIALIZAR MÓDULO
  // ============================================
  async init() {
    console.log('📜 Inicializando módulo de Historial de Notificaciones...');

    if (window.Auth && typeof window.Auth.ready === 'function') {
      await window.Auth.ready();
    }

    this.bindEvents();
    await this.cargarHistorial();
  },

  bindEvents() {
    // Búsqueda
    document.getElementById('notifSearchInput')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.aplicarFiltros();
    });

    // Refrescar
    document.getElementById('notifRefreshBtn')?.addEventListener('click', () => {
      this.cargarHistorial(true);
    });

    // Marcar todas como leídas
    document.getElementById('notifMarkAllReadBtn')?.addEventListener('click', () => {
      this.marcarTodasLeidas();
    });

    // Exportar
    document.getElementById('notifExportBtn')?.addEventListener('click', () => {
      this.exportarCSV();
    });

    // Colapsar sección de no leídas
    document.getElementById('notifCollapseUnread')?.addEventListener('click', () => {
      this.toggleSeccionNoLeidas();
    });

    // Ordenamiento en columnas
    document.querySelectorAll('.notif-history-table th.sortable').forEach((th) => {
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

    // Delegación para categorías
    document.getElementById('notifCategoryBar')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.notif-category-chip');
      if (chip) {
        this.activeCategory = chip.dataset.category;
        this.actualizarChipsActivos();
        this.aplicarFiltros();
      }
    });

    // Delegación para acciones en tabla
    document.getElementById('notifTableBody')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (btn) {
        const action = btn.dataset.action;
        const notifId = btn.dataset.notifId;
        
        if (action === 'view') {
          this.mostrarDetalles(notifId);
        } else if (action === 'mark-read') {
          this.marcarLeida(notifId);
        }
      }
    });

    // Delegación para lista de no leídas
    document.getElementById('notifUnreadList')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (btn) {
        const action = btn.dataset.action;
        const notifId = btn.dataset.notifId;
        
        if (action === 'mark-read') {
          this.marcarLeida(notifId);
        }
      }
    });
  },

  // ============================================
  // CARGAR HISTORIAL
  // ============================================
  async cargarHistorial(showSpinner = false) {
    const tbody = document.getElementById('notifTableBody');
    if (!tbody) return;

    if (showSpinner) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="notif-loading-state">
              <i class="fas fa-spinner fa-spin"></i>
              <p>Actualizando historial...</p>
            </div>
          </td>
        </tr>
      `;
    }

    try {
      // Cargar desde BD
      let notificacionesBD = [];
      try {
        notificacionesBD = await DatabaseAPI.request('/notificaciones-enviadas');
      } catch (e) {
        console.warn('No se pudo cargar desde BD:', e);
      }

      // Cargar notificaciones locales no leídas
      const notificacionesLocales = window.Notificaciones?.historialNoLeidas || [];

      // Combinar y normalizar
      this.notificacionesData = this.combinarNotificaciones(notificacionesBD, notificacionesLocales);

      // Obtener info del usuario actual
      const currentUser = window.Auth?.getCurrentUser?.() || {};
      this.currentUserId = currentUser.userId;
      this.currentNegocioId = currentUser.negocioId;
      this.currentNegocioNombre = currentUser.negocioNombre || 'Tienda';
      this.currentUserNombre = currentUser.nombre || currentUser.username || 'Usuario';

      this.generarChipsCategorias();
      this.renderizarNoLeidas();
      this.aplicarFiltros();
    } catch (error) {
      console.error('Error al cargar historial:', error);
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="notif-empty-state">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Error al cargar el historial</p>
              <small>${error.message || 'No se pudo conectar al servidor'}</small>
            </div>
          </td>
        </tr>
      `;
    }
  },

  // ============================================
  // COMBINAR NOTIFICACIONES DE BD Y LOCALES
  // ============================================
  combinarNotificaciones(bdNotifs, localNotifs) {
    const todas = [];
    const idsVistos = new Set();

    // Primero las locales (más recientes y con estado de lectura)
    localNotifs.forEach(n => {
      const id = n.id || `local_${Date.now()}_${Math.random()}`;
      if (!idsVistos.has(id)) {
        idsVistos.add(id);
        todas.push({
          id: id,
          mensaje: n.mensaje,
          tipo: n.tipo || 'info',
          fecha: n.fecha || new Date().toISOString(),
          leida: n.leida || false,
          importancia: n.importancia || 'normal',
          usuario: n.usuario || this.currentUserNombre || 'Sistema',
          tienda: n.tienda || this.currentNegocioNombre || 'Tienda',
          canal: 'sistema',
          origen: 'local',
        });
      }
    });

    // Luego las de BD
    if (Array.isArray(bdNotifs)) {
      bdNotifs.forEach(n => {
        const id = n.id ? `bd_${n.id}` : `bd_${Date.now()}_${Math.random()}`;
        if (!idsVistos.has(id)) {
          idsVistos.add(id);
          todas.push({
            id: id,
            mensaje: n.mensaje,
            tipo: n.tipo_servicio || n.tipo || 'info',
            fecha: n.fecha_envio || n.created_at || new Date().toISOString(),
            leida: true, // Las de BD se consideran leídas
            importancia: this.calcularImportancia(n.tipo_servicio || n.tipo),
            usuario: n.usuario_nombre || 'Sistema',
            tienda: n.negocio_nombre || this.currentNegocioNombre || 'Tienda',
            canal: n.telegram_message_id ? 'telegram' : 'sistema',
            telegramId: n.telegram_message_id,
            clienteId: n.cliente_id,
            chatId: n.chat_id,
            origen: 'bd',
          });
        }
      });
    }

    // Ordenar por fecha descendente
    todas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return todas;
  },

  calcularImportancia(tipo) {
    const importancias = {
      error: 'critica',
      warning: 'alta',
      success: 'normal',
      info: 'baja',
    };
    return importancias[tipo] || 'normal';
  },

  // ============================================
  // GENERAR CHIPS DE CATEGORÍAS
  // ============================================
  generarChipsCategorias() {
    const bar = document.getElementById('notifCategoryBar');
    if (!bar) return;

    // Contar por categoría
    const conteos = { todos: this.notificacionesData.length };
    this.notificacionesData.forEach((n) => {
      const cat = this.detectarCategoria(n);
      conteos[cat] = (conteos[cat] || 0) + 1;
    });

    let html = '';

    // Generar chips
    Object.entries(this.CATEGORIES).forEach(([key, config]) => {
      const count = conteos[key] || 0;
      if (key === 'todos' || count > 0) {
        html += `
          <button class="notif-category-chip ${this.activeCategory === key ? 'active' : ''}" 
                  data-category="${key}"
                  style="--chip-color: ${config.color}">
            <i class="fas ${config.icon}"></i>
            ${config.label}
            <span class="chip-count">${key === 'todos' ? conteos.todos : count}</span>
          </button>
        `;
      }
    });

    bar.innerHTML = html;
  },

  detectarCategoria(notif) {
    if (notif.canal === 'telegram' || notif.telegramId) return 'telegram';
    
    const tipo = (notif.tipo || '').toLowerCase();
    if (tipo.includes('error')) return 'error';
    if (tipo.includes('warning') || tipo.includes('advertencia')) return 'warning';
    if (tipo.includes('success') || tipo.includes('exito')) return 'success';
    if (tipo.includes('info')) return 'info';
    
    return 'sistema';
  },

  actualizarChipsActivos() {
    document.querySelectorAll('.notif-category-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.category === this.activeCategory);
    });
  },

  actualizarIndicadoresSort() {
    document.querySelectorAll('.notif-history-table th.sortable').forEach((th) => {
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
  // RENDERIZAR NOTIFICACIONES NO LEÍDAS
  // ============================================
  renderizarNoLeidas() {
    const section = document.getElementById('notifUnreadSection');
    const list = document.getElementById('notifUnreadList');
    const badge = document.getElementById('notifUnreadBadge');
    const countEl = document.getElementById('notifUnreadCount');
    
    if (!section || !list) return;

    const noLeidas = this.notificacionesData.filter(n => !n.leida);
    
    if (noLeidas.length === 0) {
      section.style.display = 'none';
      if (badge) badge.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    if (badge) {
      badge.style.display = 'inline-flex';
      if (countEl) countEl.textContent = noLeidas.length;
    }

    list.innerHTML = noLeidas.map(n => this.renderizarTarjetaNoLeida(n)).join('');
  },

  renderizarTarjetaNoLeida(n) {
    const catConfig = this.CATEGORIES[this.detectarCategoria(n)] || this.CATEGORIES.sistema;
    const tiempoRelativo = this.tiempoRelativo(n.fecha);
    const importanciaClase = n.importancia === 'critica' ? 'critical' : 
                             n.importancia === 'alta' ? 'warning' : '';
    
    return `
      <div class="notif-unread-card ${importanciaClase}" data-id="${n.id}">
        <div class="notif-unread-icon" style="color: ${catConfig.color};">
          <i class="fas ${catConfig.icon}"></i>
        </div>
        <div class="notif-unread-content">
          <p class="notif-unread-message">${this.escapeHtml(n.mensaje)}</p>
          <div class="notif-unread-meta">
            <span><i class="fas fa-clock"></i> ${tiempoRelativo}</span>
            <span><i class="fas fa-user"></i> ${n.usuario}</span>
            <span><i class="fas fa-store"></i> ${n.tienda}</span>
          </div>
        </div>
        <button class="notif-unread-btn" data-action="mark-read" data-notif-id="${n.id}" title="Marcar como leída">
          <i class="fas fa-check"></i>
        </button>
      </div>
    `;
  },

  toggleSeccionNoLeidas() {
    const list = document.getElementById('notifUnreadList');
    const btn = document.getElementById('notifCollapseUnread');
    if (!list || !btn) return;

    const isCollapsed = list.style.display === 'none';
    list.style.display = isCollapsed ? 'flex' : 'none';
    btn.innerHTML = isCollapsed ? '<i class="fas fa-chevron-up"></i>' : '<i class="fas fa-chevron-down"></i>';
  },

  // ============================================
  // APLICAR FILTROS Y ORDENAMIENTO
  // ============================================
  aplicarFiltros() {
    let notifs = [...this.notificacionesData];

    // Filtrar por categoría
    if (this.activeCategory !== 'todos') {
      notifs = notifs.filter((n) => this.detectarCategoria(n) === this.activeCategory);
    }

    // Filtrar por búsqueda
    if (this.searchQuery) {
      notifs = notifs.filter((n) => {
        const searchableText = [
          n.mensaje,
          n.tipo,
          n.usuario,
          n.tienda,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(this.searchQuery);
      });
    }

    // Ordenar
    notifs.sort((a, b) => {
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

    this.filteredNotificaciones = notifs;
    this.renderizarTabla();
    this.actualizarEstadisticas();
  },

  // ============================================
  // RENDERIZAR TABLA
  // ============================================
  renderizarTabla() {
    const tbody = document.getElementById('notifTableBody');
    if (!tbody) return;

    if (!this.filteredNotificaciones.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="notif-empty-state">
              <i class="fas fa-bell-slash"></i>
              <p>No se encontraron notificaciones</p>
              <small>Ajusta los filtros o espera nuevos eventos</small>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filteredNotificaciones.map((n) => this.renderizarFila(n)).join('');
  },

  renderizarFila(n) {
    const catConfig = this.CATEGORIES[this.detectarCategoria(n)] || this.CATEGORIES.sistema;
    const fechaFormateada = this.formatearFechaCompleta(n.fecha);
    const mensajeCorto = n.mensaje.length > 60 ? n.mensaje.substring(0, 60) + '...' : n.mensaje;
    const canalIcon = n.canal === 'telegram' ? 'fab fa-telegram' : 'fas fa-desktop';
    const canalLabel = n.canal === 'telegram' ? 'Telegram' : 'Sistema';

    return `
      <tr class="${n.leida ? '' : 'unread'}">
        <td class="col-estado">
          ${n.leida 
            ? '<span class="notif-status read"><i class="fas fa-check-circle"></i></span>' 
            : '<span class="notif-status unread"><i class="fas fa-circle"></i></span>'}
        </td>
        <td class="col-fecha">
          <div class="notif-fecha-cell">
            <span class="fecha-principal">${fechaFormateada.fecha}</span>
            <span class="fecha-hora">${fechaFormateada.hora}</span>
          </div>
        </td>
        <td class="col-tipo">
          <span class="notif-type-badge" style="--badge-color: ${catConfig.color}">
            <i class="fas ${catConfig.icon}"></i>
            ${catConfig.label}
          </span>
        </td>
        <td class="col-mensaje" title="${this.escapeHtml(n.mensaje)}">
          ${this.escapeHtml(mensajeCorto)}
        </td>
        <td class="col-usuario">
          <span class="notif-user-cell">
            <i class="fas fa-user"></i>
            ${n.usuario || 'Sistema'}
          </span>
        </td>
        <td class="col-tienda">
          <span class="notif-store-cell">
            <i class="fas fa-store"></i>
            ${n.tienda || '-'}
          </span>
        </td>
        <td class="col-canal">
          <span class="notif-channel-badge ${n.canal}">
            <i class="${canalIcon}"></i>
            ${canalLabel}
          </span>
        </td>
        <td class="col-acciones">
          <div class="notif-actions">
            <button class="notif-action-btn" data-action="view" data-notif-id="${n.id}" title="Ver detalles">
              <i class="fas fa-eye"></i>
            </button>
            ${!n.leida ? `
              <button class="notif-action-btn" data-action="mark-read" data-notif-id="${n.id}" title="Marcar como leída">
                <i class="fas fa-check"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  },

  // ============================================
  // UTILIDADES DE FECHA
  // ============================================
  formatearFechaCompleta(fecha) {
    if (!fecha) return { fecha: '-', hora: '-' };
    const d = new Date(fecha);
    
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const seg = String(d.getSeconds()).padStart(2, '0');
    
    return {
      fecha: `${dia}/${mes}/${anio}`,
      hora: `${hora}:${min}:${seg}`,
    };
  },

  tiempoRelativo(fecha) {
    const ahora = new Date();
    const fechaNotif = new Date(fecha);
    const diff = ahora - fechaNotif;
    
    const segundos = Math.floor(diff / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    
    if (segundos < 60) return 'Hace un momento';
    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    if (dias === 1) return 'Ayer';
    if (dias < 7) return `Hace ${dias} días`;
    return fechaNotif.toLocaleDateString();
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // ============================================
  // MARCAR COMO LEÍDA
  // ============================================
  marcarLeida(id) {
    // Actualizar en datos locales
    const notif = this.notificacionesData.find(n => n.id === id);
    if (notif) {
      notif.leida = true;
    }

    // Actualizar en Notificaciones global
    if (window.Notificaciones) {
      const localId = id.replace('local_', '').replace('bd_', '');
      Notificaciones.marcarLeida(localId);
      Notificaciones.marcarLeida(id);
    }

    // Re-renderizar
    this.renderizarNoLeidas();
    this.aplicarFiltros();
    
    Utils.showToast('Notificación marcada como leída', 'success');
  },

  marcarTodasLeidas() {
    this.notificacionesData.forEach(n => n.leida = true);
    
    if (window.Notificaciones) {
      Notificaciones.marcarTodasLeidas();
    }

    this.renderizarNoLeidas();
    this.aplicarFiltros();
    
    Utils.showToast('Todas las notificaciones marcadas como leídas', 'success');
  },

  // ============================================
  // MOSTRAR DETALLES
  // ============================================
  mostrarDetalles(notifId) {
    const notif = this.notificacionesData.find(n => n.id === notifId);
    if (!notif) return;

    this.cerrarModal();

    const catConfig = this.CATEGORIES[this.detectarCategoria(notif)] || this.CATEGORIES.sistema;
    const fechaCompleta = this.formatearFechaCompleta(notif.fecha);

    const modalHTML = `
      <div class="notif-detail-modal is-visible" id="notifDetailModal">
        <div class="notif-detail-content">
          <div class="notif-detail-header" style="border-color: ${catConfig.color}">
            <h3>
              <i class="fas ${catConfig.icon}" style="color: ${catConfig.color}"></i>
              Detalle de Notificación
            </h3>
            <button class="notif-detail-close" id="notifDetailClose">&times;</button>
          </div>
          <div class="notif-detail-body">
            <div class="notif-detail-grid">
              <div class="notif-detail-item">
                <label><i class="fas fa-calendar"></i> Fecha</label>
                <span>${fechaCompleta.fecha}</span>
              </div>
              <div class="notif-detail-item">
                <label><i class="fas fa-clock"></i> Hora</label>
                <span>${fechaCompleta.hora}</span>
              </div>
              <div class="notif-detail-item">
                <label><i class="fas fa-tag"></i> Tipo</label>
                <span style="color: ${catConfig.color}">${catConfig.label}</span>
              </div>
              <div class="notif-detail-item">
                <label><i class="fas fa-signal"></i> Importancia</label>
                <span class="importance-badge ${notif.importancia}">${notif.importancia}</span>
              </div>
              <div class="notif-detail-item">
                <label><i class="fas fa-user"></i> Usuario</label>
                <span>${notif.usuario || 'Sistema'}</span>
              </div>
              <div class="notif-detail-item">
                <label><i class="fas fa-store"></i> Tienda</label>
                <span>${notif.tienda || '-'}</span>
              </div>
              <div class="notif-detail-item">
                <label><i class="fas fa-broadcast-tower"></i> Canal</label>
                <span>${notif.canal === 'telegram' ? 'Telegram' : 'Sistema'}</span>
              </div>
              <div class="notif-detail-item">
                <label><i class="fas fa-eye"></i> Estado</label>
                <span>${notif.leida ? 'Leída' : 'Sin leer'}</span>
              </div>
            </div>
            
            <div class="notif-detail-message">
              <label><i class="fas fa-comment"></i> Mensaje</label>
              <p>${this.escapeHtml(notif.mensaje)}</p>
            </div>
            
            ${notif.telegramId ? `
              <div class="notif-detail-telegram">
                <label><i class="fab fa-telegram"></i> ID Telegram</label>
                <code>${notif.telegramId}</code>
              </div>
            ` : ''}
            
            ${notif.chatId ? `
              <div class="notif-detail-chatid">
                <label><i class="fas fa-comments"></i> Chat ID</label>
                <code>${notif.chatId}</code>
              </div>
            ` : ''}
          </div>
          <div class="notif-detail-footer">
            ${!notif.leida ? `
              <button class="btn btn-primary" onclick="HistorialNotificaciones.marcarLeida('${notif.id}'); HistorialNotificaciones.cerrarModal();">
                <i class="fas fa-check"></i> Marcar como leída
              </button>
            ` : ''}
            <button class="btn btn-secondary" onclick="HistorialNotificaciones.cerrarModal();">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Eventos del modal
    document.getElementById('notifDetailClose')?.addEventListener('click', () => this.cerrarModal());
    document.getElementById('notifDetailModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'notifDetailModal') {
        this.cerrarModal();
      }
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

  cerrarModal() {
    const modal = document.getElementById('notifDetailModal');
    if (modal) modal.remove();
  },

  // ============================================
  // EXPORTAR A CSV
  // ============================================
  exportarCSV() {
    const notifs = this.filteredNotificaciones;
    if (!notifs.length) {
      Utils.showToast('No hay notificaciones para exportar', 'warning');
      return;
    }

    const headers = ['ID', 'Fecha', 'Hora', 'Tipo', 'Mensaje', 'Usuario', 'Tienda', 'Canal', 'Estado'];
    const rows = notifs.map((n) => {
      const fecha = this.formatearFechaCompleta(n.fecha);
      return [
        n.id,
        fecha.fecha,
        fecha.hora,
        n.tipo,
        (n.mensaje || '').replace(/"/g, '""'),
        n.usuario || 'Sistema',
        n.tienda || '-',
        n.canal,
        n.leida ? 'Leída' : 'Sin leer',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-notificaciones-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Utils.showToast('Historial exportado correctamente', 'success');
  },

  actualizarEstadisticas() {
    const totalEl = document.getElementById('notifTotalCount');
    const filteredEl = document.getElementById('notifFilteredCount');
    const pendingEl = document.getElementById('notifPendingCount');

    const noLeidas = this.notificacionesData.filter(n => !n.leida).length;

    if (totalEl) totalEl.textContent = this.notificacionesData.length;
    if (filteredEl) filteredEl.textContent = this.filteredNotificaciones.length;
    if (pendingEl) pendingEl.textContent = noLeidas;
  },
};

// Exportar el módulo para que sea accesible globalmente
window.HistorialNotificaciones = HistorialNotificaciones;
