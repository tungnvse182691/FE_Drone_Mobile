# Completion Log — P1-03 CREW (Phân khu `(crew)`)

> **Mẫu nghiệm thu chuẩn Antigravity Delivery** — Đã điền cho Phase Crew.
> **Đặt tên file:** `P{person}-{phase}-{tên-phase}-completion.md`

---

## Thông tin cơ bản

| Trường | Giá trị |
|---|---|
| **Phase** | P1-03 |
| **Tên phase** | Crew Role — nhóm `(crew)` 11 file theo wireframe M-CREW-01..11 |
| **Người thực hiện** | Tùng |
| **Ngày hoàn thành** | 2026-09-17 |
| **AI hỗ trợ** | OpenCode (Big Pickle) + subagent review độc lập |
| **Thời gian thực hiện** | ~3h (ước lượng, chia 4 task implement + 3 lượt review) |

---

## Danh sách file đã tạo / sửa

```
# Layout nhóm (crew)
app/(crew)/_layout.tsx                   [MỚI - 45 dòng, View flex:1 > Stack + BottomNav 4 tab]

# 11 màn M-CREW
app/(crew)/home.tsx                      [MỚI - 180 dòng, M-CREW-01 Tổng quan + FAB camera]
app/(crew)/tasks.tsx                     [MỚI - 168 dòng, M-CREW-02 Danh sách công việc]
app/(crew)/wo-detail.tsx                 [MỚI - 556 dòng, M-CREW-03 Chi tiết Work Order]
app/(crew)/navigation.tsx                [MỚI - 404 dòng, M-CREW-04 Dẫn đường hiện trường]
app/(crew)/progress.tsx                  [MỚI - 412 dòng, M-CREW-07 Cập nhật tiến độ]
app/(crew)/viewfinder.tsx                [MỚI - 435 dòng, M-CREW-06 Camera Viewfinder AR]
app/(crew)/report-defect.tsx             [MỚI - 285 dòng, M-CREW-08 Báo cáo lỗi cho PM]
app/(crew)/complete.tsx                  [MỚI - 359 dòng, M-CREW-09 Hoàn thành & bàn giao]
app/(crew)/sync.tsx                      [MỚI - 433 dòng, M-CREW-10 Hàng đợi đồng bộ]
app/(crew)/profile.tsx                   [SỬA - 311 dòng, M-CREW-11 Hồ sơ + email động, switch tối, alert chi tiết, đổi mk]

# Sửa ngoài nhóm & Kiến trúc dùng chung
src/constants/routes.ts                  [MỚI - Khai báo tập trung ROLE_HOMES, tránh circular dependency với _layout.tsx]
app/index.tsx                            [MỚI - Route gốc '/' điều phối an toàn theo AuthGuard]
src/types/domain.ts                      [SỬA - Bổ sung field email: string vào User interface]
src/components/ViewFinder.tsx            [SỬA - Chuyển CameraView thành self-closing + overlay absoluteFill, triệt tiêu Console Warning]
src/api/mock/auth.ts                     [SỬA - must_change_password: true cho CẢ 4 tài khoản; bổ sung email cho 4 user;
                                          changePassword(token, old_password, new_password) validate
                                          mật khẩu cũ + persist mật khẩu mới + reset cờ]
app/(auth)/force-change-password.tsx     [SỬA - truyền user.token vào apiChangePassword, thêm logo Cát Tường 80dp và chữ brandGold, điều hướng tường minh ROLE_HOMES sau khi đổi mk]
app/(crew)/home.tsx                      [SỬA - 195 dòng, hiển thị động Chào + Đội 01 theo user đăng nhập, render 4 việc đang làm, nút 'Xem tất cả']
app/(crew)/tasks.tsx                     [SỬA - 238 dòng, thêm mảng CREW_COMPLETED_TASKS 5 việc đã nghiệm thu, count động, fix rỗng tab Hoàn thành]
AGENTS.md & skills/roadguard/SKILL.md    [SỬA - Ghi nhận Quy tắc bắt buộc Full Group Prefix cho Expo Router để tránh màn đen]
```

---

## Kết quả kiểm chứng

### ✅ Kiểm chứng bằng chạy thật
- [x] `npx tsc --noEmit` — **0 lỗi** (xác nhận toàn bộ dự án sạch typecheck)
- [x] Bundle Android export OK (`npx expo export --platform android`, Hermes **3.4MB**)
- [x] `npx expo start --android` + thao tác thật trên emulator — **ĐÃ KIỂM THỬ THỰC TẾ**:
  - Đăng nhập `crew@cattuong.vn` / `123456`
  - Nhảy vào màn đổi mật khẩu có logo Cát Tường chuẩn
  - Đổi mật khẩu thành công nhảy thẳng vào `/crew/home`, hết lỗi màn hình đen Unmatched Route
