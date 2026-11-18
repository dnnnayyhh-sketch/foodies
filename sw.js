let activeTimerId = null;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('./');
    })
  );
});

self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || !msg.type) return;

  if (msg.type === 'STOP_ORDER_TIMER') {
    if (activeTimerId) {
      clearInterval(activeTimerId);
      activeTimerId = null;
    }
    self.registration.getNotifications({ tag: 'foodies-live-order' }).then((list) => {
      list.forEach((n) => n.close());
    });
    return;
  }

  if (msg.type === 'START_ORDER_TIMER') {
    if (activeTimerId) {
      clearInterval(activeTimerId);
      activeTimerId = null;
    }

    const { orderNum, endTime, readyClockStr } = msg.payload;

    const countdownPromise = new Promise((resolve) => {
      const tick = async () => {
        const diff = endTime - Date.now();

        if (diff <= 0) {
          clearInterval(activeTimerId);
          activeTimerId = null;

          const oldNotifs = await self.registration.getNotifications({ tag: 'foodies-live-order' });
          oldNotifs.forEach((n) => n.close());

          await self.registration.showNotification(`✅ طلبك رقم #${orderNum} جاهز الآن!`, {
            body: `مطعم foodies.a: وجبتك جاهزة الآن، نتمنى لك وجبة شهية!`,
            icon: 'https://i.postimg.cc/dthHNrBG/IMG-20261107-WA0006.jpg',
            badge: 'https://i.postimg.cc/dthHNrBG/IMG-20261107-WA0006.jpg',
            tag: 'foodies-order-done',
            renotify: true,
            requireInteraction: true,
            silent: false,
            vibrate: [800, 250, 800, 250, 800, 250, 800, 250, 1000]
          });

          resolve();
          return;
        }

        const totalSec = Math.ceil(diff / 1000);
        const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const secs = String(totalSec % 60).padStart(2, '0');

        await self.registration.showNotification(`⏱ المتبقي ${mins}:${secs} | طلب #${orderNum}`, {
          body: `طلبك قيد التحضير في foodies.a • يجهز الساعة ${readyClockStr}`,
          icon: 'https://i.postimg.cc/dthHNrBG/IMG-20261107-WA0006.jpg',
          badge: 'https://i.postimg.cc/dthHNrBG/IMG-20261107-WA0006.jpg',
          tag: 'foodies-live-order',
          renotify: false,
          ongoing: true,
          silent: true
        });
      };

      tick();
      activeTimerId = setInterval(tick, 1000);
    });

    event.waitUntil(countdownPromise);
  }
});
        
