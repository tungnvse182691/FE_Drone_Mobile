---
name: code-review
description: "Dùng khi review, audit, tự kiểm chứng hoặc nghiệm thu thay đổi trong dự án RoadGuard."
---

# RoadGuard Code Review — Audit và Scoped Self-Review
### Quality Gate — chọn mode trước khi review

> *Bộ tài liệu chuẩn nguồn sự thật: `FE_AppMobile/docs/specs/` — Phiên bản Canonical 17_10 (xem `docs/specs/00_Governance/01_Authority-and-Source-of-Truth.md`)*

AI khi đóng vai QA Reviewer **KHÔNG ĐƯỢC CHÂM CHƯỚC** cho bất kỳ sự cẩu thả nào. Đây không phải bước tùy chọn — đây là **cổng nghiệm thu bắt buộc**.

---

## Mode bắt buộc và authority

Áp dụng authority/evidence tại `AGENTS.md` và canonical governance. Current owner/governance quyết định business; pinned BE controller/DTO/guard quyết định actual wire/quyền; executed evidence chứng minh riêng từng trục. Catalog 241 là snapshot Phase2C 15/10/2026 (`36c3a1d273f17dd29b816136ae0182a821fd79e4`), không current count. Historical scaffold/mock không cấp authority.

| Mode | Ai / khi nào | Quyền |
|---|---|---|
| `AUDIT_READ_ONLY` | Mặc định cho independent reviewer/Muse; khi task chỉ audit | Chỉ read/search/git show/report chat. Không sửa source/worklog/fixture/index/commit/BE. P0/P1 có proof phải báo sớm |
| `IMPLEMENT_AND_SELF_REVIEW` | Codex được giao implement với allowlist rõ | Self-fix đúng scope tối đa 5 vòng; worklog chỉ khi task cho phép. Ngoài scope báo file/lý do/impact trước sửa |

Mọi nhãn Auto-Fix/Self-Healing còn ở checklist dưới đây CHỈ áp dụng `IMPLEMENT_AND_SELF_REVIEW` và trong allowlist. Trong audit, cùng finding chỉ được báo, kể cả deadline gấp, tests đang xanh hoặc yêu cầu “tự vả”. Independent reviewer không tự nhận quyền implement.

### Reachability và evidence gates

- Finding P0/P1/P2 cần active caller/route reachability, exact source:line/SHA, EXPECTED/ACTUAL/impact; dormant legacy/mock không tự thành runtime severity. Không xác minh được thì ghi UNKNOWN/NOT_RUN.
- Typecheck + full regression theo scope, mounted Stack/route reachability, permission/headers/mutation preconditions, exact body/key replay, actor/session/environment switch, SQLite persistence/restart, upload VERIFIED và server receipt/readback.
- Privacy, changed-file secret scan, `git diff --check` và allowlist/remote gates trước delivery. Không tải package/provider/native config khi chưa approval; BE read-only, state-changing HTTP chỉ fixture riêng được ủy quyền.
- `API_CONNECTED`, `LOGIC_TESTED`, `PROTOCOL_INTEROP_TESTED`, `HTTP_VERIFIED`, `NATIVE_VERIFIED`, `ANDROID_E2E_VERIFIED`, `NOT_RUN`, `BE_CONTRACT_GAP`, `BE_DISCOVERY_GAP`, `BE_FIXTURE_BLOCKED` giữ định nghĩa tại `AGENTS.md`. Không lấy Node/.NET/component test thay HTTP/native/Android.
- `LOCAL_SAVED ≠ SENT ≠ FILE_VERIFIED ≠ WORK_FINISHED ≠ PM_ACCEPTED ≠ PUBLISHED`; HTTP 200 batch/local flag không là durable per-item ACK. Timeout giữ immutable journal/identity/payload/key/version và unknown outcome.
- FastTrack API-146/policy revision + bootstrap package/item/binding/itemVersion thật; không số đo local, không NORMAL context thay FT. Thiếu contract production fail closed; mock chỉ isolated tests/dev harness.

## ⚙️ CORE PRINCIPLES — BẤT DI BẤT DỊCH