- [x] Chuyển màn hình không crash

### ✅ Kiểm chứng Routing & Reachability (grep, không phải phỏng đoán)
- [x] Đủ **11/11 file** tồn tại thật
- [x] Grep toàn bộ `router.push/replace` trong `(crew)`: 8 đích — `/`, `/crew/wo-detail`, `/crew/navigation`, `/crew/progress`, `/crew/viewfinder`, `/crew/report-defect`, `/crew/complete`, `/crew/sync` — **tất cả đều có file thật, 0 dead link**
- [x] BottomNav map đúng 10/10 route, không route nào không tab nào sáng, không route nào sáng 2 tab:
      home→Trang chủ; tasks/wo-detail/navigation/progress/report-defect/viewfinder/complete→Công việc; sync→Đồng bộ; profile→Hồ sơ
- [x] 0 màn mồ côi
- [x] Auth flow khép kín: `REPAIR_CREW` login → `must_change_password=true` → `/force-change-password` → đổi mật khẩu thành công → `login({...user, must_change_password:false})` → `AuthGuard` → `/crew/home`

### ✅ Kiểm chứng Business Rules
- [x] `changePassword` từ chối mật khẩu cũ sai (throw `{response:{status:400}}`) và chỉ reset cờ khi thành công
- [x] 4/4 tài khoản mock đều `must_change_password: true`
- [x] `profile` đăng xuất gọi `logout()` + điều hướng `/` (không hardcode)
- [x] `report-defect` giữ đúng nguyên tắc "gửi PM xác minh, KHÔNG gộp vào #WO-118"

### ✅ Kiểm chứng Design (theo code + grep)
- [x] Grep `variant="primary"`: mỗi màn tối đa **1** nút vàng đồng (complete/navigation/progress/report-defect/sync/viewfinder/wo-detail = 1; home/tasks/profile/_layout = 0)
- [x] **0 comment** trong cả 11 file (grep `^\s*//`, `/*`, `{/*` → 0)
- [x] `package.json` không bị sửa, không thêm dependency
- [x] Icon Ionicons đều đã grep tồn tại trong `glyphmaps/Ionicons.json` (review Task 3+4 kiểm 39 icon → pass)
- [x] Font: Roboto nội dung, Sansation headline — vẫn **fallback** vì `assets/fonts/Sansation.ttf` chưa có
- [x] BottomNav active tab vàng đồng, 4 tab tiếng Việt (Trang chủ/Công việc/Đồng bộ/Hồ sơ)
- [ ] `viewfinder` **có 2 điểm vàng** (shutter bên trong `ViewFinder` + CTA "Xác nhận & Lưu") → vi phạm nhẹ quy tắc "1 nút vàng/màn", xem mục TODO

---

## Điểm phát hiện & xử lý trong phase này

