# RoadGuard Industrial Premium — đặc tả đề xuất v1

Ngày: 19/11/2026. Owner duyệt định hướng Premium Operations 70% / Field Operations 30%.
Trạng thái: thí điểm **Operator Home** (chỉ Home). Chưa thay thế DESIGN.md, global tokens hoặc phê duyệt triển khai các màn khác.

## 1. Ý đồ và phạm vi

RoadGuard là công cụ hiện trường Bê tông Hoàng Hải. Premium đến từ nhịp chữ, tương phản và sự rõ ràng của nhiệm vụ thật; không thêm dashboard giả, phần trăm tiến độ, xu hướng hoặc trang trí drone.

Baseline Android `.cache/industrial-premium-step01/home-before.png`: ba KPI có trọng lượng bằng nhau; icon/giá trị/nhãn tách xa; ghi chú trang đầu đứng riêng; trạng thái và phạm vi cách xa tên nhiệm vụ; card lặp lại cao; nền kem cho nhiều mã/hành động làm vai trò màu chưa rõ. Giữ chào người dùng vì owner đã duyệt cụm tổng quan; giảm sự cạnh tranh bằng một nền xanh than, KPI đang thực hiện dùng vàng.

## 2. Màu và vai trò

| Vai trò | Màu | Quy tắc |
|---|---|---|
| Brand / KPI cần chú ý | #C9A227 | Vàng Hoàng Hải; không dùng chữ trắng cỡ nhỏ trên vàng |
| Tổng quan / chữ chính | #192D40 | Xanh than; tổng quan là mảng đậm duy nhất |
| Chữ trên than | #FFFFFF | Greeting và giá trị KPI trung tính |
| Chữ phụ trên than | #C9D3DC | Nhãn/ghi chú; không giảm opacity |
| Surface | #FFFFFF | Nội dung nhiệm vụ |
| Surface phụ | #F3F5F6 | Metadata/footer nhiệm vụ |
| Chữ phụ | #526170 | Phân đoạn và thông tin phụ |
| Viền | #DCE2E7 | Phân ranh bề mặt, không dùng một mình để truyền đạt trạng thái |
| Hành động phụ | #F7F0DA / #6B5219 | Xem tất cả; pressed ripple #EADDAF |

Status giữ mapping hiện hành `operatorTaskVisual` + `operatorTaskStatusLabel`: màu cùng nhãn thật; Submitted không biến thành Completed. Unknown vẫn trung tính. Không tím, gradient, shadow nặng hoặc dynamic color. Bảng màu là proposal cục bộ, chưa là dark theme toàn app.

Contrast tính theo luminance WCAG: trắng/than14.09:1, chữ phụ/than9.28:1, vàng/than5.82:1, chữ phụ/surface phụ5.81:1, chữ nâu/nút kem6.48:1. Chữ thường >=4.5:1; icon có nghĩa >=3:1. Không dùng màu vàng làm body text trên trắng.

## 3. Typography và nhịp bố cục

Roboto kế thừa app; Roboto-Medium cho giá trị/mã, Sansation vẫn chỉ nhận diện thương hiệu. Greeting20/28 medium, KPI28/36 medium tabular, title16/24 medium, body14/21, metadata12/18. Không uppercase dày đặc; giữ nhãn nhiệm vụ hiện tại khi DTO đủ điều kiện.

Lề16dp; nhịp4/8/12/16/20/24/32dp. Overview padding20 radius20; task padding16 radius16; chip radius8; mã radius6; control radius12. Không shadow. Không đặt card trang trí lồng card; footer nhiệm vụ là vùng metadata liên tục, không phải một card nữa.

## 4. Component

- **Overview/KPI:** greeting + vai trò + ba số thật + ghi chú trang đầu trong một khối than. Thứ tự/count/công thức không đổi. Ongoing vàng, hai số còn lại trắng. Không làm KPI thành nút giả. Hàng có wrap/minWidth để tên nhãn dài xuống dòng.
- **Task:** mã rõ trước tên; tên wrap, chevron thể hiện mở chi tiết; footer gom nhãn trạng thái và số phân đoạn. Chỉ năm task đầu như trước, giữ thứ tự và callback. Không chế deadline/độ ưu tiên.
- **Status chip:** nhãn+dot, maxWidth100%, chữ wrap; không chỉ dùng màu. Đã nộp là đã nộp hồ sơ, không phải hoàn tất công việc.
- **Button:** tối thiểu48dp, label động từ rõ. Home chỉ có Xem tất cả và card mở nhiệm vụ; empty/error vẫn retry thật. Không thêm CTA nghiệp vụ.

## 5. Motion

Dùng AnimatedPressable/Reanimated đã có: task scale0.985, Xem tất cả0.98, opacity0.95, timing150ms vào/ra; Android ripple vàng nhạt có clipping theo góc. Tôn trọng useReducedMotion hiện có (giá trị đọc lúc mount); OS đổi Reduce Motion ngay giữa phiên là giới hạn component chung, chưa sửa ở bước này. Handler chạy ngay, không chờ motion; không animation liên tục, stagger hoặc shimmer. Không thêm entrance cho mỗi lần refocus.

## 6. Accessibility / states

48dp touch; role button + mã/status trong accessibilityLabel; icon trang trí accessible=false. Font scaling bật mặc định, không khóa chiều cao Text/numberOfLines; metadata/footer/section header wrap. Vẫn dùng SafeAreaScreen và dock hiện hành. Đọc visual order: identity → KPI → task heading → mã/tên/status/phạm vi. Không đổi route hoặc Back.

Loading ban đầu giữ skeleton tĩnh; cập nhật giữ task cùng spinner; empty giữ Chưa có nhiệm vụ + Tải lại; failed read giữ thông báo + Thử lại; cached/error có dữ liệu giữ cảnh báo thật. Không animation biến pending thành success. Native các trạng thái khó tái tạo phải ghi NOT_RUN, không coi harness là Android evidence.

## 7. Áp dụng và phê duyệt

Chỉ `app/(drone)/home.tsx` được áp dụng. Tái sử dụng helper trạng thái/target/code, không sửa shared row/global token. Android screenshot trước/sau và test count/route/session/empty/error là gate bước1. Dừng để owner duyệt trước khi nhân rộng.

Nguồn: AGENTS.md, skills/DESIGN.md, src/design-tokens.ts; worklogs Crew18–19/11 và Operator19/11; mobile-design (craft-floor/design-process), vercel animation-gpu-properties, Expo building-native-ui/references/animations. Đây là quyết định thiết kế theo bối cảnh RoadGuard, không tuyên bố là mẫu chính thức Material.
