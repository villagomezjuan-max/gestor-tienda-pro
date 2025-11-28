/* ============================================
   Gestor Central: Usuarios + Negocios (Dashboard)
   ============================================ */

// Role normalization fallback for early executions before Auth.roles is ready.
const ROLE_FALLBACK_DEFAULT = 'vendedor';
const ROLE_FALLBACK_MAP = {
  superadmin: 'super_admin',
  'super-admin': 'super_admin',
  super_admin: 'super_admin',
  admin: 'admin',
  administrador: 'admin',
  gerente: 'admin',
  ventas: ROLE_FALLBACK_DEFAULT,
  vendedor: ROLE_FALLBACK_DEFAULT,
  user: ROLE_FALLBACK_DEFAULT,
  usuario: ROLE_FALLBACK_DEFAULT,
  technician: 'tecnico',
  tecnico: 'tecnico',
  mecanico: 'tecnico',
  mechanic: 'tecnico',
};

function fallbackNormalizeRole(value) {
  if (!value && value !== 0) {
    return ROLE_FALLBACK_DEFAULT;
  }

  const raw = value.toString().trim().toLowerCase();
  if (!raw) {
    return ROLE_FALLBACK_DEFAULT;
  }

  const ascii =
    typeof raw.normalize === 'function'
      ? raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      : raw;

  const mapped = ROLE_FALLBACK_MAP[raw] || ROLE_FALLBACK_MAP[ascii];
  return mapped || ascii || ROLE_FALLBACK_DEFAULT;
}

const ROLE_UTILS_FALLBACK = {
  ROLE_SUPER_ADMIN: 'super_admin',
  ROLE_ADMIN: 'admin',
  ROLE_VENDEDOR: ROLE_FALLBACK_DEFAULT,
  ROLE_TECNICO: 'tecnico',
  DEFAULT_ROLE: ROLE_FALLBACK_DEFAULT,
  normalize: fallbackNormalizeRole,
  is(role, targets) {
    if (!targets) {
      return false;
    }

    const normalizedRole = fallbackNormalizeRole(role);
    const list = Array.isArray(targets) ? targets : [targets];
    return list.some((item) => fallbackNormalizeRole(item) === normalizedRole);
  },
};

const MODULE_CATALOG = [
  {
    id: 'ventas',
    label: 'Ventas',
    description: 'Punto de venta, facturación y caja diaria.',
    category: 'ventas',
    requires: ['productos', 'clientes'],
    mandatory: true,
    defaultSelected: true,
    recommendedFor: ['all'],
    minPlan: 'basico',
  },
  {
    id: 'historial_ventas',
    label: 'Historial de Ventas',
    description: 'Auditoría completa de transacciones.',
    category: 'ventas',
    requires: ['ventas'],
    mandatory: true,
    defaultSelected: true,
    recommendedFor: ['all'],
    minPlan: 'basico',
  },
  {
    id: 'clientes',
    label: 'Clientes',
    description: 'Gestión integral de la base de clientes.',
    category: 'ventas',
    requires: [],
    mandatory: true,
    defaultSelected: true,
    recommendedFor: ['all'],
    minPlan: 'basico',
  },
  {
    id: 'contactos',
    label: 'Contactos',
    description: 'Directorio extendido de contactos y aliados.',
    category: 'ventas',
    requires: ['clientes'],
    mandatory: false,
    defaultSelected: false,
    recommendedFor: ['all'],
    minPlan: 'basico',
  },
  {
    id: 'taller',
    label: 'Taller',
    description: 'Activa la suite completa del taller automotriz.',
    category: 'taller',
    requires: [],
    mandatory: false,
    defaultSelected: false,
    recommendedFor: ['mecanica'],
    minPlan: 'pro',
  },
  {
    id: 'ordenes_trabajo',
    label: 'Órdenes de Trabajo',
    description: 'Planificación y seguimiento de servicios técnicos.',
    category: 'taller',
    requires: ['vehiculos', 'clientes'],
    mandatory: false,
    defaultSelected: false,
    recommendedFor: ['mecanica'],
    minPlan: 'pro',
  },
  {
    id: 'vehiculos',
    label: 'Vehículos',
    description: 'Historial y datos técnicos de cada vehículo.',
    category: 'taller',
    requires: ['clientes'],
    mandatory: false,
    defaultSelected: false,
    recommendedFor: ['mecanica'],
    minPlan: 'basico',
  },
  {
    id: 'mis_tareas',
    label: 'Mis Tareas',
    description: 'Panel operativo para técnicos y asignaciones.',
    category: 'taller',
    requires: ['ordenes_trabajo'],
    mandatory: false,
    defaultSelected: false,
    recommendedFor: ['mecanica'],
    minPlan: 'basico',
  },
  {
    id: 'agenda',
    label: 'Agenda',
    description: 'Calendario de citas, reservas y asignaciones.',
    category: 'taller',
    requires: ['clientes'],
    mandatory: false,
    defaultSelected: false,
    recommendedFor: ['mecanica', 'restaurante'],
    minPlan: 'basico',
  },
  {
    id: 'catalogo',
    label: 'Catálogo Técnico',
    description: 'Manual y fichas técnicas centralizadas.',
    category: 'taller',
    requires: ['productos'],
    mandatory: false,
    defaultSelected: false,
    recommendedFor: ['mecanica', 'ferreteria'],
    minPlan: 'pro',
  },
  {
    id: 'productos',
    label: 'Productos',
    description: 'Catálogo general con variantes y atributos.',
    category: 'inventario',
    requires: [],
    mandatory: true,
    defaultSelected: true,
    recommendedFor: ['all'],
    minPlan: 'basico',
  },
  {
    id: 'inventario',
    label: 'Inventario',
    description: 'Control de stock, bodegas y movimientos.',
    category: 'inventario',
    requires: ['productos'],
    mandatory: true,
    defaultSelected: true,
    recommendedFor: ['all'],
    minPlan: 'basico',
  },
  {
    id: 'compras',
    label: 'Compras',
    description: 'Órdenes de compra, recepción y costos.',
    category: 'inventario',
    requires: ['inventario', 'proveedores'],
    mandatory: false,
    defaultSelected: false,
    recommendedFor: ['tiendas', 'ferreteria'],
    minPlan: 'basico',
  },
  {
    id: 'proveedores',
    label: 'Proveedores',
    description: 'Gestión de proveedores y condiciones comerciales.',
    category: 'inventario',
    requires: [],
    mandatory: false,
    defaultSelected: false,
    recommendedFor: ['tiendas', 'ferreteria'],
    minPlan: 'basico',
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    description: 'Flujo de caja, egresos y conciliaciones.',
    category: 'finanzas',
    requires: ['ventas'],
    mandatory: false,
    defaultSelected: true,
    recommendedFor: ['all'],
    minPlan: 'pro',
  },
  {
    id: 'analisis_financiero',
    label: 'Análisis Financiero',
    description: 'Indicadores clave y panel gerencial.',
    category: 'finanzas',
    requires: ['finanzas'],
    mandatory: false,
    defaultSelected: false,
    recommendedFor: ['all'],
    minPlan: 'pro',
    badge: 'Nuevo',
  },
  {
    id: 'contabilidad',
    label: 'Contabilidad',
    description: 'Integración contable y asientos automáticos.',
    category: 'finanzas',
    requires: ['finanzas'],
    mandatory: false,
    defaultSelected: false,
    recommendedFor: ['farmacia'],
    minPlan: 'enterprise',
  },
  {
    id: 'cuentas_por_cobrar_pagar',
    label: 'Cuentas por Cobrar/Pagar',
    description: 'Gestión de cartera y proveedores.',
    category: 'finanzas',
    requires: ['finanzas'],
    mandatory: false,
    defaultSelected: false,
    recommendedFor: ['all'],
    minPlan: 'pro',
  },
  {
    id: 'estadisticas',
    label: 'Estadísticas',
    description: 'Reportes y analítica personalizada.',
    category: 'finanzas',
    requires: ['ventas'],
    mandatory: false,
    defaultSelected: true,
    recommendedFor: ['all'],
    minPlan: 'pro',
  },
  {
    id: 'nuevo',
    label: 'Nuevo',
    description: 'Espacio reservado para funciones beta.',
    category: 'finanzas',
    requires: [],
    mandatory: false,
    defaultSelected: true,
    recommendedFor: ['all'],
    minPlan: 'pro',
    badge: 'Nuevo',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Campañas y automatizaciones segmentadas.',
    category: 'marketing',
    requires: ['clientes'],
    mandatory: false,
    defaultSelected: true,
    recommendedFor: ['tiendas', 'restaurante'],
    minPlan: 'pro',
  },
  {
    id: 'publicidad',
    label: 'Publicidad',
    description: 'Gestión de anuncios y promociones.',
    category: 'marketing',
    requires: ['clientes'],
    mandatory: false,
    defaultSelected: true,
    recommendedFor: ['tiendas'],
    minPlan: 'pro',
  },
  {
    id: 'notificaciones_inteligentes',
    label: 'Notificaciones IA',
    description: 'Automatiza notificaciones con IA secretaria.',
    category: 'marketing',
    requires: ['clientes'],
    mandatory: false,
    defaultSelected: true,
    recommendedFor: ['mecanica', 'restaurante', 'farmacia'],
    minPlan: 'basico',
  },
  {
    id: 'notificaciones',
    label: 'Notificaciones',
    description: 'Historial y envío de notificaciones.',
    category: 'marketing',
    requires: ['notificaciones_inteligentes'],
    mandatory: false,
    defaultSelected: true,
    recommendedFor: ['all'],
    minPlan: 'pro',
  },
  {
    id: 'historial_notificaciones',
    label: 'Historial de Notificaciones',
    description: 'Trazabilidad completa de mensajes enviados.',
    category: 'marketing',
    requires: ['notificaciones'],
    mandatory: false,
    defaultSelected: false,
    recommendedFor: ['all'],
    minPlan: 'pro',
  },
  {
    id: 'documentos',
    label: 'Documentos SRI',
    description: 'Comprobantes electrónicos, emisión y control.',
    category: 'sistema',
    requires: ['ventas'],
    mandatory: true,
    defaultSelected: true,
    recommendedFor: ['all'],
    minPlan: 'pro',
  },
  {
    id: 'importador',
    label: 'Importar CSV',
    description: 'Carga masiva de catálogos y clientes.',
    category: 'sistema',
    requires: [],
    mandatory: false,
    defaultSelected: true,
    recommendedFor: ['all'],
    minPlan: 'basico',
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    description: 'Ajustes generales del negocio.',
    category: 'sistema',
    requires: [],
    mandatory: false,
    defaultSelected: true,
    recommendedFor: ['all'],
    minPlan: 'basico',
  },
  {
    id: 'backup',
    label: 'Backup & Datos',
    description: 'Respaldos y restauración controlada.',
    category: 'sistema',
    requires: [],
    mandatory: false,
    defaultSelected: true,
    recommendedFor: ['all'],
    minPlan: 'pro',
    adminOnly: true,
  },
  {
    id: 'logs',
    label: 'Logs del Sistema',
    description: 'Auditoría y monitoreo técnico.',
    category: 'sistema',
    requires: [],
    mandatory: false,
    defaultSelected: false,
    recommendedFor: ['all'],
    minPlan: 'enterprise',
    adminOnly: true,
  },
  {
    id: 'gestor_central',
    label: 'Gestor Central',
    description: 'Panel maestro para super administradores.',
    category: 'sistema',
    requires: [],
    mandatory: false,
    defaultSelected: false,
    recommendedFor: ['all'],
    minPlan: 'enterprise',
    adminOnly: true,
  },
  {
    id: 'sistema',
    label: 'Sistema',
    description: 'Herramientas y diagnósticos del sistema.',
    category: 'sistema',
    requires: ['configuracion'],
    mandatory: false,
    defaultSelected: true,
    recommendedFor: ['all'],
    minPlan: 'pro',
  },
];

const MODULE_CATEGORY_ORDER = [
  'ventas',
  'taller',
  'inventario',
  'finanzas',
  'marketing',
  'sistema',
];

const MODULE_CATEGORY_LABELS = {
  ventas: 'Ventas y Clientes',
  taller: 'Operaciones Taller',
  inventario: 'Inventario y Compras',
  finanzas: 'Finanzas y Reportes',
  marketing: 'Marketing y Comunicación',
  sistema: 'Administración y Sistema',
};

const MODULE_LOOKUP = new Map(MODULE_CATALOG.map((module) => [module.id, module]));

const DEFAULT_BUSINESS_MODULES = MODULE_CATALOG.filter(
  (module) => module.mandatory || module.defaultSelected
).map((module) => module.id);

const composeBlueprintModules = (...extraModules) =>
  Array.from(new Set([...DEFAULT_BUSINESS_MODULES, ...extraModules]));

const BUSINESS_BLUEPRINTS = [
  {
    id: 'mecanica',
    displayName: 'Taller Mecánico',
    type: 'mecanica',
    plan: 'pro',
    planDisplay: 'Plan Pro',
    icon: 'fas fa-wrench',
    description: 'Servicios automotrices, órdenes y diagnósticos.',
    modules: composeBlueprintModules(
      'taller',
      'ordenes_trabajo',
      'vehiculos',
      'agenda',
      'catalogo',
      'mis_tareas',
      'notificaciones_inteligentes',
      'analisis_financiero'
    ),
  },
  {
    id: 'tiendas',
    displayName: 'Tienda / Retail',
    type: 'general',
    plan: 'pro',
    planDisplay: 'Plan Pro',
    icon: 'fas fa-store',
    description: 'Ventas rápidas, stock y promociones para comercios.',
    modules: composeBlueprintModules('compras', 'proveedores', 'marketing', 'publicidad'),
  },
  {
    id: 'ferreteria',
    displayName: 'Ferretería',
    type: 'general',
    plan: 'pro',
    planDisplay: 'Plan Pro',
    icon: 'fas fa-tools',
    description: 'Catálogo técnico, medidas y cotizaciones.',
    modules: composeBlueprintModules('compras', 'proveedores', 'catalogo'),
  },
  {
    id: 'restaurante',
    displayName: 'Restaurante',
    type: 'personalizado',
    plan: 'enterprise',
    planDisplay: 'Plan Enterprise',
    icon: 'fas fa-utensils',
    description: 'Gestión de reservas, comandas y campañas.',
    modules: composeBlueprintModules(
      'agenda',
      'marketing',
      'publicidad',
      'notificaciones_inteligentes'
    ),
  },
  {
    id: 'farmacia',
    displayName: 'Farmacia',
    type: 'personalizado',
    plan: 'enterprise',
    planDisplay: 'Plan Enterprise',
    icon: 'fas fa-pills',
    description: 'Control de productos regulados y vencimientos.',
    modules: composeBlueprintModules(
      'notificaciones_inteligentes',
      'notificaciones',
      'contabilidad',
      'cuentas_por_cobrar_pagar'
    ),
  },
];

