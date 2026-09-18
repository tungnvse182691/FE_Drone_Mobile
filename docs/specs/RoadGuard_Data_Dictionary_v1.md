# RoadGuard — Data Dictionary v1

Tài liệu này là từ điển dữ liệu mức logic cho RoadGuard. Nó được lập từ:

- `Build/RoadGuard_Domain_Model_v1.md`;
- `Build/RoadGuard_Entity_List_v2.md`;
- `V2/Dac_ta_UseCase_v2.md`;
- `V2/User_Stories_Acceptance_Criteria_v2.md`;
- `V2/Mo_ta_chi_tiet_cac_luong_RoadGuard_v2.md`;
- đề cương nghiên cứu `RoadGuard_Contractor_Warranty_Inspection_phuonglhk.md`.

## 1. Phạm vi và cách đọc

Data Dictionary mô tả tên trường chuẩn, kiểu dữ liệu logic, khả năng rỗng, khóa/tham chiếu và định nghĩa nghiệp vụ. Bản này đã điều chỉnh theo stack được chọn: **SQL Server + C# + Entity Framework Core**. Đây vẫn là từ điển dữ liệu mức logic; DDL/migration vật lý sẽ được tạo sau khi chốt các điểm ở mục 6.

Ký hiệu nguồn:

| Mã | Ý nghĩa |
|---|---|
| `SRC` | Có căn cứ trực tiếp từ User Story/Use Case hoặc quy tắc đã nêu trong Domain Model. |
| `DEC` | Quyết định thiết kế đã chốt: audit log riêng, Warranty riêng, QualityCheck hai cấp, SupplementarySurveyRequest độc lập và đo thực địa bắt buộc trước xác minh chính thức. |
| `PROP` | Đề xuất cần xác nhận khi chốt schema/API; không được hiểu là yêu cầu nghiệp vụ đã được nguồn bắt buộc. |

## 2. Quy ước dữ liệu dùng chung

### 2.1 Kiểu dữ liệu logic

| Kiểu | Quy ước |
|---|---|
| `UUID` | Định danh logic; ánh xạ SQL Server thành `uniqueidentifier`, khuyến nghị GUID tuần tự/UUIDv7 để giảm phân mảnh clustered index. |
| `TEXT` | Chuỗi dài, nội dung tự do hoặc ghi chú. |
| `VARCHAR(n)` | Chuỗi có giới hạn hiển thị/tra cứu. |
| `ENUM` | Tập giá trị hữu hạn; trong C# dùng `enum`; mặc định lưu SQL Server bằng `tinyint` với enum có underlying type `byte`, hoặc `int` khi cần miền giá trị lớn hơn. |
| `BOOLEAN` | Đúng/sai; không dùng `NULL` nếu đã có giá trị mặc định. |
| `INTEGER` | Số nguyên đếm được. |
| `DECIMAL(p,s)` | Số đo/tiền cần độ chính xác; toàn hệ thống dùng VND và tiền dùng `decimal(19,2)`, không dùng SQL Server `money`. |
| `TIMESTAMPTZ` | Kiểu logic; ánh xạ SQL Server thành `datetimeoffset(7)`, lưu UTC. |
| `DATE` | Ngày lịch, không có giờ. |
| `JSONB` | JSON có cấu trúc; ánh xạ SQL Server thành `nvarchar(max)` kèm `ISJSON`/computed column khi cần truy vấn. |
| `GEOMETRY` | Kiểu không gian SQL Server (`geometry` hoặc `geography`), không phải PostGIS; `LineString` cho đoạn đường, `Point` cho vị trí. |
| `CHECKSUM` | Chuỗi checksum, khuyến nghị SHA-256 dạng hex. |
| `URI` | Địa chỉ tham chiếu object storage hoặc tài nguyên nội bộ; không coi là nội dung tệp. |

### 2.2 Trường nền tảng

Các aggregate/entity có vòng đời thông thường dùng các trường sau, trừ log append-only hoặc entity immutable:

| Trường | Kiểu | Null | Định nghĩa |
|---|---|---:|---|
| `id` | `UUID` | Không | Khóa chính ổn định, không đổi trong toàn bộ vòng đời. |
| `created_at` | `TIMESTAMPTZ` | Không | Thời điểm tạo bản ghi, do server ghi. |
| `created_by_user_id` | `UUID` | Có | Người tạo; `NULL` nếu bản ghi do hệ thống tạo. FK tới `User.id`. |
| `updated_at` | `TIMESTAMPTZ` | Không | Thời điểm cập nhật metadata gần nhất; không dùng để thay thế lịch sử nghiệp vụ. |
| `version_no` | `INTEGER` | Có | Số phiên bản tăng dần đối với entity `[VER]`; bắt đầu từ 1. |
| `status` | `ENUM` | Có | Trạng thái vòng đời của entity; chỉ dùng khi entity có state machine. |

`AuditLog`, `PasswordResetLog`, `AccountStatusChangeLog`, `RetentionDeletionLog`, `RepairEvidence` và snapshot version là append-only: không update-in-place nội dung nghiệp vụ; nếu cần sửa phải tạo bản ghi/phiên bản mới.

### 2.3 Quy tắc khóa và tham chiếu

- Tên FK dùng hậu tố `_id`; tên tham chiếu phiên bản dùng `_version_id`.
- FK tới aggregate khác là tham chiếu logic; invariant liên aggregate phải được kiểm tra ở application/domain service.
- Không dùng polymorphic FK cho dữ liệu nghiệp vụ chính. `AuditLog.entity_type/entity_id` và `Notification.source_entity_type/source_entity_id` là ngoại lệ có chủ đích.
- Tất cả thời điểm nghiệp vụ dùng `TIMESTAMPTZ`; ngày hiệu lực bảo hành dùng `DATE` nếu không cần giờ.
- Không lưu password, access token, refresh token dạng plaintext trong bất kỳ log nào.

### 2.4 Ánh xạ SQL Server và C# / EF Core

| Kiểu logic | SQL Server | C# / EF Core | Ghi chú |
|---|---|---|---|
| `UUID` | `uniqueidentifier` | `Guid` | Dùng GUID tuần tự/UUIDv7 do ứng dụng tạo; tránh GUID ngẫu nhiên làm clustered key nếu bảng lớn. |
| `TEXT` | `nvarchar(max)` | `string` | Chỉ dùng cho nội dung dài; không tạo index trực tiếp. |
| `VARCHAR(n)` | `nvarchar(n)` | `string` | Ưu tiên Unicode vì tên/ngữ liệu tiếng Việt. |
| `BOOLEAN` | `bit` | `bool` | Có default rõ ràng, không nullable nếu không có trạng thái thứ ba. |
| `INTEGER` | `int` | `int` | Số thứ tự, số lượng nguyên. |
| `ENUM` | `tinyint` hoặc `int` | `enum : byte` hoặc `enum` mặc định `int` | Khuyến nghị `enum : byte` + `tinyint` cho status/scope; gán số explicit, không đổi/reorder giá trị đã phát hành. |
| `DECIMAL(p,s)` | `decimal(19,2)` cho tiền; `decimal(p,s)` theo phép đo | `decimal` | VND; không dùng `float/double` cho tiền. |
| `TIMESTAMPTZ` | `datetimeoffset(7)` | `DateTimeOffset` | Lưu UTC (`+00:00`), API trả ISO-8601. |
| `DATE` | `date` | `DateOnly` | Ngày không có múi giờ. |
| `JSONB` | `nvarchar(max)` + `CHECK (ISJSON(...)=1)` | `JsonDocument`, `JsonElement` hoặc owned type | Snapshot audit cần schema version và giới hạn kích thước. |
| `GEOMETRY` | `geometry`/`geography` | NetTopologySuite `Point`, `LineString`, `Polygon` | EF Core SQL Server cần bật NetTopologySuite. |
| `CHECKSUM` | `char(64)` | `string` | SHA-256 hex lowercase. |
| `URI` | `nvarchar(2048)` | `string` | Chỉ metadata URI, không chứa file binary. |

### 2.5 Chuẩn không gian và SRID

SQL Server không sử dụng PostGIS; `SRID` vẫn là mã hệ quy chiếu được lưu trên đối tượng `geometry`/`geography`. Đề xuất cho RoadGuard:

| Mục đích | Kiểu SQL Server | SRID | Quyết định |
|---|---|---:|---|
| GPS/raw location, điểm ảnh, vị trí bay | `geography` | `4326` (WGS 84) | Chuẩn nhập liệu mặc định, tọa độ kinh/vĩ độ, khoảng cách trả theo mét. |
| Đoạn đường và phép đo kỹ thuật cần mặt phẳng | `geometry` | `32648` hoặc `32649` | Chọn UTM zone theo kinh tuyến khu vực dự án; không được trộn hai zone trong cùng phép đo. |
| Dữ liệu VN-2000 theo hồ sơ trắc địa | `geometry` | SRID VN-2000 đã được cơ quan trắc địa xác nhận | Chỉ dùng khi dự án cung cấp đúng mã EPSG/SRID; phải lưu trong cấu hình dự án. |

Quy tắc vận hành: dữ liệu GPS nhập vào `geography(4326)`; khi cần tính chiều dài/diện tích/chồng lấn kỹ thuật, chuyển đổi có kiểm soát sang CRS phẳng của dự án. Mỗi geometry phải có đúng SRID của cột; cấm ghi tọa độ không rõ hệ quy chiếu hoặc tự gán `0`.

Trong Data Dictionary, trường `GEOMETRY(...)` là kiểu logic; DDL SQL Server phải ghi rõ `geography`/`geometry` và SRID tương ứng. Tên “PostGIS” trong các bản cũ được thay bằng “SQL Server Spatial”.

## 3. Từ điển trường theo entity

### 3.1 Auth & Access

#### `User` — tài khoản người dùng nội bộ

| Trường | Kiểu | Null | Khóa/Tham chiếu | Nguồn | Định nghĩa và ràng buộc |
|---|---|---:|---|---|---|
| `id` | UUID | Không | PK | SRC | Định danh tài khoản. |
| `username` | VARCHAR(100) | Không | UQ | SRC | Tên đăng nhập duy nhất. |
| `email` | VARCHAR(254) | Có | UQ khi có | PROP | Email nhận thông báo/khôi phục. |
| `display_name` | VARCHAR(200) | Không |  | SRC | Tên hiển thị. |
| `password_hash` | TEXT | Không |  | PROP | Hash mật khẩu; không bao giờ trả về API/log. |
| `role_code` | ENUM | Không | FK `Role.code` | SRC | Một trong bốn vai trò hệ thống. |
| `status` | ENUM | Không |  | SRC | `ACTIVE`, `SUSPENDED`, `PENDING`; suspended chặn đăng nhập/reset. |
| `must_change_password` | BOOLEAN | Không |  | SRC | Đặt `true` sau reset bắt buộc đổi ở lần đăng nhập kế tiếp. |
| `last_login_at` | TIMESTAMPTZ | Có |  | PROP | Lần đăng nhập thành công gần nhất. |
| `suspended_at` | TIMESTAMPTZ | Có |  | SRC | Thời điểm ngừng tài khoản. |
| `created_at` | TIMESTAMPTZ | Không |  | SRC | Thời điểm tạo. |

#### `Role` — danh mục vai trò

| Trường | Kiểu | Null | Khóa/Tham chiếu | Nguồn | Định nghĩa |
|---|---|---:|---|---|---|
| `code` | VARCHAR(40) | Không | PK | SRC | `SUPERVISOR`, `PM`, `DRONE_OPERATOR`, `REPAIR_CREW`. |
| `name` | VARCHAR(100) | Không |  | SRC | Tên hiển thị vai trò. |
| `is_active` | BOOLEAN | Không |  | PROP | Không cho gán mới nếu false; không xóa lịch sử. |

