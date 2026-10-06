import { CLIENT_ID, ROOT_NAME } from './config.js';
import { NK, serial } from './nhatky.js';
import { ngayChup, tenAnh, sttTiep } from './anh.js';
import { url as urlTT, parse as parseTT, viTri, nhatKy, tomTat, canhBao, NGAY } from './thoitiet.js';
import { parse, loc, revTiep, revHopLe, tenChuan } from './register.js';
import { COT as COT_VIEC, parse as parseViec, chia, nhan as nhanHan, conLai, iso, cong } from './viec.js';

const $ = id => document.getElementById(id);
const FOLDER = 'application/vnd.google-apps.folder', SHEET = 'application/vnd.google-apps.spreadsheet';
let token, docs = [], head = [], soId, nhan = [], viec = [], viecId; // nhan: file chờ lưu (từ Zalo/ứng dụng khác, hoặc trong 00_INBOX); viec: việc cần làm (xem viec.js)

const api = async (url, opt = {}) => {
  const r = await fetch(url, { ...opt, headers: { Authorization: 'Bearer ' + token, ...opt.headers } });
  if (!r.ok) throw new Error(r.status === 401 ? 'Phiên đăng nhập hết hạn, bấm Đăng nhập lại.' : r.status === 403 ? 'Google không cho phép (không đủ quyền với file này).' : 'Lỗi Google ' + r.status);
  return r.status === 204 ? null : r.json();
};
const ls = async (q, cot = 'id,name,mimeType,webViewLink') => (await api(`https://www.googleapis.com/drive/v3/files?pageSize=1000&fields=files(${cot})&q=` + encodeURIComponent(q + ' and trashed=false'))).files;
const say = t => $('msg').textContent = t || '';

function hien() {
  const kq = loc(docs, $('q').value);
  if (!kq.length && docs.length) return say(`Không có tài liệu nào khớp “${$('q').value}”. Thử từ khác, ví dụ tên bộ môn (KC, DN).`), $('ds').replaceChildren();
  say();
  $('ds').replaceChildren(...kq.map(d => {
    const el = document.createElement('div'); el.className = 'doc';
    const b = document.createElement('b'); b.textContent = `${d.ma} · ${d.rev}`;
    const t = document.createElement('div'); t.textContent = d.ten;
    const s = document.createElement('small'); s.textContent = [d.tt, d.ngay].filter(Boolean).join(' · ');
    const g = document.createElement('button'); g.textContent = 'Gửi'; g.setAttribute('aria-label', 'Gửi ' + d.ma);
    g.onclick = () => gui(d);
    const x = document.createElement('button'); x.className = 'phu'; x.textContent = 'Xem'; x.setAttribute('aria-label', 'Xem ' + d.ma);
    x.onclick = () => xem(d);
    const m = document.createElement('button'); m.className = 'phu'; m.textContent = 'Bản mới'; m.setAttribute('aria-label', 'Tải bản mới của ' + d.ma);
    m.onclick = () => chonFile(d);
    const th = document.createElement('div'); th.append(b, t, s);
    const nut = document.createElement('div'); nut.className = 'nut'; nut.append(x, g, m);
    el.append(th, nut);
    return el;
  }));
}

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
// Tìm Google Sheet theo điều kiện; chưa có mà có file Excel cùng tên thì tự chuyển thành Google Sheet (bản Excel giữ nguyên, cùng thư mục).
async function sheetCo(dk) {
  let [f] = await ls(`${dk} and mimeType='${SHEET}'`);
  if (f) return f;
  [f] = await ls(`${dk} and mimeType='${XLSX}'`);
  if (!f) return;
  say(`Đang chuyển ${f.name} sang Google Sheet...`);
  const { parents } = await api(`https://www.googleapis.com/drive/v3/files/${f.id}?fields=parents`);
  return api(`https://www.googleapis.com/drive/v3/files/${f.id}/copy`, json({ mimeType: SHEET, name: f.name.replace(/\.xlsx$/i, ''), parents }));
}
const q = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); // thoát ký tự trong truy vấn Drive
const json = o => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) });

// Đi theo đường dẫn "02_BANVE/KC_KETCAU/HIENHANH" từ thư mục công trình, thiếu thư mục nào thì tạo.
async function thuMuc(id, duong) {
  for (const ten of duong.split('/')) {
    const [c] = await ls(`'${id}' in parents and mimeType='${FOLDER}' and name='${q(ten)}'`);
    id = c ? c.id : (await api('https://www.googleapis.com/drive/v3/files?fields=id', json({ name: ten, mimeType: FOLDER, parents: [id] }))).id;
  }
  return id;
}

function chonFile(d) {
  if (nhan.length) return tai(d, nhan[0]);
  const o = $('chon'); o.onchange = () => { const f = o.files[0]; o.value = ''; if (f) tai(d, f); }; o.click();
}

