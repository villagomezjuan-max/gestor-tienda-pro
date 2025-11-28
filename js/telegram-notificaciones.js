// ============================================
// MÓDULO: INTEGRACIÓN CON TELEGRAM
// ============================================
// Sistema de notificaciones automáticas a Telegram
// Envía alertas de stock bajo, productos por vencer, ventas, etc.
// Incluye gestión de usuarios con permisos diferenciados

window.TelegramNotificaciones = {
  STORAGE_KEY: 'telegram_config',

  // TIPOS DE USUARIO con permisos
  TIPOS_USUARIO: {
    ADMIN: {
      nombre: 'Administrador',
      emoji: '👑',
      descripcion: 'Acceso completo al sistema',
      permisos: ['stock', 'ventas', 'citas', 'clientes', 'ordenes', 'reportes', 'configuracion', 'productos', 'finanzas']
    },
    SECRETARIO: {
      nombre: 'Secretario/a',
      emoji: '💼',
      descripcion: 'Gestión de citas, clientes y órdenes',
      permisos: ['citas', 'clientes', 'ordenes', 'productos', 'recordatorios', 'ver_agenda']
    },
    CLIENTE: {
      nombre: 'Cliente',
      emoji: '👤',
      descripcion: 'Solo puede agendar citas y ver estado de sus vehículos',
      permisos: ['citas_propias', 'estado_vehiculo', 'crear_orden', 'consultar_servicio']
    }
  },

  // Configuración de Telegram
  config: {
    activo: false,
    botToken: '',
    chatIds: [], // Múltiples usuarios (legacy - compatibilidad)
    // NUEVO: Información detallada de cada usuario
    usuarios: {}, // { chatId: { nombre, tipo, permisos, nombreAsistente, telefono, vehiculos } }
    enviarStockBajo: true,
    enviarProductosVencer: true,
    enviarVentas: true,
    enviarPagos: true,
    enviarRecordatorios: true,
    enviarEntregasPendientes: true,
    stockBajoDiario: true,
    horaResumenDiario: '08:00',
    // Configuración del asistente virtual
    nombreAsistente: 'Sara',
    saludoPersonalizado: true,
    mensajeBienvenidaCliente: true,
  },

  // Estado interno
  inicializado: false,
  ultimoEnvio: {},

  // ============================================
  // INICIALIZAR MÓDULO
  // ============================================
  init() {
    console.log('🔔 Inicializando integración con Telegram...');

    // Cargar configuración guardada
    this.cargarConfiguracion();

    if (this.config.activo && this.validarConfiguracion()) {
      this.inicializado = true;

      // Iniciar verificadores automáticos
      this.iniciarVerificadores();

      console.log('✅ Telegram activado - Bot Token:', this.ocultarToken(this.config.botToken));
      console.log('📱 Chat IDs configurados:', this.config.chatIds.length);
    } else {
      console.info('ℹ️ Telegram no está configurado (característica opcional)');
    }
  },

  // ============================================
  // CARGAR CONFIGURACIÓN
  // ============================================
  cargarConfiguracion() {
    // Cargar desde configuración avanzada
    const configAvanzada = Database.get('configuracionAvanzada');
    if (configAvanzada && configAvanzada.telegram) {
      this.config = { ...this.config, ...configAvanzada.telegram };
    }

    // También cargar desde almacenamiento local (soporta multi-tenant)
    let telegramConfig = null;
    if (window.TenantStorage && typeof TenantStorage.getJSON === 'function') {
      telegramConfig = TenantStorage.getJSON(this.STORAGE_KEY, null);
    } else if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      telegramConfig = raw ? JSON.parse(raw) : null;
    }
    if (telegramConfig) {
      try {
        this.config = { ...this.config, ...telegramConfig };
      } catch (e) {
        console.error('Error al parsear configuración de Telegram:', e);
      }
    }
  },

  // ============================================
  // GUARDAR CONFIGURACIÓN
  // ============================================
  guardarConfiguracion(nuevaConfig) {
    this.config = { ...this.config, ...nuevaConfig };

    // Guardar en almacenamiento local por tienda
    try {
      if (window.TenantStorage && typeof TenantStorage.setJSON === 'function') {
        TenantStorage.setJSON(this.STORAGE_KEY, this.config);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
      }
    } catch (error) {
      console.warn(
        'No se pudo guardar la configuración de Telegram en el almacenamiento local',
        error
      );
    }

    // Guardar en configuración avanzada
    const configAvanzada = Database.get('configuracionAvanzada') || {};
    configAvanzada.telegram = this.config;
    Database.set('configuracionAvanzada', configAvanzada);

    // Re-inicializar
    this.init();
  },

  // ============================================
  // VALIDAR CONFIGURACIÓN
  // ============================================
  validarConfiguracion() {
    if (!this.config.botToken || this.config.botToken.trim() === '') {
      return false;
    }
    if (!this.config.chatIds || this.config.chatIds.length === 0) {
      return false;
    }
    return true;
  },

  // ============================================
  // OCULTAR TOKEN (SEGURIDAD)
  // ============================================
  ocultarToken(token) {
    if (!token || token.length < 10) return '***';
    return token.substring(0, 8) + '...' + token.substring(token.length - 4);
  },

  // ============================================
  // INICIAR VERIFICADORES AUTOMÁTICOS
  // ============================================
  iniciarVerificadores() {
    /*
    // Verificar stock bajo cada hora (MIGRADO AL BACKEND)
    if (this.config.enviarStockBajo) {
      setInterval(() => {
        this.verificarStockBajo();
      }, 60 * 60 * 1000); // Cada hora
      
      // Verificar inmediatamente
      setTimeout(() => this.verificarStockBajo(), 10000);
    }
    */

    // Verificar productos por vencer cada 6 horas
    if (this.config.enviarProductosVencer) {
      setInterval(
        () => {
          this.verificarProductosVencer();
        },
        6 * 60 * 60 * 1000
      ); // Cada 6 horas

      // Verificar inmediatamente
      setTimeout(() => this.verificarProductosVencer(), 15000);
    }

    // Resumen diario de stock bajo
    if (this.config.stockBajoDiario) {
      this.programarResumenDiario();
    }

    // Verificar entregas pendientes cada 4 horas
    if (this.config.enviarEntregasPendientes) {
      setInterval(
        () => {
          this.verificarEntregasPendientes();
        },
        4 * 60 * 60 * 1000
      ); // Cada 4 horas

      // Verificar inmediatamente
      setTimeout(() => this.verificarEntregasPendientes(), 20000);
    }

    console.log('✅ Verificadores automáticos iniciados');
  },

  // ============================================
  // VERIFICAR STOCK BAJO
  // ============================================
  async verificarStockBajo() {
    if (!this.config.enviarStockBajo || !this.inicializado) return;

    const ahora = new Date();
    const hoy = ahora.toDateString();

    // Evitar enviar múltiples veces por hora
    if (this.ultimoEnvio.stockBajo === hoy + ahora.getHours()) {
      return;
    }

    try {
      // Consultar el backend para obtener el stock más reciente
      const data = await Auth._request('/reportes/stock-bajo');
      const lista = Array.isArray(data.productos) ? data.productos : [];

      if (!lista.length) {
        return;
      }

      const configInv = this.obtenerConfigInventario();
      const stockCritico = configInv.stockCritico || 5;
      const stockMinimo = configInv.stockMinimo || 10;

      const parseNumero = (valor, fallback = 0) => {
        const numero = Number(valor);
        return Number.isFinite(numero) ? numero : fallback;
      };

      const productosCriticos = lista.filter((p) => {
        const stock = parseNumero(p.stock);
        return stock <= stockCritico;
      });

      const productosBajos = lista.filter((p) => {
        const stock = parseNumero(p.stock);
        const minimoProducto = parseNumero(p.stockMinimo, stockMinimo);
        return stock > stockCritico && stock <= minimoProducto;
      });

      if (!productosCriticos.length && !productosBajos.length) {
        return;
      }

      let mensaje = '🚨 *ALERTA DE STOCK* 🚨\n\n';

      if (productosCriticos.length > 0) {
        mensaje += `⛔ *Stock Crítico* (${productosCriticos.length} productos):\n`;
        productosCriticos.slice(0, 5).forEach((p) => {
          mensaje += `• ${p.nombre}: *${p.stock}* unidades\n`;
        });
        if (productosCriticos.length > 5) {
          mensaje += `... y ${productosCriticos.length - 5} más\n`;
        }
        mensaje += '\n';
      }

      if (productosBajos.length > 0) {
        mensaje += `⚠️ *Stock Bajo* (${productosBajos.length} productos):\n`;
        productosBajos.slice(0, 5).forEach((p) => {
          mensaje += `• ${p.nombre}: ${p.stock} unidades\n`;
        });
        if (productosBajos.length > 5) {
          mensaje += `... y ${productosBajos.length - 5} más\n`;
        }
      }

      mensaje += `\n📅 ${ahora.toLocaleDateString()} ${ahora.toLocaleTimeString()}`;

      await this.enviarMensaje(mensaje);
      this.ultimoEnvio.stockBajo = hoy + ahora.getHours();

      Notificaciones.advertencia(
        `${productosCriticos.length + productosBajos.length} producto(s) con stock bajo`,
        6000
      );
    } catch (error) {
      console.error('Error al verificar stock bajo para Telegram:', error);
    }
  },

  // ============================================
  // ENVIAR ALERTA INMEDIATA DE STOCK CRÍTICO
  // ============================================
  async enviarAlertaStockInmediata(producto, stockNuevo, motivo = 'Venta') {
    if (!this.config.activo || !this.inicializado) return;

    // Usar StockLevelManager si está disponible
    if (window.StockLevelManager) {
      const nivel = window.StockLevelManager.getStockLevel(producto);

      // Solo enviar para niveles críticos (sin-stock, critico-1, critico-2, naranja)
      if (nivel.prioridad < 4) {
        // 0=sin-stock, 1=critico-1, 2=critico-2, 3=naranja
        let icono = nivel.icon || '⚠️';
        let mensaje = `${icono} *ALERTA DE STOCK - ${motivo.toUpperCase()}* ${icono}\n\n`;
        mensaje += `📦 *Producto:* ${producto.nombre}\n`;
        mensaje += `🏷️ *Código:* ${producto.codigo}\n`;
        mensaje += `📊 *Stock actual:* ${stockNuevo} unidades\n`;
        mensaje += `📉 *Nivel:* ${nivel.nombre.toUpperCase()}\n`;
        mensaje += `${nivel.mensaje}\n`;

        if (nivel.accion) {
          mensaje += `\n💡 *Acción sugerida:* ${nivel.accion}\n`;
        }

        // Calcular cantidad de reabastecimiento
        if (window.StockLevelManager.calcularCantidadReabastecimiento) {
          const reabastecimiento =
            window.StockLevelManager.calcularCantidadReabastecimiento(producto);
          if (reabastecimiento > 0) {
            mensaje += `🔄 *Sugerencia de compra:* ${reabastecimiento} unidades\n`;
          }
        }

        mensaje += `\n⏰ ${new Date().toLocaleString()}`;

        await this.enviarMensaje(mensaje);
      }
    } else {
      // Fallback al sistema antiguo
      const configInv = this.obtenerConfigInventario();
      const stockCritico = configInv.stockCritico || 5;

      if (stockNuevo <= stockCritico) {
        let icono = stockNuevo === 0 ? '🔴' : stockNuevo <= 2 ? '🟠' : '🟡';
        let mensaje = `${icono} *ALERTA DE STOCK - ${motivo.toUpperCase()}* ${icono}\n\n`;
        mensaje += `📦 *Producto:* ${producto.nombre}\n`;
        mensaje += `🏷️ *Código:* ${producto.codigo}\n`;
        mensaje += `📊 *Stock actual:* ${stockNuevo} unidades\n`;

        if (stockNuevo === 0) {
          mensaje += `\n⛔ *PRODUCTO AGOTADO* - Requiere reabastecimiento urgente\n`;
        } else if (stockNuevo === 1) {
          mensaje += `\n🚨 *ÚLTIMA UNIDAD* - Reabastecer inmediatamente\n`;
        } else if (stockNuevo === 2) {
          mensaje += `\n⚠️ *STOCK CRÍTICO* - Reabastecer con urgencia\n`;
        }

        mensaje += `\n⏰ ${new Date().toLocaleString()}`;

        await this.enviarMensaje(mensaje);
      }
    }
  },

  // ============================================
  // VERIFICAR PRODUCTOS POR VENCER
  // ============================================
  verificarProductosVencer() {
    if (!this.config.enviarProductosVencer || !this.inicializado) return;

    const ahora = new Date();
    const hoy = ahora.toDateString();

    // Evitar enviar múltiples veces al día
    if (this.ultimoEnvio.productosVencer === hoy) {
      return;
    }

    const productos = Database.getCollection('productos') || [];
    const configInv = this.obtenerConfigInventario();
    const diasAnticipacion = configInv.diasVencimiento || 30;

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);

    // Filtrar productos que vencen pronto
    const productosVencer = productos.filter((p) => {
      if (!p.fechaVencimiento) return false;
      const fechaVenc = new Date(p.fechaVencimiento);
      return fechaVenc > ahora && fechaVenc <= fechaLimite;
    });

    // Productos ya vencidos
    const productosVencidos = productos.filter((p) => {
      if (!p.fechaVencimiento) return false;
      const fechaVenc = new Date(p.fechaVencimiento);
      return fechaVenc <= ahora;
    });

    if (productosVencer.length > 0 || productosVencidos.length > 0) {
      let mensaje = '📆 *ALERTA DE VENCIMIENTOS* 📆\n\n';

      if (productosVencidos.length > 0) {
        mensaje += `🔴 *Productos Vencidos* (${productosVencidos.length}):\n`;
        productosVencidos.slice(0, 5).forEach((p) => {
          const fechaVenc = new Date(p.fechaVencimiento);
          mensaje += `• ${p.nombre}\n  Vencido: ${fechaVenc.toLocaleDateString()}\n`;
        });
        if (productosVencidos.length > 5) {
          mensaje += `... y ${productosVencidos.length - 5} más\n`;
        }
        mensaje += '\n';
      }

      if (productosVencer.length > 0) {
        mensaje += `⏰ *Próximos a Vencer* (${productosVencer.length}):\n`;
        productosVencer.slice(0, 5).forEach((p) => {
          const fechaVenc = new Date(p.fechaVencimiento);
          const diasRestantes = Math.ceil((fechaVenc - ahora) / (1000 * 60 * 60 * 24));
          mensaje += `• ${p.nombre}\n  ${diasRestantes} día(s) restantes\n`;
        });
        if (productosVencer.length > 5) {
          mensaje += `... y ${productosVencer.length - 5} más\n`;
        }
      }

      mensaje += `\n📅 ${ahora.toLocaleDateString()} ${ahora.toLocaleTimeString()}`;

      this.enviarMensaje(mensaje);
      this.ultimoEnvio.productosVencer = hoy;

      // También mostrar notificación en el programa
      if (productosVencidos.length > 0) {
        Notificaciones.error(`¡${productosVencidos.length} producto(s) VENCIDOS!`, 8000);
      }
    }
  },

  // ============================================
  // VERIFICAR ENTREGAS PENDIENTES (ÓRDENES DE TRABAJO)
  // ============================================
  verificarEntregasPendientes() {
    if (!this.config.enviarEntregasPendientes || !this.inicializado) return;

    const ahora = new Date();
    const manana = new Date();
    manana.setDate(ahora.getDate() + 1);

    const ordenes = Database.getCollection('ordenes_trabajo') || [];

    const entregasProximas = ordenes.filter((o) => {
      if (!o.fecha_entrega_estimada) return false;
      const fechaEntrega = new Date(o.fecha_entrega_estimada);
      return (
        o.estado === 'en_proceso' || (o.estado === 'espera_repuestos' && fechaEntrega <= manana)
      );
    });

    if (entregasProximas.length > 0) {
      let mensaje = '🚗 *RECORDATORIO DE ENTREGAS* 🚗\n\n';
      mensaje += `Hay ${entregasProximas.length} vehículo(s) con fecha de entrega próxima:\n\n`;

      entregasProximas.forEach((o) => {
        mensaje += `• *Orden #${o.numero}* - ${o.vehiculo_placa || 'Sin placa'}\n`;
        mensaje += `  Cliente: ${o.cliente_nombre}\n`;
        mensaje += `  Entrega: ${new Date(o.fecha_entrega_estimada).toLocaleString()}\n\n`;
      });

      this.enviarMensaje(mensaje);
    }
  },

  // ============================================
  // PROGRAMAR RESUMEN DIARIO
  // ============================================
  programarResumenDiario() {
    // Verificar cada hora si es la hora del resumen
    setInterval(() => {
      const ahora = new Date();
      const horaActual =
        ahora.getHours().toString().padStart(2, '0') +
        ':' +
        ahora.getMinutes().toString().padStart(2, '0');

      const hoy = ahora.toDateString();

      if (horaActual === this.config.horaResumenDiario && this.ultimoEnvio.resumenDiario !== hoy) {
        this.enviarResumenDiario();
        this.ultimoEnvio.resumenDiario = hoy;
      }
    }, 60000); // Cada minuto
  },

  // ============================================
  // ENVIAR RESUMEN DIARIO
  // ============================================
  enviarResumenDiario() {
    if (!this.inicializado) return;

    const productos = Database.getCollection('productos') || [];
    const ventas = Database.getCollection('ventas') || [];
    const configInv = this.obtenerConfigInventario();

    // Calcular estadísticas
    const productosCriticos = productos.filter(
      (p) => p.stock > 0 && p.stock <= (configInv.stockCritico || 5)
    ).length;

    const productosBajos = productos.filter(
      (p) =>
        p.stock > (configInv.stockCritico || 5) &&
        p.stock <= (p.stockMinimo || configInv.stockMinimo || 10)
    ).length;

    const productosAgotados = productos.filter((p) => p.stock === 0).length;

    // Ventas de hoy
    const hoy = new Date().toISOString().split('T')[0];
    const ventasHoy = ventas.filter((v) => v.fecha === hoy);
    const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0);

    const ahora = new Date();
    let mensaje = `📊 *RESUMEN DIARIO* 📊\n`;
    mensaje += `${ahora.toLocaleDateString()}\n\n`;

    mensaje += `🛒 *Ventas de Hoy:*\n`;
    mensaje += `• ${ventasHoy.length} ventas\n`;
    mensaje += `• Total: $${totalVentasHoy.toFixed(2)}\n\n`;

    mensaje += `📦 *Estado de Inventario:*\n`;
    mensaje += `• Productos críticos: ${productosCriticos}\n`;
    mensaje += `• Stock bajo: ${productosBajos}\n`;
    mensaje += `• Agotados: ${productosAgotados}\n\n`;

    if (productosCriticos + productosBajos > 0) {
      mensaje += `⚠️ Se requiere atención en inventario\n\n`;
    }

    mensaje += `✅ Resumen generado automáticamente`;

    this.enviarMensaje(mensaje);
  },

  // ============================================
  // NOTIFICAR VENTA
  // ============================================
  notificarVenta(venta) {
    if (!this.config.enviarVentas) {
      console.log('📱 Notificación de ventas desactivada');
      return;
    }
    if (!this.inicializado) {
      console.log('📱 Telegram no inicializado, no se puede notificar venta');
      return;
    }

    const cliente = venta.clienteNombre || venta.cliente?.nombre || 'Cliente general';
    const productos = venta.productos || venta.items || [];
    const total = typeof venta.total === 'number' ? venta.total.toFixed(2) : venta.total;
    
    const mensaje =
      `💰 *NUEVA VENTA* #${venta.numero || ''}\n\n` +
      `👤 Cliente: ${cliente}\n` +
      `💵 Total: $${total}\n` +
      `📝 Productos: ${productos.length}\n` +
      `💳 Método: ${venta.metodoPago || venta.metodo_pago || 'Efectivo'}\n\n` +
      `📅 ${new Date().toLocaleString()}`;

    console.log('📱 Enviando notificación de venta a Telegram...');
    this.enviarMensaje(mensaje);
  },

  // ============================================
  // NOTIFICAR PAGO PENDIENTE
  // ============================================
  notificarPagoPendiente(cuenta) {
    if (!this.config.enviarPagos || !this.inicializado) return;

    const tipo = cuenta.tipo === 'cobrar' ? '💵 COBRO PENDIENTE' : '💳 PAGO PENDIENTE';
    const mensaje =
      `${tipo}\n\n` +
      `👤 ${cuenta.tipo === 'cobrar' ? 'Cliente' : 'Proveedor'}: ${cuenta.nombre}\n` +
      `💰 Monto: $${cuenta.monto.toFixed(2)}\n` +
      `📅 Vence: ${cuenta.fechaVencimiento}\n` +
      `📝 Concepto: ${cuenta.concepto}\n\n` +
      `⚠️ Requiere atención`;

    this.enviarMensaje(mensaje);
  },

  // ============================================
  // NOTIFICAR RECORDATORIO
  // ============================================
  notificarRecordatorio(recordatorio) {
    if (!this.config.enviarRecordatorios || !this.inicializado) return;

    const iconos = {
      publicidad: '📢',
      pago: '💰',
      cobro: '💵',
      reabastecimiento: '📦',
      reunion: '🤝',
      tarea: '✅',
      general: '📌',
    };

    const icono = iconos[recordatorio.tipo] || '📌';

    const mensaje =
      `${icono} *RECORDATORIO*\n\n` +
      `📋 ${recordatorio.titulo}\n` +
      `📅 ${recordatorio.fecha} ${recordatorio.hora}\n` +
      (recordatorio.descripcion ? `📝 ${recordatorio.descripcion}\n` : '') +
      `\n⏰ ¡No olvides!`;

    this.enviarMensaje(mensaje);
  },

  // ============================================
  // ENVIAR MENSAJE A TELEGRAM
  // ============================================
  async enviarMensaje(texto, opciones = {}) {
    if (!this.inicializado) {
      console.warn('Telegram no está inicializado');
      return false;
    }

    const defaultOpciones = {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    };

    const opcionesFinal = { ...defaultOpciones, ...opciones };

    // Enviar a todos los chat IDs configurados
    const promesas = this.config.chatIds.map((chatId) =>
      this.enviarMensajeAChatId(chatId, texto, opcionesFinal)
    );

    try {
      const resultados = await Promise.all(promesas);
      const exitosos = resultados.filter((r) => r).length;

      if (exitosos > 0) {
        console.log(`✅ Mensaje enviado a ${exitosos}/${this.config.chatIds.length} chat(s)`);
        return true;
      } else {
        console.error('❌ No se pudo enviar el mensaje a ningún chat');
        return false;
      }
    } catch (error) {
      console.error('Error al enviar mensajes:', error);
      return false;
    }
  },

  // ============================================
  // ENVIAR MENSAJE A UN CHAT ID ESPECÍFICO CON REINTENTOS
  // ============================================
  async enviarMensajeAChatId(chatId, texto, opciones, intentos = 3) {
    const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;

    const payload = {
      chat_id: chatId,
      text: texto,
      ...opciones,
    };

    for (let intento = 1; intento <= intentos; intento++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          timeout: 10000, // 10 segundos de timeout
        });

        const data = await response.json();

        if (data.ok) {
          if (intento > 1) {
            console.log(`✅ Mensaje enviado a ${chatId} en el intento ${intento}`);
          }
          return true;
        } else {
          console.error(`Error al enviar a ${chatId}:`, data.description);

          // Si es error de token o chat_id, no reintentar
          if (
            data.description &&
            (data.description.includes('bot token') || data.description.includes('chat not found'))
          ) {
            return false;
          }

          // Para otros errores, reintentar
          if (intento < intentos) {
            console.log(`Reintentando... (${intento}/${intentos})`);
            await this.esperar(1000 * intento); // Espera progresiva: 1s, 2s, 3s
            continue;
          }

          return false;
        }
      } catch (error) {
        console.error(
          `Error de red al enviar a ${chatId} (intento ${intento}/${intentos}):`,
          error
        );

        if (intento < intentos) {
          console.log(`Reintentando en ${intento} segundo(s)...`);
          await this.esperar(1000 * intento);
        } else {
          return false;
        }
      }
    }

    return false;
  },

  // ============================================
  // FUNCIÓN AUXILIAR: ESPERAR (DELAY)
  // ============================================
  esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  // ============================================
  // PROBAR CONEXIÓN CON REINTENTOS
  // ============================================
  async probarConexion(intentos = 2) {
    if (!this.config.botToken) {
      return {
        exito: false,
        mensaje: 'No hay Bot Token configurado',
      };
    }

    // Validar formato del token
    if (!this.validarFormatoToken(this.config.botToken)) {
      return {
        exito: false,
        mensaje: 'El formato del Bot Token no es válido. Debe ser: 1234567890:ABC...',
      };
    }

    for (let intento = 1; intento <= intentos; intento++) {
      try {
        const url = `https://api.telegram.org/bot${this.config.botToken}/getMe`;
        const response = await fetch(url, { timeout: 8000 });
        const data = await response.json();

        if (data.ok) {
          return {
            exito: true,
            mensaje: `✅ Bot conectado: @${data.result.username}`,
            botInfo: data.result,
          };
        } else {
          // Mensajes de error más descriptivos
          let mensajeError = data.description || 'Error desconocido';

          if (mensajeError.includes('Unauthorized') || mensajeError.includes('bot token')) {
            mensajeError =
              '❌ Bot Token inválido. Verifica que lo hayas copiado correctamente de @BotFather';
          } else if (mensajeError.includes('Not Found')) {
            mensajeError = '❌ Bot no encontrado. Crea un nuevo bot con @BotFather';
          }

          return {
            exito: false,
            mensaje: mensajeError,
          };
        }
      } catch (error) {
        console.error(`Error de conexión (intento ${intento}/${intentos}):`, error);

        if (intento < intentos) {
          console.log('Reintentando conexión...');
          await this.esperar(1500);
        } else {
          return {
            exito: false,
            mensaje: `❌ Error de conexión: ${error.message}. Verifica tu internet.`,
          };
        }
      }
    }

    return {
      exito: false,
      mensaje: 'No se pudo establecer conexión después de varios intentos',
    };
  },

  // ============================================
  // VALIDAR FORMATO DEL TOKEN
  // ============================================
  validarFormatoToken(token) {
    // El token debe tener el formato: 123456789:ABCdef...
    // Primera parte: números (bot ID)
    // Segunda parte: letras, números, guiones, guiones bajos
    const regex = /^\d+:[A-Za-z0-9_-]+$/;
    return regex.test(token);
  },

  // ============================================
  // OBTENER CHAT IDS AUTOMÁTICAMENTE
  // NOTA: Esta función NO usa getUpdates directamente para evitar
  // conflictos 409 con TelegramIAAssistant que maneja el polling.
  // Los chat IDs deben agregarse manualmente o cuando usuarios
  // escriben al bot (capturado por TelegramIAAssistant)
  // ============================================
  async obtenerChatIdsAutomaticamente(intentos = 2) {
    if (!this.config.botToken) {
      return {
        exito: false,
        mensaje: 'No hay Bot Token configurado',
      };
    }

    // Validar formato del token
    if (!this.validarFormatoToken(this.config.botToken)) {
      return {
        exito: false,
        mensaje: 'El formato del Bot Token no es válido',
      };
    }

    // Verificar si TelegramIAAssistant tiene conversaciones registradas
    if (window.TelegramIAAssistant?.conversacionesPorUsuario) {
      const chatIds = Object.keys(window.TelegramIAAssistant.conversacionesPorUsuario);
      if (chatIds.length > 0) {
        const detallesChats = chatIds.map(chatId => {
          const conv = window.TelegramIAAssistant.conversacionesPorUsuario[chatId];
          return {
            chatId: chatId,
            nombre: conv?.usuario?.nombre || 'Usuario',
            tipo: 'private',
            username: null,
          };
        });
        
        return {
          exito: true,
          mensaje: `✅ Se encontraron ${chatIds.length} chat(s) registrados`,
          chatIds: chatIds,
          detalles: detallesChats,
        };
      }
    }

    // Si no hay chats registrados, dar instrucciones
    return {
      exito: false,
      mensaje:
        '📭 No hay chats registrados aún.\n\n' +
        '✅ Pasos a seguir:\n' +
        '1. Busca tu bot en Telegram\n' +
        '2. Envía el mensaje /start\n' +
        '3. Los chats se registrarán automáticamente',
      chatIds: [],
    };
  },

  // ============================================
  // LIMPIAR UPDATES
  // NOTA: Esta función está deshabilitada para evitar conflictos 409
  // con TelegramIAAssistant que maneja el polling exclusivamente.
  // ============================================
  async limpiarUpdates() {
    // Función deshabilitada - el polling lo maneja TelegramIAAssistant
    console.log('ℹ️ limpiarUpdates delegado a TelegramIAAssistant');
    return;
  },

  // ============================================
  // ENVIAR MENSAJE DE PRUEBA
  // ============================================
  async enviarMensajePrueba() {
    const ahora = new Date();
    const mensaje =
      `🤖 *MENSAJE DE PRUEBA*\n\n` +
      `✅ La integración con Telegram está funcionando correctamente.\n\n` +
      `📱 Chat IDs configurados: ${this.config.chatIds.length}\n` +
      `📅 ${ahora.toLocaleString()}\n\n` +
      `Gestor Tienda Pro 🏪`;

    const resultado = await this.enviarMensaje(mensaje);

    if (resultado) {
      Notificaciones.exito('Mensaje de prueba enviado a Telegram', 5000);
      return true;
    } else {
      Notificaciones.error('Error al enviar mensaje de prueba', 5000);
      return false;
    }
  },

  // ============================================
  // OBTENER CONFIGURACIÓN DE INVENTARIO
  // ============================================
  obtenerConfigInventario() {
    const configAvanzada = Database.get('configuracionAvanzada');
    return (
      configAvanzada?.inventario || {
        stockMinimo: 10,
        stockCritico: 5,
        diasVencimiento: 30,
      }
    );
  },

  // ============================================
  // AGREGAR CHAT ID
  // ============================================
  agregarChatId(chatId) {
    if (!chatId || chatId.trim() === '') {
      return false;
    }

    const chatIdLimpio = chatId.trim();

    if (!this.config.chatIds.includes(chatIdLimpio)) {
      this.config.chatIds.push(chatIdLimpio);
      this.guardarConfiguracion(this.config);
      return true;
    }

    return false;
  },

  // ============================================
  // ELIMINAR CHAT ID
  // ============================================
  eliminarChatId(chatId) {
    const index = this.config.chatIds.indexOf(chatId);
    if (index > -1) {
      this.config.chatIds.splice(index, 1);
      this.guardarConfiguracion(this.config);
      return true;
    }
    return false;
  },

  // ============================================
  // ENVIAR NOTIFICACIÓN DEL SISTEMA
  // ============================================
  async enviarNotificacionSistema(notificacion) {
    if (!this.inicializado || !this.config.activo) {
      console.log('📱 Telegram no está activo, notificación no enviada');
      return false;
    }

    const iconos = {
      error: '🔴',
      warning: '⚠️',
      success: '✅',
      info: 'ℹ️',
      critica: '🚨',
      alta: '⚡',
    };

    const tipoLabels = {
      error: 'ERROR',
      warning: 'ADVERTENCIA',
      success: 'ÉXITO',
      info: 'INFORMACIÓN',
    };

    const icono = iconos[notificacion.tipo] || iconos[notificacion.importancia] || '📌';
    const tipoLabel = tipoLabels[notificacion.tipo] || 'NOTIFICACIÓN';

    let mensaje = `${icono} *${tipoLabel} DEL SISTEMA*\n\n`;
    mensaje += `📋 ${notificacion.mensaje}\n\n`;
    mensaje += `⏰ ${new Date().toLocaleString()}`;

    if (notificacion.importancia === 'critica') {
      mensaje = `🚨🚨🚨 *ALERTA CRÍTICA* 🚨🚨🚨\n\n${mensaje}`;
    }

    try {
      const resultado = await this.enviarMensaje(mensaje);
      return resultado;
    } catch (error) {
      console.error('Error enviando notificación del sistema a Telegram:', error);
      return false;
    }
  },

  // ============================================
  // OBTENER ESTADO
  // ============================================
  obtenerEstado() {
    return {
      activo: this.config.activo,
      inicializado: this.inicializado,
      botToken: this.config.botToken ? this.ocultarToken(this.config.botToken) : 'No configurado',
      chatIds: this.config.chatIds.length,
      configuracion: {
        stockBajo: this.config.enviarStockBajo,
        productosVencer: this.config.enviarProductosVencer,
        ventas: this.config.enviarVentas,
        pagos: this.config.enviarPagos,
        recordatorios: this.config.enviarRecordatorios,
        resumenDiario: this.config.stockBajoDiario,
      },
    };
  },

  // ============================================
  // DIAGNÓSTICO COMPLETO
  // ============================================
  diagnostico() {
    console.log('📱 ====== DIAGNÓSTICO TELEGRAM ======');
    console.log('🔹 Activo:', this.config.activo);
    console.log('🔹 Inicializado:', this.inicializado);
    console.log('🔹 Bot Token:', this.config.botToken ? 'Configurado (' + this.ocultarToken(this.config.botToken) + ')' : '❌ NO CONFIGURADO');
    console.log('🔹 Chat IDs:', this.config.chatIds.length > 0 ? this.config.chatIds.join(', ') : '❌ NO HAY CHAT IDS');
    console.log('🔹 Enviar Ventas:', this.config.enviarVentas ? '✅' : '❌');
    console.log('🔹 Enviar Stock Bajo:', this.config.enviarStockBajo ? '✅' : '❌');
    console.log('🔹 Enviar Pagos:', this.config.enviarPagos ? '✅' : '❌');
    console.log('🔹 Enviar Recordatorios:', this.config.enviarRecordatorios ? '✅' : '❌');
    console.log('=====================================');
    
    const problemas = [];
    if (!this.config.activo) problemas.push('Telegram no está activo');
    if (!this.config.botToken) problemas.push('No hay Bot Token configurado');
    if (this.config.chatIds.length === 0) problemas.push('No hay Chat IDs configurados');
    
    if (problemas.length > 0) {
      console.warn('⚠️ PROBLEMAS DETECTADOS:', problemas.join(', '));
      return { ok: false, problemas };
    }
    
    console.log('✅ Todo configurado correctamente');
    return { ok: true, estado: this.obtenerEstado() };
  },

  // ============================================
  // GESTIÓN DE USUARIOS DE TELEGRAM
  // ============================================
  
  /**
   * Obtener información de un usuario
   */
  getUsuario(chatId) {
    const chatIdStr = String(chatId);
    return this.config.usuarios?.[chatIdStr] || null;
  },

  /**
   * Registrar o actualizar un usuario
   */
  setUsuario(chatId, datos) {
    const chatIdStr = String(chatId);
    
    if (!this.config.usuarios) {
      this.config.usuarios = {};
    }

    const usuarioActual = this.config.usuarios[chatIdStr] || {};
    
    this.config.usuarios[chatIdStr] = {
      ...usuarioActual,
      ...datos,
      chatId: chatIdStr,
      ultimaActualizacion: new Date().toISOString()
    };

    // Asegurar que el chatId esté en la lista
    if (!this.config.chatIds.includes(chatIdStr)) {
      this.config.chatIds.push(chatIdStr);
    }

    this.guardarConfiguracion(this.config);
    return this.config.usuarios[chatIdStr];
  },

  /**
   * Establecer el tipo de usuario (ADMIN, SECRETARIO, CLIENTE)
   */
  setTipoUsuario(chatId, tipo) {
    const chatIdStr = String(chatId);
    const tipoConfig = this.TIPOS_USUARIO[tipo];
    
    if (!tipoConfig) {
      console.error('Tipo de usuario no válido:', tipo);
      return false;
    }

    return this.setUsuario(chatIdStr, {
      tipo: tipo,
      permisos: [...tipoConfig.permisos],
      tipoNombre: tipoConfig.nombre,
      tipoEmoji: tipoConfig.emoji
    });
  },

  /**
   * Verificar si un usuario tiene un permiso específico
   */
  tienePermiso(chatId, permiso) {
    const usuario = this.getUsuario(chatId);
    
    // Si no hay usuario registrado, denegar
    if (!usuario) return false;
    
    // Admins tienen todo
    if (usuario.tipo === 'ADMIN') return true;
    
    // Verificar permiso específico
    return usuario.permisos?.includes(permiso) || false;
  },

  /**
   * Verificar si es cliente (permisos limitados)
   */
  esCliente(chatId) {
    const usuario = this.getUsuario(chatId);
    return usuario?.tipo === 'CLIENTE';
  },

  /**
   * Verificar si es admin
   */
  esAdmin(chatId) {
    const usuario = this.getUsuario(chatId);
    return usuario?.tipo === 'ADMIN';
  },

  /**
   * Obtener el nombre del asistente para un usuario
   */
  getNombreAsistente(chatId) {
    const usuario = this.getUsuario(chatId);
    return usuario?.nombreAsistente || this.config.nombreAsistente || 'Sara';
  },

  /**
   * Obtener saludo personalizado según tipo de usuario
   */
  getSaludoPersonalizado(chatId, nombreUsuario) {
    const usuario = this.getUsuario(chatId);
    const asistente = this.getNombreAsistente(chatId);
    const hora = new Date().getHours();
    
    let saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
    const nombre = nombreUsuario || usuario?.nombre || '';

    if (usuario?.tipo === 'CLIENTE') {
      return `${saludo}${nombre ? ` ${nombre}` : ''} 👋

Soy *${asistente}*, tu asistente personal de ${this.obtenerNombreNegocio()}.

¿En qué puedo ayudarte hoy?
• 📅 *Agendar una cita*
• 🚗 *Ver estado de tu vehículo*
• 🔧 *Solicitar un servicio*

Escribe lo que necesites en lenguaje natural.`;
    }

    if (usuario?.tipo === 'SECRETARIO') {
      return `${saludo}${nombre ? ` ${nombre}` : ''} 👋

Panel de *${asistente}* - Asistente de Gestión

📋 *Opciones disponibles:*
• 📅 Gestionar citas
• 👥 Buscar clientes
• 🔧 Órdenes de trabajo
• 📦 Consultar productos

¿Qué necesitas hoy?`;
    }

    // ADMIN
    return `${saludo}${nombre ? ` ${nombre}` : ''} 👑

Soy *${asistente}*, tu asistente de gestión.

Tienes acceso completo al sistema:
• 📦 Stock e inventario
• 💰 Ventas y finanzas
• 📅 Agenda y citas
• 🔧 Órdenes de trabajo
• 📊 Reportes

¿Qué deseas consultar?`;
  },

  /**
   * Obtener lista de usuarios por tipo
   */
  getUsuariosPorTipo(tipo) {
    const usuarios = this.config.usuarios || {};
    return Object.values(usuarios).filter(u => u.tipo === tipo);
  },

  /**
   * Obtener todos los usuarios con sus datos
   */
  getTodosUsuarios() {
    const usuarios = this.config.usuarios || {};
    return Object.entries(usuarios).map(([chatId, datos]) => ({
      chatId,
      ...datos,
      tipoInfo: this.TIPOS_USUARIO[datos.tipo] || null
    }));
  },

  /**
   * Eliminar un usuario
   */
  eliminarUsuario(chatId) {
    const chatIdStr = String(chatId);
    
    if (this.config.usuarios?.[chatIdStr]) {
      delete this.config.usuarios[chatIdStr];
    }

    const index = this.config.chatIds.indexOf(chatIdStr);
    if (index > -1) {
      this.config.chatIds.splice(index, 1);
    }

    this.guardarConfiguracion(this.config);
    return true;
  },

  /**
   * Enviar notificación solo a usuarios de cierto tipo
   */
  async enviarMensajeATipo(tipo, mensaje) {
    const usuarios = this.getUsuariosPorTipo(tipo);
    const resultados = [];

    for (const usuario of usuarios) {
      try {
        const resultado = await this.enviarMensajeAChatId(usuario.chatId, mensaje);
        resultados.push({ chatId: usuario.chatId, exito: resultado });
      } catch (e) {
        resultados.push({ chatId: usuario.chatId, exito: false, error: e.message });
      }
    }

    return resultados;
  },

  /**
   * Enviar notificación solo a admins
   */
  async enviarMensajeAAdmins(mensaje) {
    return this.enviarMensajeATipo('ADMIN', mensaje);
  },

  /**
   * Enviar notificación solo a secretarios
   */
  async enviarMensajeASecretarios(mensaje) {
    return this.enviarMensajeATipo('SECRETARIO', mensaje);
  },

  /**
   * Verificar y filtrar notificaciones según tipo de usuario
   * Los clientes NO reciben notificaciones de stock, ventas, etc.
   */
  async enviarNotificacionFiltrada(tipo, mensaje, opciones = {}) {
    const usuariosFiltrados = [];

    for (const chatId of this.config.chatIds) {
      const usuario = this.getUsuario(chatId);
      
      // Si no hay info del usuario, asumir admin para compatibilidad
      if (!usuario) {
        usuariosFiltrados.push(chatId);
        continue;
      }

      // Los clientes NO reciben estas notificaciones
      if (usuario.tipo === 'CLIENTE') {
        // Solo enviar si es una notificación relacionada con sus servicios
        if (['cita_recordatorio', 'vehiculo_listo', 'orden_actualizada'].includes(tipo)) {
          usuariosFiltrados.push(chatId);
        }
        continue;
      }

      // Secretarios reciben algunas notificaciones
      if (usuario.tipo === 'SECRETARIO') {
        const notifSecretario = ['citas', 'ordenes', 'clientes', 'recordatorios', 'vehiculo_listo'];
        if (notifSecretario.some(t => tipo.includes(t))) {
          usuariosFiltrados.push(chatId);
        }
        continue;
      }

      // Admins reciben todo
      usuariosFiltrados.push(chatId);
    }

    // Enviar a usuarios filtrados
    const resultados = [];
    for (const chatId of usuariosFiltrados) {
      try {
        const exito = await this.enviarMensajeAChatId(chatId, mensaje, opciones);
        resultados.push({ chatId, exito });
      } catch (e) {
        resultados.push({ chatId, exito: false });
      }
    }

    return resultados;
  },

  obtenerNombreNegocio() {
    try {
      const config = Database.get('configuracion_avanzada') || Database.get('configuracionAvanzada') || {};
      return config.negocio?.nombre || config.general?.nombreNegocio || 'Mi Negocio';
    } catch {
      return 'Mi Negocio';
    }
  },
};

// Exportar globalmente
window.TelegramNotificaciones = TelegramNotificaciones;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    TelegramNotificaciones.init();
  });
} else {
  TelegramNotificaciones.init();
}
