# RoadGuard Mobile — Bootstrap Prompt (Chuẩn Canonical 29_9 / OpenAPI 0.2.0)

> **Mục đích:** File này tổng hợp đủ thông tin để một AI lập trình scaffold và phát triển codebase Expo Router + TypeScript trong thư mục `FE_AppMobile/` theo chuẩn đặc tả Canonical 29_9 (OpenAPI 0.2.0-draft-alignment) mới nhất của Công ty TNHH Xây dựng Bê tông Hoàng Hải.

---

## ⚠️ ĐIỀU KHOẢN OVERRIDE TỐI CAO (CANONICAL PRIORITY)
**Mọi quy định trong mục Chuẩn Hóa Canonical 29_9 (28/09/2026 - 29/09/2026 / 29_9) có hiệu lực ưu tiên cao nhất, OVERRIDE (đè) lên toàn bộ các tài liệu đặc tả lịch sử:**
- **Thương hiệu:** Công ty TNHH Xây dựng Bê tông Hoàng Hải (`com.hoanghai.roadguard`, email nội bộ `@hoanghai.vn`, prefix `HH-`).
- **Quy tắc Logo:** Splash/Loading = `assets/logo_hoanghai.png` (có tên công ty); Màn trong/Header/Icon = `assets/logo_hoanghai_icon.png` (chỉ xe bồn, không chữ).
- **Phân định Nền tảng:** Mobile app dành riêng cho **3 vai trò hiện trường**: `REPAIR_CREW`, `DRONE_OPERATOR`, `REPORTER`. Web Dashboard dành cho `PROJECT_MANAGER` và `SUPERVISOR` (màn hình PM/Supervisor cũ chuyển vào `archive/web-screens/`).
- **Hợp đồng Kỹ thuật Frontend (09_Frontend):** Áp dụng nghiêm ngặt danh mục 133 operations (`operation_catalog.md`), types chuẩn (`contracts/api.types.ts`), local types (`contracts/local.types.ts`), và mã lỗi nghiệp vụ (`03_Error_Response_UI_Convention.md`).
- **Nghiệp vụ Fast Track (US-33, BR-05/08/11..18/25):** 
  - `TaskMode`: `INSPECT_AND_REPAIR` vs `MEASURE_ONLY`.
  - Sửa nhanh tại chỗ khi: Task là `INSPECT_AND_REPAIR`, kích thước $\le$ `FastTrackPolicyVersion` (diện tích $\le 1.0\text{ m}^2$, độ sâu $\le 5\text{ cm}$, chiều dài $\le 2.0\text{ m}$), và có ảnh BEFORE hợp lệ.
  - Crew gửi ảnh AFTER $\rightarrow$ PM trực tiếp kiểm tra và đóng lỗi. **Supervisor KHÔNG phê duyệt Fast Track.**
- **Đợt gom nhiều lỗi (US-35, BR-09):** Bắt buộc `MEASURE_ONLY`; Crew chỉ đo và báo PM, không tự ý sửa tại chỗ.
- **Tái sử dụng bằng chứng ảnh (BR-17, BR-18):** Ảnh chụp của Reporter hoặc ảnh Drone có thể làm ảnh BEFORE nếu khớp vị trí.
- **Dẫn đường WGS84 (US-40, BR-38):** Mở Google Maps; Crew đến vị trí khuyết tật, Drone Pilot đến Điểm tiếp cận/tập kết (Access Point).
- **UD-06:** Tầng UI Mobile (`app/`) **TUYỆT ĐỐI ZERO CHI PHÍ/TIỀN TỆ**, cấm định mức vật tư tiêu hao. Bắt buộc hiển thị bộ 3: Phương án xử lý + Kích thước hình học hư hại (m², cm, m) + Thời hạn.
- **Vật liệu & Tuyến:** Bê tông xi măng TCVN 10380:2014, 4K RGB + DSM (OpenDroneMap), TUYỆT ĐỐI CẤM LiDAR, Tuyến ĐH.05 Bình Chánh là Pilot Primary Corridor.
- **5 Mã Defect:** `src/constants/defect-types.ts` (`POTH_DEEP`, `DEPR_POND`, `EDGE_BRK`, `SLAB_CRK`, `SHLD_EROS`).
- **Reporter Authentication (D25):** Xác thực bằng Email hợp lệ (RFC 5322), không giới hạn nhà cung cấp email; bỏ hoàn toàn giới hạn Gmail-only.

---

## Context nhanh

