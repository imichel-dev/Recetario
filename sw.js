// Service worker: guarda los archivos de la app para usarla sin conexión.
// Estrategia: responde al instante desde la caché y, si hay conexión,
// actualiza la copia en segundo plano (la versión nueva se ve al volver a abrir).
const CACHE = 'recetario-v2';
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/estilos.css',
  './js/app.js',
  './js/calculo.js',
  './js/datos.js',
  './js/sync.js',
  './js/lib/qrcode.js',
  './fuentes/figtree.woff2',
  './fuentes/bricolage.woff2',
  './iconos/icono-192.png',
  './iconos/icono-512.png',
  './iconos/icono-maskable-512.png',
  './iconos/apple-touch-icon.png',
  './iconos/favicon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const enCache = await cache.match(req, { ignoreSearch: true });
      const deRed = fetch(req)
        .then((resp) => { if (resp && resp.ok) cache.put(req, resp.clone()); return resp; })
        .catch(() => null);
      if (enCache) { e.waitUntil(deRed); return enCache; }
      const resp = await deRed;
      if (resp) return resp;
      if (req.mode === 'navigate') return cache.match('./index.html');
      return Response.error();
    })
  );
});
