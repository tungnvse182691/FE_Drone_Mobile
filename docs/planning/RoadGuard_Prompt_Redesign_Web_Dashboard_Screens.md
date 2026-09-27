# HƯỚNG DẪN & PROMPT THI CÔNG: TÁCH BIỆT VÀ THIẾT KẾ LẠI GIAO DIỆN WEB DASHBOARD (21 MÀN HÌNH) TRONG ROADGUARD WIREFRAMES

> **Dành cho:** AI Coding Agent (Bản IDE Antigravity)  
> **Người giao việc:** Sếp Nguyễn Văn Tùng (FE & QA Lead)  
> **Tài liệu tham chiếu chuẩn:** `D:\Do_AN_Drone\27_9_V3\` (Đặc biệt là `04_UI_UX/01_Wireframe_Annotations.md` và `09_Frontend/01_FE_Scope_Implementation_Guide.md`)  
> **Thư mục mục tiêu:** `D:\Do_AN_Drone\RoadGuard_Wireframes\` (`index.html` và `Wireframe_Specification.md`)

---

## 1. PHÂN TÍCH BẢN CHẤT VẤN ĐỀ (VÌ SAO GIAO DIỆN HIỆN TẠI BỊ COI LÀ "BẤY NHẦY / SAI NGHIỆP VỤ")

### 1.1. Sai lầm kiến trúc cốt lõi
Hiện tại trong `RoadGuard_Wireframes/index.html`, **toàn bộ 44 màn hình** (bao gồm 23 màn Mobile và 21 màn Web) đang bị nhồi nhét chung vào một khung **điện thoại di động Android khổ dọc 390px x 780px** (`#deviceFrame`).
- **Hậu quả trực quan:** 
  - Màn hình Quản lý dự án (PM) và Ban Giám sát (Supervisor) là các hệ điều hành Web Desktop phục vụ cán bộ kỹ sư ngồi văn phòng/phòng điều hành trên màn hình máy tính (1280px - 1920px), nhưng lại bị bóp nghẹt vào khung điện thoại 390px!
  - Xuất hiện vô lý: Thanh tai thỏ (Camera punch hole), loa thoại, thanh pin/sóng 5G điện thoại, và đặc biệt là thanh **Bottom Navigation 5 tab di động** ở dưới đáy màn hình Web!
  - Bảng biểu dữ liệu, biểu đồ KPI, bản đồ GIS, giao diện đối chiếu AI và gộp đợt sửa chữa bị tràn, cắt vụn, cuộn dọc chồng chéo, không thể thao tác như một ứng dụng Web chuyên nghiệp.

### 1.2. Phân định rõ ràng 2 nền tảng theo chuẩn 27_9_V3
Căn cứ tài liệu `27_9_V3\09_Frontend\01_FE_Scope_Implementation_Guide.md` (Mục 3) và `04_UI_UX\01_Wireframe_Annotations.md` (Mục 12.1):
1. **NỀN TẢNG MOBILE APP (23 Màn hình hiện trường):**
   - **Đối tượng sử dụng:** Phi công Drone (`DRONE_OPERATOR`), Đội sửa chữa hiện trường (`REPAIR_CREW`), Người dân & Chủ đầu tư (`REPORTER`), Màn Xác thực / Đổi mật khẩu bắt buộc (`AUTH`).
   - **Thiết bị:** Smartphone Android / Tablet dã chiến (Màn dọc 390px, có Status bar, hỗ trợ Offline First, nút bấm to tối ưu thao tác găng tay hiện trường, Bottom Nav chuẩn UX di động).
2. **NỀN TẢNG WEB DASHBOARD (21 Màn hình văn phòng điều hành):**
   - **Đối tượng sử dụng:** Quản lý dự án (`PROJECT_MANAGER` - 14 màn) và Ban Giám sát (`SUPERVISOR` - 7 màn).
   - **Thiết bị:** Máy tính để bàn / Laptop (Khổ ngang Desktop từ 1200px trở lên, giao diện Web hiện đại: **Sidebar bên trái**, **Topbar điều hướng phía trên**, **Content Workspace đa cột**, Bảng dữ liệu mật độ cao Data Table, Split-view đối chiếu ảnh/video AI, Modal hộp thoại xác nhận, hoàn toàn **KHÔNG CÓ Bottom Navigation di động** hay tai thỏ điện thoại).