#### `Session` / `RefreshToken` — phiên xác thực

| Entity | Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---|---:|---|---|
| `Session` | `id` | UUID | Không | PK | Phiên đăng nhập. |
| `Session` | `user_id` | UUID | Không | FK `User.id` | Chủ phiên. |
| `Session` | `issued_at` | TIMESTAMPTZ | Không |  | Thời điểm cấp. |
| `Session` | `expires_at` | TIMESTAMPTZ | Không |  | Thời điểm hết hạn. |
| `Session` | `revoked_at` | TIMESTAMPTZ | Có |  | Thu hồi khi logout, reset password hoặc suspend. |
| `RefreshToken` | `id` | UUID | Không | PK | Định danh token record. |
| `RefreshToken` | `session_id` | UUID | Không | FK `Session.id` | Token thuộc phiên. |
| `RefreshToken` | `token_hash` | TEXT | Không | UQ | Chỉ lưu hash, không lưu token plaintext. |
| `RefreshToken` | `expires_at` | TIMESTAMPTZ | Không |  | Hạn token. |
| `RefreshToken` | `revoked_at` | TIMESTAMPTZ | Có |  | Thời điểm thu hồi. |

#### `PasswordResetLog` — nhật ký reset mật khẩu (giữ riêng)

| Trường | Kiểu | Null | Khóa/Tham chiếu | Nguồn | Định nghĩa |
|---|---|---:|---|---|---|
| `id` | UUID | Không | PK | DEC | Bản ghi append-only. |
| `target_user_id` | UUID | Không | FK `User.id` | DEC | Tài khoản được reset. |
| `performed_by_user_id` | UUID | Có | FK `User.id` | DEC | Người hoặc hệ thống thực hiện. |
| `occurred_at` | TIMESTAMPTZ | Không |  | DEC | Thời điểm xảy ra. |
| `reason` | TEXT | Có |  | DEC | Lý do reset. |
| `result` | ENUM | Không |  | DEC | `SUCCESS`, `FAILED`, `REJECTED`. |
| `source` | VARCHAR(80) | Không |  | DEC | Kênh/operation tạo log. |
| `correlation_id` | UUID | Có |  | DEC | Liên kết toàn bộ request/transaction. |

Không thêm `password`, `password_hash`, reset token hoặc secret vào entity này.

#### `AccountStatusChangeLog` — nhật ký thay đổi trạng thái tài khoản

| Trường | Kiểu | Null | Khóa/Tham chiếu | Nguồn | Định nghĩa |
|---|---|---:|---|---|---|
| `id` | UUID | Không | PK | DEC | Bản ghi append-only. |
| `target_user_id` | UUID | Không | FK `User.id` | DEC | Tài khoản bị thay đổi. |
| `changed_by_user_id` | UUID | Có | FK `User.id` | DEC | Người/hệ thống thay đổi. |
| `occurred_at` | TIMESTAMPTZ | Không |  | DEC | Thời điểm thay đổi. |
| `from_status` | ENUM | Không |  | DEC | Trạng thái trước. |
| `to_status` | ENUM | Không |  | DEC | Trạng thái sau; phải khác `from_status`. |
| `reason` | TEXT | Không |  | SRC/DEC | Lý do bắt buộc khi suspend/reopen. |
| `source` | VARCHAR(80) | Không |  | DEC | Operation/kênh nguồn. |
| `correlation_id` | UUID | Có |  | DEC | ID truy vết request. |
| `handover_reference` | UUID | Có |  | DEC | Tham chiếu danh sách bàn giao nếu có. |

#### `Notification` — thông báo trong hệ thống

| Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---:|---|---|
| `id` | UUID | Không | PK | Định danh thông báo. |
| `recipient_user_id` | UUID | Không | FK `User.id` | Người nhận. |
| `source_entity_type` | VARCHAR(80) | Không | Polymorphic | Loại entity phát sinh sự kiện. |
| `source_entity_id` | UUID | Không | Polymorphic | Entity phát sinh. |
| `event_type` | VARCHAR(80) | Không |  | Loại sự kiện được phép thông báo. |
| `title` | VARCHAR(200) | Không |  | Tiêu đề. |
| `body` | TEXT | Không |  | Nội dung hiển thị. |
| `read_at` | TIMESTAMPTZ | Có |  | Thời điểm đã đọc. |

### 3.2 Project, Road & Warranty

#### `Project`

| Trường | Kiểu | Null | Khóa/Tham chiếu | Nguồn | Định nghĩa |
|---|---|---:|---|---|---|
| `id` | UUID | Không | PK | SRC | Định danh dự án. |
| `project_code` | VARCHAR(50) | Không | UQ | SRC | Mã dự án duy nhất. |
| `name` | VARCHAR(255) | Không |  | SRC | Tên công trình. |
| `description` | TEXT | Có |  | PROP | Mô tả/phạm vi. |
| `status` | ENUM | Không |  | SRC | `PLANNING`, `ACTIVE`, `CLOSED`. Closed chặn tác nghiệp mới. |
| `start_date` | DATE | Có |  | PROP | Ngày bắt đầu. |
| `end_date` | DATE | Có |  | PROP | Ngày kết thúc thực tế. |
| `created_at` | TIMESTAMPTZ | Không |  | SRC | Thời điểm tạo. |

#### `ProjectMember`

| Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---:|---|---|
| `id` | UUID | Không | PK | Bản ghi phân quyền dự án. |
| `project_id` | UUID | Không | FK `Project.id` | Dự án được gán. |
| `user_id` | UUID | Không | FK `User.id` | Người được gán. |
| `role_code` | ENUM | Không | FK `Role.code` | Vai trò trong dự án. |
| `is_primary` | BOOLEAN | Không |  | Đánh dấu PM chính; mỗi dự án tối đa một bản ghi active. |
| `valid_from` | DATE | Không |  | Ngày hiệu lực. |
| `valid_to` | DATE | Có |  | Ngày hết hiệu lực. |
| `status` | ENUM | Không |  | `ACTIVE`, `ENDED`. |

#### `RoadSection` và `RoadSectionVersion`

| Entity | Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---|---:|---|---|
| `RoadSection` | `id` | UUID | Không | PK | Định danh đoạn đường logic. |
| `RoadSection` | `project_id` | UUID | Không | FK `Project.id` | Dự án sở hữu đoạn. |
| `RoadSection` | `code` | VARCHAR(80) | Không | UQ trong project | Mã đoạn. |
| `RoadSection` | `name` | VARCHAR(255) | Có |  | Tên/nhãn đoạn. |
| `RoadSection` | `current_version_id` | UUID | Không | FK `RoadSectionVersion.id` | Phiên bản hình học hiện hành. |
| `RoadSectionVersion` | `id` | UUID | Không | PK | Phiên bản bất biến. |
| `RoadSectionVersion` | `road_section_id` | UUID | Không | FK `RoadSection.id` | Đoạn logic gốc. |
| `RoadSectionVersion` | `version_no` | INTEGER | Không | UQ `(road_section_id, version_no)` | Số phiên bản tăng dần. |
| `RoadSectionVersion` | `geometry` | GEOMETRY(LineString) | Không | SPATIAL | Hình học đoạn tại thời điểm version. |
| `RoadSectionVersion` | `effective_from` | TIMESTAMPTZ | Không |  | Thời điểm có hiệu lực. |
| `RoadSectionVersion` | `change_reason` | TEXT | Không |  | Lý do tạo version. |

Mọi `Survey` và `Defect` có vị trí phải tham chiếu `road_section_version_id`, không chỉ `road_section_id`.

#### `HandoverDocument`

| Trường | Kiểu | Null | Khóa/Tham chiếu | Nguồn | Định nghĩa |
|---|---|---:|---|---|---|
| `id` | UUID | Không | PK | SRC | Hồ sơ bàn giao. |
| `project_id` | UUID | Không | FK `Project.id` | SRC | Dự án bàn giao. |
| `document_no` | VARCHAR(80) | Không | UQ trong project | SRC | Số biên bản/hồ sơ. |
| `handover_date` | DATE | Không |  | SRC | Ngày bàn giao/nghiệm thu. |
| `accepted_by_user_id` | UUID | Có | FK `User.id` | PROP | Người xác nhận trong hệ thống. |
| `file_id` | UUID | Có | FK `File.id` | SRC | Tệp hồ sơ. |
| `notes` | TEXT | Có |  | SRC | Ghi chú. |

`HandoverDocument` không có field `warranty_period`, `warranty_end_date` hoặc field đơn tương đương. Bảo hành nằm ở `Warranty`.

#### `Warranty` — aggregate độc lập

| Trường | Kiểu | Null | Khóa/Tham chiếu | Nguồn | Định nghĩa và ràng buộc |
|---|---|---:|---|---|---|
| `id` | UUID | Không | PK | DEC | Định danh giai đoạn bảo hành. |
| `project_id` | UUID | Không | FK `Project.id` | DEC | Dự án; một dự án có nhiều Warranty. |
| `road_section_id` | UUID | Có | FK `RoadSection.id` | DEC | Đoạn đường áp dụng; null nếu phạm vi toàn dự án. |
| `handover_document_id` | UUID | Có | FK `HandoverDocument.id` | PROP | Hồ sơ làm căn cứ. |
| `handover_date` | DATE | Không |  | SRC | Ngày bàn giao của giai đoạn. |
| `warranty_start_date` | DATE | Không |  | DEC | Ngày bắt đầu. |
| `warranty_end_date` | DATE | Không |  | SRC/DEC | Ngày kết thúc; phải >= ngày bắt đầu. |
| `retained_value` | DECIMAL(19,2) | Có |  | SRC | Giá trị giữ lại liên quan giai đoạn, tính bằng VND. |
| `scope` | ENUM | Không |  | DEC | `PROJECT`, `ROAD_SECTION`, `CONTRACT_ITEM`, `OTHER`. |
| `terms` | TEXT | Có |  | SRC | Điều khoản/phạm vi chi tiết. |
| `source_document_id` | UUID | Có | FK `File.id` | DEC | Tài liệu nguồn. |
| `status` | ENUM | Không |  | PROP | `PLANNED`, `ACTIVE`, `EXPIRED`, `SUSPENDED`. |

Ràng buộc: `warranty_end_date >= warranty_start_date`; không gộp nhiều giai đoạn vào một field hoặc một bản ghi HandoverDocument.

### 3.3 Survey & Quality

#### `SurveyPlan` và `SurveyPlanPostponement`

