# RoadGuard — Nhật ký thay đổi UseCase và tác động P1/P2

> Hiện hành: **DOC-2026-09-26-R3**, xem §9.2 với UC-D19–UC-D30 và DD-C01–DD-C20. §1–8 là snapshot R1; §9.1 là R2. Trạng thái Done/điểm mở lịch sử không bị ghi đè; quyết định R3 thay phần xung đột trước đó.

## 1. Cách sử dụng và phạm vi

- Đợt: **UC-2026-09-24-R1**. Ngày quyết định: 24/09/2026. Nguồn: câu trả lời trực tiếp của chủ dự án trong phiên này, Design v2 ở phần không xung đột, UseCase nền và hai plan đính kèm.
- Được phép: sửa **UseCase.md** trước và tạo **một log thay đổi**. Không sửa code, schema, migration, plan P1/P2, trạng thái task, worklog lịch sử hoặc tài liệu khác.
- Kết quả tài liệu: [UseCase.md](../02_Requirements/04_Use_Cases.md). Các mã UC-Dxx dưới đây là **mã thay đổi**, không phải task P1/P2 mới, không phải bằng chứng triển khai backend.
- Từ lần sau, đọc log này để biết quyết định trước/sau và owner; chỉ mở bản cũ khi cần điều tra sâu. Thêm đợt mới ở cuối, không ghi đè quyết định cũ; ghi rõ mã thay thế nếu chủ dự án đổi ý.
- Mọi câu “Done” trong log là **theo plan được cung cấp**, không có checkout/worklog đầy đủ để xác minh lại. Không suy ra đã tích hợp, triển khai hay hỗ trợ luồng mới từ trạng thái lịch sử.
- P1 = Person 1 / `anh`: nghiệp vụ, API, Services, DTO, domain methods sau schema handoff, unit/API tests. P2 = Person 2 / `huy`: entity/property/enum shape, repository, mapping/DbContext, migration, SQL tests, worker/storage/operations. FE: Android/Web, hàng đợi cục bộ và mở Google Maps.

## 2. Chỉ mục thay đổi

| Mã | Nội dung | Vị trí UseCase | Trạng thái |
|---|---|---|---|
| UC-D01 | Phạm vi và nguồn ưu tiên | §1, §8.1, §10–11 | Đã cập nhật tài liệu; backend chưa kiểm tra theo delta |
| UC-D02 | PM chọn cách kiểm chứng | §1.2, quy tắc 10, PA04, §5.9, §8.1 | Đã cập nhật tài liệu; backend chưa kiểm tra theo delta |
| UC-D03 | Cụm lỗi nhỏ: đo trước kế hoạch sửa | quy tắc 10–12, TN01, SC01, §5.4, §5.9, §5.11 | Đã cập nhật tài liệu; backend chưa kiểm tra theo delta |
| UC-D04 | Fast Track không chờ PM duyệt trước sửa | quy tắc 11–12, 20–21; TN03–TN05; §5.3, §5.11 | Đã cập nhật tài liệu; backend chưa kiểm tra theo delta |
| UC-D05 | Ảnh trước/sau và tự upload | quy tắc 6, 13; CN07, KS09, TN04, HT07; §5.2, §5.6, §5.11 | Đã cập nhật tài liệu; backend chưa kiểm tra theo delta |
| UC-D06 | Từ chối phương án không đóng lỗi | SC05, SC07–SC09; §5.5, §5.9, §6 | Đã cập nhật tài liệu; backend chưa kiểm tra theo delta |
| UC-D07 | PM đóng lỗi Fast Track, Supervisor chỉ được báo | §1.2, quy tắc 13; TN05, HT09–HT12, PA06; §5.6, §5.9, §5.11, §6 | Đã cập nhật tài liệu; backend chưa kiểm tra theo delta |
| UC-D08 | Duyệt từng lỗi và trình lại riêng phần bị trả | quy tắc 11–13; SC01–SC12; §5.4–5.6; §6 | Đã cập nhật tài liệu; backend chưa kiểm tra theo delta |
| UC-D09 | Giao theo Crew và nhánh | §1.2, quy tắc 12, SC10–SC11, HT01/HT15 | Đã cập nhật tài liệu; backend chưa kiểm tra theo delta |
| UC-D10 | Google Maps Sprint 1 | HT02, KS17 mới, §5.12, §7, §8.1 | Đã cập nhật tài liệu; backend chưa kiểm tra theo delta |
| UC-D11 | GPX Sprint 1; GPS drone Sprint 2 | DA13, DA16, §5.10, §8.1 | Đã cập nhật tài liệu; backend chưa kiểm tra theo delta |
| UC-D12 | Baseline và trạng thái khảo sát theo v2 | quy tắc 18, DA10, §5.1, §6 | Đã cập nhật tài liệu; backend chưa kiểm tra theo delta |
| UC-D13 | Địa điểm thử nghiệm | §8.1–8.2 | Đã cập nhật tài liệu; backend chưa kiểm tra theo delta |
| UC-D14 | Truy vết và trình bày | đầu tài liệu, §1.1, §7, §10–11 | Đã cập nhật tài liệu; backend chưa kiểm tra theo delta |

## 3. Nội dung trước/sau và bàn giao theo owner

### UC-D01 — Phạm vi và nguồn ưu tiên

- **Vị trí:** §1, §8.1, §10–11.
- **Trước:** UseCase cũ lấy Data Dictionary ưu tiên toàn bộ; chưa có log quyết định liên kết P1/P2.
- **Sau:** Quyết định chủ dự án đợt này ưu tiên phần thay đổi; UseCase và log là hai đầu ra. Các tài liệu nền chưa đồng bộ được chỉ rõ.
- **Task P1/P2 liên quan:** P1-HF-01; P2-HF-01.
- **Tác động và giới hạn:** Không đổi status plan; chỉ dùng mã delta để giao việc sau. Hai HF hiện Proposed theo plan.

### UC-D02 — PM chọn cách kiểm chứng

- **Vị trí:** §1.2, quy tắc 10, PA04, §5.9, §8.1.
- **Trước:** UseCase nền cho PM chọn; D-02 v2 chuyển field-first thành mặc định có điều kiện.
- **Sau:** Chủ dự án xác nhận PM được chọn đo/kiểm tra trực tiếp hoặc drone cho một/nhiều phản ánh. Không áp dụng field-first như điều kiện cứng.
- **Task P1/P2 liên quan:** P1-22, P1-23, P1-32, P1-40; P2-22, P2-23, P2-32, P2-40; P1/P2-HF-01.
- **Tác động và giới hạn:** P2-22/23/32 Done theo plan: cần kiểm tra nguồn task và scope hiện có, không dựng Survey giả. P1 sửa lựa chọn/điều phối sau handoff.

