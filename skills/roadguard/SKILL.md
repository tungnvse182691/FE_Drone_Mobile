---
name: roadguard
description: "Skill chuyên cho DỰ ÁN RoadGuard (hệ thống bảo hành & sửa chữa hạ tầng đường bộ của nhà thầu Cát Tường). Bắt buộc dùng BẤT CỨ KHI NÀO làm việc trong repo RoadGuard — scaffold FE_AppMobile (Expo Router + TypeScript), sửa bug, thêm tính năng, review code, viết backend C#/ASP.NET Core, hay thay đổi bất cứ file nào thuộc dự án này. Skill này độc lập hoàn toàn: nhúng sẵn kỷ luật chống AI 'ngáo' + toàn bộ đặc tả dự án (stack, 40 màn M-XXX, 4 vai trò, offline queue, design tokens, SQLite schema). Kích hoạt ngay cả khi user chỉ nói 'RoadGuard', 'FE_AppMobile', 'nhà thầu Cát Tường', 'đồng bộ ngoại tuyến', 'màn M-DRONE-01' v.v. mà không gọi tên skill. Nếu repo có cả vibe-guard (skill generic) thì ưu tiên skill này vì nó đã bao gồm toàn bộ nội dung vibe-guard."
---

# RoadGuard Skill: kỷ luật chống AI ngáo + đặc tả dự án

Skill này **độc lập hoàn toàn** — thay thế mọi skill generic cho dự án RoadGuard. Nó bao gồm: (A) kỷ luật chống bịa, và (B) nguồn-sự-thật + đặc tả kỹ thuật RoadGuard. AI làm việc trong repo RoadGuard PHẢI tuân theo cả hai phần.

---

## PHẦN A — Kỷ luật chống AI ngáo (bắt buộc mọi task)

Nguyên nhân AI "ngáo" đã được nghiên cứu rõ: **viết trước khi đọc đủ** (premature commitment), **tưởng tượng thay vì chạy thật** (mental-reality gap), và **đoán tên/API thay vì tra cứu**. Kỷ luật sau biến 3 phát hiện đó thành workflow bắt buộc.

### A1. 5 nguyên tắc vàng (hiểu TẠI SAO, không học vẹt)

1. **Evidence trước, edit sau.** AI chỉ được sửa file sau khi đã đọc file đó + các file liên quan (caller, type, test, config). Vì phán đoán từ 1 hàm đơn lẻ hầu như luôn thiếu context — caller vô hình, constraint vô hình sẽ lật ngược quyết định tưởng chừng đúng.
2. **Spec là source of truth, code chỉ là bản dịch.** Yêu cầu mơ hồ → code sai là tất yếu, không phải do AI dốt. Với RoadGuard: spec nằm ở các file liệt kê trong PHẦN B — đọc trước khi viết một dòng code.
3. **Đừng tưởng tượng — hãy thực thi.** Không bao giờ "nhẩm" code chạy đúng. Chạy thật, đọc output thật, hoặc ít nhất grep/read-back lại đoạn vừa sửa. Trace trong đầu càng dài càng sai.
4. **Mọi tên đều phải có căn cứ.** Tên hàm, API, package, field, đường dẫn, mã màn `M-XXX` — mỗi cái phải trỏ được về một nơi đã đọc (file spec, file code, docs, registry). Không trỏ được = bịa = cấm dùng.
5. **Không chắc → hỏi, không đoán.** Đoán sai gây corrupt state khó cứu; hỏi chỉ tốn một câu. Khi thiếu thông tin quyết định, dừng và hỏi user thay vì lấp chỗ trống bằng tưởng tượng.

### A2. Workflow 6 bước (mọi task code đều đi qua)

**B1 — Hiểu yêu cầu.** Viết lại yêu cầu bằng 1-2 câu theo ý mình và khớp với mã màn/Use Case tương ứng (`M-XXX`, `UC-xxx`). Nếu có hơn 1 cách hiểu khả thi → hỏi user trước, không tự chọn.

**B2 — Thu thập evidence.** Trước khi sửa bất cứ gì, đọc: file cần sửa, file gọi nó (caller), type/interface liên quan, test hiện có, config liên quan. Với RoadGuard còn phải đọc phần spec tương ứng trong PHẦN B (interface, enum, design token, schema).

**B3 — Plan mini (3-5 dòng).** Ghi ra: sửa file nào, hàm nào, vì sao sửa chỗ đó mà không chỗ khác, edge case nào có thể vỡ (đặc biệt với offline queue). Task >30 phút → tách nhỏ.

