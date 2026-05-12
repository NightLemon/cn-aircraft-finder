/* Service worker for cn-aircraft-finder.
 *
 * Strategy:
 *   - Precache the shell (HTML/CSS/JS + manifest) on install.
 *   - Stale-while-revalidate for data JSON: serve cached copy immediately, fetch
 *     the latest in the background. This makes repeat visits instant and works
 *     completely offline once you've loaded the site once.
 *   - Network-only for the Planespotters photo API (no point caching, and we
 *     don't want their TOS surprises).
 *
 * Bump SHELL_VERSION to force a refresh of cached assets.
 */

const SHELL_VERSION = 'shell-v4';
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

  // Same-origin data JSON → stale-while-revalidate.
  if (url.origin === location.origin && url.pathname.includes('/data/')) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const fetched = fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetched;
        })
      )
    );
    return;
  }

  // Same-origin shell → cache-first.
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(SHELL_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }))
    );
  }
});
