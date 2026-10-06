// Chấm công tổ đội: cộng số người các nhóm đã ghi trong trang NGAY của nhật ký (cột E..H, xem nhatky.js) thành bảng công tháng,
// lập Trang tính gửi tổ trưởng ký xác nhận. Không ghi gì vào nhật ký.
// ponytail: công = số người × 1 (nghỉ nửa buổi: × 0,5; nghỉ cả ngày: 0). Chưa chia theo từng tổ trưởng, chưa tính tăng ca; cần thì thêm cột vào NGAY.
import { NK, serial } from './nhatky.js';
import { soTiep } from './vattu.js';

export const NHOM = NK.slice(3, 7).map(([t]) => t.replace(/ \(người\)$/, ''));
const HE = { 'Nghỉ sáng': 0.5, 'Nghỉ chiều': 0.5, 'Nghỉ cả ngày': 0 };
const ngayCua = n => new Date(Date.UTC(1899, 11, 30) + n * 864e5).toISOString().slice(0, 10); // số ngày Sheets -> yyyy-mm-dd
const dmy = s => s.split('-').reverse().join('/');
const so = x => +x.toFixed(2);

// v: các dòng NGAY (giá trị thô), thang: yyyy-mm, hom: yyyy-mm-dd. Ngày ghi hai dòng thì lấy dòng đầu (app không ghi trùng ngày).
export function bangCong(v, thang, hom) {
  const tu = serial(thang + '-01'), het = serial(ngayCua(serial(thang + '-28') + 4).slice(0, 7) + '-01') - 1, toi = Math.min(het, serial(hom));
  const theo = new Map();
  for (const r of v || []) if (typeof r[0] === 'number' && r[0] >= tu && r[0] <= het && !theo.has(r[0])) theo.set(r[0], r);
  const dong = [...theo.keys()].sort((a, b) => a - b).map(n => {
    const r = theo.get(n), he = HE[r[3]] ?? 1;
    return { ngay: dmy(ngayCua(n)), nguoi: [4, 5, 6, 7].map(i => +r[i] || 0), he, nghi: HE[r[3]] !== undefined ? r[3] : '' };
  });
  const tong = NHOM.map((_, i) => so(dong.reduce((s, d) => s + d.nguoi[i] * d.he, 0)));
  const thieu = []; // ngày chưa ghi, bỏ Chủ nhật ((n + 6) % 7 là thứ trong tuần, 0 = Chủ nhật); ponytail: ngày lễ vẫn bị báo
  for (let n = tu; n <= toi; n++) if (!theo.has(n) && (n + 6) % 7) thieu.push(dmy(ngayCua(n)).slice(0, 5));
  return { dong, tong, thieu };
}

// Các dòng của Trang tính bảng công (điền thẳng, không cần mẫu).
export const oBang = (ct, thang, b) => [
  ['BẢNG CHẤM CÔNG TỔ ĐỘI'], [`Công trình: ${ct}`], [`Tháng ${dmy(thang)}`], ['Công = số người × 1; nghỉ nửa buổi tính nửa công, nghỉ cả ngày không tính.'], [],
  ['Ngày', ...NHOM, 'Ghi chú'],
  ...b.dong.map(d => [d.ngay, ...d.nguoi.map(x => so(x * d.he)), d.nghi]),
  ['Tổng công', ...b.tong, ''], [],
  ['Tổ trưởng', '', 'Cán bộ kỹ thuật', '', 'Chỉ huy trưởng'], ['(ký, ghi rõ họ tên)', '', '(ký, ghi rõ họ tên)', '', '(ký, ghi rõ họ tên)'],
];
export const tinBang = (ma, ct, thang, b, link) => [`BẢNG CÔNG THÁNG ${dmy(thang)} · ${ct}`, ...NHOM.map((t, i) => `${t}: ${b.tong[i].toLocaleString('vi-VN')} công`),
  `Ghi ${b.dong.length} ngày nhật ký.`, `Nhờ tổ trưởng xem và ký xác nhận: ${link}`, `(${ma})`].join('\n');

let h, v = [];
const $ = id => document.getElementById(id), ms = t => $('ccms').textContent = t ?? '';
const thangNay = () => new Date().toLocaleDateString('sv-SE').slice(0, 7);
const ve = im => { // im: giữ nguyên dòng thông báo (sau khi lập bảng)
  const thang = $('cct').value, b = bangCong(v, thang, new Date().toLocaleDateString('sv-SE'));
  $('ccds').replaceChildren(...(b.dong.length ? NHOM.map((t, i) => Object.assign(document.createElement('p'), { textContent: `${t}: ${b.tong[i].toLocaleString('vi-VN')} công` })) : []));
  if (!im) ms(b.dong.length ? `Tháng ${dmy(thang)}: đã ghi ${b.dong.length} ngày nhật ký.` + (b.thieu.length ? ` Chưa ghi: ${b.thieu.join(', ')}.` : '')
    : `Tháng ${dmy(thang)} chưa có ngày nhật ký nào.`);
  $('cclap').disabled = !b.dong.length; return b;
};

