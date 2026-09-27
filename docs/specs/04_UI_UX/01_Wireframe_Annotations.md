# RoadGuard — 12. Wireframe / Mockup Annotation

**Phiên bản:** EXT-R3-2026-09-26-v1 • **Ngày:** 26/09/2026 • **Trạng thái:** bản đặc tả bổ sung để review, chưa xác nhận triển khai hoặc nghiệm thu.

**Nguồn chuẩn:** 9 tệp người dùng cung cấp ngày 26/09/2026; xem bảng nguồn trong README. Quyết định CHỐT/KẾ THỪA trong nguồn giữ nguyên. Các chi tiết mới dưới nhãn **ĐỀ XUẤT** phải được PO/chủ dự án duyệt trước khi thành baseline. Q01–Q18 vẫn theo Mô tả dự án §21; không tự giải quyết bằng tài liệu này. Mã trường ở đây là mapping logic, không xác nhận schema/endpoint đã tồn tại.

## 12.1 Cách dùng và quy ước annotation

Đây là wireframe logic mức low-fidelity bằng bố cục bảng và annotation, dùng bàn giao BA → UX/FE/QA; chưa là thiết kế hình ảnh hoặc giao diện đã được PO duyệt. Ký hiệu `*` = bắt buộc khi gửi chính thức; `C` = bắt buộc có điều kiện; `R` = chỉ đọc; nháp cho phép thiếu nhưng luôn chỉ rõ thiếu gì. Tên field phục vụ UX, mapping DD là tham chiếu logic.

Mỗi wireframe có vùng A tiêu đề/quyền, B nội dung, C thao tác, D lỗi/trạng thái. Trên mobile các vùng xếp dọc; Web có thể chia cột. FE không được thay kiểm quyền/validate server. Lưu nháp, ghi cục bộ, xếp hàng, đồng bộ thành công và nghiệp vụ đã nghiệm thu là các kết quả riêng.

## 12.2 Bố cục các màn hình chính