---

## 2. KIẾN TRÚC MỤC TIÊU: DUAL-STAGE PROTOTYPE VIEWER

Để giữ trọn vẹn khả năng review tương tác 44 màn hình trên cùng 1 trang `RoadGuard_Wireframes/index.html`, Stage hiển thị trung tâm (`#stageContainer`) phải hoạt động theo cơ chế **Dual-Stage chuyển đổi thông minh**:

```
                       ┌────────────────────────────────────────────────────────┐
                       │                   TOP NAVIGATION BAR                   │
                       │  - Switcher lọc vai trò: Mobile (23) vs Web (21)       │
                       │  - Dropdown chọn 44 màn hình                           │
                       │  - Trực tuyến / Ngoại tuyến & Zoom Controls            │
                       └────────────────────────────────────────────────────────┘
                                                    │
                      ┌─────────────────────────────┴─────────────────────────────┐
                      ▼                                                           ▼
         KHI CHỌN MÀN MOBILE (23 MÀN)                                KHI CHỌN MÀN WEB (21 MÀN)
    [Drone, Crew, Reporter, Auth Gate]                                   [PM, Supervisor]
                      │                                                           │
                      ▼                                                           ▼
     ┌──────────────────────────────────┐                      ┌──────────────────────────────────────────────┐
     │      ANDROID PHONE MOCKUP        │                      │         DESKTOP WEB BROWSER MOCKUP           │
     │      (Khổ dọc 390px x 780px)     │                      │          (Khổ ngang 1150px - 1300px)         │
     │ ──────────────────────────────── │                      │ ──────────────────────────────────────────── │
     │ • Camera Notch + Loa thoại       │                      │ • Thanh tiêu đề cửa sổ (Red/Yellow/Green)    │
     │ • Status bar Android (09:41, 5G) │                      │ • Chrome Address bar (URL nội bộ Hoàng Hải)  │
     │ • Viewport cuộn dọc mượt mà      │                      │ • Left Sidebar cố định (w-60, Logo, Menu)    │
     │ • Bottom Nav 4-tab di động       │                      │ • Top Header bar (Breadcrumb, Search, User)  │
     │ • Thanh vạch cử chỉ vuốt đáy     │                      │ • Desktop Content Area (Lưới, Bảng, Split)   │
     │                                  │                      │ • KHÔNG Bottom Nav, KHÔNG tai thỏ/status bar │
     └──────────────────────────────────┘                      └──────────────────────────────────────────────┘
```

---

## 3. THIẾT KẾ CHI TIẾT GIAO DIỆN WEB CHO 21 MÀN HÌNH

### 3.1. Cấu trúc khung chuẩn Web Canvas (Desktop Shell)
Mọi màn hình Web thuộc PM và Supervisor sẽ được bọc trong một Desktop Shell chuẩn gồm:
- **Chrome Window Bar (shrink-0, h-9 bg-slate-800 px-4 flex items-center justify-between):**
  - 3 nút điều khiển cửa sổ macOS/Chrome: Đỏ `#EF4444`, Vàng `#F59E0B`, Xanh `#10B981`.
  - Thanh địa chỉ URL giả lập: `https://roadguard.hoanghai.vn/pm/dashboard` (hoặc `/supervisor/approvals`).
  - Badge trạng thái: SSL Secure, Hệ thống mạng nội bộ Công ty Hoàng Hải.
