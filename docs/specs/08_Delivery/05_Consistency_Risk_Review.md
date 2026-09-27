# RoadGuard — Rà soát không đồng bộ và rủi ro REVIEW-01

**Ngày:** 27/09/2026. **Kết quả:** đã sửa các thiếu hụt tài liệu/tooling có đủ căn cứ; quyết định nghiệp vụ và provider/device tests vẫn mở. **Contract đề xuất:**0.1.1-draft-review1. Không xác nhận triển khai/release.

## 1. Kết luận từng phát hiện

| # | Phát hiện | Kết luận kiểm tra | Sửa trong gói | Còn mở |
|---|---|---|---|---|
| 1 | Auth401 thiếu sub-codes | Đúng. Trước đây Error401 chỉ AUTH_REQUIRED; login/refresh chưa khai401 | Giữ envelope/code; thêm CREDENTIAL_INVALID, TOKEN_MISSING, TOKEN_INVALID, TOKEN_EXPIRED, REFRESH_TOKEN_INVALID, REFRESH_TOKEN_EXPIRED, SESSION_REVOKED; endpoint-specific responses/examples; cập nhật Error/FE Auth/Retry | TTL, refresh timeout/reuse policy và implementation/provider tests; không coi FE-GAP-01 đóng toàn bộ |
| 2 | Sync thiếu evaluation kind | Đúng với Fast Track; chưa chính xác nếu coi Approval Track cũng cần evaluation | Soạn amendment và JSON Schema FAST_TRACK_EVALUATE riêng, PROPOSED/NOT_ENABLED; giữ active union3 kinds để không giả phê duyệt | Snapshot intake, task/assignment ID, version sequencing, Q02/Q03/Q04/Q17; phải cập nhật union/provider sau review |
| 3 | Hai YAML không có gate hash | Đúng. Trước chỉ so byte khi đóng gói, validator không enforce canonical | Thêm check_contracts.py + contract.lock.json; validate và codegen gọi gate; script CMD và hướng dẫn CI | Chưa có repo/CI thực để cài hook/branch protection; script PASS không nghĩa CI đang enforce |
| 4 | FR-16 trace BR-10 như CHỐT | Đúng về nhãn trace. BR-09/core chỉ-đo đã CHỐT, BR-10 là ĐỀ XUẤT | FRD tách confirmed core và conditional BR-10; RTM/UAT nêu rõ không phê duyệt lịch một tuần ngầm | PO quyết định phần BR-10; không chuyển toàn FR-16 thành chưa chốt |
| 5 | FR-22 phụ thuộc Q04/Q17 | Đúng; RTM đã nêu Q04/Q17 nhưng FRD/gate chưa đủ mạnh | Thêm BLOCKED/CONDITIONAL cho acceptance conflict/rescue E2E ở FRD, RTM, test nghiệp vụ/FE; agenda quyết định | Không nghiệm thu toàn FR-22 hoặc freeze offline E2E trước quyết định và tests; core durability có thể kiểm riêng |

## 2. Ưu tiên sau rà soát

| Ưu tiên | Việc cần làm | Trạng thái |
|---|---|---|
| Đỏ — trước freeze offline | Chốt Q04/Q17 và intake/conflict/rescue contract, actor/audit/AC | OPEN, agenda đã chuẩn bị |
| Đỏ — trước activate/evaluate policy production | Chốt Q02 quyền publish/activate và Q03 nội dung/ngưỡng/hạn mức/precision/exclusions | OPEN; Q03 không chỉ là quyền activate |
| Vàng — trước tích hợp/release | Implement auth code mapping, single-flight refresh và provider/consumer tests | Draft sửa xong; code/server chưa được kiểm |
| Vàng — trước nghiệm thu sync liên quan | Review evaluation amendment + Approval task/assignment mapping; update union sau khi đủ semantics | PROPOSED_NOT_ENABLED |
| Vàng — trước merge contract | Đưa hash gate vào CI repo, enforce nonzero failure + review lock | Tooling/test đã có; CI repo chưa cài |
| Theo chức năng release | Retention matrix, evidence cleanup, legal hold, dedup retention | Phần ảnh hưởng xóa dữ liệu/retry không nên để toàn bộ backlog xanh |
| Backlog scope | FR RouteCapture track drone Sprint2; trace/FR US-10 | GAP-02 và GAP-01/CR-017 đã có; không tự tạo số FR mới/chuyển Sprint |

## 3. Tệp chính đã thay đổi

- FRD/SRS: FR-15/16/18/22 readiness và conditional scope.
- Error Handling + cả hai YAML: auth401 catalog/responses/examples và version.
- RTM + test nghiệp vụ/FE: acceptance gates rõ theo từng luồng.
- FE Authentication/Error/Retry/Offline/Gaps và README: đồng bộ cách xử lý và giới hạn.
- Generated types/schema/catalog: sinh lại từ snapshot có lock mới; giữ153 schemas và133 operations.
- Mới: sync evaluation amendment/schema, workshop decision template, hash checker/lock và CI wrapper/self-tests.
- CR-REV-01–04 trong Change Request Log ghi sửa technical draft, tooling, nhãn readiness và proposal; không giả chữ ký/ngày phê duyệt.

## 4. Kiểm tra đã chạy

| Kiểm tra | Kết quả |
|---|---|
| Canonical/snapshot/lock đồng bộ | PASS |
| Chỉ sửa snapshot | Checker fail đúng; codegen bị chặn trước sinh types |
| Chỉ sửa canonical | Checker fail đúng; codegen bị chặn |
| Sửa cả hai YAML nhưng lock cũ | Checker fail đúng; codegen bị chặn |
| Thiếu snapshot | Checker fail đúng; codegen bị chặn |
| Auth401 response refs/examples + refresh allowlist | PASS; chỉ TOKEN_EXPIRED dùng SINGLE_FLIGHT_REFRESH_ONCE |
| Evaluation kind chưa được duyệt | PASS; main SyncOperation vẫn3 kinds, proposal riêng |
| Structural validation package | PASS sau cập nhật; chi tiết lệnh tại ci/README.md |

Các test tooling/metadata trên không kiểm server thực thi đúng401, local database, transaction, device sync hoặc UAT. 58 FE test cases/8 FE UAT và bộ test nghiệp vụ vẫn chưa có kết quả execution thực tế. Windows CMD wrapper chưa chạy trên Windows trong môi trường này; Python gate được chạy thực tế.

Hash contract mới: `dbde8b756bbc1bf83dabfbfe395eb11e53b378e7338815b1f3ca019aa7f3f806`. Báo cáo sắp xếp REVIEW trước và manifest.original là lịch sử; báo cáo này cùng manifest hiện tại mô tả bản đã rà soát.

## 5. Tài liệu review tiếp theo

- [Sync evaluation amendment](../05_Technical/06_Sync_Evaluation_Amendment_Proposal.md)
- [Workshop Q02/Q03/Q04/Q17](../07_Change_Management/03_Offline_Policy_Decision_Workshop.md)
- [CI gate](../ci/README.md)

Owner trong workshop là vai trò đề xuất, chưa phải người đã nhận việc. Chưa có câu trả lời Q nên không đánh dấu approved, không mở nghiệm thu end-to-end dựa trên giả định.
