# WORKLOG WF-04: CHUẨN HÓA DẪN ĐƯỜNG ĐIỂM TIẾP CẬN, THẺ NHỚ SD .SRT & BÁO LỖI NGOÀI ĐỢT

- **Dự án:** RoadGuard - Giám sát & Quản lý Bảo hành Đường Bê tông Xi măng (TCVN 10380:2014)
- **Đơn vị chủ quản:** Công ty TNHH Xây dựng Bê tông Hoàng Hải (`@hoanghai.vn`)
- **Tác vụ:** Thực hiện Phase 4 theo kế hoạch chuẩn hóa Wireframes từ đặc tả `27_9_V3`
- **Người thực hiện:** Antigravity Coding Agent (dưới sự chỉ đạo của QA Lead & FE Lead Nguyễn Văn Tùng)
- **Ngày thực hiện:** 27/09/2026
- **Trạng thái:** ✅ HOÀN THÀNH 100%

---

## 1. MỤC TIÊU PHASE 4
1. **Chuẩn hóa màn hình `M-DRONE-03` (`screen-drone-request-detail`):** Dẫn đường bản đồ WGS84 mở Google Maps tới **Điểm tiếp cận / Điểm tập kết cất-hạ cánh (Access Point / Rendezvous)**, tuyệt đối không dẫn đường vào tim đường giao thông đang chạy (theo US-40, BR-38).
2. **Chuẩn hóa màn hình `M-DRONE-04` (`screen-drone-upload`):** Cập nhật quy trình nạp dữ liệu từ thẻ nhớ SD qua đầu đọc OTG Type-C, bắt buộc đồng thời 02 tệp đồng bộ: Video 4K RGB (`.MP4`) và Tệp phụ đề định vị GPS nhúng (`.SRT`). Tích hợp bước kiểm định tiền khả thi (Pre-flight QA Validation) và cảnh báo chốt chặn `TELEMETRY_UNKNOWN` (FR-27, KS06, KS07).
3. **Chuẩn hóa màn hình `M-CREW-08` (`screen-crew-report-defect`):** Chuẩn hóa vị trí lý trình khuyết tật mới phát sinh tại **Tuyến ĐH.11 Km02+800** (nằm ngoài đợt đang sửa `#WO-118` tại Tuyến ĐH.05 Km01+850) và tích hợp 5 mã phân loại khuyết tật chuẩn mực (`POTH_DEEP`, `EDGE_BRK`, `DEPR_POND`, `SLAB_CRK`, `SHLD_EROS`).
4. **Chuẩn hóa các màn hình Đồng bộ Ngoại tuyến (`M-DRONE-06`, `M-CREW-10`):** Hiển thị trực quan trạng thái mã băm toàn vẹn `[⏳ Đang tạo SHA-256]`, `[🛡️ SHA-256 Checksum: Verified]`, `[Đã gửi ACK - Sẵn sàng dọn dẹp]` và cơ chế **Dọn dẹp dung lượng an toàn (Safe Local Purge)** theo đặc tả `09_Offline_App_Sync_Spec.md`.
5. **Rà soát định danh:** Chuyển đổi toàn bộ tiền tố mã nhân sự và mã yêu cầu cũ sang chuẩn thương hiệu Hoàng Hải (`HH-2089`, `HH-RC-084`, `#HH-409...`).

---

## 2. NỘI DUNG ĐÃ THỰC HIỆN CHI TIẾT

### 2.1. Chuẩn hóa M-DRONE-03 (Dẫn đường Điểm tiếp cận An toàn WGS84 - US-40, BR-38)
- **Tại `Wireframe_Specification.md` (Mục 5):**
  - Xác định rõ quy tắc an toàn bay: Dẫn đường xe và thiết bị bay tới bãi đất trống Km01+800 ĐH.05 (bán kính hạ cánh an toàn 5m, bề mặt phẳng khô ráo, không vướng dây điện); tuyệt đối không dẫn đường vào tim đường giao thông đang chạy.
  - Tọa độ WGS84: `10.7932° N, 106.5821° E`.
- **Tại `index.html` (`screen-drone-request-detail`):**
  - Cập nhật Card bản đồ vector SVG thể hiện rõ vùng an toàn `R=5m An Toàn` bên lề đường ĐH.05 Bình Chánh.
  - Đặt điểm ghim (Map Pin) chính xác tại Access Point, không nằm trên tim đường.
  - Banner quy tắc an toàn bay màu hổ phách cảnh báo nghiêm ngặt phi công.

### 2.2. Chuẩn hóa M-DRONE-04 (Nạp Thẻ SD, 2 Tệp Video 4K + SRT & Pre-flight QA - FR-27, KS06/07)
- **Tại `Wireframe_Specification.md` (Mục 6):**
  - Quy định nạp 2 tệp đồng bộ: Video 4K RGB (`DJI_0042.MP4`, 3.2 GB) và Tệp phụ đề GPS (`DJI_0042.SRT`, 450 KB).
  - Khung kiểm định tiền khả thi (Pre-flight QA Validation): Đối soát 165 giây video khớp 165 điểm tọa độ WGS84 (tần số 1Hz).
  - Chốt chặn an toàn: Báo lỗi `TELEMETRY_UNKNOWN` nếu thiếu tệp `.SRT`.
