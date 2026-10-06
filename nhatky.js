// Nhật ký ngày: các ô nhập theo đúng thứ tự cột trang NGAY (B..L) của file CTxx-NK-NHATKY (xem luong-4/tao_nhat_ky.py).
export const NK = [
  ['Thời tiết sáng', ['Nắng', 'Mây', 'Mưa nhỏ', 'Mưa to']], ['Thời tiết chiều', ['Nắng', 'Mây', 'Mưa nhỏ', 'Mưa to']],
  ['Nghỉ (mưa/khác)', ['Không', 'Nghỉ sáng', 'Nghỉ chiều', 'Nghỉ cả ngày']],
  ['Nhóm 1: đất, BT, phục vụ (người)', 'n'], ['Nhóm 2: thợ xây, trát, ốp (người)', 'n'], ['Nhóm 3: cơ khí, hàn, tôn (người)', 'n'], ['Lái xe, lái máy (người)', 'n'],
  ['Thiết bị trên công trường', 't'], ['Ai đến kiểm tra', 't'], ['Sự cố, ATLĐ', 't'], ['Ghi chú', 't'],
];

// yyyy-mm-dd -> số ngày kiểu Google Sheets (cột Ngày trong sheet là ô ngày, không phải chữ)
export const serial = s => (Date.UTC(...s.split('-').map((x, i) => i === 1 ? x - 1 : +x)) - Date.UTC(1899, 11, 30)) / 864e5;

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('nhatky.js')) {
  const ok = (a, b) => { if (a !== b) throw new Error(`${a} != ${b}`); };
  ok(serial('2026-10-06'), 46301); ok(serial('1899-12-30'), 0); ok(serial('2026-01-01'), 46023); console.log('ok');
}
