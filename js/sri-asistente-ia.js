/**
 * ASISTENTE IA CONTABLE Y TRIBUTARIO - SRI ECUADOR
 *
 * Sistema de asistencia inteligente especializado en:
 * - Normativa tributaria ecuatoriana
 * - Contabilidad y finanzas
 * - Facturación electrónica SRI
 * - Declaraciones de impuestos
 * - Consultas sobre códigos y formularios
 *
 * El asistente puede:
 * 1. Responder preguntas sobre normativa SRI
 * 2. Ayudar a llenar formularios (103, 104, ATS)
 * 3. Calcular impuestos y retenciones
 * 4. Sugerir códigos contables
 * 5. Validar datos tributarios
 * 6. Guiar procesos paso a paso
 */

window.SRIAsistenteIA = {
  // Configuración del asistente
  config: {
    enabled: false,
    provider: 'gemini', // gemini, deepseek, openai, local
    model: 'gemini-2.0-flash-exp',
    temperature: 0.3, // Más preciso para datos contables
    maxTokens: 2000,
    systemPrompt: '',
  },

  // Contexto tributario ecuatoriano
  contextoPais: {
    pais: 'Ecuador',
    moneda: 'USD',
    tasasIVA: [0, 12, 15],
    codigosRetencionIR: [
      { codigo: '303', nombre: 'Honorarios profesionales', porcentaje: 10 },
      { codigo: '304', nombre: 'Servicios', porcentaje: 2 },
      { codigo: '307', nombre: 'Arrendamiento inmuebles', porcentaje: 8 },
      { codigo: '308', nombre: 'Arrendamiento muebles', porcentaje: 2 },
      { codigo: '310', nombre: 'Transporte privado', porcentaje: 1 },
      { codigo: '312', nombre: 'Transferencia bienes muebles', porcentaje: 1 },
      { codigo: '319', nombre: 'Publicidad y comunicación', porcentaje: 1 },
      { codigo: '320', nombre: 'Seguros y reaseguros', porcentaje: 1 },
      { codigo: '322', nombre: 'Energía eléctrica', porcentaje: 1 },
      { codigo: '323', nombre: 'Actividades deportivas', porcentaje: 1 },
      { codigo: '325', nombre: 'Pagos externos no residentes', porcentaje: 25 },
      { codigo: '332', nombre: 'Otras retenciones 2%', porcentaje: 2 },
      { codigo: '340', nombre: 'Otras retenciones 1%', porcentaje: 1 },
      { codigo: '341', nombre: 'Otras retenciones 8%', porcentaje: 8 },
    ],
    codigosRetencionIVA: [
      { codigo: '721', nombre: 'IVA 30%', porcentaje: 30 },
      { codigo: '723', nombre: 'IVA 70%', porcentaje: 70 },
      { codigo: '725', nombre: 'IVA 100%', porcentaje: 100 },
    ],
    formularios: [
      { codigo: '101', nombre: 'Renta Personas Naturales', frecuencia: 'Anual' },
      { codigo: '102', nombre: 'Renta Sociedades', frecuencia: 'Anual' },
      { codigo: '103', nombre: 'Retenciones IR', frecuencia: 'Mensual' },
      { codigo: '104', nombre: 'IVA', frecuencia: 'Mensual' },
      { codigo: 'ATS', nombre: 'Anexo Transaccional Simplificado', frecuencia: 'Mensual' },
      { codigo: 'RDEP', nombre: 'Empleados y Pagos', frecuencia: 'Mensual' },
    ],
  },

  // Base de conocimiento especializada
  baseConocimiento: {
    // Preguntas frecuentes y respuestas
    faq: [
      {
        pregunta: '¿Cuándo debo retener en la fuente?',
        respuesta:
          'Debes retener en la fuente del IR cuando pagas más de $50 a proveedores de bienes o servicios. Las retenciones aplican según el código: profesionales (10%), servicios (2%), arrendamiento (8%), etc. Si el proveedor no es contribuyente especial, retienes. Emite el comprobante dentro de 5 días hábiles.',
      },
      {
        pregunta: '¿Qué diferencia hay entre Form 103 y 104?',
        respuesta:
          'El Formulario 103 declara las RETENCIONES en la Fuente del IR que hiciste a tus proveedores (mensual). El Formulario 104 declara el IVA: lo que cobraste en ventas menos lo que pagaste en compras = IVA a pagar o saldo a favor (también mensual). Ambos se presentan entre el 10 y 28 del mes siguiente según tu RUC.',
      },
      {
        pregunta: '¿Cómo calculo el IVA a pagar?',
        respuesta:
          'IVA a pagar = IVA cobrado - IVA pagado (crédito tributario). Ejemplo: Vendiste $10,000 + 15% = $11,500 (IVA cobrado: $1,500). Compraste $3,000 + 15% = $3,450 (IVA pagado: $450). IVA a pagar: $1,500 - $450 = $1,050. Si el resultado es negativo, tienes saldo a favor para el siguiente mes.',
      },
      {
        pregunta: '¿Qué es el ATS y para qué sirve?',
        respuesta:
          'El Anexo Transaccional Simplificado (ATS) es un archivo XML con el detalle de TODAS tus transacciones del mes: compras, ventas, retenciones emitidas y recibidas, anulados. Lo subes al SRI junto con tu Form 104. Sirve para que el SRI cruce información y valide tus declaraciones. Es OBLIGATORIO si estás obligado a llevar contabilidad.',
      },
      {
        pregunta: '¿Cuándo se emite una Nota de Crédito?',
        respuesta:
          'Emites Nota de Crédito electrónica para: 1) Anular una factura, 2) Devolución de productos, 3) Descuento posterior a la venta, 4) Corrección de valores. Debe ser dentro de 180 días de la factura original. Impacta el IVA del mes en que la emites. El cliente no te paga (o te devuelve el dinero).',
      },
      {
        pregunta: '¿Qué documentos electrónicos debo emitir?',
        respuesta:
          'Obligatorios: 1) FACTURAS para ventas a consumidor final o empresas, 2) RETENCIONES cuando pagas a proveedores (si aplica), 3) NOTAS DE CRÉDITO/DÉBITO para ajustes, 4) GUÍAS DE REMISIÓN para transporte de mercancías, 5) LIQUIDACIONES DE COMPRA cuando compras a personas sin RUC. Todos deben ser autorizados por el SRI.',
      },
      {
        pregunta: '¿Cuál es la fecha límite para declarar?',
        respuesta:
          'Form 103 y 104 (mensual): Entre el 10 y 28 del mes siguiente, según el 9° dígito de tu RUC. Form 101 y 102 (anual): Marzo-Abril. ATS: Mismo plazo que Form 104. Ejemplo: RUC termina en 9 = declaras el 26. Revisa el calendario tributario del SRI cada año.',
      },
    ],

    // Casos de uso comunes
    casosUso: [
      {
        titulo: 'Emitir factura con retención',
        pasos: [
          '1. Crear factura electrónica con XML v1.1.0',
          '2. Autorizar factura con el SRI (SOAP)',
          '3. Esperar clave de autorización (49 dígitos)',
          '4. Si el cliente retiene: emitir comprobante de retención',
          '5. Registrar ambos documentos en tu sistema contable',
          '6. Incluir en declaración Form 104 (factura) y recibido en Form 103 (retención)',
        ],
      },
      {
        titulo: 'Proceso mensual de declaraciones',
        pasos: [
          '1. Cierre del mes: validar todas las facturas estén autorizadas',
          '2. Generar ATS XML con todas las transacciones',
          '3. Calcular Form 104: ventas, compras, IVA a pagar',
          '4. Calcular Form 103: sumar todas las retenciones emitidas',
          '5. Revisar fechas límite según tu RUC',
          '6. Declarar en línea en https://declaraciones.sri.gob.ec',
          '7. Pagar impuestos si corresponde',
          '8. Guardar comprobantes de declaración',
        ],
      },
      {
        titulo: 'Corregir error en factura',
        pasos: [
          '1. Si la factura NO ha sido enviada al SRI: simplemente NO la envíes',
          '2. Si YA fue autorizada por el SRI: NO puedes eliminarla',
          '3. Emite una Nota de Crédito electrónica por el total',
          '4. Motivo: "Anulación de comprobante"',
          '5. Autoriza la Nota de Crédito',
          '6. Emite nueva factura correcta',
          '7. Ambas (N/C y nueva factura) se incluyen en tu declaración del mes',
        ],
      },
    ],

    // Glosario tributario
    glosario: {
      RUC: 'Registro Único de Contribuyentes - Identificación tributaria de 13 dígitos',
      RISE: 'Régimen Impositivo Simplificado Ecuatoriano - Para pequeños negocios',
      IVA: 'Impuesto al Valor Agregado - 0%, 12% o 15% según el producto',
      IR: 'Impuesto a la Renta - Sobre utilidades anuales',
      'Crédito tributario': 'IVA pagado en compras que reduces del IVA cobrado en ventas',
      'XAdES-BES': 'Firma electrónica avanzada usada para documentos SRI',
      RIDE: 'Representación Impresa del Documento Electrónico - El PDF con QR',
      'Clave de acceso': 'Código de 49 dígitos que identifica un documento electrónico',
      'Obligado a llevar contabilidad': 'Si vendes más de $300K al año o tu capital supera $180K',
      'Contribuyente especial':
        'Empresas grandes designadas por el SRI con obligaciones adicionales',
    },
  },

  /**
   * Inicializar el asistente IA
   */
  async inicializar() {
    console.log('🤖 Inicializando SRI Asistente IA...');

    // Verificar si IAUnifiedEngine está disponible y configurado
    if (!window.IAUnifiedEngine) {
      throw new Error(
        '❌ IAUnifiedEngine no está disponible en window. Archivos cargados: ' +
          Object.keys(window)
            .filter((k) => k.includes('IA') || k.includes('ia'))
            .join(', ')
      );
    }

    console.log('✅ IAUnifiedEngine encontrado');

    // Inicializar el motor
    await IAUnifiedEngine.initialize();
    const status = IAUnifiedEngine.getStatus();

    // Verificar si hay API Key en la configuración del servidor
    const hasValidApiKey =
      status.apiKey || (IAUnifiedEngine.serverConfig && IAUnifiedEngine.serverConfig.hasApiKey);

    console.log('📊 Estado de IAUnifiedEngine:', {
      initialized: status.initialized,
      hasApiKey: hasValidApiKey, // Mostrar el valor real unificado
      provider: status.provider,
      model: status.model,
    });

    if (status.initialized && hasValidApiKey) {
      // Usar la configuración del motor unificado
      this.config.enabled = true;
      this.config.provider = status.provider || 'gemini';
      this.config.model = status.model || this.config.model;
      this.config.temperature = status.temperature || 0.3;
      this.config.maxTokens = status.maxTokens || 2000;

      console.log('✅ SRI Asistente IA conectado a IAUnifiedEngine');
      console.log('   📡 Proveedor:', this.config.provider);
      console.log('   🧠 Modelo:', this.config.model);
      console.log('   🌡️ Temperatura:', this.config.temperature);
      console.log('   🔑 API Key: configurada desde motor unificado');
    } else {
      // Modo deshabilitado: IA no configurada
      this.config.enabled = false;
      console.info(
        'ℹ️ IAUnifiedEngine no configurado completamente: initialized=' +
          status.initialized +
          ', hasApiKey=' +
          hasValidApiKey
      );
      console.info(
        '💡 Para habilitar IA: Dashboard → Configuración → Tab "Inteligencia Artificial"'
      );
      console.info('ℹ️ El módulo SRI funcionará sin capacidades de IA');
    }

    // Configurar el prompt del sistema
    this.configurarSystemPrompt();

    console.log(
      '✅ Asistente IA SRI inicializado:',
      this.config.enabled ? '🟢 Habilitado' : '🔴 Deshabilitado'
    );
  },

  /**
   * Configurar el prompt del sistema con contexto especializado
   */
  configurarSystemPrompt() {
    this.config.systemPrompt = `Eres un asistente experto en contabilidad y normativa tributaria de Ecuador. 

TU ROL:
- Asesor contable profesional especializado en el SRI (Servicio de Rentas Internas de Ecuador)
- Experto en facturación electrónica, declaraciones de impuestos y cumplimiento tributario
- Ayudante práctico que guía paso a paso en procesos contables

CONOCIMIENTO ESPECIALIZADO:
- Normativa tributaria ecuatoriana vigente
- Facturación electrónica SRI (XML, XAdES-BES, RIDE)
- Formularios 101, 102, 103, 104, ATS, RDEP
- Códigos de retención en la fuente (303, 332, etc.)
- Cálculo de IVA, IR, retenciones
- Plazos y fechas de declaración
- Contabilidad general (debe/haber, asientos, estados financieros)

CONTEXTO DEL SISTEMA:
- Estás integrado en un sistema de gestión para negocios ecuatorianos
- El sistema YA implementa: facturas, retenciones, notas C/D, guías, reportes ATS
- Puedes guiar al usuario para usar estas funciones correctamente

TU COMPORTAMIENTO:
✅ Responde en español claro y profesional
✅ Usa ejemplos prácticos ecuatorianos (USD, RUC, códigos SRI reales)
✅ Cita normativa cuando sea relevante
✅ Ofrece guías paso a paso
✅ Alerta sobre plazos y multas del SRI
✅ Sugiere acciones concretas en el sistema
✅ Explica conceptos complejos de forma sencilla (evita tecnicismos innecesarios)
✅ Sé paciente y muy claro en tus explicaciones

❌ NO inventes leyes o porcentajes
❌ NO prometas asistencia en auditorías reales
❌ NO reemplaces a un contador profesional para casos complejos
❌ NO des consejos sobre evasión fiscal

FORMATO DE RESPUESTAS:
- Directo y conciso
- Si es cálculo: muestra la fórmula y ejemplo
- Si es proceso: lista pasos numerados
- Si hay plazos: menciónalos claramente
- Si debe consultar al contador: dilo

INICIO DE CONVERSACIÓN:
Saluda brevemente y pregunta: "¿En qué puedo ayudarte hoy con tu contabilidad o trámites del SRI?"`;
  },

  /**
   * Procesar pregunta del usuario
   */
  async procesarPregunta(pregunta) {
    if (!this.config.enabled) {
      throw new Error(
        'El asistente IA no está habilitado. Ve a Dashboard → Configuración → Tab "Inteligencia Artificial" y configura un proveedor de IA.'
      );
    }

    // 1. Buscar en base de conocimiento local primero
    const respuestaLocal = this.buscarEnBaseConocimiento(pregunta);
    if (respuestaLocal) {
      return {
        exito: true,
        respuesta: respuestaLocal,
        fuente: 'base_conocimiento',
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Consultar a la IA externa usando IAUnifiedEngine
    const respuestaIA = await this.consultarIA(pregunta);

    // 3. Guardar en historial
    this.guardarEnHistorial(pregunta, respuestaIA);

    return {
      exito: true,
      respuesta: respuestaIA,
      fuente: this.config.provider,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Buscar respuesta en la base de conocimiento local
   */
  buscarEnBaseConocimiento(pregunta) {
    const preguntaNorm = pregunta
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Buscar en FAQ
    for (const item of this.baseConocimiento.faq) {
      const preguntaFAQ = item.pregunta
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      // Calcular similitud simple
      const palabrasPregunta = preguntaNorm.split(' ').filter((p) => p.length > 3);
      const coincidencias = palabrasPregunta.filter((palabra) =>
        preguntaFAQ.includes(palabra)
      ).length;

      if (coincidencias >= 2) {
        return `📚 **${item.pregunta}**\n\n${item.respuesta}\n\n_Fuente: Base de conocimiento local_`;
      }
    }

    // Buscar en glosario
    for (const [termino, definicion] of Object.entries(this.baseConocimiento.glosario)) {
      if (preguntaNorm.includes(termino.toLowerCase())) {
        return `📖 **${termino}**: ${definicion}\n\n¿Necesitas más información sobre este término?`;
      }
    }

    return null;
  },

  /**
   * Consultar IA usando IAUnifiedEngine (motor unificado del sistema)
   */
  async consultarIA(pregunta) {
    // Verificar que IAUnifiedEngine esté disponible e inicializado
    if (!window.IAUnifiedEngine) {
      throw new Error('Motor de IA no disponible. Recarga la página.');
    }

    if (!IAUnifiedEngine.initialized) {
      throw new Error(
        'Motor de IA no inicializado. Ve a Dashboard → Configuración → Inteligencia Artificial'
      );
    }

    // Construir contexto enriquecido
    const contexto = this.construirContexto(pregunta);

    // Formatear el prompt completo con el system prompt y contexto
    const promptCompleto = `${this.config.systemPrompt}

CONTEXTO DE LA EMPRESA:
${JSON.stringify(contexto, null, 2)}

PREGUNTA DEL USUARIO:
${pregunta}`;

    // Usar el motor unificado que ya tiene las API keys configuradas
    const respuesta = await IAUnifiedEngine.query(promptCompleto, {
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });

    if (!respuesta || !respuesta.text) {
      throw new Error('La IA no devolvió una respuesta válida');
    }

    return respuesta.text;
  },

  /**
   * ============================================
   * MÉTODOS LEGACY - YA NO SE USAN
   * (IAUnifiedEngine maneja todas las llamadas a IA)
   * ============================================
   *
   * Los métodos consultarGemini, consultarDeepSeek, consultarOpenAI y consultarLocal
   * han sido reemplazados por consultarIA() que usa IAUnifiedEngine.
   *
   * El motor unificado centraliza todas las llamadas a IA y tiene las API keys
   * configuradas en: Dashboard → Configuración → Tab "Inteligencia Artificial"
   */

  /**
   * Construir contexto enriquecido para la IA
   */
  construirContexto(pregunta) {
    // Obtener información relevante del sistema
    const configTienda = Database.get('configTienda') || {};
    const configSRI = Database.get('configuracionAvanzada')?.sri || {};

    const contexto = {
      empresa: {
        razonSocial: configTienda.razonSocial || 'No configurado',
        ruc: configSRI.ruc || 'No configurado',
        obligadoContabilidad: configSRI.obligadoContabilidad || 'No configurado',
      },
      codigosDisponibles: this.contextoPais.codigosRetencionIR
        .map((c) => `${c.codigo}: ${c.nombre} (${c.porcentaje}%)`)
        .join(', '),
      formularios: this.contextoPais.formularios.map((f) => `${f.codigo} (${f.nombre})`).join(', '),
      tasasIVA: this.contextoPais.tasasIVA.join('%, ') + '%',
      preguntaOriginal: pregunta,
    };

    return contexto;
  },

  /*
  // ============================================
  // MÉTODOS LEGACY COMENTADOS
  // ============================================
  // Estos métodos ya no se usan. El sistema usa IAUnifiedEngine.query()
  
  /**
   * Consultar Google Gemini - LEGACY - NO USAR
   *
  async consultarGemini(contexto, pregunta) {
    const apiKey = Database.get('ia_gemini_api_key') || window.TenantStorage?.getItem('ia_gemini_api_key');
    
    if (!apiKey) {
      throw new Error('API Key de Gemini no configurada. Ve a Configuración Avanzada → IA.');
    }

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
    
    const response = await fetch(`${url}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${this.config.systemPrompt}\n\nCONTEXTO DE LA EMPRESA:\n${JSON.stringify(contexto, null, 2)}\n\nPREGUNTA DEL USUARIO:\n${pregunta}`
          }]
        }],
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API: ${error.error?.message || 'Error desconocido'}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  },

  /**
   * Consultar DeepSeek - LEGACY - NO USAR
   *
  async consultarDeepSeek(contexto, pregunta) {
    const apiKey = Database.get('ia_deepseek_api_key') || window.TenantStorage?.getItem('ia_deepseek_api_key');
    
    if (!apiKey) {
      throw new Error('API Key de DeepSeek no configurada.');
    }

    const url = 'https://api.deepseek.com/v1/chat/completions';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: this.config.systemPrompt },
          { role: 'system', content: `Contexto: ${JSON.stringify(contexto)}` },
          { role: 'user', content: pregunta }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      })
    });

    if (!response.ok) {
      throw new Error('Error consultando DeepSeek');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },

  /**
   * Consultar OpenAI - LEGACY - NO USAR
   *
  async consultarOpenAI(contexto, pregunta) {
    const apiKey = Database.get('ia_openai_api_key');
    
    if (!apiKey) {
      throw new Error('API Key de OpenAI no configurada.');
    }

    const url = 'https://api.openai.com/v1/chat/completions';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: this.config.systemPrompt },
          { role: 'system', content: `Contexto: ${JSON.stringify(contexto)}` },
          { role: 'user', content: pregunta }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      })
    });

    if (!response.ok) {
      throw new Error('Error consultando OpenAI');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },

  /**
   * Consultar modelo local (LM Studio, Ollama, etc.) - LEGACY - NO USAR
   *
  async consultarLocal(contexto, pregunta) {
    const apiUrl = Database.get('ia_api_url') || 'http://localhost:1234/v1';
    
    const url = `${apiUrl}/chat/completions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: this.config.systemPrompt },
          { role: 'system', content: `Contexto: ${JSON.stringify(contexto)}` },
          { role: 'user', content: pregunta }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      })
    });

    if (!response.ok) {
      throw new Error('No se pudo conectar al modelo local. Verifica que esté corriendo en ' + apiUrl);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  // FIN DE MÉTODOS LEGACY COMENTADOS
  */

  /**
   * Guardar en historial
   */
  guardarEnHistorial(pregunta, respuesta) {
    const historial = Database.get('sri_asistente_historial') || [];

    historial.unshift({
      id: Date.now(),
      pregunta,
      respuesta,
      timestamp: new Date().toISOString(),
      provider: this.config.provider,
    });

    // Mantener solo últimas 50 conversaciones
    if (historial.length > 50) {
      historial.pop();
    }

    Database.set('sri_asistente_historial', historial);
  },

  /**
   * Abrir interfaz del asistente
   */
  abrirInterfaz() {
    const modal = Utils.createModal({
      title: '🤖 Asistente IA Contable y Tributario',
      size: 'large',
      content: this.renderInterfaz(),
    });

    modal.show();
    this.inicializarInterfaz(modal);
  },

  /**
   * Renderizar interfaz del asistente
   */
  renderInterfaz() {
    const historial = Database.get('sri_asistente_historial') || [];

    return `
      <div class="sri-asistente-container">
        <!-- Chat -->
        <div class="asistente-chat" id="asistente-chat">
          <div class="mensaje asistente">
            <div class="mensaje-avatar">🤖</div>
            <div class="mensaje-contenido">
              <strong>Asistente SRI Ecuador</strong>
              <p>¡Hola! Soy tu asistente especializado en contabilidad y normativa tributaria ecuatoriana.</p>
              <p>Puedo ayudarte con:</p>
              <ul>
                <li>📄 Facturación electrónica y documentos SRI</li>
                <li>📋 Formularios 103, 104, ATS</li>
                <li>🧮 Cálculos de impuestos y retenciones</li>
                <li>📅 Plazos y fechas de declaración</li>
                <li>💡 Consultas sobre códigos y normativa</li>
              </ul>
              <p><strong>¿En qué puedo ayudarte hoy?</strong></p>
            </div>
          </div>

          ${historial
            .slice(0, 5)
            .map(
              (item) => `
            <div class="mensaje usuario">
              <div class="mensaje-avatar">👤</div>
              <div class="mensaje-contenido">
                <p>${item.pregunta}</p>
                <span class="mensaje-timestamp">${new Date(item.timestamp).toLocaleString()}</span>
              </div>
            </div>
            <div class="mensaje asistente">
              <div class="mensaje-avatar">🤖</div>
              <div class="mensaje-contenido">
                <div class="respuesta-markdown">${this.formatearRespuesta(item.respuesta)}</div>
                <span class="mensaje-timestamp">Vía ${item.provider}</span>
              </div>
            </div>
          `
            )
            .join('')}
        </div>

        <!-- Input -->
        <div class="asistente-input-container">
          <textarea 
            id="asistente-pregunta" 
            class="form-control" 
            placeholder="Escribe tu pregunta sobre contabilidad, impuestos o documentos SRI..."
            rows="3"
          ></textarea>
          <div class="asistente-actions">
            <button class="btn btn-secondary" onclick="SRIAsistenteIA.mostrarEjemplos()">
              <i class="fas fa-lightbulb"></i> Ejemplos
            </button>
            <button class="btn btn-primary btn-lg" onclick="SRIAsistenteIA.enviarPregunta()">
              <i class="fas fa-paper-plane"></i> Preguntar
            </button>
          </div>
        </div>

        <!-- Configuración rápida -->
        <div class="asistente-config">
          ${
            !this.config.enabled
              ? `
            <div class="alert alert-warning">
              <i class="fas fa-exclamation-triangle"></i>
              El asistente IA no está configurado. 
              <a href="#" onclick="App.loadModule('configuracion'); ConfiguracionAvanzada.cambiarTab('ia'); return false;">
                Ir a Configuración → Inteligencia Artificial
              </a>
            </div>
          `
              : ''
          }
          <small>
            <i class="fas fa-robot"></i> Proveedor: <strong>${this.config.provider.toUpperCase()}</strong> | 
            <i class="fas fa-brain"></i> Temperatura: ${this.config.temperature} |
            <i class="fas fa-check-circle text-success"></i> Conectado a IAUnifiedEngine
          </small>
        </div>
      </div>

      <style>
        .sri-asistente-container {
          display: flex;
          flex-direction: column;
          height: 600px;
          max-height: 80vh;
        }

        .asistente-chat {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%);
          border: 1px solid #dee2e6;
          border-radius: 8px;
          margin-bottom: 15px;
        }

        .mensaje {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .mensaje-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          flex-shrink: 0;
        }

        .mensaje.usuario .mensaje-avatar {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .mensaje-contenido {
          flex: 1;
          background: white;
          padding: 15px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .mensaje-contenido strong {
          color: #495057;
          display: block;
          margin-bottom: 8px;
        }

        .mensaje-contenido p {
          margin: 8px 0;
          line-height: 1.6;
        }

        .mensaje-contenido ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .mensaje-contenido li {
          margin: 5px 0;
        }

        .mensaje-timestamp {
          font-size: 11px;
          color: #6c757d;
          margin-top: 8px;
          display: block;
        }

        .respuesta-markdown {
          line-height: 1.7;
        }

        .respuesta-markdown code {
          background: #f8f9fa;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }

        .asistente-input-container {
          background: white;
          padding: 15px;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          margin-bottom: 10px;
        }

        .asistente-input-container textarea {
          resize: none;
          margin-bottom: 10px;
        }

        .asistente-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .asistente-config {
          text-align: center;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        /* DARK MODE SUPPORT */
        [data-theme="dark"] .asistente-chat {
          background: linear-gradient(to bottom, #111827 0%, #1f2937 100%);
          border-color: #374151;
        }
        [data-theme="dark"] .mensaje-contenido {
          background: #374151;
          color: #f3f4f6;
        }
        [data-theme="dark"] .mensaje-contenido strong {
          color: #e5e7eb;
        }
        [data-theme="dark"] .mensaje-timestamp {
          color: #9ca3af;
        }
        [data-theme="dark"] .asistente-input-container {
          background: #1f2937;
          border-color: #374151;
        }
        [data-theme="dark"] .asistente-input-container textarea {
          background: #374151;
          color: #f3f4f6;
          border: 1px solid #4b5563;
        }
        [data-theme="dark"] .asistente-config {
          background: #1f2937;
          color: #d1d5db;
        }
        [data-theme="dark"] .respuesta-markdown code {
          background: #111827;
          color: #e5e7eb;
        }
      </style>
    `;
  },

  /**
   * Inicializar interfaz
   */
  inicializarInterfaz(modal) {
    // Enfocar el textarea
    const textarea = document.getElementById('asistente-pregunta');
    if (textarea) {
      textarea.focus();

      // Enter para enviar (Shift+Enter para nueva línea)
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.enviarPregunta();
        }
      });
    }
  },

  /**
   * Enviar pregunta
   */
  async enviarPregunta() {
    const textarea = document.getElementById('asistente-pregunta');
    const pregunta = textarea.value.trim();

    if (!pregunta) {
      Utils.showToast('Escribe una pregunta primero', 'warning');
      return;
    }

    // Limpiar input
    textarea.value = '';

    // Agregar mensaje del usuario al chat
    this.agregarMensajeChat('usuario', pregunta);

    // Mostrar "pensando..."
    const pensandoId = this.agregarMensajeChat('asistente', '💭 Pensando...');

    // Procesar pregunta
    const resultado = await this.procesarPregunta(pregunta);

    // Eliminar "pensando..."
    const mensajePensando = document.getElementById(pensandoId);
    if (mensajePensando) {
      mensajePensando.remove();
    }

    // Mostrar respuesta
    if (resultado.exito) {
      this.agregarMensajeChat('asistente', resultado.respuesta, resultado.fuente);
    } else {
      this.agregarMensajeChat('asistente', `❌ Error: ${resultado.mensaje}`, 'error');
    }
  },

  /**
   * Agregar mensaje al chat
   */
  agregarMensajeChat(tipo, contenido, meta = '') {
    const chat = document.getElementById('asistente-chat');
    if (!chat) return;

    const mensajeId = `mensaje-${Date.now()}`;

    const mensajeHTML = `
      <div class="mensaje ${tipo}" id="${mensajeId}">
        <div class="mensaje-avatar">${tipo === 'usuario' ? '👤' : '🤖'}</div>
        <div class="mensaje-contenido">
          <div class="respuesta-markdown">${this.formatearRespuesta(contenido)}</div>
          ${meta ? `<span class="mensaje-timestamp">Vía ${meta}</span>` : ''}
        </div>
      </div>
    `;

    chat.insertAdjacentHTML('beforeend', mensajeHTML);

    // Scroll al final
    chat.scrollTop = chat.scrollHeight;

    return mensajeId;
  },

  /**
   * Formatear respuesta con markdown simple
   */
  formatearRespuesta(texto) {
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  },

  /**
   * Mostrar ejemplos de preguntas
   */
  mostrarEjemplos() {
    const ejemplos = [
      '¿Cuándo debo retener en la fuente?',
      '¿Cómo calculo el IVA a pagar en el Form 104?',
      '¿Qué es el ATS y cuándo lo presento?',
      '¿Cuándo emito una Nota de Crédito?',
      '¿Cuál es mi fecha límite para declarar?',
      '¿Qué código de retención uso para servicios profesionales?',
      'Explícame el crédito tributario de IVA',
      '¿Cómo corrijo una factura autorizada?',
    ];

    const lista = ejemplos
      .map(
        (ej) => `
      <li>
        <a href="#" onclick="document.getElementById('asistente-pregunta').value = '${ej}'; return false;">
          ${ej}
        </a>
      </li>
    `
      )
      .join('');

    Utils.showToast(
      `
      <strong>Ejemplos de preguntas:</strong>
      <ul style="text-align: left; padding-left: 20px; margin-top: 10px;">
        ${lista}
      </ul>
    `,
      'info',
      10000
    );
  },

  /**
   * Abrir chat del asistente (alias de abrirInterfaz)
   */
  abrirChat() {
    if (!this.config.enabled) {
      // Mostrar mensaje de configuración
      const modal = Utils.createModal({
        title: '⚙️ Configurar Asistente IA',
        size: 'medium',
        content: `
          <div style="text-align: center; padding: 30px;">
            <i class="fas fa-robot" style="font-size: 64px; color: #667eea; margin-bottom: 20px;"></i>
            <h3>El Asistente IA no está configurado</h3>
            <p style="color: #6b7280; margin: 20px 0;">
              Para usar el asistente tributario inteligente, necesitas configurar una API de IA.
            </p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: left;">
              <h4 style="margin-top: 0;">Opciones disponibles:</h4>
              <ul style="color: #374151; line-height: 1.8;">
                <li><strong>Google Gemini</strong> - Gratis, recomendado</li>
                <li><strong>DeepSeek</strong> - Económico y potente</li>
                <li><strong>OpenAI GPT</strong> - Alta calidad</li>
                <li><strong>LM Studio</strong> - Local, sin internet</li>
              </ul>
            </div>
            <button class="btn btn-primary btn-lg" onclick="App.loadModule('configuracion'); setTimeout(() => { if (window.ConfiguracionAvanzada && ConfiguracionAvanzada.cambiarTab) ConfiguracionAvanzada.cambiarTab('ia'); }, 300); document.querySelector('.modal-overlay.active .modal-close')?.click();">
              <i class="fas fa-cog"></i> Ir a Configuración de IA
            </button>
          </div>
        `,
      });

      if (modal && typeof modal.show === 'function') {
        modal.show();
      }
      return;
    }

    // Si está configurado, abrir la interfaz
    this.abrirInterfaz();
  },
};

// Inicializar al cargar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SRIAsistenteIA.inicializar());
} else {
  SRIAsistenteIA.inicializar();
}
