// Vật tư từ đệ trình đến nghiệm thu, ghi trong file nhật ký CTxx-NK-NHATKY của công trình (xem luong-4/tao_nhat_ky.py):
// - DMVATTU: mỗi vật tư một dòng (đệ trình, duyệt, tần suất lấy mẫu do kỹ sư tự ghi).
// - VATTU: mỗi lần vật tư về một dòng. Cột A..H giữ nguyên như file gốc (báo cáo tuần đọc theo vị trí), app chỉ thêm cột I trở đi.
//   Thí nghiệm, kết quả, xử lý tính theo LÔ (cột Mã lô): một lô có thể gồm nhiều lần về, ghi cùng giá trị lên mọi dòng của lô.
// - NGHIEMTHU: nghiệm thu vật liệu đầu vào thêm một dòng mã VATLIEU, nội dung kết thúc bằng "lô <mã>".
import { serial } from './nhatky.js';
import { iso, cong } from './viec.js';
import { tenChuan } from './register.js';

export const DM = ['Vật tư', 'Quy cách', 'ĐV', 'Ngày đệ trình', 'Ngày duyệt', 'Tần suất lấy mẫu', 'Ghi chú', 'KL dự toán'];
export const VT = ['Ngày', 'Vật tư', 'ĐV', 'Khối lượng', 'Nhà cung cấp', 'Có CO/CQ', 'Đã lấy mẫu TN', 'Ghi chú', 'Phiếu giao nhận', 'Mã lô', 'Kết quả TN (bê tông: R7)', 'Kết quả R28 (bê tông)', 'Xử lý'];
const NT = ['Ngày', 'Mã công việc', 'Nội dung nghiệm thu', 'Vị trí', 'Kết quả', 'Số biên bản', 'Ghi chú'];

const bo = s => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').trim().toLowerCase(); // so tên không phân biệt dấu, hoa thường
export const laBeTong = ten => bo(ten).includes('be tong');
export const docDm = v => (v || []).slice(1).map((r, i) => ({ ten: r[0] ?? '', qc: r[1] ?? '', dv: r[2] ?? '', detrinh: r[3] ?? '', duyet: r[4] ?? '', ts: r[5] ?? '', dt: +r[7] || 0, goc: r, dong: i + 2 })).filter(d => d.ten !== '');
const docDong = v => (v || []).slice(1).map((r, i) => ({ ngay: r[0] ?? '', ten: r[1] ?? '', dv: r[2] ?? '', kl: r[3] ?? '', ncc: r[4] ?? '', co: r[5] ?? '', mau: r[6] ?? '', phieu: r[8] ?? '', lo: String(r[9] ?? ''), kq: r[10] ?? '', r28: r[11] ?? '', xl: r[12] ?? '', goc: r, dong: i + 2 })).filter(l => l.ten !== '');
const daNt = v => new Set((v || []).slice(1).filter(r => r[1] === 'VATLIEU').map(r => / lô (\S+)$/.exec(r[2] ?? '')?.[1]).filter(Boolean));
// Gom các lần về thành lô. Dòng chưa có Mã lô (ghi tay trong sheet) là một lô riêng, mã tạm D<số dòng>, được ghi vào sheet ở lần bấm đầu tiên.
export function docLo(vVt, vNt) {
  const nt = daNt(vNt), m = new Map();
  for (const d of docDong(vVt)) { const k = d.lo || 'D' + d.dong; m.has(k) ? m.get(k).dong.push(d) : m.set(k, { ma: k, dong: [d] }); }
  return [...m.values()].map(l => { const d = l.dong[0]; return { ...l, ten: d.ten, dv: d.dv, ngay: d.ngay, mau: d.mau, kq: d.kq, r28: d.r28, xl: d.xl, kl: l.dong.reduce((s, x) => s + (+x.kl || 0), 0), co: l.dong.every(x => x.co === 'Có' || x.co === 'Không cần'), nt: nt.has(l.ma) }; });
}
export const ngayVn = s => iso(s) ? iso(s).split('-').reverse().join('/') : String(s);

