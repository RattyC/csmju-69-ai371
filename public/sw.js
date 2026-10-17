// Service worker: ใช้งานออฟไลน์ได้หลังเปิดเว็บครั้งแรก
// - หน้า HTML: network-first (ได้เวอร์ชันใหม่เสมอเมื่อออนไลน์) แล้ว fallback เป็น cache
// - ไฟล์ /_astro/* (มี hash ในชื่อ) และฟอนต์: cache-first
const CACHE = 'aiq-v2';
const PAGES = ['/', '/practice/', '/exam/', '/result/', '/review/', '/history/', '/ann/'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PAGES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(url.pathname, copy));
          return res;
        })
        .catch(async () => (await caches.match(url.pathname, { ignoreSearch: true })) || (await caches.match('/'))),
    );
    return;
  }

  if ((sameOrigin && url.pathname.startsWith('/_astro/')) || FONT_HOSTS.includes(url.hostname) || (sameOrigin && url.pathname.startsWith('/icons/'))) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok || res.type === 'opaque') {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
