# RoadGuard Mobile — Bootstrap Prompt

> **Mục đích:** File này tổng hợp đủ thông tin để một AI lập trình khởi tạo codebase Expo Router + TypeScript trong thư mục `FE_AppMobile/`. Không cần đọc thêm tài liệu nào khác.

---

## ⚠️ ĐIỀU KHOẢN OVERRIDE TỐI CAO (CANONICAL PRIORITY)
**Mọi quy định trong mục Chuẩn Hóa Canonical (26/09/2026) có hiệu lực ưu tiên cao nhất, OVERRIDE (đè) lên toàn bộ các tài liệu đặc tả lịch sử:**
- **Thương hiệu:** Công ty TNHH Xây dựng Bê tông Hoàng Hải (`com.hoanghai.roadguard`, `@hoanghai.vn`, prefix `HH-`).
- **Quy tắc Logo:** Splash/Loading = `assets/logo_hoanghai.png` (có tên công ty); Màn trong/Header/Icon = `assets/logo_hoanghai_icon.png` (chỉ xe bồn, không chữ).
- **UD-06:** Tầng UI Mobile (`app/`) **TUYỆT ĐỐI ZERO CHI PHÍ/TIỀN TỆ**, cấm định mức vật tư tiêu hao. Bắt buộc hiển thị bộ 3: Phương án xử lý + Kích thước hình học hư hại (m², cm, m) + Thời hạn.
- **Vật liệu & Tuyến:** Bê tông xi măng TCVN 10380:2014, 4K RGB + DSM (OpenDroneMap), TUYỆT ĐỐI CẤM LiDAR, Tuyến ĐH.05 Bình Chánh là Pilot Primary Corridor.
- **5 Mã Defect:** `src/constants/defect-types.ts` (`POTH_DEEP`, `DEPR_POND`, `EDGE_BRK`, `SLAB_CRK`, `SHLD_EROS`).
- **Ma trận màn:** 40 màn mobile cốt lõi (4 vai trò) + 4 màn Reporter là Planned Delta đã frozen trên HTML wireframe.

---

## Context nhanh

**RoadGuard** là hệ thống quản lý bảo hành & sửa chữa hạ tầng đường bộ của **Công ty TNHH Xây dựng Bê tông Hoàng Hải**. App mobile phục vụ **4 vai trò cốt lõi**:
- **Drone Operator** — tiếp nhận lệnh bay, upload video/ảnh từ thẻ nhớ SD, nhật ký chuyến bay, đồng bộ ngoại tuyến (7 màn)
- **Repair Crew** — nhận công việc sửa chữa, dẫn đường GPS, chụp ảnh nghiệm thu, báo cáo lỗi phát sinh (10 màn)
- **Project Manager** — tạo yêu cầu khảo sát, xác minh lỗi AI (bounding box + đa kỳ), gộp đợt sửa, trình phê duyệt, giao việc crew (14 màn)
- **Supervisor** — phê duyệt hồ sơ, tổng quan rủi ro, xuất báo cáo PDF/ZIP, ký đóng đợt, quản trị dự án + nhân sự (7 màn)

**40 màn hình mobile đã implement** + **4 màn Reporter (Planned Delta)**. Backend: ASP.NET Core / SQL Server (`geography(4326)`). GPS ưu tiên UTM zone 32648 (EPSG:32648).

---

## 1. Cấu trúc Routing (Expo Router)

