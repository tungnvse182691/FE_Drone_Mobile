# RoadGuard — 04. Data Contract / Type Definition

**Phiên bản:** FE-R3-v1 • **Ngày:** 27/09/2026 • **Trạng thái:** đặc tả đề xuất để FE/BE/QA review, chưa xác nhận triển khai.

## 1. Deliverables máy đọc

| Tệp | Vai trò |
|---|---|
| `contracts/openapi.baseline.yaml` | Snapshot OpenAPI alignment: 133 operations, 154 schemas; runtime `NOT_ENABLED` |
| `contracts/api.schemas.json` | JSON Schema 2020-12 bundle từ toàn bộ 154 schemas, `$defs`; `$ref` nội bộ đã đổi đường dẫn |
| `contracts/api.types.ts` | Structural TypeScript types từ schema, không phải HTTP SDK hoặc runtime validator |
| `contracts/local.types.ts` | Local queue/media/partition types đề xuất; không gửi nguyên object này vào API |
| `contracts/realtime.proposed.schema.json` | Event hint đề xuất, chưa có server transport |
| `fixtures/api.examples.json` | Payload minh họa login response/error/page/sync với UUID giả hợp lệ; không secret thật |

Baseline R3 vẫn là thiết kế đề xuất, chưa phải contract đang chạy. JSON Schema giữ required, enum, min/max, additionalProperties, oneOf/not; TypeScript không kiểm được mọi constraint nên bắt buộc runtime validation ở network boundary. TS format UUID/date-time là string, integer là number; không coi compile success là validate số nguyên/UUID.

Để validate một DTO: tạo root schema có `$ref: "#/$defs/TokenPair"` và `$defs` từ bundle, hoặc dùng registry schema theo tool đã pin. Không validate payload trực tiếp với root bundle chỉ chứa `$defs`, vì root đó không chọn DTO. Enable format assertion cho date-time/email/uuid nếu validator mặc định chỉ annotation. Ref resolver không fetch schema từ internet khi nhận response.

## 2. Quy ước dữ liệu xuyên FE/BE

| Nội dung | Quy tắc |
|---|---|
| JSON | camelCase; không tự map snake_case nếu API chưa yêu cầu |
| UUID | String opaque; không numeric ID, không dùng array index làm ID |
| Concurrency version | Opaque string, không cộng 1/so lớn bé; dùng ETag nguyên giá trị có quotes cho If-Match |
| Optional | Field không có nghĩa khác `null`; không tự null hóa tất cả optional |
| Timestamp | RFC3339 có timezone, serialize UTC; hiển thị Asia/Ho_Chi_Minh theo sản phẩm, UTC cho log |
| Ngày đơn | Không tự biến ngày-only thành midnight UTC làm lệch ngày; dùng schema từng field |
| Number | Không NaN/Infinity; JSON numeric parse theo form; phân biệt dấu phẩy thập phân và phân tách hàng nghìn theo locale |
| Đơn vị | measurement.value + unit; chuyển m/mm qua adapter rõ, không đoán đơn vị từ kích cỡ số |
| Tọa độ | Point {longitude,latitude}; GeoJSON array [lon,lat]; UI map adapter riêng; GPS thiếu là null/absent theo schema, không (0,0) |
| Enums | Giữ nguyên chữ hoa; UI label dịch riêng; unknown enum chặn mutation liên quan và báo contract drift |
| Status string chưa enum | Hiển thị fallback “Trạng thái chưa hỗ trợ”; không bịa enum từ DB hoặc suy ACCEPTED |
| File | UUID server khác localMediaId, uploadId và URL; signed URL không phải ID bền vững |
| 202/204 | 202 là đã nhận, theo job; 204 không body |

Task status/repair status/acceptance status/local sync status là các miền khác nhau. Data Dictionary có trạng thái lưu DB khác enum API (ví dụ RepairAttempt) nên cần BE adapter rõ; không dùng một enum chung cho cả database và UI.

## 3. Các type quan trọng

TokenPair có accessToken/refreshToken/tokenType/expiresIn/mustChangePassword/user. Actor có id/displayName/role/version; **không có membership/capabilities**. UI không suy quyền từng project từ Actor.role.

