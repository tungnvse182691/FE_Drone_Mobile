# RoadGuard — 13. Requirements Traceability Matrix (RTM)

**Phiên bản:** EXT-R3-2026-09-26-v1 • **Ngày:** 26/09/2026 • **Trạng thái:** bản đặc tả bổ sung để review, chưa xác nhận triển khai hoặc nghiệm thu.

**Nguồn chuẩn:** 9 tệp người dùng cung cấp ngày 26/09/2026; xem bảng nguồn trong README. Quyết định CHỐT/KẾ THỪA trong nguồn giữ nguyên. Các chi tiết mới dưới nhãn **ĐỀ XUẤT** phải được PO/chủ dự án duyệt trước khi thành baseline. Q01–Q18 vẫn theo Mô tả dự án §21; không tự giải quyết bằng tài liệu này. Mã trường ở đây là mapping logic, không xác nhận schema/endpoint đã tồn tại.

## 13.1 Phạm vi và quy ước

**BR-* trong nguồn là Business Rule, không phải Business Requirement.** BREQ-01–09 dưới đây là mã mục tiêu nghiệp vụ mới, được tổng hợp từ Mô tả dự án để truy vết; cần PO xác nhận cách phân nhóm, không tuyên bố đã có một BRD mục tiêu riêng được ký duyệt.

Chuỗi chính: BREQ → FR → Use Case → Test Case; bổ sung US/AC, Business Rule, NFR, báo cáo và wireframe. Một hàng có liên kết chỉ chứng minh độ phủ thiết kế, không chứng minh code/test đã đạt. Tất cả test hiện **NOT_RUN**; phần phụ thuộc quyết định chưa chốt có eligibility **CONDITIONAL**, không tự dùng làm gate nghiệm thu.

## 13.2 Danh mục Business Requirement được tổng hợp

| Mã mới | Mục tiêu nghiệp vụ | Căn cứ nguồn | FR |
| --- | --- | --- | --- |
| BREQ-01 | Quản lý truy cập và trách nhiệm theo đúng phạm vi | Mô tả §2/4; BR-01/02 | FR-01, FR-02, FR-03, FR-04, FR-36 |
| BREQ-02 | Định vị hư hỏng trên mạng đường có phiên bản | Mô tả §5–7; BR-31–37 | FR-05, FR-06, FR-07, FR-08, FR-09, FR-10, FR-32 |
| BREQ-03 | Tiếp nhận và kiểm chứng phản ánh mà không mất nguồn | Mô tả §8/9; BR-07/29–31/47 | FR-11, FR-12, FR-13, FR-14 |
| BREQ-04 | Tối ưu chuyến đo/sửa nhưng giữ quyền quyết định PM | Mô tả §10–12; BR-03–14/21–24 | FR-15, FR-16, FR-17, FR-18, FR-19, FR-20, FR-37 |
| BREQ-05 | Tác nghiệp hiện trường bền vững và đủ bằng chứng | Mô tả §13; BR-15–20 | Q04/Q17: BLOCKED cho nghiệm thu conflict end-to-end; core test riêng |
| BREQ-06 | Nghiệm thu đúng từng lỗi/nhánh và công bố có kiểm soát | Mô tả §14; BR-25–29/48 | FR-23, FR-24, FR-25 |
| BREQ-07 | Theo dõi tình trạng qua khảo sát và baseline có căn cứ | Mô tả §15/16; BR-39–43 | FR-26, FR-27, FR-28, FR-29, FR-30, FR-33 |
| BREQ-08 | Kiểm chứng kết quả nghiên cứu bằng ground truth | Mô tả §16.3; BR-44 | FR-31 |
| BREQ-09 | Điều hành và lưu hồ sơ phục vụ đối chiếu | Mô tả §17/18; BR-20/45 | FR-34, FR-35 |

## 13.3 Ma trận FR đầy đủ

TC-Fxx là kịch bản mức FR tại phần 15; TC-Axxx chi tiết từng AC ở §15.5. Mọi hàng có status thiết kế “Mapped / chưa chạy”.

