// Vật tư từ đệ trình đến nghiệm thu, ghi trong file nhật ký CTxx-NK-NHATKY của công trình:
// trang DMVATTU (mỗi vật tư một dòng: đệ trình, duyệt) và trang VATTU (mỗi lần vật tư về một dòng, xem luong-4/tao_nhat_ky.py; app thêm cột I..K).
import { serial } from './nhatky.js';
import { iso, conLai } from './viec.js';
import { tenChuan } from './register.js';

export const DM = ['Vật tư', 'Quy cách', 'ĐV', 'Ngày đệ trình', 'Ngày duyệt', 'Ghi chú'];
export const VT = ['Ngày', 'Vật tư', 'ĐV', 'Khối lượng', 'Nhà cung cấp', 'Có CO/CQ', 'Đã lấy mẫu TN', 'Ghi chú', 'Phiếu giao nhận', 'Kết quả TN', 'Ngày nghiệm thu'];

const bo = s => String(s ?? '').trim().toLowerCase(); // so tên vật tư không phân biệt hoa thường, khoảng trắng thừa
export const docDm = v => (v || []).slice(1).map((r, i) => ({ ten: r[0] ?? '', qc: r[1] ?? '', dv: r[2] ?? '', detrinh: r[3] ?? '', duyet: r[4] ?? '', goc: r, dong: i + 2 })).filter(d => d.ten !== '');
export const docLo = v => (v || []).slice(1).map((r, i) => ({ ngay: r[0] ?? '', ten: r[1] ?? '', dv: r[2] ?? '', kl: r[3] ?? '', ncc: r[4] ?? '', co: r[5] ?? '', mau: r[6] ?? '', phieu: r[8] ?? '', kq: r[9] ?? '', nt: r[10] ?? '', goc: r, dong: i + 2 })).filter(l => l.ten !== '');
export const ngayVn = s => iso(s) ? iso(s).split('-').reverse().join('/') : String(s);

// Việc còn thiếu của một lần vật tư về. Mỗi việc kèm các nút [chữ, cột, giá trị]; giá trị 'ngay' = hỏi ngày (mặc định hôm nay).
// Nghiệm thu chỉ mở khi hết việc khác: vật tư đã duyệt, có CO/CQ, mẫu đạt (hoặc không cần mẫu).
export function canLam(l, dm) {
  if (l.nt !== '') return []; // đã nghiệm thu hoặc đã trả lô
  const v = [], d = dm.find(x => bo(x.ten) === bo(l.ten));
  if (!d) v.push({ chu: 'Vật tư chưa có trong danh mục (chưa đệ trình)', nut: [] });
  else if (!d.duyet) v.push({ chu: 'Vật tư chưa được duyệt', nut: [] });
  if (l.co !== 'Có' && l.co !== 'Không cần') v.push({ chu: 'Chưa có CO/CQ', nut: [['Đã có CO/CQ', 'F', 'Có']] });
  if (l.mau !== 'Có' && l.mau !== 'Không cần') v.push({ chu: 'Chưa lấy mẫu thí nghiệm', nut: [['Đã lấy mẫu', 'G', 'Có'], ['Không cần mẫu', 'G', 'Không cần']] });
  else if (l.mau === 'Có' && l.kq === '') v.push({ chu: 'Chờ kết quả thí nghiệm', nut: [['Đạt', 'J', 'Đạt'], ['Không đạt', 'J', 'Không đạt']] });
  if (l.kq === 'Không đạt') v.push({ chu: 'Mẫu KHÔNG ĐẠT: không dùng lô này', nut: [['Đã trả lô', 'K', 'Trả lô']] });
  if (!v.length) v.push({ chu: 'Chưa nghiệm thu vật liệu đầu vào', nut: [['Đã nghiệm thu', 'K', 'ngay']] });
  return v;
}

export const tong = (lo, ten) => lo.filter(l => bo(l.ten) === bo(ten)).reduce((s, l) => s + (+l.kl || 0), 0);
// Số thứ tự ảnh phiếu tiếp theo trong ngày: lớn nhất đã có + 1 (file bị chuyển đi cũng không trùng tên).
export const soTiep = (goc, ten) => String(Math.max(0, ...ten.filter(n => n.startsWith(goc + '-')).map(n => +(n.slice(goc.length + 1).match(/^\d+/)?.[0] ?? 0))) + 1).padStart(2, '0');

