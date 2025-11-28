#!/usr/bin/env node

/**
 * Script para ver y verificar credenciales del usuario admin
 */

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

try {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 INFORMACIÓN DE CREDENCIALES - USUARIO ADMIN');
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
    SELECT 
      id,
      username,
      nombre,
      email,
      rol,
      activo,
      intentos_fallidos,
      bloqueado_hasta,
      debe_cambiar_password,
      negocio_principal,
      ultimo_acceso,
      created_at
    FROM usuarios
    WHERE LOWER(username) = 'admin'
  `
    )
    .get();

  if (!admin) {
    console.log('❌ No existe el usuario "admin" en la base de datos.\n');

    // Listar todos los usuarios disponibles
    const allUsers = db
      .prepare(
        `
      SELECT username, nombre, rol, activo
      FROM usuarios
      ORDER BY created_at
    `
      )
      .all();

    if (allUsers.length > 0) {
      console.log('📋 Usuarios disponibles en el sistema:\n');
      allUsers.forEach((user, i) => {
        const status = user.activo ? '✅' : '❌';
        console.log(
          `   ${i + 1}. ${status} ${user.username} (${user.nombre || 'Sin nombre'}) - Rol: ${user.rol}`
        );
      });
      console.log('');
    }

    db.close();
    process.exit(1);
  }

  console.log('📌 INFORMACIÓN DEL USUARIO ADMIN:\n');
  console.log(`   Username:              admin`);
  console.log(`   Nombre:                ${admin.nombre || 'N/A'}`);
  console.log(`   Email:                 ${admin.email || 'N/A'}`);
  console.log(`   Rol:                   ${admin.rol}`);
  console.log(`   Activo:                ${admin.activo ? '✅ SÍ' : '❌ NO'}`);
  console.log(`   Negocio Principal:     ${admin.negocio_principal || 'mecanica'}`);
  console.log(`   Debe cambiar password: ${admin.debe_cambiar_password ? 'SÍ' : 'NO'}`);
  console.log(`   Intentos fallidos:     ${admin.intentos_fallidos || 0}`);
  console.log(`   Bloqueado hasta:       ${admin.bloqueado_hasta || 'No bloqueado'}`);
  console.log(`   Último acceso:         ${admin.ultimo_acceso || 'Nunca'}`);
  console.log(`   Creado en:             ${admin.created_at}`);
  console.log('');

  // Verificar estado de bloqueo
  if (admin.bloqueado_hasta) {
    const bloqueadoHasta = new Date(admin.bloqueado_hasta);
    const ahora = new Date();

    if (bloqueadoHasta > ahora) {
      const minutosRestantes = Math.ceil((bloqueadoHasta - ahora) / 60000);
      console.log(`⚠️  CUENTA BLOQUEADA - Tiempo restante: ${minutosRestantes} minutos\n`);
    } else {
      console.log('ℹ️  El bloqueo ha expirado (puede limpiarse)\n');
    }
  }

  // Verificar si está activo
  if (!admin.activo) {
    console.log('❌ PROBLEMA: La cuenta está INACTIVA\n');
    console.log('   Solución: Ejecuta el script para activar la cuenta\n');
  }

  // Verificar contraseña
  console.log('='.repeat(70));
  console.log('🔐 VERIFICACIÓN DE CONTRASEÑA\n');

  const passwordHash = db
    .prepare('SELECT password FROM usuarios WHERE id = ?')
    .get(admin.id).password;

  console.log('Hash de contraseña presente: ' + (passwordHash ? 'SÍ' : 'NO'));
  console.log('');

  if (!passwordHash || passwordHash.length < 20) {
    console.log('❌ PROBLEMA: Hash de contraseña inválido o vacío\n');
  }

  // Verificar contraseñas comunes de forma síncrona
  console.log('Verificando contraseñas comunes contra el hash...');
  console.log('');

  const commonPasswords = ['admin', 'admin123', 'Admin123', 'password', '12345678', 'Gestor123'];

  (async () => {
    let foundPassword = null;

    for (const testPassword of commonPasswords) {
      try {
        const match = await bcrypt.compare(testPassword, passwordHash);
        if (match) {
          foundPassword = testPassword;
          break;
        }
      } catch (error) {
        // Hash inválido o error
      }
    }

    if (foundPassword) {
      console.log(`✅ CONTRASEÑA ENCONTRADA: "${foundPassword}"\n`);
      console.log('   Puedes iniciar sesión con:');
      console.log(`   Usuario:    admin`);
      console.log(`   Contraseña: ${foundPassword}\n`);
    } else {
      console.log('❌ No se pudo verificar la contraseña contra las comunes.\n');
      console.log('   Posibles causas:');
      console.log('   1. La contraseña fue cambiada manualmente');
      console.log('   2. El hash está corrupto');
      console.log('   3. La contraseña no es ninguna de las comunes\n');
      console.log('💡 SOLUCIÓN: Resetear la contraseña a "admin123"\n');
      console.log('   Ejecuta: node resetear-password-admin.js\n');
    }

    console.log('='.repeat(70));
    console.log('✅ Análisis completado');
    console.log('='.repeat(70) + '\n');
  })();

  // Verificar asignación a negocios
  console.log('='.repeat(70));
  console.log('🏢 NEGOCIOS ASIGNADOS\n');

  const negocios = db
    .prepare(
      `
    SELECT n.id, n.nombre, n.tipo, n.estado, un.es_principal
    FROM usuarios_negocios un
    JOIN negocios n ON n.id = un.negocio_id
    WHERE un.usuario_id = ?
    ORDER BY un.es_principal DESC, n.id
  `
    )
    .all(admin.id);

  if (negocios.length > 0) {
    negocios.forEach((neg, i) => {
      const principal = neg.es_principal ? '⭐ PRINCIPAL' : '';
      const estado = neg.estado === 'activo' ? '✅' : '❌';
      console.log(`   ${i + 1}. ${estado} ${neg.nombre} (${neg.id}) ${principal}`);
      console.log(`      Tipo: ${neg.tipo}, Estado: ${neg.estado}`);
    });
    console.log('');
  } else {
    console.log('   ⚠️  No tiene negocios asignados explícitamente.');
    console.log(`   Usará negocio_principal: ${admin.negocio_principal || 'mecanica'}\n`);
  }

  // db.close() se llamará después de la verificación async
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
