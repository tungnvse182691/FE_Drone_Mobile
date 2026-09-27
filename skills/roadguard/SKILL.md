---
name: roadguard
description: "Skill chuyên cho DỰ ÁN RoadGuard (hệ thống bảo hành & sửa chữa hạ tầng đường bộ của Công ty TNHH Xây dựng Bê tông Hoàng Hải). Bắt buộc dùng BẤT CỨ KHI NÀO làm việc trong repo RoadGuard — scaffold FE_AppMobile (Expo Router + TypeScript), sửa bug, thêm tính năng, review code, viết backend C#/ASP.NET Core, hay thay đổi bất cứ file nào thuộc dự án này. Skill này độc lập hoàn toàn: nhúng sẵn kỷ luật chống AI 'ngáo' + toàn bộ đặc tả dự án chuẩn hóa Canonical R3 / 27_9_V3 (Hoàng Hải, TCVN 10380:2014, Phi tài chính UD-06, stack Expo Router + Fabric, 3 vai trò mobile hiện trường: CREW, DRONE, REPORTER, Fast Track sửa nhanh, hợp đồng API 133 operations từ 09_Frontend, 5 mã khuyết tật chuẩn, 100% MaterialIcons - CẤM Ionicons). Phối hợp chặt chẽ với skill 'code-review' để tự kiểm chứng 0 lỗi compiler."
---

# RoadGuard Skill: Kỷ Luật Chống AI Ngáo + Đặc Tả Dự Án Hoàng Hải (Chuẩn R3 / 27_9_V3)

Skill này **độc lập hoàn toàn** — thay thế mọi skill generic cho dự án RoadGuard. Nó bao gồm:
- **PHẦN A:** Kỷ luật chống bịa & quy trình 6 bước bắt buộc.
- **PHẦN B:** Nguồn-sự-thật & đặc tả kỹ thuật chuẩn hóa Canonical R3 của RoadGuard.

---

## ⚠️ ĐIỀU KHOẢN OVERRIDE TỐI CAO (CANONICAL PRIORITY)
**Mọi quy định trong mục "Chuẩn Hóa Canonical R3 (27/09/2026 / 27_9_V3)" dưới đây có hiệu lực ưu tiên cao nhất, OVERRIDE (đè) lên toàn bộ các tài liệu đặc tả lịch sử (thư mục cũ `14-9/`, `22_9/` và các file spec v1/v2 cũ):**

1. **Thương hiệu & Định danh:**
   - Đối tác thực tế: **Công ty TNHH Xây dựng Bê tông Hoàng Hải** (gọi tắt: Bê tông Hoàng Hải).
   - Package: `com.hoanghai.roadguard`, scheme `roadguard`, domain email: `@hoanghai.vn`.
   - Tiền tố nhân sự / thiết bị / chuyến bay: chuyển sang `HH-` (`HH-RC-084`, `HH-2089`, `M350-HH-02`, `#HH-409...`).
2. **Quy tắc phân tách Logo:**
   - *Màn Splash / Loading:* Sử dụng `assets/logo_hoanghai.png` (có đầy đủ tên công ty và slogan).
   - *Màn hình nội bộ, AppHeader, App Icon:* Sử dụng `assets/logo_hoanghai_icon.png` (chỉ biểu tượng xe bồn bê tông, tuyệt đối KHÔNG có chữ).
3. **Phân định Nền tảng & 3 Vai Trò Mobile Cốt Lõi:**
   - **Mobile App (`FE_AppMobile`):** Phục vụ độc quyền **3 vai trò hiện trường**:
     1. `REPAIR_CREW` (`(crew)`): Kỹ thuật viên / Đội sửa chữa hiện trường.
     2. `DRONE_OPERATOR` (`(drone)`): Phi công điều khiển drone khảo sát & thu thập dữ liệu 4K RGB.
     3. `REPORTER` (`(reporter)`): Người dân phản ánh & Đại diện Ban QLDA / Chủ đầu tư (đăng nhập/xác thực OTP Gmail, gửi phản ánh + GPS + tối đa 3 ảnh, tra cứu tiến độ công khai qua mã tracking, đánh giá 1-5 sao).
   - **Web Dashboard:** Phục vụ 2 vai trò quản lý: `PROJECT_MANAGER` (PM) và `SUPERVISOR` (Giám sát viên). Các màn hình PM và Supervisor cũ trên mobile được chuyển lưu trữ tại `archive/web-screens/` nhằm tập trung tài nguyên mobile cho 3 vai trò hiện trường.
