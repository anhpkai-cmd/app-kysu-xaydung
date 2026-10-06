// Họp an toàn 5 phút đầu ngày: gợi ý chủ đề hợp với việc đang làm. Không phụ thuộc trình duyệt. Chạy: node atld.js
const bo = s => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase(); // bỏ dấu để so từ khóa (tôn khác tông)
// Thứ tự = ưu tiên khi có nhiều việc cùng lúc: nguy cơ chết người đứng trước
export const CHU_DE = [
  { ten: 'Làm việc trên cao', tu: /\b(mai|ton|gian giao|cao|dam|san thuong|lan can)\b/, y: ['Đeo dây an toàn, móc vào điểm neo chắc', 'Kiểm tra giàn giáo, sàn thao tác, lưới chắn trước khi lên', 'Không ném vật liệu từ trên cao xuống, không làm khi mưa gió'] },
  { ten: 'Đào đất, sạt lở hố móng', tu: /\b(dao|mong|coc|ho|dat|ranh|dap)\b/, y: ['Rào chắn, biển báo quanh hố; không đứng sát mép', 'Kiểm tra vách đất sau mưa, hố sâu quá 1,5 m phải chống', 'Máy đào làm việc thì người đứng ngoài tầm với của gầu'] },
  { ten: 'Đổ bê tông, xe bơm', tu: /\b(be tong|bt|bom)\b/, y: ['Xe bơm đặt nền chắc, chèn chân chống đủ', 'Không đứng trong tầm vung của vòi bơm', 'Đeo ủng, găng, kính khi đầm; không để dây điện đầm lê dưới nước'] },
  { ten: 'Hàn, cắt, cháy nổ', tu: /\b(han|cat|ton|thep hinh|co khi)\b/, y: ['Mặt nạ hàn, găng, quần áo chống tia lửa', 'Dọn vật dễ cháy quanh chỗ hàn, có bình chữa cháy', 'Bình gió đá, bình oxy để thẳng đứng, xa nguồn nhiệt'] },
  { ten: 'An toàn điện', tu: /\b(dien|tu dien|may phat)\b/, y: ['Ngắt điện và treo biển trước khi sửa', 'Dây điện không kéo dưới đất ẩm, ổ cắm có chống giật', 'Chỉ thợ điện được đấu nối'] },
  { ten: 'Cẩu, nâng hạ', tu: /\b(cau|nang|cap treo|palang|xe cau)\b/, y: ['Kiểm tra cáp, móc, kiểm định còn hạn', 'Không ai đứng dưới tải đang treo', 'Có người ra hiệu duy nhất, thống nhất tín hiệu'] },
  { ten: 'Cốp pha, cốt thép', tu: /\b(cop pha|cotpha|cot thep|thep|dan)\b/, y: ['Đeo găng, giày chống đinh khi làm cốp pha', 'Đầu thép chờ phải bọc nắp chụp', 'Chống cốp pha đủ, không tháo sớm'] },
];
export const CHUNG = { ten: 'Bảo hộ và nề nếp công trường', y: ['Mũ, giày, quần áo bảo hộ đủ từ đầu ca', 'Lối đi sạch, không để vật tư chắn lối', 'Thấy nguy hiểm báo ngay tổ trưởng, được quyền dừng việc'] };
export const goiY = viec => { const t = bo(viec.join(' | ')); return CHU_DE.find(c => c.tu.test(t)) || CHUNG; };
export const tatCa = [...CHU_DE, CHUNG];
// dòng ghi vào nhật ký (cột Sự cố, ATLĐ), không ghi trùng nếu đã có
export const dongNk = (cu, ten) => { const d = `Họp an toàn 5 phút: ${ten}`; return cu.includes(d) ? cu : cu ? cu + '; ' + d : d; };

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('atld.js')) {
  const a = await import('node:assert/strict');
  a.equal(goiY(['HM1-1 Lợp mái tôn']).ten, 'Làm việc trên cao');
  a.equal(goiY(['Đào móng trục A']).ten, 'Đào đất, sạt lở hố móng');
  a.equal(goiY(['Đổ bê tông bệ']).ten, 'Đổ bê tông, xe bơm');
  a.equal(goiY(['Trang trí tông màu']).ten, CHUNG.ten); // "tông" không bị nhầm với "tôn"
  a.equal(goiY(['Cấp phối đá, do đó trễ']).ten, CHUNG.ten); // từ ngắn dễ trùng (cấp, do) không làm gợi nhầm
  a.equal(goiY([]).ten, CHUNG.ten);
  a.equal(dongNk('', 'A'), 'Họp an toàn 5 phút: A'); a.equal(dongNk('Xe trễ', 'A'), 'Xe trễ; Họp an toàn 5 phút: A'); a.equal(dongNk('Họp an toàn 5 phút: A', 'A'), 'Họp an toàn 5 phút: A');
  console.log('ok');
}
