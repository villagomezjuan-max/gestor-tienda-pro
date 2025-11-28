const Database = require('better-sqlite3');

const { normalizeRole, ROLE_SUPER_ADMIN } = require('../utils/roles');

const masterDb = new Database('./data/gestor_tienda.db');

console.log('=== VERIFICACIÓN ACCESOS A SUPER_ADMIN ===\n');

// Verificar usuario admin
const usuarios = masterDb
  .prepare('SELECT id, username, rol, negocios FROM usuarios WHERE username = ?')
  .all('admin');

if (usuarios.length === 0) {
  console.log('❌ No existe el usuario "admin" en la base de datos');
  masterDb.close();
  process.exit(1);
}

const adminRecord = usuarios[0];
const adminRole = normalizeRole(adminRecord.rol);
console.log('👤 Usuario admin:');
usuarios.forEach((u) => {
  console.log(`   ID: ${u.id}`);
  console.log(`   Rol: ${normalizeRole(u.rol)}`);
  console.log(`   Negocios asignados: ${u.negocios || 'N/A'}\n`);
});

if (adminRole !== ROLE_SUPER_ADMIN) {
  masterDb
    .prepare(
      `
        UPDATE usuarios
        SET rol = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `
    )
    .run(ROLE_SUPER_ADMIN, adminRecord.id);
  console.log('⭐ Rol de admin actualizado a SUPER_ADMIN');
}

// Verificar asignaciones en usuarios_negocios
console.log('📋 Asignaciones usuarios_negocios:');
const asignaciones = masterDb
  .prepare(
    `
    SELECT usuario_id, negocio_id, rol_en_negocio, es_negocio_principal
    FROM usuarios_negocios 
    WHERE usuario_id IN (SELECT id FROM usuarios WHERE username = ?)
`
  )
  .all('admin');

if (asignaciones.length === 0) {
  console.log('   ⚠️  No hay asignaciones para admin\n');
} else {
  asignaciones.forEach((a) => {
    const principal = a.es_negocio_principal ? '⭐ PRINCIPAL' : '';
    console.log(`   - Negocio: ${a.negocio_id} (${a.rol_en_negocio}) ${principal}`);
  });
}

// Verificar si existe super_admin en las asignaciones
const tieneSuperAdmin = asignaciones.some((a) => a.negocio_id === 'super_admin');

if (!tieneSuperAdmin) {
  console.log('\n⚠️  PROBLEMA: admin no tiene acceso a super_admin');
  console.log('   Agregando acceso...\n');

  const adminId = adminRecord.id;
  const tableInfo = masterDb.prepare('PRAGMA table_info(usuarios_negocios)').all();
  const hasRolColumn = tableInfo.some((col) => col.name === 'rol');

  try {
    const insertAssignment = hasRolColumn
      ? masterDb.prepare(`
                INSERT INTO usuarios_negocios (usuario_id, negocio_id, rol, rol_en_negocio, es_negocio_principal)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(usuario_id, negocio_id)
                DO UPDATE SET
                    rol = excluded.rol,
                    rol_en_negocio = excluded.rol_en_negocio,
                    es_negocio_principal = excluded.es_negocio_principal
            `)
      : masterDb.prepare(`
                INSERT INTO usuarios_negocios (usuario_id, negocio_id, rol_en_negocio, es_negocio_principal)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(usuario_id, negocio_id)
                DO UPDATE SET
                    rol_en_negocio = excluded.rol_en_negocio,
                    es_negocio_principal = excluded.es_negocio_principal
            `);

    const insertArgs = hasRolColumn
      ? [adminId, 'super_admin', ROLE_SUPER_ADMIN, ROLE_SUPER_ADMIN, 1]
      : [adminId, 'super_admin', ROLE_SUPER_ADMIN, 1];

    insertAssignment.run(...insertArgs);

    // Actualizar columna negocios del usuario
    let negociosActuales = [];
    if (adminRecord.negocios) {
      try {
        const parsed = JSON.parse(adminRecord.negocios);
        if (Array.isArray(parsed)) {
          negociosActuales = parsed;
        } else if (typeof adminRecord.negocios === 'string') {
          negociosActuales = adminRecord.negocios
            .split(',')
            .map((n) => n.trim())
            .filter(Boolean);
        }
      } catch (parseError) {
        negociosActuales = adminRecord.negocios
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean);
      }
    }

    if (!negociosActuales.includes('super_admin')) {
      negociosActuales.push('super_admin');
    }

    masterDb
      .prepare('UPDATE usuarios SET negocios = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(negociosActuales), adminId);

    console.log('   ✅ Acceso agregado correctamente!');
  } catch (error) {
    console.error('   ❌ Error al agregar acceso:', error.message);
  }
} else {
  console.log('\n✅ admin ya tiene acceso a super_admin');
}

masterDb.close();

console.log('\n📌 Próximos pasos:');
console.log('   1. Reinicia el servidor backend');
console.log('   2. Inicia sesión como admin');
console.log('   3. Los datos de SUPER_ADMIN deberían ser visibles');
