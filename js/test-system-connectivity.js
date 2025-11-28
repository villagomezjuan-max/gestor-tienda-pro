/**
 * Sistema de Prueba de Conectividad
 * Verifica la conexión con el backend y otros servicios
 */

(function () {
  'use strict';

  const API_BASE_URL = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') 
    ? `${window.location.protocol}//${window.location.hostname}` 
    : 'http://localhost:3001';

  window.SystemConnectivity = {
    /**
     * Verifica la conectividad con el backend
     */
    testBackendConnection: async function () {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Backend conectado:', data);
          return { success: true, data };
        } else {
          console.error('❌ Backend respondió con error:', response.status);
          return { success: false, error: `HTTP ${response.status}` };
        }
      } catch (error) {
        console.error('❌ Error conectando con backend:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Verifica la autenticación actual
     */
    testAuthentication: async function () {
      try {
        if (typeof Auth === 'undefined') {
          return { success: false, error: 'Auth module no disponible' };
        }

        const isAuth = Auth.isAuthenticated();
        console.log(`🔐 Autenticación: ${isAuth ? 'Activa' : 'Inactiva'}`);

        if (isAuth) {
          const user = Auth.getUser();
          console.log('👤 Usuario actual:', user);
          return { success: true, authenticated: true, user };
        } else {
          return { success: true, authenticated: false };
        }
      } catch (error) {
        console.error('❌ Error verificando autenticación:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Verifica el acceso a la base de datos
     */
    testDatabaseAccess: async function () {
      try {
        if (typeof Database === 'undefined') {
          return { success: false, error: 'Database module no disponible' };
        }

        const hasDB = Database.db !== null && Database.db !== undefined;
        console.log(`💾 Base de datos: ${hasDB ? 'Disponible' : 'No disponible'}`);

        if (hasDB) {
          const stats = {
            productos: Database.db.productos?.length || 0,
            clientes: Database.db.clientes?.length || 0,
            ventas: Database.db.ventas?.length || 0,
          };
          console.log('📊 Estadísticas DB:', stats);
          return { success: true, available: true, stats };
        } else {
          return { success: true, available: false };
        }
      } catch (error) {
        console.error('❌ Error verificando base de datos:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Ejecuta todas las pruebas de conectividad
     */
    runAllTests: async function () {
      console.log('🔍 Iniciando pruebas de conectividad...');

      const results = {
        backend: await this.testBackendConnection(),
        auth: await this.testAuthentication(),
        database: await this.testDatabaseAccess(),
        timestamp: new Date().toISOString(),
      };

      console.log('📋 Resultados de pruebas:', results);

      // Mostrar resumen
      const allPassed = results.backend.success && results.auth.success && results.database.success;

      if (allPassed) {
        console.log('✅ Todas las pruebas pasaron correctamente');
      } else {
        console.warn('⚠️ Algunas pruebas fallaron');
      }

      return results;
    },

    /**
     * Muestra un reporte visual de conectividad
     */
    showConnectivityReport: async function () {
      const results = await this.runAllTests();

      let report = '=== REPORTE DE CONECTIVIDAD ===\n\n';

      report += `Backend: ${results.backend.success ? '✅' : '❌'}\n`;
      if (results.backend.data) {
        report += `  Status: ${results.backend.data.status || 'OK'}\n`;
      }

      report += `\nAutenticación: ${results.auth.authenticated ? '✅' : '⚠️'}\n`;
      if (results.auth.user) {
        report += `  Usuario: ${results.auth.user.username || 'N/A'}\n`;
        report += `  Rol: ${results.auth.user.rol || 'N/A'}\n`;
      }

      report += `\nBase de Datos: ${results.database.available ? '✅' : '❌'}\n`;
      if (results.database.stats) {
        report += `  Productos: ${results.database.stats.productos}\n`;
        report += `  Clientes: ${results.database.stats.clientes}\n`;
        report += `  Ventas: ${results.database.stats.ventas}\n`;
      }

      console.log(report);

      if (typeof Utils !== 'undefined' && Utils.showToast) {
        const allOk = results.backend.success && results.auth.success && results.database.success;
        Utils.showToast(
          allOk ? 'Sistema operativo correctamente' : 'Problemas de conectividad detectados',
          allOk ? 'success' : 'warning'
        );
      }

      return report;
    },
  };

  // Auto-test en desarrollo (comentar en producción)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Modo desarrollo detectado');
    // Ejecutar pruebas después de 2 segundos
    setTimeout(() => {
      SystemConnectivity.runAllTests();
    }, 2000);
  }

  console.log('✅ Sistema de prueba de conectividad cargado');
})();