| ID | Màn hình | Vai trò | Vùng A | Vùng B | Vùng C | Vùng D | Trace |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WF-01 | Đăng nhập/đăng ký | Mọi vai trò; Reporter tự đăng ký | A: Đăng nhập / Đăng ký Reporter | B: Email, mật khẩu; đăng ký thêm tên, loại Reporter, OTP | C: Đăng nhập / Gửi OTP / Xác minh | D: Lỗi chung, cooldown; không tiết lộ email tồn tại | FR-01–03; CN01/10/11/12 |
| WF-02 | Dự án và tuyến | Supervisor tạo; PM nhập; Supervisor xác nhận tuyến | A: Dự án, PM chính, version/status | B: Bản đồ preview trái; GPX/track/CRS/width/corridor phải | C: Lưu nháp / Preview / Trình / Xác nhận / Chia segment | D: Dòng sai tọa độ, nhiều track, nháp chưa xác nhận | FR-04–09; DA01/02/13–17 |
| WF-03 | Phản ánh | Reporter | A: Phản ánh mới / nháp của tôi | B: Ảnh + vị trí/nguồn từng ảnh; mô tả | C: Thêm ảnh / Đặt vị trí / Gửi | D: Thiếu GPS, chưa rõ dự án, trạng thái gửi | FR-11; PA01/02 |
| WF-04 | Điều phối/Defect | PM; Supervisor theo quyền | A: Case, report nguồn, trạng thái xác minh | B: Bản đồ ứng viên; ảnh; severity/urgency; danh sách lỗi riêng | C: Kiểm chứng / Liên kết / Giữ riêng / Lập nhiệm vụ | D: Nguồn không đủ, nhiều vị trí ứng viên, quyết định stale | FR-10/12–14; PA03–05; DA18; SC14 |
| WF-05 | Policy và giao đo | PM; Crew đọc policy | A: Project, policy version, nhiệm vụ | B: Loại lỗi/điều kiện/đơn vị/biện pháp/bằng chứng; danh sách lỗi | C: Lưu policy / Chọn Crew / Giao chỉ-đo hoặc đo-và-sửa | D: Chưa đủ policy, PM block, batch chỉ-đo | FR-15/16/20; SC13; TN01/07 |
| WF-06 | Nhiệm vụ Crew | Crew được giao; Android | A: Task mode, nhánh, version, offline và trạng thái sync | B: Đích/ảnh; policy R; từng số đo; BEFORE; lý do không đủ điều kiện | C: Chỉ đường / Lưu đo / Bắt đầu sửa nếu đủ quyền / Gửi kết quả | D: Lỗi ngay tại field; banner chưa đồng bộ/xung đột | FR-17/18/21/22/32; TN02/03; HT02/04–08 |
| WF-07 | Duyệt và giao sửa | PM trình; Supervisor duyệt | A: Gói snapshot và version | B: Bảng từng item, phương án, ảnh, quyết định/lý do | C: Trình / Duyệt item / Trả item / Giao item đã duyệt | D: Stale version, item thiếu bằng chứng, thay đổi cần trình lại | FR-19/20; SC01–12 |
| WF-08 | Review và công bố | PM; Supervisor theo nhánh | A: Case/Defect/item/attempt/track riêng | B: BEFORE/AFTER cạnh nhau; nguồn/thời gian/số đo; kết quả review | C: Bổ sung / Sửa lại / PM đóng Fast Track / Trình Supervisor / Công bố | D: Thiếu tệp; hồ sơ hỗn hợp còn mở; Q06/07/08 | FR-23–25; HT09–13; PA06–08 |
| WF-09 | Khảo sát và upload | PM; Operator theo assignment | A: Mission, route/segment/band version | B: Bản đồ phạm vi và điểm tập kết; video/SRT; 3 kết quả quality/position/coverage | C: Nhận / Từ chối / Nhập / Tải / Yêu cầu bổ sung theo quyền | D: Thiếu SRT, file lỗi, checksum sai, đồng bộ chưa xong | FR-26–30/33; KS01–18 |
| WF-10 | Dashboard và xuất | PM; Supervisor | A: Scope, filters, as-of | B: KPI có đơn vị; biểu đồ/bảng; drilldown | C: Làm mới / Xuất PDF hoặc ZIP | D: Empty / loading / stale / partial / error riêng | FR-34/35; BC01–10 |
| WF-11 | Đồng bộ và xung đột | Crew/Operator; PM xử lý theo quyền | A: Thiết bị, lần sync cuối, dung lượng | B: Hàng đợi từng tệp/thao tác, lỗi có thể xử lý, snapshot | C: Thử lại / Đăng nhập lại / Xem nhiệm vụ; dọn bản đã xác nhận | D: Không xóa pending; thu hồi quyền không xóa bằng chứng | FR-22; CN05–09; Q04/17 |
| WF-12 | Quản trị và lưu trữ | Supervisor/Admin; PM yêu cầu xóa | A: Module accounts/model/retention | B: Quyền/danh mục/version; dữ liệu đến hạn và legal hold | C: Phát hành/ngừng; yêu cầu/duyệt xóa theo vai trò | D: Chặn trái quyền, giữ tranh chấp, retention chưa xác định | FR-02/35/36; QT01–14 |

## 12.3 Field, required, validation và hành vi khi lỗi

Các giới hạn byte, số ảnh, độ dài text, precision phép đo và tuổi ảnh phù hợp chưa được chốt: cấu hình theo NFR/contract; không tự đưa một con số thành business rule. Check required/format tại FE để phản hồi nhanh, BE kiểm lại quyền, version, quan hệ cùng project và mọi điều kiện chuyển trạng thái.