| Business Requirement | Functional Requirement | Business Rule | User Story | Use Case nguồn | Test Case thiết kế | Phụ thuộc |
| --- | --- | --- | --- | --- | --- | --- |
| BREQ-01 | FR-01 Xác thực và quyền | BR-02 | US-01, US-17 | CN01, CN02, CN03, CN04, CN10, QT02, QT09 | TC-F01; TC-A001, TC-A002, TC-A003, TC-A004, TC-A005, TC-A006, TC-A091, TC-A092, TC-A093, TC-A094, TC-A095, TC-A096 | Không có Q trực tiếp; phạm vi Sprint theo Q18 |
| BREQ-01 | FR-02 Mời nhân sự | BR-02 | US-28 | QT01 | TC-F02; TC-A131, TC-A132, TC-A133 | Không có Q trực tiếp; phạm vi Sprint theo Q18 |
| BREQ-01 | FR-03 Reporter đăng ký | BR-02, BR-29 | US-27 | CN11, CN12 | TC-F03; TC-A007, TC-A008, TC-A009, TC-A010, TC-A011, TC-A012 | Không có Q trực tiếp; phạm vi Sprint theo Q18 |
| BREQ-01 | FR-04 Khởi tạo và bảo hành | BR-01, BR-45 | US-03 | DA01, DA03, DA04, DA05, DA12 | TC-F04; TC-A018, TC-A019, TC-A020, TC-A021 | Không có Q trực tiếp; phạm vi Sprint theo Q18 |
| BREQ-02 | FR-05 CRS và tính mét | BR-35 | US-24, US-30 | DA02, DA13 | TC-F05; TC-A121, TC-A122, TC-A123, TC-A137, TC-A138, TC-A139, TC-A140 | Q13 |
| BREQ-02 | FR-06 Nhập/chỉnh tim và bề rộng | BR-34, BR-35, BR-37 | US-30 | DA02, DA13 | TC-F06; TC-A137, TC-A138, TC-A139, TC-A140 | Q13 |
| BREQ-02 | FR-07 Xác nhận phiên bản tuyến | BR-01, BR-35 | US-31 | DA13 | TC-F07; TC-A141, TC-A142, TC-A143 | Không có Q trực tiếp; phạm vi Sprint theo Q18 |
| BREQ-02 | FR-08 Chia và công bố segment | BR-35 | US-24, US-32 | DA14, DA15 | TC-F08; TC-A121, TC-A122, TC-A123, TC-A144, TC-A145, TC-A146 | Q18 |
| BREQ-02 | FR-09 Mạng nhiều nhánh | BR-34, BR-36 | US-38 | DA17 | TC-F09; TC-A164, TC-A165, TC-A166 | Q18 |
| BREQ-02 | FR-10 Quản lý tấm | BR-31, BR-32, BR-33 | US-36 | DA18, AI08 | TC-F10; TC-A158, TC-A159, TC-A160 | Q10 |
| BREQ-03 | FR-11 Gửi phản ánh | BR-29, BR-47 | US-21 | PA01, PA02 | TC-F11; TC-A110, TC-A111, TC-A112 | Không có Q trực tiếp; phạm vi Sprint theo Q18 |
| BREQ-03 | FR-12 Liên kết báo trùng | BR-30, BR-31 | US-22 | PA03, AI08 | TC-F12; TC-A113, TC-A114, TC-A115, TC-A116 | Q09 |
| BREQ-03 | FR-13 Kiểm chứng phản ánh/AI | BR-07, BR-39 | US-08, US-20, US-22 | PA04, PA05, AI01, AI04, AI05, AI06, AI07, AI13 | TC-F13; TC-A043, TC-A044, TC-A045, TC-A046, TC-A073, TC-A074, TC-A075, TC-A076, TC-A077, TC-A113, TC-A114, TC-A115, TC-A116 | Không có Q trực tiếp; phạm vi Sprint theo Q18 |
| BREQ-03 | FR-14 Phân cấp và ưu tiên | BR-03, BR-04, BR-13, BR-14 | US-34 | SC14, AI05, AI12 | TC-F14; TC-A152, TC-A153, TC-A154 | Không có Q trực tiếp; phạm vi Sprint theo Q18 |
| BREQ-04 | FR-15 Lập policy Fast Track | BR-11, BR-12 | US-33 | SC13 | TC-F15; TC-A147, TC-A148, TC-A149, TC-A150, TC-A151 | Q02/Q03 |
| BREQ-04 | FR-16 Gom đợt đo | BR-09, BR-10 | US-35 | TN01, TN07 | TC-F16; TC-A155, TC-A156, TC-A157 | BR-09 CHỐT; BR-10 CONDITIONAL, không gán lịch một tuần đã duyệt |
| BREQ-04 | FR-17 Phiên đo và xác nhận | BR-05, BR-07, BR-17 | US-20 | TN02, TN03, TN04, TN05, TN06, TN12 | TC-F17; TC-A073, TC-A074, TC-A075, TC-A076, TC-A077 | Q05 |
| BREQ-04 | FR-18 Fast Track cùng chuyến | BR-05, BR-06, BR-08, BR-14, BR-15, BR-25 | US-33 | TN01, TN03, SC13, HT04, HT05, HT07 | TC-F18; TC-A147, TC-A148, TC-A149, TC-A150, TC-A151 | Q02/Q03/Q04/Q06 |
| BREQ-04 | FR-19 Duyệt từng công việc | BR-21, BR-22, BR-23 | US-11 | SC01, SC02, SC03, SC04, SC05, SC06, SC07, SC08, SC09, SC12 | TC-F19; TC-A056, TC-A057, TC-A058, TC-A059 | Không có Q trực tiếp; phạm vi Sprint theo Q18 |
| BREQ-04 | FR-20 Phân công Crew | BR-03, BR-23, BR-24 | US-12 | SC10, SC11, HT01, HT03, HT15 | TC-F20; TC-A060, TC-A061, TC-A062, TC-A063 | Q04 |
| BREQ-05 | FR-21 Ảnh trước/sau và tiến độ | BR-17, BR-18, BR-20 | US-13 | HT04, HT05, HT06, HT07, HT08, HT14 | TC-F21; TC-A064, TC-A065, TC-A066, TC-A067, TC-A068 | Q06 |
| BREQ-05 | FR-22 Hàng đợi ngoại tuyến | BR-15, BR-16, BR-19, BR-20 | US-02 | CN05, CN06, CN07, CN08, CN09 | TC-F22; TC-A013, TC-A014, TC-A015, TC-A016, TC-A017 | Q04/Q17: BLOCKED cho nghiệm thu conflict end-to-end; core test riêng |
| BREQ-06 | FR-23 Kiểm tra và đóng | BR-25, BR-26, BR-27 | US-14, US-23 | HT09, HT10, HT11, HT12, PA06 | TC-F23; TC-A069, TC-A070, TC-A071, TC-A072, TC-A117, TC-A118, TC-A119, TC-A120 | Không có Q trực tiếp; phạm vi Sprint theo Q18 |
| BREQ-06 | FR-24 Sửa lại/tái phát | BR-27, BR-28 | US-14, US-37 | HT10, HT13, PA08 | TC-F24; TC-A069, TC-A070, TC-A071, TC-A072, TC-A161, TC-A162, TC-A163 | Q07 |
| BREQ-06 | FR-25 Công bố kết quả | BR-29, BR-48 | US-23 | PA02, PA07 | TC-F25; TC-A117, TC-A118, TC-A119, TC-A120 | Q08 |
| BREQ-07 | FR-26 Nhiệm vụ khảo sát | BR-07, BR-40, BR-43 | US-04, US-05, US-07 | DA06, DA07, DA08, DA09, KS01, KS02, KS03, KS04, KS05, KS11, KS12, KS13, KS14, KS15 | TC-F26; TC-A022, TC-A023, TC-A024, TC-A025, TC-A026, TC-A027, TC-A028, TC-A029, TC-A030, TC-A038, TC-A039, TC-A040, TC-A041, TC-A042 | Q12/Q14 |
| BREQ-07 | FR-27 Tiếp nhận video/telemetry | BR-20, BR-42 | US-06 | KS06, KS07, KS08, KS09, KS10 | TC-F27; TC-A031, TC-A032, TC-A033, TC-A034, TC-A035, TC-A036, TC-A037 | Q14 |
| BREQ-07 | FR-28 Đánh giá SRT và coverage | BR-35, BR-41 | US-25, US-39 | KS08, KS16 | TC-F28; TC-A124, TC-A125, TC-A126, TC-A167, TC-A168, TC-A169 | Q11/Q14 |
| BREQ-07 | FR-29 AI bất đồng bộ | BR-39, BR-42 | US-26 | AI15, AI16, AI17, KS10, KS13 | TC-F29; TC-A127, TC-A128, TC-A129, TC-A130 | Không có Q trực tiếp; phạm vi Sprint theo Q18 |
| BREQ-07 | FR-30 Baseline và theo kỳ | BR-39, BR-40 | US-04, US-09, US-25 | DA10, DA11, AI09, AI10, AI11 | TC-F30; TC-A022, TC-A023, TC-A024, TC-A047, TC-A048, TC-A049, TC-A050, TC-A051, TC-A124, TC-A125, TC-A126 | Q11/Q16 |
| BREQ-08 | FR-31 Research validation | BR-44 | US-20, US-26 | AI03 | TC-F31; TC-A073, TC-A074, TC-A075, TC-A076, TC-A077, TC-A127, TC-A128, TC-A129, TC-A130 | Không có Q trực tiếp; phạm vi Sprint theo Q18 |
| BREQ-02 | FR-32 Google Maps | BR-38 | US-40 | HT02, KS17 | TC-F32; TC-A170, TC-A171, TC-A172 | Q12 |
| BREQ-07 | FR-33 Lập phạm vi bay nhiều nhánh | BR-36, BR-41, BR-43 | US-39 | KS18, KS15 | TC-F33; TC-A167, TC-A168, TC-A169 | Q11/Q14/Q18 |
| BREQ-09 | FR-34 Dashboard và timeline | BR-03, BR-29, BR-45 | US-15, US-29 | BC01, BC02, BC03, BC04, BC05, CN04 | TC-F34; TC-A078, TC-A079, TC-A080, TC-A081, TC-A082, TC-A083, TC-A134, TC-A135, TC-A136 | Không có Q trực tiếp; phạm vi Sprint theo Q18 |
| BREQ-09 | FR-35 Xuất và lưu trữ | BR-20, BR-45 | US-16, US-19 | BC06, BC07, BC08, BC09, BC10, QT11, QT12, QT13, QT14 | TC-F35; TC-A084, TC-A085, TC-A086, TC-A087, TC-A088, TC-A089, TC-A090, TC-A103, TC-A104, TC-A105, TC-A106, TC-A107, TC-A108, TC-A109 | Không có Q trực tiếp; phạm vi Sprint theo Q18 |
| BREQ-01 | FR-36 Quản trị cấu hình/mô hình | BR-02, BR-39, BR-42, BR-45 | US-17, US-18 | QT01, QT02, QT03, QT04, QT05, QT06, QT07, QT08, QT09, QT10, AI14 | TC-F36; TC-A091, TC-A092, TC-A093, TC-A094, TC-A095, TC-A096, TC-A097, TC-A098, TC-A099, TC-A100, TC-A101, TC-A102 | Không có Q trực tiếp; phạm vi Sprint theo Q18 |
| BREQ-04 | FR-37 Emergency tạm | BR-14, BR-46 | US-41 | SC10, HT12 | TC-F37; TC-A173, TC-A174, TC-A175 | Năng lực/giới hạn nhiệm vụ tạm TBD |

