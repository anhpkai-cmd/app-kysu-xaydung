// Vật tư từ đệ trình đến nghiệm thu, ghi trong file nhật ký CTxx-NK-NHATKY của công trình (xem luong-4/tao_nhat_ky.py):
// - DMVATTU: mỗi vật tư một dòng (đệ trình, duyệt, tần suất lấy mẫu do kỹ sư tự ghi).
// - VATTU: mỗi lần vật tư về một dòng. Cột A..H giữ nguyên như file gốc (báo cáo tuần đọc theo vị trí), app chỉ thêm cột I trở đi.
//   Thí nghiệm, kết quả, xử lý tính theo LÔ (cột Mã lô): một lô có thể gồm nhiều lần về, ghi cùng giá trị lên mọi dòng của lô.
// - NGHIEMTHU: nghiệm thu vật liệu đầu vào thêm một dòng mã VATLIEU, nội dung kết thúc bằng "lô <mã>".
import { serial } from './nhatky.js';
import { iso, cong, conLai, nhan } from './viec.js';
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
// Số gõ kiểu Việt Nam: "12.500" = 12500 (dấu chấm ngăn nghìn), "15,5" = 15,5. Không chắc thì NaN để hỏi lại, không đoán.
export const soVn = s => {
  s = String(s ?? '').trim().replace(/\s/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return +s.replace(/\./g, '').replace(',', '.');
  if (/^\d+(,\d+)?$/.test(s)) return +s.replace(',', '.');
  return /^\d+\.\d{1,2}$/.test(s) ? +s : NaN; // "12.5" (bàn phím số của máy) vẫn là 12,5; "12.500" đã xử lý ở trên
};
export const ngayVn = s => iso(s) ? iso(s).split('-').reverse().join('/') : String(s);

// Việc còn thiếu của một lô, mỗi việc kèm nút { chu, o: {cột: giá trị} ghi lên mọi dòng của lô, viec: 'mau' | 'hong' (thêm việc nhắc), nt: nghiệm thu }.
// Không đạt: lô ghi "Cấm dùng" (bê tông đã đổ rồi thì không cấm được: R28 không đạt ghi "Báo TVGS, khoan lõi"; R7 không đạt chỉ cảnh báo, R28 mới là kết luận),
// thêm việc nhắc, đứng đầu đến khi bấm Đã xử lý. Nghiệm thu chỉ mở khi hết việc khác (đã duyệt, có CO/CQ, mẫu đạt hoặc không cần mẫu).
export function canLam(l, dm) {
  if (l.nt || l.xl === 'Đã xử lý') return [];
  const v = [], d = dm.find(x => bo(x.ten) === bo(l.ten)), bt = laBeTong(l.ten);
  const kq = (ten, cot, xl) => [{ chu: ten + ' đạt', o: { [cot]: 'Đạt' } }, { chu: ten + ' không đạt', o: { [cot]: 'Không đạt', ...(xl && { M: xl }) }, viec: xl && 'hong' }];
  if (l.xl) v.push({ chu: l.xl === 'Cấm dùng' ? 'KHÔNG ĐẠT, CẤM DÙNG lô này' : 'R28 KHÔNG ĐẠT: báo TVGS, khoan lõi kiểm định', cam: true, nut: [{ chu: 'Đã xử lý xong', o: { M: 'Đã xử lý' } }] });
  if (bt && l.kq === 'Không đạt' && l.r28 === '') v.push({ chu: 'R7 không đạt: theo dõi kỹ, chờ R28 để kết luận', nut: [] });
  if (!d) v.push({ chu: 'Vật tư chưa có trong danh mục (chưa đệ trình)', nut: [] });
  else if (!d.duyet) v.push({ chu: 'Vật tư chưa được TVGS duyệt', nut: [] });
  if (!l.co) v.push({ chu: 'Chưa có CO/CQ', nut: [{ chu: 'Đã có CO/CQ', o: { F: 'Có' } }, { chu: 'Không cần CO/CQ', o: { F: 'Không cần' } }] });
  if (l.mau !== 'Có' && l.mau !== 'Không cần') v.push({ chu: bt ? 'Chưa đúc mẫu bê tông' : 'Chưa lấy mẫu thí nghiệm' + (d?.ts ? ` (tần suất: ${d.ts})` : ''), nut: [{ chu: bt ? 'Đã đúc mẫu' : 'Đã lấy mẫu', o: { G: 'Có' }, viec: bt ? 'mau' : '' }, { chu: 'Không cần mẫu', o: { G: 'Không cần' } }] });
  else if (l.mau === 'Có' && l.kq === '') v.push({ chu: bt ? 'Chờ kết quả nén R7' : 'Chờ kết quả thí nghiệm', nut: kq(bt ? 'R7' : 'Mẫu', 'K', bt ? '' : 'Cấm dùng') });
  else if (l.mau === 'Có' && bt && l.r28 === '') v.push({ chu: 'Chờ kết quả nén R28', nut: kq('R28', 'L', 'Báo TVGS, khoan lõi') });
  if (!v.length) v.push({ chu: 'Chưa nghiệm thu vật liệu đầu vào', nut: [{ chu: 'Đã nghiệm thu', nt: true }] });
  return v;
}

// Đã về so với dự toán: "19/20 tấn (95%)"; chưa nhập dự toán thì chỉ ghi số đã về.
export const soDt = (ve, dt, dv) => dt > 0 ? `${ve.toLocaleString('vi-VN')}/${dt.toLocaleString('vi-VN')} ${dv} (${Math.round(ve / dt * 100)}%)${ve > dt ? ', VƯỢT dự toán' : ''}` : `${ve.toLocaleString('vi-VN')} ${dv}`;
export const tong = (lo, ten) => lo.filter(l => bo(l.ten) === bo(ten)).reduce((s, l) => s + l.kl, 0);
// Số tiếp theo sau số lớn nhất đã có (file bị chuyển đi hay lô bị xóa cũng không trùng): ảnh phiếu "<gốc>-01", mã lô "<gốc>-1".
export const soTiep = (goc, ten, rong = 2) => String(Math.max(0, ...ten.filter(n => n.startsWith(goc + '-')).map(n => +(n.slice(goc.length + 1).match(/^\d+/)?.[0] ?? 0))) + 1).padStart(rong, '0');

// Lịch nghiệm thu tự sinh từ trang DANHMUC (tiến độ đã trình: cột F Kết thúc KH, G Lũy kế thực hiện): công việc sắp kết thúc trong `toi` ngày
// hoặc đã quá ngày (tối đa 30 ngày: công trình đang làm dở có nhiều việc đã nghiệm thu trên giấy, không ghi vào app) mà trang NGHIEMTHU chưa có dòng mã đó với Kết quả "Đạt". Mã chung (CHUNG, ATLD, VATLIEU) không có nghiệm thu công việc.
export function lichNt(cv, nt, hom, toi = 14) {
  const xong = new Set((nt || []).slice(1).filter(r => r[4] === 'Đạt').map(r => r[1]));
  return (cv || []).slice(1).filter(r => r[0] && !['CHUNG', 'ATLD', 'VATLIEU'].includes(r[0]) && !xong.has(r[0]) && iso(r[5] ?? ''))
    .map(r => ({ ma: r[0], ten: r[1] ?? '', kt: iso(r[5]), luyke: +r[6] || 0, n: conLai(r[5], hom) })).filter(x => x.n <= toi && x.n >= -30).sort((a, b) => a.n - b.n);
}
// Giấy tờ, số liệu còn thiếu trước buổi nghiệm thu (app tự kiểm được). ponytail: chưa soát ảnh, bản vẽ theo hạng mục; muốn soát thì đọc tên ảnh 09_HINHANH (có mã hạng mục).
export const thieuNt = (x, lo, dm) => [
  ...(x.luyke > 0 ? [] : ['Chưa có khối lượng thực hiện trong nhật ký']),
  ...(n => n ? [`Có ${n} lô vật tư KHÔNG ĐẠT chưa xử lý (xem mục Vật tư)`] : [])(lo.filter(l => canLam(l, dm)[0]?.cam).length),
];
const homNay = () => new Date().toLocaleDateString('sv-SE');

// Phiếu yêu cầu vật tư. Gợi ý: công việc bắt đầu trong 7 ngày tới (theo tiến độ) và phần còn thiếu so với dự toán (dự toán trừ đã về).
export const tuanToi = (cv, hom) => (cv || []).slice(1).filter(r => r[0] && iso(r[4] ?? '') && (n => n >= 0 && n <= 7)(conLai(r[4], hom))).map(r => `${r[1]} (${ngayVn(r[4])})`);
export const conThieu = (d, lo) => d.dt > 0 ? Math.max(0, Math.round((d.dt - tong(lo, d.ten)) * 1000) / 1000) : 0;
// Tin nhắn Zalo kèm link phiếu.
export const tinPhieu = (so, ct, ds, link) => [`PHIẾU YÊU CẦU VẬT TƯ số ${so}`, `Công trình: ${ct}`, ...ds.map((x, i) => `${i + 1}. ${x.ten}${x.qc ? ' ' + x.qc : ''}: ${x.sl.toLocaleString('vi-VN')} ${x.dv}, cần ngày ${ngayVn(x.can)}${x.gc ? ' (' + x.gc + ')' : ''}`), `Phiếu: ${link}`].join('\n');
// Mẫu đề xuất (app tạo một lần trong MAUBIEU_CONGTY, anh sửa trực tiếp trong Trang tính: thêm logo, đổi người nhận). Bảng vật tư chèn dưới dòng có ô "STT".
// Thông tin công ty chỉ có tên và số điện thoại (kho mã công khai: không ghi mã số thuế, tài khoản).
export const MAU_YC = 'PHIEU-YEU-CAU-VAT-TU';
const MAU_YC_DONG = [['CÔNG TY CỔ PHẦN ĐẦU TƯ XÂY DỰNG HẠ TẦNG 889', '', '', '', '', 'Số: {{Số phiếu}}'], ['Điện thoại: 0911472472', '', '', '', '', '{{Ngày dài}}'], ['Công trình: {{Công trình}}'], [],
  ['PHIẾU YÊU CẦU VẬT TƯ'], ['Kính gửi: Bộ phận Vật tư công ty. Đồng gửi: Chỉ huy trưởng công trường.'], ['Ban chỉ huy công trường đề nghị cung cấp các vật tư sau:'],
  ['STT', 'Tên vật tư', 'Quy cách', 'ĐV', 'Số lượng', 'Ngày cần', 'Ghi chú'], [], ['Người yêu cầu', '', '', 'Chỉ huy trưởng', '', 'Bộ phận Vật tư'], ['(ký, ghi rõ họ tên)', '', '', '(ký, ghi rõ họ tên)', '', '(ký, ghi rõ họ tên)']];

// Đọc cả file (chỉ đọc, trang chưa có thì coi như trống). Dùng cho mục Vật tư và khung Còn sót.
export async function docFile(api, id) {
  const sh = `https://sheets.googleapis.com/v4/spreadsheets/${id}`;
  const co = (await api(`${sh}?fields=sheets.properties.title`)).sheets.map(s => s.properties.title).filter(t => ['VATTU', 'DMVATTU', 'NGHIEMTHU', 'DANHMUC'].includes(t));
  const v = Object.fromEntries(await Promise.all(co.map(async t => [t, (await api(`${sh}/values/${t}?valueRenderOption=UNFORMATTED_VALUE`)).values || []])));
  return { dau: Object.fromEntries(co.map(t => [t, v[t][0] || []])), dm: docDm(v.DMVATTU), lo: docLo(v.VATTU, v.NGHIEMTHU), lich: lichNt(v.DANHMUC, v.NGHIEMTHU, homNay()), cv: v.DANHMUC || [] };
}
// Cho khung Còn sót: số lô cấm dùng và số lô chưa xong (bỏ qua lô chỉ còn chờ kết quả thí nghiệm, vì đó là việc của phòng thí nghiệm).
export const chuY = (dm, lo) => lo.map(l => ({ l, c: canLam(l, dm) })).filter(x => x.c.length && (x.c[0].cam || !x.c.every(y => y.chu.startsWith('Chờ kết quả')))); // lô cần chú ý: cấm dùng hoặc chưa xong thủ tục; dem đếm, sổ bàn giao liệt kê
export const viecMoi = x => `Mời TVGS nghiệm thu: ${x.ten} (${x.ma})`; // tên việc nhắc mời TVGS (do nút Nhắc tôi tạo)
let locM = false; // mục Lịch nghiệm thu chỉ hiện các dòng chưa có việc mời TVGS (từ thẻ Trang chủ)
export const locNtMoi = v => { locM = v; if (lich.length) ve(); };
export const dem = (dm, lo, lich) => { const v = chuY(dm, lo); return { tiep: lich.find(x => x.n >= 0)?.kt || '', moi: lich.filter(x => x.n >= 0 && x.n <= 2).map(viecMoi), nt: lich.filter(x => x.n <= 2).length, cam: v.filter(x => x.c[0].cam).length, can: v.filter(x => !x.c[0].cam).length }; };
export const demVatTu = async (api, id) => { const { dm, lo, lich } = await docFile(api, id); return dem(dm, lo, lich); };

// ---- Phần giao diện. h: hàm dùng chung của app.js (api, ls, thuMuc, json, taiLen, taoViec) và id file nhật ký ----
let h, dm = [], lo = [], lich = [], cv = [], phieu = [], dau = {}, treo = null; // dau: dòng tiêu đề từng trang đã có; treo: ảnh phiếu đã tải nhưng chưa ghi được dòng
const $ = x => document.getElementById(x), ms = t => $('vtms').textContent = t || '';
const maCt = () => $('ct').selectedOptions[0].text.split('_')[0];
const sh = p => `https://sheets.googleapis.com/v4/spreadsheets/${h.id}${p}`;
const tao = (tag, chu, lop) => Object.assign(document.createElement(tag), { textContent: chu ?? '', className: lop ?? '' });

export async function moVatTu(ham) {
  h = ham; dm = []; lo = []; lich = []; dau = {}; $('ntl').hidden = false; $('ntds').replaceChildren();
  const ct = $('ct').value; $('vt').hidden = false; $('vtcan').replaceChildren(); $('vtdm').replaceChildren(); $('vtl').replaceChildren();
  if (!$('vtd').value) $('vtd').value = homNay();
  $('vtl').onchange = goiYLo; $('vtluu').textContent = 'Lưu lần về vào ' + maCt(); $('vtthem').textContent = 'Thêm vào danh mục ' + maCt();
  if (!h.id) return ms('Công trình này chưa mở được file nhật ký CTxx-NK-NHATKY; vật tư được ghi trong file đó.');
  ms('Đang tải vật tư...');
  try {
    const f = await docFile(h.api, h.id); // đọc thì không ghi: trang thiếu chỉ được tạo khi lưu
    if ($('ct').value !== ct) return;
    ({ dau, dm, lo, lich, cv } = f); ms(); ve(); h.sot?.({ vt: dem(dm, lo, lich) }); // khung Còn sót theo kịp sau mỗi lần ghi
  } catch (e) { ms(e.message); }
}

function ve() {
  const cc = chuY(dm, lo).sort((a, b) => !!b.c[0].cam - !!a.c[0].cam).map(x => [x.l, x.c]); // lô cấm dùng lên đầu; đúng các lô thẻ Trang chủ đếm
  const khac = lo.map(l => [l, canLam(l, dm)]).filter(([l, v]) => v.length && !cc.some(([k]) => k === l)); // chỉ còn chờ kết quả thí nghiệm: việc của phòng thí nghiệm
  const dongLo = ([l, v]) => {
    const el = tao('div', '', 'doc cot'), th = tao('div'), nut = tao('div', '', 'nut'); // nhiều nút: xếp dưới chữ cho vừa màn hình điện thoại
    th.append(tao('div', `${l.ten} · ${l.kl.toLocaleString('vi-VN')} ${l.dv}`), tao('small', `Lô ${l.ma} · ` + l.dong.map(x => [ngayVn(x.ngay), x.ncc].filter(Boolean).join(' ')).join('; ')), ...v.map(x => { const d = tao('div'); d.append(x.cam ? tao('strong', '• ' + x.chu) : '• ' + x.chu); return d; })); // chữ đậm cũng xuống dòng riêng, không dính dòng ngày về
    const link = l.dong.flatMap(x => String(x.phieu).split(/\s+/)).filter(x => x.startsWith('https://'));
    link.forEach((u, i) => nut.append(Object.assign(tao('a', link.length > 1 ? `Phiếu ${i + 1}` : 'Phiếu', 'nutlk'), { href: u, target: '_blank', rel: 'noopener' })));
    for (const x of v) for (const n of x.nut) nut.append(nutBam(n.chu, `${n.chu}: ${l.ten} lô ${l.ma}`, () => ghiLo(l, n)));
    el.append(th, nut); return el;
  };
  $('vtcan').replaceChildren(...(cc.length ? [tao('h3', `${maCt()}: cần xử lý (${cc.length} lô)`)] : lo.length ? [tao('p', 'Mọi lô vật tư đã nghiệm thu hoặc xử lý xong.')] : []), ...cc.map(dongLo), ...(khac.length ? [tao('h3', `Các lô khác (${khac.length} lô, chờ kết quả thí nghiệm)`)] : []), ...khac.map(dongLo));
  $('vtdm').replaceChildren(...(dm.length ? [] : [tao('p', 'Chưa có vật tư nào trong danh mục. Thêm vật tư đầu tiên bên dưới.')]), ...dm.map(d => {
    const el = tao('div', '', 'doc cot'), th = tao('div'), nut = tao('div', '', 'nut'), cho = d.detrinh && !d.duyet && iso(d.detrinh) ? (Date.parse(homNay()) - Date.parse(iso(d.detrinh))) / 864e5 : 0;
    const tt = d.duyet ? `Đã duyệt ${ngayVn(d.duyet)}` : d.detrinh ? `Đã đệ trình ${ngayVn(d.detrinh)}, chờ duyệt${cho > 0 ? ` ${cho} ngày` : ''}` : 'Chưa đệ trình';
    th.append(tao('div', d.ten + (d.qc ? ` · ${d.qc}` : '')), tao('small', `${tt} · Đã về ${soDt(tong(lo, d.ten), d.dt, d.dv)}`)); el.append(th, nut); // tên trên, nút dưới: khỏi bị ép hẹp trên điện thoại
    if (!d.duyet) { const [chu, cot] = d.detrinh ? ['Đã duyệt', 'E'] : ['Đã đệ trình', 'D']; nut.append(nutBam(chu, `${chu} ${d.ten}`, () => ghiDm(d, cot))); }
    nut.append(nutBam(d.dt ? 'Sửa dự toán' : 'Nhập dự toán', 'Khối lượng dự toán ' + d.ten, () => ghiDm(d, 'H')));
    return el;
  }));
  const chuaMoi = x => x.n >= 0 && x.n <= 2 && !h.daMoi?.(viecMoi(x)), hien = locM ? lich.filter(chuaMoi) : lich;
  $('ntds').replaceChildren(...(locM ? [Object.assign(tao('p', `Chưa mời TVGS: ${hien.length} / ${lich.length} lịch `), {}, ).appendChild(Object.assign(tao('button', 'Xem tất cả lịch'), { onclick: () => locNtMoi(false) })).parentNode] : []), ...(lich.length ? [] : [tao('p', 'Không có công việc nào cần nghiệm thu trong 14 ngày tới (theo ngày kết thúc trong trang DANHMUC của file nhật ký).')]), ...hien.map(x => {
    const el = tao('div', '', 'doc cot'), th = tao('div'), nut = tao('div', '', 'nut'), viec = `Nghiệm thu: ${x.ten} (${x.ma})`;
    th.append(tao('div', x.ten), ...(chuaMoi(x) ? [tao('div', '', '').appendChild(tao('strong', 'Chưa có việc mời TVGS')).parentNode] : []), tao('small', `${x.ma} · kết thúc theo tiến độ ${ngayVn(x.kt)} · ${nhan(x.n)}`), ...thieuNt(x, lo, dm).map(t => tao('div', '• ' + t)));
    if (!h.coViec?.(viec)) nut.append(nutBam('Nhắc tôi', 'Nhắc nghiệm thu ' + x.ten, async () => { // kèm việc mời TVGS trước 1 ngày: bước hay quên nhất
      const tenCt = $('ct').selectedOptions[0].text, g1 = await h.taoViec(`Mời TVGS nghiệm thu: ${x.ten} (${x.ma})`, tenCt, x.n > 1 ? cong(x.kt, -1) : homNay()), g = (await h.taoViec(viec, tenCt, x.n > 0 ? x.kt : homNay())) || g1;
      await moVatTu(h); ms(g || `Đã thêm 2 việc: mời TVGS trước 1 ngày và “${viec}”. Google Lịch sẽ nhắc.`);
    }));
    nut.append(nutBam('Mời TVGS', 'Gửi lời mời TVGS nghiệm thu ' + x.ten, () => moiTvgs(x)));
    nut.append(nutBam('Đã nghiệm thu', 'Đã nghiệm thu ' + x.ten, () => ghiNt(x)));
    el.append(th, nut); return el;
  }));
  const tt = tuanToi(cv, homNay());
  $('ycgy').textContent = tt.length ? 'Tuần tới bắt đầu theo tiến độ: ' + tt.join('; ') + '.' : '';
  $('ycl').replaceChildren(...dm.map(d => { // mỗi vật tư một dòng: đánh dấu, số lượng, đơn vị (sửa được, ví dụ đặt thép theo cây thay vì kg)
    const el = tao('div', '', 'doc cot'), nhan = tao('label'), chon = tao('input'), sl = tao('input'), dv = tao('input'), thieu = conThieu(d, lo), v = tao('div', '', 'ycv');
    chon.type = 'checkbox'; nhan.append(chon, ' ' + d.ten + (d.qc ? ` · ${d.qc}` : '') + (thieu ? ` (còn thiếu ${thieu.toLocaleString('vi-VN')} ${d.dv})` : ''));
    sl.inputMode = 'decimal'; sl.placeholder = 'Số lượng'; sl.setAttribute('aria-label', 'Số lượng ' + d.ten);
    dv.value = d.dv; dv.placeholder = 'Đơn vị'; dv.setAttribute('list', 'ycdvs'); dv.setAttribute('aria-label', 'Đơn vị ' + d.ten);
    chon.onchange = () => { if (chon.checked && !sl.value && thieu) sl.value = thieu.toLocaleString('vi-VN'); };
    sl.oninput = () => { chon.checked = sl.value.trim() !== ''; sl.removeAttribute('aria-invalid'); };
    el.yc = () => chon.checked && { d, o: sl, sl: sl.value, dv: dv.value.trim(), xoa: () => { chon.checked = false; sl.value = ''; dv.value = d.dv; } };
    v.append(sl, dv); el.append(nhan, v); return el;
  }));
  veYc();
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
    const s = prompt(`Khối lượng dự toán của ${d.ten} (${d.dv}). Ví dụ 12.500 hoặc 15,5`, d.dt ? d.dt.toLocaleString('vi-VN') : ''); if (s === null) return;
    if (!((gt = soVn(s)) > 0)) return ms(`“${s}” không đọc được thành số lớn hơn 0. Ví dụ 12.500 hoặc 15,5.`);
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
    if (n.viec === 'hong') ghi = await h.taoViec(`${laBeTong(l.ten) ? 'Báo TVGS, khoan lõi kiểm định' : 'Xử lý lô không đạt'}: ${l.ten}, lô ${l.ma}`, ct, homNay());
  } catch (e) { ghi = 'Chưa thêm được việc nhắc: ' + e.message; }
  await moVatTu(h); ms(`Đã ghi: ${l.ten}, lô ${l.ma}.` + (n.viec ? ' Đã thêm việc nhắc vào Việc cần làm.' : '') + (ghi ? ' ' + ghi : ''));
}

