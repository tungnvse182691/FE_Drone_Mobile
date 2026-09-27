# RoadGuard — 8. Error Handling Convention

**Phiên bản:** TECH-R3-2026-09-26-v1 • **Trạng thái:** thiết kế đề xuất dựa trên bộ RoadGuard R3. Chưa có repository, ERD hiện hành, OpenAPI thực tế hoặc môi trường chạy để đối chiếu. Không khẳng định endpoint/code/transaction dưới đây đã được triển khai.

**Ưu tiên nguồn:** quyết định CHỐT/KẾ THỪA trong bộ tài liệu R3 giữ nguyên; chi tiết kỹ thuật mới cần P1/P2/FE/AI review. Q01–Q18 giữ mở theo Mô tả dự án §21. Không tự sửa enum số, chuyển DB, nâng framework hoặc đổi trạng thái Done từ các bản thiết kế này.

## 8.1 Một format cho API, worker và client

Mọi lỗi API trả `application/json` theo schema Error; status HTTP phản ánh loại lỗi. UI hiển thị `message`/field errors tiếng Việt, logic theo `code` ổn định. Không parse chuỗi message để quyết định retry. Worker lưu cùng domain code + trace nhưng chỉ projection an toàn được đưa ra client.

```json
{
  "code": "VALIDATION_FAILED",
  "message": "Chưa đủ dữ liệu để nộp phiên đo.",
  "details": [
    {"field": "measurements[0].evidenceFileIds", "code": "REQUIRED", "message": "Cần ảnh đo cho lỗi này."}
  ],
  "traceId": "01-trace-example",
  "retryable": false
}
```

Không dùng `details` chứa cả exception/request body. Mỗi detail có code/message và field optional; đường dẫn camelCase giống request. Nếu object ngoài scope, không đưa tên project/owner/file vào message. Production không stacktrace/SQL/provider URL/token/OTP/password/signed URL.

## 8.2 HTTP status và mã ổn định

| HTTP | Code nền | Khi dùng | Client |
|---|---|---|---|
| 400 | MALFORMED_REQUEST | JSON hỏng, parse không được | Sửa request; không retry tự động |
| 401 | TOKEN_MISSING / TOKEN_INVALID / TOKEN_EXPIRED / SESSION_REVOKED | Thiếu/hết hiệu lực token/session | Chỉ TOKEN_EXPIRED refresh một lần; code khác theo §8.7; giữ local |
| 403 | FORBIDDEN | Đã auth nhưng sai quyền hành động | Không retry; không lộ dữ liệu |
| 404 | NOT_FOUND | Không tồn tại hoặc object ngoài scope cần che existence | Không probe tiếp ID; UI về danh sách |
| 409 | STATE_CONFLICT / IDEMPOTENCY_KEY_REUSED / OPERATION_IN_PROGRESS | Sai transition, key khác payload, command còn chạy | Phân biệt theo code; chỉ retry same key cho in-progress khi được chỉ dẫn |
| 412 | VERSION_MISMATCH | If-Match stale | Tải version mới/so sánh; không overwrite tự động |
| 413 | PAYLOAD_TOO_LARGE | Vượt giới hạn byte/count configured | Thu nhỏ/chia upload; không mất local |
| 415 | UNSUPPORTED_MEDIA_TYPE | Loại nội dung không hỗ trợ | Chọn định dạng cho phép |
| 422 | VALIDATION_FAILED / BUSINESS_RULE_VIOLATION | Shape đúng JSON nhưng field/cross-field/rule sai | Nêu lỗi cụ thể, sửa dữ liệu/quyền nghiệp vụ |
| 428 | PRECONDITION_REQUIRED | Endpoint yêu cầu If-Match nhưng thiếu | GET version rồi gửi có điều kiện |
| 429 | RATE_LIMITED | Auth/OTP/API limit | Tôn trọng Retry-After + jitter |
| 500 | INTERNAL_ERROR | Lỗi ngoài dự kiến | Thông báo trung tính và trace; không tự đánh success |
| 503 | DEPENDENCY_UNAVAILABLE | Storage/AI/email cần thiết tạm không khả dụng trước nhận bền vững | Retry có backoff khi retryable; cùng key |

202 không là lỗi và không là hoàn tất; 204 không body. Queue job đã commit rồi provider lỗi phải thể hiện job FAILED/retrying qua status resource, không đổi response đã gửi trước đó thành503. Không trả200 `{success:false}` cho lỗi endpoint thông thường. `sync/batches` là ngoại lệ batch có outcome từng operation đã được đặc tả.

