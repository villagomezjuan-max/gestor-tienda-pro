/* ========================================
   PANEL DE IA PARA EL CATÁLOGO TÉCNICO
   ======================================== */

(function () {
  const PANEL_ID = 'modalIACatalogo';

  function buildPrompt(producto) {
    const compatibilidad = (producto.compatibilidad || [])
      .map(
        (ref) =>
          `- ${ref.marca || ''} ${ref.modelo || ''} (${ref.anios || 'Años n/d'}) motor ${ref.motor || 'n/d'}${ref.detalle ? ` | ${ref.detalle}` : ''}`
      )
      .join('\n');

    const proveedores = (producto.proveedores || [])
      .map(
        (prov) =>
          `- ${prov.nombre || 'Proveedor n/d'} | costo: ${prov.costoReferencial || 'n/d'} | disponibilidad: ${prov.disponibilidad || 'n/d'}${prov.ubicacion ? ` | ${prov.ubicacion}` : ''}${prov.notas ? ` | notas: ${prov.notas}` : ''}`
      )
      .join('\n');

    const procedimientos = (producto.procedimientos || [])
      .map((paso, idx) => `${idx + 1}. ${paso}`)
      .join('\n');

    return `Actúa como especialista de repuestos automotrices y asesor de compras para un taller mecánico.

Ficha del producto:
- Nombre: ${producto.nombre}
- SKU: ${producto.sku || 'N/D'}
- Categoría: ${producto.categoria || 'N/D'} / ${producto.subcategoria || 'N/D'}
- Descripción: ${producto.descripcion || 'N/D'}
- Aplicaciones: ${(producto.aplicaciones || []).join(', ') || 'N/D'}
- Compatibilidad:\n${compatibilidad || '- Sin registros'}
- Especificaciones: ${JSON.stringify(producto.especificaciones || {}, null, 2)}
- Procedimientos recomendados:\n${procedimientos || '- Sin procedimientos registrados'}
- Proveedores disponibles:\n${proveedores || '- Sin proveedores registrados'}
- Estado: ${producto.estado || 'desconocido'} (última revisión ${producto.ultimaRevision || 'N/D'})
- Palabras clave: ${(producto.palabrasClave || []).join(', ') || 'N/D'}

Necesito un análisis breve con:
1. Descripción técnica resumida.
2. Recomendaciones de compra (mejor proveedor, costos, consideraciones).
3. Alertas operativas o de compatibilidad relevantes.
4. Checklist rápido para el técnico al instalar o utilizar la pieza.
`;
  }

  function renderTextoPlano(texto) {
    if (!texto) return '<p class="text-muted">Sin información disponible</p>';

    const lineas = texto.split('\n');
    const bloques = [];
    let listaActual = null;

    lineas.forEach((linea) => {
      const trim = linea.trim();
      if (!trim) {
        if (listaActual) {
          bloques.push(`<ul>${listaActual.join('')}</ul>`);
          listaActual = null;
        }
        bloques.push('<br>');
        return;
      }

      if (/^[-*•]/.test(trim)) {
        if (!listaActual) listaActual = [];
        const item = trim.replace(/^[-*•]\s*/, '');
        listaActual.push(`<li>${Utils.sanitize(item)}</li>`);
        return;
      }

      if (/^\d+\./.test(trim)) {
        if (!listaActual) listaActual = [];
        const item = trim.replace(/^\d+\.\s*/, '');
        listaActual.push(`<li>${Utils.sanitize(item)}</li>`);
        return;
      }

      if (listaActual) {
        bloques.push(`<ul>${listaActual.join('')}</ul>`);
        listaActual = null;
      }
      bloques.push(`<p>${Utils.sanitize(trim)}</p>`);
    });

    if (listaActual) {
      bloques.push(`<ul>${listaActual.join('')}</ul>`);
    }

    return bloques.join('');
  }

  function renderFallback(producto) {
    const proveedores = (producto.proveedores || [])
      .map(
        (prov) => `
      <li>
        <strong>${Utils.sanitize(prov.nombre || 'Proveedor')}</strong>
        <div class="ia-fallback-meta">
          <span>Costo ref.: ${Utils.sanitize(prov.costoReferencial || 'N/D')}</span>
          <span>Disponibilidad: ${Utils.sanitize(prov.disponibilidad || 'N/D')}</span>
          ${prov.contacto ? `<span>Contacto: ${Utils.sanitize(prov.contacto)}</span>` : ''}
          ${prov.telefono ? `<span>Tel: ${Utils.sanitize(prov.telefono)}</span>` : ''}
        </div>
        ${prov.notas ? `<p class="ia-fallback-nota">${Utils.sanitize(prov.notas)}</p>` : ''}
      </li>
    `
      )
      .join('');

    return `
      <div class="ia-fallback">
        <p class="text-muted">El servicio de IA no está disponible ahora mismo. Aquí tienes un resumen rápido generado con los datos existentes:</p>
        <h4>${Utils.sanitize(producto.nombre)}</h4>
        <p>${Utils.sanitize(producto.descripcion || 'Sin descripción')}</p>
        ${
          producto.procedimientos?.length
            ? `
          <div class="ia-fallback-block">
            <h5>Procedimientos sugeridos</h5>
            <ol>${producto.procedimientos.map((p) => `<li>${Utils.sanitize(p)}</li>`).join('')}</ol>
          </div>
        `
            : ''
        }
        ${
          proveedores
            ? `
          <div class="ia-fallback-block">
            <h5>Proveedores registrados</h5>
            <ul>${proveedores}</ul>
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  async function solicitarAnalisis(producto) {
    if (!window.IAUnifiedEngine || !IAUnifiedEngine.isDisponible?.()) {
      return { ok: false, contenido: renderFallback(producto) };
    }

    try {
      const prompt = buildPrompt(producto);
      const respuesta = await IAUnifiedEngine.enviarAnalisis?.({
        role: 'user',
        content: prompt,
        maxTokens: 700,
        temperature: 0.3,
        metadata: {
          origen: 'catalogo-tecnico',
          productoId: producto.id,
        },
      });

      if (!respuesta || !respuesta.contenido) {
        return { ok: false, contenido: renderFallback(producto) };
      }

      return { ok: true, contenido: renderTextoPlano(respuesta.contenido) };
    } catch (error) {
      console.error('IA Catalogo:', error);
      return { ok: false, contenido: renderFallback(producto) };
    }
  }

  async function openPanel(producto) {
    if (!producto) {
      Utils.showToast('Selecciona un ítem del catálogo para solicitar ayuda.', 'warning');
      return;
    }

    const body = `
      <div class="ia-panel-loading">
        <div class="spinner"></div>
        <p>Consultando a la IA con la ficha técnica…</p>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="Utils.closeModal('${PANEL_ID}')">Cerrar</button>
    `;

    Utils.closeModal(PANEL_ID);
    const overlay = Utils.createModal(
      PANEL_ID,
      `<i class="fas fa-microchip"></i> Asistente Técnico`,
      body,
      footer,
      'large'
    );

    const contenido = overlay.querySelector('.modal-body');
    contenido.dataset.loading = 'true';

    const resultado = await solicitarAnalisis(producto);
    contenido.dataset.loading = 'false';
    contenido.innerHTML = `
      <div class="ia-panel-respuesta ${resultado.ok ? '' : 'is-fallback'}">
        ${resultado.contenido}
      </div>
    `;
  }

  window.IACatalogoPanel = {
    open: openPanel,
  };
})();