export function veYc() {
  $('ycds').replaceChildren(...phieu.map((x, i) => {
    const el = tao('div', '', 'doc'), b = tao('button', 'Bỏ', 'phu'); b.setAttribute('aria-label', 'Bỏ ' + x.ten + ' khỏi phiếu');
    b.onclick = () => { phieu.splice(i, 1); veYc(); };
    el.append(tao('span', `${i + 1}. ${x.ten} · ${x.sl.toLocaleString('vi-VN')} ${x.dv} · cần ${ngayVn(x.can)}`), b); return el;
  }));
  $('ycgui').textContent = `Lập phiếu (${phieu.length} vật tư) và gửi`;
}
export function themYc() {
  const ds = [...$('ycl').children].map(el => el.yc()).filter(Boolean), can = $('ycd').value;
  if (!ds.length) return ms(dm.length ? 'Đánh dấu ít nhất một vật tư.' : 'Thêm vật tư vào danh mục trước.');
  const sai = ds.find(x => !(soVn(x.sl) > 0)); if (sai) return sai.o.setAttribute('aria-invalid', 'true'), sai.o.focus(), ms(sai.sl.trim() ? `Số lượng ${sai.d.ten} “${sai.sl}” không đọc được. Ví dụ 12.500 hoặc 15,5.` : `Ghi số lượng cho ${sai.d.ten}.`);
  const thieuDv = ds.find(x => !x.dv); if (thieuDv) return ms(`Ghi đơn vị cho ${thieuDv.d.ten}.`);
  if (!can) return ms('Chọn ngày cần vật tư về.');
  for (const x of ds) { phieu.push({ ten: x.d.ten, qc: x.d.qc, dv: x.dv, sl: soVn(x.sl), can, gc: $('ycgc').value.trim() }); x.xoa(); }
  $('ycgc').value = ''; ms(); veYc();
}
// Lập phiếu từ mẫu (dùng chung cách điền mẫu của Văn bản gửi đi), chèn bảng vật tư, gửi link qua Zalo, thêm việc "<vật tư> về" theo ngày cần.
export async function lapYc() {
  if (!h?.id) return ms('Chưa mở được file nhật ký của công trình này.');
  if (!phieu.length) return ms('Thêm ít nhất một vật tư vào phiếu.');
  const ct = $('ct').value, tenCt = $('ct').selectedOptions[0].text, ds = [...phieu]; // tenCt: tên thư mục (việc cần làm lọc theo nó); ten: tên công trình thật ghi trên phiếu
  let ten = h.tenCt();
  if (ten === '(tên công trình)') { if (!confirm(`Trang Thông tin chưa có dòng "Tên công trình", phiếu sẽ ghi "${tenCt}". Vẫn lập phiếu?`)) return; ten = tenCt; }
  ms('Đang lập phiếu...');
  const goc = await h.thuMucMau(), mau = (await h.dsMau(goc)).find(f => f.name.startsWith(MAU_YC)) || await taoMauYc(goc);
  const dir = await h.thuMuc(ct, '05_VATTU_DOITHICONG/PHIEU_YEUCAU'), so = `${maCt()}-YC-VT-${homNay().replaceAll('-', '')}`;
  const ma = `${so}-${soTiep(so, (await h.ls(`'${dir}' in parents and name contains '${so}'`)).map(f => f.name))}`;
  const f = await h.lapMau(mau, ma + '_PhieuYeuCauVatTu', dir);
  const sh2 = `https://sheets.googleapis.com/v4/spreadsheets/${f.id}`, tab = (await h.api(`${sh2}?fields=sheets.properties`)).sheets[0].properties;
  const v = (await h.api(`${sh2}/values/'${tab.title}'!A1:A60`)).values || [], stt = v.findIndex(r => String(r[0] ?? '').trim().toUpperCase() === 'STT');
  if (stt < 0) throw new Error(`Mẫu ${mau.name} thiếu dòng tiêu đề bảng có ô "STT" ở cột A.`);
  await h.api(`${sh2}:batchUpdate`, h.json({ requests: [{ insertDimension: { range: { sheetId: tab.sheetId, dimension: 'ROWS', startIndex: stt + 1, endIndex: stt + 1 + ds.length }, inheritFromBefore: true } },
    ...[['Số phiếu', ma], ['Công trình', ten]].map(([t, gt]) => ({ findReplace: { find: `{{${t}}}`, replacement: gt, allSheets: true } }))] }));
  await h.api(`${sh2}/values/'${tab.title}'!A${stt + 2}?valueInputOption=RAW`, { ...h.json({ values: ds.map((x, i) => [i + 1, x.ten, x.qc, x.dv, x.sl, ngayVn(x.can), x.gc]) }), method: 'PUT' });
  phieu = []; veYc();
  let ghi = '';
  for (const x of ds) try { ghi = (await h.taoViec(`${x.ten} về (phiếu ${ma})`, tenCt, x.can)) || ghi; } catch (e) { ghi = 'Chưa thêm được việc nhắc: ' + e.message; }
  const thieu = f.thieu.filter(t => !['{{Số phiếu}}', '{{Công trình}}'].includes(t));
  ms(`Đã lập ${ma} trong 05_VATTU_DOITHICONG/PHIEU_YEUCAU, đã thêm việc nhắc vật tư về theo ngày cần.` + (thieu.length ? ` Mẫu còn chỗ chưa điền: ${thieu.join(', ')}.` : '') + (ghi ? ' ' + ghi : ''));
  if (!confirm(`Gửi phiếu ${ma}?\nBất kỳ ai có link đều xem được phiếu này.`)) return;
  await h.api(`https://www.googleapis.com/drive/v3/files/${f.id}/permissions`, h.json({ role: 'reader', type: 'anyone' }));
  const tin = tinPhieu(ma, ten, ds, f.webViewLink);
  try { if (navigator.share) await navigator.share({ title: ma, text: tin }); else { await navigator.clipboard.writeText(tin); ms(`Đã chép nội dung phiếu ${ma}, dán vào Zalo để gửi.`); } } catch (e) { if (e.name !== 'AbortError') ms(`Phiếu ${ma} đã lập nhưng máy không cho chia sẻ (${e.message}). Link phiếu: ${f.webViewLink}`); }
}
async function taoMauYc(goc) { // tạo mẫu đề xuất một lần; từ lần sau dùng mẫu (anh có thể đã sửa) trong MAUBIEU_CONGTY
  const t = await h.api('https://sheets.googleapis.com/v4/spreadsheets', h.json({ properties: { title: MAU_YC }, sheets: [{ properties: { title: 'PHIEU' },
    data: [{ startRow: 0, startColumn: 0, rowData: MAU_YC_DONG.map(r => ({ values: r.map(x => ({ userEnteredValue: { stringValue: x } })) })) }] }] }));
  const { parents } = await h.api(`https://www.googleapis.com/drive/v3/files/${t.spreadsheetId}?fields=parents`);
  await h.api(`https://www.googleapis.com/drive/v3/files/${t.spreadsheetId}?addParents=${goc}&removeParents=${parents.join(',')}&fields=id`, { method: 'PATCH' });
  return { id: t.spreadsheetId, name: MAU_YC, mimeType: 'application/vnd.google-apps.spreadsheet' };
}