## 8.3 Catalog lỗi nghiệp vụ đề xuất

| Code | HTTP/Sync outcome | Rule/ý nghĩa | Phục hồi |
|---|---|---|---|
| TASK_MODE_NOT_REPAIRABLE | 422 / REJECTED | MEASURE_ONLY/INSPECT_ONLY không được sửa | Gửi đo; PM giao sửa riêng |
| POLICY_NOT_CONFIGURED | 422 / REJECTED | Thiếu policy/ngưỡng hoặc activation Q02/03 chưa chốt | PM/công ty hoàn thiện, không tự default |
| FAST_TRACK_NOT_ELIGIBLE | 422 / REJECTED | Đo không đạt hoặc chưa đủ bằng chứng | Báo PM; không tự tăng severity |
| PM_REPAIR_BLOCKED | 422 / REJECTED | PM đã kết luận nghiêm trọng/chặn | Crew chỉ đo/báo |
| OUTSIDE_ASSIGNED_SCOPE | 403 hoặc404 / REJECTED | Lỗi/task ngoài assignment | Ghi nhận riêng chuyển PM |
| BEFORE_MISSING | 422 / REJECTED | Chưa đủ BEFORE hợp lệ | Bổ sung trước sửa; nếu đã sửa dùng ngoại lệ Q06 |
| EVIDENCE_PENDING | 409 / REJECTED | File chưa server VERIFIED | Hoàn tất upload rồi retry same operation nếu chưa có effect; không đánh synced |
| FILE_INTEGRITY_FAILED | 422 / REJECTED | Hash/parts/content sai | Upload lại phần hỏng theo session; giữ bản gốc |
| MEASUREMENT_INCOMPLETE | 422 / REJECTED | Thiếu số đo/ảnh bắt buộc | Đo lại theo phạm vi Q05 đã chốt |
| ITEM_NOT_APPROVED | 409 / REJECTED | Giao APPROVAL_TRACK chưa approved | Hoàn thành duyệt từng item |
| CASE_HAS_OPEN_REQUIRED_ITEMS | 409 / REJECTED | Hỗn hợp chưa đủ nghiệm thu | Hoàn tất phần còn thiếu, không đóng tổng |
| PARTIAL_PUBLICATION_NOT_ENABLED | 422 | Q08 chưa chốt | Chỉ công bố toàn case đủ điều kiện nền |
| OFFLINE_SNAPSHOT_CONFLICT | 409 online / CONFLICT in sync200 | Assignment/policy/task version đã thay | Giữ snapshot/evidence; PM review Q04 |
| RETENTION_NOT_ELAPSED / LEGAL_HOLD_ACTIVE | 409 | Chưa đủ hạn hoặc hold | Không xóa; yêu cầu có căn cứ/giải quyết hold |
| CRS_UNRESOLVED / INVALID_GEOMETRY | 422 | Không đủ căn cứ tính mét hoặc shape lỗi | Chọn CRS/track/hình hợp lệ |
| TELEMETRY_INSUFFICIENT | 422 nếu command đòi đủ; UNKNOWN trong assessment đọc | Không đủ căn cứ position/coverage | Không báo no defects; bổ sung theo PM |
| RESULT_SCOPE_MISMATCH | 422 | Job/model/manifest/scope không khớp | Chặn publish; điều tra adapter |
| LATE_RESULT_ARCHIVED | Không phải HTTP lỗi; job state/review note | Kết quả attempt cũ được lưu không áp current | Không retry để ghi đè |
| POLICY_DECISION_PENDING | 422 | Endpoint conditional chưa enabled vì Q | Chốt quyết định và contract, không developer tự bật |

Mapping HTTP mang tính contract đề xuất; khi chốt một code phải dùng nhất quán toàn module. Một lỗi quyền không trả BUSINESS_RULE trước authorization vì có thể lộ state của object ngoài quyền.

## 8.4 Idempotency và retry policy

Thứ tự: authenticate → authorize current scope → validate envelope → resolve idempotency → check aggregate state/version → transaction. Với duplicate đã commit, trả lại reference/response đã có sau authorization hiện tại; không tái chạy state check khiến retry thành failure vì chính command đã đổi state. Key khác payload409 và không ghi side effect.

Client chỉ auto retry lỗi mạng/timeout/transient hoặc `retryable=true` với giới hạn/backoff có jitter đã cấu hình. Mutation phải giữ nguyên Idempotency-Key/payload khi chưa biết outcome. Không đổi key sau timeout để “gửi lại cho chắc”. Với412 người dùng/logic resolve conflict tạo một ý định mới trên version mới; key mới chỉ sau đã biết command cũ chưa áp hoặc đã đối chiếu kết quả. Không retry vô hạn401/403/422.