### UC-D03 — Cụm lỗi nhỏ: đo trước kế hoạch sửa

- **Vị trí:** quy tắc 10–12, TN01, SC01, §5.4, §5.9, §5.11.
- **Trước:** Chưa có quy tắc rõ cho nhiều lỗi nhỏ cùng tuyến từ dân hoặc drone.
- **Sau:** PM lên kế hoạch đo trước kế hoạch sửa. Nhiệm vụ đo-và-sửa trong phạm vi policy có thể xử lý từng lỗi đạt cùng chuyến; nhiệm vụ chỉ đo không tự cấp quyền sửa.
- **Task P1/P2 liên quan:** P1-22, P1-40, P1-50; P2-32, P2-40, P2-50.
- **Tác động và giới hạn:** P1 phân biệt mục đích và thời điểm kế hoạch; P2 kiểm tra nguồn/phạm vi/task_type. Không mặc định toàn cụm được sửa vì một lỗi đạt.

### UC-D04 — Fast Track không chờ PM duyệt trước sửa

- **Vị trí:** quy tắc 11–12, 20–21; TN03–TN05; §5.3, §5.11.
- **Trước:** Nền yêu cầu Defect VERIFIED do PM trước RepairItem; P1-32/P1-41/P1-50 có prerequisite đo/xác minh trước. V2 chưa giải quyết hết xung đột này.
- **Sau:** Crew đo, chụp BEFORE, đối chiếu policy có phiên bản; LOW đạt đầy đủ thì tự sửa cùng chuyến và chụp AFTER, không chờ PM/Supervisor duyệt từng lỗi. Vượt policy báo PM để lập phương án. Giữ nhãn ban đầu và lý do thay đổi mức độ.
- **Task P1/P2 liên quan:** P1-32, P1-40, P1-41, P1-50, P1-53, P1-64; P2-05, P2-32, P2-40, P2-41, P2-50, P2-53, P2-64.
- **Tác động và giới hạn:** P2-05/32 Done: phải kiểm tra constraint VERIFIED/task và enum đã phát hành. P2 đề xuất trạng thái/kết quả policy/snapshot có kiểm soát; P1 thực thi ngoại lệ riêng Fast Track. Không mở quyền tự VERIFIED tùy ý từ client; không coi upload là nghiệm thu. O-01 còn mở cho cấp phép hoàn toàn offline.

### UC-D05 — Ảnh trước/sau và tự upload

- **Vị trí:** quy tắc 6, 13; CN07, KS09, TN04, HT07; §5.2, §5.6, §5.11.
- **Trước:** Cũ ghi có mạng và mở lại app; chưa làm rõ đo/sửa cùng chuyến và tự tải ảnh Fast Track.
- **Sau:** Ảnh BEFORE chụp trước sửa, AFTER sau sửa. Hàng đợi đã gửi tự tải khi mạng trở lại/app được phép chạy; retry không trùng, giữ thời điểm thực khác server nhận. Server-confirm trước nghiệm thu, bản chưa đồng bộ không bị xóa.
- **Task P1/P2 liên quan:** P1-12, P1-30, P1-40, P1-53; P2-02, P2-04, P2-30, P2-40, P2-53; FE.
- **Tác động và giới hạn:** P1-12 và P2-02/04/30 Done: tái sử dụng idempotency/storage/acknowledgement. P1/P2 không chịu phần scheduler/hàng đợi cục bộ Android. Đồng bộ offline không tự giải quyết cấp phép sửa offline.

### UC-D06 — Từ chối phương án không đóng lỗi

- **Vị trí:** SC05, SC07–SC09; §5.5, §5.9, §6.
- **Trước:** Cũ có REJECTED/REVISION_REQUIRED nhưng chưa tách rõ tác động đề xuất so với Defect.
- **Sau:** REJECT kết thúc đề xuất sửa đó, giữ lỗi chưa xử lý để PM lập phương án khác. REQUEST_EVIDENCE và REQUEST_RECONSIDER riêng; giữ lý do và lịch sử. Không chuyển NO_DEFECT/RESOLVED.
- **Task P1/P2 liên quan:** P1-50, P1-51, P1-52; P2-50, P2-51, P2-52.
- **Tác động và giới hạn:** P1 tách quyết định và transition; P2 giữ snapshot/previous item và uniqueness việc hiệu lực. Chưa ấn định giá trị enum mới khi chưa xem checkout.

### UC-D07 — PM đóng lỗi Fast Track, Supervisor chỉ được báo

- **Vị trí:** §1.2, quy tắc 13; TN05, HT09–HT12, PA06; §5.6, §5.9, §5.11, §6.
- **Trước:** Nền yêu cầu Supervisor xác nhận cuối tất cả lỗi; v2 đã phân nhánh nhưng toàn Case chưa rõ.
- **Sau:** PM kiểm tra số đo/policy/ảnh trước-sau và xác nhận đã sửa thì đóng lỗi nhỏ. Supervisor nhận thông tin, không duyệt/xác nhận lại. Thiếu/không đạt thì bổ sung/sửa lại. Không tự đóng cả Case có phần chưa đạt.
- **Task P1/P2 liên quan:** P1-41, P1-53, P1-60, P1-64; P2-07, P2-41, P2-53, P2-60, P2-64; P1/P2-HF-01.
- **Tác động và giới hạn:** P2-07 Done: tái sử dụng Notification/outbox. Không tạo approval task Supervisor cho Fast Track. O-02 giữ quyền đóng toàn IncidentCase chưa chốt, khác quyền đóng từng lỗi đã chốt.

### UC-D08 — Duyệt từng lỗi và trình lại riêng phần bị trả

- **Vị trí:** quy tắc 11–13; SC01–SC12; §5.4–5.6; §6.
- **Trước:** SC05/SC09 và kịch bản cũ duyệt/trình lại cả đợt; lỗi đạt không được triển khai riêng.
- **Sau:** Đồng bộ D-08 v2: gói hồ sơ chứa item, Supervisor quyết định từng item; APPROVED giao ngay, item bị trả vào gói phiên bản mới, không copy phần đã duyệt không đổi.
- **Task P1/P2 liên quan:** P1-50, P1-51, P1-52, P1-53; P2-50, P2-51, P2-52, P2-53.
- **Tác động và giới hạn:** P1 sửa logic không khóa cả batch; P2 kiểm tra FK Assignment tới item và snapshot quyết định. Các task có dòng kế hoạch nhưng không có status riêng ở bảng hiện tại: chưa được coi Done.

