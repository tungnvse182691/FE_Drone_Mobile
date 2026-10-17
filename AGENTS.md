# AGENTS.md — RoadGuard FE_AppMobile

> Nguồn-sự-thật cho mọi AI làm việc trong repo này. Đọc hết file này TRƯỚC khi viết code.

## ⚠️ ĐIỀU KHOẢN OVERRIDE TỐI CAO (CANONICAL PRIORITY)
**Mọi quy định trong mục "Chuẩn Hóa Canonical 17_10" dưới đây có hiệu lực ưu tiên cao nhất, OVERRIDE (đè) lên toàn bộ các tài liệu đặc tả lịch sử (bộ canonical cũ, các thư mục `14-9/`, `22_9/`, `27_9_V3`, `28_9` và các file spec v1/v2 cũ):**

1. **Thương hiệu & Định danh:**
   - Đối tác thực tế: **Công ty TNHH Xây dựng Bê tông Hoàng Hải** (gọi tắt: Bê tông Hoàng Hải). Toàn bộ định danh cũ Cát Tường / `com.cattuong` / `@cattuong.vn` / prefix `CT-` bị bãi bỏ.
   - Package: `com.hoanghai.roadguard`, scheme `roadguard`, domain email nhân viên nội bộ: `@hoanghai.vn`. **Ghi chú:** bộ 17_10 **KHÔNG định nghĩa** tiền tố `HH-` cho nhân sự/thiết bị/chuyến bay — không tự chế prefix, đọc mã định danh theo DTO/enum trong `docs/specs/04_API-Contracts/`.
2. **Quy tắc phân tách Logo:**
   - *Màn Splash / Loading:* Sử dụng `assets/logo_hoanghai.png` (có đầy đủ tên công ty và slogan).
   - *Màn hình nội bộ, AppHeader, App Icon:* Sử dụng `assets/logo_hoanghai_icon.png` (chỉ biểu tượng xe bồn bê tông, tuyệt đối KHÔNG có chữ).
3. **Phân định Nền tảng & 3 Vai Trò Mobile Cốt Lõi:**
   - **Mobile App (`FE_AppMobile`):** Phục vụ độc quyền **3 vai trò hiện trường** (số màn theo `docs/specs/06_Mobile-Expo/*/01_*-Screen-API-Matrix.md`):
     1. `REPAIR_CREW` (`(crew)`): Kỹ thuật viên / Đội sửa chữa hiện trường (11 màn hình C-01 → C-11).
     2. `DRONE_OPERATOR` (`(drone)`): Phi công điều khiển drone khảo sát (8 màn hình O-01 → O-08).
     3. `REPORTER` (`(reporter)`): Người dân phản ánh & Đại diện Ban QLDA (10 màn hình RPT-01 → RPT-10; đăng ký **email + password + OTP** theo `docs/specs/06_Mobile-Expo/Reporter/02_Authentication-OTP-and-Session.md`: API-010 → API-012/011 → API-002; bộ 17_10 KHÔNG định nghĩa mã tra cứu công khai/tracking).
   - **Role wire → route group adapter:** wire backend dùng `UserRoleCode.DroneOperator` / `UserRoleCode.RepairCrew` (xem `docs/specs/04_API-Contracts/02_Full-API-Catalog.md`), app dùng `RoleCode.DRONE_OPERATOR` / `RoleCode.REPAIR_CREW` tại `src/types/enums.ts` — cần lớp adapter map wire→local; route group giữ nguyên.
   - **Web Dashboard:** Phục vụ 2 vai trò quản lý: `PROJECT_MANAGER` (PM) và `SUPERVISOR` (Giám sát viên). Các màn hình PM và Supervisor cũ trên mobile được chuyển lưu trữ tại `archive/web-screens/` nhằm tập trung cho 3 vai trò hiện trường.
