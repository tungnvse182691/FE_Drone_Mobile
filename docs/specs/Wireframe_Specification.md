# TÀI LIỆU ĐẶC TẢ CHI TIẾT GIAO DIỆN NGƯỜI DÙNG & MA TRẬN TRUY VẾT YÊU CẦU
## (UI/UX SPECIFICATION & COMPLETE REQUIREMENTS TRACEABILITY MATRIX)

---

- **Dự án:** RoadGuard — Hệ thống Giám sát & Quản lý Bảo hành Công trình Giao thông bằng Thiết bị bay không người lái (UAV/Drone) và Trí tuệ Nhân tạo (AI)
- **Đơn vị phát triển:** Cát Tường Group / Ban Dự án Kỹ thuật Công nghệ Giao thông
- **Văn bản căn cứ:** 
  - Đề cương Đồ án Tốt nghiệp Kỹ sư CNTT: `RoadGuard_Contractor_Warranty_Inspection_phuonglhk.md` (Mục 3.2 & 3.3)
  - Hồ sơ Đặc tả Ca sử dụng: `RoadGuard_UseCase_ChiTiet/Dac_ta_UseCase.md` (109 Use Cases, Phiên bản 09/09/2026)
  - Hồ sơ Câu chuyện Người dùng: `RoadGuard_UserStories/Ma_tran_UseCase_Story.md` (70 User Stories)
  - Bộ thiết kế Wireframe Figma: Hệ thống 39 bản vẽ PNG Cát Tường Field (`CAT TUONG/`)
  - Nguyên mẫu Tương tác Thực thi (Interactive Prototype): `RoadGuard_Wireframes/index.html` (40 Màn hình quy chuẩn đặc tả)
- **Tác giả:** Chuyên viên Phân tích Nghiệp vụ & Kỹ sư Kiến trúc Phần mềm (Senior BA & System Architect)
- **Ngày ban hành:** 09/09/2026 | **Ngày cập nhật mới nhất:** 14/09/2026
- **Trạng thái:** Bản hoàn thiện nộp Hội đồng Đồ án Tốt nghiệp (Đồng bộ 100% Nguyên mẫu Thực thi & Thiết kế Figma)

### Lịch sử thay đổi & Nhật ký Rebuild (Revision History):
- **09/09/2026 (v1.0):** Ban hành tài liệu đặc tả ban đầu theo bộ wireframe 36 màn hình Figma.
- **10/09/2026 (v2.0):** Bổ sung hệ thống định danh thương hiệu Cát Tường (Font Sansation, Logo ánh kim, Slogan "Bền vững mọi công trình").
- **12/09/2026 (v3.0 - Rebuild toàn diện):** Rebuild toàn bộ tài liệu đặc tả khớp 100% với file nguyên mẫu thực thi `RoadGuard_Wireframes/index.html` (chính xác 41 màn hình) và 39 tệp ảnh thiết kế gốc `CAT TUONG/`. Loại bỏ các mã màn hình giả định ngoài HTML; chuẩn hóa chuỗi mã Đội sửa chữa (`M-CREW-01` đến `M-CREW-11`); xác lập chính xác 3 mã gộp nghiệp vụ (`M-PM-06/14`, `M-PM-07/M-CREW-05`, `M-SUP-07`); đồng bộ toàn bộ dữ liệu nhân sự thực tế chuẩn HTML (Nguyễn Thùy Lan `PM-0428`, Phi công Nguyễn Văn An `CT-2089`, Kỹ thuật viên Nguyễn Văn Tuấn `CT-RC-084`, Đội trưởng Đội cơ giới 01 Trần Văn Vượng nhận lệnh `#WO-118`, Giám sát trưởng Trần Thế Hùng `NV-8842`), dự toán tài chính chuẩn (`42.500.000 VNĐ`, `74.900.000 VNĐ`), mã đợt sửa `#REQ-045`, mã lệnh công tác `#WO-118`, màn hình ký duyệt đóng đợt `M-SUP-08`; đồng thời cập nhật toàn diện Ma trận truy vết 109 Use Case chỉ trỏ duy nhất vào các mã màn hình thực có trong HTML.
- **14/09/2026 (v3.1):** Gỡ M01 (Mở khóa PIN ngoại tuyến) vì ngoài phạm vi DocxUserStory (tài liệu nhóm trưởng không có UC/US/entity nào về PIN, auth domain chỉ có Session/RefreshToken/must_change_password); chuẩn hóa toàn bộ tài liệu thành 40 màn hình quy chuẩn (Xác thực & Ngoại tuyến còn 2 màn); ghi chú: HTML prototype vẫn giữ `screen-offline-pin` chờ quyết định riêng — không được tự ý sửa HTML.
- **14/09/2026 (v3.2):** Bổ sung đặc tả chi tiết Section "Lịch bay & Kế hoạch khảo sát *" trong màn hình M-PM-03 (3 chip chọn nhanh, 2 ô ngày bay/hạn nộp, quy tắc xác thực hạn nộp ≥ ngày bay, logic phản hồi toast và điều hướng về M-PM-02); đồng thời đồng bộ gỡ bỏ hoàn toàn M01 trong file prototype HTML index.html, chuẩn hóa hệ thống 40 màn hình thực thi.

---

# PHẦN I: TỔNG QUAN KIẾN TRÚC GIAO DIỆN & HỆ THỐNG ĐỊNH DANH (DESIGN SYSTEM)

## 1.1 Triết lý Thiết kế 100% Mobile-First & Hiện trường (Field-Ready Philosophy)

Toàn bộ hệ thống tác nghiệp của RoadGuard được hợp nhất trên **ứng dụng di động duy nhất (Mobile App Android Native / Cross-platform)**, phục vụ đồng thời cả 4 tác nhân từ hiện trường đến văn phòng điều hành. Triết lý thiết kế tuân thủ nghiêm ngặt các nguyên lý:

1. **Thích ứng môi trường ngoài trời khắc nghiệt (High Sunlight Contrast & Touch Targets):**
   - Các tác nhân thực địa (Phi công Drone, Đội trưởng sửa chữa) thường xuyên làm việc dưới ánh nắng gắt, đeo găng tay bảo hộ hoặc cầm thiết bị bằng một tay.
   - Diện tích chạm (Touch Target) tối thiểu là `48x48 dp` cho toàn bộ các nút bấm và phần tử điều hướng.
   - Phông chữ Sans-serif rõ nét (Roboto & Sansation) với độ tương phản văn bản đạt chuẩn WCAG 2.1 AA (tỷ lệ tương phản tối thiểu 4.5:1 với văn bản thường và 3.0:1 với văn bản lớn).

2. **Thiết kế thích ứng theo vai trò (Role-Based Adaptive Shell):**
   - Ứng dụng tự động cấu hình giao diện (Dynamic Bottom Navigation `nav-role-*` cao 64px `h-16`, Floating Action Button, Header AppBar) ngay khi tài khoản đăng nhập thành công.
   - Thanh điều hướng chung `nav-role-*` là thành phần duy nhất dính đáy màn hình (`shrink-0 h-16 bg-white border-t border-[#E2E5E9]`). Mọi nút hành động chính (CTA) đều đặt ở cuối khối cuộn nội dung hoặc nổi phía trên thanh điều hướng (FAB `+` đặt tại `absolute right-4 bottom-24`), tuyệt đối không đè lấp lẫn nhau.

3. **Nguyên tắc "Ngoại tuyến là ưu tiên hàng đầu" (Offline-First Architecture):**
   - Tuyến đường khảo sát bảo hành thường nằm ở các khu vực đèo dốc, cao tốc ngoại thành, công trình mới mở chưa có sóng di động 4G/5G ổn định.
   - Toàn bộ nghiệp vụ đọc dữ liệu bản đồ, chụp ảnh bằng chứng, ghi nhận số đo thước ngắm, lưu nhật ký đều thực hiện trên cơ sở dữ liệu cục bộ SQLite / WatermelonDB. Mạng Internet chỉ đóng vai trò là kênh đồng bộ thứ cấp khi thiết bị tái kết nối.

---

## 1.2 Hệ thống Định danh Màu sắc Chuẩn Figma Cát Tường (Color Palette)

Bảng màu được trích xuất trực tiếp và đồng bộ 100% từ tệp thiết kế Figma quy chuẩn và mã nguồn prototype:

| Tên định danh Token | Mã Màu HEX | Giá trị RGB | Ứng dụng nghiệp vụ & Quy tắc hiển thị |
|---|:---:|:---:|---|
| **Cát Tường Brand Gold (Logo Metallic)** | `#8C6D1F` | rgb(140, 109, 31) | Màu vàng kim loại nhận diện thương hiệu Logo Cát Tường Group. Dùng cho tiêu đề Brand Header, nhãn vai trò, con dấu nhận diện bản quyền cao cấp. |
| **Cát Tường Gold (Primary CTA)** | `#C9A227` | rgb(201, 162, 39) | Màu thương hiệu chủ đạo tương tác. Dùng cho nút bấm chính (Primary CTA), Tab đang hoạt động (Active Tab), nút FAB `+`, viền thẻ quan trọng. |
| **Gold Hover / Dark** | `#B28E1F` / `#6B5219` | rgb(178, 142, 31) | Trạng thái di chuột (Hover/Active) của nút bấm vàng chính và các thành phần nhấn mạnh. |
| **Gold Tint (Light Surface)** | `#FEF3E2` | rgb(254, 243, 226) | Màu nền cho các huy hiệu trạng thái (Badge), thẻ cảnh báo nhẹ, nhãn phân loại hư hỏng, nền avatar vai trò. |
| **Dark Charcoal (Typography Text)** | `#1A1D20` / `#191C1F` | rgb(26, 29, 32) | Màu văn bản cấp 1: Tiêu đề màn hình (Headline), tên công trình, mã số lỗi, số tiền dự toán, thông số kỹ thuật then chốt. |
| **Muted Slate (Secondary Text)** | `#555F71` / `#2D3748` | rgb(85, 95, 113) | Màu văn bản cấp 2: Lý trình Km, ngày giờ khảo sát, tọa độ GPS, nhãn chỉ dẫn (Placeholders), chú thích phụ. |
| **Card Surface (Pure White)** | `#FFFFFF` | rgb(255, 255, 255) | Nền thẻ thành phần giao diện, bo góc chuẩn `rounded-2xl` (16px), phủ bóng mờ nhẹ (`shadow-2xs` / `shadow-xs`). |
| **Border Neutral** | `#E2E5E9` / `#ECEEF2` | rgb(226, 229, 233) | Viền ngăn cách giữa các mục danh sách, đường phân tách thẻ, viền hộp nhập liệu (1px border). |
| **App Canvas (Background)** | `#F8F9FA` | rgb(248, 249, 250) | Nền tổng thể của toàn bộ ứng dụng di động, tạo độ dịu mắt và tôn khối các thẻ trắng. |
| **Dark Frame (Camera / Media)** | `#0F172A` / `#0F141C` | rgb(15, 23, 42) | Nền tối chuyên dụng cho màn hình kính ngắm chụp ảnh (Viewfinder), khung phát video khảo sát và giả lập lớp asphalt. |
| **Success Emerald** | `#2F9E44` / `#10B981` | rgb(47, 158, 68) | Trạng thái: "Đã duyệt", "Đồng bộ thành công", "Đã xác minh qua thực địa", "Đạt 100%". |
| **Danger Crimson** | `#E5484D` / `#EF4444` | rgb(229, 72, 77) | Trạng thái: "Từ chối", "Yêu cầu làm lại", "Rủi ro cao / Nghi lún", "Hủy yêu cầu". |
| **Warning Amber** | `#F59E0B` | rgb(245, 158, 11) | Trạng thái: "Chờ phê duyệt", "Đang ngoại tuyến", "Cận hạn bảo hành", "Trung bình". |
| **Info Blue** | `#3B82F6` | rgb(59, 130, 246) | Trạng thái: "Đang tải lên", "Đang xử lý AI", "Đang thực hiện". |

---

## 1.3 Hệ thống Định danh Typography Chuẩn Thiết Kế (Đồng bộ DESIGN.md)

Hệ thống phông chữ kết hợp giữa phông chữ nghệ thuật nhận diện thương hiệu **Sansation** và phông chữ công thái học di động **Roboto**:

| Token Typography | Phông chữ (Font Family) | Kích thước & Trọng lượng | Chiều cao dòng | Ứng dụng nghiệp vụ & Quy tắc hiển thị |
|---|---|---|:---:|---|
| **`headline-lg`** | **Sansation** | 24px (Bold / Medium 500) | 1.3 | Tiêu đề nhận diện thương hiệu `CÁT TƯỜNG GROUP`, tên ứng dụng trên màn hình M-SPLASH và M00. |
| **`title-lg`** | **Roboto** | 20px (Bold 700 / Medium 500) | 1.3 | Tiêu đề màn hình chính (App Bar Title), tên dự án cấp cao, mã đợt sửa chữa lớn `#REQ-045`. |
| **`title-md`** | **Roboto** | 16px (Medium 500 / Bold 700) | 1.4 | Tiêu đề thẻ tác nghiệp, tên phân đoạn lý trình Km, mã số khuyết tật (`#DF-0231`). |
| **`body-lg`** | **Roboto** | 15px - 16px (Regular 400) | 1.5 | Nội dung mô tả kỹ thuật, hướng dẫn an toàn, thuyết minh biện pháp sửa chữa. |
| **`body-md`** | **Roboto** | 13px - 14px (Regular 400) | 1.5 | Văn bản nội dung thông thường, chỉ dẫn nhập liệu, giá trị các thuộc tính khuyết tật. |
| **`label-lg`** | **Roboto** | 13px - 14px (Bold / Medium 500) | 1.2 | Nhãn nút bấm hành động (Buttons / CTA), nhãn Tabs điều hướng, nhãn nút duyệt. |
| **`label-sm`** | **Roboto** | 10px - 11px (Bold, uppercase) | 1.2 | Huy hiệu trạng thái (Badges), thẻ Tag phân loại mức độ rủi ro, nhãn Bottom Navigation. |
| **`caption`** | **Roboto / Mono** | 11px - 12px (Regular / Font-mono) | 1.4 | Chú thích số đo, tọa độ GPS, thời gian EXIF, dung lượng tệp và mã băm SHA-256. |

*Tệp tài nguyên đồ họa định danh thương hiệu:*
- Logo chính thức: `RoadGuard_Wireframes/assets/logo_cattuong.png` (Logo biểu trưng Cát Tường Metallic Gold, hiển thị chuẩn `32x32px` `w-8 h-8 object-contain`).
- Slogan chính thức: *"BỀN VỮNG MỌI CÔNG TRÌNH"*.

---

## 1.4 Quy tắc Trực quan Ngoại tuyến (Offline-First Visual Guidelines & State Machine)

Để đảm bảo tính minh bạch và tránh thất thoát dữ liệu hiện trường, ứng dụng áp dụng quy tắc trực quan hóa trạng thái mạng toàn cục (Global Network Banner & Offline Mode):

```
┌────────────────────────────────────────────────────────────────────────┐
│ 09:41  📶 5G / Offline  🔋 98%                                         │
├────────────────────────────────────────────────────────────────────────┤
│ [TRẠNG THÁI 1 - XANH]  🟢 Đã kết nối máy chủ Cát Tường Cloud | Sẵn sàng│
│ [TRẠNG THÁI 2 - VÀNG]  🟡 Ngoại tuyến: 3 mục đang chờ đồng bộ (28.5 MB) │
│ [TRẠNG THÁI 3 - LAM]   🔵 Đang đồng bộ nền: Bằng chứng #WO-118 (65%)    │
└────────────────────────────────────────────────────────────────────────┘
```

### Các quy định nghiệp vụ về dữ liệu ngoại tuyến:
1. **Dấu kiểm toàn vẹn dữ liệu (Integrity Checksum - SHA-256):**
   - Mỗi bức ảnh bằng chứng nghiệm thu hoặc video flycam 4K nhập từ thẻ nhớ đều được băm `SHA-256` ngay tại thiết bị cục bộ trước khi ghi vào SQLite.
   - Huy hiệu Checksum hiển thị biểu tượng bảo mật màu xanh `[🛡️ SHA-256: 7f8a...e4b1]`.
2. **Hàng đợi đồng bộ thứ cấp (Background Sync Queue):**
   - Mọi thao tác ghi nhận khi mất mạng được đẩy vào hàng đợi đồng bộ cục bộ.
   - Tự động đồng bộ lại khi có kết nối Wi-Fi / 4G khả dụng với giải thuật Exponential Backoff.
3. **Quy trình "Dọn dẹp bản sao an toàn" (Safe Local Purge):**
   - Nghiêm cấm tự động xóa tệp media trong máy điện thoại sau khi tải lên. Nút "Dọn dẹp dung lượng máy" chỉ khả dụng khi máy chủ phản hồi xác nhận nhận đủ bytes và mã băm SHA-256 trùng khớp 100%.

---

## 1.5 Ma trận 4 Vai trò Người dùng & Phân quyền trên Ứng dụng Di động

| Nhóm Chức năng Nghiệp vụ | 🛡️ Giám sát kiêm Quản trị (Supervisor) | 📋 Quản lý Dự án (PM) | 🚁 Phi công Drone (Pilot) | 🛠️ Đội trưởng Sửa chữa (Crew Lead) |
|---|:---:|:---:|:---:|:---:|
| **Xác thực & Mở khóa Ngoại tuyến** | Toàn quyền (Online) | Toàn quyền (Online) | Toàn quyền (Online) | Toàn quyền (Online) |
| **Tạo Dự án & Cấu hình Tuyến** | **Toàn quyền (Tích hợp M-SUP-06)**| Chỉ xem dự án phân công | Không có quyền | Không có quyền |
| **Phân quyền Nhân sự Dự án** | **Toàn quyền cấu hình RBAC** | Không có quyền | Không có quyền | Không có quyền |
| **Lập Lệnh Khảo sát & Giao Pilot** | Phê duyệt kế hoạch bay | **Lập lệnh M-PM-03 / Giao việc** | Tiếp nhận / Từ chối (KS03) | Không có quyền |
| **Thu thập Video & Ghi Nhật ký** | Xem dữ liệu | Xem tiến độ & dữ liệu | **Nhập thẻ SD / Ghi nhật ký**| Không có quyền |
| **Thẩm định & Hiệu chỉnh AI** | Xem kết quả | **Xác nhận / Sửa / Báo sai** | Không có quyền | Không có quyền |
| **Kiểm tra Số đo Thực địa** | Xem báo cáo | **Đo đạc & Xác nhận (M-PM-07)**| Không có quyền | **Đo đạc hiện trường (M-CREW-05)**|
| **Gộp Đợt Sửa & Lập Dự toán** | Thẩm định ngân sách | **Gộp lỗi M-PM-08 / Dự toán** | Không có quyền | Không có quyền |
| **Phê duyệt Đợt Sửa (Ngân sách)** | **Phê duyệt M-SUP-02 / Từ chối**| Chỉnh sửa nộp lại M-PM-10 | Không có quyền | Không có quyền |
| **Giao việc Thi công Hiện trường** | Giám sát tiến độ | **Giao Đội trưởng M-PM-12** | Không có quyền | Nhận lệnh công tác #WO |
| **Thi công & Chụp ảnh Trước/Sau**| Không tham gia | Không tham gia | Không có quyền | **Thực hiện & Chụp ảnh M-CREW-06**|
| **Kiểm tra Nghiệm thu Hiện trường**| Ký duyệt hoàn tất cuối | **Kiểm tra Đạt / Yêu cầu làm lại**| Không có quyền | Nhận phản hồi khắc phục |
| **Ký Đóng Đợt Sửa Toàn Diện** | **Ký duyệt Đóng đợt M-SUP-08** | Trình hồ sơ đóng đợt | Không có quyền | Không có quyền |
| **Xuất Báo cáo PDF & ZIP Bằng chứng**| **Toàn quyền xuất M-SUP-05** | **Toàn quyền xuất M-SUP-05** | Không có quyền | Không có quyền |
| **Quản trị Model AI & Legal Hold** | **Cấu hình / Khóa hồ sơ M-SUP-06**| Đề xuất xóa hết hạn | Không có quyền | Không có quyền |

---

# PHẦN II: ĐẶC TẢ CHI TIẾT TỪNG MÀN HÌNH WIREFRAME (40 MÀN HÌNH CHUẨN)

Hệ thống bao gồm chính xác **40 màn hình Wireframe** quy chuẩn đặc tả (đồng bộ 100% với nguyên mẫu `index.html` gồm 40 màn hình chuẩn sau khi gỡ bỏ M01) và đối chiếu hoàn chỉnh với 39 tệp bản vẽ thiết kế Figma trong thư mục `CAT TUONG/`. Dưới đây là đặc tả chi tiết 100% thông số thực tế:

---

## PHÂN KHU 0: XÁC THỰC & MỞ KHÓA NGOẠI TUYẾN (2 MÀN HÌNH)

### 1. `screen-splash` | Mã: M-SPLASH: Màn hình Khởi động Thương hiệu (Brand Splash / Loading)
- **Tệp thiết kế Figma tương ứng:** `Html → Body.png` / Khối Splash trong `iPhone 16 - 24.png`
- **Ánh xạ Use Case & User Story:** `CN01`, `CN05` | `US-CN01`, `US-CN05`
- **Tác nhân:** Cả 4 vai trò (Mọi người dùng khi mở ứng dụng)
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Nhận diện thương hiệu Cát Tường Group với logo 3D ánh kim và khẩu hiệu *"BỀN VỮNG MỌI CÔNG TRÌNH"*.
  - Thanh tiến trình tải ngầm (`splashProgressBar`) tự động chạy mô phỏng nạp bộ đệm ngoại tuyến SQLite: 20% -> 65% -> 100%.
  - Tự động chuyển tiếp (auto-transition sau 2.2 giây) sang màn hình Đăng nhập `M00` hoặc người dùng chạm màn hình để bỏ qua ngay.

### 2. `screen-login` | Mã: M00: Đăng nhập RoadGuard Cát Tường
- **Tệp thiết kế Figma tương ứng:** `iPhone 16 - 24.png` (Frame Đăng nhập)
- **Ánh xạ Use Case & User Story:** `CN01`, `CN02` | `US-CN01`, `US-CN02`
- **Tác nhân:** Cả 4 vai trò
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Form đăng nhập tài khoản / mật khẩu trực tuyến kết nối máy chủ OAuth2.
  - Hỗ trợ sinh trắc học (Vân tay / FaceID) và đăng nhập nhanh 4 vai trò qua nút tiện ích:
    - **Giám sát / Quản trị** -> Vào `screen-sup-home`
    - **Quản lý dự án (PM)** -> Vào `screen-pm-home`
    - **Phi công Drone** -> Vào `screen-drone-home`
    - **Đội sửa chữa** -> Vào `screen-crew-home`

---

## PHÂN KHU 1: PHI CÔNG DRONE (DRONE OPERATOR) (7 MÀN HÌNH)

### 3. `screen-drone-home` | Mã: M-DRONE-01: Trang chủ Người bay (Drone Home)
- **Tệp thiết kế Figma tương ứng:** `Trang chủ - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `KB01`, `KB02` | `US-KB01`, `US-KB02`
- **Tác nhân:** Phi công Drone (Nguyễn Văn An - Mã NV: `CT-2089`)
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Dashboard tóm tắt: Trạng thái pin TB65 (`92%`), thời tiết hiện trường (Nắng nhẹ, gió 3.2 m/s), radar an toàn bay (Vùng cấm bay: An toàn).
  - Thống kê nhiệm vụ trong ngày: **01 đang bay**, **02 chờ bay**.
  - Thẻ nhiệm vụ khẩn cấp: Tuyến ĐT.741 Cầu Sông Bé Km14+250.
  - Lối tắt nhanh sang nạp thẻ SD và nhật ký bay.

### 4. `screen-drone-requests` | Mã: M-DRONE-02: Danh sách Yêu cầu Khảo sát Drone
- **Tệp thiết kế Figma tương ứng:** `Yêu cầu khảo sát - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `KB02`, `KB03` | `US-KB02`, `US-KB03`
- **Tác nhân:** Phi công Drone
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Bộ 3 tab phân loại: **Chờ nhận (3)**, **Đang bay (1)**, **Đã xong (12)**.
  - Thẻ khảo sát tiêu biểu: `#REQ-KS-089` (Tuyến ĐT.741 - Cầu Sông Bé Km14+250, Khẩn cấp), `#REQ-KS-090` (QL.1A Đoạn Trảng Bom Km1842-Km1845), `#REQ-KS-088` (Đường gom KCN Amata).
  - Bấm vào thẻ `#REQ-KS-089` chuyển tiếp sang màn hình chi tiết lệnh bay `screen-drone-request-detail`.

### 5. `screen-drone-request-detail` | Mã: M-DRONE-03: Chi tiết Yêu cầu Khảo sát #REQ-KS-089
- **Tệp thiết kế Figma tương ứng:** `Chi tiết yêu cầu khảo sát - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `KB03`, `KB04`, `KS03` | `US-KB03`, `US-KB04`, `US-KS03`
- **Tác nhân:** Phi công Drone
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Thông số kỹ thuật bay được cấu hình từ PM: Chiều dài tuyến 3.5 km, độ cao bay cố định `45m`, độ phủ chồng ảnh dọc/ngang `80% / 70%`, định dạng video 4K 60fps kèm tọa độ GPS RTK.
  - Bản đồ ranh giới hành lang bay KML.
  - Nút hành động chính: *"Bắt đầu chuyến bay"* (chuyển sang `screen-drone-log`) và nút *"Từ chối yêu cầu (KS03)"* mở modal nhập lý do (thời tiết mưa gió giật / flycam hỏng / vùng cấm bay đột xuất).

### 6. `screen-drone-upload` | Mã: M-DRONE-04: Tải Video & Ảnh từ Thẻ nhớ SD
- **Tệp thiết kế Figma tương ứng:** `Tải video khảo sát - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `KB05`, `KB06` | `US-KB05`, `US-KB06`
- **Tác nhân:** Phi công Drone
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Giao diện kết nối đầu đọc thẻ nhớ Type-C / OTG trực tiếp với điện thoại hiện trường.
  - Tự động quét và hiển thị danh mục tệp: `DJI_0042.MP4` (3.2 GB, 4K), tệp phụ đề định vị `DJI_0042.SRT` (luồng GPS từng frame).
  - Kiểm tra tính toàn vẹn (Pre-flight QA): Đủ GPS metadata, không lỗi khung hình.
  - Nút *"Bắt đầu nạp dữ liệu"* mô phỏng tải vào bộ nhớ cục bộ máy và chuyển sang Nhật ký chuyến bay.

