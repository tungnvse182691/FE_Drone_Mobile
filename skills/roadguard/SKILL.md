---
name: roadguard
description: "Skill chuyên cho DỰ ÁN RoadGuard (hệ thống bảo hành & sửa chữa hạ tầng đường bộ của Công ty TNHH Xây dựng Bê tông Hoàng Hải). Bắt buộc dùng BẤT CỨ KHI NÀO làm việc trong repo RoadGuard — scaffold FE_AppMobile (Expo Router + TypeScript), sửa bug, thêm tính năng, review code, viết backend C#/ASP.NET Core, hay thay đổi bất cứ file nào thuộc dự án này. Skill này độc lập hoàn toàn: nhúng sẵn kỷ luật chống AI 'ngáo' + toàn bộ đặc tả dự án chuẩn hóa Canonical (Hoàng Hải, TCVN 10380:2014, Phi tài chính UD-06, stack Expo Router + Fabric, 40 màn mobile cốt lõi + 4 Reporter wireframe, 5 mã khuyết tật chuẩn). Kích hoạt ngay cả khi user chỉ nói 'RoadGuard', 'FE_AppMobile', 'Bê tông Hoàng Hải', 'đồng bộ ngoại tuyến', 'màn M-DRONE-01' v.v. mà không gọi tên skill."
---

# RoadGuard Skill: Kỷ Luật Chống AI Ngáo + Đặc Tả Dự Án Hoàng Hải

Skill này **độc lập hoàn toàn** — thay thế mọi skill generic cho dự án RoadGuard. Nó bao gồm:
- **PHẦN A:** Kỷ luật chống bịa & quy trình 6 bước bắt buộc.
- **PHẦN B:** Nguồn-sự-thật & đặc tả kỹ thuật chuẩn hóa Canonical của RoadGuard.

---

## ⚠️ ĐIỀU KHOẢN OVERRIDE TỐI CAO (CANONICAL PRIORITY)
**Mọi quy định trong mục "Chuẩn Hóa Canonical (26/09/2026)" dưới đây có hiệu lực ưu tiên cao nhất, OVERRIDE (đè) lên toàn bộ các tài liệu đặc tả lịch sử (thư mục `docs/specs/`, `14-9/`, `22_9/`):**

1. **Thương hiệu & Định danh:**
   - Đối tác thực tế: **Công ty TNHH Xây dựng Bê tông Hoàng Hải** (gọi tắt: Bê tông Hoàng Hải).
   - Package: `com.hoanghai.roadguard`, scheme `roadguard`, domain email: `@hoanghai.vn`.
   - Tiền tố nhân sự / thiết bị / chuyến bay: chuyển sang `HH-` (`HH-RC-084`, `HH-2089`, `M350-HH-02`, `#HH-409...`).
2. **Quy tắc phân tách Logo:**
   - *Màn Splash / Loading:* Sử dụng `assets/logo_hoanghai.png` (có đầy đủ tên công ty và slogan).
   - *Màn hình nội bộ, AppHeader, App Icon:* Sử dụng `assets/logo_hoanghai_icon.png` (chỉ biểu tượng xe bồn bê tông, tuyệt đối KHÔNG có chữ).
3. **Phạm vi Phi tài chính UD-06 (Zero Presentation Cost):**
   - Hợp đồng bảo hành giữ lại 3–5% theo Nghị định 06/2021/NĐ-CP. Tầng giao diện người dùng Mobile (`app/`) **TUYỆT ĐỐI ZERO CHI PHÍ**.
   - CẤM input, cấm render, cấm hiển thị: "dự toán", "kinh phí", "chi phí (VNĐ)", "42.500.000 VNĐ", "74.900.000 VNĐ".
   - CẤM định mức/tiêu hao vật liệu (số tấn đá, số bao xi măng, lít phụ gia Sika...).
   - BẮT BUỘC thay thế bằng bộ 3 thông số kỹ thuật thi công: **Phương án xử lý kỹ thuật** + **Kích thước hình học hư hại thực tế** (diện tích m², độ sâu cm, chiều dài m) + **Thời hạn hoàn thành**.
4. **Vật liệu & Tuyến đường:**
   - Đường bê tông nông thôn (BTXM) theo **TCVN 10380:2014** (chiều dày 18–22cm, kích thước tấm 3.5m x 5.0m). CẤM nhựa đường asphalt.
   - **Tuyến ĐH.05 (Huyện Bình Chánh, TP.HCM)** là Tuyến khảo nghiệm chính chuẩn hóa 100% dữ liệu (Pilot Primary Corridor) với 3 phân đoạn: Vĩnh Lộc B, Cầu Bà Lát (Km01+850), Tân Kiên (Km03+100).
   - Các tuyến `ĐH.01`, `ĐX.12`, `NT-08` trong dropdown khảo sát là Tuyến phụ (Secondary Corridors) dùng cho kiểm thử chọn đa tuyến.
   - Khảo sát bằng **4K RGB + DSM (OpenDroneMap)**. Tuyệt đối **CẤM LiDAR** (Red Flag).
