// Ảnh hiện trường: tên chuẩn và ngày chụp. Không phụ thuộc trình duyệt. Chạy: node anh.js
// Ngày chụp lấy theo thứ tự: EXIF (Drive đọc sẵn), mốc ms ở đầu tên file Zalo, cuối cùng là ngày tải lên Drive.
export const ngayChup = f => {
  const exif = /^(\d{4}):(\d{2}):(\d{2})/.exec(f.imageMediaMetadata?.time ?? '');
  if (exif) return exif.slice(1).join('-');
  const vn = ms => new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const zalo = /^(\d{13})/.exec(f.name);
  return vn(zalo ? +zalo[1] : Date.parse(f.createdTime)); // ponytail: ngày tải lên chỉ là phỏng đoán cuối cùng, ảnh tải trễ sẽ vào sai ngày
};
const slug = s => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').split(/[^A-Za-z0-9]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('').slice(0, 40);
// [MaCT]-HA-[Ngay]-[STT]_[MaHangMuc]_[MoTa].ext
export const tenAnh = (ma, ngay, stt, hm, mota, tenFile) =>
  `${ma}-HA-${ngay.replaceAll('-', '')}-${String(stt).padStart(3, '0')}_${hm}${slug(mota) ? '_' + slug(mota) : ''}${(tenFile.match(/\.[A-Za-z0-9]{1,5}$/) || [''])[0].toLowerCase()}`;
// số thứ tự tiếp theo trong ngày, tính từ tên file đã có
export const sttTiep = (ma, ngay, tenCo) => 1 + Math.max(0, ...tenCo.map(t => +(new RegExp(`^${ma}-HA-${ngay.replaceAll('-', '')}-(\\d{3})`).exec(t)?.[1] ?? 0)));

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('anh.js')) {
  const a = await import('node:assert/strict');
  a.equal(ngayChup({ name: 'x.jpg', imageMediaMetadata: { time: '2026:10:06 08:15:00' } }), '2026-10-06');
  a.equal(ngayChup({ name: '1782789646584_abc.jpg', createdTime: '2026-10-07T00:00:00Z' }), '2026-06-30');
  a.equal(ngayChup({ name: 'IMG.heic', createdTime: '2026-10-05T18:30:00Z' }), '2026-10-06'); // 01:30 ngày 06 giờ Việt Nam
  a.equal(tenAnh('CT01', '2026-10-06', 1, 'HM2-1.1', 'Phá dỡ nền bệ', 'a.JPG'), 'CT01-HA-20261006-001_HM2-1.1_PhaDoNenBe.jpg');
  a.equal(tenAnh('CT01', '2026-10-06', 12, 'CHUNG', '', 'a.heic'), 'CT01-HA-20261006-012_CHUNG.heic');
  a.equal(sttTiep('CT01', '2026-10-06', ['CT01-HA-20261006-001_X.jpg', 'CT01-HA-20261006-007_Y.jpg', 'CT01-HA-20261005-009_Z.jpg']), 8);
  a.equal(sttTiep('CT01', '2026-10-06', []), 1);
  console.log('ok');
}
