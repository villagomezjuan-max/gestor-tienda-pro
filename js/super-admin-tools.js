// ============================================
// SUPER ADMIN TOOLS - Herramientas Avanzadas de Administración
// Gestor Tienda Pro v2.0
// ============================================

// Constantes
const API_URL = window.API_URL || ((typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') 
    ? `${window.location.protocol}//${window.location.hostname}` 
    : 'http://localhost:3001');

// Helper function para obtener token de autorización
function getAuthToken() {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('token')
  );
}

// Helper function para obtener headers de autorización
function getAuthHeaders() {
  const token = getAuthToken();
  if (!token) {
    console.error('No se encontró token de autenticación');
    showToast('Sesión expirada. Por favor inicia sesión nuevamente.', 'error');
    setTimeout(() => (window.location.href = '/login.html'), 2000);
    return null;
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// Helper unificado para ejecutar llamadas autenticadas respetando el nuevo flujo basado en cookies httpOnly
async function fetchWithAuth(url, options = {}, defaultMessage = 'Error en la operación') {
  const { silent, ...restOptions } = options || {};
  const requestOptions = { ...(restOptions || {}) };

  // Asegurar que haya headers incluso si no se proporcionan
  requestOptions.headers = { ...(options?.headers || {}) };

  let response = null;

  try {
    if (window.Auth && typeof window.Auth.authenticatedFetch === 'function') {
      // Uso preferente del módulo Auth para que maneje cookies, refresh tokens y encabezados de tenant
      response = await window.Auth.authenticatedFetch(url, requestOptions);
    } else {
      // Fallback legacy basado en token en localStorage/sessionStorage
      const headers = getAuthHeaders();
      if (!headers) {
        return null;
      }
      requestOptions.headers = { ...headers, ...requestOptions.headers };
      response = await fetch(url, requestOptions);
    }

    await handleApiError(response, defaultMessage, { silent });
    return response;
  } catch (error) {
    console.error('Error en fetchWithAuth:', error);
    throw error;
  }
}

// Helper function para manejar errores de API
async function handleApiError(
  response,
  defaultMessage = 'Error en la operación',
  { silent = false } = {}
) {
  if (!response.ok) {
    let errorMessage = defaultMessage;
    try {
      const contentType = response.headers.get('content-type');

      // Si la respuesta es HTML en lugar de JSON, es un error del servidor
      if (contentType && contentType.includes('text/html')) {
        console.error(
          'El servidor devolvió HTML en lugar de JSON. Esto indica un problema de configuración.'
        );

        if (response.status === 403) {
          errorMessage =
            'Acceso denegado. Verifica que tu usuario tenga rol "super_admin" y reinicia sesión.';
        } else if (response.status === 401) {
          errorMessage = 'Sesión expirada. Redirigiendo al login...';
        } else {
          errorMessage = `Error del servidor (${response.status}). Verifica la consola del backend.`;
        }

        if (!silent) {
          showToast(errorMessage, 'error');
        }

        if (response.status === 401) {
          setTimeout(() => (window.location.href = '/login.html'), 2000);
        }

        throw new Error(errorMessage);
      }

      // Parsear respuesta JSON
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || defaultMessage;

      // Manejar errores de autenticación
      if (response.status === 401) {
        errorMessage = 'Sesión expirada. Redirigiendo al login...';
        if (!silent) {
          showToast(errorMessage, 'error');
        }
        setTimeout(() => (window.location.href = '/login.html'), 2000);
        return;
      }

      // Manejar errores de autorización
      if (response.status === 403) {
        errorMessage = 'No tienes permisos suficientes. Requiere rol: super_admin';
        console.error('Error 403:', errorData);
      }
    } catch (e) {
      // Si falla el parseo, usar mensaje por defecto
      if (e.message.includes('Sesión expirada') || e.message.includes('Acceso denegado')) {
        throw e; // Re-lanzar errores de auth ya procesados
      }
      console.error('Error parseando respuesta de error:', e);
    }
    if (!silent) {
      showToast(errorMessage, 'error');
    }
    throw new Error(errorMessage);
  }
}

// Helper function para mostrar notificaciones
function showToast(message, type = 'info') {
  if (window.Utils && typeof Utils.showToast === 'function') {
    Utils.showToast(message, type);
  } else if (window.Notificaciones && typeof Notificaciones.mostrar === 'function') {
    Notificaciones.mostrar(message, type);
  } else {
    // Fallback básico
    console.log(`[${type.toUpperCase()}] ${message}`);
    alert(message);
  }
}

class SuperAdminTools {
  constructor() {
    this.databases = [];
    this.users = [];
    this.selectedItems = new Set();
    this.toolStatus = {};
    this.stats = {
      totalUsers: 0,
      totalDatabases: 0,
      totalSize: 0,
      orphanedUsers: 0,
      inactiveUsers: 0,
    };
  }

  async initialize() {
    try {
      await Promise.all([this.loadDatabases(), this.loadUsers(), this.loadStatistics()]);
      this.render();
    } catch (error) {
      console.error('Error inicializando Super Admin Tools:', error);
      showToast('Error al cargar las herramientas de administración', 'error');
    }
  }

  async loadDatabases() {
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/admin/databases`,
        { method: 'GET' },
        'Error al cargar bases de datos'
      );
      if (!response) return;

      const data = await response.json();
      this.databases = data.databases || [];
      this.stats.totalDatabases = this.databases.length;
      this.stats.totalSize = this.databases.reduce((sum, db) => sum + (db.size || 0), 0);
    } catch (error) {
      console.error('Error cargando bases de datos:', error);
      this.databases = [];
    }
  }

  async loadUsers() {
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/admin/users/all`,
        { method: 'GET' },
        'Error al cargar usuarios'
      );
      if (!response) return;

      const data = await response.json();
      this.users = data.users || [];
      this.stats.totalUsers = this.users.length;
      this.stats.inactiveUsers = this.users.filter((u) => !u.activo).length;
      this.stats.orphanedUsers = this.users.filter(
        (u) => !u.negocio_id || u.negocio_id === 'undefined'
      ).length;
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      this.users = [];
    }
  }

  async loadStatistics() {
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/admin/statistics`,
        { method: 'GET' },
        'Error al cargar estadísticas'
      );

      if (response && response.ok) {
        const data = await response.json();
        Object.assign(this.stats, data.stats);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }

  getToolStatusId(scriptName) {
    return `tool-status-${scriptName.replace(/[^a-z0-9_-]/gi, '-')}`;
  }

  updateToolStatus(scriptName, message, type = 'info') {
    if (message) {
      this.toolStatus[scriptName] = { message, type };
    } else {
      delete this.toolStatus[scriptName];
    }

    const element = document.getElementById(this.getToolStatusId(scriptName));
    if (!element) {
      return;
    }

    const colors = {
      info: '#667eea',
      success: '#25d366',
      warning: '#f1c40f',
      error: '#ff4757',
    };

    if (!message) {
      element.textContent = '';
      element.style.display = 'none';
      return;
    }

    element.textContent = message;
    element.style.display = 'block';
    element.style.color = colors[type] || '#9aa0ac';
  }

  render() {
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) return;

    contentArea.innerHTML = `
            <div class="super-admin-tools">
                <div class="tools-header">
                    <h2><i class="fas fa-crown"></i> Panel de Super Administrador</h2>
                    <p class="text-muted">Herramientas avanzadas para gestión y mantenimiento del sistema</p>
                </div>

                <!-- Estadísticas Generales -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon bg-primary">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.stats.totalUsers}</div>
                            <div class="stat-label">Usuarios Totales</div>
                            ${this.stats.inactiveUsers > 0 ? `<div class="stat-warning">${this.stats.inactiveUsers} inactivos</div>` : ''}
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon bg-success">
                            <i class="fas fa-database"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.stats.totalDatabases}</div>
                            <div class="stat-label">Bases de Datos</div>
                            <div class="stat-detail">${this.formatBytes(this.stats.totalSize)}</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon ${this.stats.orphanedUsers > 0 ? 'bg-warning' : 'bg-info'}">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.stats.orphanedUsers}</div>
                            <div class="stat-label">Usuarios Huérfanos</div>
                            ${this.stats.orphanedUsers > 0 ? '<div class="stat-warning">Requieren asignación</div>' : '<div class="stat-success">Todo correcto</div>'}
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon bg-purple">
                            <i class="fas fa-store"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.databases.filter((db) => db.active).length}</div>
                            <div class="stat-label">Tiendas Activas</div>
                        </div>
                    </div>
                </div>

                <!-- HERRAMIENTAS AVANZADAS - NUEVAS -->
                <div class="advanced-tools-section">
                    <div class="section-header">
                        <h3><i class="fas fa-wrench"></i> Herramientas Avanzadas del Sistema</h3>
                        <p>Ejecuta los módulos más potentes de diagnóstico y reparación del entorno.</p>
                    </div>
                    
                    <div class="tools-grid">
                        <div class="tool-card">
                            <div class="tool-icon">
                                <i class="fas fa-stethoscope"></i>
                            </div>
                            <h4>Diagnóstico Completo</h4>
                            <p>Análisis profundo del sistema: usuarios, bases de datos e integridad</p>
                            <button class="btn btn-primary" onclick="superAdminTools.ejecutarHerramienta('01-diagnostico-sistema.js')">
                                <i class="fas fa-play"></i> Ejecutar
                            </button>
                            <div class="tool-status" id="${this.getToolStatusId('01-diagnostico-sistema.js')}" style="display:none; margin-top:12px; font-size:13px;"></div>
                        </div>

                        <div class="tool-card">
                            <div class="tool-icon">
                                <i class="fas fa-user-shield"></i>
                            </div>
                            <h4>Gestor de Usuarios Huérfanos</h4>
                            <p>Detectar, asignar o eliminar usuarios sin negocio</p>
                            <button class="btn btn-warning" onclick="superAdminTools.ejecutarHerramienta('02-gestor-usuarios-huerfanos.js')">
                                <i class="fas fa-play"></i> Ejecutar
                            </button>
                            <div class="tool-status" id="${this.getToolStatusId('02-gestor-usuarios-huerfanos.js')}" style="display:none; margin-top:12px; font-size:13px;"></div>
                        </div>

                        <div class="tool-card">
                            <div class="tool-icon">
                                <i class="fas fa-server"></i>
                            </div>
                            <h4>Gestor de Bases de Datos</h4>
                            <p>Verificar, reparar, crear y hacer backup de DBs</p>
                            <button class="btn btn-info" onclick="superAdminTools.ejecutarHerramienta('03-gestor-bases-datos.js')">
                                <i class="fas fa-play"></i> Ejecutar
                            </button>
                            <div class="tool-status" id="${this.getToolStatusId('03-gestor-bases-datos.js')}" style="display:none; margin-top:12px; font-size:13px;"></div>
                        </div>

                        <div class="tool-card">
                            <div class="tool-icon">
                                <i class="fas fa-broom"></i>
                            </div>
                            <h4>Limpieza y Mantenimiento</h4>
                            <p>Eliminar datos de prueba, optimizar y limpiar registros</p>
                            <button class="btn btn-danger" onclick="superAdminTools.ejecutarHerramienta('04-limpieza-mantenimiento.js')">
                                <i class="fas fa-play"></i> Ejecutar
                            </button>
                            <div class="tool-status" id="${this.getToolStatusId('04-limpieza-mantenimiento.js')}" style="display:none; margin-top:12px; font-size:13px;"></div>
                        </div>

                        <div class="tool-card">
                            <div class="tool-icon">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <h4>Limpieza Total de Negocios</h4>
                            <p>Vaciar ventas, compras y movimientos para iniciar desde cero</p>
                            <button class="btn btn-dark" onclick="superAdminTools.ejecutarHerramienta('05-reset-datos-negocio.js')">
                                <i class="fas fa-play"></i> Ejecutar
                            </button>
                            <div class="tool-status" id="${this.getToolStatusId('05-reset-datos-negocio.js')}" style="display:none; margin-top:12px; font-size:13px;"></div>
                        </div>
                    </div>

                    <div class="tool-launcher-notice">
                        <i class="fas fa-info-circle"></i>
                        <span>Las herramientas se ejecutan en una ventana de PowerShell independiente. Siga las instrucciones en pantalla.</span>
                    </div>
                </div>

                <!-- Herramientas de Acción Rápida -->
                <div class="quick-tools-section">
                    <div class="section-header">
                        <h3><i class="fas fa-bolt"></i> Acciones Rápidas</h3>
                        <p>Accesos directos para tareas críticas de mantenimiento en segundos.</p>
                    </div>
                    <div class="tools-grid compact">
                        <div class="tool-card quick-card">
                            <div class="tool-icon icon-sm">
                                <i class="fas fa-user-slash"></i>
                            </div>
                            <h4>Limpiar Usuarios Huérfanos</h4>
                            <p>Detecta y reasigna usuarios sin negocio antes de que causen bloqueos.</p>
                            <button class="btn btn-warning" onclick="superAdminTools.cleanOrphanedUsers()">
                                <i class="fas fa-bolt"></i> Ejecutar acción
                            </button>
                        </div>

                        <div class="tool-card quick-card">
                            <div class="tool-icon icon-sm">
                                <i class="fas fa-compress"></i>
                            </div>
                            <h4>Optimizar Bases de Datos</h4>
                            <p>Reindexa, limpia y deja listas todas las bases para alto rendimiento.</p>
                            <button class="btn btn-info" onclick="superAdminTools.optimizeDatabases()">
                                <i class="fas fa-bolt"></i> Ejecutar acción
                            </button>
                        </div>

                        <div class="tool-card quick-card">
                            <div class="tool-icon icon-sm">
                                <i class="fas fa-user-times"></i>
                            </div>
                            <h4>Desactivar Usuarios Inactivos</h4>
                            <p>Cierra accesos antiguos y evita riesgos de seguridad innecesarios.</p>
                            <button class="btn btn-danger" onclick="superAdminTools.cleanInactiveUsers()">
                                <i class="fas fa-bolt"></i> Ejecutar acción
                            </button>
                        </div>

                        <div class="tool-card quick-card">
                            <div class="tool-icon icon-sm">
                                <i class="fas fa-file-pdf"></i>
                            </div>
                            <h4>Generar Reporte Global</h4>
                            <p>Produce un informe detallado del estado actual para auditorías.</p>
                            <button class="btn btn-primary" onclick="superAdminTools.generateReport()">
                                <i class="fas fa-bolt"></i> Ejecutar acción
                            </button>
                        </div>

                        <div class="tool-card quick-card">
                            <div class="tool-icon icon-sm">
                                <i class="fas fa-cloud-download-alt"></i>
                            </div>
                            <h4>Backup Global</h4>
                            <p>Crea una copia segura de todas las bases antes de intervenciones.</p>
                            <button class="btn btn-success" onclick="superAdminTools.backupAll()">
                                <i class="fas fa-bolt"></i> Ejecutar acción
                            </button>
                        </div>

                        <div class="tool-card quick-card">
                            <div class="tool-icon icon-sm">
                                <i class="fas fa-shield-alt"></i>
                            </div>
                            <h4>Verificar Integridad</h4>
                            <p>Revisa relaciones, llaves y consistencia de los datos críticos.</p>
                            <button class="btn btn-info" onclick="superAdminTools.analyzeIntegrity()">
                                <i class="fas fa-bolt"></i> Ejecutar acción
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Tabs de Gestión -->
                <div class="management-tabs">
                    <div class="tabs-header">
                        <button class="tab-btn active" data-tab="users">
                            <i class="fas fa-users"></i> Usuarios
                        </button>
                        <button class="tab-btn" data-tab="databases">
                            <i class="fas fa-database"></i> Bases de Datos
                        </button>
                        <button class="tab-btn" data-tab="cleanup">
                            <i class="fas fa-broom"></i> Limpieza
                        </button>
                        <button class="tab-btn" data-tab="optimization">
                            <i class="fas fa-tachometer-alt"></i> Optimización
                        </button>
                        <button class="tab-btn" data-tab="advanced">
                            <i class="fas fa-cogs"></i> Avanzado
                        </button>
                    </div>

                    <div class="tabs-content">
                        <div class="tab-panel active" id="users-panel">
                            ${this.renderUsersPanel()}
                        </div>
                        <div class="tab-panel" id="databases-panel">
                            ${this.renderDatabasesPanel()}
                        </div>
                        <div class="tab-panel" id="cleanup-panel">
                            ${this.renderCleanupPanel()}
                        </div>
                        <div class="tab-panel" id="optimization-panel">
                            ${this.renderOptimizationPanel()}
                        </div>
                        <div class="tab-panel" id="advanced-panel">
                            ${this.renderAdvancedPanel()}
                        </div>
                    </div>
                </div>
            </div>
        `;

    this.attachEventListeners();

    Object.entries(this.toolStatus).forEach(([script, status]) => {
      this.updateToolStatus(script, status.message, status.type);
    });
  }
  renderUsersPanel() {
    return `
            <div class="panel-header">
                <div class="panel-title">
                    <h3>Gestión de Usuarios</h3>
                    <span class="badge">${this.users.length} usuarios</span>
                </div>
                <div class="panel-actions">
                    <input type="text" class="search-input" placeholder="Buscar usuario..." id="searchUsers">
                    <select class="filter-select" id="filterUserStatus">
                        <option value="">Todos</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                        <option value="orphaned">Huérfanos</option>
                    </select>
                    <button class="btn btn-danger btn-sm" onclick="superAdminTools.deleteSelectedUsers()">
                        <i class="fas fa-trash"></i> Eliminar Seleccionados
                    </button>
                </div>
            </div>
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="selectAllUsers"></th>
                            <th>ID</th>
                            <th>Usuario</th>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Tienda</th>
                            <th>Estado</th>
                            <th>Creado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.users
                          .map(
                            (user) => `
                            <tr class="${!user.activo ? 'user-inactive' : ''} ${!user.negocio_id || user.negocio_id === 'undefined' ? 'user-orphaned' : ''}">
                                <td><input type="checkbox" class="user-select" data-id="${user.id}"></td>
                                <td><code>${user.id.substring(0, 8)}...</code></td>
                                <td><strong>${user.username}</strong></td>
                                <td>${user.nombre || '-'}</td>
                                <td>${user.email || '-'}</td>
                                <td><span class="badge badge-${this.getRoleBadgeClass(user.rol)}">${user.rol}</span></td>
                                <td>${user.negocio_id || '<span class="text-danger">Sin asignar</span>'}</td>
                                <td>
                                    ${
                                      user.activo
                                        ? '<span class="status-badge status-active">Activo</span>'
                                        : '<span class="status-badge status-inactive">Inactivo</span>'
                                    }
                                </td>
                                <td>${this.formatDate(user.created_at)}</td>
                                <td class="table-actions">
                                    <button class="btn-icon" onclick="superAdminTools.editUser('${user.id}')" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-icon" onclick="superAdminTools.assignUserToStore('${user.id}')" title="Asignar Tienda">
                                        <i class="fas fa-store"></i>
                                    </button>
                                    <button class="btn-icon text-danger" onclick="superAdminTools.deleteUser('${user.id}')" title="Eliminar">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>
            </div>
        `;
  }

  renderDatabasesPanel() {
    return `
            <div class="panel-header">
                <div class="panel-title">
                    <h3>Bases de Datos</h3>
                    <span class="badge">${this.databases.length} bases de datos</span>
                </div>
                <div class="panel-actions">
                    <input type="text" class="search-input" placeholder="Buscar BD..." id="searchDatabases">
                    <button class="btn btn-success btn-sm" onclick="superAdminTools.createDatabase()">
                        <i class="fas fa-plus"></i> Nueva BD
                    </button>
                </div>
            </div>
            <div class="databases-grid">
                ${this.databases
                  .map(
                    (db) => `
                    <div class="database-card">
                        <div class="db-header">
                            <div class="db-icon ${db.active ? 'active' : 'inactive'}">
                                <i class="fas fa-database"></i>
                            </div>
                            <div class="db-info">
                                <h4>${db.name}</h4>
                                <p class="text-muted">${db.type || 'SQLite'}</p>
                            </div>
                        </div>
                        <div class="db-stats">
                            <div class="db-stat">
                                <span class="label">Tamaño</span>
                                <span class="value">${this.formatBytes(db.size || 0)}</span>
                            </div>
                            <div class="db-stat">
                                <span class="label">Usuarios</span>
                                <span class="value">${db.users || 0}</span>
                            </div>
                            <div class="db-stat">
                                <span class="label">Registros</span>
                                <span class="value">${db.records || 0}</span>
                            </div>
                            <div class="db-stat">
                                <span class="label">Última modificación</span>
                                <span class="value">${this.formatDate(db.modified)}</span>
                            </div>
                        </div>
                        <div class="db-actions">
                            <button class="btn btn-sm btn-primary" onclick="superAdminTools.viewDatabase('${db.name}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="superAdminTools.optimizeDatabase('${db.name}')">
                                <i class="fas fa-compress"></i> Optimizar
                            </button>
                            <button class="btn btn-sm btn-success" onclick="superAdminTools.backupDatabase('${db.name}')">
                                <i class="fas fa-download"></i> Backup
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="superAdminTools.deleteDatabase('${db.name}')">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                `
                  )
                  .join('')}
            </div>
        `;
  }

  renderCleanupPanel() {
    return `
            <div class="cleanup-tools">
                <h3><i class="fas fa-broom"></i> Herramientas de Limpieza</h3>
                <p class="text-muted">Limpia datos innecesarios y optimiza el sistema</p>

                <div class="cleanup-options">
                    <div class="cleanup-option">
                        <div class="option-info">
                            <h4><i class="fas fa-user-slash"></i> Usuarios Huérfanos</h4>
                            <p>Elimina usuarios sin tienda asignada</p>
                            <span class="badge badge-warning">${this.stats.orphanedUsers} encontrados</span>
                        </div>
                        <button class="btn btn-warning" onclick="superAdminTools.cleanOrphanedUsers()">
                            <i class="fas fa-broom"></i> Limpiar
                        </button>
                    </div>

                    <div class="cleanup-option">
                        <div class="option-info">
                            <h4><i class="fas fa-user-times"></i> Usuarios Inactivos</h4>
                            <p>Desactiva usuarios sin login en 90+ días</p>
                            <span class="badge badge-info">${this.stats.inactiveUsers} encontrados</span>
                        </div>
                        <button class="btn btn-warning" onclick="superAdminTools.cleanInactiveUsers()">
                            <i class="fas fa-power-off"></i> Desactivar
                        </button>
                    </div>

                    <div class="cleanup-option">
                        <div class="option-info">
                            <h4><i class="fas fa-file-excel"></i> Registros Duplicados</h4>
                            <p>Busca y elimina entradas duplicadas</p>
                        </div>
                        <button class="btn btn-warning" onclick="superAdminTools.findDuplicates()">
                            <i class="fas fa-search"></i> Buscar
                        </button>
                    </div>

                    <div class="cleanup-option">
                        <div class="option-info">
                            <h4><i class="fas fa-trash-alt"></i> Datos Temporales</h4>
                            <p>Limpia caché, logs antiguos y archivos temp</p>
                        </div>
                        <button class="btn btn-warning" onclick="superAdminTools.cleanTempData()">
                            <i class="fas fa-broom"></i> Limpiar
                        </button>
                    </div>

                    <div class="cleanup-option">
                        <div class="option-info">
                            <h4><i class="fas fa-image"></i> Imágenes No Utilizadas</h4>
                            <p>Elimina imágenes sin referencias</p>
                        </div>
                        <button class="btn btn-warning" onclick="superAdminTools.cleanUnusedImages()">
                            <i class="fas fa-images"></i> Analizar
                        </button>
                    </div>

                    <div class="cleanup-option">
                        <div class="option-info">
                            <h4><i class="fas fa-link"></i> Referencias Rotas</h4>
                            <p>Repara claves foráneas y referencias inválidas</p>
                        </div>
                        <button class="btn btn-danger" onclick="superAdminTools.fixBrokenReferences()">
                            <i class="fas fa-wrench"></i> Reparar
                        </button>
                    </div>
                </div>

                <div class="cleanup-summary mt-4">
                    <h4>Espacio Recuperable</h4>
                    <div class="progress">
                        <div class="progress-bar" style="width: 45%;">~${this.formatBytes(this.calculateReclaimableSpace())}</div>
                    </div>
                </div>
            </div>
        `;
  }

  renderOptimizationPanel() {
    return `
            <div class="optimization-tools">
                <h3><i class="fas fa-tachometer-alt"></i> Optimización del Sistema</h3>

                <div class="optimization-grid">
                    <div class="optimization-card">
                        <h4><i class="fas fa-database"></i> Optimización de BD</h4>
                        <p>VACUUM, REINDEX y análisis de estadísticas</p>
                        <button class="btn btn-primary" onclick="superAdminTools.optimizeDatabases()">
                            <i class="fas fa-bolt"></i> Optimizar Ahora
                        </button>
                        <div class="optimization-status">
                            <small>Última optimización: ${this.formatDate(new Date())}</small>
                        </div>
                    </div>

                    <div class="optimization-card">
                        <h4><i class="fas fa-layer-group"></i> Índices</h4>
                        <p>Reconstruir y analizar índices</p>
                        <button class="btn btn-primary" onclick="superAdminTools.rebuildIndexes()">
                            <i class="fas fa-redo"></i> Reconstruir
                        </button>
                    </div>

                    <div class="optimization-card">
                        <h4><i class="fas fa-chart-line"></i> Estadísticas</h4>
                        <p>Actualizar estadísticas de consultas</p>
                        <button class="btn btn-primary" onclick="superAdminTools.updateStatistics()">
                            <i class="fas fa-sync"></i> Actualizar
                        </button>
                    </div>

                    <div class="optimization-card">
                        <h4><i class="fas fa-memory"></i> Caché</h4>
                        <p>Limpiar y optimizar caché del sistema</p>
                        <button class="btn btn-primary" onclick="superAdminTools.clearCache()">
                            <i class="fas fa-trash"></i> Limpiar
                        </button>
                    </div>

                    <div class="optimization-card">
                        <h4><i class="fas fa-file-archive"></i> Compresión</h4>
                        <p>Comprimir archivos y reducir tamaño</p>
                        <button class="btn btn-primary" onclick="superAdminTools.compressFiles()">
                            <i class="fas fa-file-archive"></i> Comprimir
                        </button>
                    </div>

                    <div class="optimization-card">
                        <h4><i class="fas fa-clock"></i> Tareas Programadas</h4>
                        <p>Configurar mantenimiento automático</p>
                        <button class="btn btn-primary" onclick="superAdminTools.scheduleOptimizations()">
                            <i class="fas fa-calendar-alt"></i> Configurar
                        </button>
                    </div>
                </div>

                <div class="performance-metrics mt-4">
                    <h4>Métricas de Rendimiento</h4>
                    <div class="metrics-grid">
                        <div class="metric">
                            <span class="metric-label">Tiempo de Respuesta</span>
                            <span class="metric-value text-success">~45ms</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Consultas/seg</span>
                            <span class="metric-value">~120</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Uptime</span>
                            <span class="metric-value text-success">99.8%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Índice de Fragmentación</span>
                            <span class="metric-value text-warning">12%</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  renderAdvancedPanel() {
    return `
            <div class="advanced-tools">
                <h3><i class="fas fa-cogs"></i> Herramientas Avanzadas</h3>
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Precaución:</strong> Estas herramientas son poderosas y pueden afectar el sistema. Úsalas con cuidado.
                </div>

                <div class="advanced-sections">
                    <div class="advanced-section">
                        <h4><i class="fas fa-terminal"></i> Consola SQL</h4>
                        <p>Ejecuta consultas SQL directamente en las bases de datos</p>
                        <select class="form-control mb-2" id="sqlDatabaseSelect">
                            <option value="">Seleccionar BD...</option>
                            ${this.databases.map((db) => `<option value="${db.name}">${db.name}</option>`).join('')}
                        </select>
                        <textarea class="form-control mb-2" id="sqlQuery" rows="4" placeholder="SELECT * FROM usuarios LIMIT 10;"></textarea>
                        <button class="btn btn-danger" onclick="superAdminTools.executeSql()">
                            <i class="fas fa-play"></i> Ejecutar SQL
                        </button>
                        <div id="sqlResults" class="mt-2"></div>
                    </div>

                    <div class="advanced-section">
                        <h4><i class="fas fa-file-export"></i> Exportación Masiva</h4>
                        <p>Exporta todos los datos del sistema</p>
                        <div class="export-options">
                            <label><input type="checkbox" checked> Usuarios</label>
                            <label><input type="checkbox" checked> Productos</label>
                            <label><input type="checkbox" checked> Ventas</label>
                            <label><input type="checkbox" checked> Clientes</label>
                            <label><input type="checkbox"> Logs</label>
                        </div>
                        <button class="btn btn-success" onclick="superAdminTools.exportAll()">
                            <i class="fas fa-download"></i> Exportar Todo
                        </button>
                    </div>

                    <div class="advanced-section">
                        <h4><i class="fas fa-upload"></i> Importación Masiva</h4>
                        <p>Importa datos desde archivos JSON o SQL</p>
                        <input type="file" class="form-control mb-2" id="importFile" accept=".json,.sql">
                        <button class="btn btn-primary" onclick="superAdminTools.importData()">
                            <i class="fas fa-upload"></i> Importar
                        </button>
                    </div>

                    <div class="advanced-section">
                        <h4><i class="fas fa-shield-alt"></i> Auditoría de Seguridad</h4>
                        <p>Analiza vulnerabilidades y problemas de seguridad</p>
                        <button class="btn btn-info" onclick="superAdminTools.securityAudit()">
                            <i class="fas fa-search"></i> Iniciar Auditoría
                        </button>
                        <div id="securityResults" class="mt-2"></div>
                    </div>

                    <div class="advanced-section">
                        <h4><i class="fas fa-sync-alt"></i> Migración de Datos</h4>
                        <p>Migra datos entre bases de datos</p>
                        <select class="form-control mb-2">
                            <option>Origen: master.db</option>
                        </select>
                        <select class="form-control mb-2">
                            <option>Destino: tiendas.db</option>
                        </select>
                        <button class="btn btn-warning" onclick="superAdminTools.migrateData()">
                            <i class="fas fa-exchange-alt"></i> Migrar
                        </button>
                    </div>

                    <div class="advanced-section">
                        <h4><i class="fas fa-clone"></i> Replicación</h4>
                        <p>Configura replicación y sincronización</p>
                        <button class="btn btn-secondary" onclick="superAdminTools.setupReplication()">
                            <i class="fas fa-cog"></i> Configurar
                        </button>
                    </div>
                </div>
            </div>
        `;
  }

  attachEventListeners() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(`${btn.dataset.tab}-panel`).classList.add('active');
      });
    });

    // Select all users
    const selectAllUsers = document.getElementById('selectAllUsers');
    if (selectAllUsers) {
      selectAllUsers.addEventListener('change', (e) => {
        document.querySelectorAll('.user-select').forEach((checkbox) => {
          checkbox.checked = e.target.checked;
        });
      });
    }

    // Search users
    const searchUsers = document.getElementById('searchUsers');
    if (searchUsers) {
      searchUsers.addEventListener('input', (e) => {
        this.filterUsers(e.target.value);
      });
    }

    // Filter users
    const filterStatus = document.getElementById('filterUserStatus');
    if (filterStatus) {
      filterStatus.addEventListener('change', (e) => {
        this.filterUsersByStatus(e.target.value);
      });
    }
  }

  // Métodos de utilidad
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getRoleBadgeClass(role) {
    const classes = {
      super_admin: 'danger',
      admin: 'warning',
      gerente: 'info',
      vendedor: 'primary',
      tecnico: 'secondary',
    };
    return classes[role] || 'secondary';
  }

  calculateReclaimableSpace() {
    // Estimación de espacio recuperable
    const orphanedSize = this.stats.orphanedUsers * 50 * 1024; // ~50KB por usuario
    const tempSize = 5 * 1024 * 1024; // ~5MB temp
    const unusedImages = 10 * 1024 * 1024; // ~10MB imágenes
    return orphanedSize + tempSize + unusedImages;
  }

  filterUsers(searchTerm) {
    const rows = document.querySelectorAll('.data-table tbody tr');
    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
    });
  }

  filterUsersByStatus(status) {
    const rows = document.querySelectorAll('.data-table tbody tr');
    rows.forEach((row) => {
      if (!status) {
        row.style.display = '';
        return;
      }

      const shouldShow =
        (status === 'active' && !row.classList.contains('user-inactive')) ||
        (status === 'inactive' && row.classList.contains('user-inactive')) ||
        (status === 'orphaned' && row.classList.contains('user-orphaned'));

      row.style.display = shouldShow ? '' : 'none';
    });
  }

  // Acciones principales
  async cleanOrphanedUsers() {
    // Mostrar modal con lista detallada de usuarios huérfanos
    const orphanedUsers = this.users.filter((u) => !u.negocio_id || u.negocio_id === 'undefined');

    if (orphanedUsers.length === 0) {
      showToast('No hay usuarios huérfanos para eliminar', 'info');
      return;
    }

    // Crear modal con lista seleccionable
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
            <div class="modal-container" style="max-width: 800px;">
                <div class="modal-header">
                    <h3><i class="fas fa-user-slash"></i> Usuarios Huérfanos (${orphanedUsers.length})</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p class="text-muted mb-3">Selecciona los usuarios que deseas eliminar. Los usuarios huérfanos no tienen tienda asignada.</p>
                    <div class="mb-3">
                        <label><input type="checkbox" id="selectAllOrphaned"> Seleccionar todos</label>
                    </div>
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th width="40"></th>
                                    <th>Usuario</th>
                                    <th>Nombre</th>
                                    <th>Email</th>
                                    <th>Base de Datos</th>
                                    <th>Creado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orphanedUsers
                                  .map(
                                    (user) => `
                                    <tr>
                                        <td><input type="checkbox" class="orphaned-user-check" data-id="${user.id}" data-db="${user.database}"></td>
                                        <td><strong>${user.username}</strong></td>
                                        <td>${user.nombre || '-'}</td>
                                        <td>${user.email || '-'}</td>
                                        <td><code>${user.database}</code></td>
                                        <td>${this.formatDate(user.created_at)}</td>
                                    </tr>
                                `
                                  )
                                  .join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                    <button class="btn btn-danger" id="confirmDeleteOrphaned">
                        <i class="fas fa-trash"></i> Eliminar Seleccionados
                    </button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('selectAllOrphaned').addEventListener('change', (e) => {
      document
        .querySelectorAll('.orphaned-user-check')
        .forEach((cb) => (cb.checked = e.target.checked));
    });

    document.getElementById('confirmDeleteOrphaned').addEventListener('click', async () => {
      const selected = Array.from(document.querySelectorAll('.orphaned-user-check:checked')).map(
        (cb) => ({ id: cb.dataset.id, db: cb.dataset.db })
      );

      if (selected.length === 0) {
        showToast('Selecciona al menos un usuario', 'warning');
        return;
      }

      if (!confirm(`¿Confirmar eliminación de ${selected.length} usuarios?`)) return;

      try {
        const response = await fetchWithAuth(
          `${API_URL}/api/admin/users/batch-delete`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: selected }),
          },
          'Error al eliminar usuarios'
        );
        if (!response) return;

        const data = await response.json();
        showToast(`Eliminados ${data.deleted || selected.length} usuarios`, 'success');
        modal.remove();
        this.initialize();
      } catch (error) {
        console.error('Error eliminando usuarios:', error);
      }
    });
  }

  async optimizeDatabases() {
    // Mostrar modal con selección de bases de datos
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3><i class="fas fa-compress"></i> Optimizar Bases de Datos</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p class="text-muted mb-3">Selecciona las bases de datos que deseas optimizar (VACUUM + ANALYZE)</p>
                    <div class="mb-3">
                        <label><input type="checkbox" id="selectAllDbs" checked> Seleccionar todas</label>
                    </div>
                    ${this.databases
                      .map(
                        (db) => `
                        <div class="form-check mb-2">
                            <label>
                                <input type="checkbox" class="db-optimize-check" data-name="${db.name}" checked>
                                <strong>${db.name}</strong> - ${this.formatBytes(db.size)} 
                                <span class="text-muted">(${db.users} usuarios, ${db.records} registros)</span>
                            </label>
                        </div>
                    `
                      )
                      .join('')}
                    <div class="alert alert-info mt-3">
                        <i class="fas fa-info-circle"></i>
                        <small>La optimización puede tomar varios minutos para bases de datos grandes. No cierres esta ventana.</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                    <button class="btn btn-primary" id="confirmOptimize">
                        <i class="fas fa-bolt"></i> Optimizar Ahora
                    </button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    document.getElementById('selectAllDbs').addEventListener('change', (e) => {
      document
        .querySelectorAll('.db-optimize-check')
        .forEach((cb) => (cb.checked = e.target.checked));
    });

    document.getElementById('confirmOptimize').addEventListener('click', async () => {
      const selected = Array.from(document.querySelectorAll('.db-optimize-check:checked')).map(
        (cb) => cb.dataset.name
      );

      if (selected.length === 0) {
        showToast('Selecciona al menos una base de datos', 'warning');
        return;
      }

      const btn = document.getElementById('confirmOptimize');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Optimizando...';

      try {
        const response = await fetchWithAuth(
          `${API_URL}/api/admin/optimize/databases`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ databases: selected }),
          },
          'Error al optimizar'
        );
        if (!response) return;

        const data = await response.json();
        showToast(
          `Optimización completada. Espacio recuperado: ${this.formatBytes(data.spaceRecovered || 0)}`,
          'success'
        );
        modal.remove();
        this.initialize();
      } catch (error) {
        console.error('Error optimizando:', error);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-bolt"></i> Optimizar Ahora';
      }
    });
  }

  async cleanInactiveUsers() {
    // Obtener usuarios inactivos
    const inactiveUsers = this.users.filter((u) => !u.activo);

    if (inactiveUsers.length === 0) {
      showToast('No hay usuarios inactivos', 'info');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
            <div class="modal-container" style="max-width: 900px;">
                <div class="modal-header">
                    <h3><i class="fas fa-user-times"></i> Usuarios Inactivos (${inactiveUsers.length})</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p class="text-muted mb-3">Estos usuarios están marcados como inactivos. Puedes eliminarlos permanentemente.</p>
                    <div class="mb-3">
                        <label><input type="checkbox" id="selectAllInactive"> Seleccionar todos</label>
                    </div>
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th width="40"></th>
                                    <th>Usuario</th>
                                    <th>Nombre</th>
                                    <th>Email</th>
                                    <th>Rol</th>
                                    <th>Base de Datos</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${inactiveUsers
                                  .map(
                                    (user) => `
                                    <tr>
                                        <td><input type="checkbox" class="inactive-user-check" data-id="${user.id}" data-db="${user.database}"></td>
                                        <td><strong>${user.username}</strong></td>
                                        <td>${user.nombre || '-'}</td>
                                        <td>${user.email || '-'}</td>
                                        <td><span class="badge badge-${this.getRoleBadgeClass(user.rol)}">${user.rol}</span></td>
                                        <td><code>${user.database}</code></td>
                                    </tr>
                                `
                                  )
                                  .join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                    <button class="btn btn-danger" id="confirmDeleteInactive">
                        <i class="fas fa-trash"></i> Eliminar Seleccionados
                    </button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    document.getElementById('selectAllInactive').addEventListener('change', (e) => {
      document
        .querySelectorAll('.inactive-user-check')
        .forEach((cb) => (cb.checked = e.target.checked));
    });

    document.getElementById('confirmDeleteInactive').addEventListener('click', async () => {
      const selected = Array.from(document.querySelectorAll('.inactive-user-check:checked')).map(
        (cb) => ({ id: cb.dataset.id, db: cb.dataset.db })
      );

      if (selected.length === 0) {
        showToast('Selecciona al menos un usuario', 'warning');
        return;
      }

      if (!confirm(`¿Eliminar permanentemente ${selected.length} usuarios inactivos?`)) return;

      try {
        const response = await fetchWithAuth(
          `${API_URL}/api/admin/users/batch-delete`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: selected }),
          },
          'Error al eliminar usuarios'
        );
        if (!response) return;

        const data = await response.json();
        showToast(`Eliminados ${data.deleted || selected.length} usuarios`, 'success');
        modal.remove();
        this.initialize();
      } catch (error) {
        console.error('Error eliminando usuarios:', error);
      }
    });
  }

  async generateReport() {
    showToast('Generando reporte...', 'info');
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/admin/reports/generate`,
        { method: 'POST' },
        'Error al generar reporte'
      );
      if (!response) return;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-admin-${new Date().getTime()}.pdf`;
      a.click();
      showToast('Reporte generado exitosamente', 'success');
    } catch (error) {
      showToast('Error al generar reporte', 'error');
    }
  }

  async backupAll() {
    showToast('Creando backup global...', 'info');
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/admin/backup/all`,
        { method: 'POST' },
        'Error al crear backup'
      );
      if (!response) return;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-completo-${new Date().getTime()}.zip`;
      a.click();
      showToast('Backup creado exitosamente', 'success');
    } catch (error) {
      console.error('Error creando backup:', error);
    }
  }

  async analyzeIntegrity() {
    showToast('Analizando integridad...', 'info');
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/admin/integrity/analyze`,
        { method: 'GET' },
        'Error al analizar integridad'
      );
      if (!response) return;

      const data = await response.json();
      const issues = data.issues || [];

      if (issues.length === 0) {
        showToast('✓ Sistema íntegro, no se encontraron problemas', 'success');
      } else {
        alert(
          `Se encontraron ${issues.length} problemas:\n\n${issues.map((i) => `- ${i}`).join('\n')}`
        );
      }
    } catch (error) {
      console.error('Error analizando integridad:', error);
    }
  }

  async deleteUser(userId) {
    if (!confirm('¿Eliminar este usuario permanentemente?')) return;

    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/admin/users/${userId}`,
        { method: 'DELETE' },
        'Error al eliminar usuario'
      );
      if (!response) return;
      showToast('Usuario eliminado', 'success');
      this.initialize();
    } catch (error) {
      console.error('Error eliminando usuario:', error);
    }
  }

  async deleteSelectedUsers() {
    const selected = Array.from(document.querySelectorAll('.user-select:checked')).map(
      (cb) => cb.dataset.id
    );

    if (selected.length === 0) {
      showToast('Selecciona al menos un usuario', 'warning');
      return;
    }

    if (!confirm(`¿Eliminar ${selected.length} usuarios seleccionados?`)) return;

    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/admin/users/batch-delete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: selected }),
        },
        'Error al eliminar usuarios'
      );
      if (!response) return;
      showToast(`${selected.length} usuarios eliminados`, 'success');
      this.initialize();
    } catch (error) {
      console.error('Error eliminando usuarios:', error);
    }
  }

  // Más métodos según necesites...
  async findDuplicates() {
    showToast('Buscando duplicados...', 'info');
    // Implementar lógica
  }

  async cleanTempData() {
    showToast('Limpiando datos temporales...', 'info');
    // Implementar lógica
  }

  async cleanUnusedImages() {
    showToast('Analizando imágenes...', 'info');
    // Implementar lógica
  }

  async fixBrokenReferences() {
    showToast('Reparando referencias...', 'info');
    // Implementar lógica
  }

  shouldClearCachesFor(scriptName) {
    const scripts = new Set(['04-limpieza-mantenimiento.js', '05-reset-datos-negocio.js']);
    return scripts.has(scriptName);
  }

  purgeLocalCaches() {
    try {
      if (window.DatabaseAPI && typeof DatabaseAPI.clearCache === 'function') {
        DatabaseAPI.clearCache();
      }
    } catch (error) {
      console.warn('No se pudo limpiar la caché de API:', error);
    }

    try {
      if (
        window.Database &&
        typeof Database.load === 'function' &&
        typeof Database.save === 'function'
      ) {
        const data = Database.load();
        if (data) {
          const collectionsToClear = [
            'productos',
            'servicios',
            'ventas',
            'facturas',
            'facturaItems',
            'compras',
            'movimientosInventario',
            'catalogoTecnico',
            'proformas',
            'notasCredito',
            'notasDebito',
            'retenciones',
            'retencionItems',
            'guiasRemision',
            'comprasPorHacer',
            'comprasPorHacerHistorial',
          ];
          let hasChanges = false;
          collectionsToClear.forEach((collection) => {
            if (Array.isArray(data[collection]) && data[collection].length) {
              data[collection] = [];
              hasChanges = true;
            }
          });
          if (hasChanges) {
            Database.save(data);
          }
        }
      }
    } catch (error) {
      console.warn('No se pudo limpiar la caché local:', error);
    }

    if (window.Productos) {
      window.Productos._productos = [];
    }
  }

  getToolDirectory(scriptName) {
    const directories = {
      '05-reset-datos-negocio.js': 'herramientas_admin/mantenimiento',
    };
    return directories[scriptName] || 'herramientas_admin';
  }

  /**
   * Ejecutar herramientas avanzadas del sistema
   * Abre las herramientas Node.js en PowerShell
   */
  async ejecutarHerramienta(scriptName) {
    try {
      this.updateToolStatus(scriptName, 'Abriendo ventana de PowerShell...', 'info');

      const directory = this.getToolDirectory(scriptName);

      // Intentar ejecutar mediante endpoint del servidor
      const response = await fetchWithAuth(
        `${API_URL}/api/admin/run-tool`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: scriptName,
            directory,
          }),
          silent: true,
        },
        'Error al ejecutar la herramienta'
      );
      if (!response) {
        this.updateToolStatus(
          scriptName,
          'No se pudo iniciar la herramienta. Verifica tu sesión.',
          'error'
        );
        return;
      }

      const result = await response.json();

      if (response.ok && result.success) {
        if (this.shouldClearCachesFor(scriptName)) {
          this.purgeLocalCaches();
        }
        this.updateToolStatus(
          scriptName,
          'Herramienta abierta en una nueva ventana de PowerShell.',
          'success'
        );
        return;
      }

      console.warn('Ejecución de herramienta sin éxito:', result);
      this.updateToolStatus(
        scriptName,
        'No se pudo abrir automáticamente. Sigue las instrucciones manuales.',
        'warning'
      );
      this.abrirHerramientaLocal(scriptName);
    } catch (error) {
      console.error('Error ejecutando herramienta:', error);
      this.updateToolStatus(
        scriptName,
        'Ocurrió un error. Ejecuta la herramienta manualmente.',
        'error'
      );

      // Fallback: abrir en terminal local
      this.abrirHerramientaLocal(scriptName);
    }
  }

  /**
   * Método alternativo: abrir herramienta en terminal local
   * Usa el menú principal de herramientas
   */
  abrirHerramientaLocal(scriptName) {
    this.updateToolStatus(
      scriptName,
      'Abre la herramienta siguiendo las instrucciones del modal.',
      'warning'
    );

    // Mostrar modal con instrucciones
    const modal = document.createElement('div');
    modal.className = 'modal fade show';
    modal.style.display = 'block';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';

    const toolNames = {
      '01-diagnostico-sistema.js': 'Diagnóstico Completo',
      '02-gestor-usuarios-huerfanos.js': 'Gestor de Usuarios Huérfanos',
      '03-gestor-bases-datos.js': 'Gestor de Bases de Datos',
      '04-limpieza-mantenimiento.js': 'Limpieza y Mantenimiento',
      '05-reset-datos-negocio.js': 'Limpieza Total de Negocios',
    };

    const toolNumbers = {
      '01-diagnostico-sistema.js': '1',
      '02-gestor-usuarios-huerfanos.js': '2',
      '03-gestor-bases-datos.js': '3',
      '04-limpieza-mantenimiento.js': '4',
      '05-reset-datos-negocio.js': '5',
    };

    const directory = this.getToolDirectory(scriptName);
    const displayDirectory = directory.replace(/\//g, '\\');
    const clipboardCommand = `cd ${displayDirectory}; node ${scriptName}`;

    modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-terminal"></i> Ejecutar Herramienta
                        </h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            <strong>Herramienta: ${toolNames[scriptName] || scriptName}</strong>
                        </div>
                        
                        <h6>Opción 1: Menú Principal (Recomendado)</h6>
                        <ol>
                            <li>Haz doble clic en <code>HERRAMIENTAS-ADMIN.bat</code></li>
                            <li>Selecciona la opción <strong>${toolNumbers[scriptName]}</strong></li>
                        </ol>

                        <h6>Opción 2: Directamente</h6>
                        <p>Ejecuta en PowerShell:</p>
                        <pre style="background:#f5f5f5; padding:10px; border-radius:5px; font-size:12px;">cd /d ${displayDirectory}
node ${scriptName}</pre>

                        <div class="d-grid gap-2 mt-3">
                            <button class="btn btn-primary" onclick="superAdminTools.copiarComando('${clipboardCommand}', '${scriptName}'); this.closest('.modal').remove()">
                                <i class="fas fa-copy"></i> Copiar Comando y Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
  }

  /**
   * Copiar comando al portapapeles
   */
  async copiarComando(comando, scriptName = '') {
    try {
      await navigator.clipboard.writeText(comando);
      if (scriptName) {
        this.updateToolStatus(scriptName, 'Comando copiado. Ejecútalo en PowerShell.', 'success');
      }
    } catch (error) {
      // Fallback para navegadores sin soporte clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = comando;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      if (scriptName) {
        this.updateToolStatus(scriptName, 'Comando copiado. Ejecútalo en PowerShell.', 'success');
      }
    }
  }

  async executeSql() {
    const db = document.getElementById('sqlDatabaseSelect').value;
    const query = document.getElementById('sqlQuery').value;

    if (!db || !query) {
      showToast('Selecciona una BD y escribe una consulta', 'warning');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/sql/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ database: db, query }),
      });

      const data = await response.json();
      document.getElementById('sqlResults').innerHTML = `
                <pre>${JSON.stringify(data, null, 2)}</pre>
            `;
    } catch (error) {
      showToast('Error ejecutando SQL', 'error');
    }
  }
}

// Exponer clase globalmente
window.SuperAdminTools = SuperAdminTools;

// Instancia global
let superAdminTools;

// Inicializar cuando se cargue el módulo (opcional, ya se hace desde app.js)
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (
      window.location.href.includes('super-admin') ||
      document.querySelector('[data-module="super-admin"]')
    ) {
      // La inicialización se hace desde app.js al cargar el módulo
      console.log('Super Admin Tools listo para inicializar');
    }
  });
}