4. **Cơ chế Nghiệp vụ Fast Track & Task Mode (US-33, BR-05, BR-08, BR-11..18, BR-25):**
   - **Chế độ công việc (`TaskMode`):** tên enum/giá trị trên wire PHẢI verify lại trong `docs/specs/04_API-Contracts/02_Full-API-Catalog.md` và DTO liên quan — không suy diễn từ tài liệu cũ.
     - `INSPECT_AND_REPAIR`: Đo kiểm và được phép sửa nhanh nếu đủ điều kiện.
     - `MEASURE_ONLY`: Chỉ đo đạc hiện trường, cấm tự ý sửa tại chỗ (áp dụng cho đợt gom nhiều lỗi US-35 / BR-09).
   - **Điều kiện kích hoạt Fast Track tại chỗ:**
     - Nhiệm vụ được giao ở chế độ đo-kiểm-và-sửa.
     - **Eligibility đọc qua API-146 và fail closed** (server là authority; `missingReasons` không đạt → KHÔNG cho sửa). Ngưỡng kích thước nằm trong policy revision trên server — KHÔNG hardcode con số trong app. Xem `docs/specs/02_Business-Workflows/08_FastTrack-Policy-and-Confirmation.md`.
     - Đã có bằng chứng ảnh hiện trạng TRƯỚC khi sửa (BEFORE).
   - **Quy trình nghiệm thu Fast Track:**
     - Crew sửa xong chụp ảnh SAU (AFTER) và gửi báo cáo.
     - **PM trực tiếp đánh giá, xác nhận hoàn thành và đóng lỗi.**
     - **Supervisor KHÔNG phê duyệt các hạng mục Fast Track** (BR-25: tối ưu thời gian, không thêm gate duyệt của Supervisor cho sửa nhanh).
5. **Tái sử dụng bằng chứng ảnh (Evidence Reuse - BR-17, BR-18):**
   - Ảnh chụp của Người dân (Reporter) hoặc ảnh Drone có thể được tái sử dụng làm ảnh BEFORE nếu xác định đúng vị trí và phản ánh đúng hiện trường khuyết tật, giúp Crew không phải chụp trùng lặp.
6. **Chỉ đường điều hướng WGS84 (US-40, BR-38):**
   - Tích hợp mở Google Maps dẫn đường theo tọa độ WGS84.
   - Đối với Crew: Dẫn đường trực tiếp đến tọa độ khuyết tật cần xử lý.
   - Đối với Drone Operator: Dẫn đường đến **Điểm tiếp cận / Điểm tập kết cất-hạ cánh** (Rendezvous / Access Point).
7. **Phạm vi Phi tài chính UD-06 (Zero Presentation Cost):**
   - Hợp đồng bảo hành giữ lại 3–5% theo Nghị định 06/2021/NĐ-CP. Tầng giao diện người dùng Mobile (`app/`) **TUYỆT ĐỐI ZERO CHI PHÍ**.
   - CẤM input, cấm render, cấm hiển thị: "dự toán", "kinh phí", "chi phí (VNĐ)", "42.500.000 VNĐ", "74.900.000 VNĐ".
   - CẤM định mức/tiêu hao vật liệu (số tấn đá, số bao xi măng, lít phụ gia Sika...).
   - BẮT BUỘC thay thế bằng bộ 3 thông số kỹ thuật thi công: **Phương án xử lý kỹ thuật** + **Kích thước hình học hư hại thực tế** (diện tích m², độ sâu cm, chiều dài m) + **Thời hạn hoàn thành**.
8. **Vật liệu & Tuyến đường:**
   - Đường bê tông nông thôn (BTXM) theo **TCVN 10380:2014** (chiều dày 18–22cm, kích thước tấm 3.5m x 5.0m). CẤM nhựa đường asphalt.
   - **Tuyến ĐH.05 (Huyện Bình Chánh, TP.HCM)** là Tuyến khảo nghiệm chính chuẩn hóa 100% dữ liệu (Pilot Primary Corridor) với 3 phân đoạn: Vĩnh Lộc B, Cầu Bà Lát (Km01+850), Tân Kiên (Km03+100).
   - Khảo sát bằng **4K RGB + DSM (OpenDroneMap)**. Tuyệt đối **CẤM LiDAR** (Red Flag).
9. **Nguồn sự thật Khuyết tật (Single Source of Truth):**
   - Bắt buộc dùng `src/constants/defect-types.ts` với 5 mã chuẩn:
     1. `POTH_DEEP` — Ổ gà sâu vỡ tấm bê tông
     2. `DEPR_POND` — Lún võng đọng nước
     3. `EDGE_BRK` — Vỡ mép tấm bê tông
     4. `SLAB_CRK` — Nứt tấm bê tông
     5. `SHLD_EROS` — Xói lở vai đường
   - Mã phân loại bắt buộc dùng `DefectTypeCode` và hiển thị bằng `defectTypeLabel(code)`.

---

## Skill bắt buộc
- **Skill dự án:** `roadguard` (tại `FE_AppMobile/skills/roadguard/SKILL.md`) — **độc lập hoàn toàn**, chứa kỷ luật chống AI "ngáo" + toàn bộ đặc tả RoadGuard Canonical 17_10 (Hoàng Hải).
- **Skill thẩm định mã nguồn (Review):** `code-review` (tại `FE_AppMobile/skills/code-review/SKILL.md`) — Quality Gate & cơ chế "Tự vả tự sửa", tự động kiểm chứng `npx tsc --noEmit` 0 lỗi, quét 100% MaterialIcons (cấm Ionicons), quét UD-06 và xuất nhật ký worklog.
- Skill generic `vibe-guard` (nếu có sẵn) đã được bao gồm trong `roadguard`.

