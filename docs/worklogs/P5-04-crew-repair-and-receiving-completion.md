# Completion Log — P5-04 CREW REPAIR BOOTSTRAP & RECEIVING

> **Mẫu nghiệm thu chuẩn Antigravity Delivery** — Đã điền cho **Phần 3** (Canonical 17_10).
> **Đặt tên file:** `P{person}-{phase}-{tên-phase}-completion.md`

---

## Thông tin cơ bản

| Trường | Giá trị |
|---|---|
| **Phase** | P5-04 (Phần 3) |
| **Tên phase** | Crew — Repair bootstrap C-04 + Attempt correction C-08 + Receiving ACK C-11 |
| **Người thực hiện** | Nguyễn Văn Tùng |
| **Ngày hoàn thành** | 2026-10-17 |
| **AI hỗ trợ** | OpenCode (deepseek-v4.1-flash-free) + skill `roadguard` / `code-review` |
| **Thời gian thực hiện** | ~0h25 |
| **Commit** | `d3db77d` — `feat(crew): repair bootstrap C-04 + attempt correction C-08 + receiving ACK C-11` |
| **Nhánh / Remote** | `tung` → đã push `origin` |

---

## Danh sách file đã tạo / sửa

```
# Hook bootstrap (transport + context sửa chữa)
src/hooks/useRepairBootstrap.ts       [MỚI - bootstrap, repairContext, 5 command wrapper, receiving 135/136/137]

# Màn Crew
app/(crew)/repair-correction.tsx      [MỚI - C-08 chỉnh sửa lần sửa (If-Match itemVersion)]
app/(crew)/receiving.tsx              [MỚI - C-11 xác nhận tiếp nhận (ACK)]
app/(crew)/wo-detail.tsx              [SỬA - điểm vào bootstrap + điều hướng]
app/(crew)/complete.tsx               [SỬA - dùng context/hook mới]
app/(crew)/home.tsx                   [SỬA - lối vào]
app/(crew)/_layout.tsx                [SỬA - đăng ký route]

# Mock / routes
src/api/mock/tasks.ts                 [SỬA - +620 dòng: work order, ETag, idempotency, fast-track]
src/constants/routes.ts               [SỬA - route const crew]
```

---

## Kết quả kiểm chứng

### ✅ Compiler Gate
- [x] `npx tsc --noEmit` — **0 lỗi (exit 0)**

### ✅ Kiểm chứng Business Rules quan trọng
- [x] **Concurrency đúng anchor:** `repairContext.itemVersion` = Base64 SQL `rowversion` của **RepairItem**; gửi `If-Match: "<itemVersion>"` (regex `^"[A-Za-z0-9+/]{11}="$`); riêng API-095 dùng version của task cha
- [x] `withFreshItemVersion<T>(taskId, command)` **đọc lại API-080 trước mỗi lệnh**, ném lỗi tổng hợp `repair_anchor_not_ready` (409) khi chưa có `repairContext`
- [x] **Không auto-retry** khi xung đột: `isRepairVersionConflict` = `concurrency_conflict` | `precondition_required`
- [x] 5 lệnh sửa chữa: 156/157/159/160/161 (kèm lệnh nhận tiếp 135/136/137) — không tự bịa operation
- [x] **Fast Track:** eligibility đọc qua API-146, **fail-closed** (thiếu `missingReasons` → KHÔNG cho sửa); ngưỡng nằm trên server, không hardcode
- [x] **BEFORE bắt buộc** trước Start Repair; không đổi AFTER thành BEFORE
- [x] `receivingIfMatch(v)` + `repairCommandErrorCode/Message` dùng chung convention lỗi (Phần 1)

### ✅ Kiểm chứng Design / Kỷ luật
- [x] 100% `MaterialIcons` (0 `Ionicons`)
- [x] UD-06 Zero Cost — 0 (đã quét cả `app/(crew)`)
- [x] Navigation đủ group prefix `/(crew)/...`

---

## Điểm phát hiện & xử lý trong phase này

| # | Vấn đề gặp phải | Cách giải quyết | File liên quan |
|---|---|---|---|
| 1 | Mỗi lệnh sửa cần `If-Match` mới nhất, dễ dùng version cũ | `withFreshItemVersion` đọc lại API-080 ngay trước từng lệnh | `src/hooks/useRepairBootstrap.ts` |
| 2 | Chưa có `repairContext` (chưa bootstrap) mà vẫn gọi lệnh | Ném lỗi tổng hợp `repair_anchor_not_ready` (409) để UI xử lý như xung đột | `src/hooks/useRepairBootstrap.ts` |
| 3 | `fakeRowVersion` không được export từ `mock/tasks.ts` | Không import chéo bừa; dùng đúng helper/ETag Map sẵn có | `src/api/mock/tasks.ts` |
| 4 | `guardIdempotency` của mock cũ ném `idempotency_key_reused` (không replay) | Với luồng cần replay, dùng cơ chế `withIdempotency` (từ Phần 2) | `src/api/mock/reporter.ts` |

---

## Điểm TODO / Chưa hoàn chỉnh trong phase này

- [ ] Chưa chạy E2E trên thiết bị (`NOT_VERIFIED_EXPO_E2E`)
- [ ] **Mock-only**: chưa nối BE thật
- [ ] Cần xác thực lại với BE `huy-review`: payload 409/412 của 156/157/159/160/161; shape `BusinessDutyView` / `BusinessRequestAckInput` của 135/136/137
- [ ] Điều kiện fast-track/ngưỡng kích thước cần đọc đúng policy revision từ server khi nối thật

---

## Lệnh để review nhanh (dành cho Reviewer)

```bash
npx tsc --noEmit
git show --stat d3db77d
# Rà anchor concurrency
npx tsc --noEmit && grep -n "withFreshItemVersion\|repair_anchor_not_ready\|isRepairVersionConflict" src/hooks/useRepairBootstrap.ts
```

---

## Chữ ký bàn giao

- **Người thực hiện:** _Nguyễn Văn Tùng_ — Ngày: 2026-10-17
- **Người review (nếu có):** ___________________________ Ngày: ___________
- **Status:** `[x] PENDING_REVIEW` → `[ ] APPROVED` → `[ ] MERGED`