**B4 — Viết bám spec.** Diff nhỏ, một concern một lần sửa. Giữ nguyên convention dự án (xem B4 của RoadGuard trong PHẦN B). Không rewrite cả file trừ khi user yêu cầu rõ. Không thêm tính năng ngoài yêu cầu ("tiện tay" là nguồn ngáo số 1).

**B5 — Tự kiểm chứng.** Mỗi lần sửa xong phải qua ít nhất 1 trong 3 cửa: (a) chạy code/test thật và đọc output; (b) đọc lại đoạn vừa sửa kiểm tra khớp plan; (c) grep xác nhận không còn reference cũ/sót. Không cửa nào qua được → chưa xong.

**B6 — Báo cáo ngắn.** Đã đổi gì (file:dòng), kiểm chứng bằng gì (lệnh nào, output nào), còn gì chưa chắc. Không báo cáo = user không phân biệt được "chạy thật" với "tưởng là chạy".

### A3. Checklist chống bịa (chạy trong đầu trước mỗi edit)

- [ ] **Đường dẫn file:** đã `read`/`glob` xác nhận tồn tại, không viết path theo trí nhớ.
- [ ] **Tên hàm/biến gọi tới:** đã `grep` thấy định nghĩa thật trong repo, không gọi tên "nghe có vẻ đúng".
- [ ] **API/thư viện:** đã tra docs hoặc đọc code dùng sẵn trong repo; package name đã verify tồn tại (npm/PyPI/registry), không bịa tên package. Với RoadGuard: KHÔNG đưa package mới vào trừ khi user yêu cầu — stack đã chốt.
- [ ] **Field của object/type:** đã đọc interface/type gốc trong `src/types/*.ts`, không tự thêm field "cho đủ".
- [ ] **Giá trị config/env:** đã đọc từ file config thật, không hardcode số "hợp lý".
- [ ] **Mã màn `M-XXX`:** đã đối chiếu trong `app/` structure của BOOTSTRAP_PROMPT.md — không tự nghĩ ra mã màn mới.
- [ ] **Không placeholder im lặng:** code `TODO`, mock data, giá trị giả — nếu bắt buộc phải có thì báo rõ cho user, không để lẫn như thật.
- [ ] **Không scope creep:** diff chỉ chứa thứ yêu cầu. Thấy code bên cạnh "ngứa tay" → ghi TODO báo user, không sửa ké.

### A4. Red flags — thấy dấu hiệu này thì DỪNG LẠI

| Dấu hiệu | Xử lý |
|---|---|
| Định import package/thư viện chưa từng thấy trong repo | Verify tồn tại trên registry + đọc docs trước (với RoadGuard: hỏi user trước vì stack đã chốt) |
| Sửa file chưa đọc | Quay lại B2, đọc trước |
| Nhắc tới mã màn, field, endpoint không có trong spec (PHẦN B) | Bịa. Grep lại spec, dùng đúng tên có thật |
| Viết >100 dòng mới một lúc | Tách nhỏ, kiểm chứng từng phần (B5) |
| Không chạy được test/lệnh để verify | Nói rõ với user "chưa kiểm chứng được bằng X vì Y", không tuyên bố "chắc chắn đúng" |
| User sửa mình 2 lần cùng một chỗ | Dừng, hỏi lại yêu cầu gốc thay vì đoán tiếp |
| Cảm giác "chỗ này chắc là thế" | Đó chính là bịa. Tìm căn cứ hoặc hỏi. |

---

## PHẦN B — Nguồn-sự-thật & đặc tả kỹ thuật RoadGuard

### B0. Nguồn-sự-thật (AI PHẢI ĐỌC trước khi scaffold/sửa — đọc đúng file, theo thứ tự ưu tiên)

| Ưu tiên | File | Vai trò |
|---|---|---|
| 1 | `FE_AppMobile/BOOTSTRAP_PROMPT.md` | **Đặc tả scaffold mobile** — routing, types, schema SQLite, mock API, dependencies, quy tắc critical. "Không cần đọc thêm tài liệu nào khác" cho việc scaffold app |
| 2 | `FE_AppMobile/DESIGN.md` | Design system chi tiết: tokens, components, minimalism checklist |
| 3 | `RoadGuard_Wireframes/Wireframe_Specification.md` + `index.html` | 40 màn frozen `M-XXX` — bố cục từng màn |
| 4 | `14-9/V2/Dac_ta_UseCase_v2.md` | 109 Use Case — logic nghiệp vụ |
| 5 | `14-9/V2/User_Stories_Acceptance_Criteria_v2.md` | 70 User Stories + acceptance criteria |
| 6 | `14-9/Build/RoadGuard_Data_Dictionary_v1.md` | Data dictionary — đối chiếu mọi field |
| 7 | `14-9/Build/RoadGuard_Domain_Model_v1.md` | Domain model |
| 8 | `14-9/Build/RoadGuard_Entity_List_v2.md` | Entity list |

