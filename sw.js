/* yaya: התראות כשהאפליקציה סגורה, ופתיחה גם בלי אינטרנט (r5_offline).
   קבצי האפליקציה: קודם מהרשת, כדי שעדכונים יגיעו מיד. רק אם אין רשת (או שהיא איטית מאוד) נפתח העותק השמור.
   ספריות חיצוניות עם מספר גרסה (Firebase, גופנים) נשמרות ונטענות מהטלפון. */
const CACHE = 'yaya-v1';
const SHELL = ['./', 'index.html', 'tm.js?v=1', 'manifest.webmanifest', 'icon-180.png'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))));
});
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

const LIBS = /^https:\/\/(www\.gstatic\.com\/firebasejs\/|fonts\.googleapis\.com\/|fonts\.gstatic\.com\/)/;
async function netFirst(req) {
  const c = await caches.open(CACHE);
  const net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; });
  net.catch(() => {});
  const slow = new Promise(res => setTimeout(res, 4000));
  try {
    const r = await Promise.race([net, slow.then(() => null)]);
    if (r) return r;
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' });
    return hit || await net;
  } catch (err) {
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' }) || (req.mode === 'navigate' && await c.match('index.html'));
    if (hit) return hit;
    throw err;
  }
}
async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
  return r;
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    if (/\/push\/|\/dev\//.test(u.pathname)) return;
    e.respondWith(netFirst(req));
  } else if (LIBS.test(req.url)) e.respondWith(cacheFirst(req));
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'yaya', {
    body: d.body || '',
    icon: 'icon-180.png',
    badge: 'icon-180.png',
    tag: d.tag || undefined,
    lang: 'he',
    dir: 'rtl',
    requireInteraction: true,
    data: { tab: d.tab || 'jobs' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const tab = (e.notification.data && e.notification.data.tab) || 'jobs';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      try { c.postMessage({ yayaTab: tab }); await c.focus(); return; } catch (err) {}
    }
    await self.clients.openWindow('./?tab=' + encodeURIComponent(tab));
  })());
});