| Entity | Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---|---:|---|---|
| `SurveyPlan` | `id` | UUID | Không | PK | Kế hoạch khảo sát. |
| `SurveyPlan` | `project_id` | UUID | Không | FK `Project.id` | Dự án. |
| `SurveyPlan` | `road_section_id` | UUID | Không | FK `RoadSection.id` | Phạm vi đoạn. |
| `SurveyPlan` | `planned_start_at` | TIMESTAMPTZ | Không |  | Thời điểm dự kiến bắt đầu. |
| `SurveyPlan` | `planned_end_at` | TIMESTAMPTZ | Không |  | Thời điểm dự kiến kết thúc. |
| `SurveyPlan` | `survey_type` | ENUM | Không |  | `ORIGINAL`, `PERIODIC`, `SUPPLEMENTARY`. |
| `SurveyPlan` | `status` | ENUM | Không |  | `PLANNED`, `POSTPONED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. |
| `SurveyPlanPostponement` | `id` | UUID | Không | PK | Lịch sử hoãn, append-only. |
| `SurveyPlanPostponement` | `survey_plan_id` | UUID | Không | FK `SurveyPlan.id` | Kế hoạch bị hoãn. |
| `SurveyPlanPostponement` | `postponed_at` | TIMESTAMPTZ | Không |  | Thời điểm hoãn. |
| `SurveyPlanPostponement` | `reason` | TEXT | Không |  | Lý do bắt buộc. |
| `SurveyPlanPostponement` | `new_planned_start_at` | TIMESTAMPTZ | Có |  | Mốc mới nếu đã xác định. |

#### `SurveyRequest` và `SurveyAssignment`

| Entity | Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---|---:|---|---|
| `SurveyRequest` | `id` | UUID | Không | PK | Yêu cầu khảo sát độc lập với kế hoạch. |
| `SurveyRequest` | `project_id` | UUID | Không | FK `Project.id` | Dự án. |
| `SurveyRequest` | `road_section_id` | UUID | Không | FK `RoadSection.id` | Phạm vi khảo sát. |
| `SurveyRequest` | `survey_plan_id` | UUID | Có | FK `SurveyPlan.id` | Kế hoạch nguồn nếu có. |
| `SurveyRequest` | `requested_by_user_id` | UUID | Không | FK `User.id` | Người tạo yêu cầu. |
| `SurveyRequest` | `survey_type` | ENUM | Không |  | `ORIGINAL`, `PERIODIC`, `SUPPLEMENTARY`. |
| `SurveyRequest` | `status` | ENUM | Không |  | State machine theo US-05. |
| `SurveyRequest` | `requested_at` | TIMESTAMPTZ | Không |  | Thời điểm tạo. |
| `SurveyRequest` | `cancelled_at` | TIMESTAMPTZ | Có |  | Chỉ có nếu hủy hợp lệ trước server-confirm. |
| `SurveyRequest` | `cancellation_reason` | TEXT | Có |  | Lý do hủy. |
| `SurveyAssignment` | `id` | UUID | Không | PK | Một lần phân công/tiếp nhận. |
| `SurveyAssignment` | `survey_request_id` | UUID | Không | FK `SurveyRequest.id` | Yêu cầu được phân công. |
| `SurveyAssignment` | `operator_user_id` | UUID | Không | FK `User.id` | Drone Operator. |
| `SurveyAssignment` | `assigned_by_user_id` | UUID | Không | FK `User.id` | Người phân công. |
| `SurveyAssignment` | `assigned_at` | TIMESTAMPTZ | Không |  | Thời điểm phân công. |
| `SurveyAssignment` | `accepted_at` | TIMESTAMPTZ | Có |  | Thời điểm nhận. |
| `SurveyAssignment` | `rejected_at` | TIMESTAMPTZ | Có |  | Thời điểm từ chối. |
| `SurveyAssignment` | `rejection_reason` | TEXT | Có |  | Bắt buộc khi từ chối. |
| `SurveyAssignment` | `reassignment_reason` | TEXT | Có |  | Bắt buộc khi phân công lại. |
| `SurveyAssignment` | `ended_at` | TIMESTAMPTZ | Có |  | Kết thúc lần phân công. |

#### `Survey`, `Flight`, `DroneDevice`, `SurveyFile`

| Entity | Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---|---:|---|---|
| `Survey` | `id` | UUID | Không | PK | Aggregate khảo sát. |
| `Survey` | `survey_request_id` | UUID | Có | FK `SurveyRequest.id` | Yêu cầu nguồn. |
| `Survey` | `project_id` | UUID | Không | FK `Project.id` | Dự án. |
| `Survey` | `road_section_version_id` | UUID | Không | FK `RoadSectionVersion.id` | Hình học tại thời điểm khảo sát. |
| `Survey` | `survey_type` | ENUM | Không |  | `ORIGINAL`, `PERIODIC`, `SUPPLEMENTARY`. |
| `Survey` | `is_baseline_confirmed` | BOOLEAN | Không |  | Chỉ PM xác nhận sau khi vượt invariant cross-aggregate. |
| `Survey` | `baseline_confirmed_by_user_id` | UUID | Có | FK `User.id` | PM xác nhận baseline. |
| `Survey` | `baseline_confirmed_at` | TIMESTAMPTZ | Có |  | Thời điểm xác nhận. |
| `Survey` | `status` | ENUM | Không |  | `DRAFT`, `IN_PROGRESS`, `SUBMITTED`, `COMPLETED`, `CANCELLED`. |
| `Flight` | `id` | UUID | Không | PK | Một chuyến bay thuộc Survey. |
| `Flight` | `survey_id` | UUID | Không | FK `Survey.id` | Survey sở hữu. |
| `Flight` | `drone_device_id` | UUID | Có | FK `DroneDevice.id` | Thiết bị sử dụng. |
| `Flight` | `operator_user_id` | UUID | Không | FK `User.id` | Người vận hành. |
| `Flight` | `started_at` | TIMESTAMPTZ | Không |  | Bắt đầu bay. |
| `Flight` | `ended_at` | TIMESTAMPTZ | Có |  | Kết thúc bay. |
| `Flight` | `flight_no` | VARCHAR(80) | Không | UQ trong Survey | Mã chuyến. |
| `DroneDevice` | `id` | UUID | Không | PK | Thiết bị bay. |
| `DroneDevice` | `serial_no` | VARCHAR(120) | Không | UQ | Số serial. |
| `DroneDevice` | `model` | VARCHAR(120) | Có |  | Model thiết bị. |
| `DroneDevice` | `status` | ENUM | Không |  | `ACTIVE`, `MAINTENANCE`, `RETIRED`. |
| `DroneDevice` | `checklist_version` | VARCHAR(50) | Có |  | Phiên bản checklist. |
| `SurveyFile` | `id` | UUID | Không | PK | Tệp video/SRT thuộc Survey. |
| `SurveyFile` | `survey_id` | UUID | Không | FK `Survey.id` | Survey sở hữu. |
| `SurveyFile` | `flight_id` | UUID | Có | FK `Flight.id` | Chuyến bay nguồn. |
| `SurveyFile` | `file_id` | UUID | Không | FK `File.id` | Bản ghi tệp vật lý. |
| `SurveyFile` | `file_type` | ENUM | Không |  | `VIDEO`, `SRT`, `PHOTO`, `OTHER`. |
| `SurveyFile` | `capture_started_at` | TIMESTAMPTZ | Có |  | Thời điểm bắt đầu nội dung. |
| `SurveyFile` | `capture_ended_at` | TIMESTAMPTZ | Có |  | Thời điểm kết thúc nội dung. |
| `SurveyFile` | `sync_status` | ENUM | Không |  | `LOCAL`, `QUEUED`, `UPLOADING`, `SERVER_CONFIRMED`, `INVALID`. |
| `SurveyFile` | `checksum` | CHECKSUM | Không |  | Kiểm tra toàn vẹn. |

#### `QualityCheck` — kiểm tra hai cấp

| Trường | Kiểu | Null | Khóa/Tham chiếu | Nguồn | Định nghĩa và ràng buộc |
|---|---|---:|---|---|---|
| `id` | UUID | Không | PK | DEC | Aggregate kết quả kiểm tra. |
| `scope` | ENUM | Không |  | DEC | `SURVEY_FILE` hoặc `SURVEY_DATASET`. |
| `execution_stage` | ENUM | Không |  | DEC | `CLIENT_PRECHECK` (Drone App, sơ bộ) hoặc `SERVER_VALIDATION` (Backend, chính thức). |
| `survey_file_id` | UUID | Có | FK `SurveyFile.id` | DEC | Bắt buộc khi scope file; phải null khi dataset. |
| `survey_data_version_id` | UUID | Có | FK `SurveyDataVersion.id` | DEC | Bắt buộc khi scope dataset; phải null khi file. |
| `check_type` | ENUM | Không |  | SRC | `FORMAT`, `GEOLOCATION`, `TIME_SYNC`, `CLARITY`, `LIGHTING`, `COVERAGE`, `OVERLAP`, `COMPLETENESS`, `OTHER`. |
| `status` | ENUM | Không |  | SRC | `PENDING`, `PASSED`, `FAILED`, `WARNING`. |
| `measured_value` | JSONB | Có |  | PROP | Giá trị đo/chi tiết máy kiểm tra. |
| `threshold` | JSONB | Có |  | PROP | Ngưỡng áp dụng. |
| `message` | TEXT | Có |  | SRC | Mô tả kết quả/lỗi. |
| `checked_at` | TIMESTAMPTZ | Không |  | SRC | Thời điểm kiểm tra. |
| `checked_by` | ENUM | Không |  | DEC | `DRONE_APP` hoặc `BACKEND`; PM không phải tác nhân kiểm tra kỹ thuật. |
| `initiated_by_user_id` | UUID | Có | FK `User.id` | PROP | Drone Operator kích hoạt precheck; null khi Backend chạy tự động. |

DB phải enforce đúng một FK đích: `(scope = SURVEY_FILE AND survey_file_id IS NOT NULL AND survey_data_version_id IS NULL)` hoặc ngược lại. Kiểm tra dataset neo vào `SurveyDataVersion`, không lưu thêm `survey_id` trên QualityCheck. `CLIENT_PRECHECK` không được dùng để chuyển version sang `SERVER_CONFIRMED`; chỉ `SERVER_VALIDATION` do `BACKEND` thực hiện có hiệu lực xác nhận/chặn xử lý.

#### `SurveyDataVersion`

| Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---:|---|---|
| `id` | UUID | Không | PK | Phiên bản gói dữ liệu khảo sát. |
| `survey_id` | UUID | Không | FK `Survey.id` | Survey nguồn. |
| `version_no` | INTEGER | Không | UQ `(survey_id, version_no)` | Số version. |
| `status` | ENUM | Không |  | `DRAFT`, `UPLOADING`, `SERVER_CONFIRMED`, `INVALID`, `SUPERSEDED`. |
| `integrity_status` | ENUM | Không |  | `PENDING`, `PASSED`, `FAILED`. |
| `confirmed_at` | TIMESTAMPTZ | Có |  | Chỉ set khi server xác nhận đủ tệp/checksum. |
| `confirmed_by` | ENUM | Có |  | Chỉ `BACKEND`; Drone Operator/PM không tự xác nhận version. |
| `source_manifest` | JSONB | Không |  | Danh sách file/checksum tạo version. |

#### `SupplementarySurveyRequest` — aggregate độc lập

| Trường | Kiểu | Null | Khóa/Tham chiếu | Nguồn | Định nghĩa |
|---|---|---:|---|---|---|
| `id` | UUID | Không | PK | DEC | Định danh lượt yêu cầu bổ sung. |
| `survey_id` | UUID | Không | FK `Survey.id` | DEC | Khảo sát phát sinh yêu cầu; là context, không ownership. |
| `survey_request_id` | UUID | Có | FK `SurveyRequest.id` | DEC | Yêu cầu gốc nếu có. |
| `requested_by_user_id` | UUID | Không | FK `User.id` | SRC | Người/PM yêu cầu. |
| `reason` | TEXT | Không |  | SRC | Lý do phải bay bổ sung. |
| `requested_scope` | JSONB | Không |  | SRC | Vùng/phạm vi cần bổ sung. |
| `round_no` | INTEGER | Không | UQ `(survey_id, round_no)` | DEC | Số lượt bổ sung; tăng dần. |
| `status` | ENUM | Không |  | SRC | `REQUESTED`, `APPROVED`, `ASSIGNED`, `IN_PROGRESS`, `SUBMITTED`, `REJECTED`, `CANCELLED`. |
| `approved_by_user_id` | UUID | Có | FK `User.id` | SRC | Người duyệt. |
| `approved_at` | TIMESTAMPTZ | Có |  | SRC | Thời điểm duyệt. |
| `source_preservation_note` | TEXT | Có |  | SRC | Cách giữ dữ liệu cũ/nguồn gốc. |

Mọi lượt bổ sung giữ liên kết tới Survey/context và không xóa/ghi đè SurveyFile hoặc SurveyDataVersion cũ.

#### Đo đạc thực tế sản phẩm và Research Validation

`FieldInspectionTask` và `FieldInspectionAssignment` quản lý workflow bắt buộc của sản phẩm. `FieldInspectionSession` và `GroundTruthMeasurement` được dùng chung cho xác minh lỗi và nghiên cứu; `purpose` cùng các ràng buộc FK phân tách hai mục đích. Dữ liệu nghiên cứu có thể nhập từ Excel/giấy nhưng phải có định danh và liên kết đầy đủ.

##### `FieldInspectionTask`

| Trường | Kiểu SQL Server | Null | Khóa/Tham chiếu | Nguồn | Định nghĩa |
|---|---|---:|---|---|---|
| `id` | `uniqueidentifier` | Không | PK | SRC/DEC | Nhiệm vụ PM giao Repair Crew đo một Preliminary Defect. |
| `task_code` | `nvarchar(80)` | Không | UQ | DEC | Mã nhiệm vụ ổn định. |
| `project_id` | `uniqueidentifier` | Không | FK `Project.id` | SRC | Dự án của nhiệm vụ. |
| `defect_id` | `uniqueidentifier` | Không | FK `Defect.id` | SRC/DEC | Phải trỏ `Defect OPEN` khi tạo nhiệm vụ. |
| `survey_id` | `uniqueidentifier` | Không | FK `Survey.id` | SRC | Khảo sát sinh phát hiện AI sơ bộ. |
| `road_section_version_id` | `uniqueidentifier` | Không | FK `RoadSectionVersion.id` | SRC | Phải khớp version trên Defect. |
| `required_measurement_type` | `tinyint` | Không |  | SRC | Loại phép đo Repair Crew phải thực hiện. |
| `measurement_scope` | `nvarchar(max)` | Không | `ISJSON = 1` | SRC | Vị trí/phạm vi và các điểm cần đo. |
| `instructions` | `nvarchar(1000)` | Có |  | SRC | Dụng cụ, phương pháp hoặc hướng dẫn hiện trường. |
| `missing_information` | `nvarchar(1000)` | Có |  | SRC | Thông tin PM cần xác minh thêm. |
| `due_at` | `datetimeoffset(7)` | Không |  | SRC | Hạn hoàn tất nhiệm vụ. |
| `status` | `tinyint` | Không |  | SRC | `NEW_ASSIGNED`, `ACCEPTED`, `REJECTED`, `IN_PROGRESS`, `SUPPLEMENT_REQUIRED`, `SUBMITTED`, `COMPLETED`. |
| `assigned_by_user_id` | `uniqueidentifier` | Không | FK `User.id` | SRC | PM tạo/giao nhiệm vụ. |
| `review_decision` | `tinyint` | Có |  | SRC/DEC | `DEFECT_CONFIRMED`, `NO_DEFECT`; chỉ có khi `COMPLETED`. |
| `reviewed_by_user_id` | `uniqueidentifier` | Có | FK `User.id` | SRC | PM đánh giá kết quả. |
| `reviewed_at` | `datetimeoffset(7)` | Có |  | SRC | Thời điểm đánh giá cuối. |
| `review_reason` | `nvarchar(1000)` | Có |  | SRC | Bắt buộc khi `NO_DEFECT`; nhận xét khi xác nhận. |

##### `FieldInspectionAssignment`

| Trường | Kiểu SQL Server | Null | Khóa/Tham chiếu | Nguồn | Định nghĩa |
|---|---|---:|---|---|---|
| `id` | `uniqueidentifier` | Không | PK | DEC | Một lượt giao/bàn giao nhiệm vụ đo. |
| `field_inspection_task_id` | `uniqueidentifier` | Không | FK `FieldInspectionTask.id` | SRC | Nhiệm vụ được giao. |
| `assigned_to_user_id` | `uniqueidentifier` | Không | FK `User.id` | SRC | Đội trưởng Repair Crew nhận việc. |
| `assigned_by_user_id` | `uniqueidentifier` | Không | FK `User.id` | SRC | PM giao hoặc điều chuyển. |
| `assigned_at` | `datetimeoffset(7)` | Không |  | SRC | Thời điểm giao. |
| `ended_at` | `datetimeoffset(7)` | Có |  | SRC | Thời điểm lượt giao hết hiệu lực. |
| `status` | `tinyint` | Không |  | SRC | `ACTIVE`, `REJECTED`, `ENDED`. |
| `reason` | `nvarchar(1000)` | Có |  | SRC | Bắt buộc khi từ chối hoặc điều chuyển. |

Mỗi task chỉ có tối đa một assignment `ACTIVE`. Repair Crew chỉ được chuyển assignment sang `REJECTED` trước khi task được nhận; sau khi nhận, PM kết thúc assignment cũ và tạo assignment mới.

##### `FieldInspectionSession`

| Trường | Kiểu SQL Server | Null | Khóa/Tham chiếu | Nguồn | Định nghĩa |
|---|---|---:|---|---|---|
| `id` | `uniqueidentifier` | Không | PK | SRC/DEC | Định danh một phiên đo thực địa. |
| `purpose` | `tinyint` | Không |  | SRC/DEC | `DEFECT_VERIFICATION` hoặc `RESEARCH_VALIDATION`. |
| `field_inspection_task_id` | `uniqueidentifier` | Có | FK `FieldInspectionTask.id` | SRC/DEC | Bắt buộc với `DEFECT_VERIFICATION`; phải null với `RESEARCH_VALIDATION`. |
| `project_id` | `uniqueidentifier` | Không | FK `Project.id` | SRC/Research | Dự án. |
| `road_section_version_id` | `uniqueidentifier` | Không | FK `RoadSectionVersion.id` | SRC/Research | Hình học tại thời điểm đo. |
| `survey_id` | `uniqueidentifier` | Có | FK `Survey.id` | SRC/Research | Bắt buộc với xác minh sản phẩm; tùy chọn cho nghiên cứu. |
| `session_code` | `nvarchar(80)` | Không | UQ | SRC/Research | Mã phiên/đợt đo. |
| `inspector_user_id` | `uniqueidentifier` | Có | FK `User.id` | SRC/Research | Bắt buộc là Repair Crew đang được giao khi xác minh; có thể null khi import nghiên cứu. |
| `inspector_name` | `nvarchar(200)` | Không |  | SRC/Research | Tên người đo tại thời điểm thực hiện. |
| `conducted_at` | `datetimeoffset(7)` | Không |  | SRC/Research | Thời điểm đo. |
| `weather_condition` | `nvarchar(100)` | Có |  | SRC/Research | Điều kiện khô/mưa và bối cảnh hiện trường. |
| `method` | `nvarchar(200)` | Không |  | SRC/Research | Quy trình/thước đo sử dụng. |
| `status` | `tinyint` | Không |  | SRC/Research | `DRAFT`, `COMPLETED`, `IMPORTED`, `LOCKED`. |
| `evidence_file_id` | `uniqueidentifier` | Có | FK `File.id` | SRC/Research | Biên bản/ảnh tổng của phiên. |

##### `GroundTruthMeasurement`

| Trường | Kiểu SQL Server | Null | Khóa/Tham chiếu | Nguồn | Định nghĩa |
|---|---|---:|---|---|---|
| `id` | `uniqueidentifier` | Không | PK | SRC/Research | Định danh phép đo vật lý. |
| `field_inspection_session_id` | `uniqueidentifier` | Không | FK `FieldInspectionSession.id` | SRC/Research | Phiên đo. |
| `sample_id` | `nvarchar(100)` | Không | UQ trong session | SRC/Research | Mã mẫu duy nhất, dùng để ghép paired data. |
| `road_section_version_id` | `uniqueidentifier` | Không | FK `RoadSectionVersion.id` | SRC/Research | Đoạn đường tương ứng. |
| `survey_id` | `uniqueidentifier` | Có | FK `Survey.id` | SRC/Research | Survey dùng đối chiếu. |
| `defect_id` | `uniqueidentifier` | Có | FK `Defect.id` | SRC/Research | Bắt buộc trỏ `Defect OPEN` khi purpose là `DEFECT_VERIFICATION`; có thể null khi nghiên cứu. |
| `measurement_type` | `tinyint` | Không |  | SRC/Research | `DEPRESSION_DEPTH`, `SLAB_FAULTING_HEIGHT`, `SHOULDER_EROSION_EXTENT`. |
| `value` | `decimal(19,6)` | Không |  | SRC/Research | Giá trị đo gốc, không làm tròn mất độ chính xác. |
| `unit` | `nvarchar(20)` | Không |  | SRC/Research | Đơn vị, khuyến nghị `mm` cho độ sâu/chiều cao. |
| `location` | `geography` | Không | SRID 4326 | SRC/Research | Tọa độ điểm đo ngoài hiện trường. |
| `instrument_name` | `nvarchar(150)` | Không |  | SRC/Research | Tên dụng cụ, ví dụ straightedge/depth gauge. |
| `instrument_reference` | `nvarchar(150)` | Có |  | SRC/Research | Serial/calibration reference nếu có. |
| `measurement_method` | `nvarchar(500)` | Không |  | SRC/Research | Cách đặt thước, điểm chuẩn và quy trình đo. |
| `measured_by` | `nvarchar(200)` | Không |  | SRC/Research | Người thực hiện thực tế. |
| `measured_at` | `datetimeoffset(7)` | Không |  | SRC/Research | Thời điểm phép đo. |
| `evidence_file_id` | `uniqueidentifier` | Có | FK `File.id` | SRC/Research | Ảnh/biên bản chứng minh; nếu thiếu phải có lý do trong `notes`. |
| `notes` | `nvarchar(max)` | Có |  | SRC/Research | Ghi chú, lý do thiếu bằng chứng, outlier hoặc điều kiện đặc biệt. |

##### `DerivedMeasurement`

| Trường | Kiểu SQL Server | Null | Khóa/Tham chiếu | Nguồn | Định nghĩa |
|---|---|---:|---|---|---|
| `id` | `uniqueidentifier` | Không | PK | Research | Định danh số đo từ hệ thống. |
| `survey_data_version_id` | `uniqueidentifier` | Không | FK `SurveyDataVersion.id` | Research | Phiên bản dữ liệu dùng tính toán. |
| `road_section_version_id` | `uniqueidentifier` | Không | FK `RoadSectionVersion.id` | Research | Hình học tương ứng. |
| `defect_id` | `uniqueidentifier` | Có | FK `Defect.id` | Research | Lỗi được ghép nếu có. |
| `sample_id` | `nvarchar(100)` | Không | Logic ref | Research | Mã sample phải khớp `GroundTruthMeasurement.sample_id`. |
| `measurement_type` | `tinyint` | Không |  | Research | Cùng miền giá trị với ground truth. |
| `value` | `decimal(19,6)` | Không |  | Research | Số đo do DSM/surface model/pipeline tạo. |
| `unit` | `nvarchar(20)` | Không |  | Research | Đơn vị chuẩn hóa. |
| `uncertainty_estimate` | `decimal(19,6)` | Có |  | Research | Ước lượng uncertainty của phép đo nếu pipeline cung cấp. |
| `source_type` | `tinyint` | Không |  | Research | `SURFACE_MODEL`, `DSM`, `MANUAL_DERIVED`, `OTHER`. |
| `algorithm_version` | `nvarchar(100)` | Có |  | Research | Phiên bản pipeline/model. |
| `computed_at` | `datetimeoffset(7)` | Không |  | Research | Thời điểm tính. |
| `status` | `tinyint` | Không |  | Research | `DRAFT`, `PUBLISHED`, `SUPERSEDED`. |

##### `MeasurementValidationRun` và `MeasurementValidationSample`

| Entity | Trường | Kiểu SQL Server | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---|---:|---|---|
| `MeasurementValidationRun` | `id` | `uniqueidentifier` | Không | PK | Một lần phân tích validation. |
| `MeasurementValidationRun` | `run_code` | `nvarchar(100)` | Không | UQ | Mã thí nghiệm/lần chạy. |
| `MeasurementValidationRun` | `measurement_type` | `tinyint` | Không |  | Loại phép đo được đánh giá. |
| `MeasurementValidationRun` | `method_name` | `nvarchar(200)` | Không |  | Phương pháp/model. |
| `MeasurementValidationRun` | `algorithm_version` | `nvarchar(100)` | Có |  | Version pipeline. |
| `MeasurementValidationRun` | `sample_count` | `int` | Không |  | Số mẫu hợp lệ. |
| `MeasurementValidationRun` | `bias` | `decimal(19,6)` | Có |  | Sai số trung bình có dấu. |
| `MeasurementValidationRun` | `mae` | `decimal(19,6)` | Có |  | Mean Absolute Error. |
| `MeasurementValidationRun` | `rmse` | `decimal(19,6)` | Có |  | Root Mean Square Error. |
| `MeasurementValidationRun` | `uncertainty_value` | `decimal(19,6)` | Có |  | Giá trị uncertainty được báo cáo. |
| `MeasurementValidationRun` | `uncertainty_method` | `nvarchar(500)` | Có |  | Phương pháp/giả định tính uncertainty. |
| `MeasurementValidationRun` | `status` | `tinyint` | Không |  | `DRAFT`, `COMPLETED`, `PUBLISHED`. |
| `MeasurementValidationSample` | `id` | `uniqueidentifier` | Không | PK | Một cặp mẫu trong run. |
| `MeasurementValidationSample` | `validation_run_id` | `uniqueidentifier` | Không | FK `MeasurementValidationRun.id` | Run sở hữu. |
| `MeasurementValidationSample` | `ground_truth_measurement_id` | `uniqueidentifier` | Không | FK `GroundTruthMeasurement.id` | Số đo vật lý. |
| `MeasurementValidationSample` | `derived_measurement_id` | `uniqueidentifier` | Không | FK `DerivedMeasurement.id` | Số đo drone/surface model. |
| `MeasurementValidationSample` | `signed_error` | `decimal(19,6)` | Không |  | `derived - ground_truth`. |
| `MeasurementValidationSample` | `absolute_error` | `decimal(19,6)` | Không |  | Trị tuyệt đối sai số. |
| `MeasurementValidationSample` | `inclusion_status` | `tinyint` | Không |  | `INCLUDED`, `EXCLUDED`, `OUTLIER`. |
| `MeasurementValidationSample` | `exclusion_reason` | `nvarchar(500)` | Có |  | Bắt buộc khi loại mẫu. |

Các entity research này là immutable/append-only sau khi khóa phiên hoặc công bố kết quả; không tự tạo Defect và không kết luận thuộc/ngoài Warranty.

### 3.4 Processing và AI

#### `ProcessingBlock`, `ProcessingJob`, `ProcessingAttempt`

| Entity | Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---|---:|---|---|
| `ProcessingBlock` | `id` | UUID | Không | PK | Khối backend chia từ một data version. |
| `ProcessingBlock` | `survey_data_version_id` | UUID | Không | FK `SurveyDataVersion.id` | Dữ liệu nguồn. |
| `ProcessingBlock` | `block_no` | INTEGER | Không | UQ trong version | Số thứ tự khối. |
| `ProcessingBlock` | `range_metadata` | JSONB | Không |  | Phạm vi thời gian/tọa độ của khối. |
| `ProcessingJob` | `id` | UUID | Không | PK | Tác vụ xử lý AI cho một block. |
| `ProcessingJob` | `processing_block_id` | UUID | Không | FK `ProcessingBlock.id` | Block nguồn. |
| `ProcessingJob` | `model_version_id` | UUID | Không | FK `AIModelVersion.id` | Model chạy tác vụ. |
| `ProcessingJob` | `status` | ENUM | Không |  | `QUEUED`, `RUNNING`, `RETRYABLE_FAILURE`, `DATA_FAILURE`, `COMPLETED`, `CANCELLED`. |
| `ProcessingJob` | `started_at` | TIMESTAMPTZ | Có |  | Bắt đầu xử lý. |
| `ProcessingJob` | `completed_at` | TIMESTAMPTZ | Có |  | Kết thúc. |
| `ProcessingJob` | `error_code` | VARCHAR(80) | Có |  | Mã lỗi chuẩn hóa. |
| `ProcessingJob` | `error_message` | TEXT | Có |  | Chi tiết lỗi không chứa secret. |
| `ProcessingAttempt` | `id` | UUID | Không | PK | Một lần thử; append-only. |
| `ProcessingAttempt` | `processing_job_id` | UUID | Không | FK `ProcessingJob.id` | Job nguồn. |
| `ProcessingAttempt` | `attempt_no` | INTEGER | Không | UQ trong job | Số lần thử. |
| `ProcessingAttempt` | `started_at` | TIMESTAMPTZ | Không |  | Bắt đầu. |
| `ProcessingAttempt` | `ended_at` | TIMESTAMPTZ | Có |  | Kết thúc. |
| `ProcessingAttempt` | `error_type` | ENUM | Có |  | `INFRASTRUCTURE`, `DATA`, `NONE`. Chỉ lỗi hạ tầng được retry. |
| `ProcessingAttempt` | `worker_reference` | VARCHAR(120) | Có |  | ID worker/queue. |

#### `AIModelVersion`

| Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---:|---|---|
| `id` | UUID | Không | PK | Phiên bản model. |
| `model_name` | VARCHAR(120) | Không |  | Tên model. |
| `version_label` | VARCHAR(80) | Không | UQ | Nhãn version. |
| `artifact_uri` | URI | Không |  | Vị trí artifact. |
| `metrics` | JSONB | Có |  | Chỉ số đánh giá. |
| `operating_thresholds` | JSONB | Có |  | Ngưỡng vận hành. |
| `status` | ENUM | Không |  | `DRAFT`, `RELEASED`, `RETIRED`. |
| `released_at` | TIMESTAMPTZ | Có |  | Thời điểm phát hành. |
| `released_by_user_id` | UUID | Có | FK `User.id` | Người phát hành. |

#### `AIDetection`

| Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---:|---|---|
| `id` | UUID | Không | PK | Kết quả AI thô, immutable. |
| `processing_job_id` | UUID | Không | FK `ProcessingJob.id` | Job tạo kết quả. |
| `model_version_id` | UUID | Không | FK `AIModelVersion.id` | Model bất biến đã dùng. |
| `road_section_version_id` | UUID | Có | FK `RoadSectionVersion.id` | Hình học tham chiếu. |
| `geometry` | GEOMETRY(Point/Polygon) | Có | SPATIAL | Vị trí/biên dạng phát hiện. |
| `defect_type_code` | VARCHAR(80) | Có | FK `DefectType.code` | Loại lỗi dự kiến. |
| `confidence` | DECIMAL(6,5) | Không | 0..1 | Độ tin cậy AI. |
| `estimated_width` | DECIMAL(12,3) | Có |  | Ước lượng 2D. |
| `estimated_length` | DECIMAL(12,3) | Có |  | Ước lượng 2D. |
| `raw_payload` | JSONB | Không |  | Payload gốc; không chỉnh sửa. |

#### `Defect`, `DefectVerificationLog`, `DefectMergeDecision`, `DefectMatch`

| Entity | Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---|---:|---|---|
| `Defect` | `id` | UUID | Không | PK | Lỗi nghiệp vụ; `OPEN` là Preliminary Defect, `VERIFIED` là hư hỏng chính thức sau đo đạt. |
| `Defect` | `project_id` | UUID | Không | FK `Project.id` | Dự án. |
| `Defect` | `road_section_version_id` | UUID | Không | FK `RoadSectionVersion.id` | Version hình học tại kỳ phát hiện. |
| `Defect` | `source_ai_detection_id` | UUID | Có | FK `AIDetection.id` | Phát hiện AI nguồn nếu có. |
| `Defect` | `defect_type_code` | VARCHAR(80) | Không | FK `DefectType.code` | Loại lỗi. |
| `Defect` | `cause_category_code` | VARCHAR(80) | Có | FK `CauseCategory.code` | Nhóm nguyên nhân. |
| `Defect` | `severity` | ENUM | Không |  | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. |
| `Defect` | `status` | ENUM | Không |  | `OPEN`, `VERIFIED`, `REJECTED`, `RESOLVED`; không cho `OPEN` vào đợt sửa. |
| `Defect` | `geometry` | GEOMETRY(Point/Line/Polygon) | Không | SPATIAL | Vị trí lỗi. |
| `Defect` | `reported_at` | TIMESTAMPTZ | Không |  | Thời điểm ghi nhận. |
| `DefectVerificationLog` | `id` | UUID | Không | PK | Lịch sử quyết định PM, append-only. |
| `DefectVerificationLog` | `defect_id` | UUID | Có | FK `Defect.id` | Đích khi log quyết định trên Preliminary Defect/hư hỏng. |
| `DefectVerificationLog` | `ai_detection_id` | UUID | Có | FK `AIDetection.id` | Đích khi PM loại/giữ chờ một phát hiện AI trước khi tạo Defect. |
| `DefectVerificationLog` | `action` | ENUM | Không |  | `PRELIMINARY_KEEP`, `ADJUST`, `CONFIRM`, `REJECT`, `MERGE`. |
| `DefectVerificationLog` | `before_snapshot` | JSONB | Có |  | Giá trị trước quyết định. |
| `DefectVerificationLog` | `after_snapshot` | JSONB | Có |  | Giá trị sau quyết định. |
| `DefectVerificationLog` | `severity_rule_version_id` | UUID | Có | FK `SeverityRuleVersion.id` | Rule version tại thời điểm tính severity. |
| `DefectVerificationLog` | `field_inspection_task_id` | UUID | Có | FK `FieldInspectionTask.id` | Bắt buộc với `CONFIRM` và với `REJECT` khi trạng thái trước là `OPEN`. |
| `DefectVerificationLog` | `verified_by_user_id` | UUID | Không | FK `User.id` | PM thực hiện. |
| `DefectVerificationLog` | `reason` | TEXT | Không |  | Lý do bắt buộc. |
| `DefectMergeDecision` | `id` | UUID | Không | PK | Quyết định gộp/giữ riêng. |
| `DefectMergeDecision` | `source_defect_id` | UUID | Không | FK `Defect.id` | Lỗi nguồn. |
| `DefectMergeDecision` | `target_defect_id` | UUID | Có | FK `Defect.id` | Lỗi đích khi gộp. |
| `DefectMergeDecision` | `decision` | ENUM | Không |  | `MERGE`, `KEEP_SEPARATE`. |
| `DefectMergeDecision` | `decided_by_user_id` | UUID | Không | FK `User.id` | Người quyết định. |
| `DefectMatch` | `id` | UUID | Không | PK | Liên kết đối sánh hai kỳ. |
| `DefectMatch` | `defect_id_a` | UUID | Không | FK `Defect.id` | Lỗi kỳ A. |
| `DefectMatch` | `defect_id_b` | UUID | Không | FK `Defect.id` | Lỗi kỳ B. |
| `DefectMatch` | `match_confidence` | DECIMAL(6,5) | Không | 0..1 | Độ tin cậy đối sánh. |
| `DefectMatch` | `match_method` | ENUM | Không |  | `AI`, `RULE`, `MANUAL`. |
| `DefectMatch` | `reviewed_by_user_id` | UUID | Có | FK `User.id` | Người duyệt đối sánh. |

### 3.5 Danh mục và huấn luyện AI

| Entity | Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---|---:|---|---|
| `DefectType` | `code` | VARCHAR(80) | Không | PK | Mã loại lỗi. |
| `DefectType` | `name` | VARCHAR(150) | Không |  | Tên loại lỗi. |
| `DefectType` | `description` | TEXT | Có |  | Định nghĩa. |
| `DefectType` | `is_active` | BOOLEAN | Không |  | Ngừng dùng không xóa lịch sử. |
| `CauseCategory` | `code` | VARCHAR(80) | Không | PK | Mã nhóm nguyên nhân. |
| `CauseCategory` | `name` | VARCHAR(150) | Không |  | Tên nhóm. |
| `CauseCategory` | `is_active` | BOOLEAN | Không |  | Trạng thái sử dụng. |
| `SeverityRuleVersion` | `id` | UUID | Không | PK | Phiên bản rule phân mức. |
| `SeverityRuleVersion` | `standard_code` | VARCHAR(80) | Không |  | Chuẩn áp dụng. |
| `SeverityRuleVersion` | `road_type_code` | VARCHAR(80) | Không |  | Loại mặt đường. |
| `SeverityRuleVersion` | `version_no` | INTEGER | Không | UQ theo scope | Số phiên bản. |
| `SeverityRuleVersion` | `rule_definition` | JSONB | Không |  | Công thức/ngưỡng. |
| `SeverityRuleVersion` | `effective_from` | DATE | Không |  | Ngày hiệu lực. |
| `SeverityRuleVersion` | `effective_to` | DATE | Có |  | Ngày hết hiệu lực. |
| `TrainingLabelApproval` | `id` | UUID | Không | PK | Quyết định duyệt nhãn. |
| `TrainingLabelApproval` | `defect_id` | UUID | Không | FK `Defect.id` | Lỗi/nhãn được duyệt. |
| `TrainingLabelApproval` | `label_payload` | JSONB | Không |  | Nhãn dùng huấn luyện. |
| `TrainingLabelApproval` | `status` | ENUM | Không |  | `PENDING`, `APPROVED`, `REJECTED`. |
| `TrainingLabelApproval` | `approved_by_user_id` | UUID | Có | FK `User.id` | PM duyệt. |
| `TrainingLabelApproval` | `approved_at` | TIMESTAMPTZ | Có |  | Thời điểm duyệt. |
| `TrainingDatasetExport` | `id` | UUID | Không | PK | Lần xuất dataset huấn luyện. |
| `TrainingDatasetExport` | `requested_by_user_id` | UUID | Không | FK `User.id` | Người yêu cầu. |
| `TrainingDatasetExport` | `filter_snapshot` | JSONB | Không |  | Bộ lọc tại thời điểm xuất. |
| `TrainingDatasetExport` | `file_id` | UUID | Có | FK `File.id` | File xuất. |
| `TrainingDatasetExport` | `status` | ENUM | Không |  | `REQUESTED`, `GENERATING`, `COMPLETED`, `FAILED`. |

### 3.6 Repair

| Entity | Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---|---:|---|---|
| `RepairBatch` | `id` | UUID | Không | PK | Đợt sửa logic. |
| `RepairBatch` | `project_id` | UUID | Không | FK `Project.id` | Dự án. |
| `RepairBatch` | `current_version_id` | UUID | Có | FK `RepairBatchVersion.id` | Version hiện hành. |
| `RepairBatch` | `status` | ENUM | Không |  | Trạng thái tổng hợp đợt. |
| `RepairBatchVersion` | `id` | UUID | Không | PK | Version trình duyệt, immutable sau khi trình. |
| `RepairBatchVersion` | `repair_batch_id` | UUID | Không | FK `RepairBatch.id` | Đợt gốc. |
| `RepairBatchVersion` | `version_no` | INTEGER | Không | UQ trong batch | Số version. |
| `RepairBatchVersion` | `status` | ENUM | Không |  | `DRAFT`, `PENDING_APPROVAL`, `REVISION_REQUIRED`, `APPROVED`, `REJECTED`. |
| `RepairBatchVersion` | `estimated_total_cost` | DECIMAL(19,2) | Không |  | Tổng dự toán snapshot bằng tổng `RepairItem.estimated_cost` trong version, tính bằng VND; không nhập thủ công. |
| `RepairBatchVersion` | `submitted_at` | TIMESTAMPTZ | Có |  | Thời điểm trình. |
| `RepairBatchVersion` | `approved_at` | TIMESTAMPTZ | Có |  | Thời điểm duyệt. |
| `RepairItem` | `id` | UUID | Không | PK | Lỗi trong một version; version mới copy item mới. |
| `RepairItem` | `repair_batch_version_id` | UUID | Không | FK `RepairBatchVersion.id` | Version sở hữu. |
| `RepairItem` | `defect_id` | UUID | Không | FK `Defect.id` | Chỉ `Defect VERIFIED` có task đo `COMPLETED`/`DEFECT_CONFIRMED`. |
| `RepairItem` | `estimated_cost` | DECIMAL(19,2) | Không |  | Chi phí dự toán, tính bằng VND. |
| `RepairItem` | `status` | ENUM | Không |  | Trạng thái theo lỗi. |
| `RepairApprovalDecision` | `id` | UUID | Không | PK | Quyết định duyệt/trả theo item. |
| `RepairApprovalDecision` | `repair_batch_version_id` | UUID | Không | FK `RepairBatchVersion.id` | Version được xét. |
| `RepairApprovalDecision` | `repair_item_id` | UUID | Không | FK `RepairItem.id` | Item được xét. |
| `RepairApprovalDecision` | `decision` | ENUM | Không |  | `APPROVED`, `REJECTED`, `REVISION_REQUIRED`. |
| `RepairApprovalDecision` | `decided_by_user_id` | UUID | Không | FK `User.id` | Supervisor. |
| `RepairApprovalDecision` | `reason` | TEXT | Có |  | Bắt buộc khi trả. |
| `RepairAssignment` | `id` | UUID | Không | PK | Phân công đội trưởng. |
| `RepairAssignment` | `repair_batch_version_id` | UUID | Không | FK `RepairBatchVersion.id` | Chỉ version APPROVED/current. |
| `RepairAssignment` | `crew_lead_user_id` | UUID | Không | FK `User.id` | Đội trưởng. |
| `RepairAssignment` | `assigned_by_user_id` | UUID | Không | FK `User.id` | PM phân công. |
| `RepairAssignment` | `assigned_at` | TIMESTAMPTZ | Không |  | Thời điểm giao. |
| `RepairAssignment` | `ended_at` | TIMESTAMPTZ | Có |  | Thời điểm bàn giao/kết thúc. |
| `RepairAssignment` | `handover_reason` | TEXT | Có |  | Bắt buộc khi đổi đội trưởng. |
| `RepairProgress` | `id` | UUID | Không | PK | Bản ghi tiến độ append-only. |
| `RepairProgress` | `repair_item_id` | UUID | Không | FK `RepairItem.id` | Lỗi đang thi công. |
| `RepairProgress` | `status` | ENUM | Không |  | `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `REVISION_REQUIRED`, `COMPLETED`. |
| `RepairProgress` | `actual_cost` | DECIMAL(19,2) | Có |  | Chi phí thực tế, tính bằng VND. |
| `RepairProgress` | `recorded_by_user_id` | UUID | Không | FK `User.id` | Người ghi. |
| `RepairProgress` | `recorded_at` | TIMESTAMPTZ | Không |  | Thời điểm ghi. |
| `RepairEvidence` | `id` | UUID | Không | PK | Bằng chứng ảnh/tệp theo lỗi. |
| `RepairEvidence` | `repair_item_id` | UUID | Không | FK `RepairItem.id` | Lỗi được chứng minh. |
| `RepairEvidence` | `file_id` | UUID | Không | FK `File.id` | Tệp bằng chứng. |
| `RepairEvidence` | `evidence_stage` | ENUM | Không |  | `BEFORE`, `DURING`, `AFTER`. |
| `RepairEvidence` | `captured_at` | TIMESTAMPTZ | Không |  | Thời điểm chụp. |
| `RepairEvidence` | `location` | GEOMETRY(Point) | Có | SPATIAL | Vị trí chụp. |
| `RepairEvidence` | `note` | TEXT | Có |  | Ghi chú. |
| `UnplannedDefectReport` | `id` | UUID | Không | PK | Báo cáo lỗi ngoài phạm vi. |
| `UnplannedDefectReport` | `project_id` | UUID | Không | FK `Project.id` | Dự án. |
| `UnplannedDefectReport` | `repair_batch_id` | UUID | Có | FK `RepairBatch.id` | Đợt liên quan để tham chiếu, không tự thêm item. |
| `UnplannedDefectReport` | `reported_by_user_id` | UUID | Không | FK `User.id` | Người báo cáo. |
| `UnplannedDefectReport` | `description` | TEXT | Không |  | Mô tả lỗi phát sinh. |
| `UnplannedDefectReport` | `status` | ENUM | Không |  | `REPORTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`. |
| `RepairInspectionResult` | `id` | UUID | Không | PK | Kết quả nghiệm thu theo item. |
| `RepairInspectionResult` | `repair_item_id` | UUID | Không | FK `RepairItem.id` | Item được kiểm tra. |
| `RepairInspectionResult` | `result` | ENUM | Không |  | `PASSED`, `FAILED`. |
| `RepairInspectionResult` | `inspected_by_user_id` | UUID | Không | FK `User.id` | PM/Supervisor. |
| `RepairInspectionResult` | `inspected_at` | TIMESTAMPTZ | Không |  | Thời điểm kiểm tra. |
| `RepairInspectionResult` | `reason` | TEXT | Có |  | Bắt buộc khi FAILED. |

