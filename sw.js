// Cài app ra màn hình + nhận file từ nút Chia sẻ của điện thoại (Zalo, Zalo → Chia sẻ → Sổ tay KS). Dữ liệu Drive luôn lấy mới.
const V = 'v6', F = ['./', 'index.html', 'app.js', 'register.js', 'viec.js', 'nhatky.js', 'anh.js', 'vattu.js', 'vanban.js', 'hop.js', 'phatsinh.js', 'han.js', 'qr.js', 'tin.js', 'thoitiet.js', 'config.js', 'manifest.json', 'icon.svg']; // lần cài đầu; sau đó file nào tải được khi có sóng cũng tự được cất (dưới cùng)
addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(F)).then(() => skipWaiting())));
addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'chia-se').map(k => caches.delete(k)))).then(() => clients.claim()))); // xóa bộ nhớ bản cũ, giữ file Zalo đang chờ lưu
addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method === 'POST' && u.pathname.endsWith('/share')) // manifest.json: share_target
    return e.respondWith((async () => {
      const c = await caches.open('chia-se');
      for (const f of (await e.request.formData()).getAll('file'))
        await c.put('nhan/' + Date.now() + Math.random().toString(36).slice(2), new Response(f, { headers: { 'X-Ten': encodeURIComponent(f.name), 'Content-Type': f.type } }));
      return Response.redirect(registration.scope, 303);
    })());
  if (u.origin === location.origin && e.request.method === 'GET') e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(k => k.put(e.request, c)); } return r; }).catch(() => caches.match(e.request)));
});
