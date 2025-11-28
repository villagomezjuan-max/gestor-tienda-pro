/* ========================================
   SISTEMA DE BASE DE DATOS MULTI-TENANT
   Manejo de datos con localStorage separado por negocio
   Gestor Tienda Pro v2.0
   ======================================== */

// Sistema de base de datos del gestor - MULTI-TENANT
const Database = {
  // Versión de la base de datos
  VERSION: '2.0.0',

  /**
   * Obtiene la clave de localStorage según el negocio actual
   * CAMBIO CRÍTICO: Cada negocio tiene su propia clave de almacenamiento
   */
  getStorageKey() {
    const negocioActual = this.getCurrentBusiness();
    return `gestorTiendaProDB_${negocioActual}`;
  },

  /**
   * Obtiene el negocio actual desde localStorage
   * Fallback a 'default' si no hay negocio configurado
   */
  getCurrentBusiness() {
    try {
      // Intentar obtener desde Auth primero
      if (typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser()) {
        const user = Auth.getUser();
        if (user && user.negocioId) return user.negocioId;
      }

      // Fallback a localStorage directo
      const negocioActual = localStorage.getItem('negocio_actual');
      return negocioActual || 'default';
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('⚠️ ERROR: Database - Obteniendo negocio actual');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      return 'default';
    }
  },

  /**
   * Cambia el negocio activo y recarga los datos
   * Se llama cuando el usuario cambia de tienda
   */
  switchBusiness(negocioId) {
    if (!negocioId) {
      console.error('ID de negocio requerido');
      return false;
    }

    console.log(`🔄 Cambiando de negocio a: ${negocioId}`);

    // Activar bandera ANTES de hacer cambios
    window.isBusinessSwitching = true;

    // Guardar el negocio actual
    localStorage.setItem('negocio_actual', negocioId);

    // Limpiar caché si existe
    if (this.cache) {
      this.cache = {};
    }

    // Inicializar datos del nuevo negocio
    this.init();

    console.log(`✅ Negocio cambiado exitosamente a: ${negocioId}`);

    // Disparar evento personalizado para que otros módulos se actualicen
    window.dispatchEvent(
      new CustomEvent('businessChanged', {
        detail: { negocioId },
      })
    );

    return true;
  },

  /**
   * Inicializa la base de datos
   * Carga datos existentes o crea estructura inicial
   */
  init() {
    const negocio = this.getCurrentBusiness();
    console.log(`📦 Inicializando base de datos para negocio: ${negocio}`);

    let data = this.load();
    if (!data || !data.version) {
      console.log(`🆕 Creando estructura inicial para negocio: ${negocio}`);
      data = this.getEmptyStructure();
      this.save(data);
    } else {
      // Verificar si necesita actualización de estructura
      const baseStructure = this.getEmptyStructure();
      let needsSave = false;

      Object.keys(baseStructure).forEach((key) => {
        if (typeof data[key] === 'undefined') {
          data[key] = Array.isArray(baseStructure[key]) ? [] : baseStructure[key];
          needsSave = true;
        }
      });

      // Actualizar versión si es necesaria
      if (data.version !== this.VERSION) {
        console.log(`🔄 Actualizando versión de ${data.version} a ${this.VERSION}`);
        data.version = this.VERSION;
        needsSave = true;
      }

      if (needsSave) {
        this.save(data);
      }
    }

    return data;
  },

  /**
   * Obtiene la estructura vacía de la base de datos
   */
  getEmptyStructure() {
    return {
      version: this.VERSION,
      negocioId: this.getCurrentBusiness(),
      lastModified: new Date().toISOString(),
      usuarios: [],
      productos: [],
      servicios: [],
      categorias: [],
      ventas: [],
      ventasPendientes: [],
      compras: [],
      clientes: [],
      vehiculos: [],
      proveedores: [],
      publicidad: [],
      publicaciones: [],
      publicidades_guardadas: [],
      recordatorios: [],
      cuentasPorCobrar: [],
      cuentasPorPagar: [],
      transacciones: [],
      facturas: [],
      facturaItems: [],
      retenciones: [],
      retencionItems: [],
      guiasRemision: [],
      notasCredito: [],
      notasDebito: [],
      proformas: [],
      catalogoTecnico: [],
      comprasPorHacer: [],
      comprasPorHacerHistorial: [],
      ordenes_trabajo: [],
      citas: [],
      movimientosInventario: [],
      configTienda: null,
      configuracion: {
        nombreNegocio: 'Mi Tienda',
        ruc: '',
        direccion: '',
        telefono: '',
        email: '',
        moneda: 'USD',
        iva: 15,
        stockMinimo: 10,
        tema: 'light',
      },
    };
  },

  /**
   * Carga todos los datos de localStorage
   */
  load() {
    try {
      const storageKey = this.getStorageKey();
      const data = localStorage.getItem(storageKey);

      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);

      // Validar que los datos pertenecen al negocio correcto
      const negocioActual = this.getCurrentBusiness();
      if (parsed.negocioId && parsed.negocioId !== negocioActual) {
        console.warn(
          `⚠️ Advertencia: Datos de negocio ${parsed.negocioId} pero negocio actual es ${negocioActual}`
        );
      }

      return parsed;
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR CRÍTICO: Database - Cargando datos');
      console.error('Colección:', collectionName);
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      return null;
    }
  },

  /**
   * Guarda todos los datos en localStorage
   */
  save(data) {
    try {
      const storageKey = this.getStorageKey();
      const negocioActual = this.getCurrentBusiness();

      // Asegurar metadatos correctos
      data.lastModified = new Date().toISOString();
      data.negocioId = negocioActual;
      data.version = this.VERSION;

      localStorage.setItem(storageKey, JSON.stringify(data));

      return true;
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR CRÍTICO: Database - Guardando datos');
      console.error('Colección:', collectionName);
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();

      // Si es error de cuota excedida
      if (error.name === 'QuotaExceededError') {
        console.error('❌ Espacio de almacenamiento agotado. Considera limpiar datos antiguos.');
        if (typeof Utils !== 'undefined' && Utils.showToast) {
          Utils.showToast('Espacio de almacenamiento lleno. Limpia datos antiguos.', 'error');
        }
      }

      return false;
    }
  },

  /**
   * Obtiene un valor por clave del objeto de la base de datos
   */
  get(key) {
    const data = this.load();
    return data ? data[key] : undefined;
  },

  /**
   * Establece un valor por clave en el objeto de la base de datos
   */
  set(key, value) {
    const data = this.load() || this.getEmptyStructure();
    data[key] = value;
    return this.save(data);
  },

  /**
   * Obtiene una colección específica
   */
  getCollection(collectionName) {
    const data = this.load();
    return data && data[collectionName] ? data[collectionName] : [];
  },

  /**
   * Guarda una colección específica
   */
  saveCollection(collectionName, items) {
    const data = this.load() || this.getEmptyStructure();
    data[collectionName] = items;
    return this.save(data);
  },

  /**
   * Agrega un item a una colección
   */
  addItem(collectionName, item) {
    const items = this.getCollection(collectionName);
    item.id = item.id || Utils.generateId();
    item.createdAt = item.createdAt || new Date().toISOString();
    items.push(item);
    return this.saveCollection(collectionName, items);
  },

  /**
   * Alias para addItem
   */
  add(collectionName, item) {
    return this.addItem(collectionName, item);
  },

  /**
   * Actualiza un item en una colección
   */
  updateItem(collectionName, id, updates) {
    const items = this.getCollection(collectionName);
    const index = items.findIndex((item) => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
      return this.saveCollection(collectionName, items);
    }
    return false;
  },

  /**
   * Alias para updateItem
   */
  update(collectionName, id, updates) {
    return this.updateItem(collectionName, id, updates);
  },

  /**
   * Elimina un item de una colección
   */
  deleteItem(collectionName, id) {
    const items = this.getCollection(collectionName);
    const filtered = items.filter((item) => item.id !== id);
    return this.saveCollection(collectionName, filtered);
  },

  /**
   * Busca un item por ID
   */
  findById(collectionName, id) {
    const items = this.getCollection(collectionName);
    return items.find((item) => item.id === id);
  },

  /**
   * Obtiene un item de una colección por ID (alias de findById)
   */
  getItem(collectionName, id) {
    return this.findById(collectionName, id);
  },

  /**
   * Busca items por criterio
   */
  find(collectionName, criteria) {
    const items = this.getCollection(collectionName);
    return items.filter((item) => {
      return Object.keys(criteria).every((key) => item[key] === criteria[key]);
    });
  },

  /**
   * Exporta todos los datos como JSON
   */
  exportData() {
    const data = this.load();
    const json = JSON.stringify(data, null, 2);
    const filename = `gestor-tienda-backup-${new Date().toISOString().split('T')[0]}.json`;
    Utils.downloadFile(json, filename, 'application/json');
    return true;
  },

  /**
   * Exporta todos los datos sin descargar (para backups automáticos)
   * @returns {Object} Objeto con todos los datos
   */
  exportAll() {
    const data = this.load();
    if (!data) {
      return this.getEmptyStructure();
    }
    return data;
  },

  /**
   * Importa datos desde JSON
   */
  async importData(file) {
    try {
      let content;

      if (typeof Utils !== 'undefined' && Utils.readFile) {
        content = await Utils.readFile(file);
      } else {
        // Fallback manual
        content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      const data = JSON.parse(content);

      // Validar estructura básica
      if (!data.version) {
        throw new Error('Archivo inválido: sin versión');
      }

      // Advertir si los datos son de otro negocio
      const negocioActual = this.getCurrentBusiness();
      if (data.negocioId && data.negocioId !== negocioActual) {
        const confirmar = confirm(
          `⚠️ ADVERTENCIA: Estás importando datos del negocio "${data.negocioId}" al negocio actual "${negocioActual}".\n\n` +
            `Esto SOBRESCRIBIRÁ todos los datos actuales.\n\n` +
            `¿Deseas continuar?`
        );

        if (!confirmar) {
          return { success: false, message: 'Importación cancelada por el usuario' };
        }
      }

      // Actualizar negocioId al actual
      data.negocioId = negocioActual;

      // Guardar datos
      this.save(data);
      return { success: true, message: 'Datos importados correctamente' };
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR: Database - Importando datos');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      return { success: false, message: 'Error al importar: ' + error.message };
    }
  },

  /**
   * Resetea la base de datos del negocio actual
   */
  reset() {
    const storageKey = this.getStorageKey();
    const negocio = this.getCurrentBusiness();

    const confirmar = confirm(
      `⚠️ ADVERTENCIA: Vas a eliminar TODOS los datos del negocio "${negocio}".\n\n` +
        `Esta acción NO se puede deshacer.\n\n` +
        `¿Estás seguro?`
    );

    if (confirmar) {
      localStorage.removeItem(storageKey);
      console.log(`🗑️ Datos del negocio ${negocio} eliminados`);
      return true;
    }

    return false;
  },

  /**
   * Lista todos los negocios con datos almacenados
   */
  listBusinessesWithData() {
    const businesses = [];
    const prefix = 'gestorTiendaProDB_';

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const negocioId = key.replace(prefix, '');
        try {
          const data = JSON.parse(localStorage.getItem(key));
          businesses.push({
            id: negocioId,
            version: data.version || 'unknown',
            lastModified: data.lastModified || 'unknown',
            collections: Object.keys(data).filter((k) => Array.isArray(data[k])).length,
            itemCount: Object.keys(data)
              .filter((k) => Array.isArray(data[k]))
              .reduce((sum, k) => sum + data[k].length, 0),
          });
        } catch (error) {
          // 🔥 NO SILENCIAR - Mostrar error completo
          console.group(`⚠️ ERROR: Database - Leyendo datos de ${negocioId}`);
          console.error('Error completo:', error);
          console.error('Stack trace:', error.stack);
          console.groupEnd();
        }
      }
    }

    return businesses;
  },

  /**
   * Migra datos antiguos al nuevo sistema multi-tenant
   */
  migrateFromLegacy() {
    const legacyKey = 'gestorTiendaProDB';
    const legacyData = localStorage.getItem(legacyKey);

    if (!legacyData) {
      return { migrated: false, reason: 'No legacy data found' };
    }

    try {
      const data = JSON.parse(legacyData);
      const negocioActual = this.getCurrentBusiness();

      console.log(`🔄 Migrando datos antiguos al negocio: ${negocioActual}`);

      // Verificar si ya existe el nuevo formato
      const newKey = this.getStorageKey();
      if (localStorage.getItem(newKey)) {
        console.warn('⚠️ Ya existen datos en el nuevo formato. Migración cancelada.');
        return { migrated: false, reason: 'New format already exists' };
      }

      // Agregar metadatos de multi-tenant
      data.negocioId = negocioActual;
      data.version = this.VERSION;
      data.lastModified = new Date().toISOString();

      // Guardar en nuevo formato
      this.save(data);

      console.log(`✅ Datos migrados exitosamente a ${newKey}`);
      console.log(`ℹ️ Los datos antiguos se mantienen en ${legacyKey} como respaldo`);

      return {
        migrated: true,
        from: legacyKey,
        to: newKey,
        negocioId: negocioActual,
      };
    } catch (error) {
      // 🔥 NO SILENCIAR - Mostrar error completo
      console.group('❌ ERROR CRÍTICO: Database - Migración de datos');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
      return { migrated: false, reason: error.message };
    }
  },

  /**
   * Carga datos de demostración para el negocio actual
   */
  loadDemoData() {
    const negocio = this.getCurrentBusiness();
    console.log(`🎭 Cargando datos de demostración para: ${negocio}`);

    const data = this.getEmptyStructure();

    // Usuarios de prueba
    data.usuarios = [
      {
        id: 'user_admin',
        username: 'admin',
        password: simpleHash('admin123'),
        nombre: 'Administrador',
        email: 'admin@tienda.com',
        rol: 'admin',
        activo: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user_user',
        username: 'user',
        password: simpleHash('user123'),
        nombre: 'Usuario',
        email: 'user@tienda.com',
        rol: 'user',
        activo: true,
        createdAt: new Date().toISOString(),
      },
    ];

    // Categorías
    data.categorias = [
      { id: 'cat1', nombre: 'Electrónica', descripcion: 'Productos electrónicos' },
      { id: 'cat2', nombre: 'Ropa', descripcion: 'Prendas de vestir' },
      { id: 'cat3', nombre: 'Alimentos', descripcion: 'Productos alimenticios' },
      { id: 'cat4', nombre: 'Hogar', descripcion: 'Artículos para el hogar' },
      { id: 'cat5', nombre: 'Deportes', descripcion: 'Artículos deportivos' },
    ];

    // Proveedores
    data.proveedores = [
      {
        id: 'prov1',
        nombre: 'Distribuidora Tech S.A.',
        contacto: 'Juan Pérez',
        telefono: '0991234567',
        email: 'ventas@distributech.com',
        direccion: 'Av. Principal 123',
        notas: 'Proveedor principal de electrónica',
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'prov2',
        nombre: 'Textiles del Ecuador',
        contacto: 'María González',
        telefono: '0987654321',
        email: 'info@textiles.com.ec',
        direccion: 'Calle Comercio 456',
        notas: 'Ropa de calidad',
        createdAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'prov3',
        nombre: 'Alimentos Frescos CIA',
        contacto: 'Carlos Ruiz',
        telefono: '0993456789',
        email: 'contacto@alimentosfrescos.com',
        direccion: 'Zona Industrial',
        notas: 'Productos de primera calidad',
        createdAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    // Productos (20 productos de ejemplo)
    const productos = [];
    const servicios = [];
    const productosEjemplo = [
      {
        nombre: 'Laptop HP 15"',
        categoria: 'cat1',
        proveedor: 'prov1',
        precioCompra: 450,
        precioVenta: 650,
        stock: 15,
      },
      {
        nombre: 'Mouse Inalámbrico',
        categoria: 'cat1',
        proveedor: 'prov1',
        precioCompra: 8,
        precioVenta: 15,
        stock: 50,
      },
      {
        nombre: 'Teclado Mecánico',
        categoria: 'cat1',
        proveedor: 'prov1',
        precioCompra: 35,
        precioVenta: 55,
        stock: 25,
      },
      {
        nombre: 'Monitor 24"',
        categoria: 'cat1',
        proveedor: 'prov1',
        precioCompra: 150,
        precioVenta: 220,
        stock: 12,
      },
      {
        nombre: 'Audífonos Bluetooth',
        categoria: 'cat1',
        proveedor: 'prov1',
        precioCompra: 20,
        precioVenta: 35,
        stock: 30,
      },
      {
        nombre: 'Camiseta Deportiva',
        categoria: 'cat2',
        proveedor: 'prov2',
        precioCompra: 8,
        precioVenta: 15,
        stock: 100,
      },
      {
        nombre: 'Pantalón Jeans',
        categoria: 'cat2',
        proveedor: 'prov2',
        precioCompra: 18,
        precioVenta: 35,
        stock: 60,
      },
      {
        nombre: 'Zapatos Casuales',
        categoria: 'cat2',
        proveedor: 'prov2',
        precioCompra: 25,
        precioVenta: 45,
        stock: 40,
      },
      {
        nombre: 'Chaqueta Impermeable',
        categoria: 'cat2',
        proveedor: 'prov2',
        precioCompra: 30,
        precioVenta: 55,
        stock: 20,
      },
      {
        nombre: 'Gorra Deportiva',
        categoria: 'cat2',
        proveedor: 'prov2',
        precioCompra: 5,
        precioVenta: 10,
        stock: 80,
      },
      {
        nombre: 'Arroz 1kg',
        categoria: 'cat3',
        proveedor: 'prov3',
        precioCompra: 0.8,
        precioVenta: 1.5,
        stock: 200,
      },
      {
        nombre: 'Aceite 1L',
        categoria: 'cat3',
        proveedor: 'prov3',
        precioCompra: 2,
        precioVenta: 3.5,
        stock: 150,
      },
      {
        nombre: 'Azúcar 1kg',
        categoria: 'cat3',
        proveedor: 'prov3',
        precioCompra: 0.7,
        precioVenta: 1.2,
        stock: 180,
      },
      {
        nombre: 'Café 500g',
        categoria: 'cat3',
        proveedor: 'prov3',
        precioCompra: 3.5,
        precioVenta: 6,
        stock: 90,
      },
      {
        nombre: 'Leche 1L',
        categoria: 'cat3',
        proveedor: 'prov3',
        precioCompra: 0.9,
        precioVenta: 1.5,
        stock: 120,
      },
      {
        nombre: 'Sartén Antiadherente',
        categoria: 'cat4',
        proveedor: 'prov1',
        precioCompra: 12,
        precioVenta: 22,
        stock: 35,
      },
      {
        nombre: 'Juego de Toallas',
        categoria: 'cat4',
        proveedor: 'prov2',
        precioCompra: 15,
        precioVenta: 28,
        stock: 25,
      },
      {
        nombre: 'Lámpara LED',
        categoria: 'cat4',
        proveedor: 'prov1',
        precioCompra: 8,
        precioVenta: 15,
        stock: 45,
      },
      {
        nombre: 'Balón de Fútbol',
        categoria: 'cat5',
        proveedor: 'prov2',
        precioCompra: 12,
        precioVenta: 22,
        stock: 30,
      },
      {
        nombre: 'Pesas 5kg (Par)',
        categoria: 'cat5',
        proveedor: 'prov2',
        precioCompra: 18,
        precioVenta: 32,
        stock: 20,
      },
    ];

    productosEjemplo.forEach((p, index) => {
      productos.push({
        id: 'prod' + (index + 1),
        codigo: 'COD' + String(index + 1).padStart(4, '0'),
        nombre: p.nombre,
        descripcion: `${p.nombre} de excelente calidad`,
        categoria: p.categoria,
        proveedor: p.proveedor,
        precioCompra: p.precioCompra,
        precioVenta: p.precioVenta,
        stock: p.stock,
        stockMinimo: 10,
        imagen: '',
        activo: true,
        createdAt: new Date(Date.now() - (100 - index) * 24 * 60 * 60 * 1000).toISOString(),
      });
    });
    data.productos = productos;
    servicios.push(
      {
        id: 'serv1',
        codigo: 'SERV-0001',
        nombre: 'Diagnóstico General',
        descripcion: 'Revisión completa del vehículo y reporte técnico',
        precioBase: 25,
        precioConIVA: 28.75,
        precio: 25,
        duracionEstimada: 60,
        activo: true,
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'serv2',
        codigo: 'SERV-0002',
        nombre: 'Cambio de Aceite y Filtros',
        descripcion: 'Servicio estándar de mantenimiento preventivo',
        precioBase: 45,
        precioConIVA: 51.75,
        precio: 45,
        duracionEstimada: 90,
        activo: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'serv3',
        codigo: 'SERV-0003',
        nombre: 'Alineación y Balanceo',
        descripcion: 'Corrección de alineación y balanceo de ruedas',
        precioBase: 35,
        precioConIVA: 40.25,
        precio: 35,
        duracionEstimada: 80,
        activo: true,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      }
    );
    data.servicios = servicios;

    // Clientes
    data.clientes = [
      {
        id: 'cli1',
        nombre: 'Ana Torres',
        cedula: '1234567890',
        telefono: '0991111111',
        email: 'ana@email.com',
        direccion: 'Av. 10 de Agosto',
        ciudad: 'Quito',
        notas: 'Cliente frecuente',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'cli2',
        nombre: 'Luis Morales',
        cedula: '0987654321',
        telefono: '0992222222',
        email: 'luis@email.com',
        direccion: 'Calle Principal 789',
        ciudad: 'Guayaquil',
        notas: '',
        createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'cli3',
        nombre: 'Carmen Sánchez',
        cedula: '1122334455',
        telefono: '0993333333',
        email: 'carmen@email.com',
        direccion: 'Barrio Norte',
        ciudad: 'Cuenca',
        notas: 'Pago en efectivo',
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    // Generar ventas de ejemplo (últimos 30 días)
    const ventas = [];
    for (let i = 0; i < 15; i++) {
      const fecha = new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000);
      const cliente = data.clientes[Math.floor(Math.random() * data.clientes.length)];
      const numProductos = Math.floor(Math.random() * 3) + 1;
      const items = [];
      let subtotal = 0;

      for (let j = 0; j < numProductos; j++) {
        const producto = productos[Math.floor(Math.random() * productos.length)];
        const cantidad = Math.floor(Math.random() * 3) + 1;
        const precio = producto.precioVenta;
        const total = cantidad * precio;

        items.push({
          productoId: producto.id,
          producto: producto.nombre,
          cantidad,
          precio,
          total,
        });

        subtotal += total;
      }

      const iva = subtotal * 0.15;
      const total = subtotal + iva;

      ventas.push({
        id: 'venta' + (i + 1),
        numero: 'V-' + String(i + 1).padStart(5, '0'),
        fecha: fecha.toISOString(),
        clienteId: cliente.id,
        cliente: cliente.nombre,
        items,
        subtotal,
        iva,
        descuento: 0,
        total,
        metodoPago: ['efectivo', 'tarjeta', 'transferencia'][Math.floor(Math.random() * 3)],
        estado: 'completada',
        notas: '',
        createdAt: fecha.toISOString(),
      });
    }
    data.ventas = ventas;

    // Generar compras de ejemplo
    const compras = [];
    for (let i = 0; i < 5; i++) {
      const fecha = new Date(Date.now() - (i * 15 + 30) * 24 * 60 * 60 * 1000);
      const proveedor = data.proveedores[Math.floor(Math.random() * data.proveedores.length)];
      const numProductos = Math.floor(Math.random() * 4) + 2;
      const items = [];
      let total = 0;

      for (let j = 0; j < numProductos; j++) {
        const producto = productos[Math.floor(Math.random() * productos.length)];
        const cantidad = Math.floor(Math.random() * 20) + 10;
        const precio = producto.precioCompra;
        const subtotal = cantidad * precio;

        items.push({
          productoId: producto.id,
          producto: producto.nombre,
          cantidad,
          precio,
          total: subtotal,
        });

        total += subtotal;
      }

      compras.push({
        id: 'compra' + (i + 1),
        numero: 'C-' + String(i + 1).padStart(5, '0'),
        fecha: fecha.toISOString(),
        proveedorId: proveedor.id,
        proveedor: proveedor.nombre,
        items,
        total,
        estado: 'completada',
        notas: '',
        createdAt: fecha.toISOString(),
      });
    }
    data.compras = compras;

    // Recordatorios
    data.recordatorios = [
      {
        id: 'rec1',
        titulo: 'Publicar en Instagram',
        descripcion: 'Publicar nuevos productos en Instagram',
        tipo: 'publicidad',
        fecha: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        completado: false,
        recurrente: 'ninguno',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rec2',
        titulo: 'Pagar a proveedor',
        descripcion: 'Pago pendiente a Distribuidora Tech',
        tipo: 'pago',
        fecha: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        completado: false,
        recurrente: 'ninguno',
        createdAt: new Date().toISOString(),
      },
    ];

    // Publicidad programada
    data.publicidad = [
      {
        id: 'pub1',
        titulo: 'Promoción de Laptops',
        contenido: '¡Nuevas laptops con 20% de descuento!',
        redSocial: 'Facebook',
        fecha: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        estado: 'pendiente',
        imagen: '',
        createdAt: new Date().toISOString(),
      },
    ];

    this.save(data);
    console.log(`✅ Datos de demostración cargados para: ${negocio}`);
    return data;
  },
};

// Inicializar base de datos al cargar
window.Database = Database;

// Verificar migración automática y inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDatabase);
} else {
  initializeDatabase();
}

function initializeDatabase() {
  const migrationResult = Database.migrateFromLegacy();
  if (migrationResult.migrated) {
    console.log('✅ Migración automática completada:', migrationResult);
  }

  // Inicializar después de migración
  const initResult = Database.init();
  if (!initResult) {
    console.warn('Base de datos vacía, puedes cargar datos de demostración si lo necesitas');
  }

  // Mostrar información de debug
  console.log('📊 Negocio actual:', Database.getCurrentBusiness());
  console.log('📦 Clave de almacenamiento:', Database.getStorageKey());
  console.log('🏢 Negocios con datos:', Database.listBusinessesWithData());
}