Page<T> chứa items/nextCursor/asOf; không có total/page/hasNextPage trong baseline. hasMore cục bộ = nextCursor !== null. SyncOutcome required cả resourceId/version/error nhưng nullable; logic bổ sung: APPLIED/DUPLICATE cần resourceId/version hợp lệ và error=null, CONFLICT/REJECTED cần Error. Schema gốc chưa ép nhánh tương quan này, consumer phải kiểm trước ACK.

StartAttempt phân hai nhánh loại trừ: APPROVAL_TRACK có repairItemId, không originTaskId; FAST_TRACK có originTaskId/evaluationId/capturedTaskVersion/policyVersionId, không repairItemId. Không gửi cả hai để BE tự chọn. TS structural declaration không thay oneOf/not validation.

Local Draft dùng ID client; adapter chỉ tạo SyncOperation khi đã map toàn bộ server UUID và file VERIFIED. Không dùng type assertion `as SyncOperation` để bỏ qua unresolved references. Null không được thay bằng chuỗi rỗng.

## 4. Server state, UI state và DTO

Network DTO immutable tại adapter. View model có label/format/localBadge nhưng không ghi ngược label tiếng Việt vào API enum. Form draft lưu raw input và parsed value riêng; không làm mất chuỗi người dùng khi validation fail. Server cache partition theo environment/actor/scope; query key chứa tất cả filter/sort. Local entity overlay hiển thị pending nhưng không sửa snapshot server được dùng làm base conflict.

Success response có version/ETag: lưu cùng một lần; nếu header và body không khớp contract, dừng mutation tiếp và báo drift. Không lấy ETag của parent áp vào child. 412 cần refresh đúng aggregate. Timestamp capturedAt của máy không đủ để chứng minh thứ tự thi công; lưu clock offset/receivedAt khi biết, không sửa ảnh gốc.

## 5. Runtime validation và compatibility

Input validate trước lưu và trước serialization; response validate trước ghi cache. Lỗi schema → giữ raw response đã redact cho diagnostics giới hạn, không ACK queue. Unknown enum mới được fallback read-only nhưng không được submit ngược nếu chưa hiểu. Unknown fields với additionalProperties:false là breaking theo contract hiện hành: CI báo lệch, không silently strip và coi đúng.

BE/FE dùng cùng hash OpenAPI trong release manifest. Thay required field, enum, nullable, URL, code hoặc semantics phải review breaking change. Deploy BE hỗ trợ client còn hoạt động/offline; giữ migrator local queue và dedup cho client cũ. Không auto đổi schema command đã gửi nhưng chưa biết outcome; giữ serializer version và hash cũ để replay.

## 6. Generation và kiểm tra

Types/schema trong gói được sinh bằng script kèm `contracts/build_contracts.py` từ baseline, không phải codegen SDK tiêu chuẩn. Script dừng khi gặp JSON Schema construct chưa hỗ trợ TS; constraint runtime được giữ trong JSON. Chạy script từ thư mục contracts bằng Python có PyYAML. Chọn generator production sau khi đối chiếu repository; pin version, không tải `latest` trong CI. Typecheck với TypeScript của repo và validator 2020-12 là gate tích hợp, không tự coi đã pass chỉ vì file được sinh.

## V2(3) amendment — 2026-09-28

This document follows `planning/V2/V2-3_DECISION_REGISTER.md`. D01-D28 are approved business decisions; `APPROVED_PILOT_CONFIG` and `APPROVED_TARGET` are not empirical verification. The document must distinguish `contractStatus`, `implementationStatus`, and `verificationStatus`. Reporter email/password plus one-time email OTP is the approved authentication flow; web cookie transport, pilot limits, retention and performance values remain configuration/target registers. Fast Track uses measurement-only intake followed by a separately authorized PM repair task; policy framework, reopen, partial publication, handover/conflict, BEFORE incident, curing and traffic release remain explicit contracts. Offline evaluation and AI two-stage processing are proposed until schema, fixtures and runtime/provider evidence pass.
