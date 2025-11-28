const path = require('path');

const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data', 'gestor_tienda.db');
const db = new Database(dbPath);

console.log('🔐 RESET DE CONTRASEÑA DEL ADMINISTRADOR');
console.log('='.repeat(60));
console.log('');

// Nueva contraseña
const newPassword = 'admin123';
const hashedPassword = bcrypt.hashSync(newPassword, 10);

try {
  // Resetear contraseña y limpiar bloqueos
  const result = db
    .prepare(
      `
    UPDATE usuarios 
    SET password = ?,
        intentos_fallidos = 0,
        bloqueado_hasta = NULL,
        requiere_cambio_password = 0,
        updated_at = datetime('now')
    WHERE username = 'admin'
  `
    )
    .run(hashedPassword);

  if (result.changes > 0) {
    console.log('✅ Contraseña del admin reseteada exitosamente');
    console.log('');
    console.log('📋 CREDENCIALES DE ACCESO:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('');
    console.log('🔒 Intentos fallidos: 0');
    console.log('🔓 Cuenta desbloqueada');
    console.log('');

    // Verificar el usuario actualizado
    const user = db
      .prepare(
        'SELECT id, username, rol, activo, intentos_fallidos, bloqueado_hasta FROM usuarios WHERE username = ?'
      )
      .get('admin');
    console.log('✅ Usuario actualizado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Rol: ${user.rol}`);
    console.log(`   Activo: ${user.activo ? 'Sí' : 'No'}`);
    console.log(`   Intentos fallidos: ${user.intentos_fallidos || 0}`);
    console.log(`   Bloqueado hasta: ${user.bloqueado_hasta || 'N/A'}`);
  } else {
    console.log('❌ No se encontró el usuario admin');
  }
} catch (error) {
  console.error('❌ Error al resetear contraseña:', error.message);
} finally {
  db.close();
}

console.log('');
console.log('='.repeat(60));
console.log('Ahora puedes iniciar sesión con las credenciales indicadas.');
