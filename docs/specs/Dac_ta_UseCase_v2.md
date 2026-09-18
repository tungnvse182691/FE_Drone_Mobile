# Đặc tả use case RoadGuard / CÁT TƯỜNG

Phiên bản 11/09/2026 — dùng kèm các sơ đồ trong thư mục này.  
Căn cứ thêm: `Build/RoadGuard_Data_Dictionary_v1.md` là chuẩn dữ liệu/công nghệ ưu tiên; đề cương `RoadGuard_Contractor_Warranty_Inspection_phuonglhk.md` và các quyết định đã chốt (vai trò tiếng Anh, khảo sát gốc bàn giao, Backend C# + AI Python, **thu thập ground truth nghiên cứu là bắt buộc**).

## 1. Cơ sở và ranh giới

Căn cứ đề cương RoadGuard_Contractor_Warranty_Inspection_phuonglhk.md, tài liệu yêu cầu hệ thống đã chốt và đặc biệt là `Build/RoadGuard_Data_Dictionary_v1.md`. Khi có khác biệt, tên entity, field, kiểu dữ liệu logic, quan hệ và quy tắc trong Data Dictionary được dùng làm chuẩn; tài liệu tổng kết/giao diện cũ chỉ là tham khảo.

Ranh giới bao gồm ứng dụng di động Android, trang web (Web Dashboard), Backend, lưu trữ, dữ liệu không gian, và dịch vụ AI tách biệt. Toàn bộ người dùng là nhân sự nội bộ. Thiết bị bay thu thập dữ liệu ngoài thực địa; hệ thống này **không** điều khiển thiết bị bay.

### 1.1 Kiến trúc logic (đã hướng)

```
┌─────────────────────────────────────────────────────────────┐
│                    HỆ THỐNG ROADGUARD                       │
├─────────────────────────────────────────────────────────────┤
│  Android App              Web Dashboard                     │
│  (Drone Operator,         (Supervisor/Admin, PM)            │
│   Repair Crew)                                              │
│           │                        │                        │
│           └──────────┬─────────────┘                        │
│                      ▼                                      │
│           Backend Server (C# / ASP.NET Core)                │
│           - API, nghiệp vụ, auth, queue                     │
│           - Database (SQL Server + SQL Server Spatial)      │
│           - File storage                                    │
│                      │                                      │
│                      ▼  REST / queue (Phase 1: mock AI)      │
│           AI Service (Python)                               │
│           - Nhận video / job                                │
│           - Phát hiện hư hỏng (YOLO…)                       │
│           - Trả JSON: loại, confidence, bbox, GPS, metadata │
└─────────────────────────────────────────────────────────────┘
```

| Thành phần | Công nghệ gợi ý | Vai trò |
|---|---|---|
| Backend | **C#**, ASP.NET Core, SQL Server + SQL Server Spatial, EF Core | Auth, dự án, khảo sát, đợt sửa, gọi AI, lưu kết quả |
| AI Service | **Python** (FastAPI/Flask), YOLOv8, Docker | Xử lý video; trả detections JSON qua port/API |
| Giao tiếp BE ↔ AI | REST nội bộ hoặc message queue | Phase 1: Backend **mock** kết quả AI; Phase 2: nối service Python thật |
| Android | Kotlin | Upload video/SRT, nhiệm vụ, ảnh trước/sau, sync |
| Web Dashboard | (chưa bắt buộc chốt framework) | Quản lý dự án, xác minh AI, duyệt đợt, báo cáo |

AI, bộ lập lịch/hàng đợi xử lý và cơ sở dữ liệu là thành phần bên trong hệ thống (AI chạy như service riêng cùng hạ tầng, không phải bên thứ ba bên ngoài nghiệp vụ).

### 1.2 Tác nhân

| Tác nhân | Trách nhiệm |
|---|---|
| **Supervisor** (kèm quyền **Admin**) | Tạo dự án; nhập tuyến/đoạn đường sau bàn giao; phân công PM; duyệt danh sách lỗi và chi phí đợt sửa; xác nhận hoàn tất cuối cùng. Quyền Admin: cấp tài khoản, đặt lại mật khẩu, cấu hình, nhật ký, quản trị mô hình/dữ liệu. |
| **PM** (Project Manager) | Lập kế hoạch và yêu cầu khảo sát (gồm khảo sát gốc); hủy/thu hồi yêu cầu chưa có dữ liệu đã nộp; giao Drone Operator; kiểm tra danh sách phát hiện AI sơ bộ; bắt buộc giao Repair Crew đo thực tế; đánh giá kết quả đo và xác minh hư hỏng chính thức; yêu cầu/xác nhận bay bổ sung; lập đợt sửa; giao Repair Crew thi công; kiểm tra kết quả và trình Supervisor. **Một dự án chỉ có một PM chính; một PM có thể quản lý nhiều dự án.** |
| **Drone Operator** | Nhận/từ chối nhiệm vụ; thu thập và nhập video/SRT; theo dõi đồng bộ, chất lượng và xử lý; nộp dữ liệu bay bổ sung. |
| **Repair Crew** | Đội trưởng có tài khoản; nhận/từ chối đợt sửa hoặc nhiệm vụ đo đạc thực tế khi được giao; ghi số đo/bằng chứng; báo cáo tiến độ và hoàn thành. Thành viên đội không có tài khoản riêng. |

## 2. Cách đọc sơ đồ

Có các nhóm tổng quan, được phân rã thành các mục trong sơ đồ chi tiết. Một số mục là hành vi con bắt buộc, không có liên kết trực tiếp tới tác nhân; chúng được gọi qua «include». Đây là danh mục chức năng, không phải số màn hình hay số API.

- Đường liền không mũi tên: tác nhân tham gia chức năng.
- A «include» B: A bắt buộc thực hiện hành vi B trong điều kiện của A.
- A «extend» B: A bổ sung cho B khi điều kiện trên đường nối xảy ra.
- Đăng nhập, quyền dự án, phiên bản hồ sơ và trạng thái hợp lệ được áp dụng làm điều kiện chung.
- Gửi hồ sơ, duyệt hồ sơ và giao việc là các tương tác riêng qua nhiều thời điểm; không nối «include» chỉ để diễn tả bước trước/sau.

## 3. Quy tắc nghiệp vụ xuyên suốt

1. **Supervisor** tạo dự án. Các vai trò khác chỉ thấy dữ liệu trong phạm vi được phân công; Repair Crew không tự nhận đợt của đội khác.
2. **Một dự án chỉ có một PM chính. Một PM có thể quản lý nhiều dự án cùng lúc.** Supervisor phân công đúng một PM khi tạo/cập nhật dự án.
3. **Khảo sát gốc sau bàn giao:** sau khi công trình được bàn giao (ngoài hệ thống), Supervisor nhập dữ liệu đoạn đường / tuyến vào hệ thống, gắn hồ sơ bàn giao và thời hạn bảo hành, rồi phân công PM. PM lập yêu cầu khảo sát gốc (baseline), giao Drone Operator bay lần đầu để lấy dữ liệu mẫu phục vụ đối chiếu bảo hành trong thời gian bảo hành (hồ sơ lưu tối thiểu hết bảo hành + 5 năm — xem quy tắc lưu trữ).
4. Một yêu cầu khảo sát có thể gồm nhiều video. PM chọn công trình/phạm vi; Backend tự chia khối xử lý để giới hạn tài nguyên. Khối xử lý không thay thế đoạn đường quản lý trong hồ sơ công trình.
5. Nhập video phải sao chép vào bộ nhớ thiết bị và kiểm tra bản sao; không phụ thuộc thẻ nhớ còn cắm. Trích phụ đề định vị từ MP4 nếu có; cho bổ sung SRT tương ứng khi cần. SRT không được mặc định là nhật ký bay đầy đủ.
6. Khi có mạng và mở lại ứng dụng, hệ thống tiếp tục tải dữ liệu theo hàng đợi, có thể dùng Wi-Fi hoặc dữ liệu di động. Chỉ dọn bản sao cục bộ khi máy chủ xác nhận toàn vẹn và người dùng chủ động chọn dọn.
7. Lỗi định dạng, thiếu định vị hoặc dữ liệu không đạt được thông báo cụ thể. Sự cố máy chủ dùng cơ chế thử lại. **PM là người quyết định và xác nhận bay bổ sung** vùng chưa đạt, có thể đổi người và không giới hạn số lượt; mỗi lượt giữ lý do, phạm vi và nguồn gốc.
8. PM kiểm tra, hiệu chỉnh hoặc loại bỏ kết quả AI nhưng phải lưu lý do và lịch sử trước/sau. Kết quả được giữ lại là `Preliminary Defect`, ánh xạ bằng `Defect.status = OPEN` và chưa được xác minh chính thức; kết quả bị loại bỏ vẫn được lưu để đối chiếu. Nhãn được PM duyệt; Admin (Supervisor) phát hành mô hình.
9. Kết quả AI MVP gồm loại hư hỏng, độ tin cậy, khung bao (bounding box), liên kết khung hình/thời gian và vị trí GPS khi có. Kích thước vật lý trong MVP có thể chỉ là ước lượng 2D; không coi đầu ra YOLO tự có độ sâu hay độ chính xác địa lý đã bảo đảm. Tuy nhiên, **đề cương nghiên cứu bắt buộc** phải có một bộ dữ liệu validation riêng: kỹ sư đo thực địa bằng straightedge/depth gauge tại một mẫu điểm, ghép với số đo từ surface model và tính sai số/độ không chắc chắn. Bộ dữ liệu nghiên cứu này không biến toàn bộ pipeline nâng cao thành tiêu chí nghiệm thu MVP.
10. **Đo đạc thực tế bắt buộc:** với mọi `Preliminary Defect` được giữ lại, PM bắt buộc giao Repair Crew một nhiệm vụ đo đạc tại hiện trường. Kết quả được chuẩn hóa vào `FieldInspectionSession` và `GroundTruthMeasurement` theo Data Dictionary, có `road_section_version_id`, loại đo, giá trị, đơn vị, dụng cụ, phương pháp, người đo, thời điểm, `geography(4326)` và bằng chứng. Luồng đo đạc không tự tạo/sửa `Defect`, không tự chuyển `Warranty`; PM phải đánh giá kết quả đo rồi mới xác minh hư hỏng chính thức.
11. PM chỉ được chọn nhiều `Defect` đã hoàn tất đo đạc, có kết quả/bằng chứng được PM chấp nhận và đã xác minh chính thức để gộp đợt sửa. PM chỉ nhập chi phí dự kiến cho từng lỗi; không nhập biện pháp, vật liệu, khối lượng hoặc ưu tiên. Supervisor xét danh sách lỗi và chi phí toàn đợt, có thể nêu riêng lỗi chưa chấp thuận. PM sửa, hệ thống tính lại tổng chi phí và trình lại toàn đợt; lưu các phiên bản trước đó.
12. Chỉ giao Repair Crew khi phiên bản đợt hiện tại đã được duyệt. Một Repair Crew (đội trưởng) có thể quản lý nhiều đợt. Thay đổi danh sách lỗi hoặc chi phí vượt phê duyệt phải trình lại trước khi triển khai phần thay đổi.
13. Bằng chứng trước/sau, số liệu thực hiện và kết quả kiểm tra quản lý theo từng lỗi. PM kiểm tra rồi trình Supervisor; Supervisor xác nhận cuối cùng. Lỗi chưa đạt quay lại Repair Crew phụ trách; chỉ sửa lại những lỗi đó.
14. Lỗi phát sinh tại hiện trường phải đi qua xác minh và phê duyệt phạm vi; không tự chen vào công việc đã duyệt.
15. Thông tin nghiệp vụ ngừng sử dụng vẫn giữ lịch sử. Nhật ký truy vết chỉ đọc, lưu người/thời gian/trước/sau và nguồn dữ liệu.
16. Hồ sơ dự án lưu ít nhất đến hết bảo hành cộng 5 năm. Việc xóa sau hạn phải được Supervisor duyệt; đang giữ hồ sơ tranh chấp thì không được xóa.
17. Khi tài khoản bị ngừng sử dụng (QT01) mà còn nhiệm vụ hoặc đợt dở dang: hệ thống thu hồi phiên, chặn đăng nhập mới, **không xóa lịch sử** và **không tự hủy hay tự hoàn tất** công việc đang mở. Hệ thống lập danh sách việc cần bàn giao và thông báo người có quyền phân công lại. **Drone Operator:** PM phân công lại người bay (KS04); dữ liệu đã nộp được giữ. **Repair Crew:** PM phân công lại nhiệm vụ đo đạc (TN01) hoặc đợt sửa (SC11); bằng chứng đã gửi vẫn gắn đúng lỗi/đợt. **PM:** Supervisor gán đúng một PM mới (DA03); PM mới tiếp nhận yêu cầu khảo sát, đợt sửa và hồ sơ đang trình. Bản nháp trên thiết bị giữ nguyên chủ sở hữu; khi có mạng nếu tài khoản đã ngừng thì không đồng bộ và không chuyển nháp sang người khác.
18. **Chuẩn dữ liệu bắt buộc:** `Warranty` là aggregate riêng; `Survey.is_baseline_confirmed` là cờ xác nhận baseline; `SupplementarySurveyRequest` độc lập với `Survey`; `QualityCheck` phải trỏ đúng một trong `survey_file_id` hoặc `survey_data_version_id`; `Evidence` phải có đúng một FK nghiệp vụ đích. `Survey`, `Defect` và các phép đo phải neo vào `RoadSectionVersion` cụ thể khi có vị trí.
19. **Chuẩn kỹ thuật:** Backend dùng C# / ASP.NET Core / EF Core với SQL Server + SQL Server Spatial. GPS/raw location dùng `geography(4326)`; geometry kỹ thuật dùng UTM `32648` hoặc `32649` theo cấu hình dự án. JSON logic ánh xạ SQL Server `nvarchar(max)` và phải qua kiểm tra `ISJSON` cùng schema ứng dụng; không dùng cú pháp PostgreSQL/PostGIS trong use case hoặc API contract.

## 4. Danh mục chức năng và kết quả mong đợi

### 01. Truy cập và làm việc ngoại tuyến

| Mã | Chức năng | Tác nhân trực tiếp | Quy tắc / kết quả |
|---|---|---|---|
| CN01 | Đăng nhập / đăng xuất | Supervisor; PM; Drone Operator; Repair Crew | Tài khoản do Admin cấp; phiên đăng nhập xác định vai trò và quyền dự án. Phiên hết hạn hoặc mật khẩu đã đặt lại (CN10) thì phải đăng nhập lại. |
| CN02 | Xem và cập nhật hồ sơ cá nhân | Supervisor; PM; Drone Operator; Repair Crew | Chỉnh thông tin cá nhân; không tự thay đổi vai trò hay quyền dự án. |
| CN03 | Xem dự án và công việc trong phạm vi được giao | Supervisor; PM; Drone Operator; Repair Crew | Supervisor xem toàn bộ; các vai trò khác chỉ xem dữ liệu được phân công. |
| CN04 | Xem thông báo và nhắc việc | Supervisor; PM; Drone Operator; Repair Crew | Hiển thị thông báo phù hợp vai trò: khảo sát, kết quả, duyệt, sửa lại, từ chối/hủy nhiệm vụ, phân công lại, đến hạn bảo hành. |
| CN05 | Lưu công việc và bản đồ phục vụ ngoại tuyến | Drone Operator; Repair Crew | Chuẩn bị dữ liệu đã được phép truy cập để tra cứu khi mất mạng; phạm vi bản đồ phụ thuộc dữ liệu đã tải. |
| CN06 | Lưu bản nháp và bằng chứng khi không có mạng | Drone Operator; Repair Crew | Lưu dữ liệu trong bộ nhớ ứng dụng và hiển thị trạng thái chưa đồng bộ. |
| CN07 | Theo dõi và tiếp tục đồng bộ dữ liệu | Drone Operator; Repair Crew | Khi có mạng và mở lại ứng dụng, tiếp tục hàng đợi; hỗ trợ Wi-Fi và dữ liệu di động. |
| CN08 | Kiểm tra trạng thái đồng bộ an toàn | Drone Operator; Repair Crew | Chỉ báo đã đồng bộ khi máy chủ xác nhận đủ dữ liệu và kiểm tra tính toàn vẹn thành công. |
| CN09 | Dọn bản sao cục bộ đã đồng bộ an toàn | Drone Operator; Repair Crew | Người dùng chủ động chọn dọn; giữ bản chưa đồng bộ và dữ liệu nguồn trên máy chủ. |
| CN10 | Yêu cầu / đặt lại mật khẩu | Supervisor; PM; Drone Operator; Repair Crew | Người dùng gửi yêu cầu khôi phục. **Chỉ Supervisor (Admin) đặt lại mật khẩu**; bắt đổi mật khẩu ở lần đăng nhập kế tiếp. Không tiết lộ mật khẩu cũ. Ghi nhật ký người thực hiện và thời điểm (QT09), không ghi mật khẩu. Tài khoản đang ngừng sử dụng thì từ chối đặt lại. |

### 02. Dự án, bảo hành và kế hoạch khảo sát

| Mã | Chức năng | Tác nhân trực tiếp | Quy tắc / kết quả |
|---|---|---|---|
| DA01 | Tạo và cập nhật dự án | Supervisor | Supervisor tạo dự án sau (hoặc gắn với) bàn giao công trình; cập nhật thông tin quản lý công trình. |
| DA02 | Quản lý tuyến và đoạn đường | Supervisor | **Sau bàn giao, Supervisor nhập** hình học, lý trình, loại mặt đường và phạm vi công trình vào hệ thống; khác với các khối xử lý video. Mọi chỉnh sửa hình học/lý trình sau khi đoạn đã có khảo sát, lỗi hoặc đợt sửa đều **tạo phiên bản mới**: giữ hình học cũ, lý do, người và thời điểm; dữ liệu khảo sát/lỗi không bị tự gắn lại sang hình học mới. Ngừng sử dụng đoạn thay vì xóa. |
| DA03 | Phân công nhân sự và quyền theo dự án | Supervisor | **Giao đúng một PM chính cho mỗi dự án**; giao Drone Operator và Repair Crew theo nhu cầu; không cấp quyền xem dự án khác ngoài phạm vi. Một PM có thể được giao nhiều dự án. |
| DA04 | Quản lý hồ sơ bàn giao và thông tin bảo hành | Supervisor | Ngày nghiệm thu/bàn giao, thời hạn bảo hành, ngày hết bảo hành, giá trị giữ lại và tài liệu liên quan. |
| DA05 | Xem hồ sơ dự án và thời hạn bảo hành | Supervisor; PM | PM xem dự án được giao; Supervisor xem toàn danh mục. |
| DA06 | Lập và điều chỉnh kế hoạch khảo sát định kỳ | PM | Lập kế hoạch cho dự án, **gồm khảo sát gốc (baseline) ngay sau bàn giao** và các lần kiểm tra tiếp theo trong thời gian bảo hành. |
| DA07 | Xem lịch và nhắc khảo sát sắp đến hạn | PM | Nhắc theo lịch và trước hạn bảo hành; nhắc việc không tự tạo lệnh bay. |
| DA08 | Tạo yêu cầu khảo sát từ kế hoạch hoặc phát sinh | PM | Chọn công trình, phạm vi cần kiểm tra, loại yêu cầu (gốc / định kỳ / phát sinh), thời hạn và yêu cầu đầu ra. |
| DA09 | Ghi nhận hoãn / không triển khai khảo sát theo kế hoạch | PM | Bắt buộc lý do; nếu thời tiết có thể lên lịch ngày khác; lưu lịch sử quyết định. |
| DA10 | Chọn và xác nhận hồ sơ khảo sát gốc bàn giao | PM | Sau khi dữ liệu khảo sát gốc đã xử lý và được xác minh đủ, PM chọn/xác nhận phiên bản gốc để so sánh các lần sau trong bảo hành. |
| DA11 | Xem tình trạng công trình qua các kỳ khảo sát | Supervisor; PM | Theo dõi lỗi còn mở, mức độ và thay đổi so với hồ sơ gốc. |
| DA12 | Đóng / ngừng sử dụng dự án và tra cứu hồ sơ đã đóng | Supervisor | Ngừng tác nghiệp thông thường nhưng giữ hồ sơ theo thời hạn lưu trữ; không xóa cứng. |

### 03. Phân công khảo sát và tiếp nhận dữ liệu bay

| Mã | Chức năng | Tác nhân trực tiếp | Quy tắc / kết quả |
|---|---|---|---|
| KS01 | Phân công người bay cho yêu cầu khảo sát | PM | Giao đích danh một Drone Operator; yêu cầu có thể cần nhiều video. |
| KS02 | Xem và tiếp nhận yêu cầu khảo sát | Drone Operator | Người được giao xem phạm vi, thời hạn, hướng dẫn và xác nhận tiếp nhận; nếu không nhận được thì dùng KS03. |
| KS03 | Từ chối nhiệm vụ khảo sát kèm lý do | Drone Operator | Chỉ khi trạng thái Mới giao (chưa tiếp nhận). Lý do bắt buộc. Trả yêu cầu về PM để phân công lại (KS04). Đã nhận thì không tự từ chối; PM điều chỉnh phân công. |
| KS04 | Điều chỉnh lịch và phân công lại người bay | PM | Có thể đổi người thực hiện; lưu người cũ, người mới, lý do và lịch mới. |
| KS05 | Ghi nhận thông tin chuyến bay và tài liệu khảo sát | Drone Operator | Lưu thiết bị, thời gian, phạm vi đã bay, ghi chú và tài liệu thực hiện chuyến bay. |
| KS06 | Nhập và sao chép video từ thẻ nhớ vào ứng dụng | Drone Operator | Sao chép thật vào bộ nhớ thiết bị; không chỉ lưu đường dẫn trên thẻ nhớ; kiểm tra bản sao. |
| KS07 | Bổ sung tệp phụ đề định vị tương ứng với video | Drone Operator | Dùng khi video không có luồng phụ đề trích xuất được; kiểm tra ghép đúng video và thời gian. |
| KS08 | Kiểm tra tính hợp lệ và chất lượng dữ liệu khảo sát | Drone Operator | Kiểm tra định dạng, định vị, đồng bộ thời gian, độ rõ, ánh sáng, vùng phủ và độ chồng lấn; báo vùng không đạt. |
| KS09 | Gửi bộ dữ liệu khảo sát và theo dõi tải lên | Drone Operator | Nhiều video trong cùng lần khảo sát; xếp hàng ngoại tuyến; tiếp tục tải khi có mạng và mở ứng dụng. |
| KS10 | Xem tiến độ xử lý và kết quả kiểm tra chất lượng | Drone Operator; PM | Theo dõi trạng thái tiếp nhận, xử lý, hoàn tất hoặc lỗi; Backend gọi AI Service sau khi dữ liệu hợp lệ (hoặc trả mock ở Phase 1). |
| KS11 | Yêu cầu / xác nhận bay bổ sung vùng dữ liệu chưa đạt | PM | **PM xác nhận** cần bay bổ sung; chỉ rõ vùng và lý do; không giới hạn số lần; có thể giao người khác. |
| KS12 | Nộp dữ liệu bay bổ sung vào cùng lần khảo sát | Drone Operator | Giữ dữ liệu cũ và nguồn gốc mỗi lượt; hợp nhất có kiểm tra vùng phủ và đối sánh. |
| KS13 | Yêu cầu thử lại tác vụ xử lý thất bại | PM; Supervisor | Lỗi máy chủ thử lại trên dữ liệu đã lưu; lỗi dữ liệu chuyển PM quyết định bổ sung. |
| KS14 | Hủy / thu hồi yêu cầu khảo sát kèm lý do | PM | Lý do bắt buộc. Được hủy khi chưa có bộ dữ liệu máy chủ đã xác nhận toàn vẹn (chưa nhận hoặc đã nhận nhưng chưa nộp). Thông báo Drone Operator nếu đã giao/đã nhận. Không hủy khi đã có dữ liệu nộp thành công — khi đó chỉ điều chỉnh phân công (KS04) hoặc yêu cầu bổ sung (KS11). Yêu cầu đã hủy không xóa cứng; lưu trạng thái, lý do và lịch sử. Khác DA09 (hoãn kế hoạch, chưa tạo lệnh bay) và KS04 (đổi người/lịch, không hủy hẳn). |

### 04. Khai thác AI, rà soát sơ bộ và theo dõi hư hỏng

| Mã | Chức năng | Tác nhân trực tiếp | Quy tắc / kết quả |
|---|---|---|---|
| AI01 | Xem kết quả phân tích trên bản đồ và ảnh khảo sát | PM | Xem lỗi dự kiến, loại, độ tin cậy, khung bao và liên kết ảnh/video nguồn. |
| AI02 | Xem ảnh trực giao và mô hình bề mặt | PM | Hiển thị sản phẩm xử lý ảnh theo đề cương khi pipeline hỗ trợ; phạm vi phủ và trạng thái chất lượng. (Nâng cao / theo đề cương.) |
| AI03 | Xem vị trí, kích thước và độ không chắc chắn | PM | Trong sản phẩm: phân biệt ước lượng 2D, số đo surface model (nếu pipeline hỗ trợ) và số đo thực địa. Trong nghiên cứu: các số đo phải được ghép cặp và báo cáo sai số/độ không chắc chắn; không gán kích thước thật chỉ từ khung bao. |
| AI04 | Giữ lại một phát hiện sơ bộ để đo thực tế | PM | Tạo `Defect OPEN` để biểu diễn `Preliminary Defect`, lưu người/thời gian và chuyển sang bước bắt buộc giao đo; chưa xác minh chính thức. |
| AI05 | Hiệu chỉnh loại, mức độ, vị trí và vùng hư hỏng | PM | Cho phép sửa kết quả sai; lưu nguồn AI và phiên bản sau chỉnh; dữ liệu sửa có thể dùng làm nhãn. |
| AI06 | Loại bỏ phát hiện sai và giữ hồ sơ đối chiếu | PM | Đánh dấu đã loại bỏ, không xóa; giữ ảnh gốc và dữ liệu phục vụ kiểm tra, huấn luyện. |
| AI07 | Ghi lý do và lịch sử quyết định rà soát/xác minh | Hành vi con trong chức năng cha | Lưu người thực hiện, thời điểm, giá trị trước/sau, phiên bản mô hình và liên kết bằng chứng đo khi xác minh chính thức. |
| AI08 | Đối chiếu các phát hiện trùng cùng một hư hỏng | PM | AI có thể đề xuất gộp; **PM xác nhận gộp hoặc giữ riêng**. Tránh đếm một lỗi nhiều lần; giữ audit. |
| AI09 | Đối chiếu cùng hư hỏng qua nhiều lần khảo sát | PM | Xác nhận hoặc sửa ghép nối; dùng chung định danh lỗi khi đủ bằng chứng. |
| AI10 | Xem lịch sử và so sánh với hồ sơ gốc bàn giao | PM; Supervisor | Xem lần đầu xuất hiện, hình ảnh, số đo và quyết định theo thời gian so với baseline (DA10). |
| AI11 | Xem lỗi mới, ổn định hoặc đang phát triển | PM; Supervisor | So sánh các kỳ tương thích; báo thiếu dữ liệu khi chưa đủ căn cứ tính mức tăng trưởng. |
| AI12 | Xem cảnh báo hư hỏng cần ưu tiên kiểm tra | PM; Supervisor | Cảnh báo mức độ cao, thay đổi nhanh hoặc nứt cần theo dõi; không cam kết dự báo thời điểm hỏng. |
| AI13 | Bắt buộc yêu cầu đo đạc thực tế trước xác minh chính thức | PM | Với mọi `Preliminary Defect` được giữ lại, PM phải giao Repair Crew đo thực tế; kết quả lưu qua `FieldInspectionSession`/`GroundTruthMeasurement`, PM đánh giá trước khi chuyển `Defect OPEN` sang `VERIFIED`. |
| AI14 | Duyệt nhãn hư hỏng phục vụ huấn luyện | PM | Kiểm tra loại và vùng nhãn từ kết quả đã sửa hoặc báo cáo hiện trường trước khi đưa vào tập dữ liệu. |

### 05. Đo đạc thực tế bắt buộc

| Mã | Chức năng | Tác nhân trực tiếp | Quy tắc / kết quả |
|---|---|---|---|
| TN01 | Giao nhiệm vụ đo đạc thực tế | PM | Bắt buộc giao Repair Crew cho từng `Preliminary Defect` (`Defect OPEN`); chỉ rõ lỗi, `Survey`, `RoadSectionVersion`, loại đo cần thực hiện, thông tin cần xác minh và thời hạn. |
| TN02 | Xem và tiếp nhận nhiệm vụ đo đạc | Repair Crew | Đội trưởng xác nhận tiếp nhận; nếu từ chối trước khi nhận thì dùng TN12. |
| TN03 | Ghi số đo và bằng chứng tại hiện trường | Repair Crew | Ghi `measurement_type` (`DEPRESSION_DEPTH`, `SLAB_FAULTING_HEIGHT` hoặc `SHOULDER_EROSION_EXTENT`), `value`, `unit`, `instrument_name`, `measurement_method`, `measured_at`, vị trí `geography(4326)` và `evidence_file_id`; hỗ trợ ngoại tuyến. |
| TN04 | Gửi kết quả đo đạc cho PM | Repair Crew | Đồng bộ đầy đủ trước khi gửi chính thức; tạo/khóa bản ghi `FieldInspectionSession` và `GroundTruthMeasurement`. |
| TN05 | Đánh giá kết quả đo đạc và xác minh chính thức | PM | Kiểm tra đủ field, đơn vị, dụng cụ, vị trí, bằng chứng và tính phù hợp với `road_section_version_id`; chấp nhận để chuyển `Defect OPEN` sang `VERIFIED`, yêu cầu bổ sung hoặc chuyển `REJECTED` có lý do. |
| TN06 | Yêu cầu bổ sung phép đo/bằng chứng | PM | Nêu rõ mẫu hoặc loại đo còn thiếu; không ghi đè phép đo cũ, tạo bản ghi/phiên bản mới. |
| TN12 | Từ chối nhiệm vụ đo đạc thực tế kèm lý do | Repair Crew | Chỉ khi trạng thái Mới giao (chưa tiếp nhận). Lý do bắt buộc. Trả nhiệm vụ về PM để giao lại (TN01). Đã nhận thì không tự từ chối; PM điều chỉnh phân công. |

### 06. Lập, phê duyệt và phân công đợt sửa chữa

| Mã | Chức năng | Tác nhân trực tiếp | Quy tắc / kết quả |
|---|---|---|---|
| SC01 | Chọn và gộp thủ công nhiều lỗi vào một đợt sửa | PM | Chỉ chọn `Defect VERIFIED` có nhiệm vụ đo đã hoàn tất và kết quả/bằng chứng được PM chấp nhận; tránh giao trùng lỗi đang thuộc đợt sửa đang thực hiện. |
| SC02 | Nhập chi phí sửa chữa dự kiến cho từng lỗi | PM | Chỉ nhập số tiền dự kiến; không yêu cầu biện pháp, vật liệu, khối lượng hoặc ưu tiên. |
| SC03 | Tính tổng chi phí đợt sửa | PM | Hệ thống cộng chi phí từng lỗi và tính lại khi danh sách lỗi hoặc số tiền thay đổi. |
| SC04 | Trình toàn bộ đợt sửa cho Supervisor phê duyệt | PM | Gửi danh sách lỗi, chi phí và bằng chứng dưới một phiên bản hồ sơ. |
| SC05 | Thẩm định và quyết định phê duyệt toàn bộ đợt sửa | Supervisor | Supervisor duyệt **cả đợt**; đợt chỉ sẵn sàng phân công khi phiên bản hiện tại được duyệt đầy đủ. |
| SC06 | Đánh giá chi phí dự kiến | Hành vi con trong chức năng cha | Kiểm tra chi phí từng lỗi và tổng dự toán của phiên bản đang trình. |
| SC07 | Ghi lỗi chưa được chấp thuận và lý do yêu cầu chỉnh sửa | Supervisor | Có thể chỉ yêu cầu chỉnh một số lỗi; đợt quay lại PM để cập nhật. |
| SC08 | Chỉnh sửa hồ sơ đợt sửa theo yêu cầu Supervisor | PM | Sửa các mục bị trả lại, lưu phản hồi và thay đổi; giữ lịch sử các mục trước đó. |
| SC09 | Tính lại chi phí và trình lại toàn bộ đợt sửa | PM | Tạo phiên bản mới, tính lại tổng; không triển khai riêng phần cũ khi toàn đợt chưa duyệt. |
| SC10 | Phân công Repair Crew sau khi đợt sửa được duyệt | PM | Giao đích danh một đội trưởng phụ trách đợt; một đội trưởng có thể nhận nhiều đợt. |
| SC11 | Điều chỉnh phân công Repair Crew phụ trách | PM | Ghi lý do và lịch sử bàn giao; thay đổi danh sách lỗi hoặc chi phí đã duyệt phải trình lại. |
| SC12 | Theo dõi tiến độ và lịch sử phê duyệt đợt sửa | Supervisor; PM | Tra cứu phiên bản hồ sơ, người duyệt, thời điểm và tình trạng từng lỗi. |

### 07. Thi công, kiểm tra và xác nhận hoàn tất

| Mã | Chức năng | Tác nhân trực tiếp | Quy tắc / kết quả |
|---|---|---|---|
| HT01 | Xem và tiếp nhận đợt sửa chữa được giao | Repair Crew | Xem danh sách lỗi, lịch, chi phí đã duyệt và yêu cầu bằng chứng. Xác nhận tiếp nhận; nếu không nhận được thì dùng HT15. |
| HT02 | Xem vị trí và hướng dẫn tiếp cận lỗi tại hiện trường | Repair Crew | Sử dụng tọa độ, bản đồ và ảnh tham chiếu; hiển thị độ chính xác/ước lượng khi có. |
| HT03 | Ghi kế hoạch triển khai và phân việc trong đội | Repair Crew | Đội trưởng chịu trách nhiệm tổ chức đội; thành viên không có tài khoản riêng. |
| HT04 | Ghi bằng chứng trước và sau sửa chữa từng lỗi | Repair Crew | Ảnh, thời gian, vị trí, ghi chú; giữ bản gốc và tách trạng thái trước/sau. |
| HT05 | Cập nhật tiến độ và chi phí thực tế | Repair Crew | Ghi tình trạng và chi phí thực tế từng lỗi để PM đối chiếu. |
| HT06 | Báo cáo hư hỏng mới phát hiện tại hiện trường | Repair Crew | Lỗi phát sinh chuyển về PM xác minh; không tự thêm vào phạm vi đã duyệt. |
| HT07 | Gửi báo cáo hoàn thành cho PM | Repair Crew | Báo cáo theo từng lỗi trong đợt; hoàn tất đồng bộ và kiểm tra bằng chứng bắt buộc. |
| HT08 | Kiểm tra đủ bằng chứng trước/sau từng lỗi | Hành vi con trong chức năng cha | Chặn gửi chính thức nếu thiếu ảnh bắt buộc hoặc còn bản chưa đồng bộ. |
| HT09 | Kiểm tra kết quả sửa chữa của từng lỗi | PM | Đối chiếu chi phí đã duyệt, bằng chứng và kết quả; ghi đạt/chưa đạt kèm nhận xét. |
| HT10 | Yêu cầu sửa lại những lỗi chưa đạt | PM; Supervisor | PM hoặc Supervisor chỉ rõ lỗi chưa đạt và lý do; trả đúng Repair Crew đang phụ trách. |
| HT11 | Trình kết quả hoàn thành cho Supervisor xác nhận | PM | Chỉ trình kết quả đã được PM kiểm tra; giữ hồ sơ từng lỗi và chi phí thực tế. |
| HT12 | Xác nhận hoàn tất các lỗi và đợt sửa chữa | Supervisor | Supervisor quyết định cuối cùng; đợt chỉ đóng khi toàn bộ lỗi trong phạm vi đã đạt. |
| HT13 | Thực hiện sửa lại và bổ sung báo cáo từng lỗi | Repair Crew | Chỉ làm lại lỗi bị trả; giữ bằng chứng cũ, bổ sung phiên bản mới rồi gửi lại qua PM. |
| HT14 | Xem lịch sử sửa chữa và chi phí sau hoàn tất | Supervisor; PM; Repair Crew | Supervisor xem toàn bộ; PM và Repair Crew xem hồ sơ thuộc phạm vi phân công. |
| HT15 | Từ chối đợt sửa chữa được giao kèm lý do | Repair Crew | Chỉ khi đợt đã phân công và chưa tiếp nhận. Lý do bắt buộc. Không hủy đợt đã duyệt và không đổi phạm vi/chi phí. PM phân công lại (SC11). Cấm từ chối khi đã nhận, đang thi công hoặc đã có bằng chứng. |

### 08. Báo cáo quản lý và hồ sơ bằng chứng

| Mã | Chức năng | Tác nhân trực tiếp | Quy tắc / kết quả |
|---|---|---|---|
| BC01 | Xem tổng quan danh mục dự án bảo hành | Supervisor | Tình trạng, lỗi còn mở, dự án sắp hết hạn và tình trạng khảo sát. |
| BC02 | Xem tổng quan dự án được phân công | PM | Chỉ báo tương tự trong phạm vi quyền của PM. |
| BC03 | Xem chi phí sửa chữa dự kiến và thực tế | Supervisor; PM | Phân biệt dự toán đang chờ duyệt, đã duyệt và chi phí đã thực hiện; tránh cộng trùng. |
| BC04 | Xem công trình rủi ro cao và hư hỏng phát triển nhanh | Supervisor; PM | Hỗ trợ ưu tiên kiểm tra/sửa chữa; hiển thị căn cứ và độ tin cậy của chỉ báo. |
| BC05 | So sánh tình trạng giữa các dự án và kỳ khảo sát | Supervisor | So sánh tỷ lệ lỗi theo loại mặt đường, giai đoạn và phạm vi dữ liệu có thể so sánh. |
| BC06 | Xuất báo cáo theo dự án và khoảng thời gian | Supervisor; PM | Bộ lọc thời gian, phạm vi quyền và trạng thái được lưu trong thông tin báo cáo. |
| BC07 | Xuất hồ sơ bằng chứng cho đoạn đường hoặc một lỗi | Supervisor; PM | Chọn đoạn đường/toàn đoạn, lỗi nếu cần, và khoảng thời gian; đề xuất PDF tổng hợp kèm ZIP dữ liệu gốc. |
| BC08 | Tổng hợp ảnh gốc, số đo, lịch sử và quyết định | Hành vi con trong chức năng cha | Gồm hồ sơ bàn giao, khảo sát hiện tại, loại/số đo/độ không chắc chắn, sửa chữa, trách nhiệm (khi có) và phiên bản mô hình. |
| BC09 | Kèm nguồn gốc và thông tin kiểm tra toàn vẹn hồ sơ | Hành vi con trong chức năng cha | Kèm mã tệp, dấu kiểm tra toàn vẹn, thời gian, tác giả và lịch sử sửa đổi để đối chiếu. |
| BC10 | Tra cứu hồ sơ lưu trữ sau khi dự án đã đóng | Supervisor; PM | Dữ liệu vẫn truy xuất theo quyền trong thời hạn bảo hành cộng 5 năm hoặc lâu hơn khi còn giữ hồ sơ tranh chấp. |

### 09. Quản trị, mô hình AI và vòng đời dữ liệu

| Mã | Chức năng | Tác nhân trực tiếp | Quy tắc / kết quả |
|---|---|---|---|
| QT01 | Tạo, cập nhật và ngừng sử dụng tài khoản | Supervisor (Admin) | Không xóa lịch sử hành động khi tài khoản ngừng sử dụng. Khi ngừng mà còn việc mở: liệt kê việc cần bàn giao, thông báo PM/Supervisor; phân công lại theo quy tắc 17. |
| QT02 | Quản lý vai trò và quyền truy cập dự án | Supervisor (Admin) | Phân quyền theo bốn vai trò; thay đổi quyền được ghi nhật ký. |
| QT03 | Quản lý danh mục loại lỗi | Supervisor (Admin) | Ngừng sử dụng mục cũ thay vì làm mất dữ liệu lịch sử. |
| QT04 | Quản lý bộ quy tắc phân mức và dung sai có phiên bản | Supervisor (Admin) | Cố định quy tắc vận hành theo chuẩn đã chọn và loại mặt đường; thay phiên bản phải lưu căn cứ. |
| QT05 | Cấu hình nhắc khảo sát và nhắc trước hạn bảo hành | Supervisor (Admin) | Quản lý giá trị mặc định, nhắc định kỳ và mốc sắp hết hạn; không tự áp dụng thời hạn pháp lý chưa xác minh. |
| QT06 | Quản lý, phát hành và ngừng dùng phiên bản mô hình AI | Supervisor (Admin) | Lưu chỉ số đánh giá, ngưỡng vận hành và phiên bản áp dụng trên AI Service Python; kết quả cũ giữ mô hình nguồn. |
| QT07 | Xuất dữ liệu và nhãn đã được duyệt cho huấn luyện | Supervisor (Admin) | Chỉ xuất tập đã qua PM duyệt; có nguồn gốc, phiên bản và phân quyền. |
| QT08 | Theo dõi tác vụ xử lý, dung lượng và tình trạng máy chủ | Supervisor (Admin) | Giám sát tải/tiến trình/lỗi Backend và hàng đợi AI; tác vụ thất bại có thể thử lại trên dữ liệu còn nguyên. |
| QT09 | Tra cứu nhật ký truy vết và lịch sử thay đổi dữ liệu | Supervisor (Admin) | Nhật ký chỉ đọc; giữ tác giả, thời gian, trước/sau và nguyên nhân; không có chức năng sửa nhật ký. |
| QT10 | Quản lý thông tin thiết bị bay và tài liệu quy trình khảo sát | Supervisor (Admin) | Lưu thiết bị và tài liệu quy trình/checklist/hồ sơ chuyến bay theo đề cương; không điều khiển bay. |
| QT11 | Lập yêu cầu xóa dữ liệu đã hết hạn lưu trữ | PM | Hồ sơ đủ thời hạn được đưa vào danh sách chờ Supervisor duyệt; không xóa ngay khi hết bảo hành. |
| QT12 | Phê duyệt yêu cầu xóa dữ liệu hết hạn | Supervisor | Supervisor xem phạm vi và điều kiện; quyết định xóa phải được lưu lịch sử. |
| QT13 | Kiểm tra hạn lưu trữ và trạng thái giữ hồ sơ | Hành vi con trong chức năng cha | Tối thiểu hết bảo hành cộng 5 năm; chặn xóa khi có tranh chấp/đang giữ hồ sơ. |
| QT14 | Thiết lập / gỡ giữ hồ sơ phục vụ tranh chấp | Supervisor | Có căn cứ và lý do; gỡ giữ không tự động xóa dữ liệu. |

## 5. Đặc tả các tình huống trọng tâm

### 5.1 Khảo sát gốc sau bàn giao — DA01–DA10, KS01–KS14, AI04, DA10

**Điều kiện:** công trình đã bàn giao ngoài hệ thống; Supervisor có quyền tạo dự án.  
**Kết quả thành công:** dự án có đoạn đường, có đúng một PM, có hồ sơ khảo sát gốc (baseline) đã được PM xác nhận để đối chiếu bảo hành.

1. Supervisor tạo dự án (DA01) và nhập tuyến/đoạn đường, lý trình, loại mặt đường (DA02).
2. Supervisor ghi hồ sơ bàn giao và thời hạn bảo hành (DA04).
3. Supervisor phân công **đúng một PM** cho dự án (DA03). PM đó có thể đang quản lý các dự án khác.
4. PM lập kế hoạch / tạo yêu cầu **khảo sát gốc** (DA06, DA08) và phân công Drone Operator (KS01).
5. Drone Operator nhận nhiệm vụ, thu thập và nộp MP4 (+ SRT nếu cần) (KS02, KS06–KS09).
6. Backend lưu dữ liệu, gọi AI Service (Python) hoặc dùng mock ở Phase 1; PM xem tiến độ (KS10).
7. Nếu vùng chưa đạt, **PM xác nhận bay bổ sung** (KS11); Drone Operator nộp bổ sung (KS12).
8. PM xác minh phát hiện (AI04…) rồi **chọn và xác nhận hồ sơ khảo sát gốc** (DA10).
9. Các kỳ khảo sát sau so sánh với hồ sơ gốc (AI10, DA11) trong thời gian bảo hành.

**Ngoại lệ:** chưa phân công PM thì không tạo yêu cầu khảo sát gốc; dữ liệu không đạt thì chưa xác nhận DA10; thiếu định vị/định dạng thì không coi bộ dữ liệu đạt. PM hủy/thu hồi yêu cầu (KS14) khi chưa có dữ liệu đã nộp; Drone Operator từ chối kèm lý do (KS03) thì PM phân công lại (KS04), không coi khảo sát gốc đã hoàn tất. Chỉnh sửa tuyến/đoạn sau khi đã có khảo sát (DA02) tạo phiên bản mới, không tự gắn lại dữ liệu cũ.

### 5.2 Nhập dữ liệu khảo sát và xử lý — KS06–KS13

**Điều kiện:** Drone Operator được giao yêu cầu đang còn hiệu lực; thiết bị có đủ bộ nhớ để lưu bản sao. **Kết quả thành công:** bộ dữ liệu hợp lệ được lưu toàn vẹn trên máy chủ, xử lý xong (AI Service hoặc mock) và kết quả chuyển tới PM.

1. Drone Operator mở yêu cầu, chọn một hoặc nhiều video trên thẻ nhớ.
2. Ứng dụng sao chép, kiểm tra bản sao và gắn dữ liệu vào đúng lần khảo sát.
3. Hệ thống đọc định vị từ phụ đề trong video nếu có; nếu không, người dùng bổ sung SRT tương ứng.
4. Ứng dụng lưu hàng đợi; khi có mạng và được mở lại thì tiếp tục tải. Backend xác nhận toàn vẹn bộ dữ liệu.
5. Backend tạo tác vụ xử lý, gọi AI Service Python (hoặc trả kết quả mock), lưu detections.
6. Drone Operator / PM xem tiến độ, vùng dữ liệu chưa đạt và kết quả.

**Ngoại lệ:** thiếu bộ nhớ thì chưa coi nhập thành công; thiếu định vị hoặc sai định dạng thì không coi bộ dữ liệu đạt; lỗi máy chủ thử lại, không tự yêu cầu bay lại. Khi cần bổ sung, **PM xác nhận** vùng/lý do, có thể giao người khác; dữ liệu mới liên kết cùng lần khảo sát và không ghi đè bản gốc. PM không hủy yêu cầu (KS14) sau khi máy chủ đã xác nhận toàn vẹn bộ dữ liệu.

### 5.3 Kiểm tra phát hiện sơ bộ, đo thực tế và xác minh chính thức — AI01–AI14, TN01–TN06

**Điều kiện:** PM có quyền trên dự án; kết quả có liên kết dữ liệu nguồn và phiên bản mô hình. **Kết quả:** phát hiện bị loại có lý do, còn chờ rà soát/đo bổ sung, hoặc được xác minh thành `Defect` chính thức sau khi PM chấp nhận đo đạc thực tế.

1. Mở phát hiện trên bản đồ, xem ảnh/video, khung bao, loại và độ tin cậy.
2. Đối chiếu vị trí, số đo ước lượng, chất lượng, lỗi trùng và lịch sử khảo sát (kể cả hồ sơ gốc).
3. PM giữ lại thành `Preliminary Defect` bằng cách tạo `Defect OPEN`; hoặc sửa thuộc tính/vùng nhãn; hoặc đánh dấu đã loại bỏ và ghi lý do. `OPEN` chưa phải xác minh chính thức.
4. AI có thể đề xuất gộp trùng; PM quyết định gộp hoặc giữ riêng (AI08).
5. Với mọi `Preliminary Defect`, PM bắt buộc dùng AI13/TN01–TN06 để giao Repair Crew đo đạc; Repair Crew nhập số liệu và bằng chứng thực địa rồi gửi PM.
6. PM đánh giá kết quả: yêu cầu bổ sung nếu chưa đạt; chuyển lỗi sang `REJECTED` có lý do nếu thực địa không xác nhận; hoặc chuyển lỗi từ `OPEN` sang `VERIFIED` và liên kết đầy đủ nguồn AI, nhiệm vụ đo, số đo và bằng chứng nếu đạt.
7. Lưu quyết định và phiên bản; nhãn hiệu chỉnh phải được duyệt trước khi xuất huấn luyện. **Research Validation Track** vẫn thực hiện RS01–RS06 độc lập và phải giữ định danh/mục đích nghiên cứu riêng.

**Ngoại lệ:** chưa đủ căn cứ thì giữ trạng thái chờ xác minh. Vết nứt nhỏ vẫn được ghi nhận để kiểm tra; không tự loại chỉ vì nhỏ hoặc mô hình không chắc chắn.

### 5.4 Lập và trình đợt sửa — SC01–SC04

**Điều kiện:** lỗi ở trạng thái `VERIFIED`, nhiệm vụ đo thực tế đã hoàn tất, kết quả/bằng chứng đã được PM chấp nhận; PM có quyền; lỗi không đang được giao trùng trong một đợt khác đang thực hiện. **Kết quả:** phiên bản toàn đợt ở trạng thái chờ Supervisor duyệt.

1. Hệ thống chỉ hiển thị cho PM chọn thủ công các lỗi đã đo đạc đạt và xác minh chính thức cần xử lý cùng đợt.
2. Nhập chi phí dự kiến cho từng lỗi; không nhập biện pháp, vật liệu, khối lượng hoặc ưu tiên.
3. Hệ thống tính tổng dự toán; PM đính kèm bằng chứng và xác nhận danh sách lỗi.
4. Gửi toàn bộ đợt. Hệ thống lưu phiên bản được trình để Supervisor đánh giá.

**Ngoại lệ:** lỗi chưa hoàn tất đo hoặc kết quả chưa được PM chấp nhận thì bị chặn chọn/gửi; thiếu chi phí hoặc bằng chứng bắt buộc thì giữ bản nháp; không cho giao thi công khi chưa duyệt.

### 5.5 Duyệt và trình lại — SC05–SC10

**Điều kiện:** Supervisor nhận phiên bản đợt đang chờ duyệt. **Kết quả:** đợt được duyệt toàn bộ hoặc được trả để chỉnh sửa.

1. Supervisor đánh giá chi phí từng lỗi và tổng chi phí.
2. Nếu đạt, duyệt phiên bản toàn đợt; PM có thể phân công Repair Crew.
3. Nếu một số lỗi chưa đạt, ghi rõ lỗi và lý do. Đợt chuyển về PM.
4. PM sửa các phần bị trả, tính lại tổng và trình lại toàn đợt ở phiên bản mới.

**Ngoại lệ:** quyết định ở phiên bản cũ không cho phép tự triển khai phiên bản đã đổi. Lưu lịch sử phần từng được chấp thuận để đối chiếu, không xóa quyết định cũ. Repair Crew từ chối đợt chưa nhận (HT15) thì chưa vào thi công; PM phân công lại (SC11), đợt đã duyệt vẫn còn hiệu lực.

### 5.6 Báo cáo hoàn thành và sửa lại — HT04–HT13, HT15

**Điều kiện:** Repair Crew đã tiếp nhận đợt đã duyệt. **Kết quả:** từng lỗi có bằng chứng và quyết định hoàn tất; cả đợt chỉ đóng khi mọi lỗi trong phạm vi đạt.

1. Repair Crew ghi ảnh trước/sau, tiến độ và chi phí thực tế cho từng lỗi.
2. Đồng bộ bằng chứng, gửi báo cáo cho PM.
3. PM kiểm tra từng lỗi. Lỗi chưa đạt được trả lại đúng Repair Crew và ghi lý do.
4. Với kết quả đạt, PM trình Supervisor. Supervisor xác nhận hoặc trả lại các lỗi chưa đạt.
5. Repair Crew chỉ sửa lại lỗi bị trả, bổ sung bằng chứng mới và gửi qua PM lần nữa.
6. Supervisor xác nhận hoàn tất; hệ thống đóng đợt khi đủ điều kiện và giữ lịch sử mọi lượt sửa.

**Ngoại lệ:** thiếu ảnh bắt buộc hoặc còn bằng chứng chưa đồng bộ thì chưa gửi chính thức. Phát hiện lỗi mới chuyển về luồng xác minh; phát sinh lỗi ngoài danh sách hoặc vượt chi phí đã duyệt phải trình điều chỉnh. Từ chối đợt (HT15) chỉ áp dụng trước khi tiếp nhận; đã nhận thì không tự bỏ, PM điều chuyển (SC11).

### 5.7 Xuất hồ sơ — BC06–BC10

**Điều kiện:** người yêu cầu có quyền đọc phạm vi dữ liệu được chọn. **Kết quả:** tệp xuất tái hiện được nội dung và nguồn gốc hồ sơ tại thời điểm xuất.

1. Chọn dự án, đoạn đường hoặc một lỗi và khoảng thời gian.
2. Hệ thống tổng hợp hồ sơ bàn giao, dữ liệu khảo sát, số đo, quyết định và bằng chứng sửa chữa.
3. Kèm phiên bản mô hình, nhật ký, thông tin tệp và dấu kiểm tra toàn vẹn.
4. Người dùng tải về. Phương án đề xuất là PDF tổng hợp cùng ZIP chứa dữ liệu gốc và bảng kê.

**Ngoại lệ:** dữ liệu thiếu phải được ghi rõ, không tạo cảm giác hồ sơ đầy đủ khi thiếu bằng chứng.

### 5.8 Xóa hồ sơ sau thời hạn — QT11–QT14

**Điều kiện:** dữ liệu đủ hạn bảo hành cộng 5 năm; không bị giữ do tranh chấp. **Kết quả:** Supervisor duyệt hoặc từ chối; lịch sử quyết định được bảo toàn.

1. Lập yêu cầu với phạm vi dữ liệu cụ thể và căn cứ hết hạn.
2. Hệ thống kiểm tra hạn lưu trữ, hồ sơ liên quan và trạng thái giữ hồ sơ.
3. Supervisor xem xét và quyết định.
4. Chỉ khi đủ điều kiện và đã duyệt mới thực hiện xóa theo chính sách; lưu biên bản/mục nhật ký về thao tác.

**Ngoại lệ:** còn thời hạn, đang tranh chấp hoặc chưa rõ phạm vi thì chặn xóa. Dọn bản sao trên điện thoại là chức năng riêng, không phải xóa hồ sơ trên máy chủ.

## 6. Các trạng thái để triển khai nhất quán

| Đối tượng | Các trạng thái nghiệp vụ chính |
|---|---|
| Nhiệm vụ khảo sát | Mới giao; đã nhận; từ chối; đã hủy; hoãn; đang thực hiện; đã nộp; yêu cầu bổ sung; hoàn tất. |
| Dữ liệu khảo sát | Đang sao chép; đã lưu cục bộ; chờ tải; đang tải; máy chủ đã xác nhận toàn vẹn; không hợp lệ. |
| Tác vụ phân tích | Chờ xử lý; đang xử lý; thất bại có thể thử lại; cần bổ sung dữ liệu; hoàn tất. |
| Phát hiện AI / Preliminary Defect | Chờ rà soát; cần kiểm tra thêm; chờ giao đo; đang đo; chờ PM đánh giá; đã loại bỏ; đã xác minh chính thức. `Preliminary Defect = Defect OPEN`; chỉ đo đạt mới chuyển `VERIFIED`. |
| Nhiệm vụ đo đạc thực tế | Mới giao; đã nhận; từ chối; đang thực hiện; cần bổ sung; đã gửi; hoàn tất. |
| Đợt sửa | Nháp; chờ duyệt; yêu cầu chỉnh sửa; đã duyệt; đã phân công; từ chối; đang thực hiện; chờ kiểm tra; cần sửa lại; hoàn tất. |
| Kết quả từng lỗi | Chưa sửa; đang sửa; chờ PM kiểm tra; cần sửa lại; chờ Supervisor xác nhận; đã hoàn tất. |

Các trạng thái ở bảng là đề xuất tên chuẩn cho thiết kế dữ liệu. Trạng thái đợt tổng hợp từ các lỗi; một lỗi đã đạt không bị kéo về chưa đạt chỉ vì lỗi khác cần sửa lại. Supervisor duyệt cả đợt khi phê duyệt danh sách lỗi/chi phí; khi xác nhận hoàn tất có thể trả riêng lỗi chưa đạt — đợt chỉ `Hoàn tất` khi mọi lỗi trong phạm vi đạt.

## 7. Đối chiếu độ phủ với đề cương

| Nhóm yêu cầu trong đề cương | Mã chức năng / nơi thể hiện |
|---|---|
| Danh mục dự án, giá trị giữ lại, thời hạn và nhắc bảo hành | DA01–DA12, BC01–BC05, QT05 |
| Hồ sơ khảo sát gốc lúc bàn giao | DA01–DA04, DA06, DA08, DA10, AI10, BC08; kịch bản §5.1 |
| Phân công bay, siêu dữ liệu, tiếp nhận và kiểm tra chất lượng | KS01–KS14, QT10 |
| Ảnh trực giao, mô hình bề mặt, phân tích hình học | AI02–AI03 (nâng cao); chuỗi xử lý nội bộ / AI Service |
| Phát hiện, phân đoạn, mức độ, ghép lỗi và theo dõi tăng trưởng | AI01–AI12, QT04, QT06; AI08 do PM xác nhận gộp |
| Đo đạc bắt buộc do Repair Crew | AI13, TN01–TN06 — áp dụng cho mọi phát hiện sơ bộ được giữ lại; PM kết luận sau khi đánh giá |
| Gộp đợt, duyệt ngân sách, phân công và bằng chứng sửa chữa | SC01–SC12, HT01–HT15 |
| Trang web cuối kỳ và ứng dụng hiện trường ngoại tuyến | Ranh giới tổng quan, CN05–CN09, KS06–KS09, HT04–HT07 |
| Báo cáo, hồ sơ bằng chứng, nguồn gốc và lưu trữ | BC01–BC10, QT09, QT11–QT14 |
| Dữ liệu nhãn và phiên bản mô hình | AI05–AI07, AI14, QT06–QT07 |
| Backend C# + AI Python tách service | §1.1 kiến trúc; KS10, QT06, QT08 |
| Đo đạc thực tế và thử nghiệm thực địa | AI13, TN01–TN06 cho căn cứ nghiệp vụ; RS01–RS06 cho Research Validation. |

## 8. Các điểm cần chốt khi đặc tả kỹ thuật, không cản trở vẽ use case

- **Stack đã hướng:** Backend **C# (ASP.NET Core)**; AI Service **Python** (YOLO), giao tiếp qua API/port; Phase 1 mock AI trên Backend. Framework Web Dashboard và chi tiết queue có thể chốt khi thiết kế kỹ thuật.
- Ngưỡng chất lượng ảnh/định vị/chồng lấn; giới hạn dung lượng, thời gian xử lý và số tác vụ song song cần chốt sau khảo sát thử. Không gán các con số thử nghiệm trước đây thành tiêu chuẩn đã nghiệm thu.
- Bộ quy tắc phân mức phải gắn đúng loại mặt đường, từng loại hư hỏng và phiên bản tài liệu chuẩn. Chưa mặc định các ngưỡng chiều rộng nứt áp dụng chung cho toàn hệ thống.
- Phân quyền PM lập yêu cầu xóa, định dạng PDF + ZIP và việc Repair Crew ghi kế hoạch phân việc là lựa chọn thiết kế được đề xuất; có thể tinh giản khi đặc tả màn hình mà không đổi bốn vai trò chính.
- **Đo đạc thực tế bắt buộc (AI13, TN01–TN06):** áp dụng cho mọi `Preliminary Defect` được PM giữ lại; Repair Crew là tác nhân thực hiện, dữ liệu lưu theo `FieldInspectionSession`/`GroundTruthMeasurement` của Data Dictionary; PM đánh giá trước khi xác minh `Defect` chính thức. 
- **Research Validation Track là bắt buộc theo đề cương:** phải lập mẫu các đoạn/điểm khảo sát, kỹ sư đo depression depth và slab faulting bằng straightedge/depth gauge, lưu phương pháp/dụng cụ/người đo/thời điểm/tọa độ, ghép với số đo từ surface model và báo cáo sai số (ít nhất bias, MAE/RMSE và độ không chắc chắn phù hợp thiết kế thí nghiệm).
- Ground truth nghiên cứu có thể được thu thập ngoài app bằng Excel/giấy, nhưng trước khi phân tích phải nhập/chuẩn hóa vào `FieldInspectionSession`, `GroundTruthMeasurement`, `DerivedMeasurement` và `MeasurementValidationSample` theo Data Dictionary. Đo đạc hỗ trợ nghiệp vụ do Repair Crew thực hiện cũng dùng cùng cấu trúc đo, nhưng không tự chuyển trạng thái `Defect` hoặc `Warranty`.
- Ảnh trực giao, mô hình bề mặt, so sánh RGB với RGB + surface model và nghiên cứu liên hệ xói lề–vỡ mép thuộc đề cương nghiên cứu. Sơ đồ chức năng không chứng minh mô hình đã đạt độ chính xác trước khi có báo cáo validation.

## 9. Research Validation Track (bắt buộc theo đề cương, độc lập với MVP sản phẩm)

Các mã `RS01–RS06` dưới đây là yêu cầu thực nghiệm của đề cương, không phải màn hình nghiệp vụ bắt buộc trong MVP. Việc ghi nhận ngoài app bằng Excel/giấy được phép, nhưng dữ liệu cuối cùng phải được chuẩn hóa và truy vết trong bộ dữ liệu nghiên cứu.

| Mã | Hoạt động bắt buộc | Kết quả tối thiểu |
|---|---|---|
| `RS01` | Chọn mẫu đoạn đường/điểm lún và điểm slab faulting đại diện; gắn với `RoadSectionVersion` và survey tương ứng. | Có danh sách mẫu và mã mẫu duy nhất. |
| `RS02` | Kỹ sư kiểm tra tại chỗ, ghi loại lỗi, mức độ, phạm vi; đo depression depth/slab faulting bằng straightedge và depth gauge. | Có `GroundTruthMeasurement` cho từng mẫu đo thực tế. |
| `RS03` | Ghi dụng cụ, phương pháp, người đo, thời điểm, vị trí, đơn vị và bằng chứng ảnh/biên bản. | Có chain of custody và metadata đủ tái hiện phép đo. |
| `RS04` | Ghép từng ground-truth sample với kết quả đo từ DSM/surface model hoặc pipeline tương ứng. | Có cặp `GroundTruthMeasurement`–`DerivedMeasurement`, không ghép theo thứ tự dòng không có ID. |
| `RS05` | Tính sai số và độ không chắc chắn; tối thiểu báo bias, MAE/RMSE và số lượng mẫu, kèm phương pháp tính. | Có `MeasurementValidationRun` và kết quả theo loại phép đo. |
| `RS06` | Đưa dữ liệu paired ground truth vào annotated dataset và báo cáo field trial. | Dataset/báo cáo nêu rõ mẫu, thiếu dữ liệu, outlier và giới hạn suy luận. |

Ràng buộc: RS01–RS06 chỉ là bằng chứng đánh giá độ tin cậy của phép đo và mô hình.
