# RoadGuard — 15. Test Case / UAT Scenario

**Phiên bản:** EXT-R3-2026-09-26-v1 • **Ngày:** 26/09/2026 • **Trạng thái:** bản đặc tả bổ sung để review, chưa xác nhận triển khai hoặc nghiệm thu.

**Nguồn chuẩn:** 9 tệp người dùng cung cấp ngày 26/09/2026; xem bảng nguồn trong README. Quyết định CHỐT/KẾ THỪA trong nguồn giữ nguyên. Các chi tiết mới dưới nhãn **ĐỀ XUẤT** phải được PO/chủ dự án duyệt trước khi thành baseline. Q01–Q18 vẫn theo Mô tả dự án §21; không tự giải quyết bằng tài liệu này. Mã trường ở đây là mapping logic, không xác nhận schema/endpoint đã tồn tại.

## 15.1 Phạm vi, trạng thái và cách chạy

Gói này là **thiết kế kiểm thử**, chưa chạy phần mềm. Có 37 ca mức FR, 175 ca từ từng mục AC nguồn, 9 ca báo cáo, 18 ca NFR (đặc tả ở phần 14) và 12 hành trình UAT. Các ca mức FR và AC có thể chồng lắp có chủ ý; QA có thể hợp nhất execution run nhưng phải giữ tất cả trace.

Mỗi lần chạy điền: Run ID, Test ID, build/commit, môi trường, thiết bị/browser, data fixture/version, người chạy, thời gian, Actual Result, PASS/FAIL/BLOCKED/NOT_RUN, evidence link và defect/CR ID. **Tất cả Actual Result hiện để trống, Execution Status = NOT_RUN.** Q còn mở là điều kiện chưa sẵn sàng chạy phần liên quan, không phải lỗi đã thấy trong app.

Mức ưu tiên đề xuất: P0 cho quyền, mất dữ liệu, Fast Track, đo-only, nghiệm thu và riêng tư; P1 cho luồng nghiệp vụ còn lại; performance/research theo NFR và scope đã chọn. PO xác nhận mức ưu tiên trước UAT.

## 15.2 Fixture dùng chung

| Fixture | Chuẩn bị có kiểm soát |
|---|---|
| FX-01 | Supervisor S; PM-A thuộc project A; PM-B thuộc B; Crew-A/Crew-B; Operator-A; Reporter R1/R2; tài khoản suspended; membership hết hạn. Không dùng người thật |
| FX-02 | Tuyến test dài 4.500 m, target segment 1.000 m; đoạn rộng 8 m và 10 m; corridor tổng12 m; CRS fixture phẳng 30/40/50 m và GeoJSON WGS84 riêng |
| FX-03 | D01/D02 cùng một tấm thật; D01 vỡ mép, D02 ổ gà; 5 report cùng D02; tấm dự kiến 4m và nhánh giao khác cao độ |
| FX-04 | Task một lỗi INSPECT_AND_REPAIR, policy TEST-v1 đã được owner môi trường test xác nhận, BEFORE phù hợp; 10 lỗi batch MEASURE_ONLY có 5 lỗi nhỏ; một task PM block |
| FX-05 | Approval package A/B/C: A được duyệt, B cần evidence, C bị từ chối; case hỗn hợp có một lỗi chưa đạt; hai phiên đồng thời cùng version |
| FX-06 | Ảnh BEFORE/AFTER, ảnh mất GPS, ảnh chụp cũ; tệp hỏng/thiếu part/URL hết hạn; video+SRT hợp lệ và video thiếu telemetry; mock được gắn nhãn |
| FX-07 | Worker có fault injection; mạng ngắt/reconnect; force-stop/reboot; token hết hạn; object storage môi trường thử; checksum được tính độc lập |
| FX-08 | Cặp derived/ground truth cùng đơn vị: (11,10), (18,20) → e=(1,−2), bias=−0,5, MAE=1,5, RMSE≈1,5811; không dùng làm accuracy thật |

TEST-v1 chỉ là fixture, không ban hành ngưỡng nghiệp vụ mới. Với test boundary policy, dùng T−δ, T, T+δ, null, sai đơn vị; quy tắc so sánh và δ do policy/precision được duyệt xác định. Không đoán `<` hay `≤`.

## 15.3 Ca kiểm thử theo FR

Tiền điều kiện chung: FX-01, build kiểm thử, scope đúng, đối tượng hợp lệ; test trái quyền thay role/ID có chủ ý. Đối chiếu không chỉ toast UI mà cả đối tượng nguồn/audit và file trạng thái. Mọi ca có NOT_RUN; ca chứa Q/đề xuất chỉ chạy kết luận tương ứng sau khi chốt.

### TC-F01 — Xác thực và quyền

**Trace:** FR-01; US-01, US-17; CN01 CN02 CN03 CN04 CN10 QT02 QT09. **Ưu tiên:** P0. **Phụ thuộc:** phạm vi module đã được giao.

**Dữ liệu/tiền điều kiện:** Tài khoản, phiên, role, membership/ownership. người ngoài phạm vi.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Đọc/sửa hoặc tải tệp qua ID/URL.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** bị chặn và không lộ dữ liệu. Đổi quyền trên server áp dụng request kế tiếp; việc chưa sync xét riêng xung đột.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F02 — Mời nhân sự

**Trace:** FR-02; US-28; QT01. **Ưu tiên:** P1. **Phụ thuộc:** phạm vi module đã được giao.

**Dữ liệu/tiền điều kiện:** Người mời có quyền, email, role, scope. lời mời đã dùng/hết hạn.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Nhận lại.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** không kích hoạt thêm tài khoản hoặc quyền; không log token/mật khẩu.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F03 — Reporter đăng ký

**Trace:** FR-03; US-27; CN11 CN12. **Ưu tiên:** P1. **Phụ thuộc:** phạm vi module đã được giao.

**Dữ liệu/tiền điều kiện:** Gmail, thông tin Reporter, mật khẩu và OTP. OTP sai/hết hạn hoặc client chọn PM.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Xác minh/đăng ký.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** không cấp quyền nội bộ và không cho gửi phản ánh chưa xác minh.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F04 — Khởi tạo và bảo hành

**Trace:** FR-04; US-03; DA01 DA03 DA04 DA05 DA12. **Ưu tiên:** P1. **Phụ thuộc:** phạm vi module đã được giao.

**Dữ liệu/tiền điều kiện:** Thông tin dự án, bàn giao/bảo hành, PM. Supervisor tạo dự án.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Giao PM và lưu.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** PM được nhập tuyến, người không thuộc dự án không được chỉnh. Chuyển PM giữ lịch sử.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F05 — CRS và tính mét

**Trace:** FR-05; US-24, US-30; DA02 DA13. **Ưu tiên:** P1. **Phụ thuộc:** Q13.

**Dữ liệu/tiền điều kiện:** Tọa độ nguồn, CRS, tuyến, station origin. CRS thiếu hoặc không tương thích.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Đo/buffer.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** không trả kết quả giả. Với dữ liệu phẳng chênh 30/40 m thì khoảng cách 50 m trong dung sai test; tuyến cong tính theo polyline.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F06 — Nhập/chỉnh tim và bề rộng

**Trace:** FR-06; US-30; DA02 DA13. **Ưu tiên:** P1. **Phụ thuộc:** Q13.

**Dữ liệu/tiền điều kiện:** GPX/chuỗi tọa độ, bề rộng theo đoạn, vùng khảo sát. đoạn rộng 8 m và 10 m với vùng tổng 12 m.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Preview.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** mặt đường khác nhau, biên vùng cách tim 6 m trên đoạn thẳng. GPX nhiều track phải chọn; waypoint-only không tự thành tuyến.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F07 — Xác nhận phiên bản tuyến

**Trace:** FR-07; US-31; DA13. **Ưu tiên:** P1. **Phụ thuộc:** phạm vi module đã được giao.

**Dữ liệu/tiền điều kiện:** Bản nháp hợp lệ, quyền Supervisor. bản đã xác nhận.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Retry cùng yêu cầu.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** không sinh version trùng. Sửa hình học đã dùng không ghi đè dữ liệu cũ. Contract retry cụ thể đồng bộ Sprint T4.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F08 — Chia và công bố segment

**Trace:** FR-08; US-24, US-32; DA14 DA15. **Ưu tiên:** P1. **Phụ thuộc:** Q18.

**Dữ liệu/tiền điều kiện:** Phiên bản tuyến, chiều dài/ranh segment. tuyến 4.500 m, target 1.000 m.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Chia.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** có bốn đoạn 1.000 m và đoạn 500 m. Không hở/chồng; đổi bộ không đổi job cũ. Phần dư quá nhỏ theo rule cấu hình còn chờ chốt.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F09 — Mạng nhiều nhánh

**Trace:** FR-09; US-38; DA17. **Ưu tiên:** P1. **Phụ thuộc:** Q18.

**Dữ liệu/tiền điều kiện:** Nút giao, polyline từng nhánh, chiều tuyến. hai nhánh gần nhau hoặc giao khác cao độ.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Gán vị trí.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** không tự nối/gán chắc khi thiếu căn cứ; PM xác nhận khi nhiều ứng viên.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F10 — Quản lý tấm

**Trace:** FR-10; US-36; DA18 AI08. **Ưu tiên:** P1. **Phụ thuộc:** Q10.

**Dữ liệu/tiền điều kiện:** Mốc khe, dải tấm, hoàn công hoặc chiều dài dự kiến. vỡ mép và ổ gà cùng tấm.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Nhóm.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** giữ hai Defect riêng. Ranh segment không cắt giả tấm; chưa đo khe không gọi lưới là tấm thật.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F11 — Gửi phản ánh

**Trace:** FR-11; US-21; PA01 PA02. **Ưu tiên:** P1. **Phụ thuộc:** phạm vi module đã được giao.

**Dữ liệu/tiền điều kiện:** Reporter, ảnh, vị trí/nguồn từng ảnh, mô tả. ảnh cũ được upload ở nơi khác.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Gửi.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** không dùng GPS upload làm vị trí chụp. Chưa rõ dự án giữ hàng điều phối, không mất dữ liệu.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F12 — Liên kết báo trùng

**Trace:** FR-12; US-22; PA03 AI08. **Ưu tiên:** P1. **Phụ thuộc:** Q09.

**Dữ liệu/tiền điều kiện:** Report/detection và ứng viên gần vị trí. năm report cùng lỗi.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. PM xác nhận liên kết.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** giữ năm nguồn, một phạm vi xử lý chính và không lộ danh tính. Khoảng 1–2 m không tự hợp khác loại lỗi.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F13 — Kiểm chứng phản ánh/AI

**Trace:** FR-13; US-08, US-20, US-22; PA04 PA05 AI01 AI04 AI05 AI06 AI07 AI13. **Ưu tiên:** P1. **Phụ thuộc:** phạm vi module đã được giao.

