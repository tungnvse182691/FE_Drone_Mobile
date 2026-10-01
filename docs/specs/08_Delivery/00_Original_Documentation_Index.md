# RoadGuard — Mục lục và hướng dẫn bàn giao bộ tài liệu R3

> Bản ghi từ gói bàn giao trước. Các hash/kết quả kiểm tra trong nội dung mô tả snapshot gốc, không phải xác nhận gói sau sắp xếp. Xem README gốc và 08_Delivery/03_Reorganization_Validation.md để kiểm bản hiện tại.
Ngày bàn giao: 26/09/2026. Trạng thái: **bản đặc tả để review và triển khai theo phạm vi được chốt**. Bộ tài liệu không phải xác nhận phần mềm đã hoàn thành; Q01–Q18 và các ngưỡng phi chức năng còn mở.

## 1. Bộ tài liệu và thứ tự đọc

| Thứ tự | Tài liệu | Nội dung chính |
|---|---|---|
| 1 | [Mô tả chi tiết dự án](../01_Overview/01_Project_Overview.md) | 23 phần: bối cảnh, vai trò, quy trình, mạng đường, tấm, drone, AI, quyết định và Q01–Q18. |
| 2 | [Business Rules](../02_Requirements/02_Business_Rules.md) | BR-01–48: quy tắc, trạng thái xác nhận, điều kiện kiểm chứng và truy vết. |
| 3 | [To-Be Process](../02_Requirements/03_To_Be_Process.md) | Tám flowchart Mermaid, các luồng hỗ trợ và ngoại lệ; không phải BPMN thực thi. |
| 4 | [FRD / SRS](../02_Requirements/01_FRD_SRS.md) | FR-01–37, NFR-01–14; tích hợp, dữ liệu; nghiên cứu BE/FE/AI ở §7, nguồn ở §8. |
| 5 | [Use Case Document](../02_Requirements/04_Use_Cases.md) | UseCase gốc đã chỉnh trực tiếp; giữ mã cũ và ghi THÊM/THAY THẾ/BỎ tại nơi thay đổi. |
| 6 | [User Story + Acceptance Criteria](../02_Requirements/05_User_Stories_Acceptance_Criteria.md) | US-01–41, Given/When/Then, ghi chú thay đổi và truy vết. |
| 7 | [Data Requirements / Data Dictionary](../03_Data/01_Data_Dictionary.md) | Trường, kiểu, null, FK; schema đề xuất §9; DR và migration §10; DD-C01–20 trước/sau và tác động P1/P2 ở §11. |
| 8 | [Log thay đổi và tác động P1/P2](../07_Change_Management/02_Use_Case_Change_Log.md) | Giữ lịch sử R1/R2, delta R3 ở §9.2; kết quả bàn giao ở §9.3. |

## 2. Các quyết định phải giữ khi triển khai

Model V2 hiện hành và code mapping: [ERD logic V2](../03_Data/02_ERD_V2.md), [Domain Model V2](../03_Data/03_Domain_Model_V2.md), [Data Model-Code Map](../03_Data/04_Data_Model_Code_Map.md), [State Machines](../05_Technical/07_State_Machines_V2.md). Các file này phân biệt `CURRENT_VERIFIED`, `TARGET_DOCUMENTED` và `PROPOSED_DELTA`; không sinh migration.

- PM giao một lỗi nhỏ theo nhiệm vụ đo-và-sửa: Crew được Fast Track nếu đo đạt policy và đủ bằng chứng. Số lượng lỗi hoặc severity thấp tự nó không cấp quyền sửa.
- Đợt gom nhiều lỗi chỉ đo và báo PM; PM giao sửa sau. Không biến năm lỗi nhỏ trong đợt mười lỗi thành quyền sửa ngay.
- PM lập policy. Crew không tự hạ kết luận nghiêm trọng của PM; lỗi ngoài phạm vi giao chỉ ghi nhận.
- Fast Track lưu hồ sơ, PM kiểm/đóng và gửi báo cáo Supervisor theo bản R3; không thêm bước Supervisor duyệt có được sửa hay không.
- Ngoại tuyến không có thời hạn tự hết quyền tác nghiệp vì mất mạng. Giữ snapshot nhiệm vụ/policy; tiếp nhận xung đột khi đồng bộ, không kéo dài token vô hạn.
- Ảnh Reporter/drone hoặc ảnh đo có thể làm BEFORE khi phù hợp và truy được nguồn. Không dựng BEFORE sau khi đã sửa; đo ngoài Fast Track thiếu ảnh/số đo bắt buộc chưa được công nhận.
- Tuyến/segment dùng quản lý, tấm dùng định vị, từng lỗi được đánh giá/nghiệm thu, nhóm công việc dùng gom sửa. Sửa D02 không tự đóng D01 cùng tấm.
- Vùng khảo sát ví dụ tổng rộng 12 m là ±6 m từ tim trên mặt cắt thông thường; bề rộng đường 8 m/10 m vẫn lưu riêng. 4 m/tấm là ví dụ, không là chuẩn chung.
- SRT trong vùng hỗ trợ kiểm vị trí; tách kết quả này khỏi chất lượng và độ phủ hình ảnh. AI và GPS gần nhau không tự kết luận trùng lỗi hoặc hết hư hỏng.