**RoadGuard** là hệ thống quản lý bảo hành & sửa chữa hạ tầng đường bộ của **Công ty TNHH Xây dựng Bê tông Hoàng Hải**. App mobile phục vụ **3 vai trò hiện trường cốt lõi**:
- **Repair Crew (`(crew)`)** — nhận lệnh công tác (`/inspection-tasks`), xem chế độ `INSPECT_AND_REPAIR` hoặc `MEASURE_ONLY`, tự đánh giá Fast Track theo policy, chụp ảnh nghiệm thu BEFORE/AFTER, dẫn đường Google Maps, báo lỗi mới, đồng bộ ngoại tuyến SQLite (10 màn).
- **Drone Operator (`(drone)`)** — tiếp nhận lệnh bay khảo sát (`/survey-tasks`), dẫn đường tới Điểm tiếp cận cất/hạ cánh, upload video/ảnh 4K RGB từ thẻ nhớ SD (`/uploads`), nhật ký chuyến bay, đồng bộ ngoại tuyến (7 màn).
- **Reporter (`(reporter)`)** — Người dân & Đại diện Ban QLDA: đăng ký/xác thực OTP Email 6 số (`/auth/reporter-registrations`), tạo phản ánh kèm GPS + 3 ảnh hiện trường (`/reports`), tra cứu tiến độ công khai qua mã tracking, đánh giá 1–5 sao nghiệm thu (4 màn chính + profile tiện ích).
- **Tầng Auth (`(auth)`)** — Đăng nhập tài khoản nhân viên (`/auth/login`), đổi mật khẩu bắt buộc lần đầu, xác thực OTP cho Reporter (3 màn).

---

## 1. Cấu trúc Routing (Expo Router)

```text
FE_AppMobile/
  app/
    _layout.tsx                          # Root layout: SessionProvider + AuthGuard (Stack luôn mount)
    index.tsx                            # Entry point điều hướng ban đầu
    (auth)/
      _layout.tsx                        # Stack auth không có BottomNav
      index.tsx                          # M-AUTH-01/02: Đăng nhập nhân viên & Lựa chọn phản ánh dân sinh
      force-change-password.tsx          # BÙ GAP CN10/US-01: Bắt buộc đổi mật khẩu lần đầu
      otp-verify.tsx                     # M-AUTH-03: Xác thực OTP Email 6 số cho Reporter
    (drone)/
      _layout.tsx                        # BottomNav 4 tab: Trang chủ / Yêu cầu / Đồng bộ / Cá nhân
      home.tsx                           # M-DRONE-01: Trang chủ Phi công
      requests.tsx                       # M-DRONE-02: Danh sách yêu cầu khảo sát
      request-detail.tsx                 # M-DRONE-03: Chi tiết yêu cầu #REQ-xxx + Tọa độ điểm tiếp cận
      upload.tsx                         # M-DRONE-04: Tải video/ảnh từ thẻ nhớ SD
      log.tsx                            # M-DRONE-05: Nhật ký chuyến bay
      sync.tsx                           # M-DRONE-06: Đồng bộ dữ liệu ngoại tuyến
      profile.tsx                        # M-DRONE-07: Hồ sơ cá nhân & Thông tin Drone
    (crew)/
      _layout.tsx                        # BottomNav 4 tab: Trang chủ / Nhiệm vụ / Đồng bộ / Cá nhân
      home.tsx                           # M-CREW-01: Trang chủ Đội sửa chữa (KPI, việc khẩn)
      tasks.tsx                          # M-CREW-02: Công việc của tôi (Lọc theo TaskMode, FAB nổi)
      wo-detail.tsx                      # M-CREW-03: Chi tiết lệnh công tác #WO-xxx (TaskMode, Fast Track check)
      navigation.tsx                     # M-CREW-04: Dẫn đường Google Maps tới tọa độ WGS84
      viewfinder.tsx                     # M-CREW-06: Chụp ảnh nghiệm thu BEFORE/AFTER + watermark GPS/thời gian
      progress.tsx                       # M-CREW-07: Cập nhật tiến độ & kích thước đo đạc thực tế
      report-defect.tsx                  # M-CREW-08: Báo cáo khuyết tật phát sinh mới ngoài phạm vi
      complete.tsx                       # M-CREW-09: Hoàn tất công việc & Gửi hồ sơ nghiệm thu Fast Track
      sync.tsx                           # M-CREW-10: Hàng đợi đồng bộ ngoại tuyến SQLite
      profile.tsx                        # M-CREW-11: Hồ sơ kỹ thuật viên & Chính sách Fast Track áp dụng
    (reporter)/
      _layout.tsx                        # BottomNav 3 tab: Trang chủ / Phản ánh / Tra cứu
      home.tsx                           # M-REP-01: Trang chủ Người dân & Đại diện Ban QLDA
      report.tsx                         # M-REP-02: Tạo phản ánh hư hại + GPS thiết bị + tối đa 3 ảnh
      track.tsx                          # M-REP-03: Tra cứu tiến độ xử lý theo mã tracking #REP-xxx
      feedback.tsx                       # M-REP-04: Đánh giá chất lượng nghiệm thu (1–5 sao + nhận xét)

  archive/                               # Kho lưu trữ màn hình quản lý (chuyển giao cho Web Dashboard)
    web-screens/
      pm/                                # 14 màn hình Project Manager cũ
      sup/                               # 7 màn hình Supervisor cũ

  src/
    types/
      domain.ts                          # User, SurveyDataVersion, Defect, FastTrackPolicy, ReporterReport...
      enums.ts                           # RoleCode, TaskMode, FastTrackEligibility, DefectStatus...
    design-tokens.ts                     # colors, typography, spacing, radius
    constants/
      defect-types.ts                    # 5 mã khuyết tật chuẩn hóa
      routes.ts                          # Định nghĩa route chuẩn có group prefix
      error-codes.ts                     # 10 mã lỗi nghiệp vụ từ 09_Frontend/03
    components/
      Button.tsx                         # primary(gold) / secondary(outline) / text
      Card.tsx
      Chip.tsx                           # severity + task mode + fast track status
      InputField.tsx
      BottomNav.tsx                      # 3-4 tab theo role, active = gold #C9A227, cao 64px
      SafeAreaScreen.tsx                 # nền surfaceAlt, padding 16
      FAB.tsx                            # absolute bottom: 96, right: 16, zIndex: 30
      Toast.tsx
      StatusBadge.tsx                    # LOCAL / QUEUED / SERVER_CONFIRMED
      ViewFinder.tsx                     # camera crew + watermark
      EmptyState.tsx
      StarRating.tsx                     # Đánh giá 1–5 sao cho Reporter
      TrackingTimeline.tsx               # Trục thời gian 5 bước cho Reporter
    api/
      client.ts                          # Axios wrapper + auth interceptor + Idempotency-Key
      mock/
        auth.ts                          # Đăng nhập nhân viên + gửi/xác thực OTP Reporter
        tasks.ts                         # Danh sách task, chi tiết WO, cập nhật kích thước & Fast Track check
        surveys.ts                       # Yêu cầu bay khảo sát & upload video/ảnh thẻ SD
        defects.ts                       # Danh sách khuyết tật, chính sách Fast Track
        reporter.ts                      # Tạo phản ánh, tra cứu timeline, gửi đánh giá sao
    store/
      auth.ts                            # Zustand: user, role, token, login/logout, reporter session
      offline.ts                         # Zustand: upload queue count, pending items
    offline/
      database.ts                        # SQLite init + CRUD helpers
      schema.sql                         # DDL các bảng local SQLite theo 09_Frontend/09
      upload-queue.ts                    # Queue worker theo state machine 09_Frontend
      checksum.ts                        # SHA-256 helper
```