**Dữ liệu/tiền điều kiện:** Report/Defect sơ bộ và căn cứ. chưa cần số đo vật lý và bằng chứng drone đủ.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. PM xác minh.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** không bắt nhiệm vụ đo giả. Khi cần số đo mà thiếu thì chưa đủ điều kiện.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F14 — Phân cấp và ưu tiên

**Trace:** FR-14; US-34; SC14 AI05 AI12. **Ưu tiên:** P1. **Phụ thuộc:** phạm vi module đã được giao.

**Dữ liệu/tiền điều kiện:** Bằng chứng, severity/urgency, danh sách kế hoạch. gợi ý hệ thống đổi.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Refresh.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** thứ tự PM đã giao giữ nguyên. Reporter/Crew không tự ghi đè. Lỗi chờ gom vẫn giữ mức khẩn cấp.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F15 — Lập policy Fast Track

**Trace:** FR-15; US-33; SC13. **Ưu tiên:** P0. **Phụ thuộc:** Q02/Q03.

**Dữ liệu/tiền điều kiện:** PM, phiên bản, điều kiện, loại lỗi, biện pháp. Crew xem ngoại tuyến.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Mở nhiệm vụ đã tải.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** thấy đúng policy đã nhận. Không đủ cấu hình bắt buộc không tự kết luận đủ điều kiện. Quyền phát hành chi tiết Q02.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F16 — Gom đợt đo

**Trace:** FR-16; US-35; TN01 TN07. **Ưu tiên:** P0. **Phụ thuộc:** Q01.

**Dữ liệu/tiền điều kiện:** PM chọn lỗi lớn/nhỏ, đội, nhiệm vụ chỉ-đo. 10 lỗi có 5 lỗi nhỏ.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Crew đo thấy năm lỗi đạt policy.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** chỉ gửi kết quả, không tự sửa. PM phân công sửa bằng hành động riêng.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F17 — Phiên đo và xác nhận

**Trace:** FR-17; US-20; TN02 TN03 TN04 TN05 TN06 TN12. **Ưu tiên:** P0. **Phụ thuộc:** Q05.

**Dữ liệu/tiền điều kiện:** Task, người/đội, số đo/đơn vị, dụng cụ, vị trí, ảnh. phiên đo ngoài Fast Track thiếu ảnh hoặc số đo.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Nộp.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** không được chấp nhận và phải đo lại theo Q05. Số đo nhỏ hơn kết luận PM không cấp quyền sửa.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F18 — Fast Track cùng chuyến

**Trace:** FR-18; US-33; TN01 TN03 SC13 HT04 HT05 HT07. **Ưu tiên:** P0. **Phụ thuộc:** Q02/Q03/Q04/Q06.

**Dữ liệu/tiền điều kiện:** Nhiệm vụ đo-và-sửa, policy, BEFORE, số đo. một lỗi nhỏ được giao đo-và-sửa, offline và đạt policy.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Crew thực hiện.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** lưu kết quả/sync sau; không chờ PM duyệt từng số đo, không tự đóng.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F19 — Duyệt từng công việc

**Trace:** FR-19; US-11; SC01 SC02 SC03 SC04 SC05 SC06 SC07 SC08 SC09 SC12. **Ưu tiên:** P0. **Phụ thuộc:** phạm vi module đã được giao.

**Dữ liệu/tiền điều kiện:** Phương án/bằng chứng từng item, bản trình. A được duyệt, B cần ảnh, C bị từ chối.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Lưu.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** A đủ điều kiện giao, B chờ ảnh, C kết thúc đề xuất nhưng Defect mở.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F20 — Phân công Crew

**Trace:** FR-20; US-12; SC10 SC11 HT01 HT03 HT15. **Ưu tiên:** P0. **Phụ thuộc:** Q04.

**Dữ liệu/tiền điều kiện:** PM, item/phạm vi, Crew, thứ tự, phiên bản. item APPROVAL_TRACK chưa duyệt.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Giao thi công.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** bị chặn. Đổi đội giữ lịch sử; xung đột đội cũ offline không giải quyết bằng ghi đè.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F21 — Ảnh trước/sau và tiến độ

**Trace:** FR-21; US-13; HT04 HT05 HT06 HT07 HT08 HT14. **Ưu tiên:** P0. **Phụ thuộc:** Q06.

**Dữ liệu/tiền điều kiện:** Ảnh gốc/ảnh đo, thời điểm, lần sửa, số đo. Fast Track có ảnh Reporter phù hợp.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Ghi BEFORE.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** giữ nguồn, không giả ảnh Crew mới chụp. Thiếu BEFORE hợp lệ chặn bắt đầu theo app.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F22 — Hàng đợi ngoại tuyến

**Trace:** FR-22; US-02; CN05 CN06 CN07 CN08 CN09. **Ưu tiên:** P0. **Phụ thuộc:** Q04/Q17.

**Dữ liệu/tiền điều kiện:** Dữ liệu cục bộ, snapshot, thao tác đã gửi. app bị dừng/mất mạng khi upload.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Được chạy lại có mạng.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** tiếp tục không tạo bản ghi trùng. Mất mạng không tự hết quyền Fast Track.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F23 — Kiểm tra và đóng

**Trace:** FR-23; US-14, US-23; HT09 HT10 HT11 HT12 PA06. **Ưu tiên:** P0. **Phụ thuộc:** phạm vi module đã được giao.

**Dữ liệu/tiền điều kiện:** Báo cáo đủ tệp, kết quả theo lỗi. Fast Track đạt.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. PM xác nhận.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** đóng và báo Supervisor. Hồ sơ hỗn hợp còn một lỗi chưa đạt không được đóng tổng.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F24 — Sửa lại/tái phát

**Trace:** FR-24; US-14, US-37; HT10 HT13 PA08. **Ưu tiên:** P1. **Phụ thuộc:** Q07.

**Dữ liệu/tiền điều kiện:** Phản ánh sau sửa, hồ sơ trước và bằng chứng. cùng vị trí sau nghiệm thu.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Report mới.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** PM phân biệt, không auto merge hoặc auto reopen. Quyền mở lại hồ sơ Supervisor theo Q07.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F25 — Công bố kết quả

**Trace:** FR-25; US-23; PA02 PA07. **Ưu tiên:** P0. **Phụ thuộc:** Q08.

**Dữ liệu/tiền điều kiện:** Quyết định hợp lệ, ảnh được PM chọn. chưa được nghiệm thu.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Crew upload.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** không tự công bố REPAIRED. Công bố từng phần chờ Q08; không lộ bằng chứng nội bộ.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F26 — Nhiệm vụ khảo sát

**Trace:** FR-26; US-04, US-05, US-07; DA06 DA07 DA08 DA09 KS01 KS02 KS03 KS04 KS05 KS11 KS12 KS13 KS14 KS15. **Ưu tiên:** P1. **Phụ thuộc:** Q12/Q14.

**Dữ liệu/tiền điều kiện:** PM chọn version/segment/band, Operator, điểm tiếp cận. thiếu dữ liệu mép phải.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. PM yêu cầu bổ sung.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** giữ mép trái đã đạt và lịch sử, có thể đổi Operator.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F27 — Tiếp nhận video/telemetry

**Trace:** FR-27; US-06; KS06 KS07 KS08 KS09 KS10. **Ưu tiên:** P1. **Phụ thuộc:** Q14.

**Dữ liệu/tiền điều kiện:** Video, SRT/phụ đề, metadata chuyến. thiếu telemetry.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Upload video hợp lệ.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** không giả đủ định vị/coverage; giữ trạng thái thiếu theo contract. Không mất bản gốc khi retry.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F28 — Đánh giá SRT và coverage

**Trace:** FR-28; US-25, US-39; KS08 KS16. **Ưu tiên:** P1. **Phụ thuộc:** Q11/Q14.

**Dữ liệu/tiền điều kiện:** Video/telemetry đồng bộ, phạm vi nhiệm vụ. GPS trong vùng nhưng không nhìn được mép.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Đánh giá.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** không tự đạt coverage. Tách thời gian chuyển nhánh/cất-hạ cánh khi đủ dữ liệu; thiếu thì UNKNOWN.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F29 — AI bất đồng bộ

**Trace:** FR-29; US-26; AI15 AI16 AI17 KS10 KS13. **Ưu tiên:** P1. **Phụ thuộc:** phạm vi module đã được giao.

**Dữ liệu/tiền điều kiện:** Dataset, manifest, model/config có version. worker chết/retry.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Chạy lại.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** không mất manifest hoặc tạo kết quả nghiệp vụ trùng. Mock có nhãn; result muộn không ghi đè bản hiện hành.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F30 — Baseline và theo kỳ

**Trace:** FR-30; US-04, US-09, US-25; DA10 DA11 AI09 AI10 AI11. **Ưu tiên:** P1. **Phụ thuộc:** Q11/Q16.

**Dữ liệu/tiền điều kiện:** Dữ liệu/band đủ điều kiện, kết luận PM. mặt đường đủ nhưng mép thiếu.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Xác nhận.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** chỉ phần đủ được baseline; không đổi lịch sử khi model/tuyến thay.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F31 — Research validation

**Trace:** FR-31; US-20, US-26; AI03. **Ưu tiên:** P1. **Phụ thuộc:** phạm vi module đã được giao.

**Dữ liệu/tiền điều kiện:** Ground truth, derived measurement, sample IDs. mẫu thiếu hoặc không ghép được.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Tính.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** nêu số mẫu dùng/loại và lý do; không dùng mock làm bằng chứng độ chính xác.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F32 — Google Maps

**Trace:** FR-32; US-40; HT02 KS17. **Ưu tiên:** P1. **Phụ thuộc:** Q12.

**Dữ liệu/tiền điều kiện:** Task có quyền và đích WGS84. Operator chưa có điểm tập kết.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Bấm.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** yêu cầu bổ sung, không lấy trung điểm segment. Mở Maps không tự đổi trạng thái việc.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F33 — Lập phạm vi bay nhiều nhánh

**Trace:** FR-33; US-39; KS18 KS15. **Ưu tiên:** P1. **Phụ thuộc:** Q11/Q14/Q18.

**Dữ liệu/tiền điều kiện:** Nhánh/band, điểm cất-hạ cánh, nhóm mission. nhiều nhánh.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Lập kế hoạch.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** không bắt thứ tự trục-chính-trước cho mọi trường hợp; Operator kiểm tra mission ngoài RoadGuard, không gửi lệnh bay từ hệ thống.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F34 — Dashboard và timeline

**Trace:** FR-34; US-15, US-29; BC01 BC02 BC03 BC04 BC05 CN04. **Ưu tiên:** P1. **Phụ thuộc:** phạm vi module đã được giao.

**Dữ liệu/tiền điều kiện:** Sự kiện bền vững và trạng thái hồ sơ. sự kiện retry.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Đọc timeline.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** không nhân đôi; số thống kê phân biệt báo cáo/lỗi/tấm/việc sửa.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F35 — Xuất và lưu trữ

