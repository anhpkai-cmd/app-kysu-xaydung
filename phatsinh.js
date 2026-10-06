// Sổ phát sinh và chỉ đạo tại hiện trường: CĐT, TVGS yêu cầu miệng thì ghi ngay (ai, ngày, nội dung, khối lượng ước, ảnh),
// app soạn sẵn tin Zalo "xác nhận lại" gửi người yêu cầu làm bằng chứng. Sổ là trang PHATSINH trong _SODANGKY của công trình,
// ảnh vào 04_KHOILUONG_THANHTOAN/PS_PHATSINH. Cuối kỳ mở trang PHATSINH là có bảng để làm phụ lục phát sinh.
import { zaloSo } from './tin.js';

export const COT = ['Ngày', 'Người yêu cầu', 'Vai trò', 'Nội dung', 'Vị trí', 'KL ước', 'Đơn vị', 'Ảnh', 'Trạng thái'];
const CHO = 'Chờ xác nhận';
export const dongPS = v => [v.ngay, v.ai, v.vaiTro, v.nd, v.vt, v.kl, v.dv, v.anh || '', CHO];
export const docPS = v => (v || []).slice(1).map((r, i) => ({ ngay: r[0] ?? '', ai: r[1] ?? '', nd: r[3] ?? '', kl: [r[5], r[6]].filter(Boolean).join(' '), tt: r[8] ?? '', dong: i + 2 })).filter(x => x.nd);
export const tinPS = (v, tenCT) => `Kính gửi ${v.ai || 'anh/chị'}${v.vaiTro ? ` (${v.vaiTro})` : ''}, nhà thầu xin xác nhận lại: ngày ${v.ngay} tại công trình ${tenCT}${v.vt ? `, vị trí ${v.vt}` : ''}, anh/chị có yêu cầu: ${v.nd}.`
  + (v.kl ? ` Khối lượng ước tính: ${v.kl} ${v.dv}.`.replace(/ \./, '.') : '')
  + ' Đây là công việc phát sinh ngoài hợp đồng, nhà thầu sẽ triển khai và tập hợp vào hồ sơ phát sinh để thanh toán. Nếu có gì chưa đúng, anh/chị phản hồi giúp trong ngày. Trân trọng.';

// Gắn vào giao diện. h: { api, json, taiLen, thuMuc, ctx: () => ({ so, ct, ma, tenCT, tt }) } (ctx đọc lúc bấm nên đổi công trình không giữ số liệu cũ).
let h;
const $ = id => document.getElementById(id), ms = t => $('psms').textContent = t ?? '';
const sh = so => `https://sheets.googleapis.com/v4/spreadsheets/${so}`;
const coTrang = async so => (await h.api(`${sh(so)}?fields=sheets.properties(title,sheetId)`)).sheets.find(x => x.properties.title === 'PHATSINH')?.properties.sheetId; // sheetId để mở đúng trang
async function trang(so) { // chưa có trang PHATSINH thì tạo kèm hàng tiêu đề
  const id = await coTrang(so); if (id != null) return id;
  const r = await h.api(`${sh(so)}:batchUpdate`, h.json({ requests: [{ addSheet: { properties: { title: 'PHATSINH' } } }] }));
  await h.api(`${sh(so)}/values/PHATSINH!A1?valueInputOption=RAW`, { ...h.json({ values: [COT] }), method: 'PUT' });
  return r.replies[0].addSheet.properties.sheetId;
}
const nguoi = () => { const ai = $('psai').value.trim(); return h.ctx().tt.find(r => r[0] === 'Liên hệ' && r[1] === ai); };