---

## 2. Triết lý Minimalism Thực dụng & Design Tokens

### Triết lý cốt lõi
- **Content minimalism:** Mỗi màn chỉ hiện đúng thông tin cần để hành động.
- **Gold restraint:** Vàng đồng `#C9A227` chỉ dùng cho 1 CTA chính/màn, tab active, rating sao, KPI highlight.
- **Visual minimalism:** Không shadow đậm, không gradient, viền mảnh 1px `#E2E5E9`.
- **Whitespace philosophy:** Giữ khoảng cách 24px giữa các khối nội dung.
- **Font restraint:** Roboto cho toàn bộ nội dung; Sansation CHỈ cho logo/headline.

---

## 3. TypeScript Interfaces & Enums

### Enums (`src/types/enums.ts`)

```ts
export enum RoleCode {
  DRONE_OPERATOR = 'DRONE_OPERATOR',
  REPAIR_CREW    = 'REPAIR_CREW',
  REPORTER       = 'REPORTER',
  // Lưu trữ tương thích hệ thống:
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  SUPERVISOR     = 'SUPERVISOR',
}

export enum TaskMode {
  INSPECT_AND_REPAIR = 'INSPECT_AND_REPAIR',  // Đo và sửa nhanh nếu đủ điều kiện
  MEASURE_ONLY       = 'MEASURE_ONLY',        // Chỉ đo đạc đợt gom lỗi, cấm tự sửa
}

export enum FastTrackEligibility {
  ELIGIBLE         = 'ELIGIBLE',          // Đạt policy, được sửa ngay
  EXCEEDED_POLICY  = 'EXCEEDED_POLICY',   // Vượt ngưỡng kích thước, chuyển PM
  LOCKED_BY_PM     = 'LOCKED_BY_PM',      // PM khóa sửa nhanh
}

export enum LocalState {
  DRAFT                 = 'DRAFT',
  WAITING_DEPENDENCIES  = 'WAITING_DEPENDENCIES',
  READY                 = 'READY',
  IN_FLIGHT             = 'IN_FLIGHT',
  UNKNOWN_OUTCOME       = 'UNKNOWN_OUTCOME',
  AUTH_REQUIRED         = 'AUTH_REQUIRED',
  PAUSED_RETRY          = 'PAUSED_RETRY',
  CONFLICT              = 'CONFLICT',
  REJECTED              = 'REJECTED',
  BLOCKED_CONTRACT      = 'BLOCKED_CONTRACT',
  ACKED                 = 'ACKED',
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
  OPEN                  = 'OPEN',
  VERIFIED              = 'VERIFIED',
  IN_REPAIR_BATCH       = 'IN_REPAIR_BATCH',
  REPAIRED_FAST_TRACK   = 'REPAIRED_FAST_TRACK',
  COMPLETED             = 'COMPLETED',
  REJECTED              = 'REJECTED',
}

export enum Severity {
  LOW      = 'LOW',
  MEDIUM   = 'MEDIUM',
  HIGH     = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum MeasurementType {
  DIMENSIONS_3D           = 'DIMENSIONS_3D',            // Dài x Rộng x Sâu
  DEPRESSION_DEPTH        = 'DEPRESSION_DEPTH',
  SLAB_FAULTING_HEIGHT    = 'SLAB_FAULTING_HEIGHT',
  SHOULDER_EROSION_EXTENT = 'SHOULDER_EROSION_EXTENT',
}

export enum ReporterReportStatus {
  SUBMITTED   = 'SUBMITTED',    // Đã gửi
  RECEIVED    = 'RECEIVED',     // Đã tiếp nhận
  INSPECTING  = 'INSPECTING',   // Đang khảo sát/đo đạc
  REPAIRING   = 'REPAIRING',    // Đang sửa chữa
  COMPLETED   = 'COMPLETED',    // Đã hoàn thành nghiệm thu
  REJECTED    = 'REJECTED',     // Không hợp lệ
}
```