**Trace:** FR-35; US-16, US-19; BC06 BC07 BC08 BC09 BC10 QT11 QT12 QT13 QT14. **Ưu tiên:** P1. **Phụ thuộc:** phạm vi module đã được giao.

**Dữ liệu/tiền điều kiện:** Scope, bộ lọc, quyền, trạng thái giữ. tranh chấp/thiếu thời hạn.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Xóa.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** bị chặn. Tệp xuất ghi phần thiếu thay vì giả đầy đủ.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F36 — Quản trị cấu hình/mô hình

**Trace:** FR-36; US-17, US-18; QT01 QT02 QT03 QT04 QT05 QT06 QT07 QT08 QT09 QT10 AI14. **Ưu tiên:** P1. **Phụ thuộc:** phạm vi module đã được giao.

**Dữ liệu/tiền điều kiện:** Admin, rule/model versions, tài khoản. đổi model/rule.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Xem kết quả cũ.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** giữ phiên bản đã dùng; không tái tính ngược âm thầm.

**Actual:** chưa chạy. **Status:** NOT_RUN.

### TC-F37 — Emergency tạm

**Trace:** FR-37; US-41; SC10 HT12. **Ưu tiên:** P1. **Phụ thuộc:** Năng lực/giới hạn nhiệm vụ tạm TBD.

**Dữ liệu/tiền điều kiện:** PM kích hoạt, lý do và Crew đủ điều kiện. rào chắn xong nhưng hư hỏng còn.

1. Mở đúng màn hình/chức năng với vai trò được phép; ghi ID và version ban đầu.
2. Đóng nhiệm vụ tạm.
3. Mở lại đối tượng và lịch sử; so sánh với expected dưới đây, lưu bằng chứng.

**Expected:** Defect không tự RESOLVED; sửa chính thức tiếp tục theo nhánh phù hợp.

**Actual:** chưa chạy. **Status:** NOT_RUN.

## 15.4 Kịch bản UAT xuyên luồng

Mỗi hành trình sử dụng fixture đã nêu, chạy độc lập hoặc reset có kiểm soát. Người xác nhận là vai trò đề xuất, chưa có chữ ký. Điều kiện Q mở chỉ chặn bước phụ thuộc, không làm biến mất test invariant đã chốt.

### UAT-01 — Một lỗi Fast Track ngoại tuyến

**Người xác nhận đề xuất:** PM + Crew + Supervisor quan sát. **Fixture:** FX-04/06/07. **Trace:** TC-F15/18/21/22/23; US-33; Q02/03 chốt fixture, Q04 conflict riêng.

1. PM giao đo-và-sửa và policy TEST-v1.
2. Crew tải đủ.
3. bật máy bay/restart.
4. đo đạt, chọn BEFORE nguồn Reporter hợp lệ.
5. sửa/chụp AFTER.
6. xếp hàng.
7. có mạng sync.
8. PM review/đóng.

**Kết quả nghiệm thu:** Không chờ Supervisor cho phép sửa; dữ liệu tồn tại restart; chỉ một attempt hợp lệ; PM đóng và thông báo Supervisor; Crew không tự đóng.

**Actual / evidence / chữ ký:** chưa có. **Status:** NOT_RUN.

### UAT-02 — 10 lỗi gom đo có 5 lỗi nhỏ

**Người xác nhận đề xuất:** PM + Crew. **Fixture:** FX-04. **Trace:** TC-F16/17/20; US-35.

1. PM giao batch MEASURE_ONLY.
2. Crew đo 10 lỗi.
3. thử sửa 5 lỗi đạt policy.
4. nộp đo.
5. PM chọn kế hoạch và giao sửa riêng.

**Kết quả nghiệm thu:** Bước sửa trong chuyến đo bị chặn; không đổi task_mode do eligibility; Q01 chỉ chặn chọn track sửa sau đo, không chặn chứng minh chỉ-đo.

**Actual / evidence / chữ ký:** chưa có. **Status:** NOT_RUN.

### UAT-03 — Duyệt từng item và trình lại

**Người xác nhận đề xuất:** Supervisor + PM. **Fixture:** FX-05. **Trace:** TC-F19/20; US-11/12.

1. PM trình A/B/C.
2. Supervisor approve A, yêu cầu ảnh B, reject C có lý do.
3. PM giao A.
4. bổ sung B và trình bản mới.

**Kết quả nghiệm thu:** A không chờ B/C; C Defect vẫn mở; version cũ bất biến; B liên kết previous item.

**Actual / evidence / chữ ký:** chưa có. **Status:** NOT_RUN.

### UAT-04 — Hồ sơ hỗn hợp và sửa lại

**Người xác nhận đề xuất:** PM + Supervisor + Crew. **Fixture:** FX-03/05/06. **Trace:** TC-F21/23/24; US-14/36.

1. Hoàn tất D02 Fast Track.
2. PM đóng D02.
3. D01 nhánh duyệt chưa đạt.
4. yêu cầu sửa lại.
5. Crew nộp attempt mới.
6. PM trình/Supervisor xác nhận.

**Kết quả nghiệm thu:** Không đóng D01 hoặc case khi mới D02 đạt; giữ ảnh lần trước; chỉ đóng tổng đủ điều kiện.

**Actual / evidence / chữ ký:** chưa có. **Status:** NOT_RUN.

### UAT-05 — 5 report cùng lỗi và riêng tư

**Người xác nhận đề xuất:** Reporter R1/R2 + PM. **Fixture:** FX-03. **Trace:** TC-F11/12/25/34; RPT-AC-01/06.

1. 5 người gửi.
2. PM kiểm chứng/liên kết.
3. R1 mở hồ sơ của mình.
4. thử ID/ảnh của R2.
5. xem dashboard.

**Kết quả nghiệm thu:** 5 nguồn vẫn còn; một lỗi không thành 5 lệnh sửa; R1 không thấy PII/ảnh nội bộ của R2; MET-01/02 đúng.

**Actual / evidence / chữ ký:** chưa có. **Status:** NOT_RUN.

### UAT-06 — Phiên bản tuyến và nhiều nhánh

**Người xác nhận đề xuất:** PM + Supervisor. **Fixture:** FX-02/03. **Trace:** TC-F05–10; Q10/Q13/Q18.

1. Nhập GPX nhiều track.
2. chọn đúng track/CRS.
3. preview widths/corridor.
4. Supervisor xác nhận.
5. PM chia 1.000m.
6. tạo task.
7. tạo version tuyến mới.

**Kết quả nghiệm thu:** 4 đoạn 1.000m và 500m; ±6m corridor trên đoạn thẳng; không auto nối khác cao độ; task cũ giữ version.

**Actual / evidence / chữ ký:** chưa có. **Status:** NOT_RUN.

### UAT-07 — Upload và AI bất đồng bộ

**Người xác nhận đề xuất:** Operator + PM. **Fixture:** FX-06/07. **Trace:** TC-F27/29; NFR-02/05/10.

1. Nộp dataset.
2. cắt mạng giữa upload.
3. resume.
4. server kiểm checksum.
5. tạo job.
6. kill worker.
7. retry cùng key.
8. nhận late result.

**Kết quả nghiệm thu:** Không mất bản gốc; một job/result nghiệp vụ; mock có nhãn; no detections không auto NO_DEFECT; late result không ghi đè.

**Actual / evidence / chữ ký:** chưa có. **Status:** NOT_RUN.

### UAT-08 — Coverage và baseline từng band

**Người xác nhận đề xuất:** PM + Operator. **Fixture:** FX-06. **Trace:** TC-F26/28/30/33; US-25/39.

1. Nộp SRT trong corridor nhưng hình không thấy mép.
2. PM xem ba đánh giá.
3. yêu cầu bay bổ sung mép.
4. xác nhận phần đủ.

**Kết quả nghiệm thu:** Không suy GPS trong vùng là coverage đủ; phần baseline đạt giữ nguyên; thiếu telemetry UNKNOWN; ngưỡng Q11 phải chốt trước đánh pass định lượng.

**Actual / evidence / chữ ký:** chưa có. **Status:** NOT_RUN.

### UAT-09 — Dashboard và xuất snapshot

**Người xác nhận đề xuất:** PM + Supervisor. **Fixture:** FX-03/05. **Trace:** TC-F34/35; TC-R01–09.

1. Chọn scope/kỳ.
2. mở KPI/drilldown.
3. xuất PDF/ZIP tại T1.
4. đổi dữ liệu tại T2.
5. mở tệp T1 và export mới.

**Kết quả nghiệm thu:** Số report/lỗi/tấm/item không lẫn; bộ lọc/version/as-of rõ; thiếu ảnh ghi thiếu; tệp T1 không thay; quyền download vẫn kiểm.

**Actual / evidence / chữ ký:** chưa có. **Status:** NOT_RUN.

### UAT-10 — Nghiên cứu sai số

**Người xác nhận đề xuất:** PM + nhóm nghiên cứu được cấp quyền. **Fixture:** FX-08. **Trace:** TC-F31; NFR-10.

1. Ghép cặp cùng phép đo.
2. tính bias/MAE/RMSE.
3. bỏ một cặp do thiếu GT.
4. thử trộn mock vào real.

**Kết quả nghiệm thu:** Kết quả 2 cặp đúng fixture; số dùng/loại và lý do rõ; mock bị tách; dataset/model version giữ; không tự kết luận đạt AI-TBD.

**Actual / evidence / chữ ký:** chưa có. **Status:** NOT_RUN.

### UAT-11 — Thu hồi quyền và queue ngoại tuyến

**Người xác nhận đề xuất:** Supervisor + PM + Crew. **Fixture:** FX-01/04/07. **Trace:** TC-F01/20/22; TC-N01/04.

1. Crew tải nhiệm vụ.
2. offline ghi ảnh.
3. Supervisor ngừng tài khoản/PM đổi assignment.
4. reconnect.
5. thử sync.

**Kết quả nghiệm thu:** Server không chấp nhận quyền cũ như quyền hiện hành; không xóa local; giữ evidence và báo conflict/re-auth; cách bàn giao Q04/17 conditional.

**Actual / evidence / chữ ký:** chưa có. **Status:** NOT_RUN.

### UAT-12 — Lưu trữ và xóa có kiểm soát

**Người xác nhận đề xuất:** PM + Supervisor. **Fixture:** FX-01 + hồ sơ đến hạn/đang hold. **Trace:** TC-F35/36; US-19; TC-N08/11.

1. PM yêu cầu xóa hồ sơ đủ hạn.
2. Supervisor duyệt.
3. bật hold trước thực thi.
4. chạy job.
5. gỡ hold.

**Kết quả nghiệm thu:** Job recheck hold và chặn; gỡ hold không tự xóa; audit bất biến; chỉ xóa theo scope được phê duyệt đủ điều kiện tại execution.