```text
FE_AppMobile/
  app/
    _layout.tsx                          # Root layout: SessionProvider + AuthGuard
    (auth)/
      _layout.tsx                        # Stack auth, không có BottomNav
      index.tsx                          # M-AUTH-01/02: Đăng nhập & Màn chào
      force-change-password.tsx          # BÙ GAP CN10/US-01: bắt buộc đổi mật khẩu lần đầu
    (drone)/
      _layout.tsx                        # BottomNav 4 tab: Home / Requests / Sync / Profile
      home.tsx                           # M-DRONE-01: Trang chủ Phi công
      requests.tsx                       # M-DRONE-02: Danh sách yêu cầu khảo sát
      request-detail.tsx                 # M-DRONE-03: Chi tiết yêu cầu #REQ-xxx
      upload.tsx                         # M-DRONE-04: Tải video/ảnh từ thẻ nhớ SD
      log.tsx                            # M-DRONE-05: Nhật ký chuyến bay
      sync.tsx                           # M-DRONE-06: Đồng bộ dữ liệu ngoại tuyến
      profile.tsx                        # M-DRONE-07: Hồ sơ cá nhân
    (crew)/
      _layout.tsx                        # BottomNav 4 tab: Home / Tasks / Sync / Profile
      home.tsx                           # M-CREW-01: Trang chủ Đội sửa chữa
      tasks.tsx                          # M-CREW-02: Công việc của tôi (FAB + nổi cách đáy 96px)
      wo-detail.tsx                      # M-CREW-03: Chi tiết lệnh công tác #WO-xxx
      navigation.tsx                     # M-CREW-04: Dẫn đường GPS
      viewfinder.tsx                     # M-CREW-06: Chụp ảnh nghiệm thu + watermark
      progress.tsx                       # M-CREW-07: Cập nhật tiến độ thi công
      report-defect.tsx                  # M-CREW-08: Báo cáo lỗi phát sinh mới
      complete.tsx                       # M-CREW-09: Hoàn tất công việc
      sync.tsx                           # M-CREW-10: Đồng bộ ngoại tuyến
      profile.tsx                        # M-CREW-11: Hồ sơ kỹ thuật viên
    (pm)/
      _layout.tsx                        # BottomNav 4 tab: Home / Surveys / Verify / Profile
      home.tsx                           # M-PM-01: Trang chủ PM
      surveys.tsx                        # M-PM-02: Quản lý khảo sát (FAB + nổi cách đáy 96px)
      create-survey.tsx                  # M-PM-03: Tạo yêu cầu khảo sát mới
      ai-inbox.tsx                       # M-PM-04: Hộp thư xác minh lỗi AI
      verify-a.tsx                       # M-PM-05: Xác minh AI — Bounding Box
      verify-b.tsx                       # M-PM-06/14: Xác minh AI — Đa kỳ & Baseline (GỘP)
      field-task.tsx                     # M-PM-07/M-CREW-05: Khảo sát thực địa (GỘP)
      batching.tsx                       # M-PM-08: Gộp đợt sửa chữa
      submit-approval.tsx                # M-PM-09: Trình phê duyệt
      resubmit.tsx                       # M-PM-10: Chỉnh sửa & gửi lại
      submitted-tab.tsx                  # M-PM-11: Tab đã gửi duyệt
      assign-crew.tsx                    # M-PM-12: Giao việc cho Repair Crew
      wo-confirm.tsx                     # M-PM-13: Xác nhận nghiệm thu hoàn thành
      profile.tsx                        # M-PM-15: Hồ sơ PM
    (sup)/
      _layout.tsx                        # BottomNav 4 tab: Home / Approve / Reports / Profile
      home.tsx                           # M-SUP-01: Trang chủ Giám sát
      approve.tsx                        # M-SUP-02: Thẩm định & phê duyệt
      risk.tsx                           # M-SUP-03: Tổng quan rủi ro
      reports.tsx                        # M-SUP-04: Báo cáo & thống kê
      export-modal.tsx                   # M-SUP-05: Xuất PDF/ZIP
      profile.tsx                        # M-SUP-06: Hồ sơ + quản trị (tích hợp M-SUP-07)
      signoff.tsx                        # M-SUP-08: Ký đóng đợt sửa

  src/
    types/
      domain.ts                          # User, SurveyDataVersion, Defect, RepairBatchVersion...
      enums.ts                           # RoleCode, SyncStatus, Severity, RepairBatchStatus...
    design-tokens.ts                     # colors, typography, spacing, radius
    components/
      Button.tsx                         # primary(gold) / secondary(outline) / text
      Card.tsx
      Chip.tsx                           # severity(high/med/low) + status(pending/approved/rejected)
      InputField.tsx
      BottomNav.tsx                      # 4 tab, active = gold #C9A227, cao 64px
      SafeAreaScreen.tsx                 # nền surfaceAlt, padding 16
      FAB.tsx                            # absolute bottom-24 right-16 z-30  [RN StyleSheet: bottom:96, right:16, zIndex:30]
      Toast.tsx
      StatusBadge.tsx                    # LOCAL / QUEUED / SERVER_CONFIRMED
      ViewFinder.tsx                     # camera crew + watermark戳
      EmptyState.tsx
    api/
      client.ts                          # Axios/Fetch wrapper + interceptor (401, must_change_password)
      mock/
        auth.ts                          # POST login, refresh, change-password
        surveys.ts                       # GET list, GET detail, POST upload
        defects.ts                       # GET list, POST field-inspection
        repair-batches.ts                # POST submit, GET list
    store/
      auth.ts                            # Zustand: user, role, token, login/logout
      offline.ts                         # Zustand: upload queue count, pending items
    offline/
      database.ts                        # SQLite init + CRUD helpers
      schema.sql                         # DDL các bảng local
      upload-queue.ts                    # Queue worker: QUEUED → UPLOADING → SERVER_CONFIRMED
      checksum.ts                        # SHA-256 helper
```

