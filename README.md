# Sổ tay kỹ sư xây dựng

Web app (cài được lên điện thoại/máy tính) đọc Google Drive theo cây thư mục `CONGTRINH/CTxx_.../` và sổ đăng ký `_SODANGKY` của từng công trình.

Bản đầu: đăng nhập Google → chọn công trình → xem/tìm tài liệu trong sổ → bấm **Gửi**: app hỏi xác nhận, đặt file thành "ai có link đều xem được" rồi mở bảng chia sẻ của máy.

## Bản mới và nhận file từ Zalo
- **Bản mới** (mỗi tài liệu có nút này): chọn file → nhập Rev → app lưu vào thư mục chuẩn trong cột "Thư mục chuẩn" của sổ với tên chuẩn, chuyển bản cũ sang `LUUTRU` (không xóa gì) và ghi Rev, ngày vào sổ. Tài liệu phải có sẵn một dòng trong sổ.
- **Nhận file từ Zalo/ứng dụng khác:** sau khi cài app ra màn hình chính (Android/Chrome), bấm Chia sẻ trong Zalo → chọn "Sổ tay KS" → mở app, đăng nhập, bấm "Bản mới" ở đúng tài liệu. iPhone/Safari không hỗ trợ kiểu này.
- **iPhone:** trong Zalo giữ file → Chia sẻ → **Lưu vào Drive** → chọn thư mục `00_INBOX` của công trình. Mở app: file hiện trong khung "file chờ lưu"; chọn file, bấm "Bản mới" ở đúng tài liệu. File đã nằm trên Drive nên app chỉ đổi tên và chuyển thư mục, không tải lại. Hộp `00_INBOX` được tạo tự động nếu chưa có.

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

## Việc cần làm

- Sheet `_CONGVIEC` (tab `VIEC`) tự tạo trong thư mục `CONGTRINH` lần đầu dùng.
- Việc có hạn sẽ tạo sự kiện Google Calendar 08:00 (nhắc trước 3 ngày, 1 ngày, đúng ngày). Cần bật **Google Calendar API** trong Google Cloud; đăng nhập lại để cấp quyền lịch.
- Bấm **Xong** sẽ đánh dấu trong sheet và xóa sự kiện lịch. Sửa hạn tay trong sheet không cập nhật lịch.

## Nhớ đăng nhập

App giữ phiên đăng nhập trên máy (khoảng 1 giờ). Hết hạn, app thử xin lại âm thầm; nếu Google không cho thì hiện nút Đăng nhập. Không có máy chủ nên không thể kéo dài quá 1 giờ mỗi lần.

## Nhật ký ngày

Mục "Nhật ký ngày" ghi vào Google Sheet `CTxx-NK-NHATKY_2026` (trang NGAY và KHOILUONG), tìm theo mã công trình đang chọn. Nếu trên Drive mới chỉ có file Excel, app tự chuyển thành Google Sheet (giữ nguyên file Excel). App chỉ thêm dòng mới; ngày đã có thì không ghi đè. Chạy `node nhatky.js` để tự kiểm tra đổi ngày.

## Hạn giấy tờ

Thêm cột **Hạn hiệu lực** vào trang DANHMUC của `_SODANGKY` (cột không bắt buộc, nhập dd/mm/yyyy), ví dụ cho bảo lãnh, bảo hiểm, giấy phép. Trong mục Việc, app liệt kê giấy tờ quá hạn hoặc còn dưới 30 ngày, từ mọi công trình; nút **Nhắc tôi** điền sẵn việc "Gia hạn: ..." với hạn là 14 ngày trước ngày hết hiệu lực. Ngày hạn không đọc được vẫn hiện để sửa trong sổ.

## Thông tin công trình

Mục "Thông tin công trình" đọc trang `THONGTIN` trong `_SODANGKY` (app tự tạo trang này lần đầu). Mỗi dòng: Nhóm (Liên hệ hoặc Thông tin), Tên, Chi tiết, Điện thoại. Liên hệ có số điện thoại thì có nút Gọi và Zalo. Thêm dòng ngay trong app; sửa hoặc xóa thì làm trực tiếp trong Trang tính. Trang chỉ có một ô "Công trình đang làm" ở đầu, app nhớ lần chọn cuối; tài liệu, thông tin, nhật ký đều theo ô đó. Trang THONGTIN chỉ được tạo khi bấm Thêm lần đầu. Nhật ký đang nhập dở được lưu nháp trên máy theo từng công trình, lưu thành công thì xóa nháp.

## Văn bản gửi đi (hợp đồng, báo giá, biên bản)

- **Soát trước khi gửi:** bấm **Gửi** ở tài liệu có bản Word hoặc Google Docs, app đọc văn bản và so với các dòng nhóm "Thông tin" của trang `THONGTIN`: báo số tiền gần giống mà khác (ví dụ 424.575.008 đ trong khi thông tin ghi 423.301.185 đ) và mục không thấy trong văn bản. Mỗi dòng Thông tin nên ghi một giá trị (ví dụ Tên "Giá trị hợp đồng", Chi tiết "423.301.185 đ"). PDF và bản scan chưa soát. Bản Word được Drive chuyển tạm sang Google Docs để đọc, đọc xong xóa bản tạm.
- **Lập văn bản từ mẫu:** bỏ mẫu (Word, Excel, Google Docs/Trang tính, có sẵn logo và thông tin công ty) vào `CONGTRINH/_CHUNG/MAUBIEU_CONGTY`. Chỗ cần điền ghi `{{Tên mục}}` đúng như cột Tên trong Thông tin, thêm `{{Ngày}}` là ngày lập. App chép mẫu vào `07_VANBAN/DI` của công trình, điền, ghi vào sổ với mã `CTxx-VB-DI-yyyymmdd-NN`, Rev R01, trạng thái Nháp, rồi mở để sửa. Chỗ nào chưa có thông tin thì app báo. Cần bật **Google Docs API** trong Google Cloud.
- **Thông tư, nghị định:** nút trong mục Thông tin mở thư mục `CONGTRINH/_CHUNG/THONGTU_NGHIDINH` (tự tạo lần đầu bấm). Dòng Thông tin có Chi tiết là đường link `https://...` (ví dụ sổ NotebookLM của công trình) có nút **Mở**.
- Chạy `node vanban.js` để tự kiểm tra phần soát.