**Actual / evidence / chữ ký:** chưa có. **Status:** NOT_RUN.

## 15.5 Bộ test chi tiết theo từng AC nguồn

175 mục AC được giữ nguyên nội dung và tham chiếu. Các mục nguồn gộp nhiều nhánh cần ghi kết quả riêng từng nhánh trong cùng run; chỉ PASS khi mọi nhánh áp dụng đạt. Nếu cần tách automation, dùng hậu tố `.1`, `.2` và giữ parent ID. Phần AC ở dạng mô tả kiểm chứng được dùng làm oracle; QA chọn fixture phù hợp theo §15.2 và ghi ID cụ thể vào execution record, không dùng dữ liệu production.

Với AC có Given/When/Then, thiết lập Given, thực hiện When, kiểm từng Then. Với AC dạng quy tắc, mở chức năng/đối tượng nêu trong AC, tạo dữ liệu hợp lệ rồi biến thể trái điều kiện, đối chiếu đầy đủ quy tắc. Các Q/ĐỀ XUẤT phải được PO xác nhận trước test gate tương ứng.

### TC-A001 — US-01 §AC mục 1

**Trace:** US-01; FR-01. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Đăng nhập và phiên làm việc**
   - **Given** tài khoản đang hoạt động và mật khẩu đúng
   - **When** người dùng đăng nhập
   - **Then** hệ thống tạo phiên, nhận diện đúng vai trò hiện tại từ server và chỉ tải các dự án/công việc thuộc membership active, còn hiệu lực và đúng vai trò.
   - Nếu tài khoản không tồn tại, bị ngừng sử dụng, mật khẩu sai hoặc phiên hết hạn, hệ thống từ chối truy cập và không tiết lộ thông tin nhạy cảm.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A002 — US-01 §AC mục 2

**Trace:** US-01; FR-01. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Đăng xuất và hết hạn phiên**
   - **When** người dùng đăng xuất hoặc phiên hết hạn
   - **Then** token/phiên hiện tại không thể gọi dữ liệu nghiệp vụ; người dùng phải đăng nhập lại.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A003 — US-01 §AC mục 3

**Trace:** US-01; FR-01. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Hồ sơ cá nhân**
   - **Given** người dùng đã đăng nhập
   - **When** người dùng sửa thông tin được phép
   - **Then** hệ thống lưu thay đổi và nhật ký; người dùng không thể tự đổi vai trò, quyền dự án hoặc tài khoản người khác.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A004 — US-01 §AC mục 4

**Trace:** US-01; FR-01. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Phạm vi dữ liệu**
   - **Given** PM, Drone Operator hoặc Repair Crew truy cập danh sách
   - **Then** chỉ các dự án, nhiệm vụ, lỗi và hồ sơ được phân công được hiển thị.
   - **Given** Supervisor truy cập danh sách
   - **Then** có thể xem toàn bộ dữ liệu thuộc danh mục được cấp quyền Admin.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A005 — US-01 §AC mục 5

**Trace:** US-01; FR-01. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Thông báo và nhắc việc**
   - **When** có sự kiện khảo sát, kết quả xử lý, yêu cầu duyệt, trả sửa, từ chối/hủy nhiệm vụ, phân công lại hoặc sắp hết hạn bảo hành
   - **Then** hệ thống tạo thông báo cho đúng vai trò, có liên kết tới đối tượng và trạng thái đã đọc/chưa đọc.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A006 — US-01 §AC mục 6

**Trace:** US-01; FR-01. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Đặt lại mật khẩu**
   - **Given** người dùng gửi yêu cầu khôi phục
   - **When** Supervisor (Admin) thực hiện đặt lại
   - **Then** mật khẩu cũ không bị hiển thị, tài khoản buộc đổi mật khẩu ở lần đăng nhập kế tiếp và nhật ký chỉ lưu người/thời điểm, không lưu mật khẩu.
   - Tài khoản đã ngừng sử dụng không được đặt lại mật khẩu.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A007 — US-27 §AC mục 1

**Trace:** US-27; FR-03. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Tạo đăng ký pending**
   - **When** người dùng gửi Gmail hợp lệ (`gmail.com` hoặc `googlemail.com`), display name, `ReporterType`, mật khẩu, confirm password và idempotency key
   - **Then** hệ thống tạo hoặc tiếp tục một registration intent với `User.status = PENDING`, `role_code = REPORTER`, `email_confirmed = false`; không cấp access/refresh token.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A008 — US-27 §AC mục 2

**Trace:** US-27; FR-03. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Gửi OTP**
   - Hệ thống tạo OTP bằng nguồn ngẫu nhiên bảo mật, chỉ lưu hash/HMAC, hạn dùng ngắn, số lần thử tối đa và cooldown resend; adapter Gmail trả provider correlation ID nhưng không lưu code plaintext.
   - Response public không tiết lộ email đã tồn tại, trạng thái account hoặc provider detail.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A009 — US-27 §AC mục 3

**Trace:** US-27; FR-03. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Xác minh OTP**
   - **Given** challenge chưa hết hạn, chưa consume và còn lượt thử
   - **When** Reporter gửi đúng OTP
   - **Then** hệ thống consume challenge một lần trong transaction, đặt `email_confirmed = true`, `email_confirmed_at`, chuyển User thành `ACTIVE` và có thể trả token pair chuẩn.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A010 — US-27 §AC mục 4

**Trace:** US-27; FR-03. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Từ chối an toàn**
   - OTP sai, hết hạn, đã dùng, sai purpose hoặc vượt giới hạn trả error ổn định, không làm account thành Active và không tiết lộ thông tin tài khoản khác.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A011 — US-27 §AC mục 5

**Trace:** US-27; FR-03. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Resend và retry**
   - Resend trước cooldown bị chặn; resend hợp lệ vô hiệu hóa challenge cũ và tạo challenge mới. Retry cùng idempotency key trả cùng registration outcome; payload khác cùng key bị từ chối.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A012 — US-27 §AC mục 6

**Trace:** US-27; FR-03. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Bảo mật và phân quyền**
   - Reporter tự đăng ký chỉ tạo role `REPORTER`; không tạo ProjectMember, không được chọn PM/Supervisor/DroneOperator/RepairCrew và không được gửi report trước khi verify.
   - Không log password, OTP, refresh token, Gmail provider secret hoặc nội dung email; audit chỉ lưu intent, thời điểm, kết quả và correlation ID.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A013 — US-02-AC-01

**Trace:** US-02; FR-22. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** nhiệm vụ có quyền đã tải; **When** thiết bị mất mạng hoặc khởi động lại; **Then** dữ liệu đã lưu/policy/ảnh còn đọc được, hiển thị version và chưa đồng bộ.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A014 — US-02-AC-02

**Trace:** US-02; FR-22. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** Fast Track có quyền theo nhiệm vụ/policy; **When** mất mạng lâu; **Then** không tự hết quyền vì thời gian; token server hết hạn không xóa nháp và khi sync có thể cần xác thực lại.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A015 — US-02-AC-03

**Trace:** US-02; FR-22. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** báo cáo đã gửi/xếp hàng; **When** có mạng và app được phép chạy; **Then** tự tiếp tục, retry không tạo bản ghi trùng; nháp chưa gửi không tự nộp.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A016 — US-02-AC-04

**Trace:** US-02; FR-22. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** thiếu tệp hoặc checksum sai; **When** server kiểm toàn vẹn; **Then** không đánh dấu an toàn/đủ nghiệm thu, không cho dọn tệp chưa an toàn.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A017 — US-02-AC-05

**Trace:** US-02; FR-22. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** PM đã đổi nhiệm vụ nhưng máy chưa nhận; **When** sync bản cũ; **Then** [ĐỀ XUẤT Q04] giữ snapshot/bằng chứng, báo xung đột cho PM, không last-write-wins.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A018 — US-03-AC-01

**Trace:** US-03; FR-04. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** Supervisor có quyền; **When** tạo dự án và giao PM; **Then** mã duy nhất, đúng một PM chính; PM không tự có quyền tạo dự án Supervisor.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A019 — US-03-AC-02

**Trace:** US-03; FR-04. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** PM được giao dự án; **When** nhập tim/bề rộng theo đoạn; **Then** lưu bản nháp để preview; người ngoài scope bị chặn.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A020 — US-03-AC-03

**Trace:** US-03; FR-04. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** hình học đã dùng; **When** PM chỉnh; **Then** tạo bản nháp/version mới, không đổi liên kết lịch sử; xác nhận theo US-31.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A021 — US-03-AC-04

**Trace:** US-03; FR-04. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** hồ sơ bàn giao/bảo hành hợp lệ; **When** lưu hoặc chuyển PM; **Then** giữ tài liệu, thời hạn và lịch sử phân công; không tự xóa khi ngừng dự án.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A022 — US-04-AC-01

**Trace:** US-04; FR-26, FR-30. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** tuyến/segment đã công bố; **When** lập kế hoạch gốc/định kỳ/phát sinh; **Then** scope và band rõ, nhắc việc không tự thành lệnh bay.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A023 — US-04-AC-02

**Trace:** US-04; FR-26, FR-30. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** mặt đường đủ nhưng mép phải thiếu; **When** xác nhận baseline; **Then** chỉ phần đủ được xác nhận, giữ phần thiếu để PM quyết định bổ sung.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A024 — US-04-AC-03

**Trace:** US-04; FR-26, FR-30. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** có kỳ sau; **When** đối sánh; **Then** đúng version/phạm vi tương thích, không tự đổi baseline lịch sử.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A025 — US-05 §AC mục 1

**Trace:** US-05; FR-26. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Phân công**
   - **Given** yêu cầu khảo sát còn hiệu lực
   - **When** PM chọn một Drone Operator và lịch thực hiện
   - **Then** hệ thống chuyển yêu cầu sang `Mới giao`, gửi thông báo và lưu người giao/thời điểm.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A026 — US-05 §AC mục 2

**Trace:** US-05; FR-26. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Tiếp nhận**
   - **When** Drone Operator xác nhận
   - **Then** yêu cầu chuyển `Đã nhận`, hiển thị phạm vi, thời hạn, hướng dẫn và cho phép nhập dữ liệu.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A027 — US-05 §AC mục 3

**Trace:** US-05; FR-26. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Từ chối**
   - **Given** trạng thái là `Mới giao`
   - **When** Drone Operator từ chối
   - **Then** phải nhập lý do, yêu cầu trả về PM để phân công lại và không được coi là hoàn tất.
   - Nếu đã tiếp nhận, Drone Operator không được tự từ chối; PM phải điều chỉnh phân công.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A028 — US-05 §AC mục 4

**Trace:** US-05; FR-26. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Phân công lại**
   - **When** PM đổi người hoặc lịch
   - **Then** hệ thống lưu người cũ, người mới, lý do, lịch mới và thông báo các bên liên quan.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A029 — US-05 §AC mục 5

