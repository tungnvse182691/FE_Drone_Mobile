---
version: alpha
name: Hoàng Hải Field (RoadGuard)
description: Hệ thống thiết kế cho app quản lý bảo hành & sửa chữa hạ tầng đường bộ của Công ty TNHH Xây dựng Bê tông Hoàng Hải — Android, phong cách minimalism, dùng bởi Drone Operator, Project Manager, Supervisor và Repair Crew.
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
  bottom-nav:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    activeTextColor: "{colors.primary}"
---

## Overview

Hoàng Hải Field (RoadGuard) là app di động dành cho đội ngũ hiện trường và quản lý của Công ty TNHH Xây dựng Bê tông Hoàng Hải, phục vụ việc khảo sát bằng drone, xác minh lỗi, phê duyệt và sửa chữa hạ tầng đường bộ trong giai đoạn bảo hành. Người dùng là kỹ thuật viên, công nhân, kỹ sư và quản lý — phần lớn thao tác ngoài công trường, đôi khi không có mạng, ít quen thao tác app phức tạp.

Vì vậy giao diện đi theo triết lý **minimalism thực dụng**: mỗi màn hình chỉ hiển thị đúng thông tin cần để ra quyết định hoặc thực hiện một hành động, không có yếu tố trang trí thừa. Cảm giác tổng thể là "gọn, rõ, đáng tin cậy" — giống một công cụ chuyên nghiệp hơn là một app tiêu dùng nhiều màu sắc. Vàng đồng thương hiệu chỉ xuất hiện ở đúng nơi cần thu hút chú ý (hành động chính, trạng thái đang hoạt động), phần còn lại của giao diện trung tính để không gây xao nhãng.

### Quy tắc phân tách Logo Thương hiệu
- **Màn Splash / Loading:** Sử dụng `assets/logo_hoanghai.png` (có đầy đủ tên công ty và slogan).
- **Màn hình nội bộ, AppHeader, Form Đăng nhập, App Icon:** Sử dụng `assets/logo_hoanghai_icon.png` (chỉ biểu tượng xe bồn bê tông, tuyệt đối KHÔNG có chữ).

## Colors