- **Tại `index.html` (`screen-drone-upload`):**
  - Tích hợp giao diện kết nối đầu đọc thẻ nhớ OTG Type-C (`OTG ĐÃ KẾT NỐI`).
  - Hiển thị 2 Card tệp độc lập: Video 4K RGB (`DJI_0042.MP4` - 3.2 GB) và Tệp phụ đề GPS (`DJI_0042.SRT` - 450 KB).
  - Khung kiểm định `KIỂM ĐỊNH TIỀN KHẢ THI (PRE-FLIGHT QA)` với badge xanh lá `ĐẠT 100%`, đối soát 165s / 165 điểm tọa độ WGS84.
  - Hộp cảnh báo mã lỗi `TELEMETRY_UNKNOWN` ngăn chặn upload video thiếu tọa độ.

### 2.3. Chuẩn hóa M-CREW-08 (Báo lỗi phát sinh Ngoài đợt & 5 Mã Chuẩn)
- **Tại `Wireframe_Specification.md` (Mục 15):**
  - Làm rõ tính logic nghiệp vụ: `#WO-118` diễn ra tại Tuyến ĐH.05 Km01+850, còn lỗi phát sinh mới được ghi nhận tại **Tuyến ĐH.11 Km02+800** (điểm mới phát hiện nằm ngoài đợt đang thi công).
- **Tại `index.html` (`screen-crew-report-defect`):**
  - Cập nhật banner giải thích quy tắc HT04/HT06: Phiếu phát sinh ngoài đợt sẽ gửi độc lập về PM thẩm định để gom vào đợt mới.
  - Tọa độ GPS tự động: `10.7850° N, 106.5740° E (Km02+800 ĐH.11, Bình Chánh)`.
  - Bộ 5 mã khuyết tật chuẩn trong `<select>`:
    + `POTH_DEEP` — Ổ gà sâu vỡ tấm bê tông
    + `EDGE_BRK` — Vỡ mép tấm bê tông
    + `DEPR_POND` — Lún võng đọng nước
    + `SLAB_CRK` — Nứt tấm bê tông
    + `SHLD_EROS` — Xói lở vai đường
  - Nút CTA chuẩn hóa: *"Gửi báo cáo lỗi mới cho PM (HT06)"*.

### 2.4. Chuẩn hóa Màn hình Sync (M-DRONE-06, M-CREW-10 - SHA-256 & Safe Local Purge)
- **Tại `Wireframe_Specification.md` (Mục 8 & Mục 18):**
  - Bổ sung quy chuẩn theo `09_Offline_App_Sync_Spec.md`: Trạng thái mã băm toàn vẹn SHA-256 và cơ chế dọn dẹp dung lượng an toàn (Safe Local Purge) chỉ mở khóa khi máy chủ đã gửi mã ACK.
- **Tại `index.html` (`screen-drone-sync` & `screen-crew-sync`):**
  - Cập nhật các trạng thái hàng đợi:
    + `[⏳ Đang tạo SHA-256]` / `[⏳ 65% (Tính Checksum)]` cho các tệp video và ảnh lớn đang xử lý.
    + `[🛡️ SHA-256 Checksum: Verified]` cho các tệp đã đối soát mã băm toàn vẹn thành công.
    + `[ĐÃ GỬI ACK]` cho các tệp đã được máy chủ trung tâm xác nhận 100%.
  - Thêm Card nghiệp vụ chuyên biệt: **"Dọn dẹp dung lượng an toàn (Safe Local Purge)"** với nút hành động *"Dọn dẹp an toàn"* kèm dòng chú thích quy tắc bắt buộc máy chủ đã ACK.

### 2.5. Hoàn tất Dọn dẹp Định danh Thương hiệu
- Sửa toàn bộ mã phi công `CT-2089` $\rightarrow$ `HH-2089` trên cả `Wireframe_Specification.md` và `index.html`.
- Sửa mã kỹ thuật viên `CT-RC-084` $\rightarrow$ `HH-RC-084` trên cả 2 tệp.
- Sửa các mã phiếu `#CT-409`, `#CT-398`, `#CT-382`, `#CT-375` $\rightarrow$ `#HH-409`, `#HH-398`, `#HH-382`, `#HH-375`.
- Đổi tên cấu hình Tailwind `cattuong` $\rightarrow$ `hoanghai`.
- Sửa email PM `lan.nguyen@cattuonginfra.vn` $\rightarrow$ `lan.nguyen@hoanghai.vn`.

---

## 3. KẾT QUẢ KIỂM CHỨNG (VERIFICATION)
- **Grep CaseSensitive `CT-[A-Z0-9]+`:** 0 kết quả trong toàn bộ 2 file.
- **Grep `cattuong`:** 0 kết quả trong toàn bộ 2 file.
- **Grep `TELEMETRY_UNKNOWN`:** Xuất hiện đầy đủ và chính xác tại cả `Wireframe_Specification.md` và `index.html`.
- **Grep `Safe Local Purge` & `SHA-256`:** Xuất hiện đầy đủ và chính xác tại cả 2 màn hình đồng bộ.

**KẾT LUẬN: PHASE 4 ĐÃ HOÀN TẤT THÀNH CÔNG 100% SẴN SÀNG CHUYỂN SANG PHASE 5 (TỔNG KẾT NGHIỆM THU).**
