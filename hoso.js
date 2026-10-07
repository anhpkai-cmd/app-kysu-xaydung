// Hồ sơ nghiệm thu, hoàn công theo từng công việc (mã trong trang DANHMUC của file nhật ký CTxx-NK-NHATKY).
// Mỗi công việc có cùng danh sách hồ sơ cần có. "Biên bản nghiệm thu" và "Nhật ký thi công" app tự tích từ NGHIEMTHU và DANHMUC; các mục còn lại anh chọn
// Chưa / Có / Không cần. Mỗi lần chọn thêm một dòng vào trang HOSO (Ngày, Mã công việc, Hồ sơ, Tình trạng); dòng sau cùng của mỗi mục là tình trạng hiện tại.
// ponytail: danh sách hồ sơ ghi cứng, chưa chia theo loại công việc (mục không liên quan thì chọn Không cần); chưa tự soát ảnh, bản vẽ trong Drive.
import { serial } from './nhatky.js';
import { iso } from './viec.js';

export const HS = ['Biên bản nghiệm thu', 'Kết quả thí nghiệm vật liệu, mẫu', 'Bản vẽ hoàn công', 'Ảnh thi công', 'Nhật ký thi công'];
export const TAY = HS.slice(1, 4); // anh tự chọn
const TT = ['Chưa', 'Có', 'Không cần'], COT = ['Ngày', 'Mã công việc', 'Hồ sơ', 'Tình trạng'];
const CHUNG = ['CHUNG', 'ATLD', 'VATLIEU']; // mã không phải công việc thi công

// cv: DANHMUC, nt: NGHIEMTHU, hs: HOSO (giá trị thô, dòng đầu là tiêu đề). Trả về mỗi công việc: các mục { ten, tt: 'Có' | 'Không cần' | 'Chưa', tu: tự tích }.
export function docHs(cv, nt, hs) {
  const bb = new Set((nt || []).slice(1).filter(r => r[4] === 'Đạt').map(r => r[1])), tay = new Map();
  for (const r of (hs || []).slice(1)) if (r[1] && TT.includes(r[3])) tay.set(r[1] + '|' + r[2], r[3]); // dòng sau cùng thắng
  return (cv || []).slice(1).filter(r => r[0] && !CHUNG.includes(r[0])).map(r => {
    const muc = HS.map(ten => ten === HS[0] ? { ten, tt: bb.has(r[0]) ? 'Có' : 'Chưa', tu: true } : ten === HS[4] ? { ten, tt: +r[6] > 0 ? 'Có' : 'Chưa', tu: true }
      : { ten, tt: tay.get(r[0] + '|' + ten) || 'Chưa', tu: false });
    return { ma: r[0], ten: r[1] ?? '', kt: iso(r[5] ?? ''), muc, du: muc.filter(m => m.tt !== 'Chưa').length };
  });
}

let h, ds = [], loc = false, fifo = Promise.resolve(); // loc: chỉ hiện việc còn thiếu hồ sơ; fifo: các lần ghi nối đuôi nhau
const $ = id => document.getElementById(id), ms = t => $('hsms').textContent = t ?? '';
const tao = (tag, chu, lop) => Object.assign(document.createElement(tag), { textContent: chu ?? '', className: lop ?? '' });
const sh = p => `https://sheets.googleapis.com/v4/spreadsheets/${h.id}${p}`;

function ve() {
  const du = ds.filter(x => x.du === HS.length).length, hien = sapXep(ds).filter(x => !loc || x.du < HS.length);
  ms(ds.length ? `${du}/${ds.length} công việc đủ hồ sơ.` : 'Chưa có công việc nào trong trang DANHMUC của file nhật ký.');
  $('hsds').replaceChildren(...hien.map(x => {
    const d = tao('details'), s = tao('summary', `${x.ma} · ${x.ten} (${x.du}/${HS.length})`);
    d.append(s, ...x.muc.map(m => {
      const el = tao('div', '', 'doc'), l = tao('span', m.ten + (m.tu ? ' (app tự tích)' : '')); el.append(l);
      if (m.tu) el.append(tao('b', m.tt === 'Có' ? 'Có' : 'Chưa'));
      else {
        const o = tao('select'); o.setAttribute('aria-label', `${m.ten}: ${x.ma}`); o.style.cssText = 'flex:none;width:9em'; o.append(...TT.map(t => new Option(t))); o.value = m.tt; // ô chọn cố định chiều ngang (máy tính không giãn hết hàng, tên mục giữ một dòng)
        o.onchange = async () => { o.disabled = true; try { await ghi(x, m, o.value); } catch (e) { ms(e.message); o.value = m.tt; } o.disabled = false; };
        el.append(o);
      }
      return el;
    }));
    d.open = x.open; d.ontoggle = () => { x.open = d.open; };
    return d;
  }));
}

