# HoangHaiWarrantySystem — Official documentation

**Điểm vào canonical · Phase 5 documentation QA chờ independent JEV review · 15/10/2026.**

Đây là điểm truy cập chính cho việc phát triển bộ tài liệu HoangHaiWarrantySystem. Phase 1 thiết lập authority, phạm vi, glossary, actor/client matrix và source registry. Phase 2A bổ sung 10 business workflows; Phase 2B bổ sung kiến trúc/backend-data/security/storage/jobs/offline/configuration; Phase 2C bổ sung API contracts đầy đủ từ source/OpenAPI. Các phase này không phải acceptance của Web/Expo/provider runtime; Phase 3 Web/Expo và Phase 4 AI handoff đã được giao trong phạm vi tài liệu; Phase 5 kiểm toán được liên kết bên dưới.

Tên sản phẩm là **HoangHaiWarrantySystem**. `RoadGuardSystem` trong namespace, repository, database, route và artifact là **legacy technical identifier** được giữ nguyên. Mobile dùng **React Native + Expo**; tên API `/api/v1/auth/android/*` vẫn là wire hiện hữu, không được tự đổi thành `/auth/mobile/*`. iOS production readiness chưa được xác minh.

## Bắt đầu đọc

| Cần biết | Trang canonical hiện có |
|---|---|
| Nguồn nào quyết định hành vi, cách xử lý mâu thuẫn, glossary | [Authority and source of truth](00_Governance/01_Authority-and-Source-of-Truth.md) |
| Product naming, MVP, quyết định đã chốt và deferred scope | [Product decisions and scope](00_Governance/02_Product-Decisions-and-Scope.md) |
| Phần đã thấy trong source, test thực chạy và gates chưa đóng | [Implementation and verification status](00_Governance/03_Implementation-and-Verification-Status.md) |
| Scope từng phase, ownership, thay đổi và review gate | [Document control and change history](00_Governance/04_Document-Control-and-Change-History.md) |
| Tài liệu cũ dẫn về đâu; nguồn API/workflow/operations | [Source registry and migration crosswalk](00_Governance/05_Source-Registry-and-Migration-Crosswalk.md) |
| Supervisor/PM Web, Reporter/Operator/Crew Mobile và quyền theo nguồn | [Actor/client/permission matrix](01_Product-and-Roles/02_Actor-Client-Permission-Matrix.md) |
| Business workflows: intake/candidates/survey/FIELD/NORMAL/FT/offline/operations | [Canonical business workflows](02_Business-Workflows/README.md), [Phase 2A review report](02_Business-Workflows/PHASE2A_REVIEW_REPORT.md) |
| Backend và database | [Architecture](03_Backend-and-Data/01_ASPNET-Architecture.md), [data model](03_Backend-and-Data/02_Domain-and-Data-Model.md), [security](03_Backend-and-Data/03_Authentication-Authorization-and-Security.md), [storage](03_Backend-and-Data/04_File-Storage-and-Upload.md), [jobs/integration](03_Backend-and-Data/05_Background-Jobs-and-Integration-Boundaries.md), [offline](03_Backend-and-Data/06_Offline-Backend-Architecture.md), [configuration](03_Backend-and-Data/07_Backend-Configuration-and-Deployment-Boundaries.md), [Phase 2B review](03_Backend-and-Data/PHASE2B_REVIEW_REPORT.md) |
| API contracts cho Web, Mobile Expo và AI | [API entrance](04_API-Contracts/README.md), [full catalog](04_API-Contracts/02_Full-API-Catalog.md), [Phase 2C review](04_API-Contracts/PHASE2C_REVIEW_REPORT.md) |
| Web Supervisor/PM handoff | [Web entrance](05_Web/README.md), [Supervisor matrix](05_Web/02_Supervisor-Screen-API-Matrix.md), [PM matrix](05_Web/03_PM-Screen-API-Matrix.md), [Phase 3A review](05_Web/PHASE3A_REVIEW_REPORT.md), [C01 correction](05_Web/PHASE3A_C01_REVIEW_REPORT.md), [C02 WebAuth correction](05_Web/PHASE3A_C02_REVIEW_REPORT.md) |
| Reporter Mobile Expo handoff | [Reporter entrance](06_Mobile-Expo/Reporter/README.md), [screen/API matrix](06_Mobile-Expo/Reporter/01_Reporter-Screen-API-Matrix.md), [Phase 3B review](06_Mobile-Expo/Reporter/PHASE3B_REVIEW_REPORT.md) |
| Operator/Crew Mobile Expo | [Operator](06_Mobile-Expo/Operator/README.md), [Crew](06_Mobile-Expo/Crew/README.md), [C01](06_Mobile-Expo/PHASE3C_C01_REVIEW_REPORT.md) |
| FastAPI/YOLO handoff | [AI entrance](07_AI-FastAPI/README.md) |
| Final documentation QA / MVP readiness | [Phase 5](08_Testing-and-Operations/Phase5/README.md), [review](08_Testing-and-Operations/Phase5/PHASE5_REVIEW_REPORT.md) |

