# Completion Log — P5-05 OPERATOR DECLINE, WORK PACKAGE & LOG RECOVERY

> **Mẫu nghiệm thu chuẩn Antigravity Delivery** — Đã điền cho **Phần 4** (Canonical 17_10).
> **Đặt tên file:** `P{person}-{phase}-{tên-phase}-completion.md`

---

## Thông tin cơ bản

| Trường | Giá trị |
|---|---|
| **Phase** | P5-05 (Phần 4) |
| **Tên phase** | Operator — O-04 từ chối nhiệm vụ + O-05 gói công việc (chỉ đọc) + O-08 sổ lệnh & phục hồi |
| **Người thực hiện** | Nguyễn Văn Tùng |
| **Ngày hoàn thành** | 2026-10-17 |
| **AI hỗ trợ** | OpenCode (deepseek-v4.1-flash-free) + skill `roadguard` / `code-review` |
| **Thời gian thực hiện** | ~0h40 |
| **Commit** | `963194b` — `feat(drone): operator decline O-04 + work package O-05 + command ledger recovery O-08` |
| **Nhánh / Remote** | `tung` → đã push `origin` (verify `git ls-remote origin tung` = `963194b`) |

---

## Danh sách file đã tạo / sửa

```
# Màn Operator
app/(drone)/request-decline.tsx       [MỚI - O-04: API-226 (đọc lại) + API-230 (decline, K + If-Match)]
app/(drone)/work-package.tsx          [MỚI - O-05: API-225 + API-104, CHỈ ĐỌC, không control ghi]
app/(drone)/log.tsx                   [SỬA - O-08: sổ lệnh đã gửi + phục hồi (replay / reconcile / API-234)]
app/(drone)/request-detail.tsx        [SỬA - tách logic từ chối sang O-04, thêm nút mở gói công việc]

# Mock / routes / layout
src/api/mock/surveys.ts               [SỬA - +783 dòng: contract API-104/225/226/230/234 + sổ lệnh + replay/reconcile]
src/constants/routes.ts               [SỬA - thêm DRONE_* route const]
app/(drone)/_layout.tsx               [SỬA - đăng ký request-decline + work-package]
```

---

## Kết quả kiểm chứng

### ✅ Compiler Gate
- [x] `npx tsc --noEmit` — **0 lỗi (exit 0)**

### ✅ Kiểm chứng Business Rules quan trọng
- [x] **O-04:** đọc lại **API-226 NGAY trước khi gửi** để lấy `If-Match` mới nhất; gửi **API-230** kèm `Idempotency-Key` (ref-stable, không tạo mới khi retry) + `If-Match`
- [x] **O-04 xung đột:** 409/412 → đọc lại + hỏi người dùng, **KHÔNG tự thử lại**; 401 → `/(auth)`; 403 → chặn + dừng
- [x] **O-04 không vượt quyền:** không gọi điều phối lại / bổ sung (thuộc PM trên Web) — gate quét `app/(drone)/` cho `api-231`, `api-232`, `reassign` = **0**
- [x] **O-05 chỉ đọc:** nạp API-225 rồi API-104; chỉ có **1 control duy nhất là nút back**, 0 nút ghi; hiển thị đúng geometry/segment scope ghim + mục đích tải lên
- [x] **O-08 phục hồi:** kết cục chưa rõ → **phát lại ĐÚNG khoá idempotency + payload gốc** (hàm replay chỉ nhận `commandId`; mock dùng lại `replayedKey = record.idempotencyKey` — không tạo lệnh mới)
- [x] **O-08 phân biệt trạng thái:** `Saved ≠ Sent ≠ Verified ≠ Done` — đối chiếu tải lên qua API-234, không tự nhận VERIFIED; 409/412 → đọc lại + đối chiếu; 403 → dừng
- [x] **Lỗi:** dùng `parseProblemDetails` + `messageFor(code)`, 0 bảng mã hardcode

