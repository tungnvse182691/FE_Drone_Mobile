# RoadGuard - Đối chiếu tham chiếu lịch sử

Danh sách này từng ghi tám tài liệu là thiếu trong gói bàn giao tách rời. Checkout hiện tại có nguồn ứng viên cho cả tám mục. Việc tìm thấy file không tự làm nó thành contract hiện hành hoặc bằng chứng runtime; bảng dưới ghi kết quả sau khi đọc nội dung và đối chiếu với V2 canonical ngày 28/09/2026.

Các anchor `missing-01..08` được giữ để liên kết lịch sử không hỏng. Link sử dụng hiện hành nên trỏ thẳng tới actual path và kèm nhãn current/historical phù hợp.

| Anchor | Actual path | Classification | Quan hệ với V2 |
|---|---|---|---|
| `missing-01` | [ADR 003](../../../adr/003-backend-delivery-and-ai-boundary.md) | `FOUND_CURRENT_REFERENCE` | ADR accepted; V2 ownership được amendment bởi ADR 006. |
| `missing-02` | [Dac_ta_UseCase_v2.md](../../Dac_ta_UseCase_v2.md) | `SUPERSEDED` | Nguồn lịch sử; [Use Cases V2 canonical](../02_Requirements/04_Use_Cases.md) là bản đang bảo trì. |
| `missing-03` | [RoadGuard_Domain_Model_v1.md](../../RoadGuard_Domain_Model_v1.md) | `FOUND_HISTORICAL` | Target design ngày 22/09; không phải EF/runtime và chưa thay cho model V2 mới. |
| `missing-04` | [RoadGuard_ERD_v1.md](../../RoadGuard_ERD_v1.md) | `FOUND_HISTORICAL` | Logical ERD lịch sử; không phải physical schema/migration evidence. |
| `missing-05` | [RoadGuard_AI_Segment_Edge_Design_v1.md](../../RoadGuard_AI_Segment_Edge_Design_v1.md) | `FOUND_HISTORICAL` | Proposal ngày 22/09; chỉ dùng phần không bị quyết định V2 mới thay thế. |
| `missing-06` | [RoadGuard_Domain_Model_v1.md](../../RoadGuard_Domain_Model_v1.md) | `FOUND_HISTORICAL` | Cùng nguồn lịch sử với `missing-03`, nhưng tên tham chiếu gốc chính xác. |
| `missing-07` | [RoadGuard_Incident_Segment_Design_v1.md](../../RoadGuard_Incident_Segment_Design_v1.md) | `FOUND_HISTORICAL` | Proposal ngày 22/09; requirements/decision register V2 mới hơn thắng khi xung đột. |
| `missing-08` | [User_Stories_Acceptance_Criteria_v2.md](../../User_Stories_Acceptance_Criteria_v2.md) | `SUPERSEDED` | Nguồn lịch sử; [Stories/AC V2 canonical](../02_Requirements/05_User_Stories_Acceptance_Criteria.md) là bản đang bảo trì. |

## missing-01

Tham chiếu gốc `../adr/003-backend-delivery-and-ai-boundary.md` đã resolve tới [ADR 003](../../../adr/003-backend-delivery-and-ai-boundary.md). Đây là `FOUND_CURRENT_REFERENCE`, không còn là missing.

## missing-02

Tham chiếu gốc `Dac_ta_UseCase_v2.md` đã resolve tới [source use case lịch sử](../../Dac_ta_UseCase_v2.md). Trạng thái `SUPERSEDED` cho nội dung active bởi [Use Cases V2 canonical](../02_Requirements/04_Use_Cases.md).

## missing-03

Tên `Domain_Model.md` không tồn tại nguyên dạng; nội dung tương ứng là [RoadGuard_Domain_Model_v1.md](../../RoadGuard_Domain_Model_v1.md), phân loại `FOUND_HISTORICAL`.

## missing-04

Tên `ERD.md` không tồn tại nguyên dạng; nội dung tương ứng là [RoadGuard_ERD_v1.md](../../RoadGuard_ERD_v1.md), phân loại `FOUND_HISTORICAL`.

## missing-05

[RoadGuard_AI_Segment_Edge_Design_v1.md](../../RoadGuard_AI_Segment_Edge_Design_v1.md) tồn tại và tự ghi trạng thái proposal/chưa triển khai, nên phân loại `FOUND_HISTORICAL`.

## missing-06

[RoadGuard_Domain_Model_v1.md](../../RoadGuard_Domain_Model_v1.md) tồn tại và là target design lịch sử, phân loại `FOUND_HISTORICAL`.

## missing-07

[RoadGuard_Incident_Segment_Design_v1.md](../../RoadGuard_Incident_Segment_Design_v1.md) tồn tại và tự ghi trạng thái proposal/chưa triển khai, nên phân loại `FOUND_HISTORICAL`.

## missing-08

[User_Stories_Acceptance_Criteria_v2.md](../../User_Stories_Acceptance_Criteria_v2.md) tồn tại nhưng đã được bản canonical trong V2 thay thế cho bảo trì hiện hành, nên phân loại `SUPERSEDED`.

Chi tiết mục đã đọc, source date và acceptance evidence nằm trong [`DOC-V2-RECON`](../../../../planning/V2/Governance/DOC-V2-RECON.md).
