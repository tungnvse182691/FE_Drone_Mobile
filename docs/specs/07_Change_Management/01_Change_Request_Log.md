# RoadGuard — 16. Change Request Log

**Phiên bản:** EXT-R3-2026-09-26-v1 • **Ngày:** 26/09/2026 • **Trạng thái:** bản đặc tả bổ sung để review, chưa xác nhận triển khai hoặc nghiệm thu.

**Nguồn chuẩn:** 9 tệp người dùng cung cấp ngày 26/09/2026; xem bảng nguồn trong README. Quyết định CHỐT/KẾ THỪA trong nguồn giữ nguyên. Các chi tiết mới dưới nhãn **ĐỀ XUẤT** phải được PO/chủ dự án duyệt trước khi thành baseline. Q01–Q18 vẫn theo Mô tả dự án §21; không tự giải quyết bằng tài liệu này. Mã trường ở đây là mapping logic, không xác nhận schema/endpoint đã tồn tại.

## 16.1 Mục đích và ranh giới

Sổ này quản lý thay đổi yêu cầu và impact; bổ sung cho RoadGuard_UseCase_Change_Log(1).md, không xóa lịch sử UC-D01–30/DD-C01–20. “Đã cập nhật tài liệu nguồn” không đồng nghĩa “đã triển khai/đã nghiệm thu”. Ngày thay đổi lịch sử dùng ngày bản tài liệu nguồn 26/09/2026, không giả ngày họp/phê duyệt riêng chưa có.

Hai loại mục: **HIST** = ghi nhận thay đổi đã thể hiện trong nguồn; **NEW** = đề xuất hoặc yêu cầu tài liệu mới lần này. Mỗi CR có requester, reason, before/after, scope/owner, tác động lịch và trạng thái. Người yêu cầu lịch sử ghi “theo log nguồn”, không tự gán tên hay chữ ký.

## 16.2 Workflow đề xuất

Draft → Submitted → Impact assessed → Approved/Rejected/Deferred → Implemented → Verified → Closed. Tách `document_status`, `implementation_status`, `verification_status`; CR đã approved nhưng chưa có code vẫn chưa Implemented. PO/chủ dự án quyết định scope/ưu tiên/lịch; PM/BA phân tích nghiệp vụ; P1/P2/FE/AI/Ops ước lượng; QA phân tích regression. Thẩm quyền change control này là đề xuất quản trị dự án, không thay quyền Supervisor/PM trong app.

Ước lượng lịch chỉ làm sau rà repository và nguồn lực: effort thấp/vừa/cao là sơ bộ tương đối, **không chuyển thành số ngày hoặc ngày release**. Chưa có kế hoạch baseline/velocity nên tác động lịch tất cả ghi TBD; không tự dịch Sprint.

## 16.3 Sổ thay đổi

