// Khung màn hình: mỗi khối trong index.html ghi data-s="tên màn"; địa chỉ #tên chọn màn đang hiện (nút Back của điện thoại chạy được).
const TEN = { home: ['Sổ tay kỹ sư', 'Hôm nay'], bv: ['Bản vẽ', 'Tìm, xem, gửi, bản mới'], qr: ['Mã QR bản vẽ', 'Dán ở công trường'], viec: ['Việc', 'Việc và giấy tờ có hạn'], nk: ['Nhật ký', 'Ngày làm việc'], cc: ['Chấm công', 'Tổ đội theo tháng'], ps: ['Phát sinh', 'Yêu cầu miệng, chỉ đạo'], anh: ['Xếp ảnh', 'Ảnh hiện trường'], more: ['Thêm', 'Tất cả các mục'], tn: ['Tin nhắn Zalo', 'Soạn sẵn'], tt: ['Thông tin công trình', 'Liên hệ, họp chủ đầu tư'], vt: ['Vật tư', 'Nhập và lấy mẫu'], ntl: ['Lịch nghiệm thu', 'Sắp tới'], cai: ['Cài đặt', 'Giao diện'] };
const TAB = { home: 'home', bv: 'bv', qr: 'bv', viec: 'viec', nk: 'nk', anh: 'nk', cc: 'nk' }, DOI = { han: 'viec', ds: 'bv', loc: 'bv' }; // màn không ghi ở đây thuộc tab Thêm
function di() {
  let s = location.hash.slice(1); s = DOI[s] || s;
  if (!document.querySelector(`[data-s~="${s}"]`)) s = 'home';
  document.querySelectorAll('[data-s]').forEach(e => e.classList.toggle('an', !e.dataset.s.split(' ').includes(s)));
  let [ten, phu] = TEN[s] || ['Sổ tay kỹ sư', ''];
  if (s === 'home' && matchMedia('(min-width:900px)').matches) ten = 'Xin chào anh Phan 👋'; // ponytail: app một người dùng nên tên ghi cứng; nhiều người dùng thì lấy từ tài khoản Google // màn chưa ghi tên thì dùng tên chung, không làm hỏng các tab
  document.getElementById('tit').textContent = ten; document.getElementById('sub').textContent = s === 'home' ? new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }) : phu;
  const tab = TAB[s] || 'more';
  document.querySelectorAll('nav a').forEach(a => a.hash === '#' + tab ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  document.querySelectorAll('#side a').forEach(a => a.hash === '#' + (a.dataset.tab ? tab : s) ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  scrollTo(0, 0);
}
// Thanh bên (máy tính, rộng từ 900px): dựng từ chính các liên kết thanh dưới và lưới Thêm, không có danh sách riêng. Hẹp hơn 900px thì ẩn bằng CSS.
(() => {
  const side = document.getElementById('side'), chu = a => [...a.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()).textContent.trim();
  const them = (g, a, tab) => { const l = document.createElement('a'); l.href = a.hash; if (tab) l.dataset.tab = 1; l.append(a.querySelector('svg').cloneNode(true), chu(a)); g.append(l); return l; };
  side.innerHTML = '<div class="brand"><i>889</i><div><b>Sổ tay kỹ sư</b><small>Công trường</small></div></div>';
  const dau = document.createElement('div');
  document.querySelectorAll('nav a:not([href="#more"])').forEach(a => { const l = them(dau, a, 1); if (a.querySelector('.dot')) l.insertAdjacentHTML('beforeend', '<span class="dot" id="sdot"></span>'); });
  side.append(dau);
  document.querySelectorAll('#more h2').forEach(h2 => { const g = document.createElement('div'), t = document.createElement('h3'); t.textContent = h2.textContent; g.append(t); h2.nextElementSibling.querySelectorAll('a').forEach(a => them(g, a)); side.append(g); });
  const dx = Object.assign(document.createElement('button'), { textContent: 'Đăng xuất', className: 'sdx', onclick: () => document.getElementById('dx').click() }); side.append(dx);
  const v = document.getElementById('vdot'), cap = () => { document.getElementById('sdot').textContent = v.textContent; }; new MutationObserver(cap).observe(v, { childList: true, characterData: true, subtree: true }); cap();
})();
addEventListener('hashchange', di); di();
// giao diện: Sáng (mặc định) hoặc Tối, nhớ trên máy
const dat = k => { document.documentElement.dataset.skin = k; document.querySelector('meta[name=theme-color]').content = k === 'dark' ? '#10151f' : '#f4f6fa'; try { localStorage.setItem('skin', k); } catch {} document.querySelectorAll('button[data-skin]').forEach(b => b.setAttribute('aria-pressed', b.dataset.skin === k)); };
document.querySelectorAll('button[data-skin]').forEach(b => b.onclick = () => dat(b.dataset.skin));
dat(document.documentElement.dataset.skin);