/**
 * Filtra módulos según el tipo de negocio
 * - Siempre retorna módulos obligatorios (mandatory: true)
 * - Agrega módulos especializados según el tipo
 * - Filtra por adminOnly para super_admin
 */
function getModulesByBusinessType(businessType, isAdmin = false, options = {}) {
  const { includeAll = false } = options;

  const typeMap = {
    mecanica: 'mecanica',
    tiendas: 'tiendas',
    ferreteria: 'ferreteria',
    restaurante: 'restaurante',
    farmacia: 'farmacia',
    general: 'general',
    personalizado: 'personalizado',
  };

  const seen = new Set();
  const result = [];
  const pushModule = (module) => {
    if (!module) return;
    if (!isAdmin && module.adminOnly) return;
    if (seen.has(module.id)) return;
    seen.add(module.id);
    result.push(module);
  };

  MODULE_CATALOG.forEach((module) => {
    if (module.mandatory || module.defaultSelected) {
      pushModule(module);
    }
  });

  if (includeAll) {
    MODULE_CATALOG.forEach(pushModule);
    return result;
  }

  const typeKey = typeMap[businessType];
  if (typeKey) {
    MODULE_CATALOG.forEach((module) => {
      if (!module.mandatory && module.recommendedFor && module.recommendedFor.includes(typeKey)) {
        pushModule(module);
      }
    });
  }

  MODULE_CATALOG.forEach((module) => {
    if (!module.mandatory && !module.defaultSelected) {
      pushModule(module);
    }
  });

  return result;
}

const MODULE_ALIAS_MAP = {
  caja: 'ventas',
  promociones: 'marketing',
  cotizaciones: 'ventas',
  servicios: 'ordenes_trabajo',
  diagnosticos: 'ordenes_trabajo',
  citas: 'agenda',
  mesas: 'agenda',
  comandas: 'ordenes_trabajo',
  menu: 'productos',
  cocina: 'ordenes_trabajo',
  delivery: 'notificaciones_inteligentes',
  medicamentos: 'productos',
  recetas: 'documentos',
  vencimientos: 'notificaciones_inteligentes',
  medidas: 'inventario',
  documentos_sri: 'documentos',
  cuentas: 'cuentas_por_cobrar_pagar',
};

// Catálogo completo de iconos disponibles organizados por categoría
const ICON_CATALOG = {
  comercio: [
    { icon: 'fas fa-store', name: 'Tienda' },
    { icon: 'fas fa-shopping-cart', name: 'Carrito' },
    { icon: 'fas fa-shopping-bag', name: 'Bolsa' },
    { icon: 'fas fa-cash-register', name: 'Caja' },
    { icon: 'fas fa-tags', name: 'Etiquetas' },
    { icon: 'fas fa-box-open', name: 'Caja Abierta' },
    { icon: 'fas fa-warehouse', name: 'Almacén' },
    { icon: 'fas fa-barcode', name: 'Código de Barras' },
  ],
  taller: [
    { icon: 'fas fa-wrench', name: 'Llave' },
    { icon: 'fas fa-tools', name: 'Herramientas' },
    { icon: 'fas fa-car', name: 'Auto' },
    { icon: 'fas fa-cogs', name: 'Engranajes' },
    { icon: 'fas fa-oil-can', name: 'Aceite' },
    { icon: 'fas fa-car-battery', name: 'Batería' },
    { icon: 'fas fa-gas-pump', name: 'Gasolina' },
    { icon: 'fas fa-charging-station', name: 'Estación de Carga' },
  ],
  construccion: [
    { icon: 'fas fa-hammer', name: 'Martillo' },
    { icon: 'fas fa-toolbox', name: 'Caja de Herramientas' },
    { icon: 'fas fa-ruler-combined', name: 'Regla' },
    { icon: 'fas fa-industry', name: 'Industria' },
    { icon: 'fas fa-hard-hat', name: 'Casco' },
    { icon: 'fas fa-drafting-compass', name: 'Compás' },
    { icon: 'fas fa-paint-roller', name: 'Rodillo' },
    { icon: 'fas fa-screwdriver', name: 'Destornillador' },
  ],
  restaurante: [
    { icon: 'fas fa-utensils', name: 'Cubiertos' },
    { icon: 'fas fa-hotdog', name: 'Hot Dog' },
    { icon: 'fas fa-concierge-bell', name: 'Campana' },
    { icon: 'fas fa-mug-hot', name: 'Taza Caliente' },
    { icon: 'fas fa-pizza-slice', name: 'Pizza' },
    { icon: 'fas fa-hamburger', name: 'Hamburguesa' },
    { icon: 'fas fa-ice-cream', name: 'Helado' },
    { icon: 'fas fa-coffee', name: 'Café' },
  ],
  salud: [
    { icon: 'fas fa-pills', name: 'Pastillas' },
    { icon: 'fas fa-first-aid', name: 'Primeros Auxilios' },
    { icon: 'fas fa-prescription-bottle-alt', name: 'Frasco' },
    { icon: 'fas fa-stethoscope', name: 'Estetoscopio' },
    { icon: 'fas fa-syringe', name: 'Jeringa' },
    { icon: 'fas fa-heartbeat', name: 'Latido' },
    { icon: 'fas fa-hospital', name: 'Hospital' },
    { icon: 'fas fa-medkit', name: 'Botiquín' },
  ],
  tecnologia: [
    { icon: 'fas fa-laptop', name: 'Laptop' },
    { icon: 'fas fa-mobile-alt', name: 'Móvil' },
    { icon: 'fas fa-desktop', name: 'Escritorio' },
    { icon: 'fas fa-server', name: 'Servidor' },
    { icon: 'fas fa-database', name: 'Base de Datos' },
    { icon: 'fas fa-network-wired', name: 'Red' },
    { icon: 'fas fa-microchip', name: 'Microchip' },
    { icon: 'fas fa-code', name: 'Código' },
  ],
  negocio: [
    { icon: 'fas fa-briefcase', name: 'Maletín' },
    { icon: 'fas fa-chart-line', name: 'Gráfico' },
    { icon: 'fas fa-layer-group', name: 'Capas' },
    { icon: 'fas fa-building', name: 'Edificio' },
    { icon: 'fas fa-clipboard-list', name: 'Lista' },
    { icon: 'fas fa-project-diagram', name: 'Diagrama' },
    { icon: 'fas fa-sitemap', name: 'Mapa del Sitio' },
    { icon: 'fas fa-lightbulb', name: 'Idea' },
  ],
};

const ICON_SUGGESTIONS = {
  default: ['fas fa-store', 'fas fa-briefcase', 'fas fa-chart-line', 'fas fa-layer-group'],
  mecanica: [
    'fas fa-wrench',
    'fas fa-tools',
    'fas fa-car',
    'fas fa-cogs',
    'fas fa-oil-can',
    'fas fa-car-battery',
  ],
  tiendas: [
    'fas fa-cash-register',
    'fas fa-shopping-bag',
    'fas fa-tags',
    'fas fa-box-open',
    'fas fa-store',
    'fas fa-shopping-cart',
  ],
  ferreteria: [
    'fas fa-hammer',
    'fas fa-toolbox',
    'fas fa-ruler-combined',
    'fas fa-industry',
    'fas fa-hard-hat',
    'fas fa-screwdriver',
  ],
  restaurante: [
    'fas fa-utensils',
    'fas fa-hotdog',
    'fas fa-concierge-bell',
    'fas fa-mug-hot',
    'fas fa-pizza-slice',
    'fas fa-hamburger',
  ],
  farmacia: [
    'fas fa-pills',
    'fas fa-first-aid',
    'fas fa-prescription-bottle-alt',
    'fas fa-stethoscope',
    'fas fa-syringe',
    'fas fa-medkit',
  ],
  general: [
    'fas fa-warehouse',
    'fas fa-building',
    'fas fa-clipboard-list',
    'fas fa-project-diagram',
    'fas fa-briefcase',
    'fas fa-store',
  ],
  personalizado: [
    'fas fa-laptop',
    'fas fa-cubes',
    'fas fa-sitemap',
    'fas fa-lightbulb',
    'fas fa-layer-group',
    'fas fa-chart-line',
  ],
};