### UC-D09 — Giao theo Crew và nhánh

- **Vị trí:** §1.2, quy tắc 12, SC10–SC11, HT01/HT15.
- **Trước:** Giao đích danh tài khoản đội trưởng cho toàn version đợt.
- **Sau:** Theo v2 giao Crew và phạm vi/item; giữ đội trưởng tại lúc giao và lịch sử, không mất liên kết khi đổi trưởng. Nhánh duyệt/nhanh/khẩn cấp có điều kiện khác nhau.
- **Task P1/P2 liên quan:** P1-40, P1-52, P1-53; P2-40, P2-52, P2-53.
- **Tác động và giới hạn:** P2 đề xuất hình dạng Crew/cấp đội/assignment; P1 kiểm quyền membership và phạm vi. Không thêm tài khoản cho từng thành viên.

### UC-D10 — Google Maps Sprint 1

- **Vị trí:** HT02, KS17 mới, §5.12, §7, §8.1.
- **Trước:** HT02 chỉ nói bản đồ/toạ độ/tiếp cận; chưa có chuyển Google Maps và chưa có use case Operator. Sprint 1 cũ loại routing ngoài.
- **Sau:** Crew mở từ nhiệm vụ đo/sửa, xem điểm đích rồi Chỉ đường. Operator dùng điểm tiếp cận/tập kết, không tự lấy trung điểm segment. Thêm KS17; ghi Sprint 1, fallback sao chép và không đổi trạng thái khi mở Maps.
- **Task P1/P2 liên quan:** P1-12, P1-40, P1-53, P1-23; P2-21, P2-23, P2-32, P2-40, P2-53; FE.
- **Tác động và giới hạn:** P1-12/P2-21/23/32 có nền theo plan, không chứng minh endpoint điểm đích. P1 contract/phân quyền, P2 chỉ đổi schema nếu thiếu nguồn sau đối chiếu; FE mở Maps. O-04 điểm tập kết chưa chốt. Không tự kéo toàn sửa chữa/khảo sát vào Sprint 1; bổ sung nhiệm vụ tối thiểu hoặc ghi blocker trong Sprint spec kế tiếp.

### UC-D11 — GPX Sprint 1; GPS drone Sprint 2

- **Vị trí:** DA13, DA16, §5.10, §8.1.
- **Trước:** Nền DA16 thu track trước segment còn mở; Sprint 1 đã đề xuất nhập GPX thực địa.
- **Sau:** Sprint 1 nhập GPX chuẩn bị ngoài app, PM lọc/chỉnh MapLibre, Supervisor xác nhận tuyến rồi chia segment. Nguồn GPS drone tham khảo đưa Sprint 2, không tự là tim đường, không điều khiển bay. Recorder điện thoại chưa chốt.
- **Task P1/P2 liên quan:** P1-21, P2-21; P1/P2-HF-01; S1-T3/T4/T5 (mã trong spec, chưa là status P1/P2).
- **Tác động và giới hạn:** P1-21/P2-21 Done: tái sử dụng versioning và SRID; RouteCapture là delta, không viết lại nền đã có. O-03 chưa quyết định cách thu drone/ghi GPS điện thoại.

### UC-D12 — Baseline và trạng thái khảo sát theo v2

- **Vị trí:** quy tắc 18, DA10, §5.1, §6.
- **Trước:** Baseline cũ gắn cờ Survey; state request còn Hoãn.
- **Sau:** SegmentBaseline theo (segment, band), chỉ phần đủ điều kiện được xác nhận; giữ phần đạt/bổ sung phần thiếu. Hoãn thuộc kế hoạch, đổi người là lịch sử assignment.
- **Task P1/P2 liên quan:** P1-22, P1-23, P1-42; P2-22, P2-23, P2-30, P2-42; P1/P2-HF-01.
- **Tác động và giới hạn:** P2-22/23/30 Done: không tự đổi/reorder enum đã phát hành. Kiểm tra mapping/SQL backstop và dữ liệu baseline lịch sử trước migration mới.

### UC-D13 — Địa điểm thử nghiệm

- **Vị trí:** §8.1–8.2.
- **Trước:** Chưa có hai địa điểm trong use case.
- **Sau:** Thử 1 Vĩnh Long, thử 2 Bảo Lộc; không tự dùng tên địa phương để hard-code SRID/tọa độ tuyến.
- **Task P1/P2 liên quan:** P1-20, P1-21; P2-20, P2-21; dữ liệu thử P1/P2.
- **Tác động và giới hạn:** Các task nền Done theo plan; chỉ chuẩn bị config/seed sau có tuyến cụ thể. O-05 người đặt/khóa SRID và tuyến mẫu còn mở.

### UC-D14 — Truy vết và trình bày

- **Vị trí:** đầu tài liệu, §1.1, §7, §10–11.
- **Trước:** Sơ đồ ASCII; link tên cũ; thiếu nhật ký delta gắn status P1/P2.
- **Sau:** Sơ đồ Mermaid; liên kết tên file được cung cấp; bổ sung phạm vi, nguồn chưa có, ma trận trace và log này. Không sửa hai plan hay log Done cũ.
- **Task P1/P2 liên quan:** P1/P2 phụ trách đồng bộ tài liệu sau; không tạo task ID thực thi mới.
- **Tác động và giới hạn:** Hai plan áp dụng workflow nhẹ từ 20/09, trong khi template/Sprint spec cũ còn review/negative-first bắt buộc. Ghi xung đột để lần sửa workflow sau đối chiếu AGENTS/current workflow; không tự khôi phục gate cũ.

## 4. Snapshot trạng thái theo hai plan được cung cấp

Nguồn: `RoadGuard_Plan_Person_1.md` và `RoadGuard_Plan_Person_2.md`, mục Current status. Bảng này chỉ giữ các task liên quan đến đợt; không đổi hoặc xác nhận lại trạng thái. Task có dòng ở Wave nhưng thiếu dòng Current status được ghi “không có status riêng”, tuyệt đối không tự gán Done/Not started.

