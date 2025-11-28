/* ========================================
   AGENTE IA PARA ÓRDENES DE TRABAJO (CHAT CONVERSACIONAL)
   Sistema similar a AgendaIAAgent pero para órdenes de trabajo
   ======================================== */

const OrdenesTrabajoIAAgent = {
  initialized: false,
  conversacionActual: [],
  conversacionActualId: null,
  ordenParcial: {},
  contextoDatos: {
    clientes: [],
    vehiculos: [],
    tecnicos: [],
    servicios: [],
  },
  campoOrden: [
    {
      key: 'cliente_nombre',
      label: 'Nombre del cliente',
      required: true,
      placeholder: 'Juan Pérez',
    },
    {
      key: 'cliente_telefono',
      label: 'Teléfono de contacto',
      required: false,
      placeholder: '09 9999 9999',
    },
    { key: 'cliente_cedula', label: 'Documento/ID', required: false, placeholder: '0102030405' },
    { key: 'vehiculo_marca', label: 'Marca del vehículo', required: true, placeholder: 'Toyota' },
    {
      key: 'vehiculo_modelo',
      label: 'Modelo del vehículo',
      required: true,
      placeholder: 'Corolla',
    },
    { key: 'vehiculo_placa', label: 'Placa del vehículo', required: true, placeholder: 'ABC-1234' },
    { key: 'vehiculo_anio', label: 'Año del vehículo', required: false, placeholder: '2020' },
    { key: 'vehiculo_color', label: 'Color del vehículo', required: false, placeholder: 'Negro' },
    { key: 'kilometraje', label: 'Kilometraje actual', required: false, placeholder: '50000' },
    {
      key: 'servicio',
      label: 'Servicio requerido',
      required: true,
      placeholder: 'Cambio de aceite',
    },
    {
      key: 'problema',
      label: 'Síntomas/problema',
      required: false,
      placeholder: 'Ruido al frenar',
    },
    { key: 'prioridad', label: 'Prioridad', required: false, placeholder: 'normal/alta/urgente' },
    {
      key: 'tecnico_nombre',
      label: 'Técnico asignado',
      required: false,
      placeholder: 'Luis García',
    },
    {
      key: 'fecha_entrega',
      label: 'Fecha entrega estimada',
      required: false,
      placeholder: '28/11/2025',
    },
    { key: 'notas', label: 'Notas adicionales', required: false, placeholder: 'Cliente espera...' },
  ],
  chunkSize: 4,
  labelToFieldMap: {},
  autoSaveTimer: null,
  creandoOrden: false,
  ultimaSolicitudKeys: [],
  preferirModoManual: false,

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.negocioId =
      window.Auth && typeof Auth.getNegocioId === 'function' ? Auth.getNegocioId() : 'default';
    this.limpiarEstado(true);
    this.construirMapaEtiquetas();
    this.cargarContextoInicial();
    this.crearChatOrdenes();
    console.log('🔧 OrdenesTrabajoIAAgent listo');
  },

  limpiarEstado(saltarMensajes = false) {
    this.ordenParcial = {};
    this.conversacionActual = [];
    this.conversacionActualId = `orden-${Date.now()}`;
    this.ultimaSolicitudKeys = [];
    this.cancelarAutoGuardado();
  },

  async cargarContextoInicial() {
    try {
      const [clientes, vehiculos, tecnicos] = await Promise.all([
        this.fetchJson('/api/clientes/recientes?limit=50').catch(() => []),
        this.fetchJson('/api/vehiculos/recientes?limit=50').catch(() => []),
        this.fetchJson('/api/tecnicos').catch(() => []),
      ]);
      if (Array.isArray(clientes)) this.contextoDatos.clientes = clientes;
      if (Array.isArray(vehiculos)) this.contextoDatos.vehiculos = vehiculos;
      if (Array.isArray(tecnicos)) this.contextoDatos.tecnicos = tecnicos;
    } catch (error) {
      console.warn('OrdenesTrabajoIAAgent: no se pudo cargar contexto inicial', error);
    }
  },

  async fetchJson(url, options = {}) {
    const fetcher =
      window.Auth && typeof Auth.authenticatedFetch === 'function'
        ? (url, opts) => Auth.authenticatedFetch(url, opts)
        : (url, opts) => fetch(url, opts);
    const response = await fetcher(url, options);
    if (!response.ok) {
      const texto = await response.text().catch(() => response.statusText);
      throw new Error(texto || `HTTP ${response.status}`);
    }
    return response.json();
  },

  construirMapaEtiquetas() {
    this.labelToFieldMap = {};
    this.campoOrden.forEach((campo) => {
      const key = this.normalizarEtiqueta(campo.label);
      this.labelToFieldMap[key] = campo.key;
    });
  },

  normalizarEtiqueta(texto = '') {
    return texto
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  },

  obtenerCampoConfig(key) {
    return (
      this.campoOrden.find((campo) => campo.key === key) || { key, label: key, required: false }
    );
  },

  obtenerCamposPendientes() {
    return this.campoOrden.filter((campo) => {
      if (!campo.required) return false;
      return !this.tieneValorCampo(campo.key);
    });
  },

  tieneValorCampo(key) {
    const valor = this.ordenParcial[key];
    return valor !== undefined && valor !== null && valor !== '';
  },

  datosCompletosParaOrden() {
    const requeridos = this.campoOrden.filter((c) => c.required);
    return requeridos.every((c) => this.tieneValorCampo(c.key));
  },

  describirOrdenActual() {
    const partes = [];
    if (this.ordenParcial.cliente_nombre)
      partes.push(`Cliente: ${this.ordenParcial.cliente_nombre}`);
    if (this.ordenParcial.vehiculo_marca)
      partes.push(`${this.ordenParcial.vehiculo_marca} ${this.ordenParcial.vehiculo_modelo || ''}`);
    if (this.ordenParcial.vehiculo_placa) partes.push(`Placa: ${this.ordenParcial.vehiculo_placa}`);
    if (this.ordenParcial.servicio) partes.push(`Servicio: ${this.ordenParcial.servicio}`);
    return partes.length ? partes.join(' | ') : 'Sin datos todavía';
  },

  registrarCampos(campos = {}) {
    const confirmados = {};
    for (const [key, valor] of Object.entries(campos)) {
      if (valor === undefined || valor === null || valor === '') continue;

      // Normalizar algunos campos
      let valorFinal = valor;
      if (key === 'vehiculo_placa') {
        valorFinal = this.normalizarPlaca(valor);
      } else if (key === 'cliente_telefono') {
        valorFinal = this.normalizarTelefono(valor);
      } else if (key === 'kilometraje' || key === 'vehiculo_anio') {
        valorFinal = parseInt(valor) || valor;
      }

      this.ordenParcial[key] = valorFinal;
      confirmados[key] = valorFinal;
    }
    return confirmados;
  },

  normalizarPlaca(valor = '') {
    return valor
      .toString()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '');
  },

  normalizarTelefono(valor = '') {
    const digits = valor.replace(/\D/g, '');
    if (digits.length === 10) {
      return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
    }
    return valor;
  },

  normalizarFecha(texto) {
    // Acepta formatos: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    const match = texto.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (match) {
      let [, d, m, y] = match;
      if (y.length === 2) y = '20' + y;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // ISO format
    const isoMatch = texto.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return isoMatch[0];
    return texto;
  },

  eliminarValorCampo(key) {
    delete this.ordenParcial[key];
  },

  capturarDatosDesdeTexto(texto = '') {
    const datos = {};
    const lineas = texto.split(/[\n;]+/);

    for (const linea of lineas) {
      const match = linea.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        const [, etiqueta, valor] = match;
        const campo = this.obtenerCampoPorEtiqueta(etiqueta.trim());
        if (campo) {
          datos[campo.key] = valor.trim();
        }
      }
    }

    // Extraer datos básicos con regex si no se encontraron
    if (!datos.vehiculo_placa) {
      const placaMatch = texto.match(/\b([A-Z]{3}[-\s]?\d{3,4})\b/i);
      if (placaMatch) datos.vehiculo_placa = placaMatch[1].toUpperCase();
    }

    if (!datos.cliente_telefono) {
      const telMatch = texto.match(/\b(0\d{9})\b/);
      if (telMatch) datos.cliente_telefono = telMatch[1];
    }

    if (!datos.kilometraje) {
      const kmMatch = texto.match(/(\d{4,6})\s*(km|kil[oó]metros?)/i);
      if (kmMatch) datos.kilometraje = parseInt(kmMatch[1]);
    }

    if (!datos.vehiculo_anio) {
      const anioMatch = texto.match(/\b(19\d{2}|20\d{2})\b/);
      if (anioMatch) datos.vehiculo_anio = parseInt(anioMatch[1]);
    }

    return datos;
  },

  obtenerCampoPorEtiqueta(etiqueta) {
    const keyNorm = this.normalizarEtiqueta(etiqueta);
    const fieldKey = this.labelToFieldMap[keyNorm];
    if (fieldKey) return this.obtenerCampoConfig(fieldKey);

    // Buscar parcial
    const aliases = {
      cliente: 'cliente_nombre',
      nombre: 'cliente_nombre',
      telefono: 'cliente_telefono',
      tel: 'cliente_telefono',
      celular: 'cliente_telefono',
      cedula: 'cliente_cedula',
      ruc: 'cliente_cedula',
      marca: 'vehiculo_marca',
      modelo: 'vehiculo_modelo',
      placa: 'vehiculo_placa',
      patente: 'vehiculo_placa',
      anio: 'vehiculo_anio',
      año: 'vehiculo_anio',
      color: 'vehiculo_color',
      km: 'kilometraje',
      kilometros: 'kilometraje',
      servicio: 'servicio',
      trabajo: 'servicio',
      reparacion: 'servicio',
      problema: 'problema',
      sintoma: 'problema',
      falla: 'problema',
      tecnico: 'tecnico_nombre',
      mecanico: 'tecnico_nombre',
      prioridad: 'prioridad',
      urgencia: 'prioridad',
      entrega: 'fecha_entrega',
      notas: 'notas',
      observaciones: 'notas',
    };

    for (const [alias, key] of Object.entries(aliases)) {
      if (keyNorm.includes(alias)) {
        return this.obtenerCampoConfig(key);
      }
    }

    return null;
  },

  solicitarDatosPendientes(options = {}) {
    const { faltantes = null, prefijo = 'Por favor proporciona:', force = false } = options;
    const pendientes = faltantes
      ? faltantes.map((k) => this.obtenerCampoConfig(k))
      : this.obtenerCamposPendientes();

    if (!pendientes.length) {
      if (this.datosCompletosParaOrden()) {
        this.programarAutoGuardado();
      }
      return;
    }

    // Agrupar campos
    const chunk = pendientes.slice(0, this.chunkSize);
    const nuevasKeys = chunk.map((c) => c.key);

    if (!force && JSON.stringify(nuevasKeys) === JSON.stringify(this.ultimaSolicitudKeys)) {
      return;
    }
    this.ultimaSolicitudKeys = nuevasKeys;

    const groupId = `campos-${Date.now()}`;
    const slotsHtml = chunk
      .map(
        (campo) =>
          `${campo.label}: <span class="field-slot" contenteditable="true" data-field-slot="${campo.key}" data-slot-group="${groupId}" data-placeholder="${campo.placeholder || ''}">${campo.placeholder || ''}</span>`
      )
      .join('\n');

    this.agregarMensajeOrden(
      'assistant',
      `${prefijo}\n<pre class="field-slot-guide">${slotsHtml}</pre>`,
      { allowHtml: true, slotGroupId: groupId }
    );
  },

  programarAutoGuardado() {
    this.cancelarAutoGuardado();
    this.agregarMensajeOrden(
      'assistant',
      '✅ ¡Tengo todos los datos! Guardando orden en 3 segundos... (escribe algo para cancelar)'
    );

    this.autoSaveTimer = setTimeout(async () => {
      await this.crearOrdenAutomatica();
    }, 3000);
  },

  cancelarAutoGuardado() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  },

  async procesarMensajeUsuario(mensaje) {
    this.cancelarAutoGuardado();

    const cambiosLocales = this.capturarDatosDesdeTexto(mensaje);
    const confirmadosLocales = this.registrarCampos(cambiosLocales);

    if (Object.keys(confirmadosLocales).length) {
      this.notificarCamposRegistrados(confirmadosLocales);
      await this.autoCompletarDesdeBases(confirmadosLocales);
    }

    // Decidir si usar IA o no
    const usarIA = this.debeUsarIA(mensaje, confirmadosLocales);

    if (usarIA) {
      await this.procesarConIA(mensaje);
    } else {
      await this.procesarSinIA(mensaje);
    }
  },

  debeUsarIA(mensaje, confirmadosLocales) {
    if (this.preferirModoManual) return false;

    // Usar IA si el mensaje es largo o complejo
    if (mensaje.length > 100) return true;

    // Usar IA si no se detectaron campos
    if (Object.keys(confirmadosLocales).length === 0) return true;

    // Usar IA si el mensaje parece una pregunta
    if (/\?|ayuda|como|que|cual/i.test(mensaje)) return true;

    return false;
  },

  notificarCamposRegistrados(campos) {
    const mensajes = [];
    for (const [key, valor] of Object.entries(campos)) {
      const config = this.obtenerCampoConfig(key);
      mensajes.push(`✓ ${config.label}: ${valor}`);
    }
    if (mensajes.length) {
      this.agregarMensajeOrden('assistant', `He registrado:\n${mensajes.join('\n')}`);
    }
  },

  async autoCompletarDesdeBases(camposNuevos = {}) {
    // Si tenemos cliente_nombre, buscar cliente existente
    if (camposNuevos.cliente_nombre) {
      const cliente = await this.buscarClienteSimilar(camposNuevos.cliente_nombre);
      if (cliente) {
        this.aplicarClienteExistente(cliente);
      }
    }

    // Si tenemos placa, buscar vehículo
    if (camposNuevos.vehiculo_placa) {
      const vehiculo = await this.buscarVehiculoPorPlaca(camposNuevos.vehiculo_placa);
      if (vehiculo) {
        this.aplicarVehiculoExistente(vehiculo);
      }
    }
  },

  async buscarClienteSimilar(nombre) {
    const nombreNorm = nombre.toLowerCase().trim();
    let cliente = this.contextoDatos.clientes.find(
      (c) =>
        c.nombre?.toLowerCase().includes(nombreNorm) || nombreNorm.includes(c.nombre?.toLowerCase())
    );

    if (!cliente) {
      try {
        const response = await this.fetchJson(
          `/api/clientes/buscar?q=${encodeURIComponent(nombre)}&limit=1`
        );
        if (response.data?.length) cliente = response.data[0];
      } catch (e) {
        console.warn('Error buscando cliente:', e);
      }
    }

    return cliente;
  },

  async buscarOCrearCliente(datos) {
    // Primero buscar si existe
    if (datos.cliente_nombre) {
      const clienteExistente = await this.buscarClienteSimilar(datos.cliente_nombre);
      if (clienteExistente) {
        this.ordenParcial.cliente_id = clienteExistente.id;
        return clienteExistente.id;
      }
    }

    // Si no existe, crear nuevo cliente
    try {
      const nuevoCliente = {
        nombre: datos.cliente_nombre || 'Cliente sin nombre',
        telefono: datos.cliente_telefono || '',
        cedula: datos.cliente_cedula || '',
        activo: true,
      };

      const response = await this.fetchJson('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoCliente),
      });

      if (response.success && response.data) {
        this.ordenParcial.cliente_id = response.data.id;
        this.agregarMensajeOrden(
          'assistant',
          `✅ Cliente "${datos.cliente_nombre}" creado exitosamente.`
        );
        return response.data.id;
      } else if (response.id) {
        this.ordenParcial.cliente_id = response.id;
        return response.id;
      }
    } catch (error) {
      console.error('Error creando cliente:', error);
    }

    return null;
  },

  async buscarVehiculoPorPlaca(placa) {
    const placaNorm = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let vehiculo = this.contextoDatos.vehiculos.find(
      (v) => v.placa?.toUpperCase().replace(/[^A-Z0-9]/g, '') === placaNorm
    );

    if (!vehiculo) {
      try {
        const response = await this.fetchJson(
          `/api/vehiculos/buscar?placa=${encodeURIComponent(placa)}`
        );
        if (response.data) vehiculo = response.data;
      } catch (e) {
        console.warn('Error buscando vehículo:', e);
      }
    }

    return vehiculo;
  },

  aplicarClienteExistente(cliente) {
    if (!cliente) return;

    const campos = {
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      cliente_telefono: cliente.telefono,
      cliente_cedula: cliente.cedula,
    };

    this.registrarCampos(campos);
    this.agregarMensajeOrden('assistant', `💡 Cliente encontrado: ${cliente.nombre}`);
  },

  aplicarVehiculoExistente(vehiculo) {
    if (!vehiculo) return;

    const campos = {
      vehiculo_id: vehiculo.id,
      vehiculo_marca: vehiculo.marca,
      vehiculo_modelo: vehiculo.modelo,
      vehiculo_placa: vehiculo.placa,
      vehiculo_anio: vehiculo.anio,
      vehiculo_color: vehiculo.color,
      kilometraje: vehiculo.kilometraje,
    };

    // Aplicar cliente si está asociado
    if (vehiculo.cliente_id && !this.ordenParcial.cliente_id) {
      campos.cliente_id = vehiculo.cliente_id;
      if (vehiculo.cliente_nombre) {
        campos.cliente_nombre = vehiculo.cliente_nombre;
      }
    }

    this.registrarCampos(campos);
    this.agregarMensajeOrden(
      'assistant',
      `🚗 Vehículo encontrado: ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placa})`
    );
  },

  async procesarConIA(mensaje) {
    try {
      const iaConfig = await this.obtenerConfiguracionIA();
      if (!iaConfig || !iaConfig.apiKey) {
        return await this.procesarSinIA(mensaje);
      }

      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.construirPromptUsuario(mensaje);

      let respuesta;

      if (window.IAUnifiedEngine && typeof IAUnifiedEngine.sendMessage === 'function') {
        respuesta = await IAUnifiedEngine.sendMessage(userPrompt, systemPrompt);
      } else {
        return await this.procesarSinIA(mensaje);
      }

      // Extraer datos del texto del mensaje del usuario localmente
      const datosExtraidos = this.extraerDatosDelMensaje(mensaje);
      if (Object.keys(datosExtraidos).length > 0) {
        const confirmados = this.registrarCampos(datosExtraidos);
        if (Object.keys(confirmados).length) {
          await this.autoCompletarDesdeBases(confirmados);
        }
      }

      // Mostrar la respuesta de la IA (ya viene en formato natural)
      if (respuesta) {
        // Limpiar cualquier JSON que pudiera venir en la respuesta
        let respuestaLimpia = this.limpiarRespuestaIA(respuesta);
        this.agregarMensajeOrden('assistant', respuestaLimpia);
      }

      // Verificar si ya tenemos todos los datos
      if (this.datosCompletosParaOrden()) {
        this.programarAutoGuardado();
      }
    } catch (error) {
      console.error('OrdenesTrabajoIAAgent: error con IA', error);
      return await this.procesarSinIA(mensaje);
    }
  },

  limpiarRespuestaIA(respuesta) {
    if (!respuesta) return '';

    // Si es un objeto, extraer el mensaje
    if (typeof respuesta === 'object') {
      return respuesta.mensaje || respuesta.text || respuesta.content || JSON.stringify(respuesta);
    }

    // Si es string, verificar si es JSON y extraer el mensaje
    if (typeof respuesta === 'string') {
      // Intentar parsear si parece JSON
      if (respuesta.trim().startsWith('{') || respuesta.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(respuesta);
          if (parsed.mensaje) return parsed.mensaje;
          if (parsed.text) return parsed.text;
          if (parsed.content) return parsed.content;
          if (parsed.respuesta) return parsed.respuesta;
        } catch (e) {
          // No es JSON válido, usar como está
        }
      }

      // Eliminar bloques de código JSON si los hay
      respuesta = respuesta.replace(/```json[\s\S]*?```/gi, '');
      respuesta = respuesta.replace(/```[\s\S]*?```/gi, '');

      // Limpiar espacios extra
      respuesta = respuesta.trim();
    }

    return respuesta || 'Lo siento, no pude procesar eso. ¿Puedes reformularlo?';
  },

  extraerDatosDelMensaje(mensaje) {
    const datos = {};
    const textoLower = mensaje.toLowerCase();

    // Extraer placa (formato ecuatoriano común: ABC-1234 o ABC1234)
    const placaMatch = mensaje.match(/\b([A-Z]{2,3}[-\s]?\d{3,4})\b/i);
    if (placaMatch) {
      datos.vehiculo_placa = placaMatch[1].toUpperCase().replace(/\s/g, '-');
    }

    // Extraer teléfono
    const telefonoMatch = mensaje.match(/\b(0\d{9}|\+593\d{9}|\d{10})\b/);
    if (telefonoMatch) {
      datos.cliente_telefono = telefonoMatch[1];
    }

    // Detectar tipo de servicio
    const servicios = {
      'cambio de aceite': 'Cambio de aceite',
      aceite: 'Cambio de aceite',
      frenos: 'Revisión de frenos',
      freno: 'Revisión de frenos',
      pastillas: 'Cambio de pastillas de freno',
      mantenimiento: 'Mantenimiento general',
      afinado: 'Afinado de motor',
      alineación: 'Alineación y balanceo',
      balanceo: 'Alineación y balanceo',
      suspension: 'Revisión de suspensión',
      amortiguador: 'Cambio de amortiguadores',
      bateria: 'Revisión/cambio de batería',
      'aire acondicionado': 'Revisión A/C',
      'a/c': 'Revisión A/C',
      ac: 'Revisión A/C',
      diagnóstico: 'Diagnóstico general',
      escaneo: 'Diagnóstico por escáner',
      llantas: 'Cambio de llantas',
      neumaticos: 'Cambio de neumáticos',
    };

    for (const [keyword, servicio] of Object.entries(servicios)) {
      if (textoLower.includes(keyword)) {
        datos.servicio_tipo = servicio;
        break;
      }
    }

    // Extraer marca de vehículo
    const marcas = [
      'toyota',
      'chevrolet',
      'hyundai',
      'kia',
      'nissan',
      'mazda',
      'ford',
      'volkswagen',
      'honda',
      'suzuki',
      'mitsubishi',
      'renault',
      'peugeot',
      'bmw',
      'mercedes',
      'audi',
      'jeep',
      'dodge',
      'great wall',
      'chery',
      'jac',
    ];
    for (const marca of marcas) {
      if (textoLower.includes(marca)) {
        datos.vehiculo_marca = marca.charAt(0).toUpperCase() + marca.slice(1);
        break;
      }
    }

    return datos;
  },

  async procesarSinIA(mensaje) {
    const pendientes = this.obtenerCamposPendientes();

    if (!pendientes.length && this.datosCompletosParaOrden()) {
      this.programarAutoGuardado();
    } else {
      const faltantesTexto = pendientes.map((c) => c.label).join(', ');
      this.agregarMensajeOrden(
        'assistant',
        `He procesado tu mensaje. Solo falta: ${faltantesTexto}`
      );
      this.solicitarDatosPendientes({ prefijo: 'Por favor completa:' });
    }
  },

  getSystemPrompt() {
    return `Eres un asistente amigable de taller mecánico que ayuda a crear órdenes de trabajo.
IMPORTANTE: Responde de forma CONVERSACIONAL y AMIGABLE, NO en formato JSON.

Tu trabajo es:
1. Extraer información del mensaje del usuario
2. Confirmar los datos que entendiste
3. Preguntar por los datos que faltan de forma natural

DATOS QUE NECESITAS RECOPILAR:
- Nombre del cliente
- Teléfono (opcional)
- Marca y modelo del vehículo
- Placa del vehículo
- Servicio o trabajo requerido
- Problema o síntomas (opcional)

EJEMPLO DE RESPUESTA CORRECTA:
"¡Perfecto! He registrado que María López necesita un cambio de frenos para su Kia Sportage (GYE-456). 
Para completar la orden, ¿me confirmas el teléfono de contacto?"

NUNCA respondas con JSON. Siempre responde de forma natural y amigable.
Si tienes todos los datos necesarios, di algo como: "¡Excelente! Ya tengo todo lo necesario. Voy a crear la orden de trabajo."`;
  },

  construirPromptUsuario(mensaje) {
    return `DATOS ACTUALES DE LA ORDEN:
${JSON.stringify(this.ordenParcial, null, 2)}

CAMPOS FALTANTES:
${this.obtenerCamposPendientes()
  .map((c) => `- ${c.label}`)
  .join('\n')}

MENSAJE DEL USUARIO:
"${mensaje}"

Extrae la información y sugiere lo necesario para completar la orden.`;
  },

  async obtenerConfiguracionIA() {
    try {
      if (window.IAUnifiedEngine && typeof IAUnifiedEngine.getConfig === 'function') {
        const config = IAUnifiedEngine.getConfig();
        if (config && config.apiKey) return config;
      }
      if (window.CONFIG_IA) return window.CONFIG_IA;
      const guardada = localStorage.getItem('ia_config');
      if (guardada) return JSON.parse(guardada);
    } catch (error) {
      console.warn('OrdenesTrabajoIAAgent: configuración IA inválida', error);
    }
    return null;
  },

  parseJsonResponse(text) {
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.warn('No se pudo parsear JSON:', text.substring(0, 200));
        }
      }
    }
    return null;
  },

  mostrarSugerenciasServicio(sugerencia) {
    if (!sugerencia) return;
    this.agregarMensajeOrden('assistant', `💡 **Diagnóstico IA:** ${sugerencia}`);
  },

  async crearOrdenAutomatica() {
    if (this.creandoOrden) return false;
    this.creandoOrden = true;

    try {
      const datos = this.ordenParcial;

      // Verificar que tenemos cliente (ID o datos para crear)
      let clienteId = datos.cliente_id;

      if (!clienteId && datos.cliente_nombre) {
        this.agregarMensajeOrden('assistant', '🔍 Buscando o creando cliente...');
        clienteId = await this.buscarOCrearCliente(datos);
      }

      if (!clienteId) {
        this.agregarMensajeOrden(
          'assistant',
          '❌ No pude identificar al cliente. Por favor proporciona el nombre del cliente.'
        );
        this.creandoOrden = false;
        return false;
      }

      // El campo problema/servicio es obligatorio - construir descripción del problema
      const problemaReportado =
        datos.problema ||
        datos.servicio ||
        `Servicio solicitado: ${datos.servicio || 'No especificado'}`;

      // Construir payload compatible con el endpoint del backend
      const payload = {
        clienteId: clienteId,
        cliente_nombre: datos.cliente_nombre,
        cliente_cedula: datos.cliente_cedula,
        cliente_telefono: datos.cliente_telefono,
        vehiculoId: datos.vehiculo_id,
        vehiculo_marca: datos.vehiculo_marca,
        vehiculo_modelo: datos.vehiculo_modelo,
        vehiculo_placa: datos.vehiculo_placa,
        vehiculo_anio: datos.vehiculo_anio,
        vehiculo_color: datos.vehiculo_color,
        kilometraje: datos.kilometraje,
        // Campo obligatorio: problemaReportado
        problemaReportado: problemaReportado,
        diagnosticoInicial: datos.servicio ? `Servicio: ${datos.servicio}` : '',
        prioridad: datos.prioridad || 'normal',
        tecnicoAsignadoId: datos.tecnico_id,
        fechaRecepcion: new Date().toISOString().split('T')[0],
        fechaEntregaEstimada: datos.fecha_entrega,
        observaciones: datos.notas || '',
        estado: 'recibido',
        items: this.construirItemsParaBackend(),
        negocioId: this.negocioId,
      };

      this.agregarMensajeOrden('assistant', '⏳ Guardando orden de trabajo...');

      // Usar el método existente de OrdenesTrabajo o API directa
      let result;

      if (window.OrdenesTrabajo && typeof OrdenesTrabajo.createOrdenTrabajo === 'function') {
        result = await OrdenesTrabajo.createOrdenTrabajo(payload);
      } else {
        const response = await this.fetchJson('/api/ordenes-trabajo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        result = response;
      }

      if (result && (result.success || result.id || result.orden)) {
        const ordenId = result.orden?.id || result.id || result.numero;
        const resumen =
          `${datos.vehiculo_marca || ''} ${datos.vehiculo_modelo || ''} - ${datos.servicio || 'Servicio'}`.trim();

        // Mensaje de éxito con opciones
        // Escapar el ordenId para uso seguro en HTML/onclick
        const ordenIdSafe = String(ordenId).replace(/'/g, "\\'");

        const successHtml = `
                    <div class="orden-success-message">
                        <div class="success-icon">✅</div>
                        <h4>¡Orden creada exitosamente!</h4>
                        <div class="orden-resumen">
                            <p><strong>📋 Orden #${ordenId}</strong></p>
                            <p>👤 ${this.escapeHtml(datos.cliente_nombre || 'Cliente')}</p>
                            <p>🚗 ${this.escapeHtml(resumen)}</p>
                        </div>
                        <div class="success-actions">
                            <button class="btn-success-action" onclick="OrdenesTrabajoIAAgent.verOrden('${ordenIdSafe}')">
                                <i class="fas fa-eye"></i> Ver Orden
                            </button>
                            <button class="btn-success-action secondary" onclick="OrdenesTrabajoIAAgent.limpiarChat()">
                                <i class="fas fa-plus"></i> Crear Otra
                            </button>
                        </div>
                    </div>
                `;

        this.agregarMensajeOrden('assistant', successHtml, { allowHtml: true });

        // Refrescar lista de órdenes si está visible
        if (window.OrdenesTrabajo && typeof OrdenesTrabajo.cargarOrdenes === 'function') {
          OrdenesTrabajo.cargarOrdenes();
        }

        // Limpiar para nueva orden
        this.limpiarEstado();
        this.itemsSugeridos = [];

        return true;
      } else {
        throw new Error(result?.message || 'Error desconocido al crear la orden');
      }
    } catch (error) {
      console.error('OrdenesTrabajoIAAgent: error creando orden', error);
      this.agregarMensajeOrden(
        'assistant',
        `❌ No pude guardar la orden: ${error.message}\n\n` +
          `Puedes intentar de nuevo o usar el formulario manual.`
      );
      return false;
    } finally {
      this.creandoOrden = false;
    }
  },

  // Construir items en el formato esperado por el backend
  construirItemsParaBackend() {
    if (!this.itemsSugeridos || !this.itemsSugeridos.length) {
      // Si hay servicio, crear al menos un item de servicio
      const servicio = this.ordenParcial.servicio;
      if (servicio) {
        return [
          {
            tipo: 'servicio',
            descripcion: servicio,
            detalle: this.ordenParcial.problema || '',
            cantidad: 1,
            precio_unitario: 0, // El precio se definirá después
          },
        ];
      }
      return [];
    }

    return this.itemsSugeridos.map((item) => ({
      tipo: item.tipo || 'repuesto',
      descripcion: item.nombre,
      detalle: item.razon || '',
      cantidad: item.cantidad || 1,
      precio_unitario: item.precio_estimado || 0,
      producto_id: item.producto_id || null,
    }));
  },

  // ============================================
  // INTERFAZ DE CHAT
  // ============================================

  crearChatOrdenes() {
    if (document.getElementById('ordenesIAChatContainer')) return;

    const chatContainer = document.createElement('div');
    chatContainer.id = 'ordenesIAChatContainer';
    chatContainer.className = 'whatsapp-chat-container ordenes-ia-chat';
    chatContainer.style.display = 'none';
    chatContainer.setAttribute('data-agent', 'ordenes-trabajo');
    chatContainer.innerHTML = `
            <div class="whatsapp-chat-header" style="background: linear-gradient(135deg, #ff9800, #f57c00);">
                <div class="header-left">
                    <div class="back-btn" onclick="OrdenesTrabajoIAAgent.cerrarChat()">
                        <i class="fas fa-arrow-left"></i>
                    </div>
                    <div class="avatar" style="background: #fff3e0;">
                        <i class="fas fa-tools" style="color: #ff9800;"></i>
                    </div>
                    <div class="contact-info">
                        <h4>Crear Orden con IA</h4>
                        <p class="online-status">
                            <span class="status-dot"></span>
                            Asistente activo
                        </p>
                    </div>
                </div>
                <div class="header-actions">
                    <button class="header-btn" onclick="OrdenesTrabajoIAAgent.limpiarChat()" title="Nueva orden">
                        <i class="fas fa-redo"></i>
                    </button>
                    <button class="header-btn" onclick="OrdenesTrabajoIAAgent.cerrarChat()" title="Cerrar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="whatsapp-chat-body" id="ordenesIAChatBody">
                <div class="whatsapp-chat-stream" id="ordenesIAChatStream"></div>
            </div>
            <div class="whatsapp-chat-footer">
                <div class="input-container" style="position: relative;">
                    <input type="text" 
                        id="ordenesIAChatInput" 
                        placeholder="Describe el trabajo o pega datos del cliente..." 
                        onkeypress="if(event.key==='Enter') OrdenesTrabajoIAAgent.enviarMensaje()">
                    <button class="send-btn" onclick="OrdenesTrabajoIAAgent.enviarMensaje()" style="background: #ff9800;">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="typing-indicator" id="ordenesIATyping" style="display: none;">
                    <span></span>
                    <span></span>
                    <span></span>
                    Procesando...
                </div>
            </div>
        `;

    document.body.appendChild(chatContainer);
    this.agregarEstilos();
    this.limpiarChat();
  },

  abrirChat() {
    let chatContainer = document.getElementById('ordenesIAChatContainer');
    if (!chatContainer) {
      this.crearChatOrdenes();
      chatContainer = document.getElementById('ordenesIAChatContainer');
    }

    // Ocultar otros chats
    document
      .querySelectorAll('.whatsapp-chat-container, .chat-assistant-window')
      .forEach((chat) => {
        if (chat !== chatContainer) chat.style.display = 'none';
      });

    chatContainer.style.display = 'flex';

    setTimeout(() => {
      const input = document.getElementById('ordenesIAChatInput');
      if (input) input.focus();
    }, 250);
  },

  cerrarChat() {
    const chatContainer = document.getElementById('ordenesIAChatContainer');
    if (chatContainer) {
      chatContainer.style.display = 'none';
    }
  },

  limpiarChat() {
    const chatStream = document.getElementById('ordenesIAChatStream');
    if (chatStream) {
      chatStream.innerHTML = `
                <div class="chat-welcome">
                    <div class="welcome-avatar" style="background: #0f3460;">
                        <i class="fas fa-tools" style="color: #ff9800; font-size: 32px;"></i>
                    </div>
                    <h3>¡Hola! 👋 Soy tu asistente de órdenes</h3>
                    <p>¿Qué tipo de trabajo necesitas registrar?</p>
                    
                    <div class="service-options-grid">
                        <button class="service-option-btn" onclick="OrdenesTrabajoIAAgent.seleccionarServicio('cambio_aceite')">
                            <i class="fas fa-oil-can"></i>
                            <span>Cambio de Aceite</span>
                        </button>
                        <button class="service-option-btn" onclick="OrdenesTrabajoIAAgent.seleccionarServicio('frenos')">
                            <i class="fas fa-compact-disc"></i>
                            <span>Revisión de Frenos</span>
                        </button>
                        <button class="service-option-btn" onclick="OrdenesTrabajoIAAgent.seleccionarServicio('alineacion')">
                            <i class="fas fa-arrows-alt-h"></i>
                            <span>Alineación y Balanceo</span>
                        </button>
                        <button class="service-option-btn" onclick="OrdenesTrabajoIAAgent.seleccionarServicio('mantenimiento')">
                            <i class="fas fa-wrench"></i>
                            <span>Mantenimiento General</span>
                        </button>
                        <button class="service-option-btn" onclick="OrdenesTrabajoIAAgent.seleccionarServicio('diagnostico')">
                            <i class="fas fa-stethoscope"></i>
                            <span>Diagnóstico</span>
                        </button>
                        <button class="service-option-btn" onclick="OrdenesTrabajoIAAgent.seleccionarServicio('otro')">
                            <i class="fas fa-ellipsis-h"></i>
                            <span>Otro Servicio</span>
                        </button>
                    </div>
                    
                    <p style="font-size: 12px; color: #888; margin-top: 16px;">
                        O escribe directamente los datos del cliente y vehículo
                    </p>
                </div>
            `;
    }
    this.limpiarEstado(true);
  },

  // Método para seleccionar un tipo de servicio y mostrar formulario
  seleccionarServicio(tipoServicio) {
    const servicios = {
      cambio_aceite: { nombre: 'Cambio de aceite y filtros', duracion: 45 },
      frenos: { nombre: 'Revisión/cambio de frenos', duracion: 90 },
      alineacion: { nombre: 'Alineación y balanceo', duracion: 60 },
      mantenimiento: { nombre: 'Mantenimiento general', duracion: 120 },
      diagnostico: { nombre: 'Diagnóstico computarizado', duracion: 60 },
      otro: { nombre: '', duracion: 60 },
    };

    const servicio = servicios[tipoServicio] || servicios['otro'];

    // Registrar el servicio seleccionado
    if (servicio.nombre) {
      this.registrarCampos({ servicio: servicio.nombre });
    }

    // Mostrar formulario con slots editables
    this.mostrarFormularioConSlots(servicio);
  },

  mostrarFormularioConSlots(servicio) {
    const chatStream = document.getElementById('ordenesIAChatStream');
    if (!chatStream) return;

    // Limpiar bienvenida y mensajes previos de formulario
    const welcome = chatStream.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    // Remover formularios anteriores si existen
    const formsAnteriores = chatStream.querySelectorAll('.orden-form-slots');
    formsAnteriores.forEach((f) => f.closest('.whatsapp-message')?.remove());

    const groupId = `form-${Date.now()}`;

    // Mensaje del servicio seleccionado
    if (servicio.nombre) {
      this.agregarMensajeOrden(
        'assistant',
        `✅ **${servicio.nombre}** seleccionado.\n\n📝 Completa los siguientes datos:`
      );
    } else {
      this.agregarMensajeOrden('assistant', `📝 Describe el servicio y completa los datos:`);
    }

    // Mostrar formulario con slots interactivos - los spans comienzan vacíos
    const formHtml = `
            <div class="orden-form-slots" data-form-group="${groupId}">
                <div class="slot-row">
                    <label><i class="fas fa-user"></i> Cliente:</label>
                    <span class="field-slot editable" contenteditable="true" data-field-slot="cliente_nombre" data-slot-group="${groupId}" data-placeholder="Nombre del cliente"></span>
                </div>
                <div class="slot-row">
                    <label><i class="fas fa-phone"></i> Teléfono:</label>
                    <span class="field-slot editable" contenteditable="true" data-field-slot="cliente_telefono" data-slot-group="${groupId}" data-placeholder="0999999999"></span>
                </div>
                <div class="slot-row">
                    <label><i class="fas fa-car"></i> Marca:</label>
                    <span class="field-slot editable" contenteditable="true" data-field-slot="vehiculo_marca" data-slot-group="${groupId}" data-placeholder="Toyota, Kia, etc."></span>
                </div>
                <div class="slot-row">
                    <label><i class="fas fa-car-side"></i> Modelo:</label>
                    <span class="field-slot editable" contenteditable="true" data-field-slot="vehiculo_modelo" data-slot-group="${groupId}" data-placeholder="Corolla, Sportage, etc."></span>
                </div>
                <div class="slot-row">
                    <label><i class="fas fa-id-card"></i> Placa:</label>
                    <span class="field-slot editable" contenteditable="true" data-field-slot="vehiculo_placa" data-slot-group="${groupId}" data-placeholder="ABC-1234"></span>
                </div>
                ${
                  !servicio.nombre
                    ? `
                <div class="slot-row">
                    <label><i class="fas fa-tools"></i> Servicio:</label>
                    <span class="field-slot editable" contenteditable="true" data-field-slot="servicio" data-slot-group="${groupId}" data-placeholder="Describe el trabajo"></span>
                </div>
                `
                    : ''
                }
                <div class="slot-row">
                    <label><i class="fas fa-exclamation-triangle"></i> Problema:</label>
                    <span class="field-slot editable" contenteditable="true" data-field-slot="problema" data-slot-group="${groupId}" data-placeholder="Síntomas o fallas (opcional)"></span>
                </div>
                
                <button class="btn-crear-orden" onclick="OrdenesTrabajoIAAgent.crearOrdenDesdeFormulario('${groupId}')">
                    <i class="fas fa-check-circle"></i> Crear Orden de Trabajo
                </button>
            </div>
        `;

    this.agregarMensajeOrden('assistant', formHtml, { allowHtml: true, slotGroupId: groupId });
  },

  crearOrdenDesdeFormulario(groupId) {
    // Recopilar todos los valores de los slots
    const slots = document.querySelectorAll(`[data-slot-group="${groupId}"]`);
    const datos = {};

    slots.forEach((slot) => {
      const key = slot.dataset.fieldSlot;
      const valor = slot.textContent.trim();
      if (valor && valor !== slot.dataset.placeholder) {
        datos[key] = valor;
      }
    });

    // Registrar los datos
    this.registrarCampos(datos);

    // Verificar datos mínimos
    const pendientes = this.obtenerCamposPendientes();

    if (pendientes.length > 0) {
      const faltantes = pendientes.map((c) => c.label).join(', ');
      this.agregarMensajeOrden('assistant', `⚠️ Faltan datos obligatorios: ${faltantes}`);
      return;
    }

    // Crear la orden
    this.crearOrdenAutomatica();
  },

  verOrden(ordenId) {
    // Cerrar el chat y mostrar la orden
    this.cerrarChat();

    if (window.OrdenesTrabajo && typeof OrdenesTrabajo.verDetalle === 'function') {
      OrdenesTrabajo.verDetalle(ordenId);
    } else if (window.OrdenesTrabajo && typeof OrdenesTrabajo.editarOrden === 'function') {
      OrdenesTrabajo.editarOrden(ordenId);
    } else {
      // Fallback - ir a la sección de órdenes y recargar
      if (typeof Navigation !== 'undefined' && typeof Navigation.goTo === 'function') {
        Navigation.goTo('ordenes-trabajo');
      }
      // Recargar la lista de órdenes
      setTimeout(() => {
        if (window.OrdenesTrabajo && typeof OrdenesTrabajo.cargarOrdenes === 'function') {
          OrdenesTrabajo.cargarOrdenes();
        }
      }, 300);
    }
  },

  usarEjemplo(texto) {
    const input = document.getElementById('ordenesIAChatInput');
    if (input) {
      input.value = texto;
      input.focus();
    }
  },

  agregarMensajeOrden(tipo, texto, options = {}) {
    const { allowHtml = false, slotGroupId = null } = options;
    const chatStream = document.getElementById('ordenesIAChatStream');
    if (!chatStream) return;

    const welcome = chatStream.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    const roleClass = tipo === 'user' ? 'user' : 'bot';
    const messageDiv = document.createElement('div');
    messageDiv.className = `whatsapp-message ${roleClass}`;

    const content = document.createElement('div');
    content.className = 'message-content';

    const textWrapper = document.createElement('div');
    textWrapper.className = 'message-text';

    if (allowHtml) {
      textWrapper.innerHTML = texto;
    } else {
      // Convertir markdown básico
      let formatted = this.escapeHtml(texto);
      formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/\n/g, '<br>');
      textWrapper.innerHTML = formatted;
    }

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const now = new Date();
    meta.textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    content.appendChild(textWrapper);
    content.appendChild(meta);
    messageDiv.appendChild(content);
    chatStream.appendChild(messageDiv);
    chatStream.scrollTop = chatStream.scrollHeight;

    if (slotGroupId) {
      this.inicializarSlotsInteractivos(messageDiv, slotGroupId);
    }
  },

  escapeHtml(texto = '') {
    return texto
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  inicializarSlotsInteractivos(container, groupId) {
    if (!container) return;
    const slots = container.querySelectorAll(`[data-slot-group="${groupId}"]`);

    slots.forEach((slot) => {
      slot.setAttribute('contenteditable', 'true');

      slot.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          slot.blur();
        }
      });

      slot.addEventListener('focus', () => {
        if (slot.textContent === slot.dataset.placeholder) {
          slot.textContent = '';
        }
        slot.classList.add('editing');
      });

      slot.addEventListener('blur', () => {
        slot.classList.remove('editing');
        const valor = slot.textContent.trim();
        const fieldKey = slot.dataset.fieldSlot;

        if (valor && valor !== slot.dataset.placeholder) {
          this.registrarCampos({ [fieldKey]: valor });
          slot.classList.add('filled');

          // Verificar si completamos
          if (this.datosCompletosParaOrden()) {
            this.programarAutoGuardado();
          } else {
            // Buscar siguiente slot vacío
            const nextSlot = container.querySelector(`[data-slot-group="${groupId}"]:not(.filled)`);
            if (nextSlot) {
              setTimeout(() => nextSlot.focus(), 100);
            } else {
              this.solicitarDatosPendientes({ prefijo: 'Ahora necesito:', force: true });
            }
          }
        } else if (!valor) {
          slot.textContent = slot.dataset.placeholder || '';
        }
      });
    });

    // Focus en primer slot
    if (slots.length) {
      setTimeout(() => slots[0].focus(), 150);
    }
  },

  async enviarMensaje() {
    const input = document.getElementById('ordenesIAChatInput');
    if (!input) return;

    const mensaje = input.value.trim();
    if (!mensaje) return;

    this.agregarMensajeOrden('user', mensaje);
    input.value = '';

    const typing = document.getElementById('ordenesIATyping');
    if (typing) typing.style.display = 'flex';

    try {
      if (!this.conversacionActual) this.conversacionActual = [];
      this.conversacionActual.push({ role: 'user', content: mensaje });

      await this.procesarMensajeUsuario(mensaje);
    } catch (error) {
      console.error('OrdenesTrabajoIAAgent: error enviando mensaje', error);
      this.agregarMensajeOrden(
        'assistant',
        'Hubo un problema procesando tu mensaje. ¿Puedes reformularlo?'
      );
    } finally {
      if (typing) typing.style.display = 'none';
    }
  },

  agregarEstilos() {
    if (document.getElementById('ordenesIAAgentStyles')) return;

    const styles = document.createElement('style');
    styles.id = 'ordenesIAAgentStyles';
    styles.innerHTML = `
            .ordenes-ia-chat {
                --agent-color: #ff9800;
                --agent-light: #fff3e0;
                --agent-dark-bg: #1a1a2e;
                --agent-dark-msg: #16213e;
                --agent-dark-text: #e8e8e8;
                --agent-dark-border: #0f3460;
            }
            
            /* === MODO OSCURO PARA TODO EL CHAT === */
            .ordenes-ia-chat {
                background: var(--agent-dark-bg) !important;
            }
            
            .ordenes-ia-chat .whatsapp-chat-body {
                background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%) !important;
            }
            
            .ordenes-ia-chat .whatsapp-chat-stream {
                background: transparent !important;
            }
            
            .ordenes-ia-chat .whatsapp-chat-footer {
                background: #16213e !important;
                border-top: 1px solid var(--agent-dark-border) !important;
            }
            
            .ordenes-ia-chat .whatsapp-chat-footer input {
                background: #0f3460 !important;
                color: var(--agent-dark-text) !important;
                border: 1px solid var(--agent-dark-border) !important;
            }
            
            .ordenes-ia-chat .whatsapp-chat-footer input::placeholder {
                color: #888 !important;
            }
            
            /* Mensajes del usuario */
            .ordenes-ia-chat .whatsapp-message.user .message-content {
                background: linear-gradient(135deg, #ff9800, #f57c00) !important;
                color: white !important;
            }
            
            .ordenes-ia-chat .whatsapp-message.user .message-text {
                color: white !important;
            }
            
            .ordenes-ia-chat .whatsapp-message.user .message-meta {
                color: rgba(255, 255, 255, 0.8) !important;
            }
            
            /* Mensajes del bot/asistente */
            .ordenes-ia-chat .whatsapp-message.bot .message-content {
                background: #1e3a5f !important;
                border-left: 3px solid var(--agent-color) !important;
                color: var(--agent-dark-text) !important;
            }
            
            .ordenes-ia-chat .whatsapp-message.bot .message-text {
                color: var(--agent-dark-text) !important;
            }
            
            .ordenes-ia-chat .whatsapp-message.bot .message-meta {
                color: #aaa !important;
            }
            
            /* Bienvenida */
            .ordenes-ia-chat .chat-welcome {
                background: rgba(30, 58, 95, 0.5) !important;
                border-radius: 16px;
                padding: 24px;
                margin: 16px;
                color: var(--agent-dark-text) !important;
            }
            
            .ordenes-ia-chat .chat-welcome h3 {
                color: var(--agent-color) !important;
            }
            
            .ordenes-ia-chat .chat-welcome p {
                color: #ccc !important;
            }
            
            .ordenes-ia-chat .field-slot-guide {
                background: #0f3460 !important;
                border: 1px dashed var(--agent-color) !important;
                color: var(--agent-dark-text) !important;
                padding: 12px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 13px;
                white-space: pre-wrap;
                line-height: 2;
            }
            
            .ordenes-ia-chat .field-slot {
                display: inline-block;
                min-width: 120px;
                padding: 2px 8px;
                margin-left: 8px;
                background: #1a1a2e !important;
                border: 1px solid var(--agent-color) !important;
                border-radius: 4px;
                font-family: inherit;
                outline: none;
                transition: all 0.2s;
                color: var(--agent-dark-text) !important;
            }
            
            .ordenes-ia-chat .field-slot:focus,
            .ordenes-ia-chat .field-slot.editing {
                border-color: var(--agent-color);
                box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.3);
                background: #16213e !important;
            }
            
            .ordenes-ia-chat .field-slot.filled {
                background: #2d4a3e !important;
                border-color: #4CAF50 !important;
                color: #a5d6a7 !important;
            }
            
            .ordenes-ia-chat .field-slot.slot-error {
                border-color: #f44336 !important;
                background: #3d1a1a !important;
                color: #ef9a9a !important;
            }
            
            .ordenes-ia-chat .example-bubble {
                background: #0f3460 !important;
                border: 1px solid var(--agent-color) !important;
                color: var(--agent-dark-text) !important;
                padding: 8px 12px;
                border-radius: 16px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .ordenes-ia-chat .example-bubble:hover {
                background: var(--agent-color) !important;
                color: white !important;
            }
            
            .ordenes-ia-chat .examples-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 12px;
            }
            
            /* Typing indicator */
            .ordenes-ia-chat .typing-indicator {
                background: #16213e !important;
                color: #aaa !important;
            }
            
            /* === GRID DE SERVICIOS === */
            .ordenes-ia-chat .service-options-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin: 16px 0;
            }
            
            .ordenes-ia-chat .service-option-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 16px 12px;
                background: #0f3460;
                border: 2px solid transparent;
                border-radius: 12px;
                color: var(--agent-dark-text);
                cursor: pointer;
                transition: all 0.2s;
                font-size: 13px;
            }
            
            .ordenes-ia-chat .service-option-btn:hover {
                background: #1e3a5f;
                border-color: var(--agent-color);
                transform: translateY(-2px);
            }
            
            .ordenes-ia-chat .service-option-btn i {
                font-size: 24px;
                color: var(--agent-color);
            }
            
            .ordenes-ia-chat .service-option-btn span {
                text-align: center;
                font-weight: 500;
            }
            
            /* === FORMULARIO CON SLOTS === */
            .ordenes-ia-chat .orden-form-slots {
                background: #0f3460;
                border-radius: 12px;
                padding: 16px;
                margin-top: 8px;
            }
            
            .ordenes-ia-chat .slot-row {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #1e3a5f;
            }
            
            .ordenes-ia-chat .slot-row:last-of-type {
                margin-bottom: 16px;
                border-bottom: none;
            }
            
            .ordenes-ia-chat .slot-row label {
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 100px;
                color: #aaa;
                font-size: 13px;
            }
            
            .ordenes-ia-chat .slot-row label i {
                color: var(--agent-color);
                width: 16px;
            }
            
            .ordenes-ia-chat .slot-row .field-slot.editable {
                flex: 1;
                min-width: 0;
                padding: 8px 12px;
                background: #1a1a2e;
                border: 1px solid #1e3a5f;
                border-radius: 8px;
                color: var(--agent-dark-text);
                font-size: 14px;
                outline: none;
                transition: all 0.2s;
            }
            
            .ordenes-ia-chat .slot-row .field-slot.editable:focus {
                border-color: var(--agent-color);
                box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.2);
            }
            
            .ordenes-ia-chat .slot-row .field-slot.editable:empty::before {
                content: attr(data-placeholder);
                color: #666;
            }
            
            .ordenes-ia-chat .btn-crear-orden {
                width: 100%;
                padding: 14px 20px;
                background: linear-gradient(135deg, #ff9800, #f57c00);
                border: none;
                border-radius: 10px;
                color: white;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
            
            .ordenes-ia-chat .btn-crear-orden:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(255, 152, 0, 0.4);
            }
            
            .ordenes-ia-chat .btn-crear-orden:active {
                transform: translateY(0);
            }
            
            /* === MENSAJE DE ÉXITO === */
            .ordenes-ia-chat .orden-success-message {
                text-align: center;
                padding: 16px;
            }
            
            .ordenes-ia-chat .orden-success-message .success-icon {
                font-size: 48px;
                margin-bottom: 12px;
            }
            
            .ordenes-ia-chat .orden-success-message h4 {
                color: #4caf50;
                margin: 0 0 16px 0;
                font-size: 18px;
            }
            
            .ordenes-ia-chat .orden-success-message .orden-resumen {
                background: #0f3460;
                border-radius: 10px;
                padding: 12px;
                margin-bottom: 16px;
            }
            
            .ordenes-ia-chat .orden-success-message .orden-resumen p {
                margin: 4px 0;
                color: var(--agent-dark-text);
            }
            
            .ordenes-ia-chat .orden-success-message .success-actions {
                display: flex;
                gap: 10px;
                justify-content: center;
            }
            
            .ordenes-ia-chat .btn-success-action {
                flex: 1;
                max-width: 150px;
                padding: 10px 16px;
                background: linear-gradient(135deg, #4caf50, #388e3c);
                border: none;
                border-radius: 8px;
                color: white;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                transition: all 0.2s;
            }
            
            .ordenes-ia-chat .btn-success-action:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
            }
            
            .ordenes-ia-chat .btn-success-action.secondary {
                background: linear-gradient(135deg, #2196f3, #1976d2);
            }
            
            .ordenes-ia-chat .btn-success-action.secondary:hover {
                box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
            }
            
            /* === SLOT FILLED STATE === */
            .ordenes-ia-chat .slot-row .field-slot.filled {
                border-color: #4caf50 !important;
                background: rgba(76, 175, 80, 0.1);
            }
        `;

    document.head.appendChild(styles);
  },
};

// Exponer globalmente
window.OrdenesTrabajoIAAgent = OrdenesTrabajoIAAgent;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  OrdenesTrabajoIAAgent.init();
});

// Integrar con OrdenesTrabajo.crearConIA()
if (window.OrdenesTrabajo) {
  OrdenesTrabajo.crearConIA = function () {
    if (!window.OrdenesTrabajoIAAgent) {
      Utils.showToast?.('Asistente IA no disponible', 'error');
      return;
    }
    OrdenesTrabajoIAAgent.abrirChat();
  };
}

console.log('✅ OrdenesTrabajoIAAgent cargado');
