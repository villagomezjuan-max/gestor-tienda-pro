/**
 * TELEGRAM IA ASSISTANT
 * Sistema de chat inteligente por Telegram con BOTONES INTERACTIVOS
 * Se activa automáticamente y responde con menús de opciones
 */

// 🔒 SINGLETON: Evitar múltiples instancias
if (window._TelegramIAAssistant_Initialized) {
  console.log('⚠️ TelegramIAAssistant ya está inicializado - ignorando segunda carga');
} else {
  window._TelegramIAAssistant_Initialized = true;

window.TelegramIAAssistant = {
  // Configuración
  config: {
    enabled: false,
    botToken: '',
    pollingInterval: 3000, // 3 segundos para evitar conflictos
    maxHistoryPerChat: 100,
  },

  // Estado
  estado: {
    polling: null,
    lastUpdateId: 0,
    iniciado: false,
    ultimoError: null,
    intentosReconexion: 0,
    pausadoPor409: false,
    tiempoEspera409: 5000 // Empieza en 5 segundos, aumenta exponencialmente
  },

  // Set para evitar procesar mensajes duplicados
  mensajesProcesados: new Set(),
  
  // Historial global
  historialGlobal: [],
  
  // Conversaciones por usuario
  conversacionesPorUsuario: {},

  // ============================================
  // INICIALIZACIÓN AUTOMÁTICA
  // ============================================
  async init() {
    // Evitar reinicialización
    if (this.estado.iniciado) {
      console.log('⚠️ TelegramIAAssistant ya está corriendo');
      return true;
    }
    
    console.log('🤖 Inicializando Telegram IA Assistant...');
    
    await this.esperarModulos();
    this.cargarConfiguracion();
    this.cargarHistorial();
    this.cargarConversaciones();
    
    if (!this.config.botToken) {
      console.log('⚠️ Telegram IA: No hay Bot Token configurado');
      return false;
    }

    // SIEMPRE activar si hay token
    this.config.enabled = true;
    
    // Iniciar polling automáticamente
    await this.iniciarPolling();
    
    console.log('✅ Telegram IA Assistant ACTIVO y escuchando mensajes');
    return true;
  },

  async esperarModulos() {
    const maxEspera = 5000;
    const inicio = Date.now();
    
    while (Date.now() - inicio < maxEspera) {
      if (window.TelegramNotificaciones && window.Database) {
        return true;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    console.warn('⚠️ Algunos módulos no están disponibles');
    return false;
  },

  cargarConfiguracion() {
    try {
      let botToken = '';

      // Fuente 1: TelegramNotificaciones
      if (window.TelegramNotificaciones?.config) {
        botToken = TelegramNotificaciones.config.botToken || '';
      }

      // Fuente 2: Database
      if (!botToken && window.Database) {
        const configAvanzada = Database.get('configuracion_avanzada') || Database.get('configuracionAvanzada') || {};
        botToken = configAvanzada.telegram?.botToken || '';
      }

      // Fuente 3: localStorage
      if (!botToken) {
        try {
          const stored = localStorage.getItem('telegram_config');
          if (stored) {
            botToken = JSON.parse(stored).botToken || '';
          }
        } catch (e) {}
      }

      this.config.botToken = botToken;
      this.config.enabled = !!botToken;

      console.log('📱 Telegram IA Config:', { tokenPresente: !!botToken });
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  },

  cargarHistorial() {
    try {
      const historial = localStorage.getItem('telegram_ia_historial_global');
      if (historial) {
        this.historialGlobal = JSON.parse(historial);
      }
    } catch (error) {
      this.historialGlobal = [];
    }
  },

  cargarConversaciones() {
    try {
      const conv = localStorage.getItem('telegram_ia_conversaciones');
      if (conv) {
        this.conversacionesPorUsuario = JSON.parse(conv);
      }
    } catch (error) {
      this.conversacionesPorUsuario = {};
    }
  },

  guardarHistorial() {
    try {
      if (this.historialGlobal.length > 500) {
        this.historialGlobal = this.historialGlobal.slice(-500);
      }
      localStorage.setItem('telegram_ia_historial_global', JSON.stringify(this.historialGlobal));
    } catch (error) {}
  },

  guardarConversaciones() {
    try {
      for (const chatId in this.conversacionesPorUsuario) {
        if (this.conversacionesPorUsuario[chatId].mensajes?.length > this.config.maxHistoryPerChat) {
          this.conversacionesPorUsuario[chatId].mensajes = 
            this.conversacionesPorUsuario[chatId].mensajes.slice(-this.config.maxHistoryPerChat);
        }
      }
      localStorage.setItem('telegram_ia_conversaciones', JSON.stringify(this.conversacionesPorUsuario));
    } catch (error) {}
  },

  // ============================================
  // POLLING DE MENSAJES (con mutex para evitar múltiples pestañas)
  // ============================================
  
  // ID único de esta sesión
  _sessionId: Math.random().toString(36).substr(2, 9),
  
  // Verificar si esta sesión es la activa
  _esLaSesionActiva() {
    const sesionActiva = localStorage.getItem('_telegram_polling_session');
    const timestamp = parseInt(localStorage.getItem('_telegram_polling_timestamp') || '0');
    const ahora = Date.now();
    
    // Si no hay sesión activa o expiró (más de 10 segundos), tomar el control
    if (!sesionActiva || (ahora - timestamp > 10000)) {
      localStorage.setItem('_telegram_polling_session', this._sessionId);
      localStorage.setItem('_telegram_polling_timestamp', ahora.toString());
      return true;
    }
    
    // Si somos nosotros, renovar
    if (sesionActiva === this._sessionId) {
      localStorage.setItem('_telegram_polling_timestamp', ahora.toString());
      return true;
    }
    
    // Otra sesión está activa
    return false;
  },
  
  async iniciarPolling() {
    if (this.estado.polling) {
      clearInterval(this.estado.polling);
    }

    if (!this.config.botToken) {
      console.error('❌ No se puede iniciar sin Bot Token');
      return false;
    }
    
    // Verificar si podemos tomar el control del polling
    if (!this._esLaSesionActiva()) {
      console.log('⚠️ Otra pestaña ya está haciendo polling - delegando...');
      // Revisar periódicamente si podemos tomar el control
      this.estado.polling = setInterval(() => {
        if (this._esLaSesionActiva()) {
          console.log('✅ Tomando control del polling');
          clearInterval(this.estado.polling);
          this.iniciarPolling();
        }
      }, 5000);
      return true;
    }

    // IMPORTANTE: Limpiar conflictos antes de iniciar
    console.log('🔄 Limpiando posibles conflictos de polling...');
    await this.limpiarConflictoPolling();

    this.estado.iniciado = true;
    this.estado.intentosReconexion = 0;
    
    // Primera obtención inmediata
    await this.obtenerUpdates();

    // Polling periódico con manejo de errores mejorado
    this.estado.polling = setInterval(async () => {
      // Verificar que seguimos siendo la sesión activa
      if (!this._esLaSesionActiva()) {
        console.log('⚠️ Otra pestaña tomó el control - pausando polling');
        clearInterval(this.estado.polling);
        this.estado.polling = null;
        return;
      }
      
      try {
        await this.obtenerUpdates();
      } catch (error) {
        console.warn('Error en polling:', error.message);
        this.estado.intentosReconexion++;
        
        // Si hay muchos errores seguidos, pausar y limpiar
        if (this.estado.intentosReconexion > 5) {
          console.warn('⚠️ Demasiados errores, limpiando y reiniciando...');
          clearInterval(this.estado.polling);
          this.estado.polling = null;
          
          // Esperar 10 segundos y reiniciar
          setTimeout(async () => {
            await this.limpiarConflictoPolling();
            this.estado.intentosReconexion = 0;
            this.iniciarPolling();
          }, 10000);
        }
      }
    }, this.config.pollingInterval);

    console.log('📡 Polling activo (cada ' + this.config.pollingInterval/1000 + 's) - Sesión: ' + this._sessionId);
    
    // Limpiar sesión al cerrar pestaña
    window.addEventListener('beforeunload', () => {
      const sesion = localStorage.getItem('_telegram_polling_session');
      if (sesion === this._sessionId) {
        localStorage.removeItem('_telegram_polling_session');
        localStorage.removeItem('_telegram_polling_timestamp');
      }
    });
    
    return true;
  },

  detenerPolling() {
    if (this.estado.polling) {
      clearInterval(this.estado.polling);
      this.estado.polling = null;
      this.estado.iniciado = false;
      // Liberar la sesión
      const sesion = localStorage.getItem('_telegram_polling_session');
      if (sesion === this._sessionId) {
        localStorage.removeItem('_telegram_polling_session');
        localStorage.removeItem('_telegram_polling_timestamp');
      }
      console.log('📡 Polling detenido');
    }
  },

  async obtenerUpdates() {
    if (!this.config.botToken) return;
    
    // Si está pausado por 409, no hacer nada
    if (this.estado.pausadoPor409) {
      return;
    }

    const url = `https://api.telegram.org/bot${this.config.botToken}/getUpdates`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offset: this.estado.lastUpdateId + 1,
          timeout: 2, // Muy corto para evitar conflictos
          allowed_updates: ['message', 'callback_query']
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      // Manejar error 409 (conflicto de polling) - SILENCIOSO
      if (response.status === 409) {
        this.estado.pausadoPor409 = true;
        
        // Esperar con backoff exponencial SIN spam en consola
        await new Promise(r => setTimeout(r, this.estado.tiempoEspera409));
        
        // Limpiar conflicto silenciosamente
        await this.limpiarConflictoPolling(true); // true = silencioso
        
        // Aumentar tiempo de espera para próximo 409 (max 120s)
        this.estado.tiempoEspera409 = Math.min(this.estado.tiempoEspera409 * 2, 120000);
        this.estado.pausadoPor409 = false;
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.ok && data.result && data.result.length > 0) {
        for (const update of data.result) {
          await this.procesarUpdate(update);
          this.estado.lastUpdateId = update.update_id;
        }
      }
      
      // Reset en éxito
      this.estado.intentosReconexion = 0;
      this.estado.tiempoEspera409 = 5000; // Reset backoff
      
    } catch (error) {
      // Ignorar errores de abort y red silenciosamente
      if (error.name === 'AbortError') return;
      if (error.message?.includes('ERR_NETWORK')) return;
      
      this.estado.ultimoError = error.message;
    }
  },

  // Limpiar conflicto de polling (otro proceso usa el mismo bot)
  async limpiarConflictoPolling(silencioso = false) {
    try {
      // Primero, eliminar webhook si existe
      await fetch(`https://api.telegram.org/bot${this.config.botToken}/deleteWebhook`, {
        method: 'POST',
        body: JSON.stringify({ drop_pending_updates: true }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Esperar un momento
      await new Promise(r => setTimeout(r, 500));
      
      // Obtener updates con offset muy alto para limpiar cola
      const response = await fetch(`https://api.telegram.org/bot${this.config.botToken}/getUpdates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offset: -1,
          timeout: 0
        })
      });
      
      const data = await response.json();
      if (data.ok && data.result?.length > 0) {
        // Actualizar offset al último mensaje
        this.estado.lastUpdateId = data.result[data.result.length - 1].update_id;
      }
      
      if (!silencioso) {
        console.log('✅ Conflicto de polling limpiado');
      }
    } catch (e) {
      // Silenciar errores de limpieza
    }
  },

  // ============================================
  // PROCESAMIENTO DE MENSAJES Y CALLBACKS
  // ============================================
  async procesarUpdate(update) {
    const updateId = update.update_id;

    // Evitar duplicados
    if (this.mensajesProcesados.has(updateId)) return;
    this.mensajesProcesados.add(updateId);

    // Limpiar set antiguo
    if (this.mensajesProcesados.size > 200) {
      const arr = Array.from(this.mensajesProcesados);
      this.mensajesProcesados = new Set(arr.slice(-100));
    }

    // ⚡ CALLBACK DE BOTÓN (cuando usuario selecciona opción)
    if (update.callback_query) {
      await this.procesarCallback(update.callback_query);
      return;
    }

    // Mensaje de texto normal
    if (update.message) {
      await this.procesarMensaje(update.message, updateId);
    }
  },

  // ============================================
  // PROCESAR CALLBACK DE BOTÓN
  // ============================================
  async procesarCallback(callback) {
    const chatId = String(callback.message.chat.id);
    const data = callback.data;
    const usuario = callback.from;
    const callbackId = callback.id;

    console.log(`🔘 [${chatId}] Botón presionado: ${data}`);

    // Responder al callback (quita el "cargando" del botón)
    await this.responderCallback(callbackId);

    // Procesar la opción seleccionada
    let respuesta = await this.procesarOpcionSeleccionada(data, chatId, usuario);

    // Enviar respuesta
    if (respuesta) {
      await this.enviarMensaje(chatId, respuesta);
    }
  },

  async responderCallback(callbackId) {
    try {
      await fetch(`https://api.telegram.org/bot${this.config.botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackId })
      });
    } catch (e) {}
  },

  async procesarOpcionSeleccionada(opcion, chatId, usuario) {
    const nombreUsuario = usuario.first_name || 'Usuario';

    switch (opcion) {
      // ===== MENÚ PRINCIPAL =====
      case 'menu_citas':
        return this.getMenuCitas(nombreUsuario);
      
      case 'menu_vehiculo':
        return this.getMenuVehiculo(nombreUsuario);
      
      case 'menu_servicios':
        return this.getMenuServicios();
      
      case 'menu_ayuda':
        return this.getMensajeAyuda(chatId);

      // ===== CITAS =====
      case 'cita_agendar':
        return `📅 *Agendar Nueva Cita*

${nombreUsuario}, para agendar tu cita necesito:

1️⃣ *Tipo de servicio* (cambio de aceite, revisión, etc.)
2️⃣ *Fecha preferida*
3️⃣ *Hora preferida*

Por favor escríbeme los detalles.
_Ejemplo: "Cambio de aceite para el viernes a las 10am"_`;

      case 'cita_ver':
        return await this.consultarCitasUsuario(chatId, nombreUsuario);

      case 'cita_cancelar':
        return `❌ *Cancelar Cita*

Para cancelar una cita, escríbeme:
• El número de cita, o
• La fecha de la cita que quieres cancelar`;

      // ===== VEHÍCULO =====
      case 'vehiculo_estado':
        return await this.consultarEstadoVehiculo(chatId, nombreUsuario);

      case 'vehiculo_historial':
        return await this.consultarHistorialVehiculo(chatId, nombreUsuario);

      // ===== SERVICIOS =====
      case 'servicio_aceite':
        return this.getInfoServicio('aceite');
      
      case 'servicio_frenos':
        return this.getInfoServicio('frenos');
      
      case 'servicio_revision':
        return this.getInfoServicio('revision');
      
      case 'servicio_otros':
        return this.getInfoServicio('otros');

      // ===== ADMIN =====
      case 'admin_stock':
        return await this.consultarStock();
      
      case 'admin_ventas':
        return await this.consultarVentas();
      
      case 'admin_resumen':
        return await this.generarResumen();

      case 'reporte_citas':
        return await this.consultarCitas();

      case 'reporte_ordenes':
        return await this.consultarOrdenes();

      case 'reporte_clientes':
        return await this.consultarClientes();

      case 'menu_reportes':
        return this.getMenuReportes();

      case 'volver_menu':
        await this.enviarMenuPrincipal(chatId, usuario);
        return null;

      default:
        return `❓ Opción no reconocida. Usa /start para ver el menú.`;
    }
  },

  // ============================================
  // PROCESAR MENSAJE DE TEXTO
  // ============================================
  async procesarMensaje(message, updateId) {
    const chatId = String(message.chat.id);
    const texto = message.text || '';
    const usuario = message.from;

    console.log(`📨 [${chatId}] ${usuario.first_name}: "${texto}"`);

    // Registrar usuario
    this.registrarUsuarioSiNuevo(chatId, usuario);

    // Guardar en historial
    this.agregarAlHistorial({
      id: updateId,
      tipo: 'entrante',
      chatId,
      usuario: { id: usuario.id, nombre: usuario.first_name },
      mensaje: texto,
      timestamp: new Date().toISOString()
    });

    // Determinar respuesta
    let respuesta;
    const textoLower = texto.toLowerCase().trim();

    // /start siempre muestra menú con botones
    if (textoLower === '/start' || textoLower === 'inicio' || textoLower === 'menu' || textoLower === 'menú') {
      await this.enviarMenuPrincipal(chatId, usuario);
      return;
    }

    // Comandos rápidos
    if (textoLower.startsWith('/')) {
      respuesta = await this.procesarComando(textoLower, chatId, usuario);
    } else {
      // Intentar procesar con IA si está disponible
      respuesta = await this.procesarTextoLibre(texto, chatId, usuario);
    }

    if (respuesta) {
      await this.enviarMensaje(chatId, respuesta);
    }
  },

  async procesarComando(comando, chatId, usuario) {
    const cmd = comando.split(' ')[0].replace('/', '');
    
    switch (cmd) {
      case 'ayuda':
      case 'help':
        return this.getMensajeAyuda(chatId);
      case 'cita':
      case 'citas':
      case 'agendar':
        return await this.consultarCitas();
      case 'stock':
      case 'inventario':
        return await this.consultarStock();
      case 'ventas':
        return await this.consultarVentas();
      case 'resumen':
      case 'reporte':
        return await this.generarResumen();
      case 'ordenes':
      case 'trabajos':
        return await this.consultarOrdenes();
      case 'clientes':
        return await this.consultarClientes();
      case 'reportes':
        return this.getMenuReportes();
      default:
        await this.enviarMenuPrincipal(chatId, usuario);
        return null;
    }
  },

  // Menú de reportes completo
  getMenuReportes() {
    return {
      texto: `📊 *MENÚ DE REPORTES*
━━━━━━━━━━━━━━━━

Selecciona el reporte que deseas:`,
      botones: [
        [
          { text: '📦 Inventario', callback_data: 'admin_stock' },
          { text: '💰 Ventas', callback_data: 'admin_ventas' }
        ],
        [
          { text: '📅 Citas', callback_data: 'reporte_citas' },
          { text: '🔧 Órdenes', callback_data: 'reporte_ordenes' }
        ],
        [
          { text: '👥 Clientes', callback_data: 'reporte_clientes' },
          { text: '📊 Resumen', callback_data: 'admin_resumen' }
        ],
        [
          { text: '⬅️ Volver al Menú', callback_data: 'volver_menu' }
        ]
      ]
    };
  },

  async procesarTextoLibre(texto, chatId, usuario) {
    const textoLower = texto.toLowerCase();

    // Detectar intenciones básicas
    if (textoLower.includes('hola') || textoLower.includes('buenos') || textoLower.includes('buenas')) {
      await this.enviarMenuPrincipal(chatId, usuario);
      return null;
    }

    if (textoLower.includes('cita') || textoLower.includes('agendar') || textoLower.includes('turno')) {
      return this.getMenuCitas(usuario.first_name);
    }

    if (textoLower.includes('vehiculo') || textoLower.includes('carro') || textoLower.includes('auto')) {
      return this.getMenuVehiculo(usuario.first_name);
    }

    if (textoLower.includes('servicio') || textoLower.includes('precio')) {
      return this.getMenuServicios();
    }

    // Si hay IAManagerAgent, usarlo
    if (window.IAManagerAgent?.estado?.inicializado) {
      try {
        const resultado = await IAManagerAgent.procesarMensaje({
          chatId,
          mensaje: texto,
          usuario: { id: usuario.id, nombre: usuario.first_name, username: usuario.username }
        }, 'telegram');
        
        if (resultado?.respuesta) {
          return resultado.respuesta;
        }
      } catch (e) {
        console.error('Error con IAManagerAgent:', e);
      }
    }

    // Respuesta por defecto - mostrar menú
    await this.enviarMenuPrincipal(chatId, usuario);
    return null;
  },

  // ============================================
  // ENVIAR MENÚ PRINCIPAL CON BOTONES
  // ============================================
  async enviarMenuPrincipal(chatId, usuario) {
    const asistente = window.TelegramNotificaciones?.config?.nombreAsistente || 'Sara';
    const negocio = this.obtenerNombreNegocio();
    const esAdmin = this.esUsuarioAdmin(chatId);

    const mensaje = `¡Hola ${usuario.first_name}! 👋

Soy *${asistente}*, tu asistente de *${negocio}*.

¿En qué puedo ayudarte hoy? 👇`;

    // Botones para cliente
    let botones = [
      [
        { text: '📅 Citas', callback_data: 'menu_citas' },
        { text: '🚗 Mi Vehículo', callback_data: 'menu_vehiculo' }
      ],
      [
        { text: '🔧 Servicios', callback_data: 'menu_servicios' },
        { text: '❓ Ayuda', callback_data: 'menu_ayuda' }
      ]
    ];

    // Agregar opciones de admin si corresponde
    if (esAdmin) {
      botones.push([
        { text: '� Reportes', callback_data: 'menu_reportes' }
      ]);
      botones.push([
        { text: '📦 Stock', callback_data: 'admin_stock' },
        { text: '💰 Ventas', callback_data: 'admin_ventas' }
      ]);
      botones.push([
        { text: '📅 Citas', callback_data: 'reporte_citas' },
        { text: '🔧 Órdenes', callback_data: 'reporte_ordenes' }
      ]);
    }

    await this.enviarMensajeConBotones(chatId, mensaje, botones);
  },

  // ============================================
  // SUBMENÚS CON BOTONES
  // ============================================
  getMenuCitas(nombre) {
    return {
      texto: `📅 *Gestión de Citas*

${nombre}, ¿qué deseas hacer?`,
      botones: [
        [
          { text: '➕ Agendar Cita', callback_data: 'cita_agendar' },
          { text: '📋 Ver Mis Citas', callback_data: 'cita_ver' }
        ],
        [
          { text: '❌ Cancelar Cita', callback_data: 'cita_cancelar' }
        ],
        [
          { text: '⬅️ Volver al Menú', callback_data: 'volver_menu' }
        ]
      ]
    };
  },

  getMenuVehiculo(nombre) {
    return {
      texto: `🚗 *Tu Vehículo*

${nombre}, ¿qué información necesitas?`,
      botones: [
        [
          { text: '🔍 Estado Actual', callback_data: 'vehiculo_estado' },
          { text: '📜 Historial', callback_data: 'vehiculo_historial' }
        ],
        [
          { text: '⬅️ Volver al Menú', callback_data: 'volver_menu' }
        ]
      ]
    };
  },

  getMenuServicios() {
    return {
      texto: `🔧 *Nuestros Servicios*

Selecciona el servicio que te interesa:`,
      botones: [
        [
          { text: '🛢️ Cambio de Aceite', callback_data: 'servicio_aceite' },
          { text: '🛞 Frenos', callback_data: 'servicio_frenos' }
        ],
        [
          { text: '🔍 Revisión General', callback_data: 'servicio_revision' },
          { text: '➕ Otros', callback_data: 'servicio_otros' }
        ],
        [
          { text: '⬅️ Volver al Menú', callback_data: 'volver_menu' }
        ]
      ]
    };
  },

  getInfoServicio(tipo) {
    const servicios = {
      aceite: `🛢️ *Cambio de Aceite*

✅ Incluye:
• Aceite de alta calidad
• Filtro de aceite nuevo
• Revisión de niveles
• Limpieza general

⏱️ Tiempo: 30-45 minutos
📅 ¿Quieres agendar? Escribe "cita"`,

      frenos: `🛞 *Servicio de Frenos*

✅ Incluye:
• Revisión completa del sistema
• Cambio de pastillas si es necesario
• Revisión de discos
• Prueba de funcionamiento

⏱️ Tiempo: 1-2 horas
📅 ¿Quieres agendar? Escribe "cita"`,

      revision: `🔍 *Revisión General*

✅ Incluye:
• Diagnóstico computarizado
• Revisión de motor
• Sistema eléctrico
• Suspensión y dirección
• Informe detallado

⏱️ Tiempo: 1-2 horas
📅 ¿Quieres agendar? Escribe "cita"`,

      otros: `➕ *Otros Servicios*

También ofrecemos:
• 🔋 Baterías
• 🌡️ Sistema de enfriamiento
• ⚡ Sistema eléctrico
• 🔧 Mecánica general
• 🎨 Pintura y latonería

💬 Cuéntame qué necesitas y te ayudo.`
    };

    return servicios[tipo] || servicios.otros;
  },

  getMensajeAyuda(chatId) {
    const esAdmin = this.esUsuarioAdmin(chatId);
    
    if (esAdmin) {
      return `🆘 *AYUDA - ADMINISTRADOR*
━━━━━━━━━━━━━━━━━━

📋 *Comandos directos:*
/start - Menú principal
/stock - Inventario completo
/ventas - Ventas de hoy
/citas - Citas programadas
/ordenes - Órdenes de trabajo
/clientes - Lista de clientes
/resumen - Resumen general
/reportes - Menú de reportes

💡 *Tips:*
• Los reportes son directos (sin IA)
• Datos en tiempo real
• Puedes usar los botones o escribir`;
    }

    return `🆘 *¿Necesitas ayuda?*
━━━━━━━━━━━━━━━━

Puedo ayudarte con:
• 📅 *Agendar citas*
• 🚗 *Ver estado de tu vehículo*
• 🔧 *Información de servicios*

📋 *Comandos:*
/start - Ver menú
/cita - Agendar cita

Escribe /start para ver las opciones.`;
  },

  // ============================================
  // CONSULTAS DE DATOS
  // ============================================
  async consultarCitasUsuario(chatId, nombre) {
    try {
      const citas = Database?.getCollection?.('citas') || [];
      const citasUsuario = citas.filter(c => 
        String(c.telegramChatId) === chatId || 
        c.clienteNombre?.toLowerCase().includes(nombre.toLowerCase())
      );

      if (citasUsuario.length === 0) {
        return `📋 *Tus Citas*

No tienes citas registradas.

¿Deseas agendar una? Escribe "agendar cita"`;
      }

      let respuesta = `📋 *Tus Citas*\n\n`;
      citasUsuario.slice(0, 5).forEach((c, i) => {
        const fecha = new Date(c.fecha).toLocaleDateString('es-EC');
        respuesta += `${i+1}. 📅 ${fecha} - ${c.hora || 'Por confirmar'}\n`;
        respuesta += `   🔧 ${c.servicio || c.motivo || 'Servicio general'}\n`;
        respuesta += `   📍 Estado: ${c.estado || 'Pendiente'}\n\n`;
      });

      return respuesta;
    } catch (e) {
      return '❌ Error consultando citas';
    }
  },

  async consultarEstadoVehiculo(chatId, nombre) {
    try {
      const ordenes = Database?.getCollection?.('ordenesTrabajos') || Database?.getCollection?.('ordenes') || [];
      const ordenesUsuario = ordenes.filter(o => 
        o.estado !== 'completado' && o.estado !== 'entregado' &&
        (String(o.telegramChatId) === chatId || o.cliente?.toLowerCase().includes(nombre.toLowerCase()))
      );

      if (ordenesUsuario.length === 0) {
        return `🚗 *Estado de tu Vehículo*

No hay vehículos en proceso actualmente.

Si dejaste tu vehículo recientemente, pronto tendrás actualizaciones.`;
      }

      let respuesta = `🚗 *Vehículos en Proceso*\n\n`;
      ordenesUsuario.slice(0, 3).forEach(o => {
        const estadoEmoji = {
          'pendiente': '🟡',
          'en_proceso': '🔵',
          'en_progreso': '🔵',
          'esperando_repuestos': '🟠',
          'listo': '🟢'
        }[o.estado] || '⚪';
        
        respuesta += `${estadoEmoji} *${o.vehiculo || 'Vehículo'}*\n`;
        respuesta += `   Estado: ${o.estado?.replace(/_/g, ' ') || 'En proceso'}\n`;
        respuesta += `   Servicio: ${o.servicio || o.descripcion || 'Mantenimiento'}\n\n`;
      });

      return respuesta;
    } catch (e) {
      return '❌ Error consultando estado';
    }
  },

  async consultarHistorialVehiculo(chatId, nombre) {
    try {
      const ordenes = Database?.getCollection?.('ordenesTrabajos') || [];
      const completadas = ordenes.filter(o => 
        (o.estado === 'completado' || o.estado === 'entregado') &&
        (String(o.telegramChatId) === chatId || o.cliente?.toLowerCase().includes(nombre.toLowerCase()))
      );

      if (completadas.length === 0) {
        return `📜 *Historial de Servicios*

No hay servicios anteriores registrados.`;
      }

      let respuesta = `📜 *Historial de Servicios*\n\n`;
      completadas.slice(0, 5).forEach(o => {
        const fecha = new Date(o.fechaEntrega || o.fecha).toLocaleDateString('es-EC');
        respuesta += `✅ ${fecha} - ${o.servicio || 'Servicio'}\n`;
      });

      return respuesta;
    } catch (e) {
      return '❌ Error consultando historial';
    }
  },

  // ============================================
  // SISTEMA DE REPORTES DIRECTOS (SIN IA)
  // Busca datos de la API del backend + caché local
  // ============================================
  
  // Caché de datos para evitar llamadas repetidas
  _datosCache: {
    productos: [],
    ventas: [],
    clientes: [],
    citas: [],
    ordenes: [],
    ultimaActualizacion: 0
  },

  async obtenerDatosReales() {
    let productos = [];
    let ventas = [];
    let clientes = [];
    let citas = [];
    let ordenes = [];

    try {
      // Si el caché tiene menos de 30 segundos, usarlo
      const ahora = Date.now();
      if (ahora - this._datosCache.ultimaActualizacion < 30000 && this._datosCache.productos.length > 0) {
        console.log('📊 Usando datos del caché');
        return { ...this._datosCache };
      }

      // ⭐ FUENTE PRINCIPAL: API del Backend usando Auth._request
      if (window.Auth?._request) {
        console.log('🔄 Obteniendo datos del backend...');
        try {
          // Hacer llamadas individuales para mejor manejo de errores
          try {
            const res = await Auth._request('/pos/productos', { method: 'GET' });
            productos = Array.isArray(res) ? res : [];
          } catch (e) { console.log('⚠️ Error productos:', e.message); }
          
          try {
            const res = await Auth._request('/api/ventas', { method: 'GET' });
            ventas = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
          } catch (e) { console.log('⚠️ Error ventas:', e.message); }
          
          try {
            const res = await Auth._request('/pos/clientes', { method: 'GET' });
            clientes = Array.isArray(res) ? res : [];
          } catch (e) { console.log('⚠️ Error clientes:', e.message); }
          
          try {
            const res = await Auth._request('/api/citas', { method: 'GET' });
            console.log('📅 Respuesta citas API:', res);
            citas = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
          } catch (e) { console.log('⚠️ Error citas:', e.message); }
          
          try {
            const res = await Auth._request('/api/ordenes-trabajo', { method: 'GET' });
            console.log('🔧 Respuesta órdenes API:', res);
            ordenes = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
          } catch (e) { console.log('⚠️ Error órdenes:', e.message); }

          console.log(`✅ Backend: ${productos.length} productos, ${ventas.length} ventas, ${clientes.length} clientes, ${citas.length} citas, ${ordenes.length} órdenes`);
          // Guardar en caché
          this._datosCache = { productos, ventas, clientes, citas, ordenes, ultimaActualizacion: ahora };
          return { productos, ventas, clientes, citas, ordenes };
        } catch (apiError) {
          console.warn('⚠️ Error API general:', apiError.message);
        }
      }

      // FUENTE 2: Database.getCollection (fallback local)
      if (window.Database?.getCollection) {
        productos = Database.getCollection('productos') || [];
        ventas = Database.getCollection('ventas') || [];
        clientes = Database.getCollection('clientes') || [];
        citas = Database.getCollection('citas') || [];
        ordenes = Database.getCollection('ordenes_trabajo') || Database.getCollection('ordenesTrabajos') || [];
        
        if (productos.length > 0 || ventas.length > 0) {
          console.log(`📊 Datos de Database: ${productos.length} productos`);
          this._datosCache = { productos, ventas, clientes, citas, ordenes, ultimaActualizacion: ahora };
          return { productos, ventas, clientes, citas, ordenes };
        }
      }

      // FUENTE 3: localStorage directo
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('gestorTiendaProDB')) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data?.productos?.length > 0) {
              productos = data.productos;
              ventas = data.ventas || [];
              clientes = data.clientes || [];
              citas = data.citas || [];
              ordenes = data.ordenes_trabajo || [];
              break;
            }
          } catch (e) { /* ignorar */ }
        }
      }

      console.log(`📊 Datos finales: ${productos.length} productos, ${ventas.length} ventas, ${clientes.length} clientes`);
      this._datosCache = { productos, ventas, clientes, citas, ordenes, ultimaActualizacion: ahora };

    } catch (e) {
      console.error('Error obteniendo datos:', e);
    }

    return { productos, ventas, clientes, citas, ordenes };
  },

  // ============================================
  // CONSULTAS DIRECTAS A LA API (sin caché)
  // ============================================
  
  async consultarStock() {
    // Obtener productos directamente de la API
    let productos = [];
    const hoy = new Date().toLocaleDateString('es-EC');
    
    try {
      if (window.Auth?._request) {
        const res = await Auth._request('/pos/productos', { method: 'GET' });
        productos = Array.isArray(res) ? res : [];
        console.log('📦 Productos API:', productos.length, 'registros');
      }
    } catch (e) {
      console.warn('Error obteniendo productos:', e.message);
    }
    
    if (productos.length === 0) {
      return `📦 *INVENTARIO*
━━━━━━━━━━━━━━━━
📅 ${hoy}

⚠️ No hay productos registrados.

_Agrega productos desde el panel de administración._`;
    }

    // Calcular estadísticas
    const total = productos.length;
    const stockTotal = productos.reduce((s, p) => s + (Number(p.stock) || 0), 0);
    const valorTotal = productos.reduce((s, p) => {
      const stock = Number(p.stock) || 0;
      const precio = Number(p.precioVenta) || Number(p.precio_venta) || Number(p.precio) || 0;
      return s + (stock * precio);
    }, 0);
    
    const sinStock = productos.filter(p => (Number(p.stock) || 0) === 0);
    const stockCritico = productos.filter(p => {
      const stock = Number(p.stock) || 0;
      const minimo = Number(p.stockMinimo) || Number(p.stock_minimo) || 5;
      return stock > 0 && stock <= minimo * 0.5;
    });
    const stockBajo = productos.filter(p => {
      const stock = Number(p.stock) || 0;
      const minimo = Number(p.stockMinimo) || Number(p.stock_minimo) || 5;
      return stock > minimo * 0.5 && stock <= minimo;
    });
    const stockNormal = productos.filter(p => {
      const stock = Number(p.stock) || 0;
      const minimo = Number(p.stockMinimo) || Number(p.stock_minimo) || 5;
      return stock > minimo;
    });

    let respuesta = `📦 *INVENTARIO*
━━━━━━━━━━━━━━━━
📅 ${hoy}

📊 *Resumen:*
• Total productos: ${total}
• Unidades totales: ${stockTotal}
• Valor inventario: $${valorTotal.toFixed(2)}

📈 *Estado del Stock:*
✅ Normal: ${stockNormal.length}
🟡 Bajo: ${stockBajo.length}
🟠 Crítico: ${stockCritico.length}
🔴 Agotado: ${sinStock.length}`;

    // Mostrar productos problemáticos
    const problematicos = [...sinStock.slice(0, 3), ...stockCritico.slice(0, 3), ...stockBajo.slice(0, 2)];
    
    if (problematicos.length > 0) {
      respuesta += `\n\n⚠️ *Requieren atención:*`;
      problematicos.forEach(p => {
        const stock = Number(p.stock) || 0;
        const emoji = stock === 0 ? '🔴' : stock <= 3 ? '🟠' : '🟡';
        respuesta += `\n${emoji} ${p.nombre}: ${stock} unid.`;
      });
    }

    return respuesta;
  },

  async consultarVentas() {
    // Obtener ventas directamente de la API (sin caché)
    let ventas = [];
    
    // USAR TIEMPO SERVIDOR ANTI-FRAUDE
    const hoy = window.TiempoServidor?.obtenerFechaReal() || new Date();
    const fechaHoy = window.TiempoServidor?.obtenerFechaFormateada() || hoy.toLocaleDateString('es-EC');
    const fechaHoyISO = window.TiempoServidor?.obtenerFechaISO() || (() => {
      const y = hoy.getFullYear();
      const m = String(hoy.getMonth() + 1).padStart(2, '0');
      const d = String(hoy.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    })();
    
    try {
      if (window.Auth?._request) {
        const res = await Auth._request('/api/ventas', { method: 'GET' });
        ventas = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        console.log('💰 Ventas API:', ventas.length, 'registros');
        // Debug: mostrar fechas de las primeras ventas
        if (ventas.length > 0) {
          console.log('📅 Fechas muestra:', ventas.slice(0, 3).map(v => v.fecha));
          console.log('📅 Fecha servidor:', fechaHoyISO, '(anti-fraude)');
        }
      }
    } catch (e) {
      console.warn('Error obteniendo ventas:', e.message);
    }

    if (ventas.length === 0) {
      return `💰 *VENTAS*
━━━━━━━━━━━━━━━━
📅 ${fechaHoy}

⚠️ No hay ventas registradas.

_Las ventas aparecerán aquí cuando se realicen._`;
    }

    // Filtrar por período usando strings de fecha
    const ventasHoy = ventas.filter(v => {
      const fechaVenta = (v.fecha || '').split('T')[0].split(' ')[0];
      return fechaVenta === fechaHoyISO;
    });
    
    // Últimos 7 días (usando tiempo servidor)
    const hace7Dias = new Date(hoy);
    hace7Dias.setDate(hoy.getDate() - 7);
    const y7 = hace7Dias.getFullYear();
    const m7 = String(hace7Dias.getMonth() + 1).padStart(2, '0');
    const d7 = String(hace7Dias.getDate()).padStart(2, '0');
    const fecha7DiasISO = `${y7}-${m7}-${d7}`;
    
    const ventasSemana = ventas.filter(v => {
      const fechaVenta = (v.fecha || '').split('T')[0].split(' ')[0];
      return fechaVenta >= fecha7DiasISO;
    });
    
    // Este mes
    const inicioMesISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
    const ventasMes = ventas.filter(v => {
      const fechaVenta = (v.fecha || '').split('T')[0].split(' ')[0];
      return fechaVenta >= inicioMesISO;
    });

    // Calcular totales
    const totalHoy = ventasHoy.reduce((s, v) => s + (Number(v.total) || 0), 0);
    const totalSemana = ventasSemana.reduce((s, v) => s + (Number(v.total) || 0), 0);
    const totalMes = ventasMes.reduce((s, v) => s + (Number(v.total) || 0), 0);
    const ticketPromedio = ventasHoy.length > 0 ? totalHoy / ventasHoy.length : 0;

    let respuesta = `💰 *VENTAS*
━━━━━━━━━━━━━━━━
📅 ${fechaHoy}

📊 *Hoy:*
• Transacciones: ${ventasHoy.length}
• Total: $${totalHoy.toFixed(2)}
• Ticket promedio: $${ticketPromedio.toFixed(2)}

📈 *Períodos:*
• Esta semana: $${totalSemana.toFixed(2)} (${ventasSemana.length} ventas)
• Este mes: $${totalMes.toFixed(2)} (${ventasMes.length} ventas)`;

    // Mostrar últimas ventas de hoy
    if (ventasHoy.length > 0) {
      respuesta += `\n\n🕐 *Ventas de hoy:*`;
      ventasHoy.slice(-5).reverse().forEach(v => {
        const hora = v.hora || '';
        const cliente = v.cliente_nombre || v.clienteNombre || 'Cliente';
        respuesta += `\n• ${hora} - ${cliente}: $${(Number(v.total) || 0).toFixed(2)}`;
      });
    } else {
      // Mostrar las últimas ventas generales
      respuesta += `\n\n🕐 *Últimas ventas:*`;
      ventas.slice(-3).reverse().forEach(v => {
        const fecha = (v.fecha || '').split('T')[0];
        const cliente = v.cliente_nombre || v.clienteNombre || 'Cliente';
        respuesta += `\n• ${fecha}: ${cliente} - $${(Number(v.total) || 0).toFixed(2)}`;
      });
    }

    return respuesta;
  },

  async generarResumen() {
    // Obtener datos directamente de cada API
    let productos = [], ventas = [], clientes = [], citas = [], ordenes = [];
    
    // USAR TIEMPO SERVIDOR ANTI-FRAUDE
    const hoy = window.TiempoServidor?.obtenerFechaReal() || new Date();
    const fechaHoy = window.TiempoServidor?.obtenerFechaFormateada() || hoy.toLocaleDateString('es-EC');
    const horaActual = window.TiempoServidor?.obtenerHora() || hoy.toLocaleTimeString('es-EC', {hour: '2-digit', minute: '2-digit'});
    const fechaHoyISO = window.TiempoServidor?.obtenerFechaISO() || (() => {
      const y = hoy.getFullYear();
      const m = String(hoy.getMonth() + 1).padStart(2, '0');
      const d = String(hoy.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    })();
    
    try {
      if (window.Auth?._request) {
        // Hacer todas las llamadas
        try { productos = await Auth._request('/pos/productos', { method: 'GET' }) || []; } catch(e) {}
        try { ventas = await Auth._request('/api/ventas', { method: 'GET' }) || []; } catch(e) {}
        try { clientes = await Auth._request('/pos/clientes', { method: 'GET' }) || []; } catch(e) {}
        try { 
          const citasRes = await Auth._request('/api/citas', { method: 'GET' });
          citas = Array.isArray(citasRes) ? citasRes : (citasRes?.data || []);
        } catch(e) {}
        try { ordenes = await Auth._request('/api/ordenes-trabajo', { method: 'GET' }) || []; } catch(e) {}
      }
    } catch (e) {}

    // Asegurar arrays
    productos = Array.isArray(productos) ? productos : [];
    ventas = Array.isArray(ventas) ? ventas : (ventas?.data || []);
    clientes = Array.isArray(clientes) ? clientes : [];
    ordenes = Array.isArray(ordenes) ? ordenes : [];

    // Estadísticas de inventario
    const totalProductos = productos.length;
    const stockTotal = productos.reduce((s, p) => s + (Number(p.stock) || 0), 0);
    const valorInventario = productos.reduce((s, p) => {
      const stock = Number(p.stock) || 0;
      const precio = Number(p.precioVenta) || Number(p.precio_venta) || Number(p.precio) || 0;
      return s + (stock * precio);
    }, 0);
    const productosAlerta = productos.filter(p => (Number(p.stock) || 0) <= (Number(p.stockMinimo) || Number(p.stock_minimo) || 5)).length;

    // Estadísticas de ventas - usando comparación de strings
    const ventasHoy = ventas.filter(v => {
      const fechaVenta = (v.fecha || '').split('T')[0].split(' ')[0];
      return fechaVenta === fechaHoyISO;
    });
    const totalVentasHoy = ventasHoy.reduce((s, v) => s + (Number(v.total) || 0), 0);

    // Citas de hoy
    const citasHoy = citas.filter(c => {
      const fechaCita = (c.fecha || '').split('T')[0].split(' ')[0];
      return fechaCita === fechaHoyISO;
    });

    // Órdenes activas
    const ordenesActivas = ordenes.filter(o => 
      o.estado !== 'completado' && o.estado !== 'entregado' && o.estado !== 'cancelado'
    );

    let respuesta = `📊 *RESUMEN DEL NEGOCIO*
━━━━━━━━━━━━━━━━━━━
📅 ${fechaHoy} - ${horaActual}

📦 *INVENTARIO*
• Productos: ${totalProductos}
• Unidades: ${stockTotal}
• Valor: $${valorInventario.toFixed(2)}
• ⚠️ En alerta: ${productosAlerta}

💰 *VENTAS HOY*
• Transacciones: ${ventasHoy.length}
• Total: $${totalVentasHoy.toFixed(2)}

📅 *CITAS HOY*
• Programadas: ${citasHoy.length}

🔧 *ÓRDENES ACTIVAS*
• En proceso: ${ordenesActivas.length}

👥 *CLIENTES*
• Registrados: ${clientes.length}`;

    // Alertas importantes
    if (productosAlerta > 0 || ordenesActivas.length > 5) {
      respuesta += `\n\n⚠️ *ALERTAS:*`;
      if (productosAlerta > 0) respuesta += `\n• ${productosAlerta} productos necesitan restock`;
      if (ordenesActivas.length > 5) respuesta += `\n• ${ordenesActivas.length} órdenes pendientes`;
    }

    return respuesta;
  },

  async consultarCitas() {
    // Obtener citas directamente de la API
    let citas = [];
    
    // USAR TIEMPO SERVIDOR ANTI-FRAUDE
    const hoy = window.TiempoServidor?.obtenerFechaReal() || new Date();
    const fechaHoy = window.TiempoServidor?.obtenerFechaFormateada() || hoy.toLocaleDateString('es-EC');
    const fechaHoyISO = window.TiempoServidor?.obtenerFechaISO() || (() => {
      const y = hoy.getFullYear();
      const m = String(hoy.getMonth() + 1).padStart(2, '0');
      const d = String(hoy.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    })();
    
    try {
      if (window.Auth?._request) {
        const res = await Auth._request('/api/citas', { method: 'GET' });
        citas = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        console.log('📅 Citas API:', citas.length, 'registros');
      }
    } catch (e) {
      console.warn('Error obteniendo citas:', e.message);
    }

    if (citas.length === 0) {
      return `📅 *CITAS*
━━━━━━━━━━━━━━━━
📅 ${fechaHoy}

⚠️ No hay citas registradas.`;
    }

    // Filtrar por período usando strings
    const citasHoy = citas.filter(c => {
      const fechaCita = (c.fecha || '').split('T')[0].split(' ')[0];
      return fechaCita === fechaHoyISO;
    });

    // Próximos 7 días (fecha local)
    const en7Dias = new Date(hoy);
    en7Dias.setDate(hoy.getDate() + 7);
    const y7 = en7Dias.getFullYear();
    const m7 = String(en7Dias.getMonth() + 1).padStart(2, '0');
    const d7 = String(en7Dias.getDate()).padStart(2, '0');
    const fecha7DiasISO = `${y7}-${m7}-${d7}`;
    
    const citasSemana = citas.filter(c => {
      const fechaCita = (c.fecha || '').split('T')[0].split(' ')[0];
      return fechaCita >= fechaHoyISO && fechaCita <= fecha7DiasISO;
    });

    let respuesta = `📅 *CITAS*
━━━━━━━━━━━━━━━━
📅 ${fechaHoy}

📊 *Resumen:*
• Hoy: ${citasHoy.length} citas
• Esta semana: ${citasSemana.length} citas
• Total registradas: ${citas.length}`;

    if (citasHoy.length > 0) {
      respuesta += `\n\n🕐 *Citas de hoy:*`;
      citasHoy.forEach(c => {
        const hora = c.hora || 'Sin hora';
        const cliente = c.cliente_nombre || c.cliente || c.clienteNombre || 'Cliente';
        const servicio = c.tipo_servicio || c.servicio || c.motivo || 'Servicio';
        respuesta += `\n• ${hora}: ${cliente} - ${servicio}`;
      });
    } else if (citasSemana.length > 0) {
      respuesta += `\n\n📆 *Próximas citas:*`;
      citasSemana.slice(0, 5).forEach(c => {
        const fecha = (c.fecha || '').split('T')[0];
        const hora = c.hora || '';
        const cliente = c.cliente_nombre || c.cliente || 'Cliente';
        respuesta += `\n• ${fecha} ${hora}: ${cliente}`;
      });
    }

    return respuesta;
  },

  async consultarOrdenes() {
    // Obtener órdenes directamente de la API
    let ordenes = [];
    const hoy = new Date().toLocaleDateString('es-EC');
    
    try {
      if (window.Auth?._request) {
        const res = await Auth._request('/api/ordenes-trabajo', { method: 'GET' });
        ordenes = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        console.log('🔧 Órdenes API:', ordenes.length, 'registros');
      }
    } catch (e) {
      console.warn('Error obteniendo órdenes:', e.message);
    }

    if (ordenes.length === 0) {
      return `🔧 *ÓRDENES DE TRABAJO*
━━━━━━━━━━━━━━━━━━
📅 ${hoy}

⚠️ No hay órdenes registradas.`;
    }

    const pendientes = ordenes.filter(o => o.estado === 'pendiente');
    const enProceso = ordenes.filter(o => o.estado === 'en_proceso' || o.estado === 'en_progreso');
    const esperando = ordenes.filter(o => o.estado === 'esperando_repuestos');
    const listos = ordenes.filter(o => o.estado === 'listo' || o.estado === 'completado');

    let respuesta = `🔧 *ÓRDENES DE TRABAJO*
━━━━━━━━━━━━━━━━━━
📅 ${hoy}

📊 *Estado actual:*
🟡 Pendientes: ${pendientes.length}
🔵 En proceso: ${enProceso.length}
🟠 Esperando repuestos: ${esperando.length}
🟢 Listos/Completados: ${listos.length}
• Total: ${ordenes.length}`;

    // Mostrar las activas
    const activas = [...pendientes.slice(0, 2), ...enProceso.slice(0, 2)];
    if (activas.length > 0) {
      respuesta += `\n\n📋 *Órdenes activas:*`;
      activas.forEach(o => {
        const cliente = o.clienteNombre || o.cliente || 'Cliente';
        const vehiculo = o.vehiculoDescripcion || o.vehiculo || o.placa || 'Vehículo';
        const estadoEmoji = {
          'pendiente': '🟡',
          'en_proceso': '🔵',
          'en_progreso': '🔵',
          'esperando_repuestos': '🟠',
          'listo': '🟢'
        }[o.estado] || '⚪';
        respuesta += `\n${estadoEmoji} ${vehiculo} - ${cliente}`;
      });
    }

    return respuesta;
  },

  async consultarClientes() {
    const { clientes, ventas } = await this.obtenerDatosReales();
    const hoy = new Date().toLocaleDateString('es-EC');

    if (clientes.length === 0) {
      return `👥 *CLIENTES*
━━━━━━━━━━━━━━━━
📅 ${hoy}

⚠️ No hay clientes registrados.`;
    }

    // Calcular estadísticas
    const totalClientes = clientes.length;
    const conTelefono = clientes.filter(c => c.telefono || c.celular).length;
    const conEmail = clientes.filter(c => c.email).length;

    // Clientes recientes (últimos 7 días)
    const hace7dias = new Date();
    hace7dias.setDate(hace7dias.getDate() - 7);
    const recientes = clientes.filter(c => new Date(c.createdAt || c.fechaRegistro) >= hace7dias);

    let respuesta = `👥 *CLIENTES*
━━━━━━━━━━━━━━━━
📅 ${hoy}

📊 *Estadísticas:*
• Total registrados: ${totalClientes}
• Con teléfono: ${conTelefono}
• Con email: ${conEmail}
• Nuevos (7 días): ${recientes.length}`;

    // Últimos clientes
    const ultimos = clientes.slice(-3).reverse();
    if (ultimos.length > 0) {
      respuesta += `\n\n📋 *Últimos registrados:*`;
      ultimos.forEach(c => {
        const nombre = c.nombre || c.razonSocial || 'Cliente';
        respuesta += `\n• ${nombre}`;
      });
    }

    return respuesta;
  },

  // ============================================
  // UTILIDADES
  // ============================================
  obtenerNombreNegocio() {
    try {
      if (window.Database) {
        const config = Database.get('configuracion_avanzada') || Database.get('configuracionAvanzada') || {};
        return config.negocio?.nombre || config.general?.nombreNegocio || 'Mi Negocio';
      }
    } catch {}
    return 'Mi Negocio';
  },

  esUsuarioAdmin(chatId) {
    const chatIdStr = String(chatId);
    
    // Verificar en TelegramNotificaciones
    if (window.TelegramNotificaciones) {
      // Si el chatId está en la lista de chatIds configurados, es admin
      const chatIds = TelegramNotificaciones.config?.chatIds || [];
      if (chatIds.includes(chatIdStr) || chatIds.includes(Number(chatId))) {
        return true;
      }
      
      // Verificar tipo de usuario registrado
      const usuario = TelegramNotificaciones.getUsuario?.(chatIdStr);
      if (usuario?.tipo === 'ADMIN' || usuario?.tipo === 'SECRETARIO') {
        return true;
      }
    }
    
    // También verificar en localStorage
    try {
      const telegramConfig = localStorage.getItem('telegram_config');
      if (telegramConfig) {
        const config = JSON.parse(telegramConfig);
        const chatIds = config.chatIds || [];
        if (chatIds.includes(chatIdStr) || chatIds.includes(Number(chatId))) {
          return true;
        }
      }
    } catch (e) {}
    
    return false;
  },

  registrarUsuarioSiNuevo(chatId, usuario) {
    if (window.TelegramNotificaciones?.setUsuario) {
      const existente = TelegramNotificaciones.getUsuario?.(chatId);
      if (!existente) {
        TelegramNotificaciones.setUsuario(chatId, {
          nombre: `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim(),
          username: usuario.username,
          tipo: 'CLIENTE',
          fechaRegistro: new Date().toISOString()
        });
      }
    }

    if (!this.conversacionesPorUsuario[chatId]) {
      this.conversacionesPorUsuario[chatId] = {
        usuario: { id: usuario.id, nombre: usuario.first_name },
        mensajes: [],
        primeraConversacion: new Date().toISOString()
      };
    }
  },

  // ============================================
  // ENVÍO DE MENSAJES
  // ============================================
  async enviarMensaje(chatId, contenido) {
    if (!contenido) return;
    if (!this.config.botToken) return;

    // Si es objeto con botones, enviar con botones
    if (typeof contenido === 'object' && contenido.texto && contenido.botones) {
      return await this.enviarMensajeConBotones(chatId, contenido.texto, contenido.botones);
    }

    const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: contenido,
          parse_mode: 'Markdown'
        })
      });

      const data = await response.json();

      // Guardar en historial
      this.agregarAlHistorial({
        id: data.result?.message_id || Date.now(),
        tipo: 'saliente',
        chatId,
        mensaje: contenido,
        timestamp: new Date().toISOString()
      });

      return data;
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      return null;
    }
  },

  async enviarMensajeConBotones(chatId, texto, botones) {
    if (!this.config.botToken) return;

    const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: texto,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: botones
          }
        })
      });

      const data = await response.json();

      this.agregarAlHistorial({
        id: data.result?.message_id || Date.now(),
        tipo: 'saliente',
        chatId,
        mensaje: texto,
        conBotones: true,
        timestamp: new Date().toISOString()
      });

      return data;
    } catch (error) {
      console.error('Error enviando mensaje con botones:', error);
      return null;
    }
  },

  agregarAlHistorial(mensaje) {
    this.historialGlobal.push(mensaje);
    this.guardarHistorial();
    
    const chatId = mensaje.chatId;
    if (chatId && this.conversacionesPorUsuario[chatId]) {
      this.conversacionesPorUsuario[chatId].mensajes.push(mensaje);
      this.conversacionesPorUsuario[chatId].ultimaActividad = new Date().toISOString();
      this.guardarConversaciones();
    }

    window.dispatchEvent(new CustomEvent('telegram-nuevo-mensaje', { detail: mensaje }));
  },

  // ============================================
  // API PÚBLICA
  // ============================================
  getHistorial() {
    return this.historialGlobal;
  },

  getConversacion(chatId) {
    return this.conversacionesPorUsuario[String(chatId)] || null;
  },

  getTodasConversaciones() {
    return this.conversacionesPorUsuario;
  },

  getEstado() {
    return {
      activo: this.estado.iniciado,
      polling: !!this.estado.polling,
      ultimoError: this.estado.ultimoError,
      mensajesEnHistorial: this.historialGlobal.length,
      conversacionesActivas: Object.keys(this.conversacionesPorUsuario).length
    };
  },

  async reiniciar() {
    this.detenerPolling();
    this.cargarConfiguracion();
    await this.iniciarPolling();
    return this.estado.iniciado;
  }
};

// ============================================
// AUTO-INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    TelegramIAAssistant.init().then(iniciado => {
      if (iniciado) {
        console.log('✅ Telegram IA Assistant listo con botones interactivos');
      }
    });
  }, 2000);
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => {
    if (!TelegramIAAssistant.estado.iniciado) {
      TelegramIAAssistant.init();
    }
  }, 3000);
}

} // Cierre del else del singleton
