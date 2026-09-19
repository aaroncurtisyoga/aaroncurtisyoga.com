// Bump this whenever an unhashed asset under /icons/, /assets/ or a bare
// .png/.ico path changes. Those are cached first-hit and served from cache
// forever at a stable URL, so a returning visitor keeps the old file until
// the name changes and the activate handler drops the previous cache.
// v2: "AC" app icons and favicon recolored from royal blue to moss.
const CACHE_NAME = "acy-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, API routes, auth, and webhooks
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/sign-") ||
    url.pathname.includes("clerk")
  ) {
    return;
  }

  // Cache static assets (images, fonts, icons)
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            // Only store a real, same-origin success. Caching a 404 or a
            // truncated edge response would pin it at that URL until the
            // CACHE_NAME changes.
            if (
              response.ok &&
              response.status === 200 &&
              response.type === "basic"
            ) {
              const clone = response.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, clone))
                .catch(() => {});
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Network-first for everything else (pages)
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
