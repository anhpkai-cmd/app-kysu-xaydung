// Họp chủ đầu tư một chạm: gom tiến độ 7 ngày, việc vướng, giấy tờ chờ, ảnh mới nhất thành một bản tin để đọc hoặc gửi Zalo.
// Không phụ thuộc trình duyệt: app.js đọc dữ liệu rồi gọi banHop().
import { serial } from './nhatky.js';
import { chia, nhan } from './viec.js';

const ddmm = n => new Date(Date.UTC(1899, 11, 30) + n * 864e5).toISOString().slice(5, 10).split('-').reverse().join('/'); // số ngày Sheets -> dd/mm
const muc = (tieu, ds) => `${tieu}\n` + (ds.length ? ds.map(x => '- ' + x).join('\n') : '- Không có');

// d: { ten, hom (yyyy-mm-dd), ngay, kl, dm (null = chưa đọc được nhật ký), viec, docs, gui }. Ảnh không vào bản tin: CĐT không mở được link.
// tiến độ 7 ngày qua (dùng cả cho bản tin họp và báo cáo giám đốc): các dòng chữ + khoảng ngày
export function tienDoTuan(d) {
  const den = serial(d.hom), tu = den - 6, trong = r => typeof r[0] === 'number' && r[0] >= tu && r[0] <= den;
  let tienDo = ['Chưa đọc được nhật ký công trình, kiểm tra trực tiếp.'];
  if (d.dm) {
    const ngay = (d.ngay || []).filter(trong), nguoi = ngay.map(r => [4, 5, 6, 7].reduce((s, i) => s + (+r[i] || 0), 0)); // cột E..H: số người các nhóm
    const tong = {};
    for (const r of (d.kl || []).filter(trong)) tong[r[1]] = (tong[r[1]] || 0) + (+r[4] || 0);
    const ten = Object.fromEntries(d.dm.map(([ma, t, dv]) => [ma, [t, dv]]));
    tienDo = [`Nhật ký: ghi ${new Set(ngay.map(r => r[0])).size}/7 ngày` + (ngay.length ? `, trung bình ${Math.round(nguoi.reduce((a, b) => a + b, 0) / ngay.length)} người/ngày` : ''),
      ...Object.entries(tong).filter(([, v]) => v).map(([ma, v]) => `${ma} ${ten[ma]?.[0] ?? ''}: ${+v.toFixed(2)} ${ten[ma]?.[1] ?? ''}`.replace(/\s+/g, ' ').trim()),
      ...ngay.filter(r => r[10]).map(r => `Sự cố ${ddmm(r[0])}: ${r[10]}`)]; // cột K: Sự cố, ATLĐ
  }
  return { tienDo, tu, den };
}

export function banHop(d) {
  const { tienDo, tu, den } = tienDoTuan(d);
  const nhom = chia(d.viec, d.hom), vuong = [...nhom.quaHan, ...nhom.sapDen, ...nhom.sau, ...nhom.khongHan].map(t => isNaN(t.n) ? t.ten : `${t.ten} (${nhan(t.n)})`);
  const cho = d.docs.filter(x => /chờ|trình|đã gửi/i.test(x.tt)).map(x => `${x.ma} ${x.ten} (${x.tt})`);
  const gui = (d.gui || []).filter(r => r[3] === 'Gửi' && serial(String(r[0]).split('/').reverse().join('-')) > den - 30).slice(-5).map(r => `${r[0]} đã gửi ${r[1]} ${r[2]}`); // 5 lần gửi cuối trong 30 ngày
  return [`HỌP CHỦ ĐẦU TƯ · ${d.ten} · ${d.hom.split('-').reverse().join('/')}`,
    muc(`1. Tiến độ 7 ngày qua (${ddmm(tu)} đến ${ddmm(den)})`, tienDo),
    muc('2. Việc đang mở (quá hạn lên đầu)', vuong),
    muc('3. Giấy tờ chờ duyệt, đã gửi 30 ngày qua', [...cho, ...gui])].join('\n\n');
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('hop.js')) { // chạy: node hop.js
  const a = await import('node:assert/strict');
  const n = serial('2026-10-06');
  const t = banHop({ ten: 'CT01_ChoHieuLe', hom: '2026-10-06',
    ngay: [[n - 1, 'Nắng', 'Nắng', 'Không', 4, 3, 2, 1, '', '', 'Xe bơm trễ 1 giờ', ''], [n - 9, '', '', '', 50], ['Ngày']],
    kl: [[n - 1, 'HM1-1', '', '', 12.5], [n, 'HM1-1', '', '', 7.5], [n - 20, 'HM1-1', '', '', 99]], dm: [['HM1-1', 'Đổ bê tông bệ', 'm3']],
    viec: [{ ten: 'Chờ CĐT chốt màu tôn', han: '2026-10-04' }, { ten: 'Xin phép đào', han: '' }],
    docs: [{ ma: 'CT01-BV-KC-005', ten: 'Móng', tt: 'Chờ duyệt' }, { ma: 'X', ten: 'Y', tt: 'Đã duyệt' }],
    gui: [['Ngày'], ['01/08/2026', 'CT01-HD-000', 'R00', 'Gửi'], ['05/10/2026', 'CT01-HD-001', 'R00', 'Gửi'], ['05/10/2026', 'CT01-HD-001', 'R00', 'Nhận']] });
  a.match(t, /ghi 1\/7 ngày, trung bình 10 người\/ngày/); // dòng ngày cũ hơn 7 ngày và dòng tiêu đề bị bỏ
  a.match(t, /HM1-1 Đổ bê tông bệ: 20 m3/); // 12,5 + 7,5, không cộng dòng 20 ngày trước
  a.match(t, /Sự cố 05\/10: Xe bơm trễ 1 giờ/);
  a.match(t, /Chờ CĐT chốt màu tôn \(Quá hạn 2 ngày\)\n- Xin phép đào/);
  a.match(t, /CT01-BV-KC-005 Móng \(Chờ duyệt\)\n- 05\/10\/2026 đã gửi CT01-HD-001 R00$/);
  a.ok(!t.includes('X Y') && !t.includes('HD-000')); // đã duyệt, gửi quá 30 ngày: bỏ
  a.match(banHop({ ten: 'A', hom: '2026-10-06', dm: null, viec: [], docs: [] }), /Chưa đọc được nhật ký[\s\S]*2\. Việc đang mở \(quá hạn lên đầu\)\n- Không có/);
  console.log('ok');
}
