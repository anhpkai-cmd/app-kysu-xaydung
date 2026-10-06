import { CLIENT_ID, ROOT_NAME } from './config.js';
import { parse, loc } from './register.js';

const $ = id => document.getElementById(id);
const FOLDER = 'application/vnd.google-apps.folder', SHEET = 'application/vnd.google-apps.spreadsheet';
let token, docs = [], files = [];

const api = async url => {
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) throw new Error(r.status === 401 ? 'Phiên đăng nhập hết hạn, bấm Đăng nhập lại.' : 'Lỗi Google ' + r.status);
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
    const th = document.createElement('div'); th.append(b, t, s);
    el.append(th, g);
    return el;
  }));
}

// Gửi link bản hiện hành: tìm file Drive có tên bắt đầu bằng "<mã>-<rev>" rồi mở bảng chia sẻ của máy.
async function gui(d) {
  try {
    const found = (await ls(`name contains '${d.ma}-${d.rev}'`)).filter(f => f.name.startsWith(`${d.ma}-${d.rev}`));
    if (!found.length) return say(`Chưa thấy file ${d.ma}-${d.rev} trên Drive (sổ ghi ${d.rev} nhưng file chưa được đổi tên chuẩn?).`);
    const f = found[0];
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
    docs = parse(v.values); hien(); if (!docs.length) say('Sổ đăng ký đang trống, chưa có tài liệu nào.');
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
    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly',
    callback: vao,
  }).requestAccessToken();
};
$('ct').onchange = chonCT;
$('q').oninput = hien;
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
