---
name: roadguard
description: "Dùng khi làm việc trong repo RoadGuard: scaffold, sửa code, audit, review hoặc cập nhật hướng dẫn dự án."
---

# RoadGuard Skill: Kỷ Luật Chống AI Ngáo + Đặc Tả Dự Án Hoàng Hải (Chuẩn 17_10)

Skill dự án đọc cùng `AGENTS.md` và canonical governance; không tự nâng authority cao hơn owner/current BE/evidence. Nó bao gồm:
- **PHẦN A:** Kỷ luật chống bịa & quy trình 6 bước bắt buộc.
- **PHẦN B:** Nguồn-sự-thật & đặc tả kỹ thuật chuẩn hóa 17_10 của RoadGuard.

---

> Override chỉ đè tài liệu lịch sử; authority/mode/evidence tại `AGENTS.md` áp dụng.

## ⚠️ ĐIỀU KHOẢN OVERRIDE TỐI CAO (CANONICAL PRIORITY)
**Mọi quy định trong mục "Chuẩn Hóa Canonical 17_10" dưới đây có hiệu lực ưu tiên cao nhất, OVERRIDE (đè) lên toàn bộ các tài liệu đặc tả lịch sử (bộ canonical cũ, các thư mục `14-9/`, `22_9/`, `27_9_V3`, `28_9` và các file spec v1/v2 cũ):**

1. **Thương hiệu & Định danh:**
   - Đối tác thực tế: **Công ty TNHH Xây dựng Bê tông Hoàng Hải** (gọi tắt: Bê tông Hoàng Hải).
   - Package: `com.hoanghai.roadguard`, scheme `roadguard`, domain email nội bộ: `@hoanghai.vn`.
   - **Ghi chú mã định danh:** bộ 17_10 **KHÔNG định nghĩa** tiền tố `HH-` cho nhân sự/thiết bị/chuyến bay. Không tự chế prefix; đọc mã định danh theo DTO/enum thực tế trong `docs/specs/04_API-Contracts/`.
2. **Quy tắc phân tách Logo:**
   - *Màn Splash / Loading:* Sử dụng `assets/logo_hoanghai.png` (có đầy đủ tên công ty và slogan).
   - *Màn hình nội bộ, AppHeader, App Icon:* Sử dụng `assets/logo_hoanghai_icon.png` (chỉ biểu tượng xe bồn bê tông, tuyệt đối KHÔNG có chữ).
3. **Phân định Nền tảng & 3 Vai Trò Mobile Cốt Lõi:**
   - **Mobile App (`FE_AppMobile`):** Phục vụ độc quyền **3 vai trò hiện trường**:
     1. `REPAIR_CREW` (`(crew)`): Kỹ thuật viên / Đội sửa chữa hiện trường.
     2. `DRONE_OPERATOR` (`(drone)`): Phi công điều khiển drone khảo sát & thu thập dữ liệu 4K RGB.
     3. `REPORTER` (`(reporter)`): Người dân phản ánh & Đại diện Ban QLDA / Chủ đầu tư (đăng ký **email + password + OTP** theo `docs/specs/06_Mobile-Expo/Reporter/02_Authentication-OTP-and-Session.md`: API-010 → API-012/011 → API-002; gửi phản ánh + GPS + tối đa 3 ảnh riêng tư, theo dõi **chính các phản ánh của mình** — bộ 17_10 **KHÔNG định nghĩa** mã tra cứu công khai/tracking; đánh giá 1-5 sao).
   - **Web Dashboard:** Phục vụ 2 vai trò quản lý: `PROJECT_MANAGER` (PM) và `SUPERVISOR` (Giám sát viên). Các màn hình PM và Supervisor cũ trên mobile được chuyển lưu trữ tại `archive/web-screens/` nhằm tập trung tài nguyên mobile cho 3 vai trò hiện trường.