**Trace:** US-05; FR-26. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Hủy/thu hồi**
   - **Given** chưa có bộ dữ liệu máy chủ xác nhận toàn vẹn
   - **When** PM hủy yêu cầu và nhập lý do
   - **Then** yêu cầu chuyển `Đã hủy`, thông báo Drone Operator nếu đã giao/đã nhận và giữ lịch sử.
   - **Given** đã có dữ liệu nộp thành công
   - **Then** hệ thống chặn hủy; PM chỉ được điều chỉnh phân công hoặc yêu cầu bay bổ sung.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A030 — US-05 §AC mục 6

**Trace:** US-05; FR-26. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Phân biệt hoãn và hủy**
   - Hoãn kế hoạch không tạo lệnh bay; hủy yêu cầu là trạng thái của lệnh đã tạo; đổi người/lịch không làm mất yêu cầu.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A031 — US-06 §AC mục 1

**Trace:** US-06; FR-27. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Ghi nhận chuyến bay**
   - **When** Drone Operator nhập thiết bị, thời gian, phạm vi đã bay, ghi chú và tài liệu
   - **Then** thông tin được liên kết với đúng yêu cầu khảo sát.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A032 — US-06 §AC mục 2

**Trace:** US-06; FR-27. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Sao chép từ thẻ nhớ**
   - **When** chọn video
   - **Then** ứng dụng sao chép nội dung thật vào bộ nhớ thiết bị, kiểm tra bản sao và không chỉ lưu đường dẫn thẻ nhớ.
   - Thiếu bộ nhớ phải được báo rõ và không đánh dấu nhập thành công.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A033 — US-06 §AC mục 3

**Trace:** US-06; FR-27. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Phụ đề định vị**
   - **Given** MP4 không có luồng phụ đề định vị trích xuất được
   - **When** Drone Operator bổ sung SRT
   - **Then** hệ thống kiểm tra ghép đúng video và khoảng thời gian; SRT không được coi mặc định là nhật ký bay đầy đủ.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A034 — US-06 §AC mục 4

**Trace:** US-06; FR-27. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Kiểm tra chất lượng**
   - **When** chạy kiểm tra
   - **Then** hệ thống kiểm tra định dạng, định vị, đồng bộ thời gian, độ rõ, ánh sáng, vùng phủ và chồng lấn; vùng không đạt có lý do cụ thể.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A035 — US-06 §AC mục 5

**Trace:** US-06; FR-27. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Nộp nhiều video**
   - **Given** các tệp thuộc cùng lần khảo sát
   - **When** Drone Operator nộp
   - **Then** hệ thống gom đúng lần khảo sát, lưu trạng thái từng tệp và xếp hàng tải khi ngoại tuyến.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A036 — US-06 §AC mục 6

**Trace:** US-06; FR-27. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Xác nhận máy chủ và xử lý**
   - **When** máy chủ nhận đủ và kiểm tra toàn vẹn thành công
   - **Then** dữ liệu chuyển sang xử lý; Backend lưu manifest/job bền vững theo dataset + segment + TargetBand + model/config, trả 202 + JobId; worker gọi AI ngoài hoặc mock có nhãn nguồn, retry/dedup theo fingerprint.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A037 — US-06 §AC mục 7

**Trace:** US-06; FR-27. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Theo dõi**
   - Drone Operator và PM xem được trạng thái `Tiếp nhận`, `Đang xử lý`, `Hoàn tất`, `Lỗi` hoặc `Cần bổ sung`, cùng thông báo lỗi có thể hành động.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A038 — US-07 §AC mục 1

**Trace:** US-07; FR-26. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Xác nhận nhu cầu bổ sung**
   - **Given** kết quả chất lượng chỉ ra vùng thiếu/không đạt hoặc tác vụ cần thêm dữ liệu
   - **When** PM chỉ rõ vùng, lý do và người thực hiện
   - **Then** hệ thống tạo yêu cầu bổ sung, liên kết cùng lần khảo sát và lưu người xác nhận/thời điểm.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A039 — US-07 §AC mục 2

**Trace:** US-07; FR-26. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Không giới hạn lượt**
   - PM có thể tạo nhiều lượt bổ sung; mỗi lượt có phạm vi, lý do, người và nguồn gốc riêng.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A040 — US-07 §AC mục 3

**Trace:** US-07; FR-26. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Nộp bổ sung**
   - **When** Drone Operator nộp dữ liệu
   - **Then** hệ thống giữ dữ liệu cũ, kiểm tra vùng phủ/đối sánh và ghi rõ tệp thuộc lượt bổ sung nào.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A041 — US-07 §AC mục 4

**Trace:** US-07; FR-26. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Thử lại tác vụ**
   - **Given** lỗi máy chủ trên dữ liệu đã lưu nguyên vẹn
   - **When** PM hoặc Supervisor chọn thử lại
   - **Then** hệ thống tạo lần xử lý mới trên cùng dữ liệu, giữ lịch sử lỗi/lần thử và không yêu cầu bay lại tự động.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A042 — US-07 §AC mục 5

**Trace:** US-07; FR-26. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Lỗi dữ liệu**
   - **Given** lỗi do định dạng, thiếu định vị hoặc chất lượng không đạt
   - **Then** hệ thống không cho coi thử lại máy chủ là giải pháp; PM phải quyết định bay bổ sung hoặc xử lý theo ngoại lệ.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A043 — US-08-AC-01

**Trace:** US-08; FR-13. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** AI trả detection; **When** mở xem; **Then** hiển thị loại/confidence/bbox/time/source/model, phân biệt ước lượng với số đo thật.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A044 — US-08-AC-02

**Trace:** US-08; FR-13. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** PM giữ ứng viên; **When** lưu; **Then** Defect OPEN có nguồn, chưa là xác minh chính thức; không tự tạo Survey/task đo giả.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A045 — US-08-AC-03

**Trace:** US-08; FR-13. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** quyết định cần số đo vật lý; **When** xác minh; **Then** phải có số đo được chấp nhận; khi không cần và bằng chứng đủ thì không buộc đo.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A046 — US-08-AC-04

**Trace:** US-08; FR-13. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** AI không có detection hoặc PM chưa đủ căn cứ; **When** xem kết quả; **Then** không tự NO_DEFECT/đóng lỗi; loại sai cần lý do và giữ nguồn.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A047 — US-09 §AC mục 1

**Trace:** US-09; FR-30. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Gợi ý trùng**
   - **When** hệ thống phát hiện các kết quả có khả năng cùng một lỗi
   - **Then** hệ thống chỉ đề xuất gộp, không tự gộp.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A048 — US-09 §AC mục 2

**Trace:** US-09; FR-30. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Quyết định gộp/giữ riêng**
   - **When** PM xác nhận gộp hoặc giữ riêng
   - **Then** hệ thống cập nhật định danh lỗi, giữ liên kết các phát hiện nguồn và lưu quyết định/audit.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A049 — US-09 §AC mục 3

**Trace:** US-09; FR-30. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Đối sánh qua khảo sát**
   - **Given** có baseline và các kỳ tương thích
   - **Then** PM có thể xác nhận hoặc sửa liên kết cùng hư hỏng; dữ liệu không đủ tương thích phải báo rõ.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A050 — US-09 §AC mục 4

**Trace:** US-09; FR-30. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Phân loại diễn biến**
   - Hệ thống hiển thị lỗi mới, ổn định hoặc đang phát triển theo dữ liệu đã có; nếu thiếu kỳ/thiếu chất lượng thì hiển thị cảnh báo thiếu căn cứ.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A051 — US-09 §AC mục 5

**Trace:** US-09; FR-30. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Cảnh báo ưu tiên**
   - **When** lỗi có mức độ cao, thay đổi nhanh hoặc thuộc nhóm cần theo dõi
   - **Then** PM/Supervisor nhận cảnh báo kèm căn cứ và độ tin cậy; cảnh báo không cam kết dự báo thời điểm hỏng.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A052 — US-10 §AC mục 1

**Trace:** US-10; GAP-01, đề xuất FR-36. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

Chỉ phát hiện đã được PM xác nhận hoặc hiệu chỉnh mới xuất hiện trong danh sách chờ duyệt nhãn.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A053 — US-10 §AC mục 2

**Trace:** US-10; GAP-01, đề xuất FR-36. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**When** PM duyệt nhãn
   **Then** hệ thống lưu người, thời gian, phiên bản nhãn, nguồn AI và ảnh/video gốc.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A054 — US-10 §AC mục 3

**Trace:** US-10; GAP-01, đề xuất FR-36. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

Nhãn bị từ chối phải có lý do và không được đưa vào tập huấn luyện được duyệt.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A055 — US-10 §AC mục 4

**Trace:** US-10; GAP-01, đề xuất FR-36. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

Supervisor (Admin) chỉ xuất tập đã duyệt, kèm phiên bản và quyền truy cập.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A056 — US-11-AC-01

**Trace:** US-11; FR-19. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** lỗi nhánh thường đủ xác minh và số đo cần thiết; **When** PM lập phương án; **Then** tạo item và bản trình có scope/bằng chứng, chặn sửa trùng.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A057 — US-11-AC-02

**Trace:** US-11; FR-19. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** gói có A/B/C; **When** Supervisor APPROVE A, REQUEST_EVIDENCE B, REJECT C; **Then** A được giao riêng, B chờ bằng chứng, đề xuất C kết thúc nhưng lỗi vẫn mở.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A058 — US-11-AC-03

**Trace:** US-11; FR-19. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** phương án cần xem lại; **When** chọn REQUEST_RECONSIDER; **Then** ghi lý do riêng, không gộp với yêu cầu ảnh.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A059 — US-11-AC-04

**Trace:** US-11; FR-19. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** PM sửa phần bị trả; **When** trình lại; **Then** version mới chỉ phần cần xét, giữ quyết định phần không đổi.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A060 — US-12-AC-01

**Trace:** US-12; FR-20. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** item APPROVAL_TRACK chưa APPROVED; **When** giao thi công; **Then** bị chặn; item đã duyệt có thể giao không chờ item khác.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A061 — US-12-AC-02

**Trace:** US-12; FR-20. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** Fast Track hoặc chỉ-đo được giao; **When** Crew mở; **Then** thấy loại quyền rõ, không dùng số lỗi để tự quyết được sửa.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A062 — US-12-AC-03

**Trace:** US-12; FR-20. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** PM đổi đội/thứ tự; **When** lưu; **Then** giữ lịch sử, báo bên liên quan; [ĐỀ XUẤT] hiển thị bản đã nhận.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A063 — US-12-AC-04

**Trace:** US-12; FR-20. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** đội cũ ngoại tuyến; **When** định giao cùng phạm vi; **Then** [ĐỀ XUẤT Q04] cần xác nhận dừng/bàn giao, không tự coi lệnh thu hồi đã nhận.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A064 — US-13-AC-01

