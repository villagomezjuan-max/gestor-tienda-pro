/* ========================================
   MÓDULO: PROVEEDORES AUTOMOTRICES
   Gestión especializada para talleres mecánicos
   ======================================== */

window.Proveedores = {
  // Especialidades automotrices
  especialidades: {
    repuestos_motor: {
      nombre: 'Motor y Transmisión',
      icono: 'fas fa-cogs',
      productos: ['Filtros de aceite', 'Bujías', 'Correas', 'Pistones', 'Válvulas', 'Embrague'],
    },
    frenos_suspension: {
      nombre: 'Frenos y Suspensión',
      icono: 'fas fa-car-crash',
      productos: ['Pastillas de freno', 'Discos', 'Amortiguadores', 'Muelles', 'Rotulas'],
    },
    electrico_electronico: {
      nombre: 'Sistema Eléctrico',
      icono: 'fas fa-bolt',
      productos: ['Baterías', 'Alternadores', 'Arrancadores', 'Sensores', 'ECU'],
    },
    aceites_lubricantes: {
      nombre: 'Aceites y Lubricantes',
      icono: 'fas fa-oil-can',
      productos: ['Aceite motor', 'Aceite caja', 'Refrigerante', 'Líquido frenos', 'ATF'],
    },
    aire_combustible: {
      nombre: 'Sistema de Combustible',
      icono: 'fas fa-gas-pump',
      productos: ['Filtros combustible', 'Inyectores', 'Bombas', 'Filtros aire'],
    },
    herramientas_equipos: {
      nombre: 'Herramientas y Equipos',
      icono: 'fas fa-tools',
      productos: ['Scanner', 'Elevadores', 'Compresores', 'Soldadoras', 'Herramientas'],
    },
  },
  ciudadesEcuador: [
    'quito',
    'guayaquil',
    'cuenca',
    'guayaquil',
    'cuenca',
    'ambato',
    'manta',
    'machala',
    'santo domingo',
    'loja',
    'portoviejo',
    'duran',
    'samborondon',
    'babahoyo',
    'esmeraldas',
    'latacunga',
    'otavalo',
    'machala',
    'santo domingo',
    'loja',
    'puyo',
    'tulcan',
    'zamora',
    'macas',
    'el coca',
    'francisco de orellana',
    'santa elena',
    'los rios',
    'el oro',
  ],
  provinciasEcuador: [
    { id: 'azuay', nombre: 'Azuay' },
    { id: 'bolivar', nombre: 'Bolivar' },
    { id: 'canar', nombre: 'Canar' },
    { id: 'carchi', nombre: 'Carchi' },
    { id: 'chimborazo', nombre: 'Chimborazo' },
    { id: 'cotopaxi', nombre: 'Cotopaxi' },
    { id: 'el oro', nombre: 'El Oro' },
    { id: 'esmeraldas', nombre: 'Esmeraldas' },
    { id: 'galapagos', nombre: 'Galapagos' },
    { id: 'guayas', nombre: 'Guayas' },
    { id: 'imbabura', nombre: 'Imbabura' },
    { id: 'loja', nombre: 'Loja' },
    { id: 'los rios', nombre: 'Los Rios' },
    { id: 'manabi', nombre: 'Manabi' },
    { id: 'morona santiago', nombre: 'Morona Santiago' },
    { id: 'napo', nombre: 'Napo' },
    { id: 'orellana', nombre: 'Orellana' },
    { id: 'pastaza', nombre: 'Pastaza' },
    { id: 'pichincha', nombre: 'Pichincha' },
    { id: 'santa elena', nombre: 'Santa Elena' },
    { id: 'santo domingo de los tsachilas', nombre: 'Santo Domingo de los Tsachilas' },
    { id: 'sucumbios', nombre: 'Sucumbios' },
    { id: 'tungurahua', nombre: 'Tungurahua' },
    { id: 'zamora chinchipe', nombre: 'Zamora Chinchipe' },
  ],
  datasetProveedoresCache: null,
  proveedoresBaseFallback: {
    'Tecnova S.A.': {
      contacto: 'Equipo comercial',
      telefono: '+593 4 268 2500',
      email: 'ventas@tecnova.com.ec',
      direccion: 'Guayaquil, Ecuador',
      notas: 'Distribuidor autorizado Bosch en Ecuador',
      especialidades: ['repuestos_motor', 'frenos_suspension'],
      productosSuministrados: ['Sistemas de Frenos', 'Sistema de alimentación'],
    },
    'Maxcar Ecuador': {
      contacto: 'Departamento de ventas',
      telefono: '+593 2 382 9500',
      email: 'ventas@maxcar.com.ec',
      direccion: 'Quito, Ecuador',
      notas: 'Distribuidor Brembo, KYB y Monroe para Ecuador',
      especialidades: ['frenos_suspension'],
      productosSuministrados: ['Sistemas de Suspensión'],
    },
    'Motor Autoparts': {
      contacto: 'Atención comercial',
      telefono: '+593 4 259 5400',
      email: 'ventas@motorautoparts.ec',
      direccion: 'Guayaquil, Ecuador',
      notas: 'Especialistas en inyección y sistemas de combustible',
      especialidades: ['repuestos_motor', 'aire_combustible'],
      productosSuministrados: ['Sistema de combustible'],
    },
    'La Casa del Amortiguador': {
      contacto: 'Servicio al cliente',
      telefono: '+593 2 255 0987',
      email: 'info@casaamortiguador.ec',
      direccion: 'Quito, Ecuador',
      notas: 'Especialistas en suspensión con cobertura nacional',
      especialidades: ['frenos_suspension'],
      productosSuministrados: ['Sistemas de Suspensión'],
    },
    'Bosch Car Service Ecuador': {
      contacto: 'Recepción técnica',
      telefono: '+593 2 245 9700',
      email: 'info@bosch.com.ec',
      direccion: 'Quito, Ecuador',
      notas: 'Red oficial Bosch Car Service',
      especialidades: ['repuestos_motor', 'electrico_electronico'],
      productosSuministrados: ['Sistema eléctrico', 'Sistema de alimentación'],
    },
    'Importadora Dávila': {
      contacto: 'Equipo comercial',
      telefono: '593984347954',
      email: '',
      direccion: 'Quito, Ecuador',
      notas: 'Enfoque en sistemas de freno y servicio a mayoristas',
      especialidades: ['frenos_suspension'],
      productosSuministrados: ['Sistemas de Frenos'],
    },
  },
  // ============================================
  // RENDERIZAR VISTA PRINCIPAL
  // ============================================
  async render(container) {
    await this.sincronizarConCatalogo();
    const proveedores = await Database.getCollection('proveedores');
    this.todosProveedores = Array.isArray(proveedores) ? [...proveedores] : [];

    container.innerHTML = `
            <div class="proveedores-header">
                <div class="page-title-section">
                    <h2><i class="fas fa-truck-loading"></i> Proveedores Automotrices</h2>
                    <div class="proveedores-stats" id="proveedoresStats">
                        <div class="stat-item">
                            <span class="stat-value" id="totalProveedores">${proveedores.length}</span>
                            <span class="stat-label">Total Proveedores</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="proveedoresActivos">0</span>
                            <span class="stat-label">Activos</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="proveedoresMes">0</span>
                            <span class="stat-label">Compras del Mes</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="totalCompradoMes">$0</span>
                            <span class="stat-label">Gastado del Mes</span>
                        </div>
                    </div>
                </div>
                
                <div class="proveedores-toolbar">
                    <button class="btn btn-primary" data-action="nuevo-proveedor">
                        <i class="fas fa-plus"></i> Nuevo Proveedor
                    </button>
                    <button class="btn btn-success" data-action="catalogos-proveedor">
                        <i class="fas fa-book"></i> Catálogos
                    </button>
                    <button class="btn btn-info" data-action="comparar-precios">
                        <i class="fas fa-chart-line"></i> Comparar Precios
                    </button>
                    <button class="btn btn-warning" data-action="generar-reporte">
                        <i class="fas fa-file-pdf"></i> Reporte
                    </button>
                </div>
            </div>

            <!-- Filtros por especialidad -->
            <div class="especialidades-filter">
                <h4><i class="fas fa-filter"></i> Filtrar por Especialidad</h4>
                <div class="especialidades-grid">
                    <div class="especialidad-chip all-selected" data-action="filtrar-especialidad" data-especialidad="">
                        <i class="fas fa-th"></i>
                        <span>Todos</span>
                    </div>
                    ${Object.entries(this.especialidades)
                      .map(
                        ([key, esp]) => `
                        <div class="especialidad-chip" data-action="filtrar-especialidad" data-especialidad="${key}">
                            <i class="${esp.icono}"></i>
                            <span>${esp.nombre}</span>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>

            <div class="proveedores-content">
                <!-- Barra de filtros adicionales -->
                <div class="filtros-adicionales">
                    <div class="filtro-group">
                        <input 
                            type="text" 
                            id="searchProveedor" 
                            class="form-control" 
                            placeholder="Buscar por nombre, RUC, ciudad..."
                        >
                    </div>
                    <div class="filtro-group">
                        <select id="filterEstado" class="form-control">
                            <option value="">Todos los estados</option>
                            <option value="activo">Activos</option>
                            <option value="inactivo">Inactivos</option>
                        </select>
                    </div>
                    <div class="filtro-group">
                        <select id="filterProvincia" class="form-control">
                            <option value="">Todas las provincias</option>
                        </select>
                    </div>
                    <div class="filtro-group">
                        <select id="filterCiudad" class="form-control">
                            <option value="">Todas las ciudades</option>
                        </select>
                    </div>
                    <div class="filtro-group">
                        <select id="filterCalificacion" class="form-control">
                            <option value="">Todas las calificaciones</option>
                            <option value="5">⭐⭐⭐⭐⭐ Excelente</option>
                            <option value="4">⭐⭐⭐⭐ Muy bueno</option>
                            <option value="3">⭐⭐⭐ Bueno</option>
                            <option value="2">⭐⭐ Regular</option>
                            <option value="1">⭐ Malo</option>
                        </select>
                    </div>
                    <div class="filtro-group">
                        <select id="filterTiempoEntrega" class="form-control">
                            <option value="">Todos los tiempos</option>
                            <option value="inmediato">Inmediato (0-1 días)</option>
                            <option value="rapido">Rápido (2-3 días)</option>
                            <option value="normal">Normal (4-7 días)</option>
                            <option value="lento">Lento (+7 días)</option>
                        </select>
                    </div>
                </div>

                <!-- Grid de proveedores -->
                <div class="proveedores-grid" id="proveedoresGrid">
                    ${this.renderProveedoresGrid(proveedores)}
                </div>
            </div>

            <!-- Modales se renderizan dinámicamente -->
        `;

    this.establecerOpcionesGeograficas(proveedores);
    await this.calcularEstadisticas();
    this.configurarEventos();
  },

  // ============================================
  // RENDERIZAR GRID DE PROVEEDORES
  // ============================================
  renderProveedoresGrid(proveedores) {
    if (!proveedores || proveedores.length === 0) {
      return `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-truck-loading"></i>
                    </div>
                    <h3>No hay proveedores registrados</h3>
                    <p>Comienza agregando proveedores automotrices especializados</p>
                    <button class="btn btn-primary" onclick="Proveedores.mostrarFormulario()">
                        <i class="fas fa-plus"></i> Agregar primer proveedor
                    </button>
                </div>
            `;
    }

    const formatCurrency = (valor = 0) => {
      if (typeof Utils !== 'undefined' && typeof Utils.formatCurrency === 'function') {
        return Utils.formatCurrency(valor || 0);
      }
      return `$${(valor || 0).toLocaleString()}`;
    };

    return proveedores
      .map((proveedor) => {
        const especialidadesProveedor = proveedor.especialidades || [];
        const tiempoEntrega = this.obtenerTiempoEntregaTexto(proveedor.tiempoEntregaDias);
        const stockClass = proveedor.stockDisponible ? 'stock-ok' : 'stock-empty';
        const stockLabel = proveedor.stockDisponible ? 'Stock OK' : 'Sin stock';
        const totalComprado = formatCurrency(proveedor.totalComprado || 0);
        const saldoPendiente = formatCurrency(proveedor.saldoPendiente || 0);
        const ciudadNombre = this.formatearNombreEntidad(proveedor.ciudad || '');
        const provinciaNombre = this.formatearNombreEntidad(proveedor.provincia || '');
        const ubicacionTexto =
          [ciudadNombre, provinciaNombre].filter(Boolean).join(', ') ||
          this.formatearNombreEntidad(proveedor.direccion || '') ||
          'Sin ubicacion';
        const provinciaSlug = this.normalizarTexto(provinciaNombre);
        const ciudadSlug = this.normalizarTexto(ciudadNombre);

        return `
                <div class="proveedor-card compacto" data-id="${proveedor.id}" data-especialidades="${especialidadesProveedor.join(',')}" data-estado="${proveedor.activo ? 'activo' : 'inactivo'}" data-provincia="${provinciaSlug}" data-ciudad="${ciudadSlug}">
                    ${this.renderBotonWhatsApp(proveedor)}
                    <div class="proveedor-headline">
                        <div class="proveedor-avatar">
                            <i class="fas fa-building"></i>
                        </div>
                        <div class="proveedor-headline-info">
                            <h4>${proveedor.nombre}</h4>
                            <div class="proveedor-meta">
                                <span class="meta-item">
                                    <i class="fas fa-id-card"></i>
                                    ${proveedor.ruc || 'RUC N/A'}
                                </span>
                                <span class="meta-item">
                                    <i class="fas fa-map-marker-alt"></i>
                                    ${ubicacionTexto}
                                </span>
                            </div>
                        </div>
                        <span class="status-indicator ${proveedor.activo ? 'activo' : 'inactivo'}" title="${proveedor.activo ? 'Activo' : 'Inactivo'}"></span>
                    </div>

                    <div class="proveedor-especialidades compacto">
                        ${especialidadesProveedor
                          .slice(0, 3)
                          .map((esp) => {
                            const especialidad = this.especialidades[esp];
                            if (!especialidad) return '';
                            return `
                                <div class="especialidad-tag">
                                    <i class="${especialidad.icono}"></i>
                                    <span>${especialidad.nombre}</span>
                                </div>
                            `;
                          })
                          .join('')}
                        ${
                          especialidadesProveedor.length > 3
                            ? `
                            <div class="especialidad-tag mas">
                                +${especialidadesProveedor.length - 3} más
                            </div>
                        `
                            : ''
                        }
                    </div>

                    <div class="proveedor-mini-stats">
                        <div class="mini-stat" title="Calificación">
                            <i class="fas fa-star"></i>
                            <span>${this.mostrarCalificacionCompacta(proveedor.calificacion || 0)}</span>
                        </div>
                        <div class="mini-stat" title="Tiempo de entrega">
                            <i class="fas fa-truck-fast"></i>
                            <span>${tiempoEntrega}</span>
                        </div>
                        <div class="mini-stat ${stockClass}" title="Disponibilidad">
                            <i class="fas fa-boxes"></i>
                            <span>${stockLabel}</span>
                        </div>
                    </div>

                    <div class="proveedor-actions compact">
                        <button class="excel-btn-action btn-view" data-toggle-detalle="${proveedor.id}" data-action="ver-detalle-prov" aria-expanded="false" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="excel-btn-action" data-action="ver-catalogo-prov" data-proveedor-id="${proveedor.id}" title="Ver catálogo">
                            <i class="fas fa-book"></i>
                        </button>
                        <button class="excel-btn-action btn-edit" data-action="editar-proveedor" data-proveedor-id="${proveedor.id}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="excel-btn-action btn-delete" data-action="eliminar-proveedor" data-proveedor-id="${proveedor.id}" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>

                    <div class="proveedor-detalle" id="detalle-${proveedor.id}" hidden>
                        <div class="detalle-grid">
                            <div class="detalle-section">
                                <h5>Contacto</h5>
                                <div class="detalle-item">
                                    <i class="fas fa-user"></i>
                                    <span>${proveedor.contacto || 'Sin contacto asignado'}</span>
                                </div>
                                ${
                                  proveedor.telefono
                                    ? `
                                    <div class="detalle-item">
                                        <i class="fas fa-phone"></i>
                                        <a href="tel:${proveedor.telefono}">${proveedor.telefono}</a>
                                    </div>
                                `
                                    : ''
                                }
                                ${
                                  proveedor.email
                                    ? `
                                    <div class="detalle-item">
                                        <i class="fas fa-envelope"></i>
                                        <a href="mailto:${proveedor.email}">${proveedor.email}</a>
                                    </div>
                                `
                                    : ''
                                }
                                ${
                                  provinciaNombre
                                    ? `
                                    <div class="detalle-item">
                                        <i class="fas fa-location-arrow"></i>
                                        <span>${provinciaNombre}</span>
                                    </div>
                                `
                                    : ''
                                }
                                ${
                                  proveedor.direccion
                                    ? `
                                    <div class="detalle-item">
                                        <i class="fas fa-map-pin"></i>
                                        <span>${proveedor.direccion}</span>
                                    </div>
                                `
                                    : ''
                                }
                            </div>
                            <div class="detalle-section">
                                <h5>Operación</h5>
                                <div class="detalle-item">
                                    <i class="fas fa-dollar-sign"></i>
                                    <span>Total comprado: <strong>${totalComprado}</strong></span>
                                </div>
                                <div class="detalle-item">
                                    <i class="fas fa-receipt"></i>
                                    <span>Órdenes: <strong>${proveedor.numeroCompras || 0}</strong></span>
                                </div>
                                <div class="detalle-item">
                                    <i class="fas fa-balance-scale"></i>
                                    <span>Saldo: <strong>${saldoPendiente}</strong></span>
                                </div>
                                <div class="detalle-item">
                                    <i class="fas fa-money-check-alt"></i>
                                    <span>Pago preferido: ${proveedor.formaPago || '—'}</span>
                                </div>
                            </div>
                        </div>
                        ${
                          proveedor.notas
                            ? `
                            <div class="detalle-notas">
                                <i class="fas fa-sticky-note"></i>
                                <span>${proveedor.notas}</span>
                            </div>
                        `
                            : ''
                        }
                    </div>
                </div>
            `;
      })
      .join('');
  },

  renderBotonWhatsApp(proveedor = {}) {
    if (!proveedor.telefono || !this.validarNumeroWhatsApp(proveedor.telefono)) {
      return '';
    }

    return `
                    <button class="btn-whatsapp" type="button" onclick="Proveedores.contactarWhatsApp('${proveedor.id}')" title="Contactar por WhatsApp" aria-label="Contactar por WhatsApp">
                        <i class="fab fa-whatsapp"></i>
                    </button>
        `;
  },

  obtenerSaludoHorario() {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Buenos días';
    if (hora >= 12 && hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
  },

  escaparHtml(texto = '') {
    const mapa = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return texto.toString().replace(/[&<>"']/g, (caracter) => mapa[caracter] || caracter);
  },

  esDispositivoEscritorio() {
    const ua = navigator.userAgent || navigator.vendor || '';
    return /Windows|Macintosh|Linux/i.test(ua) && !/Android|iPhone|iPad|Mobile/i.test(ua);
  },

  abrirEnlaceWhatsApp(url, target = '_blank') {
    try {
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.target = target;
      enlace.rel = 'noopener noreferrer';
      enlace.style.display = 'none';
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      return true;
    } catch (error) {
      console.warn('WhatsApp: no se pudo abrir el enlace', error);
      return false;
    }
  },

  copiarMensajeWhatsApp(mensaje) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard
        .writeText(mensaje)
        .then(() => {
          if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
            Utils.showToast(
              'Mensaje preparado. Si no se llena automáticamente, pégalo desde el portapapeles.',
              'info'
            );
          }
        })
        .catch(() => {
          /* Ignoramos si no se pudo copiar */
        });
    }
  },

  toggleDetalle(proveedorId) {
    const detalle = document.getElementById(`detalle-${proveedorId}`);
    if (!detalle) {
      return;
    }

    const isOpen = !detalle.classList.contains('is-open');

    if (isOpen) {
      document.querySelectorAll('.proveedor-detalle.is-open').forEach((seccion) => {
        if (seccion.id !== `detalle-${proveedorId}`) {
          seccion.classList.remove('is-open');
          seccion.setAttribute('hidden', 'hidden');
          const sectionId = seccion.id.replace('detalle-', '');
          const otherCard = document.querySelector(`.proveedor-card[data-id="${sectionId}"]`);
          if (otherCard) {
            otherCard.classList.remove('detalle-abierto');
          }
          const otherBtn = document.querySelector(`[data-toggle-detalle="${sectionId}"]`);
          if (otherBtn) {
            otherBtn.setAttribute('aria-expanded', 'false');
            const otherIcon = otherBtn.querySelector('i');
            const otherLabel = otherBtn.querySelector('span');
            if (otherIcon) {
              otherIcon.classList.add('fa-eye');
              otherIcon.classList.remove('fa-eye-slash');
            }
            if (otherLabel) {
              otherLabel.textContent = 'Ver';
            }
          }
        }
      });
      detalle.classList.add('is-open');
      detalle.removeAttribute('hidden');
    } else {
      detalle.classList.remove('is-open');
      detalle.setAttribute('hidden', 'hidden');
    }

    const card = document.querySelector(`.proveedor-card[data-id="${proveedorId}"]`);
    if (card) {
      card.classList.toggle('detalle-abierto', isOpen);
    }

    const toggleBtn = document.querySelector(`[data-toggle-detalle="${proveedorId}"]`);
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      const icon = toggleBtn.querySelector('i');
      const label = toggleBtn.querySelector('span');
      if (icon) {
        icon.classList.toggle('fa-eye', !isOpen);
        icon.classList.toggle('fa-eye-slash', isOpen);
      }
      if (label) {
        label.textContent = isOpen ? 'Ocultar' : 'Ver';
      }
    }
  },

  // ============================================
  // MÉTODOS AUXILIARES PARA RENDERIZADO
  // ============================================
  obtenerTiempoEntregaTexto(dias) {
    if (!dias || dias === 0) return 'Inmediato';
    if (dias === 1) return '1 día';
    if (dias <= 3) return `${dias} días`;
    if (dias <= 7) return `${dias} días`;
    return `${Math.ceil(dias / 7)} semanas`;
  },

  mostrarCalificacionCompacta(calificacion) {
    if (!calificacion) return '—';
    return `${calificacion.toFixed(1)}★`;
  },

  filtrarPorEspecialidad(especialidadKey) {
    // Actualizar chips visuales
    document.querySelectorAll('.especialidad-chip').forEach((chip) => {
      chip.classList.remove('selected', 'all-selected');
    });

    const chipSeleccionado = especialidadKey
      ? document.querySelector(`[data-especialidad="${especialidadKey}"]`)
      : document.querySelector('[data-especialidad=""]');

    if (chipSeleccionado) {
      chipSeleccionado.classList.add(especialidadKey ? 'selected' : 'all-selected');
    }

    this.filtroEspecialidadActual = especialidadKey;
    this.aplicarFiltros();
  },

  renderEstrellas(calificacion) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= calificacion) {
        html += '<i class="fas fa-star rating-star rating-star-filled"></i>';
      } else {
        html += '<i class="far fa-star rating-star rating-star-empty"></i>';
      }
    }
    return html;
  },

  // ============================================
  // CONFIGURAR EVENTOS Y FILTROS
  // ============================================
  configurarEventos() {
    // Event listeners para toolbar
    const btnNuevoProveedor = document.querySelector('[data-action="nuevo-proveedor"]');
    const btnCatalogos = document.querySelector('[data-action="catalogos-proveedor"]');
    const btnComparar = document.querySelector('[data-action="comparar-precios"]');
    const btnReporte = document.querySelector('[data-action="generar-reporte"]');

    if (btnNuevoProveedor) {
      btnNuevoProveedor.addEventListener('click', () => this.mostrarFormulario());
    }
    if (btnCatalogos) {
      btnCatalogos.addEventListener('click', () => this.mostrarCatalogos());
    }
    if (btnComparar) {
      btnComparar.addEventListener('click', () => this.mostrarComparativa());
    }
    if (btnReporte) {
      btnReporte.addEventListener('click', () => this.generarReporte());
    }

    // Event listeners para filtros de especialidad
    document.querySelectorAll('[data-action="filtrar-especialidad"]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const especialidad = chip.getAttribute('data-especialidad');
        this.filtrarPorEspecialidad(especialidad);
      });
    });

    // Event delegation para acciones de proveedores en el grid
    const proveedoresGrid = document.getElementById('proveedoresGrid');
    if (proveedoresGrid) {
      proveedoresGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        const proveedorId =
          btn.getAttribute('data-proveedor-id') || btn.getAttribute('data-toggle-detalle');

        switch (action) {
          case 'ver-detalle-prov':
            this.toggleDetalle(proveedorId);
            break;
          case 'ver-catalogo-prov':
            this.verCatalogo(proveedorId);
            break;
          case 'editar-proveedor':
            this.mostrarFormulario(proveedorId);
            break;
          case 'eliminar-proveedor':
            this.confirmarEliminacion(proveedorId);
            break;
        }
      });
    }

    // Event listeners para filtros
    document
      .getElementById('searchProveedor')
      .addEventListener('input', () => this.aplicarFiltros());
    document.getElementById('filterEstado').addEventListener('change', () => this.aplicarFiltros());
    document
      .getElementById('filterCalificacion')
      .addEventListener('change', () => this.aplicarFiltros());
    document
      .getElementById('filterTiempoEntrega')
      .addEventListener('change', () => this.aplicarFiltros());

    const selectProvincia = document.getElementById('filterProvincia');
    const selectCiudad = document.getElementById('filterCiudad');

    if (selectProvincia) {
      selectProvincia.addEventListener('change', () => {
        this.actualizarOpcionesCiudad(selectProvincia.value, true);
        this.aplicarFiltros();
      });
    }

    if (selectCiudad) {
      selectCiudad.addEventListener('change', () => this.aplicarFiltros());
    }
  },

  verCatalogo(proveedorId) {
    const proveedor = Database.getItem('proveedores', proveedorId);
    if (!proveedor) return;

    const especialidadesDetalle = (proveedor.especialidades || [])
      .map((clave) => {
        const data = this.especialidades[clave];
        if (!data) return null;
        return { clave, data };
      })
      .filter(Boolean);

    const productosPersonalizados = Array.isArray(proveedor.productosSuministrados)
      ? proveedor.productosSuministrados.filter(Boolean)
      : [];

    const renderAccionesProducto = (productoEncoded, size = 'sm') => {
      const sizeClass = size === 'xs' ? 'btn-xs' : 'btn-sm';
      return `
                <div class="producto-actions">
                    <button class="btn ${sizeClass} btn-outline-success" data-producto="${productoEncoded}" onclick="Proveedores.compartirCotizacionWhatsAppDesdeBoton('${proveedorId}', this)" title="Compartir por WhatsApp">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    <button class="btn ${sizeClass} btn-outline-primary" data-producto="${productoEncoded}" onclick="Proveedores.solicitarCotizacionDesdeBoton('${proveedorId}', this)" title="Enviar correo">
                        <i class="fas fa-envelope"></i>
                    </button>
                </div>
            `;
    };

    const renderProductoEspecialidad = (producto) => {
      const visible = this.escaparHtml(producto);
      const encoded = encodeURIComponent(producto);
      return `
                <div class="producto-item">
                    <span class="producto-nombre">${visible}</span>
                    ${renderAccionesProducto(encoded)}
                </div>
            `;
    };

    const renderProductoPersonalizado = (producto) => {
      const visible = this.escaparHtml(producto);
      const encoded = encodeURIComponent(producto);
      return `
                <li>
                    <span>${visible}</span>
                    ${renderAccionesProducto(encoded, 'xs')}
                </li>
            `;
    };

    const especialidadesHtml = especialidadesDetalle
      .map(({ data }) => {
        const productosHtml = (Array.isArray(data.productos) ? data.productos : [])
          .map(renderProductoEspecialidad)
          .join('');
        return `
                <div class="especialidad-catalogo">
                    <h5><i class="${data.icono}"></i> ${data.nombre}</h5>
                    <div class="productos-especialidad">
                        ${productosHtml || '<p class="text-muted">Sin productos registrados para esta especialidad.</p>'}
                    </div>
                </div>
            `;
      })
      .join('');

    const productosPersonalizadosHtml = productosPersonalizados.length
      ? `
                <ul class="catalogo-productos-extra-lista">
                    ${productosPersonalizados.map(renderProductoPersonalizado).join('')}
                </ul>
            `
      : '<p class="text-muted">Aún no has agregado productos personalizados para este proveedor.</p>';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalCatalogoProveedor';

    modal.innerHTML = `
            <div class="modal-container modal-lg">
                <div class="modal-header">
                    <h3><i class="fas fa-book-open"></i> Catálogo - ${proveedor.nombre}</h3>
                    <button class="btn-close" onclick="document.getElementById('modalCatalogoProveedor').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="proveedor-info-header">
                        <div class="proveedor-datos">
                            <h4>${proveedor.nombre}</h4>
                            <p><i class="fas fa-phone"></i> ${proveedor.telefono || 'No disponible'}</p>
                            <p><i class="fas fa-truck-fast"></i> Entrega en ${proveedor.tiempoEntregaDias || 7} días</p>
                            <p><i class="fas fa-star"></i> Calificación: ${(proveedor.calificacion || 0).toFixed(1)}/5</p>
                        </div>
                    </div>

                    <div class="especialidades-catalogo">
                        ${especialidadesHtml || '<p class="text-muted">Este proveedor aún no tiene especialidades registradas.</p>'}
                    </div>

                    <div class="catalogo-productos-extra">
                        <div class="catalogo-productos-extra-header">
                            <h5><i class="fas fa-list"></i> Productos personalizados</h5>
                            <button class="btn btn-sm btn-outline-light" onclick="Proveedores.agregarProductoCatalogo('${proveedorId}')">
                                <i class="fas fa-plus-circle"></i> Agregar producto
                            </button>
                        </div>
                        ${productosPersonalizadosHtml}
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
  },

  establecerOpcionesGeograficas(proveedores = []) {
    const selectProvincia = document.getElementById('filterProvincia');
    const selectCiudad = document.getElementById('filterCiudad');
    if (!selectProvincia || !selectCiudad) {
      return;
    }

    const mapa = new Map();

    const agregarCiudad = (slugProvincia, nombreProvincia, ciudad) => {
      if (!mapa.has(slugProvincia)) {
        mapa.set(slugProvincia, {
          nombre: nombreProvincia,
          ciudades: new Set(),
        });
      }
      if (ciudad) {
        mapa.get(slugProvincia).ciudades.add(ciudad);
      }
    };

    (proveedores || []).forEach((prov) => {
      const provinciaNombre = this.formatearNombreEntidad(prov?.provincia || '');
      const provinciaSlug = this.normalizarTexto(provinciaNombre);
      const ciudadNombre = this.formatearNombreEntidad(prov?.ciudad || '');

      if (provinciaSlug) {
        const displayProvincia =
          provinciaNombre ||
          this.obtenerNombreProvinciaDesdeSlug(provinciaSlug) ||
          'Provincia no identificada';
        agregarCiudad(provinciaSlug, displayProvincia, ciudadNombre);
      } else if (ciudadNombre) {
        agregarCiudad('sin-provincia', 'Sin provincia', ciudadNombre);
      }
    });

    this.ciudadesPorProvincia = mapa;

    const ordenar = (a, b) => a[1].nombre.localeCompare(b[1].nombre);
    const provinciasOrdenadas = Array.from(mapa.entries())
      .filter(([slug]) => slug !== 'sin-provincia')
      .sort(ordenar);

    if (mapa.has('sin-provincia')) {
      provinciasOrdenadas.push(['sin-provincia', mapa.get('sin-provincia')]);
    }

    const opcionesProvincia = ['<option value="">Todas las provincias</option>'];
    provinciasOrdenadas.forEach(([slug, data]) => {
      opcionesProvincia.push(`<option value="${slug}">${data.nombre}</option>`);
    });

    selectProvincia.innerHTML = opcionesProvincia.join('');
    selectProvincia.value = '';

    this.actualizarOpcionesCiudad('', true);
  },

  actualizarOpcionesCiudad(provinciaSlug = '', resetSeleccion = false) {
    const selectCiudad = document.getElementById('filterCiudad');
    if (!selectCiudad) {
      return;
    }

    const mapa = this.ciudadesPorProvincia || new Map();
    const ciudades = new Set();

    if (provinciaSlug && mapa.has(provinciaSlug)) {
      mapa.get(provinciaSlug).ciudades.forEach((ciudad) => ciudades.add(ciudad));
    } else {
      mapa.forEach((data) => {
        data.ciudades.forEach((ciudad) => ciudades.add(ciudad));
      });
    }

    const opciones = ['<option value="">Todas las ciudades</option>'];
    Array.from(ciudades)
      .sort((a, b) => a.localeCompare(b))
      .forEach((ciudad) => {
        const slug = this.normalizarTexto(ciudad);
        opciones.push(`<option value="${slug}">${ciudad}</option>`);
      });

    selectCiudad.innerHTML = opciones.join('');
    if (resetSeleccion) {
      selectCiudad.value = '';
    }
  },

  async aplicarFiltros() {
    const busqueda = document.getElementById('searchProveedor').value.toLowerCase().trim();
    const filtroEstado = document.getElementById('filterEstado').value;
    const filtroProvincia = document.getElementById('filterProvincia')
      ? document.getElementById('filterProvincia').value
      : '';
    const filtroCiudad = document.getElementById('filterCiudad')
      ? document.getElementById('filterCiudad').value
      : '';
    const filtroCalificacion = document.getElementById('filterCalificacion').value;
    const filtroTiempoEntrega = document.getElementById('filterTiempoEntrega').value;

    let proveedores = await Database.getCollection('proveedores');

    // Filtro por búsqueda
    if (busqueda) {
      proveedores = proveedores.filter(
        (p) =>
          p.nombre.toLowerCase().includes(busqueda) ||
          (p.ruc && p.ruc.toLowerCase().includes(busqueda)) ||
          (p.ciudad && p.ciudad.toLowerCase().includes(busqueda)) ||
          (p.contacto && p.contacto.toLowerCase().includes(busqueda)) ||
          (p.email && p.email.toLowerCase().includes(busqueda))
      );
    }

    // Filtro por estado
    if (filtroEstado) {
      const estadoBoolean = filtroEstado === 'activo';
      proveedores = proveedores.filter((p) => p.activo === estadoBoolean);
    }

    // Filtro por calificación
    if (filtroCalificacion) {
      const calificacionMinima = parseInt(filtroCalificacion);
      proveedores = proveedores.filter((p) => (p.calificacion || 0) >= calificacionMinima);
    }

    // Filtro por tiempo de entrega
    if (filtroTiempoEntrega) {
      proveedores = proveedores.filter((p) => {
        const dias = p.tiempoEntregaDias || 0;
        switch (filtroTiempoEntrega) {
          case 'inmediato':
            return dias <= 1;
          case 'rapido':
            return dias >= 2 && dias <= 3;
          case 'normal':
            return dias >= 4 && dias <= 7;
          case 'lento':
            return dias > 7;
          default:
            return true;
        }
      });
    }

    if (filtroProvincia) {
      if (filtroProvincia === 'sin-provincia') {
        proveedores = proveedores.filter((p) => !p.provincia);
      } else {
        proveedores = proveedores.filter(
          (p) => this.normalizarTexto(p.provincia || '') === filtroProvincia
        );
      }
    }

    if (filtroCiudad) {
      proveedores = proveedores.filter(
        (p) => this.normalizarTexto(p.ciudad || '') === filtroCiudad
      );
    }

    // Filtro por especialidad (si hay uno activo)
    if (this.filtroEspecialidadActual) {
      proveedores = proveedores.filter((p) =>
        (p.especialidades || []).includes(this.filtroEspecialidadActual)
      );
    }

    // Actualizar grid
    document.getElementById('proveedoresGrid').innerHTML = this.renderProveedoresGrid(proveedores);

    // Actualizar contador
    const totalElement = document.querySelector('#totalProveedores');
    if (totalElement) totalElement.textContent = proveedores.length;
  },

  // ============================================
  // CALCULAR ESTADÍSTICAS
  // ============================================
  async calcularEstadisticas() {
    try {
      const proveedores = await Database.getCollection('proveedores');
      const activos = proveedores.filter((p) => p.activo !== false).length;

      // Total comprado este mes
      const compras = await Database.getCollection('compras');
      const hoy = new Date();
      const mesActual = hoy.getMonth();
      const anioActual = hoy.getFullYear();

      const comprasMes = compras.filter((c) => {
        const fechaCompra = new Date(c.fecha);
        return fechaCompra.getMonth() === mesActual && fechaCompra.getFullYear() === anioActual;
      });

      const totalMes = comprasMes.reduce((sum, c) => sum + (c.total || 0), 0);

      // Calcular proveedores únicos del mes
      const proveedoresUnicos = new Set(comprasMes.map((c) => c.proveedorId).filter(Boolean));

      const elementoActivos = document.getElementById('proveedoresActivos');
      const elementoMes = document.getElementById('proveedoresMes');
      const elementoTotal = document.getElementById('totalCompradoMes');

      if (elementoActivos) elementoActivos.textContent = activos;
      if (elementoMes) elementoMes.textContent = proveedoresUnicos.size;
      if (elementoTotal) elementoTotal.textContent = Utils.formatCurrency(totalMes);
    } catch (error) {
      console.error('Error al calcular estadísticas de proveedores:', error);
    }
  }, // ============================================
  // MOSTRAR FORMULARIO
  // ============================================
  async mostrarFormulario(proveedorId = null) {
    const proveedor = proveedorId ? Database.getItem('proveedores', proveedorId) : null;
    const esEdicion = !!proveedor;

    let categorias = [];
    if (window.Productos && typeof Productos.getCategorias === 'function') {
      try {
        categorias = await Productos.getCategorias();
      } catch (error) {
        console.error('Error cargando categorías para proveedores:', error);
      }
    }

    categorias = Array.isArray(categorias) ? categorias : [];

    const body = `
      <form id="formProveedor">
        <div class="form-row">
          <div class="form-group">
            <label>Nombre de la Empresa *</label>
            <input type="text" name="nombre" class="form-control" value="${proveedor?.nombre || ''}" required>
          </div>
          <div class="form-group">
            <label>RUC/NIT *</label>
            <input type="text" name="ruc" class="form-control" value="${proveedor?.ruc || ''}" placeholder="Opcional">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Contacto Principal</label>
            <input type="text" name="contacto" class="form-control" value="${proveedor?.contacto || ''}">
          </div>
          <div class="form-group">
            <label>Teléfono *</label>
            <input type="text" name="telefono" class="form-control" value="${proveedor?.telefono || ''}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" class="form-control" value="${proveedor?.email || ''}">
          </div>
          <div class="form-group">
            <label>Días de Entrega</label>
            <input type="number" name="diasEntrega" class="form-control" min="1" value="${proveedor?.diasEntrega || 7}">
          </div>
        </div>

        <div class="form-group">
          <label>Dirección</label>
          <input type="text" name="direccion" class="form-control" value="${proveedor?.direccion || ''}">
          </div>

        <div class="form-row">
          <div class="form-group">
            <label>Ciudad</label>
            <input type="text" name="ciudad" class="form-control" value="${proveedor?.ciudad || ''}">
          </div>
          <div class="form-group">
            <label>País</label>
            <input type="text" name="pais" class="form-control" value="${proveedor?.pais || 'Ecuador'}">
          </div>
        </div>

        <div class="form-group">
          <label>Productos/Categorías que Suministra</label>
          <select name="productosSuministrados" class="form-control" multiple size="5">
            ${categorias
              .map(
                (c) => `
              <option value="${c.nombre}" ${proveedor?.productosSuministrados?.includes(c.nombre) ? 'selected' : ''}>
                ${c.nombre}
              </option>
            `
              )
              .join('')}
          </select>
          <small class="form-text">Mantén presionado Ctrl/Cmd para seleccionar múltiples</small>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Forma de Pago Preferida</label>
            <select name="formaPago" class="form-control">
              <option value="Efectivo" ${proveedor?.formaPago === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
              <option value="Transferencia" ${proveedor?.formaPago === 'Transferencia' ? 'selected' : ''}>Transferencia</option>
              <option value="Cheque" ${proveedor?.formaPago === 'Cheque' ? 'selected' : ''}>Cheque</option>
              <option value="Crédito" ${proveedor?.formaPago === 'Crédito' ? 'selected' : ''}>Crédito</option>
            </select>
          </div>
          <div class="form-group">
            <label>Plazo de Crédito (días)</label>
            <input type="number" name="plazoCredito" class="form-control" min="0" value="${proveedor?.plazoCredito || 30}">
          </div>
        </div>

        <div class="form-group">
          <label>Calificación</label>
          <select name="calificacion" class="form-control">
            <option value="0" ${proveedor?.calificacion === 0 ? 'selected' : ''}>Sin calificar</option>
            <option value="1" ${proveedor?.calificacion === 1 ? 'selected' : ''}>★ Muy malo</option>
            <option value="2" ${proveedor?.calificacion === 2 ? 'selected' : ''}>★★ Malo</option>
            <option value="3" ${proveedor?.calificacion === 3 ? 'selected' : ''}>★★★ Regular</option>
            <option value="4" ${proveedor?.calificacion === 4 ? 'selected' : ''}>★★★★ Bueno</option>
            <option value="5" ${proveedor?.calificacion === 5 ? 'selected' : ''}>★★★★★ Excelente</option>
          </select>
        </div>

        <div class="form-group">
          <label>Notas</label>
          <textarea name="notas" class="form-control" rows="3">${proveedor?.notas || ''}</textarea>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" name="activo" ${proveedor?.activo !== false ? 'checked' : ''}>
            Proveedor Activo
          </label>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn btn-secondary" data-action="cancel-proveedor">
        Cancelar
      </button>
      <button class="btn btn-primary" data-action="save-proveedor" data-proveedor-id="${proveedorId || ''}">
        <i class="fas fa-save"></i> Guardar
      </button>
    `;

    const modalElement = Utils.createModal(
      'modalProveedor',
      `<i class="fas fa-truck"></i> ${esEdicion ? 'Editar' : 'Nuevo'} Proveedor`,
      body,
      footer,
      'large'
    );

    // Agregar event listeners
    const cancelBtn = modalElement.querySelector('[data-action="cancel-proveedor"]');
    const saveBtn = modalElement.querySelector('[data-action="save-proveedor"]');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => Utils.closeModal('modalProveedor'));
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const provId = saveBtn.getAttribute('data-proveedor-id');
        this.guardar(provId);
      });
    }
  },

  // ============================================
  // GUARDAR PROVEEDOR
  // ============================================
  async guardar(proveedorId) {
    const form = document.getElementById('formProveedor');
    if (!form) {
      console.error('Formulario de proveedor no encontrado');
      return;
    }

    const proveedorData = Utils.getFormData(form);
    const proveedorOriginal = proveedorId
      ? await Database.getItem('proveedores', proveedorId)
      : null;

    // Validaciones mejoradas
    if (!proveedorData.nombre || !proveedorData.nombre.trim()) {
      Utils.showToast('El nombre del proveedor es obligatorio', 'error');
      return;
    }

    if (!proveedorData.telefono || !proveedorData.telefono.trim()) {
      Utils.showToast('El teléfono es obligatorio', 'error');
      return;
    }

    proveedorData.ruc = (proveedorData.ruc || '').toString().trim();

    // Obtener categorías seleccionadas
    const select = form.querySelector('[name="productosSuministrados"]');
    proveedorData.productosSuministrados = Array.from(select.selectedOptions).map(
      (opt) => opt.value
    );
    proveedorData.diasEntrega = parseInt(proveedorData.diasEntrega) || 7;
    proveedorData.plazoCredito = parseInt(proveedorData.plazoCredito) || 30;
    proveedorData.calificacion = parseInt(proveedorData.calificacion) || 0;
    proveedorData.activo = proveedorData.activo === 'on';
    proveedorData.ciudad = this.formatearNombreEntidad(proveedorData.ciudad || '');
    proveedorData.provincia = this.formatearNombreEntidad(proveedorData.provincia || '');
    proveedorData.pais = this.formatearNombreEntidad(proveedorData.pais || 'Ecuador');
    proveedorData.telefono = this.normalizarTelefono(proveedorData.telefono || '');

    const telefonosBase = Array.isArray(proveedorOriginal?.telefonos)
      ? proveedorOriginal.telefonos
      : [];
    const whatsappBase = Array.isArray(proveedorOriginal?.whatsapp)
      ? proveedorOriginal.whatsapp
      : [];
    const telefonosActualizados = this.ordenarTelefonos([...telefonosBase, proveedorData.telefono]);
    proveedorData.telefonos = telefonosActualizados;
    proveedorData.whatsapp = this.generarWhatsappLinks(telefonosActualizados, whatsappBase);

    if (proveedorId) {
      // Editar
      const proveedor = proveedorOriginal || {};
      Object.assign(proveedor, proveedorData);
      proveedor.updatedAt = new Date().toISOString();
      await Database.update('proveedores', proveedorId, proveedor);
      Utils.showToast('✓ Proveedor actualizado correctamente', 'success');
    } else {
      // Crear
      proveedorData.id = Utils.generateId('prov');
      proveedorData.totalComprado = 0;
      proveedorData.numeroCompras = 0;
      proveedorData.ultimaCompra = null;
      proveedorData.compraPromedio = 0;
      proveedorData.saldoPendiente = 0;
      proveedorData.createdAt = new Date().toISOString();
      proveedorData.updatedAt = new Date().toISOString();
      await Database.add('proveedores', proveedorData);
      Utils.showToast('✓ Proveedor creado exitosamente', 'success');
    }

    const modal = document.getElementById('modalProveedor');
    if (modal) modal.remove();

    // Actualizar sin recargar página con pequeño delay para animación
    setTimeout(async () => {
      if (window.DataRefreshManager) {
        const container = document.querySelector('.page-content');
        if (container) await this.render(container);
      } else {
        App.loadModule('proveedores');
      }
    }, 300);
  },

  // ============================================
  // EDITAR
  // ============================================
  editar(proveedorId) {
    this.mostrarFormulario(proveedorId);
  },

  // ============================================
  // VER DETALLE
  // ============================================
  async verDetalle(proveedorId) {
    const proveedor = await Database.getItem('proveedores', proveedorId);
    if (!proveedor) return;

    // Obtener compras al proveedor
    const compras = (await Database.getCollection('compras')).filter(
      (c) => c.proveedorId === proveedorId
    );
    const cuentasPorPagar = (await Database.getCollection('cuentasPorPagar')).filter(
      (c) => c.proveedorId === proveedorId && c.estado !== 'pagada'
    );

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalDetalleProveedor';
    modal.innerHTML = `
      <div class="modal-container modal-large">
        <div class="modal-header">
          <h3><i class="fas fa-truck"></i> Detalle del Proveedor</h3>
          <button class="btn-close" onclick="document.getElementById('modalDetalleProveedor').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="proveedor-detalle">
            <div class="proveedor-info-principal">
              <h2>${proveedor.nombre}</h2>
              <div class="rating">
                ${this.renderEstrellas(proveedor.calificacion || 0)}
              </div>
            </div>

            <div class="info-grid">
              <div><strong>RUC:</strong> ${proveedor.ruc}</div>
              <div><strong>Contacto:</strong> ${proveedor.contacto || '-'}</div>
              <div><strong>Teléfono:</strong> ${proveedor.telefono}</div>
              <div><strong>Email:</strong> ${proveedor.email || '-'}</div>
              <div><strong>Dirección:</strong> ${proveedor.direccion || '-'}</div>
              <div><strong>Ciudad:</strong> ${proveedor.ciudad || '-'}</div>
                            <div><strong>Provincia:</strong> ${proveedor.provincia || '-'}</div>
              <div><strong>Días de Entrega:</strong> ${proveedor.diasEntrega || '-'}</div>
              <div><strong>Forma de Pago:</strong> ${proveedor.formaPago || '-'}</div>
            </div>

            ${
              proveedor.productosSuministrados && proveedor.productosSuministrados.length > 0
                ? `
              <div class="productos-suministra">
                <strong>Productos que Suministra:</strong>
                <div class="categorias-display">
                  ${proveedor.productosSuministrados
                    .map(
                      (cat) => `
                    <span class="categoria-badge">${cat}</span>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
                : ''
            }

            <h4>Estadísticas</h4>
            <div class="stats-grid">
              <div class="stat-card">
                <p>Total Comprado</p>
                <h3>${Utils.formatCurrency(proveedor.totalComprado || 0)}</h3>
              </div>
              <div class="stat-card">
                <p>Número de Compras</p>
                <h3>${proveedor.numeroCompras || 0}</h3>
              </div>
              <div class="stat-card">
                <p>Compra Promedio</p>
                <h3>${Utils.formatCurrency(proveedor.compraPromedio || 0)}</h3>
              </div>
              <div class="stat-card">
                <p>Saldo Pendiente</p>
                <h3 class="${proveedor.saldoPendiente > 0 ? 'text-danger' : 'text-success'}">
                  ${Utils.formatCurrency(proveedor.saldoPendiente || 0)}
                </h3>
              </div>
            </div>

            ${
              cuentasPorPagar.length > 0
                ? `
              <h4>Cuentas por Pagar Pendientes</h4>
              <table class="table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Restante</th>
                  </tr>
                </thead>
                <tbody>
                  ${cuentasPorPagar
                    .map(
                      (c) => `
                    <tr>
                      <td>${c.numeroCompra}</td>
                      <td>${c.fechaEmision}</td>
                      <td>${Utils.formatCurrency(c.montoTotal)}</td>
                      <td class="text-danger">${Utils.formatCurrency(c.montoRestante)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            `
                : ''
            }

            <h4>Últimas Compras</h4>
            ${
              compras.length > 0
                ? `
              <table class="table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Estado Pago</th>
                  </tr>
                </thead>
                <tbody>
                  ${compras
                    .slice(0, 5)
                    .map(
                      (c) => `
                    <tr>
                      <td class="font-mono">${c.numero}</td>
                      <td class="text-muted">${c.fecha}</td>
                      <td class="text-right"><strong>${Utils.formatCurrency(c.total)}</strong></td>
                      <td class="text-center">
                        <span class="excel-badge ${c.estadoPago === 'pagada' ? 'excel-badge-success' : 'excel-badge-warning'}">
                          ${c.estadoPago}
                        </span>
                      </td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            `
                : '<p class="text-muted">No hay compras registradas</p>'
            }
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalDetalleProveedor').remove()">
            Cerrar
          </button>
          <button class="btn btn-primary" onclick="Proveedores.editar('${proveedorId}'); document.getElementById('modalDetalleProveedor').remove();">
            <i class="fas fa-edit"></i> Editar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  // ============================================
  // FUNCIONES PARA CATÁLOGOS AUTOMOTRICES
  // ============================================
  mostrarCatalogos() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalCatalogos';

    modal.innerHTML = `
            <div class="modal-container modal-xl">
                <div class="modal-header">
                    <h3><i class="fas fa-book"></i> Catálogos de Proveedores Automotrices</h3>
                    <button class="btn-close" onclick="document.getElementById('modalCatalogos').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="catalogos-grid">
                        ${Object.entries(this.especialidades)
                          .map(
                            ([key, esp]) => `
                            <div class="catalogo-section">
                                <h4><i class="${esp.icono}"></i> ${esp.nombre}</h4>
                                <div class="productos-grid">
                                    ${esp.productos
                                      .map(
                                        (producto) => `
                                        <div class="producto-card">
                                            <h5>${producto}</h5>
                                            <div class="proveedores-producto">
                                                ${this.obtenerProveedoresPorProducto(key, producto)}
                                            </div>
                                        </div>
                                    `
                                      )
                                      .join('')}
                                </div>
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
  },

  obtenerProveedoresPorProducto(especialidad, producto) {
    const proveedores = Database.getCollection('proveedores').filter(
      (p) => (p.especialidades || []).includes(especialidad) && p.activo
    );

    if (proveedores.length === 0) {
      return '<p class="no-proveedores">No hay proveedores para este producto</p>';
    }

    return proveedores
      .map(
        (p) => `
            <div class="proveedor-producto">
                <div class="proveedor-info">
                    <strong>${p.nombre}</strong>
                    <span class="tiempo-entrega">${p.tiempoEntregaDias || 7} días</span>
                </div>
                <div class="proveedor-contacto">
                    ${p.telefono ? `<a href="tel:${p.telefono}"><i class="fas fa-phone"></i></a>` : ''}
                    ${p.email ? `<a href="mailto:${p.email}"><i class="fas fa-envelope"></i></a>` : ''}
                </div>
            </div>
        `
      )
      .join('');
  },

  validarNumeroWhatsApp(telefono) {
    return Boolean(this.extraerNumeroWhatsapp(telefono));
  },

  contactarWhatsApp(proveedorId, productoCodificado = '') {
    const proveedor = Database.getItem('proveedores', proveedorId);
    if (!proveedor) {
      Utils.showToast('No se encontró información de contacto para este proveedor', 'warning');
      return;
    }
    const numerosDisponibles = this.obtenerTelefonosDisponiblesWhatsApp(proveedor);
    if (!numerosDisponibles.length) {
      Utils.showToast('El proveedor no tiene un número de WhatsApp válido registrado', 'warning');
      return;
    }

    const producto = productoCodificado ? decodeURIComponent(productoCodificado) : '';
    const mensaje = this.construirMensajeCotizacion(proveedor, producto);
    if (numerosDisponibles.length === 1) {
      this.copiarMensajeWhatsApp(mensaje);
      this.lanzarChatWhatsApp(numerosDisponibles[0], mensaje);
      return;
    }

    this.mostrarSelectorWhatsApp(proveedor, numerosDisponibles, mensaje);
  },

  lanzarChatWhatsApp(numeroDestino, mensaje) {
    if (!numeroDestino) {
      return;
    }

    const mensajeCodificado = encodeURIComponent(mensaje);
    const urlWeb = `https://wa.me/${numeroDestino}?text=${mensajeCodificado}`;

    if (this.esDispositivoEscritorio()) {
      const urlApp = `whatsapp://send?phone=${numeroDestino}&text=${mensajeCodificado}`;
      this.abrirEnlaceWhatsApp(urlApp, '_self');
      setTimeout(() => {
        if (!document.hidden) {
          this.abrirEnlaceWhatsApp(urlWeb, '_blank');
        }
      }, 1200);
    } else {
      this.abrirEnlaceWhatsApp(urlWeb, '_blank');
    }
  },

  mostrarSelectorWhatsApp(proveedor, numeros, mensaje) {
    if (!Array.isArray(numeros) || numeros.length === 0) {
      return;
    }

    Utils.closeModal('modalSelectorWhatsApp');
    const titulo = '<i class="fab fa-whatsapp"></i> Selecciona un número';
    const cuerpo = `
            <p>Selecciona el número para contactar a <strong>${this.escaparHtml(proveedor?.nombre || 'Proveedor')}</strong>:</p>
            <div class="lista-telefonos-whatsapp">
                ${numeros
                  .map(
                    (numero) => `
                    <button type="button" class="btn btn-outline-success" style="width: 100%; margin-bottom: 8px;" data-numero="${numero}">
                        <i class="fab fa-whatsapp"></i> ${this.formatearTelefonoVisual(numero)}
                    </button>
                `
                  )
                  .join('')}
            </div>
        `;
    const pie = `
            <button class="btn btn-secondary" onclick="Utils.closeModal('modalSelectorWhatsApp')">
                <i class="fas fa-times"></i> Cancelar
            </button>
        `;

    const modal = Utils.createModal('modalSelectorWhatsApp', titulo, cuerpo, pie, 'small');
    modal.querySelectorAll('button[data-numero]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const numeroSeleccionado = boton.dataset.numero;
        Utils.closeModal('modalSelectorWhatsApp');
        this.copiarMensajeWhatsApp(mensaje);
        this.lanzarChatWhatsApp(numeroSeleccionado, mensaje);
      });
    });
  },

  obtenerTelefonosDisponiblesWhatsApp(proveedor) {
    const numeros = new Set();
    if (!proveedor) {
      return [];
    }

    const agregar = (valor) => {
      const numero = this.extraerNumeroWhatsapp(valor);
      if (numero) {
        numeros.add(numero);
      }
    };

    if (proveedor.telefono) agregar(proveedor.telefono);
    if (Array.isArray(proveedor.telefonos)) {
      proveedor.telefonos.forEach(agregar);
    }
    if (Array.isArray(proveedor.whatsapp)) {
      proveedor.whatsapp.forEach(agregar);
    }

    return Array.from(numeros);
  },

  compartirCotizacionWhatsAppDesdeBoton(proveedorId, boton) {
    if (!boton) {
      console.warn('No se pudo compartir el producto: botón no disponible.');
      return;
    }

    const productoCodificado = boton.dataset?.producto || '';
    this.contactarWhatsApp(proveedorId, productoCodificado);
  },

  solicitarCotizacionDesdeBoton(proveedorId, boton) {
    const proveedor = Database.getItem('proveedores', proveedorId);
    if (!proveedor) {
      Utils.showToast('No se pudo encontrar al proveedor seleccionado.', 'warning');
      return;
    }

    const productoCodificado = boton?.dataset?.producto || '';
    const producto = productoCodificado ? decodeURIComponent(productoCodificado) : '';
    const mensaje = this.construirMensajeCotizacion(proveedor, producto);
    const asunto = producto ? `Solicitud de cotización - ${producto}` : 'Solicitud de cotización';

    if (proveedor.email) {
      const mailto = `mailto:${proveedor.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`;
      window.open(mailto, '_blank');
      Utils.showToast('Abrimos tu cliente de correo con la solicitud preparada.', 'info');
      return;
    }

    if (proveedor.telefono) {
      Utils.showToast('No encontramos correo, te redirigimos a WhatsApp con la solicitud.', 'info');
      this.contactarWhatsApp(proveedorId, productoCodificado);
      return;
    }

    Utils.showToast('Este proveedor no tiene datos de contacto disponibles.', 'warning');
  },

  agregarProductoCatalogo(proveedorId) {
    const proveedor = Database.getItem('proveedores', proveedorId);
    if (!proveedor) {
      Utils.showToast('No se encontró el proveedor seleccionado.', 'warning');
      return;
    }

    const nuevoProducto = prompt(
      'Describe el producto o referencia que deseas agregar al catálogo de este proveedor:'
    );
    if (nuevoProducto === null) {
      return;
    }

    const productoLimpio = nuevoProducto.trim();
    if (!productoLimpio) {
      Utils.showToast('No se agregó el producto porque el nombre está vacío.', 'warning');
      return;
    }

    const listaActual = Array.isArray(proveedor.productosSuministrados)
      ? [...proveedor.productosSuministrados]
      : [];

    const yaExiste = listaActual.some(
      (item) => item.toLowerCase() === productoLimpio.toLowerCase()
    );
    if (yaExiste) {
      Utils.showToast('Ese producto ya existe en el catálogo personalizado.', 'info');
      return;
    }

    listaActual.push(productoLimpio);
    const proveedorActualizado = { ...proveedor, productosSuministrados: listaActual };
    const actualizado = Database.updateItem('proveedores', proveedorId, proveedorActualizado);

    if (!actualizado) {
      Utils.showToast('No pudimos guardar el producto. Inténtalo de nuevo.', 'error');
      return;
    }

    if (Array.isArray(this.todosProveedores)) {
      const indice = this.todosProveedores.findIndex((p) => p.id === proveedorId);
      if (indice !== -1) {
        this.todosProveedores[indice] = proveedorActualizado;
      }
    }

    Utils.showToast('Producto agregado al catálogo.', 'success');

    const modalCatalogo = document.getElementById('modalCatalogoProveedor');
    if (modalCatalogo) {
      modalCatalogo.remove();
    }
    this.verCatalogo(proveedorId);
  },

  construirMensajeCotizacion(proveedor = {}, producto = '') {
    const saludoHorario = this.obtenerSaludoHorario();
    const referencia = proveedor.contacto || proveedor.nombre || '';
    const referenciaFormateada = referencia ? this.formatearNombreEntidad(referencia) : '';
    const saludoLinea = referenciaFormateada
      ? `${saludoHorario} estimado(a) ${referenciaFormateada},`
      : `${saludoHorario} estimado(a),`;

    const detalleProducto = producto
      ? `Detalle del producto: ${producto}`
      : 'Detalle del producto: ';

    const mensajeLineas = [
      saludoLinea,
      'Espero se encuentre muy bien.',
      '',
      'Me podría ayudar con la disponibilidad y el precio de:',
      detalleProducto,
      '',
      'De antemano agradezco su pronta respuesta.',
    ];

    return mensajeLineas.join('\n').trim();
  },

  verCatalogo(proveedorId) {
    const proveedor = Database.getItem('proveedores', proveedorId);
    if (!proveedor) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalCatalogoProveedor';

    const especialidadesProveedor = (proveedor.especialidades || [])
      .map((clave) => {
        const data = this.especialidades[clave];
        if (!data) return null;
        return {
          clave,
          data,
        };
      })
      .filter(Boolean);

    const productosPersonalizados = Array.isArray(proveedor.productosSuministrados)
      ? proveedor.productosSuministrados.filter(Boolean)
      : [];

    modal.innerHTML = `
            <div class="modal-container modal-lg">
                <div class="modal-header">
                    <h3><i class="fas fa-book-open"></i> Catálogo - ${proveedor.nombre}</h3>
                    <button class="btn-close" onclick="document.getElementById('modalCatalogoProveedor').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="proveedor-info-header">
                        <div class="proveedor-datos">
                            <h4>${proveedor.nombre}</h4>
                            <p><i class="fas fa-phone"></i> ${proveedor.telefono || 'No disponible'}</p>
                            <p><i class="fas fa-truck-fast"></i> Entrega en ${proveedor.tiempoEntregaDias || 7} días</p>
                            <p><i class="fas fa-star"></i> Calificación: ${(proveedor.calificacion || 0).toFixed(1)}/5</p>
                        </div>
                    </div>
                    
                    <div class="especialidades-catalogo">
                        ${especialidadesProveedor
                          .map(({ clave, data }) => {
                            const productosEspecialidad = Array.isArray(data.productos)
                              ? data.productos
                              : [];
                            return `
                            <div class="especialidad-catalogo">
                                <h5><i class="${data.icono}"></i> ${data.nombre}</h5>
                                <div class="productos-especialidad">
                                    ${productosEspecialidad
                                      .map((producto) => {
                                        const productoVisible = Proveedores.escaparHtml(producto);
                                        const productoCodificado = encodeURIComponent(producto);
                                        return `
                                        <div class="producto-item">
                                            <span class="producto-nombre">${productoVisible}</span>
                                            <div class="producto-actions">
                                                <button class="btn btn-sm btn-outline-success" data-producto="${productoCodificado}" onclick="Proveedores.compartirCotizacionWhatsAppDesdeBoton('${proveedorId}', this)" title="Compartir por WhatsApp">
                                                    <i class="fab fa-whatsapp"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-primary" data-producto="${productoCodificado}" onclick="Proveedores.solicitarCotizacionDesdeBoton('${proveedorId}', this)" title="Enviar correo">
                                                    <i class="fas fa-envelope"></i>
                                                </button>
                                            </div>
                                        </div>`;
                                      })
                                      .join('')}
                                </div>
                            </div>`;
                          })
                          .join('')}
                    </div>

                    <div class="catalogo-productos-extra">
                        <div class="catalogo-productos-extra-header">
                            <h5><i class="fas fa-list"></i> Productos personalizados</h5>
                            <button class="btn btn-sm btn-outline-light" onclick="Proveedores.agregarProductoCatalogo('${proveedorId}')">
                                <i class="fas fa-plus-circle"></i> Agregar producto
                            </button>
                        </div>
                        ${
                          productosPersonalizados.length
                            ? `
                            <ul class="catalogo-productos-extra-lista">
                                ${productosPersonalizados
                                  .map((producto) => {
                                    const productoVisible = Proveedores.escaparHtml(producto);
                                    const productoCodificado = encodeURIComponent(producto);
                                    return `
                                        <li>
                                            <span>${productoVisible}</span>
                                            <div class="producto-actions">
                                                <button class="btn btn-xs btn-outline-success" data-producto="${productoCodificado}" onclick="Proveedores.compartirCotizacionWhatsAppDesdeBoton('${proveedorId}', this)" title="Compartir por WhatsApp">
                                                    <i class="fab fa-whatsapp"></i>
                                                </button>
                                                <button class="btn btn-xs btn-outline-primary" data-producto="${productoCodificado}" onclick="Proveedores.solicitarCotizacionDesdeBoton('${proveedorId}', this)" title="Enviar correo">
                                                    <i class="fas fa-envelope"></i>
                                                </button>
                                            </div>
                                        </li>`;
                                  })
                                  .join('')}
                            </ul>
                        `
                            : `
                            <p class="text-muted">Aún no has agregado productos personalizados para este proveedor.</p>
                        `
                        }
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
  },

  mostrarComparativa() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalComparativa';

    modal.innerHTML = `
            <div class="modal-container modal-xl">
                <div class="modal-header">
                    <h3><i class="fas fa-chart-line"></i> Comparativa de Proveedores</h3>
                    <button class="btn-close" onclick="document.getElementById('modalComparativa').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="comparativa-filters">
                        <select id="especialidadComparativa" class="form-control">
                            <option value="">Seleccionar especialidad</option>
                            ${Object.entries(this.especialidades)
                              .map(
                                ([key, esp]) => `
                                <option value="${key}">${esp.nombre}</option>
                            `
                              )
                              .join('')}
                        </select>
                        <button class="btn btn-primary" onclick="Proveedores.generarComparativa()">
                            <i class="fas fa-search"></i> Comparar
                        </button>
                    </div>
                    <div id="resultadosComparativa" class="comparativa-resultados">
                        <div class="empty-state">
                            <i class="fas fa-chart-bar"></i>
                            <p>Selecciona una especialidad para ver la comparativa</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
  },

  generarComparativa() {
    const especialidadKey = document.getElementById('especialidadComparativa').value;
    if (!especialidadKey) return;

    const proveedores = Database.getCollection('proveedores')
      .filter((p) => (p.especialidades || []).includes(especialidadKey) && p.activo)
      .sort((a, b) => (b.calificacion || 0) - (a.calificacion || 0));

    const especialidad = this.especialidades[especialidadKey];

    const resultados = document.getElementById('resultadosComparativa');
    resultados.innerHTML = `
            <h4><i class="${especialidad.icono}"></i> Proveedores de ${especialidad.nombre}</h4>
            <div class="comparativa-table">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Proveedor</th>
                            <th>Calificación</th>
                            <th>Tiempo Entrega</th>
                            <th>Total Comprado</th>
                            <th>Contacto</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${proveedores
                          .map(
                            (p) => `
                            <tr>
                                <td>
                                    <strong>${p.nombre}</strong><br>
                                    <small class="text-muted">${p.ciudad || 'Sin ubicación'}</small>
                                </td>
                                <td>
                                    <div class="rating-display">
                                        ${this.mostrarCalificacionCompacta(p.calificacion || 0)}
                                        <div class="rating-stars">
                                            ${this.renderEstrellas(p.calificacion || 0)}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge ${this.getTiempoEntregaClass(p.tiempoEntregaDias)}">
                                        ${this.obtenerTiempoEntregaTexto(p.tiempoEntregaDias)}
                                    </span>
                                </td>
                                <td>
                                    <strong>$${(p.totalComprado || 0).toLocaleString()}</strong>
                                </td>
                                <td>
                                    <div class="contactos-rapidos">
                                        ${p.telefono ? `<a href="tel:${p.telefono}" class="btn btn-sm btn-outline-success"><i class="fas fa-phone"></i></a>` : ''}
                                        ${p.email ? `<a href="mailto:${p.email}" class="btn btn-sm btn-outline-primary"><i class="fas fa-envelope"></i></a>` : ''}
                                    </div>
                                </td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn btn-sm btn-outline-info" onclick="Proveedores.verCatalogo('${p.id}')">
                                            <i class="fas fa-book"></i> Catálogo
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>
            </div>
        `;
  },

  getTiempoEntregaClass(dias) {
    if (!dias || dias <= 1) return 'badge-success';
    if (dias <= 3) return 'badge-info';
    if (dias <= 7) return 'badge-warning';
    return 'badge-danger';
  },

  renderEstrellas(calificacion) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= calificacion) {
        html += '<i class="fas fa-star rating-star rating-star-filled"></i>';
      } else {
        html += '<i class="far fa-star rating-star rating-star-empty"></i>';
      }
    }
    return html;
  },

  solicitarCotizacion(proveedorId, producto) {
    const proveedor = Database.getItem('proveedores', proveedorId);
    if (!proveedor) return;

    // Crear mensaje de WhatsApp o email
    const mensaje = `Hola, me interesa cotizar: ${producto}. ¿Podrían enviarme información de precios y disponibilidad?`;

    if (proveedor.telefono) {
      const whatsappUrl = `https://wa.me/${proveedor.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
      window.open(whatsappUrl, '_blank');
    } else if (proveedor.email) {
      const emailUrl = `mailto:${proveedor.email}?subject=Cotización ${producto}&body=${encodeURIComponent(mensaje)}`;
      window.open(emailUrl);
    } else {
      Utils.showToast('No hay información de contacto disponible', 'warning');
    }
  },

  generarReporte() {
    const proveedores = Database.getCollection('proveedores');
    const activos = proveedores.filter((p) => p.activo);

    // Generar reporte por especialidades
    const reportePorEspecialidad = {};
    Object.entries(this.especialidades).forEach(([key, esp]) => {
      reportePorEspecialidad[esp.nombre] = proveedores.filter((p) =>
        (p.especialidades || []).includes(key)
      ).length;
    });

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalReporte';

    modal.innerHTML = `
            <div class="modal-container modal-lg">
                <div class="modal-header">
                    <h3><i class="fas fa-file-pdf"></i> Reporte de Proveedores</h3>
                    <button class="btn-close" onclick="document.getElementById('modalReporte').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="reporte-stats">
                        <div class="stat-card">
                            <h4>Resumen General</h4>
                            <ul>
                                <li>Total Proveedores: <strong>${proveedores.length}</strong></li>
                                <li>Proveedores Activos: <strong>${activos.length}</strong></li>
                                <li>Proveedores Inactivos: <strong>${proveedores.length - activos.length}</strong></li>
                                <li>Calificación Promedio: <strong>${this.calcularCalificacionPromedio(activos).toFixed(1)}</strong></li>
                            </ul>
                        </div>
                        
                        <div class="stat-card">
                            <h4>Por Especialidad</h4>
                            <ul>
                                ${Object.entries(reportePorEspecialidad)
                                  .map(
                                    ([nombre, cantidad]) => `
                                    <li>${nombre}: <strong>${cantidad} proveedores</strong></li>
                                `
                                  )
                                  .join('')}
                            </ul>
                        </div>
                    </div>
                    
                    <div class="reporte-actions">
                        <button class="btn btn-success" onclick="Proveedores.exportarReporte()">
                            <i class="fas fa-download"></i> Exportar Excel
                        </button>
                        <button class="btn btn-info" onclick="Proveedores.imprimirReporte()">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
  },

  calcularCalificacionPromedio(proveedores) {
    if (proveedores.length === 0) return 0;
    const suma = proveedores.reduce((acc, p) => acc + (p.calificacion || 0), 0);
    return suma / proveedores.length;
  },

  async exportarReporte() {
    try {
      const proveedores = await Database.getCollection('proveedores');
      if (!proveedores || proveedores.length === 0) {
        Utils.showToast('No hay proveedores para exportar', 'warning');
        return;
      }

      // Crear CSV
      const headers = [
        'ID',
        'Nombre',
        'RUC',
        'Contacto',
        'Teléfono',
        'Email',
        'Ciudad',
        'Provincia',
        'Especialidades',
        'Calificación',
        'Estado',
        'Total Comprado',
        'Número Compras',
      ];
      const rows = proveedores.map((p) => [
        p.id || '',
        p.nombre || '',
        p.ruc || '',
        p.contacto || '',
        p.telefono || '',
        p.email || '',
        p.ciudad || '',
        p.provincia || '',
        (p.especialidades || []).join('; '),
        p.calificacion || 0,
        p.activo ? 'Activo' : 'Inactivo',
        p.totalComprado || 0,
        p.numeroCompras || 0,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      // Descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const fecha = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `proveedores_${fecha}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Utils.showToast('✓ Reporte exportado exitosamente', 'success');
    } catch (error) {
      console.error('Error al exportar reporte:', error);
      Utils.showToast('Error al exportar el reporte', 'error');
    }
  },

  imprimirReporte() {
    window.print();
  },

  async sincronizarConCatalogo() {
    try {
      const catalogo = Database.getCollection('catalogoTecnico') || [];

      const existentes = Database.getCollection('proveedores') || [];
      const indexPorClave = new Map();
      let cambio = false;
      const resultado = [];

      existentes.forEach((prov) => {
        const clave = this.normalizarClaveProveedor(prov?.nombre);
        if (!clave) {
          cambio = true;
          return;
        }

        const ubicacionActual = prov.direccion || prov.ciudad || prov.pais || '';
        const telefonoActual = prov.telefono || '';
        if (!this.esProveedorEcuatoriano(ubicacionActual, telefonoActual)) {
          cambio = true;
          return;
        }

        indexPorClave.set(clave, resultado.length);
        resultado.push(prov);
      });

      const agregados = new Map();
      (Array.isArray(catalogo) ? catalogo : []).forEach((item) => {
        const especialidad = this.mapearEspecialidadPorCategoria(
          item?.categoria,
          item?.subcategoria,
          item?.nombre
        );
        const categoria = item?.categoria || '';
        (item?.proveedores || []).forEach((prov) => {
          const nombre = prov?.nombre;
          if (!nombre) return;
          const clave = this.normalizarClaveProveedor(nombre);
          if (!clave) return;

          const ubicacionReferencia = prov?.ubicacion || prov?.ciudad || prov?.direccion || '';
          const telefonoReferencia = prov?.telefono || '';
          if (!this.esProveedorEcuatoriano(ubicacionReferencia, telefonoReferencia)) {
            return;
          }

          if (!agregados.has(clave)) {
            agregados.set(clave, {
              nombre,
              ids: new Set(),
              contactos: new Set(),
              telefonos: new Set(),
              whatsapp: new Set(),
              emails: new Set(),
              ubicaciones: new Set(),
              ciudades: new Set(),
              provincias: new Set(),
              paises: new Set(),
              notas: new Set(),
              especialidades: new Set(),
              categorias: new Set(),
              formasPago: new Set(),
              tiempos: [],
            });
          }

          const registro = agregados.get(clave);
          if (prov.id) registro.ids.add(prov.id);
          if (prov.contacto) registro.contactos.add(prov.contacto);
          if (prov.telefono) {
            const telefonoNormalizado = this.normalizarTelefono(prov.telefono.toString());
            if (telefonoNormalizado) {
              registro.telefonos.add(telefonoNormalizado);
            }
          }
          if (Array.isArray(prov.telefonos)) {
            prov.telefonos.filter(Boolean).forEach((tel) => {
              const normalizado = this.normalizarTelefono(tel.toString());
              if (normalizado) {
                registro.telefonos.add(normalizado);
              }
            });
          }
          if (Array.isArray(prov.whatsapp)) {
            prov.whatsapp.filter(Boolean).forEach((link) => {
              const enlace = this.normalizarEnlaceWhatsapp(link);
              if (enlace) {
                registro.whatsapp.add(enlace);
              }
              const numeroDesdeLink = this.extraerNumeroWhatsapp(link);
              if (numeroDesdeLink) {
                const telefonoDesdeLink = this.normalizarTelefono(numeroDesdeLink);
                if (telefonoDesdeLink) {
                  registro.telefonos.add(telefonoDesdeLink);
                }
              }
            });
          }
          if (prov.email) registro.emails.add(prov.email);
          if (prov.ubicacion) registro.ubicaciones.add(prov.ubicacion);
          if (!prov.ubicacion && prov.ciudad) registro.ubicaciones.add(prov.ciudad);
          if (prov.ciudad) registro.ciudades.add(this.formatearNombreEntidad(prov.ciudad));
          if (prov.provincia) registro.provincias.add(this.formatearNombreEntidad(prov.provincia));
          if (prov.pais) registro.paises.add(this.formatearNombreEntidad(prov.pais));
          if (prov.notas) registro.notas.add(prov.notas);
          if (prov.disponibilidad) registro.notas.add(`Disponibilidad: ${prov.disponibilidad}`);
          if (especialidad) registro.especialidades.add(especialidad);
          if (categoria && categoria !== 'General') registro.categorias.add(categoria);
          const tiempo = this.parseTiempoEntrega(prov.disponibilidad);
          if (tiempo !== null) registro.tiempos.push(tiempo);
        });
      });

      const datasetProveedores = await this.obtenerDatasetProveedoresEstaticos();
      (Array.isArray(datasetProveedores) ? datasetProveedores : []).forEach((prov) => {
        const nombre = prov?.nombre;
        if (!nombre) return;
        const clave = this.normalizarClaveProveedor(nombre);
        if (!clave) return;

        const telefonoReferencia =
          Array.isArray(prov?.telefonos) && prov.telefonos.length
            ? prov.telefonos[0]
            : prov?.telefono || '';
        const ubicacionReferencia =
          prov?.direccion ||
          `${prov?.ciudad || ''} ${prov?.provincia || ''}`.trim() ||
          prov?.pais ||
          '';

        if (!this.esProveedorEcuatoriano(ubicacionReferencia, telefonoReferencia)) {
          return;
        }

        if (!agregados.has(clave)) {
          agregados.set(clave, {
            nombre,
            ids: new Set(),
            contactos: new Set(),
            telefonos: new Set(),
            whatsapp: new Set(),
            emails: new Set(),
            ubicaciones: new Set(),
            ciudades: new Set(),
            provincias: new Set(),
            paises: new Set(),
            notas: new Set(),
            especialidades: new Set(),
            categorias: new Set(),
            formasPago: new Set(),
            tiempos: [],
          });
        }

        const registro = agregados.get(clave);
        registro.ids.add(prov.id || `prov-${clave}`);
        if (prov.contacto) registro.contactos.add(prov.contacto);

        const telefonos = Array.isArray(prov.telefonos)
          ? prov.telefonos
          : prov.telefono
            ? [prov.telefono]
            : [];
        telefonos.filter(Boolean).forEach((tel) => {
          const normalizado = this.normalizarTelefono(tel.toString());
          if (normalizado) registro.telefonos.add(normalizado);
        });

        const whatsappLinks = Array.isArray(prov.whatsapp) ? prov.whatsapp : [];
        whatsappLinks.filter(Boolean).forEach((link) => {
          const enlace = this.normalizarEnlaceWhatsapp(link);
          if (enlace) {
            registro.whatsapp.add(enlace);
          }
          const numeroDesdeLink = this.extraerNumeroWhatsapp(link);
          if (numeroDesdeLink) {
            const telefonoDesdeLink = this.normalizarTelefono(numeroDesdeLink);
            if (telefonoDesdeLink) {
              registro.telefonos.add(telefonoDesdeLink);
            }
          }
        });

        const emails = Array.isArray(prov.emails) ? prov.emails : prov.email ? [prov.email] : [];
        emails.filter(Boolean).forEach((correo) => registro.emails.add(correo));

        if (prov.direccion) registro.ubicaciones.add(prov.direccion);
        if (prov.ciudad) registro.ciudades.add(this.formatearNombreEntidad(prov.ciudad));
        if (prov.provincia) registro.provincias.add(this.formatearNombreEntidad(prov.provincia));
        if (prov.pais) registro.paises.add(this.formatearNombreEntidad(prov.pais));

        const notas = Array.isArray(prov.notas) ? prov.notas : prov.notas ? [prov.notas] : [];
        notas.filter(Boolean).forEach((nota) => registro.notas.add(nota));

        const especialidadesDataset = Array.isArray(prov.categorias) ? prov.categorias : [];
        especialidadesDataset.filter(Boolean).forEach((esp) => registro.especialidades.add(esp));

        const categoriasDataset = Array.isArray(prov.productos) ? prov.productos : [];
        categoriasDataset
          .filter(Boolean)
          .forEach((categoriaNombre) => registro.categorias.add(categoriaNombre));

        if (prov.formaPago) registro.formasPago.add(prov.formaPago);

        const tiempoNumero = Number(prov.diasEntrega);
        if (!Number.isNaN(tiempoNumero) && tiempoNumero > 0) {
          registro.tiempos.push(tiempoNumero);
        }
      });

      if (!agregados.size) {
        if (this.integrarProveedoresBase(resultado, indexPorClave)) {
          cambio = true;
        }
        if (cambio) {
          Database.saveCollection('proveedores', resultado);
        }
        return;
      }

      agregados.forEach((registro, clave) => {
        const index = indexPorClave.get(clave);
        const tiempoEntrega = registro.tiempos.length ? Math.min(...registro.tiempos) : null;
        const ubicacion = this.obtenerPrimero(registro.ubicaciones);
        const ciudad =
          this.obtenerPrimero(registro.ciudades) ||
          this.formatearNombreEntidad(this.extraerCiudad(ubicacion));
        const provincia =
          this.obtenerPrimero(registro.provincias) || this.detectarProvincia(ubicacion);
        const telefonosLista = this.ordenarTelefonos(Array.from(registro.telefonos));
        const telefono = telefonosLista[0] || '';
        const email = this.obtenerPrimero(registro.emails);
        const contacto = this.obtenerPrimero(registro.contactos);
        const pais = this.obtenerPrimero(registro.paises) || 'Ecuador';
        const formaPagoPreferida = this.obtenerPrimero(registro.formasPago);
        const notasCatalogo = this.unirNotas('', registro.notas);
        const especialidades = Array.from(registro.especialidades);
        if (!especialidades.length) {
          especialidades.push('repuestos_motor');
        }
        const categorias = Array.from(registro.categorias).slice(0, 15);
        const ids = Array.from(registro.ids);
        const whatsappLista = this.generarWhatsappLinks(
          telefonosLista,
          Array.from(registro.whatsapp)
        );

        if (typeof index === 'number') {
          const actual = resultado[index];
          const updates = {};

          if (contacto && !actual.contacto) updates.contacto = contacto;
          if (telefono) {
            const telefonoActualNormalizado = this.normalizarTelefono(actual.telefono || '');
            if (!telefonoActualNormalizado || telefonoActualNormalizado !== telefono) {
              updates.telefono = telefono;
            }
          }
          if (telefonosLista.length) {
            const telefonosActuales = this.ordenarTelefonos(
              Array.isArray(actual.telefonos) ? actual.telefonos : []
            );
            if (!this.sonListasIguales(telefonosActuales, telefonosLista)) {
              updates.telefonos = telefonosLista;
            }
          }
          if (whatsappLista.length) {
            const whatsappActuales = (Array.isArray(actual.whatsapp) ? actual.whatsapp : [])
              .map((link) => this.normalizarEnlaceWhatsapp(link))
              .filter(Boolean);
            if (!this.sonListasIguales(whatsappActuales, whatsappLista)) {
              updates.whatsapp = whatsappLista;
            }
          }
          if (email && !actual.email) updates.email = email;
          if (ubicacion && !actual.direccion) updates.direccion = ubicacion;
          if (ciudad && !actual.ciudad) updates.ciudad = ciudad;
          if (provincia && !actual.provincia) updates.provincia = provincia;
          if (pais && !actual.pais) updates.pais = pais;
          if (formaPagoPreferida && !actual.formaPago) updates.formaPago = formaPagoPreferida;

          if (tiempoEntrega !== null) {
            const actualDias = actual.tiempoEntregaDias || actual.diasEntrega;
            if (!actualDias || actualDias > tiempoEntrega) {
              updates.tiempoEntregaDias = tiempoEntrega;
              updates.diasEntrega = tiempoEntrega;
            }
          }

          if (especialidades.length) {
            const existentesEspecialidades = this.unirListas(actual.especialidades, []);
            const combinadas = this.unirListas(actual.especialidades, especialidades);
            if (combinadas.length !== existentesEspecialidades.length) {
              updates.especialidades = combinadas;
            }
          }

          if (categorias.length) {
            const existentesCategorias = this.unirListas(actual.productosSuministrados, []);
            const combinadasCategorias = this.unirListas(actual.productosSuministrados, categorias);
            if (combinadasCategorias.length !== existentesCategorias.length) {
              updates.productosSuministrados = combinadasCategorias;
            }
          }

          if (notasCatalogo) {
            const notasUnidas = this.unirNotas(actual.notas || '', registro.notas);
            if (notasUnidas !== (actual.notas || '')) {
              updates.notas = notasUnidas;
            }
          }

          if (Object.keys(updates).length) {
            updates.updatedAt = new Date().toISOString();
            resultado[index] = { ...actual, ...updates };
            cambio = true;
          }
        } else {
          const nuevo = {
            id: ids.find(Boolean) || Utils.generateId('prov'),
            nombre: registro.nombre,
            ruc: '',
            contacto: contacto || '',
            telefono: telefono || '',
            telefonos: telefonosLista,
            whatsapp: whatsappLista,
            email: email || '',
            direccion: ubicacion || '',
            ciudad: ciudad || '',
            provincia: provincia || '',
            pais: pais,
            diasEntrega: tiempoEntrega ?? 7,
            tiempoEntregaDias: tiempoEntrega ?? 7,
            formaPago: formaPagoPreferida || '',
            plazoCredito: 0,
            calificacion: 0,
            notas: notasCatalogo,
            especialidades,
            productosSuministrados: categorias,
            activo: true,
            stockDisponible: true,
            totalComprado: 0,
            numeroCompras: 0,
            compraPromedio: 0,
            saldoPendiente: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          resultado.push(nuevo);
          indexPorClave.set(clave, resultado.length - 1);
          cambio = true;
        }
      });

      if (this.integrarProveedoresBase(resultado, indexPorClave)) {
        cambio = true;
      }

      if (cambio) {
        Database.saveCollection('proveedores', resultado);
      }
    } catch (error) {
      console.warn('Proveedores: no se pudo sincronizar con el catálogo técnico', error);
    }
  },

  async obtenerDatasetProveedoresEstaticos() {
    if (Array.isArray(this.datasetProveedoresCache)) {
      return this.datasetProveedoresCache;
    }

    try {
      const respuesta = await fetch('docs/catalogo_proveedores.json', { cache: 'no-store' });
      if (!respuesta.ok) {
        // Archivo no existe - fallback silencioso
        console.info('ℹ️ Catálogo de proveedores estático no disponible (característica opcional)');
        this.datasetProveedoresCache = [];
        return [];
      }
      const data = await respuesta.json();
      const proveedores = Array.isArray(data?.proveedores)
        ? data.proveedores
        : Array.isArray(data)
          ? data
          : [];
      this.datasetProveedoresCache = proveedores;
      return proveedores;
    } catch (error) {
      // Error de red o parsing - silencioso
      console.info('ℹ️ Catálogo de proveedores estático no disponible (característica opcional)');
      this.datasetProveedoresCache = [];
      return [];
    }
  },

  normalizarClaveProveedor(nombre) {
    if (!nombre || typeof nombre !== 'string') return '';
    return nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  },

  obtenerNombreProvinciaDesdeSlug(slug = '') {
    if (!slug) return '';
    const normalizado = this.normalizarTexto(slug);
    const encontrado = this.provinciasEcuador.find((prov) => prov.id === normalizado);
    if (encontrado) {
      return encontrado.nombre;
    }
    return this.formatearNombreEntidad(slug);
  },

  formatearNombreEntidad(nombre = '') {
    if (!nombre) return '';
    return nombre
      .toString()
      .trim()
      .split(/\s+/)
      .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
      .join(' ');
  },

  detectarProvincia(texto = '') {
    if (!texto) return '';
    const normalizado = this.normalizarTexto(texto);
    for (const provincia of this.provinciasEcuador) {
      if (normalizado.includes(provincia.id)) {
        return provincia.nombre;
      }
    }
    return '';
  },

  mapearEspecialidadPorCategoria(categoria = '', subcategoria = '', nombreProducto = '') {
    const texto = `${categoria} ${subcategoria} ${nombreProducto}`.toLowerCase();
    if (!texto.trim()) {
      return 'repuestos_motor';
    }
    if (/freno|suspens|amortiguador|rotu|muelle/.test(texto)) return 'frenos_suspension';
    if (/inyector|motor|correa|piston|valvula|bomba de agua|culata|distribucion/.test(texto))
      return 'repuestos_motor';
    if (/electr(i|í)c|sensor|alternador|ecu|bateri|arrancador/.test(texto))
      return 'electrico_electronico';
    if (/carrocer|pintur|parachoque|far(o|o)/.test(texto)) return 'carroceria_pintura';
    if (/llanta|rin|neumatico|balance/.test(texto)) return 'llantas_rines';
    if (/aceite|lubric|refrigerante|atf/.test(texto)) return 'aceites_lubricantes';
    if (/combustible|inyector|filtro de combustible|bomba de gasolina/.test(texto))
      return 'aire_combustible';
    if (/herramienta|elevador|compresor|scanner|soldadora/.test(texto))
      return 'herramientas_equipos';
    return 'repuestos_motor';
  },

  parseTiempoEntrega(texto) {
    if (!texto || typeof texto !== 'string') return null;
    const lower = texto.toLowerCase();
    const horas = lower.match(/(\d+)\s*h/);
    if (horas) {
      const horasNumero = Number(horas[1]);
      if (!Number.isNaN(horasNumero)) {
        return Math.max(1, Math.ceil(horasNumero / 24));
      }
    }
    const dias = lower.match(/(\d+)\s*d(i|í)as?/);
    if (dias) {
      const diasNumero = Number(dias[1]);
      if (!Number.isNaN(diasNumero)) {
        return diasNumero;
      }
    }
    const semanas = lower.match(/(\d+)\s*sem/);
    if (semanas) {
      const semanasNumero = Number(semanas[1]);
      if (!Number.isNaN(semanasNumero)) {
        return semanasNumero * 7;
      }
    }
    const numero = lower.match(/(\d+)/);
    if (numero) {
      const valor = Number(numero[1]);
      if (!Number.isNaN(valor)) {
        if (lower.includes('hora')) {
          return Math.max(1, Math.ceil(valor / 24));
        }
        if (lower.includes('sem')) {
          return valor * 7;
        }
        return valor;
      }
    }
    return null;
  },

  extraerCiudad(ubicacion = '') {
    if (!ubicacion || typeof ubicacion !== 'string') return '';
    const matchExpreso = ubicacion.match(/en\s+([a-záéíóúñ\s]+)/i);
    if (matchExpreso && matchExpreso[1]) {
      return matchExpreso[1].trim();
    }
    const partes = ubicacion
      .split(',')
      .map((parte) => parte.trim())
      .filter(Boolean);
    if (!partes.length) {
      return ubicacion.trim();
    }
    if (/ecuador/i.test(partes[0]) && partes.length > 1) {
      return partes[1];
    }
    return partes[0];
  },

  normalizarTelefono(valor) {
    if (valor === null || typeof valor === 'undefined') {
      return '';
    }
    const texto = valor.toString().trim();
    if (!texto) {
      return '';
    }
    const digitos = texto.replace(/\D+/g, '');
    if (!digitos) {
      return texto.replace(/\s+/g, '');
    }
    if (digitos.startsWith('00') && digitos.length > 2) {
      return `+${digitos.slice(2)}`;
    }
    if (digitos.startsWith('593')) {
      const resto = digitos.slice(3);
      return resto ? `+593${resto}` : '+593';
    }
    if (digitos.startsWith('0') && digitos.length >= 9) {
      const resto = digitos.slice(1);
      return `+593${resto}`;
    }
    if (digitos.startsWith('9') && digitos.length === 9) {
      return `+593${digitos}`;
    }
    if (texto.startsWith('+')) {
      return texto.replace(/\s+/g, '');
    }
    return `+${digitos}`;
  },

  normalizarTexto(texto = '') {
    return texto
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  },

  esProveedorEcuatoriano(ubicacion = '', telefono = '') {
    const texto = this.normalizarTexto(ubicacion);
    if (texto) {
      if (texto.includes('ecuador')) {
        return true;
      }
      if (this.ciudadesEcuador.some((ciudad) => texto.includes(ciudad))) {
        return true;
      }
      if (
        /(usa|miami|peru|colombia|argentina|chile|brasil|mexico|panama|japon|jap|spain|espa|canada|canad)/.test(
          texto
        )
      ) {
        return false;
      }
    }

    const numero = this.normalizarTelefono(telefono);
    if (numero) {
      if (numero.startsWith('+') && !numero.startsWith('+593')) {
        return false;
      }
      if (numero.startsWith('+593') || numero.startsWith('593')) {
        return true;
      }
      if (numero.startsWith('0') && numero.length >= 9 && numero.length <= 10) {
        return true;
      }
    }

    return false;
  },

  obtenerMapaProveedoresBase() {
    const mapa = window.CatalogoProveedoresInfo;
    if (mapa && typeof mapa === 'object') {
      return mapa;
    }
    return this.proveedoresBaseFallback;
  },

  crearProveedorBaseDesdeInfo(nombre, info = {}) {
    if (!nombre) {
      return null;
    }

    const direccion = info.direccion || info.ubicacion || '';
    const telefono = info.telefono || '';
    if (!this.esProveedorEcuatoriano(direccion, telefono)) {
      return null;
    }

    const clave = this.normalizarClaveProveedor(nombre);
    const id = info.id || (clave ? `prov-${clave}` : Utils.generateId('prov'));
    const ciudad = this.extraerCiudad(direccion);
    const now = new Date().toISOString();
    const telefonoNormalizado = this.normalizarTelefono(telefono);
    const telefonosIniciales = [];
    if (telefonoNormalizado) {
      telefonosIniciales.push(telefonoNormalizado);
    }
    if (Array.isArray(info.telefonos)) {
      info.telefonos.filter(Boolean).forEach((tel) => telefonosIniciales.push(tel));
    }
    const telefonosLista = this.ordenarTelefonos(telefonosIniciales);
    const whatsappLista = this.generarWhatsappLinks(
      telefonosLista,
      Array.isArray(info.whatsapp) ? info.whatsapp : []
    );

    return {
      id,
      nombre,
      ruc: info.ruc || '',
      contacto: info.contacto || '',
      telefono: telefonosLista[0] || telefonoNormalizado || '',
      telefonos: telefonosLista,
      whatsapp: whatsappLista,
      email: info.email || '',
      direccion,
      ciudad,
      pais: 'Ecuador',
      diasEntrega: info.diasEntrega || 3,
      tiempoEntregaDias: info.diasEntrega || 3,
      formaPago: info.formaPago || '',
      plazoCredito: info.plazoCredito || 0,
      calificacion: info.calificacion || 0,
      notas: info.notas || '',
      especialidades: info.especialidades || ['repuestos_motor'],
      productosSuministrados: info.productosSuministrados || [],
      activo: info.activo !== false,
      stockDisponible: info.stockDisponible !== false,
      totalComprado: info.totalComprado || 0,
      numeroCompras: info.numeroCompras || 0,
      compraPromedio: info.compraPromedio || 0,
      saldoPendiente: info.saldoPendiente || 0,
      createdAt: info.createdAt || now,
      updatedAt: info.updatedAt || now,
    };
  },

  integrarProveedoresBase(resultado, indexPorClave) {
    const mapa = this.obtenerMapaProveedoresBase();
    if (!mapa) {
      return false;
    }

    let huboCambio = false;

    Object.entries(mapa).forEach(([nombre, info]) => {
      const clave = this.normalizarClaveProveedor(nombre);
      if (!clave) {
        return;
      }

      const base = this.crearProveedorBaseDesdeInfo(nombre, info);
      if (!base) {
        return;
      }

      if (indexPorClave.has(clave)) {
        const indice = indexPorClave.get(clave);
        const actual = resultado[indice];
        const updates = {};

        if (base.contacto && !actual.contacto) updates.contacto = base.contacto;
        if (base.email && !actual.email) updates.email = base.email;

        const telefonosActuales = this.ordenarTelefonos(
          Array.isArray(actual.telefonos) ? actual.telefonos : []
        );
        const telefonosBase = this.ordenarTelefonos(
          Array.isArray(base.telefonos) ? base.telefonos : base.telefono ? [base.telefono] : []
        );
        let telefonosCombinados = telefonosActuales;
        if (telefonosBase.length) {
          telefonosCombinados = this.ordenarTelefonos([...telefonosActuales, ...telefonosBase]);
          if (!this.sonListasIguales(telefonosActuales, telefonosCombinados)) {
            updates.telefonos = telefonosCombinados;
          }
        }

        const telefonoPrincipal =
          (updates.telefonos || telefonosCombinados)[0] ||
          this.normalizarTelefono(base.telefono || '');
        if (telefonoPrincipal) {
          const telefonoActualNormalizado = this.normalizarTelefono(actual.telefono || '');
          if (!telefonoActualNormalizado || telefonoActualNormalizado !== telefonoPrincipal) {
            updates.telefono = telefonoPrincipal;
          }
        }

        const whatsappActuales = (Array.isArray(actual.whatsapp) ? actual.whatsapp : [])
          .map((link) => this.normalizarEnlaceWhatsapp(link))
          .filter(Boolean);
        const whatsappBase = Array.isArray(base.whatsapp)
          ? base.whatsapp.map((link) => this.normalizarEnlaceWhatsapp(link)).filter(Boolean)
          : [];
        if (whatsappBase.length || (updates.telefonos && updates.telefonos.length)) {
          const referenciaTelefonos = updates.telefonos || telefonosCombinados;
          const whatsappCombinados = this.generarWhatsappLinks(referenciaTelefonos, [
            ...whatsappActuales,
            ...whatsappBase,
          ]);
          if (!this.sonListasIguales(whatsappActuales, whatsappCombinados)) {
            updates.whatsapp = whatsappCombinados;
          }
        }
        if (base.direccion && !actual.direccion) updates.direccion = base.direccion;
        if (base.ciudad && !actual.ciudad) updates.ciudad = base.ciudad;
        if (!actual.pais) updates.pais = 'Ecuador';

        const especialidades = this.unirListas(actual.especialidades, base.especialidades);
        if (especialidades.length !== (actual.especialidades || []).length) {
          updates.especialidades = especialidades;
        }

        const productos = this.unirListas(
          actual.productosSuministrados,
          base.productosSuministrados
        ).slice(0, 15);
        if (productos.length !== (actual.productosSuministrados || []).length) {
          updates.productosSuministrados = productos;
        }

        const notasSet = new Set();
        if (base.notas) {
          notasSet.add(base.notas);
        }
        const notasUnidas = this.unirNotas(actual.notas || '', notasSet);
        if (notasUnidas && notasUnidas !== (actual.notas || '')) {
          updates.notas = notasUnidas;
        }

        if (!actual.tiempoEntregaDias && base.tiempoEntregaDias) {
          updates.tiempoEntregaDias = base.tiempoEntregaDias;
          updates.diasEntrega = base.tiempoEntregaDias;
        }

        if (Object.keys(updates).length) {
          updates.updatedAt = new Date().toISOString();
          resultado[indice] = { ...actual, ...updates };
          huboCambio = true;
        }
      } else {
        indexPorClave.set(clave, resultado.length);
        resultado.push(base);
        huboCambio = true;
      }
    });

    return huboCambio;
  },

  unirListas(actual, nuevos) {
    const set = new Set();
    if (Array.isArray(actual)) {
      actual.filter(Boolean).forEach((item) => set.add(item));
    }
    if (Array.isArray(nuevos)) {
      nuevos.filter(Boolean).forEach((item) => set.add(item));
    }
    return Array.from(set);
  },

  unirNotas(actual, notasSet) {
    const set = new Set();
    if (actual) {
      actual.split('|').forEach((parte) => {
        const texto = parte.trim();
        if (texto) {
          set.add(texto);
        }
      });
    }
    notasSet.forEach((nota) => {
      if (!nota) return;
      nota.split('|').forEach((parte) => {
        const texto = parte.trim();
        if (texto) {
          set.add(texto);
        }
      });
    });
    return Array.from(set).join(' | ');
  },

  obtenerPrimero(setEstructura) {
    if (!setEstructura || typeof setEstructura.values !== 'function') {
      return '';
    }
    const iterador = setEstructura.values().next();
    return iterador && !iterador.done ? iterador.value : '';
  },

  ordenarTelefonos(lista = []) {
    const origen = Array.isArray(lista) ? lista : [];
    const set = new Set();
    const normalizados = [];
    origen.forEach((tel) => {
      if (!tel) {
        return;
      }
      const normalizado = this.normalizarTelefono(tel.toString());
      if (normalizado && !set.has(normalizado)) {
        set.add(normalizado);
        normalizados.push(normalizado);
      }
    });
    const principal = this.seleccionarTelefonoPrincipal(normalizados);
    if (!principal) {
      return normalizados;
    }
    return [principal, ...normalizados.filter((tel) => tel !== principal)];
  },

  seleccionarTelefonoPrincipal(lista = []) {
    const origen = Array.isArray(lista) ? lista : [];
    const celulares = origen.filter((tel) => Boolean(this.extraerNumeroWhatsapp(tel)));
    if (celulares.length) {
      return celulares[0];
    }
    return origen[0] || '';
  },

  sonListasIguales(a = [], b = []) {
    const listaA = Array.isArray(a) ? a : [];
    const listaB = Array.isArray(b) ? b : [];
    if (listaA.length !== listaB.length) {
      return false;
    }
    return listaA.every((valor, index) => valor === listaB[index]);
  },

  extraerNumeroWhatsapp(origen) {
    if (!origen) {
      return '';
    }
    const texto = origen.toString();
    const matchLink = texto.match(/(?:wa\.me\/|phone=)(\d{9,15})/i);
    if (matchLink && matchLink[1]) {
      return this.extraerNumeroWhatsapp(matchLink[1]);
    }
    const digitos = texto.replace(/\D+/g, '');
    if (!digitos) {
      return '';
    }
    if (digitos.startsWith('593')) {
      const resto = digitos.slice(3);
      if (resto.length === 9 && resto.startsWith('9')) {
        return `593${resto}`;
      }
      return '';
    }
    if (digitos.startsWith('09') && digitos.length === 10) {
      return `593${digitos.slice(1)}`;
    }
    if (digitos.startsWith('9') && digitos.length === 9) {
      return `593${digitos}`;
    }
    return '';
  },

  normalizarEnlaceWhatsapp(enlace) {
    const numero = this.extraerNumeroWhatsapp(enlace);
    return numero ? `https://wa.me/${numero}` : '';
  },

  generarWhatsappLinks(telefonos = [], existentes = []) {
    const set = new Set();
    (Array.isArray(telefonos) ? telefonos : []).forEach((tel) => {
      const numero = this.extraerNumeroWhatsapp(tel);
      if (numero) {
        set.add(`https://wa.me/${numero}`);
      }
    });
    (Array.isArray(existentes) ? existentes : []).forEach((link) => {
      const normalizado = this.normalizarEnlaceWhatsapp(link);
      if (normalizado) {
        set.add(normalizado);
      }
    });
    return Array.from(set);
  },

  formatearTelefonoVisual(numero) {
    if (!numero) {
      return '';
    }
    const digitos = numero.toString().replace(/\D+/g, '');
    if (!digitos) {
      return numero;
    }
    if (digitos.startsWith('593')) {
      const resto = digitos.slice(3);
      if (resto.length === 9) {
        return `+593 ${resto.slice(0, 3)} ${resto.slice(3, 6)} ${resto.slice(6)}`;
      }
      if (resto.length === 8) {
        return `+593 ${resto.slice(0, 2)} ${resto.slice(2, 5)} ${resto.slice(5)}`;
      }
      return `+593 ${resto}`;
    }
    if (digitos.length >= 10) {
      return `+${digitos}`;
    }
    return numero;
  },

  // ============================================
  // ELIMINAR
  // ============================================
  async confirmarEliminacion(proveedorId) {
    const proveedor = await Database.getItem('proveedores', proveedorId);
    if (!proveedor) {
      Utils.showToast('Proveedor no encontrado', 'error');
      return;
    }

    // Verificar si tiene compras asociadas
    const compras = await Database.getCollection('compras');
    const comprasProveedor = compras.filter((c) => c.proveedorId === proveedorId);

    let mensaje = `¿Estás seguro de eliminar el proveedor "${proveedor.nombre}"?`;
    if (comprasProveedor.length > 0) {
      mensaje += `\n\nEste proveedor tiene ${comprasProveedor.length} compra(s) registrada(s).\nLos registros de compras se mantendrán, pero perderás la referencia al proveedor.`;
    }

    Utils.showConfirm(mensaje, () => this.eliminar(proveedorId));
  },

  async eliminar(proveedorId) {
    await Database.deleteItem('proveedores', proveedorId);
    Utils.showToast('✓ Proveedor eliminado correctamente', 'success');

    // Actualizar sin recargar
    if (window.DataRefreshManager) {
      const container = document.querySelector('.page-content');
      if (container) this.render(container);
    } else {
      App.loadModule('proveedores');
    }
  },
};
