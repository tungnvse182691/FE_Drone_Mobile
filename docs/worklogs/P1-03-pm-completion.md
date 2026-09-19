# Completion Log — P1-03 PM (Phân khu `(pm)`)

> **Mẫu nghiệm thu chuẩn Antigravity Delivery** — Đã điền cho Phase PM.
> **Đặt tên file:** `P{person}-{phase}-{tên-phase}-completion.md`

---

## Thông tin cơ bản

| Trường | Giá trị |
|---|---|
| **Phase** | P1-03 |
| **Tên phase** | Project Manager Role — nhóm `(pm)` 4 màn cuối luồng nghiệm thu: Batching → Submit → Resubmit → Track |
| **Người thực hiện** | Tùng |
| **Ngày hoàn thành** | 2026-09-18 |
| **AI hỗ trợ** | OpenCode (Big Pickle) |
| **Thời gian thực hiện** | ~2h (ước lượng, 4 màn + sửa `_layout` + typecheck) |

---

## Danh sách file đã tạo / sửa (đợt này)

```
# 4 màn PM đợt 3 — luồng "Gộp đợt → Trình duyệt → Trình duyệt lại → Theo dõi"
app/(pm)/batching.tsx                    [MỚI - M-PM-08 Gộp đợt sửa chữa, 3 hư hỏng cùng tổng, CTA disabled khi 0 chọn]
app/(pm)/submit-approval.tsx             [MỚI - M-PM-09 Trình duyệt #REQ-045, chi phí text read-only 74.900.000 VNĐ + SEL + textarea + người tiếp nhận]
app/(pm)/resubmit.tsx                    [MỚI - M-PM-10 Chỉnh sửa & trình duyệt lại, ý kiến Giám sát trưởng + giải trình PM + CTA duy nhất]
app/(pm)/submitted-tab.tsx               [MỚI - M-PM-11 5 yêu cầu đã gửi duyệt, 3 tab + StatusPill + lý do từ chối + 3 hành động]
app/(pm)/_layout.tsx                     [SỬA - activePrefixes tab Hộp thư AI thêm 4 route mới]

# Ngoài phạm vi nhưng chạm tới
docs/planning/RoadGuard_Plan_Person_1.md [SỬA - tick [x] 1.3.9 → 1.3.12]
docs/worklogs/P1-03-pm-completion.md     [MỚI - file này]
```

---

## Kết quả kiểm chứng

### ✅ Kiểm chứng bằng chạy thật
- [x] `npm run typecheck` — **0 lỗi** (xác nhận toàn bộ dự án sạch typecheck)

### ✅ Kiểm chứng Routing & Reachability (grep, không phải phỏng đoán)
- [x] Đủ **4/4 file** mới tồn tại thật
- [x] Grep toàn bộ `router.push` trong đợt này:
      `batching → /(pm)/submit-approval` · `submit-approval → /(pm)/submitted-tab`
      `submitted-tab → /(pm)/ai-inbox` / `/(pm)/verify-a` / `/(pm)/resubmit`
      → **2 màn target `ai-inbox` / `verify-a` có file thật**; `submit-approval`/`submitted-tab`/`resubmit` đều có file thật
- [x] `Giao việc ngay` trong `submitted-tab` → **Toast placeholder** (SẼ chuyển sang M-PM-12 `assign-crew` chưa tồn tại) → **0 dead link, không black-screen**
- [x] `_layout.tsx` activePrefixes Hộp thư AI đã gồm đủ: `ai-inbox, verify-a, verify-b, field-task, batching, submit-approval, resubmit, submitted-tab` → nút tab sáng đúng trong toàn luồng

### ✅ Kiểm chứng Business Rules
- [x] `batching`: tổng **tự tính** từ dữ liệu (2 hư hỏng mặc định / 32.5 m² / **74.900.000 VNĐ**) — không có input nhập tay chi phí (UD-06)
- [x] `batching`: CTA `disabled` khi `selected.length === 0`
- [x] `submit-approval`: chi phí dự toán là **text read-only** `74.900.000 VNĐ` (resolved mâu thuẫn wireframe: 42.500.000 vs 15.000.000)
- [x] `submitted-tab`: trạng thái đúng nghiệp vụ — pending (`Đang chờ`, chỉ xem) / approved (`Chờ giao việc`) / rejected (`Yêu cầu sửa` + hiện lý do + cho phép `Gửi lại phê duyệt` → resubmit)

