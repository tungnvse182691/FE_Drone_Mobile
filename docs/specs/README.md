# RoadGuard — Hướng dẫn tài liệu cho Backend, Frontend và QA

**Phiên bản bộ tài liệu:** R3 + BA/Tech Supplement v1 + FE-R3-v1  
**Ngày sắp xếp:** 27/09/2026
**Bản rà soát:** REVIEW-01, contract0.1.1-draft-review1  
**Trạng thái:** tài liệu nghiệp vụ và thiết kế để review/triển khai; không phải xác nhận hệ thống đã được xây dựng, chạy kiểm thử hoặc nghiệm thu.

Đây là điểm bắt đầu đọc bộ tài liệu RoadGuard. BE và FE cần thống nhất nghiệp vụ, API và hành vi offline trước khi triển khai từng tính năng. Các mục có nhãn **ĐỀ XUẤT**, **CONDITIONAL**, **TBD**, **Qxx** hoặc **FE-GAP-xx** chưa được xem là quyết định đã phê duyệt.

Bộ này được sắp xếp lại từ các tài liệu RoadGuard đã bàn giao trong cuộc trao đổi. Không đọc hoặc thay đổi trực tiếp nội dung ổ `C:` của người dùng. Nếu bạn đã chỉnh thêm tài liệu trên máy, hãy đối chiếu trước khi thay bộ cũ. Tên thư mục gốc có thể đổi thành `RoadGuard_Docs`; liên kết bên trong dùng đường dẫn tương đối.

## 1. RoadGuard làm gì?

RoadGuard hỗ trợ quản lý bảo hành và xử lý hư hỏng đường: tiếp nhận phản ánh, khảo sát và phát hiện qua AI, xác định vị trí lỗi, kiểm chứng/đo tại hiện trường, lập kế hoạch sửa, quản lý bằng chứng, nghiệm thu và công bố kết quả theo quyền.

Hệ thống hỗ trợ web quản trị/người phản ánh và app Android tác nghiệp. AI cung cấp kết quả qua adapter; quyết định nghiệp vụ vẫn do người có thẩm quyền. Tác nghiệp offline cần lưu bền vững trên thiết bị và đồng bộ có kiểm soát khi có mạng.

| Actor | Trách nhiệm chính |
|---|---|
| Supervisor/Admin | Quản trị trong phạm vi được cấp, tạo/giao dự án, duyệt và nghiệm thu nhánh cần phê duyệt |
| PM | Quản lý dự án được giao, phân cấp, policy, kế hoạch, giao việc, kiểm tra và đóng Fast Track theo điều kiện |
| Crew | Đo/sửa đúng nhiệm vụ, assignment và policy; thu thập BEFORE/AFTER, gửi kết quả |
| Operator | Thực hiện nhiệm vụ khảo sát và nộp video/telemetry theo phạm vi được giao |
| Reporter | Gửi phản ánh, xem phần công bố thuộc quyền của mình |

Role không đủ để cấp quyền một hành động. Backend còn phải kiểm ownership, membership, assignment, task mode, policy, state và version. Supervisor không mặc nhiên được thay actor PM trong mọi endpoint.

## 2. Bắt đầu đọc theo vai trò

### Backend

1. Đọc [Tổng quan dự án](01_Overview/01_Project_Overview.md), [FRD/SRS](02_Requirements/01_FRD_SRS.md) và [Business Rules](02_Requirements/02_Business_Rules.md) để hiểu yêu cầu và các điều không được phá.
2. Đối chiếu [Use Cases](02_Requirements/04_Use_Cases.md), [User Stories/AC](02_Requirements/05_User_Stories_Acceptance_Criteria.md) và [Data Dictionary](03_Data/01_Data_Dictionary.md) trước thiết kế persistence/state transitions.
3. Đọc [Tech Stack](05_Technical/01_Tech_Stack_Conventions.md), [Auth/Permission](05_Technical/02_Auth_Permission_Model.md), [API Specification](05_Technical/03_API_Specification.md), [OpenAPI](05_Technical/openapi.yaml), [Error Handling](05_Technical/04_Error_Handling_Convention.md) và [Sequence Diagrams](05_Technical/05_Sequence_Diagrams.md).
4. Đọc [Offline/Sync](09_Frontend/09_Offline_App_Sync_Spec.md) và [Contract Gaps](09_Frontend/12_Decisions_Contract_Gaps.md). Các thiếu hụt này ảnh hưởng trực tiếp API, dedup, tệp, transaction và quyền.
5. Chọn đúng yêu cầu qua [RTM](06_Testing/01_Requirements_Traceability_Matrix.md); triển khai và kiểm thử theo từng luồng, không chỉ tạo đủ endpoint.