4. **Cơ chế Nghiệp vụ Fast Track & Task Mode (US-33, BR-05, BR-08, BR-11..18, BR-25):**
   - **Chế độ công việc (`TaskMode`):** tên enum/giá trị trên wire PHẢI verify lại trong `docs/specs/04_API-Contracts/02_Full-API-Catalog.md` và DTO liên quan — không suy diễn từ tài liệu cũ.
     - `INSPECT_AND_REPAIR`: Đo kiểm và được phép sửa nhanh nếu đủ điều kiện.
     - `MEASURE_ONLY`: Chỉ đo đạc hiện trường, cấm tự ý sửa tại chỗ (áp dụng cho đợt gom nhiều lỗi US-35 / BR-09).
   - **Điều kiện kích hoạt Fast Track tại chỗ:**
     - Nhiệm vụ được giao ở chế độ đo-kiểm-và-sửa.
     - **Eligibility đọc trực tiếp qua API-146 `GET /api/v1/projects/{projectId}/repair-packages/{packageId}/items/{itemId}/eligibility` và fail closed** (server là authority; `missingReasons` không đạt → KHÔNG cho sửa). Ngưỡng kích thước nằm trong policy revision trên server — KHÔNG hardcode con số trong app. Xem `docs/specs/02_Business-Workflows/08_FastTrack-Policy-and-Confirmation.md`.
     - Phải có Crew package/item/binding/itemVersion thật; eligibility UI không cấp mutation authority, NORMAL context không thay FT bootstrap.
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
2. **Owner/governance quyết định business; pinned BE source/guard quyết định actual wire; executed evidence chứng minh từng verification axis.**
3. **Đừng tưởng tượng — hãy thực thi.** Chạy thật bằng `npm run typecheck` (`tsc --noEmit`), đọc output thật.
4. **Mọi tên đều phải có căn cứ.**
5. **Thiếu quyết định/contract bắt buộc → dừng phần phụ thuộc và hỏi; tiếp tục phần độc lập an toàn.**

### A2. Workflow 6 bước
**B1 — Hiểu yêu cầu.** Viết lại yêu cầu bằng 1-2 câu, gắn với mã màn (`RPT-xx`/`C-xx`/`O-xx`) hoặc operation ID (`API-xxx`) tương ứng.  
**B2 — Thu thập evidence.** Đọc file cần sửa, file gọi, type liên quan, spec tương ứng trong `docs/specs/` (xem B0).  
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

## PHẦN B — Nguồn-sự-thật & đặc tả kỹ thuật RoadGuard Canonical 17_10

### B0. Nguồn-sự-thật

#### Authority và evidence — RULES-01 (2026-10-28)

Entrypoint: `AGENTS.md`; áp dụng governance tại `docs/specs/00_Governance/01_Authority-and-Source-of-Truth.md`.

| Trục | Nguồn | Cách dùng |
|---|---|---|
| Business target | Quyết định owner mới nhất có scope/ngày/nguồn + canonical governance | Chỉ supersede phần được quyết định; không tự duyệt wire/quyền mới |
| Implementation contract | Current BE controller/DTO/service/repository/guard ở pinned SHA + authorized HTTP contract | Quyết định wire shape, quyền runtime và preconditions thực; không tự hợp thức hóa business gap |
| Verification | Exact executed command, SHA, environment, output và giới hạn | Tests, HTTP, protocol interop, native và Android là các trục riêng |
| Historical reference | Scaffold, mock, snapshot cũ | Chỉ truy vết; không cấp production authority |

Owner khác source: ghi EXPECTED/ACTUAL + `PRODUCT_SOURCE_GAP`; wire/guard thiếu: `BE_CONTRACT_GAP`. Production fail closed, báo checkpoint phụ thuộc; tiếp tục phần độc lập an toàn. Override canonical chỉ đè tài liệu lịch sử, không đè owner/governance/current BE/evidence.

Catalog 241 operations / 223 paths / 357 schemas / 47 controllers là snapshot Phase2C 15/10/2026, source `36c3a1d273f17dd29b816136ae0182a821fd79e4`; không phải current operation count. Mọi cập nhật số lượng cần inventory method/path/actor/status/source SHA và delta; không tự thay bằng 260.

Delivery modes, allowlist, journal, native approval và evidence labels áp dụng nguyên văn từ `AGENTS.md` / `skills/code-review/SKILL.md`. `skills/BOOTSTRAP_PROMPT.md` chỉ historical; `skills/DESIGN.md` không cấp quyền nghiệp vụ.

