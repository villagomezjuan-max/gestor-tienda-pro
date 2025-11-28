/* ========================================
   AGENTE IA PARA REGISTRO DE VEHÍCULOS
   Asistente conversacional para alta automática
   ======================================== */

const VehiculosIAAgent = {
  initialized: false,
  modal: null,
  mensajesContainer: null,
  inputElemento: null,
  typingElemento: null,
  vehiculoParcial: {},
  clientesCache: [],
  esperandoConfirmacion: false,
  procesando: false,
  avisoOfflineMostrado: false,
  config: {
    promptSystem: `Eres VehiculosIA, un asistente experto en registrar vehículos para un taller automotriz.
Responde SIEMPRE con un JSON válido usando la siguiente estructura exacta:
{
    "mensaje": "Texto breve en español para el usuario",
    "datos_extraidos": {
        "cliente": "nombre completo del cliente",
        "clienteId": "id del cliente si ya existe",
        "clienteCedula": "número de cédula/RUC del cliente",
        "clienteTelefono": "teléfono de contacto",
        "clienteEmail": "correo electrónico si se menciona",
        "clienteDireccion": "dirección completa",
        "clienteCiudad": "ciudad o localidad",
        "placa": "placa del vehículo",
        "marca": "marca",
        "modelo": "modelo",
        "anio": "año del vehículo como número",
        "color": "color si se menciona",
        "kilometraje": "kilometraje como número",
        "fechaUltimoServicio": "fecha YYYY-MM-DD si se menciona",
        "notas": "texto adicional relevante"
    },
    "campos_faltantes": ["usa claves como clienteCedula, clienteDireccion, clienteTelefono, placa, marca, modelo, color, anio"],
    "pregunta_siguiente": "Solicita TODOS los datos faltantes en un solo mensaje, por ejemplo: 'Necesito el nombre completo y cédula del cliente, además de la placa, marca y modelo del vehículo'.",
    "sugerencias": ["hasta tres sugerencias cortas opcionales"]
}
Prioriza obtener desde el inicio: nombre completo del cliente, número de cédula/RUC, teléfono, dirección y los datos clave del vehículo (placa, marca, modelo, año, color).
El número VIN solo debe mencionarse si el usuario lo proporciona; no lo solicites de forma proactiva.
Mantén memoria de los datos ya entregados durante la conversación y no los vuelvas a solicitar.
En "mensaje" responde con un tono cercano y profesional, máximo dos frases cortas.
Cuando falten datos imprescindibles, rellena "campos_faltantes" con las claves indicadas y formula en "pregunta_siguiente" una sola petición que enumere todos los datos pendientes para que el usuario los envíe juntos.
Evita pedir un campo a la vez en mensajes separados.
Si ya cuentas con todos los datos requeridos responde con "campos_faltantes" como un arreglo vacío.
No incluyas texto fuera del JSON. Si el usuario pide algo distinto a registrar o actualizar vehículos, recuérdale que solo puedes ayudar con esas tareas.`,
  },

  buildApiUrl(path) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    if (window.Utils && typeof window.Utils.apiUrl === 'function') {
      return window.Utils.apiUrl(normalizedPath);
    }

    if (window.DatabaseAPI && typeof window.DatabaseAPI.getBaseUrl === 'function') {
      const base = (window.DatabaseAPI.getBaseUrl() || '').replace(/\/+$/, '');
      if (base) {
        const finalPath =
          base.endsWith('/api') && normalizedPath.startsWith('/api')
            ? normalizedPath.replace(/^\/api/, '')
            : normalizedPath;
        return `${base}${finalPath}`;
      }
    }

    return normalizedPath;
  },

  async init() {
    if (this.initialized) return;

    if (window.Auth && typeof window.Auth.ready === 'function') {
      await window.Auth.ready();
    }

    this.agregarEstilos();
    this.crearInterfaz();
    this.initialized = true;

    try {
      await this.cargarClientes();
    } catch (error) {
      console.warn('VehiculosIAAgent: no se pudieron cargar clientes durante init().', error);
    }
  },

  agregarEstilos() {
    if (document.getElementById('vehiculosIaStyles')) return;
    const estilos = document.createElement('style');
    estilos.id = 'vehiculosIaStyles';
    estilos.textContent = `
#vehiculosIaModal .header-left .avatar {
    background: linear-gradient(135deg, #0ea5e9, #2563eb);
}

#vehiculosIaModal .chat-welcome .welcome-avatar {
    background: linear-gradient(135deg, #0ea5e9, #2563eb);
}

#vehiculosIaModal .chat-welcome .example-bubble {
    border-color: rgba(14, 165, 233, 0.25);
}

#vehiculosIaModal .chat-welcome .example-bubble:hover {
    background: rgba(14, 165, 233, 0.16);
    border-color: rgba(14, 165, 233, 0.35);
}

.vehiculos-ia-confirmacion {
    display: flex;
    flex-direction: column;
    gap: 14px;
    color: #e9edef;
}

.vehiculos-ia-resumen {
    background: rgba(14, 165, 233, 0.12);
    border: 1px solid rgba(14, 165, 233, 0.25);
    padding: 0.75rem;
    border-radius: 12px;
    line-height: 1.45;
}

.vehiculos-ia-resumen strong {
    color: #38bdf8;
}

.vehiculos-ia-acciones {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.vehiculos-ia-acciones .btn {
    border-radius: 999px;
}

.whatsapp-message .message-meta {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.7;
    margin-bottom: 4px;
}

.whatsapp-message.user .message-meta {
    text-align: right;
    color: rgba(226, 232, 240, 0.85);
}

.whatsapp-message.bot .message-meta {
    color: rgba(125, 211, 252, 0.85);
}
        `;
    document.head.appendChild(estilos);
  },

  crearInterfaz() {
    if (this.modal) return;

    this.modal = document.createElement('div');
    this.modal.id = 'vehiculosIaModal';
    this.modal.className = 'whatsapp-chat-assistant';
    this.modal.style.display = 'none';
    this.modal.innerHTML = `
            <div class="whatsapp-assistant-header">
                <div class="header-left">
                    <div class="back-btn" id="vehiculosIaBack"><i class="fas fa-arrow-left"></i></div>
                    <div class="avatar"><i class="fas fa-car"></i></div>
                    <div class="contact-info">
                        <h4>Gestión de Vehículos</h4>
                        <p class="online-status"><span class="status-dot"></span>En línea</p>
                    </div>
                </div>
                <div class="header-actions">
                    <button class="header-btn" id="vehiculosIaReset" title="Nueva conversación">
                        <i class="fas fa-redo"></i>
                    </button>
                    <button class="header-btn" id="vehiculosIaCerrar" title="Cerrar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="whatsapp-assistant-body" id="vehiculosIaMensajes"></div>
            <div class="whatsapp-assistant-footer">
                <form id="vehiculosIaFormulario" class="input-container">
                    <input type="text" id="vehiculosIaInput" placeholder="Describe el vehículo o responde aquí..." autocomplete="off" />
                    <button type="submit" class="send-btn" id="vehiculosIaEnviar">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </form>
                <div class="typing-indicator" id="vehiculosIaTyping" style="display: none;">
                    <span></span><span></span><span></span>
                    Asistente está escribiendo...
                </div>
            </div>
        `;

    document.body.appendChild(this.modal);

    this.mensajesContainer = this.modal.querySelector('#vehiculosIaMensajes');
    this.inputElemento = this.modal.querySelector('#vehiculosIaInput');
    this.typingElemento = this.modal.querySelector('#vehiculosIaTyping');

    const formulario = this.modal.querySelector('#vehiculosIaFormulario');
    formulario.addEventListener('submit', (e) => {
      e.preventDefault();
      this.enviarMensaje();
    });

    this.modal
      .querySelector('#vehiculosIaCerrar')
      .addEventListener('click', () => this.closeChat());
    this.modal.querySelector('#vehiculosIaBack').addEventListener('click', () => this.closeChat());
    this.modal
      .querySelector('#vehiculosIaReset')
      .addEventListener('click', () => this.resetConversacion());

    this.inputElemento.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.enviarMensaje();
      }
    });
  },

  async openChat() {
    await this.init();
    // Cargamos clientes en segundo plano para no bloquear la apertura del chat
    this.cargarClientes().catch((error) => {
      console.warn('VehiculosIAAgent: no se pudieron cargar los clientes al abrir el chat.', error);
    });
    this.resetConversacion();
    if (this.modal) {
      this.modal.style.display = 'flex';
    }
    if (this.inputElemento) {
      this.inputElemento.focus();
    }
  },

  closeChat() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  },

  resetConversacion() {
    this.vehiculoParcial = {};
    this.esperandoConfirmacion = false;
    if (this.mensajesContainer) {
      this.mensajesContainer.innerHTML = `
                <div class="chat-welcome">
                    <div class="welcome-avatar"><i class="fas fa-car"></i></div>
                    <h3>¡Hola! 👋</h3>
                    <p>Registremos vehículos en segundos.</p>
                    <p>Envíame en un solo mensaje: nombre del cliente, cédula/RUC, teléfono, dirección y los datos del vehículo (placa, marca, modelo, año, color, kilometraje si lo tienes).</p>
                    <div class="examples-grid">
                        <div class="example-bubble">Cliente Juan Pérez, cédula 1234567890, tel 0999999999, dirección Quito, vehículo Toyota Corolla 2022 placa ABC-123 color negro</div>
                        <div class="example-bubble">Registrar camioneta Ford F-150 2019 placa PQR-456 para María Gómez, cédula 0922334455, dirección Guayaquil, teléfono 0988887777</div>
                        <div class="example-bubble">Actualizar datos: Cliente Luis Torres 1717171717, vehículo Nissan Sentra 2018 placa XYZ-890 color gris, kilometraje 85.000 km</div>
                    </div>
                </div>
            `;
    }
    if (this.inputElemento) {
      this.inputElemento.value = '';
    }
    this.ocultarTyping();
  },

  agregarMensaje(texto, tipo = 'bot', origen = null) {
    if (!this.mensajesContainer) return;
    const welcome = this.mensajesContainer.querySelector('.chat-welcome');
    if (welcome) {
      welcome.remove();
    }
    const mensaje = document.createElement('div');
    mensaje.className = `whatsapp-message ${tipo}`;
    const meta = origen ? `<div class="message-meta">${this.escapeHtml(origen)}</div>` : '';
    mensaje.innerHTML = `
            <div class="message-content">
                ${meta}
                <div class="message-text">${this.sanitize(texto)}</div>
            </div>
        `;
    this.mensajesContainer.appendChild(mensaje);
    this.mensajesContainer.scrollTop = this.mensajesContainer.scrollHeight;
  },

  agregarMensajeUsuario(texto) {
    this.agregarMensaje(texto, 'user', 'Tú');
  },

  agregarMensajeIA(texto) {
    this.agregarMensaje(texto, 'bot', 'IA');
  },

  agregarMensajeSistema(texto) {
    this.agregarMensaje(texto, 'bot', 'Sistema');
  },

  notificarModoOffline() {
    if (this.avisoOfflineMostrado) return;
    if (window.Utils && typeof Utils.showToast === 'function') {
      Utils.showToast(
        'Sin conexión con el servidor. El asistente guardará datos en este dispositivo y los sincronizará después.',
        'warning'
      );
    }
    this.avisoOfflineMostrado = true;
  },

  sanitize(texto) {
    return this.escapeHtml(texto).replace(/\n/g, '<br>');
  },

  escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto === null || texto === undefined ? '' : texto;
    return div.innerHTML;
  },

  mostrarTyping() {
    if (this.typingElemento) {
      this.typingElemento.style.display = 'inline-flex';
    }
  },

  ocultarTyping() {
    if (this.typingElemento) {
      this.typingElemento.style.display = 'none';
    }
  },

  async enviarMensaje() {
    if (this.procesando) return;
    const mensaje = (this.inputElemento?.value || '').trim();
    if (!mensaje) return;

    if (this.inputElemento) {
      this.inputElemento.value = '';
    }
    this.agregarMensajeUsuario(mensaje);
    this.esperandoConfirmacion = false;

    try {
      if (!window.IAUnifiedEngine || !IAUnifiedEngine.isConfigured()) {
        throw new Error(
          'El motor de IA no está configurado. Completa la configuración en el panel de IA.'
        );
      }

      this.procesando = true;
      this.mostrarTyping();

      const prompt = this.construirPrompt(mensaje);
      const respuesta = await IAUnifiedEngine.sendMessage(
        prompt,
        this.config.promptSystem,
        'vehiculos'
      );
      const datos = this.parsearRespuesta(respuesta);
      await this.manejarRespuesta(datos, 'IA');
    } catch (error) {
      console.error('VehiculosIAAgent: error procesando mensaje', error);
      const mensajeError = error && error.message ? error.message : 'Ocurrió un error inesperado.';

      // Detectar errores de rate limiting y mostrar mensaje amigable
      if (this.esErrorDeRateLimit(mensajeError)) {
        this.agregarMensajeSistema(
          '⏳ Has alcanzado el límite de consultas de IA por el momento. Espera unos minutos antes de intentar de nuevo. Mientras tanto, puedes continuar usando el formulario manual.'
        );
        if (window.Utils && typeof Utils.showToast === 'function') {
          Utils.showToast('Límite de consultas IA alcanzado. Espera unos minutos.', 'warning');
        }
      } else if (mensajeError.includes('motor de IA no está configurado')) {
        this.agregarMensajeSistema(
          'El asistente IA no está disponible en este momento. Puedes completar el formulario manualmente o reintentar más tarde.'
        );
      } else {
        this.agregarMensajeSistema(
          `No pude procesar la solicitud: ${this.escapeHtml(mensajeError)}`
        );
      }
    } finally {
      this.ocultarTyping();
      this.procesando = false;
    }
  },

  /**
   * Detectar si un mensaje de error es de rate limiting
   */
  esErrorDeRateLimit(mensaje) {
    if (!mensaje || typeof mensaje !== 'string') return false;
    const normalized = mensaje.toLowerCase();
    return (
      normalized.includes('límite de consultas') ||
      normalized.includes('limite de consultas') ||
      normalized.includes('límite de peticiones') ||
      normalized.includes('limite de peticiones') ||
      normalized.includes('rate limit') ||
      normalized.includes('too many requests') ||
      normalized.includes('excedido el límite') ||
      normalized.includes('excedido el limite')
    );
  },

  construirPrompt(mensaje) {
    const partes = [];
    partes.push(`MENSAJE DEL USUARIO:\n${mensaje}`);

    if (Object.keys(this.vehiculoParcial).length > 0) {
      partes.push('DATOS YA RECOPILADOS:');
      partes.push(JSON.stringify(this.vehiculoParcial, null, 2));
    }

    if (this.clientesCache.length > 0) {
      const listado = this.clientesCache
        .slice(0, 15)
        .map((cliente) => {
          const telefono = cliente.telefono ? `, Tel: ${cliente.telefono}` : '';
          return `- ${cliente.nombre} (ID: ${cliente.id}${telefono})`;
        })
        .join('\n');
      partes.push('CLIENTES DISPONIBLES (primeros 15):');
      partes.push(listado);
    }

    partes.push(
      'Devuelve únicamente JSON. Si faltan datos claves como cliente, cédula, dirección, teléfono, placa, marca o modelo, solicítalos en un solo mensaje.'
    );
    return partes.join('\n\n');
  },

  parsearRespuesta(texto) {
    if (!texto) throw new Error('La IA no devolvió respuesta.');
    try {
      return JSON.parse(texto);
    } catch (error) {
      const jsonMatch = texto.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('La respuesta de la IA no es JSON válido.');
    }
  },

  async manejarRespuesta(respuesta, origen = 'IA') {
    if (!respuesta || typeof respuesta !== 'object') {
      this.agregarMensajeSistema('No pude interpretar la respuesta. ¿Puedes reformular?');
      return;
    }

    if (respuesta.mensaje) {
      if (origen === 'IA') {
        this.agregarMensajeIA(respuesta.mensaje);
      } else {
        this.agregarMensajeSistema(respuesta.mensaje);
      }
    }

    if (respuesta.datos_extraidos) {
      this.actualizarVehiculoParcial(respuesta.datos_extraidos);
      await this.resolverCliente(this.vehiculoParcial.cliente);
    }

    const faltantesDesdeIA = Array.isArray(respuesta.campos_faltantes)
      ? respuesta.campos_faltantes
          .map((campo) => this.normalizarCampoFaltante(campo))
          .filter(Boolean)
      : [];
    const faltantesCalculados = this.obtenerCamposFaltantes();
    const faltantes = [...new Set([...faltantesDesdeIA, ...faltantesCalculados])];

    if (faltantes.length > 0) {
      const mensajeIA =
        typeof respuesta.pregunta_siguiente === 'string' ? respuesta.pregunta_siguiente.trim() : '';
      const mensajeCampos = this.redactarSolicitudCampos(faltantes);
      const mensaje = mensajeIA
        ? `${mensajeIA}${mensajeIA.endsWith('.') ? '' : '.'}\n\n${mensajeCampos}`
        : mensajeCampos;
      if (origen === 'IA') {
        this.agregarMensajeIA(mensaje);
      } else {
        this.agregarMensajeSistema(mensaje);
      }
      return;
    }

    this.presentarConfirmacion();
  },

  actualizarVehiculoParcial(datos) {
    const mapaCampos = {
      cliente: 'cliente',
      clienteNombre: 'cliente',
      nombreCliente: 'cliente',
      propietario: 'cliente',
      clienteId: 'clienteId',
      cliente_id: 'clienteId',
      clienteCedula: 'clienteCedula',
      cliente_cedula: 'clienteCedula',
      cedula: 'clienteCedula',
      cedulaCliente: 'clienteCedula',
      documento: 'clienteCedula',
      identificacion: 'clienteCedula',
      identificacionCliente: 'clienteCedula',
      clienteTelefono: 'clienteTelefono',
      telefonoCliente: 'clienteTelefono',
      telefono: 'clienteTelefono',
      celular: 'clienteTelefono',
      clienteEmail: 'clienteEmail',
      emailCliente: 'clienteEmail',
      email: 'clienteEmail',
      correo: 'clienteEmail',
      clienteDireccion: 'clienteDireccion',
      direccionCliente: 'clienteDireccion',
      direccion: 'clienteDireccion',
      clienteCiudad: 'clienteCiudad',
      ciudadCliente: 'clienteCiudad',
      ciudad: 'clienteCiudad',
      clientePais: 'clientePais',
      pais: 'clientePais',
      placa: 'placa',
      placaVehiculo: 'placa',
      matricula: 'placa',
      marca: 'marca',
      modelo: 'modelo',
      anio: 'anio',
      año: 'anio',
      year: 'anio',
      color: 'color',
      vin: 'vin',
      chasis: 'vin',
      kilometraje: 'kilometraje',
      kilometros: 'kilometraje',
      km: 'kilometraje',
      fechaUltimoServicio: 'fechaUltimoServicio',
      fecha_ultimo_servicio: 'fechaUltimoServicio',
      ultimaFechaServicio: 'fechaUltimoServicio',
      notas: 'notas',
      observaciones: 'notas',
    };

    Object.entries(datos).forEach(([clave, valor]) => {
      const campo = mapaCampos[clave];
      if (!campo || valor === undefined || valor === null || valor === '') return;
      if (campo === 'placa' && typeof valor === 'string') {
        this.vehiculoParcial[campo] = valor.trim().toUpperCase();
        return;
      }
      this.vehiculoParcial[campo] = typeof valor === 'string' ? valor.trim() : valor;
    });
  },

  obtenerCamposFaltantes() {
    const faltantes = [];
    const datos = this.vehiculoParcial;
    const nombreCliente = datos.cliente || '';
    const requiereDatosCliente = !datos.clienteId;

    if (requiereDatosCliente && !nombreCliente) {
      faltantes.push('cliente_nombre');
    }
    if (requiereDatosCliente && !datos.clienteCedula) {
      faltantes.push('cliente_cedula');
    }
    if (requiereDatosCliente && !datos.clienteDireccion) {
      faltantes.push('cliente_direccion');
    }
    if (requiereDatosCliente && !datos.clienteTelefono) {
      faltantes.push('cliente_telefono');
    }
    if (requiereDatosCliente && !datos.clienteEmail) {
      faltantes.push('cliente_email');
    }
    if (requiereDatosCliente && !datos.clienteCiudad) {
      faltantes.push('cliente_ciudad');
    }
    if (!datos.placa) {
      faltantes.push('vehiculo_placa');
    }
    if (!datos.marca) {
      faltantes.push('vehiculo_marca');
    }
    if (!datos.modelo) {
      faltantes.push('vehiculo_modelo');
    }
    if (!datos.anio) {
      faltantes.push('vehiculo_anio');
    }
    if (!datos.color) {
      faltantes.push('vehiculo_color');
    }

    return faltantes;
  },

  redactarSolicitudCampos(campos) {
    if (!Array.isArray(campos) || campos.length === 0) {
      return 'Necesito algunos datos adicionales para continuar.';
    }

    const etiquetas = {
      cliente_nombre: 'nombre completo del cliente',
      cliente_cedula: 'número de cédula o RUC del cliente',
      cliente_direccion: 'dirección del cliente',
      cliente_telefono: 'teléfono de contacto',
      cliente_email: 'correo electrónico del cliente',
      cliente_ciudad: 'ciudad del cliente',
      vehiculo_placa: 'placa del vehículo',
      vehiculo_marca: 'marca del vehículo',
      vehiculo_modelo: 'modelo del vehículo',
      vehiculo_anio: 'año del vehículo (si lo tienes)',
      vehiculo_color: 'color del vehículo (si lo tienes)',
    };

    const lista = campos.map((campo) => etiquetas[campo] || campo).filter(Boolean);

    if (lista.length === 0) {
      return 'Necesito los datos del cliente y del vehículo en un solo mensaje para continuar.';
    }

    const textoCampos = lista.join(', ').replace(/, ([^,]+)$/u, ' y $1');

    return `Solo me falta: ${textoCampos}. Envíalo junto, por ejemplo: Cliente Ana López, cédula 0102030405, Quito, 0990001122, Chevrolet Spark 2021 placa ABC-123 color rojo.`;
  },

  normalizarCampoFaltante(campo) {
    if (!campo) return null;
    const texto = campo
      .toString()
      .toLowerCase()
      .replace(/[^a-záéíóúñ0-9]/gi, '');

    if (texto.includes('ced')) return 'cliente_cedula';
    if (texto.includes('nombre')) return 'cliente_nombre';
    if (texto.includes('direccion') || texto.includes('direcc')) return 'cliente_direccion';
    if (texto.includes('tel')) return 'cliente_telefono';
    if (texto.includes('correo') || texto.includes('email')) return 'cliente_email';
    if (texto.includes('ciudad')) return 'cliente_ciudad';
    if (texto.includes('placa') || texto.includes('matricula')) return 'vehiculo_placa';
    if (texto.includes('marca')) return 'vehiculo_marca';
    if (texto.includes('modelo')) return 'vehiculo_modelo';
    if (texto.includes('anio') || texto.includes('ano') || texto.includes('year'))
      return 'vehiculo_anio';
    if (texto.includes('color')) return 'vehiculo_color';
    return null;
  },

  presentarConfirmacion() {
    this.esperandoConfirmacion = true;
    const partesResumen = [
      `<strong>Cliente:</strong> ${this.escapeHtml(this.obtenerNombreCliente())}`,
    ];

    if (this.vehiculoParcial.clienteCedula) {
      partesResumen.push(
        `<strong>Cédula/RUC:</strong> ${this.escapeHtml(this.vehiculoParcial.clienteCedula)}`
      );
    }
    if (this.vehiculoParcial.clienteTelefono) {
      partesResumen.push(
        `<strong>Teléfono:</strong> ${this.escapeHtml(this.vehiculoParcial.clienteTelefono)}`
      );
    }
    if (this.vehiculoParcial.clienteEmail) {
      partesResumen.push(
        `<strong>Email:</strong> ${this.escapeHtml(this.vehiculoParcial.clienteEmail)}`
      );
    }
    if (this.vehiculoParcial.clienteDireccion) {
      partesResumen.push(
        `<strong>Dirección:</strong> ${this.escapeHtml(this.vehiculoParcial.clienteDireccion)}`
      );
    }
    if (this.vehiculoParcial.clienteCiudad) {
      partesResumen.push(
        `<strong>Ciudad:</strong> ${this.escapeHtml(this.vehiculoParcial.clienteCiudad)}`
      );
    }

    partesResumen.push(
      `<strong>Placa:</strong> ${this.escapeHtml(this.vehiculoParcial.placa || '')}`,
      `<strong>Marca:</strong> ${this.escapeHtml(this.vehiculoParcial.marca || '')}`,
      `<strong>Modelo:</strong> ${this.escapeHtml(this.vehiculoParcial.modelo || '')}`
    );

    if (this.vehiculoParcial.anio) {
      partesResumen.push(`<strong>Año:</strong> ${this.escapeHtml(this.vehiculoParcial.anio)}`);
    }
    if (this.vehiculoParcial.color) {
      partesResumen.push(`<strong>Color:</strong> ${this.escapeHtml(this.vehiculoParcial.color)}`);
    }
    if (this.vehiculoParcial.kilometraje) {
      partesResumen.push(
        `<strong>Kilometraje:</strong> ${this.escapeHtml(this.vehiculoParcial.kilometraje)}`
      );
    }
    if (this.vehiculoParcial.fechaUltimoServicio) {
      partesResumen.push(
        `<strong>Último servicio:</strong> ${this.escapeHtml(this.vehiculoParcial.fechaUltimoServicio)}`
      );
    }
    if (this.vehiculoParcial.notas) {
      const notas = this.escapeHtml(this.vehiculoParcial.notas).replace(/\n/g, '<br>');
      partesResumen.push(`<strong>Notas:</strong> ${notas}`);
    }

    const resumen = partesResumen.join('<br>');

    if (!this.mensajesContainer) {
      this.esperandoConfirmacion = false;
      return;
    }

    const welcome = this.mensajesContainer.querySelector('.chat-welcome');
    if (welcome) {
      welcome.remove();
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'whatsapp-message bot';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    meta.textContent = 'Sistema';
    messageContent.appendChild(meta);

    const contenedor = document.createElement('div');
    contenedor.className = 'vehiculos-ia-confirmacion';
    contenedor.innerHTML = `
            <p>¿Deseas registrar este vehículo con los datos detectados?</p>
            <div class="vehiculos-ia-resumen">${resumen}</div>
            <div class="vehiculos-ia-acciones">
                <button class="btn btn-success" id="vehiculosIaConfirmar"><i class="fas fa-check"></i> Confirmar</button>
                <button class="btn btn-secondary" id="vehiculosIaAjustar"><i class="fas fa-edit"></i> Ajustar datos</button>
            </div>
        `;

    messageContent.appendChild(contenedor);
    wrapper.appendChild(messageContent);
    this.mensajesContainer.appendChild(wrapper);
    this.mensajesContainer.scrollTop = this.mensajesContainer.scrollHeight;

    contenedor
      .querySelector('#vehiculosIaConfirmar')
      .addEventListener('click', () => this.confirmarRegistro());
    contenedor.querySelector('#vehiculosIaAjustar').addEventListener('click', () => {
      this.esperandoConfirmacion = false;
      this.agregarMensajeSistema('Entendido, dime qué dato quieres corregir.');
    });
  },

  async garantizarClienteRegistrado() {
    if (this.vehiculoParcial.clienteId) {
      return {
        creado: false,
        clienteId: this.vehiculoParcial.clienteId,
        nombre: this.obtenerNombreCliente(),
        sincronizado: true,
      };
    }

    const nombre = this.vehiculoParcial.cliente;
    const cedula = this.vehiculoParcial.clienteCedula;

    if (!nombre || !cedula) {
      throw new Error(
        'Necesito el nombre completo y la cédula/RUC del cliente para registrarlo automáticamente.'
      );
    }

    const cedulaNormalizada = this.normalizarCedula(cedula);
    if (cedulaNormalizada) {
      const existente = this.clientesCache.find(
        (cliente) => this.normalizarCedula(cliente.cedula) === cedulaNormalizada
      );
      if (existente) {
        this.completarDatosCliente(existente);
        return {
          creado: false,
          clienteId: existente.id,
          nombre: existente.nombre,
          sincronizado: true,
        };
      }
    }

    const nuevoCliente = {
      nombre,
      cedula,
      telefono: this.vehiculoParcial.clienteTelefono || '',
      email: this.vehiculoParcial.clienteEmail || '',
      direccion: this.vehiculoParcial.clienteDireccion || '',
      ciudad: this.vehiculoParcial.clienteCiudad || '',
      categoria: 'Regular',
      notas: 'Registrado automáticamente desde Vehículos IA',
      activo: 1,
    };

    let resultado = null;
    let sincronizado = false;

    try {
      if (!window.Auth || typeof window.Auth.authenticatedFetch !== 'function') {
        throw new Error('Auth.authenticatedFetch no está disponible.');
      }
      const endpoint = this.buildApiUrl('/api/clientes');
      const response = await window.Auth.authenticatedFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoCliente),
      });

      const json = await response.json().catch(() => null);
      resultado = json;

      if (response.ok && json?.success) {
        sincronizado = true;
      } else if (json?.message) {
        console.warn('VehiculosIAAgent: backend rechazó creación de cliente', json.message);
      }
    } catch (error) {
      console.warn('VehiculosIAAgent: error creando cliente automáticamente', error);
    }

    const idServidor =
      resultado?.id || resultado?.cliente_id || resultado?.cliente?.id || resultado?.data?.id;
    const clienteId = idServidor || this.generarId('cli');
    const timestamp = new Date().toISOString();

    const clienteLocal = {
      id: clienteId,
      nombre: nuevoCliente.nombre,
      cedula: nuevoCliente.cedula,
      telefono: nuevoCliente.telefono,
      email: nuevoCliente.email,
      direccion: nuevoCliente.direccion,
      ciudad: nuevoCliente.ciudad,
      categoria: nuevoCliente.categoria,
      notas: nuevoCliente.notas,
      activo: true,
      sincronizado_backend: sincronizado,
      totalComprado: 0,
      numeroCompras: 0,
      ticketPromedio: 0,
      saldoPendiente: 0,
      ultimaCompra: null,
      limiteCredito: 0,
      pais: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const clientesLocales = Database.getCollection('clientes') || [];
    const existenteLocal = clientesLocales.find((c) => c.id === clienteLocal.id);

    let clienteFinal = { ...clienteLocal };

    if (existenteLocal) {
      Database.update('clientes', existenteLocal.id, clienteLocal);
      clienteFinal = { ...existenteLocal, ...clienteLocal };
    } else {
      Database.add('clientes', clienteLocal);
    }

    this.completarDatosCliente(clienteFinal);

    if (!Array.isArray(this.clientesCache)) {
      this.clientesCache = [];
    }

    const indiceCache = this.clientesCache.findIndex((c) => c.id === clienteFinal.id);
    if (indiceCache === -1) {
      this.clientesCache.push(clienteFinal);
    } else {
      this.clientesCache[indiceCache] = { ...this.clientesCache[indiceCache], ...clienteFinal };
    }

    return {
      creado: true,
      clienteId: clienteFinal.id,
      nombre: clienteFinal.nombre,
      sincronizado,
    };
  },

  async confirmarRegistro() {
    if (this.procesando) return;
    if (!window.Vehiculos || typeof Vehiculos.crearVehiculoAutomatizado !== 'function') {
      this.agregarMensajeSistema(
        'No pude acceder al módulo de vehículos. Verifica que esté cargado.'
      );
      return;
    }

    const faltantesPrevios = this.obtenerCamposFaltantes();
    if (faltantesPrevios.length > 0) {
      this.agregarMensajeSistema(this.redactarSolicitudCampos(faltantesPrevios));
      this.esperandoConfirmacion = false;
      return;
    }

    try {
      this.procesando = true;
      this.mostrarTyping();

      const resultadoCliente = await this.garantizarClienteRegistrado();

      const payload = {
        clienteId: this.vehiculoParcial.clienteId,
        marca: this.vehiculoParcial.marca,
        modelo: this.vehiculoParcial.modelo,
        anio: this.vehiculoParcial.anio,
        color: this.vehiculoParcial.color,
        placa: this.vehiculoParcial.placa,
        vin: this.vehiculoParcial.vin,
        kilometraje: this.vehiculoParcial.kilometraje,
        fechaUltimoServicio: this.vehiculoParcial.fechaUltimoServicio,
        notas: this.vehiculoParcial.notas,
        clienteNombre: this.obtenerNombreCliente(),
      };

      if (!payload.clienteId || !payload.placa || !payload.marca || !payload.modelo) {
        this.ocultarTyping();
        this.agregarMensajeSistema(
          'Faltan datos clave para registrar el vehículo. Aclaremos esos detalles.'
        );
        this.esperandoConfirmacion = false;
        return;
      }

      const resultadoVehiculo = await Vehiculos.crearVehiculoAutomatizado(payload, {
        mostrarNotificacion: false,
      });
      this.ocultarTyping();

      let mensaje = resultadoVehiculo?.localOnly
        ? 'Listo, el vehículo quedó registrado en la base de datos local. Se sincronizará automáticamente cuando la conexión se restablezca.'
        : 'Listo, el vehículo quedó registrado en la base de datos.';

      if (resultadoCliente?.creado) {
        if (resultadoCliente.sincronizado === false) {
          mensaje += ` También guardé al cliente ${this.escapeHtml(this.obtenerNombreCliente())} en modo sin conexión.`;
        } else {
          mensaje += ` También registré al cliente ${this.escapeHtml(this.obtenerNombreCliente())}.`;
        }
      }

      if (resultadoVehiculo?.localOnly && window.Utils && typeof Utils.showToast === 'function') {
        Utils.showToast(
          'Vehículo guardado localmente. Se sincronizará al recuperar la conexión.',
          'warning'
        );
      }

      if (
        resultadoCliente?.creado &&
        resultadoCliente.sincronizado === false &&
        window.Utils &&
        typeof Utils.showToast === 'function'
      ) {
        Utils.showToast(
          'Cliente guardado localmente. Se sincronizará al recuperar la conexión.',
          'warning'
        );
      }
      this.agregarMensajeSistema(mensaje);
      this.resetConversacion();
    } catch (error) {
      this.ocultarTyping();
      this.agregarMensajeSistema(`No pude registrar el vehículo: ${error.message}`);
    } finally {
      this.procesando = false;
      this.esperandoConfirmacion = false;
    }
  },

  async cargarClientes(force = false) {
    if (this.clientesCache.length > 0 && !force) return;
    try {
      if (!window.Auth || typeof window.Auth.authenticatedFetch !== 'function') {
        throw new Error('Auth.authenticatedFetch no está disponible.');
      }
      const endpoint = this.buildApiUrl('/api/clientes');
      const response = await window.Auth.authenticatedFetch(endpoint);

      if (!response.ok) throw new Error('Respuesta no válida');
      const data = await response.json();
      if (Array.isArray(data)) {
        this.clientesCache = data;
        return;
      }
    } catch (error) {
      console.warn(
        'VehiculosIAAgent: no se pudo sincronizar clientes, se usará caché local.',
        error
      );
      this.notificarModoOffline();
    }
    this.clientesCache = Database.getCollection('clientes') || [];
  },

  async resolverCliente(nombre) {
    const cedula = this.vehiculoParcial.clienteCedula;
    if (cedula) {
      const coincidenciaCedula = this.clientesCache.find(
        (cliente) => this.normalizarCedula(cliente.cedula) === this.normalizarCedula(cedula)
      );
      if (coincidenciaCedula) {
        this.completarDatosCliente(coincidenciaCedula);
        return;
      }
    }

    if (!nombre) return;
    const normalizado = this.normalizarTexto(nombre);
    if (!normalizado) return;

    const coincidencia = this.clientesCache.find(
      (cliente) => this.normalizarTexto(cliente.nombre) === normalizado
    );
    if (coincidencia) {
      this.completarDatosCliente(coincidencia);
      return;
    }

    const parcial = this.clientesCache.find((cliente) =>
      this.normalizarTexto(cliente.nombre).includes(normalizado)
    );
    if (parcial) {
      this.completarDatosCliente(parcial);
    }
  },

  obtenerNombreCliente() {
    if (this.vehiculoParcial.cliente) return this.vehiculoParcial.cliente;
    const cliente = this.clientesCache.find((c) => c.id === this.vehiculoParcial.clienteId);
    return cliente ? cliente.nombre : 'No identificado';
  },

  completarDatosCliente(cliente) {
    if (!cliente) return;
    this.vehiculoParcial.clienteId = cliente.id;
    this.vehiculoParcial.cliente = cliente.nombre || this.vehiculoParcial.cliente;
    if (cliente.cedula && !this.vehiculoParcial.clienteCedula) {
      this.vehiculoParcial.clienteCedula = cliente.cedula;
    }
    if (cliente.telefono && !this.vehiculoParcial.clienteTelefono) {
      this.vehiculoParcial.clienteTelefono = cliente.telefono;
    }
    if (cliente.email && !this.vehiculoParcial.clienteEmail) {
      this.vehiculoParcial.clienteEmail = cliente.email;
    }
    if (cliente.direccion && !this.vehiculoParcial.clienteDireccion) {
      this.vehiculoParcial.clienteDireccion = cliente.direccion;
    }
    if (cliente.ciudad && !this.vehiculoParcial.clienteCiudad) {
      this.vehiculoParcial.clienteCiudad = cliente.ciudad;
    }
  },

  generarId(prefijo = 'tmp') {
    const aleatorio = Math.random().toString(36).slice(2, 8);
    return `${prefijo}_${Date.now()}_${aleatorio}`;
  },

  normalizarCedula(valor) {
    return (valor || '').toString().replace(/[^0-9]/g, '');
  },

  normalizarTexto(texto) {
    return (texto || '')
      .toString()
      .normalize('NFD')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  },
};

window.VehiculosIAAgent = VehiculosIAAgent;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => VehiculosIAAgent.init());
} else {
  VehiculosIAAgent.init();
}
