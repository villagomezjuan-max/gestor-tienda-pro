// ============================================
// APLICAR ESQUEMA DE HISTORIAL DE PRODUCTOS
// ============================================

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

console.log('\n📦 INSTALANDO SISTEMA DE HISTORIAL DE PRODUCTOS\n');
console.log('='.repeat(80));

const dbPath = path.join(__dirname, 'data', 'gestor_tienda.db');
const schemaPath = path.join(__dirname, 'schema_historial_productos.sql');

if (!fs.existsSync(dbPath)) {
  console.error('❌ No se encontró la base de datos');
  process.exit(1);
}

if (!fs.existsSync(schemaPath)) {
  console.error('❌ No se encontró el archivo de esquema');
  process.exit(1);
}

// Crear backup
const backupPath = path.join(__dirname, 'data', `gestor_tienda_backup_historial_${Date.now()}.db`);
fs.copyFileSync(dbPath, backupPath);
console.log(`✅ Backup creado: ${backupPath}\n`);

const db = new Database(dbPath);

try {
  console.log('1️⃣ APLICANDO ESQUEMA');
  console.log('-'.repeat(80));

  // Leer archivo SQL
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Ejecutar schema
  db.exec(schema);
  console.log('✅ Tablas y vistas creadas correctamente\n');

  // Verificar tablas creadas
  console.log('2️⃣ VERIFICANDO TABLAS');
  console.log('-'.repeat(80));

  const tables = db
    .prepare(
      `
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name IN ('historial_productos', 'productos_mas_vendidos', 'pedidos_rapidos')
    ORDER BY name
  `
    )
    .all();

  tables.forEach((t) => {
    console.log(`✅ Tabla: ${t.name}`);
  });

  const views = db
    .prepare(
      `
    SELECT name FROM sqlite_master 
    WHERE type='view' 
    AND name LIKE 'v_%'
    ORDER BY name
  `
    )
    .all();

  console.log('\n📊 Vistas creadas:');
  views.forEach((v) => {
    console.log(`✅ Vista: ${v.name}`);
  });

  // Poblar historial desde ventas existentes
  console.log('\n3️⃣ MIGRANDO DATOS HISTÓRICOS');
  console.log('-'.repeat(80));

  const ventasExistentes = db
    .prepare(
      `
    SELECT 
      v.id as venta_id,
      v.negocio_id,
      v.fecha,
      v.hora,
      vd.producto_id,
      vd.producto_nombre,
      vd.cantidad,
      vd.precio_unitario,
      vd.total
    FROM ventas v
    INNER JOIN ventas_detalle vd ON v.id = vd.venta_id
    WHERE v.estado = 'completada'
    ORDER BY v.fecha, v.hora
  `
    )
    .all();

  console.log(`Encontradas ${ventasExistentes.length} transacciones históricas`);

  const insertHistorial = db.prepare(`
    INSERT INTO historial_productos (
      id, negocio_id, producto_id, producto_nombre, tipo_movimiento,
      cantidad, stock_anterior, stock_nuevo, precio, total,
      referencia_id, fecha, hora
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN TRANSACTION');

  let migradas = 0;
  ventasExistentes.forEach((v) => {
    try {
      // Obtener stock actual del producto
      const producto = db.prepare('SELECT stock FROM productos WHERE id = ?').get(v.producto_id);

      if (producto) {
        const id = `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Calcular stock anterior (stock actual + cantidad vendida)
        const stockNuevo = producto.stock;
        const stockAnterior = stockNuevo + v.cantidad;

        insertHistorial.run(
          id,
          v.negocio_id,
          v.producto_id,
          v.producto_nombre,
          'venta',
          v.cantidad,
          stockAnterior,
          stockNuevo,
          v.precio_unitario,
          v.total,
          v.venta_id,
          v.fecha,
          v.hora || '00:00:00'
        );
        migradas++;
      }
    } catch (error) {
      console.warn(`⚠️ Error migrando transacción: ${error.message}`);
    }
  });

  db.exec('COMMIT');
  console.log(`✅ Migradas ${migradas} transacciones al historial\n`);

  // Actualizar tabla productos_mas_vendidos
  console.log('4️⃣ CALCULANDO PRODUCTOS MÁS VENDIDOS');
  console.log('-'.repeat(80));

  db.exec(`
    INSERT OR REPLACE INTO productos_mas_vendidos (
      id, negocio_id, producto_id, producto_nombre, producto_codigo,
      total_vendido, total_ingresos, ultima_venta, stock_actual,
      proveedor_id, proveedor_nombre
    )
    SELECT 
      'pv-' || p.id as id,
      p.negocio_id,
      p.id as producto_id,
      p.nombre as producto_nombre,
      p.codigo as producto_codigo,
      COALESCE(SUM(h.cantidad), 0) as total_vendido,
      COALESCE(SUM(h.total), 0) as total_ingresos,
      MAX(h.fecha) as ultima_venta,
      p.stock as stock_actual,
      p.proveedor_id,
      pr.nombre as proveedor_nombre
    FROM productos p
    LEFT JOIN historial_productos h ON p.id = h.producto_id AND h.tipo_movimiento = 'venta'
    LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
    WHERE p.activo = 1
    GROUP BY p.id, p.negocio_id, p.nombre, p.codigo, p.stock, p.proveedor_id, pr.nombre
  `);

  const productosActualizados = db
    .prepare(
      `
    SELECT COUNT(*) as total FROM productos_mas_vendidos
  `
    )
    .get();

  console.log(`✅ Actualizados ${productosActualizados.total} productos en caché\n`);

  // Mostrar estadísticas
  console.log('5️⃣ ESTADÍSTICAS DEL SISTEMA');
  console.log('-'.repeat(80));

  const stats = {
    totalHistorial: db.prepare('SELECT COUNT(*) as total FROM historial_productos').get().total,
    totalMasVendidos: db
      .prepare('SELECT COUNT(*) as total FROM productos_mas_vendidos WHERE total_vendido > 0')
      .get().total,
  };

  console.log(`📊 Registros en historial: ${stats.totalHistorial}`);
  console.log(`📈 Productos vendidos: ${stats.totalMasVendidos}`);

  // Top 5 productos más vendidos
  console.log('\n6️⃣ TOP 5 PRODUCTOS MÁS VENDIDOS');
  console.log('-'.repeat(80));

  const top5 = db
    .prepare(
      `
    SELECT producto_nombre, total_vendido, total_ingresos, ultima_venta
    FROM productos_mas_vendidos
    WHERE total_vendido > 0
    ORDER BY total_vendido DESC
    LIMIT 5
  `
    )
    .all();

  if (top5.length > 0) {
    top5.forEach((p, i) => {
      console.log(
        `${i + 1}. ${p.producto_nombre.substring(0, 40).padEnd(40)} | Vendidos: ${p.total_vendido.toString().padStart(4)} | Ingresos: $${p.total_ingresos.toFixed(2).padStart(8)} | Última: ${p.ultima_venta || 'N/A'}`
      );
    });
  } else {
    console.log('No hay datos de ventas aún');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ SISTEMA DE HISTORIAL INSTALADO CORRECTAMENTE');
  console.log('='.repeat(80));
  console.log('\n📝 CARACTERÍSTICAS HABILITADAS:');
  console.log('   ✅ Tracking automático de movimientos de stock');
  console.log('   ✅ Análisis de productos más vendidos');
  console.log('   ✅ Identificación de productos de alta/baja rotación');
  console.log('   ✅ Base para pedidos rápidos');
  console.log('   ✅ Reportes de rendimiento de productos');
  console.log('');
} catch (error) {
  console.error('\n❌ Error durante la instalación:', error.message);
  console.error(error);

  try {
    db.exec('ROLLBACK');
  } catch (e) {
    // Ignorar
  }

  process.exit(1);
} finally {
  db.close();
}
