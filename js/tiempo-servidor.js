/**
 * TIEMPO SERVIDOR - Anti-Fraude
 * Obtiene fecha y hora de servidores externos confiables
 * Zona horaria: America/Guayaquil (Ecuador) UTC-5
 * Evita manipulación de la hora del sistema local
 */

const TiempoServidor = {
  // Cache de la diferencia entre tiempo local y servidor
  _offsetMs: 0,
  _ultimaSincronizacion: null,
  _sincronizado: false,
  _intentosFallidos: 0,
  _zonaHoraria: 'America/Guayaquil',
  _utcOffset: -5, // Ecuador UTC-5
  
  // Servidores de tiempo (múltiples para redundancia)
  // PRIORIDAD: 1. Backend local (no requiere CSP), 2. APIs externas como fallback
  servidores: [
    // Backend local - primera opción (evita problemas de CSP)
    { url: '/api/tiempo', tipo: 'backend' },
    // Fallback a APIs externas (pueden requerir CSP)
    { url: 'https://worldtimeapi.org/api/timezone/America/Guayaquil', tipo: 'worldtimeapi' },
    { url: 'https://timeapi.io/api/Time/current/zone?timeZone=America/Guayaquil', tipo: 'timeapi' }
  ],

  /**
   * Sincroniza con servidor de tiempo externo
   * @returns {Promise<boolean>} true si sincronizó correctamente
   */
  async sincronizar() {
    console.log('🕐 Sincronizando con servidor de tiempo (Ecuador/Guayaquil)...');
    
    for (const servidor of this.servidores) {
      try {
        const tiempoAntes = Date.now();
        
        // Construir URL absoluta si es relativa (backend local)
        let url = servidor.url;
        if (url.startsWith('/')) {
          // Usar el mismo origen que la página, sin duplicar /api
          const origin = window.location.origin;
          url = origin + servidor.url;
        }
        
        const response = await fetch(url, { 
          method: 'GET',
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' },
          credentials: servidor.tipo === 'backend' ? 'include' : 'omit'
        });
        const tiempoDespues = Date.now();
        
        if (!response.ok) continue;
        
        const data = await response.json();
        console.log(`📡 Respuesta de ${servidor.tipo}:`, data);
        
        // Calcular latencia de red (dividir por 2 para estimar tiempo de ida)
        const latencia = (tiempoDespues - tiempoAntes) / 2;
        
        // Extraer timestamp del servidor según el formato de respuesta
        let timestampServidor = null;
        
        if (servidor.tipo === 'backend' && data.unixtime) {
          // Backend local devuelve unixtime en segundos
          timestampServidor = data.unixtime * 1000;
          console.log('✅ Usando tiempo del backend local');
        } else if (data.unixtime) {
          // worldtimeapi.org tiene unixtime en segundos
          timestampServidor = data.unixtime * 1000;
          console.log('✅ Usando unixtime de worldtimeapi');
        } else if (data.datetime) {
          // worldtimeapi.org formato: "2025-11-27T10:30:45.123456-05:00"
          timestampServidor = new Date(data.datetime).getTime();
        } else if (data.dateTime) {
          // timeapi.io - construir fecha manualmente
          // Formato: "2025-11-27T10:30:45.1234567"
          const dt = data.dateTime.split('.')[0]; // Quitar microsegundos
          timestampServidor = new Date(dt + '-05:00').getTime();
        }
        
        if (timestampServidor && !isNaN(timestampServidor)) {
          // Ajustar por latencia
          timestampServidor += latencia;
          
          // Calcular diferencia con tiempo local
          const tiempoLocal = Date.now();
          this._offsetMs = timestampServidor - tiempoLocal;
          this._ultimaSincronizacion = tiempoLocal;
          this._sincronizado = true;
          this._intentosFallidos = 0;
          
          const diferenciaSeg = Math.abs(this._offsetMs / 1000);
          const nombreServidor = servidor.tipo || servidor.url;
          console.log(`✅ Tiempo sincronizado desde: ${nombreServidor}`);
          console.log(`   Hora Ecuador: ${this.obtenerHora()}`);
          console.log(`   Fecha Ecuador: ${this.obtenerFechaISO()}`);
          console.log(`   Diferencia con local: ${diferenciaSeg.toFixed(1)} segundos`);
          
          // Alerta si hay diferencia significativa (posible manipulación)
          if (diferenciaSeg > 60) {
            console.warn(`⚠️ ALERTA: La hora del sistema difiere ${diferenciaSeg.toFixed(0)}s del servidor`);
            this._alertarManipulacion(diferenciaSeg);
          }
          
          return true;
        }
      } catch (e) {
        const nombreServidor = servidor.tipo || servidor.url || servidor;
        console.warn(`❌ Error con ${nombreServidor}:`, e.message);
        continue;
      }
    }
    
    this._intentosFallidos++;
    console.error('❌ No se pudo sincronizar con ningún servidor de tiempo');
    
    // Si falló muchas veces, usar tiempo local pero marcarlo
    if (this._intentosFallidos >= 3) {
      console.warn('⚠️ Usando tiempo local (no verificado)');
    }
    
    return false;
  },

  /**
   * Alerta cuando se detecta manipulación de hora
   */
  _alertarManipulacion(diferenciaSeg) {
    // Guardar registro de la alerta
    const alertas = JSON.parse(localStorage.getItem('alertas_tiempo') || '[]');
    alertas.push({
      fecha: new Date().toISOString(),
      diferencia: diferenciaSeg,
      tipo: 'manipulacion_hora'
    });
    // Mantener solo últimas 50 alertas
    if (alertas.length > 50) alertas.shift();
    localStorage.setItem('alertas_tiempo', JSON.stringify(alertas));
    
    // Notificar si hay función de notificaciones
    if (window.NotificacionesManager?.mostrar) {
      window.NotificacionesManager.mostrar(
        `⚠️ ALERTA: La hora del sistema está ${Math.round(diferenciaSeg / 60)} minutos desincronizada`,
        'warning'
      );
    }
  },

  /**
   * Obtiene la fecha/hora REAL del servidor en zona horaria Ecuador
   * @returns {Date} Fecha corregida según servidor
   */
  obtenerFechaReal() {
    const ahora = Date.now();
    
    // Si no está sincronizado o han pasado más de 10 minutos, resincronizar
    if (!this._sincronizado || 
        (this._ultimaSincronizacion && (ahora - this._ultimaSincronizacion) > 600000)) {
      // Sincronizar en background (no bloquear)
      this.sincronizar().catch(() => {});
    }
    
    // Retornar fecha ajustada con el offset
    return new Date(ahora + this._offsetMs);
  },

  /**
   * Obtiene fecha/hora en zona horaria de Ecuador (UTC-5)
   * @returns {Date} Fecha en hora de Ecuador
   */
  obtenerFechaEcuador() {
    const fechaReal = this.obtenerFechaReal();
    // Convertir a hora de Ecuador usando Intl
    const opciones = { timeZone: 'America/Guayaquil' };
    const fechaStr = fechaReal.toLocaleString('en-CA', { 
      ...opciones,
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return new Date(fechaStr.replace(',', ''));
  },

  /**
   * Obtiene fecha en formato ISO (YYYY-MM-DD) - FECHA ECUADOR
   * @returns {string} Fecha en formato "2025-11-27"
   */
  obtenerFechaISO() {
    const fechaReal = this.obtenerFechaReal();
    // Usar Intl para obtener la fecha en zona horaria Ecuador
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(fechaReal); // Formato: "2025-11-27"
  },

  /**
   * Obtiene hora en formato HH:MM:SS - HORA ECUADOR
   * @returns {string} Hora en formato "10:30:45"
   */
  obtenerHora() {
    const fechaReal = this.obtenerFechaReal();
    return fechaReal.toLocaleTimeString('es-EC', {
      timeZone: 'America/Guayaquil',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  },

  /**
   * Obtiene fecha formateada para mostrar - ECUADOR
   * @returns {string} Fecha formateada "27/11/2025"
   */
  obtenerFechaFormateada() {
    const fechaReal = this.obtenerFechaReal();
    return fechaReal.toLocaleDateString('es-EC', {
      timeZone: 'America/Guayaquil',
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  },

  /**
   * Obtiene timestamp REAL en milisegundos
   * @returns {number} Timestamp corregido
   */
  obtenerTimestamp() {
    return Date.now() + this._offsetMs;
  },

  /**
   * Verifica si está sincronizado con servidor
   * @returns {boolean}
   */
  estaSincronizado() {
    return this._sincronizado;
  },

  /**
   * Obtiene información de estado
   * @returns {object}
   */
  obtenerEstado() {
    return {
      sincronizado: this._sincronizado,
      offsetMs: this._offsetMs,
      ultimaSincronizacion: this._ultimaSincronizacion 
        ? new Date(this._ultimaSincronizacion).toISOString() 
        : null,
      intentosFallidos: this._intentosFallidos,
      fechaServidor: this.obtenerFechaISO(),
      horaServidor: this.obtenerHora()
    };
  },

  /**
   * Valida que una fecha de transacción sea válida
   * (no puede ser futura ni muy antigua)
   * @param {string|Date} fecha - Fecha a validar
   * @returns {{valida: boolean, razon: string}}
   */
  validarFechaTransaccion(fecha) {
    const fechaTransaccion = new Date(fecha);
    const fechaReal = this.obtenerFechaReal();
    
    // No puede ser en el futuro
    if (fechaTransaccion > fechaReal) {
      return {
        valida: false,
        razon: 'La fecha de la transacción es futura'
      };
    }
    
    // No puede ser de hace más de 30 días (configurable)
    const hace30Dias = new Date(fechaReal);
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    
    if (fechaTransaccion < hace30Dias) {
      return {
        valida: false,
        razon: 'La fecha de la transacción es muy antigua (más de 30 días)'
      };
    }
    
    return { valida: true, razon: null };
  }
};

// Sincronizar automáticamente al cargar
document.addEventListener('DOMContentLoaded', () => {
  TiempoServidor.sincronizar().then(ok => {
    if (ok) {
      console.log('🕐 Sistema de tiempo anti-fraude activo (Ecuador/Guayaquil UTC-5)');
      console.log(`   📅 Fecha: ${TiempoServidor.obtenerFechaFormateada()}`);
      console.log(`   ⏰ Hora: ${TiempoServidor.obtenerHora()}`);
      console.log(`   🌍 Zona: America/Guayaquil`);
    } else {
      console.warn('⚠️ No se pudo sincronizar tiempo - usando hora local');
    }
  });
  
  // Resincronizar cada 5 minutos
  setInterval(() => {
    TiempoServidor.sincronizar().catch(() => {});
  }, 300000);
});

// Exponer globalmente
window.TiempoServidor = TiempoServidor;

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TiempoServidor;
}
