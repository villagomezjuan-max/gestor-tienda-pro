const SW_VERSION = 'gtp-cleanup-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      } catch (error) {
        // Ignorar errores de limpieza de caché para no bloquear la activación
        console.warn('[SW] No se pudo limpiar la caché legacy:', error);
      }

      await self.clients.claim();
    })()
  );
});

// No registramos manejador fetch para permitir que todas las peticiones
// pasen directamente a la red. El objetivo de este SW es reemplazar
// versiones antiguas defectuosas y mantener el scope limpio.