- **Primary (#C9A227):** Vàng đồng thương hiệu Hoàng Hải. Chỉ dùng cho nút hành động chính (CTA), tab/mục đang được chọn, và số liệu nổi bật trên dashboard. Không dùng cho nền lớn hay text thường.
- **Primary Dark (#6B5219):** Biến thể đậm của vàng đồng, dùng cho trạng thái nhấn (pressed) của nút chính, hoặc icon/badge cần độ tương phản cao hơn trên nền sáng.
- **Secondary (#2D3748):** Xám than dùng cho viền, icon phụ, text thứ cấp (label, caption, dòng mô tả).
- **Neutral (#1A1D20):** Gần đen, dùng cho text chính (tiêu đề, nội dung quan trọng) để đảm bảo độ tương phản và dễ đọc ngoài trời nắng.
- **Surface (#FFFFFF) / Surface Alt (#F8F9FA):** Trắng tinh cho card/nút, trắng ngà cho nền màn hình — tạo phân lớp nhẹ nhàng mà không cần đổ bóng nặng.
- **Border (#E2E5E9):** Viền mảnh dùng thay cho shadow ở hầu hết các trường hợp.
- **Success (#2F9E44) / Warning (#F59E0B) / Error (#E5484D):** Ba màu ngữ nghĩa dùng riêng cho badge mức độ nghiêm trọng và trạng thái phê duyệt — tách biệt hoàn toàn khỏi vàng đồng thương hiệu để tránh nhầm lẫn giữa "màu thương hiệu" và "màu cảnh báo".
- **Info (#3B82F6):** Dùng hạn chế cho các thông báo mang tính trung lập (ví dụ trạng thái đang xử lý).

## Typography

Hệ thống sử dụng font **Sansation** cho logo nhận diện thương hiệu Hoàng Hải và tiêu đề lớn (`headline-lg`), kết hợp cùng **Roboto** (font mặc định Android) cho toàn bộ nội dung chức năng để giữ cảm giác trực quan, chuẩn nhận diện và dễ đọc ngoài công trường.

- **Headline (24px/500, Sansation):** Dùng cho chữ logo nhận diện Hoàng Hải, tiêu đề màn hình quan trọng và số liệu KPI nổi bật trên dashboard.
- **Title Large (20px/500):** Tiêu đề trong top app bar.
- **Title Medium (16px/500):** Tiêu đề card, tên mục trong danh sách.
- **Body Large (16px/400):** Nội dung chính — mô tả lỗi, ghi chú, hướng dẫn.
- **Body Medium (14px/400):** Nội dung phụ, mô tả thứ cấp.
- **Label Large (14px/500):** Chữ trên nút bấm.
- **Label Small (11px/500, letter-spacing rộng):** Chữ trong badge/chip trạng thái, luôn viết hoa.
- **Caption (12px/400):** Timestamp, ghi chú nhỏ, metadata.

## Layout

Bố cục theo dạng **card đơn cột**, không dùng lưới nhiều cột (vì đây là app điện thoại, thao tác một tay ngoài công trường). Lề màn hình cố định 16px, khoảng cách giữa các khối nội dung 24px, padding bên trong card 16px. Toàn bộ hệ thống spacing tuân theo thang 8px (4px chỉ dùng cho các điều chỉnh vi mô như khoảng cách icon–chữ).

Nguyên tắc quan trọng nhất: **mỗi màn hình có tối đa một hành động chính** (nút gold filled), các hành động phụ dùng nút outline hoặc text link nhạt màu hơn hẳn — để người dùng ngoài công trường không phải suy nghĩ nên bấm gì trước.

## Elevation & Depth

Không dùng shadow đậm hay gradient. Phân lớp thị giác đạt được bằng **tương phản nền** (surface-alt cho nền màn hình, surface trắng tinh cho card) kết hợp viền mảnh 1px màu border khi cần phân tách rõ. Chỉ nút nổi (FAB) mới có shadow rất nhẹ để gợi ý có thể bấm.

## Shapes

Bo góc nhất quán, mềm mại vừa phải: 12px cho card, 8px cho nút và ô nhập liệu, 20px cho các khối lớn như bottom sheet, bo tròn hoàn toàn (full) cho mọi chip/badge trạng thái. Không trộn góc bo và góc vuông trong cùng một màn hình.

## Components

- **Button Primary:** Nền vàng đồng `{colors.primary}`, chữ trắng, bo góc `{rounded.md}`, chỉ một nút loại này trên mỗi màn hình.
- **Button Secondary (outline):** Nền trong suốt, viền xám than, chữ đen — dùng cho hành động thay thế (ví dụ "Từ chối", "Chỉ đường").
- **Button Text:** Không nền không viền, dùng cho hành động ít quan trọng nhất trên màn hình (ví dụ "Yêu cầu khảo sát lại").
- **Card:** Nền trắng, bo góc lớn, padding 16px — khối chứa chính cho danh sách và chi tiết.
- **Input Field:** Nền trắng ngà, viền mảnh, bo góc 8px, không có icon trang trí thừa.
- **Chip mức độ nghiêm trọng:** ba biến thể high/medium/low dùng đúng 3 màu ngữ nghĩa (error/warning/success), không dùng vàng đồng.
- **Chip trạng thái (pending/approved/rejected):** nền xám nhạt trung tính, chỉ đổi màu chữ.
- **Bottom Navigation:** 4 mục cố định theo vai trò, icon+label, mục đang chọn tô màu vàng đồng, các mục còn lại màu xám than.

## Do's and Don'ts

- Do dùng vàng đồng `{colors.primary}` cho đúng một hành động chính trên mỗi màn hình.
- Do dùng ba màu ngữ nghĩa (success/warning/error) riêng biệt cho mức độ nghiêm trọng — không tái sử dụng màu thương hiệu cho việc này.
- Do giữ nhiều khoảng trắng, không lấp đầy màn hình bằng chi tiết trang trí.
- Do đảm bảo tương phản văn bản đạt WCAG AA (tối thiểu 4.5:1) vì người dùng thường thao tác ngoài trời nắng.
- Don't dùng gradient hoặc shadow đậm ở bất kỳ đâu.
- Don't trộn nhiều font trong cùng một màn hình — chỉ dùng Roboto.
- Don't đặt quá một nút "filled" màu vàng đồng trên cùng một màn hình.
- Don't dùng nhiều hơn 2 mức bo góc khác nhau trong cùng một view.