// Việc còn thiếu của một lô, mỗi việc kèm nút { chu, o: {cột: giá trị} ghi lên mọi dòng của lô, viec: 'mau' | 'hong' (thêm việc nhắc), nt: nghiệm thu }.
// Không đạt: lô ghi "Cấm dùng", đứng đầu, đến khi bấm Đã xử lý. Nghiệm thu chỉ mở khi hết việc khác (đã duyệt, có CO/CQ, mẫu đạt hoặc không cần mẫu).
export function canLam(l, dm) {
  if (l.nt || l.xl === 'Đã xử lý') return [];
  const v = [], d = dm.find(x => bo(x.ten) === bo(l.ten)), bt = laBeTong(l.ten);
  const kq = (ten, cot) => [{ chu: ten + ' đạt', o: { [cot]: 'Đạt' } }, { chu: ten + ' không đạt', o: { [cot]: 'Không đạt', M: 'Cấm dùng' }, viec: 'hong' }];
  if (l.xl === 'Cấm dùng') v.push({ chu: 'KHÔNG ĐẠT, CẤM DÙNG lô này', cam: true, nut: [{ chu: 'Đã xử lý xong', o: { M: 'Đã xử lý' } }] });
  if (!d) v.push({ chu: 'Vật tư chưa có trong danh mục (chưa đệ trình)', nut: [] });
  else if (!d.duyet) v.push({ chu: 'Vật tư chưa được TVGS duyệt', nut: [] });
  if (!l.co) v.push({ chu: 'Chưa có CO/CQ', nut: [{ chu: 'Đã có CO/CQ', o: { F: 'Có' } }, { chu: 'Không cần CO/CQ', o: { F: 'Không cần' } }] });
  if (l.mau !== 'Có' && l.mau !== 'Không cần') v.push({ chu: bt ? 'Chưa đúc mẫu bê tông' : 'Chưa lấy mẫu thí nghiệm' + (d?.ts ? ` (tần suất: ${d.ts})` : ''), nut: [{ chu: bt ? 'Đã đúc mẫu' : 'Đã lấy mẫu', o: { G: 'Có' }, viec: bt ? 'mau' : '' }, { chu: 'Không cần mẫu', o: { G: 'Không cần' } }] });
  else if (l.mau === 'Có' && l.kq === '') v.push({ chu: bt ? 'Chờ kết quả nén R7' : 'Chờ kết quả thí nghiệm', nut: kq(bt ? 'R7' : 'Mẫu', 'K') });
  else if (l.mau === 'Có' && bt && l.r28 === '') v.push({ chu: 'Chờ kết quả nén R28', nut: kq('R28', 'L') });
  if (!v.length) v.push({ chu: 'Chưa nghiệm thu vật liệu đầu vào', nut: [{ chu: 'Đã nghiệm thu', nt: true }] });
  return v;
}

// Đã về so với dự toán: "19/20 tấn (95%)"; chưa nhập dự toán thì chỉ ghi số đã về.
export const soDt = (ve, dt, dv) => dt > 0 ? `${ve.toLocaleString('vi-VN')}/${dt.toLocaleString('vi-VN')} ${dv} (${Math.round(ve / dt * 100)}%)${ve > dt ? ', VƯỢT dự toán' : ''}` : `${ve.toLocaleString('vi-VN')} ${dv}`;
export const tong = (lo, ten) => lo.filter(l => bo(l.ten) === bo(ten)).reduce((s, l) => s + l.kl, 0);
// Số tiếp theo sau số lớn nhất đã có (file bị chuyển đi hay lô bị xóa cũng không trùng): ảnh phiếu "<gốc>-01", mã lô "<gốc>-1".
export const soTiep = (goc, ten, rong = 2) => String(Math.max(0, ...ten.filter(n => n.startsWith(goc + '-')).map(n => +(n.slice(goc.length + 1).match(/^\d+/)?.[0] ?? 0))) + 1).padStart(rong, '0');

