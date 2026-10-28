/* Control de Finanzas — trabajo sin internet */
const VERSION = 'cdf-v1.4.0';
const ARCHIVOS = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest', 'google-sync.gs',
  'js/util.js', 'js/store.js', 'js/calc.js', 'js/ui.js', 'js/planetas.js', 'js/screens.js', 'js/sheets.js', 'js/sheets2.js', 'js/sync.js', 'js/cuestionario.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Google Sheets va directo a la red
  // Con internet: siempre lo más nuevo. Sin internet (o si tarda): lo guardado.
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch(e.request, { signal: ctrl.signal, cache: 'no-cache' });
      clearTimeout(t);
      if (r && r.ok) cache.put(e.request, r.clone());
      return r;
    } catch (err) {
      return (await caches.match(e.request, { ignoreSearch: true })) || (await caches.match('index.html')) || Response.error();
    }
  })());
});
