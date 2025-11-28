// ============================================
// ASISTENTE CHATBOT FLOTANTE - IA
// ============================================
// Chatbot inteligente que ayuda con marketing, ventas y uso del programa

window.ChatAssistant = {
  // Configuración del asistente
  isOpen: false,
  conversationHistory: [],
  currentContext: 'general', // 'marketing' o 'general'

  // Información del negocio y contexto
  businessContext: null,
  storagePrefix: 'chatAssistant',

  getStorageKey(key) {
    return `${this.storagePrefix}_${key}`;
  },

  getStoredValue(key, fallback = null) {
    const storageKey = this.getStorageKey(key);
    try {
      if (window.TenantStorage && typeof TenantStorage.getJSON === 'function') {
        const value = TenantStorage.getJSON(storageKey, null);
        return value !== null && value !== undefined ? value : fallback;
      }

      const raw = window.localStorage ? window.localStorage.getItem(storageKey) : null;
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn('[ChatAssistant] Error leyendo almacenamiento', storageKey, error);
      return fallback;
    }
  },

  setStoredValue(key, value) {
    const storageKey = this.getStorageKey(key);
    try {
      if (value === null || value === undefined) {
        this.removeStoredValue(key);
        return;
      }

      if (window.TenantStorage && typeof TenantStorage.setJSON === 'function') {
        TenantStorage.setJSON(storageKey, value);
      } else if (window.localStorage) {
        window.localStorage.setItem(storageKey, JSON.stringify(value));
      }
    } catch (error) {
      console.warn('[ChatAssistant] Error guardando almacenamiento', storageKey, error);
    }
  },

  removeStoredValue(key) {
    const storageKey = this.getStorageKey(key);
    try {
      if (window.TenantStorage && typeof TenantStorage.removeItem === 'function') {
        TenantStorage.removeItem(storageKey);
      } else if (window.localStorage) {
        window.localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn('[ChatAssistant] Error eliminando almacenamiento', storageKey, error);
    }
  },

  getLegacyWelcomeHTML(context = 'general') {
    if (context === 'marketing') {
      return `
        <div class="chat-welcome">
          <div class="welcome-icon">
            <i class="fas fa-lightbulb"></i>
          </div>
          <h3>¡Hola! 👋</h3>
          <p>Soy tu asistente de Marketing.</p>
          <p>¿Qué estrategia necesitas?</p>
          <div class="chat-quick-actions">
            <button class="quick-btn" data-action="quick-question" data-question="Ideas para promociones">
              <i class="fas fa-tags"></i> Promociones
            </button>
            <button class="quick-btn" data-action="quick-question" data-question="Contenido para redes sociales">
              <i class="fas fa-share-alt"></i> Redes sociales
            </button>
            <button class="quick-btn" data-action="quick-question" data-question="Estrategia para atraer clientes">
              <i class="fas fa-bullseye"></i> Atraer clientes
            </button>
          </div>
        </div>`;
    }

    return `
      <div class="chat-welcome">
        <div class="welcome-icon">
          <i class="fas fa-comments"></i>
        </div>
        <h3>¡Hola! 👋</h3>
        <p>Soy tu asistente de Ayuda General.</p>
        <p>Puedo guiarte paso a paso en el sistema.</p>
        <div class="chat-quick-actions">
          <button class="quick-btn" data-action="quick-question" data-question="¿Cómo registro un cliente nuevo?">
            <i class="fas fa-user-plus"></i> Registrar cliente
          </button>
          <button class="quick-btn" data-action="quick-question" data-question="¿Cómo creo una venta rápida?">
            <i class="fas fa-cash-register"></i> Crear venta
          </button>
          <button class="quick-btn" data-action="quick-question" data-question="¿Cómo registro un vehículo y una orden de taller?">
            <i class="fas fa-tools"></i> Orden taller
          </button>
          <button class="quick-btn" data-action="quick-question" data-question="¿Cómo programo una cita en la agenda?">
            <i class="fas fa-calendar-check"></i> Agendar cita
          </button>
          <button class="quick-btn" data-action="quick-question" data-question="¿Cómo agrego productos y actualizo el stock?">
            <i class="fas fa-box"></i> Inventario
          </button>
          <button class="quick-btn" data-action="quick-question" data-question="¿Cómo reviso reportes y exporto información?">
            <i class="fas fa-chart-line"></i> Reportes
          </button>
          <button class="quick-btn" data-action="quick-question" data-question="¿Cómo configuro los datos del negocio y realizo backups?">
            <i class="fas fa-cog"></i> Configuración
          </button>
        </div>
      </div>`;
  },

  // ============================================
  // INICIALIZAR CHATBOT
  // ============================================
  init() {
    // Obtener configuración del negocio
    this.loadBusinessContext();

    // NO crear botón flotante - ahora se usa el selector unificado
    // El AgendaIAAgent maneja el botón principal

    // Crear interfaz de chat
    this.createChatInterface();

    // Cargar historial de conversación
    this.loadConversationHistory();

    console.log('✅ ChatAssistant inicializado (sin botón flotante - usa selector unificado)');
  },

  // Cargar contexto del negocio desde la base de datos
  loadBusinessContext() {
    const config = Database.get('configuracion') || {};
    const productos = Database.getCollection('productos') || [];
    const categorias = Database.getCollection('categorias') || [];
    const ventas = Database.getCollection('ventas') || [];

    this.businessContext = {
      nombre: config.nombreNegocio || 'Mi Tienda',
      tipo: config.tipoNegocio || 'Tienda general',
      ruc: config.ruc || 'No especificado',
      telefono: config.telefono || 'No especificado',
      email: config.email || 'No especificado',
      direccion: config.direccion || 'No especificada',
      moneda: config.moneda || 'USD',
      productosTotal: Array.isArray(productos) ? productos.length : 0,
      categoriasTotal: Array.isArray(categorias) ? categorias.length : 0,
      ventasTotal: Array.isArray(ventas) ? ventas.length : 0,
      categorias: Array.isArray(categorias)
        ? categorias.map((c) => c.nombre || c).join(', ')
        : 'Sin categorías',
    };
  },

  // ============================================
  // CREAR INTERFAZ DE CHAT
  // ============================================
  createChatInterface() {
    // Verificar si ya existe
    if (document.getElementById('chatAssistantWindow')) return;

    const chatWindow = document.createElement('div');
    chatWindow.id = 'chatAssistantWindow';
    chatWindow.className = 'chat-assistant-window';
    chatWindow.style.display = 'none';

    chatWindow.innerHTML = `
      <div class="chat-assistant-header">
        <div class="chat-header-info">
          <div class="chat-avatar">
            <i class="fas fa-robot"></i>
          </div>
          <div>
            <h4 id="chatAssistantTitle">Asistente IA</h4>
            <p class="chat-status">
              <span class="status-dot"></span>
              En línea
            </p>
          </div>
        </div>
        <div class="chat-header-actions">
          <button class="btn-icon" data-action="clear-chat" title="Nueva conversación">
            <i class="fas fa-redo"></i>
          </button>
          <button class="btn-icon" data-action="close-chat" title="Cerrar">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <div class="chat-assistant-body" id="chatAssistantBody">
        ${this.getLegacyWelcomeHTML('general')}
      </div>
      
      <div class="chat-assistant-footer">
        <div class="chat-input-container">
          <textarea 
            id="chatAssistantInput" 
            class="chat-input" 
            placeholder="Escribe tu pregunta..."
            rows="1"
          ></textarea>
          <button class="btn-send" data-action="send-message">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(chatWindow);

    // Event delegation para todos los botones del chat
    chatWindow.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');

      switch (action) {
        case 'clear-chat':
          this.clearChat();
          break;
        case 'close-chat':
          this.closeChat();
          break;
        case 'send-message':
          this.sendMessage();
          break;
        case 'quick-question':
          const question = btn.getAttribute('data-question');
          if (question) this.quickQuestion(question);
          break;
      }
    });

    // Configurar auto-resize del textarea
    const textarea = document.getElementById('chatAssistantInput');
    textarea.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });

    // Permitir enviar con Enter
    textarea.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        ChatAssistant.sendMessage();
      }
    });

    // Agregar estilos
    this.addStyles();
  },

  // ============================================
  // ABRIR/CERRAR CHAT
  // ============================================
  openChat(context = 'general') {
    console.log(`💬 [ChatAssistant] Abriendo chat con contexto: ${context}`);
    this.isOpen = true;
    this.currentContext = context;

    const chatWindow = document.getElementById('chatAssistantWindow');
    if (chatWindow) {
      chatWindow.style.display = 'flex';

      // Actualizar título según contexto
      const title = document.getElementById('chatAssistantTitle');
      if (title) {
        title.textContent = context === 'marketing' ? 'Asistente de Marketing' : 'Ayuda General';
      }

      // Focus en el input
      const input = document.getElementById('chatAssistantInput');
      if (input) {
        setTimeout(() => input.focus(), 100);
      }

      const chatBody = document.getElementById('chatAssistantBody');
      if (chatBody && chatBody.childElementCount === 1) {
        const first = chatBody.firstElementChild;
        if (first && first.classList.contains('chat-welcome')) {
          chatBody.innerHTML = this.getLegacyWelcomeHTML(context);
        }
      }
    }
  },

  openWhatsAppChat(context = 'general') {
    console.log(`💬 [ChatAssistant] Abriendo chat WhatsApp con contexto: ${context}`);
    this.isOpen = true;
    this.currentContext = context;

    // CERRAR OTROS CHATS PRIMERO
    const chatCitas = document.getElementById('whatsappChatContainer');
    if (chatCitas) {
      chatCitas.style.display = 'none';
      console.log('❌ Chat de citas cerrado');
    }

    const chatLegacy = document.getElementById('chatAssistantWindow');
    if (chatLegacy) {
      chatLegacy.style.display = 'none';
      console.log('❌ Chat legacy cerrado');
    }

    // Crear o mostrar chat WhatsApp estilo para marketing/ayuda
    let chatContainer = document.getElementById('whatsappChatAssistant');

    if (!chatContainer) {
      chatContainer = this.createWhatsAppChatInterface(context);
    }

    // Actualizar contexto del chat
    this.updateWhatsAppChatContext(context);

    chatContainer.style.display = 'flex';

    // Actualizar mensaje de bienvenida si el chat está vacío
    const chatBody = document.getElementById('whatsappAssistantBody');
    if (chatBody) {
      const shouldReset =
        chatBody.childElementCount === 0 || chatBody.querySelector('.chat-welcome');
      if (shouldReset) {
        chatBody.innerHTML = this.getWelcomeMessage(context);
      }
    }

    // Focus en input
    setTimeout(() => {
      const input = document.getElementById('whatsappAssistantInput');
      if (input) input.focus();
    }, 300);

    console.log(`✅ Chat WhatsApp ${context} abierto`);
  },

  closeChat() {
    console.log('❌ [ChatAssistant] Cerrando chat');
    this.isOpen = false;

    const chatWindow = document.getElementById('chatAssistantWindow');
    if (chatWindow) {
      chatWindow.style.display = 'none';
    }
  },

  // ============================================
  // LIMPIAR CHAT
  // ============================================
  clearChat() {
    console.log('🗑️ [ChatAssistant] Limpiando conversación');
    this.conversationHistory = [];
    this.removeStoredValue('history');

    const chatBody = document.getElementById('chatAssistantBody');
    if (chatBody) {
      chatBody.innerHTML = this.getLegacyWelcomeHTML(this.currentContext);
    }
  },

  // ============================================
  // PREGUNTA RÁPIDA
  // ============================================
  quickQuestion(question) {
    const input = document.getElementById('chatAssistantInput');
    if (input) {
      input.value = question;
      this.sendMessage();
    }
  },

  // ============================================
  // ENVIAR MENSAJE
  // ============================================
  async sendMessage() {
    const input = document.getElementById('chatAssistantInput');
    const message = input.value.trim();

    if (!message) return;

    // Limpiar input
    input.value = '';
    input.style.height = 'auto';

    // Agregar mensaje del usuario
    this.addMessage(message, 'user');

    // Mostrar indicador de escritura
    this.showTypingIndicator();

    try {
      // Obtener respuesta de IA
      const response = await this.getAIResponse(message);

      // Quitar indicador de escritura
      this.hideTypingIndicator();

      // Agregar respuesta del bot
      this.addMessage(response, 'bot');

      // Guardar en historial
      this.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      );
      this.saveConversationHistory();
    } catch (error) {
      console.error('❌ Error al obtener respuesta:', error);
      this.hideTypingIndicator();
      this.addMessage('Lo siento, hubo un error. Por favor intenta de nuevo.', 'bot');
    }
  },

  // ============================================
  // OBTENER RESPUESTA DE IA
  // ============================================
  async getAIResponse(userMessage) {
    console.log('🤖 [ChatAssistant] Obteniendo respuesta IA...');

    // Verificar que el motor unificado esté disponible
    if (!window.IAUnifiedEngine) {
      console.error('❌ IAUnifiedEngine no disponible');
      return 'Lo siento, el sistema de IA no está configurado correctamente.';
    }
    if (typeof IAUnifiedEngine.isConfigured === 'function' && !IAUnifiedEngine.isConfigured()) {
      console.warn('⚠️ IAUnifiedEngine no tiene una API Key configurada');
      return 'Activa la IA en Configuración → Inteligencia Artificial e ingresa tu API Key para continuar.';
    }

    // Construir system prompt según contexto
    const ctx = this.businessContext;
    const systemPrompt =
      this.currentContext === 'marketing'
        ? this.getMarketingPrompt(ctx)
        : this.getGeneralHelpPrompt(ctx);

    try {
      const response = await IAUnifiedEngine.sendMessage(
        userMessage,
        systemPrompt,
        this.currentContext
      );

      return response;
    } catch (error) {
      console.error('❌ Error en getAIResponse:', error);
      throw error;
    }
  },

  // ============================================
  // PROMPTS DEL SISTEMA
  // ============================================
  getMarketingPrompt(ctx) {
    return `Eres un experto en marketing y ventas para talleres mecánicos y negocios automotrices.
       
Contexto del negocio:
- Nombre: ${ctx.nombre}
- Tipo: ${ctx.tipo}
- Productos: ${ctx.productosTotal}
- Categorías: ${ctx.categorias}
       
Proporciona:
- Ideas de marketing creativas y efectivas
- Estrategias para aumentar ventas
- Consejos para redes sociales y publicidad
- Copywriting profesional cuando se solicite
- Análisis de competencia
       
Usa un tono cordial y directo, con respuestas resumidas (máximo 4 frases) en español.`;
  },

  getGeneralHelpPrompt(ctx) {
    return `Eres el Asistente de Ayuda IA para "Gestor Tienda Pro". Debes guiar al usuario con instrucciones claras, ordenadas y accionables.

Datos del negocio:
- Nombre: ${ctx.nombre}
- Tipo: ${ctx.tipo}
- Productos registrados: ${ctx.productosTotal}
- Categorías: ${ctx.categorias}

=== MAPA RÁPIDO DEL SISTEMA (menú lateral) ===
VENTAS Y CAJA:
- "Facturación y Ventas" → crear ventas y emitir comprobantes.
- "Historial de Ventas" → consultar ventas previas y reenviar facturas.

TALLER Y SERVICIOS:
- "Órdenes de Trabajo" → gestionar reparaciones y mano de obra.
- "Vehículos" → registrar placas, marca, modelo y vincular propietarios.
- "Agenda" → programar citas y asignar técnicos.
- "Mis Tareas" y "Catálogo Técnico" → seguimiento de tareas y fichas técnicas.

INVENTARIO Y COMPRAS:
- "Productos" → altas/ediciones de productos y control de stock.
- "Compras" → ingreso de compras a proveedores y actualización masiva de inventario.

CONTACTOS Y CRM:
- "Clientes" y "Proveedores" → fichas completas con RUC/Cédula, teléfonos y observaciones.
- "Recordatorios" → comunicaciones programadas para clientes.

FINANZAS Y REPORTES:
- "Análisis Financiero" y "Estadísticas" → dashboards con KPIs.
- "Contabilidad", "Cuentas por Cobrar/Pagar" → ingresos, egresos y deudas.

MARKETING Y COMUNICACIONES:
- "Marketing IA" y "Publicidad" → campañas creadas con IA.
- "Telegram/WhatsApp" → notificaciones inteligentes.

SISTEMA Y SEGURIDAD:
- "Configuración" → datos del negocio, impuestos, moneda y roles.
- "Backup & Datos" → copias de seguridad y restauración.
- "Gestor Central" → herramientas avanzadas (solo administradores).

=== GUÍAS EXPRESS QUE DEBES ENTREGAR ===
Registrar cliente:
1. Clientes → "➕ Nuevo Cliente" (esquina superior derecha).
2. Completar Nombre, Cédula/RUC, Teléfono, Email, Dirección.
3. Guardar con "💾". Opcional: asignar vehículo desde la pestaña Vehículos.

Crear venta completa:
1. Facturación y Ventas.
2. Elegir cliente, agregar productos (buscador + cantidad).
3. Revisar totales/impuestos, seleccionar método de pago.
4. Finalizar con "💾 Finalizar Venta" e imprimir/WhatsApp si lo solicitan.

Crear orden de trabajo:
1. Órdenes de Trabajo → "➕ Nueva OT".
2. Seleccionar cliente y vehículo (usa "Registrar vehículo" si falta).
3. Describir servicio, asignar técnico y fechas.
4. Guardar; puedes adjuntar piezas desde Inventario.

Agendar cita taller:
1. Agenda → clic en día/hora.
2. Completar Cliente, Vehículo, Servicio, Técnico y duración.
3. Guardar y confirmar; la cita aparecerá en Agenda y Mis Tareas.

Agregar producto/stock:
1. Productos → "➕ Nuevo Producto" o seleccionar existente.
2. Capturar Código, Categoría, Precio, IVA, Stock mínimo.
3. Guardar; si viene de compra, usa Compras → "Registrar compra" para actualizar stock automáticamente.

Backup rápido:
1. Backup & Datos → pestaña Respaldo.
2. "💾 Crear Backup Manual" y descargar el archivo.

Configurar datos del negocio:
1. Configuración → Datos del Negocio.
2. Editar nombre comercial, RUC, dirección, teléfonos, moneda e impuestos.
3. Guardar y verificar permisos/roles si aplica.

=== ESTILO DE RESPUESTA ===
1. Identifica el módulo adecuado y menciona la ruta exacta en el menú.
2. Entrega pasos numerados, máximo 6 líneas totales por respuesta.
3. Resalta botones con comillas y emojis (➕, 💾, 📥) cuando apliquen.
4. Si falta un dato previo (ej. cliente/vehículo), indícalo antes de continuar.
5. Mantén tono cordial pero directo; evita párrafos largos.

Siempre responde en español.`;
  },

  // ============================================
  // AGREGAR MENSAJE AL CHAT
  // ============================================
  addMessage(content, role) {
    const chatBody = document.getElementById('chatAssistantBody');
    if (!chatBody) return;

    // Remover mensaje de bienvenida si existe
    const welcome = chatBody.querySelector('.chat-welcome');
    if (welcome) {
      welcome.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;

    messageDiv.innerHTML = `
      ${role === 'bot' ? '<div class="message-avatar"><i class="fas fa-robot"></i></div>' : ''}
      <div class="message-bubble">
        ${this.formatMessage(content)}
      </div>
      ${role === 'user' ? '<div class="message-avatar"><i class="fas fa-user"></i></div>' : ''}
    `;

    chatBody.appendChild(messageDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  },

  // ============================================
  // FORMATEAR MENSAJE
  // ============================================
  formatMessage(content) {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/•/g, '•')
      .replace(/\n/g, '<br>');
  },

  // ============================================
  // INDICADOR DE ESCRITURA
  // ============================================
  showTypingIndicator() {
    const chatBody = document.getElementById('chatAssistantBody');
    if (!chatBody) return;

    const typingDiv = document.createElement('div');
    typingDiv.id = 'chatTypingIndicator';
    typingDiv.className = 'chat-message bot';
    typingDiv.innerHTML = `
      <div class="message-avatar"><i class="fas fa-robot"></i></div>
      <div class="message-bubble">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;

    chatBody.appendChild(typingDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  },

  hideTypingIndicator() {
    const indicator = document.getElementById('chatTypingIndicator');
    if (indicator) {
      indicator.remove();
    }
  },

  // ============================================
  // HISTORIAL
  // ============================================
  saveConversationHistory() {
    try {
      this.setStoredValue('history', this.conversationHistory);
    } catch (error) {
      console.error('❌ Error al guardar historial:', error);
    }
  },

  loadConversationHistory() {
    try {
      const saved = this.getStoredValue('history', null);
      if (Array.isArray(saved)) {
        this.conversationHistory = saved;
        console.log(`📚 Historial cargado: ${this.conversationHistory.length} mensajes`);
      } else {
        this.conversationHistory = [];
      }
    } catch (error) {
      console.error('❌ Error al cargar historial:', error);
      this.conversationHistory = [];
    }
  },

  // ============================================
  // MÉTODO PARA COMPATIBILIDAD (CONTEXT SETTING)
  // ============================================
  setContext(context) {
    console.log(`🎯 [ChatAssistant] Contexto cambiado a: ${context}`);
    this.currentContext = context;
  },

  // ============================================
  // AGREGAR ESTILOS CSS
  // ============================================
  addStyles() {
    if (document.getElementById('chatAssistantStyles')) return;

    const styles = document.createElement('style');
    styles.id = 'chatAssistantStyles';
    styles.innerHTML = `
      .chat-assistant-window {
        position: fixed;
        bottom: 90px;
        right: 20px;
        width: 420px;
        height: 600px;
        background: var(--chat-surface-primary);
        border-radius: 20px;
        border: 1px solid var(--chat-border-color);
        box-shadow: var(--chat-shadow);
        display: none;
        flex-direction: column;
        z-index: 9998;
        animation: slideUpFadeIn 0.3s ease;
      }

      .chat-assistant-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: var(--chat-text-inverse, #ffffff);
        padding: 15px 20px;
        border-radius: 20px 20px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .chat-header-info {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .chat-avatar {
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }

      .chat-assistant-header h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .chat-status {
        margin: 0;
        font-size: 12px;
        opacity: 0.9;
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--text-secondary);
      }

      .status-dot {
        width: 8px;
        height: 8px;
        background: #10b981;
        border-radius: 50%;
        display: inline-block;
        animation: pulse 2s infinite;
      }

      .chat-header-actions {
        display: flex;
        gap: 8px;
      }

      .btn-icon {
        background: var(--chat-surface-elevated);
        border: none;
        color: var(--chat-text-inverse, #ffffff);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .btn-icon:hover {
        background: var(--chat-surface-elevated-hover);
        transform: scale(1.1);
      }

      .chat-assistant-body {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        background: var(--chat-surface-secondary);
        background-image: repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(0, 0, 0, 0.03) 10px,
          rgba(0, 0, 0, 0.03) 20px
        );
        color: var(--text-primary);
      }

      .chat-welcome {
        text-align: center;
        padding: 40px 20px;
        color: var(--chat-text-primary);
      }

      .welcome-icon {
        font-size: 48px;
        color: #667eea;
        margin-bottom: 15px;
      }

      .chat-welcome h3 {
        margin: 10px 0;
        color: var(--chat-text-primary);
      }

      .chat-welcome p {
        margin: 8px 0;
        color: var(--chat-text-secondary);
        font-size: 14px;
      }

      .chat-message {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
        align-items: flex-end;
      }

      .chat-message.user {
        flex-direction: row-reverse;
      }

      .message-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(102, 126, 234, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: #667eea;
        flex-shrink: 0;
      }

      .chat-message.user .message-avatar {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }

      .message-bubble {
        max-width: 75%;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.4;
        word-wrap: break-word;
      }

      .chat-message.bot .message-bubble {
        background: var(--chat-surface-tertiary);
        color: var(--chat-text-primary);
        border-radius: 0 8px 8px 8px;
      }

      .chat-message.user .message-bubble {
        background: var(--chat-highlight);
        color: var(--chat-text-inverse, #ffffff);
        border-radius: 8px 0 8px 8px;
      }

      .typing-indicator {
        display: flex;
        gap: 4px;
        padding: 8px;
        background: var(--chat-surface-elevated);
        border-radius: 999px;
      }

      .typing-indicator span {
        width: 8px;
        height: 8px;
        background: currentColor;
        border-radius: 50%;
        animation: typing 1.4s infinite;
      }

      .typing-indicator span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .typing-indicator span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes typing {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-10px); }
      }

      .chat-assistant-footer {
        padding: 15px 20px;
        background: var(--chat-surface-primary);
        border-radius: 0 0 20px 20px;
        border-top: 1px solid var(--chat-border-color);
      }

      .chat-input-container {
        display: flex;
        gap: 10px;
        align-items: flex-end;
      }

      .chat-input {
        flex: 1;
        background: var(--chat-input-bg);
        border: 2px solid var(--chat-input-border);
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 14px;
        font-family: inherit;
        color: var(--chat-input-text);
        resize: none;
        max-height: 120px;
        transition: all 0.2s;
      }

      .chat-input:focus {
        outline: none;
        border-color: var(--chat-input-focus);
      }

      .chat-input::placeholder {
        color: var(--chat-input-placeholder);
      }

      .btn-send {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: var(--chat-text-inverse, #ffffff);
        width: 44px;
        height: 44px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .btn-send:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      }

      .btn-send:active {
        transform: scale(0.95);
      }

      @media (max-width: 768px) {
        .chat-assistant-window {
          width: 100%;
          height: 100%;
          bottom: 0;
          right: 0;
          border-radius: 0;
        }

        .chat-assistant-header {
          border-radius: 0;
        }

        .chat-assistant-footer {
          border-radius: 0;
        }
      }
    `;

    document.head.appendChild(styles);
  },

  // ============================================
  // CHAT WHATSAPP PARA MARKETING/AYUDA
  // ============================================
  createWhatsAppChatInterface(context) {
    const chatContainer = document.createElement('div');
    chatContainer.id = 'whatsappChatAssistant';
    chatContainer.className = 'whatsapp-chat-assistant';
    chatContainer.style.display = 'none';

    const contextInfo = this.getContextInfo(context);

    chatContainer.innerHTML = `
      <div class="whatsapp-assistant-header">
        <div class="header-left">
          <div class="back-btn" data-action="close-whatsapp">
            <i class="fas fa-arrow-left"></i>
          </div>
          <div class="avatar" style="background: ${contextInfo.gradient}">
            <i class="fas ${contextInfo.icon}"></i>
          </div>
          <div class="contact-info">
            <h4>${contextInfo.title}</h4>
            <p class="online-status">
              <span class="status-dot"></span>
              En línea
            </p>
          </div>
        </div>
        <div class="header-actions">
          <button class="header-btn" data-action="clear-whatsapp" title="Nueva conversación">
            <i class="fas fa-redo"></i>
          </button>
          <button class="header-btn" data-action="close-whatsapp" title="Cerrar">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <div class="whatsapp-assistant-body" id="whatsappAssistantBody">
        ${this.getWelcomeMessage(context)}
      </div>
      
      <div class="whatsapp-assistant-footer">
        <div class="input-container">
          <input type="text" 
                 id="whatsappAssistantInput" 
                 placeholder="Escribe tu mensaje...">
          <button class="send-btn" data-action="send-whatsapp">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
        <div class="typing-indicator" id="whatsappAssistantTyping" style="display: none;">
          <span></span>
          <span></span>
          <span></span>
          Asistente está escribiendo...
        </div>
      </div>
    `;

    chatContainer.style.setProperty('--chat-header-gradient', contextInfo.gradient);
    chatContainer.style.setProperty(
      '--chat-send-gradient',
      contextInfo.buttonGradient || contextInfo.gradient
    );

    document.body.appendChild(chatContainer);

    // Event delegation para botones de WhatsApp
    chatContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');

      switch (action) {
        case 'close-whatsapp':
          this.closeWhatsAppChat();
          break;
        case 'clear-whatsapp':
          this.clearWhatsAppChat();
          break;
        case 'send-whatsapp':
          this.sendWhatsAppMessage();
          break;
        case 'use-example':
          const example = btn.getAttribute('data-example');
          if (example) this.useWhatsAppExample(example);
          break;
      }
    });

    // Enter key para enviar
    const input = chatContainer.querySelector('#whatsappAssistantInput');
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendWhatsAppMessage();
      });
    }

    // Agregar estilos específicos si no existen
    this.addWhatsAppAssistantStyles();

    return chatContainer;
  },

  getContextInfo(context) {
    const contexts = {
      marketing: {
        title: 'Asistente de Marketing',
        icon: 'fa-bullhorn',
        gradient: 'linear-gradient(135deg, #ff6b35, #f7931e)',
        color: '#ff6b35',
        buttonGradient: 'linear-gradient(135deg, #ff6b35, #f7931e)',
      },
      general: {
        title: 'Asistente de Ayuda',
        icon: 'fa-question-circle',
        gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
        color: '#667eea',
        buttonGradient: 'linear-gradient(135deg, #667eea, #764ba2)',
      },
    };
    return contexts[context] || contexts.general;
  },

  getWelcomeMessage(context) {
    const messages = {
      marketing: `
        <div class="chat-welcome">
          <div class="welcome-avatar" style="background: linear-gradient(135deg, #ff6b35, #f7931e)">
            <i class="fas fa-bullhorn"></i>
          </div>
          <h3>¡Hola! 📢</h3>
          <p>Soy tu asistente de marketing</p>
          <p>¿En qué puedo ayudarte hoy?</p>
          <div class="examples-grid">
            <div class="example-bubble" data-action="use-example" data-example="¿Cómo atraer más clientes?">
              "¿Cómo atraer más clientes?"
            </div>
            <div class="example-bubble" data-action="use-example" data-example="Ideas para promociones">
              "Ideas para promociones"
            </div>
            <div class="example-bubble" data-action="use-example" data-example="Estrategias de redes sociales">
              "Estrategias de redes sociales"
            </div>
          </div>
        </div>
      `,
      general: `
        <div class="chat-welcome">
          <div class="welcome-avatar" style="background: linear-gradient(135deg, #667eea, #764ba2)">
            <i class="fas fa-question-circle"></i>
          </div>
          <h3>¡Hola! 💬</h3>
          <p>Soy tu asistente de ayuda IA.</p>
          <p>Puedo guiarte en cualquier módulo.</p>
          <div class="examples-grid">
            <div class="example-bubble" data-action="use-example" data-example="Guíame para registrar un cliente y asociar su vehículo">
              "Registrar cliente + vehículo"
            </div>
            <div class="example-bubble" data-action="use-example" data-example="Explícame cómo crear una venta completa">
              "Crear venta completa"
            </div>
            <div class="example-bubble" data-action="use-example" data-example="¿Cómo agendo una cita en la agenda del taller?">
              "Agenda del taller"
            </div>
            <div class="example-bubble" data-action="use-example" data-example="¿Dónde veo reportes y exporto datos?">
              "Reportes y exportación"
            </div>
          </div>
        </div>
      `,
    };
    return messages[context] || messages.general;
  },

  updateWhatsAppChatContext(context) {
    const contextInfo = this.getContextInfo(context);

    const container = document.getElementById('whatsappChatAssistant');
    if (container) {
      container.style.setProperty('--chat-header-gradient', contextInfo.gradient);
      container.style.setProperty(
        '--chat-send-gradient',
        contextInfo.buttonGradient || contextInfo.gradient
      );
    }

    const title = document.querySelector('#whatsappChatAssistant .contact-info h4');
    if (title) {
      title.textContent = contextInfo.title;
    }

    const avatar = document.querySelector('#whatsappChatAssistant .avatar');
    if (avatar) {
      avatar.style.background = contextInfo.gradient;
    }

    const icon = document.querySelector('#whatsappChatAssistant .avatar i');
    if (icon) {
      icon.className = `fas ${contextInfo.icon}`;
    }
  },

  closeWhatsAppChat() {
    const chatContainer = document.getElementById('whatsappChatAssistant');
    if (chatContainer) {
      chatContainer.style.display = 'none';
    }
    this.isOpen = false;
  },

  clearWhatsAppChat() {
    const chatBody = document.getElementById('whatsappAssistantBody');
    if (chatBody) {
      chatBody.innerHTML = this.getWelcomeMessage(this.currentContext);
    }
    this.conversationHistory = [];
    this.removeStoredValue('history');
  },

  useWhatsAppExample(text) {
    const input = document.getElementById('whatsappAssistantInput');
    if (input) {
      input.value = text;
      this.sendWhatsAppMessage();
    }
  },

  sendWhatsAppMessage() {
    const input = document.getElementById('whatsappAssistantInput');
    const message = input.value.trim();

    if (!message) return;

    // Limpiar input
    input.value = '';

    // Agregar mensaje del usuario
    this.addWhatsAppMessage(message, 'user');

    // Mostrar indicador de escritura
    this.showWhatsAppTyping();

    // Procesar mensaje
    setTimeout(() => {
      this.hideWhatsAppTyping();
      this.processWhatsAppMessage(message);
    }, 1500);
  },

  addWhatsAppMessage(message, type) {
    const chatBody = document.getElementById('whatsappAssistantBody');
    if (!chatBody) return;

    // Remover welcome si existe
    const welcome = chatBody.querySelector('.chat-welcome');
    if (welcome) {
      welcome.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `whatsapp-message ${type}`;

    const now = new Date();
    const time = now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    const safeContent = message.replace(/\n/g, '<br>');
    const statusMarkup =
      type === 'user'
        ? '<span class="message-status"><i class="fas fa-check-double"></i></span>'
        : '';

    messageDiv.innerHTML = `
      <div class="message-content">
        <div class="message-text">${safeContent}</div>
        <div class="message-meta">
          <span class="message-time">${time}</span>
          ${statusMarkup}
        </div>
      </div>
    `;

    chatBody.appendChild(messageDiv);

    // Scroll al final
    chatBody.scrollTop = chatBody.scrollHeight;

    // Agregar al historial
    this.conversationHistory.push({
      role: type === 'user' ? 'user' : 'assistant',
      content: message,
    });
  },

  showWhatsAppTyping() {
    const typing = document.getElementById('whatsappAssistantTyping');
    if (typing) {
      typing.style.display = 'inline-flex';
    }
  },

  hideWhatsAppTyping() {
    const typing = document.getElementById('whatsappAssistantTyping');
    if (typing) {
      typing.style.display = 'none';
    }
  },

  processWhatsAppMessage(message) {
    // Reutilizar la lógica de procesamiento existente
    this.processMessage(message, (response) => {
      this.addWhatsAppMessage(response, 'bot');
    });
  },

  // ============================================
  // PROCESAR MENSAJE (GENÉRICO)
  // ============================================
  async processMessage(message, callback) {
    try {
      // Agregar al historial
      this.conversationHistory.push({ role: 'user', content: message });

      // Obtener respuesta de IA
      const response = await this.getAIResponse(message);

      // Agregar respuesta al historial
      this.conversationHistory.push({ role: 'assistant', content: response });
      this.saveConversationHistory();

      // Ejecutar callback con la respuesta
      if (callback) {
        callback(response);
      }

      return response;
    } catch (error) {
      console.error('❌ Error procesando mensaje:', error);
      const detalle = error?.message ? error.message : 'Lo siento, hubo un error inesperado.';
      const errorMsg = detalle.includes('API Key')
        ? 'El asistente IA no está configurado. Revisa la sección de configuración de IA e ingresa tu API Key.'
        : `No pude contactar a la IA: ${detalle}`;
      if (callback) {
        callback(errorMsg);
      }
      return errorMsg;
    }
  },

  addWhatsAppAssistantStyles() {
    if (document.getElementById('whatsappAssistantStyles')) return;
    // Preserve compatibility by adding a marker element without injecting duplicate CSS
    const marker = document.createElement('style');
    marker.id = 'whatsappAssistantStyles';
    document.head.appendChild(marker);
  },
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
  if (window.ChatAssistant) {
    ChatAssistant.init();
  }
});
