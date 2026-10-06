// Tin nhắn Zalo soạn sẵn: thông tin tự điền từ app (công trình, ngày, thời tiết, việc ngày mai, liên hệ), bấm Chép rồi dán vào Zalo. Không cần bot Zalo.
export const dmy = iso => iso.split('-').reverse().join('/');
// Liên hệ trong THONGTIN: dòng [Nhóm, Tên, Chi tiết (vai trò), Điện thoại]; tìm theo vai trò. Không có thì undefined (tin vẫn soạn được, chỗ đó ghi chung).
export const lienHe = (tt, re) => tt.find(r => r[0] === 'Liên hệ' && re.test(r[2] ?? '') && r[1]);
const CDT = /chủ đầu tư|cđt/i, TVGS = /giám sát|tvgs/i;
const nhan = (r, chung) => r ? r[1] : chung;

// Mỗi mẫu: truong = [mã, nhãn, mặc định (hàm của ngữ cảnh) hoặc danh sách chọn], nguoi = vai trò người nhận (để mở Zalo), dung = soạn tin.
export const MAU = [
  { id: 'doi', ten: 'Báo tổ đội lịch ngày mai', truong: [['gio', 'Giờ tập trung', () => '06:30'], ['ghi', 'Dặn thêm (nếu có)', () => '']],
    dung: (v, c) => `Chào anh em, ngày mai ${c.mai} công trình ${c.tenCT} làm:\n${c.viecMai.length ? c.viecMai.map(t => '- ' + t).join('\n') : '- (chưa ghi việc nào trong app, anh sửa lại)'}\n${c.thoiTiet.mai ? `Dự báo thời tiết: ${c.thoiTiet.mai}.\n` : ''}Tập trung lúc ${v.gio}.${v.ghi ? '\n' + v.ghi : ''}` },
  { id: 'mua', ten: 'Báo chủ đầu tư dừng thi công do mưa', nguoi: CDT, truong: [['buoi', 'Dừng', ['cả ngày', 'buổi sáng', 'buổi chiều']]],
    dung: (v, c) => `Kính gửi ${nhan(c.nguoi, 'chủ đầu tư')}, hôm nay ${c.hom} công trình ${c.tenCT} phải dừng thi công ${v.buoi} do mưa${c.thoiTiet.hom ? ` (${c.thoiTiet.hom})` : ''}. Nhà thầu sẽ thi công lại khi đủ điều kiện và báo anh/chị. Trân trọng.` },
  { id: 'nt', ten: 'Mời nghiệm thu', nguoi: TVGS, truong: [['nd', 'Nội dung nghiệm thu', () => ''], ['vt', 'Vị trí', () => ''], ['ngay', 'Ngày', c => c.mai], ['gio', 'Giờ', () => '08:00'], ['hs', 'Hồ sơ kèm theo', () => 'biên bản nghiệm thu, kết quả thí nghiệm, ảnh thi công']],
    dung: (v, c) => `Kính gửi ${nhan(c.nguoi, 'tư vấn giám sát')}, nhà thầu xin mời nghiệm thu ${v.nd || '(nội dung)'} tại ${v.vt || '(vị trí)'} công trình ${c.tenCT}, lúc ${v.gio} ngày ${v.ngay}. Hồ sơ kèm theo: ${v.hs}. Trân trọng.` },
  { id: 'ncc', ten: 'Nhắc nhà cung cấp giao hàng', truong: [['ten', 'Gọi là (anh/chị ...)', () => ''], ['vt', 'Vật tư', () => ''], ['kl', 'Khối lượng', () => ''], ['ngay', 'Ngày giao', c => c.mai], ['gio', 'Giờ', () => '07:00'], ['dd', 'Giao tại', c => c.tenCT]],
    dung: (v, c) => `Chào ${v.ten || 'anh/chị'}, công trình ${c.tenCT} cần ${v.vt || '(vật tư)'} ${v.kl} giao ngày ${v.ngay} lúc ${v.gio} tại ${v.dd}. Anh/chị xác nhận giúp em. Cảm ơn.`.replace(/ {2,}/g, ' ') },
];

// c: ngữ cảnh lấy từ app { tenCT, hom, mai, viecMai[], thoiTiet: {hom, mai}, tt (dòng THONGTIN) }
export const canhNguoi = (c, mau) => ({ ...c, nguoi: mau.nguoi && lienHe(c.tt, mau.nguoi) });
export const macDinh = (mau, c) => Object.fromEntries(mau.truong.map(([k, , d]) => [k, Array.isArray(d) ? d[0] : d(c)]));
export const soan = (mau, v, c) => mau.dung(v, canhNguoi(c, mau));
export const zaloSo = r => { const s = (r?.[3] ?? '').replace(/[^\d+]/g, ''); return s ? 'https://zalo.me/' + s.replace(/^\+/, '').replace(/^0/, '84') : null; }; // dòng liên hệ -> link Zalo, không có số thì null
export const zalo = (mau, c) => { const r = mau.nguoi && lienHe(c.tt, mau.nguoi), href = zaloSo(r); return href ? { ten: r[1], href } : null; };

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('tin.js')) { // chạy: node tin.js
  const a = await import('node:assert/strict');
  const tt = [['Liên hệ', 'Anh Hùng', 'Giám sát, Cty ABC', '0912 345 678'], ['Liên hệ', 'Chị Lan', 'Chủ đầu tư', ''], ['Thông tin', 'Địa chỉ', 'Chợ', '']];
  const c = { tenCT: 'Chợ Hiếu Lễ', hom: '06/10/2026', mai: '07/10/2026', viecMai: ['Đổ bê tông bệ A'], thoiTiet: { hom: 'Mưa to, 31°C', mai: 'Nắng, 36°C' }, tt };
  const m = id => MAU.find(x => x.id === id);
  a.equal(soan(m('doi'), macDinh(m('doi'), c), c), 'Chào anh em, ngày mai 07/10/2026 công trình Chợ Hiếu Lễ làm:\n- Đổ bê tông bệ A\nDự báo thời tiết: Nắng, 36°C.\nTập trung lúc 06:30.');
  a.ok(soan(m('mua'), macDinh(m('mua'), c), c).startsWith('Kính gửi Chị Lan, hôm nay 06/10/2026 công trình Chợ Hiếu Lễ phải dừng thi công cả ngày do mưa (Mưa to, 31°C).'));
  a.ok(soan(m('nt'), { ...macDinh(m('nt'), c), nd: 'cốt thép móng M1' }, c).startsWith('Kính gửi Anh Hùng, nhà thầu xin mời nghiệm thu cốt thép móng M1 tại (vị trí)'));
  a.deepEqual(zalo(m('nt'), c), { ten: 'Anh Hùng', href: 'https://zalo.me/84912345678' }); a.equal(zalo(m('mua'), c), null); a.equal(zalo(m('doi'), c), null);
  const c0 = { ...c, tt: [], viecMai: [], thoiTiet: {} }; a.ok(soan(m('doi'), macDinh(m('doi'), c0), c0).includes('chưa ghi việc nào')); a.ok(soan(m('mua'), macDinh(m('mua'), c0), c0).startsWith('Kính gửi chủ đầu tư,'));
  a.ok(!soan(m('ncc'), macDinh(m('ncc'), c0), c0).includes('  '));
  console.log('ok');
}
