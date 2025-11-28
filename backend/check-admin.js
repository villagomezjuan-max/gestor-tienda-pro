const path = require('path');

const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data', 'gestor_tienda.db');
const db = new Database(dbPath);

console.log('📂 Consultando base de datos:', dbPath);
console.log('');

// Primero verificar qué columnas existen
console.log('📋 ESTRUCTURA DE LA TABLA USUARIOS:');
const columns = db.prepare('PRAGMA table_info(usuarios)').all();
columns.forEach((col) => {
  console.log(`  - ${col.name} (${col.type})`);
});
console.log('');

// Consultar usuarios con las columnas que sabemos que existen
const users = db.prepare('SELECT id, username, nombre, rol, activo, password FROM usuarios').all();

console.log('👥 USUARIOS EN LA BASE DE DATOS:');
console.log('='.repeat(80));

users.forEach((user) => {
  console.log(`ID: ${user.id}`);
  console.log(`Username: ${user.username}`);
  console.log(`Nombre: ${user.nombre || 'N/A'}`);
  console.log(`Rol: ${user.rol}`);
  console.log(`Activo: ${user.activo ? 'Sí' : 'No'}`);
  console.log(`Password (hash): ${user.password.substring(0, 20)}...`);
  console.log('-'.repeat(80));
});

console.log('');
console.log('💡 NOTA: Las contraseñas están hasheadas con bcrypt.');
console.log('💡 Para probar login, usa las credenciales correctas configuradas en el sistema.');
console.log('');
console.log('⚠️  COLUMNAS DE SEGURIDAD FALTANTES:');
if (!columns.find((c) => c.name === 'debe_cambiar_password')) {
  console.log('  ❌ debe_cambiar_password - NO EXISTE');
}
if (!columns.find((c) => c.name === 'intentos_fallidos')) {
  console.log('  ❌ intentos_fallidos - NO EXISTE');
}
if (!columns.find((c) => c.name === 'bloqueado_hasta')) {
  console.log('  ❌ bloqueado_hasta - NO EXISTE');
}

db.close();
