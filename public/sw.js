// Pulse.fit PWA Service Worker for Offline Resilience
const CACHE_NAME = "pulsefit-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/src/main.tsx",
  "/src/App.tsx",
  "/src/index.css"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching offline assets");
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn("[Service Worker] Pre-caching skipped some non-critical resources", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event with network-falling-back-to-cache and offline indicators
self.addEventListener("fetch", (event) => {
  const req = event.request;
  
  // Skip API requests and websocket routes
  if (req.url.includes("/api/") || req.url.includes("ws:") || req.url.includes("localhost:3000")) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Cache new successful requests on-the-fly
        if (res.status === 200 && req.method === "GET") {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });
        }
        return res;
      })
      .catch(() => {
        // Fall back to cache if user is offline or cellular connectivity fails
        return caches.match(req).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If HTML page and completely offline, return standard offline response
          if (req.headers.get("accept")?.includes("text/html")) {
            return caches.match("/");
          }
          return new Response("Network offline and asset not in cache", {
            status: 503,
            headers: { "Content-Type": "text/plain" }
          });
        });
      })
  );
});
