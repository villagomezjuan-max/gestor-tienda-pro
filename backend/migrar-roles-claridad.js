/**
 * MIGRACIÓN DE ROLES - CLARIDAD TOTAL
 *
 * OBJETIVO: Eliminar confusión entre roles
 *
 * ANTES (CONFUSO):
 * - super_admin: ¿Usuario del sistema o de una tienda?
 * - admin: ¿Administrador de qué?
 *
 * DESPUÉS (CLARO):
 * - SUPER_ADMIN: Usuario ÚNICO del "Mi Negocio Principal" (Sistema Central)
 *                Gestiona TODAS las tiendas desde el panel central
 *
 * - admin: Administrador de UNA tienda específica (restaurante, mecánica, etc.)
 *          Solo gestiona SU tienda
 *
 * - vendedor: Empleado de una tienda (ventas)
 * - tecnico: Empleado de una tienda (taller)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const Database = require('better-sqlite3');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║        MIGRACIÓN DE ROLES - CLARIDAD TOTAL DEL SISTEMA           ║
╚═══════════════════════════════════════════════════════════════════╝

📋 NUEVA ESTRUCTURA DE ROLES:

┌───────────────────────────────────────────────────────────────────┐
│ SUPER_ADMIN (Rol del Sistema Central)                            │
├───────────────────────────────────────────────────────────────────┤
│ • Usuario ÚNICO de "Mi Negocio Principal"                        │
│ • Gestiona TODAS las tiendas desde un panel central              │
│ • Acceso completo a Super Admin Tools                            │
│ • Control total del sistema                                      │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ admin (Administrador de Tienda Individual)                       │
├───────────────────────────────────────────────────────────────────┤
│ • Administrador de UNA tienda específica                         │
│ • Gestiona usuarios, productos, ventas de SU tienda              │
│ • NO puede ver otras tiendas                                     │
│ • Ejemplo: admin_mecanica, admin_restaurante                     │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ vendedor / tecnico (Empleados)                                   │
├───────────────────────────────────────────────────────────────────┤
│ • Empleados de una tienda específica                             │
│ • Operaciones básicas (ventas, servicios)                        │
│ • NO pueden gestionar usuarios ni configuración                  │
└───────────────────────────────────────────────────────────────────┘

`);

async function migrarRoles() {
  const dataDir = path.join(__dirname, 'data');
  const dbFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith('.db'));

  console.log(`\n📂 Bases de datos encontradas: ${dbFiles.length}\n`);

  // Mostrar todos los usuarios actuales
  console.log('═'.repeat(70));
  console.log('USUARIOS ACTUALES EN TODAS LAS BASES DE DATOS');
  console.log('═'.repeat(70));

  const todosUsuarios = [];

  dbFiles.forEach((dbFile) => {
    const dbPath = path.join(dataDir, dbFile);
    const db = new Database(dbPath);

    try {
      const usuarios = db
        .prepare(
          `
                SELECT id, username, nombre, email, rol, activo 
                FROM usuarios
            `
        )
        .all();

      usuarios.forEach((u) => {
        todosUsuarios.push({
          ...u,
          database: dbFile,
        });
      });
    } catch (e) {
      console.log(`⚠️  Error leyendo ${dbFile}: ${e.message}`);
    }

    db.close();
  });

  // Agrupar por rol actual
  const porRol = {};
  todosUsuarios.forEach((u) => {
    if (!porRol[u.rol]) porRol[u.rol] = [];
    porRol[u.rol].push(u);
  });

  Object.keys(porRol).forEach((rol) => {
    console.log(`\n📌 ROL: ${rol.toUpperCase()} (${porRol[rol].length} usuarios)`);
    porRol[rol].forEach((u) => {
      console.log(`   • ${u.username.padEnd(25)} | ${u.nombre || 'N/A'} | ${u.database}`);
    });
  });

  console.log('\n' + '═'.repeat(70));
  console.log('PLAN DE MIGRACIÓN');
  console.log('═'.repeat(70));

  console.log(`
📋 ACCIONES A REALIZAR:

1. Identificar usuario del Sistema Central ("Mi Negocio Principal")
   → Cambiar su rol de "admin" o "super_admin" → "SUPER_ADMIN"
   → Este usuario gestiona TODAS las tiendas

2. Mantener usuarios "admin" en tiendas individuales
   → admin_mecanica, admin_restaurante, etc.
   → Cada uno solo gestiona SU tienda

3. Actualizar base de datos "super_admin.db"
   → Renombrar a "mi_negocio_principal.db" (opcional)
   → Asegurar que contiene el usuario SUPER_ADMIN

4. Actualizar tabla usuarios_negocios
   → SUPER_ADMIN tiene acceso a TODOS los negocios
   → admin solo tiene acceso a SU negocio
    `);

  const confirmar = await question('\n¿Continuar con la migración? (s/n): ');
  if (confirmar.toLowerCase() !== 's') {
    console.log('❌ Migración cancelada');
    rl.close();
    return;
  }

  console.log('\n' + '─'.repeat(70));
  const usernameSuper = await question(
    'Ingresa el USERNAME del usuario que será SUPER_ADMIN del sistema: '
  );

  if (!usernameSuper.trim()) {
    console.log('❌ Username inválido');
    rl.close();
    return;
  }

  console.log(`\n🔍 Buscando usuario "${usernameSuper}" en todas las bases de datos...`);

  let encontrado = false;
  let bdSuperAdmin = null;

  // Actualizar rol en todas las BDs donde se encuentre
  dbFiles.forEach((dbFile) => {
    const dbPath = path.join(dataDir, dbFile);
    const db = new Database(dbPath);

    try {
      const usuario = db.prepare('SELECT * FROM usuarios WHERE username = ?').get(usernameSuper);

      if (usuario) {
        encontrado = true;
        console.log(`\n✓ Encontrado en: ${dbFile}`);
        console.log(`  Rol actual: ${usuario.rol}`);

        // Actualizar a SUPER_ADMIN
        db.prepare('UPDATE usuarios SET rol = ? WHERE username = ?').run(
          'SUPER_ADMIN',
          usernameSuper
        );

        console.log(`  ✅ Actualizado a: SUPER_ADMIN`);

        // Si es la BD principal, guardar referencia
        if (
          dbFile === 'super_admin.db' ||
          dbFile === 'gestor_tienda.db' ||
          dbFile === 'mi_negocio_principal.db'
        ) {
          bdSuperAdmin = dbFile;
        }
      }
    } catch (e) {
      console.log(`  ⚠️  Error en ${dbFile}: ${e.message}`);
    }

    db.close();
  });

  if (!encontrado) {
    console.log(`\n❌ Usuario "${usernameSuper}" no encontrado en ninguna base de datos`);
    rl.close();
    return;
  }

  // Actualizar master.db para dar acceso a TODOS los negocios
  const masterDbPath = path.join(dataDir, 'master.db');
  if (fs.existsSync(masterDbPath)) {
    console.log(`\n📊 Actualizando master.db...`);
    const masterDb = new Database(masterDbPath);

    try {
      // Obtener ID del usuario SUPER_ADMIN
      const superUser = masterDb
        .prepare('SELECT id FROM usuarios WHERE username = ?')
        .get(usernameSuper);

      if (superUser) {
        const NEGOCIO_SUPER = 'super_admin';

        // Limitar asignaciones únicamente al negocio principal
        masterDb
          .prepare(
            `
                    DELETE FROM usuarios_negocios
                    WHERE usuario_id = ? AND negocio_id != ?
                `
          )
          .run(superUser.id, NEGOCIO_SUPER);

        const asignacion = masterDb
          .prepare(
            `
                    SELECT negocio_id
                    FROM usuarios_negocios
                    WHERE usuario_id = ? AND negocio_id = ?
                `
          )
          .get(superUser.id, NEGOCIO_SUPER);

        if (!asignacion) {
          masterDb
            .prepare(
              `
                        INSERT INTO usuarios_negocios 
                        (usuario_id, negocio_id, rol_en_negocio, es_negocio_principal)
                        VALUES (?, ?, ?, 1)
                    `
            )
            .run(superUser.id, NEGOCIO_SUPER, 'SUPER_ADMIN');
          console.log(`  ✓ Asignado a negocio principal: ${NEGOCIO_SUPER}`);
        } else {
          masterDb
            .prepare(
              `
                        UPDATE usuarios_negocios
                        SET rol_en_negocio = 'SUPER_ADMIN', es_negocio_principal = 1
                        WHERE usuario_id = ? AND negocio_id = ?
                    `
            )
            .run(superUser.id, NEGOCIO_SUPER);
          console.log(`  ✓ Actualización confirmada en negocio principal: ${NEGOCIO_SUPER}`);
        }

        masterDb
          .prepare(
            `
                    UPDATE usuarios
                    SET negocio_principal = ?, negocios = ?, updated_at = datetime('now')
                    WHERE id = ?
                `
          )
          .run(NEGOCIO_SUPER, JSON.stringify([NEGOCIO_SUPER]), superUser.id);

        console.log(`  ✅ SUPER_ADMIN limitado al negocio principal ${NEGOCIO_SUPER}`);
      }
    } catch (e) {
      console.log(`  ⚠️  Error actualizando master.db: ${e.message}`);
    }

    masterDb.close();
  }

  // Resumen final
  console.log('\n' + '═'.repeat(70));
  console.log('✅ MIGRACIÓN COMPLETADA');
  console.log('═'.repeat(70));

  console.log(`
📊 RESUMEN:

1. Usuario SUPER_ADMIN: ${usernameSuper}
   • Rol actualizado en todas las bases de datos
    • Acceso exclusivo al negocio "super_admin"
   • Puede usar Super Admin Tools

2. Usuarios "admin" en tiendas individuales:
   • Mantienen su rol "admin"
   • Cada uno gestiona solo SU tienda

3. Próximos pasos:
   • Cierra sesión y vuelve a iniciar sesión como ${usernameSuper}
   • El nuevo token incluirá el rol SUPER_ADMIN
   • Accede al dashboard → Verás "Mi Negocio Principal"
   • Accede a Super Admin Tools → Gestiona todas las tiendas

⚠️  IMPORTANTE:
   • El cambio de rol solo aplica DESPUÉS de reiniciar sesión
   • El token JWT se regenera con el nuevo rol
   • Usuarios "admin" de tiendas NO verán Super Admin Tools
    `);

  rl.close();
}

migrarRoles().catch((err) => {
  console.error('❌ Error:', err);
  rl.close();
  process.exit(1);
});
