// 任务助手 - Service Worker
// 提供离线缓存和通知支持

const CACHE_NAME = 'renwu-zhushou-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 安装：缓存核心文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {
        // 部分文件可能不存在，不阻塞安装
      });
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：优先使用缓存
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    }).catch(() => {
      // 离线时返回缓存，缓存也没有就报错
      return caches.match('./index.html');
    })
  );
});

// 通知点击：打开应用
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});

// 定时同步（如果浏览器支持）
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'nightly-review') {
    event.waitUntil(triggerReviewNotification());
  }
});

async function triggerReviewNotification() {
  const allClients = await clients.matchAll({ type: 'window' });
  if (allClients.length === 0) {
    // 应用未打开，发送通知
    self.registration.showNotification('📋 复盘提醒', {
      body: '该进行任务复盘了，回顾一下进展吧！',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'nightly-review',
      requireInteraction: true
    });
  } else {
    // 应用已打开，发送消息给页面
    allClients.forEach((client) => {
      client.postMessage({ type: 'REVIEW_REMINDER' });
    });
  }
}
