/* ========================================
   ASISTENTE IA CONTABLE - SRI ECUADOR
   Backend para automatización contable y tributaria
   ======================================== */

const path = require('path');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Database = require('better-sqlite3');

const {
  generarDatosFormulario103,
  generarDatosFormulario104,
  calcularFechaLimite,
} = require('../sri-formularios-asistentes');
const { obtenerCodigoRetencion } = require('../sri-retenciones-data');

const DEFAULT_PROVIDER = 'gemini';
const DEFAULT_MODEL = 'gemini-2.5-flash';

class IAAccountingAssistant {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, '..', 'data', 'gestor_tienda.db');
  }

  /**
   * Obtiene la configuración de IA de forma multi-tenant.
   * Prioriza la configuración del negocio (tenant) y recurre a la global.
   * @param {string} negocioId - El ID del negocio para cargar su configuración.
   */
  getProviderConfig(negocioId) {
    let tenantConfig = {};
    let globalConfig = {};

    // 1. Cargar configuración global
    try {
      const masterDb = new Database(this.dbPath);
      globalConfig = masterDb.prepare('SELECT * FROM ia_global_config WHERE id = 1').get() || {};
      masterDb.close();
    } catch (error) {
      console.warn('No se pudo cargar la configuración de IA global:', error.message);
    }

    // 2. Cargar configuración específica del tenant
    if (negocioId) {
      try {
        const tenantDbPath = path.join(path.dirname(this.dbPath), `${negocioId}.db`);
        const tenantDb = new Database(tenantDbPath, { readonly: true });
        const configRows = tenantDb
          .prepare("SELECT key, value FROM configuracion WHERE key LIKE 'ia_%'")
          .all();
        tenantDb.close();
        tenantConfig = configRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
      } catch (error) {
        console.warn(
          `No se pudo cargar la configuración para el negocio ${negocioId}:`,
          error.message
        );
      }
    }

    // 3. Combinar configuraciones con prioridad para el tenant
    const effectiveApiKey = tenantConfig.ia_gemini_api_key || globalConfig.api_key;
    const effectiveModel = tenantConfig.ia_gemini_model || globalConfig.model || DEFAULT_MODEL;

    return {
      provider: tenantConfig.ia_provider || globalConfig.provider || DEFAULT_PROVIDER,
      apiKey: effectiveApiKey,
      model: effectiveModel,
      baseUrl: tenantConfig.ia_base_url || globalConfig.base_url,
    };
  }

  async analyzeTaxStatus(negocioId) {
    const db = new Database(this.dbPath);
    try {
      // (sin cambios, esta función ya accede a la DB correcta en su lógica)
      let ruc = null;
      let nombre = 'Negocio';

      const negocio = db.prepare('SELECT nombre FROM negocios WHERE id = ?').get(negocioId);
      if (negocio) nombre = negocio.nombre;

      const tenantDbPath = path.join(path.dirname(this.dbPath), `${negocioId}.db`);
      const tenantDb = new Database(tenantDbPath);
      const config = tenantDb.prepare('SELECT ruc FROM config_tienda LIMIT 1').get();
      tenantDb.close();

      if (config && config.ruc) {
        ruc = config.ruc;
      } else if (negocio && negocio.ruc) {
        ruc = negocio.ruc;
      }

      if (!ruc) {
        return { status: 'ERROR', message: 'Negocio no tiene RUC configurado' };
      }

      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      let declarationMonth = currentMonth;
      let declarationYear = currentYear;

      if (declarationMonth === 0) {
        declarationMonth = 12;
        declarationYear = currentYear - 1;
      }

      const deadline = calcularFechaLimite(ruc, declarationMonth, declarationYear);
      const pending = true;

      return {
        negocio: nombre,
        ruc: ruc,
        periodo: `${declarationMonth}/${declarationYear}`,
        fechaLimite: deadline.fecha.toISOString().split('T')[0],
        diasRestantes: deadline.dias,
        estado: deadline.vencido ? 'VENCIDO' : deadline.urgente ? 'URGENTE' : 'A_TIEMPO',
        pendiente: pending,
        mensaje: deadline.vencido
          ? `¡ATENCIÓN! La declaración de ${declarationMonth}/${declarationYear} está vencida.`
          : `La declaración vence en ${deadline.dias} días.`,
      };
    } catch (error) {
      console.error('Error analizando estado tributario:', error);
      throw error;
    } finally {
      db.close();
    }
  }

  async generateDeclaration(negocioId, type, year, month) {
    // (sin cambios, esta función ya accede a la DB correcta en su lógica)
    const tenantDbPath = path.join(path.dirname(this.dbPath), `${negocioId}.db`);
    const tenantDb = new Database(tenantDbPath);
    try {
      const options = {
        anio: parseInt(year),
        mes: parseInt(month),
        obtenerVentas: async (a, m) => {
          /* ... */
        },
        obtenerCompras: async (a, m) => {
          /* ... */
        },
        obtenerRetenciones: async (a, m) => {
          /* ... */
        },
      };

      if (type === '104') {
        return await generarDatosFormulario104(options);
      } else if (type === '103') {
        return await generarDatosFormulario103(options);
      } else {
        throw new Error('Tipo de formulario no soportado');
      }
    } finally {
      tenantDb.close();
    }
  }

  async askAssistant(query, context = {}, negocioId) {
    const config = this.getProviderConfig(negocioId);
    if (!config.apiKey) {
      return 'La IA no está configurada. Por favor configura la API Key en el sistema.';
    }

    // Obtener contexto actualizado del negocio
    let negocioContext = { ...context };
    if (negocioId) {
      try {
        const tenantDbPath = path.join(path.dirname(this.dbPath), `${negocioId}.db`);
        const tenantDb = new Database(tenantDbPath);
        const configTienda = tenantDb
          .prepare('SELECT nombre, ruc FROM config_tienda LIMIT 1')
          .get();
        if (configTienda) {
          negocioContext.negocioNombre = configTienda.nombre;
          negocioContext.ruc = configTienda.ruc;
        }
        tenantDb.close();
      } catch (e) {
        console.warn(`No se pudo cargar contexto para negocio ${negocioId}: ${e.message}`);
      }
    }

    const systemPrompt = `Eres un Asistente Contable Experto en normativa del SRI de Ecuador.
    Tu objetivo es ayudar al usuario a cumplir con sus obligaciones tributarias de manera eficiente.
    
    CONTEXTO DEL NEGOCIO:
    - Negocio: ${negocioContext.negocioNombre || 'No especificado'}
    - RUC: ${negocioContext.ruc || 'No especificado'}
    - Fecha actual: ${new Date().toLocaleDateString('es-EC')}
    
    CAPACIDADES:
    - Puedes analizar el estado tributario.
    - Puedes explicar conceptos como Retenciones, IVA, Impuesto a la Renta.
    - Puedes guiar en el llenado de formularios 103 y 104.
    
    REGLAS:
    - Responde de manera concisa y profesional.
    - Cita la normativa vigente del SRI cuando sea relevante.
    - Si detectas una obligación vencida, alerta al usuario con urgencia.
    `;

    try {
      if (config.provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(config.apiKey);
        const model = genAI.getGenerativeModel({ model: config.model });

        const result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt + '\n\nPREGUNTA DEL USUARIO: ' + query }],
            },
          ],
        });

        return result.response.text();
      }

      return 'Proveedor de IA no soportado actualmente para el asistente contable.';
    } catch (error) {
      console.error('Error consultando IA:', error);
      return 'Lo siento, tuve un problema al procesar tu consulta. Por favor intenta más tarde.';
    }
  }
}

module.exports = IAAccountingAssistant;