- **Bên trong cửa sổ Web (flex-1 flex overflow-hidden bg-[#F1F3F5]):**
  - **Left Web Sidebar (w-60 shrink-0 bg-[#1E293B] text-slate-300 flex flex-col justify-between border-r border-slate-700):**
    - Logo Hoàng Hải RoadGuard (Cam Đất / Vàng Đồng `#C9A227` + Trắng).
    - Role Badge: `QUẢN LÝ DỰ ÁN (PM)` hoặc `BAN GIÁM SÁT (SUPERVISOR)`.
    - Danh mục điều hướng Desktop:
      - *Menu PM:* Tổng quan (Dashboard), Khảo sát Drone (Surveys), Hộp thư lỗi AI (AI Inbox), Gộp đợt sửa chữa (Batching), Hồ sơ & Tuyến (Profile).
      - *Menu Supervisor:* Điều hành & Duyệt (Dashboard), Phê duyệt hồ sơ (Approvals), Bản đồ rủi ro GIS (Risk Heatmap), Báo cáo & Thống kê (Reports), Quản trị & Lưu trữ (Admin/Settings).
    - Chân Sidebar: Avatar người dùng, chức danh, nút Đăng xuất an toàn.
  - **Main Web Area (flex-1 flex flex-col overflow-hidden):**
    - **Web Top Header (h-14 shrink-0 bg-white border-b border-[#E2E5E9] px-6 flex items-center justify-between):**
      - Breadcrumb: `Trang chủ / Quản lý khảo sát / Tuyến ĐH.05`.
      - Project Selector Dropdown: `Dự án ĐH.05 - Biên Hòa - Dầu Giây (Km00 - Km18)`.
      - Search Input toàn cục & Nút Thông báo (Badge đỏ).
    - **Web Content Viewport (flex-1 overflow-y-auto p-6 space-y-6):**
      - Vùng chứa nội dung nghiệp vụ chi tiết của từng màn hình Web.

---

### 3.2. Đặc tả giao diện 14 màn hình Quản lý dự án (PM: M-PM-01 đến M-PM-14)

| Mã màn | Tên màn hình Web | Bố cục Desktop & Thành phần nghiệp vụ chi tiết |
|---|---|---|
| **M-PM-01** | **Tổng quan Quản lý dự án (PM Dashboard)** | • **4 Thẻ KPI ngang:** Tổng chiều dài tuyến (18.4 km), Lỗi AI chờ xác minh (12 mục - 4 CAO), Hồ sơ chờ Supervisor duyệt (5 đợt), Đợt sửa đang thi công (3 đội).<br>• **Lưới 2 cột:** Cột trái (65%): Bảng 5 sự cố mới nhất phát hiện từ Drone (Mã lỗi, Tuyến, Loại hư hỏng TCVN, Mức độ AI, Nút Xác minh nhanh); Cột phải (35%): Biểu đồ tiến độ khảo sát 3 kỳ & Thông báo khẩn cấp hiện trường. |
| **M-PM-02** | **Quản lý khảo sát Drone (Surveys Management)** | • **Toolbar bộ lọc Desktop:** Ô tìm kiếm, Dropdown Tuyến đường, Dropdown Trạng thái (Đang bay, Chờ nộp, Đã nộp, Cần bay lại), Nút CTA vàng `+ Phát hành lệnh khảo sát mới`.<br>• **Bảng dữ liệu Surveys Data Table:** Cột Mã đợt, Tuyến khảo sát, Phi công phụ trách, Ngày bay dự kiến, Hạn nộp video, Độ phủ dữ liệu (Coverage %), Trạng thái Telemetry SRT, Cột thao tác (Xem video / Chi tiết). |
| **M-PM-03** | **Tạo lệnh khảo sát mới (Create Survey Order)** | • **Bố cục Desktop Form 2 cột:**<br>- *Cột trái (Form nhập liệu):* Chọn Tuyến đường, Đoạn lý trình (Km01+200 đến Km05+800), Giao Phi công Drone, Chọn Ngày bay dự kiến & Hạn nộp (Có logic validate: Hạn nộp >= Ngày bay), Yêu cầu độ cao & độ phân giải 4K.<br>- *Cột phải (Bản đồ corridor tuyến đường):* Bản đồ vệ tinh hiển thị corridor tuyến ĐH.05, điểm tập kết xuất phát bay và vùng giới hạn an toàn hàng không.<br>- *Nút bấm chân trang:* Hủy lệnh / Phát hành yêu cầu khảo sát chính thức. |
| **M-PM-04** | **Hộp thư khuyết tật AI (AI Inbox Workspace)** | • **Bộ lọc ngang:** 5 loại khuyết tật (Ổ gà POTH, Nứt vỡ bề mặt SLAB_CRK, Lún võng DEPR, Hở khe JOIN_DEF, Sạt trượt BORDER), Mức độ rủi ro (Cao/Vừa/Thấp), Độ tin cậy AI (>80%, 60-80%, <60%).<br>• **Bảng kiểm soát sự cố AI mật độ cao:** Thumbnail Ortho 4K, Mã lỗi, Tọa độ GPS + Lý trình Km, Loại hư hỏng nhận diện, Độ tin cậy AI (%), Khuyến nghị xử lý sơ bộ UD-06, Checkbox chọn hàng loạt để gộp đợt, Nút bấm `Xác minh chi tiết`. |
| **M-PM-05** | **Xác minh lỗi AI - Biến thể A: Bounding Box (Verify Variant A)** | • **Workspace Desktop 2 cột (Split-view 65% / 35%):**<br>- *Cột trái (65%):* Trình chiếu Ortho Video / Ảnh 4K độ phân giải cao có Canvas vẽ Bounding Box màu đỏ của AI, gắn nhãn `AI #01 • 89%`, hiển thị tọa độ WGS84, thước tỷ lệ mét thực tế, thanh timeline phát video 00:42.<br>- *Cột phải (35% Inspector Panel):* Thông tin sự cố chi tiết (Mã lỗi, Tuyến đường, Độ sâu ước tính DSM: 7.5cm, Diện tích rạn nứt: 1.2m²); Trường ghi chú xác minh của PM; **3 Nút hành động nghiệp vụ:** `Xác nhận lỗi thật (Chuyển sang giỏ đợt)`, `Từ chối - Lỗi giả / Nhiễu AI`, `Yêu cầu bay bổ sung / Đo đạc thực địa`. |
| **M-PM-06** | **Xác minh lỗi AI - Biến thể B: So sánh đa kỳ (Verify Variant B)** | • **Workspace Đối chiếu đa kỳ (Multi-epoch Comparison):**<br>- 2 khung ảnh/video song song cạnh nhau: Ảnh Khảo sát kỳ trước (Baseline T09/2026) vs Ảnh Khảo sát kỳ này (Hiện tại T10/2026), có thanh trượt so sánh (Slider Before/After) trực quan.<br>- Bảng phân tích tốc độ phát triển hư hỏng (Độ sâu tăng từ 3cm lên 7.5cm, rạn nứt lan rộng +40%). Nút kích hoạt lệnh cử Đội khảo sát kiểm tra hiện trường. |
| **M-PM-07** | **Giao đo đạc thực địa (Field Inspection Task)** | • **Giao diện phân bổ nhiệm vụ:** Chọn Đội sửa chữa hiện trường (Crew), Thiết lập chế độ nhiệm vụ (`MEASURE_ONLY` - Chỉ đo đạc kiểm tra số liệu, KHÔNG được tự ý sửa), Quy định dụng cụ đo (Thước thẳng 3m, thước đo độ sâu cơ học, dưỡng đo khe nứt), Hạn chót nộp số đo. |
| **M-PM-08** | **Gộp đợt sửa chữa & Lập phương án kỹ thuật (Batching Workspace)** | • **Desktop Split Workspace:**<br>- *Bên trái (70%):* Bảng danh sách các sự cố đã xác minh hợp lệ cùng tuyến đường, có checkbox chọn hàng loạt.<br>- *Bên phải (30% Sticky Summary Drawer):* Thống kê đợt sửa chữa tự động theo quy tắc **UD-06**: Tổng số vị trí lỗi chọn (ví dụ: 3 điểm), Tổng diện tích xử lý kỹ thuật (S = 4.8 m²), Mức độ rủi ro cao nhất (`RỦI RO CAO`), Phương án kỹ thuật đề xuất (BTXM M350-HH-02 đông kết nhanh). **TUYỆT ĐỐI KHÔNG CÓ CỘT TIỀN / VNĐ**.<br>- Nút `Gửi Ban Giám sát thẩm định & Phê duyệt`. |
| **M-PM-09** | **Phân công đội sửa chữa (Crew Assignment Table)** | • **Bảng điều phối nhân lực:** Danh sách các Đội cơ động (Đội 01, Đội 02), khu vực phụ trách, trạng thái tải công việc hiện tại (Đang bận / Sẵn sàng), danh sách phương tiện và thiết bị thi công kèm theo. Nút phân bổ đợt sửa chữa cho đội phù hợp. |
| **M-PM-10** | **Trình duyệt hồ sơ đợt sửa (Submit Approval Dossier)** | • **Khung hồ sơ điện tử trình duyệt:** Mã đợt `KD-DH05-0185-0231`, tổng hợp đầy đủ bằng chứng ảnh hiện trạng, tọa độ GPS từng điểm, phương án kỹ thuật TCVN 10380:2014, chữ ký số dự thảo của Quản lý dự án, Nút bấm `Ký số & Phát hành hồ sơ sang Ban Giám sát`. |
| **M-PM-11** | **Xử lý hồ sơ bị trả về / Yêu cầu chỉnh sửa (Resubmit Workspace)** | • **Giao diện xử lý ý kiến Giám sát:** Hiển thị rõ ràng Hộp thông báo đỏ/vàng: "Ban Giám sát yêu cầu bổ sung bằng chứng đo độ sâu tại Km01+850"; Nhật ký phản hồi; Nút nộp lại hồ sơ sau khi cập nhật. |
| **M-PM-12** | **Theo dõi trạng thái các đợt sửa (Submitted Batches Status)** | • **Bảng Kanban / Status Table:** Cột Đang chờ duyệt (Pending), Đã duyệt (Approved - sẵn sàng thi công), Yêu cầu bổ sung (Need Revision), Đã nghiệm thu (Closed). Có bộ lọc nhanh theo tuần/tháng. |
| **M-PM-13** | **Nghiệm thu công việc sửa chữa (Work Order Acceptance)** | • **Desktop Review Desk:** Đối chiếu trực quan ảnh **TRƯỚC THI CÔNG (BEFORE)** vs ảnh **SAU THI CÔNG (AFTER)** đặt cạnh nhau; Bảng số đo thực tế sau khi sửa (Độ bằng phẳng, kích thước trám vá, mác bê tông nghiệm thu); Nút `Chấp thuận nghiệm thu & Đóng phiếu công tác`. |
| **M-PM-14** | **Hồ sơ cá nhân & Cấu hình tuyến đường PM (Profile & Project Scope)** | • Thông tin kỹ sư PM, Danh sách các đoạn tuyến đang được giao quản lý, Cấu hình thông báo tự động (Email/Hệ thống), Lịch sử hành động (Audit Logs). |

---

### 3.3. Đặc tả giao diện 7 màn hình Ban Giám sát (Supervisor: M-SUP-01 đến M-SUP-07)

| Mã màn | Tên màn hình Web | Bố cục Desktop & Thành phần nghiệp vụ chi tiết |
|---|---|---|
| **M-SUP-01** | **Bảng điều hành Ban Giám sát (Supervisor Command Dashboard)** | • **Thống kê an toàn & trách nhiệm bảo hành:** Tổng số khuyết tật rủi ro cao toàn dự án (2 vị trí), Hồ sơ đợt sửa chờ thẩm định (5 đợt), Đợt sửa đã hoàn thành nghiệm thu trong tháng (18 đợt).<br>• **Bảng phê duyệt khẩn:** Danh sách 5 hồ sơ đợt sửa do PM vừa trình lên kèm mức độ rủi ro, thời gian gửi, nút mở hồ sơ thẩm định ngay. |
| **M-SUP-02** | **Thẩm định & Phê duyệt đợt sửa chữa (Batch Approval Station)** | • **Bàn thẩm định hồ sơ kỹ thuật chuyên sâu:**<br>- Tiêu đề đợt sửa, Tuyến ĐH.05, Quản lý dự án lập hồ sơ.<br>- Bảng chi tiết từng sự cố trong đợt: Ảnh khuyết tật gốc, số đo hiện trường, phương án kỹ thuật đề xuất (UD-06: Cào bóc & vá nguội / BTXM mác cao).<br>- **4 Nút quyền hạn chuẩn theo 27_9_V3 (§12.3 WF-07.F01):**<br>  1. `APPROVE (Phê duyệt đợt sửa)` - Cấp phép thi công ngay.<br>  2. `REQUEST_EVIDENCE (Yêu cầu bổ sung bằng chứng)` - Bắt buộc nhập lý do.<br>  3. `REQUEST_RECONSIDER (Yêu cầu xem xét lại phương án)` - Trả lại cho PM điều chỉnh.<br>  4. `REJECT (Bác bỏ hồ sơ)` - Từ chối không chấp thuận. |
| **M-SUP-03** | **Bản đồ số rủi ro & Điểm đen giao thông GIS (Risk & Safety GIS Map)** | • **Bản đồ GIS toàn màn hình Desktop:** Hiển thị trục đường cao tốc/tỉnh lộ với các điểm ghim sự cố phân màu theo cấp độ (Đỏ: Nguy hiểm/Rủi ro cao; Vàng: Trung bình; Xanh: Đã xử lý).<br>• Lớp phủ Heatmap mật độ hư hỏng theo lý trình Km.<br>• Drawer bên phải mở ra xem chi tiết khuyết tật khi nhấp chuột vào ghim trên bản đồ. |
| **M-SUP-04** | **Báo cáo phân tích chất lượng & Bảo hành (Analytics & Reports)** | • **Hệ thống báo cáo chỉ số đường bộ:** Biểu đồ xu hướng phát sinh khuyết tật theo thời gian (Tháng 8, 9, 10), Tỷ lệ hoàn thành đúng tiến độ cam kết bảo hành, Phân bố loại hư hỏng theo TCVN 10380:2014.<br>• Nút `Xuất báo cáo PDF` và `Xuất dữ liệu hồ sơ ZIP`. |
| **M-SUP-05** | **Hộp thoại cấu hình xuất hồ sơ (Export Modal Dialog)** | • **Modal Desktop nổi giữa màn hình:** Tùy chọn định dạng (PDF Báo cáo tóm tắt, Excel bảng kê chi tiết, ZIP toàn bộ ảnh gốc 4K); Chọn phạm vi thời gian; Checkbox cam kết lưu trữ pháp lý (Legal Hold / Bảo hành 5 năm); Nút `Tải xuống gói hồ sơ`. |
| **M-SUP-06** | **Ký đóng đợt sửa & Nghiệm thu bàn giao (Sign-off & Warranty Acceptance)** | • **Bàn ký số nghiệm thu hoàn thành:** Biên bản tổng hợp kết quả thi công; Xác nhận chất lượng từ Ban Giám sát chủ đầu tư; Khung chữ ký số và con dấu xác thực của Công ty Hoàng Hải; Nút `Ký số nghiệm thu & Đóng hồ sơ bảo hành`. |
| **M-SUP-07** | **Hồ sơ Giám sát & Quản trị hệ thống (Supervisor Profile & Audit Trail)** | • Thông tin Giám sát trưởng, Quyền hạn phê duyệt, Nhật ký kiểm toán bảo mật (Audit log ghi nhận toàn bộ lịch sử Duyệt / Trả / Bác bỏ hồ sơ), Thiết lập lưu trữ và thời hạn dữ liệu (Retention policy). |

---

## 4. KẾ HOẠCH HÀNH ĐỘNG CHI TIẾT (ACTION PLAN) CHO IDE AGENT

Khi nhận lệnh thi công, IDE Agent phải tuân thủ nghiêm ngặt quy trình 5 bước sau:

### Bước 1: Tái cấu trúc Stage thành Dual-Stage trong `RoadGuard_Wireframes/index.html`
1. Thay đổi cấu trúc vùng trung tâm `<main>` trong `index.html`:
   - Giữ nguyên khung `#phoneFrameContainer` (chứa Phone Scaler và Device Frame 390px x 780px) để phục vụ cho các màn Mobile (`role === 'drone' | 'crew' | 'reporter' | 'auth'`).
   - Bổ sung khung `#webFrameContainer` (chứa Desktop Browser Window 1150px - 1300px responsive với macOS Chrome header bar, Sidebar trái w-60, Topbar h-14 và Main Content Area) để phục vụ cho các màn Web (`role === 'pm' | 'supervisor'`).
2. Sửa hàm `navigateTo(screenId)` trong JavaScript:
   - Đọc thuộc tính `role` trong `screensMeta[screenId]`:
     - Nếu `role === 'pm' || role === 'supervisor'`: Ẩn `#phoneFrameContainer`, Hiển thị `#webFrameContainer`. Đặt màn hình web tương ứng vào Content Viewport của Web Frame. Ẩn toàn bộ Mobile Bottom Navs.
     - Nếu `role === 'drone' || role === 'crew' || role === 'reporter' || role === 'auth'`: Ẩn `#webFrameContainer`, Hiển thị `#phoneFrameContainer`. Hiển thị Bottom Nav tương ứng của vai trò di động.
   - Luôn đặt `scrollTop = 0` cho viewport khi chuyển màn hình để tránh lỗi mất đầu trang.

### Bước 2: Chuyển đổi toàn bộ 14 màn hình Quản lý dự án (PM) sang Desktop UI
- Chuyển mã HTML của `screen-pm-home`, `screen-pm-surveys`, `screen-pm-create-survey`, `screen-pm-ai-inbox`, `screen-pm-verify-a`, `screen-pm-verify-b`, `screen-pm-field-task`, `screen-pm-batching`, `screen-pm-assign-crew`, `screen-pm-submit-approval`, `screen-pm-resubmit`, `screen-pm-submitted-tab`, `screen-pm-wo-confirm`, `screen-pm-profile` sang các thẻ div chuẩn Desktop (Lưới multi-column, bảng Data Table có hover/sorting, thanh công cụ ngang, split workspace).
- Đảm bảo tuân thủ nghiêm ngặt **UD-06: Zero Cost** (không có bất kỳ cột chi phí/giá tiền VNĐ nào trong màn Batching và Approval).

### Bước 3: Chuyển đổi toàn bộ 7 màn hình Ban Giám sát (Supervisor) sang Desktop UI
- Chuyển mã HTML của `screen-sup-home`, `screen-sup-approve`, `screen-sup-risk`, `screen-sup-reports`, `screen-sup-export-modal`, `screen-sup-signoff`, `screen-sup-profile` sang Desktop UI.
- Thể hiện rõ bàn thẩm định hồ sơ với 4 nút thẩm quyền: `APPROVE`, `REQUEST_EVIDENCE`, `REQUEST_RECONSIDER`, `REJECT`.
- Bản đồ rủi ro GIS hiển thị rộng rãi, chuyên nghiệp theo khổ màn hình máy tính.

### Bước 4: Đồng bộ tài liệu đặc tả `Wireframe_Specification.md`
- Cập nhật các bảng phân loại màn hình trong `Wireframe_Specification.md`, nêu rõ 23 màn thuộc Android Mobile App và 21 màn thuộc Web Management Dashboard.
- Cập nhật hướng dẫn UX/UI tương ứng.

### Bước 5: Kiểm thử tự động & Báo cáo Worklog
- Chạy script kiểm tra cân bằng thẻ HTML (`audit_tags.py`) đảm bảo 0 lỗi mismatch / extra closing.
- Dùng Review Skill / Playwright chụp ảnh kiểm tra thực tế cả 2 chế độ Mobile và Web Desktop.
- Ghi chép nhật ký bàn giao đầy đủ vào `FE_AppMobile/docs/worklogs/WF-07-web-dashboard-redesign.md`.

---

## 5. CÁC NGUYÊN TẮC BẤT DI BẤT DỊCH (INVARIANTS)
1. **Tuyệt đối không xóa 2 file person của Sếp:** Giữ nguyên vẹn `RoadGuard_Plan_Person_1.md` và `RoadGuard_Plan_Person_2.md`.
2. **Quy tắc Zero-Cost (UD-06):** Tuyệt đối không tự ý thêm đơn giá, thành tiền hay VNĐ vào các màn hình gộp đợt, thẩm định và phê duyệt.
3. **Thương hiệu chuẩn:** Logo Hoàng Hải, Tone màu Vàng Đồng `#C9A227`, Vàng Nhạt `#FEF3E2`, Nền Xám Slate `#1E293B` / `#0F172A`, Tiêu chuẩn kỹ thuật đường bộ bê tông xi măng `TCVN 10380:2014`.
4. **Không làm hỏng 23 màn Mobile hiện trường:** Các màn Drone Operator, Repair Crew, Reporter đã được căn chỉnh hoàn hảo trên khung Phone, tuyệt đối không làm gãy vỡ layout mobile khi bổ sung chế độ Web.
