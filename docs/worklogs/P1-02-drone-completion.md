# Completion Log — P1-02 DRONE (Phân khu `(drone)`)

> **Mẫu nghiệm thu chuẩn Antigravity Delivery** — Đã điền cho Phase Drone.
> **Đặt tên file:** `P{person}-{phase}-{tên-phase}-completion.md`

---

## Thông tin cơ bản

| Trường | Giá trị |
|---|---|
| **Phase** | P1-02 |
| **Tên phase** | Drone Role — nhóm `(drone)` 7 màn theo wireframe M-DRONE-01..07 |
| **Người thực hiện** | Tùng |
| **Ngày hoàn thành** | 2026-09-17 |
| **AI hỗ trợ** | OpenCode (Big Pickle) + Antigravity review |
| **Thời gian thực hiện** | ~2h (ước lượng) |

---

## Danh sách file đã tạo / sửa

```
# Layout nhóm (drone)
app/(drone)/_layout.tsx                  [MỚI - View flex:1 > Stack + BottomNav 4 tab]

# 7 màn M-DRONE
app/(drone)/home.tsx                     [MỚI - M-DRONE-01 Tổng quan nhiệm vụ]
app/(drone)/requests.tsx                 [MỚI - M-DRONE-02 Danh sách yêu cầu]
app/(drone)/request-detail.tsx           [MỚI - M-DRONE-03 Chi tiết yêu cầu + Modal từ chối]
app/(drone)/upload.tsx                   [MỚI - M-DRONE-04 Nạp dữ liệu SD]
app/(drone)/log.tsx                      [MỚI - M-DRONE-05 Nhật ký chuyến bay + SHA-256]
app/(drone)/sync.tsx                     [MỚI - M-DRONE-06 Hàng đợi đồng bộ]
app/(drone)/profile.tsx                  [MỚI - M-DRONE-07 Hồ sơ phi công + đăng xuất]

# Sửa ngoài nhóm
app/_layout.tsx                          [SỬA - ROLE_HOMES '/drone' -> '/drone/home'; đồng bộ /crew|pm|sup/home]
src/components/BottomNav.tsx             [SỬA - active matching dùng activePrefixes + longest-prefix-wins (fix review)]

# Cập nhật UI theo wireframe HTML + logo công ty (đợt 2)
assets/logo.png                          [MỚI - logo Cát Tường copy từ "Logo Company/Logo Company.png"]
src/components/AppHeader.tsx             [MỚI - Top App Bar: logo + CÁT TƯỜNG + chuông(dot đỏ)/avatar]
src/components/SafeAreaScreen.tsx        [SỬA - thêm prop optional `header` render full-bleed trên nội dung]
src/design-tokens.ts                     [SỬA - thêm colors.brandGold '#8C6D1F']
app/(auth)/index.tsx                     [SỬA - thêm logo 90dp + brand 'CÁT TƯỜNG' màu brandGold]
app/(drone)/home.tsx                     [SỬA - dựng lại theo screen-drone-home: AppHeader + greeting + KPI + telemetry + "Việc cần làm"]
app/(drone)/requests.tsx                 [SỬA - chèn AppHeader subtitle 'Khảo Sát']
app/(drone)/log.tsx                      [SỬA - chèn AppHeader subtitle 'Nhật ký']
app/(drone)/sync.tsx                     [SỬA - chèn AppHeader subtitle 'Đồng bộ']
```

---

## Kết quả kiểm chứng

### ✅ Kiểm chứng bằng chạy app thật (Metro / Expo Go)
- [ ] `npx expo start` — Không lỗi bundle (chưa chạy app thật, mới verify export)
- [x] Không có lỗi TypeScript khi build (`npx tsc --noEmit`) — 0 lỗi
- [ ] Chuyển màn hình không bị crash (chưa kiểm trên thiết bị)
- [x] Bundle Android export OK (`npx expo export --platform android`, Hermes 3.3MB, `assets/logo.png` 86KB có trong bundle, đã xóa temp .export-check)

