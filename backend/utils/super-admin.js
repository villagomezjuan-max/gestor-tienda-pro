const PRIMARY_SUPER_ADMIN_USERNAME = 'super:admin';
const SUPER_ADMIN_DISPLAY_NAME = 'SUPER:ADMIN';

const SUPER_ADMIN_USERNAME_ALIASES = [
  'super:admin',
  'super_admin',
  'super-admin',
  'superadmin',
  'super administrator',
  'superadministrator',
  'admin',
];

const SUPER_ADMIN_ALIAS_SET = new Set(
  SUPER_ADMIN_USERNAME_ALIASES.map((alias) => alias.toLowerCase())
);

function sanitizeUsername(username) {
  if (typeof username !== 'string') {
    return '';
  }
  return username.trim();
}

function matchesSuperAdminUsername(username) {
  const sanitized = sanitizeUsername(username).toLowerCase();
  if (!sanitized) {
    return false;
  }
  return SUPER_ADMIN_ALIAS_SET.has(sanitized);
}

function normalizeSuperAdminUsername(username) {
  const sanitized = sanitizeUsername(username);
  if (!sanitized) {
    return '';
  }
  return matchesSuperAdminUsername(sanitized) ? PRIMARY_SUPER_ADMIN_USERNAME : sanitized;
}

function resolveSuperAdminUsername(username) {
  const sanitized = sanitizeUsername(username);
  if (!sanitized) {
    return sanitized;
  }
  if (matchesSuperAdminUsername(sanitized)) {
    return PRIMARY_SUPER_ADMIN_USERNAME;
  }
  return sanitized;
}

function findSuperAdminUser(db) {
  if (!db || typeof db.prepare !== 'function') {
    return null;
  }

  const aliasList = Array.from(SUPER_ADMIN_ALIAS_SET);
  if (!aliasList.length) {
    return null;
  }

  const placeholders = aliasList.map(() => '?').join(',');
  const queryArgs = [...aliasList, PRIMARY_SUPER_ADMIN_USERNAME.toLowerCase()];

  const row = db
    .prepare(
      `
    SELECT id, username, rol, negocio_principal, nombre, intentos_fallidos, bloqueado_hasta
    FROM usuarios
    WHERE LOWER(username) IN (${placeholders})
       OR UPPER(rol) = 'SUPER_ADMIN'
    ORDER BY CASE WHEN LOWER(username) = ? THEN 0 ELSE 1 END,
             updated_at DESC,
             created_at ASC
    LIMIT 1
  `
    )
    .get(...queryArgs);

  return row || null;
}

module.exports = {
  PRIMARY_SUPER_ADMIN_USERNAME,
  SUPER_ADMIN_DISPLAY_NAME,
  SUPER_ADMIN_USERNAME_ALIASES,
  matchesSuperAdminUsername,
  normalizeSuperAdminUsername,
  resolveSuperAdminUsername,
  findSuperAdminUser,
};
