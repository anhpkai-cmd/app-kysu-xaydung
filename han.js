// Thiết bị cần kiểm định, thẻ an toàn lao động, giấy tờ có hạn: ghi thành một dòng trong DANHMUC của _SODANGKY với cột "Hạn hiệu lực", nên dùng lại luôn
// danh sách "Giấy tờ sắp hết hạn", nút Nhắc tôi và khung Còn sót. Không phụ thuộc trình duyệt.
import { soTiep } from './vattu.js';
export const COT_HAN = 'Hạn hiệu lực';
export const LOAI = {
  TB: { ten: 'Kiểm định thiết bị (cẩu, giàn giáo, máy hàn...)', tt: 'Thiết bị', tien: 'Kiểm định: ', tukhoa: 'kiểm định, thiết bị, ATLĐ' },
  AT: { ten: 'Thẻ an toàn lao động (tên người)', tt: 'Thẻ ATLĐ', tien: 'Thẻ ATLĐ: ', tukhoa: 'ATLĐ, thẻ an toàn, chứng chỉ' },
  GT: { ten: 'Giấy tờ khác có hạn (bảo lãnh, bảo hiểm, giấy phép)', tt: 'Giấy tờ', tien: '', tukhoa: 'hạn, giấy tờ' },
};
// Dòng DANHMUC mới theo tên cột. ctMa: CT01; dsMa: mã đang có trong sổ (để đánh số tiếp, không trùng); han: yyyy-mm-dd (ô chọn ngày); homNay: dd/mm/yyyy
export const dong = (ctMa, loai, ten, han, dsMa, homNay) => {
  const l = LOAI[loai], goc = `${ctMa}-${loai}`;
  return { 'Mã tài liệu': `${goc}-${soTiep(goc, dsMa, 3)}`, 'Tên': l.tien + ten.trim(), 'Rev hiện hành': 'R00', 'Ngày rev': homNay, 'Trạng thái': l.tt, 'Từ khóa': l.tukhoa, [COT_HAN]: han.split('-').reverse().join('/') };
};

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('han.js')) { // chạy: node han.js
  const a = await import('node:assert/strict');
  const d = dong('CT01', 'TB', ' Cẩu tháp TC5013 ', '2026-12-31', ['CT01-TB-001', 'CT01-BV-KC-005', 'CT01-TB-002'], '06/10/2026');
  a.equal(d['Mã tài liệu'], 'CT01-TB-003'); a.equal(d['Tên'], 'Kiểm định: Cẩu tháp TC5013'); a.equal(d[COT_HAN], '31/12/2026'); a.equal(d['Trạng thái'], 'Thiết bị');
  a.equal(dong('CT02', 'GT', 'Bảo lãnh', '2027-01-05', [], 'x')['Mã tài liệu'], 'CT02-GT-001'); a.equal(dong('CT02', 'AT', 'Nguyễn A', '2027-01-05', [], 'x')['Tên'], 'Thẻ ATLĐ: Nguyễn A');
  console.log('ok');
}
