/**
 * MIGRACIÓN: Tablas de Configuración del Sistema
 *
 * Este script crea las tablas necesarias para almacenar todas las configuraciones
 * que actualmente están hardcodeadas en el código, siguiendo la propuesta de mejora.
 */

const path = require('path');

const Database = require('better-sqlite3');

console.log('🔧 MIGRACIÓN: Creando tablas de configuración\n');

// Conectar a la base de datos principal (gestor_tienda.db)
const dbPath = path.join(__dirname, '..', 'data', 'gestor_tienda.db');
const db = new Database(dbPath);

try {
  console.log('📂 Conectado a base de datos:', dbPath);

  // 1. Tabla de Modelos de IA
  console.log('\n1️⃣  Creando tabla: ia_models');
  db.exec(`
    CREATE TABLE IF NOT EXISTS ia_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL CHECK(provider IN ('gemini', 'openai', 'deepseek', 'lmstudio')),
      model_id TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      description TEXT,
      is_recommended BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_ia_models_provider ON ia_models(provider);
    CREATE INDEX IF NOT EXISTS idx_ia_models_active ON ia_models(is_active);
  `);
  console.log('   ✅ Tabla ia_models creada');

  // 2. Tabla de Características de IA
  console.log('\n2️⃣  Creando tabla: ia_features');
  db.exec(`
    CREATE TABLE IF NOT EXISTS ia_features (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT 1,
      requires_api_key BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  console.log('   ✅ Tabla ia_features creada');

  // 3. Tabla de Configuración del SRI
  console.log('\n3️⃣  Creando tabla: sri_configuration');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sri_configuration (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id TEXT NOT NULL UNIQUE,
      ambiente TEXT CHECK(ambiente IN ('pruebas', 'produccion')) DEFAULT 'pruebas',
      ws_recepcion_pruebas TEXT,
      ws_autorizacion_pruebas TEXT,
      ws_recepcion_produccion TEXT,
      ws_autorizacion_produccion TEXT,
      timeout_seconds INTEGER DEFAULT 30,
      max_reintentos INTEGER DEFAULT 3,
      is_active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_sri_config_negocio ON sri_configuration(negocio_id);
  `);
  console.log('   ✅ Tabla sri_configuration creada');

  // 4. Tabla de Configuración de Seguridad
  console.log('\n4️⃣  Creando tabla: security_configuration');
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_configuration (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT NOT NULL UNIQUE,
      config_value TEXT NOT NULL,
      data_type TEXT CHECK(data_type IN ('string', 'number', 'boolean', 'json', 'array')) DEFAULT 'string',
      description TEXT,
      category TEXT,
      is_editable BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_security_config_category ON security_configuration(category);
  `);
  console.log('   ✅ Tabla security_configuration creada');

  // 5. Tabla de Métodos de Pago Configurables
  console.log('\n5️⃣  Creando tabla: payment_methods');
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      requiere_referencia BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  console.log('   ✅ Tabla payment_methods creada');

  // 6. Tabla de Estados de Transacciones Configurables
  console.log('\n6️⃣  Creando tabla: transaction_states');
  db.exec(`
    CREATE TABLE IF NOT EXISTS transaction_states (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      tipo TEXT CHECK(tipo IN ('venta', 'compra', 'orden', 'general')) DEFAULT 'general',
      color TEXT,
      es_final BOOLEAN DEFAULT 0,
      permite_edicion BOOLEAN DEFAULT 1,
      is_active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_transaction_states_tipo ON transaction_states(tipo);
  `);
  console.log('   ✅ Tabla transaction_states creada');

  // 7. Tabla de Configuración de Notificaciones
  console.log('\n7️⃣  Creando tabla: notification_triggers');
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_triggers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evento_tipo TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      crear_notificacion BOOLEAN DEFAULT 1,
      prioridad TEXT CHECK(prioridad IN ('baja', 'media', 'alta', 'urgente')) DEFAULT 'media',
      canales_predeterminados TEXT, -- JSON array: ['sistema', 'email', 'telegram']
      plantilla_mensaje TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_notification_triggers_tipo ON notification_triggers(evento_tipo);
  `);
  console.log('   ✅ Tabla notification_triggers creada');

  console.log('\n✅ MIGRACIÓN COMPLETADA: Todas las tablas de configuración creadas');
  console.log('\n📋 Resumen:');
  console.log('   - ia_models: Modelos de IA configurables');
  console.log('   - ia_features: Características de IA disponibles');
  console.log('   - sri_configuration: Configuración SRI por negocio');
  console.log('   - security_configuration: Parámetros de seguridad');
  console.log('   - payment_methods: Métodos de pago configurables');
  console.log('   - transaction_states: Estados de transacciones');
  console.log('   - notification_triggers: Triggers de notificaciones');

  db.close();
  console.log('\n🎉 Base de datos maestra actualizada correctamente\n');
} catch (error) {
  console.error('\n❌ ERROR durante la migración:', error.message);
  console.error(error.stack);
  db.close();
  process.exit(1);
}
