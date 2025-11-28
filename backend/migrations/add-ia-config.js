// ============================================
// MIGRACIÓN: Configuración de IAs para Facturas
// ============================================

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

function aplicarMigracion() {
  console.log('🔧 Aplicando migración: Configuración de IAs para Facturas...\n');

  // Intentar diferentes ubicaciones de la base de datos
  const possiblePaths = [
    path.join(__dirname, '../../data/taller_sa.db'),
    path.join(__dirname, '../../data/gestor_tienda.db'),
    path.join(__dirname, '../../data/database.sqlite'),
    path.join(__dirname, '../data/database.sqlite'),
    path.join(__dirname, '../data/gestor_tienda.db'),
  ];

  let dbPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      dbPath = p;
      console.log(`📂 Base de datos encontrada en: ${p}\n`);
      break;
    }
  }

  if (!dbPath) {
    console.error('❌ Error: No se encontró la base de datos en ninguna ubicación esperada');
    console.log('💡 Ubicaciones buscadas:');
    possiblePaths.forEach((p) => console.log(`   - ${p}`));
    console.log('\n💡 Asegúrate de que el servidor se haya ejecutado al menos una vez.\n');
    return;
  }

  const db = Database(dbPath);

  try {
    // Verificar que existe la tabla configuracion
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

    console.log('📋 Tablas encontradas en la base de datos:');
    tables.forEach((t) => console.log(`   - ${t.name}`));
    console.log();

    const tableExists = tables.find(
      (t) => t.name === 'configuracion' || t.name === 'configuracion_tienda'
    );

    if (!tableExists) {
      console.error('❌ Error: No se encontró una tabla de configuración');
      console.log('💡 El sistema puede usar una estructura diferente de base de datos.\n');
      return;
    }

    const tableName = tableExists.name;
    console.log(`✅ Usando tabla: ${tableName}\n`);

    // Configuraciones de IA para facturas
    const configuraciones = [
      // Gemini API
      {
        key: 'ia_gemini_api_key',
        value: '',
        tipo: 'password',
        descripcion: 'API Key de Google Gemini (general)',
      },
      {
        key: 'ia_gemini_model',
        value: 'gemini-2.5-flash',
        tipo: 'string',
        descripcion: 'Modelo de Gemini a usar',
      },

      // DeepSeek API
      {
        key: 'ia_deepseek_api_key',
        value: '',
        tipo: 'password',
        descripcion: 'API Key de DeepSeek',
      },
      {
        key: 'ia_deepseek_model',
        value: 'deepseek-chat',
        tipo: 'string',
        descripcion: 'Modelo de DeepSeek a usar',
      },

      // Configuración específica de facturas
      {
        key: 'ia_facturas_gemini_apikey',
        value: '',
        tipo: 'password',
        descripcion:
          'API Key de Gemini para facturas (opcional, usa ia_gemini_api_key si está vacío)',
      },
      {
        key: 'ia_facturas_gemini_model',
        value: 'gemini-2.5-flash',
        tipo: 'string',
        descripcion: 'Modelo de Gemini para facturas',
      },
      {
        key: 'ia_facturas_deepseek_apikey',
        value: '',
        tipo: 'password',
        descripcion: 'API Key de DeepSeek para facturas (opcional)',
      },
      {
        key: 'ia_facturas_extractor_mode',
        value: 'hybrid',
        tipo: 'select',
        descripcion:
          'Modo de extracción: hybrid (extractor+IA), gemini_only (solo IA), extractor_only (sin IA)',
      },
      {
        key: 'ia_facturas_use_deepseek_validator',
        value: 'false',
        tipo: 'boolean',
        descripcion: 'Usar DeepSeek para validar datos extraídos',
      },
      {
        key: 'ia_facturas_use_deepseek_formatter',
        value: 'false',
        tipo: 'boolean',
        descripcion: 'Usar DeepSeek para formatear datos finales',
      },
      {
        key: 'ia_facturas_temperature',
        value: '0.15',
        tipo: 'number',
        descripcion: 'Temperatura para generación de IA (0-1, menor = más determinista)',
      },
      {
        key: 'ia_facturas_top_p',
        value: '0.9',
        tipo: 'number',
        descripcion: 'Top P para muestreo (0-1)',
      },
      {
        key: 'ia_facturas_top_k',
        value: '32',
        tipo: 'number',
        descripcion: 'Top K para muestreo (solo Gemini)',
      },
      {
        key: 'ia_facturas_candidate_count',
        value: '1',
        tipo: 'number',
        descripcion: 'Número de candidatos a generar',
      },
      {
        key: 'ia_facturas_max_tokens',
        value: '8192',
        tipo: 'number',
        descripcion: 'Máximo de tokens de salida',
      },
      {
        key: 'ia_facturas_retry_limit',
        value: '2',
        tipo: 'number',
        descripcion: 'Número máximo de reintentos',
      },
      {
        key: 'ia_facturas_force_structured',
        value: 'true',
        tipo: 'boolean',
        descripcion: 'Incluir datos estructurados en el prompt',
      },
      {
        key: 'ia_facturas_enforce_schema',
        value: 'true',
        tipo: 'boolean',
        descripcion: 'Forzar esquema JSON en la respuesta',
      },
      {
        key: 'ia_facturas_diagnostics',
        value: 'false',
        tipo: 'boolean',
        descripcion: 'Activar logs de diagnóstico detallados',
      },
      {
        key: 'ia_facturas_prompt_hint',
        value: '',
        tipo: 'text',
        descripcion: 'Instrucciones adicionales para el prompt de IA',
      },
    ];

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO ${tableName} (key, value, tipo, descripcion, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

    const updateStmt = db.prepare(`
      UPDATE ${tableName} 
      SET tipo = ?, descripcion = ?
      WHERE key = ? AND (tipo IS NULL OR tipo = 'string')
    `);

    db.transaction(() => {
      let agregadas = 0;
      let actualizadas = 0;

      configuraciones.forEach((config) => {
        const result = insertStmt.run(config.key, config.value, config.tipo, config.descripcion);

        if (result.changes > 0) {
          agregadas++;
          console.log(`✅ Agregada: ${config.key}`);
        } else {
          // Actualizar tipo y descripción si ya existe
          const updateResult = updateStmt.run(config.tipo, config.descripcion, config.key);
          if (updateResult.changes > 0) {
            actualizadas++;
            console.log(`🔄 Actualizada: ${config.key}`);
          }
        }
      });

      console.log(`\n📊 Resumen:`);
      console.log(`   • Configuraciones agregadas: ${agregadas}`);
      console.log(`   • Configuraciones actualizadas: ${actualizadas}`);
      console.log(`   • Total procesadas: ${configuraciones.length}\n`);
    })();

    console.log('✅ Migración completada exitosamente\n');
    console.log('📝 Pasos siguientes:');
    console.log('   1. Obtén tu API Key de Gemini en: https://makersuite.google.com/app/apikey');
    console.log('   2. Obtén tu API Key de DeepSeek en: https://platform.deepseek.com/api_keys');
    console.log('   3. Configura las keys en la interfaz de Configuración del sistema');
    console.log(
      '   4. Habilita las opciones de DeepSeek si deseas validación y formateo automático\n'
    );
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error(error.stack);
  } finally {
    db.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  aplicarMigracion();
}

module.exports = { aplicarMigracion };
