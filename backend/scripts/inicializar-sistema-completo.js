const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config_negocios.json');
const MASTER_DB_PATH = path.join(DATA_DIR, 'gestor_tienda.db');
const SUPER_ADMIN_DB_PATH = path.join(DATA_DIR, 'super_admin.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.sql');

console.log('🔧 INICIALIZACIÓN COMPLETA DEL SISTEMA');
console.log('=====================================\n');

// ===== PASO 1: Crear config_negocios.json =====
console.log('📝 PASO 1: Creando config_negocios.json...');
const configNegocios = {
  negocio_actual: 'super_admin',
  negocios: [
    {
      id: 'super_admin',
      nombre: 'SUPER_ADMIN',
      db_file: 'super_admin.db',
      tipo: 'mecanica',
      plan: 'enterprise',
      icono: 'fas fa-hammer',
      descripcion: 'Taller Mecánico Automotriz',
      activo: true,
      creado_en: new Date().toISOString(),
      modulos: [
        'productos',
        'clientes',
        'vehiculos',
        'proveedores',
        'compras',
        'ventas',
        'inventario',
        'ordenes_trabajo',
        'citas',
        'facturacion',
        'reportes',
        'usuarios',
        'contabilidad',
        'marketing',
        'estadisticas',
        'configuracion',
        'backup',
        'auditoria',
        'chat_ia',
      ],
    },
    {
      id: 'mecanica',
      nombre: 'Mecánica General',
      db_file: 'mecanica.db',
      tipo: 'mecanica',
      plan: 'pro',
      icono: 'fas fa-wrench',
      descripcion: 'Taller mecánico general',
      activo: true,
      creado_en: new Date().toISOString(),
      modulos: ['productos', 'clientes', 'vehiculos', 'ventas'],
    },
  ],
};

fs.writeFileSync(CONFIG_FILE, JSON.stringify(configNegocios, null, 2));
console.log('✅ config_negocios.json creado\n');

// ===== PASO 2: Crear base de datos maestra =====
console.log('📝 PASO 2: Inicializando base de datos maestra (gestor_tienda.db)...');

// Eliminar BD maestra si existe
if (fs.existsSync(MASTER_DB_PATH)) {
  fs.unlinkSync(MASTER_DB_PATH);
  console.log('🗑️  Base de datos maestra anterior eliminada');
}

const masterDb = new Database(MASTER_DB_PATH);
masterDb.pragma('foreign_keys = ON');

// Crear tablas maestras
masterDb.exec(`
  -- Tabla de usuarios (maestra)
  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nombre TEXT,
    email TEXT UNIQUE,
    rol TEXT DEFAULT 'vendedor',
    activo INTEGER DEFAULT 1,
    negocios TEXT DEFAULT '[]',
    negocio_principal TEXT,
    ultimo_acceso DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabla de negocios
  CREATE TABLE IF NOT EXISTS negocios (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT DEFAULT 'general',
    estado TEXT DEFAULT 'activo',
    plan TEXT DEFAULT 'gratis',
    usuarios_max INTEGER DEFAULT 1,
    productos_max INTEGER DEFAULT 100,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    icono TEXT DEFAULT 'fas fa-store',
    descripcion TEXT DEFAULT '',
    modulos TEXT DEFAULT '[]'
  );

  -- Tabla de relación usuarios-negocios
  CREATE TABLE IF NOT EXISTS usuarios_negocios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id TEXT NOT NULL,
    negocio_id TEXT NOT NULL,
    rol TEXT DEFAULT 'vendedor',
    rol_en_negocio TEXT DEFAULT 'vendedor',
    es_negocio_principal INTEGER DEFAULT 0,
    fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (negocio_id) REFERENCES negocios(id),
    UNIQUE(usuario_id, negocio_id)
  );

  -- Tabla de auditoría de negocios
  CREATE TABLE IF NOT EXISTS auditoria_negocios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id TEXT,
    negocio_id TEXT,
    accion TEXT NOT NULL,
    detalles TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabla de sesiones
  CREATE TABLE IF NOT EXISTS sesiones (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );
`);

console.log('✅ Tablas maestras creadas');

