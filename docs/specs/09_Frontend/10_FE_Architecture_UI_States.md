# RoadGuard — 10. Kiến trúc FE và trạng thái màn hình

**Phiên bản:** FE-R3-v1 • **Ngày:** 27/09/2026 • **Trạng thái:** đặc tả đề xuất để FE/BE/QA review, chưa xác nhận triển khai.

## 1. Phân lớp đề xuất

| Lớp | Web candidate | Android candidate | Trách nhiệm |
|---|---|---|---|
| Presentation | React components/routes | Kotlin screens/ViewModel | Render state, validation UX, user intent |
| Application | Feature hooks/services | Use cases | Auth/sync/form orchestration, không trực tiếp raw HTTP trong component |
| Repository | Server cache + draft store | Room + remote repository | DTO validation, scoped cache, local transaction |
| Transport | HTTP client/auth coordinator | HTTP client/auth coordinator | Error normalization, timeout, header, retry policy |
| Background | Foreground scheduler; SW khi scope duyệt | Durable worker | Upload/sync với lease, không double-run |
| Contract | TS types + JSON Schema | DTO/codegen adapter tương ứng | Cùng wire field/enum, runtime invariants |

Không dùng TanStack Query cache như kho evidence offline. Không chia cùng singleton queue giữa hai môi trường. Store auth state, connection state, business state và sync state độc lập để tránh “offline” làm task thành “failed”. Repo hiện có sẽ quyết định folder/framework, không bắt di chuyển toàn repo.

## 2. Màn hình và acceptance hành vi

| Màn hình | Trạng thái / hành động | Dữ liệu phải giữ |
|---|---|---|
| Login | Form/loading/invalid/cooldown/relogin; không show account tồn tại | next-route nội bộ; không persist password |
| Task list | Skeleton/empty/error/cached stale/load more; filter đúng scope | Query key, scroll, asOf |
| Task detail | Server view + downloaded snapshot badge; mode/policy/reasons | Immutable base snapshot, không đổi theo optimistic cache |
| Prepare offline | Progress metadata/files/maps, thiếu mục nào nói rõ; retry từng mục | Part files/hashes, pack revision |
| Measurement form | Required field/unit/photos; autosave pending/saved/failed | Input raw + parsed + local row IDs |
| Start repair | BEFORE bắt buộc, mode/PM block/policy/evaluation gate | Provenance và snapshot quyết định |
| Submit repair | AFTER/notes/measurements; “Lưu chờ gửi” khi offline | Local attempt tách server attempt |
| Survey upload | File list/parts/progress/verify/job; pause metered | Local URI bền vững, checksum, scope |
| Sync Center | Counters theo state; retry/pause/login/inspect conflict | Queue refs và lastAttempt/lastSuccess |
| Conflict detail | Base/local/server; lý do; chỉ action đã có quyền/contract | Không có force-overwrite mặc định |
| Notifications | Polling, read/unread, resource access checked | Không show stale secret sau scope revoke |
| PM/Supervisor review | Online-only, correct branch/state; confirm intent | ETag và key; timeout hiển thị chưa xác nhận |

Nút bị disable kèm lý do gần nút, không chỉ màu xám. Loading không xóa nội dung đã tải. Skeleton chỉ dùng load ban đầu. Empty khác no-permission/offline-error. Offline badge hiện xuyên màn hình tác nghiệp; nhãn “Đã tải lúc…” luôn đọc được.

## 3. Form validation

Validate required/type/range/unit theo schema và rules đã chốt; server validate là authoritative. Submit capture revision hiện tại, khóa double-submit nhưng vẫn cho cancel view nếu draft durable. Nếu user tiếp tục chỉnh khi request cũ đang chạy, response cũ không overwrite draft revision mới; lưu server result riêng rồi so sánh.

File chooser phải show accepted MIME/max size khi config thực có; baseline chưa chốt limit thì không invent UI text cố định. GPS permission denied không crash; cho nhập manual nếu nghiệp vụ cho phép và source=MANUAL; không giả GPS chính xác. Camera denied có hướng dẫn quyền/capture alternate đã được chốt.

