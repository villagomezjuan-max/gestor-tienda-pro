/**
 * DATA SYNC MANAGER
 * Sistema unificado para sincronizar datos entre localStorage y API REST
 * Asegura coherencia entre todos los módulos del sistema
 */

window.DataSyncManager = {
  // Estado
  syncing: false,
  lastSync: null,
  syncInterval: null,
  cache: new Map(),
  CACHE_TTL: 60000, // 1 minuto

  /**
   * Inicializar el gestor de sincronización
   */
  async init() {
    console.log('🔄 Inicializando Data Sync Manager...');

    // Sincronizar datos inicialmente
    await this.syncAll();

    // Configurar sincronización automática cada 5 minutos
    this.syncInterval = setInterval(() => {
      this.syncAll();
    }, 300000); // 5 minutos

    // Escuchar cambios en el negocio
    window.addEventListener('businessChanged', async (event) => {
      console.log('🔄 Negocio cambiado, re-sincronizando datos...');
      this.cache.clear();
      await this.syncAll();
    });

    console.log('✅ Data Sync Manager inicializado');
  },

  /**
   * Sincronizar todas las colecciones críticas
   */
  async syncAll() {
    if (this.syncing) {
      console.log('⏳ Sincronización ya en progreso...');
      return false;
    }

    this.syncing = true;
    console.log('🔄 Sincronizando datos con backend...');

    try {
      // Verificar que DatabaseAPI esté disponible
      if (!window.DatabaseAPI || typeof DatabaseAPI.request !== 'function') {
        console.warn('⚠️ DatabaseAPI no disponible, saltando sincronización');
        this.syncing = false;
        return false;
      }

      // Colecciones críticas a sincronizar
      const collections = [
        { name: 'ventas', endpoint: '/ventas' },
        { name: 'productos', endpoint: '/productos' },
        { name: 'clientes', endpoint: '/clientes' },
        { name: 'compras', endpoint: '/compras' },
        { name: 'ordenes_trabajo', endpoint: '/ordenes-trabajo' },
        { name: 'vehiculos', endpoint: '/vehiculos' },
      ];

      let syncCount = 0;
      let errorCount = 0;

      for (const collection of collections) {
        try {
          const data = await DatabaseAPI.request(collection.endpoint);

          if (Array.isArray(data) && data.length > 0) {
            // Guardar en localStorage para módulos legacy
            if (window.Database && typeof Database.saveCollection === 'function') {
              Database.saveCollection(collection.name, data);
            }

            // Guardar en caché
            this.cache.set(collection.name, {
              data,
              timestamp: Date.now(),
            });

            syncCount++;
            console.log(`  ✅ ${collection.name}: ${data.length} items`);
          } else if (data && data.success === false) {
            console.warn(`  ⚠️ ${collection.name}: ${data.message || 'Sin datos'}`);
          }
        } catch (error) {
          errorCount++;
          console.warn(`  ❌ ${collection.name}: Error - ${error.message}`);
        }
      }

      this.lastSync = new Date();
      console.log(`✅ Sincronización completada: ${syncCount} colecciones, ${errorCount} errores`);

      // Disparar evento para que módulos se actualicen
      window.dispatchEvent(
        new CustomEvent('dataSync', {
          detail: {
            collections: syncCount,
            errors: errorCount,
            timestamp: this.lastSync,
          },
        })
      );

      this.syncing = false;
      return true;
    } catch (error) {
      console.error('❌ Error en sincronización global:', error);
      this.syncing = false;
      return false;
    }
  },

  /**
   * Obtener datos con caché inteligente
   * @param {string} collection - Nombre de la colección
   * @param {boolean} forceRefresh - Forzar recarga desde API
   * @returns {Promise<Array>} - Datos de la colección
   */
  async getData(collection, forceRefresh = false) {
    // Verificar caché
    if (!forceRefresh && this.cache.has(collection)) {
      const cached = this.cache.get(collection);
      const age = Date.now() - cached.timestamp;

      if (age < this.CACHE_TTL) {
        console.log(`📦 ${collection}: Desde caché (${(age / 1000).toFixed(1)}s)`);
        return cached.data;
      }
    }

    // Cargar desde API
    try {
      if (window.DatabaseAPI && typeof DatabaseAPI.request === 'function') {
        const endpoint = this.getEndpointForCollection(collection);
        const data = await DatabaseAPI.request(endpoint);

        if (Array.isArray(data)) {
          this.cache.set(collection, {
            data,
            timestamp: Date.now(),
          });

          // También guardar en Database legacy
          if (window.Database && typeof Database.saveCollection === 'function') {
            Database.saveCollection(collection, data);
          }

          return data;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Error cargando ${collection} desde API:`, error);
    }

    // Fallback a Database local
    if (window.Database && typeof Database.getCollection === 'function') {
      return Database.getCollection(collection) || [];
    }

    return [];
  },

  /**
   * Mapear nombre de colección a endpoint
   */
  getEndpointForCollection(collection) {
    const map = {
      ventas: '/ventas',
      productos: '/productos',
      clientes: '/clientes',
      compras: '/compras',
      ordenes_trabajo: '/ordenes-trabajo',
      vehiculos: '/vehiculos',
      categorias: '/categorias',
      proveedores: '/proveedores',
      usuarios: '/usuarios',
    };

    return map[collection] || `/${collection}`;
  },

  /**
   * Forzar re-sincronización
   */
  async refresh() {
    this.cache.clear();
    return await this.syncAll();
  },

  /**
   * Obtener estado de sincronización
   */
  getStatus() {
    return {
      syncing: this.syncing,
      lastSync: this.lastSync,
      cacheSize: this.cache.size,
      collections: Array.from(this.cache.keys()),
    };
  },

  /**
   * Detener sincronización automática
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 Data Sync Manager detenido');
    }
  },
};

// Auto-inicializar después de que Auth esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    // Esperar a que Auth esté listo
    if (window.Auth && typeof Auth.ready === 'function') {
      await Auth.ready();
    }

    // Esperar 2 segundos para que todo esté cargado
    setTimeout(() => {
      if (Auth.isAuthenticated && Auth.isAuthenticated()) {
        DataSyncManager.init();
      }
    }, 2000);
  });
} else {
  setTimeout(async () => {
    if (window.Auth && Auth.isAuthenticated && Auth.isAuthenticated()) {
      await DataSyncManager.init();
    }
  }, 2000);
}
