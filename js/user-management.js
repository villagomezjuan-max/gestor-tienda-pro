/* ========================================
   MÓDULO DE GESTIÓN DE USUARIOS
   Panel de administración de usuarios y permisos
   ======================================== */

const USER_MGMT_ROLE_FALLBACK_DEFAULT = 'vendedor';
const USER_MGMT_ROLE_FALLBACK_MAP = {
  superadmin: 'super_admin',
  'super-admin': 'super_admin',
  super_admin: 'super_admin',
  admin: 'admin',
  administrador: 'admin',
  gerente: 'admin',
  ventas: USER_MGMT_ROLE_FALLBACK_DEFAULT,
  vendedor: USER_MGMT_ROLE_FALLBACK_DEFAULT,
  user: USER_MGMT_ROLE_FALLBACK_DEFAULT,
  usuario: USER_MGMT_ROLE_FALLBACK_DEFAULT,
  technician: 'tecnico',
  tecnico: 'tecnico',
  mecanico: 'tecnico',
  mechanic: 'tecnico',
};

function userMgmtFallbackNormalizeRole(value) {
  if (!value && value !== 0) {
    return USER_MGMT_ROLE_FALLBACK_DEFAULT;
  }

  const raw = value.toString().trim().toLowerCase();
  if (!raw) {
    return USER_MGMT_ROLE_FALLBACK_DEFAULT;
  }

  const ascii =
    typeof raw.normalize === 'function'
      ? raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      : raw;

  const mapped = USER_MGMT_ROLE_FALLBACK_MAP[raw] || USER_MGMT_ROLE_FALLBACK_MAP[ascii];
  return mapped || ascii || USER_MGMT_ROLE_FALLBACK_DEFAULT;
}

const USER_MGMT_ROLE_UTILS_FALLBACK = {
  ROLE_SUPER_ADMIN: 'super_admin',
  ROLE_ADMIN: 'admin',
  ROLE_VENDEDOR: USER_MGMT_ROLE_FALLBACK_DEFAULT,
  ROLE_TECNICO: 'tecnico',
  DEFAULT_ROLE: USER_MGMT_ROLE_FALLBACK_DEFAULT,
  normalize: userMgmtFallbackNormalizeRole,
  is(role, targets) {
    if (!targets) {
      return false;
    }

    const normalizedRole = userMgmtFallbackNormalizeRole(role);
    const list = Array.isArray(targets) ? targets : [targets];
    return list.some((item) => userMgmtFallbackNormalizeRole(item) === normalizedRole);
  },
};