| Owner | Task | Status theo plan | Cách dùng cho delta |
|---|---|---|---|
| P1 | P1-10 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P1 | P1-11 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P1 | P1-12 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P1 | P1-20 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P1 | P1-21 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P1 | P1-72 | In Progress | Giữ nguyên trạng thái; không nhận hoàn tất từ UseCase mới. |
| P1 | P1-70 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P1 | P1-HF-01 | Proposed | Giữ nguyên trạng thái; không nhận hoàn tất từ UseCase mới. |
| P1 | P1-13 | Not started | Giữ nguyên trạng thái; không nhận hoàn tất từ UseCase mới. |
| P2 | P2-04 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P2 | P2-05 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P2 | P2-06 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P2 | P2-07 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P2 | P2-HF-01 | Proposed | Giữ nguyên trạng thái; không nhận hoàn tất từ UseCase mới. |
| P2 | P2-13 | Not started | Giữ nguyên trạng thái; không nhận hoàn tất từ UseCase mới. |
| P2 | P2-11 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P2 | P2-21 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P2 | P2-22 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P2 | P2-23 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P2 | P2-30 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P2 | P2-31 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P2 | P2-32 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P2 | P2-02 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P2 | P2-10 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |
| P2 | P2-20 | Done | Giữ Done lịch sử; đối chiếu lại phần bị delta tác động, không làm lại toàn task. |

Các P1-22/23/30/31/32/40/41/42/50/51/52/53/60/64 và P2-40/41/42/50/51/52/53/60/64 được tham chiếu theo dòng phạm vi trong plan, **không có status riêng tại bảng Current status đã đọc**. P1-72 đang In Progress là umbrella, không đủ để coi từng endpoint phụ Done.

Điểm tích hợp đáng lưu ý theo plan (chưa kiểm tra Git): P2-30 ghi đã merge develop `6fd07a3`; P2-31 ghi push `56f677b` lên huy; P2-32 ghi `7395e41`, push huy và fast-forward develop. Không đồng nhất các bằng chứng này với checkout hiện tại của người nhận việc.

## 5. Các quyết định còn mở

| ID | Cần chốt | Đã chốt và không cần hỏi lại |
|---|---|---|
| O-01 | Có được bắt đầu Fast Track hoàn toàn offline khi chưa có kết quả server? Nếu có, quyền cấp trước/policy cache/phiên bản/hạn mức xử lý thế nào? | Crew được tự sửa lỗi LOW đạt policy không chờ PM/Supervisor duyệt trước. Ảnh/số đo đã xếp hàng tự upload khi có mạng. |
| O-02 | Ai đóng toàn IncidentCase chỉ gồm Fast Track? Hồ sơ có nhiều nhánh thì đóng thế nào? | PM đóng từng lỗi Fast Track sau kiểm tra, Supervisor nhận thông tin; không đóng hồ sơ còn lỗi bắt buộc chưa đạt. |
| O-03 | Có recorder GPS điện thoại không? Thu GPS drone Sprint 2 bằng tệp hay cơ chế khác? | GPX bên ngoài → import Sprint 1; nguồn GPS drone dựng tuyến Sprint 2. |
| O-04 | Ai đặt/sửa điểm tập kết Operator, nguồn dữ liệu nào? | Google Maps Sprint 1 cho Crew/Operator, không tự lấy trung điểm segment. |
| O-05 | Tuyến/tọa độ mẫu cụ thể, ai cấu hình SRID và lúc nào khóa? | Vĩnh Long thử thứ nhất, Bảo Lộc thử thứ hai; hỗ trợ UTM theo dự án. |

Các điểm mở chỉ giới hạn phần tương ứng; không trì hoãn việc đồng bộ tài liệu cho các quyết định đã chốt. Không mặc định chủ dự án đã chấp nhận đề xuất “phải online mới sửa” vì câu trả lời số 3 để trống.

## 6. Danh sách đồng bộ tiếp theo — chưa thực hiện

| Tài liệu/owner | Thay đổi cần tiếp tục | Mã liên quan |
|---|---|---|
| Design v2 | Sửa D-02 theo quyền chọn PM; gỡ prerequisite PM VERIFIED trước Fast Track; thống nhất policy/đóng lỗi và phân kỳ navigation/GPX | UC-D02–D04, D07, D10–D11 |
| User Stories | Sửa US-04/08/11/12/13/14/20 và ma trận; thêm nội dung US-21–26/28–32 còn thiếu theo scope; thêm AC navigation KS17/HT02; giữ ID lịch sử | UC-D02–D12 |
| Domain Model / Data Dictionary / ERD — P2 shape, P1 domain | Tách policy eligibility khỏi PM verification; kiểm FK/constraint hiện có, Crew, per-item approval, state nhánh, source task XOR và history; không tự chọn enum hoặc migration khi chưa xem checkout | UC-D04, D06–D09, D12 |
| Sprint 1 spec | Thêm navigation kèm dependencies/FE contract; GPX ngoài app; GPS drone Sprint 2; địa điểm thử; sửa trace và gỡ workflow cũ không phù hợp | UC-D10–D14 |
| Hai plan P1/P2 | Chỉ bổ sung delta dưới hotfix/nhóm mới sau chốt scope, map dependency; giữ nguyên mọi dòng Done và worklog bằng chứng cũ | Tất cả |
| Template/workflow | Đối chiếu AGENTS và workflow hiện hành; hai plan ghi workflow nhẹ từ 20/09, không tự áp negative-first/independent review từ template cũ | UC-D14 |

Thứ tự đề xuất cho triển khai sau này: chốt contract nghiệp vụ và O-01/O-02 phần liên quan → P2 kiểm/migrate phần schema thật sự thiếu → P1 dùng schema đã có trong checkout để sửa API/service → FE nối contract → kiểm chứng phạm vi thay đổi. Không triển khai code trong đợt này. Không tái dùng task ID retired hoặc tự đánh dấu delta là Done backend.

## 7. Kiểm chứng tài liệu của đợt

