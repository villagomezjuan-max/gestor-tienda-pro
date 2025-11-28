/**
 * Script para ejecutar migraciones de base de datos
 * Aplica el soporte multi-tenant a la base de datos existente
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

// Configuración
const DATA_DIR = path.join(__dirname, '..', 'data');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const DB_PATH = path.join(DATA_DIR, 'gestor_tienda.db');

// Asegurar que exista el directorio de datos
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log('🔧 Iniciando migración multi-tenant...');
console.log(`📂 Base de datos: ${DB_PATH}`);

// Conectar a la base de datos
const db = new Database(DB_PATH);
db.pragma('foreign_keys = OFF'); // Desactivar temporalmente para la migración

try {
  // Leer archivo de migración
  const migrationFile = path.join(MIGRATIONS_DIR, '001_add_multi_tenant_support.sql');

  if (!fs.existsSync(migrationFile)) {
    throw new Error(`Archivo de migración no encontrado: ${migrationFile}`);
  }

  console.log('📄 Leyendo archivo de migración...');
  const migrationSQL = fs.readFileSync(migrationFile, 'utf8');

  console.log('📝 Ejecutando migración en pasos ordenados...');

  // Ejecutar en transacción con pasos ordenados
  db.transaction(() => {
    console.log('\n📦 PASO 1: Crear tablas principales...');

    // 1. Crear tabla negocios
    db.exec(`
      CREATE TABLE IF NOT EXISTS negocios (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL,
        ruc TEXT,
        razon_social TEXT,
        direccion TEXT,
        telefono TEXT,
        email TEXT,
        estado TEXT DEFAULT 'activo',
        plan TEXT DEFAULT 'basico',
        usuarios_max INTEGER DEFAULT 3,
        productos_max INTEGER DEFAULT 500,
        fecha_creacion TEXT DEFAULT (datetime('now')),
        fecha_expiracion TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
    console.log('  ✅ Tabla negocios creada');

    // 2. Crear tabla usuarios_negocios
    db.exec(`
      CREATE TABLE IF NOT EXISTS usuarios_negocios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id TEXT NOT NULL,
        negocio_id TEXT NOT NULL,
        rol_en_negocio TEXT DEFAULT 'user',
        es_negocio_principal INTEGER DEFAULT 0,
        fecha_asignacion TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE,
        UNIQUE(usuario_id, negocio_id)
      );
    `);
    console.log('  ✅ Tabla usuarios_negocios creada');

    // 3. Crear tabla auditoria_negocios
    db.exec(`
      CREATE TABLE IF NOT EXISTS auditoria_negocios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id TEXT NOT NULL,
        negocio_id TEXT NOT NULL,
        accion TEXT NOT NULL,
        detalles TEXT,
        ip TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE
      );
    `);
    console.log('  ✅ Tabla auditoria_negocios creada');

    // Asegurar columnas nuevas en auditoria_negocios (para bases existentes)
    const auditoriaColumns = db.prepare("PRAGMA table_info('auditoria_negocios')").all();
    const auditoriaColumnNames = auditoriaColumns.map((col) => col.name);

    if (!auditoriaColumnNames.includes('created_at')) {
      db.exec('ALTER TABLE auditoria_negocios ADD COLUMN created_at TEXT');
      db.exec(
        "UPDATE auditoria_negocios SET created_at = datetime('now') WHERE created_at IS NULL"
      );
      console.log('  ✅ Columna created_at agregada a auditoria_negocios');
    }
    if (!auditoriaColumnNames.includes('ip')) {
      db.exec('ALTER TABLE auditoria_negocios ADD COLUMN ip TEXT');
      console.log('  ✅ Columna ip agregada a auditoria_negocios');
    }
    if (!auditoriaColumnNames.includes('user_agent')) {
      db.exec('ALTER TABLE auditoria_negocios ADD COLUMN user_agent TEXT');
      console.log('  ✅ Columna user_agent agregada a auditoria_negocios');
    }

    // 4. Crear tabla planes_subscripcion
    db.exec(`
      CREATE TABLE IF NOT EXISTS planes_subscripcion (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        precio_mensual REAL DEFAULT 0,
        usuarios_max INTEGER DEFAULT 3,
        productos_max INTEGER DEFAULT 500,
        ventas_max_mes INTEGER DEFAULT -1,
        storage_max_mb INTEGER DEFAULT 100,
        caracteristicas TEXT,
        activo INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
    console.log('  ✅ Tabla planes_subscripcion creada');

    console.log('\n📦 PASO 2: Crear índices...');

    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_usuarios_negocios_usuario ON usuarios_negocios(usuario_id)'
    );
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_usuarios_negocios_negocio ON usuarios_negocios(negocio_id)'
    );
    db.exec('CREATE INDEX IF NOT EXISTS idx_negocios_estado ON negocios(estado)');
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_auditoria_negocios_usuario ON auditoria_negocios(usuario_id)'
    );
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_auditoria_negocios_negocio ON auditoria_negocios(negocio_id)'
    );
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_auditoria_negocios_fecha ON auditoria_negocios(created_at)'
    );
    console.log('  ✅ Índices creados');

    console.log('\n📦 PASO 3: Agregar columnas a usuarios...');

    // Verificar si las columnas ya existen
    const userColumns = db.prepare("PRAGMA table_info('usuarios')").all();
    const hasNegocioPrincipal = userColumns.some((c) => c.name === 'negocio_principal');
    const hasNegocios = userColumns.some((c) => c.name === 'negocios');

    if (!hasNegocioPrincipal) {
      try {
        db.exec("ALTER TABLE usuarios ADD COLUMN negocio_principal TEXT DEFAULT 'mecanica'");
        console.log('  ✅ Columna negocio_principal agregada');
      } catch (error) {
        if (error.message.includes('duplicate column')) {
          console.log('  ⚠️  Columna negocio_principal ya existe');
        } else {
          throw error;
        }
      }
    } else {
      console.log('  ⚠️  Columna negocio_principal ya existe');
    }

    if (!hasNegocios) {
      try {
        db.exec('ALTER TABLE usuarios ADD COLUMN negocios TEXT DEFAULT \'["mecanica"]\'');
        console.log('  ✅ Columna negocios agregada');
      } catch (error) {
        if (error.message.includes('duplicate column')) {
          console.log('  ⚠️  Columna negocios ya existe');
        } else {
          throw error;
        }
      }
    } else {
      console.log('  ⚠️  Columna negocios ya existe');
    }

    console.log('\n📦 PASO 4: Insertar datos iniciales...');

    // Insertar planes por defecto
    db.exec(`
      INSERT OR IGNORE INTO planes_subscripcion (id, nombre, precio_mensual, usuarios_max, productos_max, storage_max_mb, caracteristicas) VALUES
      ('gratis', 'Plan Gratuito', 0, 1, 100, 50, '["1 usuario","100 productos","50MB almacenamiento","Soporte por email"]'),
      ('basico', 'Plan Básico', 25, 3, 500, 500, '["3 usuarios","500 productos","500MB almacenamiento","Soporte prioritario","Backups automáticos"]'),
      ('premium', 'Plan Premium', 50, 10, 5000, 5000, '["10 usuarios","5000 productos","5GB almacenamiento","Soporte 24/7","API acceso","Reportes avanzados","Multi-negocio"]')
    `);
    console.log('  ✅ Planes de suscripción insertados');

    // Crear negocio por defecto
    db.exec(`
      INSERT OR IGNORE INTO negocios (id, nombre, tipo, estado, plan) 
      VALUES ('mecanica', 'Mecánica Principal', 'mecanica', 'activo', 'premium')
    `);
    console.log('  ✅ Negocio por defecto creado');

    console.log('\n� PASO 5: Migrar usuarios existentes...');

    // Asignar todos los usuarios al negocio 'mecanica'
    db.exec(`
      INSERT OR IGNORE INTO usuarios_negocios (usuario_id, negocio_id, rol_en_negocio, es_negocio_principal)
      SELECT 
        id, 
        'mecanica', 
        CASE 
          WHEN rol = 'admin' THEN 'admin'
          WHEN rol = 'gerente' THEN 'gerente'
          ELSE 'user'
        END,
        1
      FROM usuarios
      WHERE id NOT IN (SELECT usuario_id FROM usuarios_negocios)
    `);
    console.log('  ✅ Usuarios asignados al negocio');

    // Actualizar columnas de usuarios
    db.exec(`
      UPDATE usuarios 
      SET 
        negocio_principal = 'mecanica',
        negocios = '["mecanica"]'
      WHERE negocio_principal IS NULL OR negocios IS NULL
    `);
    console.log('  ✅ Columnas de usuarios actualizadas');
  })();

  // Reactivar foreign keys
  db.pragma('foreign_keys = ON');

  // Verificar tablas creadas
  console.log('\n🔍 Verificando estructura creada...');

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

  console.log(`📋 Tablas multi-tenant encontradas: ${tables.map((t) => t.name).join(', ')}`);

  // Verificar datos iniciales
  const negociosCount = db.prepare('SELECT COUNT(*) as count FROM negocios').get().count;
  const planesCount = db.prepare('SELECT COUNT(*) as count FROM planes_subscripcion').get().count;
  const asignacionesCount = db
    .prepare('SELECT COUNT(*) as count FROM usuarios_negocios')
    .get().count;

  console.log('\n📈 Datos creados:');
  console.log(`  🏢 Negocios: ${negociosCount}`);
  console.log(`  💳 Planes: ${planesCount}`);
  console.log(`  👥 Asignaciones usuario-negocio: ${asignacionesCount}`);

  // Verificar columnas agregadas a usuarios
  const userColumns = db.prepare("PRAGMA table_info('usuarios')").all();
  const hasNegocioPrincipal = userColumns.some((c) => c.name === 'negocio_principal');
  const hasNegocios = userColumns.some((c) => c.name === 'negocios');

  console.log('\n📋 Columnas agregadas a tabla usuarios:');
  console.log(`  ${hasNegocioPrincipal ? '✅' : '❌'} negocio_principal`);
  console.log(`  ${hasNegocios ? '✅' : '❌'} negocios`);

  // Verificar usuarios sin negocio asignado
  const usuariosSinNegocio = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM usuarios 
    WHERE id NOT IN (SELECT usuario_id FROM usuarios_negocios)
  `
    )
    .get().count;

  if (usuariosSinNegocio > 0) {
    console.log(`\n⚠️  ADVERTENCIA: ${usuariosSinNegocio} usuarios sin negocio asignado`);
    console.log('   Ejecuta el script de asignación o asígnalos manualmente.');
  } else {
    console.log('\n✅ Todos los usuarios tienen negocio asignado');
  }

  console.log('\n✅ ¡Migración completada exitosamente!');
  console.log('\n📝 Próximos pasos:');
  console.log('   1. Reinicia el servidor backend');
  console.log('   2. Verifica que los endpoints con authenticate + validateTenantAccess funcionen');
  console.log('   3. Prueba login con diferentes usuarios');
  console.log('   4. Revisa los logs para detectar intentos de acceso no autorizado');
} catch (error) {
  console.error('\n❌ Error durante la migración:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
} finally {
  db.close();
}
