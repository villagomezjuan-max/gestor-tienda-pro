(function (global) {
  const TenantStorage = {
    prefix: 'gestor_tienda',

    getTenantId() {
      try {
        if (global.Database && typeof global.Database.getCurrentBusiness === 'function') {
          const negocio = global.Database.getCurrentBusiness();
          if (negocio) {
            return negocio;
          }
        }

        const stored = global.localStorage ? global.localStorage.getItem('negocio_actual') : null;
        return stored || 'default';
      } catch (error) {
        console.warn('TenantStorage.getTenantId: fallback to default', error);
        return 'default';
      }
    },

    buildKey(key) {
      const tenant = this.getTenantId();
      const normalizedKey = String(key || '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_\-:.]/g, '_');
      return `${this.prefix}::${tenant}::${normalizedKey}`;
    },

    getItem(key) {
      try {
        const scopedKey = this.buildKey(key);
        const value = global.localStorage.getItem(scopedKey);
        if (value !== null && value !== undefined) {
          return value;
        }

        const legacyValue = global.localStorage.getItem(key);
        if (legacyValue !== null && legacyValue !== undefined) {
          try {
            global.localStorage.setItem(scopedKey, legacyValue);
          } catch (persistError) {
            console.warn('TenantStorage.getItem: unable to persist migrated value', persistError);
          }
          return legacyValue;
        }
      } catch (error) {
        console.warn(`TenantStorage.getItem: error reading key "${key}"`, error);
      }
      return null;
    },

    setItem(key, value) {
      try {
        const scopedKey = this.buildKey(key);
        if (value === null || value === undefined) {
          global.localStorage.removeItem(scopedKey);
          return;
        }
        global.localStorage.setItem(scopedKey, String(value));
      } catch (error) {
        console.warn(`TenantStorage.setItem: error writing key "${key}"`, error);
      }
    },

    removeItem(key) {
      try {
        const scopedKey = this.buildKey(key);
        global.localStorage.removeItem(scopedKey);
      } catch (error) {
        console.warn(`TenantStorage.removeItem: error removing key "${key}"`, error);
      }
    },

    getJSON(key, fallback = null) {
      const raw = this.getItem(key);
      if (!raw) {
        return fallback;
      }
      try {
        return JSON.parse(raw);
      } catch (error) {
        console.warn(`TenantStorage.getJSON: invalid JSON for key "${key}"`, error);
        return fallback;
      }
    },

    setJSON(key, value) {
      try {
        if (value === null || value === undefined) {
          this.removeItem(key);
          return;
        }
        const serialized = JSON.stringify(value);
        this.setItem(key, serialized);
      } catch (error) {
        console.warn(`TenantStorage.setJSON: error serializing key "${key}"`, error);
      }
    },
  };

  global.TenantStorage = TenantStorage;
})(typeof window !== 'undefined' ? window : this);
