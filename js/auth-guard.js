/* ========================================
   GUARDIA DE AUTENTICACIÓN MEJORADO
   Protege páginas que requieren autenticación
   Gestor Tienda Pro v2.0
   ======================================== */

(async function () {
  'use strict';

  // Lista de páginas públicas que NO requieren autenticación
  const PUBLIC_PAGES = [
    'login.html',
    'registro.html',
    'recuperar-password.html',
    'reset-password.html',
  ];

  // Verificar si la página actual es pública
  function isPublicPage() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    return PUBLIC_PAGES.some((page) => currentPage.includes(page));
  }

  // Si es página pública, no hacer nada
  if (isPublicPage()) {
    console.log('📄 Página pública, omitiendo verificación de autenticación');
    return;
  }

  // Verificar que Auth esté disponible
  if (typeof Auth === 'undefined') {
    console.error(
      '❌ Auth no está disponible. Asegúrate de incluir auth.js antes de auth-guard.js'
    );
    window.location.href = 'login.html?error=auth_not_loaded';
    return;
  }

  try {
    // Esperar a que Auth esté inicializado
    await Auth.ready();

    // Verificar sesión con el backend (más seguro que solo isAuthenticated)
    const isAuthenticated = await Auth.verifySession();

    if (!isAuthenticated) {
      console.warn('⚠️ No hay sesión activa - redirigiendo a login');

      // Guardar URL de retorno para después del login
      const returnUrl = window.location.pathname + window.location.search;
      if (returnUrl && !returnUrl.includes('login.html')) {
        sessionStorage.setItem('returnUrl', returnUrl);
      }

      window.location.href = 'login.html?reason=session_expired';
      return;
    }

    // Sesión válida
    const user = Auth.getUser();
    console.log('✅ Sesión verificada:', user?.username || user?.usuario || 'usuario');

    // Verificar que el usuario tenga un negocio asignado
    if (user && (!user.negocios || user.negocios.length === 0)) {
      console.error('❌ Usuario sin negocios asignados');

      // Mostrar mensaje y redirigir a login
      if (typeof showNotification === 'function') {
        showNotification('Usuario sin negocios asignados. Contacta al administrador.', 'error');
      }

      setTimeout(() => {
        Auth.logout();
      }, 2000);
      return;
    }
  } catch (error) {
    console.error('❌ Error verificando autenticación:', error);

    // Si es un error de red y ya tenemos usuario, permitir continuar en modo offline
    const isNetworkError =
      error.message?.includes('fetch') ||
      error.message?.includes('network') ||
      error.message?.includes('Failed to fetch');

    if (isNetworkError && Auth._user) {
      console.warn('⚠️ Error de red, continuando en modo offline');
      return;
    }

    // Para otros errores, redirigir a login
    window.location.href = 'login.html?error=auth_failed';
  }
})();
