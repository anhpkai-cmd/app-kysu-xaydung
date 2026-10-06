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

Mục "Nhật ký ngày" ghi vào Google Sheet `CTxx-NK-NHATKY_2026` (trang NGAY và KHOILUONG), tìm theo mã công trình đang chọn. Nếu trên Drive mới chỉ có file Excel, app tự chuyển thành Google Sheet (giữ nguyên file Excel). App chỉ thêm dòng mới, không ghi đè. Khối lượng còn gõ trong ô mà chưa bấm "Thêm việc vào ngày" thì tự được thêm khi bấm Lưu; số gõ kiểu Việt Nam (12.500 là mười hai nghìn năm trăm, 15,5 là mười lăm phẩy năm), không đọc được thì báo để sửa. Ngày đã có trong nhật ký: bấm Lưu chỉ thêm khối lượng còn thiếu (sau khi hỏi), các ô nhật ký đã có không bị sửa. Chạy `node nhatky.js` để tự kiểm tra đổi ngày.

## Hạn giấy tờ

Thêm cột **Hạn hiệu lực** vào trang DANHMUC của `_SODANGKY` (cột không bắt buộc, nhập dd/mm/yyyy), ví dụ cho bảo lãnh, bảo hiểm, giấy phép. Trong mục Việc, app liệt kê giấy tờ quá hạn hoặc còn dưới 30 ngày, từ mọi công trình; nút **Nhắc tôi** điền sẵn việc "Gia hạn: ..." với hạn là 14 ngày trước ngày hết hiệu lực. Ngày hạn không đọc được vẫn hiện để sửa trong sổ.

## Thông tin công trình

Mục "Thông tin công trình" đọc trang `THONGTIN` trong `_SODANGKY` (app tự tạo trang này lần đầu). Mỗi dòng: Nhóm (Liên hệ hoặc Thông tin), Tên, Chi tiết, Điện thoại. Liên hệ có số điện thoại thì có nút Gọi và Zalo. Thêm dòng ngay trong app; sửa hoặc xóa thì làm trực tiếp trong Trang tính. Trang chỉ có một ô "Công trình đang làm" ở đầu, app nhớ lần chọn cuối; tài liệu, thông tin, nhật ký đều theo ô đó. Trang THONGTIN chỉ được tạo khi bấm Thêm lần đầu. Nhật ký đang nhập dở được lưu nháp trên máy theo từng công trình, lưu thành công thì xóa nháp.

## Văn bản gửi đi (hợp đồng, báo giá, biên bản)