export async function moPS(ham) {
  h = ham; ms(); $('psm').hidden = true; $('psds').replaceChildren(); $('psk').hidden = true;
  const { so, tt } = h.ctx();
  $('psais').replaceChildren(...tt.filter(r => r[0] === 'Liên hệ' && r[1]).map(r => new Option(r[2] ? `${r[1]} (${r[2]})` : r[1], r[1])));
  if (!$('psd').value) $('psd').valueAsDate = new Date();
  if (!so) return ms('Công trình này chưa có _SODANGKY, chưa ghi được sổ phát sinh.');
  try {
    const gid = await coTrang(so);
    const v = gid == null ? [] : (await h.api(`${sh(so)}/values/PHATSINH!A:I`)).values;
    if (h.ctx().so !== so) return; // đổi công trình giữa chừng
    $('psm').hidden = gid == null; $('psm').href = `https://docs.google.com/spreadsheets/d/${so}/edit#gid=${gid}`;
    const ds = docPS(v).reverse(), cho = ds.filter(x => x.tt === CHO).length;
    ms(ds.length ? `${ds.length} việc phát sinh, ${cho} chờ xác nhận.` : 'Chưa ghi việc phát sinh nào.');
    $('psds').replaceChildren(...ds.map(x => {
      const p = document.createElement('p'); p.textContent = `${x.ngay} · ${x.ai}: ${x.nd}${x.kl ? ' · ' + x.kl : ''} · ${x.tt}`;
      if (x.tt === CHO) { p.append(' '); const b = p.appendChild(document.createElement('button')); b.textContent = 'Đã được xác nhận'; b.onclick = () => xacNhan(so, x, b); }
      return p;
    }));
  } catch (e) { ms(e.message); }
}
async function xacNhan(so, x, b) {
  b.disabled = true;
  try {
    if ((await h.api(`${sh(so)}/values/PHATSINH!D${x.dong}`)).values?.[0]?.[0] !== x.nd) return moPS(h).then(() => ms('Sổ vừa bị sửa ở nơi khác (đổi dòng), đã tải lại. Bấm lại.')); // không ghi nhầm dòng khi sheet bị sắp xếp lại
    await h.api(`${sh(so)}/values/PHATSINH!I${x.dong}?valueInputOption=RAW`, { ...h.json({ values: [['Đã xác nhận ' + new Date().toLocaleDateString('en-GB')]] }), method: 'PUT' }); moPS(h);
  } catch (e) { ms(e.message); b.disabled = false; }
}
export async function ghiPS() {
  const { so, ct, ma, tenCT } = h.ctx(), r = nguoi(), f = $('psa').files[0];
  const v = { ngay: $('psd').value.split('-').reverse().join('/'), ai: $('psai').value.trim(), vaiTro: r?.[2] ?? '', nd: $('psn').value.trim(), vt: $('psv').value.trim(), kl: $('psk1').value.trim(), dv: $('psdv').value.trim() };
  if (!v.nd || !v.ai || !$('psd').value) return ms('Ghi người yêu cầu, ngày và nội dung.');
  if (!so) return ms('Công trình này chưa có _SODANGKY.');
  $('psg').disabled = true; ms('Đang ghi sổ...');
  try {
    if (f) v.anh = (await h.taiLen(`${ma}-PS-${$('psd').value.replace(/-/g, '')}-${Date.now() % 1e6}${/\.\w+$/.exec(f.name)?.[0] ?? '.jpg'}`, await h.thuMuc(ct, '04_KHOILUONG_THANHTOAN/PS_PHATSINH'), f)).webViewLink;
    await trang(so);
    await h.api(`${sh(so)}/values/PHATSINH!A:I:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, h.json({ values: [dongPS(v)] }));
    $('pst').value = tinPS(v, tenCT); $('psk').hidden = false;
    const z = zaloSo(r); $('psz').hidden = !z; if (z) { $('psz').href = z; $('psz').textContent = 'Mở Zalo của ' + v.ai; }
    $('psn').value = $('psv').value = $('psk1').value = $('psa').value = '';
    await moPS(h); ms('Đã ghi sổ. Xem lại tin rồi chép gửi người yêu cầu.'); $('psk').hidden = false;
  } catch (e) { ms(e.message); }
  $('psg').disabled = false;
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('phatsinh.js')) { // chạy: node phatsinh.js
  const a = await import('node:assert/strict');
  const v = { ngay: '06/10/2026', ai: 'Anh Hùng', vaiTro: 'Giám sát, Cty ABC', nd: 'làm thêm rãnh thoát nước', vt: 'trục A-B', kl: '12', dv: 'm' };
  a.equal(tinPS(v, 'Chợ Hiếu Lễ'), 'Kính gửi Anh Hùng (Giám sát, Cty ABC), nhà thầu xin xác nhận lại: ngày 06/10/2026 tại công trình Chợ Hiếu Lễ, vị trí trục A-B, anh/chị có yêu cầu: làm thêm rãnh thoát nước. Khối lượng ước tính: 12 m. Đây là công việc phát sinh ngoài hợp đồng, nhà thầu sẽ triển khai và tập hợp vào hồ sơ phát sinh để thanh toán. Nếu có gì chưa đúng, anh/chị phản hồi giúp trong ngày. Trân trọng.');
  const t = tinPS({ ...v, vaiTro: '', vt: '', kl: '' }, 'X'); a.ok(t.startsWith('Kính gửi Anh Hùng, nhà thầu') && t.includes('tại công trình X, anh/chị') && !t.includes('Khối lượng'));
  a.equal(tinPS({ ...v, dv: '' }, 'X').includes('ước tính: 12. Đây'), true);
  a.deepEqual(dongPS(v), ['06/10/2026', 'Anh Hùng', 'Giám sát, Cty ABC', 'làm thêm rãnh thoát nước', 'trục A-B', '12', 'm', '', 'Chờ xác nhận']);
  a.deepEqual(docPS([COT, dongPS(v), ['', '', '', '']]).map(x => [x.kl, x.tt, x.dong]), [['12 m', 'Chờ xác nhận', 2]]);
  console.log('ok');
}
