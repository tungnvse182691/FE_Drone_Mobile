# RoadGuard — Đề xuất bổ sung sync evaluation (REVIEW-01)

**Ngày:** 27/09/2026. **Trạng thái:** PROPOSED / NOT_ENABLED. Không phải quyết định Q02/Q03/Q04/Q17 hoặc xác nhận BE đã hỗ trợ.

## 1. Kết luận kiểm tra

Union SyncOperation hiện chỉ có INSPECTION_SUBMIT, REPAIR_START, REPAIR_SUBMIT. Fast Track có thể gọi endpoint evaluateFastTrack online sau khi sync InspectionSession nhưng chưa có command evaluation trong batch. Thêm tên kind một mình không đủ cho offline end-to-end: còn thiếu liên kết snapshot/assignment, semantics phiên bản, provenance, tiếp nhận thực tế đã thi công và cách xử lý khi quyền đổi.

APPROVAL_TRACK không cần evaluation Fast Track. Rủi ro của nhánh này là top-level taskId trong SyncStart chưa rõ inspection task hay repair assignment, chưa có repair snapshot đầy đủ và quy trình đổi đội offline. Không sửa bằng cách yêu cầu Approval Track chạy evaluation.

## 2. Command đề xuất để BE/FE review

Tên kind: **FAST_TRACK_EVALUATE**. Chỉ Crew đúng assignment, sau khi INSPECTION_SUBMIT đã APPLIED/DUPLICATE, file đo đã VERIFIED và sessionId đã được map sang UUID server. Không chấp nhận local temp ID như sessionId.

| Field | Kiểu / bắt buộc | Ý nghĩa |
|---|---|---|
| operationId | UUID / có | Khóa dedup command ổn định |
| kind | const FAST_TRACK_EVALUATE / có | Discriminator mới, chưa nằm trong union active |
| taskId | UUID / có | Inspection task, không repairItem/assignment ID |
| expectedVersion | string opaque / có | Version aggregate evaluation sẽ kiểm; BE phải định nghĩa rõ nguồn sau command đo |
| snapshotId | UUID / có | Snapshot server đã tải, BE tra bản bất biến |
| assignmentVersion | string opaque / có | Phiên bản assignment đã dùng tại hiện trường |
| capturedAt | date-time / có | Client time, không là chứng minh quyền tuyệt đối |
| payload.sessionId | UUID / có | Session đã được server tiếp nhận |
| payload.policyVersionId | UUID / có | Policy tham chiếu cùng snapshot |

Schema máy đọc tại `09_Frontend/contracts/sync-evaluation.proposed.schema.json`. Schema chỉ mô tả ứng viên payload, không tự thêm endpoint/kind đã enabled. Không gửi command mới vào baseline hiện hành.

## 3. Semantics cần ghi trong amendment OpenAPI sau review

- Kiểm actor/session hiện hành → scope → dedup operation → task/snapshot/assignment/session/policy binding → evaluate theo engine/version đã chốt → transaction Evaluation + audit/outbox + dedup result.
- APPLIED/DUPLICATE: resourceId=Evaluation.id, version=Evaluation.version, error=null. Evaluation result vẫn có thể NOT_ELIGIBLE/INSUFFICIENT_DATA: command đã được xử lý thành công không có nghĩa đủ quyền sửa.
- CONFLICT: snapshot/assignment/state khác, giữ bằng chứng và đi quy trình Q04. REJECTED: payload không hợp lệ/sai binding/quyền theo policy. Auth envelope invalid có thể401/403 trước outcome; không dùng snapshot bypass.
- Chỉ kết quả ELIGIBLE cùng task mode/PM block/assignment hợp lệ mới cho materialize REPAIR_START; policy/evaluation không thay authorization.
- Tác nghiệp đã xảy ra offline không được hợp thức hóa bằng evaluation mới trên policy hiện tại. Intake evidence thực tế + review resolution là contract riêng cần Q04/Q17; giữ local khi bị từ chối quyền.
- Freeze batch envelope và operation bytes trước gửi. Evaluation phụ thuộc session phải ở phase sau khi nhận UUID; start phụ thuộc Evaluation phải ở phase tiếp theo. Không pretend có forward local references trong batch v1.
- Q03 phải chốt precision/AND-OR/exclusions và bộ test vector giống nhau giữa local evaluator/BE. Không xét string exclusions tự do như rule đã máy hóa.

## 4. Gate để đưa kind vào contract trung tâm

BE/BA chốt scope/ID/version semantics và snapshot intake; PO chốt Q02/Q03 và nhánh Q04/Q17 liên quan; thêm schema vào components và discriminator/oneOf, cập nhật role/error/outcome catalog; cập nhật hai YAML + lock trong cùng review; regenerate; chạy provider tests và UAT thiết bị. Đến lúc đó mới bỏ NOT_ENABLED. Review này không tự thực hiện bước phê duyệt.

Test bắt buộc: evaluation retry sau commit trả cùng resource; session của task khác bị từ chối; duplicate sau revoke không vượt quyền; không ELIGIBLE với policy thiếu; conflict giữ bằng chứng; Approval Track không bị ép evaluation; start chưa có server evaluationId vẫn WAITING_DEPENDENCIES.
