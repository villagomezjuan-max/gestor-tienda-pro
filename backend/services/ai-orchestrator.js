// ============================================
// SERVICIO: Orquestador de IA Dual
// ============================================
// Workflow profesional usando Deepseek (razonamiento) + Gemini (síntesis)
// para procesamiento inteligente de notificaciones

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { fetch } = require('undici');

/**
 * Orquestador de IA que coordina Deepseek y Gemini
 * - Deepseek: Análisis, scoring, priorización
 * - Gemini: Enriquecimiento de mensajes, síntesis, tone
 */
class AIOrchestrator {
  constructor(config = {}) {
    this.config = {
      geminiApiKey: config.geminiApiKey || process.env.GEMINI_API_KEY,
      deepseekApiKey: config.deepseekApiKey || process.env.DEEPSEEK_API_KEY,
      deepseekBaseUrl: config.deepseekBaseUrl || 'https://api.deepseek.com',
      defaultTemperature: config.temperature || 0.7,
      maxRetries: config.maxRetries || 3,
      cacheEnabled: config.cacheEnabled !== false,
      cacheTTL: config.cacheTTL || 3600000, // 1 hora
    };

    // Cache en memoria (simple)
    this.cache = new Map();

    // Inicializar clientes
    if (this.config.geminiApiKey) {
      this.geminiClient = new GoogleGenerativeAI(this.config.geminiApiKey);
    }
  }