### Domain Interfaces (`src/types/domain.ts`)

```ts
import { RoleCode, TaskMode, FastTrackEligibility, SyncStatus, IntegrationStatus, DefectStatus, Severity, MeasurementType, ReporterReportStatus } from './enums';

// ── AUTH: TOKEN & ACTOR (tách biệt theo contract 04_Data_Contract_Type_Definitions.md) ─────
// TokenPair: response từ POST /auth/login, /auth/refresh
export interface TokenPair {
  accessToken: string;          // Không lưu vào DB/Room/media folder
  refreshToken: string;         // Mã hóa bằng platform key, KHÔNG raw
  tokenType: 'Bearer';
  expiresIn: number;            // Giây (không phải timestamp), tính từ lúc nhận
  mustChangePassword: boolean;  // Kiểm trước khi mở chức năng nghiệp vụ
}

// Actor: response từ GET /me — KHÔNG có token/membership/capabilities
export interface Actor {
  id: string;                   // UUID opaque, không numeric
  displayName: string;          // HH-RC-084 Nguyễn Văn A
  role: RoleCode;               // Chỉ dùng để routing, KHÔNG suy quyền đối tượng từ role
  version: string;              // Opaque concurrency version
  // QUAN TRỌNG: UI không suy membership/project-scope từ Actor.role
  // Quyền đối tượng cần assignment/task/project check ở server
}

// User (legacy local composite — dùng trong Zustand store nội bộ app)
export interface User {
  actor: Actor;
  employeeCode?: string;        // HH-RC-084, HH-2089, M350-HH-02 ...
  phoneOrEmail: string;
  mustChangePassword: boolean;
  // Token KHÔNG lưu ở đây — lưu qua SecureStore (platform key encrypted)
}

// ── FAST TRACK POLICY ─────────────────────────────────
export interface FastTrackPolicyVersion {
  id: string;
  version_code: string;           // FTP-2026-V1
  max_area_m2: number;            // vd: 1.0 m2
  max_depth_cm: number;           // vd: 5.0 cm
  max_length_m: number;           // vd: 2.0 m
  allowed_defect_codes: string[]; // ['POTH_DEEP', 'EDGE_BRK', ...]
  effective_from: string;
  effective_to?: string;
}

// ── CREW WORK ORDER & TASK ────────────────────────────
export interface RepairWorkOrder {
  id: string;                     // WO-2026-084
  title: string;
  task_mode: TaskMode;            // INSPECT_AND_REPAIR hoặc MEASURE_ONLY
  assigned_crew_id: string;
  route_code: string;             // ĐH.05
  section_name: string;           // Phân đoạn Cầu Bà Lát (Km01+850)
  target_defect_id: string;
  defect_type_code: string;
  due_at: string;
  instructions: string;
  target_coordinates: [number, number]; // [lon, lat] WGS84 GeoJSON
  fast_track_eligible?: FastTrackEligibility;
  status: string;
  created_at: string;
}

export interface DefectPhysicalMeasurement {
  work_order_id: string;
  defect_id: string;
  length_m: number;
  width_m: number;
  depth_cm: number;
  area_m2: number;                // length * width
  measured_at: string;
  measured_by: string;
  instrument_name: string;        // Thước dây thép / Thước kẹp cơ
  notes?: string;
}

export interface RepairEvidence {
  id: string;
  work_order_id: string;
  defect_id: string;
  kind: 'BEFORE' | 'AFTER';
  file_uri: string;
  captured_at: string;
  gps_coordinates: [number, number]; // [lon, lat]
  is_reused_from_source?: 'REPORTER' | 'DRONE'; // BR-17
  synced: SyncStatus;
}

// ── DRONE SURVEY ──────────────────────────────────────
export interface DroneFlightRequest {
  id: string;                     // REQ-2026-042
  title: string;
  route_code: string;             // ĐH.05
  section_name: string;
  access_point_name: string;      // Điểm tiếp cận cất/hạ cánh
  access_point_coordinates: [number, number]; // [lon, lat] WGS84 dẫn đường
  target_resolution: string;      // 4K RGB + DSM (OpenDroneMap)
  assigned_pilot_id: string;
  status: string;
  created_at: string;
}

export interface FlightLog {
  id: string;
  request_id: string;
  pilot_id: string;
  drone_serial: string;
  departure_time: string;
  landing_time?: string;
  battery_cycles?: number;
  weather_conditions: string;
  status: SyncStatus;
}

// ── REPORTER ──────────────────────────────────────────
export interface ReporterReport {
  id: string;                     // REP-2026-0091
  tracking_code: string;          // TRK-882910
  reporter_email: string;
  reporter_phone?: string;
  route_hint?: string;
  description: string;
  photo_uris: string[];           // Tối đa 3 ảnh
  coordinates: [number, number];  // GPS WGS84
  status: ReporterReportStatus;
  submitted_at: string;
  rating?: number;                // 1–5 sao
  feedback_notes?: string;
}

export interface TrackingTimelineEvent {
  step: ReporterReportStatus;
  label: string;
  description: string;
  occurred_at?: string;
  completed: boolean;
}
```

