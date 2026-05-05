/**
 * Layover Legends Driver — Service Worker
 *
 * Caching strategies:
 *   Static assets (JS/CSS/fonts/icons)  → Cache-first, stale-while-revalidate
 *   /api/driver/today                   → Network-first, 4h cache fallback
 *   Tour detail pages (/driver/tour/*)  → Cache after first view (CacheFirst)
 *   POST mutations                      → Background Sync queue (IndexedDB)
 *
 * NEVER cached: /api/auth/*, /auth/*, anything with PII for other users
 */

const CACHE_STATIC  = "ll-driver-static-v1";
const CACHE_DYNAMIC = "ll-driver-dynamic-v1";
const CACHE_API     = "ll-driver-api-v1";
const SYNC_TAG      = "ll-driver-mutations";

const STATIC_PRECACHE = [
  "/driver/today",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install — precache static shell ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) =>
      cache.addAll(STATIC_PRECACHE).catch(() => {})
    ).then(() => self.skipWaiting())
  );
});

// ── Activate — purge old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const KEEP = [CACHE_STATIC, CACHE_DYNAMIC, CACHE_API];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch — routing logic ─────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept auth or non-GET for other paths
  if (url.pathname.startsWith("/api/auth") || url.pathname.startsWith("/auth")) return;
  if (event.request.method !== "GET") {
    // Non-GET: if it's a driver mutation, queue for Background Sync
    if (url.pathname.startsWith("/api/driver/") || url.pathname.startsWith("/driver/")) {
      event.respondWith(
        fetch(event.request.clone()).catch(() => {
          return queueMutation(event.request.clone()).then(() =>
            new Response(JSON.stringify({ queued: true }), {
              status: 202,
              headers: { "Content-Type": "application/json" },
            })
          );
        })
      );
    }
    return;
  }

  // /api/driver/today — network-first, 4h fallback
  if (url.pathname === "/api/driver/today") {
    event.respondWith(networkFirstWithFallback(event.request, CACHE_API, 4 * 60 * 60 * 1000));
    return;
  }

  // Driver tour detail pages — cache after first view
  if (url.pathname.startsWith("/driver/tour/") || url.pathname.startsWith("/driver/preflight/")) {
    event.respondWith(cacheFirstWithNetwork(event.request, CACHE_DYNAMIC));
    return;
  }

  // Driver app shell pages — stale-while-revalidate
  if (url.pathname.startsWith("/driver/")) {
    event.respondWith(staleWhileRevalidate(event.request, CACHE_STATIC));
    return;
  }

  // Static assets — cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(js|css|woff2?|png|svg|ico)$/)
  ) {
    event.respondWith(cacheFirstWithNetwork(event.request, CACHE_STATIC));
    return;
  }
});

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushMutationQueue());
  }
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = { title: "Layover Legends", body: "You have a new notification", url: "/driver/today", icon: "/icons/icon-192.png" };
  try { payload = { ...payload, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:    payload.body,
      icon:    payload.icon,
      badge:   "/icons/icon-192.png",
      data:    { url: payload.url },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/driver/today";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes("/driver"));
      if (existing) { existing.focus(); existing.navigate(url); }
      else self.clients.openWindow(url);
    })
  );
});

// ── Helper strategies ─────────────────────────────────────────────────────────
async function networkFirstWithFallback(req, cacheName, maxAgeMs) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) {
      const clone = res.clone();
      // Store with timestamp header
      const headers = new Headers(clone.headers);
      headers.set("x-sw-cached-at", Date.now().toString());
      const stored = new Response(await clone.blob(), { status: clone.status, headers });
      cache.put(req, stored);
    }
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) {
      const cachedAt = parseInt(cached.headers.get("x-sw-cached-at") ?? "0", 10);
      if (Date.now() - cachedAt < maxAgeMs) return cached;
    }
    return new Response(JSON.stringify({ offline: true, error: "Network unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json", "x-sw-offline": "1" },
    });
  }
}

async function cacheFirstWithNetwork(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) (await caches.open(cacheName)).put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  return cached ?? fetchPromise;
}

// ── Mutation queue (IndexedDB) ────────────────────────────────────────────────
const DB_NAME    = "ll-driver-queue";
const STORE_NAME = "mutations";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME, { autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function queueMutation(req) {
  const body = await req.text();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.add({ url: req.url, method: req.method, body, headers: [...req.headers.entries()] });
    tx.oncomplete = () => {
      // Register background sync
      self.registration.sync?.register(SYNC_TAG).catch(() => {});
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function flushMutationQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getAll = store.getAll();
    const getAllKeys = store.getAllKeys();

    Promise.all([
      new Promise((r) => { getAll.onsuccess = () => r(getAll.result); }),
      new Promise((r) => { getAllKeys.onsuccess = () => r(getAllKeys.result); }),
    ]).then(([items, keys]) => {
      return Promise.all(
        items.map(async (item, i) => {
          try {
            const headers = new Headers(item.headers);
            await fetch(item.url, { method: item.method, headers, body: item.body });
            // Delete from queue on success
            const delTx = db.transaction(STORE_NAME, "readwrite");
            delTx.objectStore(STORE_NAME).delete(keys[i]);
          } catch {
            // Leave in queue — will retry on next sync
          }
        })
      );
    }).then(resolve).catch(reject);
  });
}