| # | Nguyên tắc | Giải thích |
|---|---|---|
| P1 | **Evidence-Based Only** | Không review bằng trí nhớ hay suy đoán. Mọi đánh giá phải xuất phát từ lệnh chạy thật và đọc nội dung file thật. |
| P2 | **Self-Healing Loop (Auto-Fix)** | Trong IMPLEMENT_AND_SELF_REVIEW, tự sửa finding đã chứng minh trong allowlist rồi verify. AUDIT_READ_ONLY chỉ báo finding, không sửa. Tối đa **5 vòng lặp**. Nếu sau 5 vòng vẫn fail → ghi nhận `ESCALATE_TO_HUMAN`. |
| P3 | **Mandatory Worklog** | Chỉ IMPLEMENT_AND_SELF_REVIEW và task cho phép mới ghi worklog; AUDIT_READ_ONLY báo chat, không tạo file. |
| P4 | **No Silent Pass** | TUYỆT ĐỐI CẤM tuyên bố "PASS" mà không chạy lệnh compiler thực tế. |
| P5 | **Specification Inference** | Trước khi fix lỗi phức tạp (không phải lint), AI phải trình bày rõ *"Hành vi mong muốn theo Canonical 17_10 là gì"* rồi mới áp dụng fix. |

---

## 🔄 QUY TRÌNH KHÉP KÍN — 6 BƯỚC + VÒNG LẶP AUTO-FIX

```
┌──────────────────────────────────────────────────────────────┐
│  BƯỚC 1: Thu thập Diff & Changed Files                       │
│  ↓                                                           │
│  BƯỚC 2: Cổng Compiler — npx tsc --noEmit (0 errors)        │
│  ↓                                                           │
│  BƯỚC 3: Quét 8 Bộ Lọc Kỷ Luật (Invariants)                │
│  ↓                                                           │
│  CÓ LỖI? ──→ BƯỚC 4: AUTO-FIX (Tự Sửa File)                │
│       ↑              ↓                                       │
│       └── Vòng lặp (tối đa 5 lần) ──→ BƯỚC 2               │
│  0 LỖI? ──→ BƯỚC 5: Kiểm tra Canonical 17_10 Alignment      │
│              ↓                                               │
│              BƯỚC 6: Xuất Worklog Nghiệm Thu                 │
└──────────────────────────────────────────────────────────────┘
```

---

### BƯỚC 1 — Thu Thập Diff & Danh Sách File Bị Tác Động

```powershell
# Xem diff staged
git diff --name-only HEAD

# Hoặc xem file vừa sửa
git status --short
```

- Lập danh sách chính xác các file `.tsx`, `.ts`, `.json` vừa thêm/sửa.
- Không suy diễn về file chưa kiểm tra.
- Ưu tiên review các file trong `app/`, `src/`, `components/`, `constants/`.

---

### BƯỚC 2 — Cổng Compiler TypeScript (Deterministic Gate)

```powershell
cd D:\Do_AN_Drone\FE_AppMobile
npx tsc --noEmit
```

**Tiêu chí:** Kết quả đầu ra phải đạt đúng **0 lỗi (exit code 0)**.

> Nếu có lỗi: audit báo evidence; implement self-fix trong allowlist tại bước 4. Ngoài scope dừng phần phụ thuộc và báo.

---

### BƯỚC 3 — Quét 8 Bộ Lọc Kỷ Luật RoadGuard (8 Invariants)

AI Reviewer phải kiểm tra từng bộ lọc bên dưới, ghi nhận kết quả PASS/FAIL cho mỗi bộ.

---

#### 🔴 INVARIANT-01: Bộ lọc Icon — TUYỆT ĐỐI CẤM IONICONS

| Nội dung | Quy tắc |
|---|---|
| **Đúng** | 100% icon phải dùng `@expo/vector-icons/MaterialIcons` |
| **Sai — Auto-Fix ngay** | Bất kỳ dòng nào có `from '@expo/vector-icons/Ionicons'` hoặc `import Ionicons` |

**Lệnh quét:**
```powershell
Get-ChildItem -LiteralPath app,src -Recurse -File -Include *.ts,*.tsx | Select-String -Pattern 'Ionicons'
```

