/**
 * Script de verificación de implementación multi-tenant
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

console.log('🔍 VERIFICACIÓN DE INTEGRACIÓN MULTI-TENANT\n');

// Verificar base de datos
const dbPath = path.join(__dirname, '..', 'data', 'gestor_tienda.db');
console.log('1. Verificando base de datos...');
console.log(`   Ruta: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  console.error('   ❌ Base de datos no encontrada');
  process.exit(1);
}

const db = new Database(dbPath);

// Verificar tablas multi-tenant
console.log('\n2. Verificando tablas multi-tenant...');
const tables = db
  .prepare(
    `
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  AND name IN ('negocios', 'usuarios_negocios', 'auditoria_negocios', 'planes_subscripcion')
  ORDER BY name
`
  )
  .all();

console.log(`   Tablas encontradas: ${tables.length}/4`);
tables.forEach((t) => console.log(`   ✅ ${t.name}`));

if (tables.length < 4) {
  console.error(
    '\n   ❌ Faltan tablas multi-tenant. Ejecuta: node scripts/migrate-multi-tenant.js'
  );
  process.exit(1);
}

// Verificar columnas en usuarios
console.log('\n3. Verificando columnas en tabla usuarios...');
const userColumns = db.prepare("PRAGMA table_info('usuarios')").all();
const hasNegocioPrincipal = userColumns.some((c) => c.name === 'negocio_principal');
const hasNegocios = userColumns.some((c) => c.name === 'negocios');

console.log(`   ${hasNegocioPrincipal ? '✅' : '❌'} negocio_principal`);
console.log(`   ${hasNegocios ? '✅' : '❌'} negocios`);

// Verificar negocios registrados
console.log('\n4. Verificando negocios registrados...');
const negocios = db.prepare('SELECT id, nombre, tipo, estado, plan FROM negocios').all();
console.log(`   Negocios encontrados: ${negocios.length}`);

if (negocios.length === 0) {
  console.warn('   ⚠️  No hay negocios registrados');
} else {
  negocios.forEach((n) => {
    console.log(`   🏢 ${n.id} - ${n.nombre} (${n.tipo}, ${n.estado}, plan: ${n.plan})`);
  });
}

// Verificar planes
console.log('\n5. Verificando planes de suscripción...');
const planes = db
  .prepare('SELECT id, nombre, precio_mensual, usuarios_max FROM planes_subscripcion')
  .all();
console.log(`   Planes encontrados: ${planes.length}`);
planes.forEach((p) => {
  console.log(
    `   💳 ${p.id} - ${p.nombre} ($${p.precio_mensual}/mes, ${p.usuarios_max} usuarios max)`
  );
});

// Verificar asignaciones usuario-negocio
console.log('\n6. Verificando asignaciones usuario-negocio...');
const asignaciones = db
  .prepare(
    `
  SELECT 
    u.username,
    un.negocio_id,
    un.rol_en_negocio,
    un.es_negocio_principal
  FROM usuarios u
  JOIN usuarios_negocios un ON un.usuario_id = u.id
`
  )
  .all();

console.log(`   Asignaciones encontradas: ${asignaciones.length}`);
if (asignaciones.length === 0) {
  console.warn('   ⚠️  No hay usuarios asignados a negocios');
} else {
  asignaciones.forEach((a) => {
    const principal = a.es_negocio_principal ? '(Principal)' : '';
    console.log(`   👤 ${a.username} → ${a.negocio_id} (${a.rol_en_negocio}) ${principal}`);
  });
}

// Verificar usuarios sin negocio
const usuariosSinNegocio = db
  .prepare(
    `
  SELECT username FROM usuarios 
  WHERE id NOT IN (SELECT usuario_id FROM usuarios_negocios)
`
  )
  .all();

if (usuariosSinNegocio.length > 0) {
  console.warn(`\n   ⚠️  Usuarios sin negocio asignado: ${usuariosSinNegocio.length}`);
  usuariosSinNegocio.forEach((u) => console.warn(`      - ${u.username}`));
}

// Verificar archivos del backend
console.log('\n7. Verificando archivos del backend...');
const files = [
  'middleware/tenant.js',
  'utils/negocios.js',
  'migrations/001_add_multi_tenant_support.sql',
  'scripts/migrate-multi-tenant.js',
];

files.forEach((file) => {
  const filePath = path.join(__dirname, '..', file);
  const exists = fs.existsSync(filePath);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

// Verificar imports en server.js
console.log('\n8. Verificando imports en server.js...');
const serverPath = path.join(__dirname, '..', 'server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');

const checks = [
  { name: 'validateTenantAccess', pattern: /validateTenantAccess/ },
  { name: 'isolateFilesByTenant', pattern: /isolateFilesByTenant/ },
  { name: "require('./middleware/tenant')", pattern: /require\(['"]\.\/middleware\/tenant['"]\)/ },
];

checks.forEach((check) => {
  const found = check.pattern.test(serverContent);
  console.log(`   ${found ? '✅' : '❌'} ${check.name}`);
});

// Verificar rutas protegidas
console.log('\n9. Verificando rutas protegidas con validateTenantAccess...');
const protectedRoutes = [
  "app.get('/api/clientes'",
  "app.get('/api/clientes/buscar'",
  "app.get('/api/clientes/:id'",
  "app.post('/api/clientes'",
  "app.put('/api/clientes/:id'",
  "app.delete('/api/clientes/:id'",
];

let protectedCount = 0;
protectedRoutes.forEach((route) => {
  // Buscar la ruta y verificar que tenga validateTenantAccess
  const routeRegex = new RegExp(route.replace(/[()]/g, '\\$&') + '[^{]*validateTenantAccess', 's');
  const isProtected = routeRegex.test(serverContent);

  if (isProtected) {
    protectedCount++;
    console.log(`   ✅ ${route}`);
  } else {
    console.log(`   ⚠️  ${route} (sin validateTenantAccess)`);
  }
});

console.log(`   ${protectedCount}/${protectedRoutes.length} rutas protegidas`);

db.close();

// Resumen final
console.log('\n' + '='.repeat(60));
console.log('RESUMEN DE VERIFICACIÓN');
console.log('='.repeat(60));

const allGood =
  tables.length === 4 &&
  hasNegocioPrincipal &&
  hasNegocios &&
  negocios.length > 0 &&
  planes.length > 0 &&
  asignaciones.length > 0 &&
  usuariosSinNegocio.length === 0 &&
  protectedCount >= 4;

if (allGood) {
  console.log('✅ IMPLEMENTACIÓN MULTI-TENANT COMPLETADA CORRECTAMENTE\n');
  console.log('Próximos pasos:');
  console.log('  1. Reiniciar servidor: npm start');
  console.log('  2. Actualizar frontend para enviar header X-Negocio-Id');
  console.log('  3. Probar login y acceso a datos\n');
} else {
  console.log('⚠️  HAY PROBLEMAS EN LA IMPLEMENTACIÓN\n');

  if (tables.length < 4) {
    console.log('  ❌ Faltan tablas multi-tenant');
  }
  if (!hasNegocioPrincipal || !hasNegocios) {
    console.log('  ❌ Faltan columnas en tabla usuarios');
  }
  if (negocios.length === 0) {
    console.log('  ❌ No hay negocios registrados');
  }
  if (planes.length === 0) {
    console.log('  ❌ No hay planes registrados');
  }
  if (usuariosSinNegocio.length > 0) {
    console.log(`  ⚠️  Hay ${usuariosSinNegocio.length} usuarios sin negocio asignado`);
  }
  if (protectedCount < 4) {
    console.log(`  ⚠️  Solo ${protectedCount} rutas están protegidas con validateTenantAccess`);
  }

  console.log('\n  Revisa los pasos anteriores y corrige los problemas.\n');
  process.exit(1);
}
