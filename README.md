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

- **Soát trước khi gửi:** bấm **Gửi**, app đọc bản Google Docs, Word hoặc PDF của tài liệu (PDF scan thì Drive tự nhận dạng chữ; bản tạm để trong `CONGTRINH/_TAM` và xóa ngay sau khi đọc) rồi so với các dòng nhóm "Thông tin" của trang `THONGTIN`. App báo: số tiền gần giống mà khác (lệch dưới 5%, ví dụ 424.575.008 đ trong khi thông tin ghi 423.301.185 đ), số bằng số khác số bằng chữ trong cùng văn bản, và mục không thấy trong văn bản. Số tiền viết 423.301.185, 423,301,185 hay 423301185 đồng, ngày viết 24/9/2026 hay "ngày 24 tháng 9 năm 2026" đều được coi là một. Không đọc được chữ thì báo "chưa soát được", không bao giờ báo khớp. Thấy cảnh báo mà văn bản vẫn đúng thì cứ bấm OK để gửi: các cảnh báo đó được nhớ trên máy, lần sau tài liệu này không nhắc lại. Mỗi dòng Thông tin nên ghi một giá trị (ví dụ Tên "Giá trị hợp đồng", Chi tiết "423.301.185 đ").
- **Sổ gửi nhận:** gửi xong app thêm một dòng vào trang `NHATKY_GUINHAN` của `_SODANGKY` (ngày, mã, Rev, file). File có đuôi `_NHAP` được bỏ đuôi khi gửi.
- **Lập văn bản từ mẫu:** bỏ mẫu (Word, Excel, Google Docs/Trang tính, có sẵn logo và thông tin công ty) vào `CONGTRINH/_CHUNG/MAUBIEU_CONGTY`. Chỗ cần điền ghi `{{Tên mục}}` đúng như cột Tên trong Thông tin, thêm `{{Ngày}}` là ngày lập. Chọn mẫu và loại (CV, HD, BB...), app chép mẫu vào `07_VANBAN/DI` của công trình, điền, đặt tên theo luồng 1 `CT01-CV-DI-20261006-01-R00_MoTa_NHAP`, ghi vào sổ (R00, Nháp) rồi mở để sửa. Chỗ nào chưa có thông tin thì app báo. Cần bật **Google Docs API** trong Google Cloud (không phải đăng nhập lại). Thông tin công ty (địa chỉ, mã số thuế, tài khoản) chỉ nằm trong mẫu trên Drive, không nằm trong mã app vì kho mã công khai.
- **Thông tư, nghị định:** nút trong mục Thông tin mở thư mục `CONGTRINH/_CHUNG/THONGTU_NGHIDINH` (tự tạo lần đầu bấm). Dòng Thông tin có Chi tiết là đường link `https://...` (ví dụ sổ NotebookLM của công trình) có nút **Mở**.
- Chạy `node vanban.js` để tự kiểm tra phần soát.

## Ảnh hiện trường

Tải ảnh lên thư mục `00_INBOX` của công trình bằng app Google Drive (từ Zalo hoặc Timemark). Mục "Ảnh hiện trường" hiện lưới ảnh nhỏ. Tick các ảnh cùng một hạng mục, chọn hạng mục (mã trong trang DANHMUC của file nhật ký; luôn có thêm CHUNG, ATLD, VATLIEU ở cuối), gõ mô tả nếu muốn, bấm Xếp; ảnh chưa tick ở lại cho lượt sau. Dòng trên nút cho biết trước các ảnh sẽ vào ngày nào.

Ảnh được chuyển (không xóa, không nén) vào `09_HINHANH/yyyy-mm/yyyy-mm-dd/` và đặt tên `CT01-HA-20261006-001_HM2-1.1_MoTa.jpg`. Ngày chụp lấy theo EXIF, rồi mốc thời gian đầu tên file Zalo (chỉ nhận khi nằm trong khoảng 2020 đến ngày mai). Ảnh chỉ đoán được ngày (theo ngày tải lên) thì app hỏi: bấm "Dùng ngày này" (hoặc "Dùng ngày đoán cho các ảnh đã tick") hoặc chọn ngày; chưa có ngày thì ảnh ở lại INBOX, không xếp. Có nút "Chọn tất cả / Bỏ chọn". Ảnh chụp tài liệu (bản vẽ, biên bản) thì bấm "Đây là tài liệu": file được đổi tên thêm tiền tố `TAILIEU_` ngay trên Drive và chuyển sang danh sách file chờ lưu (giữ lại cả khi mở app lần sau). Nếu ảnh nhỏ hiện ô xám trên iPhone, app tự thử tải lại bằng mã đăng nhập. `node anh.js` tự kiểm tra.

Lưu ý ảnh HEIC của iPhone: bước điền báo cáo tuần vào mẫu Excel sẽ không chèn được HEIC. Hoặc đặt iPhone: Cài đặt, Camera, Định dạng, chọn "Tương thích nhất" (ra JPG), hoặc báo cáo phải lấy bản JPG từ Drive (`thumbnailLink` cỡ lớn). Chưa có sổ ảnh riêng: tên file đã mang đủ công trình, ngày, hạng mục, mô tả.

## Hôm nay còn sót gì

Khung đầu trang liệt kê: việc quá hạn hoặc đến hạn hôm nay, giấy tờ hết hạn trong 7 ngày, và với **từng công trình** (không chỉ công trình đang chọn): nhật ký hôm nay chưa ghi, ảnh chờ xếp. Chạm một dòng thì app chuyển sang đúng công trình đó. Mục nào không kiểm tra được (chưa có Google Sheet nhật ký, mất sóng) thì hiện "Chưa kiểm tra được...", và chỉ ghi "Hôm nay không còn gì sót" khi mọi mục đã kiểm tra xong. Việc quét chỉ đọc, không tạo thư mục hay chuyển Excel. Để app mở qua đêm thì sang ngày mới app tự tải lại.

Nút **Nhắc tôi lúc 17h mỗi ngày** tạo một sự kiện lặp trên Google Lịch (thứ 2 đến thứ 7, 17:00); bấm lại không tạo trùng, đã bật thì nút thành **Tắt nhắc 17h** (xóa sự kiện). Lịch chỉ nhắc mở app, nội dung nằm trong app. Cần bật Google Calendar API.

## Thời tiết công trình

Khung "Thời tiết công trình" lấy dự báo 3 ngày từ Open-Meteo (miễn phí, không cần khóa) theo vị trí của công trình đang chọn. Vị trí: bấm **Lấy vị trí máy** khi đang ở công trường, hoặc gõ tọa độ "vĩ độ, kinh độ"; vị trí lưu trên máy này theo từng công trình. App đọc tên các việc chưa xong có hạn trong 3 ngày tới (của công trình đó hoặc Chung) và cảnh báo: đổ bê tông gặp mưa hoặc từ 35°C; mái, tôn, cẩu, giàn giáo gặp gió giật từ 36 km/h hoặc mưa; sơn, bả gặp độ ẩm từ 85% (cao nhất 7h đến 17h) hoặc mưa; sơn chỉ khớp tên như "Sơn tường ngoài", "Bả matit". Mở Nhật ký ngày của hôm nay thì ô Thời tiết sáng và chiều được điền sẵn theo dự báo (sáng và chiều giống nhau, sửa tay được; không đè lên nháp). `node thoitiet.js` tự kiểm tra.