// ---- Phần giao diện. h: các hàm dùng chung của app.js (api, ls, thuMuc, json, taiLen) và id file nhật ký ----
let h, dm = [], lo = [], dau = {}, treo = null; // dau: dòng tiêu đề từng trang (chưa có trang thì không có khóa); treo: ảnh phiếu đã tải nhưng chưa ghi được dòng
const $ = x => document.getElementById(x), ms = t => $('vtms').textContent = t || '';
const homNay = () => new Date().toLocaleDateString('sv-SE');
const sh = p => `https://sheets.googleapis.com/v4/spreadsheets/${h.id}${p}`;
const tao = (tag, chu, lop) => Object.assign(document.createElement(tag), { textContent: chu ?? '', className: lop ?? '' });

export async function moVatTu(ham) {
  h = ham; dm = []; lo = []; dau = {};
  const ct = $('ct').value; $('vt').hidden = false; $('vtcan').replaceChildren(); $('vtdm').replaceChildren(); $('vtl').replaceChildren();
  if (!$('vtd').value) $('vtd').value = homNay();
  if (!h.id) return ms('Công trình này chưa mở được file nhật ký CTxx-NK-NHATKY; vật tư được ghi trong file đó.');
  ms('Đang tải vật tư...');
  try {
    const co = (await h.api(sh('?fields=sheets.properties.title'))).sheets.map(s => s.properties.title).filter(t => t === 'VATTU' || t === 'DMVATTU');
    const v = await Promise.all(co.map(async t => (await h.api(sh(`/values/${t}?valueRenderOption=UNFORMATTED_VALUE`))).values || [])); // đọc thì không ghi: trang thiếu chỉ được tạo khi lưu
    if ($('ct').value !== ct) return;
    co.forEach((t, i) => dau[t] = v[i][0] || []);
    dm = docDm(v[co.indexOf('DMVATTU')]); lo = docLo(v[co.indexOf('VATTU')]);
    ms(); ve();
  } catch (e) { ms(e.message); }
}

function ve() {
  const can = lo.map(l => [l, canLam(l, dm)]).filter(([, v]) => v.length);
  $('vtcan').replaceChildren(...(can.length ? [tao('h3', `Cần xử lý (${can.length} lần về)`)] : lo.length ? [tao('p', 'Mọi lần vật tư về đã nghiệm thu xong.')] : []), ...can.map(([l, v]) => {
    const el = tao('div', '', 'doc'), th = tao('div'), nut = tao('div', '', 'nut');
    th.append(tao('div', `${l.ten} · ${l.kl} ${l.dv}`), tao('small', [ngayVn(l.ngay), l.ncc].filter(Boolean).join(' · ')), ...v.map(x => tao('div', '• ' + x.chu)));
    const link = String(l.phieu).split(/\s+/).filter(x => x.startsWith('https://'));
    link.forEach((u, i) => nut.append(Object.assign(tao('a', link.length > 1 ? `Phiếu ${i + 1}` : 'Phiếu', 'nutlk'), { href: u, target: '_blank', rel: 'noopener' })));
    for (const x of v) for (const [chu, cot, gt] of x.nut) nut.append(nutGhi(chu, `${chu}: ${l.ten} về ${ngayVn(l.ngay)}`, 'VATTU', l, cot, gt));
    el.append(th, nut); return el;
  }));
  $('vtdm').replaceChildren(...(dm.length ? [] : [tao('p', 'Chưa có vật tư nào trong danh mục. Thêm vật tư đầu tiên bên dưới.')]), ...dm.map(d => {
    const el = tao('div', '', 'doc'), th = tao('div'), cho = d.detrinh && !d.duyet ? -conLai(d.detrinh, homNay()) : NaN;
    const tt = d.duyet ? `Đã duyệt ${ngayVn(d.duyet)}` : d.detrinh ? `Đã đệ trình ${ngayVn(d.detrinh)}, chờ duyệt${cho > 0 ? ` ${cho} ngày` : ''}` : 'Chưa đệ trình';
    th.append(tao('div', d.ten + (d.qc ? ` · ${d.qc}` : '')), tao('small', `${tt} · Đã về ${tong(lo, d.ten).toLocaleString('vi-VN')} ${d.dv}`)); el.append(th);
    if (!d.duyet) el.append(d.detrinh ? nutGhi('Đã duyệt', 'Đã duyệt ' + d.ten, 'DMVATTU', d, 'E', 'ngay') : nutGhi('Đã đệ trình', 'Đã đệ trình ' + d.ten, 'DMVATTU', d, 'D', 'ngay'));
    return el;
  }));
  $('vtl').replaceChildren(...dm.map((d, i) => new Option(d.ten + (d.qc ? ` · ${d.qc}` : '') + (d.dv ? ` (${d.dv})` : ''), i)));
}

