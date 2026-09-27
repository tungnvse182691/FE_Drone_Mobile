# NHẬT KÝ THỰC THI (WORKLOG): WF-01-PLATFORM-SCOPE-AND-BRANDING-FIX

- **Mã công việc:** `WF-01`
- **Người thực hiện:** Antigravity Coding Agent (dưới sự chỉ đạo của Sếp Nguyễn Văn Tùng - QA Lead & FE Lead)
- **Ngày thực hiện:** 27/09/2026
- **Tài liệu đối chiếu căn cứ:** 
  + `D:\Do_AN_Drone\FE_AppMobile\docs\planning\RoadGuard_Plan_Fix_Wireframes_From_27_9_V3.md` (Phase 1)
  + `D:\Do_AN_Drone\27_9_V3\01_Overview\01_Project_Overview.md`
  + `D:\Do_AN_Drone\27_9_V3\09_Frontend\01_FE_Scope_Implementation_Guide.md`
- **Tệp chỉnh sửa trực tiếp:**
  + [Wireframe_Specification.md](file:///D:/Do_AN_Drone/RoadGuard_Wireframes/Wireframe_Specification.md)
  + [index.html](file:///D:/Do_AN_Drone/RoadGuard_Wireframes/index.html)

---

## 1. MỤC TIÊU PHASE 1
1. **Phân định rõ ràng kiến trúc nền tảng:** Tách bạch 23 màn hình Mobile App hiện trường (3 vai trò: Crew, Drone, Reporter + Auth) và 21 màn hình Web Dashboard quản lý (2 vai trò: PM, Supervisor), chấm dứt việc đánh đồng 44 màn hình đều là ứng dụng di động.
2. **Cập nhật phân nhóm trực quan trong giao diện prototype:** Bổ sung nhãn phân nhóm Mobile Field App vs Web Management Dashboard trên Header Role Selector, Screen Dropdown (`<select>`), và Left Drawer Sitemap.
3. **Chuẩn hóa dữ liệu mẫu về năm 2026:** Rà soát và sửa đổi toàn bộ các mốc năm 2023, 2025 còn sót lại trong cả file markdown đặc tả và file mã nguồn HTML sang năm 2026 (mốc bàn giao dự án R3).
4. **Khắc phục tài nguyên ảnh bị vỡ:** Thay thế 100% các tham chiếu `assets/placeholder_ortho.jpg` bằng thẻ SVG inline sắc nét mô phỏng mặt đường bê tông xi măng (BTXM TCVN 10380:2014) trực giao 4K (RGB + DSM).
5. **Loại bỏ triệt để từ ngữ nhựa đường / asphalt:** Thay thế các mô tả phương án xử lý "cào bóc thảm lại", "bù nhựa vá ổ gà" sang "đục bỏ tấm nứt vỡ & đổ bù bê tông xi măng M350 / trám vữa xi măng polyme cường độ cao".

---

## 2. CHI TIẾT CÁC THAY ĐỔI ĐÃ THỰC HIỆN

### 2.1 Tại `Wireframe_Specification.md`:
- **Mục 1.1:** Đổi tiêu đề thành `## 1.1 Triết lý Thiết kế: Phân Định Rõ Ràng Mobile Hiện Trường (3 Vai Trò) & Web Dashboard Quản Trị (2 Vai Trò)`. Nêu rõ phạm vi 23 màn hình Mobile App (Phân khu 0, 1, 2, 5) vs 21 màn hình Web Dashboard (Phân khu 3, 4).
- **Mục 1.5:** Đổi tiêu đề thành `## 1.5 Ma trận Phân Quyền 5 Vai Trò Người Dùng Giữa Mobile App & Web Dashboard`. Bổ sung ghi chú nền tảng tác nghiệp cốt lõi và định danh nền tảng cho từng vai trò trên bảng ma trận.
- **Chuẩn hóa mốc thời gian:** 
  + Sửa mã chuyến bay `#FL-20231024-01` $\rightarrow$ `#FL-20261024-01` (Mục 7 / `M-DRONE-05`).
  + Sửa đối chiếu 3 kỳ Baseline: `12/2022 vs 04/2023 vs 10/2023` $\rightarrow$ `12/2025 vs 04/2026 vs 10/2026` (Mục 25 / `M-PM-06/14`).
  + Sửa phương án xử lý loại bỏ asphalt và thời hạn: `20/09/2025` $\rightarrow$ `20/09/2026` (Mục 35 / `M-SUP-02`).
  + Cập nhật bảng kiểm checklist cuối tài liệu: Xác nhận hoàn thành chuẩn hóa năm 2026 và SVG placeholder.

### 2.2 Tại `index.html`:
- **Header App Title & Description:** Cập nhật nhãn định danh `| 23 Mobile Field + 21 Web Dashboard Screens` và `44 Màn hình tương tác chuẩn UX (27_9_V3) • TCVN 10380:2014`.
- **Header Role Switcher:** Tách làm 2 cụm nút phân nhóm có viền màu và badge nhận diện:
  + Cụm xanh lá `Mobile (23)`: Xác thực (2), Drone (7), Đội sửa chữa (10), Người dân (4).
  + Cụm xanh lam `Web (21)`: PM (14), Giám sát (7).
- **Dropdown `<select id="screenSelect">`:** Cập nhật toàn bộ các thẻ `<optgroup>` với nhãn phân định rõ ràng `📱 ỨNG DỤNG DI ĐỘNG` và `💻 CỔNG QUẢN TRỊ WEB`.
- **Left Drawer Sitemap:** Bổ sung tiêu đề phân nhóm `📱 Ứng Dụng Di Động (23 Màn)` và `💻 Cổng Quản Trị Web (21 Màn)`.
- **Thay thế `placeholder_ortho.jpg`:** Thay thế tại 2 màn hình `screen-pm-verify-a` (`M-PM-05`) và `screen-pm-verify-b` (`M-PM-06/14`) bằng canvas SVG trực giao 4K thể hiện kết cấu tấm BTXM và vết nứt/ổ gà chuẩn xác.
- **Chuẩn hóa năm 2023 & 2025 về 2026:**
  + Thẻ `#CT-375` (dòng 845): `23/10/2026`.
  + Các thẻ yêu cầu bay `#KS-VD3`, `#KS-375`, `#KS-361`: `22/10/2026`, `20/10/2026`, `18/10/2026`.
  + Phiên bản build app (dòng 1554): `HOÀNG HẢI Field v3.0 (Build 2026.09)`.
  + Thẻ hoàn thành Đội sửa chữa (dòng 1726): `23/10/2026`.
  + Metadata kính ngắm (dòng 2410): `14/10/2026 15:42:19`.
  + Mã đợt và modal hoãn bay PM (dòng 3294, 3317, 3349, 3371, 3390, 3429): `SRV-2026-ORIG-01`, `28/10/2026`, `22/10/2026`, `20/10/2026`, `19/10/2026`, `2026-10-28`.
  + Khối gộp đợt batching PM (dòng 4428): `20/09/2026`.
  + Input ngày gửi duyệt & gửi lại (dòng 4705, 4787): `2026-09-20`, `2026-09-15`.
  + Thẻ đã nộp PM (dòng 4886, 4909, 4939, 4962): `24/10/2026`, `23/10/2026`, `22/10/2026`, `21/10/2026`.
  + Lời chào Supervisor (dòng 5294): `28/10/2026`.
  + Phê duyệt Supervisor (dòng 5521): `20/09/2026`.
  + Danh sách hoàn thành Supervisor (dòng 5798, 5816, 5834, 5852, 5870): `26/10/2026`, `24/10/2026`, `21/10/2026`, `18/10/2026`, `14/10/2026`.
  + Phản ánh Reporter (dòng 6293-6327, 6441-6519, 7737): `#RR-2026-0041`, `#RR-2026-0028`, `#RR-2026-0012`, các ngày 15/09/2026, 16/09/2026, 18/09/2026, và hàm phát sinh mã `#RR-2026-`.

---

## 3. KẾT QUẢ KIỂM CHỨNG (VERIFICATION)
- **Grep 2023 trong thư mục `RoadGuard_Wireframes`:** 0 kết quả trong code HTML (chỉ còn dòng strikethrough giải trình trong tài liệu đặc tả).
- **Grep 2025 trong thư mục `RoadGuard_Wireframes`:** 0 kết quả trong code HTML (chỉ còn mốc Baseline 12/2025 trong tài liệu đặc tả).
- **Grep `placeholder_ortho.jpg`:** 0 kết quả trong code HTML (100% thay bằng SVG inline).
- **Phân định nền tảng:** 100% khớp kiến trúc 23 Mobile / 21 Web theo `27_9_V3`.

**KẾT LUẬN: PHASE 1 ĐÃ HOÀN TẤT THÀNH CÔNG 100% SẴN SÀNG CHUYỂN SANG PHASE 2.**
