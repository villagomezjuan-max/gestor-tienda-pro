/**
 * TELEGRAM BOT MANAGER
 * Sistema completo de bot bidireccional con IA
 * Integra con AgendaIAAgent para crear citas automáticas
 */

window.TelegramBotManager = {
  config: {
    botToken: '',
    webhookUrl: '',
    pollingInterval: 3000,
    enabled: false
  },
  
  polling: null,
  lastUpdateId: 0,
  handlers: new Map(),
  conversaciones: new Map(),
  
  async init() {
    console.log('🤖 Inicializando Telegram Bot Manager...');
    
    this.loadConfig();
    
    if (!this.config.enabled || !this.config.botToken) {
      console.warn('⚠️ Telegram Bot no configurado');
      return false;
    }
    
    this.registerHandlers();
    // DESACTIVADO: El polling lo maneja TelegramIAAssistant para evitar error 409
    // this.startPolling();
    
    console.log('✅ Telegram Bot Manager listo (polling delegado a TelegramIAAssistant)');
    return true;
  },
  
  loadConfig() {
    const config = window.TelegramNotificaciones?.config || {};
    this.config.botToken = config.botToken || '';
    this.config.enabled = config.activo || false;
  },
  
  // DESHABILITADO: El polling exclusivo lo maneja TelegramIAAssistant
  // para evitar errores 409 (conflicto de múltiples instancias)
  startPolling() {
    console.log('⚠️ TelegramBotManager.startPolling está deshabilitado - usa TelegramIAAssistant');
    return; // No hacer nada - polling delegado a TelegramIAAssistant
  },
  
  stopPolling() {
    if (this.polling) {
      clearInterval(this.polling);
      this.polling = null;
      console.log('📡 Polling detenido');
    }
  },
  
  // DESHABILITADO: Para evitar conflictos 409 con TelegramIAAssistant
  async getUpdates() {
    console.log('⚠️ TelegramBotManager.getUpdates está deshabilitado - usa TelegramIAAssistant');
    return; // No hacer nada - polling delegado a TelegramIAAssistant
  },
  
  async processUpdate(update) {
    if (update.message) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    }
  },
  
  async handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text || '';
    const from = message.from;
    
    console.log(`📨 Mensaje de ${from.first_name} (${chatId}): ${text}`);
    
    if (text.startsWith('/')) {
      return await this.handleCommand(chatId, text, from);
    }
    
    const handler = this.handlers.get(chatId);
    if (handler) {
      return await handler(message);
    }
    
    return await this.handleAgendaCita(chatId, text, from);
  },
  
  async handleCommand(chatId, command, from) {
    switch (command.toLowerCase()) {
      case '/start':
        await this.sendMessage(chatId, 
          `¡Hola ${from.first_name}! 👋\n\n` +
          'Soy el asistente del taller. Puedo ayudarte a:\n' +
          '• 📅 Agendar citas\n' +
          '• 🔍 Consultar estado de tu vehículo\n' +
          '• 📝 Ver historial de servicios\n' +
          '• 💰 Solicitar presupuestos\n\n' +
          'Escríbeme lo que necesitas en lenguaje natural.'
        );
        break;
        
      case '/ayuda':
      case '/help':
        await this.sendMessage(chatId,
          '🆘 *Cómo usar el bot:*\n\n' +
          '*Agendar cita:*\n' +
          '"Necesito cambio de aceite para mi Toyota Corolla"\n\n' +
          '*Consultar estado:*\n' +
          '"¿Está listo mi vehículo? Placa ABC-1234"\n\n' +
          '*Comandos:*\n' +
          '/start - Iniciar\n' +
          '/ayuda - Esta ayuda\n' +
          '/cancelar - Cancelar operación',
          { parse_mode: 'Markdown' }
        );
        break;
        
      case '/cancelar':
        this.conversaciones.delete(chatId);
        this.handlers.delete(chatId);
        await this.sendMessage(chatId, '❌ Operación cancelada');
        break;
        
      default:
        await this.sendMessage(chatId, 
          '❓ Comando no reconocido. Usa /ayuda para ver los comandos disponibles.'
        );
    }
  },
  
  async handleAgendaCita(chatId, texto, from) {
    try {
      let conversacion = this.conversaciones.get(chatId);
      if (!conversacion) {
        conversacion = {
          chatId,
          usuario: from,
          telefono: from.username || chatId.toString(),
          citaParcial: {},
          historial: []
        };
        this.conversaciones.set(chatId, conversacion);
      }
      
      conversacion.historial.push({
        role: 'user',
        content: texto
      });
      
      if (window.IAUnifiedEngine && IAUnifiedEngine.isConfigured && IAUnifiedEngine.isConfigured()) {
        const systemPrompt = `Eres un asistente de taller automotriz. Extrae información para agendar citas.
        
Responde SOLO con JSON:
{
  "mensaje": "Respuesta al cliente",
  "datos_extraidos": {
    "cliente_nombre": string,
    "cliente_telefono": string,
    "vehiculo_marca": string,
    "vehiculo_modelo": string,
    "vehiculo_placa": string,
    "vehiculo_anio": number,
    "servicio": string,
    "problema": string,
    "fecha": "YYYY-MM-DD",
    "hora": "HH:MM"
  },
  "campos_faltantes": [string],
  "accion": "solicitar_datos" | "confirmar" | "completar"
}`;

        const userMessage = `Conversación hasta ahora:
${conversacion.historial.map(m => `${m.role}: ${m.content}`).join('\n')}

Datos acumulados:
${JSON.stringify(conversacion.citaParcial, null, 2)}

Nuevo mensaje del cliente: "${texto}"

¿Qué información nueva podemos extraer y qué falta?`;

        const respuesta = await IAUnifiedEngine.sendMessage(userMessage, systemPrompt);
        const parsed = this.parseRespuesta(respuesta);
        
        if (parsed.datos_extraidos) {
          conversacion.citaParcial = {
            ...conversacion.citaParcial,
            ...parsed.datos_extraidos,
            cliente_telefono: conversacion.citaParcial.cliente_telefono || conversacion.telefono
          };
        }
        
        await this.sendMessage(chatId, parsed.mensaje);
        
        conversacion.historial.push({
          role: 'assistant',
          content: parsed.mensaje
        });
        
        if (parsed.accion === 'completar' || (parsed.campos_faltantes && parsed.campos_faltantes.length === 0)) {
          await this.crearCitaAutomatica(chatId, conversacion.citaParcial);
        }
        
      } else {
        await this.sendMessage(chatId,
          '📝 Para agendar tu cita necesito:\n' +
          '• Nombre completo\n' +
          '• Marca, modelo y placa del vehículo\n' +
          '• Tipo de servicio\n' +
          '• Fecha y hora preferida\n\n' +
          'Por favor envíame estos datos.'
        );
      }
    } catch (error) {
      console.error('Error en handleAgendaCita:', error);
      await this.sendMessage(chatId, 
        '❌ Hubo un error. Por favor intenta de nuevo.'
      );
    }
  },
  
  parseRespuesta(respuesta) {
    try {
      // Intentar parsear directamente
      return JSON.parse(respuesta);
    } catch (e) {
      // Buscar JSON en el texto
      const jsonMatch = respuesta.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          // Fallback
        }
      }
    }
    
    return {
      mensaje: respuesta.substring(0, 200),
      datos_extraidos: {},
      campos_faltantes: [],
      accion: 'solicitar_datos'
    };
  },
  
  async crearCitaAutomatica(chatId, datos) {
    try {
      console.log('📅 Creando cita automática:', datos);
      
      Utils.showToast?.('Creando cita...', 'info');
      
      const cliente = await this.buscarOCrearCliente(datos);
      const vehiculo = await this.buscarOCrearVehiculo(datos, cliente.id);
      
      const cita = {
        cliente_id: cliente.id,
        vehiculo_id: vehiculo.id,
        fecha: datos.fecha,
        hora: datos.hora,
        duracion: datos.duracion_estimada || 60,
        servicio: datos.servicio,
        descripcion: datos.problema || datos.notas_adicionales,
        estado: 'confirmada',
        prioridad: datos.prioridad || 'normal',
        recordatorio_24h: true,
        origen: 'telegram'
      };
      
      const citaCreada = await (window.DatabaseAPI?.createCita?.(cita) || 
                                window.Database?.addItem?.('citas', cita));
      
      const orden = {
        clienteId: cliente.id,
        vehiculoId: vehiculo.id,
        citaId: citaCreada?.id,
        descripcion: datos.problema || datos.servicio,
        servicioSolicitado: datos.servicio,
        fechaRecepcion: datos.fecha,
        estado: 'pendiente',
        prioridad: datos.prioridad || 'normal',
        kilometraje: datos.vehiculo_kilometraje || vehiculo.kilometraje,
        notificarAvances: true,
        requiereContacto: true
      };
      
      const ordenCreada = await (window.DatabaseAPI?.createOrdenTrabajo?.(orden) ||
                                  window.Database?.addItem?.('ordenes_trabajo', orden));
      
      await this.sendMessage(chatId,
        `✅ *Cita confirmada!*\n\n` +
        `📅 Fecha: ${this.formatearFecha(datos.fecha)}\n` +
        `🕒 Hora: ${datos.hora}\n` +
        `🚗 Vehículo: ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placa})\n` +
        `🔧 Servicio: ${datos.servicio}\n\n` +
        `Te enviaremos un recordatorio 24 horas antes.\n` +
        `Orden de trabajo #${ordenCreada?.id || 'generada'} creada.`,
        { parse_mode: 'Markdown' }
      );
      
      this.conversaciones.delete(chatId);
      
      console.log('✅ Cita creada exitosamente');
      
    } catch (error) {
      console.error('Error creando cita:', error);
      await this.sendMessage(chatId,
        '❌ Hubo un problema creando tu cita. Por favor contacta al taller directamente.'
      );
    }
  },
  
  async buscarOCrearCliente(datos) {
    const db = window.DatabaseAPI || window.Database;
    if (!db) throw new Error('Database no disponible');
    
    let clientes = await (db.getClientes?.() || db.getCollection?.('clientes') || []);
    if (!Array.isArray(clientes)) clientes = [];
    
    let cliente = clientes.find(c => 
      c.telefono === datos.cliente_telefono ||
      c.cedula === datos.cliente_cedula ||
      c.nombre?.toLowerCase() === datos.cliente_nombre?.toLowerCase()
    );
    
    if (!cliente) {
      const nuevoCliente = {
        nombre: datos.cliente_nombre,
        cedula: datos.cliente_cedula,
        telefono: datos.cliente_telefono,
        email: datos.cliente_email,
        direccion: datos.cliente_direccion,
        ciudad: datos.cliente_ciudad,
        origen: 'telegram',
        telegram_chat_id: datos.chatId
      };
      
      cliente = await (db.createCliente?.(nuevoCliente) || 
                       db.addItem?.('clientes', nuevoCliente));
      
      console.log('✅ Cliente nuevo creado');
    } else {
      // Actualizar telegram_chat_id si no lo tiene
      if (!cliente.telegram_chat_id && datos.chatId) {
        await (db.updateCliente?.(cliente.id, { telegram_chat_id: datos.chatId }) ||
               db.updateItem?.('clientes', cliente.id, { telegram_chat_id: datos.chatId }));
      }
      console.log('✅ Cliente existente encontrado');
    }
    
    return cliente;
  },
  
  async buscarOCrearVehiculo(datos, clienteId) {
    const db = window.DatabaseAPI || window.Database;
    
    let vehiculos = await (db.getVehiculos?.({ clienteId }) || 
                          db.getCollection?.('vehiculos') || []);
    if (!Array.isArray(vehiculos)) vehiculos = [];
    
    vehiculos = vehiculos.filter(v => v.cliente_id === clienteId);
    
    let vehiculo = vehiculos.find(v =>
      v.placa === datos.vehiculo_placa ||
      (v.marca === datos.vehiculo_marca && v.modelo === datos.vehiculo_modelo)
    );
    
    if (!vehiculo) {
      const nuevoVehiculo = {
        cliente_id: clienteId,
        marca: datos.vehiculo_marca,
        modelo: datos.vehiculo_modelo,
        placa: datos.vehiculo_placa,
        color: datos.vehiculo_color,
        anio: datos.vehiculo_anio,
        kilometraje: datos.vehiculo_kilometraje,
        vin: datos.vehiculo_vin
      };
      
      vehiculo = await (db.createVehiculo?.(nuevoVehiculo) ||
                       db.addItem?.('vehiculos', nuevoVehiculo));
      
      console.log('✅ Vehículo nuevo creado');
    } else {
      console.log('✅ Vehículo existente encontrado');
    }
    
    return vehiculo;
  },
  
  async sendMessage(chatId, text, options = {}) {
    const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          ...options
        })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      throw error;
    }
  },
  
  formatearFecha(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-EC', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  },
  
  registerHandlers() {
    // Handlers se pueden agregar dinámicamente
  },
  
  async handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    await this.answerCallbackQuery(query.id);
  },
  
  async answerCallbackQuery(queryId, text = '') {
    const url = `https://api.telegram.org/bot${this.config.botToken}/answerCallbackQuery`;
    
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: queryId,
        text
      })
    });
  }
};

// Auto-inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => TelegramBotManager.init(), 2000);
  });
} else {
  setTimeout(() => TelegramBotManager.init(), 2000);
}