- Đã đọc UseCase, các tài liệu nền đã cung cấp và hai bảng Current status/ownership P1/P2.
- Rà kịch bản: báo cáo ban đầu nghiêm trọng nhưng đo LOW đạt policy; LOW vượt policy; cụm lỗi nhỏ có kế hoạch đo; ảnh trước/sau upload muộn; PM đóng Fast Track không chờ Supervisor; REJECT phương án giữ lỗi; APPROVED item không chờ phần bị trả; navigation không đổi trạng thái; GPX/drone đúng sprint; bảo toàn nghiên cứu và dữ liệu lịch sử.
- Kiểm tra tĩnh: mã chức năng cũ không bị xóa, KS17 được thêm duy nhất; không còn quy tắc duyệt cả đợt/PM đóng lỗi Fast Track phải chờ Supervisor; các section và bảng Markdown có cấu trúc hợp lệ; phần Research Validation không đổi.
- Không chạy build/test API/SQL/Android, không truy cập repository, không thay migration hoặc status; các kết quả test trong plan chỉ là bằng chứng lịch sử đã đọc.
- Các link tới tệp được cung cấp được đối chiếu tên; các nguồn ADR/Incident/AI-Edge chưa cung cấp vẫn được ghi là tham chiếu chưa kiểm chứng, không tự tạo nội dung thay thế.

## 8. Dấu vết nội dung

SHA-256 dưới đây xác định đúng bản đầu vào/UseCase đầu ra của đợt để tránh nhầm bản khi giao P1/P2. Đây không phải chữ ký hoặc bằng chứng chạy backend.

| Tệp | Vai trò | SHA-256 |
|---|---|---|
| UseCase.md | Trước sửa | `ede07a32b34d1d58600236a20fa1aa80ec85d91dc9c8ec5f931f18428da978cc` |
| RoadGuard_Plan_Person_1.md | P1 nguồn trạng thái | `4a02b61b78210163acf1f972c71b547e628baad9ea3cfafa4fd121b68cb8728a` |
| RoadGuard_Plan_Person_2.md | P2 nguồn trạng thái | `cdfb8afe44ba98ffe82d3b7fae989031c3738728fb7a86d881825343376e7f7d` |
| UseCase.md | Sau sửa UC-2026-09-24-R1 | `99709c554e255a8a673ecf9149ce7b8122d5f72ebe81ab445009b8d6fbe41782` |

## 9. Lịch sử các đợt tiếp theo

Các đợt dưới đây bổ sung/thay thế đúng phần được nêu; giữ nguyên snapshot R1. Không coi việc cập nhật tài liệu là backend đã làm xong delta.


### 9.1 UC-2026-09-26-R2 — Policy cho Crew và dựng hình học đường

**Nguồn:** chủ dự án xác nhận ngày 26/09/2026: có bộ policy riêng để Crew sửa ngay vết nứt nhỏ/không nghiêm trọng; Supervisor khởi tạo dự án, PM nhập tọa độ tim đường và bề rộng; backend tạo dữ liệu hiển thị đường mới trên MapLibre; thêm khoảng 1–2 m mỗi bên để hỗ trợ drone lệch ngang/kiểm tra mép.

**Phạm vi thực hiện:** cập nhật UseCase và chính log này. Không sửa code, migration, P1/P2 plan hay các tài liệu khác. Không có checkout mới, không kiểm tra lại trạng thái backend; snapshot R1 tiếp tục chỉ là trạng thái theo các plan đã cung cấp.

| Mã mới | Bổ sung/thay thế | Vị trí UseCase | Trước → sau |
|---|---|---|---|
| UC-D15 | Làm rõ UC-D04, không thay quyền PM đóng ở UC-D07 | Quy tắc 20–21, TN03, §5.11, O-01 | Policy chung chưa rõ đối tượng → bộ policy riêng cho Repair Crew sửa ngay vết nứt nhỏ đạt điều kiện. Dùng tên FastTrackPolicy hiện có, không tự thêm bảng thứ hai. Severity LOW chưa đủ nếu không đạt các điều kiện khác. |
| UC-D16 | Sửa trách nhiệm nhập hình học của DA02; bổ sung UC-D11 | §1.2, quy tắc 3, DA01–DA02/DA13, §5.1, §5.10, §5.13 | Còn câu Supervisor nhập GPS → Supervisor tạo dự án/giao PM; PM nhập/chỉnh tim đường và bề rộng. Giữ quyền Supervisor xác nhận version đã có, không suy PM nhập là PM tự công bố tuyến. |
| UC-D17 | Mở rộng UC-D11 về hình học hiển thị | Quy tắc 22–23, DA02/DA13, §5.13 | Polyline + bề rộng chưa có hành vi dựng mặt đường rõ → backend dựng polygon mặt đường và vùng mở rộng, trả GeoJSON WGS84; MapLibre vẽ overlay RoadGuard cho đường mới chưa có trên nền. |
| UC-D18 | Bổ sung phạm vi KS15/KS16 và hình học khảo sát | KS15–KS16, §5.13 | Chưa có vùng mở rộng hai bên được mô tả cụ thể → khoảng 1–2 m từ từng mép ra ngoài; giữ riêng vùng mặt đường, mở rộng, corridor bay và coverage thực nhìn thấy. Không coi vùng này là chống gió hoặc bằng chứng đủ phủ. |

**Chi tiết đầu vào/đầu ra để P1/P2 không phải so bản cũ:**

- Đầu vào nghiệp vụ: dự án đã có Supervisor tạo/PM được giao; polyline tim đường theo thứ tự; bề rộng mặt đường; chiều lý trình; độ mở rộng khảo sát mỗi bên. GPX ngoài app vẫn thuộc Sprint 1; GPS drone tham khảo vẫn Sprint 2.
- Backend làm hình học theo mét trong CRS kỹ thuật dự án rồi trả GeoJSON WGS84. Không tạo thêm “GPS thực đo”; các polygon là hình học suy ra có nguồn/tham số/version.
- Ví dụ đối xứng bề rộng đều 8 m: mặt đường ±4 m từ tim. Thêm 1 m ngoài mỗi mép → vùng tổng ±5 m, rộng 10 m; thêm 2 m → ±6 m, rộng 12 m. Đây là mặt cắt đoạn thẳng, không quy định kiểu nối góc/đầu-cuối polygon.
- Overlay trên MapLibre không cập nhật nền bản đồ hay Google Maps. Một đường nhìn thấy trong RoadGuard chưa chứng minh Google Maps có thể định tuyến theo đường đó.
- PM phải xem/chỉnh hình học sinh ra. Đổi bề rộng hoặc margin trên dữ liệu đã xác nhận phải giữ lịch sử/version; không tái sinh rồi ghi đè phạm vi job/survey cũ.
- Policy riêng cho Crew không tự đồng nghĩa tạo hai policy trùng nhau: tái sử dụng FastTrackPolicy theo v2, phân biệt với SeverityRuleVersion. Ngưỡng “nhỏ/không nghiêm trọng”, điều kiện áp dụng và version cần cấu hình/ban hành; không tự gán số.

