// Ảnh hiện trường: tên chuẩn và ngày chụp. Không phụ thuộc trình duyệt. Chạy: node anh.js
// Ngày chụp: {ngay, nguon}. nguon = 'exif' (Drive đọc sẵn) | 'zalo' (mốc ms đầu tên file Zalo, chỉ nhận khi hợp lý) | 'doan' (ngày tải lên, chỉ là đoán: app phải hỏi người dùng).
export const ngayChup = (f, now = Date.now()) => {
  const exif = /^(\d{4}):(\d{2}):(\d{2})/.exec(f.imageMediaMetadata?.time ?? '');
  if (exif) return { ngay: exif.slice(1).join('-'), nguon: 'exif' };
  const vn = ms => new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const z = +(/^(\d{13})/.exec(f.name)?.[1] ?? 0);
  if (z >= Date.UTC(2020, 0, 1) && z <= now + 864e5) return { ngay: vn(z), nguon: 'zalo' }; // 13 chữ số khác (số điện thoại...) không phải mốc giờ
  return { ngay: vn(Date.parse(f.createdTime)), nguon: 'doan' };
};
const slug = s => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').split(/[^A-Za-z0-9]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('').slice(0, 40);
// [MaCT]-HA-[Ngay]-[STT]_[MaHangMuc]_[MoTa].ext
export const tenAnh = (ma, ngay, stt, hm, mota, tenFile) =>
  `${ma}-HA-${ngay.replaceAll('-', '')}-${String(stt).padStart(3, '0')}_${hm}${slug(mota) ? '_' + slug(mota) : ''}${(tenFile.match(/\.[A-Za-z0-9]{1,5}$/) || [''])[0].toLowerCase()}`;
// số thứ tự tiếp theo trong ngày, tính từ tên file đã có
export const sttTiep = (ma, ngay, tenCo) => 1 + Math.max(0, ...tenCo.map(t => +(new RegExp(`^${ma}-HA-${ngay.replaceAll('-', '')}-(\\d{3})`).exec(t)?.[1] ?? 0)));

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('anh.js')) {
  const a = await import('node:assert/strict');
  const T = Date.UTC(2026, 9, 6);
  a.deepEqual(ngayChup({ name: 'x.jpg', imageMediaMetadata: { time: '2026:10:06 08:15:00' } }, T), { ngay: '2026-10-06', nguon: 'exif' });
  a.deepEqual(ngayChup({ name: '1782789646584_abc.jpg', createdTime: '2026-10-07T00:00:00Z' }, 1782800000000), { ngay: '2026-06-30', nguon: 'zalo' });
  a.deepEqual(ngayChup({ name: 'IMG.heic', createdTime: '2026-10-05T18:30:00Z' }, T), { ngay: '2026-10-06', nguon: 'doan' }); // 01:30 ngày 06 giờ Việt Nam
  a.equal(ngayChup({ name: '0905123456789.jpg', createdTime: '2026-10-05T18:30:00Z' }, T).nguon, 'doan'); // số điện thoại không phải mốc giờ (ra năm 1998)
  a.equal(ngayChup({ name: '9999999999999.jpg', createdTime: '2026-10-05T18:30:00Z' }, T).nguon, 'doan'); // tương lai xa
  a.equal(tenAnh('CT01', '2026-10-06', 1, 'HM2-1.1', 'Phá dỡ nền bệ', 'a.JPG'), 'CT01-HA-20261006-001_HM2-1.1_PhaDoNenBe.jpg');
  a.equal(tenAnh('CT01', '2026-10-06', 12, 'CHUNG', '', 'a.heic'), 'CT01-HA-20261006-012_CHUNG.heic');
  a.equal(sttTiep('CT01', '2026-10-06', ['CT01-HA-20261006-001_X.jpg', 'CT01-HA-20261006-007_Y.jpg', 'CT01-HA-20261005-009_Z.jpg']), 8);
  a.equal(sttTiep('CT01', '2026-10-06', []), 1);
  console.log('ok');
}
