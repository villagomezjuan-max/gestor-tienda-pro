/**
 * MIGRACIÓN: Actualizar modelos de IA a versiones de Noviembre 2025
 *
 * - Gemini: gemini-pro obsoleto, usar gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash
 * - OpenAI: gpt-4o, gpt-4o-mini son los modelos actuales
 * - DeepSeek: deepseek-chat y deepseek-reasoner (V3.2)
 */

const path = require('path');

const Database = require('better-sqlite3');

console.log('🔄 MIGRACIÓN: Actualizando modelos de IA a versiones Nov 2025\n');

const dbPath = path.join(__dirname, '..', 'data', 'gestor_tienda.db');

let db;
try {
  db = new Database(dbPath);
  console.log('📂 Conectado a:', dbPath);
} catch (error) {
  console.error('❌ No se pudo conectar a la base de datos:', error.message);
  process.exit(1);
}

try {
  // Verificar si la tabla existe
  const tableExists = db
    .prepare(
      `
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='ia_models'
  `
    )
    .get();

  if (!tableExists) {
    console.log(
      '⚠️  La tabla ia_models no existe. Ejecuta primero 001-crear-tablas-configuracion.js'
    );
    db.close();
    process.exit(0);
  }

  console.log('\n1️⃣  Desactivando modelos obsoletos...');

  // Desactivar modelos que ya no existen
  const obsoleteModels = [
    'gemini-pro',
    'gemini-pro-vision',
    'gemini-1.0-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gpt-4',
    'gpt-4-turbo-preview',
    'gpt-3.5-turbo-16k',
    'deepseek-coder',
  ];

  const deactivate = db.prepare(`
    UPDATE ia_models SET is_active = 0 WHERE model_id = ?
  `);

  let deactivated = 0;
  obsoleteModels.forEach((modelId) => {
    const result = deactivate.run(modelId);
    if (result.changes > 0) {
      console.log(`   ⚪ Desactivado: ${modelId}`);
      deactivated++;
    }
  });
  console.log(`   ✅ ${deactivated} modelos obsoletos desactivados`);

  console.log('\n2️⃣  Insertando/Actualizando modelos actuales...');

  const upsertModel = db.prepare(`
    INSERT OR REPLACE INTO ia_models (provider, model_id, display_name, description, is_recommended, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  // Modelos actualizados Noviembre 2025
  const currentModels = [
    // Gemini
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
    // OpenAI
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
    // DeepSeek
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

  let inserted = 0;
  let updated = 0;

  currentModels.forEach((model) => {
    const existing = db
      .prepare(
        `
      SELECT 1 FROM ia_models WHERE provider = ? AND model_id = ?
    `
      )
      .get(model[0], model[1]);

    upsertModel.run(...model);

    if (existing) {
      console.log(`   🔄 Actualizado: ${model[1]}`);
      updated++;
    } else {
      console.log(`   ✅ Insertado: ${model[1]}`);
      inserted++;
    }
  });

  console.log(`\n   📊 Resumen: ${inserted} nuevos, ${updated} actualizados`);

  console.log('\n3️⃣  Actualizando configuraciones globales de IA con modelos obsoletos...');

  // Si la configuración global tiene un modelo obsoleto, actualizarlo
  const updateObsoleteConfig = db.prepare(`
    UPDATE ia_global_config 
    SET model = 'gemini-2.5-flash'
    WHERE model IN ('gemini-pro', 'gemini-pro-vision', 'gemini-1.0-pro')
  `);

  const configResult = updateObsoleteConfig.run();
  if (configResult.changes > 0) {
    console.log(`   ✅ Actualizada configuración global de IA a gemini-2.5-flash`);
  } else {
    console.log(`   ℹ️  No se encontraron configuraciones con modelos obsoletos`);
  }

  console.log('\n✅ MIGRACIÓN COMPLETADA\n');
  console.log('📋 Modelos activos disponibles:');

  const activeModels = db
    .prepare(
      `
    SELECT provider, model_id, display_name 
    FROM ia_models 
    WHERE is_active = 1 
    ORDER BY sort_order
  `
    )
    .all();

  activeModels.forEach((m) => {
    console.log(`   • [${m.provider}] ${m.display_name}`);
  });

  db.close();
  console.log('\n🎉 Base de datos actualizada correctamente\n');
} catch (error) {
  console.error('\n❌ ERROR durante la migración:', error.message);
  console.error(error.stack);
  if (db) db.close();
  process.exit(1);
}
