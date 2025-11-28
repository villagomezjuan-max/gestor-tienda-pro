// ============================================
// MÓDULO: CONFIGURACIÓN DE TIPO DE TIENDA
// ============================================
// Este módulo maneja la configuración del tipo de tienda
// y las categorías de productos según el negocio

const ConfigTienda = {
  // Definición de tipos de tienda con sus categorías predefinidas
  tiposTienda: {
    abarrotes: {
      nombre: '🛒 Tienda de Abarrotes/Supermercado',
      icono: '🛒',
      categorias: [
        'Alimentos y Bebidas',
        'Lácteos y Embutidos',
        'Limpieza y Hogar',
        'Higiene Personal',
        'Snacks y Dulces',
        'Bebidas Alcohólicas',
        'Panadería y Repostería',
        'Frutas y Verduras',
        'Carnes y Pescados',
        'Otros',
      ],
    },
    electronica: {
      nombre: '💻 Tienda de Electrónica',
      icono: '💻',
      categorias: [
        'Computadoras y Laptops',
        'Celulares y Tablets',
        'Accesorios Tecnológicos',
        'Audio y Video',
        'Gaming',
        'Cámaras y Fotografía',
        'Componentes PC',
        'Cables y Conectores',
        'Almacenamiento',
        'Otros',
      ],
    },
    ropa: {
      nombre: '👕 Tienda de Ropa y Accesorios',
      icono: '👕',
      categorias: [
        'Ropa Hombre',
        'Ropa Mujer',
        'Ropa Niños',
        'Calzado',
        'Accesorios y Joyería',
        'Bolsos y Carteras',
        'Ropa Deportiva',
        'Ropa Interior',
        'Relojes',
        'Otros',
      ],
    },
    ferreteria: {
      nombre: '🔧 Ferretería y Construcción',
      icono: '🔧',
      categorias: [
        'Herramientas Manuales',
        'Herramientas Eléctricas',
        'Materiales de Construcción',
        'Pinturas y Acabados',
        'Plomería',
        'Electricidad',
        'Jardín y Exterior',
        'Cerrajería',
        'Seguridad',
        'Otros',
      ],
    },
    farmacia: {
      nombre: '💊 Farmacia',
      icono: '💊',
      categorias: [
        'Medicamentos',
        'Productos de Belleza',
        'Higiene Personal',
        'Vitaminas y Suplementos',
        'Primeros Auxilios',
        'Productos Naturales',
        'Bebés',
        'Cuidado Adulto Mayor',
        'Ortopedia',
        'Otros',
      ],
    },
    libreria: {
      nombre: '📚 Librería y Papelería',
      icono: '📚',
      categorias: [
        'Libros y Revistas',
        'Útiles Escolares',
        'Material de Oficina',
        'Arte y Manualidades',
        'Tecnología',
        'Mochilas y Loncheras',
        'Juguetes Educativos',
        'Calendarios y Agendas',
        'Papelería Fina',
        'Otros',
      ],
    },
    restaurante: {
      nombre: '🍔 Restaurante/Cafetería',
      icono: '🍔',
      categorias: [
        'Entradas y Aperitivos',
        'Platos Principales',
        'Postres',
        'Bebidas Frías',
        'Bebidas Calientes',
        'Combos y Menús',
        'Para Llevar',
        'Desayunos',
        'Snacks',
        'Otros',
      ],
    },
    taller: {
      nombre: '🚗 Taller Mecánico/Servicios',
      icono: '🚗',
      categorias: [
        'Servicios',
        'Repuestos',
        'Lubricantes y Fluidos',
        'Accesorios',
        'Llantas',
        'Baterías',
        'Mantenimiento Preventivo',
        'Reparación de Motor',
        'Sistema de Frenos',
        'Suspensión y Dirección',
        'Sistema Eléctrico',
        'Aire Acondicionado',
        'Transmisión',
        'Chapa y Pintura',
        'Diagnóstico',
        'Otros',
      ],
    },
    personalizada: {
      nombre: '🎨 Tienda Personalizada',
      icono: '🎨',
      categorias: ['Categoría 1', 'Categoría 2', 'Categoría 3', 'Otros'],
    },
  },

  // ============================================
  // INICIALIZAR CONFIGURACIÓN
  // ============================================
  init() {
    console.log('🏪 Inicializando ConfigTienda... (Módulo antiguo)');

    // NOTA: La lógica de este wizard ha sido migrada a `initial-setup-wizard.js`
    // para centralizar y mejorar el proceso de configuración inicial.
    // Se deja este archivo por si hay referencias antiguas, pero la funcionalidad
    // principal de configuración inicial ya no se dispara desde aquí.

    const configExistente = Database.get('configuracion'); // Usar la nueva clave de config

    if (!configExistente || !configExistente.inicializado) {
      console.log(
        'INFO: El nuevo asistente (initial-setup-wizard.js) se encargará de la configuración.'
      );
      // this.mostrarWizardConfiguracion(); // -> Desactivado para evitar duplicados
    } else {
      console.log(`✅ Configuración cargada para: ${configExistente.nombreNegocio}`);
    }
  },

  // ============================================
  // MOSTRAR WIZARD DE CONFIGURACIÓN INICIAL (DESACTIVADO)
  // ============================================
  mostrarWizardConfiguracion() {
    console.warn(
      'ADVERTENCIA: Se ha intentado llamar a `mostrarWizardConfiguracion` desde `config-tienda.js` (obsoleto).'
    );
    console.warn(
      'La configuración inicial ahora es manejada exclusivamente por `initial-setup-wizard.js`.'
    );

    // La siguiente línea previene que el wizard antiguo se muestre.
    return;

    /* CÓDIGO DEL WIZARD ANTIGUO DESACTIVADO
    const html = `
      <div class="wizard-overlay" id="wizardConfiguracion">
        ... (código del wizard antiguo) ...
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    */
  },

  // Variables temporales del wizard
  pasoActual: 1,
  tipoSeleccionado: null,
  categoriasTemp: [],

  // ============================================
  // NAVEGACIÓN DEL WIZARD
  // ============================================
  siguientePaso() {
    // Validar paso actual antes de continuar
    if (this.pasoActual === 1) {
      if (!this.tipoSeleccionado) {
        Utils.showToast('Por favor selecciona un tipo de tienda', 'warning');
        return;
      }
      // Cargar categorías del tipo seleccionado
      this.categoriasTemp = [...this.tiposTienda[this.tipoSeleccionado].categorias];
    } else if (this.pasoActual === 2) {
      const nombreNegocio = document.getElementById('nombreNegocio').value.trim();
      if (!nombreNegocio) {
        Utils.showToast('Por favor ingresa el nombre del negocio', 'warning');
        return;
      }
    }

    this.pasoActual++;
    this.actualizarWizard();
  },

  anteriorPaso() {
    this.pasoActual--;
    this.actualizarWizard();
  },

  actualizarWizard() {
    // Ocultar todos los pasos
    document.querySelectorAll('.wizard-step').forEach((step) => {
      step.style.display = 'none';
    });

    // Mostrar paso actual
    document.getElementById(`step${this.pasoActual}`).style.display = 'block';

    // Actualizar botones
    const btnAnterior = document.getElementById('btnAnterior');
    const btnSiguiente = document.getElementById('btnSiguiente');
    const btnFinalizar = document.getElementById('btnFinalizar');

    btnAnterior.style.display = this.pasoActual > 1 ? 'inline-block' : 'none';
    btnSiguiente.style.display = this.pasoActual < 3 ? 'inline-block' : 'none';
    btnFinalizar.style.display = this.pasoActual === 3 ? 'inline-block' : 'none';

    // Si es el paso 3, mostrar categorías
    if (this.pasoActual === 3) {
      this.renderizarCategorias();
    }
  },

  // ============================================
  // GESTIÓN DE CATEGORÍAS
  // ============================================
  renderizarCategorias() {
    const listaCategorias = document.getElementById('listaCategorias');
    listaCategorias.innerHTML = this.categoriasTemp
      .map(
        (cat, index) => `
      <div class="categoria-item">
        <i class="fas fa-grip-vertical"></i>
        <span>${cat}</span>
        <button type="button" class="btn-icon btn-danger" onclick="ConfigTienda.eliminarCategoria(${index})" ${cat === 'Otros' ? 'disabled' : ''}>
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `
      )
      .join('');
  },

  agregarCategoria() {
    const input = document.getElementById('nuevaCategoria');
    const nombreCategoria = input.value.trim();

    if (!nombreCategoria) {
      Utils.showToast('Ingresa un nombre para la categoría', 'warning');
      return;
    }

    if (this.categoriasTemp.includes(nombreCategoria)) {
      Utils.showToast('Esta categoría ya existe', 'warning');
      return;
    }

    // Agregar antes de "Otros"
    const indexOtros = this.categoriasTemp.indexOf('Otros');
    if (indexOtros !== -1) {
      this.categoriasTemp.splice(indexOtros, 0, nombreCategoria);
    } else {
      this.categoriasTemp.push(nombreCategoria);
    }

    input.value = '';
    this.renderizarCategorias();
    Utils.showToast('Categoría agregada', 'success');
  },

  eliminarCategoria(index) {
    const categoria = this.categoriasTemp[index];
    if (categoria === 'Otros') {
      Utils.showToast('No se puede eliminar la categoría "Otros"', 'warning');
      return;
    }

    this.categoriasTemp.splice(index, 1);
    this.renderizarCategorias();
    Utils.showToast('Categoría eliminada', 'success');
  },

  // ============================================
  // FINALIZAR CONFIGURACIÓN
  // ============================================
  finalizarConfiguracion() {
    try {
      const nombreNegocio = document.getElementById('nombreNegocio').value.trim();
      const ruc = document.getElementById('rucNegocio').value.trim();
      const telefono = document.getElementById('telefonoNegocio').value.trim();
      const email = document.getElementById('emailNegocio').value.trim();
      const direccion = document.getElementById('direccionNegocio').value.trim();
      const ciudad = document.getElementById('ciudadNegocio').value.trim();
      const pais = document.getElementById('paisNegocio').value.trim();

      if (!this.tipoSeleccionado || !this.tiposTienda[this.tipoSeleccionado]) {
        Utils.showToast(
          'Error: Tipo de tienda no válido. Por favor, retrocede al paso 1.',
          'error'
        );
        return;
      }

      if (!nombreNegocio) {
        Utils.showToast(
          'Error: El nombre del negocio es requerido. Por favor, retrocede al paso 2.',
          'error'
        );
        return;
      }

      // Crear objeto de configuración
      const configuracion = {
        tipoTienda: this.tipoSeleccionado,
        nombreTipoTienda: this.tiposTienda[this.tipoSeleccionado].nombre,
        nombreTienda: nombreNegocio,
        ruc: ruc,
        telefono: telefono,
        email: email,
        direccion: direccion,
        ciudad: ciudad,
        pais: pais,
        categorias: this.categoriasTemp,
        fechaConfiguracion: new Date().toISOString(),
        configurado: true,
      };

      // Guardar en database
      Database.set('configTienda', configuracion);

      console.log('✅ Configuración guardada:', configuracion);
      Utils.showToast('¡Configuración completada exitosamente!', 'success');

      // Cerrar wizard
      setTimeout(() => {
        const wizard = document.getElementById('wizardConfiguracion');
        if (wizard) {
          wizard.remove();
        }
        // NOTA: En este caso SÍ es necesario recargar porque cambia la configuración
        // fundamental de la aplicación (tipo de tienda, categorías, moneda, etc.)
        location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error al finalizar la configuración:', error);
      Utils.showToast(
        'Se produjo un error al guardar la configuración. Inténtalo de nuevo.',
        'error'
      );
    }
  },

  // ============================================
  // OBTENER CONFIGURACIÓN ACTUAL
  // ============================================
  getConfig() {
    return Database.get('configTienda') || null;
  },

  getCategorias() {
    const config = this.getConfig();
    return config ? config.categorias : ['Otros'];
  },

  getTipoTienda() {
    const config = this.getConfig();
    return config ? config.tipoTienda : null;
  },

  getNombreTienda() {
    const config = this.getConfig();
    return config ? config.nombreTienda : 'Mi Tienda';
  },

  // ============================================
  // ACTUALIZAR CONFIGURACIÓN
  // ============================================
  actualizarConfig(nuevaConfig) {
    const configActual = this.getConfig();
    if (!configActual) {
      console.error('No hay configuración para actualizar');
      return false;
    }

    const configActualizada = {
      ...configActual,
      ...nuevaConfig,
      fechaActualizacion: new Date().toISOString(),
    };

    Database.set('configTienda', configActualizada);
    Utils.showToast('Configuración actualizada', 'success');
    return true;
  },

  // ============================================
  // CAMBIAR TIPO DE TIENDA
  // ============================================
  cambiarTipoTienda(nuevoTipo) {
    if (!this.tiposTienda[nuevoTipo]) {
      console.error('Tipo de tienda no válido');
      return false;
    }

    const confirmar = confirm(
      '¿Estás seguro de cambiar el tipo de tienda?\n\n' +
        'Esto ajustará categorías, sugerencias de servicios y otras preferencias recomendadas para el nuevo tipo.'
    );

    if (!confirmar) {
      return false;
    }

    const configActual = this.getConfig();
    if (!configActual) {
      console.error('No hay configuración existente para actualizar');
      return false;
    }

    const tipoConfig = this.tiposTienda[nuevoTipo];
    const configActualizada = {
      ...configActual,
      tipoTienda: nuevoTipo,
      nombreTipoTienda: tipoConfig.nombre,
      categorias: Array.isArray(tipoConfig.categorias)
        ? [...tipoConfig.categorias]
        : configActual.categorias || [],
      servicios: Array.isArray(tipoConfig.servicios)
        ? [...tipoConfig.servicios]
        : configActual.servicios || [],
      fechaActualizacion: new Date().toISOString(),
    };

    Database.set('configTienda', configActualizada);
    Utils.showToast('Tipo de tienda actualizado', 'success');
    return true;
  },

  // ============================================
  // RENDERIZAR VISTA DE CONFIGURACIÓN
  // ============================================
  render() {
    const config = this.getConfig();

    if (!config) {
      return `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i>
          No hay configuración de tienda. Por favor configura tu tienda primero.
          <button class="btn btn-primary" onclick="ConfigTienda.mostrarWizardConfiguracion()">
            Configurar Ahora
          </button>
        </div>
      `;
    }

    const html = `
      <div class="config-tienda-container">
        <div class="page-header">
          <h2><i class="fas fa-cog"></i> Configuración de Tienda</h2>
        </div>

        <div class="config-sections">
          <!-- Información del Negocio -->
          <div class="config-section">
            <h3><i class="fas fa-store"></i> Información del Negocio</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Tipo de Tienda:</label>
                <div class="info-value">
                  ${config.nombreTipoTienda}
                  <button class="btn btn-sm btn-secondary" onclick="ConfigTienda.mostrarCambiarTipo()">
                    <i class="fas fa-edit"></i> Cambiar
                  </button>
                </div>
              </div>
              <div class="info-item">
                <label>Nombre del Negocio:</label>
                <div class="info-value">${config.nombreTienda}</div>
              </div>
              <div class="info-item">
                <label>RUC/Cédula:</label>
                <div class="info-value">${config.ruc || '-'}</div>
              </div>
              <div class="info-item">
                <label>Teléfono:</label>
                <div class="info-value">${config.telefono || '-'}</div>
              </div>
              <div class="info-item">
                <label>Email:</label>
                <div class="info-value">${config.email || '-'}</div>
              </div>
              <div class="info-item">
                <label>Dirección:</label>
                <div class="info-value">${config.direccion || '-'}</div>
              </div>
              <div class="info-item">
                <label>Ciudad:</label>
                <div class="info-value">${config.ciudad || '-'}</div>
              </div>
              <div class="info-item">
                <label>País:</label>
                <div class="info-value">${config.pais || '-'}</div>
              </div>
            </div>
            <button class="btn btn-primary" onclick="ConfigTienda.editarInfoNegocio()">
              <i class="fas fa-edit"></i> Editar Información
            </button>
          </div>

          <!-- Categorías -->
          <div class="config-section">
            <h3><i class="fas fa-tags"></i> Categorías de Productos</h3>
            <div class="categorias-display">
              ${config.categorias
                .map(
                  (cat) => `
                <span class="categoria-badge">${cat}</span>
              `
                )
                .join('')}
            </div>
            <button class="btn btn-primary" onclick="ConfigTienda.editarCategorias()">
              <i class="fas fa-edit"></i> Editar Categorías
            </button>
          </div>

          <!-- Configuración Adicional -->
          <div class="config-section">
            <h3><i class="fas fa-sliders-h"></i> Configuración Adicional</h3>
            <div class="config-options">
              <div class="config-option">
                <label>IVA (%):</label>
                <input type="number" id="ivaConfig" class="form-control" value="${config.iva || 15}" min="0" max="100" step="0.1">
              </div>
              <div class="config-option">
                <label>Moneda:</label>
                <select id="monedaConfig" class="form-control">
                  <option value="USD" ${config.moneda === 'USD' ? 'selected' : ''}>USD - Dólar</option>
                  <option value="EUR" ${config.moneda === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                  <option value="COP" ${config.moneda === 'COP' ? 'selected' : ''}>COP - Peso Colombiano</option>
                  <option value="MXN" ${config.moneda === 'MXN' ? 'selected' : ''}>MXN - Peso Mexicano</option>
                  <option value="PEN" ${config.moneda === 'PEN' ? 'selected' : ''}>PEN - Sol Peruano</option>
                </select>
              </div>
            </div>
            <button class="btn btn-success" onclick="ConfigTienda.guardarConfigAdicional()">
              <i class="fas fa-save"></i> Guardar Cambios
            </button>
          </div>

          <!-- Configuración de Email para Facturas -->
          <div class="config-section">
            <h3><i class="fas fa-envelope"></i> Configuración de Email para Facturas</h3>
            <p style="color: #666; margin-bottom: 15px;">
              Configura el email para enviar facturas automáticamente a tus clientes
            </p>
            <div class="config-options">
              <div class="config-option">
                <label>
                  <input type="checkbox" id="emailEnabledConfig" ${config.emailConfigured ? 'checked' : ''}>
                  Activar envío de facturas por email
                </label>
              </div>
              <div class="config-option">
                <label>Email de envío:</label>
                <input type="email" id="emailRemitente" class="form-control" 
                       value="${config.emailRemitente || ''}" 
                       placeholder="facturas@mitienda.com">
                <small style="color: #666;">Email desde donde se enviarán las facturas</small>
              </div>
              <div class="config-option">
                <label>Servicio de Email:</label>
                <select id="emailServicio" class="form-control">
                  <option value="smtp" ${config.emailServicio === 'smtp' ? 'selected' : ''}>SMTP (Servidor propio)</option>
                  <option value="gmail" ${config.emailServicio === 'gmail' ? 'selected' : ''}>Gmail</option>
                  <option value="outlook" ${config.emailServicio === 'outlook' ? 'selected' : ''}>Outlook</option>
                  <option value="sendgrid" ${config.emailServicio === 'sendgrid' ? 'selected' : ''}>SendGrid (API)</option>
                </select>
              </div>
              <div class="config-option">
                <label>API Key / Contraseña:</label>
                <input type="password" id="emailPassword" class="form-control" 
                       value="${config.emailPassword || ''}" 
                       placeholder="Contraseña o API Key">
                <small style="color: #666;">Se guardará de forma segura</small>
              </div>
              <div class="config-option">
                <label>
                  <input type="checkbox" id="emailAutoEnvio" ${config.emailAutoEnvio ? 'checked' : ''}>
                  Enviar factura automáticamente al completar venta (si el cliente tiene email)
                </label>
              </div>
            </div>
            <button class="btn btn-success" onclick="ConfigTienda.guardarConfigEmail()">
              <i class="fas fa-save"></i> Guardar Configuración de Email
            </button>
            <button class="btn btn-info" onclick="ConfigTienda.probarConfigEmail()">
              <i class="fas fa-paper-plane"></i> Enviar Email de Prueba
            </button>
          </div>
        </div>
      </div>
    `;

    return html;
  },

  // ============================================
  // EDITAR INFORMACIÓN DEL NEGOCIO
  // ============================================
  editarInfoNegocio() {
    const config = this.getConfig();

    const html = `
      <div class="modal-overlay" id="modalEditarInfo">
        <div class="modal-container">
          <div class="modal-header">
            <h3>Editar Información del Negocio</h3>
            <button class="btn-close" onclick="document.getElementById('modalEditarInfo').remove()">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Nombre del Negocio *</label>
              <input type="text" id="editNombre" class="form-control" value="${config.nombreTienda}" required>
            </div>
            <div class="form-group">
              <label>RUC/Cédula</label>
              <input type="text" id="editRuc" class="form-control" value="${config.ruc || ''}">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Teléfono</label>
                <input type="text" id="editTelefono" class="form-control" value="${config.telefono || ''}">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" id="editEmail" class="form-control" value="${config.email || ''}">
              </div>
            </div>
            <div class="form-group">
              <label>Dirección</label>
              <input type="text" id="editDireccion" class="form-control" value="${config.direccion || ''}">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Ciudad</label>
                <input type="text" id="editCiudad" class="form-control" value="${config.ciudad || ''}">
              </div>
              <div class="form-group">
                <label>País</label>
                <input type="text" id="editPais" class="form-control" value="${config.pais || ''}">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('modalEditarInfo').remove()">Cancelar</button>
            <button class="btn btn-primary" onclick="ConfigTienda.guardarInfoNegocio()">
              <i class="fas fa-save"></i> Guardar
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
  },

  guardarInfoNegocio() {
    const nuevaInfo = {
      nombreTienda: document.getElementById('editNombre').value.trim(),
      ruc: document.getElementById('editRuc').value.trim(),
      telefono: document.getElementById('editTelefono').value.trim(),
      email: document.getElementById('editEmail').value.trim(),
      direccion: document.getElementById('editDireccion').value.trim(),
      ciudad: document.getElementById('editCiudad').value.trim(),
      pais: document.getElementById('editPais').value.trim(),
    };

    if (!nuevaInfo.nombreTienda) {
      Utils.showToast('El nombre del negocio es requerido', 'warning');
      return;
    }

    this.actualizarConfig(nuevaInfo);
    document.getElementById('modalEditarInfo').remove();

    // Re-renderizar
    const content = document.getElementById('main-content');
    if (content) {
      content.innerHTML = this.render();
    }
  },

  // ============================================
  // GUARDAR CONFIGURACIÓN ADICIONAL
  // ============================================
  guardarConfigAdicional() {
    const iva = parseFloat(document.getElementById('ivaConfig').value) || 15;
    const moneda = document.getElementById('monedaConfig').value;

    this.actualizarConfig({ iva, moneda });
  },

  // ============================================
  // GUARDAR CONFIGURACIÓN DE EMAIL
  // ============================================
  guardarConfigEmail() {
    const emailConfigured = document.getElementById('emailEnabledConfig').checked;
    const emailRemitente = document.getElementById('emailRemitente').value.trim();
    const emailServicio = document.getElementById('emailServicio').value;
    const emailPassword = document.getElementById('emailPassword').value.trim();
    const emailAutoEnvio = document.getElementById('emailAutoEnvio').checked;

    // Validaciones
    if (emailConfigured && !emailRemitente) {
      Utils.showToast('⚠️ Debes ingresar un email de envío', 'warning');
      return;
    }

    if (emailConfigured && !emailPassword) {
      Utils.showToast('⚠️ Debes ingresar una contraseña o API Key', 'warning');
      return;
    }

    // Guardar configuración
    this.actualizarConfig({
      emailConfigured,
      emailRemitente,
      emailServicio,
      emailPassword,
      emailAutoEnvio,
    });

    Utils.showToast('✅ Configuración de email guardada correctamente', 'success');
  },

  // ============================================
  // PROBAR CONFIGURACIÓN DE EMAIL
  // ============================================
  async probarConfigEmail() {
    const config = this.getConfig();

    if (!config.emailConfigured) {
      Utils.showToast('⚠️ Primero activa y guarda la configuración de email', 'warning');
      return;
    }

    const emailDestino = prompt(
      'Ingresa el email donde quieres recibir la prueba:',
      config.email || ''
    );

    if (!emailDestino) {
      return;
    }

    try {
      Utils.showToast('📧 Enviando email de prueba...', 'info');

      const emailData = {
        to: emailDestino,
        subject: `Prueba de Email - ${config.nombreTienda || 'Mi Tienda'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1;">✅ Configuración de Email Exitosa</h2>
            <p>Este es un email de prueba desde tu sistema de gestión.</p>
            <p><strong>Tienda:</strong> ${config.nombreTienda || 'Mi Tienda'}</p>
          </div>
        `,
      };

      const result = await Auth._request('/enviar-email', {
        method: 'POST',
        body: emailData,
      });

      if (!result?.success) {
        throw new Error(result?.message || 'Error al enviar el email de prueba');
      }

      Utils.showToast(
        '✅ Email de prueba enviado correctamente. Revisa tu bandeja de entrada.',
        'success'
      );
    } catch (error) {
      console.error('Error al enviar email de prueba:', error);
      Utils.showToast('❌ Error al enviar email: ' + error.message, 'error');
    }
  },

  // ============================================
  // EDITAR CATEGORÍAS
  // ============================================
  editarCategorias() {
    const config = this.getConfig();
    this.categoriasTemp = [...config.categorias];

    const html = `
      <div class="modal-overlay" id="modalEditarCategorias">
        <div class="modal-container modal-large">
          <div class="modal-header">
            <h3>Editar Categorías</h3>
            <button class="btn-close" onclick="document.getElementById('modalEditarCategorias').remove()">×</button>
          </div>
          <div class="modal-body">
            <div id="listaCategoriasEdit" class="categorias-list"></div>
            
            <div class="form-group">
              <label>Agregar nueva categoría</label>
              <div class="input-group">
                <input type="text" id="nuevaCategoriaEdit" class="form-control" placeholder="Nombre de la categoría">
                <button type="button" class="btn btn-secondary" onclick="ConfigTienda.agregarCategoriaEdit()">
                  <i class="fas fa-plus"></i> Agregar
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('modalEditarCategorias').remove()">Cancelar</button>
            <button class="btn btn-primary" onclick="ConfigTienda.guardarCategorias()">
              <i class="fas fa-save"></i> Guardar
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    this.renderizarCategoriasEdit();
  },

  renderizarCategoriasEdit() {
    const lista = document.getElementById('listaCategoriasEdit');
    lista.innerHTML = this.categoriasTemp
      .map(
        (cat, index) => `
      <div class="categoria-item">
        <i class="fas fa-grip-vertical"></i>
        <span>${cat}</span>
        <button type="button" class="btn-icon btn-danger" onclick="ConfigTienda.eliminarCategoriaEdit(${index})" ${cat === 'Otros' ? 'disabled' : ''}>
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `
      )
      .join('');
  },

  agregarCategoriaEdit() {
    const input = document.getElementById('nuevaCategoriaEdit');
    const nombreCategoria = input.value.trim();

    if (!nombreCategoria) {
      Utils.showToast('Ingresa un nombre para la categoría', 'warning');
      return;
    }

    if (this.categoriasTemp.includes(nombreCategoria)) {
      Utils.showToast('Esta categoría ya existe', 'warning');
      return;
    }

    const indexOtros = this.categoriasTemp.indexOf('Otros');
    if (indexOtros !== -1) {
      this.categoriasTemp.splice(indexOtros, 0, nombreCategoria);
    } else {
      this.categoriasTemp.push(nombreCategoria);
    }

    input.value = '';
    this.renderizarCategoriasEdit();
    Utils.showToast('Categoría agregada', 'success');
  },

  eliminarCategoriaEdit(index) {
    const categoria = this.categoriasTemp[index];
    if (categoria === 'Otros') {
      Utils.showToast('No se puede eliminar la categoría "Otros"', 'warning');
      return;
    }

    this.categoriasTemp.splice(index, 1);
    this.renderizarCategoriasEdit();
    Utils.showToast('Categoría eliminada', 'success');
  },

  guardarCategorias() {
    this.actualizarConfig({ categorias: this.categoriasTemp });
    document.getElementById('modalEditarCategorias').remove();

    // Re-renderizar
    const content = document.getElementById('main-content');
    if (content) {
      content.innerHTML = this.render();
    }
  },

  // ============================================
  // MOSTRAR MODAL PARA CAMBIAR TIPO
  // ============================================
  mostrarCambiarTipo() {
    const html = `
      <div class="modal-overlay" id="modalCambiarTipo">
        <div class="modal-container modal-large">
          <div class="modal-header">
            <h3>Cambiar Tipo de Tienda</h3>
            <button class="btn-close" onclick="document.getElementById('modalCambiarTipo').remove()">×</button>
          </div>
          <div class="modal-body">
            <p><strong>Nota:</strong> Al cambiar el tipo de tienda, las categorías se actualizarán. Los productos existentes no se verán afectados.</p>
            
            <div class="tipos-tienda-grid">
              ${Object.keys(this.tiposTienda)
                .map((key) => {
                  const tipo = this.tiposTienda[key];
                  return `
                  <div class="tipo-tienda-card" data-tipo="${key}" onclick="ConfigTienda.seleccionarNuevoTipo('${key}')">
                    <div class="tipo-icono">${tipo.icono}</div>
                    <div class="tipo-nombre">${tipo.nombre.replace(/^[^\s]+ /, '')}</div>
                  </div>
                `;
                })
                .join('')}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('modalCambiarTipo').remove()">Cancelar</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
  },

  seleccionarNuevoTipo(tipo) {
    if (this.cambiarTipoTienda(tipo)) {
      document.getElementById('modalCambiarTipo').remove();

      // Re-renderizar
      const content = document.getElementById('main-content');
      if (content) {
        content.innerHTML = this.render();
      }
    }
  },
};

// Inicializar cuando se carga el DOM
document.addEventListener('DOMContentLoaded', () => {
  // Pequeño delay para asegurar que Database esté listo
  setTimeout(() => {
    ConfigTienda.init();
  }, 100);
});