  /**
   * Genera hash simple para caché
   */
  _generateHash(input) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(JSON.stringify(input)).digest('hex');
  }

  /**
   * Obtener desde caché
   */
  _getFromCache(key) {
    if (!this.config.cacheEnabled) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Guardar en caché
   */
  _saveToCache(key, data) {
    if (!this.config.cacheEnabled) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Llamada a Deepseek API
   */
  async _callDeepseek(messages, options = {}) {
    if (!this.config.deepseekApiKey) {
      throw new Error('Deepseek API key no configurada');
    }

    const model = options.model || 'deepseek-reasoner';
    const temperature = options.temperature ?? this.config.defaultTemperature;

    const response = await fetch(`${this.config.deepseekBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.deepseekApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: options.maxTokens || 2000,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Deepseek API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage,
      model: data.model,
    };
  }

  /**
   * Llamada a Gemini API
   */
  async _callGemini(prompt, options = {}) {
    if (!this.geminiClient) {
      throw new Error('Gemini API key no configurada');
    }

    const modelName = options.model || 'gemini-2.5-flash';
    const model = this.geminiClient.getGenerativeModel({ model: modelName });

    const generationConfig = {
      temperature: options.temperature ?? this.config.defaultTemperature,
      maxOutputTokens: options.maxTokens || 1000,
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = await result.response;
    return {
      content: response.text(),
      usage: response.usageMetadata,
      model: modelName,
    };
  }

  /**
   * WORKFLOW 1: Análisis y Scoring con Deepseek
   * Usa razonamiento avanzado para evaluar urgencia e impacto
   */
  async analyzeEventPriority(eventData) {
    const cacheKey = this._generateHash({ action: 'analyze', data: eventData });
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();

    // Preparar contexto estructurado
    const messages = [
      {
        role: 'system',
        content: `Eres un asistente experto en priorización de eventos de negocio.
Analiza eventos y asigna scores de urgencia (0-10) e impacto (0-10).

CRITERIOS DE URGENCIA:
- 9-10: Crítico, requiere acción inmediata (stock agotado, orden urgente)
- 7-8: Alta prioridad, atender hoy (stock bajo crítico, cita próxima)
- 5-6: Prioridad media, atender esta semana (productos por vencer pronto)
- 3-4: Baja prioridad, puede esperar
- 0-2: Informativo, sin urgencia

CRITERIOS DE IMPACTO:
- 9-10: Afecta ventas, clientes o finanzas directamente
- 7-8: Afecta operaciones importantes
- 5-6: Afecta eficiencia interna
- 3-4: Impacto menor
- 0-2: Sin impacto significativo

Responde SOLO con JSON válido, sin markdown:
{
  "urgencia": <número>,
  "impacto": <número>,
  "razon": "<explicación breve>",
  "categoria": "<crítico|alto|medio|bajo|info>"
}`,
      },
      {
        role: 'user',
        content: `Analiza este evento:

Tipo: ${eventData.tipo_evento}
Módulo: ${eventData.modulo_origen}
Contexto: ${JSON.stringify(eventData.contexto, null, 2)}

Proporciona el análisis en JSON.`,
      },
    ];

    try {
      const result = await this._callDeepseek(messages, {
        model: 'deepseek-reasoner',
        temperature: 0.3, // Más determinista para scoring
      });

      // Parsear respuesta JSON
      let analysis;
      try {
        // Limpiar markdown si existe
        const cleanContent = result.content.replace(/```json\n?|\n?```/g, '').trim();
        analysis = JSON.parse(cleanContent);
      } catch (e) {
        // Fallback: extraer números del texto
        const urgenciaMatch = result.content.match(/urgencia["\s:]+(\d+)/i);
        const impactoMatch = result.content.match(/impacto["\s:]+(\d+)/i);
        analysis = {
          urgencia: urgenciaMatch ? parseInt(urgenciaMatch[1]) : 5,
          impacto: impactoMatch ? parseInt(impactoMatch[1]) : 5,
          razon: result.content.substring(0, 200),
          categoria: 'medio',
        };
      }

      const response = {
        ...analysis,
        latencia_ms: Date.now() - startTime,
        modelo_usado: result.model,
        tokens: result.usage?.total_tokens || 0,
      };

      this._saveToCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error en análisis Deepseek:', error);
      // Fallback básico
      return {
        urgencia: 5,
        impacto: 5,
        razon: `Análisis automático no disponible: ${error.message}`,
        categoria: 'medio',
        latencia_ms: Date.now() - startTime,
        error: true,
      };
    }
  }

  /**
   * WORKFLOW 2: Enriquecimiento de Mensaje con Gemini
   * Genera mensajes claros, contextuales y accionables
   */
  async enrichMessage(eventData, analysis) {
    const cacheKey = this._generateHash({ action: 'enrich', data: eventData, analysis });
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();

    const prompt = `Eres un asistente de comunicación profesional para un sistema de gestión empresarial.

EVENTO:
- Tipo: ${eventData.tipo_evento}
- Título base: ${eventData.titulo}
- Mensaje base: ${eventData.mensaje}
- Urgencia: ${analysis.urgencia}/10
- Impacto: ${analysis.impacto}/10
- Categoría: ${analysis.categoria}

CONTEXTO ADICIONAL:
${JSON.stringify(eventData.contexto, null, 2)}

TAREA:
Genera un mensaje mejorado para notificación que sea:
1. Claro y conciso (máx 150 caracteres)
2. Contextual y específico
3. Incluya dato clave (cantidad, fecha, nombre)
4. Tono profesional pero amigable
5. Call-to-action claro si es necesario

Responde SOLO con JSON:
{
  "titulo": "<título mejorado>",
  "mensaje": "<mensaje enriquecido>",
  "cta": "<acción sugerida, opcional>",
  "emoji": "<emoji relevante>"
}`;

    try {
      const result = await this._callGemini(prompt, {
        model: 'gemini-2.5-flash',
        temperature: 0.8, // Más creativo para mensajes
        maxTokens: 500,
      });

      let enriched;
      try {
        const cleanContent = result.content.replace(/```json\n?|\n?```/g, '').trim();
        enriched = JSON.parse(cleanContent);
      } catch (e) {
        // Fallback: usar mensaje original
        enriched = {
          titulo: eventData.titulo,
          mensaje: eventData.mensaje,
          cta: null,
          emoji: '📢',
        };
      }

      const response = {
        ...enriched,
        latencia_ms: Date.now() - startTime,
        modelo_usado: result.model,
        tokens: result.usage?.totalTokens || 0,
      };

      this._saveToCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error en enriquecimiento Gemini:', error);
      return {
        titulo: eventData.titulo,
        mensaje: eventData.mensaje,
        cta: null,
        emoji: '📢',
        latencia_ms: Date.now() - startTime,
        error: true,
      };
    }
  }

  /**
   * WORKFLOW 3: Agrupación Inteligente con Deepseek
   * Identifica eventos relacionados que pueden agruparse
   */
  async suggestGrouping(events) {
    if (!events || events.length < 2) return [];

    const cacheKey = this._generateHash({ action: 'group', events: events.map((e) => e.id) });
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();

    const messages = [
      {
        role: 'system',
        content: `Analiza eventos y sugiere agrupaciones lógicas.
Agrupa eventos del mismo tipo o relacionados que puedan enviarse juntos.

Responde con JSON:
{
  "grupos": [
    {
      "eventos": [<array de IDs>],
      "razon": "<por qué agrupar>",
      "titulo_grupo": "<título del resumen>"
    }
  ]
}`,
      },
      {
        role: 'user',
        content: `Eventos a analizar:\n${events
          .map((e, i) => `${i + 1}. [${e.id}] ${e.tipo_evento}: ${e.titulo}`)
          .join('\n')}`,
      },
    ];

    try {
      const result = await this._callDeepseek(messages, {
        model: 'deepseek-chat',
        temperature: 0.5,
      });

      const cleanContent = result.content.replace(/```json\n?|\n?```/g, '').trim();
      const grouping = JSON.parse(cleanContent);

      const response = {
        grupos: grouping.grupos || [],
        latencia_ms: Date.now() - startTime,
        modelo_usado: result.model,
      };

      this._saveToCache(cacheKey, response);
      return response.grupos;
    } catch (error) {
      console.error('Error en agrupación:', error);
      return [];
    }
  }

  /**
   * WORKFLOW 4: Resumen Diario con Gemini
   * Genera resumen ejecutivo de múltiples eventos
   */
  async generateDailySummary(events, negocioInfo) {
    const startTime = Date.now();

    // Agrupar por tipo
    const byType = events.reduce((acc, e) => {
      acc[e.tipo_evento] = acc[e.tipo_evento] || [];
      acc[e.tipo_evento].push(e);
      return acc;
    }, {});

    const prompt = `Genera un resumen ejecutivo diario para ${negocioInfo.nombre || 'el negocio'}.

EVENTOS DEL DÍA (${events.length} total):
${Object.entries(byType)
  .map(
    ([tipo, items]) =>
      `\n${tipo.toUpperCase()} (${items.length}):\n${items.map((e) => `- ${e.titulo}`).join('\n')}`
  )
  .join('\n')}

Crea un resumen estructurado que incluya:
1. Resumen ejecutivo (2-3 líneas)
2. Alertas críticas (si las hay)
3. Tareas pendientes principales
4. Métricas clave

Formato markdown limpio y profesional.`;

    try {
      const result = await this._callGemini(prompt, {
        model: 'gemini-2.5-pro',
        temperature: 0.7,
        maxTokens: 1500,
      });

      return {
        contenido: result.content,
        eventos_incluidos: events.length,
        latencia_ms: Date.now() - startTime,
        modelo_usado: result.model,
      };
    } catch (error) {
      console.error('Error generando resumen:', error);

      // Fallback simple
      return {
        contenido:
          `📊 **Resumen del Día**\n\n` +
          `Total de eventos: ${events.length}\n\n` +
          Object.entries(byType)
            .map(([tipo, items]) => `**${tipo}**: ${items.length} evento(s)`)
            .join('\n'),
        eventos_incluidos: events.length,
        latencia_ms: Date.now() - startTime,
        error: true,
      };
    }
  }

  /**
   * Limpiar caché
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Estadísticas del orquestador
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      cacheEnabled: this.config.cacheEnabled,
      geminiConfigured: !!this.geminiClient,
      deepseekConfigured: !!this.config.deepseekApiKey,
    };
  }
}

module.exports = AIOrchestrator;