- **Soát trước khi gửi:** bấm **Gửi**, app đọc bản Google Docs, Word hoặc PDF của tài liệu (PDF scan thì Drive tự nhận dạng chữ; bản tạm để trong `CONGTRINH/_TAM` và xóa ngay sau khi đọc) rồi so với các dòng nhóm "Thông tin" của trang `THONGTIN`. App báo: số tiền gần giống mà khác (lệch dưới 5%, ví dụ 424.575.008 đ trong khi thông tin ghi 423.301.185 đ), số bằng số khác số bằng chữ trong cùng văn bản, và mục không thấy trong văn bản. Số tiền viết 423.301.185, 423,301,185 hay 423301185 đồng, ngày viết 24/9/2026 hay "ngày 24 tháng 9 năm 2026" đều được coi là một. Không đọc được chữ thì báo "chưa soát được", không bao giờ báo khớp. Thấy cảnh báo vẫn có thể bấm OK để gửi (gửi vội). Gửi xong app hỏi riêng "lần sau vẫn nhắc chứ?": bấm OK là vẫn nhắc; chỉ khi bấm Hủy (báo nhầm) thì lần sau tài liệu này mới không nhắc lại (nhớ trên máy). Bảng tính chỉ soát trang đầu và app ghi rõ điều đó. Mỗi dòng Thông tin nên ghi một giá trị (ví dụ Tên "Giá trị hợp đồng", Chi tiết "423.301.185 đ").
- **Sổ gửi nhận:** gửi xong app thêm một dòng vào trang `NHATKY_GUINHAN` của `_SODANGKY` (ngày, mã, Rev, file). File có đuôi `_NHAP` được bỏ đuôi khi gửi.
- **Lập văn bản từ mẫu:** bỏ mẫu (Word, Excel, Google Docs/Trang tính, có sẵn logo và thông tin công ty) vào `CONGTRINH/_CHUNG/MAUBIEU_CONGTY`. Chỗ cần điền ghi `{{Tên mục}}` đúng như cột Tên trong Thông tin, thêm `{{Ngày}}` là ngày lập. Chọn mẫu và loại (CV, HD, BB...), app chép mẫu vào `07_VANBAN/DI` của công trình, điền, đặt tên theo luồng 1 `CT01-CV-DI-20261006-01-R00_MoTa_NHAP`, ghi vào sổ (R00, Nháp) rồi mở để sửa. Chỗ nào chưa có thông tin thì app báo. Cần bật **Google Docs API** trong Google Cloud (không phải đăng nhập lại). Thông tin công ty (địa chỉ, mã số thuế, tài khoản) chỉ nằm trong mẫu trên Drive, không nằm trong mã app vì kho mã công khai.
- **Bị trả:** mỗi tài liệu có nút **Bị trả** để ghi lý do chủ đầu tư/TVGS trả hồ sơ (một dòng "Nhận", "Bị trả: ..." trong NHATKY_GUINHAN). Lần Gửi sau, hộp xác nhận nhắc lại tối đa 5 lý do đã gặp của công trình.
- **Số bằng chữ trong mẫu:** mục Thông tin nào là số tiền thì có thêm chỗ điền `{{Tên mục bằng chữ}}`, ví dụ `{{Giá trị HĐ bằng chữ}}` thành "Bốn trăm hai mươi ba triệu ... đồng". `{{Ngày dài}}` thành "ngày 06 tháng 10 năm 2026". Báo giá, bảng khối lượng bằng Excel/Trang tính cũng được soát khi Gửi (đọc trang đầu), kể cả tổng tiền bằng số so với dòng bằng chữ.
- **Thông tư, nghị định:** nút trong mục Thông tin mở thư mục `CONGTRINH/_CHUNG/THONGTU_NGHIDINH` (tự tạo lần đầu bấm). Dòng Thông tin có Chi tiết là đường link `https://...` (ví dụ sổ NotebookLM của công trình) có nút **Mở**.
- Chạy `node vanban.js` để tự kiểm tra phần soát.
- **Họp chủ đầu tư:** nút **Chuẩn bị họp chủ đầu tư** trong mục Thông tin gom cho công trình đang chọn: tiến độ 7 ngày (số ngày có nhật ký, số người trung bình, khối lượng từng việc, sự cố), việc đang mở, giấy tờ đang chờ duyệt và 5 lần gửi gần nhất, 6 ảnh mới nhất. Bấm **Gửi bản tin họp** để chia sẻ qua Zalo hoặc chép. Chỉ đọc, không ghi gì. `node hop.js` tự kiểm tra.

## Ảnh hiện trường

Tải ảnh lên thư mục `00_INBOX` của công trình bằng app Google Drive (từ Zalo hoặc Timemark). Mục "Ảnh hiện trường" hiện lưới ảnh nhỏ. Tick các ảnh cùng một hạng mục, chọn hạng mục (mã trong trang DANHMUC của file nhật ký; luôn có thêm CHUNG, ATLD, VATLIEU ở cuối), gõ mô tả nếu muốn, bấm Xếp; ảnh chưa tick ở lại cho lượt sau. Dòng trên nút cho biết trước các ảnh sẽ vào ngày nào.