**Ma trận tác động P1/P2:**

| Owner | Task nền liên quan | Việc phải đối chiếu / delta | Bằng chứng cần có khi triển khai, chưa chạy ở R2 |
|---|---|---|---|
| P1 | P1-20, P1-21 (Done theo snapshot R1), P1-12 | Tách tạo dự án Supervisor, nhập/chỉnh tuyến nháp PM, xác nhận version Supervisor; endpoint hiện có không được mở toàn quyền tạo version cho PM chỉ để đáp ứng nhập GPS. Contract preview tim/bề rộng/margin và geometry output. | Kiểm role/membership, nháp/xác nhận, tọa độ đảo, CRS, độ rộng polygon và retry/version. |
| P2 | P2-20, P2-21 (Done theo snapshot R1) | Kiểm RoadSectionVersion/RouteCapture, bề rộng, margin trái/phải và cách lưu/tái tạo geometry; tận dụng version/SRID đã có. Nếu thiếu thì migration mới có ghi chú dữ liệu cũ; chưa ấn định tên cột/schema trong UseCase. | Geometry/CRS hợp lệ, thông số hợp lệ, version cũ giữ nguyên, cách tái hiện hình học và migration khi thực sự cần. |
| P1 | P1-22/23/30/31/42; P1-HF-01 | Phân biệt vùng mở rộng khảo sát với hành lang bay/coverage; giao đúng segment/band, trả lớp hình học và nguồn cho FE. | Trong vùng nhưng không thấy mép vẫn thiếu coverage; lệch tim có chủ đích không tự là lỗi GPS. |
| P2 | P2-22/23/30/31 (Done theo snapshot R1); P2-HF-01 | Snapshot đúng geometry/phiên bản phạm vi của survey/job; không tự thay hình học lịch sử khi PM đổi bề rộng/margin. | Query/snapshot đúng phiên bản và nguồn; band/coverage không bị thay bằng phép kiểm point-in-polygon. |
| P1 | P1-40/41/50/53/64 | Hiển thị/áp dụng bộ policy Crew, ghi điều kiện và lý do đạt/không đạt; không thêm gate PM duyệt trước Fast Track. | Lỗi nhỏ đạt → sửa, ảnh trước/sau → PM kiểm/đóng; vượt policy → báo PM; không tự đóng khi upload. |
| P2 | P2-05/32 (Done theo snapshot R1), P2-40/41/50/53/64 | Kiểm hình dạng policy/version/evaluation, liên kết phép đo/bằng chứng và hạn mức; không tạo policy trùng hoặc sửa số enum cũ. | Snapshot policy truy vết được; chặn thiếu căn cứ; không giả bằng chứng runtime từ tài liệu. |
| FE | Ngoài hai owner backend | Form PM nhập tim/bề rộng/margin, MapLibre vẽ các lớp và preview; Crew xem bộ policy, ghi bằng chứng/hàng đợi. | Đường mới hiển thị dù nền trống; lớp mặt đường và mở rộng không lẫn; không tuyên bố nghiệm thu FE từ BE tests. |

**Điểm còn mở sau R2:** O-01 được làm rõ rằng policy dành riêng Crew, nhưng chưa chốt cơ chế thực thi hoàn toàn offline/đồng bộ hạn mức. O-02 (đóng toàn Case), O-03 (recorder điện thoại/cách lấy track drone), O-04 (điểm tập kết), O-05 (tuyến mẫu/SRID) giữ nguyên. Chi tiết hình học biến thiên bề rộng, góc cua/đầu-cuối, tính lại hay lưu polygon do P1/P2 đề xuất ở bước contract; không tự ban hành như quyết định chủ dự án. Quyền Supervisor xác nhận tuyến được giữ từ R1/v2 vì phát biểu mới chỉ đổi người nhập dữ liệu.

**Các tài liệu cần đồng bộ kế tiếp:** User Stories US-03/24/30/31 và AC nhập tuyến (đối chiếu ID story thực tế), Domain Model, Data Dictionary, ERD, Design v2 D-12/FastTrackPolicy và Sprint 1 T3/T4; cập nhật bằng UC-D15–D18, không thay status Done P1-20/21 hay P2-20/21 từ tài liệu này.

**Kiểm chứng tài liệu R2:** giữ đủ 127 mã chức năng của R1 (gồm KS17), không đổi phần nghiên cứu RS01–RS06; rà trách nhiệm Supervisor/PM ở actor, DA01/DA02/DA13, §5.1/5.10/5.13; kiểm ví dụ 8 m + 1/2 m và thứ tự tọa độ; rà phân biệt footprint/coverage/corridor; kiểm bảng Markdown và giữ nguyên §1–8 log R1. Chưa chạy API, SQL hoặc MapLibre; không cập nhật trạng thái triển khai.

**Dấu vết R2 (SHA-256):**

| Tệp | Vai trò | SHA-256 |
|---|---|---|
| UseCase.md | Đầu vào R1 | `99709c554e255a8a673ecf9149ce7b8122d5f72ebe81ab445009b8d6fbe41782` |
| RoadGuard_UseCase_Change_Log.md | Log trước R2 | `7a448ca1d387dfb315335719e4e6901249188480efe270e3f1720c5fb975c72d` |
| UseCase.md | Đầu ra R2 | `b636476d0c5255893545fb9d158d12e45c6e7c2c421b12e1a74e8e9ed73802f3` |

### 9.2 DOC-2026-09-26-R3 — Đồng bộ bộ đặc tả và Data Dictionary

**Phạm vi được mở rộng theo yêu cầu tiếp theo:** mô tả dự án; nghiên cứu công nghệ BE/FE/AI; FRD/SRS; sửa UseCase và User Stories + Acceptance Criteria trực tiếp; To-Be Process; Business Rules; sửa Data Requirements / Data Dictionary trực tiếp. Đợt này chỉ sửa tài liệu. Giữ nguyên §1–9.1 và snapshot Done của P1/P2. Các câu “chưa thực hiện” ở §6 là lịch sử R1, không mô tả kết quả R3.

