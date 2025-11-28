#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
console.log('🔍 INFORMACIÓN DE USUARIO ADMIN');
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
    id, username, nombre, email, rol, activo,
    intentos_fallidos, bloqueado_hasta, debe_cambiar_password,
    negocio_principal, ultimo_acceso, created_at, password
  FROM usuarios
  WHERE LOWER(username) = 'admin'
`
  )
  .get();

if (!admin) {
  console.log('❌ No existe el usuario "admin"\n');

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
    console.log('📋 Usuarios disponibles:\n');
    allUsers.forEach((user, i) => {
      const status = user.activo ? '✅' : '❌';
      console.log(
        `   ${i + 1}. ${status} ${user.username} (${user.nombre || 'Sin nombre'}) - ${user.rol}`
      );
    });
    console.log('');
  }

  db.close();
  process.exit(1);
}

console.log('📌 INFORMACIÓN BÁSICA:\n');
console.log(`   Username:              admin`);
console.log(`   Nombre:                ${admin.nombre || 'N/A'}`);
console.log(`   Email:                 ${admin.email || 'N/A'}`);
console.log(`   Rol:                   ${admin.rol}`);
console.log(`   Activo:                ${admin.activo ? '✅ SÍ' : '❌ NO'}`);
console.log(`   Negocio Principal:     ${admin.negocio_principal || 'mecanica'}`);
console.log(`   Debe cambiar password: ${admin.debe_cambiar_password ? 'SÍ' : 'NO'}`);
console.log(`   Intentos fallidos:     ${admin.intentos_fallidos || 0}`);
console.log(`   Bloqueado hasta:       ${admin.bloqueado_hasta || 'No'}`);
console.log(`   Último acceso:         ${admin.ultimo_acceso || 'Nunca'}`);
console.log('');

// Verificar bloqueos
if (admin.bloqueado_hasta) {
  const bloqueadoHasta = new Date(admin.bloqueado_hasta);
  const ahora = new Date();

  if (bloqueadoHasta > ahora) {
    const minutosRestantes = Math.ceil((bloqueadoHasta - ahora) / 60000);
    console.log(`⚠️  BLOQUEADO - Tiempo restante: ${minutosRestantes} minutos\n`);
  }
}

if (!admin.activo) {
  console.log('❌ PROBLEMA: Cuenta INACTIVA\n');
}

// Hash info
console.log('🔐 INFORMACIÓN DE CONTRASEÑA:\n');
console.log(`   Hash presente: ${admin.password ? 'SÍ' : 'NO'}`);
console.log(`   Longitud hash: ${admin.password ? admin.password.length : 0} caracteres`);
console.log('');

// Contraseñas predeterminadas comunes
console.log('💡 CONTRASEÑAS PREDETERMINADAS COMUNES:\n');
console.log('   Las contraseñas predeterminadas más comunes son:');
console.log('   - admin');
console.log('   - admin123');
console.log('   - Admin123');
console.log('   - password');
console.log('   - 12345678');
console.log('');
console.log('   Para verificar/resetear la contraseña, ejecuta:');
console.log('   node resetear-password-admin.js');
console.log('');

// Negocios asignados
console.log('🏢 NEGOCIOS ASIGNADOS:\n');

try {
  const negocios = db
    .prepare(
      `
    SELECT n.id, n.nombre, n.tipo, n.estado
    FROM usuarios_negocios un
    JOIN negocios n ON n.id = un.negocio_id
    WHERE un.usuario_id = ?
    ORDER BY n.id
  `
    )
    .all(admin.id);

  if (negocios.length > 0) {
    negocios.forEach((neg, i) => {
      const estado = neg.estado === 'activo' ? '✅' : '❌';
      console.log(`   ${i + 1}. ${estado} ${neg.nombre} (${neg.id})`);
    });
    console.log('');
  } else {
    console.log(`   Usa negocio_principal: ${admin.negocio_principal || 'mecanica'}\n`);
  }
} catch (error) {
  console.log(`   Usa negocio_principal: ${admin.negocio_principal || 'mecanica'}\n`);
}

db.close();

console.log('='.repeat(70));
console.log('');
console.log('🎯 RESUMEN:');
console.log('');

if (!admin.activo) {
  console.log('❌ PROBLEMA: Usuario inactivo - Necesita activarse');
} else if (admin.bloqueado_hasta && new Date(admin.bloqueado_hasta) > new Date()) {
  console.log('❌ PROBLEMA: Usuario bloqueado - Ejecuta: DESBLOQUEAR-AHORA.bat');
} else {
  console.log('✅ Usuario activo y desbloqueado');
  console.log('');
  console.log('Si no puedes ingresar:');
  console.log('1. Intenta las contraseñas comunes listadas arriba');
  console.log('2. O resetea la contraseña: node resetear-password-admin.js');
}

console.log('');
console.log('='.repeat(70) + '\n');
