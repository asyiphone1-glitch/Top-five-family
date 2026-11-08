/* yaya: קבלת התראות כשהאפליקציה סגורה או ברקע. אין כאן שמירת קבצים, כדי שעדכונים יגיעו מיד */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

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