// Đọc cả file (chỉ đọc, trang chưa có thì coi như trống). Dùng cho mục Vật tư và khung Còn sót.
export async function docFile(api, id) {
  const sh = `https://sheets.googleapis.com/v4/spreadsheets/${id}`;
  const co = (await api(`${sh}?fields=sheets.properties.title`)).sheets.map(s => s.properties.title).filter(t => ['VATTU', 'DMVATTU', 'NGHIEMTHU'].includes(t));
  const v = Object.fromEntries(await Promise.all(co.map(async t => [t, (await api(`${sh}/values/${t}?valueRenderOption=UNFORMATTED_VALUE`)).values || []])));
  return { dau: Object.fromEntries(co.map(t => [t, v[t][0] || []])), dm: docDm(v.DMVATTU), lo: docLo(v.VATTU, v.NGHIEMTHU) };
}
// Cho khung Còn sót: số lô cấm dùng và số lô chưa xong (bỏ qua lô chỉ còn chờ kết quả thí nghiệm, vì đó là việc của phòng thí nghiệm).
const dem = (dm, lo) => {
  const v = lo.map(l => canLam(l, dm)).filter(x => x.length);
  return { cam: v.filter(x => x[0].cam).length, can: v.filter(x => !x[0].cam && !x.every(y => y.chu.startsWith('Chờ kết quả'))).length };
};
export const demVatTu = async (api, id) => { const { dm, lo } = await docFile(api, id); return dem(dm, lo); };

// ---- Phần giao diện. h: hàm dùng chung của app.js (api, ls, thuMuc, json, taiLen, taoViec) và id file nhật ký ----
let h, dm = [], lo = [], dau = {}, treo = null; // dau: dòng tiêu đề từng trang đã có; treo: ảnh phiếu đã tải nhưng chưa ghi được dòng
const $ = x => document.getElementById(x), ms = t => $('vtms').textContent = t || '';
const homNay = () => new Date().toLocaleDateString('sv-SE'), maCt = () => $('ct').selectedOptions[0].text.split('_')[0];
const sh = p => `https://sheets.googleapis.com/v4/spreadsheets/${h.id}${p}`;
const tao = (tag, chu, lop) => Object.assign(document.createElement(tag), { textContent: chu ?? '', className: lop ?? '' });

export async function moVatTu(ham) {
  h = ham; dm = []; lo = []; dau = {};
  const ct = $('ct').value; $('vt').hidden = false; $('vtcan').replaceChildren(); $('vtdm').replaceChildren(); $('vtl').replaceChildren();
  if (!$('vtd').value) $('vtd').value = homNay();
  $('vtl').onchange = goiYLo; $('vtluu').textContent = 'Lưu lần về vào ' + maCt(); $('vtthem').textContent = 'Thêm vào danh mục ' + maCt();
  if (!h.id) return ms('Công trình này chưa mở được file nhật ký CTxx-NK-NHATKY; vật tư được ghi trong file đó.');
  ms('Đang tải vật tư...');
  try {
    const f = await docFile(h.api, h.id); // đọc thì không ghi: trang thiếu chỉ được tạo khi lưu
    if ($('ct').value !== ct) return;
    ({ dau, dm, lo } = f); ms(); ve(); h.sot?.({ vt: dem(dm, lo) }); // khung Còn sót theo kịp sau mỗi lần ghi
  } catch (e) { ms(e.message); }
}

