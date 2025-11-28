#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════
 * 🔧 HERRAMIENTA 2: GESTOR DE USUARIOS HUÉRFANOS
 * ═══════════════════════════════════════════════════════════
 *
 * Opciones:
 * 1. Listar usuarios huérfanos
 * 2. Asignar automáticamente
 * 3. Asignar manualmente
 * 4. Eliminar usuarios huérfanos
 */

const Database = require('better-sqlite3');
const path = require('path');
const readline = require('readline');

const MASTER_DB = path.join(__dirname, '..', 'backend', 'data', 'gestor_tienda.db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function pregunta(texto) {
  return new Promise((resolve) => {
    rl.question(texto, resolve);
  });
}

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════');
console.log('\x1b[32m%s\x1b[0m', '🔧 GESTOR DE USUARIOS HUÉRFANOS');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════\n');

async function main() {
  const db = new Database(MASTER_DB);

  try {
    // Buscar usuarios huérfanos
    const usuariosHuerfanos = db
      .prepare(
        `
      SELECT u.id, u.username, u.nombre, u.rol, u.negocio_principal, u.activo
      FROM usuarios u
      WHERE u.rol != 'super_admin'
      AND u.id NOT IN (SELECT usuario_id FROM usuarios_negocios)
    `
      )
      .all();

    if (usuariosHuerfanos.length === 0) {
      console.log('\x1b[32m✅ No hay usuarios huérfanos en el sistema\x1b[0m\n');
      process.exit(0);
    }

    console.log(`\x1b[33m⚠️  Encontrados ${usuariosHuerfanos.length} usuarios huérfanos:\x1b[0m\n`);
    usuariosHuerfanos.forEach((u, i) => {
      console.log(`${i + 1}. ${u.username} (${u.nombre || 'Sin nombre'}) - Rol: ${u.rol}`);
      console.log(`   ID: ${u.id}`);
      console.log(`   Activo: ${u.activo ? 'Sí' : 'No'}\n`);
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('OPCIONES DISPONIBLES:\n');
    console.log('1. Asignar automáticamente (recomendado)');
    console.log('2. Asignar manualmente');
    console.log('3. Eliminar usuarios huérfanos');
    console.log('4. Cancelar\n');

    const opcion = await pregunta('Seleccione una opción (1-4): ');
    console.log('');

    switch (opcion.trim()) {
      case '1':
        await asignarAutomaticamente(db, usuariosHuerfanos);
        break;
      case '2':
        await asignarManualmente(db, usuariosHuerfanos);
        break;
      case '3':
        await eliminarHuerfanos(db, usuariosHuerfanos);
        break;
      case '4':
        console.log('Operación cancelada.\n');
        break;
      default:
        console.log('\x1b[31mOpción no válida.\x1b[0m\n');
    }
  } catch (error) {
    console.error('\n\x1b[31m❌ ERROR:\x1b[0m', error.message);
    process.exit(1);
  } finally {
    db.close();
    rl.close();
  }
}

async function asignarAutomaticamente(db, usuarios) {
  console.log('🔧 ASIGNACIÓN AUTOMÁTICA\n');

  const mapeoUsuarios = {
    admin_mecanica: 'admin_taller.sa',
    admin_tallerpro: 'admin_taller.sa',
    admin_restaurante: 'restaurante',
    admin_tienda: 'tiendas',
    tania: 'admin_taller.sa',
  };

  const confirmar = await pregunta('¿Confirmar asignación automática? (s/n): ');
  if (confirmar.toLowerCase() !== 's') {
    console.log('Operación cancelada.\n');
    return;
  }

  console.log('\n🔧 Asignando usuarios...\n');

  const insertStmt = db.prepare(`
    INSERT INTO usuarios_negocios (usuario_id, negocio_id, rol_en_negocio, es_negocio_principal)
    VALUES (?, ?, ?, 1)
  `);

  const updateStmt = db.prepare(`
    UPDATE usuarios SET negocio_principal = ? WHERE id = ?
  `);

  let asignados = 0;

  usuarios.forEach((u) => {
    let negocioId = mapeoUsuarios[u.username];

    if (!negocioId) {
      // Asignar al primer negocio disponible
      const negocios = db
        .prepare(
          `
        SELECT id FROM negocios WHERE id != 'super_admin' LIMIT 1
      `
        )
        .get();
      negocioId = negocios?.id;
    }

    if (negocioId) {
      const negocio = db.prepare('SELECT nombre FROM negocios WHERE id = ?').get(negocioId);

      if (negocio) {
        try {
          insertStmt.run(u.id, negocioId, u.rol);
          updateStmt.run(negocioId, u.id);
          console.log(`\x1b[32m✅\x1b[0m ${u.username} → ${negocio.nombre}`);
          asignados++;
        } catch (error) {
          console.log(`\x1b[31m❌\x1b[0m ${u.username}: ${error.message}`);
        }
      }
    }
  });

  console.log(`\n\x1b[32m✅ Asignados ${asignados} de ${usuarios.length} usuarios\x1b[0m\n`);
}

async function asignarManualmente(db, usuarios) {
  console.log('🔧 ASIGNACIÓN MANUAL\n');

  const negocios = db
    .prepare(
      `
    SELECT id, nombre, tipo FROM negocios WHERE id != 'super_admin'
  `
    )
    .all();

  console.log('Negocios disponibles:\n');
  negocios.forEach((n, i) => {
    console.log(`${i + 1}. ${n.nombre} [${n.tipo}]`);
  });
  console.log('');

  for (const usuario of usuarios) {
    console.log(`\nUsuario: ${usuario.username} (${usuario.nombre})`);
    const seleccion = await pregunta(
      `Asignar a negocio (1-${negocios.length}) o 's' para saltar: `
    );

    if (seleccion.toLowerCase() === 's') continue;

    const index = parseInt(seleccion) - 1;
    if (index >= 0 && index < negocios.length) {
      const negocio = negocios[index];

      try {
        db.prepare(
          `
          INSERT INTO usuarios_negocios (usuario_id, negocio_id, rol_en_negocio, es_negocio_principal)
          VALUES (?, ?, ?, 1)
        `
        ).run(usuario.id, negocio.id, usuario.rol);

        db.prepare(
          `
          UPDATE usuarios SET negocio_principal = ? WHERE id = ?
        `
        ).run(negocio.id, usuario.id);

        console.log(`\x1b[32m✅ ${usuario.username} → ${negocio.nombre}\x1b[0m`);
      } catch (error) {
        console.log(`\x1b[31m❌ Error: ${error.message}\x1b[0m`);
      }
    }
  }

  console.log('\n\x1b[32m✅ Asignación manual completada\x1b[0m\n');
}

async function eliminarHuerfanos(db, usuarios) {
  console.log('\x1b[31m🗑️  ELIMINAR USUARIOS HUÉRFANOS\x1b[0m\n');

  console.log('⚠️  ADVERTENCIA: Esta acción es IRREVERSIBLE\n');
  console.log('Se eliminarán los siguientes usuarios:\n');

  usuarios.forEach((u) => {
    console.log(`   • ${u.username} (${u.nombre})`);
  });

  console.log('');
  const confirmar1 = await pregunta('¿Está seguro? Escriba "ELIMINAR" para confirmar: ');

  if (confirmar1 !== 'ELIMINAR') {
    console.log('Operación cancelada.\n');
    return;
  }

  const confirmar2 = await pregunta('Segunda confirmación - Escriba "SI" para continuar: ');

  if (confirmar2.toUpperCase() !== 'SI') {
    console.log('Operación cancelada.\n');
    return;
  }

  console.log('\n🗑️  Eliminando usuarios...\n');

  const deleteStmt = db.prepare('DELETE FROM usuarios WHERE id = ?');
  let eliminados = 0;

  usuarios.forEach((u) => {
    try {
      deleteStmt.run(u.id);
      console.log(`\x1b[32m✅\x1b[0m ${u.username} eliminado`);
      eliminados++;
    } catch (error) {
      console.log(`\x1b[31m❌\x1b[0m ${u.username}: ${error.message}`);
    }
  });

  console.log(`\n\x1b[32m✅ Eliminados ${eliminados} de ${usuarios.length} usuarios\x1b[0m\n`);
}

main();