No-match của PowerShell `Select-String` là output rỗng; không suy exit code native từ `$LASTEXITCODE` của lệnh trước. Với `git grep`/`rg`, exit 0 = match, 1 = no match, >=2 = lỗi công cụ; đọc match để phân loại, không tự xem mọi match là violation.

```powershell
git grep -n -I -e Ionicons -- app src
$scanExit = $LASTEXITCODE
if ($scanExit -ge 2) { throw "git grep failed: $scanExit" }
if ($scanExit -eq 1) { Write-Output 'No matches' }
```

**Bảng chuyển đổi icon tự động:**
| Ionicons (SAI) | MaterialIcons (ĐÚNG) |
|---|---|
| `checkmark-circle` | `check-circle` |
| `time-outline` | `schedule` |
| `close-circle` | `cancel` |
| `alert-circle` | `error` |
| `camera-outline` | `photo-camera` |
| `image-outline` | `image` |
| `sync-outline` | `sync` |
| `location-outline` | `location-on` |
| `person-outline` | `person` |
| `chevron-forward` | `chevron-right` |
| `chevron-back` | `chevron-left` |
| `add-circle` | `add-circle` |
| `trash-outline` | `delete` |
| `create-outline` | `edit` |
| `eye-outline` | `visibility` |
| `cloud-upload-outline` | `cloud-upload` |
| `warning-outline` | `warning` |

---

#### 🔴 INVARIANT-02: Bộ lọc Phi Tài Chính UD-06 (Zero Presentation Cost)

**Quy tắc:** Mobile App (`app/`) **TUYỆT ĐỐI KHÔNG HIỂN THỊ** bất kỳ thông tin tiền tệ hay chi phí.

**Lệnh quét:**
```powershell
Get-ChildItem -LiteralPath app,src -Recurse -File -Include *.ts,*.tsx | Select-String -Pattern 'vnđ|vnd|chi phí|dự toán|kinh phí|định mức|đơn giá|₫'
```

**Được phép hiển thị:** Bộ 3 thông số thi công:
1. Phương án xử lý kỹ thuật
2. Kích thước hình học (m², cm, m)
3. Thời hạn hoàn thành

**Auto-Fix:** Xóa/ẩn hoàn toàn các trường tiền tệ. Thay bằng nhãn kỹ thuật phù hợp hoặc ẩn component.

---

#### 🔴 INVARIANT-03: Bộ lọc Fabric-Safe Navigation (Expo Router)

**4 quy tắc navigation:**

| # | Quy tắc | Auto-Fix khi vi phạm |
|---|---|---|
| N1 | `<Stack screenOptions={{ headerShown: false }} />` phải luôn mount vĩnh viễn trong `RootLayout` | Xóa conditional return `<Redirect />` thay thế Stack |
| N2 | AuthGuard redirect phải trong `useEffect` bằng `router.replace(...)` | Di chuyển logic redirect vào `useEffect` |
| N3 | Route phải đủ group prefix: `/(crew)/...`, `/(drone)/...`, `/(reporter)/...`, `/(auth)/...` | Thêm group prefix còn thiếu |
| N4 | Nút FAB `+` đặt `absolute right-4 bottom-24 z-30` (96px cách đáy) | Điều chỉnh vị trí bottom từ `bottom-16` → `bottom-24` |

**Lệnh quét N1:**
```powershell
Select-String -Path "D:\Do_AN_Drone\FE_AppMobile\app\_layout.tsx" -Pattern "Redirect"
```

---

#### 🔴 INVARIANT-04: Bộ lọc Phân Định Nền Tảng (3 Mobile Roles Only)

**Mobile App CHỈ phục vụ 3 vai trò hiện trường:**
- `REPAIR_CREW` → route group `(crew)`
- `DRONE_OPERATOR` → route group `(drone)`
- `REPORTER` → route group `(reporter)`

**Vi phạm — Auto-Fix ngay:**
- Màn hình PM/Supervisor trong thư mục `app/` (không phải `archive/`)
- Logic xử lý role PM/Supervisor trong component Mobile

**Khi PM/Supervisor đăng nhập trên Mobile:** Hiển thị Toast cảnh báo `WEB_ONLY_ROLE_MESSAGE`, không render màn hình nghiệp vụ.

