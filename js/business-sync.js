/* ========================================
   SINCRONIZACIÓN DE CAMBIOS DE NEGOCIO
   Escucha cambios de negocio y actualiza módulos
   Gestor Tienda Pro v2.0
   ======================================== */

// Bandera global para indicar que se está cambiando de negocio
window.isBusinessSwitching = false;

// Escuchar cambios de negocio generados por Database.switchBusiness
window.addEventListener('businessChanged', (event) => {
  const { negocioId } = event.detail;
  console.log(`🔄 Evento businessChanged detectado: ${negocioId}`);

  // Activar bandera de cambio
  window.isBusinessSwitching = true;

  // Recargar módulo actual si existe
  if (typeof App !== 'undefined' && App.currentModule) {
    console.log(`🔄 Recargando módulo actual: ${App.currentModule}`);

    // Dar tiempo para que se complete el cambio de datos
    setTimeout(() => {
      if (App.loadModule && typeof App.loadModule === 'function') {
        App.loadModule(App.currentModule);
      } else {
        console.log('🔄 Recargando página completa...');
        window.location.reload();
      }

      // Desactivar bandera después de la recarga
      setTimeout(() => {
        window.isBusinessSwitching = false;
      }, 500);
    }, 300);
  } else {
    // Si no hay módulo actual, desactivar bandera inmediatamente
    window.isBusinessSwitching = false;
  }
});

// Escuchar cambios en localStorage desde otras pestañas/ventanas
window.addEventListener('storage', (event) => {
  if (event.key === 'negocio_actual' && event.newValue !== event.oldValue) {
    console.log(`🔄 Negocio cambiado en otro tab: ${event.oldValue} → ${event.newValue}`);

    // Sincronizar con la otra pestaña
    if (typeof Database !== 'undefined' && Database.switchBusiness) {
      Database.switchBusiness(event.newValue);
    }

    // Actualizar el token si Auth está disponible
    if (typeof Auth !== 'undefined' && Auth.cambiarNegocio) {
      Auth.cambiarNegocio(event.newValue).then((result) => {
        if (result.success) {
          console.log('✅ Token actualizado en sincronización multi-tab');
        }
      });
    }

    // Recargar la página después de un pequeño delay
    setTimeout(() => {
      console.log('🔄 Recargando página por sincronización multi-tab...');
      window.location.reload();
    }, 500);
  }
});

// Verificar consistencia al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  const negocioStorage = localStorage.getItem('negocio_actual');
  const negocioAuth =
    typeof Auth !== 'undefined' && Auth.getUser ? Auth.getUser()?.negocioId : null;

  if (negocioStorage && negocioAuth && negocioStorage !== negocioAuth) {
    console.warn(`⚠️ Inconsistencia detectada: Storage=${negocioStorage}, Auth=${negocioAuth}`);
    console.log('🔄 Sincronizando con negocio de Auth...');

    if (typeof Database !== 'undefined' && Database.switchBusiness) {
      Database.switchBusiness(negocioAuth);
    }
  }
});

// Función helper para forzar recarga de datos de un módulo específico
window.reloadModuleData = function (moduleName) {
  console.log(`🔄 Recargando datos del módulo: ${moduleName}`);

  if (typeof App !== 'undefined' && App.loadModule) {
    App.loadModule(moduleName);
  } else {
    console.warn('App.loadModule no disponible');
  }
};

// Función helper para verificar el estado actual
window.checkBusinessState = function () {
  const negocioStorage = localStorage.getItem('negocio_actual');
  const negocioAuth =
    typeof Auth !== 'undefined' && Auth.getCurrentNegocioId ? Auth.getCurrentNegocioId() : null;
  const negocioDatabase = typeof Database !== 'undefined' ? Database.getCurrentBusiness() : null;

  console.log('📊 Estado actual del negocio:');
  console.log('  - localStorage:', negocioStorage);
  console.log('  - Auth:', negocioAuth);
  console.log('  - Database:', negocioDatabase);
  console.log(
    '  - Negocios con datos:',
    typeof Database !== 'undefined' ? Database.listBusinessesWithData() : 'N/A'
  );

  if (negocioStorage !== negocioAuth || negocioStorage !== negocioDatabase) {
    console.warn('⚠️ Inconsistencia detectada entre sistemas');
    return false;
  }

  console.log('✅ Todos los sistemas sincronizados');
  return true;
};

console.log('✅ Sincronización de negocios activada');
