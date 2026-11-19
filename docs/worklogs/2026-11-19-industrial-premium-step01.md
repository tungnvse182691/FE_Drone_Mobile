# Industrial Premium Step01 — Operator Home

Ngày19/11/2026. Codex IMPLEMENT_AND_SELF_REVIEW; không phải independent review.
Owner đã duyệt Premium Operations70% / Field Operations30%, scope riêng Home. Base main1c852e9, origin/main đã fetch trùng base; tracked tree sạch trước edit. Không đổi branch/push/restart, không BE/global token/shared source/config/dependency.

## Checkpoint1 — Đặc tả cục bộ

- Đọc AGENTS/DESIGN/tokens; worklog Crew18 checkpoint, Crew19 summary/phase2/deep và Operator19 Home + owner corrections; mobile-design/craft-floor/design-process, vercel GPU animation và Expo building-native-ui/animations.
- Baseline thật Android Pixel6Pro emulator-5554 Android14 Expo Go1440×3120, đang ở Operator Home. `.cache/industrial-premium-step01/home-before.png` đã xem trực tiếp.
- `docs/design/2026-11-19-roadguard-industrial-premium.md`: palette/contrast, typography, spacing, KPI, task, status, button, motion, accessibility và states. Đặc tả proposal, chỉ thí điểm Home, không cấp quyền triển khai màn khác.
- Contrast tính thực bằng Python luminance WCAG: white/navy14.09; secondary/navy9.28; gold/navy5.82; secondary/soft5.81; brown/cream6.48.
- Self-review tài liệu: không số liệu/KPI giả, không đổi business/guard. `git diff --check` PASS. Commit riêng tài liệu, source UI chờ gate checkpoint2.

## Checkpoint2 — Home pilot

- Checkpoint1 đã commit local b853a57. Chỉ production source app/(drone)/home.tsx: gom lời chào/KPI/ghi chú trong nền xanh than; card riêng Home có mã, tiêu đề, status và số phân đoạn thật trong footer. Không sửa shared source/global tokens.
- Motion: tái sử dụng scale/opacity AnimatedPressable, thêm ripple vàng nhạt Android cho card và Xem tất cả. Không loop/entrance, không trì hoãn handler; Reduce Motion theo component hiện có, đọc khi mount.
- Before: .cache/industrial-premium-step01/home-before.png; after: home-after-final.png; scroll: home-scroll.png; route: see-all-route.png trong cùng thư mục. Đã xem ảnh trực tiếp.
- ANDROID_E2E_VERIFIED giới hạn: Home hiển thị50/10/26 trước/sau; mở task25324063 rồi Back đúng Home; cuộn lên/xuống; Xem tất cả đến Khảo sát rồi tab Home. Không restart/reload/ghi dữ liệu BE.
- LOGIC_TESTED: targeted86/86 PASS: node --test --test-concurrency=2 tests/operator-home-premium.test.cjs tests/operator-ui05.test.cjs tests/drone-ui02a.test.cjs tests/drone-ui02b.test.cjs tests/operator-refresh-ui.test.cjs tests/operator-ui-integration.test.cjs. Log: .cache/industrial-premium-step01/targeted-final.log. Ba test cũ chỉ cập nhật nhận diện named local row, giữ assertion nghiệp vụ; test mới bảo vệ count/dedupe/first-five/order/exact route/initial loading/empty/error/retry/status/segments/callback.
- npx tsc --noEmit: exit0. AST so với base1c852e9: statement ngoài JSX trong DroneHomeScreen và hai expression onPress trùng; công thức/API/session/route không đổi. git diff --check và scan Home MaterialIcons/UD06/privacy: PASS.
- Full regression PASS1928/1928, exit0: $regressionFiles = @(Get-ChildItem tests -Filter *.test.cjs -File | ForEach-Object FullName); node --test --test-concurrency=2 @regressionFiles. Log .cache/industrial-premium-step01/regression-final.log. Lượt trước1927/1928 do predicate test02B còn trông đợi shared row; đã sửa nhận diện component và chạy lại toàn bộ.
- NOT_RUN native loading/empty/error injection, font lớn/tên dài fixture, đổi OS Reduce Motion trực tiếp, FPS và APK build. Harness states không thay Android evidence. Không tuyên bố60FPS. Self-review, không independent review.
- Owner yêu cầu căn giữa ba KPI là checkpoint tiếp theo, commit riêng. Dừng tại Operator Home.

## Checkpoint3 — Owner refinement: centered KPI

- Base1803310. Chỉ đổi3 style trong app/(drone)/home.tsx: hàng cố định3 cột flex1/minWidth0, alignItems center; nhãn textAlign center/stretch/minHeight36dp để dành2 dòng và cùng baseline ban đầu. Không numberOfLines/fixed height, nhãn được wrap tự nhiên. Giữ tabular-nums, icon/số/nhãn cách8dp, màu và dữ liệu50/10/26.
- Android emulator-5554 vẫn Expo Go, Fast Refresh không restart. After .cache/industrial-premium-step01/home-kpi-centered.png đã xem trực tiếp, before refinement home-after-final.png. Native bounds:3 label đều width368px, y998, height126px; số đều y844/height126; centers310/720/1130, icon centers tương ứng. Không clipping ở font hiện hành.
- Targeted cùng6 file checkpoint2:86/86 PASS; log targeted-kpi.log. npx tsc --noEmit PASS; git diff --check PASS. Full regression1928/1928 áp dụng checkpoint2; không chạy lại toàn bộ cho3 style KPI.
- NOT_RUN: font scale lớn/narrow device thực, OS Reduce Motion toggle/FPS; không thêm animation hoặc handler trong refinement. Tôn trọng scope Home, không API/navigation/business/global tokens.