4. **Cơ chế Nghiệp vụ Fast Track & Task Mode (US-33, BR-05, BR-08, BR-11..18, BR-25):**
   - **Chế độ công việc (`TaskMode`):**
     - `INSPECT_AND_REPAIR`: Đo kiểm và được phép sửa nhanh nếu đủ điều kiện.
     - `MEASURE_ONLY`: Chỉ đo đạc hiện trường, cấm tự ý sửa tại chỗ (áp dụng cho đợt gom nhiều lỗi US-35 / BR-09).
   - **Điều kiện kích hoạt Fast Track tại chỗ:**
     - Nhiệm vụ được giao ở chế độ `INSPECT_AND_REPAIR`.
     - Kích thước đo đạc thực tế không vượt ngưỡng quy định trong `FastTrackPolicyVersion` (tham chiếu: diện tích $\le 1.0\text{ m}^2$, độ sâu $\le 5\text{ cm}$, chiều dài $\le 2.0\text{ m}$).
     - Đã có bằng chứng ảnh hiện trạng TRƯỚC khi sửa (BEFORE).
   - **Quy trình nghiệm thu Fast Track:**
     - Crew sửa xong chụp ảnh SAU (AFTER) và gửi báo cáo.
     - **PM trực tiếp đánh giá, xác nhận hoàn thành và đóng lỗi.**
     - **Supervisor KHÔNG phê duyệt các hạng mục Fast Track** (BR-25: tối ưu thời gian, không thêm gate duyệt của Supervisor cho sửa nhanh).
5. **Tái sử dụng bằng chứng ảnh (Evidence Reuse - BR-17, BR-18):**
   - Ảnh chụp của Người dân (Reporter) hoặc ảnh Drone có thể được tái sử dụng làm ảnh BEFORE nếu xác định đúng vị trí và phản ánh đúng hiện trường khuyết tật, giúp Crew không phải chụp trùng lặp.
6. **Chỉ đường điều hướng WGS84 (US-40, BR-38):**
   - Tích hợp mở ứng dụng chỉ đường ngoài (Google Maps) theo tọa độ WGS84.
   - Đối với Crew: Dẫn đường trực tiếp đến tọa độ khuyết tật cần xử lý.
   - Đối với Drone Operator: Dẫn đường đến **Điểm tiếp cận / Điểm tập kết cất-hạ cánh** (Rendezvous / Access Point), không dẫn vào tim đường bất khả thi.
7. **Phạm vi Phi tài chính UD-06 (Zero Presentation Cost):**
   - Hợp đồng bảo hành giữ lại 3–5% theo Nghị định 06/2021/NĐ-CP. Tầng giao diện người dùng Mobile (`app/`) **TUYỆT ĐỐI ZERO CHI PHÍ**.
   - CẤM input, cấm render, cấm hiển thị: "dự toán", "kinh phí", "chi phí (VNĐ)", "42.500.000 VNĐ", "74.900.000 VNĐ".
   - CẤM định mức/tiêu hao vật liệu (số tấn đá, số bao xi măng, lít phụ gia Sika...).
   - BẮT BUỘC thay thế bằng bộ 3 thông số kỹ thuật thi công: **Phương án xử lý kỹ thuật** + **Kích thước hình học hư hại thực tế** (diện tích m², độ sâu cm, chiều dài m) + **Thời hạn hoàn thành**.