## 4. Optimistic UI

Cho phép optimistic dấu read notification nếu có rollback và version/key đúng. Không optimistic nghiệm thu/đóng, duyệt item, policy publish, role change, ownership, file VERIFIED hoặc sync ACK. Nộp repair offline thể hiện local intent, không đổi server status ACCEPTED. Badge pending hiển thị cùng nội dung đủ để người dùng phân biệt.

Version response mới từ chính command đã ACK cập nhật server cache; conflict không silently retry update bằng version mới. Danh sách cache đã có item pending phải giữ nhãn rõ khi server refetch chưa chứa nó; tránh append item local như server item gây duplicate.

## 5. Navigation và bảo vệ dữ liệu

Deep link xác thực rồi fetch scoped resource; không tin role trong URL. Nếu route không còn quyền, hiển thị404/không khả dụng theo convention, không hiện metadata cache trái scope. Unsaved form guard chỉ cho bản chưa durable; tránh chặn điều hướng mọi lúc vì queue pending đã an toàn.

Account switch: stop workers, cancel queries, close realtime, close UI DB handle, clear memory token/cache, mở partition mới. Local pending partition cũ vẫn khóa; banner tổng không lộ tên task cho user mới. BFF session changed nhiều tab không broadcast evidence/credential.

## 6. Map và tác nghiệp

MapLibre chỉ render; không quyết định đo mét, SRID transform hay coverage bằng cách nhìn hình. Adapter Point longitude/latitude và external directions lat,lng phải có test đảo tọa độ. Không gửi tọa độ UTM vào link GPS. Operator dùng destination được giao, không tự chọn midpoint. Offline không có tuyến đường dẫn thì hiển thị điểm/bản đồ đã tải với giới hạn, không khẳng định navigation hoạt động.

Ảnh Reporter public/internal projection tách; không dùng cùng component data loader tải Case nội bộ cho Reporter. Bbox AI không suy độ sâu hoặc severity cuối cùng. SRT thiếu dữ liệu hiển thị unknown. Fast Track giữ workflow Crew làm → PM kiểm/đóng → Supervisor nhận báo, không thêm approve screen trái nguồn.

## 7. Accessibility và vận hành

Label tiếng Việt, unit sát input; lỗi có text/icon, không chỉ màu. Focus trở lại field đầu lỗi; file upload/progress có aria/live region phù hợp web. Không toast từng chunk hoặc mỗi retry. Sync Center có nút sao mã hỗ trợ đã redact, không copy token/URL/media. Cảnh báo dữ liệu chưa sync trước logout/clear-cache/update phá schema, không khiến user bị kẹt không thể logout.

## 8. Definition of Done FE

Mỗi feature map operationId + FR + test; strict types, runtime validation, permission UI và BE guard integration, error fallback, loading/empty/stale/offline/conflict states. Không dùng mocked success để thay test thiết bị thực. Contract blockers được ghi trong tài liệu12 và feature gate; chỉ chạy field rollout khi auth/storage/upload/sync acceptance đã pass trên thiết bị mục tiêu.

## V2(3) amendment — 2026-09-28

This document follows `planning/V2/V2-3_DECISION_REGISTER.md`. D01-D28 are approved business decisions; `APPROVED_PILOT_CONFIG` and `APPROVED_TARGET` are not empirical verification. The document must distinguish `contractStatus`, `implementationStatus`, and `verificationStatus`. Reporter email/password plus one-time email OTP is the approved authentication flow; web cookie transport, pilot limits, retention and performance values remain configuration/target registers. Fast Track uses measurement-only intake followed by a separately authorized PM repair task; policy framework, reopen, partial publication, handover/conflict, BEFORE incident, curing and traffic release remain explicit contracts. Offline evaluation and AI two-stage processing are proposed until schema, fixtures and runtime/provider evidence pass.
