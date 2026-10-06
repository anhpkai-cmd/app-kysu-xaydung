// Khung màn hình: mỗi khối trong index.html ghi data-s="tên màn"; địa chỉ #tên chọn màn đang hiện (nút Back của điện thoại chạy được).
const TAB = { home: 'home', bv: 'bv', qr: 'bv', viec: 'viec', nk: 'nk', anh: 'nk' }, DOI = { han: 'viec', ds: 'bv', loc: 'bv' }; // màn không ghi ở đây thuộc tab Thêm
function di() {
  let s = location.hash.slice(1); s = DOI[s] || s;
  if (!document.querySelector(`[data-s~="${s}"]`)) s = 'home';
  document.querySelectorAll('[data-s]').forEach(e => e.classList.toggle('an', !e.dataset.s.split(' ').includes(s)));
  const tab = TAB[s] || 'more';
  document.querySelectorAll('nav a').forEach(a => a.hash === '#' + tab ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  scrollTo(0, 0);
}
addEventListener('hashchange', di); di();
// giao diện: Sáng (mặc định) hoặc Tối, nhớ trên máy
const dat = k => { document.documentElement.dataset.skin = k; try { localStorage.setItem('skin', k); } catch {} document.querySelectorAll('button[data-skin]').forEach(b => b.setAttribute('aria-pressed', b.dataset.skin === k)); };
document.querySelectorAll('button[data-skin]').forEach(b => b.onclick = () => dat(b.dataset.skin));
dat(document.documentElement.dataset.skin);
