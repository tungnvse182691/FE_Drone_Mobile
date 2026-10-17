# Completion Log — P5-03 REPORTER PHOTO UPLOAD PIPELINE

> **Mẫu nghiệm thu chuẩn Antigravity Delivery** — Đã điền cho **Phần 2** (Canonical 17_10).
> **Đặt tên file:** `P{person}-{phase}-{tên-phase}-completion.md`

---

## Thông tin cơ bản

| Trường | Giá trị |
|---|---|
| **Phase** | P5-03 (Phần 2) |
| **Tên phase** | Reporter — Pipeline tải ảnh riêng tư (RPT-04 / RPT-05 / RPT-06 / RPT-10) |
| **Người thực hiện** | Nguyễn Văn Tùng |
| **Ngày hoàn thành** | 2026-10-17 |
| **AI hỗ trợ** | OpenCode (deepseek-v4.1-flash-free) + skill `roadguard` / `code-review` |
| **Thời gian thực hiện** | ~0h25 |
| **Commit** | `4eea2ed` — `feat(reporter): private photo upload pipeline (RPT-04/05/06/10)` |
| **Nhánh / Remote** | `tung` → đã push `origin` |

---

## Danh sách file đã tạo / sửa

```
# API contract upload (transport + WIRE DTO)
src/api/uploads.ts                    [MỚI - UploadSessionResponseDto, httpUploadTransport, hằng số pipeline]

# Mock store upload
src/store/uploads.ts                  [MỚI - mock upload session (USE_MOCK), replay idempotency]

# Màn Reporter
app/(reporter)/capture.tsx            [MỚI - RPT-04 chụp/chọn ảnh hiện trường]
app/(reporter)/uploads.tsx            [MỚI - RPT-05/06 danh sách + trạng thái tải lên]
app/(reporter)/report-supplement.tsx  [MỚI - bổ sung hồ sơ phản ánh]
app/(reporter)/account.tsx            [MỚI - RPT-10 tài khoản reporter]

# Mock / routes / layout
src/api/mock/reporter.ts              [SỬA - withIdempotency + idempotencyCache (replay đúng)]
src/api/mock/auth.ts                  [SỬA - tài khoản reporter]
src/constants/routes.ts               [SỬA - route const reporter]
app/(reporter)/_layout.tsx            [SỬA - đăng ký route]
app/(auth)/force-change-password.tsx  [SỬA]

# Deps
package.json / package-lock.json      [SỬA - thêm 1 dependency]
```

---

## Kết quả kiểm chứng

### ✅ Compiler Gate
- [x] `npx tsc --noEmit` — **0 lỗi (exit 0)**

### ✅ Kiểm chứng Business Rules quan trọng
- [x] **Chia phần theo hằng số spec:** `PART_SIZE_BYTES = 8 MiB`, `MAX_PHOTO_BYTES = 20 MB`, `SESSION_TTL_HOURS = 24`, `PRESIGNED_URL_TTL_MINUTES = 15`, `MAX_PART_URLS_PER_REQUEST = 100`
- [x] **SHA-256 checksum trước khi gửi**, dùng helper `isValidChecksumSha256`
- [x] Helper pipeline: `planUploadParts`, `parseFileStatus` / `isTerminalFileStatus`, `computePollBackoffMs`, `isSupportedPhotoMediaType` / `normalizePhotoMediaType`
- [x] Media type ảnh được chuẩn hoá, chặn loại không hỗ trợ
- [x] **Idempotency replay đúng:** mock `reporter.ts` trả lại kết quả cũ khi trùng khoá (không tạo phiên mới)
- [x] Trạng thái tải lên hiển thị riêng, **không tự nhận "Đã đồng bộ"** chỉ vì `navigator.onLine`

### ✅ Kiểm chứng Design / Kỷ luật
- [x] 100% `MaterialIcons` (0 `Ionicons`)
- [x] UD-06 Zero Cost — 0 thông tin tiền tệ
- [x] Navigation đủ group prefix `/(reporter)/...`

---

## Điểm phát hiện & xử lý trong phase này

| # | Vấn đề gặp phải | Cách giải quyết | File liên quan |
|---|---|---|---|
| 1 | Không được tạo bảng mã lỗi chung cho upload | Dùng `code` từ ProblemDetails + `messageFor` (từ Phần 1) | `src/api/uploads.ts` |
| 2 | Upload nhiều part dễ bắn nhiều Toast/retry ồn ào | Gộp trạng thái vào 1 danh sách phiên; backoff tính sẵn bằng helper | `app/(reporter)/uploads.tsx` |
| 3 | Retry có thể tạo phiên trùng | `withIdempotency` trong mock trả lại kết quả cũ theo khoá | `src/api/mock/reporter.ts` |
| 4 | Ảnh chụp phải là bằng chứng riêng tư | Chỉ upload qua phiên presigned, không lộ link công khai | `src/api/uploads.ts` |

---

## Điểm TODO / Chưa hoàn chỉnh trong phase này

- [ ] Chưa chạy E2E trên thiết bị (`NOT_VERIFIED_EXPO_E2E`); mocks import `expo-crypto`/`axios` nên không chạy headless
- [ ] **Mock-only**: endpoint HTTP thật mới ghi trong comment, chưa nối BE
- [ ] Các trường đầy đủ của `UploadSessionResponseDto` cần đối chiếu lại với BE (index spec bị cắt)
- [ ] Crypto at-rest / signed sync (Phần 7) chưa làm — ngoài scope

---

## Lệnh để review nhanh (dành cho Reviewer)

```bash
npx tsc --noEmit
git show --stat 4eea2ed
# Rà pipeline upload
npx tsc --noEmit && grep -n "PART_SIZE_BYTES\|MAX_PHOTO_BYTES\|SESSION_TTL_HOURS" src/api/uploads.ts
```

---

## Chữ ký bàn giao

- **Người thực hiện:** _Nguyễn Văn Tùng_ — Ngày: 2026-10-17
- **Người review (nếu có):** ___________________________ Ngày: ___________
- **Status:** `[x] PENDING_REVIEW` → `[ ] APPROVED` → `[ ] MERGED`
