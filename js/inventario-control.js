/* ========================================
   MÓDULO DE CONTROL DE INVENTARIO MEJORADO
   Sistema de validación y control de stock
   ======================================== */

const InventarioControl = {
  /**
   * Valida que el stock no sea negativo
   * @param {string} productoId - ID del producto
   * @param {number} cantidadARestar - Cantidad que se va a restar
   * @returns {Object} - {valido: boolean, mensaje: string, stockActual: number}
   */
  validarStockDisponible(productoId, cantidadARestar) {
    const producto = Database.getItem('productos', productoId);

    if (!producto) {
      return {
        valido: false,
        mensaje: 'Producto no encontrado',
        stockActual: 0,
      };
    }

    const stockResultante = producto.stock - cantidadARestar;

    if (stockResultante < 0) {
      return {
        valido: false,
        mensaje: `Stock insuficiente. Disponible: ${producto.stock}, Solicitado: ${cantidadARestar}`,
        stockActual: producto.stock,
      };
    }

    return {
      valido: true,
      mensaje: 'Stock disponible',
      stockActual: producto.stock,
      stockResultante: stockResultante,
    };
  },

  /**
   * Valida múltiples productos antes de una operación
   * @param {Array} items - Array de items con {productoId, cantidad}
   * @returns {Object} - {valido: boolean, errores: Array}
   */
  validarStockMultiple(items) {
    const errores = [];
    let todosValidos = true;

    items.forEach((item) => {
      const validacion = this.validarStockDisponible(item.productoId, item.cantidad);
      if (!validacion.valido) {
        todosValidos = false;
        const producto = Database.getItem('productos', item.productoId);
        errores.push({
          producto: producto ? producto.nombre : 'Desconocido',
          mensaje: validacion.mensaje,
        });
      }
    });

    return {
      valido: todosValidos,
      errores: errores,
    };
  },

  /**
   * Actualiza el stock de un producto de forma segura
   * @param {string} productoId - ID del producto
   * @param {number} cantidad - Cantidad a agregar (positivo) o restar (negativo)
   * @param {string} tipo - 'entrada' o 'salida'
   * @param {string} referencia - Referencia de la operación (número de venta/compra)
   * @param {Object} opciones - Opciones adicionales {referenciaId, motivo, notas}
   * @returns {Object} - {exito: boolean, mensaje: string}
   */
  actualizarStock(productoId, cantidad, tipo, referencia = '', opciones = {}) {
    const producto = Database.getItem('productos', productoId);

    if (!producto) {
      return {
        exito: false,
        mensaje: 'Producto no encontrado',
      };
    }

    // Calcular nuevo stock
    let nuevoStock;
    const cantidadAbs = Math.abs(cantidad);

    if (tipo === 'entrada') {
      nuevoStock = producto.stock + cantidadAbs;
    } else if (tipo === 'salida') {
      nuevoStock = producto.stock - cantidadAbs;
    } else {
      return {
        exito: false,
        mensaje: 'Tipo de operación inválido',
      };
    }

    // Validar que no sea negativo
    if (nuevoStock < 0) {
      return {
        exito: false,
        mensaje: `Operación cancelada: stock resultante sería negativo (${nuevoStock}). Stock disponible: ${producto.stock}`,
        stockDisponible: producto.stock,
      };
    }

    // Guardar stock anterior antes de actualizar
    const stockAnterior = producto.stock;

    // Actualizar stock en tiempo real
    producto.stock = nuevoStock;
    producto.updated_at = new Date().toISOString();
    Database.update('productos', productoId, producto);

    // Registrar movimiento en el historial
    const currentUser =
      typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
        ? Auth.getCurrentUser()
        : null;
    const usuario =
      currentUser?.username || currentUser?.nombre_usuario || currentUser?.nombre || 'Sistema';
    const fechaMovimiento =
      typeof Utils !== 'undefined' && typeof Utils.getCurrentDate === 'function'
        ? Utils.getCurrentDate()
        : new Date().toISOString().split('T')[0];
    const horaMovimiento =
      typeof Utils !== 'undefined' && typeof Utils.getCurrentTime === 'function'
        ? Utils.getCurrentTime()
        : new Date().toISOString().substring(11, 19);

    this.registrarMovimiento({
      productoId: productoId,
      productoNombre: producto.nombre,
      productoCodigo: producto.codigo,
      tipo: tipo,
      cantidad: cantidadAbs,
      stockAnterior: stockAnterior,
      stockNuevo: nuevoStock,
      referencia: referencia,
      referenciaId: opciones.referenciaId || null,
      motivo: opciones.motivo || (tipo === 'entrada' ? 'Compra' : 'Venta'),
      notas: opciones.notas || '',
      fecha: fechaMovimiento,
      hora: horaMovimiento,
      usuario,
    });

    // Alerta si el stock queda bajo
    if (nuevoStock <= producto.stockMinimo && nuevoStock > 0) {
      const mensaje = `Stock bajo para ${producto.nombre} (${nuevoStock} unidades)`;
      console.warn(`⚠️ ALERTA: ${mensaje}`);
      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast(mensaje, 'warning');
      }
      // 📱 Notificar a Telegram
      if (window.TelegramNotificaciones && TelegramNotificaciones.inicializado) {
        TelegramNotificaciones.enviarAlertaStockInmediata(producto, nuevoStock, opciones.motivo || tipo);
      }
    } else if (nuevoStock === 0) {
      const mensaje = `${producto.nombre} se ha agotado`;
      console.warn(`🚨 CRÍTICO: ${mensaje}`);
      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast(mensaje, 'error');
      }
      // 📱 Notificar a Telegram - Stock agotado
      if (window.TelegramNotificaciones && TelegramNotificaciones.inicializado) {
        TelegramNotificaciones.enviarAlertaStockInmediata(producto, 0, opciones.motivo || tipo);
      }
    }

    return {
      exito: true,
      mensaje: 'Stock actualizado correctamente',
      stockAnterior: stockAnterior,
      stockNuevo: nuevoStock,
      alertaStockBajo: nuevoStock <= producto.stockMinimo && nuevoStock > 0,
      stockAgotado: nuevoStock === 0,
    };
  },

  /**
   * Registra un movimiento de inventario para trazabilidad
   * @param {Object} movimiento - Datos del movimiento
   */
  registrarMovimiento(movimiento) {
    const movimientos = Database.getCollection('movimientosInventario') || [];
    movimiento.id = Utils.generateId();
    movimiento.timestamp = new Date().toISOString();

    // Enriquecer el movimiento con información adicional
    movimiento.tipoMovimiento =
      movimiento.tipo === 'entrada'
        ? 'entrada'
        : movimiento.tipo === 'salida'
          ? 'salida'
          : 'ajuste';

    movimientos.push(movimiento);
    Database.saveCollection('movimientosInventario', movimientos);

    console.log(
      `📦 Movimiento registrado: ${movimiento.tipoMovimiento} - ${movimiento.productoNombre} (${movimiento.cantidad} unidades)`
    );
  },

  /**
   * Obtiene el historial de movimientos de un producto
   * @param {string} productoId - ID del producto
   * @param {Object} filtros - Filtros opcionales {fechaInicio, fechaFin, tipo}
   * @returns {Array} - Array de movimientos
   */
  obtenerHistorialProducto(productoId, filtros = {}) {
    let movimientos = Database.getCollection('movimientosInventario') || [];

    // Filtrar por producto
    movimientos = movimientos.filter((m) => m.productoId === productoId);

    // Aplicar filtros adicionales
    if (filtros.fechaInicio) {
      movimientos = movimientos.filter((m) => m.fecha >= filtros.fechaInicio);
    }

    if (filtros.fechaFin) {
      movimientos = movimientos.filter((m) => m.fecha <= filtros.fechaFin);
    }

    if (filtros.tipo) {
      movimientos = movimientos.filter(
        (m) => m.tipo === filtros.tipo || m.tipoMovimiento === filtros.tipo
      );
    }

    return movimientos.reverse();
  },

  /**
   * Obtiene todos los movimientos recientes del inventario
   * @param {number} limite - Número máximo de registros a retornar
   * @returns {Array} - Array de movimientos
   */
  obtenerMovimientosRecientes(limite = 50) {
    const movimientos = Database.getCollection('movimientosInventario') || [];
    return movimientos.slice(-limite).reverse();
  },

  /**
   * Calcula el margen de ganancia de forma segura
   * @param {number} precioCompra - Precio de compra
   * @param {number} precioVenta - Precio de venta
   * @returns {number} - Margen en porcentaje
   */
  calcularMargenSeguro(precioCompra, precioVenta) {
    // Evitar división por cero
    if (!precioCompra || precioCompra <= 0) {
      return 0;
    }

    const margen = ((precioVenta - precioCompra) / precioCompra) * 100;
    return parseFloat(margen.toFixed(2));
  },

  /**
   * Valida precios antes de guardar un producto
   * @param {number} precioCompra - Precio de compra
   * @param {number} precioVenta - Precio de venta
   * @returns {Object} - {valido: boolean, errores: Array}
   */
  validarPrecios(precioCompra, precioVenta) {
    const errores = [];

    if (!precioCompra || precioCompra <= 0) {
      errores.push('El precio de compra debe ser mayor a 0');
    }

    if (!precioVenta || precioVenta <= 0) {
      errores.push('El precio de venta debe ser mayor a 0');
    }

    if (precioCompra > 0 && precioVenta > 0 && precioVenta < precioCompra) {
      errores.push('El precio de venta es menor al precio de compra (margen negativo)');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
    };
  },

  /**
   * Obtiene productos con stock bajo
   * @returns {Array} - Array de productos con stock crítico o bajo
   */
  obtenerProductosStockBajo() {
    const productos = Database.getCollection('productos');
    return productos
      .filter((p) => p.stock <= p.stockMinimo)
      .map((p) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        stock: p.stock,
        stockMinimo: p.stockMinimo,
        nivelCritico: p.stock === 0 ? 'sin-stock' : p.stock <= p.stockMinimo ? 'critico' : 'bajo',
      }));
  },

  /**
   * Obtiene productos sin stock
   * @returns {Array} - Array de productos agotados
   */
  obtenerProductosSinStock() {
    const productos = Database.getCollection('productos');
    return productos.filter((p) => p.stock === 0);
  },

  /**
   * Valida una operación de compra antes de procesarla
   * @param {Array} items - Items de la compra
   * @returns {Object} - {valido: boolean, errores: Array}
   */
  validarCompra(items) {
    const errores = [];

    if (!items || items.length === 0) {
      errores.push('La compra debe tener al menos un producto');
    }

    items.forEach((item, index) => {
      if (!item.productoId) {
        errores.push(`Item ${index + 1}: Producto no especificado`);
      }
      if (!item.cantidad || item.cantidad <= 0) {
        errores.push(`Item ${index + 1}: Cantidad inválida`);
      }
      if (!item.precioCompra || item.precioCompra < 0) {
        errores.push(`Item ${index + 1}: Precio de compra inválido`);
      }
    });

    return {
      valido: errores.length === 0,
      errores: errores,
    };
  },

  /**
   * Valida una operación de venta antes de procesarla
   * @param {Array} items - Items de la venta
   * @returns {Object} - {valido: boolean, errores: Array, advertencias: Array}
   */
  validarVenta(items) {
    const errores = [];
    const advertencias = [];

    if (!items || items.length === 0) {
      errores.push('La venta debe tener al menos un producto');
    }

    items.forEach((item, index) => {
      const esServicio = !item?.productoId || item?.tipo === 'servicio' || item?.sinInventario;
      if (esServicio) {
        if (!item?.nombre) {
          advertencias.push(`Item ${index + 1}: Servicio sin descripción`);
        }
        if (!item?.precio || item.precio < 0) {
          advertencias.push(`Item ${index + 1}: Revisa el precio del servicio`);
        }
        return;
      }

      const producto = Database.getItem('productos', item.productoId);

      if (!producto) {
        errores.push(`Item ${index + 1}: Producto no encontrado`);
        return;
      }

      if (!item.cantidad || item.cantidad <= 0) {
        errores.push(`Item ${index + 1}: Cantidad inválida`);
      }

      if (item.cantidad > producto.stock) {
        errores.push(
          `Item ${index + 1} (${producto.nombre}): Stock insuficiente. Disponible: ${producto.stock}, Solicitado: ${item.cantidad}`
        );
      }

      // Advertencia si el stock resultante será bajo
      const stockResultante = producto.stock - item.cantidad;
      if (stockResultante <= producto.stockMinimo && stockResultante >= 0) {
        advertencias.push(
          `${producto.nombre} quedará con stock bajo (${stockResultante} unidades)`
        );
      }
    });

    return {
      valido: errores.length === 0,
      errores: errores,
      advertencias: advertencias,
    };
  },

  /**
   * Genera un reporte de inventario
   * @returns {Object} - Resumen del inventario
   */
  generarReporteInventario() {
    const productos = Database.getCollection('productos');

    let totalProductos = productos.length;
    let valorTotalCompra = 0;
    let valorTotalVenta = 0;
    let productosSinStock = 0;
    let productosStockBajo = 0;
    let productosStockCritico = 0;

    productos.forEach((p) => {
      valorTotalCompra += p.stock * p.precioCompra;
      valorTotalVenta += p.stock * p.precioVenta;

      if (p.stock === 0) {
        productosSinStock++;
      } else if (p.stock <= p.stockMinimo) {
        productosStockCritico++;
      } else if (p.stock <= p.stockMinimo * 2) {
        productosStockBajo++;
      }
    });

    return {
      totalProductos: totalProductos,
      valorTotalCompra: valorTotalCompra,
      valorTotalVenta: valorTotalVenta,
      gananciaPotencial: valorTotalVenta - valorTotalCompra,
      margenPromedio:
        valorTotalCompra > 0
          ? (((valorTotalVenta - valorTotalCompra) / valorTotalCompra) * 100).toFixed(2)
          : 0,
      productosSinStock: productosSinStock,
      productosStockBajo: productosStockBajo,
      productosStockCritico: productosStockCritico,
      productosOk: totalProductos - productosSinStock - productosStockBajo - productosStockCritico,
      fecha: new Date().toISOString(),
    };
  },

  /**
   * Verifica la consistencia del inventario
   * @returns {Object} - Resultado de la verificación
   */
  verificarConsistencia() {
    const productos = Database.getCollection('productos');
    const problemas = [];

    productos.forEach((p) => {
      // Verificar stock negativo
      if (p.stock < 0) {
        problemas.push({
          tipo: 'stock-negativo',
          producto: p.nombre,
          mensaje: `Stock negativo: ${p.stock}`,
        });
      }

      // Verificar precios inválidos
      if (p.precioCompra <= 0) {
        problemas.push({
          tipo: 'precio-invalido',
          producto: p.nombre,
          mensaje: 'Precio de compra inválido o cero',
        });
      }

      if (p.precioVenta <= 0) {
        problemas.push({
          tipo: 'precio-invalido',
          producto: p.nombre,
          mensaje: 'Precio de venta inválido o cero',
        });
      }

      // Verificar margen negativo
      if (p.precioVenta < p.precioCompra) {
        problemas.push({
          tipo: 'margen-negativo',
          producto: p.nombre,
          mensaje: `Margen negativo: Compra $${p.precioCompra} > Venta $${p.precioVenta}`,
        });
      }
    });

    return {
      consistente: problemas.length === 0,
      problemas: problemas,
      totalProductosRevisados: productos.length,
    };
  },

  /**
   * Corrige problemas de inventario automáticamente
   * @returns {Object} - Resultado de las correcciones
   */
  corregirProblemasInventario() {
    const productos = Database.getCollection('productos');
    const correcciones = [];

    productos.forEach((p) => {
      let modificado = false;

      // Corregir stock negativo
      if (p.stock < 0) {
        correcciones.push(`${p.nombre}: Stock negativo (${p.stock}) ajustado a 0`);
        p.stock = 0;
        modificado = true;
      }

      // Corregir precios inválidos
      if (p.precioCompra <= 0) {
        correcciones.push(`${p.nombre}: Precio de compra inválido ajustado a 0.01`);
        p.precioCompra = 0.01;
        modificado = true;
      }

      if (p.precioVenta <= 0) {
        correcciones.push(
          `${p.nombre}: Precio de venta inválido ajustado a precio de compra + 30%`
        );
        p.precioVenta = p.precioCompra * 1.3;
        modificado = true;
      }

      // Advertencia de margen negativo (no se corrige automáticamente)
      if (p.precioVenta < p.precioCompra) {
        correcciones.push(
          `${p.nombre}: ADVERTENCIA - Margen negativo detectado (requiere revisión manual)`
        );
      }

      if (modificado) {
        Database.update('productos', p.id, p);
      }
    });

    return {
      correcciones: correcciones,
      totalCorregidos: correcciones.length,
    };
  },

  /**
   * Obtiene estadísticas de ventas por producto
   * @param {string} productoId - ID del producto
   * @param {Object} filtros - Filtros opcionales {fechaInicio, fechaFin}
   * @returns {Object} - Estadísticas de ventas
   */
  obtenerEstadisticasVentasProducto(productoId, filtros = {}) {
    const ventas = Database.getCollection('ventas') || [];
    let detallesVentas = [];

    // Recopilar todos los detalles de ventas del producto
    ventas.forEach((venta) => {
      if (venta.items && Array.isArray(venta.items)) {
        venta.items.forEach((item) => {
          if (item.productoId === productoId) {
            detallesVentas.push({
              ...item,
              ventaId: venta.id,
              fecha: venta.fecha,
              hora: venta.hora,
              clienteId: venta.clienteId,
              clienteNombre: venta.clienteNombre,
              metodoPago: venta.metodoPago,
              estado: venta.estado,
            });
          }
        });
      }
    });

    // Aplicar filtros de fecha
    if (filtros.fechaInicio) {
      detallesVentas = detallesVentas.filter((d) => d.fecha >= filtros.fechaInicio);
    }

    if (filtros.fechaFin) {
      detallesVentas = detallesVentas.filter((d) => d.fecha <= filtros.fechaFin);
    }

    // Solo ventas completadas
    detallesVentas = detallesVentas.filter((d) => d.estado === 'completada');

    // Calcular estadísticas
    const totalVentas = detallesVentas.length;
    const cantidadTotal = detallesVentas.reduce((sum, d) => sum + (d.cantidad || 0), 0);
    const ingresoTotal = detallesVentas.reduce((sum, d) => sum + (d.total || 0), 0);
    const precioPromedio = totalVentas > 0 ? ingresoTotal / cantidadTotal : 0;

    const producto = Database.getItem('productos', productoId);
    const costoTotal = cantidadTotal * (producto?.precioCompra || 0);
    const gananciaBruta = ingresoTotal - costoTotal;
    const margenPromedio = costoTotal > 0 ? (gananciaBruta / costoTotal) * 100 : 0;

    return {
      productoId,
      productoNombre: producto?.nombre || 'Desconocido',
      totalVentas,
      cantidadTotal,
      ingresoTotal,
      costoTotal,
      gananciaBruta,
      margenPromedio: parseFloat(margenPromedio.toFixed(2)),
      precioPromedio: parseFloat(precioPromedio.toFixed(2)),
      detalles: detallesVentas,
    };
  },

  /**
   * Genera reporte de productos más vendidos
   * @param {Object} filtros - Filtros {fechaInicio, fechaFin, limite}
   * @returns {Array} - Array de productos ordenados por ventas
   */
  generarReporteProductosMasVendidos(filtros = {}) {
    const limite = filtros.limite || 20;
    const productos = Database.getCollection('productos') || [];
    const estadisticas = [];

    productos.forEach((producto) => {
      const stats = this.obtenerEstadisticasVentasProducto(producto.id, filtros);
      if (stats.cantidadTotal > 0) {
        estadisticas.push({
          ...stats,
          stockActual: producto.stock,
          stockMinimo: producto.stockMinimo,
          categoria: producto.categoria,
          codigo: producto.codigo,
        });
      }
    });

    // Ordenar por cantidad vendida
    estadisticas.sort((a, b) => b.cantidadTotal - a.cantidadTotal);

    return estadisticas.slice(0, limite);
  },
};

// Exportar módulo
window.InventarioControl = InventarioControl;
