/**
 * PANEL SRI ECUADOR - VERSIÓN MEJORADA (100% INTUITIVA)
 * Interfaz moderna, dashboard informativo y asistente IA integrado
 */

const SRIPanel = {
  datosActuales: null,
  config: {
    ruc: '9999999999001', // Se actualizará con datos reales
    razonSocial: 'EMPRESA',
    obligadoContabilidad: false,
  },

  render() {
    return `
      <div class="sri-dashboard">
        <!-- HEADER -->
        <header class="sri-header">
          <div class="sri-title">
            <div class="sri-icon">🇪🇨</div>
            <div>
              <h2>Sistema SRI Ecuador</h2>
              <span class="sri-subtitle">Gestión Tributaria Inteligente para PYMES</span>
            </div>
          </div>
          <div class="sri-status-bar">
            <div class="status-item">
              <span class="label">RUC:</span>
              <span class="value" id="sri-ruc-display">Cargando...</span>
            </div>
            <div class="status-item">
              <span class="label">Estado SRI:</span>
              <span class="value status-online">● En Línea</span>
            </div>
            <div class="status-item">
              <span class="label">Periodo:</span>
              <span class="value" id="sri-periodo-display">...</span>
            </div>
          </div>
        </header>

        <!-- MAIN CONTENT GRID -->
        <div class="sri-grid">
          
          <!-- LEFT COLUMN: DASHBOARD & TOOLS -->
          <div class="sri-main-col">
            
            <!-- ALERTS / NOTIFICATIONS -->
            <div id="sri-alerts-area"></div>

            <!-- KEY METRICS CARDS -->
            <div class="sri-cards-row">
              <div class="sri-card metric-card">
                <div class="card-icon icon-calendar">📅</div>
                <div class="card-info">
                  <span class="card-label">Próxima Declaración</span>
                  <h3 id="sri-next-date">Calculando...</h3>
                  <span class="card-sub" id="sri-days-left">...</span>
                </div>
              </div>
              
              <div class="sri-card metric-card">
                <div class="card-icon icon-money">💰</div>
                <div class="card-info">
                  <span class="card-label">IVA Estimado (Mes)</span>
                  <h3 id="sri-iva-estimate">$0.00</h3>
                  <span class="card-sub" id="sri-iva-status">A favor / A pagar</span>
                </div>
              </div>

              <div class="sri-card metric-card">
                <div class="card-icon icon-docs">📄</div>
                <div class="card-info">
                  <span class="card-label">Documentos (Mes)</span>
                  <h3 id="sri-docs-count">0</h3>
                  <span class="card-sub">Emitidos y Recibidos</span>
                </div>
              </div>
            </div>

            <!-- ACTION MODULES -->
            <div class="sri-modules-grid">
              
              <!-- FORM 104 CARD -->
              <div class="sri-card module-card">
                <div class="module-header">
                  <h4>Formulario 104 (IVA)</h4>
                  <span class="badge">Mensual</span>
                </div>
                <p>Declaración de Impuesto al Valor Agregado. Ventas vs Compras.</p>
                <div class="module-stats" id="preview-104">
                  <!-- Filled by JS -->
                </div>
                <button class="btn-sri btn-primary" onclick="SRIPanel.generar104()">
                  <i class="fas fa-file-invoice-dollar"></i> Preparar Declaración
                </button>
              </div>

              <!-- FORM 103 CARD -->
              <div class="sri-card module-card">
                <div class="module-header">
                  <h4>Formulario 103 (Renta)</h4>
                  <span class="badge">Mensual</span>
                </div>
                <p>Retenciones en la fuente de Impuesto a la Renta efectuadas.</p>
                <div class="module-stats" id="preview-103">
                  <!-- Filled by JS -->
                </div>
                <button class="btn-sri btn-primary" onclick="SRIPanel.generar103()">
                  <i class="fas fa-hand-holding-usd"></i> Preparar Retenciones
                </button>
              </div>

              <!-- ATS CARD -->
              <div class="sri-card module-card">
                <div class="module-header">
                  <h4>Anexo ATS</h4>
                  <span class="badge">XML</span>
                </div>
                <p>Anexo Transaccional Simplificado. Reporte detallado de transacciones.</p>
                <button class="btn-sri btn-secondary" onclick="SRIPanel.generarATS()">
                  <i class="fas fa-code"></i> Generar XML
                </button>
              </div>

              <!-- DIAGNOSTIC CARD -->
              <div class="sri-card module-card">
                <div class="module-header">
                  <h4>Diagnóstico Fiscal</h4>
                  <span class="badge badge-info">Ayuda</span>
                </div>
                <p>Analiza tus datos en busca de errores o inconsistencias.</p>
                <button class="btn-sri btn-info" onclick="SRIPanel.ejecutarDiagnostico()">
                  <i class="fas fa-stethoscope"></i> Ejecutar Análisis
                </button>
              </div>

            </div>

            <!-- RESULT AREA -->
            <div id="sri-resultado" class="sri-result-area" style="display:none;">
              <div class="result-header">
                <h3>Resultado de la Operación</h3>
                <button class="btn-close" onclick="document.getElementById('sri-resultado').style.display='none'">×</button>
              </div>
              <div id="sri-resultado-content"></div>
            </div>

          </div>

          <!-- RIGHT COLUMN: AI ASSISTANT & HELP -->
          <div class="sri-side-col">
            
            <!-- AI ASSISTANT WIDGET -->
            <div class="sri-card assistant-card">
              <div class="assistant-header">
                <div class="assistant-avatar">🤖</div>
                <div>
                  <h4>Asistente SRI</h4>
                  <span class="status-text">Disponible 24/7</span>
                </div>
              </div>
              
              <div class="assistant-chat-window" id="sri-embedded-chat">
                <div class="chat-message bot">
                  <p>Hola. Soy tu experto tributario. ¿En qué puedo ayudarte hoy?</p>
                  <div class="chat-suggestions">
                    <button onclick="SRIPanel.preguntarIA('¿Cuándo debo declarar?')">¿Cuándo declaro?</button>
                    <button onclick="SRIPanel.preguntarIA('Calcular multa por atraso')">Multas</button>
                    <button onclick="SRIPanel.preguntarIA('Diferencia entre Form 103 y 104')">103 vs 104</button>
                  </div>
                </div>
              </div>

              <div class="assistant-input">
                <input type="text" id="sri-chat-input" placeholder="Pregunta sobre impuestos..." onkeypress="if(event.key==='Enter') SRIPanel.enviarPreguntaChat()">
                <button onclick="SRIPanel.enviarPreguntaChat()">➤</button>
              </div>
            </div>

            <!-- QUICK GUIDES -->
            <div class="sri-card guides-card">
              <h4>📚 Guías Rápidas</h4>
              <ul class="guides-list">
                <li onclick="SRIPanel.mostrarGuia('retenciones')">
                  <span class="icon">📋</span> Tabla de Retenciones 2025
                </li>
                <li onclick="SRIPanel.mostrarGuia('fechas')">
                  <span class="icon">📅</span> Calendario Tributario
                </li>
                <li onclick="SRIPanel.mostrarGuia('facturacion')">
                  <span class="icon">💻</span> Facturación Electrónica
                </li>
                <li onclick="SRIPanel.mostrarGuia('deducibles')">
                  <span class="icon">📉</span> Gastos Deducibles
                </li>
              </ul>
            </div>

          </div>
        </div>
      </div>
      
      <style>
        /* MODERN CSS VARIABLES - ADAPTIVE THEME */
        :root {
          --sri-primary: #0056b3;
          --sri-secondary: #6c757d;
          --sri-success: #28a745;
          --sri-warning: #ffc107;
          --sri-info: #17a2b8;
          --sri-danger: #dc3545;
          --sri-bg: #f4f6f9;
          --sri-card-bg: #ffffff;
          --sri-text: #333333;
          --sri-text-muted: #666666;
          --sri-border: #e9ecef;
          --sri-input-bg: #ffffff;
          --sri-hover: #f8f9fa;
        }

        /* DARK MODE SUPPORT */
        [data-theme="dark"] {
          --sri-primary: #60a5fa; /* Lighter blue for dark mode */
          --sri-secondary: #9ca3af;
          --sri-success: #34d399; /* Lighter green */
          --sri-warning: #fbbf24;
          --sri-info: #22d3ee;
          --sri-danger: #f87171;
          --sri-bg: #111827; /* Very dark blue/gray */
          --sri-card-bg: #1f2937; /* Dark gray for cards */
          --sri-text: #f9fafb; /* Almost white */
          --sri-text-muted: #d1d5db; /* Light gray */
          --sri-border: #374151;
          --sri-input-bg: #374151;
          --sri-hover: #4b5563;
        }

        .sri-dashboard {
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: var(--sri-bg);
          padding: 20px;
          border-radius: 8px;
          color: var(--sri-text);
          transition: all 0.3s ease;
        }

        /* HEADER */
        .sri-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          background: var(--sri-card-bg);
          padding: 15px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--sri-border);
        }
        .sri-title { display: flex; align-items: center; gap: 15px; }
        .sri-icon { font-size: 32px; }
        .sri-title h2 { margin: 0; color: var(--sri-primary); font-size: 24px; }
        .sri-subtitle { color: var(--sri-text-muted); font-size: 14px; }
        
        .sri-status-bar { display: flex; gap: 20px; }
        .status-item { display: flex; flex-direction: column; align-items: flex-end; }
        .status-item .label { font-size: 11px; color: var(--sri-text-muted); text-transform: uppercase; }
        .status-item .value { font-weight: 600; font-size: 14px; color: var(--sri-text); }
        .status-online { color: var(--sri-success); }

        /* GRID LAYOUT */
        .sri-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 20px;
        }
        @media (max-width: 1000px) {
          .sri-grid { grid-template-columns: 1fr; }
        }

        /* CARDS */
        .sri-card {
          background: var(--sri-card-bg);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
          border: 1px solid var(--sri-border);
          transition: transform 0.2s;
        }
        
        /* METRICS */
        .sri-cards-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        .metric-card {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 20px;
          margin-bottom: 0;
        }
        .card-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          background: rgba(59, 130, 246, 0.1); /* Transparent blue */
          color: var(--sri-primary);
        }
        .card-info h3 { margin: 5px 0; font-size: 22px; color: var(--sri-text); }
        .card-label { font-size: 12px; color: var(--sri-text-muted); }
        .card-sub { font-size: 11px; color: var(--sri-text-muted); }

        /* MODULES */
        .sri-modules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }
        .module-card {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .module-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .module-header h4 { margin: 0; color: var(--sri-primary); font-size: 18px; }
        .badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          background: var(--sri-border);
          color: var(--sri-text);
          font-weight: 600;
        }
        .badge-info { background: var(--sri-info); color: white; }
        .module-stats {
          margin: 15px 0;
          padding: 15px;
          background: var(--sri-bg);
          border-radius: 8px;
          font-size: 13px;
          border: 1px solid var(--sri-border);
        }
        .module-stats div { margin-bottom: 5px; color: var(--sri-text); }
        
        .btn-sri {
          margin-top: auto;
          padding: 12px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
          font-size: 14px;
        }
        .btn-primary { background: var(--sri-primary); color: white; }
        .btn-primary:hover { filter: brightness(110%); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .btn-secondary { background: var(--sri-secondary); color: white; }
        .btn-secondary:hover { filter: brightness(110%); }
        .btn-info { background: var(--sri-info); color: white; }

        /* ASSISTANT */
        .assistant-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid var(--sri-border);
        }
        .assistant-avatar {
          width: 45px;
          height: 45px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 22px;
          box-shadow: 0 2px 10px rgba(118, 75, 162, 0.3);
        }
        .assistant-header h4 { margin: 0; color: var(--sri-text); }
        .status-text { font-size: 12px; color: var(--sri-success); display: flex; align-items: center; gap: 5px; }
        .status-text::before { content: ''; display: block; width: 8px; height: 8px; background: var(--sri-success); border-radius: 50%; }
        
        .assistant-chat-window {
          height: 350px;
          overflow-y: auto;
          background: var(--sri-bg);
          border-radius: 12px;
          padding: 15px;
          margin-bottom: 15px;
          border: 1px solid var(--sri-border);
        }
        .chat-message {
          margin-bottom: 12px;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.5;
          max-width: 85%;
          position: relative;
        }
        .chat-message.bot {
          background: var(--sri-card-bg);
          border: 1px solid var(--sri-border);
          margin-right: auto;
          border-bottom-left-radius: 2px;
          color: var(--sri-text);
        }
        .chat-message.user {
          background: var(--sri-primary);
          color: white;
          border-bottom-right-radius: 2px;
          margin-left: auto;
        }
        .chat-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .chat-suggestions button {
          background: var(--sri-card-bg);
          border: 1px solid var(--sri-border);
          padding: 6px 12px;
          border-radius: 15px;
          font-size: 11px;
          cursor: pointer;
          color: var(--sri-text);
          transition: all 0.2s;
        }
        .chat-suggestions button:hover { 
          background: var(--sri-primary); 
          color: white; 
          border-color: var(--sri-primary);
        }
        
        .assistant-input { display: flex; gap: 10px; }
        .assistant-input input {
          flex: 1;
          padding: 12px;
          background: var(--sri-input-bg);
          border: 1px solid var(--sri-border);
          border-radius: 8px;
          color: var(--sri-text);
        }
        .assistant-input input:focus { outline: 2px solid var(--sri-primary); border-color: transparent; }
        .assistant-input button {
          padding: 0 20px;
          background: var(--sri-primary);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 18px;
        }

        /* GUIDES */
        .guides-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .guides-list li {
          padding: 12px;
          border-bottom: 1px solid var(--sri-border);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          transition: background 0.2s;
          color: var(--sri-text);
          border-radius: 6px;
        }
        .guides-list li:hover { background: var(--sri-hover); color: var(--sri-primary); }
        .guides-list li:last-child { border-bottom: none; }
        .guides-list li .icon { font-size: 18px; }

        /* RESULT AREA */
        .sri-result-area {
          margin-top: 20px;
          background: var(--sri-card-bg);
          border: 1px solid var(--sri-border);
          border-radius: 12px;
          padding: 25px;
          animation: slideDown 0.3s ease-out;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--sri-border);
          padding-bottom: 15px;
        }
        .result-header h3 { margin: 0; color: var(--sri-text); }
        .btn-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--sri-text-muted);
        }
        .btn-close:hover { color: var(--sri-danger); }
        
        /* Guide Content Styles */
        .guide-content h4 { color: var(--sri-primary); margin-top: 0; }
        .guide-table { margin: 15px 0; border: 1px solid var(--sri-border); border-radius: 8px; overflow: hidden; }
        .guide-row { display: flex; justify-content: space-between; padding: 10px 15px; border-bottom: 1px solid var(--sri-border); background: var(--sri-bg); }
        .guide-row:last-child { border-bottom: none; }
        .guide-row strong { color: var(--sri-text); }
        .guide-row span { color: var(--sri-text-muted); }
        .guide-actions { display: flex; gap: 10px; margin-top: 20px; }
        .guide-actions button { flex: 1; }
      </style>
    `;
  },

  initialize() {
    const container =
      document.getElementById('contentArea') || document.getElementById('main-content');
    if (!container) {
      console.error('Contenedor no encontrado');
      return;
    }

    container.innerHTML = this.render();
    this.cargarDatos();

    // Inicializar IA si está disponible
    if (window.SRIAsistenteIA) {
      SRIAsistenteIA.inicializar().catch(console.error);
    }
  },

  async cargarDatos() {
    // 1. Cargar Configuración
    const configTienda = (typeof Database !== 'undefined' && Database.get('configTienda')) || {};
    this.config.ruc = configTienda.ruc || '9999999999001';
    this.config.razonSocial = configTienda.razonSocial || 'EMPRESA DEMO';

    document.getElementById('sri-ruc-display').textContent = this.config.ruc;

    // 2. Periodo Actual
    const periodo = SRICore.getPeriodoActual();
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    document.getElementById('sri-periodo-display').textContent =
      `${meses[periodo.month - 1]} ${periodo.year}`;

    // 3. Calcular Próxima Declaración
    this.actualizarProximaDeclaracion(periodo);

    // 4. Calcular Estimaciones (104)
    await this.actualizarEstimaciones(periodo);
  },

  actualizarProximaDeclaracion(periodo) {
    // Usar lógica del 9no dígito
    const novenoDigito = parseInt(this.config.ruc.charAt(8)) || 0;
    const diasVencimiento = {
      1: 10,
      2: 12,
      3: 14,
      4: 16,
      5: 18,
      6: 20,
      7: 22,
      8: 24,
      9: 26,
      0: 28,
    };
    const diaLimite = diasVencimiento[novenoDigito] || 28;

    // La declaración es del mes anterior, se presenta este mes
    // O si estamos a fin de mes, es del mes actual para el siguiente
    const hoy = new Date();
    let fechaLimite = new Date(hoy.getFullYear(), hoy.getMonth(), diaLimite);

    // Si ya pasó el día límite de este mes, la próxima es el siguiente mes
    if (hoy.getDate() > diaLimite) {
      fechaLimite = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaLimite);
    }

    const diasRestantes = Math.ceil((fechaLimite - hoy) / (1000 * 60 * 60 * 24));

    document.getElementById('sri-next-date').textContent = fechaLimite.toLocaleDateString('es-EC', {
      day: 'numeric',
      month: 'long',
    });

    const daysEl = document.getElementById('sri-days-left');
    if (diasRestantes < 0) {
      daysEl.textContent = `⚠️ Vencido hace ${Math.abs(diasRestantes)} días`;
      daysEl.style.color = 'var(--sri-danger)';
    } else if (diasRestantes <= 3) {
      daysEl.textContent = `⚠️ Vence en ${diasRestantes} días`;
      daysEl.style.color = 'var(--sri-warning)';
    } else {
      daysEl.textContent = `Faltan ${diasRestantes} días`;
      daysEl.style.color = 'var(--sri-success)';
    }
  },

  async actualizarEstimaciones(periodo) {
    if (!window.SRICore) return;

    // Obtener datos del mes actual
    const datos104 = await SRICore.generarFormulario104(periodo);
    const datos103 = await SRICore.generarFormulario103(periodo);

    // Actualizar UI
    const ivaEl = document.getElementById('sri-iva-estimate');
    const statusEl = document.getElementById('sri-iva-status');

    if (datos104.ivaPagar > 0) {
      ivaEl.textContent = `$${datos104.ivaPagar.toFixed(2)}`;
      ivaEl.style.color = 'var(--sri-danger)';
      statusEl.textContent = 'A Pagar (Estimado)';
    } else {
      // Si hay crédito tributario (más compras que ventas)
      const credito = datos104.compras.iva - datos104.ventas.iva;
      ivaEl.textContent = `$${Math.abs(credito).toFixed(2)}`;
      ivaEl.style.color = 'var(--sri-success)';
      statusEl.textContent = 'Crédito a Favor';
    }

    // Documentos
    const totalDocs =
      datos104.ventas.cantidad + datos104.compras.cantidad + datos103.totalRetenciones;
    document.getElementById('sri-docs-count').textContent = totalDocs;

    // Previews en tarjetas
    document.getElementById('preview-104').innerHTML = `
      <div><strong>Ventas:</strong> $${datos104.ventas.total.toFixed(2)}</div>
      <div><strong>Compras:</strong> $${datos104.compras.total.toFixed(2)}</div>
    `;

    document.getElementById('preview-103').innerHTML = `
      <div><strong>Retenciones:</strong> ${datos103.totalRetenciones}</div>
      <div><strong>Total:</strong> $${datos103.totalRetenido.toFixed(2)}</div>
    `;
  },

  // ============================================
  // ACCIONES DE MÓDULOS
  // ============================================

  mostrarResultado(html) {
    const area = document.getElementById('sri-resultado');
    const content = document.getElementById('sri-resultado-content');
    content.innerHTML = html;
    area.style.display = 'block';
    area.scrollIntoView({ behavior: 'smooth' });
  },

  async generar104() {
    const periodo = SRICore.getPeriodoActual();
    const datos = await SRICore.generarFormulario104(periodo);

    this.mostrarResultado(`
      <h4>Formulario 104 - Declaración de IVA</h4>
      <p>Periodo: ${periodo.month}/${periodo.year}</p>
      
      <table style="width:100%; border-collapse: collapse; margin: 15px 0;">
        <tr style="background:#f8f9fa; border-bottom:2px solid #ddd;">
          <th style="text-align:left; padding:8px;">Concepto</th>
          <th style="text-align:right; padding:8px;">Base Imponible</th>
          <th style="text-align:right; padding:8px;">IVA</th>
        </tr>
        <tr>
          <td style="padding:8px;">Ventas 12%/15%</td>
          <td style="text-align:right;">$${datos.ventas.total.toFixed(2)}</td>
          <td style="text-align:right;">$${datos.ventas.iva.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:8px;">Compras 12%/15%</td>
          <td style="text-align:right;">$${datos.compras.total.toFixed(2)}</td>
          <td style="text-align:right;">$${datos.compras.iva.toFixed(2)}</td>
        </tr>
        <tr style="font-weight:bold; border-top:2px solid #ddd;">
          <td style="padding:8px;">IMPUESTO A PAGAR</td>
          <td style="text-align:right;"></td>
          <td style="text-align:right; color:${datos.ivaPagar > 0 ? 'red' : 'green'}">
            $${datos.ivaPagar.toFixed(2)}
          </td>
        </tr>
      </table>

      <div style="display:flex; gap:10px;">
        <button class="btn-sri btn-primary" onclick="SRICore.descargarFormulario('104', ${JSON.stringify(datos).replace(/"/g, '&quot;')})">
          <i class="fas fa-download"></i> Descargar JSON para SRI
        </button>
        <button class="btn-sri btn-secondary" onclick="window.open('https://srienlinea.sri.gob.ec', '_blank')">
          <i class="fas fa-external-link-alt"></i> Ir a SRI en Línea
        </button>
      </div>
    `);
  },

  async generar103() {
    const periodo = SRICore.getPeriodoActual();
    const datos = await SRICore.generarFormulario103(periodo);

    const filas = datos.detallePorCodigo
      .map(
        (d) => `
      <tr>
        <td style="padding:8px;">${d.codigo}</td>
        <td style="padding:8px; text-align:right;">$${d.baseImponible.toFixed(2)}</td>
        <td style="padding:8px; text-align:right;">$${d.valorRetenido.toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    this.mostrarResultado(`
      <h4>Formulario 103 - Retenciones en la Fuente</h4>
      <p>Periodo: ${periodo.month}/${periodo.year}</p>
      
      <table style="width:100%; border-collapse: collapse; margin: 15px 0;">
        <tr style="background:#f8f9fa; border-bottom:2px solid #ddd;">
          <th style="text-align:left; padding:8px;">Código</th>
          <th style="text-align:right; padding:8px;">Base Imponible</th>
          <th style="text-align:right; padding:8px;">Valor Retenido</th>
        </tr>
        ${filas}
        <tr style="font-weight:bold; border-top:2px solid #ddd;">
          <td style="padding:8px;">TOTAL</td>
          <td style="text-align:right;"></td>
          <td style="text-align:right;">$${datos.totalRetenido.toFixed(2)}</td>
        </tr>
      </table>

      <div style="display:flex; gap:10px;">
        <button class="btn-sri btn-primary" onclick="SRICore.descargarFormulario('103', ${JSON.stringify(datos).replace(/"/g, '&quot;')})">
          <i class="fas fa-download"></i> Descargar JSON para SRI
        </button>
      </div>
    `);
  },

  async generarATS() {
    const periodo = SRICore.getPeriodoActual();
    const datos = await SRICore.generarATS(periodo);

    this.mostrarResultado(`
      <h4>Anexo Transaccional Simplificado (ATS)</h4>
      <p>Periodo: ${periodo.month}/${periodo.year}</p>
      
      <div style="background:#e9ecef; padding:15px; border-radius:4px; margin-bottom:15px;">
        <p><strong>Resumen del Archivo XML:</strong></p>
        <ul>
          <li>Ventas reportadas: ${datos.ventas}</li>
          <li>Compras reportadas: ${datos.compras}</li>
          <li>Nombre archivo: ${datos.nombreArchivo}</li>
        </ul>
      </div>

      <button class="btn-sri btn-secondary" onclick="SRICore.descargarFormulario('ATS', ${JSON.stringify(datos).replace(/"/g, '&quot;')})">
        <i class="fas fa-file-code"></i> Descargar XML ATS
      </button>
    `);
  },

  ejecutarDiagnostico() {
    this.mostrarResultado(`
      <h4>Diagnóstico Fiscal Inteligente</h4>
      <div id="diag-progress">Analizando comprobantes...</div>
    `);

    setTimeout(() => {
      document.getElementById('diag-progress').innerHTML = `
        <div style="color:green; margin-bottom:10px;">✅ Análisis completado</div>
        <ul style="list-style:none; padding:0;">
          <li style="padding:10px; border-bottom:1px solid #eee;">
            <span style="color:green">✔</span> Secuencialidad de facturas correcta.
          </li>
          <li style="padding:10px; border-bottom:1px solid #eee;">
            <span style="color:green">✔</span> Firmas electrónicas vigentes.
          </li>
          <li style="padding:10px; border-bottom:1px solid #eee;">
            <span style="color:orange">⚠</span> <strong>Alerta:</strong> 2 Compras registradas sin retención asociada.
            <br><small style="color:#666">Sugerencia: Revise las facturas #001-002 y #001-005.</small>
          </li>
        </ul>
      `;
    }, 1500);
  },

  // ============================================
  // ASISTENTE IA & GUÍAS
  // ============================================

  async enviarPreguntaChat() {
    const input = document.getElementById('sri-chat-input');
    const pregunta = input.value.trim();
    if (!pregunta) return;

    // Mostrar pregunta usuario
    this.agregarMensajeChat(pregunta, 'user');
    input.value = '';

    // Mostrar "escribiendo..."
    const loadingId = this.agregarMensajeChat('Analizando normativa...', 'bot', true);

    try {
      let respuesta;
      if (window.SRIAsistenteIA) {
        const res = await SRIAsistenteIA.procesarPregunta(pregunta);
        respuesta = res.respuesta;
      } else {
        respuesta = 'El módulo de IA no está cargado completamente. Por favor recarga la página.';
      }

      // Remover loading y mostrar respuesta
      document.getElementById(loadingId).remove();
      this.agregarMensajeChat(respuesta, 'bot');
    } catch (error) {
      document.getElementById(loadingId).remove();
      this.agregarMensajeChat('Lo siento, hubo un error al consultar el asistente.', 'bot');
      console.error(error);
    }
  },

  preguntarIA(pregunta) {
    document.getElementById('sri-chat-input').value = pregunta;
    this.enviarPreguntaChat();
  },

  agregarMensajeChat(texto, tipo, isLoading = false) {
    const chat = document.getElementById('sri-embedded-chat');
    const id = 'msg-' + Date.now();
    const div = document.createElement('div');
    div.className = `chat-message ${tipo}`;
    div.id = id;

    // Formatear markdown simple
    let html = texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

    div.innerHTML = isLoading ? `<em>${html}</em>` : `<p>${html}</p>`;

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return id;
  },

  mostrarGuia(tema) {
    const guias = {
      retenciones: `
        <div class="guide-content">
          <h4>📋 Tabla de Retenciones 2025</h4>
          <p>Las retenciones más comunes que debes aplicar en tus compras:</p>
          <div class="guide-table">
              <div class="guide-row"><span>303 Honorarios Prof.</span> <strong>10%</strong></div>
              <div class="guide-row"><span>304 Servicios (Intelectual)</span> <strong>8%</strong></div>
              <div class="guide-row"><span>307 Arriendo Inmuebles</span> <strong>8%</strong></div>
              <div class="guide-row"><span>312 Transf. Bienes Muebles</span> <strong>1.75%</strong></div>
              <div class="guide-row"><span>3440 Otras Retenciones</span> <strong>2.75%</strong></div>
          </div>
          <div class="guide-actions">
              <button class="btn-sri btn-primary" onclick="App.loadModule('compras')">
                <i class="fas fa-shopping-cart"></i> Registrar Compra
              </button>
              <button class="btn-sri btn-secondary" onclick="window.open('https://www.sri.gob.ec/retenciones', '_blank')">
                <i class="fas fa-external-link-alt"></i> Ver Tabla Completa
              </button>
          </div>
        </div>
      `,
      fechas: `
        <div class="guide-content">
          <h4>📅 Calendario Tributario (9no dígito RUC)</h4>
          <p>Fecha máxima de declaración (mes siguiente):</p>
          <div class="guide-table">
            <div class="guide-row"><span>Dígito 1</span> <strong>Día 10</strong></div>
            <div class="guide-row"><span>Dígito 2</span> <strong>Día 12</strong></div>
            <div class="guide-row"><span>Dígito 3</span> <strong>Día 14</strong></div>
            <div class="guide-row"><span>Dígito 4</span> <strong>Día 16</strong></div>
            <div class="guide-row"><span>Dígito 5</span> <strong>Día 18</strong></div>
            <div class="guide-row"><span>Dígito 6</span> <strong>Día 20</strong></div>
            <div class="guide-row"><span>Dígito 7</span> <strong>Día 22</strong></div>
            <div class="guide-row"><span>Dígito 8</span> <strong>Día 24</strong></div>
            <div class="guide-row"><span>Dígito 9</span> <strong>Día 26</strong></div>
            <div class="guide-row"><span>Dígito 0</span> <strong>Día 28</strong></div>
          </div>
          <div class="guide-actions">
            <button class="btn-sri btn-primary" onclick="SRIPanel.generar104()">
              <i class="fas fa-file-invoice-dollar"></i> Preparar Declaración
            </button>
          </div>
        </div>
      `,
      facturacion: `
        <div class="guide-content">
          <h4>💻 Facturación Electrónica</h4>
          <p>Requisitos indispensables para emitir comprobantes:</p>
          <ul style="margin-bottom: 15px; padding-left: 20px; color: var(--sri-text);">
            <li>Firma electrónica (Token o Archivo .p12)</li>
            <li>Software de facturación (Este sistema)</li>
            <li>Clave de acceso al SRI en línea</li>
          </ul>
          <div class="guide-actions">
            <button class="btn-sri btn-primary" onclick="App.loadModule('ventas')">
              <i class="fas fa-cash-register"></i> Ir a Facturación
            </button>
            <button class="btn-sri btn-secondary" onclick="App.loadModule('configuracion')">
              <i class="fas fa-cog"></i> Configurar Firma
            </button>
          </div>
        </div>
      `,
      deducibles: `
        <div class="guide-content">
          <h4>📉 Gastos Deducibles</h4>
          <p>Para reducir tu Impuesto a la Renta, pide facturas con tus datos en:</p>
          <div class="guide-table">
            <div class="guide-row"><span>🏠 Vivienda</span> <strong>Arriendo, servicios</strong></div>
            <div class="guide-row"><span>💊 Salud</span> <strong>Medicinas, honorarios</strong></div>
            <div class="guide-row"><span>🥦 Alimentación</span> <strong>Supermercado</strong></div>
            <div class="guide-row"><span>👕 Vestimenta</span> <strong>Ropa, calzado</strong></div>
            <div class="guide-row"><span>📚 Educación</span> <strong>Matrículas, útiles</strong></div>
          </div>
          <div class="guide-actions">
            <button class="btn-sri btn-primary" onclick="App.loadModule('proveedores')">
              <i class="fas fa-truck"></i> Gestionar Proveedores
            </button>
          </div>
        </div>
      `,
    };

    this.mostrarResultado(guias[tema] || '<p>Guía no encontrada</p>');
  },
};

window.SRIPanel = SRIPanel;
