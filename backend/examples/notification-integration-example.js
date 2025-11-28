// ============================================
// EJEMPLO DE INTEGRACIÓN COMPLETA
// ============================================
// Ejemplo real de cómo integrar notificaciones en un endpoint existente

const express = require('express');

const { authenticate } = require('../middleware/auth');
const { notifyStockBajo, notifyProductoVencer } = require('../utils/notification-helper');

/**
 * Ejemplo 1: Endpoint de actualización de stock
 * Detecta automáticamente stock bajo y envía notificación
 */
function setupProductoRoutes(app, db) {
  // Actualizar stock de producto
  app.put('/api/productos/:id/stock', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const { cantidad, operacion } = req.body; // operacion: 'suma' | 'resta' | 'establece'
      const usuario = req.user;

      // Obtener producto actual
      const producto = db
        .prepare(
          `
        SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
        WHERE p.id = ? AND p.negocio_id = ?
      `
        )
        .get(id, usuario.negocio_id);

      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      // Calcular nuevo stock
      let nuevoStock = producto.stock;
      switch (operacion) {
        case 'suma':
          nuevoStock += cantidad;
          break;
        case 'resta':
          nuevoStock -= cantidad;
          break;
        case 'establece':
          nuevoStock = cantidad;
          break;
      }

      if (nuevoStock < 0) {
        return res.status(400).json({ error: 'Stock no puede ser negativo' });
      }

      // Actualizar en BD
      db.prepare(
        `
        UPDATE productos 
        SET stock = ?, updated_at = datetime('now')
        WHERE id = ?
      `
      ).run(nuevoStock, id);

      // ✅ INTEGRACIÓN: Verificar si quedó bajo stock mínimo
      if (nuevoStock <= producto.stock_minimo && producto.stock > producto.stock_minimo) {
        // Solo notificar si cruzó el umbral
        await notifyStockBajo({ ...producto, stock: nuevoStock }, usuario.negocio_id);
      }

      res.json({
        success: true,
        data: {
          id: producto.id,
          stock_anterior: producto.stock,
          stock_nuevo: nuevoStock,
          stock_minimo: producto.stock_minimo,
          alerta_generada: nuevoStock <= producto.stock_minimo,
        },
      });
    } catch (error) {
      console.error('Error actualizando stock:', error);
      res.status(500).json({ error: 'Error al actualizar stock' });
    }
  });

  /**
   * Ejemplo 2: Job automático de verificación de productos por vencer
   * Se ejecuta diariamente con cron
   */
  const cron = require('node-cron');

  cron.schedule('0 8 * * *', async () => {
    console.log('🔍 Verificando productos próximos a vencer...');

    try {
      // Obtener productos que vencen en los próximos 30 días
      const productosVencer = db
        .prepare(
          `
        SELECT p.*, c.nombre as categoria_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE p.fecha_vencimiento IS NOT NULL
        AND DATE(p.fecha_vencimiento) <= DATE('now', '+30 days')
        AND DATE(p.fecha_vencimiento) >= DATE('now')
        AND p.activo = 1
        ORDER BY p.fecha_vencimiento ASC
      `
        )
        .all();

      for (const producto of productosVencer) {
        const diasRestantes = Math.ceil(
          (new Date(producto.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24)
        );

        // ✅ INTEGRACIÓN: Notificar productos que vencen pronto
        await notifyProductoVencer(producto, producto.negocio_id, diasRestantes);
      }

      console.log(`✅ Procesados ${productosVencer.length} productos por vencer`);
    } catch (error) {
      console.error('Error en verificación de vencimientos:', error);
    }
  });

  /**
   * Ejemplo 3: Endpoint de creación de venta
   * Genera notificación si está habilitada
   */
  app.post('/api/ventas', authenticate, async (req, res) => {
    try {
      const { items, cliente_id, metodo_pago, ...ventaData } = req.body;
      const usuario = req.user;

      // Calcular total
      let total = 0;
      const itemsConPrecios = [];

      for (const item of items) {
        const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(item.producto_id);
        if (!producto) continue;

        const subtotal = producto.precio_venta * item.cantidad;
        total += subtotal;

        itemsConPrecios.push({
          ...item,
          precio_unitario: producto.precio_venta,
          subtotal,
        });

        // Actualizar stock
        db.prepare(
          `
          UPDATE productos 
          SET stock = stock - ?
          WHERE id = ?
        `
        ).run(item.cantidad, item.producto_id);

        // Verificar stock bajo después de la venta
        const productoActualizado = db
          .prepare('SELECT * FROM productos WHERE id = ?')
          .get(item.producto_id);
        if (productoActualizado.stock <= productoActualizado.stock_minimo) {
          await notifyStockBajo(productoActualizado, usuario.negocio_id);
        }
      }

      // Crear venta
      const ventaId = require('uuid').v4();

      db.prepare(
        `
        INSERT INTO ventas (
          id, negocio_id, cliente_id, vendedor_id,
          total, metodo_pago, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `
      ).run(ventaId, usuario.negocio_id, cliente_id, usuario.id, total, metodo_pago);

      // Insertar items
      for (const item of itemsConPrecios) {
        db.prepare(
          `
          INSERT INTO venta_items (
            venta_id, producto_id, cantidad, precio_unitario, subtotal
          ) VALUES (?, ?, ?, ?, ?)
        `
        ).run(ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal);
      }

      // Obtener cliente
      const cliente = db.prepare('SELECT nombre FROM clientes WHERE id = ?').get(cliente_id);

      // ✅ INTEGRACIÓN: Notificar venta (si está habilitado en preferencias)
      const { notifyVenta } = require('../utils/notification-helper');
      await notifyVenta(
        {
          id: ventaId,
          total,
          cliente_nombre: cliente?.nombre || 'Cliente general',
          items_count: items.length,
          metodo_pago,
          vendedor_id: usuario.id,
        },
        usuario.negocio_id
      );

      res.status(201).json({
        success: true,
        data: {
          id: ventaId,
          total,
          items: items.length,
        },
      });
    } catch (error) {
      console.error('Error creando venta:', error);
      res.status(500).json({ error: 'Error al crear venta' });
    }
  });
}