### 7. `screen-drone-log` | Mã: M-DRONE-05: Nhật ký Chuyến bay Khảo sát
- **Tệp thiết kế Figma tương ứng:** `Nhật ký khảo sát - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `KB06`, `KB07` | `US-KB06`, `US-KB07`
- **Tác nhân:** Phi công Drone
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Hồ sơ chuyến bay đã ghi nhận: Mã chuyến bay `#FL-20231024-01`, thời gian bay thực tế 24 phút, vận tốc trung bình 18 km/h, 420 ảnh trực giao đã trích xuất.
  - Mã băm kiểm tra toàn vẹn dữ liệu: `SHA-256: 7f8a3c...e4b1`.
  - Nút *"Đồng bộ dữ liệu lên Cloud"* để đẩy lên hệ thống AI phân tích khuyết tật.

### 8. `screen-drone-sync` | Mã: M-DRONE-06: Đồng bộ Dữ liệu Ngoại tuyến Drone
- **Tệp thiết kế Figma tương ứng:** `Đồng bộ dữ liệu - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `CN05`, `KB06` | `US-CN05`, `US-KB06`
- **Tác nhân:** Phi công Drone
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Hàng đợi đồng bộ các gói video khảo sát đang chờ tải lên khi có sóng 4G/Wi-Fi.
  - Trạng thái gói: `DJI_0042.MP4` (3.2 GB - Đang chờ Wi-Fi), `DJI_0041.MP4` (Đã đồng bộ 100%).
  - Nút *"Đồng bộ ngay"* và khu vực *"Dọn dẹp bản sao an toàn"* chỉ mở khóa khi server đã đối soát SHA-256 thành công.

### 9. `screen-drone-profile` | Mã: M-DRONE-07: Hồ sơ Phi công Drone (Nguyễn Văn An)
- **Tệp thiết kế Figma tương ứng:** `Hồ sơ - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `CN01`, `QT09` | `US-CN01`, `US-QT09`
- **Tác nhân:** Phi công Drone
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Thông tin cá nhân: Phi công Nguyễn Văn An, Mã NV `CT-2089` (Đội Khảo sát Số 1).
  - Thiết bị được gán: Flycam DJI Matrice 350 RTK, Trạm định vị D-RTK 2.
  - Thống kê an toàn: 128 giờ bay tích lũy, 45 nhiệm vụ hoàn thành, 0 sự cố. Nút *"Đăng xuất"*.

---

## PHÂN KHU 2: ĐỘI SỬA CHỮA HIỆN TRƯỜNG (REPAIR CREW) (10 MÀN HÌNH)

### 10. `screen-crew-home` | Mã: M-CREW-01: Trang chủ Đội sửa chữa (Crew Home)
- **Tệp thiết kế Figma tương ứng:** `Trang chủ Đội sửa chữa - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `SC06`, `SC07` | `US-SC06`, `US-SC07`
- **Tác nhân:** Kỹ thuật viên thi công / Đội sửa chữa hiện trường (Nguyễn Văn Tuấn - Mã NV: `CT-RC-084` / Đội trưởng Trần Văn Vượng)
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Thống kê tác nghiệp: **4 công việc đang làm**, **12 công việc hoàn thành**.
  - Thẻ nhiệm vụ trọng tâm: `#WO-118` - Trám vá ổ gà sâu 7cm tại Km1842+150 QL1A (Cách 450m, Nghiêm trọng).
  - Nút FAB máy ảnh gắn `sticky bottom-4` dẫn thẳng vào kính ngắm chụp bằng chứng `screen-crew-viewfinder`.

### 11. `screen-crew-tasks` | Mã: M-CREW-02: Công việc của tôi (My Tasks)
- **Tệp thiết kế Figma tương ứng:** `Công việc của tôi - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `SC06`, `SC07` | `US-SC06`, `US-SC07`
- **Tác nhân:** Đội sửa chữa
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Tabs: **Đang làm (4)**, **Hoàn thành (12)**.
  - Danh sách lệnh thi công chi tiết:
    - Task 1: Trám vá ổ gà sâu 7cm — Km1842+150 QL1A (Nghiêm trọng - Cách 450m).
    - Task 2: Xử lý nứt lưới & sụt lún taluy — ĐT.743B (Trung bình - Cách 1.8 km).
    - Task 3: Bù lún mố cầu Suối Cả — Tỉnh lộ 769 (Trung bình - Cách 3.5 km).
    - Task 4: Sơn dặm vạch kẻ đường phản quang — Vành Đai 3 (Thấp - Cách 5.2 km).
  - Nút FAB `+` nổi tại vị trí `absolute right-4 bottom-24 z-30` (nằm trên thanh nav chung `nav-role-crew` mà không che khuất tab).

### 12. `screen-crew-wo-detail` | Mã: M-CREW-03: Chi tiết Công việc #WO-118
- **Tệp thiết kế Figma tương ứng:** `Chi tiết công việc #WO-118 - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `SC06`, `SC07`, `HT01` | `US-SC06`, `US-SC07`, `US-HT01`
- **Tác nhân:** Đội sửa chữa
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Ảnh drone trực giao khuyết tật có viền đỏ cảnh báo độ sâu: `~7.2cm`, cắm chóp nón giao thông.
  - Chỉ dẫn thi công từ kỹ sư hiện trường: Dọn sạch đất cát lòng hố, dùng khoảng 1.2 tấn bê tông nhựa nguội, đầm cóc kỹ tối thiểu 4 lượt, rào chắn 50m hướng đi TP. Biên Hòa.
  - Cụm nút CTA cuối content cuộn: Nút *"Chỉ đường"* (sang `screen-crew-nav`) và nút *"Bắt đầu"* (sang `screen-crew-progress`).

### 13. `screen-crew-nav` | Mã: M-CREW-04: Dẫn đường Bản đồ GPS Hiện trường
- **Tệp thiết kế Figma tương ứng:** `Chỉ đường đến vị trí lỗi - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `HT01` | `US-HT01`
- **Tác nhân:** Đội sửa chữa
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Bản đồ điều hướng GPS thực tế dẫn đường xe cơ giới đến vị trí lỗi Km1842+150 QL1A (Tọa độ: `10.9634, 107.0125`, Xã Hố Nai 3, Trảng Bom, Đồng Nai).
  - Khoảng cách còn lại: `450 m` (khoảng 2 phút đi xe).
  - Cặp nút hành động: *"Mở Google Maps"* (kết nối app ngoài) và *"✓ Đã đến nơi"* (chuyển ngay sang `screen-crew-progress`).

### 14. `screen-crew-progress` | Mã: M-CREW-07: Cập nhật Tiến độ Thi công
- **Tệp thiết kế Figma tương ứng:** `Cập nhật tiến độ - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `HT02`, `HT03` | `US-HT02`, `US-HT03`
- **Tác nhân:** Đội sửa chữa
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Quy trình 4 bước thi công chuẩn:
    1. Đặt biển cảnh báo & chóp nón an toàn cách 50m.
    2. Cào bóc lớp nhựa cũ hư hỏng dày 7cm.
    3. Tưới nhựa dính bám & rải thảm BTN C12.5.
    4. Lu lèn phẳng mặt và thu dọn hiện trường.
  - Checkbox xác nhận từng giai đoạn hoàn thành kèm tỷ lệ phần trăm (75%).
  - Nút CTA cuối content: *"Lưu cập nhật & Chụp bằng chứng"* (chuyển sang `screen-crew-viewfinder`).

### 15. `screen-crew-report-defect` | Mã: M-CREW-08: Báo cáo Lỗi phát sinh Mới
- **Tệp thiết kế Figma tương ứng:** `Báo cáo lỗi phát sinh - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `HT04`, `HT05` | `US-HT04`, `US-HT05`
- **Tác nhân:** Đội sửa chữa khi phát hiện hư hỏng mới ngoài phạm vi phiếu #WO
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Banner quy tắc: *"Lỗi này sẽ được gửi về PM xác minh, không gộp vào #WO-118"*.
  - Form nhập liệu: Phân loại lỗi (Ổ gà, nứt lưới, lún vệt, xói lở taluy), lý trình GPS tự động lấy từ thiết bị (`Km1842+320 QL1A`), mức độ nguy hiểm, ảnh chụp nhanh hiện trường.
  - Nút CTA *"Gửi báo cáo lỗi cho PM"*.

### 16. `screen-crew-viewfinder` | Mã: M-CREW-06: Chụp ảnh Nghiệm thu có Thước ngắm (Camera Viewfinder)
- **Tệp thiết kế Figma tương ứng:** `Chụp bằng chứng nghiệm thu - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `HT06`, `HT07` | `US-HT06`, `US-HT07`
- **Tác nhân:** Đội sửa chữa
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Giao diện camera chuyên dụng nền tối `#0F141C`.
  - Khung lưới ngắm chuẩn hóa (AR Ghost Overlay) căn chỉnh góc chụp khớp 100% với góc chụp của ảnh hiện trạng trước sửa.
  - Thước đo điện tử AR hiển thị kích thước vệt vá.
  - Đóng dấu Watermark tự động: Ngày giờ, tọa độ GPS `10.9634, 107.0125`, mã lệnh `#WO-118`.
  - Nút chụp ảnh vật lý và nút lưu chuyển sang màn hoàn tất `screen-crew-complete`.

### 17. `screen-crew-complete` | Mã: M-CREW-09: Hoàn tất Công việc #WO-118
- **Tệp thiết kế Figma tương ứng:** `Hoàn tất công việc #WO-118 - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `HT08` | `US-HT08`
- **Tác nhân:** Đội sửa chữa
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Khung đối chiếu so sánh trực quan cặp ảnh: **Ảnh Trước (Before)** vết ổ gà sâu 7.2cm vs **Ảnh Sau (After)** mặt thảm nhựa C12.5 phẳng phiu hoàn chỉnh.
  - Khối lượng thi công thực tế: `14.5 m²`, tiêu hao 1.25 tấn vật liệu.
  - Nút CTA cuối content: *"Gửi cho PM"* kèm toast thông báo nộp thành công và chuyển sang màn đồng bộ ngoại tuyến.

### 18. `screen-crew-sync` | Mã: M-CREW-10: Đồng bộ Ngoại tuyến Đội Sửa chữa
- **Tệp thiết kế Figma tương ứng:** `Đồng bộ dữ liệu - Cát Tường Field-2.png`
- **Ánh xạ Use Case & User Story:** `CN05`, `HT07` | `US-CN05`, `US-HT07`
- **Tác nhân:** Đội sửa chữa
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Header mang Logo chuẩn Cát Tường `assets/logo_cattuong.png`.
  - Trạng thái: **3 mục đang chờ đồng bộ • 28.5 MB** (kết nối 4G/Wi-Fi khả dụng).
  - Danh sách hàng đợi:
    - Bằng chứng nghiệm thu `#WO-118` (Km1842+150 QL1A - 4 ảnh 14.2 MB - 65%).
    - Báo cáo sự cố phát sinh `#WR-004` (Nứt lún lề đường - 1 video 12.8 MB - Đang chờ).
    - Cập nhật nhật ký thi công `#WO-118`.
  - Nút CTA *"Đồng bộ ngay"*.

### 19. `screen-crew-profile` | Mã: M-CREW-11: Hồ sơ Kỹ thuật viên (Nguyễn Văn Tuấn)
- **Tệp thiết kế Figma tương ứng:** `Hồ sơ - Cát Tường Field-2.png`
- **Ánh xạ Use Case & User Story:** `CN01`, `QT09` | `US-CN01`, `US-QT09`
- **Tác nhân:** Kỹ thuật viên / Đội trưởng Đội sửa chữa
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Thông tin: Nguyễn Văn Tuấn, Mã NV: `CT-RC-084` (Đội sửa chữa số 2), email: `tuan.nguyen@cattuonginfra.vn`.
  - Đơn vị: Đội sửa chữa số 2 — Phụ trách Vá dặm mặt đường Đồng Nai.
  - Thống kê năng suất: 36 công việc đã hoàn thành, đánh giá chất lượng nghiệm thu `4.9 / 5.0 ⭐`.
  - Tùy chọn cài đặt ngoại tuyến và nút *"Đăng xuất"*.

---

## PHÂN KHU 3: QUẢN LÝ DỰ ÁN (PROJECT MANAGER - PM) (14 MÀN HÌNH)

