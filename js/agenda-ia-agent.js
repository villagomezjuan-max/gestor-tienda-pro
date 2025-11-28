/* ========================================
   AGENTE IA PARA AGENDA AUTÓNOMA (CHAT PURO)
   ======================================== */

const AgendaIAAgent = {
  initialized: false,
  conversacionActual: [],
  conversacionActualId: null,
  conversacionesGuardadas: {},
  citaParcial: {},
  contextoDatos: {
    clientes: [],
    vehiculos: [],
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
      required: true,
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
    {
      key: 'vehiculo_placa',
      label: 'Placa del vehículo',
      required: false,
      placeholder: 'ABC-1234',
    },
    { key: 'vehiculo_color', label: 'Color del vehículo', required: false, placeholder: 'Negro' },
    {
      key: 'servicio',
      label: 'Servicio requerido',
      required: true,
      placeholder: 'Mantenimiento general',
    },
    {
      key: 'descripcion',
      label: 'Detalle o síntoma',
      required: false,
      placeholder: 'Golpe en la puerta',
    },
    { key: 'fecha', label: 'Fecha (DD/MM/AAAA)', required: true, placeholder: '25/11/2025' },
    { key: 'hora', label: 'Hora (HH:MM)', required: true, placeholder: '10:30' },
  ],
  chunkSize: 3,
  labelToFieldMap: {},
  ultimoClienteReconocido: null,
  ultimoVehiculoReconocido: null,
  autoSaveTimer: null,
  creandoCita: false,
  ultimaSolicitudKeys: [],
  preferirModoManual: true,

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.preferirModoManual = this.detectarPreferenciaModo();
    this.negocioId =
      window.Auth && typeof Auth.getNegocioId === 'function' ? Auth.getNegocioId() : 'default';
    this.limpiarEstado(true);
    this.construirMapaEtiquetas();
    this.cargarContextoInicial();
    this.crearChatWhatsApp();
    console.log('AgendaIAAgent listo (modo chat puro)');
  },

  detectarPreferenciaModo() {
    try {
      const config = window.CONFIG_IA || {};
      if (typeof config.agenda_manual === 'boolean') {
        return config.agenda_manual;
      }
      const modoConfig = (config.agenda_mode || config.modo_agenda || '').toString().toLowerCase();
      if (modoConfig === 'manual') return true;
      if (['ia', 'auto', 'predeterminado'].includes(modoConfig)) return false;
      const stored = localStorage.getItem('agenda_modo_captura');
      if (stored) {
        return stored.toLowerCase() === 'manual';
      }
    } catch (error) {
      console.warn('AgendaIAAgent: no se pudo leer preferencia de modo', error);
    }
    return true;
  },

  establecerModoCaptura(manual = true) {
    this.preferirModoManual = !!manual;
    try {
      localStorage.setItem('agenda_modo_captura', manual ? 'manual' : 'ia');
    } catch (error) {
      console.warn('AgendaIAAgent: no se pudo guardar el modo preferido', error);
    }
  },

  limpiarEstado(saltarMensajes = false) {
    this.citaParcial = {};
    this.conversacionActual = [];
    this.conversacionActualId = `conv-${Date.now()}`;
    this.ultimaSolicitudKeys = [];
    this.cancelarAutoGuardado();
    if (!saltarMensajes && document.getElementById('whatsappChatStream')) {
      this.solicitarDatosPendientes({ prefijo: 'Para empezar necesito:', force: true });
    }
  },

  guardarConversacion() {
    if (!this.conversacionActualId) return;
    this.conversacionesGuardadas[this.conversacionActualId] = {
      mensajes: [...this.conversacionActual],
      citaParcial: { ...this.citaParcial },
      ultimaActualizacion: Date.now(),
    };
  },

  async cargarContextoInicial() {
    try {
      const [clientes, vehiculos] = await Promise.all([
        this.fetchJson('/api/clientes/recientes?limit=50').catch(() => []),
        this.fetchJson('/api/vehiculos/recientes?limit=50').catch(() => []),
      ]);
      if (Array.isArray(clientes)) this.contextoDatos.clientes = clientes;
      if (Array.isArray(vehiculos)) this.contextoDatos.vehiculos = vehiculos;
    } catch (error) {
      console.warn('AgendaIAAgent: no se pudo cargar contexto inicial', error);
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

  obtenerCampoPorEtiqueta(etiqueta) {
    const key = this.labelToFieldMap[this.normalizarEtiqueta(etiqueta)];
    return key ? this.obtenerCampoConfig(key) : null;
  },

  obtenerCampoConfig(key) {
    return (
      this.campoOrden.find((campo) => campo.key === key) || { key, label: key, required: false }
    );
  },

  obtenerCamposPendientes() {
    return this.campoOrden.filter((campo) => campo.required && !this.tieneValorCampo(campo.key));
  },

  tieneValorCampo(key) {
    const value = this.citaParcial?.[key];
    return value !== undefined && value !== null && value !== '';
  },

  datosCompletosParaCita() {
    const requeridos = [
      'cliente_nombre',
      'cliente_telefono',
      'vehiculo_marca',
      'vehiculo_modelo',
      'servicio',
      'fecha',
      'hora',
    ];
    return requeridos.every((key) => this.tieneValorCampo(key));
  },

  describirCitaActual() {
    const pares = Object.entries(this.citaParcial || {}).filter(
      ([, valor]) => valor !== undefined && valor !== null && valor !== ''
    );
    if (!pares.length) return 'Sin datos capturados todavía.';
    return pares
      .map(([key, valor]) => {
        const campo = this.obtenerCampoConfig(key);
        return `${campo.label}: ${valor}`;
      })
      .join(' | ');
  },

  prepararInstruccionesIA() {
    const pendientes = this.obtenerCamposPendientes();
    const chunk = pendientes.slice(0, this.chunkSize);
    const lineas = chunk.map((campo) => `- ${campo.label} (campo interno: ${campo.key})`);
    return (
      `Actúa como asistente de citas. Captura datos en bloques de ${this.chunkSize} campos máximo. ` +
      `Estado actual: ${this.describirCitaActual()}. ` +
      `Solicita los campos faltantes usando el formato "Campo:" seguido de un espacio para que el usuario complete y confirma lo que entiendas. ` +
      `Prioriza:\n${lineas.join('\n')}`
    );
  },

  solicitarDatosPendientes(options = {}) {
    const { faltantes, prefijo = 'Sigamos con esto:', force = false } = options;
    const pendientes =
      faltantes && faltantes.length
        ? faltantes.map((key) => this.obtenerCampoConfig(key))
        : this.obtenerCamposPendientes();
    if (!pendientes.length) {
      this.ultimaSolicitudKeys = [];
      return;
    }
    const chunk = pendientes.slice(0, this.chunkSize);
    const keysChunk = chunk.map((campo) => campo.key);
    if (!force && JSON.stringify(keysChunk) === JSON.stringify(this.ultimaSolicitudKeys)) {
      return;
    }
    this.ultimaSolicitudKeys = keysChunk;
    const slotGroupId = `slot-${Date.now()}`;
    const lineasHtml = chunk
      .map((campo, index) => {
        const placeholderAttr = campo.placeholder
          ? ` data-placeholder="${this.escapeHtml(campo.placeholder)}"`
          : '';
        return `${index + 1}. ${this.escapeHtml(campo.label)}: <span class="field-slot" data-field-slot="${campo.key}" data-slot-group="${slotGroupId}" tabindex="0"${placeholderAttr}></span>`;
      })
      .join('<br>');
    const prefijoHtml = this.escapeHtml(prefijo);
    this.agregarMensajeWhatsApp('assistant', `${prefijoHtml}<br>${lineasHtml}`, {
      allowHtml: true,
      slotGroupId,
    });
  },

  registrarCampos(campos = {}) {
    const confirmados = {};
    Object.entries(campos).forEach(([key, valor]) => {
      if (valor === undefined || valor === null) return;
      const limpio = typeof valor === 'string' ? valor.trim() : valor;
      if (!limpio) return;
      if (this.citaParcial[key] === limpio) return;
      this.citaParcial[key] = limpio;
      confirmados[key] = limpio;
    });
    return confirmados;
  },

  eliminarValorCampo(key) {
    if (!key) return;
    if (Object.prototype.hasOwnProperty.call(this.citaParcial, key)) {
      delete this.citaParcial[key];
    }
  },

  notificarCamposRegistrados(camposConfirmados = {}) {
    const claves = Object.keys(camposConfirmados);
    if (!claves.length) return;
    const lineas = claves.map((key) => {
      const campo = this.obtenerCampoConfig(key);
      return `• ${campo.label}: ${camposConfirmados[key]}`;
    });
    this.agregarMensajeWhatsApp('assistant', `Perfecto, anoté:\n${lineas.join('\n')}`);
  },

  capturarDatosDesdeTexto(texto = '') {
    if (!texto) return {};
    const hallazgos = {};
    this.extraerPairsDesdeFormato(texto).forEach(({ label, value }) => {
      const campo = this.obtenerCampoPorEtiqueta(label);
      if (campo && value) {
        hallazgos[campo.key] = value.trim();
      }
    });
    Object.assign(hallazgos, this.extraerDatosBasicos(texto));
    return hallazgos;
  },

  extraerPairsDesdeFormato(texto = '') {
    const parejas = [];
    const regex = /(?:^|[\n\r]|\d+\.\s*)([A-Za-zÁÉÍÓÚÑ0-9 ]{3,})\s*(?:-|→|=>|->|:)\s*([^\n\r]+)/gi;
    let match;
    while ((match = regex.exec(texto)) !== null) {
      parejas.push({ label: match[1].trim(), value: match[2].trim() });
    }
    return parejas;
  },

  extraerDatosBasicos(texto = '') {
    const datos = {};
    const fechaMatch = texto.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
    if (fechaMatch && !this.tieneValorCampo('fecha')) {
      datos.fecha = this.normalizarFecha(fechaMatch);
    }
    const horaMatch =
      texto.match(/(\d{1,2})(?::|h)(\d{2})\s*(am|pm)?/i) || texto.match(/(\d{1,2})\s*(am|pm)/i);
    if (horaMatch && !this.tieneValorCampo('hora')) {
      datos.hora = this.normalizarHora(horaMatch);
    }
    const telefonoMatch = texto.match(/(?:\+?593|0)?[\s-]?(\d{2,3})[\s-]?(\d{3})[\s-]?(\d{3,4})/);
    if (telefonoMatch && !this.tieneValorCampo('cliente_telefono')) {
      datos.cliente_telefono = this.normalizarTelefono(telefonoMatch[0]);
    }
    const placaMatch = texto.match(/\b([A-Z]{3})-?(\d{3,4})\b/i);
    if (placaMatch && !this.tieneValorCampo('vehiculo_placa')) {
      datos.vehiculo_placa = `${placaMatch[1].toUpperCase()}-${placaMatch[2]}`;
    }
    const servicioMatch = texto.match(/servicio(?: de)?[:\s]+([^\n\r]+)/i);
    if (servicioMatch && !this.tieneValorCampo('servicio')) {
      datos.servicio = servicioMatch[1].trim();
    }
    return datos;
  },

  normalizarTelefono(valor = '') {
    return valor.replace(/[^0-9]/g, '').slice(-10);
  },

  normalizarFecha(matchArray) {
    const [, dia, mes, anioRaw] = matchArray;
    let anio = anioRaw;
    if (anio.length === 2) {
      anio = `20${anio}`;
    }
    return `${anio.padStart(4, '0')}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  },

  normalizarHora(matchArray) {
    let hora = parseInt(matchArray[1], 10);
    let minutos = matchArray[2] || '00';
    const meridiano = (matchArray[3] || '').toLowerCase();
    if (meridiano === 'pm' && hora < 12) hora += 12;
    if (meridiano === 'am' && hora === 12) hora = 0;
    return `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  },

  normalizarEntradaManual(key, valor) {
    const texto = (valor || '').toString().trim();
    if (!texto) {
      return { valido: false, error: 'Ese campo no puede quedar vacío.' };
    }

    switch (key) {
      case 'fecha': {
        const iso = this.parseFechaLibre(texto);
        if (!iso) {
          return { valido: false, error: 'Formato de fecha inválido. Usa DD/MM/AAAA.' };
        }
        return { valido: true, valor: iso, display: this.formatearFechaUsuario(iso) };
      }
      case 'hora': {
        const hora = this.parseHoraLibre(texto);
        if (!hora) {
          return { valido: false, error: 'Formato de hora inválido. Usa HH:MM y opcional am/pm.' };
        }
        return { valido: true, valor: hora, display: hora };
      }
      case 'cliente_telefono': {
        const digits = texto.replace(/[^0-9]/g, '');
        if (digits.length < 7) {
          return { valido: false, error: 'El teléfono debe tener al menos 7 dígitos.' };
        }
        return { valido: true, valor: digits, display: this.formatearTelefono(digits) };
      }
      case 'vehiculo_placa': {
        const limpio = texto.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (limpio.length < 6) {
          return { valido: false, error: 'La placa debe tener al menos 6 caracteres.' };
        }
        const placa = `${limpio.slice(0, 3)}-${limpio.slice(3)}`;
        return { valido: true, valor: placa, display: placa };
      }
      default:
        return { valido: true, valor: texto, display: texto };
    }
  },

  parseFechaLibre(texto) {
    if (!texto) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      return texto;
    }
    const match = texto.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (!match) return null;
    let [, dia, mes, anio] = match;
    if (anio.length === 2) {
      anio = `20${anio}`;
    }
    const diaNum = Number(dia);
    const mesNum = Number(mes);
    if (diaNum < 1 || diaNum > 31 || mesNum < 1 || mesNum > 12) {
      return null;
    }
    return `${anio.padStart(4, '0')}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  },

  formatearFechaUsuario(iso) {
    if (!iso || !iso.includes('-')) return iso;
    const [anio, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${anio}`;
  },

  parseHoraLibre(texto) {
    if (!texto) return null;
    const sanitized = texto.toLowerCase().replace(/\s+/g, ' ').trim();
    const match = sanitized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (!match) return null;
    let hora = parseInt(match[1], 10);
    if (Number.isNaN(hora)) return null;
    let minutos = match[2] || '00';
    if (minutos.length === 1) minutos = `0${minutos}`;
    const sufijo = match[3];
    if (sufijo === 'pm' && hora < 12) hora += 12;
    if (sufijo === 'am' && hora === 12) hora = 0;
    if (hora >= 24 || parseInt(minutos, 10) > 59) return null;
    return `${hora.toString().padStart(2, '0')}:${minutos}`;
  },

  formatearTelefono(digits = '') {
    if (!digits) return '';
    if (digits.length === 10) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    if (digits.length === 9) {
      return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    }
    return digits;
  },

  seleccionarContenidoSlot(slot) {
    if (!slot) return;
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(slot);
    selection.removeAllRanges();
    selection.addRange(range);
  },

  focusSlot(slot) {
    if (!slot) return;
    slot.focus();
    setTimeout(() => this.seleccionarContenidoSlot(slot), 10);
  },

  async autoCompletarDesdeBases(camposNuevos = {}) {
    try {
      if (camposNuevos.cliente_nombre && !this.citaParcial.cliente_id) {
        const cliente = await this.buscarClienteSimilar(this.citaParcial.cliente_nombre);
        if (cliente) {
          this.aplicarClienteExistente(cliente, { notificar: true });
        }
      }
      if (
        (camposNuevos.vehiculo_placa ||
          (camposNuevos.vehiculo_marca && camposNuevos.vehiculo_modelo)) &&
        !this.citaParcial.vehiculo_id
      ) {
        const vehiculo = await this.buscarVehiculoSimilar({
          placa: this.citaParcial.vehiculo_placa,
          marca: this.citaParcial.vehiculo_marca,
          modelo: this.citaParcial.vehiculo_modelo,
          clienteId: this.citaParcial.cliente_id,
        });
        if (vehiculo) {
          this.aplicarVehiculoExistente(vehiculo, { notificar: true });
        }
      }
    } catch (error) {
      console.warn('AgendaIAAgent: auto-complete falló', error);
    }
  },

  async buscarClienteSimilar(nombre) {
    if (!nombre) return null;
    const normalized = nombre.toLowerCase();
    const exacto = this.contextoDatos.clientes.find((c) => c.nombre?.toLowerCase() === normalized);
    if (exacto) return exacto;
    const parcial = this.contextoDatos.clientes.find((c) =>
      c.nombre?.toLowerCase().includes(normalized)
    );
    if (parcial) return parcial;
    try {
      const resultados = await this.fetchJson(
        `/api/clientes/buscar?q=${encodeURIComponent(nombre)}`
      );
      return Array.isArray(resultados) && resultados.length ? resultados[0] : null;
    } catch (error) {
      console.warn('AgendaIAAgent: no se pudo buscar cliente remoto', error);
      return null;
    }
  },

  async buscarVehiculoSimilar({ placa, marca, modelo, clienteId } = {}) {
    try {
      if (placa) {
        const local = this.contextoDatos.vehiculos.find(
          (v) => v.placa?.toUpperCase() === placa.toUpperCase()
        );
        if (local) return local;
      }
      const termino = placa || [marca, modelo].filter(Boolean).join(' ');
      if (!termino) return null;
      const resultados = await this.fetchJson(
        `/api/vehiculos/buscar?q=${encodeURIComponent(termino)}${clienteId ? `&clienteId=${clienteId}` : ''}`
      );
      if (Array.isArray(resultados) && resultados.length) {
        return (
          resultados.find((v) => !placa || v.placa?.toUpperCase() === placa.toUpperCase()) ||
          resultados[0]
        );
      }
      return null;
    } catch (error) {
      console.warn('AgendaIAAgent: no se pudo buscar vehículo', error);
      return null;
    }
  },

  aplicarClienteExistente(cliente, opciones = {}) {
    if (!cliente) return;
    this.citaParcial = {
      ...this.citaParcial,
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre || this.citaParcial.cliente_nombre,
      cliente_telefono: cliente.telefono || this.citaParcial.cliente_telefono,
      cliente_cedula: cliente.cedula || this.citaParcial.cliente_cedula,
      cliente_email: cliente.email || this.citaParcial.cliente_email,
      cliente_direccion: cliente.direccion || this.citaParcial.cliente_direccion,
      cliente_ciudad: cliente.ciudad || this.citaParcial.cliente_ciudad,
    };
    this.ultimoClienteReconocido = cliente;
    if (opciones.notificar !== false) {
      this.agregarMensajeWhatsApp(
        'assistant',
        `✨ Encontré a ${cliente.nombre}. Usaré sus datos guardados.`
      );
    }
    if (!opciones.skipVehiculos) {
      this.cargarVehiculosParaCliente(cliente.id);
    }
  },

  async cargarVehiculosParaCliente(clienteId) {
    if (!clienteId) return;
    try {
      const vehiculos = await this.fetchJson(
        `/api/vehiculos?clienteId=${encodeURIComponent(clienteId)}&limit=10`
      );
      if (Array.isArray(vehiculos)) {
        this.contextoDatos.vehiculos = vehiculos;
        if (vehiculos.length === 1 && !this.citaParcial.vehiculo_id) {
          this.aplicarVehiculoExistente(vehiculos[0], { notificar: true });
        }
      }
    } catch (error) {
      console.warn('AgendaIAAgent: no se pudieron cargar vehículos del cliente', error);
    }
  },

  aplicarVehiculoExistente(vehiculo, opciones = {}) {
    if (!vehiculo) return;
    this.citaParcial = {
      ...this.citaParcial,
      vehiculo_id: vehiculo.id,
      vehiculo_marca: vehiculo.marca || this.citaParcial.vehiculo_marca,
      vehiculo_modelo: vehiculo.modelo || this.citaParcial.vehiculo_modelo,
      vehiculo_placa: vehiculo.placa || this.citaParcial.vehiculo_placa,
      vehiculo_color: vehiculo.color || this.citaParcial.vehiculo_color,
      vehiculo_anio: vehiculo.anio || this.citaParcial.vehiculo_anio,
      vehiculo_kilometraje: vehiculo.kilometraje || this.citaParcial.vehiculo_kilometraje,
    };
    this.ultimoVehiculoReconocido = vehiculo;
    if (opciones.notificar !== false) {
      const descripcion = [vehiculo.marca, vehiculo.modelo, vehiculo.placa]
        .filter(Boolean)
        .join(' ');
      this.agregarMensajeWhatsApp(
        'assistant',
        `🚗 Registré ${descripcion.trim()} automáticamente.`
      );
    }
  },

  programarAutoGuardado() {
    if (this.creandoCita || !this.datosCompletosParaCita()) return;
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(async () => {
      this.autoSaveTimer = null;
      if (!this.datosCompletosParaCita()) return;
      this.agregarMensajeWhatsApp(
        'assistant',
        'Perfecto, ya tengo todo. Guardando la cita automáticamente...'
      );
      await this.crearCitaAutomatica();
    }, 800);
  },

  cancelarAutoGuardado() {
    if (!this.autoSaveTimer) return;
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = null;
  },

  async procesarResultadoIA(respuesta) {
    if (!respuesta) {
      this.solicitarDatosPendientes({ prefijo: 'Me ayudas confirmando estos datos:', force: true });
      return;
    }
    if (respuesta.mensaje && respuesta.mensaje.trim()) {
      this.agregarMensajeWhatsApp('assistant', respuesta.mensaje.trim());
    }
    if (
      respuesta.mostrar_pregunta_texto &&
      respuesta.pregunta_siguiente &&
      respuesta.pregunta_siguiente.trim()
    ) {
      this.agregarMensajeWhatsApp('assistant', respuesta.pregunta_siguiente.trim());
    }
    if (respuesta.datos_extraidos) {
      const confirmados = this.registrarCampos(respuesta.datos_extraidos);
      if (Object.keys(confirmados).length) {
        await this.autoCompletarDesdeBases(confirmados);
      }
    }
    const faltantes =
      respuesta.campos_faltantes && respuesta.campos_faltantes.length
        ? respuesta.campos_faltantes
        : this.obtenerCamposPendientes().map((c) => c.key);
    if (!faltantes.length && this.datosCompletosParaCita()) {
      this.programarAutoGuardado();
      return;
    }
    this.solicitarDatosPendientes({
      faltantes,
      prefijo: 'Todavía necesito esto:',
    });
  },

  debeOmitirIA(mensaje = '', confirmadosLocales = {}) {
    if (this.preferirModoManual) {
      return true;
    }
    const clavesNuevas = Object.keys(confirmadosLocales);
    if (!clavesNuevas.length) {
      return false;
    }
    const camposCriticos = [
      'cliente_nombre',
      'cliente_telefono',
      'vehiculo_marca',
      'vehiculo_modelo',
      'servicio',
      'fecha',
      'hora',
    ];
    const cubiertos = camposCriticos.filter(
      (key) => confirmadosLocales[key] || this.tieneValorCampo(key)
    );
    const mensajeDetallado = /cliente|veh[ií]culo|servicio|cita|fecha|hora|tel[eé]fono/i.test(
      mensaje
    );
    return cubiertos.length >= 4 || (mensajeDetallado && clavesNuevas.length >= 2);
  },

  async procesarMensajeUsuario(mensaje) {
    const cambiosLocales = this.capturarDatosDesdeTexto(mensaje);
    const confirmadosLocales = this.registrarCampos(cambiosLocales);
    if (Object.keys(confirmadosLocales).length) {
      this.notificarCamposRegistrados(confirmadosLocales);
      await this.autoCompletarDesdeBases(confirmadosLocales);
    }
    const omitirIA = this.debeOmitirIA(mensaje, confirmadosLocales);
    const respuestaIA = omitirIA
      ? await this.procesarSinIA(mensaje, { modoManual: true })
      : await this.procesarConIA(mensaje);
    await this.procesarResultadoIA(respuestaIA);
  },

  async procesarConIA(mensajeUsuario) {
    if (this.preferirModoManual) {
      return this.procesarSinIA(mensajeUsuario, { modoManual: true, forzado: true });
    }
    try {
      const iaConfig = await this.obtenerConfiguracionIA();
      if (!iaConfig || !iaConfig.apiKey) {
        return await this.procesarSinIA(mensajeUsuario);
      }
      const payload = {
        mensaje: mensajeUsuario,
        citaParcial: this.citaParcial || {},
        negocioId: this.negocioId,
        iaConfig: {
          provider: iaConfig.provider,
          apiKey: iaConfig.apiKey,
          model: iaConfig.model,
        },
        instrucciones_personalizadas: this.prepararInstruccionesIA(),
        chunk_size: this.chunkSize,
        campos_referencia: this.campoOrden,
      };
      if (!window.Auth || typeof Auth.authenticatedFetch !== 'function') {
        throw new Error('Sesión no autenticada para procesar citas');
      }
      const response = await Auth.authenticatedFetch('/api/citas/procesar-ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error del servidor: ${response.status}`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Error procesando con IA');
      }
      const respuestaIA = result.data;
      if (respuestaIA.datos_extraidos) {
        this.registrarCampos(respuestaIA.datos_extraidos);
      }
      if (!respuestaIA.campos_faltantes?.length && this.datosCompletosParaCita()) {
        respuestaIA.campos_faltantes = [];
      }
      return respuestaIA;
    } catch (error) {
      console.error('AgendaIAAgent: error procesando con IA', error);
      return await this.procesarSinIA(mensajeUsuario);
    }
  },

  async obtenerConfiguracionIA() {
    try {
      if (window.IAUnifiedEngine && typeof IAUnifiedEngine.getConfig === 'function') {
        const config = IAUnifiedEngine.getConfig();
        if (config && config.apiKey) return config;
      }
      if (window.CONFIG_IA) {
        return window.CONFIG_IA;
      }
      const guardada = localStorage.getItem('ia_config');
      if (guardada) {
        return JSON.parse(guardada);
      }
    } catch (error) {
      console.warn('AgendaIAAgent: configuración IA inválida', error);
    }
    return null;
  },

  async procesarSinIA(mensajeUsuario, opciones = {}) {
    const datosExtraidos = this.extraerDatosBasicos(mensajeUsuario);
    const confirmados = this.registrarCampos(datosExtraidos);
    if (Object.keys(confirmados).length) {
      await this.autoCompletarDesdeBases(confirmados);
    }
    const faltantes = this.obtenerCamposPendientes().map((c) => c.key);
    const modoManual = opciones.modoManual || this.preferirModoManual;
    let mensajeBase = modoManual
      ? 'Modo preciso activado: estoy usando tus datos textuales sin enviar nada a IA.'
      : 'No tengo IA disponible por ahora, pero sigo registrando cada dato que envíes.';
    if (!faltantes.length && this.datosCompletosParaCita()) {
      mensajeBase += ' Ya cuento con todo para agendar, guardo en unos segundos.';
    } else if (faltantes.length) {
      const camposTexto = faltantes.map((key) => this.obtenerCampoConfig(key).label).join(', ');
      mensajeBase += ` Solo necesito: ${camposTexto}.`;
    }
    const preguntaSiguiente = faltantes.length ? this.construirPreguntaFaltantes(faltantes) : '';
    return {
      mensaje: mensajeBase,
      datos_extraidos: confirmados,
      campos_faltantes: faltantes,
      pregunta_siguiente: preguntaSiguiente,
      modo_manual: modoManual,
      mostrar_pregunta_texto: modoManual && !!preguntaSiguiente,
    };
  },

  construirPreguntaFaltantes(faltantes) {
    const lineas = faltantes.map((key) => {
      const campo = this.obtenerCampoConfig(key);
      return `${campo.label}: `;
    });
    return `Necesito estos datos:\n${lineas.join('\n')}`;
  },

  async crearCitaAutomatica() {
    if (this.creandoCita) return false;
    this.creandoCita = true;
    try {
      const datos = this.citaParcial;
      const payload = {
        cliente_nombre: datos.cliente_nombre || datos.cliente,
        cliente_cedula: datos.cliente_cedula,
        cliente_telefono: datos.cliente_telefono,
        cliente_email: datos.cliente_email,
        cliente_direccion: datos.cliente_direccion,
        cliente_ciudad: datos.cliente_ciudad,
        cliente_id: datos.cliente_id,
        vehiculo_marca: datos.vehiculo_marca || datos.vehiculo?.marca,
        vehiculo_modelo: datos.vehiculo_modelo || datos.vehiculo?.modelo,
        vehiculo_placa: datos.vehiculo_placa || datos.vehiculo?.placa,
        vehiculo_color: datos.vehiculo_color || datos.vehiculo?.color,
        vehiculo_anio: datos.vehiculo_anio || datos.vehiculo?.anio,
        vehiculo_kilometraje: datos.vehiculo_kilometraje,
        vehiculo_vin: datos.vehiculo_vin,
        vehiculo_id: datos.vehiculo_id,
        tipoServicio: datos.tipo_servicio || datos.servicio,
        fecha: datos.fecha,
        hora: datos.hora,
        duracion: datos.duracion_estimada || 60,
        descripcion: datos.servicio || datos.descripcion,
        problema: datos.problema,
        prioridad: datos.prioridad || 'normal',
        tecnicoId: datos.tecnico_id,
        negocioId: this.negocioId,
      };
      if (!window.Auth || typeof Auth.authenticatedFetch !== 'function') {
        throw new Error('Sesión no autenticada para crear citas');
      }
      const response = await Auth.authenticatedFetch('/api/citas/crear-completa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error creando cita: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        const resumen = `${datos.fecha} ${datos.hora} · ${datos.cliente_nombre} · ${datos.vehiculo_marca || ''} ${datos.vehiculo_modelo || ''}`;
        this.agregarMensajeWhatsApp(
          'assistant',
          `✅ Cita guardada: ${resumen}. ¿Deseas agendar otra?`
        );
        this.actualizarCalendarioCitas();
        this.limpiarEstado();
        this.guardarConversacion();
        return true;
      }
      return false;
    } catch (error) {
      console.error('AgendaIAAgent: error creando cita automática', error);
      this.agregarMensajeWhatsApp('assistant', `No pude guardar la cita: ${error.message}`);
      return false;
    } finally {
      this.creandoCita = false;
    }
  },

  actualizarCalendarioCitas() {
    if (!window.Agenda) return;
    try {
      if (Agenda.calendar && typeof Agenda.calendar.refetchEvents === 'function') {
        Agenda.calendar.refetchEvents();
        return;
      }
      if (typeof Agenda.cargarEventos === 'function') {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
        const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString();
        Agenda.cargarEventos(
          { startStr: inicioMes, endStr: finMes },
          () => console.log('AgendaIAAgent: calendario actualizado'),
          (error) => console.warn('AgendaIAAgent: no se pudo refrescar calendario', error)
        );
      }
    } catch (error) {
      console.warn('AgendaIAAgent: error actualizando calendario', error);
    }
  },

  crearChatWhatsApp() {
    if (document.getElementById('whatsappChatContainer')) return;
    const chatContainer = document.createElement('div');
    chatContainer.id = 'whatsappChatContainer';
    chatContainer.className = 'whatsapp-chat-container';
    chatContainer.style.display = 'none';
    chatContainer.setAttribute('data-agent', 'agenda');
    chatContainer.innerHTML = `
            <div class="whatsapp-chat-header">
                <div class="header-left">
                    <div class="back-btn" onclick="AgendaIAAgent.cerrarChatWhatsApp()">
                        <i class="fas fa-arrow-left"></i>
                    </div>
                    <div class="avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="contact-info">
                        <h4>Asistente de Citas</h4>
                        <p class="online-status">
                            <span class="status-dot"></span>
                            En línea
                        </p>
                    </div>
                </div>
                <div class="header-actions">
                    <button class="header-btn" onclick="AgendaIAAgent.limpiarChatWhatsApp()" title="Nueva conversación">
                        <i class="fas fa-redo"></i>
                    </button>
                    <button class="header-btn" onclick="AgendaIAAgent.cerrarChatWhatsApp()" title="Cerrar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="whatsapp-chat-body" id="whatsappChatBody">
                <div class="whatsapp-chat-stream" id="whatsappChatStream"></div>
            </div>
            <div class="whatsapp-chat-footer">
                <div class="input-container" style="position: relative;">
                    <input type="text" 
                        id="whatsappChatInput" 
                        placeholder="Escribe aquí..." 
                        onkeypress="if(event.key==='Enter') AgendaIAAgent.enviarMensajeWhatsApp()"
                        oninput="AgendaIAAgent.manejarAutocompletado(event)">
                    <div id="autocompletadoDropdown" class="autocompletado-dropdown" style="display: none;"></div>
                    <button class="send-btn" onclick="AgendaIAAgent.enviarMensajeWhatsApp()">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="typing-indicator" id="whatsappTyping" style="display: none;">
                    <span></span>
                    <span></span>
                    <span></span>
                    Asistente está escribiendo...
                </div>
            </div>
        `;
    document.body.appendChild(chatContainer);
    this.limpiarChatWhatsApp();
    this.agregarEstilosAutocompletado();
  },

  abrirChatWhatsApp() {
    let chatContainer = document.getElementById('whatsappChatContainer');
    if (!chatContainer) {
      this.crearChatWhatsApp();
      chatContainer = document.getElementById('whatsappChatContainer');
    }
    document
      .querySelectorAll('.whatsapp-chat-assistant, .chat-assistant-window')
      .forEach((chat) => {
        if (chat !== chatContainer) chat.style.display = 'none';
      });
    chatContainer.style.display = 'flex';
    setTimeout(() => {
      const input = document.getElementById('whatsappChatInput');
      if (input) input.focus();
    }, 250);
  },

  cerrarChatWhatsApp() {
    const chatContainer = document.getElementById('whatsappChatContainer');
    if (chatContainer) {
      chatContainer.style.display = 'none';
    }
  },

  limpiarChatWhatsApp() {
    const chatStream = document.getElementById('whatsappChatStream');
    if (chatStream) {
      chatStream.innerHTML = `
                <div class="chat-welcome">
                    <div class="welcome-avatar">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <h3>¡Hola! 👋</h3>
                    <p>Cuéntame los datos de la cita y yo los organizo.</p>
                    <p>Formato recomendado:</p>
                    <pre class="field-slot-guide">Nombre del cliente:<span class="field-slot field-slot-sample" contenteditable="false"></span>
Teléfono de contacto:<span class="field-slot field-slot-sample" contenteditable="false"></span>
Marca del vehículo:<span class="field-slot field-slot-sample" contenteditable="false"></span></pre>
                    <div class="examples-grid">
                        <div class="example-bubble" onclick="AgendaIAAgent.usarEjemploWhatsApp('Nombre del cliente: Juan Pérez\nTeléfono de contacto: 0999999999\nMarca del vehículo: Kia')">
                            "Nombre del cliente"
                        </div>
                        <div class="example-bubble" onclick="AgendaIAAgent.usarEjemploWhatsApp('Servicio requerido: Mantenimiento general\nFecha: 15/06/2024\nHora: 10:00')">
                            "Servicio + fecha + hora"
                        </div>
                        <div class="example-bubble" onclick="AgendaIAAgent.usarEjemploWhatsApp('Vehículo: Toyota Corolla ABC-123\nDescripción: golpeteo en la rueda')">
                            "Vehículo + detalle"
                        </div>
                    </div>
                </div>
            `;
    }
    this.limpiarEstado(true);
    setTimeout(
      () => this.solicitarDatosPendientes({ prefijo: 'Arranquemos con:', force: true }),
      600
    );
  },

  usarEjemploWhatsApp(texto) {
    const input = document.getElementById('whatsappChatInput');
    if (input) {
      input.value = texto;
      input.focus();
    }
  },

  agregarMensajeWhatsApp(tipo, texto, options = {}) {
    const { allowHtml = false, slotGroupId = null } = options;
    const chatStream = document.getElementById('whatsappChatStream');
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
      textWrapper.textContent = texto;
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
      slot.addEventListener('focus', () => this.seleccionarContenidoSlot(slot));
      slot.addEventListener('input', () => {
        slot.classList.remove('slot-error');
        slot.classList.remove('filled');
      });
      slot.addEventListener('blur', () => this.confirmarSlotValor(slot, groupId, container));
    });
    if (slots.length) {
      setTimeout(() => this.focusSlot(slots[0]), 120);
    }
  },

  confirmarSlotValor(slot, groupId, container) {
    if (!slot) return;
    const fieldKey = slot.dataset.fieldSlot;
    const valor = slot.textContent.trim();
    if (!fieldKey) return;
    if (!valor) {
      slot.classList.remove('filled');
      slot.classList.remove('slot-error');
      slot.removeAttribute('title');
      this.eliminarValorCampo(fieldKey);
      return;
    }
    const normalizado = this.normalizarEntradaManual(fieldKey, valor);
    if (!normalizado.valido) {
      slot.classList.add('slot-error');
      if (normalizado.error) {
        this.agregarMensajeWhatsApp('assistant', normalizado.error);
      }
      setTimeout(() => this.focusSlot(slot), 40);
      return;
    }
    slot.classList.remove('slot-error');
    slot.textContent = normalizado.display ?? normalizado.valor;
    slot.setAttribute('title', normalizado.display ?? normalizado.valor);
    const confirmados = this.registrarCampos({ [fieldKey]: normalizado.valor });
    if (Object.keys(confirmados).length) {
      slot.classList.add('filled');
      this.autoCompletarDesdeBases(confirmados);
      if (this.datosCompletosParaCita()) {
        this.programarAutoGuardado();
      }
      const pendienteEnGrupo = Array.from(
        container.querySelectorAll(`[data-slot-group="${groupId}"]`)
      ).some((s) => !s.classList.contains('filled'));
      if (!pendienteEnGrupo) {
        this.ultimaSolicitudKeys = [];
        setTimeout(
          () => this.solicitarDatosPendientes({ prefijo: 'Perfecto, ahora dime:', force: true }),
          320
        );
      }
    }
  },

  async enviarMensajeWhatsApp() {
    const input = document.getElementById('whatsappChatInput');
    if (!input) return;
    const mensaje = input.value.trim();
    if (!mensaje) return;
    this.agregarMensajeWhatsApp('user', mensaje);
    input.value = '';
    this.ocultarAutocompletado();
    const typing = document.getElementById('whatsappTyping');
    if (typing) typing.style.display = 'flex';
    try {
      if (!this.conversacionActual) this.conversacionActual = [];
      this.conversacionActual.push({ role: 'user', content: mensaje });
      await this.procesarMensajeUsuario(mensaje);
      this.guardarConversacion();
    } catch (error) {
      console.error('AgendaIAAgent: error enviando mensaje', error);
      this.agregarMensajeWhatsApp(
        'assistant',
        'Ups, tuve un problema interpretando eso. ¿Puedes decirlo de otra forma?'
      );
    } finally {
      if (typing) typing.style.display = 'none';
    }
  },

  // ============================================
  // AUTOCOMPLETADO DE NOMBRES
  // ============================================
  autocompletadoTimer: null,

  async manejarAutocompletado(event) {
    const input = event.target;
    const texto = input.value.trim();

    // Limpiar timer anterior
    if (this.autocompletadoTimer) {
      clearTimeout(this.autocompletadoTimer);
    }

    // Si el texto es muy corto, ocultar dropdown
    if (texto.length < 2) {
      this.ocultarAutocompletado();
      return;
    }

    // Debounce: esperar 300ms antes de buscar
    this.autocompletadoTimer = setTimeout(async () => {
      await this.buscarClientesParaAutocompletar(texto);
    }, 300);
  },

  async buscarClientesParaAutocompletar(texto) {
    try {
      const resultados = await this.fetchJson(
        `/api/clientes/buscar-nombres?q=${encodeURIComponent(texto)}&limit=5`
      );

      if (resultados.success && resultados.data && resultados.data.length > 0) {
        this.mostrarAutocompletado(resultados.data);
      } else {
        this.ocultarAutocompletado();
      }
    } catch (error) {
      console.warn('Error buscando clientes:', error);
      this.ocultarAutocompletado();
    }
  },

  mostrarAutocompletado(clientes) {
    const dropdown = document.getElementById('autocompletadoDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = clientes
      .map(
        (cliente) => `
            <div class="autocompletado-item" onclick="AgendaIAAgent.seleccionarCliente('${cliente.id}')">
                <div class="autocompletado-nombre">${this.escapeHtml(cliente.nombre)}</div>
                <div class="autocompletado-detalles">
                    ${cliente.telefono ? `<span><i class="fas fa-phone"></i> ${cliente.telefono}</span>` : ''}
                    ${cliente.cedula ? `<span><i class="fas fa-id-card"></i> ${cliente.cedula}</span>` : ''}
                </div>
            </div>
        `
      )
      .join('');

    dropdown.style.display = 'block';
  },

  ocultarAutocompletado() {
    const dropdown = document.getElementById('autocompletadoDropdown');
    if (dropdown) {
      dropdown.style.display = 'none';
    }
  },

  async seleccionarCliente(clienteId) {
    try {
      // Buscar cliente en contexto o fetch
      let cliente = this.contextoDatos.clientes.find((c) => c.id === clienteId);

      if (!cliente) {
        const response = await this.fetchJson(`/api/clientes/${clienteId}`);
        cliente = response.data || response;
      }

      if (cliente) {
        // Aplicar cliente y autocompletar sus datos
        this.aplicarClienteExistente(cliente, { notificar: true });

        // Limpiar input y ocultar dropdown
        const input = document.getElementById('whatsappChatInput');
        if (input) input.value = '';
        this.ocultarAutocompletado();

        // Notificar al usuario
        this.agregarMensajeWhatsApp(
          'assistant',
          `✨ Perfecto! Usé los datos de ${cliente.nombre}.\n\n` +
            `Ahora solo necesito:\n1. Fecha de la cita (DD/MM/AAAA)\n2. Hora (HH:MM)\n3. Servicio requerido`
        );

        // Solicitar solo lo que falta
        const pendientes = this.obtenerCamposPendientes();
        if (pendientes.length > 0) {
          this.solicitarDatosPendientes({
            faltantes: pendientes.map((c) => c.key),
            prefijo: 'Confirma estos datos:',
          });
        }
      }
    } catch (error) {
      console.error('Error seleccionando cliente:', error);
    }
  },

  agregarEstilosAutocompletado() {
    if (document.getElementById('autocompletadoStyles')) return;

    const styles = document.createElement('style');
    styles.id = 'autocompletadoStyles';
    styles.innerHTML = `
            .autocompletado-dropdown {
                position: absolute;
                bottom: 100%;
                left: 0;
                right: 0;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px 8px 0 0;
                max-height: 300px;
                overflow-y: auto;
                box-shadow: 0 -4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
            }
            .autocompletado-item {
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
                transition: background 0.2s;
            }
            .autocompletado-item:hover {
                background: #f5f5f5;
            }
            .autocompletado-item:last-child {
                border-bottom: none;
            }
            .autocompletado-nombre {
                font-weight: 600;
                color: #333;
                margin-bottom: 4px;
            }
            .autocompletado-detalles {
                font-size: 12px;
                color: #666;
                display: flex;
                gap: 12px;
            }
            .autocompletado-detalles span {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .autocompletado-detalles i {
                font-size: 10px;
            }
        `;
    document.head.appendChild(styles);
  },

  // ============================================
  // VERIFICACIÓN DE DISPONIBILIDAD
  // ============================================
  async verificarDisponibilidad(fecha, hora, duracion = 60) {
    try {
      const response = await this.fetchJson(
        `/api/citas/verificar-disponibilidad?fecha=${fecha}&hora=${hora}&duracion=${duracion}`
      );

      if (response.success) {
        return response;
      }

      return { disponible: true, conflictos: [], sugerencias: [] };
    } catch (error) {
      console.warn('Error verificando disponibilidad:', error);
      return { disponible: true, conflictos: [], sugerencias: [] };
    }
  },

  async crearCitaAutomatica() {
    if (this.creandoCita) return false;
    this.creandoCita = true;
    try {
      const datos = this.citaParcial;

      // 🔍 VERIFICAR DISPONIBILIDAD ANTES DE CREAR
      if (datos.fecha && datos.hora) {
        this.agregarMensajeWhatsApp('assistant', '🔍 Verificando disponibilidad...');

        const disponibilidad = await this.verificarDisponibilidad(
          datos.fecha,
          datos.hora,
          datos.duracion_estimada || 60
        );

        if (!disponibilidad.disponible) {
          const conflictosTexto = disponibilidad.conflictos
            .map((c) => `• ${c.hora_inicio} - ${c.cliente} (${c.tipo_servicio})`)
            .join('\n');

          let mensaje = `⚠️ Ya hay citas programadas en ese horario:\n${conflictosTexto}`;

          if (disponibilidad.sugerencias && disponibilidad.sugerencias.length > 0) {
            mensaje +=
              `\n\n📅 Horarios disponibles sugeridos:\n` +
              disponibilidad.sugerencias.map((h) => `• ${h}`).join('\n');
          }

          this.agregarMensajeWhatsApp('assistant', mensaje);
          this.creandoCita = false;
          return false;
        }

        this.agregarMensajeWhatsApp('assistant', '✅ Horario disponible. Guardando cita...');
      }

      const payload = {
        cliente_nombre: datos.cliente_nombre || datos.cliente,
        cliente_cedula: datos.cliente_cedula,
        cliente_telefono: datos.cliente_telefono,
        cliente_email: datos.cliente_email,
        cliente_direccion: datos.cliente_direccion,
        cliente_ciudad: datos.cliente_ciudad,
        cliente_id: datos.cliente_id,
        vehiculo_marca: datos.vehiculo_marca || datos.vehiculo?.marca,
        vehiculo_modelo: datos.vehiculo_modelo || datos.vehiculo?.modelo,
        vehiculo_placa: datos.vehiculo_placa || datos.vehiculo?.placa,
        vehiculo_color: datos.vehiculo_color || datos.vehiculo?.color,
        vehiculo_anio: datos.vehiculo_anio || datos.vehiculo?.anio,
        vehiculo_kilometraje: datos.vehiculo_kilometraje,
        vehiculo_vin: datos.vehiculo_vin,
        vehiculo_id: datos.vehiculo_id,
        tipoServicio: datos.tipo_servicio || datos.servicio,
        fecha: datos.fecha,
        hora: datos.hora,
        duracion: datos.duracion_estimada || 60,
        descripcion: datos.servicio || datos.descripcion,
        problema: datos.problema,
        prioridad: datos.prioridad || 'normal',
        tecnicoId: datos.tecnico_id,
        negocioId: this.negocioId,
      };
      if (!window.Auth || typeof Auth.authenticatedFetch !== 'function') {
        throw new Error('Sesión no autenticada para crear citas');
      }
      const response = await Auth.authenticatedFetch('/api/citas/crear-completa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error creando cita: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        const resumen = `${datos.fecha} ${datos.hora} · ${datos.cliente_nombre} · ${datos.vehiculo_marca || ''} ${datos.vehiculo_modelo || ''}`;
        this.agregarMensajeWhatsApp(
          'assistant',
          `✅ Cita guardada: ${resumen}. ¿Deseas agendar otra?`
        );
        this.actualizarCalendarioCitas();
        this.limpiarEstado();
        this.guardarConversacion();
        return true;
      }
      return false;
    } catch (error) {
      console.error('AgendaIAAgent: error creando cita automática', error);
      this.agregarMensajeWhatsApp('assistant', `No pude guardar la cita: ${error.message}`);
      return false;
    } finally {
      this.creandoCita = false;
    }
  },

  actualizarCalendarioCitas() {
    if (!window.Agenda) return;
    try {
      if (Agenda.calendar && typeof Agenda.calendar.refetchEvents === 'function') {
        Agenda.calendar.refetchEvents();
        return;
      }
      if (typeof Agenda.cargarEventos === 'function') {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
        const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString();
        Agenda.cargarEventos(
          { startStr: inicioMes, endStr: finMes },
          () => console.log('AgendaIAAgent: calendario actualizado'),
          (error) => console.warn('AgendaIAAgent: no se pudo refrescar calendario', error)
        );
      }
    } catch (error) {
      console.warn('AgendaIAAgent: error actualizando calendario', error);
    }
  },
};

AgendaIAAgent.escapeHtml = function (texto = '') {
  return texto
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

window.AgendaIAAgent = AgendaIAAgent;
document.addEventListener('DOMContentLoaded', () => AgendaIAAgent.init());