function ve() {
  const can = lo.map(l => [l, canLam(l, dm)]).filter(([, v]) => v.length).sort(([, a], [, b]) => !!b[0].cam - !!a[0].cam); // lô cấm dùng lên đầu
  $('vtcan').replaceChildren(...(can.length ? [tao('h3', `${maCt()}: cần xử lý (${can.length} lô)`)] : lo.length ? [tao('p', 'Mọi lô vật tư đã nghiệm thu hoặc xử lý xong.')] : []), ...can.map(([l, v]) => {
    const el = tao('div', '', 'doc cot'), th = tao('div'), nut = tao('div', '', 'nut'); // nhiều nút: xếp dưới chữ cho vừa màn hình điện thoại
    th.append(tao('div', `${l.ten} · ${l.kl.toLocaleString('vi-VN')} ${l.dv}`), tao('small', `Lô ${l.ma} · ` + l.dong.map(x => [ngayVn(x.ngay), x.ncc].filter(Boolean).join(' ')).join('; ')), ...v.map(x => tao(x.cam ? 'strong' : 'div', '• ' + x.chu)));
    const link = l.dong.flatMap(x => String(x.phieu).split(/\s+/)).filter(x => x.startsWith('https://'));
    link.forEach((u, i) => nut.append(Object.assign(tao('a', link.length > 1 ? `Phiếu ${i + 1}` : 'Phiếu', 'nutlk'), { href: u, target: '_blank', rel: 'noopener' })));
    for (const x of v) for (const n of x.nut) nut.append(nutBam(n.chu, `${n.chu}: ${l.ten} lô ${l.ma}`, () => ghiLo(l, n)));
    el.append(th, nut); return el;
  }));
  $('vtdm').replaceChildren(...(dm.length ? [] : [tao('p', 'Chưa có vật tư nào trong danh mục. Thêm vật tư đầu tiên bên dưới.')]), ...dm.map(d => {
    const el = tao('div', '', 'doc'), th = tao('div'), cho = d.detrinh && !d.duyet && iso(d.detrinh) ? (Date.parse(homNay()) - Date.parse(iso(d.detrinh))) / 864e5 : 0;
    const tt = d.duyet ? `Đã duyệt ${ngayVn(d.duyet)}` : d.detrinh ? `Đã đệ trình ${ngayVn(d.detrinh)}, chờ duyệt${cho > 0 ? ` ${cho} ngày` : ''}` : 'Chưa đệ trình';
    th.append(tao('div', d.ten + (d.qc ? ` · ${d.qc}` : '')), tao('small', `${tt} · Đã về ${soDt(tong(lo, d.ten), d.dt, d.dv)}`)); el.append(th);
    if (!d.duyet) { const [chu, cot] = d.detrinh ? ['Đã duyệt', 'E'] : ['Đã đệ trình', 'D']; el.append(nutBam(chu, `${chu} ${d.ten}`, () => ghiDm(d, cot))); }
    if (!d.dt) el.append(nutBam('Nhập dự toán', 'Nhập khối lượng dự toán ' + d.ten, () => ghiDm(d, 'H')));
    return el;
  }));
  $('vtl').replaceChildren(...dm.map((d, i) => new Option(d.ten + (d.qc ? ` · ${d.qc}` : '') + (d.dv ? ` (${d.dv})` : ''), i)));
  goiYLo();
}
// Ô Mã lô gợi ý các lô chưa xong của vật tư đang chọn (về thêm cho cùng lô thì chọn lại mã đó).
function goiYLo() { const d = dm[$('vtl').value]; $('vtlos').replaceChildren(...lo.filter(l => d && bo(l.ten) === bo(d.ten) && canLam(l, dm).length).map(l => new Option(`${ngayVn(l.ngay)} · ${l.kl} ${l.dv}`, l.ma))); }

function nutBam(chu, nhan, fn) {
  const b = tao('button', chu, 'phu'); b.setAttribute('aria-label', nhan);
  b.onclick = async () => { b.disabled = true; try { await fn(); } catch (e) { ms(e.message); } b.disabled = false; };
  return b;
}
const hoiNgay = () => { // null: bỏ hoặc ngày sai (đã báo)
  const s = prompt('Ngày (ngày/tháng/năm)', ngayVn(homNay()))?.trim();
  if (s === undefined) return null;
  if (!iso(s)) { ms(`Ngày “${s}” không đọc được, gõ dạng 06/10/2026.`); return null; }
  return s;
};
// Trước khi ghi đọc lại các dòng sẽ ghi: khác lúc tải (sheet bị sửa, chèn dòng ở nơi khác) thì không ghi gì, tải lại.
async function kiem(tab, xs) {
  const r = (await h.api(sh(`/values:batchGet?valueRenderOption=UNFORMATTED_VALUE&` + xs.map(x => `ranges=${tab}!A${x.dong}:Z${x.dong}`).join('&')))).valueRanges;
  if (xs.every((x, i) => JSON.stringify(r[i].values?.[0] || []) === JSON.stringify(x.goc))) return true;
  await moVatTu(h); ms('Sheet vật tư vừa thay đổi, đã tải lại. Bấm lại lần nữa.'); return false;
}
const ghiO = data => h.api(sh('/values:batchUpdate'), h.json({ valueInputOption: 'RAW', data }));

