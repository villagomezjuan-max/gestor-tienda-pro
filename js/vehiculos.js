/* ========================================
   MÓDULO: GESTIÓN DE VEHÍCULOS
   Sistema completo para taller mecánico
   ======================================== */

const Vehiculos = {
  avisoOfflineMostrado: false,
  clientesCache: [],
  vehiculosPorClienteCache: {},
  buildApiUrl(path) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    if (window.Utils && typeof window.Utils.apiUrl === 'function') {
      return window.Utils.apiUrl(normalizedPath);
    }

    if (window.DatabaseAPI && typeof window.DatabaseAPI.getBaseUrl === 'function') {
      const base = (window.DatabaseAPI.getBaseUrl() || '').replace(/\/+$/, '');
      if (base) {
        const finalPath =
          base.endsWith('/api') && normalizedPath.startsWith('/api')
            ? normalizedPath.replace(/^\/api/, '')
            : normalizedPath;
        return `${base}${finalPath}`;
      }
    }

    return normalizedPath;
  },

  /**
   * Renderiza la vista principal de vehículos
   */
  render() {
    return `
            <div class="page-header">
                <h2><i class="fas fa-car"></i> Gestión de Vehículos</h2>
                <div class="header-actions">
                    <button class="btn btn-success" onclick="VehiculosIAAgent.openChat()" 
                            title="Registrar vehículo con ayuda de IA">
                        <i class="fas fa-robot"></i> Asistente IA
                    </button>
                    <button class="btn btn-primary" onclick="Vehiculos.mostrarFormulario()">
                        <i class="fas fa-plus"></i> Registrar Manual
                    </button>
                    <button class="btn btn-secondary" onclick="Vehiculos.mostrarBusqueda()">
                        <i class="fas fa-search"></i> Buscar
                    </button>
                </div>
            </div>

            <div class="filters-section" id="filtros-vehiculos" style="display: none;">
                <div class="filters-grid d-flex flex-column flex-md-row">
                    <div class="filter-group w-100">
                        <select id="filtro-cliente" onchange="Vehiculos.aplicarFiltros()">
                            <option value="">Todos los clientes</option>
                        </select>
                    </div>
                    <div class="filter-group w-100">
                        <label>Marca:</label>
                        <input type="text" id="filtro-marca" placeholder="Marca del vehículo" 
                               onkeyup="Vehiculos.aplicarFiltros()">
                    </div>
                    <div class="filter-group w-100">
                        <label>Placa:</label>
                        <input type="text" id="filtro-placa" placeholder="Placa" 
                               onkeyup="Vehiculos.aplicarFiltros()">
                    </div>
                </div>
            </div>

            <div class="stats-grid d-flex flex-column flex-sm-row flex-wrap justify-content-around">
                <div class="stat-card w-100">
                    <div class="stat-content">
                        <h3 id="total-vehiculos">0</h3>
                        <p>Vehículos Registrados</p>
                    </div>
                </div>
                <div class="stat-card w-100">
                    <i class="fas fa-tools"></i>
                    <div class="stat-content">
                        <h3 id="vehiculos-taller">0</h3>
                        <p>En Taller</p>
                    </div>
                </div>
                <div class="stat-card w-100">
                    <i class="fas fa-calendar-check"></i>
                    <div class="stat-content">
                        <h3 id="mantenimientos-pendientes">0</h3>
                        <p>Mantenimientos Pendientes</p>
                    </div>
                </div>
            </div>

            <div id="lista-vehiculos" class="content-area">
                <p>Cargando vehículos...</p>
            </div>
        `;
  },

  /**
   * Inicializa el módulo
   */
  async init() {
    console.log('🚗 Inicializando módulo de Vehículos...');
    await this.cargarClientes();
    await this.cargarVehiculos();
    this.actualizarEstadisticas();
  },

  /**
   * Carga la lista de clientes para los filtros
   */
  async cargarClientes() {
    const selectCliente = document.getElementById('filtro-cliente');
    if (!selectCliente) return;

    let clientes = [];

    try {
      if (!window.Auth || !window.Auth.authenticatedFetch) {
        throw new Error('Auth module or authenticatedFetch is not available.');
      }
      const endpoint = this.buildApiUrl('/api/clientes');
      const response = await window.Auth.authenticatedFetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      clientes = await response.json();
      if (Array.isArray(clientes)) {
        Database.saveCollection('clientes', clientes);
        this.clientesCache = clientes;
        this.vehiculosPorClienteCache = {};
      }
    } catch (error) {
      console.warn('Fallo al sincronizar clientes, usando caché local:', error);
      this.notificarModoOffline();
      clientes = Database.getCollection('clientes') || [];
      this.clientesCache = clientes;
    }

    selectCliente.innerHTML = '<option value="">Todos los clientes</option>';
    clientes.forEach((cliente) => {
      selectCliente.innerHTML += `
                <option value="${cliente.id}">${cliente.nombre}</option>
            `;
    });
  },

  /**
   * Carga y muestra los vehículos
   */
  async cargarVehiculos() {
    const lista = document.getElementById('lista-vehiculos');
    if (!lista) return;

    lista.innerHTML =
      '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando vehículos...</div>';

    let vehiculos = [];
    let cargaRemotaError = null;

    try {
      if (!window.Auth || !window.Auth.authenticatedFetch) {
        throw new Error('Auth module or authenticatedFetch is not available.');
      }
      const endpoint = this.buildApiUrl('/api/vehiculos');
      const response = await window.Auth.authenticatedFetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      vehiculos = await response.json();
      if (Array.isArray(vehiculos)) {
        Database.saveCollection('vehiculos', vehiculos);
      }
    } catch (error) {
      cargaRemotaError = error;
      console.warn(
        'Vehiculos: no se pudo obtener la lista desde el backend, se usará caché local.',
        error
      );
      this.notificarModoOffline();
      vehiculos = Database.getCollection('vehiculos') || [];
    }

    this.vehiculosCache = Array.isArray(vehiculos) ? vehiculos : [];
    this.vehiculosPorClienteCache = {};

    if (this.vehiculosCache.length === 0) {
      if (cargaRemotaError) {
        lista.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error al cargar vehículos</h3>
                        <p>${cargaRemotaError.message}</p>
                        <button class="btn btn-secondary" onclick="Vehiculos.cargarVehiculos()">
                            <i class="fas fa-sync"></i> Reintentar
                        </button>
                    </div>
                `;
        return;
      }

      lista.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-car"></i>
                    <h3>No hay vehículos registrados</h3>
                    <p>Registra el primer vehículo para comenzar</p>
                    <button class="btn btn-primary" onclick="Vehiculos.mostrarFormulario()">
                        <i class="fas fa-plus"></i> Registrar Vehículo
                    </button>
                </div>
            `;
      return;
    }

    this.renderizarListaVehiculos(this.vehiculosCache);

    if (
      cargaRemotaError &&
      !this.avisoOfflineMostrado &&
      window.Utils &&
      typeof Utils.showToast === 'function'
    ) {
      Utils.showToast('Mostrando vehículos en caché local por un problema de conexión', 'warning');
      this.avisoOfflineMostrado = true;
    }
  },

  async onClienteSeleccionado(clienteId) {
    const contenedor = document.getElementById('vehiculos-asociados');
    if (!contenedor) return;

    if (!clienteId) {
      contenedor.style.display = 'none';
      contenedor.innerHTML = '';
      return;
    }

    contenedor.style.display = 'block';
    contenedor.innerHTML =
      '<div class="loading-mini"><i class="fas fa-spinner fa-spin"></i> Buscando vehículos asociados...</div>';

    let vehiculosCliente = this.vehiculosPorClienteCache[clienteId];

    if (!vehiculosCliente) {
      try {
        const response = Auth.authenticatedFetch(endpoint);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        vehiculosCliente = await response.json();
        this.vehiculosPorClienteCache[clienteId] = vehiculosCliente;
      } catch (error) {
        console.warn(
          'Vehiculos.onClienteSeleccionado: no se pudo obtener vehículos del backend, se usará caché local.',
          error
        );
        const todos = this.vehiculosCache || Database.getCollection('vehiculos') || [];
        vehiculosCliente = todos.filter((v) => v.cliente_id === clienteId);
        this.vehiculosPorClienteCache[clienteId] = vehiculosCliente;
      }
    }

    if (!vehiculosCliente || vehiculosCliente.length === 0) {
      contenedor.innerHTML = `
                <div class="empty-state-mini">
                    <i class="fas fa-info-circle"></i>
                    <p>Este cliente aún no tiene vehículos registrados. Completa el formulario para registrar el primero.</p>
                </div>
            `;
      return;
    }

    const cards = vehiculosCliente
      .map(
        (vehiculo) => `
            <div class="vehiculo-card-resumen" data-vehiculo-id="${vehiculo.id}">
                <div class="vehiculo-card-header">
                    <strong>${vehiculo.marca || ''} ${vehiculo.modelo || ''}</strong>
                    <span class="placa">${vehiculo.placa || 'Sin placa'}</span>
                </div>
                <div class="vehiculo-card-body">
                    <div><span class="label">Año:</span> ${vehiculo.anio || 'No especificado'}</div>
                    <div><span class="label">Color:</span> ${vehiculo.color || 'No registrado'}</div>
                    <div><span class="label">Último servicio:</span> ${vehiculo.fecha_ultimo_servicio ? new Date(vehiculo.fecha_ultimo_servicio).toLocaleDateString() : 'Sin historial'}</div>
                </div>
                <div class="vehiculo-card-actions">
                    <button type="button" class="btn btn-link" onclick="Vehiculos.cargarVehiculoEnFormulario('${vehiculo.id}')">
                        <i class="fas fa-file-import"></i> Usar datos registrados
                    </button>
                    <button type="button" class="btn btn-link" onclick="Vehiculos.verDetalle('${vehiculo.id}')">
                        <i class="fas fa-search"></i> Ver historial
                    </button>
                </div>
            </div>
        `
      )
      .join('');

    contenedor.innerHTML = `
            <div class="vehiculos-asociados-lista">
                <p class="text-muted" style="margin-bottom: 0.5rem;">Vehículos registrados para este cliente:</p>
                ${cards}
            </div>
        `;
  },

  notificarModoOffline() {
    if (this.avisoOfflineMostrado) return;
    if (window.Utils && typeof Utils.showToast === 'function') {
      Utils.showToast(
        'Sin conexión con el servidor. Trabajando con datos guardados en este equipo.',
        'warning'
      );
    }
    this.avisoOfflineMostrado = true;
  },

  /**
   * Renderiza la lista de vehículos
   */
  renderizarListaVehiculos(vehiculos) {
    const lista = document.getElementById('lista-vehiculos');

    lista.innerHTML = `
            <div class="table-responsive">
                <table class="data-table responsive-table">
                    <thead>
                        <tr>
                            <th>Placa</th>
                            <th>Vehículo</th>
                            <th>Cliente</th>
                            <th>Año</th>
                            <th>Kilometraje</th>
                            <th>Último Servicio</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vehiculos.map((vehiculo) => this.renderizarFilaVehiculo(vehiculo)).join('')}
                    </tbody>
                </table>
            </div>
        `;

    if (window.Utils && typeof Utils.applyResponsiveTables === 'function') {
      Utils.applyResponsiveTables(lista.querySelector('table'));
    }
  },

  /**
   * Renderiza una fila de vehículo
   */
  renderizarFilaVehiculo(vehiculo) {
    const ultimoServicio = vehiculo.fecha_ultimo_servicio
      ? new Date(vehiculo.fecha_ultimo_servicio).toLocaleDateString()
      : 'Sin registros';

    const estado = this.obtenerEstadoVehiculo(vehiculo);

    return `
            <tr>
                <td data-label="Placa">
                    <strong>${vehiculo.placa || 'Sin placa'}</strong>
                    ${vehiculo.vin ? `<br><small class="text-muted">VIN: ${vehiculo.vin}</small>` : ''}
                </td>
                <td data-label="Vehículo">
                    <div class="vehiculo-info">
                        <strong>${vehiculo.marca} ${vehiculo.modelo}</strong>
                        ${vehiculo.color ? `<br><span class="badge badge-light">${vehiculo.color}</span>` : ''}
                    </div>
                </td>
                <td data-label="Cliente">
                    <a href="#" onclick="Vehiculos.verCliente('${vehiculo.cliente_id}')" class="link">
                        ${vehiculo.cliente_nombre}
                    </a>
                </td>
                <td data-label="Año">${vehiculo.anio || '-'}</td>
                <td data-label="Kilometraje">
                    <span class="kilometraje">
                        ${vehiculo.kilometraje ? vehiculo.kilometraje.toLocaleString() + ' km' : 'Sin datos'}
                    </span>
                </td>
                <td data-label="Último Servicio">${ultimoServicio}</td>
                <td data-label="Estado">
                    <span class="badge badge-${estado.clase}">${estado.texto}</span>
                </td>
                <td data-label="Acciones">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info" onclick="Vehiculos.verDetalle('${vehiculo.id}')" 
                                title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="Vehiculos.editarVehiculo('${vehiculo.id}')" 
                                title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-success" onclick="OrdenesTrabajo.nuevaOrdenParaVehiculo('${vehiculo.id}')" 
                                title="Nueva orden de trabajo">
                            <i class="fas fa-wrench"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="Vehiculos.crearRecordatorio('${vehiculo.id}')" 
                                title="Crear recordatorio">
                            <i class="fas fa-bell"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="Vehiculos.eliminarVehiculo('${vehiculo.id}')" 
                                title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
  },

  /**
   * Obtiene el estado del vehículo basado en mantenimientos
   */
  obtenerEstadoVehiculo(vehiculo) {
    // Lógica para determinar el estado del vehículo
    const hoy = new Date();
    const ultimoServicio = vehiculo.fecha_ultimo_servicio
      ? new Date(vehiculo.fecha_ultimo_servicio)
      : null;

    if (!ultimoServicio) {
      return { clase: 'warning', texto: 'Sin historial' };
    }

    const diasSinServicio = Math.floor((hoy - ultimoServicio) / (1000 * 60 * 60 * 24));

    if (diasSinServicio > 180) {
      // Más de 6 meses
      return { clase: 'danger', texto: 'Requiere servicio' };
    } else if (diasSinServicio > 90) {
      // Más de 3 meses
      return { clase: 'warning', texto: 'Próximo servicio' };
    } else {
      return { clase: 'success', texto: 'Al día' };
    }
  },

  /**
   * Muestra/oculta la sección de búsqueda
   */
  mostrarBusqueda() {
    const filtros = document.getElementById('filtros-vehiculos');
    if (filtros) {
      filtros.style.display = filtros.style.display === 'none' ? 'block' : 'none';
    }
  },

  /**
   * Aplica los filtros de búsqueda
   */
  aplicarFiltros() {
    if (!this.vehiculosCache) return;

    const filtroCliente = document.getElementById('filtro-cliente')?.value?.toLowerCase();
    const filtroMarca = document.getElementById('filtro-marca')?.value?.toLowerCase();
    const filtroPlaca = document.getElementById('filtro-placa')?.value?.toLowerCase();

    const vehiculosFiltrados = this.vehiculosCache.filter((vehiculo) => {
      const cumpleCliente = !filtroCliente || vehiculo.cliente_id === filtroCliente;
      const cumpleMarca = !filtroMarca || vehiculo.marca?.toLowerCase().includes(filtroMarca);
      const cumplePlaca = !filtroPlaca || vehiculo.placa?.toLowerCase().includes(filtroPlaca);

      return cumpleCliente && cumpleMarca && cumplePlaca;
    });

    this.renderizarListaVehiculos(vehiculosFiltrados);
  },

  /**
   * Muestra el formulario para crear/editar vehículo
   */
  async mostrarFormulario(vehiculoId = null) {
    const titulo = vehiculoId ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo';
    let vehiculo = {};

    if (vehiculoId) {
      try {
        const endpoint = this.buildApiUrl(`/api/vehiculos/${vehiculoId}`);
        const response = await Auth.authenticatedFetch(endpoint);
        vehiculo = await response.json();
      } catch (error) {
        Utils.showToast('Error al cargar datos del vehículo', 'error');
        return;
      }
    }

    // Cargar clientes para el selector
    if (!this.clientesCache || this.clientesCache.length === 0) {
      await this.cargarClientes();
    }
    const clientes = this.clientesCache || [];
    if (clientes.length === 0) {
      if (window.Utils && typeof Utils.showToast === 'function') {
        Utils.showToast('Primero registra un cliente para poder asociar el vehículo.', 'warning');
      }
    }

    const modal = `
            <div class="modal-overlay" id="modal-vehiculo">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3><i class="fas fa-car"></i> ${titulo}</h3>
                        <button class="modal-close" onclick="Utils.closeModal('modal-vehiculo')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <form id="form-vehiculo" onsubmit="Vehiculos.guardarVehiculo(event, '${vehiculoId || ''}')">
                        <div class="modal-body">
                            <div class="form-grid d-flex flex-column">
                                <div class="form-section w-100">
                                    <h4><i class="fas fa-user"></i> Información del Propietario</h4>
                                    <div class="form-group">
                                        <label for="clienteId">Cliente *</label>
                                        <select id="clienteId" name="clienteId" required onchange="Vehiculos.onClienteSeleccionado(this.value)">
                                            <option value="">Seleccionar cliente</option>
                                            ${clientes
                                              .map(
                                                (c) => `
                                                <option value="${c.id}" ${c.id === vehiculo.cliente_id ? 'selected' : ''}>
                                                    ${c.nombre}
                                                </option>
                                            `
                                              )
                                              .join('')}
                                        </select>
                                        <small>¿Cliente nuevo? <a href="#" onclick="Clientes.mostrarFormulario(); Utils.closeModal('modal-vehiculo')">Registrar cliente</a></small>
                                        <div id="vehiculos-asociados" class="vehiculos-asociados" style="margin-top: 0.75rem; display: none;"></div>
                                    </div>
                                </div>

                                <!-- Selector Mejorado de Vehículos -->
                                <div id="vehiculo-selector-contenedor"></div>

                                <div class="form-section w-100">
                                    <h4><i class="fas fa-tachometer-alt"></i> Estado Actual</h4>
                                    <div class="form-row w-100">
                                        <div class="form-group">
                                            <label for="kilometraje">Kilometraje Actual</label>
                                            <input type="number" id="kilometraje" name="kilometraje" 
                                                   value="${vehiculo.kilometraje || ''}" 
                                                   placeholder="0" min="0">
                                        </div>
                                        <div class="form-group">
                                            <label for="fechaUltimoServicio">Último Servicio</label>
                                            <input type="date" id="fechaUltimoServicio" name="fechaUltimoServicio" 
                                                   value="${vehiculo.fecha_ultimo_servicio ? vehiculo.fecha_ultimo_servicio.split('T')[0] : ''}">
                                        </div>
                                    </div>
                                </div>

                                <div class="form-section w-100">
                                    <h4><i class="fas fa-camera"></i> Fotos del Vehículo</h4>
                                    <div class="form-group">
                                        <label for="vehiculo-fotos">Subir fotos (máximo 5)</label>
                                        <input type="file" id="vehiculo-fotos" accept="image/*" multiple 
                                               onchange="Vehiculos.previsualizarFotos(event)" 
                                               style="display: none;">
                                        <button type="button" class="btn btn-secondary btn-block" 
                                                onclick="document.getElementById('vehiculo-fotos').click()">
                                            <i class="fas fa-upload"></i> Seleccionar Fotos
                                        </button>
                                        <small class="text-muted">Formatos: JPG, PNG, WebP. Máximo 5MB por foto.</small>
                                    </div>
                                    <div id="preview-fotos-container" class="fotos-preview-grid">
                                        ${
                                          vehiculo.fotos
                                            ? vehiculo.fotos
                                                .map(
                                                  (foto, index) => `
                                            <div class="foto-preview-item" data-foto-id="${foto.id || index}">
                                                <img src="${foto.url}" alt="Foto ${index + 1}">
                                                <button type="button" class="btn-eliminar-foto" 
                                                        onclick="Vehiculos.eliminarFoto('${vehiculoId}', '${foto.id}', this)">
                                                    <i class="fas fa-times"></i>
                                                </button>
                                            </div>
                                        `
                                                )
                                                .join('')
                                            : ''
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="Utils.closeModal('modal-vehiculo')">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> ${vehiculoId ? 'Actualizar' : 'Registrar'} Vehículo
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', modal);

    // Renderizar el selector mejorado de vehículos
    if (window.VehiculoSelectorMejorado) {
      VehiculoSelectorMejorado.renderSelector('vehiculo-selector-contenedor', {
        marcaActual: vehiculo.marca || '',
        modeloActual: vehiculo.modelo || '',
        anioActual: vehiculo.anio || '',
        colorActual: vehiculo.color || '',
        placaActual: vehiculo.placa || '',
        vinActual: vehiculo.vin || '',
        notasActual: vehiculo.notas || '',
      });
    } else {
      console.warn('VehiculoSelectorMejorado no está disponible');
      document.getElementById('vehiculo-selector-contenedor').innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    El selector mejorado de vehículos no está disponible. Recarga la página.
                </div>
            `;
    }

    if (vehiculo?.cliente_id) {
      this.onClienteSeleccionado(vehiculo.cliente_id);
    }
  },

  /**
   * Configura autocompletar para marcas comunes
   */
  configurarAutocompletarMarcas() {
    const marcasComunes = [
      'Toyota',
      'Chevrolet',
      'Ford',
      'Volkswagen',
      'Nissan',
      'Hyundai',
      'Kia',
      'Honda',
      'Mazda',
      'Suzuki',
      'Mitsubishi',
      'Peugeot',
      'Renault',
      'Fiat',
      'BMW',
      'Mercedes-Benz',
      'Audi',
    ];

    const inputMarca = document.getElementById('marca');
    if (inputMarca) {
      inputMarca.addEventListener('input', (e) => {
        const valor = e.target.value.toLowerCase();
        // Implementar lógica de autocompletar aquí si es necesario
      });
    }
  },

  async cargarVehiculoEnFormulario(vehiculoId) {
    const form = document.getElementById('form-vehiculo');
    if (!form) {
      Utils.showToast('No se encontró el formulario de vehículo.', 'warning');
      return;
    }

    let vehiculo = null;
    const cacheList = this.vehiculosCache || [];
    vehiculo = cacheList.find((v) => v.id === vehiculoId) || null;

    if (!vehiculo) {
      Object.values(this.vehiculosPorClienteCache || {}).some((lista) => {
        const encontrado = lista.find((item) => item.id === vehiculoId);
        if (encontrado) {
          vehiculo = encontrado;
          return true;
        }
        return false;
      });
    }

    if (!vehiculo) {
      try {
        const endpoint = this.buildApiUrl(`/api/vehiculos/${vehiculoId}`);
        const response = await Auth.authenticatedFetch(endpoint);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        vehiculo = await response.json();
        if (vehiculo?.cliente_id) {
          this.vehiculosPorClienteCache[vehiculo.cliente_id] = [vehiculo];
        }
      } catch (error) {
        console.error('No se pudo recuperar la información del vehículo seleccionado.', error);
        Utils.showToast('No fue posible cargar los datos del vehículo seleccionado.', 'error');
        return;
      }
    }

    const asignarValor = (id, valor) => {
      const input = document.getElementById(id);
      if (!input) return;
      if (valor === null || valor === undefined) {
        input.value = '';
      } else {
        input.value = valor;
      }
    };

    asignarValor('clienteId', vehiculo.cliente_id || '');
    asignarValor('marca', vehiculo.marca || '');
    asignarValor('modelo', vehiculo.modelo || '');
    asignarValor('anio', vehiculo.anio || '');
    asignarValor('color', vehiculo.color || '');
    asignarValor('placa', vehiculo.placa || '');
    asignarValor('vin', vehiculo.vin || '');
    asignarValor('kilometraje', vehiculo.kilometraje ?? '');
    asignarValor(
      'fechaUltimoServicio',
      vehiculo.fecha_ultimo_servicio ? vehiculo.fecha_ultimo_servicio.split('T')[0] : ''
    );
    asignarValor('notas', vehiculo.notas || '');

    Utils.showToast(
      'Datos del vehículo cargados. Completa o actualiza la información antes de guardar.',
      'info'
    );
  },

  /**
   * Previsualizar fotos antes de subir
   */
  previsualizarFotos(event) {
    const files = Array.from(event.target.files);
    const container = document.getElementById('preview-fotos-container');

    if (files.length > 5) {
      Utils.showToast('Máximo 5 fotos permitidas', 'warning');
      event.target.value = '';
      return;
    }

    files.forEach((file, index) => {
      if (file.size > 5 * 1024 * 1024) {
        Utils.showToast(`La foto ${file.name} excede los 5MB`, 'warning');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'foto-preview-item';
        previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Preview ${index + 1}">
                    <button type="button" class="btn-eliminar-foto" 
                            onclick="this.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="foto-preview-overlay">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                `;
        container.appendChild(previewItem);
      };
      reader.readAsDataURL(file);
    });
  },

  /**
   * Eliminar foto del vehículo
   */
  async eliminarFoto(vehiculoId, fotoId, boton) {
    const confirmacion = await Utils.confirm(
      '¿Eliminar foto?',
      'Esta acción no se puede deshacer.',
      'Eliminar'
    );

    if (!confirmacion) return;

    try {
      const response = await Auth.authenticatedFetch(endpoint, {
        method: 'DELETE',
      });

      if (response.ok) {
        boton.closest('.foto-preview-item').remove();
        Utils.showToast('Foto eliminada exitosamente', 'success');
      } else {
        throw new Error('Error al eliminar la foto');
      }
    } catch (error) {
      console.error('Error eliminando foto:', error);
      Utils.showToast('Error al eliminar la foto', 'error');
    }
  },

  /**
   * Abrir foto en grande (lightbox)
   */
  abrirFotoGrande(url, index) {
    const modal = `
            <div class="modal-overlay" id="modal-foto-grande" style="z-index: 10001;">
                <div class="lightbox-container">
                    <button class="lightbox-close" onclick="Utils.closeModal('modal-foto-grande')">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="lightbox-content">
                        <img src="${url}" alt="Foto del vehículo">
                    </div>
                    <div class="lightbox-info">
                        <span>Foto ${index + 1}</span>
                    </div>
                </div>
            </div>
        `;
    document.body.insertAdjacentHTML('beforeend', modal);
  },

  /**
   * Mostrar modal para agregar fotos
   */
  async mostrarModalAgregarFotos(vehiculoId) {
    const modal = `
            <div class="modal-overlay" id="modal-agregar-fotos" style="z-index: 10001;">
                <div class="modal-container">
                    <div class="modal-header">
                        <h3><i class="fas fa-upload"></i> Agregar Fotos al Vehículo</h3>
                        <button class="modal-close" onclick="Utils.closeModal('modal-agregar-fotos')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="fotos-upload">Selecciona las fotos (máximo 5)</label>
                            <input type="file" id="fotos-upload" accept="image/*" multiple 
                                   style="display: none;" onchange="Vehiculos.previsualizarFotosNuevas(event)">
                            <button class="btn btn-secondary btn-block" onclick="document.getElementById('fotos-upload').click()">
                                <i class="fas fa-folder-open"></i> Seleccionar Fotos desde el Ordenador
                            </button>
                            <small class="text-muted" style="display: block; margin-top: 0.5rem;">
                                Formatos: JPG, PNG, WebP. Máximo 5MB por foto.
                            </small>
                        </div>
                        
                        <div id="preview-fotos-nuevas" class="fotos-preview-grid" style="margin-top: 1.5rem;">
                            <!-- Previsualizaciones aparecerán aquí -->
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="Utils.closeModal('modal-agregar-fotos')">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button class="btn btn-primary" onclick="Vehiculos.subirFotosNuevas('${vehiculoId}')" id="btn-subir-fotos" disabled>
                            <i class="fas fa-cloud-upload-alt"></i> Subir Fotos
                        </button>
                    </div>
                </div>
            </div>
        `;
    document.body.insertAdjacentHTML('beforeend', modal);
  },

  /**
   * Previsualizar fotos nuevas
   */
  previsualizarFotosNuevas(event) {
    const files = Array.from(event.target.files);
    const container = document.getElementById('preview-fotos-nuevas');
    const btnSubir = document.getElementById('btn-subir-fotos');

    container.innerHTML = ''; // Limpiar previsualizaciones anteriores

    if (files.length > 5) {
      Utils.showToast('Máximo 5 fotos permitidas', 'warning');
      event.target.value = '';
      btnSubir.disabled = true;
      return;
    }

    if (files.length === 0) {
      btnSubir.disabled = true;
      return;
    }

    btnSubir.disabled = false;

    files.forEach((file, index) => {
      if (file.size > 5 * 1024 * 1024) {
        Utils.showToast(`La foto ${file.name} excede los 5MB`, 'warning');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'foto-preview-item';
        previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Preview ${index + 1}">
                    <div class="foto-preview-name">${file.name}</div>
                `;
        container.appendChild(previewItem);
      };
      reader.readAsDataURL(file);
    });
  },

  /**
   * Subir fotos nuevas
   */
  async subirFotasNuevas(vehiculoId) {
    const input = document.getElementById('fotos-upload');
    const files = input.files;

    if (files.length === 0) {
      Utils.showToast('Selecciona al menos una foto', 'warning');
      return;
    }

    const btnSubir = document.getElementById('btn-subir-fotos');
    btnSubir.disabled = true;
    btnSubir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';

    try {
      await this.subirFotosVehiculo(vehiculoId, Array.from(files));
      Utils.closeModal('modal-agregar-fotos');
      Utils.closeModal('modal-detalle-vehiculo');
      Utils.showToast('Fotos subidas exitosamente', 'success');

      // Reabrir el modal de detalle para ver las fotos
      setTimeout(() => {
        this.verDetalle(vehiculoId);
      }, 500);
    } catch (error) {
      console.error('Error subiendo fotos:', error);
      Utils.showToast('Error al subir fotos', 'error');
      btnSubir.disabled = false;
      btnSubir.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Subir Fotos';
    }
  },

  /**
   * Guarda el vehículo (crear o actualizar)
   */
  async guardarVehiculo(event, vehiculoId) {
    event.preventDefault();

    // Obtener datos del selector mejorado
    let vehiculoData = {};

    if (window.VehiculoSelectorMejorado) {
      const validacion = VehiculoSelectorMejorado.validarDatos();

      if (!validacion.valido) {
        if (window.Utils && Utils.showToast) {
          validacion.errores.forEach((error) => {
            Utils.showToast(error, 'error');
          });
        }
        return;
      }

      vehiculoData = validacion.datos;
    } else {
      // Fallback al método antiguo
      const formData = new FormData(event.target);
      vehiculoData = Object.fromEntries(formData.entries());
    }

    // Obtener cliente y otros datos del formulario
    const clienteId = document.getElementById('clienteId')?.value;
    const kilometraje = document.getElementById('kilometraje')?.value;
    const fechaUltimoServicio = document.getElementById('fechaUltimoServicio')?.value;

    if (!clienteId) {
      Utils.showToast('Selecciona un cliente antes de registrar el vehículo.', 'warning');
      return;
    }

    // Convertir campos numéricos
    if (vehiculoData.anio) vehiculoData.anio = parseInt(vehiculoData.anio);
    if (kilometraje) vehiculoData.kilometraje = parseFloat(kilometraje);

    // Manejar fotos
    const fotosInput = document.getElementById('vehiculo-fotos');
    const fotos = fotosInput ? Array.from(fotosInput.files) : [];

    const payload = {
      clienteId: clienteId,
      marca: vehiculoData.marca,
      modelo: vehiculoData.modelo,
      anio: vehiculoData.anio,
      color: vehiculoData.color,
      placa: vehiculoData.placa,
      vin: vehiculoData.vin || undefined,
      kilometraje: vehiculoData.kilometraje || parseFloat(kilometraje) || 0,
      fechaUltimoServicio: fechaUltimoServicio || vehiculoData.fechaUltimoServicio,
      notas: vehiculoData.notas,
      compraTerceros: vehiculoData.compraTerceros,
    };

    try {
      const url = vehiculoId ? `/api/vehiculos/${vehiculoId}` : '/api/vehiculos';
      const method = vehiculoId ? 'PUT' : 'POST';

      const response = await Auth.authenticatedFetch(this.buildApiUrl(url), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        const savedVehicleId = result.vehiculo?.id || vehiculoId;

        // Subir fotos si hay alguna
        if (fotos.length > 0 && savedVehicleId) {
          await this.subirFotosVehiculo(savedVehicleId, fotos);
        }

        if (clienteId) {
          delete this.vehiculosPorClienteCache[clienteId];
        }

        Utils.showToast(
          vehiculoId ? 'Vehículo actualizado exitosamente' : 'Vehículo registrado exitosamente',
          'success'
        );
        Utils.closeModal('modal-vehiculo');

        // Actualizar sin recargar página
        if (window.DataRefreshManager) {
          await this.cargarVehiculos();
          this.actualizarEstadisticas();
        } else {
          this.cargarVehiculos();
          this.actualizarEstadisticas();
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error guardando vehículo:', error);
      Utils.showToast('Error al guardar vehículo: ' + error.message, 'error');
    }
  },

  /**
   * Subir fotos del vehículo
   */
  async subirFotosVehiculo(vehiculoId, fotos) {
    const formData = new FormData();

    fotos.forEach((foto, index) => {
      formData.append('fotos', foto);
    });

    try {
      const endpoint = this.buildApiUrl(`/api/vehiculos/${vehiculoId}/fotos`);
      const response = await Auth.authenticatedFetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Error al subir fotos');
      }

      Utils.showToast(`${fotos.length} foto(s) subida(s) exitosamente`, 'success');
    } catch (error) {
      console.error('Error subiendo fotos:', error);
      Utils.showToast('Error al subir fotos: ' + error.message, 'warning');
    }
  },

  async crearVehiculoAutomatizado(vehiculoData, opciones = {}) {
    const { mostrarNotificacion = true } = opciones;
    const payload = { ...vehiculoData };

    if (payload.anio) payload.anio = parseInt(payload.anio, 10);
    if (payload.kilometraje) payload.kilometraje = parseFloat(payload.kilometraje);
    if (payload.placa) payload.placa = payload.placa.toUpperCase();
    if (payload.clienteId && !payload.cliente_id) payload.cliente_id = payload.clienteId;

    try {
      const endpoint = this.buildApiUrl('/api/vehiculos');
      const response = await Auth.authenticatedFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const mensaje = result.message || 'No se pudo crear el vehículo';
        throw new Error(mensaje);
      }

      await this.cargarVehiculos();
      await this.actualizarEstadisticas();

      if (mostrarNotificacion && window.Utils && typeof Utils.showToast === 'function') {
        Utils.showToast('Vehículo registrado automáticamente', 'success');
      }

      return { ...result, localOnly: false };
    } catch (error) {
      console.warn(
        'Vehiculos.crearVehiculoAutomatizado: no se pudo sincronizar con el backend, usando almacenamiento local.',
        error
      );

      const vehiculoLocal = this.prepararVehiculoOffline(payload);
      this.guardarVehiculoOffline(vehiculoLocal);

      if (mostrarNotificacion && window.Utils && typeof Utils.showToast === 'function') {
        Utils.showToast(
          'Vehículo guardado localmente. Se sincronizará al recuperar conexión.',
          'warning'
        );
      }

      return { success: true, vehiculo: vehiculoLocal, localOnly: true };
    }
  },

  prepararVehiculoOffline(payload) {
    const ahora = new Date().toISOString();
    const id = `veh_${Utils.generateId()}`;

    return {
      id,
      cliente_id: payload.clienteId,
      cliente_nombre: payload.clienteNombre || 'Cliente sin nombre',
      marca: payload.marca || '',
      modelo: payload.modelo || '',
      anio: payload.anio || null,
      color: payload.color || '',
      placa: payload.placa || '',
      vin: payload.vin || '',
      kilometraje: payload.kilometraje || 0,
      fecha_ultimo_servicio: payload.fechaUltimoServicio || null,
      notas: payload.notas || '',
      sincronizado_backend: false,
      origen: 'ia-offline',
      created_at: ahora,
      updated_at: ahora,
    };
  },

  guardarVehiculoOffline(vehiculo) {
    const existentes = Database.getCollection('vehiculos') || [];
    const yaExiste = existentes.find((item) => item.id === vehiculo.id);

    if (yaExiste) {
      Database.update('vehiculos', vehiculo.id, vehiculo);
    } else {
      Database.add('vehiculos', vehiculo);
    }

    this.vehiculosCache = Database.getCollection('vehiculos') || [];
    if (document.getElementById('lista-vehiculos')) {
      this.renderizarListaVehiculos(this.vehiculosCache);
    }
  },

  /**
   * Ver detalles completos de un vehículo
   */
  async verDetalle(vehiculoId) {
    try {
      const endpointVehiculo = this.buildApiUrl(`/api/vehiculos/${vehiculoId}`);
      const response = await Auth.authenticatedFetch(endpointVehiculo);
      const vehiculo = await response.json();
      if (vehiculo?.cliente_id) {
        this.vehiculosPorClienteCache[vehiculo.cliente_id] = [vehiculo];
      }

      // También cargar órdenes de trabajo del vehículo
      const endpointOrdenes = this.buildApiUrl(`/api/ordenes-trabajo?vehiculo_id=${vehiculoId}`);
      const responseOrdenes = await Auth.authenticatedFetch(endpointOrdenes);
      const ordenes = await responseOrdenes.json();

      const modal = `
                <div class="modal-overlay" id="modal-detalle-vehiculo">
                    <div class="modal-content extra-large">
                        <div class="modal-header">
                            <h3><i class="fas fa-car"></i> ${vehiculo.marca} ${vehiculo.modelo} - ${vehiculo.placa}</h3>
                            <button class="modal-close" onclick="Utils.closeModal('modal-detalle-vehiculo')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="modal-body">
                            <div class="detail-grid d-flex flex-column">
                                <div class="detail-section w-100">
                                    <div class="section-header-with-action">
                                        <h4><i class="fas fa-camera"></i> Fotos del Vehículo</h4>
                                        <button class="btn btn-sm btn-primary" onclick="Vehiculos.mostrarModalAgregarFotos('${vehiculoId}')">
                                            <i class="fas fa-plus"></i> Agregar Fotos
                                        </button>
                                    </div>
                                    <div class="vehiculo-galeria">
                                        ${
                                          vehiculo.fotos && vehiculo.fotos.length > 0
                                            ? `
                                            <div class="fotos-galeria-grid">
                                                ${vehiculo.fotos
                                                  .map(
                                                    (foto, index) => `
                                                    <div class="foto-galeria-item" onclick="Vehiculos.abrirFotoGrande('${foto.url}', ${index})">
                                                        <img src="${foto.url}" alt="Foto ${index + 1}">
                                                        <div class="foto-overlay">
                                                            <i class="fas fa-search-plus"></i>
                                                        </div>
                                                        <button class="btn-eliminar-foto-galeria" 
                                                                onclick="event.stopPropagation(); Vehiculos.eliminarFoto('${vehiculoId}', '${foto.id}', this)">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                `
                                                  )
                                                  .join('')}
                                            </div>
                                        `
                                            : `
                                            <div class="empty-state-mini">
                                                <i class="fas fa-camera"></i>
                                                <p>No hay fotos del vehículo</p>
                                                <button class="btn btn-primary" onclick="Vehiculos.mostrarModalAgregarFotos('${vehiculoId}')">
                                                    <i class="fas fa-upload"></i> Subir Primera Foto
                                                </button>
                                            </div>
                                        `
                                        }
                                    </div>
                                </div>

                                <div class="detail-section w-100">
                                    <h4><i class="fas fa-info-circle"></i> Información General</h4>
                                    <div class="info-grid w-100">
                                        <div class="info-item">
                                            <label>Propietario:</label>
                                            <span>${vehiculo.cliente_nombre}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Marca:</label>
                                            <span>${vehiculo.marca}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Modelo:</label>
                                            <span>${vehiculo.modelo}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Año:</label>
                                            <span>${vehiculo.anio || 'No especificado'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Color:</label>
                                            <span>${vehiculo.color || 'No especificado'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Placa:</label>
                                            <span>${vehiculo.placa}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>VIN/Chasis:</label>
                                            <span>${vehiculo.vin || 'No registrado'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Kilometraje:</label>
                                            <span>${vehiculo.kilometraje ? vehiculo.kilometraje.toLocaleString() + ' km' : 'Sin datos'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Último servicio:</label>
                                            <span>${vehiculo.fecha_ultimo_servicio ? new Date(vehiculo.fecha_ultimo_servicio).toLocaleDateString() : 'Sin registros'}</span>
                                        </div>
                                    </div>
                                    ${
                                      vehiculo.notas
                                        ? `
                                        <div class="info-item full-width">
                                            <label>Observaciones:</label>
                                            <p>${vehiculo.notas}</p>
                                        </div>
                                    `
                                        : ''
                                    }
                                </div>
                                
                                <div class="detail-section w-100">
                                    <h4><i class="fas fa-history"></i> Historial de Servicios (${ordenes.length})</h4>
                                    ${
                                      ordenes.length > 0
                                        ? `
                                        <div class="table-responsive">
                                            <table class="mini-table">
                                                <thead>
                                                    <tr>
                                                        <th>Fecha</th>
                                                        <th>Orden #</th>
                                                        <th>Problema</th>
                                                        <th>Estado</th>
                                                        <th>Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${ordenes
                                                      .map(
                                                        (orden) => `
                                                        <tr>
                                                            <td>${new Date(orden.fecha_recepcion).toLocaleDateString()}</td>
                                                            <td>#${orden.numero}</td>
                                                            <td>${orden.problema_reportado}</td>
                                                            <td><span class="badge badge-${this.obtenerClaseEstado(orden.estado)}">${orden.estado}</span></td>
                                                            <td>$${orden.total || 0}</td>
                                                        </tr>
                                                    `
                                                      )
                                                      .join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    `
                                        : '<p class="text-muted">No hay servicios registrados</p>'
                                    }
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-footer">
                            <button class="btn btn-success" onclick="OrdenesTrabajo.nuevaOrdenParaVehiculo('${vehiculoId}'); Utils.closeModal('modal-detalle-vehiculo')">
                                <i class="fas fa-wrench"></i> Nueva Orden de Trabajo
                            </button>
                            <button class="btn btn-primary" onclick="Vehiculos.editarVehiculo('${vehiculoId}'); Utils.closeModal('modal-detalle-vehiculo')">
                                <i class="fas fa-edit"></i> Editar Vehículo
                            </button>
                            <button class="btn btn-secondary" onclick="Utils.closeModal('modal-detalle-vehiculo')">
                                <i class="fas fa-times"></i> Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            `;

      document.body.insertAdjacentHTML('beforeend', modal);
    } catch (error) {
      console.error('Error cargando detalle del vehículo:', error);
      Utils.showToast('Error al cargar información del vehículo', 'error');
    }
  },

  /**
   * Obtiene la clase CSS para el estado de una orden
   */
  obtenerClaseEstado(estado) {
    const clases = {
      recibido: 'info',
      en_proceso: 'warning',
      espera_repuestos: 'secondary',
      finalizado: 'success',
      entregado: 'success',
      cancelado: 'danger',
    };
    return clases[estado] || 'secondary';
  },

  /**
   * Editar vehículo
   */
  editarVehiculo(vehiculoId) {
    this.mostrarFormulario(vehiculoId);
  },

  /**
   * Eliminar vehículo con confirmación
   */
  async eliminarVehiculo(vehiculoId) {
    const confirmacion = await Utils.confirm(
      '¿Eliminar Vehículo?',
      'Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar este vehículo?',
      'Eliminar'
    );

    if (!confirmacion) return;

    try {
      const endpoint = this.buildApiUrl(`/api/vehiculos/${vehiculoId}`);
      const response = await Auth.authenticatedFetch(endpoint, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        Utils.showToast('Vehículo eliminado exitosamente', 'success');

        // Actualizar sin recargar página
        if (window.DataRefreshManager) {
          await this.cargarVehiculos();
          this.actualizarEstadisticas();
        } else {
          this.cargarVehiculos();
          this.actualizarEstadisticas();
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error eliminando vehículo:', error);
      Utils.showToast('Error al eliminar vehículo: ' + error.message, 'error');
    }
  },

  /**
   * Crear recordatorio para un vehículo
   */
  async crearRecordatorio(vehiculoId) {
    // Implementar modal para crear recordatorio específico del vehículo
    Utils.showToast('Función de recordatorios en desarrollo', 'info');
  },

  /**
   * Ver información del cliente propietario
   */
  verCliente(clienteId) {
    // Cambiar al módulo de clientes y mostrar el cliente específico
    App.loadModule('clientes').then(() => {
      if (window.Clientes && window.Clientes.verDetalle) {
        Clientes.verDetalle(clienteId);
      }
    });
  },

  /**
   * Actualiza las estadísticas del dashboard
   */
  async actualizarEstadisticas() {
    try {
      // Actualizar total de vehículos
      const totalElement = document.getElementById('total-vehiculos');
      if (totalElement && this.vehiculosCache) {
        totalElement.textContent = this.vehiculosCache.length;
      }

      // Obtener vehículos en taller (con órdenes activas)
      const ordenes = (await Database.getCollection('ordenes_trabajo')) || [];
      const ordenesActivas = ordenes.filter((o) =>
        ['recibido', 'en_proceso', 'espera_repuestos'].includes(o.estado)
      );

      const vehiculosEnTaller = document.getElementById('vehiculos-taller');
      if (vehiculosEnTaller) {
        vehiculosEnTaller.textContent = ordenesActivas.length;
      }

      // Calcular mantenimientos pendientes (simplificado)
      const mantenimientosPendientes = document.getElementById('mantenimientos-pendientes');
      if (mantenimientosPendientes && this.vehiculosCache) {
        const pendientes = this.vehiculosCache.filter((v) => {
          const estado = this.obtenerEstadoVehiculo(v);
          return estado.clase === 'danger' || estado.clase === 'warning';
        }).length;
        mantenimientosPendientes.textContent = pendientes;
      }
    } catch (error) {
      console.error('Error actualizando estadísticas:', error);
    }
  },
};

// Exponer globalmente
window.Vehiculos = Vehiculos;
