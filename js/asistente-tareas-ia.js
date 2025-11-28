/**
 * ============================================================================
 * ASISTENTE AUTÓNOMO DE TAREAS CON IA (TALLER MECÁNICO)
 * ============================================================================
 * Este agente actúa como un copiloto inteligente para los técnicos.
 * No solo muestra tareas, sino que las analiza, prioriza y asiste en su ejecución.
 */

const AsistenteTareasIA = {
  config: {
    checkInterval: 60000, // Verificar estado cada minuto
    umbralRetraso: 0.8, // Alerta si el tiempo transcurrido > 80% del estimado
    autoPriorizar: true,
    notificarClientes: true, // Enviar actualizaciones automáticas
    aprenderTiempos: true, // Mejorar predicciones con historial
    sugerirRepuestos: true, // Analizar inventario proactivamente
    optimizarRutas: true, // Sugerir orden de trabajo por ubicación
  },

  state: {
    running: false,
    analisisActual: null,
    alertasActivas: [],
    sugerenciasPendientes: [],
    historialPredicciones: [], // Para aprendizaje continuo
    clientesNotificados: new Set(), // Evitar spam
    repuestosSugeridos: new Map(), // Caché de sugerencias
    optimizacionCalculada: null, // Última ruta optimizada
  },

  /**
   * Inicializa el asistente autónomo
   */
  async init() {
    console.log('🤖 Iniciando Asistente Autónomo de Tareas...');
    this.state.running = true;
    this.iniciarMonitoreoAutonomo();
    return this.generarBriefingDiario();
  },

  /**
   * Loop principal de monitoreo autónomo
   */
  iniciarMonitoreoAutonomo() {
    if (this.monitorInterval) clearInterval(this.monitorInterval);

    this.monitorInterval = setInterval(async () => {
      if (!this.state.running) return;

      // 1. Analizar estado actual de tareas
      const analisis = await this.analizarCargaTrabajo();

      // 2. Detectar riesgos
      const riesgos = this.detectarRiesgos(analisis);

      // 3. Emitir alertas si es necesario
      if (riesgos.length > 0) {
        this.notificarRiesgos(riesgos);
      }

      // 4. Ejecutar acciones autónomas inteligentes
      await this.ejecutarAccionesAutonomas(analisis, riesgos);

      this.state.analisisActual = analisis;

      // Actualizar UI si es necesario (disparar evento)
      const event = new CustomEvent('asistente-ia:actualizacion', {
        detail: { analisis, riesgos },
      });
      window.dispatchEvent(event);
    }, this.config.checkInterval);
  },

  /**
   * Genera un resumen inteligente del día para el técnico
   */
  async generarBriefingDiario() {
    let tareas = [];
    try {
      tareas = await this.obtenerTareasDelTecnico();
      if (!Array.isArray(tareas)) tareas = [];
    } catch (e) {
      console.warn('Error obteniendo tareas:', e);
      tareas = [];
    }

    const metricas = this.calcularMetricasAvanzadas(tareas);

    let saludo = 'Buenos días';
    const hora = new Date().getHours();
    if (hora >= 12) saludo = 'Buenas tardes';
    if (hora >= 19) saludo = 'Buenas noches';

    // Análisis de carga con IA (Simulada o Real)
    const analisisCarga = this.interpretarCarga(metricas);

    // Calcular tiempo total correctamente
    const totalMinutos = metricas.total_minutos_estimados || 0;
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    const tiempoFormateado = totalMinutos > 0 ? `${horas}h ${minutos}min` : 'Sin tareas';

    // Calcular eficiencia de forma segura
    let eficiencia = '100%';
    try {
      eficiencia = this.calcularEficienciaPredicha(tareas);
    } catch (e) {
      eficiencia = '100%';
    }

    // Contar repuestos pendientes
    let repuestosPendientes = 0;
    try {
      repuestosPendientes = await this.contarRepuestosPendientes();
    } catch (e) {
      repuestosPendientes = 0;
    }

    return {
      saludo: `${saludo}, aquí tienes tu análisis operativo.`,
      resumen: analisisCarga.mensaje,
      foco_principal: analisisCarga.foco,
      sugerencias: analisisCarga.sugerencias,
      metricas: metricas,
      metricas_avanzadas: {
        tiempo_total_estimado: tiempoFormateado,
        tareas_hoy: metricas.para_hoy || 0,
        eficiencia_predicha: eficiencia,
        repuestos_pendientes: repuestosPendientes,
      },
      estado_animo: analisisCarga.estado, // 'optimista', 'alerta', 'critico'
    };
  },

  /**
   * Analiza profundamente la carga de trabajo actual
   */
  async analizarCargaTrabajo() {
    const tareas = await this.obtenerTareasDelTecnico();
    const ahora = new Date();

    const analisis = {
      total_minutos_estimados: 0,
      tareas_criticas: [],
      cuellos_de_botella: [],
      oportunidades: [],
    };

    tareas.forEach((t) => {
      // Calcular tiempos
      const estimado = t.duracion_estimada || 60; // Default 60 min
      analisis.total_minutos_estimados += estimado;

      // Detectar tareas estancadas
      if (t.estado === 'en_proceso') {
        const inicio = t.fecha_inicio_real ? new Date(t.fecha_inicio_real) : new Date();
        const transcurrido = (ahora - inicio) / (1000 * 60);

        if (transcurrido > estimado * this.config.umbralRetraso) {
          analisis.cuellos_de_botella.push({
            id: t.id,
            mensaje: `La orden #${t.numero} lleva ${Math.round(transcurrido)}min (Estimado: ${estimado}min). Riesgo de retraso.`,
          });
        }
      }

      // Detectar oportunidades (ej. tareas cercanas o mismo vehículo)
      // ... lógica avanzada aquí
    });

    return analisis;
  },

  /**
   * Genera un checklist técnico inteligente basado en el problema
   */
  async generarChecklistInteligente(orden) {
    // Intentar usar el motor de IA unificado si existe
    if (window.IAUnifiedEngine && typeof IAUnifiedEngine.sendMessage === 'function') {
      try {
        const prompt = `
                    Actúa como jefe de taller experto. Genera un checklist técnico paso a paso para:
                    Vehículo: ${orden.vehiculo_marca} ${orden.vehiculo_modelo}
                    Problema: ${orden.problema_reportado}
                    
                    Responde SOLO con un JSON array de strings. Ejemplo: ["Verificar batería", "Revisar alternador"]
                `;
        const respuesta = await IAUnifiedEngine.sendMessage(prompt);
        const checklist = this.parsearRespuestaJSON(respuesta);
        if (checklist) return checklist;
      } catch (e) {
        console.warn('IA no disponible, usando generador heurístico');
      }
    }

    // Fallback heurístico avanzado
    const problema = (orden.problema_reportado || '').toLowerCase();
    const checklist = ['Inspección visual inicial', 'Verificar kilometraje y fluidos'];

    if (problema.includes('freno') || problema.includes('ruido')) {
      checklist.push(
        'Desmontar ruedas y revisar pastillas',
        'Verificar estado de discos',
        'Purgar sistema de frenos si es necesario'
      );
    } else if (problema.includes('aceite') || problema.includes('mantenimiento')) {
      checklist.push(
        'Drenar aceite motor',
        'Cambiar filtro de aceite',
        'Revisar filtro de aire',
        'Verificar niveles generales'
      );
    } else if (problema.includes('motor') || problema.includes('falla')) {
      checklist.push(
        'Escanear códigos de error (OBDII)',
        'Revisar bujías y bobinas',
        'Verificar compresión si es necesario'
      );
    } else {
      checklist.push('Diagnóstico general del sistema reportado', 'Prueba de ruta');
    }

    checklist.push('Limpieza básica de zona de trabajo', 'Informe final de servicio');
    return checklist;
  },

  /**
   * Predice la probabilidad de terminar a tiempo
   */
  predecirEntrega(orden) {
    const ahora = new Date();
    const entregaEstimada = new Date(orden.fecha_entrega_estimada);
    const horasRestantes = (entregaEstimada - ahora) / (1000 * 60 * 60);

    // Factores de riesgo
    let riesgo = 0; // 0-100
    let razones = [];

    // 1. Tiempo restante vs Duración típica
    if (horasRestantes < 2 && orden.estado === 'recibido') {
      riesgo += 80;
      razones.push('Poco tiempo restante y trabajo no iniciado');
    }

    // 2. Complejidad del problema (análisis de texto simple)
    const palabrasComplejas = ['motor', 'caja', 'transmisión', 'eléctrico', 'fuga interna'];
    const esComplejo = palabrasComplejas.some((p) =>
      (orden.problema_reportado || '').toLowerCase().includes(p)
    );
    if (esComplejo) {
      riesgo += 30;
      razones.push('Problema reportado de alta complejidad');
    }

    // 3. Disponibilidad de repuestos (Simulado - idealmente consultaría inventario)
    // if (!checkInventario(orden.items)) riesgo += 50;

    return {
      probabilidad_exito: Math.max(0, 100 - riesgo),
      nivel_riesgo: riesgo > 70 ? 'alto' : riesgo > 30 ? 'medio' : 'bajo',
      razones: razones,
      sugerencia: riesgo > 50 ? 'Considerar reprogramar o solicitar ayuda' : 'En camino correcto',
    };
  },

  /**
   * Utilidades internas
   */
  async obtenerTareasDelTecnico() {
    // Usar el DataProvider existente en MisTareas o DatabaseAPI directo
    if (typeof window.MisTareas !== 'undefined' && MisTareas.getDataProvider) {
      const provider = MisTareas.getDataProvider();
      const session = MisTareas.getActiveSession();
      if (provider && session) {
        return await provider.getOrdenesTrabajo({ tecnicoId: session.userId });
      }
    }
    // Fallback
    if (typeof DatabaseAPI !== 'undefined') {
      return await DatabaseAPI.getOrdenesTrabajo({});
    }
    return [];
  },

  calcularMetricasAvanzadas(tareas) {
    const hoy = new Date().setHours(0, 0, 0, 0);
    let totalMinutos = 0;

    if (Array.isArray(tareas)) {
      tareas.forEach((t) => {
        totalMinutos += parseInt(t.duracion_estimada) || 60;
      });
    }

    return {
      total: Array.isArray(tareas) ? tareas.length : 0,
      total_minutos_estimados: totalMinutos,
      urgentes: Array.isArray(tareas) ? tareas.filter((t) => t.prioridad === 'urgente').length : 0,
      para_hoy: Array.isArray(tareas)
        ? tareas.filter((t) => {
            if (!t.fecha_entrega_estimada) return false;
            return new Date(t.fecha_entrega_estimada).setHours(0, 0, 0, 0) === hoy;
          }).length
        : 0,
      retrasadas: Array.isArray(tareas)
        ? tareas.filter((t) => {
            if (!t.fecha_entrega_estimada) return false;
            return (
              new Date(t.fecha_entrega_estimada) < new Date() &&
              t.estado !== 'finalizado' &&
              t.estado !== 'entregado'
            );
          }).length
        : 0,
    };
  },

  interpretarCarga(metricas) {
    if (metricas.retrasadas > 0) {
      return {
        mensaje: `Atención requerida: Tienes ${metricas.retrasadas} órdenes retrasadas.`,
        foco: 'Resolver retrasos críticos',
        estado: 'critico',
        sugerencias: [
          'Contactar clientes de órdenes retrasadas',
          'Solicitar apoyo para tareas complejas',
        ],
      };
    }
    if (metricas.urgentes > 0) {
      return {
        mensaje: `Día intenso: ${metricas.urgentes} trabajos urgentes pendientes.`,
        foco: 'Prioridad Alta',
        estado: 'alerta',
        sugerencias: [
          'Comenzar por las órdenes marcadas como URGENTE',
          'Verificar repuestos para tareas urgentes ahora',
        ],
      };
    }
    return {
      mensaje: 'Carga de trabajo normal. Buen momento para avanzar preventivos.',
      foco: 'Calidad y Detalle',
      estado: 'optimista',
      sugerencias: [
        'Revisar inventario de consumibles',
        'Actualizar estados de órdenes finalizadas',
      ],
    };
  },

  detectarRiesgos(analisis) {
    return analisis.cuellos_de_botella || [];
  },

  notificarRiesgos(riesgos) {
    // Integración con sistema de notificaciones o UI
    console.warn('⚠️ Riesgos detectados por Asistente IA:', riesgos);
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      Utils.showToast(`⚠️ Alerta IA: ${riesgos.length} posibles retrasos detectados`, 'warning');
    }
  },

  parsearRespuestaJSON(texto) {
    try {
      const match = texto.match(/\[.*\]/s);
      if (match) return JSON.parse(match[0]);
      return JSON.parse(texto);
    } catch (e) {
      return null;
    }
  },

  /**
   * ========================================================================
   * MÓDULO AVANZADO: ACCIONES AUTÓNOMAS INTELIGENTES
   * ========================================================================
   */

  async ejecutarAccionesAutonomas(analisis, riesgos) {
    const acciones = [];

    // 1. Notificar clientes automáticamente si hay cambios
    if (this.config.notificarClientes) {
      const notificaciones = await this.generarNotificacionesClientes(riesgos);
      acciones.push(...notificaciones);
    }

    // 2. Sugerir repuestos basándose en inventario y trabajo actual
    if (this.config.sugerirRepuestos) {
      const sugerencias = await this.analizarNecesidadRepuestos();
      if (sugerencias.length > 0) {
        this.state.repuestosSugeridos.set(Date.now(), sugerencias);
        acciones.push({ tipo: 'repuestos', datos: sugerencias });
      }
    }

    // 3. Optimizar orden de trabajo si hay múltiples tareas
    if (this.config.optimizarRutas && analisis.tareas_criticas.length > 1) {
      const optimizacion = await this.optimizarOrdenTrabajo();
      if (optimizacion) {
        this.state.optimizacionCalculada = optimizacion;
        acciones.push({ tipo: 'optimizacion', datos: optimizacion });
      }
    }

    // 4. Aprender de predicciones pasadas
    if (this.config.aprenderTiempos) {
      await this.actualizarModeloPrediccion();
    }

    return acciones;
  },

  /**
   * Sistema de notificaciones proactivas a clientes
   */
  async generarNotificacionesClientes(riesgos) {
    const notificaciones = [];
    const tareas = await this.obtenerTareasDelTecnico();

    for (const tarea of tareas) {
      const key = `${tarea.id}_${tarea.estado}`;

      // Evitar notificar múltiples veces el mismo estado
      if (this.state.clientesNotificados.has(key)) continue;

      let debeNotificar = false;
      let mensaje = '';

      // Casos de notificación automática
      if (
        tarea.estado === 'en_proceso' &&
        !this.state.clientesNotificados.has(`${tarea.id}_iniciado`)
      ) {
        debeNotificar = true;
        mensaje = `🔧 Hemos iniciado el trabajo en su ${tarea.vehiculo_marca} ${tarea.vehiculo_modelo}. Le mantendremos informado.`;
      }

      if (
        tarea.estado === 'espera_repuestos' &&
        !this.state.clientesNotificados.has(`${tarea.id}_espera`)
      ) {
        debeNotificar = true;
        mensaje = `⏳ Su vehículo está en espera de repuestos. Estimamos continuar en las próximas horas.`;
      }

      // Alerta proactiva de retraso
      const prediccion = this.predecirEntrega(tarea);
      if (
        prediccion.nivel_riesgo === 'alto' &&
        !this.state.clientesNotificados.has(`${tarea.id}_retraso`)
      ) {
        debeNotificar = true;
        mensaje = `⚠️ Detectamos que su servicio podría demorarse. Estamos trabajando para minimizar el impacto. Estimado actualizado: ${this.calcularNuevaFechaEstimada(tarea)}.`;
      }

      if (debeNotificar) {
        notificaciones.push({
          clienteId: tarea.cliente_id,
          clienteNombre: tarea.cliente_nombre,
          mensaje: mensaje,
          ordenId: tarea.id,
          prioridad: prediccion.nivel_riesgo === 'alto' ? 'alta' : 'normal',
        });

        this.state.clientesNotificados.add(key);

        // Integrar con sistema de notificaciones si existe
        if (typeof window.TelegramTaller !== 'undefined') {
          this.enviarNotificacionTelegram(tarea, mensaje);
        }

        if (typeof window.WhatsAppNotifications !== 'undefined') {
          this.enviarNotificacionWhatsApp(tarea, mensaje);
        }
      }
    }

    return notificaciones;
  },

  /**
   * Análisis predictivo de necesidad de repuestos
   */
  async analizarNecesidadRepuestos() {
    const tareas = await this.obtenerTareasDelTecnico();
    const sugerencias = [];

    for (const tarea of tareas) {
      if (tarea.estado === 'finalizado' || tarea.estado === 'cancelado') continue;

      const problema = (tarea.problema_reportado || '').toLowerCase();
      const vehiculo = `${tarea.vehiculo_marca} ${tarea.vehiculo_modelo} ${tarea.vehiculo_ano}`;

      // Análisis heurístico de repuestos probables
      const repuestosProbables = this.predecirRepuestosNecesarios(problema, vehiculo);

      // Verificar disponibilidad en inventario
      if (typeof window.DatabaseAPI !== 'undefined') {
        for (const repuesto of repuestosProbables) {
          const disponible = await this.verificarStockRepuesto(repuesto.nombre);
          if (!disponible || disponible.stock < repuesto.cantidadSugerida) {
            sugerencias.push({
              ordenId: tarea.id,
              repuesto: repuesto.nombre,
              stockActual: disponible?.stock || 0,
              cantidadSugerida: repuesto.cantidadSugerida,
              urgencia: (prediccion) => (prediccion.nivel_riesgo === 'alto' ? 'alta' : 'media'),
              razon: `Necesario para: ${tarea.problema_reportado}`,
            });
          }
        }
      }
    }

    return sugerencias;
  },

  predecirRepuestosNecesarios(problema, vehiculo) {
    const predicciones = [];

    // Base de conocimiento heurística (se puede expandir con IA real)
    const patrones = [
      {
        keywords: ['freno', 'frenado', 'pedal duro', 'ruido freno'],
        repuestos: [
          { nombre: 'Pastillas de freno', cantidad: 1 },
          { nombre: 'Líquido de frenos', cantidad: 1 },
        ],
      },
      {
        keywords: ['aceite', 'cambio aceite', 'lubricante'],
        repuestos: [
          { nombre: 'Aceite motor', cantidad: 1 },
          { nombre: 'Filtro aceite', cantidad: 1 },
        ],
      },
      {
        keywords: ['batería', 'no arranca', 'luces débiles'],
        repuestos: [{ nombre: 'Batería', cantidad: 1 }],
      },
      {
        keywords: ['llanta', 'neumático', 'rueda', 'pinchadura'],
        repuestos: [{ nombre: 'Llanta', cantidad: 1 }],
      },
      {
        keywords: ['suspensión', 'amortiguador', 'bache'],
        repuestos: [{ nombre: 'Amortiguador', cantidad: 2 }],
      },
      {
        keywords: ['filtro aire', 'filtro', 'mantenimiento'],
        repuestos: [{ nombre: 'Filtro de aire', cantidad: 1 }],
      },
      {
        keywords: ['bujía', 'falla motor', 'explosiones'],
        repuestos: [{ nombre: 'Bujías', cantidad: 4 }],
      },
    ];

    for (const patron of patrones) {
      if (patron.keywords.some((kw) => problema.includes(kw))) {
        predicciones.push(
          ...patron.repuestos.map((r) => ({
            nombre: r.nombre,
            cantidadSugerida: r.cantidad,
            confianza: 0.75,
          }))
        );
      }
    }

    return predicciones;
  },

  async verificarStockRepuesto(nombreRepuesto) {
    try {
      if (typeof DatabaseAPI !== 'undefined') {
        const productos = await DatabaseAPI.getProductos();
        return productos.find((p) => p.nombre.toLowerCase().includes(nombreRepuesto.toLowerCase()));
      }
    } catch (e) {
      console.warn('No se pudo verificar stock:', e);
    }
    return null;
  },

  /**
   * Optimización de ruta/orden de trabajo
   */
  async optimizarOrdenTrabajo() {
    const tareas = await this.obtenerTareasDelTecnico();
    const tareasActivas = tareas.filter(
      (t) => !['finalizado', 'entregado', 'cancelado'].includes(t.estado)
    );

    if (tareasActivas.length < 2) return null;

    // Algoritmo de priorización multi-criterio
    const tareasConScore = tareasActivas.map((t) => {
      let score = 0;

      // Factor 1: Prioridad (peso: 40%)
      if (t.prioridad === 'urgente') score += 40;
      else if (t.prioridad === 'alta') score += 25;
      else score += 10;

      // Factor 2: Tiempo restante (peso: 30%)
      const tiempoRestante = this.calcularTiempoRestante(t);
      if (tiempoRestante < 2)
        score += 30; // Menos de 2 horas
      else if (tiempoRestante < 4) score += 20;
      else score += 10;

      // Factor 3: Complejidad (peso: 20%)
      const duracionEstimada = t.duracion_estimada || 60;
      if (duracionEstimada < 30)
        score += 20; // Tareas rápidas primero
      else if (duracionEstimada < 90) score += 15;
      else score += 5;

      // Factor 4: Disponibilidad repuestos (peso: 10%)
      if (t.estado !== 'espera_repuestos') score += 10;

      return { ...t, score_optimizacion: score };
    });

    // Ordenar por score descendente
    tareasConScore.sort((a, b) => b.score_optimizacion - a.score_optimizacion);

    return {
      orden_sugerido: tareasConScore.map((t) => t.id),
      razon: `Optimizado para maximizar entregas a tiempo (${tareasConScore.length} tareas activas)`,
      mejora_estimada: this.calcularMejoraEstimada(tareasActivas, tareasConScore),
    };
  },

  calcularTiempoRestante(tarea) {
    if (!tarea.fecha_entrega_estimada) return 999;
    const ahora = new Date();
    const entrega = new Date(tarea.fecha_entrega_estimada);
    return (entrega - ahora) / (1000 * 60 * 60); // Horas
  },

  calcularMejoraEstimada(original, optimizado) {
    // Simplificado: % de tareas urgentes priorizadas
    const urgentesTop3 = optimizado.slice(0, 3).filter((t) => t.prioridad === 'urgente').length;
    return `${Math.round((urgentesTop3 / 3) * 100)}% de tareas críticas priorizadas`;
  },

  calcularNuevaFechaEstimada(tarea) {
    const ahora = new Date();
    const duracion = (tarea.duracion_estimada || 60) * 1.5; // Factor de seguridad
    const nueva = new Date(ahora.getTime() + duracion * 60 * 1000);
    return nueva.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
  },

  /**
   * Sistema de aprendizaje continuo
   */
  async actualizarModeloPrediccion() {
    const tareas = await this.obtenerTareasDelTecnico();
    const finalizadas = tareas.filter((t) => t.estado === 'finalizado' || t.estado === 'entregado');

    for (const tarea of finalizadas) {
      if (!tarea.fecha_inicio_real || !tarea.fecha_entrega_real) continue;

      const inicio = new Date(tarea.fecha_inicio_real);
      const fin = new Date(tarea.fecha_entrega_real);
      const duracionReal = (fin - inicio) / (1000 * 60); // minutos
      const duracionEstimada = tarea.duracion_estimada || 60;

      // Guardar para futuras predicciones
      this.state.historialPredicciones.push({
        problema: tarea.problema_reportado,
        vehiculo: `${tarea.vehiculo_marca} ${tarea.vehiculo_modelo}`,
        duracion_estimada: duracionEstimada,
        duracion_real: duracionReal,
        desviacion: duracionReal - duracionEstimada,
        fecha: new Date(),
      });
    }

    // Limitar tamaño del historial (últimos 100 registros)
    if (this.state.historialPredicciones.length > 100) {
      this.state.historialPredicciones = this.state.historialPredicciones.slice(-100);
    }
  },

  /**
   * Predicción mejorada usando historial
   */
  predecirDuracionMejorada(problema, vehiculo) {
    const similares = this.state.historialPredicciones.filter((h) => {
      const problemaMatch = this.calcularSimilitud(h.problema, problema) > 0.6;
      const vehiculoMatch = h.vehiculo.includes(vehiculo.split(' ')[0]); // Por marca
      return problemaMatch || vehiculoMatch;
    });

    if (similares.length > 0) {
      const promedioReal =
        similares.reduce((sum, h) => sum + h.duracion_real, 0) / similares.length;
      return Math.round(promedioReal);
    }

    return 60; // Fallback
  },

  calcularSimilitud(texto1, texto2) {
    const palabras1 = new Set(texto1.toLowerCase().split(/\s+/));
    const palabras2 = new Set(texto2.toLowerCase().split(/\s+/));
    const interseccion = [...palabras1].filter((p) => palabras2.has(p)).length;
    const union = new Set([...palabras1, ...palabras2]).size;
    return interseccion / union;
  },

  calcularEficienciaPredicha(tareas) {
    if (!Array.isArray(tareas) || tareas.length === 0) return '100%';
    try {
      const tareasActivas = tareas.filter(
        (t) => t.estado !== 'finalizado' && t.estado !== 'entregado' && t.estado !== 'cancelado'
      );
      if (tareasActivas.length === 0) return '100%';

      const atrasadas = tareasActivas.filter((t) => {
        try {
          const prediccion = this.predecirEntrega(t);
          return prediccion.nivel_riesgo === 'alto';
        } catch (e) {
          return false;
        }
      }).length;
      const eficiencia = Math.max(0, 100 - (atrasadas / tareasActivas.length) * 100);
      return Math.round(eficiencia) + '%';
    } catch (e) {
      console.warn('Error calculando eficiencia:', e);
      return '100%';
    }
  },

  async contarRepuestosPendientes() {
    const sugerencias = this.state.repuestosSugeridos;
    let total = 0;
    sugerencias.forEach((lista) => {
      total += lista.length;
    });
    return total;
  },

  /**
   * Integración con sistemas de comunicación
   */
  async enviarNotificacionTelegram(tarea, mensaje) {
    if (typeof TelegramTaller !== 'undefined' && TelegramTaller.enviarNotificacion) {
      try {
        await TelegramTaller.enviarNotificacion({
          clienteId: tarea.cliente_id,
          mensaje: mensaje,
          tipo: 'actualizacion_orden',
          ordenId: tarea.id,
        });
        console.log('✅ Notificación Telegram enviada:', tarea.id);
      } catch (e) {
        console.warn('Error enviando Telegram:', e);
      }
    }
  },

  async enviarNotificacionWhatsApp(tarea, mensaje) {
    if (typeof WhatsAppNotifications !== 'undefined' && WhatsAppNotifications.enviar) {
      try {
        await WhatsAppNotifications.enviar({
          telefono: tarea.cliente_telefono,
          mensaje: mensaje,
          orden: tarea.numero,
        });
        console.log('✅ Notificación WhatsApp enviada:', tarea.id);
      } catch (e) {
        console.warn('Error enviando WhatsApp:', e);
      }
    }
  },
};

// Exponer globalmente
window.AsistenteTareasIA = AsistenteTareasIA;