---

## 4. Chuẩn Hóa Endpoint API (Từ operation_catalog.md) & Mã Lỗi Nghiệp Vụ

### Endpoints chính yếu phục vụ Mobile:
- **Xác thực:**
  - `POST /api/v1/auth/login` (Body: `{ email, password }` $\rightarrow$ 200 `TokenPair`)
  - `POST /api/v1/auth/refresh` (Body: `{ refreshToken }` $\rightarrow$ 200 `TokenPair`)
  - `POST /api/v1/auth/logout` (Header: `Idempotency-Key` $\rightarrow$ 204)
  - `POST /api/v1/auth/change-password` (Header: `Idempotency-Key` $\rightarrow$ 204)
  - `GET /api/v1/me` $\rightarrow$ 200 `Actor`
- **Người dân phản ánh:**
  - `POST /api/v1/auth/reporter-registrations` (Header: `Idempotency-Key` $\rightarrow$ 202 `RegistrationIntent`)
  - `POST /api/v1/auth/reporter-registrations/verify` (Header: `Idempotency-Key`, Body: `{ intentId, otp }` $\rightarrow$ 200 `TokenPair`)
  - `POST /api/v1/reports` (Header: `Idempotency-Key`, Body: `ReportCreate` $\rightarrow$ 201 `IncidentReport`)
  - `GET /api/v1/reports` (Header: Bearer $\rightarrow$ 200 `PublicReportPage`)
  - `GET /api/v1/reports/{reportId}` $\rightarrow$ 200 `PublicReport`