// Bản mới của một tài liệu: tải lên thư mục HIENHANH với tên chuẩn, chuyển bản cũ sang LUUTRU (không xóa gì), ghi Rev vào sổ.
async function tai(d, file) {
  let buoc = 'chuẩn bị';
  try {
    const rev = (prompt(`Rev của bản mới (hiện hành ${d.rev}). Rev chỉ tăng khi file đã gửi đi.`, revTiep(d.rev)) || '').trim().toUpperCase();
    if (!rev) return;
    if (!revHopLe(rev, d.rev)) return say(`Rev "${rev}" không hợp lệ hoặc không cao hơn ${d.rev}. Dùng dạng R02, R03...`);
    if (!d.dir) return say('Sổ chưa ghi "Thư mục chuẩn" cho tài liệu này.');
    const ten = tenChuan(d.ma, rev, d.ten, file.name), ct = $('ct').value;
    const dir = await thuMuc(ct, d.dir), luu = /HIENHANH$/.test(d.dir) ? await thuMuc(ct, d.dir.replace(/HIENHANH$/, 'LUUTRU')) : null;
    const cu = luu ? (await ls(`'${dir}' in parents and name contains '${q(d.ma)}'`)).filter(f => f.name.startsWith(d.ma + '-')) : [];
    if (!confirm(`Lưu "${file.name}" thành:\n${ten}\nvào ${d.dir}.` + (cu.length ? `\n\nChuyển sang LUUTRU (không xóa): ${cu.map(f => f.name).join(', ')}` : ''))) return;
    say('Đang tải lên...'); buoc = 'lưu file';
    // ponytail: tải một lần (multipart), ổn đến vài chục MB; file lớn hơn cần tải theo đợt (resumable).
    const b = 'ranh' + Date.now();
    // file đã nằm trên Drive (hộp 00_INBOX): chỉ đổi tên và chuyển thư mục, không tải lại. File từ máy/Zalo: tải lên.
    const moi = file.cha ? await api(`https://www.googleapis.com/drive/v3/files/${file.id}?addParents=${dir}&removeParents=${file.cha}&fields=id`, { ...json({ name: ten }), method: 'PATCH' }) : await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b },
      body: new Blob([`--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ name: ten, parents: [dir] })}\r\n--${b}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`, file, `\r\n--${b}--`]),
    });
    buoc = 'chuyển bản cũ sang LUUTRU (file mới đã nằm trong HIENHANH)';
    for (const f of cu) if (f.id !== moi.id) await api(`https://www.googleapis.com/drive/v3/files/${f.id}?addParents=${luu}&removeParents=${dir}&fields=id`, { method: 'PATCH' });
    buoc = 'ghi Rev vào sổ (file đã lưu xong)';
    const c = n => String.fromCharCode(65 + head.indexOf(n)); // ponytail: sổ tối đa 26 cột (A-Z)
    await api(`https://sheets.googleapis.com/v4/spreadsheets/${soId}/values:batchUpdate`, json({ valueInputOption: 'RAW', data: [
      { range: `DANHMUC!${c('Rev hiện hành')}${d.dong}`, values: [[rev]] },
      { range: `DANHMUC!${c('Ngày rev')}${d.dong}`, values: [[new Date().toLocaleDateString('en-GB')]] }] }));
    if (file.khoa) await (await caches.open('chia-se')).delete(file.khoa);
    nhan = nhan.filter(f => f !== file); hienNhan();
    await chonCT(); say(`Đã lưu ${ten}.`);
  } catch (e) { say(`Lỗi khi ${buoc}: ${e.message}`); }
}

// File nhận từ Zalo/ứng dụng khác (nút Chia sẻ của điện thoại): sw.js cất vào bộ nhớ, đây là nơi lấy ra.
async function docNhan() {
  if (!window.caches) return;
  const c = await caches.open('chia-se');
  for (const k of await c.keys()) {
    const r = await c.match(k), blob = await r.blob();
    nhan.push(Object.assign(new File([blob], decodeURIComponent(r.headers.get('X-Ten')), { type: blob.type }), { khoa: k.url }));
  }
  hienNhan();
}
// File chờ lưu: nhận từ Zalo (Android) hoặc đang nằm trong 00_INBOX của công trình (iPhone: Zalo → Lưu vào Drive → 00_INBOX). File đầu danh sách là file đang chọn.
async function docInbox() {
  const cha = await thuMuc($('ct').value, '00_INBOX');
  nhan = nhan.filter(f => !f.cha).concat((await ls(`'${cha}' in parents and mimeType!='${FOLDER}'`)).filter(f => !f.mimeType.startsWith('image/') || f.name.startsWith(TL)).map(f => ({ ...f, cha }))); // ảnh hiện trường đi đường riêng (mục Ảnh hiện trường); ảnh đã đánh dấu TAILIEU_ là tài liệu
  hienNhan();
}
function hienNhan() {
  const n = $('nhan'); n.hidden = !nhan.length;
  const dong = Object.assign(document.createElement('div'), { textContent: `Có ${nhan.length} file chờ lưu. Chọn file, rồi bấm “Bản mới” ở đúng tài liệu:` });
  n.replaceChildren(...(nhan.length ? [dong, ...nhan.flatMap((f, i) => [Object.assign(document.createElement('button'), {
    className: 'phu', textContent: (i ? '' : '✓ ') + f.name, onclick: () => { nhan.unshift(...nhan.splice(i, 1)); hienNhan(); } }),
    ...(f.name.startsWith(TL) && f.mimeType?.startsWith('image/') ? [Object.assign(document.createElement('button'), { className: 'phu', textContent: 'Là ảnh hiện trường', onclick: () => doiTen(f, f.name.slice(TL.length)).then(() => { nhan = nhan.filter(x => x !== f); hienNhan(); taiAnh(); }).catch(e => say(e.message)) })] : [])])] : []));
}

// ---- Việc cần làm: Trang tính _CONGVIEC (trong thư mục CONGTRINH) + sự kiện Google Lịch để điện thoại tự nhắc hạn ----
const homNay = () => new Date().toLocaleDateString('sv-SE'); // yyyy-mm-dd theo giờ máy
const LICH = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

async function soViec(goc) {
  const [f] = await ls(`'${goc}' in parents and mimeType='${SHEET}' and name='_CONGVIEC'`);
  if (f) return f.id;
  const t = await api('https://sheets.googleapis.com/v4/spreadsheets', json({ properties: { title: '_CONGVIEC' }, sheets: [{ properties: { title: 'VIEC' },
    data: [{ startRow: 0, startColumn: 0, rowData: [{ values: COT_VIEC.map(c => ({ userEnteredValue: { stringValue: c } })) }] }] }] }));
  const { parents } = await api(`https://www.googleapis.com/drive/v3/files/${t.spreadsheetId}?fields=parents`);
  await api(`https://www.googleapis.com/drive/v3/files/${t.spreadsheetId}?addParents=${goc}&removeParents=${parents.join(',')}&fields=id`, { method: 'PATCH' });
  return t.spreadsheetId;
}

async function taiViec() {
  viec = parseViec((await api(`https://sheets.googleapis.com/v4/spreadsheets/${viecId}/values/VIEC`)).values);
  const nhom = chia(viec, homNay()), dong = (t, han) => {
    const el = document.createElement('div'); el.className = 'doc';
    const th = document.createElement('div');
    const a = document.createElement('div'); a.textContent = t.ten;
    const b = document.createElement('small'); b.textContent = [t.ct, han ?? t.han].filter(Boolean).join(' · ');
    th.append(a, b);
    const x = document.createElement('button'); x.className = 'phu'; x.textContent = 'Xong'; x.setAttribute('aria-label', 'Xong việc: ' + t.ten);
    x.onclick = () => xong(t);
    el.append(th, x); return el;
  };
  const muc = (tieuDe, ds) => ds.length ? [Object.assign(document.createElement('h3'), { textContent: `${tieuDe} (${ds.length})` }), ...ds.map(t => dong(t, t.n === undefined || isNaN(t.n) ? undefined : nhanHan(t.n)))] : [];
  $('dsv').replaceChildren(...muc('Quá hạn', nhom.quaHan), ...muc('Sắp đến hạn', nhom.sapDen), ...muc('Sau đó', nhom.sau), ...muc('Chưa có hạn', nhom.khongHan));
  if (!viec.length) $('dsv').textContent = 'Chưa có việc nào. Thêm việc đầu tiên bên dưới.';
  veHan(); veTT();
}

