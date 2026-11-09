// Кэш оболочки приложения, чтобы оно открывалось с главного экрана мгновенно.
// Запросы к ntfy.sh не кэшируются: состояние и события всегда живые.
const CACHE = 'esp-alarma-v9';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  // сначала сеть (свежая версия), без сети — из кэша
  e.respondWith(fetch(e.request)
    .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request)));
});

// Push от сигнализации: {"body": "...", "p": "urgent|high|default", "t": unix}
self.addEventListener('push', e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch { m = { body: e.data ? e.data.text() : '' }; }
  const urgent = m.p === 'urgent', high = m.p === 'high';
  const title = urgent ? '🚨 ТРЕВОГА — мастерская' : high ? '⚠️ Охрана мастерской' : 'Охрана мастерской';
  e.waitUntil(self.registration.showNotification(title, {
    body: m.body || 'Событие сигнализации',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: urgent ? 'alarm' : 'ev-' + (m.t || Date.now()),
    renotify: urgent,
    requireInteraction: urgent,                  // тревога висит, пока её не смахнут
    vibrate: urgent ? [400, 200, 400, 200, 800] : [150],
    timestamp: m.t ? m.t * 1000 : Date.now(),
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list =>
    list.length ? list[0].focus() : self.clients.openWindow('./')));
});