// Mời TVGS: mở mẫu "Mời nghiệm thu" của Tin nhắn soạn sẵn (tin.js: tên công trình thật, người nhận, nút mở Zalo), điền sẵn công việc và ngày.
const moiTvgs = x => h.moiNt(`${x.ten} (${x.ma})`, ngayVn(x.n > 0 ? x.kt : cong(homNay(), 1)), viecMoi(x));

// Nghiệm thu công việc: thêm một dòng NGHIEMTHU (ngày, mã, nội dung, kết quả Đạt, số biên bản). Chỉ thêm dòng, không sửa dòng cũ.
async function ghiNt(x) {
  const s = hoiNgay(); if (!s) return;
  const bb = prompt(`Số biên bản nghiệm thu ${x.ten} (để trống nếu chưa có)`, ''); if (bb === null) return;
  await damBao('NGHIEMTHU', NT);
  await them('NGHIEMTHU', [serial(iso(s)), x.ma, `Nghiệm thu: ${x.ten}`, '', 'Đạt', bb.trim(), '']);
  await moVatTu(h); ms(`Đã ghi nghiệm thu ${x.ten} ngày ${ngayVn(s)}.`);
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
    const dt = $('vtdt').value.trim() && soVn($('vtdt').value);
    if (dt !== '' && !(dt > 0)) return ms(`Khối lượng dự toán “${$('vtdt').value}” không đọc được. Ví dụ 12.500 hoặc 15,5.`);
    await them('DMVATTU', [ten, $('vtqc').value.trim(), $('vtdv').value.trim(), '', '', $('vtts').value.trim(), '', dt]);
    for (const id of ['vtten', 'vtqc', 'vtdv', 'vtts', 'vtdt']) $(id).value = '';
    await moVatTu(h); ms(`Đã thêm ${ten}. Khi nộp hồ sơ đệ trình, bấm “Đã đệ trình”.`);
  } catch (e) { ms(e.message); }
}

