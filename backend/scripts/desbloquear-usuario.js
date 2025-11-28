#!/usr/bin/env node

/**
 * Herramienta para desbloquear usuarios bloqueados por intentos fallidos
 *
 * Uso:
 *   node desbloquear-usuario.js <username>
 *   node desbloquear-usuario.js --all
 *   node desbloquear-usuario.js --list
 *
 * Ejemplos:
 *   node desbloquear-usuario.js admin
 *   node desbloquear-usuario.js --all
 *   node desbloquear-usuario.js --list
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

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

// Listar usuarios bloqueados
function listBloqueados(db) {
  const now = new Date().toISOString();

  const bloqueados = db
    .prepare(
      `
    SELECT 
      id,
      username,
      nombre,
      email,
      intentos_fallidos,
      bloqueado_hasta,
      ultimo_acceso
    FROM usuarios
    WHERE bloqueado_hasta IS NOT NULL
      AND datetime(bloqueado_hasta) > datetime(?)
    ORDER BY bloqueado_hasta DESC
  `
    )
    .all(now);

  if (bloqueados.length === 0) {
    logInfo('No hay usuarios bloqueados actualmente.');
    return;
  }

  log('\n' + '='.repeat(80), 'cyan');
  log('USUARIOS BLOQUEADOS', 'bold');
  log('='.repeat(80), 'cyan');

  bloqueados.forEach((user, index) => {
    const bloqueadoHasta = new Date(user.bloqueado_hasta);
    const minutosRestantes = Math.ceil((bloqueadoHasta - new Date()) / 60000);

    log(`\n${index + 1}. ${user.username} (${user.nombre || 'Sin nombre'})`, 'yellow');
    log(`   Email: ${user.email || 'N/A'}`);
    log(`   Intentos fallidos: ${user.intentos_fallidos}`);
    log(`   Bloqueado hasta: ${bloqueadoHasta.toLocaleString('es-ES')}`);
    log(`   Tiempo restante: ${minutosRestantes} minutos`, 'red');
    log(`   Último acceso: ${user.ultimo_acceso || 'Nunca'}`);
  });

  log('\n' + '='.repeat(80), 'cyan');
  log(`Total de usuarios bloqueados: ${bloqueados.length}\n`, 'bold');
}

// Desbloquear un usuario específico
function desbloquearUsuario(db, username) {
  const user = db
    .prepare(
      `
    SELECT id, username, nombre, bloqueado_hasta, intentos_fallidos
    FROM usuarios
    WHERE LOWER(username) = LOWER(?)
  `
    )
    .get(username);

  if (!user) {
    logError(`Usuario "${username}" no encontrado.`);
    return false;
  }

  if (!user.bloqueado_hasta) {
    logWarning(`El usuario "${username}" no está bloqueado.`);
    return false;
  }

  const bloqueadoHasta = new Date(user.bloqueado_hasta);
  if (bloqueadoHasta <= new Date()) {
    logWarning(`El usuario "${username}" ya no está bloqueado (expiró automáticamente).`);
  }

  // Desbloquear
  const result = db
    .prepare(
      `
    UPDATE usuarios
    SET intentos_fallidos = 0,
        bloqueado_hasta = NULL
    WHERE id = ?
  `
    )
    .run(user.id);

  if (result.changes > 0) {
    logSuccess(`Usuario "${username}" (${user.nombre || 'Sin nombre'}) desbloqueado exitosamente.`);
    logInfo(`Intentos fallidos reseteados: ${user.intentos_fallidos} → 0`);
    return true;
  } else {
    logError(`No se pudo desbloquear al usuario "${username}".`);
    return false;
  }
}

// Desbloquear todos los usuarios
function desbloquearTodos(db) {
  const now = new Date().toISOString();

  const bloqueados = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM usuarios
    WHERE bloqueado_hasta IS NOT NULL
      AND datetime(bloqueado_hasta) > datetime(?)
  `
    )
    .get(now);

  if (bloqueados.count === 0) {
    logInfo('No hay usuarios bloqueados para desbloquear.');
    return false;
  }

  const result = db
    .prepare(
      `
    UPDATE usuarios
    SET intentos_fallidos = 0,
        bloqueado_hasta = NULL
    WHERE bloqueado_hasta IS NOT NULL
      AND datetime(bloqueado_hasta) > datetime(?)
  `
    )
    .run(now);

  if (result.changes > 0) {
    logSuccess(`${result.changes} usuario(s) desbloqueado(s) exitosamente.`);
    return true;
  } else {
    logError('No se pudo desbloquear ningún usuario.');
    return false;
  }
}

// Limpiar bloqueos expirados
function limpiarBloqueosExpirados(db) {
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `
    UPDATE usuarios
    SET intentos_fallidos = 0,
        bloqueado_hasta = NULL
    WHERE bloqueado_hasta IS NOT NULL
      AND datetime(bloqueado_hasta) <= datetime(?)
  `
    )
    .run(now);

  if (result.changes > 0) {
    logInfo(`${result.changes} bloqueo(s) expirado(s) limpiado(s).`);
  }
}

// Mostrar ayuda
function showHelp() {
  log('\n' + '='.repeat(80), 'cyan');
  log('HERRAMIENTA DE DESBLOQUEO DE USUARIOS', 'bold');
  log('='.repeat(80), 'cyan');
  log('\nUso:', 'yellow');
  log('  node desbloquear-usuario.js <username>     Desbloquear usuario específico');
  log('  node desbloquear-usuario.js --all          Desbloquear todos los usuarios');
  log('  node desbloquear-usuario.js --list         Listar usuarios bloqueados');
  log('  node desbloquear-usuario.js --clean        Limpiar bloqueos expirados');
  log('  node desbloquear-usuario.js --help         Mostrar esta ayuda');

  log('\nEjemplos:', 'yellow');
  log('  node desbloquear-usuario.js admin');
  log('  node desbloquear-usuario.js --all');
  log('  node desbloquear-usuario.js --list');

  log('\nDescripción:', 'yellow');
  log('  Los usuarios se bloquean automáticamente después de 5 intentos fallidos.');
  log('  El bloqueo dura 15 minutos por defecto.');
  log('  Esta herramienta permite desbloquearlos manualmente.\n');
  log('='.repeat(80), 'cyan');
  log('');
}

// Función principal
function main() {
  const args = process.argv.slice(2);

  // Sin argumentos o --help
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  // Encontrar la base de datos
  const dbPath = findDatabase();
  if (!dbPath) {
    logError('No se encontró la base de datos.');
    logInfo('Rutas buscadas:');
    log('  - backend/data/gestor_tienda.db');
    log('  - backend/data/mecanica.db');
    log('  - data/gestor_tienda.db');
    process.exit(1);
  }

  logInfo(`Base de datos: ${dbPath}\n`);

  let db;
  try {
    db = new Database(dbPath);

    // Verificar que la tabla usuarios existe
    const tableExists = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='usuarios'
    `
      )
      .get();

    if (!tableExists) {
      logError('La tabla "usuarios" no existe en la base de datos.');
      process.exit(1);
    }

    const command = args[0].toLowerCase();

    switch (command) {
      case '--list':
      case '-l':
        listBloqueados(db);
        break;

      case '--all':
      case '-a':
        log('');
        logWarning('¿Estás seguro de desbloquear TODOS los usuarios bloqueados?');
        log('Presiona Ctrl+C para cancelar o Enter para continuar...');
        process.stdin.once('data', () => {
          desbloquearTodos(db);
          limpiarBloqueosExpirados(db);
          process.exit(0);
        });
        break;

      case '--clean':
      case '-c':
        log('');
        limpiarBloqueosExpirados(db);
        listBloqueados(db);
        process.exit(0);
        break;

      default:
        // Desbloquear usuario específico
        const username = args[0];
        log('');
        const success = desbloquearUsuario(db, username);
        if (success) {
          limpiarBloqueosExpirados(db);
        }
        log('');
        process.exit(success ? 0 : 1);
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
    }
  }
}

// Ejecutar
if (require.main === module) {
  main();
}

module.exports = {
  desbloquearUsuario,
  desbloquearTodos,
  listBloqueados,
  limpiarBloqueosExpirados,
};
