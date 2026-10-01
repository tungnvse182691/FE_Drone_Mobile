---
version: alpha
name: Hoàng Hải Field (RoadGuard)
description: Hệ thống thiết kế cho app di động quản lý bảo hành & sửa chữa hạ tầng đường bộ của Công ty TNHH Xây dựng Bê tông Hoàng Hải — Android, phong cách minimalism thực dụng, dùng bởi Repair Crew (Đội sửa chữa), Drone Operator (Phi công) và Reporter (Người dân / Đại diện Ban QLDA).
colors:
  primary: "#C9A227"
  brand-gold: "#8C6D1F"
  primary-dark: "#6B5219"
  secondary: "#2D3748"
  neutral: "#1A1D20"
  surface: "#FFFFFF"
  surface-alt: "#F8F9FA"
  on-primary: "#FFFFFF"
  on-surface: "#1A1D20"
  border: "#E2E5E9"
  success: "#2F9E44"
  warning: "#F59E0B"
  error: "#E5484D"
  info: "#3B82F6"
typography:
  headline-lg:
    fontFamily: Sansation
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.3
  title-lg:
    fontFamily: Roboto
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.3
  title-md:
    fontFamily: Roboto
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
  body-lg:
    fontFamily: Roboto
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: Roboto
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-lg:
    fontFamily: Roboto
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.2
  label-sm:
    fontFamily: Roboto
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.02em
  caption:
    fontFamily: Roboto
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 20px
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  screen-margin: 16px
  card-padding: 16px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-pressed:
    backgroundColor: "{colors.primary-dark}"
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.neutral}"
    borderColor: "{colors.secondary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 12px
  button-text:
    backgroundColor: transparent
    textColor: "{colors.secondary}"
    typography: "{typography.label-lg}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding}"
  input-field:
    backgroundColor: "{colors.surface-alt}"
    textColor: "{colors.on-surface}"
    borderColor: "{colors.border}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    padding: 12px
  chip-severity-high:
    backgroundColor: "#FDECEC"
    textColor: "{colors.error}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
  chip-severity-medium:
    backgroundColor: "#FEF3E2"
    textColor: "{colors.warning}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
  chip-severity-low:
    backgroundColor: "#E9F7EC"
    textColor: "{colors.success}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
  chip-status-pending:
    backgroundColor: "{colors.surface-alt}"
    textColor: "{colors.secondary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
  chip-mode-inspect-repair:
    backgroundColor: "#E9F7EC"
    textColor: "{colors.success}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
  chip-mode-measure-only:
    backgroundColor: "#F1F3F5"
    textColor: "{colors.secondary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
  chip-fasttrack-eligible:
    backgroundColor: "#E9F7EC"
    textColor: "{colors.success}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
  chip-fasttrack-exceeded:
    backgroundColor: "#FEF3E2"
    textColor: "{colors.warning}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
  chip-fasttrack-locked:
    backgroundColor: "#FDECEC"
    textColor: "{colors.error}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
  bottom-nav:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    activeTextColor: "{colors.primary}"
---

## Overview

Hoàng Hải Field (RoadGuard) là app di động dành cho đội ngũ hiện trường và người dân phản ánh của **Công ty TNHH Xây dựng Bê tông Hoàng Hải**, phục vụ khảo sát drone, xác minh đo đạc hiện trường, sửa chữa bảo hành theo cơ chế Fast Track, và tiếp nhận phản ánh hư hại mặt đường bê tông nông thôn (TCVN 10380:2014).

App phục vụ **3 nhóm người dùng hiện trường**:
1. **Repair Crew (Kỹ thuật viên sửa chữa):** Tiếp nhận công việc, xem chế độ `INSPECT_AND_REPAIR` / `MEASURE_ONLY`, tự đánh giá `FastTrackPolicyVersion` để sửa nhanh tại chỗ, chụp ảnh BEFORE/AFTER và đồng bộ ngoại tuyến SQLite.
2. **Drone Operator (Phi công):** Nhận lệnh bay, dẫn đường GPS đến Điểm tiếp cận / Điểm tập kết (Access Point), tải dữ liệu ảnh/video 4K RGB từ thẻ nhớ SD.
3. **Reporter (Người dân & Đại diện Ban QLDA):** Đăng ký/xác thực OTP Email (RFC 5322, theo D25), gửi phản ánh kèm GPS + 3 ảnh, tra cứu tiến độ công khai qua mã tracking, đánh giá chất lượng nghiệm thu 1–5 sao.

