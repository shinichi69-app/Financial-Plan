const CACHE_NAME = 'expense-tracker-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './app.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/lucide@latest'
];

// ขั้นตอน Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ขั้นตอน Activate (ลบ Cache เก่าเมื่อมีการอัปเดตเวอร์ชัน)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ขั้นตอน Fetch ข้อมูล (Serve จาก Cache ก่อน หากไม่มีค่อยดึงจาก Network)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // ไม่ทำการ Cache คำร้องขอที่ไม่ใช่ GET หรือ Chrome Extensions
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' || event.request.method !== 'GET') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    }).catch(() => {
      // หากเกิดข้อผิดพลาดในการโหลดเครือข่าย ให้ใช้หน้า index.html
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