## Nguồn-sự-thật (đọc theo thứ tự ưu tiên)
1. **Điều khoản Override Tối cao** ở đầu file này và trong `skills/roadguard/SKILL.md` (Ưu tiên số 0 — luôn thắng).
2. `docs/specs/00_Governance/01_Authority-and-Source-of-Truth.md` — nguồn sự thật Canonical 17_10 (authority & source-of-truth chính thức).
3. `docs/specs/04_API-Contracts/02_Full-API-Catalog.md` — hợp đồng API Frontend & Mobile chính thức (241 operations / 223 paths / 357 schemas / 47 controllers; operation ID `API-001` → `API-241`).
4. `docs/specs/01_Product-and-Roles/02_Actor-Client-Permission-Matrix.md` + `docs/specs/02_Business-Workflows/` — quyền theo vai trò và luồng nghiệp vụ.
5. `docs/specs/06_Mobile-Expo/*/01_*-Screen-API-Matrix.md` — ma trận màn hình/API cho Crew, Reporter, Operator.
6. `skills/BOOTSTRAP_PROMPT.md` — đặc tả scaffold mobile (routing, types, schema SQLite, mock API).
7. `skills/DESIGN.md` — design system (tokens, components, minimalism checklist).

## Stack được chốt (KHÔNG đổi mà không hỏi)
- **Expo Router** (file-based) + TypeScript — KHÔNG dùng React Navigation thuần
- **Zustand** thay Redux Toolkit · **TanStack Query** · **expo-sqlite** (offline-first)
- expo-camera, expo-location, expo-media-library, expo-file-system, expo-document-picker
- @expo/vector-icons, react-native-safe-area-context, react-native-gesture-handler, axios
- Font: Roboto (toàn bộ) + Sansation (chỉ logo/headline)

## Cấm tuyệt đối (Red Flags)
- ❌ Redux Toolkit · React Navigation thuần
- ❌ Công nghệ LiDAR · Nhựa đường Asphalt
- ❌ Thêm tiền nong, kinh phí, dự toán (VNĐ) vào giao diện `app/` (UD-06)
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
   - `/(reporter)/home`, `/(reporter)/report`, `/(reporter)/track`, `/(reporter)/feedback`
   - `/(auth)`, `/(auth)/force-change-password`, `/(auth)/otp-verify`
3. **Khai báo route tập trung tại `src/constants/routes.ts`:**
   - Mọi mapping như `ROLE_HOMES` đặt tại `src/constants/routes.ts`.

## Kiến trúc cốt lõi cần nhớ
- **Offline queue (`docs/specs/04_API-Contracts/07_Offline-Sync-and-Crypto-Wire.md`):** `LocalState`: `DRAFT → WAITING_DEPENDENCIES → READY → IN_FLIGHT → ACKED` (hoặc `CONFLICT`, `REJECTED`, `PAUSED_RETRY`, `UNKNOWN_OUTCOME`). SHA-256 checksum trước khi gửi; retry có backoff. Signed batch chỉ PM/Crew (ECDSA P-256, SPKI DER Base64, P1363, canonical bytes) qua API-130; `Idempotency-Key` bắt buộc (thiếu → 428).
- `src/offline/schema.sql`: `account_partition`, `task_pack`, `server_cache`, `draft`, `media_asset`, `outbox_intent`, `wire_command`, `upload_ledger`, `id_map`, `conflict_record`.
- **Media Asset Lifecycle:** ghi temp file $\rightarrow$ close $\rightarrow$ SHA-256 $\rightarrow$ atomic rename $\rightarrow$ commit SQLite media.
- `Defect.geometry` = GeoJSON chuẩn (tương thích `geography(4326)`); tọa độ wire luôn là `[lon, lat]` (kinh độ trước, vĩ độ sau).
- **Mã lỗi UI:** 17_10 **KHÔNG có bảng mã dùng chung** — mỗi operation có mục "Error contract (declared, not execution)" riêng trong `docs/specs/04_API-Contracts/02_Full-API-Catalog.md`; body `application/problem+json`; quy tắc 409/412/428 tại `docs/specs/04_API-Contracts/05_Idempotency-Concurrency-and-Errors.md`. UI đọc `code` rồi map; `code` lạ → fallback tiếng Việt, KHÔNG hardcode bảng mã.
- Design tokens trong `src/design-tokens.ts`; vàng đồng `#C9A227` chỉ cho 1 CTA/màn + tab active + KPI.