8. **Vật liệu & Tuyến đường:**
   - Đường bê tông nông thôn (BTXM) theo **TCVN 10380:2014** (chiều dày 18–22cm, kích thước tấm 3.5m x 5.0m). CẤM nhựa đường asphalt.
   - **Tuyến ĐH.05 (Huyện Bình Chánh, TP.HCM)** là Tuyến khảo nghiệm chính chuẩn hóa 100% dữ liệu (Pilot Primary Corridor) với 3 phân đoạn: Vĩnh Lộc B, Cầu Bà Lát (Km01+850), Tân Kiên (Km03+100).
   - Khảo sát bằng **4K RGB + DSM (OpenDroneMap)**. Tuyệt đối **CẤM LiDAR** (Red Flag).
9. **Nguồn sự thật Khuyết tật (Single Source of Truth):**
   - Bắt buộc dùng `src/constants/defect-types.ts` với 5 mã chuẩn:
     1. `POTH_DEEP` — Ổ gà sâu vỡ tấm bê tông
     2. `DEPR_POND` — Lún võng đọng nước
     3. `EDGE_BRK` — Vỡ mép tấm bê tông
     4. `SLAB_CRK` — Nứt tấm bê tông
     5. `SHLD_EROS` — Xói lở vai đường
   - Mã phân loại bắt buộc dùng `DefectTypeCode` và hiển thị bằng `defectTypeLabel(code)`.

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
**B2 — Thu thập evidence.** Đọc file cần sửa, file gọi, type liên quan, spec tương ứng trong `docs/specs/` và `docs/specs/09_Frontend/`.  
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

## PHẦN B — Nguồn-sự-thật & đặc tả kỹ thuật RoadGuard R3 (27_9_V3)

