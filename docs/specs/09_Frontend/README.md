# RoadGuard — Bộ tài liệu FE và Offline R3 v1

**Ngày:** 27/09/2026. **Trạng thái:** đặc tả để review/triển khai, không xác nhận phần mềm đã chạy hoặc được nghiệm thu.

Gói bổ sung đặt vào `RoadGuard_Docs/09_Frontend/`. Giữ nguyên thư mục contracts/config/fixtures để các liên kết hoạt động. Có thể đọc độc lập vì đã kèm snapshot OpenAPI nguồn.

## Mục lục

| Mục | Nội dung |
|---|---|
| [01_FE_Scope_Implementation_Guide.md](01_FE_Scope_Implementation_Guide.md) | 01. Phạm vi và hướng dẫn triển khai FE |
| [02_Authentication_Flow.md](02_Authentication_Flow.md) | 02. Authentication Flow |
| [03_Error_Response_UI_Convention.md](03_Error_Response_UI_Convention.md) | 03. Error Response và hành vi UI |
| [04_Data_Contract_Type_Definitions.md](04_Data_Contract_Type_Definitions.md) | 04. Data Contract / Type Definition |
| [05_Pagination_Filtering_Sorting.md](05_Pagination_Filtering_Sorting.md) | 05. Pagination / Filtering / Sorting |
| [06_Realtime_Event_Spec.md](06_Realtime_Event_Spec.md) | 06. Realtime và polling |
| [07_Environment_Base_URL_Config.md](07_Environment_Base_URL_Config.md) | 07. Environment và Base URL |
| [08_Rate_Limit_Timeout_Retry.md](08_Rate_Limit_Timeout_Retry.md) | 08. Rate Limit / Timeout / Retry |
| [09_Offline_App_Sync_Spec.md](09_Offline_App_Sync_Spec.md) | 09. App offline và đồng bộ dữ liệu |
| [10_FE_Architecture_UI_States.md](10_FE_Architecture_UI_States.md) | 10. Kiến trúc FE và trạng thái màn hình |
| [11_FE_Offline_Test_UAT.md](11_FE_Offline_Test_UAT.md) | 11. FE / Offline Test Cases và UAT |
| [12_Decisions_Contract_Gaps.md](12_Decisions_Contract_Gaps.md) | 12. Quyết định cần chốt và contract gaps |
| [13_Source_References.md](13_Source_References.md) | 13. Nguồn và giới hạn xác minh |

## Tệp dùng khi code

- [OpenAPI baseline](contracts/openapi.baseline.yaml): contract R3 đề xuất, đã cập nhật auth401 ở REVIEW-01, 133 operations.
- [JSON Schema](contracts/api.schemas.json): 153 định nghĩa, giữ constraint/nullability/enum.
- [TypeScript API types](contracts/api.types.ts): structural types, cần runtime validation.
- [Local types](contracts/local.types.ts): outbox/media/partition, không phải payload API.
- [Operation catalog](contracts/operation_catalog.md): endpoint, role, request/response, required headers.
- [Realtime proposed schema](contracts/realtime.proposed.schema.json): hint extension chưa triển khai.
- [API fixtures](fixtures/api.examples.json): ví dụ hợp lệ và cố ý không hợp lệ để test contract.
- [Development env](config/env.development.example), [staging env](config/env.staging.example), [production env](config/env.production.example): placeholder, không secret thật.
- [Validation report](../08_Delivery/FE_R3/Package_Validation_Original.md): những gì đã kiểm và chưa kiểm.

## Điểm cần chú ý trước khi code

D25/36A/37 chọn email/password/OTP, web secure cookie/server session và Android access/refresh; runtime hiện tại vẫn cần compatibility audit. Chưa có SSO. Polling là MVP; list dùng cursor. D24 giới hạn full offline cho Android, web nghiệp vụ cần mạng.

58 test cases FE +8 UAT journeys được soạn, tất cả NOT_RUN. 16 FE-GAP ghi rõ các thiếu hụt; đặc biệt offline evaluation/snapshot, upload resume, client device identity, dedup retention và xử lý conflict Q04/Q17 phải chốt trước nghiệm thu toàn bộ offline.

App giữ bằng chứng khi hết token/mất mạng/logout; không tự hết quyền tác nghiệp do thời gian offline. Đồng bộ không đồng nghĩa nghiệm thu. Fast Track vẫn Crew thực hiện đúng nhiệm vụ/policy → PM kiểm/đóng → báo Supervisor.

## Câu hỏi để chốt bản kế tiếp

1. Web quản trị + Android Kotlin hay cần cả PWA tác nghiệp offline đầy đủ?
2. Email/password + OTP hay bổ sung Google/Microsoft SSO; có chọn BFF cho web production?
3. Có repository/BE đang chạy và URL dev/staging/prod để đối chiếu không?

Các câu hỏi không ngăn dùng bộ đặc tả này để review và bắt đầu các phần đã đủ contract.