> Nối tiếp số thứ tự từ `P1-02-drone-completion.md` (đã dùng #1–#9).

| # | Vấn đề gặp phải | Cách giải quyết | File liên quan |
|---|---|---|---|
| 10 | `docs/planning/RoadGuard_Plan_Person_1.md` ghi phân khu crew là **placeholder** (để dành Phase 1.4), nhưng user yêu cầu implement đầy đủ ngay | **User instruction thắng plan** — implement đủ 11 file, ghi rõ sai lệch này tại đây và báo reviewer | `docs/planning/RoadGuard_Plan_Person_1.md` |
| 11 | Repo `D:\Do_AN_Drone` là git repo nhưng **0 commit**, mọi file untracked → **không dùng được `git diff`** để review như mọi phase trước | Review chuyển sang **file path + checklist**; lệnh review bên dưới đã bỏ `git diff`. Không tự tạo commit | toàn repo |
| 12 | Mock auth chỉ 1 tài khoản có `must_change_password: true`; `changePassword` không kiểm mật khẩu cũ (đổi mật khẩu bằng bất kỳ input nào) | Bật `true` cho **cả 4** tài khoản; đổi signature thành `changePassword(token, old_password, new_password)`, validate mật khẩu cũ, persist mật khẩu mới vào `MOCK_USERS`, reset cờ. **Chỉ 1 caller** (`force-change-password.tsx`) — đã cập nhật | `src/api/mock/auth.ts`, `app/(auth)/force-change-password.tsx:30` |
| 13 | `ViewFinder.tsx` (component dùng chung) không có prop để vẽ overlay AR (lưới ngắm, reticle, watermark, HUD, nút trái/phải, flash) | Thêm **7 prop optional** backward-compatible. Grep xác nhận **không màn nào khác import `ViewFinder`** (kể cả nhóm drone) nên không có rủi ro vỡ | `src/components/ViewFinder.tsx:9-36` |
| 14 | Task 2 – MINOR: quick tags ở `progress.tsx` là `<View>` display-only, trong khi wireframe là `<button>` chèn tag vào ghi chú | Đổi sang `<Pressable>` có `onPress` append tag vào `note` (setter dạng updater). `Pressable` đã có sẵn trong import | `app/(crew)/progress.tsx:136-144` |
| 15 | Task 1 – MINOR: `AppHeader subtitle="Công Việc"` sai casing so với HTML ("Công việc") | Sửa thành `"Công việc"` | `app/(crew)/tasks.tsx:63` |
| 16 | Task 2 – MINOR: badge "Cần chụp nghiệm thu" dùng `colors.surfaceAlt` thay amber tint `#FEF3E2` của HTML | **Chốt giữ `surfaceAlt`** — token discipline ưu tiên hơn tint fidelity. Ghi nhận là sai lệch có chủ ý, không sửa | `app/(crew)/progress.tsx:287` |
| 17 | Greeting `home` wireframe ghi "Chào, Tuấn Anh" nhưng profile cùng wireframe ghi "Nguyễn Văn Tuấn" — wireframe **tự mâu thuẫn** | Giữ `"Chào, Nguyễn Văn Tuấn"` (khớp user + profile), ghi nhận | `app/(crew)/home.tsx` |
| 18 | Mock HTML lệch Spec: HTML profile hiện `18 công việc / 03 năm / 98%`, Spec (`Wireframe_Specification.md:344`) ghi `36 công việc / 4.9/5.0` | **Theo Spec** (36 + 4.9/5.0 ⭐) vì Spec là nguồn chân lý cho số liệu nghiệp vụ | `app/(crew)/profile.tsx` |
| 19 | `InputField` không hỗ trợ `multiline`; màn progress cần ô ghi chú nhiều dòng | Dùng RN core `TextInput` multiline — không sửa `InputField` để tránh ảnh hưởng màn khác | `app/(crew)/progress.tsx:127-135` |
| 20 | HTML crew dùng shutter **trắng**, `ViewFinder` default shutter **vàng**; đồng thời watermark HTML ở dạng DMS còn brief yêu cầu `10.9634, 107.0125` | Giữ shutter vàng (brief chỉ yêu cầu "nút chụp + nút lưu"); watermark theo **brief** (brief ưu tiên hơn HTML). Ghi nhận sai lệch | `app/(crew)/viewfinder.tsx` |
| 21 | Màu ngữ nghĩa nhạt (rose tint của nút Đăng xuất, amber của badge) **không có token** | Dùng hex cục bộ — **có precedent sẵn trong `src/components/Chip.tsx:19-21`** (`#FDECEC`, `#FEF3E2`, `#E9F7EC`). Riêng badge progress chọn `surfaceAlt` (xem #16) | `app/(crew)/profile.tsx`, `src/components/Chip.tsx` |
| 22 | Badge đỏ/vàng trên tab điều hướng (đếm việc đang chờ) không thêm được | `BottomNav` không hỗ trợ badge → chuyển thành TODO, không sửa component ngoài phạm vi phase | `app/(crew)/_layout.tsx` |
| 23 | Lỗi màn hình đen `Unmatched Route` sau khi đổi mật khẩu & bấm BottomNav | **Nguyên nhân gốc rễ:** Expo Router yêu cầu full group prefix khi gọi `router.push`/`replace` (`/(crew)/tasks`, `/(drone)/home`, `/(auth)/...`); đồng thời `index.tsx` import circular `ROLE_HOMES` từ `_layout.tsx`. **Giải pháp:** Tách `src/constants/routes.ts`, refactor 11 file sang full group prefix, bổ sung quy tắc cấm kỵ vào `AGENTS.md` & `SKILL.md` | `_layout.tsx`, `index.tsx`, `src/constants/routes.ts`, toàn bộ `app/(crew)/` & `app/(drone)/` |
| 24 | Tab 'Hoàn thành' trong `tasks.tsx` rỗng dù có nhãn (12); màn Home chỉ có 1 việc và hardcode tên KTV; Profile các nút chưa dùng được | Bổ sung `CREW_COMPLETED_TASKS` 5 việc nghiệm thu có ngày tháng; dynamic tên KTV Đội 01; mở rộng 4 việc đang làm trên Home + nút 'Xem tất cả'; bổ sung email vào `User` interface + 4 mock user; kích hoạt Đổi mk (`/(auth)/force-change-password`), Thông tin cá nhân (Alert), Trợ giúp (Alert), Dark mode (Toast) | `tasks.tsx`, `home.tsx`, `profile.tsx`, `src/types/domain.ts`, `src/api/mock/auth.ts` |
| 25 | Console Warning: `<CameraView> does not support children` từ `expo-camera` mới | Sửa `<CameraView />` thành self-closing, chuyển overlay giao diện ra làm sibling và phủ lên trên bằng `[StyleSheet.absoluteFill, styles.overlay]`. Triệt tiêu hoàn toàn warning | `src/components/ViewFinder.tsx` |
| 26 | Ảnh chụp màn hình máy ảo Android Emulator không tìm thấy trên Windows | Máy tính đang đồng bộ OneDrive nên Desktop bị đẩy vào `C:\Users\ACER\OneDrive\Tài liệu\Máy tính\`. Đã tạo thư mục `D:\Screenshots\` và copy toàn bộ ảnh sang đó, đồng thời hướng dẫn chỉnh emulator lưu cố định ổ D | `D:\Screenshots\` |

---

## Điểm TODO / Chưa hoàn chỉnh trong phase này

- [x] **Đã chạy trên emulator Pixel 6 Pro thực tế** — test trơn tru toàn bộ luồng Auth, Đổi mật khẩu, Trang chủ, Công việc, Kính ngắm AR, Hồ sơ
- [x] **FAB hoạt động chuẩn xác** ở vị trí bottom:96/right:16 trên thiết bị
- [x] **Dữ liệu danh sách công việc & hoàn thành** đã được bổ sung đầy đủ mock data cho cả 2 tab Đang làm (4) và Hoàn thành (5)
- [ ] `viewfinder` có 2 điểm vàng trên cùng màn (shutter + CTA) — cần quyết định ở review design
- [ ] CTA của `report-defect` và `sync` mới chỉ `Toast` + điều hướng — **CHƯA ghi vào offline outbox** (SQLite); đây là task riêng, nằm trong phase offline-sync
- [ ] `ViewFinder` chế độ Video mới là mô phỏng UI, chưa quay video thật
- [ ] Bản đồ ở `navigation.tsx` vẫn là **placeholder `View`** (giống nhóm drone) — chưa nối Mapbox/tile
- [ ] Nút "Mở Google Maps" dùng URL `maps/dir/?api=1&destination=10.9634,107.0125` + `.catch()` (fallback khi không có app Maps) — cần test thật
- [ ] Badge đếm việc đang chờ trên tab (xem #22) — cần mở rộng `BottomNav` ở phase sau
- [ ] `Sansation.ttf` vẫn chưa có → headline đang fallback font hệ thống
- [ ] Casing/tên đội: mock `User` không có field `team`/`role_name` nên một số dòng phụ dùng `role_code` (giống #9 của phase drone)

---

## Lệnh để review nhanh (dành cho Antigravity / Reviewer)

```bash
# Chạy app trên emulator Android
npx expo start --android

# Kiểm tra TypeScript không lỗi
npx tsc --noEmit

# Kiểm tra bundle Android
npx expo export --platform android --output-dir .export-check

# LƯU Ý: repo chưa có commit nào (0 commit, mọi file untracked) nên KHÔNG dùng được:
#   git diff --stat HEAD~1 HEAD
# Thay vào đó soi trực tiếp 11 file:
#   app/(crew)/_layout.tsx home.tsx tasks.tsx wo-detail.tsx navigation.tsx
#   progress.tsx viewfinder.tsx report-defect.tsx complete.tsx sync.tsx profile.tsx
```

---

## Chữ ký bàn giao

- **Người thực hiện:** _Tùng_ — Ngày: 2026-09-17
- **Người review:** _Antigravity AI (Kiến trúc & Quy trình)_ — Ngày: 2026-09-17
- **Status:** `[ ] PENDING_REVIEW` → `[x] APPROVED` → `[ ] MERGED`