### Frontend web

1. Đọc [Tổng quan](01_Overview/01_Project_Overview.md), [To-Be Process](02_Requirements/03_To_Be_Process.md), [User Stories/AC](02_Requirements/05_User_Stories_Acceptance_Criteria.md) và [Wireframe Annotations](04_UI_UX/01_Wireframe_Annotations.md).
2. Đọc [Phạm vi FE](09_Frontend/01_FE_Scope_Implementation_Guide.md), [Authentication Flow](09_Frontend/02_Authentication_Flow.md), [Error/UI Convention](09_Frontend/03_Error_Response_UI_Convention.md) và [Data Contract](09_Frontend/04_Data_Contract_Type_Definitions.md).
3. Đọc [Pagination](09_Frontend/05_Pagination_Filtering_Sorting.md), [Realtime/Polling](09_Frontend/06_Realtime_Event_Spec.md), [Environment](09_Frontend/07_Environment_Base_URL_Config.md) và [Timeout/Retry](09_Frontend/08_Rate_Limit_Timeout_Retry.md).
4. Dùng [UI States](09_Frontend/10_FE_Architecture_UI_States.md) và [FE Test/UAT](09_Frontend/11_FE_Offline_Test_UAT.md) để triển khai đủ loading, empty, error, stale, pending và conflict.
5. Kiểm [Contract Gaps](09_Frontend/12_Decisions_Contract_Gaps.md) trước khi gọi endpoint, query param hoặc realtime event mới. Mock phải có nhãn, không thay contract thực tế.

### App Android / mobile

Đọc lộ trình FE phía trên, sau đó ưu tiên [Offline/Sync](09_Frontend/09_Offline_App_Sync_Spec.md). Thực hiện theo thứ tự: partition tài khoản/môi trường → local DB/file store → task pack → capture bền vững → upload/verify → operation queue/dedup → xử lý conflict → phục hồi sau restart/update. Không dùng cache HTTP làm kho bằng chứng offline.

### BA / QA / người review

Đọc [Business Rules](02_Requirements/02_Business_Rules.md), [RTM](06_Testing/01_Requirements_Traceability_Matrix.md), [Test/UAT nghiệp vụ](06_Testing/02_Test_Cases_UAT_Scenarios.md), [Test/UAT FE](09_Frontend/11_FE_Offline_Test_UAT.md), [NFR](02_Requirements/07_Non_Functional_Requirements.md) và [Change Request Log](07_Change_Management/01_Change_Request_Log.md). Kiểm cả nhánh lỗi/quyền/offline; có test case không có nghĩa đã pass.

## 3. Cấu trúc và mục lục

| Thư mục | Nội dung | Người dùng chính |
|---|---|---|
| `01_Overview` | Bối cảnh và mô tả dự án | Tất cả |
| `02_Requirements` | FRD/SRS, business rules, process, use cases, stories, báo cáo, NFR | BE, FE, BA, QA |
| `03_Data` | Data Dictionary và ràng buộc dữ liệu | BE; FE khi map field/unit/enum |
| `04_UI_UX` | Chú thích field, validation, hành vi giao diện | FE, BA, QA |
| `05_Technical` | Thiết kế API, phân quyền, sequence, convention | BE, FE |
| `06_Testing` | Truy vết và kiểm thử nghiệp vụ | QA, BE, FE |
| `07_Change_Management` | Đề nghị thay đổi và lịch sử use case | BA, PO, BE, FE |
| `08_Delivery` | Chỉ mục/kiểm tra cũ, manifest và báo cáo sắp xếp | Người bàn giao/review |
| `09_Frontend` | FE integration, offline, types, config, fixtures và tests | FE, mobile, BE tích hợp |