### B1. Thông tin dự án
- **RoadGuard:** Hệ thống quản lý bảo hành & sửa chữa hạ tầng đường bộ của **Công ty TNHH Xây dựng Bê tông Hoàng Hải**.
- App mobile phục vụ **3 vai trò hiện trường** (số màn theo `docs/specs/06_Mobile-Expo/*/01_*-Screen-API-Matrix.md`):
  - `DRONE_OPERATOR` (`(drone)`): 8 màn hình (O-01 → O-08)
  - `REPAIR_CREW` (`(crew)`): 11 màn hình (C-01 → C-11)
  - `REPORTER` (`(reporter)`): 10 màn hình (RPT-01 → RPT-10)
- **Role wire → route group adapter:** wire backend dùng `UserRoleCode.DroneOperator` / `UserRoleCode.RepairCrew` (xem `docs/specs/04_API-Contracts/02_Full-API-Catalog.md`), app dùng `RoleCode.DRONE_OPERATOR` / `RoleCode.REPAIR_CREW` tại `src/types/enums.ts` — cần lớp adapter map wire→local; route group `(crew)`/`(drone)`/`(reporter)` giữ nguyên.
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

### B4. Offline-first & Queue (theo `docs/specs/04_API-Contracts/07_Offline-Sync-and-Crypto-Wire.md` và `docs/specs/06_Mobile-Expo/Crew/04_Offline-Signed-Sync-and-Handover.md`)
- **LocalState:** `DRAFT` $\rightarrow$ `WAITING_DEPENDENCIES` $\rightarrow$ `READY` $\rightarrow$ `IN_FLIGHT` $\rightarrow$ `ACKED` (hoặc `CONFLICT`, `REJECTED`, `PAUSED_RETRY`, `UNKNOWN_OUTCOME`, `BLOCKED_CONTRACT`, `AUTH_REQUIRED`).
- **Conceptual stores (không phải current DDL; đọc database.ts/migrations/caller thực):** `account_partition`, `task_pack`, `server_cache`, `draft`, `media_asset`, `outbox_intent`, `wire_command`, `upload_ledger`, `id_map`, `conflict_record`.
- **Media Asset Lifecycle:** Ghi file tạm $\rightarrow$ đóng file $\rightarrow$ tính SHA-256 $\rightarrow$ atomic rename $\rightarrow$ commit SQLite media. Trạng thái: `LOCAL_SAVING` $\rightarrow$ `LOCAL_READY` $\rightarrow$ `UPLOADING` $\rightarrow$ `VERIFIED` (complete ≠ VERIFIED).
- **Signed offline batch (chỉ PM/Crew):** chữ ký **ECDSA P-256**, public key **SPKI DER Base64**, định dạng chữ ký **IEEE-P1363 (64 byte)**, canonical bytes (không `JSON.stringify`/DER/timestamp client). Enrollment/device registry chỉ PM/Crew — **Reporter và Operator KHÔNG** có signed sync. Batch gửi qua **API-130** `POST /api/v1/projects/{projectId}/offline/sync`.
- **Mutation Headers:** `Idempotency-Key` **bắt buộc** cho write theo declaration của từng operation; thiếu → server có thể trả **428** (`precondition_required`). Kèm `If-Match` (ETag) cho mutation có trạng thái. Chi tiết: `docs/specs/04_API-Contracts/05_Idempotency-Concurrency-and-Errors.md`.

### B5. Mã Lỗi — Per-Operation Contract (KHÔNG có bảng mã chung)
- Bộ 17_10 **KHÔNG định nghĩa một bảng mã lỗi nghiệp vụ dùng chung**. Mỗi operation có mục **"Error contract (declared, not execution)"** riêng liệt kê HTTP status + `code` của chính nó trong `docs/specs/04_API-Contracts/02_Full-API-Catalog.md` (241 mục tại snapshot Phase2C, không current inventory).
- Body lỗi dùng `application/problem+json` (`ProblemDetails`) — xem `docs/specs/04_API-Contracts/03_DTO-and-Schema-Reference.md`.
- Quy tắc `409`/`412`/`428` áp theo từng operation (không dùng chung): `docs/specs/04_API-Contracts/05_Idempotency-Concurrency-and-Errors.md`.
- **UI KHÔNG hardcode bảng mã chung.** Đọc `code` từ problem+json rồi map sang message; gặp `code` lạ → hiển thị fallback message tiếng Việt trung tính thay vì bịa nghĩa.

