// js/sri-integration.js
// Servicio centralizado para encapsular la lógica de comunicación con el SRI.

class SriIntegrationService {
  constructor() {
    this.db = typeof Database !== 'undefined' ? Database : null;
    this.config = this.loadConfig();
  }

  loadConfig() {
    if (!this.db) return {};
    const configAvanzada = this.db.get('configuracionAvanzada') || {};
    const sri = configAvanzada.sri || {};
    return this.normalizeConfig(sri);
  }

  normalizeConfig(config = {}) {
    const ambiente = (config.ambiente || 'pruebas').toLowerCase();
    const habilitado = config.habilitado === true || config.habilitado === 'true';
    return {
      ...config,
      ambiente: ambiente === 'produccion' ? 'produccion' : 'pruebas',
      habilitado,
      establecimiento: this.ensureLength(config.establecimiento, 3),
      puntoEmision: this.ensureLength(config.puntoEmision, 3),
    };
  }

  ensureLength(value, length) {
    if (!value) return ''.padStart(length, '0');
    const str = String(value)
      .replace(/[^0-9]/g, '')
      .slice(0, length);
    return str.padStart(length, '0');
  }

  getConfig() {
    // Always reload from DB to ensure it's fresh
    this.config = this.loadConfig();
    return { ...this.config };
  }

  updateConfig(partial = {}) {
    const merged = { ...this.getConfig(), ...partial };
    this.config = this.normalizeConfig(merged);
    if (this.db) {
      const configAvanzada = this.db.get('configuracionAvanzada') || {};
      configAvanzada.sri = { ...configAvanzada.sri, ...this.config };
      this.db.set('configuracionAvanzada', configAvanzada);
    }
  }

  refresh() {
    this.config = this.loadConfig();
  }

  isEnabled() {
    const config = this.getConfig();
    return !!config.habilitado;
  }

  isConfigured() {
    const config = this.getConfig();
    return this.isEnabled() && !!config.certificadoBase64 && !!config.certificadoClave;
  }

  /**
   * Proceso completo para emitir una factura electrónica.
   * @param {object} ventaData - Datos de la venta (cliente, items, totales)
   * @returns {Promise<object>} - Resultado de la autorización del SRI
   */
  async emitirFactura(ventaData) {
    if (!this.isConfigured()) {
      throw new Error(
        'La facturación electrónica no está configurada. Revise el certificado digital y la configuración del SRI.'
      );
    }

    const sriConfig = this.getConfig();
    const configTienda = this.db ? this.db.get('configTienda') || {} : {};

    // 1. Construir el objeto de la factura para el XML
    const facturaData = {
      fecha: new Date(),
      ambiente: sriConfig.ambiente === 'produccion' ? '2' : '1',
      tipoEmision: '1', // Normal
      emisor: {
        razonSocial: sriConfig.razonSocial || configTienda.razonSocial,
        nombreComercial: sriConfig.nombreComercial || configTienda.nombre,
        ruc: sriConfig.ruc || configTienda.ruc,
        direccionMatriz: sriConfig.direccionMatriz || configTienda.direccion,
        direccionSucursal:
          sriConfig.direccionSucursal || sriConfig.direccionMatriz || configTienda.direccion,
        telefono: sriConfig.telefono || configTienda.telefono,
        email: sriConfig.emailNotificaciones || configTienda.email,
        establecimiento: sriConfig.establecimiento,
        puntoEmision: sriConfig.puntoEmision,
        contribuyenteEspecial: sriConfig.contribuyenteEspecial || '',
        obligadoContabilidad: sriConfig.obligadoContabilidad || 'NO',
      },
      comprador: {
        razonSocial: ventaData.cliente.nombre,
        identificacion: ventaData.cliente.cedula || '9999999999999',
        direccion: ventaData.cliente.direccion,
        telefono: ventaData.cliente.telefono || ventaData.cliente.celular,
        email: ventaData.cliente.email,
      },
      detalles: ventaData.items.map((item) => ({
        codigo: item.codigo,
        descripcion: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioVenta,
        descuento: 0, // Asumir descuentos ya aplicados en el precio
        subtotal: item.cantidad * item.precioVenta,
        iva: item.cantidad * item.precioVenta * 0.15, // Asumir 15% IVA
      })),
      subtotal12: ventaData.subtotal,
      subtotal0: 0,
      subtotal: ventaData.subtotal,
      descuento: ventaData.descuento,
      iva: ventaData.iva,
      total: ventaData.total,
      secuencial: ventaData.numero.toString().padStart(9, '0'),
      formaPago: '01', // SIN UTILIZACION DEL SISTEMA FINANCIERO
      infoAdicional: [
        { nombre: 'Email', valor: ventaData.cliente.email || 'N/A' },
        { nombre: 'Observaciones', valor: 'Venta desde sistema.' },
      ],
    };

    // 2. Llamar al nuevo endpoint del backend
    Utils.showToast('Enviando factura al SRI...', 'info', 10000);

    const response = await Auth._request('/sri/emitir-factura', {
      method: 'POST',
      body: {
        facturaData: facturaData,
        sriConfig: sriConfig, // Enviar la configuración completa
      },
    });

    if (response.success && response.estado === 'AUTORIZADO') {
      Utils.showToast(`Factura AUTORIZADA: ${response.numeroAutorizacion}`, 'success', 15000);
    } else {
      Utils.showToast(
        `Factura ${response.estado || 'RECHAZADA'}: ${response.mensaje || 'Error desconocido'}`,
        'error',
        20000
      );
    }

    return response;
  }
}

window.SRIIntegration = new SriIntegrationService();
