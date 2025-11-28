// ============================================
// MÓDULO: CLIENTES (CRM)
// ============================================
// Gestión completa de clientes y relaciones

window.Clientes = {
  // ============================================
  // RENDERIZAR VISTA PRINCIPAL
  // ============================================
  async render(container) {
    container.innerHTML = this.renderLoadingState();

    try {
      const clientes = await this.obtenerClientesSincronizados();
      const clientesActivos = clientes.filter((c) => c.activo !== false);
      const clientesVIP = clientes.filter((c) => c.categoria === 'VIP');
      const hoy = new Date();
      const mesActual = hoy.getMonth();
      const anioActual = hoy.getFullYear();
      const clientesNuevosMes = clientes.filter((c) => {
        const fecha = c?.createdAt ? new Date(c.createdAt) : null;
        return fecha && fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
      });

      container.innerHTML = `
        <div class="excel-shell">
          <!-- Header -->
          <div class="excel-header">
            <div class="excel-title">
              <i class="fas fa-users"></i>
              <h2>Gestión de Clientes</h2>
              <span class="excel-subtitle">${clientes.length} registros</span>
            </div>
            <div class="excel-controls">
              <button class="excel-btn excel-btn-primary" id="btnNuevoCliente">
                <i class="fas fa-plus"></i> Nuevo Cliente
              </button>
            </div>
          </div>

          <!-- Estadísticas -->
          <div class="excel-stats-bar">
            <div class="excel-stat-card">
              <span class="excel-stat-label">Total Clientes</span>
              <span class="excel-stat-value" id="totalClientes">${clientes.length}</span>
            </div>
            <div class="excel-stat-card">
              <span class="excel-stat-label">Activos</span>
              <span class="excel-stat-value success">${clientesActivos.length}</span>
            </div>
            <div class="excel-stat-card">
              <span class="excel-stat-label">Clientes VIP</span>
              <span class="excel-stat-value accent" id="clientesVIP">${clientesVIP.length}</span>
            </div>
            <div class="excel-stat-card">
              <span class="excel-stat-label">Nuevos este Mes</span>
              <span class="excel-stat-value info" id="clientesNuevos">${clientesNuevosMes.length}</span>
            </div>
          </div>

          <!-- Toolbar de filtros -->
          <div class="excel-toolbar">
            <div class="excel-toolbar-left">
              <div class="excel-search-wrapper">
                <i class="fas fa-search"></i>
                <input 
                  type="text" 
                  id="searchCliente" 
                  class="excel-search-input" 
                  placeholder="Buscar por nombre, cédula, teléfono..."
                >
              </div>
            </div>
            <div class="excel-toolbar-right">
              <select id="filterCategoria" class="excel-search-input" style="min-width: 140px; padding-left: 0.7rem;">
                <option value="">Todas las categorías</option>
                <option value="VIP">VIP</option>
                <option value="Regular">Regular</option>
                <option value="Nuevo">Nuevo</option>
              </select>
              <select id="filterEstado" class="excel-search-input" style="min-width: 120px; padding-left: 0.7rem;">
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
          </div>

          <!-- Tabla -->
          <div class="excel-table-wrapper">
            <table class="excel-table clientes-table" id="clientesTable">
              <thead>
                <tr>
                  <th class="sortable" data-sort="nombre">Nombre <i class="fas fa-sort sort-icon"></i></th>
                  <th>Cédula/RUC</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th class="text-center">Categoría</th>
                  <th class="text-right">Total Comprado</th>
                  <th>Última Compra</th>
                  <th class="text-center sticky-action">Acciones</th>
                </tr>
              </thead>
              <tbody id="clientesBody">
                ${this.renderizarFilasClientes(clientes)}
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="excel-footer">
            <span class="excel-footer-badge">
              <i class="fas fa-database"></i> Base de datos sincronizada
            </span>
            <span>Última actualización: ${new Date().toLocaleTimeString('es-EC')}</span>
          </div>
        </div>
      `;

      await this.calcularEstadisticas();

      const btnNuevoCliente = document.getElementById('btnNuevoCliente');
      if (btnNuevoCliente) {
        btnNuevoCliente.addEventListener('click', () => this.mostrarFormulario());
      }

      const searchInput = document.getElementById('searchCliente');
      const categoriaSelect = document.getElementById('filterCategoria');
      const estadoSelect = document.getElementById('filterEstado');

      if (searchInput) searchInput.addEventListener('input', () => this.filtrarClientes());
      if (categoriaSelect) categoriaSelect.addEventListener('change', () => this.filtrarClientes());
      if (estadoSelect) estadoSelect.addEventListener('change', () => this.filtrarClientes());

      if (window.Utils && typeof Utils.applyResponsiveTables === 'function') {
        Utils.applyResponsiveTables(container);
      }
    } catch (error) {
      console.error('Clientes: error al renderizar módulo', error);
      container.innerHTML = this.renderErrorState(error);
    }
  },

  renderLoadingState() {
    return `
      <div class="module-loading">
        <div class="spinner"></div>
        <p>Sincronizando clientes...</p>
      </div>
    `;
  },

  renderErrorState(error) {
    const message = error?.message || 'No se pudo cargar el módulo de clientes.';
    const safeMessage =
      window.Utils && typeof Utils.sanitizeHTML === 'function'
        ? Utils.sanitizeHTML(message)
        : message;

    return `
      <div class="alert alert-error">
          <i class="fas fa-exclamation-triangle"></i>
        <div>
          <strong>Error al cargar clientes</strong>
          <p>${safeMessage}</p>
        </div>
      </div>
    `;
  },

  getBackendClient() {
    return window.DatabaseAPI && typeof DatabaseAPI.request === 'function' ? DatabaseAPI : null;
  },

  getBackendBaseUrl() {
    const apiClient = this.getBackendClient();
    if (apiClient) {
      if (typeof apiClient.getBaseUrl === 'function') {
        return apiClient.getBaseUrl();
      }
      if (apiClient.config && apiClient.config.BASE_URL) {
        return apiClient.config.BASE_URL;
      }
    }
    if (window.API_BASE_URL) {
      return window.API_BASE_URL;
    }
    return (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') 
      ? `${window.location.protocol}//${window.location.hostname}/api` 
      : 'http://localhost:3001/api';
  },

  async requestBackend(endpoint, options = {}) {
    const apiClient = this.getBackendClient();
    const requestOptions = { ...options };
    if (requestOptions.method) {
      requestOptions.method = requestOptions.method.toUpperCase();
    }

    if (apiClient) {
      const result = await apiClient.request(endpoint, requestOptions);
      const method = requestOptions.method || 'GET';
      if (method !== 'GET' && typeof apiClient.clearCache === 'function') {
        apiClient.clearCache();
      }
      return result;
    }

    const baseUrl = this.getBackendBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(requestOptions.headers || {}),
      },
      ...requestOptions,
    };

    if (
      config.method !== 'GET' &&
      config.body &&
      typeof config.body === 'object' &&
      !(config.body instanceof FormData)
    ) {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
    if (!response.ok) {
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch (parseError) {
        bodyText = '';
      }

      const error = new Error(
        bodyText || response.statusText || 'Error al comunicarse con el backend'
      );
      error.status = response.status;
      error.statusText = response.statusText;
      error.endpoint = endpoint;
      throw error;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (parseError) {
        console.warn('Clientes: respuesta JSON inválida del backend', parseError);
        return null;
      }
    }

    return null;
  },

  async obtenerClientesSincronizados() {
    try {
      await this.sincronizarPendientesConBackend();
    } catch (error) {
      console.warn('Clientes: no se pudo sincronizar pendientes con backend', error);
    }

    const clientesLocal = Database.getCollection('clientes') || [];

    try {
      const clientesBackend = await this.cargarClientesDesdeBackend();
      if (Array.isArray(clientesBackend) && clientesBackend.length > 0) {
        return Database.getCollection('clientes') || clientesBackend;
      }
    } catch (error) {
      console.warn('Clientes: no se pudo obtener datos desde el backend', error);
    }

    return clientesLocal;
  },

  async sincronizarPendientesConBackend() {
    const clientes = Database.getCollection('clientes');
    if (!Array.isArray(clientes) || clientes.length === 0) return;

    // Reintenta sincronizar con el backend cualquier cambio hecho sin conexión.
    const pendientes = clientes.filter(
      (cliente) => cliente && (cliente.sincronizado_backend === false || cliente.offlineAction)
    );
    if (pendientes.length === 0) return;

    let seModifico = false;

    for (const cliente of pendientes) {
      const accion =
        cliente.offlineAction || (cliente.sincronizado_backend === false ? 'create' : 'update');
      const resultado = await this.guardarEnBackend(cliente, { isUpdate: accion === 'update' });

      if (resultado.success) {
        cliente.sincronizado_backend = true;
        if (cliente.offlineAction) {
          delete cliente.offlineAction;
        }
        seModifico = true;
      }
    }

    if (seModifico) {
      Database.saveCollection('clientes', clientes);
    }
  },

  async cargarClientesDesdeBackend() {
    try {
      const data = await this.requestBackend('/clientes');
      if (!Array.isArray(data)) {
        return null;
      }

      const normalizados = data
        .map((cliente) => this.normalizarClienteDesdeBackend(cliente))
        .filter(Boolean);

      if (normalizados.length > 0) {
        this.mergeClientesLocales(normalizados);
      }

      return normalizados;
    } catch (error) {
      console.warn('Clientes: error al sincronizar con backend', error);
      return null;
    }
  },

  mergeClientesLocales(remotos) {
    const locales = Database.getCollection('clientes') || [];
    const mapa = new Map();

    locales.forEach((cliente) => {
      if (cliente && cliente.id) {
        mapa.set(cliente.id, { ...cliente });
      }
    });

    remotos.forEach((clienteRemoto) => {
      if (!clienteRemoto || !clienteRemoto.id) return;
      const existente = mapa.get(clienteRemoto.id) || {};
      mapa.set(clienteRemoto.id, {
        ...existente,
        ...clienteRemoto,
        sincronizado_backend: true,
      });
    });

    const combinados = Array.from(mapa.values())
      .map((cliente) => ({
        ...cliente,
        activo: cliente.activo === 0 ? false : cliente.activo !== false,
        sincronizado_backend:
          cliente.sincronizado_backend === undefined ? true : cliente.sincronizado_backend,
      }))
      .sort((a, b) => {
        const nombreA = (a.nombre || '').toLowerCase();
        const nombreB = (b.nombre || '').toLowerCase();
        if (nombreA < nombreB) return -1;
        if (nombreA > nombreB) return 1;
        return 0;
      });

    Database.saveCollection('clientes', combinados);
    return combinados;
  },

  getCategorias() {
    const basicas = ['Nuevo', 'Regular', 'VIP'];
    try {
      const config = Database.get('configTienda') || {};
      const custom = Array.isArray(config?.categoriasClientes)
        ? config.categoriasClientes.filter(Boolean)
        : Array.isArray(config?.segmentosClientes)
          ? config.segmentosClientes.filter(Boolean)
          : [];
      if (custom.length) {
        const conjunto = new Set([...basicas, ...custom]);
        return Array.from(conjunto);
      }
    } catch (error) {
      console.warn('Clientes: no se pudieron obtener categorías personalizadas', error);
    }
    return basicas;
  },

  getVehiculosDeCliente(clienteId) {
    if (!clienteId) return [];
    const vehiculos = Database.getCollection('vehiculos') || [];
    return vehiculos
      .filter((vehiculo) => this.vehiculoPerteneceACliente(vehiculo, clienteId))
      .map((vehiculo) => this.normalizarVehiculoLocal(vehiculo))
      .filter(Boolean);
  },

  renderVehiculosFormSection(vehiculos = [], cliente = null) {
    const lista =
      Array.isArray(vehiculos) && vehiculos.length > 0 ? vehiculos : [this.crearVehiculoFormData()];

    const filas = lista
      .map((vehiculo) => this.renderVehiculoFormRow(this.crearVehiculoFormData(vehiculo)))
      .join('');

    return `
      <div class="form-section">
        <h4><i class="fas fa-car-side"></i> Vehículos Asociados</h4>
        <p class="form-hint">Registra al menos un vehículo por cliente. Si compra para terceros, deja un registro referencial.</p>
        <div id="vehiculosClienteContainer">
          ${filas}
        </div>
        <div class="form-row">
          <button type="button" class="btn btn-outline-primary" onclick="Clientes.agregarVehiculoFila()">
            <i class="fas fa-plus"></i> Añadir vehículo
          </button>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" name="compraTerceros" ${cliente?.compraTerceros ? 'checked' : ''}>
            Compra para terceros (permitir registro provisional)
          </label>
        </div>
      </div>
    `;
  },

  crearVehiculoFormData(base = {}) {
    const generateId = () =>
      Utils && typeof Utils.generateId === 'function'
        ? Utils.generateId()
        : Date.now().toString(36);
    const rowId = base.__rowId || base.id || `vehForm_${generateId()}`;
    return {
      id: base.id || null,
      __rowId: rowId,
      marca: base.marca || '',
      modelo: base.modelo || '',
      placa: (base.placa || '').toUpperCase(),
      anio: base.anio ? String(base.anio) : '',
      color: base.color || '',
      vin: base.vin || '',
      notas: base.notas || '',
    };
  },

  renderVehiculoFormRow(vehiculo) {
    const escape = (valor) =>
      Utils && typeof Utils.escapeHTML === 'function' ? Utils.escapeHTML(valor || '') : valor || '';
    const rowId = vehiculo.__rowId || `vehForm_${Utils.generateId()}`;
    const currentYear = new Date().getFullYear() + 1;

    return `
      <div class="vehiculo-form-row card" data-row-id="${rowId}">
        <input type="hidden" data-field="id" value="${escape(vehiculo.id || '')}">
        <div class="form-row">
          <div class="form-group">
            <label>Marca *</label>
            <input type="text" class="form-control" data-field="marca" placeholder="Ej. Toyota" value="${escape(vehiculo.marca)}" required>
          </div>
          <div class="form-group">
            <label>Modelo</label>
            <input type="text" class="form-control" data-field="modelo" placeholder="Ej. Hilux" value="${escape(vehiculo.modelo)}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Placa</label>
            <input type="text" class="form-control" data-field="placa" placeholder="ABC-123" value="${escape(vehiculo.placa)}" maxlength="10">
          </div>
          <div class="form-group">
            <label>Año</label>
            <input type="number" class="form-control" data-field="anio" placeholder="2024" value="${escape(vehiculo.anio)}" min="1900" max="${currentYear}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Color</label>
            <input type="text" class="form-control" data-field="color" placeholder="Color" value="${escape(vehiculo.color)}">
          </div>
          <div class="form-group">
            <label>VIN</label>
            <input type="text" class="form-control" data-field="vin" placeholder="Número VIN" value="${escape(vehiculo.vin)}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Notas</label>
            <input type="text" class="form-control" data-field="notas" placeholder="Notas del vehículo" value="${escape(vehiculo.notas)}">
          </div>
          <div class="form-group form-group-actions">
            <label>&nbsp;</label>
            <button type="button" class="btn btn-sm btn-danger" onclick="Clientes.eliminarVehiculoFila('${rowId}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  agregarVehiculoFila(inicial = null) {
    const container = document.getElementById('vehiculosClienteContainer');
    if (!container) return;
    const datos = this.crearVehiculoFormData(inicial || {});
    container.insertAdjacentHTML('beforeend', this.renderVehiculoFormRow(datos));
  },

  eliminarVehiculoFila(rowId) {
    const container = document.getElementById('vehiculosClienteContainer');
    if (!container) return;
    const fila = container.querySelector(`.vehiculo-form-row[data-row-id="${rowId}"]`);
    if (fila) {
      fila.remove();
    }
    if (!container.querySelector('.vehiculo-form-row')) {
      this.agregarVehiculoFila();
    }
  },

  collectVehiculosFromForm() {
    const container = document.getElementById('vehiculosClienteContainer');
    if (!container) return [];
    const filas = Array.from(container.querySelectorAll('.vehiculo-form-row'));

    return filas
      .map((fila) => {
        const leer = (campo) => {
          const elemento = fila.querySelector(`[data-field="${campo}"]`);
          if (!elemento) return '';
          return (elemento.value || '').trim();
        };
        return {
          id: leer('id'),
          marca: leer('marca'),
          modelo: leer('modelo'),
          placa: leer('placa').toUpperCase(),
          anio: leer('anio'),
          color: leer('color'),
          vin: leer('vin'),
          notas: leer('notas'),
          __rowId: fila.getAttribute('data-row-id'),
        };
      })
      .filter((vehiculo) => {
        const tieneDatos = [
          vehiculo.marca,
          vehiculo.modelo,
          vehiculo.placa,
          vehiculo.anio,
          vehiculo.color,
          vehiculo.vin,
          vehiculo.notas,
        ].some((valor) => valor && valor.length);
        return tieneDatos;
      });
  },

  vehiculoTieneDatosMinimos(vehiculo) {
    if (!vehiculo) return false;
    return Boolean(vehiculo.marca && vehiculo.marca.trim().length >= 2);
  },

  vehiculoCoincideConPayload(actual, payload) {
    if (!actual || !payload) return false;
    const normalizado = this.normalizarVehiculoLocal(actual) || {};
    const comparar = (valor) => {
      if (valor === null || valor === undefined) return '';
      return String(valor).trim();
    };

    return (
      comparar(normalizado.marca) === comparar(payload.marca) &&
      comparar(normalizado.modelo) === comparar(payload.modelo) &&
      comparar(normalizado.placa) === comparar(payload.placa) &&
      comparar(normalizado.anio) === comparar(payload.anio) &&
      comparar(normalizado.color) === comparar(payload.color) &&
      comparar(normalizado.vin) === comparar(payload.vin) &&
      comparar(normalizado.notas) === comparar(payload.notas)
    );
  },

  async sincronizarVehiculosConCliente(cliente, vehiculos) {
    if (!cliente || !cliente.id) return [];

    const todos = Database.getCollection('vehiculos') || [];
    const actualesCliente = todos.filter((vehiculo) =>
      this.vehiculoPerteneceACliente(vehiculo, cliente.id)
    );
    const otrosVehiculos = todos.filter(
      (vehiculo) => !this.vehiculoPerteneceACliente(vehiculo, cliente.id)
    );

    const resultados = [];

    for (const vehiculo of vehiculos) {
      const payload = {
        clienteId: cliente.id,
        clienteNombre: cliente.nombre || '',
        marca: vehiculo.marca,
        modelo: vehiculo.modelo || '',
        placa: vehiculo.placa || '',
        anio: vehiculo.anio ? parseInt(vehiculo.anio, 10) || null : null,
        color: vehiculo.color || '',
        vin: vehiculo.vin || '',
        notas: vehiculo.notas || '',
      };

      const previo = vehiculo.id ? actualesCliente.find((item) => item.id === vehiculo.id) : null;
      let normalizado;

      if (previo && this.vehiculoCoincideConPayload(previo, payload)) {
        normalizado = this.normalizarVehiculoLocal({
          ...previo,
          cliente_nombre: cliente.nombre,
        });
        resultados.push(normalizado);
        continue;
      }

      if (vehiculo.id) {
        try {
          await this.requestBackend(`/vehiculos/${encodeURIComponent(vehiculo.id)}`, {
            method: 'PUT',
            body: payload,
          });

          normalizado = this.normalizarVehiculoLocal({
            ...payload,
            id: vehiculo.id,
            cliente_nombre: cliente.nombre,
            sincronizado_backend: true,
          });
        } catch (error) {
          console.warn(
            'Clientes: error al actualizar vehículo, se marcará para sincronización posterior',
            error
          );
          normalizado = this.normalizarVehiculoLocal({
            ...payload,
            id: vehiculo.id,
            cliente_nombre: cliente.nombre,
            sincronizado_backend: false,
            offlineAction: 'update',
          });
        }
      } else {
        try {
          const data = await this.requestBackend('/vehiculos', {
            method: 'POST',
            body: payload,
          });

          const nuevoId = data?.vehiculo?.id || data?.id || `veh_${Date.now()}`;
          normalizado = this.normalizarVehiculoLocal({
            ...payload,
            id: nuevoId,
            cliente_nombre: cliente.nombre,
            sincronizado_backend: true,
          });
        } catch (error) {
          console.warn('Clientes: error al crear vehículo, se guardará offline', error);
          const offlineId = `veh_offline_${Utils.generateId?.() || Date.now()}`;
          normalizado = this.normalizarVehiculoLocal({
            ...payload,
            id: offlineId,
            cliente_nombre: cliente.nombre,
            sincronizado_backend: false,
            offlineAction: 'create',
          });
        }
      }

      resultados.push(normalizado);
    }

    // Determinar vehículos eliminados
    const idsActuales = new Set(resultados.map((vehiculo) => vehiculo.id));
    const eliminados = actualesCliente.filter(
      (vehiculo) => vehiculo.id && !idsActuales.has(vehiculo.id)
    );

    for (const vehiculo of eliminados) {
      try {
        await this.requestBackend(`/vehiculos/${encodeURIComponent(vehiculo.id)}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.warn(
          'Clientes: no se pudo eliminar el vehículo asociado, se marcará para eliminación',
          error
        );
        resultados.push(
          this.normalizarVehiculoLocal({
            ...vehiculo,
            cliente_nombre: cliente.nombre,
            sincronizado_backend: false,
            offlineAction: 'delete',
          })
        );
      }
    }

    const actualizados = resultados.filter(Boolean);
    Database.saveCollection('vehiculos', [...otrosVehiculos, ...actualizados]);

    try {
      const refrescados = await this.refrescarVehiculosLocales(cliente.id);
      if (refrescados.length) {
        return refrescados;
      }
    } catch (error) {
      console.warn('Clientes: no se pudo refrescar vehículos desde el backend', error);
    }

    return actualizados;
  },

  normalizarVehiculoLocal(vehiculo) {
    if (!vehiculo) return null;
    const clienteId = vehiculo.cliente_id || vehiculo.clienteId;
    const createdAt = vehiculo.created_at || vehiculo.createdAt || new Date().toISOString();
    const updatedAt = vehiculo.updated_at || vehiculo.updatedAt || createdAt;

    return {
      id: vehiculo.id,
      cliente_id: clienteId,
      clienteId,
      cliente_nombre: vehiculo.cliente_nombre || vehiculo.clienteNombre || '',
      marca: vehiculo.marca || '',
      modelo: vehiculo.modelo || '',
      placa: (vehiculo.placa || '').toUpperCase(),
      anio: vehiculo.anio ? Number(vehiculo.anio) || '' : '',
      color: vehiculo.color || '',
      vin: vehiculo.vin || '',
      kilometraje: vehiculo.kilometraje ? Number(vehiculo.kilometraje) || 0 : 0,
      fecha_ultimo_servicio: vehiculo.fecha_ultimo_servicio || vehiculo.fechaUltimoServicio || null,
      notas: vehiculo.notas || '',
      sincronizado_backend: vehiculo.sincronizado_backend === false ? false : true,
      offlineAction: vehiculo.offlineAction || null,
      created_at: createdAt,
      updated_at: updatedAt,
    };
  },

  vehiculoPerteneceACliente(vehiculo, clienteId) {
    if (!vehiculo || !clienteId) return false;
    const id = vehiculo.cliente_id || vehiculo.clienteId;
    return id === clienteId;
  },

  async refrescarVehiculosLocales(clienteId) {
    if (!clienteId) return [];
    try {
      const datos = await this.requestBackend(
        `/vehiculos?cliente_id=${encodeURIComponent(clienteId)}`
      );
      if (!Array.isArray(datos)) {
        return [];
      }

      const normalizados = datos
        .map((vehiculo) =>
          this.normalizarVehiculoLocal({
            ...vehiculo,
            cliente_nombre: vehiculo.cliente_nombre || vehiculo.clienteNombre,
          })
        )
        .filter(Boolean);

      const todos = Database.getCollection('vehiculos') || [];
      const otrosVehiculos = todos.filter(
        (vehiculo) => !this.vehiculoPerteneceACliente(vehiculo, clienteId)
      );
      Database.saveCollection('vehiculos', [...otrosVehiculos, ...normalizados]);

      return normalizados;
    } catch (error) {
      console.warn('Clientes: error al refrescar la lista de vehículos', error);
      const locales = Database.getCollection('vehiculos') || [];
      return locales
        .filter((vehiculo) => this.vehiculoPerteneceACliente(vehiculo, clienteId))
        .map((vehiculo) => this.normalizarVehiculoLocal(vehiculo));
    }
  },

  normalizarClienteDesdeBackend(cliente) {
    if (!cliente || !cliente.id) return null;

    return {
      id: cliente.id,
      nombre: cliente.nombre || '',
      cedula: cliente.cedula || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      ciudad: cliente.ciudad || '',
      categoria: cliente.categoria || 'Regular',
      notas: cliente.notas || '',
      totalComprado: Number(cliente.total_comprado ?? cliente.totalComprado ?? 0) || 0,
      numeroCompras: Number(cliente.numero_compras ?? cliente.numeroCompras ?? 0) || 0,
      ultimaCompra: cliente.ultima_compra || cliente.ultimaCompra || null,
      ticketPromedio: Number(cliente.ticket_promedio ?? cliente.ticketPromedio ?? 0) || 0,
      saldoPendiente: Number(cliente.saldo_pendiente ?? cliente.saldoPendiente ?? 0) || 0,
      limiteCredito: Number(cliente.limite_credito ?? cliente.limiteCredito ?? 0) || 0,
      activo: cliente.activo === undefined ? true : cliente.activo === 1 || cliente.activo === true,
      createdAt: cliente.created_at || cliente.createdAt || new Date().toISOString(),
      updatedAt: cliente.updated_at || cliente.updatedAt || new Date().toISOString(),
      vehiculoFavoritoId: cliente.vehiculo_favorito_id || cliente.vehiculoFavoritoId || null,
      vehiculo_favorito_id: cliente.vehiculo_favorito_id || cliente.vehiculoFavoritoId || null,
      telegramChatId: cliente.telegram_chat_id || cliente.telegramChatId || null,
      sincronizado_backend: true,
    };
  },

  mapClienteParaBackend(cliente) {
    return {
      id: cliente.id,
      nombre: cliente.nombre,
      cedula: cliente.cedula || null,
      telefono: cliente.telefono || null,
      email: cliente.email || null,
      direccion: cliente.direccion || null,
      ciudad: cliente.ciudad || null,
      categoria: cliente.categoria || 'Regular',
      notas: cliente.notas || '',
      totalComprado: Number(cliente.totalComprado || 0),
      vehiculoFavoritoId: cliente.vehiculoFavoritoId || cliente.vehiculo_favorito_id || null,
      telegramChatId: cliente.telegramChatId || cliente.telegram_chat_id || null,
      activo: cliente.activo ? 1 : 0,
      updatedAt: cliente.updatedAt || new Date().toISOString(),
      createdAt: cliente.createdAt || new Date().toISOString(),
    };
  },

  async guardarEnBackend(cliente, options = {}) {
    const { isUpdate = false, retry = false } = options;
    const payload = this.mapClienteParaBackend(cliente);
    const endpoint = isUpdate ? `/clientes/${encodeURIComponent(cliente.id)}` : '/clientes';
    const method = isUpdate ? 'PUT' : 'POST';

    try {
      const data = await this.requestBackend(endpoint, {
        method,
        body: payload,
      });

      return { success: true, data };
    } catch (error) {
      const status = error?.status;
      const errorMessage = error?.message || '';
      const constraintError = status === 409 || /constraint/i.test(errorMessage);

      if (!isUpdate && constraintError && !retry) {
        return await this.guardarEnBackend(cliente, { isUpdate: true, retry: true });
      }

      return { success: false, status, error };
    }
  },

  // ============================================
  // RENDERIZAR FILAS DE CLIENTES
  // ============================================
  renderizarFilasClientes(clientes) {
    if (clientes.length === 0) {
      return `<tr><td colspan="8">
        <div class="excel-empty-state">
          <i class="fas fa-users"></i>
          <h4>No hay clientes registrados</h4>
          <p>Agrega tu primer cliente para comenzar</p>
        </div>
      </td></tr>`;
    }

    return clientes
      .map((c) => {
        const categoria = c.categoria || 'Regular';
        const badgeClass =
          categoria === 'VIP'
            ? 'excel-badge-success'
            : categoria === 'Regular'
              ? 'excel-badge-info'
              : 'excel-badge-muted';
        const estadoClass = c.activo !== false ? '' : 'row-warning';

        return `
      <tr class="clickable ${estadoClass}" data-cliente-id="${c.id}">
        <td class="cliente-nombre"><strong>${c.nombre}</strong></td>
        <td class="font-mono text-muted">${c.cedula || '-'}</td>
        <td>${c.telefono || '-'}</td>
        <td class="text-muted">${c.email || '-'}</td>
        <td class="text-center">
          <span class="excel-badge ${badgeClass}">
            ${categoria}
          </span>
        </td>
        <td class="text-right"><strong>${Utils.formatCurrency(c.totalComprado || 0)}</strong></td>
        <td class="text-muted">${c.ultimaCompra || '-'}</td>
        <td class="text-center sticky-action">
          <div class="excel-actions">
            <button class="excel-btn-action btn-view" onclick="Clientes.verDetalle('${c.id}')" title="Ver detalle">
              <i class="fas fa-eye"></i>
            </button>
            <button class="excel-btn-action btn-edit" onclick="Clientes.editar('${c.id}')" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="excel-btn-action btn-delete" onclick="Clientes.eliminar('${c.id}')" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
      })
      .join('');
  },

  // ============================================
  // FILTRAR CLIENTES
  // ============================================
  async filtrarClientes() {
    const clientes = await Database.getCollection('clientes');
    const search = document.getElementById('searchCliente').value.toLowerCase();
    const categoria = document.getElementById('filterCategoria').value;
    const estado = document.getElementById('filterEstado').value;

    let filtrados = clientes;

    if (search) {
      filtrados = filtrados.filter(
        (c) =>
          c.nombre.toLowerCase().includes(search) ||
          (c.cedula && c.cedula.includes(search)) ||
          (c.telefono && c.telefono.includes(search)) ||
          (c.email && c.email.toLowerCase().includes(search))
      );
    }

    if (categoria) {
      filtrados = filtrados.filter((c) => c.categoria === categoria);
    }

    if (estado) {
      const activo = estado === 'true';
      filtrados = filtrados.filter((c) => c.activo === activo);
    }

    document.getElementById('clientesBody').innerHTML = this.renderizarFilasClientes(filtrados);

    const tabla = document.getElementById('clientesBody')?.closest('table');
    if (tabla && window.Utils && typeof Utils.applyResponsiveTables === 'function') {
      Utils.applyResponsiveTables(tabla);
    }
  },

  // ============================================
  // CALCULAR ESTADÍSTICAS
  // ============================================
  async calcularEstadisticas() {
    const clientes = (await Database.getCollection('clientes')) || [];
    const vips = clientes.filter((c) => c.categoria === 'VIP').length;

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const nuevos = clientes.filter((c) => {
      const fechaCreacion = c?.createdAt ? new Date(c.createdAt) : null;
      if (!fechaCreacion || isNaN(fechaCreacion.getTime())) {
        return false;
      }
      return fechaCreacion.getMonth() === mesActual && fechaCreacion.getFullYear() === anioActual;
    }).length;

    const totalClientesEl = document.getElementById('totalClientes');
    if (totalClientesEl) totalClientesEl.textContent = clientes.length;

    const clientesVIPEl = document.getElementById('clientesVIP');
    if (clientesVIPEl) clientesVIPEl.textContent = vips;

    const clientesNuevosEl = document.getElementById('clientesNuevos');
    if (clientesNuevosEl) clientesNuevosEl.textContent = nuevos;
  },

  // ============================================
  // MOSTRAR FORMULARIO
  // ============================================
  mostrarFormulario(clienteId = null) {
    const cliente = clienteId ? Database.getItem('clientes', clienteId) : null;
    const esEdicion = !!cliente;

    const categorias = this.getCategorias();
    const opcionesCategoria = categorias
      .map((categoria) => {
        const value =
          Utils && typeof Utils.escapeHTML === 'function' ? Utils.escapeHTML(categoria) : categoria;
        const selected = cliente?.categoria === categoria ? 'selected' : '';
        return `<option value="${value}" ${selected}>${value}</option>`;
      })
      .join('');
    const vehiculosAsociados = esEdicion
      ? this.getVehiculosDeCliente(cliente.id).map((vehiculo) =>
          this.crearVehiculoFormData(vehiculo)
        )
      : [];
    const vehiculosSection = this.renderVehiculosFormSection(vehiculosAsociados, cliente);

    const body = `
      <form id="formCliente">
        <div class="form-row">
          <div class="form-group">
            <label>Nombre Completo *</label>
            <input type="text" name="nombre" class="form-control" value="${cliente?.nombre || ''}" required>
          </div>
          <div class="form-group">
            <label>Tipo</label>
            <select name="tipo" class="form-control">
              <option value="persona" ${cliente?.tipo === 'persona' ? 'selected' : ''}>Persona Natural</option>
              <option value="empresa" ${cliente?.tipo === 'empresa' ? 'selected' : ''}>Empresa</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Cédula/RUC</label>
            <input type="text" name="cedula" class="form-control" value="${cliente?.cedula || ''}">
          </div>
          <div class="form-group">
            <label>Teléfono *</label>
            <input type="text" name="telefono" class="form-control" value="${cliente?.telefono || ''}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" class="form-control" value="${cliente?.email || ''}">
          </div>
          <div class="form-group">
            <label>Fecha de Nacimiento</label>
            <input type="date" name="fechaNacimiento" class="form-control" value="${cliente?.fechaNacimiento || ''}">
          </div>
        </div>

        <div class="form-group">
          <label>Dirección</label>
          <input type="text" name="direccion" class="form-control" value="${cliente?.direccion || ''}">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Ciudad</label>
            <input type="text" name="ciudad" class="form-control" value="${cliente?.ciudad || 'Quito'}">
          </div>
          <div class="form-group">
            <label>País</label>
            <input type="text" name="pais" class="form-control" value="${cliente?.pais || 'Ecuador'}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Categoría</label>
            <select name="categoria" class="form-control">
              ${opcionesCategoria || '<option value="Regular">Regular</option>'}
            </select>
          </div>
          <div class="form-group">
            <label>Límite de Crédito ($)</label>
            <input type="number" name="limiteCredito" class="form-control" step="0.01" min="0" value="${cliente?.limiteCredito || 0}">
          </div>
        </div>

        <div class="form-group">
          <label>Notas</label>
          <textarea name="notas" class="form-control" rows="3">${cliente?.notas || ''}</textarea>
        </div>

        ${vehiculosSection}

        <div class="form-group">
          <label>
            <input type="checkbox" name="activo" ${cliente?.activo !== false ? 'checked' : ''}>
            Cliente Activo
          </label>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn btn-secondary" data-action="cancel-cliente">
        Cancelar
      </button>
      <button class="btn btn-primary" data-action="save-cliente" data-cliente-id="${clienteId || ''}">
        <i class="fas fa-save"></i> Guardar
      </button>
    `;

    const modalElement = Utils.createModal(
      'modalCliente',
      `<i class="fas fa-user"></i> ${esEdicion ? 'Editar' : 'Nuevo'} Cliente`,
      body,
      footer,
      'large'
    );

    // Agregar event listeners
    const cancelBtn = modalElement.querySelector('[data-action="cancel-cliente"]');
    const saveBtn = modalElement.querySelector('[data-action="save-cliente"]');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => Utils.closeModal('modalCliente'));
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const cliId = saveBtn.getAttribute('data-cliente-id');
        this.guardar(cliId);
      });
    }
  },

  // ============================================
  // GUARDAR CLIENTE
  // ============================================
  async guardar(clienteId) {
    const form = document.getElementById('formCliente');
    if (!form) return;

    const guardarBtn = document.querySelector('#modalCliente .modal-footer .btn.btn-primary');
    const restaurarBoton = () => {
      if (guardarBtn) {
        guardarBtn.disabled = false;
        guardarBtn.innerHTML = '<i class="fas fa-save"></i> Guardar';
      }
    };

    if (guardarBtn) {
      guardarBtn.disabled = true;
      guardarBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    }

    try {
      const clienteData = Utils.getFormData(form);

      if (!clienteData.nombre || !clienteData.telefono) {
        Utils.showToast('Completa los campos requeridos', 'error');
        restaurarBoton();
        return;
      }

      const compraTerceros = form.querySelector('input[name="compraTerceros"]')?.checked || false;
      const vehiculosFormulario = this.collectVehiculosFromForm();
      let vehiculosValidos = vehiculosFormulario.filter((vehiculo) =>
        this.vehiculoTieneDatosMinimos(vehiculo)
      );

      if (!compraTerceros && vehiculosValidos.length === 0) {
        Utils.showToast('Debes asociar al menos un vehículo al cliente.', 'error');
        restaurarBoton();
        return;
      }

      if (compraTerceros && vehiculosValidos.length === 0) {
        vehiculosValidos = [
          this.crearVehiculoFormData({
            marca: 'Compra para terceros',
            modelo: 'Registro provisional',
            notas: 'Generado automáticamente por compra a terceros',
          }),
        ];
      }

      vehiculosValidos = vehiculosValidos.map((vehiculo) => ({
        ...vehiculo,
        marca: vehiculo.marca?.trim() || '',
        modelo: vehiculo.modelo?.trim() || '',
        placa: vehiculo.placa?.trim() || '',
        anio: vehiculo.anio?.toString().trim() || '',
        color: vehiculo.color?.trim() || '',
        vin: vehiculo.vin?.trim() || '',
        notas: vehiculo.notas?.trim() || '',
      }));

      clienteData.limiteCredito = parseFloat(clienteData.limiteCredito) || 0;
      clienteData.activo = clienteData.activo === 'on';

      const esEdicion = !!clienteId;
      const timestamp = new Date().toISOString();
      const clienteExistente = esEdicion ? Database.getItem('clientes', clienteId) : null;

      if (esEdicion && !clienteExistente) {
        Utils.showToast('No se encontró el cliente a actualizar', 'error');
        restaurarBoton();
        return;
      }

      const clienteLocal = {
        ...(clienteExistente || {}),
        ...clienteData,
        id: clienteExistente?.id || clienteId || `cli_${Utils.generateId()}`,
        totalComprado: clienteExistente?.totalComprado || 0,
        numeroCompras: clienteExistente?.numeroCompras || 0,
        ultimaCompra: clienteExistente?.ultimaCompra || null,
        ticketPromedio: clienteExistente?.ticketPromedio || 0,
        saldoPendiente: clienteExistente?.saldoPendiente || 0,
        createdAt: clienteExistente?.createdAt || timestamp,
        updatedAt: timestamp,
        sincronizado_backend: clienteExistente?.sincronizado_backend ?? false,
      };

      let sincronizadoCliente = false;
      const resultadoBackend = await this.guardarEnBackend(clienteLocal, { isUpdate: esEdicion });

      if (resultadoBackend.success) {
        sincronizadoCliente = true;
        clienteLocal.sincronizado_backend = true;
        if (resultadoBackend.data?.id) {
          clienteLocal.id = resultadoBackend.data.id;
        }
        if (clienteLocal.offlineAction) {
          delete clienteLocal.offlineAction;
        }
      } else {
        clienteLocal.sincronizado_backend = false;
        clienteLocal.offlineAction = esEdicion ? 'update' : 'create';
      }

      const vehiculosParaSincronizar = vehiculosValidos.map(({ __rowId, ...vehiculo }) => vehiculo);
      const vehiculosSincronizados = await this.sincronizarVehiculosConCliente(
        clienteLocal,
        vehiculosParaSincronizar
      );

      if (vehiculosSincronizados.length > 0) {
        const favoritoId = vehiculosSincronizados[0].id;
        clienteLocal.vehiculoFavoritoId = favoritoId;
        clienteLocal.vehiculo_favorito_id = favoritoId;
      } else {
        Utils.showToast('No fue posible vincular vehículos. Verifica la conexión.', 'warning');
      }

      if (esEdicion) {
        Database.update('clientes', clienteLocal.id, clienteLocal);
        Utils.showToast('Cliente actualizado', 'success');
      } else {
        Database.add('clientes', clienteLocal);
        Utils.showToast('Cliente creado', 'success');
      }

      if (!sincronizadoCliente) {
        Utils.showToast(
          'Cliente guardado localmente. Se sincronizará cuando haya conexión.',
          'warning'
        );
      }

      if (vehiculosSincronizados.some((v) => v.sincronizado_backend === false)) {
        Utils.showToast(
          'Uno o más vehículos se guardaron sin conexión. Se sincronizarán automáticamente.',
          'warning'
        );
      }

      if (sincronizadoCliente && clienteLocal.vehiculoFavoritoId) {
        await this.guardarEnBackend(clienteLocal, { isUpdate: true });
      }

      const modal = document.getElementById('modalCliente');
      if (modal) {
        modal.remove();
      }

      // Actualizar datos sin recargar página completa
      if (window.DataRefreshManager) {
        await DataRefreshManager.update(
          'clientes',
          async () => {
            const clientes = await this.obtenerClientesSincronizados();
            return clientes;
          },
          {
            showLoading: false,
            toastMessage: esEdicion
              ? 'Cliente actualizado correctamente'
              : 'Cliente creado correctamente',
          }
        );

        // Actualizar la tabla y estadísticas
        const clientes = await this.obtenerClientesSincronizados();
        document.getElementById('clientesBody').innerHTML = this.renderizarFilasClientes(clientes);
        await this.calcularEstadisticas();

        // Aplicar responsividad
        if (window.Utils && typeof Utils.applyResponsiveTables === 'function') {
          const container = document.querySelector('.page-content');
          if (container) {
            Utils.applyResponsiveTables(container);
          }
        }
      } else {
        // Fallback si no está disponible el gestor
        App.loadModule('clientes');
      }
    } catch (error) {
      console.error('Clientes: error al guardar cliente', error);
      Utils.showToast('Error al guardar cliente: ' + error.message, 'error');
    } finally {
      restaurarBoton();
    }
  },

  // ============================================
  // EDITAR CLIENTE
  // ============================================
  editar(clienteId) {
    this.mostrarFormulario(clienteId);
  },

  // ============================================
  // VER DETALLE DEL CLIENTE
  // ============================================
  async verDetalle(clienteId) {
    const cliente = await Database.getItem('clientes', clienteId);
    if (!cliente) return;

    // Obtener ventas del cliente
    const ventas = (await Database.getCollection('ventas')).filter(
      (v) => v.clienteId === clienteId
    );
    const cuentasPorCobrar = (await Database.getCollection('cuentasPorCobrar')).filter(
      (c) => c.clienteId === clienteId && c.estado !== 'pagada'
    );
    await this.refrescarVehiculosLocales(clienteId);
    const vehiculosCliente = this.getVehiculosDeCliente(clienteId);

    const escape = (valor) =>
      Utils && typeof Utils.escapeHTML === 'function' ? Utils.escapeHTML(valor || '') : valor || '';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalDetalleCliente';
    modal.innerHTML = `
      <div class="modal-container modal-large">
        <div class="modal-header">
          <h3><i class="fas fa-user"></i> Detalle del Cliente</h3>
          <button class="btn-close" onclick="document.getElementById('modalDetalleCliente').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="cliente-detalle">
            <div class="cliente-info-principal">
              <h2>${cliente.nombre}</h2>
              <span class="badge badge-${cliente.categoria === 'VIP' ? 'success' : 'primary'}">
                ${cliente.categoria}
              </span>
            </div>

            <div class="info-grid">
              <div><strong>Cédula/RUC:</strong> ${escape(cliente.cedula) || '-'}</div>
              <div><strong>Teléfono:</strong> ${escape(cliente.telefono) || '-'}</div>
              <div><strong>Email:</strong> ${escape(cliente.email) || '-'}</div>
              <div><strong>Dirección:</strong> ${escape(cliente.direccion) || '-'}</div>
              <div><strong>Ciudad:</strong> ${escape(cliente.ciudad) || '-'}</div>
              <div><strong>País:</strong> ${escape(cliente.pais) || '-'}</div>
            </div>

            <h4>Vehículos Asociados</h4>
            ${
              vehiculosCliente.length
                ? `
              <div class="vehiculos-grid">
                ${vehiculosCliente
                  .map(
                    (vehiculo) => `
                  <div class="vehiculo-card">
                    <strong>${escape(vehiculo.marca) || 'Sin marca'} ${escape(vehiculo.modelo)}</strong>
                    <div><strong>Placa:</strong> ${escape(vehiculo.placa) || 'No registrada'}</div>
                    <div><strong>Año:</strong> ${vehiculo.anio || '-'}</div>
                    <div><strong>Color:</strong> ${escape(vehiculo.color) || '-'}</div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
                : '<p class="text-muted">No hay vehículos vinculados a este cliente.</p>'
            }

            <h4>Estadísticas</h4>
            <div class="stats-grid">
              <div class="stat-card">
                <p>Total Comprado</p>
                <h3>${Utils.formatCurrency(cliente.totalComprado || 0)}</h3>
              </div>
              <div class="stat-card">
                <p>Número de Compras</p>
                <h3>${cliente.numeroCompras || 0}</h3>
              </div>
              <div class="stat-card">
                <p>Ticket Promedio</p>
                <h3>${Utils.formatCurrency(cliente.ticketPromedio || 0)}</h3>
              </div>
              <div class="stat-card">
                <p>Saldo Pendiente</p>
                <h3 class="${cliente.saldoPendiente > 0 ? 'text-danger' : 'text-success'}">
                  ${Utils.formatCurrency(cliente.saldoPendiente || 0)}
                </h3>
              </div>
            </div>

            ${
              cuentasPorCobrar.length > 0
                ? `
              <h4>Cuentas por Cobrar Pendientes</h4>
              <table class="table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Restante</th>
                  </tr>
                </thead>
                <tbody>
                  ${cuentasPorCobrar
                    .map(
                      (c) => `
                    <tr>
                      <td>${c.numeroVenta}</td>
                      <td>${c.fechaEmision}</td>
                      <td>${Utils.formatCurrency(c.montoTotal)}</td>
                      <td class="text-danger">${Utils.formatCurrency(c.montoRestante)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            `
                : ''
            }

            <h4>Últimas Ventas</h4>
            ${
              ventas.length > 0
                ? `
              <table class="table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Método Pago</th>
                  </tr>
                </thead>
                <tbody>
                  ${ventas
                    .slice(0, 5)
                    .map(
                      (v) => `
                    <tr>
                      <td>${v.numero}</td>
                      <td>${v.fecha}</td>
                      <td>${Utils.formatCurrency(v.total)}</td>
                      <td>${v.metodoPago}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            `
                : '<p class="text-muted">No hay ventas registradas</p>'
            }
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalDetalleCliente').remove()">
            Cerrar
          </button>
          <button class="btn btn-primary" onclick="Clientes.editar('${clienteId}'); document.getElementById('modalDetalleCliente').remove();">
            <i class="fas fa-edit"></i> Editar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  // ============================================
  // ELIMINAR CLIENTE
  // ============================================
  eliminar(clienteId) {
    Utils.showConfirm('¿Estás seguro de eliminar este cliente?', async () => {
      let backendEliminado = false;

      try {
        await this.requestBackend(`/clientes/${encodeURIComponent(clienteId)}`, {
          method: 'DELETE',
        });
        backendEliminado = true;
      } catch (error) {
        console.warn('Clientes: error al eliminar en backend', error);
        Utils.showToast(
          'No se pudo eliminar el cliente en el servidor. Inténtalo más tarde.',
          'error'
        );
        return;
      }

      Database.deleteItem('clientes', clienteId);
      const vehiculosRestantes = (Database.getCollection('vehiculos') || []).filter(
        (vehiculo) => !this.vehiculoPerteneceACliente(vehiculo, clienteId)
      );
      Database.saveCollection('vehiculos', vehiculosRestantes);
      Utils.showToast('Cliente eliminado', 'success');

      // Actualizar datos sin recargar página completa
      if (window.DataRefreshManager) {
        await DataRefreshManager.update(
          'clientes',
          async () => {
            const clientes = await this.obtenerClientesSincronizados();
            return clientes;
          },
          {
            showLoading: false,
            showToast: false,
          }
        );

        // Actualizar la tabla y estadísticas
        const clientes = await this.obtenerClientesSincronizados();
        document.getElementById('clientesBody').innerHTML = this.renderizarFilasClientes(clientes);
        await this.calcularEstadisticas();

        // Aplicar responsividad
        if (window.Utils && typeof Utils.applyResponsiveTables === 'function') {
          const container = document.querySelector('.page-content');
          if (container) {
            Utils.applyResponsiveTables(container);
          }
        }
      } else {
        // Fallback si no está disponible el gestor
        App.loadModule('clientes');
      }
    });
  },
};
