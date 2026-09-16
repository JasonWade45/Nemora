self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.registration.unregister();
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => {
        try { client.navigate(client.url); } catch (e) {}
      });
    })()
  );
});

self.addEventListener("fetch", () => {
  // Pass through — no interception
});