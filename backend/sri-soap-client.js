/**
 * MÓDULO: CLIENTE SOAP PARA SRI ECUADOR
 * Implementa comunicación con Web Services del SRI
 * - Recepción de comprobantes
 * - Autorización de comprobantes
 * - Consulta de autorizaciones
 */

const fs = require('fs');
const path = require('path');

const soap = require('soap');

class SRISOAPClient {
  constructor() {
    this.ambiente = '1'; // 1=Pruebas, 2=Producción
    this.endpoints = {
      pruebas: {
        recepcion:
          'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
        autorizacion:
          'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
      },
      produccion: {
        recepcion:
          'https://srienlinea.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
        autorizacion:
          'https://srienlinea.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
      },
    };

    this.clienteRecepcion = null;
    this.clienteAutorizacion = null;
    this.logDir = path.join(__dirname, '../logs/sri');

    // Crear directorio de logs si no existe
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Configura el ambiente (pruebas o producción)
   * @param {string} ambiente - '1' para pruebas, '2' para producción
   */
  setAmbiente(ambiente) {
    this.ambiente = ambiente === '2' ? '2' : '1';
    this.clienteRecepcion = null;
    this.clienteAutorizacion = null;
  }

  /**
   * Obtiene los endpoints según el ambiente configurado
   */
  getEndpoints() {
    return this.ambiente === '2' ? this.endpoints.produccion : this.endpoints.pruebas;
  }

  /**
   * Crea cliente SOAP para recepción
   */
  async crearClienteRecepcion() {
    if (this.clienteRecepcion) {
      return this.clienteRecepcion;
    }

    try {
      const endpoint = this.getEndpoints().recepcion;
      console.log(
        `📡 Conectando a SRI Recepción (ambiente ${this.ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'})...`
      );

      this.clienteRecepcion = await soap.createClientAsync(endpoint, {
        timeout: 60000, // 60 segundos
        disableCache: true,
      });

      console.log('✅ Cliente SOAP Recepción creado correctamente');
      return this.clienteRecepcion;
    } catch (error) {
      console.error('❌ Error creando cliente SOAP Recepción:', error.message);
      throw new Error(`Error conectando con SRI Recepción: ${error.message}`);
    }
  }

  /**
   * Crea cliente SOAP para autorización
   */
  async crearClienteAutorizacion() {
    if (this.clienteAutorizacion) {
      return this.clienteAutorizacion;
    }

    try {
      const endpoint = this.getEndpoints().autorizacion;
      console.log(
        `📡 Conectando a SRI Autorización (ambiente ${this.ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'})...`
      );

      this.clienteAutorizacion = await soap.createClientAsync(endpoint, {
        timeout: 60000,
        disableCache: true,
      });

      console.log('✅ Cliente SOAP Autorización creado correctamente');
      return this.clienteAutorizacion;
    } catch (error) {
      console.error('❌ Error creando cliente SOAP Autorización:', error.message);
      throw new Error(`Error conectando con SRI Autorización: ${error.message}`);
    }
  }

  /**
   * Envía un comprobante firmado al SRI para recepción
   * @param {string} xmlFirmado - XML del comprobante firmado
   * @param {string} claveAcceso - Clave de acceso del comprobante
   * @returns {object} Respuesta del SRI
   */
  async enviarComprobante(xmlFirmado, claveAcceso) {
    try {
      console.log(`📤 Enviando comprobante al SRI: ${claveAcceso}`);

      const cliente = await this.crearClienteRecepcion();

      // Preparar parámetros
      const params = {
        xml: Buffer.from(xmlFirmado, 'utf8').toString('base64'),
      };

      // Realizar llamada SOAP
      const [result] = await cliente.validarComprobanteAsync(params);

      // Log de respuesta
      this.logRespuesta('recepcion', claveAcceso, result);

      // Analizar respuesta
      const estado = result?.estado || result?.RespuestaRecepcionComprobante?.estado;
      const comprobantes =
        result?.comprobantes || result?.RespuestaRecepcionComprobante?.comprobantes;

      console.log(`📨 Respuesta SRI: ${estado}`);

      if (estado === 'RECIBIDA') {
        console.log('✅ Comprobante recibido correctamente por el SRI');
        return {
          success: true,
          estado,
          claveAcceso,
          comprobantes,
          mensaje: 'Comprobante recibido correctamente',
        };
      } else if (estado === 'DEVUELTA') {
        const mensajes = this.extraerMensajesError(comprobantes);
        console.log('⚠️ Comprobante devuelto por el SRI:', mensajes);
        return {
          success: false,
          estado,
          claveAcceso,
          errores: mensajes,
          mensaje: 'Comprobante devuelto con errores',
        };
      } else {
        return {
          success: false,
          estado: estado || 'DESCONOCIDO',
          claveAcceso,
          mensaje: 'Respuesta desconocida del SRI',
        };
      }
    } catch (error) {
      console.error('❌ Error enviando comprobante:', error.message);
      this.logError('recepcion', claveAcceso, error);

      return {
        success: false,
        estado: 'ERROR',
        claveAcceso,
        error: error.message,
        mensaje: `Error al enviar comprobante: ${error.message}`,
      };
    }
  }

  /**
   * Consulta la autorización de un comprobante
   * @param {string} claveAcceso - Clave de acceso del comprobante
   * @returns {object} Datos de autorización
   */
  async consultarAutorizacion(claveAcceso) {
    try {
      console.log(`🔍 Consultando autorización: ${claveAcceso}`);

      const cliente = await this.crearClienteAutorizacion();

      // Preparar parámetros
      const params = {
        claveAccesoComprobante: claveAcceso,
      };

      // Realizar llamada SOAP
      const [result] = await cliente.autorizacionComprobanteAsync(params);

      // Log de respuesta
      this.logRespuesta('autorizacion', claveAcceso, result);

      // Analizar respuesta
      const autorizaciones =
        result?.autorizaciones || result?.RespuestaAutorizacionComprobante?.autorizaciones;

      if (!autorizaciones || !autorizaciones.autorizacion) {
        console.log('⏳ Comprobante en procesamiento...');
        return {
          success: false,
          estado: 'EN_PROCESAMIENTO',
          claveAcceso,
          mensaje: 'Comprobante en procesamiento por el SRI',
        };
      }

      const autorizacion = Array.isArray(autorizaciones.autorizacion)
        ? autorizaciones.autorizacion[0]
        : autorizaciones.autorizacion;

      const estado = autorizacion.estado;

      if (estado === 'AUTORIZADO') {
        console.log('✅ Comprobante AUTORIZADO por el SRI');
        console.log(`   Número autorización: ${autorizacion.numeroAutorizacion}`);
        console.log(`   Fecha autorización: ${autorizacion.fechaAutorizacion}`);

        return {
          success: true,
          estado: 'AUTORIZADO',
          claveAcceso,
          numeroAutorizacion: autorizacion.numeroAutorizacion,
          fechaAutorizacion: autorizacion.fechaAutorizacion,
          ambiente: autorizacion.ambiente,
          comprobante: autorizacion.comprobante,
          mensaje: 'Comprobante autorizado correctamente',
        };
      } else if (estado === 'NO_AUTORIZADO') {
        const mensajes = this.extraerMensajesError(autorizacion.mensajes);
        console.log('❌ Comprobante NO AUTORIZADO:', mensajes);

        return {
          success: false,
          estado: 'NO_AUTORIZADO',
          claveAcceso,
          errores: mensajes,
          mensaje: 'Comprobante no autorizado por el SRI',
        };
      } else {
        return {
          success: false,
          estado: estado || 'DESCONOCIDO',
          claveAcceso,
          mensaje: `Estado desconocido: ${estado}`,
        };
      }
    } catch (error) {
      console.error('❌ Error consultando autorización:', error.message);
      this.logError('autorizacion', claveAcceso, error);

      return {
        success: false,
        estado: 'ERROR',
        claveAcceso,
        error: error.message,
        mensaje: `Error al consultar autorización: ${error.message}`,
      };
    }
  }

  /**
   * Envía y espera la autorización completa
   * @param {string} xmlFirmado - XML firmado
   * @param {string} claveAcceso - Clave de acceso
   * @param {number} maxIntentos - Número máximo de intentos de consulta
   * @param {number} intervalo - Intervalo entre consultas en ms
   * @returns {object} Resultado completo
   */
  async enviarYAutorizar(xmlFirmado, claveAcceso, maxIntentos = 5, intervalo = 3000) {
    try {
      // 1. Enviar comprobante
      console.log('📋 PASO 1: Enviando comprobante al SRI...');
      const recepcion = await this.enviarComprobante(xmlFirmado, claveAcceso);

      if (!recepcion.success) {
        return recepcion;
      }

      // 2. Esperar y consultar autorización
      console.log('📋 PASO 2: Esperando autorización del SRI...');

      for (let intento = 1; intento <= maxIntentos; intento++) {
        console.log(`   Intento ${intento}/${maxIntentos}...`);

        // Esperar antes de consultar
        await this.sleep(intervalo);

        const autorizacion = await this.consultarAutorizacion(claveAcceso);

        if (autorizacion.estado === 'AUTORIZADO') {
          return autorizacion;
        }

        if (autorizacion.estado === 'NO_AUTORIZADO') {
          return autorizacion;
        }

        // Si está en procesamiento, continuar esperando
        if (intento < maxIntentos) {
          console.log(`   Aún en procesamiento, esperando ${intervalo / 1000}s...`);
        }
      }

      // Si se acabaron los intentos
      return {
        success: false,
        estado: 'TIMEOUT',
        claveAcceso,
        mensaje: 'Se agotó el tiempo de espera para autorización',
      };
    } catch (error) {
      console.error('❌ Error en proceso completo:', error.message);
      return {
        success: false,
        estado: 'ERROR',
        claveAcceso,
        error: error.message,
        mensaje: `Error en proceso completo: ${error.message}`,
      };
    }
  }

  /**
   * Extrae mensajes de error de la respuesta SRI
   */
  extraerMensajesError(data) {
    if (!data) return [];

    const mensajes = [];

    if (data.mensaje) {
      if (Array.isArray(data.mensaje)) {
        for (const msg of data.mensaje) {
          mensajes.push({
            identificador: msg.identificador,
            mensaje: msg.mensaje,
            tipo: msg.tipo,
            informacionAdicional: msg.informacionAdicional,
          });
        }
      } else {
        mensajes.push({
          identificador: data.mensaje.identificador,
          mensaje: data.mensaje.mensaje,
          tipo: data.mensaje.tipo,
          informacionAdicional: data.mensaje.informacionAdicional,
        });
      }
    }

    return mensajes;
  }

  /**
   * Función helper para esperar
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Guarda log de respuesta exitosa
   */
  logRespuesta(tipo, claveAcceso, respuesta) {
    try {
      const timestamp = new Date().toISOString();
      const filename = `${tipo}_${claveAcceso}_${timestamp.replace(/[:.]/g, '-')}.json`;
      const filepath = path.join(this.logDir, filename);

      fs.writeFileSync(
        filepath,
        JSON.stringify(
          {
            timestamp,
            tipo,
            claveAcceso,
            respuesta,
          },
          null,
          2
        )
      );
    } catch (error) {
      console.error('Error guardando log:', error.message);
    }
  }

  /**
   * Guarda log de error
   */
  logError(tipo, claveAcceso, error) {
    try {
      const timestamp = new Date().toISOString();
      const filename = `ERROR_${tipo}_${claveAcceso}_${timestamp.replace(/[:.]/g, '-')}.json`;
      const filepath = path.join(this.logDir, filename);

      fs.writeFileSync(
        filepath,
        JSON.stringify(
          {
            timestamp,
            tipo,
            claveAcceso,
            error: {
              message: error.message,
              stack: error.stack,
            },
          },
          null,
          2
        )
      );
    } catch (err) {
      console.error('Error guardando log de error:', err.message);
    }
  }

  /**
   * Test de conectividad con el SRI
   */
  async testConexion() {
    try {
      console.log('🧪 Probando conexión con SRI...');

      const recepcion = await this.crearClienteRecepcion();
      console.log('✅ Conexión a Recepción OK');
      console.log('   Métodos disponibles:', Object.keys(recepcion).join(', '));

      const autorizacion = await this.crearClienteAutorizacion();
      console.log('✅ Conexión a Autorización OK');
      console.log('   Métodos disponibles:', Object.keys(autorizacion).join(', '));

      return {
        success: true,
        mensaje: 'Conexión exitosa con todos los servicios del SRI',
      };
    } catch (error) {
      console.error('❌ Error en test de conexión:', error.message);
      return {
        success: false,
        error: error.message,
        mensaje: 'Error conectando con servicios del SRI',
      };
    }
  }
}

module.exports = SRISOAPClient;