## 3. Các điểm còn mở và ảnh hưởng

Sổ quyết định duy nhất là §21 của [Mô tả dự án](../01_Overview/01_Project_Overview.md). Bảng dưới chỉ nhóm để review, không thay đổi nội dung hoặc tự trả lời.

| Nhóm | Mã | Cần làm rõ trước phần triển khai liên quan |
|---|---|---|
| Quyền sửa và policy | Q01–Q03 | Nhánh sửa sau đợt đo; phạm vi ban hành; ngưỡng, dụng cụ/vật tư và hạn mức cụ thể. |
| Offline và bằng chứng | Q04–Q06, Q17 | Thu hồi/bàn giao; đo lại toàn đợt hay phần thiếu; xử lý mất BEFORE; cứu dữ liệu khi tài khoản ngừng. |
| Nghiệm thu và công bố | Q07–Q08 | Ai mở lại case đã đóng; công bố kết quả từng lỗi hay toàn case. |
| Không gian, drone và chỉ đường | Q09–Q14 | Tiêu chí gợi ý trùng; dữ liệu tấm thật; ngưỡng SRT/coverage; người xác nhận đích; CRS và thiết bị/tệp mẫu. |
| Phạm vi sản phẩm | Q15–Q16, Q18 | Ghi GPS điện thoại; trước baseline/ngoài bảo hành; phân kỳ Sprint. |
| Phi chức năng | PERF-TBD, MAP-TBD, OPS-TBD, AI-TBD | Workload, hiệu năng, phục hồi và tiêu chí AI trên dữ liệu/thiết bị thực. |

Chỉ phần phụ thuộc quyết định đang mở cần chờ chốt. Nhóm kỹ thuật vẫn có thể rà repository, thiết kế contract, chuẩn bị fixture và triển khai phần độc lập trong phạm vi đã được giao.

## 4. Bàn giao cho nhóm triển khai

| Vai trò | Việc cần đối chiếu | Đầu ra cần có |
|---|---|---|
| P1 | Task mode, quyền sửa, policy, review/close, API và sync | Contract/state transition và lỗi nghiệp vụ gắn FR/US/BR; xác định delta so với code thật. |
| P2 | Field/FK/null, enum, version, bằng chứng, dữ liệu cũ | Mapping và kế hoạch migration/backfill có căn cứ; không đổi số enum hoặc tạo BEFORE/GPS giả. |
| FE Web/Android | Quyền hiển thị, bản đồ, policy, local queue, trạng thái sync | Luồng UI theo task mode; dữ liệu tồn tại qua restart; không biến cache API thành bằng chứng đã lưu an toàn. |
| AI | Adapter, manifest, model/data provenance và kiểm chứng | Hợp đồng output và kế hoạch thử nghiệm; mock chứng minh contract, không chứng minh độ chính xác. |

Không sửa trạng thái Done trong hai plan cũ chỉ từ tài liệu. Domain Model, ERD, Design v2 và Sprint spec là các nguồn cần đồng bộ tiếp theo khi phạm vi thiết kế/triển khai được giao; chúng chưa được cập nhật trong gói R3 này. Không dùng câu cũ trái R3 để ghi đè quyết định mới.

## 5. Cách đọc thay đổi và giới hạn gói

**THÊM**: nội dung mới. **THAY THẾ**: quy tắc cũ ngừng áp dụng, dùng nội dung mới tại chỗ. **BỎ**: bỏ quy tắc, không xóa lịch sử dữ liệu. **CHỐT**: quyết định người dùng. **KẾ THỪA**: quy tắc nền giữ lại. **ĐỀ XUẤT/TBD**: chưa được coi là đã duyệt.

Các liên kết giữa tám tài liệu R3 đã được sửa theo thư mục trong gói. Ở snapshot bàn giao, ADR 003, Incident/Segment Design, AI/Edge Design, tên file v1/v2, Domain Model và ERD không nằm trong ZIP. Checkout hiện tại đã đối chiếu các source này trong [`DOC-V2-RECON`](../../../../planning/V2/Governance/DOC-V2-RECON.md): ADR 003 là current accepted reference; các thiết kế ngày 22/09 là historical target/proposal; use-case và stories source cũ đã được bản V2 canonical thay thế cho bảo trì hiện hành. Kết quả mới không sửa lại sự thật lịch sử của snapshot ZIP.

Kiểm tra bàn giao: đủ nhóm ID FR/BR/US/DR/DD-C; không thiếu hoặc trùng tiêu đề FR/BR/US; đóng đủ hàng rào code; kiểm liên kết giữa các tài liệu trong gói. Chưa chạy phần mềm, kiểm thử API/DB, render Mermaid, bay drone hoặc đo độ chính xác AI. Nghiên cứu công nghệ được giữ trong FRD cùng nguồn và giới hạn, không phải quyết định ép đổi stack.
