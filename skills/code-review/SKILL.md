---
name: code-review
description: "Kỹ năng thẩm định + tự sửa mã nguồn (Code Review & Auto-Fix) chuyên biệt cho dự án RoadGuard (Công ty TNHH Xây dựng Bê tông Hoàng Hải). Bắt buộc kích hoạt sau khi AI viết code xong bất kỳ màn hình/tính năng nào, hoặc khi Sếp yêu cầu ('review code', 'check lại', 'tự vả tự sửa', 'kiểm tra chất lượng', 'auto-fix', 'fix lỗi'). Skill hoạt động như một QA Lead / Senior Reviewer độc lập: quét diff thực, chạy compiler, rà soát 8 invariant cứng (MaterialIcons, UD-06, Fabric-safe, platform scope, defect-types, branding, contract data, error handling), tự sửa lỗi theo vòng lặp Self-Healing tối đa 5 vòng, và xuất nhật ký nghiệm thu vào docs/worklogs/."
---

# RoadGuard Code Review & Auto-Fix Skill
### Quality Gate — Cơ chế Tự Vả Tự Sửa (Self-Healing Loop)

> *Bộ tài liệu chuẩn nguồn sự thật: `D:\Do_AN_Drone\27_9_V3\` — Phiên bản FE-R3-v1, ngày 27/09/2026*

AI khi đóng vai QA Reviewer **KHÔNG ĐƯỢC CHÂM CHƯỚC** cho bất kỳ sự cẩu thả nào. Đây không phải bước tùy chọn — đây là **cổng nghiệm thu bắt buộc**.

---

## ⚙️ CORE PRINCIPLES — BẤT DI BẤT DỊCH

| # | Nguyên tắc | Giải thích |
|---|---|---|
| P1 | **Evidence-Based Only** | Không review bằng trí nhớ hay suy đoán. Mọi đánh giá phải xuất phát từ lệnh chạy thật và đọc nội dung file thật. |
| P2 | **Self-Healing Loop (Auto-Fix)** | Khi phát hiện lỗi, AI **KHÔNG ĐƯỢC** dừng lại báo cáo suông. Phải **TỰ ĐỘNG SỬA FILE NGAY LẬP TỨC**, sau đó kiểm chứng lại. Tối đa **5 vòng lặp**. Nếu sau 5 vòng vẫn fail → ghi nhận `ESCALATE_TO_HUMAN`. |
| P3 | **Mandatory Worklog** | Mỗi session review xong, AI **BẮT BUỘC TẠO 1 FILE .MD MỚI** trong `docs/worklogs/` ghi đầy đủ kết quả. |
| P4 | **No Silent Pass** | TUYỆT ĐỐI CẤM tuyên bố "PASS" mà không chạy lệnh compiler thực tế. |
| P5 | **Specification Inference** | Trước khi fix lỗi phức tạp (không phải lint), AI phải trình bày rõ *"Hành vi mong muốn theo 27_9_V3 là gì"* rồi mới áp dụng fix. |

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
│  0 LỖI? ──→ BƯỚC 5: Kiểm tra 27_9_V3 Alignment             │
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

> Nếu có lỗi: CHUYỂN NGAY SANG BƯỚC 4 (Auto-Fix), KHÔNG báo cáo lỗi suông.

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
Select-String -Path "D:\Do_AN_Drone\FE_AppMobile\app\**\*.tsx" -Pattern "Ionicons" -Recurse
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
Select-String -Path "D:\Do_AN_Drone\FE_AppMobile\app\**\*.tsx" -Pattern "vnđ|vnd|chi phí|dự toán|kinh phí|định mức|đơn giá|42\.500|74\.900|₫" -Recurse -CaseSensitive:$false
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
Select-String -Path "D:\Do_AN_Drone\FE_AppMobile\app\**\*.tsx" -Pattern "'CRACK'|'POTHOLE'|'EROSION'|'DAMAGE'|defectType:\s*['\"](?!POTH_DEEP|DEPR_POND|EDGE_BRK|SLAB_CRK|SHLD_EROS)" -Recurse
```

**Auto-Fix:** Thay mã tự chế bằng 5 mã chuẩn từ `defect-types.ts`.

---

