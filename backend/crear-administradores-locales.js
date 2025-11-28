/**
 * Script para crear administradores locales en todos los negocios
 */

const path = require('path');

const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const MASTER_DB = path.join(__dirname, 'data', 'gestor_tienda.db');

console.log('═══════════════════════════════════════════════════════════');
console.log('👥 CREACIÓN DE ADMINISTRADORES LOCALES');
console.log('═══════════════════════════════════════════════════════════\n');

const db = new Database(MASTER_DB);

// Definir los administradores locales para cada negocio
const administradores = [
  {
    negocio_id: 'mecanica',
    negocio_nombre: 'ADMINISTRADOR',
    username: 'admin_mecanica',
    password: 'admin123',
    nombre: 'Administrador Mecánica',
    email: 'admin@mecanica.com',
    rol: 'admin',
  },
  {
    negocio_id: 'admin_taller.sa',
    negocio_nombre: 'ADMIN TALLER',
    username: 'admin_admin_taller',
    password: 'admin123',
    nombre: 'Administrador Admin Taller',
    email: 'admin@admintaller.sa',
    rol: 'admin',
  },
  {
    negocio_id: 'restaurante',
    negocio_nombre: 'Restaurante',
    username: 'admin_restaurante',
    password: 'admin123',
    nombre: 'Administrador Restaurante',
    email: 'admin@restaurante.com',
    rol: 'admin',
  },
  {
    negocio_id: 'tiendas',
    negocio_nombre: 'Tienda General',
    username: 'admin_tienda',
    password: 'admin123',
    nombre: 'Administrador Tienda',
    email: 'admin@tienda.com',
    rol: 'admin',
  },
];

try {
  db.transaction(() => {
    administradores.forEach((admin, index) => {
      console.log(`\n${index + 1}. Creando administrador para: ${admin.negocio_nombre}`);

      // Verificar si el negocio existe
      const negocio = db.prepare('SELECT id FROM negocios WHERE id = ?').get(admin.negocio_id);
      if (!negocio) {
        console.log(`   ❌ Negocio "${admin.negocio_id}" no existe, omitiendo...`);
        return;
      }

      // Verificar si el usuario ya existe
      const existe = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(admin.username);

      let userId;

      if (existe) {
        console.log(`   ⚠️  Usuario "${admin.username}" ya existe, actualizando...`);
        userId = existe.id;

        // Actualizar contraseña
        const passwordHash = bcrypt.hashSync(admin.password, 10);
        db.prepare(
          `
          UPDATE usuarios 
          SET password = ?, nombre = ?, email = ?, rol = ?, negocio_principal = ?, updated_at = datetime('now')
          WHERE id = ?
        `
        ).run(passwordHash, admin.nombre, admin.email, admin.rol, admin.negocio_id, userId);

        // Eliminar asignaciones anteriores
        db.prepare('DELETE FROM usuarios_negocios WHERE usuario_id = ?').run(userId);
      } else {
        console.log(`   📝 Creando nuevo usuario "${admin.username}"...`);
        userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const passwordHash = bcrypt.hashSync(admin.password, 10);

        db.prepare(
          `
          INSERT INTO usuarios (id, username, password, nombre, email, rol, activo, requiere_cambio_password, negocio_principal, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, datetime('now'), datetime('now'))
        `
        ).run(
          userId,
          admin.username,
          passwordHash,
          admin.nombre,
          admin.email,
          admin.rol,
          admin.negocio_id
        );
      }

      // Asignar usuario al negocio
      db.prepare(
        `
        INSERT INTO usuarios_negocios (usuario_id, negocio_id, rol_en_negocio, es_negocio_principal)
        VALUES (?, ?, ?, 1)
      `
      ).run(userId, admin.negocio_id, admin.rol);

      console.log(`   ✅ Usuario: ${admin.username}`);
      console.log(`   ✅ Negocio: ${admin.negocio_id}`);
      console.log(`   ✅ Rol: ${admin.rol}`);
    });
  })();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN FINAL');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Listar todos los usuarios y sus asignaciones
  const usuarios = db
    .prepare(
      `
    SELECT u.id, u.username, u.nombre, u.rol, u.negocio_principal
    FROM usuarios u
    ORDER BY 
      CASE u.rol 
        WHEN 'super_admin' THEN 1 
        WHEN 'admin' THEN 2 
        ELSE 3 
      END,
      u.username
  `
    )
    .all();

  console.log(`Total de usuarios en el sistema: ${usuarios.length}\n`);

  usuarios.forEach((u) => {
    const rolIcon = u.rol === 'super_admin' ? '👑' : u.rol === 'admin' ? '⭐' : '👤';
    console.log(`${rolIcon} ${u.username} (${u.nombre})`);
    console.log(`   Rol: ${u.rol}`);
    console.log(`   Negocio Principal: ${u.negocio_principal || 'N/A'}`);

    const negocios = db
      .prepare(
        `
      SELECT un.negocio_id, un.rol_en_negocio, un.es_negocio_principal, n.nombre
      FROM usuarios_negocios un
      JOIN negocios n ON n.id = un.negocio_id
      WHERE un.usuario_id = ?
    `
      )
      .all(u.id);

    if (negocios.length > 0) {
      console.log(`   Asignaciones:`);
      negocios.forEach((n) => {
        const principal = n.es_negocio_principal ? ' (PRINCIPAL)' : '';
        console.log(`      • ${n.nombre} [${n.negocio_id}]${principal}`);
      });
    }
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔑 CREDENCIALES DE ACCESO');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('SUPER ADMINISTRADOR (acceso completo al sistema):');
  console.log('  Usuario: admin');
  console.log('  Contraseña: admin123');
  console.log('  Negocio: super_admin (base de pruebas)\n');

  console.log('ADMINISTRADORES LOCALES (un negocio cada uno):');
  administradores.forEach((admin) => {
    console.log(`  • ${admin.negocio_nombre}:`);
    console.log(`    Usuario: ${admin.username}`);
    console.log(`    Contraseña: ${admin.password}`);
    console.log(`    Negocio: ${admin.negocio_id}`);
  });

  console.log('\n✅ Todos los usuarios pueden hacer login en: http://localhost:3001');
  console.log('✅ Cada administrador local solo verá su negocio asignado');
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  db.close();
}
