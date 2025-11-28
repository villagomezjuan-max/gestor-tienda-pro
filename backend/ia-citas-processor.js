/* ========================================
   PROCESADOR IA PARA CITAS
   Backend para procesar solicitudes de citas con IA
   ======================================== */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_PROVIDER = 'deepseek';
const PROVIDER_ALIASES = {
  deepseek: 'deepseek',
  'deepseek-chat': 'deepseek',
  google_gemini: 'google_gemini',
  'google-gemini': 'google_gemini',
  gemini: 'google_gemini',
  'gemini-pro': 'google_gemini',
  'gemini 1.5 pro': 'google_gemini',
  openai: 'openai',
  gpt: 'openai',
  'gpt-4': 'openai',
  gpt4: 'openai',
  'gpt-4o': 'openai',
  'gpt-4o-mini': 'openai',
  lmstudio: 'lm_studio',
  lm_studio: 'lm_studio',
  'lm-studio': 'lm_studio',
};

const PROVIDER_DEFAULTS = {
  deepseek: 'deepseek-chat',
  google_gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  lm_studio: 'local-model',
};

const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_TOKENS = 1200;

function normalizeProvider(provider) {
  if (!provider) {
    return DEFAULT_PROVIDER;
  }
  const key = provider.toString().trim().toLowerCase();
  return PROVIDER_ALIASES[key] || key || DEFAULT_PROVIDER;
}

function pickFirstString(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return '';
}

function parseJSONContent(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('La IA devolvió una respuesta vacía o no textual.');
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    const start = text.indexOf('{');
    if (start >= 0) {
      const candidate = text.slice(start);
      try {
        return JSON.parse(candidate);
      } catch (innerError) {
        const regex = /(\{[\s\S]*\}|\[[\s\S]*\])/;
        const match = candidate.match(regex);
        if (match) {
          try {
            return JSON.parse(match[0]);
          } catch (deepError) {
            console.error('No se pudo interpretar la respuesta JSON de la IA.', deepError);
          }
        }
      }
    }
    throw error;
  }
}

class IACitasProcessor {
  constructor(defaults = {}) {
    this.defaults = defaults;
    this.defaultProvider = normalizeProvider(
      defaults.provider ||
        process.env.CITAS_AI_PROVIDER ||
        process.env.AI_PROVIDER ||
        DEFAULT_PROVIDER
    );
  }