- **Đội sửa chữa (Crew):**
  - `GET /api/v1/me/inspection-tasks` $\rightarrow$ 200 `InspectionTaskPage`
  - `GET /api/v1/inspection-tasks/{taskId}` $\rightarrow$ 200 `InspectionTask`
  - `GET /api/v1/inspection-tasks/{taskId}/snapshot` $\rightarrow$ 200 `TaskSnapshot` (Gói snapshot ngoại tuyến)
  - `POST /api/v1/inspection-tasks/{taskId}/accept` (Header: `Idempotency-Key`, `If-Match` $\rightarrow$ 200)
  - `POST /api/v1/inspection-tasks/{taskId}/sessions` (Nộp số đo hiện trường)
  - `POST /api/v1/inspection-tasks/{taskId}/evaluations` (Đánh giá Fast Track)
  - `GET /api/v1/me/repair-items` $\rightarrow$ 200 `RepairItemPage`
  - `POST /api/v1/repair-attempts` (StartAttempt Fast Track hoặc Approval Track)
  - `POST /api/v1/repair-attempts/{attemptId}/submit` (Nộp ảnh AFTER nghiệm thu)
- **Phi công Drone:**
  - `GET /api/v1/me/survey-tasks` $\rightarrow$ 200 `SurveyTaskPage`
  - `GET /api/v1/survey-tasks/{taskId}` $\rightarrow$ 200 `SurveyTask` (chứa `access_point`)
  - `POST /api/v1/survey-tasks/{taskId}/accept` (Header: `Idempotency-Key`, `If-Match` $\rightarrow$ 200)
  - `PUT /api/v1/survey-tasks/{taskId}/access-point` (Cập nhật điểm tiếp cận cất/hạ cánh)
  - `POST /api/v1/survey-tasks/{taskId}/datasets` (Nộp bộ dữ liệu video 4K RGB + SRT)
- **Upload & Sync:**
  - `POST /api/v1/uploads` $\rightarrow$ 201 `UploadSession`
  - `POST /api/v1/uploads/{uploadId}/part-urls` $\rightarrow$ 200 `UploadPartUrls`
  - `POST /api/v1/uploads/{uploadId}/complete` $\rightarrow$ 202 `UploadSession`
  - `POST /api/v1/sync/batches` $\rightarrow$ 200 `SyncResult` (Body: `SyncBatch`)

### Bảng Mã Lỗi Nghiệp Vụ Chuẩn R3 (03_Error_Response_UI_Convention.md):
Khi nhận mã lỗi từ server hoặc kiểm tra cục bộ, UI phải hiển thị thông báo nghiệp vụ tương ứng:
- `TASK_MODE_NOT_REPAIRABLE`: "Nhiệm vụ này chỉ cho phép kiểm tra/đo; lưu kết quả đo và báo PM."
- `POLICY_NOT_CONFIGURED`: "Chưa cấu hình chính sách Fast Track; giữ nháp, liên hệ PM."
- `FAST_TRACK_NOT_ELIGIBLE`: "Không đủ điều kiện sửa nhanh; kích thước vượt ngưỡng policy."
- `PM_REPAIR_BLOCKED`: "PM đã khóa quyền tự sửa cho công việc này."
- `BEFORE_MISSING`: "Bổ sung bằng chứng ảnh hiện trạng TRƯỚC khi sửa."
- `EVIDENCE_PENDING`: "Ảnh chưa được máy chủ xác minh toàn vẹn."
- `FILE_INTEGRITY_FAILED`: "Tệp kiểm tra SHA-256 không khớp."
- `OFFLINE_SNAPSHOT_CONFLICT`: "Nhiệm vụ hoặc chính sách đã thay đổi trên server; giữ bằng chứng, chờ PM giải quyết."
- `IDEMPOTENCY_KEY_REUSED`: "Mã thao tác đã được sử dụng trước đó."
- `OPERATION_IN_PROGRESS`: "Đang đối chiếu thao tác trước đó, vui lòng chờ."

---

## 5. SQLite Schema (`src/offline/schema.sql`)

