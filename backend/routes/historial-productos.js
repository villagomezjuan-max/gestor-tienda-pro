// ============================================
// RUTAS: HISTORIAL DE PRODUCTOS Y PEDIDOS RÁPIDOS
// ============================================

const express = require('express');
const router = express.Router();

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;

const clampPageSize = (value) => {
  const numeric = Number.parseInt(value, 10);
  if (Number.isNaN(numeric)) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(MAX_PAGE_SIZE, Math.max(10, numeric));
};

const tableExists = (db, tableName) => {
  try {
    const result = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`)
      .get(tableName);
    return Boolean(result);
  } catch (error) {
    console.warn(`No se pudo verificar la tabla ${tableName}:`, error.message);
    return false;
  }
};

const calcularResumenMovimientos = (db, params, baseFrom, whereClause) => {
  try {
    const resumen = db
      .prepare(
        `
      SELECT
        COUNT(*) AS movimientos,
        COALESCE(SUM(ABS(h.cantidad)), 0) AS unidades,
        COALESCE(SUM(h.total), 0) AS valor
      ${baseFrom}
      ${whereClause}
    `
      )
      .get(...params);

    return {
      movimientos: Number(resumen?.movimientos || 0),
      unidades: Number(resumen?.unidades || 0),
      valor: Number(resumen?.valor || 0),
    };
  } catch (error) {
    console.warn('No se pudo calcular el resumen de historial:', error.message);
    return null;
  }
};

const obtenerMovimientosDesdeVentas = (
  db,
  negocioId,
  filtros = {},
  limit = DEFAULT_PAGE_SIZE,
  offset = 0
) => {
  if (!tableExists(db, 'ventas_detalle') || !tableExists(db, 'ventas')) {
    return [];
  }

  const condiciones = ['vd.negocio_id = ?'];
  const params = [negocioId];

  if (filtros.producto_id) {
    condiciones.push('vd.producto_id = ?');
    params.push(filtros.producto_id);
  }

  if (filtros.fecha_desde) {
    condiciones.push('date(v.fecha) >= date(?)');
    params.push(filtros.fecha_desde);
  }

  if (filtros.fecha_hasta) {
    condiciones.push('date(v.fecha) <= date(?)');
    params.push(filtros.fecha_hasta);
  }

  if (filtros.search) {
    const like = `%${filtros.search}%`;
    condiciones.push(`(
      vd.descripcion LIKE ? OR
      vd.producto_nombre LIKE ? OR
      vd.producto_codigo LIKE ? OR
      v.numero LIKE ?
    )`);
    params.push(like, like, like, like);
  }

  const whereClause = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    return db
      .prepare(
        `
      SELECT 
        vd.id,
        'venta' AS tipo_movimiento,
        vd.cantidad,
        0 AS stock_anterior,
        0 AS stock_nuevo,
        vd.precio AS precio,
        vd.total,
        vd.producto_id,
        COALESCE(vd.producto_nombre, vd.descripcion, 'Producto sin nombre') AS producto_nombre,
        COALESCE(vd.producto_codigo, vd.codigo, '') AS producto_codigo,
        v.fecha,
        v.hora,
        v.numero AS referencia_id,
        vd.created_at
      FROM ventas_detalle vd
      INNER JOIN ventas v ON vd.venta_id = v.id
      ${whereClause}
      ORDER BY v.fecha DESC, v.hora DESC, vd.created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(...params, limit, offset);
  } catch (error) {
    console.warn('No se pudo obtener movimientos desde ventas:', error.message);
    return [];
  }
};

/**
 * GET /api/historial-productos
 * Obtiene el historial de movimientos de un producto o todos
 */