| CR | Loại | Nguồn | Trước | Sau/yêu cầu | Lý do | Scope/trace | Owner/effort sơ bộ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CR-001 | HIST | UC-D19 | Report/notification/lỗi dễ bị đồng nhất | Giữ nguồn report, case liên kết, không gộp tự động GPS | Tránh mất nguồn, sửa trùng, lộ ownership | FR-11/12/25/34; PA01–03; Data Dictionary §9.3 | P1/P2/FE; vừa |
| CR-002 | HIST | UC-D20 | Severity lẫn urgency, gợi ý tự đổi ưu tiên | Hai trục; PM quyết định và giữ thứ tự | Đúng quyền điều phối | FR-14; US-34; SC14 | P1/P2/FE; vừa |
| CR-003 | SUPERSEDED_BY_D02 | UC-D21 | Lỗi nhỏ trong đợt gom có thể sửa ngay | Batch chỉ đo; PM giao task sửa riêng sau đo, có thể Fast Track nếu đủ policy; không hồi tố mode | Tối ưu chuyến đo không cấp thêm quyền | FR-16/17/20; US-35; TN07 | P1/P2/FE; cao |
| CR-004 | HIST | UC-D22 | Policy/nhánh quyền chưa rõ | PM lập policy; PM block; ngoài nhiệm vụ chỉ ghi nhận | Fast Track có điều kiện thực | FR-15/18; US-33; Q02/03 | P1/P2/Android; cao |
| CR-005 | HIST | UC-D23 | Offline bị hiểu là phải chờ server hoặc tự hết hạn | Tác nghiệp snapshot không timeout nghiệp vụ; sync conflict | Không mất khả năng hiện trường/dữ liệu | FR-22; US-02; Q04/17 | P1/P2/Android; cao |
| CR-006 | HIST | UC-D24 | BEFORE phải chụp mới, đo thiếu ảnh có thể chấp nhận | Tái dùng ảnh nguồn phù hợp; đo thiếu dữ liệu không hợp lệ | Bằng chứng đủ và trung thực | FR-17/21; US-13/20; Q05/06 | P1/P2/Android; vừa |
| CR-007 | HIST | UC-D25 | Supervisor đóng mọi lỗi; sửa lại lẫn tái phát | PM đóng FT/báo Supervisor; hỗn hợp theo nhánh; giữ attempt | Không thêm gate Fast Track; không đóng nhầm | FR-23–25; US-14/23/37; Q07/08 | P1/P2/FE; cao |
| CR-008 | HIST | UC-D26 | Bề rộng/vùng khảo sát và mạng tuyến chưa rõ | Width từng khoảng; corridor tổng; network/CRS/version | Định vị/tính mét đúng nguồn | FR-05–09; Q13/18 | P1/P2/FE; cao |
| CR-009 | HIST | UC-D27 | Tấm/segment có thể thành đơn vị nghiệm thu | Từng lỗi nghiệm thu riêng, tấm định vị | Một lỗi đạt không đóng lỗi khác | FR-10/23; US-36; Q10 | P1/P2/FE; cao |
| CR-010 | HIST | UC-D28 | SRT trong vùng bị coi là đủ coverage | Tách position/quality/coverage; mission nhiều nhánh | Không baseline giả | FR-28/30/33; Q11/14 | AI/P1/P2/FE; cao |
| CR-011 | HIST | UC-D10/11/29 | Phân kỳ dẫn đường/nguồn tuyến chưa đồng bộ | Maps và GPX Sprint 1; track drone Sprint 2; US mới đủ thân | Chốt scope triển khai tài liệu | FR-06/32; DA16; US-40; Q15/18 | P1/P2/FE; vừa |
| CR-012 | HIST | UC-D30; DD-C01–20 | DD thiếu biểu diễn delta R3 | Thêm field/relationship/DR/migration đề xuất | Contract và dữ liệu không lệch nghiệp vụ | Data Dictionary §9–12 | P1/P2; cao |
| CR-013 | NEW | Yêu cầu người dùng phần 11–16 | Chưa có đặc tả chi tiết reports/UX/RTM/UAT | Thêm sáu tài liệu này; giữ source baseline | Bàn giao triển khai và nghiệm thu | RPT/WF/BREQ/TC/NFR/CR mới | BA/QA/UX; scope tài liệu được yêu cầu |
| CR-014 | NEW | Phần 11 | FR-34/35 chưa khóa metric/refresh | Đề xuất MET-01–13, RPT-01–10/AC và metadata | Đếm đúng report/lỗi/tấm/item | FR-34/35; TC-R01–09; CR này chờ PO duyệt chi tiết | BA/P1/P2/FE; vừa |
| CR-015 | NEW | Phần 14 | NFR chưa có workload/target | Đề xuất workload/SLO và NFR-X01–04 | Tạo tiêu chí đo, privacy/ops có owner | PERF/MAP/OPS/AI-TBD; TC-N | PO/Tech Lead/Ops; chưa đủ ước lượng |
| CR-016 | NEW | Phần 12 | Chưa có annotation field/lỗi | Đề xuất WF-01–12 và required/validate/error UX | FE/QA thống nhất hành vi | WF IDs; FR tương ứng | UX/BA/FE; vừa |
| CR-017 | NEW | GAP-01/02/03 RTM | US-10 thiếu trace FR; RouteCapture/nâng cao chưa FR đủ | Đề xuất bổ sung FRD trace/trách nhiệm khi module được giao | Không báo độ phủ 100% giả | FR-36 đề xuất US-10; DA16/AI02/03 tách scope | BA/P1/AI; TBD theo Q18 |
| CR-018 | NEW | Yêu cầu người dùng API/Auth/Sequence/Stack/Error | Chưa có contract kỹ thuật kiểm bằng máy | Thêm OpenAPI và năm tài liệu kỹ thuật trong cùng gói; endpoint/convention là thiết kế đề xuất | Sinh code nhất quán, đúng quyền/transaction | API operationId ↔ FR, auth policies, sequence và ERR codes | P1/P2/FE/AI/QA; chưa rà repo, lịch TBD |

### Trạng thái và tác động thời gian cho từng nhóm