function nutGhi(chu, nhan, tab, x, cot, gt) {
  const b = tao('button', chu, 'phu'); b.setAttribute('aria-label', nhan);
  b.onclick = async () => { b.disabled = true; await ghi(tab, x, cot, gt); b.disabled = false; };
  return b;
}
// Ghi một ô. Trước khi ghi đọc lại cả dòng đó: khác lúc tải (sheet bị sửa, chèn dòng ở nơi khác) thì không ghi, tránh ghi nhầm lô cùng vật tư cùng ngày.
async function ghi(tab, x, cot, gt) {
  if (gt === 'ngay') {
    const s = prompt('Ngày (ngày/tháng/năm)', ngayVn(homNay()))?.trim();
    if (s === undefined) return;
    if (!iso(s)) return ms(`Ngày “${s}” không đọc được, gõ dạng 06/10/2026.`);
    gt = ngayVn(s);
  }
  try {
    const r = (await h.api(sh(`/values/${tab}!A${x.dong}:Z${x.dong}?valueRenderOption=UNFORMATTED_VALUE`))).values?.[0] || [];
    if (JSON.stringify(r) !== JSON.stringify(x.goc)) { await moVatTu(h); return ms('Sheet vật tư vừa thay đổi, đã tải lại. Bấm lại lần nữa.'); }
    await h.api(sh(`/values/${tab}!${cot}${x.dong}?valueInputOption=RAW`), { ...h.json({ values: [[gt]] }), method: 'PUT' });
    await moVatTu(h); ms(`Đã ghi: ${x.ten}.`);
  } catch (e) { ms(e.message); }
}

// Trang chưa có thì tạo; tiêu đề thiếu cột cuối (file nhật ký cũ chỉ có A..H) thì thêm, không đụng ô tiêu đề đã có.
async function damBao(t, cot) {
  if (!dau[t]) { await h.api(sh(':batchUpdate'), h.json({ requests: [{ addSheet: { properties: { title: t } } }] })); dau[t] = []; }
  if (dau[t].length < cot.length) await h.api(sh(`/values/${t}!${String.fromCharCode(65 + dau[t].length)}1?valueInputOption=RAW`), { ...h.json({ values: [cot.slice(dau[t].length)] }), method: 'PUT' });
  dau[t] = cot;
}
const them = (t, dong) => h.api(sh(`/values/${t}!A:A:append?valueInputOption=RAW&insertDataOption=OVERWRITE`), h.json({ values: [dong] })); // ghi vào dòng trống đầu tiên sau bảng, giữ định dạng ngày của cột

export async function themVatTu() {
  const ten = $('vtten').value.trim();
  if (!h?.id) return ms('Chưa mở được file nhật ký của công trình này.');
  if (!ten) return ms('Gõ tên vật tư.');
  if (dm.some(d => bo(d.ten) === bo(ten))) return ms(`“${ten}” đã có trong danh mục.`);
  try {
    await damBao('DMVATTU', DM);
    await them('DMVATTU', [ten, $('vtqc').value.trim(), $('vtdv').value.trim(), '', '', '']);
    for (const id of ['vtten', 'vtqc', 'vtdv']) $(id).value = '';
    await moVatTu(h); ms(`Đã thêm ${ten}. Khi nộp hồ sơ đệ trình, bấm “Đã đệ trình”.`);
  } catch (e) { ms(e.message); }
}