### 20. `screen-pm-home` | Mã: M-PM-01: Trang chủ Quản lý Dự án (PM Home)
- **Tệp thiết kế Figma tương ứng:** `Trang chủ Quản lý dự án - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `BC01`, `SC01` | `US-BC01`, `US-SC01`
- **Tác nhân:** PM Nguyễn Thùy Lan (Mã NV: `PM-0428`)
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Header định danh: Cát Tường PM, lời chào cá nhân hóa.
  - Thống kê tổng hợp: **3 dự án đang quản lý** (QL.1A, ĐT.741, Vành Đai 3), **18 lỗi AI mới cần duyệt**, **4 lệnh bay đang xử lý**.
  - Lối tắt nhanh: Tạo khảo sát mới, hộp thư AI inbox, danh sách đợt sửa cần gộp.

### 21. `screen-pm-surveys` | Mã: M-PM-02: Quản lý Khảo sát (Surveys List)
- **Tệp thiết kế Figma tương ứng:** `Khảo sát - Quản lý dự án Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `KS01`, `KS02`, `KS14` | `US-KS01`, `US-KS02`, `US-KS14`
- **Tác nhân:** PM Nguyễn Thùy Lan
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Thẻ đếm: **01 Đang bay**, **02 Đã gửi video**, **02 Chờ bay**.
  - Danh sách 5 đợt khảo sát:
    - Tuyến ĐT.741 — Cầu Sông Bé (Km14+250) • Đang thực hiện • Đội Bay 01 (Phan Văn Nam).
    - QL.1A — Đoạn Trảng Bom (Km1842+100 - Km1845) • Đã gửi video • Đội Bay 02 (Lê Minh Tuấn).
    - Đường gom KCN Amata — Biên Hòa (Km02 - Km05) • Mới • Có nút *"Hủy (KS14)"*.
  - Nút FAB `+` nổi tại `absolute right-4 bottom-24 z-30` mở form tạo yêu cầu khảo sát mới.

### 22. `screen-pm-create-survey` | Mã: M-PM-03: Tạo Yêu cầu Khảo sát Mới
- **Tệp thiết kế Figma tương ứng:** `Tạo yêu cầu khảo sát - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `KS01` | `US-KS01`
- **Tác nhân:** PM Nguyễn Thùy Lan
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Form tạo lệnh bay: Chọn dự án (QL.1A Đồng Nai), phân đoạn khảo sát (Km1842 - Km1845), lý do khảo sát (Định kỳ 6 tháng / Sau đợt mưa bão).
  - Cấu hình thông số bay: Cao độ bay `45m`, độ phân giải GSD `< 1.2 cm/pixel`.
  - Phân công đích danh người bay: Đội Bay 01 (Nguyễn Văn An) với huy hiệu trạng thái *"Đang rảnh"*.
  - **Section Lịch bay & Kế hoạch khảo sát (Bắt buộc `*`):**
    - Nhãn tiêu đề trực quan kết hợp biểu tượng `calendar_month`: *"Lịch bay & Kế hoạch khảo sát *"*.
    - Nhóm 3 Chip thiết lập nhanh (Preset Chips): *"Hôm nay"*, *"Ngày mai"*, *"3 ngày tới"* cho phép tự động tính toán và điền đồng thời Ngày bay dự kiến và Hạn nộp video theo mốc thời gian thực.
    - Hai trường chọn ngày chuẩn HTML5 `input[type="date"]`:
      - **Ngày bay dự kiến (`*`):** Ngày phi công triển khai thiết bị bay tại hiện trường tuyến đường.
      - **Hạn nộp video (`*`):** Hạn chót phi công hoàn thành sao chép thẻ nhớ và đồng bộ video 4K kèm phụ đề GPS `.SRT` lên hệ thống.
    - **Quy tắc kiểm tra hợp lệ & Điều hướng nghiệp vụ:**
      - *Quy tắc ràng buộc thời gian:* Hạn nộp video phải cùng ngày hoặc sau Ngày bay dự kiến (Hạn nộp $\ge$ Ngày bay).
      - *Xử lý khi thiếu thông tin:* Nếu để trống một trong hai ô ngày, hệ thống kích hoạt Toast cảnh báo vàng/đỏ: *"⚠️ Vui lòng chọn Ngày bay dự kiến và Hạn nộp video!"* và chặn không gửi lệnh.
      - *Xử lý khi vi phạm quy tắc:* Nếu Hạn nộp < Ngày bay, hệ thống kích hoạt Toast đỏ chi tiết kèm 2 mốc ngày định dạng chuẩn DMY: *"❌ Hạn nộp video (DD/MM/YYYY) phải cùng ngày hoặc sau Ngày bay dự kiến (DD/MM/YYYY)!"* và chặn chuyển màn hình.
      - *Xử lý khi hợp lệ:* Bấm nút CTA *"Tạo yêu cầu"* ở cuối form sẽ kích hoạt Toast xanh thành công kèm thông tin 2 mốc ngày đã chọn (*"✅ Đã phát hành yêu cầu khảo sát cho Phi công Nguyễn Văn An! (Ngày bay: DD/MM/YYYY - Hạn nộp: DD/MM/YYYY)"*) và tự động điều hướng về màn hình Quản lý Khảo sát (`screen-pm-surveys` - `M-PM-02`).
  - Hướng dẫn cho người bay: Ô văn bản chỉ dẫn ("Bay quét 4K độ cao 30-35m dọc tim đường...") kèm các chip gợi ý nhanh (`+ Bay độ cao 30m`, `+ Quét 4K góc 90°`, `+ Tập trung khe co giãn`).
  - Thông báo tự động kích hoạt trạng thái MỚI trên ứng dụng phi công ngay khi tạo thành công.
  - Nút CTA cuối khối cuộn: *"Tạo yêu cầu"* thực thi kiểm tra Lịch bay và phát hành nhiệm vụ.

### 23. `screen-pm-ai-inbox` | Mã: M-PM-04: Hộp thư Xác minh Lỗi AI (Defect Inbox)
- **Tệp thiết kế Figma tương ứng:** `Xác minh - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `AI01`, `AI02` | `US-AI01`, `US-AI02`
- **Tác nhân:** PM Nguyễn Thùy Lan
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Bộ 3 Tabs: **Lỗi mới (12)**, **Hàng Chờ (12)**, **Đã duyệt (4)**.
  - Các lỗi AI phát hiện tự động:
    - `#DF-0231` • QL.1A Km1842+150 • Ổ gà sâu mặt đường nhựa • Sâu ~6.8cm • **RỦI RO CAO**.
    - `#DF-0228` • Tuyến ĐT.741 Km14+200 • Rạn nứt mai rùa diện rộng.
    - `#DF-0219` • QL.51 Km22+400 • Hư hỏng khe co giãn dầm cầu.
  - Nút chuyển nhanh vào thẩm định chi tiết Biến thể A hoặc Biến thể B.

### 24. `screen-pm-verify-a` | Mã: M-PM-05: Xác minh AI: Bounding Box (Biến thể A)
- **Tệp thiết kế Figma tương ứng:** `Vừa) - Cát Tường Field.png` (Xác minh lỗi AI Biến thể A)
- **Ánh xạ Use Case & User Story:** `AI03`, `AI04`, `AI05` | `US-AI03`, `US-AI04`, `US-AI05`
- **Tác nhân:** PM Nguyễn Thùy Lan
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Ảnh chụp flycam độ phân giải cao có Bounding Box màu đỏ khoanh vùng khuyết tật `#DF-0231` (Độ tin cậy AI: `94.2%`).
  - Form hiệu chỉnh kích thước: Độ sâu đo được `6.8cm`, diện tích `14.5 m²`, phân loại: Ổ gà màng nhựa lún.
  - Các nút hành động: *"Xác nhận lỗi AI"*, *"Hiệu chỉnh kích thước"* và *"Báo AI sai (False Positive)"*.

### 25. `screen-pm-verify-b` | Mã: M-PM-06/14: Xác minh AI: Đa kỳ & Baseline (Biến thể B - Gộp M-PM-06 & M-PM-14)
- **Tệp thiết kế Figma tương ứng:** `Xác minh lỗi #DF-0231 (Biến thể B - Rủi ro Cao) - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `AI06`, `AI07`, `AI08` | `US-AI06`, `US-AI07`, `US-AI08`
- **Tác nhân:** PM Nguyễn Thùy Lan
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - **Mã gộp 1:** Tích hợp toàn diện màn hình Thẩm định Rủi ro cao (`M-PM-06`) và màn hình So sánh Đa kỳ Baseline (`M-PM-14`).
  - Thanh trượt thời gian đối chiếu 3 kỳ: **Kỳ bàn giao gốc (Baseline 12/2022)** vs **Kỳ khảo sát T04/2023** vs **Kỳ hiện tại T10/2023**.
  - Bảng chỉ báo tốc độ lan rộng hư hại: Vết nứt mở rộng thêm `+2.4 mm/tháng`, diện tích sụt lún tăng 35% do xe tải nặng qua lại sau mưa.
  - Cảnh báo rủi ro cao: Cần cào bóc thảm lại trước khi phá hủy lớp móng base.

### 26. `screen-pm-field-task` | Mã: M-PM-07/M-CREW-05: Khảo sát / Kiểm tra Thực địa PM (Gộp M-PM-07 & M-CREW-05)
- **Tệp thiết kế Figma tương ứng:** `Khảo sát thực địa #DF-0231 - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `AI09`, `AI10` | `US-AI09`, `US-AI10`
- **Tác nhân:** PM Nguyễn Thùy Lan và Đội trưởng thi công
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - **Mã gộp 2:** Hợp nhất nhiệm vụ giao đo kiểm tra thực địa của PM (`M-PM-07`) và màn hình nhập số đo thước kẹp cơ học hiện trường của Đội trưởng (`M-CREW-05`).
  - Ghi nhận kết quả đo đạc thực tế: Độ sâu đo thước cơ học `7.0 cm` (sai khác +0.2cm so với AI), diện tích thực tế `14.5 m²`.
  - Đính kèm ảnh thước đo cắm trong lòng ổ gà.
  - Ghi chú thực địa: Mép nhựa vỡ rộng hơn hình drone 15%, cần cắt vá thảm nhựa nóng sâu 7cm.
  - Nút CTA cuối content: *"Xác nhận qua thực địa"* lưu kết quả và chuyển trạng thái khuyết tật.

### 27. `screen-pm-batching` | Mã: M-PM-08: Gộp Đợt Sửa Chữa (Defect Batching)
- **Tệp thiết kế Figma tương ứng:** `CAT TUONG/Phê duyệt - Cát Tường Field.png` (Giai đoạn lập danh sách đợt)
- **Ánh xạ Use Case & User Story:** `SC01`, `SC02`, `SC03` | `US-SC01`, `US-SC02`, `US-SC03`
- **Tác nhân:** PM Nguyễn Thùy Lan
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Giao diện danh sách checkbox các hư hỏng lân cận để gom thành 1 đợt sửa thi công cơ giới:
    - `[x]` `#DF-0231` • Lún nứt Km1842+150 • Chi phí: `42.500.000 đ` • Diện tích: `14.5 m²`.
    - `[x]` `#DF-0248` • Nứt lưới mai rùa Vành Đai 3 • Chi phí: `32.400.000 đ` • Diện tích: `18.0 m²`.
    - `[ ]` `#DF-0256` • Tấm đan rãnh vỡ TL769 • Chi phí: `15.200.000 đ` • Diện tích: `6.0 m²`.
  - Khối tổng hợp đợt sửa chuẩn bị trình duyệt `#REQ-045`:
    - Số lượng hư hỏng gộp: **2 hư hỏng**.
    - Tổng diện tích thi công: **32.5 m²**.
    - Tổng dự toán kinh phí đợt: **74.900.000 VNĐ**.
  - Nút CTA cuối content: *"Soạn hồ sơ trình Giám sát phê duyệt (#REQ-045) →"* chuyển sang `screen-pm-submit-approval`.

### 28. `screen-pm-submit-approval` | Mã: M-PM-09: Trình Phê duyệt #REQ-045 (Biến thể A)
- **Tệp thiết kế Figma tương ứng:** `Gửi Supervisor phê duyệt (Biến thể A) - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `SC04`, `SC05` | `US-SC04`, `US-SC05`
- **Tác nhân:** PM Nguyễn Thùy Lan
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Hồ sơ tờ trình gửi Supervisor: Tóm tắt lỗi `#DF-0231`, vị trí Km1842+150 QL1A.
  - Dự toán chi phí hạng mục: `15.000.000 VNĐ` (vật liệu cào bóc & thảm bê tông nhựa nóng).
  - Người tiếp nhận phê duyệt: **Lê Hoàng Nam (Supervisor ĐT.741)**.
  - Nút CTA cuối content: *"Gửi phê duyệt"* chuyển hồ sơ sang trạng thái Hàng chờ phê duyệt của Ban Giám sát.