  // ============================================
  // PROCESAR SOLICITUD DE CITA
  // ============================================
  async procesarSolicitudCita(mensaje, contexto = {}, citaParcial = {}, promptPersonalizado) {
    try {
      const prompt = this.construirPrompt(mensaje, contexto, citaParcial);
      const systemPrompt =
        typeof promptPersonalizado === 'string' && promptPersonalizado.trim()
          ? promptPersonalizado.trim()
          : this.getSystemPrompt();

      const iaConfig = this.resolveConfig(contexto?.iaConfig || contexto || {});
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ];

      const rawContent = await this.invokeProvider({
        messages,
        systemPrompt,
        userPrompt: prompt,
        config: iaConfig,
      });

      const respuesta = parseJSONContent(rawContent);

      return await this.postProcesarRespuesta(respuesta, contexto);
    } catch (error) {
      console.error('Error procesando con IA:', error);
      throw error;
    }
  }

  resolveConfig(rawConfig = {}) {
    const source = typeof rawConfig === 'object' && rawConfig !== null ? rawConfig : {};

    const provider = normalizeProvider(
      source.provider || source.ai_provider || this.defaults.provider || this.defaultProvider
    );

    const apiKey = pickFirstString(
      source.apiKey,
      source.ai_api_key,
      this.defaults.apiKey,
      process.env.CITAS_AI_API_KEY,
      process.env.AI_API_KEY,
      provider === 'deepseek' ? source.ia_deepseek_api_key : null,
      provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : null,
      provider === 'google_gemini' ? source.ia_gemini_api_key : null,
      provider === 'google_gemini' ? process.env.GEMINI_API_KEY : null,
      provider === 'openai' ? source.openai_api_key : null,
      provider === 'openai' ? process.env.OPENAI_API_KEY : null,
      provider === 'lm_studio' ? source.ia_llmstudio_api_key : null,
      provider === 'lm_studio' ? process.env.LM_STUDIO_API_KEY : null
    );

    const model =
      pickFirstString(
        source.model,
        source.ai_model,
        this.defaults.model,
        provider === 'deepseek' ? source.ia_deepseek_model : null,
        provider === 'deepseek' ? process.env.DEEPSEEK_MODEL : null,
        provider === 'google_gemini' ? source.ia_gemini_model : null,
        provider === 'google_gemini' ? process.env.GEMINI_MODEL : null,
        provider === 'openai' ? source.openai_model : null,
        provider === 'openai' ? process.env.OPENAI_MODEL : null,
        provider === 'lm_studio' ? source.ia_llmstudio_model : null,
        provider === 'lm_studio' ? process.env.LM_STUDIO_MODEL : null
      ) ||
      PROVIDER_DEFAULTS[provider] ||
      PROVIDER_DEFAULTS[DEFAULT_PROVIDER];

    const baseUrl =
      provider === 'lm_studio'
        ? pickFirstString(
            source.baseUrl,
            source.base_url,
            source.ai_api_url,
            source.apiUrl,
            this.defaults.baseUrl,
            process.env.CITAS_AI_API_URL,
            process.env.LM_STUDIO_URL
          )
        : '';

    return {
      provider,
      apiKey,
      model,
      baseUrl,
    };
  }

  async invokeProvider({ messages, systemPrompt, userPrompt, config }) {
    const provider = normalizeProvider(config.provider);

    if (provider === 'google_gemini') {
      return this.invokeGemini({ systemPrompt, userPrompt, config });
    }
    if (provider === 'deepseek') {
      return this.invokeDeepseek({ messages, config });
    }
    if (provider === 'openai') {
      return this.invokeOpenAI({ messages, config });
    }
    if (provider === 'lm_studio') {
      return this.invokeLMStudio({ messages, config });
    }

    console.warn(
      `Proveedor de IA no reconocido (${config.provider}), usando DeepSeek por defecto.`
    );
    return this.invokeDeepseek({ messages, config: { ...config, provider: 'deepseek' } });
  }

  async invokeDeepseek({ messages, config }) {
    const apiKey = pickFirstString(config.apiKey);
    if (!apiKey) {
      throw new Error('La API Key de DeepSeek no está configurada.');
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || PROVIDER_DEFAULTS.deepseek,
        messages,
        temperature: DEFAULT_TEMPERATURE,
        max_tokens: DEFAULT_MAX_TOKENS,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        `Error de DeepSeek (${response.status}): ${payload.error?.message || response.statusText}`
      );
    }

    return payload.choices?.[0]?.message?.content || '';
  }

  async invokeOpenAI({ messages, config }) {
    const apiKey = pickFirstString(config.apiKey);
    if (!apiKey) {
      throw new Error('La API Key de OpenAI no está configurada.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || PROVIDER_DEFAULTS.openai,
        messages,
        temperature: DEFAULT_TEMPERATURE,
        max_tokens: DEFAULT_MAX_TOKENS,
        response_format: { type: 'json_object' },
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        `Error de OpenAI (${response.status}): ${payload.error?.message || response.statusText}`
      );
    }

    return payload.choices?.[0]?.message?.content || '';
  }

  async invokeGemini({ systemPrompt, userPrompt, config }) {
    const apiKey = pickFirstString(config.apiKey);
    if (!apiKey) {
      throw new Error('La API Key de Google Gemini no está configurada.');
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = config.model || PROVIDER_DEFAULTS.google_gemini;

      console.log(`Usando modelo Gemini: ${modelName}`);

      const generativeModel = genAI.getGenerativeModel({
        model: modelName,
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
        ],
      });

      const result = await generativeModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: DEFAULT_TEMPERATURE,
          maxOutputTokens: DEFAULT_MAX_TOKENS,
          responseMimeType: 'application/json',
        },
      });

      if (result && result.response && typeof result.response.text === 'function') {
        return result.response.text();
      }

      console.error('Respuesta inesperada de Gemini:', result);
      return '';
    } catch (error) {
      // Mejorar mensajes de error para cuentas de pago
      if (error.message && error.message.includes('API key not valid')) {
        throw new Error('API Key de Gemini inválida. Verifica tu clave en Google AI Studio.');
      }
      if (error.message && error.message.includes('quota')) {
        throw new Error(
          'Se alcanzó el límite de cuota de Gemini. Revisa tu plan en Google AI Studio.'
        );
      }
      if (error.message && error.message.includes('permission')) {
        throw new Error(
          `El modelo ${config.model || PROVIDER_DEFAULTS.google_gemini} no está disponible con tu API Key. Verifica los modelos disponibles en tu cuenta.`
        );
      }

      console.error('Error invocando Gemini:', error);
      throw new Error(`Error de Gemini: ${error.message}`);
    }
  }

  async invokeLMStudio({ messages, config }) {
    const endpointBase = (config.baseUrl || 'http://localhost:1234/v1').replace(/\/+$/, '');
    const endpoint = `${endpointBase}/chat/completions`;
    const headers = { 'Content-Type': 'application/json' };

    const apiKey = pickFirstString(config.apiKey);
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model || PROVIDER_DEFAULTS.lm_studio,
        messages,
        temperature: DEFAULT_TEMPERATURE,
        max_tokens: DEFAULT_MAX_TOKENS,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        `Error de LM Studio (${response.status}): ${payload.error?.message || response.statusText}`
      );
    }

    return payload.choices?.[0]?.message?.content || '';
  }

  // ============================================
  // CONSTRUIR PROMPT
  // ============================================
  construirPrompt(mensaje, contexto, citaParcial) {
    let prompt = `MENSAJE DEL USUARIO:\n"${mensaje}"\n\n`;

    // Agregar contexto de fecha actual
    prompt += `CONTEXTO:\n`;
    prompt += `- Fecha actual: ${contexto.fecha_actual || new Date().toISOString()}\n`;
    prompt += `- Día de la semana: ${contexto.dia_semana || new Date().toLocaleDateString('es', { weekday: 'long' })}\n\n`;

    // Si hay cita parcial en progreso
    if (Object.keys(citaParcial).length > 0) {
      prompt += `INFORMACIÓN PARCIAL YA RECOPILADA:\n`;
      prompt += JSON.stringify(citaParcial, null, 2) + '\n\n';
    }

    // Agregar clientes recientes para búsqueda
    if (contexto.clientes_recientes && contexto.clientes_recientes.length > 0) {
      prompt += `CLIENTES EN LA BASE DE DATOS (para buscar coincidencias):\n`;
      prompt +=
        contexto.clientes_recientes
          .slice(0, 20)
          .map(
            (c) =>
              `- ${c.nombre} (ID: ${c.id}, Cédula: ${c.cedula || 'N/A'}, Tel: ${c.telefono || 'N/A'})`
          )
          .join('\n') + '\n\n';
    }

    // Agregar vehículos frecuentes
    if (contexto.vehiculos_frecuentes && contexto.vehiculos_frecuentes.length > 0) {
      prompt += `VEHÍCULOS EN LA BASE DE DATOS (para buscar coincidencias):\n`;
      prompt +=
        contexto.vehiculos_frecuentes
          .slice(0, 20)
          .map(
            (v) =>
              `- ${v.marca} ${v.modelo} - Placa: ${v.placa} (ID: ${v.id}, Cliente: ${v.cliente_nombre || 'N/A'})`
          )
          .join('\n') + '\n\n';
    }

    prompt += `TAREA:\nExtrae toda la información posible del mensaje y estructura los datos para agendar una cita.`;

    return prompt;
  }

  // ============================================
  // SYSTEM PROMPT
  // ============================================
  getSystemPrompt() {
    return `Eres un asistente experto en agendar citas para un taller automotriz.
Tu tarea es extraer información de solicitudes en lenguaje natural y estructurarla.

INFORMACIÓN A EXTRAER:
1. **Cliente**: 
   - nombre completo
   - Si reconoces el nombre en la lista de clientes, usa el ID correspondiente
   - Si no está en la lista, marca como "nuevo_cliente"

2. **Vehículo**: 
   - marca
   - modelo
   - placa/número de identificación
   - Si reconoces el vehículo en la lista, usa el ID correspondiente

3. **Fecha**: 
   - Convertir a formato YYYY-MM-DD
   - Si es relativa ("mañana", "jueves próximo", "en 2 días"), calcular fecha exacta
   - Considerar el contexto de fecha actual proporcionado

4. **Hora**: 
   - Formato 24h (HH:MM)
   - Si no se especifica, sugerir 09:00
   - Si dice "tarde", sugerir 14:00
   - Si dice "mañana" (temporal), sugerir 09:00

5. **Servicio/Problema**: 
   - Descripción detallada del trabajo a realizar
   - Separar entre "servicio" (tipo general) y "problema" (descripción específica)

6. **Tipo de Servicio** (clasificar automáticamente):
   - "mantenimiento": cambio de aceite, revisión general, filtros
   - "reparacion": motor, transmisión, suspensión, reparaciones mayores
   - "diagnostico": revisión, chequeo, inspección
   - "revision_frenos": frenos, pastillas, discos
   - "alineacion": alineación, balanceo
   - "default": si no se puede clasificar

7. **Prioridad** (inferir del contexto):
   - "urgente": si menciona urgencia, emergencia, "lo antes posible", "hoy mismo"
   - "alta": si menciona "pronto", "cuanto antes", problemas de seguridad
   - "normal": por defecto

8. **Duración Estimada** (en minutos):
   - Cambio de aceite: 60 min
   - Revisión de frenos: 90 min
   - Diagnóstico: 120 min
   - Mantenimiento mayor: 240 min
   - Reparación de motor: 480 min
   - Por defecto: 60 min

REGLAS IMPORTANTES:
- Si falta información crítica (cliente, vehículo, fecha, hora O servicio), identificar qué falta
- Ser específico en las preguntas de seguimiento
- Si el cliente o vehículo está en la base de datos, usar su ID
- Si es nuevo, marcarlo para creación
- Calcular correctamente fechas relativas
- Ser conversacional y amigable en las respuestas

FORMATO DE RESPUESTA (JSON):
{
  "datos_extraidos": {
    "cliente": "Nombre del cliente",
    "cliente_id": 123 o null si es nuevo,
    "es_cliente_nuevo": true/false,
    "vehiculo": {
      "marca": "...",
      "modelo": "...",
      "placa": "..."
    },
    "vehiculo_id": 456 o null si es nuevo,
    "es_vehiculo_nuevo": true/false,
    "fecha": "YYYY-MM-DD",
    "hora": "HH:MM",
    "servicio": "Descripción corta del servicio",
    "problema": "Descripción detallada del problema",
    "tipo_servicio": "mantenimiento|reparacion|diagnostico|...",
    "prioridad": "normal|alta|urgente",
    "duracion_estimada": 60
  },
  "datos_faltantes": ["campo1", "campo2"],
  "confianza": 0.95,
  "sugerencias": "Mensaje amigable con información adicional o confirmación",
  "pregunta_siguiente": "Pregunta específica si falta información"
}

Si hay datos ambiguos o múltiples coincidencias, preguntar para clarificar.
Si todo está completo y claro, datos_faltantes debe ser un array vacío.`;
  }

  // ============================================
  // POST-PROCESAR RESPUESTA
  // ============================================
  async postProcesarRespuesta(respuesta, contexto) {
    // Validar y enriquecer la respuesta

    // Validar formato de fecha
    if (respuesta.datos_extraidos?.fecha) {
      const fecha = new Date(respuesta.datos_extraidos.fecha);
      if (isNaN(fecha.getTime())) {
        respuesta.datos_faltantes = respuesta.datos_faltantes || [];
        if (!respuesta.datos_faltantes.includes('fecha')) {
          respuesta.datos_faltantes.push('fecha');
        }
        respuesta.pregunta_siguiente =
          '¿Podrías especificar la fecha en formato día/mes/año o día de la semana?';
      }
    }

    // Validar formato de hora
    if (respuesta.datos_extraidos?.hora) {
      const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!horaRegex.test(respuesta.datos_extraidos.hora)) {
        respuesta.datos_faltantes = respuesta.datos_faltantes || [];
        if (!respuesta.datos_faltantes.includes('hora')) {
          respuesta.datos_faltantes.push('hora');
        }
        respuesta.pregunta_siguiente =
          '¿A qué hora deseas agendar la cita? (ejemplo: 10:00, 14:30)';
      }
    }

    // Buscar cliente si no se encontró ID
    if (respuesta.datos_extraidos?.cliente && !respuesta.datos_extraidos.cliente_id) {
      // Aquí podrías hacer una búsqueda más precisa en la BD
      const clienteEncontrado = this.buscarClienteEnContexto(
        respuesta.datos_extraidos.cliente,
        contexto.clientes_recientes || []
      );

      if (clienteEncontrado) {
        respuesta.datos_extraidos.cliente_id = clienteEncontrado.id;
        respuesta.datos_extraidos.es_cliente_nuevo = false;
        respuesta.datos_extraidos.cliente = clienteEncontrado.nombre;
      } else {
        respuesta.datos_extraidos.es_cliente_nuevo = true;
      }
    }

    // Buscar vehículo si no se encontró ID
    if (respuesta.datos_extraidos?.vehiculo && !respuesta.datos_extraidos.vehiculo_id) {
      const vehiculoEncontrado = this.buscarVehiculoEnContexto(
        respuesta.datos_extraidos.vehiculo,
        contexto.vehiculos_frecuentes || []
      );

      if (vehiculoEncontrado) {
        respuesta.datos_extraidos.vehiculo_id = vehiculoEncontrado.id;
        respuesta.datos_extraidos.es_vehiculo_nuevo = false;
        respuesta.datos_extraidos.vehiculo = {
          marca: vehiculoEncontrado.marca,
          modelo: vehiculoEncontrado.modelo,
          placa: vehiculoEncontrado.placa,
        };
      } else {
        respuesta.datos_extraidos.es_vehiculo_nuevo = true;
      }
    }

    return respuesta;
  }

  // ============================================
  // BÚSQUEDA DE CLIENTE EN CONTEXTO
  // ============================================
  buscarClienteEnContexto(nombreBuscado, clientes) {
    if (!nombreBuscado || !clientes || clientes.length === 0) return null;

    const nombreLower = nombreBuscado.toLowerCase().trim();

    // Búsqueda exacta
    let encontrado = clientes.find((c) => c.nombre.toLowerCase().trim() === nombreLower);

    if (encontrado) return encontrado;

    // Búsqueda por similitud (nombre contiene o es contenido)
    encontrado = clientes.find((c) => {
      const clienteNombre = c.nombre.toLowerCase().trim();
      return clienteNombre.includes(nombreLower) || nombreLower.includes(clienteNombre);
    });

    return encontrado || null;
  }

  // ============================================
  // BÚSQUEDA DE VEHÍCULO EN CONTEXTO
  // ============================================
  buscarVehiculoEnContexto(vehiculoBuscado, vehiculos) {
    if (!vehiculoBuscado || !vehiculos || vehiculos.length === 0) return null;

    // Si es string, buscar por placa
    if (typeof vehiculoBuscado === 'string') {
      const placaLower = vehiculoBuscado.toLowerCase().trim();
      return vehiculos.find((v) => v.placa.toLowerCase().trim().includes(placaLower));
    }

    // Si es objeto, buscar por placa o combinación marca/modelo
    if (vehiculoBuscado.placa) {
      const placaLower = vehiculoBuscado.placa.toLowerCase().trim();
      const encontrado = vehiculos.find((v) => v.placa.toLowerCase().trim().includes(placaLower));
      if (encontrado) return encontrado;
    }

    if (vehiculoBuscado.marca && vehiculoBuscado.modelo) {
      const marcaLower = vehiculoBuscado.marca.toLowerCase().trim();
      const modeloLower = vehiculoBuscado.modelo.toLowerCase().trim();

      return vehiculos.find(
        (v) =>
          v.marca.toLowerCase().trim().includes(marcaLower) &&
          v.modelo.toLowerCase().trim().includes(modeloLower)
      );
    }

    return null;
  }

  // ============================================
  // CONVERTIR FECHA RELATIVA
  // ============================================
  convertirFechaRelativa(textoFecha, fechaBase = new Date()) {
    const texto = textoFecha.toLowerCase().trim();
    const fecha = new Date(fechaBase);

    // Mañana
    if (texto.includes('mañana') || texto === 'tomorrow') {
      fecha.setDate(fecha.getDate() + 1);
      return fecha.toISOString().split('T')[0];
    }

    // Pasado mañana
    if (texto.includes('pasado mañana') || texto.includes('pasado manana')) {
      fecha.setDate(fecha.getDate() + 2);
      return fecha.toISOString().split('T')[0];
    }

    // Hoy
    if (texto.includes('hoy') || texto === 'today') {
      return fecha.toISOString().split('T')[0];
    }

    // Días de la semana
    const diasSemana = {
      lunes: 1,
      monday: 1,
      martes: 2,
      tuesday: 2,
      miércoles: 3,
      miercoles: 3,
      wednesday: 3,
      jueves: 4,
      thursday: 4,
      viernes: 5,
      friday: 5,
      sábado: 6,
      sabado: 6,
      saturday: 6,
      domingo: 0,
      sunday: 0,
    };

    for (const [dia, num] of Object.entries(diasSemana)) {
      if (texto.includes(dia)) {
        const hoy = fecha.getDay();
        let diasHasta = num - hoy;

        if (diasHasta <= 0) {
          diasHasta += 7; // Próxima semana
        }

        fecha.setDate(fecha.getDate() + diasHasta);
        return fecha.toISOString().split('T')[0];
      }
    }

    // "En X días"
    const matchDias = texto.match(/en\s+(\d+)\s+d[ií]as?/);
    if (matchDias) {
      const dias = parseInt(matchDias[1]);
      fecha.setDate(fecha.getDate() + dias);
      return fecha.toISOString().split('T')[0];
    }

    // Si no se puede parsear, retornar null
    return null;
  }
}

module.exports = IACitasProcessor;
