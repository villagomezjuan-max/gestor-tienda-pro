/* ========================================
   SCRIPT DE MIGRACIÓN Y CORRECCIÓN
   Soluciona problemas del sistema y migra a DB mejorada
   ======================================== */

class SystemMigrator {
  constructor() {
    this.currentVersion = '2.0.0';
    this.fixes = [];
  }

  /**
   * Normaliza un valor de tema a 'light' o 'dark'
   * @param {string|null|undefined} theme
   * @returns {'light'|'dark'|null}
   */
  normalizeTheme(theme) {
    const themeManagerInstance = window.themeManager;
    if (themeManagerInstance && typeof themeManagerInstance.normalizeTheme === 'function') {
      return themeManagerInstance.normalizeTheme(theme, { fallback: null });
    }

    if (window.ThemeManager && typeof ThemeManager.normalizeTheme === 'function') {
      try {
        return ThemeManager.normalizeTheme(theme, { fallback: null });
      } catch (error) {
        console.warn(
          'ℹ️ Error usando ThemeManager.normalizeTheme, se usará fallback manual:',
          error
        );
      }
    }

    const token = (theme ?? '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z]/g, '');

    if (
      ['dark', 'darkmode', 'modooscuro', 'oscuro', 'nocturno', 'night', 'negro'].includes(token)
    ) {
      return 'dark';
    }

    if (['light', 'lightmode', 'modoclaro', 'claro', 'dia', 'day', 'blanco'].includes(token)) {
      return 'light';
    }

    if (['auto', 'automatico', 'automatic', 'system', 'sistema'].includes(token)) {
      const prefersDark =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }

    return null;
  }

  applyTheme(theme) {
    const normalized = this.normalizeTheme(theme) || 'dark';

    const themeManagerInstance = window.themeManager;

    if (themeManagerInstance && typeof themeManagerInstance.applyTheme === 'function') {
      themeManagerInstance.applyTheme(normalized);
      return { theme: normalized, via: 'themeManagerInstance' };
    }

    if (window.ThemeManager && typeof ThemeManager.apply === 'function') {
      try {
        ThemeManager.apply(normalized);
        return { theme: normalized, via: 'ThemeManager' };
      } catch (error) {
        console.warn(
          'ℹ️ Error aplicando ThemeManager como clase, se usará fallback manual:',
          error
        );
      }
    }

    const root = document.documentElement;
    root.setAttribute('data-theme', normalized);
    root.classList.toggle('dark-mode', normalized === 'dark');
    root.classList.toggle('light-mode', normalized === 'light');

    if (document.body) {
      document.body.classList.toggle('dark-mode', normalized === 'dark');
      document.body.classList.toggle('light-mode', normalized === 'light');
    }

    return { theme: normalized, via: 'manual' };
  }

  /**
   * Obtiene el tema almacenado en localStorage si es válido
   * @returns {'light'|'dark'|null}
   */
  getStoredTheme() {
    const sources = [
      {
        label: 'TenantStorage',
        getter: () =>
          window.TenantStorage && typeof TenantStorage.getItem === 'function'
            ? TenantStorage.getItem('gestor_tienda_theme')
            : null,
      },
      {
        label: 'localStorage',
        getter: () => {
          try {
            return localStorage.getItem('gestor_tienda_theme');
          } catch (error) {
            console.warn('ℹ️ No se pudo leer "gestor_tienda_theme" desde localStorage:', error);
            return null;
          }
        },
      },
      {
        label: 'legacy',
        getter: () => {
          try {
            return localStorage.getItem('theme');
          } catch (error) {
            console.warn('ℹ️ No se pudo leer "theme" (legacy) desde localStorage:', error);
            return null;
          }
        },
      },
    ];

    for (const source of sources) {
      try {
        const raw = source.getter();
        if (raw) {
          return {
            raw,
            normalized: this.normalizeTheme(raw),
            source: source.label,
          };
        }
      } catch (error) {
        console.warn(`ℹ️ No se pudo leer el tema desde ${source.label}:`, error);
      }
    }

    return { raw: null, normalized: null, source: null };
  }

  persistTheme(theme) {
    const normalized = this.normalizeTheme(theme) || 'dark';
    const result = { theme: normalized, via: 'localStorage', applied: false };

    try {
      if (window.themeManager && typeof window.themeManager.setTheme === 'function') {
        window.themeManager.setTheme(normalized);
        result.via = 'ThemeManager';
        result.applied = true;
      } else {
        if (window.TenantStorage && typeof TenantStorage.setItem === 'function') {
          TenantStorage.setItem('gestor_tienda_theme', normalized);
          result.via = 'TenantStorage';
        } else {
          localStorage.setItem('gestor_tienda_theme', normalized);
        }

        try {
          localStorage.setItem('gestor_tienda_theme', normalized);
        } catch (storageError) {
          if (result.via !== 'localStorage') {
            console.warn(
              'ℹ️ No se pudo sincronizar el tema a nivel global en localStorage:',
              storageError
            );
          }
        }
      }

      try {
        localStorage.removeItem('theme');
      } catch (cleanupError) {
        console.warn('ℹ️ No se pudo eliminar la preferencia legacy "theme":', cleanupError);
      }
    } catch (error) {
      console.warn('ℹ️ No se pudo persistir el tema preferido:', error);
      result.via = 'error';
      result.error = error;
    }

    return result;
  }

  /**
   * Ejecuta todas las correcciones necesarias
   */
  async runAllFixes() {
    console.log('🚀 INICIANDO CORRECCIÓN DEL SISTEMA');
    console.log('====================================');

    this.fixes = [];

    try {
      const config = (await Database.get('configuracion')) || {};
      const storedThemeInfo = this.getStoredTheme();
      const configTheme = this.normalizeTheme(config.tema);
      const fallbackTheme = this.normalizeTheme('auto') || 'dark';
      const preferredTheme = storedThemeInfo.normalized || configTheme || fallbackTheme;

      if (configTheme !== preferredTheme) {
        config.tema = preferredTheme;
        await Database.set('configuracion', config);
        this.fixes.push(`✅ Tema sincronizado en configuración (${preferredTheme})`);
      }

      if (!storedThemeInfo.raw || storedThemeInfo.normalized !== preferredTheme) {
        const persistence = this.persistTheme(preferredTheme);
        if (persistence.via !== 'error') {
          this.fixes.push(
            `✅ Tema guardado en preferencias (${preferredTheme}) [${persistence.via}]`
          );
        } else {
          this.fixes.push(
            '⚠️ No se pudo guardar el tema preferido en el almacenamiento de usuario'
          );
        }
      }

      const { theme: appliedTheme, via } = this.applyTheme(preferredTheme);
      const viaLabel = via === 'manual' ? 'aplicado manualmente' : 'aplicado mediante ThemeManager';
      this.fixes.push(`✅ Tema ${viaLabel} (${appliedTheme})`);

      await this.verifySystemIntegrity();
    } catch (error) {
      console.error('❌ Error ejecutando correcciones del sistema:', error);
      this.fixes.push(`❌ Error en runAllFixes: ${error.message}`);
    }

    if (this.fixes.length > 0) {
      this.showFixSummary();
    }
  }

  /**
   * Limpia archivos obsoletos del cache
   */
  clearObsoleteCache() {
    console.log('🧹 Limpiando cache obsoleto...');

    try {
      // Limpiar localStorage de entradas obsoletas
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('_old_') || key.includes('_backup_'))) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
      });

      if (keysToRemove.length > 0) {
        console.log(`✅ Eliminadas ${keysToRemove.length} entradas obsoletas del cache`);
        this.fixes.push(`✅ Limpieza de cache: ${keysToRemove.length} entradas eliminadas`);
      }

      // Limpiar cache de la Enhanced DB si está disponible
      if (window.EnhancedDB && typeof EnhancedDB.invalidateCache === 'function') {
        EnhancedDB.invalidateCache();
        this.fixes.push('✅ Cache de Enhanced DB limpiado');
      }
    } catch (error) {
      console.warn('⚠️ Error limpiando cache:', error);
    }
  }

  /**
   * Verifica la integridad del sistema
   */
  async verifySystemIntegrity() {
    console.log('🔍 Verificando integridad del sistema...');

    const checks = [];

    try {
      // 1. Verificar que Database esté funcionando
      const dbTest = await Database.get('configuracion');
      checks.push('✅ Database funcional');

      // 2. Verificar configuración inicial
      if (dbTest && dbTest.inicializado === true) {
        checks.push('✅ Sistema inicializado correctamente');
      } else {
        checks.push('⚠️ Sistema requiere configuración inicial');
      }

      // 3. Verificar scripts críticos
      const criticalScripts = ['Utils', 'Database', 'InitialSetupWizard'];
      criticalScripts.forEach((script) => {
        if (window[script]) {
          checks.push(`✅ ${script} cargado`);
        } else {
          checks.push(`❌ ${script} faltante`);
        }
      });

      // 4. Verificar almacenamiento
      if (window.EnhancedDB) {
        const storageInfo = await EnhancedDB.getStorageInfo();
        checks.push(
          `✅ Almacenamiento: ${storageInfo.type} (${storageInfo.percentageUsed?.toFixed(1) || 'N/A'}% usado)`
        );
      }

      this.fixes.push('✅ Verificación de integridad completada');
      console.log('✅ Integridad del sistema verificada');
    } catch (error) {
      checks.push(`❌ Error en verificación: ${error.message}`);
      console.error('❌ Error verificando integridad:', error);
    }

    return checks;
  }

  /**
   * Muestra resumen de correcciones aplicadas
   */
  showFixSummary() {
    console.log('\n🎉 RESUMEN DE CORRECCIONES');
    console.log('===========================');

    this.fixes.forEach((fix, index) => {
      console.log(`${index + 1}. ${fix}`);
    });

    console.log(`\n✅ Total de correcciones aplicadas: ${this.fixes.length}`);
    console.log('✨ Sistema optimizado y listo para usar');

    // Notificaciones deshabilitadas para evitar duplicados de mensajes
  }

  /**
   * Función utilitaria para verificar si un script está cargado
   */
  async waitForScript(scriptName, maxWait = 5000) {
    const start = Date.now();
    while (!window[scriptName] && Date.now() - start < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return !!window[scriptName];
  }
}

// Crear instancia del migrador
const systemMigrator = new SystemMigrator();

// Auto-ejecutar correcciones cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  // Esperar un poco para que se carguen otros scripts
  setTimeout(async () => {
    console.log('🚀 Iniciando correcciones automáticas del sistema...');
    await systemMigrator.runAllFixes();
  }, 1000);
});

// Exponer globalmente para uso manual
window.SystemMigrator = SystemMigrator;
window.systemMigrator = systemMigrator;

// Función de conveniencia para ejecutar correcciones manualmente
window.fixSystem = () => systemMigrator.runAllFixes();
