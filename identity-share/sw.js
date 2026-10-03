const CACHE_PREFIX = 'identity-share-';
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './js/core.js',
  './js/app.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './vendor/pdfjs/pdf.mjs',
  './vendor/pdfjs/pdf.worker.mjs',
  './vendor/pdfjs/wasm/openjpeg.wasm',
  './vendor/pdfjs/wasm/jbig2.wasm',
  './vendor/pdfjs/wasm/qcms_bg.wasm',
  './vendor/pdfjs/wasm/quickjs-eval.wasm',
  './vendor/heic/heic2any.min.js',
  './vendor/tiff/pako.min.js',
  './vendor/tiff/UTIF.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  const scopedPath = new URL(self.registration.scope).pathname;
  const requestUrl = new URL(request.url);
  if (!requestUrl.pathname.startsWith(scopedPath)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match('./index.html')) || Response.error()));
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