Idempotency entry trạng thái transient lỗi trước effect có thể cho resume an toàn; không cache mọi422 vĩnh viễn khiến file upload xong vẫn không gửi được. Contract phải phân biệt finalized outcome và rejected-before-effect, ghi rõ khi nào retry same operation được đánh giá lại. Sau business commit luôn immutable result/reference. Retention dedup cho offline operation phải đủ hoặc tombstone lâu dài để replay muộn không tạo trùng; TTL KEY-TBD trước freeze.

## 8.5 Sync, lỗi local và job

- Sync200 trả `results[]` đúng một outcome cho mỗi operation ID theo request order. APPLIED/DUPLICATE có resourceId/version; CONFLICT/REJECTED có Error. ACK local chỉ operation thành công; file chỉ dọn khi server verified và quy tắc CN09 đủ.
- Các operation phụ thuộc (start attempt → submit AFTER) thực hiện theo phase sau map server ID. Bản v1 không chấp nhận local temp ID như UUID resource server; giữ pending đến khi dependency APPLIED.
- Lỗi local `LOCAL_STORAGE_FULL`, `LOCAL_WRITE_FAILED`, `MEDIA_UNREADABLE` là client code riêng, không giả HTTP500. UI không ghi “Đã lưu” nếu durable write chưa thành công; không tự xóa evidence để giải phóng chỗ.
- Worker có attempt_count, next_retry_at, last_error_code, correlationId; retry exhausted vào hàng review/alert, không xóa job. DTO Job có error projection theo schema Error; chỉ hiển thị thông tin an toàn.
- Unknown result được giữ UNKNOWN/chưa xác định; không convert thành zero/success/no defect. Mock/real luôn có nhãn riêng.

## 8.6 Logging và kiểm thử

Log structured: timestamp UTC, traceId, operationId, actor pseudonymous ID, resource ID đã được authorize, code, HTTP status, latency, attempt count. Redact secrets trước logger/middleware; body logging mặc định tắt cho auth, OTP, upload URLs và payload có PII. Audit quyết định nghiệp vụ khác log kỹ thuật, chỉ đọc và có quyền; retention từng nhóm cần chốt.

Contract tests: JSON lỗi đúng schema; mọi operation401/403/404 không leak;412 không mutate;422 giữ nháp; cùng key khác payload409; timeout-after-commit không duplicate; sync partial không ACK tất cả; provider down sau202 chỉ đổi job; local disk full không báo saved; callback late không overwrite. Trace TC-N01–05/09/10, TC-F18/22/29, UAT-01/07/11.

## 8.7 Auth 401 codes — bổ sung REVIEW-01 ngày27/09/2026

Giữ envelope Error và field `code`; không thêm `subCode` hoặc đổi sang lowercase. Chỉ thêm mã cụ thể, cập nhật YAML0.1.1-draft-review1; đây là sửa contract đề xuất, chưa xác nhận middleware đã triển khai.

| Endpoint | Code | FE |
|---|---|---|
| Login | CREDENTIAL_INVALID | Hiện lỗi chung; không refresh/retry tự động. Không phân biệt email không tồn tại/tài khoản không khả dụng |
| Protected API | TOKEN_MISSING | Sửa auth state hoặc login; không refresh mù |
| Protected API | TOKEN_INVALID | Không refresh; token sai signature/issuer/audience không được gọi là expired |
| Protected API | TOKEN_EXPIRED | Một single-flight refresh, replay tối đa1 khi method/key/payload cho phép |
| Protected API/refresh | SESSION_REVOKED | Dừng phiên và sync, login lại; giữ queue/evidence |
| Refresh | REFRESH_TOKEN_INVALID / REFRESH_TOKEN_EXPIRED | Không gọi refresh lại bằng interceptor; login lại, giữ local |
| Legacy | AUTH_REQUIRED | Fallback login; không suy là token hết hạn để auto refresh |

`retryable:false` ở auth nghĩa không generic retry request cũ; TOKEN_EXPIRED có nhánh phục hồi auth riêng. Khi xác định session revoked thì không ưu tiên code expired chỉ vì JWT cũng hết hạn. Unknown401 không loop refresh. 403 không refresh. Thêm WWW-Authenticate cho bearer protected API; login/refresh không giả đang yêu cầu access bearer. Refresh timeout sau rotation vẫn unknown outcome; sub-codes không tự giải quyết vấn đề này.