Giao diện tuân thủ triết lý **minimalism thực dụng**: mỗi màn hình chỉ hiển thị đúng thông tin cần để ra quyết định hoặc thực hiện một hành động, không có chi tiết trang trí thừa. Vàng đồng thương hiệu `#C9A227` chỉ xuất hiện ở đúng nơi cần thu hút chú ý (hành động chính, tab active, KPI).

### Quy tắc phân tách Logo Thương hiệu
- **Màn Splash / Loading:** Sử dụng `assets/logo_hoanghai.png` (có đầy đủ tên công ty và slogan).
- **Màn hình nội bộ, AppHeader, Form Đăng nhập, App Icon:** Sử dụng `assets/logo_hoanghai_icon.png` (chỉ biểu tượng xe bồn bê tông, tuyệt đối KHÔNG có chữ).

### Quy định Thư viện Icon (Icon Specification)
- **Thư viện Icon bắt buộc:** 100% `@expo/vector-icons/MaterialIcons` (chuẩn Google Material Symbols design).
- **NGHIÊM CẤM:** Tuyệt đối KHÔNG sử dụng `Ionicons` hoặc bất kỳ thư viện icon nào khác trong các màn hình và components của app. Mọi icon trong hệ thống phải đồng bộ 100% MaterialIcons.

### Quy tắc Phi tài chính UD-06 (Zero Cost)
- **TUYỆT ĐỐI ZERO CHI PHÍ** trên toàn bộ màn hình Mobile. Cấm hiển thị VNĐ, dự toán, kinh phí, đơn giá, định mức xi măng/cát đá.
- Mọi thông tin thi công chỉ hiển thị: **Phương án kỹ thuật** + **Kích thước hư hại hình học** (m², cm, m) + **Thời hạn xử lý**.

---

## Colors

