// Đọc bảng DANHMUC của sổ đăng ký thành danh sách tài liệu, và lọc theo từ khóa. Không phụ thuộc trình duyệt.
const COT = { ma: 'Mã tài liệu', ten: 'Tên', rev: 'Rev hiện hành', ngay: 'Ngày rev', tt: 'Trạng thái', tukhoa: 'Từ khóa', dir: 'Thư mục chuẩn' };
const HAN = 'Hạn hiệu lực'; // cột không bắt buộc: ngày hết hiệu lực (bảo lãnh, bảo hiểm, giấy phép...)

export function parse(values) {
  const [head = [], ...rows] = values;
  const at = Object.fromEntries(Object.entries(COT).map(([k, v]) => [k, head.indexOf(v)]));
  if (Object.values(at).includes(-1)) throw new Error('Sổ đăng ký thiếu cột: ' + Object.values(COT).filter(v => !head.includes(v)).join(', '));
  const han = head.indexOf(HAN);
  return rows.map((r, i) => ({ r, dong: i + 2 })).filter(({ r }) => r[at.ma]).map(({ r, dong }) => ({ ...Object.fromEntries(Object.keys(COT).map(k => [k, r[at[k]] ?? ''])), han: han < 0 ? '' : r[han] ?? '', dong })); // dong = số dòng trong Sheet
}

import { iso } from './viec.js';
// n bản mới nhất theo Ngày rev (dd/mm/yyyy, yyyy-mm-dd hay số ngày của Sheet); dòng không có ngày xếp cuối.
export const moiNhat = (docs, n = 4) => docs.map(d => ({ d, k: iso(d.ngay) })).sort((a, b) => (b.k || '').localeCompare(a.k || '')).slice(0, n).map(x => x.d);

const bo = s => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').toLowerCase();
export const loc = (docs, q) => docs.filter(d => bo(Object.entries(d).filter(([k]) => k !== 'dong').map(e => e[1]).join(' ')).includes(bo(q.trim())));

// Rev: R01, R02... (chỉ tăng khi file rời tay mình). Bản nhận từ thiết kế có thể mang Rev riêng (RB...), khi đó không so sánh số.
const so = r => /^R\d+$/.test(r) ? +r.slice(1) : NaN;
export const revTiep = r => so(r) >= 0 ? 'R' + String(so(r) + 1).padStart(2, '0') : '';
export const revHopLe = (moi, cu) => /^R[0-9A-Z]{2,3}$/.test(moi) && !(so(moi) <= so(cu));
// Tên file chuẩn: [Mã]-[Rev]_[MoTa].ext, không dấu, không khoảng trắng.
export const tenChuan = (ma, rev, ten, tenFile) => {
  const ext = (tenFile.match(/\.[A-Za-z0-9]{1,5}$/) || [''])[0].toLowerCase();
  const mota = bo(ten).split(/[^a-z0-9]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('').slice(0, 40);
  return `${ma}-${rev}${mota ? '_' + mota : ''}${ext}`;
};

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('register.js')) { // chạy: node register.js
  const a = await import('node:assert/strict');
  const d = parse([['Mã tài liệu', 'Tên', 'Rev hiện hành', 'Ngày rev', 'Trạng thái', 'Từ khóa', 'Thư mục chuẩn'], ['CT01-BV-KC-005', 'Móng M1', 'R02', '', 'Đã duyệt', 'móng, cọc', '02_BANVE/KC_KETCAU/HIENHANH'], []]);
  a.equal(d.length, 1);
  a.equal(loc(d, 'MONG').length, 1);
  a.equal(loc(d, 'cột').length, 0);
  a.throws(() => parse([['Tên']]));
  a.equal(d[0].dong, 2); a.equal(d[0].han, '');
  a.equal(parse([['Mã tài liệu', 'Tên', 'Rev hiện hành', 'Ngày rev', 'Trạng thái', 'Từ khóa', 'Thư mục chuẩn', 'Hạn hiệu lực'], ['X', 'Bảo lãnh', 'R01', '', '', '', '', '31/12/2026']])[0].han, '31/12/2026');
  a.deepEqual(moiNhat([{ ma: 'a', ngay: '' }, { ma: 'b', ngay: '05/10/2026' }, { ma: 'c', ngay: '2026-10-06' }, { ma: 'd', ngay: '01/10/2026' }], 3).map(x => x.ma), ['c', 'b', 'd']); // mới nhất trước, không ngày xếp cuối
  a.equal(revTiep('R02'), 'R03'); a.equal(revTiep('RB'), '');
  a.ok(revHopLe('R03', 'R02')); a.ok(!revHopLe('R02', 'R02')); a.ok(!revHopLe('R01', 'R02')); a.ok(!revHopLe('r3', 'R02')); a.ok(revHopLe('RB1', 'R02')); // RB1 không phải dạng số: không so được
  a.equal(tenChuan('CT01-BV-KC-005', 'R03', 'Móng M1, M2', 'Ảnh chụp 1.PDF'), 'CT01-BV-KC-005-R03_MongM1M2.pdf');
  a.equal(tenChuan('X', 'R01', '', 'noext'), 'X-R01');
  console.log('ok');
}