async function ghiDm(d, cot) { // cột D, E: ngày; cột H: khối lượng dự toán
  let gt;
  if (cot === 'H') {
    const s = prompt(`Khối lượng dự toán của ${d.ten} (${d.dv})`)?.trim().replace(',', '.'); if (s === undefined) return;
    if (!((gt = parseFloat(s)) > 0)) return ms(`“${s}” không phải số lớn hơn 0.`);
    await damBao('DMVATTU', DM); // danh mục tạo trước khi có cột dự toán
  } else { const s = hoiNgay(); if (!s) return; gt = ngayVn(s); }
  if (!await kiem('DMVATTU', [d])) return;
  await ghiO([{ range: `DMVATTU!${cot}${d.dong}`, values: [[gt]] }]);
  await moVatTu(h); ms(`Đã ghi: ${d.ten}.`);
}

async function ghiLo(l, n) {
  const ngay = n.nt ? hoiNgay() : homNay(); if (!ngay) return;
  await damBao('VATTU', VT); // file nhật ký cũ chỉ có cột A..H
  if (!await kiem('VATTU', l.dong)) return;
  const o = { ...n.o, ...(l.dong.some(x => !x.lo) ? { J: l.ma } : {}) }; // lô chưa có mã thì ghi mã tạm vào sheet để nghiệm thu nối được
  if (Object.keys(o).length) await ghiO(l.dong.flatMap(x => Object.entries(o).map(([c, gt]) => ({ range: `VATTU!${c}${x.dong}`, values: [[gt]] }))));
  if (n.nt) { await damBao('NGHIEMTHU', NT); await them('NGHIEMTHU', [serial(iso(ngay)), 'VATLIEU', `Vật liệu đầu vào: ${l.ten}, lô ${l.ma}`, '', 'Đạt', '', '']); }
  let ghi = '';
  try { // việc nhắc ghi sau cùng: lỗi ở đây không làm mất kết quả đã ghi
    const ct = $('ct').selectedOptions[0].text, goc = iso(l.ngay) || homNay();
    if (n.viec === 'mau') for (const r of [7, 28]) ghi = (await h.taoViec(`Nén mẫu R${r}: ${l.ten}, lô ${l.ma}`, ct, cong(goc, r))) || ghi;
    if (n.viec === 'hong') ghi = await h.taoViec(`Xử lý lô không đạt: ${l.ten}, lô ${l.ma}`, ct, homNay());
  } catch (e) { ghi = 'Chưa thêm được việc nhắc: ' + e.message; }
  await moVatTu(h); ms(`Đã ghi: ${l.ten}, lô ${l.ma}.` + (n.viec ? ' Đã thêm việc nhắc vào Việc cần làm.' : '') + (ghi ? ' ' + ghi : ''));
}

// Trang chưa có thì tạo; tiêu đề thiếu cột cuối thì thêm vào cuối, không đụng ô tiêu đề đã có.
async function damBao(t, cot) {
  if (!dau[t]) { await h.api(sh(':batchUpdate'), h.json({ requests: [{ addSheet: { properties: { title: t } } }] })); dau[t] = []; }
  if (dau[t].length < cot.length) await h.api(sh(`/values/${t}!${String.fromCharCode(65 + dau[t].length)}1?valueInputOption=RAW`), { ...h.json({ values: [cot.slice(dau[t].length)] }), method: 'PUT' });
  dau[t] = cot;
}
const them = (t, dong) => h.api(sh(`/values/${t}!A:A:append?valueInputOption=RAW&insertDataOption=OVERWRITE`), h.json({ values: [dong] })); // chỉ thêm dòng (vào dòng trống đầu tiên sau bảng, giữ định dạng ngày của cột)

export async function themVatTu() {
  const ten = $('vtten').value.trim();
  if (!h?.id) return ms('Chưa mở được file nhật ký của công trình này.');
  if (!ten) return ms('Gõ tên vật tư.');
  if (dm.some(d => bo(d.ten) === bo(ten))) return ms(`“${ten}” đã có trong danh mục.`);
  try {
    await damBao('DMVATTU', DM);
    await them('DMVATTU', [ten, $('vtqc').value.trim(), $('vtdv').value.trim(), '', '', $('vtts').value.trim(), '', parseFloat($('vtdt').value) || '']);
    for (const id of ['vtten', 'vtqc', 'vtdv', 'vtts', 'vtdt']) $(id).value = '';
    await moVatTu(h); ms(`Đã thêm ${ten}. Khi nộp hồ sơ đệ trình, bấm “Đã đệ trình”.`);
  } catch (e) { ms(e.message); }
}

