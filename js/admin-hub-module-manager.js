/**
 * MEJORADOR PARA GESTOR CENTRAL - Gestión de Permisos de Módulos
 *
 * Agregar esta sección al admin-hub.js para permitir que el super_admin
 * gestione qué módulos tiene habilitados cada usuario
 */

// ============================================
// NUEVA SECCIÓN: Gestión de Permisos de Módulos
// Agregar después de la sección de usuarios
// ============================================

const AdminHubModuleManager = {
  /**
   * Obtener lista de módulos habilitados para un usuario en un negocio
   */
  async getUserModules(userId, negocioId) {
    try {
      const response = await fetch(`/api/usuarios/${userId}/modulos`, {
        headers: {
          'X-Negocio-ID': negocioId,
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error obteniendo módulos del usuario:', error);
      throw error;
    }
  },

  /**
   * Obtener todos los módulos disponibles para seleccionar
   */
  async getAvailableModules(userId, negocioId) {
    try {
      const response = await fetch(`/api/usuarios/${userId}/modulos/disponibles`, {
        headers: {
          'X-Negocio-ID': negocioId,
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error obteniendo módulos disponibles:', error);
      throw error;
    }
  },

  /**
   * Actualizar módulos habilitados para un usuario
   */
  async updateUserModules(userId, negocioId, modulos) {
    try {
      const response = await fetch(`/api/usuarios/${userId}/modulos`, {
        method: 'PUT',
        headers: {
          'X-Negocio-ID': negocioId,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ modulos }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error actualizando módulos:', error);
      throw error;
    }
  },

  /**
   * Resetear módulos a valores por defecto
   */
  async resetUserModules(userId, negocioId) {
    try {
      const response = await fetch(`/api/usuarios/${userId}/modulos/resetear`, {
        method: 'POST',
        headers: {
          'X-Negocio-ID': negocioId,
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error reseteando módulos:', error);
      throw error;
    }
  },

  /**
   * Renderizar modal para gestionar módulos de un usuario
   */
  renderModuleManagerModal(usuario, negocioId, negocioTipo) {
    const modalHTML = `
      <div class="admin-hub-modal" role="dialog" aria-modal="true">
        <header>
          <h3>🔐 Gestionar Módulos - Usuario: ${Utils.sanitize(usuario.username)}</h3>
          <button class="close-btn" data-module-modal-close aria-label="Cerrar">
            <i class="fas fa-times"></i>
          </button>
        </header>
        <main>
          <div class="admin-hub-modal-section">
            <div class="admin-hub-section-title">
              <span class="admin-hub-section-label">
                <i class="fas fa-cube"></i> Módulos Disponibles
              </span>
              <small style="color: #666;">Selecciona los módulos que este usuario puede acceder</small>
            </div>

            <div class="module-manager-info">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0;">
                <div>
                  <strong>Usuario:</strong> ${Utils.sanitize(usuario.username)}<br>
                  <strong>Rol:</strong> <span class="badge badge-${usuario.rol}">${usuario.rol}</span>
                </div>
                <div>
                  <strong>Negocio:</strong> ${Utils.sanitize(negocioId)}<br>
                  <strong>Tipo:</strong> ${negocioTipo}
                </div>
              </div>
            </div>

            <div class="module-manager-filters" style="margin-bottom: 20px;">
              <button type="button" class="btn-small" data-select-all-modules>
                ✓ Seleccionar Recomendados
              </button>
              <button type="button" class="btn-small" data-reset-modules>
                ↻ Resetear a Default
              </button>
              <button type="button" class="btn-small" data-select-none-modules>
                ✗ Deseleccionar Todos
              </button>
            </div>

            <div class="module-manager-container" data-modules-container>
              <p style="text-align: center; color: #999;">Cargando módulos...</p>
            </div>
          </div>

          <div class="admin-hub-modal-actions">
            <button type="button" class="btn-secondary" data-module-modal-close>Cancelar</button>
            <button type="button" class="btn-primary" data-module-modal-save>
              💾 Guardar Cambios
            </button>
          </div>
        </main>
      </div>
    `;

    return modalHTML;
  },

  /**
   * Renderizar checkboxes para cada módulo
   */
  renderModuleCheckboxes(availableData) {
    const { modulos } = availableData;
    const disponibles = Array.isArray(modulos.disponibles) ? modulos.disponibles : [];
    const habilitados = new Set(modulos.habilitados || []);
    const obligatorios = new Set(modulos.obligatorios || []);
    const recomendados = new Set(modulos.recomendados || []);

    const categoriaOrden = [
      'Operaciones Taller',
      'Ventas y Clientes',
      'Inventario y Compras',
      'Finanzas y Reportes',
      'Marketing y Comunicación',
      'Administración y Sistema',
      'Otros',
    ];

    const categorias = new Map();
    for (const opcion of disponibles) {
      if (!opcion || !opcion.id) {
        continue;
      }

      const categoria = opcion.categoria || 'Otros';
      if (!categorias.has(categoria)) {
        categorias.set(categoria, []);
      }

      categorias.get(categoria).push(opcion);
    }

    const sanitize = (value) => {
      if (typeof Utils !== 'undefined' && typeof Utils.sanitize === 'function') {
        return Utils.sanitize(value);
      }
      return value;
    };

    const buildCategory = (categoria, items) => {
      if (!Array.isArray(items) || items.length === 0) {
        return '';
      }

      const sortedItems = [...items].sort((a, b) => {
        const labelA = a.label || a.id;
        const labelB = b.label || b.id;
        return labelA.localeCompare(labelB, 'es', { sensitivity: 'base' });
      });

      let section = `<div class="module-category" data-category="${sanitize(categoria)}">`;
      section += `<h4>${sanitize(categoria)}</h4>`;
      section += '<div class="module-grid">';

      for (const opcion of sortedItems) {
        const moduloId = opcion.id;
        const label = opcion.label || moduloId;
        const isEnabled = habilitados.has(moduloId);
        const isObligatorio = obligatorios.has(moduloId);
        const isRecomendado = recomendados.has(moduloId);

        const badges = [];
        if (isObligatorio) {
          badges.push('<span class="badge badge-obligatorio">Obligatorio</span>');
        }
        if (isRecomendado && !isObligatorio) {
          badges.push('<span class="badge badge-recomendado">Recomendado</span>');
        }
        if (opcion.badge) {
          badges.push(`<span class="badge badge-info">${sanitize(opcion.badge)}</span>`);
        }

        section += `
          <label class="module-checkbox ${isObligatorio ? 'obligatorio' : ''}" data-module="${moduloId}">
            <input type="checkbox" name="user-modules" value="${moduloId}" ${isEnabled ? 'checked' : ''} ${isObligatorio ? 'disabled' : ''}>
            <span class="module-name">${sanitize(label)}</span>
            ${badges.join('')}
          </label>`;
      }

      section += '</div></div>';
      return section;
    };

    let html = '';
    const impresas = new Set();
    for (const categoria of categoriaOrden) {
      if (categorias.has(categoria)) {
        html += buildCategory(categoria, categorias.get(categoria));
        impresas.add(categoria);
      }
    }

    for (const [categoria, items] of categorias.entries()) {
      if (impresas.has(categoria)) {
        continue;
      }
      html += buildCategory(categoria, items);
    }

    return html || '<p style="color: #999;">No hay módulos disponibles</p>';
  },

  /**
   * Abrir modal de gestión de módulos para un usuario
   */
  async openModuleManager(usuario, negocioId) {
    try {
      // Obtener datos de módulos
      const availableData = await this.getAvailableModules(usuario.id, negocioId);
      const recommendedSet = new Set(availableData.modulos?.recomendados || []);
      const obligatorySet = new Set(availableData.modulos?.obligatorios || []);
      const preselectedSet = new Set(
        (availableData.modulos?.disponibles || [])
          .filter((opcion) => opcion && opcion.preseleccionado)
          .map((opcion) => opcion.id)
      );

      // Renderizar modal
      const modalHTML = this.renderModuleManagerModal(
        usuario,
        negocioId,
        availableData.negocio.tipo
      );
      const container = document.createElement('div');
      container.className = 'admin-hub-overlay';
      container.innerHTML = modalHTML;
      document.body.appendChild(container);

      // Renderizar checkboxes
      const modulesContainer = container.querySelector('[data-modules-container]');
      modulesContainer.innerHTML = this.renderModuleCheckboxes(availableData);

      // Event listeners
      const closeBtn = container.querySelector('[data-module-modal-close]');
      const saveBtn = container.querySelector('[data-module-modal-save]');
      const selectRecommendedBtn = container.querySelector('[data-select-all-modules]');
      const selectNoneBtn = container.querySelector('[data-select-none-modules]');
      const resetBtn = container.querySelector('[data-reset-modules]');

      // Cerrar modal
      const closeModal = () => {
        container.remove();
      };

      closeBtn?.addEventListener('click', closeModal);
      container.addEventListener('click', (e) => {
        if (e.target === container) closeModal();
      });

      // Seleccionar recomendados
      selectRecommendedBtn?.addEventListener('click', () => {
        container.querySelectorAll('[name="user-modules"]').forEach((cb) => {
          const modulo = cb.value;
          const isRecomendado = recommendedSet.has(modulo);
          const isObligatorio = obligatorySet.has(modulo);
          const isPreselected = preselectedSet.has(modulo);
          cb.checked = isRecomendado || isObligatorio || isPreselected;
        });
      });

      // Deseleccionar todos (excepto obligatorios)
      selectNoneBtn?.addEventListener('click', () => {
        container.querySelectorAll('[name="user-modules"]:not(:disabled)').forEach((cb) => {
          cb.checked = false;
        });
      });

      // Resetear a default
      resetBtn?.addEventListener('click', async () => {
        if (confirm('¿Resetear los módulos a los valores por defecto?')) {
          try {
            await this.resetUserModules(usuario.id, negocioId);
            alert('✅ Módulos reseteados a valores por defecto');
            closeModal();
            // Reabrir para mostrar cambios
            this.openModuleManager(usuario, negocioId);
          } catch (error) {
            alert(`❌ Error: ${error.message}`);
          }
        }
      });

      // Guardar cambios
      saveBtn?.addEventListener('click', async () => {
        try {
          const selectedModules = Array.from(
            container.querySelectorAll('[name="user-modules"]:checked')
          ).map((cb) => cb.value);

          // Agregar módulos obligatorios
          const allModules = new Set([...selectedModules, ...obligatorySet]);

          const result = await this.updateUserModules(
            usuario.id,
            negocioId,
            Array.from(allModules)
          );

          alert(
            `✅ Módulos actualizados: ${result.modulos_habilitados.length} módulos habilitados`
          );
          closeModal();

          // Trigger reload de datos si es necesario
          window.dispatchEvent(
            new CustomEvent('modulesUpdated', {
              detail: { userId: usuario.id, negocioId },
            })
          );
        } catch (error) {
          alert(`❌ Error: ${error.message}`);
        }
      });
    } catch (error) {
      alert(`❌ Error abriendo gestor de módulos: ${error.message}`);
      console.error(error);
    }
  },
};

// Exportar para usar en admin-hub.js
if (typeof window !== 'undefined') {
  window.AdminHubModuleManager = AdminHubModuleManager;
}