Ràng buộc rút gọn `UD-06`: PM chỉ nhập `RepairItem.estimated_cost`; không có cột biện pháp, vật liệu, khối lượng hoặc ưu tiên. `estimated_cost >= 0`, `actual_cost >= 0` khi có; `(repair_batch_version_id, defect_id)` là duy nhất. Backend tính và lưu `estimated_total_cost` khi tạo/trình version.

### 3.7 File, Evidence, Audit và Export

#### `File`

| Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---:|---|---|
| `id` | UUID | Không | PK | Bản ghi metadata tệp. |
| `storage_uri` | URI | Không | UQ | Vị trí object storage. |
| `original_name` | VARCHAR(255) | Không |  | Tên tệp gốc. |
| `mime_type` | VARCHAR(120) | Không |  | MIME type. |
| `size_bytes` | INTEGER | Không |  | Kích thước. |
| `checksum` | CHECKSUM | Không |  | SHA-256. |
| `uploaded_by_user_id` | UUID | Có | FK `User.id` | Người tải lên. |
| `uploaded_at` | TIMESTAMPTZ | Không |  | Thời điểm tải. |
| `retention_until` | DATE | Có |  | Hạn lưu trữ tính theo chính sách. |

#### `Evidence`

| Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---:|---|---|
| `id` | UUID | Không | PK | Bản ghi liên kết bằng chứng. |
| `file_id` | UUID | Không | FK `File.id` | Tệp vật lý. |
| `defect_id` | UUID | Có | FK `Defect.id` | Đích lỗi nếu có. |
| `repair_item_id` | UUID | Có | FK `RepairItem.id` | Đích item nếu có. |
| `handover_document_id` | UUID | Có | FK `HandoverDocument.id` | Đích hồ sơ bàn giao nếu có. |
| `evidence_type` | ENUM | Không |  | Loại bằng chứng. |
| `note` | TEXT | Có |  | Ghi chú. |