// Vật tư về: tải ảnh phiếu giao nhận lên 05_VATTU_DOITHICONG/PHIEU_GIAONHAN (tên CTxx-GN-yyyymmdd-01_TenVatTu.jpg) trước, rồi mới thêm một dòng VATTU.
export async function luuVe() {
  const d = dm[$('vtl').value], kl = parseFloat($('vtk').value), ngay = $('vtd').value, anh = [...$('vtp').files], ct = $('ct').value, ma = maCt();
  if (!h?.id) return ms('Chưa mở được file nhật ký của công trình này.');
  if (!d) return ms('Thêm vật tư vào danh mục trước (mục bên dưới).');
  if (!(kl > 0)) return ms('Nhập khối lượng lớn hơn 0.');
  if (!ngay) return ms('Chọn ngày về.');
  const maLo = $('vtlo').value.trim(), cu = lo.find(l => l.ma === maLo);
  if (cu && bo(cu.ten) !== bo(d.ten)) return ms(`Lô ${maLo} là lô ${cu.ten}, không phải ${d.ten}. Để trống ô Mã lô nếu là lô mới.`);
  if (!d.duyet && !confirm(`${d.ten} CHƯA được TVGS duyệt. Vẫn ghi nhận lần về này?`)) return;
  const khoa = anh.map(f => f.name + f.size).join('|');
  if (treo && (treo.ct !== ct || treo.khoa !== khoa)) treo = null; // đổi công trình hoặc đổi ảnh thì bỏ phần đã tải dở
  if (!anh.length && !confirm('Chưa có ảnh phiếu giao nhận. Vẫn lưu?')) return;
  try {
    if (anh.length) {
      treo ||= { ct, khoa, link: [] };
      const dir = await h.thuMuc(ct, '05_VATTU_DOITHICONG/PHIEU_GIAONHAN'), goc = `${ma}-GN-${ngay.replaceAll('-', '')}`;
      const co = (await h.ls(`'${dir}' in parents and name contains '${goc}'`)).map(f => f.name);
      for (let i = treo.link.length; i < anh.length; i++) { // ảnh đã tải ở lần bấm trước (mất sóng giữa chừng) thì không tải lại
        ms(`Đang tải ảnh phiếu ${i + 1}/${anh.length}...`);
        const ten = tenChuan(goc, soTiep(goc, co), d.ten, anh[i].name); co.push(ten);
        treo.link.push((await h.taiLen(ten, dir, anh[i])).webViewLink);
      }
    }
    await damBao('VATTU', VT);
    const ymd = 'L' + ngay.replaceAll('-', ''), loMoi = maLo || `${ymd}-` + soTiep(ymd, lo.map(l => l.ma), 1), c = cu?.dong[0]; // về thêm cho lô cũ: theo trạng thái thí nghiệm của lô
    await them('VATTU', [serial(ngay), d.ten, d.dv, kl, $('vtn').value.trim(), $('vtc').value, c?.mau || 'Chưa', '', treo?.link.join('\n') ?? '', loMoi, c?.kq ?? '', c?.r28 ?? '', c?.xl ?? '']);
    const so = treo?.link.length ?? 0; treo = null;
    for (const id of ['vtk', 'vtn', 'vtlo', 'vtp']) $(id).value = '';
    await moVatTu(h); ms(`Đã lưu: ${d.ten} ${kl} ${d.dv} về ngày ${ngayVn(ngay)}, lô ${loMoi}${so ? `, ${so} ảnh phiếu` : ''}.`);
  } catch (e) { ms(e.message + (treo?.link.length ? ` Đã tải ${treo.link.length}/${anh.length} ảnh phiếu; bấm Lưu lần nữa (không tải lại ảnh đã xong).` : ' Bấm Lưu lần nữa.')); }
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('vattu.js')) { // chạy: node vattu.js
  const a = await import('node:assert/strict');
  const dm = docDm([DM, ['Xi măng PCB40', 'Hà Tiên', 'tấn', '01/10/2026', '03/10/2026', '50 tấn/1 tổ mẫu'], ['Thép D10', '', 'kg', '02/10/2026', ''], ['Bê tông M250', '', 'm3', '', '01/10/2026'], []]);
  a.equal(dm.length, 3); a.equal(dm[1].dong, 3);
  const vt = [VT,
    [46301, 'xi măng pcb40 ', 'tấn', 10, 'NCC A', 'Có', 'Chưa'], // lô tạm D2
    [46301, 'Thép D10', 'kg', 500, '', 'Chưa', 'Có', '', 'https://x', 'L1', ''],
    [46302, 'Thép D10', 'kg', 300, '', 'Có', 'Có', '', '', 'L1', ''], // cùng lô L1: cộng khối lượng, CO/CQ phải đủ mọi chuyến
    [46301, 'Cát vàng', 'm3', 5, '', 'Có', 'Không cần', '', '', 'L2'],
    [46301, 'Xi măng PCB40', 'tấn', 5, '', 'Có', 'Có', '', '', 'L3', 'Đạt'],
    [46301, 'Xi măng PCB40', 'tấn', 5, '', 'Có', 'Có', '', '', 'L4', 'Không đạt', '', 'Cấm dùng'],
    [46301, 'Xi măng PCB40', 'tấn', 5, '', 'Có', 'Có', '', '', 'L5', 'Đạt'],
    [46301, 'Bê tông M250', 'm3', 12, '', 'Có', 'Có', '', '', 'L6', 'Đạt'],
    [46301, 'Xi măng PCB40', 'tấn', 5, '', 'Có', 'Có', '', '', 'L7', 'Không đạt', '', 'Đã xử lý']];
  const lo = docLo(vt, [NT, [46302, 'VATLIEU', 'Vật liệu đầu vào: Xi măng PCB40, lô L5', '', 'Đạt'], [46302, 'HM1-1', 'lô L3']]);
  const chu = i => canLam(lo[i], dm).map(x => x.chu);
  a.deepEqual(lo.map(l => l.ma), ['D2', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']);
  a.deepEqual(chu(0), ['Chưa lấy mẫu thí nghiệm (tần suất: 50 tấn/1 tổ mẫu)']); // tên khác hoa thường, dấu cách vẫn khớp danh mục
  a.equal(lo[1].kl, 800); a.equal(lo[1].co, false);
  a.deepEqual(chu(1), ['Vật tư chưa được TVGS duyệt', 'Chưa có CO/CQ', 'Chờ kết quả thí nghiệm']);
  a.deepEqual(chu(2), ['Vật tư chưa có trong danh mục (chưa đệ trình)']); // chưa đệ trình thì không cho nghiệm thu
  a.ok(canLam(lo[3], dm)[0].nut[0].nt); // L3: dòng NGHIEMTHU không phải mã VATLIEU thì không tính
  a.deepEqual(chu(4), ['KHÔNG ĐẠT, CẤM DÙNG lô này']); a.ok(canLam(lo[4], dm)[0].cam);
  a.deepEqual(chu(5), []); a.deepEqual(chu(7), []);
  a.deepEqual(chu(6), ['Chờ kết quả nén R28']); a.deepEqual(canLam(lo[6], dm)[0].nut[1].o, { L: 'Không đạt', M: 'Cấm dùng' });
  a.equal(canLam({ ...lo[6], mau: 'Chưa', kq: '' }, dm)[0].nut[0].viec, 'mau'); // đúc mẫu bê tông: thêm việc nén R7, R28
  a.equal(tong(lo, 'Xi măng PCB40'), 30); a.equal(ngayVn(46301), '06/10/2026'); a.equal(ngayVn('6/10/2026'), '06/10/2026');
  a.equal(soDt(19, 20, 'tấn'), '19/20 tấn (95%)'); a.equal(soDt(21, 20, 'tấn'), '21/20 tấn (105%), VƯỢT dự toán'); a.equal(soDt(5, 0, 'm3'), '5 m3');
  a.equal(soTiep('CT01-GN-20261006', []), '01'); a.equal(soTiep('CT01-GN-20261006', ['CT01-GN-20261006-01_A.jpg', 'CT01-GN-20261006-03_B.jpg', 'CT01-GN-20261007-09_C.jpg']), '04');
  a.equal(soTiep('L20261006', ['L20261006-1', 'L20261006-2', 'D5'], 1), '3');
  a.equal(tenChuan('CT01-GN-20261006', '01', 'Xi măng PCB40', 'image.JPG'), 'CT01-GN-20261006-01_XiMangPcb40.jpg');
  console.log('ok');
}
