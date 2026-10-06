# Sổ tay kỹ sư xây dựng

Web app (cài được lên điện thoại/máy tính) đọc Google Drive theo cây thư mục `CONGTRINH/CTxx_.../` và sổ đăng ký `_SODANGKY` của từng công trình.

Bản đầu: đăng nhập Google → chọn công trình → xem/tìm tài liệu trong sổ → bấm **Gửi** để chia sẻ link bản hiện hành.

## Điều kiện
- Trên Drive có thư mục `CONGTRINH`, trong đó mỗi công trình có Google Sheet tên bắt đầu bằng `_SODANGKY` với trang `DANHMUC` (cột: Mã tài liệu, Tên, Rev hiện hành, Ngày rev, Trạng thái, Từ khóa).
- File trên Drive đặt tên chuẩn `MãTL-Rev_MôTả.ext` (ví dụ `CT01-BV-KC-005-R02_MongM1M2.pdf`).

## Cài đặt Client ID (miễn phí)
1. console.cloud.google.com → tạo project → bật **Google Drive API** và **Google Sheets API**.
2. Credentials → Create → OAuth client ID → Web application. Authorized JavaScript origins: địa chỉ GitHub Pages của app.
3. Dán Client ID vào `config.js`.

## Chạy thử / kiểm tra
- `node register.js` chạy bài kiểm tra tự động cho phần đọc sổ.
- `python3 -m http.server` rồi mở http://localhost:8000.