### ✅ Kiểm chứng Kỷ luật (8 Invariants)
| # | Bộ lọc | Kết quả |
|---|---|---|
| I-01 | MaterialIcons only (0 Ionicons) | ✅ PASS |
| I-02 | UD-06 Zero Cost | ✅ PASS |
| I-03 | Fabric-Safe Navigation (0 `<Redirect>` trong RootLayout) | ✅ PASS |
| I-04 | Platform Scope 3 role | ✅ PASS (2 hit ở `account.tsx` = bảng nhãn role Web-only, có sẵn từ Phần 2) |
| I-05 | 5 mã khuyết tật chuẩn | ✅ PASS |
| I-06 | Branding & Tech (0 LiDAR/asphalt) | ✅ PASS |
| I-07 | Data Contract | ✅ PASS (1 hit `key={index}` ở `otp-verify.tsx:131` = 6 slot OTP cố định, có sẵn từ Phần 0) |
| I-08 | Error Handling convention | ✅ PASS |

---

## Điểm phát hiện & xử lý trong phase này

| # | Vấn đề gặp phải | Cách giải quyết | File liên quan |
|---|---|---|---|
| 1 | `request-detail.tsx` gọi decline inline, khó kiểm soát `If-Match` | Tách hẳn sang màn O-04; `request-detail` chỉ còn điều hướng | `app/(drone)/request-detail.tsx` |
| 2 | Phát lại lệnh dễ tạo khoá mới → gửi trùng | Replay chỉ truyền `commandId`; mock dùng lại khoá + payload đã lưu | `app/(drone)/log.tsx`, `src/api/mock/surveys.ts` |
| 3 | `useIdempotencyKey` của Crew nằm trong hook file khác, không được tạo file hook mới | Định nghĩa inline `useRef` + `uuidv4` ngay trong màn O-04 (ref-stable) | `app/(drone)/request-decline.tsx` |
| 4 | Gate kỷ luật bắt gặp từ khoá API-231/232 trong **comment** | Viết lại comment không chứa token (dùng diễn giải tiếng Việt) | `app/(drone)/request-decline.tsx`, `app/(drone)/request-detail.tsx` |
| 5 | `log.tsx` cần Toast trong layout cuộn của `SafeAreaScreen` | Bọc `View style={{flex:1}}` ngoài `SafeAreaScreen` + render `Toast` | `app/(drone)/log.tsx` |

---

## Điểm TODO / Chưa hoàn chỉnh trong phase này

- [ ] Chưa chạy E2E trên thiết bị (`NOT_VERIFIED_EXPO_E2E`)
- [ ] **Mock-only**: screens gọi hàm mock trực tiếp; endpoint HTTP thật mới ghi trong comment
- [ ] Cần xác thực với BE `huy-review`: payload 409/412 của API-230; trường đầy đủ `SurveyTaskPageV2ResponseDto` (relay `If-Match`); `UploadSessionResponseDto` (API-234) và `RoadGeometryVersionView` / `SegmentSetView` / `WidthProfileItem` (index spec bị cắt)
- [ ] O-02 `requests.tsx` vẫn là danh sách tĩnh (chưa nối API-038/226) — nằm ngoài scope Phần 4

---

## Lệnh để review nhanh (dành cho Reviewer)

```bash
npx tsc --noEmit
git show --stat 963194b
# Gate scope: không được có điều phối lại / bổ sung trong app/(drone)
Get-ChildItem "app/(drone)" -File | Select-String -Pattern "api-231|api-232|reassign"
# O-05 phải read-only (chỉ nút back)
Select-String -Path "app/(drone)/work-package.tsx" -Pattern "<Button|<Pressable"
```

---

## Chữ ký bàn giao

- **Người thực hiện:** _Nguyễn Văn Tùng_ — Ngày: 2026-10-17
- **Người review (nếu có):** ___________________________ Ngày: ___________
- **Status:** `[x] PENDING_REVIEW` → `[ ] APPROVED` → `[ ] MERGED`