| Mục | Trạng thái tài liệu | Triển khai / kiểm chứng | Ảnh hưởng lịch |
|---|---|---|---|
| CR-001–012 | HIST: đã thể hiện trong nguồn R3; chi tiết có Q vẫn mở | Chưa đối chiếu code, chưa test delta | TBD sau diff repository và migration; không đổi trạng thái Done của plan cũ |
| CR-013 | Người dùng yêu cầu tạo; bản draft đã soạn trong gói này | Chưa được PO ký baseline | Công việc tài liệu; không suy thành gia hạn sprint |
| CR-014–017 | Proposed / chờ chốt chi tiết | Chưa triển khai | TBD sau scope/UX/workload |
| CR-018 | Người dùng yêu cầu bổ sung tài liệu kỹ thuật; contract đề xuất | Chưa đối chiếu/chạy implementation | TBD sau rà stack/endpoint/schema thật |

## 16.4 Decision log phụ thuộc

Q01–Q18 là sổ quyết định gốc tại Mô tả §21. Sổ CR chỉ tham chiếu, không sao chép một câu trả lời mới. Đề xuất nhóm owner: Q01–08 PM/chủ dự án; Q09–14 PM/Operator/Tech Lead; Q15–18 chủ dự án/Tech Lead. Người có thẩm quyền cuối cùng và ngày cần chốt chưa được cung cấp.

Các quyết định mới cần chốt: metric/cohort và refresh (CR-014); workload/target/ma trận thiết bị/privacy (CR-015); annotation (CR-016); thiếu trace/module nâng cao (CR-017); endpoint/DTO/token/structure/error code và mapping enum hiện có (CR-018). Deadline là trước freeze/release phần phụ thuộc, không bịa ngày lịch.

## 16.5 Mẫu yêu cầu thay đổi tiếp theo

| Field bắt buộc | Nội dung |
|---|---|
| CR ID / title / raised_at / requester | ID duy nhất; ngày thực; người thực tế |
| Baseline và nguồn yêu cầu | Phiên bản trước; link ticket/biên bản |
| Before / after / reason | Điều gì đổi, vì sao, lợi ích và rủi ro nếu không đổi |
| Affected IDs | BREQ/FR/BR/US/AC/UC/DR/NFR/API/WF/TC |
| Scope impact | Module/data/API/UI/integration; compatibility; migration/backfill |
| Schedule/cost impact | Ước lượng người-ngày/range sau rà code, giả định, critical path, người ước lượng |
| Options / recommendation | Các lựa chọn, regression/rollback |
| Decision / authority / decided_at | Approved/Rejected/Deferred và lý do thực tế |
| Target release / implementation / evidence | Commit/build/migration; test run; tài liệu cập nhật |
| Closure | Người xác nhận; ngày; phần bị superseded hoặc còn mở |

Checklist impact: quyền thay đổi? dữ liệu cũ thế nào? thiết bị offline cũ sync ra sao? endpoint cũ có tương thích? jobs đang chạy? public data/retention? fixture/test/RTM cần đổi? Nếu có breaking change phải có migration/version/rollback trước release. Chưa có bằng chứng thì không đóng CR.

## REVIEW-01 — 27/09/2026, rà soát đồng bộ tài liệu

CR-REV-01 technical draft: auth401 codes + login/refresh responses; regeneration schema/types; owner BE/FE review. CR-REV-02 tooling: enforce hash equality/lock trước validate và codegen, CI command được cung cấp chưa tích hợp repository thật. CR-REV-03 clarification: FR-16 tách BR-09/BR-10, FR-15/18/22 và RTM/UAT gắn acceptance gates. CR-REV-04 proposal: evaluation sync amendment chưa active, không tự quyết định Q. Không có phê duyệt nghiệp vụ hoặc estimate/deadline mới được cung cấp.

## V2(3) amendment — 2026-09-28

This document follows `planning/V2/V2-3_DECISION_REGISTER.md`. D01-D28 are approved business decisions; `APPROVED_PILOT_CONFIG` and `APPROVED_TARGET` are not empirical verification. The document must distinguish `contractStatus`, `implementationStatus`, and `verificationStatus`. Reporter email/password plus one-time email OTP is the approved authentication flow; web cookie transport, pilot limits, retention and performance values remain configuration/target registers. Fast Track uses measurement-only intake followed by a separately authorized PM repair task; policy framework, reopen, partial publication, handover/conflict, BEFORE incident, curing and traffic release remain explicit contracts. Offline evaluation and AI two-stage processing are proposed until schema, fixtures and runtime/provider evidence pass.