**Ưu tiên quyết định:** R3 thay phần mâu thuẫn R1/R2. Đặc biệt UC-D03/04 của R1 không còn được hiểu rằng một đợt gom đo có thể tự sửa lỗi nhỏ cùng chuyến: quyết định mới nhất là **đợt nhiều lỗi chỉ đo, PM phân công sửa sau**. Một lỗi nhỏ riêng lẻ được PM giao đo-và-sửa vẫn Fast Track cùng chuyến khi policy đạt. Ngoại tuyến không giới hạn thời gian tác nghiệp. Không tự thêm bước Supervisor duyệt Fast Track.

#### 9.2.1 Tệp và cách đọc ghi chú

| Tệp | Loại thay đổi | Kết quả / mục đích |
|---|---|---|
| [RoadGuard_Mo_Ta_Chi_Tiet_Du_An.md](../01_Overview/01_Project_Overview.md) | Tạo mới | Tổng hợp quyết định, ví dụ nghiệp vụ, hình học và Q01–Q18; 23 phần. |
| [RoadGuard_FRD_SRS.md](../02_Requirements/01_FRD_SRS.md) | Tạo mới | 37 FR, 14 NFR, dữ liệu/gate/trace; phụ lục công nghệ BE/FE/AI dựa trên tài liệu chính thức, chưa bắt buộc thay stack. |
| [UseCase.md](../02_Requirements/04_Use_Cases.md) | Thay nội dung cùng file | R3, ghi THÊM/THAY THẾ/BỎ tại chỗ; giữ mã chức năng cũ, thêm 7 chức năng. |
| [User_Stories_Acceptance_Criteria.md](../02_Requirements/05_User_Stories_Acceptance_Criteria.md) | Thay nội dung cùng file | 41 story có thân; giữ US-01–27, bổ sung thân US-21–26 vốn mới có trace; giữ ý nghĩa US-28–32 theo Sprint, thêm US-33–41. |
| [RoadGuard_To_Be_Process.md](../02_Requirements/03_To_Be_Process.md) | Tạo mới | PF-01–11; 8 flowchart và bảng luồng hỗ trợ/ngoại lệ. Flowchart, không nhận là BPMN 2.0 thực thi. |
| [RoadGuard_Business_Rules.md](../02_Requirements/02_Business_Rules.md) | Tạo mới | 48 BR có trạng thái quyết định, điều kiện kiểm chứng và trace. |
| [Data_Dictionary.md](../03_Data/01_Data_Dictionary.md) | Thay nội dung cùng file | Inline notes DD-C01–20, field/type/null/FK, §9 schema đề xuất, §10 DR và migration strategy, §11 trước/sau, §12 điểm mở. |
| [RoadGuard_UseCase_Change_Log.md](02_Use_Case_Change_Log.md) | Nối tiếp file này | Log chung, không tạo log thứ hai hoặc viết lại lịch sử Done. |

**Nhãn:** CHỐT = quyết định chủ dự án; KẾ THỪA = yêu cầu nền còn giữ; ĐỀ XUẤT = cần review/chốt; TBD = không được developer tự chọn quyền/ngưỡng. BỎ nghĩa ngừng áp dụng quy tắc được chỉ rõ, không xóa hồ sơ nghiệp vụ hoặc bằng chứng cũ.

#### 9.2.2 Delta nghiệp vụ, trước → sau và P1/P2

| Mã | Trước / phần bị thay | Sau R3 / vì sao | P1 cần đối chiếu | P2 cần đối chiếu |
|---|---|---|---|---|
| UC-D19 | Ticket/notification/Defect dễ bị đồng nhất; gần GPS có thể bị gộp | Giữ nguồn report và ảnh riêng, đề xuất IncidentCase làm ticket; 5 người cùng lỗi không tạo 5 việc; gợi ý 1–2 m chưa tự gộp | Intake/triage/ownership/dedup | Quan hệ report-case-defect, audit merge/tách |
| UC-D20 | Severity chưa tách urgency và thứ tự PM | Hai chiều phân cấp; PM quyết định chính thức; gợi ý không tự sắp hay giao Crew | DTO/grade/priority/plan | Field/PM decision history/sequence |
| UC-D21 | Đợt gom đo có thể được hiểu sửa ngay phần nhỏ | D02: đợt nhiều lỗi MEASURE_ONLY; PM giao task sửa riêng sau đo, có thể Fast Track nếu đủ policy; không hồi tố mode | Task-mode gate, batch review | Batch-task relation, snapshots |
| UC-D22 | Policy do Supervisor hoặc Crew có thể tự hạ mức PM | PM lập policy; lỗi PM nghiêm trọng chặn Crew tự sửa; lỗi ngoài nhiệm vụ chỉ ghi nhận; chuẩn bị vật tư/dụng cụ | Policy/evaluation/authorization | Version policy, PM block, preparation data |
| UC-D23 | Offline chưa chốt hoặc gate server trước sửa | Không giới hạn thời gian tác nghiệp offline; giữ nhiệm vụ/policy tải; conflict/revocation Q04 | Sync idempotency/conflict/API | Operation log/checksum/snapshot |
| UC-D24 | Ảnh BEFORE buộc chụp mới hoặc thiếu ảnh đo có thể ghi lý do | Fast Track tái dùng citizen/drone BEFORE; ngoài Fast Track đo cần ảnh/số liệu, thiếu phải đo lại; không AFTER giả BEFORE | Evidence gate/validation | Source/attempt/file references |
| UC-D25 | Supervisor đóng mọi lỗi; sửa lại/tái phát lẫn nhau | PM đóng Fast Track và báo; hỗn hợp đủ nhánh Supervisor đóng tổng; attempt khác recurrence | Review/close/rework services | Attempt/review/relation/history |
| UC-D26 | Bề rộng/padding chưa rõ; tuyến như một đường đơn | Bề rộng từng khoảng, 8→10 m/corridor tổng12 m; network nhiều nhánh, version/CRS rõ | Geometry import/edit/confirm | Width/corridor/network version |
| UC-D27 | Segment hoặc tấm có thể thành đơn vị nghiệm thu | Tuyến/segment quản lý, tấm định vị, lỗi nghiệm thu, workgroup gom sửa; 4 m là ví dụ | Mapping/search/UI contracts | Slab versions and many-to-many links |
| UC-D28 | Bay/SRT trong vùng dễ đồng nghĩa coverage đủ | Mạng chặng; chọn thứ tự theo thực tế, không mặc định main-first; đề xuất position/coverage tách riêng Q11 | Flight/quality/AI adapter | Corridor snapshot/assessment/manifest |
| UC-D29 | Story có trace nhưng thiếu thân, nhiều tài liệu chưa đồng bộ | Bổ sung FR/BR/PF/US; đánh dấu thay thế trực tiếp; giữ TN12 thực sự có trong UC | Contract/AC review | Dictionary/constraint review |
| UC-D30 | DD thiếu biểu diễn các quyết định R3 | Sửa tại entity cũ, thêm schema đề xuất và 20 DD delta có lý do; không tạo trùng field/entity đã có | P1 review data requirements | P2 review schema/backfill/index |