### Quy tắc routing
- Expo Router映射 trực tiếp: `screen-drone-home` → `app/(drone)/home.tsx`
- `nav-role-drone` / `nav-role-crew` / `nav-role-pm` / `nav-role-sup` = BottomNav trong `_layout.tsx` mỗi nhóm role
- **Gộp mã đã chốt:** `M-PM-06/14` → `verify-b.tsx`, `M-PM-07/M-CREW-05` → `field-task.tsx`, `M-SUP-07` tích hợp trong `profile.tsx` (không tạo màn riêng)



---

## 2. Triết lý Minimalism Thực dụng & Design Tokens

### Triết lý cốt lõi (AI PHẢI HIỂU TRƯỚC KHI scaffold)

> *"Cát Tường Field đi theo triết lý minimalism thực dụng: mỗi màn hình chỉ hiển thị đúng thông tin cần để ra quyết định hoặc thực hiện một hành động, không có yếu tố trang trí thừa. Cảm giác tổng thể là 'gọn, rõ, đáng tin cậy' — giống một công cụ chuyên nghiệp hơn là một app tiêu dùng nhiều màu sắc."*

**Đây KHÔNG phải directional guideline — đây là REQUIREMENT.** AI scaffolding PHẢI tuân thủ:

1. **Content minimalism:** Mỗi màn chỉ hiện đúng thông tin cần để hành động. Không tooltip giải thích dài dòng, không text decoration, không "nice-to-have" elements.
2. **Gold restraint:** Vàng đồng `#C9A227` chỉ dùng ở nơi cần thu hút chú ý: 1 CTA chính/màn, tab đang active, số liệu KPI nổi bật trên dashboard. **KHÔNG** dùng cho nền lớn, text thường, icon trang trí.
3. **Visual minimalism:** Không shadow đậm, không gradient, không decorative illustrations. Phân lớp thị giác = tương phản nền (surfaceAlt vs surface) + viền mảnh 1px.
4. **Whitespace philosophy:** Giữ nhiều khoảng trắng. Không lấp đầy màn hình bằng chi tiết. Khoảng cách giữa các khối nội dung = 24px.
5. **Shape consistency:** Không trộn góc bo và góc vuông trong cùng một màn hình. Tối đa 2 mức bo góc khác nhau trong cùng 1 view.
6. **Font restraint:** Không trộn nhiều font trong cùng một màn — chỉ Roboto. Sansation CHỈ cho logo/headline.

**Khi scaffold components:** Hỏi bản thân "yếu tố này có cần thiết để người dùng hành động không?" — nếu không, bỏ.

### Design Tokens (`src/design-tokens.ts`)