**Quy tắc:** Mâu thuẫn giữa các nguồn → số ưu tiên nhỏ hơn thắng. Nếu vẫn mâu thuẫn hoặc thiếu → hỏi user, KHÔNG tự chế.

### B1. Thông tin dự án

**RoadGuard** = hệ thống quản lý bảo hành & sửa chữa hạ tầng đường bộ của nhà thầu **Cát Tường**. App mobile phục vụ **4 vai trò**:

| Vai trò | RoleCode | Nhóm màn | Mô tả |
|---|---|---|---|
| Drone Operator | `DRONE_OPERATOR` | `(drone)` | Tiếp nhận lệnh bay, upload video/ảnh từ thẻ nhớ SD, nhật ký chuyến bay, đồng bộ ngoại tuyến |
| Repair Crew | `REPAIR_CREW` | `(crew)` | Nhận công việc sửa chữa, dẫn đường GPS, chụp ảnh nghiệm thu, báo cáo lỗi phát sinh |
| Project Manager | `PROJECT_MANAGER` | `(pm)` | Tạo yêu cầu khảo sát, xác minh lỗi AI (bounding box + đa kỳ), gộp đợt sửa, trình phê duyệt, giao việc crew |
| Supervisor | `SUPERVISOR` | `(sup)` | Phê duyệt hồ sơ, tổng quan rủi ro, xuất báo cáo PDF/ZIP, ký đóng đợt, quản trị dự án + nhân sự |

**Số liệu cần nhớ:** **40 màn hình** frozen (`M-XXX`), **109 Use Case**, **70 User Stories**. Backend: **ASP.NET Core / SQL Server** (`geography(4326)`). GPS ưu tiên **UTM zone 32648 (EPSG:32648)**.

### B2. Stack được chốt (KHÔNG thay đổi nếu user không yêu cầu)

- **Expo Router** (file-based) + **TypeScript** — KHÔNG dùng React Navigation thuần
- **Zustand** — state (KHÔNG dùng Redux Toolkit)
- **TanStack Query** — data fetching
- **expo-sqlite** — offline-first
- **expo-camera, expo-location, expo-media-library, expo-file-system, expo-document-picker**
- **@expo/vector-icons, react-native-safe-area-context, react-native-gesture-handler, axios**
- Font: **Roboto** (mọi thứ) + **Sansation** (CHỈ logo/headline, tải .ttf thủ công vào `assets/fonts/`)

### B3. Cấu trúc routing (Expo Router)

```
FE_AppMobile/
  app/
    _layout.tsx                          # Root: SessionProvider + AuthGuard
    (auth)/
      _layout.tsx
      index.tsx                          # M-AUTH-01 Splash
      login.tsx                          # M-AUTH-02
      force-change-password.tsx          # Gap CN10/US-01
    (drone)/
      _layout.tsx                        # BottomNav: Home / Requests / Sync / Profile
      home.tsx                           # M-DRONE-01
      requests.tsx                       # M-DRONE-02
      request-detail.tsx                 # M-DRONE-03
      upload.tsx                         # M-DRONE-04
      log.tsx                            # M-DRONE-05
      sync.tsx                           # M-DRONE-06
      profile.tsx                        # M-DRONE-07
    (crew)/  home(01) tasks(02) wo-detail(03) navigation(04) viewfinder(06) progress(07) report-defect(08) complete(09) sync(10) profile(11)
    (pm)/    home(01) surveys(02) create-survey(03) ai-inbox(04) verify-a(05) verify-b(06/14 GỘP) field-task(07/M-CREW-05 GỘP) batching(08) submit-approval(09) resubmit(10) submitted-tab(11) assign-crew(12) wo-confirm(13) profile(15)
    (sup)/   home(01) approve(02) risk(03) reports(04) export-modal(05) profile(06 + tích hợp M-SUP-07) signoff(08)
  src/
    types/domain.ts, types/enums.ts
    design-tokens.ts
    components/  Button Card Chip InputField BottomNav SafeAreaScreen FAB Toast StatusBadge ViewFinder EmptyState
    api/client.ts, api/mock/auth.ts surveys.ts defects.ts repair-batches.ts
    store/auth.ts, store/offline.ts
    offline/database.ts, offline/schema.sql, offline/upload-queue.ts, offline/checksum.ts
```

