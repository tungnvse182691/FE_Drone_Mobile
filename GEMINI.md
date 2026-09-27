# PROJECT RULES & DIRECTIVES FOR ROADGUARD FE (MOBILE APP)

## 1. USER & PERSONA
- **User**: Nguyễn Văn Tùng (FE Lead & QA Lead).
- **Mandatory Addressing**: ALWAYS address the user with the highest respect as **"Sếp"** or **"Boss"**. NEVER use "ông" or casual peer pronouns.

## 2. CODE QUALITY & SELF-VERIFICATION DISCIPLINE (CƠ CHẾ TỰ VẢ TỰ SỬA)
- **TypeScript Strict**: Any code changes must pass `npx tsc --noEmit` with **0 errors**.
- **Self-Verification Loop**: After modifying TypeScript / TSX files, the agent MUST autonomously run `npx tsc --noEmit`. If any type or lint error occurs, the agent must fix it immediately before reporting to Sếp.
- **Minimalism & Clean Architecture**: Keep UI minimal, high contrast, clean typography, avoid visual clutter. Follow Pragmatic Minimalism: max 1 primary CTA gold button per screen, clean 1px border (`#E2E5E9`), no heavy shadows or gradients.
- **Fabric-Safe Routing**: Keep `<Stack screenOptions={{ headerShown: false }} />` permanently mounted in `RootLayout`. NEVER conditionally return `<Redirect />` wrapping `<Stack />`. All auth guards and redirects MUST be inside `useEffect` with `router.replace()`. All route paths MUST include full group parenthesis prefixes: `/(crew)/...`, `/(drone)/...`, `/(reporter)/...`.

## 3. DESIGN SYSTEM & ICON SPECIFICATION
- **Icon Library**: 100% `@expo/vector-icons/MaterialIcons` (Google Material Symbols design).
- **STRICT PROHIBITION**: Do NOT use `Ionicons` in newly modified or refactored screens.
- **Design Tokens**: Centralized in `src/design-tokens.ts` (colors, spacing, radius, typography).
  - Primary Gold: `#C9A227` (CTA buttons, active tab, KPI, rating stars).
  - Neutral Dark: `#1A1D20` (Text on outdoor sunshine).
  - Surface: `#FFFFFF` (Cards), Surface Alt: `#F8F9FA` (Screen background).
- **Logo Segregation**:
  - Splash / Loading: `assets/logo_hoanghai.png` (full company name & slogan).
  - Internal screens, AppHeader, App Icon: `assets/logo_hoanghai_icon.png` (concrete mixer truck icon ONLY, NO text).

## 4. DOMAIN SPECIFICATIONS & R3 V2 BUSINESS RULES
- **Project**: RoadGuard Mobile App for Concrete Road Inspection, Maintenance & Warranty (Công ty TNHH Xây dựng Bê tông Hoàng Hải).
- **Platform Scope (3 Field Roles ONLY)**:
  1. `REPAIR_CREW` (`(crew)`): Tiếp nhận việc, đo kích thước 3D, tự sửa nhanh Fast Track tại chỗ, chụp ảnh BEFORE/AFTER, dẫn đường WGS84.
  2. `DRONE_OPERATOR` (`(drone)`): Khảo sát bay, dẫn đường tới Điểm tiếp cận (Access Point), upload video 4K RGB từ thẻ nhớ SD.
  3. `REPORTER` (`(reporter)`): Người dân & Ban QLDA phản ánh: xác thực OTP Gmail 6 số, gửi GPS + 3 ảnh, tra cứu tiến độ 5 bước, đánh giá 1–5 sao.
  *(Lưu ý: Màn hình PM và Supervisor thuộc Web Dashboard, được chuyển lưu trữ tại `archive/web-screens/`)*.
- **Technical Standards**:
  - Tiêu chuẩn đường: **TCVN 10380:2014** (Đường bê tông nông thôn / BTXM).
  - Công nghệ hình ảnh: **4K RGB + DSM (OpenDroneMap)**.
  - **STRICT PROHIBITION (RED FLAGS)**: CẤM tiệt công nghệ **LiDAR** và vật liệu **nhựa đường Asphalt**.
- **Dynamic Route Management**: Hệ thống quản lý tuyến động (`Project` $\rightarrow$ `RouteVersion` $\rightarrow$ `SegmentSet`). Tuyến ĐH.05 Bình Chánh chỉ dùng làm dữ liệu test mẫu (mock fixture), không hardcode cứng.
- **UD-06 Zero Presentation Cost**: TUYỆT ĐỐI CẤM hiển thị thông tin tiền tệ (VNĐ, chi phí, dự toán, định mức vật liệu) trên giao diện mobile. Thay bằng: Phương án kỹ thuật + Kích thước hình học (m², cm, m) + Thời hạn hoàn thành.
- **Fast Track & Task Mode (US-33, BR-05/08/11..18/25)**:
  - `TaskMode`: `INSPECT_AND_REPAIR`, `MEASURE_ONLY`, `INSPECT_ONLY`. Đợt gom nhiều lỗi bắt buộc `MEASURE_ONLY` (cấm tự sửa BR-09).
  - Fast Track kích hoạt khi: `INSPECT_AND_REPAIR`, kích thước $\le$ `FastTrackPolicyVersion` (diện tích $\le 1.0\text{ m}^2$, sâu $\le 5\text{ cm}$, dài $\le 2.0\text{ m}$), và có ảnh BEFORE hợp lệ.
  - Crew gửi ảnh AFTER $\rightarrow$ PM trực tiếp nghiệm thu và đóng lỗi. **Supervisor KHÔNG phê duyệt Fast Track** (BR-25).
  - Tái sử dụng ảnh (BR-17): Ảnh của Reporter hoặc Drone được dùng làm ảnh BEFORE nếu khớp vị trí.
- **Dẫn đường WGS84 Google Maps (US-40, BR-38)**:
  - Crew: Dẫn đường tới tọa độ khuyết tật.
  - Drone: Dẫn đường tới Điểm tiếp cận / Điểm tập kết cất-hạ cánh (Access Point / Rendezvous).
- **Offline-First Architecture (09_Frontend/09)**:
  - SQLite local: `local_draft`, `outbox`, `media_file`, `task_cache`.
  - Media: Ghi file tạm $\rightarrow$ đóng file $\rightarrow$ SHA-256 $\rightarrow$ atomic rename $\rightarrow$ commit SQLite.
  - Outbox State Machine: `DRAFT` $\rightarrow$ `WAITING_DEPENDENCIES` $\rightarrow$ `READY` $\rightarrow$ `IN_FLIGHT` $\rightarrow$ `ACKED`.
  - Chuẩn hóa thông báo lỗi theo `09_Frontend/03` (`TASK_MODE_NOT_REPAIRABLE`, `FAST_TRACK_NOT_ELIGIBLE`, `BEFORE_MISSING`, v.v.).