### 01–04. Tổng quan, yêu cầu, dữ liệu và giao diện

| Tài liệu | Dùng để trả lời |
|---|---|
| [01_Project_Overview.md](01_Overview/01_Project_Overview.md) | Hệ thống phục vụ ai, phạm vi và vấn đề cần giải quyết là gì? |
| [01_FRD_SRS.md](02_Requirements/01_FRD_SRS.md) | Hệ thống phải làm những chức năng nào? |
| [02_Business_Rules.md](02_Requirements/02_Business_Rules.md) | Điều kiện/quy tắc nghiệp vụ nào bắt buộc giữ? |
| [03_To_Be_Process.md](02_Requirements/03_To_Be_Process.md) | Luồng xử lý, nhánh quyết định và trách nhiệm actor? |
| [04_Use_Cases.md](02_Requirements/04_Use_Cases.md) | Actor tương tác thế nào, có ngoại lệ nào? |
| [05_User_Stories_Acceptance_Criteria.md](02_Requirements/05_User_Stories_Acceptance_Criteria.md) | Điều kiện nào chứng minh tính năng đáp ứng nhu cầu? |
| [06_Report_Analytics_Requirements.md](02_Requirements/06_Report_Analytics_Requirements.md) | Dashboard/report hiển thị gì, tính và cập nhật thế nào? |
| [07_Non_Functional_Requirements.md](02_Requirements/07_Non_Functional_Requirements.md) | Yêu cầu hiệu năng, bảo mật, khả dụng và vận hành? |
| [01_Data_Dictionary.md](03_Data/01_Data_Dictionary.md) | Field, đơn vị, quan hệ, trạng thái và ràng buộc dữ liệu? |
| [01_Wireframe_Annotations.md](04_UI_UX/01_Wireframe_Annotations.md) | UI cần field/action/validation nào? |

### 05–08. Kỹ thuật, kiểm thử và bàn giao

| Tài liệu | Dùng để trả lời |
|---|---|
| [01_Tech_Stack_Conventions.md](05_Technical/01_Tech_Stack_Conventions.md) | Stack định hướng, naming, folder, convention và CI? |
| [02_Auth_Permission_Model.md](05_Technical/02_Auth_Permission_Model.md) | Ai được làm gì trên đối tượng/trạng thái nào? |
| [03_API_Specification.md](05_Technical/03_API_Specification.md) | Endpoint, input/output, semantics và giới hạn thiết kế? |
| [openapi.yaml](05_Technical/openapi.yaml) | Contract API máy đọc để review/codegen/contract test |
| [04_Error_Handling_Convention.md](05_Technical/04_Error_Handling_Convention.md) | Error envelope/code/status/idempotency thống nhất |
| [05_Sequence_Diagrams.md](05_Technical/05_Sequence_Diagrams.md) | Thứ tự gọi, transaction, rollback, async và retry |
| [01_Requirements_Traceability_Matrix.md](06_Testing/01_Requirements_Traceability_Matrix.md) | Liên kết mục tiêu → FR → use case → test |
| [02_Test_Cases_UAT_Scenarios.md](06_Testing/02_Test_Cases_UAT_Scenarios.md) | Kịch bản nghiệm thu nghiệp vụ |
| [01_Change_Request_Log.md](07_Change_Management/01_Change_Request_Log.md) | Đề nghị thay đổi, lý do, ảnh hưởng và trạng thái |
| [02_Use_Case_Change_Log.md](07_Change_Management/02_Use_Case_Change_Log.md) | Use case nào đã thêm/bỏ/thay thế? |
| [Delivery README](08_Delivery/README.md) | Bản ghi nào là lịch sử, manifest nào dùng cho gói hiện tại? |
| [Reorganization Validation](08_Delivery/03_Reorganization_Validation.md) | Liên kết, hash và cấu trúc gói sau sắp xếp |

### 09. Frontend và app offline

[Mục lục FE chi tiết](09_Frontend/README.md) chứa toàn bộ 13 tài liệu. Tệp dùng khi code:

| Tệp/thư mục | Cách sử dụng |
|---|---|
| [api.schemas.json](09_Frontend/contracts/api.schemas.json) | JSON Schema cho 153 DTO; chọn `$ref` đúng DTO khi validate |
| [api.types.ts](09_Frontend/contracts/api.types.ts) | Structural TypeScript types; không thay runtime validation |
| [local.types.ts](09_Frontend/contracts/local.types.ts) | Local outbox/media/partition; không serialize nguyên object vào API |
| [operation_catalog.md](09_Frontend/contracts/operation_catalog.md) | 133 operation IDs, paths, roles, request/response và header cần có |
| [openapi.baseline.yaml](09_Frontend/contracts/openapi.baseline.yaml) | Snapshot cố định làm đầu vào sinh types/schema cho FE |
| [realtime.proposed.schema.json](09_Frontend/contracts/realtime.proposed.schema.json) | Event hint đề xuất, không chứng minh đã có WebSocket server |
| [api.examples.json](09_Frontend/fixtures/api.examples.json) | Payload mẫu hợp lệ/không hợp lệ, không chứa credential thật |
| [env.development.example](09_Frontend/config/env.development.example) | Cấu hình web dev mẫu |
| [env.staging.example](09_Frontend/config/env.staging.example) và [env.production.example](09_Frontend/config/env.production.example) | Placeholder cần thay URL và chọn auth mode trước sử dụng |
| [build_contracts.py](09_Frontend/contracts/build_contracts.py) | Sinh lại types/schema/catalog từ FE baseline đã review |
| [validate_package.py](09_Frontend/contracts/validate_package.py) | Kiểm cấu trúc/fixtures/link của gói; không thay app tests |

## 4. Tài liệu nào quyết định điều gì?

| Câu hỏi | Nguồn cần dùng |
|---|---|
| Có được sửa/duyệt/đóng hay không? | Quyết định nghiệp vụ đã chốt + Business Rules + FRD/use case liên quan |
| JSON có field nào, tên gì, required/null/enum ra sao? | OpenAPI đã được BE/FE review cho phiên bản đó |
| Field lưu trong DB ra sao? | Data Dictionary + thiết kế/migration trong repository thực tế |
| FE lưu local và hiển thị lỗi thế nào? | Bộ FE, đồng thời phải giữ business rules và wire contract |
| Tính năng được nghiệm thu bằng gì? | AC + test/UAT + RTM và kết quả thực thi có bằng chứng |
| Hai tài liệu lệch nhau? | Ghi gap/change request, đối chiếu quyết định đã chốt và xin owner quyết định; không tự chọn bản mới nhất để bỏ invariant |

**Data Dictionary không phải DTO API.** Tên/enum logic trong DB có thể khác wire contract, cần adapter rõ. **Use case không phải endpoint**; một use case có thể gồm nhiều API. **BR** là Business Rule; **BREQ** trong RTM là nhóm mục tiêu nghiệp vụ, không dùng lẫn.

Trong gói hiện tại, `05_Technical/openapi.yaml` là bản trung tâm để review thay đổi API; `09_Frontend/contracts/openapi.baseline.yaml` là snapshot dùng sinh artifact FE. Hai file được kiểm SHA256 với contract.lock.json; validate và codegen đều fail khi lệch. Gói hiện đã nằm trong repository, nhưng chưa có bằng chứng hook này được cài và enforce trong CI production; xem `ci/README.md`. Khi thay API: review bản trung tâm → cập nhật snapshot FE đã duyệt → regenerate → kiểm breaking changes/provider-consumer tests. Không sửa types sinh tự động hoặc để hai YAML phát triển riêng mà không có version/hash liên kết.

## 5. Ranh giới trách nhiệm BE và FE

| Chủ đề | Backend | Frontend / mobile |
|---|---|---|
| Quyền | Authenticate và authorize mỗi request theo scope/state | Ẩn/disable action đúng UX; không coi UI guard thay BE |
| Validation | Kiểm schema/business invariants trước commit | Validate sớm, hiển thị lỗi đúng field, giữ input/evidence |
| Concurrency | ETag/If-Match, transaction, 412 khi stale | Giữ version gốc, so sánh base/local/server; không force overwrite |
| Idempotency | Lưu và trả kết quả dedup sau kiểm quyền | Giữ operationId/key/payload ổn định qua retry/timeout |
| Upload | Quyền/purpose/parts/checksum/verification | Lưu file bền vững, upload/resume, chờ VERIFIED |
| Offline | Tiếp nhận có kiểm quyền, dedup, conflict và audit | Snapshot, local DB/file store, queue, recovery và trạng thái pending |
| Async job | Commit job/outbox trước response accepted; trạng thái bền vững | Theo dõi job; 202 không phải hoàn thành |
| Thông báo | Notification bền vững, lọc người nhận | Poll/refetch; socket nếu có chỉ là hint |
| Nghiệm thu | Kiểm actor/branch/evidence và transition | Hiển thị server-confirmed status; không optimistic ACCEPTED |

