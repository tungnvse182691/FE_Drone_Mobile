# WORKLOG WF-03: CHUẨN HÓA NGHIỆP VỤ FAST TRACK, TASK MODE & TÁI SỬ DỤNG BẰNG CHỨNG THEO 27_9_V3

- **Dự án:** RoadGuard - Giám sát & Quản lý Bảo hành Đường Bê tông Xi măng (TCVN 10380:2014)
- **Đơn vị chủ quản:** Công ty TNHH Xây dựng Bê tông Hoàng Hải (`@hoanghai.vn`)
- **Tác vụ:** Thực hiện Phase 3 theo kế hoạch chuẩn hóa Wireframes từ đặc tả `27_9_V3`
- **Người thực hiện:** Antigravity Coding Agent (dưới sự chỉ đạo của QA Lead & FE Lead Nguyễn Văn Tùng)
- **Ngày thực hiện:** 27/09/2026
- **Trạng thái:** ✅ HOÀN THÀNH 100%

---

## 1. MỤC TIÊU PHASE 3
1. Cập nhật đặc tả và giao diện cho Đội sửa chữa hiện trường (`REPAIR_CREW`) trên cả 2 tệp `Wireframe_Specification.md` và `index.html`:
   - Phân biệt rõ chế độ công việc `TaskMode`: `INSPECT_AND_REPAIR` vs `MEASURE_ONLY` (theo BR-05, BR-08, BR-09).
   - Tự động đánh giá điều kiện Fast Track Policy ($S \le 1.0\text{ m}^2$, $h \le 5\text{ cm}$, $L \le 2.0\text{ m}$) và yêu cầu ảnh BEFORE.
   - Cơ chế tái sử dụng bằng chứng ảnh (Evidence Reuse - BR-17, BR-18).
   - Khẳng định quy tắc BR-25: PM trực tiếp nghiệm thu và đóng lỗi Fast Track; Supervisor KHÔNG phê duyệt Fast Track.
   - Bổ sung thông báo mã lỗi UI chuẩn hóa theo `09_Frontend/03_Error_Response_UI_Convention.md` (`TASK_MODE_NOT_REPAIRABLE`, `FAST_TRACK_NOT_ELIGIBLE`, `BEFORE_MISSING`).
   - Loại bỏ hoàn toàn các vi phạm UD-06 và các thuật ngữ cấm về Asphalt/nhựa đường.

---

## 2. NỘI DUNG ĐÃ THỰC HIỆN CHI TIẾT

### 2.1. Cập nhật `Wireframe_Specification.md`
- **M-CREW-01 (Crew Home):** Cập nhật mã nhân viên kỹ thuật `HH-RC-084`, xác định nhiệm vụ trọng tâm `#WO-118` ở chế độ `INSPECT_AND_REPAIR`.
- **M-CREW-02 (My Tasks):**
  - Bổ sung định nghĩa bộ lọc `TaskMode`: `Tất cả` | `Đo & Sửa nhanh (INSPECT_AND_REPAIR)` | `Chỉ đo đợt (MEASURE_ONLY)`.
  - Phân loại trực quan: Task gom nhiều lỗi (US-35 / BR-09) gắn badge `MEASURE_ONLY - Chỉ đo đợt, cấm tự sửa`.
- **M-CREW-03 (WO Detail):**
  - Khung đánh giá tự động Fast Track Policy: Đối chiếu 3 thông số hình học thực tế ($S = 0.85\text{ m}^2 \le 1.0\text{ m}^2$, $h = 4.5\text{ cm} \le 5\text{ cm}$, $L = 1.2\text{ m} \le 2.0\text{ m}$) $\rightarrow$ Đủ điều kiện sửa nhanh tại chỗ.
  - Cơ chế Tái sử dụng ảnh (BR-17, BR-18): Tích hợp nút liên kết ảnh của Reporter/Drone làm ảnh BEFORE.
  - Bổ sung xử lý mã lỗi UI chuẩn: `TASK_MODE_NOT_REPAIRABLE`, `FAST_TRACK_NOT_ELIGIBLE`, `BEFORE_MISSING`.
  - Thay thế toàn bộ vật liệu sang BTXM TCVN 10380:2014 (BTXM M350-HH-02, đầm dùi, tạo nhám).
