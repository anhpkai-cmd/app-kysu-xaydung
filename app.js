import { CLIENT_ID, ROOT_NAME } from './config.js';
import { parse, loc, revTiep, revHopLe, tenChuan } from './register.js';

const $ = id => document.getElementById(id);
const FOLDER = 'application/vnd.google-apps.folder', SHEET = 'application/vnd.google-apps.spreadsheet';
let token, docs = [], head = [], soId, nhan = []; // nhan: file nhận từ Zalo/ứng dụng khác (xem sw.js)

const api = async (url, opt = {}) => {
  const r = await fetch(url, { ...opt, headers: { Authorization: 'Bearer ' + token, ...opt.headers } });
  if (!r.ok) throw new Error(r.status === 401 ? 'Phiên đăng nhập hết hạn, bấm Đăng nhập lại.' : r.status === 403 ? 'Google không cho phép (không đủ quyền với file này).' : 'Lỗi Google ' + r.status);
  return r.json();
};
const ls = async q => (await api('https://www.googleapis.com/drive/v3/files?pageSize=1000&fields=files(id,name,mimeType,webViewLink)&q=' + encodeURIComponent(q + ' and trashed=false'))).files;
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
    const m = document.createElement('button'); m.className = 'phu'; m.textContent = 'Bản mới'; m.setAttribute('aria-label', 'Tải bản mới của ' + d.ma);
    m.onclick = () => chonFile(d);
    const th = document.createElement('div'); th.append(b, t, s);
    const nut = document.createElement('div'); nut.className = 'nut'; nut.append(g, m);
    el.append(th, nut);
    return el;
  }));
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
    say('Đang tải lên...'); buoc = 'tải file lên';
    // ponytail: tải một lần (multipart), ổn đến vài chục MB; file lớn hơn cần tải theo đợt (resumable).
    const b = 'ranh' + Date.now();
    const moi = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
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
    if (file.khoa) { await (await caches.open('chia-se')).delete(file.khoa); nhan = nhan.filter(f => f !== file); hienNhan(); }
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
function hienNhan() {
  $('nhan').hidden = !nhan.length;
  $('nhan').textContent = nhan.length ? `Đã nhận ${nhan.length} file: ${nhan.map(f => f.name).join(', ')}. Đăng nhập, rồi bấm “Bản mới” ở đúng tài liệu để lưu.` : '';
}

// Gửi link bản hiện hành: tìm file Drive có tên bắt đầu bằng "<mã>-<rev>", mở quyền "ai có link đều xem được" (sau khi hỏi), rồi mở bảng chia sẻ của máy.
async function gui(d) {
  try {
    const found = (await ls(`name contains '${d.ma}-${d.rev}'`)).filter(f => f.name.startsWith(`${d.ma}-${d.rev}`));
    if (!found.length) return say(`Chưa thấy file ${d.ma}-${d.rev} trên Drive (sổ ghi ${d.rev} nhưng file chưa được đổi tên chuẩn?).`);
    const f = found.find(x => x.name.toLowerCase().endsWith('.pdf')) || found[0]; // cùng mã cùng rev có thể có .xlsx và .pdf: gửi đi thì ưu tiên PDF
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
    const [so] = await ls(`'${$('ct').value}' in parents and mimeType='${SHEET}' and name contains '_SODANGKY'`);
    if (!so) { docs = []; hien(); return say('Công trình này chưa có Google Sheet _SODANGKY (mở file Excel trên Drive → Lưu thành Google Trang tính).'); }
    const v = await api(`https://sheets.googleapis.com/v4/spreadsheets/${so.id}/values/DANHMUC`);
    head = v.values[0]; soId = so.id; docs = parse(v.values); hien(); if (!docs.length) say('Sổ đăng ký đang trống, chưa có tài liệu nào.');
  } catch (e) { say(e.message); }
}

async function vao(resp) {
  if (resp.error) return say('Đăng nhập không được: ' + resp.error);
  token = resp.access_token; $('vao').hidden = true;
  try {
    const [goc] = await ls(`name='${ROOT_NAME}' and mimeType='${FOLDER}'`);
    if (!goc) return say(`Không thấy thư mục ${ROOT_NAME} trên Drive.`);
    const cts = (await ls(`'${goc.id}' in parents and mimeType='${FOLDER}' and name starts with 'CT'`)).sort((a, b) => a.name.localeCompare(b.name));
    $('ct').replaceChildren(...cts.map(c => new Option(c.name, c.id))); $('loc').hidden = false;
    chonCT();
  } catch (e) { say(e.message); }
}

$('vao').onclick = () => {
  if (!CLIENT_ID) return say('Chưa điền CLIENT_ID trong config.js (xem README).');
  google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets', // quyền ghi: đổi quyền chia sẻ khi Gửi, lưu bản mới, ghi Rev vào sổ
    callback: vao,
  }).requestAccessToken();
};
$('ct').onchange = chonCT;
$('q').oninput = hien;
docNhan();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
