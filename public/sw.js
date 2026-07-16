// Service worker mínimo para los avisos push del área de cliente (llamadas
// reprogramadas, hechas o canceladas). No cachea nada ni intercepta
// peticiones: su único trabajo es mostrar la notificación que llega del
// servidor y abrir el área de cliente al pulsarla.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch { payload = { title: "Asegurados Ventajon", body: event.data.text() }; }
  const title = payload.title || "Asegurados Ventajon";
  const options = {
    body: payload.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: payload.url || "/area-cliente" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/area-cliente";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
