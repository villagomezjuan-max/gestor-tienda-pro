const express = require('express');

const router = new express.Router();
const { authenticate } = require('../middleware/auth'); // Fixed: correct path and destructure
const SRIFirmaDigital = require('../sri-firma-digital');
const SRISOAPClient = require('../sri-soap-client');
const SRIXMLGenerator = require('../sri-xml-generator');

/**
 * Endpoint para emitir una factura electrónica completa.
 * Recibe los datos de la factura y la configuración del certificado.
 */
router.post('/emitir-factura', authenticate, async (req, res) => {
  const { facturaData, sriConfig } = req.body;

  if (!facturaData || !sriConfig) {
    return res
      .status(400)
      .json({ success: false, message: 'Faltan datos de la factura o configuración del SRI.' });
  }

  if (!sriConfig.certificadoBase64 || !sriConfig.certificadoClave) {
    return res
      .status(400)
      .json({
        success: false,
        message: 'La configuración del certificado digital (base64 y clave) es obligatoria.',
      });
  }

  try {
    // PASO 1: GENERAR XML
    console.log('API /emitir-factura: Generando XML...');
    const xmlGenerator = new SRIXMLGenerator();
    const { xml, claveAcceso } = xmlGenerator.generarFactura(facturaData);
    console.log(`API /emitir-factura: XML generado, Clave de Acceso: ${claveAcceso}`);

    // PASO 2: FIRMAR XML
    console.log('API /emitir-factura: Firmando XML...');
    const firmaDigital = new SRIFirmaDigital();

    // Cargar certificado desde base64
    firmaDigital.cargarCertificadoBase64(sriConfig.certificadoBase64, sriConfig.certificadoClave);

    const xmlFirmado = firmaDigital.firmarXML(xml, claveAcceso);
    console.log('API /emitir-factura: XML Firmado correctamente.');

    // PASO 3: ENVIAR AL SRI
    console.log('API /emitir-factura: Enviando al SRI...');
    const soapClient = new SRISOAPClient();
    soapClient.setAmbiente(sriConfig.ambiente === 'produccion' ? '2' : '1');

    // Usar URLs personalizadas si existen, si no, las de por defecto.
    if (sriConfig.wsRecepcion) {
      soapClient.setRecepcionEndpoint(sriConfig.wsRecepcion);
    }
    if (sriConfig.wsAutorizacion) {
      soapClient.setAutorizacionEndpoint(sriConfig.wsAutorizacion);
    }

    const resultadoEnvio = await soapClient.enviarComprobante(xmlFirmado);

    if (!resultadoEnvio.success) {
      // Si el envío falla, devolver el error del SRI
      return res.status(500).json({
        success: false,
        message: 'Error al enviar el comprobante al SRI.',
        error: resultadoEnvio.mensaje,
        claveAcceso: claveAcceso,
        estado: 'ENVIADO CON ERROR',
      });
    }

    // PASO 4: CONSULTAR AUTORIZACIÓN
    console.log('API /emitir-factura: Consultando autorización...');
    const resultadoAutorizacion = await soapClient.consultarAutorizacion(claveAcceso);

    console.log('API /emitir-factura: Proceso completado.');
    res.json({
      success: resultadoAutorizacion.success,
      message: resultadoAutorizacion.mensaje,
      ...resultadoAutorizacion, // Contiene estado, numeroAutorizacion, fechaAutorizacion, etc.
      claveAcceso: claveAcceso,
    });
  } catch (error) {
    console.error('ERROR FATAL EN /api/sri/emitir-factura:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

module.exports = router;
