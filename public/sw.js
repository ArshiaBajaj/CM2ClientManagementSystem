// Coach Me 2 service worker: shows notifications (which also appear on a paired Apple Watch)
// and opens the right page when one is tapped.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "Coach Me 2", body: "You have an update.", url: "/workspace" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // Keep the defaults.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/workspace", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const win of windows) {
        if (win.url === url && "focus" in win) return win.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
