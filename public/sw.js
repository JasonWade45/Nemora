// Service worker for push notifications
self.addEventListener("push", function (event) {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || "Nemora", {
    body: data.body || "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    data: data.url || "/rep",
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data || "/rep";
  event.waitUntil(clients.openWindow(url));
});