| Annotation | Field/mức bắt buộc | Validation và hành vi | Lỗi/phản hồi | Mapping |
| --- | --- | --- | --- | --- |
| WF-01.F01 | Email đăng ký * | CN11: gmail.com/googlemail.com; trim; chuẩn hóa không làm sai địa chỉ | Sai định dạng: dưới field; không tạo quyền; thông báo đăng ký không lộ tài khoản tồn tại | User email |
| WF-01.F02 | Tên/ReporterType/mật khẩu *; OTP C | OTP bắt buộc xác minh; hạn/thử lại/cooldown do security config; role REPORTER R | Sai/hết hạn giữ màn hình xác minh; không cấp token; không log OTP/mật khẩu | Registration intent; OTP hash |
| WF-02.F01 | PM chính *; thông tin bàn giao/bảo hành * theo bước | Một PM chính; ngày hợp lệ, ngày kết thúc không trước bắt đầu; không suy thời hạn pháp lý | Chặn lưu chính thức; giữ nháp; chỉ Supervisor đổi PM và giữ lịch sử | Project; BR-01 |
| WF-02.F02 | GPX hoặc tọa độ C; track C; CRS * | Ít nhất nguồn tuyến; nhiều track phải chọn; không đổi waypoint-only thành tuyến; CRS thiếu chặn tính mét | Nêu track/dòng lỗi; bản gốc giữ nguyên; không tự sửa nhãn SRID | RoadSectionVersion/source; DR-04 |
| WF-02.F03 | Bề rộng mặt đường * theo khoảng; tổng vùng khảo sát * | Số dương; khoảng lý trình trong tuyến, không chồng/hở theo cấu hình; 12 m là tổng ±6 m đoạn thẳng | Hiển thị đơn vị m, mặt đường và vùng khảo sát hai lớp riêng | DD §9.1; DR-05 |
| WF-02.F04 | Chiều dài segment *; nút nhánh C | Dương; ranh nằm trên tuyến; không hở/chồng; giao khác cao độ không tự nối | Preview đoạn dư; không publish bản không hợp lệ; stale yêu cầu tải lại | RoadSegmentSet; Q13 |
| WF-03.F01 | Ảnh *; vị trí/nguồn C theo ảnh; mô tả * | Ảnh đọc được; GPS là EXIF/đặt tay/nguồn được ghi; lat −90..90, lon −180..180 cho WGS84 | Thiếu EXIF → cho đặt vị trí có nhãn nguồn; không dùng GPS upload giả GPS chụp | IncidentReport + evidence; FR-11 |
| WF-04.F01 | Severity/urgency C khi PM kết luận; lý do C | Hai giá trị riêng; Crew/Reporter chỉ đề xuất; NO_DEFECT bắt buộc lý do | Thiếu căn cứ → tiếp tục kiểm chứng; không đóng theo AI tự động | Defect; assessment/audit |
| WF-04.F02 | Ứng viên trùng/slab C | PM xác nhận; một tấm có nhiều lỗi; lưới dự kiến có nhãn; gần GPS không đủ căn cứ | Không tự merge hoặc đóng tấm; có lịch sử tách gộp sai | Case links; slab/defect |
| WF-05.F01 | Task mode *; danh sách lỗi *; Crew *; policy version C | INSPECT_AND_REPAIR cần policy; batch bắt buộc MEASURE_ONLY; cùng project; không ghi đè PM block | Khóa thao tác sửa trong batch và nêu “Nhiệm vụ này chỉ cho phép đo” | FieldInspectionTask; FastTrackPolicyVersion |
| WF-05.F02 | Rule/unit/ngưỡng/phương pháp/bằng chứng * cho policy sử dụng | Theo schema/range được chốt Q02/03; sửa bản đã giao → bản mới | Thiếu cấu hình giữ Draft; không tự eligibility = true | Policy.rules; preparation_list |
| WF-06.F01 | Số đo * theo loại; đơn vị *; dụng cụ C theo policy; ảnh đo * | Numeric hữu hạn; đúng đơn vị/precision/range policy; không âm với kích thước; zero tùy phép đo đã chốt | Highlight field lỗi; không chấp nhận phiên ngoài Fast Track thiếu ảnh/số liệu; Q05 phạm vi đo lại | FieldInspectionSession/GroundTruthMeasurement |
| WF-06.F02 | BEFORE C trước bắt đầu sửa; AFTER C khi báo hoàn thành | Cùng lỗi/lần sửa; ảnh Reporter/drone có thể dùng nếu phù hợp/truy nguồn; không đổi AFTER thành BEFORE | Chặn bắt đầu khi BEFORE thiếu; nếu đã sửa mà mất ảnh → ngoại lệ Q06, giữ hồ sơ | Evidence; RepairAttempt; DR-08 |
| WF-06.F03 | Điểm đích R; nguồn/độ chính xác R | WGS84; Operator cần điểm tiếp cận/tập kết; không tự trung điểm | Thiếu đích báo cần bổ sung; không mở Maps thì cho sao chép; không đổi task thành hoàn thành | AccessPoint/destination; FR-32 |
| WF-07.F01 | Quyết định từng item *; lý do C | APPROVE/REQUEST_EVIDENCE/REQUEST_RECONSIDER/REJECT; các nhánh trả/từ chối cần lý do | Item A duyệt được giao ngay; B chờ không chặn A; REJECT không đóng Defect | RepairItem approval snapshot |
| WF-07.F02 | Crew * khi giao; lý do C khi thay | Đúng membership; APPROVAL_TRACK đã duyệt; phương án/scope thay cần xét lại; bàn giao Q04 | Conflict giữ hai snapshot; không coi đội cũ offline đã nhận thu hồi | RepairAssignment |
| WF-08.F01 | Kết quả review *; lý do C nếu chưa đạt; ảnh public C | BE phải xác nhận đủ tệp; đúng nhánh; PM đóng FT, Supervisor nhánh duyệt/tổng hỗn hợp | Giữ phần đạt; không đóng tổng nếu còn phần bắt buộc; không tự public khi upload | Review/acceptance; BR-25/26/48 |
| WF-09.F01 | Scope/Operator *; điểm tiếp cận C; video * khi nộp; telemetry C | File type+content/checksum; ghép thời gian; thiếu telemetry không giả vị trí; reason * khi từ chối/hủy | Hiển thị thiếu dữ liệu riêng lỗi server; dữ liệu đã nộp không cho hủy KS14 | SurveyWorkItem; dataset; intervals |
| WF-09.F02 | Position/quality/coverage R; model/source/version R | UNKNOWN riêng; no detections không đồng nghĩa NO_DEFECT; baseline chỉ phần đủ được PM xác nhận | Đề nghị bổ sung vùng thiếu; không reset phần đạt | CoverageResult/manifest; Q11/14 |
| WF-10.F01 | Scope *; khoảng thời gian C; as-of R | Từ < đến; loại mốc thời gian rõ; nguồn so sánh tương thích | Không có dữ liệu ≠ lỗi truy vấn; tệp xuất lỗi có retry; không mất filter | RPT-01–10 metadata |
| WF-11.F01 | Sync status/error R; retry C | Chỉ synced khi server ACK đủ checksum; token hết hạn yêu cầu login; không tự xóa queue | Local saved có dấu riêng; conflict giữ bằng chứng; dọn pending bị chặn | SyncOperation; NFR-02/04/05 |
| WF-12.F01 | Scope/role *; lý do thay/ngừng C; version R | Không tự tăng role; audit; khi ngừng tài khoản liệt kê việc mở, Q17 cứu dữ liệu | Không cho truy cập server bằng phiên hết hiệu lực; local recovery riêng | User/membership/audit |
| WF-12.F02 | Yêu cầu xóa *; căn cứ hạn *; lý do hold/unhold * | Hết bảo hành +5 năm theo rule nền BR-45, hold ưu tiên chặn; Supervisor duyệt | Thiếu hạn hoặc đang hold → chặn; gỡ hold không tự xóa | Retention/deletion request; QT11–14 |