### 29. `screen-pm-resubmit` | Mã: M-PM-10: Chỉnh sửa & Gửi lại Phê duyệt (Biến thể B - Revise & Resubmit)
- **Tệp thiết kế Figma tương ứng:** `Chỉnh sửa & gửi lại phê duyệt (Biến thể B) - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `SC05`, `SC09` | `US-SC05`, `US-SC09`
- **Tác nhân:** PM Nguyễn Thùy Lan khi bị Giám sát yêu cầu chỉnh sửa dự toán
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Hộp ý kiến chỉ đạo của **Giám sát trưởng Nguyễn Thanh Sơn**: *"Giảm hệ số hao hụt bê tông nhựa từ 8% xuống 5% theo định mức mới và bổ sung thêm 2 người điều tiết giao thông giờ cao điểm"*.
  - Form hiệu chỉnh dự toán: Chi phí sau điều chỉnh: `17.650.000 đ` (Đã giảm trừ `850.000 đ`).
  - Giải trình của PM: Đã cập nhật định mức hao hụt 5% và bổ sung 2 nhân công cắm chốt.
  - Nút CTA: *"Lưu & Trình duyệt lại hồ sơ"*.

### 30. `screen-pm-submitted-tab` | Mã: M-PM-11: Tab Xác minh: Đã gửi duyệt (Approval Tracker)
- **Tệp thiết kế Figma tương ứng:** `Xác minh - Tab Đã gửi duyệt - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `SC05` | `US-SC05`
- **Tác nhân:** PM Nguyễn Thùy Lan
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Header mang Logo chuẩn Cát Tường `assets/logo_cattuong.png`.
  - Bộ 3 Tabs: **Lỗi mới (12)**, **Hàng Chờ (12)**, **Đã duyệt (4)**.
  - Theo dõi danh sách yêu cầu đã trình Supervisor:
    - `#DF-0231` • QL.1A (Km1842+150) • Đang chờ Giám sát phê duyệt.
    - `#DF-0228` • Tuyến ĐT.741 (Km14+200) • **Đã duyệt — chờ giao việc** (Có nút bấm *"Giao việc ngay"*).
    - `#DF-0219` • Tuyến QL51 (Km22+400) • **Bị từ chối** (Kèm lý do vượt hạn mức, yêu cầu khảo sát lại).

### 31. `screen-pm-assign-crew` | Mã: M-PM-12: Giao việc cho Repair Crew
- **Tệp thiết kế Figma tương ứng:** `Giao việc cho Repair Crew - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `SC06` | `US-SC06`
- **Tác nhân:** PM Nguyễn Thùy Lan
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Danh sách các Đội sửa chữa khả dụng:
    - `[x]` **Trần Văn Vượng** (Gần vị trí nhất: 1.8 km) • Đội Cơ giới 01 • Đang làm: 1 việc.
    - `[ ]` **Lê Minh Tuấn** (Cách 4.2 km) • Đội Xử lý thảm nhựa • Đang làm: 2 việc.
    - `[ ]` **Nguyễn Đức Cường** (Cách 6.5 km) • Đội Sửa chữa Cát Tường 2 • Đang làm: 3 việc.
    - `[ ]` **Phạm Hoàng Sơn** (Khối lượng cao) • Đội Vá dặm mặt đường • Đang làm: 4 việc.
  - Nút CTA cuối content: *"Giao việc"* tự động tạo phiếu `#WO-118` và phát lệnh thi công cho Đội trưởng Trần Văn Vượng.

### 32. `screen-pm-wo-confirm` | Mã: M-PM-13: PM Xác nhận Nghiệm thu Hoàn thành #WO-118
- **Tệp thiết kế Figma tương ứng:** `Xác nhận hoàn thành #WO-118 - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `HT08` | `US-HT08`
- **Tác nhân:** PM Nguyễn Thùy Lan
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Đối chiếu ảnh hiện trạng ban đầu vs Ảnh mặt thảm nhựa C12.5 hoàn thiện.
  - Video flycam kiểm tra sau sửa chữa (Độ nét cao 60 fps, thời lượng 00:35, 1080p).
  - Ghi chú từ Đội sửa chữa: Đã cào bóc lớp nhựa cũ, lu lèn nền đá base cấp phối và trải thảm bê tông nhựa nóng C12.5 dày 7cm.
  - Cụm nút CTA cuối content: Nút *"Xác nhận hoàn thành"* (chuyển hồ sơ sang Giám sát ký duyệt đóng đợt) và nút *"Yêu cầu làm lại"* (trả về Đội thợ khắc phục).

### 33. `screen-pm-profile` | Mã: M-PM-15: Hồ sơ Quản lý Dự án (Nguyễn Thùy Lan)
- **Tệp thiết kế Figma tương ứng:** `Hồ sơ - Quản lý dự án Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `CN01`, `QT01` | `US-CN01`, `US-QT01`
- **Tác nhân:** PM Nguyễn Thùy Lan
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Avatar đại diện viết tắt `NL` kèm icon camera chỉnh sửa ảnh đại diện.
  - Họ tên: **Nguyễn Thùy Lan**, email: `lan.nguyen@cattuonginfra.vn`, Mã NV: `PM-0428`.
  - Vai trò: Quản lý Dự án (Cát Tường Project Manager). Ban QLDA phụ trách: Tuyến Quốc Lộ 1A, Tuyến ĐT.741 Đồng Nai.
  - Thống kê: **28 khảo sát đã tạo**, **45 đợt sửa chữa đã điều phối thành công**. Nút *"Đăng xuất"*.

---

## PHÂN KHU 4: BAN GIÁM SÁT & QUẢN TRỊ (SUPERVISOR) (7 MÀN HÌNH)

### 34. `screen-sup-home` | Mã: M-SUP-01: Trang chủ Ban Giám sát (Supervisor Home)
- **Tệp thiết kế Figma tương ứng:** `Trang chủ Giám sát - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `BC01`, `SC05` | `US-BC01`, `US-SC05`
- **Tác nhân:** Giám sát trưởng Trần Thế Hùng (Mã NV: `NV-8842`)
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Header mang Logo chuẩn Cát Tường `assets/logo_cattuong.png`.
  - Lời chào: *"Chào, Anh Hùng - Giám sát kỹ thuật hiện trường"*.
  - Bộ 3 chỉ số điều hành: **Rủi ro cao: 2** (Cần chú ý), **Chờ duyệt: 5** (3 đơn mới), **Đã xong T10: 18** (+4 so với T9).
  - Danh sách yêu cầu phê duyệt mới:
    - `#DF-0231` • QL.1A (Km1842+150) • RỦI RO CAO • Xử lý ổ gà sâu & nứt mặt đường • Người gửi: PM Nguyễn Thùy Lan • Chi phí: `42.500.000 đ`.
    - `#DF-0229` • Tuyến ĐT.741 (Km14+250) • Trám khe co giãn dầm cầu Sông Bé • Chi phí: `18.200.000 đ`.

### 35. `screen-sup-approve` | Mã: M-SUP-02: Thẩm định & Phê duyệt Hồ sơ #REQ-045
- **Tệp thiết kế Figma tương ứng:** `Duyệt yêu cầu sửa chữa #REQ-045 - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `SC05` | `US-SC05`
- **Tác nhân:** Giám sát trưởng Trần Thế Hùng
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Thông tin đợt sửa: Đoạn đường QL.1A — Km 1842+100 (Đoạn Trảng Bom, Đồng Nai) • **RỦI RO CAO**.
  - Người gửi: PM Nguyễn Thùy Lan. Chi phí ước tính duyệt: `42.500.000 VNĐ`. Độ sâu vệt lún: `~6.8cm`, diện tích xử lý: `14.5 m²`.
  - Khối hình ảnh & video hiện trường:
    - Ảnh đo đạc vệt lún (chụp thực địa thước đo cắm lòng hố).
    - Video bay khảo sát 4K (thời lượng 01:24, nút phát video).
  - Ý kiến nhận xét của PM: Vết nứt lan rộng nhanh, cần đội cơ giới cào bóc thảm lại 15m² trước khi hư hại sâu vào lớp móng base.
  - Ô nhập liệu: *"Ghi chú phê duyệt (Tùy chọn)"* nằm ngay TRÊN cặp nút hành động.
  - Cặp nút CTA cuối content cuộn: Nút *"Từ chối"* (viền đỏ) và nút *"Phê duyệt"* (nền vàng Cát Tường), nằm gọn gàng phía trên thanh nav dính đáy `nav-role-supervisor`.

### 36. `screen-sup-risk` | Mã: M-SUP-03: Tổng quan Rủi ro Dự án Tuyến đường
- **Tệp thiết kế Figma tương ứng:** `Tổng quan rủi ro dự án - Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `BC01`, `BC04` | `US-BC01`, `US-BC04`
- **Tác nhân:** Giám sát trưởng
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Thẻ chỉ số: Theo dõi **6 tuyến đường trọng điểm**, phát hiện **12 điểm đen nguy cơ lún sụt**.
  - Bản đồ nhiệt phân bố khuyết tật đường bộ toàn vùng kinh tế Đông Nam Bộ.
  - Danh sách cảnh báo rủi ro đỏ: Km1842-1845 QL.1A (Nguy cơ tai nạn xe tải nặng), Km14-16 ĐT.741.

### 37. `screen-sup-reports` | Mã: M-SUP-04: Báo cáo & Thống kê Giám sát
- **Tệp thiết kế Figma tương ứng:** `Báo cáo - Giám sát Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `BC01`, `BC02` | `US-BC01`, `US-BC02`
- **Tác nhân:** Giám sát trưởng
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Header mang Logo chuẩn Cát Tường `assets/logo_cattuong.png`.
  - Bộ 3 chỉ số tài chính & chất lượng:
    - Đã hoàn thành: **18 việc**.
    - Kinh phí đã duyệt: **648 tr** (648.000.000 VNĐ).
    - Đạt nghiệm thu: **100%**.
  - Danh sách 5 công việc hoàn thành tiêu biểu: QL.1A `#WO-118`, ĐT.741 `#WO-115`, QL.51 `#WO-112`, KCN Amata `#WO-109`, TL.769 `#WO-105`.
  - Nút mở modal xuất báo cáo `screen-sup-export-modal`.

### 38. `screen-sup-export-modal` | Mã: M-SUP-05: Xuất Hồ sơ Báo cáo PDF/ZIP
- **Tệp thiết kế Figma tương ứng:** Khối modal xuất báo cáo trong `Báo cáo - Giám sát Cát Tường Field.png`
- **Ánh xạ Use Case & User Story:** `BC03`, `BC04` | `US-BC03`, `US-BC04`
- **Tác nhân:** Giám sát trưởng hoặc PM
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Hộp thoại modal cấu hình xuất dữ liệu pháp lý:
    - Định dạng: **Báo cáo kỹ thuật PDF** (bản in đóng dấu) hoặc **Gói dữ liệu bằng chứng ZIP** (ảnh gốc 4K, video drone MP4, phụ đề GPS SRT, bảng kê SHA-256).
    - Bộ lọc thời gian: Tháng hiện tại / Quý 3 / Toàn bộ thời gian bảo hành.
    - Tuyến đường: Tuyến QL.1A hoặc toàn bộ dự án.
  - Nút *"Xuất dữ liệu & Tải về"*.

### 39. `screen-sup-profile` | Mã: M-SUP-06: Hồ sơ Giám sát trưởng (Trần Thế Hùng)
- **Tệp thiết kế Figma tương ứng:** `Hồ sơ - Cát Tường Field-1.png`
- **Ánh xạ Use Case & User Story:** `CN01`, `QT01` | `US-CN01`, `US-QT01`
- **Tác nhân:** Giám sát trưởng kiêm Quản trị hệ thống
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Thông tin: **Trần Thế Hùng**, Mã NV: `NV-8842`, email: `hung.tran@cattuong.vn` (Ban QLDA Miền Đông).
  - Chức vụ: Giám sát trưởng Kỹ thuật Hiện trường Cát Tường Group (15 năm kinh nghiệm quản lý hạ tầng giao thông).
  - **Tích hợp quản trị nghiệp vụ (Mã gộp 3 - M-SUP-07):** Trung tâm cấu hình tạo mới dự án, phân quyền nhân sự 4 vai trò, quản lý danh mục khuyết tật TCVN, cấu hình dung sai kích thước AI và khóa hồ sơ tranh chấp (Legal Hold).
  - Nút *"Đăng xuất"*.

### 40. `screen-sup-signoff` | Mã: M-SUP-08: Ký duyệt Đóng Đợt Sửa Chữa (Final Sign-off)
- **Tệp thiết kế Figma tương ứng:** Màn hình Ký duyệt hoàn tất đóng đợt sửa chữa trong bộ Figma Cát Tường Field
- **Ánh xạ Use Case & User Story:** `SC07`, `HT08` | `US-SC07`, `US-HT08`
- **Tác nhân:** Giám sát trưởng
- **Mục tiêu & Dữ liệu hiển thị thực tế:**
  - Màn hình nghiệm thu cấp cao nhất: Đối soát toàn diện kết quả thi công đợt sửa `#WO-118` (Lún nứt Km1842+150 QL1A) sau khi PM Nguyễn Thùy Lan đã xác nhận đạt.
  - Xác nhận chất lượng mặt đường: Độ bằng phẳng đạt yêu cầu kỹ thuật, diện tích hoàn công `14.5 m²`, tuyến đường đã an toàn thông xe.
  - Quyết toán kinh phí chính thức: `42.500.000 VNĐ`.
  - Nút CTA: *"Ký duyệt đóng đợt sửa chữa & Giảm trừ bảo lãnh hợp đồng"*.