Ảnh được chuyển (không xóa, không nén) vào `09_HINHANH/yyyy-mm/yyyy-mm-dd/` và đặt tên `CT01-HA-20261006-001_HM2-1.1_MoTa.jpg`. Ngày chụp lấy theo EXIF, rồi mốc thời gian đầu tên file Zalo (chỉ nhận khi nằm trong khoảng 2020 đến ngày mai). Ảnh chỉ đoán được ngày (theo ngày tải lên) thì app hỏi: bấm "Dùng ngày này" (hoặc "Dùng ngày đoán cho các ảnh đã tick") hoặc chọn ngày; chưa có ngày thì ảnh ở lại INBOX, không xếp. Có nút "Chọn tất cả / Bỏ chọn". Ảnh chụp tài liệu (bản vẽ, biên bản) thì bấm "Đây là tài liệu": file được đổi tên thêm tiền tố `TAILIEU_` ngay trên Drive và chuyển sang danh sách file chờ lưu (giữ lại cả khi mở app lần sau). Nếu ảnh nhỏ hiện ô xám trên iPhone, app tự thử tải lại bằng mã đăng nhập. `node anh.js` tự kiểm tra.

Lưu ý ảnh HEIC của iPhone: bước điền báo cáo tuần vào mẫu Excel sẽ không chèn được HEIC. Hoặc đặt iPhone: Cài đặt, Camera, Định dạng, chọn "Tương thích nhất" (ra JPG), hoặc báo cáo phải lấy bản JPG từ Drive (`thumbnailLink` cỡ lớn). Chưa có sổ ảnh riêng: tên file đã mang đủ công trình, ngày, hạng mục, mô tả.

## Hôm nay còn sót gì

Khung đầu trang liệt kê: việc quá hạn hoặc đến hạn hôm nay (từng việc có nút **Xong** ngay tại khung), giấy tờ hết hạn trong 7 ngày, và với **từng công trình** (không chỉ công trình đang chọn): nhật ký hôm nay chưa ghi, ảnh chờ xếp. Chạm một dòng thì app chuyển sang đúng công trình đó. Mục nào không kiểm tra được (chưa có Google Sheet nhật ký, mất sóng) thì hiện "Chưa kiểm tra được...", và chỉ ghi "Hôm nay không còn gì sót" khi mọi mục đã kiểm tra xong. Việc quét chỉ đọc, không tạo thư mục hay chuyển Excel. Để app mở qua đêm thì sang ngày mới app tự tải lại.

Dưới đó là mục **Ngày mai cần chuẩn bị**: việc đến hạn ngày mai (có nút Xong), dự báo và cảnh báo thời tiết của ngày mai.

Nút **Nhắc tôi lúc 17h mỗi ngày** tạo một sự kiện lặp trên Google Lịch (thứ 2 đến thứ 7, 17:00); bấm lại không tạo trùng, đã bật thì nút thành **Tắt nhắc 17h** (xóa sự kiện). Lịch chỉ nhắc mở app, nội dung nằm trong app. Cần bật Google Calendar API.

## Thời tiết công trình

Khung "Thời tiết công trình" lấy dự báo 3 ngày từ Open-Meteo (miễn phí, không cần khóa) theo vị trí của công trình đang chọn. Vị trí: bấm **Lấy vị trí máy** khi đang ở công trường, hoặc gõ tọa độ "vĩ độ, kinh độ"; vị trí lưu trên máy này theo từng công trình. App đọc tên các việc chưa xong có hạn trong 3 ngày tới (của công trình đó hoặc Chung) và cảnh báo: đổ bê tông gặp mưa hoặc từ 35°C; mái, tôn, cẩu, giàn giáo gặp gió giật từ 36 km/h hoặc mưa; sơn, bả gặp độ ẩm từ 85% (cao nhất 7h đến 17h) hoặc mưa; sơn chỉ khớp tên như "Sơn tường ngoài", "Bả matit". Mở Nhật ký ngày của hôm nay thì ô Thời tiết sáng và chiều được điền sẵn theo dự báo (sáng và chiều giống nhau, sửa tay được; không đè lên nháp). `node thoitiet.js` tự kiểm tra.