5. **Nguồn sự thật Khuyết tật (Single Source of Truth):**
   - Bắt buộc dùng `src/constants/defect-types.ts` với 5 mã chuẩn:
     1. `POTH_DEEP` — Ổ gà sâu vỡ tấm bê tông
     2. `DEPR_POND` — Lún võng đọng nước
     3. `EDGE_BRK` — Vỡ mép tấm bê tông
     4. `SLAB_CRK` — Nứt tấm bê tông
     5. `SHLD_EROS` — Xói lở vai đường
   - Mã phân loại bắt buộc dùng `DefectTypeCode` và hiển thị bằng `defectTypeLabel(code)`. Phần mô tả hiện trường (display copy) được phép mô tả chi tiết.
6. **Ma trận Màn hình (40 Core + 4 Planned Delta):**
   - Đã hoàn thành 100% **40 màn hình mobile cốt lõi** phục vụ 4 vai trò: Drone Operator (7), Repair Crew (10), Project Manager (14), Supervisor (7) và Auth (2: `app/(auth)/index.tsx`, `force-change-password.tsx`).
   - Phân khu Người dân phản ánh (`Reporter`: M-REP-01 đến 04) là **Scope mở rộng (Planned Delta)** đã đóng băng trên HTML wireframe v3.3, chưa scaffold trong thư mục `app/`.

---

## PHẦN A — Kỷ luật chống AI ngáo (bắt buộc mọi task)

Nguyên nhân AI "ngáo" đã được nghiên cứu rõ: **viết trước khi đọc đủ** (premature commitment), **tưởng tượng thay vì chạy thật** (mental-reality gap), và **đoán tên/API thay vì tra cứu**.

### A1. 5 nguyên tắc vàng
1. **Evidence trước, edit sau.** AI chỉ được sửa file sau khi đã đọc file đó + các file liên quan (caller, type, test, config).
2. **Spec là source of truth, code chỉ là bản dịch.**
3. **Đừng tưởng tượng — hãy thực thi.** Chạy thật bằng `npm run typecheck` (`tsc --noEmit`), đọc output thật.
4. **Mọi tên đều phải có căn cứ.**
5. **Không chắc → hỏi, không đoán.**

### A2. Workflow 6 bước
**B1 — Hiểu yêu cầu.** Viết lại yêu cầu bằng 1-2 câu, gắn với mã màn `M-XXX` hoặc Use Case tương ứng.  
**B2 — Thu thập evidence.** Đọc file cần sửa, file gọi, type liên quan, spec tương ứng.  
**B3 — Plan mini (3-5 dòng).** Ghi rõ: sửa file nào, dòng nào, vì sao sửa.  
**B4 — Viết bám spec.** Diff nhỏ, giữ nguyên convention, không scope creep.  
**B5 — Tự kiểm chứng.** Chạy `npm run typecheck` xác nhận 0 lỗi.  
**B6 — Báo cáo ngắn.** Đã đổi gì, kiểm chứng bằng lệnh nào.

### A3. Checklist chống bịa
- [ ] Đường dẫn file đã kiểm tra tồn tại thật bằng lệnh.
- [ ] Tên hàm/biến/type đã grep thấy định nghĩa trong repo.
- [ ] Không tự chế mã khuyết tật ngoài 5 mã trong `src/constants/defect-types.ts`.
- [ ] Không import package mới nếu chưa được user đồng ý.
- [ ] Không render chi phí/tiền tệ lên màn hình mobile (UD-06).

### A4. Red flags — thấy dấu hiệu này thì DỪNG LẠI
- Nhắc tới LiDAR hoặc nhựa đường asphalt.
- Nhập/hiển thị chi phí VNĐ, dự toán tiền tệ.
- Dùng `<Redirect />` conditionally bọc ngoài `<Stack />` trong `RootLayout`.
- Dùng route thiếu group prefix như `/crew/tasks` thay vì `/(crew)/tasks`.

---

## PHẦN B — Nguồn-sự-thật & đặc tả kỹ thuật RoadGuard

