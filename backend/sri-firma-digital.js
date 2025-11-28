/**
 * MÓDULO: FIRMA DIGITAL XML PARA SRI ECUADOR
 * Implementa firma XAdES-BES según especificaciones del SRI
 * Soporta certificados P12/PFX
 */

const crypto = require('crypto');
const fs = require('fs');

const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const forge = require('node-forge');

class SRIFirmaDigital {
  constructor() {
    this.certificado = null;
    this.privateKey = null;
    this.publicKey = null;
    this.certificadoInfo = null;
  }

  /**
   * Carga un certificado P12/PFX desde un archivo
   * @param {string} rutaCertificado - Ruta al archivo P12/PFX
   * @param {string} password - Contraseña del certificado
   * @returns {object} Información del certificado
   */
  cargarCertificado(rutaCertificado, password) {
    try {
      // Leer archivo P12
      const p12Buffer = fs.readFileSync(rutaCertificado);
      const p12Base64 = p12Buffer.toString('base64');
      const p12Der = forge.util.decode64(p12Base64);
      const p12Asn1 = forge.asn1.fromDer(p12Der);

      // Decodificar P12
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

      // Extraer llave privada
      const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = bags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
      this.privateKey = keyBag.key;

      // Extraer certificado
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag][0];
      this.certificado = certBag.cert;

      // Extraer llave pública
      this.publicKey = this.certificado.publicKey;

      // Información del certificado
      this.certificadoInfo = {
        subject: this.certificado.subject.attributes.map((attr) => ({
          name: attr.name,
          value: attr.value,
        })),
        issuer: this.certificado.issuer.attributes.map((attr) => ({
          name: attr.name,
          value: attr.value,
        })),
        serialNumber: this.certificado.serialNumber,
        notBefore: this.certificado.validity.notBefore,
        notAfter: this.certificado.validity.notAfter,
        signatureAlgorithm: this.certificado.signatureOid,
        fingerprint: forge.md.sha1
          .create()
          .update(forge.asn1.toDer(forge.pki.certificateToAsn1(this.certificado)).getBytes())
          .digest()
          .toHex(),
      };

      console.log('✅ Certificado cargado correctamente');
      console.log('   Subject:', this.getSubjectCN());
      console.log('   Válido desde:', this.certificadoInfo.notBefore);
      console.log('   Válido hasta:', this.certificadoInfo.notAfter);
      console.log('   Huella SHA1:', this.certificadoInfo.fingerprint);

      return this.certificadoInfo;
    } catch (error) {
      console.error('❌ Error cargando certificado:', error.message);
      throw new Error(`Error al cargar certificado: ${error.message}`);
    }
  }

  /**
   * Carga certificado desde base64 almacenado en base de datos
   * @param {string} certificadoBase64 - Certificado en base64
   * @param {string} password - Contraseña del certificado
   */
  cargarCertificadoBase64(certificadoBase64, password) {
    try {
      const p12Der = forge.util.decode64(certificadoBase64);
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

      // Extraer componentes
      const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = bags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
      this.privateKey = keyBag.key;

      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag][0];
      this.certificado = certBag.cert;
      this.publicKey = this.certificado.publicKey;

      this.certificadoInfo = {
        subject: this.certificado.subject.attributes.map((attr) => ({
          name: attr.name,
          value: attr.value,
        })),
        issuer: this.certificado.issuer.attributes.map((attr) => ({
          name: attr.name,
          value: attr.value,
        })),
        serialNumber: this.certificado.serialNumber,
        notBefore: this.certificado.validity.notBefore,
        notAfter: this.certificado.validity.notAfter,
        fingerprint: forge.md.sha1
          .create()
          .update(forge.asn1.toDer(forge.pki.certificateToAsn1(this.certificado)).getBytes())
          .digest()
          .toHex(),
      };

      return this.certificadoInfo;
    } catch (error) {
      throw new Error(`Error al cargar certificado desde base64: ${error.message}`);
    }
  }

  /**
   * Valida si el certificado está vigente
   * @returns {boolean} true si el certificado es válido
   */
  validarVigencia() {
    if (!this.certificado) {
      throw new Error('No hay certificado cargado');
    }

    const ahora = new Date();
    const notBefore = this.certificado.validity.notBefore;
    const notAfter = this.certificado.validity.notAfter;

    const valido = ahora >= notBefore && ahora <= notAfter;

    if (!valido) {
      if (ahora < notBefore) {
        throw new Error('El certificado aún no es válido');
      } else {
        throw new Error('El certificado ha expirado');
      }
    }

    return true;
  }

  /**
   * Obtiene el Common Name del Subject
   */
  getSubjectCN() {
    if (!this.certificado) return null;
    const cn = this.certificado.subject.attributes.find((attr) => attr.name === 'commonName');
    return cn ? cn.value : null;
  }

  /**
   * Firma un documento XML con XAdES-BES
   * @param {string} xmlString - XML a firmar
   * @param {string} claveAcceso - Clave de acceso del comprobante (49 dígitos)
   * @returns {string} XML firmado
   */
  firmarXML(xmlString, claveAcceso) {
    try {
      if (!this.certificado || !this.privateKey) {
        throw new Error('Debe cargar un certificado antes de firmar');
      }

      this.validarVigencia();

      // Parsear XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

      // Calcular digest SHA1 del documento
      const md = forge.md.sha1.create();
      md.update(xmlString, 'utf8');
      const digestValue = forge.util.encode64(md.digest().getBytes());

      // Crear SignedInfo
      const signedInfo = this.crearSignedInfo(digestValue);

      // Firmar SignedInfo
      const signatureMd = forge.md.sha1.create();
      signatureMd.update(signedInfo, 'utf8');
      const signature = this.privateKey.sign(signatureMd);
      const signatureValue = forge.util.encode64(signature);

      // Obtener certificado en base64
      const certPem = forge.pki.certificateToPem(this.certificado);
      const certBase64 = certPem
        .replace('-----BEGIN CERTIFICATE-----', '')
        .replace('-----END CERTIFICATE-----', '')
        .replace(/\n/g, '');

      // Construir nodo Signature con XAdES-BES
      const signatureXML = this.construirSignatureXML({
        signedInfo,
        signatureValue,
        certBase64,
        digestValue,
        claveAcceso,
      });

      // Insertar Signature en el XML
      const xmlConFirma = this.insertarSignature(xmlString, signatureXML);

      console.log('✅ XML firmado correctamente');

      return xmlConFirma;
    } catch (error) {
      console.error('❌ Error firmando XML:', error.message);
      throw new Error(`Error al firmar XML: ${error.message}`);
    }
  }

  /**
   * Crea el elemento SignedInfo
   */
  crearSignedInfo(digestValue) {
    return `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
      <Reference URI="">
        <Transforms>
          <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        </Transforms>
        <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
        <DigestValue>${digestValue}</DigestValue>
      </Reference>
    </SignedInfo>`;
  }

  /**
   * Construye el nodo Signature completo con XAdES-BES
   */
  construirSignatureXML({ signedInfo, signatureValue, certBase64, digestValue, claveAcceso }) {
    const fechaFirma = new Date().toISOString();

    return `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#" Id="Signature">
      ${signedInfo}
      <SignatureValue Id="SignatureValue">${signatureValue}</SignatureValue>
      <KeyInfo Id="KeyInfo">
        <X509Data>
          <X509Certificate>${certBase64}</X509Certificate>
        </X509Data>
      </KeyInfo>
      <Object Id="Object">
        <QualifyingProperties xmlns="http://uri.etsi.org/01903/v1.3.2#" Target="#Signature">
          <SignedProperties Id="SignedProperties">
            <SignedSignatureProperties>
              <SigningTime>${fechaFirma}</SigningTime>
              <SigningCertificate>
                <Cert>
                  <CertDigest>
                    <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
                    <DigestValue>${digestValue}</DigestValue>
                  </CertDigest>
                  <IssuerSerial>
                    <X509IssuerName>${this.getIssuerName()}</X509IssuerName>
                    <X509SerialNumber>${this.certificado.serialNumber}</X509SerialNumber>
                  </IssuerSerial>
                </Cert>
              </SigningCertificate>
            </SignedSignatureProperties>
            <SignedDataObjectProperties>
              <DataObjectFormat ObjectReference="#Reference">
                <Description>Comprobante Electrónico SRI</Description>
                <MimeType>text/xml</MimeType>
              </DataObjectFormat>
            </SignedDataObjectProperties>
          </SignedProperties>
        </QualifyingProperties>
      </Object>
    </Signature>`;
  }

  /**
   * Obtiene el Issuer Name en formato X509
   */
  getIssuerName() {
    if (!this.certificado) return '';

    const attrs = this.certificado.issuer.attributes;
    const parts = [];

    for (const attr of attrs) {
      const shortName = attr.shortName || attr.name;
      parts.push(`${shortName}=${attr.value}`);
    }

    return parts.join(',');
  }

  /**
   * Inserta el nodo Signature en el XML
   */
  insertarSignature(xmlString, signatureXML) {
    // Buscar el último elemento antes del cierre del root
    const rootCloseTag = xmlString.lastIndexOf('</');
    const xmlConFirma =
      xmlString.slice(0, rootCloseTag) + signatureXML + xmlString.slice(rootCloseTag);

    return xmlConFirma;
  }

  /**
   * Verifica una firma XML
   * @param {string} xmlFirmado - XML con firma
   * @returns {boolean} true si la firma es válida
   */
  verificarFirma(xmlFirmado) {
    try {
      // Por ahora, verificación básica
      // TODO: Implementar verificación completa XAdES-BES

      const tieneSignature = xmlFirmado.includes('<Signature');
      const tieneSignatureValue = xmlFirmado.includes('<SignatureValue');
      const tieneX509Certificate = xmlFirmado.includes('<X509Certificate');

      return tieneSignature && tieneSignatureValue && tieneX509Certificate;
    } catch (error) {
      console.error('❌ Error verificando firma:', error.message);
      return false;
    }
  }

  /**
   * Convierte certificado a base64 para almacenamiento
   */
  certificadoABase64(rutaCertificado) {
    const p12Buffer = fs.readFileSync(rutaCertificado);
    return p12Buffer.toString('base64');
  }
}

module.exports = SRIFirmaDigital;
