// Đọc bảng DANHMUC của sổ đăng ký thành danh sách tài liệu, và lọc theo từ khóa. Không phụ thuộc trình duyệt.
const COT = { ma: 'Mã tài liệu', ten: 'Tên', rev: 'Rev hiện hành', ngay: 'Ngày rev', tt: 'Trạng thái', tukhoa: 'Từ khóa' };

export function parse(values) {
  const [head = [], ...rows] = values;
  const at = Object.fromEntries(Object.entries(COT).map(([k, v]) => [k, head.indexOf(v)]));
  if (Object.values(at).includes(-1)) throw new Error('Sổ đăng ký thiếu cột: ' + Object.values(COT).filter(v => !head.includes(v)).join(', '));
  return rows.filter(r => r[at.ma]).map(r => Object.fromEntries(Object.keys(COT).map(k => [k, r[at[k]] ?? ''])));
}

const bo = s => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').toLowerCase();
export const loc = (docs, q) => docs.filter(d => bo(Object.values(d).join(' ')).includes(bo(q.trim())));

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('register.js')) { // chạy: node register.js
  const a = await import('node:assert/strict');
  const d = parse([['Mã tài liệu', 'Tên', 'Rev hiện hành', 'Ngày rev', 'Trạng thái', 'Từ khóa'], ['CT01-BV-KC-005', 'Móng M1', 'R02', '', 'Đã duyệt', 'móng, cọc'], []]);
  a.equal(d.length, 1);
  a.equal(loc(d, 'MONG').length, 1);
  a.equal(loc(d, 'cột').length, 0);
  a.throws(() => parse([['Tên']]));
  console.log('ok');
}
