/* ========================================
   MÓDULO CATÁLOGO TÉCNICO MECÁNICO
   ======================================== */

(function () {
  const PLANTILLA = /* html */ `
    <div class="catalogo-modulo">
      <div class="catalogo-header card">
        <div class="catalogo-header-main">
          <div class="catalogo-title">
            <h2>Catálogo Técnico</h2>
            <p class="text-muted">Centraliza fichas técnicas, proveedores y compatibilidades para tu taller.</p>
          </div>
          <div class="catalogo-actions">
            <button class="btn btn-outline" data-action="abrir-compras">
              <i class="fas fa-clipboard-list"></i>
              Compras por hacer
              <span class="badge badge-info" data-ref="contador-compra">0</span>
            </button>
            <button class="btn btn-outline" data-action="limpiar-filtros">
              <i class="fas fa-eraser"></i>
              Limpiar filtros
            </button>
            <button class="btn btn-outline" data-action="documentacion">
              <i class="fas fa-book"></i>
              Guía de uso
            </button>
          </div>
        </div>
        <div class="catalogo-busqueda">
          <div class="catalogo-busqueda-input">
            <i class="fas fa-search"></i>
            <input type="search" placeholder="Busca por nombre, SKU, proveedor, compatibilidad…" data-ref="input-busqueda">
            <div class="catalogo-sugerencias" data-ref="sugerencias"></div>
          </div>
          <div class="catalogo-filtros">
            <div class="filtro">
              <label>Categoría</label>
              <select data-filter="categoria">
                <option value="">Todas</option>
              </select>
            </div>
            <div class="filtro">
              <label>Sistema</label>
              <select data-filter="subcategoria">
                <option value="">Todos</option>
              </select>
            </div>
            <div class="filtro">
              <label>Proveedor</label>
              <select data-filter="proveedor">
                <option value="">Cualquiera</option>
              </select>
            </div>
            <div class="filtro">
              <label>Estado</label>
              <select data-filter="estado">
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="en validacion">En validación</option>
                <option value="descontinuado">Descontinuado</option>
              </select>
            </div>
            <div class="filtro filtro-texto">
              <label>Compatibilidad</label>
              <input type="text" placeholder="Ej. Mazda CX-5" data-filter="compatibilidad">
            </div>
          </div>
        </div>
      </div>

      <div class="catalogo-layout">
        <div class="catalogo-list card">
          <div class="catalogo-list-header">
            <h3>Resultados</h3>
            <span class="text-muted" data-ref="resumen-lista">Cargando…</span>
          </div>
          <div class="catalogo-list-body" data-ref="lista"></div>
        </div>
      </div>

      <!-- Modal flotante para detalles -->
      <div class="catalogo-detalle-modal" data-ref="modal-detalle">
        <div class="catalogo-detalle-container">
          <div class="catalogo-detalle-header">
            <div>
              <h3>Detalles del producto</h3>
            </div>
            <div class="catalogo-detalle-actions">
              <button class="btn btn-link" data-action="cerrar-modal" title="Cerrar">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          <div class="catalogo-detalle-body" data-ref="detalle">
            <div class="catalogo-placeholder">
              <i class="fas fa-tools"></i>
              <p>Selecciona un ítem para ver la ficha técnica completa.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const SEED_CATALOGO = [
    {
      id: 'cat-001',
      sku: 'BOM-MZD-CX5-001',
      nombre: 'Bomba de gasolina Mazda CX-5',
      categoria: 'Sistema de alimentación',
      subcategoria: 'Sistema de combustible',
      descripcion: 'Bomba eléctrica de combustible para Mazda CX-5 2.5L.',
      aplicaciones: ['Abastecimiento de combustible estable', 'Evita tirones en aceleración'],
      compatibilidad: [
        {
          marca: 'Mazda',
          modelo: 'CX-5',
          anios: '2017-2022',
          motor: '2.5L SKYACTIV',
          detalle: 'Incluye kit completo',
          notas: '',
        },
      ],
      especificaciones: {
        tension: '12V',
        presionTrabajo: '3.5 bar',
        caudal: '120 L/h',
        fabricante: 'Denso',
      },
      procedimientos: [
        'Despresurizar el sistema de combustible antes del desmontaje.',
        'Verificar conectores eléctricos y sellos antes de instalar.',
        'Realizar prueba de presión posterior a la instalación.',
      ],
      fotoUrl: '',
      proveedores: [
        {
          id: 'prov-ecu',
          nombre: 'Autorepuestos Ecuador',
          contacto: 'Andrea Viteri',
          telefono: '+593 98 555 2010',
          email: 'ventas@autorepuestos.ec',
          ubicacion: 'Quito',
          costoReferencial: 185,
          disponibilidad: '48h',
          notas: 'Incluye garantía 6 meses',
        },
        {
          id: 'prov-tecnova',
          nombre: 'Tecnova S.A.',
          contacto: 'Equipo comercial',
          telefono: '+593 4 268 2500',
          email: 'ventas@tecnova.com.ec',
          ubicacion: 'Guayaquil, Ecuador',
          costoReferencial: 180,
          disponibilidad: 'Entrega 48h en Guayas',
          notas: 'Distribuidor autorizado Bosch en Ecuador',
        },
      ],
      palabrasClave: ['bomba', 'combustible', 'mazda', 'cx5', 'denso'],
      estado: 'activo',
      ultimaRevision: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'cat-002',
      sku: 'KIT-CORR-TYH-008',
      nombre: 'Kit de correa de distribución Toyota Hilux 3.0',
      categoria: 'Sistema de distribución',
      subcategoria: 'Correas y tensores',
      descripcion: 'Kit completo de correa dentada, tensor y bomba de agua.',
      aplicaciones: ['Mantenimiento preventivo', 'Sincronización de motor'],
      compatibilidad: [
        {
          marca: 'Toyota',
          modelo: 'Hilux',
          anios: '2005-2015',
          motor: '3.0 D-4D',
          detalle: 'Motor 1KD-FTV',
          notas: 'No compatible con versiones 2.5L',
        },
      ],
      especificaciones: {
        fabricante: 'Gates',
        referencia: 'TCKWP257',
        kilometrajeRecomendado: '100000 km',
        incluye: 'Correa, tensor, bomba de agua',
      },
      procedimientos: [
        'Bloquear cigüeñal y leva con herramienta de sincronización.',
        'Reemplazar bomba de agua y rellenar refrigerante.',
        'Verificar tensión con torquímetro.',
      ],
      fotoUrl: '',
      proveedores: [
        {
          id: 'prov-gates',
          nombre: 'Distribuciones Gates EC',
          contacto: 'Luis Naranjo',
          telefono: '02 394 1122',
          email: 'lnaranjo@gates.com',
          ubicacion: 'Guayaquil',
          costoReferencial: 240,
          disponibilidad: 'Stock inmediato',
          notas: 'Incluye soporte técnico',
        },
      ],
      palabrasClave: ['correa', 'distribucion', 'hilux', '1KD', 'mantenimiento'],
      estado: 'activo',
      ultimaRevision: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'cat-003',
      sku: 'INY-4AG-004',
      nombre: 'Inyector Toyota 4A-GE',
      categoria: 'Sistema de combustible',
      subcategoria: 'Inyección electrónica',
      descripcion: 'Inyector electrónico 295cc para motores Toyota 4A-GE.',
      aplicaciones: ['Optimización de mezcla', 'Resuelve fallos de ralentí'],
      compatibilidad: [
        {
          marca: 'Toyota',
          modelo: 'Corolla',
          anios: '1989-1993',
          motor: '4A-GE',
          detalle: 'Versiones 16v y 20v',
          notas: '',
        },
        {
          marca: 'Toyota',
          modelo: 'MR2',
          anios: '1988-1992',
          motor: '4A-GE',
          detalle: '',
          notas: '',
        },
      ],
      especificaciones: {
        caudal: '295 cc/min',
        resistencia: '13.8 Ω',
        voltaje: '12V',
        conector: 'Sumitomo',
      },
      procedimientos: [
        'Utilizar tóricas nuevas al reinstalar.',
        'Verificar resistencia eléctrica antes de montar.',
        'Sincronizar ECU después del reemplazo.',
      ],
      fotoUrl: '',
      proveedores: [
        {
          id: 'prov-motor-autoparts',
          nombre: 'Motor Autoparts',
          contacto: 'Atención comercial',
          telefono: '+593 4 259 5400',
          email: 'ventas@motorautoparts.ec',
          ubicacion: 'Guayaquil, Ecuador',
          costoReferencial: 95,
          disponibilidad: 'Entrega nacional 72h',
          notas: 'Especialistas en inyección y sistemas de combustible',
        },
      ],
      palabrasClave: ['inyector', '4A-GE', 'toyota', 'jdm', 'motor'],
      estado: 'en validacion',
      ultimaRevision: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const CIUDADES_ECUADOR = [
    'quito',
    'guayaquil',
    'cuenca',
    'ambato',
    'manta',
    'machala',
    'santo domingo',
    'loja',
    'portoviejo',
    'ibarra',
    'riobamba',
    'quevedo',
    'durán',
    'duran',
    'babahoyo',
    'tulcan',
    'esmeraldas',
    'latacunga',
    'otavalo',
    'milagro',
    'salinas',
    'playas',
    'samborondon',
    'samborondón',
    'puyo',
    'francisco de orellana',
    'el coca',
    'balzar',
    'macas',
    'zamora',
    'tulcán',
    'santa elena',
    'los rios',
    'el oro',
  ];

  const PROVEEDORES_INFO = {
    'Tecnova S.A.': {
      contacto: 'Equipo comercial',
      telefono: '+593 4 268 2500',
      email: 'ventas@tecnova.com.ec',
      direccion: 'Av. Carlos Luis Plaza Dañín, Guayaquil',
      notas: 'Distribuidor autorizado Bosch para Ecuador',
    },
    'Tecnova Ecuador': {
      contacto: 'Centro de soporte',
      telefono: '+593 4 220 4000',
      email: 'ventas@tecnova.com.ec',
      direccion: 'Av. Carlos Luis Plaza Dañín, Guayaquil',
      notas: 'Sucursal comercial de Tecnova S.A.',
    },
    ECUACOMPRA: {
      contacto: 'Atención clientes',
      telefono: '+593 2 243 8700',
      email: 'info@ecuacompra.com',
      direccion: 'Av. 6 de Diciembre N24-253, Quito',
      notas: 'Marketplace B2B de repuestos con cobertura nacional',
    },
    'Maxcar Ecuador': {
      contacto: 'Departamento de ventas',
      telefono: '+593 2 382 9500',
      email: 'ventas@maxcar.com.ec',
      direccion: 'Av. Pedro Vicente Maldonado, Quito',
      notas: 'Distribuidor Brembo, KYB y Monroe para Ecuador',
    },
    'Gilmo Racing': {
      contacto: 'Equipo comercial',
      telefono: '',
      email: '',
      direccion: 'Guayaquil, Ecuador',
      notas: 'Especialistas en frenos y performance; contactar vía redes sociales antes de ordenar',
    },
    Disauto: {
      contacto: 'Unidad comercial',
      telefono: '+593 98 792 9621',
      email: 'comercial@disauto.com.ec',
      direccion: 'Av. Eloy Alfaro 4129, Quito',
      notas: 'Distribuidor oficial de Gates, TRW y líneas europeas',
    },
    Imfrisa: {
      contacto: 'Mesa de partes',
      telefono: '1800 463 747',
      email: '',
      direccion: 'Quito, Ecuador',
      notas: 'Importadora de sistemas de frenos y suspensión desde 1977',
    },
    'Repuestos Automotrices Genuinos': {
      contacto: 'Asesor comercial',
      telefono: '',
      email: '',
      direccion: 'Quito - Guayaquil, Ecuador',
      notas:
        'Especialistas en repuestos originales Toyota; confirmar datos de contacto antes de ordenar',
    },
    'Original Toyota Land Cruiser': {
      contacto: 'Asesor Toyota',
      telefono: '',
      email: '',
      direccion: 'Ecuador',
      notas: 'Distribución de componentes Toyota genuinos, validar con VIN',
    },
    'Monroe Ecuador': {
      contacto: 'Vanderbilt Importadores',
      telefono: '+593 99 421 2228',
      email: '',
      direccion: 'Santo Domingo, Ecuador',
      notas: 'Representantes Monroe y TRW en Ecuador',
    },
    'La Casa del Amortiguador': {
      contacto: 'Servicio al cliente',
      telefono: '+593 2 255 0987',
      email: 'info@casaamortiguador.ec',
      direccion: 'Av. Pichincha E6-125, Quito',
      notas: 'Especialistas en suspensión con cobertura nacional',
    },
    'Suspensión y dirección - Rotulas LEMFÖRDER': {
      contacto: 'Consultoría técnica',
      telefono: '',
      email: '',
      direccion: 'Quito, Ecuador',
      notas: 'Distribuidor autorizado Lemförder para Ecuador',
    },
    'TRW Distribuidores': {
      contacto: 'Mesa técnica',
      telefono: '+593 99 421 2228',
      email: '',
      direccion: 'Quito, Ecuador',
      notas: 'Red de distribución TRW, entrega 24-72h',
    },
    'Motor Autoparts': {
      contacto: 'Atención comercial',
      telefono: '+593 4 259 5400',
      email: 'ventas@motorautoparts.ec',
      direccion: 'Av. Juan Tanca Marengo, Guayaquil',
      notas: 'Especialistas en GMB, NPW y componentes de motor',
    },
    ECOREPUESTOS: {
      contacto: 'Central de pedidos',
      telefono: '',
      email: '',
      direccion: 'Quito, Ecuador',
      notas: 'Marketplace especializado en piezas OEM y aftermarket',
    },
    'Pedidos Akaisan S.A.': {
      contacto: 'Departamento de ventas',
      telefono: '',
      email: '',
      direccion: 'Quito, Ecuador',
      notas: 'Distribuidor Bosch y electrónica automotriz',
    },
    'Repuestos y Accesorios en Ecuador': {
      contacto: 'Equipo comercial',
      telefono: '',
      email: '',
      direccion: 'Quito, Ecuador',
      notas: 'Marketplace local con cobertura nacional',
    },
    'El Repuesto Automotriz Ecuador': {
      contacto: 'Atención clientes',
      telefono: '',
      email: '',
      direccion: 'Guayaquil, Ecuador',
      notas: 'Mayorista de inyección y sistema de combustible',
    },
    'Mundo Gates': {
      contacto: 'Soporte comercial',
      telefono: '',
      email: '',
      direccion: 'Quito, Ecuador',
      notas: 'Distribuidor autorizado Gates PowerGrip',
    },
    'Vendedores en MercadoLibre Ecuador': {
      contacto: 'Marketplace ML',
      telefono: '',
      email: '',
      direccion: 'Ecuador',
      notas: 'Verificar reputación del vendedor y política de devoluciones',
    },
    'Importadores directos Mann Filter': {
      contacto: 'Unidad comercial',
      telefono: '',
      email: '',
      direccion: 'Guayaquil, Ecuador',
      notas: 'Distribuidores oficiales Mann Filter para Ecuador',
    },
    MainTec: {
      contacto: 'Servicio comercial',
      telefono: '',
      email: '',
      direccion: 'Quito, Ecuador',
      notas: 'Distribuidor HVAC y filtración automotriz',
    },
    'Bosch Car Service Ecuador': {
      contacto: 'Recepción técnica',
      telefono: '+593 2 245 9700',
      email: 'info@bosch.com.ec',
      direccion: 'Av. República del Salvador N36-84, Quito',
      notas: 'Red oficial Bosch Car Service',
    },
    SIROC: {
      contacto: 'Atención clientes',
      telefono: '',
      email: '',
      direccion: 'Quito, Ecuador',
      notas: 'Distribuidor de filtros y autopartes para flotas',
    },
    'Casa del Rulimán': {
      contacto: 'Asesor de rodamientos',
      telefono: '',
      email: '',
      direccion: 'Quito, Ecuador',
      notas: 'Especialistas en rodamientos ITS y componentes de dirección',
    },
    'Importadora Dávila': {
      contacto: 'Equipo comercial',
      telefono: '593-984347954',
      email: '',
      direccion: 'Quito, Ecuador',
      notas: 'Enfoque en sistemas de freno y servicio a mayoristas',
    },
    'Distribuidora Oña': {
      contacto: 'Atención al cliente',
      telefono: '',
      email: '',
      direccion: 'Quito, Ecuador',
      notas: 'Especialistas en transmisiones automáticas y repuestos asociados',
    },
    'JEP Importaciones': {
      contacto: 'Mesa de negocios',
      telefono: '',
      email: '',
      direccion: 'Quito, Ecuador',
      notas: 'Portafolio con más de 120 mil repuestos multimarcas',
    },
    'Casanova Autopartes': {
      contacto: 'Centro de ventas',
      telefono: '04-5003519',
      email: '',
      direccion: 'Guayaquil, Ecuador',
      notas: 'Importadores con cobertura nacional en repuestos livianos',
    },
    'Avisan Autopartes': {
      contacto: 'Departamento comercial',
      telefono: '',
      email: '',
      direccion: 'Guayaquil, Ecuador',
      notas: 'Más de 47 años abasteciendo al mercado de reposición',
    },
    Deporpas: {
      contacto: 'Atención clientes',
      telefono: '',
      email: '',
      direccion: 'Guayaquil, Ecuador',
      notas: 'Distribuidor con más de 20 años de experiencia en autopartes',
    },
    'El Genuino Repuestos': {
      contacto: 'Equipo comercial',
      telefono: '0988400000',
      email: '',
      direccion: 'Ecuador',
      notas: 'Red nacional de repuestos originales y homologados',
    },
    'Napa Ecuador': {
      contacto: 'Centro de atención',
      telefono: '3740839',
      email: '',
      direccion: 'Santo Domingo, Ecuador',
      notas: 'Distribuidores de filtros Wix y accesorios automotrices',
    },
    'Vanderbilt Santo Domingo': {
      contacto: 'Equipo Monroe-TRW',
      telefono: '+593 99 421 2228',
      email: '',
      direccion: 'Santo Domingo, Ecuador',
      notas: 'Representantes locales de Monroe y TRW',
    },
    'Importadora Cerón': {
      contacto: 'Mesa de ventas',
      telefono: '',
      email: '',
      direccion: 'Santo Domingo, Ecuador',
      notas: 'Importadora de autopartes para líneas livianas y pesadas',
    },
    Conauto: {
      contacto: 'Departamento de filtros',
      telefono: '',
      email: '',
      direccion: 'Ecuador',
      notas: 'Distribuidores de filtros Motorex y Baldwin a nivel nacional',
    },
    'Denso Autopartes Ecuador': {
      contacto: 'Unidad de repuestos',
      telefono: '',
      email: '',
      direccion: 'Ecuador',
      notas: 'Red nacional de distribución de productos Denso',
    },
    Motormarket: {
      contacto: 'Gestión comercial',
      telefono: '',
      email: '',
      direccion: 'Ecuador',
      notas: 'Especialistas en filtros Wix para segmentos pesados',
    },
    Imporras: {
      contacto: 'Asesor comercial',
      telefono: '',
      email: '',
      direccion: 'Ecuador',
      notas: 'Distribuidor autorizado de Mann Filter y líneas asociadas',
    },
    Cojapan: {
      contacto: 'Atención mayoristas',
      telefono: '',
      email: '',
      direccion: 'Guayaquil, Ecuador',
      notas: 'Más de 53 años importando marcas japonesas, coreanas y chinas',
    },
    'Maxcar Mega Centro': {
      contacto: 'Centro regional',
      telefono: '',
      email: '',
      direccion: 'Ecuador',
      notas: 'Hub logístico con cobertura nacional para la red Maxcar',
    },
  };

  const PROCEDIMIENTOS_POR_CATEGORIA = {
    'Sistemas de Frenos': [
      'Verificar el espesor de los discos antes de instalar nuevas pastillas.',
      'Purgar el circuito para eliminar aire después del montaje.',
      'Realizar un proceso de asentamiento con frenadas progresivas.',
    ],
    'Sistemas de Suspensión': [
      'Utilizar dinamométrica para asegurar el torque especificado.',
      'Revisar bujes y terminales asociados antes de entregar el vehículo.',
      'Realizar alineación y balanceo tras el reemplazo.',
    ],
    'Sistemas de Motor': [
      'Inspeccionar sellos y empaques al reinstalar.',
      'Purgar el sistema de refrigeración y verificar fugas.',
      'Registrar kilometraje y fecha del mantenimiento.',
    ],
    'Sistemas de Inyección': [
      'Presurizar el sistema y verificar fugas después de la instalación.',
      'Limpiar conectores eléctricos y aplicar grasa dieléctrica.',
      'Calibrar la presión y realizar escaneo OBD para borrar códigos.',
    ],
    Filtros: [
      'Lubricar ligeramente los empaques antes de instalar.',
      'Verificar ausencia de fugas tras el arranque.',
      'Registrar fecha y kilometraje del cambio de filtro.',
    ],
  };

  const Catalogo = {
    container: null,
    refs: {},
    data: [],
    indice: [],
    filtros: {
      categoria: '',
      subcategoria: '',
      proveedor: '',
      estado: '',
      compatibilidad: '',
    },
    resultados: [],
    seleccionado: null,
    filtrosDisponibles: {
      categorias: [],
      subcategorias: [],
      proveedores: [],
    },
    // Nuevos: Paginación y lazy loading para evitar bloqueos
    itemsRendered: 0,
    itemsPerPage: 50,
    loadingMore: false,
    _lazyLoadingConfigured: false,

    render(container) {
      this.container = container;
      container.innerHTML = PLANTILLA;
      this.cacheRefs();
      this.bindEvents();
      this.cargarDatos();
    },

    cacheRefs() {
      const ref = (selector) => this.container.querySelector(`[data-ref="${selector}"]`);
      this.refs = {
        inputBusqueda: ref('input-busqueda'),
        lista: ref('lista'),
        sugerencias: ref('sugerencias'),
        detalle: ref('detalle'),
        resumen: ref('resumen-lista'),
        contadorCompra: ref('contador-compra'),
        modalDetalle: ref('modal-detalle'),
      };

      this.refs.filtros = Array.from(this.container.querySelectorAll('[data-filter]'));
    },

    bindEvents() {
      if (this.refs.inputBusqueda) {
        const handler = Utils.debounce(() => this.aplicarBusqueda(), 200);
        this.refs.inputBusqueda.addEventListener('input', handler);
        this.refs.inputBusqueda.addEventListener('focus', () => this.mostrarSugerencias());
        this.refs.inputBusqueda.addEventListener('blur', () =>
          setTimeout(() => this.ocultarSugerencias(), 150)
        );
      }

      this.refs.filtros.forEach((select) => {
        const tipo = select.dataset.filter;
        if (select.tagName === 'SELECT') {
          select.addEventListener('change', () => {
            this.filtros[tipo] = select.value;
            if (tipo === 'categoria') {
              this.actualizarSubcategorias(select.value);
            }
            this.aplicarBusqueda();
          });
        } else {
          select.addEventListener(
            'input',
            Utils.debounce(() => {
              this.filtros[tipo] = select.value;
              this.aplicarBusqueda();
            }, 200)
          );
        }
      });

      this.container
        .querySelector('[data-action="abrir-compras"]')
        .addEventListener('click', () => {
          if (window.Compras?.PorHacer) {
            Compras.PorHacer.abrir();
          } else {
            Utils.showToast('El módulo de compras no está disponible.', 'warning');
          }
        });

      this.container
        .querySelector('[data-action="documentacion"]')
        .addEventListener('click', () => {
          window.open('docs/catalogo_tecnico.md', '_blank');
        });

      this.container
        .querySelector('[data-action="limpiar-filtros"]')
        .addEventListener('click', () => this.resetFiltros());

      // Cerrar modal
      this.refs.modalDetalle.addEventListener('click', (e) => {
        if (
          e.target === this.refs.modalDetalle ||
          e.target.closest('[data-action="cerrar-modal"]')
        ) {
          this.cerrarModal();
        }
      });

      // Escape key para cerrar modal
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.refs.modalDetalle.classList.contains('visible')) {
          this.cerrarModal();
        }
      });

      this.refs.sugerencias.addEventListener('mousedown', (event) => {
        const chip = event.target.closest('[data-sugerencia]');
        if (!chip) return;
        event.preventDefault();
        const valor = chip.dataset.sugerencia;
        this.refs.inputBusqueda.value = valor;
        this.aplicarBusqueda();
      });

      this.refs.lista.addEventListener('click', (event) => {
        const card = event.target.closest('[data-item-id]');
        if (!card) return;
        const id = card.dataset.itemId;
        this.seleccionar(id);
      });
    },

    async cargarDatos() {
      this.refs.lista.innerHTML =
        '<div class="catalogo-loading"><div class="spinner"></div><p>Cargando catálogo…</p></div>';

      let catalogo = [];

      // 1. Intentar cargar desde el backend (API REST)
      if (window.DatabaseAPI && typeof DatabaseAPI.request === 'function') {
        try {
          const respuesta = await DatabaseAPI.request('/catalogo-tecnico');
          if (Array.isArray(respuesta) && respuesta.length) {
            console.log(`✅ Catálogo cargado desde API: ${respuesta.length} ítems`);
            catalogo = respuesta;
          }
        } catch (error) {
          console.warn('⚠️ No se pudo cargar desde API, intentando archivo local.', error);
        }
      }

      // 2. Enriquecer SIEMPRE con data/catalogo_mecanico.json (archivo unificado)
      const catalogoArchivo = await this.importarDesdeArchivo();
      if (Array.isArray(catalogoArchivo) && catalogoArchivo.length) {
        if (Array.isArray(catalogo) && catalogo.length) {
          catalogo = this.fusionarCatalogos(catalogo, catalogoArchivo);
          console.log(`🧩 Catálogo enriquecido con JSON: ${catalogo.length} ítems totales`);
        } else {
          catalogo = catalogoArchivo;
          console.log(
            `✅ Catálogo cargado desde data/catalogo_mecanico.json: ${catalogo.length} ítems`
          );
        }
      }

      // 3. Si tampoco hay datos en la API ni en el archivo, usar los seeds de emergencia
      if (!Array.isArray(catalogo) || !catalogo.length) {
        console.warn('⚠️ No se encontró catálogo unificado, usando seeds de emergencia.');
        catalogo = SEED_CATALOGO;
      }

      // 4. Normalizar y formatear cada ítem
      this.data = (catalogo || []).map((item) => this.formatearItem(item));
      console.log(`📊 Catálogo procesado: ${this.data.length} productos disponibles`);

      // 5. Guardar en cache local para navegación offline
      try {
        if (typeof Database !== 'undefined' && typeof Database.saveCollection === 'function') {
          Database.saveCollection('catalogoTecnico', this.data);
        }
      } catch (error) {
        console.warn('⚠️ No se pudo guardar cache local:', error);
      }

      // 6. Preparar índices de búsqueda y filtros
      this.indice = CatalogoBuscador.prepararIndice(this.data);
      this.prepararFiltros();
      this.aplicarBusqueda();
      this.actualizarContadores();
    },

    formatearItem(item = {}) {
      const generarId = () => {
        if (window.Utils && typeof Utils.generateId === 'function') {
          return Utils.generateId('cat');
        }
        return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      };

      const normalizarProveedor = (prov = {}) => {
        const proveedor = {
          id: prov.id || generarId(),
          nombre: prov.nombre || '',
          contacto: prov.contacto || '',
          telefono: prov.telefono || '',
          email: prov.email || '',
          ubicacion: prov.ubicacion || prov.ciudad || prov.direccion || '',
          disponibilidad: prov.disponibilidad || '',
          notas: prov.notas || '',
        };

        const costo = prov.costoReferencial ?? prov.costo_referencial;
        if (costo !== undefined && costo !== null && costo !== '') {
          const numero = Number(costo);
          if (!Number.isNaN(numero)) {
            proveedor.costoReferencial = numero;
          }
        }

        if (prov.principal) {
          proveedor.principal = true;
        }

        if (!this.esProveedorDeEcuador(proveedor)) {
          return null;
        }

        return proveedor;
      };

      const compatibilidad = Array.isArray(item.compatibilidad)
        ? item.compatibilidad.map((ref) => ({
            marca: ref?.marca || ref?.brand || '',
            modelo: ref?.modelo || ref?.model || '',
            anios: ref?.anios || ref?.años || ref?.years || '',
            motor: ref?.motor || '',
            detalle: ref?.detalle || ref?.detail || '',
            notas: ref?.notas || ref?.notes || '',
          }))
        : [];

      const palabrasOrigen = Array.isArray(item.palabrasClave)
        ? item.palabrasClave
        : Array.isArray(item.palabras_clave)
          ? item.palabras_clave
          : [];

      const palabrasClave = Array.from(new Set(palabrasOrigen.filter(Boolean)));

      return {
        id: item.id || generarId(),
        sku: item.sku || item.codigo || '',
        nombre: item.nombre || 'Producto sin nombre',
        categoria: item.categoria || item.categoria_nombre || 'General',
        subcategoria: item.subcategoria || item.sistema || item.categoria || 'General',
        descripcion: item.descripcion || '',
        aplicaciones: Array.isArray(item.aplicaciones) ? item.aplicaciones : [],
        compatibilidad,
        especificaciones:
          item.especificaciones && typeof item.especificaciones === 'object'
            ? item.especificaciones
            : {},
        procedimientos: Array.isArray(item.procedimientos) ? item.procedimientos : [],
        fotoUrl: item.fotoUrl || item.foto_url || '',
        proveedores: Array.isArray(item.proveedores)
          ? item.proveedores.map(normalizarProveedor).filter(Boolean)
          : [],
        palabrasClave,
        estado: item.estado || 'activo',
        ultimaRevision: item.ultimaRevision || item.ultima_revision || new Date().toISOString(),
        precioVenta:
          typeof item.precioVenta === 'number'
            ? item.precioVenta
            : typeof item.precio_venta === 'number'
              ? item.precio_venta
              : null,
        precioCompra:
          typeof item.precioCompra === 'number'
            ? item.precioCompra
            : typeof item.precio_compra === 'number'
              ? item.precio_compra
              : null,
        stock:
          typeof item.stock === 'number'
            ? item.stock
            : typeof item.inventario === 'number'
              ? item.inventario
              : null,
        origenDatos: item.origenDatos || item.origen_datos || 'local',
      };
    },

    fusionarCatalogos(apiData = [], archivoData = []) {
      const mapa = new Map();
      const clave = (item) => this.obtenerClaveCatalogo(item);

      (Array.isArray(apiData) ? apiData : []).forEach((item) => {
        const key = clave(item);
        if (!mapa.has(key)) {
          mapa.set(key, { ...item });
        } else {
          mapa.set(key, this.fusionarRegistrosCatalogo(mapa.get(key), item));
        }
      });

      (Array.isArray(archivoData) ? archivoData : []).forEach((item) => {
        const key = clave(item);
        if (mapa.has(key)) {
          mapa.set(key, this.fusionarRegistrosCatalogo(mapa.get(key), item));
        } else {
          mapa.set(key, { ...item });
        }
      });

      return Array.from(mapa.values());
    },

    obtenerClaveCatalogo(item = {}) {
      if (!item || typeof item !== 'object') {
        return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }

      const candidatos = [
        item.id,
        item.sku,
        item.codigo,
        item.codigo_producto,
        item.codigoProducto,
        item.nombre,
      ];

      for (const candidato of candidatos) {
        if (candidato === 0 || candidato) {
          return String(candidato).trim().toLowerCase();
        }
      }

      return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    },

    fusionarRegistrosCatalogo(base = {}, extra = {}) {
      if (!base && !extra) return null;
      if (!base) return { ...extra };
      if (!extra) return { ...base };

      const combinado = { ...base };
      const camposTexto = [
        'nombre',
        'descripcion',
        'categoria',
        'subcategoria',
        'estado',
        'fotoUrl',
      ];
      camposTexto.forEach((campo) => {
        if (extra[campo]) {
          combinado[campo] = extra[campo];
        }
      });

      combinado.aplicaciones = this.fusionarListasSimples(base.aplicaciones, extra.aplicaciones);
      combinado.procedimientos = this.fusionarListasSimples(
        base.procedimientos,
        extra.procedimientos
      );
      combinado.palabrasClave = this.fusionarListasSimples(
        base.palabrasClave || base.palabras_clave,
        extra.palabrasClave || extra.palabras_clave
      );

      if (extra.especificaciones && Object.keys(extra.especificaciones).length) {
        combinado.especificaciones = {
          ...(base.especificaciones || {}),
          ...extra.especificaciones,
        };
      }

      combinado.compatibilidad = this.fusionarListasObjetos(
        base.compatibilidad,
        extra.compatibilidad,
        (ref) =>
          [ref?.marca, ref?.modelo, ref?.anios || ref?.años, ref?.motor].filter(Boolean).join('|')
      );

      combinado.proveedores = this.fusionarListasObjetos(
        base.proveedores,
        extra.proveedores,
        (prov) =>
          prov?.id || prov?.nombre || [prov?.contacto, prov?.telefono].filter(Boolean).join('|')
      );

      combinado.ultimaRevision = this.obtenerFechaMasReciente(
        base.ultimaRevision || base.ultima_revision,
        extra.ultimaRevision || extra.ultima_revision
      );
      combinado.origenDatos = this.resolverOrigenDatos(
        base.origenDatos || base.origen_datos,
        extra.origenDatos || extra.origen_datos
      );

      return combinado;
    },

    fusionarListasSimples(listaBase = [], listaExtra = []) {
      const set = new Set();
      (Array.isArray(listaBase) ? listaBase : []).forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          set.add(item);
        }
      });
      (Array.isArray(listaExtra) ? listaExtra : []).forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          set.add(item);
        }
      });
      return set.size ? Array.from(set) : [];
    },

    fusionarListasObjetos(base = [], extra = [], getKey = null) {
      const mapa = new Map();
      const listaBase = Array.isArray(base) ? base : [];
      const listaExtra = Array.isArray(extra) ? extra : [];

      const resolverClave = (item) => {
        if (!item) return null;
        if (typeof getKey === 'function') {
          const clave = getKey(item);
          return clave || null;
        }
        if (item.id) return item.id;
        if (item.nombre) return item.nombre.toString().toLowerCase();
        return JSON.stringify(item);
      };

      const agregar = (item, origen = 'base') => {
        if (!item) return;
        const clave = resolverClave(item) || `${origen}-${Math.random().toString(36).slice(2, 8)}`;
        if (mapa.has(clave)) {
          mapa.set(clave, { ...mapa.get(clave), ...item });
        } else {
          mapa.set(clave, { ...item });
        }
      };

      listaBase.forEach((item) => agregar(item, 'base'));
      listaExtra.forEach((item) => agregar(item, 'extra'));

      return Array.from(mapa.values());
    },

    obtenerFechaMasReciente(actual, candidato) {
      const parse = (valor) => {
        if (!valor) return null;
        const timestamp = Date.parse(valor);
        return Number.isNaN(timestamp) ? null : timestamp;
      };

      const actualTs = parse(actual);
      const candidatoTs = parse(candidato);

      if (actualTs && candidatoTs) {
        return candidatoTs > actualTs
          ? new Date(candidatoTs).toISOString()
          : new Date(actualTs).toISOString();
      }
      if (candidatoTs) return new Date(candidatoTs).toISOString();
      if (actualTs) return new Date(actualTs).toISOString();
      return new Date().toISOString();
    },

    resolverOrigenDatos(actual, candidato) {
      const normalizar = (valor) => (valor ? valor.toString().toLowerCase() : '');
      const actualNorm = normalizar(actual);
      const candidatoNorm = normalizar(candidato);

      if (actualNorm && candidatoNorm && actualNorm !== candidatoNorm) {
        return 'fusionado';
      }
      if (candidatoNorm) return candidato;
      if (actualNorm) return actual;
      return 'local';
    },

    async importarDesdeArchivo() {
      try {
        // Cargar desde data/ (fuente única de verdad)
        const respuesta = await fetch('data/catalogo_mecanico.json', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!respuesta.ok) {
          throw new Error(
            `HTTP ${respuesta.status}: No se pudo cargar data/catalogo_mecanico.json`
          );
        }
        const data = await respuesta.json();
        if (!Array.isArray(data)) {
          console.error('❌ El catálogo unificado no es un array válido');
          return [];
        }
        console.log(
          `📦 Catálogo cargado: ${data.length} items (${(JSON.stringify(data).length / 1024).toFixed(1)} KB)`
        );
        return data;
      } catch (error) {
        console.error('❌ Error al cargar data/catalogo_mecanico.json:', error);
        return [];
      }
    },

    prepararFiltros() {
      const categorias = new Set();
      const subcategorias = new Map();
      const proveedores = new Set();

      this.data.forEach((item) => {
        if (item.categoria) categorias.add(item.categoria);
        if (item.subcategoria) {
          if (!subcategorias.has(item.categoria)) {
            subcategorias.set(item.categoria, new Set());
          }
          subcategorias.get(item.categoria).add(item.subcategoria);
        }
        (item.proveedores || []).forEach((prov) => {
          if (prov?.nombre) proveedores.add(prov.nombre);
        });
      });

      this.filtrosDisponibles = {
        categorias: Array.from(categorias).sort(),
        subcategorias,
        proveedores: Array.from(proveedores).sort(),
      };

      const selectCategoria = this.container.querySelector('[data-filter="categoria"]');
      const selectSubcategoria = this.container.querySelector('[data-filter="subcategoria"]');
      const selectProveedor = this.container.querySelector('[data-filter="proveedor"]');

      selectCategoria.innerHTML =
        '<option value="">Todas</option>' +
        this.filtrosDisponibles.categorias
          .map((cat) => `<option value="${Utils.sanitize(cat)}">${Utils.sanitize(cat)}</option>`)
          .join('');
      selectProveedor.innerHTML =
        '<option value="">Cualquiera</option>' +
        this.filtrosDisponibles.proveedores
          .map((prov) => `<option value="${Utils.sanitize(prov)}">${Utils.sanitize(prov)}</option>`)
          .join('');
      this.actualizarSubcategorias(selectCategoria.value);
    },

    actualizarSubcategorias(categoriaSeleccionada) {
      const selectSubcategoria = this.container.querySelector('[data-filter="subcategoria"]');
      const opciones = new Set();

      if (
        categoriaSeleccionada &&
        this.filtrosDisponibles.subcategorias.has(categoriaSeleccionada)
      ) {
        this.filtrosDisponibles.subcategorias
          .get(categoriaSeleccionada)
          .forEach((sub) => opciones.add(sub));
      } else {
        this.filtrosDisponibles.subcategorias.forEach((set) =>
          set.forEach((sub) => opciones.add(sub))
        );
      }

      selectSubcategoria.innerHTML =
        '<option value="">Todos</option>' +
        Array.from(opciones)
          .sort()
          .map((sub) => `<option value="${Utils.sanitize(sub)}">${Utils.sanitize(sub)}</option>`)
          .join('');
      if (!opciones.has(this.filtros.subcategoria)) {
        this.filtros.subcategoria = '';
        selectSubcategoria.value = '';
      }
    },

    resetFiltros() {
      this.filtros = {
        categoria: '',
        subcategoria: '',
        proveedor: '',
        estado: '',
        compatibilidad: '',
      };
      this.refs.inputBusqueda.value = '';
      this.refs.filtros.forEach((filtro) => {
        if (filtro.tagName === 'SELECT') {
          filtro.value = '';
        } else {
          filtro.value = '';
        }
      });
      this.aplicarBusqueda();
    },

    aplicarBusqueda() {
      const consulta = this.refs.inputBusqueda.value;
      const resultados = CatalogoBuscador.buscar(this.data, this.indice, consulta, this.filtros);
      this.resultados = resultados;
      this.renderLista();
      this.actualizarResumen();
      this.mostrarSugerencias();

      if (this.seleccionado) {
        const siguePresente = resultados.some((item) => item.id === this.seleccionado);
        if (!siguePresente) {
          this.mostrarPlaceholder();
        }
      }
    },

    mostrarSugerencias() {
      const consulta = this.refs.inputBusqueda.value;
      const sugerencias = CatalogoBuscador.sugerencias(this.data, consulta);
      if (!sugerencias.length) {
        this.refs.sugerencias.classList.remove('visible');
        this.refs.sugerencias.innerHTML = '';
        return;
      }
      this.refs.sugerencias.innerHTML = sugerencias
        .map(
          (valor) =>
            `<button type="button" data-sugerencia="${Utils.sanitize(valor)}">${Utils.sanitize(valor)}</button>`
        )
        .join('');
      this.refs.sugerencias.classList.add('visible');
    },

    ocultarSugerencias() {
      this.refs.sugerencias.classList.remove('visible');
    },

    renderLista(append = false) {
      if (!this.resultados.length) {
        this.refs.lista.innerHTML =
          '<div class="catalogo-empty"><i class="fas fa-search"></i><p>No encontramos coincidencias. Ajusta filtros o revisa la ortografía.</p></div>';
        this.itemsRendered = 0;
        return;
      }

      // OPTIMIZACIÓN: Renderizar solo los primeros items, no todos
      if (!append) {
        this.itemsRendered = 0;
        this.refs.lista.innerHTML = '';
      }

      const start = this.itemsRendered;
      const end = Math.min(start + this.itemsPerPage, this.resultados.length);
      const itemsToRender = this.resultados.slice(start, end);

      console.log(`📊 Renderizando items ${start}-${end} de ${this.resultados.length}`);

      const html = itemsToRender.map((item) => this.renderCard(item)).join('');

      if (append) {
        this.refs.lista.insertAdjacentHTML('beforeend', html);
      } else {
        this.refs.lista.innerHTML = html;
      }

      this.itemsRendered = end;

      // Si quedan más items por renderizar, configurar lazy loading
      if (this.itemsRendered < this.resultados.length) {
        this.configurarLazyLoading();
      }
    },

    configurarLazyLoading() {
      // Evitar múltiples listeners
      if (this._lazyLoadingConfigured) return;
      this._lazyLoadingConfigured = true;

      const lista = this.refs.lista;

      lista.addEventListener('scroll', () => {
        if (this.loadingMore) return;

        // Si está cerca del final, cargar más
        const scrollPosition = lista.scrollTop + lista.clientHeight;
        const scrollHeight = lista.scrollHeight;

        if (scrollPosition >= scrollHeight - 300 && this.itemsRendered < this.resultados.length) {
          this.loadingMore = true;

          // Agregar spinner temporal
          const spinner = document.createElement('div');
          spinner.className = 'catalogo-loading-more';
          spinner.innerHTML = '<div class="spinner-small"></div><p>Cargando más...</p>';
          lista.appendChild(spinner);

          // Renderizar siguiente página después de un pequeño delay
          setTimeout(() => {
            spinner.remove();
            this.renderLista(true); // append = true
            this.loadingMore = false;
          }, 100);
        }
      });
    },

    renderCard(item) {
      const compat = (item.compatibilidad || [])
        .slice(0, 2)
        .map(
          (ref) =>
            `${ref.marca || ''} ${ref.modelo || ''} ${ref.anios ? '(' + ref.anios + ')' : ''}`
        )
        .filter(Boolean)
        .join(' · ');
      const proveedores = (item.proveedores || [])
        .slice(0, 2)
        .map((prov) => prov.nombre)
        .filter(Boolean)
        .join(' • ');
      const actualizado = Utils.formatDate(item.ultimaRevision, 'short');
      return `
        <article class="catalogo-item" data-item-id="${item.id}">
          <div class="catalogo-item-content">
            <header>
              <h4>${Utils.sanitize(item.nombre)}</h4>
              <span class="badge badge-${this.obtenerColorEstado(item.estado)}">${Utils.sanitize(item.estado || 'activo')}</span>
            </header>
            <div class="catalogo-item-meta">
              <span><strong>SKU:</strong> ${Utils.sanitize(item.sku || 'N/D')}</span>
              <span><strong>Categoría:</strong> ${Utils.sanitize(item.categoria || 'N/D')}</span>
              ${item.subcategoria ? `<span><strong>Sistema:</strong> ${Utils.sanitize(item.subcategoria)}</span>` : ''}
            </div>
            ${compat ? `<p class="catalogo-item-compat" style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;"><i class="fas fa-car"></i> ${Utils.sanitize(compat)}</p>` : ''}
          </div>
          <div class="catalogo-item-actions">
            <button class="btn btn-link" type="button" title="Ver detalles">
              <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </article>
      `;
    },

    obtenerColorEstado(estado) {
      const mapa = {
        activo: 'success',
        'en validacion': 'warning',
        descontinuado: 'danger',
      };
      return mapa[(estado || '').toLowerCase()] || 'info';
    },

    actualizarResumen() {
      const total = this.resultados.length;
      const filtrosActivos = Object.values(this.filtros).filter(Boolean).length;
      const texto = filtrosActivos
        ? `${total} resultado${total === 1 ? '' : 's'} con filtros activos`
        : `${total} resultado${total === 1 ? '' : 's'} del catálogo`;
      this.refs.resumen.textContent = texto;
    },

    seleccionar(id) {
      this.seleccionado = id;
      // Buscar en resultados filtrados primero, luego en data completo
      let producto = this.resultados.find((item) => item.id === id);
      if (!producto) {
        producto = this.data.find((item) => item.id === id);
      }

      if (!producto) {
        console.error('❌ Producto no encontrado:', id);
        this.mostrarPlaceholder();
        Utils.showToast?.('No se pudo cargar el detalle del producto', 'error');
        return;
      }

      console.log('✅ Producto seleccionado:', producto.nombre);
      this.renderDetalle(producto);
      this.abrirModal();
    },

    abrirModal() {
      this.refs.modalDetalle.classList.add('visible');
      document.body.classList.add('modal-open'); // Usar clase en lugar de inline style
    },

    cerrarModal() {
      this.refs.modalDetalle.classList.remove('visible');
      document.body.classList.remove('modal-open'); // Remover clase
      document.body.style.overflow = ''; // Limpiar cualquier style inline
    },

    _cerrarModalAnterior() {
      this.refs.modalDetalle.classList.remove('visible');
      document.body.style.overflow = '';
      this.seleccionado = null;
    },

    mostrarPlaceholder() {
      this.seleccionado = null;
      this.refs.detalle.innerHTML = `
        <div class="catalogo-placeholder">
          <i class="fas fa-tools"></i>
          <p>Selecciona un ítem para ver la ficha técnica completa.</p>
        </div>
      `;
    },

    renderDetalle(producto) {
      const compatibilidad = (producto.compatibilidad || [])
        .map(
          (ref) => `
        <li>
          <strong>${Utils.sanitize(ref.marca || '')} ${Utils.sanitize(ref.modelo || '')}</strong>
          <span>${Utils.sanitize(ref.anios || '')}</span>
          ${ref.motor ? `<span>Motor: ${Utils.sanitize(ref.motor)}</span>` : ''}
          ${ref.detalle ? `<span>${Utils.sanitize(ref.detalle)}</span>` : ''}
        </li>
      `
        )
        .join('');

      const proveedores =
        (producto.proveedores || [])
          .map(
            (prov, index) => `
        <article class="proveedor-item">
          <header>
            <h4>${Utils.sanitize(prov.nombre || 'Proveedor')}</h4>
            <span>${Utils.sanitize(prov.disponibilidad || 'Sin disponibilidad')}</span>
          </header>
          <div class="proveedor-meta">
            ${prov.costoReferencial !== undefined ? `<span><strong>Costo ref.:</strong> ${Utils.formatCurrency(prov.costoReferencial)}</span>` : ''}
            ${prov.contacto ? `<span><strong>Contacto:</strong> ${Utils.sanitize(prov.contacto)}</span>` : ''}
            ${prov.telefono ? `<span><strong>Tel:</strong> ${Utils.sanitize(prov.telefono)}</span>` : ''}
            ${prov.email ? `<span>${Utils.sanitize(prov.email)}</span>` : ''}
          </div>
          ${prov.notas ? `<p>${Utils.sanitize(prov.notas)}</p>` : ''}
          <footer>
            <button class="btn btn-sm" data-action="editar-proveedor" data-index="${index}">Editar proveedor</button>
          </footer>
        </article>
      `
          )
          .join('') || '<p class="text-muted">Añade proveedores para este ítem.</p>';

      const procedimientos = (producto.procedimientos || [])
        .map((paso, index) => `<li><span>#${index + 1}</span> ${Utils.sanitize(paso)}</li>`)
        .join('');

      this.refs.detalle.innerHTML = `
        <!-- Información Básica -->
        <div class="detalle-section detalle-info-basica">
          <div class="detalle-section-header">
            <div>
              <h3>${Utils.sanitize(producto.nombre)}</h3>
              <span class="badge badge-${this.obtenerColorEstado(producto.estado)}">${Utils.sanitize(producto.estado || 'activo')}</span>
            </div>
          </div>
          <div class="detalle-meta-grid">
            <div class="meta-item">
              <span class="meta-label">SKU</span>
              <span class="meta-value">${Utils.sanitize(producto.sku || 'N/D')}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Categoría</span>
              <span class="meta-value">${Utils.sanitize(producto.categoria || 'N/D')}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Sistema</span>
              <span class="meta-value">${Utils.sanitize(producto.subcategoria || 'N/D')}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Última revisión</span>
              <span class="meta-value">${Utils.formatDate(producto.ultimaRevision, 'short')}</span>
            </div>
          </div>
          ${
            producto.descripcion
              ? `
            <div class="detalle-descripcion">
              <p>${Utils.sanitize(producto.descripcion)}</p>
            </div>
          `
              : ''
          }
        </div>

        <!-- Especificaciones Técnicas -->
        ${
          producto.especificaciones && Object.keys(producto.especificaciones).length
            ? `
          <div class="detalle-section">
            <div class="detalle-section-header">
              <h4><i class="fas fa-cogs"></i> Especificaciones Técnicas</h4>
            </div>
            <div class="detalle-specs-grid">
              ${Object.entries(producto.especificaciones)
                .map(
                  ([clave, valor]) => `
                <div class="spec-item">
                  <span class="spec-label">${Utils.sanitize(clave)}</span>
                  <span class="spec-value">${Utils.sanitize(valor)}</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }

        <!-- Compatibilidad -->
        ${
          compatibilidad
            ? `
          <div class="detalle-section">
            <div class="detalle-section-header">
              <h4><i class="fas fa-car"></i> Compatibilidad con Vehículos</h4>
            </div>
            <div class="detalle-compatibilidad-list">
              ${(producto.compatibilidad || [])
                .map(
                  (ref) => `
                <div class="compat-item">
                  <div class="compat-main">
                    <strong>${Utils.sanitize(ref.marca || '')} ${Utils.sanitize(ref.modelo || '')}</strong>
                    <span class="compat-years">${Utils.sanitize(ref.anios || '')}</span>
                  </div>
                  ${
                    ref.motor || ref.detalle
                      ? `
                    <div class="compat-details">
                      ${ref.motor ? `<span><i class="fas fa-tachometer-alt"></i> ${Utils.sanitize(ref.motor)}</span>` : ''}
                      ${ref.detalle ? `<span>${Utils.sanitize(ref.detalle)}</span>` : ''}
                    </div>
                  `
                      : ''
                  }
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }

        <!-- Proveedores -->
        <div class="detalle-section">
          <div class="detalle-section-header">
            <h4><i class="fas fa-truck"></i> Proveedores</h4>
            <button class="btn btn-sm btn-outline" data-action="agregar-proveedor">
              <i class="fas fa-plus"></i> Agregar
            </button>
          </div>
          <div class="detalle-proveedores-grid">
            ${
              (producto.proveedores || []).length
                ? (producto.proveedores || [])
                    .map(
                      (prov, index) => `
              <div class="proveedor-card">
                <div class="proveedor-header">
                  <h5>${Utils.sanitize(prov.nombre || 'Proveedor')}</h5>
                  <span class="disponibilidad-badge ${prov.disponibilidad === 'Disponible' ? 'disponible' : ''}">
                    ${Utils.sanitize(prov.disponibilidad || 'Sin info')}
                  </span>
                </div>
                <div class="proveedor-info">
                  ${
                    prov.costoReferencial !== undefined
                      ? `
                    <div class="info-row">
                      <i class="fas fa-dollar-sign"></i>
                      <span>Costo ref.: ${Utils.formatCurrency(prov.costoReferencial)}</span>
                    </div>
                  `
                      : ''
                  }
                  ${
                    prov.contacto
                      ? `
                    <div class="info-row">
                      <i class="fas fa-user"></i>
                      <span>${Utils.sanitize(prov.contacto)}</span>
                    </div>
                  `
                      : ''
                  }
                  ${
                    prov.telefono
                      ? `
                    <div class="info-row">
                      <i class="fas fa-phone"></i>
                      <span>${Utils.sanitize(prov.telefono)}</span>
                    </div>
                  `
                      : ''
                  }
                  ${
                    prov.email
                      ? `
                    <div class="info-row">
                      <i class="fas fa-envelope"></i>
                      <span>${Utils.sanitize(prov.email)}</span>
                    </div>
                  `
                      : ''
                  }
                </div>
                ${prov.notas ? `<p class="proveedor-notas">${Utils.sanitize(prov.notas)}</p>` : ''}
                <button class="btn btn-sm btn-link" data-action="editar-proveedor" data-index="${index}">
                  <i class="fas fa-edit"></i> Editar
                </button>
              </div>
            `
                    )
                    .join('')
                : '<p class="text-muted">No hay proveedores registrados</p>'
            }
          </div>
        </div>

        <!-- Aplicaciones y Procedimientos -->
        ${
          (producto.aplicaciones || []).length || procedimientos
            ? `
          <div class="detalle-section">
            ${
              (producto.aplicaciones || []).length
                ? `
              <div class="detalle-section-header">
                <h4><i class="fas fa-lightbulb"></i> Aplicaciones</h4>
              </div>
              <div class="detalle-aplicaciones-list">
                ${producto.aplicaciones
                  .map(
                    (app) => `
                  <div class="aplicacion-item">
                    <i class="fas fa-check-circle"></i>
                    <span>${Utils.sanitize(app)}</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
                : ''
            }
            ${
              procedimientos
                ? `
              <div class="detalle-section-header" style="margin-top: var(--spacing-md);">
                <h4><i class="fas fa-wrench"></i> Procedimientos Recomendados</h4>
              </div>
              <ol class="detalle-procedimientos-list">
                ${(producto.procedimientos || [])
                  .map(
                    (paso) => `
                  <li>${Utils.sanitize(paso)}</li>
                `
                  )
                  .join('')}
              </ol>
            `
                : ''
            }
          </div>
        `
            : ''
        }

        <!-- Acciones -->
        <div class="detalle-actions-footer">
          <button class="btn btn-outline" data-action="editar-ficha">
            <i class="fas fa-edit"></i> Editar ficha
          </button>
          <button class="btn btn-outline" data-action="consultar-ia">
            <i class="fas fa-robot"></i> Consultar IA
          </button>
          <button class="btn btn-primary" data-action="enviar-compras">
            <i class="fas fa-cart-arrow-down"></i> Enviar a compras
          </button>
        </div>
      `;

      this.refs.detalle
        .querySelector('[data-action="editar-ficha"]')
        .addEventListener('click', () => this.editarFicha(producto));
      this.refs.detalle
        .querySelector('[data-action="consultar-ia"]')
        .addEventListener('click', () => IACatalogoPanel.open(producto));
      this.refs.detalle
        .querySelector('[data-action="enviar-compras"]')
        .addEventListener('click', () => this.enviarACompras(producto));
      this.refs.detalle
        .querySelector('[data-action="agregar-proveedor"]')
        .addEventListener('click', () => this.editarProveedor(producto));
      this.refs.detalle.querySelectorAll('[data-action="editar-proveedor"]').forEach((btn) => {
        btn.addEventListener('click', () =>
          this.editarProveedor(producto, Number(btn.dataset.index))
        );
      });
    },

    async cargarDesdeCatalogoAutopartes() {
      try {
        const respuesta = await fetch('productos.json', { cache: 'no-store' });
        if (!respuesta.ok) {
          return [];
        }
        const data = await respuesta.json();
        return this.transformarCatalogoAutopartes(data);
      } catch (error) {
        console.warn('Catálogo técnico: no se pudo transformar productos.json', error);
        return [];
      }
    },

    transformarCatalogoAutopartes(data) {
      const utils = window.Utils || {
        generateId(prefix = 'id') {
          return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        },
      };

      const grupos = data?.catalogo_autopartes_ecuador?.productos;
      if (!Array.isArray(grupos) || !grupos.length) {
        return [];
      }

      const fecha = data?.catalogo_autopartes_ecuador?.fecha_generacion || new Date().toISOString();
      const items = [];

      grupos.forEach((grupo, grupoIndex) => {
        const categoriaNombre = grupo?.tipo_producto || 'General';
        const procedimientos = PROCEDIMIENTOS_POR_CATEGORIA[categoriaNombre] || [];
        (grupo?.ejemplos || []).forEach((producto, productoIndex) => {
          if (!producto?.nombre_producto) {
            return;
          }

          const sku = producto.sku_numero_parte_comun || utils.generateId('sku');
          const slugBase = `${categoriaNombre}-${sku}-${producto.nombre_producto}`;
          const id = `cat-${this.slugify(slugBase, `item-${grupoIndex}-${productoIndex}`)}`;

          const compatibilidad = Array.isArray(producto.compatibilidad)
            ? producto.compatibilidad.map((ref) => ({
                marca: ref?.marca_vehiculo || '',
                modelo: ref?.modelo || '',
                anios: ref?.rango_anos || '',
                motor: ref?.motor || '',
                detalle: '',
                notas: '',
              }))
            : [];

          const especificaciones = {};
          if (Array.isArray(producto.especificaciones_tecnicas_clave)) {
            producto.especificaciones_tecnicas_clave.forEach((spec) => {
              if (typeof spec !== 'string') return;
              const [clave, valor] = spec.split(':');
              if (!clave) return;
              especificaciones[clave.trim()] = valor ? valor.trim() : '';
            });
          }

          if (producto.marca_producto) {
            especificaciones.Marca = producto.marca_producto;
          }

          if (producto.numero_parte_oem) {
            especificaciones['Número OEM'] = producto.numero_parte_oem;
          }

          const proveedores = Array.isArray(producto.proveedores_potenciales_ecuador)
            ? producto.proveedores_potenciales_ecuador
                .map((prov) =>
                  this.crearProveedorDesdeReferencia(prov?.nombre_proveedor, prov?.ubicacion_ciudad)
                )
                .filter(Boolean)
            : [];

          const aplicacionesCompat = compatibilidad
            .map((ref) =>
              [ref.marca, ref.modelo, ref.anios && `(${ref.anios})`, ref.motor]
                .filter(Boolean)
                .join(' ')
            )
            .filter(Boolean);

          const aplicaciones = [
            producto.descripcion_corta || '',
            producto.marca_producto ? `Marca comercial: ${producto.marca_producto}` : '',
          ]
            .concat(aplicacionesCompat.slice(0, 2))
            .filter(Boolean);

          const palabrasClave = new Set();
          [
            sku,
            producto.nombre_producto,
            producto.marca_producto,
            categoriaNombre,
            producto.numero_parte_oem,
          ]
            .filter(Boolean)
            .forEach((valor) => palabrasClave.add(valor.toString().toLowerCase()));

          compatibilidad.forEach((ref) => {
            [ref.marca, ref.modelo, ref.motor]
              .filter(Boolean)
              .forEach((valor) => palabrasClave.add(valor.toString().toLowerCase()));
          });

          items.push({
            id,
            sku,
            nombre: producto.nombre_producto,
            categoria: categoriaNombre,
            subcategoria: this.deducirSubcategoria(producto.nombre_producto, categoriaNombre),
            descripcion: producto.descripcion_corta || '',
            aplicaciones,
            compatibilidad,
            especificaciones,
            procedimientos,
            fotoUrl: '',
            proveedores,
            palabrasClave: Array.from(palabrasClave),
            estado: 'activo',
            ultimaRevision: fecha,
            origenDatos: 'catalogo_autopartes_ecuador',
          });
        });
      });

      return items;
    },

    crearProveedorDesdeReferencia(nombre, ciudad) {
      if (!nombre) {
        return null;
      }

      const info = PROVEEDORES_INFO[nombre] || {};
      const slug = this.slugify(nombre, 'prov');
      const ubicacion = info.direccion || ciudad || '';
      const notas = [
        info.notas || '',
        info.web ? `Web: ${info.web}` : '',
        !info.direccion && ciudad ? `Ciudad: ${ciudad}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const proveedor = {
        id: `prov-${slug}`,
        nombre,
        contacto: info.contacto || '',
        telefono: info.telefono || '',
        email: info.email || '',
        ubicacion,
        disponibilidad: ciudad ? `Atención en ${ciudad}` : 'Consultar disponibilidad',
        notas,
      };

      if (!this.esProveedorDeEcuador(proveedor)) {
        return null;
      }

      return proveedor;
    },

    deducirSubcategoria(nombre, categoriaFallback) {
      if (!nombre) {
        return categoriaFallback || 'General';
      }

      const texto = nombre.toLowerCase();
      if (texto.includes('pastilla')) return 'Pastillas de freno';
      if (texto.includes('disco')) return 'Discos de freno';
      if (texto.includes('bomba de freno')) return 'Bombas de freno';
      if (texto.includes('bomba de agua')) return 'Bombas de agua';
      if (texto.includes('banda') || texto.includes('correa')) return 'Correas y bandas';
      if (texto.includes('sensor')) return 'Sensores';
      if (texto.includes('amortiguador')) return 'Amortiguadores';
      if (texto.includes('rótula') || texto.includes('rotula')) return 'Rótulas';
      if (texto.includes('brazo')) return 'Brazos de control';
      if (texto.includes('inyector')) return 'Inyectores';
      if (
        texto.includes('bomba de gasolina') ||
        texto.includes('módulo') ||
        texto.includes('modulo')
      )
        return 'Módulos de combustible';
      if (texto.includes('regulador')) return 'Reguladores de presión';
      if (texto.includes('filtro') && texto.includes('cabina')) return 'Filtros de cabina';
      if (texto.includes('filtro') && texto.includes('combustible'))
        return 'Filtros de combustible';
      if (texto.includes('filtro') && texto.includes('aire')) return 'Filtros de aire';
      return categoriaFallback || 'General';
    },

    esProveedorDeEcuador(proveedor = {}) {
      if (!proveedor || !proveedor.nombre) {
        return false;
      }

      if (PROVEEDORES_INFO[proveedor.nombre]) {
        return true;
      }

      const ubicacion = this.normalizarTexto(proveedor.ubicacion || '');
      if (ubicacion) {
        if (ubicacion.includes('ecuador')) {
          return true;
        }
        if (this.esCiudadEcuatoriana(ubicacion)) {
          return true;
        }
        if (
          /(usa|miami|peru|colombia|argentina|chile|brasil|mexico|panama|japon|jap|spain|espa|canada|canad)/.test(
            ubicacion
          )
        ) {
          return false;
        }
      }

      const telefono = this.normalizarTelefono(proveedor.telefono || '');
      if (telefono) {
        if (telefono.startsWith('+') && !telefono.startsWith('+593')) {
          return false;
        }
        if (telefono.startsWith('+593') || telefono.startsWith('593')) {
          return true;
        }
        if (telefono.startsWith('0') && telefono.length >= 9 && telefono.length <= 10) {
          return true;
        }
      }

      return false;
    },

    esCiudadEcuatoriana(texto = '') {
      if (!texto) return false;
      return CIUDADES_ECUADOR.some((ciudad) => texto.includes(this.normalizarTexto(ciudad)));
    },

    normalizarTelefono(telefono = '') {
      return telefono.toString().replace(/[^0-9+]/g, '');
    },

    normalizarTexto(texto = '') {
      return texto
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    },

    slugify(valor, fallback = 'item') {
      if (!valor) {
        return fallback;
      }

      return (
        valor
          .toString()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || fallback
      );
    },

    enviarACompras(producto) {
      if (!producto) {
        Utils.showToast('Selecciona un producto primero', 'warning');
        return;
      }

      console.log('📦 Enviando a compras:', producto.nombre);

      // Estrategia 1: Usar función de compras si existe
      if (window.Compras && typeof Compras.agregarItemDesdeExterno === 'function') {
        const proveedor = producto.proveedores?.[0];

        Compras.agregarItemDesdeExterno({
          productoId: producto.id,
          productoNombre: producto.nombre,
          sku: producto.sku,
          cantidad: 1,
          precioUnitario: proveedor?.costoReferencial || producto.precioCompra || 0,
          proveedorNombre: proveedor?.nombre,
          proveedorId: proveedor?.id,
          proveedorContacto: proveedor?.contacto,
          proveedorTelefono: proveedor?.telefono,
          proveedorEmail: proveedor?.email,
          categoria: producto.categoria,
          origenCatalogo: true,
          especificaciones: producto.especificaciones,
          compatibilidad: producto.compatibilidad,
        });

        Utils.showToast(`✅ ${producto.nombre} agregado a compras`, 'success');
        this.cerrarModal(); // Cerrar modal del catálogo
        return;
      }

      // Estrategia 2: Abrir compras con datos en sessionStorage
      if (window.App && typeof App.loadModule === 'function') {
        sessionStorage.setItem('catalogo_producto_compra', JSON.stringify(producto));
        App.loadModule('compras');
        Utils.showToast('Abriendo módulo de compras...', 'info');
        this.cerrarModal();
        return;
      }

      // Estrategia 3: Copiar datos al portapapeles
      const proveedor = producto.proveedores?.[0];
      const texto = `${producto.nombre}\nSKU: ${producto.sku}\nProveedor: ${proveedor?.nombre || 'N/A'}\nPrecio: $${proveedor?.costoReferencial || 0}\nTeléfono: ${proveedor?.telefono || 'N/A'}`;

      if (navigator.clipboard) {
        navigator.clipboard.writeText(texto);
        Utils.showToast('Datos del producto copiados al portapapeles', 'info');
      } else {
        Utils.showToast('Módulo de compras no disponible', 'warning');
      }
    },

    actualizarContadores() {
      if (!this.refs.contadorCompra) return;
      const items = Database.getCollection('comprasPorHacer') || [];
      this.refs.contadorCompra.textContent = items.length;
    },

    editarFicha(producto) {
      const modalId = 'modalEditarFicha';
      Utils.closeModal(modalId);

      const body = `
        <form id="${modalId}Form" class="form-grid">
          <div class="form-group">
            <label>Nombre</label>
            <input type="text" name="nombre" value="${Utils.sanitize(producto.nombre)}" required>
          </div>
          <div class="form-group">
            <label>SKU</label>
            <input type="text" name="sku" value="${Utils.sanitize(producto.sku || '')}">
          </div>
          <div class="form-group">
            <label>Categoría</label>
            <input type="text" name="categoria" value="${Utils.sanitize(producto.categoria || '')}" required>
          </div>
          <div class="form-group">
            <label>Sistema</label>
            <input type="text" name="subcategoria" value="${Utils.sanitize(producto.subcategoria || '')}">
          </div>
          <div class="form-group">
            <label>Estado</label>
            <select name="estado">
              <option value="activo" ${producto.estado === 'activo' ? 'selected' : ''}>Activo</option>
              <option value="en validacion" ${producto.estado === 'en validacion' ? 'selected' : ''}>En validación</option>
              <option value="descontinuado" ${producto.estado === 'descontinuado' ? 'selected' : ''}>Descontinuado</option>
            </select>
          </div>
          <div class="form-group">
            <label>Palabras clave</label>
            <input type="text" name="palabrasClave" value="${Utils.sanitize((producto.palabrasClave || []).join(', '))}" placeholder="Separadas por coma">
          </div>
          <div class="form-group full">
            <label>Descripción</label>
            <textarea name="descripcion" rows="3">${Utils.sanitize(producto.descripcion || '')}</textarea>
          </div>
          <div class="form-group full">
            <label>Aplicaciones (una por línea)</label>
            <textarea name="aplicaciones" rows="3">${Utils.sanitize((producto.aplicaciones || []).join('\n'))}</textarea>
          </div>
          <div class="form-group full">
            <label>Especificaciones (clave:valor por línea)</label>
            <textarea name="especificaciones" rows="3">${Utils.sanitize(this.stringifyMap(producto.especificaciones))}</textarea>
          </div>
        </form>
      `;

      const footer = `
        <button class="btn btn-secondary" type="button" onclick="Utils.closeModal('${modalId}')">Cancelar</button>
        <button class="btn btn-primary" type="submit" form="${modalId}Form">Guardar cambios</button>
      `;

      const overlay = Utils.createModal(modalId, 'Editar ficha técnica', body, footer, 'large');
      const form = overlay.querySelector('form');
      if (!form) {
        console.error('Catalogo.editarFicha: no se encontró el formulario en el modal.');
        return;
      }

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const actualizaciones = {
          nombre: formData.get('nombre'),
          sku: formData.get('sku'),
          categoria: formData.get('categoria'),
          subcategoria: formData.get('subcategoria'),
          estado: formData.get('estado'),
          descripcion: formData.get('descripcion'),
          aplicaciones: (formData.get('aplicaciones') || '')
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
          palabrasClave: (formData.get('palabrasClave') || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          especificaciones: this.parseKeyValue(formData.get('especificaciones')),
          ultimaRevision: new Date().toISOString(),
        };

        this.actualizarProducto(producto.id, actualizaciones);
        Utils.showToast('Ficha actualizada exitosamente.', 'success');
        Utils.closeModal(modalId);
      });
    },

    parseKeyValue(texto) {
      const resultado = {};
      if (!texto) return resultado;
      texto.split('\n').forEach((linea) => {
        const [clave, valor] = linea.split(':');
        if (clave && valor) {
          resultado[clave.trim()] = valor.trim();
        }
      });
      return resultado;
    },

    stringifyMap(map) {
      if (!map) return '';
      return Object.entries(map)
        .map(([clave, valor]) => `${clave}: ${valor}`)
        .join('\n');
    },

    editarProveedor(producto, index = null) {
      const proveedor = index !== null ? { ...(producto.proveedores?.[index] || {}) } : {};
      const modalId = 'modalEditarProveedor';
      Utils.closeModal(modalId);

      const body = `
        <div class="form-grid">
          <div class="form-group">
            <label>Nombre</label>
            <input type="text" name="nombre" value="${Utils.sanitize(proveedor.nombre || '')}" required>
          </div>
          <div class="form-group">
            <label>Contacto</label>
            <input type="text" name="contacto" value="${Utils.sanitize(proveedor.contacto || '')}">
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input type="text" name="telefono" value="${Utils.sanitize(proveedor.telefono || '')}">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" value="${Utils.sanitize(proveedor.email || '')}">
          </div>
          <div class="form-group">
            <label>Ubicación</label>
            <input type="text" name="ubicacion" value="${Utils.sanitize(proveedor.ubicacion || '')}">
          </div>
          <div class="form-group">
            <label>Costo referencial</label>
            <input type="number" name="costoReferencial" step="0.01" min="0" value="${proveedor.costoReferencial !== undefined ? proveedor.costoReferencial : ''}">
          </div>
          <div class="form-group">
            <label>Disponibilidad</label>
            <input type="text" name="disponibilidad" value="${Utils.sanitize(proveedor.disponibilidad || '')}" placeholder="Ej: 48h, bajo pedido…">
          </div>
          <div class="form-group full">
            <label>Notas</label>
            <textarea name="notas" rows="3">${Utils.sanitize(proveedor.notas || '')}</textarea>
          </div>
        </div>
      `;

      const footer = `
        <button class="btn btn-danger" type="button" data-action="eliminar">Eliminar</button>
        <div class="modal-actions">
          <button class="btn btn-secondary" type="button" onclick="Utils.closeModal('${modalId}')">Cancelar</button>
          <button class="btn btn-primary" type="submit">Guardar</button>
        </div>
      `;

      const overlay = Utils.createModal(
        modalId,
        index !== null ? 'Editar proveedor' : 'Agregar proveedor',
        body,
        footer,
        'large'
      );
      const form = overlay.querySelector('form');

      overlay.querySelector('[data-action="eliminar"]').addEventListener('click', () => {
        if (index === null) {
          Utils.showToast('Este proveedor aún no ha sido guardado.', 'info');
          return;
        }
        Utils.showConfirm('¿Eliminar este proveedor del ítem?', () => {
          const copia = [...(producto.proveedores || [])];
          copia.splice(index, 1);
          this.actualizarProducto(producto.id, { proveedores: copia });
          Utils.closeModal(modalId);
          Utils.showToast('Proveedor eliminado.', 'success');
        });
      });

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const registro = {
          id: proveedor.id || Utils.generateId(),
          nombre: formData.get('nombre'),
          contacto: formData.get('contacto') || '',
          telefono: formData.get('telefono') || '',
          email: formData.get('email') || '',
          ubicacion: formData.get('ubicacion') || '',
          costoReferencial: formData.get('costoReferencial')
            ? Number(formData.get('costoReferencial'))
            : undefined,
          disponibilidad: formData.get('disponibilidad') || '',
          notas: formData.get('notas') || '',
        };

        const proveedoresActuales = [...(producto.proveedores || [])];
        if (index !== null) {
          proveedoresActuales[index] = registro;
        } else {
          proveedoresActuales.push(registro);
        }

        this.actualizarProducto(producto.id, { proveedores: proveedoresActuales });
        Utils.closeModal(modalId);
        Utils.showToast('Proveedor guardado.', 'success');
      });
    },

    actualizarProducto(id, updates) {
      this.data = this.data.map((item) => (item.id === id ? { ...item, ...updates } : item));
      Database.saveCollection('catalogoTecnico', this.data);
      this.indice = CatalogoBuscador.prepararIndice(this.data);
      this.prepararFiltros();
      this.aplicarBusqueda();
      if (this.seleccionado === id) {
        const actualizado = this.data.find((item) => item.id === id);
        this.renderDetalle(actualizado);
      }
    },
  };

  window.Catalogo = Catalogo;
  window.CatalogoProveedoresInfo = PROVEEDORES_INFO;
})();
