// Thời tiết công trình: dự báo Open-Meteo (miễn phí, không cần khóa) + cảnh báo theo loại việc trong danh sách việc. Không phụ thuộc trình duyệt.
export const url = (lat, lon) => `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max,relative_humidity_2m_mean&timezone=Asia%2FHo_Chi_Minh&forecast_days=3`;

// Vị trí gõ tay "10.77, 106.70" (dấu phẩy hoặc khoảng trắng); ngoài khoảng kinh vĩ độ thì từ chối.
export const viTri = s => {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(s || '');
  return m && Math.abs(m[1]) <= 90 && Math.abs(m[2]) <= 180 ? [+m[1], +m[2]] : null;
};

export const parse = j => (j?.daily?.time || []).map((ngay, i) => {
  const d = j.daily, g = k => d[k]?.[i] ?? NaN;
  return { ngay, ma: g('weather_code'), nong: g('temperature_2m_max'), mua: g('precipitation_probability_max'), mm: g('precipitation_sum'), gio: g('wind_gusts_10m_max'), am: g('relative_humidity_2m_mean') };
});

// Mã thời tiết WMO về bốn giá trị của ô Thời tiết trong nhật ký. ponytail: dự báo theo ngày nên sáng và chiều điền giống nhau, người dùng sửa được.
export const nhatKy = d => d.ma >= 95 || d.mm >= 10 ? 'Mưa to' : d.ma >= 51 && d.ma !== 45 && d.ma !== 48 || d.mm >= 1 ? 'Mưa nhỏ' : d.ma >= 2 ? 'Mây' : d.ma >= 0 ? 'Nắng' : '';
export const tomTat = d => `${nhatKy(d) || 'Chưa rõ'}, tối đa ${Math.round(d.nong)}°C, mưa ${Math.round(d.mua)}%, gió giật ${Math.round(d.gio)} km/h`;

// Luật theo loại việc (đoán từ tên việc). Ngưỡng: mưa >=50% hoặc >=5 mm, nắng >=35°C, gió giật >=36 km/h (~10 m/s, mức thường dừng cẩu), độ ẩm >=85%.
const LUAT = [
  [/bê tông|đổ (sàn|móng|bt|dầm|cột)|\bbt\b/i, 'đổ bê tông', d => [d.mua >= 50 || d.mm >= 5 ? 'có mưa' : '', d.nong >= 35 ? 'nắng nóng ' + Math.round(d.nong) + '°C' : '']],
  [/mái|(^|\s)tôn(\s|$)|cẩu|giàn giáo|lắp dựng/i, 'làm trên cao, cẩu', d => [d.gio >= 36 ? 'gió giật ' + Math.round(d.gio) + ' km/h' : '', d.mm >= 5 ? 'có mưa' : '']],
  [/sơn|bả/i, 'sơn, bả', d => [d.am >= 85 ? 'độ ẩm ' + Math.round(d.am) + '%' : '', d.mua >= 50 ? 'có mưa' : '']],
];
export const NGAY = ['Hôm nay', 'Ngày mai', 'Ngày kia'];
// ds: dự báo từ hôm nay; tasks: việc chưa xong, mỗi việc có n = số ngày còn lại tới hạn (0 = hôm nay)
export const canhBao = (ds, tasks) => tasks.flatMap(t => {
  const d = ds[t.n]; if (!d || !(t.n >= 0)) return [];
  return LUAT.flatMap(([re, loai, kiem]) => re.test(t.ten) ? [[kiem(d).filter(Boolean).join(', '), loai]] : [])
    .filter(([lydo]) => lydo).map(([lydo, loai]) => `${NGAY[t.n]}: "${t.ten}" (${loai}) gặp ${lydo}, cân nhắc dời.`);
});

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('thoitiet.js')) { // chạy: node thoitiet.js
  const a = await import('node:assert/strict');
  a.deepEqual(viTri('10.77, 106.70'), [10.77, 106.7]); a.deepEqual(viTri('10.77 106.7'), [10.77, 106.7]); a.equal(viTri('91, 10'), null); a.equal(viTri('abc'), null); a.equal(viTri(''), null);
  const ds = parse({ daily: { time: ['2026-10-06', '2026-10-07', '2026-10-08'], weather_code: [0, 63, 2], temperature_2m_max: [36, 30, 31], precipitation_probability_max: [10, 80, 20], precipitation_sum: [0, 12, 0], wind_gusts_10m_max: [20, 25, 50], relative_humidity_2m_mean: [60, 90, 70] } });
  a.equal(ds.length, 3); a.deepEqual(ds.map(nhatKy), ['Nắng', 'Mưa to', 'Mây']); a.equal(nhatKy({ ma: 45, mm: 0 }), 'Mây'); a.equal(nhatKy({ ma: 61, mm: 2 }), 'Mưa nhỏ'); a.equal(nhatKy({}), '');
  const cb = canhBao(ds, [{ ten: 'Đổ bê tông bệ A', n: 0 }, { ten: 'Đổ bê tông bệ B', n: 1 }, { ten: 'Lợp mái tôn', n: 2 }, { ten: 'Sơn tường', n: 1 }, { ten: 'Họp', n: 1 }, { ten: 'Đổ bê tông cũ', n: -1 }, { ten: 'Đổ bê tông xa', n: 5 }]);
  a.equal(cb.length, 4); a.ok(cb[0].startsWith('Hôm nay') && cb[0].includes('nắng nóng 36°C')); a.ok(cb[1].includes('Ngày mai') && cb[1].includes('có mưa')); a.ok(cb.some(x => x.includes('gió giật 50'))); a.ok(cb.some(x => x.includes('sơn') && x.includes('độ ẩm 90%')));
  a.deepEqual(canhBao([], [{ ten: 'Đổ bê tông', n: 0 }]), []);
  console.log('ok');
}