---

#### 🔴 INVARIANT-05: Bộ lọc Danh Mục Khuyết Tật (5 Mã Chuẩn BTXM)

**Nguồn sự thật duy nhất:** `src/constants/defect-types.ts`

| Mã | Tên khuyết tật |
|---|---|
| `POTH_DEEP` | Ổ gà sâu vỡ tấm bê tông |
| `DEPR_POND` | Lún võng đọng nước |
| `EDGE_BRK` | Vỡ mép tấm bê tông |
| `SLAB_CRK` | Nứt tấm bê tông |
| `SHLD_EROS` | Xói lở vai đường |

**Lệnh quét vi phạm:**
```powershell
Get-ChildItem -LiteralPath app,src -Recurse -File -Include *.ts,*.tsx | Select-String -Pattern 'CRACK|POTHOLE|EROSION|DAMAGE|defectType'
```

**Auto-Fix:** Thay mã tự chế bằng 5 mã chuẩn từ `defect-types.ts`.

---

#### 🔴 INVARIANT-06: Bộ lọc Thương Hiệu & Tiêu Chuẩn Kỹ Thuật

| Hạng mục | Đúng | Sai — Tự sửa ngay |
|---|---|---|
| Tên công ty | `Công ty TNHH Xây dựng Bê tông Hoàng Hải` | Tên viết tắt không chính thức |
| Email domain nội bộ | `@hoanghai.vn` | `@gmail.com`, `@roadguard.vn` (Lưu ý: Reporter đăng ký **email + password + OTP**, không giới hạn nhà cung cấp — xem `docs/specs/06_Mobile-Expo/Reporter/02_Authentication-OTP-and-Session.md`) |
| Prefix nhân sự | Không tự chế prefix — đọc mã định danh theo DTO/enum trong `docs/specs/04_API-Contracts/` | `HH-`, `RG-`, `NV-` (17_10 KHÔNG định nghĩa prefix) |
| Tiêu chuẩn đường | `TCVN 10380:2014` (Bê tông xi măng) | Nhựa đường, asphalt |
| Công nghệ khảo sát | `4K RGB + DSM (OpenDroneMap)` | LiDAR (Red Flag) |
| Logo Splash | `assets/logo_hoanghai.png` (có chữ) | Dùng nhầm icon-only |
| Logo Header | `assets/logo_hoanghai_icon.png` (chỉ xe bồn) | Dùng nhầm logo có chữ |
| Màu thương hiệu | Vàng Đồng `#C9A227` | Màu vàng khác |

---

#### 🟡 INVARIANT-07: Bộ lọc Data Contract (theo `docs/specs/04_API-Contracts/03_DTO-and-Schema-Reference.md` + `02_Full-API-Catalog.md`)

**Các vi phạm phổ biến cần quét:**

```powershell
# Kiểm tra dùng array index làm ID (cấm)
Get-ChildItem -LiteralPath app,src -Recurse -File -Include *.ts,*.tsx | Select-String -Pattern '\.id\s*=\s*index|key=\{index\}'

# Kiểm tra tọa độ GPS sai (dùng (0,0) thay null)
Get-ChildItem -LiteralPath app,src -Recurse -File -Include *.ts,*.tsx | Select-String -Pattern 'latitude:\s*0,\s*longitude:\s*0'
```

**Quy tắc bắt buộc:**
- UUID là `string`, không dùng numeric ID
- Tọa độ GPS thiếu → `null`, không phải `{latitude: 0, longitude: 0}`
- Timestamp phải RFC3339 có timezone
- Enum giữ wire spelling/casing theo pinned DTO và explicit adapter; UI label dịch riêng
- Pagination theo từng current DTO; không bịa total/page hoặc coi trang đầu là tổng

---

#### 🟡 INVARIANT-08: Bộ lọc Error Handling (theo `docs/specs/04_API-Contracts/02_Full-API-Catalog.md` + `05_Idempotency-Concurrency-and-Errors.md`)

**Các vi phạm cần phát hiện và Auto-Fix:**

