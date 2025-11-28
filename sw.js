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
        console.warn('[SW] No se pudo limpiar la caché legacy:', error);
      }

      await self.clients.claim();
    })()
  );
});

// No manejamos eventos fetch para dejar pasar todo el tráfico a la red.
