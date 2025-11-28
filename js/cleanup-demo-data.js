/**
 * Sistema de Limpieza de Datos de Demostración
 * Elimina datos de ejemplo/demo del sistema
 */

(function () {
  'use strict';

  window.CleanupDemoData = {
    /**
     * Verifica si hay datos de demostración en el sistema
     */
    hasDemoData: function () {
      try {
        if (typeof Database === 'undefined' || !Database.db) {
          return false;
        }

        // Verificar productos demo
        const demoProducts = Database.db.productos.filter(
          (p) =>
            p.nombre &&
            (p.nombre.includes('Demo') || p.nombre.includes('Ejemplo') || p.nombre.includes('Test'))
        );

        // Verificar clientes demo
        const demoClients = Database.db.clientes.filter(
          (c) =>
            c.nombre &&
            (c.nombre.includes('Demo') || c.nombre.includes('Ejemplo') || c.nombre.includes('Test'))
        );

        // Verificar ventas demo
        const demoSales = Database.db.ventas.filter(
          (v) =>
            v.items &&
            v.items.some(
              (item) =>
                item.nombre && (item.nombre.includes('Demo') || item.nombre.includes('Ejemplo'))
            )
        );

        return demoProducts.length > 0 || demoClients.length > 0 || demoSales.length > 0;
      } catch (error) {
        console.error('Error verificando datos demo:', error);
        return false;
      }
    },

    /**
     * Limpia todos los datos de demostración
     */
    cleanupAll: function () {
      if (typeof Database === 'undefined' || !Database.db) {
        console.warn('Database no disponible para limpieza');
        return false;
      }

      try {
        let cleaned = 0;

        // Limpiar productos demo
        const originalProductsLength = Database.db.productos.length;
        Database.db.productos = Database.db.productos.filter(
          (p) =>
            !p.nombre ||
            !(
              p.nombre.includes('Demo') ||
              p.nombre.includes('Ejemplo') ||
              p.nombre.includes('Test')
            )
        );
        cleaned += originalProductsLength - Database.db.productos.length;

        // Limpiar clientes demo
        const originalClientsLength = Database.db.clientes.length;
        Database.db.clientes = Database.db.clientes.filter(
          (c) =>
            !c.nombre ||
            !(
              c.nombre.includes('Demo') ||
              c.nombre.includes('Ejemplo') ||
              c.nombre.includes('Test')
            )
        );
        cleaned += originalClientsLength - Database.db.clientes.length;

        // Limpiar ventas demo
        const originalSalesLength = Database.db.ventas.length;
        Database.db.ventas = Database.db.ventas.filter(
          (v) =>
            !v.items ||
            !v.items.some(
              (item) =>
                item.nombre && (item.nombre.includes('Demo') || item.nombre.includes('Ejemplo'))
            )
        );
        cleaned += originalSalesLength - Database.db.ventas.length;

        // Guardar cambios
        if (cleaned > 0 && typeof Database.save === 'function') {
          Database.save();
          console.log(`✅ Limpieza completada: ${cleaned} registros eliminados`);
          return true;
        }

        return false;
      } catch (error) {
        console.error('Error en limpieza de datos demo:', error);
        return false;
      }
    },

    /**
     * Muestra diálogo de confirmación para limpiar datos demo
     */
    promptCleanup: function () {
      if (!this.hasDemoData()) {
        if (typeof Utils !== 'undefined' && Utils.showToast) {
          Utils.showToast('No se encontraron datos de demostración', 'info');
        }
        return;
      }

      if (
        confirm(
          '¿Deseas eliminar todos los datos de demostración?\nEsta acción no se puede deshacer.'
        )
      ) {
        const success = this.cleanupAll();
        if (success && typeof Utils !== 'undefined' && Utils.showToast) {
          Utils.showToast('Datos de demostración eliminados correctamente', 'success');
        }
      }
    },
  };

  console.log('✅ Sistema de limpieza de datos demo cargado');
})();