| Vi phạm | Auto-Fix |
|---|---|
| Hiển thị message "Gửi thất bại" sau timeout (nên là "Chưa xác nhận, đang kiểm tra") | Thay text error message |
| Toast cho mỗi chunk upload hoặc mỗi retry | Gộp thành 1 banner |
| Render HTML error từ server lên UI | Dùng fallback message trung tính |
| Hiển thị "Đã đồng bộ" khi chỉ `navigator.onLine = true` | Cần durable per-item server receipt/readback; API probe chỉ là tín hiệu kết nối |
| `innerHTML` để render error message | Thay bằng `text` render |
| Double-submit không khóa | Thêm `disabled` state trong khi loading |

**Mã lỗi:** 17_10 **KHÔNG có bảng mã nghiệp vụ dùng chung**. Mỗi operation khai báo mục **"Error contract (declared, not execution)"** riêng (HTTP status + `code`) trong `docs/specs/04_API-Contracts/02_Full-API-Catalog.md`; body `application/problem+json` (`ProblemDetails`). UI đọc `code` rồi map sang message; `code` lạ → fallback tiếng Việt trung tính, KHÔNG hardcode bảng mã.

---

### BƯỚC 4 — AUTO-FIX LOOP (Self-Healing Execution)

> Chỉ IMPLEMENT_AND_SELF_REVIEW trong allowlist. Audit bỏ qua toàn bộ mutation và báo finding.

```
┌─ VÒNG LẶP AUTO-FIX ─────────────────────────────────────────┐
│                                                              │
│  attempt = 1                                                 │
│  max_attempts = 5                                            │
│                                                              │
│  WHILE errors_exist AND attempt <= max_attempts:             │
│    1. [DIAGNOSE] Ghi nhận: File nào, dòng nào, lỗi gì      │
│    2. [INTENT] Nêu rõ "Theo Canonical 17_10, hành vi đúng là..." │
│    3. [FIX] Dùng replace_file_content/write_to_file sửa     │
│    4. [VERIFY] Chạy lại npx tsc --noEmit + quét lại         │
│    5. Ghi vào Self-Healing Log: attempt #N, lỗi X, fix Y    │
│    attempt++                                                 │
│                                                              │
│  IF attempt > 5 AND errors_exist:                            │
│    → Trạng thái: ESCALATE_TO_HUMAN                           │
│    → Mô tả chi tiết lỗi tồn đọng, lý do không tự fix được  │
│    → Worklog chỉ khi task cho phép; audit báo chat  │
└──────────────────────────────────────────────────────────────┘
```

**Nguyên tắc khi Auto-Fix:**
- **Sửa triệt để** không chỉ vá biểu hiện — phải xóa tận gốc nguyên nhân.
- **Payload bất biến:** Nếu request đã gửi, KHÔNG đổi payload hay idempotency key.
- **Không silent fix:** Mỗi lần sửa phải ghi rõ vào Self-Healing Log.
- **Không override evidence:** Tuyệt đối không xóa ảnh BEFORE/AFTER, không đổi status server.
- **Đơn nhất:** Chỉ fix đúng lỗi đã xác định. Không "refactor" thêm code không liên quan.

---

### BƯỚC 5 — Kiểm tra Canonical 17_10 Alignment (Specification Check)

Sau khi pass tất cả 8 Invariants, kiểm tra thêm các quy tắc nghiệp vụ từ bộ tài liệu chuẩn:

#### 5.1 Trạng thái State Machine (theo cột "States/States, privacy and status" trong `docs/specs/06_Mobile-Expo/*/01_*-Screen-API-Matrix.md` và `docs/specs/06_Mobile-Expo/07_Mobile-Integration-Acceptance.md`)
- [ ] Màn Task List có đủ state: skeleton/empty/error/cached-stale/load-more?
- [ ] Nút bị disable có kèm lý do gần nút (không chỉ màu xám)?
- [ ] Offline badge hiển thị xuyên màn hình tác nghiệp?
- [ ] Nhãn "Đã tải lúc…" luôn đọc được khi có cache?