#### 🔴 INVARIANT-06: Bộ lọc Thương Hiệu & Tiêu Chuẩn Kỹ Thuật

| Hạng mục | Đúng | Sai — Tự sửa ngay |
|---|---|---|
| Tên công ty | `Công ty TNHH Xây dựng Bê tông Hoàng Hải` | Tên viết tắt không chính thức |
| Email domain | `@hoanghai.vn` | `@gmail.com`, `@roadguard.vn` |
| Prefix nhân sự | `HH-` | `RG-`, `NV-` |
| Tiêu chuẩn đường | `TCVN 10380:2014` (Bê tông xi măng) | Nhựa đường, asphalt |
| Công nghệ khảo sát | `4K RGB + DSM (OpenDroneMap)` | LiDAR (Red Flag) |
| Logo Splash | `assets/logo_hoanghai.png` (có chữ) | Dùng nhầm icon-only |
| Logo Header | `assets/logo_hoanghai_icon.png` (chỉ xe bồn) | Dùng nhầm logo có chữ |
| Màu thương hiệu | Vàng Đồng `#C9A227` | Màu vàng khác |

---

#### 🟡 INVARIANT-07: Bộ lọc Data Contract (theo `27_9_V3/09_Frontend/04_Data_Contract_Type_Definitions.md`)

**Các vi phạm phổ biến cần quét:**

```powershell
# Kiểm tra dùng array index làm ID (cấm)
Select-String -Path "D:\Do_AN_Drone\FE_AppMobile\**\*.tsx" -Pattern "\.id\s*=\s*index|key=\{index\}" -Recurse

# Kiểm tra tọa độ GPS sai (dùng (0,0) thay null)
Select-String -Path "D:\Do_AN_Drone\FE_AppMobile\**\*.tsx" -Pattern "latitude:\s*0,\s*longitude:\s*0" -Recurse
```

**Quy tắc bắt buộc:**
- UUID là `string`, không dùng numeric ID
- Tọa độ GPS thiếu → `null`, không phải `{latitude: 0, longitude: 0}`
- Timestamp phải RFC3339 có timezone
- Enum giữ nguyên chữ hoa, UI label dịch riêng
- `Page<T>` chứa `items/nextCursor/asOf`, không có `total/page/hasNextPage`

---

#### 🟡 INVARIANT-08: Bộ lọc Error Handling (theo `27_9_V3/09_Frontend/03_Error_Response_UI_Convention.md`)

**Các vi phạm cần phát hiện và Auto-Fix:**

| Vi phạm | Auto-Fix |
|---|---|
| Hiển thị message "Gửi thất bại" sau timeout (nên là "Chưa xác nhận, đang kiểm tra") | Thay text error message |
| Toast cho mỗi chunk upload hoặc mỗi retry | Gộp thành 1 banner |
| Render HTML error từ server lên UI | Dùng fallback message trung tính |
| Hiển thị "Đã đồng bộ" khi chỉ `navigator.onLine = true` | Cần API probe thực |
| `innerHTML` để render error message | Thay bằng `text` render |
| Double-submit không khóa | Thêm `disabled` state trong khi loading |

**Bảng mã lỗi nghiệp vụ cần có UI riêng:**
| Code | UI hiển thị |
|---|---|
| `TASK_MODE_NOT_REPAIRABLE` | "Nhiệm vụ này chỉ cho phép kiểm tra/đo; lưu kết quả và báo PM" |
| `FAST_TRACK_NOT_ELIGIBLE` | "Không đủ điều kiện sửa nhanh", hiển thị reasons |
| `PM_REPAIR_BLOCKED` | "PM đã chặn sửa nhanh" |
| `BEFORE_MISSING` | "Bổ sung bằng chứng trước sửa" |
| `EVIDENCE_PENDING` | "Ảnh chưa được máy chủ xác minh" |
| `FILE_INTEGRITY_FAILED` | "Tệp kiểm tra không khớp; giữ bản gốc và tải lại" |

---

### BƯỚC 4 — AUTO-FIX LOOP (Self-Healing Execution)

> **Đây là phần CỐT LÕI của skill. Không được bỏ qua.**

