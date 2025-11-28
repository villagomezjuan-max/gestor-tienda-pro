/**
 * Script para configurar IA global como super admin
 * Ejecutar: node backend/configurar-ia-global.js
 *
 * IMPORTANTE: Reemplaza 'TU_API_KEY_AQUI' con tu API key real
 */

const path = require('path');

const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data', 'gestor_tienda.db');

// ============================================
// CONFIGURACIÓN - CAMBIA ESTOS VALORES
// ============================================
const CONFIG = {
  provider: 'gemini', // Opciones: 'gemini', 'openai', 'deepseek', 'lmstudio'
  apiKey: 'AIzaSyDeqAEHWPtlSyUfYzIda2ueQC43m4C3b6U', // Tu API KEY válida de Gemini
  model: 'gemini-2.5-flash', // Modelos disponibles: gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash
  baseURL: null, // Solo para lmstudio, ej: 'http://localhost:1234/v1'
  temperature: 0.7,
  maxTokens: 2000,
};

// ============================================
// FUNCIONES
// ============================================
function normalizeIaProvider(provider) {
  const raw = (provider || '').toString().trim().toLowerCase();
  if (!raw) return 'gemini';
  if (raw === 'google_gemini' || raw === 'gemini' || raw === 'gemini-pro') return 'gemini';
  if (raw === 'lm_studio' || raw === 'lmstudio' || raw === 'lm-studio') return 'lmstudio';
  return raw;
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    if (numeric < min) return min;
    if (numeric > max) return max;
    return numeric;
  }
  return fallback;
}

// ============================================
// SCRIPT PRINCIPAL
// ============================================
try {
  console.log('🔧 Configurando IA global...\n');

  if (CONFIG.apiKey === 'TU_API_KEY_AQUI') {
    console.error('❌ ERROR: Debes reemplazar "TU_API_KEY_AQUI" con tu API key real.');
    console.log('\nEdita el archivo backend/configurar-ia-global.js y cambia:');
    console.log('  apiKey: "TU_API_KEY_AQUI"');
    console.log('por:');
    console.log('  apiKey: "tu-api-key-real-aqui"\n');
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  const normalizedProvider = normalizeIaProvider(CONFIG.provider);
  const temperature = clampNumber(CONFIG.temperature, 0, 1, 0.7);
  const maxTokens = Math.round(clampNumber(CONFIG.maxTokens, 256, 32768, 2000));

  console.log('📋 Configuración a guardar:');
  console.log(`  Proveedor: ${normalizedProvider}`);
  console.log(`  Modelo: ${CONFIG.model}`);
  console.log(`  API Key: ${CONFIG.apiKey.slice(0, 8)}...${CONFIG.apiKey.slice(-4)}`);
  console.log(`  Temperatura: ${temperature}`);
  console.log(`  Max Tokens: ${maxTokens}`);
  if (CONFIG.baseURL) {
    console.log(`  Base URL: ${CONFIG.baseURL}`);
  }
  console.log('');

  // Obtener un super admin válido para el updated_by (foreign key)
  const superAdmin = db
    .prepare(
      `
    SELECT id FROM usuarios WHERE rol = 'SUPER_ADMIN' LIMIT 1
  `
    )
    .get();

  const updatedBy = superAdmin ? superAdmin.id : null;

  const stmt = db.prepare(`
    INSERT INTO ia_global_config (id, provider, api_key, model, base_url, temperature, max_tokens, updated_by, updated_at)
    VALUES (1, @provider, @apiKey, @model, @baseURL, @temperature, @maxTokens, @updatedBy, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      provider = excluded.provider,
      api_key = excluded.api_key,
      model = excluded.model,
      base_url = excluded.base_url,
      temperature = excluded.temperature,
      max_tokens = excluded.max_tokens,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `);

  stmt.run({
    provider: normalizedProvider,
    apiKey: CONFIG.apiKey,
    model: CONFIG.model,
    baseURL: CONFIG.baseURL,
    temperature,
    maxTokens,
    updatedBy,
  });

  // Verificar
  const saved = db
    .prepare(
      `
    SELECT provider, model, api_key, base_url, temperature, max_tokens
    FROM ia_global_config
    WHERE id = 1
  `
    )
    .get();

  console.log('✅ Configuración guardada exitosamente!\n');
  console.log('📊 Configuración actual en la base de datos:');
  console.log(`  Proveedor: ${saved.provider}`);
  console.log(`  Modelo: ${saved.model}`);
  console.log(`  API Key: ${saved.api_key.slice(0, 8)}...${saved.api_key.slice(-4)}`);
  console.log(`  Temperatura: ${saved.temperature}`);
  console.log(`  Max Tokens: ${saved.max_tokens}`);
  if (saved.base_url) {
    console.log(`  Base URL: ${saved.base_url}`);
  }
  console.log('');

  db.close();

  console.log('🎉 ¡Listo! Ahora puedes usar la IA en tu sistema.');
  console.log('');
  console.log('📝 Próximos pasos:');
  console.log('   1. Verificar configuración: node backend/verificar-ia-gemini.js');
  console.log('   2. Reiniciar el servidor: node backend/server.js');
  console.log('   3. Abrir el panel de configuración de IA en el frontend\n');
} catch (error) {
  console.error('❌ Error configurando IA:', error);
  process.exit(1);
}
