#!/usr/bin/env node

/**
 * SOLUCIONADOR COMPLETO DE BLOQUEOS
 * - Desbloquea usuarios en la base de datos
 * - Reinicia el servidor para limpiar rate limiters
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');


console.log('\n' + '='.repeat(70));
console.log('🔓 SOLUCIONADOR COMPLETO DE BLOQUEOS');
console.log('='.repeat(70) + '\n');

// Paso 1: Desbloquear en la base de datos
console.log('📝 Paso 1: Desbloqueando usuarios en la base de datos...\n');

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

  const db = new Database(dbPath);

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

  db.close();

  if (result.changes > 0) {
    console.log(`✅ ${result.changes} usuario(s) desbloqueado(s) en la base de datos.\n`);
  } else {
    console.log('ℹ️  No había usuarios bloqueados en la base de datos.\n');
  }
} catch (error) {
  console.error('❌ Error al desbloquear:', error.message);
}

// Paso 2: Reiniciar el servidor
console.log('📝 Paso 2: Reiniciando servidor para limpiar rate limiters...\n');

// Detectar procesos Node.js
exec('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', (error, stdout, stderr) => {
  if (error) {
    console.warn('⚠️  No se pudo listar procesos Node.js');
    console.log('\n📌 ACCIÓN MANUAL REQUERIDA:');
    console.log('   1. Cierra la ventana del servidor Node.js');
    console.log('   2. Vuelve a ejecutar: npm run start');
    console.log('   3. Recarga la página del login (F5 o Ctrl+R)');
    console.log('   4. Intenta iniciar sesión nuevamente\n');
    return;
  }

  const nodeProcesses = stdout.split('\n').filter((line) => line.includes('node.exe'));

  if (nodeProcesses.length === 0) {
    console.log('ℹ️  No hay procesos Node.js ejecutándose.');
    console.log('\n📌 Para aplicar los cambios:');
    console.log('   1. Inicia el servidor: cd backend && npm run start');
    console.log('   2. Recarga la página del login (F5)');
    console.log('   3. Intenta iniciar sesión\n');
    return;
  }

  console.log(`🔍 Encontrados ${nodeProcesses.length} proceso(s) Node.js`);
  console.log('\n⚠️  ATENCIÓN: Para que los cambios tengan efecto, necesitas:');
  console.log('\n   OPCIÓN 1 (Recomendada):');
  console.log('   1. Detén el servidor (Ctrl+C en la ventana del servidor)');
  console.log('   2. Vuelve a iniciar: npm run start');
  console.log('   3. Recarga la página del login (F5)');
  console.log('   4. Intenta iniciar sesión\n');

  console.log('   OPCIÓN 2 (Más rápida):');
  console.log('   1. Abre el login en ventana de incógnito (Ctrl+Shift+N)');
  console.log('   2. Intenta iniciar sesión desde ahí\n');

  console.log('   OPCIÓN 3 (Limpia la caché):');
  console.log('   1. En el navegador presiona F12');
  console.log('   2. Click derecho en el botón de recargar');
  console.log('   3. Selecciona "Vaciar caché y volver a cargar"');
  console.log('   4. Intenta iniciar sesión\n');

  console.log('='.repeat(70));
  console.log('✅ Desbloqueo completado en la base de datos');
  console.log('⚠️  Sigue las instrucciones de arriba para aplicar cambios');
  console.log('='.repeat(70) + '\n');
});