---

# PHẦN III: PHÂN TÍCH GAP, GIẢI PHÁP HỢP NHẤT & CÁC MÀN GỘP NGHIỆP VỤ

Trong quá trình đối chiếu giữa 109 Use Case nghiệp vụ, 70 User Story với 39 tệp bản vẽ thiết kế Figma, nhóm kiến trúc hệ thống đã phân tích các khoảng trống (Gaps) và đưa ra các giải pháp hợp nhất kiến trúc chuẩn mực:

## 3.1 Bản chất 3 Mã Gộp Nghiệp Vụ (Merged Screen Codes)

Để đảm bảo công thái học di động (Mobile Ergonomics) không bắt người dùng hiện trường phải chuyển đổi qua lại giữa quá nhiều màn hình con rời rạc, hệ thống đã thực hiện gộp chính xác **3 nhóm mã màn hình**:

### 1. Mã gộp 1: `M-PM-06/14` (nằm trong màn `screen-pm-verify-b`)
- **Hai mã được gộp:** `M-PM-06` (Thẩm định Lỗi Rủi ro cao AI) + `M-PM-14` (So sánh Tiến triển Hư hỏng Đa Thời điểm với Hồ sơ Gốc Baseline).
- **Vị trí trong HTML:** Màn hình `screen-pm-verify-b` (Code: `M-PM-06/14`).
- **Lý do & Giá trị nghiệp vụ:** Khi thẩm định một khuyết tật nghiêm trọng hoặc nghi lún, PM bắt buộc phải xem xét lịch sử phát triển của khuyết tật đó theo chuỗi thời gian. Việc tích hợp thanh trượt so sánh 3 kỳ (Baseline bàn giao -> 6 tháng trước -> Hiện tại) và bảng tốc độ mở rộng vết nứt ngay trên cùng màn hình thẩm định giúp PM ra quyết định chuẩn xác mà không phải mở một màn hình so sánh riêng biệt.

### 2. Mã gộp 2: `M-PM-07/M-CREW-05` (nằm trong màn `screen-pm-field-task`)
- **Hai mã được gộp:** `M-PM-07` (Giao việc & Đánh giá Khảo sát Thực địa của PM) + `M-CREW-05` (Nhập Số đo Thước kẹp Hiện trường của Đội trưởng).
- **Vị trí trong HTML:** Màn hình `screen-pm-field-task` (Code: `M-PM-07/M-CREW-05`).
- **Lý do & Giá trị nghiệp vụ:** Khảo sát thực địa cơ học là nghiệp vụ phối hợp 2 chiều: Đội trưởng đo bằng thước tại hiện trường và PM đánh giá số đo thực tế để xác định nguyên nhân (do tải trọng hay do nền móng). Hợp nhất vào một màn hình chung với form nhập số đo thực tế (`7.0cm`, `14.5 m²`) và ghi chú hiện trường giúp khép kín quy trình kiểm tra thực địa.

### 3. Mã gộp 3: `M-SUP-07` (được tích hợp trong `screen-sup-profile` - `M-SUP-06` và `screen-sup-home` - `M-SUP-01`)
- **Mã được tích hợp:** `M-SUP-07` (Khởi tạo Dự án Bảo hành & Cấu hình Tuyến đường).
- **Vị trí trong HTML:** Được tích hợp trực tiếp vào Trung tâm Quản trị & Hồ sơ Giám sát trưởng `screen-sup-profile` (`M-SUP-06`) và Bảng điều phối `screen-sup-home` (`M-SUP-01`).
- **Lý do & Giá trị nghiệp vụ:** Trên ứng dụng di động, các chức năng quản trị cấp cao của Giám sát trưởng (Tạo dự án mới, phân bổ hợp đồng bảo lãnh 5%, cấu hình lý trình Km và phân quyền nhân sự 4 vai trò) được quy hoạch thành các module quản trị trong màn hình Hồ sơ & Thiết lập Hệ thống `M-SUP-06`, thay vì tạo một màn hình độc lập làm phân tán luồng tác nghiệp.

---

## 3.2 Giải pháp Kiến trúc Xử lý Xung đột Thanh Điều hướng & Các Nút Hành động

Trong đợt rebuild prototype ngày 12/09/2026, toàn bộ 40 màn hình quy chuẩn đã được tối ưu hóa kiến trúc layout:
1. **Loại bỏ triệt để `fixed bottom-0` bên trong các màn hình con:** Các thanh fixed bottom trước đây bám dính vào chân màn hình điện thoại đè lấp thanh điều hướng chung `nav-role-*`. Toàn bộ các nút CTA (như nút *"Giao việc"* trong `M-PM-12`, *"Gửi phê duyệt"* trong `M-PM-09`, *"Xác nhận hoàn thành"* trong `M-PM-13`, *"Duyệt / Từ chối"* trong `M-SUP-02`) đều được chuyển vào cuối khối nội dung cuộn (`overflow-y-auto`).
2. **Khung màn hình danh sách chứa FAB `+` đặt `h-full relative`:** Hai màn hình danh sách chính `screen-crew-tasks` (`M-CREW-02`) và `screen-pm-surveys` (`M-PM-02`) được cấu hình `h-full relative`, nút FAB `+` sử dụng `absolute right-4 bottom-24 z-30`. Nút luôn nổi tĩnh tại vị trí cách đáy 96px, nằm ngay phía trên thanh nav chung (64px) mà không che khuất các tab điều hướng, trong khi danh sách thẻ công việc cuộn mượt mà phía sau.
3. **Thanh điều hướng `nav-role-*` là phần tử duy nhất dính đáy:** Đảm bảo tính công thái học và chuẩn mực giao diện di động Cát Tường Field.

---

# PHẦN IV: MA TRẬN TRUY VẾT YÊU CẦU ĐẦY ĐỦ 109 USE CASES
## ĐỐI CHIẾU 1-1: 109 USE CASE → 70 USER STORY → 40 MÀN HÌNH WIREFRAME THỰC CÓ

Bảng ma trận dưới đây đối chiếu đầy đủ **100% không sót một mục nào** từ 109 Use Case quy chuẩn trong tài liệu `Dac_ta_UseCase.md` sang 70 User Story và ánh xạ **DUY NHẤT** vào các mã màn hình thực có trong 40 màn hình quy chuẩn của nguyên mẫu `index.html`:

