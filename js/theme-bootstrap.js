(function bootstrapTheme() {
  var STORAGE_KEY = 'gestor_tienda_theme';
  var SESSION_KEY = 'gestor_tienda_last_theme';
  var PREFIX = 'gestor_tienda::';
  var DEFAULT_THEME = 'dark';

  function normalizeTheme(raw) {
    if (!raw) {
      return null;
    }

    try {
      var token = String(raw).trim().toLowerCase();

      if (typeof token.normalize === 'function') {
        token = token.normalize('NFD');
      }

      token = token.replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');

      if (
        token === 'dark' ||
        token === 'darkmode' ||
        token === 'modooscuro' ||
        token === 'oscuro' ||
        token === 'nocturno' ||
        token === 'night' ||
        token === 'negro'
      ) {
        return 'dark';
      }

      if (
        token === 'light' ||
        token === 'lightmode' ||
        token === 'modoclaro' ||
        token === 'claro' ||
        token === 'dia' ||
        token === 'day' ||
        token === 'blanco'
      ) {
        return 'light';
      }

      if (
        token === 'auto' ||
        token === 'automatico' ||
        token === 'automatic' ||
        token === 'system' ||
        token === 'sistema'
      ) {
        return null;
      }
    } catch (error) {
      console.warn('theme-bootstrap.normalizeTheme: error al normalizar', error);
    }

    return null;
  }

  function getSystemTheme() {
    // El sistema debe iniciar siempre en modo oscuro por defecto.
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return DEFAULT_THEME;
      }
    } catch (error) {
      console.warn('theme-bootstrap.getSystemTheme: no se pudo leer prefers-color-scheme', error);
    }
    return DEFAULT_THEME;
  }

  function getLocalStorage() {
    try {
      return window.localStorage;
    } catch (error) {
      console.warn('theme-bootstrap.getLocalStorage: acceso denegado', error);
      return null;
    }
  }

  function getSessionStorage() {
    try {
      return window.sessionStorage;
    } catch (error) {
      console.warn('theme-bootstrap.getSessionStorage: acceso denegado', error);
      return null;
    }
  }

  function readStoredTheme() {
    var storage = getLocalStorage();
    var theme = null;

    if (storage) {
      try {
        var negocioId = storage.getItem('negocio_actual');
        var candidates = [];

        if (negocioId) {
          candidates.push(PREFIX + negocioId + '::' + STORAGE_KEY);
        }

        candidates.push(PREFIX + 'default::' + STORAGE_KEY);
        candidates.push(STORAGE_KEY);

        for (var i = 0; i < candidates.length; i += 1) {
          var candidate = candidates[i];
          if (!candidate) {
            continue;
          }
          var value = storage.getItem(candidate);
          if (value) {
            theme = value;
            break;
          }
        }

        if (!theme) {
          var suffix = '::' + STORAGE_KEY;
          for (var index = 0; index < storage.length; index += 1) {
            var key = storage.key(index);
            if (key && key.endsWith(suffix)) {
              var scopedValue = storage.getItem(key);
              if (scopedValue) {
                theme = scopedValue;
                break;
              }
            }
          }
        }
      } catch (error) {
        console.warn('theme-bootstrap.readStoredTheme: no se pudo leer localStorage', error);
      }
    }

    if (!theme) {
      var session = getSessionStorage();
      if (session) {
        theme = session.getItem(SESSION_KEY);
      }
    }

    return theme;
  }

  function persistBootstrapTheme(theme) {
    var session = getSessionStorage();
    if (session && theme) {
      try {
        session.setItem(SESSION_KEY, theme);
      } catch (error) {
        console.warn('theme-bootstrap.persistBootstrapTheme: no se pudo guardar en sesión', error);
      }
    }
  }

  function applyInitialTheme(theme) {
    var normalized = normalizeTheme(theme);
    if (!normalized) {
      normalized = getSystemTheme() || DEFAULT_THEME;
    }

    if (normalized !== DEFAULT_THEME && normalized !== 'light') {
      normalized = DEFAULT_THEME;
    }

    document.documentElement.setAttribute('data-theme', normalized);
    document.documentElement.dataset.initialTheme = normalized;
    persistBootstrapTheme(normalized);
  }

  applyInitialTheme(readStoredTheme());
})();
