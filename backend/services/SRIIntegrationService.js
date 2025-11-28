/**
 * SRIIntegrationService
 *
 * Servicio centralizado para sincronización entre el SRI y otros módulos.
 * Coordina la actualización automática de Reportes y Contabilidad cuando
 * una factura es autorizada por el SRI.
 */

const path = require('path');

const Database = require('better-sqlite3');

const configService = require('./ConfigurationService');

class SRIIntegrationService {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, '..', 'data', 'gestor_tienda.db');
    this.db = null;
  }

  /**
   * Conectar a la base de datos
   */
  connect() {
    if (!this.db) {
      this.db = new Database(this.dbPath);
    }
    return this.db;
  }

  /**
   * Cerrar conexión
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Obtener configuración SRI para un negocio
   * @param {number} negocio_id - ID del negocio
   */
  getConfiguracion(negocio_id) {
    return configService.getSRIConfig(negocio_id);
  }

  /**
   * Obtener URLs de servicios web según el ambiente configurado
   * @param {number} negocio_id - ID del negocio
   */
  getServiceURLs(negocio_id) {
    const config = this.getConfiguracion(negocio_id);
    const ambiente = config.ambiente;

    if (ambiente === 'produccion') {
      return {
        recepcion: config.ws_recepcion_produccion,
        autorizacion: config.ws_autorizacion_produccion,
        ambiente: 'produccion',
      };
    } else {
      return {
        recepcion: config.ws_recepcion_pruebas,
        autorizacion: config.ws_autorizacion_pruebas,
        ambiente: 'pruebas',
      };
    }
  }

  /**
   * Procesar autorización de factura del SRI
   * Sincroniza con Reportes y Contabilidad automáticamente
   *
   * @param {object} factura - Datos de la factura autorizada
   * @param {number} negocio_id - ID del negocio
   */
  async procesarAutorizacionFactura(factura, negocio_id) {
    const db = this.connect();

    console.log(`\n🔄 Procesando autorización de factura: ${factura.numero_factura}`);

    try {
      // 1. Actualizar estado en la tabla de facturas
      db.prepare(
        `
        UPDATE facturas 
        SET 
          estado_sri = 'AUTORIZADA',
          clave_acceso = ?,
          numero_autorizacion = ?,
          fecha_autorizacion = CURRENT_TIMESTAMP,
          xml_autorizado = ?
        WHERE id = ?
      `
      ).run(
        factura.claveAcceso,
        factura.numeroAutorizacion,
        factura.xmlAutorizado || null,
        factura.id
      );

      console.log('   ✅ Estado de factura actualizado');

      // 2. Sincronizar con módulo de REPORTES
      await this.sincronizarConReportes(factura, negocio_id);

      // 3. Sincronizar con módulo de CONTABILIDAD
      await this.sincronizarConContabilidad(factura, negocio_id);

      // 4. Registrar evento de auditoría
      this.registrarEvento({
        tipo: 'factura_autorizada',
        modulo: 'SRI',
        descripcion: `Factura ${factura.numero_factura} autorizada por SRI`,
        negocio_id,
        usuario_id: factura.usuario_id || null,
        metadata: {
          factura_id: factura.id,
          clave_acceso: factura.claveAcceso,
          numero_autorizacion: factura.numeroAutorizacion,
        },
      });

      console.log('   ✅ Sincronización completada\n');

      return {
        success: true,
        factura_id: factura.id,
        numero_factura: factura.numero_factura,
        estado: 'AUTORIZADA',
      };
    } catch (error) {
      console.error('   ❌ Error procesando autorización:', error);

      // Registrar error
      this.registrarEvento({
        tipo: 'error_autorizacion',
        modulo: 'SRI',
        descripcion: `Error procesando autorización de factura ${factura.numero_factura}`,
        negocio_id,
        metadata: {
          error: error.message,
          factura_id: factura.id,
        },
      });

      throw error;
    }
  }

  /**
   * Sincronizar factura autorizada con módulo de REPORTES
   * Actualiza estadísticas y genera alertas si es necesario
   *
   * @param {object} factura - Datos de la factura
   * @param {number} negocio_id - ID del negocio
   */
  async sincronizarConReportes(factura, negocio_id) {
    const db = this.connect();

    console.log('   📊 Sincronizando con Reportes...');

    // Actualizar tabla de reportes de ventas (si existe)
    const tablaReportesExiste = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='reportes_ventas'
    `
      )
      .get();

    if (tablaReportesExiste) {
      // Insertar o actualizar registro en reportes
      db.prepare(
        `
        INSERT OR REPLACE INTO reportes_ventas (
          factura_id, negocio_id, fecha, numero_factura, 
          cliente_id, subtotal, impuestos, total, 
          estado, clave_acceso
        )
        SELECT 
          f.id, f.negocio_id, f.fecha, f.numero_factura,
          f.cliente_id, f.subtotal, f.impuestos, f.total,
          f.estado_sri, f.clave_acceso
        FROM facturas f
        WHERE f.id = ?
      `
      ).run(factura.id);

      console.log('   ✅ Reportes actualizados');
    }

    // Actualizar estadísticas en tiempo real
    await this.actualizarEstadisticasVentas(negocio_id);
  }

  /**
   * Sincronizar factura autorizada con módulo de CONTABILIDAD
   * Genera asientos contables automáticamente
   *
   * @param {object} factura - Datos de la factura
   * @param {number} negocio_id - ID del negocio
   */
  async sincronizarConContabilidad(factura, negocio_id) {
    const db = this.connect();

    console.log('   💰 Sincronizando con Contabilidad...');

    // Obtener detalles completos de la factura
    const facturaCompleta = db
      .prepare(
        `
      SELECT 
        f.*,
        c.nombre as cliente_nombre
      FROM facturas f
      LEFT JOIN clientes c ON f.cliente_id = c.id
      WHERE f.id = ?
    `
      )
      .get(factura.id);

    // Crear asiento contable automáticamente
    const asiento = await this.crearAsientoContable(facturaCompleta, negocio_id);

    console.log(`   ✅ Asiento contable #${asiento.id} creado`);

    return asiento;
  }

  /**
   * Crear asiento contable para una factura autorizada
   *
   * @param {object} factura - Datos completos de la factura
   * @param {number} negocio_id - ID del negocio
   */
  async crearAsientoContable(factura, negocio_id) {
    const db = this.connect();

    // Verificar si existe tabla de asientos contables
    const tablaAsientosExiste = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='asientos_contables'
    `
      )
      .get();

    if (!tablaAsientosExiste) {
      console.log('   ⚠️  Tabla asientos_contables no existe, creando...');
      await this.crearTablasContabilidad();
    }

    // Crear asiento contable
    const asientoResult = db
      .prepare(
        `
      INSERT INTO asientos_contables (
        negocio_id, fecha, concepto, tipo, referencia_id, referencia_tipo
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        negocio_id,
        factura.fecha,
        `Venta factura ${factura.numero_factura} - ${factura.cliente_nombre}`,
        'venta',
        factura.id,
        'factura'
      );

    const asientoId = asientoResult.lastInsertRowid;

    // Detalles del asiento (debe - haber)
    // DEBE: Caja / Bancos (Activo)
    db.prepare(
      `
      INSERT INTO detalle_asientos (
        asiento_id, cuenta, descripcion, debe, haber
      )
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(
      asientoId,
      '1.1.01', // Cuenta de Caja
      'Ingreso por venta',
      factura.total,
      0
    );

    // HABER: Ventas (Ingreso)
    db.prepare(
      `
      INSERT INTO detalle_asientos (
        asiento_id, cuenta, descripcion, debe, haber
      )
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(
      asientoId,
      '4.1.01', // Cuenta de Ventas
      'Venta de productos/servicios',
      0,
      factura.subtotal
    );

    // HABER: IVA por pagar (si hay impuestos)
    if (factura.impuestos > 0) {
      db.prepare(
        `
        INSERT INTO detalle_asientos (
          asiento_id, cuenta, descripcion, debe, haber
        )
        VALUES (?, ?, ?, ?, ?)
      `
      ).run(
        asientoId,
        '2.1.05', // Cuenta de IVA por pagar
        'IVA en ventas',
        0,
        factura.impuestos
      );
    }

    return {
      id: asientoId,
      numero: asientoId,
      fecha: factura.fecha,
      concepto: `Venta factura ${factura.numero_factura}`,
      total: factura.total,
    };
  }

  /**
   * Crear tablas de contabilidad si no existen
   */
  async crearTablasContabilidad() {
    const db = this.connect();

    db.exec(`
      CREATE TABLE IF NOT EXISTS asientos_contables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        negocio_id INTEGER NOT NULL,
        fecha DATE NOT NULL,
        concepto TEXT NOT NULL,
        tipo TEXT DEFAULT 'manual',
        referencia_id INTEGER,
        referencia_tipo TEXT,
        usuario_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (negocio_id) REFERENCES negocios(id)
      );

      CREATE TABLE IF NOT EXISTS detalle_asientos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asiento_id INTEGER NOT NULL,
        cuenta TEXT NOT NULL,
        descripcion TEXT,
        debe DECIMAL(10,2) DEFAULT 0,
        haber DECIMAL(10,2) DEFAULT 0,
        FOREIGN KEY (asiento_id) REFERENCES asientos_contables(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_asientos_negocio 
        ON asientos_contables(negocio_id);
      
      CREATE INDEX IF NOT EXISTS idx_asientos_fecha 
        ON asientos_contables(fecha);
      
      CREATE INDEX IF NOT EXISTS idx_detalle_asiento 
        ON detalle_asientos(asiento_id);
    `);

    console.log('   ✅ Tablas de contabilidad creadas');
  }

  /**
   * Actualizar estadísticas de ventas en tiempo real
   * @param {number} negocio_id - ID del negocio
   */
  async actualizarEstadisticasVentas(negocio_id) {
    const db = this.connect();

    // Calcular estadísticas del día
    const estadisticas = db
      .prepare(
        `
      SELECT 
        COUNT(*) as total_facturas,
        SUM(total) as total_ventas,
        SUM(subtotal) as subtotal_ventas,
        SUM(impuestos) as total_impuestos
      FROM facturas
      WHERE negocio_id = ?
        AND DATE(fecha) = DATE('now', 'localtime')
        AND estado_sri = 'AUTORIZADA'
    `
      )
      .get(negocio_id);

    // Actualizar o crear registro de estadísticas diarias
    const tablaEstadisticasExiste = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='estadisticas_ventas_diarias'
    `
      )
      .get();

    if (!tablaEstadisticasExiste) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS estadisticas_ventas_diarias (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          negocio_id INTEGER NOT NULL,
          fecha DATE NOT NULL,
          total_facturas INTEGER DEFAULT 0,
          total_ventas DECIMAL(10,2) DEFAULT 0,
          subtotal_ventas DECIMAL(10,2) DEFAULT 0,
          total_impuestos DECIMAL(10,2) DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(negocio_id, fecha),
          FOREIGN KEY (negocio_id) REFERENCES negocios(id)
        );
      `);
    }

    db.prepare(
      `
      INSERT OR REPLACE INTO estadisticas_ventas_diarias (
        negocio_id, fecha, total_facturas, total_ventas, 
        subtotal_ventas, total_impuestos, updated_at
      )
      VALUES (?, DATE('now', 'localtime'), ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `
    ).run(
      negocio_id,
      estadisticas.total_facturas || 0,
      estadisticas.total_ventas || 0,
      estadisticas.subtotal_ventas || 0,
      estadisticas.total_impuestos || 0
    );
  }

  /**
   * Registrar evento en el sistema de auditoría
   * @param {object} evento - Datos del evento
   * @param {string} evento.tipo - Tipo de evento
   * @param {string} evento.modulo - Módulo que genera el evento
   * @param {string} evento.descripcion - Descripción del evento
   * @param {number} evento.negocio_id - ID del negocio
   * @param {number} [evento.usuario_id] - ID del usuario (opcional)
   * @param {object} [evento.metadata] - Datos adicionales (opcional)
   */
  registrarEvento({ tipo, modulo, descripcion, negocio_id, usuario_id = null, metadata = null }) {
    const db = this.connect();

    const metadataStr = metadata ? JSON.stringify(metadata) : null;

    db.prepare(
      `
      INSERT INTO eventos_sistema (
        tipo, modulo, descripcion, negocio_id, usuario_id, metadata
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(tipo, modulo, descripcion, negocio_id, usuario_id, metadataStr);
  }

  /**
   * Procesar rechazo de factura del SRI
   * @param {object} factura - Datos de la factura rechazada
   * @param {string} mensajeError - Mensaje de error del SRI
   * @param {number} negocio_id - ID del negocio
   */
  async procesarRechazoFactura(factura, mensajeError, negocio_id) {
    const db = this.connect();

    console.log(`\n❌ Procesando rechazo de factura: ${factura.numero_factura}`);

    try {
      // Actualizar estado en la tabla de facturas
      db.prepare(
        `
        UPDATE facturas 
        SET 
          estado_sri = 'RECHAZADA',
          mensaje_error = ?,
          fecha_rechazo = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      ).run(mensajeError, factura.id);

      // Registrar evento
      this.registrarEvento({
        tipo: 'factura_rechazada',
        modulo: 'SRI',
        descripcion: `Factura ${factura.numero_factura} rechazada por SRI`,
        negocio_id,
        usuario_id: factura.usuario_id || null,
        metadata: {
          factura_id: factura.id,
          mensaje_error: mensajeError,
        },
      });

      console.log('   ✅ Estado actualizado\n');

      return {
        success: true,
        factura_id: factura.id,
        numero_factura: factura.numero_factura,
        estado: 'RECHAZADA',
        mensaje_error: mensajeError,
      };
    } catch (error) {
      console.error('   ❌ Error procesando rechazo:', error);
      throw error;
    }
  }
}

// Exportar instancia singleton
const sriIntegrationService = new SRIIntegrationService();
sriIntegrationService.connect();

module.exports = sriIntegrationService;
module.exports.SRIIntegrationService = SRIIntegrationService;