**Trace:** US-13; FR-21. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** nhiệm vụ được giao; **When** nhận hoặc từ chối trước nhận; **Then** ghi người/đội và lý do từ chối, không tự hủy phương án; đã nhận cần PM điều phối.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A065 — US-13-AC-02

**Trace:** US-13; FR-21. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** Fast Track có ảnh dân/drone; **When** dùng làm BEFORE; **Then** giữ source/time/lỗi; [ĐỀ XUẤT] ảnh không phù hợp hiện trường phải chụp mới.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A066 — US-13-AC-03

**Trace:** US-13; FR-21. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** thiếu BEFORE hợp lệ lưu trên máy; **When** bắt đầu sửa theo app; **Then** bị chặn; không yêu cầu phải upload xong để làm ngoại tuyến.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A067 — US-13-AC-04

**Trace:** US-13; FR-21. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** sửa đã thực hiện; **When** ghi AFTER và gửi; **Then** gắn đúng attempt/lỗi, giữ thời điểm thực, xếp hàng nếu offline; không tự đóng.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A068 — US-13-AC-05

**Trace:** US-13; FR-21. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** có lỗi mới ngoài nhiệm vụ; **When** ghi nhận; **Then** báo riêng PM, không tự sửa hoặc thêm vào scope đã duyệt.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A069 — US-14-AC-01

**Trace:** US-14; FR-23, FR-24. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** server đã nhận đủ báo cáo; **When** PM kiểm; **Then** đối chiếu số đo/policy hoặc phương án, BEFORE/AFTER; thiếu căn cứ khác chất lượng chưa đạt.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A070 — US-14-AC-02

**Trace:** US-14; FR-23, FR-24. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** Fast Track đạt; **When** PM xác nhận; **Then** đóng lỗi và báo Supervisor, không tạo vòng duyệt sửa Fast Track.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A071 — US-14-AC-03

**Trace:** US-14; FR-23, FR-24. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** APPROVAL_TRACK đạt qua PM; **When** Supervisor xác nhận; **Then** đóng phần đủ điều kiện; hồ sơ hỗn hợp còn lỗi bắt buộc chưa đạt không đóng tổng.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A072 — US-14-AC-04

**Trace:** US-14; FR-23, FR-24. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** một lỗi bị trả; **When** Crew sửa tiếp; **Then** giữ lần sửa cũ, thêm attempt/bằng chứng; lỗi khác đạt không bị kéo lùi.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A073 — US-20-AC-01

**Trace:** US-20; FR-13, FR-17, FR-31. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** PM giao kiểm tra IncidentCase/Defect; **When** tạo task; **Then** ghi nguồn thật, scope, loại đo và chỉ-đo/đo-và-sửa; không cần Survey giả.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A074 — US-20-AC-02

**Trace:** US-20; FR-13, FR-17, FR-31. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** đo ngoài Fast Track thiếu ảnh/số đo bắt buộc; **When** nộp; **Then** không chấp nhận; đo lại; [TBD Q05] toàn đợt hay phần thiếu.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A075 — US-20-AC-03

**Trace:** US-20; FR-13, FR-17, FR-31. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** PM xác định nghiêm trọng nhưng số đo nhỏ; **When** Crew hoàn tất đo; **Then** chỉ gửi PM, không tự sửa.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A076 — US-20-AC-04

**Trace:** US-20; FR-13, FR-17, FR-31. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** quyết định nhánh thường cần số đo; **When** PM xác minh; **Then** chỉ VERIFIED khi đủ căn cứ/đo cần thiết; Fast Track được giao có ngoại lệ không chờ gate này.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A077 — US-20-AC-05

**Trace:** US-20; FR-13, FR-17, FR-31. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** đo nghiên cứu; **When** nhập dữ liệu; **Then** giữ purpose và sample IDs theo RS01–RS06, không tự biến đo nghiệp vụ thành nghiên cứu đã đạt.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A078 — US-15 §AC mục 1

**Trace:** US-15; FR-34. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

Supervisor xem tổng quan toàn danh mục; PM chỉ xem các dự án được giao.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A079 — US-15 §AC mục 2

**Trace:** US-15; FR-34. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

Dashboard hiển thị trạng thái dự án, khảo sát, lỗi còn mở, dự án sắp hết hạn bảo hành và các việc cần xử lý.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A080 — US-15 §AC mục 3

**Trace:** US-15; FR-34. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

Tiến độ sửa chữa hiển thị theo đợt, lỗi, trạng thái bằng chứng và việc cần PM/Supervisor xử lý.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A081 — US-15 §AC mục 4

**Trace:** US-15; FR-34. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

Chỉ báo rủi ro cao/hư hỏng phát triển nhanh hiển thị kèm nguồn dữ liệu, kỳ khảo sát và độ tin cậy; không trình bày như dự báo chắc chắn.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A082 — US-15 §AC mục 5

**Trace:** US-15; FR-34. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

Supervisor có thể so sánh dự án/kỳ khảo sát theo phạm vi và loại mặt đường tương thích; dữ liệu thiếu tương thích phải được cảnh báo.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A083 — US-15 §AC mục 6

**Trace:** US-15; FR-34. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

Mọi con số trên dashboard có liên kết tới hồ sơ nguồn hoặc bộ lọc đã áp dụng.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A084 — US-16 §AC mục 1

**Trace:** US-16; FR-35. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

Người dùng chỉ chọn được dự án, đoạn, lỗi và khoảng thời gian trong phạm vi quyền.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A085 — US-16 §AC mục 2

**Trace:** US-16; FR-35. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**When** xuất báo cáo
   **Then** hệ thống lưu bộ lọc, người xuất, thời điểm, trạng thái và phiên bản dữ liệu được dùng.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A086 — US-16 §AC mục 3

**Trace:** US-16; FR-35. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

Hồ sơ tổng hợp gồm, khi có: bàn giao, khảo sát/baseline, ảnh gốc, loại và số đo lỗi, độ không chắc chắn, quyết định xác minh, phương án sửa, bằng chứng sau sửa và lịch sử duyệt.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A087 — US-16 §AC mục 4

**Trace:** US-16; FR-35. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

Tệp xuất kèm nguồn gốc: mã tệp, checksum/dấu kiểm tra toàn vẹn, thời gian, tác giả, phiên bản mô hình và lịch sử sửa đổi.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A088 — US-16 §AC mục 5

**Trace:** US-16; FR-35. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

Dữ liệu thiếu hoặc bằng chứng chưa có phải được ghi rõ trong báo cáo; hệ thống không tạo cảm giác hồ sơ đầy đủ.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A089 — US-16 §AC mục 6

**Trace:** US-16; FR-35. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

Phương án xuất MVP hỗ trợ PDF tổng hợp và ZIP dữ liệu gốc/bảng kê khi cấu hình cho phép; lỗi tạo tệp phải báo rõ và không làm mất dữ liệu nguồn.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A090 — US-16 §AC mục 7

**Trace:** US-16; FR-35. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

Sau khi dự án đóng, Supervisor/PM vẫn tra cứu được hồ sơ trong phạm vi quyền cho tới hết thời hạn lưu trữ hoặc lâu hơn nếu đang giữ tranh chấp.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A091 — US-17 §AC mục 1

**Trace:** US-17; FR-01, FR-36. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Tài khoản**
   - Admin tạo/cập nhật/ngừng sử dụng tài khoản, gán một trong năm vai trò và ghi nhật ký thay đổi.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A092 — US-17 §AC mục 2

**Trace:** US-17; FR-01, FR-36. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Ngừng tài khoản có việc mở**
   - **When** tài khoản bị ngừng sử dụng
   - **Then** hệ thống thu hồi phiên, chặn đăng nhập mới, giữ lịch sử, lập danh sách việc cần bàn giao và thông báo người có quyền phân công lại.
   - Không tự hủy, tự hoàn tất hoặc xóa bản nháp/công việc đang mở.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A093 — US-17 §AC mục 3

**Trace:** US-17; FR-01, FR-36. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Phân quyền**
   - Admin cấp/sửa quyền dự án theo vai trò; thay đổi được audit và có hiệu lực với request server tiếp theo; **[THÊM UC-D23]** máy offline chưa nhận lệnh cần xử lý Q04, không hứa thu hồi tức thì. PM/Drone Operator/Repair Crew không xem được dữ liệu ngoài membership active, còn hiệu lực và đúng vai trò.
   - Khi Admin đổi role toàn hệ thống, hệ thống thu hồi toàn bộ phiên và refresh token trong cùng transaction; JWT role cũ không tiếp tục cấp quyền.
   - Khi quyền project bị đổi, hết hạn hoặc kết thúc, request kế tiếp phải bị kiểm tra theo membership hiện tại phía server; client claim không được dùng thay thế.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A094 — US-17 §AC mục 4

**Trace:** US-17; FR-01, FR-36. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Danh mục**
   - Admin thêm hoặc ngừng sử dụng loại lỗi; mục cũ không bị xóa khỏi lịch sử.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A095 — US-17 §AC mục 5

**Trace:** US-17; FR-01, FR-36. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Quy tắc phân mức**
   - Admin tạo phiên bản quy tắc theo chuẩn và loại mặt đường, lưu căn cứ; thay phiên bản không làm thay đổi ngược kết quả lịch sử.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A096 — US-17 §AC mục 6

**Trace:** US-17; FR-01, FR-36. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Nhắc việc**
   - Admin cấu hình nhắc khảo sát và mốc trước hạn bảo hành; cấu hình không tự áp dụng thời hạn pháp lý chưa được xác minh.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A097 — US-18 §AC mục 1

**Trace:** US-18; FR-36. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Phiên bản mô hình**
   - Admin tạo, phát hành hoặc ngừng sử dụng phiên bản; lưu chỉ số đánh giá, ngưỡng vận hành, thời điểm và phiên bản áp dụng.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A098 — US-18 §AC mục 2

**Trace:** US-18; FR-36. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Nguồn kết quả**
   - Mỗi phát hiện AI giữ tham chiếu tới phiên bản mô hình; đổi mô hình không làm mất nguồn của kết quả cũ.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A099 — US-18 §AC mục 3

**Trace:** US-18; FR-36. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Tập huấn luyện**
   - Chỉ nhãn đã được PM duyệt mới được xuất; tệp xuất có nguồn gốc, phiên bản và quyền truy cập.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A100 — US-18 §AC mục 4

**Trace:** US-18; FR-36. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Giám sát tác vụ**
   - Admin xem tải, tiến trình, lỗi Backend/hàng đợi AI, dung lượng và trạng thái từng tác vụ.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A101 — US-18 §AC mục 5

**Trace:** US-18; FR-36. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Thử lại an toàn**
   - Tác vụ thất bại do hạ tầng có thể thử lại trên dữ liệu còn nguyên; lỗi dữ liệu phải chuyển PM quyết định bổ sung.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A102 — US-18 §AC mục 6