```ts
export const colors = {
  primary:      '#C9A227',  // VÀNG ĐỒNG — chỉ 1 CTA/màn
  primaryDark:  '#6B5219',  // pressed
  secondary:    '#2D3748',  // viền, icon phụ, text cấp 2
  neutral:      '#1A1D20',  // text chính (tối đa tương phản ngoài trời)
  surface:      '#FFFFFF',  // card, nút
  surfaceAlt:   '#F8F9FA',  // nền màn hình
  onPrimary:    '#FFFFFF',
  onSurface:    '#1A1D20',
  border:       '#E2E5E9',  // viền mảnh 1px thay shadow
  success:      '#2F9E44',  // severity low / approved
  warning:      '#F59E0B',  // severity medium / pending
  error:        '#E5484D',  // severity high / rejected
  info:         '#3B82F6',  // trạng thái đang xử lý
};

export const typography = {
  // Sansation — CHỈ dùng cho logo/headline (tiếng Latin)
  headlineLg: { fontFamily: 'Sansation', fontSize: 24, fontWeight: '500' as const, lineHeight: 31.2 },
  // Roboto — toàn bộ còn lại
  titleLg:    { fontFamily: 'Roboto', fontSize: 20, fontWeight: '500' as const, lineHeight: 26 },
  titleMd:    { fontFamily: 'Roboto', fontSize: 16, fontWeight: '500' as const, lineHeight: 22.4 },
  bodyLg:     { fontFamily: 'Roboto', fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMd:     { fontFamily: 'Roboto', fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  labelLg:    { fontFamily: 'Roboto', fontSize: 14, fontWeight: '500' as const, lineHeight: 16.8 },  // chữ nút
  labelSm:    { fontFamily: 'Roboto', fontSize: 11, fontWeight: '500' as const, lineHeight: 13.2, letterSpacing: 0.02 },  // chip — IN HOA
  caption:    { fontFamily: 'Roboto', fontSize: 12, fontWeight: '400' as const, lineHeight: 16.8 },
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
  screenMargin: 16,
  cardPadding: 16,
}; // thang 8px

export const radius = {
  sm: 4, md: 8, lg: 12, xl: 20, full: 9999,
};
```

### Core Components

| Component | Props | Ghi chú |
|-----------|-------|---------|
| `Button` | `variant: 'primary' \| 'secondary' \| 'text'`, `onPress`, `disabled?`, `loading?` | Primary: nền gold, chữ trắng, md radius. **Tối đa 1 primary/màn** |
| `Card` | `children`, `style?` | Nền white, radius lg (12px), padding 16 |
| `Chip` | `variant: 'severity-high' \| 'severity-medium' \| 'severity-low' \| 'status-pending' \| 'approved' \| 'rejected'`, `label` | Label IN HOA, labelSm, radius full |
| `InputField` | `label?`, `value`, `onChangeText`, `error?`, `placeholder?` | Nền surfaceAlt, viền border, radius md |
| `BottomNav` | `tabs: { icon, label, route }[]`, `activeRoute` | 4 tab, cao 64px, active = gold, inactive = secondary |
| `SafeAreaScreen` | `children`, `scroll?` | wraps SafeAreaView + ScrollView tùy chọn, nền surfaceAlt |
| `FAB` | `onPress`, `icon` | Position absolute: bottom-24 (96px — trên nav 64px), right-16, z-30 |
| `StatusBadge` | `status: 'LOCAL' \| 'QUEUED' \| 'SERVER_CONFIRMED'` | Hiển thị text + màu tương ứng |
| `Toast` | `type: 'success' \| 'error' \| 'info'`, `message`, `duration?` | Tự dismiss, toast phía trên màn hình |
| `EmptyState` | `icon`, `title`, `message`, `actionLabel?`, `onAction?` | Khi danh sách rỗng |
| `ViewFinder` | `onCapture`, `defectType` | Camera crew + watermark戳 overlay |

### Quy tắc UI — Minimalism Checklist (AI kiểm tra mỗi component)

| # | Quy tắc | Nguồn |
|---|---------|--------|
| 1 | Mỗi màn **tối đa 1 nút primary gold filled** | DESIGN.md Components |
| 2 | **Không gradient, không shadow đậm** — phân lớp bằng tương phản nền + viền mảnh 1px | DESIGN.md Elevation |
| 3 | **Không trộn font** trong cùng màn — chỉ Roboto; Sansation chỉ logo/headline | DESIGN.md Typography |
| 4 | **Không trộn corner radius và corner square** trong cùng view; tối đa 2 mức bo góc | DESIGN.md Shapes |
| 5 | **Tương phản WCAG AA** (≥4.5:1) — người dùng ngoài trời nắng | DESIGN.md Do's |
| 6 | **Gold chỉ cho CTA chính, tab active, KPI highlight** — không nền lớn, không text thường | DESIGN.md Colors |
| 7 | **Giữ khoảng trắng** — không lấp đầy màn hình bằng chi tiết trang trí | DESIGN.md Layout |
| 8 | **FAB** = `absolute bottom-24 right-16 z-30` (trên nav 64px + gap 32px) | HTML wireframe |
| 9 | **Danh sách có FAB** = `h-full relative`, FAB `absolute`, content scroll bình thường | HTML wireframe |
| 10 | **Mỗi Card** dùng tối đa 2 mức bo góc: `lg` cho card, `md` cho chip/nút bên trong | DESIGN.md Shapes |
| 11 | **Input field** không có icon trang trí thừa — chỉ label + value + viền | DESIGN.md Components |
| 12 | **Chip severity** dùng đúng 3 màu ngữ nghĩa (error/warning/success), **không dùng vàng đồng** | DESIGN.md Colors |