## 6. Những quy tắc cả BE và FE phải nhớ

- Fast Track chỉ áp dụng khi nhiệm vụ, assignment, policy, bằng chứng và điều kiện nghiệp vụ cho phép. Crew không tự hạ kết luận PM hoặc biến MEASURE_ONLY thành quyền sửa.
- Fast Track đủ điều kiện: Crew thực hiện → PM kiểm/đóng → báo Supervisor. Không thêm bước Supervisor duyệt sửa trước thi công trái yêu cầu đã chốt.
- BEFORE/AFTER gắn đúng lần thi công và giữ nguồn; không đổi ảnh AFTER thành BEFORE để vượt validation.
- Lưu trên máy, gửi thành công, file VERIFIED, PM kiểm, nghiệm thu và công bố là các trạng thái khác nhau.
- Tác nghiệp offline không tự hết quyền vì thời gian mất mạng; token API vẫn có hạn. Login lại trước sync khi cần, không xóa dữ liệu chưa gửi.
- Timeout/hủy request không chứng minh server rollback. Retry mutation cần dedup và key/payload ổn định.
- Sync trả200 không có nghĩa mọi operation thành công. Xử lý APPLIED/DUPLICATE/CONFLICT/REJECTED riêng, ACK đúng từng operation.
- Snapshot cũ không cấp quyền server hiện hành. Đổi đội/policy/hủy nhiệm vụ/khóa tài khoản cần xử lý conflict, không silent overwrite hoặc đổi actor để upload.
- Reporter chỉ xem projection công bố thuộc quyền mình, không toàn bộ Case nội bộ.
- Thứ tự lon/lat, đơn vị m/mm và nguồn thời gian phải rõ; không dùng GPS drone thay vị trí lỗi hoặc suy độ sâu từ bbox AI.

## 7. Trạng thái hiện tại và phần còn phải chốt

Định hướng hiện có: BE C#/.NET + SQL Server; Android Kotlin; AI Python qua adapter; web React/TypeScript/Vite là ứng viên chưa đối chiếu repository. Bộ tài liệu không xác nhận dependency version thực tế hoặc cho phép tự nâng/chuyển framework.

| Chủ đề | Baseline hiện tại / giới hạn |
|---|---|
| Auth | Email/password + OTP Reporter, bearer API đề xuất; OAuth/SSO và BFF web production chưa chốt |
| Pagination | Cursor + limit, không mặc nhiên có page/total/filter/sort mở rộng |
| Realtime | Polling MVP; WebSocket/SSE chưa có contract server hiện hành |
| API | 133 operations, 153 schemas ở bản đề xuất; chưa xác nhận BE đang chạy |
| Offline | App capture/sync đã có đặc tả; Fast Track evaluation/snapshot intake, upload reconciliation, device identity và dedup retention còn gaps |
| Conflict | Q04/Q17 về thay nhiệm vụ/quyền và cứu dữ liệu chưa chốt quy trình end-to-end |
| URL/quota | Chưa có hostname dev/staging/prod, quota và giới hạn file được xác nhận |
| Kiểm thử | Có 58 test FE và8 UAT FE, cộng bộ test nghiệp vụ; chưa chạy trên hệ thống thật |

Chi tiết tại [16 FE-GAP](09_Frontend/12_Decisions_Contract_Gaps.md). Q01–Q18 cũ được giữ ở tài liệu dự án; không tự đóng bằng cách implement một giả định. Feature có gap có thể làm mock/adapter có nhãn nhưng không được công bố hỗ trợ production đầy đủ.

## 8. Cách BE và FE triển khai chung một tính năng