| STT | Mã UC | Tên Chức năng Nghiệp vụ | Mã User Story | Mã Màn hình Wireframe Thực có | Tên Màn hình & Thành phần Giao diện | Tác nhân Trực tiếp | Trạng thái Độ phủ |
|:---:|:---:|---|---|:---:|---|---|:---:|
| 0 | **CN00** | Khởi động ứng dụng & Định vị thương hiệu Cát Tường | [US-CN01] | **M-SPLASH** | Màn hình Khởi động Thương hiệu Cát Tường & Nạp Cache | Cả 4 vai trò | Đã đặc tả 100% |
| 1 | **CN01** | Đăng nhập / đăng xuất | [US-CN01] | **M00** | Màn hình Đăng nhập RoadGuard Cát Tường | Cả 4 vai trò | Đã đặc tả 100% |
| 2 | **CN02** | Xem và cập nhật hồ sơ cá nhân | [US-CN02] | **M-DRONE-07 / M-CREW-11 / M-PM-15 / M-SUP-06** | Màn hình Hồ sơ Cá nhân theo từng vai trò | Cả 4 vai trò | Đã đặc tả 100% |
| 3 | **CN03** | Xem dự án và công việc trong phạm vi được giao | [US-CN03] | **M-DRONE-01 / M-CREW-01 / M-PM-01 / M-SUP-01** | Trang chủ Dashboard thích ứng 4 vai trò | Cả 4 vai trò | Đã đặc tả 100% |
| 4 | **CN04** | Xem thông báo và nhắc việc | [US-CN04] | **M-DRONE-01 / M-CREW-01 / M-PM-01 / M-SUP-01** | Trung tâm Thông báo & Thẻ nhắc việc khẩn cấp | Cả 4 vai trò | Đã đặc tả 100% |
| 5 | **CN05** | Lưu công việc và bản đồ phục vụ ngoại tuyến | [US-CN05] | **M-DRONE-03 / M-CREW-04** | Bản đồ Tuyến đường & Bộ nhớ đệm Ngoại tuyến | Drone / Đội trưởng | Đã đặc tả 100% |
| 6 | **CN06** | Lưu bản nháp và bằng chứng khi không có mạng | [US-CN05] | **M-DRONE-06 / M-CREW-10** | Trung tâm Đồng bộ & Lưu trữ Bản nháp Cục bộ | Drone / Đội trưởng | Đã đặc tả 100% |
| 7 | **CN07** | Theo dõi và tiếp tục đồng bộ dữ liệu | [US-CN06] | **M-DRONE-06 / M-CREW-10** | Hàng đợi Tải lên Nền (Background Sync Queue) | Drone / Đội trưởng | Đã đặc tả 100% |
| 8 | **CN08** | Kiểm tra trạng thái đồng bộ an toàn | [US-CN06] | **M-DRONE-06 / M-CREW-10** | Huy hiệu Xác nhận Toàn vẹn (SHA-256 Checksum) | Drone / Đội trưởng | Đã đặc tả 100% |
| 9 | **CN09** | Dọn bản sao cục bộ đã đồng bộ an toàn | [US-CN07] | **M-DRONE-06 / M-CREW-10** | Khu vực Giải phóng Bộ nhớ An toàn (Safe Local Purge) | Drone / Đội trưởng | Đã đặc tả 100% |
| 10 | **DA01** | Tạo và cập nhật dự án | [US-DA01] | **M-SUP-06 / M-SUP-01** | Module Quản lý Dự án Bảo hành Mới (Tích hợp M-SUP-06) | Giám sát | Đã đặc tả 100% |
| 11 | **DA02** | Quản lý tuyến và đoạn đường | [US-DA02] | **M-SUP-06 / M-PM-15** | Cấu hình Phân đoạn Lý trình Km & Loại mặt đường | Giám sát / PM | Đã đặc tả 100% |
| 12 | **DA03** | Phân công nhân sự và quyền theo dự án | [US-DA03] | **M-SUP-06** | Phân quyền Vai trò RBAC & Gán Nhân sự Dự án | Giám sát | Đã đặc tả 100% |
| 13 | **DA04** | Quản lý hồ sơ bàn giao và thông tin bảo hành | [US-DA04] | **M-SUP-06 / M-PM-01 / M-SUP-01** | Quản lý Hợp đồng, Quỹ bảo lãnh giữ lại & Thời hạn | Giám sát / PM | Đã đặc tả 100% |
| 14 | **DA05** | Xem hồ sơ dự án và thời hạn bảo hành | [US-DA04] | **M-PM-01 / M-SUP-02** | Thẻ Đếm ngược Thời hạn Bảo hành 90/30/7 ngày | PM / Giám sát | Đã đặc tả 100% |
| 15 | **DA06** | Lập và điều chỉnh kế hoạch khảo sát định kỳ | [US-DA05] | **M-PM-02** | Quản lý Chiến dịch Khảo sát Định kỳ 6/12/18 tháng | PM | Đã đặc tả 100% |
| 16 | **DA07** | Xem lịch và nhắc khảo sát sắp đến hạn | [US-DA05] | **M-PM-02 / M-PM-01** | Lịch trình Khảo sát & Cảnh báo Đến hạn Bay | PM | Đã đặc tả 100% |
| 17 | **DA08** | Tạo yêu cầu khảo sát từ kế hoạch hoặc phát sinh | [US-DA06] | **M-PM-03** | Form Khởi tạo Yêu cầu Khảo sát & Thông số Bay | PM | Đã đặc tả 100% |
| 18 | **DA09** | Ghi nhận hoãn / không triển khai khảo sát | [US-DA05] | **M-PM-02** | Popup Ghi nhận Lý do Hoãn Bay do Thời tiết/Sự cố | PM | Đã đặc tả 100% |
| 19 | **DA10** | Chọn và xác nhận hồ sơ khảo sát gốc bàn giao | [US-DA07] | **M-PM-06/14 / M-PM-02** | Chọn & Khóa Mốc Hồ sơ Khảo sát Gốc (Baseline) | PM | Đã đặc tả 100% |
| 20 | **DA11** | Xem tình trạng công trình qua các kỳ khảo sát | [US-DA07, US-AI08] | **M-PM-06/14 / M-SUP-02** | Ma trận Suy giảm Chất lượng Đường qua các Kỳ | PM / Giám sát | Đã đặc tả 100% |
| 21 | **DA12** | Đóng / ngừng sử dụng dự án và tra cứu | [US-DA08] | **M-SUP-06** | Tùy chọn Đóng Dự án & Lưu trữ Hồ sơ 5 năm | Giám sát | Đã đặc tả 100% |
| 22 | **KS01** | Phân công người bay cho yêu cầu khảo sát | [US-KS01] | **M-PM-03** | Phân công Phi công Drone đích danh | PM | Đã đặc tả 100% |
| 23 | **KS02** | Xem và tiếp nhận yêu cầu khảo sát | [US-KS02] | **M-DRONE-02 / M-DRONE-03** | Danh sách Lệnh bay & Nút Tiếp nhận Nhiệm vụ | Phi công Drone | Đã đặc tả 100% |
| 24 | **KS03** | Từ chối nhiệm vụ khảo sát kèm lý do | [US-KS02] | **M-DRONE-03 / M-DRONE-02** | Modal Từ chối Lệnh bay (Nhập lý do thời tiết/kỹ thuật) | Phi công Drone | Đã đặc tả 100% |
| 25 | **KS04** | Điều chỉnh lịch và phân công lại người bay | [US-KS01] | **M-PM-03** | Điều chuyển Lệnh bay cho Pilot khác | PM | Đã đặc tả 100% |
| 26 | **KS05** | Ghi nhận thông tin chuyến bay và tài liệu | [US-KS03] | **M-DRONE-05** | Màn hình Nhật ký Khảo sát Bay & Khí tượng | Phi công Drone | Đã đặc tả 100% |
| 27 | **KS06** | Nhập và sao chép video từ thẻ nhớ vào ứng dụng | [US-KS04] | **M-DRONE-04** | Trình duyệt Thẻ nhớ OTG & Sao chép Cục bộ Thật | Phi công Drone | Đã đặc tả 100% |
| 28 | **KS07** | Bổ sung tệp phụ đề định vị tương ứng với video | [US-KS05] | **M-DRONE-04** | Khung Quét Luồng GPS Nhúng & Chọn Tệp .SRT | Phi công Drone | Đã đặc tả 100% |
| 29 | **KS08** | Kiểm tra tính hợp lệ và chất lượng dữ liệu | [US-KS06] | **M-DRONE-04** | Chỉ báo Hợp lệ Dữ liệu (Pre-flight QA Validation) | Phi công Drone | Đã đặc tả 100% |
| 30 | **KS09** | Gửi bộ dữ liệu khảo sát và theo dõi tải lên | [US-CN06] | **M-DRONE-06** | Quản lý Đẩy Tệp Khảo sát lên Đám mây | Phi công Drone | Đã đặc tả 100% |
| 31 | **KS10** | Xem tiến độ xử lý và kết quả kiểm tra | [US-KS07] | **M-DRONE-06 / M-PM-02** | Thanh Trạng thái Xử lý Máy chủ (AI Pipeline) | Drone / PM | Đã đặc tả 100% |
| 32 | **KS11** | Yêu cầu bay bổ sung vùng dữ liệu chưa đạt | [US-KS08] | **M-PM-03 / M-DRONE-02** | Đánh dấu Đoạn Thiếu Dữ liệu & Lệnh Bay Bù | PM | Đã đặc tả 100% |
| 33 | **KS12** | Nộp dữ liệu bay bổ sung vào cùng lần khảo sát | [US-KS08] | **M-DRONE-04 / M-DRONE-02** | Gắn Video Bay Bù vào Đợt Khảo sát Cũ | Phi công Drone | Đã đặc tả 100% |
| 34 | **KS13** | Yêu cầu thử lại tác vụ xử lý thất bại | [US-KS09] | **M-PM-04 / M-SUP-06** | Nút Retry Tác vụ AI Thất bại trên Dữ liệu Sẵn có | PM / Giám sát | Đã đặc tả 100% |
| 35 | **AI01** | Xem kết quả phân tích trên bản đồ và ảnh | [US-AI01] | **M-PM-04 / M-PM-05** | Bản đồ GIS & Hộp thư Lỗi Kèm Bounding Box AI | PM | Đã đặc tả 100% |
| 36 | **AI02** | Xem ảnh trực giao và mô hình bề mặt | [US-AI02] | **M-PM-06/14** | Trình duyệt Ảnh Trực giao & Lớp Phủ DSM 3D | PM | Đã đặc tả 100% |
| 37 | **AI03** | Xem vị trí, kích thước và độ không chắc chắn | [US-AI03] | **M-PM-04 / M-PM-05** | Thông số Kích thước Kèm Sai số Hình học (±15%) | PM | Đã đặc tả 100% |
| 38 | **AI04** | Xác nhận một hư hỏng được phát hiện | [US-AI04] | **M-PM-05** | Nút "Xác nhận Lỗi AI" & Chuyển sang Hàng chờ | PM | Đã đặc tả 100% |
| 39 | **AI05** | Hiệu chỉnh loại, mức độ, vị trí và vùng hư hỏng | [US-AI05] | **M-PM-05** | Bảng Chỉnh sửa Thuộc tính & Vẽ lại Bounding Box | PM | Đã đặc tả 100% |
| 40 | **AI06** | Loại bỏ phát hiện sai và giữ hồ sơ đối chiếu | [US-AI06] | **M-PM-05** | Nút "Báo AI Sai (False Positive)" Kèm Lý do | PM | Đã đặc tả 100% |
| 41 | **AI07** | Ghi lý do và lịch sử quyết định xác minh | [US-AI04, US-AI05, US-AI06] | **M-PM-05 / M-PM-06/14** | Nhật ký Lịch sử Thẩm định (Trước / Sau Chỉnh) | PM | Đã đặc tả 100% |
| 42 | **AI08** | Đối chiếu các phát hiện trùng cùng một hư hỏng | [US-AI07] | **M-PM-04** | Tính năng Gộp Phát hiện Trùng (Merge Overlaps) | PM | Đã đặc tả 100% |
| 43 | **AI09** | Đối chiếu cùng hư hỏng qua nhiều lần khảo sát | [US-AI07] | **M-PM-06/14** | Ghép Nối Mã Lỗi Duy nhất Qua Các Kỳ Kiểm tra | PM | Đã đặc tả 100% |
| 44 | **AI10** | Xem lịch sử và so sánh với hồ sơ gốc bàn giao | [US-AI08] | **M-PM-06/14** | Thanh Trượt Thời gian & So sánh với Ảnh Baseline | PM / Giám sát | Đã đặc tả 100% |
| 45 | **AI11** | Xem lỗi mới, ổn định hoặc đang phát triển | [US-AI08] | **M-PM-06/14** | Bảng Chỉ báo Tốc độ Lan rộng Nứt (mm/tháng) | PM / Giám sát | Đã đặc tả 100% |
| 46 | **AI12** | Xem cảnh báo hư hỏng cần ưu tiên kiểm tra | [US-AI08] | **M-PM-06/14 / M-SUP-02** | Thẻ Cảnh báo Đỏ Khẩn cấp (Lún võng/Nứt rạn nhanh) | PM / Giám sát | Đã đặc tả 100% |
| 47 | **AI13** | Yêu cầu kiểm tra thực địa để bổ sung căn cứ | [US-TN01] | **M-PM-07/M-CREW-05** | Lối tắt Chuyển tiếp Yêu cầu Đo đạc Hiện trường | PM | Đã đặc tả 100% |
| 48 | **AI14** | Duyệt nhãn hư hỏng phục vụ huấn luyện | [US-AI09] | **M-PM-05 / M-SUP-06** | Checkbox Duyệt Nhãn Chuẩn (Ground Truth Tag) | PM / Giám sát | Đã đặc tả 100% |
| 49 | **TN01** | Giao nhiệm vụ kiểm tra thực địa | [US-TN01] | **M-PM-07/M-CREW-05** | Form Giao Điểm Đo Kiểm tra cho Đội trưởng | PM | Đã đặc tả 100% |
| 50 | **TN02** | Xem và tiếp nhận nhiệm vụ kiểm tra thực địa | [US-TN01] | **M-CREW-02** | Tab Công việc Đo đạc Thực địa & Nút Tiếp nhận | Đội trưởng | Đã đặc tả 100% |
| 51 | **TN03** | Ghi ảnh, tọa độ và số đo kiểm tra tại hiện trường | [US-TN02] | **M-PM-07/M-CREW-05** | Form Nhập Số đo Thước kẹp & Ảnh Cận cảnh | Đội trưởng | Đã đặc tả 100% |
| 52 | **TN04** | Gửi kết quả kiểm tra cho quản lý dự án | [US-TN02] | **M-PM-07/M-CREW-05** | Nút Gửi Báo cáo Đo đạc Thực địa về PM | Đội trưởng | Đã đặc tả 100% |
| 53 | **TN05** | Đánh giá kết quả kiểm tra thực địa | [US-TN03] | **M-PM-07/M-CREW-05** | Bảng Đánh giá Số đo Thực tế & Xác thực Căn cứ | PM | Đã đặc tả 100% |
| 54 | **TN06** | Yêu cầu bổ sung bằng chứng hiện trường | [US-TN03] | **M-PM-07/M-CREW-05** | Nút Trả lại Yêu cầu Đội trưởng Đo lại Kèm Lý do | PM | Đã đặc tả 100% |
| 55 | **TN07** | Xem gợi ý nhóm nguyên nhân và căn cứ | [US-TN04] | **M-PM-07/M-CREW-05** | Hộp Gợi ý Nguyên nhân Hư hỏng Khách quan (AI) | PM | Đã đặc tả 100% |
| 56 | **TN08** | Đề xuất nguyên nhân và trách nhiệm bảo hành | [US-TN04] | **M-PM-07/M-CREW-05** | Lựa chọn Trách nhiệm (Thuộc / Ngoài Nhà thầu) | PM | Đã đặc tả 100% |
| 57 | **TN09** | Trình hồ sơ xác định trách nhiệm bảo hành | [US-TN04] | **M-PM-07/M-CREW-05** | Nút Ký Trình Tờ trình Trách nhiệm lên Giám sát | PM | Đã đặc tả 100% |
| 58 | **TN10** | Phê duyệt hoặc trả lại đề xuất trách nhiệm | [US-TN05] | **M-SUP-03** | Thẩm định Tờ trình Trách nhiệm & Ra Quyết định | Giám sát | Đã đặc tả 100% |
| 59 | **TN11** | Xem lịch sử quyết định và bằng chứng trách nhiệm | [US-TN05] | **M-SUP-03 / M-PM-07/M-CREW-05** | Tra cứu Lịch sử Quyết định & Tài liệu Pháp lý | Giám sát / PM | Đã đặc tả 100% |
| 60 | **SC01** | Chọn và gộp thủ công nhiều lỗi vào một đợt sửa | [US-SC01] | **M-PM-08** | Màn hình Tích chọn Checkbox Nhiều Lỗi Gộp Đợt | PM | Đã đặc tả 100% |
| 61 | **SC02** | Lập phương án sửa chữa cho từng lỗi | [US-SC02] | **M-PM-08** | Chọn Biện pháp Kỹ thuật & Khối lượng từng Lỗi | PM | Đã đặc tả 100% |
| 62 | **SC03** | Lập dự toán và tính tổng chi phí đợt sửa | [US-SC02] | **M-PM-08** | Bộ Tính toán Dự toán Ngân sách Động Toàn đợt | PM | Đã đặc tả 100% |
| 63 | **SC04** | Trình toàn bộ đợt sửa cho giám sát phê duyệt | [US-SC03] | **M-PM-09** | Màn hình Trình duyệt Đợt Sửa Phiên bản v1.0 | PM | Đã đặc tả 100% |
| 64 | **SC05** | Thẩm định và quyết định phê duyệt toàn bộ đợt | [US-SC04] | **M-SUP-02** | Màn hình Thẩm định Toàn đợt & Ký duyệt Ngân sách | Giám sát | Đã đặc tả 100% |
| 65 | **SC06** | Đánh giá phương án và chi phí dự kiến | [US-SC04] | **M-SUP-02** | Bảng Kiểm tra Chi tiết Đơn giá & Định mức | Giám sát | Đã đặc tả 100% |
| 66 | **SC07** | Ghi lỗi chưa được chấp thuận và lý do | [US-SC04] | **M-SUP-02** | Nút Từ chối Kèm Ô Nhập Ghi chú Phê duyệt | Giám sát | Đã đặc tả 100% |
| 67 | **SC08** | Chỉnh sửa hồ sơ đợt sửa theo yêu cầu giám sát | [US-SC05] | **M-PM-10** | Màn hình Chỉnh sửa Tờ trình Tiếp thu Ý kiến v2.0 | PM | Đã đặc tả 100% |
| 68 | **SC09** | Tính lại chi phí và trình lại toàn bộ đợt sửa | [US-SC05] | **M-PM-10** | Tự động Tính lại Tổng Dự toán v2.0 & Nộp lại | PM | Đã đặc tả 100% |
| 69 | **SC10** | Phân công đội trưởng sau khi đợt sửa được duyệt | [US-SC06] | **M-PM-12** | Màn hình Giao Đợt Đã Duyệt cho Đội trưởng Thi công | PM | Đã đặc tả 100% |
| 70 | **SC11** | Điều chỉnh phân công đội trưởng phụ trách | [US-SC06] | **M-PM-12** | Điều chuyển Đội thi công & Ghi vết Bàn giao | PM | Đã đặc tả 100% |
| 71 | **SC12** | Theo dõi tiến độ và lịch sử phê duyệt đợt sửa | [US-SC07] | **M-PM-11** | Tab Trạng thái Đợt sửa (Tiến trình Phê duyệt & Lịch sử) | PM / Giám sát | Đã đặc tả 100% |
| 72 | **HT01** | Xem và tiếp nhận đợt sửa chữa được giao | [US-HT01] | **M-CREW-02 / M-CREW-03** | Xem Lệnh Công tác #WO & Biện pháp Kỹ thuật | Đội trưởng | Đã đặc tả 100% |
| 73 | **HT02** | Xem vị trí và hướng dẫn tiếp cận lỗi tại hiện trường | [US-HT01] | **M-CREW-04** | Bản đồ Chỉ đường Dẫn tuyến GPS Từng Khuyết tật | Đội trưởng | Đã đặc tả 100% |
| 74 | **HT03** | Ghi kế hoạch triển khai và phân việc trong đội | [US-HT02] | **M-CREW-03** | Bảng Phân công Nhân công & Máy móc Thi công | Đội trưởng | Đã đặc tả 100% |
| 75 | **HT04** | Ghi bằng chứng trước và sau sửa chữa từng lỗi | [US-HT03] | **M-CREW-06** | Kính ngắm Chụp ảnh Căn góc (Ghost Overlay) & Watermark | Đội trưởng | Đã đặc tả 100% |
| 76 | **HT05** | Cập nhật tiến độ, khối lượng và chi phí | [US-HT04] | **M-CREW-07** | Nhật ký Từng Bước Thi công & Khối lượng Tiêu hao | Đội trưởng | Đã đặc tả 100% |
| 77 | **HT06** | Báo cáo hư hỏng mới phát hiện tại hiện trường | [US-HT05] | **M-CREW-08** | Màn hình Báo lỗi Mới Phát sinh Tách rời Đợt duyệt | Đội trưởng | Đã đặc tả 100% |
| 78 | **HT07** | Gửi báo cáo hoàn thành cho quản lý dự án | [US-HT06] | **M-CREW-09** | Màn hình Hoàn tất & Ký Biên bản Bàn giao Hiện trường | Đội trưởng | Đã đặc tả 100% |
| 79 | **HT08** | Kiểm tra đủ bằng chứng trước/sau từng lỗi | [US-HT06] | **M-CREW-06 / M-CREW-09** | Chốt Chặn Tự động: Khóa Gửi nếu Thiếu Ảnh Trước/Sau | Hệ thống | Đã đặc tả 100% |
| 80 | **HT09** | Kiểm tra kết quả sửa chữa của từng lỗi | [US-HT07] | **M-PM-13** | Màn hình PM Đối soát Ảnh Trước/Sau Từng Điểm | PM | Đã đặc tả 100% |
| 81 | **HT10** | Yêu cầu sửa lại những lỗi chưa đạt | [US-HT07, US-HT08] | **M-PM-13** | Nút "Yêu cầu làm lại" Trả Về Đội trưởng Kèm Chỉ đạo | PM | Đã đặc tả 100% |
| 82 | **HT11** | Trình kết quả hoàn thành cho giám sát xác nhận | [US-HT07] | **M-PM-13** | Nút "Xác nhận hoàn thành" Trình lên Giám sát | PM | Đã đặc tả 100% |
| 83 | **HT12** | Xác nhận hoàn tất các lỗi và đợt sửa chữa | [US-HT08] | **M-SUP-08** | Màn hình Giám sát Ký duyệt Đóng Đợt Sửa Chữa (Sign-off) | Giám sát | Đã đặc tả 100% |
| 84 | **HT13** | Thực hiện sửa lại và bổ sung báo cáo từng lỗi | [US-HT09] | **M-CREW-02 / M-CREW-06** | Thẻ Công việc Khắc phục Lỗi Bị Trả Lại & Chụp ảnh bù | Đội trưởng | Đã đặc tả 100% |
| 85 | **HT14** | Xem lịch sử sửa chữa và chi phí sau hoàn tất | [US-SC07] | **M-SUP-08 / M-PM-11** | Hồ sơ Lưu trữ Hoàn công & Quyết toán Chi phí | Giám sát / PM | Đã đặc tả 100% |
| 86 | **BC01** | Xem tổng quan danh mục dự án bảo hành | [US-BC01] | **M-SUP-01** | Bảng Tổng chỉ số Toàn bộ Công trình Bảo hành | Giám sát | Đã đặc tả 100% |
| 87 | **BC02** | Xem tổng quan dự án được phân công | [US-BC01] | **M-PM-01** | Bảng Chỉ số Dự án Thuộc Quyền Phân công | PM | Đã đặc tả 100% |
| 88 | **BC03** | Xem chi phí sửa chữa dự kiến và thực tế | [US-BC01] | **M-SUP-01 / M-PM-01** | Đối chiếu Dự toán Đã Duyệt vs Quyết toán Thực chi | Giám sát / PM | Đã đặc tả 100% |
| 89 | **BC04** | Xem công trình rủi ro cao và phát triển nhanh | [US-AI08, US-BC01] | **M-SUP-03** | Danh mục Tuyến đường Báo động Đỏ Cần Can thiệp | Giám sát | Đã đặc tả 100% |
| 90 | **BC05** | So sánh tình trạng giữa các dự án và kỳ khảo sát | [US-BC02] | **M-SUP-03 / M-SUP-04** | Biểu đồ So sánh Xu hướng Hư hỏng Qua Các Kỳ | Giám sát | Đã đặc tả 100% |
| 91 | **BC06** | Xuất báo cáo theo dự án và khoảng thời gian | [US-BC03] | **M-SUP-04 / M-SUP-05** | Bộ lọc Thời gian & Tạo Báo cáo Quản trị PDF | Giám sát / PM | Đã đặc tả 100% |
| 92 | **BC07** | Xuất hồ sơ bằng chứng cho đoạn đường hoặc một lỗi | [US-BC04] | **M-SUP-05** | Xuất Gói Hồ sơ Bằng chứng Đoạn đường Tuyển chọn | Giám sát / PM | Đã đặc tả 100% |
| 93 | **BC08** | Tổng hợp ảnh gốc, số đo, lịch sử và quyết định | [US-BC04] | **M-SUP-05** | Trích xuất Toàn bộ Dữ liệu Gốc Kèm Siêu dữ liệu | Hệ thống | Đã đặc tả 100% |
| 94 | **BC09** | Kèm nguồn gốc và thông tin toàn vẹn hồ sơ | [US-BC04] | **M-SUP-05** | Đính kèm Bảng kê Checksum SHA-256 Chống Sửa đổi | Hệ thống | Đã đặc tả 100% |
| 95 | **BC10** | Tra cứu hồ sơ lưu trữ sau khi dự án đã đóng | [US-DA08, US-BC05] | **M-SUP-05 / M-SUP-06** | Kho Tra cứu Lưu trữ Hồ sơ Dự án Đã Bàn giao | Giám sát / PM | Đã đặc tả 100% |
| 96 | **QT01** | Tạo, cập nhật và ngừng sử dụng tài khoản | [US-QT01] | **M-SUP-06** | Quản lý Tài khoản Người dùng Nội bộ Cát Tường | Giám sát | Đã đặc tả 100% |
| 97 | **QT02** | Quản lý vai trò và quyền truy cập dự án | [US-DA03] | **M-SUP-06** | Cấu hình Phân quyền RBAC 4 Vai trò theo Dự án | Giám sát | Đã đặc tả 100% |
| 98 | **QT03** | Quản lý danh mục loại lỗi và nhóm nguyên nhân | [US-QT02] | **M-SUP-06** | Danh mục Chuẩn hóa Khuyết tật Đường bộ TCVN | Giám sát | Đã đặc tả 100% |
| 99 | **QT04** | Quản lý bộ quy tắc phân mức và dung sai | [US-QT03] | **M-SUP-06** | Cấu hình Ngưỡng Dung sai Kích thước theo Phiên bản | Giám sát | Đã đặc tả 100% |
| 100 | **QT05** | Cấu hình nhắc khảo sát và nhắc trước hạn bảo hành | [US-QT04] | **M-SUP-06** | Cài đặt Mốc Cảnh báo Hạn Bảo hành (90/60/30/7 ngày) | Giám sát | Đã đặc tả 100% |
| 101 | **QT06** | Quản lý, phát hành và ngừng dùng phiên bản AI | [US-QT05] | **M-SUP-06** | Quản lý Phiên bản Model AI (Model Registry & mAP) | Giám sát | Đã đặc tả 100% |
| 102 | **QT07** | Xuất dữ liệu và nhãn đã được duyệt cho huấn luyện | [US-QT06] | **M-SUP-06** | Xuất Dataset Huấn luyện Đã Qua Thẩm định (COCO/YOLO) | Giám sát | Đã đặc tả 100% |
| 103 | **QT08** | Theo dõi tác vụ xử lý, dung lượng và máy chủ | [US-QT07] | **M-SUP-06** | Bảng Giám sát Tải Hệ thống, Hàng đợi & Cloud Storage | Giám sát | Đã đặc tả 100% |
| 104 | **QT09** | Tra cứu nhật ký truy vết và lịch sử thay đổi | [US-QT08] | **M-SUP-06** | Tra cứu Audit Logs Bất biến (Ai sửa / Khi nào / Giá trị) | Giám sát | Đã đặc tả 100% |
| 105 | **QT10** | Quản lý thông tin thiết bị bay và quy trình | [US-QT09] | **M-SUP-06 / M-DRONE-07** | Hồ sơ Quản lý Drone, Trạm RTK & Sổ tay Quy chuẩn Bay | Giám sát / Drone | Đã đặc tả 100% |
| 106 | **QT11** | Lập yêu cầu xóa dữ liệu đã hết hạn lưu trữ | [US-QT10] | **M-SUP-06** | Hàng đợi Hồ sơ Quá hạn Lưu trữ Chờ Tiêu hủy | PM | Đã đặc tả 100% |
| 107 | **QT12** | Phê duyệt yêu cầu xóa dữ liệu hết hạn | [US-QT10] | **M-SUP-06** | Phê duyệt Tiêu hủy Dữ liệu Đạt Thời hạn (Bảo hành + 5 năm) | Giám sát | Đã đặc tả 100% |
| 108 | **QT13** | Kiểm tra hạn lưu trữ và trạng thái giữ hồ sơ | [US-QT10] | **M-SUP-06** | Logic Chặn Xóa Tự động Khi Đang Giữ Tranh chấp | Hệ thống | Đã đặc tả 100% |
| 109 | **QT14** | Thiết lập / gỡ giữ hồ sơ phục vụ tranh chấp | [US-QT11] | **M-SUP-06** | Khóa Pháp lý Legal Hold Đối với Dự án Đang Khiếu nại | Giám sát | Đã đặc tả 100% |

