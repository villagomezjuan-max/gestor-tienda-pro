const path = require('path');

const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const {
  PRIMARY_SUPER_ADMIN_USERNAME,
  SUPER_ADMIN_USERNAME_ALIASES,
} = require('./utils/super-admin');

const dbPath = path.join(__dirname, 'data', 'gestor_tienda.db');
const db = new Database(dbPath);

console.log('🔐 RESET DE CONTRASEÑA DEL ADMINISTRADOR');
console.log('='.repeat(60));
console.log('');

// Nueva contraseña
const newPassword = 'admin123';
const hashedPassword = bcrypt.hashSync(newPassword, 10);

const aliasValues = Array.from(
  new Set(
    [...SUPER_ADMIN_USERNAME_ALIASES, PRIMARY_SUPER_ADMIN_USERNAME]
      .map((alias) => (alias || '').toLowerCase().trim())
      .filter(Boolean)
  )
);

const findAdminStmt =
  aliasValues.length > 0
    ? db.prepare(
        `SELECT id, username FROM usuarios WHERE LOWER(username) IN (${aliasValues
          .map(() => '?')
          .join(',')}) LIMIT 1`
      )
    : null;

try {
  if (!findAdminStmt) {
    console.log('❌ No se pudo determinar el alias del super administrador.');
    process.exit(1);
  }

  const adminUser = findAdminStmt.get(...aliasValues);

  if (!adminUser) {
    console.log('❌ No se encontró el usuario super administrador.');
    process.exit(1);
  }

  // Resetear contraseña y limpiar bloqueos
  const result = db
    .prepare(
      `
    UPDATE usuarios 
    SET username = ?,
        password = ?,
        nombre = ?,
        rol = 'super_admin',
        intentos_fallidos = 0,
        bloqueado_hasta = NULL,
        requiere_cambio_password = 0,
        activo = 1,
        updated_at = datetime('now')
    WHERE id = ?
  `
    )
    .run(
      PRIMARY_SUPER_ADMIN_USERNAME,
      hashedPassword,
      'Super Administrador',
      adminUser.id
    );

  if (result.changes > 0) {
    console.log('✅ Contraseña del admin reseteada exitosamente');
    console.log('');
    console.log('📋 CREDENCIALES DE ACCESO:');
    console.log('   Username: admin (alias de super:admin)');
    console.log('   Password: admin123');
    console.log('');
    console.log('🔒 Intentos fallidos: 0');
    console.log('🔓 Cuenta desbloqueada');
    console.log('');

    // Verificar el usuario actualizado
    const user = db
      .prepare(
        'SELECT id, username, rol, activo, intentos_fallidos, bloqueado_hasta FROM usuarios WHERE id = ?'
      )
      .get(adminUser.id);
    console.log('✅ Usuario actualizado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Rol: ${user.rol}`);
    console.log(`   Activo: ${user.activo ? 'Sí' : 'No'}`);
    console.log(`   Intentos fallidos: ${user.intentos_fallidos || 0}`);
    console.log(`   Bloqueado hasta: ${user.bloqueado_hasta || 'N/A'}`);
  } else {
    console.log('❌ No se pudo actualizar la contraseña del super administrador');
  }
} catch (error) {
  console.error('❌ Error al resetear contraseña:', error.message);
} finally {
  db.close();
}

console.log('');
console.log('='.repeat(60));
console.log('Ahora puedes iniciar sesión con las credenciales indicadas.');