// Insertar negocio TALLER.SA
masterDb
  .prepare(
    `
  INSERT OR REPLACE INTO negocios (
    id, nombre, tipo, estado, plan, usuarios_max, productos_max,
    icono, descripcion, modulos, fecha_creacion, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`
  )
  .run(
    'super_admin',
    'SUPER_ADMIN',
    'mecanica',
    'activo',
    'enterprise',
    999,
    999999,
    'fas fa-hammer',
    'Taller Mecánico Automotriz',
    JSON.stringify(configNegocios.negocios[0].modulos),
    new Date().toISOString(),
    new Date().toISOString()
  );

masterDb
  .prepare(
    `
  INSERT OR REPLACE INTO negocios (
    id, nombre, tipo, estado, plan, usuarios_max, productos_max,
    icono, descripcion, modulos, fecha_creacion, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`
  )
  .run(
    'mecanica',
    'Mecánica General',
    'mecanica',
    'activo',
    'pro',
    5,
    5000,
    'fas fa-wrench',
    'Taller mecánico general',
    JSON.stringify(['productos', 'clientes', 'vehiculos', 'ventas']),
    new Date().toISOString(),
    new Date().toISOString()
  );

console.log('✅ Negocios registrados en BD maestra');

// Crear usuario admin
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const adminId = 'admin_001';
const adminPassword = hashPassword('Admin123!');

masterDb
  .prepare(
    `
  INSERT OR REPLACE INTO usuarios (
    id, username, password, nombre, email, rol, activo,
    negocios, negocio_principal, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`
  )
  .run(
    adminId,
    'admin',
    adminPassword,
    'Administrador',
    'admin@tallersa.com',
    'SUPER_ADMIN',
    1,
    JSON.stringify(['super_admin', 'mecanica']),
    'super_admin',
    new Date().toISOString()
  );

console.log('✅ Usuario admin creado (usuario: admin, password: Admin123!)');

// Asignar admin a super_admin
masterDb
  .prepare(
    `
  INSERT OR REPLACE INTO usuarios_negocios (usuario_id, negocio_id, rol, rol_en_negocio, es_negocio_principal, fecha_asignacion)
  VALUES (?, ?, ?, ?, ?, ?)
`
  )
  .run(adminId, 'super_admin', 'SUPER_ADMIN', 'SUPER_ADMIN', 1, new Date().toISOString());

masterDb
  .prepare(
    `
  INSERT OR REPLACE INTO usuarios_negocios (usuario_id, negocio_id, rol, rol_en_negocio, es_negocio_principal, fecha_asignacion)
  VALUES (?, ?, ?, ?, ?, ?)
`
  )
  .run(adminId, 'mecanica', 'SUPER_ADMIN', 'SUPER_ADMIN', 0, new Date().toISOString());

console.log('✅ Admin asignado a super_admin y mecanica\n');

masterDb.close();

// ===== PASO 3: Inicializar base de datos super_admin =====
console.log('📝 PASO 3: Inicializando base de datos super_admin.db...');

// Eliminar BD si existe
if (fs.existsSync(SUPER_ADMIN_DB_PATH)) {
  fs.unlinkSync(SUPER_ADMIN_DB_PATH);
  console.log('🗑️  Base de datos super_admin anterior eliminada');
}

if (!fs.existsSync(SCHEMA_PATH)) {
  console.error('❌ ERROR: schema.sql no encontrado en:', SCHEMA_PATH);
  process.exit(1);
}

const superAdminDb = new Database(SUPER_ADMIN_DB_PATH);
superAdminDb.pragma('foreign_keys = ON');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
superAdminDb.exec(schema);

console.log('✅ Base de datos super_admin.db creada con todas las tablas');

// Verificar tablas creadas
const tables = superAdminDb
  .prepare(
    `
  SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
`
  )
  .all();

console.log(`✅ ${tables.length} tablas creadas:`, tables.map((t) => t.name).join(', '));

superAdminDb.close();

console.log('\n=====================================');
console.log('✅ SISTEMA INICIALIZADO CORRECTAMENTE');
console.log('=====================================\n');
console.log('📌 Próximos pasos:');
console.log('1. Ejecutar: node scripts\\seed-taller-sa.js (para poblar super_admin)');
console.log('2. Iniciar servidor: npm run start');
console.log('3. Login: usuario=admin, password=Admin123!');
console.log('\n✅ Configuración:');
console.log('  - Negocio activo: super_admin');
console.log('  - Base de datos: super_admin.db');
console.log('  - Usuario: admin (super_admin)');
