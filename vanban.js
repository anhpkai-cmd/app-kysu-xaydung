// Văn bản gửi đi: soát văn bản với trang Thông tin công trình trước khi gửi, và lập văn bản từ mẫu (chỗ điền ghi {{Tên mục}}).
// Phần so khớp (soat, conSot) không phụ thuộc trình duyệt; phần còn lại nhận g = { api, ls, json } từ app.js.
const hai = n => String(n).padStart(2, '0');
// Chữ thường, gộp khoảng trắng, ngày về một kiểu dd/mm/yyyy ("ngày 25 tháng 9 năm 2026", "25/9/2026", "25-09-2026" đều thành 25/09/2026).
const chu = s => String(s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim()
  .replace(/ngày (\d{1,2}) tháng (\d{1,2}) năm (\d{4})/g, (_, d, m, y) => `${hai(d)}/${hai(m)}/${y}`)
  .replace(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/g, (_, d, m, y) => `${hai(d)}/${hai(m)}/${y}`);
// Số tiền từ 1 triệu: có dấu phân cách (423.301.185, 423,301,185) hoặc viết liền ngay trước đ/đồng/VNĐ (423301185 đồng).
const TIEN = /\d{1,3}(?:[.,]\d{3}){2,}|\d{7,}(?=\s*(?:đ|vn))/giu;
const tien = s => (String(s).match(TIEN) || []).map(x => +x.replace(/\D/g, ''));
// Số bằng chữ ("bốn trăm hai mươi ba triệu ... đồng") thành số; gặp chữ lạ thì NaN (không đoán, không báo).
const CHUSO = { 'không': 0, 'một': 1, 'mốt': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'tư': 4, 'năm': 5, 'lăm': 5, 'nhăm': 5, 'sáu': 6, 'bảy': 7, 'bẩy': 7, 'tám': 8, 'chín': 9 };
const BAC = { 'nghìn': 1e3, 'ngàn': 1e3, 'triệu': 1e6, 'tỷ': 1e9, 'tỉ': 1e9 };
export function bangChu(s) { // ponytail: không đọc kiểu "một nghìn tỷ" (bậc lồng nhau), quá lớn với công trình thường
  let tong = 0, nhom = 0, cuoi = 0;
  for (const w of s.split(/[\s,;.\/]+/).filter(Boolean)) {
    if (w in CHUSO) nhom += cuoi = CHUSO[w];
    else if (w === 'mười') nhom += 10;
    else if (w === 'mươi') nhom += cuoi * 9;
    else if (w === 'trăm') nhom += cuoi * 99;
    else if (w in BAC) { tong += nhom * BAC[w]; nhom = 0; }
    else if (!['lẻ', 'linh', 'chẵn', 'và'].includes(w)) return NaN;
  }
  return tong + nhom;
}
const so = n => n.toLocaleString('vi-VN');
const LINK = /^https?:\/\//;

// tt: [[tên mục, giá trị]] từ trang THONGTIN. Trả về { lech: số tiền gần giống mà khác (dễ là gõ nhầm), thieu: mục không thấy trong văn bản }.
export function soat(van, tt) {
  tt = tt.filter(([ten, gt]) => ten && gt && !LINK.test(gt));
  const v = chu(van), co = new Set(tien(van)), biet = tt.flatMap(([ten, gt]) => tien(gt).map(n => ({ ten, n })));
  // ponytail: lệch trong khoảng 5% coi là gõ nhầm; khác xa hơn coi là số khác (tạm ứng, thuế...), không báo
  const sai = [...co].filter(n => !biet.some(b => b.n === n)).flatMap(n => biet.filter(b => Math.abs(n - b.n) <= b.n * 0.05).slice(0, 1).map(b => ({ ...b, sai: n })));
  const thieu = tt.filter(([ten, gt]) => { const s = tien(gt); return !sai.some(b => b.ten === ten) && (s.length ? !s.every(n => co.has(n)) : !v.includes(chu(gt))); }).map(([ten, gt]) => `${ten}: ${gt}`);
  // số bằng số và bằng chữ trong cùng văn bản phải khớp nhau: "423.301.185 đồng (Bằng chữ: Bốn trăm ... đồng)"
  const chuLech = [...String(van).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').matchAll(new RegExp(`(${TIEN.source})[^\\d]{0,60}?bằng chữ\\s*:?\\s*([^\\d()]+?)\\s*đồng`, 'giu'))]
    .map(([, n, c]) => [+n.replace(/\D/g, ''), c, bangChu(c)]).filter(([n, , m]) => !isNaN(m) && m !== n)
    .map(([n, c, m]) => `Số ${so(n)} đ nhưng bằng chữ ghi "${c}" (${so(m)} đ)`);
  return { lech: [...chuLech, ...sai.map(b => `Văn bản ghi ${so(b.sai)} đ, thông tin công trình ghi ${b.ten} là ${so(b.n)} đ`)], thieu };
}
// Số thành chữ cho dòng "Bằng chữ: ...". ponytail: đến hàng trăm tỷ (dưới 10^12), đủ cho công trình thường.
const DV = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const baSo = (n, du) => { // một nhóm 3 chữ số; du: có nhóm lớn hơn đứng trước nên phải đọc đủ "không trăm lẻ"
  const t = Math.floor(n / 100), c = Math.floor(n / 10) % 10, d = n % 10, r = du || t ? [DV[t], 'trăm'] : [];
  if (c > 1) r.push(DV[c], 'mươi'); else if (c === 1) r.push('mười'); else if (d && r.length) r.push('lẻ');
  if (d) r.push(d === 1 && c > 1 ? 'mốt' : d === 5 && c ? 'lăm' : DV[d]);
  return r;
};
export function soChu(n) {
  const r = [];
  ['tỷ', 'triệu', 'nghìn', ''].forEach((bac, i) => {
    const nhom = Math.floor(n / 10 ** (9 - 3 * i)) % 1000;
    if (nhom) r.push(...baSo(nhom, r.length > 0), bac);
  });
  const c = r.filter(Boolean).join(' ') || 'không';
  return c[0].toUpperCase() + c.slice(1);
}
export const conSot = van => [...new Set(String(van).match(/\{\{[^{}]+\}\}/g) || [])]; // chỗ điền chưa có thông tin

const DOC = 'application/vnd.google-apps.document', SHEET = 'application/vnd.google-apps.spreadsheet';
const WORD = /\.(docx?|odt|rtf)$/i, EXCEL = /\.(xlsx?|ods)$/i;
const chuCua = (g, f) => g.api(`https://www.googleapis.com/drive/v3/files/${f.id}/export?mimeType=${f.mimeType === SHEET ? 'text/csv' : 'text/plain'}`, { raw: true }); // ponytail: Trang tính chỉ đọc trang đầu

// Chữ của văn bản để soát, ưu tiên Google Docs, rồi Word, rồi PDF, rồi Trang tính/Excel (báo giá, khối lượng; đọc trang đầu). Word, PDF (cả bản scan) thì Drive chuyển tạm sang Google Docs
// (Drive tự nhận dạng chữ), bản tạm nằm trong thư mục g.tam() và xóa ngay sau khi đọc; app chỉ xóa đúng bản tạm do nó vừa tạo.
export async function docChu(g, ds) {
  const f = ds.find(f => f.mimeType === DOC) || ds.find(f => WORD.test(f.name)) || ds.find(f => /\.pdf$/i.test(f.name)) || ds.find(f => f.mimeType === SHEET) || ds.find(f => EXCEL.test(f.name));
  if (!f) return null;
  if (f.mimeType === DOC || f.mimeType === SHEET) return chuCua(g, f);
  const tam = await g.api(`https://www.googleapis.com/drive/v3/files/${f.id}/copy?ocrLanguage=vi&fields=id,mimeType`, g.json({ mimeType: EXCEL.test(f.name) ? SHEET : DOC, name: '_TAM-SOAT_' + f.name, parents: [await g.tam()] }));
  try { return await chuCua(g, tam); } finally { await g.api(`https://www.googleapis.com/drive/v3/files/${tam.id}`, { method: 'DELETE' }).catch(() => {}); }
}

// Lập văn bản: chép mẫu (Word/Excel thì chuyển sang Google Docs/Trang tính) vào thư mục đích, điền {{Tên mục}} từ trang Thông tin,
// {{Tên mục bằng chữ}} cho mục là số tiền (ví dụ {{Giá trị HĐ bằng chữ}}), {{Ngày}} (06/10/2026) và {{Ngày dài}} (ngày 06 tháng 10 năm 2026).
export async function lap(g, mau, ten, dir, tt) {
  const sheet = mau.mimeType === SHEET || EXCEL.test(mau.name);
  const f = await g.api(`https://www.googleapis.com/drive/v3/files/${mau.id}/copy?fields=id,mimeType,webViewLink`, g.json({ mimeType: sheet ? SHEET : DOC, name: ten, parents: [dir] }));
  const [d, m, y] = new Date().toLocaleDateString('en-GB').split('/'), co = tt.filter(([t, gt]) => t && gt);
  const dien = [...co, ...co.filter(([, gt]) => tien(gt).length === 1).map(([t, gt]) => [`${t} bằng chữ`, soChu(tien(gt)[0]) + ' đồng']),
    ['Ngày', `${d}/${m}/${y}`], ['Ngày dài', `ngày ${d} tháng ${m} năm ${y}`]];
  await (sheet
    ? g.api(`https://sheets.googleapis.com/v4/spreadsheets/${f.id}:batchUpdate`, g.json({ requests: dien.map(([t, gt]) => ({ findReplace: { find: `{{${t}}}`, replacement: gt, allSheets: true } })) }))
    : g.api(`https://docs.googleapis.com/v1/documents/${f.id}:batchUpdate`, g.json({ requests: dien.map(([t, gt]) => ({ replaceAllText: { containsText: { text: `{{${t}}}`, matchCase: false }, replaceText: gt } })) })));
  return { ...f, thieu: conSot(await chuCua(g, f)) };
}

// Thư mục mẫu: các mẫu Google Docs, Trang tính, Word, Excel, xếp theo tên.
export const dsMau = async (g, dir) => (await g.ls(`'${dir}' in parents`)).filter(f => f.mimeType === DOC || f.mimeType === SHEET || WORD.test(f.name) || EXCEL.test(f.name))
  .sort((a, b) => a.name.localeCompare(b.name));

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('vanban.js')) { // chạy: node vanban.js
  const a = await import('node:assert/strict');
  const tt = [['Giá trị hợp đồng', '423.301.185 đ'], ['Chủ đầu tư', 'Ban Quản lý dự án xã Phước Hậu'], ['Số hợp đồng', '02/2026/HĐXD-HT889'], ['NotebookLM', 'https://notebooklm.google.com/x'], ['Trống', '']];
  const hd = 'HỢP ĐỒNG số 02/2026/HĐXD-HT889\nBên A: BAN QUẢN LÝ DỰ ÁN  XÃ PHƯỚC HẬU\nGiá trị: 424.575.008 đồng. Tạm ứng 126,990,555 đồng.';
  const r = soat(hd, tt);
  a.deepEqual(r.lech, ['Văn bản ghi 424.575.008 đ, thông tin công trình ghi Giá trị hợp đồng là 423.301.185 đ']); // nhầm số QĐ 427 vs dự thảo HĐ
  a.deepEqual(r.thieu, []); // đã báo sai thì không báo thiếu nữa; tạm ứng khác xa: không báo; link NotebookLM, mục trống: bỏ qua
  a.deepEqual(soat(hd, [...tt, ['Đại diện', 'Bạch Tường Lam']]).thieu, ['Đại diện: Bạch Tường Lam']);
  a.deepEqual(soat(hd.replace('424.575.008', '423,301,185'), tt), { lech: [], thieu: [] }); // dấu phẩy hay chấm đều được
  a.deepEqual(soat('', tt).thieu.length, 3);
  a.equal(bangChu('bốn trăm hai mươi ba triệu ba trăm lẻ một nghìn một trăm tám mươi lăm'), 423301185);
  a.equal(bangChu('một tỷ không trăm linh năm triệu chẵn'), 1005000000); a.equal(bangChu('hai mươi mốt nghìn'), 21000); a.ok(isNaN(bangChu('khoảng bốn trăm')));
  a.deepEqual(soat('Giá trị: 423.301.185 đồng (Bằng chữ: Bốn trăm hai mươi ba triệu ba trăm lẻ một nghìn một trăm tám mươi lăm đồng)', tt.slice(0, 1)), { lech: [], thieu: [] });
  a.deepEqual(soat('Giá trị: 423301185 đồng (Bằng chữ: Bốn trăm hai mươi bốn triệu ba trăm lẻ một nghìn một trăm tám mươi lăm đồng)', tt.slice(0, 1)).lech,
    ['Số 423.301.185 đ nhưng bằng chữ ghi "bốn trăm hai mươi bốn triệu ba trăm lẻ một nghìn một trăm tám mươi lăm" (424.301.185 đ)']);
  a.deepEqual(soat('Ký ngày 24 tháng 9 năm 2026', [['Ngày ký HĐ', '24/09/2026']]).thieu, []); a.deepEqual(soat('Ký 24-9-2026', [['Ngày ký HĐ', '24/09/2026']]).thieu, []);
  a.deepEqual(soat('Ký 25/9/2026', [['Ngày ký HĐ', '24/09/2026']]).thieu, ['Ngày ký HĐ: 24/09/2026']);
  a.equal(soChu(423301185), 'Bốn trăm hai mươi ba triệu ba trăm lẻ một nghìn một trăm tám mươi lăm');
  a.equal(soChu(1005000000), 'Một tỷ không trăm lẻ năm triệu'); a.equal(soChu(21), 'Hai mươi mốt'); a.equal(soChu(15), 'Mười lăm'); a.equal(soChu(0), 'Không');
  for (const n of [1, 10, 101, 110, 1001, 20500, 613406400, 999999999999, 100000000000]) a.equal(bangChu(soChu(n).toLowerCase()), n); // đọc ngược phải ra đúng số
  // báo giá mẫu thật của anh: tổng 613.406.400 nhưng dòng bằng chữ ghi 613.430.400
  a.equal(soat('TỔNG CỘNG,,,"613,406,400"\n"Bằng chữ: Sáu trăm mười ba triệu, bốn trăm ba mươi nghìn, bốn trăm đồng."', []).lech.length, 1);
  a.deepEqual(conSot('Kính gửi {{Chủ đầu tư}}, ngày {{Ngày}} {{Chủ đầu tư}} {x}'), ['{{Chủ đầu tư}}', '{{Ngày}}']);
  console.log('ok');
}
