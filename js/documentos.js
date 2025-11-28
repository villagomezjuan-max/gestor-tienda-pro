// js/documentos.js
// Módulo central para la gestión de documentos fiscales (Facturas, Retenciones, etc.)

class DocumentosController {
  constructor() {
    this.db = typeof Database !== 'undefined' ? Database : null;
    if (!this.db) {
      console.warn('DocumentosController: Database no disponible.');
    }
    this.secuencialKeys = {
      factura: 'secuencialFactura',
      retencion: 'secuencialRetencion',
      guia: 'secuencialGuia',
      guiaRemision: 'secuencialGuia',
      notaCredito: 'secuencialNotaCredito',
      notaDebito: 'secuencialNotaDebito',
      proforma: 'secuencialProforma',
    };
  }

  _getCurrentBusinessId() {
    if (this.db && typeof this.db.getCurrentBusiness === 'function') {
      return this.db.getCurrentBusiness();
    }
    return null;
  }

  _normalizeProductCode(codigo, descripcion) {
    const base = (codigo || descripcion || '').toString().trim();
    if (!base) {
      return '';
    }

    if (codigo && codigo.toString().trim()) {
      return codigo.toString().trim();
    }

    const normalized = typeof base.normalize === 'function' ? base.normalize('NFD') : base;

    return normalized
      .replace(/[^\w\d]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toUpperCase()
      .slice(0, 48);
  }

  _buildProductFromItem({ item, codigo, negocioId }) {
    const nombre = item.descripcion || item.nombre || `Producto ${codigo}`;
    const precioVenta = Number(item.precioUnitario || item.precio || item.precio_total || 0) || 0;
    const precioCompra = Number(item.precioCompra || item.costo || precioVenta) || 0;
    const nowIso = new Date().toISOString();

    return {
      id: this.generarId('PROD'),
      codigo,
      nombre,
      descripcion: item.descripcion || nombre,
      categoria: item.categoria || item.categoriaNombre || 'General',
      categoriaId: item.categoriaId || null,
      precioVenta,
      precioCompra,
      stock: 0,
      stockMinimo: 0,
      unidad: item.unidad || 'unidad',
      activo: true,
      negocioId: negocioId || null,
      origen: 'facturacion',
      createdAt: nowIso,
      updatedAt: nowIso,
      ultimaFacturaId: item.facturaId || null,
    };
  }

  _buildProductUpdates(producto, item, factura) {
    const updates = {};
    const descripcion = item.descripcion || item.nombre || '';
    const precioVenta = Number(item.precioUnitario || item.precio || item.precio_total || 0) || 0;

    if (descripcion && (!producto.nombre || producto.nombre === producto.codigo)) {
      updates.nombre = descripcion;
    }

    if (
      descripcion &&
      (!producto.descripcion || producto.descripcion.length < descripcion.length)
    ) {
      updates.descripcion = descripcion;
    }

    if (
      precioVenta > 0 &&
      (!Number.isFinite(producto.precioVenta) ||
        Math.abs(producto.precioVenta - precioVenta) > 0.009)
    ) {
      updates.precioVenta = precioVenta;
    }

    if (
      precioVenta > 0 &&
      (!Number.isFinite(producto.precioCompra) || producto.precioCompra === 0)
    ) {
      updates.precioCompra = precioVenta;
    }

    if (item.unidad && !producto.unidad) {
      updates.unidad = item.unidad;
    }

    if (Object.keys(updates).length === 0) {
      return null;
    }

    updates.updatedAt = new Date().toISOString();
    updates.ultimaFacturaId = factura?.id || null;
    return updates;
  }

  _notifyProductosActualizados(payload = {}) {
    try {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('productosActualizados', { detail: payload }));
      }
    } catch (error) {
      console.warn('DocumentosController: no se pudo notificar actualización de productos', error);
    }
  }

  _syncProductosDesdeFactura(factura, items) {
    if (!this.db || !Array.isArray(items) || !items.length) {
      return;
    }

    const productos = this.db.getCollection('productos') || [];
    const negocioId = this._getCurrentBusinessId();
    const mapPorCodigo = new Map();
    productos.forEach((producto) => {
      const key = (producto.codigo || '').toString().trim().toLowerCase();
      if (key) {
        mapPorCodigo.set(key, producto);
      }
    });

    let huboCambios = false;

    items.forEach((item) => {
      const codigo = this._normalizeProductCode(
        item.codigoPrincipal || item.codigo,
        item.descripcion || item.nombre
      );
      if (codigo) {
        item.codigoPrincipal = codigo;
        item.codigo = codigo;
      }

      if (!codigo) {
        return;
      }

      const key = codigo.toLowerCase();
      let producto = mapPorCodigo.get(key);

      if (!producto) {
        producto = this._buildProductFromItem({ item, codigo, negocioId });
        productos.push(producto);
        mapPorCodigo.set(key, producto);
        huboCambios = true;
      } else {
        const updates = this._buildProductUpdates(producto, item, factura);
        if (updates) {
          Object.assign(producto, updates);
          huboCambios = true;
        }
      }

      if (producto && !item.productoId) {
        item.productoId = producto.id;
      }
    });

    if (huboCambios) {
      this.db.saveCollection('productos', productos);
      this._notifyProductosActualizados({
        facturaId: factura?.id || null,
        total: productos.length,
        source: 'facturacion',
      });
    }
  }

  generarId(prefijo = 'DOC') {
    if (typeof Utils !== 'undefined' && typeof Utils.generateId === 'function') {
      return Utils.generateId();
    }
    const random = Math.random().toString(16).slice(2, 10);
    return `${prefijo}-${Date.now()}-${random}`;
  }

  getConfigAvanzada() {
    return this.db?.get('configuracionAvanzada') || {};
  }

  getSriConfig() {
    const configAvanzada = this.getConfigAvanzada();
    return configAvanzada.sri || {};
  }

  getConfiguracionFiscal() {
    const tienda = this.db?.get('configTienda') || {};

    const configAvanzada = this.getConfigAvanzada();
    const sri = configAvanzada.sri || {};
    const general = configAvanzada.general || {};

    const razonSocial =
      sri.razonSocial ||
      general.razonSocial ||
      general.nombreNegocio ||
      tienda.nombreTienda ||
      'Mi Tienda';
    const nombreComercial =
      sri.nombreComercial ||
      general.nombreComercial ||
      general.nombreNegocio ||
      tienda.nombreTienda ||
      razonSocial;
    const direccionMatriz =
      sri.direccionMatriz || general.direccionMatriz || general.direccion || tienda.direccion || '';
    const direccionSucursal =
      sri.direccionSucursal || general.direccionSucursal || tienda.direccion || direccionMatriz;
    const contribuyenteEspecial = sri.contribuyenteEspecial || general.contribuyenteEspecial || '';
    const obligadoContabilidad =
      (sri.obligadoContabilidad || general.obligadoContabilidad || 'NO')
        .toString()
        .toUpperCase() === 'SI'
        ? 'SI'
        : 'NO';
    const regimenTributario = (sri.regimenTributario || general.regimenTributario || '').trim();
    const numeroResolucion = (sri.numeroResolucion || general.numeroResolucion || '').trim();
    const telefono = sri.telefono || general.telefono || tienda.telefono || '';
    const email = sri.emailNotificaciones || general.email || tienda.email || '';

    const establecimiento = sri.establecimiento || tienda.establecimiento || '001';
    const puntoEmision = sri.puntoEmision || tienda.puntoEmision || '001';

    const endpoints =
      window.SRIIntegration && typeof SRIIntegration.getEndpoints === 'function'
        ? SRIIntegration.getEndpoints(sri.ambiente || 'pruebas')
        : null;

    return {
      nombre: nombreComercial,
      razon_social: razonSocial,
      nombreComercial,
      ruc: sri.ruc || general.ruc || tienda.ruc || '',
      direccion: direccionMatriz,
      direccionMatriz,
      direccionSucursal,
      telefono,
      email,
      contribuyenteEspecial,
      obligadoContabilidad,
      regimenTributario,
      numeroResolucion,
      ambiente: sri.ambiente || 'pruebas',
      tipoEmision: sri.tipoEmision || 'normal',
      establecimiento,
      puntoEmision,
      wsRecepcion: sri.wsRecepcion || endpoints?.recepcion || '',
      wsAutorizacion: sri.wsAutorizacion || endpoints?.autorizacion || '',
      wsConsulta: sri.wsConsulta || endpoints?.consulta || '',
      secuenciales: {
        factura: sri.secuencialFactura || null,
        retencion: sri.secuencialRetencion || null,
        guia: sri.secuencialGuia || null,
        notaCredito: sri.secuencialNotaCredito || null,
        notaDebito: sri.secuencialNotaDebito || null,
        proforma: sri.secuencialProforma || null,
      },
    };
  }

  obtenerColeccionPorTipo(tipo) {
    const mapa = {
      factura: 'facturas',
      retencion: 'retenciones',
      guia: 'guiasRemision',
      guiaRemision: 'guiasRemision',
      notaCredito: 'notasCredito',
      notaDebito: 'notasDebito',
      proforma: 'proformas',
    };
    return mapa[tipo] || `${tipo}s`;
  }

  getNextSecuencial(tipo, establecimiento = '001', puntoEmision = '001') {
    if (!this.db) {
      return `${establecimiento}-${puntoEmision}-000000001`;
    }

    const claveSecuencial = this.secuencialKeys[tipo];
    const configAvanzada = this.getConfigAvanzada();
    const sri = configAvanzada.sri || {};
    const secuencialConfigurado = claveSecuencial ? parseInt(sri[claveSecuencial], 10) : NaN;

    if (Number.isFinite(secuencialConfigurado) && secuencialConfigurado > 0) {
      const numero = `${establecimiento}-${puntoEmision}-${String(secuencialConfigurado).padStart(9, '0')}`;
      this.actualizarSecuencialConfig(tipo, secuencialConfigurado + 1, configAvanzada);
      return numero;
    }

    const collectionName = this.obtenerColeccionPorTipo(tipo);
    const documentos = this.db.getCollection(collectionName) || [];
    const prefijo = `${establecimiento}-${puntoEmision}-`;

    const maxSecuencial = documentos
      .filter((doc) => typeof doc.numero === 'string' && doc.numero.startsWith(prefijo))
      .map((doc) => parseInt(doc.numero.slice(prefijo.length), 10))
      .filter(Number.isFinite)
      .reduce((max, sec) => Math.max(max, sec), 0);

    const siguiente = (maxSecuencial || 0) + 1;
    const numero = `${establecimiento}-${puntoEmision}-${String(siguiente).padStart(9, '0')}`;
    this.actualizarSecuencialConfig(tipo, siguiente + 1, configAvanzada);
    return numero;
  }

  actualizarSecuencialConfig(tipo, siguienteValor, configAvanzada = null) {
    if (!this.db) return;
    const clave = this.secuencialKeys[tipo];
    if (!clave || !Number.isFinite(siguienteValor)) return;

    const config = configAvanzada || this.getConfigAvanzada();
    if (!config.sri) {
      config.sri = {};
    }
    config.sri[clave] = String(Math.max(1, parseInt(siguienteValor, 10)));
    this.db.set('configuracionAvanzada', config);
  }

  registrarFactura(payload = {}) {
    if (!this.db) {
      throw new Error('Database no disponible para registrar facturas.');
    }

    const config = this.getConfiguracionFiscal();
    const numero = this.getNextSecuencial(
      'factura',
      config.establecimiento || '001',
      config.puntoEmision || '001'
    );

    const factura = {
      id: payload.id || this.generarId('FAC'),
      ventaId: payload.ventaId || null,
      clienteId: payload.clienteId || null,
      clienteNombre: payload.clienteNombre || payload.cliente?.nombre || null,
      clienteIdentificacion:
        payload.cliente?.cedula ||
        payload.cliente?.ruc ||
        payload.cliente?.identificacion ||
        payload.clienteIdentificacion ||
        null,
      clienteDireccion: payload.cliente?.direccion || payload.clienteDireccion || null,
      clienteTelefono: payload.cliente?.telefono || payload.clienteTelefono || null,
      clienteEmail: payload.cliente?.email || payload.clienteEmail || null,
      numero,
      secuencial: numero.split('-')[2],
      fecha: payload.fecha || new Date().toISOString(),
      subtotal12: Number(payload.subtotal12 ?? 0),
      subtotal0: Number(payload.subtotal0 ?? 0),
      descuento: Number(payload.descuento ?? 0),
      iva: Number(payload.iva ?? 0),
      total: Number(payload.total ?? 0),
      estado: payload.estado || 'emitida',
      autorizadoSri: payload.autorizadoSri || false,
      claveAcceso: payload.claveAcceso || null,
      establecimiento: config.establecimiento,
      puntoEmision: config.puntoEmision,
      ambiente: config.ambiente,
      tipoEmision: config.tipoEmision,
      createdAt: new Date().toISOString(),
    };

    const items = (payload.items || []).map((item) => {
      const precioUnitario = Number(
        item.precio || item.precioUnitario || item.precio_unitario || 0
      );
      const cantidad = Number(item.cantidad || 0);
      const descuentoLinea = Number(item.descuento || 0);
      const subtotal = Number(
        item.subtotal || item.precio_total || precioUnitario * cantidad - descuentoLinea
      );
      const ivaAplicado = item.iva_aplicado ?? item.iva ?? 12;

      return {
        id: this.generarId('FI'),
        facturaId: factura.id,
        productoId: item.productoId || null,
        codigoPrincipal: item.codigo || item.codigoPrincipal || '',
        descripcion: item.nombre || item.descripcion || '',
        cantidad,
        precioUnitario,
        precio_unitario: precioUnitario,
        descuento: descuentoLinea,
        ivaAplicado,
        iva_aplicado: ivaAplicado,
        precioTotal: subtotal,
        precio_total: subtotal,
      };
    });

    if (factura.subtotal12 === 0 && factura.subtotal0 === 0) {
      const acumulados = items.reduce(
        (acc, item) => {
          if ((item.ivaAplicado || 0) > 0) {
            acc.subtotal12 += item.precioTotal || 0;
          } else {
            acc.subtotal0 += item.precioTotal || 0;
          }
          return acc;
        },
        { subtotal12: 0, subtotal0: 0 }
      );
      factura.subtotal12 = Number(acumulados.subtotal12.toFixed(2));
      factura.subtotal0 = Number(acumulados.subtotal0.toFixed(2));
    }

    if (!payload.iva) {
      const ivaCalculado = items.reduce((acc, item) => {
        const tarifa = Number(item.ivaAplicado || 0);
        if (tarifa > 0) {
          const base = Number(item.precioTotal || 0) - Number(item.descuento || 0);
          acc += base * (tarifa / 100);
        }
        return acc;
      }, 0);
      factura.iva = Number(ivaCalculado.toFixed(2));
    }

    if (factura.total === 0) {
      const totalCalculado =
        items.reduce((acc, item) => acc + Number(item.precioTotal || 0), 0) -
        Number(factura.descuento || 0) +
        Number(factura.iva || 0);
      factura.total = Number(totalCalculado.toFixed(2));
    }

    this._syncProductosDesdeFactura(factura, items);

    this.db.add('facturas', factura);
    items.forEach((item) => this.db.add('facturaItems', item));

    return { factura, items };
  }

  registrarRetencion(payload = {}) {
    if (!this.db) {
      throw new Error('Database no disponible para registrar retenciones.');
    }

    const config = this.getConfiguracionFiscal();
    const numero = this.getNextSecuencial('retencion', config.establecimiento, config.puntoEmision);

    const retencion = {
      id: payload.id || this.generarId('RET'),
      compraId: payload.compraId || null,
      proveedorId: payload.proveedorId || payload.proveedor?.id || null,
      proveedorNombre: payload.proveedorNombre || payload.proveedor?.nombre || null,
      proveedorIdentificacion:
        payload.proveedor?.identificacion || payload.proveedorIdentificacion || null,
      numero,
      fecha: payload.fecha || new Date().toISOString(),
      estado: payload.estado || 'emitida',
      claveAcceso: payload.claveAcceso || null,
      autorizadoSri: payload.autorizadoSri || false,
      compraReferencia: payload.compraReferencia || null,
      observaciones: payload.observaciones || '',
      createdAt: new Date().toISOString(),
    };

    const items = (payload.detalles || payload.items || []).map((detalle) => {
      const base = Number(detalle.base || detalle.baseImponible || 0);
      const porcentaje = Number(detalle.porcentaje || detalle.tarifa || 0);
      const valorIngresado = Number(detalle.valor || detalle.valorRetenido || 0);
      const valorCalculado = valorIngresado > 0 ? valorIngresado : base * (porcentaje / 100);

      return {
        id: this.generarId('RI'),
        retencionId: retencion.id,
        impuesto: detalle.impuesto || detalle.tipoImpuesto || 'IVA',
        concepto: detalle.concepto || detalle.descripcion || '',
        codigo: detalle.codigo || detalle.codigoRetencion || '',
        base: Number(base.toFixed(2)),
        porcentaje: Number(porcentaje.toFixed(4)),
        valor: Number(valorCalculado.toFixed(2)),
      };
    });

    retencion.total = Number(
      items.reduce((acc, item) => acc + Number(item.valor || 0), 0).toFixed(2)
    );

    this.db.add('retenciones', retencion);
    items.forEach((item) => this.db.add('retencionItems', item));

    return { retencion, items };
  }

  registrarGuiaRemision(payload = {}) {
    if (!this.db) {
      throw new Error('Database no disponible para registrar guías de remisión.');
    }

    const config = this.getConfiguracionFiscal();
    const numero = this.getNextSecuencial(
      'guiaRemision',
      config.establecimiento,
      config.puntoEmision
    );

    const guia = {
      id: payload.id || this.generarId('GUI'),
      numero,
      fecha: payload.fecha || new Date().toISOString(),
      estado: payload.estado || 'emitida',
      puntoPartida: payload.puntoPartida || config.direccion || config.direccionMatriz || '',
      puntoLlegada: payload.puntoLlegada || '',
      transportistaId: payload.transportistaId || payload.transportista?.id || null,
      transportistaNombre: payload.transportistaNombre || payload.transportista?.nombre || '',
      transportistaIdentificacion:
        payload.transportista?.identificacion || payload.transportistaIdentificacion || '',
      placa: payload.placa || payload.vehiculo?.placa || '',
      fechaInicioTransporte: payload.fechaInicioTransporte || payload.fechaInicio || null,
      fechaFinTransporte: payload.fechaFinTransporte || payload.fechaFin || null,
      destinatarios: payload.destinatarios || [],
      autorizadoSri: payload.autorizadoSri || false,
      claveAcceso: payload.claveAcceso || null,
      observaciones: payload.observaciones || '',
      createdAt: new Date().toISOString(),
    };

    this.db.add('guiasRemision', guia);
    return { guia };
  }

  registrarNotaCredito(payload = {}) {
    if (!this.db) {
      throw new Error('Database no disponible para registrar notas de crédito.');
    }

    const config = this.getConfiguracionFiscal();
    const numero = this.getNextSecuencial(
      'notaCredito',
      config.establecimiento,
      config.puntoEmision
    );

    const nota = {
      id: payload.id || this.generarId('NC'),
      facturaId: payload.facturaId || null,
      numero,
      fecha: payload.fecha || new Date().toISOString(),
      motivo: payload.motivo || '',
      total: Number(payload.total ?? 0),
      estado: payload.estado || 'emitida',
      autorizadoSri: payload.autorizadoSri || false,
      claveAcceso: payload.claveAcceso || null,
      items: payload.items || [],
      createdAt: new Date().toISOString(),
    };

    this.db.add('notasCredito', nota);
    return { nota };
  }

  registrarNotaDebito(payload = {}) {
    if (!this.db) {
      throw new Error('Database no disponible para registrar notas de débito.');
    }

    const config = this.getConfiguracionFiscal();
    const numero = this.getNextSecuencial(
      'notaDebito',
      config.establecimiento,
      config.puntoEmision
    );

    const nota = {
      id: payload.id || this.generarId('ND'),
      facturaId: payload.facturaId || null,
      numero,
      fecha: payload.fecha || new Date().toISOString(),
      motivo: payload.motivo || '',
      recargo: Number(payload.recargo ?? 0),
      impuestos: payload.impuestos || [],
      total: Number(payload.total ?? 0),
      estado: payload.estado || 'emitida',
      autorizadoSri: payload.autorizadoSri || false,
      claveAcceso: payload.claveAcceso || null,
      createdAt: new Date().toISOString(),
    };

    this.db.add('notasDebito', nota);
    return { nota };
  }

  registrarProforma(payload = {}) {
    if (!this.db) {
      throw new Error('Database no disponible para registrar proformas.');
    }

    const config = this.getConfiguracionFiscal();
    const numero = this.getNextSecuencial('proforma', config.establecimiento, config.puntoEmision);

    const proforma = {
      id: payload.id || this.generarId('PRO'),
      clienteId: payload.clienteId || null,
      clienteNombre: payload.clienteNombre || payload.cliente?.nombre || null,
      clienteIdentificacion:
        payload.clienteIdentificacion || payload.cliente?.identificacion || null,
      clienteEmail: payload.clienteEmail || payload.cliente?.email || null,
      clienteTelefono: payload.clienteTelefono || payload.cliente?.telefono || null,
      numero,
      fecha: payload.fecha || new Date().toISOString(),
      subtotal: Number(payload.subtotal ?? 0),
      subtotal12: Number(payload.subtotal12 ?? 0),
      subtotal0: Number(payload.subtotal0 ?? 0),
      descuento: Number(payload.descuento ?? 0),
      iva: Number(payload.iva ?? 0),
      total: Number(payload.total ?? 0),
      items: payload.items || [],
      estado: payload.estado || 'borrador',
      notas: payload.notas || '',
      validez: payload.validez || '',
      createdAt: new Date().toISOString(),
    };

    this.db.add('proformas', proforma);
    return { proforma };
  }
}

window.DocumentosController = new DocumentosController();
