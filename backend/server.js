// ============================================
// SERVIDOR BACKEND - SQLite API REST
// Gestor Tienda Pro v2.0 - Sistema Seguro Multi-Base de Datos
// ============================================

// Cargar variables de entorno PRIMERO
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const csrf = require('csurf');
const express = require('express');
const helmet = require('helmet');
const multer = require('multer');
const pdfParse = require('pdf-parse');

// Importar middlewares
const { registerModuleEndpoints } = require('./endpoints-modulos');
const { authenticate, requireRole, optionalAuthenticate } = require('./middleware/auth');
const { requirePermission } = require('./middleware/authorization');
const {
  criticalLimiter,
  apiLimiter,
  loginLimiter,
  iaLimiter,
  ventasLimiter,
} = require('./middleware/rate-limit');
const { validateTenantAccess } = require('./middleware/tenant');

// Importar catálogo de módulos
const {
  MODULE_CATALOG,
  OBLIGATORY_MODULES,
  DEFAULT_BUSINESS_MODULES,
} = require('./module-catalog');

// Importar utilidades de roles
const accountingAssistantRouter = require('./routes/accounting-assistant');
const createAuthRoutes = require('./routes/auth');
const {
  normalizeRole,
  ROLE_SUPER_ADMIN,
  ROLE_ADMIN,
  PERMISSIONS,
  hasPermission,
} = require('./utils/roles');

// Importar middleware de autorización

// Importar endpoints de módulos

// Importar rutas
const finanzasRoutes = require('./routes/finanzas');
const historialProductosRoutes = require('./routes/historial-productos');
const nominasRoutes = require('./routes/nominas');
const createTallerRouter = require('./routes/taller');
const createNotificationRoutes = require('./routes/notifications');

// Importar servicios
const NotificationHub = require('./services/notification-hub');
const StockAlerter = require('./services/stock-alerter');
const configService = require('./services/ConfigurationService');
const { getUserNegocios } = require('./utils/negocios');
const {
  PRIMARY_SUPER_ADMIN_USERNAME,
  SUPER_ADMIN_USERNAME_ALIASES,
} = require('./utils/super-admin');


// Constantes del sistema
const SUPER_ADMIN_DISPLAY_NAME = 'Super Administrador';
const SUPER_ADMIN_ALIAS_SET = new Set(
  [...SUPER_ADMIN_USERNAME_ALIASES, PRIMARY_SUPER_ADMIN_USERNAME]
    .map((alias) => (alias || '').toLowerCase().trim())
    .filter(Boolean)
);

// Configuración de modelos IA
const IA_ALLOWED_PROVIDERS = new Set(['gemini', 'openai', 'deepseek', 'lmstudio']);

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar middleware básico
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Configurar CORS
const allowedOrigins = [
  'http://localhost:5500',
  'http://localhost:5173',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://gestor-tienda-pro.onrender.com',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    },
    credentials: true,
  })
);

// Servir archivos estáticos del frontend (en producción)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..')));
}

// Configurar CSRF - Más permisivo para producción
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
});

// Middleware CSRF opcional (no falla si no hay token)
const optionalCsrf = (req, res, next) => {
  // En producción, hacer CSRF opcional para evitar problemas con cookies
  if (process.env.NODE_ENV === 'production') {
    return next();
  }
  return csrfProtection(req, res, next);
};

// Helper functions
function quantize(val) {
  return Math.round(val);
}

async function extractStructuredRowsFromPdf(buffer) {
  // Placeholder implementation
  return [];
}

async function parsePdfToText(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (e) {
    console.error('Error parsing PDF:', e);
    return '';
  }
}

function buildStructuredTablesPrompt(structuredPages) {
  if (!Array.isArray(structuredPages) || !structuredPages.length) {
    return '';
  }

  const pageBlocks = structuredPages
    .map((rows, index) => {
      const formattedRows = rows
        .map((cells) =>
          cells
            .map((cell) => cell.replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .join(' | ')
        )
        .filter(Boolean)
        .join('\n');
      if (!formattedRows) return '';
      return `### Página ${index + 1}\n${formattedRows}`;
    })
    .filter(Boolean);

  return pageBlocks.length ? `=== TABLAS ESTRUCTURADAS ===\n${pageBlocks.join('\n\n')}` : '';
}

async function getPdfContent(buffer) {
  const result = { text: '', structuredTables: [] };

  try {
    const parsed = await parsePdfToText(buffer);
    if (parsed && typeof parsed.text === 'string') {
      result.text = parsed.text;
    } else if (typeof parsed === 'string') {
      result.text = parsed;
    }
  } catch (error) {
    console.warn('No se pudo extraer el texto lineal del PDF:', error.message);
  }

  try {
    result.structuredTables = await extractStructuredRowsFromPdf(buffer);
  } catch (error) {
    console.warn('No se pudo extraer la estructura tabular del PDF:', error.message);
  }

  return result;
}

// Helper para parsear números con formato locale
function parseLocaleNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    // Eliminar espacios y caracteres no numéricos excepto . , -
    let cleaned = value.trim().replace(/[^\d.,-]/g, '');
    // Si tiene coma como separador decimal (1.234,56 -> 1234.56)
    if (cleaned.includes(',') && cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Si solo tiene comas, tratarlas como miles (1,234 -> 1234)
      cleaned = cleaned.replace(/,/g, '');
    }
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getIaDefaultFeatureState() {
  try {
    const features = configService.getIAFeatures(false);
    const defaults = {};
    features.forEach((f) => {
      defaults[f.id] = false;
    });
    return defaults;
  } catch (error) {
    console.warn('Error getting default IA feature state:', error);
    return {};
  }
}

async function listGeminiModels(apiKey) {
  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    return response.data.models || [];
  } catch (error) {
    console.error('Error fetching Gemini models:', error.message);
    throw error;
  }
}

function mapProductoRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    negocioId: row.negocio_id || null,
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion || '',
    categoria: row.categoria_id,
    categoriaNombre: row.categoria_nombre || '',
    proveedorId: row.proveedor_id || null,
    proveedorNombre: row.proveedor_nombre || '',
    precioCompra: normalizeNumber(row.precio_compra, 0),
    precioVenta: normalizeNumber(row.precio_venta, 0),
    stock: normalizeNumber(row.stock, 0),
    stockMinimo: normalizeNumber(row.stock_minimo, 0),
    activo: row.activo === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getProductoRowById(id, dbInstance, negocioId) {
  if (!id || !dbInstance) {
    return null;
  }

  if (!negocioId) {
    throw new Error('ID de negocio obligatorio para consultar productos.');
  }

  return dbInstance
    .prepare(
      `
    SELECT 
      p.id, p.negocio_id, p.codigo, p.nombre, p.descripcion, p.categoria_id, p.proveedor_id,
      p.precio_compra, p.precio_venta, p.stock, p.stock_minimo, p.activo,
      p.created_at, p.updated_at,
      c.nombre AS categoria_nombre,
      pr.nombre AS proveedor_nombre
    FROM productos p
    LEFT JOIN categorias c ON c.id = p.categoria_id AND c.negocio_id = p.negocio_id
    LEFT JOIN proveedores pr ON pr.id = p.proveedor_id AND pr.negocio_id = p.negocio_id
    WHERE p.id = @id AND p.negocio_id = @negocioId
  `
    )
    .get({ id, negocioId });
}

const PRODUCT_REFERENCE_MAPPINGS = Object.freeze([
  {
    table: 'ventas_detalle',
    column: 'producto_id',
    label: 'ventas',
    type: 'blocking',
    negocioScoped: true,
  },
  {
    table: 'factura_items',
    column: 'producto_id',
    label: 'facturas',
    type: 'blocking',
    negocioScoped: false,
  },
  {
    table: 'compras_detalle',
    column: 'producto_id',
    label: 'compras',
    type: 'soft',
    negocioScoped: true,
  },
  {
    table: 'ordenes_trabajo_repuestos',
    column: 'producto_id',
    label: 'ordenesTrabajo',
    type: 'soft',
    negocioScoped: true,
  },
]);

function safeTableOperation(dbInstance, tableName, callback) {
  if (!dbInstance || typeof callback !== 'function') {
    return null;
  }

  try {
    return callback();
  } catch (error) {
    if (/no such table/i.test(error.message)) {
      console.warn(`Tabla ${tableName} no disponible; se omite la limpieza.`);
      return null;
    }
    throw error;
  }
}

function purgeProductoReferences(dbInstance, productoId, negocioId) {
  if (!dbInstance || !productoId) {
    return {
      ventasEliminadas: [],
      ventasActualizadas: [],
      facturasEliminadas: [],
      facturasActualizadas: [],
      detalles: { ventas: 0, facturas: 0, compras: 0, ordenesTrabajo: 0 },
    };
  }

  const summary = {
    ventasEliminadas: [],
    ventasActualizadas: [],
    facturasEliminadas: [],
    facturasActualizadas: [],
    detalles: {
      ventas: 0,
      facturas: 0,
      compras: 0,
      ordenesTrabajo: 0,
    },
  };

  const now = new Date().toISOString();

  const transaction = dbInstance.transaction(() => {
    safeTableOperation(dbInstance, 'ventas_detalle', () => {
      const negocioFilter = negocioId ? 'AND (negocio_id = @negocioId OR negocio_id IS NULL)' : '';
      const ventaParams = { productoId };
      if (negocioId) ventaParams.negocioId = negocioId;

      const ventasAfectadas = dbInstance
        .prepare(
          `
        SELECT DISTINCT venta_id
        FROM ventas_detalle
        WHERE producto_id = @productoId
        ${negocioFilter}
      `
        )
        .all(ventaParams);

      if (!ventasAfectadas.length) {
        return;
      }

      const detalleVentaParams = { productoId };
      if (negocioId) detalleVentaParams.negocioId = negocioId;
      const detalleVentaResultado = dbInstance
        .prepare(
          `
        DELETE FROM ventas_detalle
        WHERE producto_id = @productoId
        ${negocioFilter}
      `
        )
        .run(detalleVentaParams);

      summary.detalles.ventas += detalleVentaResultado?.changes || 0;

      ventasAfectadas.forEach((row) => {
        const ventaId = row?.venta_id;
        if (!ventaId) {
          return;
        }

        const remaining = dbInstance
          .prepare(
            `
          SELECT COUNT(*) AS total
          FROM ventas_detalle
          WHERE venta_id = @ventaId
        `
          )
          .get({ ventaId });

        if (!remaining || remaining.total === 0) {
          dbInstance.prepare('DELETE FROM ventas WHERE id = @ventaId').run({ ventaId });
          summary.ventasEliminadas.push(ventaId);
          return;
        }

        const totals = dbInstance
          .prepare(
            `
          SELECT COALESCE(SUM(total), 0) AS subtotal
          FROM ventas_detalle
          WHERE venta_id = @ventaId
        `
          )
          .get({ ventaId });

        const ventaRow = dbInstance
          .prepare(
            `
          SELECT iva, descuento
          FROM ventas
          WHERE id = @ventaId
        `
          )
          .get({ ventaId });

        const subtotal = Number(totals?.subtotal || 0);
        const iva = Number(ventaRow?.iva || 0);
        const descuento = Number(ventaRow?.descuento || 0);
        const total = Number((subtotal + iva - descuento).toFixed(2));

        dbInstance
          .prepare(
            `
          UPDATE ventas
          SET subtotal = @subtotal,
              total = @total,
              updated_at = @updated
          WHERE id = @ventaId
        `
          )
          .run({ subtotal, total, updated: now, ventaId });

        summary.ventasActualizadas.push(ventaId);
      });
    });

    safeTableOperation(dbInstance, 'factura_items', () => {
      const facturasAfectadas = dbInstance
        .prepare(
          `
        SELECT DISTINCT factura_id
        FROM factura_items
        WHERE producto_id = @productoId
      `
        )
        .all({ productoId });

      if (!facturasAfectadas.length) {
        return;
      }

      const detalleFacturaResultado = dbInstance
        .prepare(
          `
        DELETE FROM factura_items
        WHERE producto_id = @productoId
      `
        )
        .run({ productoId });

      summary.detalles.facturas += detalleFacturaResultado?.changes || 0;

      facturasAfectadas.forEach((row) => {
        const facturaId = row?.factura_id;
        if (!facturaId) {
          return;
        }

        const remaining = dbInstance
          .prepare(
            `
          SELECT COUNT(*) AS total
          FROM factura_items
          WHERE factura_id = @facturaId
        `
          )
          .get({ facturaId });

        if (!remaining || remaining.total === 0) {
          dbInstance.prepare('DELETE FROM facturas WHERE id = @facturaId').run({ facturaId });
          summary.facturasEliminadas.push(facturaId);
          return;
        }

        const totals = dbInstance
          .prepare(
            `
          SELECT COALESCE(SUM(precio_total), 0) AS subtotal
          FROM factura_items
          WHERE factura_id = @facturaId
        `
          )
          .get({ facturaId });

        const subtotal = Number(totals?.subtotal || 0);

        dbInstance
          .prepare(
            `
          UPDATE facturas
          SET subtotal_iva = @subtotal,
              subtotal_cero = 0,
              iva = 0,
              total = @subtotal,
              updated_at = @updated
          WHERE id = @facturaId
        `
          )
          .run({ subtotal, updated: now, facturaId });

        summary.facturasActualizadas.push(facturaId);
      });
    });

    safeTableOperation(dbInstance, 'compras_detalle', () => {
      const negocioFilter = negocioId ? 'AND (negocio_id = @negocioId OR negocio_id IS NULL)' : '';
      const params = { productoId };
      if (negocioId) params.negocioId = negocioId;

      const result = dbInstance
        .prepare(
          `
        UPDATE compras_detalle
        SET producto_id = NULL
        WHERE producto_id = @productoId
        ${negocioFilter}
      `
        )
        .run(params);

      summary.detalles.compras += result?.changes || 0;
    });

    safeTableOperation(dbInstance, 'ordenes_trabajo_repuestos', () => {
      const params = { productoId };
      let query =
        'UPDATE ordenes_trabajo_repuestos SET producto_id = NULL WHERE producto_id = @productoId';
      if (negocioId) {
        params.negocioId = negocioId;
        query += ' AND negocio_id = @negocioId';
      }

      const result = dbInstance.prepare(query).run(params);
      summary.detalles.ordenesTrabajo += result?.changes || 0;
    });
  });

  transaction();

  return summary;
}

function normalizeProductLookup(value) {
  return (value || '').toString().trim().toLowerCase();
}

function buildProductCodeCandidate(raw) {
  if (!raw) {
    return null;
  }

  try {
    const ascii = raw
      .toString()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toUpperCase();

    if (!ascii) {
      return null;
    }

    return ascii.slice(0, 40);
  } catch (error) {
    return null;
  }
}

function generateUniqueProductCode(dbInstance, negocioId, preferredValues = []) {
  if (!dbInstance) {
    return `AUTO-${Date.now()}`;
  }

  const candidates = [];
  const seen = new Set();

  preferredValues.forEach((value) => {
    const candidate = buildProductCodeCandidate(value);
    if (candidate && !seen.has(candidate)) {
      candidates.push(candidate);
      seen.add(candidate);
    }
  });

  if (!candidates.length) {
    const fallback = buildProductCodeCandidate(`AUTO-${Date.now()}`);
    if (fallback) {
      candidates.push(fallback);
    }
  }

  const negocioCondition = negocioId ? 'AND (negocio_id = @negocioId OR negocio_id IS NULL)' : '';

  for (const baseCode of candidates) {
    if (!baseCode) continue;
    let attempt = baseCode;
    let suffix = 1;

    while (suffix < 1000) {
      const params = { code: attempt.toLowerCase(), negocioId: negocioId ?? null };
      const exists = dbInstance
        .prepare(`SELECT 1 FROM productos WHERE LOWER(codigo) = @code ${negocioCondition} LIMIT 1`)
        .get(params);

      if (!exists) {
        return attempt;
      }

      suffix += 1;
      const trimmedBase = baseCode.slice(0, Math.max(1, 40 - String(suffix).length - 1));
      attempt = `${trimmedBase}-${suffix}`;
    }
  }

  return `AUTO-${Date.now()}`;
}

function findExistingProductForCompraItem(dbInstance, negocioId, lookup = {}) {
  if (!dbInstance) {
    return null;
  }

  const negocioCondition = negocioId ? 'AND (negocio_id = @negocioId OR negocio_id IS NULL)' : '';

  if (lookup.codigo) {
    const params = {
      codigo: lookup.codigo.toLowerCase(),
      negocioId: negocioId ?? null,
    };

    const row = dbInstance
      .prepare(
        `SELECT * FROM productos WHERE LOWER(codigo) = @codigo ${negocioCondition} ORDER BY updated_at DESC LIMIT 1`
      )
      .get(params);

    if (row) {
      return row;
    }
  }

  if (lookup.nombre) {
    const params = {
      nombre: lookup.nombre,
      negocioId: negocioId ?? null,
    };

    const row = dbInstance
      .prepare(
        `SELECT * FROM productos WHERE LOWER(nombre) = @nombre ${negocioCondition} ORDER BY updated_at DESC LIMIT 1`
      )
      .get(params);

    if (row) {
      return row;
    }
  }

  return null;
}

function normalizeDocumentIdentifier(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value.replace(/[^0-9a-zA-Z]/g, '').trim();
  }
  return String(value)
    .replace(/[^0-9a-zA-Z]/g, '')
    .trim();
}

function findProveedorByData(dbInstance, negocioId, data = {}) {
  if (!dbInstance) {
    return null;
  }

  const identificacion = normalizeDocumentIdentifier(
    data.identificacion || data.ruc || data.numero || ''
  );
  const nombre = typeof data.nombre === 'string' ? data.nombre.trim().toLowerCase() : '';

  const paramsBase = { negocioId: negocioId ?? null };
  const negocioCondition = negocioId ? 'AND (negocio_id = @negocioId OR negocio_id IS NULL)' : '';

  if (identificacion) {
    try {
      const row = dbInstance
        .prepare(
          `
          SELECT id, nombre, ruc
          FROM proveedores
          WHERE REPLACE(REPLACE(REPLACE(IFNULL(ruc, ''), '-', ''), ' ', ''), '.', '') = @identificacion
            ${negocioCondition}
          ORDER BY updated_at DESC
          LIMIT 1
        `
        )
        .get({ ...paramsBase, identificacion });
      if (row) {
        return row;
      }
    } catch (error) {
      console.warn('No se pudo buscar proveedor por identificación:', error.message);
    }
  }

  if (nombre) {
    try {
      const row = dbInstance
        .prepare(
          `
          SELECT id, nombre, ruc
          FROM proveedores
          WHERE LOWER(nombre) = @nombre
            ${negocioCondition}
          ORDER BY updated_at DESC
          LIMIT 1
        `
        )
        .get({ ...paramsBase, nombre });
      if (row) {
        return row;
      }
    } catch (error) {
      console.warn('No se pudo buscar proveedor por nombre:', error.message);
    }
  }

  return null;
}

function findCategoriaByName(dbInstance, negocioId, nombre) {
  if (!dbInstance || !nombre) {
    return null;
  }

  const normalized = nombre.toString().trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const params = { nombre: normalized, negocioId: negocioId ?? null };
  const negocioCondition = negocioId ? 'AND (negocio_id = @negocioId OR negocio_id IS NULL)' : '';

  try {
    const row = dbInstance
      .prepare(
        `
        SELECT id, nombre
        FROM categorias
        WHERE LOWER(nombre) = @nombre
          ${negocioCondition}
        ORDER BY updated_at DESC
        LIMIT 1
      `
      )
      .get(params);
    return row || null;
  } catch (error) {
    console.warn('No se pudo buscar categoría por nombre:', error.message);
    return null;
  }
}

function getCategoriaRowById(dbInstance, categoriaId) {
  if (!dbInstance || !categoriaId) {
    return null;
  }

  try {
    return dbInstance
      .prepare('SELECT id, nombre FROM categorias WHERE id = ? LIMIT 1')
      .get(categoriaId);
  } catch (error) {
    console.warn('No se pudo obtener la categoría por id:', error.message);
    return null;
  }
}

function getProveedorRowById(dbInstance, proveedorId) {
  if (!dbInstance || !proveedorId) {
    return null;
  }

  try {
    return dbInstance
      .prepare('SELECT id, nombre, ruc FROM proveedores WHERE id = ? LIMIT 1')
      .get(proveedorId);
  } catch (error) {
    console.warn('No se pudo obtener el proveedor por id:', error.message);
    return null;
  }
}

function enrichInvoiceItemsWithCatalog(dbInstance, negocioId, items, options = {}) {
  if (!dbInstance || !Array.isArray(items) || !items.length) {
    return Array.isArray(items) ? items : [];
  }

  const categoriaCache = new Map();
  const proveedorCache = new Map();

  const fetchCategoriaById = (id) => {
    if (!id) return null;
    const key = `id:${id}`;
    if (categoriaCache.has(key)) {
      return categoriaCache.get(key);
    }
    const row = getCategoriaRowById(dbInstance, id);
    categoriaCache.set(key, row || null);
    return row || null;
  };

  const fetchCategoriaByName = (nombre) => {
    if (!nombre) return null;
    const normalizedName = nombre.toString().trim().toLowerCase();
    if (!normalizedName) return null;
    const key = `name:${normalizedName}`;
    if (categoriaCache.has(key)) {
      return categoriaCache.get(key);
    }
    const row = findCategoriaByName(dbInstance, negocioId, nombre);
    categoriaCache.set(key, row || null);
    return row || null;
  };

  const fetchProveedorById = (id) => {
    if (!id) return null;
    const key = `id:${id}`;
    if (proveedorCache.has(key)) {
      return proveedorCache.get(key);
    }
    const row = getProveedorRowById(dbInstance, id);
    proveedorCache.set(key, row || null);
    return row || null;
  };

  const fetchProveedorByData = (identificacion, nombre) => {
    const normalizedDoc = normalizeDocumentIdentifier(identificacion || '');
    const normalizedName = typeof nombre === 'string' ? nombre.trim().toLowerCase() : '';
    const key = `lookup:${normalizedDoc}|${normalizedName}`;
    if (proveedorCache.has(key)) {
      return proveedorCache.get(key);
    }
    const row = findProveedorByData(dbInstance, negocioId, {
      identificacion: normalizedDoc,
      nombre: normalizedName,
    });
    proveedorCache.set(key, row || null);
    return row || null;
  };

  const defaultProveedorId = options.defaultProveedorId || null;
  const defaultProveedorNombre = options.defaultProveedorNombre || '';

  return items.map((rawItem) => {
    if (!rawItem || typeof rawItem !== 'object') {
      return rawItem;
    }

    const item = { ...rawItem };

    const codigoLookup =
      typeof item.codigo === 'string' || typeof item.codigo === 'number'
        ? String(item.codigo).trim()
        : '';
    const nombreLookup = normalizeProductLookup(item.nombre || item.productoNombre || '');

    let matchedProduct = null;
    if (codigoLookup) {
      matchedProduct = findExistingProductForCompraItem(dbInstance, negocioId, {
        codigo: codigoLookup,
      });
    }
    if (!matchedProduct && nombreLookup) {
      matchedProduct = findExistingProductForCompraItem(dbInstance, negocioId, {
        nombre: nombreLookup,
      });
    }

    if (matchedProduct) {
      item.productoId = matchedProduct.id;
      item.productoCodigo = matchedProduct.codigo || codigoLookup || null;
      item.categoriaId = item.categoriaId || matchedProduct.categoria_id || null;
      item.proveedorId = item.proveedorId || matchedProduct.proveedor_id || null;
    }

    if (item.categoriaId) {
      const categoria = fetchCategoriaById(item.categoriaId);
      if (categoria?.nombre) {
        item.categoriaNombre = item.categoriaNombre || categoria.nombre;
      }
    } else if (item.categoriaNombre) {
      const categoria = fetchCategoriaByName(item.categoriaNombre);
      if (categoria) {
        item.categoriaId = categoria.id;
        item.categoriaNombre = categoria.nombre;
      }
    }

    const proveedorDoc =
      item.proveedorIdentificacion || item.proveedorDocumento || item.identificacionProveedor || '';
    let proveedor = null;

    if (item.proveedorId) {
      proveedor = fetchProveedorById(item.proveedorId);
    } else if (proveedorDoc || item.proveedorNombre) {
      proveedor = fetchProveedorByData(proveedorDoc, item.proveedorNombre);
      if (proveedor?.id) {
        item.proveedorId = proveedor.id;
      }
    }

    if (!item.proveedorId && defaultProveedorId) {
      item.proveedorId = defaultProveedorId;
      proveedor = fetchProveedorById(defaultProveedorId) || proveedor;
    }

    if (item.proveedorId && !proveedor) {
      proveedor = fetchProveedorById(item.proveedorId);
    }

    if (proveedor) {
      item.proveedorNombre =
        item.proveedorNombre || proveedor.nombre || defaultProveedorNombre || null;
      if (!item.proveedorIdentificacion && proveedor.ruc) {
        item.proveedorIdentificacion = proveedor.ruc;
      }
    } else if (!item.proveedorNombre && defaultProveedorNombre) {
      item.proveedorNombre = defaultProveedorNombre;
    }

    if (!item.codigo && codigoLookup) {
      item.codigo = codigoLookup;
    }

    return item;
  });
}

function ensureDefaultCategoriaForCompras(dbInstance, negocioId) {
  if (!dbInstance) {
    return null;
  }

  try {
    const params = {};
    let query = 'SELECT id FROM categorias';
    if (negocioId) {
      query += ' WHERE negocio_id = @negocioId';
      params.negocioId = negocioId;
    }
    query += ' ORDER BY created_at ASC LIMIT 1';

    let row = dbInstance.prepare(query).get(params);
    if (row?.id) {
      return row.id;
    }

    row = dbInstance.prepare('SELECT id FROM categorias ORDER BY created_at ASC LIMIT 1').get();
    if (row?.id) {
      return row.id;
    }

    const baseName = `Auto Facturas ${negocioId || 'global'}`;
    let nameAttempt = baseName;
    let suffix = 1;

    while (true) {
      const exists = dbInstance
        .prepare('SELECT 1 FROM categorias WHERE LOWER(nombre) = LOWER(?) LIMIT 1')
        .get(nameAttempt);
      if (!exists) {
        break;
      }
      nameAttempt = `${baseName} ${suffix}`;
      suffix += 1;
    }

    const categoriaId = generateId('cat');
    const now = new Date().toISOString();

    dbInstance
      .prepare(
        `
      INSERT INTO categorias (id, negocio_id, nombre, descripcion, created_at, updated_at)
      VALUES (@id, @negocio_id, @nombre, @descripcion, @created_at, @updated_at)
    `
      )
      .run({
        id: categoriaId,
        negocio_id: negocioId || null,
        nombre: nameAttempt,
        descripcion: 'Categoría generada automáticamente desde facturas/compras.',
        created_at: now,
        updated_at: now,
      });

    return categoriaId;
  } catch (error) {
    console.warn('No se pudo asegurar una categoría por defecto para compras:', error.message);
    return null;
  }
}

function ensureProductoForCompraItem(dbInstance, negocioId, item, context = {}) {
  if (!dbInstance || !item) {
    return { id: item?.productoId || null, created: false, row: null };
  }

  if (item.productoId) {
    return { id: item.productoId, created: false, row: null };
  }

  const nombreLookup = normalizeProductLookup(item.nombre || item.productoNombre);
  const codigoLookup = item.codigo ? item.codigo.toString().trim() : '';

  const existing = findExistingProductForCompraItem(dbInstance, negocioId, {
    codigo: codigoLookup,
    nombre: nombreLookup,
  });

  if (existing) {
    return { id: existing.id, created: false, row: existing };
  }

  const categoriaId =
    item.categoriaId ||
    context.categoriaId ||
    ensureDefaultCategoriaForCompras(dbInstance, negocioId) ||
    ensureDefaultCategoriaForCompras(dbInstance, null);

  const proveedorId = item.proveedorId || context.proveedorId || null;

  const codigo = generateUniqueProductCode(dbInstance, negocioId, [
    codigoLookup,
    item.nombre,
    context.numeroCompra ? `${context.numeroCompra}-${item.nombre}` : null,
  ]);

  const precioCompra = round2(normalizeNumber(item.precioUnitario, 0));
  const precioVentaBase = normalizeNumber(item.precioVenta, 0);
  const precioVenta =
    precioVentaBase > 0
      ? round2(precioVentaBase)
      : round2(precioCompra * (context.markupFactor || 1.25));

  const stockMinimo =
    Number.isFinite(item.cantidad) && item.cantidad > 0
      ? Math.max(1, Math.min(10, Math.round(item.cantidad / 2)))
      : 1;

  const descripcion =
    item.descripcion ||
    context.descripcionBase ||
    'Producto importado desde una factura de compra.';
  const nombreFinal = (item.nombre || item.productoNombre || codigo || 'Producto sin nombre')
    .toString()
    .trim();

  const now = new Date().toISOString();
  const productoId = generateId('prod');

  dbInstance
    .prepare(
      `
    INSERT INTO productos (
      id, negocio_id, codigo, nombre, descripcion, categoria_id, proveedor_id,
      precio_compra, precio_venta, stock, stock_minimo, activo, created_at, updated_at
    ) VALUES (
      @id, @negocio_id, @codigo, @nombre, @descripcion, @categoria_id, @proveedor_id,
      @precio_compra, @precio_venta, 0, @stock_minimo, 1, @created_at, @updated_at
    )
  `
    )
    .run({
      id: productoId,
      negocio_id: negocioId || null,
      codigo,
      nombre: nombreFinal,
      descripcion,
      categoria_id: categoriaId,
      proveedor_id: proveedorId,
      precio_compra: precioCompra,
      precio_venta: precioVenta,
      stock_minimo: stockMinimo,
      created_at: now,
      updated_at: now,
    });

  const productoRow = getProductoRowById(productoId, dbInstance, negocioId);

  return { id: productoId, created: true, row: productoRow };
}

function maybeCleanupProducto(dbInstance, productoId, negocioId, options = {}) {
  if (!dbInstance || !productoId) {
    return { skipped: true };
  }

  try {
    const productoRow = dbInstance
      .prepare('SELECT id, stock FROM productos WHERE id = ?')
      .get(productoId);

    if (!productoRow) {
      return { skipped: true };
    }

    if (!options.force && Number(productoRow.stock) > 0) {
      return { deleted: false, reason: 'stock-positive' };
    }

    const summary = getProductoReferenceSummary(dbInstance, productoId, negocioId);

    if (summary.totalBlocking === 0 && summary.totalSoft === 0) {
      purgeProductoReferences(dbInstance, productoId, negocioId);
      dbInstance.prepare('DELETE FROM productos WHERE id = ?').run(productoId);
      return { deleted: true };
    }

    return { deleted: false, summary };
  } catch (error) {
    console.warn('No se pudo limpiar el producto huérfano:', error.message);
    return { deleted: false, error };
  }
}

function cleanupOrphanProductos(dbInstance, negocioId, options = {}) {
  if (!dbInstance) {
    return { removed: [] };
  }

  const limit =
    Number.isFinite(options.limit) && options.limit > 0
      ? Math.min(Math.floor(options.limit), 500)
      : 100;

  const params = {
    limit,
    negocioId: negocioId ?? null,
  };

  const whereClause = negocioId ? '(negocio_id = @negocioId OR negocio_id IS NULL)' : '1=1';

  let candidates = [];

  try {
    candidates = dbInstance
      .prepare(
        `
      SELECT id, stock
      FROM productos
      WHERE ${whereClause}
        AND (stock <= 0 OR activo = 0 OR codigo GLOB '__arch__*')
      LIMIT @limit
    `
      )
      .all(params);
  } catch (error) {
    console.warn('No se pudieron obtener productos para limpieza automática:', error.message);
    return { removed: [] };
  }

  const removed = [];

  candidates.forEach((row) => {
    if (!row?.id) {
      return;
    }

    const result = maybeCleanupProducto(dbInstance, row.id, negocioId, {
      force: Number(row.stock) <= 0,
    });
    if (result.deleted) {
      removed.push(row.id);
    }
  });

  return { removed };
}

function countProductoReferences(dbInstance, mapping, productoId, negocioId) {
  if (!dbInstance || !mapping || !productoId) {
    return 0;
  }

  const whereParts = [`${mapping.column} = @productoId`];
  const params = { productoId };

  if (mapping.negocioScoped && negocioId) {
    whereParts.push('negocio_id = @negocioId');
    params.negocioId = negocioId;
  }

  const query = `SELECT COUNT(*) AS total FROM ${mapping.table} WHERE ${whereParts.join(' AND ')}`;

  try {
    const result = dbInstance.prepare(query).get(params);
    return result?.total ?? 0;
  } catch (error) {
    if (/no such table/i.test(error.message)) {
      return 0;
    }
    throw error;
  }
}

function getProductoReferenceSummary(dbInstance, productoId, negocioId) {
  const summary = {
    totalBlocking: 0,
    totalSoft: 0,
    blocking: [],
    soft: [],
    byTable: {},
  };

  PRODUCT_REFERENCE_MAPPINGS.forEach((mapping) => {
    const count = countProductoReferences(dbInstance, mapping, productoId, negocioId);
    summary.byTable[mapping.label] = {
      table: mapping.table,
      type: mapping.type,
      count,
    };

    if (mapping.type === 'blocking') {
      summary.totalBlocking += count;
      if (count > 0) {
        summary.blocking.push({ label: mapping.label, count });
      }
    } else {
      summary.totalSoft += count;
      if (count > 0) {
        summary.soft.push({ label: mapping.label, count });
      }
    }
  });

  return summary;
}

function buildArchivedDescription(currentDescription, originalCode, archivedAt, referenceSummary) {
  const baseDescription = typeof currentDescription === 'string' ? currentDescription.trim() : '';
  const lines = baseDescription ? [baseDescription] : [];
  const archivedDate = (archivedAt || new Date().toISOString()).split('T')[0];
  const metadataLine = `Archivado automáticamente el ${archivedDate} (código original: ${originalCode || 'sin código'})`;

  if (!baseDescription || !baseDescription.includes('Archivado automáticamente')) {
    lines.push(metadataLine);
  }

  const blockingDetails = Array.isArray(referenceSummary?.blocking)
    ? referenceSummary.blocking.filter((item) => item.count > 0)
    : [];

  if (blockingDetails.length) {
    const detailLine = `Referencias activas: ${blockingDetails.map((item) => `${item.count} ${item.label}`).join(', ')}`;
    if (!lines.includes(detailLine)) {
      lines.push(detailLine);
    }
  }

  return lines.join('\n\n').trim();
}

function archiveProductoRecord(dbInstance, productoRow, negocioId, referenceSummary) {
  if (!dbInstance || !productoRow) {
    return { changes: 0 };
  }

  const now = new Date().toISOString();
  const alreadyArchived = productoRow.codigo && productoRow.codigo.startsWith('__arch__');
  const archivedCode = alreadyArchived ? productoRow.codigo : `__arch__${productoRow.id}`;
  const descripcionArchivada = buildArchivedDescription(
    productoRow.descripcion,
    productoRow.codigo,
    now,
    referenceSummary
  );

  const stmt = dbInstance.prepare(`
    UPDATE productos
    SET activo = 0,
        stock = 0,
        codigo = @codigoArchivado,
        descripcion = @descripcionArchivada,
        updated_at = @updated_at
    WHERE id = @id AND negocio_id = @negocioId
  `);

  return stmt.run({
    codigoArchivado: archivedCode,
    descripcionArchivada,
    updated_at: now,
    id: productoRow.id,
    negocioId,
  });
}

function looksNumeric(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return true;
  if (typeof value !== 'string') return false;
  return /[0-9]/.test(value);
}

function fallbackDetectItems(structuredPages, plainText) {
  const results = [];

  const pushItem = (item) => {
    if (!item) return;
    if (!item.nombre) return;
    const cantidadValue = Number.isFinite(item.cantidad)
      ? item.cantidad
      : parseLocaleNumber(item.cantidad);
    const precioValue = Number.isFinite(item.precioUnitario)
      ? item.precioUnitario
      : parseLocaleNumber(item.precioUnitario);
    const subtotalValueRaw = Number.isFinite(item.subtotal)
      ? item.subtotal
      : parseLocaleNumber(item.subtotal);
    const cantidad = cantidadValue !== null && Number.isFinite(cantidadValue) ? cantidadValue : 1;
    const precioUnitario = precioValue !== null && Number.isFinite(precioValue) ? precioValue : 0;
    const subtotal =
      subtotalValueRaw !== null && Number.isFinite(subtotalValueRaw)
        ? subtotalValueRaw
        : Number((cantidad * precioUnitario).toFixed(4));
    results.push({
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      unidad: item.unidad || '',
      cantidad,
      precioUnitario,
      subtotal,
    });
  };

  (structuredPages || []).forEach((rows) => {
    rows.forEach((cells) => {
      const cleaned = cells.map((cell) => cell.replace(/\s+/g, ' ').trim()).filter(Boolean);
      if (cleaned.length < 2) return;

      const numericIndices = [];
      cleaned.forEach((cell, idx) => {
        if (looksNumeric(cell)) numericIndices.push(idx);
      });

      if (!numericIndices.length) return;

      const priceIndex = numericIndices[numericIndices.length - 1];
      const quantityIndex =
        numericIndices.length > 1 ? numericIndices[numericIndices.length - 2] : -1;

      const price = parseLocaleNumber(cleaned[priceIndex]);
      const quantity = quantityIndex >= 0 ? parseLocaleNumber(cleaned[quantityIndex]) : null;
      if (price === null) return;

      const nameSliceEnd = quantityIndex >= 0 ? quantityIndex : priceIndex;
      const name = cleaned.slice(0, nameSliceEnd).join(' ').trim();
      if (!name) return;

      const description =
        quantityIndex >= 0 && priceIndex - quantityIndex > 1
          ? cleaned
              .slice(quantityIndex + 1, priceIndex)
              .join(' ')
              .trim()
          : '';

      const cantidadValue = quantity !== null && Number.isFinite(quantity) ? quantity : 1;
      const subtotalValue = Number((cantidadValue * (price || 0)).toFixed(4));
      pushItem({
        nombre: name,
        descripcion: description,
        cantidad: cantidadValue,
        precioUnitario: price,
        subtotal: subtotalValue,
      });
    });
  });

  if (results.length) return results;

  const lines = (plainText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const simplePattern = /^(.+?)\s+([0-9][0-9\.,]*)\s+([0-9][0-9\.,]*)(?:\s+([0-9][0-9\.,]*))?$/;

  lines.forEach((line) => {
    const match = line.match(simplePattern);
    if (!match) return;
    const [, product, maybeQty, maybePrice, maybeSubtotal] = match;
    const price = parseLocaleNumber(maybeSubtotal || maybePrice);
    const quantity = parseLocaleNumber(maybeSubtotal ? maybePrice : maybeQty) || 1;
    if (price === null) return;
    const subtotal = maybeSubtotal ? parseLocaleNumber(maybeSubtotal) : null;
    pushItem({
      nombre: product,
      descripcion: '',
      cantidad: quantity,
      precioUnitario: price,
      subtotal,
    });
  });

  return results;
}

const HEADER_METADATA_KEYWORDS = [
  'ruc',
  'fecha',
  'hora',
  'numero',
  'número',
  'factura',
  'comprobante',
  'autorizacion',
  'autorización',
  'clave',
  'ambiente',
  'vencimiento',
  'caducidad',
  'cliente',
  'proveedor',
  'direccion',
  'dirección',
  'telefono',
  'teléfono',
  'correo',
  'email',
  'guia',
  'guía',
  'remision',
  'remisión',
  'orden',
  'pedido',
  'pago',
  'forma de pago',
  'metodo de pago',
  'serie',
  'secuencial',
  'codigo',
  'código',
  'cajero',
  'sucursal',
  'tipo',
  'observacion',
  'observación',
  'nota',
  'condicion',
  'condición',
  'termino',
  'término',
];

const MONTH_NAME_MAP = {
  enero: '01',
  feb: '02',
  febrero: '02',
  mar: '03',
  marzo: '03',
  abr: '04',
  abril: '04',
  may: '05',
  mayo: '05',
  jun: '06',
  junio: '06',
  jul: '07',
  julio: '07',
  ago: '08',
  agosto: '08',
  sep: '09',
  sept: '09',
  septiembre: '09',
  oct: '10',
  octubre: '10',
  nov: '11',
  noviembre: '11',
  dic: '12',
  diciembre: '12',
};

function toSafeString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return typeof value === 'string' ? value : String(value);
}

function stripDiacritics(text) {
  const safe = toSafeString(text);
  if (!safe) return '';
  try {
    return safe.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (error) {
    return safe;
  }
}

function normalizeLabel(text) {
  return stripDiacritics(text).toLowerCase();
}

function toFiniteNumberOr(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clampNumber(value, min, max, fallback) {
  const num = toFiniteNumberOr(value, fallback);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function parseConfigFloat(value, fallback, min, max) {
  return clampNumber(value, min, max, fallback);
}

function parseConfigInt(value, fallback, min, max) {
  const clamped = clampNumber(value, min, max, fallback);
  return Math.round(clamped);
}

function parseConfigBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on', 'si', 'sí'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseDateFromText(value) {
  const safeValue = toSafeString(value);
  if (!safeValue) return null;
  const trimmed = safeValue.trim();
  if (!trimmed) return null;

  const iso = trimmed.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (iso) {
    const year = iso[1];
    const month = iso[2].padStart(2, '0');
    const day = iso[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const dm = trimmed.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dm) {
    let [, day, month, year] = dm;
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const textMatch = trimmed.match(/(\d{1,2})\s+de\s+([a-zA-ZñÑ]+)\s+(?:de\s+)?(\d{2,4})/i);
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0');
    const monthKey = normalizeLabel(textMatch[2]).slice(0, 3);
    const mappedMonth = MONTH_NAME_MAP[monthKey];
    if (mappedMonth) {
      let year = textMatch[3];
      if (year.length === 2) {
        year = `20${year}`;
      }
      return `${year.padStart(4, '0')}-${mappedMonth}-${day}`;
    }
  }

  return null;
}

function isLikelyMetadataLabel(label) {
  if (!label) return false;
  const trimmed = label.trim();
  if (!trimmed) return false;

  const normalized = normalizeLabel(trimmed);
  const hasColon = trimmed.includes(':');
  const hasKeyword = HEADER_METADATA_KEYWORDS.some((keyword) => normalized.includes(keyword));
  const isDateToken =
    /(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/.test(trimmed);
  const isTimeToken = /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(trimmed);
  const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, '');
  const looksLikeDateFragment = !lettersOnly && /[\/\-]/.test(trimmed) && trimmed.length <= 10;
  const longDigits = hasColon && /\d{9,}/.test(trimmed.replace(/[^0-9]/g, ''));

  if (isDateToken || isTimeToken || looksLikeDateFragment || longDigits) {
    return true;
  }

  if (hasKeyword && (hasColon || normalized.length <= 40)) {
    return true;
  }

  return false;
}

function collectMetadataValue(item, valueFromLabel) {
  const candidates = [];
  const pushCandidate = (raw) => {
    if (raw === null || raw === undefined) return;
    const text = String(raw).trim();
    if (!text) return;
    if (!candidates.includes(text)) {
      candidates.push(text);
    }
  };

  pushCandidate(valueFromLabel);
  [
    'valor',
    'value',
    'dato',
    'detalle',
    'detalleLinea',
    'detalle_linea',
    'descripcion',
    'descripcion_larga',
    'unidad',
    'observacion',
    'comentario',
  ].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(item, key)) {
      pushCandidate(item[key]);
    }
  });
  ['cantidad', 'precioUnitario', 'precio_unitario', 'subtotal', 'total'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(item, key)) {
      pushCandidate(item[key]);
    }
  });

  const preferred = candidates.find((text) => !/^0(?:\.0+)?$/.test(text) && text !== '1');
  const selected = preferred || candidates[0] || '';
  if (typeof selected === 'string') {
    return selected.trim();
  }
  return String(selected);
}

function buildMetadataEntry(nombreOriginal, valueFromLabel, item) {
  const trimmedName = (nombreOriginal || '').trim();
  if (!trimmedName) return null;

  const colonIndex = trimmedName.indexOf(':');
  const hasColon = colonIndex >= 0;
  let label = hasColon ? trimmedName.slice(0, colonIndex).trim() : trimmedName;
  let metadataValue = collectMetadataValue(item, valueFromLabel);

  if (!metadataValue && !hasColon) {
    metadataValue = trimmedName;
  }

  const normalizedLabel = normalizeLabel(label || '');
  const isDateLike =
    /(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/.test(trimmedName);
  const isTimeLike = /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(trimmedName);
  const largeSerial =
    !/[a-zA-Z]/.test(trimmedName) && /\d{9,}/.test(trimmedName.replace(/[^0-9]/g, ''));

  if (!hasColon) {
    if (isDateLike && !normalizedLabel.includes('fecha')) {
      label = 'Fecha detectada';
      metadataValue = metadataValue || trimmedName;
    } else if (isTimeLike && !normalizedLabel.includes('hora')) {
      label = 'Hora detectada';
      metadataValue = metadataValue || trimmedName;
    } else if (largeSerial && !normalizedLabel) {
      label = 'Identificador detectado';
      metadataValue = metadataValue || trimmedName;
    }
  }

  metadataValue = toSafeString(metadataValue).trim();
  if (!metadataValue) {
    return null;
  }

  return {
    label: label || 'Dato detectado',
    value: metadataValue,
  };
}

function assignMetadataToInvoice(normalized, label, value) {
  const rawValue = toSafeString(value);
  if (!rawValue) return;
  const normalizedLabel = normalizeLabel(label);

  if (normalizedLabel.includes('ruc')) {
    normalized.proveedor = normalized.proveedor || {};
    if (!normalized.proveedor.ruc) {
      normalized.proveedor.ruc = rawValue.replace(/\s+/g, '');
    }
    return;
  }

  if (
    normalizedLabel.includes('factura') ||
    normalizedLabel.includes('comprobante') ||
    normalizedLabel.includes('numero') ||
    normalizedLabel.includes('número') ||
    normalizedLabel.includes('secuencial') ||
    normalizedLabel.includes('serie')
  ) {
    if (!normalized.numero_factura) {
      normalized.numero_factura = rawValue;
    }
    return;
  }

  if (normalizedLabel.includes('moneda')) {
    const currency = rawValue
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase()
      .slice(0, 8);
    if (currency) {
      normalized.moneda = currency;
    }
    return;
  }

  if (normalizedLabel.includes('fecha')) {
    const parsedDate = parseDateFromText(rawValue);
    if (parsedDate) {
      normalized.fecha = parsedDate;
    }
    return;
  }

  if (normalizedLabel.includes('hora')) {
    const timeMatch = rawValue.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2];
      const seconds = timeMatch[3] ? `:${timeMatch[3]}` : '';
      const ampm = timeMatch[4] ? timeMatch[4].replace(/\./g, '').toLowerCase() : '';
      if (ampm === 'pm' && hour < 12) {
        hour += 12;
      } else if (ampm === 'am' && hour === 12) {
        hour = 0;
      }
      normalized.hora = `${String(hour).padStart(2, '0')}:${minutes}${seconds}`;
    } else if (!normalized.hora) {
      normalized.hora = rawValue;
    }
    return;
  }

  if (normalizedLabel.includes('proveedor') && rawValue) {
    normalized.proveedor = normalized.proveedor || {};
    if (!normalized.proveedor.nombre) {
      normalized.proveedor.nombre = rawValue;
    }
    return;
  }
}

function dedupeMetadata(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }
    const labelRaw = entry.label ?? entry.nombre ?? '';
    const valueRaw = entry.value ?? entry.valor ?? '';
    const labelText = typeof labelRaw === 'string' ? labelRaw : String(labelRaw || '');
    const valueText = typeof valueRaw === 'string' ? valueRaw : String(valueRaw || '');
    if (!labelText.trim() || !valueText.trim()) {
      return false;
    }
    const key = `${normalizeLabel(labelText)}|${valueText.trim()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    entry.label = labelText.trim();
    entry.value = valueText.trim();
    return true;
  });
}

function extractQuantityAndName(nombre) {
  const safeNombre = toSafeString(nombre);
  if (!safeNombre) return { name: '' };
  const trimmed = safeNombre.trim();
  if (!trimmed) return { name: '' };

  const match = trimmed.match(
    /^(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:x|por|unidades?|uds?\.?|pz\.?|paquetes?)?\s+(.*)$/i
  );
  if (!match) {
    return { name: trimmed };
  }

  const candidateName = match[2].trim();
  if (!/[a-zA-Z]/.test(candidateName) || candidateName.length < 3) {
    return { name: trimmed };
  }

  const firstToken = candidateName.split(/\s+/)[0];
  if (!firstToken || firstToken.length <= 1) {
    return { name: trimmed };
  }

  const qty = parseLocaleNumber(match[1]);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { name: candidateName };
  }

  return {
    name: candidateName,
    quantity: qty,
  };
}

function generateDefaultDescription(nombre) {
  const safeNombre = toSafeString(nombre).trim();
  if (!safeNombre) return '';
  const words = safeNombre.split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length <= 4) {
    return words.join(' ');
  }
  const slice = words.slice(0, Math.min(words.length, 8));
  return slice.join(' ');
}

function normalizeInvoiceResult(parsedData, structuredPages, plainText) {
  if (!parsedData || typeof parsedData !== 'object') return parsedData;

  const normalized = { ...parsedData };
  const items = Array.isArray(normalized.items) ? normalized.items : [];
  const toNumber = (value) => {
    const parsed = parseLocaleNumber(value);
    return parsed !== null ? parsed : null;
  };

  const round2 = (value) => {
    if (value === null || value === undefined) return 0;
    return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
  };

  normalized.proveedor =
    normalized.proveedor && typeof normalized.proveedor === 'object'
      ? { ...normalized.proveedor }
      : {};

  normalized.moneda =
    typeof normalized.moneda === 'string' && normalized.moneda.trim()
      ? normalized.moneda.trim().toUpperCase()
      : 'USD';

  const totalNumber = toNumber(normalized.total);
  normalized.total = Number.isFinite(totalNumber) ? round2(totalNumber) : null;

  const subtotalNumber = toNumber(normalized.subtotal);
  normalized.subtotal = Number.isFinite(subtotalNumber) ? round2(subtotalNumber) : null;

  const ivaNumber = toNumber(normalized.iva);
  normalized.iva = Number.isFinite(ivaNumber) ? round2(ivaNumber) : null;

  const otrosNumber = toNumber(normalized.otrosImpuestos ?? normalized.otros_impuestos);
  normalized.otrosImpuestos = Number.isFinite(otrosNumber) ? round2(otrosNumber) : null;
  delete normalized.otros_impuestos;

  const metadataEntries = [];

  const processedItems = items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const nombreOriginal = (item.nombre || '').toString().trim();
      if (!nombreOriginal) return null;

      const colonIndex = nombreOriginal.indexOf(':');
      const label = colonIndex >= 0 ? nombreOriginal.slice(0, colonIndex).trim() : nombreOriginal;
      const valueFromLabel = colonIndex >= 0 ? nombreOriginal.slice(colonIndex + 1).trim() : '';

      if (isLikelyMetadataLabel(nombreOriginal)) {
        const metadataEntry = buildMetadataEntry(nombreOriginal, valueFromLabel, item);
        if (metadataEntry) {
          metadataEntries.push(metadataEntry);
          assignMetadataToInvoice(normalized, metadataEntry.label, metadataEntry.value);
        }
        return null;
      }

      const extract = extractQuantityAndName(nombreOriginal);
      let nombreLimpio = extract.name || nombreOriginal;
      let cantidadValue = toNumber(item.cantidad);
      if (
        extract.quantity &&
        (!Number.isFinite(cantidadValue) || Math.abs(cantidadValue - extract.quantity) > 0.01)
      ) {
        cantidadValue = extract.quantity;
      }

      const descripcion = typeof item.descripcion === 'string' ? item.descripcion.trim() : '';
      const unidad = typeof item.unidad === 'string' ? item.unidad.trim() : '';
      const precioValue = toNumber(item.precioUnitario ?? item.precio_unitario);
      const subtotalValue = toNumber(item.subtotal ?? item.total);

      return {
        clave: '',
        nombre: nombreLimpio,
        descripcion: descripcion || generateDefaultDescription(nombreLimpio),
        unidad,
        cantidad: cantidadValue,
        precioUnitario: precioValue,
        subtotal: subtotalValue,
        total: subtotalValue,
      };
    })
    .filter(Boolean);

  normalized.items = processedItems;
  normalized.metadata = metadataEntries;

  return normalized;
}

// Configuración de Multer para upload de facturas
const invoiceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const negocioFolder = String(
      req.negocioId || req.headers['x-negocio-id'] || req.user?.negocioId || 'global'
    );
    const dest = path.join(__dirname, 'uploads', negocioFolder, 'invoices');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const invoiceUpload = multer({
  storage: invoiceStorage,
  fileFilter: (req, file, cb) => {
    // Solo permitir archivos PDF
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se permiten archivos PDF para facturas'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // Límite de 10MB por factura
  },
});

// --- Endpoint para verificar API Key de Gemini ---
app.post('/api/verificar-apikey-gemini', authenticate, async (req, res) => {
  try {
    const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
    const requestedModel = typeof req.body?.model === 'string' ? req.body.model.trim() : '';

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó API Key.',
      });
    }

    // Validación básica del formato
    if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
      return res.status(400).json({
        success: false,
        message: 'El formato de la API Key no es válido. Debe comenzar con "AIza..."',
      });
    }

    // Importar GoogleGenerativeAI dinámicamente
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    const modelCandidates = [];
    if (requestedModel) {
      modelCandidates.push(requestedModel);
    }
    modelCandidates.push('gemini-2.5-flash', 'gemini-2.0-flash');
    const uniqueModels = [...new Set(modelCandidates.filter(Boolean))];

    let lastError = null;
    for (const modelId of uniqueModels) {
      try {
        console.log(`[API Key Verify] Verificando API Key con modelo ${modelId}...`);
        const model = genAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent(
          'Responde solo con "OK" si puedes leer este mensaje.'
        );
        const response = await result.response;
        const text = response.text();

        console.log('[API Key Verify] ✅ API Key válida. Respuesta:', text.substring(0, 50));
        return res.json({
          success: true,
          message: 'API Key válida y funcionando correctamente.',
          model: modelId,
          testResponse: text.substring(0, 100),
        });
      } catch (error) {
        lastError = { error, modelId };
        if (error.message?.includes('not found') || error.message?.includes('MODEL_NOT_FOUND')) {
          console.warn(`[API Key Verify] Modelo no disponible (${modelId}). Probando siguiente...`);
          continue;
        }
        throw error;
      }
    }

    if (lastError) {
      if (
        lastError.error?.message?.includes('not found') ||
        lastError.error?.message?.includes('MODEL_NOT_FOUND')
      ) {
        return res.status(400).json({
          success: false,
          message: `El modelo ${lastError.modelId} no está disponible para esta API. Intenta con gemini-2.5-flash o gemini-2.0-flash.`,
          details: lastError.error.message,
        });
      }
      throw lastError.error;
    }
  } catch (error) {
    console.error('[API Key Verify] ❌ Error:', error.message);

    let errorMessage = 'Error al verificar la API Key.';

    if (
      error.message?.includes('API_KEY_INVALID') ||
      error.message?.includes('API key not valid')
    ) {
      errorMessage = 'API Key inválida. Verifica que la clave sea correcta.';
    } else if (error.message?.includes('PERMISSION_DENIED')) {
      errorMessage = 'Permisos denegados. Verifica que la API Key tenga acceso a Gemini.';
    } else if (error.message?.includes('QUOTA_EXCEEDED')) {
      errorMessage = 'Cuota excedida. Has alcanzado el límite de uso de la API.';
    } else if (error.message?.includes('MODEL_NOT_FOUND')) {
      errorMessage = 'Modelo no encontrado. El modelo solicitado no está disponible.';
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      errorMessage = 'Error de red. Verifica tu conexión a internet.';
    }

    return res.status(400).json({
      success: false,
      message: errorMessage,
      details: error.message,
    });
  }
});

// --- Ruta Principal de Procesamiento (Gemini Standalone) ---
app.post(
  '/api/procesar-factura',
  authenticate,
  validateTenantAccess,
  criticalLimiter,
  invoiceUpload.single('factura'),
  async (req, res) => {
    let uploadedPath = req.file?.path;

    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: 'No se ha subido ningún archivo PDF.' });
      }

      const master = getMasterDB();
      const tenantDb = req.db;
      const negocioId = req.negocioId || req.headers['x-negocio-id'] || req.user?.negocioId || null;
      const featureState = readIaFeatureStateForNegocio(master, negocioId);

      if (!featureState?.facturas) {
        return res.status(403).json({
          success: false,
          message: 'El procesamiento inteligente de facturas está deshabilitado para este negocio.',
        });
      }

      const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          message: 'Ingresa tu API Key de Google Gemini para procesar la factura.',
        });
      }

      const globalIaConfig = readIaGlobalConfig(master);
      const modelFromBody = typeof req.body?.model === 'string' ? req.body.model.trim() : '';
      // "Elige automáticamente el mejor modelo" - Default to Gemini 2.5 Flash
      const model = modelFromBody || globalIaConfig?.model || 'gemini-2.5-flash';
      const temperature = parseConfigFloat(req.body?.temperature, 0.1, 0, 1);
      const topP = parseConfigFloat(req.body?.top_p, 0.95, 0, 1);
      const topK = parseConfigInt(req.body?.top_k, 40, 1, 128);
      const maxOutputTokens = parseConfigInt(
        req.body?.max_tokens,
        globalIaConfig?.maxTokens || 8192,
        512,
        32768
      );

      const pdfBuffer = fs.readFileSync(uploadedPath);
      const extracted = await runStandaloneGeminiExtraction(pdfBuffer, apiKey, {
        model,
        temperature,
        topP,
        topK,
        maxOutputTokens,
      });

      const normalized = normalizeInvoiceData(extracted);
      const validation = validateInvoiceData(normalized);

      const recordId = persistInvoiceExtractionRecord(tenantDb, {
        negocioId,
        user: req.user,
        model,
        normalized,
        validation,
        fileMeta: req.file,
      });

      res.json({
        success: true,
        extractionId: recordId,
        extractedData: normalized,
        rawText: JSON.stringify(normalized, null, 2),
        validation,
        diagnostics: {
          workflow: 'standalone-gemini',
          recordId,
          model,
          totalItems: Array.isArray(normalized.productos) ? normalized.productos.length : 0,
        },
      });
    } catch (error) {
      console.error('❌ Error en /api/procesar-factura (nuevo extractor):', error);
      let statusCode = error.statusCode || error.status || 500;
      let userMessage = error.message || 'No se pudo procesar la factura.';

      if (/api key/i.test(userMessage)) {
        statusCode = 401;
        userMessage = 'API Key de Gemini no configurada o inválida.';
      } else if (/quota/i.test(userMessage) || /cuota/i.test(userMessage)) {
        statusCode = 429;
        userMessage = 'Límite de cuota de la API excedido. Intenta más tarde.';
      } else if (/pdf/i.test(userMessage) && /texto/i.test(userMessage)) {
        statusCode = 422;
        userMessage = 'No se pudo leer el PDF. Asegúrate de que no esté protegido o corrupto.';
      }

      res.status(statusCode).json({
        success: false,
        message: userMessage,
      });
    } finally {
      if (uploadedPath && fs.existsSync(uploadedPath)) {
        try {
          fs.unlinkSync(uploadedPath);
        } catch (unlinkError) {
          console.warn('No se pudo eliminar el archivo temporal:', unlinkError);
        }
      }
    }
  }
);

const vehiclePhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const negocioFolder = sanitizeNegocioFolderName(
      req.negocioId || req.headers['x-negocio-id'] || req.user?.negocioId || 'global'
    );
    const dest = path.join(__dirname, 'uploads', negocioFolder, 'vehiculos');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `vehiculo-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const vehiclePhotosUpload = multer({
  storage: vehiclePhotoStorage,
  fileFilter: (req, file, cb) => {
    // Solo permitir imágenes
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten imágenes (JPEG, PNG, WebP)'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // Límite de 5MB por imagen
    files: 10, // Máximo 10 fotos por vehículo
  },
});

// Configuración para fotos de perfil
const profilePhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const negocioFolder = sanitizeNegocioFolderName(
      req.negocioId || req.user?.negocioId || req.headers['x-negocio-id'] || 'global'
    );
    const dest = path.join(__dirname, 'uploads', negocioFolder, 'perfiles');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const userId = req.user?.userId || 'unknown';
    cb(null, `perfil-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage: profilePhotoStorage,
  fileFilter: (req, file, cb) => {
    // Solo permitir imágenes para fotos de perfil
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten imágenes (JPEG, PNG, WebP) para foto de perfil'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 2 * 1024 * 1024, // Límite de 2MB para foto de perfil
  },
});

function mapConfigRows(rows) {
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

function normalizeModuleList(modules) {
  const normalized = [];
  const seen = new Set();

  const addModule = (value) => {
    const moduleId = (value || '').toString().trim();
    if (!moduleId || seen.has(moduleId)) {
      return;
    }
    seen.add(moduleId);
    normalized.push(moduleId);
  };

  if (Array.isArray(modules) && modules.length) {
    modules.forEach(addModule);
  } else {
    DEFAULT_BUSINESS_MODULES.forEach(addModule);
  }

  OBLIGATORY_MODULES.forEach(addModule);

  return normalized;
}

function mapUsuarioRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    nombre: row.nombre || null,
    email: row.email || null,
    rol: normalizeRole(row.rol),
    activo: row.activo === 1 || row.activo === true,
    ultimoAcceso: row.ultimo_acceso || row.ultimoAcceso || null,
    creadoEn: row.created_at || null,
    actualizadoEn: row.updated_at || null,
    debeCambiarPassword: row.requiere_cambio_password === 1,
  };
}

function mapNegocioRowWithConfig(row) {
  if (!row) {
    return null;
  }

  const configEntry = configNegocios.negocios.find((negocio) => negocio.id === row.id) || {};
  const activoFlag =
    configEntry.activo !== undefined ? !!configEntry.activo : row.estado === 'activo';
  const nombreComercial = configEntry.nombreComercial || row.nombre;
  const cachedConfigTienda =
    configEntry.configTienda && typeof configEntry.configTienda === 'object'
      ? { ...configEntry.configTienda }
      : null;
  const modulosNormalizados = normalizeModuleList(configEntry.modulos);

  return {
    id: row.id,
    nombre: row.nombre,
    nombreComercial,
    tipo: row.tipo,
    estado: row.estado,
    plan: row.plan,
    usuarios_max: row.usuarios_max,
    productos_max: row.productos_max,
    fecha_creacion: row.fecha_creacion,
    icono: configEntry.icono || 'fas fa-store',
    descripcion: configEntry.descripcion || '',
    modulos: modulosNormalizados,
    db_file: configEntry.db_file || `${row.id}.db`,
    activo: activoFlag,
    creado_en: configEntry.creado_en || row.created_at || row.fecha_creacion,
    config_origen: configEntry ? 'config_file' : 'database',
    configTienda: cachedConfigTienda,
  };
}

function generateId(prefix = 'id') {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${random}`;
}

// Helper para normalizar números con valor por defecto
function normalizeNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

// Helper para redondear a 2 decimales
function round2(value) {
  if (value === null || value === undefined) return 0;
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function mapClienteRow(row) {
  if (!row) return null;

  const totalComprado = normalizeNumber(row.total_comprado_sum ?? row.total_comprado, 0);
  const numeroCompras = normalizeNumber(row.numero_compras, 0);
  const ticketPromedio = numeroCompras > 0 ? Number((totalComprado / numeroCompras).toFixed(2)) : 0;
  const saldoPendiente = normalizeNumber(row.saldo_pendiente, 0);
  const limiteCredito = normalizeNumber(row.limite_credito, 0);

  return {
    id: row.id,
    nombre: row.nombre,
    cedula: row.cedula,
    telefono: row.telefono,
    email: row.email,
    direccion: row.direccion,
    ciudad: row.ciudad,
    categoria: row.categoria,
    notas: row.notas,
    activo: row.activo,
    negocio_id: row.negocio_id,
    negocioId: row.negocio_id,
    vehiculo_favorito_id: row.vehiculo_favorito_id,
    vehiculoFavoritoId: row.vehiculo_favorito_id,
    telegram_chat_id: row.telegram_chat_id,
    telegramChatId: row.telegram_chat_id,
    total_comprado: totalComprado,
    totalComprado,
    numero_compras: numeroCompras,
    numeroCompras,
    ultima_compra: row.ultima_compra,
    ultimaCompra: row.ultima_compra,
    ticket_promedio: ticketPromedio,
    ticketPromedio,
    saldo_pendiente: saldoPendiente,
    saldoPendiente,
    limite_credito: limiteCredito,
    limiteCredito,
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
  };
}

function buildClientesQuery({ negocioId, search, activo, order, limit }) {
  const conditions = [];
  const params = {};

  if (negocioId) {
    conditions.push('c.negocio_id = @negocioId');
    params.negocioId = negocioId;
  }

  if (activo === 0 || activo === 1) {
    conditions.push('c.activo = @activo');
    params.activo = activo;
  }

  if (search) {
    conditions.push(
      '(LOWER(c.nombre) LIKE @search OR LOWER(c.cedula) LIKE @search OR LOWER(c.telefono) LIKE @search)'
    );
    params.search = `%${search.toLowerCase()}%`;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderClause = 'ORDER BY LOWER(c.nombre) ASC';
  if (order === 'recientes') {
    orderClause = 'ORDER BY c.created_at DESC';
  } else if (order === 'ultimo_servicio') {
    orderClause = 'ORDER BY ultima_compra DESC';
  }

  const limitClause = Number.isFinite(limit) && limit > 0 ? `LIMIT ${Math.min(limit, 200)}` : '';

  const query = `
    SELECT
      c.id,
      c.nombre,
      c.cedula,
      c.telefono,
      c.email,
      c.direccion,
      c.ciudad,
      c.categoria,
      c.notas,
      c.total_comprado,
      c.activo,
      c.vehiculo_favorito_id,
      c.telegram_chat_id,
      c.created_at,
      c.updated_at,
      COALESCE(SUM(v.total), 0) AS total_comprado_sum,
      COUNT(DISTINCT v.id) AS numero_compras,
      MAX(v.fecha) AS ultima_compra,
      COALESCE(SUM(cxc.monto - cxc.monto_pagado), 0) AS saldo_pendiente,
      c.negocio_id
    FROM clientes c
    LEFT JOIN ventas v ON v.cliente_id = c.id AND v.negocio_id = c.negocio_id
    LEFT JOIN cuentas_por_cobrar cxc ON cxc.cliente_id = c.id AND cxc.estado IN ('pendiente', 'parcial') AND cxc.negocio_id = c.negocio_id
    ${whereClause}
    GROUP BY c.id
    ${orderClause}
    ${limitClause}
  `;

  return { query, params };
}

function getClienteById(id, dbInstance = db, negocioId = null) {
  const stmt = dbInstance.prepare(`
    SELECT
      c.id,
      c.negocio_id,
      c.nombre,
      c.cedula,
      c.telefono,
      c.email,
      c.direccion,
      c.ciudad,
      c.categoria,
      c.notas,
      c.total_comprado,
      c.activo,
      c.vehiculo_favorito_id,
      c.telegram_chat_id,
      c.created_at,
      c.updated_at,
      COALESCE(SUM(v.total), 0) AS total_comprado_sum,
      COUNT(DISTINCT v.id) AS numero_compras,
      MAX(v.fecha) AS ultima_compra,
      COALESCE(SUM(cxc.monto - cxc.monto_pagado), 0) AS saldo_pendiente
    FROM clientes c
    LEFT JOIN ventas v ON v.cliente_id = c.id AND v.negocio_id = c.negocio_id
    LEFT JOIN cuentas_por_cobrar cxc ON cxc.cliente_id = c.id AND cxc.estado IN ('pendiente', 'parcial') AND cxc.negocio_id = c.negocio_id
    WHERE c.id = @id
    ${negocioId ? 'AND c.negocio_id = @negocioId' : ''}
    GROUP BY c.id
  `);
  const row = stmt.get(negocioId ? { id, negocioId } : { id });
  return mapClienteRow(row);
}

function mapVehiculoRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    negocio_id: row.negocio_id,
    negocioId: row.negocio_id,
    cliente_id: row.cliente_id,
    clienteId: row.cliente_id,
    cliente_nombre: row.cliente_nombre,
    clienteNombre: row.cliente_nombre,
    marca: row.marca,
    modelo: row.modelo,
    anio: row.anio,
    placa: row.placa,
    vin: row.vin,
    color: row.color,
    kilometraje: normalizeNumber(row.kilometraje, 0),
    fecha_ultimo_servicio: row.fecha_ultimo_servicio,
    fechaUltimoServicio: row.fecha_ultimo_servicio,
    notas: row.notas,
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
  };
}

function buildVehiculosQuery({ negocioId, search, clienteId, limit }) {
  const conditions = [];
  const params = {};

  if (negocioId) {
    conditions.push('v.negocio_id = @negocioId');
    params.negocioId = negocioId;
  }

  if (clienteId) {
    conditions.push('v.cliente_id = @clienteId');
    params.clienteId = clienteId;
  }

  if (search) {
    conditions.push(`(
      UPPER(v.placa) LIKE @search OR
      LOWER(v.marca) LIKE @searchLower OR
      LOWER(v.modelo) LIKE @searchLower
    )`);
    params.search = `%${search.toUpperCase()}%`;
    params.searchLower = `%${search.toLowerCase()}%`;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = Number.isFinite(limit) && limit > 0 ? `LIMIT ${Math.min(limit, 200)}` : '';

  const query = `
    SELECT
      v.id,
      v.cliente_id,
      v.marca,
      v.modelo,
      v.anio,
      v.placa,
      v.vin,
      v.color,
      v.kilometraje,
      v.fecha_ultimo_servicio,
      v.notas,
      v.created_at,
      v.updated_at,
      c.nombre AS cliente_nombre,
      v.negocio_id
    FROM vehiculos v
    JOIN clientes c ON c.id = v.cliente_id AND c.negocio_id = v.negocio_id
    ${whereClause}
    ORDER BY v.created_at DESC
    ${limitClause}
  `;

  return { query, params };
}

function getVehiculoById(id, dbInstance = db, negocioId = null) {
  const stmt = dbInstance.prepare(`
    SELECT
      v.id,
      v.negocio_id,
      v.cliente_id,
      v.marca,
      v.modelo,
      v.anio,
      v.placa,
      v.vin,
      v.color,
      v.kilometraje,
      v.fecha_ultimo_servicio,
      v.notas,
      v.created_at,
      v.updated_at,
      c.nombre AS cliente_nombre
    FROM vehiculos v
    JOIN clientes c ON c.id = v.cliente_id AND c.negocio_id = v.negocio_id
    WHERE v.id = @id
    ${negocioId ? 'AND v.negocio_id = @negocioId' : ''}
  `);
  const row = stmt.get(negocioId ? { id, negocioId } : { id });
  return mapVehiculoRow(row);
}

function toBooleanFlag(value) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['1', 'true', 'yes', 'si', 'sí'].includes(normalized);
  }
  return false;
}

const ORDEN_TRABAJO_ESTADOS_VALIDOS = new Set([
  'recibido',
  'en_proceso',
  'espera_repuestos',
  'finalizado',
  'entregado',
  'cancelado',
]);

function mapOrdenTrabajoRow(row) {
  if (!row) {
    return null;
  }

  const requiereContacto = toBooleanFlag(row.requiere_contacto);
  const notificarAvances = toBooleanFlag(row.notificar_avances);
  const presupuestoEstimado =
    row.presupuesto_estimado !== null && row.presupuesto_estimado !== undefined
      ? normalizeNumber(row.presupuesto_estimado, 0)
      : null;
  const kilometraje =
    row.kilometraje !== null && row.kilometraje !== undefined
      ? normalizeNumber(row.kilometraje, null)
      : null;

  return {
    id: row.id,
    numero: row.numero,
    cliente_id: row.cliente_id,
    clienteId: row.cliente_id,
    cliente_nombre: row.cliente_nombre || null,
    clienteNombre: row.cliente_nombre || null,
    cliente_telefono: row.cliente_telefono || row.cliente_contacto || null,
    clienteTelefono: row.cliente_telefono || row.cliente_contacto || null,
    cliente_email: row.cliente_email || null,
    clienteEmail: row.cliente_email || null,
    cliente_contacto: row.cliente_contacto || row.cliente_telefono || null,
    clienteContacto: row.cliente_contacto || row.cliente_telefono || null,
    vehiculo_id: row.vehiculo_id,
    vehiculoId: row.vehiculo_id,
    vehiculo_placa: row.vehiculo_placa || null,
    vehiculoPlaca: row.vehiculo_placa || null,
    vehiculo_marca: row.vehiculo_marca || null,
    vehiculoMarca: row.vehiculo_marca || null,
    vehiculo_modelo: row.vehiculo_modelo || null,
    vehiculoModelo: row.vehiculo_modelo || null,
    vehiculo_anio: row.vehiculo_anio || null,
    vehiculoAnio: row.vehiculo_anio || null,
    vehiculo_color: row.vehiculo_color || null,
    vehiculoColor: row.vehiculo_color || null,
    vehiculo_kilometraje: normalizeNumber(row.vehiculo_kilometraje, null),
    problema_reportado: row.problema_reportado || '',
    diagnostico_inicial: row.diagnostico_inicial || '',
    tecnico_asignado_id: row.tecnico_asignado_id || null,
    tecnicoAsignadoId: row.tecnico_asignado_id || null,
    tecnico_nombre: row.tecnico_nombre || null,
    tecnicoNombre: row.tecnico_nombre || null,
    estado: row.estado,
    prioridad: row.prioridad || 'normal',
    kilometraje,
    nivel_combustible: row.nivel_combustible || null,
    combustible: row.nivel_combustible || null,
    presupuesto_estimado: presupuestoEstimado,
    presupuestoEstimado,
    subtotal_servicios: normalizeNumber(row.subtotal_servicios, 0),
    subtotalServicios: normalizeNumber(row.subtotal_servicios, 0),
    subtotal_repuestos: normalizeNumber(row.subtotal_repuestos, 0),
    subtotalRepuestos: normalizeNumber(row.subtotal_repuestos, 0),
    descuento: normalizeNumber(row.descuento, 0),
    iva: normalizeNumber(row.iva, 0),
    total: normalizeNumber(row.total, 0),
    monto_pagado: normalizeNumber(row.monto_pagado, 0),
    montoPagado: normalizeNumber(row.monto_pagado, 0),
    observaciones: row.observaciones || '',
    observaciones_internas: row.observaciones_internas || '',
    observacionesInternas: row.observaciones_internas || '',
    instrucciones_cliente: row.instrucciones_cliente || '',
    instruccionesCliente: row.instrucciones_cliente || '',
    requiere_contacto: requiereContacto,
    requiereContacto,
    notificar_avances: notificarAvances,
    notificarAvances,
    fecha_recepcion: row.fecha_recepcion,
    fechaRecepcion: row.fecha_recepcion,
    fecha_entrega_estimada: row.fecha_entrega_estimada,
    fechaEntregaEstimada: row.fecha_entrega_estimada,
    fecha_entrega_real: row.fecha_entrega_real,
    fechaEntregaReal: row.fecha_entrega_real,
    ruta_factura: row.ruta_factura || null,
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
  };
}

function buildOrdenesTrabajoQuery({ estado, tecnicoId, fechaDesde, fechaHasta }) {
  const conditions = [];
  const params = {};

  if (estado && ORDEN_TRABAJO_ESTADOS_VALIDOS.has(estado)) {
    conditions.push('ot.estado = @estado');
    params.estado = estado;
  }

  if (tecnicoId) {
    conditions.push('ot.tecnico_asignado_id = @tecnicoId');
    params.tecnicoId = tecnicoId;
  }

  if (fechaDesde) {
    conditions.push('datetime(ot.fecha_recepcion) >= datetime(@fechaDesde)');
    params.fechaDesde = fechaDesde;
  }

  if (fechaHasta) {
    conditions.push('datetime(ot.fecha_recepcion) <= datetime(@fechaHasta)');
    params.fechaHasta = fechaHasta;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      ot.*,
      c.nombre AS cliente_nombre,
      c.telefono AS cliente_telefono,
      c.email AS cliente_email,
      v.placa AS vehiculo_placa,
      v.marca AS vehiculo_marca,
      v.modelo AS vehiculo_modelo,
      v.anio AS vehiculo_anio,
      v.color AS vehiculo_color,
      v.kilometraje AS vehiculo_kilometraje,
      t.nombre AS tecnico_nombre
    FROM ordenes_trabajo ot
    LEFT JOIN clientes c ON c.id = ot.cliente_id
    LEFT JOIN vehiculos v ON v.id = ot.vehiculo_id
    LEFT JOIN usuarios t ON t.id = ot.tecnico_asignado_id
    ${whereClause}
    ORDER BY datetime(ot.created_at) DESC
  `;

  return { query, params };
}

function getOrdenTrabajoRowById(id, dbInstance = db) {
  const stmt = dbInstance.prepare(`
    SELECT
      ot.*,
      c.nombre AS cliente_nombre,
      c.telefono AS cliente_telefono,
      c.email AS cliente_email,
      v.placa AS vehiculo_placa,
      v.marca AS vehiculo_marca,
      v.modelo AS vehiculo_modelo,
      v.anio AS vehiculo_anio,
      v.color AS vehiculo_color,
      v.kilometraje AS vehiculo_kilometraje,
      t.nombre AS tecnico_nombre
    FROM ordenes_trabajo ot
    LEFT JOIN clientes c ON c.id = ot.cliente_id
    LEFT JOIN vehiculos v ON v.id = ot.vehiculo_id
    LEFT JOIN usuarios t ON t.id = ot.tecnico_asignado_id
    WHERE ot.id = @id
  `);
  return stmt.get({ id });
}

function getOrdenTrabajoDetalle(id, dbInstance = db) {
  const row = getOrdenTrabajoRowById(id, dbInstance);
  if (!row) {
    return null;
  }

  const orden = mapOrdenTrabajoRow(row);

  const servicios = dbInstance
    .prepare(
      `
    SELECT id, servicio_nombre, descripcion, horas_labor, precio_hora, precio_total_servicio
    FROM ordenes_trabajo_servicios
    WHERE orden_id = ?
    ORDER BY id ASC
  `
    )
    .all(id);

  const repuestos = dbInstance
    .prepare(
      `
    SELECT id, producto_id, nombre_repuesto, cantidad, precio_unitario, precio_total_repuesto
    FROM ordenes_trabajo_repuestos
    WHERE orden_id = ?
    ORDER BY id ASC
  `
    )
    .all(id);

  const items = [];

  servicios.forEach((servicio) => {
    const cantidad = normalizeNumber(servicio.horas_labor, 1) || 1;
    const precioUnitario = normalizeNumber(servicio.precio_hora, servicio.precio_total_servicio);
    const total = normalizeNumber(servicio.precio_total_servicio, cantidad * precioUnitario);

    items.push({
      id: `serv_${servicio.id}`,
      tipo: 'servicio',
      descripcion: servicio.servicio_nombre,
      detalle: servicio.descripcion || '',
      cantidad,
      precio_unitario: precioUnitario,
      total,
    });
  });

  repuestos.forEach((repuesto) => {
    const cantidad = normalizeNumber(repuesto.cantidad, 1) || 1;
    const precioUnitario = normalizeNumber(
      repuesto.precio_unitario,
      repuesto.precio_total_repuesto
    );
    const total = normalizeNumber(repuesto.precio_total_repuesto, cantidad * precioUnitario);

    items.push({
      id: `rep_${repuesto.id}`,
      tipo: 'repuesto',
      descripcion: repuesto.nombre_repuesto,
      producto_id: repuesto.producto_id || null,
      cantidad,
      precio_unitario: precioUnitario,
      total,
    });
  });

  orden.items = items;
  orden.servicios = servicios;
  orden.repuestos = repuestos;

  return orden;
}

function generateOrdenTrabajoNumero(dbInstance = db) {
  const year = new Date().getFullYear();
  const prefix = `OT-${year}-`;
  const stmt = dbInstance.prepare(`
    SELECT numero
    FROM ordenes_trabajo
    WHERE numero LIKE @like
    ORDER BY numero DESC
    LIMIT 1
  `);
  const last = stmt.get({ like: `${prefix}%` });
  let sequence = 1;

  if (last && typeof last.numero === 'string') {
    const match = last.numero.match(/(\d+)$/);
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (Number.isFinite(parsed)) {
        sequence = parsed + 1;
      }
    }
  }

  return `${prefix}${String(sequence).padStart(3, '0')}`;
}

function normalizeOrderItems(rawItems) {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  const items = [];

  rawItems.forEach((item) => {
    if (!item) {
      return;
    }

    const descripcion = (item.descripcion || item.nombre || '').toString().trim();
    if (!descripcion) {
      return;
    }

    const tipo = (item.tipo || 'servicio').toString().trim().toLowerCase();
    const cantidad = normalizeNumber(item.cantidad, 1) || 1;
    const precioUnitario = normalizeNumber(item.precio_unitario ?? item.precioUnitario, 0);
    const total = normalizeNumber(item.total, cantidad * precioUnitario);

    items.push({
      tipo,
      descripcion,
      detalle: item.detalle || item.descripcion_larga || '',
      cantidad,
      precio_unitario: precioUnitario,
      total,
      producto_id: item.producto_id || item.productoId || null,
    });
  });

  return items;
}

function computeOrderTotals(items, ivaValue) {
  let subtotalServicios = 0;
  let subtotalRepuestos = 0;

  items.forEach((item) => {
    if (item.tipo === 'repuesto') {
      subtotalRepuestos += item.total;
    } else {
      subtotalServicios += item.total;
    }
  });

  const subtotal = subtotalServicios + subtotalRepuestos;
  const iva =
    ivaValue !== null && ivaValue !== undefined
      ? normalizeNumber(ivaValue, 0)
      : Number((subtotal * 0.12).toFixed(2));
  const total = Number((subtotal + iva).toFixed(2));

  return {
    subtotalServicios: Number(subtotalServicios.toFixed(2)),
    subtotalRepuestos: Number(subtotalRepuestos.toFixed(2)),
    subtotal,
    iva,
    total,
  };
}

function ensureVehiculoParaOrden(input, clienteId, negocioId, dbInstance = db) {
  const vehiculoId = input.vehiculoId || input.vehiculo_id || null;
  const placaRaw = input.vehiculoPlaca || input.vehiculo_placa || '';
  const placa = placaRaw ? placaRaw.toString().trim().toUpperCase() : '';
  const marca = (input.vehiculoMarca || input.vehiculo_marca || '').toString().trim();
  const modelo = (input.vehiculoModelo || input.vehiculo_modelo || '').toString().trim();
  const anio = input.vehiculoAnio || input.vehiculo_anio || null;
  const color = input.vehiculoColor || input.vehiculo_color || null;
  const kilometraje =
    input.kilometraje !== undefined ? normalizeNumber(input.kilometraje, null) : null;

  if (vehiculoId) {
    const existente = getRawVehiculo(vehiculoId, dbInstance, negocioId);
    if (!existente) {
      throw new Error('El vehículo seleccionado no existe.');
    }

    const needsUpdate = Boolean(
      (placa && placa !== (existente.placa || '').toUpperCase()) ||
        (marca && marca !== existente.marca) ||
        (modelo && modelo !== existente.modelo) ||
        (anio && anio !== existente.anio) ||
        (color && color !== existente.color) ||
        (kilometraje !== null && kilometraje !== undefined && kilometraje !== existente.kilometraje)
    );

    if (needsUpdate) {
      const record = buildVehiculoRecord(
        {
          ...existente,
          id: vehiculoId,
          cliente_id: existente.cliente_id,
          marca: marca || existente.marca,
          modelo: modelo || existente.modelo,
          anio: anio || existente.anio,
          placa: placa || existente.placa,
          color: color || existente.color,
          kilometraje: kilometraje !== null ? kilometraje : existente.kilometraje,
        },
        existente,
        negocioId
      );

      dbInstance
        .prepare(
          `
        UPDATE vehiculos SET
          negocio_id = @negocio_id,
          cliente_id = @cliente_id,
          marca = @marca,
          modelo = @modelo,
          anio = @anio,
          placa = @placa,
          vin = @vin,
          color = @color,
          kilometraje = @kilometraje,
          fecha_ultimo_servicio = @fecha_ultimo_servicio,
          notas = @notas,
          created_at = @created_at,
          updated_at = @updated_at
        WHERE id = @id AND negocio_id = @negocio_id
      `
        )
        .run(record);
    } else if (kilometraje !== null) {
      dbInstance
        .prepare(
          "UPDATE vehiculos SET kilometraje = @kilometraje, updated_at = datetime('now') WHERE id = @id AND negocio_id = @negocio_id"
        )
        .run({
          kilometraje,
          id: vehiculoId,
          negocio_id: negocioId,
        });
    }

    return { id: vehiculoId, created: false };
  }

  if (!placa || !marca || !modelo) {
    throw new Error('Proporciona placa, marca y modelo del vehículo.');
  }

  const existente = dbInstance
    .prepare(
      'SELECT id FROM vehiculos WHERE UPPER(placa) = @placa AND negocio_id = @negocioId LIMIT 1'
    )
    .get({ placa, negocioId });
  if (existente) {
    if (kilometraje !== null) {
      dbInstance
        .prepare(
          "UPDATE vehiculos SET kilometraje = @kilometraje, updated_at = datetime('now') WHERE id = @id AND negocio_id = @negocio_id"
        )
        .run({
          kilometraje,
          id: existente.id,
          negocio_id: negocioId,
        });
    }
    return { id: existente.id, created: false };
  }

  const record = buildVehiculoRecord(
    {
      cliente_id: clienteId,
      marca,
      modelo,
      anio,
      placa,
      color,
      kilometraje,
    },
    null,
    negocioId
  );

  dbInstance
    .prepare(
      `
    INSERT INTO vehiculos (
      id, negocio_id, cliente_id, marca, modelo, anio, placa, vin, color,
      kilometraje, fecha_ultimo_servicio, notas, created_at, updated_at
    ) VALUES (
      @id, @negocio_id, @cliente_id, @marca, @modelo, @anio, @placa, @vin, @color,
      @kilometraje, @fecha_ultimo_servicio, @notas, @created_at, @updated_at
    )
  `
    )
    .run(record);

  return { id: record.id, created: true };
}

function mapNotificacionRow(row) {
  if (!row) return null;
  const delivered = row.entregado === 1 || row.entregado === true;
  return {
    id: row.id,
    chat_id: row.chat_id,
    chatId: row.chat_id,
    cliente_id: row.cliente_id,
    clienteId: row.cliente_id,
    vehiculo_id: row.vehiculo_id,
    vehiculoId: row.vehiculo_id,
    tipo_servicio: row.tipo_servicio,
    tipoServicio: row.tipo_servicio,
    mensaje: row.mensaje,
    telegram_message_id: row.telegram_message_id,
    telegramMessageId: row.telegram_message_id,
    fecha_envio: row.fecha_envio,
    fechaEnvio: row.fecha_envio,
    entregado: delivered,
    entregadoRaw: delivered ? 1 : 0,
    tipo: row.tipo,
    created_at: row.created_at,
    createdAt: row.created_at,
  };
}

function buildNotificacionesQuery({
  fechaDesde,
  fechaHasta,
  chatId,
  clienteId,
  vehiculoId,
  tipo,
  limit,
}) {
  const conditions = [];
  const params = {};

  if (fechaDesde) {
    conditions.push('datetime(fecha_envio) >= datetime(@fechaDesde)');
    params.fechaDesde = fechaDesde;
  }

  if (fechaHasta) {
    conditions.push('datetime(fecha_envio) <= datetime(@fechaHasta)');
    params.fechaHasta = fechaHasta;
  }

  if (chatId) {
    conditions.push('chat_id = @chatId');
    params.chatId = chatId;
  }

  if (clienteId) {
    conditions.push('cliente_id = @clienteId');
    params.clienteId = clienteId;
  }

  if (vehiculoId) {
    conditions.push('vehiculo_id = @vehiculoId');
    params.vehiculoId = vehiculoId;
  }

  if (tipo) {
    conditions.push('(tipo = @tipo OR tipo_servicio = @tipo)');
    params.tipo = tipo;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitValue = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 200;

  const query = `
    SELECT
      id,
      chat_id,
      cliente_id,
      vehiculo_id,
      tipo_servicio,
      mensaje,
      telegram_message_id,
      fecha_envio,
      entregado,
      tipo,
      created_at
    FROM notificaciones_enviadas
    ${whereClause}
    ORDER BY datetime(fecha_envio) DESC, id DESC
    LIMIT ${limitValue}
  `;

  return { query, params };
}

function getRawCliente(id, dbInstance = db, negocioId = null) {
  if (negocioId) {
    return dbInstance
      .prepare('SELECT * FROM clientes WHERE id = ? AND negocio_id = ?')
      .get(id, negocioId);
  }
  return dbInstance.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
}

function getRawVehiculo(id, dbInstance = db, negocioId = null) {
  if (negocioId) {
    return dbInstance
      .prepare('SELECT * FROM vehiculos WHERE id = ? AND negocio_id = ?')
      .get(id, negocioId);
  }
  return dbInstance.prepare('SELECT * FROM vehiculos WHERE id = ?').get(id);
}

function buildClienteRecord(body, existing = null, negocioId = null) {
  const now = new Date().toISOString();
  const base = existing || {};
  const id = body?.id || base.id || generateId('cli');
  const nombre = (body?.nombre ?? base.nombre ?? '').toString().trim();

  if (!nombre) {
    throw new Error('El nombre del cliente es obligatorio.');
  }

  const record = {
    id,
    nombre,
    negocio_id: negocioId || base.negocio_id || body?.negocio_id || null,
    cedula:
      body?.cedula !== undefined ? (body.cedula ? body.cedula.trim() : null) : base.cedula || null,
    telefono:
      body?.telefono !== undefined
        ? body.telefono
          ? body.telefono.trim()
          : null
        : base.telefono || null,
    email: body?.email !== undefined ? (body.email ? body.email.trim() : null) : base.email || null,
    direccion:
      body?.direccion !== undefined
        ? body.direccion
          ? body.direccion.trim()
          : null
        : base.direccion || null,
    ciudad:
      body?.ciudad !== undefined ? (body.ciudad ? body.ciudad.trim() : null) : base.ciudad || null,
    categoria:
      body?.categoria !== undefined ? body.categoria || 'Regular' : base.categoria || 'Regular',
    notas: body?.notas !== undefined ? body.notas : base.notas || '',
    total_comprado: normalizeNumber(
      body?.totalComprado ?? body?.total_comprado ?? base.total_comprado ?? 0,
      0
    ),
    activo: body?.activo === undefined ? (base.activo ?? 1) : body.activo ? 1 : 0,
    vehiculo_favorito_id:
      body?.vehiculoFavoritoId ?? body?.vehiculo_favorito_id ?? base.vehiculo_favorito_id ?? null,
    telegram_chat_id:
      body?.telegramChatId ?? body?.telegram_chat_id ?? base.telegram_chat_id ?? null,
    created_at: base.created_at || body?.createdAt || body?.created_at || now,
    updated_at: now,
  };

  if (!record.negocio_id) {
    throw new Error('ID de negocio obligatorio para clientes.');
  }

  return record;
}

function buildVehiculoRecord(body, existing = null, negocioId = null) {
  const now = new Date().toISOString();
  const base = existing || {};
  const id = body?.id || base.id || generateId('veh');
  const clienteId = body?.cliente_id || body?.clienteId || base.cliente_id;

  if (!clienteId) {
    throw new Error('El ID del cliente es obligatorio para registrar un vehículo.');
  }

  const record = {
    id,
    negocio_id: negocioId || base.negocio_id || body?.negocio_id || null,
    cliente_id: clienteId,
    marca: (body?.marca ?? base.marca ?? '').toString().trim(),
    modelo: (body?.modelo ?? base.modelo ?? '').toString().trim(),
    anio:
      body?.anio !== undefined
        ? body.anio
          ? parseInt(body.anio, 10) || null
          : null
        : base.anio || null,
    placa:
      body?.placa !== undefined
        ? body.placa
          ? body.placa.toString().trim().toUpperCase()
          : null
        : base.placa || null,
    vin:
      body?.vin !== undefined
        ? body.vin
          ? body.vin.toString().trim().toUpperCase()
          : null
        : base.vin || null,
    color:
      body?.color !== undefined
        ? body.color
          ? body.color.toString().trim()
          : null
        : base.color || null,
    kilometraje:
      body?.kilometraje !== undefined
        ? normalizeNumber(body.kilometraje, 0)
        : normalizeNumber(base.kilometraje, 0),
    fecha_ultimo_servicio:
      body?.fechaUltimoServicio ??
      body?.fecha_ultimo_servicio ??
      base.fecha_ultimo_servicio ??
      null,
    notas: body?.notas !== undefined ? body.notas : base.notas || '',
    created_at: base.created_at || body?.createdAt || body?.created_at || now,
    updated_at: now,
  };

  if (!record.negocio_id) {
    throw new Error('ID de negocio obligatorio para vehículos.');
  }

  return record;
}

// ============================================
// SISTEMA DE MULTI-BASE DE DATOS
// ============================================
const DATA_DIR = path.join(__dirname, 'data');

// Variable db como fallback (apunta a masterDb)
let db = null;

const CONFIG_FILE = path.join(DATA_DIR, 'config_negocios.json');
const DEFAULT_DB_PATH = path.join(DATA_DIR, 'gestor_tienda.db');
const DB_PATH = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : DEFAULT_DB_PATH;
const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');
const ARCHIVE_UPLOADS_DIR = path.join(ARCHIVE_DIR, 'uploads');
const ARCHIVE_LOGS_DIR = path.join(ARCHIVE_DIR, 'logs');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const LOGS_DIR = path.join(__dirname, 'logs');
const HISTORIAL_SCHEMA_PATH = path.join(__dirname, 'schema_historial_productos.sql');

// Configuración de negocios
let configNegocios = {
  negocios: [],
  negocio_actual: null,
};

let historialSchemaSQL = null;

// Cargar o crear configuración de negocios
function loadConfigNegocios() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      configNegocios = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      console.log('✅ Configuración de negocios cargada');
    } catch (error) {
      console.warn('⚠️ Error cargando config_negocios.json, usando default');
    }
  } else {
    // Crear configuración por defecto
    saveConfigNegocios();
  }
}

function saveConfigNegocios() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configNegocios, null, 2));
    console.log('✅ Configuración de negocios guardada');
  } catch (error) {
    console.error('❌ Error guardando configuración:', error.message);
  }
}

function syncConfigNegociosWithMaster() {
  try {
    const master = getMasterDB();

    // Asegurar que las columnas existan en la tabla de negocios
    const negocioColumns = master
      .prepare('PRAGMA table_info(negocios)')
      .all()
      .map((c) => c.name);
    if (!negocioColumns.includes('icono')) {
      master.prepare("ALTER TABLE negocios ADD COLUMN icono TEXT DEFAULT 'fas fa-store'").run();
    }
    if (!negocioColumns.includes('descripcion')) {
      master.prepare("ALTER TABLE negocios ADD COLUMN descripcion TEXT DEFAULT ''").run();
    }
    if (!negocioColumns.includes('modulos')) {
      master.prepare("ALTER TABLE negocios ADD COLUMN modulos TEXT DEFAULT '[]'").run();
    }

    const existingRows = master
      .prepare(
        `
      SELECT id, nombre, tipo, estado, plan, usuarios_max, productos_max, fecha_creacion, created_at, icono, descripcion, modulos
      FROM negocios
    `
      )
      .all();

    const existingMap = new Map(existingRows.map((row) => [row.id, row]));
    let configModified = false;

    // Agregar negocios de la base maestra que no estén en la configuración
    existingRows.forEach((row) => {
      const existsInConfig = configNegocios.negocios.some((negocio) => negocio.id === row.id);
      if (!existsInConfig) {
        configNegocios.negocios.push({
          id: row.id,
          nombre: row.nombre,
          nombreComercial: row.nombre,
          db_file: `${row.id}.db`,
          icono: 'fas fa-store',
          descripcion: '',
          modulos: [],
          activo: row.estado === 'activo',
          creado_en: row.fecha_creacion || row.created_at || new Date().toISOString(),
          plan: row.plan,
          tipo: row.tipo,
          configTienda: null,
        });
        configModified = true;
      }
    });

    const PLAN_LIMITS = {
      gratis: { usuarios_max: 1, productos_max: 100 },
      basico: { usuarios_max: 3, productos_max: 500 },
      pro: { usuarios_max: 5, productos_max: 5000 },
      premium: { usuarios_max: 10, productos_max: 20000 },
      enterprise: { usuarios_max: 999, productos_max: 999999 },
    };

    const upsertStmt = master.prepare(`
      INSERT INTO negocios (id, nombre, tipo, estado, plan, usuarios_max, productos_max, fecha_creacion, created_at, updated_at)
      VALUES (@id, @nombre, @tipo, @estado, @plan, @usuarios_max, @productos_max, @fecha_creacion, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        nombre = excluded.nombre,
        tipo = excluded.tipo,
        estado = excluded.estado,
        plan = excluded.plan,
        updated_at = CURRENT_TIMESTAMP
    `);

    configNegocios.negocios = configNegocios.negocios.map((negocio) => {
      const existing = existingMap.get(negocio.id);
      const nombre = negocio.nombre || existing?.nombre || negocio.id;
      const tipo = (negocio.tipo || existing?.tipo || 'general').trim();
      const rawPlan = negocio.plan || existing?.plan || 'basico';
      const plan = rawPlan.toLowerCase();
      const estado = negocio.activo === false ? 'inactivo' : 'activo';
      const planLimits = PLAN_LIMITS[plan] || PLAN_LIMITS.basico;

      upsertStmt.run({
        id: negocio.id,
        nombre,
        tipo,
        estado,
        plan,
        usuarios_max: existing?.usuarios_max ?? planLimits.usuarios_max,
        productos_max: existing?.productos_max ?? planLimits.productos_max,
        fecha_creacion: existing?.fecha_creacion || negocio.creado_en || new Date().toISOString(),
      });

      if (
        negocio.plan !== plan ||
        negocio.tipo !== tipo ||
        negocio.activo !== (estado === 'activo') ||
        !negocio.db_file
      ) {
        configModified = true;
      }

      return {
        ...negocio,
        nombre,
        nombreComercial: negocio.nombreComercial || nombre,
        tipo,
        plan,
        activo: estado === 'activo',
        db_file: negocio.db_file || `${negocio.id}.db`,
        configTienda:
          negocio.configTienda && typeof negocio.configTienda === 'object'
            ? { ...negocio.configTienda }
            : null,
      };
    });

    if (!configNegocios.negocios.some((negocio) => negocio.id === configNegocios.negocio_actual)) {
      configNegocios.negocio_actual = configNegocios.negocios[0]?.id || null;
      configModified = true;
    }

    if (configModified) {
      saveConfigNegocios();
    }
  } catch (error) {
    console.warn(
      'No se pudo sincronizar la configuración de negocios con la base maestra:',
      error.message
    );
  }
}

function ensureNegocioModulesConsistency() {
  let configModified = false;
  let updateStmt = null;

  try {
    const master = getMasterDB();
    updateStmt = master.prepare(`
      UPDATE negocios
      SET modulos = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
  } catch (error) {
    console.warn('No se pudo preparar actualización de módulos de negocios:', error.message);
  }

  configNegocios.negocios = configNegocios.negocios.map((negocio) => {
    const normalizedModules = normalizeModuleList(negocio?.modulos);
    const currentModules = Array.isArray(negocio?.modulos)
      ? negocio.modulos.map((value) => (value || '').toString().trim()).filter(Boolean)
      : [];

    const hasDifference =
      normalizedModules.length !== currentModules.length ||
      normalizedModules.some((moduleId, index) => moduleId !== currentModules[index]);

    if (hasDifference) {
      configModified = true;
      if (updateStmt && negocio?.id) {
        try {
          updateStmt.run(JSON.stringify(normalizedModules), negocio.id);
        } catch (error) {
          console.warn(
            `No se pudieron sincronizar módulos para el negocio ${negocio.id}:`,
            error.message
          );
        }
      }
    }

    return {
      ...negocio,
      modulos: normalizedModules,
    };
  });

  if (configModified) {
    saveConfigNegocios();
  }
}

function ensureDirectory(dirPath) {
  if (!dirPath) {
    return;
  }
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const USER_SCHEMA_DEFINITIONS = [
  { name: 'telefono', definition: 'telefono TEXT' },
  { name: 'direccion', definition: 'direccion TEXT' },
  { name: 'ciudad', definition: 'ciudad TEXT' },
  { name: 'foto_perfil', definition: 'foto_perfil TEXT' },
  { name: 'telegram_chat_id', definition: 'telegram_chat_id TEXT' },
  { name: 'activo', definition: 'activo INTEGER DEFAULT 1' },
  { name: 'created_at', definition: "created_at TEXT DEFAULT (datetime('now'))" },
  { name: 'updated_at', definition: "updated_at TEXT DEFAULT (datetime('now'))" },
  { name: 'intentos_fallidos', definition: 'intentos_fallidos INTEGER DEFAULT 0' },
  { name: 'bloqueado_hasta', definition: 'bloqueado_hasta TEXT' },
  { name: 'token_recuperacion', definition: 'token_recuperacion TEXT' },
  { name: 'token_expiracion', definition: 'token_expiracion TEXT' },
  { name: 'ultimo_cambio_password', definition: 'ultimo_cambio_password TEXT' },
  { name: 'requiere_cambio_password', definition: 'requiere_cambio_password INTEGER DEFAULT 0' },
  { name: 'ultimo_acceso', definition: 'ultimo_acceso TEXT' },
  { name: 'negocios', definition: 'negocios TEXT' },
  { name: 'negocio_principal', definition: 'negocio_principal TEXT' },
];

function ensureUserTableSchema(dbInstance) {
  if (!dbInstance) {
    return;
  }

  try {
    const tableInfo = dbInstance.prepare('PRAGMA table_info(usuarios)').all();
    if (!tableInfo || !tableInfo.length) {
      return;
    }

    const columns = new Set(tableInfo.map((column) => column.name));

    for (const column of USER_SCHEMA_DEFINITIONS) {
      if (!columns.has(column.name)) {
        try {
          dbInstance.prepare(`ALTER TABLE usuarios ADD COLUMN ${column.definition}`).run();
          columns.add(column.name);
        } catch (alterError) {
          console.warn(
            `No se pudo agregar la columna ${column.name} a usuarios:`,
            alterError.message
          );
        }
      }
    }

    if (columns.has('debe_cambiar_password') && !columns.has('requiere_cambio_password')) {
      try {
        dbInstance
          .prepare('ALTER TABLE usuarios ADD COLUMN requiere_cambio_password INTEGER DEFAULT 0')
          .run();
      } catch (addError) {
        console.warn('No se pudo agregar columna requiere_cambio_password:', addError.message);
      }
      try {
        dbInstance
          .prepare(
            `
          UPDATE usuarios
          SET requiere_cambio_password = COALESCE(debe_cambiar_password, 0)
        `
          )
          .run();
      } catch (syncError) {
        console.warn('No se pudo sincronizar columna requiere_cambio_password:', syncError.message);
      }
    }
  } catch (schemaError) {
    console.warn('No se pudo verificar el esquema de usuarios:', schemaError.message);
  }
}

function sanitizeNegocioFolderName(rawValue) {
  if (!rawValue) {
    return 'global';
  }
  const cleaned = rawValue
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned || 'global';
}

function resolveStoredUploadPath(storedPath) {
  if (!storedPath || typeof storedPath !== 'string') {
    return null;
  }

  const normalized = storedPath.startsWith('/') ? storedPath.slice(1) : storedPath;
  return path.join(__dirname, normalized);
}

function isModernProfilePhotoPath(photoPath) {
  if (!photoPath || typeof photoPath !== 'string') {
    return false;
  }

  const normalized = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;
  const segments = normalized.split('/').filter(Boolean);
  return segments.length >= 4 && segments[0] === 'uploads' && segments[2] === 'perfiles';
}

function migrateLegacyProfilePhotos(dbInstance) {
  if (!dbInstance) {
    return;
  }

  try {
    const rows = dbInstance
      .prepare(
        `
      SELECT id, foto_perfil, negocio_principal
      FROM usuarios
      WHERE foto_perfil IS NOT NULL AND foto_perfil != ''
    `
      )
      .all();

    for (const row of rows) {
      const rawPath = (row.foto_perfil || '').trim();
      if (!rawPath || isModernProfilePhotoPath(rawPath)) {
        continue;
      }

      const sourcePath = resolveStoredUploadPath(rawPath);
      if (!sourcePath || !fs.existsSync(sourcePath)) {
        continue;
      }

      const negocioFolder = sanitizeNegocioFolderName(row.negocio_principal || 'global');
      const filename = path.basename(sourcePath);
      const destinationDir = path.join(__dirname, 'uploads', negocioFolder, 'perfiles');
      ensureDirectory(destinationDir);
      const destinationPath = path.join(destinationDir, filename);

      try {
        if (sourcePath !== destinationPath) {
          fs.renameSync(sourcePath, destinationPath);
        }
        const normalizedUrl = `/uploads/${negocioFolder}/perfiles/${filename}`;
        dbInstance
          .prepare(
            `
          UPDATE usuarios
          SET foto_perfil = ?, updated_at = datetime('now')
          WHERE id = ?
        `
          )
          .run(normalizedUrl, row.id);
      } catch (moveError) {
        console.warn(
          `No se pudo migrar la foto de perfil del usuario ${row.id}:`,
          moveError.message
        );
      }
    }
  } catch (migrationError) {
    console.warn('No se pudieron migrar las fotos de perfil legadas:', migrationError.message);
  }
}

function formatTimestampForFile() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ];
  return parts.join('');
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'si', 'sí', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function validateBusinessIdentifier(candidate) {
  if (typeof candidate !== 'string') {
    return { valid: false, id: '', message: 'El identificador del negocio es obligatorio.' };
  }

  const trimmed = candidate.trim();
  if (!trimmed.length) {
    return { valid: false, id: '', message: 'El identificador del negocio no puede estar vacío.' };
  }

  if (trimmed.length > 80) {
    return {
      valid: false,
      id: '',
      message: 'El identificador del negocio no puede superar los 80 caracteres.',
    };
  }

  if (/[\/\\:*?"<>|]/.test(trimmed)) {
    return {
      valid: false,
      id: '',
      message: 'El identificador del negocio no puede contener los caracteres \/:*?"<>|.',
    };
  }

  return { valid: true, id: trimmed };
}

function parseBusinessIdList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => item && item.toString().trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => item && item.toString().trim()).filter(Boolean);
      }
    } catch (error) {
      // Ignorar errores de parseo, probaremos con split convencional
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

// ============================================
// SISTEMA DE LOGS DEL SISTEMA
// ============================================

const LOG_MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const LOG_EXCLUDED_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/change-password',
  '/api/auth/first-login-change-password',
  '/api/logs/security',
]);

const LOG_SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'currentpassword',
  'newpassword',
  'contraseña',
  'token',
  'accesstoken',
  'refreshtoken',
  'api_key',
  'apikey',
  'secret',
  'clave',
  'archivo',
  'file',
  'documento',
  'imagen',
  'image',
  'content',
  'contenido',
]);

const LOG_PATH_TABLE_PATTERNS = [
  { regex: /^\/api\/clientes\b/, table: 'clientes' },
  { regex: /^\/api\/ventas\b/, table: 'ventas' },
  { regex: /^\/api\/productos\b/, table: 'productos' },
  { regex: /^\/api\/compras\b/, table: 'compras' },
  { regex: /^\/api\/proveedores\b/, table: 'proveedores' },
  { regex: /^\/api\/vehiculos\b/, table: 'vehiculos' },
  { regex: /^\/api\/ordenes[-_]?trabajo/, table: 'ordenes_trabajo' },
  { regex: /^\/api\/citas\b/, table: 'citas' },
  { regex: /^\/api\/usuarios\b/, table: 'usuarios' },
  { regex: /^\/api\/negocios\b/, table: 'negocios' },
  { regex: /^\/api\/configuracion\b/, table: 'configuracion_tienda' },
  { regex: /^\/api\/notificaciones/, table: 'notificaciones_enviadas' },
  { regex: /^\/api\/inventario\b/, table: 'productos' },
  { regex: /^\/api\/logs\/security\b/, table: 'seguridad' },
];

const LOG_ID_CANDIDATES = [
  'id',
  'clienteId',
  'cliente_id',
  'ventaId',
  'venta_id',
  'productoId',
  'producto_id',
  'vehiculoId',
  'vehiculo_id',
  'ordenId',
  'orden_id',
  'usuarioId',
  'usuario_id',
  'negocioId',
  'negocio_id',
  'registroId',
  'registro_id',
];

const initializedLogSchemas = new WeakSet();

function ensureLogsSchema(dbInstance) {
  if (!dbInstance || initializedLogSchemas.has(dbInstance)) {
    return;
  }

  try {
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS logs_sistema (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id TEXT,
        accion TEXT NOT NULL,
        tabla TEXT,
        registro_id TEXT,
        datos_anteriores TEXT,
        datos_nuevos TEXT,
        ip TEXT,
        user_agent TEXT,
        fecha TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs_sistema(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_logs_accion ON logs_sistema(accion);
      CREATE INDEX IF NOT EXISTS idx_logs_fecha ON logs_sistema(fecha);
    `);
    initializedLogSchemas.add(dbInstance);
  } catch (error) {
    console.warn('No se pudo asegurar la tabla logs_sistema:', error.message);
  }
}

function sanitizeLogPayload(value, depth = 0) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    return value.length > 500 ? `${value.slice(0, 497)}...` : value;
  }

  if (depth >= 3) {
    return '[truncado]';
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return [];
    }

    const limit = 10;
    return value.slice(0, limit).map((item) => sanitizeLogPayload(item, depth + 1));
  }

  if (typeof value === 'object') {
    if (typeof value.toJSON === 'function') {
      try {
        return sanitizeLogPayload(value.toJSON(), depth + 1);
      } catch (error) {
        return '[objeto no serializable]';
      }
    }

    const sanitized = {};
    for (const [key, raw] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase();
      if (LOG_SENSITIVE_KEYS.has(normalizedKey)) {
        sanitized[key] = '[redactado]';
        continue;
      }

      if (raw instanceof Buffer) {
        sanitized[key] = '[buffer]';
        continue;
      }

      if (raw && typeof raw === 'object' && typeof raw.pipe === 'function') {
        sanitized[key] = '[stream]';
        continue;
      }

      sanitized[key] = sanitizeLogPayload(raw, depth + 1);
    }
    return sanitized;
  }

  return '[valor no serializable]';
}

function stringifyLogData(payload) {
  if (payload === null || payload === undefined) {
    return null;
  }

  try {
    const serialized = JSON.stringify(payload);
    const maxLength = 6000;
    return serialized.length > maxLength ? `${serialized.slice(0, maxLength - 3)}...` : serialized;
  } catch (error) {
    return null;
  }
}

function extractRegistroIdFromRequest(req) {
  for (const key of LOG_ID_CANDIDATES) {
    if (req.params && Object.prototype.hasOwnProperty.call(req.params, key) && req.params[key]) {
      return String(req.params[key]);
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, key) && req.body[key]) {
      return String(req.body[key]);
    }
  }
  return null;
}

function inferLogTableFromPath(pathname) {
  if (!pathname || typeof pathname !== 'string') {
    return null;
  }

  const entry = LOG_PATH_TABLE_PATTERNS.find(({ regex }) => regex.test(pathname));
  return entry ? entry.table : null;
}

function extractClientIp(req) {
  const forwarded =
    typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : null;
  const ip = forwarded || req.ip || req.connection?.remoteAddress || null;
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }
  return ip;
}

function resolveLogDatabase(req) {
  if (req.db) {
    return req.db;
  }

  const candidates = [req.negocioId];

  if (req.user) {
    if (req.user.negocioId) {
      candidates.push(req.user.negocioId);
    }
    if (Array.isArray(req.user.negocios) && req.user.negocios.length) {
      candidates.push(req.user.negocios[0]);
    }
  }

  for (const candidate of candidates) {
    const normalized = normalizeNegocioId(candidate);
    if (!normalized) {
      continue;
    }

    try {
      return getDB(normalized);
    } catch (error) {
      // Ignorar y probar siguiente candidato
    }
  }

  return null;
}

function registerSystemLog(
  dbInstance,
  {
    usuarioId = null,
    accion,
    tabla = null,
    registroId = null,
    datosAnteriores = null,
    datosNuevos = null,
    ip = null,
    userAgent = null,
  }
) {
  if (!dbInstance || !accion) {
    return;
  }

  try {
    ensureLogsSchema(dbInstance);

    let usuarioIdFinal = usuarioId || null;
    if (usuarioIdFinal) {
      try {
        const existe = dbInstance
          .prepare('SELECT 1 FROM usuarios WHERE id = ? LIMIT 1')
          .get(usuarioIdFinal);
        if (!existe) {
          usuarioIdFinal = null;
        }
      } catch (error) {
        console.warn('No se pudo validar usuario para logs_sistema:', error.message);
        usuarioIdFinal = null;
      }
    }

    const stmt = dbInstance.prepare(`
      INSERT INTO logs_sistema (
        usuario_id,
        accion,
        tabla,
        registro_id,
        datos_anteriores,
        datos_nuevos,
        ip,
        user_agent,
        fecha
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      usuarioIdFinal,
      accion,
      tabla || null,
      registroId || null,
      datosAnteriores || null,
      datosNuevos || null,
      ip || null,
      userAgent || null
    );
  } catch (error) {
    console.warn('No se pudo registrar el log del sistema:', error.message);
  }
}

function safeUpdateNegocioId(master, tableName, columnName, oldId, newId) {
  if (!tableName || !columnName) {
    return;
  }

  try {
    master
      .prepare(`UPDATE ${tableName} SET ${columnName} = ? WHERE ${columnName} = ?`)
      .run(newId, oldId);
  } catch (error) {
    if (!/no such table/i.test(error.message)) {
      throw error;
    }
  }
}

const TENANT_RELATION_TABLES = [
  { table: 'usuarios_negocios', column: 'negocio_id' },
  { table: 'auditoria_negocios', column: 'negocio_id' },
  { table: 'usuario_modulos_permitidos', column: 'negocio_id' },
  { table: 'usuario_modulos_historial', column: 'negocio_id' },
  { table: 'negocios_archivo_historial', column: 'negocio_id' },
  { table: 'negocios_config_historial', column: 'negocio_id' },
  { table: 'negocio_plan_historial', column: 'negocio_id' },
];

function renameBusinessIdInMaster(master, oldId, newId) {
  const renameTx = master.transaction(() => {
    master.prepare('UPDATE negocios SET id = ? WHERE id = ?').run(newId, oldId);

    TENANT_RELATION_TABLES.forEach(({ table, column }) => {
      safeUpdateNegocioId(master, table, column, oldId, newId);
    });

    const usuarios = master.prepare('SELECT id, negocios, negocio_principal FROM usuarios').all();
    const updateUsuario = master.prepare(
      'UPDATE usuarios SET negocios = ?, negocio_principal = ? WHERE id = ?'
    );

    usuarios.forEach((usuario) => {
      const lista = parseBusinessIdList(usuario.negocios);
      const actualizada = lista.map((value) => (String(value) === String(oldId) ? newId : value));
      const principalActualizado =
        usuario.negocio_principal && String(usuario.negocio_principal) === String(oldId)
          ? newId
          : usuario.negocio_principal;

      const cambiosLista = JSON.stringify(lista) !== JSON.stringify(actualizada);
      const cambioPrincipal = principalActualizado !== usuario.negocio_principal;

      if (cambiosLista || cambioPrincipal) {
        updateUsuario.run(JSON.stringify(actualizada), principalActualizado, usuario.id);
      }
    });
  });

  renameTx();
}

function renameBusinessResources(oldId, newId) {
  const configIndex = configNegocios.negocios.findIndex((negocio) => negocio.id === oldId);
  if (configIndex === -1) {
    return;
  }

  const entry = { ...configNegocios.negocios[configIndex] };

  if (dbConnections.has(oldId)) {
    try {
      dbConnections.get(oldId)?.close();
    } catch (error) {
      console.warn(`No se pudo cerrar la conexión del negocio ${oldId}:`, error.message);
    }
    dbConnections.delete(oldId);
  }

  const currentDbFile =
    entry.db_file && entry.db_file.trim().length ? entry.db_file.trim() : `${oldId}.db`;
  const currentExtension = path.extname(currentDbFile) || '.db';
  const currentBaseName = path.basename(currentDbFile, currentExtension);
  const targetDbFile = currentBaseName === oldId ? `${newId}${currentExtension}` : currentDbFile;
  const oldDbPath = path.join(DATA_DIR, currentDbFile);
  const newDbPath = path.join(DATA_DIR, targetDbFile);

  if (oldDbPath !== newDbPath) {
    if (fs.existsSync(newDbPath)) {
      throw new Error(`Ya existe una base de datos para el negocio "${newId}".`);
    }

    if (fs.existsSync(oldDbPath)) {
      ensureDirectory(DATA_DIR);
      fs.renameSync(oldDbPath, newDbPath);
    }
  }

  const renameFolder = (rootDir) => {
    if (!rootDir) {
      return;
    }

    const oldPath = path.join(rootDir, oldId);
    const newPath = path.join(rootDir, newId);

    if (oldPath === newPath || !fs.existsSync(oldPath)) {
      return;
    }

    if (fs.existsSync(newPath)) {
      throw new Error(`Ya existe una carpeta de datos para el negocio "${newId}" en ${rootDir}.`);
    }

    ensureDirectory(rootDir);
    fs.renameSync(oldPath, newPath);
  };

  renameFolder(UPLOADS_DIR);
  renameFolder(LOGS_DIR);

  entry.id = newId;
  entry.db_file = targetDbFile;
  configNegocios.negocios[configIndex] = entry;

  if (configNegocios.negocio_actual === oldId) {
    configNegocios.negocio_actual = newId;
  }
}

// Conexiones de BD por tipo de negocio
const dbConnections = new Map();

function getTableColumns(db, tableName) {
  try {
    return db.prepare(`PRAGMA table_info(${tableName})`).all();
  } catch (error) {
    console.warn(`No se pudieron leer las columnas de ${tableName}:`, error.message);
    return [];
  }
}

function tableExists(db, tableName) {
  try {
    const result = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(tableName);
    return Boolean(result);
  } catch (error) {
    console.warn(`No se pudo verificar la existencia de la tabla ${tableName}:`, error.message);
    return false;
  }
}

function addColumnIfMissing(db, tableName, columnName, definition) {
  const columns = getTableColumns(db, tableName);
  if (!columns.some((column) => column.name === columnName)) {
    try {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
      console.log(`🔒 Columna agregada: ${tableName}.${columnName}`);
    } catch (error) {
      console.warn(`No se pudo agregar la columna ${columnName} a ${tableName}:`, error.message);
    }
  }
}

function ensureSecuritySchema(db) {
  if (!db) {
    return;
  }

  try {
    // Primero, asegurar que la tabla usuarios existe
    if (!tableExists(db, 'usuarios')) {
      console.log('⚠️ Tabla usuarios no existe, creándola...');
      db.exec(`
        CREATE TABLE usuarios (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          nombre TEXT,
          email TEXT,
          rol TEXT NOT NULL,
          telefono TEXT,
          direccion TEXT,
          ciudad TEXT,
          foto_perfil TEXT,
          telegram_chat_id TEXT,
          activo INTEGER NOT NULL DEFAULT 1,
          debe_cambiar_password INTEGER DEFAULT 0,
          ultimo_acceso TEXT,
          intentos_fallidos INTEGER DEFAULT 0,
          bloqueado_hasta TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
      console.log('✅ Tabla usuarios creada correctamente');
    }

    addColumnIfMissing(db, 'usuarios', 'debe_cambiar_password', 'INTEGER DEFAULT 0');
    addColumnIfMissing(db, 'usuarios', 'ultimo_acceso', 'TEXT');
    addColumnIfMissing(db, 'usuarios', 'intentos_fallidos', 'INTEGER DEFAULT 0');
    addColumnIfMissing(db, 'usuarios', 'bloqueado_hasta', 'TEXT');
    addColumnIfMissing(db, 'usuarios', 'created_at', "TEXT DEFAULT (datetime('now'))");
    addColumnIfMissing(db, 'usuarios', 'updated_at', "TEXT DEFAULT (datetime('now'))");

    db.exec(`
      CREATE TABLE IF NOT EXISTS auditoria_accesos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id TEXT,
        accion TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT,
        exitoso INTEGER DEFAULT 1,
        detalles TEXT,
        timestamp TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_accesos(usuario_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_auditoria_timestamp ON auditoria_accesos(timestamp)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria_accesos(accion)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo)');

    if (!tableExists(db, 'sesiones')) {
      db.exec(`
        CREATE TABLE sesiones (
          id TEXT PRIMARY KEY,
          usuario_id TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          refresh_token_jti TEXT UNIQUE,
          negocio_id TEXT,
          ip TEXT,
          user_agent TEXT,
          expires_at TEXT NOT NULL,
          expira_en TEXT,
          last_activity TEXT DEFAULT (datetime('now')),
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        )
      `);
    } else {
      addColumnIfMissing(db, 'sesiones', 'token', 'TEXT');
      addColumnIfMissing(db, 'sesiones', 'refresh_token_jti', 'TEXT');
      addColumnIfMissing(db, 'sesiones', 'negocio_id', 'TEXT');
      addColumnIfMissing(db, 'sesiones', 'ip', 'TEXT');
      addColumnIfMissing(db, 'sesiones', 'user_agent', 'TEXT');
      addColumnIfMissing(
        db,
        'sesiones',
        'expires_at',
        "TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))"
      );
      addColumnIfMissing(db, 'sesiones', 'expira_en', 'TEXT');
      addColumnIfMissing(db, 'sesiones', 'last_activity', "TEXT DEFAULT (datetime('now'))");
      addColumnIfMissing(db, 'sesiones', 'active', 'INTEGER NOT NULL DEFAULT 1');
      addColumnIfMissing(db, 'sesiones', 'created_at', "TEXT DEFAULT (datetime('now'))");
    }

    db.exec('CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones(usuario_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_sesiones_jti ON sesiones(refresh_token_jti)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_sesiones_activa ON sesiones(active)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_sesiones_expira ON sesiones(expira_en)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_sesiones_expires_at ON sesiones(expires_at)');
  } catch (error) {
    console.warn('No se pudo garantizar el esquema de seguridad:', error.message);
  }
}

function ensureIaConfigSchema(db) {
  if (!db) {
    return;
  }

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ia_global_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        provider TEXT NOT NULL DEFAULT 'gemini',
        api_key TEXT,
        model TEXT,
        base_url TEXT,
        temperature REAL DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 2000,
        updated_by TEXT,
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (updated_by) REFERENCES usuarios(id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS ia_feature_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        negocio_id TEXT NOT NULL,
        feature TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 0,
        updated_by TEXT,
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE (negocio_id, feature),
        FOREIGN KEY (updated_by) REFERENCES usuarios(id)
      )
    `);

    db.exec(`
      INSERT INTO ia_global_config (id, provider)
      SELECT 1, 'gemini'
      WHERE NOT EXISTS (SELECT 1 FROM ia_global_config WHERE id = 1)
    `);
  } catch (error) {
    console.warn('No se pudo garantizar el esquema de IA global:', error.message);
  }
}

function ensureVentasSchema(db) {
  if (!db) {
    return;
  }

  try {
    if (!tableExists(db, 'ventas')) {
      return;
    }

    addColumnIfMissing(db, 'ventas', 'hora', 'TEXT');

    db.prepare(
      `
      UPDATE ventas
      SET hora = COALESCE(
        NULLIF(hora, ''),
        strftime('%H:%M:%S', COALESCE(created_at, updated_at, datetime('now')))
      )
      WHERE hora IS NULL OR hora = ''
    `
    ).run();
  } catch (error) {
    console.warn('No se pudo garantizar el esquema de ventas:', error.message);
  }
}

function ensureComprasSchema(db) {
  if (!db) {
    return;
  }

  try {
    if (!tableExists(db, 'compras')) {
      return;
    }

    // Necesario para almacenar metadatos provenientes de facturas IA/PDF
    addColumnIfMissing(db, 'compras', 'metadata', 'TEXT');
  } catch (error) {
    console.warn('No se pudo garantizar el esquema de compras:', error.message);
  }
}

/**
 * Crea la tabla para citas del taller
 */
function ensureCitasSchema(db) {
  if (!db) {
    return;
  }

  try {
    // Primero intentar crear la tabla si no existe
    db.exec(`
      CREATE TABLE IF NOT EXISTS citas (
        id TEXT PRIMARY KEY,
        cliente_id TEXT,
        vehiculo_id TEXT,
        tipo_servicio TEXT DEFAULT 'general',
        fecha TEXT,
        hora TEXT,
        duracion INTEGER DEFAULT 60,
        tecnico_id TEXT,
        descripcion TEXT,
        notas TEXT,
        prioridad TEXT DEFAULT 'normal',
        recordatorio TEXT,
        estado TEXT DEFAULT 'programado',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Agregar columnas que pueden faltar en tablas existentes
    addColumnIfMissing(db, 'citas', 'negocio_id', 'TEXT');
    addColumnIfMissing(db, 'citas', 'cliente_nombre', 'TEXT');
    addColumnIfMissing(db, 'citas', 'cliente_telefono', 'TEXT');
    addColumnIfMissing(db, 'citas', 'vehiculo_placa', 'TEXT');
    addColumnIfMissing(db, 'citas', 'conversacion_id', 'TEXT');

    // Índices para búsqueda eficiente
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_citas_negocio ON citas(negocio_id)`);
    } catch (e) {}
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_citas_cliente_id ON citas(cliente_id)`);
    } catch (e) {}
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_citas_vehiculo_id ON citas(vehiculo_id)`);
    } catch (e) {}
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha)`);
    } catch (e) {}
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_citas_tecnico_id ON citas(tecnico_id)`);
    } catch (e) {}
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado)`);
    } catch (e) {}
  } catch (error) {
    console.warn('No se pudo garantizar el esquema de citas:', error.message);
  }
}

/**
 * Crea la tabla para recordatorios
 */
function ensureRecordatoriosSchema(db) {
  if (!db) {
    return;
  }

  try {
    // Primero intentar crear la tabla si no existe
    db.exec(`
      CREATE TABLE IF NOT EXISTS recordatorios (
        id TEXT PRIMARY KEY,
        titulo TEXT,
        descripcion TEXT,
        tipo TEXT DEFAULT 'general',
        fecha TEXT,
        hora TEXT,
        fecha_recordatorio TEXT,
        prioridad TEXT DEFAULT 'normal',
        recurrente TEXT DEFAULT 'ninguno',
        cliente_id TEXT,
        vehiculo_id TEXT,
        orden_trabajo_id TEXT,
        servicio_tipo TEXT,
        automatico INTEGER DEFAULT 0,
        icono TEXT,
        completado INTEGER DEFAULT 0,
        notificado INTEGER DEFAULT 0,
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Agregar columnas que pueden faltar en tablas existentes
    addColumnIfMissing(db, 'recordatorios', 'negocio_id', 'TEXT');
    addColumnIfMissing(db, 'recordatorios', 'fecha_recordatorio', 'TEXT');
    addColumnIfMissing(db, 'recordatorios', 'automatico', 'INTEGER DEFAULT 0');
    addColumnIfMissing(db, 'recordatorios', 'notificado', 'INTEGER DEFAULT 0');
    addColumnIfMissing(db, 'recordatorios', 'metadata', 'TEXT');

    // Índices para búsqueda eficiente
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_recordatorios_negocio ON recordatorios(negocio_id)`);
    } catch (e) {}
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha ON recordatorios(fecha)`);
    } catch (e) {}
    try {
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha_rec ON recordatorios(fecha_recordatorio)`
      );
    } catch (e) {}
    try {
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_recordatorios_completado ON recordatorios(completado)`
      );
    } catch (e) {}
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_recordatorios_cliente ON recordatorios(cliente_id)`);
    } catch (e) {}
    try {
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_recordatorios_vehiculo ON recordatorios(vehiculo_id)`
      );
    } catch (e) {}
  } catch (error) {
    console.warn('No se pudo garantizar el esquema de recordatorios:', error.message);
  }
}

/**
 * Crea la tabla para facturas pendientes de aprobar (extraídas por IA)
 * Estas facturas se guardan hasta que el usuario las apruebe o elimine
 */
function ensureFacturasPendientesSchema(db) {
  if (!db) {
    return;
  }

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS facturas_pendientes (
        id TEXT PRIMARY KEY,
        negocio_id TEXT,
        numero_factura TEXT,
        fecha TEXT,
        hora TEXT,
        proveedor_nombre TEXT,
        proveedor_ruc TEXT,
        proveedor_id TEXT,
        subtotal REAL DEFAULT 0,
        iva REAL DEFAULT 0,
        total REAL DEFAULT 0,
        items TEXT,
        pdf_base64 TEXT,
        pdf_nombre TEXT,
        pdf_size INTEGER,
        metadata TEXT,
        estado TEXT DEFAULT 'pendiente',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Índices para búsqueda eficiente
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_facturas_pendientes_negocio ON facturas_pendientes(negocio_id)`
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_facturas_pendientes_estado ON facturas_pendientes(estado)`
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_facturas_pendientes_numero ON facturas_pendientes(numero_factura)`
    );
  } catch (error) {
    console.warn('No se pudo garantizar el esquema de facturas pendientes:', error.message);
  }
}

function getHistorialSchemaSQL() {
  if (historialSchemaSQL !== null) {
    return historialSchemaSQL;
  }

  try {
    historialSchemaSQL = fs.readFileSync(HISTORIAL_SCHEMA_PATH, 'utf8');
  } catch (error) {
    const reason = error.code === 'ENOENT' ? 'archivo no encontrado' : error.message;
    console.warn(`⚠️ No se pudo cargar schema_historial_productos.sql (${reason}).`);
    historialSchemaSQL = '';
  }

  return historialSchemaSQL;
}

function ensureHistorialProductosSchema(db) {
  if (!db) {
    return;
  }

  try {
    const schemaSQL = getHistorialSchemaSQL();
    if (!schemaSQL) {
      if (!tableExists(db, 'historial_productos')) {
        console.warn('⚠️ Tabla historial_productos no existe y no se pudo aplicar el esquema.');
      }
      return;
    }

    db.exec(schemaSQL);
  } catch (error) {
    console.warn('No se pudo garantizar el esquema de historial de productos:', error.message);
  }
}

// Conexión a la base de datos principal (gestor_tienda.db)
const masterDb = new Database(DB_PATH);
masterDb.pragma('foreign_keys = ON');

// Asignar masterDb a db como fallback
db = masterDb;

ensureSecuritySchema(masterDb);
ensureUserTableSchema(masterDb);
ensureLogsSchema(masterDb);
ensureIaConfigSchema(masterDb);
ensureVentasSchema(masterDb);
ensureComprasSchema(masterDb);
ensureFacturasPendientesSchema(masterDb);
ensureHistorialProductosSchema(masterDb);
ensureCitasSchema(masterDb);
ensureRecordatoriosSchema(masterDb);
migrateLegacyProfilePhotos(masterDb);
console.log(`📂 Conexión principal establecida: ${DB_PATH}`);

// Inicializar Notification Hub global
let notificationHub = null;
global.notificationHub = null;

try {
  const notificationsDisabled =
    String(process.env.NOTIFICATION_HUB_DISABLED || '').toLowerCase() === 'true';
  if (!notificationsDisabled) {
    notificationHub = new NotificationHub(DB_PATH, {
      geminiApiKey: process.env.GEMINI_API_KEY,
      deepseekApiKey: process.env.DEEPSEEK_API_KEY,
      enableIA: String(process.env.NOTIFICATION_HUB_ENABLE_IA || '').toLowerCase() !== 'false',
    });
    global.notificationHub = notificationHub;

    // Inicializar Stock Alerter
    const stockAlerter = new StockAlerter(masterDb, notificationHub);
    stockAlerter.init();
  } else {
    console.warn(
      '⚠️ NotificationHub deshabilitado por configuración (NOTIFICATION_HUB_DISABLED=true)'
    );
  }
} catch (error) {
  console.error('❌ No se pudo inicializar NotificationHub:', error.message);
}

const TENANT_DATA_TABLES = [
  {
    name: 'categorias',
    indexes: ['CREATE INDEX IF NOT EXISTS idx_categorias_negocio ON categorias(negocio_id)'],
  },
  {
    name: 'proveedores',
    indexes: ['CREATE INDEX IF NOT EXISTS idx_proveedores_negocio ON proveedores(negocio_id)'],
  },
  {
    name: 'productos',
    indexes: ['CREATE INDEX IF NOT EXISTS idx_productos_negocio ON productos(negocio_id)'],
  },
  {
    name: 'clientes',
    indexes: ['CREATE INDEX IF NOT EXISTS idx_clientes_negocio ON clientes(negocio_id)'],
  },
  {
    name: 'vehiculos',
    indexes: ['CREATE INDEX IF NOT EXISTS idx_vehiculos_negocio ON vehiculos(negocio_id)'],
  },
  {
    name: 'ordenes_trabajo',
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_ordenes_trabajo_negocio ON ordenes_trabajo(negocio_id)',
    ],
  },
  {
    name: 'ordenes_trabajo_servicios',
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_ot_servicios_negocio ON ordenes_trabajo_servicios(negocio_id)',
    ],
  },
  {
    name: 'ordenes_trabajo_repuestos',
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_ot_repuestos_negocio ON ordenes_trabajo_repuestos(negocio_id)',
    ],
  },
  {
    name: 'ventas',
    indexes: ['CREATE INDEX IF NOT EXISTS idx_ventas_negocio ON ventas(negocio_id)'],
  },
  {
    name: 'ventas_detalle',
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_ventas_detalle_negocio ON ventas_detalle(negocio_id)',
    ],
  },
  {
    name: 'compras',
    indexes: ['CREATE INDEX IF NOT EXISTS idx_compras_negocio ON compras(negocio_id)'],
  },
  {
    name: 'compras_detalle',
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_compras_detalle_negocio ON compras_detalle(negocio_id)',
    ],
  },
  {
    name: 'cuentas_por_cobrar',
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_cuentas_cobrar_negocio ON cuentas_por_cobrar(negocio_id)',
    ],
  },
  {
    name: 'cuentas_por_pagar',
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_cuentas_pagar_negocio ON cuentas_por_pagar(negocio_id)',
    ],
  },
];

function ensureTenantNegocioMetadata(dbInstance, negocioId) {
  if (!dbInstance || !negocioId) {
    return;
  }

  try {
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS negocios (
        id TEXT PRIMARY KEY,
        nombre TEXT,
        tipo TEXT,
        estado TEXT DEFAULT 'activo',
        plan TEXT DEFAULT 'basico',
        usuarios_max INTEGER DEFAULT 1,
        productos_max INTEGER DEFAULT 100,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    const configEntry = configNegocios.negocios.find((negocio) => negocio.id === negocioId) || null;
    const payload = {
      id: negocioId,
      nombre: configEntry?.nombre || configEntry?.nombreComercial || negocioId,
      tipo: configEntry?.tipo || 'general',
      estado: configEntry?.activo === false ? 'inactivo' : 'activo',
      plan: configEntry?.plan || 'basico',
      usuariosMax: configEntry?.usuarios_max ?? 5,
      productosMax: configEntry?.productos_max ?? 1000,
    };

    const existing = dbInstance.prepare('SELECT id FROM negocios WHERE id = ?').get(negocioId);

    if (existing) {
      dbInstance
        .prepare(
          `
        UPDATE negocios
        SET nombre = @nombre,
            tipo = @tipo,
            estado = @estado,
            plan = @plan,
            usuarios_max = @usuariosMax,
            productos_max = @productosMax,
            updated_at = datetime('now')
        WHERE id = @id
      `
        )
        .run(payload);
    } else {
      dbInstance
        .prepare(
          `
        INSERT INTO negocios (id, nombre, tipo, estado, plan, usuarios_max, productos_max, created_at, updated_at)
        VALUES (@id, @nombre, @tipo, @estado, @plan, @usuariosMax, @productosMax, datetime('now'), datetime('now'))
      `
        )
        .run(payload);
    }
  } catch (error) {
    console.warn(`No se pudo garantizar metadata del negocio ${negocioId}:`, error.message);
  }
}

function ensureTenantDataModel(dbInstance, negocioId) {
  if (!negocioId) {
    return;
  }

  const sync = dbInstance.transaction(() => {
    TENANT_DATA_TABLES.forEach(({ name, indexes }) => {
      try {
        const columns = dbInstance.prepare(`PRAGMA table_info(${name})`).all();
        if (!Array.isArray(columns) || columns.length === 0) {
          return;
        }

        const hasNegocioColumn = columns.some((col) => col.name === 'negocio_id');
        if (!hasNegocioColumn) {
          dbInstance.prepare(`ALTER TABLE ${name} ADD COLUMN negocio_id TEXT`).run();
        }

        dbInstance
          .prepare(
            `UPDATE ${name} SET negocio_id = @negocioId WHERE negocio_id IS NULL OR negocio_id = ''`
          )
          .run({ negocioId });

        if (Array.isArray(indexes)) {
          indexes.forEach((sql) => {
            try {
              dbInstance.prepare(sql).run();
            } catch (indexError) {
              console.warn(`⚠️ No se pudo crear índice para ${name}:`, indexError.message);
            }
          });
        }
      } catch (tableError) {
        console.warn(`⚠️ No se pudo sincronizar tabla ${name}:`, tableError.message);
      }
    });
  });

  try {
    sync();
  } catch (error) {
    console.warn('⚠️ Error asegurando columnas negocio_id:', error.message);
  }

  ensureTenantNegocioMetadata(dbInstance, negocioId);
}

function getMasterDB() {
  return masterDb;
}

function getDBPath(negocioId) {
  const negocio = configNegocios.negocios.find((n) => n.id === negocioId);
  if (!negocio) {
    throw new Error(`Negocio no encontrado: ${negocioId}`);
  }
  return path.join(DATA_DIR, negocio.db_file);
}

function getDB(negocioId) {
  if (!dbConnections.has(negocioId)) {
    const dbPath = getDBPath(negocioId);

    // Crear BD si no existe
    if (!fs.existsSync(dbPath)) {
      console.log(`🔧 Creando nueva base de datos: ${negocioId}`);
      initializeBusinessDB(negocioId);
    }

    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    ensureSecuritySchema(db);
    ensureUserTableSchema(db);
    ensureLogsSchema(db);
    ensureVentasSchema(db);
    ensureComprasSchema(db);
    ensureFacturasPendientesSchema(db);
    ensureHistorialProductosSchema(db);
    ensureCitasSchema(db);
    ensureRecordatoriosSchema(db);
    ensureTenantDataModel(db, negocioId);
    dbConnections.set(negocioId, db);
    console.log(`📂 Conexión establecida: ${negocioId}`);
  }
  return dbConnections.get(negocioId);
}

function initializeBusinessDB(negocioId) {
  console.log(`🔧 Inicializando BD para: ${negocioId}`);
  const dbPath = getDBPath(negocioId);
  const schemaPath = path.join(__dirname, 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    console.error('❌ schema.sql no encontrado');
    return;
  }

  const db = new Database(dbPath);
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  ensureSecuritySchema(db);
  ensureUserTableSchema(db);
  ensureLogsSchema(db);
  ensureVentasSchema(db);
  ensureComprasSchema(db);
  ensureFacturasPendientesSchema(db);
  ensureHistorialProductosSchema(db);
  ensureCitasSchema(db);
  ensureRecordatoriosSchema(db);
  db.close();

  console.log(`✅ BD creada: ${dbPath}`);
}

function ensureBusinessDatabases() {
  try {
    for (const negocio of configNegocios.negocios) {
      const dbPath = path.join(DATA_DIR, negocio.db_file);
      if (!fs.existsSync(dbPath)) {
        console.log(`📥 Creando BD faltante para negocio: ${negocio.id}`);
        initializeBusinessDB(negocio.id);
      }

      try {
        const dbInstance = new Database(dbPath);
        dbInstance.pragma('foreign_keys = ON');
        ensureSecuritySchema(dbInstance);
        ensureUserTableSchema(dbInstance);
        ensureLogsSchema(dbInstance);
        ensureVentasSchema(dbInstance);
        ensureComprasSchema(dbInstance);
        ensureHistorialProductosSchema(dbInstance);
        ensureCitasSchema(dbInstance);
        ensureRecordatoriosSchema(dbInstance);
        ensureTenantDataModel(dbInstance, negocio.id);
        dbInstance.close();
      } catch (dbError) {
        console.warn(`⚠️ No se pudieron aplicar migraciones en ${negocio.id}:`, dbError.message);
      }
    }
  } catch (error) {
    console.warn('No se pudieron validar las bases de datos de negocios:', error.message);
  }
}

// Crear super admin por defecto si no existe ningún usuario (para producción)
async function ensureDefaultAdminForProduction() {
  try {
    const master = getMasterDB();
    
    // Primero verificar que exista la tabla negocios y tenga datos
    try {
      const negocioCount = master.prepare('SELECT COUNT(*) as count FROM negocios').get();
      if (negocioCount.count === 0) {
        console.log('🏪 No hay negocios. Creando negocio por defecto...');
        
        const negocioId = 'tienda_demo';
        master.prepare(`
          INSERT INTO negocios (id, nombre, tipo, estado, plan, icono, created_at, updated_at)
          VALUES (?, 'Tienda Demo', 'general', 'activo', 'basico', 'fas fa-store', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(negocioId);
        
        console.log('✅ Negocio demo creado: tienda_demo');
      }
    } catch (e) {
      console.log('ℹ️ Tabla negocios no disponible o vacía');
    }
    
    // Verificar si hay algún usuario en la BD
    const userCount = master.prepare('SELECT COUNT(*) as count FROM usuarios').get();
    
    if (userCount.count === 0) {
      console.log('🔐 No hay usuarios. Creando super admin por defecto...');
      
      // Crear hash de contraseña
      const bcrypt = require('bcrypt');
      const defaultPassword = 'admin123';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      
      const adminId = generateId('usr');
      
      // Insertar super admin
      master.prepare(`
        INSERT INTO usuarios (id, username, password, nombre, rol, activo, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'super_admin', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        adminId,
        PRIMARY_SUPER_ADMIN_USERNAME,
        passwordHash,
        SUPER_ADMIN_DISPLAY_NAME
      );
      
      console.log('');
      console.log('╔════════════════════════════════════════════════╗');
      console.log('║     🔐 CREDENCIALES DE ACCESO POR DEFECTO      ║');
      console.log('╠════════════════════════════════════════════════╣');
      console.log('║  Usuario:    admin                             ║');
      console.log('║  Contraseña: admin123                          ║');
      console.log('╠════════════════════════════════════════════════╣');
      console.log('║  ⚠️  CAMBIA LA CONTRASEÑA DESPUÉS DE INGRESAR  ║');
      console.log('╚════════════════════════════════════════════════╝');
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error creando super admin:', error.message);
  }
}

function ensureDeveloperAccess() {
  try {
    const master = getMasterDB();
    const developer = master
      .prepare(
        `
      SELECT id, username, negocios, negocio_principal
      FROM usuarios
      WHERE username = ?
    `
      )
      .get('developer');

    if (!developer) {
      return;
    }

    let developerId = developer.id;
    if (!developerId) {
      developerId = generateId('usr');
      master
        .prepare(
          `
        UPDATE usuarios
        SET id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE username = ?
      `
        )
        .run(developerId, 'developer');
      console.log('🔧 Usuario "developer" actualizado con ID generado.');
    }

    const currentAssignments = master
      .prepare(
        `
      SELECT negocio_id, es_negocio_principal
      FROM usuarios_negocios
      WHERE usuario_id = ?
    `
      )
      .all(developerId);

    const assignedSet = new Set(currentAssignments.map((row) => row.negocio_id));
    const desiredNegocios = Array.from(
      new Set(
        [
          'admin_taller.sa',
          ...configNegocios.negocios
            .filter((negocio) => negocio.activo)
            .map((negocio) => negocio.id),
        ].filter(Boolean)
      )
    );

    const insertAssignment = master.prepare(`
      INSERT OR IGNORE INTO usuarios_negocios (usuario_id, negocio_id, rol_en_negocio, es_negocio_principal)
      VALUES (?, ?, ?, ?)
    `);

    const updatePrincipalFlag = master.prepare(`
      UPDATE usuarios_negocios
      SET es_negocio_principal = ?
      WHERE usuario_id = ? AND negocio_id = ?
    `);

    const principalNegocio = 'admin_taller.sa';

    desiredNegocios.forEach((negocioId) => {
      const wasAssigned = assignedSet.has(negocioId);
      const esPrincipal = negocioId === principalNegocio;
      insertAssignment.run(developerId, negocioId, 'admin', esPrincipal ? 1 : 0);
      if (wasAssigned) {
        updatePrincipalFlag.run(esPrincipal ? 1 : 0, developerId, negocioId);
      }
    });

    const negociosList = desiredNegocios;

    master
      .prepare(
        `
      UPDATE usuarios
      SET negocios = ?, negocio_principal = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
      )
      .run(JSON.stringify(negociosList), principalNegocio, developerId);
  } catch (error) {
    console.warn('No se pudo garantizar el acceso del usuario developer:', error.message);
  }
}

function findSuperAdminUser(master) {
  if (!master) return null;
  try {
    return master
      .prepare(
        `
      SELECT id, username, rol, activo, intentos_fallidos, bloqueado_hasta
      FROM usuarios
      WHERE rol = ?
      LIMIT 1
    `
      )
      .get(ROLE_SUPER_ADMIN);
  } catch (error) {
    console.error('Error buscando superadministrador:', error.message);
    return null;
  }
}

function normalizeSuperAdminUsername(username) {
  if (!username || typeof username !== 'string') return null;
  const trimmed = username.trim();
  if (!trimmed) {
    return null;
  }

  const lowered = trimmed.toLowerCase();
  if (SUPER_ADMIN_ALIAS_SET.has(lowered)) {
    return PRIMARY_SUPER_ADMIN_USERNAME;
  }

  return trimmed;
}

function validateResourceOwnership(resourceType) {
  return (req, res, next) => {
    // Middleware para validar que el usuario tiene acceso al recurso
    // Por ahora solo verifica que el negocioId coincida
    if (!req.negocioId) {
      return res.status(400).json({
        success: false,
        message: 'ID de negocio requerido',
        code: 'MISSING_NEGOCIO_ID',
      });
    }
    next();
  };
}

function ensureDefaultSuperAdmin() {
  try {
    const master = getMasterDB();
    if (!master) {
      console.warn('⚠️ Base de datos maestra no disponible para validar superadministrador.');
      return;
    }

    let superAdminUser = findSuperAdminUser(master);
    if (!superAdminUser) {
      console.warn('⚠️ No se encontró ningún usuario con rol SUPER_ADMIN para normalizar.');
      return;
    }

    const normalizedUsername = normalizeSuperAdminUsername(superAdminUser.username);
    if (normalizedUsername && superAdminUser.username !== normalizedUsername) {
      const conflict = master
        .prepare('SELECT id FROM usuarios WHERE username = ?')
        .get(normalizedUsername);
      if (conflict && conflict.id !== superAdminUser.id) {
        console.warn(
          `⚠️ No se pudo normalizar el username del superadministrador. "${normalizedUsername}" ya está asignado a otro usuario.`
        );
      } else {
        master
          .prepare(
            `
          UPDATE usuarios
          SET username = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
          )
          .run(normalizedUsername, superAdminUser.id);
        console.log(`⭐ Username del superadministrador normalizado a ${normalizedUsername}.`);
        superAdminUser.username = normalizedUsername;
      }
    }

    const currentRole = normalizeRole(superAdminUser.rol);
    if (currentRole !== ROLE_SUPER_ADMIN) {
      master
        .prepare(
          `
        UPDATE usuarios
        SET rol = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
        )
        .run(ROLE_SUPER_ADMIN, superAdminUser.id);
      console.log('⭐ Usuario superadministrador promovido automáticamente a rol SUPER_ADMIN.');
      superAdminUser.rol = ROLE_SUPER_ADMIN;
    }

    const activeState = master
      .prepare('SELECT activo FROM usuarios WHERE id = ?')
      .get(superAdminUser.id);
    if (!activeState || activeState.activo !== 1) {
      master
        .prepare(
          `
        UPDATE usuarios
        SET activo = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
        )
        .run(superAdminUser.id);
      console.log('⭐ Cuenta del superadministrador reactivada.');
    }

    if (superAdminUser.intentos_fallidos > 0 || superAdminUser.bloqueado_hasta) {
      master
        .prepare(
          `
        UPDATE usuarios
        SET intentos_fallidos = 0, bloqueado_hasta = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
        )
        .run(superAdminUser.id);
      console.log('⭐ Intentos fallidos y bloqueos del superadministrador restablecidos.');
      superAdminUser.intentos_fallidos = 0;
      superAdminUser.bloqueado_hasta = null;
    }

    const aliasList = Array.from(SUPER_ADMIN_ALIAS_SET);

    if (aliasList.length) {
      const placeholders = aliasList.map(() => '?').join(',');
      const duplicates = master
        .prepare(
          `
        SELECT id, username, rol
        FROM usuarios
        WHERE id != ?
          AND (
            LOWER(username) IN (${placeholders})
            OR UPPER(rol) = 'SUPER_ADMIN'
          )
      `
        )
        .all(superAdminUser.id, ...aliasList);

      if (duplicates.length) {
        const disableUserStmt = master.prepare(`
          UPDATE usuarios
          SET username = ?, rol = ?, activo = 0, negocios = '[]', negocio_principal = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);

        const detachAssignmentsStmt = master.prepare(`
          DELETE FROM usuarios_negocios
          WHERE usuario_id = ?
        `);

        const disableDuplicates = master.transaction((rows) => {
          rows.forEach((row) => {
            const legacyUsername = `legacy_super_admin_${row.id}`;
            disableUserStmt.run(legacyUsername, ROLE_ADMIN, row.id);
            detachAssignmentsStmt.run(row.id);
          });
        });

        disableDuplicates(duplicates);
        console.log(
          `🧹 ${duplicates.length} cuenta(s) duplicadas de superadministrador fueron desactivadas.`
        );
      }
    }

    const NEGOCIO_PRINCIPAL = 'super_admin';

    if (
      !superAdminUser.negocio_principal ||
      superAdminUser.negocio_principal !== NEGOCIO_PRINCIPAL
    ) {
      master
        .prepare(
          `
        UPDATE usuarios
        SET negocio_principal = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
        )
        .run(NEGOCIO_PRINCIPAL, superAdminUser.id);
      console.log(
        `⭐ Negocio principal del superadministrador establecido en: ${NEGOCIO_PRINCIPAL}`
      );
      superAdminUser.negocio_principal = NEGOCIO_PRINCIPAL;
    }

    const negocioPrincipal = master
      .prepare(`SELECT id FROM negocios WHERE id = ? AND estado = 'activo'`)
      .get(NEGOCIO_PRINCIPAL);
    if (!negocioPrincipal) {
      console.warn(`⚠️ Negocio principal "${NEGOCIO_PRINCIPAL}" no encontrado o inactivo.`);
      return;
    }

    const asignacionActual = master
      .prepare(
        `
      SELECT negocio_id
      FROM usuarios_negocios
      WHERE usuario_id = ?
    `
      )
      .all(superAdminUser.id);

    const desiredIds = new Set([NEGOCIO_PRINCIPAL]);
    const existingIds = new Set(asignacionActual.map((row) => row.negocio_id));

    const deleteStmt = master.prepare(`
      DELETE FROM usuarios_negocios
      WHERE usuario_id = ? AND negocio_id = ?
    `);

    const upsertStmt = master.prepare(`
      INSERT INTO usuarios_negocios (usuario_id, negocio_id, rol_en_negocio, es_negocio_principal)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(usuario_id, negocio_id)
      DO UPDATE SET
        rol_en_negocio = excluded.rol_en_negocio,
        es_negocio_principal = excluded.es_negocio_principal
    `);

    const desiredList = [NEGOCIO_PRINCIPAL];

    const syncAssignments = master.transaction(() => {
      existingIds.forEach((negocioId) => {
        if (!desiredIds.has(negocioId)) {
          deleteStmt.run(superAdminUser.id, negocioId);
        }
      });

      desiredList.forEach((negocioId) => {
        const esPrincipal = negocioId === NEGOCIO_PRINCIPAL ? 1 : 0;
        upsertStmt.run(superAdminUser.id, negocioId, ROLE_SUPER_ADMIN, esPrincipal);
      });
    });

    syncAssignments();

    master
      .prepare(
        `
      UPDATE usuarios
      SET
        negocios = ?,
        negocio_principal = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
      )
      .run(JSON.stringify(desiredList), NEGOCIO_PRINCIPAL, superAdminUser.id);

    if (
      !superAdminUser.nombre ||
      superAdminUser.nombre.toUpperCase() !== SUPER_ADMIN_DISPLAY_NAME
    ) {
      master
        .prepare(
          `
        UPDATE usuarios
        SET nombre = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
        )
        .run(SUPER_ADMIN_DISPLAY_NAME, superAdminUser.id);
      console.log(
        `⭐ Nombre mostrado del superadministrador actualizado a ${SUPER_ADMIN_DISPLAY_NAME}.`
      );
    }

    console.log('✅ Superadministrador normalizado correctamente.');
  } catch (error) {
    console.warn('No se pudo garantizar el superadministrador por defecto:', error.message);
  }
}

function normalizeIaProvider(provider) {
  const raw = (provider || '').toString().trim().toLowerCase();
  if (!raw) {
    return 'gemini';
  }

  if (raw === 'google_gemini' || raw === 'gemini' || raw === 'gemini-pro') {
    return 'gemini';
  }

  if (raw === 'lm_studio' || raw === 'lmstudio' || raw === 'lm-studio') {
    return 'lmstudio';
  }

  if (IA_ALLOWED_PROVIDERS.has(raw)) {
    return raw;
  }

  return 'gemini';
}

async function listGeminiModels(apiKey) {
  if (!apiKey) {
    throw new Error('API Key de Gemini no configurada');
  }

  try {
    // Intentar obtener modelos dinámicamente desde la API de Gemini
    const axios = require('axios');
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (response.data?.models) {
      return response.data.models;
    }

    // Fallback: retornar lista conocida de modelos actuales (Nov 2025)
    return [
      {
        name: 'models/gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        version: '2.5',
        inputTokenLimit: 1048576,
        outputTokenLimit: 8192,
        supportedGenerationMethods: ['generateContent'],
      },
      {
        name: 'models/gemini-2.5-pro',
        displayName: 'Gemini 2.5 Pro',
        version: '2.5',
        inputTokenLimit: 1048576,
        outputTokenLimit: 8192,
        supportedGenerationMethods: ['generateContent'],
      },
      {
        name: 'models/gemini-2.5-flash-lite',
        displayName: 'Gemini 2.5 Flash Lite',
        version: '2.5',
        inputTokenLimit: 1048576,
        outputTokenLimit: 8192,
        supportedGenerationMethods: ['generateContent'],
      },
      {
        name: 'models/gemini-2.0-flash',
        displayName: 'Gemini 2.0 Flash',
        version: '2.0',
        inputTokenLimit: 1048576,
        outputTokenLimit: 8192,
        supportedGenerationMethods: ['generateContent'],
      },
    ];
  } catch (error) {
    console.error('Error listando modelos de Gemini:', error.message);
    // Retornar fallback en caso de error
    return [
      {
        name: 'models/gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        version: '2.5',
        inputTokenLimit: 1048576,
        outputTokenLimit: 8192,
        supportedGenerationMethods: ['generateContent'],
      },
      {
        name: 'models/gemini-2.0-flash',
        displayName: 'Gemini 2.0 Flash',
        version: '2.0',
        inputTokenLimit: 1048576,
        outputTokenLimit: 8192,
        supportedGenerationMethods: ['generateContent'],
      },
    ];
  }
}

function readIaGlobalConfig(db) {
  if (!db) {
    return null;
  }

  try {
    const row = db
      .prepare(
        `
      SELECT provider, api_key, model, base_url, temperature, max_tokens, updated_by, updated_at
      FROM ia_global_config
      WHERE id = 1
    `
      )
      .get();

    const provider = normalizeIaProvider(row?.provider || 'gemini');
    const baseURL = provider === 'lmstudio' ? row?.base_url || 'http://localhost:1234/v1' : null;

    return {
      provider,
      apiKey: row?.api_key || '',
      model: row?.model || '',
      baseURL,
      temperature: clampNumber(row?.temperature, 0, 1, 0.7),
      maxTokens: Math.round(clampNumber(row?.max_tokens, 256, 32768, 2000)),
      updatedBy: row?.updated_by || null,
      updatedAt: row?.updated_at || null,
    };
  } catch (error) {
    console.warn('No se pudo leer la configuración global de IA:', error.message);
    return {
      provider: 'gemini',
      apiKey: '',
      model: '',
      baseURL: null,
      temperature: 0.7,
      maxTokens: 2000,
      updatedBy: null,
      updatedAt: null,
    };
  }
}

function sanitizeIaConfig(rawConfig, options = {}) {
  const includeSecrets = Boolean(options.includeSecrets);
  const config = rawConfig || {};
  const sanitized = {
    provider: config.provider || 'gemini',
    model: config.model || '',
    baseURL: config.baseURL || null,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 2000,
    hasApiKey: Boolean(config.apiKey),
    apiKeyPreview:
      config.apiKey && config.apiKey.length >= 8
        ? `${config.apiKey.slice(0, 4)}...${config.apiKey.slice(-4)}`
        : null,
    updatedBy: config.updatedBy || null,
    updatedAt: config.updatedAt || null,
  };

  sanitized.isConfigured = Boolean(sanitized.hasApiKey && sanitized.model);

  if (includeSecrets) {
    sanitized.apiKey = config.apiKey || '';
  }

  return sanitized;
}

function upsertIaGlobalConfig(db, payload = {}, updatedBy = null) {
  if (!db) {
    throw new Error('Base de datos no disponible para actualizar la configuración de IA.');
  }

  const current = readIaGlobalConfig(db) || {
    provider: 'gemini',
    apiKey: '',
    model: '',
    baseURL: null,
    temperature: 0.7,
    maxTokens: 2000,
  };

  const next = { ...current };

  if (payload.provider !== undefined) {
    const normalized = normalizeIaProvider(payload.provider);
    if (!IA_ALLOWED_PROVIDERS.has(normalized)) {
      throw new Error(`Proveedor de IA no soportado: ${payload.provider}`);
    }
    next.provider = normalized;
  }

  if (payload.apiKey !== undefined) {
    const trimmed = (payload.apiKey || '').toString().trim();
    next.apiKey = trimmed;
  }

  if (payload.model !== undefined) {
    next.model = (payload.model || '').toString().trim();
  }

  if (payload.baseURL !== undefined) {
    next.baseURL = (payload.baseURL || '').toString().trim() || null;
  }

  if (payload.temperature !== undefined) {
    next.temperature = clampNumber(payload.temperature, 0, 1, current.temperature ?? 0.7);
  }

  if (payload.maxTokens !== undefined) {
    next.maxTokens = Math.round(
      clampNumber(payload.maxTokens, 256, 32768, current.maxTokens ?? 2000)
    );
  }

  if (next.provider !== 'lmstudio') {
    next.baseURL = null;
  } else if (!next.baseURL) {
    next.baseURL = 'http://localhost:1234/v1';
  }

  // Si no hay updatedBy, buscar un super admin válido
  let finalUpdatedBy = updatedBy;
  if (!finalUpdatedBy) {
    const superAdmin = db
      .prepare(
        `
      SELECT id FROM usuarios WHERE rol = 'SUPER_ADMIN' LIMIT 1
    `
      )
      .get();
    finalUpdatedBy = superAdmin ? superAdmin.id : null;
  }

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
    provider: next.provider,
    apiKey: next.apiKey,
    model: next.model,
    baseURL: next.baseURL,
    temperature: next.temperature,
    maxTokens: next.maxTokens,
    updatedBy: finalUpdatedBy,
  });

  return readIaGlobalConfig(db);
}

function readIaFeatureStateForNegocio(db, negocioId) {
  const defaults = getIaDefaultFeatureState();
  if (!db || !negocioId) {
    return defaults;
  }

  try {
    const rows = db
      .prepare(
        `
      SELECT feature, enabled
      FROM ia_feature_permissions
      WHERE negocio_id = ?
    `
      )
      .all(negocioId);

    const state = { ...defaults };
    const validFeatureIds = configService.getIAFeatures(false).map((f) => f.id);
    rows.forEach((row) => {
      if (validFeatureIds.includes(row.feature)) {
        state[row.feature] = row.enabled === 1;
      }
    });
    return state;
  } catch (error) {
    console.warn('No se pudo leer permisos IA para negocio:', error.message);
    return defaults;
  }
}

function readIaPermissionsMatrix(db) {
  const matrix = new Map();
  if (!db) {
    return matrix;
  }

  try {
    const rows = db
      .prepare(
        `
      SELECT negocio_id, feature, enabled
      FROM ia_feature_permissions
    `
      )
      .all();

    const validFeatureIds = configService.getIAFeatures(false).map((f) => f.id);
    rows.forEach((row) => {
      if (!validFeatureIds.includes(row.feature)) {
        return;
      }

      if (!matrix.has(row.negocio_id)) {
        matrix.set(row.negocio_id, getIaDefaultFeatureState());
      }

      const featureState = matrix.get(row.negocio_id);
      featureState[row.feature] = row.enabled === 1;
    });
  } catch (error) {
    console.warn('No se pudo leer la matriz de permisos IA:', error.message);
  }

  return matrix;
}

function upsertIaPermissions(db, assignments = [], updatedBy = null) {
  if (!db) {
    throw new Error('Base de datos no disponible para actualizar permisos de IA.');
  }

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO ia_feature_permissions (negocio_id, feature, enabled, updated_by, updated_at)
    VALUES (@negocioId, @feature, @enabled, @updatedBy, datetime('now'))
    ON CONFLICT(negocio_id, feature) DO UPDATE SET
      enabled = excluded.enabled,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `);

  const tx = db.transaction((items) => {
    items.forEach(({ negocioId, features }) => {
      if (!negocioId || typeof features !== 'object' || features === null) {
        return;
      }

      const validFeatureIds = configService.getIAFeatures(false).map((f) => f.id);
      validFeatureIds.forEach((featureId) => {
        const enabled = Boolean(features[featureId]);
        stmt.run({
          negocioId,
          feature: featureId,
          enabled: enabled ? 1 : 0,
          updatedBy: updatedBy || null,
        });
      });
    });
  });

  tx(assignments);
}

// Cargar configuración al inicio
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
loadConfigNegocios();
syncConfigNegociosWithMaster();
ensureNegocioModulesConsistency();
ensureBusinessDatabases();
ensureDefaultSuperAdmin();
ensureDeveloperAccess();

function extractAccessTokenFromRequest(req) {
  if (Object.prototype.hasOwnProperty.call(req, '_cachedAccessToken')) {
    return req._cachedAccessToken;
  }

  let token = req.cookies?.access_token;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
  }

  req._cachedAccessToken = token || null;
  return req._cachedAccessToken;
}

function getAccessTokenPayload(req) {
  if (Object.prototype.hasOwnProperty.call(req, '_cachedTokenPayload')) {
    return req._cachedTokenPayload;
  }

  const token = extractAccessTokenFromRequest(req);
  if (!token) {
    req._cachedTokenPayload = null;
    return null;
  }

  try {
    const verification = verifyAccessToken(token);
    if (!verification.valid) {
      req._cachedTokenPayload = null;
      req._cachedTokenError = verification.error;
      return null;
    }
    req._cachedTokenPayload = verification.payload;
    return req._cachedTokenPayload;
  } catch (error) {
    req._cachedTokenPayload = null;
    req._cachedTokenError = error.message;
    return null;
  }
}

function normalizeNegocioId(candidate) {
  if (candidate === null || candidate === undefined) {
    return null;
  }

  const raw = typeof candidate === 'string' ? candidate.trim() : String(candidate).trim();
  if (!raw) {
    return null;
  }

  const validation = validateBusinessIdentifier(raw);
  return validation.valid ? validation.id : null;
}

if (process.env.SYNC_ONLY === '1') {
  console.log('🔁 Sincronización ejecutada en modo SYNC_ONLY. Cerrando sin iniciar el servidor.');
  try {
    if (masterDb && typeof masterDb.close === 'function') {
      masterDb.close();
    }
  } catch (error) {
    console.warn(
      '⚠️ No se pudo cerrar la conexión principal al salir en modo SYNC_ONLY:',
      error.message
    );
  }
  process.exit(0);
}

// Mantener compatibilidad con código antiguo (BD principal)
const DEFAULT_NEGOCIO_ID = (() => {
  if (configNegocios.negocio_actual) {
    return configNegocios.negocio_actual;
  }
  if (Array.isArray(configNegocios.negocios) && configNegocios.negocios.length) {
    const firstActive = configNegocios.negocios.find(
      (negocio) => negocio && negocio.activo !== false
    );
    if (firstActive?.id) {
      return firstActive.id;
    }
    return configNegocios.negocios[0].id;
  }
  return null;
})();

// Usar la variable db ya declarada anteriormente
if (DEFAULT_NEGOCIO_ID) {
  try {
    db = getDB(DEFAULT_NEGOCIO_ID);
  } catch (primaryError) {
    console.warn(
      `⚠️ No se pudo abrir la base de datos predeterminada (${DEFAULT_NEGOCIO_ID}):`,
      primaryError.message
    );
  }
}

if (!db) {
  const fallbackNegocio = configNegocios.negocios.find((negocio) => negocio && negocio.id);
  if (!fallbackNegocio) {
    throw new Error('No hay negocios configurados para inicializar la base de datos principal.');
  }

  console.warn(`⚠️ Usando negocio de respaldo ${fallbackNegocio.id} para la conexión inicial.`);
  db = getDB(fallbackNegocio.id);
}

// ============================================
// MIDDLEWARE: Asignar BD según negocio
// ============================================
// Rutas que NO requieren validación de negocio
const PUBLIC_ROUTES = new Set([
  '/api/csrf-token',
  '/api/tiempo',
  '/api/public/negocios',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/setup-admin',
  '/api/db-status',
  '/health',
  '/favicon.ico',
]);

app.use((req, res, next) => {
  // Saltar validación de negocio para rutas públicas
  const path = req.path.split('?')[0]; // Quitar query params
  if (PUBLIC_ROUTES.has(path) || path.startsWith('/api/public/')) {
    return next();
  }

  let negocioId = null;
  let negocioSource = 'none';

  try {
    const headerRaw =
      typeof req.headers['x-negocio-id'] === 'string' ? req.headers['x-negocio-id'].trim() : '';

    if (headerRaw) {
      const validation = validateBusinessIdentifier(headerRaw);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message || 'ID de negocio inválido.',
          code: 'INVALID_BUSINESS_ID',
        });
      }
      negocioId = validation.id;
      negocioSource = 'header';
    }

    if (!negocioId) {
      const tokenPayload = getAccessTokenPayload(req);
      if (tokenPayload) {
        const tokenNegocio = normalizeNegocioId(tokenPayload.negocioId);
        if (tokenNegocio) {
          negocioId = tokenNegocio;
          negocioSource = 'token';
        } else if (Array.isArray(tokenPayload.negocios)) {
          const tokenListNegocio = tokenPayload.negocios.map(normalizeNegocioId).find(Boolean);
          if (tokenListNegocio) {
            negocioId = tokenListNegocio;
            negocioSource = 'token-list';
          }
        }
      }
    }

    if (!negocioId && req.user?.negocioId) {
      const userNegocio = normalizeNegocioId(req.user.negocioId);
      if (userNegocio) {
        negocioId = userNegocio;
        negocioSource = 'user';
      }
    }

    if (!negocioId && Array.isArray(req.user?.negocios)) {
      const userListNegocio = req.user.negocios.map(normalizeNegocioId).find(Boolean);
      if (userListNegocio) {
        negocioId = userListNegocio;
        negocioSource = 'user-list';
      }
    }

    if (!negocioId) {
      negocioId =
        normalizeNegocioId(configNegocios.negocio_actual) ||
        normalizeNegocioId(DEFAULT_NEGOCIO_ID) ||
        null;

      if (!negocioId) {
        const fallbackEntry = configNegocios.negocios.find((negocio) => negocio && negocio.id);
        negocioId = fallbackEntry?.id || null;
      }

      negocioSource = 'default';
    }

    const negocioExists = negocioId
      ? configNegocios.negocios.some((n) => n.id === negocioId)
      : false;

    if (!negocioExists) {
      console.warn(
        `⚠️ Intento de acceso a negocio inexistente: ${negocioId} (source=${negocioSource})`
      );
      return res.status(400).json({
        success: false,
        message: 'Negocio no encontrado',
        code: 'INVALID_BUSINESS_ID',
      });
    }

    req.db = getDB(negocioId);
    req.negocioId = negocioId;
    req.negocioSource = negocioSource;
    next();
  } catch (error) {
    console.error('❌ Error obteniendo BD:', error.message);
    res.status(500).json({
      success: false,
      message: `Error de base de datos: ${error.message}`,
    });
  }
});

// ============================================
// MIDDLEWARE: Registro automático de logs
// ============================================
app.use((req, res, next) => {
  const method = (req.method || '').toUpperCase();

  if (!LOG_MUTATING_METHODS.has(method)) {
    return next();
  }

  if (!req.path || !req.path.startsWith('/api/')) {
    return next();
  }

  const normalizedPath = req.path.replace(/\/$/, '') || req.path;
  if (LOG_EXCLUDED_PATHS.has(normalizedPath)) {
    return next();
  }

  const context = {
    startedAt: Date.now(),
    registroId: extractRegistroIdFromRequest(req),
    sanitizedBody: sanitizeLogPayload(req.body),
  };

  let finalized = false;

  const finalizeLog = () => {
    if (finalized) {
      return;
    }
    finalized = true;

    res.removeListener('finish', finalizeLog);
    res.removeListener('close', finalizeLog);

    try {
      const dbInstance = resolveLogDatabase(req);
      if (!dbInstance) {
        return;
      }

      const usuarioId = req.user?.userId || req.user?.id || req.user?.usuarioId || null;
      const actionKeyword =
        method === 'POST'
          ? 'create'
          : method === 'PUT' || method === 'PATCH'
            ? 'update'
            : method === 'DELETE'
              ? 'delete'
              : method.toLowerCase();
      const accion = `${actionKeyword} ${req.path}`.trim();
      const tabla = inferLogTableFromPath(req.path);
      const registroId = context.registroId || extractRegistroIdFromRequest(req);
      const datosNuevos = stringifyLogData({
        payload: context.sanitizedBody,
        method,
        statusCode: res.statusCode,
        resultado: res.statusCode < 400 ? 'success' : 'error',
        negocioId: req.negocioId || null,
        durationMs: Date.now() - context.startedAt,
      });

      registerSystemLog(dbInstance, {
        usuarioId,
        accion,
        tabla,
        registroId,
        datosAnteriores: null,
        datosNuevos,
        ip: extractClientIp(req),
        userAgent: req.headers['user-agent'] || null,
      });
    } catch (error) {
      console.warn('No se pudo registrar actividad en logs_sistema:', error.message);
    }
  };

  res.on('finish', finalizeLog);
  res.on('close', finalizeLog);

  next();
});

function ensureOrdenesTrabajoSchema() {
  try {
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ordenes_trabajo'")
      .get();
    if (!tableExists) {
      return;
    }

    const columns = db
      .prepare("PRAGMA table_info('ordenes_trabajo')")
      .all()
      .map((column) => column.name);

    // Whitelist de columnas permitidas para prevenir SQL injection
    const allowedColumns = {
      prioridad: "TEXT DEFAULT 'normal'",
      kilometraje: 'INTEGER',
      nivel_combustible: 'TEXT',
      presupuesto_estimado: 'REAL DEFAULT 0',
      observaciones_internas: 'TEXT',
      instrucciones_cliente: 'TEXT',
      requiere_contacto: 'INTEGER DEFAULT 0',
      notificar_avances: 'INTEGER DEFAULT 0',
      cliente_contacto: 'TEXT',
    };

    const addColumn = (name) => {
      if (!columns.includes(name) && allowedColumns[name]) {
        db.prepare(`ALTER TABLE ordenes_trabajo ADD COLUMN ${name} ${allowedColumns[name]}`).run();
        columns.push(name);
      }
    };

    addColumn('prioridad');
    addColumn('kilometraje');
    addColumn('nivel_combustible');
    addColumn('presupuesto_estimado');
    addColumn('observaciones_internas');
    addColumn('instrucciones_cliente');
    addColumn('requiere_contacto');
    addColumn('notificar_avances');
    addColumn('cliente_contacto');
  } catch (error) {
    console.warn('No se pudieron verificar las columnas de ordenes_trabajo:', error.message);
  }
}

ensureOrdenesTrabajoSchema();

// --- Lógica de IA para Facturas ---
const INVOICE_EXTRACTION_SYSTEM_PROMPT = [
  'Analiza este documento PDF (factura) y extrae TODOS los datos con máxima precisión.',
  '',
  '=== IMPORTANTE ===',
  '- Lee CADA línea del documento, incluyendo encabezados, tablas, pies de página',
  '- Los números deben ser numéricos (float/int), NO strings',
  '- Elimina símbolos de moneda ($, €, MXN, USD, etc.)',
  '- Si un campo no está visible, déjalo vacío ("") o en 0',
  '- EXTRAE TODOS LOS PRODUCTOS sin omitir ninguno',
  '',
  '=== ESTRUCTURA TÍPICA DE FACTURA (SRI ECUADOR / CFDI MÉXICO) ===',
  'PARTE SUPERIOR: Logo + PROVEEDOR/VENDEDOR (Emisor)',
  '  - Razón Social o Nombre Completo',
  '  - RUC/RFC (13 dígitos Ecuador, 12-13 México)',
  '  - Dirección completa (calle, ciudad, estado, CP)',
  '  - Teléfono(s), Email, Sitio Web',
  '',
  'RECUADRO FACTURA:',
  '  - Número de Factura / Serie-Folio',
  '  - Folio Fiscal / UUID (México)',
  '  - Fecha de Emisión y Vencimiento',
  '  - Autorización (Ecuador)',
  '  - Uso CFDI, Lugar de Expedición (México)',
  '',
  'DATOS DEL COMPRADOR (Receptor):',
  '  - Nombre / Razón Social',
  '  - RUC/RFC/CI',
  '  - Dirección completa',
  '  - Teléfono, Email, Contacto',
  '',
  'TABLA DE PRODUCTOS:',
  '  Columnas típicas: Clave/Código | Cant | UMed | Descripción | P.Unit | Desc | Subtotal | Impuestos | Total',
  '  - Extraer TODOS los productos línea por línea',
  '  - Cantidad: número entero o decimal',
  '  - Precio Unitario: número decimal sin símbolos',
  '  - Calcular: Subtotal = Cantidad × Precio Unitario',
  '',
  'TOTALES (parte inferior):',
  '  - Subtotal (base imponible)',
  '  - Descuentos globales',
  '  - IVA / Impuestos',
  '  - Retenciones (ISR, IVA retenido)',
  '  - Otros impuestos',
  '  - TOTAL = Subtotal - Descuentos + Impuestos - Retenciones',
  '',
  '=== REGLAS CRÍTICAS DE EXTRACCIÓN ===',
  '',
  '1. EMISOR/PROVEEDOR (Parte Superior del Documento):',
  '   Ubicación: PRIMERO que aparece, generalmente arriba o lateral izquierdo',
  '   Extraer TODO lo visible:',
  '   ✓ Nombre Comercial y Razón Social',
  '   ✓ RUC (Ecuador 13 dígitos: 1234567890001) o RFC (México 12-13 caracteres)',
  '   ✓ Dirección completa (calle, número, colonia/parroquia, ciudad, estado, CP)',
  '   ✓ País',
  '   ✓ Teléfono(s) y Email',
  '   ✓ Sitio Web (si existe)',
  '   Frases clave: "Obligado a llevar contabilidad", "Contribuyente", "Régimen Fiscal"',
  '',
  '2. COMPRADOR:',
  '   - Ubicación: SEGUNDO que aparece (medio)',
  '   - Etiquetas: "RUC/CI:", "Dir:", "Telf:", "Cliente:", "Señor(es):"',
  '   - Extraer: nombre, RUC/CI, dirección',
  '',
  '3. DATOS DEL PROVEEDOR - IMPORTANTE:',
  '   - Si un campo no existe en la factura, déjalo vacío o null',
  '   - NO inventar datos',
  '   - Buscar en: cabecera, pie de página, lateral',
  '   - Capturar TODO lo visible del proveedor',
  '',
  '2. EXTRAER TODOS LOS PRODUCTOS:',
  '   - Lee CADA LÍNEA de la tabla de productos',
  '   - NO omitas ningún producto',
  '   - Si hay 5 productos, extrae los 5',
  '',
  '3. CANTIDAD:',
  '   - SIEMPRE número ENTERO (1, 2, 7, 10, 100)',
  '   - Columna "Cantidad" o "Cant"',
  '   - NO confundir con código o precio',
  '',
  '4. NÚMERO DE FACTURA:',
  '   - Formato: ###-###-#########',
  '   - Ejemplo: 001-010-000089294',
  '',
  'EJEMPLOS:',
  'Factura con 2 productos:',
  '  Línea 1: "7.00 UND LITRO MERCON LV... 10.43 ... 73.04"',
  '  Línea 2: "2.00 UND GALON REFRIGERANTE... 12.96 ... 25.91"',
  '  ✅ Extraer AMBOS en items[]',
  '',
  'Proveedor vs Comprador:',
  '  Arriba: "GUILLEN ZAMBRANO JANETH OLINDA" → proveedor.nombre',
  '  Abajo: "RIOFRIO VALAREZO HENRY DAVID" → comprador.nombre',
  '',
  'Devuelve SOLO JSON válido, sin markdown ni comentarios.',
].join('\n');

const INVOICE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    vendedor: {
      type: 'OBJECT',
      description: 'Datos completos del emisor/vendedor/proveedor (parte superior de la factura)',
      properties: {
        nombre: { type: 'STRING', nullable: true, description: 'Nombre comercial' },
        razon_social: { type: 'STRING', nullable: true, description: 'Razón social completa' },
        direccion: { type: 'STRING', nullable: true, description: 'Dirección completa' },
        ciudad: { type: 'STRING', nullable: true },
        estado: { type: 'STRING', nullable: true },
        codigo_postal: { type: 'STRING', nullable: true },
        pais: { type: 'STRING', nullable: true },
        rfc_tax_id: { type: 'STRING', nullable: true, description: 'RUC (Ecuador) o RFC (México)' },
        telefono: { type: 'STRING', nullable: true },
        email: { type: 'STRING', nullable: true },
        sitio_web: { type: 'STRING', nullable: true },
      },
      required: [],
    },
    comprador: {
      type: 'OBJECT',
      description: 'Datos del receptor/cliente/comprador',
      properties: {
        nombre: { type: 'STRING', nullable: true, description: 'Nombre comercial' },
        razon_social: { type: 'STRING', nullable: true, description: 'Razón social completa' },
        direccion: { type: 'STRING', nullable: true },
        ciudad: { type: 'STRING', nullable: true },
        estado: { type: 'STRING', nullable: true },
        codigo_postal: { type: 'STRING', nullable: true },
        pais: { type: 'STRING', nullable: true },
        rfc_tax_id: { type: 'STRING', nullable: true, description: 'RUC/RFC/CI' },
        telefono: { type: 'STRING', nullable: true },
        email: { type: 'STRING', nullable: true },
        contacto: { type: 'STRING', nullable: true, description: 'Persona de contacto' },
      },
      required: [],
    },
    detalles_factura: {
      type: 'OBJECT',
      description: 'Información de la factura',
      properties: {
        numero: { type: 'STRING', nullable: true, description: 'Número o Serie-Folio' },
        serie: { type: 'STRING', nullable: true },
        folio_fiscal: {
          type: 'STRING',
          nullable: true,
          description: 'UUID o Folio Fiscal (México)',
        },
        fecha_emision: {
          type: 'STRING',
          nullable: true,
          description: 'Fecha en formato YYYY-MM-DD',
        },
        fecha_vencimiento: { type: 'STRING', nullable: true },
        orden_compra: { type: 'STRING', nullable: true },
        condiciones_pago: { type: 'STRING', nullable: true },
        metodo_pago: { type: 'STRING', nullable: true },
        forma_pago: { type: 'STRING', nullable: true },
        moneda: { type: 'STRING', nullable: true, description: 'MXN, USD, EUR, etc.' },
        tipo_cambio: { type: 'NUMBER', nullable: true },
        uso_cfdi: { type: 'STRING', nullable: true, description: 'Solo México' },
        lugar_expedicion: { type: 'STRING', nullable: true },
      },
      required: [],
    },
    productos: {
      type: 'ARRAY',
      description: 'Lista de todos los productos/conceptos de la factura',
      items: {
        type: 'OBJECT',
        properties: {
          clave: {
            type: 'STRING',
            nullable: true,
            description: 'Código, SKU o clave del producto',
          },
          descripcion: {
            type: 'STRING',
            description: 'Descripción completa del producto o servicio',
          },
          unidad: {
            type: 'STRING',
            nullable: true,
            description: 'Unidad de medida (UND, KG, LT, PZA, etc.)',
          },
          cantidad: { type: 'NUMBER', description: 'Cantidad como número (entero o decimal)' },
          precio_unitario: {
            type: 'NUMBER',
            description: 'Precio unitario sin símbolos de moneda',
          },
          descuento: {
            type: 'NUMBER',
            nullable: true,
            description: 'Descuento aplicado a la línea',
          },
          subtotal: {
            type: 'NUMBER',
            description: 'Subtotal antes de impuestos (cantidad × precio_unitario - descuento)',
          },
          impuestos: {
            type: 'NUMBER',
            nullable: true,
            description: 'Impuestos aplicados a la línea',
          },
          total: { type: 'NUMBER', description: 'Total de la línea (subtotal + impuestos)' },
          categoria: { type: 'STRING', nullable: true, description: 'Categoría del producto' },
          categoriaId: { type: 'STRING', nullable: true },
          proveedorId: { type: 'STRING', nullable: true },
          proveedorNombre: { type: 'STRING', nullable: true },
        },
        required: ['descripcion', 'cantidad', 'precio_unitario', 'subtotal', 'total'],
      },
    },
    totales: {
      type: 'OBJECT',
      description: 'Resumen de totales de la factura',
      properties: {
        subtotal: {
          type: 'NUMBER',
          description: 'Suma de subtotales de productos (base imponible)',
        },
        descuento: { type: 'NUMBER', nullable: true, description: 'Descuentos globales' },
        subtotal_con_descuento: { type: 'NUMBER', nullable: true },
        iva: { type: 'NUMBER', description: 'IVA total' },
        isr_retenido: { type: 'NUMBER', nullable: true, description: 'ISR retenido' },
        iva_retenido: { type: 'NUMBER', nullable: true, description: 'IVA retenido' },
        otros_impuestos: {
          type: 'NUMBER',
          nullable: true,
          description: 'Otros impuestos (IEPS, etc.)',
        },
        total: { type: 'NUMBER', description: 'Total a pagar' },
        total_letra: { type: 'STRING', nullable: true, description: 'Total en letra' },
      },
      required: ['subtotal', 'iva', 'total'],
    },
    observaciones: {
      type: 'STRING',
      nullable: true,
      description: 'Observaciones o notas de la factura',
    },
    notas: { type: 'STRING', nullable: true, description: 'Notas adicionales' },
    moneda: { type: 'STRING', nullable: true, description: 'Código de moneda' },
  },
  required: ['productos', 'totales'],
};

function interpretGeminiError(error) {
  if (!error) {
    return null;
  }

  const response = error.response || error.cause?.response || null;
  const payload = response?.data?.error || response?.data || null;
  const status =
    error.statusCode || error.status || response?.status || payload?.statusCode || null;
  const rawMessage = payload?.message || error.message || '';
  const diagnostic = (
    rawMessage +
    ' ' +
    (payload?.status || '') +
    ' ' +
    (error.code || '')
  ).toLowerCase();

  const details = {
    statusCode: status,
    apiStatus: payload?.status || null,
    apiCode: payload?.code || error.code || null,
    rawMessage,
  };

  const buildResult = (statusCode, userMessage, reason) => ({
    statusCode,
    userMessage,
    reason,
    logMessage: rawMessage || error.message || '',
    diagnostic: { ...details, reason },
  });

  if (status === 401 || /unauthenticated|invalid api key|api key/.test(diagnostic)) {
    return buildResult(
      401,
      'API Key de Gemini inválida o expirada. Actualiza la configuración.',
      'UNAUTHENTICATED'
    );
  }

  if (status === 429 || /quota|rate limit|resource_exhausted|exceeded/.test(diagnostic)) {
    return buildResult(
      429,
      'Se alcanzó el límite de solicitudes de la API de Gemini. Inténtalo más tarde o amplía tu cuota.',
      'QUOTA_EXCEEDED'
    );
  }

  if (status === 403 || /forbidden|permission|project is not authorized/.test(diagnostic)) {
    return buildResult(
      403,
      'La cuenta de Gemini no tiene permisos suficientes para este modelo. Verifica los permisos en Google AI Studio.',
      'PERMISSION_DENIED'
    );
  }

  return null;
}

async function runInvoiceExtractionWithAI({
  provider,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  maxRetries = 2,
  temperature = 0.15,
  topP = 0.9,
  topK = 32,
  candidateCount = 1,
  maxOutputTokens = 8192,
  enforceSchema = true,
  diagnostics = false,
}) {
  // Normalizar provider: 'gemini' o 'google_gemini' son válidos
  const normalizedProvider = (provider || '').toLowerCase();
  if (normalizedProvider !== 'google_gemini' && normalizedProvider !== 'gemini') {
    throw new Error(
      'Este backend ha sido simplificado y solo soporta el proveedor google_gemini (o "gemini").'
    );
  }
  if (!apiKey) {
    throw new Error('La API Key de Google Gemini no está configurada.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = model || 'gemini-2.5-flash';

  console.log(`[IA Factura] Usando modelo: ${modelName}`);

  const generativeModel = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  });

  let lastError = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    const attemptTemperature =
      attempt === 1 ? temperature : clampNumber(temperature + attempt * 0.1, 0, 1, temperature);
    const generationConfig = {
      temperature: attemptTemperature,
      maxOutputTokens,
      responseMimeType: 'application/json',
      candidateCount: Math.max(1, Math.round(candidateCount)),
      topP: Math.min(1, Math.max(0, topP)),
    };
    if (topK && Number.isFinite(topK)) {
      generationConfig.topK = Math.max(1, Math.round(topK));
    }
    if (enforceSchema) {
      generationConfig.responseSchema = INVOICE_SCHEMA;
    }
    if (generationConfig.candidateCount === 1) {
      delete generationConfig.candidateCount;
    }

    console.log(`[IA Factura] Intento ${attempt}/${maxRetries + 1} con modelo ${modelName}`);
    if (diagnostics) {
      console.log('[IA Factura] Parámetros de generación:', generationConfig);
    }

    try {
      const result = await generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig,
      });

      const response = result?.response;

      // Validar que la respuesta existe
      if (!response) {
        lastError = new Error('La API de Gemini no devolvió un objeto response');
        console.error(`[IA Factura] Intento ${attempt}: response es null/undefined`);
        continue;
      }

      // Verificar si hay bloqueo de seguridad
      if (response.promptFeedback?.blockReason) {
        lastError = new Error(
          `Contenido bloqueado por Gemini: ${response.promptFeedback.blockReason}`
        );
        console.error(`[IA Factura] Contenido bloqueado:`, response.promptFeedback);
        throw lastError; // No reintentar si hay bloqueo
      }

      // Obtener texto de la respuesta
      let rawText = '';
      try {
        rawText =
          typeof response.text === 'function' ? response.text() : String(response.text || '');
      } catch (textError) {
        console.error(`[IA Factura] Error al obtener texto de la respuesta:`, textError);
        console.error('[IA Factura] Estructura de response:', JSON.stringify(response, null, 2));
        lastError = textError;
        continue;
      }

      // Validar que hay contenido
      if (!rawText || rawText.trim().length === 0) {
        lastError = new Error('La API de Gemini devolvió una respuesta vacía');
        console.error(`[IA Factura] Intento ${attempt}: respuesta vacía`);
        console.error('[IA Factura] Response completo:', JSON.stringify(response, null, 2));
        continue;
      }

      if (diagnostics) {
        const totalChars = rawText.length;
        console.log(`[IA Factura] Longitud de respuesta recibida: ${totalChars} caracteres.`);
      }

      // Parsear JSON
      let parsed = null;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseError) {
        lastError = parseError;
        console.error(
          `[IA Factura] Error parseando JSON en intento ${attempt}:`,
          parseError.message
        );
        console.error('[IA Factura] Primeros 500 chars de rawText:', rawText.substring(0, 500));

        // Intentar limpiar y reparsear
        try {
          const cleaned = rawText
            .replace(/^```json\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
          parsed = JSON.parse(cleaned);
          console.log('[IA Factura] JSON parseado después de limpieza');
        } catch (cleanError) {
          continue;
        }
      }

      // Validar estructura mínima del JSON
      if (!parsed || typeof parsed !== 'object') {
        lastError = new Error('El JSON parseado no es un objeto válido');
        console.error(`[IA Factura] JSON no es un objeto:`, typeof parsed);
        continue;
      }

      // Validar que tenga al menos items o datos básicos
      const hasItems = Array.isArray(parsed.items) && parsed.items.length > 0;
      const hasBasicData = parsed.proveedor || parsed.fecha || parsed.total !== undefined;

      if (!hasItems && !hasBasicData) {
        lastError = new Error('El JSON no contiene items ni datos básicos de factura');
        console.warn('[IA Factura] JSON válido pero sin datos útiles:', parsed);
        continue;
      }

      console.log(`[IA Factura] ✅ Extracción exitosa en intento ${attempt}`);
      console.log(`[IA Factura] Items extraídos: ${parsed.items?.length || 0}`);
      return { parsed, rawText, attempt };
    } catch (error) {
      const interpreted = interpretGeminiError(error);
      if (interpreted) {
        console.error(
          `[IA Factura] Error detectado (${interpreted.reason}):`,
          interpreted.logMessage
        );
        const handledError = new Error(interpreted.userMessage);
        handledError.statusCode = interpreted.statusCode;
        handledError.code = interpreted.reason;
        handledError.isGeminiError = true;
        handledError.details = interpreted.diagnostic;
        throw handledError;
      }

      lastError = error;
      console.error(`[IA Factura] Error en intento ${attempt}:`, error.message);

      // Si es un error de API que no debemos reintentar
      if (
        error.message?.includes('API key') ||
        error.message?.includes('quota') ||
        error.message?.includes('bloqueado')
      ) {
        throw error;
      }

      // Esperar antes del siguiente reintento
      if (attempt <= maxRetries) {
        const waitTime = attempt * 1000; // 1s, 2s, 3s...
        console.log(`[IA Factura] Esperando ${waitTime}ms antes del siguiente intento...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  // Si llegamos aquí, todos los intentos fallaron
  console.error('[IA Factura] ❌ Todos los intentos fallaron');
  throw lastError || new Error('La extracción de datos falló después de múltiples intentos');
}

// ============================================
// FUNCIONES DE DEEPSEEK PARA VALIDACIÓN Y FORMATO
// ============================================

/**
 * Valida y corrige el JSON extraído usando DeepSeek
 * @param {object} extractedData - Datos extraídos por Gemini
 * @param {string} apiKey - API Key de DeepSeek
 * @param {string} model - Modelo de DeepSeek
 * @returns {Promise<object>} Datos validados y corregidos
 */
async function validateWithDeepSeek(extractedData, apiKey, model = 'deepseek-chat') {
  console.log('[DeepSeek Validator] 🔍 Validando y corrigiendo datos...');

  const systemPrompt = `Eres un validador experto de facturas ecuatorianas (formato SRI).

REGLAS DE VALIDACIÓN:

1. PROVEEDOR vs COMPRADOR:
   - PROVEEDOR: El que vende/emite (aparece PRIMERO en la factura, arriba)
   - COMPRADOR: El que compra (aparece SEGUNDO en la factura, sección cliente)
   - Si están invertidos, corrígelos

2. TODOS LOS PRODUCTOS:
   - Verifica que estén TODOS los productos de la tabla
   - NO puede faltar ningún producto
   - Si faltan productos, es un ERROR crítico

3. CANTIDADES:
   - SIEMPRE números ENTEROS (1, 2, 7, 10, nunca 1.5)
   - Verifica: subtotal = cantidad × precioUnitario (±0.01)
   - Si no coincide, recalcula cantidad

4. TOTALES:
   - Suma de subtotales debe coincidir
   - IVA correcto (generalmente 15% en Ecuador)
   - Total = subtotal + IVA + otros

Devuelve el JSON corregido con:
- proveedor y comprador correctos
- TODOS los productos
- cantidades enteras validadas
- totales verificados

SOLO JSON, sin explicaciones.`;

  const userPrompt = `Valida y corrige esta factura ecuatoriana:

${JSON.stringify(extractedData, null, 2)}

IMPORTANTE:
- Verifica que proveedor y comprador no estén invertidos
- Asegúrate que estén TODOS los productos
- Corrige cantidades si son decimales

Devuelve el JSON corregido.`;

  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek no devolvió contenido');
    }

    const validated = JSON.parse(content);
    console.log('[DeepSeek Validator] ✅ Validación completada');
    return validated;
  } catch (error) {
    console.error('[DeepSeek Validator] ❌ Error:', error.message);
    // Si falla, devolver datos originales
    return extractedData;
  }
}

/**
 * Formatea y optimiza el JSON final usando DeepSeek
 * @param {object} validatedData - Datos ya validados
 * @param {string} apiKey - API Key de DeepSeek
 * @param {string} model - Modelo de DeepSeek
 * @returns {Promise<object>} Datos formateados optimizados
 */
async function formatWithDeepSeek(validatedData, apiKey, model = 'deepseek-chat') {
  console.log('[DeepSeek Formatter] 🎨 Formateando datos finales...');

  const systemPrompt = `Eres un formateador experto de datos comerciales. Tu trabajo es:
1. Optimizar nombres de productos (capitalización correcta, sin duplicados)
2. Estandarizar unidades de medida (UND, KG, LT, M, etc.)
3. Formatear fechas a YYYY-MM-DD
4. Redondear todos los valores monetarios a 2 decimales excepto precioUnitario (4 decimales)
5. Asegurar estructura JSON limpia y consistente
6. Agregar descripciones breves si faltan (basándote en el nombre)
7. Mantener la integridad de todos los cálculos

IMPORTANTE: Responde SOLO con el JSON formateado, sin explicaciones ni markdown.`;

  const userPrompt = `Formatea y optimiza este JSON de factura validado:

${JSON.stringify(validatedData, null, 2)}

Devuelve el JSON final optimizado y listo para usar.`;

  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek no devolvió contenido');
    }

    const formatted = JSON.parse(content);
    console.log('[DeepSeek Formatter] ✅ Formateo completado');
    return formatted;
  } catch (error) {
    console.error('[DeepSeek Formatter] ❌ Error:', error.message);
    // Si falla, devolver datos validados sin formato adicional
    return validatedData;
  }
}

/**
 * Procesa un PDF con Gemini Vision (acepta PDFs directamente)
 * @param {Buffer} pdfBuffer - Buffer del archivo PDF
 * @param {string} apiKey - API Key de Gemini
 * @param {string} model - Modelo de Gemini
 * @returns {Promise<object>} Datos extraídos del PDF
 */
async function extractWithGeminiVision(pdfBuffer, apiKey, model = 'gemini-2.5-flash') {
  console.log(`[Gemini Vision] 📄 Procesando PDF con modelo: ${model}...`);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const visionModel = genAI.getGenerativeModel({
      model: model,
      systemInstruction: {
        role: 'system',
        parts: [
          {
            text: INVOICE_EXTRACTION_SYSTEM_PROMPT,
          },
        ],
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    });

    // Convertir PDF a base64
    const pdfBase64 = pdfBuffer.toString('base64');

    const result = await visionModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              text: 'Extrae todos los datos de esta factura en formato JSON según el esquema proporcionado.',
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: INVOICE_SCHEMA,
      },
    });

    const response = result?.response;
    if (!response) {
      throw new Error('Gemini Vision no devolvió respuesta');
    }

    const rawText =
      typeof response.text === 'function' ? response.text() : String(response.text || '');
    const parsed = JSON.parse(rawText);

    console.log('[Gemini Vision] ✅ Extracción completada');
    return parsed;
  } catch (error) {
    const interpreted = interpretGeminiError(error);
    if (interpreted) {
      console.error(
        `[Gemini Vision] Error detectado (${interpreted.reason}):`,
        interpreted.logMessage
      );
      const handledError = new Error(interpreted.userMessage);
      handledError.statusCode = interpreted.statusCode;
      handledError.code = interpreted.reason;
      handledError.isGeminiError = true;
      handledError.details = interpreted.diagnostic;
      throw handledError;
    }

    console.error('[Gemini Vision] ❌ Error:', error.message);
    throw error;
  }
}

const STREAMLIT_INVOICE_PROMPT = `Eres un experto extractor de datos de facturas comerciales. Analiza este PDF con MÁXIMA PRECISIÓN MATEMÁTICA.

## REGLAS CRÍTICAS DE EXTRACCIÓN:

### 1. NÚMEROS Y CÁLCULOS (PRIORIDAD MÁXIMA):
- TODOS los valores numéricos deben ser números (float/int), NUNCA strings
- Elimina símbolos de moneda ($, €, S/, etc.) de los números
- USA PUNTO (.) como separador decimal, NO coma
- Ejemplo correcto: 1234.56  Incorrecto: "1,234.56" o "$1234.56"
- Si un valor tiene coma como decimal (ej: 1234,56), conviértelo a punto: 1234.56

### 2. VALIDACIÓN MATEMÁTICA OBLIGATORIA:
Para CADA producto, verifica que: cantidad × precio_unitario = subtotal
Para la factura completa: subtotal_productos + iva - descuentos = total

### 3. ESTRUCTURA DE PRODUCTOS:
Cada producto DEBE tener estos campos con valores NUMÉRICOS precisos:
- cantidad: número exacto de unidades (ej: 5.0, 10.5)
- precio_unitario: precio por unidad SIN IVA (ej: 25.50)
- subtotal: cantidad × precio_unitario (calcúlalo si no está explícito)
- descuento: descuento aplicado a este item (0 si no hay)
- impuestos: IVA u otros impuestos de este item
- total: subtotal - descuento + impuestos

### 4. TOTALES DE LA FACTURA:
Lee EXACTAMENTE los valores que aparecen en el documento:
- subtotal: suma de todos los subtotales de productos (antes de IVA)
- iva: impuesto al valor agregado
- total: monto final a pagar

### 5. SI HAY DISCREPANCIA:
Si los números no cuadran, CONFÍA en los valores individuales y RECALCULA los totales.

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "vendedor": {
    "nombre": "",
    "razon_social": "",
    "direccion": "",
    "ciudad": "",
    "estado": "",
    "codigo_postal": "",
    "pais": "",
    "rfc_tax_id": "",
    "telefono": "",
    "email": "",
    "sitio_web": ""
  },
  "comprador": {
    "nombre": "",
    "razon_social": "",
    "direccion": "",
    "ciudad": "",
    "estado": "",
    "codigo_postal": "",
    "pais": "",
    "rfc_tax_id": "",
    "telefono": "",
    "email": "",
    "contacto": ""
  },
  "detalles_factura": {
    "numero": "",
    "serie": "",
    "folio_fiscal": "",
    "fecha_emision": "",
    "fecha_vencimiento": "",
    "orden_compra": "",
    "condiciones_pago": "",
    "metodo_pago": "",
    "forma_pago": "",
    "moneda": "USD",
    "tipo_cambio": 1.0,
    "uso_cfdi": "",
    "lugar_expedicion": ""
  },
  "productos": [
    {
      "clave": "",
      "descripcion": "",
      "unidad": "",
      "cantidad": 0.0,
      "precio_unitario": 0.0,
      "descuento": 0.0,
      "subtotal": 0.0,
      "impuestos": 0.0,
      "total": 0.0
    }
  ],
  "totales": {
    "subtotal": 0.0,
    "descuento": 0.0,
    "subtotal_con_descuento": 0.0,
    "iva": 0.0,
    "isr_retenido": 0.0,
    "iva_retenido": 0.0,
    "otros_impuestos": 0.0,
    "total": 0.0,
    "total_letra": ""
  },
  "observaciones": "",
  "notas": ""
}

IMPORTANTE: Responde SOLO con el JSON, sin explicaciones adicionales.
`;

function cleanGeminiJsonResponse(rawText) {
  if (!rawText) {
    return '';
  }
  let sanitized = String(rawText);
  sanitized = sanitized
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const startIdx = sanitized.indexOf('{');
  const endIdx = sanitized.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
    sanitized = sanitized.slice(startIdx, endIdx + 1);
  }
  return sanitized;
}

/**
 * Convierte un string con formato de número a float
 * Maneja casos como "1,234.56", "1.234,56", "$1234.56"
 */
function parseNumericValue(value) {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'string') return 0;

  // Eliminar símbolos de moneda y espacios
  let cleaned = value.replace(/[$€£¥S\/\s]/g, '').trim();

  // Detectar formato: si tiene coma después del último punto, la coma es decimal
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma > lastDot) {
    // Formato europeo: 1.234,56 -> convertir a 1234.56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Formato americano: 1,234.56 -> eliminar comas
    cleaned = cleaned.replace(/,/g, '');
  }

  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ensureInvoiceSkeleton(data) {
  const base = data && typeof data === 'object' ? { ...data } : {};
  base.vendedor = base.vendedor || base.proveedor || {};
  base.comprador = base.comprador || base.cliente || {};
  base.detalles_factura = base.detalles_factura || {};
  base.totales = base.totales || {};
  const rawProductos = Array.isArray(base.productos)
    ? base.productos
    : Array.isArray(base.items)
      ? base.items
      : [];

  // Procesar productos con validación matemática
  let sumaSubtotalesProductos = 0;

  base.productos = rawProductos.map((item) => {
    const cantidad = toFiniteNumberOr(parseNumericValue(item?.cantidad), 0);
    const precioUnitario = toFiniteNumberOr(
      parseNumericValue(item?.precio_unitario ?? item?.precioUnitario),
      0
    );
    const descuento = toFiniteNumberOr(parseNumericValue(item?.descuento), 0);
    const impuestos = toFiniteNumberOr(parseNumericValue(item?.impuestos), 0);

    // Calcular subtotal: cantidad × precio_unitario
    const subtotalCalculado = round2(cantidad * precioUnitario);
    let subtotalExtraido = toFiniteNumberOr(parseNumericValue(item?.subtotal), 0);

    // Si el subtotal extraído difiere mucho del calculado, usar el calculado
    if (subtotalExtraido > 0 && Math.abs(subtotalCalculado - subtotalExtraido) > 0.5) {
      // Verificar cuál es más coherente
      if (subtotalCalculado > 0) {
        console.log(
          `[Invoice] Corrigiendo subtotal: ${subtotalExtraido} → ${subtotalCalculado} (${cantidad} × ${precioUnitario})`
        );
        subtotalExtraido = subtotalCalculado;
      }
    } else if (subtotalExtraido === 0 && subtotalCalculado > 0) {
      subtotalExtraido = subtotalCalculado;
    }

    // Total del item
    let totalItem = toFiniteNumberOr(parseNumericValue(item?.total), 0);
    const totalCalculado = round2(subtotalExtraido - descuento + impuestos);

    if (totalItem === 0 && totalCalculado > 0) {
      totalItem = totalCalculado;
    }

    // Acumular para validación
    sumaSubtotalesProductos += subtotalExtraido;

    return {
      clave: item?.clave || item?.codigo || '',
      descripcion: item?.descripcion || item?.nombre || '',
      unidad: item?.unidad || '',
      cantidad: round2(cantidad),
      precio_unitario: round2(precioUnitario),
      descuento: round2(descuento),
      subtotal: round2(subtotalExtraido),
      impuestos: round2(impuestos),
      total: round2(totalItem > 0 ? totalItem : subtotalExtraido),
    };
  });

  // Normalizar totales
  let subtotalExtraido = toFiniteNumberOr(
    parseNumericValue(base.totales.subtotal ?? base.subtotal),
    0
  );
  const ivaExtraido = toFiniteNumberOr(parseNumericValue(base.totales.iva ?? base.iva), 0);
  const descuentoExtraido = toFiniteNumberOr(parseNumericValue(base.totales.descuento), 0);
  const otrosImpuestos = toFiniteNumberOr(
    parseNumericValue(base.totales.otros_impuestos ?? base.otrosImpuestos),
    0
  );
  const retIva = toFiniteNumberOr(parseNumericValue(base.totales.iva_retenido), 0);
  const retIsr = toFiniteNumberOr(parseNumericValue(base.totales.isr_retenido), 0);
  let totalExtraido = toFiniteNumberOr(parseNumericValue(base.totales.total ?? base.total), 0);

  sumaSubtotalesProductos = round2(sumaSubtotalesProductos);

  // Validar y corregir subtotal si hay gran discrepancia
  if (base.productos.length > 0 && sumaSubtotalesProductos > 0) {
    const diffSubtotal = Math.abs(sumaSubtotalesProductos - subtotalExtraido);

    // Si la diferencia es mayor al 5% del subtotal, corregir
    if (
      diffSubtotal > 1 &&
      (subtotalExtraido === 0 || diffSubtotal / Math.max(subtotalExtraido, 1) > 0.05)
    ) {
      console.log(
        `[Invoice] Corrigiendo subtotal total: ${subtotalExtraido} → ${sumaSubtotalesProductos} (suma de productos)`
      );
      subtotalExtraido = sumaSubtotalesProductos;
    }
  }

  // Recalcular total si es necesario
  const totalCalculado = round2(
    subtotalExtraido - descuentoExtraido + ivaExtraido + otrosImpuestos - retIva - retIsr
  );

  if (totalExtraido > 0 && Math.abs(totalCalculado - totalExtraido) > 1) {
    // Hay discrepancia - intentar determinar el valor correcto
    // Si el total extraído es muy diferente, puede que el subtotal esté mal
    console.log(
      `[Invoice] Discrepancia en total: calculado=${totalCalculado}, extraído=${totalExtraido}`
    );

    // Si la diferencia es pequeña, confiar en el extraído
    if (Math.abs(totalCalculado - totalExtraido) <= totalExtraido * 0.1) {
      // Diferencia menor al 10%, mantener el extraído
    } else {
      // Gran diferencia, usar el calculado
      console.log(`[Invoice] Usando total calculado: ${totalCalculado}`);
      totalExtraido = totalCalculado;
    }
  } else if (totalExtraido === 0) {
    totalExtraido = totalCalculado;
  }

  base.totales = {
    subtotal: round2(subtotalExtraido),
    descuento: round2(descuentoExtraido),
    subtotal_con_descuento: round2(subtotalExtraido - descuentoExtraido),
    iva: round2(ivaExtraido),
    isr_retenido: round2(retIsr),
    iva_retenido: round2(retIva),
    otros_impuestos: round2(otrosImpuestos),
    total: round2(totalExtraido),
    total_letra: base.totales.total_letra || '',
    // Agregar datos de validación
    _suma_productos: sumaSubtotalesProductos,
    _total_calculado: totalCalculado,
  };

  base.observaciones = base.observaciones || '';
  base.notas = base.notas || '';
  return base;
}

/**
 * Normaliza los datos extraídos de una factura
 * Similar a la función en estractor_factura.py
 */
function normalizeInvoiceData(data) {
  if (!data || typeof data !== 'object') {
    return ensureInvoiceSkeleton({});
  }

  // Asegurar estructura base
  const normalized = ensureInvoiceSkeleton(data);

  // Normalizar totales a números
  const totales = normalized.totales || {};
  normalized.totales = {
    subtotal: toFiniteNumberOr(totales.subtotal, 0),
    descuento: toFiniteNumberOr(totales.descuento, 0),
    subtotal_con_descuento: toFiniteNumberOr(totales.subtotal_con_descuento, 0),
    iva: toFiniteNumberOr(totales.iva, 0),
    isr_retenido: toFiniteNumberOr(totales.isr_retenido, 0),
    iva_retenido: toFiniteNumberOr(totales.iva_retenido, 0),
    otros_impuestos: toFiniteNumberOr(totales.otros_impuestos, 0),
    total: toFiniteNumberOr(totales.total, 0),
    total_letra: totales.total_letra || '',
  };

  // Normalizar productos
  if (Array.isArray(normalized.productos)) {
    normalized.productos = normalized.productos.map((p) => ({
      clave: p.clave || p.codigo || '',
      descripcion: p.descripcion || p.nombre || '',
      unidad: p.unidad || '',
      cantidad: toFiniteNumberOr(p.cantidad, 0),
      precio_unitario: toFiniteNumberOr(p.precio_unitario ?? p.precioUnitario, 0),
      descuento: toFiniteNumberOr(p.descuento, 0),
      subtotal: toFiniteNumberOr(p.subtotal, 0),
      impuestos: toFiniteNumberOr(p.impuestos, 0),
      total: toFiniteNumberOr(p.total, 0),
    }));
  }

  return normalized;
}

/**
 * Valida la coherencia matemática de la factura extraída
 * Basado en validate_invoice_data de estractor_factura.py
 * TOLERANCIA: diferencias menores a $0.05 se ignoran, solo se informan
 */
function validateInvoiceData(data) {
  const TOLERANCIA_CENTAVOS = 0.05; // 5 centavos de tolerancia

  const results = {
    is_valid: true,
    errors: [],
    warnings: [],
    info: [], // Nueva categoría para diferencias menores
    details: {},
    confidence: 'high',
    score: 100,
    corrections_applied: [],
  };

  try {
    const productos = data.productos || [];
    let calcSubtotalProd = 0;
    let productosValidos = 0;
    let productosConErrores = 0;

    // 1. Validar cada producto individualmente
    productos.forEach((p, idx) => {
      const cant = toFiniteNumberOr(p.cantidad, 0);
      const precio = toFiniteNumberOr(p.precio_unitario, 0);
      const subtotalProd = toFiniteNumberOr(p.subtotal, 0);
      const subtotalEsperado = round2(cant * precio);

      if (cant > 0 && precio > 0) {
        productosValidos++;

        // Verificar coherencia del producto
        const diffProd = Math.abs(subtotalEsperado - subtotalProd);
        if (diffProd > TOLERANCIA_CENTAVOS && subtotalProd > 0) {
          // Diferencia mayor a tolerancia - es advertencia
          results.warnings.push(
            `Producto ${idx + 1} "${(p.descripcion || '').substring(0, 30)}...": ${cant} × $${precio.toFixed(2)} = $${subtotalEsperado.toFixed(2)}, pero dice $${subtotalProd.toFixed(2)} (dif: $${diffProd.toFixed(2)})`
          );
          productosConErrores++;
        } else if (diffProd > 0 && diffProd <= TOLERANCIA_CENTAVOS && subtotalProd > 0) {
          // Diferencia menor a tolerancia - solo informativo
          results.info.push(
            `Producto ${idx + 1}: diferencia de $${diffProd.toFixed(2)} centavos (aceptable)`
          );
        }

        // Usar el valor más coherente
        calcSubtotalProd += subtotalProd > 0 ? subtotalProd : subtotalEsperado;
      } else if (subtotalProd > 0) {
        calcSubtotalProd += subtotalProd;
        productosValidos++;
      }
    });

    calcSubtotalProd = round2(calcSubtotalProd);

    // 2. Validar totales de la factura
    const extractedSubtotal = toFiniteNumberOr(data.totales?.subtotal, 0);
    const extractedTotal = toFiniteNumberOr(data.totales?.total, 0);
    const extractedIva = toFiniteNumberOr(data.totales?.iva, 0);
    const extractedDescuento = toFiniteNumberOr(data.totales?.descuento, 0);
    const extractedOtros = toFiniteNumberOr(data.totales?.otros_impuestos, 0);
    const retIva = toFiniteNumberOr(data.totales?.iva_retenido, 0);
    const retIsr = toFiniteNumberOr(data.totales?.isr_retenido, 0);
    const totalRetenciones = retIva + retIsr;

    // Subtotal: comparar suma de productos vs extraído
    const diffSubtotal = Math.abs(calcSubtotalProd - extractedSubtotal);

    if (diffSubtotal > TOLERANCIA_CENTAVOS && productos.length > 0) {
      // Diferencia significativa
      const porcentajeDiff = extractedSubtotal > 0 ? (diffSubtotal / extractedSubtotal) * 100 : 0;
      results.warnings.push(
        `Discrepancia en Subtotal: Suma de productos ($${calcSubtotalProd.toFixed(2)}) vs Subtotal calculado ($${extractedSubtotal.toFixed(2)}) - Dif: $${diffSubtotal.toFixed(2)}`
      );
      results.score -= Math.min(15, Math.round(porcentajeDiff));
    } else if (diffSubtotal > 0 && diffSubtotal <= TOLERANCIA_CENTAVOS) {
      // Diferencia menor - solo informativo
      results.info.push(`Subtotal: diferencia de $${diffSubtotal.toFixed(2)} centavos (aceptable)`);
    }

    // Total: verificar operación aritmética
    const calcTotal = round2(
      extractedSubtotal - extractedDescuento + extractedIva + extractedOtros - totalRetenciones
    );
    const diffTotal = Math.abs(calcTotal - extractedTotal);

    results.details = {
      calc_subtotal_productos: calcSubtotalProd,
      extracted_subtotal: extractedSubtotal,
      calc_total: calcTotal,
      extracted_total: extractedTotal,
      diferencia_subtotal: round2(diffSubtotal),
      diferencia_total: round2(diffTotal),
      productos_validos: productosValidos,
      productos_con_errores: productosConErrores,
      tolerancia_aplicada: TOLERANCIA_CENTAVOS,
    };

    if (diffTotal > TOLERANCIA_CENTAVOS && extractedTotal > 0) {
      // Diferencia significativa en total
      const porcentajeDiffTotal = (diffTotal / extractedTotal) * 100;
      results.errors.push(
        `Error Matemático: (Subtotal - Desc + Impuestos - Ret) = $${calcTotal.toFixed(2)}, pero el total es $${extractedTotal.toFixed(2)} (dif: $${diffTotal.toFixed(2)})`
      );
      results.is_valid = false;
      results.score -= Math.min(25, Math.round(porcentajeDiffTotal));
    } else if (diffTotal > 0 && diffTotal <= TOLERANCIA_CENTAVOS) {
      // Diferencia menor en total - solo informativo
      results.info.push(`Total: diferencia de $${diffTotal.toFixed(2)} centavos (aceptable)`);
    }

    // 3. Verificar que hay productos
    if (productos.length === 0) {
      results.warnings.push('No se detectaron productos en la factura');
      results.score -= 20;
    } else if (productosValidos === 0) {
      results.errors.push('Ningún producto tiene datos válidos (cantidad y precio)');
      results.is_valid = false;
      results.score -= 30;
    }

    // 4. Verificar coherencia de IVA (típicamente 12-16% del subtotal)
    if (extractedSubtotal > 0 && extractedIva > 0) {
      const tasaIvaDetectada = (extractedIva / extractedSubtotal) * 100;
      if (tasaIvaDetectada > 25 || tasaIvaDetectada < 5) {
        results.warnings.push(
          `Tasa de IVA inusual: ${tasaIvaDetectada.toFixed(1)}% (típico: 12-16%)`
        );
        results.score -= 5;
      }
    }

    // Asegurar score mínimo de 0
    results.score = Math.max(0, results.score);

    // Determinar nivel de confianza
    if (results.score >= 95) {
      results.confidence = 'excellent';
      results.confidence_label = 'Excelente';
    } else if (results.score >= 85) {
      results.confidence = 'high';
      results.confidence_label = 'Alta';
    } else if (results.score >= 70) {
      results.confidence = 'medium';
      results.confidence_label = 'Media';
    } else if (results.score >= 50) {
      results.confidence = 'low';
      results.confidence_label = 'Baja';
    } else {
      results.confidence = 'very_low';
      results.confidence_label = 'Muy Baja';
    }
  } catch (e) {
    results.warnings.push(`No se pudo validar matemáticamente: ${e.message}`);
    results.confidence = 'unknown';
    results.confidence_label = 'Desconocida';
  }

  return results;
}

async function runStandaloneGeminiExtraction(pdfBuffer, apiKey, options = {}) {
  const {
    model = 'gemini-2.5-flash',
    temperature = 0.1,
    topP = 0.95,
    topK = 40,
    maxOutputTokens = 8192,
  } = options;

  const genAI = new GoogleGenerativeAI(apiKey);
  const generativeModel = genAI.getGenerativeModel({ model });
  const pdfBase64 = pdfBuffer.toString('base64');

  const response = await generativeModel.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64,
            },
          },
          { text: STREAMLIT_INVOICE_PROMPT },
        ],
      },
    ],
    generationConfig: {
      temperature,
      topP,
      topK,
      maxOutputTokens,
      responseMimeType: 'application/json',
    },
  });

  const payload = response?.response;
  const rawText =
    typeof payload?.text === 'function'
      ? payload.text()
      : payload?.text ||
        (payload?.candidates || [])
          .flatMap((candidate) => candidate?.content?.parts || [])
          .map((part) => part?.text || '')
          .join('\n');

  const cleaned = cleanGeminiJsonResponse(rawText);
  if (!cleaned) {
    throw new Error('Gemini no devolvió un JSON interpretable.');
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    throw new Error('La IA no devolvió un JSON válido.');
  }

  return ensureInvoiceSkeleton(parsed);
}

function persistInvoiceExtractionRecord(dbInstance, payload) {
  if (!dbInstance || typeof dbInstance.prepare !== 'function') {
    return null;
  }

  try {
    const { negocioId, user, model, normalized, validation, fileMeta } = payload;

    const vendedor = normalized?.vendedor || {};
    const comprador = normalized?.comprador || {};
    const detalles = normalized?.detalles_factura || {};
    const totales = normalized?.totales || {};
    const subtotal = toFiniteNumberOr(totales.subtotal, 0);
    const iva = toFiniteNumberOr(totales.iva, 0);
    const descuento = toFiniteNumberOr(totales.descuento, 0);
    const otrosImpuestos = toFiniteNumberOr(totales.otros_impuestos, 0);
    const total = toFiniteNumberOr(totales.total, subtotal + iva + otrosImpuestos - descuento);
    const moneda = detalles.moneda || normalized?.moneda || 'MXN';
    const recordId = generateId('iafx');

    dbInstance
      .prepare(
        `
      INSERT INTO ia_facturas_extracciones (
        id, negocio_id, usuario_id, usuario_email,
        proveedor_nombre, proveedor_identificacion, comprador_nombre,
        numero_factura, fecha_emision, moneda,
        subtotal, iva, descuento, otros_impuestos, total,
        modelo, estado, validacion_confianza, validacion_puntaje,
        detalles_validacion, datos_json, pdf_nombre, pdf_size,
        created_at, updated_at
      ) VALUES (
        @id, @negocioId, @usuarioId, @usuarioEmail,
        @proveedorNombre, @proveedorIdentificacion, @compradorNombre,
        @numeroFactura, @fechaEmision, @moneda,
        @subtotal, @iva, @descuento, @otrosImpuestos, @total,
        @modelo, 'completado', @validacionConfianza, @validacionPuntaje,
        @detallesValidacion, @datosJson, @pdfNombre, @pdfSize,
        datetime('now'), datetime('now')
      )
    `
      )
      .run({
        id: recordId,
        negocioId: negocioId || null,
        usuarioId: user?.userId || null,
        usuarioEmail: user?.email || user?.correo || user?.username || null,
        proveedorNombre: vendedor.nombre || vendedor.razon_social || '',
        proveedorIdentificacion:
          vendedor.rfc_tax_id || vendedor.ruc || vendedor.identificacion || '',
        compradorNombre: comprador.nombre || comprador.razon_social || '',
        numeroFactura: detalles.numero || normalized?.numero_factura || '',
        fechaEmision: detalles.fecha_emision || normalized?.fecha || null,
        moneda,
        subtotal,
        iva,
        descuento,
        otrosImpuestos,
        total,
        modelo: model,
        validacionConfianza: validation?.confidence_label || validation?.confidence || null,
        validacionPuntaje: Number.isFinite(validation?.score) ? validation.score : 0,
        detallesValidacion: JSON.stringify(validation || {}),
        datosJson: JSON.stringify(normalized || {}),
        pdfNombre: fileMeta?.originalname || null,
        pdfSize: fileMeta?.size || null,
      });

    if (Array.isArray(normalized?.productos) && normalized.productos.length) {
      const insertProducto = dbInstance.prepare(`
        INSERT INTO ia_facturas_productos (
          extraccion_id, nombre, descripcion, unidad,
          cantidad, precio_unitario, subtotal, impuestos,
          total, categoria, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = dbInstance.transaction((items) => {
        items.forEach((item) => {
          insertProducto.run(
            recordId,
            item.descripcion || item.nombre || '',
            item.descripcion || '',
            item.unidad || '',
            toFiniteNumberOr(item.cantidad, 0),
            toFiniteNumberOr(item.precio_unitario, 0),
            toFiniteNumberOr(item.subtotal, 0),
            toFiniteNumberOr(item.impuestos, 0),
            toFiniteNumberOr(item.total, 0),
            item.categoria || '',
            JSON.stringify({ clave: item.clave || '', descuento: item.descuento || 0 })
          );
        });
      });

      insertMany(normalized.productos);
    }

    return recordId;
  } catch (error) {
    console.warn('⚠️ No se pudo registrar la extracción IA en BD:', error.message);
    return null;
  }
}

// ENDPOINTS: Facturas procesadas por CLI
// ============================================

// Listar facturas procesadas por CLI
app.get('/api/facturas-cli', authenticate, validateTenantAccess, async (req, res) => {
  try {
    const negocioId = req.user.negocioId || req.negocioId || '1';
    const facturasCarpeta = path.join(__dirname, 'facturas_cli', negocioId);

    // Crear carpeta si no existe
    if (!fs.existsSync(facturasCarpeta)) {
      fs.mkdirSync(facturasCarpeta, { recursive: true });
      return res.json({
        success: true,
        facturas: [],
        carpeta: facturasCarpeta,
        total: 0,
      });
    }

    // Leer todos los JSONs
    const archivos = fs
      .readdirSync(facturasCarpeta)
      .filter((f) => f.endsWith('.json'))
      .map((filename) => {
        const filePath = path.join(facturasCarpeta, filename);
        const stats = fs.statSync(filePath);

        try {
          const contenido = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          return {
            filename,
            path: filePath,
            fechaCreacion: stats.mtime,
            proveedor: contenido.proveedor?.nombre || 'Desconocido',
            total: contenido.total || 0,
            items: contenido.items?.length || 0,
            numero_factura: contenido.numero_factura || filename.replace('.json', ''),
          };
        } catch (e) {
          console.warn(`[Facturas CLI] JSON inválido: ${filename}`);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.fechaCreacion - a.fechaCreacion);

    res.json({
      success: true,
      facturas: archivos,
      carpeta: facturasCarpeta,
      total: archivos.length,
    });
  } catch (error) {
    console.error('[Facturas CLI] Error listando:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Leer JSON específico
app.get('/api/facturas-cli/:filename', authenticate, validateTenantAccess, async (req, res) => {
  try {
    const negocioId = req.user.negocioId || req.negocioId || '1';
    const filename = path.basename(req.params.filename); // Seguridad: solo basename
    const filePath = path.join(__dirname, 'facturas_cli', negocioId, filename);

    // Validar que no se escape del directorio permitido
    const realPath = fs.realpathSync(filePath);
    const allowedBase = fs.realpathSync(path.join(__dirname, 'facturas_cli', negocioId));

    if (!realPath.startsWith(allowedBase)) {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }

    const contenido = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    res.json({
      success: true,
      extractedData: contenido,
      rawText: JSON.stringify(contenido, null, 2),
      diagnostics: {
        itemsExtracted: contenido.items?.length || 0,
        extractionMethod: 'gemini-cli',
        source: 'cli-processed',
        procesadoEn: contenido._metadata?.fecha || 'desconocido',
        modelo: contenido._metadata?.modelo || 'desconocido',
      },
    });
  } catch (error) {
    console.error('[Facturas CLI] Error leyendo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Eliminar JSON procesado
app.delete('/api/facturas-cli/:filename', authenticate, validateTenantAccess, async (req, res) => {
  try {
    const negocioId = req.user.negocioId || req.negocioId || '1';
    const filename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, 'facturas_cli', negocioId, filename);

    // Validar seguridad
    const realPath = fs.realpathSync(filePath);
    const allowedBase = fs.realpathSync(path.join(__dirname, 'facturas_cli', negocioId));

    if (!realPath.startsWith(allowedBase)) {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Facturas CLI] ✅ Eliminado: ${filename}`);
    }

    res.json({ success: true, message: 'Factura eliminada' });
  } catch (error) {
    console.error('[Facturas CLI] Error eliminando:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// RUTAS PÚBLICAS (Sin autenticación)
// ============================================

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// 🔧 ENDPOINT TEMPORAL: Crear/resetear usuario admin (ELIMINAR EN PRODUCCIÓN REAL)
app.get('/api/setup-admin', async (req, res) => {
  try {
    const bcrypt = require('bcrypt');
    const master = getMasterDB();
    const results = { steps: [] };
    const canonicalUsername = PRIMARY_SUPER_ADMIN_USERNAME;
    const aliasValues = Array.from(SUPER_ADMIN_ALIAS_SET);
    
    // Paso 0: Crear tablas si no existen
    try {
      // Crear tabla negocios
      master.exec(`
        CREATE TABLE IF NOT EXISTS negocios (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          tipo TEXT DEFAULT 'general',
          estado TEXT DEFAULT 'activo',
          plan TEXT DEFAULT 'basico',
          icono TEXT,
          config TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.steps.push({ step: 'create_table_negocios', success: true });
      
      // Crear tabla usuarios_negocios
      master.exec(`
        CREATE TABLE IF NOT EXISTS usuarios_negocios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id TEXT NOT NULL,
          negocio_id TEXT NOT NULL,
          rol_en_negocio TEXT DEFAULT 'empleado',
          es_negocio_principal INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(usuario_id, negocio_id),
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
          FOREIGN KEY (negocio_id) REFERENCES negocios(id)
        )
      `);
      results.steps.push({ step: 'create_table_usuarios_negocios', success: true });
      
      // Verificar que exista columna negocio_principal en usuarios
      try {
        master.prepare('SELECT negocio_principal FROM usuarios LIMIT 1').get();
      } catch (e) {
        master.exec('ALTER TABLE usuarios ADD COLUMN negocio_principal TEXT');
        results.steps.push({ step: 'add_column_negocio_principal', success: true });
      }
    } catch (e) {
      results.steps.push({ step: 'create_tables_error', error: e.message });
    }
    
    // Paso 1: Verificar/crear negocio por defecto
    try {
      const negocioCount = master.prepare('SELECT COUNT(*) as count FROM negocios').get();
      results.steps.push({ step: 'check_negocios', count: negocioCount.count });
      
      if (negocioCount.count === 0) {
        // Crear negocio por defecto
        master.prepare(`
          INSERT INTO negocios (id, nombre, tipo, estado, plan, icono, created_at, updated_at)
          VALUES ('tienda_principal', 'Tienda Principal', 'general', 'activo', 'premium', 'fas fa-store', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run();
        results.steps.push({ step: 'create_negocio', success: true });
      }
    } catch (e) {
      results.steps.push({ step: 'negocios_error', error: e.message });
    }
    
    // Paso 2: Crear/actualizar usuario admin
    const defaultPassword = 'admin123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const selectByUsername = master.prepare('SELECT id, username FROM usuarios WHERE username = ?');
    const selectByAlias =
      aliasValues.length > 0
        ? master.prepare(
            `SELECT id, username FROM usuarios WHERE LOWER(username) IN (${aliasValues
              .map(() => '?')
              .join(',')}) LIMIT 1`
          )
        : null;

    let adminUser = selectByUsername.get(canonicalUsername);

    if (!adminUser && selectByAlias) {
      const aliasUser = selectByAlias.get(...aliasValues);
      if (aliasUser) {
        master
          .prepare(
            `
          UPDATE usuarios
          SET username = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
          )
          .run(canonicalUsername, aliasUser.id);
        adminUser = { id: aliasUser.id, username: canonicalUsername };
        results.steps.push({ step: 'normalize_username', previous: aliasUser.username });
      }
    }

    let adminId;
    if (adminUser) {
      adminId = adminUser.id;
      master
        .prepare(
          `
        UPDATE usuarios 
        SET username = ?, password = ?, nombre = ?, rol = 'super_admin', activo = 1, intentos_fallidos = 0, bloqueado_hasta = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
        )
        .run(canonicalUsername, passwordHash, SUPER_ADMIN_DISPLAY_NAME, adminId);
      results.steps.push({ step: 'update_admin', success: true });
    } else {
      adminId = 'usr_admin_' + Date.now();
      master
        .prepare(
          `
        INSERT INTO usuarios (id, username, password, nombre, rol, activo, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'super_admin', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
        )
        .run(adminId, canonicalUsername, passwordHash, SUPER_ADMIN_DISPLAY_NAME);
      results.steps.push({ step: 'create_admin', id: adminId, success: true });
    }
    
    // Paso 3: Asignar admin a negocio
    try {
      const asignacionExistente = master.prepare(`
        SELECT * FROM usuarios_negocios WHERE usuario_id = ? AND negocio_id = 'tienda_principal'
      `).get(adminId);
      
      if (!asignacionExistente) {
        master.prepare(`
          INSERT OR IGNORE INTO usuarios_negocios (usuario_id, negocio_id, rol_en_negocio, es_negocio_principal, created_at)
          VALUES (?, 'tienda_principal', 'super_admin', 1, CURRENT_TIMESTAMP)
        `).run(adminId);
        results.steps.push({ step: 'assign_negocio', success: true });
      } else {
        results.steps.push({ step: 'assign_negocio', already_exists: true });
      }
    } catch (e) {
      results.steps.push({ step: 'assign_error', error: e.message });
    }
    
    // Paso 4: Actualizar negocio_principal del usuario
    try {
      master.prepare(`
        UPDATE usuarios SET negocio_principal = 'tienda_principal' WHERE id = ?
      `).run(adminId);
      results.steps.push({ step: 'set_principal', success: true });
    } catch (e) {
      results.steps.push({ step: 'set_principal_error', error: e.message });
    }
    
    res.json({ 
      success: true, 
      message: 'Setup completado', 
      credentials: {
        username: 'admin',
        canonicalUsername,
        password: 'admin123',
      },
      details: results
    });
  } catch (error) {
    console.error('Error en setup-admin:', error);
    res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
});

// 🔧 ENDPOINT TEMPORAL: Diagnóstico de base de datos (ELIMINAR EN PRODUCCIÓN REAL)
app.get('/api/db-status', (req, res) => {
  try {
    const master = getMasterDB();
    const result = {};
    
    // Verificar tablas existentes
    const tables = master.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
    result.tables = tables.map(t => t.name);
    
    // Contar usuarios
    try {
      const usuarios = master.prepare('SELECT id, username, rol, activo, negocio_principal FROM usuarios').all();
      result.usuarios = usuarios;
    } catch (e) {
      result.usuarios_error = e.message;
    }
    
    // Contar negocios
    try {
      const negocios = master.prepare('SELECT id, nombre, estado FROM negocios').all();
      result.negocios = negocios;
    } catch (e) {
      result.negocios_error = e.message;
    }
    
    // Verificar usuarios_negocios
    try {
      const asignaciones = master.prepare('SELECT * FROM usuarios_negocios').all();
      result.usuarios_negocios = asignaciones;
    } catch (e) {
      result.usuarios_negocios_error = e.message;
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check - Información mínima para no exponer versión/entorno
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    // NO exponer version ni environment por seguridad
  });
});

// Endpoint de tiempo del servidor - Anti-fraude
// Devuelve la hora del servidor en zona horaria Ecuador (UTC-5)
app.get('/api/tiempo', (req, res) => {
  const ahora = new Date();
  // Obtener hora en zona horaria Ecuador
  const opcionesEcuador = { timeZone: 'America/Guayaquil' };
  
  res.json({
    success: true,
    unixtime: Math.floor(ahora.getTime() / 1000),
    datetime: ahora.toISOString(),
    // Fecha en formato local Ecuador
    fecha_ecuador: ahora.toLocaleDateString('es-EC', opcionesEcuador),
    hora_ecuador: ahora.toLocaleTimeString('es-EC', { ...opcionesEcuador, hour12: false }),
    timezone: 'America/Guayaquil',
    utc_offset: -5
  });
});

// Endpoint para obtener token CSRF
app.get('/api/csrf-token', (req, res) => {
  // En producción, devolver un token dummy ya que usamos otras protecciones
  if (process.env.NODE_ENV === 'production') {
    return res.json({
      success: true,
      csrfToken: 'production-token',
    });
  }
  
  // En desarrollo, usar CSRF real
  csrfProtection(req, res, (err) => {
    if (err) {
      return res.json({
        success: true,
        csrfToken: 'dev-fallback-token',
      });
    }
    res.json({
      success: true,
      csrfToken: req.csrfToken(),
    });
  });
});

// Listado de negocios disponibles - LIMITADO a información pública mínima
// Aplicar rate limiting para prevenir enumeración
app.get('/api/public/negocios', apiLimiter, (req, res) => {
  try {
    const master = getMasterDB();
    // Solo devolver información MÍNIMA necesaria para el login
    const rows = master
      .prepare(
        `
      SELECT id, nombre, tipo, icono
      FROM negocios
      WHERE estado = 'activo'
      ORDER BY nombre COLLATE NOCASE ASC
    `
      )
      .all();

    const negocios = rows
      .map(mapNegocioRowWithConfig)
      .filter((negocio) => negocio && negocio.activo)
      .map((negocio) => ({
        id: negocio.id,
        nombre: negocio.nombre,
        icono: negocio.icono,
        tipo: negocio.tipo,
        // NO exponer: plan, usuarios_max, productos_max, fechas, etc.
      }));

    res.json({
      success: true,
      negocios,
      total: negocios.length,
      negocioActual: configNegocios.negocio_actual || null,
    });
  } catch (error) {
    console.error('Error listando negocios públicos:', error);
    res.status(500).json({
      success: false,
      message: 'No se pudo obtener la lista de negocios disponibles.',
    });
  }
});

// Rutas de autenticación (públicas pero con rate limiting)
app.use(
  '/api/auth',
  createAuthRoutes({
    getMasterDB,
    getTenantDB: getDB,
  })
);

// Rutas del Asistente Contable IA
app.use('/api/accounting', accountingAssistantRouter);
app.use('/api/finanzas', finanzasRoutes);
app.use('/api/nominas', nominasRoutes);

// Rutas de Historial de Productos y Pedidos Rápidos
app.use('/api', authenticate, validateTenantAccess, historialProductosRoutes);

// Rutas del módulo taller (vehículos, citas, órdenes de trabajo, catálogo técnico)
app.use('/api', createTallerRouter({ getDB }));

// ============================================
// RATE LIMITER ESPECÍFICO PARA RUTAS DE IA
// Se aplica ANTES del apiLimiter general para que las rutas de IA
// no sean afectadas por el límite general de 100 peticiones
// ============================================
app.use('/api/ia', iaLimiter);
app.use('/api/admin/ia', iaLimiter);

// ============================================
// APLICAR RATE LIMITING GENERAL A TODA LA API
// NOTA: Las rutas /api/ia/* y /api/admin/ia/* ya tienen su propio limiter más permisivo
// ============================================
app.use('/api', apiLimiter);

registerModuleEndpoints({
  app,
  authenticate,
  requireRole,
  ROLE_SUPER_ADMIN,
  getMasterDB,
});

if (notificationHub) {
  app.use('/api/notifications', createNotificationRoutes(notificationHub, masterDb));
} else {
  const notificationsFallback = express.Router();
  notificationsFallback.use(authenticate, (req, res) => {
    res.status(503).json({
      success: false,
      message: 'NotificationHub no disponible. Contacta al administrador para habilitarlo.',
    });
  });
  app.use('/api/notifications', notificationsFallback);
}

// ============================================
// RUTAS PROTEGIDAS - GESTIÓN DE NEGOCIOS
// ============================================

// Obtener lista global de negocios (solo administradores)
app.get(
  '/api/negocios',
  authenticate,
  requireRole(ROLE_ADMIN, ROLE_SUPER_ADMIN),
  requirePermission(PERMISSIONS.VIEW_TENANTS),
  (req, res) => {
    try {
      const master = getMasterDB();
      const requesterIsSuper = isSuperAdmin(req);
      const allowedNegocios = getRequesterNegocioSet(req);

      if (!requesterIsSuper && !allowedNegocios.size) {
        return res.json({ success: true, negocios: [], total: 0 });
      }

      let rows = [];

      if (requesterIsSuper) {
        rows = master
          .prepare(
            `
        SELECT id, nombre, tipo, estado, plan, usuarios_max, productos_max, fecha_creacion, created_at, updated_at
        FROM negocios
        ORDER BY nombre COLLATE NOCASE ASC
      `
          )
          .all();
      } else {
        const placeholders = Array.from(allowedNegocios)
          .map(() => '?')
          .join(',');
        rows = placeholders
          ? master
              .prepare(
                `
            SELECT id, nombre, tipo, estado, plan, usuarios_max, productos_max, fecha_creacion, created_at, updated_at
            FROM negocios
            WHERE id IN (${placeholders})
            ORDER BY nombre COLLATE NOCASE ASC
          `
              )
              .all(...Array.from(allowedNegocios))
          : [];
      }

      const negocios = rows.map(mapNegocioRowWithConfig).filter(Boolean);

      res.json({
        success: true,
        negocios,
        total: negocios.length,
      });
    } catch (error) {
      console.error('Error listando negocios:', error);
      res.status(500).json({ success: false, message: 'No se pudo obtener la lista de negocios.' });
    }
  }
);

// Obtener negocios asignados al usuario autenticado
app.get('/api/negocios/mis', authenticate, (req, res) => {
  try {
    const master = getMasterDB();
    const asignados = getUserNegocios(master, req.user.userId) || [];
    const negocios = asignados.map((item) => {
      const mapped = mapNegocioRowWithConfig(item) || {
        id: item.id,
        nombre: item.nombre,
        tipo: item.tipo,
      };
      return {
        ...mapped,
        rol_en_negocio: item.rol_en_negocio,
        es_negocio_principal: !!item.es_negocio_principal,
      };
    });

    const negocioActual =
      req.user.negocioId || configNegocios.negocio_actual || configNegocios.negocios[0]?.id || null;

    res.json({
      success: true,
      negocios,
      negocioActual,
    });
  } catch (error) {
    console.error('Error listando negocios del usuario:', error);
    res
      .status(500)
      .json({ success: false, message: 'No se pudieron obtener los negocios asignados.' });
  }
});

// Obtener datos del negocio actual del usuario
app.get('/api/negocios/actual', authenticate, (req, res) => {
  try {
    const negocioId =
      req.user.negocioId || configNegocios.negocio_actual || configNegocios.negocios[0]?.id || null;

    // Buscar el negocio en la configuración
    const negocio = configNegocios.negocios.find((n) => n.id === negocioId);

    if (!negocio) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado',
      });
    }

    // Obtener configuración de tienda de la base de datos del negocio
    const negocioDB = getDB(negocioId);
    let configTienda = null;
    let nombreComercial = negocio.nombre; // Fallback al nombre del negocio

    try {
      const config = negocioDB.prepare('SELECT * FROM config_tienda WHERE id = 1').get();
      if (config) {
        configTienda = {
          nombre: config.nombre,
          razonSocial: config.razon_social,
          ruc: config.ruc,
          direccion: config.direccion,
          telefono: config.telefono,
          email: config.email,
          establecimiento: config.establecimiento,
          puntoEmision: config.punto_emision,
          obligadoContabilidad: !!config.obligado_contabilidad,
        };
        // PRIORIZAR el nombre comercial de config_tienda si existe
        if (config.nombre && config.nombre.trim()) {
          nombreComercial = config.nombre;
        }
      }
    } catch (err) {
      console.warn('No se pudo leer config_tienda:', err.message);
    }

    res.json({
      success: true,
      negocio: {
        id: negocio.id,
        nombre: negocio.nombre, // Nombre del negocio (estructura)
        nombreComercial: nombreComercial, // Nombre comercial de la tienda (prioritario)
        tipo: negocio.tipo,
        icono: negocio.icono,
        descripcion: negocio.descripcion,
        activo: negocio.activo,
        modulos: negocio.modulos,
        configTienda: configTienda || { nombre: nombreComercial },
      },
    });
  } catch (error) {
    console.error('Error obteniendo negocio actual:', error);
    res
      .status(500)
      .json({ success: false, message: 'No se pudo obtener información del negocio.' });
  }
});

// Configuración fiscal y datos de la tienda para módulos SRI y facturación
app.get('/api/config/tienda', authenticate, (req, res) => {
  try {
    const negocioId =
      req.user.negocioId || configNegocios.negocio_actual || configNegocios.negocios[0]?.id || null;

    if (!negocioId) {
      return res.status(404).json({
        success: false,
        message: 'No hay un negocio activo configurado.',
      });
    }

    const negocio = configNegocios.negocios.find((n) => n.id === negocioId) || null;

    const defaults = {
      nombre: negocio?.nombre || 'Mi Negocio',
      razonSocial: negocio?.razon_social || negocio?.nombre || 'Mi Negocio',
      ruc: negocio?.ruc || '',
      direccion: negocio?.direccion || '',
      telefono: negocio?.telefono || '',
      email: negocio?.email || '',
      establecimiento: '001',
      puntoEmision: '001',
      obligadoContabilidad: negocio?.obligado_contabilidad ? 'SI' : 'NO',
    };

    let configTienda = { ...defaults };

    try {
      const negocioDB = getDB(negocioId);
      const row = negocioDB.prepare('SELECT * FROM config_tienda WHERE id = 1').get();
      if (row) {
        configTienda = {
          nombre: row.nombre || defaults.nombre,
          razonSocial: row.razon_social || defaults.razonSocial,
          ruc: row.ruc || defaults.ruc,
          direccion: row.direccion || defaults.direccion,
          telefono: row.telefono || defaults.telefono,
          email: row.email || defaults.email,
          establecimiento: row.establecimiento || defaults.establecimiento,
          puntoEmision: row.punto_emision || defaults.puntoEmision,
          obligadoContabilidad: row.obligado_contabilidad ? 'SI' : 'NO',
        };

        if (Object.prototype.hasOwnProperty.call(row, 'icono')) {
          configTienda.icono = row.icono;
        }
      }
    } catch (dbError) {
      console.warn('No se pudo leer config_tienda para negocio', negocioId, dbError.message);
    }

    res.json({
      success: true,
      data: configTienda,
      negocioId,
    });
  } catch (error) {
    console.error('Error obteniendo configuración de tienda:', error);
    res
      .status(500)
      .json({ success: false, message: 'No se pudo obtener la configuración de la tienda.' });
  }
});

// Actualizar icono del negocio
app.put('/api/negocios/icono', authenticate, (req, res) => {
  try {
    const negocioId = req.user.negocio_principal;
    const { icono } = req.body;

    if (!icono) {
      return res.status(400).json({
        success: false,
        message: 'El icono es requerido',
      });
    }

    const master = getMasterDB();

    // Actualizar icono en la tabla negocios
    const stmt = master.prepare(`
      UPDATE negocios 
      SET icono = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);

    const result = stmt.run(icono, negocioId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado',
      });
    }

    // También actualizar en config_tienda de la base de datos del negocio
    const db = getDB(negocioId);
    const updateConfig = db.prepare(`
      UPDATE config_tienda 
      SET icono = ? 
      WHERE id = 1
    `);
    updateConfig.run(icono);

    console.log(`✅ Icono actualizado para negocio ${negocioId}: ${icono}`);

    res.json({
      success: true,
      message: 'Icono actualizado correctamente',
      icono,
    });
  } catch (error) {
    console.error('Error actualizando icono:', error);
    res.status(500).json({ success: false, message: 'No se pudo actualizar el icono.' });
  }
});

// Cambiar negocio activo
app.post(
  '/api/negocios/cambiar',
  authenticate,
  requireRole(ROLE_ADMIN, ROLE_SUPER_ADMIN),
  requirePermission(PERMISSIONS.VIEW_TENANTS),
  (req, res) => {
    try {
      const { negocioId } = req.body;
      const requesterIsSuper = isSuperAdmin(req);
      const allowedNegocios = getRequesterNegocioSet(req);

      const negocio = configNegocios.negocios.find((n) => n.id === negocioId);
      if (!negocio) {
        return res.status(404).json({
          success: false,
          message: 'Negocio no encontrado',
        });
      }

      if (!requesterIsSuper && !allowedNegocios.has(negocioId)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para activar este negocio.',
        });
      }

      if (!negocio.activo) {
        return res.status(400).json({
          success: false,
          message: 'Este negocio no está activo',
        });
      }

      configNegocios.negocio_actual = negocioId;
      saveConfigNegocios();

      console.log(`🔄 Negocio cambiado a: ${negocio.nombre} por ${req.user.username}`);

      res.json({
        success: true,
        message: `Cambiado a: ${negocio.nombre}`,
        negocio: negocio,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Crear nuevo negocio (solo admin)
app.post(
  '/api/negocios/crear',
  authenticate,
  requireRole(ROLE_SUPER_ADMIN),
  requirePermission(PERMISSIONS.MANAGE_TENANTS),
  criticalLimiter,
  (req, res) => {
    try {
      const { id, nombre, icono, descripcion, tipo, plan, modulos } = req.body;

      if (!id || !nombre) {
        return res.status(400).json({
          success: false,
          message: 'ID y nombre son requeridos',
        });
      }

      if (configNegocios.negocios.find((n) => n.id === id)) {
        return res.status(400).json({
          success: false,
          message: 'Este ID de negocio ya existe',
        });
      }

      const negocioTipo = (tipo || 'general').toString().trim() || 'general';
      const negocioPlan = (plan || 'basico').toString().trim() || 'basico';

      const nuevoNegocio = {
        id,
        nombre,
        nombreComercial: nombre,
        db_file: `${id}.db`,
        icono: icono || 'fas fa-store',
        descripcion: descripcion || '',
        modulos: Array.isArray(modulos) && modulos.length ? modulos : [...DEFAULT_BUSINESS_MODULES],
        activo: true,
        creado_en: new Date().toISOString(),
        configTienda: null,
      };

      const master = getMasterDB();
      const created = createNegocio(master, {
        id,
        nombre,
        tipo: negocioTipo,
        plan: negocioPlan,
        db_file: nuevoNegocio.db_file,
      });

      if (!created) {
        return res
          .status(500)
          .json({ success: false, message: 'No se pudo registrar el negocio en la base maestra.' });
      }

      configNegocios.negocios.push(nuevoNegocio);
      saveConfigNegocios();

      // Inicializar su BD
      initializeBusinessDB(id);

      // Asignar automáticamente al administrador que crea el negocio
      try {
        assignUserToNegocio(master, req.user.userId, id, 'admin', false);
      } catch (assignError) {
        console.warn(
          'No se pudo asignar automáticamente el negocio nuevo al usuario creador:',
          assignError.message
        );
      }

      console.log(`✅ Nuevo negocio creado: ${nombre} por ${req.user.username}`);

      res.json({
        success: true,
        message: 'Negocio creado exitosamente',
        negocio: {
          ...mapNegocioRowWithConfig({ ...created, tipo: negocioTipo, plan: negocioPlan }),
          icono: nuevoNegocio.icono,
          descripcion: nuevoNegocio.descripcion,
          modulos: nuevoNegocio.modulos,
        },
      });
    } catch (error) {
      console.error('Error creando negocio:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Actualizar un negocio existente (solo super administrador)
app.put(
  '/api/negocios/:id',
  authenticate,
  requireRole(ROLE_SUPER_ADMIN),
  requirePermission(PERMISSIONS.MANAGE_TENANTS),
  (req, res) => {
    try {
      let id = req.params.id;
      const master = getMasterDB();
      const payload = req.body && typeof req.body === 'object' ? req.body : {};

      let negocioDb = master.prepare('SELECT * FROM negocios WHERE id = ?').get(id);
      if (!negocioDb) {
        return res.status(404).json({
          success: false,
          message: 'Negocio no encontrado',
        });
      }

      const desiredIdCandidate = typeof payload.id === 'string' ? payload.id : id;
      const desiredIdResult = validateBusinessIdentifier(desiredIdCandidate || id);
      if (!desiredIdResult.valid) {
        return res.status(400).json({ success: false, message: desiredIdResult.message });
      }

      const desiredId = desiredIdResult.id;
      const idChanged = desiredId !== id;

      if (idChanged) {
        const existingId = master.prepare('SELECT id FROM negocios WHERE id = ?').get(desiredId);
        if (existingId) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un negocio con el identificador solicitado.',
          });
        }

        try {
          renameBusinessIdInMaster(master, id, desiredId);
          renameBusinessResources(id, desiredId);
          console.log(`🪪 Negocio renombrado: ${id} → ${desiredId} por ${req.user.username}`);
        } catch (renameError) {
          console.error('Error al renombrar el negocio:', renameError);
          return res
            .status(500)
            .json({
              success: false,
              message: 'No se pudo actualizar el identificador del negocio.',
            });
        }

        id = desiredId;
        negocioDb = master.prepare('SELECT * FROM negocios WHERE id = ?').get(id);
      }

      payload.id = desiredId;

      const rawNombre =
        typeof payload.nombre === 'string' ? payload.nombre.trim() : negocioDb.nombre;
      if (!rawNombre) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del negocio es obligatorio.',
        });
      }

      const rawTipo =
        typeof payload.tipo === 'string' ? payload.tipo.trim() : negocioDb.tipo || 'general';
      const tipoNormalizado = rawTipo || 'general';

      const allowedPlans = new Set(['basico', 'basic', 'pro', 'enterprise']);
      let rawPlan =
        typeof payload.plan === 'string'
          ? payload.plan.trim().toLowerCase()
          : (negocioDb.plan || 'basico').toLowerCase();
      if (rawPlan === 'basic') {
        rawPlan = 'basico';
      }
      if (!allowedPlans.has(rawPlan)) {
        rawPlan = (negocioDb.plan || 'basico').toLowerCase();
      }

      const isProtectedBusiness =
        master
          .prepare(
            `
      SELECT COUNT(*) AS count
      FROM usuarios_negocios un
      JOIN usuarios u ON u.id = un.usuario_id
      WHERE un.negocio_id = @negocioId
        AND LOWER(u.rol) = LOWER(@rol)
    `
          )
          .get({ negocioId: id, rol: ROLE_SUPER_ADMIN }).count > 0;

      if (isProtectedBusiness) {
        rawPlan = 'enterprise';
      }

      const rawIconCandidate = typeof payload.icono === 'string' ? payload.icono.trim() : '';
      const iconClass =
        rawIconCandidate && /^(fa[a-z-]*\s+)?fa-[\w-]+/.test(rawIconCandidate)
          ? rawIconCandidate
          : null;
      const descripcionTexto =
        typeof payload.descripcion === 'string' ? payload.descripcion.trim() : undefined;

      const rawModulos = payload.modulos;
      let modulosSeleccionados = [];
      if (Array.isArray(rawModulos)) {
        modulosSeleccionados = rawModulos;
      } else if (typeof rawModulos === 'string') {
        const trimmed = rawModulos.trim();
        if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              modulosSeleccionados = parsed;
            }
          } catch (error) {
            console.warn('No se pudo parsear modulos JSON:', error.message);
          }
        }
        if (!modulosSeleccionados.length) {
          modulosSeleccionados = trimmed.split(',');
        }
      }

      modulosSeleccionados = Array.from(
        new Set(
          modulosSeleccionados
            .map((mod) => {
              if (typeof mod !== 'string') {
                return '';
              }
              let value = mod.trim();
              if (value.startsWith('[')) {
                value = value.slice(1);
              }
              if (value.endsWith(']')) {
                value = value.slice(0, -1);
              }
              value = value.replace(/^['"]+/, '').replace(/['"]+$/, '');
              return value.trim();
            })
            .filter(Boolean)
        )
      );

      const rawConfigTiendaInput =
        payload.configTienda && typeof payload.configTienda === 'object'
          ? payload.configTienda
          : null;

      const pickFirstString = (...values) => {
        for (const value of values) {
          if (value === null || value === undefined) {
            continue;
          }
          const text = String(value).trim();
          if (text) {
            return text;
          }
        }
        return undefined;
      };

      const incomingStoreConfig = {
        nombre: pickFirstString(
          payload.nombreComercial,
          payload.nombre_comercial,
          rawConfigTiendaInput?.nombre,
          rawConfigTiendaInput?.nombreComercial
        ),
        razonSocial: pickFirstString(
          payload.razonSocial,
          payload.razon_social,
          rawConfigTiendaInput?.razonSocial,
          rawConfigTiendaInput?.razon_social
        ),
        ruc: pickFirstString(payload.ruc, rawConfigTiendaInput?.ruc),
        direccion: pickFirstString(
          payload.direccion,
          payload.direccionMatriz,
          payload.direccion_matriz,
          rawConfigTiendaInput?.direccion
        ),
        telefono: pickFirstString(
          payload.telefono,
          payload.telefonoNegocio,
          payload.telefono_negocio,
          rawConfigTiendaInput?.telefono
        ),
        email: pickFirstString(payload.email, payload.correo, rawConfigTiendaInput?.email),
        establecimiento: pickFirstString(
          payload.establecimiento,
          rawConfigTiendaInput?.establecimiento
        ),
        puntoEmision: pickFirstString(
          payload.puntoEmision,
          payload.punto_emision,
          rawConfigTiendaInput?.puntoEmision,
          rawConfigTiendaInput?.punto_emision
        ),
      };

      const incomingObligadoRaw =
        payload.obligadoContabilidad ??
        payload.obligado_contabilidad ??
        rawConfigTiendaInput?.obligadoContabilidad ??
        rawConfigTiendaInput?.obligado_contabilidad;

      let storeConfigResult = null;

      let configIndex = configNegocios.negocios.findIndex((n) => n.id === id);
      if (configIndex === -1) {
        configNegocios.negocios.push({
          id,
          nombre: negocioDb.nombre,
          nombreComercial: negocioDb.nombre,
          db_file: `${id}.db`,
          icono: 'fas fa-store',
          descripcion: '',
          modulos: [],
          activo: negocioDb.estado === 'activo',
          creado_en: negocioDb.created_at || negocioDb.fecha_creacion || new Date().toISOString(),
          configTienda: null,
        });
        configIndex = configNegocios.negocios.length - 1;
      }

      const configActual = configNegocios.negocios[configIndex];

      if (!modulosSeleccionados.length && Array.isArray(configActual.modulos)) {
        modulosSeleccionados = configActual.modulos;
      }

      if (!modulosSeleccionados.length) {
        modulosSeleccionados = [...DEFAULT_BUSINESS_MODULES];
      }

      master
        .prepare(
          `
      UPDATE negocios
      SET nombre = @nombre,
          tipo = @tipo,
          plan = @plan,
          icono = @icono,
          descripcion = @descripcion,
          modulos = @modulos,
          updated_at = datetime('now')
      WHERE id = @id
    `
        )
        .run({
          id,
          nombre: rawNombre,
          tipo: tipoNormalizado,
          plan: rawPlan,
          icono: iconClass || configActual.icono || 'fas fa-store',
          descripcion:
            descripcionTexto !== undefined ? descripcionTexto : configActual.descripcion || '',
          modulos: JSON.stringify(modulosSeleccionados),
        });

      const provisionalNombreComercial =
        pickFirstString(incomingStoreConfig.nombre, configActual.nombreComercial, rawNombre) ||
        rawNombre;

      const cachedConfigTienda =
        configActual.configTienda && typeof configActual.configTienda === 'object'
          ? { ...configActual.configTienda }
          : null;

      configNegocios.negocios[configIndex] = {
        ...configActual,
        id,
        nombre: rawNombre,
        nombreComercial: provisionalNombreComercial,
        icono: iconClass || configActual.icono || 'fas fa-store',
        descripcion:
          descripcionTexto !== undefined ? descripcionTexto : configActual.descripcion || '',
        modulos: modulosSeleccionados,
        activo:
          configActual.activo !== undefined ? configActual.activo : negocioDb.estado === 'activo',
        db_file: configActual.db_file || `${id}.db`,
        creado_en:
          configActual.creado_en ||
          negocioDb.created_at ||
          negocioDb.fecha_creacion ||
          new Date().toISOString(),
        plan: rawPlan,
        tipo: tipoNormalizado,
        configTienda: cachedConfigTienda,
      };

      try {
        const negocioDbInstance = getDB(id);
        const existingStore =
          negocioDbInstance.prepare('SELECT * FROM config_tienda WHERE id = 1').get() || {};

        const resolvedNombre =
          pickFirstString(incomingStoreConfig.nombre, existingStore.nombre, rawNombre) || rawNombre;
        const resolvedRazon =
          pickFirstString(incomingStoreConfig.razonSocial, existingStore.razon_social, rawNombre) ||
          rawNombre;
        const resolvedRuc =
          pickFirstString(incomingStoreConfig.ruc, existingStore.ruc) || existingStore.ruc || '';
        const resolvedDireccion =
          pickFirstString(incomingStoreConfig.direccion, existingStore.direccion) ||
          existingStore.direccion ||
          '';
        const resolvedTelefono =
          pickFirstString(incomingStoreConfig.telefono, existingStore.telefono) ||
          existingStore.telefono ||
          '';
        const resolvedEmail =
          pickFirstString(incomingStoreConfig.email, existingStore.email) ||
          existingStore.email ||
          '';
        const resolvedEstablecimiento =
          pickFirstString(incomingStoreConfig.establecimiento, existingStore.establecimiento) ||
          existingStore.establecimiento ||
          '';
        const resolvedPuntoEmision =
          pickFirstString(incomingStoreConfig.puntoEmision, existingStore.punto_emision) ||
          existingStore.punto_emision ||
          '';
        const obligadoBoolean =
          incomingObligadoRaw !== undefined
            ? parseBoolean(incomingObligadoRaw, existingStore.obligado_contabilidad === 1)
            : existingStore.obligado_contabilidad === 1;

        storeConfigResult = {
          nombre: resolvedNombre,
          razon_social: resolvedRazon,
          ruc: resolvedRuc,
          direccion: resolvedDireccion,
          telefono: resolvedTelefono,
          email: resolvedEmail,
          establecimiento: resolvedEstablecimiento,
          punto_emision: resolvedPuntoEmision,
          obligado_contabilidad: obligadoBoolean ? 1 : 0,
        };

        negocioDbInstance
          .prepare(
            `
        INSERT INTO config_tienda (
          id, nombre, razon_social, ruc, direccion, telefono, email, establecimiento, punto_emision, obligado_contabilidad
        ) VALUES (
          1, @nombre, @razon_social, @ruc, @direccion, @telefono, @email, @establecimiento, @punto_emision, @obligado_contabilidad
        )
        ON CONFLICT(id) DO UPDATE SET
          nombre = excluded.nombre,
          razon_social = excluded.razon_social,
          ruc = excluded.ruc,
          direccion = excluded.direccion,
          telefono = excluded.telefono,
          email = excluded.email,
          establecimiento = excluded.establecimiento,
          punto_emision = excluded.punto_emision,
          obligado_contabilidad = excluded.obligado_contabilidad
      `
          )
          .run(storeConfigResult);
      } catch (syncError) {
        console.warn(
          `No se pudo sincronizar la configuración de tienda para ${id}:`,
          syncError.message
        );
      }

      if (!storeConfigResult) {
        storeConfigResult = {
          nombre: rawNombre,
          razon_social: rawNombre,
          ruc: '',
          direccion: '',
          telefono: '',
          email: '',
          establecimiento: '',
          punto_emision: '',
          obligado_contabilidad: 0,
        };
      }

      const configTiendaCache = {
        nombre: storeConfigResult.nombre,
        razonSocial: storeConfigResult.razon_social,
        ruc: storeConfigResult.ruc,
        direccion: storeConfigResult.direccion,
        telefono: storeConfigResult.telefono,
        email: storeConfigResult.email,
        establecimiento: storeConfigResult.establecimiento,
        puntoEmision: storeConfigResult.punto_emision,
        obligadoContabilidad: storeConfigResult.obligado_contabilidad === 1,
      };

      configNegocios.negocios[configIndex].nombreComercial =
        storeConfigResult.nombre || configNegocios.negocios[configIndex].nombre;
      configNegocios.negocios[configIndex].configTienda = configTiendaCache;

      saveConfigNegocios();

      const updatedRow = master
        .prepare(
          `
      SELECT id, nombre, tipo, estado, plan, usuarios_max, productos_max, fecha_creacion, created_at, updated_at
      FROM negocios
      WHERE id = ?
    `
        )
        .get(id);

      const negocioActualizado = mapNegocioRowWithConfig(updatedRow);

      console.log(`🛠️ Negocio actualizado: ${rawNombre} (${id}) por ${req.user.username}`);

      return res.json({
        success: true,
        message: 'Negocio actualizado correctamente.',
        negocio: negocioActualizado,
        protegido: isProtectedBusiness,
      });
    } catch (error) {
      console.error('Error actualizando negocio:', error);
      return res.status(500).json({ success: false, message: 'No se pudo actualizar el negocio.' });
    }
  }
);

// Activar/Desactivar negocio (solo admin)
app.put(
  '/api/negocios/:id/toggle',
  authenticate,
  requireRole(ROLE_SUPER_ADMIN),
  requirePermission(PERMISSIONS.MANAGE_TENANTS),
  (req, res) => {
    try {
      const { id } = req.params;
      const requesterIsSuper = isSuperAdmin(req);
      const allowedNegocios = getRequesterNegocioSet(req);

      const negocio = configNegocios.negocios.find((n) => n.id === id);
      if (!negocio) {
        return res.status(404).json({
          success: false,
          message: 'Negocio no encontrado',
        });
      }

      if (!requesterIsSuper && !allowedNegocios.has(id)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para modificar este negocio.',
        });
      }

      negocio.activo = !negocio.activo;
      saveConfigNegocios();

      // Sincronizar el estado con la base de datos maestra
      try {
        const master = getMasterDB();
        master
          .prepare('UPDATE negocios SET estado = ? WHERE id = ?')
          .run(negocio.activo ? 'activo' : 'inactivo', id);
      } catch (dbError) {
        console.error(`Error sincronizando estado de negocio ${id} con la BD maestra:`, dbError);
        // Opcional: revertir el cambio en config si la BD falla
        negocio.activo = !negocio.activo;
        saveConfigNegocios();
        throw new Error('No se pudo actualizar el estado en la base de datos principal.');
      }

      res.json({
        success: true,
        message: `Negocio ${negocio.activo ? 'activado' : 'desactivado'}`,
        negocio,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Eliminar negocio (solo super administrador)
app.delete(
  '/api/negocios/:id',
  authenticate,
  requireRole(ROLE_SUPER_ADMIN),
  requirePermission(PERMISSIONS.MANAGE_TENANTS),
  criticalLimiter,
  (req, res) => {
    try {
      const rawId = req.params.id;
      const negocioId = typeof rawId === 'string' ? rawId.trim() : '';

      if (!negocioId) {
        return res.status(400).json({
          success: false,
          message: 'Identificador de negocio inválido.',
        });
      }

      const configEntryIndex = configNegocios.negocios.findIndex(
        (negocio) => negocio.id === negocioId
      );
      if (configEntryIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Negocio no encontrado en la configuración actual.',
        });
      }

      if (configNegocios.negocios.length <= 1) {
        return res.status(400).json({
          success: false,
          message:
            'Debe existir al menos un negocio activo en el sistema. No se puede eliminar el único negocio disponible.',
        });
      }

      const preserveData = parseBoolean(req.body?.preserveData ?? req.query?.preserveData, false);

      const master = getMasterDB();
      const negocioDb = master.prepare('SELECT * FROM negocios WHERE id = ?').get(negocioId);
      if (!negocioDb) {
        return res.status(404).json({
          success: false,
          message: 'El registro del negocio no existe en la base principal.',
        });
      }

      const protectedCount =
        master
          .prepare(
            `
        SELECT COUNT(*) AS count
        FROM usuarios_negocios un
        JOIN usuarios u ON u.id = un.usuario_id
        WHERE un.negocio_id = ?
          AND LOWER(u.rol) = LOWER(?)
      `
          )
          .get(negocioId, ROLE_SUPER_ADMIN)?.count || 0;

      if (protectedCount > 0) {
        return res.status(403).json({
          success: false,
          message:
            'No se puede eliminar un negocio que tiene superadministradores asignados. Reasigna o remueve esos usuarios primero.',
        });
      }

      if (dbConnections.has(negocioId)) {
        try {
          dbConnections.get(negocioId).close();
        } catch (closeError) {
          console.warn(
            `No se pudo cerrar la conexión para el negocio ${negocioId}:`,
            closeError.message
          );
        }
        dbConnections.delete(negocioId);
      }

      const configEntry = configNegocios.negocios[configEntryIndex];
      const negocioNombre = configEntry?.nombre || negocioDb?.nombre || negocioId;
      const dbFileName = configEntry?.db_file || `${negocioId}.db`;
      const dbFilePath = path.join(DATA_DIR, dbFileName);
      const uploadsPath = path.join(UPLOADS_DIR, negocioId);
      const logsPath = path.join(LOGS_DIR, negocioId);

      let affectedUsers = 0;
      const archiveTargets = {
        db: null,
        uploads: null,
        logs: null,
      };
      const warnings = [];

      const cleanNegocio = master.transaction(() => {
        master.prepare('DELETE FROM usuarios_negocios WHERE negocio_id = ?').run(negocioId);

        try {
          master.prepare('DELETE FROM auditoria_negocios WHERE negocio_id = ?').run(negocioId);
        } catch (auditError) {
          if (!/no such table/i.test(auditError.message)) {
            warnings.push(`No se pudo limpiar la auditoría del negocio: ${auditError.message}`);
          }
        }

        const users = master.prepare('SELECT id, negocios, negocio_principal FROM usuarios').all();
        const updateUser = master.prepare(`
          UPDATE usuarios
          SET negocios = @negocios,
              negocio_principal = @principal
          WHERE id = @id
        `);

        users.forEach((user) => {
          const rawList = user.negocios;
          let negociosList = [];
          if (Array.isArray(rawList)) {
            negociosList = rawList.map((item) => String(item));
          } else if (typeof rawList === 'string' && rawList.trim()) {
            try {
              const parsed = JSON.parse(rawList);
              if (Array.isArray(parsed)) {
                negociosList = parsed.map((item) => String(item));
              }
            } catch (parseError) {
              warnings.push(
                `No se pudo parsear la lista de negocios del usuario ${user.id}: ${parseError.message}`
              );
            }
          }

          const filtered = negociosList.filter((item) => item !== negocioId);
          const principalRemoved = user.negocio_principal === negocioId;
          const needsUpdate = principalRemoved || filtered.length !== negociosList.length;

          if (needsUpdate) {
            const principal = filtered[0] || null;
            updateUser.run({
              id: user.id,
              negocios: filtered.length ? JSON.stringify(filtered) : '[]',
              principal,
            });
            affectedUsers += 1;
          }
        });

        master.prepare('DELETE FROM negocios WHERE id = ?').run(negocioId);
      });

      cleanNegocio();

      configNegocios.negocios.splice(configEntryIndex, 1);

      if (configNegocios.negocio_actual === negocioId) {
        const fallback = configNegocios.negocios[0] || null;
        configNegocios.negocio_actual = fallback ? fallback.id : null;
      }

      saveConfigNegocios();

      if (preserveData) {
        const timestamp = formatTimestampForFile();
        if (fs.existsSync(dbFilePath)) {
          try {
            ensureDirectory(ARCHIVE_DIR);
            const targetPath = path.join(ARCHIVE_DIR, `${negocioId}-${timestamp}.db`);
            fs.renameSync(dbFilePath, targetPath);
            archiveTargets.db = targetPath;
          } catch (moveError) {
            warnings.push(
              `No se pudo archivar la base de datos ${dbFileName}: ${moveError.message}`
            );
          }
        }

        if (fs.existsSync(uploadsPath)) {
          try {
            ensureDirectory(ARCHIVE_UPLOADS_DIR);
            const targetPath = path.join(ARCHIVE_UPLOADS_DIR, `${negocioId}-${timestamp}`);
            fs.renameSync(uploadsPath, targetPath);
            archiveTargets.uploads = targetPath;
          } catch (moveError) {
            warnings.push(
              `No se pudo archivar la carpeta de archivos del negocio: ${moveError.message}`
            );
          }
        }

        if (fs.existsSync(logsPath)) {
          try {
            ensureDirectory(ARCHIVE_LOGS_DIR);
            const targetPath = path.join(ARCHIVE_LOGS_DIR, `${negocioId}-${timestamp}`);
            fs.renameSync(logsPath, targetPath);
            archiveTargets.logs = targetPath;
          } catch (moveError) {
            warnings.push(
              `No se pudo archivar la carpeta de logs del negocio: ${moveError.message}`
            );
          }
        }
      } else {
        if (fs.existsSync(dbFilePath)) {
          try {
            fs.rmSync(dbFilePath, { force: true });
          } catch (removeError) {
            warnings.push(
              `No se pudo eliminar la base de datos ${dbFileName}: ${removeError.message}`
            );
          }
        }

        if (fs.existsSync(uploadsPath)) {
          try {
            fs.rmSync(uploadsPath, { recursive: true, force: true });
          } catch (removeError) {
            warnings.push(
              `No se pudo eliminar la carpeta de archivos del negocio: ${removeError.message}`
            );
          }
        }

        if (fs.existsSync(logsPath)) {
          try {
            fs.rmSync(logsPath, { recursive: true, force: true });
          } catch (removeError) {
            warnings.push(
              `No se pudo eliminar la carpeta de logs del negocio: ${removeError.message}`
            );
          }
        }
      }

      console.log(
        `🗑️  Negocio eliminado: ${negocioNombre} (${negocioId}) por ${req.user.username}`
      );

      res.json({
        success: true,
        message: preserveData
          ? 'Negocio archivado correctamente. Los datos fueron preservados.'
          : 'Negocio eliminado definitivamente junto con sus datos asociados.',
        negocioId,
        negocioNombre,
        preserveData,
        archive: archiveTargets,
        affectedUsers,
        warnings,
      });
    } catch (error) {
      console.error('Error eliminando negocio:', error);
      res.status(500).json({
        success: false,
        message: 'No se pudo eliminar el negocio solicitado.',
      });
    }
  }
);

// ============================================
// RUTAS: USUARIOS (ADMIN)
// ============================================

function isSuperAdmin(req) {
  return normalizeRole(req.user?.rol) === ROLE_SUPER_ADMIN;
}

function getRequesterNegocioSet(req) {
  const allowed = new Set();
  if (Array.isArray(req.user?.negocios)) {
    req.user.negocios.forEach((id) => {
      if (id) allowed.add(id.toString().trim());
    });
  }
  if (req.user?.negocioId) {
    allowed.add(req.user.negocioId.toString().trim());
  }
  return allowed;
}

function sanitizeNegocioAssignmentsInput(rawAssignments, fallbackNegocioId = null) {
  const assignments = Array.isArray(rawAssignments) ? rawAssignments : [];

  const cleaned = assignments
    .map((item) => {
      const rawId = item?.id ?? item?.negocioId ?? item;
      const id = rawId !== undefined && rawId !== null ? String(rawId).trim() : '';

      if (!id) {
        return null;
      }

      const rawRol = item?.rol ?? item?.rol_en_negocio ?? 'user';
      const rol = typeof rawRol === 'string' && rawRol.trim() ? rawRol.trim() : 'user';
      const principal = toBooleanFlag(item?.principal ?? item?.es_negocio_principal);

      return {
        id,
        rol,
        principal,
      };
    })
    .filter(Boolean);

  if (!cleaned.length && fallbackNegocioId) {
    cleaned.push({ id: String(fallbackNegocioId).trim(), rol: 'user', principal: true });
  }

  const unique = new Map();
  cleaned.forEach((assignment) => {
    if (!unique.has(assignment.id)) {
      unique.set(assignment.id, { ...assignment });
    } else if (assignment.principal) {
      unique.get(assignment.id).principal = true;
    }
  });

  const result = Array.from(unique.values());
  if (result.length) {
    const hasPrincipal = result.some((assignment) => assignment.principal);
    if (!hasPrincipal) {
      result[0].principal = true;
    }
  }

  return result;
}

function updateUserNegocioAssignments(masterDb, userId, assignments) {
  const existingAssignments = masterDb
    .prepare('SELECT negocio_id FROM usuarios_negocios WHERE usuario_id = ?')
    .all(userId);

  const existingIds = new Set(
    existingAssignments.map((row) => (row?.negocio_id ?? '').toString().trim()).filter(Boolean)
  );

  const incomingIds = new Set(assignments.map((item) => item.id));

  masterDb.transaction(() => {
    assignments.forEach((assignment) => {
      const assigned = assignUserToNegocio(
        masterDb,
        userId,
        assignment.id,
        assignment.rol,
        assignment.principal
      );

      if (!assigned) {
        throw new Error(`No se pudo asignar el negocio ${assignment.id} al usuario.`);
      }
    });

    existingIds.forEach((negocioId) => {
      if (!incomingIds.has(negocioId)) {
        const removed = removeUserFromNegocio(masterDb, userId, negocioId);
        if (!removed) {
          throw new Error(`No se pudo remover el negocio ${negocioId} del usuario.`);
        }
      }
    });
  })();
}

function ensureUserSharesNegocio(masterDb, userId, negocioSet) {
  if (!negocioSet || !negocioSet.size) {
    return false;
  }

  const placeholders = Array.from(negocioSet)
    .map(() => '?')
    .join(',');
  const stmt = masterDb.prepare(`
    SELECT 1
    FROM usuarios_negocios
    WHERE usuario_id = ?
      AND negocio_id IN (${placeholders})
    LIMIT 1
  `);

  const params = [userId, ...Array.from(negocioSet)];
  return Boolean(stmt.get(...params));
}

app.get(
  '/api/usuarios',
  authenticate,
  requireRole(ROLE_ADMIN, ROLE_SUPER_ADMIN),
  requirePermission(PERMISSIONS.VIEW_USERS),
  (req, res) => {
    try {
      const master = getMasterDB();
      const requesterIsSuper = isSuperAdmin(req);
      const allowedNegocios = getRequesterNegocioSet(req);

      let rows = [];

      if (requesterIsSuper) {
        rows = master
          .prepare(
            `
          SELECT id, username, nombre, email, rol, activo, ultimo_acceso, created_at, updated_at, requiere_cambio_password
          FROM usuarios
          ORDER BY username COLLATE NOCASE ASC
        `
          )
          .all();
      } else if (allowedNegocios.size) {
        const placeholders = Array.from(allowedNegocios)
          .map(() => '?')
          .join(',');
        rows = master
          .prepare(
            `
          SELECT DISTINCT u.id, u.username, u.nombre, u.email, u.rol, u.activo,
                 u.ultimo_acceso, u.created_at, u.updated_at, u.requiere_cambio_password
          FROM usuarios u
          JOIN usuarios_negocios un ON un.usuario_id = u.id
          WHERE un.negocio_id IN (${placeholders})
          ORDER BY u.username COLLATE NOCASE ASC
        `
          )
          .all(...Array.from(allowedNegocios));
      }

      const usuarios = rows.map((row) => {
        const mapped = mapUsuarioRow(row);
        const negociosAsignados = getUserNegocios(master, row.id).map((negocio) => ({
          id: negocio.id,
          nombre: negocio.nombre,
          tipo: negocio.tipo,
          rol: negocio.rol_en_negocio,
          principal: !!negocio.es_negocio_principal,
        }));

        const visibles = requesterIsSuper
          ? negociosAsignados
          : negociosAsignados.filter((negocio) => allowedNegocios.has(negocio.id));

        return {
          ...mapped,
          negocios: visibles,
          negociosIds: visibles.map((negocio) => negocio.id),
        };
      });

      res.json({ success: true, usuarios });
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      res.status(500).json({ success: false, message: 'No se pudieron cargar los usuarios.' });
    }
  }
);

app.post(
  '/api/usuarios',
  authenticate,
  requireRole(ROLE_ADMIN, ROLE_SUPER_ADMIN),
  requirePermission(PERMISSIONS.MANAGE_USERS_LOCAL),
  async (req, res) => {
    try {
      const master = getMasterDB();
      const requesterIsSuper = isSuperAdmin(req);
      const allowedNegocios = getRequesterNegocioSet(req);
      const {
        username,
        password,
        nombre = null,
        email = null,
        rol,
        activo = true,
        requirePasswordChange = false,
        negocios: rawNegocios = null,
      } = req.body || {};

      const trimmedUsername = (username || '').toString().trim();
      const trimmedRol = (rol || '').toString().trim();
      const normalizedRole = normalizeRole(trimmedRol);

      if (!trimmedUsername || !password || !trimmedRol) {
        return res.status(400).json({
          success: false,
          message: 'Usuario, contraseña y rol son obligatorios.',
        });
      }

      if (!ALLOWED_ROLES.has(normalizedRole)) {
        return res.status(400).json({
          success: false,
          message: 'El rol indicado no es válido.',
        });
      }

      const existing = master
        .prepare('SELECT 1 FROM usuarios WHERE LOWER(username) = LOWER(?)')
        .get(trimmedUsername);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'El usuario ya existe.',
        });
      }

      const passwordStrength = validatePasswordStrength(password);
      if (!passwordStrength.valid) {
        return res.status(400).json({
          success: false,
          message: passwordStrength.message || 'La contraseña no cumple los requisitos mínimos.',
        });
      }

      if (!requesterIsSuper) {
        if (normalizedRole === ROLE_SUPER_ADMIN) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permiso para crear usuarios superadministradores.',
          });
        }

        if (normalizedRole === ROLE_ADMIN) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permiso para crear administradores.',
          });
        }
      }

      const negocioFallback = req.negocioId || req.user?.negocioId || null;
      const assignments = sanitizeNegocioAssignmentsInput(rawNegocios, negocioFallback);

      if (!assignments.length) {
        return res.status(400).json({
          success: false,
          message: 'Debes asignar al menos un negocio al usuario.',
        });
      }

      if (!requesterIsSuper) {
        const allAllowed = assignments.every((assignment) => allowedNegocios.has(assignment.id));
        if (!allAllowed) {
          return res.status(403).json({
            success: false,
            message: 'No puedes asignar negocios a los que no tienes acceso.',
          });
        }
      }

      const id = generateId('usr');
      const passwordHash = await hashPassword(password);

      const createUserTx = master.transaction((record, assignmentList) => {
        master
          .prepare(
            `
          INSERT INTO usuarios (id, username, password, nombre, email, rol, activo, requiere_cambio_password, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `
          )
          .run(
            record.id,
            record.username,
            record.password,
            record.nombre,
            record.email,
            record.rol,
            record.activo,
            record.requiere_cambio_password
          );

        updateUserNegocioAssignments(master, record.id, assignmentList);
      });

      createUserTx(
        {
          id,
          username: trimmedUsername,
          password: passwordHash,
          nombre: nombre ? nombre.toString().trim() : null,
          email: email ? email.toString().trim() : null,
          rol: normalizedRole,
          activo: activo ? 1 : 0,
          requiere_cambio_password: requirePasswordChange ? 1 : 0,
        },
        assignments
      );

      const createdUser = master
        .prepare(
          `
        SELECT id, username, nombre, email, rol, activo, ultimo_acceso, created_at, updated_at, requiere_cambio_password
        FROM usuarios
        WHERE id = ?
      `
        )
        .get(id);

      const negociosAsignados = getUserNegocios(master, id).map((negocio) => ({
        id: negocio.id,
        nombre: negocio.nombre,
        tipo: negocio.tipo,
        rol: negocio.rol_en_negocio,
        principal: !!negocio.es_negocio_principal,
      }));

      res.status(201).json({
        success: true,
        message: 'Usuario creado correctamente.',
        usuario: {
          ...mapUsuarioRow(createdUser),
          negocios: negociosAsignados,
          negociosIds: negociosAsignados.map((negocio) => negocio.id),
        },
      });
    } catch (error) {
      console.error('Error creando usuario:', error);
      res.status(500).json({ success: false, message: 'No se pudo crear el usuario.' });
    }
  }
);

app.put(
  '/api/usuarios/:id',
  authenticate,
  requireRole(ROLE_ADMIN, ROLE_SUPER_ADMIN),
  requirePermission(PERMISSIONS.MANAGE_USERS_LOCAL),
  async (req, res) => {
    try {
      const { id } = req.params;
      const master = getMasterDB();
      const requesterIsSuper = isSuperAdmin(req);
      const allowedNegocios = getRequesterNegocioSet(req);

      const existente = master.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
      if (!existente) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      }

      const existingRole = normalizeRole(existente.rol);

      if (!requesterIsSuper) {
        if (existingRole === ROLE_SUPER_ADMIN) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permiso para modificar un superadministrador.',
          });
        }

        if (existingRole === ROLE_ADMIN) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permiso para modificar un administrador.',
          });
        }

        const sharesNegocio = ensureUserSharesNegocio(master, id, allowedNegocios);
        if (!sharesNegocio) {
          return res.status(403).json({
            success: false,
            message: 'No puedes modificar usuarios que no pertenecen a tus negocios.',
          });
        }
      }

      const updates = [];
      const values = [];
      const payload = req.body || {};
      const assignmentsPayload = Object.prototype.hasOwnProperty.call(payload, 'negocios')
        ? payload.negocios
        : undefined;
      let assignments = null;

      if (Object.prototype.hasOwnProperty.call(payload, 'nombre')) {
        updates.push('nombre = ?');
        values.push(payload.nombre ? payload.nombre.toString().trim() : null);
      }

      if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
        updates.push('email = ?');
        values.push(payload.email ? payload.email.toString().trim() : null);
      }

      if (Object.prototype.hasOwnProperty.call(payload, 'rol')) {
        const rawRole = (payload.rol || '').toString().trim();
        if (!rawRole) {
          return res.status(400).json({ success: false, message: 'El rol no puede estar vacío.' });
        }

        const normalizedRequestedRole = normalizeRole(rawRole);

        if (!ALLOWED_ROLES.has(normalizedRequestedRole)) {
          return res.status(400).json({ success: false, message: 'El rol indicado no es válido.' });
        }

        if (!requesterIsSuper) {
          if (normalizedRequestedRole === ROLE_SUPER_ADMIN) {
            return res.status(403).json({
              success: false,
              message: 'No tienes permiso para asignar rol de superadministrador.',
            });
          }

          if (normalizedRequestedRole === ROLE_ADMIN) {
            return res.status(403).json({
              success: false,
              message: 'No tienes permiso para asignar rol de administrador.',
            });
          }
        }

        updates.push('rol = ?');
        values.push(normalizedRequestedRole);
      }

      if (Object.prototype.hasOwnProperty.call(payload, 'activo')) {
        updates.push('activo = ?');
        values.push(payload.activo ? 1 : 0);
      }

      if (payload.password) {
        const strength = validatePasswordStrength(payload.password);
        if (!strength.valid) {
          return res
            .status(400)
            .json({ success: false, message: strength.message || 'La contraseña no es válida.' });
        }
        const passwordHash = await hashPassword(payload.password);
        updates.push('password = ?');
        values.push(passwordHash);
        const forceChange = Object.prototype.hasOwnProperty.call(payload, 'requirePasswordChange')
          ? payload.requirePasswordChange
            ? 1
            : 0
          : 1;
        updates.push('requiere_cambio_password = ?');
        values.push(forceChange);
      } else if (Object.prototype.hasOwnProperty.call(payload, 'requirePasswordChange')) {
        updates.push('requiere_cambio_password = ?');
        values.push(payload.requirePasswordChange ? 1 : 0);
      }
      if (assignmentsPayload !== undefined) {
        assignments = sanitizeNegocioAssignmentsInput(assignmentsPayload, null);

        if (!assignments.length) {
          return res.status(400).json({
            success: false,
            message: 'El usuario debe permanecer asignado al menos a un negocio.',
          });
        }

        if (!requesterIsSuper) {
          const allAllowed = assignments.every((assignment) => allowedNegocios.has(assignment.id));
          if (!allAllowed) {
            return res.status(403).json({
              success: false,
              message: 'No puedes asignar negocios a los que no tienes acceso.',
            });
          }
        }
      }

      if (!updates.length && assignments === null) {
        return res.status(400).json({ success: false, message: 'No hay cambios para aplicar.' });
      }

      updates.push("updated_at = datetime('now')");

      if (updates.length > 1 || assignments === null) {
        // Validar que todas las actualizaciones son seguras (contienen '=' y parámetros)
        const allUpdatesValid = updates.every((u) => u.includes('=') || u.includes('datetime'));
        if (!allUpdatesValid) {
          return res
            .status(400)
            .json({ success: false, message: 'Actualización inválida detectada.' });
        }

        const statement = master.prepare(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`);
        const result = statement.run(...values, id);

        if (!result.changes && assignments === null) {
          return res.status(200).json({
            success: true,
            message: 'No se detectaron cambios.',
            usuario: mapUsuarioRow(existente),
          });
        }
      }

      if (assignments !== null) {
        updateUserNegocioAssignments(master, id, assignments);
      }

      const updatedUser = master
        .prepare(
          `
      SELECT id, username, nombre, email, rol, activo, ultimo_acceso, created_at, updated_at, requiere_cambio_password
      FROM usuarios
      WHERE id = ?
    `
        )
        .get(id);
      const negociosAsignadosRaw = getUserNegocios(master, id).map((negocio) => ({
        id: negocio.id,
        nombre: negocio.nombre,
        tipo: negocio.tipo,
        rol: negocio.rol_en_negocio,
        principal: !!negocio.es_negocio_principal,
      }));

      const negociosAsignados = requesterIsSuper
        ? negociosAsignadosRaw
        : negociosAsignadosRaw.filter((negocio) => allowedNegocios.has(negocio.id));

      res.json({
        success: true,
        message: 'Usuario actualizado correctamente.',
        usuario: {
          ...mapUsuarioRow(updatedUser),
          negocios: negociosAsignados,
          negociosIds: negociosAsignados.map((negocio) => negocio.id),
        },
      });
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      res.status(500).json({ success: false, message: 'No se pudo actualizar el usuario.' });
    }
  }
);

app.delete(
  '/api/usuarios/:id',
  authenticate,
  requireRole(ROLE_ADMIN, ROLE_SUPER_ADMIN),
  requirePermission(PERMISSIONS.MANAGE_USERS_LOCAL),
  (req, res) => {
    try {
      const { id } = req.params;
      const master = getMasterDB();

      if (req.user?.userId === id) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propio usuario.',
        });
      }

      const requesterIsSuper = isSuperAdmin(req);
      const allowedNegocios = getRequesterNegocioSet(req);

      const target = master.prepare('SELECT id, rol FROM usuarios WHERE id = ?').get(id);
      if (!target) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      }

      const targetRole = normalizeRole(target.rol);

      if (!requesterIsSuper) {
        if (targetRole === ROLE_SUPER_ADMIN) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permiso para eliminar un superadministrador.',
          });
        }

        if (targetRole === ROLE_ADMIN) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permiso para eliminar un administrador.',
          });
        }

        const sharesNegocio = ensureUserSharesNegocio(master, id, allowedNegocios);
        if (!sharesNegocio) {
          return res.status(403).json({
            success: false,
            message: 'No puedes eliminar usuarios que no pertenecen a tus negocios.',
          });
        }
      }

      const result = master.prepare('DELETE FROM usuarios WHERE id = ?').run(id);

      if (!result.changes) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      }

      res.json({ success: true, message: 'Usuario eliminado correctamente.' });
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      res.status(500).json({ success: false, message: 'No se pudo eliminar el usuario.' });
    }
  }
);

// ============================================
// RUTAS: ASIGNACIÓN DE NEGOCIOS A USUARIOS
// ============================================

// ============================================
// RUTAS: PERFIL DE USUARIO
// ============================================

// Obtener perfil del usuario autenticado
app.get('/api/usuarios/perfil', authenticate, (req, res) => {
  try {
    const master = getMasterDB();
    const userId = req.user.userId;

    const usuario = master
      .prepare(
        `
      SELECT id, username, nombre, email, rol, telefono, direccion, ciudad, 
             foto_perfil, activo, ultimo_acceso, created_at, updated_at
      FROM usuarios
      WHERE id = ?
    `
      )
      .get(userId);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    res.json({
      success: true,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        telefono: usuario.telefono,
        direccion: usuario.direccion,
        ciudad: usuario.ciudad,
        foto_perfil: usuario.foto_perfil,
        activo: !!usuario.activo,
        ultimo_acceso: usuario.ultimo_acceso,
        created_at: usuario.created_at,
        updated_at: usuario.updated_at,
      },
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      message: 'No se pudo obtener el perfil.',
    });
  }
});

// Actualizar perfil del usuario autenticado
app.put('/api/usuarios/perfil', authenticate, (req, res) => {
  try {
    const master = getMasterDB();
    const userId = req.user.userId;
    const { nombre, email, telefono, direccion, ciudad } = req.body || {};

    // Verificar que el usuario existe
    const usuario = master.prepare('SELECT id FROM usuarios WHERE id = ?').get(userId);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Construir updates
    const updates = [];
    const values = [];

    if (nombre !== undefined && nombre.trim()) {
      updates.push('nombre = ?');
      values.push(nombre.trim());
    }

    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email.trim() || null);
    }

    if (telefono !== undefined) {
      updates.push('telefono = ?');
      values.push(telefono.trim() || null);
    }

    if (direccion !== undefined) {
      updates.push('direccion = ?');
      values.push(direccion.trim() || null);
    }

    if (ciudad !== undefined) {
      updates.push('ciudad = ?');
      values.push(ciudad.trim() || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay cambios para aplicar.',
      });
    }

    updates.push("updated_at = datetime('now')");

    const statement = master.prepare(`
      UPDATE usuarios 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `);
    statement.run(...values, userId);

    // Obtener usuario actualizado
    const usuarioActualizado = master
      .prepare(
        `
      SELECT id, username, nombre, email, rol, telefono, direccion, ciudad, 
             foto_perfil, activo, ultimo_acceso, created_at, updated_at
      FROM usuarios
      WHERE id = ?
    `
      )
      .get(userId);

    res.json({
      success: true,
      message: 'Perfil actualizado correctamente.',
      usuario: {
        id: usuarioActualizado.id,
        username: usuarioActualizado.username,
        nombre: usuarioActualizado.nombre,
        email: usuarioActualizado.email,
        rol: usuarioActualizado.rol,
        telefono: usuarioActualizado.telefono,
        direccion: usuarioActualizado.direccion,
        ciudad: usuarioActualizado.ciudad,
        foto_perfil: usuarioActualizado.foto_perfil,
        activo: !!usuarioActualizado.activo,
        ultimo_acceso: usuarioActualizado.ultimo_acceso,
        created_at: usuarioActualizado.created_at,
        updated_at: usuarioActualizado.updated_at,
      },
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      message: 'No se pudo actualizar el perfil.',
    });
  }
});

// Actualizar foto de perfil del usuario autenticado
app.post('/api/usuarios/perfil/foto', authenticate, upload.single('foto'), async (req, res) => {
  try {
    const master = getMasterDB();
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ninguna imagen.',
      });
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      // Eliminar archivo no válido
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Tipo de archivo no permitido. Solo se aceptan imágenes.',
      });
    }

    // Validar tamaño (máx 2MB)
    if (req.file.size > 2 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'La imagen no debe superar 2MB.',
      });
    }

    // Obtener foto anterior para eliminarla
    const usuario = master.prepare('SELECT foto_perfil FROM usuarios WHERE id = ?').get(userId);

    if (usuario && usuario.foto_perfil) {
      const oldPhotoPath = resolveStoredUploadPath(usuario.foto_perfil);
      if (oldPhotoPath && fs.existsSync(oldPhotoPath)) {
        try {
          fs.unlinkSync(oldPhotoPath);
        } catch (err) {
          console.warn('No se pudo eliminar foto anterior:', err.message);
        }
      }
    }

    const negocioFolder = sanitizeNegocioFolderName(
      req.negocioId || req.user?.negocioId || req.headers['x-negocio-id'] || 'global'
    );

    // Guardar URL de la nueva foto
    const fotoUrl = `/uploads/${negocioFolder}/perfiles/${req.file.filename}`;

    master
      .prepare(
        `
      UPDATE usuarios 
      SET foto_perfil = ?, updated_at = datetime('now') 
      WHERE id = ?
    `
      )
      .run(fotoUrl, userId);

    res.json({
      success: true,
      message: 'Foto de perfil actualizada correctamente.',
      fotoUrl,
    });
  } catch (error) {
    console.error('Error actualizando foto de perfil:', error);
    res.status(500).json({
      success: false,
      message: 'No se pudo actualizar la foto de perfil.',
    });
  }
});

// ============================================
// RUTAS: ASIGNACIÓN DE NEGOCIOS A USUARIOS
// ============================================

app.get(
  '/api/usuarios/:id/negocios',
  authenticate,
  requireRole(ROLE_ADMIN, ROLE_SUPER_ADMIN),
  requirePermission(PERMISSIONS.VIEW_USERS),
  (req, res) => {
    try {
      const master = getMasterDB();
      const userId = req.params.id;
      const requesterIsSuper = isSuperAdmin(req);
      const allowedNegocios = getRequesterNegocioSet(req);

      const userExists = master.prepare('SELECT id, rol FROM usuarios WHERE id = ?').get(userId);
      if (!userExists) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      }

      const targetRole = normalizeRole(userExists.rol);

      if (!requesterIsSuper) {
        if (targetRole === ROLE_SUPER_ADMIN) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permiso para modificar los negocios de un superadministrador.',
          });
        }

        if (targetRole === ROLE_ADMIN) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permiso para modificar los negocios de un administrador.',
          });
        }
      }

      if (!requesterIsSuper) {
        const sharesNegocio = ensureUserSharesNegocio(master, userId, allowedNegocios);
        if (!sharesNegocio) {
          return res.status(403).json({
            success: false,
            message: 'No puedes consultar los negocios de un usuario ajeno a tus negocios.',
          });
        }
      }

      const asignados = getUserNegocios(master, userId) || [];
      const negociosMapeados = asignados.map((row) => {
        const mapped = mapNegocioRowWithConfig(row) || {
          id: row.id,
          nombre: row.nombre,
          tipo: row.tipo,
        };
        return {
          ...mapped,
          rol_en_negocio: row.rol_en_negocio,
          es_negocio_principal: !!row.es_negocio_principal,
        };
      });

      const negocios = requesterIsSuper
        ? negociosMapeados
        : negociosMapeados.filter((negocio) => allowedNegocios.has(negocio.id));

      res.json({ success: true, negocios });
    } catch (error) {
      console.error('Error obteniendo negocios del usuario:', error);
      res
        .status(500)
        .json({
          success: false,
          message: 'No se pudieron obtener los negocios asignados al usuario.',
        });
    }
  }
);

app.post(
  '/api/usuarios/:id/negocios',
  authenticate,
  requireRole(ROLE_ADMIN, ROLE_SUPER_ADMIN),
  requirePermission(PERMISSIONS.MANAGE_USERS_LOCAL),
  (req, res) => {
    try {
      const master = getMasterDB();
      const userId = req.params.id;
      const payload = Array.isArray(req.body?.negocios) ? req.body.negocios : [];
      const requesterIsSuper = isSuperAdmin(req);
      const allowedNegocios = getRequesterNegocioSet(req);

      const userExists = master.prepare('SELECT id FROM usuarios WHERE id = ?').get(userId);
      if (!userExists) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      }

      if (!requesterIsSuper) {
        const sharesNegocio = ensureUserSharesNegocio(master, userId, allowedNegocios);
        if (!sharesNegocio) {
          return res.status(403).json({
            success: false,
            message: 'No puedes modificar los negocios de un usuario ajeno a tus negocios.',
          });
        }
      }

      if (!payload.length) {
        return res
          .status(400)
          .json({ success: false, message: 'Debes asignar al menos un negocio al usuario.' });
      }

      const sanitized = sanitizeNegocioAssignmentsInput(payload, null);

      if (!sanitized.length) {
        return res
          .status(400)
          .json({ success: false, message: 'La lista de negocios es inválida.' });
      }

      if (!requesterIsSuper) {
        const allAllowed = sanitized.every((assignment) => allowedNegocios.has(assignment.id));
        if (!allAllowed) {
          return res.status(403).json({
            success: false,
            message: 'No puedes asignar negocios a los que no tienes acceso.',
          });
        }
      }

      const negocioStmt = master.prepare('SELECT id, estado FROM negocios WHERE id = ?');
      for (const item of sanitized) {
        let negocio = negocioStmt.get(item.id);
        const configEntry = configNegocios.negocios.find((n) => n.id === item.id);

        if (!negocio && configEntry && configEntry.activo !== false) {
          const created = createNegocio(master, {
            id: configEntry.id,
            nombre: configEntry.nombre || configEntry.id,
            tipo: configEntry.tipo || 'general',
            ruc: configEntry.ruc,
            razon_social: configEntry.razon_social || configEntry.nombre || configEntry.id,
            direccion: configEntry.direccion,
            telefono: configEntry.telefono,
            email: configEntry.email,
            plan: configEntry.plan,
            usuarios_max: configEntry.usuarios_max,
            productos_max: configEntry.productos_max,
          });

          if (created) {
            negocio = { id: created.id, estado: created.estado };
          }
        }

        if (!negocio && !configEntry) {
          return res
            .status(404)
            .json({ success: false, message: `Negocio no encontrado: ${item.id}` });
        }

        const isActive = negocio ? negocio.estado === 'activo' : configEntry?.activo !== false;

        if (!isActive) {
          return res
            .status(400)
            .json({ success: false, message: `El negocio ${item.id} no está activo.` });
        }
      }

      updateUserNegocioAssignments(master, userId, sanitized);

      const asignados = getUserNegocios(master, userId) || [];
      const negocios = asignados.map((row) => {
        const mapped = mapNegocioRowWithConfig(row) || {
          id: row.id,
          nombre: row.nombre,
          tipo: row.tipo,
        };
        return {
          ...mapped,
          rol_en_negocio: row.rol_en_negocio,
          es_negocio_principal: !!row.es_negocio_principal,
        };
      });

      res.json({ success: true, negocios });
    } catch (error) {
      console.error('Error actualizando negocios del usuario:', error);
      const message =
        typeof error?.message === 'string' && error.message
          ? error.message
          : 'No se pudo actualizar la asignación de negocios.';
      res.status(500).json({ success: false, message });
    }
  }
);

// ============================================
// RUTAS PROTEGIDAS - RESTO DE LA API
// ============================================

// --- Rutas de soporte IA ---
app.get('/api/ia/config', authenticate, validateTenantAccess, (req, res) => {
  try {
    const master = getMasterDB();
    const negocioId = req.negocioId || req.user?.negocioId || null;
    const rawConfig = readIaGlobalConfig(master);
    const sanitizedConfig = sanitizeIaConfig(rawConfig);
    const features = readIaFeatureStateForNegocio(master, negocioId);

    // Obtener catálogo de features desde BD en lugar de constante
    const featureCatalog = configService.getIAFeatures(true);

    res.json({
      success: true,
      config: {
        ...sanitizedConfig,
        features,
        featureCatalog,
        negocioId,
      },
    });
  } catch (error) {
    console.error('Error obteniendo configuración IA:', error);
    res.status(500).json({ success: false, message: 'No se pudo obtener la configuración de IA.' });
  }
});

function mapAgentTypeToFeature(agentType) {
  const normalized = (agentType || '').toString().trim().toLowerCase();
  if (normalized === 'marketing') {
    return 'marketing';
  }
  return 'assistant';
}

function buildGeminiContentsFromMessages(messages = []) {
  return messages
    .filter((msg) => msg && typeof msg.content === 'string')
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
}

app.post('/api/ia/chat', authenticate, validateTenantAccess, async (req, res) => {
  try {
    const master = getMasterDB();
    const negocioId = req.negocioId || req.user?.negocioId || null;
    const featureState = readIaFeatureStateForNegocio(master, negocioId);

    const agentType = typeof req.body?.agentType === 'string' ? req.body.agentType : 'general';
    const featureId = mapAgentTypeToFeature(agentType);

    if (!featureState[featureId]) {
      return res.status(403).json({
        success: false,
        message:
          'El superadministrador ha deshabilitado temporalmente esta capacidad de IA para tu tienda.',
      });
    }

    const globalConfig = readIaGlobalConfig(master);
    if (!globalConfig || !globalConfig.apiKey || !globalConfig.model) {
      return res.status(503).json({
        success: false,
        message: 'La inteligencia artificial aún no está configurada por el superadministrador.',
      });
    }

    const provider = normalizeIaProvider(globalConfig.provider);

    let messages = Array.isArray(req.body?.messages) ? req.body.messages : [];

    if (!messages.length) {
      const userMessage =
        typeof req.body?.userMessage === 'string' ? req.body.userMessage.trim() : '';
      const systemPrompt =
        typeof req.body?.systemPrompt === 'string' ? req.body.systemPrompt.trim() : '';

      if (!userMessage) {
        return res
          .status(400)
          .json({ success: false, message: 'Debes enviar al menos un mensaje del usuario.' });
      }

      messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: userMessage });
    }

    const temperature = clampNumber(req.body?.temperature, 0, 1, globalConfig.temperature ?? 0.7);
    const maxTokens = Math.round(
      clampNumber(req.body?.maxTokens, 256, 32768, globalConfig.maxTokens ?? 2048)
    );
    const model =
      typeof req.body?.model === 'string' && req.body.model.trim()
        ? req.body.model.trim()
        : globalConfig.model;

    let responseText = '';

    if (provider === 'gemini') {
      const contents = buildGeminiContentsFromMessages(messages);
      if (!contents.length) {
        return res
          .status(400)
          .json({ success: false, message: 'No se proporcionaron mensajes válidos para la IA.' });
      }

      console.log(`[Gemini Chat] 🤖 Llamando modelo: ${model}`);
      const genAI = new GoogleGenerativeAI(globalConfig.apiKey);
      const generativeModel = genAI.getGenerativeModel({ model });

      const result = await generativeModel.generateContent({
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      });

      responseText =
        typeof result?.response?.text === 'function'
          ? result.response.text()
          : (result?.response?.candidates?.[0]?.content?.parts || [])
              .map((part) => part.text || '')
              .join('')
              .trim();
    } else if (provider === 'openai' || provider === 'deepseek') {
      // OpenAI y DeepSeek usan la misma API (OpenAI-compatible)
      const baseURL =
        provider === 'deepseek'
          ? 'https://api.deepseek.com'
          : globalConfig.baseURL || 'https://api.openai.com/v1';

      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`${baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${globalConfig.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch((err) => {
          console.warn(`No se pudo parsear respuesta de error de ${provider}:`, err.message);
          return {};
        });
        throw new Error(errorData.error?.message || `Error ${response.status} de ${provider}`);
      }

      const data = await response.json();
      responseText = data.choices?.[0]?.message?.content || '';
    } else if (provider === 'lmstudio') {
      // LM Studio usa API compatible con OpenAI
      const baseURL = globalConfig.baseURL || 'http://localhost:1234/v1';
      const fetch = (await import('node-fetch')).default;

      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch((err) => {
          console.warn('No se pudo parsear respuesta de error de LM Studio:', err.message);
          return {};
        });
        throw new Error(errorData.error?.message || `Error ${response.status} de LM Studio`);
      }

      const data = await response.json();
      responseText = data.choices?.[0]?.message?.content || '';
    } else {
      return res.status(501).json({
        success: false,
        message: `El proveedor ${provider} no está soportado.`,
      });
    }

    res.json({
      success: true,
      message: responseText,
      model,
      provider,
      feature: featureId,
    });
  } catch (error) {
    console.error('Error generando respuesta IA:', error);
    const message =
      typeof error?.message === 'string' && error.message
        ? error.message
        : 'No se pudo generar la respuesta de IA.';
    res.status(500).json({ success: false, message });
  }
});

app.get('/api/ia/diagnostics', authenticate, validateTenantAccess, (req, res) => {
  try {
    const master = getMasterDB();
    const negocioId = req.negocioId || req.user?.negocioId || null;
    const rawConfig = readIaGlobalConfig(master);
    const sanitized = sanitizeIaConfig(rawConfig);
    const features = readIaFeatureStateForNegocio(master, negocioId);

    res.json({
      success: true,
      diagnostics: {
        provider: sanitized.provider,
        model: sanitized.model,
        hasApiKey: sanitized.hasApiKey,
        isConfigured: sanitized.isConfigured,
        features,
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV || 'production',
      },
    });
  } catch (error) {
    console.error('Error recopilando diagnósticos IA:', error);
    res
      .status(500)
      .json({ success: false, message: 'No se pudieron obtener los diagnósticos de IA.' });
  }
});

app.get('/api/admin/ia/config', authenticate, requireRole(ROLE_SUPER_ADMIN), (req, res) => {
  try {
    const master = getMasterDB();
    const rawConfig = readIaGlobalConfig(master);
    const sanitized = sanitizeIaConfig(rawConfig, { includeSecrets: true });
    const matrix = readIaPermissionsMatrix(master);

    const negocios = master
      .prepare(
        `
      SELECT id, nombre, tipo, estado
      FROM negocios
      ORDER BY nombre COLLATE NOCASE ASC
    `
      )
      .all();

    const negociosConPermisos = negocios.map((negocio) => ({
      id: negocio.id,
      nombre: negocio.nombre,
      tipo: negocio.tipo,
      estado: negocio.estado,
      features: {
        ...getIaDefaultFeatureState(),
        ...(matrix.get(negocio.id) || {}),
      },
    }));

    // Obtener catálogo de features desde BD
    const featureCatalog = configService.getIAFeatures(true);

    res.json({
      success: true,
      config: sanitized,
      negocios: negociosConPermisos,
      featureCatalog,
    });
  } catch (error) {
    console.error('Error obteniendo configuración global de IA:', error);
    res
      .status(500)
      .json({ success: false, message: 'No se pudo cargar la configuración global de IA.' });
  }
});

app.post('/api/admin/ia/config', authenticate, requireRole(ROLE_SUPER_ADMIN), (req, res) => {
  try {
    const master = getMasterDB();
    const payload = req.body || {};
    const updated = upsertIaGlobalConfig(master, payload, req.user?.userId || null);
    const sanitized = sanitizeIaConfig(updated, { includeSecrets: true });

    res.json({ success: true, config: sanitized });
  } catch (error) {
    console.error('Error actualizando configuración global de IA:', error);
    res
      .status(400)
      .json({
        success: false,
        message: error?.message || 'No se pudo actualizar la configuración de IA.',
      });
  }
});

app.post('/api/admin/ia/permissions', authenticate, requireRole(ROLE_SUPER_ADMIN), (req, res) => {
  try {
    const master = getMasterDB();
    const updates = Array.isArray(req.body?.updates) ? req.body.updates : null;

    if (!updates || !updates.length) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Proporciona al menos un negocio con permisos a actualizar.',
        });
    }

    const normalized = updates
      .filter((item) => item && item.negocioId)
      .map((item) => ({
        negocioId: item.negocioId,
        features: {
          ...getIaDefaultFeatureState(),
          ...(item.features || {}),
        },
      }));

    if (!normalized.length) {
      return res
        .status(400)
        .json({ success: false, message: 'No se encontraron negocios válidos en la petición.' });
    }

    upsertIaPermissions(master, normalized, req.user?.userId || null);

    const matrix = readIaPermissionsMatrix(master);
    res.json({
      success: true,
      permisos: normalized.map((entry) => ({
        negocioId: entry.negocioId,
        features: matrix.get(entry.negocioId) || getIaDefaultFeatureState(),
      })),
    });
  } catch (error) {
    console.error('Error actualizando permisos de IA:', error);
    res
      .status(500)
      .json({ success: false, message: 'No se pudieron actualizar los permisos de IA.' });
  }
});

app.get('/api/admin/ia/models', authenticate, requireRole(ROLE_SUPER_ADMIN), async (req, res) => {
  try {
    const master = getMasterDB();
    const config = readIaGlobalConfig(master);
    const requestedProvider = req.query.provider || config.provider;
    const normalizedProvider = normalizeIaProvider(requestedProvider);

    let models = [];
    let defaultModels = [];

    // Fallbacks hardcodeados en caso de que la BD no tenga modelos actualizados (Nov 2025)
    const FALLBACK_MODELS = {
      gemini: [
        {
          id: 'gemini-2.5-flash',
          displayName: 'Gemini 2.5 Flash (Recomendado)',
          description: 'Mejor relación precio-rendimiento',
        },
        {
          id: 'gemini-2.5-pro',
          displayName: 'Gemini 2.5 Pro',
          description: 'Modelo thinking avanzado',
        },
        {
          id: 'gemini-2.5-flash-lite',
          displayName: 'Gemini 2.5 Flash Lite',
          description: 'Ultra rápido y económico',
        },
        {
          id: 'gemini-2.0-flash',
          displayName: 'Gemini 2.0 Flash',
          description: '1M tokens de contexto',
        },
      ],
      openai: [
        { id: 'gpt-4o', displayName: 'GPT-4o (Recomendado)', description: 'Modelo más avanzado' },
        { id: 'gpt-4o-mini', displayName: 'GPT-4o Mini', description: 'Eficiente y económico' },
        { id: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', description: 'GPT-4 optimizado' },
        { id: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', description: 'Rápido y económico' },
      ],
      deepseek: [
        {
          id: 'deepseek-chat',
          displayName: 'DeepSeek V3 Chat (Recomendado)',
          description: 'DeepSeek-V3.2 modo normal',
        },
        {
          id: 'deepseek-reasoner',
          displayName: 'DeepSeek V3 Reasoner',
          description: 'DeepSeek-V3.2 modo thinking',
        },
      ],
      lmstudio: [
        {
          id: 'local-model',
          displayName: 'Modelo Local (LM Studio)',
          description: 'Modelo cargado localmente',
        },
      ],
    };

    switch (normalizedProvider) {
      case 'gemini':
        // Intentar obtener modelos desde BD, con fallback
        try {
          defaultModels = configService.getIAModels('gemini', true);
          if (!defaultModels || !defaultModels.length) {
            defaultModels = FALLBACK_MODELS.gemini;
          } else {
            // Mapear formato BD a formato API
            defaultModels = defaultModels.map((m) => ({
              id: m.model_id,
              displayName: m.display_name,
              description: m.description || '',
            }));
          }
        } catch (dbError) {
          console.warn('Error obteniendo modelos de BD, usando fallbacks:', dbError.message);
          defaultModels = FALLBACK_MODELS.gemini;
        }

        // Intentar obtener modelos dinámicos desde la API de Gemini
        if (config?.apiKey && config.provider === 'gemini') {
          try {
            const rawModels = await listGeminiModels(config.apiKey);
            models = rawModels
              .filter((model) => {
                const name = model?.name || '';
                // Solo incluir modelos que soporten generateContent
                const supportedMethods = model?.supportedGenerationMethods || [];
                return (
                  name.startsWith('models/gemini') && supportedMethods.includes('generateContent')
                );
              })
              .map((model) => ({
                id: model.name.replace('models/', ''),
                displayName: model.displayName || model.name.replace('models/', ''),
                inputTokenLimit: model.inputTokenLimit,
                outputTokenLimit: model.outputTokenLimit,
                description: model.description || '',
                version: model.version || '',
                baseModelId: model.baseModelId || '',
              }))
              .sort((a, b) => {
                // Priorizar modelos 2.5 y 3.0
                const getVersion = (id) => {
                  const match = id.match(/gemini-(\d+\.?\d*)/);
                  return match ? parseFloat(match[1]) : 0;
                };
                return getVersion(b.id) - getVersion(a.id);
              });
          } catch (error) {
            console.warn('No se pudieron obtener modelos desde Gemini API:', error.message);
          }
        }
        break;

      case 'openai':
        try {
          defaultModels = configService.getIAModels('openai', true);
          if (!defaultModels || !defaultModels.length) {
            defaultModels = FALLBACK_MODELS.openai;
          } else {
            defaultModels = defaultModels.map((m) => ({
              id: m.model_id,
              displayName: m.display_name,
              description: m.description || '',
            }));
          }
        } catch (dbError) {
          console.warn('Error obteniendo modelos OpenAI de BD:', dbError.message);
          defaultModels = FALLBACK_MODELS.openai;
        }
        break;

      case 'deepseek':
        try {
          defaultModels = configService.getIAModels('deepseek', true);
          if (!defaultModels || !defaultModels.length) {
            defaultModels = FALLBACK_MODELS.deepseek;
          } else {
            defaultModels = defaultModels.map((m) => ({
              id: m.model_id,
              displayName: m.display_name,
              description: m.description || '',
            }));
          }
        } catch (dbError) {
          console.warn('Error obteniendo modelos DeepSeek de BD:', dbError.message);
          defaultModels = FALLBACK_MODELS.deepseek;
        }
        break;

      case 'lmstudio':
        models = FALLBACK_MODELS.lmstudio;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Proveedor no soportado: ${requestedProvider}`,
        });
    }

    const finalModels = models.length ? models : defaultModels;

    res.json({
      success: true,
      provider: normalizedProvider,
      models: finalModels,
      totalModels: finalModels.length,
      apiVersion: normalizedProvider === 'gemini' ? 'v1beta' : 'v1',
    });
  } catch (error) {
    console.error('Error obteniendo modelos de IA:', error);
    res
      .status(500)
      .json({
        success: false,
        message: error?.message || 'No se pudieron obtener los modelos de IA.',
      });
  }
});

app.post('/api/verificar-ia', authenticate, requireRole(ROLE_SUPER_ADMIN), async (req, res) => {
  try {
    const master = getMasterDB();
    const config = readIaGlobalConfig(master);
    const apiKey =
      typeof req.body?.apiKey === 'string' && req.body.apiKey.trim()
        ? req.body.apiKey.trim()
        : config.apiKey || '';
    const model =
      typeof req.body?.model === 'string' && req.body.model.trim()
        ? req.body.model.trim()
        : config.model || 'gemini-2.5-flash';

    if (!apiKey) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Configura la API Key de Gemini antes de verificar la conexión.',
        });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({ model });
    const testPrompt = 'Responde únicamente con el JSON {"status":"ok"}';

    const generation = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: testPrompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            status: { type: 'STRING' },
          },
          required: ['status'],
        },
      },
    });

    const raw = typeof generation?.response?.text === 'function' ? generation.response.text() : '';

    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || parsed.status !== 'ok') {
      return res.status(400).json({
        success: false,
        message: 'La API respondió, pero la verificación no devolvió el JSON esperado.',
      });
    }

    res.json({ success: true, message: 'Conexión con Gemini verificada correctamente.' });
  } catch (error) {
    console.error('Error verificando la conexión IA:', error);
    const message = error?.message
      ? `No se pudo verificar la conexión: ${error.message}`
      : 'No se pudo verificar la conexión con la IA.';
    res.status(400).json({ success: false, message });
  }
});

// Endpoint para verificar API key y obtener modelos dinámicamente de la API real
app.post(
  '/api/admin/ia/verify-and-fetch-models',
  authenticate,
  requireRole(ROLE_SUPER_ADMIN),
  async (req, res) => {
    try {
      const { provider, apiKey, baseURL } = req.body;

      // Importar node-fetch para las peticiones HTTP
      const fetch = (await import('node-fetch')).default;

      if (!provider) {
        return res.status(400).json({ success: false, message: 'Proveedor requerido' });
      }

      const normalizedProvider = normalizeIaProvider(provider);

      // Para LM Studio no se necesita API key
      if (normalizedProvider !== 'lmstudio' && !apiKey) {
        return res.status(400).json({ success: false, message: 'API Key requerida' });
      }

      let models = [];
      let connectionVerified = false;

      switch (normalizedProvider) {
        case 'gemini': {
          try {
            // Obtener modelos desde la API de Gemini
            const rawModels = await listGeminiModels(apiKey);
            models = rawModels
              .filter((model) => {
                const name = model?.name || '';
                const supportedMethods = model?.supportedGenerationMethods || [];
                // Solo modelos Gemini que soporten generateContent
                return (
                  name.startsWith('models/gemini') && supportedMethods.includes('generateContent')
                );
              })
              .map((model) => ({
                id: model.name.replace('models/', ''),
                name: model.displayName || model.name.replace('models/', ''),
                displayName: model.displayName || model.name.replace('models/', ''),
                description: model.description || '',
                inputTokenLimit: model.inputTokenLimit,
                outputTokenLimit: model.outputTokenLimit,
              }))
              .sort((a, b) => {
                // Priorizar versiones más nuevas (2.5, 2.0, 1.5)
                const getVersion = (id) => {
                  const match = id.match(/gemini-(\d+\.?\d*)/);
                  return match ? parseFloat(match[1]) : 0;
                };
                return getVersion(b.id) - getVersion(a.id);
              });

            connectionVerified = models.length > 0;

            if (!connectionVerified) {
              return res.status(400).json({
                success: false,
                message: 'API Key válida pero no se encontraron modelos disponibles',
              });
            }
          } catch (error) {
            console.error('Error verificando Gemini:', error);
            return res.status(400).json({
              success: false,
              message: `Error de conexión con Gemini: ${error.message}`,
            });
          }
          break;
        }

        case 'openai': {
          try {
            // Obtener modelos desde la API de OpenAI
            const response = await fetch('https://api.openai.com/v1/models', {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();

            // Filtrar solo modelos GPT relevantes
            const gptModels = (data.data || [])
              .filter((m) => {
                const id = m.id.toLowerCase();
                // Incluir modelos GPT principales, excluir los de fine-tuning y embeddings
                return (
                  (id.includes('gpt-4') || id.includes('gpt-3.5')) &&
                  !id.includes('instruct') &&
                  !id.includes('vision') &&
                  !id.includes('realtime') &&
                  !id.includes('audio') &&
                  !id.includes(':')
                );
              })
              .map((m) => ({
                id: m.id,
                name: m.id,
                displayName: formatOpenAIModelName(m.id),
                description: getOpenAIModelDescription(m.id),
                created: m.created,
              }))
              .sort((a, b) => {
                // Priorizar gpt-4o, luego gpt-4, luego gpt-3.5
                const getPriority = (id) => {
                  if (id.includes('gpt-4o')) return id.includes('mini') ? 90 : 100;
                  if (id.includes('gpt-4-turbo')) return 80;
                  if (id.includes('gpt-4')) return 70;
                  if (id.includes('gpt-3.5-turbo')) return 60;
                  return 0;
                };
                return getPriority(b.id) - getPriority(a.id);
              });

            models = gptModels;
            connectionVerified = models.length > 0;

            if (!connectionVerified) {
              return res.status(400).json({
                success: false,
                message: 'API Key válida pero no se encontraron modelos GPT disponibles',
              });
            }
          } catch (error) {
            console.error('Error verificando OpenAI:', error);
            return res.status(400).json({
              success: false,
              message: `Error de conexión con OpenAI: ${error.message}`,
            });
          }
          break;
        }

        case 'deepseek': {
          try {
            // DeepSeek usa API compatible con OpenAI
            const response = await fetch('https://api.deepseek.com/models', {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();

            models = (data.data || [])
              .filter((m) => m.id.includes('deepseek'))
              .map((m) => ({
                id: m.id,
                name: m.id,
                displayName: formatDeepSeekModelName(m.id),
                description: getDeepSeekModelDescription(m.id),
              }))
              .sort((a, b) => {
                // Priorizar deepseek-chat, luego deepseek-reasoner
                if (a.id === 'deepseek-chat') return -1;
                if (b.id === 'deepseek-chat') return 1;
                return a.id.localeCompare(b.id);
              });

            connectionVerified = models.length > 0;

            if (!connectionVerified) {
              // DeepSeek puede no listar modelos, usar fallbacks conocidos
              models = [
                {
                  id: 'deepseek-chat',
                  name: 'deepseek-chat',
                  displayName: 'DeepSeek V3 Chat',
                  description: 'Modelo de chat avanzado',
                },
                {
                  id: 'deepseek-reasoner',
                  name: 'deepseek-reasoner',
                  displayName: 'DeepSeek V3 Reasoner',
                  description: 'Modelo de razonamiento profundo',
                },
              ];
              connectionVerified = true;
            }
          } catch (error) {
            console.error('Error verificando DeepSeek:', error);
            return res.status(400).json({
              success: false,
              message: `Error de conexión con DeepSeek: ${error.message}`,
            });
          }
          break;
        }

        case 'lmstudio': {
          try {
            const serverUrl = baseURL || 'http://localhost:1234/v1';
            const response = await fetch(`${serverUrl}/models`, {
              headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
              throw new Error(`No se puede conectar al servidor LM Studio en ${serverUrl}`);
            }

            const data = await response.json();

            models = (data.data || []).map((m) => ({
              id: m.id,
              name: m.id,
              displayName: m.id,
              description: 'Modelo local cargado en LM Studio',
            }));

            connectionVerified = true;

            if (models.length === 0) {
              models = [
                {
                  id: 'local-model',
                  name: 'local-model',
                  displayName: 'Modelo Local',
                  description: 'Carga un modelo en LM Studio',
                },
              ];
            }
          } catch (error) {
            console.error('Error conectando a LM Studio:', error);
            return res.status(400).json({
              success: false,
              message: `Error conectando a LM Studio: ${error.message}. Asegúrate de que el servidor esté corriendo.`,
            });
          }
          break;
        }

        default:
          return res
            .status(400)
            .json({ success: false, message: `Proveedor no soportado: ${provider}` });
      }

      res.json({
        success: true,
        verified: connectionVerified,
        provider: normalizedProvider,
        models: models,
        totalModels: models.length,
        message: `✅ Conexión verificada. ${models.length} modelos disponibles.`,
      });
    } catch (error) {
      console.error('Error verificando API y obteniendo modelos:', error);
      res
        .status(500)
        .json({ success: false, message: error.message || 'Error verificando la conexión' });
    }
  }
);

// Funciones auxiliares para formatear nombres de modelos
function formatOpenAIModelName(id) {
  const names = {
    'gpt-4o': 'GPT-4o (Recomendado)',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-4-turbo-preview': 'GPT-4 Turbo Preview',
    'gpt-4': 'GPT-4',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'gpt-3.5-turbo-16k': 'GPT-3.5 Turbo 16K',
  };
  return names[id] || id;
}

function getOpenAIModelDescription(id) {
  const descriptions = {
    'gpt-4o': 'Modelo más avanzado y multimodal de OpenAI',
    'gpt-4o-mini': 'Versión eficiente, rápida y económica de GPT-4o',
    'gpt-4-turbo': 'GPT-4 optimizado con conocimientos actualizados',
    'gpt-4-turbo-preview': 'Versión preview de GPT-4 Turbo',
    'gpt-4': 'Modelo GPT-4 original',
    'gpt-3.5-turbo': 'Modelo rápido y muy económico',
    'gpt-3.5-turbo-16k': 'GPT-3.5 con contexto extendido a 16K tokens',
  };
  return descriptions[id] || '';
}

function formatDeepSeekModelName(id) {
  const names = {
    'deepseek-chat': 'DeepSeek V3 Chat (Recomendado)',
    'deepseek-reasoner': 'DeepSeek V3 Reasoner',
    'deepseek-coder': 'DeepSeek Coder (Legacy)',
  };
  return names[id] || id;
}

function getDeepSeekModelDescription(id) {
  const descriptions = {
    'deepseek-chat': 'DeepSeek-V3.2 en modo normal - potente y muy económico',
    'deepseek-reasoner': 'DeepSeek-V3.2 en modo thinking - razonamiento profundo',
    'deepseek-coder': 'Modelo especializado en código (legacy)',
  };
  return descriptions[id] || '';
}

// --- Rutas de configuración ---
app.get(
  '/api/configuracion',
  authenticate,
  requireRole(ROLE_ADMIN, ROLE_SUPER_ADMIN),
  requirePermission(PERMISSIONS.VIEW_SETTINGS),
  validateTenantAccess,
  (req, res) => {
    try {
      const tenantDb = req.db || db;
      const prefix = req.query?.prefix ? `${req.query.prefix}%` : null;
      const rows = prefix
        ? tenantDb.prepare('SELECT key, value FROM configuracion WHERE key LIKE ?').all(prefix)
        : tenantDb.prepare('SELECT key, value FROM configuracion').all();
      res.json(mapConfigRows(rows));
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      res.status(500).json({ success: false, message: 'No se pudo cargar la configuración.' });
    }
  }
);

app.post(
  '/api/configuracion/bulk',
  authenticate,
  requireRole(ROLE_ADMIN, ROLE_SUPER_ADMIN),
  requirePermission(PERMISSIONS.MANAGE_SETTINGS),
  validateTenantAccess,
  criticalLimiter,
  (req, res) => {
    const updates = Array.isArray(req.body) ? req.body : null;

    if (!updates || !updates.length) {
      return res
        .status(400)
        .json({ success: false, message: 'Proporciona un arreglo con pares key/value.' });
    }

    const tenantDb = req.db || db;
    const insertStmt = tenantDb.prepare(`
    INSERT INTO configuracion (key, value, tipo, descripcion, updated_at)
    VALUES (@key, @value, COALESCE(@tipo, 'string'), COALESCE(@descripcion, ''), datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      tipo = COALESCE(excluded.tipo, configuracion.tipo),
      descripcion = COALESCE(excluded.descripcion, configuracion.descripcion),
      updated_at = datetime('now')
  `);

    const transaction = tenantDb.transaction((items) => {
      for (const item of items) {
        if (!item || typeof item.key !== 'string') {
          throw new Error('Cada elemento debe incluir la propiedad "key".');
        }
        insertStmt.run({
          key: item.key,
          value: item.value != null ? String(item.value) : '',
          tipo: item.tipo,
          descripcion: item.descripcion,
        });
      }
    });

    try {
      transaction(updates);
      res.json({ success: true });
    } catch (error) {
      console.error('Error guardando configuración:', error);
      res
        .status(500)
        .json({ success: false, message: error.message || 'No se pudo guardar la configuración.' });
    }
  }
);

// ============================================
// RUTAS: CLIENTES (Protegidas con Multi-Tenant)
// ============================================
app.get('/api/clientes', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const search =
      typeof req.query.q === 'string'
        ? req.query.q.trim()
        : typeof req.query.search === 'string'
          ? req.query.search.trim()
          : null;
    const order = typeof req.query.order === 'string' ? req.query.order.trim() : null;

    // Validación segura de límite
    const limitParam = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : null;

    let activo = 1;
    if (req.query.activo !== undefined) {
      const normalized = req.query.activo.toString().toLowerCase();
      if (['0', 'false', 'inactivo', 'no'].includes(normalized)) {
        activo = 0;
      } else if (['all', 'todos', 'cualquiera', ''].includes(normalized)) {
        activo = null;
      } else {
        activo = 1;
      }
    }

    const { query, params } = buildClientesQuery({
      negocioId: req.negocioId,
      search,
      activo,
      order,
      limit,
    });

    const rows = tenantDb.prepare(query).all(params);
    res.json(rows.map(mapClienteRow));
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({ success: false, message: 'No se pudieron cargar los clientes.' });
  }
});

app.get('/api/clientes/buscar', authenticate, validateTenantAccess, (req, res) => {
  const search = typeof req.query.q === 'string' ? req.query.q.trim() : null;
  if (!search) {
    return res.json([]);
  }

  try {
    const tenantDb = req.db || db;
    const { query, params } = buildClientesQuery({
      negocioId: req.negocioId,
      search,
      activo: 1,
      order: 'recientes',
      limit: 15,
    });

    const rows = tenantDb.prepare(query).all(params);
    res.json(rows.map(mapClienteRow));
  } catch (error) {
    console.error('Error buscando clientes:', error);
    res
      .status(500)
      .json({ success: false, message: 'No se pudo realizar la búsqueda de clientes.' });
  }
});

app.get('/api/clientes/recientes', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;

    const limitParam = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 12;

    let activo = 1;
    if (req.query.activo !== undefined) {
      const normalized = req.query.activo.toString().trim().toLowerCase();
      if (['0', 'false', 'inactivo', 'no'].includes(normalized)) {
        activo = 0;
      } else if (['all', 'todos', 'cualquiera', ''].includes(normalized)) {
        activo = null;
      }
    }

    const { query, params } = buildClientesQuery({
      negocioId: req.negocioId,
      search: null,
      activo,
      order: 'recientes',
      limit,
    });

    const rows = tenantDb.prepare(query).all(params);
    res.json(rows.map(mapClienteRow));
  } catch (error) {
    console.error('Error obteniendo clientes recientes:', error);
    res
      .status(500)
      .json({ success: false, message: 'No se pudieron cargar los clientes recientes.' });
  }
});

app.get(
  '/api/clientes/:id',
  authenticate,
  validateTenantAccess,
  validateResourceOwnership('cliente'),
  (req, res) => {
    try {
      const tenantDb = req.db || db;
      const cliente = getClienteById(req.params.id, tenantDb, req.negocioId);
      if (!cliente) {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
      }
      res.json(cliente);
    } catch (error) {
      console.error('Error obteniendo cliente:', error);
      res.status(500).json({ success: false, message: 'No se pudo cargar el cliente.' });
    }
  }
);

app.post('/api/clientes', authenticate, validateTenantAccess, criticalLimiter, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const record = buildClienteRecord(req.body || {}, null, req.negocioId);
    const insertStmt = tenantDb.prepare(`
      INSERT INTO clientes (
        id, negocio_id, nombre, cedula, telefono, email, direccion, ciudad, categoria,
        notas, total_comprado, activo, vehiculo_favorito_id, telegram_chat_id,
        created_at, updated_at
      ) VALUES (
        @id, @negocio_id, @nombre, @cedula, @telefono, @email, @direccion, @ciudad, @categoria,
        @notas, @total_comprado, @activo, @vehiculo_favorito_id, @telegram_chat_id,
        @created_at, @updated_at
      )
    `);

    insertStmt.run(record);
    const cliente = getClienteById(record.id, tenantDb, req.negocioId);
    res.status(201).json({ success: true, id: record.id, cliente });
  } catch (error) {
    console.error('Error creando cliente:', error);
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res
        .status(409)
        .json({
          success: false,
          message: 'Ya existe un cliente con la misma cédula o identificador.',
        });
    } else if (error?.message?.includes('obligatorio')) {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'No se pudo crear el cliente.' });
    }
  }
});

app.put(
  '/api/clientes/:id',
  authenticate,
  validateTenantAccess,
  validateResourceOwnership('cliente'),
  criticalLimiter,
  (req, res) => {
    try {
      const tenantDb = req.db || db;
      const existente = getRawCliente(req.params.id, tenantDb, req.negocioId);
      if (!existente) {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
      }

      const record = buildClienteRecord(
        { ...req.body, id: req.params.id },
        existente,
        req.negocioId
      );
      const updateStmt = tenantDb.prepare(`
      UPDATE clientes SET
        nombre = @nombre,
        negocio_id = @negocio_id,
        cedula = @cedula,
        telefono = @telefono,
        email = @email,
        direccion = @direccion,
        ciudad = @ciudad,
        categoria = @categoria,
        notas = @notas,
        total_comprado = @total_comprado,
        activo = @activo,
        vehiculo_favorito_id = @vehiculo_favorito_id,
        telegram_chat_id = @telegram_chat_id,
        created_at = @created_at,
        updated_at = @updated_at
      WHERE id = @id AND negocio_id = @negocio_id
    `);

      updateStmt.run(record);
      const cliente = getClienteById(record.id, tenantDb, req.negocioId);
      res.json({ success: true, cliente });
    } catch (error) {
      console.error('Error actualizando cliente:', error);
      if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res
          .status(409)
          .json({ success: false, message: 'Los datos ingresados violan una restricción única.' });
      } else if (error?.message?.includes('obligatorio')) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: 'No se pudo actualizar el cliente.' });
      }
    }
  }
);

app.delete(
  '/api/clientes/:id',
  authenticate,
  validateTenantAccess,
  validateResourceOwnership('cliente'),
  requireRole('admin'),
  criticalLimiter,
  (req, res) => {
    try {
      const tenantDb = req.db || db;
      const stmt = tenantDb.prepare(
        "UPDATE clientes SET activo = 0, updated_at = datetime('now') WHERE id = ? AND negocio_id = ?"
      );
      const result = stmt.run(req.params.id, req.negocioId);
      if (result.changes === 0) {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error eliminando cliente:', error);
      res.status(500).json({ success: false, message: 'No se pudo eliminar el cliente.' });
    }
  }
);

// ============================================
// RUTAS: NOTIFICACIONES ENVIADAS (TELEGRAM)
// ============================================
app.get('/api/notificaciones-enviadas', authenticate, (req, res) => {
  try {
    const { query, params } = buildNotificacionesQuery(req.query);
    const rows = req.db.prepare(query).all(params);
    const notificaciones = rows.map(mapNotificacionRow);
    res.json(notificaciones);
  } catch (error) {
    console.error('Error al obtener notificaciones enviadas:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Endpoint para crear una nueva notificación
app.post('/api/notificaciones-enviadas', authenticate, (req, res) => {
  try {
    const {
      chat_id,
      cliente_id,
      vehiculo_id,
      tipo_servicio,
      mensaje,
      telegram_message_id,
      entregado = 1,
      tipo = 'notificacion',
    } = req.body;

    if (!mensaje) {
      return res.status(400).json({ success: false, message: 'El mensaje es requerido' });
    }

    const stmt = req.db.prepare(`
      INSERT INTO notificaciones_enviadas (
        chat_id, cliente_id, vehiculo_id, tipo_servicio, mensaje,
        telegram_message_id, entregado, tipo, fecha_envio, created_at
      ) VALUES (
        @chat_id, @cliente_id, @vehiculo_id, @tipo_servicio, @mensaje,
        @telegram_message_id, @entregado, @tipo, datetime('now'), datetime('now')
      )
    `);

    const result = stmt.run({
      chat_id: chat_id || null,
      cliente_id: cliente_id || null,
      vehiculo_id: vehiculo_id || null,
      tipo_servicio: tipo_servicio || tipo || 'notificacion',
      mensaje,
      telegram_message_id: telegram_message_id || null,
      entregado: entregado ? 1 : 0,
      tipo: tipo || 'notificacion',
    });

    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: 'Notificación guardada correctamente',
    });
  } catch (error) {
    console.error('Error al guardar notificación:', error);
    res.status(500).json({ success: false, message: 'Error al guardar la notificación' });
  }
});

// Endpoint para obtener logs del sistema (solo para administradores)
app.post('/api/logs/security', authenticate, validateTenantAccess, (req, res) => {
  try {
    const dbInstance = resolveLogDatabase(req);
    if (!dbInstance) {
      return res
        .status(500)
        .json({ success: false, message: 'No se pudo resolver la base de datos del negocio.' });
    }

    const payload = {
      evento: req.body?.event || req.body?.evento || 'security_event',
      pagina: req.body?.page || null,
      timestamp: req.body?.timestamp || new Date().toISOString(),
      referrer: req.body?.referrer || null,
      userAgentCliente: req.body?.userAgent || null,
    };

    registerSystemLog(dbInstance, {
      usuarioId: req.user?.userId || null,
      accion: `security_event ${req.path}`.trim(),
      tabla: 'seguridad',
      registroId: null,
      datosAnteriores: null,
      datosNuevos: stringifyLogData({
        ...payload,
        resultado: 'registrado',
        method: req.method || 'POST',
      }),
      ip: extractClientIp(req),
      userAgent: req.headers['user-agent'] || payload.userAgentCliente || null,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error registrando log de seguridad:', error);
    res
      .status(500)
      .json({ success: false, message: 'No se pudo registrar el evento de seguridad.' });
  }
});

app.get(
  '/api/logs',
  authenticate,
  requireRole(ROLE_ADMIN, ROLE_SUPER_ADMIN),
  validateTenantAccess,
  (req, res) => {
    const tenantDb = req.db || db;

    try {
      const table = tenantDb
        .prepare(
          `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name IN ('logs_sistema', 'logs')
      LIMIT 1
    `
        )
        .get();

      if (!table) {
        return res.json([]);
      }

      let rows = [];

      if (table.name === 'logs_sistema') {
        const stmt = tenantDb.prepare(`
        SELECT
          ls.id,
          ls.fecha,
          ls.accion,
          ls.tabla AS tabla_afectada,
          ls.registro_id,
          ls.datos_anteriores,
          ls.datos_nuevos,
          ls.ip,
          ls.user_agent,
          u.nombre AS usuario_nombre,
          u.username AS usuario_username
        FROM logs_sistema ls
        LEFT JOIN usuarios u ON u.id = ls.usuario_id
        ORDER BY datetime(ls.fecha) DESC
        LIMIT 200
      `);
        rows = stmt.all();
      } else {
        const stmt = tenantDb.prepare(`
        SELECT
          l.id,
          l.fecha,
          l.accion,
          l.tabla AS tabla_afectada,
          l.registro_id,
          l.detalles,
          l.usuario AS usuario_nombre
        FROM logs l
        ORDER BY datetime(l.fecha) DESC
        LIMIT 200
      `);
        rows = stmt.all();
      }

      const logs = rows.map((row) => {
        const detalles = row.detalles || row.datos_nuevos || row.datos_anteriores || '';

        return {
          id: row.id,
          fecha: row.fecha,
          accion: row.accion,
          tabla_afectada: row.tabla_afectada || null,
          registro_id: row.registro_id || null,
          detalles: typeof detalles === 'string' ? detalles : JSON.stringify(detalles),
          usuario_nombre: row.usuario_nombre || row.usuario_username || 'Sistema',
          ip: row.ip || null,
          user_agent: row.user_agent || null,
        };
      });

      res.json(logs);
    } catch (error) {
      console.error('Error al obtener logs:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }
);

// ============================================
// RUTAS API: CLIENTES
// ============================================
app.get('/api/tecnicos', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const rows = tenantDb
      .prepare(
        `
      SELECT id, username, nombre, email, rol, telegram_chat_id
      FROM usuarios
      WHERE activo = 1
      ORDER BY COALESCE(nombre, username) COLLATE NOCASE ASC
    `
      )
      .all();

    const tecnicos = rows
      .map((row) => ({
        ...row,
        normalizedRole: normalizeRole(row.rol),
      }))
      .filter((row) => [ROLE_TECNICO, ROLE_ADMIN, ROLE_SUPER_ADMIN].includes(row.normalizedRole))
      .map((row) => ({
        id: row.id,
        nombre: row.nombre || row.username || 'Técnico sin nombre',
        username: row.username,
        email: row.email || null,
        rol: row.normalizedRole,
        especialidad: null,
        telegram_chat_id: row.telegram_chat_id || null,
      }));

    res.json(tecnicos);
  } catch (error) {
    console.error('Error obteniendo técnicos:', error);
    res.status(500).json({ success: false, message: 'No se pudieron cargar los técnicos.' });
  }
});

// ============================================
// RUTAS: VEHÍCULOS
// ============================================
app.get('/api/vehiculos', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const filters = {
      negocioId: req.negocioId,
      search: req.query.search || req.query.q || null,
      clienteId: req.query.clienteId || req.query.cliente_id || null,
      limit: req.query.limit ? Number.parseInt(req.query.limit, 10) : null,
    };

    const { query, params } = buildVehiculosQuery(filters);
    const rows = tenantDb.prepare(query).all(params);
    res.json(rows.map(mapVehiculoRow));
  } catch (error) {
    console.error('Error obteniendo vehículos:', error);
    res.status(500).json({ success: false, message: 'No se pudieron cargar los vehículos.' });
  }
});

app.get('/api/vehiculos/buscar', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const rawQuery = (req.query.q || '').toString().trim();
    if (!rawQuery) {
      return res.json([]);
    }

    // Validación segura de límite
    const limitParam = req.query.limit ? Number.parseInt(req.query.limit, 10) : 20;
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 20;

    const { query, params } = buildVehiculosQuery({
      negocioId: req.negocioId,
      search: rawQuery,
      clienteId: null,
      limit: limit,
    });

    const rows = tenantDb.prepare(query).all(params);
    res.json(rows.map(mapVehiculoRow));
  } catch (error) {
    console.error('Error buscando vehículos:', error);
    res.status(500).json({ success: false, message: 'No se pudo buscar vehículos.' });
  }
});

app.get('/api/vehiculos/recientes', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;

    const limitParam = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 15;

    const clienteId = req.query.clienteId || req.query.cliente_id || null;

    const { query, params } = buildVehiculosQuery({
      negocioId: req.negocioId,
      search: null,
      clienteId,
      limit,
    });

    const rows = tenantDb.prepare(query).all(params);
    res.json(rows.map(mapVehiculoRow));
  } catch (error) {
    console.error('Error obteniendo vehículos recientes:', error);
    res
      .status(500)
      .json({ success: false, message: 'No se pudieron cargar los vehículos recientes.' });
  }
});

app.get(
  '/api/vehiculos/:id',
  authenticate,
  validateTenantAccess,
  validateResourceOwnership('vehiculo'),
  (req, res) => {
    try {
      const tenantDb = req.db || db;
      const vehiculo = getVehiculoById(req.params.id, tenantDb, req.negocioId);
      if (!vehiculo) {
        return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
      }
      res.json(vehiculo);
    } catch (error) {
      console.error('Error obteniendo vehículo:', error);
      res.status(500).json({ success: false, message: 'No se pudo cargar el vehículo.' });
    }
  }
);

app.post('/api/vehiculos', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const record = buildVehiculoRecord(req.body || {}, null, req.negocioId);

    const clienteExiste = tenantDb
      .prepare('SELECT 1 FROM clientes WHERE id = ? AND negocio_id = ? AND activo = 1')
      .get(record.cliente_id, req.negocioId);
    if (!clienteExiste) {
      return res
        .status(400)
        .json({ success: false, message: 'El cliente asociado no existe o está inactivo.' });
    }

    tenantDb
      .prepare(
        `
      INSERT INTO vehiculos (
        id, negocio_id, cliente_id, marca, modelo, anio, placa, vin, color,
        kilometraje, fecha_ultimo_servicio, notas, created_at, updated_at
      ) VALUES (
        @id, @negocio_id, @cliente_id, @marca, @modelo, @anio, @placa, @vin, @color,
        @kilometraje, @fecha_ultimo_servicio, @notas, @created_at, @updated_at
      )
    `
      )
      .run(record);

    const vehiculo = getVehiculoById(record.id, tenantDb, req.negocioId);
    res.status(201).json({ success: true, id: record.id, vehiculo });
  } catch (error) {
    console.error('Error creando vehículo:', error);
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res
        .status(409)
        .json({ success: false, message: 'Ya existe un vehículo con la misma placa o VIN.' });
    } else if (error?.message?.includes('obligatorio')) {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'No se pudo crear el vehículo.' });
    }
  }
});

app.put(
  '/api/vehiculos/:id',
  authenticate,
  validateTenantAccess,
  validateResourceOwnership('vehiculo'),
  (req, res) => {
    try {
      const tenantDb = req.db || db;
      const existente = getRawVehiculo(req.params.id, tenantDb, req.negocioId);
      if (!existente) {
        return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
      }

      const record = buildVehiculoRecord(
        { ...req.body, id: req.params.id },
        existente,
        req.negocioId
      );

      const clienteExiste = tenantDb
        .prepare('SELECT 1 FROM clientes WHERE id = ? AND negocio_id = ?')
        .get(record.cliente_id, req.negocioId);
      if (!clienteExiste) {
        return res.status(400).json({ success: false, message: 'El cliente asociado no existe.' });
      }

      tenantDb
        .prepare(
          `
      UPDATE vehiculos SET
        negocio_id = @negocio_id,
        cliente_id = @cliente_id,
        marca = @marca,
        modelo = @modelo,
        anio = @anio,
        placa = @placa,
        vin = @vin,
        color = @color,
        kilometraje = @kilometraje,
        fecha_ultimo_servicio = @fecha_ultimo_servicio,
        notas = @notas,
        created_at = @created_at,
        updated_at = @updated_at
      WHERE id = @id AND negocio_id = @negocio_id
    `
        )
        .run(record);

      const vehiculo = getVehiculoById(record.id, tenantDb, req.negocioId);
      res.json({ success: true, vehiculo });
    } catch (error) {
      console.error('Error actualizando vehículo:', error);
      if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res
          .status(409)
          .json({ success: false, message: 'Los datos ingresados violan una restricción única.' });
      } else if (error?.message?.includes('obligatorio')) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: 'No se pudo actualizar el vehículo.' });
      }
    }
  }
);

app.delete(
  '/api/vehiculos/:id',
  authenticate,
  validateTenantAccess,
  validateResourceOwnership('vehiculo'),
  (req, res) => {
    try {
      const tenantDb = req.db || db;
      const result = tenantDb
        .prepare('DELETE FROM vehiculos WHERE id = ? AND negocio_id = ?')
        .run(req.params.id, req.negocioId);
      if (result.changes === 0) {
        return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error eliminando vehículo:', error);
      res.status(500).json({ success: false, message: 'No se pudo eliminar el vehículo.' });
    }
  }
);

app.post(
  '/api/vehiculos/:id/fotos',
  authenticate,
  validateTenantAccess,
  vehiclePhotosUpload.array('fotos', 8),
  (req, res) => {
    try {
      const tenantDb = req.db || db;
      const vehiculoId = req.params.id;
      if (!vehiculoId) {
        return res.status(400).json({ success: false, message: 'Vehículo no especificado.' });
      }

      const vehiculo = getRawVehiculo(vehiculoId, tenantDb, req.negocioId);
      if (!vehiculo) {
        return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
      }

      const files = Array.isArray(req.files) ? req.files : [];
      if (!files.length) {
        return res
          .status(400)
          .json({ success: false, message: 'No se recibieron fotos para subir.' });
      }

      const insertStmt = tenantDb.prepare(`
      INSERT INTO vehiculos_fotos (id, vehiculo_id, url, nombre_archivo, created_at)
      VALUES (@id, @vehiculo_id, @url, @nombre_archivo, @created_at)
    `);

      const now = new Date().toISOString();
      const fotosGuardadas = [];

      tenantDb.transaction(() => {
        for (const file of files) {
          const id = generateId('foto');
          const relativePath = path.posix.join('vehiculos', file.filename);
          insertStmt.run({
            id,
            vehiculo_id: vehiculoId,
            url: `/uploads/${relativePath}`,
            nombre_archivo: file.originalname,
            created_at: now,
          });
          fotosGuardadas.push({
            id,
            url: `/uploads/${relativePath}`,
            nombreArchivo: file.originalname,
            size: file.size,
          });
        }
      })();

      res.json({ success: true, fotos: fotosGuardadas });
    } catch (error) {
      console.error('Error subiendo fotos de vehículo:', error);
      res
        .status(500)
        .json({ success: false, message: 'No se pudieron subir las fotos del vehículo.' });
    }
  }
);

// ============================================
// RUTAS: ÓRDENES DE TRABAJO
// ============================================
app.get('/api/ordenes-trabajo', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const filters = {
      estado: req.query.estado || req.query.state || null,
      tecnicoId: req.query.tecnicoId || req.query.tecnico_id || null,
      fechaDesde: req.query.fechaDesde || req.query.fecha_desde || null,
      fechaHasta: req.query.fechaHasta || req.query.fecha_hasta || null,
    };

    const { query, params } = buildOrdenesTrabajoQuery(filters);
    const rows = tenantDb.prepare(query).all(params);
    res.json(rows.map(mapOrdenTrabajoRow));
  } catch (error) {
    console.error('Error obteniendo órdenes de trabajo:', error);
    res
      .status(500)
      .json({ success: false, message: 'No se pudieron cargar las órdenes de trabajo.' });
  }
});

app.get(
  '/api/ordenes-trabajo/:id',
  authenticate,
  validateTenantAccess,
  validateResourceOwnership('orden'),
  (req, res) => {
    try {
      const tenantDb = req.db || db;
      const orden = getOrdenTrabajoDetalle(req.params.id, tenantDb);
      if (!orden) {
        return res.status(404).json({ success: false, message: 'Orden de trabajo no encontrada.' });
      }
      res.json(orden);
    } catch (error) {
      console.error('Error obteniendo orden de trabajo:', error);
      res.status(500).json({ success: false, message: 'No se pudo cargar la orden de trabajo.' });
    }
  }
);

app.post('/api/ordenes-trabajo', authenticate, validateTenantAccess, (req, res) => {
  const body = req.body || {};

  try {
    const tenantDb = req.db || db;
    const clienteId = body.clienteId || body.cliente_id;
    if (!clienteId) {
      return res.status(400).json({ success: false, message: 'Debes seleccionar un cliente.' });
    }

    const cliente = getRawCliente(clienteId, tenantDb);
    if (!cliente) {
      return res
        .status(404)
        .json({ success: false, message: 'El cliente seleccionado no existe.' });
    }

    const items = normalizeOrderItems(body.items || []);
    const vehiculoInfo = ensureVehiculoParaOrden(body, clienteId, req.negocioId, tenantDb);

    const problemaReportado = (body.problemaReportado || body.problema_reportado || '')
      .toString()
      .trim();
    if (!problemaReportado) {
      return res
        .status(400)
        .json({ success: false, message: 'Describe el problema reportado por el cliente.' });
    }

    const diagnosticoInicial = (body.diagnosticoInicial || body.diagnostico_inicial || '')
      .toString()
      .trim();

    const totals = computeOrderTotals(items, body.iva ?? body.IVA ?? null);
    const descuento = normalizeNumber(body.descuento, 0);
    const totalFromBody =
      body.total !== undefined ? normalizeNumber(body.total, totals.total) : totals.total;
    const totalCalculado = Math.max(0, Number((totalFromBody - descuento).toFixed(2)));
    const montoPagado = normalizeNumber(body.monto_pagado ?? body.montoPagado, 0);

    const now = new Date().toISOString();
    const ordenId = body.id || generateId('ot');
    const numero = (body.numero || '').toString().trim() || generateOrdenTrabajoNumero(tenantDb);
    const estadoRaw = (body.estado || '').toString().trim().toLowerCase();
    const estado = ORDEN_TRABAJO_ESTADOS_VALIDOS.has(estadoRaw) ? estadoRaw : 'recibido';

    const prioridadRaw = (body.prioridad || 'normal').toString().trim().toLowerCase();
    const prioridad = ['urgente', 'alta', 'normal'].includes(prioridadRaw)
      ? prioridadRaw
      : 'normal';

    const parseDate = (value, fallback = null) => {
      if (!value) {
        return fallback;
      }
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? fallback : new Date(parsed).toISOString();
    };

    const fechaRecepcion = parseDate(body.fechaRecepcion || body.fecha_recepcion, now);
    const fechaEntregaEstimada = parseDate(
      body.fechaEntregaEstimada || body.fecha_entrega_estimada,
      null
    );
    const fechaEntregaReal = parseDate(body.fechaEntregaReal || body.fecha_entrega_real, null);

    const presupuestoInput = body.presupuestoEstimado ?? body.presupuesto_estimado;
    const presupuestoEstimado =
      presupuestoInput !== undefined && presupuestoInput !== null
        ? normalizeNumber(presupuestoInput, totalCalculado)
        : totalCalculado;

    const requiereContacto = toBooleanFlag(body.requiereContacto || body.requiere_contacto);
    const notificarAvances = toBooleanFlag(body.notificarAvances || body.notificar_avances);
    const nivelCombustible =
      (body.combustible || body.nivel_combustible || '').toString().trim() || null;
    const kilometraje =
      body.kilometraje !== undefined ? normalizeNumber(body.kilometraje, null) : null;
    const clienteContacto =
      (body.clienteContacto || body.cliente_contacto || '').toString().trim() || null;
    const rutaFactura = (body.ruta_factura || body.rutaFactura || '').toString().trim() || null;
    const tecnicoAsignadoId = body.tecnicoAsignadoId || body.tecnico_asignado_id || null;

    const ordenRecord = {
      id: ordenId,
      numero,
      cliente_id: clienteId,
      vehiculo_id: vehiculoInfo.id,
      fecha_recepcion: fechaRecepcion,
      fecha_entrega_estimada: fechaEntregaEstimada,
      fecha_entrega_real: fechaEntregaReal,
      problema_reportado: problemaReportado,
      diagnostico_inicial: diagnosticoInicial,
      tecnico_asignado_id: tecnicoAsignadoId,
      estado,
      subtotal_servicios: totals.subtotalServicios,
      subtotal_repuestos: totals.subtotalRepuestos,
      descuento,
      iva: totals.iva,
      total: totalCalculado,
      monto_pagado: Math.min(totalCalculado, montoPagado),
      ruta_factura: rutaFactura,
      observaciones: (body.observaciones || '').toString(),
      prioridad,
      kilometraje: kilometraje !== null ? Math.round(kilometraje) : null,
      nivel_combustible: nivelCombustible,
      presupuesto_estimado: presupuestoEstimado,
      observaciones_internas: (
        body.observacionesInternas ||
        body.observaciones_internas ||
        ''
      ).toString(),
      instrucciones_cliente: (
        body.instruccionesCliente ||
        body.instrucciones_cliente ||
        ''
      ).toString(),
      requiere_contacto: requiereContacto ? 1 : 0,
      notificar_avances: notificarAvances ? 1 : 0,
      cliente_contacto: clienteContacto,
      created_at: now,
      updated_at: now,
    };

    const insertOrdenStmt = tenantDb.prepare(`
      INSERT INTO ordenes_trabajo (
        id, numero, cliente_id, vehiculo_id, fecha_recepcion, fecha_entrega_estimada,
        fecha_entrega_real, problema_reportado, diagnostico_inicial, tecnico_asignado_id,
        estado, subtotal_servicios, subtotal_repuestos, descuento, iva, total, monto_pagado,
        ruta_factura, observaciones, prioridad, kilometraje, nivel_combustible,
        presupuesto_estimado, observaciones_internas, instrucciones_cliente,
        requiere_contacto, notificar_avances, cliente_contacto, created_at, updated_at
      ) VALUES (
        @id, @numero, @cliente_id, @vehiculo_id, @fecha_recepcion, @fecha_entrega_estimada,
        @fecha_entrega_real, @problema_reportado, @diagnostico_inicial, @tecnico_asignado_id,
        @estado, @subtotal_servicios, @subtotal_repuestos, @descuento, @iva, @total, @monto_pagado,
        @ruta_factura, @observaciones, @prioridad, @kilometraje, @nivel_combustible,
        @presupuesto_estimado, @observaciones_internas, @instrucciones_cliente,
        @requiere_contacto, @notificar_avances, @cliente_contacto, @created_at, @updated_at
      )
    `);

    const insertServicioStmt = tenantDb.prepare(`
      INSERT INTO ordenes_trabajo_servicios (
        orden_id, servicio_nombre, descripcion, horas_labor, precio_hora, precio_total_servicio
      ) VALUES (
        @orden_id, @servicio_nombre, @descripcion, @horas_labor, @precio_hora, @precio_total_servicio
      )
    `);

    const insertRepuestoStmt = tenantDb.prepare(`
      INSERT INTO ordenes_trabajo_repuestos (
        orden_id, producto_id, nombre_repuesto, cantidad, precio_unitario, precio_total_repuesto
      ) VALUES (
        @orden_id, @producto_id, @nombre_repuesto, @cantidad, @precio_unitario, @precio_total_repuesto
      )
    `);

    const transaction = tenantDb.transaction(() => {
      insertOrdenStmt.run(ordenRecord);

      items.forEach((item) => {
        if (item.tipo === 'repuesto') {
          insertRepuestoStmt.run({
            orden_id: ordenId,
            producto_id: item.producto_id || null,
            nombre_repuesto: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            precio_total_repuesto: Number((item.precio_unitario * item.cantidad).toFixed(2)),
          });
        } else {
          insertServicioStmt.run({
            orden_id: ordenId,
            servicio_nombre: item.descripcion,
            descripcion: item.detalle || '',
            horas_labor: item.cantidad,
            precio_hora: item.precio_unitario,
            precio_total_servicio: Number((item.precio_unitario * item.cantidad).toFixed(2)),
          });
        }
      });

      if (clienteContacto && (cliente.telefono || '').trim() !== clienteContacto) {
        tenantDb
          .prepare(
            "UPDATE clientes SET telefono = @telefono, updated_at = datetime('now') WHERE id = @id"
          )
          .run({
            telefono: clienteContacto,
            id: clienteId,
          });
      }
    });

    transaction();

    const orden = getOrdenTrabajoDetalle(ordenId, tenantDb);
    res.status(201).json({ success: true, ordenId, orden });
  } catch (error) {
    console.error('Error creando orden de trabajo:', error);
    res
      .status(500)
      .json({ success: false, message: error.message || 'No se pudo crear la orden de trabajo.' });
  }
});

app.put(
  '/api/ordenes-trabajo/:id',
  authenticate,
  validateTenantAccess,
  validateResourceOwnership('orden'),
  (req, res) => {
    const body = req.body || {};

    try {
      const tenantDb = req.db || db;
      const ordenId = req.params.id;
      const existenteRow = getOrdenTrabajoRowById(ordenId, tenantDb);
      if (!existenteRow) {
        return res.status(404).json({ success: false, message: 'La orden de trabajo no existe.' });
      }

      const clienteId = body.clienteId || body.cliente_id || existenteRow.cliente_id;
      const cliente = getRawCliente(clienteId, tenantDb);
      if (!cliente) {
        return res
          .status(404)
          .json({ success: false, message: 'El cliente seleccionado no existe.' });
      }

      const mergedBody = {
        ...body,
        vehiculoId: body.vehiculoId || body.vehiculo_id || existenteRow.vehiculo_id,
        vehiculo_id: body.vehiculoId || body.vehiculo_id || existenteRow.vehiculo_id,
      };

      const items = normalizeOrderItems(body.items || []);
      const vehiculoInfo = ensureVehiculoParaOrden(mergedBody, clienteId, req.negocioId, tenantDb);

      const problemaReportado = (
        body.problemaReportado ||
        body.problema_reportado ||
        existenteRow.problema_reportado ||
        ''
      )
        .toString()
        .trim();
      if (!problemaReportado) {
        return res
          .status(400)
          .json({ success: false, message: 'Describe el problema reportado por el cliente.' });
      }

      const diagnosticoInicial = (
        body.diagnosticoInicial ||
        body.diagnostico_inicial ||
        existenteRow.diagnostico_inicial ||
        ''
      )
        .toString()
        .trim();

      const totals = computeOrderTotals(items, body.iva ?? body.IVA ?? existenteRow.iva);
      const descuento = normalizeNumber(body.descuento ?? existenteRow.descuento, 0);
      const totalFromBody =
        body.total !== undefined ? normalizeNumber(body.total, totals.total) : totals.total;
      const totalCalculado = Math.max(0, Number((totalFromBody - descuento).toFixed(2)));
      const montoPagado = normalizeNumber(
        body.monto_pagado ?? body.montoPagado ?? existenteRow.monto_pagado,
        0
      );

      const now = new Date().toISOString();
      const estadoRaw = (body.estado || existenteRow.estado || '').toString().trim().toLowerCase();
      const estado = ORDEN_TRABAJO_ESTADOS_VALIDOS.has(estadoRaw) ? estadoRaw : existenteRow.estado;

      const prioridadRaw = (body.prioridad || existenteRow.prioridad || 'normal')
        .toString()
        .trim()
        .toLowerCase();
      const prioridad = ['urgente', 'alta', 'normal'].includes(prioridadRaw)
        ? prioridadRaw
        : existenteRow.prioridad || 'normal';

      const parseDate = (value, fallback = null) => {
        if (!value) {
          return fallback;
        }
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? fallback : new Date(parsed).toISOString();
      };

      const fechaRecepcion = parseDate(
        body.fechaRecepcion || body.fecha_recepcion,
        existenteRow.fecha_recepcion
      );
      const fechaEntregaEstimada = parseDate(
        body.fechaEntregaEstimada || body.fecha_entrega_estimada,
        existenteRow.fecha_entrega_estimada
      );
      const fechaEntregaReal = parseDate(
        body.fechaEntregaReal || body.fecha_entrega_real,
        existenteRow.fecha_entrega_real
      );

      const presupuestoInput =
        body.presupuestoEstimado ?? body.presupuesto_estimado ?? existenteRow.presupuesto_estimado;
      const presupuestoEstimado =
        presupuestoInput !== undefined && presupuestoInput !== null
          ? normalizeNumber(presupuestoInput, totalCalculado)
          : totalCalculado;

      const requiereContacto = toBooleanFlag(
        body.requiereContacto ?? body.requiere_contacto ?? existenteRow.requiere_contacto
      );
      const notificarAvances = toBooleanFlag(
        body.notificarAvances ?? body.notificar_avances ?? existenteRow.notificar_avances
      );
      const nivelCombustible =
        (body.combustible || body.nivel_combustible || existenteRow.nivel_combustible || '')
          .toString()
          .trim() || null;
      const kilometraje =
        body.kilometraje !== undefined
          ? normalizeNumber(body.kilometraje, existenteRow.kilometraje)
          : existenteRow.kilometraje;
      const clienteContacto =
        (body.clienteContacto || body.cliente_contacto || existenteRow.cliente_contacto || '')
          .toString()
          .trim() || null;
      const rutaFactura =
        (body.ruta_factura || body.rutaFactura || existenteRow.ruta_factura || '')
          .toString()
          .trim() || null;
      const tecnicoAsignadoId =
        body.tecnicoAsignadoId ||
        body.tecnico_asignado_id ||
        existenteRow.tecnico_asignado_id ||
        null;

      const ordenRecord = {
        id: ordenId,
        numero: existenteRow.numero,
        cliente_id: clienteId,
        vehiculo_id: vehiculoInfo.id,
        fecha_recepcion: fechaRecepcion,
        fecha_entrega_estimada: fechaEntregaEstimada,
        fecha_entrega_real: fechaEntregaReal,
        problema_reportado: problemaReportado,
        diagnostico_inicial: diagnosticoInicial,
        tecnico_asignado_id: tecnicoAsignadoId,
        estado,
        subtotal_servicios: totals.subtotalServicios,
        subtotal_repuestos: totals.subtotalRepuestos,
        descuento,
        iva: totals.iva,
        total: totalCalculado,
        monto_pagado: Math.min(totalCalculado, montoPagado),
        ruta_factura: rutaFactura,
        observaciones: (body.observaciones || existenteRow.observaciones || '').toString(),
        prioridad,
        kilometraje: kilometraje !== null ? Math.round(kilometraje) : null,
        nivel_combustible: nivelCombustible,
        presupuesto_estimado: presupuestoEstimado,
        observaciones_internas: (
          body.observacionesInternas ||
          body.observaciones_internas ||
          existenteRow.observaciones_internas ||
          ''
        ).toString(),
        instrucciones_cliente: (
          body.instruccionesCliente ||
          body.instrucciones_cliente ||
          existenteRow.instrucciones_cliente ||
          ''
        ).toString(),
        requiere_contacto: requiereContacto ? 1 : 0,
        notificar_avances: notificarAvances ? 1 : 0,
        cliente_contacto: clienteContacto,
        created_at: existenteRow.created_at,
        updated_at: now,
      };

      const updateOrdenStmt = tenantDb.prepare(`
      UPDATE ordenes_trabajo SET
        cliente_id = @cliente_id,
        vehiculo_id = @vehiculo_id,
        fecha_recepcion = @fecha_recepcion,
        fecha_entrega_estimada = @fecha_entrega_estimada,
        fecha_entrega_real = @fecha_entrega_real,
        problema_reportado = @problema_reportado,
        diagnostico_inicial = @diagnostico_inicial,
        tecnico_asignado_id = @tecnico_asignado_id,
        estado = @estado,
        subtotal_servicios = @subtotal_servicios,
        subtotal_repuestos = @subtotal_repuestos,
        descuento = @descuento,
        iva = @iva,
        total = @total,
        monto_pagado = @monto_pagado,
        ruta_factura = @ruta_factura,
        observaciones = @observaciones,
        prioridad = @prioridad,
        kilometraje = @kilometraje,
        nivel_combustible = @nivel_combustible,
        presupuesto_estimado = @presupuesto_estimado,
        observaciones_internas = @observaciones_internas,
        instrucciones_cliente = @instrucciones_cliente,
        requiere_contacto = @requiere_contacto,
        notificar_avances = @notificar_avances,
        cliente_contacto = @cliente_contacto,
        updated_at = @updated_at
      WHERE id = @id
    `);

      const deleteServiciosStmt = tenantDb.prepare(
        'DELETE FROM ordenes_trabajo_servicios WHERE orden_id = ?'
      );
      const deleteRepuestosStmt = tenantDb.prepare(
        'DELETE FROM ordenes_trabajo_repuestos WHERE orden_id = ?'
      );

      const insertServicioStmt = tenantDb.prepare(`
      INSERT INTO ordenes_trabajo_servicios (
        orden_id, servicio_nombre, descripcion, horas_labor, precio_hora, precio_total_servicio
      ) VALUES (
        @orden_id, @servicio_nombre, @descripcion, @horas_labor, @precio_hora, @precio_total_servicio
      )
    `);

      const insertRepuestoStmt = tenantDb.prepare(`
      INSERT INTO ordenes_trabajo_repuestos (
        orden_id, producto_id, nombre_repuesto, cantidad, precio_unitario, precio_total_repuesto
      ) VALUES (
        @orden_id, @producto_id, @nombre_repuesto, @cantidad, @precio_unitario, @precio_total_repuesto
      )
    `);

      const transaction = tenantDb.transaction(() => {
        updateOrdenStmt.run(ordenRecord);
        deleteServiciosStmt.run(ordenId);
        deleteRepuestosStmt.run(ordenId);

        items.forEach((item) => {
          if (item.tipo === 'repuesto') {
            insertRepuestoStmt.run({
              orden_id: ordenId,
              producto_id: item.producto_id || null,
              nombre_repuesto: item.descripcion,
              cantidad: item.cantidad,
              precio_unitario: item.precio_unitario,
              precio_total_repuesto: Number((item.precio_unitario * item.cantidad).toFixed(2)),
            });
          } else {
            insertServicioStmt.run({
              orden_id: ordenId,
              servicio_nombre: item.descripcion,
              descripcion: item.detalle || '',
              horas_labor: item.cantidad,
              precio_hora: item.precio_unitario,
              precio_total_servicio: Number((item.precio_unitario * item.cantidad).toFixed(2)),
            });
          }
        });

        if (clienteContacto && (cliente.telefono || '').trim() !== clienteContacto) {
          tenantDb
            .prepare(
              "UPDATE clientes SET telefono = @telefono, updated_at = datetime('now') WHERE id = @id"
            )
            .run({
              telefono: clienteContacto,
              id: clienteId,
            });
        }
      });

      transaction();

      const orden = getOrdenTrabajoDetalle(ordenId, tenantDb);
      res.json({ success: true, orden });
    } catch (error) {
      console.error('Error actualizando orden de trabajo:', error);
      res
        .status(500)
        .json({
          success: false,
          message: error.message || 'No se pudo actualizar la orden de trabajo.',
        });
    }
  }
);

app.put('/api/ordenes-trabajo/:id/estado', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const ordenId = req.params.id;
    const body = req.body || {};
    const nuevoEstadoRaw = (body.estado || body.state || '').toString().trim().toLowerCase();

    if (!ORDEN_TRABAJO_ESTADOS_VALIDOS.has(nuevoEstadoRaw)) {
      return res
        .status(400)
        .json({ success: false, message: 'Estado inválido para la orden de trabajo.' });
    }

    const existente = tenantDb
      .prepare('SELECT id, estado, fecha_entrega_real FROM ordenes_trabajo WHERE id = ?')
      .get(ordenId);
    if (!existente) {
      return res.status(404).json({ success: false, message: 'La orden de trabajo no existe.' });
    }

    const parseDate = (value, fallback = null) => {
      if (!value) {
        return fallback;
      }
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? fallback : new Date(parsed).toISOString();
    };

    let fechaEntregaReal = parseDate(
      body.fechaEntregaReal || body.fecha_entrega_real,
      existente.fecha_entrega_real
    );
    if (['finalizado', 'entregado'].includes(nuevoEstadoRaw) && !fechaEntregaReal) {
      fechaEntregaReal = new Date().toISOString();
    }

    if (!['finalizado', 'entregado'].includes(nuevoEstadoRaw)) {
      fechaEntregaReal = null;
    }

    tenantDb
      .prepare(
        `
      UPDATE ordenes_trabajo
      SET estado = @estado,
          fecha_entrega_real = @fecha_entrega_real,
          updated_at = datetime('now')
      WHERE id = @id
    `
      )
      .run({
        estado: nuevoEstadoRaw,
        fecha_entrega_real: fechaEntregaReal,
        id: ordenId,
      });

    const orden = getOrdenTrabajoDetalle(ordenId, tenantDb);
    res.json({ success: true, orden });
  } catch (error) {
    console.error('Error actualizando estado de orden de trabajo:', error);
    res
      .status(500)
      .json({ success: false, message: 'No se pudo actualizar el estado de la orden de trabajo.' });
  }
});

app.delete(
  '/api/ordenes-trabajo/:id',
  authenticate,
  validateTenantAccess,
  validateResourceOwnership('orden'),
  (req, res) => {
    try {
      const tenantDb = req.db || db;
      const result = tenantDb
        .prepare('DELETE FROM ordenes_trabajo WHERE id = ?')
        .run(req.params.id);
      if (result.changes === 0) {
        return res.status(404).json({ success: false, message: 'La orden de trabajo no existe.' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error eliminando orden de trabajo:', error);
      res.status(500).json({ success: false, message: 'No se pudo eliminar la orden de trabajo.' });
    }
  }
);

app.get('/api/catalogo-tecnico', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;
    const limitParam = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : null;

    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
    }

    let query = `
      SELECT 
        p.id,
        p.negocio_id,
        p.codigo,
        p.nombre,
        p.descripcion,
        p.categoria_id,
        c.nombre AS categoria_nombre,
        p.proveedor_id,
        p.precio_compra,
        p.precio_venta,
        p.stock,
        p.created_at,
        COALESCE(p.updated_at, p.created_at) AS updated_at
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id AND c.negocio_id = p.negocio_id
      WHERE p.activo = 1
        AND p.negocio_id = @negocioId
      ORDER BY p.nombre COLLATE NOCASE ASC
    `;

    const params = { negocioId };

    if (limit) {
      query += ' LIMIT @limit';
      params.limit = limit;
    }

    const productos = tenantDb.prepare(query).all(params);

    if (!productos.length) {
      return res.json([]);
    }

    const ids = productos.map((producto) => producto.id).filter(Boolean);
    const placeholders = ids.map(() => '?').join(',');

    let especificaciones = [];
    let compatibilidades = [];
    let numerosParte = [];

    // Verificar si las tablas existen antes de consultar
    const tables = tenantDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map((t) => t.name);
    const hasEspecificaciones = tableNames.includes('especificaciones_tecnicas');
    const hasCompatibilidad = tableNames.includes('productos_compatibilidad');
    const hasNumerosParte = tableNames.includes('numeros_parte');

    if (placeholders.length && hasEspecificaciones) {
      try {
        especificaciones = tenantDb
          .prepare(
            `
          SELECT producto_id, especificacion_clave, especificacion_valor
          FROM especificaciones_tecnicas
          WHERE producto_id IN (${placeholders})
        `
          )
          .all(...ids);
      } catch (err) {
        console.warn('Error consultando especificaciones_tecnicas:', err.message);
      }
    }

    if (placeholders.length && hasCompatibilidad) {
      try {
        compatibilidades = tenantDb
          .prepare(
            `
          SELECT 
            pc.producto_id,
            mv.nombre AS marca,
            mdv.nombre AS modelo,
            pc.anio_inicio,
            pc.anio_fin,
            pc.motor,
            pc.version,
            pc.posicion,
            pc.notas_compatibilidad
          FROM productos_compatibilidad pc
          LEFT JOIN marcas_vehiculos mv ON mv.id = pc.marca_vehiculo_id
          LEFT JOIN modelos_vehiculos mdv ON mdv.id = pc.modelo_vehiculo_id
          WHERE pc.producto_id IN (${placeholders})
        `
          )
          .all(...ids);
      } catch (err) {
        console.warn('Error consultando productos_compatibilidad:', err.message);
      }
    }

    if (placeholders.length && hasNumerosParte) {
      try {
        numerosParte = tenantDb
          .prepare(
            `
          SELECT producto_id, numero_parte, tipo_parte, fabricante
          FROM numeros_parte
          WHERE producto_id IN (${placeholders})
        `
          )
          .all(...ids);
      } catch (err) {
        console.warn('Error consultando numeros_parte:', err.message);
      }
    }

    const proveedores = tenantDb
      .prepare(
        `
      SELECT id, nombre, contacto, telefono, email, direccion, notas
      FROM proveedores
      WHERE activo = 1 AND negocio_id = @negocioId
    `
      )
      .all({ negocioId });

    const proveedoresMap = new Map(proveedores.map((prov) => [prov.id, prov]));
    const proveedoresOrdenados = [...proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre));

    const especificacionesPorProducto = new Map();
    especificaciones.forEach((spec) => {
      if (!especificacionesPorProducto.has(spec.producto_id)) {
        especificacionesPorProducto.set(spec.producto_id, []);
      }
      especificacionesPorProducto.get(spec.producto_id).push(spec);
    });

    const compatPorProducto = new Map();
    compatibilidades.forEach((comp) => {
      if (!compatPorProducto.has(comp.producto_id)) {
        compatPorProducto.set(comp.producto_id, []);
      }
      compatPorProducto.get(comp.producto_id).push(comp);
    });

    const numerosPorProducto = new Map();
    numerosParte.forEach((numero) => {
      if (!numerosPorProducto.has(numero.producto_id)) {
        numerosPorProducto.set(numero.producto_id, []);
      }
      numerosPorProducto.get(numero.producto_id).push(numero);
    });

    const fallbackAplicaciones = ['Aplicación general en parque automotor ecuatoriano'];

    const parseYear = (value) => {
      if (value === null || value === undefined) return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const agregarPalabrasClave = (set, valor) => {
      if (!valor) return;
      valor
        .toString()
        .toLowerCase()
        .split(/[^a-z0-9áéíóúñ]+/iu)
        .filter(Boolean)
        .forEach((token) => set.add(token));
    };

    const resultado = productos.map((producto) => {
      const specs = especificacionesPorProducto.get(producto.id) || [];
      const compatList = compatPorProducto.get(producto.id) || [];
      const numerosList = numerosPorProducto.get(producto.id) || [];

      const especificacionesObj = {};
      specs.forEach((spec) => {
        if (spec?.especificacion_clave) {
          especificacionesObj[spec.especificacion_clave] = spec.especificacion_valor || '';
        }
      });

      const compatibilidad = compatList.map((comp) => {
        const anioInicio = parseYear(comp.anio_inicio);
        const anioFin = parseYear(comp.anio_fin);
        const anios = anioInicio
          ? anioFin && anioFin !== anioInicio
            ? `${anioInicio}-${anioFin}`
            : `${anioInicio}`
          : '';

        return {
          marca: comp.marca || '',
          modelo: comp.modelo || '',
          anios,
          motor: comp.motor || '',
          detalle: comp.posicion || comp.version || '',
          notas: comp.notas_compatibilidad || '',
        };
      });

      const aplicaciones = compatibilidad.length
        ? compatibilidad
            .map((comp) => {
              const partes = [
                comp.marca,
                comp.modelo,
                comp.anios && `(${comp.anios})`,
                comp.motor,
              ].filter(Boolean);
              return partes.join(' ');
            })
            .slice(0, 6)
        : fallbackAplicaciones;

      const palabrasClave = new Set();
      agregarPalabrasClave(palabrasClave, producto.codigo);
      agregarPalabrasClave(palabrasClave, producto.nombre);
      agregarPalabrasClave(palabrasClave, producto.categoria_nombre);

      numerosList.forEach((numero) => agregarPalabrasClave(palabrasClave, numero.numero_parte));
      compatibilidad.forEach((comp) => {
        agregarPalabrasClave(palabrasClave, comp.marca);
        agregarPalabrasClave(palabrasClave, comp.modelo);
        agregarPalabrasClave(palabrasClave, comp.motor);
      });

      const proveedoresSugeridos = [];
      const registrarProveedor = (prov, principal = false) => {
        if (!prov) return;
        if (proveedoresSugeridos.some((existente) => existente.id === prov.id)) return;

        const proveedorItem = {
          id: prov.id,
          nombre: prov.nombre,
          contacto: prov.contacto || '',
          telefono: prov.telefono || '',
          email: prov.email || '',
          ubicacion: prov.direccion || '',
          disponibilidad:
            producto.stock > 0
              ? `Stock actual: ${producto.stock} unidades`
              : 'Bajo pedido 3-5 días',
          notas: prov.notas || '',
        };

        if (Number.isFinite(producto.precio_compra)) {
          proveedorItem.costoReferencial = Number(producto.precio_compra);
        }

        if (principal) {
          proveedorItem.principal = true;
        }

        proveedoresSugeridos.push(proveedorItem);
      };

      if (producto.proveedor_id && proveedoresMap.has(producto.proveedor_id)) {
        registrarProveedor(proveedoresMap.get(producto.proveedor_id), true);
      }

      if (proveedoresSugeridos.length < 3) {
        const nombreLower = (producto.nombre || '').toLowerCase();
        const tokens = nombreLower
          .split(/[^a-z0-9áéíóúñ]+/iu)
          .filter((token) => token && token.length > 3);

        proveedoresOrdenados.some((prov) => {
          if (producto.proveedor_id && prov.id === producto.proveedor_id) {
            return false;
          }

          const textoMatch = `${prov.nombre} ${prov.notas || ''}`.toLowerCase();
          const coincide = tokens.some((token) => textoMatch.includes(token));

          if (coincide) {
            registrarProveedor(prov);
          }

          return proveedoresSugeridos.length >= 3;
        });
      }

      if (!proveedoresSugeridos.length) {
        proveedoresOrdenados.slice(0, 2).forEach((prov) => registrarProveedor(prov));
      }

      const ultimaRevision = producto.updated_at || producto.created_at || new Date().toISOString();
      const estado = producto.stock > 0 ? 'activo' : 'en validacion';

      return {
        id: producto.id,
        sku: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria_nombre || 'General',
        subcategoria: producto.categoria_nombre || 'Sistema general',
        descripcion: producto.descripcion || '',
        aplicaciones,
        compatibilidad,
        especificaciones: especificacionesObj,
        procedimientos: [],
        fotoUrl: '',
        proveedores: proveedoresSugeridos,
        palabrasClave: Array.from(palabrasClave),
        estado,
        ultimaRevision,
        precioVenta: Number.isFinite(producto.precio_venta) ? Number(producto.precio_venta) : null,
        precioCompra: Number.isFinite(producto.precio_compra)
          ? Number(producto.precio_compra)
          : null,
        stock: Number.isFinite(producto.stock) ? Number(producto.stock) : null,
        origenDatos: 'backend',
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error('Error obteniendo catálogo técnico:', error);
    res.status(500).json({ success: false, message: 'No se pudo obtener el catálogo técnico.' });
  }
});

app.get('/api/pos/productos', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;

    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
    }

    cleanupOrphanProductos(tenantDb, negocioId, { limit: 75 });

    const limitParam = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : null;
    const activoParam =
      typeof req.query.activo === 'string' ? req.query.activo.toLowerCase() : null;
    const stockParamRaw =
      typeof req.query.stock === 'string' ? req.query.stock.toLowerCase().trim() : null;
    const minStockParamRaw = req.query.minStock;
    const minStockParam =
      minStockParamRaw !== undefined ? Number.parseFloat(minStockParamRaw) : null;
    const hasMinStockFilter = Number.isFinite(minStockParam);

    let estadoFiltro = 'todos';
    if (
      activoParam === '1' ||
      activoParam === 'true' ||
      activoParam === 'activos' ||
      activoParam === 'active'
    ) {
      estadoFiltro = 'activos';
    } else if (
      activoParam === '0' ||
      activoParam === 'false' ||
      activoParam === 'inactivos' ||
      activoParam === 'inactive'
    ) {
      estadoFiltro = 'inactivos';
    } else if (activoParam === 'todos' || activoParam === 'all') {
      estadoFiltro = 'todos';
    }

    const conditions = ['p.negocio_id = @negocioId'];
    if (estadoFiltro === 'activos') {
      conditions.push('p.activo = 1');
    } else if (estadoFiltro === 'inactivos') {
      conditions.push('p.activo = 0');
    }

    if (
      stockParamRaw === 'disponibles' ||
      stockParamRaw === 'positivos' ||
      stockParamRaw === 'mayores'
    ) {
      conditions.push('p.stock > 0');
    } else if (
      stockParamRaw === 'agotados' ||
      stockParamRaw === 'sin-stock' ||
      stockParamRaw === '0'
    ) {
      conditions.push('p.stock <= 0');
    }

    if (hasMinStockFilter) {
      conditions.push('p.stock >= @minStock');
    }

    let query = `
      SELECT 
        p.id, p.negocio_id, p.codigo, p.nombre, p.descripcion, p.categoria_id, p.proveedor_id,
        p.precio_compra, p.precio_venta, p.stock, p.stock_minimo, p.activo,
        p.created_at, p.updated_at,
        c.nombre AS categoria_nombre,
        pr.nombre AS proveedor_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id AND c.negocio_id = p.negocio_id
      LEFT JOIN proveedores pr ON pr.id = p.proveedor_id AND pr.negocio_id = p.negocio_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.nombre COLLATE NOCASE ASC
    `;

    const params = { negocioId };

    if (hasMinStockFilter) {
      params.minStock = minStockParam;
    }

    if (limit) {
      query += ' LIMIT @limit';
      params.limit = limit;
    }

    const rows = tenantDb.prepare(query).all(params);

    res.json(rows.map(mapProductoRow));
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ success: false, message: 'No se pudo obtener la lista de productos.' });
  }
});

app.post('/api/productos', authenticate, validateTenantAccess, criticalLimiter, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;

    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
    }

    const {
      codigo,
      nombre,
      descripcion,
      categoria,
      categoriaId,
      proveedor,
      proveedorId,
      precioCompra,
      precioVenta,
      stock,
      stockMinimo,
      activo,
    } = req.body || {};

    const codigoValor = (codigo || '').toString().trim();
    const nombreValor = (nombre || '').toString().trim();
    const categoriaValor = (categoria || categoriaId || '').toString().trim();

    if (!codigoValor || !nombreValor || !categoriaValor) {
      return res
        .status(400)
        .json({ success: false, message: 'Código, nombre y categoría son obligatorios.' });
    }

    const categoriaExiste = tenantDb
      .prepare('SELECT id FROM categorias WHERE id = ? AND negocio_id = ?')
      .get(categoriaValor, negocioId);
    if (!categoriaExiste) {
      return res.status(400).json({ success: false, message: 'La categoría indicada no existe.' });
    }

    const proveedorValorRaw = (proveedorId ?? proveedor ?? '').toString().trim();
    const proveedorValor = proveedorValorRaw ? proveedorValorRaw : null;

    if (proveedorValor) {
      const proveedorExiste = tenantDb
        .prepare('SELECT id FROM proveedores WHERE id = ? AND negocio_id = ?')
        .get(proveedorValor, negocioId);
      if (!proveedorExiste) {
        return res
          .status(400)
          .json({ success: false, message: 'El proveedor indicado no existe.' });
      }
    }

    const precioCompraValor = Number.parseFloat(precioCompra ?? req.body?.precio_compra ?? 0);
    const precioVentaValor = Number.parseFloat(precioVenta ?? req.body?.precio_venta ?? 0);
    const stockValor = Number.parseInt(stock ?? 0, 10);
    const stockMinimoValor = Number.parseInt(stockMinimo ?? req.body?.stock_minimo ?? 0, 10);

    if (
      !Number.isFinite(precioCompraValor) ||
      precioCompraValor < 0 ||
      !Number.isFinite(precioVentaValor) ||
      precioVentaValor < 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Los precios deben ser números positivos.' });
    }

    if (
      !Number.isFinite(stockValor) ||
      stockValor < 0 ||
      !Number.isFinite(stockMinimoValor) ||
      stockMinimoValor < 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Los valores de stock deben ser enteros positivos.' });
    }

    const duplicate = tenantDb
      .prepare('SELECT id FROM productos WHERE LOWER(codigo) = ? AND negocio_id = ?')
      .get(codigoValor.toLowerCase(), negocioId);
    if (duplicate) {
      return res
        .status(409)
        .json({ success: false, message: 'Ya existe un producto con ese código.' });
    }

    const now = new Date().toISOString();
    const productoId = generateId('prod');

    tenantDb
      .prepare(
        `
      INSERT INTO productos (
        id, negocio_id, codigo, nombre, descripcion, categoria_id, proveedor_id,
        precio_compra, precio_venta, stock, stock_minimo, activo, created_at, updated_at
      ) VALUES (
        @id, @negocio_id, @codigo, @nombre, @descripcion, @categoria_id, @proveedor_id,
        @precio_compra, @precio_venta, @stock, @stock_minimo, @activo, @created_at, @updated_at
      )
    `
      )
      .run({
        id: productoId,
        negocio_id: negocioId,
        codigo: codigoValor,
        nombre: nombreValor,
        descripcion: (descripcion || '').toString().trim(),
        categoria_id: categoriaValor,
        proveedor_id: proveedorValor,
        precio_compra: Number(precioCompraValor.toFixed(2)),
        precio_venta: Number(precioVentaValor.toFixed(2)),
        stock: Math.round(stockValor),
        stock_minimo: Math.round(stockMinimoValor),
        activo: activo === false || activo === 0 ? 0 : 1,
        created_at: now,
        updated_at: now,
      });

    const newRow = getProductoRowById(productoId, tenantDb, negocioId);

    res.status(201).json(mapProductoRow(newRow));
  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({ success: false, message: 'No se pudo crear el producto.' });
  }
});

app.put(
  '/api/productos/:id',
  authenticate,
  validateTenantAccess,
  validateResourceOwnership('producto'),
  criticalLimiter,
  (req, res) => {
    try {
      const tenantDb = req.db || db;
      const negocioId = req.negocioId;

      if (!negocioId) {
        return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
      }

      const producto = tenantDb
        .prepare('SELECT * FROM productos WHERE id = ? AND negocio_id = ?')
        .get(req.params.id, negocioId);

      if (!producto) {
        return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
      }

      const {
        codigo,
        nombre,
        descripcion,
        categoria,
        categoriaId,
        proveedor,
        proveedorId,
        precioCompra,
        precioVenta,
        stock,
        stockMinimo,
        activo,
      } = req.body || {};

      const codigoValor = codigo !== undefined ? codigo.toString().trim() : producto.codigo;
      const nombreValor = nombre !== undefined ? nombre.toString().trim() : producto.nombre;
      const categoriaValor =
        categoria !== undefined || categoriaId !== undefined
          ? (categoria ?? categoriaId ?? '').toString().trim()
          : producto.categoria_id;

      if (!codigoValor || !nombreValor || !categoriaValor) {
        return res
          .status(400)
          .json({ success: false, message: 'Código, nombre y categoría son obligatorios.' });
      }

      if (codigoValor.toLowerCase() !== producto.codigo.toLowerCase()) {
        const duplicate = tenantDb
          .prepare(
            'SELECT id FROM productos WHERE LOWER(codigo) = ? AND id != ? AND negocio_id = ?'
          )
          .get(codigoValor.toLowerCase(), producto.id, negocioId);
        if (duplicate) {
          return res
            .status(409)
            .json({ success: false, message: 'Ya existe un producto con ese código.' });
        }
      }

      const categoriaExiste = tenantDb
        .prepare('SELECT id FROM categorias WHERE id = ? AND negocio_id = ?')
        .get(categoriaValor, negocioId);
      if (!categoriaExiste) {
        return res
          .status(400)
          .json({ success: false, message: 'La categoría indicada no existe.' });
      }

      const proveedorValorRaw =
        proveedorId !== undefined || proveedor !== undefined
          ? (proveedorId ?? proveedor ?? '').toString().trim()
          : producto.proveedor_id;
      const proveedorValor = proveedorValorRaw ? proveedorValorRaw : null;

      if (proveedorValor) {
        const proveedorExiste = tenantDb
          .prepare('SELECT id FROM proveedores WHERE id = ? AND negocio_id = ?')
          .get(proveedorValor, negocioId);
        if (!proveedorExiste) {
          return res
            .status(400)
            .json({ success: false, message: 'El proveedor indicado no existe.' });
        }
      }

      const precioCompraValor =
        precioCompra !== undefined || req.body?.precio_compra !== undefined
          ? Number.parseFloat(precioCompra ?? req.body?.precio_compra)
          : producto.precio_compra;
      const precioVentaValor =
        precioVenta !== undefined || req.body?.precio_venta !== undefined
          ? Number.parseFloat(precioVenta ?? req.body?.precio_venta)
          : producto.precio_venta;
      const stockValor = stock !== undefined ? Number.parseInt(stock, 10) : producto.stock;
      const stockMinimoValor =
        stockMinimo !== undefined || req.body?.stock_minimo !== undefined
          ? Number.parseInt(stockMinimo ?? req.body?.stock_minimo, 10)
          : producto.stock_minimo;

      if (
        !Number.isFinite(precioCompraValor) ||
        precioCompraValor < 0 ||
        !Number.isFinite(precioVentaValor) ||
        precioVentaValor < 0
      ) {
        return res
          .status(400)
          .json({ success: false, message: 'Los precios deben ser números positivos.' });
      }

      if (
        !Number.isFinite(stockValor) ||
        stockValor < 0 ||
        !Number.isFinite(stockMinimoValor) ||
        stockMinimoValor < 0
      ) {
        return res
          .status(400)
          .json({ success: false, message: 'Los valores de stock deben ser enteros positivos.' });
      }

      const now = new Date().toISOString();

      tenantDb
        .prepare(
          `
      UPDATE productos
      SET codigo = @codigo,
          nombre = @nombre,
          descripcion = @descripcion,
          categoria_id = @categoria_id,
          proveedor_id = @proveedor_id,
          precio_compra = @precio_compra,
          precio_venta = @precio_venta,
          stock = @stock,
          stock_minimo = @stock_minimo,
          activo = @activo,
          updated_at = @updated_at
      WHERE id = @id AND negocio_id = @negocio_id
    `
        )
        .run({
          id: producto.id,
          negocio_id: producto.negocio_id,
          codigo: codigoValor,
          nombre: nombreValor,
          descripcion:
            descripcion !== undefined ? descripcion.toString().trim() : producto.descripcion || '',
          categoria_id: categoriaValor,
          proveedor_id: proveedorValor,
          precio_compra: Number(precioCompraValor.toFixed(2)),
          precio_venta: Number(precioVentaValor.toFixed(2)),
          stock: Math.round(stockValor),
          stock_minimo: Math.round(stockMinimoValor),
          activo: activo === undefined ? producto.activo : activo ? 1 : 0,
          updated_at: now,
        });

      // Registrar cambio de stock en historial si hay diferencia
      const stockAnterior = Number(producto.stock) || 0;
      const stockNuevo = Math.round(stockValor);
      if (stockAnterior !== stockNuevo) {
        const diferencia = stockNuevo - stockAnterior;
        const tipoMovimiento = diferencia > 0 ? 'compra' : 'ajuste_salida';
        const cantidadAbsoluta = Math.abs(diferencia);

        try {
          // Verificar si existe la tabla historial_productos
          const tablaExiste = tenantDb
            .prepare(
              `
          SELECT name FROM sqlite_master WHERE type='table' AND name='historial_productos'
        `
            )
            .get();

          if (tablaExiste) {
            const historialId = `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const fechaActual = now.split('T')[0];
            const horaActual = now.split('T')[1].split('.')[0];

            tenantDb
              .prepare(
                `
            INSERT INTO historial_productos (
              id, negocio_id, producto_id, producto_nombre, tipo_movimiento,
              cantidad, stock_anterior, stock_nuevo, precio, total,
              referencia_id, usuario_id, notas, fecha, hora, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `
              )
              .run(
                historialId,
                negocioId,
                producto.id,
                nombreValor,
                tipoMovimiento,
                cantidadAbsoluta,
                stockAnterior,
                stockNuevo,
                Number(precioCompraValor.toFixed(2)),
                cantidadAbsoluta * Number(precioCompraValor.toFixed(2)),
                'reabastecimiento-manual',
                req.user?.id || null,
                diferencia > 0
                  ? 'Reabastecimiento desde gestión de productos'
                  : 'Ajuste manual de stock',
                fechaActual,
                horaActual
              );
          }
        } catch (historialError) {
          console.warn('No se pudo registrar historial de movimiento:', historialError.message);
        }
      }

      const updatedRow = getProductoRowById(producto.id, tenantDb, negocioId);

      res.json(mapProductoRow(updatedRow));
    } catch (error) {
      console.error('Error actualizando producto:', error);
      res.status(500).json({ success: false, message: 'No se pudo actualizar el producto.' });
    }
  }
);

app.delete(
  '/api/productos/:id',
  authenticate,
  validateTenantAccess,
  validateResourceOwnership('producto'),
  criticalLimiter,
  (req, res) => {
    let tenantDb = null;
    let negocioId = null;
    let producto = null;

    try {
      tenantDb = req.db || db;
      negocioId = req.negocioId;

      if (!negocioId) {
        return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
      }

      producto = tenantDb
        .prepare('SELECT * FROM productos WHERE id = ? AND negocio_id = ?')
        .get(req.params.id, negocioId);

      if (!producto) {
        return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
      }

      let referenceSummary = getProductoReferenceSummary(tenantDb, producto.id, negocioId);
      let purgeSummary = null;

      if (referenceSummary.totalBlocking > 0 || referenceSummary.totalSoft > 0) {
        purgeSummary = purgeProductoReferences(tenantDb, producto.id, negocioId);
        referenceSummary = getProductoReferenceSummary(tenantDb, producto.id, negocioId);
      }

      if (referenceSummary.totalBlocking > 0) {
        archiveProductoRecord(tenantDb, producto, negocioId, referenceSummary);
        const archivedRow = getProductoRowById(producto.id, tenantDb, negocioId);

        return res.json({
          success: true,
          archived: true,
          message:
            'El producto se archivó porque mantiene movimientos históricos vinculados que no se pudieron limpiar automáticamente. Ya no aparecerá en el inventario activo.',
          producto: mapProductoRow(archivedRow),
          references: referenceSummary,
          purge: purgeSummary,
        });
      }

      const deleteTransaction = tenantDb.transaction(() => {
        tenantDb
          .prepare('DELETE FROM productos WHERE id = ? AND negocio_id = ?')
          .run(producto.id, negocioId);
      });

      deleteTransaction();

      res.json({
        success: true,
        deleted: true,
        message: 'Producto eliminado permanentemente.',
        references: referenceSummary,
        purge: purgeSummary,
      });
    } catch (error) {
      if (/FOREIGN KEY constraint failed/i.test(error.message) && tenantDb && producto) {
        try {
          const purgeAttempt = purgeProductoReferences(tenantDb, producto.id, negocioId);
          const summary = getProductoReferenceSummary(tenantDb, producto.id, negocioId);
          archiveProductoRecord(tenantDb, producto, negocioId, summary);
          const archivedRow = getProductoRowById(producto.id, tenantDb, negocioId);

          return res.json({
            success: true,
            archived: true,
            message:
              'El producto se archivó automáticamente porque aún mantiene vínculos en el sistema. Ya no aparecerá en el inventario activo.',
            producto: mapProductoRow(archivedRow),
            references: summary,
            purge: purgeAttempt,
          });
        } catch (archiveError) {
          console.error('Error archivando producto tras fallo de integridad:', archiveError);
        }
      }

      console.error('Error eliminando producto:', error);
      res.status(500).json({ success: false, message: 'No se pudo eliminar el producto.' });
    }
  }
);

app.get('/api/productos/buscar', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;
    const rawQuery = (req.query.q || '').toString().trim();
    const stockParamRaw =
      typeof req.query.stock === 'string' ? req.query.stock.toLowerCase().trim() : null;
    const minStockParamRaw = req.query.minStock;
    const minStockParam =
      minStockParamRaw !== undefined ? Number.parseFloat(minStockParamRaw) : null;
    const hasMinStockFilter = Number.isFinite(minStockParam);

    const limitParam = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 10;

    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
    }

    if (!rawQuery) {
      const stockConditions = [];
      if (
        stockParamRaw === 'disponibles' ||
        stockParamRaw === 'positivos' ||
        stockParamRaw === 'mayores'
      ) {
        stockConditions.push('p.stock > 0');
      } else if (
        stockParamRaw === 'agotados' ||
        stockParamRaw === 'sin-stock' ||
        stockParamRaw === '0'
      ) {
        stockConditions.push('p.stock <= 0');
      }

      if (hasMinStockFilter) {
        stockConditions.push('p.stock >= @minStock');
      }

      const stockWhereClause = stockConditions.length
        ? ` AND ${stockConditions.join(' AND ')}`
        : '';

      const rows = tenantDb
        .prepare(
          `
        SELECT 
          p.id, p.negocio_id, p.codigo, p.nombre, p.descripcion, p.categoria_id, p.proveedor_id,
          p.precio_compra, p.precio_venta, p.stock, p.stock_minimo, p.activo,
          p.created_at, p.updated_at,
          c.nombre AS categoria_nombre,
          pr.nombre AS proveedor_nombre
        FROM productos p
        LEFT JOIN categorias c ON c.id = p.categoria_id AND c.negocio_id = p.negocio_id
        LEFT JOIN proveedores pr ON pr.id = p.proveedor_id AND pr.negocio_id = p.negocio_id
        WHERE p.negocio_id = @negocioId${stockWhereClause}
        ORDER BY p.nombre COLLATE NOCASE ASC
        LIMIT @limit
      `
        )
        .all({ negocioId, limit, minStock: minStockParam });

      return res.json(rows.map(mapProductoRow));
    }

    if (rawQuery.length < 2) {
      return res.json([]);
    }

    const normalized = rawQuery.toLowerCase();
    const likeTerm = `%${normalized.replace(/\s+/g, '%')}%`;
    const startsTerm = `${normalized}%`;
    const exactCode = normalized;
    const exactName = normalized;

    const stockConditions = [];
    if (
      stockParamRaw === 'disponibles' ||
      stockParamRaw === 'positivos' ||
      stockParamRaw === 'mayores'
    ) {
      stockConditions.push('p.stock > 0');
    } else if (
      stockParamRaw === 'agotados' ||
      stockParamRaw === 'sin-stock' ||
      stockParamRaw === '0'
    ) {
      stockConditions.push('p.stock <= 0');
    }

    if (hasMinStockFilter) {
      stockConditions.push('p.stock >= @minStock');
    }

    const stockWhereClause = stockConditions.length ? ` AND ${stockConditions.join(' AND ')}` : '';

    const stmt = tenantDb.prepare(`
      SELECT 
        p.id, p.negocio_id, p.codigo, p.nombre, p.descripcion, p.categoria_id, p.proveedor_id,
        p.precio_compra, p.precio_venta, p.stock, p.stock_minimo, p.activo,
        p.created_at, p.updated_at,
        c.nombre AS categoria_nombre,
        pr.nombre AS proveedor_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id AND c.negocio_id = p.negocio_id
      LEFT JOIN proveedores pr ON pr.id = p.proveedor_id AND pr.negocio_id = p.negocio_id
      WHERE p.negocio_id = @negocioId
        AND (
          LOWER(p.nombre) LIKE @likeTerm
          OR LOWER(p.codigo) LIKE @likeTerm
          OR LOWER(IFNULL(p.descripcion, '')) LIKE @likeTerm
        )${stockWhereClause}
      ORDER BY CASE WHEN LOWER(p.codigo) = @exactCode THEN -1 ELSE 0 END,
               CASE WHEN LOWER(p.nombre) = @exactName THEN 0 ELSE 1 END,
               CASE WHEN LOWER(p.nombre) LIKE @startsTerm THEN 0 ELSE 1 END,
               CASE WHEN LOWER(p.codigo) LIKE @startsTerm THEN 0 ELSE 1 END,
               p.nombre COLLATE NOCASE ASC
      LIMIT @limit
    `);

    const rows = stmt.all({
      negocioId,
      likeTerm,
      exactCode,
      exactName,
      startsTerm,
      limit,
      minStock: minStockParam,
    });

    res.json(rows.map(mapProductoRow));
  } catch (error) {
    console.error('Error buscando productos:', error);
    res.status(500).json({ success: false, message: 'No se pudo buscar productos.' });
  }
});

function sanitizeCompraItems(rawItems = []) {
  const sanitizedItems = [];
  const invalidIndexes = [];

  rawItems.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      invalidIndexes.push(index);
      return;
    }

    const nombre = (item.productoNombre || item.nombre || item.descripcion || '').toString().trim();
    const descripcion = (item.descripcion || '').toString().trim();
    const unidad = (item.unidad || '').toString().trim();
    const codigo = (
      item.codigo ||
      item.sku ||
      item.code ||
      item.productoCodigo ||
      item.producto_codigo ||
      ''
    )
      .toString()
      .trim();
    const categoriaId = (item.categoriaId || item.categoria_id || '').toString().trim();
    const proveedorId = (item.proveedorId || item.proveedor_id || '').toString().trim();
    const cantidad = normalizeNumber(item.cantidad ?? item.cant ?? item.qty, 0);
    const precioUnitario = normalizeNumber(
      item.precioUnitario ?? item.precio_unitario ?? item.precio ?? item.costo,
      0
    );
    const precioVenta = normalizeNumber(
      item.precioVenta ?? item.precio_venta ?? item.precioSugerido,
      0
    );
    const subtotalReferencia = cantidad * precioUnitario;
    const subtotalValor = normalizeNumber(
      item.subtotal ?? item.total ?? item.valorTotal,
      subtotalReferencia
    );

    if (!nombre || cantidad <= 0 || precioUnitario < 0) {
      invalidIndexes.push(index);
      return;
    }

    sanitizedItems.push({
      productoId: item.productoId || item.producto_id || null,
      codigo: codigo || null,
      categoriaId: categoriaId || null,
      proveedorId: proveedorId || null,
      productoNombre: nombre,
      nombre,
      descripcion,
      unidad,
      cantidad,
      precioUnitario,
      precioVenta,
      subtotal: subtotalValor,
    });
  });

  sanitizedItems.forEach((item) => {
    item.cantidad = Number(item.cantidad);
    item.precioUnitario = round2(item.precioUnitario);
    item.subtotal = round2(item.subtotal);
    item.total = item.subtotal;
  });

  const subtotalFromItems = sanitizedItems.reduce((acc, current) => acc + current.subtotal, 0);

  return { sanitizedItems, invalidIndexes, subtotalFromItems };
}

function mapCompraDetalleRow(row) {
  if (!row) return null;

  const cantidad = normalizeNumber(row.cantidad, 0);
  const precioUnitario = normalizeNumber(row.precio_unitario, 0);
  const subtotal = normalizeNumber(row.total, cantidad * precioUnitario);

  return {
    id: row.id,
    compraId: row.compra_id,
    productoId: row.producto_id,
    productoNombre: row.producto_nombre || '',
    nombre: row.producto_nombre || '',
    descripcion: row.descripcion || '',
    unidad: row.unidad || '',
    cantidad: Number(cantidad),
    precioUnitario: round2(precioUnitario),
    subtotal: round2(subtotal),
    total: round2(subtotal),
  };
}

function buildCompraDetalleMap(tenantDb, compraIds = [], negocioId = null) {
  const map = new Map();
  if (!Array.isArray(compraIds) || !compraIds.length) {
    return map;
  }

  const placeholders = compraIds.map(() => '?').join(', ');
  let query = `SELECT * FROM compras_detalle WHERE compra_id IN (${placeholders})`;
  const params = [...compraIds];

  if (negocioId) {
    query += ' AND (negocio_id = ? OR negocio_id IS NULL)';
    params.push(negocioId);
  }

  query += ' ORDER BY id ASC';

  const detalleRows = tenantDb.prepare(query).all(...params);

  detalleRows.forEach((row) => {
    const mapped = mapCompraDetalleRow(row);
    if (!map.has(row.compra_id)) {
      map.set(row.compra_id, []);
    }
    if (mapped) {
      map.get(row.compra_id).push(mapped);
    }
  });

  return map;
}

function mapCompraRow(row, detalleRows = []) {
  if (!row) return null;

  const subtotal = round2(normalizeNumber(row.subtotal, 0));
  const iva = round2(normalizeNumber(row.iva, 0));
  const otrosImpuestos = round2(normalizeNumber(row.otros_impuestos, 0));
  const total = round2(normalizeNumber(row.total, subtotal + iva + otrosImpuestos));
  const montoPagado = round2(normalizeNumber(row.monto_pagado, 0));

  let metadata = row.metadata;
  if (metadata && typeof metadata === 'string') {
    const trimmed = metadata.trim();
    if (trimmed) {
      try {
        metadata = JSON.parse(trimmed);
      } catch (error) {
        metadata = trimmed;
      }
    } else {
      metadata = null;
    }
  }

  const estadoPago = (row.estado_pago || row.estadoPago || 'pendiente').toLowerCase();

  return {
    ...row,
    subtotal,
    iva,
    otros_impuestos: otrosImpuestos,
    otrosImpuestos,
    total,
    monto_pagado: montoPagado,
    montoPagado,
    estadoPago,
    estado_pago: estadoPago,
    moneda: (row.moneda || 'USD').toString().toUpperCase(),
    metadata,
    items: Array.isArray(detalleRows) ? detalleRows : [],
  };
}

// ============================================
// ENDPOINTS: Facturas Pendientes de Aprobar
// ============================================

/**
 * Obtener todas las facturas pendientes de aprobar
 */
app.get('/api/facturas-pendientes', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId || null;

    ensureFacturasPendientesSchema(tenantDb);

    let query = 'SELECT * FROM facturas_pendientes';
    const params = {};

    if (negocioId) {
      query += ' WHERE negocio_id = @negocioId OR negocio_id IS NULL';
      params.negocioId = negocioId;
    }

    query += ' ORDER BY created_at DESC';

    const rows = tenantDb.prepare(query).all(params);

    // Parsear items JSON
    const facturas = rows.map((row) => {
      let items = [];
      if (row.items) {
        try {
          items = JSON.parse(row.items);
        } catch (e) {
          items = [];
        }
      }
      let metadata = null;
      if (row.metadata) {
        try {
          metadata = JSON.parse(row.metadata);
        } catch (e) {
          metadata = null;
        }
      }
      return {
        ...row,
        items,
        metadata,
      };
    });

    res.json({ success: true, facturas });
  } catch (error) {
    console.error('Error obteniendo facturas pendientes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener facturas pendientes.' });
  }
});

/**
 * Guardar una factura pendiente de aprobar
 */
app.post('/api/facturas-pendientes', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId || null;

    ensureFacturasPendientesSchema(tenantDb);

    const {
      id,
      numero_factura,
      fecha,
      hora,
      proveedor_nombre,
      proveedor_ruc,
      proveedor_id,
      subtotal,
      iva,
      total,
      items,
      pdf_base64,
      pdf_nombre,
      pdf_size,
      metadata,
    } = req.body;

    const facturaId = id || `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Verificar si ya existe una factura pendiente con el mismo número
    const existente = tenantDb
      .prepare(
        `
      SELECT id FROM facturas_pendientes 
      WHERE numero_factura = @numero_factura 
      AND (negocio_id = @negocioId OR negocio_id IS NULL)
    `
      )
      .get({ numero_factura, negocioId });

    if (existente) {
      // Actualizar la existente
      tenantDb
        .prepare(
          `
        UPDATE facturas_pendientes SET
          fecha = @fecha,
          hora = @hora,
          proveedor_nombre = @proveedor_nombre,
          proveedor_ruc = @proveedor_ruc,
          proveedor_id = @proveedor_id,
          subtotal = @subtotal,
          iva = @iva,
          total = @total,
          items = @items,
          pdf_base64 = @pdf_base64,
          pdf_nombre = @pdf_nombre,
          pdf_size = @pdf_size,
          metadata = @metadata,
          updated_at = datetime('now')
        WHERE id = @id
      `
        )
        .run({
          id: existente.id,
          fecha,
          hora: hora || null,
          proveedor_nombre: proveedor_nombre || '',
          proveedor_ruc: proveedor_ruc || '',
          proveedor_id: proveedor_id || null,
          subtotal: subtotal || 0,
          iva: iva || 0,
          total: total || 0,
          items: JSON.stringify(items || []),
          pdf_base64: pdf_base64 || null,
          pdf_nombre: pdf_nombre || null,
          pdf_size: pdf_size || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
        });

      return res.json({
        success: true,
        id: existente.id,
        updated: true,
        message: 'Factura pendiente actualizada.',
      });
    }

    // Insertar nueva
    tenantDb
      .prepare(
        `
      INSERT INTO facturas_pendientes (
        id, negocio_id, numero_factura, fecha, hora,
        proveedor_nombre, proveedor_ruc, proveedor_id,
        subtotal, iva, total, items,
        pdf_base64, pdf_nombre, pdf_size, metadata, estado
      ) VALUES (
        @id, @negocio_id, @numero_factura, @fecha, @hora,
        @proveedor_nombre, @proveedor_ruc, @proveedor_id,
        @subtotal, @iva, @total, @items,
        @pdf_base64, @pdf_nombre, @pdf_size, @metadata, 'pendiente'
      )
    `
      )
      .run({
        id: facturaId,
        negocio_id: negocioId,
        numero_factura: numero_factura || '',
        fecha: fecha || new Date().toISOString().split('T')[0],
        hora: hora || null,
        proveedor_nombre: proveedor_nombre || '',
        proveedor_ruc: proveedor_ruc || '',
        proveedor_id: proveedor_id || null,
        subtotal: subtotal || 0,
        iva: iva || 0,
        total: total || 0,
        items: JSON.stringify(items || []),
        pdf_base64: pdf_base64 || null,
        pdf_nombre: pdf_nombre || null,
        pdf_size: pdf_size || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      });

    res.status(201).json({ success: true, id: facturaId, message: 'Factura pendiente guardada.' });
  } catch (error) {
    console.error('Error guardando factura pendiente:', error);
    res.status(500).json({ success: false, message: 'Error al guardar factura pendiente.' });
  }
});

/**
 * Eliminar una factura pendiente
 */
app.delete('/api/facturas-pendientes/:id', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId || null;
    const { id } = req.params;

    ensureFacturasPendientesSchema(tenantDb);

    let query = 'DELETE FROM facturas_pendientes WHERE id = @id';
    const params = { id };

    if (negocioId) {
      query += ' AND (negocio_id = @negocioId OR negocio_id IS NULL)';
      params.negocioId = negocioId;
    }

    const result = tenantDb.prepare(query).run(params);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Factura pendiente no encontrada.' });
    }

    res.json({ success: true, message: 'Factura pendiente eliminada.' });
  } catch (error) {
    console.error('Error eliminando factura pendiente:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar factura pendiente.' });
  }
});

/**
 * Obtener el conteo de facturas pendientes (para badge)
 */
app.get('/api/facturas-pendientes/count', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId || null;

    // Asegurar que la tabla existe
    ensureFacturasPendientesSchema(tenantDb);

    // Verificar que la tabla realmente existe
    const tableExists = tenantDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='facturas_pendientes'")
      .get();
    if (!tableExists) {
      // La tabla no existe, retornar 0 sin error
      return res.json({ success: true, count: 0 });
    }

    let query = 'SELECT COUNT(*) as count FROM facturas_pendientes WHERE estado = @estado';
    const params = { estado: 'pendiente' };

    if (negocioId) {
      query += ' AND (negocio_id = @negocioId OR negocio_id IS NULL)';
      params.negocioId = negocioId;
    }

    const result = tenantDb.prepare(query).get(params);

    res.json({ success: true, count: result?.count || 0 });
  } catch (error) {
    console.error('Error obteniendo conteo de facturas pendientes:', error);
    // Retornar 0 con success true para no romper la UI
    res.json({ success: true, count: 0, warning: 'No se pudo obtener el conteo' });
  }
});

function loadCompraWithDetails(tenantDb, compraId, negocioId = null) {
  if (!tenantDb || !compraId) {
    return null;
  }

  const params = { compraId, negocioId };
  const compraRow = negocioId
    ? tenantDb
        .prepare(
          'SELECT * FROM compras WHERE id = @compraId AND (negocio_id = @negocioId OR negocio_id IS NULL)'
        )
        .get(params)
    : tenantDb.prepare('SELECT * FROM compras WHERE id = @compraId').get(params);

  if (!compraRow) {
    return null;
  }

  let detalleQuery = 'SELECT * FROM compras_detalle WHERE compra_id = @compraId';
  if (negocioId) {
    detalleQuery += ' AND (negocio_id = @negocioId OR negocio_id IS NULL)';
  }
  detalleQuery += ' ORDER BY id ASC';

  const detalleRows = tenantDb.prepare(detalleQuery).all(params).map(mapCompraDetalleRow);

  return mapCompraRow(compraRow, detalleRows);
}

function loadComprasWithDetails(tenantDb, rows = [], negocioId = null) {
  if (!Array.isArray(rows) || !rows.length) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const detalleMap = buildCompraDetalleMap(tenantDb, ids, negocioId);

  return rows.map((row) => mapCompraRow(row, detalleMap.get(row.id) || []));
}

app.post('/api/compras', authenticate, validateTenantAccess, criticalLimiter, (req, res) => {
  const {
    proveedorNombre,
    proveedorIdentificacion,
    numero,
    fecha,
    items,
    subtotal,
    iva,
    otrosImpuestos,
    total,
    moneda,
    estadoPago,
    montoPagado,
    notas,
    metadata,
  } = req.body || {};

  if (!proveedorNombre || !numero || !fecha || !Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: 'Faltan datos requeridos para crear la compra.' });
  }

  const { sanitizedItems, invalidIndexes, subtotalFromItems } = sanitizeCompraItems(items);

  if (!sanitizedItems.length) {
    return res
      .status(400)
      .json({
        success: false,
        message: 'Debe haber al menos un ítem válido para crear la compra.',
      });
  }

  if (invalidIndexes.length) {
    return res.status(400).json({
      success: false,
      message: `Existen ítems inválidos en las posiciones: ${invalidIndexes.map((i) => i + 1).join(', ')}.`,
    });
  }
  const subtotalValue = normalizeNumber(subtotal, subtotalFromItems);
  const ivaValue = normalizeNumber(iva, 0);
  const otrosValue = normalizeNumber(otrosImpuestos, 0);
  let totalValue = normalizeNumber(total, subtotalValue + ivaValue + otrosValue);

  const subtotalRounded = round2(subtotalValue || subtotalFromItems);
  const ivaRounded = round2(ivaValue);
  const otrosRounded = round2(otrosValue);
  let totalRounded = round2(totalValue);
  const expectedTotal = round2(subtotalRounded + ivaRounded + otrosRounded);
  if (Math.abs(totalRounded - expectedTotal) > 0.05) {
    totalRounded = expectedTotal;
  }

  const monedaValue =
    typeof moneda === 'string' && moneda.trim() ? moneda.trim().toUpperCase() : 'USD';
  const notasValue = typeof notas === 'string' ? notas.trim() : '';
  const proveedorIdentificacionValue =
    typeof proveedorIdentificacion === 'string' && proveedorIdentificacion.trim()
      ? proveedorIdentificacion.trim()
      : null;
  const estadoPagoValue =
    typeof estadoPago === 'string' && estadoPago.trim()
      ? estadoPago.trim().toLowerCase()
      : 'pendiente';
  let estadoPagoNormalized = ['pendiente', 'pagado', 'parcial'].includes(estadoPagoValue)
    ? estadoPagoValue
    : 'pendiente';
  const metadataValue =
    metadata == null ? null : typeof metadata === 'string' ? metadata : JSON.stringify(metadata);

  let montoPagadoValue = round2(Math.max(0, normalizeNumber(montoPagado, 0)));
  if (montoPagadoValue > totalRounded) {
    montoPagadoValue = totalRounded;
  }

  if (!estadoPagoNormalized || estadoPagoNormalized === 'pendiente') {
    if (totalRounded > 0 && Math.abs(totalRounded - montoPagadoValue) < 0.01) {
      estadoPagoNormalized = 'pagado';
    } else if (montoPagadoValue > 0) {
      estadoPagoNormalized = 'parcial';
    }
  } else if (
    estadoPagoNormalized === 'pagado' &&
    totalRounded > 0 &&
    montoPagadoValue < totalRounded
  ) {
    montoPagadoValue = totalRounded;
  } else if (estadoPagoNormalized === 'parcial' && montoPagadoValue <= 0) {
    estadoPagoNormalized = 'pendiente';
  }

  // Procesar PDF si existe
  const { pdfBase64, pdfNombre, pdfSize } = req.body;
  const pdfData =
    pdfBase64 && pdfNombre
      ? {
          pdf_base64: pdfBase64,
          pdf_nombre: pdfNombre,
          pdf_size: pdfSize || 0,
        }
      : {};

  const tenantDb = req.db || db;
  const negocioId = req.negocioId || null;

  const autoCreatedProducts = [];
  const createdProductIds = new Set();

  const transaction = tenantDb.transaction(() => {
    // Buscar proveedor existente por RUC o nombre
    let proveedor = null;

    if (proveedorIdentificacionValue) {
      const params = { ruc: proveedorIdentificacionValue, negocioId };
      const condition = negocioId ? 'AND (negocio_id = @negocioId OR negocio_id IS NULL)' : '';
      proveedor = tenantDb
        .prepare(
          `SELECT id FROM proveedores WHERE ruc = @ruc ${condition} ORDER BY updated_at DESC LIMIT 1`
        )
        .get(params);
    }

    if (!proveedor && proveedorNombre) {
      const params = { nombre: proveedorNombre.toLowerCase(), negocioId };
      const condition = negocioId ? 'AND (negocio_id = @negocioId OR negocio_id IS NULL)' : '';
      proveedor = tenantDb
        .prepare(
          `SELECT id FROM proveedores WHERE LOWER(nombre) = @nombre ${condition} ORDER BY updated_at DESC LIMIT 1`
        )
        .get(params);
    }

    let proveedorId = proveedor?.id;

    // Extraer datos adicionales del proveedor desde metadata
    let proveedorDireccion = null;
    let proveedorTelefono = null;
    let proveedorEmail = null;

    if (metadataValue) {
      try {
        const metadata = JSON.parse(metadataValue);
        if (metadata.proveedorDireccion) proveedorDireccion = metadata.proveedorDireccion;
        if (metadata.proveedorTelefono) proveedorTelefono = metadata.proveedorTelefono;
        if (metadata.proveedorEmail) proveedorEmail = metadata.proveedorEmail;
      } catch (error) {
        console.warn('No se pudo parsear metadata para datos de proveedor:', error.message);
      }
    }

    if (!proveedorId) {
      // Crear nuevo proveedor con TODA la información disponible
      proveedorId = generateId('prov');
      console.log(
        `[Compras] 🏪 Creando nuevo proveedor: ${proveedorNombre} (RUC: ${proveedorIdentificacionValue || 'N/A'})`
      );

      tenantDb
        .prepare(
          `
        INSERT INTO proveedores (id, negocio_id, nombre, ruc, direccion, telefono, email, activo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `
        )
        .run(
          proveedorId,
          negocioId,
          proveedorNombre,
          proveedorIdentificacionValue || null,
          proveedorDireccion || null,
          proveedorTelefono || null,
          proveedorEmail || null
        );
    } else {
      // Actualizar proveedor existente con nuevos datos (si existen)
      console.log(`[Compras] 🔄 Actualizando proveedor existente: ${proveedorNombre}`);

      const updates = [];
      const params = {};

      if (proveedorIdentificacionValue && proveedorIdentificacionValue.trim()) {
        updates.push('ruc = @ruc');
        params.ruc = proveedorIdentificacionValue;
      }
      if (proveedorDireccion && proveedorDireccion.trim()) {
        updates.push('direccion = @direccion');
        params.direccion = proveedorDireccion;
      }
      if (proveedorTelefono && proveedorTelefono.trim()) {
        updates.push('telefono = @telefono');
        params.telefono = proveedorTelefono;
      }
      if (proveedorEmail && proveedorEmail.trim()) {
        updates.push('email = @email');
        params.email = proveedorEmail;
      }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        params.id = proveedorId;
        if (negocioId) {
          params.negocioId = negocioId;
        }

        const updateSql = negocioId
          ? `UPDATE proveedores SET ${updates.join(', ')} WHERE id = @id AND (negocio_id = @negocioId OR negocio_id IS NULL)`
          : `UPDATE proveedores SET ${updates.join(', ')} WHERE id = @id`;
        tenantDb.prepare(updateSql).run(params);
        console.log(`[Compras] ✅ Proveedor actualizado con ${updates.length - 1} campos nuevos`);
      }
    }

    const compraId = generateId('compra');
    const insertData = {
      id: compraId,
      negocio_id: negocioId,
      numero,
      fecha,
      proveedor_id: proveedorId,
      proveedor_nombre: proveedorNombre,
      proveedor_identificacion: proveedorIdentificacionValue,
      moneda: monedaValue,
      subtotal: subtotalRounded,
      iva: ivaRounded,
      otros_impuestos: otrosRounded,
      total: totalRounded,
      notas: notasValue,
      metadata: metadataValue,
      ...pdfData,
    };

    const fields = Object.keys(insertData).join(', ');
    const placeholders = Object.keys(insertData)
      .map((k) => `@${k}`)
      .join(', ');

    tenantDb
      .prepare(
        `
      INSERT INTO compras (
        ${fields}, estado, estado_pago, monto_pagado
      )
      VALUES (
        ${placeholders}, 'completada', @estado_pago, @monto_pagado
      )
    `
      )
      .run({
        ...insertData,
        estado_pago: estadoPagoNormalized,
        monto_pagado: montoPagadoValue,
      });

    const productoContext = {
      proveedorId,
      numeroCompra: numero,
      descripcionBase: `Producto importado desde factura ${numero}`,
      markupFactor: 1.25,
    };

    sanitizedItems.forEach((item) => {
      if (!item) {
        return;
      }

      if ((!item.proveedorId || item.proveedorId === null) && proveedorId) {
        item.proveedorId = proveedorId;
      }

      const ensureResult = ensureProductoForCompraItem(tenantDb, negocioId, item, productoContext);

      if (ensureResult?.id) {
        item.productoId = ensureResult.id;
        if (!item.productoNombre && ensureResult.row?.nombre) {
          item.productoNombre = ensureResult.row.nombre;
          item.nombre = ensureResult.row.nombre;
        }

        if (ensureResult.created) {
          createdProductIds.add(ensureResult.id);
          if (ensureResult.row) {
            autoCreatedProducts.push(ensureResult.row);
          }
        }
      }
    });

    const insertDetalleStmt = tenantDb.prepare(`
      INSERT INTO compras_detalle (
        compra_id, negocio_id, producto_id, producto_nombre, descripcion, unidad,
        cantidad, precio_unitario, total
      )
      VALUES (
        @compra_id, @negocio_id, @producto_id, @producto_nombre, @descripcion, @unidad,
        @cantidad, @precio_unitario, @total
      )
    `);

    sanitizedItems.forEach((item) => {
      insertDetalleStmt.run({
        compra_id: compraId,
        negocio_id: negocioId,
        producto_id: item.productoId || null,
        producto_nombre: item.productoNombre,
        descripcion: item.descripcion || null,
        unidad: item.unidad || null,
        cantidad: item.cantidad,
        precio_unitario: item.precioUnitario,
        total: item.subtotal,
      });

      // ACTUALIZAR STOCK AUTOMÁTICAMENTE cuando se registra una compra
      if (item.productoId) {
        try {
          const precioVentaAplicado =
            item.precioVenta && item.precioVenta > 0 ? round2(item.precioVenta) : null;

          tenantDb
            .prepare(
              `
            UPDATE productos 
            SET stock = CASE WHEN (stock + @cantidad) < 0 THEN 0 ELSE stock + @cantidad END,
                precio_compra = @precio_compra,
                precio_venta = CASE WHEN @precio_venta IS NOT NULL THEN @precio_venta ELSE precio_venta END,
                updated_at = datetime('now')
            WHERE id = @producto_id
          `
            )
            .run({
              cantidad: item.cantidad,
              precio_compra: item.precioUnitario,
              precio_venta: precioVentaAplicado,
              producto_id: item.productoId,
            });

          if (createdProductIds.has(item.productoId)) {
            createdProductIds.delete(item.productoId);
            try {
              const refreshedRow = getProductoRowById(item.productoId, tenantDb, negocioId);
              if (refreshedRow) {
                const index = autoCreatedProducts.findIndex(
                  (prod) => prod && prod.id === item.productoId
                );
                if (index >= 0) {
                  autoCreatedProducts[index] = refreshedRow;
                } else {
                  autoCreatedProducts.push(refreshedRow);
                }
              }
            } catch (refreshError) {
              console.warn(
                `No se pudo refrescar producto creado ${item.productoId}:`,
                refreshError.message
              );
            }
          }
        } catch (error) {
          console.warn(
            `No se pudo actualizar stock del producto ${item.productoId}:`,
            error.message
          );
          if (createdProductIds.has(item.productoId)) {
            createdProductIds.delete(item.productoId);
          }
        }
      }
    });

    return compraId;
  });

  try {
    const compraId = transaction();
    const compra = loadCompraWithDetails(tenantDb, compraId, negocioId);

    // Mapear los productos creados al formato consistente de la API
    const productosMapeados = autoCreatedProducts
      .filter((p) => p && p.id)
      .map((p) => mapProductoRow(p));

    res.status(201).json({
      success: true,
      compraId,
      compra,
      productosCreados: productosMapeados,
    });
  } catch (error) {
    console.error('Error creando compra:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res
        .status(409)
        .json({ success: false, message: 'Ya existe una compra con el mismo número.' });
    } else {
      res.status(500).json({ success: false, message: 'No se pudo crear la compra.' });
    }
  }
});

app.get('/api/compras', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId || null;

    // Log de diagnóstico
    console.log(
      `📥 GET /api/compras - negocioId: ${negocioId}, user: ${req.user?.username || 'unknown'}`
    );

    if (!tenantDb) {
      console.error('❌ GET /api/compras - No hay conexión a base de datos');
      return res
        .status(500)
        .json({ success: false, message: 'Error de conexión a base de datos.' });
    }

    const params = negocioId ? { negocioId } : {};
    const query = negocioId
      ? 'SELECT * FROM compras WHERE negocio_id = @negocioId OR negocio_id IS NULL ORDER BY fecha DESC'
      : 'SELECT * FROM compras ORDER BY fecha DESC';

    const rows = tenantDb.prepare(query).all(params);
    console.log(`📦 GET /api/compras - Encontradas ${rows?.length || 0} compras`);

    const compras = loadComprasWithDetails(tenantDb, rows, negocioId);
    res.json(compras);
  } catch (error) {
    console.error('❌ Error obteniendo compras:', error);
    console.error('  Stack:', error.stack);
    console.error('  NegocioId:', req.negocioId);
    console.error('  User:', req.user?.username);
    res.status(500).json({ success: false, message: 'No se pudieron obtener las compras.' });
  }
});

// Obtener una compra específica por ID
app.get(
  '/api/compras/:id',
  authenticate,
  validateTenantAccess,
  validateResourceOwnership('compra'),
  (req, res) => {
    try {
      const tenantDb = req.db || db;
      const { id } = req.params;
      const negocioId = req.negocioId || null;

      const compra = loadCompraWithDetails(tenantDb, id, negocioId);

      if (!compra) {
        return res.status(404).json({ success: false, message: 'Compra no encontrada' });
      }
      res.json(compra);
    } catch (error) {
      console.error('Error obteniendo compra:', error);
      res.status(500).json({ success: false, message: 'Error al obtener la compra' });
    }
  }
);

// Actualizar una compra existente y su detalle
app.patch(
  '/api/compras/:id',
  csrfProtection,
  authenticate,
  validateTenantAccess,
  validateResourceOwnership('compra'),
  (req, res) => {
    try {
      const tenantDb = req.db || db;
      const { id } = req.params;
      const negocioId = req.negocioId || null;
      const payload = req.body || {};

      const compraQuery = negocioId
        ? 'SELECT * FROM compras WHERE id = @id AND (negocio_id = @negocioId OR negocio_id IS NULL)'
        : 'SELECT * FROM compras WHERE id = @id';
      const existingCompra = tenantDb.prepare(compraQuery).get({ id, negocioId });
      if (!existingCompra) {
        return res.status(404).json({ success: false, message: 'Compra no encontrada' });
      }

      const itemsProvided = Array.isArray(payload.items);
      let sanitizedItems = [];
      let subtotalFromItems = 0;
      const autoCreatedProducts = [];

      if (itemsProvided) {
        const sanitizeResult = sanitizeCompraItems(payload.items);
        sanitizedItems = sanitizeResult.sanitizedItems;
        subtotalFromItems = sanitizeResult.subtotalFromItems;

        if (!sanitizedItems.length) {
          return res
            .status(400)
            .json({ success: false, message: 'Debe proporcionar al menos un ítem válido.' });
        }

        if (sanitizeResult.invalidIndexes.length) {
          return res.status(400).json({
            success: false,
            message: `Ítems inválidos en las posiciones: ${sanitizeResult.invalidIndexes.map((i) => i + 1).join(', ')}.`,
          });
        }

        const productoContext = {
          proveedorId: existingCompra.proveedor_id || null,
          numeroCompra: existingCompra.numero,
          descripcionBase: `Producto importado desde factura ${existingCompra.numero}`,
          markupFactor: 1.25,
        };

        sanitizedItems.forEach((item) => {
          if (!item) {
            return;
          }

          if ((!item.proveedorId || item.proveedorId === null) && productoContext.proveedorId) {
            item.proveedorId = productoContext.proveedorId;
          }

          const ensureResult = ensureProductoForCompraItem(
            tenantDb,
            negocioId,
            item,
            productoContext
          );

          if (ensureResult?.id) {
            item.productoId = ensureResult.id;
            if (!item.productoNombre && ensureResult.row?.nombre) {
              item.productoNombre = ensureResult.row.nombre;
              item.nombre = ensureResult.row.nombre;
            }

            if (ensureResult.created && ensureResult.row) {
              autoCreatedProducts.push(ensureResult.row);
            }
          }
        });
      }

      const updateData = {};

      if (payload.numero !== undefined) {
        const numeroValue = payload.numero.toString().trim();
        if (!numeroValue) {
          return res
            .status(400)
            .json({ success: false, message: 'El número de la compra no puede estar vacío.' });
        }
        updateData.numero = numeroValue;
      }

      if (payload.fecha !== undefined) {
        const fechaValue = payload.fecha.toString().trim();
        if (!fechaValue) {
          return res
            .status(400)
            .json({ success: false, message: 'La fecha de la compra no puede estar vacía.' });
        }
        updateData.fecha = fechaValue;
      }

      if (payload.proveedorNombre !== undefined) {
        const proveedorNombreValue = payload.proveedorNombre.toString().trim();
        if (!proveedorNombreValue) {
          return res
            .status(400)
            .json({ success: false, message: 'El proveedor debe tener un nombre válido.' });
        }
        updateData.proveedor_nombre = proveedorNombreValue;
      }

      if (payload.proveedorIdentificacion !== undefined) {
        const identificacionValue = payload.proveedorIdentificacion;
        updateData.proveedor_identificacion =
          identificacionValue == null ? null : identificacionValue.toString().trim() || null;
      }

      if (payload.moneda !== undefined) {
        const monedaValue = payload.moneda.toString().trim();
        updateData.moneda = monedaValue ? monedaValue.toUpperCase() : 'USD';
      }

      const currentSubtotal = normalizeNumber(existingCompra.subtotal, 0);
      const currentIva = normalizeNumber(existingCompra.iva, 0);
      const currentOtros = normalizeNumber(existingCompra.otros_impuestos, 0);
      const currentTotal = round2(
        normalizeNumber(existingCompra.total, currentSubtotal + currentIva + currentOtros)
      );
      const currentMontoPagado = round2(normalizeNumber(existingCompra.monto_pagado, 0));

      let subtotalNew = currentSubtotal;
      if (itemsProvided) {
        subtotalNew = normalizeNumber(payload.subtotal, subtotalFromItems);
      } else if (payload.subtotal !== undefined) {
        subtotalNew = normalizeNumber(payload.subtotal, currentSubtotal);
      }

      let ivaNew =
        payload.iva !== undefined ? normalizeNumber(payload.iva, currentIva) : currentIva;

      let otrosNew =
        payload.otrosImpuestos !== undefined
          ? normalizeNumber(payload.otrosImpuestos, currentOtros)
          : currentOtros;

      let totalNew = currentTotal;
      const totalNeedsRecalc =
        itemsProvided ||
        payload.subtotal !== undefined ||
        payload.iva !== undefined ||
        payload.otrosImpuestos !== undefined;

      if (payload.total !== undefined) {
        totalNew = normalizeNumber(payload.total, subtotalNew + ivaNew + otrosNew);
      } else if (totalNeedsRecalc) {
        totalNew = subtotalNew + ivaNew + otrosNew;
      }

      subtotalNew = round2(subtotalNew);
      ivaNew = round2(ivaNew);
      otrosNew = round2(otrosNew);
      totalNew = round2(totalNew);

      if (itemsProvided || payload.subtotal !== undefined) {
        updateData.subtotal = subtotalNew;
      }
      if (payload.iva !== undefined || itemsProvided) {
        updateData.iva = ivaNew;
      }
      if (payload.otrosImpuestos !== undefined || itemsProvided) {
        updateData.otros_impuestos = otrosNew;
      }
      if (payload.total !== undefined || totalNeedsRecalc) {
        updateData.total = totalNew;
      }

      if (payload.notas !== undefined) {
        updateData.notas = payload.notas == null ? null : payload.notas.toString();
      }

      if (payload.metadata !== undefined) {
        updateData.metadata =
          payload.metadata == null
            ? null
            : typeof payload.metadata === 'string'
              ? payload.metadata
              : JSON.stringify(payload.metadata);
      }

      if (payload.estado !== undefined) {
        const estadoValue = payload.estado.toString().trim();
        updateData.estado = estadoValue || existingCompra.estado || 'completada';
      }

      let montoPagadoNew = currentMontoPagado;
      let montoPagadoChanged = false;
      if (payload.montoPagado !== undefined) {
        montoPagadoNew = round2(
          Math.max(0, normalizeNumber(payload.montoPagado, currentMontoPagado))
        );
        montoPagadoChanged = true;
      }

      if (!montoPagadoChanged && totalNeedsRecalc && montoPagadoNew > totalNew) {
        montoPagadoNew = totalNew;
        montoPagadoChanged = true;
      }

      if (montoPagadoNew > totalNew) {
        montoPagadoNew = totalNew;
        montoPagadoChanged = true;
      }

      if (montoPagadoChanged) {
        updateData.monto_pagado = montoPagadoNew;
      }

      if (montoPagadoNew > totalNew + 0.01) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'El monto pagado no puede superar el total de la compra.',
          });
      }

      let estadoPagoNormalized;
      if (payload.estadoPago !== undefined) {
        const estadoPagoValue = payload.estadoPago.toString().trim().toLowerCase();
        estadoPagoNormalized = ['pendiente', 'pagado', 'parcial'].includes(estadoPagoValue)
          ? estadoPagoValue
          : 'pendiente';
        if (estadoPagoNormalized === 'pagado' && totalNew > 0 && montoPagadoNew < totalNew) {
          montoPagadoNew = totalNew;
          updateData.monto_pagado = totalNew;
        }
        updateData.estado_pago = estadoPagoNormalized;
      }

      if (estadoPagoNormalized === undefined && (montoPagadoChanged || totalNeedsRecalc)) {
        let autoEstado = existingCompra.estado_pago || 'pendiente';
        if (totalNew > 0 && Math.abs(totalNew - montoPagadoNew) < 0.01) {
          autoEstado = 'pagado';
        } else if (montoPagadoNew > 0) {
          autoEstado = 'parcial';
        } else {
          autoEstado = 'pendiente';
        }
        if (autoEstado !== (existingCompra.estado_pago || 'pendiente')) {
          updateData.estado_pago = autoEstado;
        }
      }

      if (payload.pdfBase64 !== undefined && payload.pdfNombre !== undefined) {
        if (payload.pdfBase64 && payload.pdfNombre) {
          updateData.pdf_base64 = payload.pdfBase64;
          updateData.pdf_nombre = payload.pdfNombre;
          updateData.pdf_size = payload.pdfSize || 0;
        } else {
          updateData.pdf_base64 = null;
          updateData.pdf_nombre = null;
          updateData.pdf_size = null;
        }
      }

      if (Object.keys(updateData).length === 0 && !itemsProvided) {
        return res.status(400).json({ success: false, message: 'No hay cambios para aplicar.' });
      }

      updateData.updated_at = new Date().toISOString();

      const productosParaLimpiar = new Set();

      const applyUpdates = tenantDb.transaction(() => {
        if (Object.keys(updateData).length) {
          const setClauses = Object.keys(updateData).map((field) => `${field} = @${field}`);
          const updateCompraSql = negocioId
            ? `UPDATE compras SET ${setClauses.join(', ')} WHERE id = @id AND (negocio_id = @negocioId OR negocio_id IS NULL)`
            : `UPDATE compras SET ${setClauses.join(', ')} WHERE id = @id`;

          tenantDb.prepare(updateCompraSql).run({
            ...updateData,
            id,
            negocioId,
          });
        }

        if (itemsProvided) {
          // Primero, revertir el stock de los items anteriores
          const itemsAnteriores = tenantDb
            .prepare(
              `
          SELECT producto_id, cantidad 
          FROM compras_detalle 
          WHERE compra_id = ? AND producto_id IS NOT NULL
        `
            )
            .all(id);

          itemsAnteriores.forEach((itemAnterior) => {
            try {
              if (itemAnterior.producto_id) {
                productosParaLimpiar.add(itemAnterior.producto_id);
              }
              tenantDb
                .prepare(
                  `
              UPDATE productos 
              SET stock = CASE WHEN (stock - @cantidad) < 0 THEN 0 ELSE stock - @cantidad END,
                  updated_at = datetime('now')
            WHERE id = @producto_id
            `
                )
                .run({
                  cantidad: itemAnterior.cantidad,
                  producto_id: itemAnterior.producto_id,
                });
            } catch (error) {
              console.warn(
                `No se pudo revertir stock del producto ${itemAnterior.producto_id}:`,
                error.message
              );
            }
          });

          tenantDb.prepare('DELETE FROM compras_detalle WHERE compra_id = ?').run(id);
          const insertDetalleStmt = tenantDb.prepare(`
          INSERT INTO compras_detalle (
            compra_id, negocio_id, producto_id, producto_nombre, descripcion, unidad,
            cantidad, precio_unitario, total
          )
          VALUES (
            @compra_id, @negocio_id, @producto_id, @producto_nombre, @descripcion, @unidad,
            @cantidad, @precio_unitario, @total
          )
        `);
          sanitizedItems.forEach((item) => {
            insertDetalleStmt.run({
              compra_id: id,
              negocio_id: negocioId,
              producto_id: item.productoId || null,
              producto_nombre: item.productoNombre,
              descripcion: item.descripcion || null,
              unidad: item.unidad || null,
              cantidad: item.cantidad,
              precio_unitario: item.precioUnitario,
              total: item.subtotal,
            });

            // ACTUALIZAR STOCK con los nuevos items
            if (item.productoId) {
              try {
                const precioVentaAplicado =
                  item.precioVenta && item.precioVenta > 0 ? round2(item.precioVenta) : null;

                tenantDb
                  .prepare(
                    `
                UPDATE productos 
                SET stock = CASE WHEN (stock + @cantidad) < 0 THEN 0 ELSE stock + @cantidad END,
                    precio_compra = @precio_compra,
                    precio_venta = CASE WHEN @precio_venta IS NOT NULL THEN @precio_venta ELSE precio_venta END,
                    updated_at = datetime('now')
              WHERE id = @producto_id
              `
                  )
                  .run({
                    cantidad: item.cantidad,
                    precio_compra: item.precioUnitario,
                    precio_venta: precioVentaAplicado,
                    producto_id: item.productoId,
                  });
              } catch (error) {
                console.warn(
                  `No se pudo actualizar stock del producto ${item.productoId}:`,
                  error.message
                );
              }
            }
          });
        }

        return loadCompraWithDetails(tenantDb, id, negocioId);
      });

      const compraActualizada = applyUpdates();

      const productosEliminados = [];
      productosParaLimpiar.forEach((productoId) => {
        const cleanupResult = maybeCleanupProducto(tenantDb, productoId, negocioId);
        if (cleanupResult.deleted) {
          productosEliminados.push(productoId);
        }
      });

      res.json({
        success: true,
        compra: compraActualizada,
        productosCreados: autoCreatedProducts,
        productosEliminados,
      });
    } catch (error) {
      console.error('Error actualizando compra:', error);
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res
          .status(409)
          .json({ success: false, message: 'El número de compra ya está registrado.' });
      } else {
        res.status(500).json({ success: false, message: 'Error al actualizar la compra.' });
      }
    }
  }
);

// Eliminar una compra
app.delete(
  '/api/compras/:id',
  csrfProtection,
  authenticate,
  validateTenantAccess,
  validateResourceOwnership('compra'),
  (req, res) => {
    try {
      const tenantDb = req.db || db;
      const { id } = req.params;
      const negocioId = req.negocioId || null;

      const compraQuery = negocioId
        ? 'SELECT * FROM compras WHERE id = @id AND (negocio_id = @negocioId OR negocio_id IS NULL)'
        : 'SELECT * FROM compras WHERE id = @id';
      const compra = tenantDb.prepare(compraQuery).get({ id, negocioId });
      if (!compra) {
        return res.status(404).json({ success: false, message: 'Compra no encontrada' });
      }

      const productosParaLimpiar = new Set();

      const deleteTransaction = tenantDb.transaction(() => {
        // Primero, revertir el stock de los productos antes de eliminar
        const itemsCompra = tenantDb
          .prepare(
            `
        SELECT producto_id, cantidad 
        FROM compras_detalle 
        WHERE compra_id = ? AND producto_id IS NOT NULL
      `
          )
          .all(id);

        itemsCompra.forEach((item) => {
          try {
            if (item.producto_id) {
              productosParaLimpiar.add(item.producto_id);
            }
            tenantDb
              .prepare(
                `
            UPDATE productos 
            SET stock = CASE WHEN (stock - @cantidad) < 0 THEN 0 ELSE stock - @cantidad END,
                updated_at = datetime('now')
            WHERE id = @producto_id
          `
              )
              .run({
                cantidad: item.cantidad,
                producto_id: item.producto_id,
              });
          } catch (error) {
            console.warn(
              `No se pudo revertir stock del producto ${item.producto_id}:`,
              error.message
            );
          }
        });

        tenantDb.prepare('DELETE FROM compras_detalle WHERE compra_id = ?').run(id);
        const deleteCompraSql = negocioId
          ? 'DELETE FROM compras WHERE id = ? AND (negocio_id = ? OR negocio_id IS NULL)'
          : 'DELETE FROM compras WHERE id = ?';
        if (negocioId) {
          tenantDb.prepare(deleteCompraSql).run(id, negocioId);
        } else {
          tenantDb.prepare(deleteCompraSql).run(id);
        }
      });

      deleteTransaction();

      const productosEliminados = [];
      productosParaLimpiar.forEach((productoId) => {
        const cleanupResult = maybeCleanupProducto(tenantDb, productoId, negocioId);
        if (cleanupResult.deleted) {
          productosEliminados.push(productoId);
        }
      });

      res.json({
        success: true,
        message: 'Compra eliminada correctamente',
        productosEliminados,
      });
    } catch (error) {
      console.error('Error eliminando compra:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar la compra' });
    }
  }
);

// Descargar PDF de factura de compra
app.get('/api/compras/:id/pdf', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const { id } = req.params;

    const compra = tenantDb
      .prepare('SELECT pdf_base64, pdf_nombre, numero FROM compras WHERE id = ?')
      .get(id);

    if (!compra) {
      return res.status(404).json({ success: false, message: 'Compra no encontrada' });
    }

    if (!compra.pdf_base64) {
      return res
        .status(404)
        .json({ success: false, message: 'Esta compra no tiene factura PDF adjunta' });
    }

    // Extraer el contenido Base64 (remover data:application/pdf;base64, si existe)
    const base64Data = compra.pdf_base64.replace(/^data:application\/pdf;base64,/, '');
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${compra.pdf_nombre || `Factura_${compra.numero}.pdf`}"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error descargando PDF:', error);
    res.status(500).json({ success: false, message: 'Error al descargar el PDF' });
  }
});

// ============================================
// RUTAS DE REPORTES (PROTEGIDAS)
// ============================================
app.get('/api/inventory/insights', authenticate, validateTenantAccess, async (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;

    if (!tenantDb || !negocioId) {
      return res.status(400).json({ success: false, message: 'Negocio no especificado.' });
    }

    const refreshParam = (req.query?.refresh || 'auto').toString().toLowerCase();
    const refreshMode = ['force', 'manual'].includes(refreshParam) ? refreshParam : 'auto';

    const actor =
      req.user?.username ||
      req.user?.correo ||
      req.user?.email ||
      req.user?.id ||
      req.user?.userId ||
      'usuario';

    const { meta, payload } = await getInventoryInsights({
      db: tenantDb,
      negocioId,
      refreshMode,
      forceRefresh: refreshMode === 'force',
      actor,
    });

    res.json({ success: true, meta, payload });
  } catch (error) {
    console.error('Error obteniendo insights de inventario:', error);
    res
      .status(500)
      .json({ success: false, message: 'No se pudo obtener el análisis de inventario.' });
  }
});

app.post(
  '/api/inventory/insights/ack',
  csrfProtection,
  authenticate,
  validateTenantAccess,
  async (req, res) => {
    try {
      const tenantDb = req.db || db;
      const negocioId = req.negocioId;

      if (!tenantDb || !negocioId) {
        return res.status(400).json({ success: false, message: 'Negocio no especificado.' });
      }

      const alertHash = (req.body?.alertHash || '').toString().trim();
      if (!alertHash) {
        return res.status(400).json({ success: false, message: 'alertHash requerido.' });
      }

      const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
      const messages = rawMessages
        .filter((value) => typeof value === 'string' && value.trim())
        .map((value) => value.trim())
        .slice(0, 5);

      const actor =
        req.user?.username ||
        req.user?.correo ||
        req.user?.email ||
        req.user?.id ||
        req.user?.userId ||
        'usuario';

      const result = acknowledgeInventoryAlerts({
        db: tenantDb,
        negocioId,
        alertHash,
        messages,
        actor,
      });

      res.json({ success: true, meta: result });
    } catch (error) {
      console.error('Error confirmando alertas de inventario:', error);
      res
        .status(500)
        .json({ success: false, message: 'No se pudo registrar la notificación de inventario.' });
    }
  }
);

const reportesRouter = require('./routes/reportes');
app.use('/api/reportes', authenticate, validateTenantAccess, reportesRouter);

// Rutas para la integración con el SRI
const sriRoutes = require('./routes/sri');
app.use('/api/sri', authenticate, validateTenantAccess, sriRoutes);

// ============================================
// RUTAS DE SUPER ADMIN (PROTEGIDAS)
// ============================================
const superAdminRouter = require('./routes/super-admin');
app.use('/api/admin', superAdminRouter);

// ============================================
// SERVIR ARCHIVOS ESTÁTICOS (AL FINAL)
// ============================================
// IMPORTANTE: express.static debe estar DESPUÉS de todas las rutas API
// para evitar que interfiera con los endpoints
app.use(
  express.static(path.join(__dirname, '..'), {
    setHeaders: (res, filePath) => {
      // Configurar MIME types correctos
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
      }
    },
  })
);

// ============================================
// RUTA PROTEGIDA PARA UPLOADS
// ============================================
// Servir archivos de uploads solo con autenticación y validación de tenant
app.get('/uploads/:negocioId/:tipo/:filename', authenticate, (req, res) => {
  try {
    const { tipo, filename } = req.params;
    const negocioId = sanitizeNegocioFolderName(req.params.negocioId);

    // Validar que el usuario tenga acceso al negocio
    const userNegocios = getUserNegocios(getMasterDB(), req.user.userId);
    const hasAccess =
      userNegocios.some((n) => n.id === negocioId) || req.user.rol === ROLE_SUPER_ADMIN;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'No tienes acceso a los archivos de este negocio',
        code: 'FORBIDDEN_ACCESS',
      });
    }

    // Validar tipo de archivo permitido
    const allowedTypes = ['invoices', 'vehiculos', 'perfiles'];
    if (!allowedTypes.includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de archivo no válido',
        code: 'INVALID_FILE_TYPE',
      });
    }

    // Sanitizar filename para prevenir path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(__dirname, 'uploads', negocioId, tipo, safeFilename);

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado',
        code: 'FILE_NOT_FOUND',
      });
    }

    // Servir el archivo
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error sirviendo archivo de uploads:', error);
    res.status(500).json({
      success: false,
      message: 'Error al acceder al archivo',
      code: 'SERVER_ERROR',
    });
  }
});

// ============================================================================
// ENDPOINTS: PRODUCTOS PARA POS
// ============================================================================

/**
 * GET /api/productos
 * Obtiene todos los productos activos con stock disponible
 */
app.get('/api/productos', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db;
    const negocioId = req.negocioId;

    if (!tenantDb) {
      return res.status(500).json({
        success: false,
        message: 'Base de datos no disponible',
      });
    }

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: 'ID de negocio requerido',
      });
    }

    const rows = tenantDb
      .prepare(
        `
      SELECT 
        p.id,
        p.codigo,
        p.nombre,
        p.descripcion,
        p.precio_compra AS precioCompra,
        p.precio_venta AS precioVenta,
        p.stock,
        p.stock_minimo AS stockMinimo,
        p.imagen,
        COALESCE(p.activo, 1) AS activo,
        COALESCE(cat.nombre, 'Sin categoría') AS categoria
      FROM productos p
      LEFT JOIN categorias cat ON cat.id = p.categoria_id
      WHERE p.negocio_id = ?
      ORDER BY p.nombre COLLATE NOCASE ASC
    `
      )
      .all(negocioId);

    const productos = rows.map((row) => ({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion,
      categoria: row.categoria,
      stock: row.stock,
      stockMinimo: row.stockMinimo,
      precioCompra: row.precioCompra,
      precioVenta: row.precioVenta,
      iva: row.iva ?? 0.15,
      imagen: row.imagen,
      activo: row.activo === 1,
    }));

    res.set('X-Total-Count', productos.length.toString());

    const envelopeParam = ['envelope', 'format', 'meta']
      .map((key) => {
        const value = req.query && req.query[key];
        return value != null ? String(value).trim().toLowerCase() : null;
      })
      .find((value) => value);

    const wantsEnvelope =
      Boolean(envelopeParam) && !['0', 'false', 'array', 'list', 'compact'].includes(envelopeParam);

    if (wantsEnvelope) {
      return res.json({
        success: true,
        total: productos.length,
        productos,
      });
    }

    res.json(productos);
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos',
      error: error.message,
    });
  }
});

/**
 * GET /api/clientes
 * Obtiene todos los clientes activos
 */
app.get('/api/pos/clientes', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db;

    if (!tenantDb) {
      return res.status(500).json({
        success: false,
        message: 'Base de datos no disponible',
      });
    }

    const rows = tenantDb
      .prepare(
        `
      SELECT 
        id,
        nombre,
        cedula,
        telefono,
        email,
        direccion,
        categoria,
        activo
      FROM clientes
      WHERE activo = 1
      ORDER BY nombre COLLATE NOCASE ASC
    `
      )
      .all();

    const clientes = rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      telefono: row.telefono,
      email: row.email,
      direccion: row.direccion,
      documento: row.cedula,
      categoria: row.categoria,
      activo: row.activo === 1,
    }));

    res.json({
      success: true,
      clientes,
      total: clientes.length,
    });
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clientes',
      error: error.message,
    });
  }
});

// ============================================================================
// ENDPOINTS: HISTORIAL DE VENTAS Y ANÁLISIS DE PRODUCTOS
// Sistema completo de trazabilidad y análisis financiero
// ============================================================================

/**
 * POST /api/ventas
 * Crea una nueva venta con su detalle y actualiza el stock de productos
 */
app.post('/api/ventas', authenticate, validateTenantAccess, (req, res) => {
  const tenantDb = req.db || db;
  const negocioId = req.negocioId;

  if (!negocioId) {
    return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
  }

  const { cliente_id, items, subtotal, iva, descuento, total, metodo_pago, estado, notas } =
    req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Debe incluir al menos un producto.' });
  }

  if (total === undefined || total <= 0) {
    return res.status(400).json({ success: false, message: 'El total debe ser mayor a 0.' });
  }

  const ventaId = `venta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // USAR FECHA/HORA DEL SERVIDOR (ANTI-FRAUDE) - Zona horaria Ecuador UTC-5
  const ahora = new Date();
  // Ajustar a hora de Ecuador (UTC-5)
  const ecuadorOffset = -5 * 60; // minutos
  const utcOffset = ahora.getTimezoneOffset(); // minutos desde UTC
  const ecuadorTime = new Date(ahora.getTime() + (utcOffset + ecuadorOffset) * 60000);
  
  const year = ecuadorTime.getFullYear();
  const month = String(ecuadorTime.getMonth() + 1).padStart(2, '0');
  const day = String(ecuadorTime.getDate()).padStart(2, '0');
  const hours = String(ecuadorTime.getHours()).padStart(2, '0');
  const minutes = String(ecuadorTime.getMinutes()).padStart(2, '0');
  const seconds = String(ecuadorTime.getSeconds()).padStart(2, '0');
  
  const fecha = `${year}-${month}-${day}`;
  const hora = `${hours}:${minutes}:${seconds}`;

  // Generar número de venta secuencial
  const ultimaVenta = tenantDb
    .prepare(
      `
    SELECT numero FROM ventas 
    WHERE negocio_id = ? 
    ORDER BY numero DESC LIMIT 1
  `
    )
    .get(negocioId);

  let numeroVenta = 1;
  if (ultimaVenta && ultimaVenta.numero) {
    const match = ultimaVenta.numero.match(/\d+$/);
    if (match) {
      numeroVenta = parseInt(match[0]) + 1;
    }
  }
  const numero = `VEN-${numeroVenta.toString().padStart(6, '0')}`;

  try {
    tenantDb.exec('BEGIN TRANSACTION');

    // Obtener nombre del cliente si existe
    let clienteNombre = null;
    if (cliente_id) {
      const cliente = tenantDb.prepare('SELECT nombre FROM clientes WHERE id = ?').get(cliente_id);
      if (cliente) clienteNombre = cliente.nombre;
    }

    // Insertar venta
    const insertVenta = tenantDb.prepare(`
      INSERT INTO ventas (
        id, negocio_id, numero, fecha, hora, cliente_id, cliente_nombre,
        subtotal, iva, descuento, total, metodo_pago, estado, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertVenta.run(
      ventaId,
      negocioId,
      numero,
      fecha,
      hora,
      cliente_id || null,
      clienteNombre,
      subtotal || 0,
      iva || 0,
      descuento || 0,
      total,
      metodo_pago || 'efectivo',
      estado || 'completada',
      notas || null
    );

    // Insertar detalle de venta y actualizar stock
    const insertDetalle = tenantDb.prepare(`
      INSERT INTO ventas_detalle (
        negocio_id, venta_id, producto_id, producto_nombre, cantidad, precio_unitario, total
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStock = tenantDb.prepare(`
      UPDATE productos 
      SET stock = stock - ?,
          updated_at = datetime('now')
      WHERE id = ? AND negocio_id = ?
    `);

    const insertHistorial = tenantDb.prepare(`
      INSERT INTO historial_productos (
        id, negocio_id, producto_id, producto_nombre, tipo_movimiento,
        cantidad, stock_anterior, stock_nuevo, precio, total,
        referencia_id, usuario_id, fecha, hora
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      if (!item.producto_id || !item.cantidad || !item.precio_unitario) {
        throw new Error('Cada item debe tener producto_id, cantidad y precio_unitario.');
      }

      // Verificar stock disponible
      const producto = tenantDb
        .prepare('SELECT stock, nombre FROM productos WHERE id = ? AND negocio_id = ?')
        .get(item.producto_id, negocioId);

      if (!producto) {
        throw new Error(`Producto ${item.producto_id} no encontrado.`);
      }

      if (producto.stock < item.cantidad) {
        throw new Error(
          `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}`
        );
      }

      // Insertar detalle
      insertDetalle.run(
        negocioId,
        ventaId,
        item.producto_id,
        item.producto_nombre || producto.nombre,
        item.cantidad,
        item.precio_unitario,
        item.total || item.cantidad * item.precio_unitario
      );

      // Actualizar stock
      const stockAnterior = producto.stock;
      updateStock.run(item.cantidad, item.producto_id, negocioId);
      const stockNuevo = stockAnterior - item.cantidad;

      // Registrar en historial
      const historialId = `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      insertHistorial.run(
        historialId,
        negocioId,
        item.producto_id,
        item.producto_nombre || producto.nombre,
        'venta',
        item.cantidad,
        stockAnterior,
        stockNuevo,
        item.precio_unitario,
        item.total || item.cantidad * item.precio_unitario,
        ventaId,
        req.user?.id || null,
        fecha,
        hora
      );
    }

    // Actualizar tabla de productos más vendidos
    const updateMasVendidos = tenantDb.prepare(`
      INSERT OR REPLACE INTO productos_mas_vendidos (
        id, negocio_id, producto_id, producto_nombre, producto_codigo,
        total_vendido, total_ingresos, ultima_venta, stock_actual,
        proveedor_id, proveedor_nombre, updated_at
      )
      SELECT 
        'pv-' || p.id,
        p.negocio_id,
        p.id,
        p.nombre,
        p.codigo,
        COALESCE((SELECT total_vendido FROM productos_mas_vendidos WHERE producto_id = p.id), 0) + ?,
        COALESCE((SELECT total_ingresos FROM productos_mas_vendidos WHERE producto_id = p.id), 0) + ?,
        ?,
        p.stock,
        p.proveedor_id,
        pr.nombre,
        datetime('now')
      FROM productos p
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      WHERE p.id = ?
    `);

    for (const item of items) {
      updateMasVendidos.run(
        item.cantidad,
        item.total || item.cantidad * item.precio_unitario,
        fecha,
        item.producto_id
      );
    }

    tenantDb.exec('COMMIT');

    res.json({
      success: true,
      message: 'Venta creada exitosamente',
      id: ventaId,
      numero: numero,
    });
  } catch (error) {
    tenantDb.exec('ROLLBACK');
    console.error('Error al crear venta:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al procesar la venta',
    });
  }
});

/**
 * GET /api/ventas/:id
 * Obtiene el detalle completo de una venta específica
 */
app.get('/api/ventas/:id', authenticate, validateTenantAccess, (req, res) => {
  const tenantDb = req.db || db;
  const negocioId = req.negocioId;
  const { id } = req.params;

  if (!negocioId || !id) {
    return res.status(400).json({ success: false, message: 'Parámetros inválidos.' });
  }

  try {
    // Obtener venta
    const venta = tenantDb
      .prepare(
        `
      SELECT * FROM ventas 
      WHERE id = ? AND negocio_id = ?
    `
      )
      .get(id, negocioId);

    if (!venta) {
      return res.status(404).json({ success: false, message: 'Venta no encontrada.' });
    }

    // Obtener items
    const items = tenantDb
      .prepare(
        `
      SELECT * FROM ventas_detalle 
      WHERE venta_id = ? AND negocio_id = ?
    `
      )
      .all(id, negocioId);

    venta.items = items;

    res.json(venta);
  } catch (error) {
    console.error('Error al obtener venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la venta',
    });
  }
});

/**
 * GET /api/ventas
 * Obtiene todas las ventas del negocio (para el dashboard y reportes)
 * Retorna ventas con sus items incluidos
 */
app.get('/api/ventas', authenticate, validateTenantAccess, (req, res) => {
  const tenantDb = req.db || db;
  const negocioId = req.negocioId;

  if (!negocioId) {
    return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
  }

  try {
    const { limite = 100, estado, fechaDesde, fechaHasta } = req.query;

    // Query base para ventas
    let query = `
      SELECT 
        id,
        numero,
        fecha,
        hora,
        cliente_id,
        cliente_nombre,
        subtotal,
        iva,
        descuento,
        total,
        metodo_pago,
        estado,
        notas
      FROM ventas
      WHERE negocio_id = ?
    `;

    const params = [negocioId];

    // Filtros opcionales
    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }

    if (fechaDesde) {
      query += ' AND fecha >= ?';
      params.push(fechaDesde);
    }

    if (fechaHasta) {
      query += ' AND fecha <= ?';
      params.push(fechaHasta);
    }

    query += ' ORDER BY fecha DESC, hora DESC LIMIT ?';
    params.push(parseInt(limite));

    const ventas = tenantDb.prepare(query).all(...params);

    // Obtener items para cada venta
    const ventasConItems = ventas.map((venta) => {
      const items = tenantDb
        .prepare(
          `
        SELECT 
          id,
          producto_id as productoId,
          producto_nombre as producto,
          cantidad,
          precio_unitario,
          total
        FROM ventas_detalle
        WHERE venta_id = ? AND negocio_id = ?
      `
        )
        .all(venta.id, negocioId);

      return {
        ...venta,
        items: items || [],
      };
    });

    res.json(ventasConItems);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las ventas',
    });
  }
});

/**
 * GET /api/dashboard/stats
 * Obtiene estadísticas generales para el dashboard
 */
app.get('/api/dashboard/stats', authenticate, validateTenantAccess, (req, res) => {
  const tenantDb = req.db || db;
  const negocioId = req.negocioId;

  if (!negocioId) {
    return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
  }

  try {
    const hoy = new Date().toISOString().split('T')[0];
    const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Calcular inicio de semana (Domingo = 0)
    const fechaActual = new Date();
    const diaSemana = fechaActual.getDay();
    const inicioSemana = new Date(fechaActual);
    inicioSemana.setDate(fechaActual.getDate() - diaSemana);
    const semanaStr = inicioSemana.toISOString().split('T')[0];

    const inicioSemanaAnterior = new Date(inicioSemana);
    inicioSemanaAnterior.setDate(inicioSemana.getDate() - 7);
    const semanaAnteriorStr = inicioSemanaAnterior.toISOString().split('T')[0];

    // Inicio de mes
    const inicioMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const inicioMesAnterior = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1)
      .toISOString()
      .split('T')[0];
    const finMesAnterior = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 0)
      .toISOString()
      .split('T')[0];

    // Ventas de hoy
    const ventasHoy = tenantDb
      .prepare(
        `
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as cantidad
      FROM ventas
      WHERE negocio_id = ? AND fecha = ? AND estado = 'completada'
    `
      )
      .get(negocioId, hoy);

    // Ventas de ayer
    const ventasAyer = tenantDb
      .prepare(
        `
      SELECT COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE negocio_id = ? AND fecha = ? AND estado = 'completada'
    `
      )
      .get(negocioId, ayer);

    // Ventas de esta semana
    const ventasSemana = tenantDb
      .prepare(
        `
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as cantidad
      FROM ventas
      WHERE negocio_id = ? AND fecha >= ? AND estado = 'completada'
    `
      )
      .get(negocioId, semanaStr);

    // Ventas semana anterior
    const ventasSemanaAnterior = tenantDb
      .prepare(
        `
      SELECT COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE negocio_id = ? AND fecha >= ? AND fecha < ? AND estado = 'completada'
    `
      )
      .get(negocioId, semanaAnteriorStr, semanaStr);

    // Ventas de este mes
    const ventasMes = tenantDb
      .prepare(
        `
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as cantidad
      FROM ventas
      WHERE negocio_id = ? AND fecha >= ? AND estado = 'completada'
    `
      )
      .get(negocioId, inicioMes);

    // Ventas mes anterior
    const ventasMesAnterior = tenantDb
      .prepare(
        `
      SELECT COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE negocio_id = ? AND fecha >= ? AND fecha <= ? AND estado = 'completada'
    `
      )
      .get(negocioId, inicioMesAnterior, finMesAnterior);

    // Estadísticas de productos
    const totalProductos = tenantDb
      .prepare(
        `
      SELECT COUNT(*) as total
      FROM productos
      WHERE negocio_id = ?
    `
      )
      .get(negocioId);

    const productosStockBajo = tenantDb
      .prepare(
        `
      SELECT COUNT(*) as total
      FROM productos
      WHERE negocio_id = ? AND stock <= stock_minimo
    `
      )
      .get(negocioId);

    // Estadísticas de clientes
    const totalClientes = tenantDb
      .prepare(
        `
      SELECT COUNT(*) as total
      FROM clientes
      WHERE negocio_id = ?
    `
      )
      .get(negocioId);

    // Top 10 productos más vendidos
    const topProductos = tenantDb
      .prepare(
        `
      SELECT 
        vd.producto_id,
        vd.producto_nombre,
        SUM(vd.cantidad) as cantidad_vendida,
        SUM(vd.total) as total_ventas
      FROM ventas_detalle vd
      INNER JOIN ventas v ON vd.venta_id = v.id
      WHERE vd.negocio_id = ? AND v.estado = 'completada'
      GROUP BY vd.producto_id, vd.producto_nombre
      ORDER BY cantidad_vendida DESC
      LIMIT 10
    `
      )
      .all(negocioId);

    // Ventas por categoría
    const ventasPorCategoria = tenantDb
      .prepare(
        `
      SELECT 
        p.categoria_id,
        c.nombre as categoria_nombre,
        SUM(vd.total) as total_ventas
      FROM ventas_detalle vd
      INNER JOIN ventas v ON vd.venta_id = v.id
      INNER JOIN productos p ON vd.producto_id = p.id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE vd.negocio_id = ? AND v.estado = 'completada'
      GROUP BY p.categoria_id, c.nombre
      ORDER BY total_ventas DESC
    `
      )
      .all(negocioId);

    res.json({
      success: true,
      stats: {
        ventasHoy: {
          total: Number(ventasHoy.total),
          cantidad: Number(ventasHoy.cantidad),
        },
        ventasAyer: {
          total: Number(ventasAyer.total),
        },
        ventasSemana: {
          total: Number(ventasSemana.total),
          cantidad: Number(ventasSemana.cantidad),
        },
        ventasSemanaAnterior: {
          total: Number(ventasSemanaAnterior.total),
        },
        ventasMes: {
          total: Number(ventasMes.total),
          cantidad: Number(ventasMes.cantidad),
        },
        ventasMesAnterior: {
          total: Number(ventasMesAnterior.total),
        },
        productos: {
          total: Number(totalProductos.total),
          stockBajo: Number(productosStockBajo.total),
        },
        clientes: {
          total: Number(totalClientes.total),
        },
        topProductos: topProductos.map((p) => ({
          id: p.producto_id,
          nombre: p.producto_nombre,
          cantidadVendida: Number(p.cantidad_vendida),
          totalVentas: Number(p.total_ventas),
        })),
        ventasPorCategoria: ventasPorCategoria.map((c) => ({
          categoriaId: c.categoria_id,
          categoriaNombre: c.categoria_nombre || 'Sin categoría',
          totalVentas: Number(c.total_ventas),
        })),
      },
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
    });
  }
});

/**
 * GET /api/historial-ventas
 * Obtiene el historial completo de ventas
 * Si no hay filtros específicos de producto, devuelve las ventas agrupadas
 * Si hay filtro de producto, devuelve el detalle de ventas de ese producto
 */
app.get('/api/historial-ventas', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;

    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
    }

    const {
      productoId,
      clienteId,
      fechaDesde,
      fechaHasta,
      metodoPago,
      estado,
      search,
      limit = 100,
      offset = 0,
    } = req.query;

    // Si hay filtro de producto específico, devolver detalle de ventas
    if (productoId) {
      let query = `
        SELECT 
          vd.id,
          vd.venta_id,
          vd.producto_id,
          vd.producto_nombre,
          vd.cantidad,
          vd.precio_unitario,
          vd.total,
          v.numero AS venta_numero,
          v.fecha AS fecha_venta,
          v.hora AS hora_venta,
          v.cliente_id,
          v.cliente_nombre,
          v.metodo_pago,
          v.estado,
          p.codigo AS producto_codigo,
          p.precio_compra AS precio_compra_referencia,
          p.stock AS stock_actual
        FROM ventas_detalle vd
        INNER JOIN ventas v ON vd.venta_id = v.id
        LEFT JOIN productos p ON vd.producto_id = p.id
        WHERE vd.negocio_id = ? AND vd.producto_id = ?
      `;

      const params = [negocioId, productoId];

      if (fechaDesde) {
        query += ' AND v.fecha >= ?';
        params.push(fechaDesde);
      }

      if (fechaHasta) {
        query += ' AND v.fecha <= ?';
        params.push(fechaHasta);
      }

      if (clienteId) {
        query += ' AND v.cliente_id = ?';
        params.push(clienteId);
      }

      if (metodoPago) {
        query += ' AND v.metodo_pago = ?';
        params.push(metodoPago);
      }

      if (estado) {
        query += ' AND v.estado = ?';
        params.push(estado);
      }

      query += ' ORDER BY v.fecha DESC, v.hora DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const historial = tenantDb.prepare(query).all(...params);

      const estadisticas = historial.map((item) => {
        const costoTotal = (item.precio_compra_referencia || 0) * item.cantidad;
        const gananciaBruta = item.total - costoTotal;
        const margenPorcentaje = costoTotal > 0 ? (gananciaBruta / costoTotal) * 100 : 0;

        return {
          ...item,
          costo_total: parseFloat(costoTotal.toFixed(2)),
          ganancia_bruta: parseFloat(gananciaBruta.toFixed(2)),
          margen_porcentaje: parseFloat(margenPorcentaje.toFixed(2)),
        };
      });

      return res.json(estadisticas);
    }

    // Sin filtro de producto: devolver listado de ventas completas
    let query = `
      SELECT 
        id,
        numero,
        fecha,
        hora,
        cliente_id,
        cliente_nombre,
        subtotal,
        iva,
        descuento,
        total,
        metodo_pago,
        estado,
        notas
      FROM ventas
      WHERE negocio_id = ?
    `;

    const params = [negocioId];

    if (clienteId) {
      query += ' AND cliente_id = ?';
      params.push(clienteId);
    }

    if (fechaDesde) {
      query += ' AND fecha >= ?';
      params.push(fechaDesde);
    }

    if (fechaHasta) {
      query += ' AND fecha <= ?';
      params.push(fechaHasta);
    }

    if (metodoPago) {
      query += ' AND metodo_pago = ?';
      params.push(metodoPago);
    }

    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }

    if (search) {
      query += ' AND (numero LIKE ? OR cliente_nombre LIKE ? OR id LIKE ?)';
      const likeValue = `%${search}%`;
      params.push(likeValue, likeValue, likeValue);
    }

    query += ' ORDER BY fecha DESC, hora DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const ventas = tenantDb.prepare(query).all(...params);

    res.json(ventas);
  } catch (error) {
    console.error('Error al obtener historial de ventas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el historial de ventas',
    });
  }
});

/**
 * GET /api/historial-ventas/resumen
 * Obtiene indicadores consolidados y contexto estratégico del historial de ventas
 */
app.get('/api/historial-ventas/resumen', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;

    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
    }

    const { fechaDesde, fechaHasta, metodoPago, estado, clienteId } = req.query;

    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    const parseDate = (value) => {
      if (!value) return null;
      const parsed = new Date(`${value}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      return parsed;
    };

    const formatDate = (date) => date.toISOString().split('T')[0];

    let endDate = parseDate(fechaHasta) || new Date();
    let startDate = parseDate(fechaDesde) || new Date(endDate.getTime() - 29 * MS_PER_DAY);

    if (startDate > endDate) {
      const tmp = startDate;
      startDate = endDate;
      endDate = tmp;
    }

    const normalizedDesde = formatDate(startDate);
    const normalizedHasta = formatDate(endDate);
    const periodDays = Math.max(1, Math.round((endDate - startDate) / MS_PER_DAY) + 1);

    const previousEndDate = new Date(startDate.getTime() - MS_PER_DAY);
    const previousStartDate = new Date(previousEndDate.getTime() - (periodDays - 1) * MS_PER_DAY);
    const prevDesde = formatDate(previousStartDate);
    const prevHasta = formatDate(previousEndDate);

    const numeric = (value) => Number(value || 0);
    const roundCurrency = (value) => Number(numeric(value).toFixed(2));

    const buildVentasWhere = (
      alias = '',
      rangeDesde = normalizedDesde,
      rangeHasta = normalizedHasta,
      options = {}
    ) => {
      const { includeEstadoFilter = true, excludeAnuladasByDefault = true } = options;
      const prefix = alias ? `${alias}.` : '';
      const conditions = [`${prefix}negocio_id = ?`];
      const params = [negocioId];

      if (includeEstadoFilter && estado) {
        conditions.push(`${prefix}estado = ?`);
        params.push(estado);
      } else if (excludeAnuladasByDefault) {
        conditions.push(`${prefix}estado != 'anulada'`);
      }

      if (metodoPago) {
        conditions.push(`${prefix}metodo_pago = ?`);
        params.push(metodoPago);
      }

      if (clienteId) {
        conditions.push(`${prefix}cliente_id = ?`);
        params.push(clienteId);
      }

      if (rangeDesde) {
        conditions.push(`${prefix}fecha >= ?`);
        params.push(rangeDesde);
      }

      if (rangeHasta) {
        conditions.push(`${prefix}fecha <= ?`);
        params.push(rangeHasta);
      }

      return { where: conditions.join(' AND '), params };
    };

    const totalesWhere = buildVentasWhere();
    const totalesRow =
      tenantDb
        .prepare(
          `
      SELECT 
        COUNT(*) AS total_ventas,
        SUM(total) AS ingresos_totales,
        SUM(subtotal) AS subtotal_acumulado,
        SUM(iva) AS iva_total,
        SUM(descuento) AS descuento_total,
        MAX(total) AS venta_maxima,
        MIN(total) AS venta_minima,
        COUNT(DISTINCT cliente_id) AS clientes_unicos
      FROM ventas
      WHERE ${totalesWhere.where}
    `
        )
        .get(...totalesWhere.params) || {};

    const totalVentas = numeric(totalesRow.total_ventas);
    const ingresosTotales = roundCurrency(totalesRow.ingresos_totales);
    const subtotalAcumulado = roundCurrency(totalesRow.subtotal_acumulado);
    const ivaTotal = roundCurrency(totalesRow.iva_total);
    const descuentoTotal = roundCurrency(totalesRow.descuento_total);
    const ventaMaxima = roundCurrency(totalesRow.venta_maxima);
    const ventaMinima = roundCurrency(totalesRow.venta_minima);
    const clientesUnicos = numeric(totalesRow.clientes_unicos);
    const ticketPromedio = totalVentas > 0 ? roundCurrency(ingresosTotales / totalVentas) : 0;

    const prevWhere = buildVentasWhere('', prevDesde, prevHasta);
    const prevTotalsRow =
      tenantDb
        .prepare(
          `
      SELECT 
        COUNT(*) AS total_ventas,
        SUM(total) AS ingresos_totales
      FROM ventas
      WHERE ${prevWhere.where}
    `
        )
        .get(...prevWhere.params) || {};

    const prevVentas = numeric(prevTotalsRow.total_ventas);
    const prevIngresos = roundCurrency(prevTotalsRow.ingresos_totales);
    const variacionIngresos =
      prevIngresos === 0
        ? null
        : Number((((ingresosTotales - prevIngresos) / prevIngresos) * 100).toFixed(2));
    const variacionVentas =
      prevVentas === 0
        ? null
        : Number((((totalVentas - prevVentas) / prevVentas) * 100).toFixed(2));

    const ventasDiariasWhere = buildVentasWhere();
    const ventasPorDia = tenantDb
      .prepare(
        `
      SELECT fecha, COUNT(*) AS cantidad, SUM(total) AS total
      FROM ventas
      WHERE ${ventasDiariasWhere.where}
      GROUP BY fecha
      ORDER BY fecha ASC
      LIMIT 120
    `
      )
      .all(...ventasDiariasWhere.params)
      .map((row) => ({
        fecha: row.fecha,
        cantidad: numeric(row.cantidad),
        total: roundCurrency(row.total),
      }));

    const ventasMensualesWhere = buildVentasWhere();
    const ventasPorMes = tenantDb
      .prepare(
        `
      SELECT substr(fecha, 1, 7) AS periodo, COUNT(*) AS cantidad, SUM(total) AS total
      FROM ventas
      WHERE ${ventasMensualesWhere.where}
      GROUP BY substr(fecha, 1, 7)
      ORDER BY periodo ASC
      LIMIT 24
    `
      )
      .all(...ventasMensualesWhere.params)
      .map((row) => ({
        periodo: row.periodo,
        cantidad: numeric(row.cantidad),
        total: roundCurrency(row.total),
      }));

    const metodosWhere = buildVentasWhere();
    const metodosPago = tenantDb
      .prepare(
        `
      SELECT COALESCE(metodo_pago, 'Sin definir') AS metodo, COUNT(*) AS cantidad, SUM(total) AS total
      FROM ventas
      WHERE ${metodosWhere.where}
      GROUP BY metodo
      ORDER BY total DESC
    `
      )
      .all(...metodosWhere.params)
      .map((row) => ({
        metodo: row.metodo || 'Sin definir',
        ventas: numeric(row.cantidad),
        monto: roundCurrency(row.total),
      }));

    const estadosWhere = buildVentasWhere('', normalizedDesde, normalizedHasta, {
      includeEstadoFilter: false,
      excludeAnuladasByDefault: false,
    });
    const estados = tenantDb
      .prepare(
        `
      SELECT estado, COUNT(*) AS cantidad, SUM(total) AS total
      FROM ventas
      WHERE ${estadosWhere.where}
      GROUP BY estado
      ORDER BY total DESC
    `
      )
      .all(...estadosWhere.params)
      .map((row) => ({
        estado: row.estado || 'Sin estado',
        ventas: numeric(row.cantidad),
        monto: roundCurrency(row.total),
      }));

    const ventasDetalleWhere = buildVentasWhere('v');
    const topProductosRows = tenantDb
      .prepare(
        `
      SELECT 
        vd.producto_id,
        vd.producto_nombre,
        SUM(vd.cantidad) AS cantidad_total,
        SUM(vd.total) AS ingresos_totales,
        AVG(vd.precio_unitario) AS precio_promedio,
        MAX(p.stock) AS stock_actual,
        MAX(p.stock_minimo) AS stock_minimo,
        MAX(p.precio_compra) AS precio_compra
      FROM ventas_detalle vd
      INNER JOIN ventas v ON vd.venta_id = v.id
      LEFT JOIN productos p ON vd.producto_id = p.id AND p.negocio_id = v.negocio_id
      WHERE vd.negocio_id = ? AND ${ventasDetalleWhere.where}
      GROUP BY vd.producto_id, vd.producto_nombre
      ORDER BY ingresos_totales DESC
      LIMIT 12
    `
      )
      .all(negocioId, ...ventasDetalleWhere.params);

    const topProductos = topProductosRows.map((row) => {
      const cantidadTotal = numeric(row.cantidad_total);
      const ingresos = roundCurrency(row.ingresos_totales);
      const costoTotal = roundCurrency(numeric(row.precio_compra) * cantidadTotal);
      const ganancia = roundCurrency(ingresos - costoTotal);
      const margen =
        costoTotal > 0
          ? Number(((ganancia / costoTotal) * 100).toFixed(2))
          : ingresos > 0
            ? 100
            : 0;

      return {
        id: row.producto_id,
        nombre: row.producto_nombre,
        cantidad: cantidadTotal,
        ingresos,
        costo: costoTotal,
        ganancia,
        margen,
        stockActual: numeric(row.stock_actual),
        stockMinimo: numeric(row.stock_minimo),
      };
    });

    const categoriasRows = tenantDb
      .prepare(
        `
      SELECT 
        COALESCE(c.nombre, 'Sin categoría') AS categoria,
        SUM(vd.cantidad) AS cantidad_total,
        SUM(vd.total) AS ingresos_totales
      FROM ventas_detalle vd
      INNER JOIN ventas v ON vd.venta_id = v.id
      LEFT JOIN productos p ON vd.producto_id = p.id AND p.negocio_id = v.negocio_id
      LEFT JOIN categorias c ON p.categoria_id = c.id AND c.negocio_id = v.negocio_id
      WHERE vd.negocio_id = ? AND ${ventasDetalleWhere.where}
      GROUP BY categoria
      ORDER BY ingresos_totales DESC
      LIMIT 12
    `
      )
      .all(negocioId, ...ventasDetalleWhere.params);

    const categorias = categoriasRows.map((row) => ({
      categoria: row.categoria || 'Sin categoría',
      cantidad: numeric(row.cantidad_total),
      ingresos: roundCurrency(row.ingresos_totales),
    }));

    let clientesTieneWhatsapp = false;
    try {
      const columnasClientes = tenantDb.prepare('PRAGMA table_info(clientes)').all();
      clientesTieneWhatsapp =
        Array.isArray(columnasClientes) &&
        columnasClientes.some((columna) => columna.name === 'whatsapp');
    } catch (columnError) {
      console.warn('No se pudieron leer las columnas de clientes:', columnError.message);
      clientesTieneWhatsapp = false;
    }

    const selectWhatsappAggregated = clientesTieneWhatsapp
      ? 'MAX(c.whatsapp) AS whatsapp'
      : 'NULL AS whatsapp';
    const selectWhatsappDirect = clientesTieneWhatsapp
      ? 'c.whatsapp AS whatsapp'
      : 'NULL AS whatsapp';

    const topClientesWhere = buildVentasWhere('v');
    const topClientesRows = tenantDb
      .prepare(
        `
      SELECT 
        v.cliente_id,
        COALESCE(v.cliente_nombre, 'Consumidor Final') AS cliente_nombre,
        COUNT(*) AS compras,
        SUM(v.total) AS ingresos_totales,
        AVG(v.total) AS ticket_promedio,
        MAX(v.fecha) AS ultima_compra,
        MAX(c.email) AS email,
        MAX(c.telefono) AS telefono,
        ${selectWhatsappAggregated},
        MAX(c.categoria) AS categoria
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id AND c.negocio_id = v.negocio_id
      WHERE ${topClientesWhere.where}
      GROUP BY v.cliente_id, cliente_nombre
      ORDER BY ingresos_totales DESC
      LIMIT 20
    `
      )
      .all(...topClientesWhere.params);

    const topClientes = topClientesRows.map((row) => ({
      id: row.cliente_id || 'consumidor_final',
      nombre: row.cliente_nombre || 'Consumidor Final',
      compras: numeric(row.compras),
      ingresos: roundCurrency(row.ingresos_totales),
      ticketPromedio: roundCurrency(row.ticket_promedio),
      ultimaCompra: row.ultima_compra || null,
      email: row.email || null,
      telefono: row.telefono || null,
      whatsapp: row.whatsapp || null,
      categoria: row.categoria || null,
    }));

    const clientesFrecuentesRows = tenantDb
      .prepare(
        `
      SELECT 
        v.cliente_id,
        COALESCE(v.cliente_nombre, 'Consumidor Final') AS cliente_nombre,
        COUNT(*) AS compras,
        SUM(v.total) AS ingresos_totales,
        MAX(v.fecha) AS ultima_compra,
        MAX(c.email) AS email,
        MAX(c.telefono) AS telefono,
        ${selectWhatsappAggregated}
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id AND c.negocio_id = v.negocio_id
      WHERE ${topClientesWhere.where} AND v.cliente_id IS NOT NULL
      GROUP BY v.cliente_id, cliente_nombre
      HAVING COUNT(*) >= 3
      ORDER BY ingresos_totales DESC
      LIMIT 20
    `
      )
      .all(...topClientesWhere.params);

    const clientesFrecuentes = clientesFrecuentesRows.map((row) => ({
      id: row.cliente_id,
      nombre: row.cliente_nombre,
      compras: numeric(row.compras),
      ingresos: roundCurrency(row.ingresos_totales),
      ultimaCompra: row.ultima_compra,
      email: row.email || null,
      telefono: row.telefono || null,
      whatsapp: row.whatsapp || null,
    }));

    const clientesInactivos = tenantDb
      .prepare(
        `
      SELECT 
        c.id,
        c.nombre,
        c.email,
        c.telefono,
        ${selectWhatsappDirect},
        c.categoria,
        MAX(v.fecha) AS ultima_compra
      FROM clientes c
      LEFT JOIN ventas v ON v.cliente_id = c.id AND v.negocio_id = c.negocio_id
      WHERE c.negocio_id = ?
      GROUP BY c.id
      HAVING ultima_compra IS NULL OR ultima_compra < date('now', '-60 day')
      ORDER BY (ultima_compra IS NULL) DESC, ultima_compra ASC
      LIMIT 20
    `
      )
      .all(negocioId)
      .map((row) => ({
        id: row.id,
        nombre: row.nombre,
        ultimaCompra: row.ultima_compra,
        email: row.email || null,
        telefono: row.telefono || null,
        whatsapp: row.whatsapp || null,
        categoria: row.categoria || null,
      }));

    const productosBajoStock = tenantDb
      .prepare(
        `
      SELECT 
        p.id,
        p.nombre,
        p.stock,
        p.stock_minimo,
        COALESCE(SUM(vd.cantidad), 0) AS vendidos_30_dias
      FROM productos p
      LEFT JOIN ventas_detalle vd ON vd.producto_id = p.id AND vd.negocio_id = p.negocio_id
      LEFT JOIN ventas v ON vd.venta_id = v.id AND v.negocio_id = p.negocio_id AND v.estado != 'anulada' AND v.fecha >= date('now', '-30 day')
      WHERE p.negocio_id = ? AND p.stock <= p.stock_minimo
      GROUP BY p.id, p.nombre, p.stock, p.stock_minimo
      ORDER BY vendidos_30_dias DESC
      LIMIT 12
    `
      )
      .all(negocioId)
      .map((row) => ({
        id: row.id,
        nombre: row.nombre,
        stockActual: numeric(row.stock),
        stockMinimo: numeric(row.stock_minimo),
        vendidosUltimos30Dias: numeric(row.vendidos_30_dias),
      }));

    const tableExists = (tableName) =>
      tenantDb
        .prepare(
          `
      SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?
    `
        )
        .get(tableName);

    const porCobrar = {
      total: 0,
      documentos: 0,
      vencidos: 0,
    };

    if (tableExists('cuentas_por_cobrar')) {
      const row =
        tenantDb
          .prepare(
            `
        SELECT 
          SUM(monto - monto_pagado) AS saldo,
          COUNT(*) AS documentos,
          SUM(CASE WHEN fecha_vencimiento IS NOT NULL AND fecha_vencimiento < date('now') AND estado IN ('pendiente','parcial') THEN 1 ELSE 0 END) AS vencidos
        FROM cuentas_por_cobrar
        WHERE negocio_id = ? AND estado IN ('pendiente','parcial')
      `
          )
          .get(negocioId) || {};
      porCobrar.total = roundCurrency(row.saldo);
      porCobrar.documentos = numeric(row.documentos);
      porCobrar.vencidos = numeric(row.vencidos);
    }

    const porPagar = {
      total: 0,
      documentos: 0,
      vencidos: 0,
    };

    if (tableExists('cuentas_por_pagar')) {
      const row =
        tenantDb
          .prepare(
            `
        SELECT 
          SUM(monto - monto_pagado) AS saldo,
          COUNT(*) AS documentos,
          SUM(CASE WHEN fecha_vencimiento IS NOT NULL AND fecha_vencimiento < date('now') AND estado IN ('pendiente','parcial') THEN 1 ELSE 0 END) AS vencidos
        FROM cuentas_por_pagar
        WHERE negocio_id = ? AND estado IN ('pendiente','parcial')
      `
          )
          .get(negocioId) || {};
      porPagar.total = roundCurrency(row.saldo);
      porPagar.documentos = numeric(row.documentos);
      porPagar.vencidos = numeric(row.vencidos);
    }

    const buildComprasWhere = (rangeDesde = normalizedDesde, rangeHasta = normalizedHasta) => {
      const conditions = ['negocio_id = ?'];
      const params = [negocioId];

      if (rangeDesde) {
        conditions.push('fecha >= ?');
        params.push(rangeDesde);
      }

      if (rangeHasta) {
        conditions.push('fecha <= ?');
        params.push(rangeHasta);
      }

      return { where: conditions.join(' AND '), params };
    };

    const comprasWhere = buildComprasWhere();
    const comprasRow =
      tenantDb
        .prepare(
          `
      SELECT COUNT(*) AS total_compras, SUM(total) AS total
      FROM compras
      WHERE ${comprasWhere.where}
    `
        )
        .get(...comprasWhere.params) || {};

    const egresosCompras = roundCurrency(comprasRow.total);
    const flujoCaja = {
      ingresos: ingresosTotales,
      egresos: egresosCompras,
      balance: roundCurrency(ingresosTotales - egresosCompras),
      totalCompras: numeric(comprasRow.total_compras),
    };

    const campanasSugeridas = [];

    if (clientesFrecuentes.length > 0) {
      campanasSugeridas.push({
        titulo: 'Programa de fidelización',
        descripcion:
          'Ofrece un beneficio exclusivo a tus clientes frecuentes para mantener su recurrencia.',
        audiencia: clientesFrecuentes.length,
        prioridad: 'alta',
      });
    }

    if (clientesInactivos.length > 0) {
      campanasSugeridas.push({
        titulo: 'Recuperación de clientes inactivos',
        descripcion: `Envía una campaña personalizada a ${clientesInactivos.length} clientes que no compran hace más de 60 días.`,
        audiencia: clientesInactivos.length,
        prioridad: 'media',
      });
    }

    if (topProductos.length > 0) {
      campanasSugeridas.push({
        titulo: `Impulsa ${topProductos[0].nombre}`,
        descripcion:
          'Promociona tu producto estrella con anuncios segmentados y paquetes especiales.',
        audiencia: null,
        prioridad: 'media',
      });
    }

    const alertasIA = [];

    if (porCobrar.total > 0) {
      alertasIA.push({
        tipo: 'warning',
        mensaje: `Existen ${porCobrar.documentos} documentos por cobrar con un saldo pendiente de ${porCobrar.total}.`,
      });
    }

    if (porPagar.total > 0) {
      alertasIA.push({
        tipo: 'info',
        mensaje: `Tienes ${porPagar.documentos} cuentas por pagar registradas por ${porPagar.total}.`,
      });
    }

    if (productosBajoStock.length > 0) {
      alertasIA.push({
        tipo: 'danger',
        mensaje: `${productosBajoStock.length} productos vendidos recientemente están con stock crítico.`,
      });
    }

    if (variacionIngresos !== null && variacionIngresos < -5) {
      alertasIA.push({
        tipo: 'danger',
        mensaje: `Los ingresos cayeron ${Math.abs(variacionIngresos)}% frente al periodo anterior.`,
      });
    }

    const accionesIA = [];

    if (porCobrar.total > 0) {
      accionesIA.push({
        titulo: 'Cobranza preventiva',
        impacto: 'alto',
        sugerencia:
          'Programa notificaciones automáticas para recordar pagos pendientes a tus clientes.',
        modulo: 'cuentas',
      });
    }

    if (clientesInactivos.length > 0) {
      accionesIA.push({
        titulo: 'Campaña de reactivación',
        impacto: 'medio',
        sugerencia:
          'Diseña una campaña de marketing IA enfocada en clientes que no compran hace 60 días.',
        modulo: 'marketing',
      });
    }

    if (productosBajoStock.length > 0) {
      accionesIA.push({
        titulo: 'Reabastecimiento inteligente',
        impacto: 'alto',
        sugerencia:
          'Coordina compras con proveedores para los productos críticos sin perder ventas.',
        modulo: 'inventario',
      });
    }

    const resumen = {
      periodo: {
        desde: normalizedDesde,
        hasta: normalizedHasta,
        dias: periodDays,
        comparativo: {
          desde: prevDesde,
          hasta: prevHasta,
        },
      },
      totales: {
        ventas: totalVentas,
        ingresos: ingresosTotales,
        subtotal: subtotalAcumulado,
        iva: ivaTotal,
        descuento: descuentoTotal,
        ticketPromedio,
        ventaMaxima,
        ventaMinima,
        clientesUnicos,
        variacionIngresos,
        variacionVentas,
      },
      series: {
        diario: ventasPorDia,
        mensual: ventasPorMes,
      },
      desglose: {
        metodosPago,
        estados,
      },
      top: {
        productos: topProductos,
        clientes: topClientes,
        categorias,
      },
      inventario: {
        criticos: productosBajoStock,
        totalCriticos: productosBajoStock.length,
      },
      finanzas: {
        porCobrar,
        porPagar,
        flujoCaja,
      },
      marketing: {
        clientesFrecuentes,
        clientesInactivos,
        campanasSugeridas,
      },
      ia: {
        alertas: alertasIA,
        acciones: accionesIA,
      },
    };

    res.json({
      success: true,
      data: resumen,
    });
  } catch (error) {
    console.error('Error al consolidar resumen de historial de ventas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el resumen de ventas',
    });
  }
});

/**
 * GET /api/historial-ventas/producto/:id
 * Obtiene estadísticas detalladas de ventas de un producto específico
 */
app.get('/api/historial-ventas/producto/:id', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;
    const productoId = req.params.id;

    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
    }

    const { fechaInicio, fechaFin } = req.query;

    // Obtener información del producto
    const producto = tenantDb
      .prepare(
        `
      SELECT * FROM productos WHERE id = ? AND negocio_id = ?
    `
      )
      .get(productoId, negocioId);

    if (!producto) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    // Construir query con filtros opcionales
    let query = `
      SELECT 
        vd.*,
        v.numero AS venta_numero,
        v.fecha AS fecha_venta,
        v.hora AS hora_venta,
        v.cliente_id,
        v.cliente_nombre,
        v.metodo_pago,
        v.estado
      FROM ventas_detalle vd
      INNER JOIN ventas v ON vd.venta_id = v.id
      WHERE vd.producto_id = ? AND vd.negocio_id = ? AND v.estado = 'completada'
    `;

    const params = [productoId, negocioId];

    if (fechaInicio) {
      query += ' AND v.fecha >= ?';
      params.push(fechaInicio);
    }

    if (fechaFin) {
      query += ' AND v.fecha <= ?';
      params.push(fechaFin);
    }

    query += ' ORDER BY v.fecha DESC, v.hora DESC';

    const ventas = tenantDb.prepare(query).all(...params);

    // Calcular estadísticas
    const totalVentas = ventas.length;
    const cantidadTotal = ventas.reduce((sum, v) => sum + v.cantidad, 0);
    const ingresoTotal = ventas.reduce((sum, v) => sum + v.total, 0);
    const costoTotal = cantidadTotal * producto.precio_compra;
    const gananciaBruta = ingresoTotal - costoTotal;
    const margenPromedio = costoTotal > 0 ? (gananciaBruta / costoTotal) * 100 : 0;

    res.json({
      success: true,
      producto: {
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        stock: producto.stock,
        precio_compra: producto.precio_compra,
        precio_venta: producto.precio_venta,
      },
      estadisticas: {
        total_ventas: totalVentas,
        cantidad_total: cantidadTotal,
        ingreso_total: parseFloat(ingresoTotal.toFixed(2)),
        costo_total: parseFloat(costoTotal.toFixed(2)),
        ganancia_bruta: parseFloat(gananciaBruta.toFixed(2)),
        margen_promedio: parseFloat(margenPromedio.toFixed(2)),
      },
      ventas: ventas,
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del producto.',
    });
  }
});

/**
 * POST /api/recordatorios
 * Crea un recordatorio manual o automático
 */
app.post('/api/recordatorios', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;

    if (!tenantDb) {
      return res.status(500).json({ success: false, message: 'Base de datos no disponible.' });
    }

    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
    }

    const payload = req.body || {};
    const titulo = typeof payload.titulo === 'string' ? payload.titulo.trim() : '';

    if (!titulo) {
      return res
        .status(400)
        .json({ success: false, message: 'El título del recordatorio es obligatorio.' });
    }

    const normalizeTime = (value) => {
      if (typeof value !== 'string') {
        return null;
      }
      const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (!match) {
        return null;
      }
      const hours = Math.min(23, Math.max(0, parseInt(match[1], 10)));
      const minutes = Math.min(59, Math.max(0, parseInt(match[2], 10)));
      const seconds = match[3] ? Math.min(59, Math.max(0, parseInt(match[3], 10))) : 0;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
    };

    const extractInlineTime = (value) => {
      if (typeof value !== 'string') {
        return null;
      }
      const separator = value.includes('T') ? 'T' : value.includes(' ') ? ' ' : null;
      if (!separator) {
        return null;
      }
      return normalizeTime(value.split(separator)[1]);
    };

    const dateCandidates = [
      payload.fecha_recordatorio,
      payload.fecha,
      payload.fechaEntrega,
      payload.fecha_entrega,
      payload.fecha_limite,
      payload.fecha_limite_recordatorio,
    ].filter((value) => typeof value === 'string' && value.trim());

    const parseDateOnly = (value) => {
      if (typeof value !== 'string') {
        return null;
      }
      const trimmed = value.trim();
      const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) {
        return match[1];
      }
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      return null;
    };

    let normalizedDate = null;
    for (const candidate of dateCandidates) {
      normalizedDate = parseDateOnly(candidate);
      if (normalizedDate) {
        break;
      }
    }

    if (!normalizedDate) {
      return res
        .status(400)
        .json({ success: false, message: 'La fecha del recordatorio es obligatoria.' });
    }

    let normalizedTime = normalizeTime(payload.hora || payload.hora_recordatorio || '');
    if (!normalizedTime) {
      for (const candidate of dateCandidates) {
        const inlineTime = extractInlineTime(candidate);
        if (inlineTime) {
          normalizedTime = inlineTime;
          break;
        }
      }
    }

    const fechaRecordatorio = normalizedTime
      ? `${normalizedDate} ${normalizedTime}`
      : normalizedDate;

    const columnInfo = tenantDb.prepare('PRAGMA table_info(recordatorios)').all();
    if (!columnInfo.length) {
      return res.status(500).json({ success: false, message: 'La tabla recordatorios no existe.' });
    }

    const columnNames = new Set(columnInfo.map((col) => col.name));
    const primaryKeyColumn = columnInfo.find((col) => col.pk === 1);
    const usesIntegerPrimaryKey =
      primaryKeyColumn && (primaryKeyColumn.type || '').toUpperCase().includes('INT');

    const recordatorioData = {};
    const assignColumn = (column, value) => {
      if (!columnNames.has(column) || value === undefined) {
        return;
      }
      recordatorioData[column] = value;
    };

    if (primaryKeyColumn && columnNames.has(primaryKeyColumn.name)) {
      let pkValue = payload[primaryKeyColumn.name];
      if ((pkValue === undefined || pkValue === null || pkValue === '') && !usesIntegerPrimaryKey) {
        pkValue = randomUUID();
      }
      if (pkValue !== undefined) {
        recordatorioData[primaryKeyColumn.name] = pkValue;
      }
    }

    const descripcion = typeof payload.descripcion === 'string' ? payload.descripcion.trim() : '';
    const tipo =
      typeof payload.tipo === 'string' && payload.tipo.trim() ? payload.tipo.trim() : 'general';
    const prioridad = typeof payload.prioridad === 'string' ? payload.prioridad.trim() : undefined;
    const recurrente =
      typeof payload.recurrente === 'string' && payload.recurrente.trim()
        ? payload.recurrente.trim()
        : 'ninguno';
    const clienteId = payload.cliente_id ?? payload.clienteId ?? null;
    const vehiculoId = payload.vehiculo_id ?? payload.vehiculoId ?? null;
    const ordenTrabajoId = payload.orden_trabajo_id ?? payload.ordenTrabajoId ?? null;
    const servicioTipo = payload.servicio_tipo ?? payload.servicioTipo ?? null;
    const automatico = payload.automatico ? 1 : 0;
    const completado = payload.completado ? 1 : 0;
    const notificado = payload.notificado ? 1 : 0;
    const icono = typeof payload.icono === 'string' ? payload.icono : null;
    const metadataValue =
      payload.metadata === undefined
        ? undefined
        : typeof payload.metadata === 'string'
          ? payload.metadata
          : JSON.stringify(payload.metadata);
    const nowIso = new Date().toISOString();

    assignColumn('titulo', titulo);
    assignColumn('descripcion', descripcion);
    assignColumn('tipo', tipo);
    assignColumn('fecha_recordatorio', fechaRecordatorio);
    assignColumn('fecha', normalizedDate);
    assignColumn('hora', normalizedTime || null);
    assignColumn('prioridad', prioridad);
    assignColumn('recurrente', recurrente);
    assignColumn('cliente_id', clienteId);
    assignColumn('vehiculo_id', vehiculoId);
    assignColumn('orden_trabajo_id', ordenTrabajoId);
    assignColumn('servicio_tipo', servicioTipo);
    assignColumn('automatico', automatico);
    assignColumn('icono', icono);
    assignColumn('completado', completado);
    assignColumn('notificado', notificado);
    assignColumn('metadata', metadataValue);
    assignColumn('negocio_id', negocioId);
    assignColumn('created_at', nowIso);
    assignColumn('updated_at', nowIso);

    if (!Object.keys(recordatorioData).length) {
      return res
        .status(500)
        .json({ success: false, message: 'No se pudo preparar el registro a guardar.' });
    }

    const columns = Object.keys(recordatorioData);
    const placeholders = columns.map((column) => `@${column}`);

    const insertStatement = tenantDb.prepare(
      `INSERT INTO recordatorios (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`
    );

    const insertResult = insertStatement.run(recordatorioData);

    let insertedRecord = null;
    if (primaryKeyColumn && columnNames.has(primaryKeyColumn.name)) {
      const insertedId = recordatorioData[primaryKeyColumn.name] ?? insertResult.lastInsertRowid;
      insertedRecord = tenantDb
        .prepare(`SELECT * FROM recordatorios WHERE ${primaryKeyColumn.name} = ?`)
        .get(insertedId);
    }

    return res.status(201).json({
      success: true,
      message: 'Recordatorio creado correctamente.',
      recordatorio: insertedRecord || null,
    });
  } catch (error) {
    console.error('Error creando recordatorio:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el recordatorio.',
      error: error.message,
    });
  }
});

/**
 * GET /api/recordatorios
 * Obtiene lista de recordatorios con filtros opcionales
 */
app.get('/api/recordatorios', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;

    if (!tenantDb) {
      return res.status(500).json({ success: false, message: 'Base de datos no disponible.' });
    }

    // Verificar si la tabla existe
    const tableInfo = tenantDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='recordatorios'")
      .get();
    if (!tableInfo) {
      return res.json({ success: true, data: [], total: 0 });
    }

    const { fecha_hasta, completado, tipo, limite = 50 } = req.query;

    let query = 'SELECT * FROM recordatorios WHERE 1=1';
    const params = {};

    // Filtrar por negocio si está disponible
    if (negocioId) {
      query += ' AND (negocio_id = @negocioId OR negocio_id IS NULL)';
      params.negocioId = negocioId;
    }

    // Filtrar por fecha hasta (recordatorios vencidos)
    if (fecha_hasta) {
      query += ' AND (fecha <= @fecha_hasta OR fecha_recordatorio <= @fecha_hasta)';
      params.fecha_hasta = fecha_hasta;
    }

    // Filtrar por estado completado
    if (completado !== undefined && completado !== '') {
      query += ' AND completado = @completado';
      params.completado = parseInt(completado);
    }

    // Filtrar por tipo
    if (tipo) {
      query += ' AND tipo = @tipo';
      params.tipo = tipo;
    }

    // Ordenar y limitar
    query += ' ORDER BY COALESCE(fecha_recordatorio, fecha) DESC LIMIT @limite';
    params.limite = parseInt(limite) || 50;

    const recordatorios = tenantDb.prepare(query).all(params);

    res.json({
      success: true,
      data: recordatorios,
      total: recordatorios.length,
    });
  } catch (error) {
    console.error('Error obteniendo recordatorios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener recordatorios.',
      error: error.message,
    });
  }
});

/**
 * PATCH /api/recordatorios/:id
 * Actualiza un recordatorio existente
 */
app.patch('/api/recordatorios/:id', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;
    const { id } = req.params;

    if (!tenantDb) {
      return res.status(500).json({ success: false, message: 'Base de datos no disponible.' });
    }

    if (!id) {
      return res.status(400).json({ success: false, message: 'ID de recordatorio requerido.' });
    }

    const payload = req.body || {};
    const updates = [];
    const params = { id };

    // Campos actualizables
    if (payload.titulo !== undefined) {
      updates.push('titulo = @titulo');
      params.titulo = payload.titulo;
    }
    if (payload.descripcion !== undefined) {
      updates.push('descripcion = @descripcion');
      params.descripcion = payload.descripcion;
    }
    if (payload.completado !== undefined) {
      updates.push('completado = @completado');
      params.completado = payload.completado ? 1 : 0;
    }
    if (payload.estado !== undefined) {
      updates.push('completado = @completado');
      params.completado = payload.estado === 'cancelado' || payload.estado === 'completado' ? 1 : 0;
    }
    if (payload.fecha !== undefined) {
      updates.push('fecha = @fecha');
      params.fecha = payload.fecha;
    }
    if (payload.hora !== undefined) {
      updates.push('hora = @hora');
      params.hora = payload.hora;
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar.' });
    }

    updates.push('updated_at = @updated_at');
    params.updated_at = new Date().toISOString();

    let whereClause = 'id = @id';
    if (negocioId) {
      whereClause += ' AND (negocio_id = @negocioId OR negocio_id IS NULL)';
      params.negocioId = negocioId;
    }

    const stmt = tenantDb.prepare(
      `UPDATE recordatorios SET ${updates.join(', ')} WHERE ${whereClause}`
    );
    const result = stmt.run(params);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Recordatorio no encontrado.' });
    }

    res.json({ success: true, message: 'Recordatorio actualizado correctamente.' });
  } catch (error) {
    console.error('Error actualizando recordatorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar recordatorio.',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/recordatorios/:id
 * Elimina un recordatorio
 */
app.delete('/api/recordatorios/:id', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;
    const { id } = req.params;

    if (!tenantDb) {
      return res.status(500).json({ success: false, message: 'Base de datos no disponible.' });
    }

    if (!id) {
      return res.status(400).json({ success: false, message: 'ID de recordatorio requerido.' });
    }

    let whereClause = 'id = @id';
    const params = { id };
    if (negocioId) {
      whereClause += ' AND (negocio_id = @negocioId OR negocio_id IS NULL)';
      params.negocioId = negocioId;
    }

    const stmt = tenantDb.prepare(`DELETE FROM recordatorios WHERE ${whereClause}`);
    const result = stmt.run(params);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Recordatorio no encontrado.' });
    }

    res.json({ success: true, message: 'Recordatorio eliminado correctamente.' });
  } catch (error) {
    console.error('Error eliminando recordatorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar recordatorio.',
      error: error.message,
    });
  }
});

/**
 * GET /api/agenda/exportar
 * Exporta la agenda a PDF (genera un archivo descargable)
 */
app.get('/api/agenda/exportar', authenticate, validateTenantAccess, async (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;
    const { fecha_inicio, fecha_fin } = req.query;

    if (!tenantDb) {
      return res.status(500).json({ success: false, message: 'Base de datos no disponible.' });
    }

    if (!fecha_inicio || !fecha_fin) {
      return res
        .status(400)
        .json({ success: false, message: 'Se requieren fecha_inicio y fecha_fin.' });
    }

    // Obtener citas en el rango de fechas
    let citasQuery = `
      SELECT * FROM citas 
      WHERE fecha >= @fecha_inicio AND fecha <= @fecha_fin
    `;
    const params = { fecha_inicio, fecha_fin };

    if (negocioId) {
      citasQuery += ' AND (negocio_id = @negocioId OR negocio_id IS NULL)';
      params.negocioId = negocioId;
    }
    citasQuery += ' ORDER BY fecha ASC, hora ASC';

    // Verificar si la tabla existe
    const tableInfo = tenantDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='citas'")
      .get();

    let citas = [];
    if (tableInfo) {
      try {
        citas = tenantDb.prepare(citasQuery).all(params);
      } catch (queryError) {
        console.warn('No se pudieron obtener citas:', queryError.message);
      }
    }

    // Obtener recordatorios en el rango
    let recordatorios = [];
    const recordatoriosTable = tenantDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='recordatorios'")
      .get();
    if (recordatoriosTable) {
      try {
        let recQuery = `
          SELECT * FROM recordatorios 
          WHERE (fecha >= @fecha_inicio AND fecha <= @fecha_fin)
             OR (fecha_recordatorio >= @fecha_inicio AND fecha_recordatorio <= @fecha_fin)
        `;
        if (negocioId) {
          recQuery += ' AND (negocio_id = @negocioId OR negocio_id IS NULL)';
        }
        recQuery += ' ORDER BY COALESCE(fecha_recordatorio, fecha) ASC';
        recordatorios = tenantDb.prepare(recQuery).all(params);
      } catch (queryError) {
        console.warn('No se pudieron obtener recordatorios:', queryError.message);
      }
    }

    // Obtener entregas programadas (órdenes de trabajo con fecha de entrega)
    let entregas = [];
    const ordenesTable = tenantDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ordenes_trabajo'")
      .get();
    if (ordenesTable) {
      try {
        let entregasQuery = `
          SELECT * FROM ordenes_trabajo 
          WHERE fecha_entrega_estimada >= @fecha_inicio 
            AND fecha_entrega_estimada <= @fecha_fin
            AND estado IN ('finalizado', 'listo_para_entrega')
        `;
        if (negocioId) {
          entregasQuery += ' AND (negocio_id = @negocioId OR negocio_id IS NULL)';
        }
        entregasQuery += ' ORDER BY fecha_entrega_estimada ASC';
        entregas = tenantDb.prepare(entregasQuery).all(params);
      } catch (queryError) {
        console.warn('No se pudieron obtener entregas:', queryError.message);
      }
    }

    // Generar contenido de texto plano como exportación simple
    // (En producción, esto podría usar una librería PDF como pdfkit)
    const lineas = [
      '═══════════════════════════════════════════════════════════',
      '                    AGENDA DEL TALLER',
      `            Período: ${fecha_inicio} a ${fecha_fin}`,
      '═══════════════════════════════════════════════════════════',
      '',
      '── CITAS PROGRAMADAS ──────────────────────────────────────',
    ];

    if (citas.length === 0) {
      lineas.push('  (No hay citas en este período)');
    } else {
      citas.forEach((cita) => {
        lineas.push(
          `  📅 ${cita.fecha} ${cita.hora || ''} - ${cita.cliente_nombre || 'Sin cliente'}`
        );
        lineas.push(
          `     Vehículo: ${cita.vehiculo_placa || 'N/A'} | Servicio: ${cita.tipo_servicio || 'General'}`
        );
        if (cita.descripcion) {
          lineas.push(`     Descripción: ${cita.descripcion}`);
        }
        lineas.push('');
      });
    }

    lineas.push('');
    lineas.push('── ENTREGAS PROGRAMADAS ───────────────────────────────────');

    if (entregas.length === 0) {
      lineas.push('  (No hay entregas en este período)');
    } else {
      entregas.forEach((entrega) => {
        lineas.push(
          `  🚗 ${entrega.fecha_entrega_estimada} - ${entrega.cliente_nombre || 'Sin cliente'}`
        );
        lineas.push(
          `     Vehículo: ${entrega.vehiculo_placa || 'N/A'} | Total: $${entrega.total || 0}`
        );
        lineas.push('');
      });
    }

    lineas.push('');
    lineas.push('── RECORDATORIOS ──────────────────────────────────────────');

    if (recordatorios.length === 0) {
      lineas.push('  (No hay recordatorios en este período)');
    } else {
      recordatorios.forEach((rec) => {
        const estado = rec.completado ? '✓' : '○';
        lineas.push(`  ${estado} ${rec.fecha || rec.fecha_recordatorio} - ${rec.titulo}`);
        if (rec.descripcion) {
          lineas.push(`     ${rec.descripcion}`);
        }
        lineas.push('');
      });
    }

    lineas.push('');
    lineas.push('═══════════════════════════════════════════════════════════');
    lineas.push(`  Generado: ${new Date().toLocaleString('es-EC')}`);
    lineas.push('═══════════════════════════════════════════════════════════');

    const contenido = lineas.join('\n');

    // Enviar como archivo de texto (se puede mejorar a PDF con pdfkit)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=agenda_${fecha_inicio}_${fecha_fin}.txt`
    );
    res.send(contenido);
  } catch (error) {
    console.error('Error exportando agenda:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar agenda.',
      error: error.message,
    });
  }
});

/**
 * GET /api/notificaciones-recordatorios
 * Obtiene notificaciones y recordatorios pendientes
 */
app.get('/api/notificaciones-recordatorios', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;

    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
    }

    const { limit = 10, tipo } = req.query;
    const hoy = new Date().toISOString().split('T')[0];

    // Construir query base
    let query = `
      SELECT 
        id,
        tipo,
        titulo,
        descripcion as mensaje,
        fecha_recordatorio as fecha,
        '' as hora,
        completado,
        CASE 
          WHEN fecha_recordatorio < date('now') THEN 'alta'
          WHEN fecha_recordatorio = date('now') THEN 'media'
          ELSE 'baja'
        END as prioridad,
        fecha_recordatorio as created_at,
        cliente_id,
        vehiculo_id
      FROM recordatorios
      WHERE 1=1
    `;

    const params = [];

    // Filtrar por tipo si se especifica
    if (tipo) {
      query += ' AND tipo = ?';
      params.push(tipo);
    }

    // Ordenar por completado y fecha
    query += ' ORDER BY completado ASC, fecha_recordatorio ASC LIMIT ?';
    params.push(parseInt(limit));

    const recordatorios = tenantDb.prepare(query).all(...params);

    // Contar pendientes
    const pendientes = tenantDb
      .prepare(
        `
      SELECT COUNT(*) as total
      FROM recordatorios
      WHERE completado = 0 AND fecha_recordatorio >= date('now')
    `
      )
      .get();

    res.json({
      success: true,
      recordatorios: recordatorios,
      estadisticas: {
        total: recordatorios.length,
        pendientes: pendientes.total || 0,
      },
    });
  } catch (error) {
    console.error('Error obteniendo recordatorios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener recordatorios.',
    });
  }
});

/**
 * GET /api/productos-mas-vendidos
 * Obtiene los productos más vendidos con análisis de rentabilidad
 */
app.get('/api/productos-mas-vendidos', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;

    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
    }

    const { fechaInicio, fechaFin, limit = 20, orden = 'vendido' } = req.query;

    let query = `
      SELECT 
        vd.producto_id,
        vd.producto_nombre,
        p.codigo AS producto_codigo,
        p.precio_compra,
        p.precio_venta,
        p.stock AS stock_actual,
        COUNT(DISTINCT vd.venta_id) AS numero_ventas,
        SUM(vd.cantidad) AS cantidad_total,
        SUM(vd.total) AS ingresos_totales,
        AVG(vd.precio_unitario) AS precio_promedio
      FROM ventas_detalle vd
      INNER JOIN ventas v ON vd.venta_id = v.id
      LEFT JOIN productos p ON vd.producto_id = p.id
      WHERE vd.negocio_id = ? AND v.estado = 'completada'
    `;

    const params = [negocioId];

    if (fechaInicio) {
      query += ' AND v.fecha >= ?';
      params.push(fechaInicio);
    }

    if (fechaFin) {
      query += ' AND v.fecha <= ?';
      params.push(fechaFin);
    }

    // Determinar ordenamiento
    let ordenClause = 'cantidad_total DESC'; // Por defecto: más vendido
    if (orden === 'ingresos') {
      ordenClause = 'ingresos_totales DESC';
    } else if (orden === 'reciente') {
      ordenClause = 'MAX(v.fecha) DESC';
    }

    query += `
      GROUP BY vd.producto_id, vd.producto_nombre, p.codigo, p.precio_compra, p.precio_venta, p.stock
      ORDER BY ${ordenClause}
      LIMIT ?
    `;
    params.push(parseInt(limit));

    const productos = tenantDb.prepare(query).all(...params);

    // Enriquecer con cálculos de rentabilidad y última venta
    const productosConRentabilidad = productos.map((p) => {
      const costoTotal = (p.precio_compra || 0) * p.cantidad_total;
      const gananciaBruta = p.ingresos_totales - costoTotal;
      const margenPromedio = costoTotal > 0 ? (gananciaBruta / costoTotal) * 100 : 0;

      // Obtener última venta de este producto
      const ultimaVenta = tenantDb
        .prepare(
          `
        SELECT MAX(v.fecha) as ultima_venta
        FROM ventas_detalle vd
        INNER JOIN ventas v ON vd.venta_id = v.id
        WHERE vd.producto_id = ? AND vd.negocio_id = ? AND v.estado = 'completada'
      `
        )
        .get(p.producto_id, negocioId);

      return {
        producto_id: p.producto_id,
        producto_nombre: p.producto_nombre,
        productoNombre: p.producto_nombre, // Alias camelCase
        producto_codigo: p.producto_codigo,
        precio_compra: p.precio_compra,
        precio_venta: p.precio_venta,
        stock_actual: p.stock_actual || 0,
        stockActual: p.stock_actual || 0, // Alias camelCase
        numero_ventas: p.numero_ventas,
        total_vendido: Number(p.cantidad_total || 0),
        totalVendido: Number(p.cantidad_total || 0), // Alias camelCase
        total_ingresos: parseFloat((p.ingresos_totales || 0).toFixed(2)),
        totalIngresos: parseFloat((p.ingresos_totales || 0).toFixed(2)), // Alias camelCase
        costo_total: parseFloat(costoTotal.toFixed(2)),
        ganancia_bruta: parseFloat(gananciaBruta.toFixed(2)),
        margen_promedio: parseFloat(margenPromedio.toFixed(2)),
        precio_promedio: parseFloat((p.precio_promedio || 0).toFixed(2)),
        ultima_venta: ultimaVenta?.ultima_venta || null,
        ultimaVenta: ultimaVenta?.ultima_venta || null, // Alias camelCase
      };
    });

    res.json(productosConRentabilidad);
  } catch (error) {
    console.error('Error obteniendo productos más vendidos:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener productos más vendidos.',
    });
  }
});

/**
 * GET /api/movimientos-stock
 * Obtiene el historial de movimientos de inventario
 */
app.get('/api/movimientos-stock', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;

    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
    }

    const {
      productoId,
      tipoMovimiento,
      fechaInicio,
      fechaFin,
      limit = 100,
      offset = 0,
    } = req.query;

    // Verificar si existe la tabla movimientos_stock
    const tableExists = tenantDb
      .prepare(
        `
      SELECT name FROM sqlite_master WHERE type='table' AND name='movimientos_stock'
    `
      )
      .get();

    if (!tableExists) {
      // Retornar array vacío si la tabla no existe aún
      return res.json({
        success: true,
        movimientos: [],
        total: 0,
        mensaje: 'Tabla de movimientos aún no creada. Ejecute la migración 003.',
      });
    }

    let query = `
      SELECT * FROM movimientos_stock
      WHERE negocio_id = ?
    `;

    const params = [negocioId];

    if (productoId) {
      query += ' AND producto_id = ?';
      params.push(productoId);
    }

    if (tipoMovimiento) {
      query += ' AND tipo_movimiento = ?';
      params.push(tipoMovimiento);
    }

    if (fechaInicio) {
      query += ' AND fecha >= ?';
      params.push(fechaInicio);
    }

    if (fechaFin) {
      query += ' AND fecha <= ?';
      params.push(fechaFin);
    }

    query += ' ORDER BY fecha DESC, hora DESC, id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const movimientos = tenantDb.prepare(query).all(...params);

    res.json({
      success: true,
      movimientos: movimientos,
      total: movimientos.length,
    });
  } catch (error) {
    console.error('Error obteniendo movimientos de stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener movimientos de stock.',
    });
  }
});

/**
 * GET /api/analisis-rentabilidad
 * Obtiene análisis completo de rentabilidad de productos
 */
app.get('/api/analisis-rentabilidad', authenticate, validateTenantAccess, (req, res) => {
  try {
    const tenantDb = req.db || db;
    const negocioId = req.negocioId;

    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'ID de negocio requerido.' });
    }

    const { limit = 50 } = req.query;

    const query = `
      SELECT 
        p.id,
        p.codigo,
        p.nombre,
        p.stock,
        p.stock_minimo,
        p.precio_compra,
        p.precio_venta,
        ((p.precio_venta - p.precio_compra) / NULLIF(p.precio_compra, 0) * 100) AS margen_teorico,
        COALESCE(h.cantidad_vendida, 0) AS cantidad_vendida_total,
        COALESCE(h.ingresos_totales, 0) AS ingresos_totales,
        COALESCE(h.ganancia_real, 0) AS ganancia_real,
        c.nombre AS categoria,
        pr.nombre AS proveedor
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id AND c.negocio_id = p.negocio_id
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id AND pr.negocio_id = p.negocio_id
      LEFT JOIN (
        SELECT
          vd.producto_id,
          SUM(vd.cantidad) AS cantidad_vendida,
          SUM(vd.total) AS ingresos_totales,
          SUM(vd.total - (p2.precio_compra * vd.cantidad)) AS ganancia_real
        FROM ventas_detalle vd
        INNER JOIN ventas v ON vd.venta_id = v.id
        LEFT JOIN productos p2 ON vd.producto_id = p2.id
        WHERE vd.negocio_id = ? AND v.estado = 'completada'
        GROUP BY vd.producto_id
      ) h ON p.id = h.producto_id
      WHERE p.negocio_id = ? AND p.activo = 1
      ORDER BY ganancia_real DESC
      LIMIT ?
    `;

    const productos = tenantDb.prepare(query).all(negocioId, negocioId, parseInt(limit));

    res.json({
      success: true,
      productos: productos.map((p) => ({
        ...p,
        margen_teorico: parseFloat((p.margen_teorico || 0).toFixed(2)),
        ingresos_totales: parseFloat((p.ingresos_totales || 0).toFixed(2)),
        ganancia_real: parseFloat((p.ganancia_real || 0).toFixed(2)),
      })),
    });
  } catch (error) {
    console.error('Error obteniendo análisis de rentabilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener análisis de rentabilidad.',
    });
  }
});

// ============================================================================
// ENDPOINT: EJECUTAR HERRAMIENTAS ADMINISTRATIVAS
// Solo disponible para SUPER_ADMIN
// ============================================================================
app.post('/api/admin/run-tool', authenticate, requireRole(ROLE_SUPER_ADMIN), async (req, res) => {
  try {
    const { script, directory } = req.body;

    if (!script || !directory) {
      return res.status(400).json({
        success: false,
        message: 'Script y directorio son requeridos',
      });
    }

    // Validar directorio permitido
    const allowedDirectories = [
      'herramientas_admin',
      'herramientas_admin/mantenimiento',
      'backend/scripts',
    ];
    if (!allowedDirectories.includes(directory)) {
      return res.status(403).json({
        success: false,
        message: 'Directorio no permitido',
      });
    }

    // Validar script (solo archivos .js)
    if (!script.endsWith('.js')) {
      return res.status(400).json({
        success: false,
        message: 'Solo se permiten scripts JavaScript (.js)',
      });
    }

    const scriptPath = path.join(__dirname, '..', directory, script);

    // Verificar que el archivo existe
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({
        success: false,
        message: 'Script no encontrado',
      });
    }

    const { spawn } = require('child_process');
    const workingDir = path.dirname(scriptPath);
    const scriptFile = path.basename(scriptPath);

    const commandSegments = [
      `Set-Location -Path '${workingDir}'`,
      `Write-Host '▶ Ejecutando ${scriptFile}...'`,
      `node '${scriptFile}'`,
      `Write-Host ''`,
      `Write-Host '✔ Proceso finalizado.'`,
      `Read-Host -Prompt 'Presiona Enter para cerrar...'`,
    ];
    const powershellCommand = commandSegments.join('; ');
    const escapedCommand = powershellCommand.replace(/"/g, '""');
    const startCommand = `start "Herramienta Administrativa" powershell.exe -NoExit -Command "${escapedCommand}"`;

    const child = spawn(startCommand, {
      cwd: workingDir,
      detached: true,
      stdio: 'ignore',
      shell: true,
      windowsHide: false,
    });

    child.unref();

    res.json({
      success: true,
      message: 'Herramienta abierta en PowerShell',
      script: script,
    });
  } catch (error) {
    console.error('Error ejecutando herramienta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al ejecutar la herramienta',
      error: error.message,
    });
  }
});

// ============================================================================
// MANEJADOR DE ERRORES GLOBAL DE EXPRESS
// ============================================================================
app.use((err, req, res, _next) => {
  // Log detallado del error
  console.error('❌ ERROR GLOBAL EXPRESS:');
  console.error('  Path:', req.path);
  console.error('  Method:', req.method);
  console.error('  Error:', err.message);
  console.error('  Stack:', err.stack);

  // Si el error tiene información adicional, mostrarla
  if (err.code) {
    console.error('  Code:', err.code);
  }
  if (err.status) {
    console.error('  Status:', err.status);
  }

  // Respuesta genérica para no exponer detalles internos
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Error interno del servidor'
        : err.message || 'Error interno del servidor',
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// Manejador para rutas no encontradas (debe ir antes de iniciar servidor)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================
const server = app.listen(PORT, async () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
  
  // Crear super admin por defecto si no hay usuarios (para producción)
  await ensureDefaultAdminForProduction();
});

// Configurar timeout del servidor (30 segundos)
server.timeout = 30000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Función para cerrar conexiones de BD
function closeAllConnections() {
  console.log('🔒 Cerrando conexiones de base de datos...');
  try {
    // Cerrar BD de negocios
    for (const [negocioId, db] of dbConnections.entries()) {
      try {
        db.close();
        console.log(`  ✓ Cerrada BD: ${negocioId}`);
      } catch (err) {
        console.error(`  ✗ Error cerrando BD ${negocioId}:`, err.message);
      }
    }
    dbConnections.clear();

    if (notificationHub) {
      try {
        notificationHub.close();
        console.log('  ✓ NotificationHub cerrado');
      } catch (err) {
        console.error('  ✗ Error cerrando NotificationHub:', err.message);
      } finally {
        global.notificationHub = null;
      }
    }

    // Cerrar BD principal
    if (masterDb) {
      masterDb.close();
      console.log('  ✓ Cerrada BD principal');
    }
  } catch (err) {
    console.error('Error cerrando conexiones:', err.message);
  }
}

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n⚠️  Señal ${signal} recibida. Cerrando servidor...`);

  server.close(() => {
    console.log('✓ Servidor HTTP cerrado');
    closeAllConnections();
    console.log('👋 Servidor detenido correctamente');
    process.exit(0);
  });

  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    console.error('⚠️  Forzando cierre del servidor...');
    closeAllConnections();
    process.exit(1);
  }, 10000);
}

// Capturar señales de terminación
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  console.error('Stack:', error.stack);
  // No cerrar el servidor automáticamente, solo loggear
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  console.error('Promesa:', promise);
  // No cerrar el servidor automáticamente, solo loggear
});

console.log('✓ Manejadores de errores globales configurados');
