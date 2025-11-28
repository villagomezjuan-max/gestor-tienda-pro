/* ========================================
   SELECTOR DE VEHÍCULOS MEJORADO
   Con autocompletado y búsqueda inteligente
   ======================================== */

const VehiculoSelectorMejorado = {
  marcaSeleccionada: null,
  modeloSeleccionado: null,
  customMarcaEnabled: false,
  customModeloEnabled: false,

  /**
   * Renderiza el selector completo de vehículos
   */
  renderSelector(contenedorId, opciones = {}) {
    const {
      marcaActual = '',
      modeloActual = '',
      anioActual = '',
      colorActual = '',
      placaActual = '',
      vinActual = '',
      notasActual = '',
      onMarcaChange = null,
      onModeloChange = null,
    } = opciones;

    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = `
            <div class="vehiculo-selector-mejorado">
                <!-- Información del Vehículo -->
                <div class="form-section">
                    <h4><i class="fas fa-car"></i> Información del Vehículo</h4>
                    
                    <!-- Marca con autocompletado -->
                    <div class="form-group">
                        <label for="vehiculo-marca-input">
                            Marca del Vehículo *
                            <span class="badge badge-info" style="margin-left: 8px; font-size: 0.75rem;">
                                ${Object.keys(CatalogoVehiculosEcuador.catalogo).length} marcas disponibles
                            </span>
                        </label>
                        <div class="autocomplete-container">
                            <input type="text" 
                                   id="vehiculo-marca-input" 
                                   class="form-control autocomplete-input"
                                   placeholder="Escribe para buscar (ej: Toyota, Chevrolet...)" 
                                   value="${marcaActual}"
                                   autocomplete="off"
                                   required>
                            <div class="autocomplete-dropdown" id="marca-dropdown"></div>
                            <small class="form-text text-muted">
                                Empieza a escribir para ver sugerencias. Si no encuentras tu marca, escríbela y presiona Enter.
                            </small>
                        </div>
                        <div class="custom-option-container" id="custom-marca-container" style="display: none;">
                            <div class="alert alert-warning" style="margin-top: 8px; padding: 8px 12px; font-size: 0.875rem;">
                                <i class="fas fa-info-circle"></i> 
                                Marca no encontrada en el catálogo. Se agregará como personalizada.
                            </div>
                        </div>
                    </div>

                    <!-- Modelo con autocompletado -->
                    <div class="form-group">
                        <label for="vehiculo-modelo-input">
                            Modelo del Vehículo *
                            <span class="badge badge-secondary" style="margin-left: 8px; font-size: 0.75rem;" id="modelos-count">
                                Selecciona una marca primero
                            </span>
                        </label>
                        <div class="autocomplete-container">
                            <input type="text" 
                                   id="vehiculo-modelo-input" 
                                   class="form-control autocomplete-input"
                                   placeholder="Primero selecciona una marca" 
                                   value="${modeloActual}"
                                   autocomplete="off"
                                   required
                                   disabled>
                            <div class="autocomplete-dropdown" id="modelo-dropdown"></div>
                            <small class="form-text text-muted">
                                Los modelos se filtran según la marca seleccionada. Si no encuentras el modelo, escríbelo y presiona Enter.
                            </small>
                        </div>
                        <div class="custom-option-container" id="custom-modelo-container" style="display: none;">
                            <div class="alert alert-warning" style="margin-top: 8px; padding: 8px 12px; font-size: 0.875rem;">
                                <i class="fas fa-info-circle"></i> 
                                Modelo no encontrado en el catálogo. Se agregará como personalizado.
                            </div>
                        </div>
                    </div>

                    <!-- Fila: Año y Color -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="vehiculo-anio">Año del Vehículo</label>
                            <select id="vehiculo-anio" class="form-control">
                                <option value="">Seleccionar año</option>
                                ${this.generarOpcionesAnio(anioActual)}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="vehiculo-color">Color</label>
                            <div class="input-with-suggestions">
                                <input type="text" 
                                       id="vehiculo-color" 
                                       class="form-control"
                                       placeholder="Ej: Blanco, Negro, Gris..."
                                       value="${colorActual}"
                                       list="colores-comunes">
                                <datalist id="colores-comunes">
                                    <option value="Blanco">
                                    <option value="Negro">
                                    <option value="Gris">
                                    <option value="Plata">
                                    <option value="Rojo">
                                    <option value="Azul">
                                    <option value="Verde">
                                    <option value="Amarillo">
                                    <option value="Café">
                                    <option value="Dorado">
                                    <option value="Beige">
                                    <option value="Naranja">
                                    <option value="Morado">
                                </datalist>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Identificación -->
                <div class="form-section">
                    <h4><i class="fas fa-id-card"></i> Identificación del Vehículo</h4>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="vehiculo-placa">Placa *</label>
                            <input type="text" 
                                   id="vehiculo-placa" 
                                   class="form-control"
                                   placeholder="ABC-1234"
                                   value="${placaActual}"
                                   pattern="[A-Z]{3}-[0-9]{3,4}"
                                   style="text-transform: uppercase;"
                                   required>
                            <small class="form-text text-muted">Formato: XXX-#### (ejemplo: ABC-1234)</small>
                        </div>
                        <div class="form-group">
                            <label for="vehiculo-vin">
                                VIN/Número de Chasis
                                <span class="badge badge-light" style="margin-left: 4px; font-size: 0.7rem;">Opcional</span>
                            </label>
                            <input type="text" 
                                   id="vehiculo-vin" 
                                   class="form-control"
                                   placeholder="17 caracteres"
                                   value="${vinActual}"
                                   maxlength="17"
                                   style="text-transform: uppercase;">
                            <small class="form-text text-muted">El VIN es un código único de 17 caracteres</small>
                        </div>
                    </div>
                </div>

                <!-- Notas adicionales -->
                <div class="form-section">
                    <h4><i class="fas fa-sticky-note"></i> Notas del Vehículo</h4>
                    <div class="form-group">
                        <label for="vehiculo-notas">Observaciones adicionales</label>
                        <textarea id="vehiculo-notas" 
                                  class="form-control" 
                                  rows="3"
                                  placeholder="Información adicional sobre el vehículo (modificaciones, características especiales, etc.)">${notasActual}</textarea>
                    </div>
                </div>

                <!-- Indicador de compra para terceros -->
                <div class="form-section">
                    <div class="form-check" style="padding: 12px; background: var(--background-secondary); border-radius: 8px;">
                        <input type="checkbox" 
                               id="vehiculo-compra-terceros" 
                               class="form-check-input">
                        <label for="vehiculo-compra-terceros" class="form-check-label">
                            <strong>Compra para terceros (permitir registro provisional)</strong>
                            <br>
                            <small class="text-muted">
                                Marca esta opción si el cliente está comprando para otra persona y no tiene todos los datos del vehículo.
                            </small>
                        </label>
                    </div>
                </div>
            </div>
        `;

    // Inicializar funcionalidad
    this.inicializarAutocompletado(onMarcaChange, onModeloChange);
    this.inicializarValidaciones();

    // Si hay marca actual, cargar modelos
    if (marcaActual) {
      this.marcaSeleccionada = marcaActual;
      this.habilitarSelectorModelo();
    }
  },

  /**
   * Genera opciones para el selector de año (últimos 30 años + próximo año)
   */
  generarOpcionesAnio(anioSeleccionado = '') {
    const anioActual = new Date().getFullYear();
    const anioInicio = anioActual - 30; // 30 años atrás
    const anioFin = anioActual + 1; // Incluir próximo año para modelos nuevos

    let opciones = '';
    for (let anio = anioFin; anio >= anioInicio; anio--) {
      const selected = anio == anioSeleccionado ? 'selected' : '';
      opciones += `<option value="${anio}" ${selected}>${anio}</option>`;
    }

    return opciones;
  },

  /**
   * Inicializa el sistema de autocompletado
   */
  inicializarAutocompletado(onMarcaChange, onModeloChange) {
    const marcaInput = document.getElementById('vehiculo-marca-input');
    const marcaDropdown = document.getElementById('marca-dropdown');
    const modeloInput = document.getElementById('vehiculo-modelo-input');
    const modeloDropdown = document.getElementById('modelo-dropdown');

    if (!marcaInput || !modeloInput) return;

    // Autocompletado de marca
    marcaInput.addEventListener('input', (e) => {
      const texto = e.target.value.trim();

      if (texto.length === 0) {
        marcaDropdown.style.display = 'none';
        marcaDropdown.innerHTML = '';
        this.marcaSeleccionada = null;
        this.deshabilitarSelectorModelo();
        return;
      }

      const marcas = CatalogoVehiculosEcuador.buscarMarcas(texto);

      if (marcas.length > 0) {
        this.mostrarSugerenciasMarca(marcas, marcaDropdown, marcaInput);
        document.getElementById('custom-marca-container').style.display = 'none';
      } else {
        marcaDropdown.style.display = 'none';
        document.getElementById('custom-marca-container').style.display = 'block';
      }
    });

    // Selección de marca
    marcaInput.addEventListener('blur', (e) => {
      setTimeout(() => {
        const texto = e.target.value.trim();

        if (texto && !CatalogoVehiculosEcuador.validarMarca(texto)) {
          // Marca personalizada
          CatalogoVehiculosEcuador.agregarMarcaPersonalizada(texto);
          this.marcaSeleccionada = texto;
          this.habilitarSelectorModelo();
          if (window.Utils && Utils.showToast) {
            Utils.showToast(`Marca "${texto}" agregada al catálogo`, 'info');
          }
        } else if (texto) {
          this.marcaSeleccionada = texto;
          this.habilitarSelectorModelo();
        }

        marcaDropdown.style.display = 'none';

        if (onMarcaChange) onMarcaChange(this.marcaSeleccionada);
      }, 200);
    });

    // Enter en marca
    marcaInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const texto = e.target.value.trim();
        if (texto) {
          if (!CatalogoVehiculosEcuador.validarMarca(texto)) {
            CatalogoVehiculosEcuador.agregarMarcaPersonalizada(texto);
          }
          this.marcaSeleccionada = texto;
          this.habilitarSelectorModelo();
          marcaDropdown.style.display = 'none';
          modeloInput.focus();

          if (onMarcaChange) onMarcaChange(this.marcaSeleccionada);
        }
      }
    });

    // Autocompletado de modelo
    modeloInput.addEventListener('input', (e) => {
      const texto = e.target.value.trim();

      if (!this.marcaSeleccionada || texto.length === 0) {
        modeloDropdown.style.display = 'none';
        modeloDropdown.innerHTML = '';
        return;
      }

      const modelos = CatalogoVehiculosEcuador.buscarModelos(this.marcaSeleccionada, texto);

      if (modelos.length > 0) {
        this.mostrarSugerenciasModelo(modelos, modeloDropdown, modeloInput);
        document.getElementById('custom-modelo-container').style.display = 'none';
      } else {
        modeloDropdown.style.display = 'none';
        document.getElementById('custom-modelo-container').style.display = 'block';
      }
    });

    // Selección de modelo
    modeloInput.addEventListener('blur', (e) => {
      setTimeout(() => {
        const texto = e.target.value.trim();

        if (
          texto &&
          this.marcaSeleccionada &&
          !CatalogoVehiculosEcuador.validarModelo(this.marcaSeleccionada, texto)
        ) {
          // Modelo personalizado
          CatalogoVehiculosEcuador.agregarModeloPersonalizado(this.marcaSeleccionada, texto);
          this.modeloSeleccionado = texto;
          if (window.Utils && Utils.showToast) {
            Utils.showToast(`Modelo "${texto}" agregado a ${this.marcaSeleccionada}`, 'info');
          }
        } else if (texto) {
          this.modeloSeleccionado = texto;
        }

        modeloDropdown.style.display = 'none';

        if (onModeloChange) onModeloChange(this.modeloSeleccionado);
      }, 200);
    });

    // Enter en modelo
    modeloInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const texto = e.target.value.trim();
        if (texto && this.marcaSeleccionada) {
          if (!CatalogoVehiculosEcuador.validarModelo(this.marcaSeleccionada, texto)) {
            CatalogoVehiculosEcuador.agregarModeloPersonalizado(this.marcaSeleccionada, texto);
          }
          this.modeloSeleccionado = texto;
          modeloDropdown.style.display = 'none';

          if (onModeloChange) onModeloChange(this.modeloSeleccionado);
        }
      }
    });

    // Cerrar dropdowns al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!marcaInput.contains(e.target) && !marcaDropdown.contains(e.target)) {
        marcaDropdown.style.display = 'none';
      }
      if (!modeloInput.contains(e.target) && !modeloDropdown.contains(e.target)) {
        modeloDropdown.style.display = 'none';
      }
    });
  },

  /**
   * Muestra sugerencias de marca
   */
  mostrarSugerenciasMarca(marcas, dropdown, input) {
    dropdown.innerHTML = '';

    marcas.slice(0, 10).forEach((marca) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';

      const paisBadge = marca.popular
        ? '<span class="badge badge-success" style="font-size: 0.7rem; margin-left: 6px;">Popular</span>'
        : '';

      item.innerHTML = `
                <div>
                    <strong>${marca.nombre}</strong>
                    ${paisBadge}
                </div>
                <small style="color: var(--text-secondary);">${marca.pais}</small>
            `;

      item.addEventListener('click', () => {
        input.value = marca.nombre;
        this.marcaSeleccionada = marca.nombre;
        this.habilitarSelectorModelo();
        dropdown.style.display = 'none';
        document.getElementById('vehiculo-modelo-input').focus();
        document.getElementById('custom-marca-container').style.display = 'none';
      });

      dropdown.appendChild(item);
    });

    dropdown.style.display = 'block';
  },

  /**
   * Muestra sugerencias de modelo
   */
  mostrarSugerenciasModelo(modelos, dropdown, input) {
    dropdown.innerHTML = '';

    modelos.slice(0, 10).forEach((modelo) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.textContent = modelo;

      item.addEventListener('click', () => {
        input.value = modelo;
        this.modeloSeleccionado = modelo;
        dropdown.style.display = 'none';
        document.getElementById('custom-modelo-container').style.display = 'none';
      });

      dropdown.appendChild(item);
    });

    dropdown.style.display = 'block';
  },

  /**
   * Habilita el selector de modelo
   */
  habilitarSelectorModelo() {
    const modeloInput = document.getElementById('vehiculo-modelo-input');
    const modelosCount = document.getElementById('modelos-count');

    if (modeloInput && this.marcaSeleccionada) {
      modeloInput.disabled = false;
      modeloInput.placeholder = 'Escribe para buscar modelo...';

      const modelos = CatalogoVehiculosEcuador.obtenerModelos(this.marcaSeleccionada);
      if (modelosCount) {
        modelosCount.textContent = `${modelos.length} modelos disponibles`;
        modelosCount.className = 'badge badge-success';
      }
    }
  },

  /**
   * Deshabilita el selector de modelo
   */
  deshabilitarSelectorModelo() {
    const modeloInput = document.getElementById('vehiculo-modelo-input');
    const modelosCount = document.getElementById('modelos-count');

    if (modeloInput) {
      modeloInput.disabled = true;
      modeloInput.value = '';
      modeloInput.placeholder = 'Primero selecciona una marca';
      this.modeloSeleccionado = null;

      if (modelosCount) {
        modelosCount.textContent = 'Selecciona una marca primero';
        modelosCount.className = 'badge badge-secondary';
      }
    }
  },

  /**
   * Inicializa validaciones del formulario
   */
  inicializarValidaciones() {
    const placaInput = document.getElementById('vehiculo-placa');
    const vinInput = document.getElementById('vehiculo-vin');

    // Validación de placa en tiempo real
    if (placaInput) {
      placaInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();

        // Formato: XXX-#### o XXX-###
        const regex = /^[A-Z]{0,3}-?[0-9]{0,4}$/;
        if (!regex.test(e.target.value)) {
          const clean = e.target.value.replace(/[^A-Z0-9-]/g, '');
          e.target.value = clean;
        }
      });
    }

    // Validación de VIN en tiempo real
    if (vinInput) {
      vinInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      });
    }
  },

  /**
   * Obtiene los datos del vehículo del formulario
   */
  obtenerDatos() {
    return {
      marca: document.getElementById('vehiculo-marca-input')?.value.trim() || '',
      modelo: document.getElementById('vehiculo-modelo-input')?.value.trim() || '',
      anio: document.getElementById('vehiculo-anio')?.value || null,
      color: document.getElementById('vehiculo-color')?.value.trim() || '',
      placa: document.getElementById('vehiculo-placa')?.value.trim().toUpperCase() || '',
      vin: document.getElementById('vehiculo-vin')?.value.trim().toUpperCase() || '',
      notas: document.getElementById('vehiculo-notas')?.value.trim() || '',
      compraTerceros: document.getElementById('vehiculo-compra-terceros')?.checked || false,
    };
  },

  /**
   * Valida los datos del formulario
   */
  validarDatos() {
    const datos = this.obtenerDatos();
    const errores = [];

    if (!datos.marca) errores.push('La marca es requerida');
    if (!datos.modelo) errores.push('El modelo es requerido');
    if (!datos.placa) errores.push('La placa es requerida');

    // Validar formato de placa
    const placaRegex = /^[A-Z]{3}-[0-9]{3,4}$/;
    if (datos.placa && !placaRegex.test(datos.placa)) {
      errores.push('Formato de placa inválido (debe ser XXX-#### o XXX-###)');
    }

    // Validar VIN si está presente
    if (datos.vin && datos.vin.length !== 17) {
      errores.push('El VIN debe tener exactamente 17 caracteres');
    }

    return {
      valido: errores.length === 0,
      errores,
      datos,
    };
  },

  /**
   * Resetea el formulario
   */
  resetear() {
    const marcaInput = document.getElementById('vehiculo-marca-input');
    const modeloInput = document.getElementById('vehiculo-modelo-input');

    if (marcaInput) marcaInput.value = '';
    if (modeloInput) {
      modeloInput.value = '';
      modeloInput.disabled = true;
    }

    const anioSelect = document.getElementById('vehiculo-anio');
    if (anioSelect) anioSelect.selectedIndex = 0;

    const colorInput = document.getElementById('vehiculo-color');
    if (colorInput) colorInput.value = '';

    const placaInput = document.getElementById('vehiculo-placa');
    if (placaInput) placaInput.value = '';

    const vinInput = document.getElementById('vehiculo-vin');
    if (vinInput) vinInput.value = '';

    const notasInput = document.getElementById('vehiculo-notas');
    if (notasInput) notasInput.value = '';

    const compraCheckbox = document.getElementById('vehiculo-compra-terceros');
    if (compraCheckbox) compraCheckbox.checked = false;

    this.marcaSeleccionada = null;
    this.modeloSeleccionado = null;

    document.getElementById('marca-dropdown').style.display = 'none';
    document.getElementById('modelo-dropdown').style.display = 'none';
    document.getElementById('custom-marca-container').style.display = 'none';
    document.getElementById('custom-modelo-container').style.display = 'none';
  },
};

// Exponer globalmente
window.VehiculoSelectorMejorado = VehiculoSelectorMejorado;