### ✅ Kiểm chứng Business Rules quan trọng
- [x] Màn `requests` có 3 segment tab: Chờ nhận (3) / Đang bay (1) / Đã xong (12) — đúng số lượng wireframe
- [x] `request-detail` modal Từ chối: 3 lý do radio theo KRQ (thời tiết mưa gió giật / flycam hỏng / vùng cấm bay đột xuất)
- [x] `log` + `sync` dùng StatusBadge đúng SyncStatus: `LOCAL / QUEUED / UPLOADING / SERVER_CONFIRMED`
- [x] `sync` chỉ bật "Dọn dẹp bản sao an toàn" khi toàn bộ hàng đợi SERVER_CONFIRMED (SHA-256 đối soát)
- [x] `request-detail` nút "Bắt đầu chuyến bay" → `/drone/log`; `upload` nút "Bắt đầu nạp dữ liệu" → `/drone/log`
- [x] `profile` hiển thị đúng người đăng nhập từ `useAuthStore` (không hardcode tên wireframe), nút Đăng xuất gọi `logout()`

### ✅ Kiểm chứng Design (theo code)
- [x] Mỗi màn tối đa 1 nút vàng đồng `#C9A227` (request-detail/upload/log/sync = 1; home/requests/profile = 0, dashboard/đăng xuất secondary)
- [x] Không có shadow đậm, không có gradient
- [x] Không dùng FAB trong nhóm drone — wireframe `(drone)` không có màn dùng FAB nên không cần can thiệp vị trí
- [x] Font: Roboto nội dung, Sansation headline KPI (dùng `headlineLg`) — đang fallback vì chưa có font file
- [x] BottomNav active tab đúng màu gold, 4 tab tiếng Việt (Trang chủ/Yêu cầu/Đồng bộ/Hồ sơ)
- [x] BottomNav highlight đúng tab khi ở màn phụ: `request-detail`→Yêu cầu; `upload`/`log`→Đồng bộ (đã kiểm bằng script: 7/7 route map đúng, không route nào sáng 2 tab)
- [x] Top App Bar (`AppHeader`) đặt đúng 4 màn theo HTML: home/requests/log/sync; `request-detail`/`upload` giữ top bar nút Back; `profile` không có header
- [x] `home` khớp `screen-drone-home`: greeting "Chào, {full_name}" + badge "Sẵn sàng bay" + KPI "NHIỆM VỤ HÔM NAY / 3" + telemetry Gió/Pin + "Việc cần làm" 3 task (KS-741 / KS-104 / KS-VD3)
- [x] Màu brand "CÁT TƯỜNG" dùng token mới `colors.brandGold` (#8C6D1F), không raw hex inline
- [x] Icon mới (`notifications-outline`, `person`, `airplane-outline`, `cloud-outline`, `battery-charging-outline`, `warning-outline`, `git-branch-outline`, `layers-outline`, `chevron-forward`) đã grep glyphmap Ionicons thật — tất cả tồn tại

---

## Điểm phát hiện & xử lý trong phase này

| # | Vấn đề gặp phải | Cách giải quyết | File liên quan |
|---|---|---|---|
| 1 | `<Stack style={{flex:1}}>` không hợp lệ — expo-router Stack không nhận prop `style` | Bọc Stack trong `<View style={{flex:1}}>` (stackArea) | `app/(drone)/_layout.tsx` |
| 2 | `typography.headline` không tồn tại; key đúng là `headlineLg` | Đổi KPI + stats sang `headlineLg` | `app/(drone)/home.tsx` |
| 3 | Icon `usb-outline` và `sd-card-outline` không tồn tại trong bản Ionicons đã cài | Grep glyphmap thật → dùng `hardware-chip-outline` (đầu đọc thẻ) | `app/(drone)/upload.tsx` |
| 4 | Group `(drone)` không có `index.tsx` → route `/drone` sẽ unmatched; ROLE_HOMES vẫn trỏ `/drone` | Đổi ROLE_HOMES thành `/drone/home` (đồng thời `/crew|pm|sup/home` cho nhất quán) | `app/_layout.tsx` |
| 5 | Template component API chưa có màn Modal trong kho components | Dựng Modal bottom-sheet inline trong màn bằng RN core (Modal + Pressable) — không thêm package/component ngoài spec | `app/(drone)/request-detail.tsx` |
| 6 | Review P1.1: `BottomNav` dùng exact match `tab.route === activeRoute` → ở màn phụ `/drone/request-detail`, `/drone/upload`, `/drone/log` không tab nào được highlight | Thêm `activePrefixes?: string[]` vào `NavTab` + longest-prefix-wins (tab có prefix khớp dài nhất thắng, không khớp → không tab nào sáng). Cấu hình: Yêu cầu `['/drone/request']`, Đồng bộ `['/drone/sync','/drone/upload','/drone/log']`. Lưu ý: 3 công thức prefix trong review đều không khớp route thật (công thức 1 là no-op do `slice`; công thức 2–3 dùng `startsWith('/drone/requests')` nên trượt `request-detail`, và không phủ `upload`/`log`) | `src/components/BottomNav.tsx:14,22-33`, `app/(drone)/_layout.tsx:5-20` |
| 7 | Login (M00) chỉ có chữ "RoadGuard", chưa có logo; repo không có route Splash riêng (màn splash thực tế là state loading-font trong `app/_layout.tsx`) | Copy logo vào `assets/logo.png`, thêm `<Image>` 90dp ở `(auth)/index.tsx` + đổi brand sang "CÁT TƯỜNG"; giữ nguyên loading-font, KHÔNG thêm route Splash mới | `app/(auth)/index.tsx`, `assets/logo.png` |
| 8 | `AppHeader` cần full-bleed (viền dưới chạm mép màn) nhưng `SafeAreaScreen` bọc padding 16 quanh children | Thêm prop optional `header` để render ngoài vùng padding — backward-compatible, không ảnh hưởng màn cũ | `src/components/SafeAreaScreen.tsx` |
| 9 | HTML home có dòng phụ "Kỹ thuật viên Drone • Đội Khảo sát Số 2" nhưng mock `User` không có field đội | Dùng `role_code` (bỏ `_`) cho dòng phụ — không bịa dữ liệu; ghi lại ở mục TODO | `app/(drone)/home.tsx` |

---

## Điểm TODO / Chưa hoàn chỉnh trong phase này

> Ghi thẳng thắn những gì CHƯA làm được hoặc cần Person 2 / review thêm.

- [ ] Dữ liệu request/sync/log đang **hardcode trong màn** theo số liệu wireframe — chưa nối API/mock thật (tuân thủ 3 CẤM "không endpoint ngoài spec")
- [ ] Chưa chạy thử trên emulator/thiết bị thật (mới dừng ở tsc + export bundle)
- [ ] Sansation.ttf vẫn chưa được tải về
- [ ] Route `/crew/home`, `/pm/home`, `/sup/home` chưa tồn tại — login các role khác sẽ unmatched đến khi phase tương ứng xong
- [ ] Map ranh giới bay (KML) đang là placeholder `map-outline` — cần nối Mapbox/tile ở phase sau (ưu tiên theo lộ trình)
- [ ] Dòng phụ greeting ở `home` đang dùng `role_code` thay vì "Kỹ thuật viên Drone • Đội Khảo sát Số 2" (mock `User` thiếu field đội) — bổ sung khi có field
- [ ] Chuông thông báo & avatar trên `AppHeader` mới là visual-only (chưa có spec hành vi) — nối màn thông báo/hồ sơ ở phase sau

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