## 13.4 Khoảng trống và cách xử lý — không che bằng tỷ lệ 100%

| Gap ID | Phát hiện từ đối chiếu nguồn | Xử lý đề xuất và tác động |
|---|---|---|
| GAP-01 | US-10 / AI14 duyệt nhãn có trong UseCase/US nhưng không được FR-01–37 trace trực tiếp | Đề xuất bổ sung trace và điều kiện duyệt nhãn cho FR-36; TC-A của US-10 đã được lập, nhưng liên kết FR là PROPOSED cho đến khi sửa FRD. CR-017 theo dõi |
| GAP-02 | DA16 có phần nguồn track drone Sprint 2; FR-06 chủ yếu GPX/chỉnh tuyến | Giữ riêng phần ngoài Sprint 1; cần FR cho RouteCapture khi Q14/Q15/Q18 chốt; không coi FR-06 đã phủ toàn DA16 |
| GAP-03 | AI02/AI03 nâng cao không thuộc sản phẩm MVP; FR-31 nghiên cứu chỉ phủ kiểm chứng phép đo | Test nghiên cứu không chứng minh UI orthomosaic/DSM. Cần baseline nâng cao riêng khi giao phạm vi |
| GAP-04 | Các FR mức tổng hợp chưa mô tả mọi chi tiết nhỏ như đặt lại mật khẩu, hủy nhiệm vụ, dọn local | TC-A giữ đầy đủ AC nguồn; cần P1/QA xác nhận contract subflow, không bỏ chỉ vì bảng FR ngắn |
| GAP-05 | NFR định lượng, RPT refresh và annotation chi tiết là đề xuất | Chốt workload/target/UX rồi đóng gap; chưa thể nghiệm thu chất lượng chỉ từ độ phủ tài liệu |

