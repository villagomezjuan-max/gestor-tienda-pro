#!/usr/bin/env node
/**
 * Genera un catálogo técnico unificado combinando los registros de la base SQLite
 * con los datasets locales del proyecto.
 *
 * - Extrae productos, compatibilidades y proveedores desde gestor_tienda.db
 * - Unifica con los registros enriquecidos existentes en docs/catalogo_mecanico.json
 * - Sugiere proveedores ecuatorianos usando data/catalogo_proveedores.json
 * - Escribe el resultado final en data/catalogo_mecanico.json y docs/catalogo_mecanico.json
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

const ROOT = path.resolve(__dirname, '..', '..');
const DB_PATH = path.join(__dirname, '..', 'data', 'gestor_tienda.db');
const EXISTING_DATASETS = [
  path.join(ROOT, 'docs', 'catalogo_mecanico.json'),
  path.join(ROOT, 'data', 'catalogo_mecanico.json'),
];
const PROVIDERS_DATASET = path.join(ROOT, 'data', 'catalogo_proveedores.json');
const OUTPUT_FILES = EXISTING_DATASETS;

const DEFAULT_STATE = 'activo';

function readJsonSafe(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) {
      return Array.isArray(fallback) ? [...fallback] : fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const sanitized = raw.replace(/^\uFEFF/, '').trim();
    if (!sanitized) return Array.isArray(fallback) ? [...fallback] : fallback;
    const parsed = JSON.parse(sanitized);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return Array.isArray(parsed?.items)
      ? parsed.items
      : Array.isArray(fallback)
        ? [...fallback]
        : fallback;
  } catch (error) {
    console.warn(`⚠️  No se pudo leer ${filePath}:`, error.message);
    return Array.isArray(fallback) ? [...fallback] : fallback;
  }
}

function toIsoString(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeText(value) {
  return (value || '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function uniqueArray(values = []) {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    if (value === null || value === undefined) {
      return;
    }
    const key = typeof value === 'string' ? value.toLowerCase() : JSON.stringify(value);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  });
  return result;
}

function mergeObjects(base = {}, incoming = {}) {
  const result = { ...base };
  Object.entries(incoming || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }
    if (!result[key] || `${result[key]}`.length < `${value}`.length) {
      result[key] = value;
    }
  });
  return result;
}

function buildProviderCatalog() {
  const raw = readJsonSafe(PROVIDERS_DATASET, { proveedores: [] });
  const proveedoresRaw = Array.isArray(raw?.proveedores) ? raw.proveedores : [];

  const providersById = new Map();
  const providersByCategory = new Map();

  proveedoresRaw.forEach((item) => {
    const id = item.id || item.nombre || `prov-${Math.random().toString(36).slice(2, 8)}`;
    const telefono = Array.isArray(item.telefonos)
      ? item.telefonos.find(Boolean) || ''
      : item.telefonos || '';
    const email = Array.isArray(item.emails) ? item.emails.find(Boolean) || '' : item.emails || '';
    const ubicacionPartes = [item.ciudad, item.provincia, item.pais].filter(Boolean);
    const ubicacion = ubicacionPartes.length
      ? `${ubicacionPartes.join(', ')}`
      : item.direccion || 'Ecuador';
    const notas = Array.isArray(item.notas) ? item.notas.join(' | ') : item.notas || '';
    const disponibilidad = item.diasEntrega ? `Entrega estimada ${item.diasEntrega} día(s)` : '';

    const provider = {
      id,
      nombre: item.nombre || id,
      contacto: item.contacto || '',
      telefono: telefono || '',
      email: email || '',
      ubicacion: ubicacion || 'Ecuador',
      disponibilidad,
      notas: notas || '',
    };

    providersById.set(id, provider);

    const categorias = Array.isArray(item.categorias) ? item.categorias : [];
    categorias.forEach((categoriaId) => {
      if (!providersByCategory.has(categoriaId)) {
        providersByCategory.set(categoriaId, new Set());
      }
      providersByCategory.get(categoriaId).add(id);
    });
  });

  return {
    providersById,
    providersByCategory,
  };
}

const CATEGORY_KEYWORDS = [
  {
    id: 'aceites_lubricantes',
    keywords: ['aceite', 'lubri', 'valvoline', 'castrol', 'mobil', 'refrigerante'],
  },
  {
    id: 'frenos_suspension',
    keywords: [
      'freno',
      'pastilla',
      'disco',
      'zapatas',
      'abs',
      'amortiguador',
      'susp',
      'rotula',
      'rótula',
      'bujes',
    ],
  },
  {
    id: 'electrico_electronico',
    keywords: [
      'sensor',
      'maf',
      'alternador',
      'arranque',
      'bobina',
      'inyector',
      'ecu',
      'bateria',
      'eléctr',
      'electr',
    ],
  },
  {
    id: 'aire_combustible',
    keywords: ['combust', 'bomba', 'filtro de combustible', 'inyector', 'rail', 'glp'],
  },
  { id: 'llantas_rines', keywords: ['llanta', 'rin', 'neum', 'aro'] },
  { id: 'carroceria_pintura', keywords: ['pintura', 'carrocer', 'parachoques', 'laton'] },
  {
    id: 'herramientas_equipos',
    keywords: ['herramienta', 'scanner', 'elevador', 'alineadora', 'equipo'],
  },
];

function classifyProviderCategory(item) {
  const text = normalizeText(
    `${item.categoria || ''} ${item.subcategoria || ''} ${item.descripcion || ''}`
  );
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some((keyword) => text.includes(keyword))) {
      return entry.id;
    }
  }
  return 'repuestos_motor';
}

function mapDbProviders(dbProviders, providerCatalog) {
  const map = new Map();
  dbProviders.forEach((provider) => {
    const locationParts = [provider.direccion, 'Ecuador'].filter(Boolean);
    map.set(provider.id, {
      id: provider.id,
      nombre: provider.nombre || provider.id,
      contacto: provider.contacto || '',
      telefono: provider.telefono || '',
      email: provider.email || '',
      ubicacion: locationParts.join(', '),
      disponibilidad: provider.notas?.includes('Stock') ? provider.notas : '',
      notas: provider.notas || '',
    });
  });

  return {
    get(providerId) {
      if (!providerId) return null;
      if (map.has(providerId)) return map.get(providerId);
      if (providerCatalog.providersById.has(providerId)) {
        return providerCatalog.providersById.get(providerId);
      }
      return null;
    },
  };
}

function loadDatabaseCatalog(providerCatalog) {
  if (!fs.existsSync(DB_PATH)) {
    console.warn('⚠️  No se encontró la base de datos gestor_tienda.db');
    return [];
  }

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  const productos = db
    .prepare(
      `
    SELECT p.id, p.codigo, p.nombre, COALESCE(p.descripcion, '') AS descripcion,
           p.precio_compra, p.precio_venta, p.stock, p.stock_minimo,
           p.created_at, p.updated_at, p.categoria_id, p.proveedor_id,
           COALESCE(c.nombre, 'General') AS categoria_nombre
    FROM productos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE p.activo = 1
  `
    )
    .all();

  const especificaciones = db
    .prepare(
      `
    SELECT producto_id, especificacion_clave AS clave, especificacion_valor AS valor
    FROM especificaciones_tecnicas
  `
    )
    .all();

  const compatibilidades = db
    .prepare(
      `
    SELECT producto_id, mv.nombre AS marca, mdv.nombre AS modelo,
           pc.anio_inicio, pc.anio_fin, pc.motor, pc.posicion, pc.notas_compatibilidad
    FROM productos_compatibilidad pc
    LEFT JOIN marcas_vehiculos mv ON mv.id = pc.marca_vehiculo_id
    LEFT JOIN modelos_vehiculos mdv ON mdv.id = pc.modelo_vehiculo_id
    WHERE pc.verificado = 1
  `
    )
    .all();

  const numerosParte = db
    .prepare(
      `
    SELECT producto_id, numero_parte, tipo_parte, fabricante
    FROM numeros_parte
  `
    )
    .all();

  const proveedoresDb = db
    .prepare(
      `
    SELECT id, nombre, contacto, telefono, email, direccion, notas
    FROM proveedores
    WHERE activo = 1
  `
    )
    .all();

  db.close();

  const specsByProduct = new Map();
  especificaciones.forEach((row) => {
    if (!specsByProduct.has(row.producto_id)) {
      specsByProduct.set(row.producto_id, {});
    }
    if (row.clave) {
      specsByProduct.get(row.producto_id)[row.clave] = row.valor || '';
    }
  });

  const compatByProduct = new Map();
  compatibilidades.forEach((row) => {
    if (!compatByProduct.has(row.producto_id)) {
      compatByProduct.set(row.producto_id, []);
    }
    const anioInicio = Number.isFinite(row.anio_inicio)
      ? row.anio_inicio
      : parseInt(row.anio_inicio, 10);
    const anioFin = Number.isFinite(row.anio_fin) ? row.anio_fin : parseInt(row.anio_fin, 10);
    const anios = Number.isInteger(anioInicio)
      ? Number.isInteger(anioFin) && anioFin !== anioInicio
        ? `${anioInicio}-${anioFin}`
        : `${anioInicio}`
      : '';
    compatByProduct.get(row.producto_id).push({
      marca: row.marca || '',
      modelo: row.modelo || '',
      anios,
      motor: row.motor || '',
      detalle: row.posicion || '',
      notas: row.notas_compatibilidad || '',
    });
  });

  const numerosByProduct = new Map();
  numerosParte.forEach((row) => {
    if (!numerosByProduct.has(row.producto_id)) {
      numerosByProduct.set(row.producto_id, []);
    }
    numerosByProduct.get(row.producto_id).push(row);
  });

  const dbProviderMap = mapDbProviders(proveedoresDb, providerCatalog);

  return productos.map((producto) => {
    const specs = specsByProduct.get(producto.id) || {};
    const compat = compatByProduct.get(producto.id) || [];
    const numeros = numerosByProduct.get(producto.id) || [];

    const tokens = new Set();
    const pushTokens = (texto = '') => {
      texto
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9áéíóúñ ]/giu, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .forEach((token) => tokens.add(token));
    };

    pushTokens(producto.codigo);
    pushTokens(producto.nombre);
    pushTokens(producto.categoria_nombre);
    numeros.forEach((numero) => pushTokens(numero.numero_parte));

    const aplicaciones = compat.length
      ? compat
          .map((ref) =>
            [ref.marca, ref.modelo, ref.anios && `(${ref.anios})`, ref.motor]
              .filter(Boolean)
              .join(' ')
          )
          .filter(Boolean)
      : [];

    const principalProvider = dbProviderMap.get(producto.proveedor_id);

    const proveedores = [];
    if (principalProvider) {
      proveedores.push({ ...principalProvider, principal: true });
    }

    const categoriaProveedor = classifyProviderCategory({
      categoria: producto.categoria_nombre,
      subcategoria: producto.categoria_nombre,
      descripcion: producto.descripcion,
    });

    if (providerCatalog.providersByCategory.has(categoriaProveedor)) {
      providerCatalog.providersByCategory.get(categoriaProveedor).forEach((provId) => {
        const prov = providerCatalog.providersById.get(provId);
        if (!prov) return;
        proveedores.push(prov);
      });
    }

    return {
      id: `db-${producto.id}`,
      sku: producto.codigo || `SKU-${producto.id}`,
      nombre: producto.nombre || 'Producto sin nombre',
      categoria: producto.categoria_nombre || 'General',
      subcategoria: producto.categoria_nombre || 'General',
      descripcion: producto.descripcion || '',
      aplicaciones,
      compatibilidad: compat,
      especificaciones: specs,
      procedimientos: [],
      fotoUrl: '',
      proveedores: uniqueProviders(proveedores).slice(0, 4),
      palabrasClave: Array.from(tokens),
      estado: Number(producto.stock || 0) > 0 ? 'activo' : DEFAULT_STATE,
      ultimaRevision:
        toIsoString(producto.updated_at) ||
        toIsoString(producto.created_at) ||
        new Date().toISOString(),
      precioVenta: Number.isFinite(producto.precio_venta) ? Number(producto.precio_venta) : null,
      precioCompra: Number.isFinite(producto.precio_compra) ? Number(producto.precio_compra) : null,
      stock: Number.isFinite(producto.stock) ? Number(producto.stock) : null,
      origenDatos: 'database',
    };
  });
}

function uniqueProviders(proveedores = []) {
  const seen = new Set();
  const result = [];
  proveedores.forEach((prov) => {
    if (!prov) return;
    const key = (prov.id || prov.nombre || '').toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(prov);
    }
  });
  return result;
}

function normalizeCatalogItem(item = {}) {
  const compatibilidad = Array.isArray(item.compatibilidad)
    ? item.compatibilidad.map((ref) => ({
        marca: ref?.marca || '',
        modelo: ref?.modelo || '',
        anios: ref?.anios || ref?.años || ref?.years || '',
        motor: ref?.motor || '',
        detalle: ref?.detalle || '',
        notas: ref?.notas || '',
      }))
    : [];

  const proveedores = Array.isArray(item.proveedores)
    ? uniqueProviders(
        item.proveedores.map((prov) => ({
          id: prov?.id || prov?.nombre || '',
          nombre: prov?.nombre || prov?.id || '',
          contacto: prov?.contacto || '',
          telefono: prov?.telefono || '',
          email: prov?.email || '',
          ubicacion: prov?.ubicacion || prov?.ciudad || prov?.direccion || '',
          disponibilidad: prov?.disponibilidad || '',
          notas: prov?.notas || '',
        }))
      )
    : [];

  const palabrasClave = Array.isArray(item.palabrasClave)
    ? item.palabrasClave
    : Array.isArray(item.palabras_clave)
      ? item.palabras_clave
      : [];

  return {
    id: item.id || `item-${Math.random().toString(36).slice(2, 10)}`,
    sku: item.sku || item.codigo || '',
    nombre: item.nombre || 'Producto sin nombre',
    categoria: item.categoria || item.categoria_nombre || 'General',
    subcategoria: item.subcategoria || item.sistema || item.categoria || 'General',
    descripcion: item.descripcion || '',
    aplicaciones: Array.isArray(item.aplicaciones) ? item.aplicaciones.filter(Boolean) : [],
    compatibilidad,
    especificaciones:
      item.especificaciones && typeof item.especificaciones === 'object'
        ? { ...item.especificaciones }
        : {},
    procedimientos: Array.isArray(item.procedimientos) ? item.procedimientos.filter(Boolean) : [],
    fotoUrl: item.fotoUrl || item.foto_url || '',
    proveedores,
    palabrasClave: uniqueArray(palabrasClave.filter(Boolean)),
    estado: item.estado || DEFAULT_STATE,
    ultimaRevision: toIsoString(item.ultimaRevision) || new Date().toISOString(),
    precioVenta: Number.isFinite(item.precioVenta)
      ? Number(item.precioVenta)
      : Number.isFinite(item.precio_venta)
        ? Number(item.precio_venta)
        : null,
    precioCompra: Number.isFinite(item.precioCompra)
      ? Number(item.precioCompra)
      : Number.isFinite(item.precio_compra)
        ? Number(item.precio_compra)
        : null,
    stock: Number.isFinite(item.stock) ? Number(item.stock) : null,
    origenDatos: item.origenDatos || item.origen_datos || 'local',
  };
}

function mergeCatalogs(existing = [], fromDb = []) {
  const merged = new Map();

  const addOrMerge = (incomingRaw) => {
    const incoming = normalizeCatalogItem(incomingRaw);
    if (!incoming.sku && !incoming.nombre) {
      return;
    }
    const key = (incoming.sku || incoming.nombre).toLowerCase();

    if (!merged.has(key)) {
      merged.set(key, incoming);
      return;
    }

    const current = merged.get(key);

    const descripcion =
      (current.descripcion || '').length >= (incoming.descripcion || '').length
        ? current.descripcion
        : incoming.descripcion;

    const categoria =
      current.categoria && current.categoria !== 'General' ? current.categoria : incoming.categoria;
    const subcategoria =
      current.subcategoria && current.subcategoria !== 'General'
        ? current.subcategoria
        : incoming.subcategoria;

    const compatibilidad = current.compatibilidad.length
      ? current.compatibilidad
      : incoming.compatibilidad;
    const procedimientos = uniqueArray([
      ...(current.procedimientos || []),
      ...(incoming.procedimientos || []),
    ]);

    const especificaciones = mergeObjects(incoming.especificaciones, current.especificaciones);

    const proveedores = uniqueProviders([
      ...(incoming.proveedores || []),
      ...(current.proveedores || []),
    ]);

    const palabrasClave = uniqueArray([
      ...(current.palabrasClave || []),
      ...(incoming.palabrasClave || []),
    ]);

    const estado =
      current.estado === 'activo' || incoming.estado === 'activo'
        ? 'activo'
        : incoming.estado || current.estado || DEFAULT_STATE;

    const ultimaRevision = [current.ultimaRevision, incoming.ultimaRevision]
      .map((value) => new Date(value || 0))
      .sort((a, b) => b - a)[0];

    const precioVenta = Number.isFinite(current.precioVenta)
      ? current.precioVenta
      : incoming.precioVenta;
    const precioCompra = Number.isFinite(current.precioCompra)
      ? current.precioCompra
      : incoming.precioCompra;
    const stock = Number.isFinite(current.stock) ? current.stock : incoming.stock;

    merged.set(key, {
      ...current,
      descripcion,
      categoria,
      subcategoria,
      aplicaciones: current.aplicaciones.length ? current.aplicaciones : incoming.aplicaciones,
      compatibilidad,
      procedimientos,
      especificaciones,
      proveedores,
      palabrasClave,
      estado,
      ultimaRevision:
        ultimaRevision instanceof Date && !Number.isNaN(ultimaRevision.getTime())
          ? ultimaRevision.toISOString()
          : current.ultimaRevision || incoming.ultimaRevision,
      precioVenta,
      precioCompra,
      stock,
    });
  };

  existing.forEach(addOrMerge);
  fromDb.forEach(addOrMerge);

  return Array.from(merged.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

function ensureOutputDirs() {
  OUTPUT_FILES.forEach((filePath) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function writeOutput(data = []) {
  ensureOutputDirs();
  const payload = JSON.stringify(data, null, 2);
  OUTPUT_FILES.forEach((filePath) => {
    fs.writeFileSync(filePath, payload, 'utf8');
    console.log(
      `✅ Catálogo unificado guardado en ${path.relative(ROOT, filePath)} (${data.length} ítems)`
    );
  });
}

function main() {
  const providerCatalog = buildProviderCatalog();
  const existing = EXISTING_DATASETS.reduce((acc, filePath) => {
    if (!fs.existsSync(filePath)) return acc;
    const data = readJsonSafe(filePath, []);
    if (Array.isArray(data)) {
      return acc.concat(data);
    }
    return acc;
  }, []);

  const fromDb = loadDatabaseCatalog(providerCatalog);
  const unified = mergeCatalogs(existing, fromDb);
  writeOutput(unified);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Error al generar el catálogo técnico unificado:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = {
  main,
  mergeCatalogs,
  loadDatabaseCatalog,
  buildProviderCatalog,
};
