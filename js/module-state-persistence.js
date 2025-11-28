(function () {
  if (!window) {
    return;
  }

  const STORAGE_PREFIX = 'gt_module_state_';
  const registry = new Map();
  let storageAvailable = true;

  function safeLocalStorage() {
    if (!storageAvailable) return null;
    try {
      return window.localStorage;
    } catch (error) {
      console.warn('[ModuleStatePersistence] localStorage inaccesible:', error.message);
      storageAvailable = false;
      return null;
    }
  }

  function getKey(name) {
    return `${STORAGE_PREFIX}${name}`;
  }

  function parseRecord(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn(
        '[ModuleStatePersistence] No se pudo parsear el estado guardado:',
        error.message
      );
      return null;
    }
  }

  function loadState(name) {
    const storage = safeLocalStorage();
    if (!storage) return null;
    const raw = storage.getItem(getKey(name));
    return parseRecord(raw);
  }

  function saveState(name, state, version = '1.0') {
    if (!state) return;
    const storage = safeLocalStorage();
    if (!storage) return;
    try {
      const payload = {
        version,
        savedAt: new Date().toISOString(),
        state,
      };
      storage.setItem(getKey(name), JSON.stringify(payload));
    } catch (error) {
      console.warn('[ModuleStatePersistence] Error al guardar estado', name, error.message);
    }
  }

  function clearState(name) {
    const storage = safeLocalStorage();
    if (!storage) return;
    try {
      storage.removeItem(getKey(name));
    } catch (error) {
      console.warn('[ModuleStatePersistence] No se pudo limpiar el estado de', name, error.message);
    }
  }

  function flushModule(name, entry) {
    if (!entry || typeof entry.onSave !== 'function') return;
    try {
      const snapshot = entry.onSave();
      if (snapshot) {
        saveState(name, snapshot, entry.version);
      }
    } catch (error) {
      console.warn(
        '[ModuleStatePersistence] No se pudo generar snapshot para',
        name,
        error.message
      );
    }
  }

  function flushAll() {
    registry.forEach((entry, name) => flushModule(name, entry));
  }

  window.addEventListener('beforeunload', () => {
    flushAll();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAll();
    }
  });

  const ModuleStatePersistence = {
    register(name, options = {}) {
      if (!name || typeof name !== 'string') {
        throw new Error('ModuleStatePersistence.register requiere un nombre válido');
      }
      const { version = '1.0', onSave } = options;
      registry.set(name, { version, onSave });
      return loadState(name);
    },
    saveState,
    loadState,
    clearState,
    flush: flushAll,
  };

  window.ModuleStatePersistence = ModuleStatePersistence;
})();
