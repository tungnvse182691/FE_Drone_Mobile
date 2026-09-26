# AGENTS.md — RoadGuard FE_AppMobile

> Nguồn-sự-thật cho mọi AI làm việc trong repo này. Đọc hết file này TRƯỚC khi viết code.

## ⚠️ ĐIỀU KHOẢN OVERRIDE TỐI CAO (CANONICAL PRIORITY)
**Mọi quy định trong mục "Chuẩn Hóa Canonical (26/09/2026)" dưới đây có hiệu lực ưu tiên cao nhất, OVERRIDE (đè) lên toàn bộ các tài liệu đặc tả lịch sử (thư mục `docs/specs/`, `14-9/`, `22_9/`):**
1. **Thương hiệu:** Đối tác độc quyền là **Công ty TNHH Xây dựng Bê tông Hoàng Hải** (gọi tắt: Bê tông Hoàng Hải). Toàn bộ định danh cũ Cát Tường / `com.cattuong` / `@cattuong.vn` / prefix `CT-` bị bãi bỏ, thay bằng `com.hoanghai.roadguard`, `@hoanghai.vn`, prefix `HH-` (`HH-RC-084`, `HH-2089`, `#HH-409...`, `M350-HH-02`).
2. **Quy tắc phân tách Logo:**
   - *Màn Splash / Loading:* Sử dụng `assets/logo_hoanghai.png` (có đầy đủ tên công ty và slogan).
   - *Màn hình nội bộ, AppHeader, App Icon:* Sử dụng `assets/logo_hoanghai_icon.png` (chỉ biểu tượng xe bồn bê tông, tuyệt đối KHÔNG có chữ).
3. **Phạm vi Phi tài chính UD-06 (Zero Presentation Cost):**
   - Hợp đồng bảo hành giữ lại 3–5% theo Nghị định 06/2021/NĐ-CP. Tầng giao diện người dùng Mobile (`app/`) **TUYỆT ĐỐI ZERO CHI PHÍ**.
   - CẤM input, cấm render, cấm hiển thị: "dự toán", "kinh phí", "chi phí (VNĐ)", "42.500.000 VNĐ", "74.900.000 VNĐ".
   - CẤM định mức/tiêu hao vật liệu (số tấn đá, số bao xi măng, lít phụ gia Sika...).
   - BẮT BUỘC thay thế bằng bộ 3 thông số kỹ thuật thi công: **Phương án xử lý kỹ thuật** + **Kích thước hình học hư hại thực tế** (diện tích m², độ sâu cm, chiều dài m) + **Thời hạn hoàn thành**.
4. **Vật liệu & Tuyến đường:**
   - Đường bê tông nông thôn (BTXM) theo **TCVN 10380:2014** (chiều dày 18–22cm, kích thước tấm 3.5m x 5.0m). CẤM nhựa đường asphalt.
   - **Tuyến ĐH.05 (Huyện Bình Chánh, TP.HCM)** là Tuyến khảo nghiệm chính chuẩn hóa 100% dữ liệu (Pilot Primary Corridor) với 3 phân đoạn: Vĩnh Lộc B, Cầu Bà Lát (Km01+850), Tân Kiên (Km03+100).
   - Các tuyến `ĐH.01`, `ĐX.12`, `NT-08` trong dropdown khảo sát là Tuyến phụ (Secondary Corridors) dùng cho kiểm thử chọn đa tuyến.
   - Khảo sát bằng **4K RGB + DSM (OpenDroneMap)**. Tuyệt đối **CẤM LiDAR** (Red Flag).
5. **Nguồn sự thật Khuyết tật (Single Source of Truth):**
   - Bắt buộc dùng `src/constants/defect-types.ts` với 5 mã chuẩn:
     1. `POTH_DEEP` — Ổ gà sâu vỡ tấm bê tông
     2. `DEPR_POND` — Lún võng đọng nước
     3. `EDGE_BRK` — Vỡ mép tấm bê tông
     4. `SLAB_CRK` — Nứt tấm bê tông
     5. `SHLD_EROS` — Xói lở vai đường
   - Mã phân loại bắt buộc dùng `DefectTypeCode` và hiển thị bằng `defectTypeLabel(code)`. Phần mô tả hiện trường (display copy) được phép mô tả chi tiết.
6. **Ma trận Màn hình (40 Core + 4 Planned Delta):**
   - Đã hoàn thành 100% **40 màn hình mobile cốt lõi** phục vụ 4 vai trò: Drone Operator (7), Repair Crew (10), Project Manager (14), Supervisor (7) và Auth (2: `app/(auth)/index.tsx`, `force-change-password.tsx`).
   - Phân khu Người dân phản ánh (`Reporter`: M-REP-01 đến 04) là **Scope mở rộng (Planned Delta)** đã đóng băng trên HTML wireframe v3.3, chưa scaffold trong thư mục `app/`.

---