// Giấy tờ có ngày hết hiệu lực (cột "Hạn hiệu lực" trong sổ đăng ký) còn ≤ 30 ngày, đã quá hạn, hoặc ngày không đọc được; gom từ mọi công trình.
let hanDs = [], hanLoi = [];
async function taiHan(cts) {
  const hom = homNay(); hanLoi = [];
  hanDs = (await Promise.all(cts.map(async c => {
    try {
      const s = await sheetCo(`'${c.id}' in parents and name contains '_SODANGKY'`);
      return s ? parse((await api(`https://sheets.googleapis.com/v4/spreadsheets/${s.id}/values/DANHMUC?valueRenderOption=UNFORMATTED_VALUE`)).values).map(d => ({ ...d, ct: c.name, n: conLai(d.han, hom) })) : [];
    } catch { hanLoi.push(c.name); return []; } // một công trình lỗi không chặn các công trình khác, nhưng phải báo
  }))).flat().filter(d => d.han !== '' && (isNaN(d.n) || d.n <= 30)).sort((x, y) => (isNaN(x.n) ? -Infinity : x.n) - (isNaN(y.n) ? -Infinity : y.n));
  veHan();
}
const ngayVn = han => iso(han).split('-').reverse().join('/');
function veHan() {
  const tieu = t => Object.assign(document.createElement('h3'), { textContent: t });
  $('han').replaceChildren(...(hanDs.length ? [tieu(`Giấy tờ sắp hết hạn (${hanDs.length})`)] : []), ...hanDs.map(d => {
    const el = document.createElement('div'); el.className = 'doc';
    const th = document.createElement('div'), t = document.createElement('div'), s = document.createElement('small');
    const ten = `Gia hạn: ${d.ten}`, dat = viec.some(v => v.ten.startsWith(ten) && v.ct === d.ct); // đã có việc nhắc đang mở thì không nhắc lại
    t.textContent = d.ten; s.textContent = isNaN(d.n) ? `${d.ct} · ${d.ma} · Ngày hạn không đọc được (“${d.han}”), sửa trong sổ` : `${d.ct} · ${d.ma} · ${nhanHan(d.n)} (${ngayVn(d.han)})${dat ? ' · Đã đặt nhắc' : ''}`; th.append(t, s); el.append(th);
    if (!isNaN(d.n) && !dat) {
      const b = document.createElement('button'); b.className = 'phu'; b.textContent = 'Nhắc tôi'; b.setAttribute('aria-label', 'Tạo việc nhắc gia hạn ' + d.ten);
      // gia hạn cần làm hồ sơ vài tuần: nhắc trước 14 ngày so với ngày hết hiệu lực (không lùi về quá khứ)
      b.onclick = () => { $('vten').value = `${ten} (hết ${ngayVn(d.han)})`; $('vct').value = d.ct; $('vhan').value = d.n > 14 ? cong(d.han, -14) : homNay(); $('vten').focus(); say('Kiểm tra rồi bấm Thêm việc để tạo nhắc trên Google Lịch.'); };
      el.append(b);
    }
    return el;
  }), ...(hanLoi.length ? [Object.assign(document.createElement('p'), { textContent: 'Không đọc được hạn giấy tờ của: ' + hanLoi.join(', ') })] : []));
  veSot();
}