#### 5.2 Invariants Nghiệp Vụ Cốt Lõi (theo `docs/specs/00_Governance/01_Authority-and-Source-of-Truth.md`, `docs/specs/01_Product-and-Roles/02_Actor-Client-Permission-Matrix.md` và `docs/specs/06_Mobile-Expo/07_Mobile-Integration-Acceptance.md`)
```
✅ LOCAL_SAVED ≠ SENT ≠ FILE_VERIFIED ≠ WORK_FINISHED ≠ PM_ACCEPTED ≠ PUBLISHED
✅ Mobile: chỉ 3 role hiện trường (Crew/Drone/Reporter)
✅ Web: PM + Supervisor — ONLINE ONLY
✅ Fast Track: Crew làm → PM kiểm/đóng → Supervisor nhận báo
✅ MEASURE_ONLY: chỉ đo, KHÔNG sửa (UD-06 mode block)
✅ Crew KHÔNG được thực thi final/approval — thẩm quyền thuộc PM/Supervisor (theo acceptance 17_10)
✅ BEFORE bắt buộc trước khi Start Repair (không đổi AFTER thành BEFORE)
✅ AI bbox: KHÔNG suy depth/severity cuối cùng từ bounding box
✅ LiDAR: CẤM tuyệt đối (chỉ 4K RGB + DSM OpenDroneMap)
✅ Không có field tiền tệ/VNĐ/đơn giá trong bất kỳ màn hình nào
```

#### 5.3 Optimistic UI Check (theo `docs/specs/06_Mobile-Expo/07_Mobile-Integration-Acceptance.md`)
- [ ] KHÔNG optimistic cho: phê duyệt, đóng hồ sơ, publish policy, role change
- [ ] Optimistic mark-as-read notification có rollback và version đúng không?

---

### BƯỚC 6 — Xuất Báo Cáo Nghiệm Thu Worklog Bắt Buộc

**Quy định:** Chỉ tạo khi task implement cho phép; independent audit dùng template trong chat, không ghi file.
- Tên file: `docs/worklogs/<Phase-ID>-<Task-Name>-<YYYYMMDD>-review.md`
- Ví dụ: `docs/worklogs/C-05-submit-repair-20261017-review.md`

**Template chuẩn:**

```markdown
# Báo Cáo Nghiệm Thu & Thẩm Định Mã Nguồn — Code Review Worklog

- **Thời gian:** [YYYY-MM-DD HH:mm] (UTC+7)
- **Người thẩm định:** {reviewer}
- **Mode:** {mode}
- **SHA / scope:** {SHA} / {scope}
- **Executed evidence:** {evidence}
- **Chưa chạy / gap:** {NOT_RUN} / {blocking_gap}
- **Feature / Màn hình:** [Mô tả ngắn, ví dụ: C-05 Submit Repair Form]
- **Vòng Auto-Fix đã chạy:** [Số lần / Tối đa 5]

---

## 1. Danh Sách Tệp Can Thiệp

| File | Thay đổi |
|---|---|
| `app/(crew)/submit-repair.tsx` | [Mô tả] |
| `src/constants/defect-types.ts` | [Nếu có] |

---

## 2. Kết Quả Compiler Gate

- **Lệnh:** `npx tsc --noEmit`
- **Kết quả:** `0 errors ✅` / `N errors ❌`

---

## 3. Kết Quả 8 Bộ Lọc Kỷ Luật

| # | Bộ lọc | Trạng thái |
|---|---|---|
| I-01 | Iconography (MaterialIcons only) | ✅ PASS / ❌ FAIL → đã tự sửa |
| I-02 | UD-06 Zero Cost | ✅ PASS / ❌ FAIL → đã tự sửa |
| I-03 | Fabric-Safe Navigation | ✅ PASS / ❌ FAIL → đã tự sửa |
| I-04 | Platform Scope (3 roles Mobile) | ✅ PASS / ❌ FAIL → đã tự sửa |
| I-05 | Defect Types (5 mã BTXM) | ✅ PASS / ❌ FAIL → đã tự sửa |
| I-06 | Branding & Tech Standards | ✅ PASS / ❌ FAIL → đã tự sửa |
| I-07 | Data Contract (Canonical 17_10) | ✅ PASS / ❌ FAIL → đã tự sửa |
| I-08 | Error Handling Convention | ✅ PASS / ❌ FAIL → đã tự sửa |

---

## 4. Self-Healing Log — Nhật Ký Tự Sửa

### Attempt #1 / 5
- **Lỗi phát hiện:** [File, dòng, mô tả lỗi]
- **Hành vi đúng theo Canonical 17_10:** [Giải thích]
- **Fix đã áp dụng:** [Mô tả cụ thể]
- **Kết quả verify:** [PASS / FAIL]

*(Lặp lại cho mỗi attempt)*

---

## 5. Canonical 17_10 Alignment Check

- [ ] State Machine đủ (skeleton/empty/error/offline/stale)
- [ ] 10 Invariants nghiệp vụ cốt lõi đều đúng
- [ ] Optimistic UI tuân thủ giới hạn

---

## 6. Kết Luận

- **Trạng thái cuối:** `✅ APPROVED FOR MERGE` / `⚠️ ESCALATE_TO_HUMAN`
- **Lỗi tồn đọng (nếu escalate):** [Mô tả chi tiết lý do không tự fix được]
- **Ghi chú thêm:** [Nếu có]
```