### B0. Nguồn-sự-thật (đọc theo thứ tự ưu tiên)
| Ưu tiên | File | Vai trò |
|---|---|---|
| **0** | **Điều khoản Override Tối cao** ở đầu SKILL.md & AGENTS.md | **LUẬN ĐIỂM TỐI CAO** — Đè bẹp mọi mâu thuẫn lịch sử |
| 1 | `FE_AppMobile/skills/BOOTSTRAP_PROMPT.md` | Đặc tả scaffold mobile |
| 2 | `FE_AppMobile/skills/DESIGN.md` | Design system & minimalism |
| 3 | `RoadGuard_Wireframes/Wireframe_Specification.md` (v3.3) + `index.html` | Bố cục wireframe đóng băng |
| 4 | Tài liệu nghiệp vụ do Nhóm trưởng ban hành trong `docs/specs/` | Tham khảo logic Use Case / Entity của dự án |

### B1. Thông tin dự án
- **RoadGuard:** Hệ thống quản lý bảo hành & sửa chữa hạ tầng đường bộ của **Công ty TNHH Xây dựng Bê tông Hoàng Hải**.
- App mobile phục vụ **4 vai trò cốt lõi**:
  - `DRONE_OPERATOR` (`(drone)`): 7 màn hình
  - `REPAIR_CREW` (`(crew)`): 10 màn hình
  - `PROJECT_MANAGER` (`(pm)`): 14 màn hình
  - `SUPERVISOR` (`(sup)`): 7 màn hình
- Tầng Auth: 2 màn hình (`app/(auth)/index.tsx`, `force-change-password.tsx`).
- Tổng cộng: **40 màn hình mobile đã implement**. (Phân khu Reporter M-REP-01..04 là Planned Delta).

### B2. Stack được chốt
- **Expo Router** (file-based) + **TypeScript**
- **Zustand** thay Redux Toolkit · **TanStack Query** · **expo-sqlite** (offline-first)
- expo-camera, expo-location, expo-media-library, expo-file-system, expo-document-picker
- @expo/vector-icons, react-native-safe-area-context, react-native-gesture-handler, axios
- Font: **Roboto** (toàn bộ nội dung) + **Sansation** (chỉ logo/headline)

### B3. Quy tắc Navigation an toàn trên ReactFabric
1. **Giữ `<Stack screenOptions={{ headerShown: false }} />` luôn mount ổn định:**
   - CẤM conditionally return `<Redirect />` thay thế `<Stack />` trong `RootLayout`.
   - Mọi logic AuthGuard, kiểm tra `must_change_password`, chống nhảy chéo vai trò PHẢI đặt trong hook `useEffect` bằng `router.replace(...)`.
   - `app/index.tsx` là điểm entrypoint điều hướng ban đầu duy nhất.
2. **Bắt buộc dùng Full Group Prefix trong code điều hướng:**
   Tất cả `router.push()`, `router.replace()`, `<Redirect />` và mảng `tabs` trong `BottomNav` **PHẢI có đầy đủ tên group kèm ngoặc tròn**:
   - `/(crew)/home`, `/(crew)/tasks`, `/(crew)/wo-detail`, `/(crew)/sync`, `/(crew)/profile`
   - `/(drone)/home`, `/(drone)/requests`, `/(drone)/request-detail`, `/(drone)/sync`, `/(drone)/log`, `/(drone)/upload`, `/(drone)/profile`
   - `/(pm)/home`, `/(sup)/home`
   - `/(auth)`, `/(auth)/force-change-password`
3. **Khai báo route tập trung tại `src/constants/routes.ts`:**
   - Mọi mapping như `ROLE_HOMES` đặt tại `src/constants/routes.ts`.

### B4. Offline-first & Queue
- Chuỗi trạng thái upload: `LOCAL → QUEUED → UPLOADING → SERVER_CONFIRMED` (hoặc `INVALID`).
- Bảng SQLite: `local_draft`, `outbox`, `media_file`, `survey_cache`, `defect_cache`, `task_cache`.
- SHA-256 checksum tính trước khi gửi payload. Retry tối đa 5 lần.

### B5. Design Tokens (`src/design-tokens.ts`)
- `colors.primary`: `#C9A227` (Vàng đồng — tối đa 1 CTA chính/màn + tab active + KPI).
- `surface`: `#FFFFFF` (Card), `surfaceAlt`: `#F8F9FA` (Nền màn hình), viền 1px `#E2E5E9`.
- Severity chips: Xanh lá (`#2F9E44`), Cam (`#F59E0B`), Đỏ (`#E5484D`). TUYỆT ĐỐI KHÔNG dùng vàng đồng cho severity lỗi.
- Bo góc: 12px (Card), 8px (Button/Input), full 9999px (Chip). Không dùng shadow đậm hay gradient.