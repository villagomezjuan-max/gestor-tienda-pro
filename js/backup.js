// ============================================
// MÓDULO: BACKUP Y GESTIÓN DE DATOS
// ============================================
// Exportación, importación y respaldos automáticos

window.Backup = {
  // ============================================
  // RENDERIZAR VISTA PRINCIPAL
  // ============================================
  async render(container) {
    const backupsAutomaticos = this.obtenerBackupsAutomaticos();
    const estadoAlmacenamiento = this.obtenerEstadoAlmacenamiento();

    container.innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-database"></i> Backup y Gestión de Datos</h2>
      </div>

      <!-- Información de almacenamiento -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-info-circle"></i> Información de Almacenamiento</h3>
        </div>
        <div class="card-body">
          <div class="storage-info">
            <div class="storage-bar">
              <div class="storage-used" style="width: ${estadoAlmacenamiento.porcentaje}%"></div>
            </div>
            <div class="storage-details">
              <span><strong>Usado:</strong> ${estadoAlmacenamiento.usado}</span>
              <span><strong>Disponible:</strong> ${estadoAlmacenamiento.disponible}</span>
              <span><strong>Total:</strong> ${estadoAlmacenamiento.total}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Backup Manual -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-download"></i> Backup Manual</h3>
        </div>
        <div class="card-body">
          <p>Exporta todos los datos del sistema en formato JSON</p>
          <button class="btn btn-primary" onclick="Backup.exportarTodo()">
            <i class="fas fa-download"></i> Exportar Todos los Datos
          </button>
          <button class="btn btn-secondary" onclick="Backup.exportarPorColeccion()">
            <i class="fas fa-file-export"></i> Exportar por Colección
          </button>
        </div>
      </div>

      <!-- Importar Datos -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-upload"></i> Importar Datos</h3>
        </div>
        <div class="card-body">
          <p>Importa datos desde un archivo de respaldo JSON</p>
          <input type="file" id="fileImportar" accept=".json" style="display: none" onchange="Backup.importarDatos()">
          <button class="btn btn-success" onclick="document.getElementById('fileImportar').click()">
            <i class="fas fa-upload"></i> Importar desde Archivo
          </button>
          <div class="alert alert-warning" style="margin-top: 1rem;">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Advertencia:</strong> Al importar datos, se creará un backup automático antes de proceder.
          </div>
        </div>
      </div>

      <!-- Backups Automáticos (IndexedDB) -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-clock"></i> Backups Automáticos (IndexedDB)</h3>
        </div>
        <div class="card-body">
          <p>Sistema automático que guarda backups cada 24 horas (últimos 7 días)</p>
          <div id="backupsAutomaticosContainer">
            <div class="spinner-small">Cargando backups automáticos...</div>
          </div>
          <div class="mt-2">
            <button class="btn btn-success" onclick="AutoBackup.forzarBackup()">
              <i class="fas fa-sync"></i> Forzar Backup Ahora
            </button>
          </div>
        </div>
      </div>

      <!-- Backups Manuales (LocalStorage) -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-history"></i> Backups Manuales Anteriores</h3>
        </div>
        <div class="card-body">
          <p>Backups creados manualmente (guardados en LocalStorage)</p>
          ${
            backupsAutomaticos.length > 0
              ? `
            <div class="backups-list">
              ${backupsAutomaticos
                .map(
                  (backup, index) => `
                <div class="backup-item">
                  <div class="backup-info">
                    <strong>${backup.fecha}</strong>
                    <small>${backup.tamano}</small>
                  </div>
                  <div class="backup-actions">
                    <button class="btn btn-sm btn-secondary" onclick="Backup.restaurarBackup(${index})">
                      <i class="fas fa-undo"></i> Restaurar
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="Backup.descargarBackup(${index})">
                      <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="Backup.eliminarBackup(${index})">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          `
              : '<p class="text-muted">No hay backups manuales disponibles</p>'
          }
        </div>
      </div>

      <!-- Resetear Datos -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-exclamation-triangle"></i> Zona Peligrosa</h3>
        </div>
        <div class="card-body">
          <p>Estas acciones son irreversibles. Usa con precaución.</p>
          <button class="btn btn-warning" onclick="Backup.resetearDatos()">
            <i class="fas fa-redo"></i> Resetear a Datos de Demo
          </button>
          <button class="btn btn-danger" onclick="Backup.eliminarTodo()">
            <i class="fas fa-trash-alt"></i> Eliminar Todos los Datos
          </button>
        </div>
      </div>
    `;

    // Cargar backups automáticos de IndexedDB
    this.cargarBackupsAutomaticos();
  },

  // ============================================
  // CARGAR BACKUPS AUTOMÁTICOS
  // ============================================
  async cargarBackupsAutomaticos() {
    const container = document.getElementById('backupsAutomaticosContainer');
    if (!container) return;

    try {
      const html = await AutoBackup.renderListaBackups();
      container.innerHTML = html;
    } catch (error) {
      console.error('Error al cargar backups automáticos:', error);
      container.innerHTML = '<p class="text-error">Error al cargar backups automáticos</p>';
    }
  },

  // ============================================
  // EXPORTAR TODOS LOS DATOS
  // ============================================
  exportarTodo() {
    const datos = Database.exportAll();
    const config = Database.get('configTienda') || {};

    const backup = {
      version: '1.0.0',
      fecha: new Date().toISOString(),
      tipoTienda: config ? config.tipoTienda : null,
      nombreTienda: config ? config.nombreTienda : 'Mi Tienda',
      datos: datos,
      estadisticas: {
        totalProductos: datos.productos?.length || 0,
        totalClientes: datos.clientes?.length || 0,
        totalProveedores: datos.proveedores?.length || 0,
        totalVentas: datos.ventas?.length || 0,
        totalCompras: datos.compras?.length || 0,
      },
    };

    const nombreArchivo = `backup_${Utils.getCurrentDate()}_${Utils.getCurrentTime().replace(/:/g, '-')}.json`;
    this.descargarJSON(backup, nombreArchivo);

    // Guardar también como backup automático
    this.guardarBackupAutomatico(backup);

    Utils.showToast('Backup exportado exitosamente', 'success');
  },

  // ============================================
  // EXPORTAR POR COLECCIÓN
  // ============================================
  exportarPorColeccion() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalExportarColeccion';
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3><i class="fas fa-file-export"></i> Exportar por Colección</h3>
          <button class="btn-close" onclick="document.getElementById('modalExportarColeccion').remove()">×</button>
        </div>
        <div class="modal-body">
          <p>Selecciona las colecciones que deseas exportar:</p>
          <div class="colecciones-list">
            <label><input type="checkbox" name="coleccion" value="productos" checked> Productos</label>
            <label><input type="checkbox" name="coleccion" value="clientes" checked> Clientes</label>
            <label><input type="checkbox" name="coleccion" value="proveedores" checked> Proveedores</label>
            <label><input type="checkbox" name="coleccion" value="ventas" checked> Ventas</label>
            <label><input type="checkbox" name="coleccion" value="compras" checked> Compras</label>
            <label><input type="checkbox" name="coleccion" value="cuentasPorCobrar"> Cuentas por Cobrar</label>
            <label><input type="checkbox" name="coleccion" value="cuentasPorPagar"> Cuentas por Pagar</label>
            <label><input type="checkbox" name="coleccion" value="recordatorios"> Recordatorios</label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalExportarColeccion').remove()">
            Cancelar
          </button>
          <button class="btn btn-primary" onclick="Backup.confirmarExportarColecciones()">
            <i class="fas fa-download"></i> Exportar Seleccionadas
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  confirmarExportarColecciones() {
    const checkboxes = document.querySelectorAll('input[name="coleccion"]:checked');
    const coleccionesSeleccionadas = Array.from(checkboxes).map((cb) => cb.value);

    if (coleccionesSeleccionadas.length === 0) {
      Utils.showToast('Selecciona al menos una colección', 'warning');
      return;
    }

    const datos = {};
    coleccionesSeleccionadas.forEach((col) => {
      datos[col] = Database.getCollection(col);
    });

    const backup = {
      version: '1.0.0',
      fecha: new Date().toISOString(),
      colecciones: coleccionesSeleccionadas,
      datos: datos,
    };

    const nombreArchivo = `backup_parcial_${Utils.getCurrentDate()}.json`;
    this.descargarJSON(backup, nombreArchivo);

    document.getElementById('modalExportarColeccion').remove();
    Utils.showToast('Backup parcial exportado', 'success');
  },

  // ============================================
  // IMPORTAR DATOS
  // ============================================
  async importarDatos() {
    const fileInput = document.getElementById('fileImportar');
    const file = fileInput.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result);

        // Validar estructura
        if (!backup.datos) {
          Utils.showToast('Archivo de backup inválido', 'error');
          return;
        }

        // Mostrar vista previa
        this.mostrarVistaPrevia(backup);
      } catch (error) {
        Utils.showToast('Error al leer el archivo', 'error');
        console.error(error);
      }
    };

    reader.readAsText(file);
    fileInput.value = '';
  },

  // ============================================
  // VISTA PREVIA DE IMPORTACIÓN
  // ============================================
  mostrarVistaPrevia(backup) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalVistaPrevia';
    modal.innerHTML = `
      <div class="modal-container modal-large">
        <div class="modal-header">
          <h3><i class="fas fa-eye"></i> Vista Previa de Importación</h3>
          <button class="btn-close" onclick="document.getElementById('modalVistaPrevia').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="backup-preview">
            <p><strong>Fecha del Backup:</strong> ${backup.fecha}</p>
            <p><strong>Versión:</strong> ${backup.version || '1.0.0'}</p>
            ${backup.nombreTienda ? `<p><strong>Tienda:</strong> ${backup.nombreTienda}</p>` : ''}
            
            <h4>Datos a Importar:</h4>
            <ul>
              ${Object.keys(backup.datos)
                .map((key) => {
                  const count = Array.isArray(backup.datos[key]) ? backup.datos[key].length : 0;
                  return `<li><strong>${key}:</strong> ${count} registros</li>`;
                })
                .join('')}
            </ul>

            <div class="form-group">
              <label>
                <input type="radio" name="modoImportar" value="reemplazar" checked> 
                Reemplazar datos existentes (se creará backup automático)
              </label>
            </div>
            <div class="form-group">
              <label>
                <input type="radio" name="modoImportar" value="combinar"> 
                Combinar con datos existentes
              </label>
            </div>

            <div class="alert alert-warning">
              <i class="fas fa-exclamation-triangle"></i>
              <strong>Advertencia:</strong> Se creará un backup automático antes de importar.
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalVistaPrevia').remove()">
            Cancelar
          </button>
          <button class="btn btn-success" onclick="Backup.confirmarImportar()">
            <i class="fas fa-check"></i> Confirmar Importación
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Guardar backup temporal para confirmación
    this.backupTemporal = backup;
  },

  // ============================================
  // CONFIRMAR IMPORTACIÓN
  // ============================================
  confirmarImportar() {
    const modo = document.querySelector('input[name="modoImportar"]:checked').value;
    const backup = this.backupTemporal;

    Utils.showConfirm(
      '¿Estás seguro de importar estos datos? Se creará un backup automático antes de proceder.',
      () => {
        // Crear backup automático antes de importar
        const datosActuales = Database.exportAll();
        const backupAntes = {
          version: '1.0.0',
          fecha: new Date().toISOString(),
          tipo: 'Backup antes de importar',
          datos: datosActuales,
        };
        this.guardarBackupAutomatico(backupAntes);

        // Importar datos
        if (modo === 'reemplazar') {
          // Limpiar todo y reemplazar
          Object.keys(backup.datos).forEach((coleccion) => {
            Database.setCollection(coleccion, backup.datos[coleccion]);
          });
        } else {
          // Combinar datos
          Object.keys(backup.datos).forEach((coleccion) => {
            const datosActuales = Database.getCollection(coleccion);
            const datosCombinados = [...datosActuales, ...backup.datos[coleccion]];
            Database.setCollection(coleccion, datosCombinados);
          });
        }

        document.getElementById('modalVistaPrevia').remove();
        Utils.showToast('Datos importados exitosamente', 'success');

        // NOTA: En este caso SÍ es necesario recargar porque se reemplazan
        // todos los datos de la aplicación (productos, clientes, ventas, etc.)
        setTimeout(() => {
          location.reload();
        }, 1500);
      }
    );
  },

  // ============================================
  // BACKUPS AUTOMÁTICOS
  // ============================================
  guardarBackupAutomatico(backup) {
    const backups = JSON.parse(localStorage.getItem('backupsAutomaticos') || '[]');

    // Agregar nuevo backup
    backups.unshift({
      fecha: new Date().toISOString(),
      datos: backup,
    });

    // Mantener solo los últimos 10
    if (backups.length > 10) {
      backups.splice(10);
    }

    localStorage.setItem('backupsAutomaticos', JSON.stringify(backups));
  },

  obtenerBackupsAutomaticos() {
    const backups = JSON.parse(localStorage.getItem('backupsAutomaticos') || '[]');

    return backups.map((b) => ({
      fecha: new Date(b.fecha).toLocaleString('es-ES'),
      tamano: this.calcularTamano(JSON.stringify(b.datos)),
      datos: b.datos,
    }));
  },

  restaurarBackup(index) {
    const backups = JSON.parse(localStorage.getItem('backupsAutomaticos') || '[]');

    if (!backups[index]) {
      Utils.showToast('Backup no encontrado', 'error');
      return;
    }

    Utils.showConfirm(
      '¿Estás seguro de restaurar este backup? Los datos actuales se reemplazarán.',
      () => {
        const backup = backups[index].datos;

        // Importar datos del backup
        Object.keys(backup.datos).forEach((coleccion) => {
          Database.setCollection(coleccion, backup.datos[coleccion]);
        });

        Utils.showToast('Backup restaurado exitosamente', 'success');

        // Recargar página
        setTimeout(() => {
          location.reload();
        }, 1500);
      }
    );
  },

  descargarBackup(index) {
    const backups = JSON.parse(localStorage.getItem('backupsAutomaticos') || '[]');

    if (!backups[index]) {
      Utils.showToast('Backup no encontrado', 'error');
      return;
    }

    const backup = backups[index].datos;
    const nombreArchivo = `backup_automatico_${index + 1}.json`;
    this.descargarJSON(backup, nombreArchivo);

    Utils.showToast('Backup descargado', 'success');
  },

  eliminarBackup(index) {
    Utils.showConfirm('¿Estás seguro de eliminar este backup?', () => {
      const backups = JSON.parse(localStorage.getItem('backupsAutomaticos') || '[]');
      backups.splice(index, 1);
      localStorage.setItem('backupsAutomaticos', JSON.stringify(backups));

      Utils.showToast('Backup eliminado', 'success');
      App.loadModule('backup');
    });
  },

  // ============================================
  // RESETEAR DATOS
  // ============================================
  resetearDatos() {
    Utils.showConfirm(
      '¿Estás seguro de resetear todos los datos a los datos de demo? Esta acción creará un backup antes de proceder.',
      () => {
        // Crear backup antes de resetear
        this.exportarTodo();

        // Resetear a datos de demo (si existen)
        Database.resetToDemo();

        Utils.showToast('Datos reseteados a demo', 'success');

        setTimeout(() => {
          location.reload();
        }, 1500);
      }
    );
  },

  eliminarTodo() {
    Utils.showConfirm(
      '⚠️ ADVERTENCIA: ¿Estás ABSOLUTAMENTE SEGURO de eliminar TODOS los datos? Esta acción NO se puede deshacer. Se creará un backup antes de proceder.',
      () => {
        Utils.showConfirm(
          '¿REALMENTE estás seguro? Escribe "ELIMINAR TODO" para confirmar (esta confirmación aún no está implementada, pero considera esta tu última oportunidad).',
          () => {
            // Crear backup final antes de eliminar
            this.exportarTodo();

            // Eliminar todas las colecciones
            Database.clearAll();

            Utils.showToast('Todos los datos han sido eliminados', 'success');

            setTimeout(() => {
              location.reload();
            }, 2000);
          }
        );
      }
    );
  },

  // ============================================
  // UTILIDADES
  // ============================================
  descargarJSON(datos, nombreArchivo) {
    const dataStr = JSON.stringify(datos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  },

  calcularTamano(str) {
    const bytes = new Blob([str]).size;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  },

  obtenerEstadoAlmacenamiento() {
    let usado = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        usado += localStorage[key].length + key.length;
      }
    }

    const total = 5 * 1024 * 1024; // 5MB aproximado
    const disponible = total - usado;
    const porcentaje = (usado / total) * 100;

    return {
      usado: this.calcularTamano(JSON.stringify(localStorage)),
      disponible: this.calcularTamano(''.padStart(disponible, 'x')),
      total: '~5 MB',
      porcentaje: Math.min(porcentaje, 100),
    };
  },
};