router.get('/historial-productos', (req, res) => {
  try {
    const tenantDb = req.db;
    const negocioId = req.negocioId;
    const {
      producto_id,
      tipo_movimiento = 'todos',
      fecha_desde,
      fecha_hasta,
      search = '',
      categoria_id,
      fuentes = 'historial',
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      includeResumen = '1',
    } = req.query;

    if (!tenantDb || !negocioId) {
      return res.status(400).json({ success: false, message: 'Datos insuficientes' });
    }
    const fuentesSet = new Set(
      (fuentes || 'historial')
        .split(',')
        .map((f) => f.trim().toLowerCase())
        .filter(Boolean)
    );

    if (fuentesSet.size === 0) {
      fuentesSet.add('historial');
    }

    const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const currentPageSize = clampPageSize(pageSize);
    const offset = (currentPage - 1) * currentPageSize;

    const whereClauses = ['h.negocio_id = ?'];
    const params = [negocioId];

    if (producto_id) {
      whereClauses.push('h.producto_id = ?');
      params.push(producto_id);
    }

    if (tipo_movimiento && tipo_movimiento !== 'todos') {
      whereClauses.push('LOWER(h.tipo_movimiento) = LOWER(?)');
      params.push(tipo_movimiento);
    }

    if (fecha_desde) {
      whereClauses.push('date(h.fecha) >= date(?)');
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      whereClauses.push('date(h.fecha) <= date(?)');
      params.push(fecha_hasta);
    }

    if (categoria_id) {
      whereClauses.push('p.categoria_id = ?');
      params.push(categoria_id);
    }

    if (search) {
      const like = `%${search}%`;
      whereClauses.push(`(
        p.nombre LIKE ? OR
        p.codigo LIKE ? OR
        h.referencia_id LIKE ? OR
        h.producto_nombre LIKE ?
      )`);
      params.push(like, like, like, like);
    }

    const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const baseFrom = `
      FROM historial_productos h
      LEFT JOIN productos p ON h.producto_id = p.id
    `;

    let movimientos = [];
    let total = 0;
    const tablaHistorialDisponible = tableExists(tenantDb, 'historial_productos');

    if (fuentesSet.has('historial') && tablaHistorialDisponible) {
      const paramsData = [...params];
      movimientos = tenantDb
        .prepare(
          `
        SELECT 
          h.*,
          p.codigo AS producto_codigo,
          p.nombre AS producto_nombre,
          p.categoria_id,
          p.stock AS stock_actual,
          p.stock_minimo,
          p.precio_compra,
          p.precio_venta
        ${baseFrom}
        ${whereClause}
        ORDER BY h.fecha DESC, h.hora DESC, h.created_at DESC
        LIMIT ? OFFSET ?
      `
        )
        .all(...paramsData, currentPageSize, offset);

      const contador = tenantDb
        .prepare(`SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`)
        .get(...paramsData);
      total = Number(contador?.total || 0);
    }

    if (movimientos.length === 0 && fuentesSet.has('ventas')) {
      movimientos = obtenerMovimientosDesdeVentas(
        tenantDb,
        negocioId,
        {
          producto_id,
          fecha_desde,
          fecha_hasta,
          search,
        },
        currentPageSize,
        offset
      );
      total = movimientos.length;
    }

    const resumen =
      includeResumen === '0' || !tablaHistorialDisponible
        ? null
        : calcularResumenMovimientos(tenantDb, [...params], baseFrom, whereClause);

    res.json({
      success: true,
      historial: movimientos,
      total,
      page: currentPage,
      pageSize: currentPageSize,
      totalPages: total > 0 ? Math.ceil(total / currentPageSize) : 1,
      resumen: resumen || {
        movimientos: movimientos.length,
        unidades: movimientos.reduce((acc, mov) => acc + Math.abs(Number(mov.cantidad) || 0), 0),
        valor: movimientos.reduce((acc, mov) => acc + Number(mov.total || 0), 0),
      },
      fuentes: Array.from(fuentesSet),
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/historial-productos/insights
 * Genera alertas inteligentes basadas en el historial de movimientos
 */
router.get('/historial-productos/insights', (req, res) => {
  try {
    const tenantDb = req.db;
    const negocioId = req.negocioId;
    const diasAnalisis = Math.min(120, Math.max(14, Number.parseInt(req.query.dias, 10) || 60));

    if (!tenantDb || !negocioId) {
      return res.status(400).json({ success: false, message: 'Datos insuficientes' });
    }

    if (!tableExists(tenantDb, 'historial_productos')) {
      return res.json({
        success: true,
        insights: {
          lowStock: [],
          overStock: [],
          anomalies: [],
          periodoAnalizado: diasAnalisis,
        },
      });
    }

    const periodoSql = `-${diasAnalisis} day`;
    let consumo = [];

    try {
      consumo = tenantDb
        .prepare(
          `
        SELECT
          h.producto_id,
          h.producto_nombre,
          COALESCE(p.stock, h.stock_nuevo, 0) AS stock_actual,
          COALESCE(p.stock_minimo, 0) AS stock_minimo,
          SUM(CASE WHEN h.tipo_movimiento IN ('venta','ajuste_salida') THEN ABS(h.cantidad) ELSE 0 END) AS total_salidas,
          SUM(CASE WHEN h.tipo_movimiento IN ('compra','ajuste_entrada') THEN h.cantidad ELSE 0 END) AS total_entradas
        FROM historial_productos h
        LEFT JOIN productos p ON p.id = h.producto_id
        WHERE h.negocio_id = ?
          AND date(h.fecha) >= date('now', ?)
        GROUP BY h.producto_id, h.producto_nombre, stock_actual, stock_minimo
      `
        )
        .all(negocioId, periodoSql);
    } catch (error) {
      consumo = [];
      console.warn('No se pudo obtener el consumo histórico para insights:', error.message);
    }

    const lowStock = [];
    const overStock = [];

    consumo.forEach((row) => {
      const stockActual = Number(row.stock_actual || 0);
      const stockMinimo = Number(row.stock_minimo || 0);
      const salidas = Number(row.total_salidas || 0);
      const entradas = Number(row.total_entradas || 0);
      const consumoDiario = salidas > 0 ? salidas / diasAnalisis : 0;
      const diasCobertura = consumoDiario > 0 ? stockActual / consumoDiario : null;

      if (diasCobertura !== null && diasCobertura < 10) {
        lowStock.push({
          producto_id: row.producto_id,
          producto_nombre: row.producto_nombre,
          stock_actual: stockActual,
          diasCobertura: Number(diasCobertura.toFixed(1)),
          mensaje:
            diasCobertura <= 0
              ? 'Sin cobertura: requiere reposición inmediata'
              : `Cobertura estimada ${diasCobertura.toFixed(1)} días`,
        });
      }

      if (entradas > salidas * 1.5 && stockActual > stockMinimo) {
        const exceso = entradas - salidas;
        overStock.push({
          producto_id: row.producto_id,
          producto_nombre: row.producto_nombre,
          stock_actual: stockActual,
          mensaje: `Entradas +${exceso.toFixed(0)} uds frente al consumo`,
        });
      }
    });

    let promedios = [];
    try {
      promedios = tenantDb
        .prepare(
          `
        SELECT producto_id, AVG(ABS(cantidad)) AS promedio
        FROM historial_productos
        WHERE negocio_id = ? AND date(fecha) >= date('now', '-45 day')
        GROUP BY producto_id
      `
        )
        .all(negocioId);
    } catch (error) {
      promedios = [];
      console.warn('No se pudieron calcular promedios para insights:', error.message);
    }

    const promedioMapa = promedios.reduce((acc, row) => {
      if (row.producto_id) {
        acc[row.producto_id] = Number(row.promedio || 0);
      }
      return acc;
    }, {});

    let recientes = [];
    try {
      recientes = tenantDb
        .prepare(
          `
        SELECT 
          h.id,
          h.producto_id,
          h.producto_nombre,
          ABS(h.cantidad) AS cantidad,
          h.tipo_movimiento,
          h.total,
          h.fecha,
          h.hora
        FROM historial_productos h
        WHERE h.negocio_id = ?
          AND date(h.fecha) >= date('now', '-7 day')
        ORDER BY ABS(h.cantidad) DESC
        LIMIT 200
      `
        )
        .all(negocioId);
    } catch (error) {
      recientes = [];
      console.warn('No se pudieron obtener movimientos recientes para insights:', error.message);
    }

    const anomalies = recientes
      .filter((mov) => {
        const promedio = promedioMapa[mov.producto_id] || 0;
        return promedio > 0 && mov.cantidad > promedio * 3;
      })
      .slice(0, 8)
      .map((mov) => ({
        producto_id: mov.producto_id,
        producto_nombre: mov.producto_nombre,
        cantidad: mov.cantidad,
        tipo_movimiento: mov.tipo_movimiento,
        fecha: mov.fecha,
        mensaje: `${mov.cantidad} uds (${mov.tipo_movimiento})`,
      }));

    res.json({
      success: true,
      insights: {
        lowStock: lowStock.slice(0, 8),
        overStock: overStock.slice(0, 8),
        anomalies,
        periodoAnalizado: diasAnalisis,
      },
    });
  } catch (error) {
    console.error('Error generando insights de historial:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/historial-productos/:productoId
 * Obtiene el historial de movimientos de un producto específico
 */
router.get('/historial-productos/:productoId', (req, res) => {
  try {
    const tenantDb = req.db;
    const negocioId = req.negocioId;
    const { productoId } = req.params;
    const { limit = 100 } = req.query;

    if (!tenantDb || !negocioId) {
      return res.status(400).json({ success: false, message: 'Datos insuficientes' });
    }

    // Intentar primero con historial_productos
    let movimientos = [];

    try {
      movimientos = tenantDb
        .prepare(
          `
        SELECT 
          h.id,
          h.tipo_movimiento,
          h.cantidad,
          h.stock_anterior,
          h.stock_nuevo,
          h.precio,
          h.total,
          h.referencia_id,
          h.notas,
          h.fecha,
          h.hora,
          h.created_at
        FROM historial_productos h
        WHERE h.negocio_id = ? AND h.producto_id = ?
        ORDER BY h.fecha DESC, h.hora DESC
        LIMIT ?
      `
        )
        .all(negocioId, productoId, parseInt(limit));
    } catch (e) {
      // Si la tabla historial_productos no existe, intentar con movimientos_stock
      try {
        movimientos = tenantDb
          .prepare(
            `
          SELECT 
            id,
            tipo_movimiento,
            cantidad,
            stock_anterior,
            stock_nuevo,
            precio_unitario as precio,
            (cantidad * precio_unitario) as total,
            referencia_id,
            notas,
            fecha,
            hora,
            created_at
          FROM movimientos_stock
          WHERE negocio_id = ? AND producto_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `
          )
          .all(negocioId, productoId, parseInt(limit));
      } catch (e2) {
        // Si ninguna tabla existe, intentar con ventas_detalle
        try {
          movimientos = tenantDb
            .prepare(
              `
            SELECT 
              vd.id,
              'venta' as tipo_movimiento,
              vd.cantidad,
              NULL as stock_anterior,
              NULL as stock_nuevo,
              vd.precio as precio,
              vd.total,
              v.id as referencia_id,
              NULL as notas,
              v.fecha,
              v.hora,
              vd.created_at
            FROM ventas_detalle vd
            INNER JOIN ventas v ON vd.venta_id = v.id
            WHERE vd.negocio_id = ? AND vd.producto_id = ?
            ORDER BY v.fecha DESC, v.hora DESC
            LIMIT ?
          `
            )
            .all(negocioId, productoId, parseInt(limit));
        } catch (e3) {
          console.warn('No se encontraron tablas de historial');
        }
      }
    }

    res.json({
      success: true,
      movimientos,
      total: movimientos.length,
    });
  } catch (error) {
    console.error('Error obteniendo historial de producto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/productos-mas-vendidos
 * Obtiene los productos más vendidos con estadísticas
 */
router.get('/productos-mas-vendidos', (req, res) => {
  try {
    const tenantDb = req.db;
    const negocioId = req.negocioId;
    const { limit = 20, orden = 'vendido' } = req.query;

    if (!tenantDb || !negocioId) {
      return res.status(400).json({ success: false, message: 'Datos insuficientes' });
    }

    let orderBy = 'total_vendido DESC';
    if (orden === 'ingresos') orderBy = 'total_ingresos DESC';
    if (orden === 'reciente') orderBy = 'ultima_venta DESC';

    // Query usando ventas_detalle en lugar de la vista productos_mas_vendidos
    const productos = tenantDb
      .prepare(
        `
      SELECT 
        p.id as producto_id,
        p.nombre as producto_nombre,
        p.nombre as productoNombre,
        SUM(vd.cantidad) as total_vendido,
        SUM(vd.cantidad) as totalVendido,
        SUM(vd.total) as total_ingresos,
        SUM(vd.total) as totalIngresos,
        p.stock as stock_actual,
        p.stock as stockActual,
        MAX(v.fecha) as ultima_venta,
        MAX(v.fecha) as ultimaVenta
      FROM ventas_detalle vd
      INNER JOIN ventas v ON vd.venta_id = v.id
      INNER JOIN productos p ON vd.producto_id = p.id
      WHERE vd.negocio_id = ?
      GROUP BY p.id, p.nombre, p.stock
      HAVING total_vendido > 0
      ORDER BY ${orderBy}
      LIMIT ?
    `
      )
      .all(negocioId, parseInt(limit));

    res.json({
      success: true,
      productos,
      total: productos.length,
    });
  } catch (error) {
    console.error('Error obteniendo productos más vendidos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/productos/rotacion
 * Análisis de rotación de productos
 */
router.get('/productos/rotacion', (req, res) => {
  try {
    const tenantDb = req.db;
    const negocioId = req.negocioId;

    if (!tenantDb || !negocioId) {
      return res.status(400).json({ success: false, message: 'Datos insuficientes' });
    }

    const altaRotacion = tenantDb
      .prepare(
        `
      SELECT * FROM v_productos_alta_rotacion
      WHERE negocio_id = ?
      ORDER BY ventas_30_dias DESC
      LIMIT 20
    `
      )
      .all(negocioId);

    const bajaRotacion = tenantDb
      .prepare(
        `
      SELECT * FROM v_productos_bajo_rotacion
      WHERE negocio_id = ?
      ORDER BY dias_sin_venta DESC
      LIMIT 20
    `
      )
      .all(negocioId);

    res.json({
      success: true,
      alta_rotacion: altaRotacion,
      baja_rotacion: bajaRotacion,
    });
  } catch (error) {
    console.error('Error analizando rotación:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/pedidos-rapidos
 * Obtiene las plantillas de pedidos rápidos
 */
router.get('/pedidos-rapidos', (req, res) => {
  try {
    const tenantDb = req.db;
    const negocioId = req.negocioId;

    if (!tenantDb || !negocioId) {
      return res.status(400).json({ success: false, message: 'Datos insuficientes' });
    }

    const pedidos = tenantDb
      .prepare(
        `
      SELECT * FROM pedidos_rapidos
      WHERE negocio_id = ? AND activo = 1
      ORDER BY nombre
    `
      )
      .all(negocioId);

    // Parsear el JSON de productos
    const pedidosConProductos = pedidos.map((p) => ({
      ...p,
      productos: JSON.parse(p.productos),
    }));

    res.json({
      success: true,
      pedidos: pedidosConProductos,
      total: pedidosConProductos.length,
    });
  } catch (error) {
    console.error('Error obteniendo pedidos rápidos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/pedidos-rapidos
 * Crea una nueva plantilla de pedido rápido
 */
router.post('/pedidos-rapidos', (req, res) => {
  try {
    const tenantDb = req.db;
    const negocioId = req.negocioId;
    const userId = req.user.id;
    const { nombre, descripcion, productos, frecuencia_dias, tipo } = req.body;

    if (!tenantDb || !negocioId) {
      return res.status(400).json({ success: false, message: 'Datos insuficientes' });
    }

    if (!nombre || !productos || productos.length === 0) {
      return res.status(400).json({ success: false, message: 'Nombre y productos son requeridos' });
    }

    const id = `pedido-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fecha = new Date().toISOString().split('T')[0];

    // Calcular total estimado
    const totalEstimado = productos.reduce((sum, p) => sum + p.cantidad * p.precio, 0);

    tenantDb
      .prepare(
        `
      INSERT INTO pedidos_rapidos (
        id, negocio_id, nombre, descripcion, tipo, productos,
        total_estimado, frecuencia_dias, ultimo_pedido, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `
      )
      .run(
        id,
        negocioId,
        nombre,
        descripcion || null,
        tipo || 'manual',
        JSON.stringify(productos),
        totalEstimado,
        frecuencia_dias || null,
        fecha,
        userId
      );

    res.json({
      success: true,
      message: 'Plantilla de pedido creada',
      id,
    });
  } catch (error) {
    console.error('Error creando pedido rápido:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/pedidos-rapidos/:id
 * Actualiza una plantilla de pedido rápido
 */
router.put('/pedidos-rapidos/:id', (req, res) => {
  try {
    const tenantDb = req.db;
    const negocioId = req.negocioId;
    const { id } = req.params;
    const { nombre, descripcion, productos, frecuencia_dias, activo } = req.body;

    if (!tenantDb || !negocioId) {
      return res.status(400).json({ success: false, message: 'Datos insuficientes' });
    }

    const updates = [];
    const params = [];

    if (nombre !== undefined) {
      updates.push('nombre = ?');
      params.push(nombre);
    }

    if (descripcion !== undefined) {
      updates.push('descripcion = ?');
      params.push(descripcion);
    }

    if (productos !== undefined) {
      updates.push('productos = ?');
      params.push(JSON.stringify(productos));

      const totalEstimado = productos.reduce((sum, p) => sum + p.cantidad * p.precio, 0);
      updates.push('total_estimado = ?');
      params.push(totalEstimado);
    }

    if (frecuencia_dias !== undefined) {
      updates.push('frecuencia_dias = ?');
      params.push(frecuencia_dias);
    }

    if (activo !== undefined) {
      updates.push('activo = ?');
      params.push(activo ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay cambios para aplicar' });
    }

    updates.push("updated_at = datetime('now')");
    params.push(id, negocioId);

    const result = tenantDb
      .prepare(
        `
      UPDATE pedidos_rapidos
      SET ${updates.join(', ')}
      WHERE id = ? AND negocio_id = ?
    `
      )
      .run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Pedido rápido no encontrado' });
    }

    res.json({
      success: true,
      message: 'Pedido rápido actualizado',
    });
  } catch (error) {
    console.error('Error actualizando pedido rápido:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/pedidos-rapidos/:id
 * Elimina una plantilla de pedido rápido
 */
router.delete('/pedidos-rapidos/:id', (req, res) => {
  try {
    const tenantDb = req.db;
    const negocioId = req.negocioId;
    const { id } = req.params;

    if (!tenantDb || !negocioId) {
      return res.status(400).json({ success: false, message: 'Datos insuficientes' });
    }

    const result = tenantDb
      .prepare(
        `
      DELETE FROM pedidos_rapidos
      WHERE id = ? AND negocio_id = ?
    `
      )
      .run(id, negocioId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Pedido rápido no encontrado' });
    }

    res.json({
      success: true,
      message: 'Pedido rápido eliminado',
    });
  } catch (error) {
    console.error('Error eliminando pedido rápido:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/pedidos-rapidos/:id/usar
 * Usa una plantilla para crear una compra
 */
router.post('/pedidos-rapidos/:id/usar', (req, res) => {
  try {
    const tenantDb = req.db;
    const negocioId = req.negocioId;
    const { id } = req.params;

    if (!tenantDb || !negocioId) {
      return res.status(400).json({ success: false, message: 'Datos insuficientes' });
    }

    const pedido = tenantDb
      .prepare(
        `
      SELECT * FROM pedidos_rapidos
      WHERE id = ? AND negocio_id = ? AND activo = 1
    `
      )
      .get(id, negocioId);

    if (!pedido) {
      return res.status(404).json({ success: false, message: 'Pedido rápido no encontrado' });
    }

    // Actualizar fecha de último pedido
    tenantDb
      .prepare(
        `
      UPDATE pedidos_rapidos
      SET ultimo_pedido = date('now'),
          proximo_pedido = date('now', '+' || frecuencia_dias || ' days')
      WHERE id = ?
    `
      )
      .run(id);

    const productos = JSON.parse(pedido.productos);

    res.json({
      success: true,
      pedido: {
        ...pedido,
        productos,
      },
    });
  } catch (error) {
    console.error('Error usando pedido rápido:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
