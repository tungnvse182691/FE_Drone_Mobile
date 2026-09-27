# RoadGuard FE_AppMobile — Kế Hoạch & Bộ Prompt Chuyển Đổi R3 (27/09/2026 / 27_9_V2)

> **Mục tiêu:** Cập nhật dự án `FE_AppMobile` theo đúng bộ tài liệu đặc tả chuẩn R3 V2 ban hành ngày 27/09/2026 (bổ sung bộ hợp đồng kỹ thuật chuyên sâu `09_Frontend`):
> 1. Thu gọn phạm vi Mobile App xuống đúng **3 vai trò hiện trường**: `REPAIR_CREW`, `DRONE_OPERATOR`, `REPORTER`.
> 2. Di chuyển các màn hình `PROJECT_MANAGER` và `SUPERVISOR` sang thư mục lưu trữ `archive/web-screens/` để phục vụ Web Dashboard riêng biệt.
> 3. Chuẩn hóa API theo danh mục 133 Operations (`operation_catalog.md`) và mã lỗi nghiệp vụ chuẩn (`03_Error_Response_UI_Convention.md`).
> 4. Cài đặt toàn diện nghiệp vụ **Fast Track (Sửa nhanh tại chỗ)**, **Chế độ công việc (`TaskMode`)**, **Tái sử dụng ảnh bằng chứng (BEFORE)**, và **Dẫn đường WGS84 Google Maps**.
> 5. Xây dựng hoàn chỉnh phân khu **Người dân & Ban QLDA (`REPORTER`)** với xác thực OTP Gmail, báo cáo kèm GPS + 3 ảnh, tra cứu tiến độ timeline và đánh giá 1–5 sao.
> 
> **Kỷ luật:** Mọi prompt dưới đây đều tự chứa đầy đủ ngữ cảnh, đường dẫn file, logic nghiệp vụ, quy tắc an toàn ReactFabric, và tiêu chí kiểm thử `npm run typecheck`. Người dùng chỉ cần copy lần lượt từng Prompt đưa vào OpenCode (Big Pickle) để thực thi tuần tự.

---

## Mục lục các Phase Prompt