### B0. Nguồn-sự-thật (đọc theo thứ tự ưu tiên)
| Ưu tiên | File | Vai trò |
|---|---|---|
| **0** | **Điều khoản Override Tối cao** ở đầu SKILL.md | **LUẬN ĐIỂM TỐI CAO** — Đè bẹp mọi mâu thuẫn lịch sử |
| 1 | `D:\Do_AN_Drone\27_9_V3\09_Frontend\` (tất cả 13 file: `01_FE_Scope_Implementation_Guide.md` đến `13_Source_References.md`, `contracts/operation_catalog.md`, `contracts/api.types.ts`, `contracts/local.types.ts`) | **Nguồn sự thật FE-R3-v1 (27/09/2026)** — Hợp đồng kỹ thuật FE/Mobile chính thức của nhóm trưởng |
| 2 | `D:\Do_AN_Drone\27_9_V3\02_Requirements\` (`01_FRD_SRS.md`, `02_Business_Rules.md`, `04_Use_Cases.md`, `05_User_Stories_Acceptance_Criteria.md`) | Logic Use Case / Business Rules / FR chuẩn R3 |
| 3 | `D:\Do_AN_Drone\27_9_V3\04_UI_UX\01_Wireframe_Annotations.md` | 12 Wireframes WF-01..WF-12 & button logic |
| 4 | `FE_AppMobile/skills/BOOTSTRAP_PROMPT.md` | Đặc tả scaffold mobile & routing (cần đọc cùng nguồn 1) |
| 5 | `FE_AppMobile/skills/DESIGN.md` | Design system & minimalism tokens |
| 6 | `RoadGuard_Wireframes/Wireframe_Specification.md` + `index.html` | Bố cục wireframe tham khảo (thấp nhất) |

### B1. Thông tin dự án
- **RoadGuard:** Hệ thống quản lý bảo hành & sửa chữa hạ tầng đường bộ của **Công ty TNHH Xây dựng Bê tông Hoàng Hải**.
- App mobile phục vụ **3 vai trò hiện trường**:
  - `DRONE_OPERATOR` (`(drone)`): 7 màn hình
  - `REPAIR_CREW` (`(crew)`): 10 màn hình
  - `REPORTER` (`(reporter)`): 4 màn hình (M-REP-01..04)
- Tầng Auth: 3 màn hình (`app/(auth)/index.tsx`, `force-change-password.tsx`, `otp-verify.tsx`).
- Màn hình PM & Supervisor cũ: Di chuyển vào `archive/web-screens/` cho Web Dashboard, tách biệt khỏi app mobile.

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
   - `/(reporter)/home`, `/(reporter)/report`, `/(reporter)/track`, `/(reporter)/feedback`
   - `/(auth)`, `/(auth)/force-change-password`, `/(auth)/otp-verify`
3. **Khai báo route tập trung tại `src/constants/routes.ts`:**
   - Mọi mapping như `ROLE_HOMES` đặt tại `src/constants/routes.ts`.

### B4. Offline-first & Queue (Theo 09_Frontend/09_Offline_App_Sync_Spec.md)
- **LocalState:** `DRAFT` $\rightarrow$ `WAITING_DEPENDENCIES` $\rightarrow$ `READY` $\rightarrow$ `IN_FLIGHT` $\rightarrow$ `ACKED` (hoặc `CONFLICT`, `REJECTED`, `PAUSED_RETRY`, `UNKNOWN_OUTCOME`, `BLOCKED_CONTRACT`, `AUTH_REQUIRED`).
- **Store SQLite phân vùng:** `account_partition`, `task_pack`, `server_cache`, `draft`, `media_asset`, `outbox_intent`, `wire_command`, `upload_ledger`, `id_map`, `conflict_record`.
- **Media Asset Lifecycle:** Ghi file tạm $\rightarrow$ đóng file $\rightarrow$ tính SHA-256 $\rightarrow$ atomic rename $\rightarrow$ commit SQLite media. Trạng thái: `LOCAL_SAVING` $\rightarrow$ `LOCAL_READY` $\rightarrow$ `UPLOADING` $\rightarrow$ `VERIFIED`.
- **Mutation Headers:** Luôn kèm `Idempotency-Key` (UUID) và `If-Match` (ETag) cho mọi mutation có trạng thái.

### B5. Bảng Mã Lỗi Nghiệp Vụ Chuẩn R3 (03_Error_Response_UI_Convention.md)
Khi nhận mã lỗi từ server hoặc kiểm tra cục bộ, UI phải hiển thị thông báo nghiệp vụ tương ứng:
- `TASK_MODE_NOT_REPAIRABLE`: "Nhiệm vụ này chỉ cho phép kiểm tra/đo; lưu kết quả đo và báo PM."
- `POLICY_NOT_CONFIGURED`: "Chưa cấu hình chính sách Fast Track; giữ nháp, liên hệ PM."
- `FAST_TRACK_NOT_ELIGIBLE`: "Không đủ điều kiện sửa nhanh; kích thước vượt ngưỡng policy."
- `PM_REPAIR_BLOCKED`: "PM đã khóa quyền tự sửa cho công việc này."
- `BEFORE_MISSING`: "Bổ sung bằng chứng ảnh hiện trạng TRƯỚC khi sửa."
- `EVIDENCE_PENDING`: "Ảnh chưa được máy chủ xác minh toàn vẹn."
- `FILE_INTEGRITY_FAILED`: "Tệp kiểm tra SHA-256 không khớp."
- `OFFLINE_SNAPSHOT_CONFLICT`: "Nhiệm vụ hoặc chính sách đã thay đổi trên server; giữ bằng chứng, chờ PM giải quyết."
- `IDEMPOTENCY_KEY_REUSED`: "Mã thao tác đã được sử dụng trước đó."
- `OPERATION_IN_PROGRESS`: "Đang đối chiếu thao tác trước đó, vui lòng chờ."
- `CASE_HAS_OPEN_REQUIRED_ITEMS`: "Hồ sơ còn hạng mục chưa hoàn tất; không thể đóng tổng."
- `TELEMETRY_INSUFFICIENT`: "Thiếu dữ liệu telemetry xác định; không hiển thị 'Không có lỗi'."
- `OUTSIDE_ASSIGNED_SCOPE`: "Vị trí không thuộc phạm vi được giao; ghi nhận riêng theo quyền."

### B6. Design Tokens (`src/design-tokens.ts`)
- `colors.primary`: `#C9A227` (Vàng đồng — tối đa 1 CTA chính/màn + tab active + KPI).
- `surface`: `#FFFFFF` (Card), `surfaceAlt`: `#F8F9FA` (Nền màn hình), viền 1px `#E2E5E9`.
- Severity chips: Xanh lá (`#2F9E44`), Cam (`#F59E0B`), Đỏ (`#E5484D`). TUYỆT ĐỐI KHÔNG dùng vàng đồng cho severity lỗi.
- Task mode & Policy chips: Xanh lục `#2F9E44` cho Fast Track Đạt Policy, Cam `#F59E0B` cho Vượt Policy, Xám `#2D3748` cho Chỉ đo đợt.
- Bo góc: 12px (Card), 8px (Button/Input), full 9999px (Chip). Không dùng shadow đậm hay gradient.

