# Completion Log — P5-01 AUTH SESSION & WIRE-ROLE ADAPTER

> **Mẫu nghiệm thu chuẩn Antigravity Delivery** — Đã điền cho **Phần 0** (Canonical 17_10).
> **Đặt tên file:** `P{person}-{phase}-{tên-phase}-completion.md`

---

## Thông tin cơ bản

| Trường | Giá trị |
|---|---|
| **Phase** | P5-01 (Phần 0) |
| **Tên phase** | Nền tảng — Auth session state machine + Android auth transport + Wire-role adapter |
| **Người thực hiện** | Nguyễn Văn Tùng |
| **Ngày hoàn thành** | 2026-10-17 |
| **AI hỗ trợ** | OpenCode (deepseek-v4.1-flash-free) + skill `roadguard` / `code-review` |
| **Thời gian thực hiện** | ~0h35 |
| **Commit** | `ca92db2` — `feat(auth): session state machine, android auth transport, wire-role adapter` |
| **Nhánh / Remote** | `tung` → đã push `origin` (verify `git ls-remote origin tung`) |

---

## Danh sách file đã tạo / sửa

```
# Config / branding
app.json                              [SỬA - package com.hoanghai.roadguard, scheme roadguard]

# Auth
app/(auth)/otp-verify.tsx             [SỬA - luồng OTP + password theo 17_10]
src/store/auth.ts                     [SỬA - session state machine, must_change_password, token rotation]

# API client
src/api/client.ts                     [SỬA - refresh 401 nội bộ (REFRESHABLE_CODES), PASSWORD_CHANGE_REQUIRED_CODE]

# Adapter role wire -> local
src/types/roleAdapter.ts              [MỚI - map UserRoleCode.* (wire) -> RoleCode.* (local)]

# Deps
package.json / package-lock.json      [SỬA - thêm 1 dependency]
```

---

## Kết quả kiểm chứng

### ✅ Compiler Gate
- [x] `npx tsc --noEmit` — **0 lỗi (exit 0)**
- [ ] `npx expo start` trên emulator/thiết bị — chưa chạy (verify tĩnh)

### ✅ Kiểm chứng Business Rules quan trọng
- [x] **Wire-role adapter:** `UserRoleCode.DroneOperator` → `RoleCode.DRONE_OPERATOR`, `UserRoleCode.RepairCrew` → `RoleCode.REPAIR_CREW` (route group giữ nguyên theo `AGENTS.md`)
- [x] **401 refresh:** chỉ refresh với `auth_unauthorized` / `token_expired`, có rotation, **retry lại đúng request gốc** (không loop, không tạo request mới)
- [x] **AuthGuard:** `must_change_password === true` → buộc đổi MK trước khi vào role home
- [x] **Phân định nền tảng:** Mobile chỉ phục vụ 3 role hiện trường; PM/Supervisor → thông báo Web-only (không render màn nghiệp vụ)

### ✅ Kiểm chứng Design / Kỷ luật
- [x] 100% `MaterialIcons` (0 `Ionicons`)
- [x] UD-06 Zero Cost — 0 thông tin tiền tệ trong `app/`
- [x] Navigation dùng đầy đủ group prefix `/(crew)/...`, `/(drone)/...`, `/(reporter)/...`, `/(auth)/...`

---

## Điểm phát hiện & xử lý trong phase này

| # | Vấn đề gặp phải | Cách giải quyết | File liên quan |
|---|---|---|---|
| 1 | Wire dùng tên enum khác app (`DroneOperator` vs `DRONE_OPERATOR`) | Tạo lớp adapter map tường minh, KHÔNG đổi route group | `src/types/roleAdapter.ts` |
| 2 | 401 dễ gây vòng lặp refresh vô hạn | Chỉ refresh với 2 code hợp lệ, giới hạn 1 lần rồi surface lỗi lên UI | `src/api/client.ts` |
| 3 | Token rotation làm mất phiên nếu retry sai thứ tự | Retry lại đúng request gốc sau khi refresh xong | `src/api/client.ts` |

---

## Điểm TODO / Chưa hoàn chỉnh trong phase này

- [ ] Chưa chạy E2E trên emulator/thiết bị (`NOT_VERIFIED_EXPO_E2E`)
- [ ] Refresh/token rotation hiện **mock-only**, chưa nối BE thật
- [ ] `useAuthStore` persist chưa kiểm mã hoá at-rest (thuộc Phần 7 — SQLCipher, ngoài scope)

---

## Lệnh để review nhanh (dành cho Reviewer)

```bash
npx tsc --noEmit
git show --stat ca92db2
git log --oneline -5
```

---

## Chữ ký bàn giao

- **Người thực hiện:** _Nguyễn Văn Tùng_ — Ngày: 2026-10-17
- **Người review (nếu có):** ___________________________ Ngày: ___________
- **Status:** `[x] PENDING_REVIEW` → `[ ] APPROVED` → `[ ] MERGED`