## 13.5 Ma trận ngược US/AC → test

Mã AC dạng “US-xx §AC mục n” giữ nguyên tham chiếu mục đánh số của nguồn, **không giả là ID AC đã có**. TC-A là ID mới ổn định trong gói này. Nguồn AC R3 có ID sẵn được giữ đúng.

| US | FR nguồn | Test chi tiết AC | Ghi chú |
| --- | --- | --- | --- |
| US-01 | FR-01 | TC-A001, TC-A002, TC-A003, TC-A004, TC-A005, TC-A006 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-02 | FR-22 | TC-A013, TC-A014, TC-A015, TC-A016, TC-A017 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-03 | FR-04 | TC-A018, TC-A019, TC-A020, TC-A021 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-04 | FR-26, FR-30 | TC-A022, TC-A023, TC-A024 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-05 | FR-26 | TC-A025, TC-A026, TC-A027, TC-A028, TC-A029, TC-A030 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-06 | FR-27 | TC-A031, TC-A032, TC-A033, TC-A034, TC-A035, TC-A036, TC-A037 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-07 | FR-26 | TC-A038, TC-A039, TC-A040, TC-A041, TC-A042 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-08 | FR-13 | TC-A043, TC-A044, TC-A045, TC-A046 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-09 | FR-30 | TC-A047, TC-A048, TC-A049, TC-A050, TC-A051 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-10 | GAP-01: đề xuất FR-36 | TC-A052, TC-A053, TC-A054, TC-A055 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-11 | FR-19 | TC-A056, TC-A057, TC-A058, TC-A059 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-12 | FR-20 | TC-A060, TC-A061, TC-A062, TC-A063 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-13 | FR-21 | TC-A064, TC-A065, TC-A066, TC-A067, TC-A068 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-14 | FR-23, FR-24 | TC-A069, TC-A070, TC-A071, TC-A072 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-15 | FR-34 | TC-A078, TC-A079, TC-A080, TC-A081, TC-A082, TC-A083 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-16 | FR-35 | TC-A084, TC-A085, TC-A086, TC-A087, TC-A088, TC-A089, TC-A090 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-17 | FR-01, FR-36 | TC-A091, TC-A092, TC-A093, TC-A094, TC-A095, TC-A096 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-18 | FR-36 | TC-A097, TC-A098, TC-A099, TC-A100, TC-A101, TC-A102 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-19 | FR-35 | TC-A103, TC-A104, TC-A105, TC-A106, TC-A107, TC-A108, TC-A109 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-20 | FR-13, FR-17, FR-31 | TC-A073, TC-A074, TC-A075, TC-A076, TC-A077 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-21 | FR-11 | TC-A110, TC-A111, TC-A112 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-22 | FR-12, FR-13 | TC-A113, TC-A114, TC-A115, TC-A116 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-23 | FR-23, FR-25 | TC-A117, TC-A118, TC-A119, TC-A120 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-24 | FR-05, FR-08 | TC-A121, TC-A122, TC-A123 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-25 | FR-28, FR-30 | TC-A124, TC-A125, TC-A126 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-26 | FR-29, FR-31 | TC-A127, TC-A128, TC-A129, TC-A130 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-27 | FR-03 | TC-A007, TC-A008, TC-A009, TC-A010, TC-A011, TC-A012 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-28 | FR-02 | TC-A131, TC-A132, TC-A133 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-29 | FR-34 | TC-A134, TC-A135, TC-A136 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-30 | FR-05, FR-06 | TC-A137, TC-A138, TC-A139, TC-A140 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-31 | FR-07 | TC-A141, TC-A142, TC-A143 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-32 | FR-08 | TC-A144, TC-A145, TC-A146 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-33 | FR-15, FR-18 | TC-A147, TC-A148, TC-A149, TC-A150, TC-A151 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-34 | FR-14 | TC-A152, TC-A153, TC-A154 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-35 | FR-16 | TC-A155, TC-A156, TC-A157 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-36 | FR-10 | TC-A158, TC-A159, TC-A160 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-37 | FR-24 | TC-A161, TC-A162, TC-A163 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-38 | FR-09 | TC-A164, TC-A165, TC-A166 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-39 | FR-28, FR-33 | TC-A167, TC-A168, TC-A169 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-40 | FR-32 | TC-A170, TC-A171, TC-A172 | Xem AC nguồn trong phần 15; conditional giữ nguyên |
| US-41 | FR-37 | TC-A173, TC-A174, TC-A175 | Xem AC nguồn trong phần 15; conditional giữ nguyên |