/**
 * Ejemplo 4: Integración con módulo de órdenes de trabajo
 */
function setupOrdenTrabajoIntegration(app, db) {
  const { notifyOrdenTrabajo } = require('../utils/notification-helper');

  // Actualizar estado de orden
  app.put('/api/ordenes/:id/estado', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      const usuario = req.user;

      // Obtener orden completa
      const orden = db
        .prepare(
          `
        SELECT 
          o.*,
          v.placa as vehiculo_placa,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono,
          u.nombre as tecnico_nombre
        FROM ordenes_trabajo o
        LEFT JOIN vehiculos v ON o.vehiculo_id = v.id
        LEFT JOIN clientes c ON o.cliente_id = c.id
        LEFT JOIN usuarios u ON o.tecnico_id = u.id
        WHERE o.id = ? AND o.negocio_id = ?
      `
        )
        .get(id, usuario.negocio_id);

      if (!orden) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      // Actualizar estado
      db.prepare(
        `
        UPDATE ordenes_trabajo
        SET estado = ?, updated_at = datetime('now')
        WHERE id = ?
      `
      ).run(estado, id);

      // ✅ INTEGRACIÓN: Notificar cambio de estado
      let accion = 'actualizada';
      if (estado === 'completada') accion = 'completada';
      if (estado === 'lista_entrega') accion = 'entregada';

      await notifyOrdenTrabajo({ ...orden, estado }, usuario.negocio_id, accion);

      // Si está lista para entrega, enviar mensaje especial a Telegram
      if (estado === 'lista_entrega' && orden.cliente_telefono) {
        // Integrar con módulo Telegram existente
        if (global.TelegramNotificaciones) {
          await global.TelegramNotificaciones.enviarNotificacionEntrega(
            { nombre: orden.cliente_nombre, telefono: orden.cliente_telefono },
            { placa: orden.vehiculo_placa },
            orden
          );
        }
      }

      res.json({
        success: true,
        data: { id, estado, notificado: true },
      });
    } catch (error) {
      console.error('Error actualizando orden:', error);
      res.status(500).json({ error: 'Error al actualizar orden' });
    }
  });
}

/**
 * Ejemplo 5: Integración con sistema de tareas/agenda
 */
function setupAgendaIntegration(app, db) {
  const { notifyTarea, notifyCita } = require('../utils/notification-helper');

  // Verificar tareas próximas a vencer (job diario)
  const cron = require('node-cron');

  cron.schedule('0 9 * * *', async () => {
    console.log('📅 Verificando tareas y citas del día...');

    try {
      // Tareas que vencen hoy o en 3 días
      const tareas = db
        .prepare(
          `
        SELECT * FROM tareas
        WHERE estado != 'completada'
        AND DATE(fecha_vencimiento) <= DATE('now', '+3 days')
        AND DATE(fecha_vencimiento) >= DATE('now')
        ORDER BY fecha_vencimiento ASC
      `
        )
        .all();

      for (const tarea of tareas) {
        await notifyTarea(tarea, tarea.negocio_id, 'recordatorio');
      }

      // Citas del día
      const citas = db
        .prepare(
          `
        SELECT 
          c.*,
          cl.nombre as cliente_nombre
        FROM citas c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        WHERE DATE(c.fecha_hora) = DATE('now')
        AND c.estado != 'cancelada'
        ORDER BY c.fecha_hora ASC
      `
        )
        .all();

      for (const cita of citas) {
        await notifyCita(cita, cita.negocio_id, 'recordatorio');
      }

      console.log(`✅ Procesadas ${tareas.length} tareas y ${citas.length} citas`);
    } catch (error) {
      console.error('Error en verificación de agenda:', error);
    }
  });
}

module.exports = {
  setupProductoRoutes,
  setupOrdenTrabajoIntegration,
  setupAgendaIntegration,
};