1. **Chọn yêu cầu:** ghi FR/US/UC/AC và actor/scope; kiểm gap liên quan.
2. **Chốt contract:** thống nhất operationId, payload, response, status/error, permission, version, idempotency và async/offline behavior. Chưa đủ thì cập nhật gap, không tự thêm field ở một phía.
3. **BE triển khai:** DTO/validator → permission → domain → transaction/persistence/outbox → endpoint/error. Kiểm cả sai scope, stale version và timeout-after-commit.
4. **FE triển khai:** typed adapter/runtime validation → màn hình/trạng thái → form/error handling → cache/local store → retry/sync phù hợp. Mock dùng cùng contract và có nhãn.
5. **Tích hợp:** kiểm actual requests/responses, CORS/ETag/Location/Retry-After, login/refresh, upload và xử lý partial/unknown outcome.
6. **Nghiệm thu:** chạy AC/test đã map trong RTM; ghi bằng chứng và trạng thái thật. Cập nhật CR/change log khi quyết định thay đổi.

Mẫu mô tả task/PR:

```text
Feature / mục tiêu:
FR / US / UC / AC:
Actor và phạm vi:
Operation IDs + contract version/hash:
Tiền điều kiện / state transitions:
Error / permission / retry / offline cases:
Migration hoặc local recovery nếu có:
Test đã chạy + bằng chứng:
Gap còn mở / phần ngoài phạm vi:
```

## 9. Kiểm tra tài liệu và dữ liệu sinh tự động

Từ thư mục gốc, với Python3 có PyYAML:

```bat
python 09_Frontend\contracts\check_contracts.py
python 09_Frontend\contracts\build_contracts.py
python 09_Frontend\contracts\validate_package.py
```

Lệnh check chỉ kiểm hash; lệnh build **ghi lại** types/schema/catalog từ FE baseline hiện tại; chỉ chạy khi đã chọn đúng snapshot. Lệnh sau kiểm cấu trúc và fixtures, không compile TypeScript hoặc gọi API thật. Chọn generator/validator production theo repository và pin version.

Nếu sửa nội dung rồi chạy lại generation, hash trong manifest gói bàn giao không còn đại diện cho bản đã sửa. Tạo manifest mới khi phát hành gói mới, không sửa hash lịch sử để giả rằng bản cũ chưa từng thay đổi.

Một số nguồn cũ trỏ đến thiết kế/ADR/ERD không nằm trong bộ được cung cấp. Xem [danh sách tham chiếu thiếu](08_Delivery/04_Missing_Referenced_Documents.md); các mục này không được giả định là đã có nội dung hoặc đã được phê duyệt.

## 10. Quy tắc bảo trì bộ tài liệu

Giữ ID FR/BR/US/UC/TC/NFR ổn định. Số đầu tên file chỉ sắp xếp, không đổi ID nghiệp vụ. Dùng tên file không dấu với dấu `_`; ghi version/date/status trong nội dung hoặc Git, không tạo chuỗi `final_final(1)`.

Mỗi thay đổi phải xem ảnh hưởng đến requirements, business rules, DTO/schema, permission, sequence, FE, local migration và test. Liên kết Markdown dùng đường dẫn tương đối. Generated code sửa từ contract rồi sinh lại. Tài liệu08_Delivery là hồ sơ bàn giao/kiểm tra, không thay nguồn nghiệp vụ và không được dùng làm bằng chứng app đã pass.

## 11. REVIEW-01: kết quả rà soát rủi ro

Đã cập nhật auth401 catalog/YAML, FR-16/FR-22 và acceptance gates, kiểm hash trước validate/codegen. [Báo cáo](08_Delivery/05_Consistency_Risk_Review.md) phân biệt phần đã sửa với quyết định còn mở. [Sync evaluation amendment](05_Technical/06_Sync_Evaluation_Amendment_Proposal.md) là PROPOSED/NOT_ENABLED; main union vẫn3 kinds cho đến khi review đủ semantics. [Workshop Q02/Q03/Q04/Q17](07_Change_Management/03_Offline_Policy_Decision_Workshop.md) là agenda cần phê duyệt, không biên bản đã chốt. [CI gate](ci/README.md) đã có lệnh runnable; hash PASS không chứng minh app/UAT PASS.