- **M-CREW-04 (Navigation):** Chuẩn hóa tọa độ WGS84 Km01+850 Tuyến ĐH.05, Xã Vĩnh Lộc B, Huyện Bình Chánh (`10.7932° N, 106.5821° E`).
- **M-CREW-07 (Progress):** Quy trình 4 bước thi công chuẩn mặt đường BTXM TCVN 10380:2014.
- **M-CREW-06 (Viewfinder):** Kính ngắm AR Ghost Overlay căn góc chụp từ ảnh BEFORE tái sử dụng (BR-17).
- **M-CREW-09 (Complete):**
  - Khẳng định quy tắc BR-25: PM trực tiếp kiểm tra, xác nhận hoàn thành và đóng lỗi Fast Track. Supervisor KHÔNG phê duyệt Fast Track.
  - Tuân thủ tuyệt đối UD-06: Chỉ ghi nhận kích thước hình học hoàn thiện ($S = 0.85\text{ m}^2$, $h = 4.5\text{ cm}$), không có chi phí hay định mức vật liệu.

### 2.2. Cập nhật `index.html`
- **`screen-crew-tasks` (`M-CREW-02`):**
  - Thêm thanh tab lọc: `Tất cả (4)` | `Đo & Sửa nhanh (2)` | `Chỉ đo đợt (2)`.
  - Thêm badge định danh trực quan trên các Card:
    + Card 1 (`#WO-118`) & Card 4 (`#WO-121`): `[Đo & Sửa nhanh]` màu xanh lá.
    + Card 2 & Card 3: `[Chỉ đo đợt - Cấm tự sửa]` màu xám (tuân thủ BR-09).
- **`screen-crew-wo-detail` (`M-CREW-03`):**
  - Thêm Card Đánh giá Điều kiện Fast Track tự động với bảng so sánh 3 chỉ số ($S, h, L$) và badge `ĐỦ ĐIỀU KIỆN`.
  - Thêm nút hành động: *"📷 Tái sử dụng ảnh khảo sát (Drone) làm ảnh TRƯỚC (BEFORE)"* (BR-17, BR-18).
  - Loại bỏ hoàn toàn khối lượng "1.2 tấn" và chữ "nhựa dính bám", "nhựa nguội"; thay bằng BTXM M350-HH-02.
- **`screen-crew-complete` (`M-CREW-09`):**
  - Chuẩn hóa vị trí Km01+850 Tuyến ĐH.05, Bình Chánh.
  - Sửa nhãn nút CTA: *"Gửi PM nghiệm thu & đóng Fast Track"*.
  - Bổ sung dòng chú thích quy tắc **BR-25**: PM trực tiếp thẩm định và đóng lỗi Fast Track; Supervisor không tham gia phê duyệt.
- **`screen-crew-progress` (`M-CREW-07`) & `screen-crew-nav` (`M-CREW-04`):**
  - Chuẩn hóa địa danh Xã Vĩnh Lộc B, Huyện Bình Chánh, tọa độ WGS84 `10.7932, 106.5821` và năm 2026.

---

## 3. KẾT LUẬN & CHUYỂN BƯỚC
- Phase 3 đã hoàn tất 100%, bảo đảm tuân thủ nghiêm ngặt BR-05, BR-08, BR-09, BR-11..18, BR-25 và UD-06.
- Tiếp tục chuyển sang **Phase 4: Chuẩn Hóa Dẫn Đường Điểm Tiếp Cận, Thẻ Nhớ SD .SRT & Báo Lỗi Ngoài Đợt**.
