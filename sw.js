// Chỉ để app cài được lên màn hình; dữ liệu luôn lấy mới từ Drive.
const V = 'v1', F = ['./', 'index.html', 'app.js', 'register.js', 'config.js', 'icon.svg'];
addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(F))));
addEventListener('fetch', e => { if (e.request.url.startsWith(location.origin)) e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); });
