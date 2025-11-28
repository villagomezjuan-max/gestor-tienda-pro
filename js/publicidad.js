// ============================================
// MÓDULO: PUBLICIDAD EN REDES SOCIALES
// ============================================
// Planificador de publicaciones

window.Publicidad = {
  // Configuración IA
  get IA_CONFIG() {
    const readValue = (key, fallback = '') => {
      if (window.TenantStorage && typeof TenantStorage.getItem === 'function') {
        const scoped = TenantStorage.getItem(key);
        if (scoped !== null && scoped !== undefined && scoped !== '') {
          return scoped;
        }
      } else if (typeof localStorage !== 'undefined') {
        const legacy = localStorage.getItem(key);
        if (legacy !== null && legacy !== undefined && legacy !== '') {
          return legacy;
        }
      }
      return fallback;
    };

    return {
      modo: readValue('ia_proveedor', 'local'),
      geminiApiKey: readValue('ia_gemini_api_key', ''),
      deepseekApiKey: readValue('ia_deepseek_api_key', ''),
      llmstudioApiKey: readValue('ia_llmstudio_api_key', ''),
      apiUrl: readValue('ia_api_url', 'http://localhost:1234/v1'),
      geminiModel: readValue('ia_gemini_model', ''),
      deepseekModel: readValue('ia_deepseek_model', ''),
      llmstudioModel: readValue('ia_llmstudio_model', ''),
    };
  },

  getScopedValue(key) {
    if (window.TenantStorage && typeof TenantStorage.getItem === 'function') {
      return TenantStorage.getItem(key);
    }
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  },

  setScopedValue(key, value) {
    if (window.TenantStorage && typeof TenantStorage.setItem === 'function') {
      TenantStorage.setItem(key, value);
      return;
    }
    if (typeof localStorage !== 'undefined') {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    }
  },

  setScopedJSON(key, value) {
    if (value === null || value === undefined) {
      if (window.TenantStorage && typeof TenantStorage.removeItem === 'function') {
        TenantStorage.removeItem(key);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
      return;
    }

    const serialized = JSON.stringify(value);
    if (window.TenantStorage && typeof TenantStorage.setItem === 'function') {
      TenantStorage.setItem(key, serialized);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized);
    }
  },

  // Estado para el asistente de IA
  asistenteState: {},

  render(container) {
    const publicaciones = Database.getCollection('publicaciones') || [];

    if (!Database.getCollection('prompts_publicitarios')?.length) {
      this.cargarPromptsIniciales();
    }

    container.innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-bullhorn"></i> Publicidad en Redes Sociales</h2>
        <div class="header-actions">
          <button class="btn btn-secondary" onclick="App.loadModule('configuracion', 'ia')">
            <i class="fas fa-cog"></i> Configurar IA Unificada
          </button>
          <button class="btn btn-warning" onclick="Publicidad.verPublicidadesGuardadas()">
            <i class="fas fa-save"></i> Ver Guardadas
          </button>
          <button class="btn btn-primary" onclick="Publicidad.mostrarFormulario()">
            <i class="fas fa-plus"></i> Nueva Publicación
          </button>
          <button class="btn btn-success" onclick="Publicidad.iniciarAsistentePublicidad()">
            <i class="fas fa-magic"></i> Generar con Asistente IA
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--primary-light);">
            <i class="fas fa-calendar-alt" style="color: var(--primary-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${publicaciones.filter((p) => p.estado === 'pendiente').length}</h3>
            <p>Pendientes</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--success-light);">
            <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
          </div>
          <div class="stat-info">
            <h3>${publicaciones.filter((p) => p.estado === 'publicado').length}</h3>
            <p>Publicadas</p>
          </div>
        </div>
      </div>

      <div class="publicaciones-grid" id="publicacionesGrid">
        ${this.renderPublicaciones(publicaciones)}
      </div>
    `;
  },

  renderPublicaciones(publicaciones) {
    if (publicaciones.length === 0) {
      return '<div class="empty-state"><i class="fas fa-bullhorn"></i><p>No hay publicaciones programadas</p></div>';
    }

    return publicaciones
      .map(
        (p) => `
      <div class="publicacion-card">
        <div class="publicacion-header">
          <span class="badge badge-${p.estado === 'publicado' ? 'success' : 'warning'}">${p.estado}</span>
          <i class="fab fa-${this.getRedSocialIcon(p.redSocial)}"></i>
        </div>
        <h4>${p.titulo}</h4>
        <p>${p.contenido.substring(0, 100)}...</p>
        <div class="publicacion-meta">
          <span><i class="fas fa-calendar"></i> ${p.fecha}</span>
          <span><i class="fas fa-clock"></i> ${p.hora}</span>
        </div>
        <div class="publicacion-actions">
          ${
            p.estado !== 'publicado'
              ? `
            <button class="btn btn-sm btn-success" onclick="Publicidad.marcarPublicado('${p.id}')">
              <i class="fas fa-check"></i> Publicar
            </button>
          `
              : ''
          }
          <button class="btn btn-sm btn-danger" onclick="Publicidad.eliminar('${p.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `
      )
      .join('');
  },

  // ============================================
  // ASISTENTE DE PUBLICIDAD IA
  // ============================================

  iniciarAsistentePublicidad() {
    this.asistenteState = {}; // Reset state
    const modal = document.createElement('div');
    modal.className = 'modal-overlay wizard-modal';
    modal.id = 'modalAsistenteIA';
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3><i class="fas fa-magic"></i> Asistente de Publicidad IA</h3>
          <button class="btn-close" onclick="document.getElementById('modalAsistenteIA').remove()">×</button>
        </div>
        <div class="wizard-steps" id="wizardSteps"></div>
        <div class="modal-body" id="asistenteBody"></div>
        <div class="modal-footer" id="asistenteFooter"></div>
      </div>
    `;
    document.body.appendChild(modal);
    this.renderAsistenteStep(1);
  },

  renderAsistenteStep(step) {
    const body = document.getElementById('asistenteBody');
    const footer = document.getElementById('asistenteFooter');
    const steps = document.getElementById('wizardSteps');

    // Update steps indicator
    steps.innerHTML = `
      <div class="step ${step >= 1 ? 'active' : ''}">Producto</div>
      <div class="step ${step >= 2 ? 'active' : ''}">Promoción</div>
      <div class="step ${step >= 3 ? 'active' : ''}">Creatividad</div>
      <div class="step ${step >= 4 ? 'active' : ''}">Resultado</div>
    `;

    switch (step) {
      case 1:
        this.renderPaso1_Producto(body, footer);
        break;
      case 2:
        this.renderPaso2_Promocion(body, footer);
        break;
      case 3:
        this.renderPaso3_Creatividad(body, footer);
        break;
      case 4:
        this.renderPaso4_Resultados(body, footer);
        break;
    }
  },

  renderPaso1_Producto(body, footer) {
    const productos = Database.getCollection('productos') || [];
    const categorias = [...new Set(productos.map((p) => p.categoria).filter(Boolean))];

    body.innerHTML = `
      <div class="product-filters">
        <input type="search" id="productSearch" class="form-control" placeholder="Buscar producto...">
        <select id="categoryFilter" class="form-control">
          <option value="">Todas las categorías</option>
          ${categorias.map((c) => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="product-grid" id="productGrid">
        ${this.renderProductCards(productos)}
      </div>
    `;
    footer.innerHTML = `<button class="btn btn-secondary" onclick="document.getElementById('modalAsistenteIA').remove()">Cancelar</button>`;

    const searchInput = document.getElementById('productSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const filterProducts = () => {
      const searchTerm = searchInput.value;
      const category = categoryFilter.value;
      let filtered = Database.getCollection('productos') || [];
      if (searchTerm) {
        filtered = filtered.filter((p) =>
          p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      if (category) {
        filtered = filtered.filter((p) => p.categoria === category);
      }
      document.getElementById('productGrid').innerHTML = this.renderProductCards(filtered);
    };
    searchInput.addEventListener('input', filterProducts);
    categoryFilter.addEventListener('change', filterProducts);
  },

  renderProductCards(productos) {
    if (!productos.length)
      return '<div class="empty-state"><i class="fas fa-box-open"></i><p>No se encontraron productos. Agrega productos en el módulo de Inventario.</p></div>';
    return productos
      .map(
        (p) => `
      <div class="product-card-wizard" onclick="Publicidad.seleccionarProducto('${p.id}')">
        <img src="${p.imagen || './icons/icon.svg'}" alt="${p.nombre}">
        <h5>${p.nombre}</h5>
        <span>${Utils.formatCurrency(p.precioVenta)}</span>
      </div>
    `
      )
      .join('');
  },

  seleccionarProducto(id) {
    this.asistenteState.producto = Database.getItem('productos', id);
    this.renderAsistenteStep(2);
  },

  renderPaso2_Promocion(body, footer) {
    body.innerHTML = `
      <h4>Paso 2: Elige el tipo de promoción</h4>
      <div class="promo-options">
        <div class="promo-card" onclick="Publicidad.seleccionarPromocion('descuento')">
          <i class="fas fa-percent"></i>
          <h5>Descuento</h5>
          <p>Aplica un descuento porcentual al producto.</p>
        </div>
        <div class="promo-card" onclick="Publicidad.seleccionarPromocion('2x1')">
          <i class="fas fa-gift"></i>
          <h5>Paga 1, Lleva 2</h5>
          <p>El cliente compra uno y se lleva otro gratis.</p>
        </div>
        <div class="promo-card" onclick="Publicidad.seleccionarPromocion('2do50')">
          <i class="fas fa-tags"></i>
          <h5>2do a Mitad de Precio</h5>
          <p>Compra uno y el segundo tiene 50% de descuento.</p>
        </div>
        <div class="promo-card" onclick="Publicidad.seleccionarPromocion('progresivo')">
          <i class="fas fa-sort-amount-up"></i>
          <h5>Descuento Progresivo</h5>
          <p>A más productos, mayor descuento.</p>
        </div>
        <div class="promo-card" onclick="Publicidad.seleccionarPromocion('flash')">
          <i class="fas fa-bolt"></i>
          <h5>Venta Flash</h5>
          <p>Oferta por tiempo muy limitado.</p>
        </div>
        <div class="promo-card" onclick="Publicidad.seleccionarPromocion('envio_gratis')">
          <i class="fas fa-truck"></i>
          <h5>Envío Gratis</h5>
          <p>Ofrece envío sin costo.</p>
        </div>
        <div class="promo-card" onclick="Publicidad.seleccionarPromocion('regalo')">
          <i class="fas fa-box-open"></i>
          <h5>Regalo con Compra</h5>
          <p>Un obsequio al comprar el producto.</p>
        </div>
        <div class="promo-card" onclick="Publicidad.seleccionarPromocion('suscripcion')">
          <i class="fas fa-at"></i>
          <h5>Descuento por Suscripción</h5>
          <p>Un descuento a cambio de su email.</p>
        </div>
      </div>
      <div id="promo-details" class="form-group" style="display:none; margin-top: 1rem;">
        <label for="descuentoValor">Porcentaje de descuento (%)</label>
        <input type="number" id="descuentoValor" class="form-control" value="15" min="1" max="99">
      </div>
    `;
    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="Publicidad.renderAsistenteStep(1)">Atrás</button>
      <button id="btnPaso2" class="btn btn-primary" style="display:none;" onclick="Publicidad.guardarPromocion()">Siguiente</button>
    `;
  },

  seleccionarPromocion(tipo) {
    document.querySelectorAll('.promo-card').forEach((c) => c.classList.remove('selected'));
    event.currentTarget.classList.add('selected');

    this.asistenteState.promocion = { tipo };
    const details = document.getElementById('promo-details');
    const descuentoValor = document.getElementById('descuentoValor');
    const label = details.querySelector('label');

    document.getElementById('btnPaso2').style.display = 'inline-block';

    if (tipo === 'descuento' || tipo === 'suscripcion') {
      label.textContent =
        tipo === 'descuento' ? 'Porcentaje de descuento (%)' : 'Descuento por suscripción (%)';
      descuentoValor.value = tipo === 'descuento' ? '15' : '10';
      details.style.display = 'block';
    } else {
      details.style.display = 'none';
    }
  },

  guardarPromocion() {
    const tipo = this.asistenteState.promocion.tipo;
    if (tipo === 'descuento' || tipo === 'suscripcion') {
      this.asistenteState.promocion.valor = document.getElementById('descuentoValor').value;
    }
    this.renderAsistenteStep(3);
  },

  renderPaso3_Creatividad(body, footer) {
    body.innerHTML = `
      <h4>Paso 3: Define la creatividad</h4>
      <div class="form-group">
        <label>Selecciona las Redes Sociales (una o varias)</label>
        <div class="social-options">
          <i class="fab fa-facebook-f" onclick="Publicidad.toggleRedSocial('facebook', this)"></i>
          <i class="fab fa-instagram" onclick="Publicidad.toggleRedSocial('instagram', this)"></i>
          <i class="fab fa-twitter" onclick="Publicidad.toggleRedSocial('twitter', this)"></i>
          <i class="fab fa-tiktok" onclick="Publicidad.toggleRedSocial('tiktok', this)"></i>
          <i class="fab fa-whatsapp" onclick="Publicidad.toggleRedSocial('whatsapp', this)"></i>
        </div>
      </div>
    `;
    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="Publicidad.renderAsistenteStep(2)">Atrás</button>
      <button id="btnPaso3" class="btn btn-primary" disabled onclick="Publicidad.generarPublicidad()">
        <i class="fas fa-brain"></i> Generar Publicidad
      </button>
    `;

    this.asistenteState.redesSociales = this.asistenteState.redesSociales || [];
    document.querySelectorAll('.social-options i').forEach((i) => {
      const red = i.className.split('fa-')[1].split(' ')[0];
      if (this.asistenteState.redesSociales.includes(red)) {
        i.classList.add('selected');
      }
    });
    if (this.asistenteState.redesSociales.length > 0) {
      document.getElementById('btnPaso3').disabled = false;
    }
  },

  toggleRedSocial(red, el) {
    el.classList.toggle('selected');
    if (!this.asistenteState.redesSociales) {
      this.asistenteState.redesSociales = [];
    }

    if (this.asistenteState.redesSociales.includes(red)) {
      this.asistenteState.redesSociales = this.asistenteState.redesSociales.filter(
        (r) => r !== red
      );
    } else {
      this.asistenteState.redesSociales.push(red);
    }

    document.getElementById('btnPaso3').disabled = this.asistenteState.redesSociales.length === 0;
  },

  async generarPublicidad() {
    this.asistenteState.instrucciones = '';

    this.renderPaso4_Resultados(
      document.getElementById('asistenteBody'),
      document.getElementById('asistenteFooter'),
      true
    );

    const result = await this.generarPublicidadCompleta(this.asistenteState);

    if (result) {
      this.asistenteState.resultado = result;
      this.renderPaso4_Resultados(
        document.getElementById('asistenteBody'),
        document.getElementById('asistenteFooter')
      );
    } else {
      // Handle error
      document.getElementById('asistenteBody').innerHTML =
        '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Ocurrió un error al generar la publicidad. Inténtalo de nuevo.</p></div>';
    }
  },

  renderPaso4_Resultados(body, footer, loading = false) {
    if (loading) {
      body.innerHTML = `
        <div class="ia-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <h4>Generando magia...</h4>
          <p>La IA está creando una publicidad increíble para tu producto.</p>
        </div>
      `;
      footer.innerHTML = '';
      return;
    }

    const { textosPublicacion, promptImagen } = this.asistenteState.resultado;

    let socialMediaResults = '';
    for (const red in textosPublicacion) {
      socialMediaResults += `
        <div class="result-card">
          <h5><i class="fab fa-${red}"></i> Texto para ${red.charAt(0).toUpperCase() + red.slice(1)}</h5>
          <div class="result-content" id="texto-${red}">${textosPublicacion[red].replace(/\n/g, '<br>')}</div>
          <button class="btn btn-sm btn-secondary" onclick="Publicidad.copiarAlPortapapeles('texto-${red}')">
            <i class="fas fa-copy"></i> Copiar Texto
          </button>
        </div>
      `;
    }

    body.innerHTML = `
      <h4>Paso 4: ¡Aquí tienes tu publicidad!</h4>
      <div class="ia-results">
        ${socialMediaResults}
        <div class="result-card">
          <h5><i class="fas fa-image"></i> Prompt para Imagen IA</h5>
          <div class="result-content" id="promptImagen">${promptImagen}</div>
          <button class="btn btn-sm btn-secondary" onclick="Publicidad.copiarAlPortapapeles('promptImagen')">
            <i class="fas fa-copy"></i> Copiar Prompt
          </button>
        </div>
      </div>
    `;
    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="Publicidad.renderAsistenteStep(3)">Atrás</button>
      <button class="btn btn-success" onclick="Publicidad.guardarPublicidadGenerada()">
        <i class="fas fa-save"></i> Guardar Publicidad
      </button>
      <button class="btn btn-warning" onclick="Publicidad.enviarARecordatorios()">
        <i class="fas fa-bell"></i> Crear Recordatorio
      </button>
      <button class="btn btn-primary" onclick="document.getElementById('modalAsistenteIA').remove()">Finalizar</button>
    `;
  },

  // ============================================
  // COPIAR AL PORTAPAPELES (con fallback para compatibilidad)
  // ============================================
  copiarAlPortapapeles(elementId) {
    const text = document.getElementById(elementId).innerText;

    // Método moderno: navigator.clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          Utils.showToast('Copiado al portapapeles', 'success');
        })
        .catch(() => {
          // Si falla, usar método alternativo
          this.copiarAlPortapapelesFallback(text);
        });
    } else {
      // Fallback para navegadores que no soportan clipboard API
      this.copiarAlPortapapelesFallback(text);
    }
  },

  // Método alternativo para copiar (compatible con todos los navegadores)
  copiarAlPortapapelesFallback(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      const exitoso = document.execCommand('copy');
      if (exitoso) {
        Utils.showToast('Copiado al portapapeles', 'success');
      } else {
        Utils.showToast('No se pudo copiar', 'warning');
      }
    } catch (err) {
      console.error('Error al copiar:', err);
      Utils.showToast('Error al copiar', 'danger');
    }

    document.body.removeChild(textarea);
  },

  // ============================================
  // GUARDAR PUBLICIDAD GENERADA
  // ============================================
  guardarPublicidadGenerada() {
    if (!this.asistenteState.resultado) {
      Utils.showToast('No hay publicidad para guardar', 'warning');
      return;
    }

    const { producto, promocion, redesSociales, resultado } = this.asistenteState;

    // Crear objeto de publicidad guardada
    const publicidadGuardada = {
      id: Utils.generateId(),
      titulo: `Publicidad de ${producto.nombre}`,
      producto: {
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precioVenta,
      },
      promocion: promocion,
      redesSociales: redesSociales,
      textosPublicacion: resultado.textosPublicacion,
      promptImagen: resultado.promptImagen,
      fechaCreacion: new Date().toISOString(),
      usado: false,
    };

    // Guardar en la base de datos
    Database.add('publicidades_guardadas', publicidadGuardada);

    Utils.showToast('Publicidad guardada exitosamente', 'success');
  },

  // ============================================
  // ENVIAR PUBLICIDAD A RECORDATORIOS
  // ============================================
  enviarARecordatorios() {
    if (!this.asistenteState.resultado) {
      Utils.showToast('No hay publicidad para programar', 'warning');
      return;
    }

    // Primero guardar la publicidad
    this.guardarPublicidadGenerada();

    const { producto, redesSociales, resultado } = this.asistenteState;

    // Crear un recordatorio para cada red social
    redesSociales.forEach((red) => {
      const recordatorio = {
        id: Utils.generateId(),
        titulo: `Publicar en ${red.charAt(0).toUpperCase() + red.slice(1)}: ${producto.nombre}`,
        descripcion: resultado.textosPublicacion[red].substring(0, 100) + '...',
        tipo: 'publicidad',
        prioridad: 'media',
        fecha: Utils.getCurrentDate(),
        hora: '09:00',
        recurrente: 'ninguno',
        completado: false,
        color: '#9c27b0',
        datosPublicidad: {
          redSocial: red,
          texto: resultado.textosPublicacion[red],
          producto: producto.nombre,
        },
        createdAt: new Date().toISOString(),
      };

      Database.add('recordatorios', recordatorio);
    });

    Utils.showToast(`${redesSociales.length} recordatorio(s) creado(s)`, 'success');

    // Cerrar modal y mostrar confirmación
    Utils.showConfirm(
      '¿Deseas ir a Notificaciones IA para programar las fechas?',
      () => {
        document.getElementById('modalAsistenteIA').remove();
        App.loadModule('notificaciones_inteligentes');
      },
      () => {
        // Solo cerrar el modal
      }
    );
  },

  // ============================================
  // VER PUBLICIDADES GUARDADAS
  // ============================================
  verPublicidadesGuardadas() {
    const publicidades = Database.getCollection('publicidades_guardadas') || [];

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalPublicidadesGuardadas';
    modal.innerHTML = `
      <div class="modal-container" style="max-width: 900px;">
        <div class="modal-header">
          <h3><i class="fas fa-save"></i> Publicidades Guardadas</h3>
          <button class="btn-close" onclick="document.getElementById('modalPublicidadesGuardadas').remove()">×</button>
        </div>
        <div class="modal-body" style="max-height: 600px; overflow-y: auto;">
          ${
            publicidades.length === 0
              ? '<div class="empty-state"><i class="fas fa-inbox"></i><p>No hay publicidades guardadas</p></div>'
              : publicidades
                  .map(
                    (pub) => `
              <div class="result-card" style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div>
                    <h5>${pub.titulo}</h5>
                    <p style="font-size: 0.9rem; color: #888;">
                      Producto: ${pub.producto.nombre} | 
                      Redes: ${pub.redesSociales.join(', ')} | 
                      Fecha: ${Utils.formatDate(pub.fechaCreacion.split('T')[0], 'short')}
                    </p>
                  </div>
                  <div>
                    <button class="btn btn-sm btn-primary" onclick="Publicidad.verDetallePublicidad('${pub.id}')">
                      <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="Publicidad.crearRecordatorioDesdeGuardada('${pub.id}')">
                      <i class="fas fa-bell"></i> Recordar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="Publicidad.eliminarPublicidadGuardada('${pub.id}')">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            `
                  )
                  .join('')
          }
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalPublicidadesGuardadas').remove()">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  // Ver detalle de publicidad guardada
  verDetallePublicidad(id) {
    const pub = Database.getItem('publicidades_guardadas', id);
    if (!pub) return;

    let socialMediaResults = '';
    for (const red in pub.textosPublicacion) {
      socialMediaResults += `
        <div class="result-card">
          <h5><i class="fab fa-${red}"></i> Texto para ${red.charAt(0).toUpperCase() + red.slice(1)}</h5>
          <div class="result-content" id="texto-guardado-${red}">${pub.textosPublicacion[red].replace(/\n/g, '<br>')}</div>
          <button class="btn btn-sm btn-secondary" onclick="Publicidad.copiarAlPortapapeles('texto-guardado-${red}')">
            <i class="fas fa-copy"></i> Copiar Texto
          </button>
        </div>
      `;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalDetallePublicidad';
    modal.innerHTML = `
      <div class="modal-container" style="max-width: 800px;">
        <div class="modal-header">
          <h3><i class="fas fa-bullhorn"></i> ${pub.titulo}</h3>
          <button class="btn-close" onclick="document.getElementById('modalDetallePublicidad').remove()">×</button>
        </div>
        <div class="modal-body" style="max-height: 600px; overflow-y: auto;">
          <div class="ia-results">
            ${socialMediaResults}
            <div class="result-card">
              <h5><i class="fas fa-image"></i> Prompt para Imagen IA</h5>
              <div class="result-content" id="prompt-guardado">${pub.promptImagen}</div>
              <button class="btn btn-sm btn-secondary" onclick="Publicidad.copiarAlPortapapeles('prompt-guardado')">
                <i class="fas fa-copy"></i> Copiar Prompt
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalDetallePublicidad').remove()">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  // Crear recordatorio desde publicidad guardada
  crearRecordatorioDesdeGuardada(id) {
    const pub = Database.getItem('publicidades_guardadas', id);
    if (!pub) return;

    pub.redesSociales.forEach((red) => {
      const recordatorio = {
        id: Utils.generateId(),
        titulo: `Publicar en ${red.charAt(0).toUpperCase() + red.slice(1)}: ${pub.producto.nombre}`,
        descripcion: pub.textosPublicacion[red].substring(0, 100) + '...',
        tipo: 'publicidad',
        prioridad: 'media',
        fecha: Utils.getCurrentDate(),
        hora: '09:00',
        recurrente: 'ninguno',
        completado: false,
        color: '#9c27b0',
        datosPublicidad: {
          redSocial: red,
          texto: pub.textosPublicacion[red],
          producto: pub.producto.nombre,
        },
        createdAt: new Date().toISOString(),
      };

      Database.add('recordatorios', recordatorio);
    });

    Utils.showToast(`${pub.redesSociales.length} recordatorio(s) creado(s)`, 'success');
    document.getElementById('modalPublicidadesGuardadas').remove();

    Utils.showConfirm('¿Deseas ir a Recordatorios para programar las fechas?', () => {
      App.loadModule('notificaciones_inteligentes');
    });
  },

  // Eliminar publicidad guardada
  eliminarPublicidadGuardada(id) {
    Utils.showConfirm('¿Eliminar esta publicidad guardada?', () => {
      Database.deleteItem('publicidades_guardadas', id);
      Utils.showToast('Publicidad eliminada', 'success');
      document.getElementById('modalPublicidadesGuardadas').remove();
      this.verPublicidadesGuardadas();
    });
  },

  /**
   * Generar publicidad completa - Versión mejorada con segmentación
   * @param {Object} state - Estado del asistente
   * @param {Object} options - Opciones adicionales: { clientesObjetivo, segmento, datosMarketing }
   */
  async generarPublicidadCompleta(state, options = {}) {
    const { producto, promocion, redesSociales } = state;
    const { clientesObjetivo = [], segmento = '', datosMarketing = {} } = options;

    let promoTexto = '';
    let detallesPromo = '';

    switch (promocion.tipo) {
      case 'descuento':
        promoTexto = `un ${promocion.valor}% de descuento`;
        detallesPromo = `¡No te pierdas nuestro ${producto.nombre} con un ${promocion.valor}% de descuento! De ${Utils.formatCurrency(producto.precioVenta)} a solo ${Utils.formatCurrency(producto.precioVenta * (1 - promocion.valor / 100))}.`;
        break;
      case '2x1':
        promoTexto = 'una oferta 2x1';
        detallesPromo = `¡Compra un ${producto.nombre} y llévate otro totalmente GRATIS!`;
        break;
      case '2do50':
        promoTexto = 'el segundo a mitad de precio';
        detallesPromo = `¡En la compra de tu ${producto.nombre}, obtén el segundo con un 50% de descuento!`;
        break;
      case 'progresivo':
        promoTexto = 'descuentos progresivos';
        detallesPromo = `¡Mientras más ${producto.nombre}s compres, más ahorras! Aprovecha nuestros descuentos por volumen.`;
        break;
      case 'flash':
        promoTexto = 'una venta flash';
        detallesPromo = `¡VENTA FLASH! El ${producto.nombre} a un precio increíble solo por las próximas horas. ¡No dejes pasar esta oportunidad!`;
        break;
      case 'envio_gratis':
        promoTexto = 'envío gratis';
        detallesPromo = `¿Quieres tu ${producto.nombre}? ¡Nosotros te lo llevamos! Disfruta de envío gratuito en tu compra.`;
        break;
      case 'regalo':
        promoTexto = 'un regalo incluido';
        detallesPromo = `¡Con la compra de tu ${producto.nombre}, recibe un regalo especial de nuestra parte!`;
        break;
      case 'suscripcion':
        promoTexto = `un ${promocion.valor}% de descuento al suscribirte`;
        detallesPromo = `¡Suscríbete a nuestro boletín y obtén un ${promocion.valor}% de descuento en tu primer ${producto.nombre}!`;
        break;
    }

    // Construir contexto de audiencia si hay datos de marketing
    const audienciaContext =
      clientesObjetivo.length > 0
        ? `
      
      **AUDIENCIA OBJETIVO (PERSONALIZACIÓN INTELIGENTE):**
      - Segmento: ${segmento || 'General'}
      - Número de clientes: ${clientesObjetivo.length}
      ${datosMarketing.topCategorias ? `- Han comprado previamente: ${datosMarketing.topCategorias.slice(0, 3).join(', ')}` : ''}
      ${datosMarketing.ticketPromedio ? `- Ticket promedio: ${Utils.formatCurrency(datosMarketing.ticketPromedio)}` : ''}
      ${datosMarketing.probabilidadCompraPromedio ? `- Probabilidad de compra: ${Math.round(datosMarketing.probabilidadCompraPromedio)}%` : ''}
      ${datosMarketing.comportamiento ? `- Comportamiento: ${datosMarketing.comportamiento}` : ''}
      
      **PERSONALIZA el mensaje para resonar con este segmento específico.**
      Usa un lenguaje que conecte con sus intereses y historial de compra.
    `
        : '';

    const promptsPublicidad = redesSociales.map(
      (redSocial) => `
      Eres un experto en copywriting para la red social ${redSocial}, especializado en comercio electrónico. 
      Tu objetivo es crear un anuncio de texto que sea corto, llamativo, persuasivo y que genere urgencia, adaptado específicamente para ${redSocial}.

      **Contexto:**
      - **Producto:** ${producto.nombre} (Precio: ${Utils.formatCurrency(producto.precioVenta)})
      - **Descripción:** ${producto.descripcion || 'Un producto de alta calidad'}
      - **Promoción:** ${detallesPromo}
      ${audienciaContext}

      **Instrucciones para ${redSocial}:**
      1.  Crea un texto de anuncio que no exceda los 280 caracteres.
      2.  Usa un tono enérgico y directo, apropiado para ${redSocial}.
      3.  ${audienciaContext ? 'IMPORTANTE: Personaliza el mensaje considerando el perfil de la audiencia objetivo.' : 'Usa un mensaje general atractivo.'}
      4.  Incluye un Call-To-Action (CTA) claro (ej. "Compra ahora", "Visita nuestra web", "Pide el tuyo aquí").
      5.  Genera 3-5 hashtags relevantes y populares para ${redSocial}.

      **Ejemplo de Salida (SOLO el texto del anuncio para ${redSocial}):**
      ¡OFERTA IMPERDIBLE! 🔥 Llévate el [Producto] con [Promoción]. ¡Stock limitado! ⏳ Compra el tuyo aquí 👉 [Link] 
      #[Hashtag1] #[Hashtag2] #[Hashtag3]
    `
    );

    const promptImagen = `
      **Rol:** Director de Arte para una campaña de e-commerce.
      **Tarea:** Crear un prompt para un generador de imágenes IA (Midjourney, DALL-E 3) para un anuncio de producto.

      **Producto:**
      - **Nombre:** ${producto.nombre}
      - **Descripción:** ${producto.descripcion || 'Un producto de alta calidad'}

      **Concepto de la Imagen:**
      La imagen debe ser un anuncio profesional y de alta calidad para redes sociales. Debe mostrar el producto de forma atractiva, destacando la promoción actual: **${promoTexto}**.

      **Instrucciones para el Prompt (en inglés):**
      1.  **Estilo:** Photorealistic, clean, modern e-commerce shot, vibrant colors.
      2.  **Producto:** El ${producto.nombre} debe ser el punto focal, nítido y bien iluminado.
      3.  **Fondo:** Un fondo limpio y minimalista, con colores que contrasten y resalten el producto. Puede ser un degradado sutil o un color sólido (ej. light gray, soft pastel).
      4.  **Composición:** Centered or slightly off-center product shot. Usar "depth of field" para desenfocar ligeramente el fondo.
      5.  **Iluminación:** Bright, studio lighting, soft shadows. Que el producto se vea premium.
      6.  **Elementos Adicionales:** Incluir elementos gráficos sutiles que representen la promoción. Por ejemplo, para un descuento, un ícono de "%" estilizado. Para 2x1, dos productos interactuando. Para envío gratis, una pequeña ilustración de un camión o un avión de papel. Estos elementos deben ser elegantes y no sobrecargar la imagen.
      7.  **Texto:** NO incluir texto en la imagen. El texto se añadirá después.
      8.  **Formato:** Formato vertical (9:16) ideal para Stories y TikTok.

      **Ejemplo de Prompt (SOLO el prompt):**
      *A photorealistic, professional e-commerce advertisement shot of a "${producto.nombre}". The product is the central focus, sharp and in pristine condition. The background is a clean, minimalist soft gray gradient. Bright, premium studio lighting with soft shadows. Subtle, elegant graphic elements in the background hint at a "${promoTexto}" promotion. Vertical format (9:16), hyper-detailed, 8K.*
    `;

    // --- LLAMADA A LA IA ---
    try {
      const textosPublicacion = {};
      for (const red of redesSociales) {
        const prompt = promptsPublicidad[redesSociales.indexOf(red)];
        textosPublicacion[red] = await this.generarTextoConIA(prompt);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay
      }

      const promptFinalImagen = await this.generarTextoConIA(promptImagen);

      return { textosPublicacion, promptImagen: promptFinalImagen };
    } catch (e) {
      console.error('Error generando publicidad con IA:', e);
      Utils.showToast(
        `Error conectando con el servicio de IA. Revisa la configuración y la consola.`,
        'danger'
      );
      return null;
    }
  },

  mostrarFormulario(id = null) {
    const pub = id ? Database.getItem('publicaciones', id) : null;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalPublicacion';
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3><i class="fas fa-bullhorn"></i> Nueva Publicación</h3>
          <button class="btn-close" onclick="document.getElementById('modalPublicacion').remove()">×</button>
        </div>
        <div class="modal-body">
          <form id="formPublicacion">
            <div class="form-group">
              <label>Título *</label>
              <input type="text" name="titulo" class="form-control" value="${pub?.titulo || ''}" required>
            </div>
            <div class="form-group">
              <label>Contenido *</label>
              <textarea name="contenido" class="form-control" rows="4" required>${pub?.contenido || ''}</textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Red Social *</label>
                <select name="redSocial" class="form-control" required>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="twitter">Twitter</option>
                  <option value="tiktok">TikTok</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Fecha *</label>
                <input type="date" name="fecha" class="form-control" value="${pub?.fecha || Utils.getCurrentDate()}" required>
              </div>
              <div class="form-group">
                <label>Hora *</label>
                <input type="time" name="hora" class="form-control" value="${pub?.hora || '09:00'}" required>
              </div>
            </div>
            <div class="form-group">
              <label>Hashtags</label>
              <input type="text" name="hashtags" class="form-control" placeholder="#ejemplo #tags" value="${pub?.hashtags?.join(' ') || ''}">
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalPublicacion').remove()">Cancelar</button>
          <button class="btn btn-primary" onclick="Publicidad.guardar('${id || ''}')">
            <i class="fas fa-save"></i> Guardar
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  async generarTextoConIA(prompt, retries = 10, delay = 5000) {
    const provider = this.IA_CONFIG.modo;
    const apiKey = this.IA_CONFIG[`${provider}ApiKey`];
    const model = this.IA_CONFIG[`${provider}Model`];

    if (provider === 'local' || !apiKey || !model) {
      return `Este es un texto de ejemplo generado localmente para el prompt: "${prompt.substring(0, 50)}..."`;
    }

    try {
      let url, body, headers;
      headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };

      switch (provider) {
        case 'gemini':
          url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          body = { contents: [{ parts: [{ text: prompt }] }] };
          delete headers.Authorization;
          break;
        case 'deepseek':
          url = 'https://api.deepseek.com/v1/chat/completions';
          body = { model, messages: [{ role: 'user', content: prompt }] };
          break;
        case 'llmstudio':
          url = `${this.IA_CONFIG.apiUrl}/chat/completions`;
          body = { model, messages: [{ role: 'user', content: prompt }] };
          if (!apiKey) delete headers.Authorization;
          break;
        default:
          throw new Error(`Proveedor de IA no reconocido: ${provider}`);
      }

      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (response.status === 503 && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.generarTextoConIA(prompt, retries - 1, delay * 2);
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      return (
        result?.candidates?.[0]?.content?.parts?.[0]?.text ||
        result?.choices?.[0]?.message?.content ||
        'No se pudo obtener una respuesta de la IA.'
      );
    } catch (e) {
      console.error('Error en generarTextoConIA:', e);
      throw e;
    }
  },

  guardar(id) {
    const form = document.getElementById('formPublicacion');
    const formData = new FormData(form);

    const data = {
      titulo: formData.get('titulo'),
      contenido: formData.get('contenido'),
      redSocial: formData.get('redSocial'),
      fecha: formData.get('fecha'),
      hora: formData.get('hora'),
      hashtags: formData
        .get('hashtags')
        .split(' ')
        .filter((h) => h),
      estado: 'pendiente',
    };

    if (id) {
      const pub = Database.getItem('publicaciones', id);
      Object.assign(pub, data);
      Database.update('publicaciones', id, pub);
    } else {
      data.id = Utils.generateId();
      data.createdAt = new Date().toISOString();
      Database.add('publicaciones', data);

      // Crear recordatorio automático
      this.crearRecordatorio(data);
    }

    document.getElementById('modalPublicacion').remove();
    Utils.showToast('Publicación guardada', 'success');

    // Actualizar sin recargar
    if (window.DataRefreshManager) {
      const container = document.querySelector('.page-content');
      if (container) this.render(container);
    } else {
      App.loadModule('publicidad');
    }
  },

  crearRecordatorio(publicacion) {
    const recordatorio = {
      id: Utils.generateId(),
      titulo: `Publicar: ${publicacion.titulo}`,
      descripcion: `Publicación programada en ${publicacion.redSocial}`,
      tipo: 'publicidad',
      prioridad: 'media',
      fecha: publicacion.fecha,
      hora: publicacion.hora,
      recurrente: 'ninguno',
      completado: false,
      color: '#9c27b0',
      createdAt: new Date().toISOString(),
    };

    Database.add('recordatorios', recordatorio);
  },

  marcarPublicado(id) {
    const pub = Database.getItem('publicaciones', id);
    if (pub) {
      pub.estado = 'publicado';
      pub.fechaPublicacion = new Date().toISOString();
      Database.update('publicaciones', id, pub);
      Utils.showToast('Marcado como publicado', 'success');

      // Actualizar sin recargar
      if (window.DataRefreshManager) {
        const container = document.querySelector('.page-content');
        if (container) this.render(container);
      } else {
        App.loadModule('publicidad');
      }
    }
  },

  eliminar(id) {
    Utils.showConfirm('¿Eliminar esta publicación?', async () => {
      Database.deleteItem('publicaciones', id);
      Utils.showToast('Publicación eliminada', 'success');

      // Actualizar sin recargar
      if (window.DataRefreshManager) {
        const container = document.querySelector('.page-content');
        if (container) await Publicidad.render(container);
      } else {
        App.loadModule('publicidad');
      }
    });
  },

  getRedSocialIcon(red) {
    const icons = {
      facebook: 'facebook',
      instagram: 'instagram',
      twitter: 'twitter',
      tiktok: 'tiktok',
      whatsapp: 'whatsapp',
    };
    return icons[red] || 'share-alt';
  },

  renderHelpAgent() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalHelpAgent';
    modal.innerHTML = `
      <div class="modal-container chat-modal">
        <div class="modal-header">
          <h3><i class="fas fa-robot"></i> Asistente de Publicidad</h3>
          <button class="btn-close" onclick="document.getElementById('modalHelpAgent').remove()">×</button>
        </div>
        <div class="modal-body chat-body" id="chatBody">
          <div class="chat-message bot-message">
            <p>¡Hola! Soy tu asistente de publicidad. ¿Cómo puedo ayudarte a crear campañas increíbles hoy?</p>
          </div>
        </div>
        <div class="modal-footer chat-footer">
          <input type="text" id="chatInput" class="form-control" placeholder="Escribe tu pregunta...">
          <button class="btn btn-primary" onclick="Publicidad.handleHelpMessage()">Enviar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('chatInput').addEventListener('keyup', (event) => {
      if (event.key === 'Enter') {
        Publicidad.handleHelpMessage();
      }
    });
  },

  async handleHelpMessage() {
    const input = document.getElementById('chatInput');
    const chatBody = document.getElementById('chatBody');
    const userMessage = input.value.trim();

    if (!userMessage) return;

    chatBody.innerHTML += `<div class="chat-message user-message"><p>${userMessage}</p></div>`;
    input.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;

    const thinkingMessage = `<div class="chat-message bot-message" id="thinking"><p>Pensando...</p></div>`;
    chatBody.innerHTML += thinkingMessage;
    chatBody.scrollTop = chatBody.scrollHeight;

    const prompt = `Eres un asistente de IA experto en marketing y publicidad para pequeñas empresas. Responde a la siguiente pregunta del usuario de forma concisa, amigable y útil. La pregunta es: "${userMessage}"`;

    try {
      const response = await this.generarTextoConIA(prompt);
      const thinkingElement = document.getElementById('thinking');
      if (thinkingElement) {
        thinkingElement.remove();
      }
      chatBody.innerHTML += `<div class="chat-message bot-message"><p>${response.replace(/\n/g, '<br>')}</p></div>`;
    } catch (e) {
      const thinkingElement = document.getElementById('thinking');
      if (thinkingElement) {
        thinkingElement.remove();
      }
      chatBody.innerHTML += `<div class="chat-message bot-message"><p>Lo siento, no pude procesar tu solicitud en este momento. Por favor, inténtalo de nuevo más tarde.</p></div>`;
    }
    chatBody.scrollTop = chatBody.scrollHeight;
  },

  cargarPromptsIniciales() {
    const prompts = [
      {
        id: 'promo1',
        nombre: 'Promoción - Descuento',
        descripcion: 'Texto publicitario para promociones y descuentos',
        redSocial: 'facebook',
        plantilla:
          '¡Atención! ${producto} con ${descuento}% de descuento solo por hoy. 💥 Aprovecha antes de que se acabe. #Promoción #Descuento',
      },
      {
        id: 'entregaGratis',
        nombre: 'Entrega Gratis',
        descripcion: 'Publicación para promociones con entrega gratuita',
        redSocial: 'instagram',
        plantilla:
          '📦 ¡Envío GRATIS en tu compra de ${producto}! No te quedes sin probarlo. 💛 #NanoBanana #Gratis',
      },
      {
        id: 'nuevoProducto',
        nombre: 'Nuevo Producto',
        descripcion: 'Publicación para lanzamientos de productos',
        redSocial: 'tiktok',
        plantilla:
          '🍌 ¡Nuevo lanzamiento! ${producto} llega para sorprenderte. 🎥 #NanoBanana #NuevoProducto',
      },
    ];

    try {
      Database.saveCollection('prompts_publicitarios', prompts);
    } catch (error) {
      console.warn('⚠️ No se pudo guardar prompts_publicitarios en IndexedDB:', error.message);
      // Guardar con alcance por tienda como fallback
      this.setScopedJSON('prompts_publicitarios', prompts);
    }
  },
};
