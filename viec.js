// Việc cần làm: đọc bảng VIEC của _CONGVIEC và chia theo hạn. Không phụ thuộc trình duyệt.
export const COT = ['Việc', 'Công trình', 'Hạn', 'Trạng thái', 'Ghi chú', 'Mã lịch']; // thứ tự cột cố định (app tạo bảng này)

export const parse = values => (values || []).slice(1)
  .map((r, i) => ({ ten: r[0] ?? '', ct: r[1] ?? '', han: r[2] ?? '', tt: r[3] ?? '', ghichu: r[4] ?? '', lich: r[5] ?? '', dong: i + 2 }))
  .filter(t => t.ten && t.tt !== 'Xong');

// Hạn nhập là yyyy-mm-dd (ô chọn ngày) hoặc dd/mm/yyyy (gõ tay trong Trang tính).
const ngay = s => {
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return Date.UTC(+m[1], m[2] - 1, +m[3]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  return m ? Date.UTC(+m[3], m[2] - 1, +m[1]) : NaN;
};
export const conLai = (han, homNay) => Math.round((ngay(han) - ngay(homNay)) / 864e5); // NaN nếu chưa có hạn

export function chia(tasks, homNay, sap = 3) {
  const nhom = { quaHan: [], sapDen: [], sau: [], khongHan: [] };
  for (const t of tasks) {
    const n = conLai(t.han, homNay);
    (isNaN(n) ? nhom.khongHan : n < 0 ? nhom.quaHan : n <= sap ? nhom.sapDen : nhom.sau).push({ ...t, n });
  }
  for (const k of ['quaHan', 'sapDen', 'sau']) nhom[k].sort((a, b) => a.n - b.n);
  return nhom;
}

export const nhan = n => n < 0 ? `Quá hạn ${-n} ngày` : n === 0 ? 'Hôm nay' : n === 1 ? 'Ngày mai' : `Còn ${n} ngày`;

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('viec.js')) { // chạy: node viec.js
  const a = await import('node:assert/strict');
  const t = parse([COT, ['A', 'CT01', '2026-10-05', 'Mở'], ['B', 'Chung', '07/10/2026', ''], ['C', 'CT02', '2026-11-30', 'Mở'], ['D', '', '', 'Mở'], ['Đã làm', '', '2026-10-01', 'Xong'], []]);
  a.deepEqual(t.map(x => x.ten), ['A', 'B', 'C', 'D']);
  a.equal(t[3].dong, 5);
  a.equal(conLai('2026-10-07', '2026-10-06'), 1);
  a.equal(conLai('07/10/2026', '2026-10-06'), 1);
  a.ok(isNaN(conLai('', '2026-10-06')));
  const g = chia(t, '2026-10-06');
  a.deepEqual(g.quaHan.map(x => x.ten), ['A']); a.deepEqual(g.sapDen.map(x => x.ten), ['B']);
  a.deepEqual(g.sau.map(x => x.ten), ['C']); a.deepEqual(g.khongHan.map(x => x.ten), ['D']);
  a.equal(nhan(-2), 'Quá hạn 2 ngày'); a.equal(nhan(0), 'Hôm nay');
  console.log('ok');
}
