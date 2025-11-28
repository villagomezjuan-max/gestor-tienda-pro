/**
 * ============================================
 * AGENTE GERENTE DE IA - ORQUESTADOR CENTRAL
 * ============================================
 * 
 * Este agente actúa como el "cerebro" central que:
 * - Recibe TODOS los mensajes (Telegram, chat interno, etc.)
 * - Analiza la intención del usuario
 * - VERIFICA PERMISOS según tipo de usuario
 * - Enruta a los módulos especializados
 * - Coordina respuestas entre múltiples módulos
 * - Mantiene contexto de conversación
 * - Ejecuta acciones (crear citas, consultar stock, etc.)
 * - Ofrece atención personalizada con nombre de asistente
 */

window.IAManagerAgent = {
  // ============================================
  // CONFIGURACIÓN
  // ============================================
  config: {
    debug: true,
    maxHistorialConversacion: 20,
    tiempoEsperaRespuesta: 30000,
  },

  // MAPEO DE INTENCIONES A PERMISOS REQUERIDOS
  PERMISOS_REQUERIDOS: {
    CONSULTAR_STOCK: 'stock',
    PRODUCTOS_BAJOS: 'stock',
    LISTA_COMPRAS: 'stock',
    CONSULTAR_VENTAS: 'ventas',
    RESUMEN_VENTAS: 'ventas',
    CREAR_CITA: 'citas_propias', // Clientes pueden crear citas propias
    VER_CITAS: 'citas',
    CANCELAR_CITA: 'citas',
    BUSCAR_CLIENTE: 'clientes',
    ESTADO_VEHICULO: 'estado_vehiculo', // Clientes pueden ver su vehículo
    CREAR_ORDEN: 'crear_orden', // Clientes pueden solicitar
    BUSCAR_PRODUCTO: 'productos',
    LISTAR_PRODUCTOS: 'productos',
    RESUMEN_GENERAL: 'reportes',
    AYUDA: null, // Todos pueden
    SALUDO: null, // Todos pueden
  },

  // Estado del agente
  estado: {
    inicializado: false,
    procesando: false,
    ultimaActividad: null,
  },

  // Historial de conversaciones por canal
  conversaciones: new Map(),

  // Módulos registrados
  modulos: {},

  // Cola de mensajes procesados para evitar duplicados
  mensajesProcesados: new Set(),

  // ============================================
  // CATÁLOGO DE INTENCIONES
  // ============================================
  intenciones: {
    // Inventario y Stock
    CONSULTAR_STOCK: {
      keywords: ['stock', 'inventario', 'cuánto tengo', 'cuantas unidades', 'hay en bodega', 'quedan'],
      modulo: 'inventario',
      accion: 'consultar',
      prioridad: 1
    },
    PRODUCTOS_BAJOS: {
      keywords: ['bajo stock', 'stock bajo', 'agotarse', 'falta', 'escaso', 'poco', 'crítico', 'urgente'],
      modulo: 'inventario',
      accion: 'alertas',
      prioridad: 2
    },
    LISTA_COMPRAS: {
      keywords: ['comprar', 'pedir', 'reabastecer', 'necesito comprar', 'lista de compras', 'qué pido'],
      modulo: 'inventario',
      accion: 'listaCompras',
      prioridad: 2
    },

    // Ventas
    CONSULTAR_VENTAS: {
      keywords: ['ventas', 'vendí', 'facturé', 'ingresos', 'cuánto vendí'],
      modulo: 'ventas',
      accion: 'consultar',
      prioridad: 1
    },
    RESUMEN_VENTAS: {
      keywords: ['resumen ventas', 'reporte ventas', 'estadísticas ventas'],
      modulo: 'ventas',
      accion: 'resumen',
      prioridad: 2
    },

    // Citas y Agenda
    CREAR_CITA: {
      keywords: ['cita', 'agendar', 'reservar', 'turno', 'programar', 'quiero una cita', 'necesito cita'],
      modulo: 'agenda',
      accion: 'crear',
      prioridad: 1
    },
    VER_CITAS: {
      keywords: ['mis citas', 'citas de hoy', 'agenda', 'turnos', 'ver citas', 'citas pendientes'],
      modulo: 'agenda',
      accion: 'listar',
      prioridad: 2
    },
    CANCELAR_CITA: {
      keywords: ['cancelar cita', 'anular cita', 'eliminar cita', 'quitar turno'],
      modulo: 'agenda',
      accion: 'cancelar',
      prioridad: 2
    },

    // Clientes
    BUSCAR_CLIENTE: {
      keywords: ['cliente', 'buscar cliente', 'datos de', 'información de'],
      modulo: 'clientes',
      accion: 'buscar',
      prioridad: 3
    },

    // Órdenes de Trabajo (Taller)
    ESTADO_VEHICULO: {
      keywords: ['mi vehículo', 'mi carro', 'mi auto', 'estado de mi', 'está listo', 'ya terminaron'],
      modulo: 'ordenes',
      accion: 'estado',
      prioridad: 1
    },
    CREAR_ORDEN: {
      keywords: ['orden de trabajo', 'nueva orden', 'reparación', 'servicio técnico'],
      modulo: 'ordenes',
      accion: 'crear',
      prioridad: 2
    },

    // Productos
    BUSCAR_PRODUCTO: {
      keywords: ['precio de', 'buscar producto', 'tiene', 'venden', 'cuánto cuesta'],
      modulo: 'productos',
      accion: 'buscar',
      prioridad: 2
    },
    LISTAR_PRODUCTOS: {
      keywords: ['productos', 'catálogo', 'listar', 'qué tienen'],
      modulo: 'productos',
      accion: 'listar',
      prioridad: 3
    },

    // General
    RESUMEN_GENERAL: {
      keywords: ['resumen', 'cómo va', 'estado del negocio', 'reporte general', 'estadísticas'],
      modulo: 'general',
      accion: 'resumen',
      prioridad: 1
    },
    AYUDA: {
      keywords: ['ayuda', 'help', 'qué puedes hacer', 'comandos', 'opciones'],
      modulo: 'general',
      accion: 'ayuda',
      prioridad: 3
    },
    SALUDO: {
      keywords: ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'qué tal', 'hi'],
      modulo: 'general',
      accion: 'saludo',
      prioridad: 4
    }
  },

  // ============================================
  // INICIALIZACIÓN
  // ============================================
  init() {
    if (this.estado.inicializado) return;
    
    console.log('🧠 Inicializando IAManagerAgent (Agente Gerente)...');
    
    this.registrarModulos();
    this.configurarListeners();
    
    this.estado.inicializado = true;
    console.log('✅ IAManagerAgent listo - Orquestador central activo');
  },

  registrarModulos() {
    // Registrar todos los módulos disponibles
    this.modulos = {
      inventario: {
        nombre: 'Inventario',
        disponible: () => typeof Database !== 'undefined',
        handlers: {
          consultar: this.handleInventarioConsultar.bind(this),
          alertas: this.handleInventarioAlertas.bind(this),
          listaCompras: this.handleInventarioCompras.bind(this)
        }
      },
      ventas: {
        nombre: 'Ventas',
        disponible: () => typeof Database !== 'undefined',
        handlers: {
          consultar: this.handleVentasConsultar.bind(this),
          resumen: this.handleVentasResumen.bind(this)
        }
      },
      agenda: {
        nombre: 'Agenda',
        disponible: () => typeof AgendaIAAgent !== 'undefined' || typeof Database !== 'undefined',
        handlers: {
          crear: this.handleAgendaCrear.bind(this),
          listar: this.handleAgendaListar.bind(this),
          cancelar: this.handleAgendaCancelar.bind(this)
        }
      },
      clientes: {
        nombre: 'Clientes',
        disponible: () => typeof Database !== 'undefined',
        handlers: {
          buscar: this.handleClientesBuscar.bind(this)
        }
      },
      ordenes: {
        nombre: 'Órdenes de Trabajo',
        disponible: () => typeof Database !== 'undefined',
        handlers: {
          estado: this.handleOrdenesEstado.bind(this),
          crear: this.handleOrdenesCrear.bind(this)
        }
      },
      productos: {
        nombre: 'Productos',
        disponible: () => typeof Database !== 'undefined',
        handlers: {
          buscar: this.handleProductosBuscar.bind(this),
          listar: this.handleProductosListar.bind(this)
        }
      },
      general: {
        nombre: 'General',
        disponible: () => true,
        handlers: {
          resumen: this.handleGeneralResumen.bind(this),
          ayuda: this.handleGeneralAyuda.bind(this),
          saludo: this.handleGeneralSaludo.bind(this)
        }
      }
    };

    console.log(`📦 ${Object.keys(this.modulos).length} módulos registrados`);
  },

  // ============================================
  // OBTENER DATOS ROBUSTAMENTE
  // ============================================
  obtenerColeccion(nombreColeccion) {
    try {
      // Método 1: Database.getCollection
      if (window.Database?.getCollection) {
        const datos = Database.getCollection(nombreColeccion);
        if (datos && datos.length > 0) {
          return datos;
        }
      }

      // Método 2: Database.load
      if (window.Database?.load) {
        const data = Database.load();
        if (data && data[nombreColeccion]?.length > 0) {
          return data[nombreColeccion];
        }
      }

      // Método 3: Buscar en todas las claves de localStorage
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('gestorTiendaProDB')) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data && data[nombreColeccion]?.length > 0) {
              return data[nombreColeccion];
            }
          } catch (e) {}
        }
      }

      return [];
    } catch (e) {
      console.error(`Error obteniendo colección ${nombreColeccion}:`, e);
      return [];
    }
  },

  configurarListeners() {
    // Escuchar mensajes de Telegram
    window.addEventListener('telegram-mensaje-entrante', (e) => {
      this.procesarMensaje(e.detail, 'telegram');
    });

    // Escuchar mensajes del chat interno
    window.addEventListener('chat-interno-mensaje', (e) => {
      this.procesarMensaje(e.detail, 'chat');
    });
  },

  // ============================================
  // PROCESAMIENTO PRINCIPAL
  // ============================================
  async procesarMensaje(datos, canal = 'telegram') {
    const { chatId, mensaje, usuario, messageId } = datos;

    // Evitar duplicados usando messageId o hash del mensaje
    const msgKey = messageId || `${chatId}_${mensaje}_${Date.now()}`;
    if (this.mensajesProcesados.has(msgKey)) {
      console.log('⏭️ Mensaje duplicado ignorado:', msgKey);
      return null;
    }
    this.mensajesProcesados.add(msgKey);

    // Limpiar mensajes antiguos del set (mantener últimos 100)
    if (this.mensajesProcesados.size > 100) {
      const arr = Array.from(this.mensajesProcesados);
      this.mensajesProcesados = new Set(arr.slice(-50));
    }

    this.log(`📨 Procesando mensaje de ${usuario?.nombre || chatId}: "${mensaje}"`);
    this.estado.procesando = true;
    this.estado.ultimaActividad = new Date();

    try {
      // Obtener o crear contexto de conversación
      const contexto = this.obtenerContextoConversacion(chatId, canal);
      
      // NUEVO: Obtener información del usuario de Telegram
      const infoUsuario = this.obtenerInfoUsuario(chatId);
      contexto.tipoUsuario = infoUsuario.tipo;
      contexto.permisos = infoUsuario.permisos;
      contexto.nombreAsistente = infoUsuario.nombreAsistente;
      
      // Agregar mensaje al historial
      contexto.historial.push({
        role: 'user',
        content: mensaje,
        timestamp: new Date().toISOString()
      });

      // Detectar intención
      const intencion = await this.detectarIntencion(mensaje, contexto);
      this.log(`🎯 Intención detectada: ${intencion.tipo} -> ${intencion.modulo}.${intencion.accion}`);

      // NUEVO: Verificar permisos antes de ejecutar
      const verificacionPermisos = this.verificarPermisos(intencion.tipo, chatId, infoUsuario);
      
      let respuesta;
      if (!verificacionPermisos.permitido) {
        respuesta = this.generarMensajeSinPermiso(intencion, infoUsuario, contexto);
      } else {
        // Ejecutar acción
        respuesta = await this.ejecutarAccion(intencion, mensaje, contexto, usuario);
      }

      // Agregar respuesta al historial
      contexto.historial.push({
        role: 'assistant',
        content: respuesta,
        timestamp: new Date().toISOString()
      });

      // Limitar historial
      if (contexto.historial.length > this.config.maxHistorialConversacion * 2) {
        contexto.historial = contexto.historial.slice(-this.config.maxHistorialConversacion * 2);
      }

      this.estado.procesando = false;
      return { respuesta, intencion };

    } catch (error) {
      console.error('Error procesando mensaje:', error);
      this.estado.procesando = false;
      return { 
        respuesta: '❌ Hubo un error procesando tu solicitud. Por favor intenta de nuevo.',
        error: error.message 
      };
    }
  },

  // ============================================
  // VERIFICACIÓN DE PERMISOS
  // ============================================
  obtenerInfoUsuario(chatId) {
    // Obtener info desde TelegramNotificaciones
    if (window.TelegramNotificaciones) {
      const usuario = TelegramNotificaciones.getUsuario(chatId);
      if (usuario) {
        return {
          tipo: usuario.tipo || 'CLIENTE',
          permisos: usuario.permisos || [],
          nombre: usuario.nombre,
          nombreAsistente: TelegramNotificaciones.getNombreAsistente(chatId),
          esCliente: usuario.tipo === 'CLIENTE',
          esAdmin: usuario.tipo === 'ADMIN'
        };
      }
    }
    
    // Por defecto, tratar como cliente si no hay info
    return {
      tipo: 'CLIENTE',
      permisos: ['citas_propias', 'estado_vehiculo', 'crear_orden', 'consultar_servicio'],
      nombre: null,
      nombreAsistente: 'Sara',
      esCliente: true,
      esAdmin: false
    };
  },

  verificarPermisos(tipoIntencion, chatId, infoUsuario) {
    // Los admins pueden todo
    if (infoUsuario.esAdmin) {
      return { permitido: true };
    }

    // Intenciones sin permiso requerido (todos pueden)
    const permisoRequerido = this.PERMISOS_REQUERIDOS[tipoIntencion];
    if (!permisoRequerido) {
      return { permitido: true };
    }

    // Verificar si el usuario tiene el permiso
    const tienePermiso = infoUsuario.permisos.includes(permisoRequerido);
    
    return {
      permitido: tienePermiso,
      permisoRequerido,
      tipoUsuario: infoUsuario.tipo
    };
  },

  generarMensajeSinPermiso(intencion, infoUsuario, contexto) {
    const asistente = contexto.nombreAsistente || 'Sara';
    
    if (infoUsuario.esCliente) {
      // Mensaje amigable para clientes
      let mensaje = `Hola, soy *${asistente}* 🤗\n\n`;
      mensaje += `Entiendo que quieres consultar sobre *${this.getNombreIntencion(intencion.tipo)}*, `;
      mensaje += `pero esa información solo está disponible para el equipo del negocio.\n\n`;
      mensaje += `📋 *Como cliente puedes:*\n`;
      mensaje += `• 📅 Agendar una cita\n`;
      mensaje += `• 🚗 Ver el estado de tu vehículo\n`;
      mensaje += `• 🔧 Solicitar un servicio\n`;
      mensaje += `• ❓ Preguntar sobre nuestros servicios\n\n`;
      mensaje += `¿En qué puedo ayudarte con esto?`;
      
      return mensaje;
    }

    // Mensaje para secretarios u otros roles
    return `⚠️ No tienes permisos para ${this.getNombreIntencion(intencion.tipo)}.\n\nContacta al administrador si necesitas acceso.`;
  },

  getNombreIntencion(tipo) {
    const nombres = {
      CONSULTAR_STOCK: 'inventario',
      PRODUCTOS_BAJOS: 'alertas de stock',
      LISTA_COMPRAS: 'lista de compras',
      CONSULTAR_VENTAS: 'ventas',
      RESUMEN_VENTAS: 'resumen de ventas',
      RESUMEN_GENERAL: 'resumen del negocio',
      BUSCAR_CLIENTE: 'clientes'
    };
    return nombres[tipo] || tipo.toLowerCase().replace(/_/g, ' ');
  },

  obtenerContextoConversacion(chatId, canal) {
    const key = `${canal}_${chatId}`;
    
    if (!this.conversaciones.has(key)) {
      this.conversaciones.set(key, {
        chatId,
        canal,
        historial: [],
        datosTemporales: {},
        ultimaIntencion: null,
        creado: new Date().toISOString()
      });
    }

    return this.conversaciones.get(key);
  },

  // ============================================
  // DETECCIÓN DE INTENCIÓN
  // ============================================
  async detectarIntencion(mensaje, contexto) {
    const textoLower = mensaje.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Primero intentar con keywords
    let mejorMatch = null;
    let mejorScore = 0;

    for (const [tipo, config] of Object.entries(this.intenciones)) {
      let score = 0;
      
      for (const keyword of config.keywords) {
        const keywordNorm = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (textoLower.includes(keywordNorm)) {
          score += keyword.length; // Palabras más largas = más específicas
        }
      }

      // Ajustar por prioridad (menor prioridad = más importante)
      score = score / config.prioridad;

      if (score > mejorScore) {
        mejorScore = score;
        mejorMatch = { tipo, ...config };
      }
    }

    // Si encontramos match con keywords
    if (mejorMatch && mejorScore > 0) {
      return mejorMatch;
    }

    // Si hay una conversación en curso, mantener contexto
    if (contexto.ultimaIntencion && contexto.datosTemporales.enProceso) {
      return contexto.ultimaIntencion;
    }

    // Si la IA está disponible, usar análisis más profundo
    if (window.IAUnifiedEngine && IAUnifiedEngine.isConfigured && IAUnifiedEngine.isConfigured()) {
      return await this.detectarIntencionConIA(mensaje, contexto);
    }

    // Default: intención general
    return {
      tipo: 'CONVERSACION_GENERAL',
      modulo: 'general',
      accion: 'conversacion',
      prioridad: 5
    };
  },

  async detectarIntencionConIA(mensaje, contexto) {
    const prompt = `Analiza este mensaje y determina la intención del usuario.

Mensaje: "${mensaje}"

Historial reciente:
${contexto.historial.slice(-4).map(h => `${h.role}: ${h.content}`).join('\n')}

INTENCIONES DISPONIBLES:
- CONSULTAR_STOCK: preguntar por inventario/stock de productos
- PRODUCTOS_BAJOS: alertas de stock bajo
- LISTA_COMPRAS: qué productos comprar
- CONSULTAR_VENTAS: preguntar por ventas
- CREAR_CITA: agendar/reservar cita
- VER_CITAS: ver citas programadas
- ESTADO_VEHICULO: estado de reparación
- BUSCAR_PRODUCTO: buscar un producto específico
- RESUMEN_GENERAL: resumen del negocio
- SALUDO: saludo casual
- AYUDA: pedir ayuda

Responde SOLO con JSON:
{
  "intencion": "NOMBRE_INTENCION",
  "confianza": 0.0-1.0,
  "entidades": {
    "producto": "nombre si aplica",
    "fecha": "fecha si aplica",
    "cliente": "nombre si aplica"
  }
}`;

    try {
      const respuesta = await IAUnifiedEngine.sendMessage(prompt, 'Eres un clasificador de intenciones. Responde solo con JSON válido.');
      const parsed = JSON.parse(respuesta.match(/\{[\s\S]*\}/)?.[0] || '{}');
      
      const intencionConfig = this.intenciones[parsed.intencion];
      if (intencionConfig) {
        return {
          tipo: parsed.intencion,
          ...intencionConfig,
          entidades: parsed.entidades || {},
          confianza: parsed.confianza || 0.5
        };
      }
    } catch (e) {
      console.warn('Error detectando intención con IA:', e);
    }

    return {
      tipo: 'CONVERSACION_GENERAL',
      modulo: 'general',
      accion: 'conversacion',
      prioridad: 5
    };
  },

  // ============================================
  // EJECUCIÓN DE ACCIONES
  // ============================================
  async ejecutarAccion(intencion, mensaje, contexto, usuario) {
    const modulo = this.modulos[intencion.modulo];
    
    if (!modulo) {
      return this.handleGeneralConversacion(mensaje, contexto, usuario);
    }

    if (!modulo.disponible()) {
      return `⚠️ El módulo de ${modulo.nombre} no está disponible en este momento.`;
    }

    const handler = modulo.handlers[intencion.accion];
    if (!handler) {
      return this.handleGeneralConversacion(mensaje, contexto, usuario);
    }

    // Guardar última intención
    contexto.ultimaIntencion = intencion;

    try {
      return await handler(mensaje, contexto, usuario, intencion.entidades || {});
    } catch (error) {
      console.error(`Error ejecutando ${intencion.modulo}.${intencion.accion}:`, error);
      return `❌ Error al procesar tu solicitud de ${modulo.nombre}. Por favor intenta de nuevo.`;
    }
  },

  // ============================================
  // HANDLERS DE INVENTARIO
  // ============================================
  async handleInventarioConsultar(mensaje, contexto, usuario, entidades) {
    const productos = this.obtenerColeccion('productos');
    
    // Buscar producto específico si se menciona
    const busqueda = entidades.producto || this.extraerProductoDeMensaje(mensaje);
    
    if (busqueda) {
      const encontrados = productos.filter(p => 
        p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(busqueda.toLowerCase())
      );

      if (encontrados.length === 0) {
        return `❌ No encontré productos con "${busqueda}".\n\n💡 Prueba con otro nombre o usa /stock para ver todo el inventario.`;
      }

      let respuesta = `📦 *Resultados para "${busqueda}":*\n\n`;
      encontrados.slice(0, 8).forEach(p => {
        const nivel = this.getNivelStock(p);
        respuesta += `${nivel.emoji} *${p.nombre}*\n`;
        respuesta += `   Stock: ${p.stock || 0} | Mín: ${p.stockMinimo || 0}\n`;
        respuesta += `   Precio: $${(p.precio || 0).toFixed(2)}\n\n`;
      });

      return respuesta;
    }

    // Resumen general
    const resumen = this.calcularResumenStock(productos);
    return `📊 *Estado del Inventario*

📦 Total productos: ${resumen.total}
✅ Stock normal: ${resumen.normal}
🟡 Stock bajo: ${resumen.bajo}
🟠 Stock muy bajo: ${resumen.muyBajo}
🔴 Stock crítico: ${resumen.critico}
⚫ Sin stock: ${resumen.sinStock}

💡 Pregunta por un producto específico o usa:
• "productos bajo stock" - ver alertas
• "qué debo comprar" - lista de compras`;
  },

  async handleInventarioAlertas(mensaje, contexto, usuario) {
    const productos = this.obtenerColeccion('productos');
    const problematicos = productos.filter(p => {
      const stock = p.stock || 0;
      const minimo = p.stockMinimo || 10;
      return stock <= minimo;
    }).sort((a, b) => (a.stock || 0) - (b.stock || 0));

    if (problematicos.length === 0) {
      return `✅ ¡Excelente! No hay productos con stock bajo.\n\nTodos los productos están en niveles normales.`;
    }

    let respuesta = `⚠️ *${problematicos.length} Productos con Stock Bajo*\n\n`;

    const criticos = problematicos.filter(p => (p.stock || 0) <= 2);
    if (criticos.length > 0) {
      respuesta += `🔴 *CRÍTICOS:*\n`;
      criticos.slice(0, 5).forEach(p => {
        respuesta += `• ${p.nombre}: ${p.stock || 0} unid.\n`;
      });
      respuesta += '\n';
    }

    const bajos = problematicos.filter(p => (p.stock || 0) > 2 && (p.stock || 0) <= 10);
    if (bajos.length > 0) {
      respuesta += `🟠 *MUY BAJOS:*\n`;
      bajos.slice(0, 5).forEach(p => {
        respuesta += `• ${p.nombre}: ${p.stock || 0} unid.\n`;
      });
    }

    respuesta += `\n💡 Escribe "lista de compras" para ver qué pedir.`;
    return respuesta;
  },

  async handleInventarioCompras(mensaje, contexto, usuario) {
    const productos = this.obtenerColeccion('productos');
    const necesitan = productos.filter(p => {
      const stock = p.stock || 0;
      const minimo = p.stockMinimo || 10;
      return stock <= minimo;
    }).sort((a, b) => (a.stock || 0) - (b.stock || 0));

    if (necesitan.length === 0) {
      return `✅ No hay productos que necesiten reabastecimiento urgente.`;
    }

    let respuesta = `🛒 *Lista de Compras Sugerida*\n\n`;
    let totalEstimado = 0;

    necesitan.slice(0, 15).forEach(p => {
      const faltante = Math.max((p.stockMinimo || 10) - (p.stock || 0), 5);
      const costo = faltante * (p.costo || p.precio * 0.6 || 0);
      totalEstimado += costo;
      
      const emoji = (p.stock || 0) <= 2 ? '🔴' : '🟠';
      respuesta += `${emoji} *${p.nombre}*\n`;
      respuesta += `   Actual: ${p.stock || 0} → Pedir: ~${faltante}\n`;
    });

    respuesta += `\n💰 Inversión estimada: ~$${totalEstimado.toFixed(2)}`;
    return respuesta;
  },

  // ============================================
  // HANDLERS DE VENTAS
  // ============================================
  async handleVentasConsultar(mensaje, contexto, usuario) {
    const ventas = this.obtenerColeccion('ventas');
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    
    const ventasHoy = ventas.filter(v => new Date(v.fecha) >= inicioHoy);
    const totalHoy = ventasHoy.reduce((sum, v) => sum + (v.total || 0), 0);
    const ticketPromedio = ventasHoy.length > 0 ? totalHoy / ventasHoy.length : 0;

    return `💰 *Ventas de Hoy*

📊 Cantidad: ${ventasHoy.length} ventas
💵 Total: $${totalHoy.toFixed(2)}
🎫 Ticket promedio: $${ticketPromedio.toFixed(2)}

${ventasHoy.length > 0 ? `📋 *Últimas ventas:*\n${ventasHoy.slice(-5).reverse().map(v => {
  const hora = new Date(v.fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  return `• ${hora} - $${(v.total || 0).toFixed(2)}`;
}).join('\n')}` : ''}

💡 Pregunta por "ventas de la semana" o "ventas del mes"`;
  },

  async handleVentasResumen(mensaje, contexto, usuario) {
    const ventas = this.obtenerColeccion('ventas');
    const hoy = new Date();
    
    // Hoy
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const ventasHoy = ventas.filter(v => new Date(v.fecha) >= inicioHoy);
    const totalHoy = ventasHoy.reduce((sum, v) => sum + (v.total || 0), 0);

    // Semana
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    const ventasSemana = ventas.filter(v => new Date(v.fecha) >= inicioSemana);
    const totalSemana = ventasSemana.reduce((sum, v) => sum + (v.total || 0), 0);

    // Mes
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ventasMes = ventas.filter(v => new Date(v.fecha) >= inicioMes);
    const totalMes = ventasMes.reduce((sum, v) => sum + (v.total || 0), 0);

    return `📊 *Resumen de Ventas*

📅 *Hoy:*
   ${ventasHoy.length} ventas - $${totalHoy.toFixed(2)}

📆 *Esta semana:*
   ${ventasSemana.length} ventas - $${totalSemana.toFixed(2)}

🗓️ *Este mes:*
   ${ventasMes.length} ventas - $${totalMes.toFixed(2)}

📈 Promedio diario del mes: $${(totalMes / hoy.getDate()).toFixed(2)}`;
  },

  // ============================================
  // HANDLERS DE AGENDA
  // ============================================
  async handleAgendaCrear(mensaje, contexto, usuario) {
    // Si hay AgendaIAAgent disponible, usarlo
    if (window.AgendaIAAgent && AgendaIAAgent.initialized) {
      // Marcar que estamos en proceso de crear cita
      contexto.datosTemporales.enProceso = true;
      contexto.datosTemporales.tipo = 'cita';

      // Intentar extraer datos del mensaje
      const datosExtraidos = this.extraerDatosCita(mensaje);
      
      if (Object.keys(datosExtraidos).length > 0) {
        contexto.datosTemporales.citaParcial = {
          ...contexto.datosTemporales.citaParcial,
          ...datosExtraidos
        };
      }

      // Verificar qué campos faltan
      const camposRequeridos = ['cliente_nombre', 'servicio', 'fecha', 'hora'];
      const faltantes = camposRequeridos.filter(c => !contexto.datosTemporales.citaParcial?.[c]);

      if (faltantes.length === 0) {
        // Tenemos todos los datos, crear la cita
        return await this.crearCitaReal(contexto.datosTemporales.citaParcial, usuario);
      }

      // Pedir datos faltantes
      const pregunta = this.generarPreguntaCita(faltantes[0], contexto.datosTemporales.citaParcial);
      return pregunta;
    }

    return `📅 Para agendar una cita necesito:
• Nombre del cliente
• Tipo de servicio
• Fecha y hora preferida

Por favor envíame estos datos.

_Ejemplo: "Cita para Juan García, cambio de aceite, mañana a las 10:00"_`;
  },

  async handleAgendaListar(mensaje, contexto, usuario) {
    const citas = this.obtenerColeccion('citas');
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    
    const citasHoy = citas.filter(c => {
      const fechaCita = new Date(c.fecha);
      return fechaCita >= inicioHoy && fechaCita < new Date(inicioHoy.getTime() + 24*60*60*1000);
    });

    if (citasHoy.length === 0) {
      return `📅 No hay citas programadas para hoy.\n\n💡 Escribe "agendar cita" para crear una nueva.`;
    }

    let respuesta = `📅 *Citas de Hoy (${citasHoy.length})*\n\n`;
    citasHoy.sort((a, b) => a.hora?.localeCompare(b.hora)).forEach(c => {
      const estado = c.estado === 'confirmada' ? '✅' : c.estado === 'pendiente' ? '⏳' : '❓';
      respuesta += `${estado} *${c.hora || '--:--'}* - ${c.cliente_nombre || 'Sin nombre'}\n`;
      respuesta += `   ${c.servicio || 'Servicio no especificado'}\n\n`;
    });

    return respuesta;
  },

  async handleAgendaCancelar(mensaje, contexto, usuario) {
    return `🚫 Para cancelar una cita necesito más información.

Por favor indícame:
• Nombre del cliente
• Fecha de la cita

_Ejemplo: "Cancelar cita de Juan García del viernes"_`;
  },

  // ============================================
  // HANDLERS DE CLIENTES
  // ============================================
  async handleClientesBuscar(mensaje, contexto, usuario) {
    const clientes = this.obtenerColeccion('clientes');
    const busqueda = this.extraerNombreDeMensaje(mensaje);

    if (!busqueda) {
      return `👥 Tenemos ${clientes.length} clientes registrados.\n\nPara buscar uno específico, dime su nombre o cédula.`;
    }

    const encontrados = clientes.filter(c =>
      c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.cedula?.includes(busqueda) ||
      c.telefono?.includes(busqueda)
    );

    if (encontrados.length === 0) {
      return `❌ No encontré clientes con "${busqueda}"`;
    }

    let respuesta = `👤 *Clientes encontrados:*\n\n`;
    encontrados.slice(0, 5).forEach(c => {
      respuesta += `*${c.nombre}*\n`;
      respuesta += `   📱 ${c.telefono || 'Sin teléfono'}\n`;
      respuesta += `   🆔 ${c.cedula || 'Sin cédula'}\n\n`;
    });

    return respuesta;
  },

  // ============================================
  // HANDLERS DE ÓRDENES
  // ============================================
  async handleOrdenesEstado(mensaje, contexto, usuario) {
    const ordenes = this.obtenerColeccion('ordenes_trabajo');
    
    // Buscar por placa o nombre de cliente
    const placa = this.extraerPlacaDeMensaje(mensaje);
    
    if (placa) {
      const orden = ordenes.find(o => o.placa?.toLowerCase() === placa.toLowerCase());
      if (orden) {
        return `🚗 *Estado de vehículo ${placa}*

📋 Orden: #${orden.id}
👤 Cliente: ${orden.cliente_nombre || 'N/A'}
🔧 Servicio: ${orden.servicio || orden.descripcion}
📊 Estado: ${this.formatearEstadoOrden(orden.estado)}
📅 Ingreso: ${orden.fechaRecepcion || orden.fecha || 'N/A'}

${orden.notas ? `📝 Notas: ${orden.notas}` : ''}`;
      }
    }

    // Mostrar órdenes pendientes
    const pendientes = ordenes.filter(o => o.estado !== 'completada' && o.estado !== 'entregado');
    
    if (pendientes.length === 0) {
      return `✅ No hay órdenes de trabajo pendientes.`;
    }

    let respuesta = `🔧 *Órdenes Pendientes (${pendientes.length})*\n\n`;
    pendientes.slice(0, 5).forEach(o => {
      respuesta += `#${o.id} - ${o.placa || 'Sin placa'}\n`;
      respuesta += `   ${o.servicio || o.descripcion || 'Sin descripción'}\n`;
      respuesta += `   Estado: ${this.formatearEstadoOrden(o.estado)}\n\n`;
    });

    return respuesta;
  },

  async handleOrdenesCrear(mensaje, contexto, usuario) {
    return `🔧 Para crear una orden de trabajo necesito:

• Datos del cliente
• Datos del vehículo (placa, marca, modelo)
• Descripción del servicio

Te recomiendo usar el panel de órdenes de trabajo en el sistema para crear una nueva orden completa.`;
  },

  // ============================================
  // HANDLERS DE PRODUCTOS
  // ============================================
  async handleProductosBuscar(mensaje, contexto, usuario) {
    return await this.handleInventarioConsultar(mensaje, contexto, usuario, {});
  },

  async handleProductosListar(mensaje, contexto, usuario) {
    const productos = this.obtenerColeccion('productos');
    
    // Agrupar por categoría
    const porCategoria = {};
    productos.forEach(p => {
      const cat = p.categoria || 'Sin categoría';
      if (!porCategoria[cat]) porCategoria[cat] = 0;
      porCategoria[cat]++;
    });

    let respuesta = `📦 *Catálogo de Productos*\n`;
    respuesta += `Total: ${productos.length} productos\n\n`;

    Object.entries(porCategoria)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([cat, count]) => {
        respuesta += `📁 ${cat}: ${count}\n`;
      });

    respuesta += `\n💡 Pregunta por un producto específico para ver detalles.`;
    return respuesta;
  },

  // ============================================
  // HANDLERS GENERALES
  // ============================================
  async handleGeneralResumen(mensaje, contexto, usuario) {
    const productos = this.obtenerColeccion('productos');
    const ventas = this.obtenerColeccion('ventas');
    const clientes = this.obtenerColeccion('clientes');
    const citas = this.obtenerColeccion('citas');
    
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    
    const resumenStock = this.calcularResumenStock(productos);
    const ventasHoy = ventas.filter(v => new Date(v.fecha) >= inicioHoy);
    const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + (v.total || 0), 0);
    const citasHoy = citas.filter(c => {
      const fecha = new Date(c.fecha);
      return fecha >= inicioHoy && fecha < new Date(inicioHoy.getTime() + 24*60*60*1000);
    });

    const valorInventario = productos.reduce((sum, p) => 
      sum + ((p.precio || 0) * (p.stock || 0)), 0);

    return `📊 *RESUMEN DEL NEGOCIO*
━━━━━━━━━━━━━━━━━

📦 *INVENTARIO*
• ${productos.length} productos
• Valor: $${valorInventario.toFixed(2)}
• ⚠️ ${resumenStock.bajo + resumenStock.critico + resumenStock.muyBajo} en alerta

💰 *VENTAS HOY*
• ${ventasHoy.length} ventas
• Total: $${totalVentasHoy.toFixed(2)}

📅 *CITAS HOY*
• ${citasHoy.length} programadas

👥 *CLIENTES*
• ${clientes.length} registrados

${resumenStock.critico > 0 ? `\n⚠️ ¡${resumenStock.critico} productos en estado crítico!` : ''}`;
  },

  handleGeneralAyuda(mensaje, contexto, usuario) {
    return `🆘 *¿En qué puedo ayudarte?*

📦 *Inventario:*
• "¿Cuánto stock tengo de...?"
• "¿Qué productos están bajos?"
• "¿Qué debo comprar?"

💰 *Ventas:*
• "¿Cuánto vendí hoy?"
• "Resumen de ventas"

📅 *Agenda:*
• "Agendar cita"
• "Citas de hoy"

🔧 *Taller:*
• "Estado de mi vehículo"
• "Órdenes pendientes"

📊 *General:*
• "Resumen del negocio"

💡 Puedes escribir en lenguaje natural, ¡te entenderé!`;
  },

  handleGeneralSaludo(mensaje, contexto, usuario) {
    // NUEVO: Usar saludo personalizado según tipo de usuario
    if (window.TelegramNotificaciones && contexto.chatId) {
      const saludoPersonalizado = TelegramNotificaciones.getSaludoPersonalizado(
        contexto.chatId,
        usuario?.nombre || usuario?.first_name
      );
      if (saludoPersonalizado) {
        return saludoPersonalizado;
      }
    }

    // Fallback al saludo genérico
    const hora = new Date().getHours();
    let saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
    const nombre = usuario?.nombre || usuario?.first_name || '';
    const asistente = contexto.nombreAsistente || 'Sara';
    
    // Adaptar según tipo de usuario
    if (contexto.tipoUsuario === 'CLIENTE') {
      return `${saludo}${nombre ? ` ${nombre}` : ''} 👋

Soy *${asistente}*, tu asistente personal.

¿En qué puedo ayudarte?
• 📅 Agendar una cita
• 🚗 Ver estado de tu vehículo
• 🔧 Solicitar un servicio`;
    }

    return `${saludo}${nombre ? ` ${nombre}` : ''} 👋

Soy *${asistente}*, asistente de gestión.

💡 Puedes preguntarme sobre:
• 📦 Stock e inventario
• 💰 Ventas del día
• 📅 Agendar citas
• 🔧 Estado de órdenes

O escribe /ayuda para ver todas las opciones.`;
  },

  async handleGeneralConversacion(mensaje, contexto, usuario) {
    // Si la IA está disponible, usar para conversación general
    if (window.IAUnifiedEngine && IAUnifiedEngine.isConfigured && IAUnifiedEngine.isConfigured()) {
      try {
        const systemPrompt = `Eres el asistente virtual de un negocio. Responde de forma breve y útil.
Si el usuario pregunta algo que no puedes responder, sugiere usar los comandos disponibles.
Mantén las respuestas cortas (máximo 300 caracteres).`;

        const respuesta = await IAUnifiedEngine.sendMessage(mensaje, systemPrompt);
        return respuesta.substring(0, 500);
      } catch (e) {
        console.error('Error en conversación IA:', e);
      }
    }

    return `No estoy seguro de cómo ayudarte con eso 🤔

Prueba con:
• "stock de [producto]"
• "ventas de hoy"
• "resumen"
• /ayuda`;
  },

  // ============================================
  // UTILIDADES
  // ============================================
  extraerProductoDeMensaje(mensaje) {
    // Patrones para extraer nombres de productos
    const patrones = [
      /(?:stock|cuantos?|cuántos?|hay|tengo|quedan?)\s+(?:de\s+)?(.+?)(?:\?|$)/i,
      /(?:buscar?|precio\s+de)\s+(.+?)(?:\?|$)/i,
      /(.+?)\s+(?:hay|tengo|quedan)/i
    ];

    for (const patron of patrones) {
      const match = mensaje.match(patron);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  },

  extraerNombreDeMensaje(mensaje) {
    const patrones = [
      /(?:cliente|buscar)\s+(.+?)(?:\?|$)/i,
      /(?:datos\s+de|información\s+de)\s+(.+?)(?:\?|$)/i
    ];

    for (const patron of patrones) {
      const match = mensaje.match(patron);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  },

  extraerPlacaDeMensaje(mensaje) {
    const match = mensaje.match(/([A-Z]{2,3}[-\s]?\d{3,4})/i);
    return match ? match[1].toUpperCase() : null;
  },

  extraerDatosCita(mensaje) {
    const datos = {};
    
    // Extraer nombre
    const nombreMatch = mensaje.match(/(?:para|cliente)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+?)(?:,|\.|para|el|la|mañana|hoy)/i);
    if (nombreMatch) datos.cliente_nombre = nombreMatch[1].trim();

    // Extraer servicio
    const servicios = ['cambio de aceite', 'mantenimiento', 'revisión', 'reparación', 'diagnóstico', 'alineación', 'balanceo'];
    for (const servicio of servicios) {
      if (mensaje.toLowerCase().includes(servicio)) {
        datos.servicio = servicio;
        break;
      }
    }

    // Extraer fecha
    if (mensaje.toLowerCase().includes('mañana')) {
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      datos.fecha = manana.toISOString().split('T')[0];
    } else if (mensaje.toLowerCase().includes('hoy')) {
      datos.fecha = new Date().toISOString().split('T')[0];
    }

    // Extraer hora
    const horaMatch = mensaje.match(/(\d{1,2})[:\s]?(\d{2})?\s*(?:am|pm|hrs?|horas?)?/i);
    if (horaMatch) {
      let hora = parseInt(horaMatch[1]);
      const minutos = horaMatch[2] || '00';
      if (mensaje.toLowerCase().includes('pm') && hora < 12) hora += 12;
      datos.hora = `${hora.toString().padStart(2, '0')}:${minutos}`;
    }

    return datos;
  },

  generarPreguntaCita(campo, datosActuales) {
    const preguntas = {
      cliente_nombre: '👤 ¿Cuál es el nombre del cliente?',
      cliente_telefono: '📱 ¿Cuál es el teléfono de contacto?',
      servicio: '🔧 ¿Qué tipo de servicio necesita?',
      fecha: '📅 ¿Para qué fecha? (ej: mañana, 25/11/2025)',
      hora: '🕒 ¿A qué hora? (ej: 10:00, 3pm)'
    };

    let respuesta = preguntas[campo] || `Por favor proporciona: ${campo}`;
    
    if (Object.keys(datosActuales || {}).length > 0) {
      respuesta += '\n\n📋 _Datos recopilados:_\n';
      for (const [key, value] of Object.entries(datosActuales)) {
        if (value) respuesta += `• ${key}: ${value}\n`;
      }
    }

    return respuesta;
  },

  async crearCitaReal(datos, usuario) {
    try {
      const citas = this.obtenerColeccion('citas');
      const nuevaCita = {
        id: Date.now(),
        ...datos,
        estado: 'pendiente',
        origen: 'telegram',
        creadoPor: usuario?.nombre || 'Telegram Bot',
        fechaCreacion: new Date().toISOString()
      };

      citas.push(nuevaCita);
      Database.setCollection('citas', citas);

      return `✅ *¡Cita creada exitosamente!*

📅 Fecha: ${datos.fecha}
🕒 Hora: ${datos.hora}
👤 Cliente: ${datos.cliente_nombre}
🔧 Servicio: ${datos.servicio}

Te enviaremos un recordatorio antes de la cita.`;
    } catch (error) {
      console.error('Error creando cita:', error);
      return '❌ Error al crear la cita. Por favor intenta de nuevo.';
    }
  },

  getNivelStock(producto) {
    const stock = producto.stock || 0;
    if (stock === 0) return { emoji: '⚫', nivel: 'sin-stock' };
    if (stock <= 2) return { emoji: '🔴', nivel: 'critico' };
    if (stock <= 5) return { emoji: '🟠', nivel: 'muy-bajo' };
    if (stock <= (producto.stockMinimo || 10)) return { emoji: '🟡', nivel: 'bajo' };
    return { emoji: '✅', nivel: 'normal' };
  },

  calcularResumenStock(productos) {
    const resumen = { total: productos.length, normal: 0, bajo: 0, muyBajo: 0, critico: 0, sinStock: 0 };
    
    productos.forEach(p => {
      const stock = p.stock || 0;
      const minimo = p.stockMinimo || 10;
      
      if (stock === 0) resumen.sinStock++;
      else if (stock <= 2) resumen.critico++;
      else if (stock <= 5) resumen.muyBajo++;
      else if (stock <= minimo) resumen.bajo++;
      else resumen.normal++;
    });

    return resumen;
  },

  formatearEstadoOrden(estado) {
    const estados = {
      pendiente: '⏳ Pendiente',
      en_proceso: '🔧 En proceso',
      esperando_repuestos: '📦 Esperando repuestos',
      listo: '✅ Listo para entrega',
      completada: '✔️ Completada',
      entregado: '🚗 Entregado'
    };
    return estados[estado] || estado || 'Sin estado';
  },

  log(...args) {
    if (this.config.debug) {
      console.log('🧠 [IAManager]', ...args);
    }
  }
};

// Auto-inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => IAManagerAgent.init());
} else {
  IAManagerAgent.init();
}