## 13.6 Kiểm kê Use Case nguồn

Giữ các mã chức năng nguồn, không đổi thành UC-001 giả. Liên kết FR sau đây là mức chức năng; xem gap cho phạm vi chưa đủ.

| Use Case | Tên gốc | FR/test hoặc gap |
| --- | --- | --- |
| CN01 | Đăng nhập / đăng xuất | FR-01/TC-F01 |
| CN02 | Xem và cập nhật hồ sơ cá nhân | FR-01/TC-F01 |
| CN03 | Xem phạm vi dữ liệu được phép | FR-01/TC-F01 |
| CN04 | Xem thông báo và nhắc việc | FR-01/TC-F01, FR-34/TC-F34 |
| CN05 | Lưu công việc và bản đồ phục vụ ngoại tuyến | FR-22/TC-F22 |
| CN06 | Lưu bản nháp và bằng chứng khi không có mạng | FR-22/TC-F22 |
| CN07 | Tự tiếp tục đồng bộ khi có mạng | FR-22/TC-F22 |
| CN08 | Kiểm tra trạng thái đồng bộ an toàn | FR-22/TC-F22 |
| CN09 | Dọn bản sao cục bộ đã đồng bộ an toàn | FR-22/TC-F22 |
| CN10 | Yêu cầu / đặt lại mật khẩu | FR-01/TC-F01 |
| CN11 | Reporter tự đăng ký bằng email và xác minh OTP một lần | FR-03/TC-F03 |
| CN12 | Xác minh email bằng OTP | FR-03/TC-F03 |
| DA01 | Khởi tạo và quản lý dự án | FR-04/TC-F04 |
| DA02 | Nhập/chỉnh tuyến và bề rộng | FR-05/TC-F05, FR-06/TC-F06 |
| DA03 | Phân công nhân sự và quyền theo dự án | FR-04/TC-F04 |
| DA04 | Quản lý hồ sơ bàn giao và thông tin bảo hành | FR-04/TC-F04 |
| DA05 | Xem hồ sơ dự án và thời hạn bảo hành | FR-04/TC-F04 |
| DA06 | Lập và điều chỉnh kế hoạch khảo sát định kỳ | FR-26/TC-F26 |
| DA07 | Xem lịch và nhắc khảo sát sắp đến hạn | FR-26/TC-F26 |
| DA08 | Tạo yêu cầu khảo sát từ kế hoạch hoặc phát sinh | FR-26/TC-F26 |
| DA09 | Ghi nhận hoãn / không triển khai khảo sát theo kế hoạch | FR-26/TC-F26 |
| DA10 | Xác nhận baseline theo segment và vùng quan sát | FR-30/TC-F30 |
| DA11 | Xem tình trạng công trình qua các kỳ khảo sát | FR-30/TC-F30 |
| DA12 | Đóng / ngừng sử dụng dự án và tra cứu hồ sơ đã đóng | FR-04/TC-F04 |
| KS01 | Phân công người bay cho yêu cầu khảo sát | FR-26/TC-F26 |
| KS02 | Xem và tiếp nhận yêu cầu khảo sát | FR-26/TC-F26 |
| KS03 | Từ chối nhiệm vụ khảo sát kèm lý do | FR-26/TC-F26 |
| KS04 | Điều chỉnh lịch và phân công lại người bay | FR-26/TC-F26 |
| KS05 | Ghi nhận thông tin chuyến bay và tài liệu khảo sát | FR-26/TC-F26 |
| KS06 | Nhập và sao chép video từ thẻ nhớ vào ứng dụng | FR-27/TC-F27 |
| KS07 | Bổ sung tệp phụ đề định vị tương ứng với video | FR-27/TC-F27 |
| KS08 | Kiểm tra tính hợp lệ và chất lượng dữ liệu khảo sát | FR-27/TC-F27, FR-28/TC-F28 |
| KS09 | Gửi bộ dữ liệu và theo dõi tự tải lên | FR-27/TC-F27 |
| KS10 | Xem tiến độ xử lý và kết quả kiểm tra chất lượng | FR-27/TC-F27, FR-29/TC-F29 |
| KS11 | Yêu cầu / xác nhận bay bổ sung vùng dữ liệu chưa đạt | FR-26/TC-F26 |
| KS12 | Nộp dữ liệu bay bổ sung vào cùng lần khảo sát | FR-26/TC-F26 |
| KS13 | Yêu cầu thử lại tác vụ xử lý thất bại | FR-26/TC-F26, FR-29/TC-F29 |
| KS14 | Hủy / thu hồi yêu cầu khảo sát kèm lý do | FR-26/TC-F26 |
| AI01 | Xem kết quả phân tích trên bản đồ và ảnh khảo sát | FR-13/TC-F13 |
| AI02 | Xem ảnh trực giao và mô hình bề mặt | GAP-03 |
| AI03 | Xem vị trí, kích thước và độ không chắc chắn | FR-31/TC-F31 |
| AI04 | Giữ lại phát hiện sơ bộ để kiểm chứng | FR-13/TC-F13 |
| AI05 | Hiệu chỉnh loại, mức độ, vị trí và vùng hư hỏng | FR-13/TC-F13, FR-14/TC-F14 |
| AI06 | Loại bỏ phát hiện sai và giữ hồ sơ đối chiếu | FR-13/TC-F13 |
| AI07 | Ghi lý do và lịch sử quyết định rà soát/xác minh | FR-13/TC-F13 |
| AI08 | Đối chiếu các phát hiện trùng cùng một hư hỏng | FR-10/TC-F10, FR-12/TC-F12 |
| AI09 | Đối chiếu cùng hư hỏng qua nhiều lần khảo sát | FR-30/TC-F30 |
| AI10 | Xem lịch sử và so sánh với hồ sơ gốc bàn giao | FR-30/TC-F30 |
| AI11 | Xem lỗi mới, ổn định hoặc đang phát triển | FR-30/TC-F30 |
| AI12 | Xem cảnh báo hư hỏng cần ưu tiên kiểm tra | FR-14/TC-F14 |
| AI13 | Yêu cầu đo đạc thực tế khi cần căn cứ vật lý | FR-13/TC-F13 |
| AI14 | Duyệt nhãn hư hỏng phục vụ huấn luyện | FR-36/TC-F36 |
| TN01 | Lập kế hoạch và giao đo/kiểm tra | FR-16/TC-F16, FR-18/TC-F18 |
| TN02 | Xem và tiếp nhận nhiệm vụ đo đạc | FR-17/TC-F17 |
| TN03 | Ghi số đo và đối chiếu policy | FR-17/TC-F17, FR-18/TC-F18 |
| TN04 | Gửi kết quả đo và bằng chứng | FR-17/TC-F17 |
| TN05 | Đánh giá bằng chứng và kết quả theo nhánh | FR-17/TC-F17 |
| TN06 | Yêu cầu bổ sung phép đo/bằng chứng | FR-17/TC-F17 |
| TN12 | Từ chối nhiệm vụ đo đạc thực tế kèm lý do | FR-17/TC-F17 |
| SC01 | Chọn lỗi và lập gói phương án sửa | FR-19/TC-F19 |
| SC02 | Nhập phương án sửa tổng quát | FR-19/TC-F19 |
| SC03 | Khóa phiên bản hồ sơ trình | FR-19/TC-F19 |
| SC04 | Trình gói hồ sơ để duyệt từng lỗi | FR-19/TC-F19 |
| SC05 | Quyết định phê duyệt từng lỗi | FR-19/TC-F19 |
| SC06 | Đánh giá phương án sửa | FR-19/TC-F19 |
| SC07 | Yêu cầu bổ sung hoặc từ chối phương án | FR-19/TC-F19 |
| SC08 | Chỉnh phần hồ sơ bị trả | FR-19/TC-F19 |
| SC09 | Trình lại các lỗi cần xét lại | FR-19/TC-F19 |
| SC10 | Giao Crew thực hiện theo nhánh | FR-20/TC-F20, FR-37/TC-F37 |
| SC11 | Điều chỉnh phân công Crew | FR-20/TC-F20 |
| SC12 | Theo dõi lịch sử quyết định và tiến độ | FR-19/TC-F19 |
| HT01 | Xem và tiếp nhận việc sửa được giao | FR-20/TC-F20 |
| HT02 | Xem điểm đích và mở Google Maps | FR-32/TC-F32 |
| HT03 | Ghi chú tổ chức đội thực hiện | FR-20/TC-F20 |
| HT04 | Ghi bằng chứng trước sửa | FR-18/TC-F18, FR-21/TC-F21 |
| HT05 | Cập nhật tiến độ sửa chữa | FR-18/TC-F18, FR-21/TC-F21 |
| HT06 | Báo cáo hư hỏng mới phát hiện tại hiện trường | FR-21/TC-F21 |
| HT07 | Gửi báo cáo kết quả từng lỗi cho PM | FR-18/TC-F18, FR-21/TC-F21 |
| HT08 | Kiểm tra đủ bằng chứng trước/sau từng lỗi | FR-21/TC-F21 |
| HT09 | Kiểm tra kết quả từng lỗi | FR-23/TC-F23 |
| HT10 | Yêu cầu bổ sung hoặc sửa lại | FR-23/TC-F23, FR-24/TC-F24 |
| HT11 | Trình kết quả nhánh duyệt | FR-23/TC-F23 |
| HT12 | Đóng lỗi và hồ sơ theo nhánh | FR-23/TC-F23, FR-37/TC-F37 |
| HT13 | Thực hiện sửa lại và bổ sung báo cáo từng lỗi | FR-24/TC-F24 |
| HT14 | Xem lịch sử sửa chữa sau hoàn tất | FR-21/TC-F21 |
| HT15 | Từ chối việc trước khi tiếp nhận | FR-20/TC-F20 |
| BC01 | Xem tổng quan danh mục dự án bảo hành | FR-34/TC-F34 |
| BC02 | Xem tổng quan dự án được phân công | FR-34/TC-F34 |
| BC03 | Xem tình trạng sửa chữa và hồ sơ còn mở | FR-34/TC-F34 |
| BC04 | Xem công trình rủi ro cao và hư hỏng phát triển nhanh | FR-34/TC-F34 |
| BC05 | So sánh tình trạng giữa các dự án và kỳ khảo sát | FR-34/TC-F34 |
| BC06 | Xuất báo cáo theo dự án và khoảng thời gian | FR-35/TC-F35 |
| BC07 | Xuất hồ sơ bằng chứng cho đoạn đường hoặc một lỗi | FR-35/TC-F35 |
| BC08 | Tổng hợp ảnh gốc, số đo, lịch sử và quyết định | FR-35/TC-F35 |
| BC09 | Kèm nguồn gốc và thông tin kiểm tra toàn vẹn hồ sơ | FR-35/TC-F35 |
| BC10 | Tra cứu hồ sơ lưu trữ sau khi dự án đã đóng | FR-35/TC-F35 |
| QT01 | Tạo, cập nhật và ngừng sử dụng tài khoản | FR-02/TC-F02, FR-36/TC-F36 |
| QT02 | Quản lý vai trò và quyền truy cập dự án | FR-01/TC-F01, FR-36/TC-F36 |
| QT03 | Quản lý danh mục loại lỗi | FR-36/TC-F36 |
| QT04 | Quản lý bộ quy tắc phân mức và dung sai có phiên bản | FR-36/TC-F36 |
| QT05 | Cấu hình nhắc khảo sát và nhắc trước hạn bảo hành | FR-36/TC-F36 |
| QT06 | Quản lý, phát hành và ngừng dùng phiên bản mô hình AI | FR-36/TC-F36 |
| QT07 | Xuất dữ liệu và nhãn đã được duyệt cho huấn luyện | FR-36/TC-F36 |
| QT08 | Theo dõi tác vụ xử lý, dung lượng và tình trạng máy chủ | FR-36/TC-F36 |
| QT09 | Tra cứu nhật ký truy vết và lịch sử thay đổi dữ liệu | FR-01/TC-F01, FR-36/TC-F36 |
| QT10 | Quản lý thông tin thiết bị bay và tài liệu quy trình khảo sát | FR-36/TC-F36 |
| QT11 | Lập yêu cầu xóa dữ liệu đã hết hạn lưu trữ | FR-35/TC-F35 |
| QT12 | Phê duyệt yêu cầu xóa dữ liệu hết hạn | FR-35/TC-F35 |
| QT13 | Kiểm tra hạn lưu trữ và trạng thái giữ hồ sơ | FR-35/TC-F35 |
| QT14 | Thiết lập / gỡ giữ hồ sơ phục vụ tranh chấp | FR-35/TC-F35 |
| PA01 | Gửi phản ánh và ảnh có vị trí riêng | FR-11/TC-F11 |
| PA02 | Bổ sung và theo dõi phản ánh của mình | FR-11/TC-F11, FR-25/TC-F25 |
| PA03 | Điều phối và liên kết phản ánh trùng | FR-12/TC-F12 |
| PA04 | Chọn cách kiểm chứng phản ánh | FR-13/TC-F13 |
| PA05 | Ghi kết luận có/không có hư hỏng | FR-13/TC-F13 |
| PA06 | Theo dõi và đóng hồ sơ theo nhánh | FR-23/TC-F23 |
| PA07 | Công bố kết quả và ảnh sau sửa | FR-25/TC-F25 |
| DA13 | Dựng, xem trước và xác nhận tuyến | FR-05/TC-F05, FR-06/TC-F06, FR-07/TC-F07 |
| DA14 | Xem trước, chia/gộp và chỉnh segment | FR-08/TC-F08 |
| DA15 | Công bố bộ segment và truy vết phiên bản | FR-08/TC-F08 |
| DA16 | Khởi tạo RouteCapture và nguồn GPS drone | GAP-02 |
| KS15 | Giao segment và vùng cần quan sát | FR-26/TC-F26, FR-33/TC-F33 |
| KS16 | Đối chiếu vị trí bay, chất lượng và độ phủ | FR-28/TC-F28 |
| KS17 | Xem điểm tiếp cận/tập kết và mở Google Maps | FR-32/TC-F32 |
| AI15 | Tạo và theo dõi phân tích bất đồng bộ | FR-29/TC-F29 |
| AI16 | Nhận kết quả có truy vết và thử lại an toàn | FR-29/TC-F29 |
| AI17 | Xử lý ngữ cảnh biên và phát hiện trùng | FR-29/TC-F29 |
| DA17 | Quản lý mạng tuyến nhiều nhánh | FR-09/TC-F09 |
| DA18 | Quản lý tấm và gắn nhiều hư hỏng | FR-10/TC-F10 |
| TN07 | Gom đợt đo nhiều lỗi lớn/nhỏ | FR-16/TC-F16 |
| SC13 | Lập và xem policy Fast Track | FR-15/TC-F15, FR-18/TC-F18 |
| SC14 | Phân cấp và sắp xếp ưu tiên sửa | FR-14/TC-F14 |
| PA08 | Phân biệt chưa đạt và tái phát sau đóng | FR-24/TC-F24 |
| KS18 | Lập phạm vi bay mạng nhiều nhánh | FR-33/TC-F33 |