**Chức năng UseCase thêm:** DA17 (mạng tuyến), DA18 (tấm), TN07 (đợt đo), SC13 (policy), SC14 (phân cấp/thứ tự), PA08 (tái phát/sửa lại), KS18 (bay mạng nhánh). Giữ TN12 là từ chối nhiệm vụ trước tiếp nhận. Nhận xét trước đây cho rằng TN12 không tồn tại **không đúng với file nguồn đã đọc**; không bỏ mã này. Không đổi số enum hoặc đánh số lại function/story cũ.

**Kế thừa đã có, không khai là thiếu:** `Project.engineering_utm_srid`, `RoadSectionVersion.station_origin_m`, `RepairApprovalDecision` tồn tại trong Data Dictionary nguồn. R3 làm rõ/mở rộng, không thêm bảng/cột trùng. Cờ baseline Survey được chuyển vai trò legacy/tổng hợp, nguồn đích theo segment/band.

#### 9.2.3 Cách bàn giao cho backend đang làm

1. P1/P2 đọc delta trước/sau và §9–12 Data Dictionary. So với repository/migration thực tế trước khi nhận task. Không gán “chưa làm” chỉ vì tài liệu mới, không gán “đã có” chỉ vì plan cũ Done.
2. P1 review nhánh quyền, input/output, state transition và lỗi nghiệp vụ; P2 review entity/enum/FK/null/index/migration. Thống nhất handoff contract rồi mới đổi code. FE kiểm task-mode/policy/offline/Maps và hiển thị trạng thái dữ liệu chưa sync.
3. Các bảng/cột R3 là thiết kế đề xuất; trường mới chưa biết không được backfill thành LOW, đủ policy, đạt nghiệm thu, GPS giả hoặc ảnh BEFORE giả. Giữ enum numeric đã phát hành và nguồn bằng chứng cũ.
4. Không chốt ngầm Q01–Q18 để làm AC xanh. Phần độc lập có thể triển khai; gate quyền/nghiệm thu còn TBD cần quyết định trước triển khai phần đó.
5. Đưa delta thành task mới hoặc điều chỉnh task sau khi đối chiếu; không sửa hồi tố trạng thái Done trong hai plan nguồn. Không tạo DDL thủ công song song migration mà thiếu nguồn chuẩn.

#### 9.2.4 Kiểm tra tài liệu và giới hạn

- Đối chiếu mã chức năng trước/sau để giữ chức năng cũ; kiểm đủ US-01–41, FR-01–37, BR-01–48, các bảng Markdown và hàng rào Mermaid/code.
- Rà mâu thuẫn PM/Supervisor, batch chỉ đo, offline, BEFORE, vật tư chuẩn bị và vai trò tấm; sửa trực tiếp tại chỗ thay vì chỉ viết thêm phụ lục trái với nội dung cũ.
- Công nghệ trong FRD là khảo sát tài liệu chính thức và đề xuất PoC, không phải benchmark, tích hợp đã chạy hoặc đánh giá pháp lý giấy phép hoàn chỉnh.
- Chưa chạy kiểm thử phần mềm, chưa xác minh repository, chưa migrate DB, chưa đo thực địa, chưa xác nhận tiêu chuẩn TCVN được dán. Các số 4 m/12 m/1–2 m mang vai trò riêng được ghi rõ, không thành chuẩn chung.
- Điểm mở dùng Q01–Q18 thống nhất; không ghi lại quyết định đã chốt như “offline có giới hạn hay không”.


### 9.3 DOC-2026-09-26-R3-HANDOFF — Hoàn tất bàn giao tài liệu

- Kiểm tra bản R3 đã lưu và giữ nội dung nghiệp vụ, mã yêu cầu, trạng thái CHỐT/ĐỀ XUẤT/TBD. Không coi yêu cầu “continue” là quyết định cho Q01–Q18.
- Sửa đường dẫn tương đối giữa các tài liệu R3 theo cấu trúc file hiện có; giữ tham chiếu nguồn lịch sử chưa có trong gói, không tự tạo nội dung nguồn thay thế.
- Thêm `RoadGuard_Documentation_Index.md`: thứ tự đọc, phạm vi từng tài liệu, nhóm quyết định còn mở và điều kiện bàn giao P1/P2/FE/AI.
- Đóng gói tám tài liệu R3 và mục lục vào ZIP, giữ cấu trúc thư mục để liên kết nội bộ hoạt động sau giải nén. Hai plan P1/P2, Domain Model, ERD, Design v2 và Sprint spec không được sửa trong đợt bàn giao này.
- Kiểm tra tự động: đủ 37 tiêu đề FR, 48 BR và 41 US, không thiếu hoặc trùng ID trong từng nhóm; đủ DR-01–16 và DD-C01–20 trong Data Dictionary; hàng rào code đóng đủ. Các kiểm tra này là kiểm tra tài liệu, không chứng minh tính năng đã chạy hoặc mọi yêu cầu đã được nghiệm thu.
- Chưa kiểm chứng lại toàn bộ nguồn công nghệ bên ngoài trong bước bàn giao; phần nghiên cứu và ngày tra cứu được giữ từ FRD R3. Chưa thay code, migration, trạng thái Done hoặc quyết định nghiệp vụ.

## V2(3) amendment — 2026-09-28

This document follows `planning/V2/V2-3_DECISION_REGISTER.md`. D01-D28 are approved business decisions; `APPROVED_PILOT_CONFIG` and `APPROVED_TARGET` are not empirical verification. The document must distinguish `contractStatus`, `implementationStatus`, and `verificationStatus`. Reporter email/password plus one-time email OTP is the approved authentication flow; web cookie transport, pilot limits, retention and performance values remain configuration/target registers. Fast Track uses measurement-only intake followed by a separately authorized PM repair task; policy framework, reopen, partial publication, handover/conflict, BEFORE incident, curing and traffic release remain explicit contracts. Offline evaluation and AI two-stage processing are proposed until schema, fixtures and runtime/provider evidence pass.
