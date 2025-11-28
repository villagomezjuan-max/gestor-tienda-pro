#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

function findDatabase() {
  const possiblePaths = [
    path.join(__dirname, '..', 'data', 'gestor_tienda.db'),
    path.join(__dirname, '..', 'data', 'mecanica.db'),
    path.join(process.cwd(), 'data', 'gestor_tienda.db'),
    path.join(process.cwd(), 'backend', 'data', 'gestor_tienda.db'),
  ];

  for (const dbPath of possiblePaths) {
    if (fs.existsSync(dbPath)) {
      return dbPath;
    }
  }
  return null;
}

console.log('\n' + '='.repeat(70));
console.log('🔐 RESETEAR CONTRASEÑA DE ADMIN');
console.log('='.repeat(70) + '\n');

const dbPath = findDatabase();

if (!dbPath) {
  console.error('❌ No se encontró la base de datos.');
  process.exit(1);
}

console.log(`📂 Base de datos: ${dbPath}\n`);

const db = new Database(dbPath);

// Buscar usuario admin
const admin = db
  .prepare(
    `
  SELECT id, username, nombre
  FROM usuarios
  WHERE LOWER(username) = 'admin'
`
  )
  .get();

if (!admin) {
  console.log('❌ No existe el usuario "admin"');
  db.close();
  process.exit(1);
}

console.log(`📌 Usuario encontrado: ${admin.username} (${admin.nombre})\n`);
console.log('🔄 Generando nueva contraseña: "admin123"\n');

// Generar hash de la nueva contraseña
bcrypt.hash('admin123', 10, (err, hash) => {
  if (err) {
    console.error('❌ Error generando hash:', err.message);
    db.close();
    process.exit(1);
  }

  console.log('✅ Hash generado correctamente\n');
  console.log('💾 Actualizando contraseña en la base de datos...\n');

  try {
    // Actualizar contraseña y resetear campos de bloqueo
    const result = db
      .prepare(
        `
      UPDATE usuarios
      SET password = ?,
          intentos_fallidos = 0,
          bloqueado_hasta = NULL,
          debe_cambiar_password = 0
      WHERE id = ?
    `
      )
      .run(hash, admin.id);

    if (result.changes > 0) {
      console.log('✅ ¡Contraseña actualizada exitosamente!\n');
      console.log('='.repeat(70));
      console.log('');
      console.log('🎉 CREDENCIALES ACTUALIZADAS:');
      console.log('');
      console.log('   Usuario:    admin');
      console.log('   Contraseña: admin123');
      console.log('');
      console.log('='.repeat(70));
      console.log('');
      console.log('📝 PRÓXIMOS PASOS:');
      console.log('');
      console.log('   1. Abre: http://localhost:5500/login.html');
      console.log('   2. Ingresa:');
      console.log('      Usuario: admin');
      console.log('      Contraseña: admin123');
      console.log('   3. ¡Deberías poder entrar sin problemas!');
      console.log('');
      console.log('='.repeat(70) + '\n');
    } else {
      console.log('❌ No se pudo actualizar la contraseña\n');
    }

    db.close();
  } catch (error) {
    console.error('❌ Error actualizando base de datos:', error.message);
    db.close();
    process.exit(1);
  }
});
