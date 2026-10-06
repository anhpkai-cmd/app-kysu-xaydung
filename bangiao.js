// Sổ bàn giao khi vắng mặt: một trang cho người thay (việc dở, nghiệm thu hẹn, vật tư cần chú ý, số cần gọi). Chỉ gom số liệu app đã có. Chạy: node bangiao.js
import { chia, nhan } from './viec.js';

const muc = (tieu, ds) => `${tieu}\n` + (ds.length ? ds.map(x => '- ' + x).join('\n') : '- Không có');
const dmy = s => s.split('-').reverse().join('/');

// d: ten, hom (yyyy-mm-dd), den (yyyy-mm-dd hoặc ''), viec, lich (nghiệm thu hẹn {ten, kt, n} hoặc null nếu chưa đọc được), vt ({cam, can} hoặc null), lien (các dòng Liên hệ [tên, chi tiết, điện thoại])
export function banGiao(d) {
  const nhom = chia(d.viec, d.hom, 365), dang = [...nhom.quaHan, ...nhom.sapDen, ...nhom.sau].map(t => `${t.ten} (${nhan(t.n)})`), khong = nhom.khongHan.map(t => `${t.ten} (chưa có hạn)`);
  const nt = d.lich ? d.lich.map(x => `${x.ten} (kết thúc ${dmy(x.kt)}, ${nhan(x.n)})`) : ['Chưa đọc được nhật ký, kiểm tra trực tiếp.'];
  const vt = d.vt ? [...(d.vt.cam ? [`${d.vt.cam} lô vật tư KHÔNG ĐẠT, cấm dùng`] : []), ...(d.vt.can ? [`${d.vt.can} lô chưa xong thủ tục (duyệt, CO/CQ, lấy mẫu): xem mục Vật tư`] : [])] : ['Chưa đọc được vật tư, kiểm tra trực tiếp.'];
  const goi = d.lien.filter(r => r[0] === 'Liên hệ' && r[3]).map(r => `${r[1]}${r[2] ? ' (' + r[2] + ')' : ''}: ${r[3]}`);
  return [`BÀN GIAO CÔNG VIỆC · ${d.ten} · ${dmy(d.hom)}${d.den ? ' đến ' + dmy(d.den) : ''}`,
    muc('1. Việc đang dở (quá hạn lên đầu)', [...dang, ...khong]), muc('2. Nghiệm thu đã hẹn, sắp đến', nt), muc('3. Vật tư cần chú ý', vt), muc('4. Số điện thoại cần gọi', goi)].join('\n\n');
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('bangiao.js')) {
  const a = await import('node:assert/strict');
  const t = banGiao({ ten: 'CT01', hom: '2026-10-06', den: '2026-10-09', viec: [{ ten: 'Chốt màu tôn', han: '2026-10-04' }, { ten: 'Xin phép đào', han: '2026-12-01' }, { ten: 'Việc không hạn', han: '' }],
    lich: [{ ten: 'Cốt thép móng', kt: '2026-10-08', n: 2 }], vt: { cam: 1, can: 2 }, lien: [['Liên hệ', 'Anh Tùng', 'TVGS', '0900000002'], ['Liên hệ', 'Chị Lan', '', ''], ['Thông tin', 'Địa chỉ', 'x', '']] });
  a.match(t, /^BÀN GIAO CÔNG VIỆC · CT01 · 06\/10\/2026 đến 09\/10\/2026\n/);
  a.match(t, /1\. Việc đang dở[^\n]*\n- Chốt màu tôn \(Quá hạn 2 ngày\)\n- Xin phép đào \(Còn 56 ngày\)\n- Việc không hạn \(chưa có hạn\)/);
  a.match(t, /- Cốt thép móng \(kết thúc 08\/10\/2026, Còn 2 ngày\)/);
  a.match(t, /- 1 lô vật tư KHÔNG ĐẠT, cấm dùng\n- 2 lô chưa xong thủ tục/);
  a.match(t, /4\. Số điện thoại cần gọi\n- Anh Tùng \(TVGS\): 0900000002$/); // bỏ dòng không có số, bỏ dòng "Thông tin"
  const k = banGiao({ ten: 'A', hom: '2026-10-06', den: '', viec: [], lich: null, vt: null, lien: [] });
  a.match(k, /Chưa đọc được nhật ký[\s\S]*Chưa đọc được vật tư/); a.ok(!/ đến /.test(k.split('\n')[0]));
  console.log('ok');
}
