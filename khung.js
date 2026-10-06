// Khung màn hình: mỗi khối trong index.html ghi data-s="tên màn"; địa chỉ #tên chọn màn đang hiện (nút Back của điện thoại chạy được).
const TEN = { home: ['Sổ tay kỹ sư', 'Hôm nay'], bv: ['Bản vẽ', 'Tìm, xem, gửi, bản mới'], qr: ['Mã QR bản vẽ', 'Dán ở công trường'], viec: ['Việc', 'Việc và giấy tờ có hạn'], nk: ['Nhật ký', 'Ngày làm việc'], cc: ['Chấm công', 'Tổ đội theo tháng'], ps: ['Phát sinh', 'Yêu cầu miệng, chỉ đạo'], anh: ['Xếp ảnh', 'Ảnh hiện trường'], more: ['Thêm', 'Tất cả các mục'], tn: ['Tin nhắn Zalo', 'Soạn sẵn'], tt: ['Thông tin công trình', 'Liên hệ, họp chủ đầu tư'], vt: ['Vật tư', 'Nhập và lấy mẫu'], ntl: ['Lịch nghiệm thu', 'Sắp tới'], cai: ['Cài đặt', 'Giao diện'] };
const TAB = { home: 'home', bv: 'bv', qr: 'bv', viec: 'viec', nk: 'nk', anh: 'nk', cc: 'nk' }, DOI = { han: 'viec', ds: 'bv', loc: 'bv' }; // màn không ghi ở đây thuộc tab Thêm
function di() {
  let s = location.hash.slice(1); s = DOI[s] || s;
  if (!document.querySelector(`[data-s~="${s}"]`)) s = 'home';
  document.querySelectorAll('[data-s]').forEach(e => e.classList.toggle('an', !e.dataset.s.split(' ').includes(s)));
  document.getElementById('tit').textContent = TEN[s][0]; document.getElementById('sub').textContent = TEN[s][1];
  const tab = TAB[s] || 'more';
  document.querySelectorAll('nav a').forEach(a => a.hash === '#' + tab ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  scrollTo(0, 0);
}
addEventListener('hashchange', di); di();
// giao diện: Sáng (mặc định) hoặc Tối, nhớ trên máy
const dat = k => { document.documentElement.dataset.skin = k; document.querySelector('meta[name=theme-color]').content = k === 'dark' ? '#10151f' : '#f4f6fa'; try { localStorage.setItem('skin', k); } catch {} document.querySelectorAll('button[data-skin]').forEach(b => b.setAttribute('aria-pressed', b.dataset.skin === k)); };
document.querySelectorAll('button[data-skin]').forEach(b => b.onclick = () => dat(b.dataset.skin));
dat(document.documentElement.dataset.skin);