---

### KẾT LUẬN ĐỘ PHỦ NGHIỆP VỤ & TỔNG KẾT REBUILD:
- **Tổng số Use Case trong hệ thống:** 109 / 109 Use Case (**Đạt độ phủ 100%**).
- **Tổng số User Story trong tài liệu:** 70 / 70 User Story (**Đạt độ phủ 100%**).
- **Tổng số Màn hình Wireframe được đặc tả:** **40 Màn hình quy chuẩn đặc tả** (Đồng bộ 100% với nguyên mẫu HTML `index.html` 40 màn hình chuẩn).
- **Phân bổ theo vai trò:**
  - *Xác thực & Ngoại tuyến:* 2 màn hình (`M-SPLASH`, `M00`).
  - *Phi công Drone:* 7 màn hình (`M-DRONE-01` đến `M-DRONE-07`).
  - *Đội Sửa chữa:* 10 màn hình (`M-CREW-01` đến `M-CREW-11`, gộp `M-CREW-05`).
  - *Quản lý Dự án (PM):* 14 màn hình (`M-PM-01` đến `M-PM-13`, `M-PM-15`, gộp `M-PM-14` và `M-CREW-05`).
  - *Ban Giám sát & Quản trị:* 7 màn hình (`M-SUP-01` đến `M-SUP-06`, `M-SUP-08`, tích hợp `M-SUP-07`).
- **Tính toàn vẹn kỹ thuật:** Toàn bộ dữ liệu nhân sự & định danh thực tế (Nguyễn Thùy Lan `PM-0428`, Nguyễn Văn An `CT-2089`, Nguyễn Văn Tuấn `CT-RC-084`, Trần Văn Vượng nhận `#WO-118`, Trần Thế Hùng `NV-8842`, dự toán `42.500.000 VNĐ`, `74.900.000 VNĐ`, `#REQ-045`, `#WO-118`, `#DF-0231`), nhận diện thương hiệu Cát Tường (`assets/logo_cattuong.png`, font Sansation/Roboto, màu `#8C6D1F` / `#C9A227`), triết lý Offline-First và loại trừ đè thanh điều hướng chung đã được đồng bộ chuẩn mực tuyệt đối giữa Tài liệu Đặc tả và Mã nguồn Thực thi.