// ham: { api, json, id (file nhật ký) } từ app.js
export async function moHS(ham) {
  const mo = new Set(h?.id === ham.id ? ds.filter(x => x.open).map(x => x.ma) : []); // sau mỗi lần ghi, mục đang mở vẫn mở
  h = ham; ds = []; $('hs').hidden = false; $('hsloc').onchange = e => { loc = e.target.checked; ve(); }; $('hsds').replaceChildren();
  if (!h.id) return ms('Chưa mở được file nhật ký của công trình này.');
  try {
    const id = h.id, co = (await h.api(sh('?fields=sheets.properties.title'))).sheets.map(s => s.properties.title).filter(t => ['DANHMUC', 'NGHIEMTHU', 'HOSO'].includes(t));
    const v = Object.fromEntries(await Promise.all(co.map(async t => [t, (await h.api(sh(`/values/${t}?valueRenderOption=UNFORMATTED_VALUE`))).values || []])));
    if (h.id !== id) return; // đổi công trình giữa chừng thì bỏ
    ds = docHs(v.DANHMUC, v.NGHIEMTHU, v.HOSO).map(x => ({ ...x, open: mo.has(x.ma) })); ve();
  } catch (e) { ms('Không đọc được hồ sơ: ' + e.message); }
}

// Việc đã nghiệm thu mà còn thiếu hồ sơ lên đầu (chỉ còn đi gom giấy), rồi đến việc chưa nghiệm thu, việc đủ hồ sơ xuống cuối; cùng nhóm thì theo ngày kết thúc.
export const sapXep = ds => [...ds].sort((a, b) => (nhom(a) - nhom(b)) || String(a.kt || '9').localeCompare(String(b.kt || '9')));
const nhom = x => x.du === HS.length ? 2 : x.muc[0].tt === 'Có' ? 0 : 1;

// Trang HOSO chưa có thì tạo cùng tiêu đề (chỉ khi ghi); mỗi lần chọn thêm một dòng, không sửa dòng cũ.
const ghi = (x, m, tt) => fifo = fifo.catch(() => {}).then(() => ghiMot(x, m, tt)); // hai lần chọn liền nhau (lần đầu chưa có trang HOSO) không cùng đi tạo trang
async function ghiMot(x, m, tt) {
  const co = (await h.api(sh('?fields=sheets.properties.title'))).sheets.some(s => s.properties.title === 'HOSO');
  if (!co) {
    await h.api(sh(':batchUpdate'), h.json({ requests: [{ addSheet: { properties: { title: 'HOSO' } } }] }));
    await h.api(sh('/values/HOSO!A1?valueInputOption=RAW'), { ...h.json({ values: [COT] }), method: 'PUT' });
  }
  await h.api(sh('/values/HOSO!A:A:append?valueInputOption=RAW&insertDataOption=OVERWRITE'), h.json({ values: [[serial(new Date().toLocaleDateString('sv-SE')), x.ma, m.ten, tt]] }));
  await moHS(h); ms(`Đã ghi: ${x.ma}, ${m.ten}: ${tt}.`);
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('hoso.js')) { // chạy: node hoso.js
  const a = await import('node:assert/strict');
  const cv = [['Mã'], ['CB-1', 'Cốt thép', 'm2', 0, '01/10/2026', '05/10/2026', 12], ['HM1-1', 'Đổ bê tông', 'm3', 0, '', '', 0], ['CHUNG', 'Việc chung'], ['', 'trống'], ['ATLD', 'An toàn']];
  const nt = [['Ngày'], [1, 'CB-1', 'x', '', 'Đạt'], [1, 'HM1-1', 'x', '', 'Hẹn lại']];
  const hs = [['Ngày'], [1, 'CB-1', HS[1], 'Có'], [2, 'CB-1', HS[2], 'Có'], [3, 'CB-1', HS[2], 'Chưa'], [4, 'CB-1', HS[3], 'Không cần'], [5, 'CB-1', HS[3], 'sai chính tả'], [6, 'KHAC', HS[1], 'Có']];
  const r = docHs(cv, nt, hs);
  a.deepEqual(r.map(x => x.ma), ['CB-1', 'HM1-1']); // mã chung, dòng trống bỏ
  a.deepEqual(r[0].muc.map(m => m.tt), ['Có', 'Có', 'Chưa', 'Không cần', 'Có']); // dòng sau cùng thắng (Bản vẽ: Có rồi Chưa); tình trạng lạ bị bỏ qua nên Ảnh vẫn Không cần
  a.equal(r[0].du, 4); a.deepEqual(r[1].muc.map(m => m.tt), ['Chưa', 'Chưa', 'Chưa', 'Chưa', 'Chưa']); // Hẹn lại không tính là đã nghiệm thu; Lũy kế 0 chưa có nhật ký
  a.deepEqual(sapXep([{ ma: 'A', du: 5, muc: [{ tt: 'Có' }], kt: '2026-01-01' }, { ma: 'B', du: 1, muc: [{ tt: 'Chưa' }], kt: '2026-02-01' }, { ma: 'C', du: 2, muc: [{ tt: 'Có' }], kt: '2026-03-01' }, { ma: 'D', du: 1, muc: [{ tt: 'Chưa' }], kt: '' }]).map(x => x.ma), ['C', 'B', 'D', 'A']); // đã nghiệm thu thiếu giấy, chưa nghiệm thu (không ngày xuống cuối), đủ
  a.deepEqual(docHs(undefined, undefined, undefined), []); a.equal(r[0].kt, '2026-10-05'); a.deepEqual(TAY, [HS[1], HS[2], HS[3]]);
  console.log('ok');
}
