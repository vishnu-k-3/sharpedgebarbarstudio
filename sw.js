/* Basic offline cache so the app works like an installed app (PWA step). */
const CACHE = "sharpedge-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./css/styles.css",
  "./js/config.js",
  "./js/icons.js",
  "./js/storage.js",
  "./js/app.js",
  "./js/admin.js",
  "./assets/logo.svg",
  "./manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" })))));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (!e.request.url.startsWith(self.location.origin)) return; // skip fonts/videos/maps
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
    )
  );
});
