# User Story và Acceptance Criteria - RoadGuard / CÁT TƯỜNG

> Thiết kế mục tiêu đồng bộ 22/09/2026; các phần Reporter, IncidentCase, segment, coverage và AI ngoài là đề xuất chưa triển khai. Phạm vi bàn giao BE — 18/09/2026: đợt hiện tại phát triển backend ASP.NET Core; Android/Web thuộc FE, AI thật và thu thập số đo thực địa là tích hợp bên ngoài ở giai đoạn sau. Backend vẫn triển khai đầy đủ workflow bắt buộc, adapter AI giả lập xác định và chức năng Research Validation nhập/ghép/tính sai số/xuất báo cáo bằng dữ liệu kiểm thử hoặc dữ liệu ngoài đã có. Nghiệm thu phần mềm BE không tuyên bố độ chính xác AI hay kết quả thực nghiệm từ dữ liệu giả. Các yêu cầu sản phẩm/nghiên cứu đầy đủ bên dưới vẫn được giữ để truy vết. Xem [ADR 003](../08_Delivery/04_Missing_Referenced_Documents.md#missing-01).

> **[THÊM UC-D29 — R3 ngày 26/09/2026]** Sửa trực tiếp story/AC cũ. Giữ mã cũ; phần **BỎ** là điều kiện ngừng áp dụng; **THAY THẾ** chỉ rõ dùng AC nào thay; **THÊM** là story/AC mới. US-21–26 trước chỉ có ở trace được bổ sung thân; US-28–32 giữ mã và ý nghĩa Sprint 1, không dùng lại cho nghiệp vụ khác. US-33–41 là mã mới. AC ký hiệu US-xx-AC-nn thuộc bản R3, không nhận là test đã chạy.
>
> Nguồn luật: [Business Rules](02_Business_Rules.md); [FRD/SRS](01_FRD_SRS.md); [To-Be Process](03_To_Be_Process.md). Q01–Q18 theo mô tả dự án; AC có nhãn **ĐỀ XUẤT/TBD** không phải cổng nghiệm thu đã chốt. Công nghệ nghiên cứu trong FRD không ép đổi code hiện có.

## 1. Mục đích và phạm vi

Tài liệu này chuyển đặc tả use case trong [UseCase.md](04_Use_Cases.md) thành các User Story lớn theo nhóm nghiệp vụ. Mỗi story giữ mã chức năng nguồn để truy vết và có Acceptance Criteria theo dạng **Given / When / Then**.

Phạm vi là **MVP hiện tại** của hệ thống RoadGuard, gồm Android App cho Drone Operator/Repair Crew/Reporter, Web Dashboard cho Supervisor/PM, Backend C# + SQL Server/SQL Server Spatial theo [Data_Dictionary.md](../03_Data/01_Data_Dictionary.md), và hệ AI ngoài qua adapter/job bất đồng bộ. Mock chỉ để kiểm thử hợp đồng, luôn gắn nguồn; các phần mới là thiết kế chưa triển khai.

### 1.1 Ranh giới MVP và phần nghiên cứu

> **[THAY THẾ UC-D29]** Bỏ cách đặt đo thực địa/Reporter dưới tiêu đề “ngoài phạm vi”. Hai luồng này thuộc sản phẩm khi được giao triển khai; chỉ pipeline AI nâng cao/điều khiển bay được phân biệt như dưới đây.

- `AI13` và `TN01-TN07, TN12` là luồng đo thực địa khi PM cần số đo vật lý hoặc bằng chứng chưa đủ; không phải tiền điều kiện chung cho mọi phát hiện. Ground truth nghiên cứu `RS01–RS06` vẫn bắt buộc và độc lập.
- `AI02` (ảnh trực giao/mô hình bề mặt) và các phép đo phụ thuộc pipeline nâng cao: không phải điều kiện nghiệm thu MVP sản phẩm. Tuy nhiên, **Research Validation Track của đề cương là bắt buộc**: phải thu thập ground truth vật lý cho mẫu depression/slab faulting và đối chiếu với số đo drone để báo cáo measurement uncertainty.
- Điều khiển thiết bị bay; hệ thống chỉ tiếp nhận dữ liệu do thiết bị bay tạo ra.
- Reporter là vai trò thứ năm, subtype `CITIZEN` hoặc `INVESTOR_REPRESENTATIVE`; gửi và xem phản ánh của mình qua ownership, không cần membership dự án hoặc quyền xem dữ liệu sửa chữa nội bộ.
- Cam kết độ chính xác địa lý, độ sâu hoặc thời điểm hỏng chỉ từ đầu ra YOLO/bounding box.

### 1.1A Phần nghiên cứu bắt buộc nhưng tách khỏi MVP sản phẩm

Đề cương yêu cầu một track validation độc lập với các User Story sản phẩm. Track này có thể thu thập ngoài app bằng Excel/giấy, nhưng dữ liệu cuối cùng phải được chuẩn hóa và có định danh để tái hiện phân tích.

| Mã | Yêu cầu bắt buộc | Tiêu chí nghiệm thu nghiên cứu |
|---|---|---|
| `RS01` | Chọn mẫu đoạn/điểm đo và liên kết với survey/road section version. | Mỗi mẫu có `sample_id` duy nhất. |
| `RS02` | Kỹ sư đo depression depth và slab faulting bằng straightedge/depth gauge. | Có giá trị, đơn vị, dụng cụ, người đo, thời điểm, tọa độ và bằng chứng. |
| `RS03` | Ghi metadata và chain of custody cho từng phép đo. | Có phương pháp, dụng cụ, người đo, thời điểm, điều kiện hiện trường và bằng chứng. |
| `RS04` | Ghép số đo thực địa với số đo surface model/DSM tương ứng. | Mỗi cặp có `ground_truth_measurement_id` và `derived_measurement_id`; không ghép theo vị trí dòng Excel. |
| `RS05` | Tính độ chính xác và độ không chắc chắn. | Báo bias, MAE/RMSE, số mẫu và phương pháp/giả định tính toán theo loại phép đo. |
| `RS06` | Đưa mẫu paired vào dataset và báo cáo field trial. | Nêu rõ outlier, mẫu thiếu, điều kiện khô/mưa nếu có và giới hạn suy luận. |

`RS01–RS06` là tính năng đo đạc phục vụ nghiên cứu; kết quả chỉ dùng để đánh giá mô hình và phép đo.

### 1.2 Vai trò

| Vai trò | Trách nhiệm trong MVP |
|---|---|
| Supervisor (Admin) | Tạo dự án, giao PM, xác nhận version tuyến theo quyền kế thừa; duyệt từng item/kết quả nhánh cần duyệt, đóng hồ sơ hỗn hợp; nhận báo cáo Fast Track, quản trị. |
| PM | **[THAY THẾ UC-D20/22/26]** Nhập tuyến/bề rộng, lập policy, quyết định severity/urgency/thứ tự, gom đo rồi giao sửa; lập kế hoạch và yêu cầu khảo sát, điều phối Drone Operator, rà soát phát hiện AI sơ bộ, chọn drone hoặc giao đo thực địa khi cần căn cứ vật lý, xác minh hư hỏng từ bằng chứng phù hợp, lập và theo dõi đợt sửa, kiểm tra báo cáo hoàn thành, trình Supervisor. |
| Drone Operator | Nhận nhiệm vụ, nhập video/SRT, kiểm tra chất lượng, tải dữ liệu và thực hiện bay bổ sung khi được phân công. |
| Repair Crew | Đội trưởng nhận đợt sửa hoặc nhiệm vụ đo đạc khi PM giao, tổ chức thành viên không có tài khoản riêng, ghi số đo/bằng chứng khi cần, tiến độ và báo cáo hoàn thành. |
| Reporter | Citizen hoặc InvestorRepresentative; gửi phản ánh, xác nhận vị trí từng ảnh, bổ sung bằng chứng và xem tiến độ/kết quả công bố của chính mình. Không có quyền project membership. |

### 1.3 Quy tắc chung áp dụng cho mọi story

1. Người dùng chỉ được xem và thao tác trong phạm vi dự án được cấp quyền; Supervisor có quyền toàn danh mục.
2. Mọi thay đổi nghiệp vụ quan trọng phải lưu người thực hiện, thời điểm, giá trị trước/sau, lý do và nguồn dữ liệu trong nhật ký chỉ đọc.
3. Hệ thống không xóa cứng hồ sơ nghiệp vụ trong các luồng thông thường; bản ghi bị loại bỏ, hủy hoặc ngừng sử dụng vẫn phải tra cứu được.
4. Một dự án có đúng một PM chính tại mỗi thời điểm. Một PM có thể quản lý nhiều dự án.
5. **[THAY THẾ UC-D21/22]** APPROVAL_TRACK cần item được duyệt; Fast Track có quyền từ nhiệm vụ/policy. Đợt gom chỉ-đo không cho tự sửa. Không dùng điều kiện duyệt chung để chặn Fast Track ngoại tuyến hợp lệ.
6. Dữ liệu chưa đồng bộ phải hiển thị rõ trạng thái và không được báo là đã lưu an toàn trên máy chủ.
7. Các tiêu chí chất lượng chưa có số đo chuẩn trong đặc tả phải được cấu hình, không tự gán một ngưỡng thử nghiệm thành tiêu chuẩn nghiệm thu.
8. **[THAY THẾ UC-D29]** Tài liệu và Acceptance Criteria dùng tên/quan hệ theo Data Dictionary: `Warranty` là aggregate riêng; baseline theo (segment, band); cờ `Survey.is_baseline_confirmed` chỉ dẫn xuất/lịch sử; `SupplementarySurveyRequest` độc lập; `QualityCheck` và `Evidence` phải thỏa ràng buộc đúng một FK đích.
9. Dữ liệu có vị trí phải giữ `road_section_version_id` khi liên quan hình học đoạn; GPS/raw location dùng `geography(4326)`, còn geometry kỹ thuật dùng SRID UTM của dự án. JSON phải hợp lệ và đúng schema ứng dụng, không dùng cú pháp PostgreSQL/PostGIS.

## 2. Danh sách User Story MVP

| ID | Nhóm | User Story | Mã chức năng / trace |
|---|---|---|---|
| US-01 | Kế thừa / sửa tại chỗ | Đăng nhập, hồ sơ, quyền và thông báo theo vai trò | Xem trace tại thân US-01 |
| US-02 | Kế thừa / sửa tại chỗ | Làm việc ngoại tuyến và đồng bộ | Xem trace tại thân US-02 |
| US-03 | Kế thừa / sửa tại chỗ | Dự án, bàn giao và phân công | Xem trace tại thân US-03 |
| US-04 | Kế thừa / sửa tại chỗ | Kế hoạch khảo sát và baseline theo band | Xem trace tại thân US-04 |
| US-05 | Kế thừa / sửa tại chỗ | Điều phối, tiếp nhận, từ chối và hủy yêu cầu khảo sát | Xem trace tại thân US-05 |
| US-06 | Kế thừa / sửa tại chỗ | Nhập, kiểm tra và tải dữ liệu bay | Xem trace tại thân US-06 |
| US-07 | Kế thừa / sửa tại chỗ | Bay bổ sung và thử lại xử lý | Xem trace tại thân US-07 |
| US-08 | Kế thừa / sửa tại chỗ | Rà soát và xác minh phát hiện AI | Xem trace tại thân US-08 |
| US-09 | Kế thừa / sửa tại chỗ | Gộp, đối sánh theo kỳ và theo dõi diễn biến lỗi | Xem trace tại thân US-09 |
| US-10 | Kế thừa / sửa tại chỗ | Duyệt nhãn hư hỏng cho dữ liệu huấn luyện | Xem trace tại thân US-10 |
| US-11 | Kế thừa / sửa tại chỗ | Lập và duyệt từng công việc sửa | Xem trace tại thân US-11 |
| US-12 | Kế thừa / sửa tại chỗ | Giao Crew và bàn giao | Xem trace tại thân US-12 |
| US-13 | Kế thừa / sửa tại chỗ | Bằng chứng và tiến độ từng lần sửa | Xem trace tại thân US-13 |
| US-14 | Kế thừa / sửa tại chỗ | Kiểm tra, sửa lại và đóng theo nhánh | Xem trace tại thân US-14 |
| US-15 | Kế thừa / sửa tại chỗ | Dashboard quản lý dự án, tiến độ sửa chữa và rủi ro | Xem trace tại thân US-15 |
| US-16 | Kế thừa / sửa tại chỗ | Xuất hồ sơ, nguồn gốc và tra cứu lưu trữ | Xem trace tại thân US-16 |
| US-17 | Kế thừa / sửa tại chỗ | Quản lý tài khoản, quyền, danh mục và nhắc việc | Xem trace tại thân US-17 |
| US-18 | Kế thừa / sửa tại chỗ | Quản trị mô hình AI, tác vụ và thiết bị | Xem trace tại thân US-18 |
| US-19 | Kế thừa / sửa tại chỗ | Lưu trữ, giữ hồ sơ và xóa dữ liệu có phê duyệt | Xem trace tại thân US-19 |
| US-20 | Kế thừa / sửa tại chỗ | Đo thực địa và xác minh theo nhu cầu | Xem trace tại thân US-20 |
| US-21 | R3 thêm | Reporter gửi và bổ sung phản ánh | Xem trace tại thân US-21 |
| US-22 | R3 thêm | PM tiếp nhận, kiểm chứng và liên kết báo trùng | Xem trace tại thân US-22 |
| US-23 | R3 thêm | Hồ sơ xử lý và kết quả công bố | Xem trace tại thân US-23 |
| US-24 | R3 thêm | Tuyến và bộ segment có phiên bản | Xem trace tại thân US-24 |
| US-25 | R3 thêm | Phạm vi khảo sát và coverage từng band | Xem trace tại thân US-25 |
| US-26 | R3 thêm | AI ngoài qua job bền vững và validation | Xem trace tại thân US-26 |
| US-27 | Kế thừa / sửa tại chỗ | Reporter tự đăng ký và xác minh Gmail OTP | Xem trace tại thân US-27 |
| US-28 | R3 thêm | Mời nhân sự nội bộ | Xem trace tại thân US-28 |
| US-29 | R3 thêm | Timeline hoạt động dự án | Xem trace tại thân US-29 |
| US-30 | R3 thêm | Nhập GPX và chỉnh tuyến nháp | Xem trace tại thân US-30 |
| US-31 | R3 thêm | Supervisor xác nhận tuyến | Xem trace tại thân US-31 |
| US-32 | R3 thêm | Preview, chỉnh và công bố segment | Xem trace tại thân US-32 |
| US-33 | R3 thêm | PM lập policy và Crew Fast Track | Xem trace tại thân US-33 |
| US-34 | R3 thêm | PM phân cấp và sắp xếp thứ tự | Xem trace tại thân US-34 |
| US-35 | R3 thêm | Gom đợt đo rồi phân công sửa | Xem trace tại thân US-35 |
| US-36 | R3 thêm | Tấm bê tông và nhiều lỗi trên tấm | Xem trace tại thân US-36 |
| US-37 | R3 thêm | Phản ánh sau đóng và sửa tiếp | Xem trace tại thân US-37 |
| US-38 | R3 thêm | Mạng đường nhiều nhánh | Xem trace tại thân US-38 |
| US-39 | R3 thêm | Khảo sát mạng nhánh và kiểm dữ liệu bay | Xem trace tại thân US-39 |
| US-40 | R3 thêm | Chỉ đường từ nhiệm vụ | Xem trace tại thân US-40 |
| US-41 | R3 thêm | Xử lý tạm EMERGENCY | Xem trace tại thân US-41 |

---

## 3. User Stories và Acceptance Criteria

### US-01 - Đăng nhập, hồ sơ, quyền và thông báo theo vai trò

**User Story**  
Là một người dùng nội bộ (Supervisor, PM, Drone Operator hoặc Repair Crew), tôi muốn đăng nhập bằng tài khoản được cấp, xem/cập nhật hồ sơ cá nhân, xem đúng dự án được phân công và nhận thông báo phù hợp để làm việc đúng quyền.

**Tiền điều kiện**

- Tài khoản đã được Admin tạo và đang hoạt động.
- Người dùng có thông tin xác thực hợp lệ.

**Acceptance Criteria**

1. **Đăng nhập và phiên làm việc**
   - **Given** tài khoản đang hoạt động và mật khẩu đúng
   - **When** người dùng đăng nhập
   - **Then** hệ thống tạo phiên, nhận diện đúng vai trò hiện tại từ server và chỉ tải các dự án/công việc thuộc membership active, còn hiệu lực và đúng vai trò.
   - Nếu tài khoản không tồn tại, bị ngừng sử dụng, mật khẩu sai hoặc phiên hết hạn, hệ thống từ chối truy cập và không tiết lộ thông tin nhạy cảm.
2. **Đăng xuất và hết hạn phiên**
   - **When** người dùng đăng xuất hoặc phiên hết hạn
   - **Then** token/phiên hiện tại không thể gọi dữ liệu nghiệp vụ; người dùng phải đăng nhập lại.
3. **Hồ sơ cá nhân**
   - **Given** người dùng đã đăng nhập
   - **When** người dùng sửa thông tin được phép
   - **Then** hệ thống lưu thay đổi và nhật ký; người dùng không thể tự đổi vai trò, quyền dự án hoặc tài khoản người khác.
4. **Phạm vi dữ liệu**
   - **Given** PM, Drone Operator hoặc Repair Crew truy cập danh sách
   - **Then** chỉ các dự án, nhiệm vụ, lỗi và hồ sơ được phân công được hiển thị.
   - **Given** Supervisor truy cập danh sách
   - **Then** có thể xem toàn bộ dữ liệu thuộc danh mục được cấp quyền Admin.
5. **Thông báo và nhắc việc**
   - **When** có sự kiện khảo sát, kết quả xử lý, yêu cầu duyệt, trả sửa, từ chối/hủy nhiệm vụ, phân công lại hoặc sắp hết hạn bảo hành
   - **Then** hệ thống tạo thông báo cho đúng vai trò, có liên kết tới đối tượng và trạng thái đã đọc/chưa đọc.
6. **Đặt lại mật khẩu**
   - **Given** người dùng gửi yêu cầu khôi phục
   - **When** Supervisor (Admin) thực hiện đặt lại
   - **Then** mật khẩu cũ không bị hiển thị, tài khoản buộc đổi mật khẩu ở lần đăng nhập kế tiếp và nhật ký chỉ lưu người/thời điểm, không lưu mật khẩu.
   - Tài khoản đã ngừng sử dụng không được đặt lại mật khẩu.

**Ngoại lệ và kiểm tra**

- Không trả về dữ liệu dự án trước khi kiểm tra quyền.
- Không cho phép dùng phiên cũ sau khi mật khẩu bị Admin đặt lại.

**Mã truy vết:** `CN01-CN04`, `CN10`, `QT02`, `QT09`.

### US-27 - Reporter tự đăng ký và xác minh Gmail OTP

**User Story**  
Là người dân hoặc đại diện chủ đầu tư chưa có tài khoản, tôi muốn tự đăng ký bằng Gmail và xác minh mã OTP để có tài khoản Reporter gửi phản ánh mà không cần Admin tạo hộ.

**Acceptance Criteria**

1. **Tạo đăng ký pending**
   - **When** người dùng gửi Gmail hợp lệ (`gmail.com` hoặc `googlemail.com`), display name, `ReporterType`, mật khẩu, confirm password và idempotency key
   - **Then** hệ thống tạo hoặc tiếp tục một registration intent với `User.status = PENDING`, `role_code = REPORTER`, `email_confirmed = false`; không cấp access/refresh token.
2. **Gửi OTP**
   - Hệ thống tạo OTP bằng nguồn ngẫu nhiên bảo mật, chỉ lưu hash/HMAC, hạn dùng ngắn, số lần thử tối đa và cooldown resend; adapter Gmail trả provider correlation ID nhưng không lưu code plaintext.
   - Response public không tiết lộ email đã tồn tại, trạng thái account hoặc provider detail.
3. **Xác minh OTP**
   - **Given** challenge chưa hết hạn, chưa consume và còn lượt thử
   - **When** Reporter gửi đúng OTP
   - **Then** hệ thống consume challenge một lần trong transaction, đặt `email_confirmed = true`, `email_confirmed_at`, chuyển User thành `ACTIVE` và có thể trả token pair chuẩn.
4. **Từ chối an toàn**
   - OTP sai, hết hạn, đã dùng, sai purpose hoặc vượt giới hạn trả error ổn định, không làm account thành Active và không tiết lộ thông tin tài khoản khác.
5. **Resend và retry**
   - Resend trước cooldown bị chặn; resend hợp lệ vô hiệu hóa challenge cũ và tạo challenge mới. Retry cùng idempotency key trả cùng registration outcome; payload khác cùng key bị từ chối.
6. **Bảo mật và phân quyền**
   - Reporter tự đăng ký chỉ tạo role `REPORTER`; không tạo ProjectMember, không được chọn PM/Supervisor/DroneOperator/RepairCrew và không được gửi report trước khi verify.
   - Không log password, OTP, refresh token, Gmail provider secret hoặc nội dung email; audit chỉ lưu intent, thời điểm, kết quả và correlation ID.

**Mã truy vết:** `CN11`, `CN12`, `QT09`, `US-01`.

### US-02 - Làm việc ngoại tuyến và đồng bộ

> **[THAY THẾ UC-D23: giữ AC cũ về toàn vẹn/dọn cục bộ; AC-03 mở lại được tự tiếp tục khi OS cho phép. THÊM quyền Fast Track offline vô thời hạn và snapshot; BỎ giả định mọi sửa cần đánh giá server trước.]**

**User Story:** Là Crew hoặc Operator, tôi muốn lưu nhiệm vụ, policy và bằng chứng để làm việc khi mất mạng rồi tự đồng bộ.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-02-AC-01:** **Given** nhiệm vụ có quyền đã tải; **When** thiết bị mất mạng hoặc khởi động lại; **Then** dữ liệu đã lưu/policy/ảnh còn đọc được, hiển thị version và chưa đồng bộ.
- **US-02-AC-02:** **Given** Fast Track có quyền theo nhiệm vụ/policy; **When** mất mạng lâu; **Then** không tự hết quyền vì thời gian; token server hết hạn không xóa nháp và khi sync có thể cần xác thực lại.
- **US-02-AC-03:** **Given** báo cáo đã gửi/xếp hàng; **When** có mạng và app được phép chạy; **Then** tự tiếp tục, retry không tạo bản ghi trùng; nháp chưa gửi không tự nộp.
- **US-02-AC-04:** **Given** thiếu tệp hoặc checksum sai; **When** server kiểm toàn vẹn; **Then** không đánh dấu an toàn/đủ nghiệm thu, không cho dọn tệp chưa an toàn.
- **US-02-AC-05:** **Given** PM đã đổi nhiệm vụ nhưng máy chưa nhận; **When** sync bản cũ; **Then** [ĐỀ XUẤT Q04] giữ snapshot/bằng chứng, báo xung đột cho PM, không last-write-wins.

**Truy vết:** CN05–CN09; BR-15/16/19/20; FR-22.

### US-03 - Dự án, bàn giao và phân công

> **[THAY THẾ UC-D26: AC cũ 2–3 “Supervisor nhập/sửa hình học” → PM nhập/chỉnh nháp, Supervisor xác nhận theo US-31. Giữ tạo dự án, bảo hành, nhân sự và lưu trữ.]**

**User Story:** Là Supervisor và PM, tôi muốn tách tạo dự án khỏi nhập tuyến và giữ lịch sử bảo hành.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-03-AC-01:** **Given** Supervisor có quyền; **When** tạo dự án và giao PM; **Then** mã duy nhất, đúng một PM chính; PM không tự có quyền tạo dự án Supervisor.
- **US-03-AC-02:** **Given** PM được giao dự án; **When** nhập tim/bề rộng theo đoạn; **Then** lưu bản nháp để preview; người ngoài scope bị chặn.
- **US-03-AC-03:** **Given** hình học đã dùng; **When** PM chỉnh; **Then** tạo bản nháp/version mới, không đổi liên kết lịch sử; xác nhận theo US-31.
- **US-03-AC-04:** **Given** hồ sơ bàn giao/bảo hành hợp lệ; **When** lưu hoặc chuyển PM; **Then** giữ tài liệu, thời hạn và lịch sử phân công; không tự xóa khi ngừng dự án.

**Truy vết:** DA01–DA05/DA12; BR-01/35/45; FR-04.

### US-04 - Kế hoạch khảo sát và baseline theo band

> **[THAY THẾ UC-D29: baseline tổng trên Survey → nguồn baseline theo segment/band; cờ tổng nếu giữ chỉ dẫn xuất.]**

**User Story:** Là PM, tôi muốn lập khảo sát và xác nhận phần đủ điều kiện.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-04-AC-01:** **Given** tuyến/segment đã công bố; **When** lập kế hoạch gốc/định kỳ/phát sinh; **Then** scope và band rõ, nhắc việc không tự thành lệnh bay.
- **US-04-AC-02:** **Given** mặt đường đủ nhưng mép phải thiếu; **When** xác nhận baseline; **Then** chỉ phần đủ được xác nhận, giữ phần thiếu để PM quyết định bổ sung.
- **US-04-AC-03:** **Given** có kỳ sau; **When** đối sánh; **Then** đúng version/phạm vi tương thích, không tự đổi baseline lịch sử.

**Truy vết:** DA06–DA11; BR-40/43; FR-26, FR-30.

### US-05 - Điều phối, tiếp nhận, từ chối và hủy yêu cầu khảo sát

**User Story**  
Là PM, tôi muốn giao đích danh Drone Operator và điều chỉnh phân công; là Drone Operator, tôi muốn tiếp nhận hoặc từ chối nhiệm vụ chưa bắt đầu với lý do rõ ràng.

**Acceptance Criteria**

1. **Phân công**
   - **Given** yêu cầu khảo sát còn hiệu lực
   - **When** PM chọn một Drone Operator và lịch thực hiện
   - **Then** hệ thống chuyển yêu cầu sang `Mới giao`, gửi thông báo và lưu người giao/thời điểm.
2. **Tiếp nhận**
   - **When** Drone Operator xác nhận
   - **Then** yêu cầu chuyển `Đã nhận`, hiển thị phạm vi, thời hạn, hướng dẫn và cho phép nhập dữ liệu.
3. **Từ chối**
   - **Given** trạng thái là `Mới giao`
   - **When** Drone Operator từ chối
   - **Then** phải nhập lý do, yêu cầu trả về PM để phân công lại và không được coi là hoàn tất.
   - Nếu đã tiếp nhận, Drone Operator không được tự từ chối; PM phải điều chỉnh phân công.
4. **Phân công lại**
   - **When** PM đổi người hoặc lịch
   - **Then** hệ thống lưu người cũ, người mới, lý do, lịch mới và thông báo các bên liên quan.
5. **Hủy/thu hồi**
   - **Given** chưa có bộ dữ liệu máy chủ xác nhận toàn vẹn
   - **When** PM hủy yêu cầu và nhập lý do
   - **Then** yêu cầu chuyển `Đã hủy`, thông báo Drone Operator nếu đã giao/đã nhận và giữ lịch sử.
   - **Given** đã có dữ liệu nộp thành công
   - **Then** hệ thống chặn hủy; PM chỉ được điều chỉnh phân công hoặc yêu cầu bay bổ sung.
6. **Phân biệt hoãn và hủy**
   - Hoãn kế hoạch không tạo lệnh bay; hủy yêu cầu là trạng thái của lệnh đã tạo; đổi người/lịch không làm mất yêu cầu.

**Mã truy vết:** `KS01-KS04`, `KS14`.

### US-06 - Nhập, kiểm tra và tải dữ liệu bay

**User Story**  
Là Drone Operator, tôi muốn sao chép video vào thiết bị, bổ sung SRT khi cần, kiểm tra chất lượng và tải nhiều tệp theo hàng đợi để Backend có bộ dữ liệu khảo sát toàn vẹn cho xử lý AI.

**Acceptance Criteria**

1. **Ghi nhận chuyến bay**
   - **When** Drone Operator nhập thiết bị, thời gian, phạm vi đã bay, ghi chú và tài liệu
   - **Then** thông tin được liên kết với đúng yêu cầu khảo sát.
2. **Sao chép từ thẻ nhớ**
   - **When** chọn video
   - **Then** ứng dụng sao chép nội dung thật vào bộ nhớ thiết bị, kiểm tra bản sao và không chỉ lưu đường dẫn thẻ nhớ.
   - Thiếu bộ nhớ phải được báo rõ và không đánh dấu nhập thành công.
3. **Phụ đề định vị**
   - **Given** MP4 không có luồng phụ đề định vị trích xuất được
   - **When** Drone Operator bổ sung SRT
   - **Then** hệ thống kiểm tra ghép đúng video và khoảng thời gian; SRT không được coi mặc định là nhật ký bay đầy đủ.
4. **Kiểm tra chất lượng**
   - **When** chạy kiểm tra
   - **Then** hệ thống kiểm tra định dạng, định vị, đồng bộ thời gian, độ rõ, ánh sáng, vùng phủ và chồng lấn; vùng không đạt có lý do cụ thể.
5. **Nộp nhiều video**
   - **Given** các tệp thuộc cùng lần khảo sát
   - **When** Drone Operator nộp
   - **Then** hệ thống gom đúng lần khảo sát, lưu trạng thái từng tệp và xếp hàng tải khi ngoại tuyến.
6. **Xác nhận máy chủ và xử lý**
   - **When** máy chủ nhận đủ và kiểm tra toàn vẹn thành công
   - **Then** dữ liệu chuyển sang xử lý; Backend lưu manifest/job bền vững theo dataset + segment + TargetBand + model/config, trả 202 + JobId; worker gọi AI ngoài hoặc mock có nhãn nguồn, retry/dedup theo fingerprint.
7. **Theo dõi**
   - Drone Operator và PM xem được trạng thái `Tiếp nhận`, `Đang xử lý`, `Hoàn tất`, `Lỗi` hoặc `Cần bổ sung`, cùng thông báo lỗi có thể hành động.

**Mã truy vết:** `KS05-KS10`, `CN05-CN09`.

### US-07 - Bay bổ sung và thử lại xử lý

**User Story**  
Là PM, tôi muốn xác nhận vùng dữ liệu chưa đạt và yêu cầu bay bổ sung hoặc thử lại tác vụ để hoàn thiện khảo sát mà không ghi đè dữ liệu gốc.

**Acceptance Criteria**

1. **Xác nhận nhu cầu bổ sung**
   - **Given** kết quả chất lượng chỉ ra vùng thiếu/không đạt hoặc tác vụ cần thêm dữ liệu
   - **When** PM chỉ rõ vùng, lý do và người thực hiện
   - **Then** hệ thống tạo yêu cầu bổ sung, liên kết cùng lần khảo sát và lưu người xác nhận/thời điểm.
2. **Không giới hạn lượt**
   - PM có thể tạo nhiều lượt bổ sung; mỗi lượt có phạm vi, lý do, người và nguồn gốc riêng.
3. **Nộp bổ sung**
   - **When** Drone Operator nộp dữ liệu
   - **Then** hệ thống giữ dữ liệu cũ, kiểm tra vùng phủ/đối sánh và ghi rõ tệp thuộc lượt bổ sung nào.
4. **Thử lại tác vụ**
   - **Given** lỗi máy chủ trên dữ liệu đã lưu nguyên vẹn
   - **When** PM hoặc Supervisor chọn thử lại
   - **Then** hệ thống tạo lần xử lý mới trên cùng dữ liệu, giữ lịch sử lỗi/lần thử và không yêu cầu bay lại tự động.
5. **Lỗi dữ liệu**
   - **Given** lỗi do định dạng, thiếu định vị hoặc chất lượng không đạt
   - **Then** hệ thống không cho coi thử lại máy chủ là giải pháp; PM phải quyết định bay bổ sung hoặc xử lý theo ngoại lệ.

**Mã truy vết:** `KS11-KS13`.

### US-08 - Rà soát và xác minh phát hiện AI

> **[BỎ UC-D29: AC cũ 7 bắt mọi phát hiện phải đo thực địa và câu “phải đo” trong story. THAY AC 2/7 bằng kiểm chứng theo nhu cầu; research vẫn bắt buộc.]**

**User Story:** Là PM, tôi muốn giữ/sửa/loại phát hiện và chọn cách kiểm chứng phù hợp.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-08-AC-01:** **Given** AI trả detection; **When** mở xem; **Then** hiển thị loại/confidence/bbox/time/source/model, phân biệt ước lượng với số đo thật.
- **US-08-AC-02:** **Given** PM giữ ứng viên; **When** lưu; **Then** Defect OPEN có nguồn, chưa là xác minh chính thức; không tự tạo Survey/task đo giả.
- **US-08-AC-03:** **Given** quyết định cần số đo vật lý; **When** xác minh; **Then** phải có số đo được chấp nhận; khi không cần và bằng chứng đủ thì không buộc đo.
- **US-08-AC-04:** **Given** AI không có detection hoặc PM chưa đủ căn cứ; **When** xem kết quả; **Then** không tự NO_DEFECT/đóng lỗi; loại sai cần lý do và giữ nguồn.

**Truy vết:** AI01/AI04–AI07; BR-07/39/44; FR-13.

### US-09 - Gộp, đối sánh theo kỳ và theo dõi diễn biến lỗi

**User Story**  
Là PM hoặc Supervisor, tôi muốn đối chiếu các phát hiện trùng và cùng một hư hỏng qua nhiều kỳ để tránh đếm trùng, theo dõi lỗi mới/ổn định/phát triển và ưu tiên xử lý dựa trên bằng chứng.

**Acceptance Criteria**

1. **Gợi ý trùng**
   - **When** hệ thống phát hiện các kết quả có khả năng cùng một lỗi
   - **Then** hệ thống chỉ đề xuất gộp, không tự gộp.
2. **Quyết định gộp/giữ riêng**
   - **When** PM xác nhận gộp hoặc giữ riêng
   - **Then** hệ thống cập nhật định danh lỗi, giữ liên kết các phát hiện nguồn và lưu quyết định/audit.
3. **Đối sánh qua khảo sát**
   - **Given** có baseline và các kỳ tương thích
   - **Then** PM có thể xác nhận hoặc sửa liên kết cùng hư hỏng; dữ liệu không đủ tương thích phải báo rõ.
4. **Phân loại diễn biến**
   - Hệ thống hiển thị lỗi mới, ổn định hoặc đang phát triển theo dữ liệu đã có; nếu thiếu kỳ/thiếu chất lượng thì hiển thị cảnh báo thiếu căn cứ.
5. **Cảnh báo ưu tiên**
   - **When** lỗi có mức độ cao, thay đổi nhanh hoặc thuộc nhóm cần theo dõi
   - **Then** PM/Supervisor nhận cảnh báo kèm căn cứ và độ tin cậy; cảnh báo không cam kết dự báo thời điểm hỏng.

**Mã truy vết:** `AI08-AI12`, `DA10-DA11`.

### US-10 - Duyệt nhãn hư hỏng cho dữ liệu huấn luyện

**User Story**  
Là PM, tôi muốn duyệt loại và vùng nhãn đã hiệu chỉnh trước khi xuất dữ liệu huấn luyện để chỉ dữ liệu có nguồn gốc và chất lượng được kiểm soát mới được sử dụng.

**Acceptance Criteria**

1. Chỉ phát hiện đã được PM xác nhận hoặc hiệu chỉnh mới xuất hiện trong danh sách chờ duyệt nhãn.
2. **When** PM duyệt nhãn
   **Then** hệ thống lưu người, thời gian, phiên bản nhãn, nguồn AI và ảnh/video gốc.
3. Nhãn bị từ chối phải có lý do và không được đưa vào tập huấn luyện được duyệt.
4. Supervisor (Admin) chỉ xuất tập đã duyệt, kèm phiên bản và quyền truy cập.

**Mã truy vết:** `AI05-AI07`, `AI14`, `QT06-QT07`.

### US-11 - Lập và duyệt từng công việc sửa

> **[BỎ/THAY THẾ UC-D29: AC cũ 4 duyệt cả đợt, 5 không triển khai phần đạt, 6 duyệt lại toàn bộ → quyết định từng item và trình lại phần thay đổi. AC 1 đo mọi lỗi → căn cứ/đo theo nhu cầu.]**

**User Story:** Là PM và Supervisor, tôi muốn quyết định từng item mà không khóa cả gói.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-11-AC-01:** **Given** lỗi nhánh thường đủ xác minh và số đo cần thiết; **When** PM lập phương án; **Then** tạo item và bản trình có scope/bằng chứng, chặn sửa trùng.
- **US-11-AC-02:** **Given** gói có A/B/C; **When** Supervisor APPROVE A, REQUEST_EVIDENCE B, REJECT C; **Then** A được giao riêng, B chờ bằng chứng, đề xuất C kết thúc nhưng lỗi vẫn mở.
- **US-11-AC-03:** **Given** phương án cần xem lại; **When** chọn REQUEST_RECONSIDER; **Then** ghi lý do riêng, không gộp với yêu cầu ảnh.
- **US-11-AC-04:** **Given** PM sửa phần bị trả; **When** trình lại; **Then** version mới chỉ phần cần xét, giữ quyết định phần không đổi.

**Truy vết:** SC01–SC09/SC12; BR-21–23; FR-19.

### US-12 - Giao Crew và bàn giao

> **[THAY THẾ UC-D29: AC cũ chỉ giao cả đợt đã duyệt/đội trưởng đích danh → Crew và item/scope; giữ lịch sử. Fast Track có quyền qua nhiệm vụ, không qua gate duyệt cả đợt.]**

**User Story:** Là PM, tôi muốn giao đúng đội và thứ tự theo nhánh.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-12-AC-01:** **Given** item APPROVAL_TRACK chưa APPROVED; **When** giao thi công; **Then** bị chặn; item đã duyệt có thể giao không chờ item khác.
- **US-12-AC-02:** **Given** Fast Track hoặc chỉ-đo được giao; **When** Crew mở; **Then** thấy loại quyền rõ, không dùng số lỗi để tự quyết được sửa.
- **US-12-AC-03:** **Given** PM đổi đội/thứ tự; **When** lưu; **Then** giữ lịch sử, báo bên liên quan; [ĐỀ XUẤT] hiển thị bản đã nhận.
- **US-12-AC-04:** **Given** đội cũ ngoại tuyến; **When** định giao cùng phạm vi; **Then** [ĐỀ XUẤT Q04] cần xác nhận dừng/bàn giao, không tự coi lệnh thu hồi đã nhận.

**Truy vết:** SC10–SC11; BR-03/23/24; FR-20.

### US-13 - Bằng chứng và tiến độ từng lần sửa

> **[THAY THẾ UC-D24: BEFORE không luôn cần ảnh Crew mới chụp; Fast Track được ảnh dân/drone, chuyến sửa sau dùng ảnh đo. AC gửi cũ chỉ online → cho xếp hàng, server đủ mới nộp chính thức.]**

**User Story:** Là Crew, tôi muốn ghi đủ bằng chứng và gửi báo cáo dù mất mạng.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-13-AC-01:** **Given** nhiệm vụ được giao; **When** nhận hoặc từ chối trước nhận; **Then** ghi người/đội và lý do từ chối, không tự hủy phương án; đã nhận cần PM điều phối.
- **US-13-AC-02:** **Given** Fast Track có ảnh dân/drone; **When** dùng làm BEFORE; **Then** giữ source/time/lỗi; [ĐỀ XUẤT] ảnh không phù hợp hiện trường phải chụp mới.
- **US-13-AC-03:** **Given** thiếu BEFORE hợp lệ lưu trên máy; **When** bắt đầu sửa theo app; **Then** bị chặn; không yêu cầu phải upload xong để làm ngoại tuyến.
- **US-13-AC-04:** **Given** sửa đã thực hiện; **When** ghi AFTER và gửi; **Then** gắn đúng attempt/lỗi, giữ thời điểm thực, xếp hàng nếu offline; không tự đóng.
- **US-13-AC-05:** **Given** có lỗi mới ngoài nhiệm vụ; **When** ghi nhận; **Then** báo riêng PM, không tự sửa hoặc thêm vào scope đã duyệt.

**Truy vết:** HT01–HT08/HT14–HT15; BR-06/17–20; FR-21.

### US-14 - Kiểm tra, sửa lại và đóng theo nhánh

> **[THAY THẾ UC-D25: AC cũ 3/4/6 buộc mọi lỗi trình/xác nhận Supervisor → PM đóng Fast Track và báo Supervisor; nhánh duyệt giữ Supervisor; hỗn hợp đóng tổng sau đủ nhánh.]**

**User Story:** Là PM và Supervisor, tôi muốn đóng đúng thẩm quyền và chỉ sửa lại phần chưa đạt.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-14-AC-01:** **Given** server đã nhận đủ báo cáo; **When** PM kiểm; **Then** đối chiếu số đo/policy hoặc phương án, BEFORE/AFTER; thiếu căn cứ khác chất lượng chưa đạt.
- **US-14-AC-02:** **Given** Fast Track đạt; **When** PM xác nhận; **Then** đóng lỗi và báo Supervisor, không tạo vòng duyệt sửa Fast Track.
- **US-14-AC-03:** **Given** APPROVAL_TRACK đạt qua PM; **When** Supervisor xác nhận; **Then** đóng phần đủ điều kiện; hồ sơ hỗn hợp còn lỗi bắt buộc chưa đạt không đóng tổng.
- **US-14-AC-04:** **Given** một lỗi bị trả; **When** Crew sửa tiếp; **Then** giữ lần sửa cũ, thêm attempt/bằng chứng; lỗi khác đạt không bị kéo lùi.

**Truy vết:** HT09–HT13; BR-25–28; FR-23, FR-24.

### US-20 - Đo thực địa và xác minh theo nhu cầu

> **[THAY THẾ UC-D21/24: bỏ gate VERIFIED trước mọi sửa tại AC cũ 5, giữ cho APPROVAL_TRACK; thêm đợt chỉ-đo, thiếu ảnh/số đo đo lại, cấm Crew vượt PM. GIỮ TN12 (từ chối nhiệm vụ trước khi tiếp nhận); bổ sung TN07 vào trace đo theo đợt, không đổi mã chức năng cũ.]**

**User Story:** Là PM và Crew, tôi muốn đo đủ căn cứ trong phạm vi nhiệm vụ.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-20-AC-01:** **Given** PM giao kiểm tra IncidentCase/Defect; **When** tạo task; **Then** ghi nguồn thật, scope, loại đo và chỉ-đo/đo-và-sửa; không cần Survey giả.
- **US-20-AC-02:** **Given** đo ngoài Fast Track thiếu ảnh/số đo bắt buộc; **When** nộp; **Then** không chấp nhận; đo lại; [TBD Q05] toàn đợt hay phần thiếu.
- **US-20-AC-03:** **Given** PM xác định nghiêm trọng nhưng số đo nhỏ; **When** Crew hoàn tất đo; **Then** chỉ gửi PM, không tự sửa.
- **US-20-AC-04:** **Given** quyết định nhánh thường cần số đo; **When** PM xác minh; **Then** chỉ VERIFIED khi đủ căn cứ/đo cần thiết; Fast Track được giao có ngoại lệ không chờ gate này.
- **US-20-AC-05:** **Given** đo nghiên cứu; **When** nhập dữ liệu; **Then** giữ purpose và sample IDs theo RS01–RS06, không tự biến đo nghiệp vụ thành nghiên cứu đã đạt.

**Truy vết:** AI13/TN01–TN07; BR-05/07/09/17/44; FR-13, FR-17, FR-31.

### US-15 - Dashboard quản lý dự án, tiến độ sửa chữa và rủi ro

**User Story**  
Là Supervisor hoặc PM, tôi muốn xem dashboard theo phạm vi quyền để theo dõi tình trạng bảo hành, lỗi còn mở, tiến độ sửa chữa, khảo sát và rủi ro cần ưu tiên.

**Acceptance Criteria**

1. Supervisor xem tổng quan toàn danh mục; PM chỉ xem các dự án được giao.
2. Dashboard hiển thị trạng thái dự án, khảo sát, lỗi còn mở, dự án sắp hết hạn bảo hành và các việc cần xử lý.
3. Tiến độ sửa chữa hiển thị theo đợt, lỗi, trạng thái bằng chứng và việc cần PM/Supervisor xử lý.
4. Chỉ báo rủi ro cao/hư hỏng phát triển nhanh hiển thị kèm nguồn dữ liệu, kỳ khảo sát và độ tin cậy; không trình bày như dự báo chắc chắn.
5. Supervisor có thể so sánh dự án/kỳ khảo sát theo phạm vi và loại mặt đường tương thích; dữ liệu thiếu tương thích phải được cảnh báo.
6. Mọi con số trên dashboard có liên kết tới hồ sơ nguồn hoặc bộ lọc đã áp dụng.

**Mã truy vết:** `BC01-BC05`.

### US-16 - Xuất hồ sơ, nguồn gốc và tra cứu lưu trữ

**User Story**  
Là Supervisor hoặc PM, tôi muốn xuất báo cáo và hồ sơ bằng chứng theo dự án/đoạn/lỗi/khoảng thời gian để tái hiện được nội dung, nguồn gốc và tính toàn vẹn tại thời điểm xuất.

**Acceptance Criteria**

1. Người dùng chỉ chọn được dự án, đoạn, lỗi và khoảng thời gian trong phạm vi quyền.
2. **When** xuất báo cáo
   **Then** hệ thống lưu bộ lọc, người xuất, thời điểm, trạng thái và phiên bản dữ liệu được dùng.
3. Hồ sơ tổng hợp gồm, khi có: bàn giao, khảo sát/baseline, ảnh gốc, loại và số đo lỗi, độ không chắc chắn, quyết định xác minh, phương án sửa, bằng chứng sau sửa và lịch sử duyệt.
4. Tệp xuất kèm nguồn gốc: mã tệp, checksum/dấu kiểm tra toàn vẹn, thời gian, tác giả, phiên bản mô hình và lịch sử sửa đổi.
5. Dữ liệu thiếu hoặc bằng chứng chưa có phải được ghi rõ trong báo cáo; hệ thống không tạo cảm giác hồ sơ đầy đủ.
6. Phương án xuất MVP hỗ trợ PDF tổng hợp và ZIP dữ liệu gốc/bảng kê khi cấu hình cho phép; lỗi tạo tệp phải báo rõ và không làm mất dữ liệu nguồn.
7. Sau khi dự án đóng, Supervisor/PM vẫn tra cứu được hồ sơ trong phạm vi quyền cho tới hết thời hạn lưu trữ hoặc lâu hơn nếu đang giữ tranh chấp.

**Mã truy vết:** `BC06-BC10`, `QT09`, `QT11-QT14`.

### US-17 - Quản lý tài khoản, quyền, danh mục và nhắc việc

**User Story**  
Là Supervisor (Admin), tôi muốn quản lý vòng đời tài khoản, quyền dự án, danh mục lỗi, quy tắc phân mức và cấu hình nhắc để hệ thống vận hành nhất quán.

**Acceptance Criteria**

1. **Tài khoản**
   - Admin tạo/cập nhật/ngừng sử dụng tài khoản, gán một trong năm vai trò và ghi nhật ký thay đổi.
2. **Ngừng tài khoản có việc mở**
   - **When** tài khoản bị ngừng sử dụng
   - **Then** hệ thống thu hồi phiên, chặn đăng nhập mới, giữ lịch sử, lập danh sách việc cần bàn giao và thông báo người có quyền phân công lại.
   - Không tự hủy, tự hoàn tất hoặc xóa bản nháp/công việc đang mở.
3. **Phân quyền**
   - Admin cấp/sửa quyền dự án theo vai trò; thay đổi được audit và có hiệu lực với request server tiếp theo; **[THÊM UC-D23]** máy offline chưa nhận lệnh cần xử lý Q04, không hứa thu hồi tức thì. PM/Drone Operator/Repair Crew không xem được dữ liệu ngoài membership active, còn hiệu lực và đúng vai trò.
   - Khi Admin đổi role toàn hệ thống, hệ thống thu hồi toàn bộ phiên và refresh token trong cùng transaction; JWT role cũ không tiếp tục cấp quyền.
   - Khi quyền project bị đổi, hết hạn hoặc kết thúc, request kế tiếp phải bị kiểm tra theo membership hiện tại phía server; client claim không được dùng thay thế.
4. **Danh mục**
   - Admin thêm hoặc ngừng sử dụng loại lỗi; mục cũ không bị xóa khỏi lịch sử.
5. **Quy tắc phân mức**
   - Admin tạo phiên bản quy tắc theo chuẩn và loại mặt đường, lưu căn cứ; thay phiên bản không làm thay đổi ngược kết quả lịch sử.
6. **Nhắc việc**
   - Admin cấu hình nhắc khảo sát và mốc trước hạn bảo hành; cấu hình không tự áp dụng thời hạn pháp lý chưa được xác minh.

**Mã truy vết:** `QT01-QT05`, `CN10`.

### US-18 - Quản trị mô hình AI, tác vụ và thiết bị

**User Story**  
Là Supervisor (Admin), tôi muốn quản lý phiên bản mô hình AI, theo dõi hàng đợi/tài nguyên và thông tin thiết bị để biết kết quả được tạo bởi mô hình nào và xử lý lỗi vận hành có kiểm soát.

**Acceptance Criteria**

1. **Phiên bản mô hình**
   - Admin tạo, phát hành hoặc ngừng sử dụng phiên bản; lưu chỉ số đánh giá, ngưỡng vận hành, thời điểm và phiên bản áp dụng.
2. **Nguồn kết quả**
   - Mỗi phát hiện AI giữ tham chiếu tới phiên bản mô hình; đổi mô hình không làm mất nguồn của kết quả cũ.
3. **Tập huấn luyện**
   - Chỉ nhãn đã được PM duyệt mới được xuất; tệp xuất có nguồn gốc, phiên bản và quyền truy cập.
4. **Giám sát tác vụ**
   - Admin xem tải, tiến trình, lỗi Backend/hàng đợi AI, dung lượng và trạng thái từng tác vụ.
5. **Thử lại an toàn**
   - Tác vụ thất bại do hạ tầng có thể thử lại trên dữ liệu còn nguyên; lỗi dữ liệu phải chuyển PM quyết định bổ sung.
6. **Thiết bị và quy trình**
   - Admin quản lý thông tin thiết bị bay, checklist và tài liệu chuyến bay; hệ thống không gửi lệnh điều khiển thiết bị bay.

**Mã truy vết:** `QT06-QT10`, `KS10`, `KS13`.

### US-19 - Lưu trữ, giữ hồ sơ và xóa dữ liệu có phê duyệt

**User Story**  
Là PM, tôi muốn lập yêu cầu xóa hồ sơ đã hết hạn; là Supervisor, tôi muốn kiểm tra điều kiện, trạng thái tranh chấp và phê duyệt để dữ liệu chỉ bị xóa đúng chính sách.

**Acceptance Criteria**

1. **Điều kiện lưu trữ**
   - Hệ thống tính tối thiểu tới hết bảo hành cộng 5 năm và hiển thị căn cứ tính cho từng hồ sơ.
2. **Lập yêu cầu**
   - **Given** hồ sơ đủ điều kiện thời hạn
   - **When** PM chọn phạm vi và lập yêu cầu
   - **Then** hệ thống đưa yêu cầu vào trạng thái chờ Supervisor, chưa xóa dữ liệu.
3. **Kiểm tra tranh chấp**
   - **Given** hồ sơ đang bị giữ do tranh chấp hoặc phạm vi chưa rõ
   - **Then** hệ thống chặn lập/duyệt xóa và hiển thị lý do.
4. **Phê duyệt**
   - **When** Supervisor xem xét và phê duyệt
   - **Then** hệ thống chỉ xóa đúng phạm vi đã duyệt theo chính sách, lưu biên bản, người, thời điểm và kết quả.
5. **Từ chối**
   - **When** Supervisor từ chối
   - **Then** phải có lý do; dữ liệu vẫn tra cứu được và yêu cầu chuyển trạng thái bị từ chối.
6. **Giữ/gỡ giữ hồ sơ**
   - Admin/Supervisor ghi căn cứ và lý do khi thiết lập hoặc gỡ giữ; gỡ giữ không tự động xóa dữ liệu.
7. **Phân biệt dọn thiết bị**
   - Dọn bản sao cục bộ trên điện thoại chỉ là thao tác đồng bộ an toàn, không được coi là xóa hồ sơ máy chủ.

**Mã truy vết:** `QT11-QT14`.

### US-21 - Reporter gửi và bổ sung phản ánh

> **[THÊM UC-D19/29: US-21 trước chỉ có trong ma trận trace, chưa có thân/AC.]**

**User Story:** Là Reporter, tôi muốn gửi ảnh có vị trí và theo dõi phần của mình.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-21-AC-01:** **Given** Reporter xác minh tài khoản; **When** gửi ảnh và mô tả; **Then** lưu report/ảnh với nguồn/time/location riêng; nhận hồ sơ tiếp nhận và thông báo.
- **US-21-AC-02:** **Given** ảnh cũ upload nơi khác; **When** xác nhận vị trí; **Then** không tự lấy GPS upload; cho vị trí được xác nhận có nguồn.
- **US-21-AC-03:** **Given** Reporter khác; **When** đọc report/tệp bằng ID; **Then** bị chặn; không có quyền project chỉ nhờ gửi report.

**Truy vết:** PA01/PA02; BR-29/47; FR-11.

### US-22 - PM tiếp nhận, kiểm chứng và liên kết báo trùng

> **[THÊM UC-D19/29: bổ sung thân US-22 đã có ở trace; liên kết/tách chi tiết là đề xuất.]**

**User Story:** Là PM, tôi muốn xử lý phản ánh và tránh giao sửa trùng.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-22-AC-01:** **Given** chưa rõ dự án; **When** tiếp nhận; **Then** [ĐỀ XUẤT] vào hàng điều phối, không mất report.
- **US-22-AC-02:** **Given** năm report ứng viên cùng lỗi; **When** PM xác nhận liên kết; **Then** giữ năm nguồn và hồ sơ chính; không tạo năm nhiệm vụ sửa.
- **US-22-AC-03:** **Given** các điểm cách 1–2 m; **When** hệ thống gợi ý; **Then** [ĐỀ XUẤT Q09] không tự gộp khác loại/tấm/thời điểm; PM xác nhận, có tách gộp nhầm.
- **US-22-AC-04:** **Given** một/nhiều phản ánh; **When** PM chọn kiểm chứng; **Then** cho trực tiếp hoặc drone, lưu căn cứ; ngoài phạm vi/trùng khác NO_DEFECT.

**Truy vết:** PA03–PA05; BR-07/30/31/47; FR-12, FR-13.

### US-23 - Hồ sơ xử lý và kết quả công bố

> **[THÊM UC-D25/29: bổ sung thân US-23 ở trace; phần công bố từng lỗi Q08 chưa chốt.]**

**User Story:** Là PM, Supervisor và Reporter, tôi muốn đóng hồ sơ đúng nhánh và công bố đúng người.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-23-AC-01:** **Given** hồ sơ chỉ Fast Track và PM kiểm đủ; **When** đóng; **Then** PM đóng và báo Supervisor.
- **US-23-AC-02:** **Given** hồ sơ hỗn hợp; **When** đóng tổng; **Then** chỉ Supervisor sau đủ phần bắt buộc theo từng nhánh.
- **US-23-AC-03:** **Given** ảnh AFTER chưa được công bố hoặc kết quả chưa nghiệm thu; **When** Reporter xem; **Then** không tự hiển thị REPAIRED hoặc ảnh nội bộ.
- **US-23-AC-04:** **Given** một lỗi đạt trong case còn mở; **When** PM muốn công bố từng phần; **Then** [TBD Q08] chưa tự thay điều kiện Case Verified cũ; không công bố toàn case hoàn thành.

**Truy vết:** PA06/PA07; BR-25/26/29/48; FR-23, FR-25.

### US-24 - Tuyến và bộ segment có phiên bản

> **[THÊM UC-D29: bổ sung thân US-24 có ở trace; chi tiết GPX/xác nhận/chia tách sang US-30/31/32 đã được Sprint giữ mã.]**

**User Story:** Là PM, tôi muốn giữ lịch sử không gian khi chia lại phạm vi.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-24-AC-01:** **Given** tuyến/segment đã dùng; **When** tạo bản mới; **Then** giữ IDs/geometry lịch sử; không gán dữ liệu cũ vào bản mới tự động.
- **US-24-AC-02:** **Given** ánh xạ phiên bản; **When** kết quả thiếu vị trí; **Then** không phân phát một lỗi cho mọi đoạn con; cần kiểm chứng.
- **US-24-AC-03:** **Given** có station origin; **When** tính lý trình; **Then** origin + offset dọc tuyến, không luôn bắt đầu 0.

**Truy vết:** DA13–DA16; BR-35/37; FR-05, FR-08.

### US-25 - Phạm vi khảo sát và coverage từng band

> **[THÊM UC-D28/29: bổ sung thân US-25, ngưỡng SRT/coverage Q11.]**

**User Story:** Là PM và Operator, tôi muốn theo dõi phần dữ liệu thật sự đủ.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-25-AC-01:** **Given** task chọn Surface/LeftEdge/RightEdge; **When** bay ngược chiều tuyến; **Then** trái/phải vẫn theo chiều lý trình đã xác định.
- **US-25-AC-02:** **Given** SRT trong vùng 12 m nhưng không nhìn thấy mép; **When** đánh giá; **Then** [ĐỀ XUẤT Q11] tách đạt vị trí và thiếu coverage; không đánh SUFFICIENT từ point-in-polygon.
- **US-25-AC-03:** **Given** thiếu telemetry/camera; **When** tính coverage; **Then** UNKNOWN/chưa đủ căn cứ thay vì tự lấp GPS thiếu.

**Truy vết:** KS15/KS16; BR-40/41; FR-28, FR-30.

### US-26 - AI ngoài qua job bền vững và validation

> **[THÊM UC-D29: bổ sung thân US-26 đã có ở trace; giữ RS01–RS06.]**

**User Story:** Là PM và hệ thống, tôi muốn phân tích có nguồn và thử lại an toàn.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-26-AC-01:** **Given** dataset hợp lệ; **When** nhận yêu cầu phân tích; **Then** lưu manifest/job trước trả nhận, khóa version model/config/scope.
- **US-26-AC-02:** **Given** worker lỗi rồi retry; **When** nhận kết quả; **Then** không nhân đôi detection, kết quả muộn không ghi đè bản hiện hành.
- **US-26-AC-03:** **Given** adapter mock; **When** hiển thị/xuất kết quả; **Then** gắn nguồn mock và không ghi như độ chính xác thực nghiệm.
- **US-26-AC-04:** **Given** ground truth và derived samples; **When** tính sai số; **Then** ghép bằng ID, nêu mẫu thiếu/outlier; không dùng frame gần trùng để giả test độc lập.

**Truy vết:** AI15–AI17/RS01–RS06; BR-39/42/44; FR-29, FR-31.

### US-28 - Mời nhân sự nội bộ

> **[THÊM UC-D29: giữ ý nghĩa US-28 trong Sprint 1, không tái dùng mã cho Fast Track.]**

**User Story:** Là Supervisor, tôi muốn mời tài khoản đúng role và scope.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-28-AC-01:** **Given** người mời có quyền; **When** tạo lời mời; **Then** role/scope được server kiểm; không log token.
- **US-28-AC-02:** **Given** lời mời hết hạn/đã dùng; **When** nhận; **Then** không cấp tài khoản/quyền lần nữa.
- **US-28-AC-03:** **Given** retry cùng thao tác; **When** gửi lại; **Then** không sinh user trùng; trạng thái lời mời truy vết được.

**Truy vết:** CN01/QT01/QT02; S1-T1; FR-02.

### US-29 - Timeline hoạt động dự án

> **[THÊM UC-D29: giữ ý nghĩa US-29 Sprint 1 ProjectActivity.]**

**User Story:** Là PM và Supervisor, tôi muốn xem sự kiện bền vững theo phạm vi.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-29-AC-01:** **Given** sự kiện nghiệp vụ thành công; **When** ghi timeline; **Then** đúng actor/time/object/scope, retry không nhân đôi.
- **US-29-AC-02:** **Given** người ngoài project; **When** đọc timeline; **Then** không được xem.
- **US-29-AC-03:** **Given** xem lịch sử; **When** lọc thời gian/đối tượng; **Then** truy lại nguồn; không cho sửa sự kiện để che lịch sử.

**Truy vết:** BC01–BC03/QT09; S1-T2; FR-34.

### US-30 - Nhập GPX và chỉnh tuyến nháp

> **[THÊM UC-D26/29: giữ US-30 Sprint T3, mở rộng bề rộng biến thiên và vùng tổng 12 m.]**

**User Story:** Là PM, tôi muốn nhập tim/bề rộng theo đoạn và preview.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-30-AC-01:** **Given** GPX chỉ waypoint hoặc nhiều track chưa chọn; **When** import; **Then** không tự tạo tim; báo định dạng/track cần chọn theo contract.
- **US-30-AC-02:** **Given** GPX track hợp lệ; **When** lọc/chỉnh; **Then** tính mét, giữ đầu/cuối và bản gốc; chỉnh tay không tự mất khi lọc lại.
- **US-30-AC-03:** **Given** P1–P2 8 m, P2–P3 10 m, vùng 12 m; **When** preview; **Then** mặt đường giữ hai bề rộng; biên cách tim 6 m trên đoạn thẳng.
- **US-30-AC-04:** **Given** tuyến cong chỉ có hai đầu; **When** dựng; **Then** không tuyên bố đã biết chính xác đường cong; yêu cầu thêm dữ liệu khi cần.

**Truy vết:** DA02/DA13/DA16; BR-34/35/37; S1-T3; FR-05, FR-06.

### US-31 - Supervisor xác nhận tuyến

> **[THÊM UC-D29: giữ US-31 Sprint T4; contract idempotency cần đồng bộ, không giữ lỗi tự mâu thuẫn.]**

**User Story:** Là Supervisor, tôi muốn công bố version tuyến từ bản PM đã chuẩn bị.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-31-AC-01:** **Given** nháp hợp lệ và CRS cấu hình; **When** Supervisor xác nhận; **Then** tạo đúng một version với station origin/tham số/nguồn.
- **US-31-AC-02:** **Given** cùng yêu cầu đã thành công; **When** retry; **Then** trả cùng kết quả, không tạo version trùng; payload khác cùng key bị phát hiện.
- **US-31-AC-03:** **Given** PM không có quyền xác nhận Supervisor; **When** gọi thao tác; **Then** bị chặn.

**Truy vết:** DA13; BR-01/35; S1-T4; FR-07.

### US-32 - Preview, chỉnh và công bố segment

> **[THÊM UC-D29: giữ US-32 Sprint T5; sửa trace baseline D-08 → D-09 khi đồng bộ spec.]**

**User Story:** Là PM, tôi muốn chia theo mét và giữ tính liên tục.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-32-AC-01:** **Given** tuyến 4.500 m target 1.000 m; **When** preview; **Then** bốn segment 1.000 và một 500 m.
- **US-32-AC-02:** **Given** split/merge/moveBoundary hợp lệ; **When** công bố; **Then** không hở/chồng, thao tác ngoài range bị chặn; bản công bố bất biến.
- **US-32-AC-03:** **Given** phần dư dưới minimum; **When** preview; **Then** [ĐỀ XUẤT] gộp phần dư vào đoạn trước theo rule được chốt.

**Truy vết:** DA14/DA15; BR-35; S1-T5; FR-08.

### US-33 - PM lập policy và Crew Fast Track

> **[THÊM UC-D22/23/24: story mới; không áp gate server trước sửa hoặc thời hạn mất mạng.]**

**User Story:** Là PM và Crew, tôi muốn xử lý một lỗi nhỏ cùng chuyến đúng quyền.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-33-AC-01:** **Given** PM lập policy; **When** Crew tải nhiệm vụ; **Then** hiển thị loại/điều kiện/phương pháp/bằng chứng và version; khung ban hành/hạn mức Q02/Q03.
- **US-33-AC-02:** **Given** một lỗi nhỏ được giao đo-và-sửa, số đo đạt policy, BEFORE đủ; **When** Crew sửa offline; **Then** cho sửa không cần PM duyệt số đo trước; lưu AFTER/báo cáo, không tự đóng.
- **US-33-AC-03:** **Given** task chỉ-đo hoặc PM xác định nghiêm trọng; **When** Crew muốn sửa dù số đo nhỏ; **Then** không được sửa; báo PM.
- **US-33-AC-04:** **Given** ngoài policy hoặc lỗi mới ngoài nhiệm vụ; **When** Crew ghi nhận; **Then** chờ PM, không tự sửa hoặc tự đổi urgency/severity.
- **US-33-AC-05:** **Given** PM nhận đủ Fast Track; **When** kiểm đạt; **Then** PM đóng và báo Supervisor; không tạo vòng duyệt sửa.

**Truy vết:** SC13/TN03/HT04/HT09/HT12; BR-05/06/08/11–18/25; FR-15, FR-18.

### US-34 - PM phân cấp và sắp xếp thứ tự

> **[THÊM UC-D20: story mới; độ nghiêm trọng khác độ khẩn cấp và nhánh sửa.]**

**User Story:** Là PM, tôi muốn tự quyết định ưu tiên từ gợi ý.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-34-AC-01:** **Given** Reporter/Crew gửi cảnh báo; **When** PM đánh giá; **Then** lưu hai trường phân cấp và căn cứ; ba mức urgency đã chốt.
- **US-34-AC-02:** **Given** hệ thống có gợi ý mới; **When** PM mở kế hoạch; **Then** không tự thay thứ tự đã giao; PM tự chọn/sắp lại.
- **US-34-AC-03:** **Given** LOW có urgency Khẩn cấp và policy cho phép; **When** PM giao Fast Track; **Then** không bị chuyển EMERGENCY chỉ do urgency.

**Truy vết:** SC14/AI05/BC04; BR-03/04/13/14; FR-14.

### US-35 - Gom đợt đo rồi phân công sửa

> **[THÊM UC-D21: story mới, thay cách hiểu mọi LOW trong chuyến gom đều được tự sửa.]**

**User Story:** Là PM và Crew, tôi muốn giảm chuyến đi và giữ quyền quyết định PM.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-35-AC-01:** **Given** 10 lỗi có 5 lỗi nhỏ trong đợt gom chỉ-đo; **When** Crew xác nhận năm lỗi đạt policy; **Then** chỉ đo/chụp/báo, không sửa ngay.
- **US-35-AC-02:** **Given** PM có số đo/ảnh; **When** lập và giao sửa; **Then** hành động riêng sau đo, thứ tự do PM, nhánh theo quyết định; Fast Track sau gom Q01 còn mở.
- **US-35-AC-03:** **Given** có thêm report giữa tuần; **When** refresh dữ liệu; **Then** [ĐỀ XUẤT] không tự đổi loại nhiệm vụ đã giao; không tự buộc chờ đủ bảy ngày.

**Truy vết:** TN07/TN01/SC14; BR-09/10; FR-16.

### US-36 - Tấm bê tông và nhiều lỗi trên tấm

> **[THÊM UC-D27: story mới; schema tấm và rule gộp là thiết kế đề xuất.]**

**User Story:** Là PM và Crew, tôi muốn định vị và nhóm việc mà vẫn giữ từng lỗi.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-36-AC-01:** **Given** chỉ biết khoảng 4 m; **When** sinh lưới; **Then** ghi dự kiến, không tự là tấm hoàn công; nhiều dải có nhiều tấm.
- **US-36-AC-02:** **Given** vỡ mép và ổ gà cùng tấm; **When** nhóm công việc; **Then** giữ hai lỗi và kết quả riêng; một lỗi đạt không đóng toàn tấm.
- **US-36-AC-03:** **Given** lỗi trên khe hoặc nhiều tấm; **When** gắn vị trí; **Then** [ĐỀ XUẤT] liên kết nhiều tấm, thiếu độ chính xác thì chờ xác nhận.

**Truy vết:** DA18/AI08; BR-31–33; FR-10.

### US-37 - Phản ánh sau đóng và sửa tiếp

> **[THÊM UC-D25: story mới; quyền mở lại case Supervisor chưa chốt.]**

**User Story:** Là PM, tôi muốn phân biệt lần sửa chưa đạt với tái phát.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-37-AC-01:** **Given** report cùng vùng đã sửa; **When** kiểm chứng; **Then** PM quyết định chưa đạt hay tái phát, không auto merge do GPS.
- **US-37-AC-02:** **Given** sửa trước chưa đạt; **When** xử lý; **Then** [ĐỀ XUẤT] mở lại case cũ theo quyền được chốt, giữ lịch sử đóng.
- **US-37-AC-03:** **Given** tái phát sau nghiệm thu hợp lệ; **When** xử lý; **Then** [ĐỀ XUẤT] case mới liên kết case cũ, không xóa nghiệm thu trước.

**Truy vết:** PA08/HT10/HT13; BR-27/28; FR-24.

### US-38 - Mạng đường nhiều nhánh

> **[THÊM UC-D26: nhu cầu chốt, mô hình nút/edge đề xuất.]**

**User Story:** Là PM, tôi muốn nhập mạng có đường cong và bề rộng biến thiên.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-38-AC-01:** **Given** trục chính và hai nhánh; **When** nhập/chỉnh; **Then** mã nhánh/chiều tuyến riêng, chọn đúng nút nối.
- **US-38-AC-02:** **Given** hai đường giao khác cao độ hoặc vị trí nhiều ứng viên; **When** kết nối/gán lỗi; **Then** không tự nối hoặc gán chắc chắn; yêu cầu xác nhận.
- **US-38-AC-03:** **Given** đường cong/bề rộng thay đổi; **When** preview; **Then** mặt đường/vùng khảo sát hợp lệ; nội suy không đổi nguồn thành thực đo.

**Truy vết:** DA17/DA02; BR-34–36; FR-09.

### US-39 - Khảo sát mạng nhánh và kiểm dữ liệu bay

> **[THÊM UC-D28: hướng giải quyết đề xuất, không tích hợp điều khiển drone.]**

**User Story:** Là PM và Operator, tôi muốn chọn phạm vi bay hợp lý và biết phần thiếu.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-39-AC-01:** **Given** nhiều nhánh/điểm tập kết; **When** lập kế hoạch; **Then** không bắt mọi chuyến trục chính trước; PM chọn phạm vi, Operator kiểm mission ngoài app.
- **US-39-AC-02:** **Given** export/import Dronelink; **When** thực hiện thử; **Then** mã/version phạm vi truy vết được, không giả thành chuyến bay đã nghiệm thu.
- **US-39-AC-03:** **Given** SRT có đoạn chuyển nhánh hoặc thiếu thông số camera; **When** đánh giá; **Then** [ĐỀ XUẤT Q11] tách phạm vi thu, vị trí/quality/coverage; thiếu thì chưa xác định.

**Truy vết:** KS18/KS15/KS16; BR-36/41/43; FR-28, FR-33.

### US-40 - Chỉ đường từ nhiệm vụ

> **[THÊM UC-D29: chức năng đã chốt Sprint 1, nguồn task tối thiểu cần đồng bộ Sprint spec.]**

**User Story:** Là Crew hoặc Operator, tôi muốn xem đích và chuyển Google Maps.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-40-AC-01:** **Given** Crew mở nhiệm vụ có quyền và đích hợp lệ; **When** bấm Chỉ đường; **Then** mở Google Maps với WGS84 đúng thứ tự, không gửi PII không cần.
- **US-40-AC-02:** **Given** Operator chưa có điểm tiếp cận/tập kết; **When** bấm chỉ đường; **Then** yêu cầu bổ sung, không lấy trung điểm segment/GPS drone.
- **US-40-AC-03:** **Given** không mở được ứng dụng ngoài; **When** thao tác; **Then** cho xem/sao chép tọa độ; không tự đánh dấu đến nơi/hoàn thành.

**Truy vết:** HT02/KS17; BR-38; FR-32.

### US-41 - Xử lý tạm EMERGENCY

> **[THÊM UC-D29: chi tiết kế thừa Design v2, thời hạn/năng lực phải chốt; không đồng nhất urgency với nhánh.]**

**User Story:** Là PM và Crew đủ điều kiện, tôi muốn xử lý tình huống tức thời và hậu kiểm.

**Tiền điều kiện:** tài khoản/quyền và đối tượng hợp lệ theo story; ngoại tuyến dùng bản đã tải, không giả server đã nhận. **Kết quả:** theo từng AC dưới đây.

**Acceptance Criteria R3**

- **US-41-AC-01:** **Given** PM kích hoạt có lý do; **When** giao việc; **Then** thông báo Supervisor, scope tạm và đội đủ điều kiện.
- **US-41-AC-02:** **Given** rào chắn/vá tạm hoàn thành; **When** hậu kiểm; **Then** không tự đóng Defect còn cần sửa chính thức.
- **US-41-AC-03:** **Given** urgency Khẩn cấp nhưng PM chưa kích hoạt; **When** xem lỗi; **Then** không tự tạo nhiệm vụ EMERGENCY.

**Truy vết:** SC10/HT12; BR-14/46; FR-37.

## 4. Ma trận trạng thái MVP

| Đối tượng | Trạng thái tối thiểu | Điều kiện chuyển chính |
|---|---|---|
| Yêu cầu khảo sát | Mới giao, Đã nhận, Từ chối, Đã hủy, Hoãn, Đang thực hiện, Đã nộp, Yêu cầu bổ sung, Hoàn tất | Theo US-04, US-05, US-06, US-07. |
| Dữ liệu khảo sát | Đang sao chép, Đã lưu cục bộ, Chờ tải, Đang tải, Máy chủ xác nhận toàn vẹn, Không hợp lệ | Chỉ xác nhận máy chủ khi đủ tệp và kiểm tra toàn vẹn đạt. |
| Tác vụ phân tích | Chờ xử lý, Đang xử lý, Thất bại có thể thử lại, Cần bổ sung dữ liệu, Hoàn tất | Lỗi hạ tầng và lỗi dữ liệu phải phân biệt. |
| Phát hiện AI / Preliminary Defect | Chờ rà soát, Cần kiểm tra thêm, Chờ giao đo, Đang đo, Chờ PM đánh giá, Đã loại bỏ, Đã xác minh chính thức | Preliminary Defect ánh xạ `Defect OPEN`; **[THAY THẾ UC-D29]** VERIFIED sau PM chấp nhận căn cứ phù hợp; đo khi quyết định cần số đo; Fast Track có ngoại lệ trước sửa. |
| Nhiệm vụ đo đạc thực tế | Mới giao, Đã nhận, Từ chối, Đang thực hiện, Cần bổ sung, Đã gửi, Hoàn tất | Repair Crew thực hiện; bản đo đã gửi không bị ghi đè. |
| Đợt sửa | Nháp, Chờ duyệt, Yêu cầu chỉnh sửa, Đã duyệt, Đã phân công, Từ chối, Đang thực hiện, Chờ kiểm tra, Cần sửa lại, Hoàn tất | **[THAY THẾ UC-D29]** Giao từng item theo nhánh; gói không khóa phần đã được duyệt; Fast Track theo task/policy. |
| Kết quả từng lỗi | Chưa sửa, Đang sửa, Chờ PM kiểm tra, Cần sửa lại, Chờ Supervisor xác nhận, Đã hoàn tất | **[THAY THẾ UC-D25]** Fast Track PM đóng; APPROVAL_TRACK qua Supervisor; một lỗi đạt không bị kéo lùi vì lỗi khác. |

## 5. Definition of Done cho MVP

Một User Story chỉ được xem là hoàn thành khi:

- Tất cả Acceptance Criteria bắt buộc của story đã được kiểm thử ở luồng thành công và các ngoại lệ nêu trong story.
- Quyền truy cập được kiểm thử với đúng vai trò và một người ngoài phạm vi.
- Các chuyển trạng thái hợp lệ và chuyển trạng thái bị chặn được kiểm thử.
- Dữ liệu, tệp, phiên bản và nhật ký truy vết được tạo đúng; không có mật khẩu hoặc dữ liệu nhạy cảm không được phép trong log.
- Luồng ngoại tuyến/đồng bộ liên quan đã kiểm thử mất mạng, nối mạng lại, lỗi tạm thời và dữ liệu chưa toàn vẹn.
- Không có thao tác MVP nào tự động kết luận trách nhiệm hợp đồng, tự thêm lỗi phát sinh vào đợt đã duyệt hoặc xóa lịch sử.

## 6. Ma trận truy vết đầy đủ

| Mã chức năng | User Story MVP | Ghi chú |
|---|---|---|
| `PA01`-`PA07` | US-21, US-22, US-23 | Reporter, IncidentReport/Case, public timeline, checking and published repair result. |
| `DA13`-`DA16` | US-24 | Polyline/segment versioning and RouteCapture design. |
| `KS15`, `KS16` | US-25 | Target bands and coverage separate from AI/job status. |
| `AI15`-`AI17` | US-26 | External async jobs, immutable manifest, retry/dedup and context overlap. |
| `CN01`, `CN02`, `CN03`, `CN04`, `CN10` | US-01 | Đăng nhập, hồ sơ, phạm vi, thông báo, đặt lại mật khẩu. |
| `CN11`, `CN12` | US-27 | Reporter tự đăng ký Gmail, gửi/resend và xác minh OTP trước khi kích hoạt. |
| `CN05`, `CN06`, `CN07`, `CN08`, `CN09` | US-02 | Ngoại tuyến, nháp, đồng bộ, kiểm tra toàn vẹn, dọn bản sao. |
| `DA01`, `DA02`, `DA03`, `DA04`, `DA05`, `DA12` | US-03 | Dự án, tuyến/đoạn, bàn giao, bảo hành, nhân sự, đóng dự án. |
| `DA06`, `DA07`, `DA08`, `DA09`, `DA10`, `DA11` | US-04 | Kế hoạch, nhắc việc, yêu cầu, hoãn, baseline, theo dõi tình trạng. |
| `KS01`, `KS02`, `KS03`, `KS04`, `KS14` | US-05 | Phân công, tiếp nhận, từ chối, phân công lại, hủy/thu hồi. |
| `KS05`, `KS06`, `KS07`, `KS08`, `KS09`, `KS10` | US-06 | Chuyến bay, sao chép video, SRT, chất lượng, tải lên, xử lý. |
| `KS11`, `KS12`, `KS13` | US-07 | Bay bổ sung, nộp bổ sung, thử lại tác vụ. |
| `AI01`, `AI04`, `AI05`, `AI06`, `AI07` | US-08 | Xem, xác nhận, hiệu chỉnh, loại bỏ, lịch sử xác minh. |
| `AI08`, `AI09`, `AI10`, `AI11`, `AI12` | US-09 | Gộp, đối sánh kỳ, baseline, diễn biến, cảnh báo. |
| `AI14` | US-10 | Duyệt nhãn huấn luyện. |
| `SC01`, `SC02`, `SC03`, `SC04`, `SC05`, `SC06`, `SC07`, `SC08`, `SC09`, `SC12` | US-11 | Lập, kiểm tra phương án, trình, duyệt, trả và trình lại. |
| `SC10`, `SC11` | US-12 | Phân công và bàn giao Repair Crew. |
| `HT01`, `HT02`, `HT03`, `HT04`, `HT05`, `HT06`, `HT07`, `HT08`, `HT14`, `HT15` | US-13 | Tiếp nhận, hướng dẫn, phân việc, bằng chứng, báo cáo, từ chối. |
| `HT09`, `HT10`, `HT11`, `HT12`, `HT13` | US-14 | Kiểm tra, trả sửa, trình, xác nhận, sửa lại. |
| `AI13`, `TN01`–`TN07` | US-20 | Giao, thực hiện, gửi và đánh giá đo đạc thực tế; không tự kết luận bảo hành. |
| `BC01`, `BC02`, `BC03`, `BC04`, `BC05` | US-15 | Dashboard dự án, tiến độ sửa chữa, rủi ro, so sánh. |
| `BC06`, `BC07`, `BC08`, `BC09`, `BC10` | US-16 | Xuất báo cáo, hồ sơ bằng chứng, nguồn gốc, lưu trữ. |
| `QT01`, `QT02`, `QT03`, `QT04`, `QT05` | US-17 | Tài khoản, quyền, danh mục, quy tắc, nhắc việc. |
| `QT06`, `QT07`, `QT08`, `QT09`, `QT10` | US-18 | Mô hình, nhãn, tác vụ, nhật ký, thiết bị. |
| `QT11`, `QT12`, `QT13`, `QT14` | US-19 | Xóa hết hạn, phê duyệt, kiểm tra lưu trữ, legal hold. |

### Mã không thuộc phạm vi MVP

| Mã | Lý do loại khỏi MVP |
|---|---|
| `AI02`, `AI03` | Tính năng sản phẩm/phép đo phụ thuộc pipeline nâng cao; không phải điều kiện nghiệm thu MVP, nhưng kết quả đo vẫn được dùng trong Research Validation Track khi đề cương yêu cầu. |

## 7. Liên kết nguồn

- Đặc tả use case nguồn: [UseCase.md](04_Use_Cases.md).
- Các mã chức năng trong tài liệu này giữ nguyên mã `CN`, `DA`, `KS`, `AI`, `SC`, `HT`, `BC`, `QT` của đặc tả nguồn để dùng khi phân tích, thiết kế, lập trình và kiểm thử.


## 8. Ghi chú thay đổi và điểm chờ quyết định R3

| Phần cũ | Thao tác | Phần thay thế |
|---|---|---|
| Vai trò Supervisor nhập tuyến | Thay | US-03/30: PM nhập, US-31: Supervisor xác nhận |
| US-08 bắt đo mọi detection | Bỏ gate chung | US-08-AC-03: đo khi cần; US-20 và nghiên cứu giữ nguyên nghĩa |
| US-11 duyệt/đợi cả batch | Thay | US-11-AC-02/03/04: quyết định từng item, phần đạt được giao |
| US-12 giao cả đợt cho đội trưởng | Thay | Giao Crew/item/scope theo nhánh, giữ history |
| US-13 BEFORE luôn mới và chỉ gửi online | Thay | Nguồn ảnh theo nhánh, xếp hàng offline, server nhận đủ mới nộp chính thức |
| US-14 Supervisor đóng mọi lỗi | Thay | Fast Track PM đóng, hỗn hợp Supervisor đóng tổng |
| US-20 VERIFIED bắt buộc trước mọi sửa | Giới hạn lại | Nhánh thường giữ; Fast Track được giao có ngoại lệ |
| TN12 đã có trong UseCase nguồn | Giữ | TN12 vẫn là từ chối nhiệm vụ trước tiếp nhận; TN07 bổ sung quản lý đo theo đợt, không thay TN12 |
| US-21–26 chỉ có trace | Thêm thân | Reporter/case/segment/coverage/AI với AC cụ thể |
| US-28–32 có trong Sprint, chưa có thân ở file này | Thêm thân đúng mã | Mời/timeline/GPX/xác nhận/segment; không đổi nghĩa ID |
| Policy/offline/gom đợt/ưu tiên/tấm/nhánh/tái phát/chỉ đường | Thêm | US-33–41; Q01–Q18 giữ rõ phạm vi mở |
| Lỗi gõ “từিসে chối”, “Supervisor từ chức” | Sửa biên tập | “từ chối”; không đổi nghiệp vụ |

Các story US-01/05/06/07/09/10/15/16/17/18/19/27 giữ phần không bị thay đổi; ghi chú chung R3 áp dụng phạm vi quyền/offline. Nguồn User Story cũ và Research RS01–RS06 không bị xóa. Chưa chạy acceptance test; không đánh dấu bất kỳ story mới là Done. Công bố từng phần, gộp 1–2 m, mở lại case Supervisor, Q01 và tiêu chí SRT còn chờ chốt, không tự coi Then đề xuất là yêu cầu đã duyệt.