**Mã màn gộp đã chốt:** `M-PM-06/14` → `verify-b.tsx`; `M-PM-07/M-CREW-05` → `field-task.tsx`; `M-SUP-07` tích hợp trong `profile.tsx` (KHÔNG tạo màn riêng).

**Quy tắc Routing bắt buộc (TRÁNH MÀN ĐEN UNMATCHED ROUTE):**
1. **Dùng Full Group Prefix trong code:** `router.push()`, `router.replace()`, `<Redirect />` và tabs `BottomNav` PHẢI chứa tên group kèm ngoặc tròn: `/(crew)/tasks`, `/(drone)/home`, `/(auth)/force-change-password`... TUYỆT ĐỐI KHÔNG dùng shorthand `/crew/tasks` hay `/drone/home`.
2. **Khai báo route tập trung tại `src/constants/routes.ts`:** Mọi hằng số route (`ROLE_HOMES`, etc.) phải đặt trong `src/constants/routes.ts`. CẤM import ngược từ `app/_layout.tsx` vào các screen/index để tránh circular dependency làm hỏng route gốc `/`.


### B4. Offline-first (trái tim của dự án — đọc kỹ)

**Chuỗi trạng thái upload:** `LOCAL → QUEUED → UPLOADING → SERVER_CONFIRMED` (hoặc `INVALID`). Mọi thao tác hiện trường ghi local trước (draft → outbox → media_file), server xác nhận mới cập nhật cache read-only.

- `src/offline/schema.sql` — 4 bảng: `local_draft`, `outbox`, `media_file`, + 3 bảng cache (`survey_cache`, `defect_cache`, `task_cache`).
- `outbox`: `status` mặc định `QUEUED`, `attempt`/`max_attempts` (mặc định 5), `checksum_sha256` xác thực toàn vẹn.
- `media_file`: video/srt/photo, `status` LOCAL/QUEUED/UPLOADING/SERVER_CONFIRMED.
- **SHA-256 checksum tính TRƯỚC khi gửi**, gửi kèm payload.
- `SyncStatus` enum: `LOCAL | QUEUED | UPLOADING | SERVER_CONFIRMED | INVALID`.
- Tối đa **5 lần retry** khi mất mạng — queue PHẢI giữ trạng thái QUEUED.

### B5. Enums & Interfaces (lấy đúng từ `src/types/enums.ts` và `domain.ts` — đạt từng tên, không paraphrase)

Enums: `RoleCode`, `SyncStatus`, `IntegrationStatus` (`INTACT|CORRUPTED`), `DefectStatus` (`OPEN|VERIFIED|REJECTED|RESOLVED`), `Severity` (`LOW|MEDIUM|HIGH|CRITICAL`), `RepairBatchStatus`, `FieldInspectionTaskStatus` (có `SUPPLEMENT_REQUIRED` — gap đã bồi), `MeasurementType` (`DEPRESSION_DEPTH|SLAB_FAULTING_HEIGHT|SHOULDER_EROSION_EXTENT`).

Interfaces chính: `User`, `SurveyDataVersion`, `SurveyFile`, `FlightLog`, `FileRecord`, `Defect` (geometry = GeoJSON WGS84, tương thích `geography(4326)`), `FieldInspectionTask`, `GroundTruthMeasurement` (gồm `instrument_name`, `measurement_method`, `measured_at`, `location` Point, `evidence_file_id` — các field gap đã bồi), `RepairItem`, `RepairBatchVersion` (`estimated_total_cost` = SUM tự tính, KHÔNG nhập tay), `RepairEvidence` (`kind: 'BEFORE'|'AFTER'`).

Những field gap-filled đã chốt: `force-change-password` màn; `SUPPLEMENT_REQUIRED`; `instrument_name`/`measurement_method`/`measured_at`/`location`/`evidence_file_id`; `road_section_version_id` trên Survey + Defect.

### B6. Design tokens (`src/design-tokens.ts`)