---

## 3. TypeScript Interfaces & Enums

### Enums (`src/types/enums.ts`)

```ts
export enum RoleCode {
  DRONE_OPERATOR = 'DRONE_OPERATOR',
  REPAIR_CREW    = 'REPAIR_CREW',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  SUPERVISOR     = 'SUPERVISOR',
}

export enum SyncStatus {
  LOCAL             = 'LOCAL',
  QUEUED            = 'QUEUED',
  UPLOADING         = 'UPLOADING',
  SERVER_CONFIRMED  = 'SERVER_CONFIRMED',
  INVALID           = 'INVALID',
}

export enum IntegrationStatus {
  INTACT    = 'INTACT',
  CORRUPTED = 'CORRUPTED',
}

export enum DefectStatus {
  OPEN     = 'OPEN',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  RESOLVED = 'RESOLVED',
}

export enum Severity {
  LOW      = 'LOW',
  MEDIUM   = 'MEDIUM',
  HIGH     = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RepairBatchStatus {
  DRAFT                  = 'DRAFT',
  PENDING_APPROVAL       = 'PENDING_APPROVAL',
  REVISION_REQUIRED      = 'REVISION_REQUIRED',
  APPROVED               = 'APPROVED',
  ASSIGNED               = 'ASSIGNED',
  IN_PROGRESS            = 'IN_PROGRESS',
  PENDING_INSPECTION     = 'PENDING_INSPECTION',
  REVISION_REQUIRED_WORK = 'REVISION_REQUIRED_WORK',
  COMPLETED              = 'COMPLETED',
}

export enum FieldInspectionTaskStatus {
  NEW_ASSIGNED          = 'NEW_ASSIGNED',
  ACCEPTED              = 'ACCEPTED',
  REJECTED              = 'REJECTED',
  IN_PROGRESS           = 'IN_PROGRESS',
  SUPPLEMENT_REQUIRED   = 'SUPPLEMENT_REQUIRED',
  SUBMITTED             = 'SUBMITTED',
  COMPLETED             = 'COMPLETED',
}

export enum MeasurementType {
  DEPRESSION_DEPTH       = 'DEPRESSION_DEPTH',
  SLAB_FAULTING_HEIGHT   = 'SLAB_FAULTING_HEIGHT',
  SHOULDER_EROSION_EXTENT = 'SHOULDER_EROSION_EXTENT',
}
```

### Interfaces (`src/types/domain.ts`)

