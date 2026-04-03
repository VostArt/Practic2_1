const CACHE_NAME = 'cyberpunk-pwa-v6';
const ASSETS = [
    'index.html',
    'style.css',
    'app.js',
    'manifest.json',
    'favicon.ico',
    'icons/icon-192.png',
    'icons/icon-512.png'
];

// Установка
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return Promise.allSettled(ASSETS.map(url => cache.add(url)));
        })
    );
    self.skipWaiting();
});

// Активация
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

// Перехват запросов (Исправленная версия)
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // ИСПРАВЛЕНИЕ: Игнорируем расширения Chrome и другие протоколы
    if (!url.protocol.startsWith('http')) return;

    if (url.pathname.startsWith('/content/')) {
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
    } else if (!url.pathname.startsWith('/socket.io/')) {
        e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
    }
});

// Push-уведомления
self.addEventListener('push', e => {
    const data = e.data.json();
    const options = { 
        body: data.body, 
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        data: { reminderId: data.reminderId }
    };
    if (data.reminderId) {
        options.actions = [{ action: 'snooze', title: '💤 Отложить (10 сек)' }];
    }
    e.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    if (e.action === 'snooze') {
        e.waitUntil(fetch(`https://localhost:3000/snooze?reminderId=${e.notification.data.reminderId}`, { method: 'POST' }));
    }
});