CHECK bắt buộc đúng một trong các FK nghiệp vụ đích là non-null; mở rộng thêm đích phải cập nhật constraint/schema.

#### `AuditLog` — event sink chung

| Trường | Kiểu | Null | Khóa/Tham chiếu | Nguồn | Định nghĩa |
|---|---|---:|---|---|---|
| `id` | UUID | Không | PK | SRC | Event audit append-only. |
| `actor_user_id` | UUID | Có | FK `User.id` | SRC | Người gây ra sự kiện; null nếu hệ thống. |
| `occurred_at` | TIMESTAMPTZ | Không |  | SRC | Thời điểm sự kiện. |
| `event_type` | VARCHAR(100) | Không |  | SRC | Tên domain event/operation. |
| `entity_type` | VARCHAR(100) | Không |  | SRC | Loại aggregate/entity đích. |
| `entity_id` | UUID | Không | Polymorphic | SRC | ID entity đích. |
| `before_snapshot` | JSONB | Có |  | SRC | Trạng thái trước. |
| `after_snapshot` | JSONB | Có |  | SRC | Trạng thái sau. |
| `reason` | TEXT | Có |  | SRC | Lý do/ghi chú. |
| `source` | VARCHAR(80) | Không |  | SRC | API, mobile, worker, admin... |
| `correlation_id` | UUID | Có |  | SRC | Truy vết request. |

