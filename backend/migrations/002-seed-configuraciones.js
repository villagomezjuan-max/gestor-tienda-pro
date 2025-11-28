/**
 * SEED: Poblar tablas de configuración con datos iniciales
 *
 * Este script inserta los datos que actualmente están hardcodeados
 * en el código, moviéndolos a la base de datos para hacerlos configurables.
 */

const path = require('path');

const Database = require('better-sqlite3');

console.log('🌱 SEED: Poblando tablas de configuración\n');

const dbPath = path.join(__dirname, '..', 'data', 'gestor_tienda.db');
const db = new Database(dbPath);

try {
  console.log('📂 Conectado a:', dbPath);

  // 1. Poblar Modelos de IA - SOLO LOS ESENCIALES
  console.log('\n1️⃣  Poblando modelos de IA esenciales...');
  const insertModel = db.prepare(`
    INSERT OR IGNORE INTO ia_models (provider, model_id, display_name, description, is_recommended, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Modelos actualizados Noviembre 2025
  const iaModels = [
    // Gemini - Modelos actuales
    [
      'gemini',
      'gemini-2.5-flash',
      'Gemini 2.5 Flash (Recomendado)',
      'Mejor relación precio-rendimiento, ideal para la mayoría de tareas',
      1,
      1,
    ],
    [
      'gemini',
      'gemini-2.5-pro',
      'Gemini 2.5 Pro',
      'Modelo thinking avanzado para análisis complejos',
      0,
      2,
    ],
    ['gemini', 'gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite', 'Ultra rápido y económico', 0, 3],
    [
      'gemini',
      'gemini-2.0-flash',
      'Gemini 2.0 Flash',
      'Modelo de trabajo con 1M tokens de contexto',
      0,
      4,
    ],
    // OpenAI - Modelos actuales
    [
      'openai',
      'gpt-4o',
      'GPT-4o (Recomendado)',
      'Modelo más avanzado y multimodal de OpenAI',
      1,
      5,
    ],
    ['openai', 'gpt-4o-mini', 'GPT-4o Mini', 'Versión eficiente, rápida y económica', 0, 6],
    ['openai', 'gpt-4-turbo', 'GPT-4 Turbo', 'GPT-4 optimizado para producción', 0, 7],
    ['openai', 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'Modelo rápido y muy económico', 0, 8],
    // DeepSeek - Modelos actuales (V3.2)
    [
      'deepseek',
      'deepseek-chat',
      'DeepSeek V3 Chat (Recomendado)',
      'DeepSeek-V3.2 modo normal - potente y económico',
      1,
      9,
    ],
    [
      'deepseek',
      'deepseek-reasoner',
      'DeepSeek V3 Reasoner',
      'DeepSeek-V3.2 modo thinking - razonamiento profundo',
      0,
      10,
    ],
  ];

  iaModels.forEach((model) => insertModel.run(...model));
  console.log(`   ✅ ${iaModels.length} modelos de IA insertados (solo esenciales)`);

  // 4. Poblar Características de IA
  console.log('\n4️⃣  Poblando características de IA...');
  const insertFeature = db.prepare(`
    INSERT OR IGNORE INTO ia_features (id, label, description, requires_api_key)
    VALUES (?, ?, ?, ?)
  `);

  const features = [
    [
      'facturas',
      'Procesamiento de facturas',
      'Extracción automática de datos de facturas PDF usando IA',
      1,
    ],
    ['assistant', 'Asistentes y bots', 'Chatbots inteligentes y asistentes virtuales', 1],
    ['marketing', 'Marketing IA', 'Generación de contenido y campañas de marketing con IA', 1],
  ];

  features.forEach((feature) => insertFeature.run(...feature));
  console.log(`   ✅ ${features.length} características de IA insertadas`);

  // 5. Configuración de Seguridad
  console.log('\n5️⃣  Poblando configuración de seguridad...');
  const insertSecurityConfig = db.prepare(`
    INSERT OR IGNORE INTO security_configuration (config_key, config_value, data_type, description, category)
    VALUES (?, ?, ?, ?, ?)
  `);

  const securityConfigs = [
    [
      'dangerous_sql_commands',
      '["DROP DATABASE", "DROP TABLE", "TRUNCATE", "DELETE FROM", "ALTER TABLE"]',
      'array',
      'Comandos SQL considerados peligrosos y bloqueados en ejecución directa',
      'sql_security',
    ],
    [
      'inactive_user_days',
      '90',
      'number',
      'Días de inactividad antes de considerar una cuenta inactiva',
      'user_management',
    ],
    [
      'max_login_attempts',
      '5',
      'number',
      'Intentos máximos de login antes de bloquear cuenta',
      'authentication',
    ],
    [
      'session_timeout_minutes',
      '480',
      'number',
      'Tiempo de expiración de sesión en minutos (8 horas)',
      'authentication',
    ],
    [
      'require_strong_password',
      'true',
      'boolean',
      'Requerir contraseñas fuertes (8+ caracteres, mayúsculas, números)',
      'authentication',
    ],
    [
      'enable_two_factor_auth',
      'false',
      'boolean',
      'Habilitar autenticación de dos factores',
      'authentication',
    ],
    [
      'password_expiry_days',
      '0',
      'number',
      'Días hasta que expira una contraseña (0 = nunca)',
      'authentication',
    ],
  ];

  securityConfigs.forEach((config) => insertSecurityConfig.run(...config));
  console.log(`   ✅ ${securityConfigs.length} configuraciones de seguridad insertadas`);

  // 6. Métodos de Pago - SOLO LOS IMPLEMENTADOS
  console.log('\n6️⃣  Poblando métodos de pago...');
  const insertPaymentMethod = db.prepare(`
    INSERT OR IGNORE INTO payment_methods (id, nombre, descripcion, requiere_referencia, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Solo métodos que realmente se usan en el sistema
  const paymentMethods = [
    ['efectivo', 'Efectivo', 'Pago en efectivo', 0, 1],
    ['transferencia', 'Transferencia Bancaria', 'Transferencia o depósito bancario', 1, 2],
  ];

  paymentMethods.forEach((method) => insertPaymentMethod.run(...method));
  console.log(`   ✅ ${paymentMethods.length} métodos de pago insertados (solo implementados)`);

  // 7. Estados de Transacciones
  console.log('\n7️⃣  Poblando estados de transacciones...');
  const insertState = db.prepare(`
    INSERT OR IGNORE INTO transaction_states (id, nombre, descripcion, tipo, color, es_final, permite_edicion)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const states = [
    ['pendiente', 'Pendiente', 'Transacción pendiente de procesar', 'general', '#FFA500', 0, 1],
    ['en_proceso', 'En Proceso', 'Transacción en proceso', 'general', '#2196F3', 0, 1],
    ['completada', 'Completada', 'Transacción completada exitosamente', 'general', '#4CAF50', 1, 0],
    ['anulada', 'Anulada', 'Transacción anulada', 'general', '#F44336', 1, 0],
    ['pagado', 'Pagado', 'Pago recibido', 'venta', '#4CAF50', 1, 0],
    ['por_pagar', 'Por Pagar', 'Pendiente de pago', 'compra', '#FF9800', 0, 1],
  ];

  states.forEach((state) => insertState.run(...state));
  console.log(`   ✅ ${states.length} estados de transacciones insertados`);

  // 8. Triggers de Notificaciones - SOLO CANAL SISTEMA
  console.log('\n8️⃣  Poblando triggers de notificaciones...');
  const insertTrigger = db.prepare(`
    INSERT OR IGNORE INTO notification_triggers (evento_tipo, nombre, descripcion, prioridad, canales_predeterminados, plantilla_mensaje)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Solo canal 'sistema' porque email/telegram no están implementados
  const triggers = [
    [
      'stock_bajo',
      'Stock Bajo',
      'Alerta cuando un producto está por debajo del stock mínimo',
      'alta',
      '["sistema"]',
      'El producto {producto} tiene stock bajo: {stock} unidades (mínimo: {stock_minimo})',
    ],
    [
      'stock_agotado',
      'Stock Agotado',
      'Alerta cuando un producto se agota',
      'urgente',
      '["sistema"]',
      'El producto {producto} está AGOTADO',
    ],
    [
      'venta_completada',
      'Venta Completada',
      'Notificación de venta exitosa',
      'media',
      '["sistema"]',
      'Venta #{numero} completada por ${total}',
    ],
    [
      'pago_vencido',
      'Pago Vencido',
      'Alerta de pago vencido',
      'alta',
      '["sistema"]',
      'Pago vencido para factura #{numero}. Cliente: {cliente}',
    ],
    [
      'orden_trabajo_asignada',
      'Orden Asignada',
      'Notificación cuando se asigna una orden de trabajo',
      'media',
      '["sistema"]',
      'Nueva orden de trabajo #{numero} asignada',
    ],
    [
      'cliente_nuevo',
      'Cliente Nuevo',
      'Notificación de nuevo cliente registrado',
      'baja',
      '["sistema"]',
      'Nuevo cliente registrado: {nombre}',
    ],
  ];

  triggers.forEach((trigger) => insertTrigger.run(...trigger));
  console.log(`   ✅ ${triggers.length} triggers insertados (solo canal sistema)`);

  // 9. Configuración SRI para negocios existentes
  console.log('\n9️⃣  Configurando SRI para negocios existentes...');
  const negocios = db.prepare('SELECT id FROM negocios').all();
  const insertSRIConfig = db.prepare(`
    INSERT OR IGNORE INTO sri_configuration (negocio_id, ambiente, ws_recepcion_pruebas, ws_autorizacion_pruebas, ws_recepcion_produccion, ws_autorizacion_produccion)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  negocios.forEach((negocio) => {
    insertSRIConfig.run(
      negocio.id,
      'pruebas',
      'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
      'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
      'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
      'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'
    );
  });
  console.log(`   ✅ Configuración SRI creada para ${negocios.length} negocios`);

  console.log('\n✅ SEED COMPLETADO - SOLO CONFIGURACIONES ESENCIALES');
  console.log('\n📊 Resumen de datos insertados:');
  console.log(`   - ${iaModels.length} modelos de IA (solo esenciales)`);
  console.log(`   - ${features.length} características de IA`);
  console.log(`   - ${securityConfigs.length} configuraciones de seguridad`);
  console.log(`   - ${paymentMethods.length} métodos de pago (solo implementados)`);
  console.log(`   - ${states.length} estados de transacciones`);
  console.log(`   - ${triggers.length} triggers de notificaciones`);
  console.log(`   - ${negocios.length} configuraciones SRI`);

  db.close();
  console.log('\n🎉 Todas las configuraciones están ahora en la base de datos\n');
} catch (error) {
  console.error('\n❌ ERROR durante el seed:', error.message);
  console.error(error.stack);
  db.close();
  process.exit(1);
}
