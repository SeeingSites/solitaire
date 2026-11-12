// Offline support. On install, caches the page and every same-origin file it
// references (plus EXTRA), so the app works with no connection after one visit.
// Pages are fetched network-first (you always get the latest deploy when
// online); content-hashed build assets are served cache-first.
const CACHE = "solitaire-v1";
const EXTRA = ["/favicon.svg", "/apple-touch-icon.png", "/icon-192.png", "/icon-512.png", "/manifest.json"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];
// Match regardless of Vary: module scripts send an Origin header that the
// precached copies were stored without.
const MATCH = { ignoreVary: true };

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const res = await fetch("/", { cache: "no-cache" });
      const html = await res.clone().text();
      await cache.put("/", res);
      const referenced = [...html.matchAll(/(?:src|href)="(\/[^"#?]*)"/g)].map((m) => m[1]);
      const urls = [...new Set([...referenced, ...EXTRA])].filter(
        (u) => u !== "/" && !u.startsWith("/_vercel/")
      );
      // Best effort: one missing file shouldn't block offline support.
      await Promise.all(urls.map((u) => cache.add(u).catch(() => {})));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })()
  );
});

async function networkFirst(request, cacheKey = request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) await cache.put(cacheKey, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(cacheKey, MATCH);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, MATCH);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok || res.type === "opaque") await cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.origin !== self.location.origin || url.pathname.startsWith("/_vercel/")) return;

  if (request.mode === "navigate") {
    // Pages are cached under their own URL; offline, an uncached page falls
    // back to the cached app shell.
    event.respondWith(
      networkFirst(request).catch(async () => (await caches.match("/", MATCH)) || Response.error())
    );
  } else if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});