`AuditLog` không thay thế `PasswordResetLog` hoặc `AccountStatusChangeLog`; không lưu secret.

#### `ReportExport`

| Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---:|---|---|
| `id` | UUID | Không | PK | Lần xuất báo cáo. |
| `requested_by_user_id` | UUID | Không | FK `User.id` | Người xuất. |
| `project_id` | UUID | Có | FK `Project.id` | Phạm vi dự án. |
| `filter_snapshot` | JSONB | Không |  | Bộ lọc đã áp dụng. |
| `data_version_snapshot` | JSONB | Không |  | Version dữ liệu dùng để xuất. |
| `format` | ENUM | Không |  | `PDF`, `ZIP`, `CSV`, `OTHER`. |
| `status` | ENUM | Không |  | `REQUESTED`, `GENERATING`, `COMPLETED`, `FAILED`. |
| `file_id` | UUID | Có | FK `File.id` | Tệp kết quả. |
| `error_message` | TEXT | Có |  | Lỗi tạo tệp. |

### 3.8 Administration & Retention

| Entity | Trường | Kiểu | Null | Khóa/Tham chiếu | Định nghĩa |
|---|---|---|---:|---|---|
| `ReminderRule` | `id` | UUID | Không | PK | Cấu hình nhắc việc. |
| `ReminderRule` | `rule_type` | ENUM | Không |  | `SURVEY_DUE`, `WARRANTY_EXPIRY`. |
| `ReminderRule` | `days_before` | INTEGER | Không |  | Số ngày nhắc trước hạn. |
| `ReminderRule` | `is_active` | BOOLEAN | Không |  | Trạng thái cấu hình. |
| `ReminderRule` | `configured_by_user_id` | UUID | Không | FK `User.id` | Admin cấu hình. |
| `DataRetentionRequest` | `id` | UUID | Không | PK | Yêu cầu xóa dữ liệu hết hạn. |
| `DataRetentionRequest` | `scope_snapshot` | JSONB | Không |  | Phạm vi hồ sơ yêu cầu xóa. |
| `DataRetentionRequest` | `requested_by_user_id` | UUID | Không | FK `User.id` | PM lập yêu cầu. |
| `DataRetentionRequest` | `status` | ENUM | Không |  | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `EXECUTED`, `BLOCKED`. |
| `DataRetentionRequest` | `retention_basis` | TEXT | Không |  | Căn cứ hết hạn bảo hành + thời hạn lưu trữ. |
| `DataRetentionRequest` | `reviewed_by_user_id` | UUID | Có | FK `User.id` | Supervisor xem xét. |
| `DataRetentionRequest` | `review_reason` | TEXT | Có |  | Lý do duyệt/từ chối/block. |
| `LegalHold` | `id` | UUID | Không | PK | Lệnh giữ hồ sơ. |
| `LegalHold` | `scope_snapshot` | JSONB | Không |  | Phạm vi bị giữ. |
| `LegalHold` | `reason` | TEXT | Không |  | Căn cứ tranh chấp/pháp lý. |
| `LegalHold` | `status` | ENUM | Không |  | `ACTIVE`, `RELEASED`. |
| `LegalHold` | `placed_by_user_id` | UUID | Không | FK `User.id` | Người thiết lập. |
| `LegalHold` | `released_by_user_id` | UUID | Có | FK `User.id` | Người gỡ giữ. |
| `RetentionDeletionLog` | `id` | UUID | Không | PK | Biên bản xóa append-only. |
| `RetentionDeletionLog` | `retention_request_id` | UUID | Không | FK `DataRetentionRequest.id` | Yêu cầu được thực thi. |
| `RetentionDeletionLog` | `approved_by_user_id` | UUID | Không | FK `User.id` | Supervisor phê duyệt. |
| `RetentionDeletionLog` | `executed_at` | TIMESTAMPTZ | Không |  | Thời điểm xóa. |
| `RetentionDeletionLog` | `result` | ENUM | Không |  | `SUCCESS`, `PARTIAL`, `FAILED`. |
| `RetentionDeletionLog` | `deleted_scope_snapshot` | JSONB | Không |  | Phạm vi thực tế đã xóa. |
| `RetentionDeletionLog` | `error_message` | TEXT | Có |  | Lỗi nếu có. |

