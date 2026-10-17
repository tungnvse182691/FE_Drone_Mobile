# Completion Log — P5-02 PER-OPERATION ERROR CONTRACTS (17_10)

> **Mẫu nghiệm thu chuẩn Antigravity Delivery** — Đã điền cho **Phần 1** (Canonical 17_10).
> **Đặt tên file:** `P{person}-{phase}-{tên-phase}-completion.md`

---

## Thông tin cơ bản

| Trường | Giá trị |
|---|---|
| **Phase** | P5-02 (Phần 1) |
| **Tên phase** | Error handling — ProblemDetails + Error Catalog theo hợp đồng BE `huy-review` |
| **Người thực hiện** | Nguyễn Văn Tùng |
| **Ngày hoàn thành** | 2026-10-17 |
| **AI hỗ trợ** | OpenCode (deepseek-v4.1-flash-free) + skill `roadguard` / `code-review` |
| **Thời gian thực hiện** | ~0h25 |
| **Commit** | `dc4507b` — `feat(api): per-operation error contracts from BE huy-review (17_10)` |
| **Nhánh / Remote** | `tung` → đã push `origin` |

---

## Danh sách file đã tạo / sửa

```
src/api/problemDetails.ts             [MỚI - parse application/problem+json -> {code,title,detail,traceId}]
src/api/errorCatalog.ts               [MỚI - messageFor(code) tiếng Việt + fallback trung tính]
src/constants/error-codes.ts          [XÓA - bỏ "bảng mã dùng chung" (17_10 KHÔNG có)]
src/api/client.ts                     [SỬA - surface lỗi qua problemDetails]
src/api/mock/errors.ts                [SỬA - throwMockApiError + MOCK_ERROR_STATUS]
src/api/mock/auth.ts                  [SỬA - mã lỗi theo operation]
src/api/mock/surveys.ts               [SỬA]
src/api/mock/tasks.ts                 [SỬA]
app/(crew)/complete.tsx               [SỬA - đọc code -> messageFor(code)]
app/(crew)/wo-detail.tsx              [SỬA - đọc code -> messageFor(code)]
```

---

## Kết quả kiểm chứng

### ✅ Compiler Gate
- [x] `npx tsc --noEmit` — **0 lỗi (exit 0)**

### ✅ Kiểm chứng Business Rules quan trọng
- [x] **Không còn bảng mã dùng chung:** `src/constants/error-codes.ts` đã xoá; UI đọc `code` từ response rồi map sang message
- [x] **BE `huy-review` trả `code` ở TOP-LEVEL** (JSON phẳng snake_case), mỗi operation khai báo riêng, **không nhất quán** → KHÔNG dùng bảng chung
- [x] `parseProblemDetails` đọc đúng `code` / `title` / `detail` / `traceId` top-level
- [x] `messageFor(code)` trả message tiếng Việt; **`code` lạ → fallback trung tính** (không hardcode, không render HTML lỗi từ server)
- [x] Mock trả đúng HTTP status theo `MOCK_ERROR_STATUS` (validation_error 400; not_found 404; auth 401/403; concurrency_conflict / idempotency_key_reused / invalid_state_transition 409; auth_concurrency_conflict 412; upload_validation_failed 422)

### ✅ Kiểm chứng Design / Kỷ luật
- [x] 100% `MaterialIcons` (0 `Ionicons`)
- [x] UD-06 Zero Cost — 0

---

## Điểm phát hiện & xử lý trong phase này

| # | Vấn đề gặp phải | Cách giải quyết | File liên quan |
|---|---|---|---|
| 1 | Tài liệu 17_10 **không có** bảng mã nghiệp vụ dùng chung, nhưng code cũ có `error-codes.ts` | Xoá file bảng mã chung, chuyển sang đọc `code` per-operation | `src/constants/error-codes.ts` |
| 2 | BE trả `code` không nhất quán giữa các operation, nằm top-level (không phải nested `problemDetails.code`) | Parser đọc thẳng top-level, không giả định schema chung | `src/api/problemDetails.ts` |
| 3 | Nguy cơ render message thô/HTML từ server | Luôn map qua `messageFor(code)`, `code` lạ → fallback tiếng Việt | `src/api/errorCatalog.ts` |

---

## Điểm TODO / Chưa hoàn chỉnh trong phase này

- [ ] Một số màn Phần 0/1 vẫn còn dùng message tĩnh, cần rà soát khi nối BE thật
- [ ] Chưa có test tự động cho `messageFor` (theo quy ước hiện tại: verify bằng typecheck)

---

## Lệnh để review nhanh (dành cho Reviewer)

```bash
npx tsc --noEmit
git show --stat dc4507b
# Xác nhận đã xoá bảng mã chung
git show dc4507b -- src/constants/error-codes.ts
```

---

## Chữ ký bàn giao

- **Người thực hiện:** _Nguyễn Văn Tùng_ — Ngày: 2026-10-17
- **Người review (nếu có):** ___________________________ Ngày: ___________
- **Status:** `[x] PENDING_REVIEW` → `[ ] APPROVED` → `[ ] MERGED`
