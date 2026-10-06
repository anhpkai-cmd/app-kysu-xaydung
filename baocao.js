// Báo cáo 1 trang cho giám đốc: tiến độ tuần, cái đang chậm, cái chờ duyệt, việc 7 ngày tới. Chỉ gom số liệu app đã có (không có số tiền: app chưa lưu).
import { tienDoTuan } from './hop.js';
import { chia, nhan } from './viec.js';

const muc = (tieu, ds) => `${tieu}\n` + (ds.length ? ds.map(x => '- ' + x).join('\n') : '- Không có');

// d: như banHop, thêm han: giấy tờ/thiết bị có hạn của công trình ({ten, n}), cam: số lô vật tư không đạt
export function banBaoCao(d) {
  const { tienDo, tu, den } = tienDoTuan(d), nhom = chia(d.viec, d.hom, 7);
  const cham = [...(d.cam ? [`${d.cam} lô vật tư KHÔNG ĐẠT, cấm dùng`] : []), ...nhom.quaHan.map(t => `${t.ten} (${nhan(t.n)})`), ...d.han.filter(h => h.n < 0).map(h => `${h.ten} (${nhan(h.n)})`)];
  const cho = d.docs.filter(x => /chờ|trình|đã gửi/i.test(x.tt)).map(x => `${x.ma} ${x.ten} (${x.tt})`);
  const toi = nhom.sapDen.map(t => `${t.ten} (${nhan(t.n)})`);
  const ddmm = n => new Date(Date.UTC(1899, 11, 30) + n * 864e5).toISOString().slice(5, 10).split('-').reverse().join('/');
  return [`BÁO CÁO GIÁM ĐỐC · ${d.ten} · ${d.hom.split('-').reverse().join('/')}`,
    muc(`1. Tiến độ 7 ngày qua (${ddmm(tu)} đến ${ddmm(den)})`, tienDo),
    muc('2. Đang chậm, cần xử lý', cham),
    muc('3. Chờ duyệt, chờ quyết', cho),
    muc('4. Việc đến hạn trong 7 ngày tới', toi)].join('\n\n');
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('baocao.js')) { // chạy: node baocao.js
  const a = await import('node:assert/strict');
  const t = banBaoCao({ ten: 'CT01', hom: '2026-10-06', dm: null, cam: 1,
    viec: [{ ten: 'Chốt màu tôn', han: '2026-10-04' }, { ten: 'Nộp hồ sơ', han: '2026-10-09' }, { ten: 'Xa', han: '2026-12-01' }],
    docs: [{ ma: 'BV-1', ten: 'Móng', tt: 'Chờ duyệt' }, { ma: 'X', ten: 'Y', tt: 'Đã duyệt' }],
    han: [{ ten: 'Cẩu tháp', n: -2 }, { ten: 'Thẻ ATLĐ', n: 10 }] });
  a.match(t, /2\. Đang chậm, cần xử lý\n- 1 lô vật tư KHÔNG ĐẠT, cấm dùng\n- Chốt màu tôn \(Quá hạn 2 ngày\)\n- Cẩu tháp \(Quá hạn 2 ngày\)/);
  a.match(t, /3\. Chờ duyệt, chờ quyết\n- BV-1 Móng \(Chờ duyệt\)\n\n4\. Việc đến hạn trong 7 ngày tới\n- Nộp hồ sơ \(Còn 3 ngày\)$/);
  a.ok(!t.includes('Xa') && !t.includes('Thẻ ATLĐ') && /Chưa đọc được nhật ký/.test(t));
  console.log('ok');
}