## Skill bắt buộc
- **Skill dự án:** `roadguard` (tại `FE_AppMobile/skills/roadguard/SKILL.md`) — **độc lập hoàn toàn**, chứa kỷ luật chống AI "ngáo" + toàn bộ đặc tả RoadGuard.
- Skill generic `vibe-guard` (nếu có sẵn) đã được bao gồm trong `roadguard`.

## Nguồn-sự-thật (đọc theo thứ tự ưu tiên)
1. **Điều khoản Override Tối cao** ở đầu file này và trong `skills/roadguard/SKILL.md` (Ưu tiên số 0 — luôn thắng).
2. `skills/BOOTSTRAP_PROMPT.md` — đặc tả scaffold mobile (routing, types, schema SQLite, mock API).
3. `skills/DESIGN.md` — design system (tokens, components, minimalism checklist).
4. `../RoadGuard_Wireframes/Wireframe_Specification.md` (v3.3) + `../RoadGuard_Wireframes/index.html` (44 màn).
5. Tài liệu nghiệp vụ do Nhóm trưởng ban hành trong `docs/specs/` (`Dac_ta_UseCase_v2.md`, `User_Stories_Acceptance_Criteria_v2.md`, `RoadGuard_Data_Dictionary_v1.md`, `RoadGuard_Domain_Model_v1.md`).

## Stack được chốt (KHÔNG đổi mà không hỏi)
- **Expo Router** (file-based) + TypeScript — KHÔNG dùng React Navigation thuần
- **Zustand** thay Redux Toolkit · **TanStack Query** · **expo-sqlite** (offline-first)
- expo-camera, expo-location, expo-media-library, expo-file-system, expo-document-picker
- @expo/vector-icons, react-native-safe-area-context, react-native-gesture-handler, axios
- Font: Roboto (toàn bộ) + Sansation (chỉ logo/headline)

## Cấm tuyệt đối (Red Flags)
- ❌ Redux Toolkit · React Navigation thuần
- ❌ Công nghệ LiDAR · Nhựa đường Asphalt
- ❌ Thêm tiền nong, kinh phí, dự toán (VNĐ) vào giao diện `app/`
- ❌ Tự chế mã khuyết tật ngoài bộ 5 mã chuẩn trong `src/constants/defect-types.ts`
- ❌ Dùng route thiếu group prefix trong navigation: `router.push('/crew/tasks')` (gây lỗi `Unmatched Route` màn đen!)
- ❌ Dùng `<Redirect />` conditionally bọc ngoài `<Stack />` trong `RootLayout` (gây lỗi crash `Maximum update depth exceeded` trên ReactFabric!)
- ❌ Import ngược biến/hằng số từ `app/_layout.tsx` vào file con (gây circular dependency)

## Quy tắc Routing & Navigation An toàn (ReactFabric / React 19 / RN 0.86)
1. **Giữ `<Stack screenOptions={{ headerShown: false }} />` luôn mount ổn định:**
   - Tuyệt đối không conditionally return `<Redirect />` thay thế `<Stack />` trong `RootLayout`.
   - Mọi logic AuthGuard, kiểm tra `must_change_password`, chống nhảy chéo vai trò PHẢI đặt trong hook `useEffect` bằng `router.replace(...)`.
   - `app/index.tsx` là điểm entrypoint điều hướng ban đầu duy nhất.
2. **Bắt buộc dùng Full Group Prefix trong code điều hướng:**
   Tất cả `router.push()`, `router.replace()`, `<Redirect />` và mảng `tabs` trong `BottomNav` **PHẢI có đầy đủ tên group kèm ngoặc tròn**:
   - `/(crew)/home`, `/(crew)/tasks`, `/(crew)/wo-detail`, `/(crew)/sync`, `/(crew)/profile`
   - `/(drone)/home`, `/(drone)/requests`, `/(drone)/request-detail`, `/(drone)/sync`, `/(drone)/log`, `/(drone)/upload`, `/(drone)/profile`
   - `/(pm)/home`, `/(sup)/home`
   - `/(auth)`, `/(auth)/force-change-password`
3. **Khai báo route tập trung tại `src/constants/routes.ts`:**
   - Mọi mapping như `ROLE_HOMES` đặt tại `src/constants/routes.ts`.

## Kiến trúc cốt lõi cần nhớ
- **Offline queue:** `LOCAL → QUEUED → UPLOADING → SERVER_CONFIRMED` (hoặc `INVALID`); SHA-256 checksum trước khi gửi; retry tối đa 5 lần.
- `src/offline/schema.sql`: `local_draft`, `outbox`, `media_file`, `survey_cache`, `defect_cache`, `task_cache`.
- `Defect.geometry` = GeoJSON chuẩn (tương thích `geography(4326)`).
- Mã màn gộp đã chốt: `M-PM-06/14`→`verify-b.tsx`, `M-PM-07/M-CREW-05`→`field-task.tsx`, `M-SUP-07` tích hợp trong `profile.tsx`.
- Design tokens trong `src/design-tokens.ts`; vàng đồng `#C9A227` chỉ cho 1 CTA/màn + tab active + KPI.