## 12.4 Trạng thái nút trên Crew: không cấp quyền qua UI

| Điều kiện | Lưu số đo | Bắt đầu sửa | Gửi/xếp hàng | Đóng lỗi |
|---|---|---|---|---|
| MEASURE_ONLY dù kết quả đạt policy | Có theo assignment | Không; nêu lý do chỉ-đo | Kết quả đo | Không |
| INSPECT_AND_REPAIR + policy đạt + đủ BEFORE + không PM block | Có | Có theo snapshot đã nhận | Kết quả sửa, AFTER và số đo | Không; PM kiểm |
| Chưa đủ dữ liệu/policy hoặc PM block | Có | Không; chỉ rõ thiếu/chỉ đạo PM | Báo PM | Không |
| APPROVAL_TRACK chưa được duyệt/giao | Theo nhiệm vụ đo riêng nếu có | Không | Không báo như thi công hợp lệ | Không |
| Mất mạng, nhiệm vụ/policy đã tải đủ | Có, lưu bền vững | Theo quyền đã tải; không đặt timer hết quyền offline | Xếp hàng; chưa đồng bộ | Không |
| Server báo nhiệm vụ đã đổi khi sync | Giữ dữ liệu | Theo xử lý xung đột được chốt Q04 | Không last-write-wins | Không |

