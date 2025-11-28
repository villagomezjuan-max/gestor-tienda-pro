/* ========================================
   MÓDULO DOCUMENTOS ELECTRÓNICOS (SPA)
   Integración del flujo de facturación en el dashboard
   ======================================== */

(function () {
  const TEMPLATE = /* html */ `
    <div class="documentos-spa">
      <div class="card">
        <div class="card-header">
          <h2>Documentos Electrónicos</h2>
          <div class="card-actions">
            <button id="btn-doc-action" class="btn btn-primary">Próximamente IA</button>
          </div>
        </div>

        <div class="card-tabs doc-tabs">
          <button class="doc-tab active" data-tab="facturas">Facturas</button>
          <button class="doc-tab" data-tab="retenciones">Retenciones</button>
          <button class="doc-tab" data-tab="guias">Guías de Remisión</button>
          <button class="doc-tab" data-tab="notas-credito">Notas de Crédito</button>
          <button class="doc-tab" data-tab="notas-debito">Notas de Débito</button>
          <button class="doc-tab" data-tab="proformas">Proformas</button>
        </div>

        <div class="doc-sections">
          <section class="doc-section active" data-section="facturas">
            <div class="doc-section-actions">
              <p class="doc-help">Gestiona facturas emitidas desde el POS o facturación manual.</p>
            </div>
            <div class="table-responsive">
              <table id="tabla-facturas">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </section>

          <section class="doc-section" data-section="retenciones">
            <div class="doc-section-actions">
              <button class="btn btn-primary" id="btn-nueva-retencion">Nueva Retención</button>
              <p class="doc-help">Registra retenciones de compras y genera los comprobantes respectivos.</p>
            </div>
            <div class="table-responsive">
              <table id="tabla-retenciones">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Proveedor</th>
                    <th>Fecha</th>
                    <th>Total Retenido</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </section>

          <section class="doc-section" data-section="guias">
            <div class="doc-section-actions">
              <button class="btn btn-primary" id="btn-nueva-guia">Nueva Guía</button>
              <p class="doc-help">Crea guías de remisión para envíos y traslados de mercancía.</p>
            </div>
            <div class="table-responsive">
              <table id="tabla-guias">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Transportista</th>
                    <th>Fecha</th>
                    <th>Destino</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </section>

          <section class="doc-section" data-section="notas-credito">
            <div class="doc-section-actions">
              <button class="btn btn-primary" id="btn-nueva-nota-credito">Nueva Nota de Crédito</button>
              <p class="doc-help">Emite notas de crédito vinculadas a facturas autorizadas.</p>
            </div>
            <div class="table-responsive">
              <table id="tabla-notas-credito">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Factura Relacionada</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </section>

          <section class="doc-section" data-section="notas-debito">
            <div class="doc-section-actions">
              <button class="btn btn-primary" id="btn-nueva-nota-debito">Nueva Nota de Débito</button>
              <p class="doc-help">Registra notas de débito para ajustes y recargos sobre facturas.</p>
            </div>
            <div class="table-responsive">
              <table id="tabla-notas-debito">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Factura Relacionada</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </section>

          <section class="doc-section" data-section="proformas">
            <div class="doc-section-actions">
              <button class="btn btn-primary" id="btn-nueva-proforma">Nueva Proforma</button>
              <p class="doc-help">Genera cotizaciones detalladas y conviértelas en ventas cuando estén aprobadas.</p>
            </div>
            <div class="table-responsive">
              <table id="tabla-proformas">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;

  function showProximamenteIA() {
    const modalId = 'modalFacturacionProximamente';
    Utils.closeModal(modalId);
    const body = `
      <div class="doc-proximamente">
        <p>Estamos preparando la facturación asistida por IA para integrarla sin fricciones.</p>
        <p>Mientras tanto puedes seguir emitiendo documentos desde el POS de ventas.</p>
      </div>
    `;
    const footer = `
      <button class="btn btn-secondary" onclick="Utils.closeModal('${modalId}')">Cerrar</button>
      <button class="btn btn-primary" onclick="Utils.closeModal('${modalId}'); if (window.App) { App.loadModule('ventas'); }">Ir al POS de Ventas</button>
    `;
    Utils.createModal(
      modalId,
      '<i class="fas fa-robot"></i> Facturación IA',
      body,
      footer,
      'medium'
    );
  }

  function initialize() {
    const tablas = {
      facturas: document.querySelector('#tabla-facturas tbody'),
      retenciones: document.querySelector('#tabla-retenciones tbody'),
      guias: document.querySelector('#tabla-guias tbody'),
      'notas-credito': document.querySelector('#tabla-notas-credito tbody'),
      'notas-debito': document.querySelector('#tabla-notas-debito tbody'),
      proformas: document.querySelector('#tabla-proformas tbody'),
    };

    const tabs = Array.from(document.querySelectorAll('.doc-tab'));
    const sections = Array.from(document.querySelectorAll('.doc-section'));
    const actionButton = document.getElementById('btn-doc-action');

    function formatearValor(valor) {
      return typeof Utils !== 'undefined' && Utils.formatCurrency
        ? Utils.formatCurrency(valor)
        : `$${Number(valor || 0).toFixed(2)}`;
    }

    function formatearFecha(fecha) {
      if (!fecha) return '';
      try {
        return new Date(fecha).toLocaleString();
      } catch (error) {
        return fecha;
      }
    }

    function renderEstadoBadge(estado) {
      const estadoNormalizado = (estado || '').toLowerCase();
      const esWarning = estadoNormalizado === 'borrador' || estadoNormalizado === 'pendiente';
      const esError = estadoNormalizado === 'anulada' || estadoNormalizado === 'rechazada';
      const color = esError ? 'danger' : esWarning ? 'warning' : 'success';
      return `<span class="badge badge-${color}">${estado || 'emitida'}</span>`;
    }

    function renderSinRegistros(tbody, columnas, mensaje) {
      if (!tbody) return;
      tbody.innerHTML = `<tr><td colspan="${columnas}">${mensaje}</td></tr>`;
    }

    function openDocModal({
      id,
      title,
      content,
      submitText,
      onSubmit,
      onOpen,
      size = 'modal-large',
    }) {
      Utils.closeModal(id);
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay doc-modal';
      overlay.id = id;
      overlay.innerHTML = `
        <div class="modal-container ${size}">
          <form class="modal-form" novalidate>
            <div class="modal-header">
              <h3>${title}</h3>
              <button type="button" class="btn-close" data-close>&times;</button>
            </div>
            <div class="modal-body">
              ${content}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
              <button type="submit" class="btn btn-primary">${submitText || 'Guardar'}</button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(overlay);
      const form = overlay.querySelector('form');

      const cerrar = () => Utils.closeModal(id);

      overlay.addEventListener('click', (event) => {
        if (event.target.dataset.close !== undefined || event.target === overlay) {
          cerrar();
        }
      });

      overlay.querySelectorAll('[data-close]').forEach((btn) => {
        btn.addEventListener('click', cerrar);
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (typeof onSubmit === 'function') {
          await onSubmit(new FormData(form), { form, overlay, cerrar });
        }
      });

      if (typeof onOpen === 'function') {
        onOpen({ form, overlay, cerrar });
      }
    }

    function cargarFacturas() {
      const tabla = tablas.facturas;
      if (!tabla) return;

      try {
        const facturas = (Database.getCollection('facturas') || []).sort(
          (a, b) => new Date(b.fecha || b.createdAt) - new Date(a.fecha || a.createdAt)
        );

        if (facturas.length === 0) {
          renderSinRegistros(tabla, 6, 'No hay facturas registradas.');
          return;
        }

        tabla.innerHTML = '';

        facturas.forEach((factura) => {
          const cliente = factura.clienteId
            ? Database.getItem('clientes', factura.clienteId)
            : null;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${factura.numero || '-'}</td>
            <td>${cliente?.nombre || factura.clienteNombre || 'Cliente Genérico'}</td>
            <td>${formatearFecha(factura.fecha || factura.createdAt)}</td>
            <td>${formatearValor(factura.total)}</td>
            <td>${renderEstadoBadge(factura.estado)}</td>
            <td>
              <button class="btn btn-sm btn-info" data-accion="ver" data-id="${factura.id}">Ver PDF</button>
              <button class="btn btn-sm btn-warning" data-accion="anular" data-id="${factura.id}">Anular</button>
            </td>
          `;
          tabla.appendChild(tr);
        });
      } catch (error) {
        console.error('Error al cargar las facturas:', error);
        renderSinRegistros(tabla, 6, 'Error al cargar los datos.');
      }
    }

    function cargarRetenciones() {
      const tabla = tablas.retenciones;
      if (!tabla) return;

      try {
        const retenciones = (Database.getCollection('retenciones') || []).sort(
          (a, b) => new Date(b.fecha || b.createdAt) - new Date(a.fecha || a.createdAt)
        );

        if (retenciones.length === 0) {
          renderSinRegistros(tabla, 6, 'No hay retenciones registradas.');
          return;
        }

        tabla.innerHTML = '';

        retenciones.forEach((retencion) => {
          const proveedor = retencion.proveedorId
            ? Database.getItem('proveedores', retencion.proveedorId)
            : null;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${retencion.numero || '-'}</td>
            <td>${retencion.proveedorNombre || proveedor?.nombre || 'Proveedor no registrado'}</td>
            <td>${formatearFecha(retencion.fecha || retencion.createdAt)}</td>
            <td>${formatearValor(retencion.total)}</td>
            <td>${renderEstadoBadge(retencion.estado)}</td>
            <td><span class="text-muted">Detalle disponible pronto</span></td>
          `;
          tabla.appendChild(tr);
        });
      } catch (error) {
        console.error('Error al cargar retenciones:', error);
        renderSinRegistros(tabla, 6, 'Error al cargar los datos.');
      }
    }

    function cargarGuias() {
      const tabla = tablas.guias;
      if (!tabla) return;

      try {
        const guias = (Database.getCollection('guiasRemision') || []).sort(
          (a, b) => new Date(b.fecha || b.createdAt) - new Date(a.fecha || a.createdAt)
        );

        if (guias.length === 0) {
          renderSinRegistros(tabla, 6, 'No hay guías de remisión registradas.');
          return;
        }

        tabla.innerHTML = '';

        guias.forEach((guia) => {
          const destino = guia.puntoLlegada || guia.destinatarios?.[0]?.destino || '-';
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${guia.numero || '-'}</td>
            <td>${guia.transportistaNombre || 'Sin transportista'}</td>
            <td>${formatearFecha(guia.fecha || guia.createdAt)}</td>
            <td>${destino}</td>
            <td>${renderEstadoBadge(guia.estado)}</td>
            <td><span class="text-muted">Seguimiento en desarrollo</span></td>
          `;
          tabla.appendChild(tr);
        });
      } catch (error) {
        console.error('Error al cargar guías:', error);
        renderSinRegistros(tabla, 6, 'Error al cargar los datos.');
      }
    }

    function cargarNotasCredito() {
      const tabla = tablas['notas-credito'];
      if (!tabla) return;

      try {
        const notas = (Database.getCollection('notasCredito') || []).sort(
          (a, b) => new Date(b.fecha || b.createdAt) - new Date(a.fecha || a.createdAt)
        );

        if (notas.length === 0) {
          renderSinRegistros(tabla, 6, 'No hay notas de crédito registradas.');
          return;
        }

        tabla.innerHTML = '';

        notas.forEach((nota) => {
          const factura = nota.facturaId ? Database.getItem('facturas', nota.facturaId) : null;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${nota.numero || '-'}</td>
            <td>${factura?.numero || 'Sin referencia'}</td>
            <td>${formatearFecha(nota.fecha || nota.createdAt)}</td>
            <td>${formatearValor(nota.total)}</td>
            <td>${renderEstadoBadge(nota.estado)}</td>
            <td><span class="text-muted">Acciones disponibles pronto</span></td>
          `;
          tabla.appendChild(tr);
        });
      } catch (error) {
        console.error('Error al cargar notas de crédito:', error);
        renderSinRegistros(tabla, 6, 'Error al cargar los datos.');
      }
    }

    function cargarNotasDebito() {
      const tabla = tablas['notas-debito'];
      if (!tabla) return;

      try {
        const notas = (Database.getCollection('notasDebito') || []).sort(
          (a, b) => new Date(b.fecha || b.createdAt) - new Date(a.fecha || a.createdAt)
        );

        if (notas.length === 0) {
          renderSinRegistros(tabla, 6, 'No hay notas de débito registradas.');
          return;
        }

        tabla.innerHTML = '';

        notas.forEach((nota) => {
          const factura = nota.facturaId ? Database.getItem('facturas', nota.facturaId) : null;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${nota.numero || '-'}</td>
            <td>${factura?.numero || 'Sin referencia'}</td>
            <td>${formatearFecha(nota.fecha || nota.createdAt)}</td>
            <td>${formatearValor(nota.total)}</td>
            <td>${renderEstadoBadge(nota.estado)}</td>
            <td><span class="text-muted">Acciones disponibles pronto</span></td>
          `;
          tabla.appendChild(tr);
        });
      } catch (error) {
        console.error('Error al cargar notas de débito:', error);
        renderSinRegistros(tabla, 6, 'Error al cargar los datos.');
      }
    }

    function cargarProformas() {
      const tabla = tablas.proformas;
      if (!tabla) return;

      try {
        const proformas = (Database.getCollection('proformas') || []).sort(
          (a, b) => new Date(b.fecha || b.createdAt) - new Date(a.fecha || a.createdAt)
        );

        if (proformas.length === 0) {
          renderSinRegistros(tabla, 6, 'No hay proformas registradas.');
          return;
        }

        tabla.innerHTML = '';

        proformas.forEach((proforma) => {
          const cliente = proforma.clienteId
            ? Database.getItem('clientes', proforma.clienteId)
            : null;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${proforma.numero || '-'}</td>
            <td>${proforma.clienteNombre || cliente?.nombre || 'Cliente Genérico'}</td>
            <td>${formatearFecha(proforma.fecha || proforma.createdAt)}</td>
            <td>${formatearValor(proforma.total)}</td>
            <td>${renderEstadoBadge(proforma.estado)}</td>
            <td><span class="text-muted">Convierte en venta desde el POS</span></td>
          `;
          tabla.appendChild(tr);
        });
      } catch (error) {
        console.error('Error al cargar proformas:', error);
        renderSinRegistros(tabla, 6, 'Error al cargar los datos.');
      }
    }

    const loaders = {
      facturas: cargarFacturas,
      retenciones: cargarRetenciones,
      guias: cargarGuias,
      'notas-credito': cargarNotasCredito,
      'notas-debito': cargarNotasDebito,
      proformas: cargarProformas,
    };

    function actualizarBotonAccion(tab) {
      const config = {
        facturas: {
          label: 'Nueva factura manual',
          handler: () => mostrarModalFacturaManual(),
        },
        retenciones: {
          label: 'Nueva Retención',
          handler: () => mostrarModalRetencion(),
        },
        guias: {
          label: 'Nueva Guía de Remisión',
          handler: () => mostrarModalGuia(),
        },
        'notas-credito': {
          label: 'Nueva Nota de Crédito',
          handler: () => mostrarModalNotaCredito(),
        },
        'notas-debito': {
          label: 'Nueva Nota de Débito',
          handler: () => mostrarModalNotaDebito(),
        },
        proformas: {
          label: 'Nueva Proforma',
          handler: () => mostrarModalProforma(),
        },
      }[tab] || { label: 'Acción no disponible', handler: null };

      if (actionButton) {
        actionButton.textContent = config.label;
        actionButton.disabled = typeof config.handler !== 'function';
        actionButton.dataset.actionTab = tab;
        actionButton.onclick = config.handler || null;
      }
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const objetivo = tab.dataset.tab;
        if (!objetivo) return;

        tabs.forEach((btn) => btn.classList.toggle('active', btn === tab));
        sections.forEach((section) =>
          section.classList.toggle('active', section.dataset.section === objetivo)
        );

        const loader = loaders[objetivo];
        if (typeof loader === 'function') {
          loader();
        }

        actualizarBotonAccion(objetivo);
      });
    });

    function generarPdfFactura(facturaId) {
      if (typeof generarFacturaPDF !== 'function') {
        Utils.showToast('Generador de PDF no disponible.', 'error');
        return;
      }

      const factura = Database.getItem('facturas', facturaId);
      if (!factura) {
        Utils.showToast('Factura no encontrada.', 'error');
        return;
      }

      const items = (Database.getCollection('facturaItems') || []).filter(
        (item) => item.facturaId === factura.id
      );
      const cliente = factura.clienteId ? Database.getItem('clientes', factura.clienteId) : null;
      const tiendaConfig = DocumentosController?.getConfiguracionFiscal() || {};

      const datosPdf = {
        numero: factura.numero,
        fecha: factura.fecha,
        cliente: {
          nombre: cliente?.nombre || factura.clienteNombre || 'Cliente Genérico',
          identificacion: cliente?.cedula || cliente?.ruc || '9999999999',
          email: cliente?.email || '',
          telefono: cliente?.telefono || '',
          direccion: cliente?.direccion || '',
        },
        items,
        subtotal_iva: factura.subtotal12 || factura.subtotal_iva || 0,
        subtotal_cero: factura.subtotal0 || factura.subtotal_cero || 0,
        descuento: factura.descuento || 0,
        iva: factura.iva || 0,
        total: factura.total || 0,
        claveAcceso: factura.claveAcceso || null,
      };

      generarFacturaPDF(datosPdf, tiendaConfig);
    }

    function anularFactura(facturaId) {
      const factura = Database.getItem('facturas', facturaId);
      if (!factura) {
        Utils.showToast('Factura no encontrada.', 'error');
        return;
      }

      Utils.showConfirm('¿Deseas anular esta factura?', () => {
        Database.update('facturas', facturaId, {
          estado: 'anulada',
          anuladaEn: new Date().toISOString(),
        });
        cargarFacturas();
        Utils.showToast('Factura anulada correctamente.', 'success');
      });
    }

    tablas.facturas?.addEventListener('click', (event) => {
      const boton = event.target.closest('button');
      if (!boton) return;

      const accion = boton.dataset.accion;
      const id = boton.dataset.id;
      if (!accion || !id) return;

      if (accion === 'ver') {
        generarPdfFactura(id);
      } else if (accion === 'anular') {
        anularFactura(id);
      }
    });

    function mostrarModalFacturaManual() {
      const fechaDefault =
        typeof Utils !== 'undefined' && typeof Utils.getCurrentDate === 'function'
          ? Utils.getCurrentDate()
          : new Date().toISOString().slice(0, 10);

      openDocModal({
        id: 'modalFacturaManual',
        title: 'Registrar factura manual',
        submitText: 'Guardar factura',
        size: 'modal-large',
        content: `
          <div class="doc-form-grid doc-form-grid--minimal">
            <div class="form-group">
              <label for="facturaClienteNombre">Cliente</label>
              <input type="text" id="facturaClienteNombre" name="clienteNombre" class="form-control" placeholder="Nombre completo o razón social" required>
            </div>
            <div class="form-group">
              <label for="facturaClienteIdentificacion">Identificación</label>
              <input type="text" id="facturaClienteIdentificacion" name="clienteIdentificacion" class="form-control" placeholder="RUC / Cédula">
            </div>
            <div class="form-group">
              <label for="facturaClienteEmail">Correo</label>
              <input type="email" id="facturaClienteEmail" name="clienteEmail" class="form-control" placeholder="cliente@email.com">
            </div>
            <div class="form-group">
              <label for="facturaClienteTelefono">Teléfono</label>
              <input type="text" id="facturaClienteTelefono" name="clienteTelefono" class="form-control" placeholder="0999999999">
            </div>
            <div class="form-group">
              <label for="facturaFecha">Fecha</label>
              <input type="date" id="facturaFecha" name="fecha" class="form-control" value="${fechaDefault}" required>
            </div>
            <div class="form-group">
              <label for="facturaEstado">Estado</label>
              <select id="facturaEstado" name="estado" class="form-control">
                <option value="emitida" selected>Emitida</option>
                <option value="borrador">Borrador</option>
              </select>
            </div>
          </div>
          <div class="doc-detail-block is-factura">
            <div class="doc-details-header">
              <span>Código</span>
              <span>Descripción</span>
              <span>Cantidad</span>
              <span>Precio</span>
              <span>IVA %</span>
              <span>Subtotal</span>
              <span></span>
            </div>
            <div class="doc-detail-list" id="facturaManualItems"></div>
          </div>
          <div class="doc-detail-actions">
            <button type="button" class="btn btn-outline" data-action="add-item">Agregar línea</button>
          </div>
          <div class="doc-summary-grid doc-summary-grid--compact">
            <div class="summary-item">
              <span>Subtotal IVA</span>
              <strong id="facturaSubtotal12">${formatearValor(0)}</strong>
            </div>
            <div class="summary-item">
              <span>Subtotal 0%</span>
              <strong id="facturaSubtotal0">${formatearValor(0)}</strong>
            </div>
            <div class="summary-item">
              <span>IVA calculado</span>
              <strong id="facturaIva">${formatearValor(0)}</strong>
            </div>
            <div class="summary-item">
              <label for="facturaDescuento">Descuento ($)</label>
              <input type="number" step="0.01" min="0" id="facturaDescuento" name="descuento" class="form-control" value="0">
            </div>
            <div class="summary-item">
              <span>Total factura</span>
              <strong id="facturaTotal">${formatearValor(0)}</strong>
            </div>
          </div>
        `,
        onOpen: ({ form }) => {
          const sanitize = (value) =>
            typeof Utils !== 'undefined' && typeof Utils.sanitize === 'function'
              ? Utils.sanitize(String(value || ''))
              : String(value || '');

          const itemsContainer = form.querySelector('#facturaManualItems');
          const subtotal12Label = form.querySelector('#facturaSubtotal12');
          const subtotal0Label = form.querySelector('#facturaSubtotal0');
          const ivaLabel = form.querySelector('#facturaIva');
          const totalLabel = form.querySelector('#facturaTotal');
          const descuentoInput = form.querySelector('#facturaDescuento');

          const recalcular = () => {
            const cantidades = form.querySelectorAll('[name="item_cantidad[]"]');
            const precios = form.querySelectorAll('[name="item_precio[]"]');
            const ivas = form.querySelectorAll('[name="item_iva[]"]');
            const subtotales = form.querySelectorAll('.line-total');
            let subtotal12 = 0;
            let subtotal0 = 0;
            let ivaTotal = 0;

            cantidades.forEach((cantidadInput, index) => {
              const cantidad = parseFloat(cantidadInput.value) || 0;
              const precio = parseFloat(precios[index]?.value) || 0;
              const ivaTarifa = parseFloat(ivas[index]?.value) || 0;
              const base = cantidad * precio;
              if (subtotales[index]) {
                subtotales[index].textContent = formatearValor(base);
              }
              if (base <= 0) {
                return;
              }
              if (ivaTarifa > 0) {
                subtotal12 += base;
                ivaTotal += base * (ivaTarifa / 100);
              } else {
                subtotal0 += base;
              }
            });

            const descuento = Math.min(
              parseFloat(descuentoInput.value) || 0,
              subtotal12 + subtotal0
            );
            const total = subtotal12 + subtotal0 - descuento + ivaTotal;

            subtotal12Label.textContent = formatearValor(subtotal12);
            subtotal0Label.textContent = formatearValor(subtotal0);
            ivaLabel.textContent = formatearValor(ivaTotal);
            totalLabel.textContent = formatearValor(total);
          };

          const agregarLinea = (prefill = {}) => {
            const cantidadPrefill = Number(prefill.cantidad ?? 1) || 1;
            const precioPrefill = Number(prefill.precio ?? 0) || 0;
            const ivaPrefill =
              prefill.iva === 0 || prefill.iva === 12 || prefill.iva === 15 ? prefill.iva : 12;

            const row = document.createElement('div');
            row.className = 'doc-detail-row';
            row.innerHTML = `
              <input type="text" name="item_codigo[]" class="form-control" placeholder="SKU" value="${sanitize(prefill.codigo || '')}">
              <input type="text" name="item_descripcion[]" class="form-control" placeholder="Descripción del producto o servicio" value="${sanitize(prefill.descripcion || '')}" required>
              <input type="number" step="0.01" min="0" name="item_cantidad[]" class="form-control" value="${cantidadPrefill}" required>
              <input type="number" step="0.01" min="0" name="item_precio[]" class="form-control" value="${precioPrefill}" required>
              <select name="item_iva[]" class="form-control">
                <option value="0" ${ivaPrefill === 0 ? 'selected' : ''}>0%</option>
                <option value="12" ${ivaPrefill === 12 ? 'selected' : ''}>12%</option>
                <option value="15" ${ivaPrefill === 15 ? 'selected' : ''}>15%</option>
              </select>
              <span class="line-total">${formatearValor(0)}</span>
              <button type="button" class="btn-icon" data-action="remove" title="Eliminar línea">&times;</button>
            `;

            row.querySelectorAll('input, select').forEach((input) => {
              input.addEventListener('input', recalcular);
              if (input.tagName === 'SELECT') {
                input.addEventListener('change', recalcular);
              }
            });

            row.querySelector('[data-action="remove"]').addEventListener('click', () => {
              row.remove();
              recalcular();
            });

            itemsContainer.appendChild(row);
            recalcular();
          };

          form
            .querySelector('[data-action="add-item"]')
            .addEventListener('click', () => agregarLinea());
          descuentoInput.addEventListener('input', recalcular);

          agregarLinea();
        },
        onSubmit: (formData, { cerrar, form }) => {
          const obtenerNumero = (valor, decimales = 2) => {
            const numero = parseFloat(valor);
            return Number.isFinite(numero) ? Number(numero.toFixed(decimales)) : 0;
          };

          const clienteNombre = (formData.get('clienteNombre') || '').trim();
          if (!clienteNombre) {
            Utils.showToast('Ingresa el nombre del cliente.', 'warning');
            return;
          }

          const descripciones = formData.getAll('item_descripcion[]');
          const cantidades = formData.getAll('item_cantidad[]');
          const precios = formData.getAll('item_precio[]');
          const ivas = formData.getAll('item_iva[]');
          const codigos = formData.getAll('item_codigo[]');

          const items = descripciones
            .map((descripcion, index) => {
              const desc = (descripcion || '').trim();
              const cantidad = obtenerNumero(cantidades[index], 4);
              const precioUnitario = obtenerNumero(precios[index], 4);
              const ivaTarifa = obtenerNumero(ivas[index], 4);
              const codigo = (codigos[index] || '').trim();

              if (!desc || cantidad <= 0 || precioUnitario < 0) {
                return null;
              }

              const subtotal = obtenerNumero(cantidad * precioUnitario, 2);

              return {
                productoId: null,
                codigoPrincipal: codigo,
                codigo,
                descripcion: desc,
                nombre: desc,
                cantidad,
                precioUnitario,
                precio: precioUnitario,
                precioTotal: subtotal,
                precio_total: subtotal,
                subtotal,
                total: subtotal,
                iva: ivaTarifa,
                iva_aplicado: ivaTarifa,
                descuento: 0,
              };
            })
            .filter(Boolean);

          if (items.length === 0) {
            Utils.showToast('Agrega al menos un producto o servicio.', 'warning');
            return;
          }

          let subtotal12 = 0;
          let subtotal0 = 0;
          let ivaTotal = 0;

          items.forEach((item) => {
            const base = item.precioTotal || 0;
            const ivaTarifa = Number(item.iva_aplicado || item.iva || 0);
            if (ivaTarifa > 0) {
              subtotal12 += base;
              ivaTotal += base * (ivaTarifa / 100);
            } else {
              subtotal0 += base;
            }
          });

          const descuento = Math.min(
            obtenerNumero(formData.get('descuento'), 2),
            subtotal12 + subtotal0
          );
          const total = subtotal12 + subtotal0 - descuento + ivaTotal;

          const fechaInput = formData.get('fecha');
          const fechaIso = fechaInput
            ? new Date(`${fechaInput}T00:00:00`).toISOString()
            : new Date().toISOString();

          try {
            DocumentosController.registrarFactura({
              clienteNombre,
              clienteIdentificacion: (formData.get('clienteIdentificacion') || '').trim() || null,
              clienteEmail: (formData.get('clienteEmail') || '').trim() || null,
              clienteTelefono: (formData.get('clienteTelefono') || '').trim() || null,
              fecha: fechaIso,
              estado: formData.get('estado') || 'emitida',
              subtotal12: Number(subtotal12.toFixed(2)),
              subtotal0: Number(subtotal0.toFixed(2)),
              descuento: Number(descuento.toFixed(2)),
              iva: Number(ivaTotal.toFixed(2)),
              total: Number(total.toFixed(2)),
              items,
            });
          } catch (error) {
            console.error('Error al registrar la factura manual:', error);
            Utils.showToast(
              'No se pudo registrar la factura. Revisa la consola para más detalles.',
              'error'
            );
            return;
          }

          Utils.showToast('Factura registrada correctamente.', 'success');
          cerrar();
          cargarFacturas();
        },
      });
    }

    function mostrarModalRetencion() {
      const proveedores = Database.getCollection('proveedores') || [];
      const opcionesProveedor = proveedores
        .map((prov) => {
          const nombre = prov.nombre || 'Proveedor';
          const identificacion = prov.ruc || prov.identificacion || '';
          const label = Utils.sanitize(`${nombre}${identificacion ? ' - ' + identificacion : ''}`);
          return `<option value="${prov.id}" data-identificacion="${encodeURIComponent(identificacion)}" data-nombre="${encodeURIComponent(nombre)}">${label}</option>`;
        })
        .join('');

      openDocModal({
        id: 'modalRetencion',
        title: 'Registrar Retención',
        submitText: 'Guardar Retención',
        content: `
          <div class="doc-form-grid">
            <div class="form-group">
              <label for="retencionProveedor">Proveedor</label>
              <select id="retencionProveedor" name="proveedorId" class="form-control">
                <option value="">Selecciona proveedor</option>
                ${opcionesProveedor}
                <option value="manual">Ingresar manualmente</option>
              </select>
            </div>
            <div class="form-group">
              <label for="retencionProveedorNombre">Nombre / Razón Social</label>
              <input type="text" id="retencionProveedorNombre" name="proveedorNombre" class="form-control" placeholder="Nombre proveedor" required>
            </div>
            <div class="form-group">
              <label for="retencionProveedorIdentificacion">Identificación</label>
              <input type="text" id="retencionProveedorIdentificacion" name="proveedorIdentificacion" class="form-control" placeholder="RUC o Cédula">
            </div>
            <div class="form-group">
              <label for="retencionFecha">Fecha de emisión</label>
              <input type="date" id="retencionFecha" name="fecha" class="form-control" value="${Utils.getCurrentDate()}" required>
            </div>
            <div class="form-group">
              <label for="retencionEstado">Estado</label>
              <select id="retencionEstado" name="estado" class="form-control">
                <option value="emitida" selected>Emitida</option>
                <option value="borrador">Borrador</option>
              </select>
            </div>
            <div class="form-group">
              <label for="retencionReferencia">Comprobante Base</label>
              <input type="text" id="retencionReferencia" name="compraReferencia" class="form-control" placeholder="Factura proveedor opcional">
            </div>
          </div>
          <div class="doc-detail-block is-retencion">
            <div class="doc-details-header">
              <span>Impuesto</span>
              <span>Concepto</span>
              <span>Código</span>
              <span>Base</span>
              <span>%</span>
              <span>Valor</span>
              <span></span>
            </div>
            <div class="doc-detail-list" id="retencionDetalleList"></div>
          </div>
          <div class="doc-detail-actions">
            <button type="button" class="btn btn-outline" data-action="add-detalle">Agregar detalle</button>
          </div>
          <div class="doc-summary">
            <span>Total retenido</span>
            <strong id="retencionTotal">${formatearValor(0)}</strong>
          </div>
        `,
        onOpen: ({ form }) => {
          const proveedorSelect = form.querySelector('#retencionProveedor');
          const proveedorNombre = form.querySelector('#retencionProveedorNombre');
          const proveedorIdentificacion = form.querySelector('#retencionProveedorIdentificacion');
          const detalleList = form.querySelector('#retencionDetalleList');
          const totalLabel = form.querySelector('#retencionTotal');

          const recalcular = () => {
            const bases = Array.from(form.querySelectorAll('[name="detalle_base[]"]'));
            const porcentajes = Array.from(form.querySelectorAll('[name="detalle_porcentaje[]"]'));
            const valores = Array.from(form.querySelectorAll('[name="detalle_valor[]"]'));
            let total = 0;
            bases.forEach((baseInput, index) => {
              const base = parseFloat(baseInput.value) || 0;
              const porcentaje = parseFloat(porcentajes[index]?.value) || 0;
              const valor = base * (porcentaje / 100);
              if (valores[index]) {
                valores[index].value = valor.toFixed(2);
              }
              total += valor;
            });
            totalLabel.textContent = formatearValor(total);
          };

          const agregarFila = () => {
            const row = document.createElement('div');
            row.className = 'doc-detail-row';
            row.innerHTML = `
              <select name="detalle_impuesto[]" class="form-control">
                <option value="IVA">IVA</option>
                <option value="RENTA">Renta</option>
                <option value="ISD">ISD</option>
              </select>
              <input type="text" name="detalle_concepto[]" class="form-control" placeholder="Descripción" required>
              <input type="text" name="detalle_codigo[]" class="form-control" placeholder="Código SRI">
              <input type="number" step="0.01" min="0" name="detalle_base[]" class="form-control" value="0" required>
              <input type="number" step="0.01" min="0" name="detalle_porcentaje[]" class="form-control" value="1" required>
              <input type="number" step="0.01" min="0" name="detalle_valor[]" class="form-control" value="0" readonly>
              <button type="button" class="btn-icon" data-action="remove" title="Eliminar detalle">&times;</button>
            `;

            row.querySelectorAll('input').forEach((input) => {
              input.addEventListener('input', recalcular);
            });

            row.querySelector('[data-action="remove"]').addEventListener('click', () => {
              row.remove();
              recalcular();
            });

            detalleList.appendChild(row);
            recalcular();
          };

          form.querySelector('[data-action="add-detalle"]').addEventListener('click', agregarFila);

          proveedorSelect.addEventListener('change', () => {
            const selected = proveedorSelect.value;
            if (selected && selected !== 'manual') {
              const option = proveedorSelect.selectedOptions[0];
              const nombre = option ? decodeURIComponent(option.dataset.nombre || '') : '';
              const identificacion = option
                ? decodeURIComponent(option.dataset.identificacion || '')
                : '';
              proveedorNombre.value = nombre || option.textContent;
              proveedorIdentificacion.value = identificacion;
            } else {
              proveedorNombre.value = '';
              proveedorIdentificacion.value = '';
            }
          });

          agregarFila();
        },
        onSubmit: (formData, { form, cerrar }) => {
          const proveedorId = formData.get('proveedorId');
          const proveedorNombre = formData.get('proveedorNombre');
          const proveedorIdentificacion = formData.get('proveedorIdentificacion');
          const fecha = formData.get('fecha');
          const estado = formData.get('estado') || 'emitida';
          const compraReferencia = formData.get('compraReferencia') || null;

          if (!proveedorNombre) {
            Utils.showToast('Ingresa la información del proveedor.', 'warning');
            return;
          }

          const impuestos = formData.getAll('detalle_impuesto[]');
          const conceptos = formData.getAll('detalle_concepto[]');
          const codigos = formData.getAll('detalle_codigo[]');
          const bases = formData.getAll('detalle_base[]');
          const porcentajes = formData.getAll('detalle_porcentaje[]');
          const valores = formData.getAll('detalle_valor[]');

          if (impuestos.length === 0) {
            Utils.showToast('Agrega al menos un detalle de retención.', 'warning');
            return;
          }

          const detalles = impuestos
            .map((imp, index) => {
              const base = parseFloat(bases[index]) || 0;
              const porcentaje = parseFloat(porcentajes[index]) || 0;
              const valor = base * (porcentaje / 100);
              return {
                impuesto: imp,
                concepto: conceptos[index] || '',
                codigo: codigos[index] || '',
                base,
                porcentaje,
                valor: Number((parseFloat(valores[index]) || valor).toFixed(2)),
              };
            })
            .filter((det) => det.base > 0 && det.porcentaje >= 0);

          if (detalles.length === 0) {
            Utils.showToast('Los importes de retención deben ser mayores a cero.', 'warning');
            return;
          }

          const proveedor = proveedores.find((p) => p.id === proveedorId) || null;

          DocumentosController.registrarRetencion({
            proveedorId: proveedorId && proveedorId !== 'manual' ? proveedorId : null,
            proveedorNombre,
            proveedor: proveedor || {
              nombre: proveedorNombre,
              identificacion: proveedorIdentificacion,
            },
            proveedorIdentificacion,
            fecha,
            estado,
            detalles,
            compraReferencia,
          });

          Utils.showToast('Retención registrada correctamente.', 'success');
          cerrar();
          cargarRetenciones();
        },
      });
    }

    function mostrarModalGuia() {
      const configFiscal = DocumentosController.getConfiguracionFiscal();
      openDocModal({
        id: 'modalGuia',
        title: 'Nueva Guía de Remisión',
        submitText: 'Guardar Guía',
        content: `
          <div class="doc-form-grid">
            <div class="form-group">
              <label for="guiaTransportistaNombre">Transportista</label>
              <input type="text" id="guiaTransportistaNombre" name="transportistaNombre" class="form-control" placeholder="Nombre transportista" required>
            </div>
            <div class="form-group">
              <label for="guiaTransportistaIdentificacion">Identificación</label>
              <input type="text" id="guiaTransportistaIdentificacion" name="transportistaIdentificacion" class="form-control" placeholder="RUC o Cédula" required>
            </div>
            <div class="form-group">
              <label for="guiaPlaca">Placa vehículo</label>
              <input type="text" id="guiaPlaca" name="placa" class="form-control" placeholder="ABC-1234" required>
            </div>
            <div class="form-group">
              <label for="guiaPuntoPartida">Punto de partida</label>
              <input type="text" id="guiaPuntoPartida" name="puntoPartida" class="form-control" value="${Utils.sanitize(configFiscal.direccionMatriz || configFiscal.direccion || '')}" required>
            </div>
            <div class="form-group">
              <label for="guiaPuntoLlegada">Punto de llegada</label>
              <input type="text" id="guiaPuntoLlegada" name="puntoLlegada" class="form-control" placeholder="Ciudad / dirección de destino" required>
            </div>
            <div class="form-group">
              <label for="guiaFechaInicio">Fecha inicio transporte</label>
              <input type="datetime-local" id="guiaFechaInicio" name="fechaInicio" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="guiaFechaFin">Fecha fin transporte</label>
              <input type="datetime-local" id="guiaFechaFin" name="fechaFin" class="form-control" required>
            </div>
          </div>
          <div class="form-group">
            <label for="guiaDestinatarios">Destinatarios (un destinatario por línea: Nombre | Destino)</label>
            <textarea id="guiaDestinatarios" name="destinatarios" class="form-control" rows="4" placeholder="Ejemplo: Juan Pérez | Quito, Av. Amazonas"></textarea>
          </div>
          <div class="form-group">
            <label for="guiaObservaciones">Observaciones</label>
            <textarea id="guiaObservaciones" name="observaciones" class="form-control" rows="3" placeholder="Detalle adicional del transporte"></textarea>
          </div>
        `,
        onSubmit: (formData, { cerrar }) => {
          const transportistaNombre = formData.get('transportistaNombre');
          const transportistaIdentificacion = formData.get('transportistaIdentificacion');
          const placa = formData.get('placa');
          const puntoPartida = formData.get('puntoPartida');
          const puntoLlegada = formData.get('puntoLlegada');
          const fechaInicio = formData.get('fechaInicio');
          const fechaFin = formData.get('fechaFin');

          if (
            !transportistaNombre ||
            !transportistaIdentificacion ||
            !placa ||
            !puntoPartida ||
            !puntoLlegada ||
            !fechaInicio ||
            !fechaFin
          ) {
            Utils.showToast('Completa todos los campos obligatorios de la guía.', 'warning');
            return;
          }

          const destinatariosTexto = formData.get('destinatarios') || '';
          const destinatarios = destinatariosTexto
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const partes = line.includes('|') ? line.split('|') : line.split('-');
              const nombre = partes[0]?.trim() || '';
              const destino = partes[1]?.trim() || '';
              return { nombre, destino };
            });

          DocumentosController.registrarGuiaRemision({
            transportista: {
              nombre: transportistaNombre,
              identificacion: transportistaIdentificacion,
            },
            transportistaNombre,
            transportistaIdentificacion,
            placa,
            puntoPartida,
            puntoLlegada,
            fechaInicioTransporte: fechaInicio,
            fechaFinTransporte: fechaFin,
            destinatarios,
            estado: 'emitida',
            notas: formData.get('observaciones') || '',
          });

          Utils.showToast('Guía de remisión registrada correctamente.', 'success');
          cerrar();
          cargarGuias();
        },
      });
    }

    function mostrarModalNotaCredito() {
      const facturas = Database.getCollection('facturas') || [];
      if (facturas.length === 0) {
        Utils.showToast('No existen facturas para generar notas de crédito.', 'warning');
        return;
      }

      const opcionesFactura = facturas
        .map((fac) => {
          const numero = Utils.sanitize(fac.numero || fac.id);
          const cliente = Utils.sanitize(fac.clienteNombre || 'Cliente');
          const total = formatearValor(fac.total || 0);
          return `<option value="${fac.id}" data-total="${fac.total || 0}">${numero} — ${cliente} (${total})</option>`;
        })
        .join('');

      openDocModal({
        id: 'modalNotaCredito',
        title: 'Nueva Nota de Crédito',
        submitText: 'Guardar Nota de Crédito',
        content: `
          <div class="doc-form-grid">
            <div class="form-group">
              <label for="notaCreditoFactura">Factura relacionada</label>
              <select id="notaCreditoFactura" name="facturaId" class="form-control" required>
                <option value="">Selecciona factura</option>
                ${opcionesFactura}
              </select>
            </div>
            <div class="form-group">
              <label for="notaCreditoMotivo">Motivo</label>
              <input type="text" id="notaCreditoMotivo" name="motivo" class="form-control" placeholder="Motivo de la nota de crédito" required>
            </div>
            <div class="form-group">
              <label for="notaCreditoEstado">Estado</label>
              <select id="notaCreditoEstado" name="estado" class="form-control">
                <option value="emitida" selected>Emitida</option>
                <option value="borrador">Borrador</option>
              </select>
            </div>
          </div>
          <div class="doc-detail-block is-nota">
            <div class="doc-details-header">
              <span>Descripción</span>
              <span>Cantidad</span>
              <span>Valor unitario</span>
              <span>Valor total</span>
              <span></span>
            </div>
            <div class="doc-detail-list" id="notaCreditoItems"></div>
          </div>
          <div class="doc-detail-actions">
            <button type="button" class="btn btn-outline" data-action="add-item">Agregar concepto</button>
          </div>
          <div class="doc-summary">
            <span>Total nota</span>
            <strong id="notaCreditoTotal">${formatearValor(0)}</strong>
          </div>
        `,
        onOpen: ({ form }) => {
          const itemsContainer = form.querySelector('#notaCreditoItems');
          const totalLabel = form.querySelector('#notaCreditoTotal');

          const recalcular = () => {
            const cantidades = form.querySelectorAll('[name="nota_cantidad[]"]');
            const precios = form.querySelectorAll('[name="nota_precio[]"]');
            const totales = form.querySelectorAll('.line-total');
            let total = 0;
            cantidades.forEach((cantidadInput, index) => {
              const cantidad = parseFloat(cantidadInput.value) || 0;
              const precio = parseFloat(precios[index]?.value) || 0;
              const valor = cantidad * precio;
              if (totales[index]) {
                totales[index].textContent = formatearValor(valor);
              }
              total += valor;
            });
            totalLabel.textContent = formatearValor(total);
          };

          const agregarItem = () => {
            const row = document.createElement('div');
            row.className = 'doc-detail-row';
            row.innerHTML = `
              <input type="text" name="nota_descripcion[]" class="form-control" placeholder="Concepto" required>
              <input type="number" step="0.01" min="0" name="nota_cantidad[]" class="form-control" value="1" required>
              <input type="number" step="0.01" min="0" name="nota_precio[]" class="form-control" value="0" required>
              <span class="line-total">${formatearValor(0)}</span>
              <button type="button" class="btn-icon" data-action="remove" title="Eliminar">&times;</button>
            `;

            row.querySelectorAll('input').forEach((input) => {
              input.addEventListener('input', recalcular);
            });

            row.querySelector('[data-action="remove"]').addEventListener('click', () => {
              row.remove();
              recalcular();
            });

            itemsContainer.appendChild(row);
            recalcular();
          };

          form.querySelector('[data-action="add-item"]').addEventListener('click', agregarItem);
          agregarItem();
        },
        onSubmit: (formData, { cerrar }) => {
          const facturaId = formData.get('facturaId');
          const motivo = formData.get('motivo');
          const estado = formData.get('estado') || 'emitida';

          const descripciones = formData.getAll('nota_descripcion[]');
          const cantidades = formData.getAll('nota_cantidad[]');
          const precios = formData.getAll('nota_precio[]');

          const items = descripciones
            .map((descripcion, index) => {
              const cantidad = parseFloat(cantidades[index]) || 0;
              const precio = parseFloat(precios[index]) || 0;
              return {
                descripcion,
                cantidad,
                precio,
                total: Number((cantidad * precio).toFixed(2)),
              };
            })
            .filter((item) => item.cantidad > 0 && item.precio >= 0);

          if (items.length === 0) {
            Utils.showToast('Agrega al menos un concepto para la nota de crédito.', 'warning');
            return;
          }

          const total = items.reduce((acc, item) => acc + item.total, 0);

          DocumentosController.registrarNotaCredito({
            facturaId,
            motivo,
            estado,
            items,
            total,
          });

          Utils.showToast('Nota de crédito registrada correctamente.', 'success');
          cerrar();
          cargarNotasCredito();
        },
      });
    }

    function mostrarModalNotaDebito() {
      const facturas = Database.getCollection('facturas') || [];
      if (facturas.length === 0) {
        Utils.showToast('No existen facturas para generar notas de débito.', 'warning');
        return;
      }

      const opcionesFactura = facturas
        .map((fac) => {
          const numero = Utils.sanitize(fac.numero || fac.id);
          const cliente = Utils.sanitize(fac.clienteNombre || 'Cliente');
          const total = formatearValor(fac.total || 0);
          return `<option value="${fac.id}">${numero} — ${cliente} (${total})</option>`;
        })
        .join('');

      openDocModal({
        id: 'modalNotaDebito',
        title: 'Nueva Nota de Débito',
        submitText: 'Guardar Nota de Débito',
        content: `
          <div class="doc-form-grid">
            <div class="form-group">
              <label for="notaDebitoFactura">Factura relacionada</label>
              <select id="notaDebitoFactura" name="facturaId" class="form-control" required>
                <option value="">Selecciona factura</option>
                ${opcionesFactura}
              </select>
            </div>
            <div class="form-group">
              <label for="notaDebitoMotivo">Motivo</label>
              <input type="text" id="notaDebitoMotivo" name="motivo" class="form-control" placeholder="Motivo de la nota de débito" required>
            </div>
            <div class="form-group">
              <label for="notaDebitoRecargo">Recargo ($)</label>
              <input type="number" step="0.01" min="0" id="notaDebitoRecargo" name="recargo" class="form-control" value="0" required>
            </div>
            <div class="form-group">
              <label for="notaDebitoEstado">Estado</label>
              <select id="notaDebitoEstado" name="estado" class="form-control">
                <option value="emitida" selected>Emitida</option>
                <option value="borrador">Borrador</option>
              </select>
            </div>
          </div>
          <div class="doc-detail-block is-debito">
            <div class="doc-details-header">
              <span>Impuesto</span>
              <span>Base</span>
              <span>%</span>
              <span></span>
            </div>
            <div class="doc-detail-list" id="notaDebitoImpuestos"></div>
          </div>
          <div class="doc-detail-actions">
            <button type="button" class="btn btn-outline" data-action="add-impuesto">Agregar impuesto</button>
          </div>
          <div class="doc-summary">
            <span>Total nota</span>
            <strong id="notaDebitoTotal">${formatearValor(0)}</strong>
          </div>
        `,
        onOpen: ({ form }) => {
          const impuestosContainer = form.querySelector('#notaDebitoImpuestos');
          const totalLabel = form.querySelector('#notaDebitoTotal');
          const recargoInput = form.querySelector('#notaDebitoRecargo');

          const recalcular = () => {
            const bases = form.querySelectorAll('[name="debito_base[]"]');
            const porcentajes = form.querySelectorAll('[name="debito_porcentaje[]"]');
            let impuestosTotal = 0;
            bases.forEach((baseInput, index) => {
              const base = parseFloat(baseInput.value) || 0;
              const porcentaje = parseFloat(porcentajes[index]?.value) || 0;
              impuestosTotal += base * (porcentaje / 100);
            });
            const recargo = parseFloat(recargoInput.value) || 0;
            const total = recargo + impuestosTotal;
            totalLabel.textContent = formatearValor(total);
          };

          const agregarImpuesto = () => {
            const row = document.createElement('div');
            row.className = 'doc-detail-row';
            row.innerHTML = `
              <select name="debito_impuesto[]" class="form-control">
                <option value="IVA">IVA</option>
                <option value="ICE">ICE</option>
                <option value="IRBPNR">IRBPNR</option>
              </select>
              <input type="number" step="0.01" min="0" name="debito_base[]" class="form-control" value="0" required>
              <input type="number" step="0.01" min="0" name="debito_porcentaje[]" class="form-control" value="12" required>
              <button type="button" class="btn-icon" data-action="remove" title="Eliminar">&times;</button>
            `;

            row
              .querySelectorAll('input')
              .forEach((input) => input.addEventListener('input', recalcular));
            row.querySelector('[data-action="remove"]').addEventListener('click', () => {
              row.remove();
              recalcular();
            });

            impuestosContainer.appendChild(row);
            recalcular();
          };

          form
            .querySelector('[data-action="add-impuesto"]')
            .addEventListener('click', agregarImpuesto);
          recargoInput.addEventListener('input', recalcular);
          agregarImpuesto();
        },
        onSubmit: (formData, { cerrar, form }) => {
          const facturaId = formData.get('facturaId');
          const motivo = formData.get('motivo');
          const recargo = parseFloat(formData.get('recargo')) || 0;
          const estado = formData.get('estado') || 'emitida';

          const impuestos = formData.getAll('debito_impuesto[]');
          const bases = formData.getAll('debito_base[]');
          const porcentajes = formData.getAll('debito_porcentaje[]');

          const detalle = impuestos
            .map((impuesto, index) => {
              const base = parseFloat(bases[index]) || 0;
              const porcentaje = parseFloat(porcentajes[index]) || 0;
              return {
                impuesto,
                base,
                porcentaje,
                valor: Number((base * (porcentaje / 100)).toFixed(2)),
              };
            })
            .filter((item) => item.base > 0 && item.porcentaje >= 0);

          if (detalle.length === 0 && recargo === 0) {
            Utils.showToast('Ingresa un recargo o al menos un impuesto.', 'warning');
            return;
          }

          const total = detalle.reduce((acc, item) => acc + item.valor, recargo);

          DocumentosController.registrarNotaDebito({
            facturaId,
            motivo,
            recargo,
            impuestos: detalle,
            total,
            estado,
          });

          Utils.showToast('Nota de débito registrada correctamente.', 'success');
          cerrar();
          cargarNotasDebito();
        },
      });
    }

    function mostrarModalProforma() {
      const clientes = Database.getCollection('clientes') || [];
      const productos = Database.getCollection('productos') || [];

      const opcionesClientes = clientes
        .map((cliente) => {
          const nombre = cliente.nombre || 'Cliente';
          const identificacion = cliente.ruc || cliente.cedula || cliente.identificacion || '';
          const label = Utils.sanitize(`${nombre}${identificacion ? ' - ' + identificacion : ''}`);
          return `<option value="${cliente.id}" data-nombre="${encodeURIComponent(nombre)}" data-identificacion="${encodeURIComponent(identificacion)}" data-email="${encodeURIComponent(cliente.email || '')}" data-telefono="${encodeURIComponent(cliente.telefono || '')}" data-direccion="${encodeURIComponent(cliente.direccion || '')}">${label}</option>`;
        })
        .join('');

      const opcionesProductos = productos
        .map((producto) => {
          const nombre = producto.nombre || producto.descripcion || 'Producto';
          return `<option value="${producto.id}" data-nombre="${encodeURIComponent(nombre)}" data-precio="${producto.precioVenta || 0}" data-iva="${producto.iva || 12}">${Utils.sanitize(`${nombre} (${formatearValor(producto.precioVenta || 0)})`)}</option>`;
        })
        .join('');

      openDocModal({
        id: 'modalProforma',
        title: 'Nueva Proforma / Cotización',
        submitText: 'Guardar Proforma',
        content: `
          <div class="doc-form-grid">
            <div class="form-group">
              <label for="proformaCliente">Cliente</label>
              <select id="proformaCliente" name="clienteId" class="form-control">
                <option value="">Venta mostrador / Cliente genérico</option>
                ${opcionesClientes}
              </select>
            </div>
            <div class="form-group">
              <label for="proformaClienteNombre">Nombre</label>
              <input type="text" id="proformaClienteNombre" name="clienteNombre" class="form-control" placeholder="Nombre del cliente" required>
            </div>
            <div class="form-group">
              <label for="proformaClienteIdentificacion">Identificación</label>
              <input type="text" id="proformaClienteIdentificacion" name="clienteIdentificacion" class="form-control" placeholder="RUC / Cédula">
            </div>
            <div class="form-group">
              <label for="proformaClienteEmail">Correo electrónico</label>
              <input type="email" id="proformaClienteEmail" name="clienteEmail" class="form-control" placeholder="cliente@email.com">
            </div>
            <div class="form-group">
              <label for="proformaClienteTelefono">Teléfono</label>
              <input type="text" id="proformaClienteTelefono" name="clienteTelefono" class="form-control" placeholder="0999999999">
            </div>
            <div class="form-group">
              <label for="proformaFecha">Fecha</label>
              <input type="date" id="proformaFecha" name="fecha" class="form-control" value="${Utils.getCurrentDate()}" required>
            </div>
            <div class="form-group">
              <label for="proformaValidez">Validez de la oferta</label>
              <input type="text" id="proformaValidez" name="validez" class="form-control" placeholder="Ej: 15 días">
            </div>
            <div class="form-group">
              <label for="proformaEstado">Estado</label>
              <select id="proformaEstado" name="estado" class="form-control">
                <option value="borrador" selected>Borrador</option>
                <option value="emitida">Emitida</option>
              </select>
            </div>
          </div>
          <div class="doc-detail-block is-proforma">
            <div class="doc-details-header">
              <span>Producto / Descripción</span>
              <span>Detalle adicional</span>
              <span>Cantidad</span>
              <span>Precio unitario</span>
              <span>IVA %</span>
              <span>Total</span>
              <span></span>
            </div>
            <div class="doc-detail-list" id="proformaItems"></div>
          </div>
          <div class="doc-detail-actions">
            <button type="button" class="btn btn-outline" data-action="add-proforma-item">Agregar producto</button>
          </div>
          <div class="doc-summary-grid">
            <div class="summary-item">
              <span>Subtotal 12%</span>
              <strong id="proformaSubtotal12">${formatearValor(0)}</strong>
            </div>
            <div class="summary-item">
              <span>Subtotal 0%</span>
              <strong id="proformaSubtotal0">${formatearValor(0)}</strong>
            </div>
            <div class="summary-item">
              <span>IVA calculado</span>
              <strong id="proformaIva">${formatearValor(0)}</strong>
            </div>
            <div class="summary-item">
              <label for="proformaDescuento">Descuento ($)</label>
              <input type="number" step="0.01" min="0" id="proformaDescuento" name="descuento" class="form-control" value="0">
            </div>
            <div class="summary-item">
              <span>Total proforma</span>
              <strong id="proformaTotal">${formatearValor(0)}</strong>
            </div>
          </div>
          <div class="form-group" style="margin-top: var(--spacing-lg);">
            <label for="proformaNotas">Notas adicionales</label>
            <textarea id="proformaNotas" name="notas" class="form-control" rows="3" placeholder="Condiciones de la oferta, formas de pago, tiempos de entrega"></textarea>
          </div>
        `,
        onOpen: ({ form }) => {
          const clienteSelect = form.querySelector('#proformaCliente');
          const clienteNombre = form.querySelector('#proformaClienteNombre');
          const clienteIdentificacion = form.querySelector('#proformaClienteIdentificacion');
          const clienteEmail = form.querySelector('#proformaClienteEmail');
          const clienteTelefono = form.querySelector('#proformaClienteTelefono');
          const itemsContainer = form.querySelector('#proformaItems');
          const subtotal12Label = form.querySelector('#proformaSubtotal12');
          const subtotal0Label = form.querySelector('#proformaSubtotal0');
          const ivaLabel = form.querySelector('#proformaIva');
          const totalLabel = form.querySelector('#proformaTotal');
          const descuentoInput = form.querySelector('#proformaDescuento');

          const recalcular = () => {
            const cantidades = form.querySelectorAll('[name="item_cantidad[]"]');
            const precios = form.querySelectorAll('[name="item_precio[]"]');
            const ivas = form.querySelectorAll('[name="item_iva[]"]');
            const totales = form.querySelectorAll('.line-total');
            let subtotal12 = 0;
            let subtotal0 = 0;
            let ivaTotal = 0;

            cantidades.forEach((cantidadInput, index) => {
              const cantidad = parseFloat(cantidadInput.value) || 0;
              const precio = parseFloat(precios[index]?.value) || 0;
              const ivaTarifa = parseFloat(ivas[index]?.value) || 0;
              const lineTotal = cantidad * precio;
              if (totales[index]) {
                totales[index].textContent = formatearValor(lineTotal);
              }

              if (ivaTarifa > 0) {
                subtotal12 += lineTotal;
                ivaTotal += lineTotal * (ivaTarifa / 100);
              } else {
                subtotal0 += lineTotal;
              }
            });

            const descuento = Math.min(
              parseFloat(descuentoInput.value) || 0,
              subtotal12 + subtotal0 + ivaTotal
            );
            const total = subtotal12 + subtotal0 + ivaTotal - descuento;

            subtotal12Label.textContent = formatearValor(subtotal12);
            subtotal0Label.textContent = formatearValor(subtotal0);
            ivaLabel.textContent = formatearValor(ivaTotal);
            totalLabel.textContent = formatearValor(total);
          };

          const agregarItem = () => {
            const row = document.createElement('div');
            row.className = 'doc-detail-row';
            row.innerHTML = `
              <select name="item_producto[]" class="form-control">
                <option value="">Selecciona producto</option>
                ${opcionesProductos}
                <option value="manual">Ingreso manual</option>
              </select>
              <input type="text" name="item_descripcion[]" class="form-control" placeholder="Detalle adicional">
              <input type="number" step="0.01" min="0" name="item_cantidad[]" class="form-control" value="1" required>
              <input type="number" step="0.01" min="0" name="item_precio[]" class="form-control" value="0" required>
              <select name="item_iva[]" class="form-control">
                <option value="0">0%</option>
                <option value="12" selected>12%</option>
                <option value="15">15%</option>
              </select>
              <span class="line-total">${formatearValor(0)}</span>
              <button type="button" class="btn-icon" data-action="remove" title="Eliminar">&times;</button>
            `;

            const productoSelect = row.querySelector('select[name="item_producto[]"]');
            const descripcionInput = row.querySelector('input[name="item_descripcion[]"]');
            const cantidadInput = row.querySelector('input[name="item_cantidad[]"]');
            const precioInput = row.querySelector('input[name="item_precio[]"]');
            const ivaSelect = row.querySelector('select[name="item_iva[]"]');

            productoSelect.addEventListener('change', () => {
              const option = productoSelect.selectedOptions[0];
              if (option && option.value && option.value !== 'manual') {
                const nombreProducto = option
                  ? decodeURIComponent(option.dataset.nombre || '')
                  : '';
                descripcionInput.value = nombreProducto || descripcionInput.value;
                precioInput.value = Number(option.dataset.precio || 0).toFixed(2);
                ivaSelect.value = option.dataset.iva || '12';
              }
              recalcular();
            });

            [descripcionInput, cantidadInput, precioInput].forEach((input) =>
              input.addEventListener('input', recalcular)
            );
            ivaSelect.addEventListener('change', recalcular);

            row.querySelector('[data-action="remove"]').addEventListener('click', () => {
              row.remove();
              recalcular();
            });

            itemsContainer.appendChild(row);
            recalcular();
          };

          form
            .querySelector('[data-action="add-proforma-item"]')
            .addEventListener('click', agregarItem);
          descuentoInput.addEventListener('input', recalcular);
          agregarItem();

          clienteSelect.addEventListener('change', () => {
            if (!clienteSelect.value) {
              clienteNombre.value = 'Cliente Genérico';
              clienteIdentificacion.value = '';
              clienteEmail.value = '';
              clienteTelefono.value = '';
              return;
            }
            const option = clienteSelect.selectedOptions[0];
            clienteNombre.value = option
              ? decodeURIComponent(option.dataset.nombre || '') || option.textContent
              : 'Cliente';
            clienteIdentificacion.value = option
              ? decodeURIComponent(option.dataset.identificacion || '')
              : '';
            clienteEmail.value = option ? decodeURIComponent(option.dataset.email || '') : '';
            clienteTelefono.value = option ? decodeURIComponent(option.dataset.telefono || '') : '';
          });

          if (clientes[0]) {
            clienteNombre.value = clientes[0].nombre || 'Cliente Genérico';
          } else {
            clienteNombre.value = 'Cliente Genérico';
          }
        },
        onSubmit: (formData, { cerrar, form }) => {
          const clienteId = formData.get('clienteId') || null;
          const clienteNombre = formData.get('clienteNombre') || 'Cliente Genérico';
          const clienteIdentificacion = formData.get('clienteIdentificacion') || '';
          const clienteEmail = formData.get('clienteEmail') || '';
          const clienteTelefono = formData.get('clienteTelefono') || '';
          const fecha = formData.get('fecha');
          const estado = formData.get('estado') || 'borrador';
          const descuentoIngresado = parseFloat(formData.get('descuento')) || 0;

          const productosSeleccionados = formData.getAll('item_producto[]');
          const descripciones = formData.getAll('item_descripcion[]');
          const cantidades = formData.getAll('item_cantidad[]');
          const precios = formData.getAll('item_precio[]');
          const ivas = formData.getAll('item_iva[]');

          const items = productosSeleccionados
            .map((productoId, index) => {
              const cantidad = parseFloat(cantidades[index]) || 0;
              const precio = parseFloat(precios[index]) || 0;
              const iva = parseFloat(ivas[index]) || 0;
              if (!productoId || productoId === 'manual') {
                return {
                  productoId: null,
                  descripcion: descripciones[index] || 'Producto/Servicio',
                  cantidad,
                  precioUnitario: precio,
                  iva,
                  total: Number((cantidad * precio).toFixed(2)),
                };
              }
              const producto = productos.find((p) => p.id === productoId);
              return {
                productoId,
                codigoPrincipal: producto?.codigo || '',
                descripcion: producto?.nombre || descripciones[index] || 'Producto/Servicio',
                cantidad,
                precioUnitario: precio,
                iva,
                total: Number((cantidad * precio).toFixed(2)),
              };
            })
            .filter((item) => item.cantidad > 0 && item.precioUnitario >= 0);

          if (items.length === 0) {
            Utils.showToast('Agrega al menos un ítem a la proforma.', 'warning');
            return;
          }

          let subtotal12 = 0;
          let subtotal0 = 0;
          let ivaTotal = 0;

          items.forEach((item) => {
            if (item.iva > 0) {
              subtotal12 += item.total;
              ivaTotal += item.total * (item.iva / 100);
            } else {
              subtotal0 += item.total;
            }
          });

          const bruto = subtotal12 + subtotal0 + ivaTotal;
          const descuento = Math.min(descuentoIngresado, bruto);
          const total = Math.max(bruto - descuento, 0);

          DocumentosController.registrarProforma({
            clienteId,
            clienteNombre,
            cliente: {
              id: clienteId,
              nombre: clienteNombre,
              identificacion: clienteIdentificacion,
              email: clienteEmail,
              telefono: clienteTelefono,
            },
            clienteIdentificacion,
            clienteEmail,
            clienteTelefono,
            fecha,
            estado,
            subtotal: subtotal12 + subtotal0,
            subtotal12: Number(subtotal12.toFixed(2)),
            subtotal0: Number(subtotal0.toFixed(2)),
            descuento: Number(descuento.toFixed(2)),
            iva: Number(ivaTotal.toFixed(2)),
            total: Number(total.toFixed(2)),
            items,
            notas: formData.get('notas') || '',
            validez: formData.get('validez') || '',
          });

          Utils.showToast('Proforma registrada correctamente.', 'success');
          cerrar();
          cargarProformas();
        },
      });
    }

    document
      .getElementById('btn-nueva-retencion')
      ?.addEventListener('click', mostrarModalRetencion);
    document.getElementById('btn-nueva-guia')?.addEventListener('click', mostrarModalGuia);
    document
      .getElementById('btn-nueva-nota-credito')
      ?.addEventListener('click', mostrarModalNotaCredito);
    document
      .getElementById('btn-nueva-nota-debito')
      ?.addEventListener('click', mostrarModalNotaDebito);
    document.getElementById('btn-nueva-proforma')?.addEventListener('click', mostrarModalProforma);

    cargarFacturas();
    actualizarBotonAccion('facturas');
  }

  window.Facturacion = {
    render(container) {
      if (!container) return;
      container.innerHTML = TEMPLATE;
      initialize();
    },
    destroy() {
      document.querySelectorAll('.doc-modal').forEach((modal) => modal.remove());
    },
  };
})();
