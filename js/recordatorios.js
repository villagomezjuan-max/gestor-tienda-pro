// ============================================
// MÓDULO: RECORDATORIOS Y ALARMAS
// ============================================
// Sistema de recordatorios y notificaciones

window.Recordatorios = {
  // ============================================
  // RENDERIZAR VISTA PRINCIPAL
  // ============================================
  render(container) {
    const recordatorios = Database.getCollection('recordatorios');
    const pendientes = recordatorios.filter((r) => !r.completado);
    const vencidos = this.obtenerRecordatoriosVencidos();
    const proximos = this.obtenerProximos7Dias();

    container.innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-bell"></i> Recordatorios y Alarmas</h2>
        <button class="btn btn-primary" onclick="Recordatorios.mostrarFormulario()">
          <i class="fas fa-plus"></i> Nuevo Recordatorio
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--warning-light);">
            <i class="fas fa-clock" style="color: var(--warning-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${pendientes.length}</h3>
            <p>Pendientes</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--danger-light);">
            <i class="fas fa-exclamation-triangle" style="color: var(--danger-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${vencidos.length}</h3>
            <p>Vencidos</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--primary-light);">
            <i class="fas fa-calendar-day" style="color: var(--primary-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${proximos.length}</h3>
            <p>Próximos 7 días</p>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="filters-bar">
        <select id="filterTipo" class="form-control" onchange="Recordatorios.filtrar()">
          <option value="">Todos los tipos</option>
          <option value="publicidad">Publicidad</option>
          <option value="pago">Pago Proveedor</option>
          <option value="cobro">Cobro Cliente</option>
          <option value="reabastecimiento">Reabastecimiento</option>
          <option value="reunion">Reunión</option>
          <option value="tarea">Tarea</option>
          <option value="general">General</option>
        </select>
        <select id="filterEstado" class="form-control" onchange="Recordatorios.filtrar()">
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="completado">Completados</option>
        </select>
        <select id="filterPrioridad" class="form-control" onchange="Recordatorios.filtrar()">
          <option value="">Todas las prioridades</option>
          <option value="urgente">Urgente</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
      </div>

      <!-- Lista de recordatorios -->
      <div class="recordatorios-container" id="recordatoriosContainer">
        ${this.renderizarRecordatorios(recordatorios)}
      </div>
    `;
  },

  // ============================================
  // RENDERIZAR RECORDATORIOS
  // ============================================
  renderizarRecordatorios(recordatorios) {
    if (recordatorios.length === 0) {
      return '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No hay recordatorios</p></div>';
    }

    // Ordenar por fecha
    const ordenados = recordatorios.sort((a, b) => {
      const fechaA = new Date(a.fecha + ' ' + a.hora);
      const fechaB = new Date(b.fecha + ' ' + b.hora);
      return fechaA - fechaB;
    });

    return ordenados
      .map((r) => {
        const esVencido = this.esVencido(r.fecha, r.hora);
        const prioridadClass = this.getPrioridadClass(r.prioridad);
        const tipoIcon = this.getTipoIcon(r.tipo);
        const tipoColor = this.getTipoColor(r.tipo);

        return `
        <div class="recordatorio-card ${r.completado ? 'completado' : ''} ${esVencido && !r.completado ? 'vencido' : ''}">
          <div class="recordatorio-icon" style="background-color: ${tipoColor};">
            <i class="fas fa-${tipoIcon}"></i>
          </div>
          <div class="recordatorio-content">
            <div class="recordatorio-header">
              <h4>${r.titulo}</h4>
              <span class="badge badge-${prioridadClass}">${r.prioridad}</span>
            </div>
            <p class="recordatorio-descripcion">${r.descripcion || ''}</p>
            <div class="recordatorio-meta">
              <span><i class="fas fa-calendar"></i> ${r.fecha}</span>
              <span><i class="fas fa-clock"></i> ${r.hora}</span>
              <span><i class="fas fa-tag"></i> ${r.tipo}</span>
              ${r.recurrente !== 'ninguno' ? `<span><i class="fas fa-redo"></i> ${r.recurrente}</span>` : ''}
            </div>
          </div>
          <div class="recordatorio-actions">
            ${
              r.tipo === 'publicidad' && r.datosPublicidad
                ? `
              <button class="btn btn-sm btn-info" onclick="Recordatorios.verDetallePublicidad('${r.id}')" title="Ver publicidad">
                <i class="fas fa-eye"></i>
              </button>
            `
                : ''
            }
            ${
              !r.completado
                ? `
              <button class="btn btn-sm btn-success" onclick="Recordatorios.marcarCompletado('${r.id}')" title="Marcar completado">
                <i class="fas fa-check"></i>
              </button>
            `
                : `
              <button class="btn btn-sm btn-secondary" onclick="Recordatorios.desmarcarCompletado('${r.id}')" title="Desmarcar">
                <i class="fas fa-undo"></i>
              </button>
            `
            }
            <button class="btn btn-sm btn-primary" onclick="Recordatorios.editar('${r.id}')" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="Recordatorios.eliminar('${r.id}')" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
      })
      .join('');
  },

  // ============================================
  // MOSTRAR FORMULARIO
  // ============================================
  mostrarFormulario(recordatorioId = null) {
    const recordatorio = recordatorioId ? Database.getItem('recordatorios', recordatorioId) : null;
    const esEdicion = !!recordatorio;

    let fechaSeleccionada = recordatorio?.fecha || Utils.getCurrentDate();
    let horaSeleccionada =
      recordatorio?.hora ||
      new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalRecordatorio';
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3><i class="fas fa-bell"></i> ${esEdicion ? 'Editar' : 'Nuevo'} Recordatorio</h3>
          <button class="btn-close" onclick="document.getElementById('modalRecordatorio').remove()">×</button>
        </div>
        <div class="modal-body">
          <form id="formRecordatorio">
            <div class="form-group">
              <label>Título *</label>
              <input type="text" name="titulo" class="form-control" value="${recordatorio?.titulo || ''}" required>
            </div>

            <div class="form-group">
              <label>Descripción</label>
              <textarea name="descripcion" class="form-control" rows="3">${recordatorio?.descripcion || ''}</textarea>
            </div>

            <div class="form-group">
              <label>Fecha y Hora *</label>
              <div class="datetime-display" id="datetimeDisplay">
                <input type="text" readonly value="${Utils.formatDate(fechaSeleccionada, 'long')} ${horaSeleccionada}" onclick="document.getElementById('openDateTimePicker').click()">
                <button type="button" class="btn btn-secondary" id="openDateTimePicker">Cambiar</button>
              </div>
              <input type="hidden" name="fecha" value="${fechaSeleccionada}">
              <input type="hidden" name="hora" value="${horaSeleccionada}">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Tipo *</label>
                <select name="tipo" class="form-control" required>
                  <option value="general" ${recordatorio?.tipo === 'general' ? 'selected' : ''}>General</option>
                  <option value="publicidad" ${recordatorio?.tipo === 'publicidad' ? 'selected' : ''}>Publicidad</option>
                  <option value="pago" ${recordatorio?.tipo === 'pago' ? 'selected' : ''}>Pago Proveedor</option>
                  <option value="cobro" ${recordatorio?.tipo === 'cobro' ? 'selected' : ''}>Cobro Cliente</option>
                  <option value="reabastecimiento" ${recordatorio?.tipo === 'reabastecimiento' ? 'selected' : ''}>Reabastecimiento</option>
                  <option value="reunion" ${recordatorio?.tipo === 'reunion' ? 'selected' : ''}>Reunión</option>
                  <option value="tarea" ${recordatorio?.tipo === 'tarea' ? 'selected' : ''}>Tarea</option>
                </select>
              </div>
              <div class="form-group">
                <label>Prioridad *</label>
                <select name="prioridad" class="form-control" required>
                  <option value="baja" ${recordatorio?.prioridad === 'baja' ? 'selected' : ''}>Baja</option>
                  <option value="media" ${recordatorio?.prioridad === 'media' ? 'selected' : ''}>Media</option>
                  <option value="alta" ${recordatorio?.prioridad === 'alta' ? 'selected' : ''}>Alta</option>
                  <option value="urgente" ${recordatorio?.prioridad === 'urgente' ? 'selected' : ''}>Urgente</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Recurrencia</label>
              <select name="recurrente" class="form-control">
                <option value="ninguno" ${recordatorio?.recurrente === 'ninguno' ? 'selected' : ''}>No se repite</option>
                <option value="diario" ${recordatorio?.recurrente === 'diario' ? 'selected' : ''}>Diario</option>
                <option value="semanal" ${recordatorio?.recurrente === 'semanal' ? 'selected' : ''}>Semanal</option>
                <option value="mensual" ${recordatorio?.recurrente === 'mensual' ? 'selected' : ''}>Mensual</option>
                <option value="anual" ${recordatorio?.recurrente === 'anual' ? 'selected' : ''}>Anual</option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalRecordatorio').remove()">Cancelar</button>
          <button class="btn btn-primary" onclick="Recordatorios.guardar('${recordatorioId || ''}')">
            <i class="fas fa-save"></i> Guardar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('openDateTimePicker').addEventListener('click', () => {
      const currentVal = new Date(`${fechaSeleccionada}T${horaSeleccionada}`);
      this.DateTimePicker.open(currentVal, (newDate) => {
        fechaSeleccionada = newDate.toISOString().split('T')[0];
        horaSeleccionada = newDate.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });

        document.querySelector('#datetimeDisplay input[type="text"]').value =
          `${Utils.formatDate(fechaSeleccionada, 'long')} ${horaSeleccionada}`;
        document.querySelector('input[name="fecha"]').value = fechaSeleccionada;
        document.querySelector('input[name="hora"]').value = horaSeleccionada;
      });
    });
  },

  // ============================================
  // DATE-TIME PICKER HELPER
  // ============================================
  DateTimePicker: {
    currentDate: new Date(),
    callback: null,

    open(initialDate, callback) {
      this.currentDate =
        initialDate instanceof Date && !isNaN(initialDate) ? initialDate : new Date();
      this.callback = callback;
      this.render();
    },

    render() {
      const existingPicker = document.getElementById('dateTimePicker');
      if (existingPicker) existingPicker.remove();

      const picker = document.createElement('div');
      picker.id = 'dateTimePicker';
      picker.className = 'datetime-picker-overlay';
      picker.innerHTML = `
        <div class="datetime-picker-container">
          <div class="calendar-container">
            <div class="calendar-header">
              <button id="dt-prev-month"><i class="fas fa-chevron-left"></i></button>
              <span id="current-month-year"></span>
              <button id="dt-next-month"><i class="fas fa-chevron-right"></i></button>
            </div>
            <div class="calendar-grid" id="calendar-grid"></div>
          </div>
          <div class="time-picker-container">
            <div class="time-dial" id="hour-dial"></div>
            <div class="time-dial" id="minute-dial"></div>
          </div>
          <div class="datetime-picker-footer">
            <button class="btn btn-sm btn-secondary" id="dt-cancel">Cancelar</button>
            <button class="btn btn-sm btn-primary" id="dt-ok">Aceptar</button>
          </div>
        </div>
      `;
      document.body.appendChild(picker);
      this.renderCalendar();
      this.renderTime();
      this.addListeners();
    },

    renderCalendar() {
      const grid = document.getElementById('calendar-grid');
      const monthYear = document.getElementById('current-month-year');

      const month = this.currentDate.getMonth();
      const year = this.currentDate.getFullYear();

      monthYear.textContent = this.currentDate.toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
      });

      let calendarHTML =
        '<div class="weekday">D</div><div class="weekday">L</div><div class="weekday">M</div><div class="weekday">M</div><div class="weekday">J</div><div class="weekday">V</div><div class="weekday">S</div>';

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
      }

      for (let i = 1; i <= daysInMonth; i++) {
        let classes = 'calendar-day';
        const today = new Date();
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
          classes += ' today';
        }
        if (i === this.currentDate.getDate()) {
          classes += ' selected';
        }
        calendarHTML += `<div class="${classes}" data-day="${i}">${i}</div>`;
      }

      grid.innerHTML = calendarHTML;
    },

    renderTime() {
      const hourDial = document.getElementById('hour-dial');
      const minuteDial = document.getElementById('minute-dial');
      const currentHour = this.currentDate.getHours();
      const currentMinute = this.currentDate.getMinutes();

      let hoursHTML = '';
      for (let i = 0; i < 24; i++) {
        const hour = String(i).padStart(2, '0');
        hoursHTML += `<div class="${i === currentHour ? 'selected' : ''}" data-hour="${i}">${hour}</div>`;
      }
      hourDial.innerHTML = hoursHTML;

      let minutesHTML = '';
      for (let i = 0; i < 60; i += 5) {
        const minute = String(i).padStart(2, '0');
        minutesHTML += `<div class="${Math.abs(i - currentMinute) < 5 ? 'selected' : ''}" data-minute="${i}">${minute}</div>`;
      }
      minuteDial.innerHTML = minutesHTML;

      setTimeout(() => {
        hourDial
          .querySelector('.selected')
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        minuteDial
          .querySelector('.selected')
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 50);
    },

    addListeners() {
      document.getElementById('dt-prev-month').addEventListener('click', () => {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
      });

      document.getElementById('dt-next-month').addEventListener('click', () => {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
      });

      document.getElementById('calendar-grid').addEventListener('click', (e) => {
        if (e.target.classList.contains('calendar-day') && !e.target.classList.contains('empty')) {
          this.currentDate.setDate(parseInt(e.target.dataset.day));
          this.renderCalendar();
        }
      });

      document.getElementById('hour-dial').addEventListener('click', (e) => {
        if (e.target.dataset.hour) {
          this.currentDate.setHours(parseInt(e.target.dataset.hour));
          this.renderTime();
        }
      });

      document.getElementById('minute-dial').addEventListener('click', (e) => {
        if (e.target.dataset.minute) {
          this.currentDate.setMinutes(parseInt(e.target.dataset.minute));
          this.renderTime();
        }
      });

      document.getElementById('dt-cancel').addEventListener('click', () => this.close());
      document.getElementById('dt-ok').addEventListener('click', () => {
        if (this.callback) {
          this.callback(this.currentDate);
        }
        this.close();
      });
      document.getElementById('dateTimePicker').addEventListener('click', (e) => {
        if (e.target.id === 'dateTimePicker') {
          this.close();
        }
      });
    },

    close() {
      document.getElementById('dateTimePicker')?.remove();
    },
  },

  // ============================================
  // GUARDAR RECORDATORIO
  // ============================================
  guardar(recordatorioId) {
    const form = document.getElementById('formRecordatorio');
    const formData = new FormData(form);

    if (!formData.get('titulo') || !formData.get('fecha') || !formData.get('hora')) {
      Utils.showToast('Completa los campos requeridos', 'error');
      return;
    }

    const recordatorioData = {
      titulo: formData.get('titulo'),
      descripcion: formData.get('descripcion'),
      tipo: formData.get('tipo'),
      prioridad: formData.get('prioridad'),
      fecha: formData.get('fecha'),
      hora: formData.get('hora'),
      recurrente: formData.get('recurrente'),
      completado: false,
      color: this.getTipoColor(formData.get('tipo')),
    };

    if (recordatorioId) {
      const recordatorio = Database.getItem('recordatorios', recordatorioId);
      Object.assign(recordatorio, recordatorioData);
      recordatorio.updatedAt = new Date().toISOString();
      Database.update('recordatorios', recordatorioId, recordatorio);
      Utils.showToast('Recordatorio actualizado', 'success');
    } else {
      recordatorioData.id = Utils.generateId();
      recordatorioData.notificado = false;
      recordatorioData.createdAt = new Date().toISOString();
      recordatorioData.updatedAt = new Date().toISOString();
      Database.add('recordatorios', recordatorioData);
      Utils.showToast('Recordatorio creado', 'success');
    }

    document.getElementById('modalRecordatorio').remove();

    // Actualizar sin recargar página
    if (window.DataRefreshManager) {
      const container = document.querySelector('.page-content');
      if (container) this.render(container);
    } else {
      App.loadModule('notificaciones_inteligentes');
    }
  },

  // ============================================
  // MARCAR COMPLETADO/DESMARCAR
  // ============================================
  marcarCompletado(id) {
    const recordatorio = Database.getItem('recordatorios', id);
    if (recordatorio) {
      recordatorio.completado = true;
      recordatorio.fechaCompletado = new Date().toISOString();
      Database.update('recordatorios', id, recordatorio);
      Utils.showToast('Marcado como completado', 'success');

      // Actualizar sin recargar
      if (window.DataRefreshManager) {
        const container = document.querySelector('.page-content');
        if (container) this.render(container);
      } else {
        App.loadModule('notificaciones_inteligentes');
      }
    }
  },

  desmarcarCompletado(id) {
    const recordatorio = Database.getItem('recordatorios', id);
    if (recordatorio) {
      recordatorio.completado = false;
      recordatorio.fechaCompletado = null;
      Database.update('recordatorios', id, recordatorio);
      Utils.showToast('Desmarcado', 'success');

      // Actualizar sin recargar
      if (window.DataRefreshManager) {
        const container = document.querySelector('.page-content');
        if (container) this.render(container);
      } else {
        App.loadModule('notificaciones_inteligentes');
      }
    }
  },

  // ============================================
  // EDITAR Y ELIMINAR
  // ============================================
  editar(id) {
    this.mostrarFormulario(id);
  },

  eliminar(id) {
    Utils.showConfirm('¿Eliminar este recordatorio?', () => {
      Database.deleteItem('recordatorios', id);
      Utils.showToast('Recordatorio eliminado', 'success');

      // Actualizar sin recargar
      if (window.DataRefreshManager) {
        const container = document.querySelector('.page-content');
        if (container) Recordatorios.render(container);
      } else {
        App.loadModule('notificaciones_inteligentes');
      }
    });
  },

  // ============================================
  // FILTRAR
  // ============================================
  filtrar() {
    const recordatorios = Database.getCollection('recordatorios');
    const tipo = document.getElementById('filterTipo').value;
    const estado = document.getElementById('filterEstado').value;
    const prioridad = document.getElementById('filterPrioridad').value;

    let filtrados = recordatorios;

    if (tipo) {
      filtrados = filtrados.filter((r) => r.tipo === tipo);
    }

    if (estado === 'pendiente') {
      filtrados = filtrados.filter((r) => !r.completado);
    } else if (estado === 'completado') {
      filtrados = filtrados.filter((r) => r.completado);
    }

    if (prioridad) {
      filtrados = filtrados.filter((r) => r.prioridad === prioridad);
    }

    document.getElementById('recordatoriosContainer').innerHTML =
      this.renderizarRecordatorios(filtrados);
  },

  // ============================================
  // UTILIDADES
  // ============================================
  esVencido(fecha, hora) {
    const ahora = new Date();
    const fechaRecordatorio = new Date(fecha + ' ' + hora);
    return fechaRecordatorio < ahora;
  },

  obtenerRecordatoriosVencidos() {
    const recordatorios = Database.getCollection('recordatorios');
    return recordatorios.filter((r) => !r.completado && this.esVencido(r.fecha, r.hora));
  },

  obtenerProximos7Dias() {
    const recordatorios = Database.getCollection('recordatorios');
    const hoy = new Date();
    const en7Dias = new Date();
    en7Dias.setDate(en7Dias.getDate() + 7);

    return recordatorios.filter((r) => {
      if (r.completado) return false;
      const fechaR = new Date(r.fecha + ' ' + r.hora);
      return fechaR >= hoy && fechaR <= en7Dias;
    });
  },

  getPrioridadClass(prioridad) {
    const classes = {
      baja: 'secondary',
      media: 'warning',
      alta: 'danger',
      urgente: 'danger',
    };
    return classes[prioridad] || 'secondary';
  },

  getTipoIcon(tipo) {
    const icons = {
      publicidad: 'bullhorn',
      pago: 'money-bill',
      cobro: 'hand-holding-usd',
      reabastecimiento: 'boxes',
      reunion: 'users',
      tarea: 'tasks',
      general: 'bell',
    };
    return icons[tipo] || 'bell';
  },

  getTipoColor(tipo) {
    const colors = {
      publicidad: '#9c27b0',
      pago: '#f44336',
      cobro: '#4caf50',
      reabastecimiento: '#ff9800',
      reunion: '#2196f3',
      tarea: '#607d8b',
      general: '#9e9e9e',
    };
    return colors[tipo] || '#9e9e9e';
  },

  // ============================================
  // VER DETALLE DE PUBLICIDAD DESDE RECORDATORIO
  // ============================================
  verDetallePublicidad(recordatorioId) {
    const recordatorio = Database.getItem('recordatorios', recordatorioId);
    if (!recordatorio || !recordatorio.datosPublicidad) {
      Utils.showToast('No hay datos de publicidad para este recordatorio', 'warning');
      return;
    }

    const datos = recordatorio.datosPublicidad;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalDetallePublicidadRecordatorio';
    modal.innerHTML = `
      <div class="modal-container" style="max-width: 700px;">
        <div class="modal-header">
          <h3><i class="fab fa-${datos.redSocial}"></i> Publicidad para ${datos.redSocial.charAt(0).toUpperCase() + datos.redSocial.slice(1)}</h3>
          <button class="btn-close" onclick="document.getElementById('modalDetallePublicidadRecordatorio').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label><strong>Producto:</strong></label>
            <p>${datos.producto}</p>
          </div>
          <div class="form-group">
            <label><strong>Texto de Publicidad:</strong></label>
            <div class="result-content" id="textoPublicidadRecordatorio" style="background: #f5f5f5; padding: 1rem; border-radius: 8px; white-space: pre-wrap;">${datos.texto}</div>
          </div>
          <div class="form-group">
            <button class="btn btn-secondary" onclick="Recordatorios.copiarTextoPublicidad()">
              <i class="fas fa-copy"></i> Copiar Texto
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-success" onclick="Recordatorios.marcarCompletado('${recordatorioId}'); document.getElementById('modalDetallePublicidadRecordatorio').remove();">
            <i class="fas fa-check"></i> Marcar como Publicado
          </button>
          <button class="btn btn-secondary" onclick="document.getElementById('modalDetallePublicidadRecordatorio').remove()">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  // Copiar texto de publicidad desde el modal de detalle
  copiarTextoPublicidad() {
    const text = document.getElementById('textoPublicidadRecordatorio').innerText;

    // Método moderno: navigator.clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          Utils.showToast('Copiado al portapapeles', 'success');
        })
        .catch(() => {
          // Si falla, usar método alternativo
          this.copiarAlPortapapelesFallback(text);
        });
    } else {
      // Fallback para navegadores que no soportan clipboard API
      this.copiarAlPortapapelesFallback(text);
    }
  },

  // Método alternativo para copiar (compatible con todos los navegadores)
  copiarAlPortapapelesFallback(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      const exitoso = document.execCommand('copy');
      if (exitoso) {
        Utils.showToast('Copiado al portapapeles', 'success');
      } else {
        Utils.showToast('No se pudo copiar', 'warning');
      }
    } catch (err) {
      console.error('Error al copiar:', err);
      Utils.showToast('Error al copiar', 'danger');
    }

    document.body.removeChild(textarea);
  },

  /**
   * Inicializa el sistema de recordatorios automáticos
   */
  async inicializarSistemaAutomatico() {
    if (window.RecordatoriosAutomaticos) {
      await RecordatoriosAutomaticos.init();
      console.log('✅ Sistema de recordatorios automáticos inicializado');
    }
  },

  /**
   * Obtiene recordatorios con filtros para taller mecánico
   */
  async obtenerRecordatoriosTaller() {
    try {
      const recordatorios = await Auth._request(
        '/recordatorios?tipo=mantenimiento,revision,entrega&completado=false'
      );
      return recordatorios;
    } catch (error) {
      console.error('Error obteniendo recordatorios de taller:', error);
      return [];
    }
  },

  /**
   * Renderiza vista específica para taller mecánico
   */
  async renderTallerView(container) {
    const recordatoriosTaller = await this.obtenerRecordatoriosTaller();
    const recordatoriosVencidos = this.obtenerRecordatoriosVencidos(recordatoriosTaller);
    const proximosMantenimientos = recordatoriosTaller.filter(
      (r) =>
        ['mantenimiento', 'revision'].includes(r.tipo) &&
        new Date(r.fecha) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    container.innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-tools"></i> Recordatorios de Taller</h2>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="Recordatorios.mostrarFormulario()">
            <i class="fas fa-plus"></i> Nuevo Recordatorio
          </button>
          <button class="btn btn-success" onclick="RecordatoriosAutomaticos.crearRecordatoriosAutomaticos()">
            <i class="fas fa-sync"></i> Generar Automáticos
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card urgent">
          <i class="fas fa-exclamation-triangle"></i>
          <div class="stat-content">
            <h3>${recordatoriosVencidos.length}</h3>
            <p>Vencidos</p>
          </div>
        </div>
        <div class="stat-card warning">
          <i class="fas fa-wrench"></i>
          <div class="stat-content">
            <h3>${proximosMantenimientos.length}</h3>
            <p>Mantenimientos Próximos</p>
          </div>
        </div>
        <div class="stat-card info">
          <i class="fas fa-calendar-check"></i>
          <div class="stat-content">
            <h3>${recordatoriosTaller.length}</h3>
            <p>Total Pendientes</p>
          </div>
        </div>
      </div>

      <div class="taller-sections">
        ${
          recordatoriosVencidos.length > 0
            ? `
          <div class="section-urgent">
            <h3><i class="fas fa-exclamation-triangle"></i> Recordatorios Vencidos</h3>
            <div class="recordatorios-grid">
              ${recordatoriosVencidos.map((r) => this.renderizarTarjetaRecordatorio(r, true)).join('')}
            </div>
          </div>
        `
            : ''
        }

        ${
          proximosMantenimientos.length > 0
            ? `
          <div class="section-maintenance">
            <h3><i class="fas fa-wrench"></i> Próximos Mantenimientos</h3>
            <div class="recordatorios-grid">
              ${proximosMantenimientos.map((r) => this.renderizarTarjetaRecordatorio(r)).join('')}
            </div>
          </div>
        `
            : ''
        }

        <div class="section-all">
          <h3><i class="fas fa-list"></i> Todos los Recordatorios</h3>
          <div class="recordatorios-container">
            ${this.renderizarRecordatorios(recordatoriosTaller)}
          </div>
        </div>
      </div>
    `;

    // Inicializar sistema automático si no está inicializado
    this.inicializarSistemaAutomatico();
  },

  /**
   * Renderiza tarjeta de recordatorio para vista de taller
   */
  renderizarTarjetaRecordatorio(recordatorio, esVencido = false) {
    const fechaRecordatorio = new Date(recordatorio.fecha + ' ' + recordatorio.hora);
    const ahora = new Date();
    const diasDiferencia = Math.ceil((fechaRecordatorio - ahora) / (1000 * 60 * 60 * 24));

    return `
      <div class="recordatorio-card ${esVencido ? 'vencido' : ''} priority-${recordatorio.prioridad}">
        <div class="card-header">
          <div class="recordatorio-icon">
            <i class="${recordatorio.icono || 'fas fa-bell'}"></i>
          </div>
          <div class="recordatorio-info">
            <h4>${recordatorio.titulo}</h4>
            <p class="fecha-info">
              <i class="fas fa-calendar"></i> ${new Date(recordatorio.fecha).toLocaleDateString()}
              <i class="fas fa-clock"></i> ${recordatorio.hora}
              ${
                esVencido
                  ? '<span class="badge-vencido">Vencido</span>'
                  : diasDiferencia === 0
                    ? '<span class="badge-hoy">Hoy</span>'
                    : diasDiferencia === 1
                      ? '<span class="badge-manana">Mañana</span>'
                      : diasDiferencia > 0
                        ? `<span class="badge-futuro">${diasDiferencia} días</span>`
                        : ''
              }
            </p>
          </div>
        </div>
        
        <div class="card-body">
          <p class="descripcion">${recordatorio.descripcion}</p>
          ${
            recordatorio.vehiculo_id
              ? `
            <div class="vehiculo-info">
              <i class="fas fa-car"></i> Vehículo asociado
            </div>
          `
              : ''
          }
        </div>
        
        <div class="card-actions">
          <button class="btn btn-sm btn-success" onclick="Recordatorios.marcarCompletado('${recordatorio.id}')" title="Completar">
            <i class="fas fa-check"></i>
          </button>
          <button class="btn btn-sm btn-info" onclick="Recordatorios.verDetalle('${recordatorio.id}')" title="Ver detalles">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-primary" onclick="Recordatorios.editarRecordatorio('${recordatorio.id}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          ${
            recordatorio.vehiculo_id
              ? `
            <button class="btn btn-sm btn-secondary" onclick="App.loadModule('vehiculos'); Vehiculos.verDetalle('${recordatorio.vehiculo_id}')" title="Ver vehículo">
              <i class="fas fa-car"></i>
            </button>
          `
              : ''
          }
        </div>
      </div>
    `;
  },

  Notificador: {
    CHECK_INTERVAL: 60000,
    LOOKAHEAD_MINUTES: 5,
    MAX_OVERDUE_MINUTES: 240,
    MIN_REPEAT_MINUTES: 3,
    DISMISS_SNOOZE_MINUTES: 3,
    NEXT_COOLDOWN_MS: 1500,
    initialized: false,
    intervalId: null,
    queue: [],
    activeBubble: null,
    activeRecordatorio: null,
    lastActivity: 0,
    activityHandler: null,
    visibilityHandler: null,
    cooldownTimer: null,

    init() {
      if (this.initialized) return;
      this.initialized = true;
      this.activityHandler = () => this.onUserActivity();
      this.visibilityHandler = () => {
        if (!document.hidden) {
          this.onUserActivity(true);
        }
      };
      ['click', 'keydown', 'mousemove', 'touchstart', 'focus'].forEach((eventName) => {
        window.addEventListener(eventName, this.activityHandler, { passive: true });
      });
      document.addEventListener('visibilitychange', this.visibilityHandler);
      this.tick();
      this.intervalId = window.setInterval(() => this.tick(), this.CHECK_INTERVAL);
    },

    onUserActivity(force = false) {
      const now = Date.now();
      if (!force && now - this.lastActivity < 4000) return;
      this.lastActivity = now;
      this.tick();
    },

    tick() {
      if (document.hidden) return;
      try {
        const resultado = Database.getCollection('recordatorios');
        if (resultado && typeof resultado.then === 'function') {
          resultado
            .then((records) => this.procesarLista(Array.isArray(records) ? records : []))
            .catch((error) =>
              console.error('Recordatorios.Notificador: error obteniendo recordatorios', error)
            );
        } else {
          this.procesarLista(Array.isArray(resultado) ? resultado : []);
        }
      } catch (error) {
        console.error('Recordatorios.Notificador: error en tick', error);
      }
    },

    procesarLista(lista) {
      if (!Array.isArray(lista) || !lista.length) {
        return;
      }
      const pendientes = lista.filter((recordatorio) => this.debeNotificarse(recordatorio));
      pendientes.sort((a, b) => {
        const fechaA = this.parseDatetime(a)?.getTime() || 0;
        const fechaB = this.parseDatetime(b)?.getTime() || 0;
        return fechaA - fechaB;
      });
      pendientes.forEach((recordatorio) => this.agregarACola(recordatorio));
      this.mostrarSiguiente();
    },

    debeNotificarse(recordatorio) {
      if (!recordatorio || recordatorio.completado) return false;
      const fecha = this.parseDatetime(recordatorio);
      if (!fecha) return false;

      const ahora = Date.now();
      const programado = fecha.getTime();
      const prioridad = (recordatorio.prioridad || '').toLowerCase();
      const lookahead = Math.max(this.LOOKAHEAD_MINUTES, prioridad === 'urgente' ? 10 : 0) * 60000;
      const maxOverdue =
        Math.max(this.MAX_OVERDUE_MINUTES, prioridad === 'urgente' ? 360 : 0) * 60000;

      if (recordatorio.silenciadoHasta) {
        const silencioHasta = new Date(recordatorio.silenciadoHasta).getTime();
        if (silencioHasta && silencioHasta > ahora) {
          return false;
        }
      }

      if (recordatorio.ultimaNotificacion) {
        const ultima = new Date(recordatorio.ultimaNotificacion).getTime();
        if (ultima && ahora - ultima < this.MIN_REPEAT_MINUTES * 60000) {
          return false;
        }
      }

      const diff = programado - ahora;
      if (diff <= lookahead && diff >= -maxOverdue) {
        return true;
      }

      return false;
    },

    parseDatetime(recordatorio) {
      if (!recordatorio || !recordatorio.fecha) return null;
      const hora = recordatorio.hora && recordatorio.hora.length ? recordatorio.hora : '09:00';
      const iso = `${recordatorio.fecha}T${hora}`;
      const fecha = new Date(iso);
      if (Number.isNaN(fecha.getTime())) {
        const fallback = new Date(`${recordatorio.fecha} ${hora}`);
        return Number.isNaN(fallback.getTime()) ? null : fallback;
      }
      return fecha;
    },

    agregarACola(recordatorio) {
      if (!recordatorio || !recordatorio.id) return;
      if (this.activeRecordatorio && this.activeRecordatorio.id === recordatorio.id) return;
      if (this.queue.some((item) => item.id === recordatorio.id)) return;
      this.queue.push({ ...recordatorio });
    },

    mostrarSiguiente() {
      if (this.activeBubble || !this.queue.length) return;
      const siguiente = this.queue.shift();
      this.activeRecordatorio = siguiente;
      const bubble = this.crearBubble(siguiente);
      if (!bubble) {
        this.activeRecordatorio = null;
        return;
      }
      this.activeBubble = bubble;
      document.body.appendChild(bubble);
      window.requestAnimationFrame(() => bubble.classList.add('show'));
      this.actualizarRecordatorio(siguiente.id, {
        ultimaNotificacion: new Date().toISOString(),
        notificado: true,
      });
    },

    crearBubble(recordatorio) {
      if (!recordatorio) return null;
      const prioridad = (recordatorio.prioridad || 'media').toLowerCase();
      const tipo = (recordatorio.tipo || 'general').toLowerCase();
      const fecha = this.parseDatetime(recordatorio);
      const diffText = fecha ? this.formatearDiferencia(fecha) : '';
      const fechaTexto = fecha
        ? `${Utils.formatDate(fecha, 'long')} ${fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : `${recordatorio.fecha || ''} ${recordatorio.hora || ''}`;
      const descripcion = recordatorio.descripcion ? this.sanitizar(recordatorio.descripcion) : '';
      const bubble = document.createElement('div');
      bubble.className = `recordatorio-bubble prioridad-${prioridad}`;
      bubble.dataset.id = recordatorio.id;

      const tags = [];
      tags.push(`<span class="bubble-tag tipo">${this.sanitizar(tipo)}</span>`);
      tags.push(
        `<span class="bubble-tag prioridad">${this.obtenerEtiquetaPrioridad(prioridad)}</span>`
      );
      if (diffText) {
        tags.push(`<span class="bubble-tag tiempo">${this.sanitizar(diffText)}</span>`);
      }
      if (recordatorio.datosCompra) {
        if (recordatorio.datosCompra.proveedor) {
          tags.push(
            `<span class="bubble-tag proveedor">Proveedor: ${this.sanitizar(recordatorio.datosCompra.proveedor)}</span>`
          );
        }
        if (recordatorio.datosCompra.sku) {
          tags.push(
            `<span class="bubble-tag sku">SKU: ${this.sanitizar(recordatorio.datosCompra.sku)}</span>`
          );
        }
      }
      bubble.innerHTML = `
        <button type="button" class="bubble-close" data-action="cerrar" aria-label="Cerrar recordatorio">&times;</button>
        <header>
          <div class="bubble-icon"><i class="fas fa-bell"></i></div>
          <div>
            <h4>${this.sanitizar(recordatorio.titulo || 'Recordatorio')}</h4>
            <p class="bubble-date">${this.sanitizar(fechaTexto)}</p>
          </div>
        </header>
        ${descripcion ? `<p class="bubble-description">${descripcion}</p>` : ''}
        ${tags.length ? `<div class="bubble-tags">${tags.join('')}</div>` : ''}
        <div class="bubble-actions">
          <button type="button" data-action="completar" class="bubble-btn success"><i class="fas fa-check"></i> Listo</button>
          <div class="bubble-snoozes" aria-label="Posponer recordatorio">
            <span>Posponer:</span>
            <button type="button" data-action="posponer" data-minutes="5" class="bubble-btn ghost">+5 min</button>
            <button type="button" data-action="posponer" data-minutes="10" class="bubble-btn ghost">+10 min</button>
            <button type="button" data-action="posponer" data-minutes="15" class="bubble-btn ghost">+15 min</button>
          </div>
          <button type="button" data-action="abrir" class="bubble-btn link"><i class="fas fa-external-link-alt"></i> Ver lista</button>
        </div>
      `;
      bubble.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-action]');
        if (!trigger) return;
        const action = trigger.dataset.action;
        if (action === 'completar') {
          this.completar(recordatorio);
        } else if (action === 'posponer') {
          const minutes = Number(trigger.dataset.minutes || '5');
          this.posponer(recordatorio, Number.isFinite(minutes) ? minutes : 5);
        } else if (action === 'abrir') {
          this.abrir(recordatorio);
        } else if (action === 'cerrar') {
          this.descartar(recordatorio);
        }
      });
      return bubble;
    },

    eliminarDeCola(id) {
      if (!id) return;
      this.queue = this.queue.filter((item) => item.id !== id);
    },

    completar(recordatorio) {
      this.eliminarDeCola(recordatorio.id);
      this.actualizarRecordatorio(recordatorio.id, {
        completado: true,
        fechaCompletado: new Date().toISOString(),
        silenciadoHasta: new Date(Date.now() + this.DISMISS_SNOOZE_MINUTES * 60000).toISOString(),
      });
      if (window.Utils && typeof Utils.showToast === 'function') {
        Utils.showToast('Recordatorio completado', 'success');
      }
      this.cerrarBubble();
    },

    posponer(recordatorio, minutos) {
      this.eliminarDeCola(recordatorio.id);
      const objetivo = new Date();
      objetivo.setMinutes(objetivo.getMinutes() + minutos);
      this.actualizarRecordatorio(recordatorio.id, {
        fecha: this.formatoFechaInput(objetivo),
        hora: this.formatoHoraInput(objetivo),
        silenciadoHasta: objetivo.toISOString(),
        ultimaNotificacion: new Date().toISOString(),
      });
      if (window.Utils && typeof Utils.showToast === 'function') {
        Utils.showToast(`Recordatorio pospuesto ${minutos} minutos`, 'info');
      }
      this.cerrarBubble();
    },

    abrir(recordatorio) {
      this.eliminarDeCola(recordatorio.id);
      this.actualizarRecordatorio(recordatorio.id, {
        silenciadoHasta: new Date(Date.now() + 10 * 60000).toISOString(),
        ultimaNotificacion: new Date().toISOString(),
      });
      if (window.App && typeof App.loadModule === 'function') {
        App.loadModule('notificaciones_inteligentes');
      }
      this.cerrarBubble();
    },

    descartar(recordatorio) {
      this.eliminarDeCola(recordatorio.id);
      this.actualizarRecordatorio(recordatorio.id, {
        silenciadoHasta: new Date(Date.now() + this.DISMISS_SNOOZE_MINUTES * 60000).toISOString(),
        ultimaNotificacion: new Date().toISOString(),
      });
      this.cerrarBubble();
    },

    cerrarBubble() {
      if (!this.activeBubble) return;
      const bubble = this.activeBubble;
      bubble.classList.remove('show');
      window.setTimeout(() => {
        if (bubble && bubble.parentNode) {
          bubble.parentNode.removeChild(bubble);
        }
      }, 220);
      this.activeBubble = null;
      this.activeRecordatorio = null;
      if (this.cooldownTimer) {
        clearTimeout(this.cooldownTimer);
      }
      this.cooldownTimer = window.setTimeout(() => this.mostrarSiguiente(), this.NEXT_COOLDOWN_MS);
    },

    actualizarRecordatorio(id, datos) {
      if (!id || !datos || !Database || typeof Database.update !== 'function') return;
      try {
        Database.update('recordatorios', id, datos);
      } catch (error) {
        console.error('Recordatorios.Notificador: no se pudo actualizar el recordatorio', error);
      }
    },

    formatearDiferencia(fecha) {
      const ahora = Date.now();
      const diff = fecha.getTime() - ahora;
      const abs = Math.abs(diff);
      const minutos = Math.round(abs / 60000);
      const horas = Math.floor(minutos / 60);
      if (diff < -60000) {
        if (horas >= 1) {
          return `Atrasado ${horas}h ${minutos % 60}m`;
        }
        return `Atrasado ${Math.max(minutos, 1)}m`;
      }
      if (abs <= 60000) {
        return 'Es ahora';
      }
      if (horas >= 1) {
        return `En ${horas}h ${minutos % 60}m`;
      }
      return `En ${Math.max(minutos, 1)}m`;
    },

    obtenerEtiquetaPrioridad(prioridad) {
      const labels = {
        urgente: 'Urgente',
        alta: 'Alta',
        media: 'Media',
        baja: 'Baja',
      };
      return labels[prioridad] || 'Media';
    },

    formatoFechaInput(date) {
      return date.toISOString().slice(0, 10);
    },

    formatoHoraInput(date) {
      return date.toISOString().slice(11, 16);
    },

    sanitizar(texto) {
      if (!texto) return '';
      if (window.Utils && typeof Utils.sanitize === 'function') {
        return Utils.sanitize(texto);
      }
      const div = document.createElement('div');
      div.textContent = texto;
      return div.innerHTML;
    },
  },
};

(function initRecordatoriosNotificador() {
  if (
    !window.Recordatorios ||
    !Recordatorios.Notificador ||
    typeof Recordatorios.Notificador.init !== 'function'
  ) {
    return;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Recordatorios.Notificador.init(), {
      once: true,
    });
  } else {
    Recordatorios.Notificador.init();
  }
})();
