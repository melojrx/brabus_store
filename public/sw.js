const CACHE_NAME = "brabus-store-pwa-g10"
const OFFLINE_URL = "/offline.html"
const STATIC_ASSETS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/brand/icons/brabus-g10-16.png",
  "/brand/icons/brabus-g10-32.png",
  "/brand/icons/brabus-g10-180.png",
  "/brand/icons/brabus-g10-192.png",
  "/brand/icons/brabus-g10-512.png",
  "/brand/icons/brabus-g10-maskable-512.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith("brabus-store-pwa-") && key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return
  }

  const requestUrl = new URL(event.request.url)

  if (requestUrl.origin !== self.location.origin) {
    return
  }

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  const isStaticAsset =
    requestUrl.pathname === "/manifest.webmanifest" ||
    requestUrl.pathname.endsWith(".png") ||
    requestUrl.pathname.endsWith(".jpg") ||
    requestUrl.pathname.endsWith(".jpeg") ||
    requestUrl.pathname.endsWith(".svg") ||
    requestUrl.pathname.endsWith(".webp")

  if (!isStaticAsset) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse
        }

        const responseClone = networkResponse.clone()
        void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
        return networkResponse
      })
    })
  )
})