- **Primary (#C9A227):** Vàng đồng thương hiệu Hoàng Hải. Chỉ dùng cho nút hành động chính (CTA), tab đang chọn, icon rating sao và KPI nổi bật. Không dùng cho nền lớn.
- **Primary Dark (#6B5219):** Trạng thái nhấn (pressed) của nút chính.
- **Secondary (#2D3748):** Xám than dùng cho viền, icon phụ, text thứ cấp (label, caption).
- **Neutral (#1A1D20):** Gần đen, dùng cho text chính, đảm bảo độ tương phản cao ngoài nắng gắt.
- **Surface (#FFFFFF) / Surface Alt (#F8F9FA):** Trắng tinh cho card, trắng ngà cho nền màn hình.
- **Border (#E2E5E9):** Viền mảnh 1px.
- **Success (#2F9E44) / Warning (#F59E0B) / Error (#E5484D):** Màu ngữ nghĩa cho badge mức độ khuyết tật, trạng thái Fast Track, không nhầm lẫn với vàng thương hiệu.
- **Info (#3B82F6):** Trạng thái đang xử lý, đồng bộ.

---

## Typography

Hệ thống sử dụng **Sansation** cho logo nhận diện Hoàng Hải và tiêu đề lớn (`headline-lg`), kết hợp cùng **Roboto** cho toàn bộ nội dung chức năng:
- **Headline (24px/500, Sansation):** Logo nhận diện Hoàng Hải, tiêu đề màn hình chính, số liệu KPI.
- **Title Large (20px/500):** Tiêu đề top bar.
- **Title Medium (16px/500):** Tiêu đề card, mã công việc `#WO-xxx`, mã phản ánh `#REP-xxx`.
- **Body Large (16px/400):** Nội dung chính, mô tả lỗi, phương án kỹ thuật.
- **Body Medium (14px/400):** Nội dung phụ, kích thước đo đạc (dài, rộng, sâu).
- **Label Large (14px/500):** Chữ trên nút bấm chính/phụ.
- **Label Small (11px/500, letter-spacing rộng):** Badge/Chip trạng thái, viết hoa.
- **Caption (12px/400):** Tọa độ GPS, timestamp, metadata thiết bị.

---

## Layout & Components

- **Card đơn cột:** Lề màn hình 16px, padding card 16px, spacing 8px / 16px / 24px.
- **Mỗi màn hình tối đa 1 CTA chính** màu vàng đồng `{colors.primary}`.
- **Chips Task Mode & Fast Track (Chữ thuần, tuyệt đối KHÔNG chứa emoji/icon màu tự chế):**
  - `[Đo & Sửa nhanh]`: Nền `#E9F7EC`, chữ xanh lá `#2F9E44`.
  - `[Chỉ đo đợt]`: Nền `#F1F3F5`, chữ xám `#2D3748`.
  - `[Đạt Policy Sửa Nhanh]`: Nền xanh lá nhạt `#E9F7EC`, chữ xanh lá `#2F9E44`, xuất hiện khi kích thước đo $\le$ ngưỡng quy định.
  - `[Vượt Policy - Chuyển PM]`: Nền cam nhạt `#FEF3E2`, chữ cam `#F59E0B`, hướng dẫn gửi số đo về cho PM duyệt.
- **Reporter Tracking Timeline:**
  - Trục dọc 5 bước hiển thị rõ ràng tiến độ: `Gửi phản ánh` $\rightarrow$ `Đã tiếp nhận` $\rightarrow$ `Khảo sát/Đo đạc` $\rightarrow$ `Đang sửa chữa` $\rightarrow$ `Hoàn thành nghiệm thu`.
- **Đánh giá chất lượng 1–5 sao:**
  - 5 ngôi sao kích thước 32px, tô màu vàng đồng `#C9A227` khi được chọn, kèm ô góp ý ngắn gọn.
- **Xác thực OTP 6 số:**
  - 6 ô nhập riêng biệt kích thước 44x48px, tự động nhảy focus khi nhập, hỗ trợ gửi lại mã sau 60s.

---

## Do's and Don'ts

- Do dùng vàng đồng `{colors.primary}` cho đúng một hành động chính trên mỗi màn hình.
- Do hiển thị rõ Task Mode (`INSPECT_AND_REPAIR` vs `MEASURE_ONLY`) trên màn hình chi tiết công việc của Crew.
- Do hiển thị kết quả kiểm tra Fast Track Policy ngay khi Crew nhập đủ 3 kích thước (dài x rộng x sâu).
- Do giữ tương phản văn bản đạt chuẩn WCAG AA ngoài trời nắng.
- Don't đưa bất kỳ thông tin chi phí, giá tiền hay định mức vật tư tiêu hao vào giao diện (UD-06).
- Don't tự ý cho phép Crew sửa nhanh khi công việc đang ở chế độ `MEASURE_ONLY` (BR-09).
- Don't dùng gradient hoặc shadow đậm.

---

## Accessibility & Trạng thái UI (theo `29_9/09_Frontend/10_FE_Architecture_UI_States.md`)

### Quy tắc bắt buộc
- **Label tiếng Việt sát input/field:** Không dùng placeholder thay label; unit đặt cạnh ô nhập (vd: `Diện tích (m²)`).
- **Lỗi có text + icon, KHÔNG chỉ màu:** Sau submit lỗi → focus tự động trở về field đầu tiên có lỗi.
- **Nút bị disable phải có lý do gần nút:** Không chỉ đổi màu xám. Vd: `[Tiến hành sửa nhanh ▸]` bị disable → hiển thị text `"Cần ảnh BEFORE trước khi sửa"` ngay bên dưới.
- **Không toast cho mỗi chunk upload / mỗi retry:** Gộp thành 1 banner trạng thái upload duy nhất.
- **Không loading xóa nội dung đã tải:** Skeleton chỉ dùng lần load đầu tiên; sau đó hiển thị stale data + badge "Đang cập nhật...".
- **Empty state ≠ No-permission state ≠ Offline-error state:** Ba trạng thái phải có UI và message riêng biệt.

### Offline Badge (bắt buộc xuyên màn hình tác nghiệp)
```
┌─────────────────────────────────────────────────────────────┐
│  📶 Offline • Đã tải lúc 08:32 • Chạm để đồng bộ ngay      │
└─────────────────────────────────────────────────────────────┘
```
- Màu nền: `#FEF3E2` (cam nhạt), chữ `#F59E0B`
- Hiển thị xuyên suốt màn hình Crew/Drone khi `navigator.onLine = false`
- Nhãn `"Đã tải lúc HH:mm"` phải luôn hiển thị được (không ẩn sau loading)
- Trạng thái offline KHÔNG disable capture ảnh/form nhập liệu

### Thông báo Success — Dùng từ cụ thể, không dùng từ chung
| Thay vì | Dùng |
|---|---|
| "Đã lưu" (generic) | "Đã lưu trên máy" / "Đang chờ đồng bộ" |
| "Đã gửi" (generic) | "Đã gửi lên máy chủ" |
| "Hoàn thành" (generic) | "PM đã kiểm tra" / "Máy chủ đã xác minh tệp" / "Đã nghiệm thu" |
| "Thất bại" sau timeout | "Chưa xác nhận được kết quả, đang kiểm tra" |
