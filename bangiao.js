// Sổ bàn giao khi vắng mặt: một trang cho người thay (việc dở, nghiệm thu hẹn, vật tư cần chú ý, số cần gọi). Chỉ gom số liệu app đã có. Chạy: node bangiao.js
import { chia, nhan } from './viec.js';

const muc = (tieu, ds) => `${tieu}\n` + (ds.length ? ds.map(x => '- ' + x).join('\n') : '- Không có');
const dmy = s => s.split('-').reverse().join('/');

// d: ten, hom (yyyy-mm-dd), den (yyyy-mm-dd hoặc ''), viec, lich (nghiệm thu sắp đến theo tiến độ {ten, kt, n} hoặc null nếu chưa đọc được),
// vt (lô cần chú ý [{cam, ten, ma, ngay, chu}] hoặc null), han (giấy tờ/thiết bị {ten, n}), ps (phát sinh chờ chủ đầu tư trả lời, chữ, hoặc null), lien (các dòng Liên hệ [loại, tên, chi tiết, điện thoại])
export function banGiao(d) {
  const nhom = chia(d.viec, d.hom, 365), dang = [...nhom.quaHan, ...nhom.sapDen, ...nhom.sau].map(t => `${t.ten} (${nhan(t.n)})`), khong = nhom.khongHan.map(t => `${t.ten} (chưa có hạn)`);
  const nt = d.lich ? d.lich.map(x => `${x.ten} (kết thúc ${dmy(x.kt)}, ${nhan(x.n)})`) : ['Chưa đọc được nhật ký, kiểm tra trực tiếp.'];
  const vt = d.vt ? d.vt.map(l => `${l.cam ? 'KHÔNG ĐẠT, CẤM DÙNG' : 'Chưa xong thủ tục'}: ${l.ten} lô ${l.ma}, về ${l.ngay}, ${l.chu}`) : ['Chưa đọc được vật tư, kiểm tra trực tiếp.'];
  const ngayVang = d.den ? Math.round((Date.parse(d.den) - Date.parse(d.hom)) / 864e5) : 7; // không ghi ngày vắng thì xét 7 ngày
  const han = d.han.filter(h => h.n <= ngayVang).sort((a, b) => a.n - b.n).map(h => `${h.ten} (${nhan(h.n)})`);
  const ps = d.ps ? d.ps.map(x => 'Phát sinh chờ chủ đầu tư trả lời, đừng hứa thay: ' + x) : ['Chưa đọc được sổ phát sinh, kiểm tra trực tiếp.'];
  const goi = d.lien.filter(r => r[0] === 'Liên hệ' && r[3]).map(r => `${r[1]}${r[2] ? ' (' + r[2] + ')' : ''}: ${r[3]}`);
  return [`BÀN GIAO CÔNG VIỆC · ${d.ten} · ${dmy(d.hom)}${d.den ? ' đến ' + dmy(d.den) : ''}`,
    muc('1. Việc đang dở (quá hạn lên đầu)', [...dang, ...khong]), muc('2. Nghiệm thu sắp đến (theo tiến độ)', nt), muc('3. Vật tư cần chú ý (lô nào cấm dùng, đừng đưa ra đổ)', vt), muc('4. Giấy tờ, thiết bị hết hạn lúc vắng', han), muc('5. Chờ chủ đầu tư trả lời', ps), muc('6. Số điện thoại cần gọi', goi)].join('\n\n');
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('bangiao.js')) {
  const a = await import('node:assert/strict');
  const t = banGiao({ ten: 'CT01', hom: '2026-10-06', den: '2026-10-09', viec: [{ ten: 'Chốt màu tôn', han: '2026-10-04' }, { ten: 'Xin phép đào', han: '2026-12-01' }, { ten: 'Việc không hạn', han: '' }],
    lich: [{ ten: 'Cốt thép móng', kt: '2026-10-08', n: 2 }], vt: [{ cam: true, ten: 'Thép D16', ma: 'VT-3', ngay: '02/10/2026', chu: 'KHÔNG ĐẠT, CẤM DÙNG lô này' }, { cam: false, ten: 'Xi măng', ma: 'VT-4', ngay: '05/10/2026', chu: 'Chưa có CO/CQ' }],
    han: [{ ten: 'Cẩu tháp', n: -1 }, { ten: 'Thẻ ATLĐ', n: 3 }, { ten: 'Bảo lãnh', n: 40 }], ps: ['05/10/2026 Anh Hùng: làm thêm rãnh'], lien: [['Liên hệ', 'Anh Tùng', 'TVGS', '0900000002'], ['Liên hệ', 'Chị Lan', '', ''], ['Thông tin', 'Địa chỉ', 'x', '']] });
  a.match(t, /^BÀN GIAO CÔNG VIỆC · CT01 · 06\/10\/2026 đến 09\/10\/2026\n/);
  a.match(t, /1\. Việc đang dở[^\n]*\n- Chốt màu tôn \(Quá hạn 2 ngày\)\n- Xin phép đào \(Còn 56 ngày\)\n- Việc không hạn \(chưa có hạn\)/);
  a.match(t, /- Cốt thép móng \(kết thúc 08\/10\/2026, Còn 2 ngày\)/);
  a.match(t, /- KHÔNG ĐẠT, CẤM DÙNG: Thép D16 lô VT-3, về 02\/10\/2026, KHÔNG ĐẠT, CẤM DÙNG lô này\n- Chưa xong thủ tục: Xi măng lô VT-4, về 05\/10\/2026, Chưa có CO\/CQ/);
  a.match(t, /4\. Giấy tờ[^\n]*\n- Cẩu tháp \(Quá hạn 1 ngày\)\n- Thẻ ATLĐ \(Còn 3 ngày\)\n\n5\./); a.ok(!t.includes('Bảo lãnh')); // ngoài 3 ngày vắng thì bỏ
  a.match(t, /5\. Chờ chủ đầu tư[^\n]*\n- Phát sinh chờ chủ đầu tư trả lời, đừng hứa thay: 05\/10\/2026 Anh Hùng/);
  a.match(t, /6\. Số điện thoại cần gọi\n- Anh Tùng \(TVGS\): 0900000002$/); // bỏ dòng không có số, bỏ dòng "Thông tin"
  const k = banGiao({ ten: 'A', hom: '2026-10-06', den: '', viec: [], lich: null, vt: null, han: [], ps: null, lien: [] });
  a.match(k, /Chưa đọc được nhật ký[\s\S]*Chưa đọc được vật tư[\s\S]*Chưa đọc được sổ phát sinh/); a.ok(!/ đến /.test(k.split('\n')[0]));
  console.log('ok');
}
