/* Norte: service worker. La app abre sin conexión; con conexión siempre trae la versión más nueva. */
const VERSION = 'norte-v2-10';
const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'manifest.en.json',
  'manifest.fr.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'fonts/atkinsonhyperlegible-i400-latin-ext.woff2',
  'fonts/atkinsonhyperlegible-i400-latin.woff2',
  'fonts/atkinsonhyperlegible-n400-latin-ext.woff2',
  'fonts/atkinsonhyperlegible-n400-latin.woff2',
  'fonts/atkinsonhyperlegible-n700-latin-ext.woff2',
  'fonts/atkinsonhyperlegible-n700-latin.woff2',
  'fonts/bricolagegrotesque-n400_800-latin-ext.woff2',
  'fonts/bricolagegrotesque-n400_800-latin.woff2',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function withTimeout(p, ms) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then(v => { clearTimeout(t); res(v); }, x => { clearTimeout(t); rej(x); }); }); }
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // La página: primero la red (para recibir actualizaciones), y si no hay red, la copia guardada
  if (req.mode === 'navigate') {
    // Cada página se guarda con su propio nombre: la página de ventas y las legales no deben pisar la app
    const file = url.pathname.split('/').pop();
    const isApp = file === '' || file === 'index.html';
    const key = isApp ? 'index.html' : url.pathname;
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const res = await withTimeout(fetch(req), 5000);
        if (res && res.ok && res.type === 'basic') cache.put(key, res.clone());
        return res;
      } catch (x) {
        const hit = await cache.match(key);
        if (hit) return hit;
        if (isApp) return (await cache.match('./')) || Response.error();
        return Response.error();
      }
    })());
    return;
  }
  // Íconos, fuentes y demás archivos fijos: primero la copia guardada
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (x) { return Response.error(); }
  })());
});
