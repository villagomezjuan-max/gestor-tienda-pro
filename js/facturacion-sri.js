/**
 * MÓDULO DE FACTURACIÓN ELECTRÓNICA SRI ECUADOR
 * Sistema de generación de facturas con formato oficial
 * Incluye compartir por WhatsApp, Email, Impresión y Descarga
 */

const FacturacionSRI = {
  // Configuración de la tienda (se cargará desde backend)
  configTienda: {
    nombre: 'MI NEGOCIO',
    razonSocial: 'MI NEGOCIO S.A.',
    ruc: '1234567890001',
    direccion: 'Av. Principal #123 y Secundaria',
    telefono: '(02) 123-4567',
    email: 'ventas@minegocio.com',
    establecimiento: '001',
    puntoEmision: '001',
    obligadoContabilidad: 'SI',
  },

  async asegurarHtml2Canvas() {
    if (typeof html2canvas !== 'undefined') return;

    Utils.showToast('Preparando captura de la factura...', 'info');
    await this.cargarScript(
      'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
    );

    if (typeof html2canvas === 'undefined') {
      throw new Error('No se pudo cargar html2canvas');
    }
  },

  async asegurarJsPDF() {
    if (window.jspdf) return;

    Utils.showToast('Preparando generador de PDF...', 'info');
    await this.cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

    if (!window.jspdf) {
      throw new Error('No se pudo cargar jsPDF');
    }
  },

  async capturarFacturaCanvas(scale = 2.4, mode = 'default') {
    const facturaElement = document.getElementById('factura-imprimible');
    if (!facturaElement) {
      throw new Error('No se encontró la factura para capturar');
    }

    // Aplicar modo A5 si se solicita
    if (mode === 'a5') {
      facturaElement.classList.add('factura-a5-mode');
    } else if (mode === 'a4') {
      facturaElement.classList.add('factura-a4-mode');
    }

    await this.asegurarHtml2Canvas();

    try {
      return await html2canvas(facturaElement, {
        scale,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        windowWidth: facturaElement.scrollWidth,
        windowHeight: facturaElement.scrollHeight,
      });
    } finally {
      // Siempre remover la clase para no afectar la vista normal
      if (mode === 'a5') {
        facturaElement.classList.remove('factura-a5-mode');
      } else if (mode === 'a4') {
        facturaElement.classList.remove('factura-a4-mode');
      }
    }
  },

  descargarTemporal(url, nombreArchivo) {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  },

  crearMensajeWhatsApp(numeroFactura, totalFormateado) {
    const lineas = ['Hola 👋', `Te compartimos tu factura #${numeroFactura}.`];

    if (totalFormateado) {
      lineas.push(`Total: ${totalFormateado}`);
    }

    lineas.push(`Tienda: ${this.configTienda.nombre}`);
    lineas.push('Gracias por tu compra.');

    return lineas.join('\n');
  },

  async cargarConfiguracion() {
    let configData = null;

    try {
      const response = await Auth._request('/config/tienda', { method: 'GET' });
      if (response?.success && response.data) {
        configData = response.data;
      } else if (response?.negocio?.configTienda) {
        configData = response.negocio.configTienda;
      }
    } catch (error) {
      if (error?.status === 404) {
        console.warn(
          'Endpoint /config/tienda no disponible, usando /negocios/actual como respaldo.'
        );
      } else {
        // 🔥 NO SILENCIAR - Mostrar error completo
        console.group('❌ ERROR: FacturaciónSRI - Cargando configuración desde /config/tienda');
        console.error('Error completo:', error);
        console.error('Stack trace:', error.stack);
        console.groupEnd();
      }
    }

    if (!configData) {
      try {
        const fallback = await Auth._request('/negocios/actual', { method: 'GET' });
        if (fallback?.success && fallback.negocio) {
          const negocio = fallback.negocio;
          const tienda = negocio.configTienda || {};
          configData = {
            ...tienda,
            nombre: tienda.nombre || negocio.nombreComercial || negocio.nombre,
            razonSocial: tienda.razonSocial || tienda.razon_social || negocio.nombre,
            obligadoContabilidad: tienda.obligadoContabilidad ?? tienda.obligado_contabilidad,
          };
        }
      } catch (fallbackError) {
        // 🔥 NO SILENCIAR - Mostrar error completo
        console.group('❌ ERROR: FacturaciónSRI - Cargando configuración desde /negocios/actual');
        console.error('Error completo:', fallbackError);
        console.error('Stack trace:', fallbackError.stack);
        console.groupEnd();
      }
    }

    if (configData) {
      this.configTienda = {
        ...this.configTienda,
        ...this.normalizarConfigTienda(configData),
      };
    }
  },

  normalizarConfigTienda(datos = {}) {
    const boolToSiNo = (valor) => {
      if (typeof valor === 'string') {
        return valor.trim().toUpperCase() === 'SI' ? 'SI' : 'NO';
      }
      return valor ? 'SI' : 'NO';
    };

    return {
      nombre:
        datos.nombre || datos.nombreComercial || datos.nombre_comercial || this.configTienda.nombre,
      razonSocial:
        datos.razonSocial || datos.razon_social || datos.nombre || this.configTienda.razonSocial,
      ruc: datos.ruc || datos.identificacion || this.configTienda.ruc,
      direccion: datos.direccion || this.configTienda.direccion,
      telefono: datos.telefono || this.configTienda.telefono,
      email: datos.email || this.configTienda.email,
      establecimiento: datos.establecimiento || this.configTienda.establecimiento,
      puntoEmision: datos.puntoEmision || datos.punto_emision || this.configTienda.puntoEmision,
      obligadoContabilidad: boolToSiNo(datos.obligadoContabilidad ?? datos.obligado_contabilidad),
    };
  },

  mostrarFactura(datosVenta) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-factura';

    const numeroFactura = this.generarNumeroFactura(datosVenta.numero);
    const claveAcceso = this.generarClaveAcceso(datosVenta);

    modal.innerHTML = `
      <div class="modal modal-factura">
        <div class="modal-header" style="background: #ffffff; color: #111827; padding: 1.25rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb;">
          <h3 style="display: flex; align-items: center; gap: 0.6rem; font-weight: 600;">
            <i class="fas fa-file-invoice" style="color: #4338ca;"></i>
            Factura Electrónica
          </h3>
          <button class="modal-close" onclick="document.getElementById('modal-factura').remove()" style="background: #f3f4f6; border: 1px solid #e5e7eb; color: #1f2937; font-size: 1.1rem; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;">&times;</button>
        </div>
        
        <div class="factura-container" id="factura-imprimible">
          <!-- HEADER -->
          <div class="factura-header">
            <div class="factura-emisor">
              <div class="logo">${this.configTienda.nombre}</div>
              <div class="datos">
                <strong>${this.configTienda.razonSocial}</strong><br>
                RUC: ${this.configTienda.ruc}<br>
                ${this.configTienda.direccion}<br>
                Tel: ${this.configTienda.telefono}<br>
                Email: ${this.configTienda.email}<br>
                Obligado a llevar contabilidad: <strong>${this.configTienda.obligadoContabilidad}</strong>
              </div>
            </div>
            
            <div class="factura-autorizacion">
              <div class="tipo">FACTURA</div>
              <div class="numero">${numeroFactura}</div>
              <div class="info">
                Autorización SRI:<br>
                <small>${claveAcceso}</small><br>
                Fecha Autorización:<br>
                <small>${datosVenta.fecha} ${datosVenta.hora}</small><br>
                Ambiente: PRODUCCIÓN<br>
                Emisión: NORMAL
              </div>
            </div>
          </div>
          
          <!-- INFORMACIÓN CLIENTE Y VENTA -->
          <div class="factura-info-cliente">
            <div class="info-grupo">
              <span class="label">Cliente</span>
              <span class="valor">${datosVenta.cliente.nombre}</span>
            </div>
            <div class="info-grupo">
              <span class="label">Identificación</span>
              <span class="valor">${datosVenta.cliente.cedula || 'CONSUMIDOR FINAL'}</span>
            </div>
            <div class="info-grupo">
              <span class="label">Fecha Emisión</span>
              <span class="valor">${datosVenta.fecha}</span>
            </div>
            <div class="info-grupo">
              <span class="label">Hora</span>
              <span class="valor">${datosVenta.hora}</span>
            </div>
            ${
              datosVenta.cliente.direccion
                ? `
            <div class="info-grupo">
              <span class="label">Dirección</span>
              <span class="valor">${datosVenta.cliente.direccion}</span>
            </div>
            `
                : ''
            }
            ${
              datosVenta.cliente.telefono || datosVenta.cliente.celular
                ? `
            <div class="info-grupo">
              <span class="label">Teléfono</span>
              <span class="valor">${datosVenta.cliente.celular || datosVenta.cliente.telefono}</span>
            </div>
            `
                : ''
            }
            <div class="info-grupo">
              <span class="label">Forma de Pago</span>
              <span class="valor">${this.obtenerFormaPago(datosVenta.metodo_pago)}</span>
            </div>
          </div>
          
          <!-- TABLA DE PRODUCTOS -->
          <table class="factura-tabla">
            <thead>
              <tr>
                <th style="width: 10%;">Cant.</th>
                <th style="width: 50%;">Descripción</th>
                <th style="width: 20%;">P. Unit.</th>
                <th style="width: 20%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${datosVenta.items
                .map(
                  (item) => `
                <tr>
                  <td style="text-align: center;">${item.cantidad}</td>
                  <td>
                    <strong>${item.nombre}</strong>
                    ${item.codigo ? `<br><small>Código: ${item.codigo}</small>` : ''}
                  </td>
                  <td style="text-align: right;">${Utils.formatCurrency(item.precioVenta)}</td>
                  <td style="text-align: right;"><strong>${Utils.formatCurrency(item.precioVenta * item.cantidad)}</strong></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          
          <!-- TOTALES -->
          <div class="factura-totales">
            <div class="row subtotal">
              <span>Subtotal:</span>
              <span>${Utils.formatCurrency(datosVenta.subtotal)}</span>
            </div>
            ${
              datosVenta.descuento > 0
                ? `
            <div class="row descuento">
              <span>Descuento:</span>
              <span>-${Utils.formatCurrency(datosVenta.descuento)}</span>
            </div>
            `
                : ''
            }
            <div class="row iva">
              <span>IVA 15%:</span>
              <span>${Utils.formatCurrency(datosVenta.iva)}</span>
            </div>
            <div class="row total">
              <span>TOTAL:</span>
              <span>${Utils.formatCurrency(datosVenta.total)}</span>
            </div>
          </div>
          
          <!-- INFORMACIÓN DE PAGO -->
          ${this.renderizarInfoPago(datosVenta)}
          
          <!-- FOOTER -->
          <div class="factura-footer">
            <div class="factura-firma">
              <div class="linea"></div>
              <div class="label">Firma Autorizada</div>
            </div>
            
            <div class="factura-qr">
              <div class="qr-code">
                <i class="fas fa-qrcode" style="font-size: 3rem; color: #4b5563;"></i>
              </div>
              <small>Escanea para verificar</small>
            </div>
          </div>
          
          <div class="factura-leyenda">
            <strong>NOTA:</strong> Factura válida para efectos tributarios. 
            Verifique la autenticidad de este documento en: www.sri.gob.ec
          </div>
        </div>
        
        <!-- ACCIONES -->
        <div class="factura-acciones">
          <button class="btn-factura imprimir" onclick="FacturacionSRI.imprimirFactura()">
            <i class="fas fa-print"></i>
            <span>Imprimir</span>
          </button>
          <button class="btn-factura descargar" onclick="FacturacionSRI.descargarPDF('${datosVenta.numero}')">
            <i class="fas fa-download"></i>
            <span>Descargar PDF</span>
          </button>
          <button class="btn-factura whatsapp" onclick="FacturacionSRI.compartirWhatsApp('${(datosVenta.cliente.whatsapp || datosVenta.cliente.celular || '').replace(/'/g, '')}', '${numeroFactura}', '${Utils.formatCurrency(datosVenta.total)}')">
            <i class="fab fa-whatsapp"></i>
            <span>Compartir WhatsApp</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  generarNumeroFactura(numero) {
    const establecimiento = this.configTienda.establecimiento.padStart(3, '0');
    const puntoEmision = this.configTienda.puntoEmision.padStart(3, '0');
    const secuencial = numero.toString().padStart(9, '0');
    return `${establecimiento}-${puntoEmision}-${secuencial}`;
  },

  generarClaveAcceso(datosVenta) {
    // Simulación de clave de acceso SRI (49 dígitos)
    const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const tipoComprobante = '01'; // 01 = Factura
    const ruc = this.configTienda.ruc;
    const ambiente = '2'; // 2 = Producción
    const serie = this.configTienda.establecimiento + this.configTienda.puntoEmision;
    const numeroDoc = datosVenta.numero.toString().padStart(9, '0');
    const codigoNumerico = Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, '0');
    const tipoEmision = '1'; // 1 = Normal

    const clave =
      fecha + tipoComprobante + ruc + ambiente + serie + numeroDoc + codigoNumerico + tipoEmision;
    const digitoVerificador = this.calcularDigitoVerificador(clave);

    return clave + digitoVerificador;
  },

  calcularDigitoVerificador(clave) {
    const multiplicadores = [2, 3, 4, 5, 6, 7];
    let suma = 0;
    let factor = 0;

    for (let i = clave.length - 1; i >= 0; i--) {
      suma += parseInt(clave[i]) * multiplicadores[factor];
      factor = (factor + 1) % 6;
    }

    const residuo = suma % 11;
    return residuo === 0 ? 0 : 11 - residuo;
  },

  obtenerFormaPago(metodo) {
    const formas = {
      efectivo: 'EFECTIVO',
      tarjeta: 'TARJETA DE CRÉDITO/DÉBITO',
      transferencia: 'TRANSFERENCIA BANCARIA',
      otro: 'OTROS',
    };
    return formas[metodo] || 'SIN UTILIZACIÓN DEL SISTEMA FINANCIERO';
  },

  renderizarInfoPago(datosVenta) {
    if (!datosVenta.datos_pago) return '';

    const datos = datosVenta.datos_pago;
    let html =
      '<div style="margin-top: 2rem; padding: 1.25rem 1.5rem; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">';
    html += '<strong>Información de Pago:</strong><br>';

    if (datosVenta.metodo_pago === 'efectivo' && datos.monto_recibido) {
      html += `Monto Recibido: <strong>${Utils.formatCurrency(datos.monto_recibido)}</strong><br>`;
      html += `Cambio: <strong>${Utils.formatCurrency(datos.cambio)}</strong>`;
    } else if (datosVenta.metodo_pago === 'tarjeta') {
      html += `Tarjeta **** ${datos.ultimos_digitos || 'XXXX'}<br>`;
      if (datos.banco) html += `Banco: ${datos.banco}<br>`;
      if (datos.autorizacion) html += `Autorización: ${datos.autorizacion}`;
    } else if (datosVenta.metodo_pago === 'transferencia') {
      if (datos.banco) html += `Banco: ${datos.banco}<br>`;
      if (datos.referencia) html += `Referencia: ${datos.referencia}<br>`;
      if (datos.fecha_hora)
        html += `Fecha/Hora: ${new Date(datos.fecha_hora).toLocaleString('es-EC')}`;
    }

    html += '</div>';
    return html;
  },

  imprimirFactura() {
    window.print();
  },

  async descargarPDF(numeroVenta) {
    try {
      const canvas = await this.capturarFacturaCanvas(2.6, 'a4');
      await this.asegurarJsPDF();

      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Factura_${numeroVenta}.pdf`);

      Utils.showToast('PDF descargado correctamente', 'success');
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR CRÍTICO: FacturaciónSRI - Generando PDF');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      Utils.showToast('Error al generar PDF', 'error');
    }
  },

  cargarScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  async compartirWhatsApp(numero, numeroFactura, totalFormateado = '') {
    try {
      let numeroLimpio = (numero || '').replace(/\D/g, '');

      if (!numeroLimpio) {
        const ingreso = prompt('Ingresa el número de WhatsApp del cliente (ej: 593987654321):');
        if (!ingreso) {
          Utils.showToast('No se proporcionó un número de WhatsApp', 'warning');
          return;
        }
        numeroLimpio = ingreso.replace(/\D/g, '');
      }

      if (!numeroLimpio) {
        Utils.showToast('Número de WhatsApp inválido', 'warning');
        return;
      }

      const mensajePlano = this.crearMensajeWhatsApp(numeroFactura, totalFormateado);

      // Usar modo 'a5' para generar la imagen para compartir
      const canvas = await this.capturarFacturaCanvas(2.6, 'a5');
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (resultado) => {
            if (resultado) {
              resolve(resultado);
            } else {
              reject(new Error('No se pudo generar la imagen de la factura'));
            }
          },
          'image/png',
          0.95
        );
      });

      const nombreArchivo = `Factura_${numeroFactura}.png`;

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [new File([blob], nombreArchivo, { type: 'image/png' })] })
      ) {
        const archivo = new File([blob], nombreArchivo, { type: 'image/png' });
        await navigator.share({ text: mensajePlano, files: [archivo] });
        Utils.showToast('Factura lista para compartir. Selecciona WhatsApp en el menú.', 'success');
        return;
      }

      const urlImagen = URL.createObjectURL(blob);
      this.descargarTemporal(urlImagen, nombreArchivo);

      const mensaje = encodeURIComponent(mensajePlano);
      const urlWhatsApp = `https://wa.me/${numeroLimpio}?text=${mensaje}`;
      window.open(urlWhatsApp, '_blank');

      setTimeout(() => URL.revokeObjectURL(urlImagen), 10000);
      Utils.showToast('Factura descargada. Abriendo WhatsApp Web...', 'info');
    } catch (error) {
      if (error?.name === 'AbortError') {
        Utils.showToast('Envío cancelado.', 'info');
        return;
      }
      console.error('Error compartiendo por WhatsApp:', error);
      Utils.showToast('No se pudo compartir la factura', 'error');
    }
  },

  async enviarEmail(email, numeroVenta) {
    try {
      // Aquí se implementaría el envío por email usando el backend
      // Por ahora, abrimos el cliente de email del usuario
      const asunto = encodeURIComponent(`Factura #${numeroVenta} - ${this.configTienda.nombre}`);
      const cuerpo = encodeURIComponent(
        `Estimado cliente,\n\n` +
          `Adjunto encontrará la factura electrónica de su compra.\n\n` +
          `Número de Factura: ${numeroVenta}\n` +
          `Fecha: ${new Date().toLocaleDateString('es-EC')}\n\n` +
          `Gracias por su preferencia.\n\n` +
          `Saludos,\n${this.configTienda.nombre}`
      );

      window.location.href = `mailto:${email}?subject=${asunto}&body=${cuerpo}`;

      Utils.showToast('Abriendo cliente de email...', 'info');
    } catch (error) {
      console.error('Error enviando email:', error);
      Utils.showToast('Error al abrir email', 'error');
    }
  },
};

// Cargar configuración al iniciar
FacturacionSRI.cargarConfiguracion();

// Exportar al scope global
window.FacturacionSRI = FacturacionSRI;
