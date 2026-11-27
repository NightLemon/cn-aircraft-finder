/* Service worker for cn-aircraft-finder.
 *
 * Strategy:
 *   - Precache the shell (HTML/CSS/JS + manifest) on install.
 *   - Network-first for the shell so deployed UI fixes reach existing users,
 *     with the precache as an offline fallback.
 *   - Network-first for the small data manifest. The manifest points at a
 *     versioned set of data files, cached for repeat visits and offline use.
 *   - Network-only for the Planespotters photo API (no point caching, and we
 *     don't want their TOS surprises).
 *
 * Bump SHELL_VERSION when the shell cache structure changes.
 */

const SHELL_VERSION = 'shell-v5';
const DATA_CACHE   = 'data-v1';
const SHELL = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL_VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== SHELL_VERSION && k !== DATA_CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Photo API — never cache.
  if (url.hostname.endsWith('planespotters.net')) return;

  if (url.origin === location.origin && url.pathname.endsWith('/data/meta.json')) {
    event.respondWith(caches.open(DATA_CACHE).then(async (cache) => {
      try {
        const response = await fetch(req);
        if (response.ok) {
          await cache.put(req, response.clone());
          return response;
        }
        return (await cache.match(req)) || response;
      } catch (error) {
        const cached = await cache.match(req);
        if (cached) return cached;
        throw error;
      }
    }));
    return;
  }

  // Each dataset request carries the content version from the manifest.
  if (url.origin === location.origin && url.pathname.includes('/data/')) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) =>
        cache.match(req).then((cached) =>
          cached || fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
        )
      )
    );
    return;
  }

  // Same-origin shell → network-first with an offline fallback.
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(SHELL_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