async function themViec() {
  const ten = $('vten').value.trim(), ct = $('vct').value, han = $('vhan').value;
  if (!ten) return say('Gõ tên việc trước.');
  try {
    let lich = '', ghi = '';
    if (han) try { // ponytail: múi giờ cố định Việt Nam; sửa hạn tay trong Trang tính không tự cập nhật Lịch
      const tz = 'Asia/Ho_Chi_Minh';
      lich = (await api(LICH, json({ summary: ct && ct !== 'Chung' ? `${ten} (${ct})` : ten, start: { dateTime: han + 'T08:00:00', timeZone: tz }, end: { dateTime: han + 'T08:30:00', timeZone: tz },
        reminders: { useDefault: false, overrides: [0, 1440, 4320].map(minutes => ({ method: 'popup', minutes })) } }))).id; // nhắc lúc 8h sáng ngày hạn, 1 ngày và 3 ngày trước
    } catch (e) { ghi = 'Chưa tạo được nhắc trên Google Lịch: ' + e.message; }
    await api(`https://sheets.googleapis.com/v4/spreadsheets/${viecId}/values/VIEC:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, json({ values: [[ten, ct, han, 'Mở', ghi, lich]] }));
    $('vten').value = ''; $('vhan').value = '';
    await taiViec(); say(ghi || 'Đã thêm việc.');
  } catch (e) { say(e.message); }
}

async function xong(t) {
  try {
    const hang = (await api(`https://sheets.googleapis.com/v4/spreadsheets/${viecId}/values/VIEC!A${t.dong}:A${t.dong}`)).values?.[0]?.[0];
    if (hang !== t.ten) { await taiViec(); return say('Danh sách việc vừa thay đổi, đã tải lại. Bấm Xong lần nữa.'); } // sổ bị sửa/đổi thứ tự ở nơi khác
    await api(`https://sheets.googleapis.com/v4/spreadsheets/${viecId}/values/VIEC!D${t.dong}?valueInputOption=RAW`, { ...json({ values: [['Xong']] }), method: 'PUT' });
    if (t.lich) await api(`${LICH}/${t.lich}`, { method: 'DELETE' }).catch(() => {}); // việc xong rồi thì thôi nhắc; lỗi Lịch không chặn
    await taiViec(); say(`Xong: ${t.ten}`);
  } catch (e) { say(e.message); }
}

// Gửi link bản hiện hành: tìm file Drive có tên bắt đầu bằng "<mã>-<rev>", mở quyền "ai có link đều xem được" (sau khi hỏi), rồi mở bảng chia sẻ của máy.
// File hiện hành của tài liệu (cùng mã, đúng Rev trong sổ). Cùng mã cùng rev có thể có .xlsx và .pdf: ưu tiên PDF.
async function tim(d) {
  const found = (await ls(`name contains '${q(d.ma + '-' + d.rev)}'`)).filter(f => f.name.startsWith(`${d.ma}-${d.rev}`));
  if (!found.length) say(`Chưa thấy file ${d.ma}-${d.rev} trên Drive (sổ ghi ${d.rev} nhưng file chưa được đổi tên chuẩn?).`);
  return found.find(x => x.name.toLowerCase().endsWith('.pdf')) || found[0];
}

// Xem trực tiếp: mở bản xem của Drive. Mở tab trước (trình duyệt chỉ cho khi vừa bấm), tìm file xong mới chuyển tab tới link.
async function xem(d) {
  const w = window.open('about:blank', '_blank');
  try {
    const f = await tim(d);
    if (!f) return w?.close();
    say();
    w ? w.location.href = f.webViewLink : location.href = f.webViewLink;
  } catch (e) { w?.close(); say(e.message); }
}

async function gui(d) {
  try {
    const f = await tim(d);
    if (!f) return;
    if (!confirm(`Gửi "${f.name}"?\nBất kỳ ai có link đều xem được file này.`)) return;
    await api(`https://www.googleapis.com/drive/v3/files/${f.id}/permissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'reader', type: 'anyone' }) });
    say();
    if (navigator.share) await navigator.share({ title: f.name, url: f.webViewLink });
    else { await navigator.clipboard.writeText(f.webViewLink); say('Đã chép link ' + f.name); }
  } catch (e) { if (e.name !== 'AbortError') say(e.message); }
}

async function chonCT() {
  try {
    say('Đang tải sổ đăng ký...');
    const so = await sheetCo(`'${$('ct').value}' in parents and name contains '_SODANGKY'`);
    if (!so) { docs = []; hien(); return say('Công trình này chưa có Google Sheet _SODANGKY (đặt file _SODANGKY, Excel hoặc Google Sheet, trong thư mục công trình trên Drive).'); }
    const v = await api(`https://sheets.googleapis.com/v4/spreadsheets/${so.id}/values/DANHMUC`);
    head = v.values[0]; soId = so.id; docs = parse(v.values); hien(); if (!docs.length) say('Sổ đăng ký đang trống, chưa có tài liệu nào.');
    await docInbox();
  } catch (e) { say(e.message); }
}

// Nhật ký ngày: ghi vào file CTxx-NK-NHATKY (Google Sheet) trang NGAY và KHOILUONG; chỉ thêm dòng mới, không sửa dòng cũ.
let nkId, nkDm = [], nkVc = [];
const nkApi = (id, p, opt) => api(`https://sheets.googleapis.com/v4/spreadsheets/${id}/${p}`, opt);
const nkKey = () => 'nk:' + $('ct').value; // bản nháp theo công trình, xóa khi lưu thành công
function nkNhap() { try { localStorage.setItem(nkKey(), JSON.stringify({ d: $('nkd').value, f: NK.map((_, i) => $('nk' + i).value), vc: nkVc })); } catch {} }
async function moNhatKy() {
  const ct = $('ct').value; nkDm = []; // người dùng đổi công trình giữa chừng thì bỏ kết quả của công trình cũ
  $('nk').hidden = false; $('nkf').hidden = true; nkId = null; nkVc = [];
  try {
    const f = await sheetCo(`name contains '${q($('ct').selectedOptions[0].text.split('_')[0])}-NK-NHATKY'`);
    if (!f) return $('nkmsg').textContent = 'Công trình này chưa có Google Sheet nhật ký (đặt file CTxx-NK-NHATKY, Excel hoặc Google Sheet, trong thư mục công trình trên Drive).';
    const dm = ((await nkApi(f.id, 'values/DANHMUC!A2:C')).values || []).filter(r => r[0]);
    if ($('ct').value !== ct) return;
    nkId = f.id; nkDm = dm;
    $('nkv').replaceChildren(...nkDm.map(([ma, ten, dv]) => new Option(`${ma} · ${ten}${dv ? ' (' + dv + ')' : ''}`, ma)));
    $('nkc').replaceChildren(...NK.flatMap(([ten, kieu], i) => {
      const l = document.createElement('label'); l.htmlFor = 'nk' + i; l.textContent = ten;
      const o = Array.isArray(kieu) ? document.createElement('select') : document.createElement('input');
      o.id = 'nk' + i;
      if (Array.isArray(kieu)) o.append(...kieu.map(x => new Option(x))); else if (kieu === 'n') Object.assign(o, { type: 'number', min: 0, step: 1, inputMode: 'numeric' });
      return [l, o];
    }));
    $('nkd').value = homNay(); $('nkmsg').textContent = ''; $('nkl').textContent = 'Lưu nhật ký vào ' + $('ct').selectedOptions[0].text;
    try { const n = JSON.parse(localStorage.getItem(nkKey())); if (n) { $('nkd').value = n.d; n.f.forEach((v, i) => $('nk' + i).value = v); $('nk0').dataset.sua = 1; nkVc = n.vc; $('nkmsg').textContent = 'Đã khôi phục phần nhật ký đang nhập dở.'; } } catch {}
    $('nkf').hidden = false; hienVc(); dienNk();
  } catch (e) { $('nkmsg').textContent = e.message; }
}
function hienVc() {
  $('nkds').replaceChildren(...nkVc.map((v, i) => {
    const el = document.createElement('div'); el.className = 'doc'; const t = document.createElement('span'); t.textContent = `${v.ma} · ${v.kl}`;
    const b = document.createElement('button'); b.className = 'phu'; b.textContent = 'Bỏ'; b.setAttribute('aria-label', 'Bỏ ' + t.textContent);
    b.onclick = () => { nkVc.splice(i, 1); hienVc(); nkNhap(); }; el.append(t, b); return el;
  }));
}
function themVc() {
  const kl = parseFloat($('nkk').value);
  if (!(kl > 0)) return $('nkmsg').textContent = 'Nhập khối lượng lớn hơn 0.';
  nkVc.push({ ma: $('nkv').value, kl }); $('nkk').value = ''; $('nkmsg').textContent = ''; hienVc(); nkNhap();
}
async function luuNhatKy() {
  if (!$('nkd').value) return $('nkmsg').textContent = 'Chọn ngày.';
  try {
    const ngay = serial($('nkd').value), cot = async tr => ((await nkApi(nkId, `values/${tr}!A:A?valueRenderOption=UNFORMATTED_VALUE`)).values || []);
    const [a, b] = await Promise.all([cot('NGAY'), cot('KHOILUONG')]);
    if (a.some(r => r[0] === ngay)) return $('nkmsg').textContent = `Ngày ${$('nkd').value} đã có trong nhật ký. Muốn sửa thì mở sheet sửa trực tiếp, app không ghi đè.`;
    const n = a.length + 1, ov = NK.map((_, i) => { const v = $('nk' + i).value; return v !== '' && $('nk' + i).type === 'number' ? +v : v; });
    const data = [{ range: `NGAY!A${n}:L${n}`, values: [[ngay, ...ov]] }];
    nkVc.forEach((v, i) => { const m = b.length + 1 + i; data.push({ range: `KHOILUONG!A${m}:B${m}`, values: [[ngay, v.ma]] }, { range: `KHOILUONG!E${m}`, values: [[v.kl]] }); }); // cột C, D là công thức, không ghi đè
    await nkApi(nkId, 'values:batchUpdate', json({ valueInputOption: 'RAW', data }));
    $('nkmsg').textContent = `Đã lưu nhật ký ngày ${$('nkd').value} (${nkVc.length} việc).`; nkVc = []; hienVc(); try { localStorage.removeItem(nkKey()); } catch {}
    if ($('nkd').value === homNay()) sotCap({ nk: true });
  } catch (e) { $('nkmsg').textContent = e.message; }
}

// Thông tin công trình: trang THONGTIN trong _SODANGKY của công trình (Nhóm = Liên hệ hoặc Thông tin). Sửa, xóa dòng thì làm trực tiếp trong Trang tính.
const TT = ['Nhóm', 'Tên', 'Chi tiết', 'Điện thoại'], ttMs = t => $('ttms').textContent = t || '';
let ttSo, ttCo;
async function taiTT() {
  ttMs(); ttSo = null; $('ttds').replaceChildren();
  try {
    const so = await sheetCo(`'${$('ct').value}' in parents and name contains '_SODANGKY'`);
    if (!so) return ttMs('Công trình này chưa có _SODANGKY.');
    ttCo = (await api(`https://sheets.googleapis.com/v4/spreadsheets/${so.id}?fields=sheets.properties.title`)).sheets.some(s => s.properties.title === 'THONGTIN');
    const v = ttCo ? (await api(`https://sheets.googleapis.com/v4/spreadsheets/${so.id}/values/THONGTIN`)).values : []; // đọc thì không ghi: trang chỉ được tạo khi bấm Thêm lần đầu
    ttSo = so.id;
    const dong = (v || []).slice(1).filter(r => r[1]);
    $('ttds').replaceChildren(...['Liên hệ', 'Thông tin'].flatMap(nhom => {
      const ds = dong.filter(r => (r[0] || 'Thông tin') === nhom);
      return ds.length ? [Object.assign(document.createElement('h3'), { textContent: nhom }), ...ds.map(([, ten, ct = '', dt = '']) => {
        const el = document.createElement('div'); el.className = 'doc';
        const th = document.createElement('div'), t = document.createElement('div'), s = document.createElement('small');
        t.textContent = ten; s.textContent = [ct, dt].filter(Boolean).join(' · '); th.append(t, s); el.append(th);
        const sdt = (dt.match(/\+?\d[\d .\-]{7,}\d/)?.[0] ?? '').replace(/[^\d+]/g, ''); // lấy số đầu tiên nếu ô ghi nhiều số
        if (sdt.length >= 6) { // chỉ giữ số và dấu +, nên đưa vào địa chỉ gọi/Zalo được
          const nut = document.createElement('div'); nut.className = 'nut';
          for (const [chu, href] of [['Gọi', 'tel:' + sdt], ['Zalo', 'https://zalo.me/' + sdt.replace('+', '')]]) {
            const l = document.createElement('a'); l.className = 'nutlk'; l.textContent = chu; l.href = href; l.setAttribute('aria-label', `${chu} ${ten}`);
            if (chu === 'Zalo') l.target = '_blank', l.rel = 'noopener'; nut.append(l);
          }
          el.append(nut);
        }
        return el;
      })] : [];
    }));
    if (!dong.length) ttMs('Chưa có thông tin nào. Thêm liên hệ hoặc thông tin đầu tiên bên dưới.');
  } catch (e) { ttMs(e.message); }
}
async function themTT() {
  const ten = $('ttten').value.trim();
  if (!ten) return ttMs('Gõ tên (người liên hệ hoặc tên mục như Địa chỉ).');
  if (!ttSo) return ttMs('Chưa mở được thông tin công trình này.');
  try {
    const sh = `https://sheets.googleapis.com/v4/spreadsheets/${ttSo}`;
    if (!ttCo) { // lần đầu: tạo trang THONGTIN rồi mới thêm
      await api(`${sh}:batchUpdate`, json({ requests: [{ addSheet: { properties: { title: 'THONGTIN' } } }] }));
      await api(`${sh}/values/THONGTIN!A1:D1?valueInputOption=RAW`, { ...json({ values: [TT] }), method: 'PUT' }); ttCo = true;
    }
    await api(`${sh}/values/THONGTIN:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, json({ values: [[$('ttnh').value, ten, $('ttct2').value.trim(), $('ttdt').value.trim()]] }));
    for (const id of ['ttten', 'ttct2', 'ttdt']) $(id).value = '';
    await taiTT(); ttMs('Đã thêm.');
  } catch (e) { ttMs(e.message); }
}

// Ảnh hiện trường: ảnh trong 00_INBOX (tải bằng app Google Drive) xếp vào 09_HINHANH/yyyy-mm/yyyy-mm-dd và đổi tên chuẩn. Chỉ di chuyển và đổi tên, không xóa, không nén.
// Ảnh nào chỉ đoán được ngày thì phải được xác nhận ngày; chưa có ngày thì ảnh ở lại INBOX, không xếp.
const doiTen = (f, ten) => api(`https://www.googleapis.com/drive/v3/files/${f.id}?fields=id`, { ...json({ name: ten }), method: 'PATCH' });
const TL = 'TAILIEU_'; // tiền tố đánh dấu ảnh chụp tài liệu (bản vẽ, biên bản), ghi nhớ ngay trên Drive
let anhDs = [];
const ddmm = d => d.split('-').reverse().slice(0, 2).join('/'), ngayAnh = f => f.nguon === 'doan' ? f.ngaySua || '' : f.ngay;
async function taiAnh() {
  const ct = $('ct').value; $('anx').hidden = true; anhDs = [];
  try {
    const cha = await thuMuc(ct, '00_INBOX');
    const ds = await ls(`'${cha}' in parents and mimeType contains 'image/'`, 'id,name,mimeType,createdTime,thumbnailLink,imageMediaMetadata(time)');
    if ($('ct').value !== ct) return;
    anhDs = ds.filter(f => !f.name.startsWith(TL)).map(f => ({ ...f, cha, ...ngayChup(f) })); // ảnh đã đánh dấu tài liệu thì không hiện ở đây
    const hm = new Map([...nkDm.map(([ma, ten]) => [ma, `${ma} · ${ten}`]), ['CHUNG', 'CHUNG · Toàn cảnh, việc chung'], ['ATLD', 'ATLD · An toàn lao động'], ['VATLIEU', 'VATLIEU · Vật liệu nhập về']]); // luôn có ba mục chung ở cuối
    $('anhm').replaceChildren(...[...hm].map(([ma, ten]) => new Option(ten, ma)));
    $('anms').textContent = anhDs.length ? `Có ${anhDs.length} ảnh chờ xếp trong 00_INBOX. Tick các ảnh cùng một hạng mục, chọn hạng mục, bấm Xếp; ảnh chưa tick vẫn ở lại cho lượt sau.` : 'Không có ảnh chờ xếp. Tải ảnh lên thư mục 00_INBOX của công trình bằng app Google Drive.';
    $('anx').hidden = !anhDs.length; veAnh(); sotCap({ anh: anhDs.length });
  } catch (e) { $('anms').textContent = e.message; }
}
function veAnh() {
  $('anl').replaceChildren(...anhDs.map(f => {
    const el = document.createElement('div'); el.className = 'doc anh';
    const lb = document.createElement('label'), cb = Object.assign(document.createElement('input'), { type: 'checkbox', checked: !!f.chon });
    cb.setAttribute('aria-label', 'Chọn ảnh ' + f.name); cb.onchange = () => { f.chon = cb.checked; tomTatAnh(); };
    const im = Object.assign(document.createElement('img'), { src: f.thumbnailLink || '', alt: f.name, loading: 'lazy', referrerPolicy: 'no-referrer' });
    im.onerror = async () => { im.onerror = null; try { const r = await fetch(f.thumbnailLink, { headers: { Authorization: 'Bearer ' + token } }); if (r.ok) im.src = URL.createObjectURL(await r.blob()); } catch {} }; // link ảnh nhỏ cần cookie Google; không có thì thử bằng mã đăng nhập của app
    lb.append(cb, im);
    const th = document.createElement('div'), s = document.createElement('small'); s.textContent = f.nguon === 'doan' ? `Chưa rõ ngày chụp (đoán ${ddmm(f.ngay)}). Bấm Dùng ngày này hoặc chọn ngày; chưa có ngày thì chưa xếp, ảnh ở lại INBOX.` : `Ngày chụp ${f.ngay.split('-').reverse().join('/')}`;
    th.append(s);
    if (f.nguon === 'doan') {
      const d = Object.assign(document.createElement('input'), { type: 'date', value: f.ngaySua || '' }); d.setAttribute('aria-label', 'Ngày chụp của ' + f.name);
      d.onchange = () => { f.ngaySua = d.value; tomTatAnh(); };
      const dung = Object.assign(document.createElement('button'), { className: 'phu', textContent: 'Dùng ngày này' }); dung.onclick = () => { d.value = f.ngaySua = f.ngay; tomTatAnh(); };
      th.append(d, dung);
    }
    const tl = Object.assign(document.createElement('button'), { className: 'phu', textContent: 'Đây là tài liệu' }); tl.setAttribute('aria-label', 'Chuyển ' + f.name + ' sang file chờ lưu của tài liệu');
    tl.onclick = async () => {
      try {
        await doiTen(f, TL + f.name); const moi = { ...f, name: TL + f.name }; nhan.push(moi); anhDs = anhDs.filter(x => x !== f); hienNhan(); veAnh();
        const hoan = Object.assign(document.createElement('button'), { className: 'phu', textContent: 'Hoàn tác' }); // bấm nhầm thì gỡ được
        hoan.onclick = async () => { try { await doiTen(moi, f.name); nhan = nhan.filter(x => x !== moi); anhDs.push(f); hienNhan(); veAnh(); $('anms').textContent = 'Đã hoàn tác.'; } catch (e) { $('anms').textContent = e.message; } };
        $('anms').replaceChildren(`Đã chuyển ${f.name} sang file chờ lưu của tài liệu. `, hoan);
      } catch (e) { $('anms').textContent = e.message; }
    };
    th.append(tl); el.append(lb, th); return el;
  }));
  tomTatAnh();
}
function tomTatAnh() {
  const c = anhDs.filter(f => f.chon), dem = {};
  for (const f of c) { if (ngayAnh(f)) dem[ddmm(ngayAnh(f))] = (dem[ddmm(ngayAnh(f))] || 0) + 1; }
  const co = Object.values(dem).reduce((s, n) => s + n, 0), chua = c.length - co;
  $('anor').textContent = !c.length ? 'Chưa tick ảnh nào.' : (co ? `Sẽ xếp ${co} ảnh: ` + Object.entries(dem).map(([k, n]) => `${k} (${n})`).join(', ') : 'Chưa có ảnh nào đủ ngày để xếp.') + (chua ? ` ${chua} ảnh chưa có ngày sẽ ở lại INBOX.` : '');
  $('anb').disabled = !co;
  $('and').hidden = !c.some(f => f.nguon === 'doan' && !f.ngaySua);
}
async function xepAnh() {
  const ct = $('ct').value, ma = $('ct').selectedOptions[0].text.split('_')[0], hm = $('anhm').value, mota = $('anmt').value, ds = anhDs.filter(f => f.chon), nhom = {};
  for (const f of ds) if (ngayAnh(f)) (nhom[ngayAnh(f)] ||= []).push(f); // ảnh chưa có ngày không động tới: ở lại INBOX
  let xong = 0, loi = '';
  const dem = Object.values(nhom).flat().length;
  const dich = f => api(`https://www.googleapis.com/drive/v3/files/${f.id}?addParents=${f.dir}&removeParents=${f.cha}&fields=id`, { ...json({ name: f.moi }), method: 'PATCH' });
  try {
    for (const [ngay, fs] of Object.entries(nhom).sort()) {
      const dir = await thuMuc(ct, `09_HINHANH/${ngay.slice(0, 7)}/${ngay}`);
      let stt = sttTiep(ma, ngay, (await ls(`'${dir}' in parents`)).map(f => f.name));
      for (const f of fs.sort((x, y) => x.name.localeCompare(y.name))) { // cùng ngày giữ thứ tự tên file (tên Zalo bắt đầu bằng giờ)
        await dich({ ...f, dir, moi: tenAnh(ma, ngay, stt++, hm, mota, f.name) });
        $('anb').textContent = `Đang xếp ${++xong}/${dem}`;
      }
    }
    $('anmt').value = '';
  } catch (e) { loi = ' Dừng giữa chừng: ' + e.message; }
  await taiAnh(); $('anms').textContent = `Đã xếp ${xong}/${dem} ảnh vào 09_HINHANH.${loi} ` + $('anms').textContent;
}

// ---- Hôm nay còn sót gì: gom việc, giấy tờ, nhật ký, ảnh vào một chỗ; nhắc 17h mỗi ngày qua Google Lịch (không có máy chủ nên Lịch chỉ nhắc mở app, nội dung xem trong app) ----
const sotNgay = homNay();
async function banTinNut() { try { $('sotb').textContent = (await lichTin()).length ? 'Tắt nhắc 17h' : 'Nhắc tôi lúc 17h mỗi ngày'; } catch {} }
let sotCt = [], sotXong = false; // mỗi công trình: {id, ma, nk: true|false|null, anh: số ảnh|null}; null = chưa kiểm tra được
const maCT = c => c.name.split('_')[0];
async function sotQuet(cts) { // quét mọi công trình, chỉ đọc (không tạo thư mục, không chuyển Excel thành Sheet)
  sotXong = false; const ngay = serial(homNay());
  sotCt = await Promise.all(cts.map(async c => {
    const r = { id: c.id, ma: maCT(c), nk: null, anh: null };
    try { // chưa có Google Sheet nhật ký thì để null: không biết thì không báo ổn
      const [f] = await ls(`name contains '${q(r.ma)}-NK-NHATKY' and mimeType='${SHEET}'`, 'id'); // file nằm sâu (03_CHATLUONG/NK_NHATKY_TC), tìm theo tên như moNhatKy
      if (f) r.nk = ((await nkApi(f.id, 'values/NGAY!A:A?valueRenderOption=UNFORMATTED_VALUE')).values || []).some(v => v[0] === ngay);
    } catch {}
    try {
      const [h] = await ls(`'${c.id}' in parents and mimeType='${FOLDER}' and name='00_INBOX'`, 'id');
      r.anh = h ? (await ls(`'${h.id}' in parents and mimeType contains 'image/'`, 'id,name')).filter(f => !f.name.startsWith(TL)).length : 0;
    } catch {}
    return r;
  }));
  sotXong = true; veSot();
}
function veSot() {
  const hom = homNay(), nhom = chia(viec, hom), han = hanDs.filter(d => isNaN(d.n) || d.n <= 7);
  const dong = [ // việc quá hạn trước, ảnh sau cùng
    [nhom.quaHan.length + nhom.sapDen.filter(t => t.n === 0).length, (x => `${x} việc quá hạn hoặc đến hạn hôm nay`), '#viec'],
    [han.length, (x => `${x} giấy tờ sắp hết hạn (trong 7 ngày) hoặc đã quá hạn`), '#han'],
    [hanLoi.length, () => 'Chưa kiểm tra được hạn giấy tờ của: ' + hanLoi.join(', '), '#han'],
    ...sotCt.filter(c => c.nk === false).map(c => [1, () => c.ma + ' chưa ghi nhật ký hôm nay', '#nk', c.id]),
    ...sotCt.filter(c => c.nk === null).map(c => [1, () => 'Chưa kiểm tra được nhật ký ' + c.ma + ' (chưa có Google Sheet nhật ký hoặc mất sóng)', '#nk', c.id]),
    ...sotCt.filter(c => c.anh === null).map(c => [1, () => 'Chưa kiểm tra được ảnh chờ của ' + c.ma, '#anh', c.id]),
    ...sotCt.filter(c => c.anh > 0).map(c => [c.anh, x => `${c.ma}: ${x} ảnh chờ xếp`, '#anh', c.id]),
  ].filter(([n]) => n);
  $('sotds').replaceChildren(...(dong.length ? dong.map(([n, chu, href, id]) => {
    const l = document.createElement('a'); l.className = 'nutlk'; l.href = href; l.textContent = chu(n);
    if (id) l.onclick = () => { if ($('ct').value !== id) { $('ct').value = id; doiCT(); } }; // nhảy tới đúng công trình
    return l;
  }) : [Object.assign(document.createElement('p'), { textContent: sotXong ? 'Hôm nay không còn gì sót.' : 'Đang kiểm tra các công trình...' })]));
}
const sotCap = kq => { const c = sotCt.find(x => x.id === $('ct').value); if (c) { Object.assign(c, kq); veSot(); } };
const BAN_TIN = 'Sổ tay kỹ sư: hôm nay còn sót gì';
const lichTin = async () => (await api(`${LICH}?q=${encodeURIComponent(BAN_TIN)}&maxResults=10`)).items?.filter(e => e.status !== 'cancelled' && e.summary === BAN_TIN) || [];
async function banTin() { // bật hoặc tắt nhắc 17h thứ 2 đến thứ 7; bật chỉ tạo một lần
  try {
    const co = await lichTin();
    if (co.length) { for (const e of co) await api(`${LICH}/${e.id}`, { method: 'DELETE' }); return $('sotms').textContent = 'Đã tắt nhắc 17h.'; }
    const tz = 'Asia/Ho_Chi_Minh', hom = new Date(), bd = hom.getHours() >= 17 ? cong(homNay(), 1) : homNay(), url = location.origin + location.pathname;
    await api(LICH, json({ summary: BAN_TIN, description: 'Mở app xem việc còn sót: ' + url, source: { title: 'Mở Sổ tay kỹ sư', url },
      start: { dateTime: bd + 'T17:00:00', timeZone: tz }, end: { dateTime: bd + 'T17:10:00', timeZone: tz }, recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA'],
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] } }));
    $('sotms').textContent = 'Đã bật nhắc 17h thứ 2 đến thứ 7 trên Google Lịch. Tắt bằng chính nút này.';
  } catch (e) { $('sotms').textContent = e.message; }
}

// ---- Thời tiết công trình: vị trí lưu trên máy theo từng công trình (ponytail: chưa đồng bộ giữa máy; muốn dùng chung thì ghi vào THONGTIN) ----
let tqDs = [];
const tqKey = () => 'vt:' + $('ct').value, tqMs = t => $('tqms').textContent = t || '';
function veTT() {
  const ten = $('ct').selectedOptions[0]?.text, hom = homNay();
  const cb = canhBao(tqDs, viec.filter(t => !t.ct || t.ct === 'Chung' || t.ct === ten).map(t => ({ ...t, n: conLai(t.han, hom) })));
  const p = t => Object.assign(document.createElement('p'), { textContent: t });
  $('tqd').replaceChildren(...tqDs.map((d, i) => p(`${NGAY[i]}: ${tomTat(d)}`)), ...cb.map(t => Object.assign(p('Cảnh báo: ' + t), { className: 'cb' })));
}
async function taiTQ() {
  const ct = $('ct').value; tqDs = []; tqMs(); veTT();
  let vt; try { vt = localStorage.getItem(tqKey()); } catch {}
  $('tqv').value = vt || ''; const vi = viTri(vt);
  if (!vi) return tqMs('Chưa có vị trí công trình. Bấm "Lấy vị trí máy" khi đang ở công trường, hoặc gõ tọa độ.');
  try {
    const r = await fetch(urlTT(...vi)), j = await r.json();
    if (!r.ok) throw new Error(j.reason || r.status);
    if ($('ct').value !== ct) return;
    tqDs = parseTT(j);
  } catch (e) { tqMs('Không lấy được thời tiết: ' + e.message); }
  veTT(); dienNk();
}
function dienNk() { // nhật ký hôm nay: điền sẵn thời tiết theo dự báo, một lần, không đè lên chữ người dùng đã nhập hoặc nháp đã khôi phục
  const o = $('nk0'), v = tqDs[0] && nhatKy(tqDs[0]);
  if (!v || !o || $('nkf').hidden || $('nkd').value !== homNay() || o.dataset.sua || o.dataset.tt) return;
  $('nk0').value = $('nk1').value = v; o.dataset.tt = 1;
  if (!$('nkmsg').textContent) $('nkmsg').textContent = 'Thời tiết đã điền theo dự báo hôm nay, sửa nếu khác.';
}
$('nkc').onchange = e => e.target.dataset.sua = 1;
$('tql').onclick = () => {
  const vi = viTri($('tqv').value); if (!vi) return tqMs('Gõ vĩ độ rồi kinh độ, ví dụ 10.77, 106.70.');
  try { localStorage.setItem(tqKey(), vi.join(', ')); } catch { return tqMs('Máy không cho lưu vị trí.'); }
  taiTQ();
};
$('tqg').onclick = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => { $('tqv').value = `${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`; $('tql').click(); }, () => tqMs('Không lấy được vị trí máy. Hãy cho phép vị trí hoặc gõ tọa độ.')) : tqMs('Máy không hỗ trợ lấy vị trí.');

// Nhớ đăng nhập: giữ token (~1 giờ) trên máy để mở lại app khỏi đăng nhập; hết hạn thì xin lại âm thầm, không được mới hiện nút.
// ponytail: không có máy chủ nên không có refresh token, mỗi giờ phải xin lại một lần.
const KHO = 'dn', dangNhap = (opt = {}, callback = vao) => google.accounts.oauth2.initTokenClient({
  client_id: CLIENT_ID,
  scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar.events', // quyền ghi: đổi quyền chia sẻ khi Gửi, lưu bản mới, ghi Rev vào sổ, lịch nhắc việc
  callback, error_callback: () => {},
}).requestAccessToken(opt);
async function vao(resp) {
  if (resp.error) return say('Đăng nhập không được: ' + resp.error);
  token = resp.access_token; $('vao').hidden = true;
  try { localStorage.setItem(KHO, JSON.stringify({ token, het: resp.het ?? Date.now() + (resp.expires_in - 60) * 1000 })); } catch {}
  try {
    const [goc] = await ls(`name='${ROOT_NAME}' and mimeType='${FOLDER}'`);
    if (!goc) return say(`Không thấy thư mục ${ROOT_NAME} trên Drive.`);
    const cts = (await ls(`'${goc.id}' in parents and mimeType='${FOLDER}' and name starts with 'CT'`)).sort((a, b) => a.name.localeCompare(b.name));
    $('ct').replaceChildren(...cts.map(c => new Option(c.name, c.id))); $('loc').hidden = false; $('cts').hidden = false; $('sot').hidden = false; $('tq').hidden = false;
    try { const k = localStorage.getItem('ct'); if ([...$('ct').options].some(o => o.value === k)) $('ct').value = k; } catch {} // nhớ công trình đang làm
    $('vct').replaceChildren(new Option('Chung'), ...cts.map(c => new Option(c.name))); $('viec').hidden = false;
    viecId = await soViec(goc.id); await taiViec(); taiHan(cts); sotQuet(cts);
    banTinNut();
    $('tt').hidden = false; $('anh').hidden = false;
    doiCT();
  } catch (e) { say(e.message); }
}

// Một ô chọn công trình chung cho cả trang: tài liệu, thông tin, nhật ký cùng theo, nhớ lần chọn cuối.
function doiCT() {
  try { localStorage.setItem('ct', $('ct').value); } catch {}
  $('vct').value = $('ct').selectedOptions[0].text; // việc mới mặc định thuộc công trình đang chọn (vẫn đổi được sang Chung)
  chonCT(); moNhatKy().then(taiAnh); taiTT(); taiTQ();
}
// Khóa nút trong lúc đang ghi: bấm hai lần khi sóng yếu không ghi hai dòng (hai sự kiện Lịch).
const khoa = (id, fn, sau) => async () => {
  const b = $(id), chu = b.textContent; if (b.disabled) return;
  b.disabled = true; b.textContent = 'Đang lưu...';
  try { await fn(); } finally { b.disabled = false; b.textContent = chu; sau?.(); }
};

$('vao').onclick = () => {
  if (!CLIENT_ID) return say('Chưa điền CLIENT_ID trong config.js (xem README).');
  dangNhap();
};
try { // mở lại app: còn token thì dùng luôn, hết hạn thì thử xin lại không hỏi gì
  const luu = JSON.parse(localStorage.getItem(KHO));
  if (luu?.het > Date.now()) vao({ access_token: luu.token, het: luu.het });
  else if (luu) addEventListener('load', () => dangNhap({ prompt: 'none' }, r => r.error || vao(r)));
} catch {}
$('ct').onchange = doiCT;
$('ttt').onclick = khoa('ttt', themTT);
$('nkt').onclick = themVc;
$('anb').onclick = khoa('anb', xepAnh, tomTatAnh);
document.onvisibilitychange = () => { if (!document.hidden && sotNgay && sotNgay !== homNay()) location.reload(); }; // mở lại app sang ngày mới thì tải lại
$('sotb').onclick = khoa('sotb', banTin, banTinNut);
$('anc').onclick = () => { const tat = anhDs.every(f => f.chon); anhDs.forEach(f => f.chon = !tat); veAnh(); };
$('and').onclick = () => { anhDs.forEach(f => { if (f.chon && f.nguon === 'doan' && !f.ngaySua) f.ngaySua = f.ngay; }); veAnh(); };
$('nkl').onclick = khoa('nkl', luuNhatKy);
$('nkf').oninput = nkNhap;
$('q').oninput = hien;
$('vthem').onclick = khoa('vthem', themViec);
docNhan();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
