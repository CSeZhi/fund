self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// 拦截 Tesseract/tessdata 请求，优先从 OCR 缓存包返回
self.addEventListener('fetch', e => {
  const u = e.request.url;
  if (
    u.includes('tesseract') ||
    u.includes('tessdata') ||
    u.includes('naptha') ||
    u.includes('traineddata')
  ) {
    e.respondWith(
      caches.open('ocr-pack-v1').then(cache =>
        cache.match(e.request).then(r => r || fetch(e.request))
      )
    );
  }
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SHOW_NOTIFICATION') {
    e.waitUntil(self.registration.showNotification(e.data.title, {
      body: e.data.body,
      tag: e.data.tag || 'fund-alert',
      icon: './icon-192.png',
      badge: './icon-192.png',
      renotify: true,
      vibrate: [200, 100, 200]
    }));
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    if (list.length) return list[0].focus();
    return clients.openWindow('./');
  }));
});
