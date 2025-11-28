const Compras = {
  csrfToken: null,
  csrfPromise: null,
  ultimaFacturaProcesada: null,
  facturaNotificacionElement: null,
  procesandoFacturaSegundoPlano: false,
  facturaProgressInterval: null,
  facturaProgressValue: 0,
  facturaPendienteActualId: null, // ID de la factura pendiente que se está revisando

  // === Sistema de Cola de Facturas IA ===
  iaFacturasQueue: [], // Cola de PDFs pendientes de procesar
  iaFacturasResults: [], // Resultados procesados pendientes de aprobar
  iaProcessingIndex: -1, // Índice actual en procesamiento (-1 = ninguno)
  iaIsProcessing: false, // Flag de procesamiento activo
  iaPanelVisible: false, // Visibilidad del panel flotante

  async getCsrfToken() {
    if (this.csrfToken) {
      return this.csrfToken;
    }
    if (!this.csrfPromise) {
      this.csrfPromise = fetch('/api/csrf-token')
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Error obteniendo CSRF token: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (!data.csrfToken) {
            throw new Error('No se pudo obtener el token CSRF.');
          }
          this.csrfToken = data.csrfToken;
          console.log('🔒 Token CSRF obtenido exitosamente');
          return this.csrfToken;
        })
        .catch((err) => {
          console.error('[Compras] Error obteniendo token CSRF:', err);
          this.csrfPromise = null; // Reset promise on error
          this.csrfToken = null;
          throw err;
        });
    }
    return this.csrfPromise;
  },

  state: {
    compras: [],
    filtros: {
      busqueda: '',
      estadoPago: 'todos',
      fechaInicio: '',
      fechaFin: '',
    },
    indicadores: {
      totalMes: 0,
      totalPendiente: 0,
    },
    seleccionActual: null,
    editorModo: 'crear',
    editorDirty: false,
    editorData: null,
    historial: {
      items: [],
      cargando: false,
      error: null,
      filtros: {
        busqueda: '',
        tipoMovimiento: 'todos',
        fechaInicio: '',
        fechaFin: '',
        fuentes: 'historial,ventas',
      },
      resumen: {
        totalMovimientos: 0,
        totalUnidades: 0,
        totalValor: 0,
      },
      paginacion: {
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 1,
      },
      insights: {
        lowStock: [],
        overStock: [],
        anomalies: [],
        periodoAnalizado: 60,
        updatedAt: null,
      },
    },
  },
  dom: {
    root: null,
    tablaBody: null,
    totalBadge: null,
    filtros: {},
    editorHeader: null,
    editorMode: null,
    editorBody: null,
    footerStatus: null,
    footerGuardar: null,
    footerBorrador: null,
    indicadorTotalMes: null,
    indicadorPendiente: null,
    historial: {
      root: null,
      tablaBody: null,
      filtros: {},
      resumen: {
        movimientos: null,
        unidades: null,
        valor: null,
      },
      refreshBtn: null,
      insightsContainer: null,
      pagination: {
        container: null,
        info: null,
        prev: null,
        next: null,
        pageSize: null,
      },
    },
  },
  stylesInjected: false,

  injectStyles() {
    if (this.stylesInjected) return;
    const style = document.createElement('style');
    style.textContent = `
      .compras-table th { font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; color: var(--text-tertiary, #5f7d8c); }
      .compras-table tbody tr { transition: background 0.15s ease; }
      .compras-table tbody tr:hover { background: rgba(33,150,243,0.08); cursor: pointer; }
      .compras-table tbody tr.seleccion { background: rgba(33,150,243,0.15); border-left: 3px solid #2196f3; }
      .compras-acciones { display: flex; gap: 0.35rem; align-items: center; justify-content: center; }
      .btn-icon-mini { background: transparent; border: none; color: var(--text-secondary, #6b7280); cursor: pointer; padding: 0.35rem; border-radius: 6px; transition: all 0.2s ease; font-size: 0.9rem; display: inline-flex; align-items: center; justify-content: center; }
      .btn-icon-mini:hover:not(:disabled) { background: rgba(33,150,243,0.1); color: #2196f3; transform: scale(1.1); }
      .btn-icon-mini:disabled { opacity: 0.4; cursor: not-allowed; }
      .btn-icon-mini.btn-danger:hover:not(:disabled) { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
      .text-right { text-align: right !important; }
      .text-muted { color: var(--text-tertiary, #9ca3af) !important; }
      .text-primary { color: var(--primary-color, #2196f3) !important; }
      .compras-table tbody tr.seleccion { background: rgba(33,150,243,0.18); }
      .badge-estado { display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 999px; padding: 0.25rem 0.65rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
      .badge-estado[data-estado="pagado"] { background: rgba(76, 175, 80, 0.15); color: #1b5e20; }
      .badge-estado[data-estado="pendiente"] { background: rgba(255, 152, 0, 0.18); color: #e65100; }
      .badge-estado[data-estado="parcial"] { background: rgba(33, 150, 243, 0.15); color: #0d47a1; }
      .compras-editor-header { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
      .compras-editor-header h3 { margin: 0; font-size: 1.2rem; color: var(--primary-color, #0f4558); }
      .compras-editor-mode { display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(15, 69, 88, 0.08); border-radius: 999px; padding: 0.35rem 0.75rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary, #5f7d8c); }
      .compras-editor-body { display: flex; flex-direction: column; gap: 1rem; }
      .compras-editor-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
      .compras-editor-grid label.full { grid-column: 1 / -1; }
      .compras-editor-section { display: flex; flex-direction: column; gap: 0.6rem; }
      .compras-editor-section h4 { margin: 0; font-size: 1rem; color: var(--primary-color, #0f4558); }
      .compras-items-wrapper { border: 1px solid rgba(15, 69, 88, 0.08); border-radius: 12px; overflow: auto; max-height: 320px; }
      .compras-items-table table { width: 100%; border-collapse: collapse; min-width: 720px; }
      .compras-items-table thead { background: rgba(248, 250, 252, 0.95); position: sticky; top: 0; z-index: 1; }
      .compras-items-table th, .compras-items-table td { padding: 0.5rem 0.65rem; border-bottom: 1px solid rgba(15, 69, 88, 0.08); font-size: 0.85rem; }
      .compras-items-table input[type="text"], .compras-items-table input[type="number"] { width: 100%; box-sizing: border-box; padding: 0.35rem 0.45rem; border-radius: 6px; border: 1px solid rgba(15, 69, 88, 0.18); font-size: 0.85rem; }
      .compras-items-table input[type="number"] { text-align: right; }
      .compras-items-table tbody tr:hover { background: rgba(33, 150, 243, 0.06); }
      .compras-items-table .text-right { text-align: right; }
      .compras-items-table .text-center { text-align: center; }
      .compras-items-table .btn-icon { background: none; border: none; color: #c62828; cursor: pointer; padding: 0.25rem; border-radius: 6px; }
      .compras-items-table .btn-icon:hover { background: rgba(198, 40, 40, 0.1); }
      .compras-footer { position: sticky; bottom: 0; display: flex; justify-content: space-between; align-items: center; gap: 1rem; background: linear-gradient(180deg, rgba(248,250,252,0.45), rgba(248,250,252,0.9)); backdrop-filter: blur(12px); padding: 0.9rem 1.1rem; border-radius: 16px; border: 1px solid rgba(15, 69, 88, 0.12); box-shadow: 0 16px 35px rgba(15, 69, 88, 0.12); }
      .compras-footer-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
      .compras-footer-status { font-size: 0.85rem; color: var(--text-secondary, #476272); }
      .factura-ai-notification { position: fixed; bottom: 1.75rem; right: 1.75rem; display: flex; align-items: center; gap: 0.5rem; background: var(--primary-color, #2196f3); color: #fff; border: none; border-radius: 999px; padding: 0.75rem 1.25rem; box-shadow: 0 14px 28px rgba(33,150,243,0.35); font-weight: 600; cursor: pointer; z-index: 1040; opacity: 0; transform: translateY(12px); transition: opacity 0.2s ease, transform 0.2s ease; }
      .factura-ai-notification.visible { opacity: 1; transform: translateY(0); }
      .factura-ai-notification i { font-size: 1.1rem; }
      .factura-ai-notification:focus { outline: none; box-shadow: 0 0 0 3px rgba(33,150,243,0.35); }
      .compras-historial-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
      .compras-historial-header h3 { margin: 0; font-size: 1.2rem; color: var(--primary-color, #0f4558); }
      .compras-historial-header p { margin: 0; color: var(--text-tertiary, #5f7d8c); font-size: 0.85rem; }
      .compras-historial-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
      .compras-historial-actions .btn { white-space: nowrap; }
      .compras-historial-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; }
      .compras-historial-card { background: rgba(15, 69, 88, 0.04); border: 1px solid rgba(15, 69, 88, 0.08); border-radius: 14px; padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.35rem; }
      .compras-historial-card span { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary, #607d8b); }
      .compras-historial-card strong { font-size: 1.25rem; color: var(--primary-color, #0f4558); }
      .compras-historial-filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; }
      .compras-historial-filters label { font-size: 0.72rem; text-transform: uppercase; font-weight: 600; color: var(--text-tertiary, #5f7d8c); letter-spacing: 0.05em; }
      .compras-historial-filters input,
      .compras-historial-filters select { width: 100%; padding: 0.45rem 0.6rem; border-radius: 8px; border: 1px solid rgba(15, 69, 88, 0.18); font-size: 0.86rem; }
      .historial-ai { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; margin-top: 0.5rem; }
      .historial-ai-card { border: 1px solid rgba(15, 69, 88, 0.08); border-radius: 12px; padding: 0.85rem 1rem; background: rgba(15, 69, 88, 0.03); display: flex; flex-direction: column; gap: 0.5rem; }
      .historial-ai-card h4 { margin: 0; font-size: 0.95rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
      .historial-ai-card h4 span { font-size: 0.75rem; border-radius: 999px; padding: 0.05rem 0.5rem; background: rgba(15, 69, 88, 0.15); color: var(--primary-color, #0f4558); }
      .historial-ai-card ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
      .historial-ai-card li { display: flex; flex-direction: column; font-size: 0.85rem; }
      .historial-ai-card li small { color: var(--text-tertiary, #6b7280); font-size: 0.75rem; }
      .historial-ai-card.danger { border-color: rgba(239, 68, 68, 0.25); background: rgba(239, 68, 68, 0.05); }
      .historial-ai-card.warning { border-color: rgba(245, 158, 11, 0.35); background: rgba(245, 158, 11, 0.08); }
      .historial-ai-card.info { border-color: rgba(59, 130, 246, 0.25); background: rgba(59, 130, 246, 0.08); }
      .historial-ai-placeholder { border: 1px dashed rgba(15, 69, 88, 0.2); border-radius: 12px; padding: 1rem; text-align: center; color: var(--text-tertiary, #94a3b8); font-size: 0.85rem; }
      .historial-ai-meta { display: block; font-size: 0.75rem; color: var(--text-tertiary, #94a3b8); margin-top: 0.4rem; }
      .historial-pagination { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.75rem; margin-top: 0.85rem; }
      .historial-pagination-info { font-size: 0.85rem; color: var(--text-tertiary, #5f7d8c); }
      .historial-pagination-controls { display: flex; align-items: center; gap: 0.4rem; }
      .historial-pagination select { padding: 0.35rem 0.5rem; border-radius: 8px; border: 1px solid rgba(15, 69, 88, 0.18); font-size: 0.85rem; }
      .compras-historial-table-wrapper { overflow: auto; border-radius: 12px; border: 1px solid rgba(15, 69, 88, 0.08); }
      .compras-historial-table { width: 100%; border-collapse: collapse; min-width: 720px; }
      .compras-historial-table th,
      .compras-historial-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid rgba(15, 69, 88, 0.08); font-size: 0.85rem; text-align: left; }
      .compras-historial-table th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary, #5f7d8c); }
      .compras-historial-table td .historial-producto { display: flex; flex-direction: column; gap: 0.2rem; }
      .compras-historial-table td .historial-producto small { color: var(--text-tertiary, #90a4ae); font-size: 0.75rem; }
      .badge-movimiento { display: inline-flex; align-items: center; gap: 0.25rem; border-radius: 999px; padding: 0.15rem 0.65rem; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
      .badge-movimiento[data-tipo="compra"],
      .badge-movimiento[data-tipo="ajuste_entrada"] { background: rgba(76, 175, 80, 0.15); color: #1b5e20; }
      .badge-movimiento[data-tipo="venta"],
      .badge-movimiento[data-tipo="ajuste_salida"] { background: rgba(239, 68, 68, 0.15); color: #b71c1c; }
      .badge-movimiento[data-tipo="transferencia"] { background: rgba(33, 150, 243, 0.15); color: #0d47a1; }
      .compras-historial-table td .stock-delta { font-size: 0.8rem; color: var(--text-tertiary, #78909c); }
      .compras-historial-empty { padding: 1rem; text-align: center; color: var(--text-tertiary, #9ca3af); }
      .compras-editor-overlay { position: fixed; inset: 0; background: rgba(15, 69, 88, 0.35); backdrop-filter: blur(4px); z-index: 9999; display: none; opacity: 0; transition: opacity 0.3s ease; }
      .compras-editor-overlay.active { display: flex; align-items: center; justify-content: center; opacity: 1; }
      .compras-editor-container { background: var(--card-bg, #fff); border-radius: 20px; box-shadow: 0 20px 60px rgba(15, 69, 88, 0.2); max-width: 95vw; width: 1200px; max-height: 90vh; display: flex; flex-direction: column; animation: slideInUp 0.3s ease-out; }
      @keyframes slideInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      .compras-editor-container .compras-editor-header { padding: 1.5rem; border-bottom: 1px solid rgba(15, 69, 88, 0.08); display: flex; justify-content: space-between; align-items: center; }
      .compras-editor-container .compras-editor-header h3 { margin: 0; font-size: 1.4rem; color: var(--primary-color, #0f4558); }
      .compras-editor-container .compras-editor-close { background: rgba(239, 68, 68, 0.1); color: #dc2626; border: none; border-radius: 10px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s ease; }
      .compras-editor-container .compras-editor-close:hover { background: rgba(239, 68, 68, 0.2); }
      .compras-editor-container .compras-editor-body { padding: 1.5rem; overflow-y: auto; flex: 1; }
      .compras-editor-container .compras-editor-footer { padding: 1.25rem 1.5rem; border-top: 1px solid rgba(15, 69, 88, 0.08); display: flex; justify-content: space-between; align-items: center; gap: 1rem; background: rgba(248, 250, 252, 0.5); }
      .compras-editor-container .compras-editor-footer-status { font-size: 0.85rem; color: var(--text-secondary, #6b7280); }
      .compras-editor-container .compras-editor-footer-actions { display: flex; gap: 0.75rem; }
      @media (max-width: 1080px) {
        .compras-grid { grid-template-columns: 1fr; }
        .compras-table-wrapper { max-height: 320px; }
        .compras-editor-container { max-width: 98vw; max-height: 95vh; border-radius: 12px; }
      }
      @media (max-width: 640px) {
        .compras-header { flex-direction: column; align-items: stretch; }
        .compras-footer { flex-direction: column; align-items: stretch; }
        .compras-footer-actions { justify-content: flex-end; }
        .factura-ai-notification { right: 1rem; left: 1rem; justify-content: center; }
      }
      @media (prefers-color-scheme: dark) {
        .compras-panel { 
          background-color: var(--bg-secondary); 
          color: var(--text-primary);
          box-shadow: 0 12px 30px rgba(0,0,0, 0.2); 
        }
        .compras-module h2, .compras-editor-section h4, .compras-editor-header h3 {
          color: var(--text-primary);
        }
        .compras-summary { 
          background: rgba(129, 140, 248, 0.1); 
          border-color: rgba(129, 140, 248, 0.2); 
        }
        .compras-summary strong { color: var(--primary-light, #a7b0ff); }
        .compras-list-filters input, .compras-list-filters select, .compras-editor-body input, .compras-editor-body select, .compras-editor-body textarea {
            background-color: var(--input-bg);
            color: var(--text-primary);
            border-color: var(--border-color-light);
        }
        .badge-estado[data-estado="pagado"] { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
        .badge-estado[data-estado="pendiente"] { background: rgba(251, 146, 60, 0.15); color: #fb923c; }
        .badge-estado[data-estado="parcial"] { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }
        .compras-editor-mode { 
          background: var(--bg-tertiary, #2d3748); 
          color: var(--text-secondary, #a0aec0); 
        }
        .compras-items-table .btn-icon { color: var(--error-light, #f87171); }
        .compras-items-table .btn-icon:hover { background: var(--error-soft, rgba(239, 68, 68, 0.15)); }
        .compras-editor-overlay { background: rgba(0, 0, 0, 0.6); }
        .compras-editor-container { 
          background: var(--bg-secondary); 
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); 
        }
        .compras-editor-container .compras-editor-header { border-bottom-color: var(--border-color); }
        .compras-editor-container .compras-editor-header h3 { color: var(--text-primary); }
        .compras-editor-container .compras-editor-footer { 
          background: var(--bg-tertiary); 
          border-top-color: var(--border-color); 
        }
        .compras-editor-container .compras-editor-close { 
          background: rgba(239, 68, 68, 0.15); 
          color: #f87171; 
        }
        .compras-editor-container .compras-editor-close:hover { background: rgba(239, 68, 68, 0.25); }
        .compras-footer { 
          background: var(--bg-secondary);
          border-color: var(--border-color);
          box-shadow: 0 16px 35px rgba(0,0,0, 0.25); 
        }
        .compras-table-wrapper { border-color: var(--border-color); }
        .compras-table thead { background: var(--bg-tertiary); }
        .compras-table th { color: var(--text-secondary); }
        .compras-table th, .compras-table td { border-bottom-color: var(--border-color); }
        .compras-table tbody tr:hover { background: var(--hover-bg); }
        .compras-table tbody tr.seleccion { background: var(--primary-soft); }
        .compras-historial-card { background: var(--bg-tertiary); border-color: var(--border-color); }
        .compras-historial-table-wrapper { border-color: var(--border-color); }
        .compras-historial-table th,
        .compras-historial-table td { border-bottom-color: var(--border-color); }
        .badge-movimiento[data-tipo="compra"],
        .badge-movimiento[data-tipo="ajuste_entrada"] { background: rgba(74, 222, 128, 0.18); color: #4ade80; }
        .badge-movimiento[data-tipo="venta"],
        .badge-movimiento[data-tipo="ajuste_salida"] { background: rgba(248, 113, 113, 0.18); color: #f87171; }
        .badge-movimiento[data-tipo="transferencia"] { background: rgba(96, 165, 250, 0.18); color: #93c5fd; }
        .compras-items-table input[type="text"], .compras-items-table input[type="number"] { 
          background-color: var(--input-bg); 
          color: var(--text-primary); 
          border-color: var(--border-color); 
        }
      }
    `;
    document.head.appendChild(style);
    this.stylesInjected = true;
  },

  renderShell() {
    this.injectStyles();
    return `
      <section class="compras-module">
        <header class="compras-header">
          <div class="compras-title">
            <h2><i class="fas fa-file-invoice"></i> Gestión de Compras</h2>
            <span class="compras-subtitle">Registra facturas del SRI y controla tu inventario en un solo lugar</span>
          </div>
          <div class="compras-toolbar">
            <button class="btn btn-warning" data-action="ver-facturas-pendientes" style="position: relative;">
              <i class="fas fa-clock"></i> Pendientes
            </button>
            <button class="btn btn-success" data-action="pedidos-rapidos"><i class="fas fa-bolt"></i> Pedidos Rápidos</button>
            <button class="btn btn-light" data-action="importar-ia"><i class="fas fa-file-upload"></i> Importar PDF (IA)</button>
            <button class="btn btn-outline" data-action="abrir-por-hacer"><i class="fas fa-clipboard-list"></i> Compras por hacer</button>
            <button class="btn btn-primary" data-action="nueva-factura"><i class="fas fa-plus-circle"></i> Nueva factura</button>
          </div>
        </header>

        <div class="compras-list-container">
          <div class="compras-panel compras-panel--list">
            <div class="compras-summary">
              <div>
                <small>Total del mes</small>
                <strong data-ref="indicador-total-mes">$0.00</strong>
              </div>
              <div>
                <small>Pendiente de pago</small>
                <strong data-ref="indicador-total-pendiente">$0.00</strong>
              </div>
            </div>

            <div class="compras-list-filters">
              <div class="compras-filter">
                <label>Buscar</label>
                <input type="search" placeholder="Proveedor, RUC o número" data-ref="filtro-busqueda">
              </div>
              <div class="compras-filter">
                <label>Estado de pago</label>
                <select data-ref="filtro-estado">
                  <option value="todos">Todos</option>
                  <option value="pagado">Pagados</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="parcial">Parciales</option>
                </select>
              </div>
              <div class="compras-filter">
                <label>Fecha desde</label>
                <input type="date" data-ref="filtro-fecha-inicio">
              </div>
              <div class="compras-filter">
                <label>Fecha hasta</label>
                <input type="date" data-ref="filtro-fecha-fin">
              </div>
            </div>

            <div class="compras-table-wrapper">
              <table class="compras-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Nº Comprobante</th>
                    <th>Proveedor</th>
                    <th>RUC</th>
                    <th class="text-right">Total</th>
                    <th>Estado</th>
                    <th style="width: 48px;" title="Adjuntos"><i class="fas fa-paperclip"></i></th>
                    <th style="width: 100px;">Acciones</th>
                  </tr>
                </thead>
                <tbody data-ref="tabla-compras">
                  <tr><td colspan="7" class="text-center">Cargando compras…</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

          <div class="compras-historial-container" data-module-section="historial">
            <div class="compras-panel compras-panel--historial">
              <div class="compras-historial-header">
                <div>
                  <h3><i class="fas fa-history"></i> Historial de compras</h3>
                  <p>Movimientos reales registrados sobre tu inventario</p>
                </div>
                <div class="compras-historial-actions">
                  <button class="btn btn-outline" data-action="historial-export">
                    <i class="fas fa-file-download"></i> Exportar
                  </button>
                  <button class="btn btn-light" data-action="historial-insights-refresh">
                    <i class="fas fa-brain"></i> Insights IA
                  </button>
                  <button class="btn btn-outline" data-action="refrescar-historial">
                    <i class="fas fa-sync-alt"></i> Actualizar
                  </button>
                </div>
              </div>

              <div class="compras-historial-summary">
                <div class="compras-historial-card">
                  <span>Movimientos</span>
                  <strong data-ref="historial-total-movimientos">0</strong>
                </div>
                <div class="compras-historial-card">
                  <span>Unidades</span>
                  <strong data-ref="historial-total-unidades">0</strong>
                </div>
                <div class="compras-historial-card">
                  <span>Valor acumulado</span>
                  <strong data-ref="historial-total-valor">$0.00</strong>
                </div>
              </div>

              <div class="historial-ai" data-ref="historial-insights">
                <div class="historial-ai-placeholder">
                  <i class="fas fa-magic"></i> Las alertas inteligentes aparecerán aquí.
                </div>
              </div>

              <div class="compras-historial-filters">
                <label>
                  <span>Buscar</span>
                  <input type="search" placeholder="Producto, código o referencia" data-ref="historial-busqueda">
                </label>
                <label>
                  <span>Tipo</span>
                  <select data-ref="historial-tipo" data-server-filter="1">
                    <option value="compra" selected>Compras</option>
                    <option value="todos">Todos</option>
                    <option value="venta">Ventas</option>
                    <option value="ajuste_entrada">Ajustes (+)</option>
                    <option value="ajuste_salida">Ajustes (-)</option>
                  </select>
                </label>
                <label>
                  <span>Fecha desde</span>
                  <input type="date" data-ref="historial-fecha-inicio" data-server-filter="1">
                </label>
                <label>
                  <span>Fecha hasta</span>
                  <input type="date" data-ref="historial-fecha-fin" data-server-filter="1">
                </label>
                <label>
                  <span>Origen</span>
                  <select data-ref="historial-fuente" data-server-filter="1">
                    <option value="historial,ventas" selected>Compras + Ventas</option>
                    <option value="historial">Solo compras</option>
                    <option value="historial,ventas,ajustes">Incluye ajustes</option>
                  </select>
                </label>
              </div>

              <div class="compras-historial-table-wrapper">
                <table class="compras-historial-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th class="text-right">Cantidad</th>
                      <th class="text-right">Valor</th>
                      <th>Stock</th>
                      <th>Referencia</th>
                    </tr>
                  </thead>
                  <tbody data-ref="historial-body">
                    <tr><td colspan="7" class="compras-historial-empty">Cargando historial...</td></tr>
                  </tbody>
                </table>
              </div>

              <div class="historial-pagination" data-ref="historial-pagination">
                <div class="historial-pagination-info" data-ref="historial-pagination-info">
                  Página 1 de 1 · 0 movimientos
                </div>
                <div class="historial-pagination-controls">
                  <label style="display:flex; align-items:center; gap:0.25rem; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-tertiary, #5f7d8c);">
                    <span>Por página</span>
                    <select data-ref="historial-page-size">
                      <option value="25">25</option>
                      <option value="50" selected>50</option>
                      <option value="100">100</option>
                    </select>
                  </label>
                  <button class="btn btn-outline btn-sm" data-action="historial-page-prev">
                    <i class="fas fa-chevron-left"></i>
                  </button>
                  <button class="btn btn-outline btn-sm" data-action="historial-page-next">
                    <i class="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

        <!-- Editor flotante -->
        <div class="compras-editor-overlay" data-ref="editor-overlay">
          <div class="compras-editor-container">
            <div class="compras-editor-header">
              <h3 data-ref="editor-titulo">Factura nueva</h3>
              <button class="compras-editor-close" data-action="cerrar-editor" title="Cerrar editor">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="compras-editor-body" data-ref="editor-body">
              <p class="text-muted">Cargando formulario...</p>
            </div>
            <div class="compras-editor-footer">
              <div class="compras-editor-footer-status" data-ref="footer-status">Listo.</div>
              <div class="compras-editor-footer-actions">
                <button class="btn btn-outline" data-action="guardar-borrador"><i class="fas fa-save"></i> Guardar borrador</button>
                <button class="btn btn-primary" data-action="guardar-factura"><i class="fas fa-check"></i> Guardar factura</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  async render(container) {
    const target =
      container instanceof HTMLElement ? container : document.getElementById('contentArea');
    if (!target) {
      console.error('[Compras] No se pudo renderizar: contenedor inválido');
      return;
    }

    this.state.seleccionActual = null;
    this.state.editorDirty = false;

    target.innerHTML = this.renderShell();
    this.cacheDomReferences(target);
    this.bindShellEvents();
    this.bindHistorialEvents();

    if (this.dom.tablaBody) {
      this.dom.tablaBody.innerHTML =
        '<tr><td colspan="8" class="text-center text-muted">Cargando compras…</td></tr>';
    }
    if (this.dom.historial?.tablaBody) {
      this.dom.historial.tablaBody.innerHTML =
        '<tr><td colspan="7" class="compras-historial-empty">Cargando historial...</td></tr>';
    }

    try {
      await Promise.all([
        this.cargarCompras(),
        this.cargarHistorialCompras({ resetPage: true }),
        this.actualizarBadgeFacturasPendientes(),
      ]);
    } catch (error) {
      console.error('[Compras] Error al renderizar el módulo:', error);
      const safeMessage =
        typeof Utils !== 'undefined' && typeof Utils.escapeHTML === 'function'
          ? Utils.escapeHTML(error.message || 'No se pudo cargar el módulo de Compras.')
          : error.message || 'No se pudo cargar el módulo de Compras.';
      target.innerHTML = `
        <div class="alert alert-error">
          <i class="fas fa-exclamation-circle"></i>
          <div>
            <strong>Error al cargar Compras</strong>
            <p>${safeMessage}</p>
          </div>
        </div>
      `;
      if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
        Utils.showToast('No se pudo cargar el módulo de Compras', 'error');
      }
    }
  },

  cacheDomReferences(container) {
    const scope = container instanceof Element ? container : this.dom.root || document;
    const root = scope.querySelector('.compras-module') || scope;
    this.dom.root = root;

    this.dom.tablaBody = root.querySelector('[data-ref="tabla-compras"]');
    this.dom.indicadorTotalMes = root.querySelector('[data-ref="indicador-total-mes"]');
    this.dom.indicadorPendiente = root.querySelector('[data-ref="indicador-total-pendiente"]');

    this.dom.filtros = {
      busqueda: root.querySelector('[data-ref="filtro-busqueda"]'),
      estado: root.querySelector('[data-ref="filtro-estado"]'),
      fechaInicio: root.querySelector('[data-ref="filtro-fecha-inicio"]'),
      fechaFin: root.querySelector('[data-ref="filtro-fecha-fin"]'),
    };

    const historialRoot = root.querySelector('[data-module-section="historial"]');
    this.dom.historial = {
      root: historialRoot,
      tablaBody: historialRoot ? historialRoot.querySelector('[data-ref="historial-body"]') : null,
      filtros: {
        busqueda: historialRoot
          ? historialRoot.querySelector('[data-ref="historial-busqueda"]')
          : null,
        tipo: historialRoot ? historialRoot.querySelector('[data-ref="historial-tipo"]') : null,
        fechaInicio: historialRoot
          ? historialRoot.querySelector('[data-ref="historial-fecha-inicio"]')
          : null,
        fechaFin: historialRoot
          ? historialRoot.querySelector('[data-ref="historial-fecha-fin"]')
          : null,
        fuente: historialRoot ? historialRoot.querySelector('[data-ref="historial-fuente"]') : null,
      },
      resumen: {
        movimientos: historialRoot
          ? historialRoot.querySelector('[data-ref="historial-total-movimientos"]')
          : null,
        unidades: historialRoot
          ? historialRoot.querySelector('[data-ref="historial-total-unidades"]')
          : null,
        valor: historialRoot
          ? historialRoot.querySelector('[data-ref="historial-total-valor"]')
          : null,
      },
      refreshBtn: historialRoot
        ? historialRoot.querySelector('[data-action="refrescar-historial"]')
        : null,
      insightsContainer: historialRoot
        ? historialRoot.querySelector('[data-ref="historial-insights"]')
        : null,
      pagination: {
        container: historialRoot
          ? historialRoot.querySelector('[data-ref="historial-pagination"]')
          : null,
        info: historialRoot
          ? historialRoot.querySelector('[data-ref="historial-pagination-info"]')
          : null,
        prev: historialRoot
          ? historialRoot.querySelector('[data-action="historial-page-prev"]')
          : null,
        next: historialRoot
          ? historialRoot.querySelector('[data-action="historial-page-next"]')
          : null,
        pageSize: historialRoot
          ? historialRoot.querySelector('[data-ref="historial-page-size"]')
          : null,
      },
    };

    this.dom.editorOverlay = root.querySelector('[data-ref="editor-overlay"]');
    this.dom.editorTitulo = root.querySelector('[data-ref="editor-titulo"]');
    this.dom.editorBody = root.querySelector('[data-ref="editor-body"]');
    this.dom.footerStatus = root.querySelector('[data-ref="footer-status"]');
    this.dom.footerGuardar = root.querySelector('[data-action="guardar-factura"]');
    this.dom.footerBorrador = root.querySelector('[data-action="guardar-borrador"]');
  },

  resetEditor(modo = 'crear') {
    this.state.editorModo = modo;
    if (modo === 'crear') {
      this.state.seleccionActual = null;
    }
    this.state.editorDirty = false;
    this.state.editorData = this.crearEditorDataBase();

    if (modo === 'editar' && this.state.seleccionActual) {
      this.hidratarEditorData(this.state.seleccionActual);
    }

    const numeroReferencia =
      this.state.editorData.numeroFactura || this.state.seleccionActual?.numero || '';
    const titulo = modo === 'crear' ? 'Nueva factura' : `Editando ${numeroReferencia}`;

    if (this.dom.editorTitulo) {
      this.dom.editorTitulo.textContent = titulo;
    }

    // Mostrar overlay flotante
    if (this.dom.editorOverlay) {
      this.dom.editorOverlay.classList.add('active');
    }

    if (this.dom.editorBody) {
      this.dom.editorBody.innerHTML = this.renderEditorFormulario();
      this.bindEditorEvents();
      this.actualizarCamposTotalesUI();
      this.refrescarTablaItems();
    }

    if (this.dom.footerStatus) {
      this.dom.footerStatus.textContent =
        modo === 'crear'
          ? 'Listo para registrar una nueva factura.'
          : `Editando factura ${numeroReferencia}`;
    }
  },

  crearEditorDataBase() {
    const hoy = new Date();
    const fechaISO = hoy.toISOString().slice(0, 10);
    return {
      proveedorIdentificacion: '',
      proveedorNombre: '',
      proveedorComercial: '',
      proveedorEmail: '',
      proveedorTelefono: '',
      proveedorDireccion: '',
      numeroFactura: '',
      fechaEmision: fechaISO,
      horaEmision: '',
      formaPago: 'contado',
      estadoPago: 'pendiente',
      montoPagado: 0,
      subtotal: 0,
      iva: 0,
      otrosImpuestos: 0,
      total: 0,
      notas: '',
      items: [],
    };
  },

  hidratarEditorData(compra) {
    const normalizada = this.normalizarCompra(compra);
    const metadata =
      normalizada.metadata && typeof normalizada.metadata === 'object' ? normalizada.metadata : {};
    const destino = this.crearEditorDataBase();

    destino.proveedorIdentificacion =
      normalizada.proveedorIdentificacion ||
      metadata.proveedorRUC ||
      destino.proveedorIdentificacion;
    destino.proveedorNombre =
      normalizada.proveedorNombre || metadata.proveedorNombre || destino.proveedorNombre;
    destino.proveedorComercial = metadata.proveedorComercial || destino.proveedorComercial;
    destino.proveedorEmail = metadata.proveedorEmail || destino.proveedorEmail;
    destino.proveedorTelefono = metadata.proveedorTelefono || destino.proveedorTelefono;
    destino.proveedorDireccion = metadata.proveedorDireccion || destino.proveedorDireccion;

    destino.numeroFactura = normalizada.numero || destino.numeroFactura;
    const fechaISO = normalizada.fechaISO
      ? normalizada.fechaISO.slice(0, 10)
      : (normalizada.fecha || '').slice(0, 10);
    if (fechaISO) destino.fechaEmision = fechaISO;
    destino.horaEmision = metadata.hora || metadata.horaEmision || destino.horaEmision;
    destino.formaPago = metadata.formaPago || destino.formaPago;
    destino.estadoPago = normalizada.estadoPago || destino.estadoPago;
    destino.montoPagado = Number(normalizada.montoPagado || destino.montoPagado);

    destino.subtotal = Number(normalizada.subtotal || destino.subtotal);
    destino.iva = Number(normalizada.iva || destino.iva);
    destino.otrosImpuestos = Number(normalizada.otros || destino.otrosImpuestos);
    destino.total = Number(normalizada.total || destino.total);
    destino.notas = normalizada.notas || metadata.notas || destino.notas;

    const items = Array.isArray(normalizada.items) ? normalizada.items : [];
    destino.items = items.map((item) => {
      const baseCantidad = Number(item.cantidad ?? item.qty ?? 1) || 1;
      const basePrecio =
        Number(item.precio_unitario ?? item.precioUnitario ?? item.precio ?? 0) || 0;
      const descuento = Number(item.descuento ?? 0) || 0;
      const ivaPorcentaje = Number(item.iva ?? item.ivaPorcentaje ?? 12) || 0;
      const baseImponible = Math.max(baseCantidad * basePrecio - descuento, 0);
      const ivaMonto = this.roundMoney(baseImponible * (ivaPorcentaje / 100));
      return {
        id: item.id || item.linea_id || Utils.generateId(),
        codigo: item.codigo || item.productoCodigo || '',
        descripcion: item.descripcion || item.productoNombre || 'Detalle sin descripción',
        unidad: item.unidad || item.unidadMedida || 'unidad',
        cantidad: this.roundMoney(baseCantidad, 4),
        precioUnitario: this.roundMoney(basePrecio),
        descuento: this.roundMoney(descuento),
        ivaPorcentaje,
        ivaMonto,
        subtotal: this.roundMoney(baseImponible),
        totalLinea: this.roundMoney(baseImponible + ivaMonto),
      };
    });

    this.state.editorData = destino;
    this.recalcularTotalesEditor({ omitirOtros: true });
  },

  renderEditorFormulario() {
    const data = this.state.editorData || this.crearEditorDataBase();
    return `
        <div class="compras-editor-section">
          <h4>Datos del proveedor</h4>
          <div class="compras-editor-grid">
            <label>
              <span>RUC *</span>
              <input type="text" name="proveedorIdentificacion" data-editor-field data-editor-key="proveedorIdentificacion" required placeholder="0000000000001" value="${Utils.escapeHTML(data.proveedorIdentificacion || '')}">
            </label>
            <label>
              <span>Razón social *</span>
              <input type="text" name="proveedorNombre" data-editor-field data-editor-key="proveedorNombre" required value="${Utils.escapeHTML(data.proveedorNombre || '')}">
            </label>
            <label>
              <span>Nombre comercial</span>
              <input type="text" name="proveedorComercial" data-editor-field data-editor-key="proveedorComercial" value="${Utils.escapeHTML(data.proveedorComercial || '')}">
            </label>
            <label>
              <span>Correo electrónico</span>
              <input type="email" name="proveedorEmail" data-editor-field data-editor-key="proveedorEmail" value="${Utils.escapeHTML(data.proveedorEmail || '')}">
            </label>
            <label>
              <span>Teléfono</span>
              <input type="text" name="proveedorTelefono" data-editor-field data-editor-key="proveedorTelefono" value="${Utils.escapeHTML(data.proveedorTelefono || '')}">
            </label>
            <label class="full">
              <span>Dirección</span>
              <input type="text" name="proveedorDireccion" data-editor-field data-editor-key="proveedorDireccion" value="${Utils.escapeHTML(data.proveedorDireccion || '')}">
            </label>
          </div>
        </div>

        <div class="compras-editor-section">
          <h4>Datos de la factura</h4>
          <div class="compras-editor-grid">
            <label>
              <span>Número de factura *</span>
              <input type="text" name="numeroFactura" data-editor-field data-editor-key="numeroFactura" required placeholder="001-001-000000123" value="${Utils.escapeHTML(data.numeroFactura || '')}">
            </label>
            <label>
              <span>Fecha de emisión *</span>
              <input type="date" name="fechaEmision" data-editor-field data-editor-key="fechaEmision" required value="${Utils.escapeHTML(data.fechaEmision || '')}">
            </label>
            <label>
              <span>Hora</span>
              <input type="time" name="horaEmision" data-editor-field data-editor-key="horaEmision" value="${Utils.escapeHTML(data.horaEmision || '')}">
            </label>
            <label>
              <span>Forma de pago</span>
              <select name="formaPago" data-editor-field data-editor-key="formaPago">
                <option value="contado" ${data.formaPago === 'contado' ? 'selected' : ''}>Contado</option>
                <option value="credito" ${data.formaPago === 'credito' ? 'selected' : ''}>Crédito</option>
                <option value="tarjeta" ${data.formaPago === 'tarjeta' ? 'selected' : ''}>Tarjeta</option>
                <option value="transferencia" ${data.formaPago === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                <option value="otros" ${data.formaPago === 'otros' ? 'selected' : ''}>Otros</option>
              </select>
            </label>
            <label>
              <span>Estado de pago</span>
              <select name="estadoPago" data-editor-field data-editor-key="estadoPago">
                <option value="pendiente" ${data.estadoPago === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                <option value="pagado" ${data.estadoPago === 'pagado' ? 'selected' : ''}>Pagado</option>
                <option value="parcial" ${data.estadoPago === 'parcial' ? 'selected' : ''}>Parcial</option>
              </select>
            </label>
            <label>
              <span>Monto pagado</span>
              <input type="number" step="0.01" name="montoPagado" data-editor-field data-editor-key="montoPagado" value="${this.formatNumber(data.montoPagado)}">
            </label>
          </div>
        </div>

        <div class="compras-editor-section">
          <h4>Detalle de productos</h4>
          <div class="compras-items-wrapper">
            ${this.renderEditorItemsTable(data.items)}
          </div>
          <button type="button" class="btn btn-light" data-action="agregar-item-editor"><i class="fas fa-plus"></i> Agregar línea</button>
        </div>

        <div class="compras-editor-section">
          <h4>Totales</h4>
          <div class="compras-editor-grid">
            <label>
              <span>Subtotal</span>
              <input type="number" step="0.01" name="subtotal" data-editor-field data-editor-key="subtotal" value="${this.formatNumber(data.subtotal)}" readonly>
            </label>
            <label>
              <span>IVA</span>
              <input type="number" step="0.01" name="iva" data-editor-field data-editor-key="iva" value="${this.formatNumber(data.iva)}" readonly>
            </label>
            <label>
              <span>Otros impuestos</span>
              <input type="number" step="0.01" name="otrosImpuestos" data-editor-field data-editor-key="otrosImpuestos" value="${this.formatNumber(data.otrosImpuestos)}">
            </label>
            <label>
              <span>Total</span>
              <input type="number" step="0.01" name="total" data-editor-field data-editor-key="total" value="${this.formatNumber(data.total)}" readonly>
            </label>
          </div>
        </div>

        <div class="compras-editor-section">
          <h4>Notas</h4>
          <textarea name="notas" data-editor-field data-editor-key="notas" rows="3" placeholder="Observaciones internas">${Utils.escapeHTML(data.notas || '')}</textarea>
        </div>
      `;
  },

  renderEditorItemsTable(items = []) {
    const tieneItems = Array.isArray(items) && items.length > 0;
    return `
        <div class="compras-items-table" data-editor-items>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Unidad</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">Precio</th>
                <th class="text-right">Desc.</th>
                <th class="text-right">IVA %</th>
                <th class="text-right">Subtotal</th>
                <th class="text-right">IVA</th>
                <th class="text-right">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody data-ref="items-body">
              ${tieneItems ? items.map((item) => this.renderFilaItemEditor(item)).join('') : '<tr class="text-muted"><td colspan="11">Agrega productos o servicios para calcular los totales.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
  },

  renderFilaItemEditor(item) {
    const id = String(item.id || Utils.generateId());
    const codigo = String(item.codigo || '');
    const descripcion = String(item.descripcion || '');
    const unidad = String(item.unidad || 'unidad');

    return `
        <tr data-item-id="${Utils.escapeHTML(id)}">
          <td><input type="text" data-item-field="codigo" value="${Utils.escapeHTML(codigo)}"></td>
          <td><input type="text" data-item-field="descripcion" value="${Utils.escapeHTML(descripcion)}"></td>
          <td><input type="text" data-item-field="unidad" value="${Utils.escapeHTML(unidad)}"></td>
          <td><input type="number" min="0" step="0.01" data-item-field="cantidad" class="text-right" value="${this.formatNumber(item.cantidad, 4)}"></td>
          <td><input type="number" min="0" step="0.01" data-item-field="precioUnitario" class="text-right" value="${this.formatNumber(item.precioUnitario)}"></td>
          <td><input type="number" min="0" step="0.01" data-item-field="descuento" class="text-right" value="${this.formatNumber(item.descuento)}"></td>
          <td><input type="number" min="0" step="0.01" data-item-field="ivaPorcentaje" class="text-right" value="${this.formatNumber(item.ivaPorcentaje)}"></td>
          <td class="text-right" data-item-summary="subtotal">${this.formatNumber(item.subtotal)}</td>
          <td class="text-right" data-item-summary="ivaMonto">${this.formatNumber(item.ivaMonto)}</td>
          <td class="text-right" data-item-summary="totalLinea">${this.formatNumber(item.totalLinea)}</td>
          <td class="text-center"><button type="button" class="btn btn-icon" data-action="remover-item-editor" title="Eliminar"><i class="fas fa-times"></i></button></td>
        </tr>
      `;
  },

  bindEditorEvents() {
    if (!this.dom.editorBody) return;
    const registrarCambio = () => {
      this.state.editorDirty = true;
    };

    const manejarCambioCampo = (event) => {
      registrarCambio();
      const node = event.target;
      const key = node.dataset.editorKey || node.name;
      if (!key || !this.state.editorData) return;
      const esNumero = node.type === 'number';
      const valor = esNumero ? Number(node.value || 0) : node.value;
      this.state.editorData[key] = esNumero ? this.roundMoney(valor) : valor;
      if (key === 'otrosImpuestos') {
        this.recalcularTotalesEditor();
      }
    };

    this.dom.editorBody.querySelectorAll('[data-editor-field]').forEach((input) => {
      input.addEventListener('input', manejarCambioCampo);
      input.addEventListener('change', manejarCambioCampo);
    });

    this.bindEditorItemsEvents();
  },

  bindEditorItemsEvents() {
    if (!this.dom.editorBody) return;
    const tabla = this.dom.editorBody.querySelector('[data-editor-items]');
    if (!tabla) return;

    tabla.addEventListener('input', (event) => {
      const input = event.target.closest('[data-item-field]');
      if (!input) return;
      this.state.editorDirty = true;
      const fila = input.closest('tr[data-item-id]');
      if (!fila) return;
      const id = fila.dataset.itemId;
      const field = input.dataset.itemField;
      const esNumero = ['cantidad', 'precioUnitario', 'descuento', 'ivaPorcentaje'].includes(field);
      const value = esNumero ? Number(input.value || 0) : input.value;
      this.actualizarItemEditor(id, field, value);
    });

    tabla.addEventListener('click', (event) => {
      const remover = event.target.closest('[data-action="remover-item-editor"]');
      if (remover) {
        const fila = remover.closest('tr[data-item-id]');
        if (!fila) return;
        this.eliminarFilaItemEditor(fila.dataset.itemId);
      }
    });

    const btnAgregar = this.dom.editorBody.querySelector('[data-action="agregar-item-editor"]');
    if (btnAgregar) {
      btnAgregar.addEventListener('click', () => {
        this.agregarFilaItemEditor();
      });
    }
  },

  agregarFilaItemEditor(prefill = {}) {
    if (!this.state.editorData) return;
    const nuevo = {
      id: Utils.generateId(),
      codigo: prefill.codigo || '',
      descripcion: prefill.descripcion || '',
      unidad: prefill.unidad || 'unidad',
      cantidad: this.roundMoney(prefill.cantidad || 1, 4),
      precioUnitario: this.roundMoney(prefill.precioUnitario || 0),
      descuento: this.roundMoney(prefill.descuento || 0),
      ivaPorcentaje: this.roundMoney(prefill.ivaPorcentaje ?? 12),
      ivaMonto: 0,
      subtotal: 0,
      totalLinea: 0,
    };
    this.state.editorData.items.push(nuevo);
    this.refrescarTablaItems();
    this.recalcularTotalesEditor();
    this.refrescarFilaItem(nuevo.id, nuevo);
    const primerCampo = this.dom.editorBody?.querySelector(
      `tr[data-item-id="${this.escapeSelector(nuevo.id)}"] input[data-item-field="codigo"]`
    );
    if (primerCampo) {
      primerCampo.focus();
      primerCampo.select?.();
    }
    this.state.editorDirty = true;
  },

  eliminarFilaItemEditor(id) {
    if (!this.state.editorData) return;
    const indice = this.state.editorData.items.findIndex((item) => item.id === id);
    if (indice === -1) return;
    this.state.editorData.items.splice(indice, 1);
    this.refrescarTablaItems();
    this.recalcularTotalesEditor();
    this.state.editorDirty = true;
  },

  actualizarItemEditor(id, field, value) {
    if (!this.state.editorData) return;
    const item = this.state.editorData.items.find((registro) => registro.id === id);
    if (!item) return;
    if (['cantidad', 'precioUnitario', 'descuento', 'ivaPorcentaje'].includes(field)) {
      item[field] = this.roundMoney(Number(value || 0), field === 'cantidad' ? 4 : 2);
    } else {
      item[field] = value;
    }
    this.recalcularLineaItem(item);
    this.recalcularTotalesEditor();
    this.refrescarFilaItem(id, item);
  },

  refrescarTablaItems() {
    if (!this.dom.editorBody) return;
    const tbody = this.dom.editorBody.querySelector('[data-ref="items-body"]');
    if (!tbody) return;
    const items = this.state.editorData?.items || [];
    if (!items.length) {
      tbody.innerHTML =
        '<tr class="text-muted"><td colspan="11">Agrega productos o servicios para calcular los totales.</td></tr>';
      return;
    }
    tbody.innerHTML = items.map((item) => this.renderFilaItemEditor(item)).join('');
  },

  refrescarFilaItem(id, itemActualizado) {
    if (!this.dom.editorBody) return;
    const fila = this.dom.editorBody.querySelector(`tr[data-item-id="${this.escapeSelector(id)}"]`);
    if (!fila) return;
    fila.querySelectorAll('[data-item-field]').forEach((input) => {
      const field = input.dataset.itemField;
      if (!field) return;
      if (['cantidad', 'precioUnitario', 'descuento', 'ivaPorcentaje'].includes(field)) {
        const precision = field === 'cantidad' ? 4 : 2;
        input.value = this.formatNumber(itemActualizado[field], precision);
      } else {
        input.value = itemActualizado[field] || '';
      }
    });
    const subtotalNode = fila.querySelector('[data-item-summary="subtotal"]');
    const ivaNode = fila.querySelector('[data-item-summary="ivaMonto"]');
    const totalNode = fila.querySelector('[data-item-summary="totalLinea"]');
    if (subtotalNode) subtotalNode.textContent = this.formatNumber(itemActualizado.subtotal);
    if (ivaNode) ivaNode.textContent = this.formatNumber(itemActualizado.ivaMonto);
    if (totalNode) totalNode.textContent = this.formatNumber(itemActualizado.totalLinea);
  },

  highlightInvalidItems(indices = []) {
    if (!this.dom.editorBody) return;
    const tbody = this.dom.editorBody.querySelector('[data-ref="items-body"]');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr[data-item-id]'));
    if (!rows.length) return;
    const invalidSet = new Set(indices.map((value) => Number(value)));
    rows.forEach((row, index) => {
      const position = index + 1;
      const shouldHighlight = invalidSet.has(position);
      if (shouldHighlight) {
        row.style.outline = '2px solid var(--danger-color, #d9534f)';
        row.style.backgroundColor = 'rgba(217, 83, 79, 0.08)';
      } else {
        row.style.outline = '';
        row.style.backgroundColor = '';
      }
    });
  },

  recalcularLineaItem(item) {
    const cantidad = Number(item.cantidad || 0);
    const precioUnitario = Number(item.precioUnitario || 0);
    const descuento = Number(item.descuento || 0);
    const ivaPorcentaje = Number(item.ivaPorcentaje || 0);
    const base = Math.max(cantidad * precioUnitario - descuento, 0);
    const ivaMonto = this.roundMoney(base * (ivaPorcentaje / 100));
    item.subtotal = this.roundMoney(base);
    item.ivaMonto = ivaMonto;
    item.totalLinea = this.roundMoney(base + ivaMonto);
  },

  recalcularTotalesEditor(options = {}) {
    if (!this.state.editorData) return;
    const { omitirOtros = false } = options;
    let subtotal = 0;
    let iva = 0;

    this.state.editorData.items.forEach((item) => {
      this.recalcularLineaItem(item);
      subtotal += Number(item.subtotal || 0);
      iva += Number(item.ivaMonto || 0);
    });

    this.state.editorData.subtotal = this.roundMoney(subtotal);
    this.state.editorData.iva = this.roundMoney(iva);
    if (!omitirOtros) {
      this.state.editorData.otrosImpuestos = this.roundMoney(
        this.state.editorData.otrosImpuestos || 0
      );
    }

    const otros = Number(this.state.editorData.otrosImpuestos || 0);
    this.state.editorData.total = this.roundMoney(
      this.state.editorData.subtotal + this.state.editorData.iva + otros
    );
    this.actualizarCamposTotalesUI();
  },

  actualizarCamposTotalesUI() {
    if (!this.dom.editorBody) return;
    const setNumber = (name, value, precision = 2) => {
      const node = this.dom.editorBody.querySelector(`[name="${name}"]`);
      if (node) node.value = this.formatNumber(value, precision);
    };
    const data = this.state.editorData;
    if (!data) return;
    setNumber('subtotal', data.subtotal);
    setNumber('iva', data.iva);
    setNumber('otrosImpuestos', data.otrosImpuestos);
    setNumber('total', data.total);
  },

  roundMoney(value, precision = 2) {
    const factor = 10 ** precision;
    return Math.round((Number(value) || 0) * factor) / factor;
  },

  formatNumber(value, precision = 2) {
    return this.roundMoney(value, precision).toFixed(precision);
  },

  escapeSelector(value) {
    if (typeof window !== 'undefined' && window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(value);
    }
    return String(value).replace(/([\0-\x1F\x7F-\x9F\s\!"#$%&'()*+,./:;<=>?@\[\]^`{|}~])/g, '\\$1');
  },
  bindShellEvents() {
    Object.values(this.dom.filtros).forEach((node) => {
      if (!node) return;
      node.addEventListener('input', () => this.aplicarFiltrosDesdeUI());
      node.addEventListener('change', () => this.aplicarFiltrosDesdeUI());
    });

    if (this.dom.tablaBody) {
      this.dom.tablaBody.addEventListener('click', (event) => {
        // Prevenir que los botones de acción disparen selección de fila
        const actionBtn = event.target.closest('[data-action]');
        if (actionBtn) {
          event.stopPropagation();
          const compraId = actionBtn.dataset.id;
          const action = actionBtn.dataset.action;
          const compra = this.state.compras.find((c) => c.id === compraId);

          switch (action) {
            case 'editar-compra':
              if (compra) this.seleccionarCompra(compra);
              break;
            case 'ver-pdf':
              if (compra && compra.pdf_nombre) this.verPDFCompra(compra);
              break;
            case 'eliminar-compra':
              if (compra) this.eliminarCompra(compra);
              break;
          }
          return;
        }

        // Selección de fila normal
        const fila = event.target.closest('tr[data-id]');
        if (!fila) return;
        const compraId = fila.dataset.id;
        const compra = this.state.compras.find((c) => c.id === compraId);
        if (compra) {
          this.seleccionarCompra(compra);
        }
      });
    }

    const root = this.dom.root;
    if (!root) return;

    // Cerrar editor al hacer click fuera del contenedor
    if (this.dom.editorOverlay) {
      this.dom.editorOverlay.addEventListener('click', (event) => {
        if (event.target === this.dom.editorOverlay) {
          this.cerrarEditor();
        }
      });
    }

    root.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action]');
      if (!btn) return;
      switch (btn.dataset.action) {
        case 'importar-ia':
          this.iniciarCargaFactura();
          break;
        case 'abrir-por-hacer':
          if (this.PorHacer) {
            this.PorHacer.abrir();
          }
          break;
        case 'nueva-factura':
          this.resetEditor('crear');
          break;
        case 'pedidos-rapidos':
          this.abrirPedidosRapidos();
          break;
        case 'guardar-borrador':
          this.guardarBorradorLocal();
          break;
        case 'guardar-factura':
          this.guardarFacturaDesdeEditor();
          break;
        case 'cerrar-editor':
          this.cerrarEditor();
          break;
        case 'refrescar-historial':
          this.cargarHistorialCompras({ force: true });
          break;
        case 'historial-export':
          this.exportarHistorialMovimientos();
          break;
        case 'historial-insights-refresh':
          this.cargarInsightsHistorial({ force: true });
          break;
        case 'historial-page-prev':
          this.irHistorialPagina(-1);
          break;
        case 'historial-page-next':
          this.irHistorialPagina(1);
          break;
        case 'ver-facturas-pendientes':
          this.mostrarFacturasPendientes();
          break;
        default:
          break;
      }
    });

    // Actualizar badge de facturas pendientes al cargar
    this.actualizarBadgeFacturasPendientes();
  },

  bindHistorialEvents() {
    const historialDom = this.dom.historial;
    if (!historialDom || !historialDom.root) return;
    const filtros = historialDom.filtros || {};

    const handleChange = (event) => {
      this.actualizarFiltrosHistorialDesdeUI();
      const target = event?.target;
      if (
        target &&
        typeof target.hasAttribute === 'function' &&
        target.hasAttribute('data-server-filter')
      ) {
        this.state.historial.paginacion.page = 1;
        this.cargarHistorialCompras();
      } else {
        this.renderHistorialTable();
      }
    };

    Object.values(filtros).forEach((node) => {
      if (!node) return;
      node.addEventListener('change', handleChange);
      if (node.tagName === 'INPUT' && node.type === 'search') {
        node.addEventListener('input', handleChange);
      }
    });

    if (historialDom.refreshBtn) {
      historialDom.refreshBtn.addEventListener('click', () =>
        this.cargarHistorialCompras({ force: true })
      );
    }

    if (historialDom.pagination?.pageSize) {
      historialDom.pagination.pageSize.addEventListener('change', (event) => {
        const size = this.normalizarHistorialPageSize(event.target.value);
        this.state.historial.paginacion.pageSize = size;
        this.state.historial.paginacion.page = 1;
        event.target.value = size;
        this.cargarHistorialCompras({ resetPage: true });
      });
    }
  },

  aplicarFiltrosDesdeUI() {
    if (!this.dom.filtros) return;
    const filtros = this.state.filtros;
    filtros.busqueda = (this.dom.filtros.busqueda?.value || '').trim();
    filtros.estadoPago = this.dom.filtros.estado?.value || 'todos';
    filtros.fechaInicio = this.dom.filtros.fechaInicio?.value || '';
    filtros.fechaFin = this.dom.filtros.fechaFin?.value || '';
    this.renderComprasTable();
  },

  renderComprasTable() {
    if (!this.dom.tablaBody) return;
    const filas = this.obtenerComprasFiltradas();

    if (!filas.length) {
      this.dom.tablaBody.innerHTML = `<tr><td colspan="8">
        <div class="excel-empty-state">
          <i class="fas fa-receipt"></i>
          <h4>No se encontraron compras</h4>
          <p>Ajusta los filtros o registra una nueva factura</p>
        </div>
      </td></tr>`;
      return;
    }

    this.dom.tablaBody.innerHTML = filas
      .map((compra) => {
        const estado = (compra.estado_pago || compra.estadoPago || 'pendiente').toLowerCase();
        const seleccionado =
          this.state.seleccionActual && this.state.seleccionActual.id === compra.id
            ? ' class="selected"'
            : '';
        const totalFormato = Utils.formatCurrency(Number(compra.total || 0));
        const fecha = Utils.formatDate(compra.fecha, 'short') || compra.fecha || '—';
        const numero = Utils.escapeHTML(compra.numero || '—');
        const proveedor = Utils.escapeHTML(
          compra.proveedor_nombre || compra.proveedorNombre || 'Proveedor sin nombre'
        );
        const ruc = Utils.escapeHTML(
          compra.proveedor_identificacion || compra.proveedorIdentificacion || '—'
        );
        const tieneAdjunto = compra.pdf_nombre
          ? '<i class="fas fa-paperclip" style="color:var(--excel-accent)" title="Factura PDF adjunta"></i>'
          : '<i class="fas fa-minus text-muted" title="Sin PDF"></i>';

        // Determinar badge según estado
        let estadoBadge = 'excel-badge-warning';
        if (estado === 'pagado') estadoBadge = 'excel-badge-success';
        else if (estado === 'parcial') estadoBadge = 'excel-badge-info';
        else if (estado === 'anulado' || estado === 'cancelado') estadoBadge = 'excel-badge-danger';

        return `
        <tr data-id="${compra.id}"${seleccionado}>
          <td class="text-muted">${fecha}</td>
          <td class="font-mono"><strong>${numero}</strong></td>
          <td>${proveedor}</td>
          <td class="font-mono text-muted">${ruc}</td>
          <td class="text-right"><strong>${totalFormato}</strong></td>
          <td class="text-center"><span class="excel-badge ${estadoBadge}">${estado}</span></td>
          <td class="text-center">${tieneAdjunto}</td>
          <td class="text-center sticky-action">
            <div class="excel-actions">
              <button class="excel-btn-action btn-edit" data-action="editar-compra" data-id="${compra.id}" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button class="excel-btn-action btn-view" data-action="ver-pdf" data-id="${compra.id}" title="Ver PDF" ${!compra.pdf_nombre ? 'disabled' : ''}>
                <i class="fas fa-file-pdf"></i>
              </button>
              <button class="excel-btn-action btn-delete" data-action="eliminar-compra" data-id="${compra.id}" title="Eliminar">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');
  },

  obtenerComprasFiltradas() {
    const { compras, filtros } = this.state;
    const termino = filtros.busqueda.toLowerCase();
    const inicio = filtros.fechaInicio ? new Date(filtros.fechaInicio) : null;
    const fin = filtros.fechaFin ? new Date(filtros.fechaFin) : null;
    const estadoFiltro = filtros.estadoPago;

    return compras.filter((compra) => {
      const normalizada = this.normalizarCompra(compra);
      const texto = [
        normalizada.numero,
        normalizada.proveedorNombre,
        normalizada.proveedorIdentificacion,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (termino && !texto.includes(termino)) return false;

      if (estadoFiltro !== 'todos') {
        const estadoCompra = (normalizada.estadoPago || '').toLowerCase();
        if (estadoCompra !== estadoFiltro) return false;
      }

      if (inicio) {
        const fechaCompra = normalizada.fechaISO
          ? new Date(normalizada.fechaISO)
          : new Date(normalizada.fecha);
        if (fechaCompra < inicio) return false;
      }

      if (fin) {
        const fechaCompra = normalizada.fechaISO
          ? new Date(normalizada.fechaISO)
          : new Date(normalizada.fecha);
        if (fechaCompra > fin) return false;
      }

      return true;
    });
  },

  actualizarFiltrosHistorialDesdeUI() {
    if (!this.dom.historial || !this.dom.historial.filtros) return;
    const filtrosUI = this.dom.historial.filtros;
    const filtros = this.state.historial.filtros;
    filtros.busqueda = (filtrosUI.busqueda?.value || '').trim();
    filtros.tipoMovimiento = (filtrosUI.tipo?.value || 'todos').toLowerCase();
    filtros.fechaInicio = filtrosUI.fechaInicio?.value || '';
    filtros.fechaFin = filtrosUI.fechaFin?.value || '';
    filtros.fuentes = (filtrosUI.fuente?.value || 'historial').toLowerCase();
  },

  obtenerHistorialFiltrado() {
    const items = Array.isArray(this.state.historial.items) ? this.state.historial.items : [];
    const termino = (this.state.historial.filtros.busqueda || '').toLowerCase();
    if (!termino) return items;
    return items.filter((mov) => {
      const texto = [mov.productoNombre, mov.productoCodigo, mov.referenciaId, mov.usuario]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return texto.includes(termino);
    });
  },

  renderHistorialTable() {
    const historialDom = this.dom.historial;
    if (!historialDom || !historialDom.tablaBody) return;
    const movimientos = this.obtenerHistorialFiltrado();

    if (!movimientos.length) {
      historialDom.tablaBody.innerHTML = `<tr><td colspan="7">
        <div class="excel-empty-state">
          <i class="fas fa-history"></i>
          <h4>No hay movimientos</h4>
          <p>No se encontraron movimientos con los filtros actuales</p>
        </div>
      </td></tr>`;
      this.actualizarResumenHistorial([]);
      return;
    }

    historialDom.tablaBody.innerHTML = movimientos
      .map((movimiento) => {
        const fecha =
          Utils.formatDate(movimiento.fechaISO || movimiento.fecha, 'short') ||
          movimiento.fecha ||
          '—';
        const hora = movimiento.hora
          ? `<small class="text-muted">${Utils.escapeHTML(movimiento.hora)}</small>`
          : '';
        const cantidad = this.formatNumber(movimiento.cantidad, 2);
        const valor = Utils.formatCurrency(movimiento.total);
        const badgeTipo = Utils.escapeHTML(movimiento.tipo);
        const badgeLabel = this.describeMovimiento(movimiento.tipo);
        const stockTexto =
          Number.isFinite(movimiento.stockAnterior) && Number.isFinite(movimiento.stockNuevo)
            ? `${this.formatNumber(movimiento.stockAnterior, 2)} → ${this.formatNumber(movimiento.stockNuevo, 2)}`
            : Number.isFinite(movimiento.stockNuevo)
              ? this.formatNumber(movimiento.stockNuevo, 2)
              : '—';
        const stockDisplay = Utils.escapeHTML(stockTexto);
        const stockDelta = movimiento.stockNuevoDelta
          ? Utils.escapeHTML(movimiento.stockNuevoDelta)
          : '';
        const referencia = movimiento.referenciaId
          ? Utils.escapeHTML(movimiento.referenciaId)
          : movimiento.usuario
            ? Utils.escapeHTML(movimiento.usuario)
            : '—';

        // Determinar badge según tipo de movimiento
        let tipoBadge = 'excel-badge-info';
        if (badgeTipo === 'compra' || badgeTipo === 'ajuste_entrada')
          tipoBadge = 'excel-badge-success';
        else if (badgeTipo === 'venta' || badgeTipo === 'ajuste_salida')
          tipoBadge = 'excel-badge-warning';

        return `
        <tr>
          <td>
            <div>${Utils.escapeHTML(fecha)}</div>
            ${hora}
          </td>
          <td>
            <div>
              <strong>${Utils.escapeHTML(movimiento.productoNombre || 'Producto sin nombre')}</strong>
              <small class="font-mono text-muted">${Utils.escapeHTML(movimiento.productoCodigo || '')}</small>
            </div>
          </td>
          <td class="text-center"><span class="excel-badge ${tipoBadge}">${Utils.escapeHTML(badgeLabel)}</span></td>
          <td class="text-right">${cantidad}</td>
          <td class="text-right"><strong>${valor}</strong></td>
          <td>
            <div class="font-mono">${stockDisplay}</div>
            ${stockDelta ? `<small class="text-muted">${stockDelta}</small>` : ''}
          </td>
          <td class="font-mono text-muted">${referencia}</td>
        </tr>
      `;
      })
      .join('');
  },

  renderHistorialPagination() {
    const pag = this.state.historial.paginacion;
    const dom = this.dom.historial?.pagination;
    if (!dom || !dom.container) return;
    const total = Number.isFinite(pag.total) ? pag.total : this.state.historial.items?.length || 0;
    const totalPages = Math.max(1, Math.ceil(pag.totalPages || total / pag.pageSize) || 1);
    if (dom.info) {
      dom.info.textContent = `Página ${pag.page} de ${totalPages} · ${total} movimientos`;
    }
    if (dom.prev) {
      dom.prev.disabled = pag.page <= 1;
    }
    if (dom.next) {
      dom.next.disabled = pag.page >= totalPages;
    }
    if (dom.pageSize) {
      dom.pageSize.value = pag.pageSize;
    }
    pag.totalPages = totalPages;
  },

  async cargarInsightsHistorial(options = {}) {
    const dias = options.dias || this.state.historial.insights.periodoAnalizado || 60;
    try {
      const respuesta = await this.requestBackend(`/historial-productos/insights?dias=${dias}`);
      const insights = respuesta?.insights || {};
      this.state.historial.insights = {
        lowStock: insights.lowStock || [],
        overStock: insights.overStock || [],
        anomalies: insights.anomalies || [],
        periodoAnalizado: insights.periodoAnalizado || dias,
        updatedAt: new Date().toISOString(),
      };
      this.renderHistorialInsights();
    } catch (error) {
      console.warn('No se pudieron obtener los insights del historial:', error);
    }
  },

  renderHistorialInsights() {
    const container = this.dom.historial?.insightsContainer;
    if (!container) return;
    const insights = this.state.historial.insights || {};
    const buildCard = (titulo, items, clase) => {
      if (!Array.isArray(items) || !items.length) return '';
      const lista = items
        .slice(0, 5)
        .map((item) => {
          const nombre = Utils.escapeHTML(
            item.producto_nombre || item.productoNombre || 'Producto'
          );
          const detalle = item.mensaje ? `<small>${Utils.escapeHTML(item.mensaje)}</small>` : '';
          return `<li><strong>${nombre}</strong>${detalle}</li>`;
        })
        .join('');
      return `
        <div class="historial-ai-card ${clase}">
          <h4>${Utils.escapeHTML(titulo)}<span>${items.length}</span></h4>
          <ul>${lista}</ul>
        </div>
      `;
    };

    const bloques = [
      buildCard('Riesgo de quiebre', insights.lowStock, 'danger'),
      buildCard('Excedentes detectados', insights.overStock, 'warning'),
      buildCard('Movimientos inusuales', insights.anomalies, 'info'),
    ].filter(Boolean);

    if (!bloques.length) {
      container.innerHTML =
        '<div class="historial-ai-placeholder"><i class="fas fa-search"></i> Aún no hay alertas. Ajusta los filtros o vuelve a intentarlo.</div>';
      return;
    }

    const meta = insights.updatedAt
      ? `Actualizado ${new Date(insights.updatedAt).toLocaleString()}`
      : `Período analizado ${insights.periodoAnalizado || 60} días`;

    container.innerHTML = `${bloques.join('')}
      <small class="historial-ai-meta">${Utils.escapeHTML(meta)}</small>`;
  },

  exportarHistorialMovimientos() {
    const movimientos = this.obtenerHistorialFiltrado();
    if (!Array.isArray(movimientos) || !movimientos.length) {
      Utils.showToast('No hay movimientos para exportar.', 'warning');
      return;
    }

    const headers = ['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Valor', 'Stock', 'Referencia'];
    const rows = movimientos.map((mov) => {
      const fecha = Utils.formatDate(mov.fechaISO || mov.fecha, 'short') || mov.fecha || '';
      const cantidad = this.formatNumber(mov.cantidad, 2);
      const valor = Utils.formatCurrency(mov.total).replace(/[$,]/g, '');
      const stock = Number.isFinite(mov.stockNuevo)
        ? mov.stockNuevo
        : Number.isFinite(mov.stockActual)
          ? mov.stockActual
          : '';
      return [
        fecha,
        mov.productoNombre || 'Producto',
        mov.tipo,
        cantidad,
        valor,
        stock,
        mov.referenciaId || '',
      ];
    });

    const csv = [headers, ...rows]
      .map((fila) =>
        fila
          .map((celda) => {
            const texto = String(celda ?? '').replace(/"/g, '""');
            return `"${texto}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historial-inventario-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    Utils.showToast('Historial exportado', 'success');
  },

  actualizarResumenHistorial(movimientos = null, resumenOverride = null) {
    let resumen = resumenOverride;
    if (!resumen) {
      if (Array.isArray(movimientos)) {
        resumen = {
          totalMovimientos: movimientos.length,
          totalUnidades: movimientos.reduce((acc, mov) => acc + Number(mov.cantidad || 0), 0),
          totalValor: movimientos.reduce((acc, mov) => acc + Number(mov.total || 0), 0),
        };
      } else {
        resumen = this.state.historial.resumen || {
          totalMovimientos: 0,
          totalUnidades: 0,
          totalValor: 0,
        };
      }
    }

    this.state.historial.resumen = resumen;

    const domResumen = this.dom.historial?.resumen;
    if (domResumen?.movimientos) {
      domResumen.movimientos.textContent = resumen.totalMovimientos.toString();
    }
    if (domResumen?.unidades) {
      domResumen.unidades.textContent = this.formatNumber(resumen.totalUnidades);
    }
    if (domResumen?.valor) {
      domResumen.valor.textContent = Utils.formatCurrency(resumen.totalValor);
    }
  },

  normalizarResumenHistorial(resumenRaw = {}) {
    return {
      totalMovimientos: Number(resumenRaw.totalMovimientos ?? resumenRaw.movimientos ?? 0),
      totalUnidades: Number(resumenRaw.totalUnidades ?? resumenRaw.unidades ?? 0),
      totalValor: Number(resumenRaw.totalValor ?? resumenRaw.valor ?? 0),
    };
  },

  actualizarIndicadores() {
    const compras = this.state.compras;
    if (!Array.isArray(compras) || !compras.length) {
      if (this.dom.indicadorTotalMes) this.dom.indicadorTotalMes.textContent = '$0.00';
      if (this.dom.indicadorPendiente) this.dom.indicadorPendiente.textContent = '$0.00';
      return;
    }

    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    let totalMes = 0;
    let totalPendiente = 0;
    compras.forEach((compra) => {
      const normalizada = this.normalizarCompra(compra);
      const fecha = normalizada.fechaISO
        ? new Date(normalizada.fechaISO)
        : new Date(normalizada.fecha);
      if (fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
        totalMes += Number(normalizada.total || 0);
      }
      if ((normalizada.estadoPago || '').toLowerCase() !== 'pagado') {
        totalPendiente += Number(normalizada.total || 0) - Number(normalizada.montoPagado || 0);
      }
    });

    this.state.indicadores.totalMes = totalMes;
    this.state.indicadores.totalPendiente = totalPendiente;

    if (this.dom.indicadorTotalMes) {
      this.dom.indicadorTotalMes.textContent = Utils.formatCurrency(totalMes);
    }
    if (this.dom.indicadorPendiente) {
      this.dom.indicadorPendiente.textContent = Utils.formatCurrency(totalPendiente);
    }
  },

  normalizarMovimientoHistorial(raw = {}) {
    const movimiento = raw && typeof raw === 'object' ? raw : {};
    const tipo = (movimiento.tipo_movimiento || movimiento.tipo || 'compra').toLowerCase();
    const fechaTexto = movimiento.fecha || movimiento.created_at || '';
    let fechaISO = '';
    if (fechaTexto) {
      const fechaObj = new Date(fechaTexto);
      if (!Number.isNaN(fechaObj.getTime())) {
        fechaISO = fechaObj.toISOString();
      }
    }
    const cantidad = Number(movimiento.cantidad || 0);
    const precio = Number(movimiento.precio || movimiento.precio_unitario || movimiento.costo || 0);
    let total = Number(movimiento.total);
    if (!Number.isFinite(total)) {
      total = this.roundMoney(precio * cantidad);
    }
    const stockAnteriorRaw = movimiento.stock_anterior ?? movimiento.stockAnterior;
    const stockNuevoRaw = movimiento.stock_nuevo ?? movimiento.stockNuevo;
    const stockAnterior = Number.isFinite(Number(stockAnteriorRaw))
      ? Number(stockAnteriorRaw)
      : null;
    const stockNuevo = Number.isFinite(Number(stockNuevoRaw)) ? Number(stockNuevoRaw) : null;
    const delta = stockAnterior != null && stockNuevo != null ? stockNuevo - stockAnterior : null;

    return {
      id:
        movimiento.id ||
        movimiento.referencia_id ||
        (typeof Utils !== 'undefined' && typeof Utils.generateId === 'function'
          ? Utils.generateId()
          : `mov-${Date.now()}`),
      tipo,
      fecha: fechaTexto,
      fechaISO,
      hora: movimiento.hora || movimiento.hora_movimiento || '',
      productoId: movimiento.producto_id || movimiento.productoId || null,
      productoNombre:
        movimiento.producto_nombre ||
        movimiento.productoNombre ||
        movimiento.nombre_producto ||
        'Producto sin nombre',
      productoCodigo:
        movimiento.producto_codigo || movimiento.productoCodigo || movimiento.codigo_producto || '',
      cantidad: this.roundMoney(cantidad, 2),
      precio: this.roundMoney(precio),
      total: this.roundMoney(total),
      stockAnterior,
      stockNuevo,
      stockActual: Number.isFinite(Number(movimiento.stock_actual))
        ? Number(movimiento.stock_actual)
        : stockNuevo,
      stockMinimo: Number.isFinite(Number(movimiento.stock_minimo))
        ? Number(movimiento.stock_minimo)
        : null,
      categoriaId: movimiento.categoria_id || movimiento.categoriaId || null,
      referenciaId: movimiento.referencia_id || movimiento.referencia || null,
      usuario: movimiento.usuario || movimiento.usuario_nombre || '',
      stockNuevoDelta:
        delta != null
          ? delta >= 0
            ? `+${this.formatNumber(delta, 2)}`
            : this.formatNumber(delta, 2)
          : '',
    };
  },

  describeMovimiento(tipo = '') {
    const mapa = {
      compra: 'Compra',
      venta: 'Venta',
      ajuste_entrada: 'Ajuste (+)',
      ajuste_salida: 'Ajuste (-)',
      transferencia: 'Transferencia',
    };
    const normalized = (tipo || '').toLowerCase();
    return mapa[normalized] || normalized || 'Movimiento';
  },

  normalizarHistorialPageSize(value) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return this.state.historial.paginacion.pageSize;
    }
    return Math.max(10, Math.min(200, parsed));
  },

  irHistorialPagina(delta = 0) {
    const pag = this.state.historial.paginacion;
    const totalPages = Math.max(1, pag.totalPages || 1);
    const target = Math.max(1, Math.min(pag.page + delta, totalPages));
    if (target === pag.page) return;
    pag.page = target;
    this.cargarHistorialCompras();
  },

  normalizarCompra(raw = {}) {
    const compra = raw && typeof raw === 'object' ? raw : {};
    const numero = compra.numero || compra.numeroFactura || compra.numero_factura || '';
    const proveedorNombre = compra.proveedor_nombre || compra.proveedorNombre || '';
    const proveedorIdentificacion =
      compra.proveedor_identificacion || compra.proveedorIdentificacion || '';
    const estadoPago = (compra.estado_pago || compra.estadoPago || '').toLowerCase() || 'pendiente';
    const estado = compra.estado || 'completada';
    const subtotal = Number(compra.subtotal ?? compra.subtotalFactura ?? 0) || 0;
    const iva = Number(compra.iva ?? compra.ivaFactura ?? 0) || 0;
    const otros = Number(compra.otros_impuestos ?? compra.otrosImpuestos ?? 0) || 0;
    const total = Number(compra.total ?? compra.totalFactura ?? subtotal + iva + otros) || 0;
    const montoPagado = Number(compra.monto_pagado ?? compra.montoPagado ?? 0) || 0;
    const moneda = (compra.moneda || 'USD').toString().toUpperCase();
    const fechaTexto = compra.fecha || compra.fecha_emision || '';
    let fechaISO = '';
    if (fechaTexto) {
      const dateValue = new Date(fechaTexto);
      if (!Number.isNaN(dateValue.getTime())) {
        fechaISO = dateValue.toISOString();
      }
    }

    let metadata = compra.metadata;
    if (metadata && typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (error) {
        metadata = metadata;
      }
    }

    let items = compra.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (error) {
        items = [];
      }
    }
    if (!Array.isArray(items)) items = [];

    return {
      id: compra.id || Utils.generateId(),
      numero,
      fecha: fechaTexto,
      fechaISO,
      proveedorNombre,
      proveedorIdentificacion,
      estado,
      estadoPago,
      subtotal,
      iva,
      otros,
      total,
      montoPagado,
      moneda,
      notas: compra.notas || '',
      metadata,
      items,
      pdfNombre: compra.pdf_nombre || compra.pdfNombre || '',
      createdAt: compra.created_at || compra.createdAt || null,
      updatedAt: compra.updated_at || compra.updatedAt || null,
    };
  },

  guardarBorradorLocal() {
    Utils.showToast('Funcionalidad de borradores en desarrollo.', 'info');
    if (this.dom.footerStatus) {
      this.dom.footerStatus.textContent =
        'Borrador guardado localmente (pendiente de implementación).';
    }
  },

  construirPayloadFactura(editorData) {
    if (!editorData) {
      throw new Error('No hay datos para procesar.');
    }

    const ensureString = (value) => (value == null ? '' : String(value));
    const parsePositiveNumber = (value, precision = 2, options = {}) => {
      const { allowZero = true } = options;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return { value: NaN, isValid: false };
      }
      if (numeric < 0) {
        return { value: NaN, isValid: false };
      }
      if (!allowZero && numeric <= 0) {
        return { value: NaN, isValid: false };
      }
      const rounded = this.roundMoney(numeric, precision);
      if (!allowZero && rounded <= 0) {
        return { value: NaN, isValid: false };
      }
      return { value: rounded, isValid: allowZero ? rounded >= 0 : rounded > 0 };
    };

    const rawItems = Array.isArray(editorData.items) ? editorData.items : [];
    const invalidIndexes = [];
    const filteredItems = [];

    rawItems.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        return;
      }

      const descripcion = ensureString(item.descripcion || item.productoNombre || '').trim();
      const cantidadRaw = Number(item.cantidad);
      const precioRaw = Number(item.precioUnitario);
      const descuentoRaw = Number(item.descuento);
      const ivaRaw = Number(item.ivaPorcentaje);

      const descripcionEmpty = descripcion.length === 0;
      const cantidadEmpty = !Number.isFinite(cantidadRaw) || Math.abs(cantidadRaw) < 1e-9;
      const precioEmpty = !Number.isFinite(precioRaw) || Math.abs(precioRaw) < 1e-9;
      const descuentoEmpty = !Number.isFinite(descuentoRaw) || Math.abs(descuentoRaw) < 1e-9;

      if (descripcionEmpty && cantidadEmpty && precioEmpty && descuentoEmpty) {
        return;
      }

      const cantidadResult = parsePositiveNumber(cantidadRaw, 4, { allowZero: false });
      const precioResult = parsePositiveNumber(precioRaw, 2, { allowZero: true });
      const descuentoResult = parsePositiveNumber(descuentoRaw, 2, { allowZero: true });
      const ivaResult = parsePositiveNumber(ivaRaw, 2, { allowZero: true });

      const hasDescripcion = descripcion.length > 0;
      const cantidadValida = cantidadResult.isValid;
      const precioValido = Number.isFinite(precioResult.value) && precioResult.value >= 0;

      if (!hasDescripcion || !cantidadValida || !precioValido) {
        invalidIndexes.push(index + 1);
      }

      const cantidad = cantidadValida ? cantidadResult.value : 0;
      const precioUnitario = precioValido ? precioResult.value : 0;
      const descuento = Number.isFinite(descuentoResult.value)
        ? Math.max(descuentoResult.value, 0)
        : 0;
      const ivaPorcentaje = Number.isFinite(ivaResult.value) ? Math.max(ivaResult.value, 0) : 0;
      const base = Math.max(cantidad * precioUnitario - descuento, 0);
      const subtotal = this.roundMoney(base);
      const ivaMonto = this.roundMoney(base * (ivaPorcentaje / 100));
      const totalLinea = this.roundMoney(subtotal + ivaMonto);

      filteredItems.push({
        productoId: item.productoId || item.producto_id || null,
        codigo: ensureString(item.codigo || item.productoCodigo || ''),
        descripcion,
        nombre: descripcion,
        productoNombre: descripcion,
        unidad: ensureString(item.unidad || 'unidad').trim() || 'unidad',
        cantidad,
        precioUnitario,
        descuento,
        ivaPorcentaje,
        subtotal,
        ivaMonto,
        total: subtotal,
        totalLinea,
      });
    });

    if (invalidIndexes.length) {
      this.highlightInvalidItems(invalidIndexes);
      const label = invalidIndexes.length === 1 ? 'el ítem' : 'los ítems';
      const detail = invalidIndexes.join(', ');
      const error = new Error(
        `Corrige ${label} ${detail}: descripción, cantidad y precio deben ser válidos.`
      );
      error.code = 'INVALID_ITEMS';
      error.invalidItems = invalidIndexes;
      throw error;
    }

    this.highlightInvalidItems([]);

    if (!filteredItems.length) {
      throw new Error('La factura debe incluir al menos un ítem con datos válidos.');
    }

    let subtotalAcumulado = 0;
    let ivaAcumulado = 0;
    filteredItems.forEach((item) => {
      subtotalAcumulado += Number(item.subtotal || 0);
      ivaAcumulado += Number(item.ivaMonto || 0);
    });

    const subtotal = this.roundMoney(subtotalAcumulado);
    const iva = this.roundMoney(ivaAcumulado);
    const otros = this.roundMoney(editorData.otrosImpuestos || 0);
    const total = this.roundMoney(subtotal + iva + otros);

    const proveedorNombre = ensureString(editorData.proveedorNombre).trim();
    const proveedorIdentificacion = ensureString(editorData.proveedorIdentificacion).trim();
    const numeroFactura = ensureString(editorData.numeroFactura).trim();
    const fechaEmision = ensureString(editorData.fechaEmision).trim();

    if (!proveedorNombre || !numeroFactura || !fechaEmision) {
      throw new Error('Proveedor, número de factura y fecha son obligatorios.');
    }

    const metadata = {
      proveedorComercial: ensureString(editorData.proveedorComercial).trim(),
      proveedorEmail: ensureString(editorData.proveedorEmail).trim(),
      proveedorTelefono: ensureString(editorData.proveedorTelefono).trim(),
      proveedorDireccion: ensureString(editorData.proveedorDireccion).trim(),
      hora: ensureString(editorData.horaEmision).trim(),
      horaEmision: ensureString(editorData.horaEmision).trim(),
      formaPago: ensureString(editorData.formaPago).trim(),
    };

    Object.keys(metadata).forEach((key) => {
      if (!metadata[key]) {
        delete metadata[key];
      }
    });

    const montoPagadoResult = parsePositiveNumber(editorData.montoPagado, 2, { allowZero: true });
    let montoPagado = Number.isFinite(montoPagadoResult.value) ? montoPagadoResult.value : 0;
    if (montoPagado > total) {
      montoPagado = total;
    }

    const estadoPago = ensureString(editorData.estadoPago || 'pendiente').toLowerCase();

    const payload = {
      proveedorNombre,
      proveedorIdentificacion: proveedorIdentificacion || null,
      numero: numeroFactura,
      fecha: fechaEmision,
      moneda: ensureString(editorData.moneda || 'USD').trim() || 'USD',
      subtotal,
      iva,
      otrosImpuestos: otros,
      total,
      estadoPago,
      montoPagado,
      notas: ensureString(editorData.notas).trim(),
      metadata: Object.keys(metadata).length ? metadata : null,
      items: filteredItems,
    };

    if (editorData.pdfBase64 && editorData.pdfNombre) {
      payload.pdfBase64 = editorData.pdfBase64;
      payload.pdfNombre = editorData.pdfNombre;
      if (editorData.pdfSize) {
        payload.pdfSize = Number(editorData.pdfSize) || 0;
      }
    }

    return payload;
  },

  async guardarFacturaDesdeEditor() {
    if (!this.state.editorData) {
      Utils.showToast('No hay datos en el editor para guardar.', 'error');
      return;
    }

    const data = this.state.editorData;

    // Validaciones básicas
    if (
      !data.proveedorIdentificacion ||
      !data.proveedorNombre ||
      !data.numeroFactura ||
      !data.fechaEmision
    ) {
      Utils.showToast('Completa los datos del proveedor, número de factura y fecha.', 'error');
      return;
    }
    if (!data.items || data.items.length === 0) {
      Utils.showToast('La factura debe tener al menos un producto.', 'error');
      return;
    }

    if (this.dom.footerGuardar) this.dom.footerGuardar.disabled = true;
    if (this.dom.footerStatus) this.dom.footerStatus.textContent = 'Guardando...';

    try {
      this.recalcularTotalesEditor();
      const payload = this.construirPayloadFactura(data);
      const backendClient = this.getBackendClient();
      if (!backendClient) {
        throw new Error('El cliente de backend no está disponible.');
      }

      // El endpoint en server.js es /api/compras
      const endpoint = '/compras';
      const method = this.state.editorModo === 'crear' ? 'POST' : 'PATCH';
      const finalEndpoint =
        method === 'PATCH' ? `${endpoint}/${this.state.seleccionActual.id}` : endpoint;

      const response = await backendClient.request(finalEndpoint, {
        method,
        body: payload,
      });

      if (!response || response.success === false) {
        throw new Error(response.message || 'El servidor devolvió una respuesta inesperada.');
      }

      // Sincronizar productos desde servidor (igual que el flujo IA)
      const productosCreadosServidor = Array.isArray(response.productosCreados)
        ? response.productosCreados
        : [];
      const totalSincronizado = await this.sincronizarProductosDesdeServidor({
        productosCreados: productosCreadosServidor,
        actualizarPOS: productosCreadosServidor.length > 0,
        origen: 'compras-manual',
      });

      if (totalSincronizado && productosCreadosServidor.length > 0) {
        console.log(
          `🔄 Inventario sincronizado: ${productosCreadosServidor.length} productos creados, ${totalSincronizado} disponibles en POS.`
        );
      }

      Utils.showToast(
        `✅ Factura ${this.state.editorModo === 'crear' ? 'creada' : 'actualizada'} con éxito.${productosCreadosServidor.length > 0 ? `\n📦 ${productosCreadosServidor.length} productos agregados al inventario.` : ''}`,
        'success',
        5000
      );

      // Forzar la actualización de datos
      if (typeof DatabaseAPI !== 'undefined' && typeof DatabaseAPI.clearCache === 'function') {
        DatabaseAPI.clearCache();
      }

      await this.cargarCompras({ force: true });

      this.cerrarEditor();
      this.renderComprasTable();
      this.actualizarIndicadores();
    } catch (error) {
      console.error('Error al guardar la factura:', error);
      if (error.code === 'INVALID_ITEMS' && Array.isArray(error.invalidItems)) {
        Utils.showToast(`❌ ${error.message}`, 'error');
        if (this.dom.footerStatus)
          this.dom.footerStatus.textContent = 'Corrige los ítems resaltados.';
      } else {
        const message = error?.message || 'Error desconocido al guardar.';
        Utils.showToast(`❌ Error: ${message}`, 'error');
        if (
          typeof message === 'string' &&
          /ítems inválidos|items inválidos|posiciones/i.test(message)
        ) {
          const matches = message.match(/\d+/g);
          if (matches) {
            const invalidFromServer = matches.map(Number).filter((n) => Number.isFinite(n));
            if (invalidFromServer.length) {
              this.highlightInvalidItems(invalidFromServer);
            }
          }
        }
        if (this.dom.footerStatus) this.dom.footerStatus.textContent = 'Error al guardar.';
      }
    } finally {
      if (this.dom.footerGuardar) this.dom.footerGuardar.disabled = false;
    }
  },

  cerrarEditor() {
    if (this.state.editorDirty) {
      const confirmar = confirm(
        'Tienes cambios sin guardar. ¿Deseas cerrar el editor de todas formas?'
      );
      if (!confirmar) return;
    }

    if (this.dom.editorOverlay) {
      this.dom.editorOverlay.classList.remove('active');
    }

    this.state.seleccionActual = null;
    this.state.editorDirty = false;
  },

  seleccionarCompra(compra) {
    this.state.seleccionActual = compra;
    this.resetEditor('editar');
    this.renderComprasTable();
    if (this.dom.footerStatus) {
      this.dom.footerStatus.textContent = `Editando factura ${this.normalizarCompra(compra).numero || ''}`;
    }
  },

  verPDFCompra(compra) {
    if (!compra.pdf_base64 && !compra.pdf_nombre) {
      Utils.showToast('Esta compra no tiene PDF adjunto.', 'warning');
      return;
    }

    // Crear modal para mostrar PDF
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal-container" style="max-width: 90vw; max-height: 95vh;">
        <div class="modal-header">
          <h3><i class="fas fa-file-pdf"></i> ${compra.numero || 'Factura'}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body" style="padding: 0; height: 80vh;">
          <iframe 
            src="data:application/pdf;base64,${compra.pdf_base64}" 
            style="width: 100%; height: 100%; border: none;"
            title="Factura PDF">
          </iframe>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  async eliminarCompra(compra) {
    if (!compra) return;

    const referencia = compra.numero || compra.numeroFactura || compra.id || 'sin número';
    const confirmar = confirm(
      `¿Estás seguro de eliminar la factura ${referencia}?\n\nEsta acción eliminará la compra y todos sus productos del inventario.\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    try {
      const backendClient = this.getBackendClient();
      if (backendClient && typeof backendClient.eliminarCompra === 'function') {
        await backendClient.eliminarCompra(compra.id);
      } else {
        await this.requestBackend(`/compras/${compra.id}`, {
          method: 'DELETE',
        });
      }
      Utils.showToast('✅ Compra eliminada correctamente', 'success');

      // Recargar compras y actualizar UI
      await this.cargarCompras();
      this.renderComprasTable();
      this.actualizarIndicadores();

      // Cerrar editor si la compra eliminada estaba seleccionada
      if (this.state.seleccionActual?.id === compra.id) {
        this.cerrarEditor();
      }
    } catch (error) {
      console.error('Error eliminando compra:', error);
      Utils.showToast('❌ Error al eliminar la compra: ' + error.message, 'error');
    }
  },

  // ... (otras propiedades del módulo Compras)
  _iaFacturasStylesInjected: false,
  _iaExtractorStylesInjected: false,
  iaFacturasDefaults: Object.freeze({
    apiKey: '',
    model: '',
    temperature: 0.15,
    maxTokens: 8192,
    topP: 0.9,
    topK: 32,
    candidateCount: 1,
    retryLimit: 2,
    extractorMode: 'hybrid',
    enableStructured: true,
    enforceSchema: true,
    diagnostics: false,
    promptHint: '',
  }),
  iaFacturasConfigMap: Object.freeze({
    apiKey: 'ia_facturas_gemini_apikey',
    model: 'ia_facturas_gemini_model',
    temperature: 'ia_facturas_temperature',
    maxTokens: 'ia_facturas_max_tokens',
    topP: 'ia_facturas_top_p',
    topK: 'ia_facturas_top_k',
    candidateCount: 'ia_facturas_candidate_count',
    retryLimit: 'ia_facturas_retry_limit',
    extractorMode: 'ia_facturas_extractor_mode',
    enableStructured: 'ia_facturas_force_structured',
    enforceSchema: 'ia_facturas_enforce_schema',
    diagnostics: 'ia_facturas_diagnostics',
    promptHint: 'ia_facturas_prompt_hint',
  }),
  facturaIAReciente: null,
  comprasCache: [],
  productosBusquedaCache: new Map(),
  handleSuggestionsOutsideClick: null,
  PorHacer: {
    modalId: 'modalComprasPorHacer',
    cache: {
      items: [],
      history: [],
    },
    persistDebounced: null,

    init() {
      this.cache.items = [...(Database.getCollection('comprasPorHacer') || [])];
      this.cache.history = [...(Database.getCollection('comprasPorHacerHistorial') || [])];
      if (!this.persistDebounced) {
        this.persistDebounced = Utils.debounce(() => {
          Database.saveCollection('comprasPorHacer', this.cache.items);
          Database.saveCollection('comprasPorHacerHistorial', this.cache.history);
          this.actualizarIndicador();
          if (window.Catalogo && typeof Catalogo.actualizarContadores === 'function') {
            Catalogo.actualizarContadores();
          }
        }, 250);
      }
    },

    obtenerPendientes() {
      return (this.cache.items || []).length;
    },

    actualizarIndicador() {
      const badge = document.getElementById('comprasPorHacerBadge');
      if (badge) {
        badge.textContent = this.obtenerPendientes();
      }
    },

    abrir(options = {}) {
      this.init();
      if (options.prefill) {
        this.agregarManual(options.prefill);
      }
      this.renderModal(options.highlightId || null);
    },

    desdeCatalogo(producto) {
      this.init();
      const registro = this.crearDesdeProducto(producto);
      this.cache.items.unshift(registro);
      this.registrarHistorial(
        registro.id,
        'agregado',
        {
          origen: 'catalogo-tecnico',
          descripcion: `Agregado desde catálogo: ${producto.nombre}`,
        },
        registro
      );
      this.actualizarIndicador();
      if (window.Catalogo && typeof Catalogo.actualizarContadores === 'function') {
        Catalogo.actualizarContadores();
      }
      this.persistDebounced();
      this.renderModal(registro.id);
      Utils.showToast('Producto agregado a compras por hacer.', 'success');
    },

    crearDesdeProducto(producto) {
      const proveedor = (producto.proveedores || [])[0] || {};
      const compatibilidadTexto = (producto.compatibilidad || [])
        .map((ref) => [ref.marca, ref.modelo, ref.anios].filter(Boolean).join(' '))
        .filter(Boolean)
        .join('; ');

      return {
        id: Utils.generateId(),
        catalogoId: producto.id || null,
        sku: producto.sku || '',
        nombre: producto.nombre || 'Repuesto sin nombre',
        categoria: producto.categoria || '',
        subcategoria: producto.subcategoria || '',
        proveedores: producto.proveedores || [],
        proveedorSugerido: proveedor.nombre || '',
        cantidad: 1,
        unidad: 'unidad',
        precioObjetivo: Number(proveedor.costoReferencial || 0),
        totalPrevisto: Number(proveedor.costoReferencial || 0),
        notas: compatibilidadTexto ? `Compatibilidad: ${compatibilidadTexto}` : '',
        palabrasClave: producto.palabrasClave || [],
        status: 'pendiente',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        historial: [],
        recordatorioId: null,
        recordatorioEstado: null,
      };
    },

    renderModal(highlightId = null) {
      Utils.closeModal(this.modalId);
      const body = `
              <div class="cph-toolbar">
                <div>
                  <button class="btn btn-primary" data-action="agregar-manual">
                    <i class="fas fa-plus"></i> Agregar manualmente
                  </button>
                </div>
                <div class="cph-summary">${this.obtenerPendientes()} pendientes</div>
              </div>
              <div class="cph-content">
                <div class="cph-list" data-ref="lista">
                  ${this.renderLista(highlightId)}
                </div>
                <aside class="cph-history">
                  <h4>Historial</h4>
                  <div data-ref="historial">
                    ${this.renderHistorial()}
                  </div>
                </aside>
              </div>
            `;
      const footer = `
              <button class="btn btn-secondary" onclick="Utils.closeModal('${this.modalId}')">Cerrar</button>
            `;

      const overlay = Utils.createModal(
        this.modalId,
        '<i class="fas fa-clipboard-list"></i> Compras por hacer',
        body,
        footer,
        'large'
      );
      this.attachHandlers(overlay);
    },

    renderLista(highlightId = null) {
      if (!this.cache.items.length) {
        return '<div class="cph-empty"><i class="fas fa-clipboard-check"></i><p>No tienes compras pendientes. Agrega desde el catálogo o manualmente.</p></div>';
      }

      return this.cache.items
        .map((item) => {
          const proveedores = (item.proveedores || [])
            .map(
              (prov, idx) => `
                <option value="${idx}" ${prov.nombre === item.proveedorSugerido ? 'selected' : ''}>${Utils.sanitize(prov.nombre || `Proveedor ${idx + 1}`)}</option>
              `
            )
            .join('');

          const historial = (item.historial || [])
            .slice(-3)
            .map(
              (evento) => `
                <li>
                  <span>${Utils.formatDate(evento.timestamp, 'datetime')}</span>
                  <strong>${Utils.sanitize(evento.accion)}</strong>
                  ${evento.descripcion ? `<p>${Utils.sanitize(evento.descripcion)}</p>` : ''}
                </li>
              `
            )
            .join('');

          return `
                <article class="cph-item ${item.id === highlightId ? 'destacado' : ''}" data-id="${item.id}">
                  <header>
                    <div>
                      <h4>${Utils.sanitize(item.nombre)}</h4>
                      <span class="cph-sku">${Utils.sanitize(item.sku || 'Sin SKU')}</span>
                    </div>
                    <span class="badge badge-${this.obtenerColorEstado(item.status)}" data-ref="estado">${Utils.sanitize(item.status)}</span>
                  </header>
                  <div class="cph-grid">
                    <label>
                      Cantidad
                      <input type="number" min="1" step="0.01" data-field="cantidad" value="${item.cantidad}">
                    </label>
                    <label>
                      Unidad
                      <input type="text" data-field="unidad" value="${Utils.sanitize(item.unidad || '')}" placeholder="unidad, caja, juego…">
                    </label>
                    <label>
                      Precio objetivo
                      <input type="number" min="0" step="0.01" data-field="precioObjetivo" value="${item.precioObjetivo}">
                    </label>
                    <label>
                      Proveedor sugerido
                      <select data-field="proveedorSugerido">
                        <option value="">Selecciona proveedor</option>
                        ${proveedores}
                      </select>
                    </label>
                  </div>
                  <div class="cph-notas">
                    <label>
                      Notas / Compatibilidad
                      <textarea rows="2" data-field="notas" placeholder="Notas relevantes, compatibilidades, etc.">${Utils.sanitize(item.notas || '')}</textarea>
                    </label>
                  </div>
                  <div class="cph-total">
                    <span>Total estimado:</span>
                    <strong data-total="${item.id}">${Utils.formatCurrency(item.totalPrevisto || item.cantidad * item.precioObjetivo)}</strong>
                  </div>
                  ${
                    item.recordatorioId
                      ? `
                    <div class="cph-recordatorio" data-ref="recordatorio">
                      <i class="fas fa-bell"></i>
                      <span>Recordatorio ${Utils.sanitize(item.recordatorioEstado || 'pendiente')} para ${Utils.sanitize(item.recordatorioFecha || '')}</span>
                    </div>
                  `
                      : ''
                  }
                  <footer>
                    <div class="cph-actions">
                      <button class="btn btn-outline" data-action="guardar"><i class="fas fa-save"></i> Guardar</button>
                      <button class="btn btn-outline" data-action="recordatorio-rapido"><i class="fas fa-bolt"></i> Enviar directo a recordatorios</button>
                      <button class="btn btn-outline" data-action="recordatorio"><i class="fas fa-edit"></i> Editar y enviar a recordatorios</button>
                      <button class="btn btn-success" data-action="comprado"><i class="fas fa-check"></i> Marcar como comprado</button>
                      <button class="btn btn-danger" data-action="eliminar"><i class="fas fa-trash"></i></button>
                    </div>
                  </footer>
                  ${
                    historial
                      ? `
                    <details class="cph-historial">
                      <summary>Últimos movimientos</summary>
                      <ul>${historial}</ul>
                    </details>
                  `
                      : ''
                  }
                </article>
              `;
        })
        .join('');
    },

    renderHistorial() {
      if (!this.cache.history.length) {
        return '<p class="text-muted">Sin movimientos registrados.</p>';
      }

      return `<ul class="cph-history-list">${this.cache.history
        .slice(-20)
        .reverse()
        .map(
          (evento) => `
              <li>
                <time>${Utils.formatDate(evento.timestamp, 'datetime')}</time>
                <div>
                  <strong>${Utils.sanitize(evento.accion)}</strong>
                  ${evento.descripcion ? `<p>${Utils.sanitize(evento.descripcion)}</p>` : ''}
                  ${evento.proveedor ? `<small>Proveedor: ${Utils.sanitize(evento.proveedor)}</small>` : ''}
                </div>
              </li>
            `
        )
        .join('')}</ul>`;
    },

    attachHandlers(overlay) {
      const lista = overlay.querySelector('[data-ref="lista"]');
      const historial = overlay.querySelector('[data-ref="historial"]');

      const addManualBtn = overlay.querySelector('[data-action="agregar-manual"]');
      if (addManualBtn) {
        addManualBtn.addEventListener('click', () => this.agregarManual());
      } else {
        console.warn('[Compras] Botón "Agregar manual" no disponible en el modal actual.');
      }

      if (lista) {
        lista.addEventListener('input', (event) => {
          const campo = event.target.dataset.field;
          if (!campo) return;
          const item = event.target.closest('.cph-item');
          if (!item) return;
          this.actualizarCampo(item.dataset.id, campo, event.target.value, overlay);
        });

        lista.addEventListener('change', (event) => {
          const campo = event.target.dataset.field;
          if (!campo) return;
          const item = event.target.closest('.cph-item');
          if (!item) return;
          this.actualizarCampo(item.dataset.id, campo, event.target.value, overlay);
        });

        lista.addEventListener('click', (event) => {
          const action = event.target.closest('[data-action]');
          if (!action) return;
          const articulo = event.target.closest('.cph-item');
          if (!articulo) return;
          const id = articulo.dataset.id;
          switch (action.dataset.action) {
            case 'guardar':
              this.guardarInmediato();
              Utils.showToast('Cambios guardados.', 'success');
              break;
            case 'eliminar':
              this.eliminar(id, overlay);
              break;
            case 'comprado':
              this.marcarComprado(id, overlay);
              break;
            case 'recordatorio-rapido':
              this.enviarRecordatorio(id, { rapido: true }, overlay);
              break;
            case 'recordatorio':
              this.mostrarFormularioRecordatorio(id);
              break;
            default:
              break;
          }
        });
      }

      if (historial) {
        historial.addEventListener('click', (event) => {
          const link = event.target.closest('[data-abrir-item]');
          if (!link) return;
          const id = link.dataset.abrirItem;
          const card = overlay.querySelector(`.cph-item[data-id="${id}"]`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('destacado');
            setTimeout(() => card.classList.remove('destacado'), 1200);
          }
        });
      }
    },

    actualizarCampo(id, campo, valor, overlay) {
      const item = this.cache.items.find((reg) => reg.id === id);
      if (!item) return;
      const limpio = typeof valor === 'string' ? valor.trim() : valor;
      if (campo === 'cantidad' || campo === 'precioObjetivo') {
        const numero = Number(limpio);
        item[campo] = Number.isFinite(numero) ? numero : 0;
      } else if (campo === 'proveedorSugerido') {
        const idx = Number(limpio);
        if (Number.isInteger(idx) && item.proveedores && item.proveedores[idx]) {
          item.proveedorSugerido = item.proveedores[idx].nombre || '';
        } else {
          item.proveedorSugerido = limpio || '';
        }
      } else {
        item[campo] = limpio;
      }

      item.totalPrevisto = Number((item.precioObjetivo || 0) * (item.cantidad || 0));
      item.updatedAt = new Date().toISOString();
      const totalEl = overlay.querySelector(`[data-total="${id}"]`);
      if (totalEl) {
        totalEl.textContent = Utils.formatCurrency(item.totalPrevisto || 0);
      }
      this.persistDebounced();
    },

    guardarInmediato() {
      Database.saveCollection('comprasPorHacer', this.cache.items);
      Database.saveCollection('comprasPorHacerHistorial', this.cache.history);
      this.actualizarIndicador();
      if (window.Catalogo && typeof Catalogo.actualizarContadores === 'function') {
        Catalogo.actualizarContadores();
      }
    },

    eliminar(id, overlay) {
      const item = this.cache.items.find((reg) => reg.id === id);
      if (!item) return;
      Utils.showConfirm('¿Eliminar esta compra pendiente?', () => {
        this.cache.items = this.cache.items.filter((reg) => reg.id !== id);
        this.registrarHistorial(
          id,
          'eliminado',
          { descripcion: 'Eliminado de la lista de compras por hacer' },
          item
        );
        this.guardarInmediato();
        this.renderModal();
        Utils.showToast('Registro eliminado.', 'success');
      });
    },

    marcarComprado(id, overlay) {
      const item = this.cache.items.find((reg) => reg.id === id);
      if (!item) return;
      Utils.showConfirm('¿Marcar como comprado y mover al historial?', () => {
        this.cache.items = this.cache.items.filter((reg) => reg.id !== id);
        this.registrarHistorial(
          id,
          'comprado',
          {
            descripcion: `Marcado como comprado (${item.cantidad} x ${Utils.formatCurrency(item.precioObjetivo)}).`,
            proveedor: item.proveedorSugerido || null,
          },
          item
        );
        this.guardarInmediato();
        this.renderModal();
        Utils.showToast('Movimiento registrado como comprado.', 'success');
      });
    },

    registrarHistorial(id, accion, detalles = {}, snapshot = null) {
      const session = typeof Auth !== 'undefined' ? Auth.getSession() : null;
      const evento = {
        id: Utils.generateId(),
        entradaId: id,
        accion,
        descripcion: detalles.descripcion || '',
        proveedor: detalles.proveedor || '',
        usuario: session?.nombre || 'Sistema',
        usuarioId: session?.userId || null,
        timestamp: new Date().toISOString(),
        snapshot: snapshot
          ? {
              nombre: snapshot.nombre,
              sku: snapshot.sku,
              cantidad: snapshot.cantidad,
              precioObjetivo: snapshot.precioObjetivo,
              proveedorSugerido: snapshot.proveedorSugerido,
            }
          : null,
      };

      const item = this.cache.items.find((reg) => reg.id === id);
      if (item) {
        item.historial = [...(item.historial || []), evento];
      }
      this.cache.history.push(evento);
    },

    agregarManual(prefill = null) {
      const modalId = 'modalComprasPorHacerNuevo';
      Utils.closeModal(modalId);
      const body = `
              <div class="form-grid">
                <div class="form-group">
                  <label>Nombre del repuesto *</label>
                  <input type="text" name="nombre" value="${Utils.sanitize(prefill?.nombre || '')}" required>
                </div>
                <div class="form-group">
                  <label>SKU / Código</label>
                  <input type="text" name="sku" value="${Utils.sanitize(prefill?.sku || '')}">
                </div>
                <div class="form-group">
                  <label>Proveedor sugerido</label>
                  <input type="text" name="proveedorSugerido" value="${Utils.sanitize(prefill?.proveedorSugerido || '')}">
                </div>
                <div class="form-group">
                  <label>Cantidad</label>
                  <input type="number" name="cantidad" min="1" step="0.01" value="${prefill?.cantidad || 1}">
                </div>
                <div class="form-group">
                  <label>Unidad</label>
                  <input type="text" name="unidad" value="${Utils.sanitize(prefill?.unidad || 'unidad')}">
                </div>
                <div class="form-group">
                  <label>Precio objetivo</label>
                  <input type="number" name="precioObjetivo" min="0" step="0.01" value="${prefill?.precioObjetivo || 0}">
                </div>
                <div class="form-group full">
                  <label>Notas</label>
                  <textarea name="notas" rows="3">${Utils.sanitize(prefill?.notas || '')}</textarea>
                </div>
              </div>
            `;
      const footer = `
              <button class="btn btn-secondary" type="button" onclick="Utils.closeModal('${modalId}')">Cancelar</button>
              <button class="btn btn-primary" type="submit">Agregar</button>
            `;
      const overlay = Utils.createModal(modalId, 'Nueva compra por hacer', body, footer, 'large');
      const form = overlay.querySelector('form');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const registro = {
          id: Utils.generateId(),
          catalogoId: null,
          nombre: data.get('nombre'),
          sku: data.get('sku') || '',
          proveedorSugerido: data.get('proveedorSugerido') || '',
          proveedores: [],
          cantidad: Number(data.get('cantidad') || '1'),
          unidad: data.get('unidad') || 'unidad',
          precioObjetivo: Number(data.get('precioObjetivo') || '0'),
          totalPrevisto:
            Number(data.get('cantidad') || '1') * Number(data.get('precioObjetivo') || '0'),
          notas: data.get('notas') || '',
          palabrasClave: [],
          status: 'pendiente',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          historial: [],
          recordatorioId: null,
          recordatorioEstado: null,
        };
        this.cache.items.unshift(registro);
        this.registrarHistorial(
          registro.id,
          'agregado',
          { descripcion: 'Agregado manualmente' },
          registro
        );
        this.actualizarIndicador();
        if (window.Catalogo && typeof Catalogo.actualizarContadores === 'function') {
          Catalogo.actualizarContadores();
        }
        this.guardarInmediato();
        Utils.closeModal(modalId);
        this.renderModal(registro.id);
        Utils.showToast('Registro agregado.', 'success');
      });
    },

    mostrarFormularioRecordatorio(id) {
      const item = this.cache.items.find((reg) => reg.id === id);
      if (!item) return;
      const modalId = 'modalComprasRecordatorio';
      Utils.closeModal(modalId);
      const body = `
              <div class="form-grid">
                <div class="form-group">
                  <label>Título</label>
                  <input type="text" name="titulo" value="Comprar ${Utils.sanitize(item.nombre)}" required>
                </div>
                <div class="form-group">
                  <label>Fecha</label>
                  <input type="date" name="fecha" value="${Utils.getCurrentDate()}" required>
                </div>
                <div class="form-group">
                  <label>Hora</label>
                  <input type="time" name="hora" value="${Utils.getCurrentTime()}" required>
                </div>
                <div class="form-group">
                  <label>Prioridad</label>
                  <select name="prioridad">
                    <option value="alta" selected>Alta</option>
                    <option value="urgente">Urgente</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Descripción</label>
                  <textarea name="descripcion" rows="3">${Utils.sanitize(item.notas || '')}</textarea>
                </div>
              </div>
            `;
      const footer = `
              <button class="btn btn-secondary" type="button" onclick="Utils.closeModal('${modalId}')">Cancelar</button>
              <button class="btn btn-primary" type="submit">Guardar recordatorio</button>
            `;
      const overlay = Utils.createModal(modalId, 'Enviar a recordatorios', body, footer, 'large');
      const form = overlay.querySelector('form');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const modalPrincipal = document.getElementById(this.modalId);
        this.enviarRecordatorio(
          id,
          {
            titulo: data.get('titulo'),
            fecha: data.get('fecha'),
            hora: data.get('hora'),
            prioridad: data.get('prioridad'),
            descripcion: data.get('descripcion'),
          },
          modalPrincipal
        );
        Utils.closeModal(modalId);
        Utils.showToast('Recordatorio creado.', 'success');
      });
    },

    enviarRecordatorio(id, opciones = {}, overlay = document) {
      const item = this.cache.items.find((reg) => reg.id === id);
      if (!item) return;

      const fecha = opciones.fecha || Utils.getCurrentDate();
      const hora = opciones.hora || Utils.getCurrentTime();
      const prioridad = opciones.prioridad || 'alta';
      const descripcionBase =
        opciones.descripcion ||
        item.notas ||
        `${item.cantidad} ${item.unidad} - proveedor ${item.proveedorSugerido || 'por definir'}`;
      const titulo = opciones.titulo || `Comprar ${item.nombre}`;

      const recordatorio = {
        id: Utils.generateId(),
        titulo,
        descripcion: descripcionBase,
        fecha,
        hora,
        tipo: 'reabastecimiento',
        prioridad,
        recurrente: 'ninguno',
        completado: false,
        origen: 'comprasPorHacer',
        datosCompra: {
          compraPorHacerId: item.id,
          sku: item.sku,
          proveedor: item.proveedorSugerido,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      Database.add('recordatorios', recordatorio);
      item.recordatorioId = recordatorio.id;
      item.recordatorioEstado = 'pendiente';
      item.recordatorioFecha = fecha;
      item.updatedAt = new Date().toISOString();
      this.registrarHistorial(
        id,
        'recordatorio',
        {
          descripcion: `Recordatorio creado para ${Utils.formatDate(fecha, 'long')} ${hora}`,
          proveedor: item.proveedorSugerido,
        },
        item
      );
      this.persistDebounced();
      if (overlay) {
        const card = overlay.querySelector(`.cph-item[data-id="${id}"]`);
        if (card) {
          let recordatorioEl = card.querySelector('.cph-recordatorio');
          const markup = `<i class="fas fa-bell"></i><span>Recordatorio pendiente para ${Utils.sanitize(fecha)} ${Utils.sanitize(hora)}</span>`;
          if (!recordatorioEl) {
            recordatorioEl = document.createElement('div');
            recordatorioEl.className = 'cph-recordatorio';
            recordatorioEl.innerHTML = markup;
            const totalBlock = card.querySelector('.cph-total');
            if (totalBlock) {
              totalBlock.insertAdjacentElement('afterend', recordatorioEl);
            } else {
              card.insertBefore(recordatorioEl, card.querySelector('footer'));
            }
          } else {
            recordatorioEl.innerHTML = markup;
          }
        }
      }
      Utils.showToast('Recordatorio enviado.', 'success');
    },

    obtenerColorEstado(estado) {
      const mapa = {
        pendiente: 'warning',
        comprado: 'success',
        eliminado: 'danger',
      };
      return mapa[(estado || '').toLowerCase()] || 'info';
    },
  },
  filtrarCompras(termino = '', fuente = this.comprasCache) {
    const terminoNormalizado = (termino || '').toString().trim();
    this.state.filtros.busqueda = terminoNormalizado;
    if (Array.isArray(fuente)) {
      this.state.compras = fuente.slice();
    }
    this.renderComprasTable();
  },

  resetProductoSugerencias() {
    this.productosBusquedaCache = new Map();
  },

  obtenerContenedorSugerencias(row) {
    if (!row) return null;
    return row.querySelector('.ia-producto-sugerencias');
  },

  ocultarSugerenciasFila(row) {
    const contenedor = this.obtenerContenedorSugerencias(row);
    if (!contenedor) return;
    contenedor.hidden = true;
    contenedor.innerHTML = '';
    if (row && row.dataset) {
      delete row.dataset.suggestionsToken;
    }
  },

  ocultarTodasSugerencias() {
    document.querySelectorAll('.ia-producto-sugerencias').forEach((contenedor) => {
      contenedor.hidden = true;
      contenedor.innerHTML = '';
    });
  },

  limpiarAsignacionProducto(row) {
    if (!row) return;
    delete row.dataset.productId;

    const wrapper = row.querySelector('.ia-producto-cell');
    if (wrapper) {
      wrapper.dataset.productoId = '';
      wrapper.dataset.productoCodigo = '';
    }

    const nombreInput = row.querySelector('input[name="nombre"]');
    if (nombreInput) {
      nombreInput.dataset.productoId = '';
    }

    const badge = row.querySelector('.ia-producto-asignado');
    if (badge) {
      badge.classList.remove('visible');
      const texto = badge.querySelector('span');
      if (texto) texto.textContent = '';
    }
  },

  mostrarAsignacionProducto(row, producto) {
    if (!row) return;
    if (!producto) {
      this.limpiarAsignacionProducto(row);
      return;
    }

    row.dataset.productId = producto.id || '';

    const wrapper = row.querySelector('.ia-producto-cell');
    if (wrapper) {
      wrapper.dataset.productoId = producto.id || '';
      wrapper.dataset.productoCodigo = producto.codigo || '';
    }

    const nombreInput = row.querySelector('input[name="nombre"]');
    if (nombreInput && producto.nombre) {
      nombreInput.dataset.productoId = producto.id || '';
      nombreInput.value = producto.nombre;
    }

    const badge = row.querySelector('.ia-producto-asignado');
    if (badge) {
      const texto = badge.querySelector('span');
      if (texto) {
        const partes = [];
        if (producto.codigo) partes.push(producto.codigo);
        if (producto.nombre) partes.push(producto.nombre);
        texto.textContent = partes.filter(Boolean).join(' · ');
      }
      badge.classList.add('visible');
    }
  },

  backendClient: null,

  getBackendClient() {
    if (this.backendClient && typeof this.backendClient.request === 'function') {
      return this.backendClient;
    }

    const candidate =
      typeof Database !== 'undefined' && Database && typeof Database.request === 'function'
        ? Database
        : window.DatabaseAPI && typeof window.DatabaseAPI.request === 'function'
          ? window.DatabaseAPI
          : null;

    if (candidate) {
      this.backendClient = candidate;
      return this.backendClient;
    }

    return null;
  },

  normalizeBackendEndpoint(endpoint = '') {
    if (!endpoint) {
      return '/';
    }

    let normalized = endpoint.trim();
    if (!normalized.startsWith('/')) {
      normalized = `/${normalized}`;
    }

    if (normalized === '/api') {
      return '/';
    }

    if (normalized.startsWith('/api/')) {
      normalized = normalized.replace(/^\/api/, '') || '/';
    }

    return normalized || '/';
  },

  buildFallbackUrl(endpoint) {
    const normalized = this.normalizeBackendEndpoint(endpoint);
    const suffix = normalized === '/' ? '' : normalized;
    const path = `/api${suffix}`;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    if (window.Utils && typeof window.Utils.apiUrl === 'function') {
      return window.Utils.apiUrl(normalizedPath);
    }

    if (window.DatabaseAPI && typeof window.DatabaseAPI.getBaseUrl === 'function') {
      const base = (window.DatabaseAPI.getBaseUrl() || '').replace(/\/+$/, '');
      if (base) {
        const finalPath =
          base.endsWith('/api') && normalizedPath.startsWith('/api')
            ? normalizedPath.replace(/^\/api/, '')
            : normalizedPath;
        return `${base}${finalPath}`;
      }
    }

    return normalizedPath;
  },

  async requestBackend(endpoint, options = {}) {
    // Para operaciones críticas como guardar compras, siempre usar fetch con CSRF
    const isCriticalOperation =
      endpoint.includes('/compras') &&
      (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH');
    const forceFetch = options.forceFetch === true;
    if (forceFetch) {
      delete options.forceFetch;
    }

    const client = this.getBackendClient();
    if (client && typeof client.request === 'function' && !isCriticalOperation && !forceFetch) {
      return client.request(this.normalizeBackendEndpoint(endpoint), options);
    }

    const method = (options.method || 'GET').toUpperCase();
    const hasBody = Object.prototype.hasOwnProperty.call(options, 'body');
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const baseHeaders = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    const applyAuthHeaders = (headers) => {
      if (
        typeof window !== 'undefined' &&
        window.DatabaseAPI &&
        typeof window.DatabaseAPI.getHeaders === 'function'
      ) {
        return window.DatabaseAPI.getHeaders(headers);
      }

      const enriched = { ...headers };

      if (method !== 'GET' && method !== 'HEAD' && !isFormData && !enriched['Content-Type']) {
        enriched['Content-Type'] = 'application/json';
      }

      let negocioHeader = null;
      try {
        if (typeof Auth !== 'undefined' && typeof Auth.getCurrentBusinessId === 'function') {
          negocioHeader = Auth.getCurrentBusinessId();
        }
        if (!negocioHeader && typeof localStorage !== 'undefined') {
          negocioHeader =
            localStorage.getItem('negocio_actual') || localStorage.getItem('negocio_login');
        }
      } catch (headerError) {
        console.warn('[Compras] No se pudo determinar X-Negocio-Id:', headerError);
      }

      if (negocioHeader && !enriched['X-Negocio-Id']) {
        enriched['X-Negocio-Id'] = negocioHeader;
      }

      if (
        !enriched.Authorization &&
        typeof Auth !== 'undefined' &&
        typeof Auth.getAccessToken === 'function'
      ) {
        const token = Auth.getAccessToken();
        if (token) {
          enriched.Authorization = `Bearer ${token}`;
        }
      }

      return enriched;
    };

    const fetchConfig = {
      method,
      headers: applyAuthHeaders(baseHeaders),
      credentials: options.credentials || 'include',
    };

    if (method !== 'GET' && method !== 'HEAD') {
      const csrfToken = await this.getCsrfToken();
      if (csrfToken) {
        fetchConfig.headers['x-csrf-token'] = csrfToken;
      }
      if (hasBody) {
        if (isFormData) {
          fetchConfig.body = options.body;
          delete fetchConfig.headers['Content-Type'];
        } else {
          fetchConfig.body =
            typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        }
      }
    } else if (isFormData && hasBody) {
      fetchConfig.body = options.body;
      delete fetchConfig.headers['Content-Type'];
    }

    const url = this.buildFallbackUrl(endpoint);
    let response = await fetch(url, fetchConfig);

    // Manejo especial de errores CSRF - reintentar una vez
    if (!response.ok && response.status === 403) {
      const errorText = await response.text();
      if (errorText.toLowerCase().includes('csrf')) {
        console.warn('[Compras] Error CSRF detectado, obteniendo nuevo token y reintentando...');
        this.csrfToken = null;
        this.csrfPromise = null;

        const newCsrfToken = await this.getCsrfToken();
        fetchConfig.headers['x-csrf-token'] = newCsrfToken;

        response = await fetch(url, fetchConfig);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Compras] Error en la petición a ${url}:`, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `HTTP ${response.status}: ${response.statusText}`);
      } catch (e) {
        // Si la respuesta de error no es JSON, muestra el HTML/texto.
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.response = errorText; // Adjunta la respuesta para depuración
        throw error;
      }
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return null;
  },

  asignarProductoAFila(row, producto) {
    if (!row) return;

    if (!producto) {
      this.limpiarAsignacionProducto(row);
      this.ocultarSugerenciasFila(row);
      this.recalcularTotalCompraIA();
      return;
    }

    const descripcionInput = row.querySelector('input[name="descripcion"]');
    const precioInput = row.querySelector('input[name="precioUnitario"]');
    const unidadInput = row.querySelector('input[name="unidad"]');
    const categoriaSelect = row.querySelector('select[name="categoriaId"]');
    const proveedorSelect = row.querySelector('select[name="proveedorId"]');

    this.mostrarAsignacionProducto(row, producto);

    if (descripcionInput && !descripcionInput.value && producto.descripcion) {
      descripcionInput.value = producto.descripcion;
    }

    if (unidadInput && !unidadInput.value && producto.unidad) {
      unidadInput.value = producto.unidad;
    }

    if (precioInput) {
      const precioActual = parseFloat(precioInput.value);
      const precioCatalogo = Number(producto.precioCompra ?? producto.precio_compra ?? 0);
      if (
        (!Number.isFinite(precioActual) || precioActual <= 0) &&
        Number.isFinite(precioCatalogo) &&
        precioCatalogo > 0
      ) {
        precioInput.value = precioCatalogo.toFixed(2);
      }
    }

    if (categoriaSelect) {
      const categoriaId = producto.categoriaId || producto.categoria_id || '';
      const categoriaNombre = producto.categoriaNombre || producto.categoria_nombre || '';
      this.selectOptionByValue(categoriaSelect, categoriaId, categoriaNombre);
      row.dataset.categoriaId = (categoriaSelect.value || '').trim();
      row.dataset.categoriaNombre =
        categoriaSelect.options[categoriaSelect.selectedIndex]?.text?.trim() ||
        categoriaNombre ||
        '';
    }

    if (proveedorSelect) {
      const proveedorId = producto.proveedorId || producto.proveedor_id || '';
      const proveedorNombre = producto.proveedorNombre || producto.proveedor_nombre || '';
      const proveedorDocumento = this.normalizeDocumento(
        producto.proveedorIdentificacion ||
          producto.proveedorDocumento ||
          producto.proveedorRuc ||
          producto.proveedor_ruc ||
          ''
      );
      this.selectOptionByValue(proveedorSelect, proveedorId, proveedorNombre);
      row.dataset.proveedorId = (proveedorSelect.value || '').trim();
      row.dataset.proveedorNombre =
        proveedorSelect.options[proveedorSelect.selectedIndex]?.text?.trim() ||
        proveedorNombre ||
        '';
      if (proveedorDocumento) {
        row.dataset.proveedorDocumento = proveedorDocumento;
      }
    }

    if (producto.codigo) {
      row.dataset.codigo = producto.codigo;
    }

    this.ocultarSugerenciasFila(row);
    this.recalcularTotalCompraIA();
  },

  async buscarProductosEnCatalogo(termino, limite = 8) {
    const limpio = (termino || '').trim();
    if (limpio.length < 2) return [];

    const clave = limpio.toLowerCase();
    const ahora = Date.now();
    const cache = this.productosBusquedaCache.get(clave);
    if (cache && ahora - cache.timestamp < 5 * 60 * 1000) {
      return cache.items;
    }

    const params = new URLSearchParams({
      q: limpio,
      limit: String(Math.min(Math.max(limite, 1), 30)),
    });

    try {
      const data = await this.requestBackend(`/productos/buscar?${params.toString()}`);
      const items = Array.isArray(data) ? data : [];

      if (this.productosBusquedaCache.size > 25) {
        const firstKey = this.productosBusquedaCache.keys().next().value;
        if (firstKey) this.productosBusquedaCache.delete(firstKey);
      }

      this.productosBusquedaCache.set(clave, { timestamp: ahora, items });
      return items;
    } catch (error) {
      console.error('Error buscando productos en catálogo:', error);
      return [];
    }
  },

  async sugerirProductosParaFila(row, termino, forzar = false) {
    if (!row) return;
    const contenedor = this.obtenerContenedorSugerencias(row);
    if (!contenedor) return;

    const valor = (termino || '').trim();
    if (!valor || (!forzar && valor.length < 2)) {
      this.ocultarSugerenciasFila(row);
      return;
    }

    const token = `${row.dataset.index || ''}-${valor.toLowerCase()}`;
    row.dataset.suggestionsToken = token;

    contenedor.hidden = false;
    contenedor.innerHTML =
      '<div class="ia-producto-suggestion ia-producto-suggestion-empty">Buscando coincidencias...</div>';

    const resultados = await this.buscarProductosEnCatalogo(valor);
    if (row.dataset.suggestionsToken !== token) {
      return;
    }

    if (!resultados.length) {
      contenedor.innerHTML =
        '<div class="ia-producto-suggestion ia-producto-suggestion-empty">Sin coincidencias en el catálogo.</div>';
      return;
    }

    contenedor.innerHTML = resultados
      .map((producto) => {
        const detallePartes = [];
        if (producto.codigo) detallePartes.push(producto.codigo);
        const precioBase = Number(producto.precioCompra ?? producto.precio_compra ?? 0);
        detallePartes.push(Utils.formatCurrency(precioBase));
        const proveedorTexto = producto.proveedorNombre || producto.proveedor_nombre;
        if (proveedorTexto) detallePartes.push(proveedorTexto);
        const detalle = detallePartes.filter(Boolean).join(' · ');

        return `
        <button type="button" class="ia-producto-suggestion" data-id="${Utils.escapeHTML(producto.id || '')}"
          data-nombre="${Utils.escapeHTML(producto.nombre || '')}"
          data-codigo="${Utils.escapeHTML(producto.codigo || '')}"
          data-precio="${Number.isFinite(precioBase) ? precioBase.toFixed(2) : ''}"
          data-descripcion="${Utils.escapeHTML(producto.descripcion || '')}"
          data-proveedor="${Utils.escapeHTML(proveedorTexto || '')}"
          data-proveedor-id="${Utils.escapeHTML(producto.proveedorId || producto.proveedor_id || '')}"
          data-proveedor-doc="${Utils.escapeHTML(this.normalizeDocumento(producto.proveedorIdentificacion || producto.proveedorDocumento || producto.proveedorRuc || producto.proveedor_ruc || ''))}"
          data-categoria-id="${Utils.escapeHTML(producto.categoriaId || producto.categoria_id || '')}"
          data-categoria-nombre="${Utils.escapeHTML(producto.categoriaNombre || producto.categoria_nombre || '')}">
          <span class="ia-producto-suggestion-titulo">${Utils.escapeHTML(producto.nombre || '')}</span>
          <span class="ia-producto-suggestion-detalle">${Utils.escapeHTML(detalle)}</span>
        </button>
      `;
      })
      .join('');

    contenedor.querySelectorAll('.ia-producto-suggestion').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const producto = {
          id: button.dataset.id || '',
          nombre: button.dataset.nombre || '',
          codigo: button.dataset.codigo || '',
          precioCompra: Number(button.dataset.precio || '0'),
          descripcion: button.dataset.descripcion || '',
          proveedorNombre: button.dataset.proveedor || '',
          proveedorId: button.dataset.proveedorId || '',
          proveedorIdentificacion: button.dataset.proveedorDoc || '',
          categoriaId: button.dataset.categoriaId || '',
          categoriaNombre: button.dataset.categoriaNombre || '',
        };
        this.asignarProductoAFila(row, producto);
      });
    });
  },

  // ... (otras funciones del módulo como filtrar, ver detalle, etc.)

  // ============================================
  // FUNCIONALIDAD DE IA PARA FACTURAS (CORREGIDA)
  // ============================================

  async mostrarConfiguracionFacturas() {
    try {
      const config = await this.requestBackend('/configuracion');
      const normalized = this.normalizeIaFacturasConfig(config || {});
      this.ensureIaFacturasStyles();

      Utils.closeModal('modalConfigFacturasIA');

      const body = this.renderIaFacturasModalBody(normalized);
      const footer = `
        <div class="ia-facturas-footer">
          <div class="ia-facturas-footer-status" data-role="ia-status-message"></div>
          <div class="ia-facturas-footer-actions">
            <button type="button" class="btn btn-secondary" data-action="close-modal">Cerrar</button>
            <button type="button" class="btn btn-primary" data-action="save-config" disabled>
              <i class="fas fa-save"></i> Guardar cambios
            </button>
          </div>
        </div>
      `;

      const modal = Utils.createModal(
        'modalConfigFacturasIA',
        '<i class="fas fa-robot"></i> Configuración avanzada de IA para Facturas (Gemini)',
        body,
        footer,
        'extra-wide'
      );
      modal.__iaFacturasState = {
        original: normalized,
        current: { ...normalized },
        loadingModels: false,
      };

      this.attachIaFacturasModalHandlers(modal);
      this.updateIaFacturasSummary(modal);

      if (normalized.apiKey) {
        this.actualizarModelosFacturas({ modal, silent: true, savedModel: normalized.model });
      } else {
        this.seedIaFacturasModelSelect(modal, normalized.model);
      }
    } catch (error) {
      Utils.showToast(`Error al cargar la configuración: ${error.message}`, 'error');
    }
  },

  ensureIaFacturasStyles() {
    if (this._iaFacturasStylesInjected) return;
    const style = document.createElement('style');
    style.id = 'ia-facturas-advanced-styles';
    style.textContent = `
      .ia-facturas-modal { display: flex; flex-direction: column; gap: 1.5rem; }
      .ia-facturas-grid { display: grid; gap: 1.25rem; }
      .ia-facturas-grid--double { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
      .ia-facturas-card { background: var(--card-bg, #fff); border-radius: 14px; padding: 1.25rem; box-shadow: 0 12px 24px rgba(15, 69, 88, 0.1); border: 1px solid rgba(15, 69, 88, 0.08); display: flex; flex-direction: column; gap: 1rem; }
      .ia-facturas-card header { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #0f4558; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.04em; }
      .ia-facturas-card header i { color: #2196f3; }
      .ia-field { display: flex; flex-direction: column; gap: 0.4rem; }
      .ia-field label { font-weight: 600; color: #134257; }
      .ia-field small { color: #607d8b; font-size: 0.78rem; }
      .ia-input-group { display: flex; gap: 0.5rem; align-items: stretch; }
      .ia-input-group .btn, .ia-input-group button { min-width: 42px; }
      .ia-input-group button[data-action] { border: 1px solid rgba(33,150,243,0.25); border-radius: 10px; background: rgba(33,150,243,0.08); color: #0f4558; transition: background 0.2s ease, color 0.2s ease, border 0.2s ease; }
      .ia-input-group button[data-action]:hover { background: rgba(33,150,243,0.15); color: #0c3441; }
      .ia-slider-field { display: flex; flex-direction: column; gap: 0.35rem; }
      .ia-slider-field label { display: flex; justify-content: space-between; align-items: center; font-weight: 600; color: #134257; }
      .ia-slider-field input[type="range"] { accent-color: #1f8bcb; }
      .ia-slider-value { font-variant-numeric: tabular-nums; font-weight: 600; color: #0f4558; background: rgba(33,150,243,0.1); padding: 0.25rem 0.65rem; border-radius: 999px; }
      .ia-segmented { display: inline-flex; padding: 0.25rem; border-radius: 14px; background: rgba(15,69,88,0.08); border: 1px solid rgba(15,69,88,0.12); }
      .ia-segmented button { border: none; background: transparent; padding: 0.45rem 0.95rem; border-radius: 10px; font-weight: 600; color: #134257; transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease; }
      .ia-segmented button.active { background: #2196f3; color: #fff; box-shadow: 0 6px 18px rgba(33,150,243,0.25); }
      .ia-toggle { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem; border-radius: 12px; border: 1px solid rgba(15,69,88,0.1); background: rgba(15,69,88,0.03); transition: border 0.2s ease, background 0.2s ease; }
      .ia-toggle:hover { border-color: rgba(33,150,243,0.4); background: rgba(33,150,243,0.06); }
      .ia-toggle input[type="checkbox"] { width: 44px; height: 24px; accent-color: #2196f3; }
      .ia-toggle span { font-weight: 500; color: #0f4558; }
      .ia-facturas-status-card { display: flex; flex-direction: column; gap: 0.75rem; background: linear-gradient(145deg, rgba(33,150,243,0.07), rgba(15,69,88,0.08)); border: 1px solid rgba(15,69,88,0.15); }
      .ia-status-tag { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem; border-radius: 999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(76,175,80,0.15); color: #1b5e20; }
      .ia-status-tag.warning { background: rgba(255,152,0,0.2); color: #e65100; }
      .ia-status-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; font-size: 0.85rem; color: #0f4558; }
      .ia-status-list li { display: flex; gap: 0.5rem; align-items: center; background: rgba(255,255,255,0.6); padding: 0.4rem 0.65rem; border-radius: 10px; }
      .ia-status-list i { color: #2196f3; }
      .ia-facturas-footer { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 1rem; }
      .ia-facturas-footer-actions { display: flex; gap: 0.75rem; }
      .ia-facturas-footer-status { font-size: 0.85rem; color: #0f4558; font-weight: 500; }
      .ia-facturas-actions-row { display: flex; gap: 0.65rem; flex-wrap: wrap; }
      .ia-facturas-actions-row .btn { flex: 1; min-width: 160px; }
      .ia-hint-area textarea { resize: vertical; min-height: 110px; border-radius: 12px; border: 1px solid rgba(15,69,88,0.12); padding: 0.75rem; }
      @media (max-width: 840px) {
        .ia-facturas-grid--double { grid-template-columns: 1fr; }
        .ia-facturas-footer { flex-direction: column; align-items: stretch; }
        .ia-facturas-footer-actions { justify-content: flex-end; }
      }
    `;
    document.head.appendChild(style);
    this._iaFacturasStylesInjected = true;
  },

  normalizeIaFacturasConfig(rawConfig = {}) {
    const defaults = this.iaFacturasDefaults;
    const parseBool = (value, fallback) => {
      if (value === undefined || value === null) return fallback;
      if (typeof value === 'boolean') return value;
      const normalized = String(value).trim().toLowerCase();
      return ['1', 'true', 'yes', 'si', 'sí', 'on'].includes(normalized);
    };
    const clamp = (value, min, max, fallback) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return fallback;
      return Math.min(max, Math.max(min, num));
    };

    return {
      apiKey: rawConfig.ia_facturas_gemini_apikey || defaults.apiKey,
      model: rawConfig.ia_facturas_gemini_model || defaults.model,
      temperature: clamp(rawConfig.ia_facturas_temperature, 0, 1, defaults.temperature),
      maxTokens: Math.round(
        clamp(rawConfig.ia_facturas_max_tokens, 256, 32768, defaults.maxTokens)
      ),
      topP: clamp(rawConfig.ia_facturas_top_p, 0, 1, defaults.topP),
      topK: Math.round(clamp(rawConfig.ia_facturas_top_k, 1, 128, defaults.topK)),
      candidateCount: Math.round(
        clamp(rawConfig.ia_facturas_candidate_count, 1, 4, defaults.candidateCount)
      ),
      retryLimit: Math.round(clamp(rawConfig.ia_facturas_retry_limit, 0, 6, defaults.retryLimit)),
      extractorMode: ['hybrid', 'gemini_only', 'extractor_only'].includes(
        rawConfig.ia_facturas_extractor_mode
      )
        ? rawConfig.ia_facturas_extractor_mode
        : defaults.extractorMode,
      enableStructured: parseBool(
        rawConfig.ia_facturas_force_structured,
        defaults.enableStructured
      ),
      enforceSchema: parseBool(rawConfig.ia_facturas_enforce_schema, defaults.enforceSchema),
      diagnostics: parseBool(rawConfig.ia_facturas_diagnostics, defaults.diagnostics),
      promptHint: (rawConfig.ia_facturas_prompt_hint || defaults.promptHint || '')
        .toString()
        .slice(0, 2000),
    };
  },

  renderIaFacturasModalBody(state) {
    const escape = (value) => Utils.escapeHTML(value || '');
    const modelPlaceholder = state.model
      ? `<option value="${escape(state.model)}" selected>${escape(state.model)} (guardado)</option>`
      : '<option value="">Selecciona un modelo</option>';

    return `
      <div class="ia-facturas-modal" data-role="ia-facturas-modal">
        <div class="ia-facturas-grid ia-facturas-grid--double">
          <section class="ia-facturas-card">
            <header><i class="fas fa-key"></i> Credenciales Gemini</header>
            <div class="ia-field">
              <label>API Key (solo se usa para facturas)</label>
              <div class="ia-input-group">
                <input type="password" class="form-control" data-field="apiKey" autocomplete="off" value="${escape(state.apiKey)}" placeholder="AIza...">
                <button type="button" data-action="toggle-api-visibility" title="Mostrar / ocultar"><i class="fas fa-eye"></i></button>
                <button type="button" data-action="copy-api-key" title="Copiar"><i class="fas fa-copy"></i></button>
                <button type="button" data-action="paste-api-key" title="Pegar"><i class="fas fa-paste"></i></button>
              </div>
              <small>Se almacena cifrada y sólo la usa el módulo de facturas.</small>
            </div>
            <div class="ia-field">
              <label>Modelo de Gemini</label>
              <div class="ia-input-group">
                <select class="form-control" data-field="model">${modelPlaceholder}</select>
                <button type="button" data-action="refresh-models" title="Actualizar modelos">
                  <i class="fas fa-sync-alt"></i>
                </button>
              </div>
              <small>Se mostrará el listado cuando se valide la API Key.</small>
            </div>
            <div class="ia-facturas-actions-row">
              <button type="button" class="btn btn-light" data-action="test-connection">
                <i class="fas fa-plug"></i> Probar conexión
              </button>
              <button type="button" class="btn btn-outline" data-action="reset-advanced">
                <i class="fas fa-undo"></i> Restablecer parámetros
              </button>
            </div>
          </section>

          <section class="ia-facturas-card">
            <header><i class="fas fa-sliders-h"></i> Parámetros del modelo</header>
            <div class="ia-slider-field">
              <label>Temperatura <span class="ia-slider-value" data-field-label="temperature">${state.temperature.toFixed(2)}</span></label>
              <input type="range" min="0" max="1" step="0.05" data-field="temperature" value="${state.temperature}">
            </div>
            <div class="ia-slider-field">
              <label>Top P <span class="ia-slider-value" data-field-label="topP">${state.topP.toFixed(2)}</span></label>
              <input type="range" min="0" max="1" step="0.05" data-field="topP" value="${state.topP}">
            </div>
            <div class="ia-field">
              <label>Max tokens de salida</label>
              <input type="number" class="form-control" min="256" max="32768" step="64" data-field="maxTokens" value="${state.maxTokens}">
            </div>
            <div class="ia-field">
              <label>Top K</label>
              <input type="number" class="form-control" min="1" max="128" data-field="topK" value="${state.topK}">
            </div>
            <div class="ia-field">
              <label>Número de candidatos</label>
              <input type="number" class="form-control" min="1" max="4" data-field="candidateCount" value="${state.candidateCount}">
            </div>
            <div class="ia-field">
              <label>Reintentos máximos</label>
              <input type="number" class="form-control" min="0" max="6" data-field="retryLimit" value="${state.retryLimit}">
            </div>
          </section>
        </div>

        <div class="ia-facturas-grid ia-facturas-grid--double">
          <section class="ia-facturas-card">
            <header><i class="fas fa-project-diagram"></i> Pipeline de extracción</header>
            <div class="ia-field">
              <span>Modo de extracción</span>
              <div class="ia-segmented" data-field="extractorMode" data-value="${state.extractorMode}">
                <button type="button" data-option="hybrid" class="${state.extractorMode === 'hybrid' ? 'active' : ''}">Híbrido</button>
                <button type="button" data-option="gemini_only" class="${state.extractorMode === 'gemini_only' ? 'active' : ''}">Solo Gemini</button>
                <button type="button" data-option="extractor_only" class="${state.extractorMode === 'extractor_only' ? 'active' : ''}">Solo extractor</button>
              </div>
            </div>
            <label class="ia-toggle">
              <input type="checkbox" data-field="enableStructured" ${state.enableStructured ? 'checked' : ''}>
              <span>Enviar tablas estructuradas al prompt cuando estén disponibles</span>
            </label>
            <label class="ia-toggle">
              <input type="checkbox" data-field="enforceSchema" ${state.enforceSchema ? 'checked' : ''}>
              <span>Validar respuesta estrictamente contra el esquema JSON</span>
            </label>
            <label class="ia-toggle">
              <input type="checkbox" data-field="diagnostics" ${state.diagnostics ? 'checked' : ''}>
              <span>Registrar diagnósticos detallados en la consola</span>
            </label>
            <div class="ia-field ia-hint-area">
              <label>Instrucciones adicionales para la IA (opcional)</label>
              <textarea data-field="promptHint" placeholder="Ejemplo: Prioriza la lectura de la tabla de repuestos...">${escape(state.promptHint)}</textarea>
            </div>
          </section>

          <section class="ia-facturas-card ia-facturas-status-card">
            <header><i class="fas fa-clipboard-check"></i> Estado y diagnósticos</header>
            <span class="ia-status-tag" data-role="ia-status-tag">Configuración guardada</span>
            <ul class="ia-status-list" data-role="ia-status-list"></ul>
          </section>
        </div>
      </div>
    `;
  },

  seedIaFacturasModelSelect(modal, presetModel) {
    const select = modal.querySelector('[data-field="model"]');
    if (!select) return;
    if (presetModel) {
      const option = document.createElement('option');
      option.value = presetModel;
      option.textContent = `${presetModel} (guardado)`;
      option.selected = true;
      select.replaceChildren(option);
    } else if (!select.children.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Selecciona un modelo';
      select.appendChild(option);
    }
  },

  attachIaFacturasModalHandlers(modal) {
    const handleFieldUpdate = (field, value, target) => {
      const state = modal.__iaFacturasState;
      if (!state) return;

      const sanitized = this.sanitizeIaFacturasField(field, value);
      state.current[field] = sanitized;

      if (target) {
        if (target.type === 'range' || target.type === 'number') {
          target.value = sanitized;
        }
        if (target.type === 'checkbox') {
          target.checked = Boolean(sanitized);
        }
      }

      this.reflectIaFacturasField(modal, field, sanitized);
      this.updateIaFacturasSummary(modal);
    };

    modal.addEventListener('input', (event) => {
      const target = event.target;
      const field = target.dataset.field;
      if (!field) return;
      if (target.type === 'checkbox') return; // handled on change
      handleFieldUpdate(field, target.value, target);
    });

    modal.addEventListener('change', (event) => {
      const target = event.target;
      const field = target.dataset.field;
      if (!field) return;
      const value = target.type === 'checkbox' ? target.checked : target.value;
      handleFieldUpdate(field, value, target);
    });

    modal.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;

      switch (action) {
        case 'toggle-api-visibility': {
          const input = modal.querySelector('[data-field="apiKey"]');
          if (!input) break;
          input.type = input.type === 'password' ? 'text' : 'password';
          button.innerHTML =
            input.type === 'password'
              ? '<i class="fas fa-eye"></i>'
              : '<i class="fas fa-eye-slash"></i>';
          break;
        }
        case 'copy-api-key': {
          const input = modal.querySelector('[data-field="apiKey"]');
          if (!input || !input.value) {
            Utils.showToast('No hay API Key para copiar.', 'warning');
            break;
          }
          try {
            await navigator.clipboard.writeText(input.value);
            Utils.showToast('API Key copiada al portapapeles.', 'success');
          } catch (error) {
            Utils.showToast('No se pudo copiar la API Key.', 'error');
          }
          break;
        }
        case 'paste-api-key': {
          if (!navigator.clipboard?.readText) {
            Utils.showToast(
              'Tu navegador no permite pegar desde el portapapeles de forma automática.',
              'warning'
            );
            break;
          }
          try {
            const text = await navigator.clipboard.readText();
            if (!text) {
              Utils.showToast('El portapapeles está vacío.', 'warning');
              break;
            }
            const input = modal.querySelector('[data-field="apiKey"]');
            if (input) {
              input.value = text.trim();
              handleFieldUpdate('apiKey', input.value, input);
            }
          } catch (error) {
            Utils.showToast('No se pudo acceder al portapapeles.', 'error');
          }
          break;
        }
        case 'refresh-models': {
          this.actualizarModelosFacturas({
            modal,
            silent: false,
            savedModel: modal.__iaFacturasState?.current?.model,
          });
          break;
        }
        case 'test-connection': {
          await this.verificarConexionFacturas(modal);
          break;
        }
        case 'reset-advanced': {
          this.resetIaFacturasAdvanced(modal);
          break;
        }
        case 'save-config': {
          await this.guardarConfiguracionFacturas(modal);
          break;
        }
        default:
          break;
      }
    });

    const segmented = modal.querySelector('[data-field="extractorMode"]');
    if (segmented) {
      segmented.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-option]');
        if (!btn) return;
        const value = btn.dataset.option;
        segmented.dataset.value = value;
        segmented.querySelectorAll('button[data-option]').forEach((node) => {
          node.classList.toggle('active', node.dataset.option === value);
        });
        handleFieldUpdate('extractorMode', value);
      });
    }
  },

  sanitizeIaFacturasField(field, rawValue) {
    const defaults = this.iaFacturasDefaults;
    const clamp = (value, min, max, fallback) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return fallback;
      return Math.min(max, Math.max(min, num));
    };

    switch (field) {
      case 'temperature':
        return Number(clamp(rawValue, 0, 1, defaults.temperature).toFixed(2));
      case 'topP':
        return Number(clamp(rawValue, 0, 1, defaults.topP).toFixed(2));
      case 'maxTokens':
        return Math.round(clamp(rawValue, 256, 32768, defaults.maxTokens));
      case 'topK':
        return Math.round(clamp(rawValue, 1, 128, defaults.topK));
      case 'candidateCount':
        return Math.round(clamp(rawValue, 1, 4, defaults.candidateCount));
      case 'retryLimit':
        return Math.round(clamp(rawValue, 0, 6, defaults.retryLimit));
      case 'enableStructured':
      case 'enforceSchema':
      case 'diagnostics':
        return Boolean(rawValue);
      case 'extractorMode': {
        const value = String(rawValue || '').trim();
        return ['hybrid', 'gemini_only', 'extractor_only'].includes(value)
          ? value
          : defaults.extractorMode;
      }
      case 'apiKey':
        return String(rawValue || '').trim();
      case 'model':
        return String(rawValue || '').trim();
      case 'promptHint':
        return String(rawValue || '')
          .trim()
          .slice(0, 2000);
      default:
        return rawValue;
    }
  },

  reflectIaFacturasField(modal, field, value) {
    if (field === 'temperature' || field === 'topP') {
      const label = modal.querySelector(`[data-field-label="${field}"]`);
      if (label) label.textContent = Number(value).toFixed(2);
    }
    if (field === 'extractorMode') {
      const segmented = modal.querySelector('[data-field="extractorMode"]');
      if (segmented) {
        segmented.dataset.value = value;
        segmented.querySelectorAll('button[data-option]').forEach((node) => {
          node.classList.toggle('active', node.dataset.option === value);
        });
      }
    }
  },

  resetIaFacturasAdvanced(modal) {
    const defaults = this.iaFacturasDefaults;
    const fieldsToReset = [
      'temperature',
      'topP',
      'maxTokens',
      'topK',
      'candidateCount',
      'retryLimit',
      'enableStructured',
      'enforceSchema',
      'diagnostics',
      'promptHint',
      'extractorMode',
    ];
    fieldsToReset.forEach((field) => {
      const input = modal.querySelector(`[data-field="${field}"]`);
      const value = defaults[field];
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = Boolean(value);
        } else if (
          input.type === 'range' ||
          input.type === 'number' ||
          input.tagName === 'TEXTAREA' ||
          input.tagName === 'SELECT' ||
          input.type === 'text'
        ) {
          input.value = value;
        }
      }
      const state = modal.__iaFacturasState;
      if (state) {
        state.current[field] = this.sanitizeIaFacturasField(field, value);
      }
      this.reflectIaFacturasField(modal, field, value);
    });
    this.updateIaFacturasSummary(modal);
    Utils.showToast('Parámetros avanzados restablecidos.', 'info');
  },

  updateIaFacturasSummary(modal) {
    const state = modal.__iaFacturasState;
    if (!state) return;
    const hasChanges = this.hasIaFacturasChanges(state);
    const statusTag = modal.querySelector('[data-role="ia-status-tag"]');
    const statusMessage = modal.querySelector('[data-role="ia-status-message"]');
    const saveButton = modal.querySelector('[data-action="save-config"]');
    const list = modal.querySelector('[data-role="ia-status-list"]');

    if (statusTag) {
      statusTag.textContent = hasChanges ? 'Cambios sin guardar' : 'Configuración guardada';
      statusTag.classList.toggle('warning', hasChanges);
    }

    if (statusMessage) {
      statusMessage.textContent = hasChanges
        ? 'Tienes cambios pendientes. Guarda para aplicarlos al extractor de facturas.'
        : 'La configuración guardada se está utilizando para las lecturas de facturas.';
    }

    if (saveButton) {
      saveButton.disabled = !hasChanges;
    }

    if (list) {
      const current = state.current;
      const rows = [
        `<li><i class="fas fa-user-shield"></i> API Key: ${current.apiKey ? `•••• (${current.apiKey.length} caracteres)` : '<span style="color:#e65100;font-weight:600;">No configurada</span>'}</li>`,
        `<li><i class="fas fa-microchip"></i> Modelo: ${current.model || 'Sin seleccionar'}</li>`,
        `<li><i class="fas fa-fire"></i> Temperatura: ${Number(current.temperature).toFixed(2)} · TopP: ${Number(current.topP).toFixed(2)}</li>`,
        `<li><i class="fas fa-layer-group"></i> Max tokens: ${current.maxTokens} · TopK: ${current.topK}</li>`,
        `<li><i class="fas fa-redo"></i> Reintentos: ${current.retryLimit} · Modo: ${this.describeIaExtractorMode(current.extractorMode)}</li>`,
        `<li><i class="fas fa-table"></i> Tablas estructuradas: ${current.enableStructured ? 'Activadas' : 'Desactivadas'} · Esquema estricto: ${current.enforceSchema ? 'Sí' : 'No'}</li>`,
      ];
      if (current.promptHint) {
        rows.push(
          `<li><i class="fas fa-comment-dots"></i> Instrucción extra: ${Utils.escapeHTML(current.promptHint.slice(0, 140))}${current.promptHint.length > 140 ? '…' : ''}</li>`
        );
      }
      if (current.diagnostics) {
        rows.push('<li><i class="fas fa-bug"></i> Diagnósticos detallados habilitados</li>');
      }
      list.innerHTML = rows.join('');
    }
  },

  describeIaExtractorMode(mode) {
    switch (mode) {
      case 'gemini_only':
        return 'Solo Gemini (sin extractor previo)';
      case 'extractor_only':
        return 'Solo extractor avanzado (sin IA)';
      default:
        return 'Híbrido (Extractor + Gemini)';
    }
  },

  hasIaFacturasChanges(state) {
    const fields = Object.keys(this.iaFacturasDefaults);
    return fields.some((field) => {
      const original = state.original[field];
      const current = state.current[field];
      if (typeof original === 'number' || typeof current === 'number') {
        return Math.abs(Number(original || 0) - Number(current || 0)) > 0.001;
      }
      return original !== current;
    });
  },

  mapIaFacturasStateToPayload(state) {
    const map = this.iaFacturasConfigMap;
    const entries = [];
    Object.entries(map).forEach(([field, key]) => {
      let value = state[field];
      if (typeof value === 'boolean') {
        value = value ? '1' : '0';
      } else if (typeof value === 'number') {
        value =
          field === 'temperature' || field === 'topP'
            ? value.toFixed(2)
            : String(Math.round(value));
      } else {
        value = value != null ? String(value) : '';
      }
      entries.push({ key, value });
    });
    return entries;
  },

  async guardarConfiguracionFacturas(modal) {
    const overlay = modal || document.getElementById('modalConfigFacturasIA');
    const state = overlay?.__iaFacturasState;
    if (!state) return;

    const current = state.current;
    const requiresGemini = current.extractorMode !== 'extractor_only';
    if (requiresGemini && (!current.apiKey || !current.model)) {
      Utils.showToast(
        'Debes ingresar una API Key y seleccionar un modelo antes de guardar.',
        'warning'
      );
      return;
    }

    const payload = this.mapIaFacturasStateToPayload(current);

    try {
      await this.requestBackend('/configuracion/bulk', {
        method: 'POST',
        body: payload,
      });
      state.original = { ...current };
      this.updateIaFacturasSummary(overlay);
      Utils.showToast('Configuración avanzada guardada correctamente.', 'success');
    } catch (error) {
      Utils.showToast(error.message || 'No se pudo guardar la configuración.', 'error');
    }
  },

  async actualizarModelosFacturas(options = {}) {
    const {
      modal = document.getElementById('modalConfigFacturasIA'),
      silent = false,
      savedModel = '',
    } = options || {};
    if (!modal) return;

    const state = modal.__iaFacturasState;
    const apiKey = state?.current?.apiKey || '';
    const select = modal.querySelector('[data-field="model"]');
    const refreshBtn = modal.querySelector('[data-action="refresh-models"]');

    if (!select) return;

    if (!apiKey) {
      if (!silent)
        Utils.showToast('Ingresa una API Key para obtener el catálogo de modelos.', 'warning');
      this.seedIaFacturasModelSelect(modal, savedModel);
      return;
    }

    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    try {
      const result = await this.requestBackend('/ia/models', {
        method: 'POST',
        body: { apiKey },
      });

      if (!result?.success) {
        throw new Error(result?.message || 'No se pudo obtener el listado de modelos.');
      }

      select.innerHTML = result.models
        .map((model) => {
          const escapedId = Utils.escapeHTML(model.id);
          const display = Utils.escapeHTML(model.displayName || model.id);
          const selected = savedModel && savedModel === model.id ? 'selected' : '';
          return `<option value="${escapedId}" ${selected}>${display}</option>`;
        })
        .join('');

      if (savedModel && !result.models.find((m) => m.id === savedModel)) {
        select.insertAdjacentHTML(
          'afterbegin',
          `<option value="${Utils.escapeHTML(savedModel)}" selected>${Utils.escapeHTML(savedModel)} (no listado)</option>`
        );
      }

      if (!silent) {
        const message = `${result.models.length} modelos disponibles.`;
        if (result.warning) {
          Utils.showToast(result.warning, 'warning');
          Utils.showToast(message, 'info');
        } else {
          Utils.showToast(message, 'success');
        }
      }
    } catch (error) {
      if (!silent)
        Utils.showToast(error.message || 'No se pudo actualizar la lista de modelos.', 'error');
      this.seedIaFacturasModelSelect(modal, savedModel);
    } finally {
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
      }
    }
  },

  async verificarConexionFacturas(modal) {
    const overlay = modal || document.getElementById('modalConfigFacturasIA');
    const state = overlay?.__iaFacturasState;
    if (!state) return;

    const { apiKey, model } = state.current;
    if (!apiKey || !model) {
      Utils.showToast('Ingresa la API Key y selecciona un modelo antes de probar.', 'warning');
      return;
    }

    const testBtn = overlay.querySelector('[data-action="test-connection"]');
    if (testBtn) {
      testBtn.disabled = true;
      testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Probando...';
    }

    try {
      const result = await this.requestBackend('/verificar-ia', {
        method: 'POST',
        body: { apiKey, model },
      });
      if (!result?.success) {
        throw new Error(result?.message || 'La verificación no fue exitosa.');
      }
      Utils.showToast(result.message || 'Conexión con Gemini verificada correctamente.', 'success');
    } catch (error) {
      Utils.showToast(error.message || 'No se pudo verificar la conexión con Gemini.', 'error');
    } finally {
      if (testBtn) {
        testBtn.disabled = false;
        testBtn.innerHTML = '<i class="fas fa-plug"></i> Probar conexión';
      }
    }
  },

  iniciarCargaFactura() {
    this.abrirModalExtractorIA();
  },

  abrirModalExtractorIA() {
    this.ensureIaExtractorStyles();
    let modal = document.getElementById('modalExtractorIA');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modalExtractorIA';
      modal.className = 'modal-overlay ia-extractor-overlay';
      modal.innerHTML = this.renderIaExtractorModal();
      document.body.appendChild(modal);
    }

    const defaults = this.cargarPreferenciasExtractorIA();
    modal.__iaExtractorState = {
      ...defaults,
      files: [], // Array de archivos en lugar de uno solo
      file: null, // Mantener compatibilidad
      progress: 0,
      status: 'idle',
      statusMessage: 'Selecciona o arrastra uno o varios PDFs para comenzar.',
      submitting: false,
      logs: [],
    };

    this.bindEventosModalExtractorIA(modal);
    this.actualizarModalExtractorIA(modal);
    requestAnimationFrame(() => modal.classList.add('active'));

    // Descifrar API Key guardada de forma asíncrona
    if (defaults.apiKeySaved && defaults.apiKeyEncrypted) {
      this.descifrarApiKeyGuardada(defaults)
        .then((apiKeyDescifrada) => {
          if (apiKeyDescifrada && modal.__iaExtractorState) {
            modal.__iaExtractorState.apiKey = apiKeyDescifrada;
            // Actualizar el input
            const apiKeyInput = modal.querySelector('[data-field="apiKey"]');
            if (apiKeyInput) {
              apiKeyInput.value = apiKeyDescifrada;
            }
            // Mostrar indicador de que hay API Key guardada
            this.actualizarEstadoApiKey(modal, 'saved', '✓ API Key guardada');
            this.anexarLogExtractorIA(modal, '🔐 API Key cargada desde almacenamiento seguro');
            this.actualizarModalExtractorIA(modal);
          }
        })
        .catch((error) => {
          console.warn('[Compras] Error cargando API Key cifrada:', error);
          this.anexarLogExtractorIA(modal, '⚠️ No se pudo cargar la API Key guardada');
        });
    } else if (defaults.apiKey && !window.SecureCrypto?.isEncrypted(defaults.apiKey)) {
      // Migración: hay una API Key guardada SIN cifrar (versión anterior)
      console.log('[Compras] Migrando API Key sin cifrar a formato cifrado...');
      modal.__iaExtractorState.apiKey = defaults.apiKey;

      // Actualizar el input
      const apiKeyInput = modal.querySelector('[data-field="apiKey"]');
      if (apiKeyInput) {
        apiKeyInput.value = defaults.apiKey;
      }

      // Cifrar y guardar automáticamente
      this.guardarApiKeyCifrada(modal.__iaExtractorState).then((saved) => {
        if (saved) {
          this.actualizarEstadoApiKey(modal, 'saved', '✓ API Key migrada y cifrada');
          this.anexarLogExtractorIA(modal, '🔄 API Key migrada a almacenamiento seguro');
          Utils.showToast(
            '🔐 Tu API Key ha sido migrada a un formato más seguro (cifrado).',
            'info'
          );
        }
      });

      this.actualizarModalExtractorIA(modal);
    }
  },

  cerrarModalExtractorIA(modal, forzar = false) {
    const overlay = modal || document.getElementById('modalExtractorIA');
    const state = overlay?.__iaExtractorState;
    if (!overlay) return;

    // Si no hay state, simplemente cerrar
    if (!state) {
      overlay.classList.remove('active');
      setTimeout(() => {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 220);
      return;
    }

    // Verificar si hay archivos para procesar
    const tieneArchivos = state.files && state.files.length > 0;

    // Permitir cerrar si:
    // 1. Se fuerza el cierre
    // 2. No hay archivos seleccionados (el usuario los eliminó)
    // 3. No está en modo submitting
    // 4. El procesamiento en segundo plano ya inició (iaIsProcessing)
    if (!forzar && state.submitting && tieneArchivos && !this.iaIsProcessing) {
      Utils.showToast('Espera a que se inicie el procesamiento en segundo plano.', 'info');
      return;
    }

    // Si el procesamiento ya está en segundo plano, simplemente cerrar el modal
    if (this.iaIsProcessing) {
      Utils.showToast(
        'El procesamiento continúa en segundo plano. Revisa el panel de facturas.',
        'info'
      );
    }

    overlay.classList.remove('active');
    setTimeout(() => {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 220);
  },

  ensureIaExtractorStyles() {
    if (this._iaExtractorStylesInjected) return;
    const style = document.createElement('style');
    style.id = 'compras-ia-extractor-styles';
    style.textContent = `
      .ia-extractor-overlay { display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
      .ia-extractor-overlay::before { content: ''; position: absolute; inset: 0; background: rgba(3, 7, 18, 0.65); }
      .ia-extractor-panel { position: relative; z-index: 1; background: var(--bg-secondary, #0b1524); border-radius: 20px; max-width: 960px; width: 95vw; color: var(--text-primary, #fff); box-shadow: 0 25px 60px rgba(8, 15, 52, 0.45); display: flex; flex-direction: column; max-height: 90vh; }
      .ia-extractor-header { padding: 1.5rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; border-bottom: 1px solid rgba(255,255,255,0.08); }
      .ia-extractor-header h3 { margin: 0; font-size: 1.4rem; }
      .ia-extractor-header p { margin: 0.35rem 0 0; color: rgba(255,255,255,0.7); }
      .ia-extractor-close { background: rgba(255,255,255,0.1); border: none; border-radius: 10px; width: 40px; height: 40px; color: #fff; cursor: pointer; }
      .ia-extractor-body { padding: 1.5rem; overflow-y: auto; }
      .ia-extractor-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; }
      .ia-extractor-card { background: rgba(15,23,42,0.55); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.1rem; display: flex; flex-direction: column; gap: 0.9rem; }
      .ia-extractor-card label { font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.7); }
      .ia-extractor-card input, .ia-extractor-card select, .ia-extractor-card textarea { background: rgba(15,23,42,0.75); border: 1px solid rgba(148,163,184,0.4); border-radius: 10px; color: #e2e8f0; padding: 0.55rem 0.7rem; font-size: 0.95rem; }
      .ia-extractor-dropzone { border: 2px dashed rgba(99, 102, 241, 0.8); border-radius: 16px; padding: 1.5rem; text-align: center; cursor: pointer; display: flex; flex-direction: column; gap: 0.6rem; justify-content: center; align-items: center; background: rgba(67,56,202,0.12); transition: border-color 0.2s ease, background 0.2s ease; }
      .ia-extractor-dropzone.dragover { border-color: #22d3ee; background: rgba(45,212,191,0.08); }
      .ia-extractor-dropzone strong { font-size: 1.1rem; }
      .ia-extractor-status { margin-top: 1.25rem; padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.95rem; color: rgba(255,255,255,0.8); }
      .ia-extractor-status pre { margin: 0; max-height: 140px; overflow-y: auto; background: rgba(15,23,42,0.65); border-radius: 10px; padding: 0.75rem; font-size: 0.8rem; color: #cbd5f5; }
      .ia-extractor-footer { padding: 1.25rem 1.5rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
      .ia-extractor-footer button { border-radius: 999px; padding: 0.75rem 1.5rem; border: none; cursor: pointer; font-weight: 600; }
      .ia-extractor-footer .btn-primary { background: linear-gradient(120deg, #7c3aed, #22d3ee); color: #fff; }
      .ia-extractor-footer .btn-secondary { background: rgba(255,255,255,0.15); color: #fff; }
      .ia-extractor-file-meta { font-size: 0.85rem; color: rgba(255,255,255,0.65); }
      
      /* Estilos para API Key con botones */
      .ia-apikey-input-wrapper { display: flex; gap: 0.5rem; align-items: center; }
      .ia-apikey-input-wrapper input { flex: 1; -webkit-text-security: disc !important; }
      .ia-apikey-input-wrapper input[data-field="apiKey"] { 
        -webkit-text-security: disc !important; 
        font-family: 'password', monospace !important;
        letter-spacing: 0.2em;
      }
      .ia-apikey-input-wrapper input[data-field="apiKey"]::selection { background: transparent; }
      .ia-apikey-input-wrapper input[data-field="apiKey"]::-moz-selection { background: transparent; }
      
      .ia-apikey-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
      .ia-apikey-actions .btn-sm { padding: 0.45rem 0.85rem; font-size: 0.8rem; border-radius: 8px; display: flex; align-items: center; gap: 0.4rem; cursor: pointer; transition: all 0.2s ease; }
      .ia-apikey-actions .btn-outline { background: transparent; border: 1px solid rgba(148,163,184,0.5); color: #94a3b8; }
      .ia-apikey-actions .btn-outline:hover { background: rgba(255,255,255,0.08); border-color: rgba(148,163,184,0.8); color: #fff; }
      .ia-apikey-actions .btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }
      
      .ia-apikey-status { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0; }
      .ia-apikey-status small { color: rgba(255,255,255,0.6); font-size: 0.8rem; }
      .ia-apikey-status .status-indicator { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
      .ia-apikey-status .status-indicator[data-status="unknown"] { background: #64748b; }
      .ia-apikey-status .status-indicator[data-status="checking"] { background: #fbbf24; animation: pulse-status 1s infinite; }
      .ia-apikey-status .status-indicator[data-status="valid"] { background: #22c55e; box-shadow: 0 0 8px rgba(34, 197, 94, 0.5); }
      .ia-apikey-status .status-indicator[data-status="invalid"] { background: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.4); }
      .ia-apikey-status .status-indicator[data-status="saved"] { background: #22c55e; box-shadow: 0 0 10px rgba(34, 197, 94, 0.6); }
      .ia-apikey-status.saved-indicator { background: rgba(34, 197, 94, 0.1); border-radius: 8px; padding: 0.6rem 0.8rem !important; border: 1px solid rgba(34, 197, 94, 0.3); }
      
      @keyframes pulse-status { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      
      /* Lista de archivos seleccionados */
      .ia-extractor-files-list { max-height: 180px; overflow-y: auto; }
      .ia-file-item { transition: all 0.2s ease; }
      .ia-file-item:hover { background: rgba(99,102,241,0.2) !important; }
      .ia-file-item button:hover { background: rgba(239,68,68,0.2) !important; }
      
      @media (max-width: 640px) {
        .ia-extractor-panel { max-height: 95vh; border-radius: 16px; }
        .ia-extractor-header, .ia-extractor-body, .ia-extractor-footer { padding: 1.1rem; }
        .ia-apikey-actions { flex-direction: column; }
        .ia-apikey-actions .btn-sm { justify-content: center; }
      }
    `;
    document.head.appendChild(style);
    this._iaExtractorStylesInjected = true;
  },

  renderIaExtractorModal() {
    return `
      <div class="ia-extractor-panel">
        <div class="ia-extractor-header">
          <div>
            <h3><i class="fas fa-robot"></i> Importar facturas con IA</h3>
            <p>Sube uno o varios PDFs y procésalos en segundo plano. Podrás aprobarlos cuando estén listos.</p>
          </div>
          <button class="ia-extractor-close" data-action="close-extractor" title="Cerrar">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="ia-extractor-body">
          <div class="ia-extractor-grid">
            <div class="ia-extractor-card">
              <label>API Key de Gemini <span style="opacity:0.6;font-size:0.7rem;">(confidencial)</span></label>
              <div class="ia-apikey-input-wrapper">
                <input type="password" data-field="apiKey" placeholder="Pega tu API Key aquí..." autocomplete="off" style="-webkit-text-security: disc;">
              </div>
              <div class="ia-apikey-actions">
                <button type="button" class="btn-sm btn-outline" data-action="save-apikey">
                  <i class="fas fa-save"></i> Guardar Key
                </button>
                <button type="button" class="btn-sm btn-outline" data-action="verify-apikey">
                  <i class="fas fa-check-circle"></i> Verificar
                </button>
              </div>
              <div class="ia-apikey-status" data-role="apikey-status">
                <span class="status-indicator" data-status="unknown"></span>
                <small>🔐 La clave se guarda cifrada de forma segura</small>
              </div>
              <!-- Configuración avanzada oculta para simplicidad -->
              <input type="hidden" data-field="model" value="gemini-2.5-flash">
            </div>
            <div class="ia-extractor-card">
              <label>Facturas PDF <span style="opacity:0.6;font-size:0.75rem;">(puedes seleccionar varias)</span></label>
              <div class="ia-extractor-dropzone" data-role="dropzone">
                <i class="fas fa-cloud-upload-alt" style="font-size:2rem;"></i>
                <strong data-role="drop-label">Arrastra o haz clic para subir</strong>
                <span class="ia-extractor-file-meta" data-role="file-meta">Máximo 10MB por archivo · Solo PDF</span>
                <input type="file" accept="application/pdf" data-role="file-input" style="display:none;" multiple>
              </div>
              <div class="ia-extractor-files-list" data-role="files-list" style="margin-top:0.75rem;display:none;"></div>
              <button type="button" class="btn-secondary" data-action="limpiar-archivo">
                <i class="fas fa-undo"></i> Limpiar selección
              </button>
            </div>
          </div>
        </div>
        <div class="ia-extractor-status">
          <div data-role="status-text">Preparando extractor...</div>
          <pre data-role="status-log"></pre>
        </div>
        <div class="ia-extractor-footer">
          <button type="button" class="btn-secondary" data-action="close-extractor"><i class="fas fa-times"></i> Cancelar</button>
          <button type="button" class="btn-primary" data-action="submit-extractor" disabled>
            <i class="fas fa-magic"></i> Procesar facturas
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Carga preferencias del extractor IA (versión síncrona para compatibilidad)
   * La API Key se descifra de forma asíncrona después
   */
  cargarPreferenciasExtractorIA() {
    const base = {
      apiKey: '',
      apiKeyEncrypted: '',
      apiKeySaved: false,
      model: this.iaFacturasDefaults.model || 'gemini-2.5-flash',
      temperature: this.iaFacturasDefaults.temperature ?? 0.15,
      topP: this.iaFacturasDefaults.topP ?? 0.9,
      topK: this.iaFacturasDefaults.topK ?? 32,
      maxTokens: this.iaFacturasDefaults.maxTokens ?? 8192,
    };
    try {
      const raw = localStorage.getItem('compras_ia_extractor_prefs');
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      // Guardar la versión cifrada, se descifrará después
      const result = { ...base, ...parsed };
      // Si hay apiKey cifrada, marcar como guardada
      if (parsed.apiKey && window.SecureCrypto?.isEncrypted(parsed.apiKey)) {
        result.apiKeyEncrypted = parsed.apiKey;
        result.apiKeySaved = true;
        result.apiKey = ''; // Se llenará después de descifrar
      }
      return result;
    } catch (error) {
      console.warn('[Compras] No se pudo leer preferencias IA:', error);
      return base;
    }
  },

  /**
   * Descifra la API Key guardada de forma asíncrona
   * @param {object} state - Estado del modal
   * @returns {Promise<string>} API Key descifrada
   */
  async descifrarApiKeyGuardada(state) {
    if (!state?.apiKeyEncrypted || !window.SecureCrypto) {
      return state?.apiKey || '';
    }
    try {
      const decrypted = await SecureCrypto.decrypt(state.apiKeyEncrypted);
      return decrypted || '';
    } catch (error) {
      console.warn('[Compras] Error descifrando API Key:', error);
      return '';
    }
  },

  /**
   * Guarda preferencias del extractor IA (sin cifrar API Key)
   * Para guardar API Key cifrada, usar guardarApiKeyCifrada()
   */
  guardarPreferenciasExtractorIA(state, skipApiKey = false) {
    try {
      // Recuperar preferencias existentes para no perder la API Key cifrada
      const existingRaw = localStorage.getItem('compras_ia_extractor_prefs');
      const existing = existingRaw ? JSON.parse(existingRaw) : {};

      const payload = {
        // Mantener API Key cifrada existente si no estamos guardando una nueva
        apiKey: skipApiKey ? existing.apiKey || '' : state.apiKeyEncrypted || existing.apiKey || '',
        model: state.model || '',
        temperature: Number(state.temperature) || 0.15,
        topP: Number(state.topP) || 0.9,
        topK: Number(state.topK) || 32,
        maxTokens: Number(state.maxTokens) || 8192,
      };
      localStorage.setItem('compras_ia_extractor_prefs', JSON.stringify(payload));
    } catch (error) {
      console.warn('[Compras] No se pudo guardar preferencias IA:', error);
    }
  },

  /**
   * Guarda la API Key de forma cifrada y segura
   * @param {object} state - Estado del modal con apiKey
   * @returns {Promise<boolean>} true si se guardó correctamente
   */
  async guardarApiKeyCifrada(state) {
    if (!state?.apiKey || !window.SecureCrypto) {
      console.warn('[Compras] No se puede cifrar: falta apiKey o SecureCrypto');
      return false;
    }

    try {
      // Cifrar la API Key
      const encrypted = await SecureCrypto.encrypt(state.apiKey);
      if (!encrypted) {
        throw new Error('Cifrado devolvió vacío');
      }

      // Guardar en el state
      state.apiKeyEncrypted = encrypted;
      state.apiKeySaved = true;

      // Guardar en localStorage
      const existingRaw = localStorage.getItem('compras_ia_extractor_prefs');
      const existing = existingRaw ? JSON.parse(existingRaw) : {};

      const payload = {
        ...existing,
        apiKey: encrypted, // Guardamos la versión cifrada
        model: state.model || existing.model || 'gemini-2.5-flash',
        temperature: Number(state.temperature) || 0.15,
        topP: Number(state.topP) || 0.9,
        topK: Number(state.topK) || 32,
        maxTokens: Number(state.maxTokens) || 8192,
      };

      localStorage.setItem('compras_ia_extractor_prefs', JSON.stringify(payload));
      console.log('[Compras] ✅ API Key guardada de forma cifrada');
      return true;
    } catch (error) {
      console.error('[Compras] Error cifrando/guardando API Key:', error);
      return false;
    }
  },

  bindEventosModalExtractorIA(modal) {
    if (!modal || modal.__iaExtractorEventsBound) return;
    modal.__iaExtractorEventsBound = true;

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        this.cerrarModalExtractorIA(modal);
      }
    });

    modal.querySelectorAll('[data-action="close-extractor"]').forEach((btn) => {
      btn.addEventListener('click', () => this.cerrarModalExtractorIA(modal));
    });

    const dropzone = modal.querySelector('[data-role="dropzone"]');
    const fileInput = modal.querySelector('[data-role="file-input"]');
    const clearBtn = modal.querySelector('[data-action="limpiar-archivo"]');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropzone.classList.remove('dragover');
        // Soporte para múltiples archivos
        const droppedFiles = Array.from(event.dataTransfer?.files || []);
        if (droppedFiles.length > 0) {
          this.asignarArchivosExtractorIA(modal, droppedFiles);
        }
      });
      fileInput.addEventListener('change', (event) => {
        // Soporte para múltiples archivos
        const selectedFiles = Array.from(event.target.files || []);
        if (selectedFiles.length > 0) {
          this.asignarArchivosExtractorIA(modal, selectedFiles);
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const state = modal.__iaExtractorState;
        if (!state) return;

        // Permitir limpiar incluso si está en submitting (usuario quiere cancelar)
        state.files = [];
        state.file = null;
        state.submitting = false; // Resetear para permitir cerrar
        state.statusMessage = 'Selección limpiada. Puedes cerrar o agregar nuevos PDFs.';
        this.anexarLogExtractorIA(modal, 'Selección limpiada');
        this.actualizarModalExtractorIA(modal);
      });
    }

    modal.querySelectorAll('[data-field]').forEach((input) => {
      input.addEventListener('input', (event) => {
        const state = modal.__iaExtractorState;
        if (!state) return;
        const field = event.target.dataset.field;
        state[field] = event.target.value;

        // Para API Key: solo actualizar estado, no guardar (se cifra con botón Guardar)
        if (field === 'apiKey') {
          state.apiKeySaved = false; // Marcar como no guardada aún
          this.actualizarEstadoApiKey(modal, 'unknown', 'Ingresa y guarda tu API Key');
        } else {
          // Otros campos sí se guardan inmediatamente
          this.guardarPreferenciasExtractorIA(state, true); // skipApiKey = true
        }
        this.actualizarModalExtractorIA(modal);
      });
    });

    // Proteger campo de API Key: no permitir copiar ni seleccionar
    const apiKeyInput = modal.querySelector('[data-field="apiKey"]');
    if (apiKeyInput) {
      // Bloquear copiar
      apiKeyInput.addEventListener('copy', (e) => {
        e.preventDefault();
        Utils.showToast('🔒 No se permite copiar la API Key por seguridad.', 'warning');
      });
      // Bloquear cortar
      apiKeyInput.addEventListener('cut', (e) => {
        e.preventDefault();
        Utils.showToast('🔒 No se permite cortar la API Key por seguridad.', 'warning');
      });
      // Bloquear arrastrar
      apiKeyInput.addEventListener('dragstart', (e) => {
        e.preventDefault();
      });
      // Bloquear menú contextual (clic derecho)
      apiKeyInput.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });
    }

    const submitBtn = modal.querySelector('[data-action="submit-extractor"]');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.procesarFacturasEnCola(modal));
    }

    // Botón para guardar API Key (con cifrado)
    const saveApiKeyBtn = modal.querySelector('[data-action="save-apikey"]');
    if (saveApiKeyBtn) {
      saveApiKeyBtn.addEventListener('click', async () => {
        const state = modal.__iaExtractorState;
        if (!state) return;

        const apiKey = state.apiKey?.trim();
        if (!apiKey) {
          Utils.showToast('Ingresa una API Key antes de guardar.', 'warning');
          return;
        }

        // Validación básica del formato
        if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
          Utils.showToast(
            'El formato de la API Key no parece válido. Debe comenzar con "AIza..."',
            'warning'
          );
          return;
        }

        // Mostrar estado de guardando
        saveApiKeyBtn.disabled = true;
        saveApiKeyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        this.actualizarEstadoApiKey(modal, 'checking', '⏳ Cifrando y guardando...');

        try {
          // Guardar con cifrado
          const saved = await this.guardarApiKeyCifrada(state);

          if (saved) {
            this.actualizarEstadoApiKey(modal, 'saved', '✓ API Key guardada');
            Utils.showToast('🔐 API Key guardada de forma segura y cifrada.', 'success');
            this.anexarLogExtractorIA(modal, '🔐 API Key guardada de forma cifrada');
          } else {
            throw new Error('No se pudo guardar');
          }
        } catch (error) {
          console.error('[Compras] Error guardando API Key:', error);
          this.actualizarEstadoApiKey(modal, 'invalid', '✗ Error al guardar');
          Utils.showToast('❌ Error al guardar la API Key.', 'error');
        } finally {
          saveApiKeyBtn.disabled = false;
          saveApiKeyBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Key';
        }
      });
    }

    // Botón para verificar API Key
    const verifyApiKeyBtn = modal.querySelector('[data-action="verify-apikey"]');
    if (verifyApiKeyBtn) {
      verifyApiKeyBtn.addEventListener('click', () => this.verificarApiKeyGemini(modal));
    }
  },

  /**
   * Actualiza el indicador visual del estado de la API Key
   */
  actualizarEstadoApiKey(modal, status, message) {
    const statusContainer = modal.querySelector('[data-role="apikey-status"]');
    if (!statusContainer) return;

    const indicator = statusContainer.querySelector('.status-indicator');
    const small = statusContainer.querySelector('small');

    if (indicator) {
      indicator.dataset.status = status;

      // Remover clases anteriores
      indicator.classList.remove(
        'status-unknown',
        'status-checking',
        'status-valid',
        'status-invalid',
        'status-saved'
      );
      indicator.classList.add(`status-${status}`);
    }

    // Agregar/remover clase especial cuando está guardada
    if (status === 'saved') {
      statusContainer.classList.add('saved-indicator');
    } else {
      statusContainer.classList.remove('saved-indicator');
    }

    if (small && message) {
      // Agregar icono según el estado
      const icon =
        status === 'saved'
          ? '🔐'
          : status === 'valid'
            ? '✅'
            : status === 'invalid'
              ? '❌'
              : status === 'checking'
                ? '⏳'
                : '🔑';
      small.innerHTML = `${icon} ${message}`;
    }
  },

  /**
   * Verifica la API Key de Gemini haciendo una prueba de conexión
   */
  async verificarApiKeyGemini(modal) {
    const state = modal.__iaExtractorState;
    if (!state) return;

    const apiKey = state.apiKey?.trim();
    if (!apiKey) {
      Utils.showToast('Ingresa una API Key para verificar.', 'warning');
      this.actualizarEstadoApiKey(modal, 'invalid', '✗ No hay API Key');
      return;
    }

    // Validación básica del formato
    if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
      Utils.showToast(
        'El formato de la API Key no parece válido. Debe comenzar con "AIza..."',
        'warning'
      );
      this.actualizarEstadoApiKey(modal, 'invalid', '✗ Formato inválido');
      return;
    }

    state.apiKeyVerified = false;
    const modeloSeleccionado =
      state.model?.trim() || this.iaFacturasDefaults.model || 'gemini-2.5-flash';
    this.actualizarEstadoApiKey(modal, 'checking', '⏳ Verificando conexión...');
    this.anexarLogExtractorIA(
      modal,
      `Verificando API Key con Gemini (modelo ${modeloSeleccionado})...`
    );

    const verifyBtn = modal.querySelector('[data-action="verify-apikey"]');
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    }

    try {
      // Llamar al endpoint de verificación en el backend
      const csrfToken =
        Utils.getCsrfToken?.() || document.querySelector('meta[name="csrf-token"]')?.content || '';

      const response = await fetch(Utils.apiUrl('/api/verificar-apikey-gemini'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ apiKey, model: modeloSeleccionado }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        state.apiKeyVerified = true; // Marcar como verificada
        this.actualizarEstadoApiKey(modal, 'valid', '✓ API Key válida y funcionando');
        this.anexarLogExtractorIA(
          modal,
          `✅ Conexión exitosa. Modelo: ${result.model || 'gemini'}`
        );
        Utils.showToast('✅ API Key verificada correctamente. ¡Lista para usar!', 'success');

        // Guardar automáticamente de forma cifrada si la verificación es exitosa
        this.guardarApiKeyCifrada(state).then((saved) => {
          if (saved) {
            this.actualizarEstadoApiKey(modal, 'saved', '✓ API Key guardada');
            this.anexarLogExtractorIA(modal, '🔐 API Key guardada de forma segura');
          }
        });
      } else {
        state.apiKeyVerified = false; // Marcar como no verificada
        const errorMsg = result.message || 'API Key inválida';
        this.actualizarEstadoApiKey(modal, 'invalid', `✗ ${errorMsg}`);
        this.anexarLogExtractorIA(modal, `❌ Error: ${errorMsg}`);
        Utils.showToast(`❌ ${errorMsg}`, 'error');
      }
    } catch (error) {
      console.error('[Compras] Error verificando API Key:', error);
      this.actualizarEstadoApiKey(modal, 'invalid', '✗ Error de conexión');
      this.anexarLogExtractorIA(modal, `❌ Error de red: ${error.message}`);
      Utils.showToast('❌ Error al verificar la API Key. Revisa tu conexión.', 'error');
    } finally {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verificar';
      }
    }
  },

  asignarArchivoExtractorIA(modal, file) {
    const state = modal.__iaExtractorState;
    if (!state) return;
    const error = this.validarArchivoFactura(file);
    if (error) {
      Utils.showToast(error, 'warning');
      return;
    }
    state.file = file;
    state.files = [file];
    state.statusMessage = `Factura seleccionada: ${file.name}`;
    this.actualizarModalExtractorIA(modal);
  },

  /**
   * Asigna múltiples archivos al estado del modal
   */
  asignarArchivosExtractorIA(modal, files) {
    const state = modal.__iaExtractorState;
    if (!state) return;

    const archivosValidos = [];
    const errores = [];

    for (const file of files) {
      const error = this.validarArchivoFactura(file);
      if (error) {
        errores.push(`${file.name}: ${error}`);
      } else {
        archivosValidos.push(file);
      }
    }

    if (errores.length > 0) {
      Utils.showToast(`${errores.length} archivo(s) inválido(s): ${errores[0]}`, 'warning');
    }

    if (archivosValidos.length === 0) return;

    // Agregar a la lista existente
    state.files = [...(state.files || []), ...archivosValidos];
    state.file = state.files[0]; // Mantener compatibilidad

    const plural = state.files.length > 1 ? 's' : '';
    state.statusMessage = `${state.files.length} factura${plural} seleccionada${plural}`;
    this.anexarLogExtractorIA(
      modal,
      `Agregado${plural}: ${archivosValidos.map((f) => f.name).join(', ')}`
    );
    this.actualizarModalExtractorIA(modal);
  },

  /**
   * Elimina un archivo específico de la lista
   */
  eliminarArchivoExtractorIA(modal, index) {
    const state = modal.__iaExtractorState;
    if (!state || !state.files) return;

    const removed = state.files.splice(index, 1);
    state.file = state.files[0] || null;

    if (removed.length > 0) {
      this.anexarLogExtractorIA(modal, `Eliminado: ${removed[0].name}`);
    }

    // Si no quedan archivos, resetear el estado de submitting
    // para permitir cerrar el modal
    if (state.files.length === 0) {
      state.submitting = false;
      state.statusMessage = 'Sin archivos seleccionados. Puedes cerrar o agregar más PDFs.';
    }

    this.actualizarModalExtractorIA(modal);
  },

  validarArchivoFactura(file) {
    if (!file) return 'Selecciona un PDF válido.';
    if (file.type !== 'application/pdf') return 'Solo se permiten archivos PDF.';
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) return 'El PDF supera el límite de 10MB.';
    return '';
  },

  actualizarModalExtractorIA(modal) {
    const state = modal.__iaExtractorState || {};
    const dropLabel = modal.querySelector('[data-role="drop-label"]');
    const fileMeta = modal.querySelector('[data-role="file-meta"]');
    const filesList = modal.querySelector('[data-role="files-list"]');
    const statusText = modal.querySelector('[data-role="status-text"]');
    const statusLog = modal.querySelector('[data-role="status-log"]');
    const submitBtn = modal.querySelector('[data-action="submit-extractor"]');

    const files = state.files || [];
    const hasFiles = files.length > 0;

    if (dropLabel) {
      if (hasFiles) {
        const plural = files.length > 1 ? 's' : '';
        dropLabel.textContent = `${files.length} archivo${plural} seleccionado${plural}`;
      } else {
        dropLabel.textContent = 'Arrastra o haz clic para subir';
      }
    }
    if (fileMeta) {
      if (hasFiles) {
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        fileMeta.textContent = `${(totalSize / 1024 / 1024).toFixed(2)} MB total · ${files.length} PDF${files.length > 1 ? 's' : ''}`;
      } else {
        fileMeta.textContent = 'Máximo 10MB por archivo · Solo PDF';
      }
    }

    // Renderizar lista de archivos
    if (filesList) {
      if (hasFiles) {
        filesList.style.display = 'block';
        filesList.innerHTML = files
          .map(
            (f, i) => `
          <div class="ia-file-item" style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0.6rem;background:rgba(99,102,241,0.1);border-radius:8px;margin-bottom:0.35rem;font-size:0.85rem;">
            <i class="fas fa-file-pdf" style="color:#ef4444;"></i>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escapeHTML(f.name)}</span>
            <span style="opacity:0.6;font-size:0.75rem;">${(f.size / 1024 / 1024).toFixed(2)}MB</span>
            <button type="button" data-remove-file="${i}" style="background:none;border:none;color:#ef4444;cursor:pointer;padding:4px;" title="Eliminar">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `
          )
          .join('');

        // Bind eventos de eliminar
        filesList.querySelectorAll('[data-remove-file]').forEach((btn) => {
          btn.onclick = () => {
            const idx = parseInt(btn.dataset.removeFile, 10);
            this.eliminarArchivoExtractorIA(modal, idx);
          };
        });
      } else {
        filesList.style.display = 'none';
        filesList.innerHTML = '';
      }
    }

    if (statusText) {
      statusText.textContent = state.statusMessage || 'Listo para enviar a Gemini.';
    }
    if (statusLog) {
      statusLog.textContent = (state.logs || []).slice(-6).join('\n');
    }
    if (submitBtn) {
      const ready = Boolean(hasFiles && state.apiKey && !state.submitting);
      submitBtn.disabled = !ready;
      const plural = files.length > 1 ? 's' : '';

      // Mejorar el texto del botón según el estado
      if (state.submitting && hasFiles) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
      } else if (!hasFiles) {
        submitBtn.innerHTML = '<i class="fas fa-magic"></i> Selecciona PDFs';
      } else {
        submitBtn.innerHTML = `<i class="fas fa-magic"></i> Procesar factura${plural}`;
      }
    }

    // Actualizar botón cancelar para mostrar que puede cerrar
    const cancelBtn = modal.querySelector('[data-action="close-extractor"]');
    if (cancelBtn) {
      if (!hasFiles || this.iaIsProcessing) {
        cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cerrar';
      } else {
        cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancelar';
      }
    }

    // Actualizar estado visual de la API Key si hay una guardada
    const apiKeyStatusContainer = modal.querySelector('[data-role="apikey-status"]');
    if (apiKeyStatusContainer && state.apiKey) {
      const hasValidFormat = state.apiKey.startsWith('AIza') && state.apiKey.length >= 30;
      if (!state.apiKeyVerified) {
        // Solo mostrar estado "guardada" si no se ha verificado aún
        if (hasValidFormat) {
          this.actualizarEstadoApiKey(
            modal,
            'saved',
            'API Key guardada - Haz clic en "Verificar" para probar'
          );
        } else {
          this.actualizarEstadoApiKey(modal, 'unknown', 'Formato de API Key no reconocido');
        }
      }
    } else if (apiKeyStatusContainer && !state.apiKey) {
      this.actualizarEstadoApiKey(modal, 'unknown', 'Ingresa tu API Key de Gemini');
    }
  },

  anexarLogExtractorIA(modal, message) {
    const state = modal.__iaExtractorState;
    if (!state) return;
    const timestamp = new Date().toLocaleTimeString();
    state.logs.push(`[${timestamp}] ${message}`);
    this.actualizarModalExtractorIA(modal);
  },

  async procesarFacturaConIA(modal) {
    const state = modal.__iaExtractorState;
    if (!state || state.submitting) return;
    if (!state.file) {
      Utils.showToast('Selecciona un PDF antes de continuar.', 'warning');
      return;
    }
    if (!state.apiKey) {
      Utils.showToast('Ingresa tu API Key de Gemini.', 'warning');
      return;
    }

    try {
      this.ocultarNotificacionFactura();
      state.submitting = true;
      state.status = 'uploading';
      state.statusMessage = 'Subiendo factura al backend...';
      this.actualizarModalExtractorIA(modal);
      this.guardarPreferenciasExtractorIA(state, true); // No guardar API Key sin cifrar
      this.anexarLogExtractorIA(modal, 'Preparando PDF');

      const csrfToken = await this.getCsrfToken();
      if (!csrfToken) {
        throw new Error('No se pudo obtener el token de seguridad.');
      }

      const pdfBase64 = await this.convertFileToBase64(state.file);
      const pdfData = {
        base64: pdfBase64,
        nombre: state.file.name,
        size: state.file.size,
      };

      const formData = new FormData();
      formData.append('factura', state.file);
      formData.append('apiKey', state.apiKey.trim());
      if (state.model) formData.append('model', state.model.trim());
      formData.append('temperature', Number(state.temperature) || 0.15);
      formData.append('top_p', Number(state.topP) || 0.9);
      formData.append('top_k', Number(state.topK) || 32);
      formData.append('max_tokens', Number(state.maxTokens) || 8192);

      this.anexarLogExtractorIA(modal, `Modelo: ${state.model || 'gemini-2.5-flash'}`);

      const response = await fetch(Utils.apiUrl('/api/procesar-factura'), {
        method: 'POST',
        body: formData,
        headers: { 'x-csrf-token': csrfToken },
        credentials: 'include',
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        const message = payload.message || `Error ${response.status}`;
        throw new Error(message);
      }

      state.status = 'success';
      state.statusMessage = 'Factura procesada exitosamente.';
      this.anexarLogExtractorIA(modal, 'Gemini devolvió resultados estructurados.');

      // Cerrar el modal del extractor
      modal.classList.remove('active');
      setTimeout(() => this.cerrarModalExtractorIA(modal), 200);

      Utils.showToast('✅ Factura procesada con IA. Mostrando resultados...', 'success');

      // MEJORA: Abrir directamente el modal de revisión en lugar de solo notificar
      // Esto permite al usuario ver y editar los datos inmediatamente
      await this.mostrarResultadoFacturaIA(
        payload.extractedData,
        payload.rawText,
        payload.structuredPreview,
        payload.diagnostics || payload.validation || null,
        pdfData
      );

      // También guardar para acceso posterior si cierra el modal
      this.ultimaFacturaProcesada = {
        extractedData: payload.extractedData,
        rawText: payload.rawText,
        structuredPreview: payload.structuredPreview,
        diagnostics: payload.diagnostics || payload.validation || null,
        pdfData: pdfData,
      };
    } catch (error) {
      console.error('[Compras] Error procesando factura IA:', error);
      const state = modal.__iaExtractorState;
      if (state) {
        state.status = 'error';
        state.statusMessage = error.message || 'No se pudo procesar la factura.';
        this.anexarLogExtractorIA(modal, state.statusMessage);
      }
      Utils.showToast(error.message || 'No se pudo procesar la factura.', 'error');
      this.actualizarModalExtractorIA(modal);
    } finally {
      const state = modal.__iaExtractorState;
      if (state) {
        state.submitting = false;
        this.actualizarModalExtractorIA(modal);
      }
    }
  },

  /**
   * Convierte un archivo a Base64
   */
  convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  },

  // ============================================
  // SISTEMA DE COLA DE PROCESAMIENTO MÚLTIPLE
  // ============================================

  /**
   * Procesa múltiples facturas en cola (en segundo plano)
   */
  async procesarFacturasEnCola(modal) {
    const state = modal.__iaExtractorState;
    if (!state || state.submitting) return;

    const files = state.files || [];
    if (files.length === 0) {
      Utils.showToast('Selecciona al menos un PDF.', 'warning');
      return;
    }
    if (!state.apiKey) {
      Utils.showToast('Ingresa tu API Key de Gemini.', 'warning');
      return;
    }

    // Preparar la cola
    this.iaFacturasQueue = files.map((file, index) => ({
      id: `factura-${Date.now()}-${index}`,
      file,
      fileName: file.name,
      status: 'pending', // pending, processing, success, error
      progress: 0,
      error: null,
      result: null,
      pdfData: null,
    }));

    // Guardar preferencias (sin la API Key sin cifrar)
    this.guardarPreferenciasExtractorIA(state, true);

    // Cerrar el modal y comenzar procesamiento en segundo plano
    state.submitting = true;
    this.actualizarModalExtractorIA(modal);

    // Iniciar procesamiento ANTES de cerrar el modal
    this.iaIsProcessing = true;
    this.iniciarIndicadorProgreso();
    this.mostrarPanelFacturasIA();

    setTimeout(() => {
      modal.classList.remove('active');
      setTimeout(() => this.cerrarModalExtractorIA(modal, true), 200); // forzar cierre
    }, 300);

    Utils.showToast(`🚀 Procesando ${files.length} factura(s) en segundo plano...`, 'info');

    await this.procesarSiguienteEnCola();
  },

  /**
   * Procesa el siguiente archivo en la cola
   */
  async procesarSiguienteEnCola() {
    // Buscar el siguiente pendiente
    const pendingIndex = this.iaFacturasQueue.findIndex((item) => item.status === 'pending');

    if (pendingIndex === -1) {
      // Todos procesados
      this.iaIsProcessing = false;
      this.finalizarIndicadorProgreso();

      const exitosos = this.iaFacturasQueue.filter((i) => i.status === 'success').length;
      const errores = this.iaFacturasQueue.filter((i) => i.status === 'error').length;

      if (exitosos > 0) {
        Utils.showToast(
          `✅ ${exitosos} factura(s) procesada(s). ${errores > 0 ? `${errores} con errores.` : 'Revisa y aprueba.'}`,
          'success'
        );
      } else if (errores > 0) {
        Utils.showToast(`❌ Todas las facturas fallaron. Revisa los errores.`, 'error');
      }

      this.actualizarPanelFacturasIA();
      return;
    }

    this.iaProcessingIndex = pendingIndex;
    const item = this.iaFacturasQueue[pendingIndex];
    item.status = 'processing';
    item.progress = 10;

    this.actualizarPanelFacturasIA();
    this.actualizarIndicadorProgreso();

    try {
      const prefs = this.cargarPreferenciasExtractorIA();
      const csrfToken = await this.getCsrfToken();

      if (!csrfToken) {
        throw new Error('No se pudo obtener el token de seguridad.');
      }

      item.progress = 20;
      this.actualizarIndicadorProgreso();

      // Convertir a base64 para guardar después
      const pdfBase64 = await this.convertFileToBase64(item.file);
      item.pdfData = {
        base64: pdfBase64,
        nombre: item.file.name,
        size: item.file.size,
      };

      item.progress = 30;
      this.actualizarIndicadorProgreso();

      const formData = new FormData();
      formData.append('factura', item.file);
      formData.append('apiKey', prefs.apiKey.trim());
      if (prefs.model) formData.append('model', prefs.model.trim());
      formData.append('temperature', Number(prefs.temperature) || 0.15);
      formData.append('top_p', Number(prefs.topP) || 0.9);
      formData.append('top_k', Number(prefs.topK) || 32);
      formData.append('max_tokens', Number(prefs.maxTokens) || 8192);

      item.progress = 50;
      this.actualizarIndicadorProgreso();

      const response = await fetch(Utils.apiUrl('/api/procesar-factura'), {
        method: 'POST',
        body: formData,
        headers: { 'x-csrf-token': csrfToken },
        credentials: 'include',
      });

      item.progress = 80;
      this.actualizarIndicadorProgreso();

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `Error ${response.status}`);
      }

      item.progress = 100;
      item.status = 'success';
      item.result = {
        extractedData: payload.extractedData,
        rawText: payload.rawText,
        structuredPreview: payload.structuredPreview,
        diagnostics: payload.diagnostics || payload.validation || null,
      };

      // Agregar a resultados pendientes de aprobar
      this.iaFacturasResults.push({
        ...item,
        processedAt: new Date().toISOString(),
      });

      console.log(`[Compras] ✅ Factura procesada: ${item.fileName}`);
    } catch (error) {
      console.error(`[Compras] ❌ Error procesando ${item.fileName}:`, error);
      item.status = 'error';
      item.error = error.message || 'Error desconocido';
      item.progress = 0;
    }

    this.actualizarPanelFacturasIA();
    this.actualizarIndicadorProgreso();

    // Pequeña pausa entre archivos para no sobrecargar
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Procesar siguiente
    await this.procesarSiguienteEnCola();
  },

  /**
   * Calcula el progreso total de la cola
   */
  calcularProgresoTotal() {
    if (this.iaFacturasQueue.length === 0) return 0;

    const total = this.iaFacturasQueue.length;
    const completados = this.iaFacturasQueue.filter(
      (i) => i.status === 'success' || i.status === 'error'
    ).length;
    const actual = this.iaFacturasQueue.find((i) => i.status === 'processing');

    const baseProgress = (completados / total) * 100;
    const currentProgress = actual ? (actual.progress / 100) * (100 / total) : 0;

    return Math.round(baseProgress + currentProgress);
  },

  // ============================================
  // INDICADOR DE PROGRESO EN BOTÓN DE CONEXIÓN
  // ============================================

  /**
   * Inicia el indicador de progreso circular
   */
  iniciarIndicadorProgreso() {
    const indicator = document.getElementById('connectionIndicator');
    if (!indicator) return;

    // Agregar clase de progreso
    indicator.classList.add('has-ia-progress');

    // Crear anillo de progreso si no existe
    let progressRing = indicator.querySelector('.connection-indicator__progress-ring');
    if (!progressRing) {
      progressRing = document.createElement('div');
      progressRing.className = 'connection-indicator__progress-ring';
      progressRing.innerHTML = `
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <circle class="progress-bg" cx="50" cy="50" r="48"></circle>
          <circle class="progress-bar" cx="50" cy="50" r="48"></circle>
        </svg>
      `;
      indicator.appendChild(progressRing);
    }

    // Crear badge contador si no existe
    let badge = indicator.querySelector('.connection-indicator__badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'connection-indicator__badge';
      badge.title = 'Facturas en proceso - Clic para ver';
      badge.onclick = () => this.togglePanelFacturasIA();
      indicator.appendChild(badge);
    }

    badge.classList.add('is-processing');
    this.actualizarIndicadorProgreso();
  },

  /**
   * Actualiza el indicador de progreso
   */
  actualizarIndicadorProgreso() {
    const indicator = document.getElementById('connectionIndicator');
    if (!indicator) return;

    const progressBar = indicator.querySelector('.progress-bar');
    const badge = indicator.querySelector('.connection-indicator__badge');
    const progress = this.calcularProgresoTotal();

    if (progressBar) {
      // Calcular el stroke-dashoffset basado en el progreso
      const circumference = 2 * Math.PI * 48; // r=48
      const offset = circumference - (progress / 100) * circumference;
      progressBar.style.strokeDasharray = circumference;
      progressBar.style.strokeDashoffset = offset;
    }

    if (badge) {
      const pendientes = this.iaFacturasQueue.filter(
        (i) => i.status === 'pending' || i.status === 'processing'
      ).length;
      const listos = this.iaFacturasResults.filter((r) => r.status === 'success').length;

      if (this.iaIsProcessing && pendientes > 0) {
        badge.textContent = `${progress}%`;
        badge.classList.add('is-processing');
      } else if (listos > 0) {
        badge.textContent = listos;
        badge.classList.remove('is-processing');
      } else {
        badge.style.display = 'none';
      }

      if (pendientes > 0 || listos > 0) {
        badge.style.display = 'flex';
      }
    }
  },

  /**
   * Finaliza el indicador de progreso
   */
  finalizarIndicadorProgreso() {
    const indicator = document.getElementById('connectionIndicator');
    if (!indicator) return;

    indicator.classList.remove('has-ia-progress');

    const progressRing = indicator.querySelector('.connection-indicator__progress-ring');
    if (progressRing) {
      progressRing.remove();
    }

    // Mantener el badge si hay resultados pendientes
    const badge = indicator.querySelector('.connection-indicator__badge');
    if (badge) {
      badge.classList.remove('is-processing');
      const listos = this.iaFacturasResults.filter((r) => r.status === 'success').length;
      if (listos > 0) {
        badge.textContent = listos;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  },

  // ============================================
  // PANEL FLOTANTE DE FACTURAS PENDIENTES
  // ============================================

  /**
   * Muestra/oculta el panel de facturas
   */
  togglePanelFacturasIA() {
    if (this.iaPanelVisible) {
      this.ocultarPanelFacturasIA();
    } else {
      this.mostrarPanelFacturasIA();
    }
  },

  /**
   * Muestra el panel flotante de facturas
   */
  mostrarPanelFacturasIA() {
    let panel = document.getElementById('iaFacturasPanel');

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'iaFacturasPanel';
      panel.className = 'ia-facturas-panel';
      document.body.appendChild(panel);
    }

    panel.innerHTML = this.renderPanelFacturasIA();
    this.bindEventosPanelFacturasIA(panel);

    requestAnimationFrame(() => {
      panel.classList.add('is-visible');
    });

    this.iaPanelVisible = true;
  },

  /**
   * Oculta el panel flotante
   */
  ocultarPanelFacturasIA() {
    const panel = document.getElementById('iaFacturasPanel');
    if (panel) {
      panel.classList.remove('is-visible');
    }
    this.iaPanelVisible = false;
  },

  /**
   * Renderiza el contenido del panel
   */
  renderPanelFacturasIA() {
    const queue = this.iaFacturasQueue || [];
    const results = this.iaFacturasResults || [];
    const pendientes = results.filter((r) => r.status === 'success');
    const procesando = queue.filter((i) => i.status === 'processing' || i.status === 'pending');
    const errores = queue.filter((i) => i.status === 'error');

    let itemsHtml = '';

    // Mostrar los que están procesando/pendientes
    procesando.forEach((item) => {
      const icon =
        item.status === 'processing'
          ? '<i class="fas fa-spinner fa-spin"></i>'
          : '<i class="fas fa-clock"></i>';
      const statusClass = item.status === 'processing' ? 'is-processing' : 'is-pending';
      const statusText =
        item.status === 'processing' ? `Procesando... ${item.progress}%` : 'En cola';

      itemsHtml += `
        <div class="ia-factura-item ${statusClass}">
          <div class="ia-factura-item__icon">${icon}</div>
          <div class="ia-factura-item__info">
            <div class="ia-factura-item__name">${Utils.escapeHTML(item.fileName)}</div>
            <div class="ia-factura-item__status">${statusText}</div>
          </div>
        </div>
      `;
    });

    // Mostrar los listos para aprobar
    pendientes.forEach((item) => {
      const proveedor =
        item.result?.extractedData?.proveedor?.nombre ||
        item.result?.extractedData?.vendedor?.nombre ||
        'Proveedor detectado';

      itemsHtml += `
        <div class="ia-factura-item is-ready" data-factura-id="${item.id}">
          <div class="ia-factura-item__icon"><i class="fas fa-file-invoice"></i></div>
          <div class="ia-factura-item__info">
            <div class="ia-factura-item__name">${Utils.escapeHTML(item.fileName)}</div>
            <div class="ia-factura-item__status">✓ ${Utils.escapeHTML(proveedor)}</div>
          </div>
          <div class="ia-factura-item__actions">
            <button class="ia-factura-item__btn btn-view" data-action="view" title="Ver detalles">
              <i class="fas fa-eye"></i>
            </button>
            <button class="ia-factura-item__btn btn-approve" data-action="approve" title="Aprobar">
              <i class="fas fa-check"></i>
            </button>
            <button class="ia-factura-item__btn btn-delete" data-action="delete" title="Descartar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    });

    // Mostrar errores
    errores.forEach((item) => {
      itemsHtml += `
        <div class="ia-factura-item is-error" data-factura-id="${item.id}">
          <div class="ia-factura-item__icon"><i class="fas fa-exclamation-triangle"></i></div>
          <div class="ia-factura-item__info">
            <div class="ia-factura-item__name">${Utils.escapeHTML(item.fileName)}</div>
            <div class="ia-factura-item__status">❌ ${Utils.escapeHTML(item.error || 'Error')}</div>
          </div>
          <div class="ia-factura-item__actions">
            <button class="ia-factura-item__btn btn-delete" data-action="delete-error" title="Eliminar">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      `;
    });

    if (!itemsHtml) {
      itemsHtml = `
        <div class="ia-facturas-panel__empty">
          <i class="fas fa-inbox"></i>
          <div>No hay facturas en proceso</div>
        </div>
      `;
    }

    const canApproveAll = pendientes.length > 1;

    return `
      <div class="ia-facturas-panel__header">
        <h4><i class="fas fa-robot"></i> Facturas IA</h4>
        <button class="ia-facturas-panel__close" data-action="close-panel">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="ia-facturas-panel__body">
        ${itemsHtml}
      </div>
      <div class="ia-facturas-panel__footer">
        <button class="btn-add-more" data-action="add-more">
          <i class="fas fa-plus"></i> Agregar más
        </button>
        <button class="btn-approve-all" data-action="approve-all" ${canApproveAll ? '' : 'disabled'}>
          <i class="fas fa-check-double"></i> Aprobar todas
        </button>
      </div>
    `;
  },

  /**
   * Actualiza el panel de facturas
   */
  actualizarPanelFacturasIA() {
    const panel = document.getElementById('iaFacturasPanel');
    if (!panel || !this.iaPanelVisible) return;

    panel.innerHTML = this.renderPanelFacturasIA();
    this.bindEventosPanelFacturasIA(panel);
  },

  /**
   * Vincula eventos al panel
   */
  bindEventosPanelFacturasIA(panel) {
    if (!panel) return;

    panel.querySelector('[data-action="close-panel"]')?.addEventListener('click', () => {
      this.ocultarPanelFacturasIA();
    });

    panel.querySelector('[data-action="add-more"]')?.addEventListener('click', () => {
      this.ocultarPanelFacturasIA();
      this.abrirModalExtractorIA();
    });

    panel.querySelector('[data-action="approve-all"]')?.addEventListener('click', () => {
      this.aprobarTodasFacturasIA();
    });

    // Eventos de items individuales
    panel.querySelectorAll('.ia-factura-item[data-factura-id]').forEach((item) => {
      const id = item.dataset.facturaId;

      item.querySelector('[data-action="view"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.verFacturaIA(id);
      });

      item.querySelector('[data-action="approve"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.aprobarFacturaIA(id);
      });

      item.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.descartarFacturaIA(id);
      });

      item.querySelector('[data-action="delete-error"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.eliminarErrorFacturaIA(id);
      });

      // Click en el item abre la vista
      item.addEventListener('click', () => {
        if (item.classList.contains('is-ready')) {
          this.verFacturaIA(id);
        }
      });
    });
  },

  /**
   * Ver detalles de una factura procesada
   */
  async verFacturaIA(facturaId) {
    const factura = this.iaFacturasResults.find((r) => r.id === facturaId);
    if (!factura || !factura.result) {
      Utils.showToast('Factura no encontrada.', 'warning');
      return;
    }

    this.ocultarPanelFacturasIA();

    await this.mostrarResultadoFacturaIA(
      factura.result.extractedData,
      factura.result.rawText,
      factura.result.structuredPreview,
      factura.result.diagnostics,
      factura.pdfData
    );
  },

  /**
   * Aprobar y guardar una factura
   */
  async aprobarFacturaIA(facturaId) {
    const index = this.iaFacturasResults.findIndex((r) => r.id === facturaId);
    if (index === -1) {
      Utils.showToast('Factura no encontrada.', 'warning');
      return;
    }

    const factura = this.iaFacturasResults[index];

    // Usar el flujo existente de mostrar resultado para que el usuario pueda editar y guardar
    await this.verFacturaIA(facturaId);

    // Remover de pendientes
    this.iaFacturasResults.splice(index, 1);
    this.actualizarPanelFacturasIA();
    this.actualizarIndicadorProgreso();
  },

  /**
   * Aprobar todas las facturas pendientes
   */
  async aprobarTodasFacturasIA() {
    const pendientes = this.iaFacturasResults.filter((r) => r.status === 'success');
    if (pendientes.length === 0) {
      Utils.showToast('No hay facturas para aprobar.', 'info');
      return;
    }

    // Por ahora, abrir cada una para revisar (el usuario debe aprobar manualmente)
    Utils.showToast(`Abre cada factura para revisar y aprobar.`, 'info');

    // Abrir la primera
    if (pendientes.length > 0) {
      await this.verFacturaIA(pendientes[0].id);
    }
  },

  /**
   * Descartar una factura
   */
  descartarFacturaIA(facturaId) {
    const index = this.iaFacturasResults.findIndex((r) => r.id === facturaId);
    if (index !== -1) {
      this.iaFacturasResults.splice(index, 1);
      Utils.showToast('Factura descartada.', 'info');
      this.actualizarPanelFacturasIA();
      this.actualizarIndicadorProgreso();

      // Si ya no hay pendientes, ocultar badge
      if (this.iaFacturasResults.length === 0) {
        const badge = document.querySelector('.connection-indicator__badge');
        if (badge) badge.style.display = 'none';
      }
    }
  },

  /**
   * Eliminar una factura con error de la cola
   */
  eliminarErrorFacturaIA(facturaId) {
    const index = this.iaFacturasQueue.findIndex((i) => i.id === facturaId);
    if (index !== -1) {
      this.iaFacturasQueue.splice(index, 1);
      this.actualizarPanelFacturasIA();
    }
  },

  notificarFacturaProcesada(
    extractedData,
    rawText = '',
    structuredPreview = '',
    diagnostics = null,
    pdfData = null
  ) {
    this.ultimaFacturaProcesada = {
      extractedData,
      rawText,
      structuredPreview,
      diagnostics,
      pdfData,
    };

    const proveedorNombre =
      extractedData?.proveedor?.nombre || extractedData?.proveedorNombre || '';

    const bubbleLabel = proveedorNombre
      ? `Factura IA lista: ${proveedorNombre}`
      : 'Factura procesada por IA';

    if (!this.facturaNotificacionElement) {
      const bubble = document.createElement('button');
      bubble.type = 'button';
      bubble.id = 'factura-ai-notification';
      bubble.className = 'factura-ai-notification';
      bubble.innerHTML = `<i class="fas fa-robot"></i><span>${Utils.escapeHTML(bubbleLabel)}</span>`;
      bubble.onclick = async () => {
        const payload = this.ultimaFacturaProcesada;
        if (!payload) {
          return;
        }
        this.ocultarNotificacionFactura();
        await this.mostrarResultadoFacturaIA(
          payload.extractedData,
          payload.rawText,
          payload.structuredPreview,
          payload.diagnostics,
          payload.pdfData
        );
        this.ultimaFacturaProcesada = null;
      };
      document.body.appendChild(bubble);
      this.facturaNotificacionElement = bubble;
      requestAnimationFrame(() => {
        this.facturaNotificacionElement?.classList.add('visible');
      });
    } else {
      this.facturaNotificacionElement.innerHTML = `<i class="fas fa-robot"></i><span>${Utils.escapeHTML(bubbleLabel)}</span>`;
      this.facturaNotificacionElement.classList.add('visible');
    }

    try {
      if (
        window.PushNotifications &&
        typeof PushNotifications.isEnabled === 'function' &&
        PushNotifications.isEnabled()
      ) {
        PushNotifications.showNotification({
          title: 'Factura IA lista',
          body: proveedorNombre
            ? `Proveedor: ${proveedorNombre}`
            : 'Revisa los datos extraídos por la IA.',
          tag: `factura-ia-${Date.now()}`,
          data: { type: 'factura-ia', action: 'open' },
        });
      }
    } catch (notificationError) {
      console.warn('[Compras] No se pudo enviar notificación push:', notificationError);
    }

    Utils.showToast(
      'Factura procesada por IA. Usa la notificación flotante para revisarla.',
      'success'
    );
  },

  ocultarNotificacionFactura() {
    if (this.facturaNotificacionElement) {
      this.facturaNotificacionElement.classList.remove('visible');
    }
  },

  iniciarSeguimientoProgresoFactura() {
    this.detenerSeguimientoProgresoFactura();
    this.facturaProgressValue = 70;
    this.facturaProgressInterval = setInterval(() => {
      if (!this.procesandoFacturaSegundoPlano) {
        this.detenerSeguimientoProgresoFactura();
        return;
      }
      const nextValue = Math.min(this.facturaProgressValue + 1, 95);
      this.facturaProgressValue = nextValue;
      ProgressBar.update('Paso 3/4: Procesando con IA...', nextValue);
    }, 1200);
  },

  detenerSeguimientoProgresoFactura() {
    if (this.facturaProgressInterval) {
      clearInterval(this.facturaProgressInterval);
      this.facturaProgressInterval = null;
    }
    this.facturaProgressValue = 0;
  },

  normalizeDocumento(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/[^0-9a-zA-Z]/g, '')
      .trim();
  },

  async ensureIaCatalogData(options = {}) {
    const force = options.force === true;
    const now = Date.now();

    if (!force && this.__iaCatalogCache && now - this.__iaCatalogCache.loadedAt < 60_000) {
      return this.__iaCatalogCache;
    }

    let categorias = [];
    let proveedores = [];

    try {
      if (
        typeof Productos !== 'undefined' &&
        Productos &&
        typeof Productos.fetchCollection === 'function'
      ) {
        const [cats, provs] = await Promise.all([
          Productos.fetchCollection('categorias').catch(() => []),
          Productos.fetchCollection('proveedores').catch(() => []),
        ]);
        categorias = Array.isArray(cats) ? cats : [];
        proveedores = Array.isArray(provs) ? provs : [];
      } else if (
        typeof Database !== 'undefined' &&
        Database &&
        typeof Database.getCollection === 'function'
      ) {
        categorias = Database.getCollection('categorias') || [];
        proveedores = Database.getCollection('proveedores') || [];
      }
    } catch (error) {
      console.warn('[Compras] No se pudo obtener catálogo para IA:', error);
    }

    const catalog = {
      categorias: Array.isArray(categorias) ? categorias.filter((cat) => cat && cat.id) : [],
      proveedores: Array.isArray(proveedores) ? proveedores.filter((prov) => prov && prov.id) : [],
      categoriasById: new Map(),
      categoriasByName: new Map(),
      proveedoresById: new Map(),
      proveedoresByName: new Map(),
      proveedoresByDocumento: new Map(),
      loadedAt: now,
    };

    catalog.categorias.forEach((cat) => {
      const id = String(cat.id);
      const nombre = (cat.nombre || '').toString().trim();
      catalog.categoriasById.set(id, cat);
      if (nombre) {
        catalog.categoriasByName.set(nombre.toLowerCase(), cat);
      }
    });

    catalog.proveedores.forEach((prov) => {
      const id = String(prov.id);
      const nombre = (prov.nombre || '').toString().trim();
      const doc = this.normalizeDocumento(prov.ruc || prov.identificacion || prov.documento || '');
      catalog.proveedoresById.set(id, prov);
      if (nombre) {
        catalog.proveedoresByName.set(nombre.toLowerCase(), prov);
      }
      if (doc) {
        catalog.proveedoresByDocumento.set(doc, prov);
      }
    });

    this.__iaCatalogCache = catalog;
    return catalog;
  },

  getIaCatalog() {
    if (this.__iaCatalogCache) {
      return this.__iaCatalogCache;
    }
    return {
      categorias: [],
      proveedores: [],
      categoriasById: new Map(),
      categoriasByName: new Map(),
      proveedoresById: new Map(),
      proveedoresByName: new Map(),
      proveedoresByDocumento: new Map(),
      loadedAt: 0,
    };
  },

  resolveCategoriaCatalog(item = {}) {
    const catalog = this.getIaCatalog();
    let categoriaId = (item.categoriaId || item.categoria_id || '').toString().trim();
    let categoriaNombre = (item.categoriaNombre || item.categoria || item.categoryName || '')
      .toString()
      .trim();

    if (categoriaId && catalog.categoriasById.has(categoriaId)) {
      const cat = catalog.categoriasById.get(categoriaId);
      return {
        id: categoriaId,
        nombre: categoriaNombre || cat.nombre || '',
      };
    }

    if (categoriaNombre) {
      const lookup = catalog.categoriasByName.get(categoriaNombre.toLowerCase());
      if (lookup) {
        return {
          id: String(lookup.id),
          nombre: lookup.nombre || categoriaNombre,
        };
      }
    }

    return {
      id: categoriaId || '',
      nombre: categoriaNombre || '',
    };
  },

  resolveProveedorCatalog(item = {}) {
    const catalog = this.getIaCatalog();
    const facturaProveedor = this.facturaIAReciente?.proveedor || {};

    let proveedorId = (item.proveedorId || item.proveedor_id || facturaProveedor.id || '')
      .toString()
      .trim();
    if (proveedorId === 'null') proveedorId = '';
    if (proveedorId === 'undefined') proveedorId = '';
    let proveedorNombre = (
      item.proveedorNombre ||
      item.proveedor ||
      item.supplierName ||
      facturaProveedor.nombre ||
      ''
    )
      .toString()
      .trim();
    const proveedorDocumento = this.normalizeDocumento(
      item.proveedorIdentificacion ||
        item.proveedorDocumento ||
        item.identificacionProveedor ||
        item.proveedorRuc ||
        facturaProveedor.ruc ||
        ''
    );

    if (proveedorId && catalog.proveedoresById.has(proveedorId)) {
      const prov = catalog.proveedoresById.get(proveedorId);
      return {
        id: proveedorId,
        nombre: proveedorNombre || prov.nombre || '',
        documento:
          proveedorDocumento ||
          this.normalizeDocumento(prov.ruc || prov.identificacion || prov.documento || ''),
      };
    }

    if (proveedorDocumento && catalog.proveedoresByDocumento.has(proveedorDocumento)) {
      const prov = catalog.proveedoresByDocumento.get(proveedorDocumento);
      return {
        id: String(prov.id),
        nombre: prov.nombre || proveedorNombre,
        documento: proveedorDocumento,
      };
    }

    if (proveedorNombre) {
      const lookup = catalog.proveedoresByName.get(proveedorNombre.toLowerCase());
      if (lookup) {
        return {
          id: String(lookup.id),
          nombre: lookup.nombre,
          documento: this.normalizeDocumento(
            lookup.ruc || lookup.identificacion || lookup.documento || proveedorDocumento
          ),
        };
      }
    }

    if (!proveedorId && facturaProveedor.id) {
      return {
        id: String(facturaProveedor.id),
        nombre: facturaProveedor.nombre || proveedorNombre,
        documento: proveedorDocumento || this.normalizeDocumento(facturaProveedor.ruc || ''),
      };
    }

    return {
      id: proveedorId || '',
      nombre: proveedorNombre || '',
      documento: proveedorDocumento || '',
    };
  },

  buildCategoriaOptionsHtml(selectedId = '', selectedName = '') {
    const catalog = this.getIaCatalog();
    const options = [];
    const normalizedId = selectedId ? String(selectedId) : '';
    const normalizedName = (selectedName || '').toString().trim();
    let hasSelected = false;

    options.push(
      `<option value="" data-placeholder="1">${Utils.escapeHTML(normalizedName || 'Selecciona')}</option>`
    );

    catalog.categorias.forEach((cat) => {
      const value = String(cat.id);
      const isSelected = value === normalizedId;
      if (isSelected) {
        hasSelected = true;
      }
      options.push(
        `<option value="${Utils.escapeHTML(value)}"${isSelected ? ' selected' : ''}>${Utils.escapeHTML(cat.nombre || 'Sin nombre')}</option>`
      );
    });

    if (normalizedId && !hasSelected) {
      options.push(
        `<option value="${Utils.escapeHTML(normalizedId)}" selected>${Utils.escapeHTML(normalizedName || 'Categoría sugerida')}</option>`
      );
    }

    if (!normalizedId) {
      options[0] = `<option value="" data-placeholder="1" selected>${Utils.escapeHTML(normalizedName || 'Selecciona')}</option>`;
    }

    return options.join('');
  },

  buildProveedorOptionsHtml(selectedId = '', selectedName = '', selectedDocumento = '') {
    const catalog = this.getIaCatalog();
    const options = [];
    const normalizedId = selectedId ? String(selectedId) : '';
    const normalizedName = (selectedName || '').toString().trim();
    const normalizedDoc = this.normalizeDocumento(selectedDocumento || '');
    let hasSelected = false;

    options.push(
      `<option value="" data-placeholder="1" data-documento="">${Utils.escapeHTML(normalizedName || 'Detectado en factura')}</option>`
    );

    catalog.proveedores.forEach((prov) => {
      const value = String(prov.id);
      const isSelected = value === normalizedId;
      const doc = this.normalizeDocumento(prov.ruc || prov.identificacion || prov.documento || '');
      if (isSelected) {
        hasSelected = true;
      }
      options.push(
        `<option value="${Utils.escapeHTML(value)}" data-documento="${Utils.escapeHTML(doc)}"${isSelected ? ' selected' : ''}>${Utils.escapeHTML(prov.nombre || 'Sin nombre')}</option>`
      );
    });

    if (normalizedId && !hasSelected) {
      options.push(
        `<option value="${Utils.escapeHTML(normalizedId)}" data-documento="${Utils.escapeHTML(normalizedDoc)}" selected>${Utils.escapeHTML(normalizedName || 'Proveedor sugerido')}</option>`
      );
    }

    if (!normalizedId) {
      options[0] = `<option value="" data-placeholder="1" data-documento="" selected>${Utils.escapeHTML(normalizedName || 'Detectado en factura')}</option>`;
    }

    return options.join('');
  },

  selectOptionByValue(select, value, label = '') {
    if (!select) return;
    const targetValue = value ? String(value) : '';
    const options = Array.from(select.options || []);
    let option = options.find((opt) => opt.value === targetValue);

    if (!option && targetValue) {
      const display = label || targetValue;
      option = document.createElement('option');
      option.value = targetValue;
      option.textContent = display;
      select.appendChild(option);
    }

    if (option) {
      option.selected = true;
      select.value = targetValue;
    } else {
      select.value = '';
      if (label) {
        const placeholder = select.querySelector('option[data-placeholder="1"]');
        if (placeholder) {
          placeholder.textContent = label;
        }
      }
    }
  },

  async mostrarResultadoFacturaIA(
    extractedData,
    rawText = '',
    structuredPreview = '',
    diagnostics = null,
    pdfData = null
  ) {
    const modalId = 'modalResultadoFacturaIA';
    Utils.closeModal(modalId);

    console.log('🚀🚀🚀 [COMPRAS v2.5] MODAL CON 57 CAMPOS Y 6 PESTAÑAS CARGADO 🚀🚀🚀');

    console.log('[Compras] mostrarResultadoFacturaIA llamado con:', {
      hasData: !!extractedData,
      dataType: typeof extractedData,
      itemsCount: Array.isArray(extractedData?.items) ? extractedData.items.length : 0,
      productos: Array.isArray(extractedData?.productos) ? extractedData.productos.length : 0,
      method: diagnostics?.extractionMethod || 'unknown',
      schema57: !!(
        extractedData?.vendedor ||
        extractedData?.comprador ||
        extractedData?.detalles_factura
      ),
    });

    if (!extractedData || typeof extractedData !== 'object') {
      console.error('[Compras] extractedData inválido:', extractedData);
      Utils.showToast(
        'La IA no devolvió datos aprovechables. Intenta con otro PDF o verifica la configuración.',
        'error',
        5000
      );
      return;
    }

    // Detectar si viene con el esquema nuevo (57 campos) o el legacy
    const esEsquemaNuevo = !!(
      extractedData.vendedor ||
      extractedData.comprador ||
      extractedData.detalles_factura ||
      extractedData.productos
    );

    // Validar que haya al menos algo de información
    const hasItems = Array.isArray(extractedData.items) && extractedData.items.length > 0;
    const hasProductos =
      Array.isArray(extractedData.productos) && extractedData.productos.length > 0;
    const hasProvider = extractedData.proveedor?.nombre || extractedData.vendedor?.nombre;
    const hasTotal =
      extractedData.total !== undefined || extractedData.totales?.total !== undefined;

    if (!hasItems && !hasProductos && !hasProvider && !hasTotal) {
      console.warn('[Compras] Datos extraídos pero completamente vacíos');
      Utils.showToast(
        '⚠️ El PDF fue procesado pero no se encontraron datos de factura. ¿Es un documento válido?',
        'warning',
        6000
      );
      return;
    }

    if (!hasItems && !hasProductos) {
      console.warn('[Compras] No se extrajeron items de la factura');
      Utils.showToast(
        '⚠️ Se extrajeron datos generales pero no se encontraron items/productos en la factura.',
        'warning',
        5000
      );
    }

    await this.ensureIaCatalogData();

    const data = { ...extractedData };

    // Normalizar esquema nuevo (57 campos) vs legacy
    if (esEsquemaNuevo) {
      // Esquema nuevo con vendedor/comprador/detalles_factura/productos/totales
      const vendedor = data.vendedor || {};
      const comprador = data.comprador || {};
      const detalles = data.detalles_factura || {};
      const totales = data.totales || {};

      // Mapear a formato legacy para compatibilidad
      data.proveedor = {
        nombre: vendedor.nombre || vendedor.razon_social || '',
        razon_social: vendedor.razon_social || vendedor.nombre || '',
        rfc: vendedor.rfc_tax_id || '',
        ruc: vendedor.rfc_tax_id || '',
        direccion: vendedor.direccion || '',
        ciudad: vendedor.ciudad || '',
        estado: vendedor.estado || '',
        codigo_postal: vendedor.codigo_postal || '',
        pais: vendedor.pais || '',
        telefono: vendedor.telefono || '',
        email: vendedor.email || '',
        sitio_web: vendedor.sitio_web || '',
      };

      data.cliente = data.comprador = {
        nombre: comprador.nombre || comprador.razon_social || '',
        razon_social: comprador.razon_social || comprador.nombre || '',
        rfc: comprador.rfc_tax_id || '',
        ruc: comprador.rfc_tax_id || '',
        direccion: comprador.direccion || '',
        ciudad: comprador.ciudad || '',
        estado: comprador.estado || '',
        codigo_postal: comprador.codigo_postal || '',
        pais: comprador.pais || '',
        telefono: comprador.telefono || '',
        email: comprador.email || '',
        contacto: comprador.contacto || '',
      };

      data.numero_factura = detalles.numero || detalles.serie || '';
      data.serie = detalles.serie || '';
      data.folio_fiscal = detalles.folio_fiscal || '';
      data.fecha = detalles.fecha_emision || new Date().toISOString().split('T')[0];
      data.fecha_vencimiento = detalles.fecha_vencimiento || '';
      data.orden_compra = detalles.orden_compra || '';
      data.condiciones_pago = detalles.condiciones_pago || '';
      data.metodo_pago = detalles.metodo_pago || '';
      data.forma_pago = detalles.forma_pago || '';
      data.moneda = detalles.moneda || totales.moneda || data.moneda || 'USD';
      data.tipo_cambio = detalles.tipo_cambio || 1;
      data.uso_cfdi = detalles.uso_cfdi || '';
      data.lugar_expedicion = detalles.lugar_expedicion || '';

      data.subtotal = totales.subtotal || 0;
      data.iva = totales.iva || 0;
      data.isr_retenido = totales.isr_retenido || 0;
      data.iva_retenido = totales.iva_retenido || 0;
      data.descuento = totales.descuento || 0;
      data.subtotal_con_descuento = totales.subtotal_con_descuento || 0;
      data.otros_impuestos = totales.otros_impuestos || 0;
      data.total = totales.total || 0;
      data.total_letra = totales.total_letra || '';

      // Convertir productos a items
      if (Array.isArray(data.productos) && data.productos.length > 0) {
        data.items = data.productos.map((p) => ({
          nombre: p.descripcion || p.clave || '',
          descripcion: p.descripcion || '',
          codigo: p.clave || '',
          unidad: p.unidad || '',
          cantidad: p.cantidad || 0,
          precioUnitario: p.precio_unitario || 0,
          precio_unitario: p.precio_unitario || 0,
          descuento: p.descuento || 0,
          subtotal: p.subtotal || 0,
          impuestos: p.impuestos || 0,
          total: p.total || 0,
          categoria: p.categoria || '',
          categoriaId: p.categoriaId || '',
          proveedorId: p.proveedorId || '',
          proveedorNombre: p.proveedorNombre || '',
        }));
      }
    }

    const resolvedProveedor = this.resolveProveedorCatalog({
      proveedorId: data.proveedor?.id || data.proveedorId,
      proveedorNombre: data.proveedor?.nombre || data.proveedorNombre,
      proveedorIdentificacion: data.proveedor?.ruc || data.proveedorIdentificacion,
    });

    const proveedor = {
      ...(data.proveedor || {}),
      id: resolvedProveedor.id ? String(resolvedProveedor.id) : null,
      nombre: (resolvedProveedor.nombre || data.proveedor?.nombre || data.proveedorNombre || '')
        .toString()
        .trim(),
      ruc: (
        resolvedProveedor.documento ||
        data.proveedor?.ruc ||
        data.proveedorIdentificacion ||
        ''
      )
        .toString()
        .trim(),
    };
    data.proveedor = proveedor;

    // Validar y normalizar fecha - protección contra fechas inválidas
    let fechaISO;
    try {
      if (data.fecha) {
        const fechaDate = new Date(data.fecha);
        // Verificar si la fecha es válida
        if (!isNaN(fechaDate.getTime())) {
          fechaISO = fechaDate.toISOString().split('T')[0];
        } else {
          console.warn('[Compras] Fecha inválida recibida:', data.fecha);
          fechaISO = new Date().toISOString().split('T')[0];
        }
      } else {
        fechaISO = new Date().toISOString().split('T')[0];
      }
    } catch (fechaError) {
      console.warn('[Compras] Error procesando fecha:', fechaError, data.fecha);
      fechaISO = new Date().toISOString().split('T')[0];
    }

    const moneda = (data.moneda || 'USD').toString().toUpperCase();
    const subtotalIA = Number(data.subtotal || 0);
    const ivaIA = Number(data.iva || 0);
    const otrosIA = Number(data.otrosImpuestos || data.otros_impuestos || 0);
    const totalIA = Number(data.total || subtotalIA + ivaIA + otrosIA);
    const ivaRateBase = Number.isFinite(data.ivaRate)
      ? data.ivaRate
      : subtotalIA > 0
        ? (ivaIA / subtotalIA) * 100
        : 12;

    const metadataEntriesAll = Array.isArray(data.metadata)
      ? data.metadata.filter((entry) => entry && typeof entry === 'object')
      : [];

    const normalizeHora = (valor) => {
      if (!valor || typeof valor !== 'string') return '';
      const trimmed = valor.trim();
      if (!trimmed) return '';
      const colonMatch = trimmed.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
      if (colonMatch) {
        let hour = parseInt(colonMatch[1], 10);
        const minutes = colonMatch[2];
        const ampm = colonMatch[4] ? colonMatch[4].replace(/\./g, '').toLowerCase() : '';
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        return `${String(hour).padStart(2, '0')}:${minutes}`;
      }
      const hourOnly = trimmed.match(/^(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)$/i);
      if (hourOnly) {
        let hour = parseInt(hourOnly[1], 10);
        const ampm = hourOnly[2].replace(/\./g, '').toLowerCase();
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        return `${String(hour).padStart(2, '0')}:00`;
      }
      if (/^\d{2}:\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      return '';
    };

    const rawHora = data.hora || data.hora_emision || data.horaFactura || data.hora_factura || '';
    const horaValue = normalizeHora(rawHora);

    const metadataForDisplay = metadataEntriesAll
      .map((entry) => {
        const rawLabel = entry.label ?? entry.nombre ?? '';
        const rawValue = entry.value ?? entry.valor ?? entry.dato ?? '';
        const labelText =
          typeof rawLabel === 'object' ? JSON.stringify(rawLabel) : String(rawLabel);
        const valueText =
          typeof rawValue === 'object' ? JSON.stringify(rawValue) : String(rawValue);
        return { label: labelText, value: valueText };
      })
      .filter(({ label, value }) => {
        const labelTrim = label.trim();
        const valueTrim = value.trim();
        if (!labelTrim || !valueTrim) return false;
        const lower = labelTrim.toLowerCase();
        if (lower.includes('proveedor') && lower.includes('ruc') && (proveedor?.ruc || '').trim())
          return false;
        if (lower === 'ruc' || (lower.includes('ruc') && !lower.includes('cliente'))) {
          const providerRucClean = (proveedor?.ruc || '').replace(/\D/g, '');
          const entryRucClean = valueTrim.replace(/\D/g, '');
          if (providerRucClean && entryRucClean === providerRucClean) {
            return false;
          }
        }
        if ((lower.startsWith('numero') || lower.startsWith('número')) && data.numero_factura)
          return false;
        if (lower.includes('factura') && data.numero_factura && !lower.includes('cliente'))
          return false;
        if (
          !lower.includes('venc') &&
          (lower === 'fecha' || lower.startsWith('fecha ')) &&
          data.fecha
        )
          return false;
        if (lower.includes('moneda') && moneda) return false;
        if (horaValue && lower.includes('hora')) return false;
        return true;
      });

    if (metadataEntriesAll.length) {
      data.metadata = metadataEntriesAll;
    }
    if (horaValue) {
      data.hora = horaValue;
    }

    const metadataSection = metadataForDisplay.length
      ? `
        <h5>Datos detectados por IA</h5>
        <div class="ia-metadata-grid">
          ${metadataForDisplay
            .map(
              (entry) => `
            <div class="ia-metadata-item">
              <span class="label">${Utils.escapeHTML(entry.label)}</span>
              <span class="value">${Utils.escapeHTML(entry.value)}</span>
            </div>
          `
            )
            .join('')}
        </div>
      `
      : '';

    this.facturaIAReciente = {
      ...data,
      moneda,
      subtotal: subtotalIA,
      iva: ivaIA,
      otrosImpuestos: otrosIA,
      total: totalIA,
      ivaRate: ivaRateBase,
      metadata: metadataEntriesAll,
      hora: horaValue || rawHora || null,
      pdfData: pdfData, // Almacenar datos del PDF para guardar después
      proveedor,
      proveedorId: proveedor.id || null,
    };

    this.resetProductoSugerencias();

    const itemsRows =
      Array.isArray(data.items) && data.items.length > 0
        ? data.items.map((item, index) => this.crearFilaItemEditable(item, index)).join('')
        : '<tr><td colspan="9" class="text-center">No se detectaron ítems. Puede agregarlos manualmente.</td></tr>';

    const ivaRateValue = Number.isFinite(ivaRateBase) ? ivaRateBase : 12;
    const ivaMontoValue = Number.isFinite(ivaIA) ? ivaIA : subtotalIA * (ivaRateValue / 100);
    const otrosMontoValue = Number.isFinite(otrosIA) ? otrosIA : 0;
    const totalDetectado = Number.isFinite(totalIA)
      ? totalIA
      : subtotalIA + ivaMontoValue + otrosMontoValue;

    const structuredBlock = structuredPreview
      ? `<pre>${Utils.escapeHTML(structuredPreview)}</pre>`
      : '';

    // Crear HTML con pestañas para organizar los 57 campos
    const body = `
      <style>
        .factura-tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--border-color); margin-bottom: 20px; flex-wrap: wrap; }
        .factura-tabs button { background: transparent; border: none; padding: 10px 16px; cursor: pointer; font-weight: 500; color: var(--text-secondary); transition: all 0.2s; border-bottom: 2px solid transparent; margin-bottom: -2px; }
        .factura-tabs button:hover { color: var(--primary-color); background: var(--primary-soft); }
        .factura-tabs button.active { color: var(--primary-color); border-bottom-color: var(--primary-color); background: var(--primary-soft); }
        .factura-tab-content { display: none; }
        .factura-tab-content.active { display: block; }
        .form-ia-editor .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 16px; }
        .form-ia-editor .form-grid-2 { grid-template-columns: repeat(2, 1fr); }
        .form-ia-editor .form-grid-3 { grid-template-columns: repeat(3, 1fr); }
        .form-ia-editor .form-group.full { grid-column: 1 / -1; }
        .form-ia-editor h5 { margin: 24px 0 12px; color: var(--primary-color); font-size: 1rem; }
        .ia-metadata-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px 16px; margin-bottom: 20px; }
        .ia-metadata-item { background: var(--primary-soft); border: 1px solid var(--primary-soft-strong); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; box-shadow: var(--shadow-sm); }
        .ia-metadata-item .label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--primary-color); }
        .ia-metadata-item .value { font-size: 0.9rem; color: var(--text-primary); word-break: break-word; }
        .ia-items-table-editable tr.ia-row-duplicate { background: var(--warning-soft); }
        .ia-compra-totales .total-row { display: flex; align-items: center; gap: 12px; justify-content: space-between; flex-wrap: wrap; }
        .ia-compra-totales .total-row input { max-width: 160px; }
        .ia-items-warnings { margin-bottom: 12px; }
        .ia-producto-cell { position: relative; display: flex; flex-direction: column; gap: 4px; }
        .ia-producto-input-group { display: flex; align-items: center; gap: 6px; width: 100%; }
        .ia-producto-input-group input { flex: 1 1 auto; }
        .ia-producto-input-group .btn { flex: 0 0 auto; }
        .ia-producto-sugerencias { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; box-shadow: var(--shadow-lg); z-index: 60; max-height: 220px; overflow-y: auto; padding: 4px 0; }
        .ia-producto-sugerencias button { width: 100%; border: none; background: transparent; padding: 8px 12px; text-align: left; cursor: pointer; }
        .ia-producto-sugerencias button:hover { background: var(--bg-secondary); }
        .ia-producto-sugerencias .ia-producto-suggestion-detalle { display: block; font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
        .ia-producto-sugerencias .ia-producto-suggestion-empty { padding: 8px 12px; font-size: 12px; color: var(--text-tertiary); cursor: default; }
        .ia-producto-asignado { display: none; font-size: 12px; color: var(--info-color); align-items: center; gap: 6px; }
        .ia-producto-asignado.visible { display: flex; }
        .ia-producto-asignado button { border: none; background: transparent; color: var(--text-tertiary); cursor: pointer; padding: 2px; }
        .ia-producto-asignado button:hover { color: var(--error-color); }
        .ia-info-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--info-soft); border: 1px solid var(--info-color); border-radius: 6px; font-size: 0.85rem; margin-bottom: 16px; }
        
        /* Estilos para Reporte de Validación Matemática */
        .ia-validation-report { background: var(--bg-secondary); border-radius: 10px; padding: 16px; margin-bottom: 20px; }
        .ia-validation-badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; margin-bottom: 16px; }
        .ia-validation-badge--excellent { background: linear-gradient(135deg, #10b981, #059669); border: 2px solid #059669; color: #fff; }
        .ia-validation-badge--success { background: var(--success-soft); border: 2px solid var(--success-color); color: var(--success-color); }
        .ia-validation-badge--warning { background: var(--warning-soft); border: 2px solid var(--warning-color); color: var(--warning-color); }
        .ia-validation-badge--error { background: var(--error-soft); border: 2px solid var(--error-color); color: var(--error-color); }
        .ia-validation-section { margin-bottom: 16px; }
        .ia-validation-section h5 { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 0.95rem; }
        .ia-validation-item { padding: 10px 12px; border-radius: 6px; margin-bottom: 8px; font-size: 0.9rem; line-height: 1.4; display: flex; align-items: flex-start; gap: 8px; }
        .ia-validation-item i { flex-shrink: 0; margin-top: 2px; }
        .ia-validation-item--error { background: var(--error-soft); border-left: 4px solid var(--error-color); color: var(--error-color); }
        .ia-validation-item--warning { background: var(--warning-soft); border-left: 4px solid var(--warning-color); color: var(--text-primary); }
        .ia-validation-item--success { background: var(--success-soft); border-left: 4px solid var(--success-color); color: var(--success-color); }
        .ia-validation-item--info { background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; color: #60a5fa; }
        .ia-validation-info h5 { color: #60a5fa; }
        .ia-validation-details { margin-top: 12px; }
        .ia-validation-details summary { cursor: pointer; font-size: 0.85rem; color: var(--text-secondary); padding: 8px; border-radius: 4px; }
        .ia-validation-details summary:hover { background: var(--bg-secondary); }
        .ia-validation-details pre { background: var(--bg-primary); padding: 12px; border-radius: 6px; font-size: 0.8rem; overflow-x: auto; }
      </style>
      
      <div class="factura-tabs">
        <button type="button" class="tab-btn active" data-tab="basico">📄 Básico</button>
        <button type="button" class="tab-btn" data-tab="emisor">🏢 Emisor</button>
        <button type="button" class="tab-btn" data-tab="receptor">👤 Receptor</button>
        <button type="button" class="tab-btn" data-tab="detalles">📋 Detalles</button>
        <button type="button" class="tab-btn" data-tab="productos">📦 Productos</button>
        <button type="button" class="tab-btn" data-tab="totales">💰 Totales</button>
      </div>
      
      <form id="form-compra-ia" class="form-ia-editor">
        
        <!-- TAB: BÁSICO -->
        <div class="factura-tab-content active" data-tab-content="basico">
          ${esEsquemaNuevo ? '<div class="ia-info-badge"><i class="fas fa-check-circle"></i> <span>✅ Esquema mejorado de 57 campos detectado</span></div>' : ''}
          <div class="form-grid">
            <div class="form-group">
              <label for="ia-compra-numero">Número Factura</label>
              <input type="text" id="ia-compra-numero" class="form-control" value="${Utils.escapeHTML(data.numero_factura || '')}">
            </div>
            <div class="form-group">
              <label for="ia-compra-serie">Serie</label>
              <input type="text" id="ia-compra-serie" class="form-control" value="${Utils.escapeHTML(data.serie || '')}">
            </div>
            <div class="form-group">
              <label for="ia-compra-folio-fiscal">Folio Fiscal / UUID</label>
              <input type="text" id="ia-compra-folio-fiscal" class="form-control" value="${Utils.escapeHTML(data.folio_fiscal || '')}" placeholder="UUID de México">
            </div>
            <div class="form-group">
              <label for="ia-compra-fecha">Fecha Emisión</label>
              <input type="date" id="ia-compra-fecha" class="form-control" value="${fechaISO}">
            </div>
            <div class="form-group">
              <label for="ia-compra-fecha-venc">Fecha Vencimiento</label>
              <input type="date" id="ia-compra-fecha-venc" class="form-control" value="${Utils.escapeHTML(data.fecha_vencimiento || '')}">
            </div>
            <div class="form-group">
              <label for="ia-compra-hora">Hora</label>
              <input type="time" id="ia-compra-hora" class="form-control" value="${Utils.escapeHTML(horaValue || '')}">
            </div>
            <div class="form-group">
              <label for="ia-compra-moneda">Moneda</label>
              <input type="text" id="ia-compra-moneda" class="form-control" value="${Utils.escapeHTML(moneda)}" maxlength="8">
            </div>
            <div class="form-group">
              <label for="ia-compra-tipo-cambio">Tipo de Cambio</label>
              <input type="number" id="ia-compra-tipo-cambio" class="form-control" value="${data.tipo_cambio || 1}" step="0.0001" min="0">
            </div>
          </div>
          <div class="form-group full">
            <label for="ia-compra-notas">Notas / Observaciones</label>
            <textarea id="ia-compra-notas" class="form-control" rows="3" placeholder="Notas internas">${Utils.escapeHTML(data.notas || data.observaciones || '')}</textarea>
          </div>
        </div>
        
        <!-- TAB: EMISOR/VENDEDOR -->
        <div class="factura-tab-content" data-tab-content="emisor">
          <h5>🏢 Información del Emisor / Vendedor / Proveedor</h5>
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label for="ia-emisor-nombre">Nombre Comercial</label>
              <input type="text" id="ia-emisor-nombre" class="form-control" value="${Utils.escapeHTML(data.proveedor?.nombre || '')}">
            </div>
            <div class="form-group">
              <label for="ia-emisor-razon">Razón Social</label>
              <input type="text" id="ia-emisor-razon" class="form-control" value="${Utils.escapeHTML(data.proveedor?.razon_social || '')}">
            </div>
            <div class="form-group">
              <label for="ia-emisor-rfc">RFC / RUC / Tax ID</label>
              <input type="text" id="ia-emisor-rfc" class="form-control" value="${Utils.escapeHTML(data.proveedor?.rfc || data.proveedor?.ruc || '')}">
            </div>
            <div class="form-group">
              <label for="ia-emisor-telefono">Teléfono</label>
              <input type="text" id="ia-emisor-telefono" class="form-control" value="${Utils.escapeHTML(data.proveedor?.telefono || '')}">
            </div>
            <div class="form-group">
              <label for="ia-emisor-email">Email</label>
              <input type="email" id="ia-emisor-email" class="form-control" value="${Utils.escapeHTML(data.proveedor?.email || '')}">
            </div>
            <div class="form-group">
              <label for="ia-emisor-web">Sitio Web</label>
              <input type="url" id="ia-emisor-web" class="form-control" value="${Utils.escapeHTML(data.proveedor?.sitio_web || '')}">
            </div>
          </div>
          <div class="form-group full">
            <label for="ia-emisor-direccion">Dirección Completa</label>
            <textarea id="ia-emisor-direccion" class="form-control" rows="2">${Utils.escapeHTML(data.proveedor?.direccion || '')}</textarea>
          </div>
          <div class="form-grid form-grid-3">
            <div class="form-group">
              <label for="ia-emisor-ciudad">Ciudad</label>
              <input type="text" id="ia-emisor-ciudad" class="form-control" value="${Utils.escapeHTML(data.proveedor?.ciudad || '')}">
            </div>
            <div class="form-group">
              <label for="ia-emisor-estado">Estado / Provincia</label>
              <input type="text" id="ia-emisor-estado" class="form-control" value="${Utils.escapeHTML(data.proveedor?.estado || '')}">
            </div>
            <div class="form-group">
              <label for="ia-emisor-cp">Código Postal</label>
              <input type="text" id="ia-emisor-cp" class="form-control" value="${Utils.escapeHTML(data.proveedor?.codigo_postal || '')}">
            </div>
            <div class="form-group">
              <label for="ia-emisor-pais">País</label>
              <input type="text" id="ia-emisor-pais" class="form-control" value="${Utils.escapeHTML(data.proveedor?.pais || '')}">
            </div>
          </div>
        </div>
        
        <!-- TAB: RECEPTOR/COMPRADOR -->
        <div class="factura-tab-content" data-tab-content="receptor">
          <h5>👤 Información del Receptor / Comprador / Cliente</h5>
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label for="ia-receptor-nombre">Nombre Comercial</label>
              <input type="text" id="ia-receptor-nombre" class="form-control" value="${Utils.escapeHTML((data.comprador || data.cliente)?.nombre || '')}" placeholder="Nombre del cliente">
            </div>
            <div class="form-group">
              <label for="ia-receptor-razon">Razón Social</label>
              <input type="text" id="ia-receptor-razon" class="form-control" value="${Utils.escapeHTML((data.comprador || data.cliente)?.razon_social || '')}">
            </div>
            <div class="form-group">
              <label for="ia-receptor-rfc">RFC / RUC / Cédula</label>
              <input type="text" id="ia-receptor-rfc" class="form-control" value="${Utils.escapeHTML((data.comprador || data.cliente)?.rfc || (data.comprador || data.cliente)?.ruc || '')}" placeholder="RUC o cédula del cliente">
            </div>
            <div class="form-group">
              <label for="ia-receptor-telefono">Teléfono</label>
              <input type="text" id="ia-receptor-telefono" class="form-control" value="${Utils.escapeHTML((data.comprador || data.cliente)?.telefono || '')}">
            </div>
            <div class="form-group">
              <label for="ia-receptor-email">Email</label>
              <input type="email" id="ia-receptor-email" class="form-control" value="${Utils.escapeHTML((data.comprador || data.cliente)?.email || '')}">
            </div>
            <div class="form-group">
              <label for="ia-receptor-contacto">Persona de Contacto</label>
              <input type="text" id="ia-receptor-contacto" class="form-control" value="${Utils.escapeHTML((data.comprador || data.cliente)?.contacto || '')}">
            </div>
          </div>
          <div class="form-group full">
            <label for="ia-receptor-direccion">Dirección Completa</label>
            <textarea id="ia-receptor-direccion" class="form-control" rows="2">${Utils.escapeHTML((data.comprador || data.cliente)?.direccion || '')}</textarea>
          </div>
          <div class="form-grid form-grid-3">
            <div class="form-group">
              <label for="ia-receptor-ciudad">Ciudad</label>
              <input type="text" id="ia-receptor-ciudad" class="form-control" value="${Utils.escapeHTML((data.comprador || data.cliente)?.ciudad || '')}">
            </div>
            <div class="form-group">
              <label for="ia-receptor-estado">Estado / Provincia</label>
              <input type="text" id="ia-receptor-estado" class="form-control" value="${Utils.escapeHTML((data.comprador || data.cliente)?.estado || '')}">
            </div>
            <div class="form-group">
              <label for="ia-receptor-cp">Código Postal</label>
              <input type="text" id="ia-receptor-cp" class="form-control" value="${Utils.escapeHTML((data.comprador || data.cliente)?.codigo_postal || '')}">
            </div>
            <div class="form-group">
              <label for="ia-receptor-pais">País</label>
              <input type="text" id="ia-receptor-pais" class="form-control" value="${Utils.escapeHTML((data.comprador || data.cliente)?.pais || '')}">
            </div>
          </div>
        </div>
        
        <!-- TAB: DETALLES -->
        <div class="factura-tab-content" data-tab-content="detalles">
          <h5>📋 Detalles Fiscales y de Pago</h5>
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label for="ia-det-orden">Orden de Compra</label>
              <input type="text" id="ia-det-orden" class="form-control" value="${Utils.escapeHTML(data.orden_compra || '')}">
            </div>
            <div class="form-group">
              <label for="ia-det-condiciones">Condiciones de Pago</label>
              <input type="text" id="ia-det-condiciones" class="form-control" value="${Utils.escapeHTML(data.condiciones_pago || '')}">
            </div>
            <div class="form-group">
              <label for="ia-det-metodo">Método de Pago</label>
              <input type="text" id="ia-det-metodo" class="form-control" value="${Utils.escapeHTML(data.metodo_pago || '')}">
            </div>
            <div class="form-group">
              <label for="ia-det-forma">Forma de Pago</label>
              <input type="text" id="ia-det-forma" class="form-control" value="${Utils.escapeHTML(data.forma_pago || '')}">
            </div>
            <div class="form-group">
              <label for="ia-det-uso-cfdi">Uso CFDI (México)</label>
              <input type="text" id="ia-det-uso-cfdi" class="form-control" value="${Utils.escapeHTML(data.uso_cfdi || '')}" placeholder="G01, G02, G03...">
            </div>
            <div class="form-group">
              <label for="ia-det-lugar">Lugar de Expedición</label>
              <input type="text" id="ia-det-lugar" class="form-control" value="${Utils.escapeHTML(data.lugar_expedicion || '')}">
            </div>
          </div>
          ${metadataSection}
        </div>
        
        <!-- TAB: PRODUCTOS -->
        <div class="factura-tab-content" data-tab-content="productos">
          <h4>📦 Productos / Conceptos</h4>
          <div id="ia-items-warnings" class="ia-items-warnings"></div>
          <div class="table-wrapper">
            <table class="table ia-items-table-editable">
              <thead>
                <tr>
                  <th style="width: 220px;">Producto/Servicio</th>
                  <th>Descripción</th>
                  <th style="width: 150px;">Categoría</th>
                  <th style="width: 160px;">Proveedor</th>
                  <th style="width: 90px;">Unidad</th>
                  <th style="width: 100px;">Cantidad</th>
                  <th style="width: 115px;">Precio Unit.</th>
                  <th style="width: 115px;">Subtotal</th>
                  <th style="width: 50px;"></th>
                </tr>
              </thead>
              <tbody id="ia-items-body">${itemsRows}</tbody>
            </table>
          </div>
          <button type="button" class="btn btn-sm btn-outline" onclick="Compras.agregarFilaItemIA()">
            <i class="fas fa-plus"></i> Añadir Fila
          </button>
        </div>
        
        <!-- TAB: TOTALES -->
        <div class="factura-tab-content" data-tab-content="totales">
          <h4>💰 Resumen de Totales</h4>
          
          <!-- Reporte de Validación Matemática -->
          <div id="ia-validation-report" style="margin-bottom: 20px;"></div>
          
          <div class="ia-compra-totales">
            <div class="total-row">
              <span>Subtotal (ítems):</span>
              <span id="ia-compra-subtotal-display">$0.00</span>
            </div>
            <div class="total-row">
              <label for="ia-compra-descuento">Descuento Global</label>
              <input type="number" id="ia-compra-descuento" class="form-control" min="0" step="0.01" value="${Number(data.descuento || 0).toFixed(2)}">
            </div>
            <div class="total-row">
              <span>Subtotal con Descuento:</span>
              <span id="ia-compra-subtotal-desc-display">${Utils.formatCurrency(Number(data.subtotal_con_descuento || subtotalIA))}</span>
            </div>
            <div class="total-row">
              <label for="ia-compra-iva-rate">IVA (%)</label>
              <input type="number" id="ia-compra-iva-rate" class="form-control" min="0" step="0.01" value="${ivaRateValue.toFixed(2)}">
            </div>
            <div class="total-row">
              <label for="ia-compra-iva-monto">IVA Monto</label>
              <input type="number" id="ia-compra-iva-monto" class="form-control" min="0" step="0.01" value="${ivaMontoValue.toFixed(2)}">
            </div>
            <div class="total-row">
              <label for="ia-compra-isr-retenido">ISR Retenido</label>
              <input type="number" id="ia-compra-isr-retenido" class="form-control" min="0" step="0.01" value="${Number(data.isr_retenido || 0).toFixed(2)}">
            </div>
            <div class="total-row">
              <label for="ia-compra-iva-retenido">IVA Retenido</label>
              <input type="number" id="ia-compra-iva-retenido" class="form-control" min="0" step="0.01" value="${Number(data.iva_retenido || 0).toFixed(2)}">
            </div>
            <div class="total-row">
              <label for="ia-compra-otros">Otros Impuestos</label>
              <input type="number" id="ia-compra-otros" class="form-control" step="0.01" value="${otrosMontoValue.toFixed(2)}">
            </div>
            <div class="total-row total-final">
              <strong>Total a Pagar:</strong>
              <strong id="ia-compra-total-display">$0.00</strong>
            </div>
            <div class="total-row">
              <span>Total detectado por IA:</span>
              <span id="ia-compra-total-ia-display" data-total="${totalDetectado.toFixed(2)}">${Utils.formatCurrency(totalDetectado)}</span>
            </div>
            <div class="total-row">
              <span>Diferencia:</span>
              <span id="ia-compra-total-diff-display">$0.00</span>
            </div>
            <div class="form-group full" style="margin-top: 16px;">
              <label for="ia-compra-total-letra">Total en Letra</label>
              <input type="text" id="ia-compra-total-letra" class="form-control" value="${Utils.escapeHTML(data.total_letra || '')}" placeholder="Ej: Mil pesos 00/100 M.N.">
            </div>
          </div>
          
          <details class="ia-raw-details" style="margin-top: 20px;">
            <summary>🔍 Ver datos crudos de IA</summary>
            <pre>${Utils.escapeHTML(rawText || JSON.stringify(data, null, 2))}</pre>
            ${structuredBlock}
          </details>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn btn-light" data-action="cancel-compra-ia">Cancelar</button>
      <div style="flex:1"></div>
      <button class="btn btn-primary" data-action="save-compra-ia">
        <i class="fas fa-save"></i> Crear Registro de Compra
      </button>
    `;

    const modal = Utils.createModal(
      modalId,
      '<i class="fas fa-robot"></i> Factura Procesada con IA - Revise y Edite',
      body,
      footer,
      'extra-wide'
    );

    // Agregar funcionalidad de pestañas
    const tabButtons = modal.querySelectorAll('.tab-btn');
    const tabContents = modal.querySelectorAll('.factura-tab-content');

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;

        // Desactivar todas las pestañas
        tabButtons.forEach((b) => b.classList.remove('active'));
        tabContents.forEach((c) => c.classList.remove('active'));

        // Activar la pestaña seleccionada
        btn.classList.add('active');
        const targetContent = modal.querySelector(`[data-tab-content="${targetTab}"]`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });

    // Agregar event listeners
    const cancelBtn = modal.querySelector('[data-action="cancel-compra-ia"]');
    const saveBtn = modal.querySelector('[data-action="save-compra-ia"]');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => Utils.closeModal(modalId));
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.guardarCompraDesdeIA());
    }

    if (this.handleSuggestionsOutsideClick && modal) {
      modal.removeEventListener('click', this.handleSuggestionsOutsideClick);
    }
    this.handleSuggestionsOutsideClick = (event) => {
      if (!event.target.closest('.ia-producto-cell')) {
        this.ocultarTodasSugerencias();
      }
    };
    if (modal) {
      modal.addEventListener('click', this.handleSuggestionsOutsideClick);
    }
    this.enlazarEventosFacturaIA(modal, Number.isFinite(data.ivaRate));
    this.recalcularTotalCompraIA();

    // Guardar automáticamente como factura pendiente
    this.guardarFacturaPendienteAutomatico(data, pdfData);
  },

  /**
   * Guarda automáticamente la factura como pendiente cuando se abre el modal de revisión
   */
  async guardarFacturaPendienteAutomatico(data, pdfData) {
    // No guardar si estamos revisando una factura pendiente existente
    if (this.facturaPendienteActualId) {
      return;
    }

    const proveedor = data.proveedor || {};
    const facturaData = {
      numero_factura: data.numero_factura || data.numero || '',
      fecha: data.fecha || new Date().toISOString().split('T')[0],
      hora: data.hora || null,
      proveedor_nombre: proveedor.nombre || '',
      proveedor_ruc: proveedor.ruc || proveedor.identificacion || '',
      proveedor_id: proveedor.id || null,
      subtotal: data.subtotal || 0,
      iva: data.iva || 0,
      total: data.total || 0,
      items: data.items || [],
      pdf_base64: pdfData?.base64 || null,
      pdf_nombre: pdfData?.nombre || null,
      pdf_size: pdfData?.size || null,
      metadata: data.metadata || null,
    };

    const result = await this.guardarFacturaPendiente(facturaData);
    if (result && result.id) {
      this.facturaPendienteActualId = result.id;
      console.log('📋 Factura guardada como pendiente:', result.id);
    }
  },

  crearFilaItemEditable(item = {}, index = -1) {
    const itemIndex = index === -1 ? document.querySelectorAll('#ia-items-body tr').length : index;
    const cantidadValor = Number(item.cantidad);
    const cantidad = this.normalizarCantidadIA(cantidadValor, 1);
    const precioUnitario = Number(item.precioUnitario || item.precio_unitario || 0);
    const subtotal = Number(item.subtotal || item.total || cantidad * precioUnitario || 0);
    const productoId = item.productoId || item.producto_id || '';
    const productoCodigo = item.productoCodigo || item.codigo || '';
    const categoriaInfo = this.resolveCategoriaCatalog(item);
    const proveedorInfo = this.resolveProveedorCatalog(item);
    const asignadoLabel = productoId
      ? [
          productoCodigo,
          item.productoCatalogoNombre ||
            item.catalogoNombre ||
            item.catalogName ||
            item.nombre ||
            '',
        ]
          .filter(Boolean)
          .join(' · ')
      : '';
    return `
      <tr data-index="${itemIndex}" data-product-id="${Utils.escapeHTML(productoId || '')}" data-categoria-id="${Utils.escapeHTML(categoriaInfo.id || '')}" data-categoria-nombre="${Utils.escapeHTML(categoriaInfo.nombre || '')}" data-proveedor-id="${Utils.escapeHTML(proveedorInfo.id || '')}" data-proveedor-nombre="${Utils.escapeHTML(proveedorInfo.nombre || '')}" data-proveedor-documento="${Utils.escapeHTML(proveedorInfo.documento || '')}" data-codigo="${Utils.escapeHTML(productoCodigo || '')}">
        <td>
          <div class="ia-producto-cell" data-producto-id="${Utils.escapeHTML(productoId || '')}" data-producto-codigo="${Utils.escapeHTML(productoCodigo || '')}">
            <div class="ia-producto-input-group">
              <input type="text" class="form-control ia-producto-nombre" name="nombre" placeholder="Nombre del producto" value="${Utils.escapeHTML(item.nombre || '')}" data-producto-id="${Utils.escapeHTML(productoId || '')}">
              <button type="button" class="btn btn-sm btn-light ia-producto-buscar" title="Buscar en catálogo"><i class="fas fa-search"></i></button>
            </div>
            <small class="ia-producto-asignado${productoId ? ' visible' : ''}">
              <span>${Utils.escapeHTML(asignadoLabel)}</span>
              <button type="button" class="ia-producto-quitar" title="Quitar vinculación">&times;</button>
            </small>
            <div class="ia-producto-sugerencias" hidden></div>
          </div>
        </td>
        <td><input type="text" class="form-control" name="descripcion" placeholder="Descripción / modelo" value="${Utils.escapeHTML(item.descripcion || '')}"></td>
        <td>
          <select class="form-control ia-categoria-select" name="categoriaId">
            ${this.buildCategoriaOptionsHtml(categoriaInfo.id, categoriaInfo.nombre)}
          </select>
        </td>
        <td>
          <select class="form-control ia-proveedor-select" name="proveedorId">
            ${this.buildProveedorOptionsHtml(proveedorInfo.id, proveedorInfo.nombre, proveedorInfo.documento)}
          </select>
        </td>
        <td><input type="text" class="form-control" name="unidad" placeholder="Unidad" value="${Utils.escapeHTML(item.unidad || '')}"></td>
        <td><input type="number" class="form-control" name="cantidad" placeholder="1" value="${cantidad}" step="1" min="0"></td>
        <td><input type="number" class="form-control" name="precioUnitario" placeholder="0.00" value="${precioUnitario || 0}" step="any" min="0"></td>
        <td><input type="text" class="form-control" name="subtotal" readonly data-raw="${subtotal.toFixed(2)}" value="${Utils.formatCurrency(subtotal)}"></td>
        <td>
          <button type="button" class="btn btn-sm btn-danger" data-action="delete-item-ia">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  },

  registrarEventosFila(row) {
    if (!row) return;
    const cantidadInput = row.querySelector('input[name="cantidad"]');
    const precioInput = row.querySelector('input[name="precioUnitario"]');
    const nombreInput = row.querySelector('input[name="nombre"]');
    const productoWrapper = row.querySelector('.ia-producto-cell');
    const deleteBtn = row.querySelector('[data-action="delete-item-ia"]');
    const categoriaSelect = row.querySelector('select[name="categoriaId"]');
    const proveedorSelect = row.querySelector('select[name="proveedorId"]');

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        row.remove();
        this.recalcularTotalCompraIA();
      });
    }

    if (categoriaSelect) {
      categoriaSelect.addEventListener('change', () => {
        const value = (categoriaSelect.value || '').trim();
        const label = categoriaSelect.options[categoriaSelect.selectedIndex]?.text?.trim() || '';
        row.dataset.categoriaId = value;
        row.dataset.categoriaNombre = label;
      });
    }

    if (proveedorSelect) {
      proveedorSelect.addEventListener('change', () => {
        const value = (proveedorSelect.value || '').trim();
        const label = proveedorSelect.options[proveedorSelect.selectedIndex]?.text?.trim() || '';
        const docAttr =
          proveedorSelect.options[proveedorSelect.selectedIndex]?.dataset?.documento || '';
        row.dataset.proveedorId = value;
        row.dataset.proveedorNombre = label;
        row.dataset.proveedorDocumento = this.normalizeDocumento(docAttr || '');
      });
    }

    [cantidadInput, precioInput].forEach((input) => {
      if (!input) return;
      input.addEventListener('input', () => this.recalcularTotalCompraIA());
    });

    if (nombreInput) {
      const debouncedSugerencias = Utils.debounce(
        (valor) => this.sugerirProductosParaFila(row, valor),
        280
      );

      nombreInput.addEventListener('input', (event) => {
        this.limpiarAsignacionProducto(row);
        debouncedSugerencias(event.target.value);
        this.actualizarAnalisisItems();
      });

      nombreInput.addEventListener('focus', () => {
        const valor = nombreInput.value.trim();
        if (valor.length >= 2) {
          this.sugerirProductosParaFila(row, valor);
        }
      });

      nombreInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          this.ocultarSugerenciasFila(row);
        }
      });

      nombreInput.addEventListener('blur', (event) => {
        const siguiente = event.relatedTarget;
        if (
          productoWrapper &&
          siguiente instanceof Element &&
          siguiente.closest('.ia-producto-cell') === productoWrapper
        ) {
          return;
        }
        setTimeout(() => {
          this.ocultarSugerenciasFila(row);
        }, 120);
      });
    }

    if (productoWrapper) {
      const sugerencias = productoWrapper.querySelector('.ia-producto-sugerencias');
      if (sugerencias) {
        sugerencias.addEventListener('click', (event) => event.stopPropagation());
      }

      const buscarBtn = productoWrapper.querySelector('.ia-producto-buscar');
      if (buscarBtn) {
        buscarBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          const valor = nombreInput ? nombreInput.value.trim() : '';
          this.sugerirProductosParaFila(row, valor || '', true);
        });
      }

      const quitarBtn = productoWrapper.querySelector('.ia-producto-quitar');
      if (quitarBtn) {
        quitarBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.asignarProductoAFila(row, null);
        });
      }
    }
  },

  normalizarCantidadIA(valor, fallback = 0) {
    // Coerce IA outputs to whole numbers; promote small positive fractions to 1 unit.
    if (!Number.isFinite(valor)) return fallback;
    let cantidad = Math.max(0, Math.trunc(valor));
    if (cantidad === 0 && valor > 0) {
      cantidad = 1;
    }
    return cantidad;
  },

  actualizarAnalisisItems() {
    const warningContainer = document.getElementById('ia-items-warnings');
    if (!warningContainer) return;

    const rows = Array.from(document.querySelectorAll('#ia-items-body tr'));
    const grupos = new Map();

    rows.forEach((row) => {
      row.classList.remove('ia-row-duplicate');
      const nombreInput = row.querySelector('input[name="nombre"]');
      const nombre = nombreInput ? nombreInput.value.trim() : '';
      if (!nombre) return;
      const slug = nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!slug) return;
      if (!grupos.has(slug)) grupos.set(slug, []);
      grupos.get(slug).push({ row, nombre });
    });

    const duplicados = [];
    grupos.forEach((entries) => {
      if (entries.length > 1) {
        duplicados.push(entries[0].nombre);
        entries.forEach(({ row }) => row.classList.add('ia-row-duplicate'));
      }
    });

    if (duplicados.length) {
      const lista = duplicados.map((nombre) => Utils.escapeHTML(nombre)).join(', ');
      warningContainer.innerHTML = `<p class="text-warning"><i class="fas fa-exclamation-triangle"></i> Ítems similares detectados: ${lista}. Revisa si necesitas consolidarlos.</p>`;
    } else {
      warningContainer.innerHTML = '';
    }
  },

  agregarFilaItemIA() {
    const tbody = document.getElementById('ia-items-body');
    if (!tbody) return;
    const newRowHTML = this.crearFilaItemEditable();
    tbody.insertAdjacentHTML('beforeend', newRowHTML);

    const newRow = tbody.lastElementChild;
    this.registrarEventosFila(newRow);
    this.recalcularTotalCompraIA();
  },

  enlazarEventosFacturaIA(modal, ivaRateConfiable) {
    if (!modal) return;
    const ivaRateInput = modal.querySelector('#ia-compra-iva-rate');
    const ivaMontoInput = modal.querySelector('#ia-compra-iva-monto');
    const otrosInput = modal.querySelector('#ia-compra-otros');
    const descuentoInput = modal.querySelector('#ia-compra-descuento');
    const isrRetenidoInput = modal.querySelector('#ia-compra-isr-retenido');
    const ivaRetenidoInput = modal.querySelector('#ia-compra-iva-retenido');

    if (ivaMontoInput && !ivaRateConfiable) {
      ivaMontoInput.dataset.manual = 'true';
    }

    if (ivaRateInput) {
      ivaRateInput.addEventListener('input', () => {
        if (ivaMontoInput) {
          ivaMontoInput.dataset.manual = '';
        }
        this.recalcularTotalCompraIA();
      });
    }

    if (ivaMontoInput) {
      ivaMontoInput.addEventListener('input', () => {
        ivaMontoInput.dataset.manual = 'true';
        this.recalcularTotalCompraIA();
      });
    }

    if (otrosInput) {
      otrosInput.addEventListener('input', () => this.recalcularTotalCompraIA());
    }

    // Agregar listeners para los nuevos campos
    if (descuentoInput) {
      descuentoInput.addEventListener('input', () => this.recalcularTotalCompraIA());
    }

    if (isrRetenidoInput) {
      isrRetenidoInput.addEventListener('input', () => this.recalcularTotalCompraIA());
    }

    if (ivaRetenidoInput) {
      ivaRetenidoInput.addEventListener('input', () => this.recalcularTotalCompraIA());
    }

    modal.querySelectorAll('#ia-items-body tr').forEach((row) => this.registrarEventosFila(row));
  },

  /**
   * Valida la coherencia matemática de la factura (como Python validate_invoice_data)
   */
  validateInvoiceDataIA() {
    const results = {
      is_valid: true,
      errors: [],
      warnings: [],
      details: {},
      confidence: 100,
    };

    try {
      // Helper para convertir valores a float
      const getFloat = (val) => {
        if (typeof val === 'number' && Number.isFinite(val)) return val;
        if (typeof val === 'string' && val.trim()) {
          return parseFloat(val.replace(/,/g, '').replace(/\$/g, ''));
        }
        return 0.0;
      };

      // 1. Validar Suma de Productos vs Subtotal
      const rows = document.querySelectorAll('#ia-items-body tr');
      let calcSubtotalProd = 0.0;
      const productos = [];

      rows.forEach((row) => {
        const cantidad = getFloat(row.querySelector('input[name="cantidad"]')?.value);
        const precio = getFloat(row.querySelector('input[name="precioUnitario"]')?.value);
        const subtotal = getFloat(row.querySelector('input[name="subtotal"]')?.dataset.raw);

        productos.push({ cantidad, precio, subtotal });

        if (subtotal > 0) {
          calcSubtotalProd += subtotal;
        } else {
          calcSubtotalProd += cantidad * precio;
        }
      });

      const extractedSubtotal = getFloat(
        document.getElementById('ia-compra-subtotal-display')?.textContent
      );
      const diffSubtotal = Math.abs(calcSubtotalProd - extractedSubtotal);

      if (diffSubtotal > 1.0) {
        results.warnings.push(
          `⚠️ Discrepancia en Subtotal: Suma de productos ($${calcSubtotalProd.toFixed(2)}) vs Subtotal calculado ($${extractedSubtotal.toFixed(2)})`
        );
        results.confidence -= 10;
      }

      // 2. Validar Operación Aritmética Final
      // Total = Subtotal - Descuentos + Impuestos - Retenciones
      const extractedTotal = getFloat(
        document.getElementById('ia-compra-total-display')?.textContent
      );
      const extractedIva = getFloat(document.getElementById('ia-compra-iva-monto')?.value);
      const extractedDescuento = getFloat(document.getElementById('ia-compra-descuento')?.value);
      const extractedOtros = getFloat(document.getElementById('ia-compra-otros')?.value);

      // Retenciones
      const retIva = getFloat(document.getElementById('ia-compra-iva-retenido')?.value);
      const retIsr = getFloat(document.getElementById('ia-compra-isr-retenido')?.value);
      const totalRetenciones = retIva + retIsr;

      // Calcular total esperado
      const calcTotal =
        extractedSubtotal - extractedDescuento + extractedIva + extractedOtros - totalRetenciones;
      const diffTotal = Math.abs(calcTotal - extractedTotal);

      results.details = {
        calc_subtotal_productos: calcSubtotalProd,
        extracted_subtotal: extractedSubtotal,
        calc_total: calcTotal,
        extracted_total: extractedTotal,
        diferencia_subtotal: diffSubtotal,
        diferencia_total: diffTotal,
      };

      if (diffTotal > 1.0) {
        results.errors.push(
          `❌ Error Matemático: (Subtotal - Desc + Impuestos - Ret) = $${calcTotal.toFixed(2)}, pero el total calculado es $${extractedTotal.toFixed(2)}`
        );
        results.is_valid = false;
        results.confidence -= 30;
      }

      // 3. Validar cada producto individualmente
      productos.forEach((p, idx) => {
        const expectedSubtotal = p.cantidad * p.precio;
        const diff = Math.abs(p.subtotal - expectedSubtotal);
        if (diff > 0.01) {
          results.warnings.push(
            `⚠️ Producto ${idx + 1}: Cantidad × Precio (${expectedSubtotal.toFixed(2)}) ≠ Subtotal (${p.subtotal.toFixed(2)})`
          );
          results.confidence -= 5;
        }
      });

      results.confidence = Math.max(0, Math.min(100, results.confidence));
    } catch (error) {
      results.warnings.push(`No se pudo validar matemáticamente: ${error.message}`);
      results.confidence = 50;
    }

    return results;
  },

  /**
   * Muestra el reporte de validación en el modal
   */
  mostrarReporteValidacionIA(validation) {
    const container = document.getElementById('ia-validation-report');
    if (!container) return;

    let html = '<div class="ia-validation-report">';

    // Badge de confianza con más niveles
    let badgeClass = 'success';
    let badgeIcon = 'check-circle';
    const score = validation.score || validation.confidence || 0;

    if (score >= 95) {
      badgeClass = 'excellent';
      badgeIcon = 'star';
    } else if (score >= 85) {
      badgeClass = 'success';
      badgeIcon = 'check-circle';
    } else if (score >= 70) {
      badgeClass = 'warning';
      badgeIcon = 'exclamation-triangle';
    } else {
      badgeClass = 'error';
      badgeIcon = 'times-circle';
    }

    const confidenceLabel = validation.confidence_label || `${score}%`;
    html += `<div class="ia-validation-badge ia-validation-badge--${badgeClass}">
      <i class="fas fa-${badgeIcon}"></i>
      <span>Confianza: ${confidenceLabel} (${score}%)</span>
    </div>`;

    // Errores críticos
    if (validation.errors && validation.errors.length > 0) {
      html += '<div class="ia-validation-section ia-validation-errors">';
      html += '<h5><i class="fas fa-times-circle"></i> Errores Críticos</h5>';
      validation.errors.forEach((err) => {
        html += `<div class="ia-validation-item ia-validation-item--error"><i class="fas fa-times"></i> ${Utils.escapeHTML(err)}</div>`;
      });
      html += '</div>';
    }

    // Advertencias
    if (validation.warnings && validation.warnings.length > 0) {
      html += '<div class="ia-validation-section ia-validation-warnings">';
      html += '<h5><i class="fas fa-exclamation-triangle"></i> Advertencias</h5>';
      validation.warnings.forEach((warn) => {
        html += `<div class="ia-validation-item ia-validation-item--warning"><i class="fas fa-exclamation-triangle"></i> ${Utils.escapeHTML(warn)}</div>`;
      });
      html += '</div>';
    }

    // Información (diferencias menores a 5 centavos)
    if (validation.info && validation.info.length > 0) {
      html += '<div class="ia-validation-section ia-validation-info">';
      html += '<h5><i class="fas fa-info-circle"></i> Información (diferencias menores)</h5>';
      validation.info.forEach((info) => {
        html += `<div class="ia-validation-item ia-validation-item--info"><i class="fas fa-info-circle"></i> ${Utils.escapeHTML(info)}</div>`;
      });
      html += '</div>';
    }

    // Mensaje de éxito
    const hasErrors = validation.errors && validation.errors.length > 0;
    const hasWarnings = validation.warnings && validation.warnings.length > 0;
    if (!hasErrors && !hasWarnings) {
      html += '<div class="ia-validation-section ia-validation-success">';
      html += '<div class="ia-validation-item ia-validation-item--success">';
      html += '<i class="fas fa-check-circle"></i> ✅ Todos los cálculos coinciden correctamente';
      if (validation.info && validation.info.length > 0) {
        html += ` (con ${validation.info.length} diferencia(s) menores a 5 centavos)`;
      }
      html += '</div></div>';
    }

    // Detalles de cálculo
    if (validation.details && Object.keys(validation.details).length > 0) {
      html += '<details class="ia-validation-details"><summary>Ver detalles de cálculo</summary>';
      html += '<pre>' + JSON.stringify(validation.details, null, 2) + '</pre>';
      html += '</details>';
    }

    html += '</div>';
    container.innerHTML = html;
  },

  recalcularTotalCompraIA() {
    const rows = document.querySelectorAll('#ia-items-body tr');
    let subtotalGeneral = 0;

    rows.forEach((row) => {
      const cantidadInput = row.querySelector('input[name="cantidad"]');
      const cantidadRaw = cantidadInput ? cantidadInput.value.trim() : '';
      const cantidadValor = cantidadRaw === '' ? NaN : parseFloat(cantidadRaw);
      const cantidad = this.normalizarCantidadIA(cantidadValor, 0);
      if (cantidadInput && cantidadRaw !== '' && Number.isFinite(cantidadValor)) {
        const integerTexto = String(cantidad);
        if (cantidadInput.value !== integerTexto) {
          cantidadInput.value = integerTexto;
        }
      }
      const precio = parseFloat(row.querySelector('input[name="precioUnitario"]').value) || 0;
      const subtotal = Number((cantidad * precio).toFixed(2));
      subtotalGeneral += subtotal;

      const subtotalInput = row.querySelector('input[name="subtotal"]');
      if (subtotalInput) {
        subtotalInput.value = Utils.formatCurrency(subtotal);
        subtotalInput.dataset.raw = subtotal.toFixed(2);
      }
    });

    subtotalGeneral = Number(subtotalGeneral.toFixed(2));

    const ivaRateInput = document.getElementById('ia-compra-iva-rate');
    const ivaMontoInput = document.getElementById('ia-compra-iva-monto');
    const otrosInput = document.getElementById('ia-compra-otros');
    const descuentoInput = document.getElementById('ia-compra-descuento');
    const isrRetenidoInput = document.getElementById('ia-compra-isr-retenido');
    const ivaRetenidoInput = document.getElementById('ia-compra-iva-retenido');

    const ivaRate = ivaRateInput ? parseFloat(ivaRateInput.value) : 0;
    const ivaCalculado = Number.isFinite(ivaRate) ? subtotalGeneral * (ivaRate / 100) : 0;

    let ivaMonto = ivaMontoInput ? parseFloat(ivaMontoInput.value) : 0;
    if (ivaMontoInput && ivaMontoInput.dataset.manual === 'true') {
      if (!Number.isFinite(ivaMonto)) {
        ivaMonto = ivaCalculado;
      }
    } else {
      ivaMonto = ivaCalculado;
      if (ivaMontoInput) {
        ivaMontoInput.value = ivaMonto.toFixed(2);
      }
    }

    const otrosMonto = otrosInput ? parseFloat(otrosInput.value) || 0 : 0;
    const descuento = descuentoInput ? parseFloat(descuentoInput.value) || 0 : 0;
    const isrRetenido = isrRetenidoInput ? parseFloat(isrRetenidoInput.value) || 0 : 0;
    const ivaRetenido = ivaRetenidoInput ? parseFloat(ivaRetenidoInput.value) || 0 : 0;

    // Total = Subtotal - Descuento + IVA + Otros - Retenciones
    const total = subtotalGeneral - descuento + ivaMonto + otrosMonto - isrRetenido - ivaRetenido;

    const subtotalDisplay = document.getElementById('ia-compra-subtotal-display');
    const subtotalDescDisplay = document.getElementById('ia-compra-subtotal-desc-display');
    const totalDisplay = document.getElementById('ia-compra-total-display');

    if (subtotalDisplay) subtotalDisplay.textContent = Utils.formatCurrency(subtotalGeneral);
    if (subtotalDescDisplay)
      subtotalDescDisplay.textContent = Utils.formatCurrency(subtotalGeneral - descuento);
    if (totalDisplay) totalDisplay.textContent = Utils.formatCurrency(total);

    const iaTotalSpan = document.getElementById('ia-compra-total-ia-display');
    const diffSpan = document.getElementById('ia-compra-total-diff-display');
    if (iaTotalSpan && diffSpan) {
      const iaTotal = parseFloat(iaTotalSpan.dataset.total) || 0;
      const diff = total - iaTotal;
      diffSpan.textContent = Utils.formatCurrency(diff);
      diffSpan.classList.remove('text-success', 'text-warning', 'text-danger');
      if (Math.abs(diff) <= 0.05) {
        diffSpan.classList.add('text-success');
      } else if (diff > 0) {
        diffSpan.classList.add('text-warning');
      } else {
        diffSpan.classList.add('text-danger');
      }
    }

    this.facturaIAReciente = this.facturaIAReciente || {};
    this.facturaIAReciente.reviewTotals = {
      subtotal: subtotalGeneral,
      iva: ivaMonto,
      otrosImpuestos: otrosMonto,
      descuento,
      isrRetenido,
      ivaRetenido,
      total,
    };

    // Ejecutar validación matemática automática
    const validation = this.validateInvoiceDataIA();
    this.mostrarReporteValidacionIA(validation);

    this.actualizarAnalisisItems();
  },

  async guardarCompraDesdeIA() {
    await this.ensureIaCatalogData();

    // CAMPOS BÁSICOS
    const proveedorNombre =
      document.getElementById('ia-compra-proveedor')?.value.trim() ||
      document.getElementById('ia-emisor-nombre')?.value.trim() ||
      '';
    const numero = document.getElementById('ia-compra-numero')?.value.trim() || '';
    const fecha = document.getElementById('ia-compra-fecha')?.value || '';
    const moneda =
      (document.getElementById('ia-compra-moneda')?.value || '').trim().toUpperCase() || 'USD';
    const notas = document.getElementById('ia-compra-notas')?.value.trim() || '';
    const proveedorRuc =
      document.getElementById('ia-compra-proveedor-ruc')?.value.trim() ||
      document.getElementById('ia-emisor-rfc')?.value.trim() ||
      '';
    const horaFactura = document.getElementById('ia-compra-hora')?.value.trim() || '';

    // NUEVOS CAMPOS DEL ESQUEMA DE 57 CAMPOS
    const serie = document.getElementById('ia-compra-serie')?.value.trim() || '';
    const folioFiscal = document.getElementById('ia-compra-folio-fiscal')?.value.trim() || '';
    const fechaVencimiento = document.getElementById('ia-compra-fecha-venc')?.value || '';
    const tipoCambio = parseFloat(document.getElementById('ia-compra-tipo-cambio')?.value) || 1;

    // Datos completos del emisor/vendedor/proveedor
    const emisorData = {
      nombre: document.getElementById('ia-emisor-nombre')?.value.trim() || proveedorNombre,
      razon_social: document.getElementById('ia-emisor-razon')?.value.trim() || '',
      rfc: document.getElementById('ia-emisor-rfc')?.value.trim() || proveedorRuc,
      telefono: document.getElementById('ia-emisor-telefono')?.value.trim() || '',
      email: document.getElementById('ia-emisor-email')?.value.trim() || '',
      sitio_web: document.getElementById('ia-emisor-web')?.value.trim() || '',
      direccion: document.getElementById('ia-emisor-direccion')?.value.trim() || '',
      ciudad: document.getElementById('ia-emisor-ciudad')?.value.trim() || '',
      estado: document.getElementById('ia-emisor-estado')?.value.trim() || '',
      codigo_postal: document.getElementById('ia-emisor-cp')?.value.trim() || '',
      pais: document.getElementById('ia-emisor-pais')?.value.trim() || '',
    };

    // Datos completos del receptor/comprador/cliente
    const receptorData = {
      nombre: document.getElementById('ia-receptor-nombre')?.value.trim() || '',
      razon_social: document.getElementById('ia-receptor-razon')?.value.trim() || '',
      rfc: document.getElementById('ia-receptor-rfc')?.value.trim() || '',
      telefono: document.getElementById('ia-receptor-telefono')?.value.trim() || '',
      email: document.getElementById('ia-receptor-email')?.value.trim() || '',
      contacto: document.getElementById('ia-receptor-contacto')?.value.trim() || '',
      direccion: document.getElementById('ia-receptor-direccion')?.value.trim() || '',
      ciudad: document.getElementById('ia-receptor-ciudad')?.value.trim() || '',
      estado: document.getElementById('ia-receptor-estado')?.value.trim() || '',
      codigo_postal: document.getElementById('ia-receptor-cp')?.value.trim() || '',
      pais: document.getElementById('ia-receptor-pais')?.value.trim() || '',
    };

    // Detalles fiscales y de pago
    const detallesData = {
      orden_compra: document.getElementById('ia-det-orden')?.value.trim() || '',
      condiciones_pago: document.getElementById('ia-det-condiciones')?.value.trim() || '',
      metodo_pago: document.getElementById('ia-det-metodo')?.value.trim() || '',
      forma_pago: document.getElementById('ia-det-forma')?.value.trim() || '',
      uso_cfdi: document.getElementById('ia-det-uso-cfdi')?.value.trim() || '',
      lugar_expedicion: document.getElementById('ia-det-lugar')?.value.trim() || '',
    };

    // Totales con retenciones
    const descuentoGlobal = parseFloat(document.getElementById('ia-compra-descuento')?.value) || 0;
    const isrRetenido = parseFloat(document.getElementById('ia-compra-isr-retenido')?.value) || 0;
    const ivaRetenido = parseFloat(document.getElementById('ia-compra-iva-retenido')?.value) || 0;
    const totalLetra = document.getElementById('ia-compra-total-letra')?.value.trim() || '';

    if (!proveedorNombre || !numero || !fecha) {
      Utils.showToast('El proveedor, número de factura y fecha son obligatorios.', 'warning');
      return;
    }

    // Validación y recolección de items con verificación mejorada
    const items = [];
    const erroresValidacion = [];
    document.querySelectorAll('#ia-items-body tr').forEach((row, index) => {
      const nombreInput = row.querySelector('input[name="nombre"]');
      const nombre = nombreInput ? nombreInput.value.trim() : '';
      const descripcion = row.querySelector('input[name="descripcion"]').value.trim();
      const unidadInput = row.querySelector('input[name="unidad"]');
      const unidad = unidadInput ? unidadInput.value.trim() : 'UND';
      const cantidadInput = row.querySelector('input[name="cantidad"]');
      const cantidadValor = parseFloat(cantidadInput.value);
      const precioInput = row.querySelector('input[name="precioUnitario"]');
      const precioUnitario = parseFloat(precioInput.value) || 0;
      const categoriaSelect = row.querySelector('select[name="categoriaId"]');
      const proveedorSelect = row.querySelector('select[name="proveedorId"]');

      // Validaciones detalladas
      if (!nombre) {
        erroresValidacion.push(`Producto ${index + 1}: Falta el nombre`);
        return;
      }

      if (isNaN(cantidadValor) || cantidadValor <= 0) {
        erroresValidacion.push(`${nombre}: Cantidad inválida (${cantidadInput.value})`);
        return;
      }

      if (isNaN(precioUnitario) || precioUnitario < 0) {
        erroresValidacion.push(`${nombre}: Precio inválido (${precioInput.value})`);
        return;
      }

      // Normalizar cantidad (convertir a entero si es muy cercano)
      let cantidad = cantidadValor;
      const difDecimal = Math.abs(cantidadValor - Math.round(cantidadValor));
      if (difDecimal < 0.01) {
        cantidad = Math.round(cantidadValor);
      }

      // Validar unidad
      if (!unidad || unidad.length > 10) {
        erroresValidacion.push(`${nombre}: Unidad inválida o muy larga`);
        return;
      }

      const productoWrapper = row.querySelector('.ia-producto-cell');
      const productoIdRaw =
        (productoWrapper && productoWrapper.dataset && productoWrapper.dataset.productoId) ||
        (nombreInput && nombreInput.dataset && nombreInput.dataset.productoId) ||
        (row.dataset ? row.dataset.productId : '');
      const productoId = (productoIdRaw || '').trim();

      const subtotal = Number((cantidad * precioUnitario).toFixed(2));

      // Verificar que el cálculo sea coherente
      const subtotalEsperado = cantidad * precioUnitario;
      if (Math.abs(subtotal - subtotalEsperado) > 0.01) {
        console.warn(`${nombre}: Ajuste de subtotal ${subtotalEsperado} → ${subtotal}`);
      }

      const itemData = {
        productoNombre: nombre,
        descripcion: descripcion || '',
        unidad: unidad.toUpperCase(),
        cantidad: Number(cantidad.toFixed(4)),
        precioUnitario: Number(precioUnitario.toFixed(4)),
        subtotal,
      };

      if (productoId) {
        itemData.productoId = productoId;
      }

      const categoriaId = (categoriaSelect?.value || '').trim();
      const categoriaNombre = categoriaSelect
        ? categoriaSelect.options[categoriaSelect.selectedIndex]?.text?.trim()
        : row.dataset.categoriaNombre || '';
      if (categoriaId) {
        itemData.categoriaId = categoriaId;
      }
      if (categoriaNombre) {
        itemData.categoriaNombre = categoriaNombre;
      }

      const proveedorIdLinea =
        (proveedorSelect?.value || '').trim() || (row.dataset.proveedorId || '').trim();
      const proveedorNombreLinea = proveedorSelect
        ? proveedorSelect.options[proveedorSelect.selectedIndex]?.text?.trim()
        : row.dataset.proveedorNombre || '';
      const proveedorDocumentoLinea = this.normalizeDocumento(row.dataset.proveedorDocumento || '');

      if (proveedorIdLinea) {
        itemData.proveedorId = proveedorIdLinea;
      }
      if (proveedorNombreLinea) {
        itemData.proveedorNombre = proveedorNombreLinea;
      }
      if (proveedorDocumentoLinea) {
        itemData.proveedorIdentificacion = proveedorDocumentoLinea;
      }

      const codigoAsignado =
        (productoWrapper && productoWrapper.dataset && productoWrapper.dataset.productoCodigo) ||
        row.dataset.codigo ||
        '';
      if (codigoAsignado) {
        itemData.codigo = codigoAsignado;
      }

      items.push(itemData);
    });

    // Mostrar errores de validación si existen
    if (erroresValidacion.length > 0) {
      const mensaje = '⚠️ Errores encontrados:\n\n' + erroresValidacion.join('\n');
      Utils.showToast(mensaje, 'error', 8000);
      return;
    }

    if (!items.length) {
      Utils.showToast('Debe haber al menos un ítem válido en la compra.', 'warning');
      return;
    }

    // ============================================
    // VALIDACIÓN DE DUPLICADOS EN LA MISMA COMPRA
    // ============================================
    const duplicados = [];
    const productosConsolidados = new Map();

    for (const item of items) {
      const nombreNormalizado = this.normalizarNombreProducto(item.productoNombre);

      if (productosConsolidados.has(nombreNormalizado)) {
        // Producto duplicado encontrado
        const itemExistente = productosConsolidados.get(nombreNormalizado);
        duplicados.push({
          nombre: item.productoNombre,
          nombreExistente: itemExistente.productoNombre,
          cantidadNueva: item.cantidad,
          cantidadExistente: itemExistente.cantidad,
        });

        // Consolidar cantidades
        itemExistente.cantidad += item.cantidad;
        itemExistente.subtotal = Number(
          (itemExistente.cantidad * itemExistente.precioUnitario).toFixed(2)
        );
      } else {
        productosConsolidados.set(nombreNormalizado, { ...item });
      }
    }

    // Si hay duplicados, mostrar advertencia y consolidar
    if (duplicados.length > 0) {
      console.warn('⚠️ DUPLICADOS DETECTADOS EN LA COMPRA:');
      duplicados.forEach((d) => {
        console.warn(
          `  • "${d.nombre}" (${d.cantidadNueva} unidades) + "${d.nombreExistente}" (${d.cantidadExistente} unidades)`
        );
      });

      const mensaje =
        `⚠️ Se detectaron ${duplicados.length} producto(s) duplicado(s) en la compra.\n\n` +
        duplicados
          .map(
            (d) =>
              `"${d.nombre}" (${d.cantidadNueva}) → consolidado con "${d.nombreExistente}" (${d.cantidadExistente})`
          )
          .join('\n') +
        '\n\nLas cantidades se han sumado automáticamente.';

      Utils.showToast(mensaje, 'warning', 8000);

      // Reemplazar items con los consolidados
      items = Array.from(productosConsolidados.values());

      console.log(`✅ Productos consolidados: ${items.length} items únicos`);
    }

    // Mostrar resumen de productos validados
    console.log(`✅ ${items.length} productos validados correctamente:`);
    items.forEach((item, i) => {
      console.log(
        `  ${i + 1}. ${item.productoNombre}: ${item.cantidad} ${item.unidad} × ${Utils.formatCurrency(item.precioUnitario)} = ${Utils.formatCurrency(item.subtotal)}`
      );
    });

    const ivaMontoInput = document.getElementById('ia-compra-iva-monto');
    const otrosInput = document.getElementById('ia-compra-otros');

    const iva = Number(parseFloat(ivaMontoInput?.value) || 0);
    const otrosImpuestos = Number(parseFloat(otrosInput?.value) || 0);

    const subtotal = Number(items.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2));
    const total = Number((subtotal + iva + otrosImpuestos).toFixed(2));

    const iaTotal = Number(this.facturaIAReciente?.total || 0);
    if (iaTotal && Math.abs(total - iaTotal) > 0.5) {
      const continuar = window.confirm(
        `El total revisado (${Utils.formatCurrency(total)}) difiere del total detectado por la IA (${Utils.formatCurrency(iaTotal)}). ¿Deseas continuar?`
      );
      if (!continuar) {
        return;
      }
    }

    // Obtener datos del comprador
    const compradorNombreInput = document.getElementById('ia-compra-comprador-nombre');
    const compradorRucInput = document.getElementById('ia-compra-comprador-ruc');
    const compradorNombre = compradorNombreInput ? compradorNombreInput.value.trim() : '';
    const compradorRuc = compradorRucInput ? compradorRucInput.value.trim() : '';

    // Obtener datos adicionales del proveedor de la IA
    const proveedorDatos = this.facturaIAReciente?.proveedor || {};
    const proveedorCatalogo = this.resolveProveedorCatalog({
      proveedorId: this.facturaIAReciente?.proveedorId || proveedorDatos.id || '',
      proveedorNombre,
      proveedorIdentificacion: proveedorRuc || proveedorDatos.ruc || '',
    });
    const proveedorDireccion = proveedorDatos.direccion || '';
    const proveedorTelefono = proveedorDatos.telefono || '';
    const proveedorEmail = proveedorDatos.email || '';
    const proveedorIdResuelto = proveedorCatalogo.id || null;
    const proveedorIdentificacionNormalizada = this.normalizeDocumento(
      proveedorCatalogo.documento || proveedorRuc || proveedorDatos.ruc || ''
    );
    const proveedorNombreFinal = (
      proveedorCatalogo.nombre ||
      proveedorNombre ||
      proveedorDatos.nombre ||
      ''
    ).trim();

    console.log('📋 Datos del proveedor extraídos:', {
      nombre: proveedorNombreFinal,
      ruc: proveedorIdentificacionNormalizada,
      direccion: proveedorDireccion,
      telefono: proveedorTelefono,
      email: proveedorEmail,
    });

    const compra = {
      proveedorNombre: proveedorNombreFinal,
      proveedorIdentificacion: proveedorIdentificacionNormalizada, // Campo correcto para backend
      numero,
      fecha,
      moneda,
      notas,
      items,
      subtotal,
      iva,
      otrosImpuestos,
      total,
      // NUEVOS CAMPOS DEL ESQUEMA DE 57 CAMPOS
      serie,
      folioFiscal,
      fechaVencimiento,
      tipoCambio,
      descuentoGlobal,
      isrRetenido,
      ivaRetenido,
      totalLetra,
      metadata: JSON.stringify({
        hora: horaFactura,
        compradorNombre,
        compradorRuc,
        origenIA: true,
        esEsquemaMejorado: true, // Indicador de que viene con los 57 campos
        // Datos completos del emisor/proveedor
        emisor: emisorData,
        // Datos completos del receptor/comprador
        receptor: receptorData,
        // Detalles fiscales y de pago
        detalles: detallesData,
        // Datos adicionales del proveedor para actualizar registro (legacy)
        proveedorDireccion,
        proveedorTelefono,
        proveedorEmail,
      }),
    };

    if (proveedorIdResuelto) {
      compra.proveedorId = proveedorIdResuelto;
    }

    // Agregar datos del PDF si existen
    if (this.facturaIAReciente && this.facturaIAReciente.pdfData) {
      compra.pdfBase64 = this.facturaIAReciente.pdfData.base64;
      compra.pdfNombre = this.facturaIAReciente.pdfData.nombre;
      compra.pdfSize = this.facturaIAReciente.pdfData.size;
    }

    if (this.facturaIAReciente) {
      this.facturaIAReciente.proveedor = this.facturaIAReciente.proveedor || {};
      this.facturaIAReciente.proveedor.nombre = proveedorNombreFinal;
      if (proveedorIdentificacionNormalizada) {
        this.facturaIAReciente.proveedor.ruc = proveedorIdentificacionNormalizada;
      }
      if (proveedorIdResuelto) {
        this.facturaIAReciente.proveedor.id = proveedorIdResuelto;
        this.facturaIAReciente.proveedorId = proveedorIdResuelto;
      }
      this.facturaIAReciente.numero_factura = numero;
      this.facturaIAReciente.fecha = fecha;
      if (horaFactura) {
        this.facturaIAReciente.hora = horaFactura;
      }
    }

    try {
      console.log('📤 Enviando compra al servidor...');
      console.log('Datos a enviar:', {
        proveedor: proveedorNombreFinal,
        numero,
        fecha,
        items: items.length,
        total: Utils.formatCurrency(total),
      });

      const result = await this.requestBackend('/compras', {
        method: 'POST',
        body: compra,
      });

      if (!result || result.success === false) {
        throw new Error(result.message || 'Error en el servidor');
      }

      console.log('✅ Compra guardada en servidor:', result);

      // El servidor ya creó los productos y actualizó el stock automáticamente
      // Solo necesitamos sincronizar los productos desde el servidor para tener
      // los datos actualizados localmente (incluyendo los productos recién creados)
      const compraId = result.compraId || result.data?.id || result.id;
      const itemsParaInventario = Array.isArray(result.compra?.items)
        ? result.compra.items
        : compra.items;

      console.log('📦 Sincronizando productos con el servidor...');

      // PRIMERO: Sincronizar productos desde el servidor
      // Esto trae los productos creados automáticamente con el stock ya actualizado
      const productosCreadosServidor = Array.isArray(result.productosCreados)
        ? result.productosCreados
        : [];
      console.log(`📋 Productos creados por el servidor: ${productosCreadosServidor.length}`);
      if (productosCreadosServidor.length > 0) {
        console.log(
          '📦 Productos creados:',
          productosCreadosServidor.map((p) => `${p.nombre || p.id} (stock: ${p.stock})`).join(', ')
        );
      }

      const totalSincronizado = await this.sincronizarProductosDesdeServidor({
        productosCreados: productosCreadosServidor,
        actualizarPOS: true, // Siempre actualizar POS para reflejar cambios de stock
        origen: 'compras-ia',
      });

      if (totalSincronizado) {
        console.log(
          `🔄 Inventario sincronizado: ${totalSincronizado} productos disponibles en POS.`
        );
      }

      // NOTA: No llamamos a actualizarInventarioDesdeCompra porque:
      // 1. El servidor ya actualizó el stock de los productos existentes
      // 2. El servidor ya creó los productos nuevos con el stock correcto
      // 3. sincronizarProductosDesdeServidor trae todos los datos actualizados

      const totalItems = Array.isArray(itemsParaInventario)
        ? itemsParaInventario.length
        : items.length;
      Utils.showToast(
        `✅ Compra #${numero} guardada exitosamente.\n📦 ${totalItems} productos agregados al stock.`,
        'success',
        5000
      );
      Utils.closeModal('modalResultadoFacturaIA');
      this.handleSuggestionsOutsideClick = null;
      this.facturaIAReciente = null;

      // Eliminar la factura pendiente si existe (ya fue aprobada)
      if (this.facturaPendienteActualId) {
        await this.eliminarFacturaPendiente(this.facturaPendienteActualId);
        this.facturaPendienteActualId = null;
        console.log('🗑️ Factura pendiente eliminada (aprobada exitosamente)');
      }

      this.cargarCompras();
    } catch (error) {
      console.error('❌ Error al guardar la compra desde IA:', error);

      // Mensaje de error más específico
      let mensajeError = error.message || 'Error desconocido';
      if (mensajeError.includes('CSRF')) {
        mensajeError = '🔒 Error de seguridad. Recarga la página e intenta nuevamente.';
        Utils.showToast(`❌ Error al guardar: ${mensajeError}`, 'error', 8000);
      } else if (
        mensajeError.includes('409') ||
        mensajeError.toLowerCase().includes('ya existe') ||
        mensajeError.toLowerCase().includes('mismo número')
      ) {
        // Factura duplicada - mostrar notificación informativa
        this.mostrarNotificacionFacturaDuplicada(numero);
        return;
      } else if (mensajeError.includes('403') || mensajeError.includes('Forbidden')) {
        mensajeError = '🔒 Acceso denegado. Verifica tu sesión y permisos.';
        Utils.showToast(`❌ Error al guardar: ${mensajeError}`, 'error', 8000);
      } else if (mensajeError.includes('401') || mensajeError.includes('Unauthorized')) {
        mensajeError = '🔑 Sesión expirada. Por favor, inicia sesión nuevamente.';
        Utils.showToast(`❌ Error al guardar: ${mensajeError}`, 'error', 8000);
      } else {
        Utils.showToast(`❌ Error al guardar: ${mensajeError}`, 'error', 8000);
      }
    }
  },

  /**
   * Muestra una notificación elegante cuando una factura está duplicada
   */
  mostrarNotificacionFacturaDuplicada(numeroFactura) {
    // Crear el contenedor de notificación si no existe
    let notifContainer = document.getElementById('notif-factura-duplicada');
    if (notifContainer) {
      notifContainer.remove();
    }

    notifContainer = document.createElement('div');
    notifContainer.id = 'notif-factura-duplicada';
    notifContainer.innerHTML = `
      <div class="notif-duplicada-content">
        <div class="notif-duplicada-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h3 class="notif-duplicada-titulo">Factura Duplicada</h3>
        <p class="notif-duplicada-mensaje">
          La factura <strong>#${numeroFactura}</strong> ya está registrada en el sistema.
        </p>
        <div class="notif-duplicada-info">
          <span class="notif-duplicada-tip">💡 Si deseas guardarla, modifica el número de factura en el formulario.</span>
        </div>
        <button class="notif-duplicada-btn" onclick="document.getElementById('notif-factura-duplicada').remove()">
          Entendido
        </button>
      </div>
    `;

    // Estilos inline para la notificación
    notifContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;

    const content = notifContainer.querySelector('.notif-duplicada-content');
    content.style.cssText = `
      background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
      border-radius: 16px;
      padding: 32px;
      max-width: 420px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.4s ease;
    `;

    const icon = notifContainer.querySelector('.notif-duplicada-icon');
    icon.style.cssText = `
      color: #f59e0b;
      margin-bottom: 16px;
    `;

    const titulo = notifContainer.querySelector('.notif-duplicada-titulo');
    titulo.style.cssText = `
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 12px 0;
    `;

    const mensaje = notifContainer.querySelector('.notif-duplicada-mensaje');
    mensaje.style.cssText = `
      font-size: 1rem;
      color: #4b5563;
      margin: 0 0 16px 0;
      line-height: 1.5;
    `;

    const info = notifContainer.querySelector('.notif-duplicada-info');
    info.style.cssText = `
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 20px;
    `;

    const tip = notifContainer.querySelector('.notif-duplicada-tip');
    tip.style.cssText = `
      font-size: 0.9rem;
      color: #92400e;
    `;

    const btn = notifContainer.querySelector('.notif-duplicada-btn');
    btn.style.cssText = `
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    `;

    btn.onmouseover = () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
    };
    btn.onmouseout = () => {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = 'none';
    };

    // Agregar animaciones
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { 
          opacity: 0;
          transform: translateY(30px) scale(0.95);
        }
        to { 
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;
    notifContainer.appendChild(style);

    // Cerrar al hacer clic fuera
    notifContainer.addEventListener('click', (e) => {
      if (e.target === notifContainer) {
        notifContainer.remove();
      }
    });

    // Cerrar con Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        notifContainer.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    document.body.appendChild(notifContainer);

    // También mostrar un toast informativo
    Utils.showToast('⚠️ Esta factura ya fue registrada anteriormente', 'warning', 5000);
  },

  // ============================================
  // SISTEMA DE FACTURAS PENDIENTES DE APROBAR
  // ============================================

  /**
   * Guarda una factura pendiente en el servidor
   */
  async guardarFacturaPendiente(facturaData) {
    try {
      const result = await this.requestBackend('/facturas-pendientes', {
        method: 'POST',
        body: facturaData,
      });

      if (result && result.success) {
        console.log('✅ Factura pendiente guardada:', result.id);
        this.actualizarBadgeFacturasPendientes();
        return result;
      }
      return null;
    } catch (error) {
      console.error('Error guardando factura pendiente:', error);
      return null;
    }
  },

  /**
   * Obtiene todas las facturas pendientes del servidor
   */
  async obtenerFacturasPendientes() {
    try {
      const result = await this.requestBackend('/facturas-pendientes', {
        method: 'GET',
      });

      if (result && result.success) {
        return result.facturas || [];
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo facturas pendientes:', error);
      return [];
    }
  },

  /**
   * Elimina una factura pendiente del servidor
   */
  async eliminarFacturaPendiente(id) {
    try {
      const result = await this.requestBackend(`/facturas-pendientes/${id}`, {
        method: 'DELETE',
      });

      if (result && result.success) {
        console.log('✅ Factura pendiente eliminada:', id);
        this.actualizarBadgeFacturasPendientes();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error eliminando factura pendiente:', error);
      return false;
    }
  },

  /**
   * Obtiene el conteo de facturas pendientes
   */
  async obtenerConteoFacturasPendientes() {
    try {
      const result = await this.requestBackend('/facturas-pendientes/count', {
        method: 'GET',
      });

      return result?.count || 0;
    } catch (error) {
      console.error('Error obteniendo conteo de facturas pendientes:', error);
      return 0;
    }
  },

  /**
   * Actualiza el badge de facturas pendientes en la UI
   */
  async actualizarBadgeFacturasPendientes() {
    const count = await this.obtenerConteoFacturasPendientes();

    // Actualizar badge existente o crear uno nuevo
    let badge = document.getElementById('facturas-pendientes-badge');
    const btnFacturasPendientes = document.querySelector('[data-action="ver-facturas-pendientes"]');

    if (count > 0) {
      if (!badge && btnFacturasPendientes) {
        badge = document.createElement('span');
        badge.id = 'facturas-pendientes-badge';
        badge.className = 'badge-notification';
        badge.style.cssText = `
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ef4444;
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 999px;
          min-width: 18px;
          text-align: center;
        `;
        btnFacturasPendientes.style.position = 'relative';
        btnFacturasPendientes.appendChild(badge);
      }
      if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'inline-block';
      }
    } else if (badge) {
      badge.style.display = 'none';
    }

    return count;
  },

  /**
   * Muestra el modal con las facturas pendientes de aprobar
   */
  async mostrarFacturasPendientes() {
    const modalId = 'modalFacturasPendientes';
    Utils.closeModal(modalId);

    const facturas = await this.obtenerFacturasPendientes();

    if (facturas.length === 0) {
      Utils.showToast('📭 No hay facturas pendientes de aprobar', 'info', 3000);
      return;
    }

    const listaHtml = facturas
      .map((f, index) => {
        const fecha = f.fecha || 'Sin fecha';
        const proveedor = f.proveedor_nombre || 'Proveedor desconocido';
        const numero = f.numero_factura || 'Sin número';
        const total = Utils.formatCurrency(f.total || 0);
        const itemsCount = Array.isArray(f.items) ? f.items.length : 0;

        return `
        <div class="factura-pendiente-card" data-id="${f.id}" data-index="${index}">
          <div class="factura-pendiente-info">
            <div class="factura-pendiente-header">
              <span class="factura-numero"><i class="fas fa-file-invoice"></i> ${Utils.escapeHTML(numero)}</span>
              <span class="factura-fecha">${Utils.escapeHTML(fecha)}</span>
            </div>
            <div class="factura-pendiente-proveedor">
              <i class="fas fa-building"></i> ${Utils.escapeHTML(proveedor)}
              ${f.proveedor_ruc ? `<small>(${Utils.escapeHTML(f.proveedor_ruc)})</small>` : ''}
            </div>
            <div class="factura-pendiente-detalles">
              <span><i class="fas fa-boxes"></i> ${itemsCount} productos</span>
              <span class="factura-total"><strong>${total}</strong></span>
            </div>
          </div>
          <div class="factura-pendiente-acciones">
            <button class="btn btn-sm btn-primary" data-action="revisar-pendiente" data-id="${f.id}" title="Revisar y aprobar">
              <i class="fas fa-eye"></i> Revisar
            </button>
            <button class="btn btn-sm btn-danger" data-action="eliminar-pendiente" data-id="${f.id}" title="Descartar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
      })
      .join('');

    const body = `
      <style>
        .facturas-pendientes-lista { display: flex; flex-direction: column; gap: 12px; max-height: 60vh; overflow-y: auto; padding: 8px; }
        .factura-pendiente-card { display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; gap: 16px; transition: all 0.2s; }
        .factura-pendiente-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-color: var(--primary-color); }
        .factura-pendiente-info { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .factura-pendiente-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .factura-numero { font-weight: 600; color: var(--primary-color); }
        .factura-fecha { font-size: 0.85rem; color: var(--text-secondary); }
        .factura-pendiente-proveedor { font-size: 0.95rem; color: var(--text-primary); }
        .factura-pendiente-proveedor small { color: var(--text-tertiary); margin-left: 4px; }
        .factura-pendiente-detalles { display: flex; gap: 16px; font-size: 0.85rem; color: var(--text-secondary); }
        .factura-total { color: var(--success-color); }
        .factura-pendiente-acciones { display: flex; gap: 8px; }
        .facturas-pendientes-empty { text-align: center; padding: 40px; color: var(--text-tertiary); }
        .facturas-pendientes-empty i { font-size: 3rem; margin-bottom: 16px; opacity: 0.5; }
      </style>
      <div class="facturas-pendientes-lista">
        ${listaHtml}
      </div>
    `;

    const footer = `
      <button class="btn btn-light" data-action="close-modal">Cerrar</button>
    `;

    const modal = Utils.createModal(
      modalId,
      `<i class="fas fa-clock"></i> Facturas Pendientes de Aprobar (${facturas.length})`,
      body,
      footer,
      'wide'
    );

    // Bind events
    modal.querySelectorAll('[data-action="revisar-pendiente"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await this.abrirFacturaPendiente(id);
        Utils.closeModal(modalId);
      });
    });

    modal.querySelectorAll('[data-action="eliminar-pendiente"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm('¿Descartar esta factura pendiente? Esta acción no se puede deshacer.')) {
          const eliminada = await this.eliminarFacturaPendiente(id);
          if (eliminada) {
            btn.closest('.factura-pendiente-card').remove();
            Utils.showToast('🗑️ Factura pendiente descartada', 'success', 3000);

            // Verificar si quedan facturas
            const restantes = modal.querySelectorAll('.factura-pendiente-card').length;
            if (restantes === 0) {
              Utils.closeModal(modalId);
              Utils.showToast('📭 No quedan facturas pendientes', 'info', 3000);
            }
          }
        }
      });
    });

    modal.querySelector('[data-action="close-modal"]')?.addEventListener('click', () => {
      Utils.closeModal(modalId);
    });
  },

  /**
   * Abre una factura pendiente para revisión/aprobación
   */
  async abrirFacturaPendiente(id) {
    const facturas = await this.obtenerFacturasPendientes();
    const factura = facturas.find((f) => f.id === id);

    if (!factura) {
      Utils.showToast('❌ Factura no encontrada', 'error', 3000);
      return;
    }

    // Preparar datos en formato para mostrarResultadoFacturaIA
    const extractedData = {
      numero_factura: factura.numero_factura,
      fecha: factura.fecha,
      hora: factura.hora,
      proveedor: {
        nombre: factura.proveedor_nombre,
        ruc: factura.proveedor_ruc,
        id: factura.proveedor_id,
      },
      subtotal: factura.subtotal,
      iva: factura.iva,
      total: factura.total,
      items: factura.items || [],
      metadata: factura.metadata,
    };

    // Datos del PDF si existen
    const pdfData = factura.pdf_base64
      ? {
          base64: factura.pdf_base64,
          nombre: factura.pdf_nombre,
          size: factura.pdf_size,
        }
      : null;

    // Guardar ID de la factura pendiente para eliminarla después de aprobar
    this.facturaPendienteActualId = id;

    // Mostrar modal de revisión
    await this.mostrarResultadoFacturaIA(extractedData, '', '', null, pdfData);
  },

  /**
   * Actualiza el inventario automáticamente cuando se registra una compra
   */
  /**
   * Normaliza el nombre de un producto para comparación
   */
  normalizarNombreProducto(nombre) {
    if (!nombre) return '';
    return nombre
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Múltiples espacios → 1 espacio
      .replace(/[áäâà]/g, 'a')
      .replace(/[éëêè]/g, 'e')
      .replace(/[íïîì]/g, 'i')
      .replace(/[óöôò]/g, 'o')
      .replace(/[úüûù]/g, 'u')
      .replace(/ñ/g, 'n');
  },

  /**
   * Calcula similitud entre dos nombres (0-100%)
   */
  calcularSimilitud(nombre1, nombre2) {
    const n1 = this.normalizarNombreProducto(nombre1);
    const n2 = this.normalizarNombreProducto(nombre2);

    if (n1 === n2) return 100;

    // Levenshtein distance simplificado
    const largo = Math.max(n1.length, n2.length);
    if (largo === 0) return 100;

    let coincidencias = 0;
    const minLen = Math.min(n1.length, n2.length);

    for (let i = 0; i < minLen; i++) {
      if (n1[i] === n2[i]) coincidencias++;
    }

    // Verificar si uno contiene al otro
    if (n1.includes(n2) || n2.includes(n1)) {
      coincidencias += Math.abs(n1.length - n2.length) * 0.5;
    }

    return Math.round((coincidencias / largo) * 100);
  },

  /**
   * Busca producto existente con tolerancia a variaciones
   */
  async buscarProductoExistente(nombreProducto, umbralSimilitud = 85) {
    const productos = await Database.getCollection('productos');

    // 1. Búsqueda exacta normalizada
    const normalizado = this.normalizarNombreProducto(nombreProducto);
    let mejorCoincidencia = null;
    let mejorSimilitud = 0;

    for (const producto of productos) {
      const similitud = this.calcularSimilitud(nombreProducto, producto.nombre);

      if (similitud === 100) {
        // Coincidencia perfecta
        return { producto, similitud: 100, exacto: true };
      }

      if (similitud > mejorSimilitud) {
        mejorSimilitud = similitud;
        mejorCoincidencia = producto;
      }
    }

    // 2. Si hay similitud alta, retornar con advertencia
    if (mejorSimilitud >= umbralSimilitud) {
      return {
        producto: mejorCoincidencia,
        similitud: mejorSimilitud,
        exacto: false,
        advertencia: `Posible duplicado: "${nombreProducto}" vs "${mejorCoincidencia.nombre}" (${mejorSimilitud}% similar)`,
      };
    }

    return null;
  },

  async actualizarInventarioDesdeCompra(items, compraId = null) {
    if (!Array.isArray(items) || items.length === 0) return;

    let itemsActualizados = false;
    const productosCreados = [];
    const productosActualizados = [];

    for (const item of items) {
      try {
        // Si el item tiene un productoId, actualizar ese producto
        if (item.productoId) {
          const producto = Database.getItem('productos', item.productoId);
          if (producto) {
            // Incrementar el stock
            const stockAnterior = producto.stock || 0;
            producto.stock = stockAnterior + item.cantidad;

            // Actualizar precio de compra si cambió
            if (item.precioUnitario > 0) {
              producto.precioCompra = item.precioUnitario;

              // Recalcular margen si existe precio de venta
              if (producto.precioVenta > 0) {
                const margen =
                  ((producto.precioVenta - producto.precioCompra) / producto.precioCompra) * 100;
                producto.margen = margen.toFixed(2);
              }
            }

            producto.updatedAt = new Date().toISOString();
            Database.update('productos', item.productoId, producto);

            productosActualizados.push({
              nombre: producto.nombre,
              stockAnterior,
              stockNuevo: producto.stock,
              incremento: item.cantidad,
            });

            console.log(
              `✅ Stock actualizado: ${producto.nombre} (${stockAnterior} → ${producto.stock})`
            );
          }
        } else {
          // Buscar producto existente con tolerancia a variaciones
          const resultado = await this.buscarProductoExistente(item.productoNombre);

          if (resultado) {
            const { producto: productoExistente, similitud, exacto, advertencia } = resultado;

            if (!exacto && advertencia) {
              console.warn(`⚠️ ${advertencia}`);
            }

            // Actualizar producto existente
            const stockAnterior = productoExistente.stock || 0;
            productoExistente.stock = stockAnterior + item.cantidad;

            if (item.precioUnitario > 0) {
              productoExistente.precioCompra = item.precioUnitario;
            }
            productoExistente.updatedAt = new Date().toISOString();
            Database.update('productos', productoExistente.id, productoExistente);

            // Vincular el item con el producto
            item.productoId = productoExistente.id;
            itemsActualizados = true;

            productosActualizados.push({
              nombre: productoExistente.nombre,
              stockAnterior,
              stockNuevo: productoExistente.stock,
              incremento: item.cantidad,
              similitud: exacto ? 100 : similitud,
            });

            console.log(
              `✅ Stock actualizado: ${productoExistente.nombre} (${stockAnterior} → ${productoExistente.stock}) ${exacto ? '' : `[${similitud}% similar]`}`
            );
          } else {
            // Crear nuevo producto automáticamente
            const nuevoProducto = {
              id: `prod_${Utils.generateId()}`,
              codigo: `AUTO-${Date.now()}`,
              nombre: item.productoNombre,
              descripcion: item.descripcion || '',
              categoria: 'sin_categoria',
              stock: item.cantidad,
              stockMinimo: 5,
              precioCompra: item.precioUnitario,
              precioVenta: item.precioUnitario * 1.3, // Margen del 30% por defecto
              margen: 30,
              unidad: item.unidad || 'unidad',
              activo: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            Database.add('productos', nuevoProducto);

            // Vincular el item con el nuevo producto
            item.productoId = nuevoProducto.id;
            itemsActualizados = true;

            productosCreados.push({
              nombre: nuevoProducto.nombre,
              stock: nuevoProducto.stock,
            });

            console.log(
              `✅ Nuevo producto creado: ${nuevoProducto.nombre} (${item.cantidad} unidades)`
            );
          }
        }
      } catch (error) {
        console.error(`Error actualizando inventario para ${item.productoNombre}:`, error);
      }
    }

    // Mostrar resumen de cambios
    if (productosCreados.length > 0 || productosActualizados.length > 0) {
      console.log('\n📊 RESUMEN DE INVENTARIO:');
      if (productosCreados.length > 0) {
        console.log(`  🆕 Productos creados: ${productosCreados.length}`);
        productosCreados.forEach((p) => console.log(`     • ${p.nombre}: ${p.stock} unidades`));
      }
      if (productosActualizados.length > 0) {
        console.log(`  🔄 Productos actualizados: ${productosActualizados.length}`);
        productosActualizados.forEach((p) => {
          const marca = p.similitud < 100 ? ` (${p.similitud}% similar)` : '';
          console.log(
            `     • ${p.nombre}: ${p.stockAnterior} → ${p.stockNuevo} (+${p.incremento})${marca}`
          );
        });
      }
    }

    // Si se actualizaron vínculos y hay compraId, actualizar en backend
    if (itemsActualizados && compraId) {
      try {
        await this.requestBackend(`/compras/${compraId}`, {
          method: 'PATCH',
          body: JSON.stringify({ items }),
        });
        console.log(`🔗 Vínculos de productos actualizados en compra ${compraId}`);
      } catch (error) {
        console.error('Error al actualizar vínculos en la compra:', error);
      }
    }

    // Notificar que el inventario fue actualizado
    if (typeof window.Productos !== 'undefined' && window.Productos.render) {
      console.log('📦 Inventario sincronizado con la compra');
    }
  },

  normalizarProductoServidor(producto) {
    if (!producto || typeof producto !== 'object') {
      return null;
    }

    const nowIso = new Date().toISOString();
    const categoriaId = producto.categoriaId ?? producto.categoria_id ?? null;
    const categoriaNombreCruda = producto.categoriaNombre || producto.categoria || '';
    const proveedorId = producto.proveedorId ?? producto.proveedor_id ?? null;
    const proveedorNombre = producto.proveedorNombre || producto.proveedor_nombre || '';

    const negocioId =
      producto.negocioId ??
      producto.negocio_id ??
      (typeof Database !== 'undefined' && Database.getCurrentBusiness
        ? Database.getCurrentBusiness()
        : null);

    const parsedPrecioCompra =
      Number.parseFloat(producto.precioCompra ?? producto.precio_compra ?? 0) || 0;
    const parsedPrecioVenta =
      Number.parseFloat(producto.precioVenta ?? producto.precio_venta ?? 0) || 0;
    const parsedStock = Number.parseFloat(producto.stock ?? producto.cantidad ?? 0) || 0;
    const parsedStockMinimo =
      Number.parseFloat(producto.stockMinimo ?? producto.stock_minimo ?? 0) || 0;

    return {
      id: producto.id,
      codigo: producto.codigo || producto.productoCodigo || '',
      nombre: producto.nombre || producto.productoNombre || 'Producto sin nombre',
      descripcion: producto.descripcion || '',
      categoriaId,
      categoriaNombre: categoriaNombreCruda ? String(categoriaNombreCruda).trim() : 'Sin categoría',
      categoria: categoriaNombreCruda ? String(categoriaNombreCruda).trim() : 'Sin categoría',
      proveedorId: proveedorId || null,
      proveedorNombre,
      precioCompra: parsedPrecioCompra,
      precioVenta: parsedPrecioVenta,
      stock: parsedStock,
      stockMinimo: parsedStockMinimo,
      unidad: producto.unidad || producto.unidadMedida || producto.unidad_medida || 'UND',
      margen: producto.margen ?? null,
      activo: producto.activo !== false && producto.activo !== 0,
      negocioId,
      createdAt: producto.createdAt || producto.created_at || nowIso,
      updatedAt: producto.updatedAt || producto.updated_at || nowIso,
    };
  },

  mergeProductosLocales(productos, existingMap = null) {
    let map = existingMap;
    if (!map) {
      const base =
        typeof Database !== 'undefined' && Database.getCollection
          ? Database.getCollection('productos') || []
          : [];
      map = new Map(base.map((item) => [item.id, { ...item }]));
    }

    if (!Array.isArray(productos) || !productos.length) {
      return map;
    }

    productos.forEach((producto) => {
      const normalizado = this.normalizarProductoServidor(producto);
      if (!normalizado || !normalizado.id) {
        return;
      }
      const anterior = map.get(normalizado.id) || {};
      map.set(normalizado.id, { ...anterior, ...normalizado });
    });

    return map;
  },

  async sincronizarProductosDesdeServidor(options = {}) {
    const { productosCreados = [], actualizarPOS = false, origen = 'compras' } = options;

    console.log(
      `📥 [sincronizarProductosDesdeServidor] Iniciando sincronización desde origen: ${origen}`
    );
    console.log(`📦 Productos creados por el servidor: ${productosCreados.length}`);

    let productosMap = this.mergeProductosLocales(productosCreados);
    console.log(`📊 Productos locales después de merge inicial: ${productosMap.size}`);

    try {
      const respuesta = await this.requestBackend('/pos/productos', {
        method: 'GET',
        forceFetch: true,
      });
      const coleccion = Array.isArray(respuesta)
        ? respuesta
        : Array.isArray(respuesta?.productos)
          ? respuesta.productos
          : Array.isArray(respuesta?.data)
            ? respuesta.data
            : [];

      console.log(`📡 Productos recibidos del servidor: ${coleccion.length}`);

      productosMap = this.mergeProductosLocales(coleccion, productosMap);

      const productosFinales = Array.from(productosMap.values());
      if (typeof Database !== 'undefined' && Database.saveCollection) {
        Database.saveCollection('productos', productosFinales);
      }

      if (actualizarPOS && typeof window !== 'undefined' && window.VentasMejorado) {
        try {
          if (typeof window.VentasMejorado.init === 'function') {
            await window.VentasMejorado.init();
          }
          if (typeof window.VentasMejorado.renderizarProductos === 'function') {
            window.VentasMejorado.renderizarProductos();
          }
        } catch (posError) {
          console.warn('POS no se pudo refrescar automáticamente:', posError);
        }
      }

      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent('inventarioSincronizado', {
            detail: {
              total: productosFinales.length,
              origen,
            },
          })
        );
      }

      return productosFinales.length;
    } catch (error) {
      console.error('No se pudo sincronizar productos con el servidor:', error);
      const snapshot = Array.from(productosMap.values());
      if (typeof Database !== 'undefined' && Database.saveCollection) {
        Database.saveCollection('productos', snapshot);
      }
      return snapshot.length;
    }
  },

  async cargarCompras() {
    try {
      const compras = await this.requestBackend('/compras');
      this.comprasCache = Array.isArray(compras) ? compras : [];
      this.state.compras = this.comprasCache.slice();

      // La sincronización de inventario se hace manualmente cuando el usuario guarda una compra
      // No se ejecuta automáticamente para evitar errores y operaciones innecesarias

      this.actualizarIndicadores();
      this.renderComprasTable();
    } catch (error) {
      console.error('Error cargando compras', error);
      Utils.showToast(error.message || 'No se pudo obtener la lista de compras.', 'error');
    }
  },

  async cargarHistorialCompras(options = {}) {
    this.actualizarFiltrosHistorialDesdeUI();
    const filtros = this.state.historial.filtros;
    const paginacion = this.state.historial.paginacion;

    if (options.resetPage) {
      paginacion.page = 1;
    }

    const params = new URLSearchParams();
    params.set('page', paginacion.page);
    params.set('pageSize', paginacion.pageSize);
    params.set('includeResumen', '1');

    if (filtros.tipoMovimiento && filtros.tipoMovimiento !== 'todos') {
      params.set('tipo_movimiento', filtros.tipoMovimiento);
    }
    if (filtros.fechaInicio) {
      params.set('fecha_desde', filtros.fechaInicio);
    }
    if (filtros.fechaFin) {
      params.set('fecha_hasta', filtros.fechaFin);
    }
    if (filtros.busqueda) {
      params.set('search', filtros.busqueda);
    }
    if (filtros.fuentes) {
      params.set('fuentes', filtros.fuentes);
    }

    const tablaBody = this.dom.historial?.tablaBody;
    if (tablaBody) {
      tablaBody.innerHTML =
        '<tr><td colspan="7" class="compras-historial-empty">Cargando historial...</td></tr>';
    }

    this.state.historial.cargando = true;
    try {
      const respuesta = await this.requestBackend(`/historial-productos?${params.toString()}`);
      const movimientos = Array.isArray(respuesta?.historial) ? respuesta.historial : [];
      this.state.historial.items = movimientos.map((item) =>
        this.normalizarMovimientoHistorial(item)
      );
      this.state.historial.error = null;
      this.state.historial.paginacion.total = Number(respuesta?.total ?? movimientos.length);
      this.state.historial.paginacion.totalPages = Number(respuesta?.totalPages ?? 1) || 1;
      this.state.historial.resumen = this.normalizarResumenHistorial(respuesta?.resumen || {});
      this.renderHistorialTable();
      this.actualizarResumenHistorial(null, this.state.historial.resumen);
      this.renderHistorialPagination();

      const shouldFetchInsights = options.force || !this.state.historial.insights.updatedAt;
      if (shouldFetchInsights) {
        this.cargarInsightsHistorial();
      }
    } catch (error) {
      this.state.historial.error = error;
      console.error('Error cargando historial de compras:', error);
      if (tablaBody) {
        tablaBody.innerHTML = `<tr><td colspan="7" class="compras-historial-empty text-danger">${Utils.escapeHTML(error.message || 'No se pudo cargar el historial.')}</td></tr>`;
      }
      Utils.showToast(error.message || 'No se pudo cargar el historial de compras.', 'error');
    } finally {
      this.state.historial.cargando = false;
    }
  },

  /**
   * Muestra el detalle de una compra
   */
  async verDetalle(compraId) {
    if (!compraId) {
      Utils.showToast('ID de compra no válido', 'error');
      return;
    }

    try {
      // Obtener la compra del backend
      const compra = await this.requestBackend(`/compras/${compraId}`);

      if (!compra) {
        Utils.showToast('No se encontró la compra', 'error');
        return;
      }

      // Normalizar la compra
      const compraNormalizada = this.normalizarCompra(compra);
      const items = Array.isArray(compra.items) ? compra.items : [];

      // Crear modal con el detalle
      const body = `
        <div class="compra-detalle">
          <div class="detalle-header">
            <div class="detalle-info-grid">
              <div class="info-item">
                <label>Número:</label>
                <strong>${Utils.escapeHTML(compraNormalizada.numero || '—')}</strong>
              </div>
              <div class="info-item">
                <label>Fecha:</label>
                <strong>${Utils.escapeHTML(compraNormalizada.fecha || '—')}</strong>
              </div>
              <div class="info-item">
                <label>Proveedor:</label>
                <strong>${Utils.escapeHTML(compraNormalizada.proveedorNombre || '—')}</strong>
              </div>
              <div class="info-item">
                <label>Estado:</label>
                <span class="badge badge-${compraNormalizada.estadoPago === 'pagado' ? 'success' : 'warning'}">
                  ${Utils.escapeHTML(compraNormalizada.estadoPago || 'pendiente')}
                </span>
              </div>
              ${
                compra.pdf_nombre
                  ? `
              <div class="info-item" style="grid-column: span 2;">
                <label>Factura PDF:</label>
                <button class="btn btn-sm btn-primary" onclick="Compras.descargarPDF('${compraId}', '${Utils.escapeHTML(compra.pdf_nombre)}')">
                  <i class="fas fa-file-pdf"></i> ${Utils.escapeHTML(compra.pdf_nombre)}
                </button>
              </div>
              `
                  : ''
              }
            </div>
          </div>

          <div class="detalle-items">
            <h4>Items de la Compra</h4>
            <table class="table-detalle">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Precio Unit.</th>
                  <th>Subtotal</th>
                  <th>Stock Actual</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map((item) => {
                    // Buscar el producto en el inventario
                    const producto = item.productoId
                      ? Database.getItem('productos', item.productoId)
                      : null;
                    const stockActual = producto ? producto.stock : '—';

                    return `
                    <tr>
                      <td>
                        ${Utils.escapeHTML(item.productoNombre || item.nombre || '—')}
                        ${item.productoId ? '<i class="fas fa-link text-success" title="Vinculado a inventario"></i>' : ''}
                      </td>
                      <td>${Utils.escapeHTML(item.descripcion || '—')}</td>
                      <td>${item.cantidad || 0} ${Utils.escapeHTML(item.unidad || '')}</td>
                      <td>${Utils.formatCurrency(item.precioUnitario || 0)} ${compraNormalizada.moneda !== 'USD' ? Utils.escapeHTML(compraNormalizada.moneda) : ''}</td>
                      <td>${Utils.formatCurrency(item.subtotal || 0)}</td>
                      <td>
                        ${
                          producto
                            ? `
                          <span class="badge ${producto.stock <= producto.stockMinimo ? 'badge-danger' : 'badge-success'}">
                            ${stockActual}
                          </span>
                        `
                            : '<span class="text-muted">No vinculado</span>'
                        }
                      </td>
                    </tr>
                  `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>

          <div class="detalle-totales">
            <div class="totales-grid">
              <div class="total-item">
                <label>Subtotal:</label>
                <strong>${Utils.formatCurrency(compraNormalizada.subtotal || 0)}</strong>
              </div>
              <div class="total-item">
                <label>IVA:</label>
                <strong>${Utils.formatCurrency(compraNormalizada.iva || 0)}</strong>
              </div>
              ${
                compraNormalizada.otros > 0
                  ? `
                <div class="total-item">
                  <label>Otros:</label>
                  <strong>${Utils.formatCurrency(compraNormalizada.otros)}</strong>
                </div>
              `
                  : ''
              }
              <div class="total-item total-final">
                <label>TOTAL:</label>
                <strong class="text-primary">${Utils.formatCurrency(compraNormalizada.total || 0)}</strong>
                ${compraNormalizada.moneda !== 'USD' ? `<small>${Utils.escapeHTML(compraNormalizada.moneda)}</small>` : ''}
              </div>
            </div>
          </div>

          ${
            compra.notas
              ? `
            <div class="detalle-notas">
              <label>Notas:</label>
              <p>${Utils.escapeHTML(compra.notas)}</p>
            </div>
          `
              : ''
          }
        </div>
      `;

      const footer = `
        <button class="btn btn-secondary" data-action="close-detalle">
          <i class="fas fa-times"></i> Cerrar
        </button>
        <button class="btn btn-primary" data-action="imprimir-compra" data-compra-id="${compraId}">
          <i class="fas fa-print"></i> Imprimir
        </button>
      `;

      const modal = Utils.createModal(
        'modalDetalleCompra',
        `<i class="fas fa-file-invoice"></i> Detalle de Compra ${compraNormalizada.numero}`,
        body,
        footer,
        'large'
      );

      // Event listeners
      const closeBtn = modal.querySelector('[data-action="close-detalle"]');
      const printBtn = modal.querySelector('[data-action="imprimir-compra"]');

      if (closeBtn) {
        closeBtn.addEventListener('click', () => Utils.closeModal('modalDetalleCompra'));
      }

      if (printBtn) {
        printBtn.addEventListener('click', () => {
          this.imprimirCompra(compraId);
        });
      }
    } catch (error) {
      console.error('Error al cargar detalle de compra:', error);
      Utils.showToast('Error al cargar el detalle: ' + error.message, 'error');
    }
  },

  /**
   * Imprime el detalle de una compra
   */
  async imprimirCompra(compraId) {
    Utils.showToast('Función de impresión en desarrollo', 'info');
    // TODO: Implementar generación de PDF
  },

  /**
   * Muestra el formulario para agregar una nueva compra manual
   */
  mostrarNuevaCompra() {
    const body = `
      <form id="formNuevaCompra">
        <div class="form-row">
          <div class="form-group col-md-6">
            <label>Número de Factura <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="nueva-compra-numero" required>
          </div>
          <div class="form-group col-md-6">
            <label>Fecha <span class="text-danger">*</span></label>
            <input type="date" class="form-control" id="nueva-compra-fecha" value="${new Date().toISOString().split('T')[0]}" required>
          </div>
        </div>
        
        <div class="form-group">
          <label>Proveedor <span class="text-danger">*</span></label>
          <select class="form-control" id="nueva-compra-proveedor" required>
            <option value="">Seleccionar proveedor...</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Estado de Pago</label>
          <select class="form-control" id="nueva-compra-estado">
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="parcial">Parcial</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Items</label>
          <div id="nueva-compra-items">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio Unit.</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="nueva-compra-items-body">
                <!-- Items se agregan dinámicamente -->
              </tbody>
            </table>
            <button type="button" class="btn btn-sm btn-secondary" id="btn-agregar-item">
              <i class="fas fa-plus"></i> Agregar Item
            </button>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group col-md-4">
            <label>Subtotal</label>
            <input type="number" class="form-control" id="nueva-compra-subtotal" readonly>
          </div>
          <div class="form-group col-md-4">
            <label>IVA</label>
            <input type="number" class="form-control" id="nueva-compra-iva" readonly>
          </div>
          <div class="form-group col-md-4">
            <label>Total</label>
            <input type="number" class="form-control" id="nueva-compra-total" readonly>
          </div>
        </div>
        
        <div class="form-group">
          <label>Notas</label>
          <textarea class="form-control" id="nueva-compra-notas" rows="3"></textarea>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn btn-secondary" data-action="cancelar-nueva-compra">
        <i class="fas fa-times"></i> Cancelar
      </button>
      <button class="btn btn-primary" data-action="guardar-nueva-compra">
        <i class="fas fa-save"></i> Guardar Compra
      </button>
    `;

    const modal = Utils.createModal(
      'modalNuevaCompra',
      '<i class="fas fa-plus-circle"></i> Nueva Compra Manual',
      body,
      footer,
      'large'
    );

    // Cargar proveedores
    this.cargarProveedoresEnSelect('nueva-compra-proveedor');

    // Event listeners
    const btnCancelar = modal.querySelector('[data-action="cancelar-nueva-compra"]');
    const btnGuardar = modal.querySelector('[data-action="guardar-nueva-compra"]');
    const btnAgregarItem = modal.querySelector('#btn-agregar-item');

    if (btnCancelar) {
      btnCancelar.addEventListener('click', () => Utils.closeModal('modalNuevaCompra'));
    }

    if (btnGuardar) {
      btnGuardar.addEventListener('click', () => this.guardarNuevaCompra());
    }

    if (btnAgregarItem) {
      btnAgregarItem.addEventListener('click', () => this.agregarItemCompra());
    }

    // Agregar primer item por defecto
    this.agregarItemCompra();
  },

  /**
   * Agrega una fila de item a la tabla de nueva compra
   */
  agregarItemCompra() {
    const tbody = document.getElementById('nueva-compra-items-body');
    if (!tbody) return;

    const itemId = `item-${Date.now()}`;
    const row = document.createElement('tr');
    row.dataset.itemId = itemId;
    row.innerHTML = `
      <td>
        <select class="form-control form-control-sm item-producto" required>
          <option value="">Seleccionar...</option>
        </select>
      </td>
      <td>
        <input type="number" class="form-control form-control-sm item-cantidad" min="1" value="1" required>
      </td>
      <td>
        <input type="number" class="form-control form-control-sm item-precio" min="0" step="0.01" value="0" required>
      </td>
      <td>
        <input type="number" class="form-control form-control-sm item-subtotal" readonly>
      </td>
      <td>
        <button type="button" class="btn btn-sm btn-danger btn-eliminar-item">
          <i class="fas fa-times"></i>
        </button>
      </td>
    `;

    tbody.appendChild(row);

    // Cargar productos en el select
    const selectProducto = row.querySelector('.item-producto');
    this.cargarProductosEnSelect(selectProducto);

    // Calcular subtotal al cambiar cantidad o precio
    const inputCantidad = row.querySelector('.item-cantidad');
    const inputPrecio = row.querySelector('.item-precio');
    const inputSubtotal = row.querySelector('.item-subtotal');

    const calcularSubtotal = () => {
      const cantidad = parseFloat(inputCantidad.value) || 0;
      const precio = parseFloat(inputPrecio.value) || 0;
      inputSubtotal.value = (cantidad * precio).toFixed(2);
      this.calcularTotalesNuevaCompra();
    };

    inputCantidad.addEventListener('input', calcularSubtotal);
    inputPrecio.addEventListener('input', calcularSubtotal);

    // Botón eliminar
    const btnEliminar = row.querySelector('.btn-eliminar-item');
    btnEliminar.addEventListener('click', () => {
      row.remove();
      this.calcularTotalesNuevaCompra();
    });
  },

  /**
   * Calcula los totales de la nueva compra
   */
  calcularTotalesNuevaCompra() {
    const items = document.querySelectorAll('#nueva-compra-items-body tr');
    let subtotal = 0;

    items.forEach((row) => {
      const subtotalItem = parseFloat(row.querySelector('.item-subtotal').value) || 0;
      subtotal += subtotalItem;
    });

    const iva = subtotal * 0.16; // 16% IVA
    const total = subtotal + iva;

    document.getElementById('nueva-compra-subtotal').value = subtotal.toFixed(2);
    document.getElementById('nueva-compra-iva').value = iva.toFixed(2);
    document.getElementById('nueva-compra-total').value = total.toFixed(2);
  },

  /**
   * Carga proveedores en un select
   */
  async cargarProveedoresEnSelect(selectId) {
    try {
      const proveedores = await Database.getCollection('proveedores');
      const select = document.getElementById(selectId);
      if (!select) return;

      proveedores.forEach((proveedor) => {
        const option = document.createElement('option');
        option.value = proveedor.id;
        option.textContent = proveedor.nombre;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('Error cargando proveedores:', error);
    }
  },

  /**
   * Carga productos en un select
   */
  async cargarProductosEnSelect(selectElement) {
    try {
      const productos = await Database.getCollection('productos');

      productos.forEach((producto) => {
        const option = document.createElement('option');
        option.value = producto.id;
        option.textContent = `${producto.nombre} - ${Utils.formatCurrency(producto.precioCompra || 0)}`;
        option.dataset.precio = producto.precioCompra || 0;
        selectElement.appendChild(option);
      });

      // Al seleccionar producto, autocompletar precio
      selectElement.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const precio = selectedOption.dataset.precio || 0;
        const row = e.target.closest('tr');
        const inputPrecio = row.querySelector('.item-precio');
        if (inputPrecio && precio > 0) {
          inputPrecio.value = precio;
          inputPrecio.dispatchEvent(new Event('input'));
        }
      });
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  },

  /**
   * Guarda la nueva compra
   */
  async guardarNuevaCompra() {
    const numero = document.getElementById('nueva-compra-numero').value.trim();
    const fecha = document.getElementById('nueva-compra-fecha').value;
    const proveedorId = document.getElementById('nueva-compra-proveedor').value;
    const estadoPago = document.getElementById('nueva-compra-estado').value;
    const notas = document.getElementById('nueva-compra-notas').value.trim();

    if (!numero || !fecha || !proveedorId) {
      Utils.showToast('Complete los campos obligatorios', 'warning');
      return;
    }

    // Obtener items
    const items = [];
    const rows = document.querySelectorAll('#nueva-compra-items-body tr');

    for (const row of rows) {
      const productoId = row.querySelector('.item-producto').value;
      const cantidad = parseFloat(row.querySelector('.item-cantidad').value) || 0;
      const precioUnitario = parseFloat(row.querySelector('.item-precio').value) || 0;
      const subtotal = parseFloat(row.querySelector('.item-subtotal').value) || 0;

      if (!productoId || cantidad <= 0) {
        Utils.showToast('Todos los items deben tener producto y cantidad válidos', 'warning');
        return;
      }

      // Obtener datos del producto
      const producto = Database.getItem('productos', productoId);
      if (producto) {
        items.push({
          productoId: producto.id,
          productoNombre: producto.nombre,
          descripcion: producto.descripcion || '',
          unidad: producto.unidad || 'unidad',
          cantidad,
          precioUnitario,
          subtotal,
        });
      }
    }

    if (items.length === 0) {
      Utils.showToast('Debe agregar al menos un item', 'warning');
      return;
    }

    // Obtener datos del proveedor
    const proveedor = Database.getItem('proveedores', proveedorId);

    // Crear objeto de compra
    const compra = {
      id: `COMP-${Date.now()}`,
      numero,
      fecha,
      proveedorId,
      proveedorNombre: proveedor ? proveedor.nombre : '',
      items,
      subtotal: parseFloat(document.getElementById('nueva-compra-subtotal').value) || 0,
      iva: parseFloat(document.getElementById('nueva-compra-iva').value) || 0,
      total: parseFloat(document.getElementById('nueva-compra-total').value) || 0,
      estadoPago,
      estado: 'completada',
      moneda: 'USD',
      notas,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // Guardar en backend
      const result = await this.requestBackend('/compras', {
        method: 'POST',
        body: compra, // No usar JSON.stringify, requestBackend lo hace automáticamente
      });

      // Sincronizar productos desde el servidor
      // El servidor ya actualizó el stock, solo necesitamos obtener los datos actualizados
      const productosCreadosServidor = Array.isArray(result?.productosCreados)
        ? result.productosCreados
        : [];
      await this.sincronizarProductosDesdeServidor({
        productosCreados: productosCreadosServidor,
        actualizarPOS: true,
        origen: 'compras-manual',
      });

      Utils.showToast('Compra guardada exitosamente', 'success');
      Utils.closeModal('modalNuevaCompra');

      // Actualizar sin recargar página
      if (window.DataRefreshManager) {
        await this.cargarCompras();
      } else {
        this.cargarCompras();
      }
    } catch (error) {
      console.error('Error guardando compra:', error);
      Utils.showToast('Error al guardar la compra: ' + error.message, 'error');
    }
  },

  /**
   * Descarga el PDF de una factura de compra
   */
  async descargarPDF(compraId, nombreArchivo) {
    try {
      const url = Utils.apiUrl(`/api/compras/${compraId}/pdf`);

      // Crear un enlace temporal y hacer clic en él
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo || `Factura_${compraId}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Utils.showToast('Descargando factura PDF...', 'info');
    } catch (error) {
      console.error('Error descargando PDF:', error);
      Utils.showToast('Error al descargar el PDF', 'error');
    }
  },

  /**
   * Edita una compra existente
   */
  async editarCompra(compraId) {
    try {
      const compra = await this.requestBackend(`/compras/${compraId}`);

      if (!compra) {
        Utils.showToast('No se encontró la compra', 'error');
        return;
      }

      // Por ahora solo permitimos cambiar el estado de pago
      const body = `
        <div class="form-group">
          <label>Número de Factura</label>
          <input type="text" class="form-control" value="${Utils.escapeHTML(compra.numero || '')}" readonly>
        </div>
        <div class="form-group">
          <label>Fecha</label>
          <input type="date" class="form-control" value="${compra.fecha || ''}" readonly>
        </div>
        <div class="form-group">
          <label>Estado de Pago</label>
          <select class="form-control" id="editar-estado-pago">
            <option value="pendiente" ${compra.estadoPago === 'pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="pagado" ${compra.estadoPago === 'pagado' ? 'selected' : ''}>Pagado</option>
            <option value="parcial" ${compra.estadoPago === 'parcial' ? 'selected' : ''}>Parcial</option>
          </select>
        </div>
        <div class="form-group">
          <label>Notas</label>
          <textarea class="form-control" id="editar-notas" rows="3">${Utils.escapeHTML(compra.notas || '')}</textarea>
        </div>
      `;

      const footer = `
        <button class="btn btn-secondary" data-action="cancelar-editar">
          <i class="fas fa-times"></i> Cancelar
        </button>
        <button class="btn btn-primary" data-action="guardar-editar">
          <i class="fas fa-save"></i> Guardar Cambios
        </button>
      `;

      const modal = Utils.createModal(
        'modalEditarCompra',
        '<i class="fas fa-edit"></i> Editar Compra',
        body,
        footer
      );

      const btnCancelar = modal.querySelector('[data-action="cancelar-editar"]');
      const btnGuardar = modal.querySelector('[data-action="guardar-editar"]');

      if (btnCancelar) {
        btnCancelar.addEventListener('click', () => Utils.closeModal('modalEditarCompra'));
      }

      if (btnGuardar) {
        btnGuardar.addEventListener('click', async () => {
          const estadoPago = document.getElementById('editar-estado-pago').value;
          const notas = document.getElementById('editar-notas').value;

          try {
            await this.requestBackend(`/compras/${compraId}`, {
              method: 'PATCH',
              body: JSON.stringify({ estadoPago, notas }),
            });

            Utils.showToast('Compra actualizada', 'success');
            Utils.closeModal('modalEditarCompra');
            this.cargarCompras();
          } catch (error) {
            console.error('Error actualizando compra:', error);
            Utils.showToast('Error al actualizar: ' + error.message, 'error');
          }
        });
      }
    } catch (error) {
      console.error('Error al cargar compra para editar:', error);
      Utils.showToast('Error al cargar la compra', 'error');
    }
  },

  /**
   * Elimina una compra
   */
  // ============================================
  // FUNCIONALIDAD: Cargar facturas desde CLI
  // ============================================

  async mostrarFacturasCLI() {
    try {
      ProgressBar.show('Buscando facturas procesadas...', 10);

      const response = await this.requestBackend('/facturas-cli');
      ProgressBar.hide();

      if (!response.success || response.facturas.length === 0) {
        const carpetaInfo = response.carpeta ? `\n\nCarpeta configurada:\n${response.carpeta}` : '';
        Utils.showToast(
          `📁 No hay facturas procesadas por el CLI.${carpetaInfo}\n\n` +
            `Procesa PDFs con el comando:\nnode js\\gemini_pdf_2_json_cli.js factura.pdf backend\\facturas_cli\\1`,
          'info',
          10000
        );
        return;
      }

      // Mostrar lista de facturas
      const modalId = 'modalFacturasCLI';
      const facturasHTML = response.facturas
        .map(
          (f) => `
        <tr data-filename="${Utils.escapeHTML(f.filename)}">
          <td>${Utils.escapeHTML(f.numero_factura)}</td>
          <td>${Utils.escapeHTML(f.proveedor)}</td>
          <td class="text-center">${f.items} items</td>
          <td class="text-right">${Utils.formatCurrency(f.total)}</td>
          <td>${new Date(f.fechaCreacion).toLocaleString('es-ES')}</td>
          <td class="text-center">
            <div class="btn-group">
              <button class="btn btn-sm btn-primary" data-action="cargar-cli" data-file="${Utils.escapeHTML(f.filename)}" title="Cargar y revisar">
                <i class="fas fa-upload"></i> Cargar
              </button>
              <button class="btn btn-sm btn-danger" data-action="eliminar-cli" data-file="${Utils.escapeHTML(f.filename)}" title="Eliminar">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `
        )
        .join('');

      const body = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          <strong>Facturas procesadas:</strong> ${response.total} archivo(s) encontrado(s)
          <br><small>Carpeta: <code>${Utils.escapeHTML(response.carpeta)}</code></small>
        </div>
        <div class="table-wrapper">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Número Factura</th>
                <th>Proveedor</th>
                <th class="text-center">Items</th>
                <th class="text-right">Total</th>
                <th>Procesado</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>${facturasHTML}</tbody>
          </table>
        </div>
        <div class="alert alert-secondary" style="margin-top: 16px;">
          <strong>💡 Cómo usar el CLI:</strong>
          <pre style="background: var(--bg-secondary); padding: 8px; border-radius: 4px; margin-top: 8px;">node js\\gemini_pdf_2_json_cli.js factura.pdf backend\\facturas_cli\\1</pre>
        </div>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="Utils.closeModal('${modalId}')">Cerrar</button>
      `;

      const modal = Utils.createModal(
        modalId,
        '📂 Facturas Procesadas (CLI)',
        body,
        footer,
        'extra-wide'
      );

      // Event listeners
      modal.querySelectorAll('[data-action="cargar-cli"]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const filename = e.currentTarget.dataset.file;
          await this.cargarFacturaCLI(filename);
          Utils.closeModal(modalId);
        });
      });

      modal.querySelectorAll('[data-action="eliminar-cli"]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          if (!confirm('¿Eliminar esta factura procesada?\n\nEsta acción no se puede deshacer.'))
            return;

          const filename = e.currentTarget.dataset.file;

          try {
            ProgressBar.show('Eliminando...', 50);
            await this.requestBackend(`/facturas-cli/${encodeURIComponent(filename)}`, {
              method: 'DELETE',
            });
            ProgressBar.hide();

            e.currentTarget.closest('tr').remove();
            Utils.showToast('✅ Factura eliminada', 'success');

            // Si ya no hay facturas, cerrar modal
            const tbody = modal.querySelector('tbody');
            if (tbody && tbody.children.length === 0) {
              Utils.closeModal(modalId);
              Utils.showToast('No quedan facturas procesadas', 'info');
            }
          } catch (error) {
            ProgressBar.hide();
            console.error('[Compras] Error eliminando:', error);
            Utils.showToast('Error eliminando factura: ' + error.message, 'error');
          }
        });
      });
    } catch (error) {
      ProgressBar.hide();
      console.error('[Compras] Error cargando facturas CLI:', error);
      Utils.showToast('Error cargando facturas procesadas: ' + error.message, 'error');
    }
  },

  async cargarFacturaCLI(filename) {
    try {
      ProgressBar.show('Paso 1/2: Cargando factura...', 30);

      const response = await this.requestBackend(`/facturas-cli/${encodeURIComponent(filename)}`);

      ProgressBar.update('Paso 2/2: Preparando vista previa', 70);

      if (!response.success) {
        throw new Error(response.message || 'Error al cargar la factura');
      }

      console.log('[Compras] Factura CLI cargada:', {
        filename,
        items: response.extractedData?.items?.length || 0,
        metodo: response.diagnostics?.extractionMethod,
      });

      // Usar el mismo método de preview que el upload normal
      await this.mostrarResultadoFacturaIA(
        response.extractedData,
        response.rawText,
        null,
        response.diagnostics
      );

      setTimeout(() => ProgressBar.hide(), 500);
    } catch (error) {
      ProgressBar.hide();
      console.error('[Compras] Error cargando factura CLI:', error);
      Utils.showToast('Error al cargar la factura: ' + error.message, 'error');
    }
  },

  /**
   * Elimina todas las compras vacías (sin items o con total 0)
   */
  async eliminarComprasVacias() {
    const confirmar = confirm(
      '¿Eliminar TODAS las compras vacías o con errores? Esta acción no se puede deshacer.'
    );
    if (!confirmar) return;

    try {
      // Obtener todas las compras
      const compras = await this.requestBackend('/compras');

      // Filtrar compras vacías o con problemas
      const comprasVacias = compras.filter((compra) => {
        const items = Array.isArray(compra.items)
          ? compra.items
          : typeof compra.items === 'string'
            ? JSON.parse(compra.items)
            : [];
        const total = Number(compra.total || 0);

        // Compra vacía si: no tiene items, items está vacío, o total es 0
        return items.length === 0 || total === 0;
      });

      if (comprasVacias.length === 0) {
        Utils.showToast('No se encontraron compras vacías', 'info');
        return;
      }

      const confirmacion2 = confirm(
        `Se encontraron ${comprasVacias.length} compras vacías. ¿Continuar con la eliminación?`
      );
      if (!confirmacion2) return;

      let eliminadas = 0;
      let errores = 0;

      // Eliminar una por una
      for (const compra of comprasVacias) {
        try {
          await this.requestBackend(`/compras/${compra.id}`, {
            method: 'DELETE',
          });
          eliminadas++;
          console.log(`✅ Eliminada: ${compra.numero || compra.id}`);
        } catch (error) {
          errores++;
          console.error(`❌ Error eliminando ${compra.numero || compra.id}:`, error);
        }
      }

      Utils.showToast(`Eliminadas ${eliminadas} compras vacías. Errores: ${errores}`, 'success');
      this.cargarCompras();
    } catch (error) {
      console.error('Error eliminando compras vacías:', error);
      Utils.showToast('Error al eliminar compras vacías: ' + error.message, 'error');
    }
  },

  /**
   * Agregar item desde módulo externo (Catálogo, Órdenes, etc.)
   * @param {Object} itemData - Datos del item a agregar
   */
  agregarItemDesdeExterno(itemData) {
    const {
      productoId,
      productoNombre,
      sku,
      cantidad = 1,
      precioUnitario = 0,
      proveedorNombre,
      categoria,
      origenCatalogo = false,
    } = itemData;

    console.log('📥 Recibiendo item desde catálogo:', productoNombre);

    // Guardar en sessionStorage para cuando se abra compras
    const itemsPendientes = JSON.parse(sessionStorage.getItem('compras_items_pendientes') || '[]');
    itemsPendientes.push({
      productoId,
      nombre: productoNombre,
      sku,
      cantidad,
      precioUnitario,
      categoria,
      proveedorNombre,
      origen: origenCatalogo ? 'catalogo' : 'externo',
    });
    sessionStorage.setItem('compras_items_pendientes', JSON.stringify(itemsPendientes));

    console.log('✅ Item guardado, total pendientes:', itemsPendientes.length);
  },

  /**
   * Procesar items pendientes de otros módulos
   */
  procesarItemsPendientes() {
    const itemsPendientes = JSON.parse(sessionStorage.getItem('compras_items_pendientes') || '[]');

    if (itemsPendientes.length === 0) return;

    console.log(`📦 Procesando ${itemsPendientes.length} items del catálogo...`);
    Utils.showToast?.(
      `${itemsPendientes.length} producto(s) del catálogo listos para agregar`,
      'info',
      5000
    );

    setTimeout(() => {
      sessionStorage.removeItem('compras_items_pendientes');
    }, 3000);
  },

  /**
   * Abrir modal de pedidos rápidos
   */
  async abrirPedidosRapidos() {
    try {
      const pedidos = await this.requestBackend('/pedidos-rapidos', {
        method: 'GET',
      });

      // Obtener información del negocio actual
      let negocioNombre = 'Negocio Actual';
      try {
        const negocioId =
          localStorage.getItem('negocio_actual') || localStorage.getItem('negocio_login');
        if (negocioId) {
          const response = await this.requestBackend(`/negocios/${negocioId}`);
          if (response && response.nombre) {
            negocioNombre = response.nombre;
          }
        }
      } catch (error) {
        console.warn('No se pudo obtener nombre del negocio:', error);
      }

      const modal = document.createElement('div');
      modal.className = 'modal fade';
      modal.id = 'modalPedidosRapidos';
      modal.innerHTML = `
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">
                <i class="fas fa-bolt"></i> Pedidos Rápidos
                <span class="badge bg-light text-primary ms-2" style="font-size: 0.8rem;">
                  <i class="fas fa-store"></i> ${Utils.escapeHTML(negocioNombre)}
                </span>
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <p class="text-muted mb-0">
                  <i class="fas fa-info-circle"></i> Plantillas de pedidos frecuentes para crear compras rápidamente
                  <small class="d-block mt-1">📊 ${pedidos.length} plantilla(s) guardada(s)</small>
                </p>
                <button class="btn btn-success btn-sm" data-action="crear-pedido">
                  <i class="fas fa-plus"></i> Crear Plantilla
                </button>
              </div>
              <div id="listaPedidosRapidos">
                ${
                  pedidos.length === 0
                    ? `
                  <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> No hay plantillas guardadas. 
                    Crea una para agilizar tus pedidos frecuentes.
                  </div>
                `
                    : `
                  <div class="table-responsive">
                    <table class="table table-hover">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Proveedor</th>
                          <th>Productos</th>
                          <th>Total Estimado</th>
                          <th>Usado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${pedidos
                          .map((p) => {
                            const productos = Array.isArray(p.productos)
                              ? p.productos
                              : typeof p.productos === 'string'
                                ? JSON.parse(p.productos)
                                : [];
                            let totalEstimado = 0;
                            productos.forEach((prod) => {
                              totalEstimado += (prod.cantidad || 0) * (prod.precio_unitario || 0);
                            });

                            const vecesUsado = p.veces_usado || 0;
                            const badgeColor =
                              vecesUsado > 10
                                ? 'success'
                                : vecesUsado > 5
                                  ? 'primary'
                                  : 'secondary';
                            const ultimoUso = p.ultimo_uso
                              ? new Date(p.ultimo_uso).toLocaleDateString('es-ES')
                              : 'Nunca';

                            return `
                          <tr>
                            <td>
                              <strong>${Utils.escapeHTML(p.nombre)}</strong>
                              ${p.notas ? `<br><small class="text-muted">${Utils.escapeHTML(p.notas)}</small>` : ''}
                              ${!p.activo ? '<br><span class="badge bg-warning">Inactiva</span>' : ''}
                            </td>
                            <td>
                              ${p.proveedor_nombre ? `<i class="fas fa-truck"></i> ${Utils.escapeHTML(p.proveedor_nombre)}` : '<span class="text-muted">—</span>'}
                            </td>
                            <td>
                              <span class="badge bg-secondary">${productos.length} items</span>
                            </td>
                            <td><strong>${Utils.formatCurrency(totalEstimado)}</strong></td>
                            <td>
                              <span class="badge bg-${badgeColor}">${vecesUsado}x</span>
                              <br><small class="text-muted">Último: ${ultimoUso}</small>
                            </td>
                            <td>
                              <div class="btn-group btn-group-sm">
                                <button class="btn btn-primary" data-action="usar-pedido" data-id="${p.id}" title="Usar plantilla">
                                  <i class="fas fa-shopping-cart"></i>
                                </button>
                                <button class="btn btn-secondary" data-action="editar-pedido" data-id="${p.id}" title="Editar">
                                  <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-danger" data-action="eliminar-pedido" data-id="${p.id}" title="Eliminar">
                                  <i class="fas fa-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        `;
                          })
                          .join('')}
                      </tbody>
                    </table>
                  </div>
                `
                }
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      const bsModal = new bootstrap.Modal(modal);

      modal.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;

        switch (action) {
          case 'crear-pedido':
            bsModal.hide();
            await this.crearEditarPedidoRapido();
            break;
          case 'editar-pedido':
            bsModal.hide();
            await this.crearEditarPedidoRapido(id);
            break;
          case 'usar-pedido':
            bsModal.hide();
            await this.usarPedidoRapido(id);
            break;
          case 'eliminar-pedido':
            if (confirm('¿Eliminar esta plantilla?')) {
              await this.eliminarPedidoRapido(id);
              bsModal.hide();
              this.abrirPedidosRapidos();
            }
            break;
        }
      });

      modal.addEventListener('hidden.bs.modal', () => modal.remove());
      bsModal.show();
    } catch (error) {
      console.error('Error cargando pedidos rápidos:', error);
      Utils.showToast('Error al cargar pedidos rápidos', 'error');
    }
  },

  /**
   * Crear o editar pedido rápido
   */
  async crearEditarPedidoRapido(pedidoId = null) {
    try {
      let pedido = null;
      if (pedidoId) {
        const pedidos = await this.requestBackend('/pedidos-rapidos', { method: 'GET' });
        pedido = pedidos.find((p) => p.id === parseInt(pedidoId));
      }

      const proveedores = await this.requestBackend('/proveedores', { method: 'GET' });
      const productos = await this.requestBackend('/productos', { method: 'GET' });

      const modal = document.createElement('div');
      modal.className = 'modal fade';
      modal.id = 'modalEditarPedido';
      modal.innerHTML = `
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">
                <i class="fas fa-bolt"></i> ${pedido ? 'Editar' : 'Crear'} Pedido Rápido
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="formPedidoRapido">
                <div class="row mb-3">
                  <div class="col-md-6">
                    <label class="form-label">Nombre de la plantilla *</label>
                    <input type="text" class="form-control" name="nombre" value="${pedido?.nombre || ''}" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Proveedor</label>
                    <select class="form-select" name="proveedor_id">
                      <option value="">Seleccionar proveedor...</option>
                      ${proveedores
                        .map(
                          (prov) => `
                        <option value="${prov.id}" ${pedido?.proveedor_id === prov.id ? 'selected' : ''}>
                          ${Utils.escapeHTML(prov.nombre)}
                        </option>
                      `
                        )
                        .join('')}
                    </select>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Notas</label>
                  <textarea class="form-control" name="notas" rows="2">${pedido?.notas || ''}</textarea>
                </div>

                <div class="mb-3">
                  <label class="form-label">Productos *</label>
                  <div class="mb-2">
                    <button type="button" class="btn btn-sm btn-secondary" data-action="agregar-producto">
                      <i class="fas fa-plus"></i> Agregar Producto
                    </button>
                  </div>
                  <div class="table-responsive">
                    <table class="table table-sm" id="tablaProductosPedido">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th style="width: 120px;">Cantidad</th>
                          <th style="width: 150px;">Precio Unit.</th>
                          <th style="width: 150px;">Subtotal</th>
                          <th style="width: 50px;"></th>
                        </tr>
                      </thead>
                      <tbody id="productosPedidoBody">
                        ${
                          pedido && pedido.productos
                            ? pedido.productos
                                .map(
                                  (prod, idx) => `
                          <tr data-index="${idx}">
                            <td>
                              <select class="form-select form-select-sm producto-select" name="productos[${idx}][producto_id]" required>
                                <option value="">Seleccionar...</option>
                                ${productos
                                  .map((p) => {
                                    const stockInfo =
                                      p.stock_actual !== undefined
                                        ? ` (Stock: ${p.stock_actual})`
                                        : '';
                                    const stockBajo = p.stock_actual <= p.stock_minimo ? '⚠️ ' : '';
                                    return `
                                  <option value="${p.id}" 
                                    data-precio="${p.precio_compra || 0}"
                                    data-stock="${p.stock_actual || 0}"
                                    data-codigo="${p.codigo || ''}"
                                    ${prod.producto_id === p.id ? 'selected' : ''}>
                                    ${stockBajo}${Utils.escapeHTML(p.nombre)}${stockInfo}
                                  </option>
                                  `;
                                  })
                                  .join('')}
                              </select>
                            </td>
                            <td>
                              <input type="number" class="form-control form-control-sm cantidad-input" 
                                name="productos[${idx}][cantidad]" value="${prod.cantidad}" min="1" step="1" required>
                            </td>
                            <td>
                              <input type="number" class="form-control form-control-sm precio-input" 
                                name="productos[${idx}][precio_unitario]" value="${prod.precio_unitario}" min="0" step="0.01" required>
                            </td>
                            <td>
                              <input type="text" class="form-control form-control-sm subtotal-display" readonly value="0.00">
                            </td>
                            <td>
                              <button type="button" class="btn btn-sm btn-danger" data-action="eliminar-producto">
                                <i class="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        `
                                )
                                .join('')
                            : '<tr><td colspan="5" class="text-center text-muted">No hay productos agregados</td></tr>'
                        }
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colspan="3" class="text-end"><strong>Total Estimado:</strong></td>
                          <td><strong id="totalEstimado">$0.00</strong></td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" data-action="guardar-pedido">
                <i class="fas fa-save"></i> Guardar
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      const bsModal = new bootstrap.Modal(modal);

      // Calcular totales
      const calcularTotales = () => {
        let total = 0;
        modal.querySelectorAll('#productosPedidoBody tr').forEach((row) => {
          const cantidad = parseFloat(row.querySelector('.cantidad-input')?.value || 0);
          const precio = parseFloat(row.querySelector('.precio-input')?.value || 0);
          const subtotal = cantidad * precio;
          const subtotalDisplay = row.querySelector('.subtotal-display');
          if (subtotalDisplay) {
            subtotalDisplay.value = subtotal.toFixed(2);
          }
          total += subtotal;
        });
        const totalElement = modal.querySelector('#totalEstimado');
        if (totalElement) {
          totalElement.textContent = Utils.formatCurrency(total);
        }
      };

      // Event listeners
      modal.addEventListener('input', (e) => {
        if (e.target.matches('.cantidad-input, .precio-input')) {
          calcularTotales();
        }
      });

      modal.addEventListener('change', (e) => {
        if (e.target.matches('.producto-select')) {
          const option = e.target.selectedOptions[0];
          const precio = option?.dataset.precio || 0;
          const stock = option?.dataset.stock || 0;
          const row = e.target.closest('tr');
          const precioInput = row?.querySelector('.precio-input');
          if (precioInput) {
            precioInput.value = precio;

            // Mostrar info de stock
            const cantidadInput = row?.querySelector('.cantidad-input');
            if (cantidadInput && stock) {
              cantidadInput.title = `Stock actual: ${stock} unidades`;
              cantidadInput.placeholder = `Máx: ${stock}`;
            }

            calcularTotales();
          }
        }
      });

      modal.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;

        if (action === 'agregar-producto') {
          const tbody = modal.querySelector('#productosPedidoBody');
          const index = tbody.querySelectorAll('tr').length;

          if (tbody.querySelector('td[colspan]')) {
            tbody.innerHTML = '';
          }

          const row = document.createElement('tr');
          row.dataset.index = index;
          row.innerHTML = `
            <td>
              <select class="form-select form-select-sm producto-select" name="productos[${index}][producto_id]" required>
                <option value="">Seleccionar...</option>
                ${productos
                  .map((p) => {
                    const stockInfo =
                      p.stock_actual !== undefined ? ` (Stock: ${p.stock_actual})` : '';
                    const stockBajo = p.stock_actual <= p.stock_minimo ? '⚠️ ' : '';
                    return `
                  <option value="${p.id}" data-precio="${p.precio_compra || 0}" data-stock="${p.stock_actual || 0}">
                    ${stockBajo}${Utils.escapeHTML(p.nombre)}${stockInfo}
                  </option>
                  `;
                  })
                  .join('')}
              </select>
            </td>
            <td>
              <input type="number" class="form-control form-control-sm cantidad-input" 
                name="productos[${index}][cantidad]" value="1" min="1" step="1" required>
            </td>
            <td>
              <input type="number" class="form-control form-control-sm precio-input" 
                name="productos[${index}][precio_unitario]" value="0" min="0" step="0.01" required>
            </td>
            <td>
              <input type="text" class="form-control form-control-sm subtotal-display" readonly value="0.00">
            </td>
            <td>
              <button type="button" class="btn btn-sm btn-danger" data-action="eliminar-producto">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          `;
          tbody.appendChild(row);
          calcularTotales();
        } else if (action === 'eliminar-producto') {
          const row = btn.closest('tr');
          row.remove();

          const tbody = modal.querySelector('#productosPedidoBody');
          if (tbody.querySelectorAll('tr').length === 0) {
            tbody.innerHTML =
              '<tr><td colspan="5" class="text-center text-muted">No hay productos agregados</td></tr>';
          }
          calcularTotales();
        } else if (action === 'guardar-pedido') {
          const form = modal.querySelector('#formPedidoRapido');
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const formData = new FormData(form);
          const productosArray = [];

          modal.querySelectorAll('#productosPedidoBody tr[data-index]').forEach((row) => {
            const productoSelect = row.querySelector('.producto-select');
            const cantidadInput = row.querySelector('.cantidad-input');
            const precioInput = row.querySelector('.precio-input');

            if (productoSelect && cantidadInput && precioInput && productoSelect.value) {
              productosArray.push({
                producto_id: parseInt(productoSelect.value),
                cantidad: parseFloat(cantidadInput.value),
                precio_unitario: parseFloat(precioInput.value),
              });
            }
          });

          if (productosArray.length === 0) {
            Utils.showToast('Debe agregar al menos un producto', 'warning');
            return;
          }

          const payload = {
            nombre: formData.get('nombre'),
            proveedor_id: formData.get('proveedor_id') || null,
            notas: formData.get('notas') || '',
            productos: productosArray,
          };

          try {
            if (pedidoId) {
              await this.requestBackend(`/pedidos-rapidos/${pedidoId}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
              });
              Utils.showToast('Plantilla actualizada', 'success');
            } else {
              await this.requestBackend('/pedidos-rapidos', {
                method: 'POST',
                body: JSON.stringify(payload),
              });
              Utils.showToast('Plantilla creada', 'success');
            }
            bsModal.hide();
            this.abrirPedidosRapidos();
          } catch (error) {
            console.error('Error guardando pedido rápido:', error);
            Utils.showToast('Error al guardar: ' + error.message, 'error');
          }
        }
      });

      modal.addEventListener('hidden.bs.modal', () => modal.remove());
      bsModal.show();

      calcularTotales();
    } catch (error) {
      console.error('Error en crearEditarPedidoRapido:', error);
      Utils.showToast('Error al cargar datos', 'error');
    }
  },

  /**
   * Usar pedido rápido para crear compra
   */
  async usarPedidoRapido(pedidoId) {
    try {
      await this.requestBackend(`/pedidos-rapidos/${pedidoId}/usar`, {
        method: 'POST',
      });

      const pedidos = await this.requestBackend('/pedidos-rapidos', { method: 'GET' });
      const pedido = pedidos.find((p) => p.id === parseInt(pedidoId));

      if (!pedido) {
        Utils.showToast('Pedido no encontrado', 'error');
        return;
      }

      // Resetear editor para nueva compra
      this.resetEditor('crear');

      // Esperar a que el editor se renderice
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Llenar datos del proveedor si existe
      if (pedido.proveedor_id && this.dom.editor) {
        const proveedorSelect = this.dom.editor.querySelector('[name="proveedorId"]');
        if (proveedorSelect) {
          proveedorSelect.value = pedido.proveedor_id;
          proveedorSelect.dispatchEvent(new Event('change'));
        }
      }

      // Agregar productos
      const productos = await this.requestBackend('/productos', { method: 'GET' });

      let productosAgregados = 0;
      let productosNoEncontrados = [];

      for (const item of pedido.productos) {
        const producto = productos.find((p) => p.id === item.producto_id);
        if (producto) {
          this.agregarFilaItemEditor({
            codigo: producto.sku || '',
            descripcion: producto.nombre,
            cantidad: item.cantidad,
            precioUnitario: item.precio_unitario,
            unidad: producto.unidad || 'unidad',
          });
          productosAgregados++;
        } else {
          productosNoEncontrados.push(item.producto_id);
        }
      }

      // Agregar nota sobre el origen
      if (this.dom.editor) {
        const notasInput = this.dom.editor.querySelector('[name="notas"]');
        if (notasInput) {
          notasInput.value = `Pedido desde plantilla: ${pedido.nombre}`;
        }
      }

      let mensaje = `Plantilla "${pedido.nombre}" cargada: ${productosAgregados} producto(s)`;
      if (productosNoEncontrados.length > 0) {
        mensaje += `. ${productosNoEncontrados.length} producto(s) no encontrado(s) en el catálogo.`;
        console.warn('Productos no encontrados:', productosNoEncontrados);
      }

      Utils.showToast(mensaje, productosNoEncontrados.length > 0 ? 'warning' : 'success');
    } catch (error) {
      console.error('Error usando pedido rápido:', error);
      Utils.showToast('Error al cargar pedido: ' + error.message, 'error');
    }
  },

  /**
   * Eliminar pedido rápido
   */
  async eliminarPedidoRapido(pedidoId) {
    try {
      await this.requestBackend(`/pedidos-rapidos/${pedidoId}`, {
        method: 'DELETE',
      });
      Utils.showToast('Plantilla eliminada', 'success');
    } catch (error) {
      console.error('Error eliminando pedido:', error);
      Utils.showToast('Error al eliminar: ' + error.message, 'error');
    }
  },
};

// Exportar el módulo
window.Compras = Compras;