const AdminHub = {
  container: null,
  state: {
    users: [],
    negocios: [],
    negocioActual: null,
    session: null,
    userFilters: {
      search: '',
      role: 'todos',
      status: 'todos',
    },
    businessFilters: {
      status: 'todos',
    },
  },

  getRoleUtils() {
    if (typeof Auth !== 'undefined' && Auth && Auth.roles) {
      return Auth.roles;
    }
    if (typeof window !== 'undefined' && window.RoleUtils) {
      return window.RoleUtils;
    }
    return ROLE_UTILS_FALLBACK;
  },

  normalizeRole(role) {
    const utils = this.getRoleUtils();
    if (utils && typeof utils.normalize === 'function') {
      return utils.normalize(role);
    }
    return fallbackNormalizeRole(role);
  },

  getRoleConstants() {
    const utils = this.getRoleUtils();
    return {
      superAdmin: this.normalizeRole(utils?.ROLE_SUPER_ADMIN || 'super_admin'),
      admin: this.normalizeRole(utils?.ROLE_ADMIN || 'admin'),
      vendedor: this.normalizeRole(
        utils?.ROLE_VENDEDOR || utils?.DEFAULT_ROLE || ROLE_FALLBACK_DEFAULT
      ),
      tecnico: this.normalizeRole(utils?.ROLE_TECNICO || 'tecnico'),
    };
  },

  isRole(role, targets) {
    const utils = this.getRoleUtils();
    if (utils && typeof utils.is === 'function') {
      return utils.is(role, targets);
    }
    if (!targets) {
      return false;
    }
    const normalizedRole = this.normalizeRole(role);
    const list = Array.isArray(targets) ? targets : [targets];
    return list.some((item) => this.normalizeRole(item) === normalizedRole);
  },

  getDefaultRole() {
    const { vendedor } = this.getRoleConstants();
    return vendedor || ROLE_FALLBACK_DEFAULT;
  },

  getAssignableRoles(includeSuperAdmin = false) {
    const { superAdmin, admin, vendedor, tecnico } = this.getRoleConstants();
    const roles = [admin, vendedor, tecnico].filter(Boolean);
    if (includeSuperAdmin && superAdmin) {
      roles.unshift(superAdmin);
    }
    return Array.from(new Set(roles));
  },

  renderRoleFilterOptions() {
    const { superAdmin, admin, vendedor, tecnico } = this.getRoleConstants();
    const options = [
      { value: superAdmin, label: 'Superadministradores' },
      { value: admin, label: 'Administradores' },
      { value: vendedor, label: 'Vendedores' },
      { value: tecnico, label: 'Técnicos' },
    ];
    const seen = new Set();
    return options
      .filter((option) => {
        if (!option.value) {
          return false;
        }
        if (seen.has(option.value)) {
          return false;
        }
        seen.add(option.value);
        return true;
      })
      .map((option) => `<option value="${option.value}">${option.label}</option>`)
      .join('');
  },

  async render(container) {
    await Auth.ready();

    this.container = container;
    this.state.session = Auth.getSession();

    if (!Auth.isAdmin()) {
      container.innerHTML = `
        <div class="admin-hub-empty">
          <i class="fas fa-lock"></i>
          <h3>Acceso restringido</h3>
          <p>Necesitas privilegios de administrador para usar este módulo.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.template();
    this.bindEvents();
    await this.loadData();
  },

  template() {
    return `
      <div class="admin-hub" data-admin-hub-root>
        <section class="admin-hub-header">
          <div>
            <h2><i class="fas fa-layer-group"></i> Gestor Central</h2>
            <p>Administración jerárquica de negocios y usuarios del sistema</p>
          </div>
          <div class="admin-hub-actions">
            <button class="btn secondary" data-admin-hub-action="refresh">
              <i class="fas fa-sync-alt"></i> Actualizar
            </button>
            <button class="btn secondary" data-admin-hub-action="new-business">
              <i class="fas fa-store-alt"></i> Crear Negocio
            </button>
            <button class="btn" data-admin-hub-action="new-user">
              <i class="fas fa-user-plus"></i> Crear Usuario
            </button>
          </div>
        </section>

        <section class="admin-hub-stats" id="adminHubStats">
          ${this.renderStatsSkeleton()}
        </section>

        <div class="admin-hub-panels">
          <!-- Vista Jerárquica: Negocios con sus Usuarios -->
          <section class="admin-hub-panel admin-hub-hierarchy" id="adminHubHierarchyPanel">
            <div class="panel-header">
              <h3><i class="fas fa-sitemap"></i> Vista Jerárquica</h3>
              <div class="panel-toolbar">
                <input type="search" id="adminHubHierarchySearch" placeholder="Buscar negocio o usuario..." autocomplete="off">
                <select id="adminHubHierarchyFilter">
                  <option value="todos">Todos los negocios</option>
                  <option value="activos">Solo activos</option>
                  <option value="con-usuarios">Con usuarios</option>
                </select>
                <button class="btn-icon" data-admin-hub-toggle-view="compact" title="Cambiar vista">
                  <i class="fas fa-th-list"></i>
                </button>
              </div>
            </div>
            <div class="panel-content hierarchy-view" id="adminHubHierarchyContent">
              ${this.renderTablePlaceholder('Cargando estructura organizacional...')}
            </div>
          </section>

          <!-- Panel de Estadísticas Detalladas -->
          <section class="admin-hub-panel" id="adminHubDetailsPanel">
            <div class="panel-header">
              <h3><i class="fas fa-chart-pie"></i> Análisis Detallado</h3>
            </div>
            <div class="panel-content" id="adminHubDetailsContent">
              ${this.renderTablePlaceholder('Selecciona un negocio para ver detalles...')}
            </div>
          </section>
        </div>
      </div>
    `;
  },

  renderStatsSkeleton() {
    return `
      <article class="admin-hub-card">
        <span class="label">Usuarios Totales</span>
        <span class="value">--</span>
        <span class="meta"><i class="fas fa-circle-notch fa-spin"></i> Preparando datos</span>
      </article>
      <article class="admin-hub-card">
        <span class="label">Activos</span>
        <span class="value">--</span>
        <span class="meta">-- activos / -- inactivos</span>
      </article>
      <article class="admin-hub-card">
        <span class="label">Negocios Activos</span>
        <span class="value">--</span>
        <span class="meta">-- totales</span>
      </article>
      <article class="admin-hub-card">
        <span class="label">Superadministradores</span>
        <span class="value">--</span>
        <span class="meta">Gestionando instancias</span>
      </article>
    `;
  },

  renderTablePlaceholder(message) {
    const safeMessage = Utils.sanitize(message || 'Cargando...');
    return `
      <div class="admin-hub-empty">
        <i class="fas fa-spinner fa-spin"></i>
        <p>${safeMessage}</p>
      </div>
    `;
  },

  bindEvents() {
    if (!this.container) return;

    this.container.addEventListener('click', async (event) => {
      const target = event.target;

      // Acciones principales del header
      const mainActionBtn = target.closest('[data-admin-hub-action]');
      if (mainActionBtn) {
        const action = mainActionBtn.getAttribute('data-admin-hub-action');
        switch (action) {
          case 'refresh':
            await this.loadData();
            break;
          case 'new-user':
            this.openUserModal(null, mainActionBtn.getAttribute('data-preselect-business'));
            break;
          case 'new-business':
            this.openBusinessModal();
            break;
        }
        return;
      }

      // Acciones en tarjetas de negocio y filas de usuario
      const toggleBusinessBtn = target.closest('[data-admin-hub-toggle]');
      if (toggleBusinessBtn) {
        await this.toggleBusinessStatus(toggleBusinessBtn.getAttribute('data-admin-hub-toggle'));
        return;
      }

      const deleteBusinessBtn = target.closest('[data-admin-hub-delete-business]');
      if (deleteBusinessBtn) {
        await this.deleteBusiness(deleteBusinessBtn.getAttribute('data-admin-hub-delete-business'));
        return;
      }

      const setActiveBtn = target.closest('[data-admin-hub-set-active]');
      if (setActiveBtn) {
        await this.changeActiveBusiness(setActiveBtn.getAttribute('data-admin-hub-set-active'));
        return;
      }

      const editBusinessBtn = target.closest('[data-admin-hub-edit-business]');
      if (editBusinessBtn) {
        this.openBusinessModal(editBusinessBtn.getAttribute('data-admin-hub-edit-business'));
        return;
      }

      const jumpToUserBtn = target.closest('[data-admin-hub-jump-business]');
      if (jumpToUserBtn) {
        this.jumpToUserBusiness(jumpToUserBtn.getAttribute('data-admin-hub-jump-business'));
        return;
      }

      const editUserBtn = target.closest('[data-admin-hub-edit-user]');
      if (editUserBtn) {
        this.openUserModal(editUserBtn.getAttribute('data-admin-hub-edit-user'));
        return;
      }

      const toggleUserBtn = target.closest('[data-admin-hub-toggle-user]');
      if (toggleUserBtn) {
        await this.toggleUserStatus(toggleUserBtn.getAttribute('data-admin-hub-toggle-user'));
        return;
      }

      const deleteUserBtn = target.closest('[data-admin-hub-delete-user]');
      if (deleteUserBtn) {
        await this.deleteUser(deleteUserBtn.getAttribute('data-admin-hub-delete-user'));
        return;
      }

      const resetPassBtn = target.closest('[data-admin-hub-reset-password]');
      if (resetPassBtn) {
        await this.resetPassword(resetPassBtn.getAttribute('data-admin-hub-reset-password'));
        return;
      }

      // Clic en tarjeta de negocio para mostrar análisis detallado
      // Solo si no se hizo clic en un botón o elemento interactivo
      const businessCard = target.closest('[data-business-card]');
      if (
        businessCard &&
        !target.closest('button') &&
        !target.closest('a') &&
        !target.closest('input')
      ) {
        const businessId = businessCard.getAttribute('data-business-card');
        if (businessId) {
          this.selectBusinessForAnalysis(businessId);
        }
        return;
      }
    });

    // Listeners para filtros y búsquedas
    const hierarchySearch = this.container.querySelector('#adminHubHierarchySearch');
    if (hierarchySearch) {
      hierarchySearch.addEventListener('input', (event) => {
        this.state.hierarchySearch = event.target.value || '';
        this.renderHierarchy();
      });
    }

    const hierarchyFilter = this.container.querySelector('#adminHubHierarchyFilter');
    if (hierarchyFilter) {
      hierarchyFilter.addEventListener('change', (event) => {
        this.state.hierarchyFilter = event.target.value || 'todos';
        this.renderHierarchy();
      });
    }
  },

  async loadData() {
    try {
      Utils.showLoading(true);
      await this.fetchData();
      this.renderStats();
      this.renderHierarchy(); // Nueva vista jerárquica
      this.renderSelectedBusinessDetails();
    } catch (error) {
      console.error('AdminHub.loadData error:', error);
      if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
        Utils.showToast(error?.message || 'No se pudo cargar el Gestor Central.', 'error');
      }
    } finally {
      Utils.showLoading(false);
    }
  },

  async fetchData() {
    const requests = [
      Auth.getAllUsers(),
      Auth._request('/negocios'),
      Auth._request('/negocios/mis').catch(() => null),
    ];

    const [users, negociosResp, misNegocios] = await Promise.all(requests);

    const session = Auth.getSession();
    this.state.session = session;

    const negocioActual = misNegocios?.negocioActual || session?.negocioId || null;
    this.state.negocioActual = negocioActual;

    const negocios = Array.isArray(negociosResp?.negocios) ? negociosResp.negocios : [];
    const allowedSet = this.getAllowedNegocioSet();

    this.state.negocios = Auth.isSuperAdmin()
      ? negocios
      : negocios.filter((neg) => allowedSet.has(neg.id));

    this.state.users = Array.isArray(users) ? users : [];
  },

  async renderAll() {
    this.renderStats();
    this.renderHierarchy();
    this.renderSelectedBusinessDetails();
  },

  renderSelectedBusinessDetails() {
    if (!this.container) {
      return;
    }

    if (this.state.selectedBusinessId) {
      this.renderBusinessDetails(this.state.selectedBusinessId);
      return;
    }

    const detailsContainer = this.container.querySelector('#adminHubDetailsContent');
    if (detailsContainer) {
      detailsContainer.innerHTML = this.renderTablePlaceholder(
        'Selecciona un negocio para ver detalles...'
      );
    }
  },

  renderStats() {
    const statsContainer = this.container.querySelector('#adminHubStats');
    if (!statsContainer) return;

    const usuarios = this.state.users;
    const negocios = this.state.negocios;

    const totalUsuarios = usuarios.length;
    const usuariosActivos = usuarios.filter((user) => user.activo).length;
    const usuariosInactivos = totalUsuarios - usuariosActivos;
    const { superAdmin, admin } = this.getRoleConstants();
    const superAdmins = usuarios.filter((user) => this.isRole(user.rol, superAdmin)).length;
    const adminRoles = usuarios.filter((user) => this.isRole(user.rol, [admin, superAdmin])).length;

    const negociosActivos = negocios.filter(
      (negocio) => negocio.activo !== false && (negocio.estado || 'activo') === 'activo'
    ).length;
    const negociosInactivos = negocios.length - negociosActivos;

    statsContainer.innerHTML = `
      <article class="admin-hub-card">
        <span class="label">Usuarios Totales</span>
        <span class="value">${totalUsuarios}</span>
        <span class="meta"><i class="fas fa-user-shield"></i> ${adminRoles} con rol de administración</span>
      </article>
      <article class="admin-hub-card">
        <span class="label">Usuarios Activos</span>
        <span class="value">${usuariosActivos}</span>
        <span class="meta">${usuariosActivos} activos / ${usuariosInactivos} inactivos</span>
      </article>
      <article class="admin-hub-card">
        <span class="label">Negocios Activos</span>
        <span class="value">${negociosActivos}</span>
        <span class="meta">${negocios.length} totales / ${negociosInactivos} inactivos</span>
      </article>
      <article class="admin-hub-card">
        <span class="label">Superadministradores</span>
        <span class="value">${superAdmins}</span>
        <span class="meta">${superAdmins ? 'Supervisión global' : 'Sin superadmins asignados'}</span>
      </article>
    `;
  },

  // Nueva vista jerárquica: Negocios con sus usuarios
  renderHierarchy() {
    const container = this.container.querySelector('#adminHubHierarchyContent');
    if (!container) return;

    const searchTerm = (this.state.hierarchySearch || '').toLowerCase();
    const filter = this.state.hierarchyFilter || 'todos';

    let negocios = [...this.state.negocios];

    // Aplicar filtros
    if (filter === 'activos') {
      negocios = negocios.filter((n) => n.activo !== false && (n.estado || 'activo') === 'activo');
    } else if (filter === 'con-usuarios') {
      negocios = negocios.filter((n) => {
        const usuarios = this.getUsersByNegocio(n.id);
        return usuarios.length > 0;
      });
    }

    // Buscar en negocios y usuarios
    if (searchTerm) {
      negocios = negocios.filter((negocio) => {
        const negocioMatch =
          (negocio.nombre || '').toLowerCase().includes(searchTerm) ||
          (negocio.id || '').toLowerCase().includes(searchTerm);
        if (negocioMatch) return true;

        const usuarios = this.getUsersByNegocio(negocio.id);
        return usuarios.some(
          (u) =>
            (u.username || '').toLowerCase().includes(searchTerm) ||
            (u.nombre || '').toLowerCase().includes(searchTerm) ||
            (u.email || '').toLowerCase().includes(searchTerm)
        );
      });
    }

    const actual = this.state.negocioActual;
    const isSuper = Auth.isSuperAdmin();
    const currentUserId = this.state.session?.id || this.state.session?.userId;

    // Separar negocio del super admin
    const superAdminBusiness = negocios.find((n) => {
      const users = this.getUsersByNegocio(n.id);
      return users.some((u) => this.isRole(u.rol, this.getRoleConstants().superAdmin));
    });

    // Filtrar otros negocios
    let otherBusinesses = negocios.filter((n) => n.id !== superAdminBusiness?.id);

    let html = '';

    // Renderizar sección especial del super admin primero
    if (superAdminBusiness) {
      html += `
        <div class="super-admin-section">
          <div class="super-admin-header">
            <div class="super-admin-title">
              <span class="super-admin-icon">👑</span>
              <h2>Mi Negocio Principal</h2>
            </div>
            <p class="super-admin-subtitle">Sistema administrativo central - Control total</p>
          </div>
          ${this.renderBusinessCard(superAdminBusiness, actual, isSuper, currentUserId, searchTerm, true)}
        </div>
      `;
    }

    // Renderizar otras tiendas
    if (otherBusinesses.length > 0) {
      html += `
        <div class="other-businesses-section">
          <div class="section-header">
            <h3>
              <span class="section-icon">🏪</span>
              Otras Tiendas y Negocios
            </h3>
            <span class="business-count">${otherBusinesses.length} ${otherBusinesses.length === 1 ? 'negocio' : 'negocios'}</span>
          </div>
          <div class="hierarchy-grid">
            ${otherBusinesses.map((negocio) => this.renderBusinessCard(negocio, actual, isSuper, currentUserId, searchTerm, false)).join('')}
          </div>
        </div>
      `;
    }

    // Si no hay nada que mostrar
    if (!html) {
      html = `
        <div class="admin-hub-empty">
          <i class="fas fa-search"></i>
          <p>No se encontraron resultados</p>
        </div>
      `;
    }

    container.innerHTML = html;
  },

  renderBusinessCard(
    negocio,
    actual,
    isSuper,
    currentUserId,
    searchTerm,
    isSuperAdminBusiness = false
  ) {
    const activo = negocio.activo !== false && (negocio.estado || 'activo') === 'activo';
    const icono = Utils.sanitize(negocio.icono || 'fas fa-store');
    const nombre = Utils.sanitize(negocio.nombre || negocio.id);
    const rawBusinessId = negocio.id || '';
    const plan = Utils.sanitize(negocio.plan || 'básico');
    const esActual = actual && negocio.id === actual;
    const usuarios = this.getUsersByNegocio(negocio.id);
    const usuariosActivos = usuarios.filter((u) => u.activo).length;

    const isProtectedBusiness = this.isBusinessProtected(rawBusinessId);

    // Filtrar usuarios si hay búsqueda
    let usuariosFiltrados = usuarios;
    if (searchTerm) {
      usuariosFiltrados = usuarios.filter(
        (u) =>
          (u.username || '').toLowerCase().includes(searchTerm) ||
          (u.nombre || '').toLowerCase().includes(searchTerm) ||
          (u.email || '').toLowerCase().includes(searchTerm)
      );
    }

    return `
      <article class="business-card ${activo ? 'active' : 'inactive'} ${esActual ? 'current' : ''} ${isProtectedBusiness ? 'protected-business' : ''}" data-business-card="${rawBusinessId}">
        <div class="business-card-header">
          <div class="business-info">
            <div class="business-icon ${isProtectedBusiness ? 'super-admin-business-icon' : ''}">
              <i class="${icono}"></i>
            </div>
            <div class="business-name-section">
              <h3 class="business-name">
                ${isProtectedBusiness ? `<i class="fas fa-shield-alt"></i> ` : ''}
                ${nombre}
              </h3>
              <small class="business-id">
                <strong>ID:</strong> <code>${Utils.sanitize(negocio.id)}</code>
                ${isProtectedBusiness ? '<span class="protected-label">🛡️ SISTEMA PRINCIPAL</span>' : ''}
              </small>
              <div class="business-meta">
                <span class="badge badge-${plan}">${plan.toUpperCase()}</span>
                <span class="status-indicator ${activo ? 'active' : 'inactive'}">
                  <i class="fas fa-circle"></i> ${activo ? 'Activo' : 'Inactivo'}
                </span>
                ${esActual ? '<span class="badge badge-current"><i class="fas fa-star"></i> Actual</span>' : ''}
              </div>
            </div>
          </div>
          <div class="business-actions">
            <button class="btn-icon" title="Editar negocio" data-admin-hub-edit-business="${Utils.sanitize(negocio.id)}">
              <i class="fas fa-edit"></i>
            </button>
            ${
              !esActual
                ? `
              <button class="btn-icon" title="Establecer como actual" data-admin-hub-set-active="${Utils.sanitize(negocio.id)}">
                <i class="fas fa-star"></i>
              </button>
            `
                : ''
            }
            ${
              !isProtectedBusiness
                ? `
              <button class="btn-icon" title="${activo ? 'Desactivar' : 'Activar'}" data-admin-hub-toggle="${Utils.sanitize(negocio.id)}">
                <i class="fas fa-power-off"></i>
              </button>
            `
                : ''
            }
            ${
              isSuper && !isProtectedBusiness
                ? `
              <button class="btn-icon danger" title="Eliminar negocio" data-admin-hub-delete-business="${Utils.sanitize(negocio.id)}">
                <i class="fas fa-trash"></i>
              </button>
            `
                : ''
            }
          </div>
        </div>

        <div class="business-stats">
          <div class="stat-item">
            <i class="fas fa-users"></i>
            <span>${usuarios.length} usuario${usuarios.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="stat-item">
            <i class="fas fa-user-check"></i>
            <span>${usuariosActivos} activo${usuariosActivos !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div class="business-users">
          <div class="users-header">
            <h5><i class="fas fa-users"></i> Usuarios asignados</h5>
            <button class="btn-sm" data-admin-hub-action="new-user" data-preselect-business="${Utils.sanitize(negocio.id)}">
              <i class="fas fa-user-plus"></i> Agregar
            </button>
          </div>
          ${
            usuariosFiltrados.length > 0
              ? `
            <div class="users-list">
              ${usuariosFiltrados.map((user) => this.renderUserRow(user, currentUserId, isSuper, rawBusinessId)).join('')}
            </div>
          `
              : `
            <div class="users-empty">
              <i class="fas fa-user-slash"></i>
              <p>Sin usuarios asignados</p>
            </div>
          `
          }
        </div>
      </article>
    `;
  },

  renderUserRow(user, currentUserId, isSuper, businessContext = null) {
    const isSelf = user.id === currentUserId;
    const { superAdmin } = this.getRoleConstants();
    const isSuperadmin = this.isRole(user.rol, superAdmin);

    // Solo proteger super admins que estén en el negocio principal
    const assignments = Array.isArray(user.negocios) ? user.negocios : [];
    const isInMainBusiness = businessContext ? this.isBusinessProtected(businessContext) : false;
    const isProtected = isSuperadmin && isInMainBusiness;

    const canManage = isSuper || !isProtected;
    const roleClass = this.getRoleClass(user.rol);
    const roleLabel = this.getRoleLabel(user.rol);
    const activo = user.activo !== false;
    const principalAssignment =
      assignments.find((item) => item.principal) || assignments[0] || null;
    const principalBusinessId = principalAssignment
      ? principalAssignment.id || principalAssignment.negocio_id || principalAssignment
      : null;

    return `
      <div class="user-row ${activo ? 'active' : 'inactive'} ${isSelf ? 'self' : ''} ${isProtected ? 'protected' : ''}" data-user-row="${user.id}">
        <div class="user-info">
          <div class="user-avatar ${isProtected ? 'super-admin-avatar' : ''}">
            <i class="fas ${isProtected ? 'fa-shield-alt' : 'fa-user'}"></i>
          </div>
          <div class="user-details">
            <strong>${Utils.sanitize(user.username)}</strong>
            ${isSelf ? '<span class="badge badge-self"><i class="fas fa-user-check"></i> Tú</span>' : ''}
            ${isProtected ? '<span class="badge badge-protected"><i class="fas fa-shield-alt"></i> PROTEGIDO</span>' : ''}
            <div class="user-meta">
              <span class="badge ${roleClass}">${roleLabel}</span>
              <small class="text-muted">${Utils.sanitize(user.email || 'Sin email')}</small>
            </div>
          </div>
        </div>
        ${
          canManage
            ? `
          <div class="user-actions">
            ${
              principalBusinessId
                ? `
              <button class="btn-icon-sm" title="Ir al negocio principal" data-admin-hub-jump-business="${user.id}">
                <i class="fas fa-store"></i>
              </button>
            `
                : ''
            }
            <button class="btn-icon-sm" title="Editar" data-admin-hub-edit-user="${Utils.sanitize(user.id)}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon-sm" title="Reset contraseña" data-admin-hub-reset-password="${Utils.sanitize(user.id)}">
              <i class="fas fa-key"></i>
            </button>
            ${
              !isSelf && !isProtected
                ? `
              <button class="btn-icon-sm ${activo ? 'danger' : 'success'}" title="${activo ? 'Desactivar' : 'Activar'}" 
                      data-admin-hub-toggle-user="${Utils.sanitize(user.id)}">
                <i class="fas ${activo ? 'fa-user-slash' : 'fa-user-check'}"></i>
              </button>
            `
                : ''
            }
          </div>
        `
            : ''
        }
      </div>
    `;
  },

  focusBusinessCard(businessId, userId = null) {
    if (!businessId || !this.container) {
      return false;
    }

    const selector = `[data-business-card="${businessId}"]`;
    const card = this.container.querySelector(selector);
    if (!card) {
      return false;
    }

    card.classList.remove('admin-hub-card-focus');
    // Force reflow to restart animation
    void card.offsetWidth;
    card.classList.add('admin-hub-card-focus');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (userId) {
      const nestedUser = card.querySelector(`[data-user-row="${userId}"]`);
      if (nestedUser) {
        nestedUser.classList.remove('admin-hub-user-focus');
        void nestedUser.offsetWidth;
        nestedUser.classList.add('admin-hub-user-focus');
        window.setTimeout(() => nestedUser.classList.remove('admin-hub-user-focus'), 1500);
      }

      const tableRow = this.container.querySelector(`[data-user-table-row="${userId}"]`);
      if (tableRow) {
        tableRow.classList.remove('admin-hub-user-focus');
        void tableRow.offsetWidth;
        tableRow.classList.add('admin-hub-user-focus');
        window.setTimeout(() => tableRow.classList.remove('admin-hub-user-focus'), 1500);
      }
    }

    window.setTimeout(() => card.classList.remove('admin-hub-card-focus'), 1500);
    return true;
  },

  jumpToUserBusiness(userId) {
    if (!userId) {
      return;
    }

    const user = this.state.users.find((item) => String(item.id) === String(userId));
    if (!user) {
      if (window?.Utils?.showToast) {
        Utils.showToast('No se encontró el usuario seleccionado.', 'warning');
      }
      return;
    }

    const assignments = Array.isArray(user.negocios) ? user.negocios : [];
    if (!assignments.length) {
      if (window?.Utils?.showToast) {
        Utils.showToast('El usuario no tiene negocios asignados.', 'warning');
      }
      return;
    }

    const principalAssignment = assignments.find((item) => item.principal) || assignments[0];
    const businessId =
      principalAssignment?.id || principalAssignment?.negocio_id || principalAssignment;
    if (!businessId) {
      if (window?.Utils?.showToast) {
        Utils.showToast('No se pudo determinar el negocio asignado.', 'warning');
      }
      return;
    }

    const business = this.state.negocios.find((neg) => String(neg.id) === String(businessId));
    if (!business) {
      if (window?.Utils?.showToast) {
        Utils.showToast('El negocio asignado no está disponible en la vista actual.', 'warning');
      }
      return;
    }

    if (this.state.hierarchyFilter && this.state.hierarchyFilter !== 'todos') {
      this.state.hierarchyFilter = 'todos';
      const filterSelect = this.container.querySelector('#adminHubHierarchyFilter');
      if (filterSelect) {
        filterSelect.value = 'todos';
      }
    }

    this.state.hierarchySearch = '';
    const searchInput = this.container.querySelector('#adminHubHierarchySearch');
    if (searchInput) {
      searchInput.value = '';
    }

    this.renderHierarchy();

    window.requestAnimationFrame(() => {
      const focused = this.focusBusinessCard(businessId, user.id);
      if (!focused) {
        if (window?.Utils?.showToast) {
          Utils.showToast('No se pudo enfocar el negocio solicitado.', 'warning');
        }
        return;
      }

      if (window?.Utils?.showToast) {
        const userDisplay = user.username || user.nombre || 'el usuario';
        const businessDisplay = business.nombre || business.id;
        Utils.showToast(`Negocio principal de ${userDisplay}: ${businessDisplay}`, 'info');
      }
    });
  },

  getUsersByNegocio(negocioId) {
    if (!negocioId) return [];
    return this.state.users.filter((user) => {
      if (!user.negocios || !Array.isArray(user.negocios)) return false;
      return user.negocios.some((n) => n.id === negocioId || n === negocioId);
    });
  },

  selectBusinessForAnalysis(businessId) {
    if (!businessId) return;

    // Remover selección previa
    const previousSelected = this.container.querySelectorAll('.business-card.selected');
    previousSelected.forEach((card) => card.classList.remove('selected'));

    // Marcar la tarjeta seleccionada
    const selectedCard = this.container.querySelector(`[data-business-card="${businessId}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
    }

    // Guardar la selección en el estado
    this.state.selectedBusinessId = businessId;

    // Renderizar el análisis detallado
    this.renderBusinessDetails(businessId);
  },

  renderBusinessDetails(businessId) {
    const container = this.container.querySelector('#adminHubDetailsContent');
    if (!container) return;

    const negocio = this.state.negocios.find((n) => n.id === businessId);
    if (!negocio) {
      container.innerHTML = `
        <div class="admin-hub-empty">
          <i class="fas fa-exclamation-triangle"></i>
          <p>No se encontró el negocio seleccionado</p>
        </div>
      `;
      return;
    }

    const usuarios = this.getUsersByNegocio(businessId);
    const usuariosActivos = usuarios.filter((u) => u.activo).length;
    const usuariosInactivos = usuarios.length - usuariosActivos;

    const activo = negocio.activo !== false && (negocio.estado || 'activo') === 'activo';
    const icono = Utils.sanitize(negocio.icono || 'fas fa-store');
    const nombre = Utils.sanitize(negocio.nombre || negocio.id);
    const plan = Utils.sanitize(negocio.plan || 'básico');
    const tipo = Utils.sanitize(negocio.tipo || 'general');
    const esActual = this.state.negocioActual && negocio.id === this.state.negocioActual;

    // Obtener módulos activos
    const modulosActivos = Array.isArray(negocio.modulos) ? negocio.modulos : [];
    const modulosInfo = modulosActivos
      .map((modId) => MODULE_CATALOG.find((m) => m.id === modId))
      .filter(Boolean);

    // Agrupar módulos por categoría
    const modulosPorCategoria = {};
    modulosInfo.forEach((mod) => {
      const cat = mod.category || 'sistema';
      if (!modulosPorCategoria[cat]) {
        modulosPorCategoria[cat] = [];
      }
      modulosPorCategoria[cat].push(mod);
    });

    // Distribución de roles
    const roleDistribution = {};
    usuarios.forEach((user) => {
      const role = this.getRoleLabel(user.rol);
      roleDistribution[role] = (roleDistribution[role] || 0) + 1;
    });

    container.innerHTML = `
      <div class="business-details-view">
        <!-- Header del negocio seleccionado -->
        <div class="business-details-header">
          <div class="business-details-icon">
            <i class="${icono}"></i>
          </div>
          <div class="business-details-title">
            <h2>${nombre}</h2>
            <div class="business-details-meta">
              <span class="badge badge-${plan}">${plan.toUpperCase()}</span>
              <span class="status-indicator ${activo ? 'active' : 'inactive'}">
                <i class="fas fa-circle"></i> ${activo ? 'Activo' : 'Inactivo'}
              </span>
              ${esActual ? '<span class="badge badge-current"><i class="fas fa-star"></i> Actual</span>' : ''}
            </div>
            <small class="text-muted"><strong>ID:</strong> <code>${Utils.sanitize(negocio.id)}</code></small>
          </div>
        </div>

        <!-- Grid de estadísticas -->
        <div class="business-details-stats">
          <article class="detail-stat-card">
            <div class="stat-icon users">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-data">
              <span class="stat-value">${usuarios.length}</span>
              <span class="stat-label">Usuarios Total</span>
              <small class="stat-meta">${usuariosActivos} activos / ${usuariosInactivos} inactivos</small>
            </div>
          </article>
          
          <article class="detail-stat-card">
            <div class="stat-icon modules">
              <i class="fas fa-puzzle-piece"></i>
            </div>
            <div class="stat-data">
              <span class="stat-value">${modulosActivos.length}</span>
              <span class="stat-label">Módulos Activos</span>
              <small class="stat-meta">De ${MODULE_CATALOG.length} disponibles</small>
            </div>
          </article>

          <article class="detail-stat-card">
            <div class="stat-icon plan">
              <i class="fas fa-crown"></i>
            </div>
            <div class="stat-data">
              <span class="stat-value">${plan}</span>
              <span class="stat-label">Plan Actual</span>
              <small class="stat-meta">Tipo: ${tipo}</small>
            </div>
          </article>

          <article class="detail-stat-card">
            <div class="stat-icon status">
              <i class="fas ${activo ? 'fa-check-circle' : 'fa-times-circle'}"></i>
            </div>
            <div class="stat-data">
              <span class="stat-value">${activo ? 'Operativo' : 'Pausado'}</span>
              <span class="stat-label">Estado del Sistema</span>
              <small class="stat-meta">${esActual ? 'Negocio actual' : 'No es el actual'}</small>
            </div>
          </article>
        </div>

        <!-- Distribución de roles -->
        <div class="business-details-section">
          <h4><i class="fas fa-user-tag"></i> Distribución de Roles</h4>
          <div class="role-distribution">
            ${Object.entries(roleDistribution)
              .map(
                ([role, count]) => `
              <div class="role-dist-item">
                <span class="role-dist-label">${role}</span>
                <div class="role-dist-bar">
                  <div class="role-dist-fill" style="width: ${(count / usuarios.length) * 100}%"></div>
                </div>
                <span class="role-dist-count">${count}</span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- Módulos por categoría -->
        <div class="business-details-section">
          <h4><i class="fas fa-th-large"></i> Módulos Configurados (${modulosActivos.length})</h4>
          ${
            Object.keys(modulosPorCategoria).length > 0
              ? `
            <div class="modules-by-category">
              ${MODULE_CATEGORY_ORDER.filter(
                (catKey) => modulosPorCategoria[catKey] && modulosPorCategoria[catKey].length > 0
              )
                .map(
                  (catKey) => `
                  <div class="module-category-group">
                    <h5>${MODULE_CATEGORY_LABELS[catKey] || catKey}</h5>
                    <div class="module-badges">
                      ${modulosPorCategoria[catKey]
                        .map(
                          (mod) => `
                        <span class="module-badge ${mod.mandatory ? 'mandatory' : ''}" title="${Utils.sanitize(mod.description)}">
                          <i class="fas fa-puzzle-piece"></i>
                          ${Utils.sanitize(mod.label)}
                          ${mod.mandatory ? '<i class="fas fa-lock"></i>' : ''}
                        </span>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                `
                )
                .join('')}
            </div>
          `
              : '<p class="text-muted">No hay módulos configurados</p>'
          }
        </div>

        <!-- Lista de usuarios -->
        <div class="business-details-section">
          <h4><i class="fas fa-users"></i> Usuarios Asignados (${usuarios.length})</h4>
          ${
            usuarios.length > 0
              ? `
            <div class="users-detail-list">
              ${usuarios
                .map((user) => {
                  const activo = user.activo !== false;
                  const roleLabel = this.getRoleLabel(user.rol);
                  const roleClass = this.getRoleClass(user.rol);
                  return `
                  <div class="user-detail-item ${activo ? 'active' : 'inactive'}">
                    <div class="user-detail-avatar">
                      <i class="fas fa-user"></i>
                    </div>
                    <div class="user-detail-info">
                      <strong>${Utils.sanitize(user.username)}</strong>
                      <small>${Utils.sanitize(user.nombre || 'Sin nombre')}</small>
                    </div>
                    <span class="${roleClass}">${roleLabel}</span>
                    <span class="status-indicator ${activo ? 'active' : 'inactive'}">
                      <i class="fas fa-circle"></i>
                    </span>
                  </div>
                `;
                })
                .join('')}
            </div>
          `
              : '<p class="text-muted">No hay usuarios asignados a este negocio</p>'
          }
        </div>

        <!-- Información adicional -->
        ${
          negocio.descripcion
            ? `
          <div class="business-details-section">
            <h4><i class="fas fa-info-circle"></i> Descripción</h4>
            <p>${Utils.sanitize(negocio.descripcion)}</p>
          </div>
        `
            : ''
        }
      </div>
    `;
  },

  getAllowedNegocioSet() {
    const session = this.state.session || Auth.getSession();
    const allowed = new Set();

    if (Array.isArray(session?.negocios)) {
      session.negocios.forEach((id) => {
        if (!id) return;
        allowed.add(String(id).trim());
      });
    }

    if (session?.negocioId) {
      allowed.add(String(session.negocioId).trim());
    }

    return allowed;
  },

  isBusinessProtected(negocioId) {
    if (!negocioId) {
      return false;
    }

    const { superAdmin } = this.getRoleConstants();
    return this.state.users.some((user) => {
      if (!this.isRole(user.rol, superAdmin)) {
        return false;
      }
      const assignments = Array.isArray(user.negocios) ? user.negocios : [];
      return assignments.some((assignment) => {
        if (!assignment) return false;
        if (typeof assignment === 'string') {
          return assignment === negocioId;
        }
        const assignmentId = assignment.id || assignment.negocio_id;
        return assignmentId ? String(assignmentId) === negocioId : false;
      });
    });
  },

  getRoleClass(role) {
    const normalized = this.normalizeRole(role);
    const { superAdmin, admin, vendedor, tecnico } = this.getRoleConstants();

    switch (normalized) {
      case superAdmin:
        return 'badge role-superadmin';
      case admin:
        return 'badge role-admin';
      case vendedor:
        return 'badge role-vendedor';
      case tecnico:
        return 'badge role-tecnico';
      default:
        return 'badge role-user';
    }
  },

  getRoleLabel(role) {
    const normalized = this.normalizeRole(role);
    const { superAdmin, admin, vendedor, tecnico } = this.getRoleConstants();

    switch (normalized) {
      case superAdmin:
        return 'Superadministrador';
      case admin:
        return 'Administrador';
      case vendedor:
        return 'Vendedor';
      case tecnico:
        return 'Técnico';
      default:
        return 'Usuario';
    }
  },

  openUserModal(userId, preselectBusinessId = null) {
    const editing = Boolean(userId);
    const user = editing ? this.state.users.find((item) => item.id === userId) : null;
    const { superAdmin } = this.getRoleConstants();

    if (editing && !user) {
      Utils.showToast('Usuario no encontrado.', 'error');
      return;
    }

    if (editing && this.isRole(user?.rol, superAdmin) && !Auth.isSuperAdmin()) {
      Utils.showToast('No tienes permisos para modificar un superadministrador.', 'error');
      return;
    }

    const availableNegocios = this.getAvailableBusinessesForAssignments();
    const normalizedPreselect = preselectBusinessId ? preselectBusinessId.toString().trim() : null;
    if (!availableNegocios.length) {
      Utils.showToast('No tienes negocios disponibles para asignar.', 'warning');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'admin-hub-modal-overlay';

    overlay.innerHTML = this.renderUserModalHTML(user, availableNegocios, normalizedPreselect);
    document.body.appendChild(overlay);

    const form = overlay.querySelector('form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await this.submitUserForm(form, user);
    });

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        overlay.remove();
      }
    });

    const closeBtn = overlay.querySelector('[data-admin-hub-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => overlay.remove());
    }

    overlay.addEventListener('change', (event) => {
      const checkbox = event.target.closest('[data-negocio-checkbox]');
      if (checkbox) {
        const row = checkbox.closest('[data-negocio-row]');
        const principalRadio = row?.querySelector('[data-negocio-principal]');
        if (principalRadio) {
          principalRadio.disabled = !checkbox.checked;
          if (!checkbox.checked && principalRadio.checked) {
            principalRadio.checked = false;
          }
        }
      }
    });
  },

  renderUserModalHTML(user, availableNegocios, preselectBusinessId) {
    const editing = Boolean(user);
    const username = editing ? Utils.sanitize(user.username || '') : '';
    const nombre = editing ? Utils.sanitize(user.nombre || '') : '';
    const email = editing ? Utils.sanitize(user.email || '') : '';
    const defaultRole = this.getDefaultRole();
    const rol = editing ? this.normalizeRole(user.rol || defaultRole) : defaultRole;
    const activo = editing ? Boolean(user.activo) : true;
    const requireChange = editing ? Boolean(user.debeCambiarPassword) : true;
    const negociosAsignados = editing && Array.isArray(user.negocios) ? user.negocios : [];
    const principalAsignado = negociosAsignados.find((item) => item.principal) || null;
    const preferredBusinessId = editing
      ? principalAsignado?.id || null
      : preselectBusinessId || availableNegocios[0]?.id || null;
    const includeSuperAdmin = Auth.isSuperAdmin();
    const rolesDisponibles = this.getAssignableRoles(includeSuperAdmin);
    const userRoleOptions = Array.from(new Set([...rolesDisponibles, rol].filter(Boolean)));
    const negocioRoleOptions = this.getAssignableRoles(includeSuperAdmin);

    return `
      <div class="admin-hub-modal" role="dialog" aria-modal="true">
        <header>
          <h3><i class="fas ${editing ? 'fa-user-edit' : 'fa-user-plus'}"></i> ${editing ? 'Editar usuario' : 'Nuevo usuario'}</h3>
          <button class="close-btn" data-admin-hub-close aria-label="Cerrar"><i class="fas fa-times"></i></button>
        </header>
        <main>
          <form>
            <div class="admin-hub-form-grid">
              <div class="admin-hub-form-group">
                <label for="adminHubUsername">Usuario *</label>
                <input type="text" id="adminHubUsername" name="username" value="${username}" ${editing ? 'readonly' : 'required'}>
              </div>
              <div class="admin-hub-form-group">
                <label for="adminHubNombre">Nombre completo *</label>
                <input type="text" id="adminHubNombre" name="nombre" value="${nombre}" required>
              </div>
              <div class="admin-hub-form-group">
                <label for="adminHubEmail">Email</label>
                <input type="email" id="adminHubEmail" name="email" value="${email}" placeholder="usuario@dominio.com">
              </div>
              <div class="admin-hub-form-group">
                <label for="adminHubRol">Rol *</label>
                <select id="adminHubRol" name="rol" required>
                  ${userRoleOptions
                    .map((roleValue) => {
                      const normalizedValue = this.normalizeRole(roleValue);
                      const selected = normalizedValue === rol ? 'selected' : '';
                      return `<option value="${normalizedValue}" ${selected}>${this.getRoleLabel(normalizedValue)}</option>`;
                    })
                    .join('')}
                </select>
              </div>
              ${
                editing
                  ? ''
                  : `
                <div class="admin-hub-form-group">
                  <label for="adminHubPassword">Contraseña temporal *</label>
                  <input type="password" id="adminHubPassword" name="password" minlength="6" required>
                </div>
                <div class="admin-hub-form-group">
                  <label for="adminHubPasswordConfirm">Confirmar contraseña *</label>
                  <input type="password" id="adminHubPasswordConfirm" name="passwordConfirm" minlength="6" required>
                </div>
              `
              }
            </div>

            ${
              editing
                ? `
              <div class="admin-hub-form-group">
                <label>Nuevos datos de seguridad</label>
                <div class="admin-hub-form-grid">
                  <input type="password" name="newPassword" placeholder="Nueva contraseña (opcional)" minlength="6">
                  <label>
                    <input type="checkbox" name="requirePasswordChange" ${requireChange ? 'checked' : ''}>
                    Requerir cambio de contraseña en el próximo acceso
                  </label>
                </div>
              </div>
            `
                : `
              <label class="admin-hub-form-group" style="flex-direction: row; align-items: center; gap: 0.5rem;">
                <input type="checkbox" name="requirePasswordChange" checked>
                Requerir cambio de contraseña al primer acceso
              </label>
            `
            }

            <div class="admin-hub-form-group">
              <label>Negocios asignados *</label>
              <div class="admin-hub-assignments">
                ${availableNegocios
                  .map((negocio, index) => {
                    const assigned = negociosAsignados.find((item) => item.id === negocio.id);
                    const defaultSelection =
                      !editing && preferredBusinessId
                        ? negocio.id === preferredBusinessId
                        : !editing && index === 0;
                    const checked = Boolean(assigned || defaultSelection);
                    const principal = assigned ? Boolean(assigned.principal) : defaultSelection;
                    const roleEnNegocio = this.normalizeRole(assigned?.rol || defaultRole);
                    const businessRoleOptions = Array.from(
                      new Set([...negocioRoleOptions, roleEnNegocio].filter(Boolean))
                    );

                    return `
                    <div class="admin-hub-assignment" data-negocio-row="${Utils.sanitize(negocio.id)}">
                      <label class="admin-hub-assignment-info">
                        <input type="checkbox" data-negocio-checkbox value="${Utils.sanitize(negocio.id)}" ${checked ? 'checked' : ''}>
                        <span>${Utils.sanitize(negocio.nombre || negocio.id)}</span>
                      </label>
                      <select data-negocio-role>
                        ${businessRoleOptions
                          .map((option) => {
                            const normalizedOption = this.normalizeRole(option);
                            const selected = normalizedOption === roleEnNegocio ? 'selected' : '';
                            return `<option value="${normalizedOption}" ${selected}>${this.getRoleLabel(normalizedOption)}</option>`;
                          })
                          .join('')}
                      </select>
                      <label class="principal-radio">
                        <input type="radio" name="adminHubPrincipal" data-negocio-principal value="${Utils.sanitize(negocio.id)}" ${principal ? 'checked' : ''} ${checked ? '' : 'disabled'}>
                        Principal
                      </label>
                    </div>
                  `;
                  })
                  .join('')}
              </div>
              <small class="text-muted">Selecciona al menos un negocio y define cuál será el principal.</small>
            </div>

            <label style="display:flex; align-items:center; gap:0.5rem;">
              <input type="checkbox" name="activo" ${activo ? 'checked' : ''}>
              Usuario activo
            </label>

            <footer>
              <button type="button" class="btn secondary" data-admin-hub-close>Cancelar</button>
              <button type="submit" class="btn">${editing ? 'Guardar cambios' : 'Crear usuario'}</button>
            </footer>
          </form>
        </main>
      </div>
    `;
  },

  async submitUserForm(form, user) {
    const formData = new FormData(form);
    const editing = Boolean(user);
    const payload = {};

    const nombre = formData.get('nombre')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const rolRaw = formData.get('rol')?.toString().trim();
    const requireChange = formData.get('requirePasswordChange') !== null;
    const activo = formData.get('activo') !== null;

    if (!nombre) {
      Utils.showToast('El nombre es obligatorio.', 'warning');
      return;
    }

    if (!rolRaw) {
      Utils.showToast('Selecciona un rol para el usuario.', 'warning');
      return;
    }

    const rol = this.normalizeRole(rolRaw);

    const assignments = this.collectAssignments(form);
    if (!assignments.length) {
      Utils.showToast('Asignar al menos un negocio es obligatorio.', 'warning');
      return;
    }

    payload.nombre = nombre;
    payload.email = email || null;
    payload.rol = rol;
    payload.activo = activo;
    payload.requirePasswordChange = requireChange;
    payload.negocios = assignments;

    if (editing) {
      const newPassword = formData.get('newPassword')?.toString().trim();
      if (newPassword) {
        payload.password = newPassword;
      }

      try {
        const result = await Auth.updateUser(user.id, payload);
        if (result.success !== false) {
          Utils.showToast(result.message || 'Usuario actualizado correctamente.', 'success');
          form.closest('.admin-hub-modal-overlay').remove();

          // Actualizar datos sin recargar página
          if (window.DataRefreshManager) {
            const userIndex = this.state.users.findIndex((u) => u.id === user.id);
            if (userIndex !== -1) {
              this.state.users[userIndex] = { ...this.state.users[userIndex], ...payload };
            }
            await this.renderAll();
          } else {
            await this.loadData();
          }
        } else {
          Utils.showToast(result.message || 'No se pudo actualizar el usuario.', 'error');
        }
      } catch (error) {
        Utils.showToast(error?.message || 'No se pudo actualizar el usuario.', 'error');
      }
      return;
    }

    const username = formData.get('username')?.toString().trim();
    const password = formData.get('password')?.toString();
    const passwordConfirm = formData.get('passwordConfirm')?.toString();

    if (!username) {
      Utils.showToast('El usuario es obligatorio.', 'warning');
      return;
    }

    if (!password || password.length < 6) {
      Utils.showToast('La contraseña debe tener al menos 6 caracteres.', 'warning');
      return;
    }

    if (password !== passwordConfirm) {
      Utils.showToast('Las contraseñas no coinciden.', 'warning');
      return;
    }

    payload.username = username;
    payload.password = password;

    try {
      const result = await Auth.createUser(payload);
      if (result.success !== false) {
        Utils.showToast(result.message || 'Usuario creado correctamente.', 'success');
        form.closest('.admin-hub-modal-overlay').remove();

        // Actualizar datos sin recargar página
        if (window.DataRefreshManager) {
          const newUser = result.user || { id: result.id, ...payload };
          this.state.users.push(newUser);
          await this.renderAll();
        } else {
          await this.loadData();
        }
      } else {
        Utils.showToast(result.message || 'No se pudo crear el usuario.', 'error');
      }
    } catch (error) {
      Utils.showToast(error?.message || 'No se pudo crear el usuario.', 'error');
    }
  },

  collectAssignments(form) {
    const rows = Array.from(form.querySelectorAll('[data-negocio-row]'));
    const assignments = [];

    rows.forEach((row) => {
      const checkbox = row.querySelector('[data-negocio-checkbox]');
      if (!checkbox || !checkbox.checked) {
        return;
      }
      const roleSelect = row.querySelector('[data-negocio-role]');
      const principalRadio = row.querySelector('[data-negocio-principal]');
      const selectedRole = roleSelect?.value || this.getDefaultRole();
      assignments.push({
        id: checkbox.value,
        rol: this.normalizeRole(selectedRole),
        principal: principalRadio?.checked || false,
      });
    });

    if (!assignments.length) {
      return assignments;
    }

    if (!assignments.some((item) => item.principal)) {
      assignments[0].principal = true;
    }

    return assignments;
  },

  async toggleUserStatus(userId) {
    const user = this.state.users.find((item) => item.id === userId);
    if (!user) {
      Utils.showToast('Usuario no encontrado.', 'error');
      return;
    }

    const { superAdmin } = this.getRoleConstants();
    if (this.isRole(user.rol, superAdmin) && !Auth.isSuperAdmin()) {
      Utils.showToast('No puedes cambiar el estado de un superadministrador.', 'error');
      return;
    }

    try {
      const result = await Auth.updateUser(userId, { activo: !user.activo });
      if (result.success !== false) {
        Utils.showToast(
          `Usuario ${user.activo ? 'desactivado' : 'activado'} correctamente.`,
          'success'
        );

        // Actualizar datos sin recargar página
        if (window.DataRefreshManager) {
          user.activo = !user.activo;
          await this.renderAll();
        } else {
          await this.loadData();
        }
      } else {
        Utils.showToast(result.message || 'No se pudo actualizar el usuario.', 'error');
      }
    } catch (error) {
      Utils.showToast(error?.message || 'No se pudo actualizar el usuario.', 'error');
    }
  },

  async deleteUser(userId) {
    const user = this.state.users.find((item) => item.id === userId);
    if (!user) {
      Utils.showToast('Usuario no encontrado.', 'error');
      return;
    }

    const { superAdmin } = this.getRoleConstants();
    if (this.isRole(user.rol, superAdmin) && !Auth.isSuperAdmin()) {
      Utils.showToast('No puedes eliminar un superadministrador.', 'error');
      return;
    }

    const confirmed = await Utils.confirm(
      'Eliminar usuario',
      `¿Eliminar al usuario <strong>${Utils.sanitize(user.username)}</strong>?`
    );
    if (!confirmed) {
      return;
    }

    try {
      const result = await Auth.deleteUser(userId);
      if (result.success !== false) {
        Utils.showToast(result.message || 'Usuario eliminado correctamente.', 'success');

        // Actualizar datos sin recargar página
        if (window.DataRefreshManager) {
          this.state.users = this.state.users.filter((u) => u.id !== userId);
          await this.renderAll();
        } else {
          await this.loadData();
        }
      } else {
        Utils.showToast(result.message || 'No se pudo eliminar el usuario.', 'error');
      }
    } catch (error) {
      Utils.showToast(error?.message || 'No se pudo eliminar el usuario.', 'error');
    }
  },

  async resetPassword(userId) {
    const user = this.state.users.find((item) => item.id === userId);
    if (!user) {
      Utils.showToast('Usuario no encontrado.', 'error');
      return;
    }

    const { superAdmin } = this.getRoleConstants();
    if (this.isRole(user.rol, superAdmin) && !Auth.isSuperAdmin()) {
      Utils.showToast('No puedes restablecer la contraseña de un superadministrador.', 'error');
      return;
    }

    const confirmed = await Utils.confirm(
      'Restablecer contraseña',
      `¿Generar una contraseña temporal para <strong>${Utils.sanitize(user.username)}</strong>?`
    );
    if (!confirmed) {
      return;
    }

    const newPassword = this.generateTemporaryPassword();

    try {
      const result = await Auth.updateUser(userId, {
        password: newPassword,
        requirePasswordChange: true,
      });

      if (result.success !== false) {
        this.showInfoModal(
          'Contraseña temporal generada',
          `
          Provee la siguiente contraseña a <strong>${Utils.sanitize(user.username)}</strong>:<br><br>
          <div class="admin-hub-empty-note">
            <span class="admin-hub-highlight">${Utils.sanitize(newPassword)}</span>
          </div>
          El usuario deberá cambiarla al ingresar.
        `
        );
        await this.loadData();
      } else {
        Utils.showToast(result.message || 'No se pudo restablecer la contraseña.', 'error');
      }
    } catch (error) {
      Utils.showToast(error?.message || 'No se pudo restablecer la contraseña.', 'error');
    }
  },

  generateTemporaryPassword() {
    const base = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const length = 10;
    let password = '';

    while (password.length < length) {
      password += base.charAt(Math.floor(Math.random() * base.length));
    }

    return password;
  },

  showInfoModal(title, htmlMessage) {
    const overlay = document.createElement('div');
    overlay.className = 'admin-hub-modal-overlay';
    overlay.innerHTML = `
      <div class="admin-hub-modal" role="dialog" aria-modal="true">
        <header>
          <h3><i class="fas fa-info-circle"></i> ${Utils.sanitize(title)}</h3>
          <button class="close-btn" data-admin-hub-close aria-label="Cerrar"><i class="fas fa-times"></i></button>
        </header>
        <main>
          <div>${htmlMessage}</div>
        </main>
        <footer>
          <button class="btn" data-admin-hub-close>Aceptar</button>
        </footer>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target.closest('[data-admin-hub-close]')) {
        overlay.remove();
      }
    });
  },

  async toggleBusinessStatus(businessId) {
    if (!businessId) return;

    try {
      await Auth._request(`/negocios/${businessId}/toggle`, { method: 'PUT' });
      Utils.showToast('Estado del negocio actualizado.', 'success');
      await this.loadData();
    } catch (error) {
      Utils.showToast(error?.message || 'No se pudo actualizar el negocio.', 'error');
    }
  },

  promptBusinessDeletionChoice(negocio) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'admin-hub-modal-overlay';
      const nombre = Utils.sanitize(negocio?.nombre || negocio?.id || 'el negocio seleccionado');

      overlay.innerHTML = `
        <div class="admin-hub-modal admin-hub-modal--confirm">
          <header>
            <h3><i class="fas fa-trash"></i> Eliminar negocio</h3>
            <button class="close-btn" data-admin-hub-choice="cancel"><i class="fas fa-times"></i></button>
          </header>
          <main>
            <p>¿Qué deseas hacer con los datos del negocio "${nombre}"?</p>
            <div class="admin-hub-choice-grid">
              <button class="btn secondary" data-admin-hub-choice="preserve">
                <i class="fas fa-archive"></i> Conservar datos en respaldo
              </button>
              <button class="btn danger" data-admin-hub-choice="purge">
                <i class="fas fa-trash-alt"></i> Eliminar todo definitivamente
              </button>
            </div>
            <small>Conservar datos moverá la base y los archivos asociados a una carpeta de respaldo dentro del servidor.</small>
          </main>
          <footer>
            <button class="btn secondary" data-admin-hub-choice="cancel">
              <i class="fas fa-times"></i> Cancelar
            </button>
          </footer>
        </div>
      `;

      let resolved = false;
      const handleKeydown = (event) => {
        if (event.key === 'Escape') {
          finish(null);
        }
      };
      const finish = (value) => {
        if (resolved) return;
        resolved = true;
        document.removeEventListener('keydown', handleKeydown);
        overlay.remove();
        resolve(value);
      };

      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          finish(null);
        }
      });

      overlay.querySelectorAll('[data-admin-hub-choice]').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          const choice = btn.getAttribute('data-admin-hub-choice');
          if (choice === 'preserve') {
            finish('preserve');
          } else if (choice === 'purge') {
            finish('purge');
          } else {
            finish(null);
          }
        });
      });

      document.addEventListener('keydown', handleKeydown);
      document.body.appendChild(overlay);
    });
  },

  async deleteBusiness(businessId) {
    if (!Auth.isSuperAdmin()) {
      Utils.showToast('Solo un superadministrador puede eliminar negocios.', 'error');
      return;
    }

    if (!businessId) {
      Utils.showToast('Negocio no válido.', 'error');
      return;
    }

    const negocio = this.state.negocios.find((item) => item.id === businessId);
    if (!negocio) {
      Utils.showToast('No se encontró el negocio seleccionado.', 'warning');
      return;
    }

    if (this.isBusinessProtected(businessId)) {
      Utils.showToast(
        'No se puede eliminar el negocio principal del sistema. Contiene superadministradores.',
        'warning'
      );
      return;
    }

    const confirmed = await Utils.confirm(
      'Confirmar eliminación',
      `¿Seguro que deseas eliminar el negocio "${Utils.sanitize(negocio.nombre || negocio.id)}"?`
    );

    if (!confirmed) {
      return;
    }

    const mode = await this.promptBusinessDeletionChoice(negocio);
    if (!mode) {
      Utils.showToast('Operación cancelada.', 'info');
      return;
    }

    const preserveData = mode === 'preserve';

    try {
      Utils.showLoading(true);
      const result = await Auth._request(`/negocios/${businessId}`, {
        method: 'DELETE',
        body: { preserveData },
      });

      if (result?.message) {
        Utils.showToast(result.message, 'success');
      } else {
        Utils.showToast('Negocio eliminado correctamente.', 'success');
      }

      if (Array.isArray(result?.warnings) && result.warnings.length) {
        console.warn('Advertencias al eliminar negocio:', result.warnings);
        Utils.showToast(
          'Negocio eliminado con advertencias. Revisa la consola para más detalles.',
          'warning'
        );
      }

      if (preserveData && result?.archive) {
        console.info('El negocio fue archivado en:', result.archive);
      }

      // Actualizar datos sin recargar página
      if (window.DataRefreshManager) {
        this.state.negocios = this.state.negocios.filter((b) => b.id !== businessId);
        await this.renderAll();
      } else {
        await this.loadData();
      }
    } catch (error) {
      Utils.showToast(error?.message || 'No se pudo eliminar el negocio.', 'error');
    } finally {
      Utils.showLoading(false);
    }
  },

  async changeActiveBusiness(businessId) {
    if (!businessId) return;
    const confirmed = await Utils.confirm(
      'Cambiar negocio activo',
      '¿Deseas cambiar el negocio activo en el sistema?'
    );
    if (!confirmed) {
      return;
    }

    try {
      await Auth._request('/negocios/cambiar', {
        method: 'POST',
        body: { negocioId: businessId },
      });

      // Actualizar el localStorage
      localStorage.setItem('negocio_actual', businessId);

      // Usar la función cambiarNegocio para actualizar el token y Database
      const cambioResult = await Auth.cambiarNegocio(businessId);
      if (!cambioResult.success) {
        console.warn('No se pudo actualizar el token, intentando verificar sesión...');
        await Auth.verifySession();
      }

      Utils.showToast('Negocio activo actualizado. Recargando...', 'success');

      this.state.session = Auth.getSession();
      this.state.negocioActual = businessId;

      // NOTA: En este caso SÍ es necesario recargar porque cambia el contexto
      // completo de la aplicación (datos, permisos, configuración, etc.)
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      Utils.showToast(error?.message || 'No se pudo cambiar el negocio activo.', 'error');
    }
  },

  getAvailableBusinessesForAssignments() {
    const allowed = this.getAllowedNegocioSet();
    if (Auth.isSuperAdmin()) {
      return [...this.state.negocios];
    }
    return this.state.negocios.filter((negocio) => allowed.has(negocio.id));
  },

  openBusinessModal(businessId = null) {
    if (!Auth.isSuperAdmin() && !this.state.negocios.length && !businessId) {
      Utils.showToast('Necesitas al menos un negocio activo para crear nuevos.', 'info');
      return;
    }

    const isEdit = !!businessId;
    const negocio = isEdit ? this.state.negocios.find((n) => n.id === businessId) : null;

    const overlay = document.createElement('div');
    overlay.className = 'admin-hub-modal-overlay';
    overlay.innerHTML = this.renderBusinessModalHTML(negocio, isEdit);
    document.body.appendChild(overlay);

    // Configuración robusta para cerrar el modal
    const closeModal = () => overlay.remove();
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeModal();
    });
    overlay.querySelectorAll('[data-admin-hub-close]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
      });
    });

    this.setupBusinessModal(overlay, negocio);

    const form = overlay.querySelector('form');
    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const success = await this.submitBusinessForm(form, negocio);
        if (success) {
          closeModal();
        }
      });
    }
  },

  renderBusinessModalHTML(negocio = null, isEdit = false) {
    const titulo = isEdit
      ? `<i class="fas fa-edit"></i> Editar negocio: ${Utils.sanitize(negocio?.nombre || '')}`
      : '<i class="fas fa-store"></i> Nuevo negocio';
    const submitLabel = isEdit ? 'Guardar cambios' : 'Crear negocio';

    // El negocio principal es el que tiene super admin, pero SÍ se puede editar
    // Solo no se puede ELIMINAR
    const isProtectedBusiness = isEdit && this.isBusinessProtected(negocio?.id);

    const templatesHTML = BUSINESS_BLUEPRINTS.map(
      (template, index) => `
      <label class="admin-hub-template-card">
        <input type="radio" name="plantilla" value="${template.id}" ${index === 0 ? 'checked' : ''}>
        <div class="admin-hub-template-card-inner">
          <span class="admin-hub-template-icon"><i class="${template.icon}"></i></span>
          <div class="admin-hub-template-body">
            <strong>${template.displayName}</strong>
            <span>${template.description}</span>
            <small>${template.modules.length} módulos • ${template.planDisplay}</small>
          </div>
        </div>
      </label>
    `
    ).join('');

    // 🔥 FILTRAR MÓDULOS SEGÚN TIPO DE NEGOCIO
    const businessType = negocio?.tipo || 'general';
    const isAdmin = Auth && Auth.isSuperAdmin && Auth.isSuperAdmin();
    const availableModules = getModulesByBusinessType(businessType, isAdmin, { includeAll: true });

    // Super admin siempre puede editar, otros usuarios solo al crear
    const isSuperAdmin = Auth.isSuperAdmin();
    const idFieldReadonly = isEdit && !isSuperAdmin;
    const idHelpText = isProtectedBusiness
      ? isSuperAdmin
        ? '✅ Como super admin, puedes editar este campo libremente.'
        : '⚠️ Este es el negocio principal. Solo super admin puede modificarlo.'
      : isEdit
        ? isSuperAdmin
          ? '✅ Como super admin, puedes modificar el identificador.'
          : 'El identificador se fija al crear la tienda.'
        : 'Usa minúsculas, números, guiones y guiones bajos.';

    const modulesHTML = MODULE_CATEGORY_ORDER.map((categoryKey) => {
      const categoryModules = availableModules.filter((module) => module.category === categoryKey);
      if (!categoryModules.length) {
        return '';
      }

      const categoryLabel = MODULE_CATEGORY_LABELS[categoryKey] || categoryKey;
      const moduleCards = categoryModules
        .map((module) => {
          const dependencyLabels = (module.requires || [])
            .map((dependencyId) => {
              const normalized = MODULE_ALIAS_MAP[dependencyId] || dependencyId;
              return MODULE_LOOKUP.get(normalized)?.label || normalized;
            })
            .filter(Boolean);

          // Determinar badges de estado
          const isMandatory = module.mandatory;
          const isRecommended =
            module.recommendedFor?.includes('all') ||
            module.recommendedFor?.includes(negocio?.tipo || 'general');
          const isAdminOnly = module.adminOnly;
          const planBadge = module.minPlan ? `Plan ${module.minPlan}` : '';

          let badgeHTML = '';
          if (isMandatory) {
            badgeHTML += '<span class="admin-hub-chip mandatory">✓ Obligatorio</span>';
          } else if (isRecommended) {
            badgeHTML += '<span class="admin-hub-chip recommended">⭐ Recomendado</span>';
          }
          if (isAdminOnly) {
            badgeHTML += '<span class="admin-hub-chip admin-only">👑 Solo Admin</span>';
          }
          if (planBadge) {
            badgeHTML += `<span class="admin-hub-chip plan-required">${planBadge}</span>`;
          }
          if (module.badge) {
            badgeHTML += `<span class="admin-hub-chip highlight">${module.badge}</span>`;
          }

          const hintsHTML =
            dependencyLabels.length || badgeHTML
              ? `
                <div class="admin-hub-module-hints">
                  ${dependencyLabels.length ? `<span class="admin-hub-chip dependency">Requiere ${dependencyLabels.join(', ')}</span>` : ''}
                  ${badgeHTML}
                </div>
              `
              : '';

          return `
              <label class="admin-hub-module-option ${isMandatory ? 'mandatory' : ''} ${isRecommended ? 'recommended' : ''}" data-module-id="${module.id}">
                <input type="checkbox" name="modulos" value="${module.id}" ${isMandatory ? 'disabled' : ''}>
                <div class="admin-hub-module-copy">
                  <span class="admin-hub-module-title">${module.label}</span>
                  <small>${module.description}</small>
                  ${hintsHTML}
                </div>
              </label>
            `;
        })
        .join('');

      return `
          <section class="admin-hub-module-group" data-module-category="${categoryKey}">
            <header class="admin-hub-module-group-header">
              <span>${categoryLabel}</span>
              <span class="admin-hub-chip">${categoryModules.length} módulo${categoryModules.length === 1 ? '' : 's'}</span>
            </header>
            <div class="admin-hub-module-group-body">
              ${moduleCards}
            </div>
          </section>
        `;
    }).join('');
    const moduleCounterLabel = isProtectedBusiness
      ? 'Negocio principal - Todos los módulos disponibles'
      : 'Selecciona al menos un módulo';
    const deselectBtnDisabledAttr = '';
    const deselectBtnTitle = 'Deseleccionar todos';

    // Crear HTML del picker de iconos
    const iconPickerHTML = this.renderIconPicker();

    return `
      <div class="admin-hub-modal" role="dialog" aria-modal="true">
        <header>
          <h3>${titulo}</h3>
          <button class="close-btn" data-admin-hub-close aria-label="Cerrar"><i class="fas fa-times"></i></button>
        </header>
        <main>
          <form>
            ${
              !isEdit
                ? `
            <section class="admin-hub-modal-section">
              <div class="admin-hub-section-title">
                <div>
                  <span class="admin-hub-section-label"><i class="fas fa-wand-magic-sparkles"></i> Plantilla rápida</span>
                  <p>Selecciona una base según el tipo de negocio. Podrás ajustar todos los campos.</p>
                </div>
                <button type="button" class="admin-hub-link" data-admin-hub-clear-template>Configurar manualmente</button>
              </div>
              <div class="admin-hub-template-grid">
                ${templatesHTML}
              </div>
            </section>
            `
                : ''
            }

            <section class="admin-hub-modal-section">
              <div class="admin-hub-section-title">
                <span class="admin-hub-section-label"><i class="fas fa-id-badge"></i> Identidad${isProtectedBusiness ? ' <span class="badge badge-protected"><i class="fas fa-shield-alt"></i> NEGOCIO PRINCIPAL</span>' : ''}</span>
                <div class="admin-hub-plan-badge" data-plan-preview>${negocio?.plan || 'Plan personalizado'}</div>
              </div>
              <div class="admin-hub-form-grid admin-hub-identity-grid">
                <div class="admin-hub-form-group">
                  <label>ID del negocio *${isSuperAdmin && isProtectedBusiness ? ' <span class="badge badge-protected"><i class="fas fa-crown"></i> EDITABLE</span>' : ''}</label>
                  <input type="text" name="id" value="${Utils.sanitize(negocio?.id || '')}" placeholder="ID del negocio" ${idFieldReadonly ? 'readonly' : ''} required>
                  <small class="admin-hub-help">${idHelpText}</small>
                </div>
                <div class="admin-hub-form-group">
                  <label>Nombre comercial *</label>
                  <input type="text" name="nombre" value="${Utils.sanitize(negocio?.nombre || '')}" placeholder="Nombre del negocio" required>
                  ${isProtectedBusiness ? '<small class="admin-hub-help">Nombre del negocio principal - Totalmente editable</small>' : ''}
                </div>
                <div class="admin-hub-form-group">
                  <label>Tipo de negocio</label>
                  <select name="tipo" class="form-select-clean">
                    <option value="general" ${negocio?.tipo === 'general' ? 'selected' : ''}>🏪 General</option>
                    <option value="mecanica" ${negocio?.tipo === 'mecanica' ? 'selected' : ''}>🔧 Taller / Mecánica</option>
                    <option value="personalizado" ${negocio?.tipo === 'personalizado' ? 'selected' : ''}>⚙️ Personalizado</option>
                  </select>
                </div>
                <div class="admin-hub-form-group">
                  <label>Plan de suscripción${isProtectedBusiness ? ' <span class="badge badge-protected">ENTERPRISE</span>' : ''}</label>
                  <select name="plan" class="form-select-clean">
                    <option value="basico" ${negocio?.plan === 'basico' ? 'selected' : ''}>📦 Básico</option>
                    <option value="pro" ${negocio?.plan === 'pro' ? 'selected' : ''}>⭐ Pro</option>
                    <option value="enterprise" ${negocio?.plan === 'enterprise' ? 'selected' : ''}>👑 Enterprise</option>
                  </select>
                  ${isProtectedBusiness ? '<small class="admin-hub-help">Mantén Enterprise para el negocio principal.</small>' : ''}
                </div>
                <div class="admin-hub-form-group admin-hub-form-group--icon">
                  <label>Icono (Font Awesome) <button type="button" class="btn-icon-picker" data-open-icon-picker title="Seleccionar ícono"><i class="fas fa-icons"></i></button></label>
                  <div class="admin-hub-icon-input">
                    <div class="admin-hub-icon-preview" data-icon-preview><i class="${negocio?.icono || 'fas fa-store'}"></i></div>
                    <input type="text" name="icono" value="${Utils.sanitize(negocio?.icono || '')}" placeholder="fas fa-store">
                  </div>
                  <small class="admin-hub-help">Introduce la clase Font Awesome o selecciona uno de los sugeridos</small>
                  <div class="admin-hub-icon-suggestions" data-icon-suggestions></div>
                </div>
              </div>
              
              ${iconPickerHTML}
            </section>

            <section class="admin-hub-modal-section">
              <div class="admin-hub-section-title">
                <div class="admin-hub-section-heading">
                  <span class="admin-hub-section-label"><i class="fas fa-th-large"></i> Módulos habilitados</span>
                  <div class="admin-hub-module-counter" data-module-counter>${moduleCounterLabel}</div>
                </div>
                <div class="admin-hub-module-actions">
                  <button type="button" class="btn-module-action" data-select-all-modules title="Seleccionar todos los módulos disponibles">
                    <i class="fas fa-check-double"></i> Todos
                  </button>
                  <button type="button" class="btn-module-action secondary" data-deselect-all-modules title="${deselectBtnTitle}"${deselectBtnDisabledAttr}>
                    <i class="fas fa-times"></i> Ninguno
                  </button>
                </div>
              </div>
              <small class="admin-hub-help">Selecciona los módulos que estarán disponibles para este negocio. Los administradores tendrán acceso a todos los módulos seleccionados.</small>
              <div class="admin-hub-modules-grid">
                ${modulesHTML}
              </div>
            </section>

            <section class="admin-hub-modal-section">
              <div class="admin-hub-form-group">
                <label>Notas internas</label>
                <textarea name="descripcion" rows="3" placeholder="Notas internas sobre el negocio"></textarea>
              </div>
            </section>

            <footer>
              <button type="button" class="btn secondary" data-admin-hub-close>Cancelar</button>
              <button type="submit" class="btn">${submitLabel}</button>
            </footer>
          </form>
        </main>
      </div>
    `;
  },

  async submitBusinessForm(form, negocio = null) {
    const isEdit = !!negocio;
    const formData = new FormData(form);
    const id = formData.get('id')?.toString().trim();
    const nombre = formData.get('nombre')?.toString().trim();

    if (!id || !nombre) {
      Utils.showToast('ID y nombre del negocio son obligatorios.', 'warning');
      return false;
    }

    // Super admin puede editar el ID del negocio
    if (isEdit && negocio?.id && negocio.id !== id && !Auth.isSuperAdmin()) {
      Utils.showToast(
        'Solo el super administrador puede modificar el identificador del negocio.',
        'warning'
      );
      return false;
    }

    const modulos = this.collectSelectedModules(form);
    if (!modulos.length) {
      Utils.showToast('Selecciona al menos un módulo para activar en el negocio.', 'warning');
      return false;
    }

    const originalId = negocio?.id || null;
    const idCambio = isEdit && originalId && originalId !== id;

    const payload = {
      id,
      nombre,
      tipo: formData.get('tipo')?.toString().trim() || 'general',
      plan: formData.get('plan')?.toString().trim() || 'basico',
      icono: formData.get('icono')?.toString().trim() || 'fas fa-store',
      descripcion: formData.get('descripcion')?.toString().trim() || '',
      modulos,
    };

    let response;
    try {
      const endpoint = isEdit ? `/negocios/${negocio.id}` : '/negocios/crear';
      const method = isEdit ? 'PUT' : 'POST';

      response = await Auth._request(endpoint, { method, body: payload });

      Utils.showToast(
        response?.message || `Negocio ${isEdit ? 'actualizado' : 'creado'} correctamente.`,
        'success'
      );

      // Actualizar datos sin recargar página
      if (window.DataRefreshManager) {
        if (isEdit) {
          const businessIndex = this.state.negocios.findIndex((b) => b.id === negocio.id);
          if (businessIndex !== -1) {
            const updatedBusiness = response?.negocio
              ? { ...this.state.negocios[businessIndex], ...response.negocio }
              : { ...this.state.negocios[businessIndex], ...payload };
            this.state.negocios[businessIndex] = updatedBusiness;
          }
        } else {
          const newBusiness = response?.negocio || { ...payload };
          this.state.negocios = [...this.state.negocios, newBusiness];
        }
        await this.renderAll();
      } else {
        await this.loadData();
      }

      // Actualizar contexto del negocio actual si estamos editando el negocio activo
      if (isEdit) {
        const updatedId = response?.negocio?.id || id;
        this.refreshBusinessContextAfterUpdate(
          originalId || updatedId,
          updatedId,
          nombre,
          response
        );
      }

      return true;
    } catch (error) {
      Utils.showToast(
        error?.message || `No se pudo ${isEdit ? 'actualizar' : 'crear'} el negocio.`,
        'error'
      );
      return false;
    }
  },

  refreshBusinessContextAfterUpdate(negocioId, nombre, response) {
    // Verificar si estamos editando el negocio actual
    const currentBusinessId =
      typeof Auth !== 'undefined' && Auth && typeof Auth.getCurrentNegocioId === 'function'
        ? Auth.getCurrentNegocioId()
        : localStorage.getItem('negocio_actual');

    if (!currentBusinessId || String(currentBusinessId) !== String(negocioId)) {
      return; // No es el negocio actual, no hacer nada
    }

    console.log('🔄 Actualizando contexto del negocio actual tras edición...');

    // Actualizar módulos activos de App
    if (typeof App !== 'undefined' && App) {
      if (typeof App.loadActiveBusinessModules === 'function') {
        App.loadActiveBusinessModules().catch((error) => {
          console.warn(
            'No se pudieron actualizar los módulos activos tras editar el negocio.',
            error
          );
        });
      }

      if (typeof App.loadUserInfo === 'function') {
        App.loadUserInfo().catch((error) => {
          console.warn('No se pudo refrescar la información del negocio tras la edición.', error);
        });
      }
    }

    // Actualizar nombre de la tienda en elementos del DOM
    const updatedName = response?.negocio?.nombreComercial || response?.negocio?.nombre || nombre;

    const storeNameElement = document.getElementById('storeName');
    if (storeNameElement) {
      storeNameElement.textContent = updatedName;
    }

    const storeNameHeaderElement = document.getElementById('storeNameHeader');
    if (storeNameHeaderElement) {
      storeNameHeaderElement.textContent = updatedName;
    }

    // Actualizar configuraciones locales
    if (updatedName && typeof Database !== 'undefined' && Database) {
      try {
        // Actualizar configTienda
        const configTienda = Database.get('configTienda');
        if (configTienda && typeof configTienda === 'object') {
          Database.set('configTienda', { ...configTienda, nombreTienda: updatedName });
        }

        // Actualizar configuracion
        const configuracion = Database.get('configuracion');
        if (configuracion && typeof configuracion === 'object') {
          Database.set('configuracion', { ...configuracion, nombreNegocio: updatedName });
        }
      } catch (error) {
        console.warn(
          'No se pudo sincronizar la configuración local tras editar el negocio.',
          error
        );
      }
    }
  },

  setupBusinessModal(overlay, negocio = null) {
    const form = overlay.querySelector('form');
    if (!form) return;

    const elements = {
      templateRadios: Array.from(form.querySelectorAll('input[name="plantilla"]')),
      idInput: form.querySelector('input[name="id"]'),
      nameInput: form.querySelector('input[name="nombre"]'),
      tipoSelect: form.querySelector('select[name="tipo"]'),
      planSelect: form.querySelector('select[name="plan"]'),
      iconInput: form.querySelector('input[name="icono"]'),
      descripcionInput: form.querySelector('textarea[name="descripcion"]'),
      iconPreview: form.querySelector('[data-icon-preview]'),
      moduleCheckboxes: Array.from(form.querySelectorAll('input[name="modulos"]')),
      moduleCounter: form.querySelector('[data-module-counter]'),
      planBadge: form.querySelector('[data-plan-preview]'),
      clearTemplateBtn: form.querySelector('[data-admin-hub-clear-template]'),
      iconSuggestions: form.querySelector('[data-icon-suggestions]'),
      selectAllBtn: form.querySelector('[data-select-all-modules]'),
      deselectAllBtn: form.querySelector('[data-deselect-all-modules]'),
      iconPickerBtn: form.querySelector('[data-open-icon-picker]'),
    };

    const isEdit = !!negocio;
    const isProtectedBusiness = isEdit && this.isBusinessProtected(negocio.id);

    const state = {
      idManuallyEdited: isEdit,
      activeTemplateId: null,
    };

    // --- Funciones de Ayuda ---

    const updatePlanBadge = (label) => {
      if (elements.planBadge) elements.planBadge.textContent = label || 'Plan personalizado';
    };

    const updateIconPreview = (iconClass) => {
      if (elements.iconPreview) {
        elements.iconPreview.innerHTML = `<i class="${iconClass || 'fas fa-store'}"></i>`;
      }
    };

    const updateModuleCounter = () => {
      if (!elements.moduleCounter) return;
      const count = elements.moduleCheckboxes.filter((c) => c.checked).length;
      const total = elements.moduleCheckboxes.length;

      if (isProtectedBusiness) {
        elements.moduleCounter.textContent = `${count}/${total} módulos (Negocio Principal)`;
        elements.moduleCounter.classList.add('main-business');
      } else {
        if (count === 0) {
          elements.moduleCounter.textContent = '⚠️ Selecciona al menos un módulo';
          elements.moduleCounter.classList.add('warning');
        } else if (count === total) {
          elements.moduleCounter.textContent = `✓ Todos los módulos (${count}/${total})`;
          elements.moduleCounter.classList.remove('warning');
        } else {
          elements.moduleCounter.textContent = `${count}/${total} módulos seleccionados`;
          elements.moduleCounter.classList.remove('warning');
        }
        elements.moduleCounter.classList.remove('main-business');
      }
    };

    const resolveDependencies = (initialList) => {
      const queue = [...(initialList || [])];
      const resolved = new Set();
      while (queue.length) {
        const id = MODULE_ALIAS_MAP[queue.pop()] || queue.pop();
        if (id && !resolved.has(id)) {
          resolved.add(id);
          const config = MODULE_LOOKUP.get(id);
          if (config?.requires) queue.push(...config.requires);
        }
      }
      return resolved;
    };

    const setModules = (moduleIds, withDependencies = true) => {
      const allModuleIds = MODULE_CATALOG.map((m) => m.id);
      const toSelect = Array.isArray(moduleIds) ? moduleIds : [];

      // Si se pasa un array vacío o null, usar módulos por defecto
      const modulesToProcess = toSelect.length ? toSelect : DEFAULT_BUSINESS_MODULES;

      // Resolver dependencias solo si withDependencies es true
      const resolved = withDependencies
        ? resolveDependencies(modulesToProcess)
        : new Set(modulesToProcess);

      // Actualizar checkboxes
      elements.moduleCheckboxes.forEach((cb) => {
        const module = MODULE_LOOKUP.get(cb.value);
        const shouldBeChecked = resolved.has(cb.value) || module?.mandatory;

        cb.checked = shouldBeChecked;

        // Los módulos obligatorios siempre están deshabilitados y marcados
        cb.disabled = module?.mandatory || false;
      });

      updateModuleCounter();
    };

    const applyTemplate = (templateId) => {
      const template = BUSINESS_BLUEPRINTS.find((t) => t.id === templateId);
      if (!template) return;

      if (elements.tipoSelect) elements.tipoSelect.value = template.type;
      if (elements.planSelect) {
        elements.planSelect.value = template.plan;
        updatePlanBadge(template.planDisplay);
      }
      if (elements.nameInput) elements.nameInput.value = template.displayName;
      if (!state.idManuallyEdited && elements.idInput) elements.idInput.value = template.id;
      if (elements.descripcionInput) elements.descripcionInput.value = template.description;
      if (elements.iconInput) {
        elements.iconInput.value = template.icon;
        updateIconPreview(template.icon);
      }
      setModules(template.modules);
      state.activeTemplateId = template.id;
    };

    // --- Lógica Principal ---

    // Precargar datos en modo edición
    if (isEdit && negocio) {
      if (elements.iconInput) elements.iconInput.value = negocio.icono || 'fas fa-store';
      if (elements.descripcionInput) elements.descripcionInput.value = negocio.descripcion || '';
      setModules(Array.isArray(negocio.modulos) ? negocio.modulos : []);
      updateIconPreview(negocio.icono);
    }

    // Configurar listeners
    elements.templateRadios.forEach((radio) =>
      radio.addEventListener('change', () => radio.checked && applyTemplate(radio.value))
    );

    if (elements.clearTemplateBtn) {
      elements.clearTemplateBtn.addEventListener('click', () => {
        elements.templateRadios.forEach((r) => (r.checked = false));
        setModules(DEFAULT_BUSINESS_MODULES);
      });
    }

    if (elements.selectAllBtn) {
      elements.selectAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('🔵 Seleccionando todos los módulos disponibles');

        elements.moduleCheckboxes.forEach((cb) => {
          const moduleConfig = MODULE_LOOKUP.get(cb.value);
          const isMandatory = Boolean(moduleConfig?.mandatory);
          cb.checked = true;
          cb.disabled = isMandatory;
        });

        updateModuleCounter();
      });
    }

    if (elements.deselectAllBtn) {
      elements.deselectAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔴 Deseleccionando todos - volviendo a módulos por defecto');
        setModules(DEFAULT_BUSINESS_MODULES);
      });
    }

    elements.moduleCheckboxes.forEach((cb) => {
      cb.addEventListener('change', (e) => {
        console.log(`📦 Módulo ${cb.value}: ${cb.checked ? 'activado' : 'desactivado'}`);
        updateModuleCounter();

        // Limpiar plantilla activa si se modifica manualmente
        if (state.activeTemplateId) {
          state.activeTemplateId = null;
          elements.templateRadios.forEach((r) => (r.checked = false));
        }
      });
    });

    // Aplicar plantilla inicial o valores por defecto
    const initialTemplate = elements.templateRadios.find((r) => r.checked);
    if (initialTemplate) {
      applyTemplate(initialTemplate.value);
    } else if (!isEdit) {
      setModules(DEFAULT_BUSINESS_MODULES);
    }
    updateModuleCounter();

    // Configurar picker de iconos
    const iconPicker = form.querySelector('[data-icon-picker]');
    const iconPickerBtn = form.querySelector('[data-open-icon-picker]');
    const closeIconPickerBtn = form.querySelector('[data-close-icon-picker]');

    if (iconPickerBtn && iconPicker) {
      iconPickerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        iconPicker.style.display = 'flex';
      });
    }

    if (closeIconPickerBtn && iconPicker) {
      closeIconPickerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        iconPicker.style.display = 'none';
      });
    }

    // Selección de iconos
    if (iconPicker) {
      iconPicker.querySelectorAll('[data-icon-value]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const iconClass = btn.getAttribute('data-icon-value');
          if (elements.iconInput) {
            elements.iconInput.value = iconClass;
            updateIconPreview(iconClass);
          }
          iconPicker.style.display = 'none';
        });
      });
    }

    // Actualizar preview de icono al escribir
    if (elements.iconInput) {
      elements.iconInput.addEventListener('input', (e) => {
        updateIconPreview(e.target.value);
      });
    }

    // Actualizar sugerencias de iconos según tipo
    if (elements.tipoSelect && elements.iconSuggestions) {
      const updateIconSuggestions = () => {
        const tipo = elements.tipoSelect.value || 'general';
        const suggestions = ICON_SUGGESTIONS[tipo] || ICON_SUGGESTIONS.default;

        elements.iconSuggestions.innerHTML = suggestions
          .map(
            (icon) => `
            <button type="button" class="admin-hub-icon-suggestion" data-suggest-icon="${icon}">
              <i class="${icon}"></i>
            </button>
          `
          )
          .join('');

        elements.iconSuggestions.querySelectorAll('[data-suggest-icon]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const icon = btn.getAttribute('data-suggest-icon');
            if (elements.iconInput) {
              elements.iconInput.value = icon;
              updateIconPreview(icon);
            }
          });
        });
      };

      // 🔥 AGREGAR LISTENER PARA CAMBIOS DE TIPO: Cuando cambia el tipo, actualizar módulos disponibles
      const onTypeChange = () => {
        updateIconSuggestions();

        // Recalcular recomendaciones según tipo de negocio
        const newType = elements.tipoSelect.value || 'general';
        const typeKeyMap = {
          mecanica: 'mecanica',
          tiendas: 'tiendas',
          ferreteria: 'ferreteria',
          restaurante: 'restaurante',
          farmacia: 'farmacia',
          general: 'general',
          personalizado: 'personalizado',
        };
        const normalizedTypeKey = typeKeyMap[newType] || newType;

        const recommendedIds = new Set(
          MODULE_CATALOG.filter(
            (module) =>
              Array.isArray(module.recommendedFor) &&
              module.recommendedFor.includes(normalizedTypeKey)
          ).map((module) => module.id)
        );

        elements.moduleCheckboxes.forEach((cb) => {
          const label = cb.closest('.admin-hub-module-option');
          if (!label) {
            return;
          }
          if (recommendedIds.has(cb.value)) {
            label.classList.add('recommended');
          } else if (!MODULE_LOOKUP.get(cb.value)?.mandatory) {
            label.classList.remove('recommended');
          }
        });

        updateModuleCounter();
      };

      updateIconSuggestions();
      elements.tipoSelect.addEventListener('change', onTypeChange);
    }
  },

  collectSelectedModules(form) {
    const checkboxes = Array.from(form.querySelectorAll('input[name="modulos"]'));
    const selected = checkboxes.filter((input) => input.checked).map((input) => input.value);

    console.log('📋 Módulos seleccionados:', selected.length, 'de', checkboxes.length);

    if (!selected.length) {
      console.warn('⚠️ No hay módulos seleccionados');
      return [];
    }

    // Normalizar y eliminar duplicados
    const normalized = [];
    const seen = new Set();

    selected.forEach((value) => {
      const normalizedId = MODULE_ALIAS_MAP[value] || value;
      if (!seen.has(normalizedId)) {
        seen.add(normalizedId);
        normalized.push(normalizedId);
      }
    });

    console.log('✅ Módulos normalizados:', normalized);
    return normalized;
  },

  renderIconPicker() {
    let html = '<div class="admin-hub-icon-picker" data-icon-picker style="display:none;">';
    html += '<div class="admin-hub-icon-picker-header">';
    html += '<h4><i class="fas fa-icons"></i> Seleccionar ícono</h4>';
    html +=
      '<button type="button" class="close-btn" data-close-icon-picker><i class="fas fa-times"></i></button>';
    html += '</div>';
    html += '<div class="admin-hub-icon-picker-body">';

    for (const [category, icons] of Object.entries(ICON_CATALOG)) {
      html += `<div class="admin-hub-icon-category">`;
      html += `<h5>${category.charAt(0).toUpperCase() + category.slice(1)}</h5>`;
      html += '<div class="admin-hub-icon-grid">';

      icons.forEach(({ icon, name }) => {
        html += `
          <button type="button" class="admin-hub-icon-choice" data-icon-value="${icon}" title="${name}">
            <i class="${icon}"></i>
            <span>${name}</span>
          </button>
        `;
      });

      html += '</div></div>';
    }

    html += '</div></div>';
    return html;
  },
};

window.AdminHub = AdminHub;