---

## 🚀 CÁCH SỬ DỤNG SKILL NÀY

### Cho owner — Khi giao việc cho AI trong IDE:

> *"Làm xong màn [tên màn hình], kích hoạt skill `code-review` tự thẩm định, nếu có lỗi thì tự sửa tối đa 5 vòng, ghi kết quả vào docs/worklogs/ theo template chuẩn."*

### Cho AI — Khi trigger từ keyword:

Trigger phrases: `"review code"`, `"check lại"`, `"tự vả tự sửa"`, `"auto-fix"`, `"fix lỗi"`, `"kiểm tra chất lượng"`, `"nghiệm thu"`.

**Thứ tự bắt buộc:**
1. Đọc danh sách file vừa thay đổi
2. Chạy `npx tsc --noEmit`
3. Quét 8 bộ lọc invariant
4. Audit báo finding; implement tự sửa trong allowlist tối đa 5 vòng, ngoài scope báo trước
5. Kiểm tra Canonical 17_10 alignment
6. Worklog chỉ khi implement task cho phép; audit báo trong chat
7. Báo cáo ngắn gọn kết quả cho owner (không paste toàn bộ worklog)

---

## 📁 CẤU TRÚC THƯ MỤC LIÊN QUAN

```
FE_AppMobile\
├── docs\specs\                        ← Nguồn sự thật (CANONICAL 17_10)
│   ├── 00_Governance\01_Authority-and-Source-of-Truth.md
│   ├── 01_Product-and-Roles\02_Actor-Client-Permission-Matrix.md
│   ├── 04_API-Contracts\              ← 02_Full-API-Catalog.md (241 ops), 03_DTO, 05_Errors, 07_Offline-Sync-Crypto
│   └── 06_Mobile-Expo\                ← Reporter | Crew | Operator | 07_Mobile-Integration-Acceptance.md
├── app\                               ← Code Mobile (3 roles)
├── src\constants\defect-types.ts      ← 5 mã chuẩn BTXM
├── skills\code-review\SKILL.md        ← File này
└── docs\worklogs\                     ← Output báo cáo nghiệm thu
```

---

## ⚠️ NHỮNG ĐIỀU TUYỆT ĐỐI CẤM

1. ❌ Tuyên bố "PASS" mà không chạy compiler thực tế
2. ❌ Reviewer độc lập sửa file; implement sửa ngoài allowlist hoặc quá 5 vòng không báo
3. ❌ Dùng Ionicons thay MaterialIcons
4. ❌ Hiển thị tiền/VNĐ/chi phí trên Mobile UI
5. ❌ Đổi payload hay idempotency key của request đã gửi
6. ❌ Xóa hoặc ghi đè ảnh BEFORE/AFTER evidence
7. ❌ Đặt màn hình PM/Supervisor trong app/ Mobile
8. ❌ Dùng mã khuyết tật ngoài 5 mã chuẩn BTXM
9. ❌ Sử dụng LiDAR trong bất kỳ context nào
10. ❌ Tạo worklog khi audit read-only; claim reviewer/mode/evidence không đúng người thực hiện