```sql
-- ═══════════════════════════════════════════════════════════════
-- SQLite Schema: RoadGuard FE_AppMobile — Offline-First Architecture
-- Theo: 29_9/09_Frontend/09_Offline_App_Sync_Spec.md
-- Full 10-store spec: đọc file trên; đây là 7 store cốt lõi cho scaffold
-- ═══════════════════════════════════════════════════════════════

-- [1] ACCOUNT PARTITION — Phân vùng theo account+env (invariant: không đọc chéo account)
CREATE TABLE IF NOT EXISTS account_partition (
  id              TEXT PRIMARY KEY,
  environment     TEXT NOT NULL,        -- 'dev' | 'staging' | 'production'
  api_origin      TEXT NOT NULL,        -- Base URL API đã cấu hình
  actor_id        TEXT NOT NULL,        -- UUID của actor đang đăng nhập
  schema_version  INTEGER NOT NULL      -- Để detect migration khi update app
);

-- [2] TASK PACK — Gói snapshot để tác nghiệp offline
CREATE TABLE IF NOT EXISTS task_pack (
  local_pack_id       TEXT PRIMARY KEY,
  server_task_id      TEXT NOT NULL,
  assignment_version  TEXT NOT NULL,    -- Opaque ETag từ server
  policy_snapshot     TEXT NOT NULL,    -- JSON FastTrackPolicyVersion
  evidence_refs       TEXT,             -- JSON array của file references
  destination_coords  TEXT,             -- JSON [lon, lat] WGS84
  downloaded_at       TEXT NOT NULL,
  is_ready            INTEGER NOT NULL DEFAULT 0  -- 1 = đủ files để offline
);

-- [3] MEDIA ASSET — File ảnh/video với provenance bất biến (immutable)
CREATE TABLE IF NOT EXISTS media_asset (
  local_media_id      TEXT PRIMARY KEY,
  relative_path       TEXT NOT NULL,    -- Path tương đối trong app sandbox
  sha256              TEXT NOT NULL,    -- Checksum bất biến sau khi ghi xong
  size_bytes          INTEGER NOT NULL,
  purpose             TEXT NOT NULL,    -- 'BEFORE' | 'AFTER' | 'DRONE_4K' | 'REPORTER'
  source              TEXT,             -- 'CAMERA' | 'GALLERY' | 'SD_CARD'
  captured_at         TEXT NOT NULL,   -- RFC3339 UTC
  task_id             TEXT,
  attempt_id          TEXT,
  is_reused_from      TEXT,            -- 'REPORTER' | 'DRONE' | NULL (BR-17)
  status              TEXT NOT NULL DEFAULT 'LOCAL_SAVING'
  -- Status lifecycle: LOCAL_SAVING → LOCAL_READY → UPLOADING → VERIFIED
);

-- [4] OUTBOX INTENT — Ý định chưa đủ ID để serialize thành WireCommand
CREATE TABLE IF NOT EXISTS outbox_intent (
  local_intent_id     TEXT PRIMARY KEY,
  actor_id            TEXT NOT NULL,
  kind                TEXT NOT NULL,    -- 'START_REPAIR' | 'SUBMIT_REPAIR' | 'SUBMIT_SURVEY' | 'REPORTER_REPORT'
  dependencies        TEXT,             -- JSON array local IDs chưa resolve
  base_snapshot_hash  TEXT,            -- Hash của snapshot dùng để tạo intent
  state               TEXT NOT NULL DEFAULT 'DRAFT',
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
  -- State: DRAFT → WAITING_DEPENDENCIES → READY → (→ WireCommand)
);

-- [5] WIRE COMMAND — Command đã serialize xong, sẵn sàng gửi (payload BẤT BIẾN sau lần gửi đầu)
CREATE TABLE IF NOT EXISTS wire_command (
  operation_id        TEXT PRIMARY KEY, -- UUID idempotency key — KHÔNG đổi sau khi gửi
  endpoint_kind       TEXT NOT NULL,    -- operationId từ operation_catalog.md
  serialized_payload  TEXT NOT NULL,    -- JSON base64 — BẤT BIẾN
  payload_hash        TEXT NOT NULL,    -- SHA256 để detect tampering
  serializer_version  TEXT NOT NULL,
  state               TEXT NOT NULL DEFAULT 'READY',
  attempt_count       INTEGER DEFAULT 0,
  max_attempts        INTEGER DEFAULT 5,
  last_error          TEXT,
  next_retry_at       TEXT,
  created_at          TEXT NOT NULL
  -- State: READY → IN_FLIGHT → ACKED | CONFLICT | REJECTED | UNKNOWN_OUTCOME | PAUSED_RETRY
  -- QUAN TRỌNG: UNKNOWN_OUTCOME phải giữ nguyên key — không regenerate để retry
);

-- [6] UPLOAD LEDGER — Theo dõi multipart upload từng part (Resume sau mất kết nối)
CREATE TABLE IF NOT EXISTS upload_ledger (
  local_media_id      TEXT NOT NULL,
  upload_session_id   TEXT,             -- ID từ POST /uploads
  part_number         INTEGER NOT NULL,
  part_size_bytes     INTEGER NOT NULL,
  part_etag           TEXT,             -- Ghi sau PUT part thành công
  state               TEXT NOT NULL DEFAULT 'PENDING',
  next_retry_at       TEXT,
  PRIMARY KEY (local_media_id, part_number)
  -- State: PENDING → UPLOADING → ACKED | FAILED
  -- Complete chỉ khi tất cả part ACKED — KHÔNG unblock business trước khi VERIFIED
);

-- [7] SERVER CACHE — Cache DTO từ server (đọc, không ghi local edits đè)
CREATE TABLE IF NOT EXISTS server_cache (
  resource_type   TEXT NOT NULL,       -- 'inspection_task' | 'survey_task' | 'fast_track_policy' | 'reporter_report'
  resource_id     TEXT NOT NULL,
  dto_json        TEXT NOT NULL,
  etag            TEXT,                -- Dùng cho If-Match mutation
  fetched_at      TEXT NOT NULL,
  scope_actor_id  TEXT NOT NULL,       -- Phân vùng theo actor để tránh lộ data
  PRIMARY KEY (resource_type, resource_id, scope_actor_id)
);

-- HƯỚNG DẪN: Xem full 10-store spec (thêm IdMap, ConflictRecord, SyncRun) tại:
-- D:\Do_AN_Drone\29_9\09_Frontend\09_Offline_App_Sync_Spec.md §2 (hoặc docs/specs/09_Frontend/09_Offline_App_Sync_Spec.md)
```

