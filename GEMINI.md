# PROJECT RULES & DIRECTIVES FOR ROADGUARD FE (MOBILE APP)

## 1. ENTRYPOINT & COMMUNICATION
- Đọc `AGENTS.md` trước; authority, delivery modes và evidence labels tại đó áp dụng cho file này. Không duy trì bộ nghiệp vụ song song.
- Giao tiếp theo preference hiện hành của owner; không bắt buộc danh xưng hoặc danh tính cá nhân trong repo.

## 2. CODE QUALITY & SELF-VERIFICATION DISCIPLINE (CƠ CHẾ TỰ VẢ TỰ SỬA)
- **TypeScript Strict**: Any code changes must pass `npx tsc --noEmit` with **0 errors**.
- **Self-Verification Loop**: After modifying TypeScript / TSX files, the agent MUST autonomously run `npx tsc --noEmit`. If any type or lint error occurs, the Codex may self-fix within the approved allowlist; independent reviewers remain AUDIT_READ_ONLY.
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
  3. `REPORTER` (`(reporter)`): Người dân & Ban QLDA phản ánh: xác thực OTP qua Email (RFC 5322, không giới hạn domain theo D25) 6 số, gửi GPS + 3 ảnh, tra cứu tiến độ 5 bước, đánh giá 1–5 sao.
  *(Lưu ý: Màn hình PM và Supervisor thuộc Web Dashboard, được chuyển lưu trữ tại `archive/web-screens/`)*.
- **Technical Standards**:
  - Tiêu chuẩn đường: **TCVN 10380:2014** (Đường bê tông nông thôn / BTXM).
  - Công nghệ hình ảnh: **4K RGB + DSM (OpenDroneMap)**.
  - **STRICT PROHIBITION (RED FLAGS)**: CẤM tiệt công nghệ **LiDAR** và vật liệu **nhựa đường Asphalt**.
- **Dynamic Route Management**: Hệ thống quản lý tuyến động (`Project` $\rightarrow$ `RouteVersion` $\rightarrow$ `SegmentSet`). Tuyến ĐH.05 Bình Chánh chỉ dùng làm dữ liệu test mẫu (mock fixture), không hardcode cứng.
- **UD-06 Zero Presentation Cost**: TUYỆT ĐỐI CẤM hiển thị thông tin tiền tệ (VNĐ, chi phí, dự toán, định mức vật liệu) trên giao diện mobile. Thay bằng: Phương án kỹ thuật + Kích thước hình học (m², cm, m) + Thời hạn hoàn thành.
- **Fast Track & Task Mode (US-33, BR-05/08/11..18/25)**:
  - `TaskMode`: verify enum từ pinned BE DTO/guard; không suy enum từ tài liệu lịch sử. Đợt gom nhiều lỗi bắt buộc `MEASURE_ONLY` (cấm tự sửa BR-09).
  - FastTrack: đọc API-146/policy revision và bootstrap Crew package/item/binding/itemVersion thật; fail closed khi thiếu nguồn/preconditions. Không hardcode threshold, không bật mutation từ số đo local hoặc chỉ eligibility UI. Không dùng NORMAL repairContext thay bootstrap FT.
  - Crew gửi ảnh AFTER $\rightarrow$ PM trực tiếp nghiệm thu và đóng lỗi. **Supervisor KHÔNG phê duyệt Fast Track** (BR-25).
  - Tái sử dụng ảnh (BR-17): Ảnh của Reporter hoặc Drone được dùng làm ảnh BEFORE nếu khớp vị trí.
- **Dẫn đường WGS84 Google Maps (US-40, BR-38)**:
  - Crew: Dẫn đường tới tọa độ khuyết tật.
  - Drone: Dẫn đường tới Điểm tiếp cận / Điểm tập kết cất-hạ cánh (Access Point / Rendezvous).
- **Offline:** current SQLite/model/transport phải đọc source hiện hành; scaffold chỉ historical. Journal durable trước POST, exact replay giữ identity/body/key/version, server receipt/readback mới xác nhận ACK. Các nhãn/state và gates theo `AGENTS.md`.
- **Review:** Muse `AUDIT_READ_ONLY`; Codex `IMPLEMENT_AND_SELF_REVIEW` trong allowlist. Không auto-fix/worklog trong independent audit. Lỗi per-operation từ pinned contract, không dùng bảng mã cũ làm runtime authority.
