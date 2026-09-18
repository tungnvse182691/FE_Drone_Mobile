# Completion Log — P1-01 FOUNDATION (Scaffold + Auth + Core Infra)

> **Mẫu nghiệm thu chuẩn Antigravity Delivery** — Đã điền cho Phase 1.0.
> **Đặt tên file:** `P{person}-{phase}-{tên-phase}-completion.md`

---

## Thông tin cơ bản

| Trường | Giá trị |
|---|---|
| **Phase** | P1-01 |
| **Tên phase** | Scaffold Foundation — Auth + Core Infra + Design Tokens + Components |
| **Người thực hiện** | Tùng |
| **Ngày hoàn thành** | 2026-09-17 |
| **AI hỗ trợ** | OpenCode (Big Pickle) + Antigravity review |
| **Thời gian thực hiện** | ~3h (ước lượng) |

---

## Danh sách file đã tạo / sửa

```
# Root layout & Auth
app/_layout.tsx                          [MỚI - fonts Roboto/Sansation, QueryClientProvider, StatusBar, AuthGuard, ROLE_HOMES]
app/(auth)/_layout.tsx                   [MỚI - Stack headerShown=false]
app/(auth)/index.tsx                     [MỚI - màn login, mock login + useAuthStore]
app/(auth)/force-change-password.tsx     [MỚI - đổi MK bắt buộc]

# Design system
src/design-tokens.ts                     [MỚI + SỬA - colors/typography/spacing/radius; fontFamily Roboto/Roboto-Medium/Roboto-Bold thay fontWeight]

# Components (bộ base tái sử dụng toàn app)
src/components/BottomNav.tsx             [MỚI - 4 tab, active gold]
src/components/Button.tsx                [MỚI - primary/secondary/text, loading, disabled]
src/components/Card.tsx                  [MỚI]
src/components/Chip.tsx                  [MỚI - severity high/medium/low, status-pending, approved, rejected]
src/components/EmptyState.tsx            [MỚI]
src/components/FAB.tsx                   [MỚI - bottom:96 right:16 zIndex:30]
src/components/InputField.tsx            [MỚI + SỬA - thêm prop secureTextEntry]
src/components/SafeAreaScreen.tsx        [MỚI - edges top/left/right, scroll tùy chọn]
src/components/StatusBadge.tsx           [MỚI - 5 SyncStatus]
src/components/Toast.tsx                 [MỚI - success/error/info]
src/components/ViewFinder.tsx            [MỚI]

# Types
src/types/enums.ts                       [MỚI - RoleCode/SyncStatus/IntegrationStatus/DefectStatus/Severity/RepairBatchStatus/FieldInspectionTaskStatus/MeasurementType]
src/types/domain.ts                      [SỬA - /// <reference types="geojson" /> chữa GeoJSON; fix dòng import bị hỏng do edit]

# Stores
src/store/auth.ts                        [MỚI - zustand + persist]
src/store/offline.ts                     [MỚI - queueCount, pendingItems, add/remove/decrement/clear]

# Offline infra
src/offline/checksum.ts                  [MỚI - SHA-256 pure JS]
src/offline/database.ts                  [SỬA - cast unknown -> SQLiteBindValue]
src/offline/schema.sql                   [MỚI - local_draft/outbox/media_file/...]
src/offline/upload-queue.ts              [MỚI]

# Mock API
src/api/mock/auth.ts                     [SỬA - RoleCode.DRONE_OPERATOR/PROJECT_MANAGER/REPAIR_CREW/SUPERVISOR]
src/api/mock/defects.ts                  [SỬA - DefectStatus.VERIFIED]
src/api/mock/repair-batches.ts           [MỚI]
src/api/mock/surveys.ts                  [SỬA - IntegrationStatus.INTACT]

# Config
tsconfig.json                            [SỬA - strict true; allowUmdGlobalAccess]
```

---

## Kết quả kiểm chứng

