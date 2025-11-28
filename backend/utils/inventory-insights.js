const crypto = require('crypto');

const axios = require('axios');

const DEFAULT_AUTO_REFRESH_MINUTES = 60;
const MIN_AUTO_REFRESH_MINUTES = 10;
const MAX_AUTO_REFRESH_MINUTES = 720;
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';
const FALLBACK_AI_PROVIDER = 'deepseek';

function ensureInventoryInsightsSchema(db) {
  if (!db) {
    throw new Error('Base de datos de negocio no disponible');
  }

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS inventory_insights_cache (
      negocio_id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      alerts_hash TEXT,
      summary TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_notification_hash TEXT,
      last_notification_at TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT
    )
  `
  ).run();
}

function safeGet(db, sql, params, fallback = null) {
  try {
    return db.prepare(sql).get(params);
  } catch (error) {
    if (/no such table/i.test(error.message)) {
      return fallback;
    }
    throw error;
  }
}

function safeAll(db, sql, params, fallback = []) {
  try {
    return db.prepare(sql).all(params);
  } catch (error) {
    if (/no such table/i.test(error.message)) {
      return fallback;
    }
    throw error;
  }
}

function parseNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toPositive(number, fallback = 0) {
  return number > 0 ? number : fallback;
}

function clamp(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(Math.max(numeric, min), max);
}

function minutesBetween(isoDate) {
  if (!isoDate) return Infinity;
  const updated = new Date(isoDate);
  if (Number.isNaN(updated.getTime())) return Infinity;
  return (Date.now() - updated.getTime()) / (1000 * 60);
}

function hashAlerts(alerts) {
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return null;
  }
  const hash = crypto.createHash('sha1');
  hash.update(JSON.stringify(alerts));
  return hash.digest('hex');
}

function readInventorySettings(db) {
  const result = {
    autoRefreshMinutes: DEFAULT_AUTO_REFRESH_MINUTES,
    autoNotify: true,
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
    deepseekModel: process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL,
  };

  const rows = safeAll(
    db,
    `SELECT key, value FROM configuracion WHERE key LIKE 'ia_inventory_%' OR key LIKE 'ia_deepseek_%'`,
    {},
    []
  );

  if (Array.isArray(rows)) {
    rows.forEach((row) => {
      if (!row || !row.key) return;
      const key = row.key.trim();
      const value = row.value;
      if (key === 'ia_inventory_auto_interval') {
        result.autoRefreshMinutes = clamp(
          value,
          MIN_AUTO_REFRESH_MINUTES,
          MAX_AUTO_REFRESH_MINUTES,
          DEFAULT_AUTO_REFRESH_MINUTES
        );
      } else if (key === 'ia_inventory_auto_notify') {
        result.autoNotify = String(value).toLowerCase() !== 'false';
      } else if (key === 'ia_deepseek_api_key' && value) {
        result.deepseekApiKey = value;
      } else if (key === 'ia_deepseek_model' && value) {
        result.deepseekModel = value;
      }
    });
  }

  if (!result.autoRefreshMinutes || !Number.isFinite(result.autoRefreshMinutes)) {
    result.autoRefreshMinutes = DEFAULT_AUTO_REFRESH_MINUTES;
  }

  return result;
}

function buildSummary(metrics) {
  if (!metrics) {
    return 'Sin métricas disponibles.';
  }

  const parts = [];
  parts.push(`Inventario activo: ${metrics.activeProducts} productos.`);
  parts.push(`Stock disponible: ${metrics.totalStockUnits} unidades.`);
  parts.push(`Valor estimado: ${formatCurrency(metrics.inventoryValue)}.`);

  if (metrics.criticalCount > 0) {
    parts.push(`${metrics.criticalCount} referencias en estado crítico.`);
  }

  if (metrics.coverageDays) {
    parts.push(`Cobertura promedio de ${metrics.coverageDays} días.`);
  }

  return parts.join(' ');
}

function formatCurrency(value) {
  const numeric = Number(value) || 0;
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatNumber(value) {
  const numeric = Number(value) || 0;
  return new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 }).format(numeric);
}

function computeCoverage(totalStockUnits, avgDailySales) {
  if (!Number.isFinite(totalStockUnits) || totalStockUnits <= 0) {
    return null;
  }
  if (!Number.isFinite(avgDailySales) || avgDailySales <= 0) {
    return null;
  }
  const coverage = totalStockUnits / avgDailySales;
  if (!Number.isFinite(coverage) || coverage <= 0) {
    return null;
  }
  return Math.round(coverage);
}

function computeMetrics(db, negocioId) {
  const productStats = safeGet(
    db,
    `SELECT
      COUNT(*) AS total_productos,
      SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) AS productos_activos,
      SUM(CASE WHEN activo = 1 THEN COALESCE(stock, 0) ELSE 0 END) AS stock_total,
      SUM(CASE WHEN activo = 1 THEN COALESCE(stock, 0) * COALESCE(precio_venta, 0) ELSE 0 END) AS valor_venta,
      SUM(CASE WHEN activo = 1 AND (COALESCE(stock, 0) <= 0 OR (COALESCE(stock_minimo,0) > 0 AND COALESCE(stock,0) <= COALESCE(stock_minimo,0))) THEN 1 ELSE 0 END) AS criticos,
      SUM(CASE WHEN activo = 1 AND COALESCE(stock, 0) <= 0 THEN 1 ELSE 0 END) AS sin_stock
    FROM productos
    WHERE activo = 1 AND (negocio_id = @negocioId OR negocio_id IS NULL)
  `,
    { negocioId },
    {
      total_productos: 0,
      productos_activos: 0,
      stock_total: 0,
      valor_venta: 0,
      criticos: 0,
      sin_stock: 0,
    }
  );

  const ventas30 = safeGet(
    db,
    `SELECT
      COALESCE(SUM(vd.cantidad), 0) AS unidades,
      COALESCE(SUM(vd.total), 0) AS monto
    FROM ventas_detalle vd
    INNER JOIN ventas v ON v.id = vd.venta_id AND v.negocio_id = vd.negocio_id
    WHERE vd.negocio_id = @negocioId
      AND v.estado = 'completada'
      AND DATE(v.fecha) >= DATE('now', '-30 day')
  `,
    { negocioId },
    { unidades: 0, monto: 0 }
  );

  const compras30 = safeGet(
    db,
    `SELECT
      COALESCE(SUM(cd.cantidad), 0) AS unidades,
      COALESCE(SUM(cd.total), 0) AS monto
    FROM compras_detalle cd
    INNER JOIN compras c ON c.id = cd.compra_id AND c.negocio_id = cd.negocio_id
    WHERE cd.negocio_id = @negocioId
      AND DATE(c.fecha) >= DATE('now', '-30 day')
  `,
    { negocioId },
    { unidades: 0, monto: 0 }
  );

  const avgDailySales = ventas30.unidades > 0 ? ventas30.unidades / 30 : 0;
  const coverageDays = computeCoverage(productStats.stock_total, avgDailySales);

  return {
    totalProducts: parseNumber(productStats.total_productos),
    activeProducts: parseNumber(productStats.productos_activos),
    totalStockUnits: parseNumber(productStats.stock_total),
    inventoryValue: parseNumber(productStats.valor_venta),
    criticalCount: parseNumber(productStats.criticos),
    outOfStockCount: parseNumber(productStats.sin_stock),
    sales30Units: parseNumber(ventas30.unidades),
    sales30Amount: parseNumber(ventas30.monto),
    purchases30Units: parseNumber(compras30.unidades),
    purchases30Amount: parseNumber(compras30.monto),
    avgDailySales: Math.round(avgDailySales),
    coverageDays,
  };
}

function fetchCollections(db, negocioId) {
  const criticalProducts = safeAll(
    db,
    `SELECT
      p.id,
      p.codigo,
      p.nombre,
      COALESCE(p.stock, 0) AS stock,
      COALESCE(p.stock_minimo, 0) AS stock_minimo,
      COALESCE(p.precio_compra, 0) AS precio_compra,
      COALESCE(p.precio_venta, 0) AS precio_venta,
      pr.nombre AS proveedor_nombre,
      c.nombre AS categoria_nombre
    FROM productos p
    LEFT JOIN proveedores pr ON pr.id = p.proveedor_id AND pr.negocio_id = p.negocio_id
    LEFT JOIN categorias c ON c.id = p.categoria_id AND c.negocio_id = p.negocio_id
    WHERE p.activo = 1
      AND (p.negocio_id = @negocioId OR p.negocio_id IS NULL)
      AND (COALESCE(p.stock, 0) <= 0 OR (COALESCE(p.stock_minimo, 0) > 0 AND COALESCE(p.stock, 0) <= COALESCE(p.stock_minimo, 0)))
    ORDER BY COALESCE(p.stock,0) ASC, COALESCE(p.stock_minimo,0) ASC, p.nombre ASC
    LIMIT 50
  `,
    { negocioId }
  );

  const topSellers = safeAll(
    db,
    `SELECT
      p.id,
      p.codigo,
      p.nombre,
      SUM(CASE WHEN DATE(v.fecha) >= DATE('now', '-30 day') THEN vd.cantidad ELSE 0 END) AS unidades_30d,
      SUM(CASE WHEN DATE(v.fecha) >= DATE('now', '-30 day') THEN vd.total ELSE 0 END) AS monto_30d,
      SUM(vd.cantidad) AS unidades_totales
    FROM productos p
    LEFT JOIN ventas_detalle vd ON vd.producto_id = p.id AND vd.negocio_id = @negocioId
    LEFT JOIN ventas v ON v.id = vd.venta_id AND v.negocio_id = @negocioId AND v.estado = 'completada'
    WHERE p.activo = 1 AND (p.negocio_id = @negocioId OR p.negocio_id IS NULL)
    GROUP BY p.id
    HAVING unidades_30d > 0
    ORDER BY unidades_30d DESC, monto_30d DESC
    LIMIT 10
  `,
    { negocioId }
  );

  const slowMovers = safeAll(
    db,
    `SELECT
      p.id,
      p.codigo,
      p.nombre,
      COALESCE(p.stock, 0) AS stock,
      COALESCE(p.stock_minimo, 0) AS stock_minimo,
      pr.nombre AS proveedor_nombre,
      SUM(CASE WHEN DATE(v.fecha) >= DATE('now', '-90 day') THEN vd.cantidad ELSE 0 END) AS unidades_90d
    FROM productos p
    LEFT JOIN ventas_detalle vd ON vd.producto_id = p.id AND vd.negocio_id = @negocioId
    LEFT JOIN ventas v ON v.id = vd.venta_id AND v.negocio_id = @negocioId AND v.estado = 'completada'
    LEFT JOIN proveedores pr ON pr.id = p.proveedor_id AND pr.negocio_id = p.negocio_id
    WHERE p.activo = 1 AND (p.negocio_id = @negocioId OR p.negocio_id IS NULL)
    GROUP BY p.id
    HAVING unidades_90d = 0 AND stock > 0
    ORDER BY stock DESC
    LIMIT 10
  `,
    { negocioId }
  );

  const priorityProducts = [...criticalProducts];

  slowMovers.slice(0, 5).forEach((producto) => {
    if (!priorityProducts.some((p) => p.id === producto.id)) {
      priorityProducts.push({ ...producto, prioridad: 'lento' });
    }
  });

  return {
    criticalProducts,
    topSellers,
    slowMovers,
    priorityProducts,
  };
}

function buildAlerts(metrics, collections) {
  const alerts = [];

  if (metrics.criticalCount > 0 && Array.isArray(collections.criticalProducts)) {
    const sample = collections.criticalProducts
      .slice(0, 5)
      .map((item) => `${item.nombre} (${item.stock}/${item.stock_minimo})`);
    alerts.push({
      key: 'critical_stock',
      title: 'Productos críticos',
      severity: 'critical',
      message: `${metrics.criticalCount} productos están en nivel crítico o agotados.`,
      sample,
    });
  }

  if (metrics.coverageDays && metrics.coverageDays < 7 && metrics.avgDailySales > 0) {
    alerts.push({
      key: 'low_coverage',
      title: 'Cobertura insuficiente',
      severity: 'warning',
      message: `La cobertura promedio es de ${metrics.coverageDays} días con una demanda diaria de ${metrics.avgDailySales} unidades.`,
      sample: [],
    });
  }

  if (Array.isArray(collections.slowMovers) && collections.slowMovers.length > 0) {
    const sample = collections.slowMovers
      .slice(0, 3)
      .map((item) => `${item.nombre} (${item.stock} uds sin rotación)`);
    alerts.push({
      key: 'slow_movers',
      title: 'Inventario inmóvil',
      severity: 'info',
      message: `${collections.slowMovers.length} productos tienen stock sin rotación en los últimos 90 días.`,
      sample,
    });
  }

  return alerts;
}

async function generateAiNarrative(dataset, aiSettings) {
  if (!aiSettings || !aiSettings.apiKey) {
    return buildFallbackNarrative(dataset);
  }

  const systemPrompt = `Eres un analista senior de inventarios para cadenas de tiendas. Responde SIEMPRE en JSON con la forma { "resumen": string, "acciones": [string], "alertas": [string] }. Lenguaje: español neutro, tono ejecutivo, frases cortas y accionables. Prioriza decisiones de abastecimiento, rotación y liquidez.`;

  const trimmedDataset = {
    metrics: dataset.metrics,
    alerts: dataset.alerts,
    critical: (dataset.collections?.criticalProducts || []).slice(0, 5),
    slow: (dataset.collections?.slowMovers || []).slice(0, 5),
    top: (dataset.collections?.topSellers || []).slice(0, 5),
  };

  try {
    const response = await axios.post(
      aiSettings.baseURL || 'https://api.deepseek.com/v1/chat/completions',
      {
        model: aiSettings.model || DEFAULT_DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(trimmedDataset, null, 2) },
        ],
        temperature: Math.min(Math.max(Number(aiSettings.temperature) || 0.4, 0), 1),
        max_tokens: Number(aiSettings.maxTokens) || 800,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${aiSettings.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Sin contenido de IA');
    }

    const parsed = JSON.parse(content);
    const summary =
      typeof parsed.resumen === 'string' ? parsed.resumen.trim() : buildSummary(dataset.metrics);
    const actions = Array.isArray(parsed.acciones)
      ? parsed.acciones.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const alerts = Array.isArray(parsed.alertas)
      ? parsed.alertas.map((item) => String(item).trim()).filter(Boolean)
      : [];

    return {
      provider: aiSettings.provider || FALLBACK_AI_PROVIDER,
      model: aiSettings.model || DEFAULT_DEEPSEEK_MODEL,
      summary: summary || buildSummary(dataset.metrics),
      actions,
      alerts,
    };
  } catch (error) {
    console.warn('[InventoryInsights][AI] Fallback narrativo:', error.message);
    return buildFallbackNarrative(dataset);
  }
}

function buildFallbackNarrative(dataset) {
  const metrics = dataset.metrics || {};
  const summary = buildSummary(metrics);
  const actions = [];
  const alerts = [];

  if (metrics.criticalCount > 0) {
    actions.push('Revisar pedidos pendientes y abastecer productos críticos.');
  }
  if (metrics.coverageDays && metrics.coverageDays < 7) {
    actions.push('Planificar compra prioritaria para elevar la cobertura a 15 días.');
  }
  if (dataset.collections?.slowMovers?.length) {
    actions.push('Diseñar estrategia de liquidación para productos sin rotación.');
  }

  if (Array.isArray(dataset.alerts)) {
    dataset.alerts.forEach((alert) => alerts.push(alert.message));
  }

  return {
    provider: 'fallback',
    model: 'rule-based',
    summary,
    actions,
    alerts,
  };
}

function getCacheRow(db, negocioId) {
  return safeGet(
    db,
    'SELECT negocio_id, payload, alerts_hash, summary, updated_at, last_notification_hash, last_notification_at FROM inventory_insights_cache WHERE negocio_id = @negocioId',
    { negocioId },
    null
  );
}

function persistInsights(db, negocioId, payload, summary, alertsHash, meta = {}) {
  const updatedAt = new Date().toISOString();
  const params = {
    negocioId,
    payload: JSON.stringify(payload),
    summary,
    alertsHash: alertsHash || null,
    updatedAt,
    updatedBy: meta.updatedBy || null,
  };

  db.prepare(
    `
    INSERT INTO inventory_insights_cache (negocio_id, payload, summary, alerts_hash, updated_at, updated_by)
    VALUES (@negocioId, @payload, @summary, @alertsHash, @updatedAt, @updatedBy)
    ON CONFLICT(negocio_id) DO UPDATE SET
      payload = excluded.payload,
      summary = excluded.summary,
      alerts_hash = excluded.alerts_hash,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `
  ).run(params);

  return updatedAt;
}

function markAlertsNotified(db, negocioId, alertHash) {
  if (!alertHash) {
    return;
  }

  const nowISO = new Date().toISOString();
  db.prepare(
    `
    UPDATE inventory_insights_cache
    SET last_notification_hash = @alertHash,
        last_notification_at = @nowISO
    WHERE negocio_id = @negocioId
  `
  ).run({ alertHash, nowISO, negocioId });
}

function registerNotificationHistory(db, messages, actor = 'system') {
  if (!Array.isArray(messages) || messages.length === 0) {
    return;
  }

  const mensaje = messages.join('\n\n');

  try {
    db.prepare(
      `
      INSERT INTO notificaciones_enviadas (mensaje, tipo, fecha_envio, created_at)
      VALUES (@mensaje, 'inventario', datetime('now'), datetime('now'))
    `
    ).run({ mensaje });
  } catch (error) {
    if (!/no such table/i.test(error.message)) {
      console.warn('[InventoryInsights] No se pudo registrar la notificación:', error.message);
    }
  }
}

async function getInventoryInsights({
  db,
  negocioId,
  refreshMode = 'auto',
  forceRefresh = false,
  actor = 'system',
}) {
  ensureInventoryInsightsSchema(db);
  const settings = readInventorySettings(db);
  const cacheRow = getCacheRow(db, negocioId);
  const autoMinutes = settings.autoRefreshMinutes || DEFAULT_AUTO_REFRESH_MINUTES;
  const refreshRequested = forceRefresh || refreshMode === 'force' || refreshMode === 'manual';
  const cacheFresh = cacheRow ? minutesBetween(cacheRow.updated_at) <= autoMinutes : false;

  let payload = cacheRow ? JSON.parse(cacheRow.payload) : null;
  let alertsHash = cacheRow?.alerts_hash || null;
  let generatedAt = cacheRow?.updated_at || null;
  let refreshed = false;

  if (!payload || refreshRequested || !cacheFresh) {
    const metrics = computeMetrics(db, negocioId);
    const collections = fetchCollections(db, negocioId);
    const alerts = buildAlerts(metrics, collections);

    const aiSettings = {
      provider: FALLBACK_AI_PROVIDER,
      apiKey: settings.deepseekApiKey,
      model: settings.deepseekModel || DEFAULT_DEEPSEEK_MODEL,
      temperature: 0.45,
      maxTokens: 800,
    };

    const narrative = await generateAiNarrative({ metrics, collections, alerts }, aiSettings);

    payload = {
      negocioId,
      generatedAt: new Date().toISOString(),
      metrics,
      collections,
      alerts,
      ai: narrative,
      settings: {
        autoRefreshMinutes: settings.autoRefreshMinutes,
        autoNotify: settings.autoNotify,
        aiProvider: narrative.provider,
        aiModel: narrative.model,
      },
    };

    alertsHash = hashAlerts(alerts);
    generatedAt = persistInsights(db, negocioId, payload, narrative.summary, alertsHash, {
      updatedBy: actor,
    });
    refreshed = true;
  }

  const shouldNotify = Boolean(
    settings.autoNotify &&
      alertsHash &&
      alertsHash !== cacheRow?.last_notification_hash &&
      Array.isArray(payload.alerts) &&
      payload.alerts.length > 0
  );

  return {
    meta: {
      negocioId,
      generatedAt,
      source: refreshed ? 'fresh' : 'cache',
      refreshed,
      cacheAgeMinutes: cacheRow ? Math.round(minutesBetween(cacheRow.updated_at)) : null,
      autoRefreshMinutes: settings.autoRefreshMinutes,
      autoNotify: settings.autoNotify,
      shouldNotify,
      alertHash: alertsHash,
      lastNotificationAt: cacheRow?.last_notification_at || null,
      lastNotificationHash: cacheRow?.last_notification_hash || null,
    },
    payload,
  };
}

function acknowledgeInventoryAlerts({ db, negocioId, alertHash, messages = [], actor = 'system' }) {
  if (!alertHash) {
    throw new Error('alertHash requerido');
  }
  ensureInventoryInsightsSchema(db);
  markAlertsNotified(db, negocioId, alertHash);
  registerNotificationHistory(db, messages, actor);

  return {
    alertHash,
    notifiedAt: new Date().toISOString(),
  };
}

module.exports = {
  ensureInventoryInsightsSchema,
  getInventoryInsights,
  acknowledgeInventoryAlerts,
};