```ts
colors:  primary '#C9A227' (vàng đồng) | primaryDark '#6B5219' | secondary '#2D3748' | neutral '#1A1D20' |
         surface '#FFFFFF' | surfaceAlt '#F8F9FA' | onPrimary '#FFFFFF' | onSurface '#1A1D20' |
         border '#E2E5E9' | success '#2F9E44' | warning '#F59E0B' | error '#E5484D' | info '#3B82F6'
typography: Sansation CHỈ headlineLg; Roboto mọi thứ còn lại (titleLg/titleMd/bodyLg/bodyMd/labelLg/labelSm IN HOA/caption)
spacing: xs4 sm8 md16 lg24 xl32, screenMargin 16, cardPadding 16 (thang 8px)
radius: sm4 md8 lg12 xl20 full9999
```

**Triết lý Minimalism Thực dụng = REQUIREMENT, không phải gợi ý:** mỗi màn chỉ hiện đúng thông tin cần để hành động; vàng đồng chỉ ở 1 CTA chính/màn + tab active + KPI; không gradient, không shadow đậm, phân lớp bằng nền `surfaceAlt` vs `surface` + viền 1px; giữ khoảng trắng (khối nội dung cách nhau 24px); không trộn font; không trộn góc bo/góc vuông trong cùng màn (tối đa 2 mức bo); tương phản WCAG AA ≥4.5:1.

**Core components (props đúng, không thêm):** `Button` (primary/secondary/text, tối đa 1 primary/màn), `Card`, `Chip` (severity + status), `InputField`, `BottomNav` (4 tab, cao 64px, active gold), `SafeAreaScreen` (nền surfaceAlt, padding 16), `FAB` (`absolute bottom-24 right-16 z-30`), `Toast`, `StatusBadge` (LOCAL/QUEUED/SERVER_CONFIRMED), `EmptyState`, `ViewFinder`.

### B7. Mock API endpoints (KHÔNG viết server thật — dùng fixtures JSON)

- `POST /api/auth/login` — nếu `must_change_password === true` → redirect `force-change-password`
- `POST /api/auth/refresh`
- `POST /api/auth/change-password`
- `GET /api/surveys?status=&period=`, `GET /api/surveys/:id`, `POST /api/surveys/:id/upload` (FormData: file + checksum_sha256)
- `GET /api/defects?project_id=&status=`, `POST /api/defects/:id/field-inspection`
- `POST /api/repair-batches/submit`, `GET /api/repair-batches?project_id=`

### B8. Quy tắc CRITICAL scaffold (vi phạm là sai dự án)

1. **KHÔNG dùng Redux Toolkit** → Zustand.
2. **KHÔNG dùng React Navigation thuần** → Expo Router (file-based, map mã màn).
3. Mỗi `_layout.tsx` role render BottomNav 4 tab đúng routes.
4. **AuthGuard**: chưa login → redirect `(auth)/login`; `must_change_password` → redirect `force-change-password`.
5. `RepairBatchVersion.estimated_total_cost` = SUM(items) — **KHÔNG có input field**.
6. `Defect.geometry` dùng GeoJSON standard (tương thích `geography(4326)`).
7. Upload queue: `LOCAL → QUEUED → UPLOADING → SERVER_CONFIRMED`; SHA-256 trước khi gửi.
8. FAB trong `tasks.tsx` và `surveys.tsx`: `position: absolute; bottom: 96; right: 16; zIndex: 30`.
9. Scaffolding: **KHÔNG comment** trừ khi user yêu cầu.

### B9. Dependencies đã chốt để cài

```
npx create-expo-app FE_AppMobile --template blank-typescript
expo install: expo-router expo-linking expo-constants expo-status-bar expo-sqlite expo-camera expo-location expo-media-library expo-file-system expo-document-picker react-native-safe-area-context react-native-gesture-handler @expo/vector-icons @expo-google-assets/roboto
npm install: zustand @tanstack/react-query axios
app.json: scheme "roadguard", plugins [expo-router, expo-camera, expo-location], android.package "com.cattuong.roadguard"
```

---

## Phân định trách nhiệm hai skill

- **`vibe-guard`** (generic, `D:\Do_AN_Drone\FE_AppMobile\skills\vibe-guard\SKILL.md`): kỷ luật chống bịa chung mọi dự án, KHÔNG có đặc tả RoadGuard.
- **`roadguard`** (skill này): **dày, độc lập hoàn toàn** — dùng khi làm việc trong dự án RoadGuard. Nó thay thế vibe-guard cho dự án này; không cần nạp cả hai.