// Vật tư về: tải ảnh phiếu giao nhận lên 05_VATTU_DOITHICONG/PHIEU_GIAONHAN (tên CTxx-GN-yyyymmdd-01_TenVatTu.jpg) rồi thêm một dòng VATTU.
export async function luuVe() {
  const d = dm[$('vtl').value], kl = parseFloat($('vtk').value), ngay = $('vtd').value, anh = [...$('vtp').files], ct = $('ct').value;
  if (!h?.id) return ms('Chưa mở được file nhật ký của công trình này.');
  if (!d) return ms('Thêm vật tư vào danh mục trước (mục bên dưới).');
  if (!(kl > 0)) return ms('Nhập khối lượng lớn hơn 0.');
  if (!ngay) return ms('Chọn ngày về.');
  if (treo?.ct !== ct) treo = null;
  if (!anh.length && !treo && !confirm('Chưa có ảnh phiếu giao nhận. Vẫn lưu?')) return;
  try {
    if (anh.length) {
      ms('Đang tải ảnh phiếu...');
      const dir = await h.thuMuc(ct, '05_VATTU_DOITHICONG/PHIEU_GIAONHAN'), goc = `${$('ct').selectedOptions[0].text.split('_')[0]}-GN-${ngay.replaceAll('-', '')}`;
      const co = (await h.ls(`'${dir}' in parents and name contains '${goc}'`)).map(f => f.name), link = [];
      for (const f of anh) { const ten = tenChuan(goc, soTiep(goc, co), d.ten, f.name); co.push(ten); link.push((await h.taiLen(ten, dir, f)).webViewLink); }
      treo = { ct, link }; $('vtp').value = ''; // tải xong thì giữ link: lỗi ở bước ghi dòng, bấm Lưu lại không tải ảnh lần nữa
    }
    await damBao('VATTU', VT);
    await them('VATTU', [serial(ngay), d.ten, d.dv, kl, $('vtn').value.trim(), $('vtc').value, 'Chưa', '', treo?.link.join('\n') ?? '', '', '']);
    const so = treo?.link.length ?? 0; treo = null;
    for (const id of ['vtk', 'vtn']) $(id).value = '';
    await moVatTu(h); ms(`Đã lưu: ${d.ten} ${kl} ${d.dv} về ngày ${ngayVn(ngay)}${so ? `, ${so} ảnh phiếu` : ''}.`);
  } catch (e) { ms(e.message + (treo ? ' Ảnh phiếu đã lưu trên Drive; bấm Lưu lần về lần nữa để ghi dòng (không tải ảnh lại).' : '')); }
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('vattu.js')) { // chạy: node vattu.js
  const a = await import('node:assert/strict');
  const dm = docDm([DM, ['Xi măng PCB40', 'Hà Tiên', 'tấn', '01/10/2026', '03/10/2026'], ['Thép D10', '', 'kg', '02/10/2026', ''], []]);
  a.equal(dm.length, 2); a.equal(dm[1].dong, 3);
  const lo = docLo([VT, [46301, 'xi măng pcb40 ', 'tấn', 10, 'NCC A', 'Có', 'Chưa'], [46301, 'Thép D10', 'kg', 500, '', 'Chưa', 'Có', '', 'https://x', ''], [46301, 'Cát vàng', 'm3', 5, '', 'Có', 'Không cần'],
    [46301, 'Xi măng PCB40', 'tấn', 5, '', 'Có', 'Có', '', '', 'Đạt'], [46301, 'Xi măng PCB40', 'tấn', 5, '', 'Có', 'Có', '', '', 'Không đạt'], [46301, 'Xi măng PCB40', 'tấn', 5, '', 'Có', 'Có', '', '', 'Đạt', '06/10/2026']]);
  const chu = l => canLam(l, dm).map(x => x.chu);
  a.deepEqual(chu(lo[0]), ['Chưa lấy mẫu thí nghiệm']); // tên khác hoa thường, thừa khoảng trắng vẫn khớp danh mục
  a.deepEqual(chu(lo[1]), ['Vật tư chưa được duyệt', 'Chưa có CO/CQ', 'Chờ kết quả thí nghiệm']);
  a.deepEqual(chu(lo[2]), ['Vật tư chưa có trong danh mục (chưa đệ trình)']); // chưa đệ trình thì không cho nghiệm thu
  a.deepEqual(canLam(lo[3], dm).map(x => x.nut[0][0]), ['Đã nghiệm thu']);
  a.deepEqual(chu(lo[4]), ['Mẫu KHÔNG ĐẠT: không dùng lô này']);
  a.deepEqual(chu(lo[5]), []);
  a.equal(tong(lo, 'Xi măng PCB40'), 25); a.equal(ngayVn(46301), '06/10/2026'); a.equal(ngayVn('6/10/2026'), '06/10/2026');
  a.equal(soTiep('CT01-GN-20261006', []), '01'); a.equal(soTiep('CT01-GN-20261006', ['CT01-GN-20261006-01_A.jpg', 'CT01-GN-20261006-03_B.jpg', 'CT01-GN-20261007-09_C.jpg']), '04');
  a.equal(tenChuan('CT01-GN-20261006', '01', 'Xi măng PCB40', 'image.JPG'), 'CT01-GN-20261006-01_XiMangPcb40.jpg');
  console.log('ok');
}
