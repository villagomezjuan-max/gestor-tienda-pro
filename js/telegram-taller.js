/* ========================================
   MÓDULO: INTEGRACIÓN DE TELEGRAM PARA TALLER
   Sistema de notificaciones automáticas vía Telegram
   ======================================== */

const TelegramTaller = {
  STORAGE_KEY: 'telegram_config',
  BOT_TOKEN_KEY: 'telegram_bot_token',
  // Configuración del bot
  config: {
    botToken: '',
    baseURL: 'https://api.telegram.org/bot',
    webhookURL: '',
    enabled: false,
  },

  // Estados de configuración
  isConfigured: false,
  isConnected: false,

  /**
   * Inicializa el módulo de Telegram
   */
  async init() {
    console.log('📱 Inicializando integración de Telegram...');
    this.config.botToken = this.getStoredValue(this.BOT_TOKEN_KEY) || '';
    await this.verificarConfiguracion();
    await this.cargarHistorialChats();

    if (this.config.enabled && this.config.botToken) {
      await this.verificarConexion();
    }
  },

  /**
   * Verifica la configuración guardada
   */
  async verificarConfiguracion() {
    let storedConfig = null;
    if (window.TenantStorage && typeof TenantStorage.getJSON === 'function') {
      storedConfig = TenantStorage.getJSON(this.STORAGE_KEY, null);
    } else if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      storedConfig = raw ? JSON.parse(raw) : null;
    }

    if (storedConfig) {
      try {
        this.config = { ...this.config, ...storedConfig };
        this.isConfigured = this.config.botToken && this.config.botToken.length > 0;
      } catch (error) {
        console.error('Error cargando configuración de Telegram:', error);
      }
    }
  },

  /**
   * Configura el bot de Telegram
   */
  async configurarBot(botToken, webhookURL = '') {
    try {
      // Verificar que el token sea válido
      const response = await this.verificarToken(botToken);

      if (response.ok) {
        this.config.botToken = botToken;
        this.config.webhookURL = webhookURL;
        this.config.enabled = true;

        // Guardar configuración
        this.setStoredValue(this.BOT_TOKEN_KEY, botToken);
        this.setStoredConfig(this.config);

        this.isConfigured = true;
        this.isConnected = true;

        Utils.showToast('Bot de Telegram configurado exitosamente', 'success');
        return { success: true };
      } else {
        throw new Error('Token de bot inválido');
      }
    } catch (error) {
      console.error('Error configurando bot:', error);
      Utils.showToast('Error al configurar bot: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  },

  getStoredValue(key) {
    try {
      if (window.TenantStorage && typeof TenantStorage.getItem === 'function') {
        return TenantStorage.getItem(key);
      }
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`TelegramTaller.getStoredValue: no se pudo leer ${key}`, error);
      return null;
    }
  },

  setStoredValue(key, value) {
    try {
      if (window.TenantStorage && typeof TenantStorage.setItem === 'function') {
        TenantStorage.setItem(key, value);
      } else if (typeof localStorage !== 'undefined') {
        if (value === null || value === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, value);
        }
      }
    } catch (error) {
      console.warn(`TelegramTaller.setStoredValue: no se pudo persistir ${key}`, error);
    }
  },

  setStoredConfig(config) {
    try {
      if (window.TenantStorage && typeof TenantStorage.setJSON === 'function') {
        TenantStorage.setJSON(this.STORAGE_KEY, config);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
      }
    } catch (error) {
      console.warn('TelegramTaller.setStoredConfig: no se pudo guardar la configuración', error);
    }
  },

  /**
   * Verifica si el token del bot es válido
   */
  async verificarToken(token) {
    try {
      const response = await fetch(`${this.config.baseURL}${token}/getMe`);
      return response;
    } catch (error) {
      console.error('Error verificando token:', error);
      return { ok: false };
    }
  },

  /**
   * Verifica la conexión actual con Telegram
   */
  async verificarConexion() {
    if (!this.config.botToken) {
      this.isConnected = false;
      return false;
    }

    try {
      const response = await fetch(`${this.config.baseURL}${this.config.botToken}/getMe`);
      this.isConnected = response.ok;
      return this.isConnected;
    } catch (error) {
      console.error('Error verificando conexión:', error);
      this.isConnected = false;
      return false;
    }
  },

  /**
   * Envía un mensaje a un chat específico
   */
  async enviarMensaje(chatId, mensaje, opciones = {}) {
    if (!this.isConnected) {
      console.warn('Bot de Telegram no está conectado');
      return { success: false, error: 'Bot no conectado' };
    }

    try {
      const payload = {
        chat_id: chatId,
        text: mensaje,
        parse_mode: opciones.parse_mode || 'HTML',
        disable_notification: opciones.silent || false,
        ...opciones,
      };

      const response = await fetch(`${this.config.baseURL}${this.config.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.ok) {
        // Guardar en historial
        await this.guardarEnHistorial(chatId, mensaje, 'enviado', result.result.message_id);
        return { success: true, messageId: result.result.message_id };
      } else {
        throw new Error(result.description || 'Error enviando mensaje');
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Envía recordatorio de mantenimiento
   */
  async enviarRecordatorioMantenimiento(cliente, vehiculo, tipoServicio, fechaVencimiento) {
    if (!cliente.telegram_chat_id) {
      console.warn('Cliente no tiene chat ID de Telegram:', cliente.nombre);
      return { success: false, error: 'Cliente sin Telegram' };
    }

    const mensaje = this.generarMensajeMantenimiento(
      cliente,
      vehiculo,
      tipoServicio,
      fechaVencimiento
    );

    const resultado = await this.enviarMensaje(cliente.telegram_chat_id, mensaje, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📞 Llamar Taller', url: `tel:+573001234567` },
            { text: '📅 Agendar Cita', callback_data: `agendar_${vehiculo.id}` },
          ],
        ],
      },
    });

    // Marcar notificación como enviada
    if (resultado.success) {
      await this.marcarNotificacionEnviada(
        cliente.id,
        vehiculo.id,
        tipoServicio,
        resultado.messageId
      );
    }

    return resultado;
  },

  /**
   * Genera mensaje personalizado de mantenimiento
   */
  generarMensajeMantenimiento(cliente, vehiculo, tipoServicio, fechaVencimiento) {
    const servicios = {
      aceite_motor: '🛢️ Cambio de Aceite de Motor',
      filtro_aceite: '🔧 Cambio de Filtro de Aceite',
      filtro_aire: '💨 Cambio de Filtro de Aire',
      frenos: '🛑 Revisión de Sistema de Frenos',
      rotacion_llantas: '🔄 Rotación de Llantas',
      alineacion_balanceo: '⚖️ Alineación y Balanceo',
      correa_distribucion: '⚙️ Cambio de Correa de Distribución',
      refrigerante: '🌡️ Cambio de Refrigerante',
      bateria: '🔋 Revisión de Batería',
      aire_acondicionado: '❄️ Mantenimiento de A/C',
    };

    const nombreServicio = servicios[tipoServicio] || tipoServicio;
    const fechaFormateada = new Date(fechaVencimiento).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
🔔 <b>Recordatorio de Mantenimiento - Taller AutoPro</b>

¡Hola ${cliente.nombre}! 👋

Es momento de realizar el <b>${nombreServicio}</b> de tu vehículo:

🚗 <b>Vehículo:</b> ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio || ''}
🏷️ <b>Placa:</b> ${vehiculo.placa}
📅 <b>Fecha recomendada:</b> ${fechaFormateada}

🔧 <b>¿Por qué es importante?</b>
${this.obtenerImportanciaServicio(tipoServicio)}

💬 <b>¡Agenda tu cita ya!</b>
Llámanos o escríbenos para coordinar la fecha más conveniente.

📞 Teléfono: +57 (300) 123-4567
📍 Dirección: Calle 123 #45-67, Bogotá
🕒 Horario: Lun-Vie 8AM-6PM, Sáb 8AM-2PM

¡Gracias por confiar en nosotros! 🙏
        `.trim();
  },

  /**
   * Obtiene la explicación de importancia del servicio
   */
  obtenerImportanciaServicio(tipoServicio) {
    const explicaciones = {
      aceite_motor:
        'El aceite lubrica el motor y evita el desgaste prematuro. Un cambio oportuno prolonga la vida útil del motor.',
      filtro_aceite:
        'Un filtro limpio mantiene el aceite libre de impurezas y protege los componentes internos del motor.',
      filtro_aire:
        'Un filtro de aire sucio reduce la potencia y aumenta el consumo de combustible.',
      frenos:
        'La seguridad es lo primero. Revisar los frenos previene accidentes y garantiza tu tranquilidad.',
      rotacion_llantas:
        'La rotación regular de llantas asegura un desgaste uniforme y prolonga su vida útil.',
      alineacion_balanceo:
        'Mejora la estabilidad del vehículo y previene el desgaste irregular de las llantas.',
      correa_distribucion:
        '⚠️ CRÍTICO: Si se rompe puede dañar gravemente el motor. Es un mantenimiento preventivo esencial.',
      refrigerante: 'Mantiene la temperatura del motor estable y previene el sobrecalentamiento.',
      bateria:
        'Una batería en buen estado asegura el arranque confiable y el funcionamiento de los sistemas eléctricos.',
      aire_acondicionado: 'Mantiene el sistema funcionando eficientemente y previene malos olores.',
    };

    return (
      explicaciones[tipoServicio] ||
      'Mantener tu vehículo al día con el mantenimiento previene averías costosas.'
    );
  },

  /**
   * Envía notificación de orden lista para entrega
   */
  async enviarNotificacionEntrega(cliente, vehiculo, orden) {
    if (!cliente.telegram_chat_id) {
      return { success: false, error: 'Cliente sin Telegram' };
    }

    const mensaje = `
🎉 <b>¡Tu vehículo está listo! - Taller AutoPro</b>

Hola ${cliente.nombre}! 👋

Tu vehículo ya está reparado y listo para recoger:

🚗 <b>Vehículo:</b> ${vehiculo.marca} ${vehiculo.modelo}
🏷️ <b>Placa:</b> ${vehiculo.placa}
📋 <b>Orden #:</b> ${orden.numero}

✅ <b>Trabajo realizado:</b>
${orden.problema_reportado}

💰 <b>Total a pagar:</b> $${(orden.total || 0).toLocaleString('es-CO')}

📞 <b>Para recoger tu vehículo:</b>
• Llámanos para confirmar disponibilidad
• Trae tu documento de identidad
• Ten listo el pago (efectivo o transferencia)

📞 Teléfono: +57 (300) 123-4567
📍 Dirección: Calle 123 #45-67, Bogotá
🕒 Horario: Lun-Vie 8AM-6PM, Sáb 8AM-2PM

¡Gracias por confiar en nuestro servicio! 🙏
        `.trim();

    return await this.enviarMensaje(cliente.telegram_chat_id, mensaje, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📞 Llamar para Recoger', url: `tel:+573001234567` },
            { text: '📍 Ver Ubicación', url: 'https://maps.google.com/?q=Taller+AutoPro' },
          ],
        ],
      },
    });
  },

  /**
   * Envía notificación de repuestos disponibles
   */
  async enviarNotificacionRepuestos(cliente, vehiculo, repuestos) {
    if (!cliente.telegram_chat_id) {
      return { success: false, error: 'Cliente sin Telegram' };
    }

    const listaRepuestos = repuestos
      .map((r) => `• ${r.nombre} - $${r.precio.toLocaleString('es-CO')}`)
      .join('\n');

    const mensaje = `
📦 <b>¡Repuestos Disponibles! - Taller AutoPro</b>

Hola ${cliente.nombre}! 👋

Los repuestos para tu vehículo ya llegaron:

🚗 <b>Vehículo:</b> ${vehiculo.marca} ${vehiculo.modelo} - ${vehiculo.placa}

📦 <b>Repuestos disponibles:</b>
${listaRepuestos}

🔧 <b>¡Podemos continuar con la reparación!</b>
Confirma si autorizas el trabajo para programar la instalación.

📞 Contáctanos: +57 (300) 123-4567
        `.trim();

    return await this.enviarMensaje(cliente.telegram_chat_id, mensaje, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Autorizar Trabajo', callback_data: `autorizar_${vehiculo.id}` },
            { text: '📞 Llamar Taller', url: `tel:+573001234567` },
          ],
        ],
      },
    });
  },

  /**
   * Guarda mensaje en historial
   */
  async guardarEnHistorial(chatId, mensaje, tipo, messageId) {
    try {
      const historial = {
        chat_id: chatId,
        mensaje: mensaje.substring(0, 500), // Limitar longitud
        tipo: tipo,
        telegram_message_id: messageId,
        fecha_envio: new Date().toISOString(),
        entregado: true,
      };

      const endpoint = Utils.apiUrl('/api/notificaciones-enviadas');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historial),
      });

      return response.ok;
    } catch (error) {
      console.error('Error guardando historial:', error);
      return false;
    }
  },

  /**
   * Marca notificación como enviada
   */
  async marcarNotificacionEnviada(clienteId, vehiculoId, tipoServicio, messageId) {
    try {
      const notificacion = {
        cliente_id: clienteId,
        vehiculo_id: vehiculoId,
        tipo_servicio: tipoServicio,
        telegram_message_id: messageId,
        fecha_envio: new Date().toISOString(),
        entregado: true,
      };

      const endpoint = Utils.apiUrl('/api/notificaciones-enviadas');
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificacion),
      });
    } catch (error) {
      console.error('Error marcando notificación:', error);
    }
  },

  /**
   * Carga el historial de chats
   */
  async cargarHistorialChats() {
    try {
      const endpoint = Utils.apiUrl('/api/notificaciones-enviadas');
      const response = await fetch(endpoint);
      const historial = await response.json();
      this.historialChats = historial || [];
    } catch (error) {
      console.error('Error cargando historial de chats:', error);
      this.historialChats = [];
    }
  },

  /**
   * Obtiene estadísticas de notificaciones
   */
  async obtenerEstadisticas(dias = 30) {
    try {
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - dias);

      const desde = encodeURIComponent(fechaInicio.toISOString());
      const endpoint = Utils.apiUrl(`/api/notificaciones-enviadas?fecha_desde=${desde}`);
      const response = await fetch(endpoint);
      const notificaciones = await response.json();

      return {
        total: notificaciones.length,
        entregadas: notificaciones.filter((n) => n.entregado).length,
        fallidas: notificaciones.filter((n) => !n.entregado).length,
        por_tipo: this.agruparPorTipo(notificaciones),
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return { total: 0, entregadas: 0, fallidas: 0, por_tipo: {} };
    }
  },

  /**
   * Agrupa notificaciones por tipo
   */
  agruparPorTipo(notificaciones) {
    return notificaciones.reduce((grupos, notif) => {
      const tipo = notif.tipo_servicio || notif.tipo || 'general';
      grupos[tipo] = (grupos[tipo] || 0) + 1;
      return grupos;
    }, {});
  },

  /**
   * Renderiza el formulario de configuración
   */
  renderizarConfiguracion() {
    return `
            <div class="telegram-config-container">
                <div class="config-header">
                    <h3><i class="fab fa-telegram-plane"></i> Configuración de Telegram</h3>
                    <div class="status-indicator ${this.isConnected ? 'connected' : 'disconnected'}">
                        <i class="fas fa-circle"></i>
                        ${this.isConnected ? 'Conectado' : 'Desconectado'}
                    </div>
                </div>

                <div class="config-section">
                    <h4>1. Crear Bot de Telegram</h4>
                    <p>Para usar las notificaciones automáticas, necesitas crear un bot:</p>
                    <ol>
                        <li>Busca <strong>@BotFather</strong> en Telegram</li>
                        <li>Envía el comando <code>/newbot</code></li>
                        <li>Sigue las instrucciones para crear tu bot</li>
                        <li>Copia el token que te proporciona</li>
                    </ol>
                </div>

                <form id="telegram-config-form" onsubmit="TelegramTaller.guardarConfiguracion(event)">
                    <div class="config-section">
                        <h4>2. Configurar Bot</h4>
                        <div class="form-group">
                            <label for="bot-token">Token del Bot:</label>
                            <input type="text" id="bot-token" name="botToken" 
                                   value="${this.config.botToken}" 
                                   placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyZ" 
                                   required>
                            <small>El token debe tener el formato: números:letras</small>
                        </div>

                        <div class="form-group">
                            <label for="webhook-url">URL de Webhook (Opcional):</label>
                            <input type="url" id="webhook-url" name="webhookURL" 
                                   value="${this.config.webhookURL}" 
                                   placeholder="https://tu-servidor.com/telegram/webhook">
                            <small>Para recibir respuestas automáticas (avanzado)</small>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Guardar Configuración
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="TelegramTaller.probarConexion()">
                                <i class="fas fa-satellite-dish"></i> Probar Conexión
                            </button>
                        </div>
                    </div>
                </form>

                <div class="config-section">
                    <h4>3. Configurar Clientes</h4>
                    <p>Para que los clientes reciban notificaciones, deben:</p>
                    <ol>
                        <li>Buscar tu bot en Telegram</li>
                        <li>Iniciar conversación con <code>/start</code></li>
                        <li>Proporcionar su número de teléfono para vincular su cuenta</li>
                    </ol>
                    <button class="btn btn-info" onclick="TelegramTaller.mostrarCodigoQR()">
                        <i class="fas fa-qrcode"></i> Generar QR del Bot
                    </button>
                </div>

                ${
                  this.isConnected
                    ? `
                    <div class="config-section">
                        <h4>4. Estadísticas</h4>
                        <div id="telegram-stats" class="stats-container">
                            <p>Cargando estadísticas...</p>
                        </div>
                    </div>
                `
                    : ''
                }
            </div>
        `;
  },

  /**
   * Guarda la configuración del formulario
   */
  async guardarConfiguracion(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const botToken = formData.get('botToken').trim();
    const webhookURL = formData.get('webhookURL').trim();

    if (!botToken) {
      Utils.showToast('El token del bot es requerido', 'error');
      return;
    }

    const resultado = await this.configurarBot(botToken, webhookURL);

    if (resultado.success && this.isConnected) {
      // Cargar estadísticas si está conectado
      this.cargarEstadisticas();
    }
  },

  /**
   * Prueba la conexión con el bot
   */
  async probarConexion() {
    const connected = await this.verificarConexion();

    if (connected) {
      Utils.showToast('✅ Conexión exitosa con Telegram', 'success');
    } else {
      Utils.showToast('❌ Error de conexión. Verifica el token', 'error');
    }

    // Actualizar indicador visual
    const indicator = document.querySelector('.status-indicator');
    if (indicator) {
      indicator.className = `status-indicator ${connected ? 'connected' : 'disconnected'}`;
      indicator.innerHTML = `<i class="fas fa-circle"></i> ${connected ? 'Conectado' : 'Desconectado'}`;
    }
  },

  /**
   * Carga estadísticas en la interfaz
   */
  async cargarEstadisticas() {
    const container = document.getElementById('telegram-stats');
    if (!container) return;

    try {
      const stats = await this.obtenerEstadisticas();

      container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">Total Enviados</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.entregadas}</div>
                        <div class="stat-label">Entregados</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.fallidas}</div>
                        <div class="stat-label">Fallidos</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${Math.round((stats.entregadas / Math.max(stats.total, 1)) * 100)}%</div>
                        <div class="stat-label">Tasa de Éxito</div>
                    </div>
                </div>
            `;
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      container.innerHTML = '<p class="text-danger">Error cargando estadísticas</p>';
    }
  },

  /**
   * Muestra código QR para el bot
   */
  mostrarCodigoQR() {
    if (!this.config.botToken) {
      Utils.showToast('Configura el bot primero', 'warning');
      return;
    }

    Utils.showToast('Función de QR en desarrollo', 'info');
  },
};

// Exponer globalmente
window.TelegramTaller = TelegramTaller;
