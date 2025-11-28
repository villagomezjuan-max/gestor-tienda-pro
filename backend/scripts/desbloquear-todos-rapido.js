#!/usr/bin/env node

/**
 * Script simple para desbloquear TODOS los usuarios inmediatamente
 * Sin confirmaciones ni interacciones
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

// Encontrar la base de datos
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

try {
  const dbPath = findDatabase();

  if (!dbPath) {
    console.error('❌ No se encontró la base de datos.');
    process.exit(1);
  }

  console.log(`\n📂 Base de datos: ${dbPath}\n`);

  const db = new Database(dbPath);

  // Obtener usuarios bloqueados antes
  const bloqueadosAntes = db
    .prepare(
      `
    SELECT username, nombre, bloqueado_hasta, intentos_fallidos
    FROM usuarios
    WHERE bloqueado_hasta IS NOT NULL
      AND datetime(bloqueado_hasta) > datetime('now')
  `
    )
    .all();

  if (bloqueadosAntes.length > 0) {
    console.log('🔒 Usuarios bloqueados encontrados:');
    bloqueadosAntes.forEach((u, i) => {
      console.log(
        `   ${i + 1}. ${u.username} (${u.nombre || 'Sin nombre'}) - ${u.intentos_fallidos} intentos`
      );
    });
    console.log('');
  } else {
    console.log('ℹ️  No hay usuarios bloqueados.\n');
  }

  // Desbloquear TODOS
  const result = db
    .prepare(
      `
    UPDATE usuarios
    SET intentos_fallidos = 0,
        bloqueado_hasta = NULL
    WHERE intentos_fallidos > 0 OR bloqueado_hasta IS NOT NULL
  `
    )
    .run();

  if (result.changes > 0) {
    console.log(`✅ ${result.changes} usuario(s) desbloqueado(s) exitosamente.\n`);

    // Mostrar los que se desbloquearon
    if (bloqueadosAntes.length > 0) {
      console.log('🔓 Usuarios desbloqueados:');
      bloqueadosAntes.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.username} - ¡Listo para iniciar sesión!`);
      });
      console.log('');
    }
  } else {
    console.log('ℹ️  No había usuarios para desbloquear.\n');
  }

  db.close();
  console.log('✨ Proceso completado. Ahora puedes iniciar sesión.\n');
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