### ✅ Kiểm chứng Design (theo code + grep)
- [x] **1 CTA vàng đồng (#C9A227) duy nhất mỗi màn**: batching=`Soạn hồ sơ trình Giám sát phê duyệt`, submit-approval=`Gửi phê duyệt`, resubmit=`Lưu & Trình duyệt lại hồ sơ`; submitted-tab=0 CTA (chỉ tab active + link vàng) → đúng quy tắc
- [x] Badge màu ngữ nghĩa dùng hex cục bộ có precedent (`#FEF3E2`/`#8C6D1F` amber tint như Chip.tsx)
- [x] Format tiền: `formatCost` dùng regex nhóm nghìn (không dùng toLocaleString)
- [x] `Toast` component hỗ trợ sẵn `type: 'info'` (`src/components/Toast.tsx:5`) — đã dùng đúng cho thông báo trung tính
- [x] `SafeAreaScreen scroll` đảm nhiệm scroll — **không lồng ScrollView trong ScrollView** (đã gỡ ở submit-approval)

---

## Điểm phát hiện & xử lý trong đợt này

| # | Vấn đề gặp phải | Cách giải quyết | File liên quan |
|---|---|---|---|
| 27 | Lỗi TS: union `ToastMessage` thiếu `'info'` khi dùng toast "Xem ảnh gốc 4K" / "Mở bộ lọc" | Thêm `'info'` vào union (Toast component thật đã hỗ trợ sẵn) | `submit-approval.tsx:16`, `submitted-tab.tsx:59` |
| 28 | `submit-approval` ban đầu lồng `ScrollView` bên trong `SafeAreaScreen scroll` (2 ScrollView) | Gỡ ScrollView trong, để `SafeAreaScreen scroll` đảm nhiệm | `submit-approval.tsx` |
| 29 | Wireframe submit-approval mâu thuẫn số tiền: Card #DF-0231 = 42.500.000 VNĐ, đề xuất = 15.000.000 VNĐ (Spec), tổng đợt = 74.900.000 VNĐ | **Chốt theo data**: Card hiện đúng 42.500.000, tổng đề xuất = 74.900.000 (SUM 2 mục batching), chú thích dưới dòng chi phí ghi rõ "chi tiết #DF-0231: 42.500.000 VNĐ" — không hiện 15.000.000 | `submit-approval.tsx` |
| 30 | "Giao việc ngay" (M-PM-12 assign-crew) chưa có file → `router.push` sẽ black-screen | Giữ **Toast placeholder** "Sẽ chuyển sang màn Giao việc (M-PM-12)"; track pending trong plan 1.3.13 | `submitted-tab.tsx` |
| 31 | `colors.onSurface` — cần xác nhận tồn tại trong design-tokens trước khi dùng | Grep xác nhận có (`src/design-tokens.ts:10`) — dùng ngay mà không cần fallback | `submit-approval.tsx` |

---

## Điểm TODO / Chưa hoàn chỉnh trong đợt này

- [ ] **`app/(pm)/assign-crew.tsx` (M-PM-12)** — chưa tạo; nút "Giao việc ngay" đang Toast placeholder. Sẽ làm ở đợt kế (1.3.13), việc 1 CTA/màn không bị vi phạm
- [ ] `wo-confirm.tsx` (M-PM-13) & `profile.tsx` (M-PM-15) chưa thuộc đợt này • `verify-a`/`verify-b`/`field-task` đã tồn tại trước đó (đợt 1-2)
- [ ] CTA `batching`, `submit-approval`, `resubmit` mới `Toast` + điều hướng — **CHƯA ghi vào offline outbox / tạo `RepairBatch` trong SQLite**; đây là task phase offline-sync

---

## Lệnh để review nhanh (dành cho reviewer)

```bash
# Kiểm tra TypeScript không lỗi
npm run typecheck

# Chạy app trên emulator Android
npx expo start --android

# LƯU Ý: repo chưa có commit nào (0 commit, mọi file untracked) nên KHÔNG dùng được git diff;
# soi trực tiếp 4 file:
#   app/(pm)/batching.tsx submit-approval.tsx resubmit.tsx submitted-tab.tsx
```

---

## Chữ ký bàn giao

- **Người thực hiện:** _Tùng_ — Ngày: 2026-09-18
- **Người review:** _Antigravity AI (Kiến trúc & Quy trình)_ — Ngày: 2026-09-18
- **Status:** `[x] PENDING_REVIEW` → `[ ] APPROVED` → `[ ] MERGED`

---

# ĐỢT 4 — Giao việc Crew, Nghiệm thu, Hồ sơ PM (M-PM-12/13/15)

> Nối tiếp P1-03. Đóng 3 màn còn lại của nhóm `(pm)`, hoàn tất 100% Phase 1.3.

## Thông tin cơ bản

| Trường | Giá trị |
|---|---|
| **Phase** | P1-03 Đợt 4 |
| **Tên** | Project Manager Role — 3 màn cuối: Assign Crew (M-PM-12) → Confirm (M-PM-13) → Profile (M-PM-15) |
| **Người thực hiện** | Tùng |
| **Ngày hoàn thành** | 2026-09-18 |
| **AI hỗ trợ** | OpenCode (Big Pickle) |
| **Thời gian** | ~1.5h (3 màn + tick plan + typecheck) |

## Danh sách file đã tạo / sửa

```
app/(pm)/assign-crew.tsx      [MỚI - M-PM-12: Chọn đội Repair Crew, radio 4 đội, CTA Giao việc → WO-118]
app/(pm)/wo-confirm.tsx       [MỚI - M-PM-13: Nghiệm thu hoàn thành, ảnh Trước/Sau + video flycam + ghi chú đội]
app/(pm)/profile.tsx          [MỚI - M-PM-15: Hồ sơ PM Nguyễn Thùy Lan, 2 stats, 3 nhóm cài đặt, đổi mật khẩu, đăng xuất]
docs/planning/RoadGuard_Plan_Person_1.md [SỬA - tick [x] 1.3.13 → 1.3.15]
docs/worklogs/P1-03-pm-completion.md     [SỬA - nối Đợt 4]
```

## Kết quả kiểm chứng

- [x] `npm run typecheck` — **0 lỗi**
- [x] Đủ **3/3 file** mới tồn tại thật
- [x] Navigation toàn đúng route thật (có full group prefix):
      `assign-crew → /(crew)/tasks` (tồn tại) · `wo-confirm → /(pm)/submitted-tab` & `/(pm)/home` · `profile → /(auth)` & `/(auth)/force-change-password`
- [x] No `(sup)` folder → CTA nghiệm thu của `wo-confirm` **KHÔNG** push `/(sup)/signoff` như HTML (route không tồn tại → black-screen); thay bằng `/(pm)/submitted-tab` (đúng target nút back của HTML) — **0 dead link**
- [x] `_layout.tsx` KHÔNG sửa (activePrefixes Hộp thư AI đã đủ; 3 màn mới ngoài tab) — đúng quyết định chốt
- [x] 1 CTA vàng đồng `#C9A227` duy nhất/màn: assign-crew=`Giao việc`, wo-confirm=`Xác nhận hoàn thành` (Yêu cầu làm lại = outline rose, phụ) · profile=0 CTA (chỉ logout rose + avatar camera gold nhỏ)
- [x] `profile` → đăng xuất clear auth store bằng `useAuthStore` (`src/store/auth.ts:21`) + `router.replace('/(auth)')`, đúng pattern crew `profile.tsx`

## Điểm phát hiện & xử lý

| # | Vấn đề | Cách giải quyết | File |
|---|---|---|---|
| 32 | Ionicons `badge-outline` không tồn tại trong union type | Thay bằng `id-card-outline` (icon chuẩn, crew profile đã dùng) | `profile.tsx` |
| 33 | `Alert` dùng trong `handleAccountRow` nhưng import đặt sai vị trí (cuối file) + biến `requirements` rác | Chuyển import lên đầu với `react-native`, xóa biến rác | `profile.tsx` |

## Lệnh review nhanh

```bash
npm run typecheck
# soi 3 file: app/(pm)/assign-crew.tsx  wo-confirm.tsx  profile.tsx
# (repo chưa có commit nào → KHÔNG dùng git diff được)
```