```ts
import { RoleCode, SyncStatus, IntegrationStatus, DefectStatus, Severity, RepairBatchStatus, FieldInspectionTaskStatus, MeasurementType } from './enums';

// ── AUTH ──────────────────────────────────────────────
export interface User {
  id: string;
  role_code: RoleCode;
  full_name: string;
  employee_code: string;          // vd: PM-0428, CT-2089, CT-RC-084, NV-8842
  must_change_password: boolean;  // CN10: true → buộc đổi mật khẩu trước khi dùng
  project_ids: string[];          // CN03: scope dự án được phân công
  token: string;
  refresh_token: string;
}

// ── SURVEY / FLIGHT ───────────────────────────────────
export interface SurveyDataVersion {
  id: string;
  survey_id: string;
  version_no: number;
  status: SyncStatus;
  integration_status: IntegrationStatus;   // SHA-256 checksum
  checksum_sha256: string | null;
  files: SurveyFile[];
  server_confirmed_at: string | null;
}

export interface SurveyFile {
  video_id: string;
  srt_id: string | null;
  size_bytes: number;
}

export interface FlightLog {
  id: string;
  survey_id: string;
  pilot_id: string;
  drone_serial: string;
  departure_time: string;
  landing_time: string | null;
  weather_conditions: string;
  gps_log_path: string | null;
  status: SyncStatus;
}

// ── FILE / MEDIA ──────────────────────────────────────
export interface FileRecord {
  id: string;
  uri_local: string;
  checksum_sha256: string;
  status: SyncStatus;
  size_bytes: number;
}

// ── DEFECT ────────────────────────────────────────────
export interface Defect {
  id: string;
  project_id: string;
  road_section_version_id: string;
  defect_type_code: string;
  cause_category_code?: string;
  severity: Severity;
  status: DefectStatus;
  geometry: GeoJSON.Geometry;     // WGS84, geog(4326) trên SQL Server
  reported_at: string;
  ai_detection_id?: string;
  notes?: string;
}

// ── FIELD INSPECTION (UD-05 — BẮT BUỘC trước khi Repair) ──
export interface FieldInspectionTask {
  id: string;
  defect_id: string;
  assigned_to: string;
  status: FieldInspectionTaskStatus;
  required_measurement_type: MeasurementType;
  due_at: string;
  instructions?: string;
}

export interface GroundTruthMeasurement {
  id: string;
  session_id: string;
  task_id: string;
  defect_id: string;
  measurement_type: MeasurementType;
  value: number;                        // mm (khuyến nghị)
  unit: string;
  instrument_name: string;              // vd: "Thước kẹp cơ học Mitutoyo"
  measurement_method: string;
  measured_by: string;                  // user id
  measured_at: string;
  location: { type: 'Point'; coordinates: [number, number] };  // geog(4326)
  evidence_file_id?: string;
  notes?: string;
}

// ── REPAIR BATCH (UD-06 — TẦNG UI MOBILE ZERO CHI PHÍ / BACKEND SNAPSHOT ONLY) ──
export interface RepairItem {
  id: string;
  defect_id: string;
  estimated_cost?: number;        // Backend internal snapshot — CẤM RENDER TRÊN UI MOBILE
  actual_cost?: number;           // Backend internal snapshot — CẤM RENDER TRÊN UI MOBILE
  status: string;
  description?: string;
}

export interface RepairBatchVersion {
  id: string;
  batch_id: string;
  version_no: number;
  status: RepairBatchStatus;
  estimated_total_cost?: number;  // Backend internal snapshot — CẤM RENDER TRÊN UI MOBILE
  items: RepairItem[];
  submitted_at?: string;
  approved_at?: string;
  rejected_reason?: string;
}

// ── REPAIR EVIDENCE ───────────────────────────────────
export interface RepairEvidence {
  id: string;
  repair_item_id: string;
  kind: 'BEFORE' | 'AFTER';
  file_id: string;
  captured_at: string;
  synced: SyncStatus;
}
```

---

## 4. SQLite Schema + Mock API

### SQLite Schema (`src/offline/schema.sql`)

