/**
 * FORZAR MENÚ HAMBURGUESA VISIBLE - SOLUCIÓN DEFINITIVA
 * Este script inyecta estilos inline y asegura visibilidad absoluta
 */

(function forceMenuHamburger() {
  'use strict';

  console.log('🔧 Iniciando corrección forzada del menú hamburguesa...');

  // Inyectar estilos críticos inmediatamente
  const criticalStyles = document.createElement('style');
  criticalStyles.id = 'critical-menu-styles';
  criticalStyles.textContent = `
    /* FORZAR MENÚ HAMBURGUESA - LIMPIO Y MINIMALISTA */
    @media (max-width: 768px) {
      .menu-toggle {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 44px !important;
        height: 44px !important;
        min-width: 44px !important;
        padding: 0 !important;
        margin: 0 !important;
        background: transparent !important;
        color: var(--primary-color, #6366f1) !important;
        border: none !important;
        border-radius: 8px !important;
        font-size: 1.5rem !important;
        cursor: pointer !important;
        box-shadow: none !important;
        position: relative !important;
        z-index: 9999 !important;
        flex-shrink: 0 !important;
        transition: transform 0.15s ease !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: all !important;
      }
      
      .menu-toggle i {
        display: block !important;
        font-size: 1.5rem !important;
        line-height: 1 !important;
        color: currentColor !important;
      }
      
      .menu-toggle:hover {
        background: rgba(99, 102, 241, 0.08) !important;
        transform: scale(1.05) !important;
      }
      
      .menu-toggle:active {
        transform: scale(0.92) !important;
        background: rgba(99, 102, 241, 0.15) !important;
      }
      
      .main-header {
        display: flex !important;
        padding: 10px 12px !important;
        gap: 12px !important;
        box-shadow: none !important;
      }
    }
  `;
  document.head.insertBefore(criticalStyles, document.head.firstChild);

  // Función para forzar visibilidad del botón
  function ensureButtonVisible() {
    const button = document.getElementById('menuToggle');
    if (!button) {
      console.warn('⚠️ Botón menuToggle no encontrado en DOM');
      return false;
    }

    console.log('✅ Botón menuToggle encontrado');

    // Aplicar estilos inline directamente
    if (window.innerWidth <= 768) {
      button.style.cssText = `
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 44px !important;
        height: 44px !important;
        min-width: 44px !important;
        padding: 0 !important;
        background: transparent !important;
        color: var(--primary-color, #6366f1) !important;
        border: none !important;
        border-radius: 8px !important;
        font-size: 1.5rem !important;
        box-shadow: none !important;
        z-index: 9999 !important;
        flex-shrink: 0 !important;
        visibility: visible !important;
        opacity: 1 !important;
      `;

      // Asegurar que el icono sea visible
      const icon = button.querySelector('i');
      if (icon) {
        icon.style.cssText = `
          display: block !important;
          font-size: 1.5rem !important;
          color: currentColor !important;
        `;
      }

      console.log('✅ Estilos inline aplicados al botón');
      console.log('📊 Estilos computados:', window.getComputedStyle(button).display);
    }

    return true;
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(ensureButtonVisible, 100);
    });
  } else {
    setTimeout(ensureButtonVisible, 100);
  }

  // Re-aplicar cada vez que cambie el tamaño de ventana
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(ensureButtonVisible, 100);
  });

  // Observer para detectar cambios en el DOM (con control para evitar bucle infinito)
  let observerCallCount = 0;
  const MAX_OBSERVER_CALLS = 10;

  const observer = new MutationObserver(() => {
    observerCallCount++;
    if (observerCallCount > MAX_OBSERVER_CALLS) {
      console.log('✅ Límite de observaciones alcanzado - Deteniendo observer');
      observer.disconnect();
      return;
    }

    const found = ensureButtonVisible();
    if (found) {
      console.log('✅ Botón encontrado - Deteniendo observer');
      observer.disconnect();
    }
  });

  // Observar cambios en el body
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });

    // Auto-desconectar después de 5 segundos como medida de seguridad
    setTimeout(() => {
      if (observer) {
        console.log('⏱️ Timeout de observer alcanzado - Deteniendo');
        observer.disconnect();
      }
    }, 5000);
  }

  console.log('✅ Sistema de forzado de menú hamburguesa activado');
})();