### ✅ Kiểm chứng bằng chạy app thật (Metro / Expo Go)
- [ ] `npx expo start` — Không lỗi bundle (chưa chạy app thật, mới verify export)
- [x] Không có lỗi TypeScript khi build (`npx tsc --noEmit`) — 0 lỗi
- [ ] Chuyển màn hình không bị crash (chưa kiểm trên thiết bị)
- [x] Bundle Android export OK (`npx expo export --platform android`, Hermes ~2.9MB)

### ✅ Kiểm chứng Business Rules quan trọng
- [x] SHA-256 pure JS pass 3 vector chuẩn FIPS 180-2 (empty, "abc", "The quick brown fox...") + test phát hiện dữ liệu tamper
- [x] AuthGuard: login + `must_change_password === true` → redirect `/force-change-password`
- [x] AuthGuard: login bình thường còn trong `(auth)` → redirect đúng ROLE_HOMES theo role_code
- [x] Offline queue vòng đời `LOCAL → QUEUED → UPLOADING → SERVER_CONFIRMED` (enum + StatusBadge)

### ✅ Kiểm chứng Design (theo code)
- [x] Chỉ 1 nút vàng đồng `#C9A227` cho hành động chính mỗi màn (login/đổi MK)
- [x] Không có shadow đậm, không có gradient
- [x] FAB đúng vị trí bottom:96, right:16, zIndex:30
- [x] Font Roboto cho nội dung; Sansation chỉ dành headline/logo (guard try/catch, vì file chưa có)

---

## Điểm phát hiện & xử lý trong phase này

| # | Vấn đề gặp phải | Cách giải quyết | File liên quan |
|---|---|---|---|
| 1 | `fontWeight` không render được với font nạp qua expo-font | Đổi sang `fontFamily: 'Roboto'/'Roboto-Medium'/'Roboto-Bold'` | `src/design-tokens.ts` |
| 2 | Namespace GeoJSON không resolve (tsc nhận mặc dù 3 CẤM giao cấu hình) | Thêm `/// <reference types="geojson" />` ở dòng đầu | `src/types/domain.ts:1` |
| 3 | Mock dùng sai tên enum (RoleCode.DRONE, DefectStatus.VERIFIED, IntegrationStatus.INTACT...) | Sửa đúng theo spec | `src/api/mock/*` |
| 4 | `expo-sqlite` bind nhận `SQLiteBindValue`, giá trị `unknown` gây lỗi TS | Cast tường minh | `src/offline/database.ts` |
| 5 | Một edit vô ý làm hỏng dòng đầu domain.ts | Đọc lại file, sửa ngay sau khi phát hiện | `src/types/domain.ts` |
| 6 | Review AuthGuard: redirect login sai role group; branch sai `inForceChange → "/"` | Thêm ROLE_HOMES, redirect `(auth)` → role home; bỏ branch sai | `app/_layout.tsx` |

---

## Điểm TODO / Chưa hoàn chỉnh trong phase này

> Ghi thẳng thắn những gì CHƯA làm được hoặc cần Person 2 / review thêm.

- [ ] **User cần tự tải `Sansation.ttf`** vào `assets/fonts/` (fontsquirrel.com) — hiện đang fallback Roboto cho headline
- [ ] Chưa chạy thử trên emulator/thiết bị thật (mới dừng ở tsc + export bundle)
- [ ] Các nhóm role `(crew)` / `(pm)` / `(sup)` chưa build — login các role đó sẽ redirect tới route chưa tồn tại (dự kiến ở phase sau)

---

## Lệnh để review nhanh (dành cho Antigravity / Reviewer)

```bash
# Chạy app trên emulator Android
npx expo start --android

# Kiểm tra TypeScript không lỗi
npx tsc --noEmit

# Kiểm tra bundle Android
npx expo export --platform android --output-dir .export-check
```

---

## Chữ ký bàn giao

- **Người thực hiện:** _Tùng_ — Ngày: 2026-09-17
- **Người review (nếu có):** ___________________________ Ngày: ___________
- **Status:** `[x] PENDING_REVIEW` → `[ ] APPROVED` → `[ ] MERGED`