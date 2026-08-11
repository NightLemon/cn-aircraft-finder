/* Service worker for cn-aircraft-finder.
 *
 * Strategy:
 *   - Precache the shell (HTML/CSS/JS + manifest) on install.
 *   - Network-first for the shell so deployed UI fixes reach existing users,
 *     with the precache as an offline fallback.
 *   - Stale-while-revalidate for data JSON: serve cached copy immediately, fetch
 *     the latest in the background. This makes repeat visits instant and works
 *     completely offline once you've loaded the site once.
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
