/**
 * ROLES DEL SISTEMA - CLARIDAD TOTAL
 *
 * SUPER_ADMIN: Usuario ÚNICO del sistema central "Mi Negocio Principal"
 *              - Gestiona TODAS las tiendas
 *              - Acceso completo a Super Admin Tools
 *              - Control total del sistema
 *
 * admin: Administrador de UNA tienda individual (restaurante, mecánica, etc.)
 *        - Solo gestiona SU tienda
 *        - NO puede ver otras tiendas
 *        - NO tiene acceso a Super Admin Tools
 *
 * vendedor: Empleado de ventas de una tienda
 * tecnico: Empleado técnico de una tienda
 */

const ROLE_SUPER_ADMIN = 'SUPER_ADMIN'; // Usuario del Sistema Central
const ROLE_ADMIN = 'admin'; // Administrador de tienda individual
const ROLE_VENDEDOR = 'vendedor'; // Empleado de ventas
const ROLE_TECNICO = 'tecnico'; // Empleado técnico

const LEGACY_ROLE_MAP = {
  super_admin: ROLE_SUPER_ADMIN, // Convertir minúsculas a MAYÚSCULAS
  superadmin: ROLE_SUPER_ADMIN,
  'super-admin': ROLE_SUPER_ADMIN,
  superadministrator: ROLE_SUPER_ADMIN,
  SUPER_ADMIN: ROLE_SUPER_ADMIN,
  admin: ROLE_ADMIN,
  administrador: ROLE_ADMIN,
  gerente: ROLE_ADMIN,
  ventas: ROLE_VENDEDOR,
  vendedor: ROLE_VENDEDOR,
  user: ROLE_VENDEDOR,
  technician: ROLE_TECNICO,
  tecnico: ROLE_TECNICO,
  mecanico: ROLE_TECNICO,
};

const DEFAULT_ROLE = ROLE_VENDEDOR;

const PERMISSIONS = {
  // Permisos exclusivos de SUPER_ADMIN (Sistema Central)
  MANAGE_TENANTS: 'manage_tenants', // Crear/eliminar tiendas
  MANAGE_USERS_GLOBAL: 'manage_users_global', // Gestionar usuarios de TODAS las tiendas
  ACCESS_SUPER_ADMIN_TOOLS: 'access_super_admin_tools', // Super Admin Tools

  // Permisos de admin (Tienda Individual)
  VIEW_TENANTS: 'view_tenants', // Ver su tienda
  MANAGE_USERS_LOCAL: 'manage_users_local', // Gestionar usuarios de SU tienda
  MANAGE_INVENTORY: 'manage_inventory', // Gestionar inventario
  MANAGE_FINANCES: 'manage_finances', // Gestionar finanzas
  ACCESS_REPORTS: 'access_reports', // Acceso a reportes
  VIEW_SETTINGS: 'view_settings', // Ver configuraciones sensibles
  MANAGE_SETTINGS: 'manage_settings', // Actualizar configuraciones del negocio

  // Permisos de empleados
  VIEW_USERS: 'view_users', // Ver usuarios
  OPERATE_POS: 'operate_pos', // Operar punto de venta
  OPERATE_WORKSHOP: 'operate_workshop', // Operar taller
};

const PERMISSION_MATRIX = {
  [ROLE_SUPER_ADMIN]: new Set([
    // SUPER_ADMIN tiene TODOS los permisos
    PERMISSIONS.MANAGE_TENANTS,
    PERMISSIONS.VIEW_TENANTS,
    PERMISSIONS.MANAGE_USERS_GLOBAL,
    PERMISSIONS.MANAGE_USERS_LOCAL,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.OPERATE_POS,
    PERMISSIONS.OPERATE_WORKSHOP,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.MANAGE_FINANCES,
    PERMISSIONS.ACCESS_REPORTS,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.ACCESS_SUPER_ADMIN_TOOLS, // Solo SUPER_ADMIN
  ]),
  [ROLE_ADMIN]: new Set([
    // admin solo puede gestionar SU tienda
    PERMISSIONS.VIEW_TENANTS,
    PERMISSIONS.MANAGE_USERS_LOCAL, // Solo usuarios de su tienda
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.OPERATE_POS,
    PERMISSIONS.OPERATE_WORKSHOP,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.MANAGE_FINANCES,
    PERMISSIONS.ACCESS_REPORTS,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.MANAGE_SETTINGS,
    // NO tiene: MANAGE_TENANTS, MANAGE_USERS_GLOBAL, ACCESS_SUPER_ADMIN_TOOLS
  ]),
  [ROLE_VENDEDOR]: new Set([PERMISSIONS.OPERATE_POS, PERMISSIONS.VIEW_USERS]),
  [ROLE_TECNICO]: new Set([PERMISSIONS.OPERATE_WORKSHOP, PERMISSIONS.VIEW_USERS]),
};

function normalizeRole(rawRole) {
  if (!rawRole) {
    return DEFAULT_ROLE;
  }
  const key = rawRole.toString().trim();

  // Buscar en el mapa (insensible a mayúsculas)
  const lowerKey = key.toLowerCase();
  if (LEGACY_ROLE_MAP[lowerKey]) {
    return LEGACY_ROLE_MAP[lowerKey];
  }

  const compactKey = lowerKey.replace(/[^a-z0-9]/g, '');
  if (LEGACY_ROLE_MAP[compactKey]) {
    return LEGACY_ROLE_MAP[compactKey];
  }

  // Si es exactamente 'SUPER_ADMIN', mantener mayúsculas
  if (key === 'SUPER_ADMIN') {
    return ROLE_SUPER_ADMIN;
  }

  return key || DEFAULT_ROLE;
}

function isRole(role, targets) {
  const normalized = normalizeRole(role);
  if (!targets) {
    return false;
  }
  const list = Array.isArray(targets) ? targets : [targets];
  return list.map(normalizeRole).includes(normalized);
}

function hasPermission(role, permission) {
  const normalizedRole = normalizeRole(role);
  const perms = PERMISSION_MATRIX[normalizedRole];
  if (!perms) {
    return false;
  }
  return perms.has(permission);
}

module.exports = {
  ROLE_SUPER_ADMIN, // 'SUPER_ADMIN' - Usuario del Sistema Central
  ROLE_ADMIN, // 'admin' - Administrador de tienda individual
  ROLE_VENDEDOR, // 'vendedor' - Empleado de ventas
  ROLE_TECNICO, // 'tecnico' - Empleado técnico
  DEFAULT_ROLE,
  PERMISSIONS,
  PERMISSION_MATRIX,
  normalizeRole,
  isRole,
  hasPermission,
};
