/* ========================================
   MÓDULO DE PERFIL DE USUARIO
   Gestión del perfil del usuario autenticado
   Gestor Tienda Pro
   ======================================== */

const Perfil = {
  currentUser: null,
  isEditing: false,

  /**
   * Renderiza el módulo de perfil de usuario
   */
  render() {
    return `
      <div class="perfil-container">
        <div class="perfil-header">
          <h2><i class="fas fa-user-circle"></i> Mi Perfil</h2>
          <p>Gestiona tu información personal y configuración de cuenta</p>
        </div>

        <div class="perfil-content">
          <!-- Sección de foto de perfil -->
          <div class="perfil-section perfil-photo-section">
            <div class="perfil-photo-container">
              <div class="perfil-photo" id="perfilPhoto">
                <i class="fas fa-user-circle"></i>
              </div>
              <button class="btn btn-secondary btn-sm" id="changePhotoBtn">
                <i class="fas fa-camera"></i> Cambiar Foto
              </button>
              <input type="file" id="photoFileInput" accept="image/*" style="display: none;">
            </div>
          </div>

          <!-- Información del Usuario -->
          <div class="perfil-section">
            <h3><i class="fas fa-info-circle"></i> Información Personal</h3>
            <form id="perfilForm" class="perfil-form">
              <div class="form-row">
                <div class="form-group">
                  <label for="perfilNombre">
                    <i class="fas fa-user"></i> Nombre Completo *
                  </label>
                  <input 
                    type="text" 
                    id="perfilNombre" 
                    class="form-control" 
                    required 
                    disabled
                  >
                </div>

                <div class="form-group">
                  <label for="perfilUsername">
                    <i class="fas fa-id-badge"></i> Usuario
                  </label>
                  <input 
                    type="text" 
                    id="perfilUsername" 
                    class="form-control" 
                    disabled
                  >
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="perfilEmail">
                    <i class="fas fa-envelope"></i> Email
                  </label>
                  <input 
                    type="email" 
                    id="perfilEmail" 
                    class="form-control" 
                    disabled
                  >
                </div>

                <div class="form-group">
                  <label for="perfilTelefono">
                    <i class="fas fa-phone"></i> Teléfono
                  </label>
                  <input 
                    type="tel" 
                    id="perfilTelefono" 
                    class="form-control" 
                    placeholder="+593 99 123 4567"
                    disabled
                  >
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="perfilDireccion">
                    <i class="fas fa-map-marker-alt"></i> Dirección
                  </label>
                  <input 
                    type="text" 
                    id="perfilDireccion" 
                    class="form-control" 
                    placeholder="Av. Principal 123"
                    disabled
                  >
                </div>

                <div class="form-group">
                  <label for="perfilCiudad">
                    <i class="fas fa-city"></i> Ciudad
                  </label>
                  <input 
                    type="text" 
                    id="perfilCiudad" 
                    class="form-control" 
                    placeholder="Quito"
                    disabled
                  >
                </div>
              </div>

              <div class="form-group">
                <label for="perfilRol">
                  <i class="fas fa-user-tag"></i> Rol en el Sistema
                </label>
                <input 
                  type="text" 
                  id="perfilRol" 
                  class="form-control" 
                  disabled
                >
              </div>

              <div class="perfil-actions">
                <button 
                  type="button" 
                  id="editPerfilBtn" 
                  class="btn btn-primary"
                >
                  <i class="fas fa-edit"></i> Editar Información
                </button>
                <button 
                  type="submit" 
                  id="savePerfilBtn" 
                  class="btn btn-success" 
                  style="display: none;"
                >
                  <i class="fas fa-save"></i> Guardar Cambios
                </button>
                <button 
                  type="button" 
                  id="cancelPerfilBtn" 
                  class="btn btn-secondary" 
                  style="display: none;"
                >
                  <i class="fas fa-times"></i> Cancelar
                </button>
              </div>
            </form>
          </div>

          <!-- Cambiar Contraseña -->
          <div class="perfil-section">
            <h3><i class="fas fa-lock"></i> Cambiar Contraseña</h3>
            <form id="passwordForm" class="perfil-form">
              <div class="form-group">
                <label for="currentPassword">
                  <i class="fas fa-key"></i> Contraseña Actual *
                </label>
                <input 
                  type="password" 
                  id="currentPassword" 
                  class="form-control" 
                  required
                >
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="newPassword">
                    <i class="fas fa-lock"></i> Nueva Contraseña *
                  </label>
                  <input 
                    type="password" 
                    id="newPassword" 
                    class="form-control" 
                    minlength="8"
                    required
                  >
                  <small class="form-text">Mínimo 8 caracteres</small>
                </div>

                <div class="form-group">
                  <label for="confirmPassword">
                    <i class="fas fa-lock"></i> Confirmar Contraseña *
                  </label>
                  <input 
                    type="password" 
                    id="confirmPassword" 
                    class="form-control" 
                    minlength="8"
                    required
                  >
                </div>
              </div>

              <div class="password-strength" id="passwordStrength" style="display: none;">
                <div class="strength-bar">
                  <div class="strength-bar-fill"></div>
                </div>
                <small class="strength-text"></small>
              </div>

              <button type="submit" class="btn btn-primary">
                <i class="fas fa-key"></i> Cambiar Contraseña
              </button>
            </form>
          </div>

          <!-- Información de la Cuenta -->
          <div class="perfil-section">
            <h3><i class="fas fa-building"></i> Información de la Cuenta</h3>
            <div class="info-grid">
              <div class="info-item">
                <label><i class="fas fa-calendar-alt"></i> Miembro desde:</label>
                <span id="perfilFechaCreacion">-</span>
              </div>
              <div class="info-item">
                <label><i class="fas fa-clock"></i> Última actualización:</label>
                <span id="perfilFechaActualizacion">-</span>
              </div>
              <div class="info-item">
                <label><i class="fas fa-store"></i> Negocio actual:</label>
                <span id="perfilNegocioActual">-</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        .perfil-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
        }

        .perfil-header {
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--border-color);
        }

        .perfil-header h2 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
          font-size: 1.8rem;
        }

        .perfil-header p {
          margin: 0;
          color: var(--text-secondary);
        }

        .perfil-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .perfil-section {
          background: var(--bg-primary);
          border-radius: var(--radius-xl);
          padding: 1.5rem;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
          transition: background-color var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
        }

        .perfil-section h3 {
          margin: 0 0 1.5rem 0;
          color: var(--text-primary);
          font-size: 1.3rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-light);
        }

        .perfil-photo-section {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .perfil-photo-container {
          text-align: center;
        }

        .perfil-photo {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem auto;
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }

        .perfil-photo i {
          font-size: 80px;
          color: var(--text-inverse);
        }

        .perfil-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .perfil-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-group label i {
          color: var(--primary-color);
        }

        .form-control {
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 1rem;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background-color var(--transition-fast);
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .form-control:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px var(--focus-ring);
        }

        .form-control:disabled {
          background-color: var(--bg-secondary);
          color: var(--text-tertiary);
          cursor: not-allowed;
        }

        .form-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .perfil-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .password-strength {
          margin-top: 0.5rem;
        }

        .strength-bar {
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .strength-bar-fill {
          height: 100%;
          width: 0;
          transition: all 0.3s;
          background: #dc3545;
        }

        .strength-bar-fill.weak { width: 33%; background: #dc3545; }
        .strength-bar-fill.medium { width: 66%; background: #ffc107; }
        .strength-bar-fill.strong { width: 100%; background: #28a745; }

        .strength-text {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .info-item {
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          box-shadow: var(--shadow-sm);
        }

        .info-item label {
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .info-item label i {
          color: var(--primary-color);
        }

        .info-item span {
          color: var(--text-secondary);
        }

        /* Modo Oscuro */
        @media (max-width: 768px) {
          .perfil-container {
            padding: 1rem;
          }

          .form-row,
          .info-grid {
            grid-template-columns: 1fr;
          }

          .perfil-actions {
            flex-direction: column;
          }

          .perfil-photo {
            width: 120px;
            height: 120px;
          }

          .perfil-photo i {
            font-size: 60px;
          }
        }
      </style>
    `;
  },

  /**
   * Inicializa el módulo de perfil
   */
  async init() {
    await this.loadUserProfile();
    this.setupEventListeners();
  },

  /**
   * Carga el perfil del usuario desde el backend
   */
  async loadUserProfile() {
    try {
      const response = await Auth._request('/usuarios/perfil');
      if (response && response.success) {
        this.currentUser = response.usuario;
        this.displayUserProfile();
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      Utils.showToast('Error al cargar el perfil de usuario', 'error');
    }
  },

  /**
   * Muestra la información del usuario en el formulario
   */
  displayUserProfile() {
    if (!this.currentUser) return;

    const user = this.currentUser;

    // Información básica
    document.getElementById('perfilNombre').value = user.nombre || '';
    document.getElementById('perfilUsername').value = user.username || '';
    document.getElementById('perfilEmail').value = user.email || '';
    document.getElementById('perfilTelefono').value = user.telefono || '';
    document.getElementById('perfilDireccion').value = user.direccion || '';
    document.getElementById('perfilCiudad').value = user.ciudad || '';

    // Rol formateado
    const rolFormateado = App.formatRoleLabel(user.rol);
    document.getElementById('perfilRol').value = rolFormateado;

    // Fechas
    if (user.created_at) {
      const fecha = new Date(user.created_at);
      document.getElementById('perfilFechaCreacion').textContent = fecha.toLocaleDateString(
        'es-ES',
        { year: 'numeric', month: 'long', day: 'numeric' }
      );
    }

    if (user.updated_at) {
      const fecha = new Date(user.updated_at);
      document.getElementById('perfilFechaActualizacion').textContent = fecha.toLocaleDateString(
        'es-ES',
        { year: 'numeric', month: 'long', day: 'numeric' }
      );
    }

    // Negocio actual
    this.loadNegocioActual();

    // Foto de perfil
    if (user.foto_perfil) {
      const photoElement = document.getElementById('perfilPhoto');
      photoElement.innerHTML = `<img src="${user.foto_perfil}" alt="Foto de perfil">`;
    }
  },

  /**
   * Carga información del negocio actual
   */
  async loadNegocioActual() {
    try {
      const response = await Auth._request('/negocios/actual');
      if (response && response.success && response.negocio) {
        const nombreNegocio = response.negocio.configTienda?.nombre || response.negocio.nombre;
        document.getElementById('perfilNegocioActual').textContent = nombreNegocio;
      }
    } catch (error) {
      console.warn('No se pudo cargar información del negocio');
    }
  },

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    // Botón editar
    const editBtn = document.getElementById('editPerfilBtn');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.enableEditing());
    }

    // Botón guardar
    const saveBtn = document.getElementById('savePerfilBtn');
    if (saveBtn) {
      document.getElementById('perfilForm').addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProfile();
      });
    }

    // Botón cancelar
    const cancelBtn = document.getElementById('cancelPerfilBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelEditing());
    }

    // Cambiar foto
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const photoInput = document.getElementById('photoFileInput');

    if (changePhotoBtn && photoInput) {
      changePhotoBtn.addEventListener('click', () => photoInput.click());
      photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
    }

    // Formulario de contraseña
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.changePassword();
      });
    }

    // Validación de contraseña en tiempo real
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
      newPasswordInput.addEventListener('input', () => this.checkPasswordStrength());
    }
  },

  /**
   * Habilita la edición del perfil
   */
  enableEditing() {
    this.isEditing = true;

    // Habilitar campos editables
    const editableFields = [
      'perfilNombre',
      'perfilEmail',
      'perfilTelefono',
      'perfilDireccion',
      'perfilCiudad',
    ];
    editableFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (field) field.disabled = false;
    });

    // Cambiar botones
    document.getElementById('editPerfilBtn').style.display = 'none';
    document.getElementById('savePerfilBtn').style.display = 'inline-block';
    document.getElementById('cancelPerfilBtn').style.display = 'inline-block';
  },

  /**
   * Cancela la edición del perfil
   */
  cancelEditing() {
    this.isEditing = false;
    this.displayUserProfile();

    // Deshabilitar campos
    const editableFields = [
      'perfilNombre',
      'perfilEmail',
      'perfilTelefono',
      'perfilDireccion',
      'perfilCiudad',
    ];
    editableFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (field) field.disabled = true;
    });

    // Cambiar botones
    document.getElementById('editPerfilBtn').style.display = 'inline-block';
    document.getElementById('savePerfilBtn').style.display = 'none';
    document.getElementById('cancelPerfilBtn').style.display = 'none';
  },

  /**
   * Guarda los cambios del perfil
   */
  async saveProfile() {
    try {
      const updates = {
        nombre: document.getElementById('perfilNombre').value.trim(),
        email: document.getElementById('perfilEmail').value.trim(),
        telefono: document.getElementById('perfilTelefono').value.trim(),
        direccion: document.getElementById('perfilDireccion').value.trim(),
        ciudad: document.getElementById('perfilCiudad').value.trim(),
      };

      if (!updates.nombre) {
        Utils.showToast('El nombre es obligatorio', 'error');
        return;
      }

      const response = await Auth._request('/usuarios/perfil', {
        method: 'PUT',
        body: updates,
      });

      if (response && response.success) {
        Utils.showToast('Perfil actualizado correctamente', 'success');
        this.currentUser = response.usuario;
        this.cancelEditing();

        // Actualizar nombre en el header
        App.loadUserInfo();
      } else {
        Utils.showToast(response?.message || 'Error al actualizar perfil', 'error');
      }
    } catch (error) {
      console.error('Error guardando perfil:', error);
      Utils.showToast(error.message || 'Error al guardar el perfil', 'error');
    }
  },

  /**
   * Maneja la subida de foto de perfil
   */
  async handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      Utils.showToast('Solo se permiten archivos de imagen', 'error');
      return;
    }

    // Validar tamaño (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      Utils.showToast('La imagen no debe superar 2MB', 'error');
      return;
    }

    try {
      // Crear FormData para enviar la imagen
      const formData = new FormData();
      formData.append('foto', file);

      const response = await Auth._request('/usuarios/perfil/foto', {
        method: 'POST',
        body: formData,
      });

      if (response && response.success) {
        Utils.showToast('Foto de perfil actualizada', 'success');

        // Actualizar la imagen en la UI
        const photoElement = document.getElementById('perfilPhoto');
        photoElement.innerHTML = `<img src="${response.fotoUrl}?t=${Date.now()}" alt="Foto de perfil">`;

        this.currentUser.foto_perfil = response.fotoUrl;
      } else {
        Utils.showToast(response?.message || 'Error al subir la foto', 'error');
      }
    } catch (error) {
      console.error('Error subiendo foto:', error);
      Utils.showToast(error.message || 'Error al subir la foto de perfil', 'error');
    }
  },

  /**
   * Cambia la contraseña del usuario
   */
  async changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
      Utils.showToast('Todos los campos son obligatorios', 'error');
      return;
    }

    if (newPassword.length < 8) {
      Utils.showToast('La nueva contraseña debe tener al menos 8 caracteres', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      Utils.showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    try {
      const response = await Auth.changePassword(currentPassword, newPassword);

      if (response.success) {
        Utils.showToast('Contraseña cambiada correctamente', 'success');

        // Limpiar formulario
        document.getElementById('passwordForm').reset();
        document.getElementById('passwordStrength').style.display = 'none';
      } else {
        Utils.showToast(response.message || 'Error al cambiar la contraseña', 'error');
      }
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      Utils.showToast(error.message || 'Error al cambiar la contraseña', 'error');
    }
  },

  /**
   * Verifica la fortaleza de la contraseña
   */
  checkPasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthDiv = document.getElementById('passwordStrength');
    const strengthBar = strengthDiv.querySelector('.strength-bar-fill');
    const strengthText = strengthDiv.querySelector('.strength-text');

    if (!password) {
      strengthDiv.style.display = 'none';
      return;
    }

    strengthDiv.style.display = 'block';

    let strength = 0;
    let text = '';

    // Longitud
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;

    // Complejidad
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    // Determinar nivel
    strengthBar.className = 'strength-bar-fill';

    if (strength <= 2) {
      strengthBar.classList.add('weak');
      text = 'Contraseña débil';
      strengthText.style.color = '#dc3545';
    } else if (strength <= 4) {
      strengthBar.classList.add('medium');
      text = 'Contraseña media';
      strengthText.style.color = '#ffc107';
    } else {
      strengthBar.classList.add('strong');
      text = 'Contraseña fuerte';
      strengthText.style.color = '#28a745';
    }

    strengthText.textContent = text;
  },
};

// Exponer globalmente
window.Perfil = Perfil;