## 13.7 Truy vết bổ sung và quy trình duy trì

- NFR-01–14 → TC-N01–14; các bổ sung NFR-X01–04 → TC-NX01–04, xem phần 14.
- RPT-01–10 → FR-31/34/35/36 và FR nghiệp vụ trong bảng §11.2 → TC-F31/34/35/36, UAT-09/10, TC-A của US-15/16/29. RPT-AC-01–09 → TC-R01–09.
- WF-01–12 → FR trong §12.2 → TC-F/TC-A tương ứng; annotation mới cần UX review, không coi một test mức FR chứng minh mọi pixel.
- BR-01–48 là các luật nguồn: FRD dẫn trực tiếp các luật; BR-47 nằm FR-11, BR-48 nằm FR-25. Rule Q còn mở giữ conditional.
- DR-01–16: lần lượt kiểm qua TC-N03, UAT-05, TC-R09, TC-F05, TC-F06, TC-N01, TC-F17, TC-F21, TC-F18/22, TC-N02, TC-N10, TC-F19/23, TC-F25, TC-F35, TC-N06/07, TC-N11. Index/performance là đề xuất phải benchmark, không pass từ inspection.

Khi có CR được chấp thuận: cập nhật BREQ/FR/BR/US/UC/DD cần thiết → sửa hàng RTM → thêm/sửa test → ghi version baseline, build và evidence chạy lại. Không xóa test lịch sử, dùng superseded_by. Trước release QA đối chiếu ID mới không mồ côi, gap được xử lý hoặc loại khỏi scope có quyết định, và từng AC áp dụng có kết quả thực tế.

**Độ phủ thiết kế hiện tại:** 37/37 FR có test mức FR; 41/41 story có kiểm kê AC; 175 mục AC có test thiết kế. Đây không phải 100% nghiệm thu: GAP-01–05, các Q và ngưỡng NFR chưa chốt vẫn tồn tại. Số test passed hiện chưa xác định vì chưa chạy hệ thống.

## V2(3) amendment — 2026-09-28

This document follows `planning/V2/V2-3_DECISION_REGISTER.md`. D01-D28 are approved business decisions; `APPROVED_PILOT_CONFIG` and `APPROVED_TARGET` are not empirical verification. The document must distinguish `contractStatus`, `implementationStatus`, and `verificationStatus`. Reporter email/password plus one-time email OTP is the approved authentication flow; web cookie transport, pilot limits, retention and performance values remain configuration/target registers. Fast Track uses measurement-only intake followed by a separately authorized PM repair task; policy framework, reopen, partial publication, handover/conflict, BEFORE incident, curing and traffic release remain explicit contracts. Offline evaluation and AI two-stage processing are proposed until schema, fixtures and runtime/provider evidence pass.