**Trace:** US-18; FR-36. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Thiết bị và quy trình**
   - Admin quản lý thông tin thiết bị bay, checklist và tài liệu chuyến bay; hệ thống không gửi lệnh điều khiển thiết bị bay.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A103 — US-19 §AC mục 1

**Trace:** US-19; FR-35. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Điều kiện lưu trữ**
   - Hệ thống tính tối thiểu tới hết bảo hành cộng 5 năm và hiển thị căn cứ tính cho từng hồ sơ.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A104 — US-19 §AC mục 2

**Trace:** US-19; FR-35. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Lập yêu cầu**
   - **Given** hồ sơ đủ điều kiện thời hạn
   - **When** PM chọn phạm vi và lập yêu cầu
   - **Then** hệ thống đưa yêu cầu vào trạng thái chờ Supervisor, chưa xóa dữ liệu.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A105 — US-19 §AC mục 3

**Trace:** US-19; FR-35. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Kiểm tra tranh chấp**
   - **Given** hồ sơ đang bị giữ do tranh chấp hoặc phạm vi chưa rõ
   - **Then** hệ thống chặn lập/duyệt xóa và hiển thị lý do.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A106 — US-19 §AC mục 4

**Trace:** US-19; FR-35. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Phê duyệt**
   - **When** Supervisor xem xét và phê duyệt
   - **Then** hệ thống chỉ xóa đúng phạm vi đã duyệt theo chính sách, lưu biên bản, người, thời điểm và kết quả.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A107 — US-19 §AC mục 5

**Trace:** US-19; FR-35. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Từ chối**
   - **When** Supervisor từ chối
   - **Then** phải có lý do; dữ liệu vẫn tra cứu được và yêu cầu chuyển trạng thái bị từ chối.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A108 — US-19 §AC mục 6

**Trace:** US-19; FR-35. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Giữ/gỡ giữ hồ sơ**
   - Admin/Supervisor ghi căn cứ và lý do khi thiết lập hoặc gỡ giữ; gỡ giữ không tự động xóa dữ liệu.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A109 — US-19 §AC mục 7

**Trace:** US-19; FR-35. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Phân biệt dọn thiết bị**
   - Dọn bản sao cục bộ trên điện thoại chỉ là thao tác đồng bộ an toàn, không được coi là xóa hồ sơ máy chủ.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A110 — US-21-AC-01

**Trace:** US-21; FR-11. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** Reporter xác minh tài khoản; **When** gửi ảnh và mô tả; **Then** lưu report/ảnh với nguồn/time/location riêng; nhận hồ sơ tiếp nhận và thông báo.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A111 — US-21-AC-02

**Trace:** US-21; FR-11. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** ảnh cũ upload nơi khác; **When** xác nhận vị trí; **Then** không tự lấy GPS upload; cho vị trí được xác nhận có nguồn.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A112 — US-21-AC-03

**Trace:** US-21; FR-11. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** Reporter khác; **When** đọc report/tệp bằng ID; **Then** bị chặn; không có quyền project chỉ nhờ gửi report.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A113 — US-22-AC-01

**Trace:** US-22; FR-12, FR-13. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** chưa rõ dự án; **When** tiếp nhận; **Then** [ĐỀ XUẤT] vào hàng điều phối, không mất report.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A114 — US-22-AC-02

**Trace:** US-22; FR-12, FR-13. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** năm report ứng viên cùng lỗi; **When** PM xác nhận liên kết; **Then** giữ năm nguồn và hồ sơ chính; không tạo năm nhiệm vụ sửa.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A115 — US-22-AC-03

**Trace:** US-22; FR-12, FR-13. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** các điểm cách 1–2 m; **When** hệ thống gợi ý; **Then** [ĐỀ XUẤT Q09] không tự gộp khác loại/tấm/thời điểm; PM xác nhận, có tách gộp nhầm.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A116 — US-22-AC-04

**Trace:** US-22; FR-12, FR-13. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** một/nhiều phản ánh; **When** PM chọn kiểm chứng; **Then** cho trực tiếp hoặc drone, lưu căn cứ; ngoài phạm vi/trùng khác NO_DEFECT.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A117 — US-23-AC-01

**Trace:** US-23; FR-23, FR-25. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** hồ sơ chỉ Fast Track và PM kiểm đủ; **When** đóng; **Then** PM đóng và báo Supervisor.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A118 — US-23-AC-02

**Trace:** US-23; FR-23, FR-25. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** hồ sơ hỗn hợp; **When** đóng tổng; **Then** chỉ Supervisor sau đủ phần bắt buộc theo từng nhánh.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A119 — US-23-AC-03

**Trace:** US-23; FR-23, FR-25. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** ảnh AFTER chưa được công bố hoặc kết quả chưa nghiệm thu; **When** Reporter xem; **Then** không tự hiển thị REPAIRED hoặc ảnh nội bộ.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A120 — US-23-AC-04

**Trace:** US-23; FR-23, FR-25. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** một lỗi đạt trong case còn mở; **When** PM muốn công bố từng phần; **Then** [TBD Q08] chưa tự thay điều kiện Case Verified cũ; không công bố toàn case hoàn thành.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A121 — US-24-AC-01

**Trace:** US-24; FR-05, FR-08. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** tuyến/segment đã dùng; **When** tạo bản mới; **Then** giữ IDs/geometry lịch sử; không gán dữ liệu cũ vào bản mới tự động.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A122 — US-24-AC-02

**Trace:** US-24; FR-05, FR-08. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** ánh xạ phiên bản; **When** kết quả thiếu vị trí; **Then** không phân phát một lỗi cho mọi đoạn con; cần kiểm chứng.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A123 — US-24-AC-03

**Trace:** US-24; FR-05, FR-08. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** có station origin; **When** tính lý trình; **Then** origin + offset dọc tuyến, không luôn bắt đầu 0.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A124 — US-25-AC-01

**Trace:** US-25; FR-28, FR-30. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** task chọn Surface/LeftEdge/RightEdge; **When** bay ngược chiều tuyến; **Then** trái/phải vẫn theo chiều lý trình đã xác định.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A125 — US-25-AC-02

**Trace:** US-25; FR-28, FR-30. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** SRT trong vùng 12 m nhưng không nhìn thấy mép; **When** đánh giá; **Then** [ĐỀ XUẤT Q11] tách đạt vị trí và thiếu coverage; không đánh SUFFICIENT từ point-in-polygon.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A126 — US-25-AC-03

**Trace:** US-25; FR-28, FR-30. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** thiếu telemetry/camera; **When** tính coverage; **Then** UNKNOWN/chưa đủ căn cứ thay vì tự lấp GPS thiếu.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A127 — US-26-AC-01

**Trace:** US-26; FR-29, FR-31. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** dataset hợp lệ; **When** nhận yêu cầu phân tích; **Then** lưu manifest/job trước trả nhận, khóa version model/config/scope.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A128 — US-26-AC-02

**Trace:** US-26; FR-29, FR-31. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** worker lỗi rồi retry; **When** nhận kết quả; **Then** không nhân đôi detection, kết quả muộn không ghi đè bản hiện hành.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A129 — US-26-AC-03

**Trace:** US-26; FR-29, FR-31. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** adapter mock; **When** hiển thị/xuất kết quả; **Then** gắn nguồn mock và không ghi như độ chính xác thực nghiệm.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A130 — US-26-AC-04

**Trace:** US-26; FR-29, FR-31. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** ground truth và derived samples; **When** tính sai số; **Then** ghép bằng ID, nêu mẫu thiếu/outlier; không dùng frame gần trùng để giả test độc lập.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A131 — US-28-AC-01

**Trace:** US-28; FR-02. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** người mời có quyền; **When** tạo lời mời; **Then** role/scope được server kiểm; không log token.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A132 — US-28-AC-02

**Trace:** US-28; FR-02. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** lời mời hết hạn/đã dùng; **When** nhận; **Then** không cấp tài khoản/quyền lần nữa.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A133 — US-28-AC-03

**Trace:** US-28; FR-02. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** retry cùng thao tác; **When** gửi lại; **Then** không sinh user trùng; trạng thái lời mời truy vết được.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A134 — US-29-AC-01

**Trace:** US-29; FR-34. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** sự kiện nghiệp vụ thành công; **When** ghi timeline; **Then** đúng actor/time/object/scope, retry không nhân đôi.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A135 — US-29-AC-02

**Trace:** US-29; FR-34. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** người ngoài project; **When** đọc timeline; **Then** không được xem.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A136 — US-29-AC-03

**Trace:** US-29; FR-34. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** xem lịch sử; **When** lọc thời gian/đối tượng; **Then** truy lại nguồn; không cho sửa sự kiện để che lịch sử.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A137 — US-30-AC-01

**Trace:** US-30; FR-05, FR-06. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** GPX chỉ waypoint hoặc nhiều track chưa chọn; **When** import; **Then** không tự tạo tim; báo định dạng/track cần chọn theo contract.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A138 — US-30-AC-02

**Trace:** US-30; FR-05, FR-06. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** GPX track hợp lệ; **When** lọc/chỉnh; **Then** tính mét, giữ đầu/cuối và bản gốc; chỉnh tay không tự mất khi lọc lại.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A139 — US-30-AC-03

**Trace:** US-30; FR-05, FR-06. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** P1–P2 8 m, P2–P3 10 m, vùng 12 m; **When** preview; **Then** mặt đường giữ hai bề rộng; biên cách tim 6 m trên đoạn thẳng.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A140 — US-30-AC-04

**Trace:** US-30; FR-05, FR-06. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** tuyến cong chỉ có hai đầu; **When** dựng; **Then** không tuyên bố đã biết chính xác đường cong; yêu cầu thêm dữ liệu khi cần.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A141 — US-31-AC-01

**Trace:** US-31; FR-07. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** nháp hợp lệ và CRS cấu hình; **When** Supervisor xác nhận; **Then** tạo đúng một version với station origin/tham số/nguồn.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A142 — US-31-AC-02

**Trace:** US-31; FR-07. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** cùng yêu cầu đã thành công; **When** retry; **Then** trả cùng kết quả, không tạo version trùng; payload khác cùng key bị phát hiện.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A143 — US-31-AC-03

**Trace:** US-31; FR-07. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** PM không có quyền xác nhận Supervisor; **When** gọi thao tác; **Then** bị chặn.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A144 — US-32-AC-01

**Trace:** US-32; FR-08. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** tuyến 4.500 m target 1.000 m; **When** preview; **Then** bốn segment 1.000 và một 500 m.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A145 — US-32-AC-02

**Trace:** US-32; FR-08. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** split/merge/moveBoundary hợp lệ; **When** công bố; **Then** không hở/chồng, thao tác ngoài range bị chặn; bản công bố bất biến.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A146 — US-32-AC-03