### B6. Design Tokens (`src/design-tokens.ts`)
- `colors.primary`: `#C9A227` (Vàng đồng — tối đa 1 CTA chính/màn + tab active + KPI).
- `surface`: `#FFFFFF` (Card), `surfaceAlt`: `#F8F9FA` (Nền màn hình), viền 1px `#E2E5E9`.
- Severity chips: Xanh lá (`#2F9E44`), Cam (`#F59E0B`), Đỏ (`#E5484D`). TUYỆT ĐỐI KHÔNG dùng vàng đồng cho severity lỗi.
- Task mode & Policy chips: Xanh lục `#2F9E44` cho Fast Track Đạt Policy, Cam `#F59E0B` cho Vượt Policy, Xám `#2D3748` cho Chỉ đo đợt.
- Bo góc: 12px (Card), 8px (Button/Input), full 9999px (Chip). Không dùng shadow đậm hay gradient.

---

### B7. 10 Invariants Bất Phá (theo `docs/specs/00_Governance/01_Authority-and-Source-of-Truth.md` và các spec 17_10)

Các bất biến sau KHÔNG ĐƯỢC phá trong bất kỳ tình huống nào:

1. **Saved local ≠ Sent ≠ File VERIFIED ≠ Task done ≠ Accepted ≠ Published** — Sáu trạng thái hoàn toàn độc lập, không thay thế nhau.
2. **Token expiry ≠ hết quyền tác nghiệp offline** — Snapshot đã tải vẫn dùng được offline; server sync cần auth hiện hành.
3. **Mỗi ý định có operation ID (`API-xxx`)/`Idempotency-Key` ổn định** — Timeout hay cancel không chứng minh server rollback.
4. **Không gửi local temp ID hoặc unknown enum** — Không bypass type checking bằng cách gửi giá trị chưa map.
5. **BEFORE đúng nguồn phải được gắn trước sửa** — Không đổi AFTER thành BEFORE; ảnh tái dùng giữ nguyên provenance.
6. **Không silent overwrite khi policy/assignment/version đổi** — dùng version/`ETag` mới nhất từ server và để server phân xử; không tự giải quyết cục bộ.
7. **Fast Track đủ điều kiện KHÔNG chờ PM duyệt từng số đo** — PM kiểm/đóng SAU khi Crew gửi AFTER, Supervisor nhận báo.
8. **Notification/realtime/cache không là nguồn cấp quyền hay ACK** — Phải verify qua server state.
9. **Offline store partition theo account+môi trường** — Logout không xóa bằng chứng chưa sync; không lộ data account khác.
10. **Các limits trong FE là đề xuất cấu hình** — Không tự gắn SLA/quota/URL production chưa được DevOps cung cấp.

---

### B8. Mẫu Giao Việc AI & Timeout/Retry Budget

#### Mẫu giao task cho AI coding agent:

```text
Nguồn: Canonical 17_10 — docs/specs/04_API-Contracts/02_Full-API-Catalog.md (operation ID API-001 → API-241).
Feature: [tên màn hình / tính năng], actor/scope: [CREW|DRONE|REPORTER|PM|SUP],
operation ID: [API-xxx từ 02_Full-API-Catalog.md], FR: [FR-xx].
Đọc repo instructions/README/package/build files trước khi sửa.
Giữ wire fields/enum/nullability/error shape; không tự thêm query/header/endpoint.
Implement loading/empty/error/stale/offline/conflict theo phạm vi feature.
Queue/media cần durable storage và exact replay; không localStorage evidence/token mặc định.
Nếu BE_CONTRACT_GAP: production fail closed; báo source/SHA và blocked capability. Mock chỉ isolated tests/dev harness, không runtime fallback hay success giả.
Báo cáo: diff, migration/recovery, dependencies và phần còn blocked.
```

#### Timeout / Retry Budget
- Bộ 17_10 **KHÔNG có bảng retry dùng chung**; timeout/retry đọc theo **từng operation contract** (status/`code`/header) trong `docs/specs/04_API-Contracts/02_Full-API-Catalog.md` kết hợp `docs/specs/04_API-Contracts/05_Idempotency-Concurrency-and-Errors.md`.
- Nguyên tắc chung: retry mutation chỉ với **cùng `Idempotency-Key` + cùng payload**; KHÔNG retry tự động login/OTP/refresh.

**Quy tắc timeout UI:** Sau timeout mutation → hiển thị **"Chưa xác nhận được kết quả, đang kiểm tra"** — TUYỆT ĐỐI KHÔNG hiển thị "Gửi thất bại" khi chưa rõ server state.
