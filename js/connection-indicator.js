(function () {
  'use strict';

  const indicator = document.getElementById('connectionIndicator');
  if (!indicator) {
    return;
  }

  const labelEl = document.getElementById('connectionIndicatorLabel');
  const metaEl = document.getElementById('connectionIndicatorMeta');
  const refreshBtn = document.getElementById('connectionIndicatorRefresh');

  const STATE = {
    CHECKING: 'is-checking',
    ONLINE: 'is-online',
    OFFLINE: 'is-offline',
  };

  const CLASS_VISIBLE = 'is-visible';
  const CLASS_MINIMIZED = 'is-minimized';
  const CLASS_BUSY = 'is-busy';
  const CLASS_DRAGGING = 'is-dragging';
  const CLASS_CUSTOM_POSITION = 'has-custom-position';
  const AUTO_HIDE_DELAY = 4500;
  const STORAGE_KEY = 'connectionIndicatorPosition';

  const DEFAULT_INTERVAL = 15000;
  const FAILURE_INTERVAL = 7000;
  const MAX_TIMEOUT = 6000;
  const RETRY_MULTIPLIER = 1.5;

  let retryHandle = null;
  let lastResult = null;
  let lastDelay = DEFAULT_INTERVAL;
  let autoHideHandle = null;

  // Variables para el arrastre
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let hasMoved = false;

  // Crear el handle de arrastre
  const dragHandle = document.createElement('div');
  dragHandle.className = 'connection-indicator__drag-handle';
  dragHandle.setAttribute('title', 'Arrastra para mover');
  indicator.insertBefore(dragHandle, indicator.firstChild);

  // Cargar posición guardada
  function loadSavedPosition() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { left, top } = JSON.parse(saved);
        const rect = indicator.getBoundingClientRect();
        const maxLeft = window.innerWidth - rect.width;
        const maxTop = window.innerHeight - rect.height;

        // Validar que la posición esté dentro de la ventana
        const validLeft = Math.max(0, Math.min(left, maxLeft));
        const validTop = Math.max(0, Math.min(top, maxTop));

        indicator.style.left = validLeft + 'px';
        indicator.style.top = validTop + 'px';
        indicator.classList.add(CLASS_CUSTOM_POSITION);
        return true;
      }
    } catch (e) {
      console.warn('Error cargando posición del indicador:', e);
    }
    return false;
  }

  // Guardar posición
  function savePosition(left, top) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, top }));
    } catch (e) {
      console.warn('Error guardando posición del indicador:', e);
    }
  }

  // Resetear a posición por defecto (doble clic)
  function resetPosition() {
    localStorage.removeItem(STORAGE_KEY);
    indicator.style.left = '';
    indicator.style.top = '';
    indicator.classList.remove(CLASS_CUSTOM_POSITION);
  }

  // Funciones de arrastre
  function startDrag(e) {
    // Solo iniciar arrastre con botón izquierdo del mouse o touch
    if (e.type === 'mousedown' && e.button !== 0) return;

    // No arrastrar si se hace clic en el botón de refresh
    if (e.target.closest('.connection-indicator__refresh')) return;

    e.preventDefault();
    isDragging = true;
    hasMoved = false;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragStartX = clientX;
    dragStartY = clientY;

    const rect = indicator.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    indicator.classList.add(CLASS_DRAGGING);

    // Agregar listeners globales
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('touchend', stopDrag);
    document.addEventListener('touchcancel', stopDrag);
  }

  function onDrag(e) {
    if (!isDragging) return;

    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - dragStartX;
    const deltaY = clientY - dragStartY;

    // Detectar si realmente se ha movido (umbral de 5px)
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasMoved = true;
    }

    let newLeft = initialLeft + deltaX;
    let newTop = initialTop + deltaY;

    // Limitar a los bordes de la ventana
    const rect = indicator.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width;
    const maxTop = window.innerHeight - rect.height;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    indicator.style.left = newLeft + 'px';
    indicator.style.top = newTop + 'px';
    indicator.classList.add(CLASS_CUSTOM_POSITION);
  }

  function stopDrag(e) {
    if (!isDragging) return;

    isDragging = false;
    indicator.classList.remove(CLASS_DRAGGING);

    // Remover listeners globales
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('touchend', stopDrag);
    document.removeEventListener('touchcancel', stopDrag);

    // Guardar posición si se movió
    if (hasMoved) {
      const rect = indicator.getBoundingClientRect();
      savePosition(rect.left, rect.top);
    }
  }

  // Cargar posición al iniciar
  loadSavedPosition();

  // Eventos de arrastre
  indicator.addEventListener('mousedown', startDrag);
  indicator.addEventListener('touchstart', startDrag, { passive: false });

  // Doble clic para resetear posición
  indicator.addEventListener('dblclick', (e) => {
    if (!e.target.closest('.connection-indicator__refresh')) {
      resetPosition();
    }
  });

  // Ajustar posición cuando cambia el tamaño de la ventana
  window.addEventListener('resize', () => {
    if (indicator.classList.contains(CLASS_CUSTOM_POSITION)) {
      const rect = indicator.getBoundingClientRect();
      const maxLeft = window.innerWidth - rect.width;
      const maxTop = window.innerHeight - rect.height;

      let newLeft = Math.max(0, Math.min(rect.left, maxLeft));
      let newTop = Math.max(0, Math.min(rect.top, maxTop));

      indicator.style.left = newLeft + 'px';
      indicator.style.top = newTop + 'px';
      savePosition(newLeft, newTop);
    }
  });

  function nowLabel() {
    const date = new Date();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  function resolveHealthUrl() {
    const candidates = [];

    if (typeof window !== 'undefined') {
      if (typeof window.API_BASE_URL === 'string') {
        candidates.push(window.API_BASE_URL);
      }
      if (window.DatabaseAPI) {
        if (typeof window.DatabaseAPI.getBaseUrl === 'function') {
          candidates.push(window.DatabaseAPI.getBaseUrl());
        } else if (
          window.DatabaseAPI.config &&
          typeof window.DatabaseAPI.config.BASE_URL === 'string'
        ) {
          candidates.push(window.DatabaseAPI.config.BASE_URL);
        }
      }
    }

    if (typeof Utils !== 'undefined') {
      if (typeof Utils.getApiBaseUrl === 'function') {
        candidates.push(Utils.getApiBaseUrl());
      } else if (typeof Utils.apiUrl === 'function') {
        candidates.push(Utils.apiUrl(''));
      }
    }

    const usable = candidates.find((candidate) => candidate && typeof candidate === 'string');
    const fallbackOrigin =
      typeof window !== 'undefined' && window.location
        ? `${window.location.protocol}//${window.location.host}`
        : ((typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') 
            ? `${window.location.protocol}//${window.location.hostname}` 
            : 'http://localhost:3001');

    if (!usable) {
      return `${fallbackOrigin.replace(/\/+$/, '')}/health`;
    }

    const cleaned = usable.trim().replace(/\/+$/, '');
    const stripped = cleaned.replace(/\/api(?:\/v\d+)?$/i, '');

    return `${(stripped || cleaned).replace(/\/+$/, '')}/health`;
  }

  const healthEndpoint = resolveHealthUrl();

  function setState(state, labelText, metaText) {
    indicator.classList.remove(STATE.CHECKING, STATE.ONLINE, STATE.OFFLINE);
    indicator.classList.add(state);
    indicator.classList.add(CLASS_VISIBLE);
    indicator.classList.toggle(CLASS_BUSY, state !== STATE.ONLINE);

    if (labelEl) {
      labelEl.textContent = labelText;
    }
    if (metaEl) {
      metaEl.textContent = metaText || '';
    }

    if (state === STATE.ONLINE) {
      revealIndicator();
      scheduleAutoHide();
    } else {
      revealIndicator();
      clearTimeout(autoHideHandle);
    }
  }

  function revealIndicator() {
    indicator.classList.add(CLASS_VISIBLE);
    indicator.classList.remove(CLASS_MINIMIZED);
  }

  function scheduleAutoHide() {
    clearTimeout(autoHideHandle);
    if (!lastResult || lastResult.ok !== true || indicator.classList.contains('is-pinned')) {
      indicator.classList.remove(CLASS_MINIMIZED);
      return;
    }
    autoHideHandle = setTimeout(() => {
      indicator.classList.add(CLASS_MINIMIZED);
    }, AUTO_HIDE_DELAY);
  }

  async function pingBackend() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('Sin conexión de red');
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), MAX_TIMEOUT) : null;

    try {
      const startedAt = Date.now();
      const response = await fetch(healthEndpoint, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        headers: { Accept: 'application/json' },
        signal: controller ? controller.signal : undefined,
      });

      const latency = Date.now() - startedAt;

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.latency = latency;
        throw error;
      }

      let payload = null;
      try {
        payload = await response.json();
      } catch (parseError) {
        // Se permite respuesta sin JSON pero se reporta para depuración.
        console.warn('Health check sin JSON legible:', parseError);
      }

      const healthy = payload && (payload.status === 'ok' || payload.success === true);
      if (!healthy) {
        const error = new Error('Respuesta inválida del servidor');
        error.payload = payload;
        error.latency = latency;
        throw error;
      }

      return { ok: true, latency, payload };
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  function scheduleNext(delay) {
    clearTimeout(retryHandle);
    retryHandle = setTimeout(runCheck, delay);
  }

  async function runCheck(manual = false) {
    clearTimeout(retryHandle);
    lastDelay = manual ? DEFAULT_INTERVAL : lastDelay;

    setState(STATE.CHECKING, 'Verificando conexión...', manual ? 'Chequeo manual solicitado' : '');
    revealIndicator();

    try {
      const result = await pingBackend();
      lastResult = result;
      lastDelay = DEFAULT_INTERVAL;
      const latencyLabel = typeof result.latency === 'number' ? `${result.latency} ms` : 'OK';
      setState(
        STATE.ONLINE,
        'Conectado al servidor',
        `Actualizado ${nowLabel()} · ${latencyLabel}`
      );
      scheduleNext(DEFAULT_INTERVAL);
    } catch (error) {
      lastResult = { ok: false, error };
      const reason = error && error.message ? error.message : 'Sin respuesta del servidor';
      const nextDelay = Math.min(
        Math.round((lastDelay || FAILURE_INTERVAL) * RETRY_MULTIPLIER),
        60000
      );
      lastDelay = nextDelay;
      const meta = `Reintento en ${Math.round(nextDelay / 1000)}s · ${reason}`;
      setState(STATE.OFFLINE, 'Sin conexión estable', meta);
      scheduleNext(nextDelay);
    }
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      revealIndicator();
      runCheck(true);
    });
  }

  indicator.addEventListener('mouseenter', () => {
    revealIndicator();
    clearTimeout(autoHideHandle);
  });

  indicator.addEventListener('mouseleave', () => {
    if (lastResult?.ok) {
      scheduleAutoHide();
    }
  });

  indicator.addEventListener('click', (event) => {
    // Ignorar si se estaba arrastrando
    if (hasMoved) {
      hasMoved = false;
      return;
    }

    if (event.target.closest('.connection-indicator__refresh')) {
      return;
    }

    // Si se hace clic en el badge de facturas IA, abrir panel
    if (event.target.closest('.connection-indicator__badge')) {
      if (typeof Compras !== 'undefined' && typeof Compras.togglePanelFacturasIA === 'function') {
        Compras.togglePanelFacturasIA();
      }
      return;
    }

    // Si se hace clic en el badge de notificaciones, navegar
    if (event.target.closest('.connection-indicator__notif-badge')) {
      if (typeof Notificaciones !== 'undefined' && typeof Notificaciones.navegarANotificaciones === 'function') {
        Notificaciones.navegarANotificaciones();
      }
      return;
    }

    if (indicator.classList.contains(CLASS_MINIMIZED)) {
      revealIndicator();
      scheduleAutoHide();
      return;
    }

    if (lastResult?.ok) {
      indicator.classList.toggle('is-pinned');
      if (indicator.classList.contains('is-pinned')) {
        indicator.classList.remove(CLASS_MINIMIZED);
        clearTimeout(autoHideHandle);
      } else {
        scheduleAutoHide();
      }
    }
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => runCheck(true));
    window.addEventListener('offline', () => {
      clearTimeout(retryHandle);
      setState(STATE.OFFLINE, 'Modo sin conexión', 'Esperando reconexión de red local...');
    });
  }

  setState(STATE.CHECKING, 'Verificando conexión...', 'Inicializando monitoreo');
  runCheck(false);
})();