const UserManagement = {
  currentPage: 1,
  usersPerPage: 10,
  filterText: '',
  filterRole: 'todos',
  filterStatus: 'todos',
  usersCache: [],
  isLoading: false,

  getRoleUtils() {
    if (typeof Auth !== 'undefined' && Auth && Auth.roles) {
      return Auth.roles;
    }
    if (typeof window !== 'undefined' && window.RoleUtils) {
      return window.RoleUtils;
    }
    return USER_MGMT_ROLE_UTILS_FALLBACK;
  },

  normalizeRole(role) {
    const utils = this.getRoleUtils();
    if (utils && typeof utils.normalize === 'function') {
      return utils.normalize(role);
    }
    return userMgmtFallbackNormalizeRole(role);
  },

  isRole(sourceRole, target) {
    const utils = this.getRoleUtils();
    if (utils && typeof utils.is === 'function') {
      return utils.is(sourceRole, target);
    }
    const normalizedSource = this.normalizeRole(sourceRole);
    const targets = Array.isArray(target) ? target : [target];
    return targets.some((item) => this.normalizeRole(item) === normalizedSource);
  },

  getRoleConstants() {
    const utils = this.getRoleUtils();
    return {
      superAdmin: this.normalizeRole(utils?.ROLE_SUPER_ADMIN || 'super_admin'),
      admin: this.normalizeRole(utils?.ROLE_ADMIN || 'admin'),
      vendedor: this.normalizeRole(
        utils?.ROLE_VENDEDOR || utils?.DEFAULT_ROLE || USER_MGMT_ROLE_FALLBACK_DEFAULT
      ),
      tecnico: this.normalizeRole(utils?.ROLE_TECNICO || 'tecnico'),
    };
  },

  getDefaultRole() {
    const { vendedor } = this.getRoleConstants();
    return vendedor || USER_MGMT_ROLE_FALLBACK_DEFAULT;
  },

  getAssignableRoles(includeSuperAdmin = false) {
    const { superAdmin, admin, vendedor, tecnico } = this.getRoleConstants();
    const roles = [admin, vendedor, tecnico].filter(Boolean);
    if (includeSuperAdmin && superAdmin) {
      roles.unshift(superAdmin);
    }
    return Array.from(new Set(roles));
  },

  refreshRoleFilterOptions(selectElement) {
    if (!selectElement) {
      return;
    }
    const includeSuperAdmin = Auth.isSuperAdmin();
    const roles = this.getAssignableRoles(includeSuperAdmin);
    const options = ['<option value="todos">Todos los roles</option>'];
    const seen = new Set();
    roles.forEach((role) => {
      if (!role || seen.has(role)) {
        return;
      }
      seen.add(role);
      options.push(`<option value="${role}">${this.getRoleFilterLabel(role)}</option>`);
    });
    selectElement.innerHTML = options.join('');
    if (this.filterRole !== 'todos' && !seen.has(this.filterRole)) {
      this.filterRole = 'todos';
    }
    selectElement.value = this.filterRole;
  },

  getRoleFilterLabel(role) {
    const normalized = this.normalizeRole(role);
    const { superAdmin, admin, vendedor, tecnico } = this.getRoleConstants();
    switch (normalized) {
      case superAdmin:
        return 'Superadministradores';
      case admin:
        return 'Administradores';
      case vendedor:
        return 'Vendedores';
      case tecnico:
        return 'Técnicos';
      default:
        return this.capitalize(normalized || 'Rol');
    }
  },

  capitalize(value) {
    const text = (value || '').toString();
    if (!text) {
      return '';
    }
    return text.charAt(0).toUpperCase() + text.slice(1);
  },

  canManageUser(user) {
    if (!user) {
      return false;
    }
    if (Auth.isSuperAdmin()) {
      return true;
    }
    const { superAdmin } = this.getRoleConstants();
    return !this.isRole(user.rol, superAdmin);
  },

  renderRoleSelectOptions(currentRole = null) {
    const includeSuperAdmin = Auth.isSuperAdmin();
    const roles = this.getAssignableRoles(includeSuperAdmin);
    const defaultRole = this.getDefaultRole();
    const selectedRole = currentRole ? this.normalizeRole(currentRole) : defaultRole;
    const allOptions = Array.from(new Set([...roles, selectedRole].filter(Boolean)));

    return allOptions
      .map((role) => {
        const normalized = this.normalizeRole(role);
        const selected = normalized === selectedRole ? 'selected' : '';
        return `<option value="${normalized}" ${selected}>${this.getRoleLabel(normalized)}</option>`;
      })
      .join('');
  },

  /**
   * Inicializa el módulo de gestión de usuarios
   */
  async init() {
    console.log('🔐 Inicializando módulo de gestión de usuarios...');
    this.setupEventListeners();
    await this.reloadUsers();
  },

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    // Botón crear usuario
    const btnCreateUser = document.getElementById('btnCreateUser');
    if (btnCreateUser) {
      btnCreateUser.addEventListener('click', () => this.showCreateUserModal());
    }

    // Búsqueda de usuarios
    const searchInput = document.getElementById('searchUsers');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterText = e.target.value;
        this.currentPage = 1;
        this.loadUsers();
      });
    }

    // Filtro por rol
    const roleFilter = document.getElementById('filterRole');
    if (roleFilter) {
      this.refreshRoleFilterOptions(roleFilter);
      roleFilter.addEventListener('change', (e) => {
        const selected = e.target.value || 'todos';
        this.filterRole = selected;
        this.currentPage = 1;
        this.loadUsers();
      });
    }

    const statusFilter = document.getElementById('filterStatus');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filterStatus = e.target.value;
        this.currentPage = 1;
        this.loadUsers();
      });
    }

    // Cambiar contraseña propia
    const btnChangePassword = document.getElementById('btnChangeOwnPassword');
    if (btnChangePassword) {
      btnChangePassword.addEventListener('click', () => this.showChangePasswordModal());
    }
  },

  async reloadUsers({ preservePage = false } = {}) {
    if (!preservePage) {
      this.currentPage = 1;
    }

    this.showLoadingState();
    this.isLoading = true;

    try {
      // Asegurar que el token esté actualizado con el negocio actual
      const negocioActual = localStorage.getItem('negocio_actual');
      if (negocioActual && Auth._user && Auth._user.negocioId !== negocioActual) {
        console.log('🔄 Actualizando token para negocio:', negocioActual);
        await Auth.refreshAccessToken(negocioActual);
      }

      const usuarios = await Auth.getAllUsers();
      this.usersCache = Array.isArray(usuarios) ? usuarios : [];
      this.updateStats();
      this.loadUsers();
    } catch (error) {
      console.error('Error recargando usuarios:', error);
      this.usersCache = [];
      this.updateStats();
      Utils.showToast(error?.message || 'No se pudieron cargar los usuarios', 'error');
      this.renderUsersList([]);
      this.renderPagination(0);
    } finally {
      this.isLoading = false;
    }
  },

  showLoadingState() {
    const container = document.getElementById('usersListContainer');
    if (!container) return;

    container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-3 text-muted">Cargando usuarios...</p>
            </div>
        `;
  },

  updateStats() {
    const usuarios = Array.isArray(this.usersCache) ? this.usersCache : [];
    const total = usuarios.length;
    const activos = usuarios.filter((u) => u.activo).length;
    const { superAdmin, admin } = this.getRoleConstants();
    const admins = usuarios.filter((u) => this.isRole(u.rol, [admin, superAdmin])).length;
    const inactivos = total - activos;

    const totalEl = document.getElementById('totalUsers');
    const activeEl = document.getElementById('activeUsers');
    const adminEl = document.getElementById('adminUsers');
    const inactiveEl = document.getElementById('inactiveUsers');

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = activos;
    if (adminEl) adminEl.textContent = admins;
    if (inactiveEl) inactiveEl.textContent = inactivos;
  },

  findUserById(userId) {
    if (!userId || !Array.isArray(this.usersCache)) {
      return null;
    }
    return this.usersCache.find((user) => user.id === userId) || null;
  },

  /**
   * Carga y muestra la lista de usuarios
   */
  loadUsers() {
    if (!Auth.isAdmin()) {
      Utils.showToast('No tienes permisos para ver usuarios', 'error');
      return;
    }

    const usuarios = Array.isArray(this.usersCache) ? [...this.usersCache] : [];
    let filteredUsers = usuarios;

    // Aplicar filtro de texto
    if (this.filterText) {
      filteredUsers = filteredUsers.filter(
        (u) =>
          (u.username || '').toLowerCase().includes(this.filterText.toLowerCase()) ||
          (u.nombre || '').toLowerCase().includes(this.filterText.toLowerCase()) ||
          (u.email || '').toLowerCase().includes(this.filterText.toLowerCase())
      );
    }

    // Aplicar filtro de rol
    if (this.filterRole !== 'todos') {
      filteredUsers = filteredUsers.filter((u) => this.isRole(u.rol, this.filterRole));
    }

    // Aplicar filtro de estado
    if (this.filterStatus !== 'todos') {
      const activo = this.filterStatus === 'activo';
      filteredUsers = filteredUsers.filter((u) => Boolean(u.activo) === activo);
    }

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / this.usersPerPage));
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }

    this.renderUsersList(filteredUsers);
    this.renderPagination(filteredUsers.length);
  },

  /**
   * Renderiza la lista de usuarios
   */
  renderUsersList(users) {
    const container = document.getElementById('usersListContainer');
    if (!container) return;

    if (users.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users fa-3x"></i>
                    <p>No se encontraron usuarios</p>
                </div>
            `;
      return;
    }

    const start = (this.currentPage - 1) * this.usersPerPage;
    const end = start + this.usersPerPage;
    const paginatedUsers = users.slice(start, end);
    const currentSession = Auth.getSession();
    const currentUserId = currentSession?.id || currentSession?.userId || null;

    container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Últ. Acceso</th>
                            <th class="text-end">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedUsers
                          .map((user) => {
                            const roleKey = (user.rol || '').toLowerCase();
                            return `
                                <tr class="${!user.activo ? 'table-secondary' : ''}">
                                    <td>
                                        <strong>${user.username}</strong>
                                        ${user.id === currentUserId ? '<span class="badge bg-primary ms-2">Tú</span>' : ''}
                                    </td>
                                    <td>${user.nombre || '-'}</td>
                                    <td>${user.email || '-'}</td>
                                    <td>
                                        <span class="badge bg-${this.getRoleBadgeColor(user.rol)}">
                                            ${this.getRoleLabel(user.rol)}
                                        </span>
                                    </td>
                                    <td>
                                        <span class="badge bg-${user.activo ? 'success' : 'secondary'}">
                                            ${user.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>${user.ultimoAcceso ? this.formatDate(user.ultimoAcceso) : 'Nunca'}</td>
                                    <td class="text-end">
                                        <div class="btn-group btn-group-sm">
                                            <button class="btn btn-outline-primary" onclick="UserManagement.editUser('${user.id}')" title="Editar">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn btn-outline-info" onclick="UserManagement.resetPassword('${user.id}')" title="Restablecer contraseña">
                                                <i class="fas fa-key"></i>
                                            </button>
                                            ${
                                              user.id !== currentUserId
                                                ? `
                                                <button class="btn btn-outline-${user.activo ? 'warning' : 'success'}" 
                                                        onclick="UserManagement.toggleUserStatus('${user.id}')" 
                                                        title="${user.activo ? 'Desactivar' : 'Activar'}">
                                                    <i class="fas fa-${user.activo ? 'ban' : 'check'}"></i>
                                                </button>
                                                <button class="btn btn-outline-danger" onclick="UserManagement.deleteUser('${user.id}')" title="Eliminar">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            `
                                                : ''
                                            }
                                        </div>
                                    </td>
                                </tr>
                            `;
                          })
                          .join('')}
                    </tbody>
                </table>
            </div>
        `;
  },

  /**
   * Renderiza la paginación
   */
  renderPagination(totalUsers) {
    const container = document.getElementById('usersPaginationContainer');
    if (!container) return;

    const totalPages = Math.ceil(totalUsers / this.usersPerPage);

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let paginationHTML = '<nav><ul class="pagination justify-content-center">';

    // Botón anterior
    paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="UserManagement.changePage(${this.currentPage - 1}); return false;">Anterior</a>
            </li>
        `;

    // Números de página
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
        paginationHTML += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="UserManagement.changePage(${i}); return false;">${i}</a>
                    </li>
                `;
      } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
        paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
      }
    }

    // Botón siguiente
    paginationHTML += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="UserManagement.changePage(${this.currentPage + 1}); return false;">Siguiente</a>
            </li>
        `;

    paginationHTML += '</ul></nav>';
    container.innerHTML = paginationHTML;
  },

  /**
   * Cambia de página
   */
  changePage(page) {
    this.currentPage = page;
    this.loadUsers();
  },

  /**
   * Muestra modal para crear usuario
   */
  showCreateUserModal() {
    const modalHTML = `
            <div class="modal fade" id="createUserModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-user-plus"></i> Crear Nuevo Usuario
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="createUserForm">
                                <div class="mb-3">
                                    <label class="form-label">Usuario *</label>
                                    <input type="text" class="form-control" id="newUsername" required>
                                    <small class="form-text text-muted">Solo letras, números y guión bajo</small>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Nombre Completo *</label>
                                    <input type="text" class="form-control" id="newUserFullName" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-control" id="newUserEmail">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Contraseña *</label>
                                    <input type="password" class="form-control" id="newUserPassword" required>
                                    <small class="form-text text-muted">Mínimo 6 caracteres</small>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Confirmar Contraseña *</label>
                                    <input type="password" class="form-control" id="newUserPasswordConfirm" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Rol *</label>
                                    <select class="form-select" id="newUserRole" required>
                                        ${this.renderRoleSelectOptions()}
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="UserManagement.createUser()">
                                <i class="fas fa-save"></i> Crear Usuario
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    // Insertar modal en el DOM
    const existingModal = document.getElementById('createUserModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalElement = document.getElementById('createUserModal');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
  },

  /**
   * Crea un nuevo usuario
   */
  async createUser() {
    const username = document.getElementById('newUsername').value.trim();
    const fullName = document.getElementById('newUserFullName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const passwordConfirm = document.getElementById('newUserPasswordConfirm').value;
    const role = document.getElementById('newUserRole').value;

    // Validaciones
    if (!username || !fullName || !password) {
      Utils.showToast('Por favor completa todos los campos obligatorios', 'error');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Utils.showToast('El usuario solo puede contener letras, números y guión bajo', 'error');
      return;
    }

    if (password.length < 6) {
      Utils.showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    if (password !== passwordConfirm) {
      Utils.showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    // Crear usuario
    const result = await Auth.createUser({
      username: username,
      nombre: fullName,
      email: email,
      password: password,
      rol: this.normalizeRole(role),
    });

    if (result.success) {
      Utils.showToast(result.message, 'success');
      const modalElement = document.getElementById('createUserModal');
      if (modalElement) {
        const modalInstance =
          bootstrap.Modal.getInstance(modalElement) ||
          bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.hide();
      }
      await this.reloadUsers();
    } else {
      Utils.showToast(result.message, 'error');
    }
  },

  /**
   * Edita un usuario
   */
  editUser(userId) {
    const user = this.findUserById(userId);
    if (!user) {
      Utils.showToast('Usuario no encontrado', 'error');
      return;
    }

    const modalHTML = `
            <div class="modal fade" id="editUserModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-user-edit"></i> Editar Usuario: ${user.username}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editUserForm">
                                <input type="hidden" id="editUserId" value="${user.id}">
                                <div class="mb-3">
                                    <label class="form-label">Usuario</label>
                                    <input type="text" class="form-control" value="${user.username}" disabled>
                                    <small class="form-text text-muted">El nombre de usuario no se puede cambiar</small>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Nombre Completo *</label>
                                    <input type="text" class="form-control" id="editUserFullName" value="${user.nombre || ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-control" id="editUserEmail" value="${user.email || ''}">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Rol *</label>
                                    <select class="form-select" id="editUserRole" required>
                                        ${this.renderRoleSelectOptions(user.rol)}
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="UserManagement.updateUser()">
                                <i class="fas fa-save"></i> Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    const existingModal = document.getElementById('editUserModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalElement = document.getElementById('editUserModal');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
  },

  /**
   * Actualiza un usuario
   */
  async updateUser() {
    const userId = document.getElementById('editUserId').value;
    const fullName = document.getElementById('editUserFullName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const role = document.getElementById('editUserRole').value;

    if (!fullName) {
      Utils.showToast('El nombre completo es obligatorio', 'error');
      return;
    }

    const result = await Auth.updateUser(userId, {
      nombre: fullName,
      email: email,
      rol: this.normalizeRole(role),
    });

    if (result.success) {
      Utils.showToast(result.message, 'success');
      const modalElement = document.getElementById('editUserModal');
      if (modalElement) {
        const modalInstance =
          bootstrap.Modal.getInstance(modalElement) ||
          bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.hide();
      }
      await this.reloadUsers({ preservePage: true });
    } else {
      Utils.showToast(result.message, 'error');
    }
  },

  /**
   * Restablece la contraseña de un usuario
   */
  resetPassword(userId) {
    const user = this.findUserById(userId);
    if (!user) {
      Utils.showToast('Usuario no encontrado', 'error');
      return;
    }

    Utils.showConfirm(
      `¿Restablecer la contraseña de ${user.username}? Se generará una contraseña temporal que deberás compartir.`,
      async () => {
        const newPassword = this.generateTemporaryPassword();

        const result = await Auth.updateUser(userId, {
          password: newPassword,
          requirePasswordChange: true,
        });

        if (result.success) {
          Utils.showAlert(
            'Contraseña Restablecida',
            `Nueva contraseña temporal para ${user.username}:<br><br>
                        <div class="alert alert-warning">
                            <strong class="fs-4">${newPassword}</strong>
                        </div>
                        <small>⚠️ El usuario deberá cambiar esta contraseña en su próximo inicio de sesión.</small>`,
            'success'
          );
          await this.reloadUsers({ preservePage: true });
        } else {
          Utils.showToast(result.message, 'error');
        }
      }
    );
  },

  /**
   * Genera una contraseña temporal
   */
  generateTemporaryPassword() {
    const length = 10;
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const base = upper + lower + digits;
    const required = [
      upper.charAt(Math.floor(Math.random() * upper.length)),
      lower.charAt(Math.floor(Math.random() * lower.length)),
      digits.charAt(Math.floor(Math.random() * digits.length)),
    ];

    while (required.length < length) {
      required.push(base.charAt(Math.floor(Math.random() * base.length)));
    }

    for (let i = required.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [required[i], required[j]] = [required[j], required[i]];
    }

    return required.join('');
  },

  /**
   * Activa/desactiva un usuario
   */
  toggleUserStatus(userId) {
    const user = this.findUserById(userId);
    if (!user) {
      Utils.showToast('Usuario no encontrado', 'error');
      return;
    }

    const newStatus = !user.activo;
    const action = newStatus ? 'activar' : 'desactivar';

    Utils.showConfirm(
      `¿${action.charAt(0).toUpperCase() + action.slice(1)} a ${user.username}?`,
      async () => {
        const result = await Auth.updateUser(userId, { activo: newStatus });

        if (result.success) {
          Utils.showToast(`Usuario ${action}do correctamente`, 'success');
          await this.reloadUsers({ preservePage: true });
        } else {
          Utils.showToast(result.message, 'error');
        }
      }
    );
  },

  /**
   * Elimina un usuario
   */
  deleteUser(userId) {
    const user = this.findUserById(userId);
    if (!user) {
      Utils.showToast('Usuario no encontrado', 'error');
      return;
    }

    Utils.showConfirm(
      `¿Eliminar usuario ${user.username}? Esta acción no se puede deshacer.`,
      async () => {
        const result = await Auth.deleteUser(userId);

        if (result.success) {
          Utils.showToast(result.message, 'success');
          await this.reloadUsers();
        } else {
          Utils.showToast(result.message, 'error');
        }
      }
    );
  },

  /**
   * Muestra modal para cambiar contraseña propia
   */
  showChangePasswordModal() {
    const modalHTML = `
            <div class="modal fade" id="changePasswordModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-key"></i> Cambiar Mi Contraseña
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="changePasswordForm">
                                <div class="mb-3">
                                    <label class="form-label">Contraseña Actual *</label>
                                    <input type="password" class="form-control" id="currentPassword" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Nueva Contraseña *</label>
                                    <input type="password" class="form-control" id="newPassword" required>
                                    <small class="form-text text-muted">Mínimo 6 caracteres</small>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Confirmar Nueva Contraseña *</label>
                                    <input type="password" class="form-control" id="confirmPassword" required>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="UserManagement.changePassword()">
                                <i class="fas fa-save"></i> Cambiar Contraseña
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    const existingModal = document.getElementById('changePasswordModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalElement = document.getElementById('changePasswordModal');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
  },

  /**
   * Cambia la contraseña del usuario actual
   */
  async changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Utils.showToast('Por favor completa todos los campos', 'error');
      return;
    }

    if (newPassword.length < 6) {
      Utils.showToast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      Utils.showToast('Las nuevas contraseñas no coinciden', 'error');
      return;
    }

    const result = await Auth.changePassword(currentPassword, newPassword);

    if (result.success) {
      Utils.showToast(result.message, 'success');
      const modalElement = document.getElementById('changePasswordModal');
      if (modalElement) {
        const modalInstance =
          bootstrap.Modal.getInstance(modalElement) ||
          bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.hide();
      }
    } else {
      Utils.showToast(result.message, 'error');
    }
  },

  /**
   * Obtiene el color del badge según el rol
   */
  getRoleBadgeColor(role) {
    const normalized = this.normalizeRole(role);
    const { superAdmin, admin, vendedor, tecnico } = this.getRoleConstants();
    const colors = {
      [superAdmin]: 'danger',
      [admin]: 'danger',
      [vendedor]: 'success',
      [tecnico]: 'info',
    };
    return colors[normalized] || 'secondary';
  },

  /**
   * Obtiene la etiqueta del rol
   */
  getRoleLabel(role) {
    const normalized = this.normalizeRole(role);
    const { superAdmin, admin, vendedor, tecnico } = this.getRoleConstants();
    const labels = {
      [superAdmin]: 'Superadministrador',
      [admin]: 'Administrador',
      [vendedor]: 'Vendedor',
      [tecnico]: 'Técnico',
    };
    return labels[normalized] || this.capitalize(normalized || 'Usuario');
  },

  /**
   * Formatea una fecha
   */
  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },
};

// Exponer globalmente
window.UserManagement = UserManagement;

console.log('✅ Módulo de gestión de usuarios cargado');