## Vật tư

Mục "Vật tư" ghi vào file nhật ký `CTxx-NK-NHATKY` của công trình (cùng file với Nhật ký ngày). Cột A..H của trang VATTU giữ nguyên như file gốc; app chỉ thêm cột từ I trở đi.
- Trang `DMVATTU` (app tự tạo lần đầu bấm Thêm): Vật tư, Quy cách, ĐV, Ngày đệ trình, Ngày duyệt, Tần suất lấy mẫu (tự ghi), Ghi chú, KL dự toán. Có dự toán thì danh mục hiện "Đã về 19/20 tấn (95%)", vượt thì báo VƯỢT dự toán; chưa có thì bấm Nhập dự toán, sai thì bấm Sửa dự toán. Số gõ kiểu Việt Nam: 12.500 là mười hai nghìn rưỡi, 15,5 là mười lăm phẩy năm.
- Trang `VATTU`: mỗi lần vật tư về một dòng; thêm cột Phiếu giao nhận, Mã lô, Kết quả TN (bê tông: R7), Kết quả R28, Xử lý. Thí nghiệm và nghiệm thu tính theo **lô**: về thêm cho lô cũ thì chọn lại Mã lô, kết quả ghi lên mọi dòng của lô.
- **Vật tư về:** vật tư chưa được TVGS duyệt thì app hỏi lại trước khi ghi. CO/CQ chọn Chưa, Có hoặc Không cần (cát, đá mua ngoài bãi). Ảnh phiếu giao nhận lưu vào `05_VATTU_DOITHICONG/PHIEU_GIAONHAN/` tên `CT01-GN-20261006-01_XiMangPcb40.jpg`, tải ảnh trước rồi mới ghi dòng; mất sóng giữa chừng thì bấm lại, ảnh đã tải không tải lại.
- **Cần xử lý:** mỗi lô chưa xong kèm nút bước tiếp theo. Bê tông: bấm Đã đúc mẫu là thêm việc "Nén mẫu R7", "R28" (theo ngày đổ) vào Việc cần làm. Không đạt: lô ghi "Cấm dùng", thêm việc "Xử lý lô không đạt" hạn hôm nay (bê tông đã đổ: R7 không đạt chỉ cảnh báo; R28 không đạt ghi "Báo TVGS, khoan lõi" và thêm việc báo TVGS, khoan lõi kiểm định), đứng đầu khung Còn sót tới khi bấm Đã xử lý xong.
- **Nghiệm thu** (chỉ mở khi đã duyệt, đủ CO/CQ, mẫu đạt): thêm một dòng mã VATLIEU vào trang `NGHIEMTHU`.
- Khung **Còn sót** đếm lô cấm dùng và lô chưa xong của mọi công trình.
- Trước khi ghi, app đọc lại các dòng đó; sheet vừa bị sửa ở nơi khác thì không ghi mà tải lại. Chạy `node vattu.js` để tự kiểm tra.

## Lịch nghiệm thu

Mục "Lịch nghiệm thu" tự liệt kê các công việc trong trang `DANHMUC` của file nhật ký (lấy từ tiến độ đã trình) có ngày **Kết thúc KH** trong 14 ngày tới hoặc đã qua, mà trang `NGHIEMTHU` chưa có dòng mã đó với Kết quả "Đạt".
- Mỗi việc ghi những gì còn thiếu mà app tự kiểm được: chưa có khối lượng thực hiện trong nhật ký, còn lô vật tư chưa nghiệm thu đầu vào.
- **Nhắc tôi** thêm việc "Nghiệm thu: ..." vào Việc cần làm, hạn là ngày kết thúc (Google Lịch nhắc trước 3 ngày, 1 ngày). **Đã nghiệm thu** hỏi ngày và số biên bản rồi thêm một dòng vào `NGHIEMTHU` (không sửa dòng cũ).
- Khung **Còn sót** đếm việc cần nghiệm thu trong 2 ngày tới hoặc đã quá ngày.
