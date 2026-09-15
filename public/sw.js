/**
 * Service Worker for PharmaTrack - Offline Support
 * Caches static assets and API responses for offline use
 */

const CACHE_NAME = 'pharmatrack-v1';
const STATIC_CACHE = 'pharmatrack-static-v1';
const DYNAMIC_CACHE = 'pharmatrack-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/rep',
  '/rep/nearby',
  '/rep/my-doctors',
  '/rep/schedule',
  '/rep/follow-ups',
  '/rep/visits/start',
  '/rep/orders',
  '/rep/chat',
  '/rep/profile',
  '/login',
  '/demo',
  '/manifest.json',
];

// API routes to cache for offline access
const API_CACHE_PATTERNS = [
  /\/api\/doctors/,
  /\/api\/my-doctors/,
  /\/api\/products/,
  /\/api\/visits/,
  /\/api\/follow-ups/,
  /\/api\/orders/,
  /\/api\/stats/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests - network first, then cache
async function handleApiRequest(request: Request): Promise<Response> {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful GET responses for offline use
    if (networkResponse.ok && shouldCacheApi(request.url)) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for API
    return new Response(
      JSON.stringify({ error: 'Offline', cached: false }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handle navigation requests - cache first for app shell
async function handleNavigationRequest(request: Request): Promise<Response> {
  const cache = await caches.open(STATIC_CACHE);

  try {
    // Try network first for fresh content
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback to index.html for SPA routing
    const indexResponse = await cache.match('/');
    if (indexResponse) {
      return indexResponse;
    }

    return new Response('Offline', { status: 503 });
  }
}

// Handle static assets - cache first
async function handleStaticRequest(request: Request): Promise<Response> {
  const cache = await caches.open(STATIC_CACHE);

  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse);
      }
    }).catch(() => {});

    return cachedResponse;
  }

  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Check if API response should be cached
function shouldCacheApi(url: string): boolean {
  return API_CACHE_PATTERNS.some((pattern) => pattern.test(url));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData(): Promise<void> {
  // This would be implemented to sync IndexedDB data when online
  // The actual sync logic is in the client-side offline-storage.ts
  console.log('Background sync triggered');
}

// Push notifications (if needed)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options: NotificationOptions = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: data.data,
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action) {
    // Handle action buttons
    clients.openWindow(event.action);
  } else {
    // Default click - open app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow('/');
      })
    );
  }
});