**Trace:** US-32; FR-08. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** phần dư dưới minimum; **When** preview; **Then** [ĐỀ XUẤT] gộp phần dư vào đoạn trước theo rule được chốt.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A147 — US-33-AC-01

**Trace:** US-33; FR-15, FR-18. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** PM lập policy; **When** Crew tải nhiệm vụ; **Then** hiển thị loại/điều kiện/phương pháp/bằng chứng và version; khung ban hành/hạn mức Q02/Q03.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A148 — US-33-AC-02

**Trace:** US-33; FR-15, FR-18. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** một lỗi nhỏ được giao đo-và-sửa, số đo đạt policy, BEFORE đủ; **When** Crew sửa offline; **Then** cho sửa không cần PM duyệt số đo trước; lưu AFTER/báo cáo, không tự đóng.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A149 — US-33-AC-03

**Trace:** US-33; FR-15, FR-18. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** task chỉ-đo hoặc PM xác định nghiêm trọng; **When** Crew muốn sửa dù số đo nhỏ; **Then** không được sửa; báo PM.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A150 — US-33-AC-04

**Trace:** US-33; FR-15, FR-18. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** ngoài policy hoặc lỗi mới ngoài nhiệm vụ; **When** Crew ghi nhận; **Then** chờ PM, không tự sửa hoặc tự đổi urgency/severity.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A151 — US-33-AC-05

**Trace:** US-33; FR-15, FR-18. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** PM nhận đủ Fast Track; **When** kiểm đạt; **Then** PM đóng và báo Supervisor; không tạo vòng duyệt sửa.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A152 — US-34-AC-01

**Trace:** US-34; FR-14. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** Reporter/Crew gửi cảnh báo; **When** PM đánh giá; **Then** lưu hai trường phân cấp và căn cứ; ba mức urgency đã chốt.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A153 — US-34-AC-02

**Trace:** US-34; FR-14. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** hệ thống có gợi ý mới; **When** PM mở kế hoạch; **Then** không tự thay thứ tự đã giao; PM tự chọn/sắp lại.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A154 — US-34-AC-03

**Trace:** US-34; FR-14. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** LOW có urgency Khẩn cấp và policy cho phép; **When** PM giao Fast Track; **Then** không bị chuyển EMERGENCY chỉ do urgency.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A155 — US-35-AC-01

**Trace:** US-35; FR-16. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** 10 lỗi có 5 lỗi nhỏ trong đợt gom chỉ-đo; **When** Crew xác nhận năm lỗi đạt policy; **Then** chỉ đo/chụp/báo, không sửa ngay.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A156 — US-35-AC-02

**Trace:** US-35; FR-16. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** PM có số đo/ảnh; **When** lập và giao sửa; **Then** hành động riêng sau đo, thứ tự do PM, nhánh theo quyết định; Fast Track sau gom Q01 còn mở.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A157 — US-35-AC-03

**Trace:** US-35; FR-16. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** có thêm report giữa tuần; **When** refresh dữ liệu; **Then** [ĐỀ XUẤT] không tự đổi loại nhiệm vụ đã giao; không tự buộc chờ đủ bảy ngày.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A158 — US-36-AC-01

**Trace:** US-36; FR-10. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** chỉ biết khoảng 4 m; **When** sinh lưới; **Then** ghi dự kiến, không tự là tấm hoàn công; nhiều dải có nhiều tấm.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A159 — US-36-AC-02

**Trace:** US-36; FR-10. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** vỡ mép và ổ gà cùng tấm; **When** nhóm công việc; **Then** giữ hai lỗi và kết quả riêng; một lỗi đạt không đóng toàn tấm.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A160 — US-36-AC-03

**Trace:** US-36; FR-10. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** lỗi trên khe hoặc nhiều tấm; **When** gắn vị trí; **Then** [ĐỀ XUẤT] liên kết nhiều tấm, thiếu độ chính xác thì chờ xác nhận.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A161 — US-37-AC-01

**Trace:** US-37; FR-24. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** report cùng vùng đã sửa; **When** kiểm chứng; **Then** PM quyết định chưa đạt hay tái phát, không auto merge do GPS.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A162 — US-37-AC-02

**Trace:** US-37; FR-24. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** sửa trước chưa đạt; **When** xử lý; **Then** [ĐỀ XUẤT] mở lại case cũ theo quyền được chốt, giữ lịch sử đóng.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A163 — US-37-AC-03

**Trace:** US-37; FR-24. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** tái phát sau nghiệm thu hợp lệ; **When** xử lý; **Then** [ĐỀ XUẤT] case mới liên kết case cũ, không xóa nghiệm thu trước.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A164 — US-38-AC-01

**Trace:** US-38; FR-09. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** trục chính và hai nhánh; **When** nhập/chỉnh; **Then** mã nhánh/chiều tuyến riêng, chọn đúng nút nối.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A165 — US-38-AC-02

**Trace:** US-38; FR-09. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** hai đường giao khác cao độ hoặc vị trí nhiều ứng viên; **When** kết nối/gán lỗi; **Then** không tự nối hoặc gán chắc chắn; yêu cầu xác nhận.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A166 — US-38-AC-03

**Trace:** US-38; FR-09. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** đường cong/bề rộng thay đổi; **When** preview; **Then** mặt đường/vùng khảo sát hợp lệ; nội suy không đổi nguồn thành thực đo.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A167 — US-39-AC-01

**Trace:** US-39; FR-28, FR-33. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** nhiều nhánh/điểm tập kết; **When** lập kế hoạch; **Then** không bắt mọi chuyến trục chính trước; PM chọn phạm vi, Operator kiểm mission ngoài app.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A168 — US-39-AC-02

**Trace:** US-39; FR-28, FR-33. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** export/import Dronelink; **When** thực hiện thử; **Then** mã/version phạm vi truy vết được, không giả thành chuyến bay đã nghiệm thu.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A169 — US-39-AC-03

**Trace:** US-39; FR-28, FR-33. **Eligibility:** CONDITIONAL phần Q/đề xuất. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** SRT có đoạn chuyển nhánh hoặc thiếu thông số camera; **When** đánh giá; **Then** [ĐỀ XUẤT Q11] tách phạm vi thu, vị trí/quality/coverage; thiếu thì chưa xác định.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A170 — US-40-AC-01

**Trace:** US-40; FR-32. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** Crew mở nhiệm vụ có quyền và đích hợp lệ; **When** bấm Chỉ đường; **Then** mở Google Maps với WGS84 đúng thứ tự, không gửi PII không cần.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A171 — US-40-AC-02

**Trace:** US-40; FR-32. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** Operator chưa có điểm tiếp cận/tập kết; **When** bấm chỉ đường; **Then** yêu cầu bổ sung, không lấy trung điểm segment/GPS drone.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A172 — US-40-AC-03

**Trace:** US-40; FR-32. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** không mở được ứng dụng ngoài; **When** thao tác; **Then** cho xem/sao chép tọa độ; không tự đánh dấu đến nơi/hoàn thành.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A173 — US-41-AC-01

**Trace:** US-41; FR-37. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** PM kích hoạt có lý do; **When** giao việc; **Then** thông báo Supervisor, scope tạm và đội đủ điều kiện.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A174 — US-41-AC-02

**Trace:** US-41; FR-37. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** rào chắn/vá tạm hoàn thành; **When** hậu kiểm; **Then** không tự đóng Defect còn cần sửa chính thức.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

### TC-A175 — US-41-AC-03

**Trace:** US-41; FR-37. **Eligibility:** Theo scope release. **Status:** NOT_RUN.

**Oracle từ nguồn:**

**Given** urgency Khẩn cấp nhưng PM chưa kích hoạt; **When** xem lỗi; **Then** không tự tạo nhiệm vụ EMERGENCY.

**Thực hiện:** (1) ghi fixture/role/version theo điều kiện trên; (2) thao tác chức năng hoặc nhánh When; (3) kiểm từng kết quả và biến thể được nêu, đọc lại dữ liệu/lịch sử theo quyền; (4) ghi Actual, evidence và defect ID nếu lệch. Chưa có actual.

## 15.6 Ca báo cáo và NFR

TC-R01–09 tương ứng một-một RPT-AC-01–09 (§11.6): chuẩn bị đúng dữ liệu tại hàng, mở báo cáo với scope/kỳ cố định, thực hiện hành động, đối chiếu expected và drilldown; lưu screenshot cùng danh sách ID nguồn. Status NOT_RUN. Đây là chi tiết mới đề xuất, cần PO chốt công thức/tần suất trước gate.

TC-N01–14 và TC-NX01–04 được đặc tả đủ phương pháp/expected/owner ở §14.2/14.4. Dùng cùng execution record; chưa chạy. Không dùng UAT người dùng thay thế load test, restore hoặc kiểm bảo mật kỹ thuật.

## 15.7 Entry/exit criteria và mẫu ký nghiệm thu

**Entry đề xuất:** scope release và Q liên quan đã chốt; test environment/build ổn định; tài khoản và dữ liệu thử sẵn; fixture policy được phê duyệt; test design reviewed; backup môi trường và cách reset rõ.

**Exit đề xuất:** mọi test áp dụng có kết quả/evidence; không còn P0 mất dữ liệu/trái quyền/sai quyền sửa/sai nghiệm thu; lỗi khác có quyết định PO và kế hoạch xử lý; NFR áp dụng đạt ngưỡng đã chốt; conditional/out-of-scope có lý do, người duyệt và scope rõ. Không tuyên bố pass toàn dự án nếu mới pass Sprint 1.

| Trường ký | Giá trị cần điền khi chạy |
|---|---|
| Release/build, environment, baseline tài liệu | Chưa cung cấp |
| Tổng áp dụng / Pass / Fail / Blocked / Not run | Chưa chạy |
| Defect/CR chưa đóng và rủi ro chấp nhận | Chưa đánh giá |
| Q hoặc module loại khỏi nghiệm thu | Theo quyết định scope có căn cứ |
| PO/chủ dự án; PM; QA; ngày ký | Chưa ký |

Tỷ lệ pass = Pass / test áp dụng đã duyệt, báo riêng Blocked/Not run; không loại ca khó khỏi mẫu số để nâng tỷ lệ. Retest sau fix phải lưu run mới, không ghi đè evidence thất bại.

## REVIEW-01 — Gate cho nghiệm thu

TC-F16/US-35: nghiệm thu core theo BR-09; phần BR-10 đề xuất chưa là gate bắt buộc đã phê duyệt. TC-F15/18: Q02/Q03 chưa chốt thì chưa nghiệm thu activate/evaluate policy production. TC-F22 và các UAT conflict/bàn giao: BLOCKED_BY_DECISION Q04/Q17; không đổi NOT_RUN thành PASS chỉ vì giữ được local queue. Chỉ nghiệm thu toàn luồng sau quyết định có owner/approval và provider/device tests pass. Các test core không phụ thuộc quyết định vẫn có thể chạy, ghi phạm vi rõ.
