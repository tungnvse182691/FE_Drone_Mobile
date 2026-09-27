# WORKLOG WF-02: REMAP MÃ USE CASE DRONE KB SANG KS & HOÀN THIỆN MA TRẬN 126 USE CASES

- **Dự án:** RoadGuard - Giám sát & Quản lý Bảo hành Đường Bê tông Xi măng (TCVN 10380:2014)
- **Đơn vị chủ quản:** Công ty TNHH Xây dựng Bê tông Hoàng Hải (`@hoanghai.vn`)
- **Tác vụ:** Thực hiện Phase 2 theo kế hoạch chuẩn hóa Wireframes từ đặc tả `27_9_V3`
- **Người thực hiện:** Antigravity Coding Agent (dưới sự chỉ đạo của QA Lead & FE Lead Nguyễn Văn Tùng)
- **Ngày thực hiện:** 27/09/2026
- **Trạng thái:** ✅ HOÀN THÀNH 100%

---

## 1. MỤC TIÊU PHASE 2
1. Loại bỏ hoàn toàn tiền tố lạ `KB01`..`KB07` trong đặc tả màn hình Drone và `screensMeta` của `index.html`, remap 100% về mã khảo sát chuẩn `KS01`..`KS10` theo `02_Requirements/04_Use_Cases.md` của `27_9_V3`.
2. Bổ sung 13 Use Case bị thiếu vào Ma trận truy vết yêu cầu (Phần IV của `Wireframe_Specification.md`) để đảm bảo phủ đủ 100% yêu cầu hệ thống.
3. Chuẩn hóa số thứ tự (STT) và cập nhật báo cáo kết luận độ phủ nghiệp vụ cùng bảng ghi chú mâu thuẫn.

---

## 2. NỘI DUNG ĐÃ THỰC HIỆN CHI TIẾT

### 2.1. Remap tiền tố `KB` sang `KS`
- **Trong `Wireframe_Specification.md`:**
  - `M-DRONE-01` (Trang chủ Pilot): `US-KB01, US-KB02` $\rightarrow$ `KS01, KS02` [US-05].
  - `M-DRONE-02` (Danh sách Yêu cầu Khảo sát): `US-KB02, US-KB03` $\rightarrow$ `KS02, KS03` [US-05].
  - `M-DRONE-03` (Chi tiết Yêu cầu Khảo sát & Dẫn đường WGS84): Đã khắc phục lỗi trộn lẫn `KB03` và `KS03` $\rightarrow$ Chuẩn hóa thành `KS02, KS03` [US-05].
  - `M-DRONE-04` (Trình duyệt Thẻ nhớ & Upload Video/SRT): `US-KB04` $\rightarrow$ `KS06, KS07, KS08` [US-06].
  - `M-DRONE-05` (Nhật ký Bay & Khí tượng): `US-KB05` $\rightarrow$ `KS05, KS15` [US-06].
  - `M-DRONE-06` (Hàng đợi Đồng bộ Tải lên Đám mây): `US-KB06` $\rightarrow$ `KS09, KS10` [US-06].
  - `M-DRONE-07` (Hồ sơ Drone & Thiết bị): `US-KB07` $\rightarrow$ `QT10` [US-18].
- **Trong `index.html` (đối tượng JavaScript `screensMeta`):**
  - Đã cập nhật toàn bộ thuộc tính `userStories` của `screen-drone-home`, `screen-drone-requests`, `screen-drone-request-detail`, `screen-drone-upload`, `screen-drone-log`, `screen-drone-sync`, `screen-drone-profile` sang các mã chuẩn `KS` và `QT10`.
  - Kết quả kiểm tra: 0 chuỗi `KB0` còn sót lại trong toàn bộ file HTML.

### 2.2. Bổ sung 13 Use Case bị thiếu vào Ma trận Truy vết Phần IV
Đã bổ sung đầy đủ 13 Use Case vào các nhóm tương ứng theo `27_9_V3`:
1. `CN10`: Bắt buộc đổi mật khẩu lần đầu $\rightarrow$ Gán màn hình `M00` (`force-change-password`) [US-01 - Cả 5 vai trò].
2. `DA13`: Tạo và quản lý gói phân đoạn đường $\rightarrow$ `M-SUP-06`, `M-PM-15` [US-03 - Supervisor / PM].
3. `DA14`: Cập nhật trạng thái bảo hành phân đoạn $\rightarrow$ `M-PM-01` [US-03 - PM].
4. `DA15`: Quản lý hồ sơ hoàn công mặt đường BTXM $\rightarrow$ `M-SUP-06` [US-03 - Supervisor].
5. `DA16`: Tra cứu lịch sử bảo dưỡng tuyến $\rightarrow$ `M-SUP-04` [US-15 - Supervisor].
6. `KS14`: Hủy yêu cầu khảo sát chưa thực hiện $\rightarrow$ `M-PM-02` [US-05 - PM].
7. `KS15`: Báo cáo sự cố thiết bị bay tại hiện trường $\rightarrow$ `M-DRONE-05` [US-06 - Phi công Drone].
8. `KS16`: Đóng đợt khảo sát hoàn thành $\rightarrow$ `M-PM-02` [US-05 - PM].
9. `AI15`: Đánh giá độ tin cậy và sai số phân tích AI $\rightarrow$ `M-PM-05` [US-08 - PM].
10. `AI16`: Phê duyệt kết quả chạy mô hình AI $\rightarrow$ `M-PM-04`, `M-SUP-06` [US-08 - PM / Giám sát].
11. `AI17`: Hiệu chỉnh tham số mô hình phát hiện $\rightarrow$ `M-SUP-06` [US-18 - Giám sát].
12. `TN12`: Lưu trữ mẫu biên bản kiểm tra thực địa $\rightarrow$ `M-PM-07/M-CREW-05` [US-20 - PM / Đội trưởng].
13. `HT15`: Xem chi tiết đợt sửa chữa được phân công $\rightarrow$ `M-CREW-03`, `M-CREW-07` [US-13 - Đội trưởng].

### 2.3. Cập nhật Số thứ tự & Đánh giá Độ phủ Nghiệp vụ
- Đã đánh số lại STT cho toàn bộ bảng ma trận Phần IV.
- Cập nhật mục Kết luận cuối tài liệu: Phản ánh đúng 126 Use Case chuẩn hóa từ `27_9_V3` (phủ 100% yêu cầu nghiệp vụ).
- Cập nhật bảng ghi chú các điểm mâu thuẫn (Mục 9 và 10 đã được gạch ngang xác nhận hoàn tất ✅).

---

## 3. KẾT LUẬN & CHUYỂN BƯỚC
- Phase 2 đã hoàn thành trọn vẹn, không có bất kỳ xung đột nào.
- Tiếp tục chuyển sang **Phase 3: Chuẩn Hóa Nghiệp Vụ Fast Track, Task Mode & Tái Sử Dụng Ảnh Theo 27_9_V3**.