```sql
-- ======================================================
-- RoadGuard Offline-first Schema (SQLite)
-- US-02, US-06, US-13: lưu bản nháp, queue upload,SHA-256
-- ======================================================

-- BẢN NHÁP: mọi thao tác hiện trường ghi local trước
CREATE TABLE IF NOT EXISTS local_draft (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,          -- 'flight_log' | 'measurement' | 'evidence' | 'defect_report'
  payload       TEXT NOT NULL,          -- JSON blob
  created_at    TEXT NOT NULL,          -- ISO 8601
  updated_at    TEXT NOT NULL
);

-- UPLOAD QUEUE: QUEUED → UPLOADING → SERVER_CONFIRMED / INVALID
CREATE TABLE IF NOT EXISTS outbox (
  id              TEXT PRIMARY KEY,
  kind            TEXT NOT NULL,        -- 'survey_upload' | 'defect_report' | 'measurement' | 'repair_evidence'
  data_b64        TEXT NOT NULL,        -- base64 encoded payload
  checksum_sha256 TEXT NOT NULL,        -- xác thực toàn vẹn
  status          TEXT NOT NULL DEFAULT 'QUEUED',
  attempt         INTEGER DEFAULT 0,
  max_attempts    INTEGER DEFAULT 5,
  last_error      TEXT,
  created_at      TEXT NOT NULL
);

-- FILE MEDIA: video, SRT, ảnh
CREATE TABLE IF NOT EXISTS media_file (
  id                    TEXT PRIMARY KEY,
  uri_local             TEXT NOT NULL,
  kind                  TEXT NOT NULL,      -- 'video' | 'srt' | 'photo'
  size_bytes            INTEGER NOT NULL,
  checksum_sha256       TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'LOCAL',   -- LOCAL/QUEUED/UPLOADING/SERVER_CONFIRMED
  survey_data_version_id TEXT,
  defect_id             TEXT,
  repair_item_id        TEXT,
  captured_at           TEXT NOT NULL
);

-- CACHE READ-ONLY: dữ liệu server đã xác nhận, chỉ đọc
CREATE TABLE IF NOT EXISTS survey_cache (
  id              TEXT PRIMARY KEY,
  data            TEXT NOT NULL,          -- JSON SurveyDataVersion
  cached_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS defect_cache (
  id              TEXT PRIMARY KEY,
  data            TEXT NOT NULL,          -- JSON Defect
  cached_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_cache (
  id              TEXT PRIMARY KEY,
  kind            TEXT NOT NULL,          -- 'flight_log' | 'field_inspection_task' | 'repair_item'
  data            TEXT NOT NULL,          -- JSON
  cached_at       TEXT NOT NULL
);
```

### 5–7 Mock API Endpoints quan trọng

```ts
// src/api/mock/ — ĐÉO CẦN SERVER THẬT, dùng JSON fixture

// 1. AUTH
POST /api/auth/login
  Body:    { email: string, password: string }
  Response: { user: User, token: string, refresh_token: string }
  Note:    Nếu user.must_change_password === true → redirect màn force-change-password

POST /api/auth/refresh
  Body:    { refresh_token: string }
  Response: { token: string }

POST /api/auth/change-password
  Body:    { old_password: string, new_password: string }
  Response: { ok: true }
  Note:    CN10: bắt buộc trước khi dùng app

// 2. SURVEYS (Drone + PM)
GET  /api/surveys?status=PENDING&period=2024-Q3
  Response: { items: SurveyDataVersion[], total: number }
  Note:    M-DRONE-02, M-PM-02

GET  /api/surveys/:id
  Response: SurveyDataVersion + files[]
  Note:    M-DRONE-03, M-DRONE-04

POST /api/surveys/:id/upload
  Body:    FormData { file: File, checksum_sha256: string }
  Response: { status: SyncStatus, server_confirmed_at: string }
  Note:    KS09, CN06-09

// 3. DEFECTS
GET  /api/defects?project_id=&status=OPEN
  Response: { items: Defect[], total: number }
  Note:    M-PM-04, M-SUP-02

POST /api/defects/:id/field-inspection
  Body:    { measurement: GroundTruthMeasurement }
  Response: { task_status: FieldInspectionTaskStatus }
  Note:    UD-05 bắt buộc, M-PM-07/M-CREW-05

// 4. REPAIR BATCHES
POST /api/repair-batches/submit
  Body:    { batch: RepairBatchVersion }
  Response: { batch_id: string, status: 'PENDING_APPROVAL' }
  Note:    M-PM-09, UD-06 estimated_total_cost tự tính

GET  /api/repair-batches?project_id=
  Response: { items: RepairBatchVersion[] }
  Note:    M-SUP-02, M-SUP-08
```

---

## Dependencies cần cài

```bash
npx create-expo-app FE_AppMobile --template blank-typescript
cd FE_AppMobile

# Routing
npx expo install expo-router expo-linking expo-constants expo-status-bar

# State & Data
npm install zustand @tanstack/react-query

# Offline
npx expo install expo-sqlite

# Camera & Location
npx expo install expo-camera expo-location expo-media-library

# File system
npx expo install expo-file-system expo-document-picker

# UI helpers
npx expo install react-native-safe-area-context react-native-gesture-handler
npx expo install @expo/vector-icons
npm install axios

# Fonts
npx expo install @expo-google-assets/roboto
# Sansation: tải .ttf thủ công vào assets/fonts/ (không có trên Expo Google Fonts)
```