## 12.5 Thông báo lỗi và hành vi chung — ĐỀ XUẤT contract

| Mã logic | Thông báo UI mẫu | Hành động phục hồi |
|---|---|---|
| REQUIRED / INVALID_UNIT | “Nhập chiều rộng và chọn đơn vị theo policy.” | Focus field; giữ mọi giá trị hợp lệ |
| NO_SCOPE | “Bạn không có quyền truy cập nội dung này.” | Không lộ tên/ảnh/tổng số; trở về danh sách |
| STALE_VERSION | “Nhiệm vụ đã được cập nhật. Xem thay đổi trước khi gửi lại.” | So sánh version; giữ nháp; không ghi đè |
| EVIDENCE_PENDING | “Ảnh chưa được máy chủ xác nhận. Báo cáo đang chờ đồng bộ.” | Mở hàng đợi; không ghi là đã nộp chính thức |
| BEFORE_MISSING | “Cần bằng chứng trước sửa hợp lệ để bắt đầu.” | Chọn ảnh nguồn có sẵn hoặc bổ sung trước sửa |
| TELEMETRY_UNKNOWN | “Chưa đủ dữ liệu để đánh giá vị trí/độ phủ.” | Bổ sung telemetry theo đúng video; PM xem phạm vi thiếu |
| STORAGE_FULL | “Không đủ dung lượng để lưu ảnh an toàn.” | Không báo đã lưu; cho dọn bản đã sync, không xóa bản pending |
| AUTH_REQUIRED | “Đăng nhập lại để tiếp tục đồng bộ.” | Giữ queue và bằng chứng, không auto logout làm mất local |

Không dùng màu đơn độc để truyền đạt trạng thái. Label tiếng Việt, đơn vị cạnh input, lỗi gắn field và summary đầu form; tab/focus hợp lý; thao tác kéo thả có nút thay thế. Modal hủy/xóa cần nêu đối tượng và hệ quả, giữ lý do theo quy tắc. Nút disabled phải có lý do có thể đọc được.

## 12.6 Kiểm chứng thiết kế

PO/UX walkthrough WF-05→06→08 cho Fast Track; WF-05→07→08 cho gom đợt; WF-09 cho thiếu telemetry; WF-03→04→08 cho Reporter; WF-11 qua restart/offline. QA kiểm TC-F01–37, các TC-A tương ứng và UAT-01–12. Mọi field mới không tìm thấy DD ghi đề xuất schema trong CR, không tự mở rộng backend scope. Chi tiết hiển thị/bố cục là đề xuất; quy tắc nguồn vẫn là chuẩn.
