# RoadGuard — Gói bổ sung BA và kỹ thuật R3

> Bản ghi từ gói bàn giao trước. Các hash/kết quả kiểm tra trong nội dung mô tả snapshot gốc, không phải xác nhận gói sau sắp xếp. Xem README gốc và 08_Delivery/03_Reorganization_Validation.md để kiểm bản hiện tại.
**Ngày:** 26/09/2026. **Version:** EXT-TECH-R3-v1. **Trạng thái:** đặc tả để review; không phải xác nhận phần mềm đã triển khai hoặc nghiệm thu.

Gói này đáp ứng cả hai nhóm yêu cầu trong cuộc trao đổi: phần BA 11–16 và phần kỹ thuật 3/5/6/7/8. Giữ số mục theo yêu cầu, không tự đánh số lại bộ tài liệu gốc. OpenAPI là file máy đọc đi kèm phần 3.

## Mục lục

| Mục | File | Nội dung |
|---|---|---|
| 03 | [RoadGuard_03_API_Specification.md](../05_Technical/03_API_Specification.md) | Endpoint catalog, schemas, HTTP, invariants, gaps |
| 03-YAML | [RoadGuard_OpenAPI_v1.yaml](../05_Technical/openapi.yaml) | OpenAPI3.1.1: 133 operations, 124 paths, 153 schemas |
| 05 | [RoadGuard_05_Auth_Permission_Model.md](../05_Technical/02_Auth_Permission_Model.md) | Role + membership/ownership/assignment + state |
| 06 | [RoadGuard_06_Sequence_Diagrams.md](../05_Technical/05_Sequence_Diagrams.md) | 6 sequence diagram; transaction, rollback, retry |
| 07 | [RoadGuard_07_Tech_Stack_Convention.md](../05_Technical/01_Tech_Stack_Conventions.md) | Stack kế thừa, folder/naming/CI/codegen đề xuất |
| 08 | [RoadGuard_08_Error_Handling_Convention.md](../05_Technical/04_Error_Handling_Convention.md) | Format lỗi, status/code, retry, sync, logs |
| 11 | [RoadGuard_11_Report_Analytics_Requirements.md](../02_Requirements/06_Report_Analytics_Requirements.md) | 10 báo cáo/dashboard; 13 chỉ số; tần suất, filter, xuất |
| 12 | [RoadGuard_12_Wireframe_Mockup_Annotation.md](../04_UI_UX/01_Wireframe_Annotations.md) | 12 wireframe logic; field, required/validate, lỗi/hành vi |
| 13 | [RoadGuard_13_Requirements_Traceability_Matrix.md](../06_Testing/01_Requirements_Traceability_Matrix.md) | 9 BREQ tổng hợp →37 FR→UC→test; 41 US; gap ledger |
| 14 | [RoadGuard_14_Non_Functional_Requirements.md](../02_Requirements/07_Non_Functional_Requirements.md) | 14 NFR kế thừa +4 bổ sung; workload/targets đề xuất; compliance scope |
| 15 | [RoadGuard_15_Test_Case_UAT_Scenarios.md](../06_Testing/02_Test_Cases_UAT_Scenarios.md) | 37 FR cases +175 AC cases +12 UAT; 9 RPT +18 NFR cases được tham chiếu |
| 16 | [RoadGuard_16_Change_Request_Log.md](../07_Change_Management/01_Change_Request_Log.md) | 18 CR ghi nhận lịch sử/đề xuất; impact/owner/lịch TBD |

## Cách đọc và bàn giao

PO/BA: đọc báo cáo → annotation → RTM → NFR → UAT → CR. P1/P2/FE/AI: đọc Auth/Permission và Error Handling → OpenAPI/endpoint catalog → Sequence → Convention, rồi đối chiếu FR/US/DD và test. QA dùng phần15 với RTM, không đánh Pass từ sự tồn tại của test case.

Điểm phải giữ: một lỗi nhỏ được giao đo-và-sửa mới có Fast Track có điều kiện; batch nhiều lỗi chỉ đo; PM lập policy, Crew không tự hạ kết luận PM; offline không tự hết quyền do mất mạng nhưng token server vẫn có hạn; Fast Track PM kiểm/đóng và báo Supervisor; từng lỗi nghiệm thu độc lập; SRT trong vùng không chứng minh coverage đủ; report/Defect/tấm/item/attempt không đếm lẫn.

BREQ-* là mã mục tiêu nghiệp vụ tổng hợp mới; BR-* vẫn là Business Rule nguồn. FR/US/UC cũ giữ ID. Một số AC nguồn chỉ đánh số mục nên test tham chiếu “US-xx §AC mục n”, không giả ID AC gốc. Endpoint/schema/convention được soạn như đề xuất khi snapshot chưa có repository đối chiếu; sau khi nhập vào checkout, mỗi task vẫn phải so với source hiện tại. Q01–Q18 và TECH-GAP/RTM-GAP chưa chốt được ghi rõ; không dùng phần conditional làm gate đã approved.

## Nguồn đầu vào và dấu kiểm tra

Nội dung căn cứ là các bản người dùng cung cấp trong cuộc trao đổi này. Tên/hash dưới đây giúp nhận diện đúng snapshot; không biểu thị phần mềm tương ứng đã được kiểm thử.

| Tệp nguồn | SHA-256 |
|---|---|
| Data_Dictionary.md | `e36aed6b17d0988f5a8b85daa02166474d4c77225312de3b4708b0eb7e43318d` |
| RoadGuard_Business_Rules(1).md | `c87ff33f9f1a8cf651839827b62e0cfa23872768ac78068e15c46cecd65ab604` |
| RoadGuard_Documentation_Index(1).md | `957ae4937c3574fdc9928f1d1549f5b0a0f47133172a2848f1099942842ef648` |
| RoadGuard_FRD_SRS(1).md | `8e7aa4c690046136226e1e161820cbebab0f9fff2897ec807e03b86a65519c21` |
| RoadGuard_Mo_Ta_Chi_Tiet_Du_An(1).md | `8b8f8f28c2338660cc0fb18b3a20d35427e2384ab5ba4de00a690eb033228223` |
| RoadGuard_To_Be_Process(1).md | `31019613c2d94a9a4ef8be5a4b3cc0bd3e63e05f532cb5424dddc0f5308cd731` |
| RoadGuard_UseCase_Change_Log(1).md | `767dc1f7e367b6fa3df26a084a42615d835c02e13145f016930f249141fbdac9` |
| UseCase.md | `203f2a48539bf763f8d7d92cb31833ad26d3e125549fab075b4ecbfd41e998ea` |
| User_Stories_Acceptance_Criteria.md | `766769dda81a24a59d8ce865ed0800f85367628873a221ba2a8c274ae15d5c0a` |

## Kết quả kiểm tra tài liệu

Xem [RoadGuard_Package_Validation.md](02_Package_Validation.md). Đã kiểm cấu trúc YAML, toàn bộ local `$ref`, operationId/path parameters/security mapping và độ phủ mã FR/US/AC. Chưa chạy full OpenAPI standards validator, generate SDK, compile ứng dụng, gọi endpoint, benchmark, render Mermaid hoặc chạy UAT.

Không có ngày release/effort thực tế hoặc chữ ký phê duyệt được cung cấp. Target hiệu năng, refresh, workload và NFR mới đều được ghi là đề xuất. Các luật/tiêu chuẩn tuân thủ được dùng để sàng lọc phạm vi; không tự gán GDPR/PCI-DSS hoặc chứng nhận tuân thủ cho RoadGuard.