---

## 6. Quy tắc CRITICAL cho AI Scaffolding & Code

1. **Chỉ phục vụ 3 vai trò mobile:** `(crew)`, `(drone)`, `(reporter)`. Tuyệt đối không để màn hình PM hay Supervisor làm rác luồng routing mobile.
2. **Quy tắc Full Group Prefix:** Tất cả lệnh chuyển trang `router.push()`, `router.replace()` và mảng `tabs` của `BottomNav` **bắt buộc có tên group kèm ngoặc tròn**: `/(crew)/tasks`, `/(drone)/requests`, `/(reporter)/home`.
3. **AuthGuard an toàn ReactFabric:** Giữ `<Stack screenOptions={{ headerShown: false }} />` luôn mount ổn định; mọi điều hướng xác thực phải đặt trong `useEffect`. CẤM dùng conditionally `<Redirect />` bọc ngoài `<Stack />`.
4. **Fast Track Logic:**
   - Nếu `task_mode === 'MEASURE_ONLY'`, nút "Tiến hành sửa nhanh" bị vô hiệu hóa hoặc ẩn (BR-09).
   - Nếu `task_mode === 'INSPECT_AND_REPAIR'`, tính diện tích `length * width`. Nếu `area <= max_area && depth <= max_depth && length <= max_length` $\rightarrow$ Hiển thị chip `[Đạt Policy Sửa Nhanh]` và cho phép chụp ảnh AFTER để hoàn tất (BR-08, BR-25).
5. **UD-06 Zero Cost:** TUYỆT ĐỐI ZERO TIỀN TỆ / KINH PHÍ trên toàn bộ màn hình Mobile.
6. **Vật liệu & Tuyến đường:** Bê tông TCVN 10380:2014, Tuyến ĐH.05 Bình Chánh. CẤM LiDAR và nhựa đường asphalt.
7. **5 Mã Defect:** Dùng đúng 5 mã trong `src/constants/defect-types.ts`.

---

## 7. Environment Config (từ `29_9/09_Frontend/07_Environment_Base_URL_Config.md`)

### Expo env variables (`.env.development`, `.env.staging`, `.env.production`):
```env
EXPO_PUBLIC_API_BASE_URL=https://<staging-host>/api/v1   # KHÔNG dùng placeholder trong release
EXPO_PUBLIC_APP_ENV=development                           # 'development' | 'staging' | 'production'
EXPO_PUBLIC_CONTRACT_VERSION=FE-R3-v1                    # Hash lock với openapi.baseline.yaml
EXPO_PUBLIC_ENABLE_MOCKS=false                            # KHÔNG bật mock trong production
EXPO_PUBLIC_REALTIME_ENABLED=false                        # Polling MVP trước; socket chỉ khi contract approved
```

### Quy tắc bắt buộc:
- **Cấm `<production-host>` placeholder** trong production build (CI gate reject)
- **Namespace local store:** `environmentId + API_origin + actorId + localSchemaVersion`
- **Không sync queue staging sang production** khi đổi env — logout và tạo partition mới
- **Badge môi trường:** Hiển thị `[STAGING]` / `[DEV]` rõ ràng; production không có mock switch
- **Realtime/Socket:** Mặc định **Polling MVP**; TUYỆT ĐỐI không scaffold WebSocket trừ khi contract đã được duyệt (FE-GAP-11)
- **Token:** KHÔNG lưu `accessToken`/`refreshToken` trong `AsyncStorage` plain text — dùng `expo-secure-store` (Android Keystore)
