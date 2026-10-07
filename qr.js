// Mã QR bản vẽ hiện hành. Mỗi bản vẽ có MỘT file cố định trong thư mục QR_HIENHANH (bản sao của file hiện hành, ai có link đều xem được);
// khi có bản mới, nội dung và tên file được thay trong chính file đó nên link và mã QR không đổi. Tên file mang Rev và ngày: người quét thấy ngay đây là bản nào.
// ponytail: thay nội dung phải tải file về máy rồi tải lên lại (Drive không có lệnh chép đè nội dung); bản vẽ vài chục MB trên 4G sẽ chậm.
import { qrcode } from './qrcode.mjs'; // MIT, Kazuhiko Arase (qrcode-generator 2.0.4), nguyên bản

export const KHO = 'QR_HIENHANH';
export const laBanVe = ma => /-(BV|SD)-/.test(ma); // chỉ bản vẽ được công khai bằng mã QR (hợp đồng, báo giá có giá tiền thì không)
export const lien = id => `https://drive.google.com/file/d/${id}/view`;
export const duoi = ten => /\.[A-Za-z0-9]{1,5}$/.exec(ten)?.[0] ?? '';
export const tenQR = (ma, rev, ngay, ten, goc) => `${ma} bản ${rev}${ngay ? ' ngày ' + ngay.replaceAll('/', '-') : ''} - ${ten}${duoi(goc)}`.replace(/[\\/:*?"<>|]/g, '-');
export const svg = url => { const m = qrcode(0, 'M'); m.addData(url); m.make(); return m.createSvgTag({ cellSize: 4, margin: 16, scalable: true }); };

let X; // phần việc của app: { api, ls, thuMuc, json, tim, blob, ct, say, hoi, q, FOLDER }
export const khoiQR = ctx => X = ctx;
const goiY = d => `https://www.googleapis.com/drive/v3/files/${d}`;
const kho = async () => (await X.ls(`'${X.ct()}' in parents and name='${KHO}' and mimeType='${X.FOLDER}'`, 'id'))[0]?.id;
const cua = (fol, ma) => X.ls(`'${fol}' in parents and appProperties has { key='ma' and value='${X.q(ma)}' }`, 'id,name,appProperties').then(r => r[0]);
const quyen = f => X.api(`${goiY(f)}/permissions?fields=permissions(id,type)`);
const bat = async f => { await X.api(`${goiY(f)}/permissions`, X.json({ role: 'reader', type: 'anyone' })); await X.api(`${goiY(f)}?fields=id`, { ...X.json({ appProperties: { on: '1' } }), method: 'PATCH' }); };
const tat = async f => { for (const p of (await quyen(f)).permissions.filter(p => p.type === 'anyone')) await X.api(`${goiY(f)}/permissions/${p.id}`, { method: 'DELETE' }); await X.api(`${goiY(f)}?fields=id`, { ...X.json({ appProperties: { on: '0' } }), method: 'PATCH' }); };

// Thay nội dung và tên của file QR bằng bản mới trong MỘT yêu cầu (hoặc cả hai đổi, hoặc không gì đổi): không có chuyện nhãn Rev mới mà nội dung cũ.
async function thay(ex, nguon, d, rev, ngay) {
  if (nguon.mimeType?.startsWith('application/vnd.google-apps')) throw new Error('tài liệu dạng Google Docs/Sheets không thay được nội dung tự động');
  const b = await X.blob(`${goiY(nguon.id)}?alt=media`), r = 'ranh' + Date.now();
  await X.api(`https://www.googleapis.com/upload/drive/v3/files/${ex.id}?uploadType=multipart&fields=id`, {
    method: 'PATCH', headers: { 'Content-Type': 'multipart/related; boundary=' + r },
    body: new Blob([`--${r}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ name: tenQR(d.ma, rev, ngay, d.ten, nguon.name), appProperties: { ma: d.ma, rev } })}\r\n--${r}\r\nContent-Type: ${b.type || 'application/octet-stream'}\r\n\r\n`, b, `\r\n--${r}--`]) });
}

// Nút QR ở tài liệu: tạo mã (hỏi xác nhận, có cảnh báo), hoặc cập nhật nếu đã có mã mà Rev lệch.
export async function lamQR(d) {
  if (!laBanVe(d.ma)) return X.say('Chỉ bản vẽ mới tạo được mã QR.');
  try {
    const [src] = await X.tim(d); if (!src) return;
    let fol = await kho(), ex = fol && await cua(fol, d.ma);
    if (!ex) {
      if (!X.hoi(`Tạo mã QR cho "${d.ma} ${d.ten}"?\n\nAi có mã QR (hoặc link của nó) đều xem được bản vẽ này, KHÔNG cần đăng nhập Google. Chỉ dán ở nơi nội bộ.\nKhi có bản mới, mã giữ nguyên và tự trỏ sang bản mới. Thu hồi bất cứ lúc nào bằng nút "Thu hồi" ở mục Mã QR bản vẽ.${/\.pdf$/i.test(src.name) ? '' : '\n\nChú ý: file này không phải PDF, điện thoại người quét có thể không xem được.'}`)) return;
      fol ||= await X.thuMuc(X.ct(), KHO);
      X.say('Đang tạo mã QR...'); // tạo ở trạng thái tắt, mở quyền xong mới bật: lỗi giữa chừng thì mã không bao giờ "bật" mà không dùng được
      const f = await X.api(`${goiY(src.id)}/copy?fields=id`, X.json({ name: tenQR(d.ma, d.rev, d.ngay, d.ten, src.name), parents: [fol], appProperties: { ma: d.ma, rev: d.rev, on: '0' } }));
      await bat(f.id); X.say(`Đã tạo mã QR cho ${d.ma}. Xem ở mục Mã QR bản vẽ.`);
    } else if (ex.appProperties?.rev !== d.rev) { X.say('Đang cập nhật mã QR...'); await thay(ex, src, d, d.rev, d.ngay); X.say(`Đã cập nhật mã QR của ${d.ma} sang ${d.rev}.`); }
    else X.say(`Mã QR của ${d.ma} đã đúng bản ${d.rev}.`);
    await moQR();
  } catch (e) { X.say('Lỗi mã QR: ' + e.message); }
}

// Sau "Bản mới": nếu tài liệu có mã QR thì đổi sang bản vừa lưu. Trả về dòng báo cho người dùng ('' nếu không có mã QR); lỗi phải báo rõ vì mã vẫn trỏ bản cũ.
export async function sauBanMoi(d, rev, nguon, ngay) {
  try {
    const fol = await kho(), ex = fol && await cua(fol, d.ma);
    if (!ex) return '';
    await thay(ex, nguon, d, rev, ngay); await moQR();
    return ` Mã QR đã chuyển sang bản ${rev}.`;
  } catch (e) { return ` CHÚ Ý: mã QR của ${d.ma} CHƯA chuyển sang bản mới (${e.message}), vẫn mở bản cũ. Bấm QR ở tài liệu để thử lại.`; }
}

export async function moQR() {
  const ds = document.getElementById('qrds'); ds.replaceChildren();
  try {
    const fol = await kho(); if (!fol) return document.getElementById('qrms').textContent = 'Chưa có mã QR nào. Bấm QR ở một tài liệu để tạo.';
    const fs = (await X.ls(`'${fol}' in parents`, 'id,name,appProperties')).sort((a, b) => a.name.localeCompare(b.name));
    document.getElementById('qrms').textContent = fs.length ? '' : 'Chưa có mã QR nào. Bấm QR ở một tài liệu để tạo.';
    ds.replaceChildren(...fs.map(f => {
      const bat_ = f.appProperties?.on === '1', el = document.createElement('div'); el.className = 'doc qrd';
      const h = document.createElement('div'); h.innerHTML = svg(lien(f.id)); h.firstChild.style.cssText = 'width:120px;height:120px;flex:none' + (bat_ ? '' : ';opacity:.25');
      const t = document.createElement('div'), n = document.createElement('div'); n.textContent = f.name;
      const s = document.createElement('small'); s.textContent = bat_ ? 'Đang mở cho người quét' : 'ĐÃ THU HỒI, quét không mở được';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = bat_; cb.disabled = !bat_; cb.className = 'qrc'; cb.setAttribute('aria-label', 'In mã ' + f.name); cb.dataset.id = f.id; cb.dataset.ten = f.name;
      const b = document.createElement('button'); b.className = 'phu'; b.textContent = bat_ ? 'Thu hồi' : 'Bật lại';
      b.onclick = async () => { b.disabled = true; try { if (bat_ || X.hoi('Bật lại: ai có mã QR này xem được bản vẽ, không cần đăng nhập. Tiếp tục?')) await (bat_ ? tat : bat)(f.id); } catch (e) { X.say('Lỗi mã QR: ' + e.message); } moQR(); };
      t.append(n, s, cb, b); el.append(h, t); return el;
    }));
  } catch (e) { document.getElementById('qrms').textContent = 'Không đọc được danh sách mã QR: ' + e.message; }
}

// Tờ A4 nhiều mã: mỗi ô một mã, tên và Rev in to để cắt dán; CSS in chỉ hiện #qrtrang.
export function inQR() {
  const cs = [...document.querySelectorAll('.qrc:checked')]; if (!cs.length) return X.say('Chọn ít nhất một mã QR để in.');
  const tr = document.getElementById('qrtrang');
  tr.replaceChildren(...cs.map(c => { const o = document.createElement('div'), h = document.createElement('div'), t = document.createElement('p'); h.innerHTML = svg(lien(c.dataset.id)); t.textContent = c.dataset.ten.replace(/\.[A-Za-z0-9]{1,5}$/, ''); o.append(h, t, Object.assign(document.createElement('small'), { textContent: 'Quét để mở bản vẽ hiện hành' })); return o; }));
  tr.hidden = false; window.print(); tr.hidden = true;
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('qr.js')) { // chạy: node qr.js (khung nhìn QR đã được kiểm bằng máy đọc QR một lần, xem README)
  const a = await import('node:assert/strict');
  a.ok(laBanVe('CT01-BV-KC-005') && laBanVe('CT01-SD-DN-001') && !laBanVe('CT01-HD-001') && !laBanVe('CT01-BG-002'));
  a.equal(lien('abc'), 'https://drive.google.com/file/d/abc/view');
  a.equal(tenQR('CT01-BV-KC-005', 'R03', '06/10/2026', 'Móng M1/M2', 'x.pdf'), 'CT01-BV-KC-005 bản R03 ngày 06-10-2026 - Móng M1-M2.pdf');
  a.equal(tenQR('A', 'R01', '', 'B', 'noext'), 'A bản R01 - B'); a.equal(duoi('a.b.PDF'), '.PDF');
  const s = svg(lien('1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789')); a.ok(s.startsWith('<svg') && s.includes('viewBox')); a.equal(s, svg(lien('1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789')));
  console.log('ok');
}
