// Cài app ra màn hình + nhận file từ nút Chia sẻ của điện thoại (Zalo, Zalo → Chia sẻ → Sổ tay KS). Dữ liệu Drive luôn lấy mới.
const V = 'v3', F = ['./', 'index.html', 'app.js', 'register.js', 'viec.js', 'nhatky.js', 'anh.js', 'config.js', 'icon.svg']; // thêm file .js mới thì thêm vào đây, không thì mất sóng app trắng trang
addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(F)).then(() => skipWaiting())));
addEventListener('activate', e => e.waitUntil(clients.claim()));
addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method === 'POST' && u.pathname.endsWith('/share')) // manifest.json: share_target
    return e.respondWith((async () => {
      const c = await caches.open('chia-se');
      for (const f of (await e.request.formData()).getAll('file'))
        await c.put('nhan/' + Date.now() + Math.random().toString(36).slice(2), new Response(f, { headers: { 'X-Ten': encodeURIComponent(f.name), 'Content-Type': f.type } }));
      return Response.redirect(registration.scope, 303);
    })());
  if (u.origin === location.origin) e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