## Quy tắc sử dụng

- Quyết định owner xác định hành vi mong đợi; source xác định implementation hiện có; test chỉ chứng minh điều kiện đã chạy. Đọc [precedence](00_Governance/01_Authority-and-Source-of-Truth.md#precedence-and-conflict-handling) trước khi hợp nhất hai nguồn mâu thuẫn.
- Dùng [Phase 0 full API inventory](../audit/HHWS-DOCS-REBUILD-01/02_FULL_API_INVENTORY.md) và controller/DTO cho wire hiện tại. OpenAPI/V2 draft, Postman subset hoặc tên test không tự là approval hoặc E2E acceptance.
- Backend hiện hữu là trung tâm integration cho Web, Mobile và FastAPI. Khi source khác quyết định owner, ghi `PRODUCT_SOURCE_GAP`; FE không được tự sửa authority bằng local state hoặc endpoint giả.
- Tài liệu cũ vẫn ở nguyên vị trí. Crosswalk phân biệt nguồn hiện hành, nội dung stale đúng phạm vi và checkpoint lịch sử; chưa archive/delete/move hay cập nhật contract lock.

## Lộ trình canonical sau review

| Nhóm | Trạng thái hiện tại | Nguồn hiện dùng |
|---|---|---|
| `00_Governance`, actor/client matrix | Phase 1 PASS theo owner | Các trang ở trên |
| `01_Product-and-Roles` overview/requirements/MVP chi tiết | Chưa viết lại | [Product source](../product/README.md), áp quyết định mới của Phase 1 khi client wording cũ mâu thuẫn |
| `02_Business-Workflows` | Phase 2A PASS for documentation scope | [10 workflows và evidence](02_Business-Workflows/README.md) |
| `03_Backend-and-Data` | Phase 2B đã giao; owner cho phép Phase 2C tiếp theo; runtime acceptance riêng | [Review/coverage](03_Backend-and-Data/PHASE2B_REVIEW_REPORT.md) |
| `04_API-Contracts` | Phase 2C PASS for documentation scope theo owner; runtime acceptance riêng | [API entrance](04_API-Contracts/README.md), [Phase 2C review](04_API-Contracts/PHASE2C_REVIEW_REPORT.md) |
| `05_Web` | Phase 3A-C02 PASS for documentation correction theo owner; Web E2E NOT_VERIFIED | [Web handoff](05_Web/README.md), [acceptance checklist](05_Web/07_Web-Integration-Acceptance-Checklist.md) |
| `06_Mobile-Expo` | Phase 3B Reporter và Phase 3C Operator/Crew handoff đã viết; Mobile/E2E NOT_VERIFIED | [Reporter Expo handoff](06_Mobile-Expo/Reporter/README.md), [Phase 3B review](06_Mobile-Expo/Reporter/PHASE3B_REVIEW_REPORT.md) |
| `07_AI-FastAPI` | Phase 4 handoff đã viết; provider/E2E NOT_VERIFIED | [Existing AI boundary](../RoadGuard-Backend-Official/06_Integrations/02_BE_FastAPI_Integration_Boundary.md), [Phase 0 integration gaps](../audit/HHWS-DOCS-REBUILD-01/03_BUSINESS_AND_PLATFORM_CONFLICTS.md) |
| `08_Testing-and-Operations`, `99_Archive` | Phase 5 QA giao để independent review; không di chuyển archive | [Evidence/gaps](00_Governance/03_Implementation-and-Verification-Status.md), [crosswalk](00_Governance/05_Source-Registry-and-Migration-Crosswalk.md) |

Đường dẫn chương tương lai chỉ là kế hoạch trong code notation; không có link tới file chưa tồn tại và không tạo placeholder giả như tài liệu đã hoàn thành.

## Kiểm tra link

Link checker chỉ đọc file, không sửa tài liệu/source hay gọi network:

```powershell
python docs/HoangHaiWarrantySystem-Official/tools/check_links.py
```

Tool kiểm inline/reference Markdown links, local target existence, local Markdown heading anchors và target trong repository. External URL, deployed API, quyền truy cập và runtime E2E không nằm trong kết quả này. Giới hạn parser và evidence nằm trong [change control](00_Governance/04_Document-Control-and-Change-History.md#verification-and-review).

**STOP sau Phase 5 push.** Chờ independent JEV review; không tự triển khai GAP hoặc Phase 6.