// Vật tư về: tải ảnh phiếu giao nhận lên 05_VATTU_DOITHICONG/PHIEU_GIAONHAN (tên CTxx-GN-yyyymmdd-01_TenVatTu.jpg) trước, rồi mới thêm một dòng VATTU.
export async function luuVe() {
  const d = dm[$('vtl').value], kl = soVn($('vtk').value), ngay = $('vtd').value, anh = [...$('vtp').files], ct = $('ct').value, ma = maCt();
  if (!h?.id) return ms('Chưa mở được file nhật ký của công trình này.');
  if (!d) return ms('Thêm vật tư vào danh mục trước (mục bên dưới).');
  if (!(kl > 0)) return ms(`Khối lượng “${$('vtk').value}” không đọc được. Ví dụ 12.500 hoặc 15,5.`);
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
  a.deepEqual(chu(6), ['Chờ kết quả nén R28']); a.deepEqual(canLam(lo[6], dm)[0].nut[1].o, { L: 'Không đạt', M: 'Báo TVGS, khoan lõi' });
  const r7 = canLam({ ...lo[6], kq: '' }, dm)[0].nut[1]; a.deepEqual(r7.o, { K: 'Không đạt' }); a.ok(!r7.viec); // R7 không đạt: không cấm, không sinh việc
  a.deepEqual(canLam({ ...lo[6], kq: 'Không đạt' }, dm).map(x => x.chu), ['R7 không đạt: theo dõi kỹ, chờ R28 để kết luận', 'Chờ kết quả nén R28']);
  a.deepEqual(canLam({ ...lo[6], r28: 'Không đạt', xl: 'Báo TVGS, khoan lõi' }, dm).map(x => x.chu), ['R28 KHÔNG ĐẠT: báo TVGS, khoan lõi kiểm định']);
  a.equal(canLam({ ...lo[6], mau: 'Chưa', kq: '' }, dm)[0].nut[0].viec, 'mau'); // đúc mẫu bê tông: thêm việc nén R7, R28
  a.equal(tong(lo, 'Xi măng PCB40'), 30); a.equal(ngayVn(46301), '06/10/2026'); a.equal(ngayVn('6/10/2026'), '06/10/2026');
  for (const [x, y] of [['12.500', 12500], ['1.234.567,8', 1234567.8], ['15,5', 15.5], ['12.5', 12.5], ['20', 20], [' 3 ', 3]]) a.equal(soVn(x), y);
  for (const x of ['abc', '1.2.3', '', '1,2,3', '-5']) a.ok(isNaN(soVn(x)));
  const cv = [['Mã'], ['CB-1', 'Lán trại', 'CT', 1, '29/09/2026', '03/10/2026', 1], ['HM1-1', 'Tháo mái', 'm2', 500, '04/10/2026', '10/10/2026', 0], ['HM1-2', 'Lợp mái', 'm2', 500, '11/10/2026', 46330], ['HM2-1', 'Bệ', 'm3', 20, '', '30/12/2026'], ['VATLIEU', 'Vật liệu'], ['HM2-2', 'Sơn', 'm2', 1, '', '']];
  const lc = lichNt(cv, [NT, [46300, 'CB-1', 'x', '', 'Hẹn lại'], [46301, 'HM1-1', 'x', '', 'Không đạt']], '2026-10-06');
  a.deepEqual(lc.map(x => [x.ma, x.n]), [['CB-1', -3], ['HM1-1', 4]]); // hẹn lại, không đạt vẫn còn; HM1-2 ngày số 46330 = 04/11 (quá 14 ngày); không ngày thì bỏ
  a.deepEqual(lichNt(cv, [NT, [46300, 'CB-1', 'x', '', 'Đạt']], '2026-10-06').map(x => x.ma), ['HM1-1']);
  a.deepEqual(dem([], [], lc).moi, lc.filter(x => x.n >= 0 && x.n <= 2).map(x => 'Mời TVGS nghiệm thu: ' + x.ten + ' (' + x.ma + ')')); // thẻ Nghiệm thu chưa mời
  a.deepEqual(thieuNt(lc[1], lo, dm), ['Chưa có khối lượng thực hiện trong nhật ký', 'Có 1 lô vật tư KHÔNG ĐẠT chưa xử lý (xem mục Vật tư)']);
  a.deepEqual(lichNt([['Mã'], ['A', 'Cũ', '', 0, '', '01/09/2026'], ['B', 'Vừa qua', '', 0, '', '06/09/2026']], [], '2026-10-06').map(x => x.ma), ['B']); // quá 30 ngày thì bỏ
  a.deepEqual(tuanToi(cv, '2026-10-06'), ['Lợp mái (11/10/2026)']); // CB-1, HM1-1 đã bắt đầu; ô Bắt đầu trống thì bỏ
  a.equal(conThieu({ ten: 'Xi măng PCB40', dt: 50 }, lo), 20); a.equal(conThieu({ ten: 'Xi măng PCB40', dt: 10 }, lo), 0); a.equal(conThieu({ ten: 'X', dt: 0 }, lo), 0);
  a.equal(tinPhieu('CT01-YC-VT-20261006-01', 'CT01_ChoHieuLe', [{ ten: 'Thép D10', qc: 'CB300', dv: 'kg', sl: 1200, can: '2026-10-09', gc: '' }], 'https://x'),
    'PHIẾU YÊU CẦU VẬT TƯ số CT01-YC-VT-20261006-01\nCông trình: CT01_ChoHieuLe\n1. Thép D10 CB300: 1.200 kg, cần ngày 09/10/2026\nPhiếu: https://x');
  a.ok(MAU_YC_DONG.some(r => r[0] === 'STT'));
  a.equal(soDt(19, 20, 'tấn'), '19/20 tấn (95%)'); a.equal(soDt(21, 20, 'tấn'), '21/20 tấn (105%), VƯỢT dự toán'); a.equal(soDt(5, 0, 'm3'), '5 m3');
  a.equal(soTiep('CT01-GN-20261006', []), '01'); a.equal(soTiep('CT01-GN-20261006', ['CT01-GN-20261006-01_A.jpg', 'CT01-GN-20261006-03_B.jpg', 'CT01-GN-20261007-09_C.jpg']), '04');
  a.equal(soTiep('L20261006', ['L20261006-1', 'L20261006-2', 'D5'], 1), '3');
  a.equal(tenChuan('CT01-GN-20261006', '01', 'Xi măng PCB40', 'image.JPG'), 'CT01-GN-20261006-01_XiMangPcb40.jpg');
  console.log('ok');
}