// ham: { api, json, thuMuc, ls, id (file nhật ký), tenCt } từ app.js
export async function moCC(ham) {
  h = ham; v = []; $('cc').hidden = false; $('cct').value ||= thangNay(); $('ccds').replaceChildren();
  if (!h.id) return ms('Chưa mở được file nhật ký của công trình này.'), $('cclap').disabled = true;
  try { const d = (await ham.api(`https://sheets.googleapis.com/v4/spreadsheets/${ham.id}/values/NGAY!A:H?valueRenderOption=UNFORMATTED_VALUE`)).values || []; if (h === ham) v = d, ve(); } // đổi công trình giữa chừng thì bỏ
  catch (e) { ms('Không đọc được nhật ký: ' + e.message); }
}
export const doiThang = () => h && ve(), sauLap = () => h && ve(true);

export async function lapCC() {
  const thang = $('cct').value, b = ve(); if (!b.dong.length) return;
  const ct = $('ct').value, thuc = $('ct').selectedOptions[0].text, ten = h.tenCt() === '(tên công trình)' ? thuc : h.tenCt(), goc = `${thuc.split('_')[0]}-CC-${thang.replace('-', '')}`;
  if (b.thieu.length && !confirm(`Còn ${b.thieu.length} ngày chưa ghi nhật ký (${b.thieu.join(', ')}). Vẫn lập bảng công?`)) return;
  ms('Đang lập bảng công...');
  const dir = await h.thuMuc(ct, '05_VATTU_DOITHICONG/CHAMCONG'), ma = `${goc}-${soTiep(goc, (await h.ls(`'${dir}' in parents and name contains '${goc}'`)).map(f => f.name))}`;
  const t = await h.api('https://sheets.googleapis.com/v4/spreadsheets', h.json({ properties: { title: ma + '_BangCong' }, sheets: [{ properties: { title: 'BANGCONG' },
    data: [{ startRow: 0, startColumn: 0, rowData: oBang(ten, thang, b).map(r => ({ values: r.map(x => ({ userEnteredValue: typeof x === 'number' ? { numberValue: x } : { stringValue: x } })) })) }] }] }));
  const f = await h.api(`https://www.googleapis.com/drive/v3/files/${t.spreadsheetId}?fields=parents,webViewLink`);
  await h.api(`https://www.googleapis.com/drive/v3/files/${t.spreadsheetId}?addParents=${dir}&removeParents=${f.parents.join(',')}&fields=id`, { method: 'PATCH' });
  ms(`Đã lập ${ma} trong 05_VATTU_DOITHICONG/CHAMCONG.`);
  if (!confirm(`Gửi bảng công ${ma} cho tổ trưởng?\nBất kỳ ai có link đều xem được bảng này.`)) return;
  await h.api(`https://www.googleapis.com/drive/v3/files/${t.spreadsheetId}/permissions`, h.json({ role: 'reader', type: 'anyone' }));
  const tin = tinBang(ma, ten, thang, b, f.webViewLink);
  try { if (navigator.share) await navigator.share({ title: ma, text: tin }); else { await navigator.clipboard.writeText(tin); ms(`Đã chép bảng công ${ma}, dán vào Zalo để gửi.`); } }
  catch (e) { if (e.name !== 'AbortError') ms(`Bảng công ${ma} đã lập nhưng máy không cho chia sẻ (${e.message}). Link: ${f.webViewLink}`); }
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('chamcong.js')) { // chạy: node chamcong.js
  const a = await import('node:assert/strict'), n = s => serial(s);
  const v = [['Ngày'], [n('2026-10-01'), 'Nắng', 'Nắng', 'Không', 10, 4, 2, 1], [n('2026-10-02'), 'Mưa to', 'Nắng', 'Nghỉ sáng', 8, 4, '', 1], [n('2026-10-02'), '', '', '', 99],
    [n('2026-10-04'), 'Mưa to', 'Mưa to', 'Nghỉ cả ngày', 3], [n('2026-09-30'), '', '', '', 50], [n('2026-11-01'), '', '', '', 50]];
  const b = bangCong(v, '2026-10', '2026-10-05');
  a.deepEqual(b.tong, [14, 6, 2, 1.5]); // 10 + 8×0,5; ngày trùng lấy dòng đầu; nghỉ cả ngày 0; ngoài tháng bỏ
  a.deepEqual(b.thieu, ['03/10', '05/10']); a.equal(b.dong.length, 3); a.equal(b.dong[1].nghi, 'Nghỉ sáng');
  a.equal(bangCong(v, '2026-02', '2026-10-05').thieu.length, 24); a.equal(bangCong([], '2026-12', '2026-12-31').thieu.length, 27); // bỏ 4 Chủ nhật
  a.deepEqual(bangCong([], '2026-10', '2026-10-12').thieu.slice(2, 4), ['03/10', '05/10']); // 04/10 là Chủ nhật
  const o = oBang('Chợ Hiếu Lễ', '2026-10', b); a.deepEqual(o[6], ['01/10/2026', 10, 4, 2, 1, '']); a.deepEqual(o[7], ['02/10/2026', 4, 2, 0, 0.5, 'Nghỉ sáng']); a.deepEqual(o.at(-4), ['Tổng công', 14, 6, 2, 1.5, '']);
  a.match(tinBang('CT01-CC-202610-01', 'Chợ Hiếu Lễ', '2026-10', b, 'https://x'), /Nhóm 1: đất, BT, phục vụ: 14 công\n.*\n.*\n.*: 1,5 công\nGhi 3 ngày/);
  console.log('ok');
}
