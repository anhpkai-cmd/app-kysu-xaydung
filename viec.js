// Việc cần làm: đọc bảng VIEC của _CONGVIEC và chia theo hạn. Không phụ thuộc trình duyệt.
export const COT = ['Việc', 'Công trình', 'Hạn', 'Trạng thái', 'Ghi chú', 'Mã lịch']; // thứ tự cột cố định (app tạo bảng này)

export const parse = values => (values || []).slice(1)
  .map((r, i) => ({ ten: r[0] ?? '', ct: r[1] ?? '', han: r[2] ?? '', tt: r[3] ?? '', ghichu: r[4] ?? '', lich: r[5] ?? '', dong: i + 2 }))
  .filter(t => t.ten && t.tt !== 'Xong');

export const tenTatCa = values => new Set((values || []).slice(1).map(r => r[0]).filter(Boolean)); // tên mọi việc, kể cả đã Xong (để biết việc "Mời TVGS" đã làm rồi)

export const dongXong = (ten, ct, han) => [ten, ct, han, 'Xong', '', '']; // dòng VIEC đã làm xong sẵn (theo thứ tự COT)

// Hạn là số ngày của Google Sheets (đọc không định dạng, chắc nhất), yyyy-mm-dd (ô chọn ngày) hoặc dd/mm/yyyy (gõ tay). Ngày không có thật (tháng 13, ngày 32) cho NaN, không đoán.
const ngay = s => {
  if (typeof s === 'number') return Date.UTC(1899, 11, 30) + Math.round(s) * 864e5;
  const d = (y, m, n) => { const t = Date.UTC(y, m - 1, n); return new Date(t).getUTCMonth() === m - 1 ? t : NaN; };
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return d(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  return m ? d(+m[3], +m[2], +m[1]) : NaN;
};
export const iso = s => isNaN(ngay(s)) ? '' : new Date(ngay(s)).toISOString().slice(0, 10); // về yyyy-mm-dd cho ô chọn ngày
export const cong = (s, n) => new Date(ngay(s) + n * 864e5).toISOString().slice(0, 10); // cộng (trừ) n ngày
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
  a.ok(tenTatCa([COT, ['Mời TVGS nghiệm thu: X (A1)', '', '', 'Xong']]).has('Mời TVGS nghiệm thu: X (A1)')); // việc đã Xong vẫn tính là đã làm
  a.deepEqual(dongXong('A', 'CT01', '2026-10-07'), ['A', 'CT01', '2026-10-07', 'Xong', '', '']); a.equal(parse([COT, dongXong('A', 'CT01', '2026-10-07')]).length, 0);
  const t = parse([COT, ['A', 'CT01', '2026-10-05', 'Mở'], ['B', 'Chung', '07/10/2026', ''], ['C', 'CT02', '2026-11-30', 'Mở'], ['D', '', '', 'Mở'], ['Đã làm', '', '2026-10-01', 'Xong'], []]);
  a.deepEqual(t.map(x => x.ten), ['A', 'B', 'C', 'D']);
  a.equal(t[3].dong, 5);
  a.equal(conLai('2026-10-07', '2026-10-06'), 1);
  a.equal(conLai('07/10/2026', '2026-10-06'), 1);
  a.ok(isNaN(conLai('', '2026-10-06'))); a.equal(iso('07/10/2026'), '2026-10-07'); a.equal(iso('abc'), '');
  a.equal(conLai(46387, '2026-10-06'), 86); a.equal(iso(46387), '2026-12-31'); a.ok(isNaN(conLai('12/31/2026', '2026-10-06'))); a.ok(isNaN(conLai('31/12/26', '2026-10-06'))); a.equal(cong('2026-12-31', -14), '2026-12-17');
  const g = chia(t, '2026-10-06');
  a.deepEqual(g.quaHan.map(x => x.ten), ['A']); a.deepEqual(g.sapDen.map(x => x.ten), ['B']);
  a.deepEqual(g.sau.map(x => x.ten), ['C']); a.deepEqual(g.khongHan.map(x => x.ten), ['D']);
  a.equal(nhan(-2), 'Quá hạn 2 ngày'); a.equal(nhan(0), 'Hôm nay');
  console.log('ok');
}
