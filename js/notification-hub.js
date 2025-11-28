// ============================================
// MÓDULO: Notification Hub Frontend (UI Minimalista)
// ============================================
// Centro de notificaciones inteligentes con IA

window.NotificationHub = {
  // Estado
  eventos: [],
  preferencias: null,
  stats: null,
  updateInterval: null,
  errorInfo: null,
  warnings: [],
  notifiedErrors: new Set(),

  /**
   * Inicializar módulo
   */
  async init() {
    console.log('🔔 Inicializando Notification Hub...');
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.errorInfo = null;
    this.warnings = [];
    this.notifiedErrors = new Set();

    await this.cargarPreferencias();
    await this.cargarDashboard();

    // Actualizar cada 30 segundos
    this.updateInterval = setInterval(() => {
      this.cargarDashboard();
    }, 30000);

    console.log('✅ Notification Hub inicializado');
  },

  /**
   * Renderizar vista principal
   */
  render(container) {
    const html = `
      <div class="notification-hub-container">
        <!-- Header con Stats -->
        <div class="notif-header">
          <div class="notif-header-left">
            <h2>
              <i class="fas fa-bell"></i>
              Centro de Notificaciones
              <span class="badge-ia">✨ IA</span>
            </h2>
            <p class="subtitle">Gestión inteligente con Deepseek + Gemini</p>
          </div>
          <div class="notif-header-right">
            <button class="btn-icon" onclick="NotificationHub.abrirPreferencias()" title="Configurar">
              <i class="fas fa-cog"></i>
            </button>
            <button class="btn-icon" onclick="NotificationHub.cargarDashboard()" title="Actualizar">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>

        ${this.renderErrorBanner()}
        ${this.renderWarningBanner()}

        <!-- Stats Cards -->
        <div id="notif-stats-cards" class="stats-cards-grid">
          ${this.renderStatsCards()}
        </div>

        <!-- Filtros rápidos -->
        <div class="notif-filters">
          <div class="filter-group">
            <label>Tipo:</label>
            <select id="filtro-tipo" onchange="NotificationHub.aplicarFiltros()">
              <option value="">Todos</option>
              <option value="stock_bajo">Stock Bajo</option>
              <option value="producto_vencer">Productos por Vencer</option>
              <option value="orden_trabajo">Órdenes de Trabajo</option>
              <option value="tarea">Tareas</option>
              <option value="recordatorio">Recordatorios</option>
              <option value="cita">Citas</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Estado:</label>
            <select id="filtro-estado" onchange="NotificationHub.aplicarFiltros()">
              <option value="">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="enviado">Enviados</option>
              <option value="agrupado">Agrupados</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Prioridad:</label>
            <select id="filtro-prioridad" onchange="NotificationHub.aplicarFiltros()">
              <option value="">Todas</option>
              <option value="alta">Alta (8-10)</option>
              <option value="media">Media (5-7)</option>
              <option value="baja">Baja (0-4)</option>
            </select>
          </div>
        </div>

        <!-- Timeline de eventos -->
        <div class="notif-timeline-container">
          <div id="notif-timeline" class="notif-timeline">
            ${this.renderTimeline()}
          </div>
        </div>

        <!-- Panel lateral: Próximas notificaciones programadas -->
        <div class="notif-sidebar" id="notif-sidebar">
          <h3><i class="fas fa-calendar-alt"></i> Programadas</h3>
          <div id="notif-programadas">
            ${this.renderProgramadas()}
          </div>
        </div>
      </div>
    `;

    // Insertar en contenedor si se proporciona
    if (container) {
      container.innerHTML = html;
    }

    return html;
  },

  /**
   * Renderizar tarjetas de estadísticas
   */
  renderStatsCards() {
    if (!this.stats) {
      if (this.errorInfo) {
        return `
          <div class="notif-empty-stats">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${this.errorInfo.message}</p>
          </div>
        `;
      }
      return '<div class="loading-stats">Cargando estadísticas...</div>';
    }

    const { eventos, logs, cola_pendiente, ia_habilitada } = this.stats;
    const iaEstado = ia_habilitada ? 'Activa' : 'Modo básico';

    return `
      <div class="stat-card stat-primary">
        <div class="stat-icon"><i class="fas fa-inbox"></i></div>
        <div class="stat-content">
          <div class="stat-value">${eventos.pendientes || 0}</div>
          <div class="stat-label">Pendientes</div>
        </div>
      </div>

      <div class="stat-card stat-success">
        <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
        <div class="stat-content">
          <div class="stat-value">${logs.exitosos || 0}</div>
          <div class="stat-label">Enviados</div>
        </div>
      </div>

      <div class="stat-card stat-info">
        <div class="stat-icon"><i class="fas fa-robot"></i></div>
        <div class="stat-content">
          <div class="stat-value">${eventos.score_promedio?.toFixed(1) || '0.0'}</div>
          <div class="stat-label">Score Promedio (IA ${iaEstado})</div>
        </div>
      </div>

      <div class="stat-card stat-warning">
        <div class="stat-icon"><i class="fas fa-clock"></i></div>
        <div class="stat-content">
          <div class="stat-value">${cola_pendiente || 0}</div>
          <div class="stat-label">En Cola</div>
        </div>
      </div>
    `;
  },

  renderErrorBanner() {
    if (!this.errorInfo) {
      return '';
    }

    const suggestion = this.errorInfo.suggestion
      ? `<div class="notif-banner-suggestion">${this.errorInfo.suggestion}</div>`
      : '';

    return `
      <div class="notif-banner notif-banner-error">
        <div class="notif-banner-icon"><i class="fas fa-exclamation-circle"></i></div>
        <div class="notif-banner-content">
          <strong>${this.errorInfo.message}</strong>
          ${suggestion}
        </div>
      </div>
    `;
  },

  renderWarningBanner() {
    if (!this.warnings || this.warnings.length === 0) {
      return '';
    }

    const items = this.warnings.map((warning) => `<li>${warning}</li>`).join('');

    return `
      <div class="notif-banner notif-banner-warning">
        <div class="notif-banner-icon"><i class="fas fa-info-circle"></i></div>
        <div class="notif-banner-content">
          <strong>Revisiones recomendadas</strong>
          <ul>${items}</ul>
        </div>
      </div>
    `;
  },

  /**
   * Renderizar timeline de eventos
   */
  renderTimeline() {
    if (!this.eventos || this.eventos.length === 0) {
      return `
        <div class="empty-timeline">
          <i class="fas fa-bell-slash"></i>
          <h3>Sin notificaciones</h3>
          <p>No hay eventos registrados en este momento.</p>
        </div>
      `;
    }

    return this.eventos.map((evento) => this.renderEventoCard(evento)).join('');
  },

  /**
   * Renderizar tarjeta de evento individual
   */
  renderEventoCard(evento) {
    const prioridad = evento.score_final >= 8 ? 'alta' : evento.score_final >= 5 ? 'media' : 'baja';
    const iconoTipo = this.getIconoTipo(evento.tipo_evento);
    const emoji = this.getEmojiPrioridad(prioridad);

    const fecha = new Date(evento.created_at);
    const fechaStr = fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
      <div class="evento-card card-prioridad-${prioridad}" data-id="${evento.id}">
        <div class="evento-header">
          <div class="evento-tipo">
            <i class="${iconoTipo}"></i>
            <span>${this.formatTipoEvento(evento.tipo_evento)}</span>
          </div>
          <div class="evento-score" title="Score de urgencia e impacto">
            ${emoji} ${evento.score_final.toFixed(1)}
          </div>
        </div>

        <div class="evento-body">
          <h4 class="evento-titulo">${evento.titulo}</h4>
          <p class="evento-mensaje">${evento.mensaje}</p>
          
          ${
            evento.razon_ia
              ? `
            <div class="evento-ia-insight">
              <i class="fas fa-robot"></i>
              <span>${evento.razon_ia}</span>
            </div>
          `
              : ''
          }

          ${
            evento.mensaje_enriquecido
              ? `
            <div class="evento-mensaje-ia">
              <strong>✨ Mensaje IA:</strong>
              <p>${evento.mensaje_enriquecido}</p>
            </div>
          `
              : ''
          }
        </div>

        <div class="evento-footer">
          <div class="evento-meta">
            <span class="meta-item">
              <i class="fas fa-clock"></i>
              ${fechaStr}
            </span>
            <span class="meta-item">
              <i class="fas fa-cube"></i>
              ${evento.modulo_origen}
            </span>
          </div>
          <div class="evento-estado">
            ${this.renderEstadoBadge(evento.estado)}
          </div>
        </div>

        <div class="evento-actions">
          <button class="btn-action btn-sm" onclick="NotificationHub.verDetalle('${evento.id}')">
            <i class="fas fa-eye"></i> Ver
          </button>
          ${
            evento.estado === 'pendiente'
              ? `
            <button class="btn-action btn-sm btn-success" onclick="NotificationHub.enviarAhora('${evento.id}')">
              <i class="fas fa-paper-plane"></i> Enviar
            </button>
            <button class="btn-action btn-sm btn-danger" onclick="NotificationHub.cancelar('${evento.id}')">
              <i class="fas fa-times"></i> Cancelar
            </button>
          `
              : ''
          }
        </div>
      </div>
    `;
  },

  /**
   * Renderizar eventos programados (sidebar)
   */
  renderProgramadas() {
    const programados = this.eventos.filter((e) => e.programado_para && e.estado === 'pendiente');

    if (programados.length === 0) {
      return '<p class="empty-sidebar">Sin notificaciones programadas</p>';
    }

    return programados
      .map(
        (e) => `
      <div class="programada-item">
        <div class="programada-fecha">
          ${new Date(e.programado_para).toLocaleString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
        <div class="programada-titulo">${e.titulo}</div>
      </div>
    `
      )
      .join('');
  },

  /**
   * Renderizar badge de estado
   */
  renderEstadoBadge(estado) {
    const badges = {
      pendiente: '<span class="badge badge-warning">Pendiente</span>',
      enviado: '<span class="badge badge-success">Enviado</span>',
      agrupado: '<span class="badge badge-info">Agrupado</span>',
      cancelado: '<span class="badge badge-secondary">Cancelado</span>',
      expirado: '<span class="badge badge-danger">Expirado</span>',
    };
    return badges[estado] || `<span class="badge">${estado}</span>`;
  },

  /**
   * Obtener icono según tipo de evento
   */
  getIconoTipo(tipo) {
    const iconos = {
      stock_bajo: 'fas fa-box-open',
      producto_vencer: 'fas fa-exclamation-triangle',
      orden_trabajo: 'fas fa-wrench',
      tarea: 'fas fa-tasks',
      recordatorio: 'fas fa-bell',
      cita: 'fas fa-calendar-check',
      venta: 'fas fa-shopping-cart',
      compra: 'fas fa-truck',
      resumen_diario: 'fas fa-chart-line',
    };
    return iconos[tipo] || 'fas fa-info-circle';
  },

  /**
   * Obtener emoji según prioridad
   */
  getEmojiPrioridad(prioridad) {
    return prioridad === 'alta' ? '🔥' : prioridad === 'media' ? '⚡' : '📌';
  },

  /**
   * Formatear tipo de evento
   */
  formatTipoEvento(tipo) {
    const nombres = {
      stock_bajo: 'Stock Bajo',
      producto_vencer: 'Producto por Vencer',
      orden_trabajo: 'Orden de Trabajo',
      tarea: 'Tarea',
      recordatorio: 'Recordatorio',
      cita: 'Cita',
      venta: 'Venta',
      compra: 'Compra',
      resumen_diario: 'Resumen Diario',
    };
    return nombres[tipo] || tipo.replace(/_/g, ' ').toUpperCase();
  },

  /**
   * Cargar dashboard desde API
   */
  async cargarDashboard() {
    try {
      const [dashboardRes, statsRes] = await Promise.allSettled([
        DatabaseAPI.request('/notifications/dashboard'),
        DatabaseAPI.request('/notifications/stats'),
      ]);

      let hadError = false;

      if (dashboardRes.status === 'fulfilled') {
        const payload = dashboardRes.value;
        if (payload?.success) {
          this.eventos = payload.data?.recientes || [];
        } else {
          hadError = true;
          this.eventos = [];
          this.handleApiError(
            'dashboard',
            payload?.error || new Error('Respuesta de dashboard inválida'),
            {
              status: payload?.status || null,
            }
          );
        }
      } else {
        hadError = true;
        this.eventos = [];
        this.handleApiError('dashboard', dashboardRes.reason, {
          status: dashboardRes.reason?.status,
        });
      }

      if (statsRes.status === 'fulfilled') {
        const payload = statsRes.value;
        if (payload?.success) {
          this.stats = payload.data || null;
          this.warnings = Array.isArray(payload.data?.warnings) ? payload.data.warnings : [];
          if (!hadError) {
            this.errorInfo = null;
          }
        } else {
          hadError = true;
          this.warnings = [];
          this.handleApiError(
            'stats',
            payload?.error || new Error('Respuesta de estadísticas inválida'),
            {
              status: payload?.status || null,
            }
          );
          this.stats = this.buildFallbackStats(this.errorInfo);
        }
      } else {
        hadError = true;
        this.warnings = [];
        this.handleApiError('stats', statsRes.reason, {
          status: statsRes.reason?.status,
        });
        this.stats = this.buildFallbackStats(this.errorInfo);
      }

      if (!hadError && !this.errorInfo) {
        this.stats = this.stats || this.buildFallbackStats();
      }

      this.actualizarVista();
    } catch (error) {
      this.handleApiError('dashboard', error);
      this.stats = this.buildFallbackStats(this.errorInfo);
      this.eventos = [];
      this.warnings = [];
      this.actualizarVista();
    }
  },

  /**
   * Cargar preferencias del usuario
   */
  async cargarPreferencias() {
    try {
      const response = await DatabaseAPI.request('/notifications/preferences');
      if (response.success) {
        this.preferencias = response.data;
      }
    } catch (error) {
      console.error('Error cargando preferencias:', error);
    }
  },

  /**
   * Actualizar vista
   */
  actualizarVista() {
    const statsContainer = document.getElementById('notif-stats-cards');
    const timelineContainer = document.getElementById('notif-timeline');
    const programadasContainer = document.getElementById('notif-programadas');

    if (statsContainer) {
      statsContainer.innerHTML = this.renderStatsCards();
    }

    if (timelineContainer) {
      timelineContainer.innerHTML = this.renderTimeline();
    }

    if (programadasContainer) {
      programadasContainer.innerHTML = this.renderProgramadas();
    }
  },

  /**
   * Aplicar filtros
   */
  aplicarFiltros() {
    const tipo = document.getElementById('filtro-tipo')?.value;
    const estado = document.getElementById('filtro-estado')?.value;
    const prioridad = document.getElementById('filtro-prioridad')?.value;

    // Recargar con filtros
    this.cargarDashboard(); // TODO: implementar filtros en API
  },

  buildFallbackStats(errorInfo = null) {
    const base = {
      eventos: {
        total: 0,
        pendientes: 0,
        enviados: 0,
        score_promedio: 0,
      },
      logs: {
        total: 0,
        exitosos: 0,
        fallidos: 0,
        tiempo_promedio: 0,
      },
      cola_pendiente: 0,
      ia_habilitada: false,
      ia_stats: null,
      health: {
        migrations: {
          ok: !errorInfo || errorInfo.code !== 'stats-404',
          missingTables: [],
          hint: null,
        },
        ia: {
          enabled: false,
          deepseekConfigured: false,
          geminiConfigured: false,
          lastError: errorInfo?.message || null,
        },
        queue: {
          pending: 0,
          processing: false,
          lastRun: null,
        },
      },
    };

    if (errorInfo?.status === 404) {
      base.health.migrations.ok = false;
      base.health.migrations.missingTables = [
        'notificacion_eventos',
        'notificacion_logs',
        'usuarios_notificacion_preferencias',
      ];
      base.health.migrations.hint =
        'Ejecuta la migración 003_notificaciones_inteligentes.sql o el script install-notifications.js.';
    }

    if (errorInfo?.status === 503) {
      base.health.ia.lastError = 'NotificationHub deshabilitado en el servidor.';
    }

    return base;
  },

  handleApiError(context, error, extras = {}) {
    const normalized = this.normalizeError(context, error, extras);
    this.errorInfo = normalized;
    this.notifyError(normalized);
  },

  normalizeError(context, error, extras = {}) {
    const status =
      typeof extras.status === 'number'
        ? extras.status
        : typeof error === 'object' && error !== null && typeof error.status === 'number'
          ? error.status
          : null;

    const networkFailure = status === null || status === 0;
    const rawMessage =
      error && error.message ? error.message : String(error || 'Error desconocido');

    let message = rawMessage;
    let suggestion = '';

    if (networkFailure) {
      message = 'No se pudo conectar con el servicio de notificaciones.';
      suggestion =
        'Verifica que el backend esté ejecutándose en http://localhost:3001 y que no existan bloqueos de red.';
    } else if (status === 404) {
      message = 'La API de notificaciones no está disponible.';
      suggestion =
        'Ejecuta la migración 003_notificaciones_inteligentes.sql o ejecuta backend/scripts/install-notifications.js y reinicia el servidor.';
    } else if (status === 503) {
      message = 'NotificationHub está deshabilitado o en mantenimiento.';
      suggestion =
        'Revisa la variable NOTIFICATION_HUB_DISABLED en el backend o inicializa nuevamente el servicio.';
    } else if (status === 401) {
      message = 'Sesión expirada para el módulo de notificaciones.';
      suggestion = 'Inicia sesión nuevamente para continuar.';
    } else if (status === 500) {
      message = 'El servidor de notificaciones devolvió un error interno.';
      suggestion =
        'Revisa los logs del backend para más detalles. Es posible que falten credenciales de IA o migraciones.';
    }

    return {
      code: `${context}-${status ?? 'network'}`,
      context,
      status,
      message,
      suggestion,
      timestamp: new Date().toISOString(),
      raw: error,
    };
  },

  notifyError(errorInfo) {
    if (!errorInfo) {
      return;
    }

    if (
      !this.notifiedErrors.has(errorInfo.code) &&
      typeof Utils !== 'undefined' &&
      typeof Utils.showToast === 'function'
    ) {
      // Mostrar mensaje con sugerencia si existe
      const fullMessage = errorInfo.suggestion
        ? `${errorInfo.message} ${errorInfo.suggestion}`
        : errorInfo.message;

      // Usar el nuevo sistema de toast con acción si corresponde
      const options = {
        duration: 10000, // Más tiempo para errores importantes
      };

      // Si es un error 404 o de configuración, ofrecer ir a configuración
      if (errorInfo.status === 404 || errorInfo.status === 503) {
        options.actionUrl = '#configuracion-avanzada';
        options.actionLabel = 'Ir a Configuración';
      }

      Utils.showToast(fullMessage, 'error', options);
      this.notifiedErrors.add(errorInfo.code);
    }
  },

  /**
   * Ver detalle de evento
   */
  async verDetalle(eventoId) {
    const evento = this.eventos.find((e) => e.id === eventoId);
    if (!evento) return;

    const modal = `
      <div class="modal-overlay" onclick="this.remove()">
        <div class="modal-content modal-lg" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>Detalle del Evento</h3>
            <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body">
            <div class="detalle-grid">
              <div class="detalle-item">
                <label>Tipo:</label>
                <span>${this.formatTipoEvento(evento.tipo_evento)}</span>
              </div>
              <div class="detalle-item">
                <label>Estado:</label>
                ${this.renderEstadoBadge(evento.estado)}
              </div>
              <div class="detalle-item">
                <label>Score Urgencia:</label>
                <span>${evento.score_urgencia.toFixed(1)}/10</span>
              </div>
              <div class="detalle-item">
                <label>Score Impacto:</label>
                <span>${evento.score_impacto.toFixed(1)}/10</span>
              </div>
              <div class="detalle-item full-width">
                <label>Contexto:</label>
                <pre>${JSON.stringify(evento.contexto, null, 2)}</pre>
              </div>
              ${
                evento.razon_ia
                  ? `
                <div class="detalle-item full-width">
                  <label>Análisis IA:</label>
                  <p>${evento.razon_ia}</p>
                </div>
              `
                  : ''
              }
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
  },

  /**
   * Enviar notificación ahora
   */
  async enviarAhora(eventoId) {
    if (!confirm('¿Enviar esta notificación inmediatamente?')) return;

    try {
      await DatabaseAPI.request('/notifications/process-queue', {
        method: 'POST',
      });

      Utils.showToast('Procesando notificación...', 'success');
      setTimeout(() => this.cargarDashboard(), 2000);
    } catch (error) {
      console.error('Error enviando notificación:', error);
      Utils.showToast('Error al enviar notificación', 'error');
    }
  },

  /**
   * Cancelar evento
   */
  async cancelar(eventoId) {
    if (!confirm('¿Cancelar esta notificación?')) return;

    // TODO: implementar endpoint de cancelación
    Utils.showToast('Funcionalidad en desarrollo', 'info');
  },

  /**
   * Abrir panel de preferencias
   */
  abrirPreferencias() {
    // Redirigir a configuración avanzada
    if (window.ConfiguracionAvanzada && typeof ConfiguracionAvanzada.cambiarTab === 'function') {
      if (typeof ConfiguracionAvanzada.init === 'function') {
        ConfiguracionAvanzada.init();
      }
      ConfiguracionAvanzada.cambiarTab('notificaciones');
    } else {
      Utils.showToast('Abre Configuración Avanzada para gestionar preferencias', 'info');
    }
  },

  /**
   * Destruir módulo
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  },
};

// Auto-inicializar si se carga como módulo standalone
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#notificaciones') {
      NotificationHub.init();
    }
  });
}
