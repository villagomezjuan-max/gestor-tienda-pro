// ============================================
// MÓDULO: BACKUP AUTOMÁTICO
// ============================================
// Sistema de respaldo automático con IndexedDB
// Realiza backups cada 24 horas y mantiene últimos 7

const AutoBackup = {
  // Constantes de configuración
  INTERVAL: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
  MAX_BACKUPS: 7, // Máximo de backups a mantener
  DB_NAME: 'GestorTiendaBackups', // Nombre de la base IndexedDB
  STORE_NAME: 'backups', // Nombre del almacén de objetos
  LAST_BACKUP_KEY: 'lastBackupDate', // Clave en localStorage para última fecha

  db: null, // Referencia a la base de datos IndexedDB
  intervalId: null, // ID del intervalo de backup automático

  /**
   * Inicializa el sistema de backup automático
   * Abre la base de datos IndexedDB y programa backups periódicos
   */
  async iniciar() {
    console.log('Iniciando sistema de backup automático...');

    try {
      // Abrir o crear base de datos IndexedDB
      await this.abrirDB();

      // Verificar si necesitamos hacer un backup inmediato
      const lastBackup = localStorage.getItem(this.LAST_BACKUP_KEY);
      const now = Date.now();

      if (!lastBackup || now - parseInt(lastBackup) > this.INTERVAL) {
        // Hacer backup inmediato
        await this.realizarBackup();
      }

      // Programar backups automáticos cada 24 horas
      this.intervalId = setInterval(() => {
        this.realizarBackup();
      }, this.INTERVAL);

      // Limpiar backups antiguos
      await this.limpiarBackupsAntiguos();

      console.log('Sistema de backup automático iniciado correctamente');

      // Mostrar información del último backup
      const info = await this.obtenerInfoUltimoBackup();
      if (info) {
        console.log(`Último backup: ${new Date(info.fecha).toLocaleString()}`);
      }
    } catch (error) {
      console.error('Error al iniciar sistema de backup automático:', error);
      Utils.showToast('Error al iniciar backups automáticos', 'error');
    }
  },

  /**
   * Abre o crea la base de datos IndexedDB
   * @returns {Promise} Promesa que resuelve cuando la DB está lista
   */
  abrirDB() {
    return new Promise((resolve, reject) => {
      // Verificar soporte de IndexedDB
      if (!window.indexedDB) {
        reject(new Error('IndexedDB no soportado en este navegador'));
        return;
      }

      const request = indexedDB.open(this.DB_NAME, 1);

      // Evento de actualización de versión (primera vez o upgrade)
      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Crear almacén de objetos si no existe
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const objectStore = db.createObjectStore(this.STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });

          // Crear índices
          objectStore.createIndex('fecha', 'fecha', { unique: false });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      // Éxito al abrir
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      // Error al abrir
      request.onerror = (event) => {
        reject(new Error('Error al abrir IndexedDB: ' + event.target.error));
      };
    });
  },

  /**
   * Realiza un backup completo de los datos
   * Guarda en IndexedDB y actualiza timestamp
   */
  async realizarBackup() {
    console.log('Realizando backup automático...');

    try {
      // Obtener todos los datos de la aplicación
      const datos = Database.exportAll();
      const config = Database.get('configTienda') || {};

      // Crear objeto de backup
      const backup = {
        version: Database.VERSION,
        fecha: new Date().toISOString(),
        timestamp: Date.now(),
        tipo: 'automatico',
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

      // Guardar en IndexedDB
      await this.guardarEnIndexedDB(backup);

      // Actualizar timestamp del último backup
      localStorage.setItem(this.LAST_BACKUP_KEY, Date.now().toString());

      // Limpiar backups antiguos
      await this.limpiarBackupsAntiguos();

      console.log('Backup automático completado');
      Utils.showToast('Backup automático realizado con éxito', 'success');
    } catch (error) {
      console.error('Error al realizar backup automático:', error);
      Utils.showToast('Error en backup automático', 'error');
    }
  },

  /**
   * Guarda un backup en IndexedDB
   * @param {Object} backup - Objeto de backup a guardar
   * @returns {Promise} Promesa que resuelve con el ID del backup
   */
  guardarEnIndexedDB(backup) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Base de datos no inicializada'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(this.STORE_NAME);

      const request = objectStore.add(backup);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Error al guardar backup: ' + request.error));
      };
    });
  },

  /**
   * Obtiene todos los backups almacenados
   * @returns {Promise<Array>} Array con todos los backups
   */
  async obtenerTodosLosBackups() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Base de datos no inicializada'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        // Ordenar por fecha descendente (más reciente primero)
        const backups = request.result.sort((a, b) => b.timestamp - a.timestamp);
        resolve(backups);
      };

      request.onerror = () => {
        reject(new Error('Error al obtener backups: ' + request.error));
      };
    });
  },

  /**
   * Obtiene información del último backup
   * @returns {Promise<Object>} Información del último backup
   */
  async obtenerInfoUltimoBackup() {
    try {
      const backups = await this.obtenerTodosLosBackups();
      return backups.length > 0 ? backups[0] : null;
    } catch (error) {
      console.error('Error al obtener info del último backup:', error);
      return null;
    }
  },

  /**
   * Limpia backups antiguos, manteniendo solo los últimos MAX_BACKUPS
   */
  async limpiarBackupsAntiguos() {
    try {
      const backups = await this.obtenerTodosLosBackups();

      // Si hay más de MAX_BACKUPS, eliminar los más antiguos
      if (backups.length > this.MAX_BACKUPS) {
        const backupsAEliminar = backups.slice(this.MAX_BACKUPS);

        for (const backup of backupsAEliminar) {
          await this.eliminarBackup(backup.id);
        }

        console.log(`Se eliminaron ${backupsAEliminar.length} backups antiguos`);
      }
    } catch (error) {
      console.error('Error al limpiar backups antiguos:', error);
    }
  },

  /**
   * Elimina un backup específico por ID
   * @param {number} id - ID del backup a eliminar
   * @returns {Promise} Promesa que resuelve cuando se elimina
   */
  eliminarBackup(id) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Base de datos no inicializada'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Error al eliminar backup: ' + request.error));
      };
    });
  },

  /**
   * Restaura un backup específico
   * @param {number} backupId - ID del backup a restaurar
   */
  async restaurarBackup(backupId) {
    try {
      const backups = await this.obtenerTodosLosBackups();
      const backup = backups.find((b) => b.id === backupId);

      if (!backup) {
        Utils.showToast('Backup no encontrado', 'error');
        return;
      }

      // Confirmar antes de restaurar
      Utils.showConfirm(
        `¿Estás seguro de restaurar el backup del ${new Date(backup.fecha).toLocaleString()}? Los datos actuales se reemplazarán.`,
        async () => {
          // Crear backup de seguridad antes de restaurar
          await this.realizarBackup();

          // Restaurar datos del backup
          Object.keys(backup.datos).forEach((coleccion) => {
            Database.saveCollection(coleccion, backup.datos[coleccion]);
          });

          Utils.showToast('Backup restaurado exitosamente', 'success');

          // Recargar página
          setTimeout(() => {
            location.reload();
          }, 1500);
        }
      );
    } catch (error) {
      console.error('Error al restaurar backup:', error);
      Utils.showToast('Error al restaurar backup', 'error');
    }
  },

  /**
   * Descarga un backup como archivo JSON
   * @param {number} backupId - ID del backup a descargar
   */
  async descargarBackup(backupId) {
    try {
      const backups = await this.obtenerTodosLosBackups();
      const backup = backups.find((b) => b.id === backupId);

      if (!backup) {
        Utils.showToast('Backup no encontrado', 'error');
        return;
      }

      // Crear nombre de archivo
      const fecha = new Date(backup.fecha);
      const nombreArchivo = `backup_automatico_${fecha.toISOString().split('T')[0]}_${fecha.getHours()}${fecha.getMinutes()}.json`;

      // Descargar
      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      Utils.showToast('Backup descargado correctamente', 'success');
    } catch (error) {
      console.error('Error al descargar backup:', error);
      Utils.showToast('Error al descargar backup', 'error');
    }
  },

  /**
   * Renderiza la lista de backups automáticos
   * @returns {string} HTML con la lista de backups
   */
  async renderListaBackups() {
    try {
      const backups = await this.obtenerTodosLosBackups();

      if (backups.length === 0) {
        return '<p class="text-muted">No hay backups automáticos disponibles</p>';
      }

      return `
        <div class="backups-auto-list">
          ${backups
            .map(
              (backup) => `
            <div class="backup-item">
              <div class="backup-info">
                <div class="backup-date">
                  <i class="fas fa-calendar"></i>
                  <strong>${new Date(backup.fecha).toLocaleString('es-ES')}</strong>
                </div>
                <div class="backup-stats">
                  <span><i class="fas fa-box"></i> ${backup.estadisticas?.totalProductos || 0} productos</span>
                  <span><i class="fas fa-users"></i> ${backup.estadisticas?.totalClientes || 0} clientes</span>
                  <span><i class="fas fa-receipt"></i> ${backup.estadisticas?.totalVentas || 0} ventas</span>
                </div>
              </div>
              <div class="backup-actions">
                <button class="btn btn-sm btn-secondary" onclick="AutoBackup.restaurarBackup(${backup.id})" title="Restaurar">
                  <i class="fas fa-undo"></i>
                </button>
                <button class="btn btn-sm btn-primary" onclick="AutoBackup.descargarBackup(${backup.id})" title="Descargar">
                  <i class="fas fa-download"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="AutoBackup.eliminarBackupConConfirmacion(${backup.id})" title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    } catch (error) {
      console.error('Error al renderizar lista de backups:', error);
      return '<p class="text-error">Error al cargar backups automáticos</p>';
    }
  },

  /**
   * Elimina un backup con confirmación
   * @param {number} backupId - ID del backup a eliminar
   */
  async eliminarBackupConConfirmacion(backupId) {
    Utils.showConfirm('¿Estás seguro de eliminar este backup automático?', async () => {
      try {
        await this.eliminarBackup(backupId);
        Utils.showToast('Backup eliminado correctamente', 'success');

        // Recargar la vista de backups si estamos en ese módulo
        if (App.currentModule === 'backup') {
          App.loadModule('backup');
        }
      } catch (error) {
        console.error('Error al eliminar backup:', error);
        Utils.showToast('Error al eliminar backup', 'error');
      }
    });
  },

  /**
   * Fuerza un backup manual inmediato
   */
  async forzarBackup() {
    await this.realizarBackup();
  },

  /**
   * Detiene el sistema de backup automático
   */
  detener() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Sistema de backup automático detenido');
    }
  },

  /**
   * Obtiene estadísticas del sistema de backup
   * @returns {Promise<Object>} Estadísticas
   */
  async obtenerEstadisticas() {
    try {
      const backups = await this.obtenerTodosLosBackups();
      const lastBackup = localStorage.getItem(this.LAST_BACKUP_KEY);

      // Calcular tamaño aproximado (solo para los backups en IndexedDB)
      let tamanoTotal = 0;
      for (const backup of backups) {
        tamanoTotal += JSON.stringify(backup).length;
      }

      return {
        totalBackups: backups.length,
        ultimoBackup: lastBackup ? new Date(parseInt(lastBackup)) : null,
        proximoBackup: lastBackup ? new Date(parseInt(lastBackup) + this.INTERVAL) : null,
        tamanoTotal: this.formatearTamano(tamanoTotal),
        espacioDisponible: this.MAX_BACKUPS - backups.length,
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return null;
    }
  },

  /**
   * Formatea el tamaño en bytes a formato legible
   * @param {number} bytes - Tamaño en bytes
   * @returns {string} Tamaño formateado
   */
  formatearTamano(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  },
};

// Exportar módulo globalmente
window.AutoBackup = AutoBackup;

// Iniciar automáticamente cuando la página esté lista
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco para que otros módulos se inicialicen
    setTimeout(() => AutoBackup.iniciar(), 2000);
  });
} else {
  setTimeout(() => AutoBackup.iniciar(), 2000);
}