1. [Prompt 1: Chuẩn hóa Domain Types, Enums, Error Codes & Routes R3](#prompt-1-chuẩn-hóa-domain-types-enums-error-codes--routes-r3)
2. [Prompt 2: Lưu trữ màn hình PM/Supervisor vào Archive & Làm sạch Root Layout](#prompt-2-lưu-trữ-màn-hình-pmsupervisor-vào-archive--làm-sạch-root-layout)
3. [Prompt 3: Xây dựng Phân khu Reporter (M-REP-01..04) & Xác thực OTP Gmail](#prompt-3-xây-dựng-phân-khu-reporter-m-rep-0104--xác-thực-otp-gmail)
4. [Prompt 4: Nâng cấp Đội sửa chữa (Crew) — Fast Track, Task Mode & Tái sử dụng ảnh](#prompt-4-nâng-cấp-đội-sửa-chữa-crew--fast-track-task-mode--tái-sử-dụng-ảnh)
5. [Prompt 5: Nâng cấp Phi công Drone — Dẫn đường Điểm tiếp cận (Access Point) & 4K RGB](#prompt-5-nâng-cấp-phi-công-drone--dẫn-đường-điểm-tiếp-cận-access-point--4k-rgb)
6. [Prompt 6: Cập nhật SQLite Offline Schema & Kiểm chứng Toàn vẹn Hệ thống](#prompt-6-cập-nhật-sqlite-offline-schema--kiểm-chứng-toàn-vẹn-hệ-thống)

---

## PROMPT 1: Chuẩn hóa Domain Types, Enums, Error Codes & Routes R3

```markdown
### NHIỆM VỤ: Cập nhật Enums, Domain Types, Mã lỗi và Routes cho chuẩn đặc tả R3 V2

Bạn đang làm việc trong repo `FE_AppMobile` (Expo Router + TypeScript) của Công ty TNHH Xây dựng Bê tông Hoàng Hải.
Theo đặc tả R3 V2 mới nhất từ Nhóm trưởng (trong `docs/specs/01_FRD_SRS.md`, `02_Business_Rules.md`, `01_Data_Dictionary.md` và `docs/specs/09_Frontend/`), hệ thống Mobile App phục vụ 3 vai trò hiện trường: REPAIR_CREW, DRONE_OPERATOR, REPORTER. Cần cập nhật type definitions, enums, bảng mã lỗi và routes trước tiên để làm nền tảng.

#### Các bước thực hiện:

1. **Sửa `src/types/enums.ts`:**
   - Thêm `REPORTER = 'REPORTER'` vào `RoleCode`.
   - Thêm enum `TaskMode`:
     ```ts
     export enum TaskMode {
       INSPECT_AND_REPAIR = 'INSPECT_AND_REPAIR', // Đo và sửa nhanh nếu đạt policy
       MEASURE_ONLY       = 'MEASURE_ONLY',       // Chỉ đo đợt gom, cấm tự ý sửa (BR-09)
     }
     ```
   - Thêm enum `FastTrackEligibility`:
     ```ts
     export enum FastTrackEligibility {
       ELIGIBLE        = 'ELIGIBLE',         // Đạt policy, được sửa ngay
       EXCEEDED_POLICY = 'EXCEEDED_POLICY',  // Vượt kích thước, chuyển PM lập phương án
       LOCKED_BY_PM    = 'LOCKED_BY_PM',     // PM khóa quyền tự sửa
     }
     ```
   - Thêm enum `LocalState` (theo 09_Frontend/09):
     ```ts
     export enum LocalState {
       DRAFT                = 'DRAFT',
       WAITING_DEPENDENCIES = 'WAITING_DEPENDENCIES',
       READY                = 'READY',
       IN_FLIGHT            = 'IN_FLIGHT',
       UNKNOWN_OUTCOME      = 'UNKNOWN_OUTCOME',
       AUTH_REQUIRED        = 'AUTH_REQUIRED',
       PAUSED_RETRY         = 'PAUSED_RETRY',
       CONFLICT             = 'CONFLICT',
       REJECTED             = 'REJECTED',
       BLOCKED_CONTRACT     = 'BLOCKED_CONTRACT',
       ACKED                = 'ACKED',
     }
     ```
   - Thêm enum `ReporterReportStatus`:
     ```ts
     export enum ReporterReportStatus {
       SUBMITTED  = 'SUBMITTED',   // Đã gửi
       RECEIVED   = 'RECEIVED',    // Đã tiếp nhận
       INSPECTING = 'INSPECTING',  // Đang khảo sát/đo đạc
       REPAIRING  = 'REPAIRING',   // Đang sửa chữa
       COMPLETED  = 'COMPLETED',   // Đã hoàn thành nghiệm thu
       REJECTED   = 'REJECTED',    // Không hợp lệ
     }
     ```
   - Bổ sung `MeasurementType.DIMENSIONS_3D = 'DIMENSIONS_3D'`.

2. **Cập nhật `src/types/domain.ts`:**
   - Cập nhật interface `User`: thêm `phone_or_email: string`, `is_reporter?: boolean`.
   - Thêm interface `FastTrackPolicyVersion`:
     ```ts
     export interface FastTrackPolicyVersion {
       id: string;
       version_code: string;           // FTP-2026-V1
       max_area_m2: number;            // 1.0 m2
       max_depth_cm: number;           // 5.0 cm
       max_length_m: number;           // 2.0 m
       allowed_defect_codes: string[]; // POTH_DEEP, EDGE_BRK, ...
       effective_from: string;
     }
     ```
   - Thêm/cập nhật `RepairWorkOrder`:
     ```ts
     export interface RepairWorkOrder {
       id: string;
       title: string;
       task_mode: TaskMode;
       assigned_crew_id: string;
       route_code: string;
       section_name: string;
       target_defect_id: string;
       defect_type_code: string;
       due_at: string;
       instructions: string;
       target_coordinates: [number, number]; // [lat, lng] WGS84
       fast_track_eligible?: FastTrackEligibility;
       status: string;
       created_at: string;
     }
     ```
   - Thêm interface cho Reporter:
     ```ts
     export interface ReporterReport {
       id: string;
       tracking_code: string;
       reporter_email: string;
       reporter_phone?: string;
       route_hint?: string;
       description: string;
       photo_uris: string[];
       coordinates: [number, number];
       status: ReporterReportStatus;
       submitted_at: string;
       rating?: number;
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
   - Thêm field `is_reused_from_source?: 'REPORTER' | 'DRONE'` vào `RepairEvidence` (BR-17).

3. **Tạo `src/constants/error-codes.ts` (Chuẩn hóa từ 09_Frontend/03):**
   ```ts
   export const BUSINESS_ERROR_MESSAGES: Record<string, string> = {
     TASK_MODE_NOT_REPAIRABLE: 'Nhiệm vụ này chỉ cho phép kiểm tra/đo; lưu kết quả đo và báo PM.',
     POLICY_NOT_CONFIGURED: 'Chưa cấu hình chính sách Fast Track; giữ nháp, liên hệ PM.',
     FAST_TRACK_NOT_ELIGIBLE: 'Không đủ điều kiện sửa nhanh; kích thước vượt ngưỡng policy.',
     PM_REPAIR_BLOCKED: 'PM đã khóa quyền tự sửa cho công việc này.',
     BEFORE_MISSING: 'Bổ sung bằng chứng ảnh hiện trạng TRƯỚC khi sửa.',
     EVIDENCE_PENDING: 'Ảnh chưa được máy chủ xác minh toàn vẹn.',
     FILE_INTEGRITY_FAILED: 'Tệp kiểm tra SHA-256 không khớp.',
     OFFLINE_SNAPSHOT_CONFLICT: 'Nhiệm vụ hoặc chính sách đã thay đổi trên server; giữ bằng chứng, chờ PM xử lý.',
     IDEMPOTENCY_KEY_REUSED: 'Mã thao tác đã được sử dụng trước đó.',
     OPERATION_IN_PROGRESS: 'Đang đối chiếu thao tác trước đó, vui lòng chờ.',
   };
   ```

4. **Cập nhật `src/constants/routes.ts`:**
   - Bổ sung các routes cho `(reporter)`:
     - `REPORTER_HOME: '/(reporter)/home'`
     - `REPORTER_REPORT: '/(reporter)/report'`
     - `REPORTER_TRACK: '/(reporter)/track'`
     - `REPORTER_FEEDBACK: '/(reporter)/feedback'`
     - `AUTH_OTP: '/(auth)/otp-verify'`
   - Bổ sung `ROLE_HOMES[RoleCode.REPORTER] = '/(reporter)/home'`.
   - Đảm bảo toàn bộ route đều có đầy đủ group prefix ngoặc tròn.

#### Kiểm chứng:
Chạy `npm run typecheck` (`tsc --noEmit`) đảm bảo 0 lỗi type.
```

---

## PROMPT 2: Lưu trữ màn hình PM/Supervisor vào Archive & Làm sạch Root Layout

```markdown
### NHIỆM VỤ: Lưu trữ màn hình PM/Supervisor sang Archive và làm sạch Router Mobile

Theo phân định kiến trúc R3: Quản lý dự án (PM) và Giám sát viên (Supervisor) làm việc trên Web Dashboard (React/Vite). Mobile App độc quyền phục vụ 3 vai trò: Crew, Drone, Reporter.
Chúng ta cần dọn dẹp thư mục `app/` để chỉ giữ các route mobile đang hoạt động, đồng thời di chuyển an toàn code cũ của PM & Supervisor sang `archive/web-screens/` để tái sử dụng cho Web Dashboard, tránh gây rác route hoặc crash màn đen.

#### Các bước thực hiện:

1. **Tạo thư mục lưu trữ `archive/web-screens/`:**
   - Tạo thư mục `archive/web-screens/pm` và `archive/web-screens/sup`.
   - Di chuyển các file từ `app/(pm)` vào `archive/web-screens/pm/`.
   - Di chuyển các file từ `app/(sup)` vào `archive/web-screens/sup/`.
   - Xóa bỏ folder `app/(pm)` và `app/(sup)` khỏi thư mục `app/` của Expo Router.

2. **Cập nhật `app/_layout.tsx` (RootLayout):**
   - Đảm bảo `<Stack screenOptions={{ headerShown: false }} />` luôn mount ổn định trên ReactFabric. Tuyệt đối KHÔNG conditionally return `<Redirect />` thay thế `<Stack />`.
   - Trong `useEffect` kiểm tra phiên đăng nhập:
     - Nếu chưa đăng nhập $\rightarrow$ `router.replace('/(auth)')`.
     - Nếu đã đăng nhập và `user.must_change_password` $\rightarrow$ `router.replace('/(auth)/force-change-password')`.
     - Nếu role là `REPAIR_CREW` $\rightarrow$ `router.replace('/(crew)/home')`.
     - Nếu role là `DRONE_OPERATOR` $\rightarrow$ `router.replace('/(drone)/home')`.
     - Nếu role là `REPORTER` $\rightarrow$ `router.replace('/(reporter)/home')`.
     - Nếu role là `PROJECT_MANAGER` hoặc `SUPERVISOR` $\rightarrow$ Thông báo Toast "Tài khoản quản lý vui lòng đăng nhập trên RoadGuard Web Dashboard", sau đó giữ ở màn thông báo hoặc chuyển về Auth.

3. **Cập nhật `app/index.tsx`:**
   - Giữ splash/loader hiển thị logo Hoàng Hải (`assets/logo_hoanghai.png`).
   - Kích hoạt điều hướng theo vai trò từ `useAuthStore`.

4. **Cập nhật `src/store/auth.ts`:**
   - Hỗ trợ lưu trữ trạng thái phiên đăng nhập của `REPORTER` (email, mã OTP, tracking history).

#### Kiểm chứng:
Chạy `npm run typecheck` xác nhận cấu trúc router mới biên dịch sạch sẽ không còn reference lỗi tới `(pm)` hay `(sup)`.
```

---

## PROMPT 3: Xây dựng Phân khu Reporter (M-REP-01..04) & Xác thực OTP Gmail

```markdown
### NHIỆM VỤ: Xây dựng phân khu Người dân phản ánh (REPORTER) và xác thực OTP Gmail

Theo Use Case US-21, US-27, 09_Frontend/02_Authentication_Flow.md và Operation Catalog:
- Đăng ký phản ánh: `POST /api/v1/auth/reporter-registrations` (Headers: `Idempotency-Key`)
- Xác thực OTP: `POST /api/v1/auth/reporter-registrations/verify` (Headers: `Idempotency-Key`, Body: `{ intentId, otp }`)
- Gửi phản ánh: `POST /api/v1/reports` (Headers: `Idempotency-Key`, Body: `ReportCreate`)
- Tra cứu danh sách & chi tiết: `GET /api/v1/reports`, `GET /api/v1/reports/{reportId}`

#### Các bước thực hiện:

1. **Tạo các UI Component hỗ trợ:**
   - `src/components/StarRating.tsx`: Nhận prop `rating: number`, `onRatingChange?: (star: number) => void`, `readonly?: boolean`. Hiển thị 5 ngôi sao màu vàng đồng `#C9A227` (dùng icon `Ionicons` hoặc `MaterialIcons`).
   - `src/components/TrackingTimeline.tsx`: Nhận mảng `events: TrackingTimelineEvent[]`. Hiển thị trục dọc 5 bước:
     1. Gửi phản ánh (SUBMITTED)
     2. Đã tiếp nhận (RECEIVED)
     3. Khảo sát/Đo đạc (INSPECTING)
     4. Đang sửa chữa (REPAIRING)
     5. Hoàn thành nghiệm thu (COMPLETED)
     Mỗi bước có badge trạng thái, thời gian và ghi chú ngắn.

2. **Tạo màn hình Xác thực OTP Gmail `app/(auth)/otp-verify.tsx` (M-AUTH-03):**
   - Tiêu đề: "Xác thực phản ánh dân sinh"
   - Giao diện nhập 6 số OTP riêng biệt (auto-focus sang ô kế tiếp khi nhập).
   - Nút "Xác nhận OTP" màu vàng đồng `#C9A227`.
   - Nút text "Gửi lại mã sau 60s".
   - Sau khi xác thực thành công $\rightarrow$ Lưu session Reporter và chuyển vào `/(reporter)/home`.

3. **Tạo `app/(reporter)/_layout.tsx`:**
   - BottomNav 3 tab cố định:
     1. `Trang chủ`: route `/(reporter)/home`, icon `home`
     2. `Gửi phản ánh`: route `/(reporter)/report`, icon `add-circle`
     3. `Tra cứu`: route `/(reporter)/track`, icon `search`
   - Active color: `#C9A227`. Chiều cao 64px.

4. **Tạo `app/(reporter)/home.tsx` (M-REP-01: Trang chủ Phản ánh):**
   - Header hiển thị logo Hoàng Hải icon (`assets/logo_hoanghai_icon.png`).
   - Banner chào: "Hệ thống tiếp nhận phản ánh hư hại đường bê tông ĐH.05 Bình Chánh".
   - 2 nút Card hành động nhanh:
     - "Gửi phản ánh khuyết tật mới" (icon camera/plus) $\rightarrow$ chuyển sang `/(reporter)/report`.
     - "Tra cứu tiến độ xử lý" (icon search/timeline) $\rightarrow$ chuyển sang `/(reporter)/track`.
   - Danh sách "Phản ánh gần đây của bạn" hiển thị card tóm tắt: mã tracking `#TRK-xxx`, ngày gửi, badge trạng thái hiện tại.

5. **Tạo `app/(reporter)/report.tsx` (M-REP-02: Tạo phản ánh hư hại):**
   - Card vị trí GPS: Lấy tự động từ `expo-location`, hiển thị tọa độ WGS84 + nút "Lấy lại vị trí".
   - Chọn tuyến đường: Mặc định Tuyến ĐH.05 (Bình Chánh), kèm gợi ý phân đoạn (Vĩnh Lộc B, Cầu Bà Lát, Tân Kiên).
   - Card chụp/tải ảnh: Tối đa 3 ảnh hiện trường (dùng `expo-image-picker` hoặc `CameraView`), có thumbnail preview + nút xóa từng ảnh.
   - Nhập mô tả hư hại: InputField multiline ghi rõ hiện trạng (ổ gà, vỡ mép, lún võng...).
   - Nhập Email nhận mã OTP / mã tracking: InputField email.
   - Nút CTA chính: "Gửi phản ánh" (màu `#C9A227`).
   - Xử lý submit: Lưu draft vào SQLite, gửi mock API $\rightarrow$ Sinh mã tracking `#TRK-882910` $\rightarrow$ Chuyển sang màn tra cứu.

6. **Tạo `app/(reporter)/track.tsx` (M-REP-03: Tra cứu tiến độ):**
   - Ô tìm kiếm mã tracking (nhập `#TRK-xxxxxx`).
   - Card kết quả: Tên khuyết tật, tuyến đường, ngày tiếp nhận, ảnh chụp lúc gửi.
   - Render component `TrackingTimeline`: thể hiện rõ tiến trình xử lý từ tiếp nhận đến sửa chữa.
   - Nếu trạng thái là `COMPLETED` $\rightarrow$ Hiển thị nút CTA "Đánh giá chất lượng sửa chữa" $\rightarrow$ mở `feedback.tsx`.

7. **Tạo `app/(reporter)/feedback.tsx` (M-REP-04: Đánh giá nghiệm thu):**
   - Hiển thị mã tracking và ảnh khuyết tật sau khi sửa (AFTER photo).
   - Component `StarRating` tương tác 1 đến 5 sao.
   - Ô nhập ý kiến đóng góp / nhận xét của người dân.
   - Nút CTA chính: "Gửi đánh giá" $\rightarrow$ Toast cảm ơn và quay về `/(reporter)/home`.

8. **Tạo Mock API `src/api/mock/reporter.ts`:**
   - Danh sách mock reports, hàm submit report, hàm tra cứu theo tracking code, hàm đánh giá sao.

#### Kiểm chứng:
Chạy `npm run typecheck` đảm bảo toàn bộ màn hình Reporter và components biên dịch 0 lỗi.
```

---

## PROMPT 4: Nâng cấp Đội sửa chữa (Crew) — Fast Track, Task Mode & Tái sử dụng ảnh

```markdown
### NHIỆM VỤ: Tích hợp nghiệp vụ Fast Track, Task Mode và Evidence Reuse cho Repair Crew

Theo BR-05, BR-08, BR-09, BR-11..18, BR-25, BR-38 và 09_Frontend Operation Catalog:
- Nhận danh sách việc: `GET /api/v1/me/inspection-tasks`
- Chi tiết việc: `GET /api/v1/inspection-tasks/{taskId}`
- Nộp số đo hiện trường: `POST /api/v1/inspection-tasks/{taskId}/sessions`
- Đánh giá Fast Track: `POST /api/v1/inspection-tasks/{taskId}/evaluations`
- Bắt đầu sửa: `POST /api/v1/repair-attempts` (StartAttempt)
- Nộp nghiệm thu: `POST /api/v1/repair-attempts/{attemptId}/submit`
- Tra cứu mã lỗi nghiệp vụ: `src/constants/error-codes.ts` (`TASK_MODE_NOT_REPAIRABLE`, `FAST_TRACK_NOT_ELIGIBLE`, `BEFORE_MISSING`, v.v.).

#### Các bước thực hiện:

1. **Cập nhật màn hình Danh sách công việc `app/(crew)/tasks.tsx`:**
   - Bộ lọc thêm tab hoặc filter theo `TaskMode`: "Tất cả", "⚡ Đo & Sửa nhanh", "📏 Chỉ đo đợt".
   - Mỗi thẻ công việc hiển thị rõ Chip TaskMode:
     - `INSPECT_AND_REPAIR`: Chip xanh lá `[⚡ Đo & Sửa nhanh]`
     - `MEASURE_ONLY`: Chip xám `[📏 Chỉ đo đợt]`
   - Hiển thị tuyến ĐH.05, phân đoạn, thời hạn hoàn thành (TUYỆT ĐỐI KHÔNG CÓ CHI PHÍ THEO UD-06).

2. **Cập nhật màn hình Chi tiết lệnh công tác `app/(crew)/wo-detail.tsx`:**
   - Hiển thị thông tin kỹ thuật: Loại khuyết tật (5 mã chuẩn), tuyến đường, mô tả.
   - Thêm nút "Dẫn đường Google Maps": Sử dụng `Linking.openURL('https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}')` với tọa độ WGS84 khuyết tật.
   - Phần Bằng chứng trước (BEFORE Evidence):
     - Hiển thị ảnh hiện có (nếu có từ Reporter hoặc Drone) kèm nhãn `[Ảnh tái sử dụng từ Phản ánh/Drone]`.
     - Cho phép Crew chọn "Dùng ảnh này làm BEFORE" (BR-17) HOẶC bấm nút chụp ảnh BEFORE mới nếu hiện trường có thay đổi (BR-18).
   - Phần Kích thước hình học & Kiểm tra Fast Track Policy:
     - 3 ô nhập: Chiều dài (m), Chiều rộng (m), Độ sâu (cm).
     - Tự động tính Diện tích: `Area = Length * Width` (m²).
     - Logic kiểm tra tức thời:
       - Nếu `task_mode === 'MEASURE_ONLY'`: Hiển thị thông báo `BUSINESS_ERROR_MESSAGES.TASK_MODE_NOT_REPAIRABLE` (`[Đợt gom: Chỉ ghi nhận số đo gửi PM, không tự ý sửa tại chỗ]`). Nút chuyển sang sửa chữa bị ẩn/khóa.
       - Nếu `task_mode === 'INSPECT_AND_REPAIR'`:
         - Nếu `area <= 1.0` và `depth <= 5.0` và `length <= 2.0`: Hiển thị Chip `[✅ Đạt Policy Sửa Nhanh - Được phép sửa ngay]`, kích hoạt nút CTA chính "Tiến hành sửa nhanh tại chỗ".
         - Nếu vượt ngưỡng: Hiển thị Chip `BUSINESS_ERROR_MESSAGES.FAST_TRACK_NOT_ELIGIBLE` (`[⚠️ Vượt Policy Sửa Nhanh - Gửi số đo về PM lập phương án]`). Nút sửa nhanh bị khóa, thay bằng nút "Gửi kết quả đo cho PM".

3. **Cập nhật màn hình Kính ngắm chụp ảnh `app/(crew)/viewfinder.tsx`:**
   - Phân biệt rõ chế độ chụp: `BEFORE` (Hiện trạng trước) và `AFTER` (Nghiệm thu sau khi sửa xong).
   - Tự động gắn Watermark: Tọa độ GPS WGS84, mã WO, loại lỗi, ngày giờ thực tế.

4. **Cập nhật màn hình Hoàn tất công việc `app/(crew)/complete.tsx`:**
   - Đối với Fast Track: Hiển thị cặp ảnh đối chứng BEFORE - AFTER, kích thước đo thực tế.
   - Hiển thị ghi chú: "Hồ sơ sửa nhanh sẽ được PM kiểm tra và đóng trực tiếp (không qua Supervisor theo BR-25)".
   - Nút CTA chính: "Nộp hồ sơ nghiệm thu Fast Track" $\rightarrow$ Lưu vào SQLite outbox $\rightarrow$ Đồng bộ server.

5. **Cập nhật màn hình Dẫn đường `app/(crew)/navigation.tsx`:**
   - Hiển thị bản đồ vị trí khuyết tật WGS84.
   - Nút nổi mở ứng dụng Google Maps chính thức của thiết bị.

#### Kiểm chứng:
Chạy `npm run typecheck` đảm bảo luồng Crew với Fast Track và TaskMode biên dịch sạch 0 lỗi.
```

---

## PROMPT 5: Nâng cấp Phi công Drone — Dẫn đường Điểm tiếp cận (Access Point) & 4K RGB

```markdown
### NHIỆM VỤ: Cập nhật luồng Phi công Drone theo chuẩn R3 (Access Point & 4K RGB)

Theo US-40, BR-38 và 09_Frontend Operation Catalog:
- Nhận danh sách yêu cầu bay: `GET /api/v1/me/survey-tasks`
- Chi tiết nhiệm vụ bay: `GET /api/v1/survey-tasks/{taskId}` (chứa `access_point`)
- Chấp nhận nhiệm vụ: `POST /api/v1/survey-tasks/{taskId}/accept` (Header: `Idempotency-Key`, `If-Match`)
- Cập nhật điểm tiếp cận: `PUT /api/v1/survey-tasks/{taskId}/access-point`
- Nộp bộ dữ liệu 4K RGB: `POST /api/v1/survey-tasks/{taskId}/datasets`
- Khởi tạo upload video/ảnh: `POST /api/v1/uploads`

#### Các bước thực hiện:

1. **Cập nhật `app/(drone)/request-detail.tsx`:**
   - Hiển thị thông tin điểm tập kết cất/hạ cánh: Tên điểm tiếp cận (ví dụ: `Bãi đất trống Km01+850 - Cầu Bà Lát`), mô tả địa hình.
   - Nút CTA "Dẫn đường đến Điểm tiếp cận": Mở Google Maps WGS84 với tọa độ `access_point_coordinates`.
   - Hiển thị thông số kỹ thuật bay: Độ cao bay (GSD), cảm biến 4K RGB, xử lý DSM OpenDroneMap. CẤM bất kỳ chữ "LiDAR" nào trên giao diện.

2. **Cập nhật `app/(drone)/upload.tsx`:**
   - Hỗ trợ chọn video 4K RGB + file phụ đề tọa độ SRT từ thẻ nhớ SD (dùng `expo-document-picker`).
   - Tự động tính dung lượng byte và SHA-256 checksum trước khi xếp vào hàng đợi outbox.
   - Hiển thị trạng thái upload: `LOCAL` $\rightarrow$ `QUEUED` $\rightarrow$ `UPLOADING` $\rightarrow$ `SERVER_CONFIRMED`.

3. **Cập nhật `app/(drone)/log.tsx`:**
   - Ghi nhận nhật ký chuyến bay: Mã Drone (tiền tố Hoàng Hải: `M350-HH-02`), giờ cất cánh, giờ hạ cánh, chu kỳ pin, điều kiện thời tiết gió/nắng.

#### Kiểm chứng:
Chạy `npm run typecheck` đảm bảo luồng Drone biên dịch 0 lỗi.
```

---

## PROMPT 6: Cập nhật SQLite Offline Schema & Kiểm chứng Toàn vẹn Hệ thống

```markdown
### NHIỆM VỤ: Cập nhật SQLite Offline Schema, Mock Fixtures và chạy kiểm thử toàn diện

Đảm bảo kiến trúc Offline-First hoạt động thông suốt theo `09_Frontend/09_Offline_App_Sync_Spec.md` cho cả 3 vai trò (Crew, Drone, Reporter), lưu trữ an toàn các bản nháp cục bộ, hàng đợi đồng bộ và chính sách Fast Track.

#### Các bước thực hiện:

1. **Cập nhật `src/offline/schema.sql`:**
   - Thêm kind `reporter_submission` vào bảng `local_draft`.
   - Bảng `task_cache`: hỗ trợ cache `policy` (FastTrackPolicyVersion) và `work_order`.
   - Bảng `media_file`: hỗ trợ lưu trữ ảnh phản ánh của Reporter và ảnh AFTER của Fast Track.

2. **Cập nhật `src/offline/database.ts` và `src/offline/upload-queue.ts`:**
   - Bổ sung helper hàm lưu/đọc `FastTrackPolicyVersion` từ cache SQLite.
   - Hỗ trợ state machine: `DRAFT` $\rightarrow$ `WAITING_DEPENDENCIES` $\rightarrow$ `READY` $\rightarrow$ `IN_FLIGHT` $\rightarrow$ `ACKED`.
   - Hỗ trợ enqueue cho payload loại `reporter_report` và `fast_track_completion`.

3. **Cập nhật Mock Fixtures trong `src/api/mock/`:**
   - `auth.ts`: Tài khoản test cho 3 vai trò:
     - Crew: `crew@hoanghai.vn` (Mã `HH-RC-084`, role `REPAIR_CREW`)
     - Drone: `pilot@hoanghai.vn` (Mã `HH-2089`, role `DRONE_OPERATOR`)
     - Reporter: `dan.nguyen@gmail.com` (role `REPORTER`)
   - `tasks.ts`: Cung cấp 2 work order mẫu:
     1. WO-01: `task_mode: 'INSPECT_AND_REPAIR'`, lỗi `POTH_DEEP`, kích thước nhỏ $\rightarrow$ Đủ điều kiện Fast Track.
     2. WO-02: `task_mode: 'MEASURE_ONLY'`, đợt gom 5 lỗi $\rightarrow$ Bắt buộc chỉ đo.
   - `defects.ts`: Cung cấp policy `FTP-2026-V1` (maxArea: 1.0, maxDepth: 5.0, maxLength: 2.0).

4. **Kiểm tra tuân thủ toàn diện (Checklist):**
   - [ ] Không có chữ "LiDAR" hay "nhựa đường asphalt" trong codebase.
   - [ ] Không có VNĐ, dự toán, kinh phí trên bất kỳ màn hình nào thuộc `app/` (UD-06).
   - [ ] Mọi lệnh navigation đều có full group prefix (`/(crew)/...`, `/(drone)/...`, `/(reporter)/...`).
   - [ ] Mọi mutation API đều có `Idempotency-Key`.
   - [ ] Chạy lệnh `npm run typecheck` (`tsc --noEmit`).

#### Tiêu chí hoàn thành:
Lệnh `npm run typecheck` báo 0 lỗi, toàn bộ dự án sẵn sàng chạy mượt mà trên Expo Go / Android Emulator.
```

---

## Bảng Đối Chiếu Quy Tắc Nghiệp Vụ R3 V2 Đã Nhúng Vào Kế Hoạch

| Mã BR / US | Nội dung nghiệp vụ cốt lõi | Operation ID (09_Frontend) | Phase thực hiện |
|---|---|---|---|
| **US-33, BR-08, BR-25** | Fast Track sửa nhanh: Task `INSPECT_AND_REPAIR`, đạt policy, PM đóng lỗi trực tiếp | `evaluateFastTrack`, `startRepairAttempt`, `submitRepairAttempt` | Phase 1, Phase 4 |
| **US-35, BR-09, BR-10** | Đợt gom nhiều lỗi: Bắt buộc `MEASURE_ONLY`, cấm tự ý sửa tại chỗ | `submitInspection` (TaskMode check) | Phase 1, Phase 4 |
| **BR-17, BR-18** | Tái sử dụng ảnh bằng chứng BEFORE từ Reporter hoặc Drone | `RepairEvidence.is_reused_from_source` | Phase 1, Phase 4 |
| **US-40, BR-38** | Dẫn đường Google Maps WGS84: Crew đến khuyết tật, Pilot đến Access Point | `setSurveyAccessPoint` | Phase 4, Phase 5 |
| **US-21, US-27** | Phân khu Reporter: Đăng nhập OTP Gmail 6 số, GPS + 3 ảnh, tra cứu tiến độ, đánh giá 1–5 sao | `registerReporter`, `verifyReporterOtp`, `createReport` | Phase 1, Phase 3 |
| **UD-06** | Zero Cost: Cấm toàn bộ thông tin tiền tệ, chi phí trên giao diện mobile | Zero currency rule | Toàn bộ các Phase |
| **09_Frontend/03** | Mã lỗi chuẩn: `TASK_MODE_NOT_REPAIRABLE`, `FAST_TRACK_NOT_ELIGIBLE`, v.v. | `BUSINESS_ERROR_MESSAGES` | Phase 1, Phase 4 |
