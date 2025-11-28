/**
 * NÚCLEO SRI ECUADOR - CÓDIGO LIMPIO Y CONSOLIDADO
 * Elimina duplicación, mantiene solo funcionalidad esencial
 */

const SRICore = {
  // ============================================
  // UTILIDADES BÁSICAS
  // ============================================

  getCollection(name) {
    if (typeof Database === 'undefined') return [];
    const data = Database.getCollection(name);
    return Array.isArray(data) ? data : [];
  },

  round(value, decimals = 2) {
    const num = Number(value) || 0;
    return Number(num.toFixed(decimals));
  },

  parseDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
  },

  isSamePeriod(dateString, year, month) {
    const date = this.parseDate(dateString);
    if (!date) return false;
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  },

  getPeriodoActual() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };
  },

  // ============================================
  // FORMULARIO 103 - RETENCIONES IR
  // ============================================

  async generarFormulario103(periodo) {
    const retenciones = this.getCollection('retenciones').filter((r) =>
      this.isSamePeriod(r.fecha, periodo.year, periodo.month)
    );

    let totalRetenido = 0;
    const porCodigo = {};

    retenciones.forEach((ret) => {
      const codigo = ret.codigoRetencion || '303';
      const monto = this.round(ret.valorRetenido || 0);

      totalRetenido += monto;

      if (!porCodigo[codigo]) {
        porCodigo[codigo] = {
          codigo: codigo,
          baseImponible: 0,
          valorRetenido: 0,
          cantidad: 0,
        };
      }

      porCodigo[codigo].baseImponible += this.round(ret.baseImponible || 0);
      porCodigo[codigo].valorRetenido += monto;
      porCodigo[codigo].cantidad++;
    });

    return {
      periodo,
      totalRetenciones: retenciones.length,
      totalRetenido: this.round(totalRetenido),
      detallePorCodigo: Object.values(porCodigo),
    };
  },

  // ============================================
  // FORMULARIO 104 - IVA
  // ============================================

  async generarFormulario104(periodo) {
    const ventas = this.getCollection('ventas').filter((v) =>
      this.isSamePeriod(v.fecha, periodo.year, periodo.month)
    );

    const compras = this.getCollection('compras').filter((c) =>
      this.isSamePeriod(c.fecha, periodo.year, periodo.month)
    );

    let ivaCobrado = 0;
    let ivaPagado = 0;
    let ventasTotal = 0;
    let comprasTotal = 0;

    ventas.forEach((v) => {
      const iva = this.round(v.iva || 0);
      ivaCobrado += iva;
      ventasTotal += this.round(v.total || 0);
    });

    compras.forEach((c) => {
      const iva = this.round(c.iva || 0);
      ivaPagado += iva;
      comprasTotal += this.round(c.total || 0);
    });

    const ivaPagar = this.round(ivaCobrado - ivaPagado);

    return {
      periodo,
      ventas: {
        cantidad: ventas.length,
        total: this.round(ventasTotal),
        iva: this.round(ivaCobrado),
      },
      compras: {
        cantidad: compras.length,
        total: this.round(comprasTotal),
        iva: this.round(ivaPagado),
      },
      ivaCobrado: this.round(ivaCobrado),
      ivaPagado: this.round(ivaPagado),
      ivaPagar: ivaPagar > 0 ? ivaPagar : 0,
    };
  },

  // ============================================
  // ANEXO ATS
  // ============================================

  async generarATS(periodo) {
    const ventas = this.getCollection('ventas').filter((v) =>
      this.isSamePeriod(v.fecha, periodo.year, periodo.month)
    );

    const compras = this.getCollection('compras').filter((c) =>
      this.isSamePeriod(c.fecha, periodo.year, periodo.month)
    );

    const xml = this.construirXMLATS({
      periodo,
      ventas,
      compras,
    });

    return {
      periodo,
      nombreArchivo: `ATS_${periodo.year}_${String(periodo.month).padStart(2, '0')}.xml`,
      xml,
      ventas: ventas.length,
      compras: compras.length,
    };
  },

  construirXMLATS(data) {
    // XML básico - se puede extender según necesidad
    return `<?xml version="1.0" encoding="UTF-8"?>
<iva>
  <TipoIDInformante>R</TipoIDInformante>
  <IdInformante>9999999999001</IdInformante>
  <razonSocial>EMPRESA EJEMPLO</razonSocial>
  <Anio>${data.periodo.year}</Anio>
  <Mes>${String(data.periodo.month).padStart(2, '0')}</Mes>
  <numEstabRuc>001</numEstabRuc>
  <totalVentas>${data.ventas.length}</totalVentas>
  <codigoOperativo>IVA</codigoOperativo>
  <compras>
    ${data.compras
      .map(
        (c) => `<detalleCompras>
      <codSustento>01</codSustento>
      <tpIdProv>01</tpIdProv>
      <idProv>${c.proveedorRUC || '9999999999001'}</idProv>
      <baseImponible>${this.round(c.subtotal || 0)}</baseImponible>
      <valorIva>${this.round(c.iva || 0)}</valorIva>
    </detalleCompras>`
      )
      .join('\n    ')}
  </compras>
  <ventas>
    ${data.ventas
      .map(
        (v) => `<detalleVentas>
      <tpIdCliente>01</tpIdCliente>
      <idCliente>${v.clienteRUC || '9999999999001'}</idCliente>
      <baseImponible>${this.round(v.subtotal || 0)}</baseImponible>
      <valorIva>${this.round(v.iva || 0)}</valorIva>
    </detalleVentas>`
      )
      .join('\n    ')}
  </ventas>
</iva>`;
  },

  // ============================================
  // DESCARGAS
  // ============================================

  descargarFormulario(tipo, datos) {
    let contenido, nombre, mime;

    if (tipo === 'ATS') {
      contenido = datos.xml;
      nombre = datos.nombreArchivo;
      mime = 'application/xml';
    } else {
      contenido = JSON.stringify(datos, null, 2);
      nombre = `Formulario_${tipo}_${datos.periodo.year}_${datos.periodo.month}.json`;
      mime = 'application/json';
    }

    this.descargar(contenido, nombre, mime);
  },

  descargar(contenido, nombre, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// Exportar globalmente
window.SRICore = SRICore;

// Alias para compatibilidad con código existente
window.SRITributacionService = SRICore;