---

### B7. 10 Invariants Bất Phá (từ `27_9_V3/09_Frontend/01_FE_Scope_Implementation_Guide.md`)

Các bất biến sau KHÔNG ĐƯỢC phá trong bất kỳ tình huống nào:

1. **Saved local ≠ Sent ≠ File VERIFIED ≠ Task done ≠ Accepted ≠ Published** — Sáu trạng thái hoàn toàn độc lập, không thay thế nhau.
2. **Token expiry ≠ hết quyền tác nghiệp offline** — Snapshot đã tải vẫn dùng được offline; server sync cần auth hiện hành.
3. **Mỗi ý định có `operationId`/`idempotency-key` ổn định** — Timeout hay cancel không chứng minh server rollback.
4. **Không gửi local temp ID hoặc unknown enum** — Không bypass type checking bằng cách gửi giá trị chưa map.
5. **BEFORE đúng nguồn phải được gắn trước sửa** — Không đổi AFTER thành BEFORE; ảnh tái dùng giữ nguyên provenance.
6. **Không silent overwrite khi policy/assignment/version đổi** — Q04/Q17 vẫn còn mở, không tự giải quyết.
7. **Fast Track đủ điều kiện KHÔNG chờ PM duyệt từng số đo** — PM kiểm/đóng SAU khi Crew gửi AFTER, Supervisor nhận báo.
8. **Notification/realtime/cache không là nguồn cấp quyền hay ACK** — Phải verify qua server state.
9. **Offline store partition theo account+môi trường** — Logout không xóa bằng chứng chưa sync; không lộ data account khác.
10. **Các limits trong FE là đề xuất cấu hình** — Không tự gắn SLA/quota/URL production chưa được DevOps cung cấp.

---

### B8. Mẫu Giao Việc AI & Rate Limit Budget

#### Mẫu giao task cho AI coding agent (từ `01_FE_Scope_Implementation_Guide.md §6`):

```text
Nguồn: FE-R3-v1 và D:\Do_AN_Drone\27_9_V3\09_Frontend\contracts\openapi.baseline.yaml.
Feature: [tên màn hình / tính năng], actor/scope: [CREW|DRONE|REPORTER|PM|SUP],
operationId: [từ operation_catalog.md], FR: [FR-xx].
Đọc repo instructions/README/package/build files trước khi sửa.
Giữ wire fields/enum/nullability/error shape; không tự thêm query/header/endpoint.
Implement loading/empty/error/stale/offline/conflict theo phạm vi feature.
Queue/media cần durable storage và exact replay; không localStorage evidence/token mặc định.
Nếu gặp FE-GAP liên quan: làm adapter/mock có nhãn, không giả production support.
Báo cáo: diff, migration/recovery, dependencies và phần còn blocked.
```

#### Rate Limit / Retry Budget (từ `08_Rate_Limit_Timeout_Retry.md`):

| Tác vụ | Timeout | Retry tự động |
|---|---|---|
| GET JSON | 15 giây | Tối đa 2 lần (transient, có jitter) |
| Login/OTP/Refresh | 15 giây | **Không retry tự động** |
| Mutation có dedup key | 30 giây | Tối đa 2 lần (cùng key/payload) |
| Upload 1 part | 120 giây | Tối đa 3 lần (cùng session/part/bytes) |
| Background sync | — | Tối đa 5 attempt trong 1 lượt drain → `PAUSED_RETRY` |

**Quy tắc timeout UI:** Sau timeout mutation → hiển thị **"Chưa xác nhận được kết quả, đang kiểm tra"** — TUYỆT ĐỐI KHÔNG hiển thị "Gửi thất bại" khi chưa rõ server state.