## 4. Enum và trạng thái chuẩn

Đây là bộ giá trị logic đề xuất cho API/database. Tên hiển thị tiếng Việt có thể đặt ở lớp i18n, không dùng làm giá trị lưu trữ. Với C#, các enum trạng thái/scope nên khai báo `enum : byte` và gán số cố định; EF Core lưu thành SQL Server `tinyint`. Nếu có enum cần hơn 255 giá trị thì dùng `enum` mặc định `int` và SQL Server `int`.

Ví dụ:

```csharp
public enum QualityCheckScope : byte
{
    Unknown = 0,
    SurveyFile = 1,
    SurveyDataset = 2
}

public enum QualityCheckStatus : byte
{
    Unknown = 0,
    Pending = 1,
    Passed = 2,
    Failed = 3,
    Warning = 4
}
```

Không đổi hoặc sắp xếp lại số đã phát hành. Khi thêm giá trị, thêm số mới ở cuối; migration CSDL không cần đổi kiểu cột nhưng phải cập nhật validation/API/client.

| Nhóm | Giá trị |
|---|---|
| User status | `ACTIVE`, `SUSPENDED`, `PENDING` |
| Project status | `PLANNING`, `ACTIVE`, `CLOSED` |
| Survey request status | `NEW_ASSIGNED`, `ACCEPTED`, `REJECTED`, `REASSIGNED`, `IN_PROGRESS`, `SUBMITTED`, `SUPPLEMENT_REQUIRED`, `COMPLETED`, `CANCELLED`, `POSTPONED` |
| Quality check status | `PENDING`, `PASSED`, `FAILED`, `WARNING` |
| Quality check scope | `SURVEY_FILE`, `SURVEY_DATASET` |
| Quality check execution stage | `CLIENT_PRECHECK`, `SERVER_VALIDATION` |
| Quality check actor | `DRONE_APP`, `BACKEND` |
| Measurement type | `DEPRESSION_DEPTH`, `SLAB_FAULTING_HEIGHT`, `SHOULDER_EROSION_EXTENT` |
| Field inspection task status | `NEW_ASSIGNED`, `ACCEPTED`, `REJECTED`, `IN_PROGRESS`, `SUPPLEMENT_REQUIRED`, `SUBMITTED`, `COMPLETED` |
| Field inspection assignment status | `ACTIVE`, `REJECTED`, `ENDED` |
| Field inspection purpose | `DEFECT_VERIFICATION`, `RESEARCH_VALIDATION` |
| Field inspection review decision | `DEFECT_CONFIRMED`, `NO_DEFECT` |
| Derived measurement source | `SURFACE_MODEL`, `DSM`, `MANUAL_DERIVED`, `OTHER` |
| Measurement validation sample | `INCLUDED`, `EXCLUDED`, `OUTLIER` |
| Research record status | `DRAFT`, `COMPLETED`, `IMPORTED`, `LOCKED`, `PUBLISHED`, `SUPERSEDED` |
| Processing status | `QUEUED`, `RUNNING`, `RETRYABLE_FAILURE`, `DATA_FAILURE`, `COMPLETED`, `CANCELLED` |
| Defect status | `OPEN`, `VERIFIED`, `REJECTED`, `RESOLVED` |
| Repair batch version | `DRAFT`, `PENDING_APPROVAL`, `REVISION_REQUIRED`, `APPROVED`, `REJECTED` |
| Retention status | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `EXECUTED`, `BLOCKED` |

Không tự ý đổi tên enum ở API sau khi triển khai; nếu cần đổi nhãn hiển thị, chỉ đổi bản dịch.

## 5. Ràng buộc dữ liệu quan trọng

1. `Project.project_code` duy nhất.
2. Một `Project` chỉ có tối đa một `ProjectMember` PM chính đang active tại một thời điểm.
3. `Warranty` có thể có nhiều bản ghi trên cùng `project_id`; thời gian/phạm vi nằm trên từng bản ghi.
4. `HandoverDocument` không có field đơn đại diện cho toàn bộ bảo hành.
5. `QualityCheck` phải có đúng một đích theo `scope`; `CLIENT_PRECHECK` phải do `DRONE_APP`, `SERVER_VALIDATION` phải do `BACKEND`, và chỉ cặp thứ hai có quyền xác nhận/chặn xử lý.
6. `SupplementarySurveyRequest` là aggregate độc lập; nhiều lượt được phân biệt bằng `round_no` trong cùng `survey_id`.
7. `SurveyDataVersion.status = SERVER_CONFIRMED` chỉ do Backend/System Worker thiết lập sau khi đủ file, checksum hợp lệ và các `SERVER_VALIDATION` bắt buộc đạt; kiểm tra của Drone App chỉ là precheck, PM chỉ quyết định bay bổ sung.
8. Versioned entity không update-in-place nội dung đã trình/xác nhận; tạo version mới.
9. `Evidence` phải có đúng một FK nghiệp vụ đích; file gốc không bị ghi đè.
10. Mọi log audit append-only; không lưu password, token, secret hoặc dữ liệu xác thực plaintext.
11. Mỗi `GroundTruthMeasurement` phải có `sample_id` duy nhất trong session, measurement type, value, unit, instrument, observer, time, location và bằng chứng hoặc lý do thiếu.
12. Mỗi `MeasurementValidationSample` phải ghép đúng một ground truth với một derived measurement cùng `sample_id` và cùng measurement type; không ghép theo thứ tự nhập liệu.
13. `MeasurementValidationRun.sample_count` chỉ đếm mẫu `INCLUDED`; mẫu `OUTLIER`/`EXCLUDED` phải giữ nguyên và có lý do.
14. Mỗi `Defect OPEN` được PM giữ lại phải có `FieldInspectionTask`; một task chỉ có tối đa một `FieldInspectionAssignment ACTIVE`.
15. `FieldInspectionSession.purpose = DEFECT_VERIFICATION` bắt buộc có `field_inspection_task_id`, `survey_id`, Repair Crew hợp lệ và các phép đo trỏ đúng `defect_id`; `RESEARCH_VALIDATION` phải để `field_inspection_task_id` null.
16. `DefectVerificationLog` phải có đúng một trong `ai_detection_id` hoặc `defect_id`. Chỉ PM được hoàn tất task và chuyển `Defect OPEN` sang `VERIFIED`/`REJECTED`; `VERIFIED` yêu cầu task `COMPLETED`, quyết định `DEFECT_CONFIRMED` và có session/phép đo đã gửi hoặc khóa.
17. Chỉ tạo `RepairItem` cho `Defect VERIFIED` thỏa điều kiện đo đạt; chặn lỗi `OPEN`, `REJECTED`, task chưa hoàn tất hoặc đang yêu cầu bổ sung.
18. Research Validation Track không tự tạo/chuyển trạng thái `Defect`, không tự chuyển `Warranty` và không thay thế quyết định PM trong workflow TN01-TN12/AI13.
19. PM chỉ nhập `RepairItem.estimated_cost`; hệ thống tính `RepairBatchVersion.estimated_total_cost` từ các item. Không lưu biện pháp, vật liệu, khối lượng hoặc ưu tiên trên `RepairItem`.