### `app.json` thêm

```json
{
  "expo": {
    "scheme": "roadguard",
    "plugins": ["expo-router", "expo-camera", "expo-location"],
    "android": {
      "package": "com.hoanghai.roadguard",
      "adaptiveIcon": { "foregroundImage": "./assets/android-icon-foreground.png", "backgroundColor": "#FFFFFF" }
    }
  }
}
```

---

## Gap-filling đã chốt (AI PHẢI BỒI)

| Gap | Mô tả | Vị trí |
|-----|-------|--------|
| `force-change-password` | US-01/CN10: `must_change_password === true` → chặn mọi màn, buộc đổi password. HTML không có màn này. | `app/(auth)/force-change-password.tsx` |
| Admin stack | US-17/18/19: tạo tài khoản, phân quyền, quy tắc phân mức lỗi, danh mục TCVN. Tích hợp trong `(sup)/profile.tsx` (M-SUP-07) | Không tạo màn mới — dùng tabs/sections trong profile |
| `SUPPLEMENT_REQUIRED` | Trạng thái FieldInspectionTask khi cần đo bổ sung. HTML chỉ viết "Yêu cầu bổ sung". | Thêm enum值 `SUPPLEMENT_REQUIRED` vào `FieldInspectionTaskStatus` |
| Measurement fields | `instrument_name`, `measurement_method`, `measured_at`, `location` (geog(4326)), `evidence_file_id` — Data Dictionary yêu cầu nhưng HTML hiển thị không đầy đủ | Thêm vào `GroundTruthMeasurement` interface |
| `road_section_version_id` | Mỗi Survey/Defect phải gắn đoạn đường phiên bản (Domain Model) | Thêm field vào Survey + Defect |

---

## Quy tắc CRITICAL cho AI scaffolding

1. **KHÔNG dùng Redux Toolkit** — dùng Zustand (nhẹ, đủ).
2. **KHÔNG dùng React Navigation thuần** — dùng Expo Router (file-based, map trực tiếp mã màn).
3. **Mỗi `_layout.tsx` role** phải render BottomNav 4 tab với đúng routes.
4. **AuthGuard an toàn ReactFabric:** Giữ `<Stack screenOptions={{ headerShown: false }} />` luôn mount ổn định. Redirection phải đặt trong `useEffect` + `router.replace(...)` tới `(auth)` hoặc `(auth)/force-change-password`. CẤM dùng `<Redirect />` conditionally bọc ngoài `<Stack />` trong `RootLayout`.
5. **UD-06 Zero Presentation Cost:** Tầng giao diện mobile `app/` TUYỆT ĐỐI KHÔNG CÓ INPUT HOẶC TEXT TIỀN NÔNG (VNĐ / dự toán). Bắt buộc thay bằng bộ 3: Phương án xử lý kỹ thuật + Kích thước hình học hư hại (m², cm, m) + Thời hạn hoàn thành.
6. **Vật liệu & Khảo sát:** Bê tông xi măng TCVN 10380:2014, 4K RGB + DSM (OpenDroneMap), TUYỆT ĐỐI CẤM LiDAR, Tuyến ĐH.05 Bình Chánh là Pilot Primary Corridor.
7. **5 Mã Defect chuẩn:** Single source of truth tại `src/constants/defect-types.ts` (`POTH_DEEP`, `DEPR_POND`, `EDGE_BRK`, `SLAB_CRK`, `SHLD_EROS`).
8. **`geometry`** trong Defect dùng GeoJSON standard (tương thích `geography(4326)` SQL Server).
9. **Upload queue** trạng thái: LOCAL → QUEUED → UPLOADING → SERVER_CONFIRMED. CHECKSUM SHA-256 trước khi gửi.
10. **FAB** trong `tasks.tsx` và `surveys.tsx`: `position: absolute, bottom: 96, right: 16, zIndex: 30`.
11. **Logo:** Splash/Loading = `assets/logo_hoanghai.png`; Màn trong/Header/Icon = `assets/logo_hoanghai_icon.png`.
