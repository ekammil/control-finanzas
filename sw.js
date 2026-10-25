/* Control de Finanzas — trabajo sin internet */
const VERSION = 'cdf-v1.0.0';
const ARCHIVOS = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest', 'google-sync.gs',
  'js/util.js', 'js/store.js', 'js/calc.js', 'js/ui.js', 'js/screens.js', 'js/sheets.js', 'js/sheets2.js', 'js/sync.js', 'js/main.js',
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
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((enCache) => {
      const red = fetch(e.request).then((r) => {
        if (r && r.ok) { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); }
        return r;
      }).catch(() => enCache || caches.match('index.html'));
      return enCache || red;
    })
  );
});