```
┌─ VÒNG LẶP AUTO-FIX ─────────────────────────────────────────┐
│                                                              │
│  attempt = 1                                                 │
│  max_attempts = 5                                            │
│                                                              │
│  WHILE errors_exist AND attempt <= max_attempts:             │
│    1. [DIAGNOSE] Ghi nhận: File nào, dòng nào, lỗi gì      │
│    2. [INTENT] Nêu rõ "Theo 27_9_V3, hành vi đúng là..."  │
│    3. [FIX] Dùng replace_file_content/write_to_file sửa     │
│    4. [VERIFY] Chạy lại npx tsc --noEmit + quét lại         │
│    5. Ghi vào Self-Healing Log: attempt #N, lỗi X, fix Y    │
│    attempt++                                                 │
│                                                              │
│  IF attempt > 5 AND errors_exist:                            │
│    → Trạng thái: ESCALATE_TO_HUMAN                           │
│    → Mô tả chi tiết lỗi tồn đọng, lý do không tự fix được  │
│    → Vẫn tạo worklog với mục "4. Lỗi Cần Người Can Thiệp"  │
└──────────────────────────────────────────────────────────────┘
```

**Nguyên tắc khi Auto-Fix:**
- **Sửa triệt để** không chỉ vá biểu hiện — phải xóa tận gốc nguyên nhân.
- **Payload bất biến:** Nếu request đã gửi, KHÔNG đổi payload hay idempotency key.
- **Không silent fix:** Mỗi lần sửa phải ghi rõ vào Self-Healing Log.
- **Không override evidence:** Tuyệt đối không xóa ảnh BEFORE/AFTER, không đổi status server.
- **Đơn nhất:** Chỉ fix đúng lỗi đã xác định. Không "refactor" thêm code không liên quan.

---

### BƯỚC 5 — Kiểm tra 27_9_V3 Alignment (Specification Check)

Sau khi pass tất cả 8 Invariants, kiểm tra thêm các quy tắc nghiệp vụ từ bộ tài liệu chuẩn:

#### 5.1 Trạng thái State Machine (từ `10_FE_Architecture_UI_States.md`)
- [ ] Màn Task List có đủ state: skeleton/empty/error/cached-stale/load-more?
- [ ] Nút bị disable có kèm lý do gần nút (không chỉ màu xám)?
- [ ] Offline badge hiển thị xuyên màn hình tác nghiệp?
- [ ] Nhãn "Đã tải lúc…" luôn đọc được khi có cache?

#### 5.2 Invariants Nghiệp Vụ Cốt Lõi (từ `01_FE_Scope_Implementation_Guide.md`)
```
✅ Saved ≠ Sent ≠ Verified ≠ Done   ← Bốn trạng thái KHÔNG thay thế nhau
✅ Mobile: chỉ 3 role hiện trường (Crew/Drone/Reporter)
✅ Web: PM + Supervisor — ONLINE ONLY
✅ Fast Track: Crew làm → PM kiểm/đóng → Supervisor nhận báo
✅ MEASURE_ONLY: chỉ đo, KHÔNG sửa (UD-06 mode block)
✅ WF-07: 4 trạng thái phê duyệt: APPROVE/REQUEST_EVIDENCE/REQUEST_RECONSIDER/REJECT
✅ BEFORE bắt buộc trước khi Start Repair (không đổi AFTER thành BEFORE)
✅ AI bbox: KHÔNG suy depth/severity cuối cùng từ bounding box
✅ LiDAR: CẤM tuyệt đối (chỉ 4K RGB + DSM OpenDroneMap)
✅ Không có field tiền tệ/VNĐ/đơn giá trong bất kỳ màn hình nào
```

#### 5.3 Optimistic UI Check (từ `10_FE_Architecture_UI_States.md`)
- [ ] KHÔNG optimistic cho: phê duyệt, đóng hồ sơ, publish policy, role change
- [ ] Optimistic mark-as-read notification có rollback và version đúng không?

---

### BƯỚC 6 — Xuất Báo Cáo Nghiệm Thu Worklog Bắt Buộc

**Quy định:**
- Tên file: `docs/worklogs/<Phase-ID>-<Task-Name>-<YYYYMMDD>-review.md`
- Ví dụ: `docs/worklogs/M-CREW-03-submit-repair-20260927-review.md`

