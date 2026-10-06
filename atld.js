// Họp an toàn 5 phút đầu ngày: gợi ý chủ đề hợp với việc đang làm. Không phụ thuộc trình duyệt. Chạy: node atld.js
// so chữ CÓ dấu (bỏ dấu thì "hồ sơ" thành "hố", "cầu thang" thành "cẩu", "cát" thành "cắt"), ranh giới từ theo Unicode
const w = t => new RegExp('(?<!\\p{L})(' + t + ')(?!\\p{L})', 'u');
// Thứ tự = ưu tiên khi có nhiều việc cùng lúc: nguy cơ chết người đứng trước
export const CHU_DE = [
  { ten: 'Làm việc trên cao', tu: w('mái|lợp tôn|giàn giáo|trên cao|lan can|xà gồ|sê nô'), y: ['Đeo dây an toàn, móc vào điểm neo chắc', 'Kiểm tra giàn giáo, sàn thao tác, lưới chắn trước khi lên', 'Không ném vật liệu từ trên cao xuống, không làm khi mưa gió'] },
  { ten: 'Đào đất, sạt lở hố móng', tu: w('đào|hố móng|đắp|san lấp|ép cọc|đóng cọc|rãnh|mương'), y: ['Rào chắn, biển báo quanh hố; không đứng sát mép', 'Đất cát sâu quá 1 m, đất sét quá 1,5 m: phải đào taluy hoặc chống vách; kiểm tra lại vách sau mưa', 'Đất đào đổ cách mép hố ít nhất 0,5 m', 'Máy đào làm việc thì người đứng ngoài tầm với của gầu'] },
  { ten: 'Đổ bê tông, xe bơm', tu: w('bê tông|bt|xe bơm|đầm dùi'), y: ['Xe bơm đặt nền chắc, chèn chân chống đủ', 'Không đứng trong tầm vung của vòi bơm', 'Đeo ủng, găng, kính khi đầm; không để dây điện đầm lê dưới nước'] },
  { ten: 'Hàn, cắt, cháy nổ', tu: w('hàn|cắt thép|cắt sắt|thép hình|cơ khí'), y: ['Mặt nạ hàn, găng, quần áo chống tia lửa', 'Dọn vật dễ cháy quanh chỗ hàn, có bình chữa cháy', 'Bình gió đá, bình oxy để thẳng đứng, xa nguồn nhiệt'] },
  { ten: 'An toàn điện', tu: w('điện|tủ điện|máy phát'), y: ['Ngắt điện và treo biển trước khi sửa', 'Dây điện không kéo dưới đất ẩm, ổ cắm có chống giật', 'Chỉ thợ điện được đấu nối'] },
  { ten: 'Cẩu, nâng hạ', tu: w('cẩu|nâng hạ|cáp treo|pa lăng|palăng'), y: ['Kiểm tra cáp, móc, kiểm định còn hạn', 'Không ai đứng dưới tải đang treo', 'Có người ra hiệu duy nhất, thống nhất tín hiệu'] },
  { ten: 'Cốp pha, cốt thép', tu: w('cốp pha|cốt pha|cốt thép|gia công thép'), y: ['Đeo găng, giày chống đinh khi làm cốp pha', 'Đầu thép chờ phải bọc nắp chụp', 'Chống cốp pha đủ, không tháo sớm'] },
];
export const CHUNG = { ten: 'Bảo hộ và nề nếp công trường', y: ['Mũ, giày, quần áo bảo hộ đủ từ đầu ca', 'Lối đi sạch, không để vật tư chắn lối', 'Thấy nguy hiểm báo ngay tổ trưởng, được quyền dừng việc'] };
export const NANG = { ten: 'Nắng nóng', y: ['Uống nước mỗi 15 đến 20 phút, không đợi khát', 'Nghỉ chỗ bóng mát giờ trưa, việc nặng làm sớm hoặc chiều', 'Nhận biết say nắng (chóng mặt, buồn nôn, da nóng khô): đưa vào bóng mát, báo ngay'] };
// nong: nhiệt độ cao nhất dự báo hôm nay (°C). Việc có nguy cơ riêng đứng trước; không có thì ngày nóng gợi chủ đề nắng nóng
export const goiY = (viec, nong) => { const t = viec.join(' | ').toLowerCase(); return CHU_DE.find(c => c.tu.test(t)) || (nong > 35 ? NANG : CHUNG); };
export const tatCa = [...CHU_DE, NANG, CHUNG];
// dòng ghi vào nhật ký (cột Sự cố, ATLĐ), không ghi trùng nếu đã có
export const dongNk = (cu, ten) => { const d = `Họp an toàn 5 phút: ${ten}`; return cu.includes(d) ? cu : cu ? cu + '; ' + d : d; };

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('atld.js')) {
  const a = await import('node:assert/strict');
  const ten = (v, n) => goiY([v], n).ten, C = CHUNG.ten;
  a.equal(ten('HM1-1 Lợp mái tôn'), 'Làm việc trên cao'); a.equal(ten('Đào móng trục A'), 'Đào đất, sạt lở hố móng'); a.equal(ten('Đổ bê tông bệ'), 'Đổ bê tông, xe bơm');
  // các việc thường gặp từng bị gợi nhầm khi bỏ dấu (rà soát 06/10/2026)
  a.equal(ten('Nộp hồ sơ thanh toán'), C); a.equal(ten('Đầm bê tông sàn'), 'Đổ bê tông, xe bơm'); a.equal(ten('Đặt cốp pha cột'), 'Cốp pha, cốt thép');
  a.equal(ten('Làm cầu thang'), C); a.equal(ten('Đổ cát san nền'), C); a.equal(ten('Trát tường ngày mai'), C);
  a.equal(ten('Trang trí tông màu'), C); a.equal(ten('Cấp phối đá, do đó trễ'), C); a.equal(goiY([]).ten, C);
  a.equal(goiY(['Trát tường'], 36).ten, 'Nắng nóng'); a.equal(goiY(['Lợp mái'], 36).ten, 'Làm việc trên cao'); a.equal(goiY([], 35).ten, C); // 35 độ chưa tới ngưỡng
  a.equal(dongNk('', 'A'), 'Họp an toàn 5 phút: A'); a.equal(dongNk('Xe trễ', 'A'), 'Xe trễ; Họp an toàn 5 phút: A'); a.equal(dongNk('Họp an toàn 5 phút: A', 'A'), 'Họp an toàn 5 phút: A');
  console.log('ok');
}
