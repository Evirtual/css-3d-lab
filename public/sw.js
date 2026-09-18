// Service worker: makes the installed app open offline, without ever pinning visitors to an old
// version of the site.
//  - Pages (navigations): network first, so a deploy shows up immediately; the cached copy is only
//    used when the network fails.
//  - /assets/*: file names contain a content hash, so a cached file can never be stale: cache first.
//  - Everything else same-origin (icons, social images): stale-while-revalidate.
// Bump CACHE to drop everything cached so far.
const CACHE = 'c3d-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return; // analytics etc. go straight to the network

  const put = (response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  };

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(put)
        .catch(async () => (await caches.match(request)) ?? (await caches.match(new URL('./', self.registration.scope).href)) ?? Response.error()),
    );
    return;
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request).then(put)));
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      const fresh = fetch(request).then(put);
      return hit ?? fresh;
    }),
  );
});