**Template chuẩn:**

```markdown
# Báo Cáo Nghiệm Thu & Thẩm Định Mã Nguồn — Code Review Worklog

- **Thời gian:** [YYYY-MM-DD HH:mm] (UTC+7)
- **Người thẩm định:** Antigravity Auto-Reviewer (theo ủy quyền QA Lead — RoadGuard FE-R3-v1)
- **Feature / Màn hình:** [Mô tả ngắn, ví dụ: M-CREW-03 Submit Repair Form]
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
| I-07 | Data Contract (27_9_V3) | ✅ PASS / ❌ FAIL → đã tự sửa |
| I-08 | Error Handling Convention | ✅ PASS / ❌ FAIL → đã tự sửa |

---

## 4. Self-Healing Log — Nhật Ký Tự Sửa

### Attempt #1 / 5
- **Lỗi phát hiện:** [File, dòng, mô tả lỗi]
- **Hành vi đúng theo 27_9_V3:** [Giải thích]
- **Fix đã áp dụng:** [Mô tả cụ thể]
- **Kết quả verify:** [PASS / FAIL]

*(Lặp lại cho mỗi attempt)*

---

## 5. 27_9_V3 Alignment Check

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

### Cho Sếp — Khi giao việc cho AI trong IDE:

> *"Làm xong màn [tên màn hình], kích hoạt skill `code-review` tự thẩm định, nếu có lỗi thì tự sửa tối đa 5 vòng, ghi kết quả vào docs/worklogs/ theo template chuẩn."*

### Cho AI — Khi trigger từ keyword:

Trigger phrases: `"review code"`, `"check lại"`, `"tự vả tự sửa"`, `"auto-fix"`, `"fix lỗi"`, `"kiểm tra chất lượng"`, `"nghiệm thu"`.

**Thứ tự bắt buộc:**
1. Đọc danh sách file vừa thay đổi
2. Chạy `npx tsc --noEmit`
3. Quét 8 bộ lọc invariant
4. Nếu có lỗi → **TỰ SỬA NGAY** (không hỏi Sếp trước)
5. Kiểm tra 27_9_V3 alignment
6. Tạo worklog `.md` trong `docs/worklogs/`
7. Báo cáo ngắn gọn kết quả cho Sếp (không paste toàn bộ worklog)

---

## 📁 CẤU TRÚC THƯ MỤC LIÊN QUAN

```
D:\Do_AN_Drone\
├── 27_9_V3\                          ← Nguồn sự thật (CANONICAL)
│   └── 09_Frontend\
│       ├── 01_FE_Scope_Implementation_Guide.md
│       ├── 02_Authentication_Flow.md
│       ├── 03_Error_Response_UI_Convention.md
│       ├── 04_Data_Contract_Type_Definitions.md
│       ├── 08_Rate_Limit_Timeout_Retry.md
│       ├── 10_FE_Architecture_UI_States.md
│       ├── 11_FE_Offline_Test_UAT.md
│       └── 12_Decisions_Contract_Gaps.md
└── FE_AppMobile\
    ├── app\                           ← Code Mobile (3 roles)
    ├── src\constants\defect-types.ts  ← 5 mã chuẩn BTXM
    ├── skills\code-review\SKILL.md    ← File này
    └── docs\worklogs\                 ← Output báo cáo nghiệm thu
```

---

## ⚠️ NHỮNG ĐIỀU TUYỆT ĐỐI CẤM

1. ❌ Tuyên bố "PASS" mà không chạy compiler thực tế
2. ❌ Báo cáo lỗi mà không tự sửa (khi còn trong giới hạn 5 vòng)
3. ❌ Dùng Ionicons thay MaterialIcons
4. ❌ Hiển thị tiền/VNĐ/chi phí trên Mobile UI
5. ❌ Đổi payload hay idempotency key của request đã gửi
6. ❌ Xóa hoặc ghi đè ảnh BEFORE/AFTER evidence
7. ❌ Đặt màn hình PM/Supervisor trong app/ Mobile
8. ❌ Dùng mã khuyết tật ngoài 5 mã chuẩn BTXM
9. ❌ Sử dụng LiDAR trong bất kỳ context nào
10. ❌ Bỏ qua bước tạo worklog sau review