## 6. Chính sách bảo mật, PII và lưu trữ — đề xuất để review

Các chính sách dưới đây là đề xuất kỹ thuật, không tự kết luận nghĩa vụ pháp lý. Cần đối chiếu với chính sách an toàn thông tin và thời hạn lưu trữ hợp đồng của tổ chức trước khi ban hành chính thức.

### 6.1 Phân loại dữ liệu

| Mức | Dữ liệu RoadGuard | Quy tắc tối thiểu |
|---|---|---|
| `PUBLIC` | Mã loại lỗi/nguyên nhân đã công bố, tài liệu không nhạy cảm | Có thể hiển thị sau khi kiểm tra phạm vi. |
| `INTERNAL` | Mã dự án, trạng thái xử lý, metadata thiết bị | Chỉ người dùng đã đăng nhập và có quyền dự án. |
| `CONFIDENTIAL` | Bản đồ đoạn đường, ảnh/video khảo sát, chi phí, Warranty, Repair | Mã hóa khi truyền/lưu; kiểm soát theo project và vai trò; không public URL. |
| `RESTRICTED` | `password_hash`, token hash, PII, audit snapshot có thông tin cá nhân, legal hold | Chỉ service/role tối thiểu; che/mã hóa; cấm ghi log ứng dụng; truy cập phải có audit. |

### 6.2 Identity, secret và quyền truy cập

1. Dùng ASP.NET Core Identity/PasswordHasher hoặc thư viện chuẩn; không tự viết thuật toán hash mật khẩu. Không lưu password, reset token, refresh token plaintext.
2. Secret kết nối SQL Server, khóa mã hóa và credential object storage để ở Secret Manager/Azure Key Vault/Windows Certificate Store; không để trong source code, `appsettings.json` commit vào repository hoặc `AuditLog`.
3. SQL Server dùng tài khoản ứng dụng riêng, quyền tối thiểu theo schema; migration/deployment dùng tài khoản khác. Không cấp `db_owner` cho runtime.
4. API kiểm tra quyền theo `ProjectMember`; các truy vấn dashboard/export phải lọc project ở server. Có thể bổ sung SQL Server Row-Level Security khi cần lớp phòng vệ thứ hai.
5. Dùng TLS cho API và kết nối SQL Server; bật encryption in transit và kiểm tra certificate, không dùng `TrustServerCertificate=true` ở production.

### 6.3 Bảo vệ PII và snapshot audit

1. PII tối thiểu gồm `email`, `display_name`, IP/device metadata nếu thu thập. Chỉ lưu khi có mục đích; đặt `pii_purpose`/retention theo chính sách nội bộ nếu cần.
2. `AuditLog.before_snapshot`, `after_snapshot`, `source_manifest` và filter snapshot dùng allow-list field. Redact các khóa có tên `password`, `token`, `secret`, `authorization`, `cookie`, `connectionString` và dữ liệu nhạy cảm không phục vụ truy vết.
3. SQL Server bật TDE cho database và mã hóa backup; TDE không thay thế kiểm soát quyền hoặc mã hóa field. Với PII cần chống cả DBA đọc trực tiếp, cân nhắc Always Encrypted cho các cột cụ thể sau PoC.
4. Audit log append-only ở tầng ứng dụng và DB: role runtime không được `UPDATE/DELETE`; sửa sai bằng correction event, không ghi đè. Có thể partition theo `occurred_at` và lưu checksum/hash chain nếu yêu cầu chống sửa đổi mạnh hơn.

### 6.4 File/object storage

1. Bucket/container private; API cấp URL tải ngắn hạn (SAS/presigned URL) theo quyền project, không lưu public URL.
2. Khi upload: kiểm tra kích thước/MIME thực tế, quét malware, tính SHA-256, lưu checksum vào `File`, và ghi nhận kết quả kiểm tra. Không tin `original_name` hoặc MIME do client gửi.
3. Tệp gốc của khảo sát, bằng chứng sửa chữa và hồ sơ bàn giao là immutable về nội dung; bản chỉnh sửa tạo `File`/version mới.
4. Bản sao backup phải mã hóa và kiểm tra restore định kỳ. Khi có `LegalHold`, khóa xóa cả metadata và object tương ứng.

### 6.5 Retention, xóa và phục hồi

1. Giữ hồ sơ nghiệp vụ tối thiểu đến hết thời hạn Warranty cộng 5 năm theo User Story; `retention_until` phải tính từ Warranty phù hợp và lưu căn cứ trong `DataRetentionRequest.retention_basis`.
2. `AuditLog`, `PasswordResetLog`, `AccountStatusChangeLog` và `RetentionDeletionLog` đề xuất giữ tối thiểu bằng thời hạn hồ sơ liên quan, hoặc lâu hơn theo chính sách compliance; không tự đặt thời hạn pháp lý nếu chưa được phê duyệt.
3. Job retention chạy ở chế độ **dry-run** trước; tạo `DataRetentionRequest`, kiểm tra `LegalHold`, yêu cầu Supervisor phê duyệt, sau đó mới xóa đúng snapshot phạm vi. Không cascade xóa ngoài phạm vi được duyệt.
4. Xóa phải ghi `RetentionDeletionLog` với request, người duyệt, thời điểm, phạm vi và kết quả. Backup có lifecycle riêng; phải ghi rõ thời điểm bản sao hết hạn, không tuyên bố đã xóa hoàn toàn nếu backup còn tồn tại.
5. Có quy trình khôi phục và kiểm tra tính toàn vẹn; khôi phục dữ liệu không được làm mất audit history hoặc tạo bản ghi trùng.

### 6.6 Logging và vận hành

- Log ứng dụng chỉ ghi `correlation_id`, event code, entity id và kết quả; không ghi request body chứa PII/secret.
- Alert khi có nhiều lần reset thất bại, truy cập ngoài project, tải file bất thường, thay đổi quyền, hoặc xóa bị block bởi LegalHold.
- Đồng bộ thời gian máy chủ bằng NTP; tất cả `datetimeoffset` lưu UTC để điều tra sự kiện nhất quán.

### 6.7 Các lựa chọn kỹ thuật đã chốt theo yêu cầu hiện tại

| Hạng mục | Quyết định |
|---|---|
| Database | SQL Server; dùng SQL Server Spatial, không dùng PostGIS. |
| Ngôn ngữ/ORM | C# + Entity Framework Core. |
| Enum | C# enum; ưu tiên underlying `byte` + SQL Server `tinyint` cho status/scope; `int` khi cần. |
| Tiền tệ | Chỉ VND; tiền dùng `decimal(19,2)`; không cần `currency_code` trong từng entity. |
| Thời gian | `DateTimeOffset`/`datetimeoffset(7)`, lưu UTC. |
| SRID mặc định | GPS `geography(4326)`; geometry kỹ thuật dùng UTM `32648` hoặc `32649` theo khu vực; VN-2000 chỉ khi có mã được xác nhận. |

### 6.8 Tài liệu kỹ thuật nên dùng khi triển khai

- [SQL Server spatial data types overview](https://learn.microsoft.com/en-us/sql/relational-databases/spatial/spatial-data-types-overview)
- [EF Core value conversions](https://learn.microsoft.com/en-us/ef/core/modeling/value-conversions)
- [EF Core SQL Server provider](https://learn.microsoft.com/en-us/ef/core/providers/sql-server/)
- [ASP.NET Core Data Protection](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/introduction)
- [ASP.NET Core logging](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/logging/)

## 7. Ma trận truy vết

| Chủ đề | Entity/field chính | Nguồn |
|---|---|---|
| Audit và log riêng | `PasswordResetLog`, `AccountStatusChangeLog`, `AuditLog.*` | `UD-01`, CN10, QT01, QT09 |
| Nhiều giai đoạn bảo hành | `Warranty.*`, không có warranty field trong `HandoverDocument` | `UD-02`, DA04-DA05, QT05, QT11-QT13 |
| QualityCheck hai cấp và đúng tác nhân | `QualityCheck.scope`, `execution_stage`, `checked_by`, `survey_file_id`, `survey_data_version_id` | `UD-03`, KS08-KS10, US-06, US-07 |
| Yêu cầu khảo sát bổ sung | `SupplementarySurveyRequest.*`, `round_no`, `survey_id` | `UD-04`, KS11-KS12, US-07 |
| Version hình học | `RoadSectionVersion`, `road_section_version_id` | US-03 mục 3 |
| Hủy yêu cầu khảo sát | `SurveyDataVersion.status` | US-05 mục 5 |
| Retry xử lý | `ProcessingAttempt.error_type` | US-07, US-18 |
| Đo thực địa bắt buộc | `FieldInspectionTask`, `FieldInspectionAssignment`, `FieldInspectionSession.purpose` | `UD-05`, AI13, TN01-TN12, US-20 |
| Xác minh hư hỏng chính thức | `Defect.status`, `DefectVerificationLog.field_inspection_task_id`, `GroundTruthMeasurement.defect_id` | `UD-05`, AI04-AI07, TN05, US-08, US-20 |
| Giữ lịch sử sửa chữa | `RepairBatchVersion`, `RepairItem`, `RepairEvidence` | US-11 đến US-14 |
| Rút gọn chi phí sửa chữa | `RepairItem.estimated_cost`, `RepairBatchVersion.estimated_total_cost` | `UD-06`, SC02-SC03, US-11 |
| Ground truth nghiên cứu | `FieldInspectionSession`, `GroundTruthMeasurement` | Đề cương, RS01-RS03 |
| Đối chiếu measurement uncertainty | `DerivedMeasurement`, `MeasurementValidationRun`, `MeasurementValidationSample` | Đề cương, RS04-RS06 |

## 8. Trạng thái tài liệu

Đây là bản Data Dictionary logic v1 để review. Các trường gắn `PROP` là đề xuất triển khai, cần xác nhận trước khi đóng băng DDL. Các quyết định `DEC` là yêu cầu thiết kế đã chốt và phải được giữ nguyên khi chuyển sang ERD, API contract và migration. Workflow đo thực địa TN01-TN12/AI13 thuộc hệ thống sản phẩm hiện tại; Research Validation là mục đích độc lập dùng chung cấu trúc số đo nhưng không tự kết luận nghiệp vụ.
