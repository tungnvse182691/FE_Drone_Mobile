# Kế Hoạch & Bộ Prompt Chỉnh Sửa `RoadGuard_Wireframes` Khớp Với Đặc Tả Mới `27_9_V3`

> **Mục Đích:** 
> Hướng dẫn Antigravity IDE thực hiện rà soát và chỉnh sửa trực tiếp các tệp trong thư mục **`D:\Do_AN_Drone\RoadGuard_Wireframes`** (gồm [Wireframe_Specification.md](file:///D:/Do_AN_Drone/RoadGuard_Wireframes/Wireframe_Specification.md) và [index.html](file:///D:/Do_AN_Drone/RoadGuard_Wireframes/index.html)) để chuẩn hóa 100% theo bộ tài liệu đặc tả mới do Nhóm trưởng ban hành tại **`D:\Do_AN_Drone\27_9_V3`**.
>
> **Kỷ Luật Bắt Buộc:**
> - Giữ nguyên tính toàn vẹn của mã HTML và CSS nguyên mẫu.
> - Sau khi thực thi xong mỗi Phase, AI **bắt buộc phải ghi chép kết quả nghiệm thu vào một file `.md` mới** trong thư mục [docs/worklogs/](file:///D:/Do_AN_Drone/FE_AppMobile/docs/worklogs/).

---

## BẢNG ĐỐI CHIẾU CÁC ĐIỂM CẦN FIX TRONG `RoadGuard_Wireframes` THEO `27_9_V3`

| # | Hạng mục cần sửa | Hiện trạng trong `RoadGuard_Wireframes` | Chuẩn hóa theo `27_9_V3` của Nhóm trưởng | Tệp bị ảnh hưởng |
|---|---|---|---|---|
| 1 | **Phân định Nền tảng** | Đánh đồng cả 44 màn hình là "Ứng dụng Di động" (Mục 1.1, 1.5). | Tách bạch rõ ràng: **23 màn hình Mobile App hiện trường** (Crew, Drone, Reporter, Auth) và **21 màn hình Web Dashboard** (PM, Supervisor). | `Wireframe_Specification.md`, `index.html` |
| 2 | **Mã Use Case Drone** | Dùng tiền tố lạ `KB01`..`KB07` (không có trong nguồn). | Remap 100% sang mã chuẩn **`KS01`..`KS07`** (Khảo sát Drone) theo `02_Requirements/04_Use_Cases.md`. | `Wireframe_Specification.md`, `index.html` (`screensMeta`) |
| 3 | **13 Use Case bị thiếu** | Chưa có trong ma trận wireframe (`AI15..17`, `CN10`, `DA13..16`, `HT15`, `KS14..16`, `TN12`). | Bổ sung đầy đủ 13 mã vào Ma trận truy vết, phân định rõ màn hình phụ trách (Web vs Mobile). | `Wireframe_Specification.md` (Phần IV) |
| 4 | **Fast Track & Task Mode** | Chưa làm rõ điều kiện kích hoạt và chế độ công việc. | Bổ sung `TaskMode` (`INSPECT_AND_REPAIR` vs `MEASURE_ONLY`), ngưỡng policy ($S \le 1.0\text{ m}^2$, $h \le 5\text{ cm}$, $L \le 2.0\text{ m}$), và ảnh BEFORE. | `Wireframe_Specification.md`, `index.html` (`M-CREW-02/03`) |
| 5 | **Thẩm quyền nghiệm thu Fast Track** | Chưa rõ vai trò duyệt Fast Track. | **BR-25:** PM trực tiếp nghiệm thu và đóng lỗi Fast Track; **Supervisor KHÔNG phê duyệt Fast Track**. | `Wireframe_Specification.md`, `index.html` (`M-CREW-09`, `M-PM-13`) |
| 6 | **Tái sử dụng ảnh bằng chứng** | Yêu cầu chụp ảnh mới. | **BR-17, BR-18:** Cho phép tái sử dụng ảnh Reporter/Drone làm ảnh BEFORE nếu khớp vị trí khuyết tật. | `Wireframe_Specification.md`, `index.html` (`M-CREW-03/06`) |
| 7 | **Dẫn đường WGS84 cho Drone** | Chỉ vẽ điều hướng chung chung. | **US-40, BR-38:** Drone dẫn đường tới **Điểm tiếp cận / Điểm tập kết cất-hạ cánh (Access Point)**, không dẫn vào tim đường. | `Wireframe_Specification.md`, `index.html` (`M-DRONE-03`) |
| 8 | **Nạp dữ liệu Drone thẻ nhớ SD** | Tải video đơn thuần. | **FR-27, KS06/07:** Bắt buộc nhập Video 4K RGB kèm **tệp phụ đề định vị GPS (`.SRT`)**. | `Wireframe_Specification.md`, `index.html` (`M-DRONE-04`) |
| 9 | **Năm dữ liệu mẫu** | Một số chỗ hiển thị năm 2023, 2025. | Chuẩn hóa toàn bộ mốc thời gian sang năm **2026** (thời điểm ban hành dự án R3). | `Wireframe_Specification.md`, `index.html` |
| 10 | **Tài nguyên ảnh lỗi** | Tham chiếu `placeholder_ortho.jpg` (bị vỡ ảnh). | Thay bằng SVG placeholder nội tuyến hoặc ảnh vệ tinh hợp lệ. | `index.html` |

---

## BỘ 5 PROMPT HOÀN CHỈNH CHO ANTIGRAVITY IDE THỰC THI

---

### PROMPT 1: Phân Định Rõ Nền Tảng (Mobile Field vs Web Dashboard) & Sửa Dữ Liệu Thời Gian 2026

```markdown
### NHIỆM VỤ: Phân định Nền tảng (Mobile vs Web) và Chuẩn hóa Dữ liệu trong thư mục RoadGuard_Wireframes

Bạn đang làm việc trên thư mục `D:\Do_AN_Drone\RoadGuard_Wireframes\`.
Theo bộ tài liệu đặc tả chuẩn mới nhất của Nhóm trưởng tại `D:\Do_AN_Drone\27_9_V3` (`01_Overview/01_Project_Overview.md` và `09_Frontend/01_FE_Scope_Implementation_Guide.md`), hệ thống RoadGuard Hoàng Hải phân định nền tảng rõ ràng:
- **Mobile App (Field App):** Dành riêng cho 3 vai trò hiện trường: `REPAIR_CREW`, `DRONE_OPERATOR`, `REPORTER` cùng tầng Xác thực Auth (tổng cộng 23 màn hình).
- **Web Dashboard (Management Portal):** Dành cho 2 vai trò quản lý: `PROJECT_MANAGER` (PM - 14 màn hình) và `SUPERVISOR` (Giám sát viên - 7 màn hình).
Hiện tại, tài liệu `Wireframe_Specification.md` đang gọi chung tất cả 44 màn hình là "Ứng dụng Di động" gây hiểu nhầm về kiến trúc hệ thống.

#### Các bước thực hiện:

1. **Chỉnh sửa `D:\Do_AN_Drone\RoadGuard_Wireframes\Wireframe_Specification.md`:**
   - Cập nhật lại Mục 1.1: Đổi tiêu đề và định nghĩa thành:
     `## 1.1 Triết lý Thiết kế: Phân Định Rõ Ràng Mobile Hiện Trường (3 Vai Trò) & Web Dashboard Quản Trị (2 Vai Trò)`.
     Ghi rõ:
     + Phân khu 0 (Xác thực - 2 màn), Phân khu 1 (Drone - 7 màn), Phân khu 2 (Crew - 10 màn), Phân khu 5 (Reporter - 4 màn) thuộc **Ứng dụng Di động Tác nghiệp Hiện trường (Field Mobile App)**.
     + Phân khu 3 (PM - 14 màn) và Phân khu 4 (Supervisor - 7 màn) thuộc **Web Dashboard Quản trị & Điều hành Dự án (Management Web Portal)**.
   - Cập nhật Mục 1.5: Đổi tiêu đề thành:
     `## 1.5 Ma trận Phân Quyền 5 Vai Trò Người Dùng Giữa Mobile App & Web Dashboard`.
     Bổ sung cột hoặc ghi chú rõ ràng về nền tảng chính của từng vai trò (Supervisor: Web; PM: Web; Pilot: Mobile; Crew Lead: Mobile; Reporter: Mobile & Web Public).
   - Rà soát và cập nhật toàn bộ các mốc thời gian mẫu từ năm `2023`, `2025` về năm chuẩn hóa **`2026`** (theo đúng mốc bàn giao dự án R3).

2. **Chỉnh sửa `D:\Do_AN_Drone\RoadGuard_Wireframes\index.html`:**
   - Trong thanh chọn màn hình / bộ chuyển đổi vai trò (Role Switcher):
     Bổ sung nhãn phân nhóm trực quan:
     + Nhóm **ỨNG DỤNG DI ĐỘNG (MOBILE FIELD APP)**: Phi công Drone, Đội sửa chữa, Người dân phản ánh.
     + Nhóm **CỔNG QUẢN TRỊ (WEB DASHBOARD)**: Quản lý Dự án (PM), Ban Giám sát (Supervisor).
   - Tìm và sửa các mốc ngày hiển thị năm `2023`, `2025` thành `2026` (ví dụ: hạn bảo hành, ngày khảo sát, thời hạn hoàn thành).
   - Khắc phục lỗi ảnh vỡ `assets/placeholder_ortho.jpg`: Thay thế bằng SVG inline placeholder với nền xám nhạt và icon bản đồ trực giao sắc nét.

3. **Ghi chép Nhật ký Nghiệm thu (Bắt buộc):**
   - Tạo file markdown mới tại: `D:\Do_AN_Drone\FE_AppMobile\docs\worklogs\WF-01-platform-scope-and-branding-fix.md`.
   - Ghi lại các nội dung đã sửa, đối chiếu với `01_Project_Overview.md` của `27_9_V3` và xác nhận hoàn thành Phase 1.
```

---

### PROMPT 2: Remap Mã Use Case Drone `KB` Sang `KS` & Hoàn Thiện Ma Trận 126 Use Cases

```markdown
### NHIỆM VỤ: Remap mã Use Case và Hoàn thiện Ma trận Truy vết trong RoadGuard_Wireframes theo 27_9_V3

Bạn đang làm việc trên thư mục `D:\Do_AN_Drone\RoadGuard_Wireframes\`.
Theo tài liệu nguồn chuẩn mới nhất `D:\Do_AN_Drone\27_9_V3\02_Requirements\04_Use_Cases.md`:
- Nhóm Use Case khảo sát Drone có mã chuẩn là **`KS01` đến `KS16`** (Khảo sát).
- Trong `Wireframe_Specification.md` và `index.html`, tiền tố lạ `KB01` đến `KB07` vẫn còn sót trong phần mô tả của 6 màn Drone và trong đối tượng JavaScript `screensMeta`.
- Đồng thời, ma trận truy vết đang thiếu 13 Use Case có trong nguồn `27_9_V3`.

#### Các bước thực hiện:

1. **Remap toàn bộ tiền tố `KB` sang `KS` trong `Wireframe_Specification.md`:**
   - Tại các màn hình `M-DRONE-01` đến `M-DRONE-07`: Thay thế toàn bộ mã `US-KB01`..`US-KB07` thành mã chuẩn `KS01`..`KS07`.
   - Tại màn `M-DRONE-03`: Sửa danh sách trộn lẫn `KB03` và `KS03` thành mã thống nhất `KS02, KS03`.
   - Tại Phần IV (Ma trận truy vết): Đảm bảo các dòng Drone sử dụng mã `KS01`..`KS12`.

2. **Cập nhật JavaScript `screensMeta` trong `D:\Do_AN_Drone\RoadGuard_Wireframes\index.html`:**
   - Tìm kiếm các chuỗi `userStories: ['US-KB...']` trong `screensMeta['screen-drone-...']` và thay thế hoàn toàn sang mã chuẩn `KS`:
     + `screen-drone-home`: `KS01`, `KS02`
     + `screen-drone-requests`: `KS02`, `KS03`
     + `screen-drone-request-detail`: `KS02`, `KS03`
     + `screen-drone-upload`: `KS06`, `KS07`, `KS08`
     + `screen-drone-log`: `KS05`
     + `screen-drone-sync`: `KS09`, `KS10`
     + `screen-drone-profile`: `QT10`

3. **Bổ sung 13 Use Case bị thiếu vào Ma trận Truy vết (Phần IV của `Wireframe_Specification.md`):**
   Đối chiếu với `02_Requirements/04_Use_Cases.md` của `27_9_V3` và bổ sung 13 dòng vào ma trận:
   - `AI15`: Đánh giá độ tin cậy và sai số phân tích AI $\rightarrow$ `M-PM-05` (PM - Web)
   - `AI16`: Phê duyệt kết quả chạy mô hình AI $\rightarrow$ `M-PM-04`, `M-SUP-06` (PM/Sup - Web)
   - `AI17`: Hiệu chỉnh tham số mô hình phát hiện $\rightarrow$ `M-SUP-06` (Sup - Web)
   - `CN10`: Bắt buộc đổi mật khẩu lần đầu $\rightarrow$ `force-change-password` (Cả 5 vai trò - Mobile & Web)
   - `DA13`: Tạo và quản lý gói phân đoạn đường $\rightarrow$ `M-SUP-06`, `M-PM-15` (Sup/PM - Web)
   - `DA14`: Cập nhật trạng thái bảo hành phân đoạn $\rightarrow$ `M-PM-01` (PM - Web)
   - `DA15`: Quản lý hồ sơ hoàn công mặt đường BTXM $\rightarrow$ `M-SUP-06` (Sup - Web)
   - `DA16`: Tra cứu lịch sử bảo dưỡng tuyến $\rightarrow$ `M-SUP-04` (Sup - Web)
   - `HT15`: Xem nhật ký thao tác sửa chữa hiện trường $\rightarrow$ `M-CREW-03` (Crew - Mobile)
   - `KS14`: Hủy yêu cầu khảo sát chưa thực hiện $\rightarrow$ `M-PM-02` (PM - Web)
   - `KS15`: Báo cáo sự cố thiết bị bay tại hiện trường $\rightarrow$ `M-DRONE-05` (Drone - Mobile)
   - `KS16`: Đóng đợt khảo sát hoàn thành $\rightarrow$ `M-PM-02` (PM - Web)
   - `TN12`: Lưu trữ mẫu biên bản kiểm tra thực địa $\rightarrow$ `M-PM-07/M-CREW-05` (PM/Crew)

4. **Ghi chép Nhật ký Nghiệm thu (Bắt buộc):**
   - Tạo file markdown mới: `D:\Do_AN_Drone\FE_AppMobile\docs\worklogs\WF-02-usecase-remap-and-matrix-fix.md`.
   - Ghi lại danh sách Use Case đã remap và bổ sung.
```

---

### PROMPT 3: Chuẩn Hóa Nghiệp Vụ Fast Track, Task Mode & Tái Sử Dụng Ảnh Theo `27_9_V3`

```markdown
### NHIỆM VỤ: Chuẩn hóa Nghiệp vụ Fast Track, Task Mode & Tái Sử Dụng Bằng Chứng trong RoadGuard_Wireframes

Bạn đang làm việc trên thư mục `D:\Do_AN_Drone\RoadGuard_Wireframes\`.
Theo bộ tài liệu đặc tả `27_9_V3` (các quy tắc BR-05, BR-08, BR-11..18, BR-25 và `09_Frontend/03_Error_Response_UI_Convention.md`):
Nghiệp vụ sửa chữa mặt đường bê tông xi măng (TCVN 10380:2014) có các quy định kiểm soát rất chặt chẽ cần được phản ánh chính xác trong Wireframe Specification và nguyên mẫu HTML.

#### Các bước thực hiện:

1. **Cập nhật đặc tả màn hình `M-CREW-02` (`screen-crew-tasks`) và `M-CREW-03` (`screen-crew-wo-detail`) trong `Wireframe_Specification.md`:**
   - Bổ sung định nghĩa `TaskMode`:
     + `INSPECT_AND_REPAIR`: Đo kiểm và được phép sửa nhanh nếu đủ điều kiện Fast Track.
     + `MEASURE_ONLY`: Chỉ đo đạc hiện trường, cấm tự ý sửa tại chỗ (áp dụng cho đợt gom nhiều lỗi US-35 / BR-09).
   - Bổ sung bộ điều kiện kích hoạt Fast Track tại chỗ:
     + Nhiệm vụ ở chế độ `INSPECT_AND_REPAIR`.
     + Kích thước thực tế không vượt ngưỡng policy: Diện tích $\le 1.0\text{ m}^2$, Độ sâu $\le 5\text{ cm}$, Chiều dài $\le 2.0\text{ m}$.
     + Đã có bằng chứng ảnh hiện trạng TRƯỚC khi sửa (BEFORE).
   - Thêm quy định **Tái sử dụng bằng chứng ảnh (Evidence Reuse - BR-17, BR-18)**: Ảnh chụp của Người dân (Reporter) hoặc ảnh chụp Drone được phép tái sử dụng làm ảnh BEFORE nếu xác định đúng vị trí và phản ánh đúng khuyết tật.
   - Thêm thông báo mã lỗi UI chuẩn hóa (`09_Frontend/03`):
     + `TASK_MODE_NOT_REPAIRABLE`: "Nhiệm vụ này chỉ cho phép kiểm tra/đo; lưu kết quả đo và báo PM."
     + `FAST_TRACK_NOT_ELIGIBLE`: "Không đủ điều kiện sửa nhanh; kích thước vượt ngưỡng policy."
     + `BEFORE_MISSING`: "Bổ sung bằng chứng ảnh hiện trạng TRƯỚC khi sửa."
   - Khẳng định quy tắc **BR-25**: Crew sửa xong gửi ảnh AFTER $\rightarrow$ **PM trực tiếp kiểm tra và đóng lỗi; SUPERVISOR KHÔNG PHÊ DUYỆT FAST TRACK**.

2. **Cập nhật giao diện trong `D:\Do_AN_Drone\RoadGuard_Wireframes\index.html`:**
   - Trong màn `screen-crew-tasks` (`M-CREW-02`):
     + Thêm thanh tab lọc: `Tất cả` | `Đo & Sửa nhanh` | `Chỉ đo đợt`.
     + Trên các thẻ công việc: Hiển thị badge màu xanh lá `[Đo & Sửa nhanh]` hoặc badge màu xám `[Chỉ đo đợt - Cấm tự sửa]`.
   - Trong màn `screen-crew-wo-detail` (`M-CREW-03`):
     + Hiển thị khung thông số "Đánh giá Điều kiện Fast Track": Tự động so sánh kích thước đo đạc với ngưỡng policy (1.0 m², 5 cm, 2.0 m).
     + Bổ sung nút: *"📷 Tái sử dụng ảnh khảo sát làm ảnh TRƯỚC (BEFORE)"*.
     + Nếu công việc thuộc chế độ `MEASURE_ONLY`, nút "Bắt đầu sửa chữa" bị vô hiệu hóa kèm dòng cảnh báo đỏ: *"Nhiệm vụ này chỉ cho phép kiểm tra/đo; lưu kết quả đo và báo PM"*.
   - Trong màn `screen-crew-complete` (`M-CREW-09`):
     + Ghi rõ luồng gửi hồ sơ: *"Gửi PM nghiệm thu & đóng Fast Track"* (thay vì ghi gửi Giám sát viên).

3. **Ghi chép Nhật ký Nghiệm thu (Bắt buộc):**
   - Tạo file markdown mới: `D:\Do_AN_Drone\FE_AppMobile\docs\worklogs\WF-03-fast-track-and-evidence-rules-fix.md`.
   - Xác nhận hoàn thành Phase 3.
```

---

### PROMPT 4: Chuẩn Hóa Dẫn Đường Điểm Tiếp Cận, Nạp Thẻ Nhớ SD .SRT & Báo Lỗi Ngoài Đợt

```markdown
### NHIỆM VỤ: Chuẩn hóa Dẫn đường WGS84, Thẻ nhớ SD .SRT và Phân đoạn tuyến trong RoadGuard_Wireframes

Bạn đang làm việc trên thư mục `D:\Do_AN_Drone\RoadGuard_Wireframes\`.
Theo bộ tài liệu đặc tả `27_9_V3` (các quy định FR-27, FR-32, US-40, BR-38, KS06, KS07):
Cần chuẩn hóa các tính năng nghiệp vụ của Phi công Drone và Đội sửa chữa hiện trường để đảm bảo an toàn bay và tính toàn vẹn dữ liệu.

#### Các bước thực hiện:

1. **Chuẩn hóa màn hình `M-DRONE-03` (`screen-drone-request-detail`):**
   - Trong `Wireframe_Specification.md` và `index.html`:
     + Sửa phần dẫn đường bản đồ WGS84: Đổi nhãn và tọa độ dẫn đường thành **"Điểm tiếp cận / Điểm tập kết cất-hạ cánh (Access Point / Rendezvous)"**, ghi rõ: *Tuyệt đối không dẫn đường vào tim đường giao thông đang chạy*.
     + Hiển thị thông số điểm tiếp cận: Tọa độ WGS84 (VD: `10.7932° N, 106.5821° E`), bán kính an toàn hạ cánh 5m, bề mặt phẳng khô ráo.

2. **Chuẩn hóa màn hình `M-DRONE-04` (`screen-drone-upload`):**
   - Trong `Wireframe_Specification.md` và `index.html`:
     + Cập nhật quy trình nạp dữ liệu từ thẻ nhớ SD qua đầu đọc OTG:
       Bắt buộc chọn đồng thời 2 tệp:
       1. Tệp Video 4K RGB (`.MP4` hoặc `.MOV`).
       2. Tệp phụ đề định vị GPS nhúng (`.SRT`) tương ứng với video.
     + Bổ sung bước kiểm tra tiền khả thi (Pre-flight QA Validation): Kiểm tra số lượng bản ghi GPS trong tệp `.SRT` khớp với thời lượng video (1 tọa độ/giây). Nếu thiếu `.SRT` thì hiện cảnh báo: *"Chưa đủ dữ liệu để đánh giá vị trí/độ phủ (TELEMETRY_UNKNOWN)"*.

3. **Chuẩn hóa màn hình `M-CREW-08` (`screen-crew-report-defect`):**
   - Trong `Wireframe_Specification.md` và `index.html`:
     + Giải thích rõ lý do khác biệt lý trình: Đợt sửa chữa chính `#WO-118` diễn ra tại Tuyến ĐH.05 Km01+850 (Cầu Bà Lát), còn màn hình báo lỗi mới phát sinh là ví dụ tại **Tuyến ĐH.11 Km02+800** (điểm hư hại mới phát hiện nằm ngoài đợt đang thi công).

4. **Chuẩn hóa các màn hình Đồng bộ Ngoại tuyến (`M-DRONE-06`, `M-CREW-10`):**
   - Bổ sung đặc tả theo đúng tài liệu `09_Frontend/09_Offline_App_Sync_Spec.md`:
     + Trình bày rõ ràng trạng thái mã băm toàn vẹn `[🛡️ SHA-256 Checksum: Verified]`.
     + Quy định nút "Dọn dẹp dung lượng máy an toàn (Safe Local Purge)" chỉ được bấm khi máy chủ đã gửi mã ACK xác nhận toàn vẹn 100%.

5. **Ghi chép Nhật ký Nghiệm thu (Bắt buộc):**
   - Tạo file markdown mới: `D:\Do_AN_Drone\FE_AppMobile\docs\worklogs\WF-04-drone-and-crew-field-specs-fix.md`.
   - Xác nhận hoàn thành Phase 4.
```

---

### PROMPT 5: Rà Soát Toàn Bộ Thư Mục `RoadGuard_Wireframes` & Nghiệm Thu Tổng Thể

```markdown
### NHIỆM VỤ: Rà soát Toàn bộ Thư mục RoadGuard_Wireframes & Tạo Báo Cáo Nghiệm Thu Hoàn Tất

Bạn đang làm việc trên thư mục `D:\Do_AN_Drone\RoadGuard_Wireframes\`.
Mục tiêu là kiểm tra toàn diện cả 2 file `Wireframe_Specification.md` và `index.html` sau khi đã hoàn thành 4 Phase chỉnh sửa trước đó.

#### Các tiêu chí kiểm tra nghiêm ngặt:

1. **Kiểm tra Phân định Nền tảng:**
   - 23 màn hình Mobile App (Crew, Drone, Reporter, Auth) và 21 màn hình Web Dashboard (PM, Supervisor) được phân định rõ ràng trong văn bản và giao diện HTML.
2. **Kiểm tra Mã hiệu Use Case & User Story:**
   - Không còn bất kỳ mã `KB01`..`KB07` nào tồn tại trong cả file `.md` và file `.html`.
   - Đủ 126 Use Case trong Ma trận truy vết đối chiếu với `27_9_V3/02_Requirements/04_Use_Cases.md`.
3. **Kiểm tra Quy tắc Phi tài chính UD-06:**
   - Không còn sót bất kỳ trường nhập hoặc hiển thị tiền tệ, chi phí VNĐ, dự toán, đơn giá, định mức xi măng cát đá nào.
4. **Kiểm tra Tài nguyên và Định dạng:**
   - Không còn liên kết ảnh vỡ (`assets/placeholder_ortho.jpg`).
   - Mốc thời gian mẫu hiển thị đồng bộ năm `2026`.
   - Tên công ty: Công ty TNHH Xây dựng Bê tông Hoàng Hải. Domain email: `@hoanghai.vn`.

#### Tạo Báo Cáo Nghiệm Thu Hoàn Tất (Bắt buộc):
- Tạo file markdown mới: `D:\Do_AN_Drone\FE_AppMobile\docs\worklogs\WF-05-wireframes-verification-final.md`.
- Báo cáo tổng kết toàn bộ các điểm đã fix trong thư mục `RoadGuard_Wireframes`, khẳng định bộ Wireframe hiện tại đã hoàn toàn khớp 100% với đặc tả mới `27_9_V3` của Nhóm trưởng.
```

---

## BẢNG THEO DÕI TIẾN ĐỘ THỰC HIỆN FIX `RoadGuard_Wireframes`

| Phase | Nhiệm vụ chính | File Nhật Ký Bắt Buộc | Trạng thái |
|:---:|---|---|:---:|
| **Phase 1** | Phân định Nền tảng (Mobile 3 Role vs Web 2 Role) & Chuẩn hóa Năm 2026 | `docs/worklogs/WF-01-platform-scope-and-branding-fix.md` | Sẵn sàng |
| **Phase 2** | Remap mã Use Case Drone `KB` sang `KS` & Hoàn thiện Ma trận 126 Use Cases | `docs/worklogs/WF-02-usecase-remap-and-matrix-fix.md` | Sẵn sàng |
| **Phase 3** | Chuẩn hóa nghiệp vụ Fast Track, Task Mode & Tái sử dụng ảnh theo `27_9_V3` | `docs/worklogs/WF-03-fast-track-and-evidence-rules-fix.md` | Sẵn sàng |
| **Phase 4** | Chuẩn hóa Dẫn đường Điểm tiếp cận, Thẻ nhớ SD .SRT & Báo lỗi ngoài đợt | `docs/worklogs/WF-04-drone-and-crew-field-specs-fix.md` | Sẵn sàng |
| **Phase 5** | Rà soát toàn bộ thư mục `RoadGuard_Wireframes` & Báo cáo tổng thể | `docs/worklogs/WF-05-wireframes-verification-final.md` | Sẵn sàng |
