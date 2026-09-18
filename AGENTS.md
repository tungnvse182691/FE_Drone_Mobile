# AGENTS.md — RoadGuard FE_AppMobile

> Nguồn-sự-thật cho mọi AI làm việc trong repo này. Đọc hết file này TRƯỚC khi viết code.

## Skill bắt buộc

- **Skill dự án:** `roadguard` (tại `D:\Do_AN_Drone\FE_AppMobile\skills\roadguard\SKILL.md`) — **độc lập hoàn toàn**, chứa kỷ luật chống AI "ngáo" + toàn bộ đặc tả RoadGuard (stack, 40 màn `M-XXX`, 4 vai trò, offline queue, design tokens, SQLite schema, mock API).
- Nếu công cụ AI không tự nạp skill, hãy READ file SKILL.md ở trên và tuân theo trước khi làm bất cứ thay đổi nào.
- Skill generic `vibe-guard` (nếu có sẵn) đã được bao gồm trong `roadguard` — không cần nạp trùng.

## Bối cảnh nhanh

**RoadGuard** = hệ thống quản lý bảo hành & sửa chữa hạ tầng đường bộ của nhà thầu **Cát Tường**. App mobile phục vụ **4 vai trò**: Drone Operator (`(drone)`), Repair Crew (`(crew)`), Project Manager (`(pm)`), Supervisor (`(sup)`).

- **40 màn hình frozen** `M-XXX` · **109 Use Case** · **70 User Stories**
- Backend: ASP.NET Core / SQL Server (`geography(4326)`)
- GPS ưu tiên UTM zone 32648 (EPSG:32648)

## Nguồn-sự-thật (đọc theo thứ tự ưu tiên)

1. `BOOTSTRAP_PROMPT.md` — đặc tả scaffold mobile (routing, types, schema SQLite, mock API, dependencies, quy tắc critical)
2. `DESIGN.md` — design system (tokens, components, minimalism checklist)
3. `../RoadGuard_Wireframes/Wireframe_Specification.md` + `index.html` — 40 màn frozen
4. `../14-9/V2/Dac_ta_UseCase_v2.md` — 109 Use Case
5. `../14-9/V2/User_Stories_Acceptance_Criteria_v2.md` — 70 User Stories
6. `../14-9/Build/RoadGuard_Data_Dictionary_v1.md` — data dictionary
7. `../14-9/Build/RoadGuard_Domain_Model_v1.md` — domain model
8. `../14-9/Build/RoadGuard_Entity_List_v2.md` — entity list

Mâu thuẫn giữa các nguồn → số ưu tiên nhỏ hơn thắng. Vẫn mâu thuẫn → hỏi, KHÔNG tự chế.

## Stack được chốt (KHÔNG đổi mà không hỏi)

- **Expo Router** (file-based) + TypeScript — KHÔNG dùng React Navigation thuần
- **Zustand** thay Redux Toolkit · **TanStack Query** · **expo-sqlite** (offline-first)
- expo-camera, expo-location, expo-media-library, expo-file-system, expo-document-picker
- @expo/vector-icons, react-native-safe-area-context, react-native-gesture-handler, axios
- Font: Roboto (toàn bộ) + Sansation (chỉ logo/headline)

## Cấm tuyệt đối

- ❌ Redux Toolkit · React Navigation thuần
- ❌ Thêm package mới, mã màn `M-XXX` mới, enum/field/endpoint mới không có trong nguồn-sự-thật
- ❌ Tự chế bất kỳ tên nào (hàm, API, field, đường dẫn) chưa được đọc từ file thật
- ❌ Dùng route thiếu group prefix trong navigation: `router.push('/crew/tasks')` hay `router.push('/drone/...')` (gây lỗi `Unmatched Route` màn đen!)
- ❌ Import ngược biến/hằng số từ `app/_layout.tsx` vào file con (gây circular dependency làm hỏng route gốc `/`)
- ❌ Comment thừa khi scaffolding, trừ khi user yêu cầu

## Quy tắc Routing Expo Router (Bắt buộc 100% để tránh màn đen)

1. **Bắt buộc dùng Full Group Prefix trong code điều hướng:**
   Tất cả `router.push()`, `router.replace()`, `<Redirect />` và mảng `tabs` trong `BottomNav` **PHẢI có đầy đủ tên group kèm ngoặc tròn**:
   - `/(crew)/home`, `/(crew)/tasks`, `/(crew)/wo-detail`, `/(crew)/sync`, `/(crew)/profile`
   - `/(drone)/home`, `/(drone)/requests`, `/(drone)/request-detail`, `/(drone)/sync`, `/(drone)/log`, `/(drone)/upload`, `/(drone)/profile`
   - `/(pm)/home`, `/(sup)/home`
   - `/(auth)`, `/(auth)/force-change-password`
2. **Khai báo route tập trung tại `src/constants/routes.ts`:**
   - Mọi mapping như `ROLE_HOMES` hoặc route dùng chung phải đặt tại `src/constants/routes.ts`.
   - Tuyệt đối không export từ `app/_layout.tsx` rồi import vào các screen.


## Kiến trúc cốt lõi cần nhớ

- **Offline queue:** `LOCAL → QUEUED → UPLOADING → SERVER_CONFIRMED` (hoặc `INVALID`); SHA-256 checksum trước khi gửi; retry tối đa 5 lần.
- `src/offline/schema.sql`: `local_draft`, `outbox`, `media_file`, `survey_cache`, `defect_cache`, `task_cache`.
- `RepairBatchVersion.estimated_total_cost` = SUM(items) — KHÔNG có input hand-typed.
- `Defect.geometry` = GeoJSON chuẩn (tương thích `geography(4326)`).
- Mã màn gộp đã chốt: `M-PM-06/14`→`verify-b.tsx`, `M-PM-07/M-CREW-05`→`field-task.tsx`, `M-SUP-07` tích hợp trong `profile.tsx`.
- Design tokens trong `src/design-tokens.ts`; vàng đồng `#C9A227` chỉ cho 1 CTA/màn + tab active + KPI.

Xem chi tiết đầy đủ (enums, interfaces, mock API, quy tắc critical, FAB positioning...) trong skill `roadguard` / `BOOTSTRAP_PROMPT.md`.