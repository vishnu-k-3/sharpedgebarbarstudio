/* PWA service worker — NETWORK-FIRST so every visitor always gets
   the latest version (fixes "stale page on phone" issues), with
   offline fallback to cache. */
const CACHE = "sharpedge-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./about.html",
  "./admin.html",
  "./css/styles.css",
  "./js/config.js",
  "./js/icons.js",
  "./js/content.js",
  "./js/storage.js",
  "./js/app.js",
  "./js/about.js",
  "./js/admin.js",
  "./assets/logo.svg",
  "./manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: "reload" })))));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // fonts/videos/maps pass through

  // network first (forced revalidation — always the LATEST file),
  // cache fallback (offline support)
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
