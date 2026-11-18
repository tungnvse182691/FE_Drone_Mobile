# Crew UI/UX Phase 2 — 19/11/2026

Mode: **IMPLEMENT_AND_SELF_REVIEW**, Codex; không phải independent review.
Scope: bảy route còn lại, presentation/motion only. Android Pixel_6_Pro (emulator-5554, Android 14, 1440×3120), Expo Go, Metro 8081 đang chạy. Giữ main; không push, reset, restart app/emulator, seed hay thay dữ liệu pending.

## Checkpoint inventory

| Màn | Baseline HEAD | Trạng thái | Commit local |
|---|---|---|---|
| Bản đồ nhiệm vụ | 0a89e94 | Gates PASS, native empty/read/back/pressed | f85ebc2 |
| Theo dõi thi công | f85ebc2 | Gates PASS; native read/disclosure/Back | 4241fe8 |
| Hồ sơ hoàn tất thi công | 4241fe8 | Gates PASS; native read/disclosure/Back | feda325 |
| Chỉnh sửa / bổ sung | feda325 | Gates PASS; native empty/history/pressed/Back | Commit checkpoint 4 |
| Dẫn đường | Chưa bắt đầu | Pending | — |
| Chụp ảnh | Chưa bắt đầu | Pending | — |
| Hồ sơ hiện trường | Chưa bắt đầu | Pending | — |

## Nguồn và quyết định thiết kế

Đã đọc nguyên văn task attachment, AGENTS, roadguard/code-review, DESIGN/tokens, mobile-design (Refine + craft floor/motion), vercel-react-native-skills, SOURCES, Expo building-native-ui + animations, ba worklog trước và hợp đồng Crew/governance. Đối chiếu Git/source và ảnh Android đã duyệt, gồm `.cache/crew-panels-refine-20261118/sync-actions-after.png`.

Áp dụng thông tin thành cụm, typography Roboto 12/14/16, nhấn vàng tiết chế, action phụ kem `#FBF8EE` / pressed `#F3ECD6`, MaterialIcons, vùng chạm 48dp. Không gradient/tím/KPI giả/card lồng nhau. Không đổi shared component. Motion dùng CrewMotion hiện hữu; handler không chờ animation.

Tham khảo online: [Reanimated accessibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/) xác nhận `ReduceMotion.System`; [Material 3 progress](https://m3.material.io/components/progress-indicators/overview) trả trang yêu cầu JavaScript, không coi nội dung trang đó là evidence đã đọc.

## 1. Bản đồ nhiệm vụ

### Baseline và phạm vi

Route `app/(crew)/task-map.tsx` chỉ bọc `CrewTaskMap`; search caller xác nhận `src/components/crew/CrewTaskMap.tsx` chỉ phục vụ route này. Chỉ sửa component riêng đó, không sửa route wrapper/map renderer/injection/network.

Trước edit: main `0a89e945402d00e2f0195fa45d3eae68ec1eacae`; fetch origin/main thành công, ahead/behind 0/0, tracked/staged diff trống. Giữ mọi untracked hiện hữu.

Bằng chứng baseline: `.cache/crew-phase2-ui-20261119/task-map-before.png`, đọc qua nhiệm vụ FIELD sandbox đang có (ID prefix 60a04265), **thiếu vị trí thật**. Bốn vấn đề: thông báo empty nằm rời giữa nền trắng; nguồn vị trí/hình học ở footer không có nhãn nhóm; refresh icon thiếu nền/label; loading/error thiếu phân cấp.

### UI/motion

- Header có title + mô tả ngắn, giữ Back; refresh có label, nền kem, viền và disabled opacity.
- Loading/error/empty dùng một cụm thông báo có tiêu đề, nội dung và hướng xử lý; không giả lập trạng thái.
- Footer nhóm nguồn vị trí với icon/nhãn/nội dung hiện hữu; selector đoạn tăng cỡ chữ từ 11 lên 14, giữ touch 48dp.
- Back/refresh/selector dùng CrewPressable hiện hữu: scale xuống 0.96, hồi 180ms + Android ripple, Reduce Motion. Không scale canvas/map, không entrance loop.

### Business invariants / review

Giữ nguyên tất cả non-JSX statements, identity/session/sequence guards, read(), effect, source/coordinates/center, map key/props/markers, JSX conditions, route/params, onPress, busy/disabled/accessibilityState. AST bổ trợ so baseline PASS; manual changed-file diff đã đọc. Không đổi API/SQLite/offline/eligibility/GPS.

### Evidence / gates

- `npx tsc --noEmit`: exit 0; `.cache/crew-phase2-ui-20261119/task-map-typecheck.log`.
- `node --test tests/c10bc-ui.test.cjs tests/crew-map-geometry.test.cjs tests/crew-nav01.test.cjs`: 53/53 PASS, 0 fail; `task-map-targeted.log` (**LOGIC_TESTED**, gồm target/segment geometry, stale session/unmount, 403 và route mapping).
- AST helper `.cache/crew-phase2-ui-20261119/verify-presentation.cjs`: PASS unchanged non-JSX statements/action props, baseline 0a89e94. Không thay thế manual JSX-condition review.
- Full regression: `node --test --test-concurrency=2` với toàn bộ 156 file `tests/*.test.cjs`: **1842/1842 PASS, 0 fail, 0 skipped**, 232089.9958ms, exit 0; `task-map-regression.log`.
- `git diff --check`: exit 0 (chỉ warning line-ending CRLF).
- Scoped source scan: không Ionicons, chi phí/UD-06, URL hay secret/password/token literal mới; MaterialIcons hiện hữu. Tracked diff chỉ component map + worklog này.
- Android native: mở từ Chi tiết → Xem vị trí/lịch sử → Mở bản đồ; xem empty; nhấn/giữ và thả Tải lại (read); Back trở về chi tiết. Fast Refresh nhận UI, không restart/reset.
- Ảnh cùng fixture/trạng thái settled: `task-map-before.png`, `task-map-after.png`; pressed: `task-map-pressed.png`, trong `.cache/crew-phase2-ui-20261119/` (không commit ảnh).
- **NATIVE_VERIFIED giới hạn read/navigation/pressed/empty**, không claim trọn luồng E2E hay 60FPS.
- **NOT_VERIFIED**: populated map/pan/zoom/segment trên Android do fixture thiếu tọa độ; error/offline/loading chậm trên native; OS Reduce Motion bật/tắt, font lớn và thiết bị thật. Có unit coverage không biến các case đó thành native PASS. Không seed hay đổi fixture.

### Phụ thuộc màn tiếp theo

Progress/Complete gọi NormalRepairPanel, thực chất re-export NormalRepairBootstrap từ WO Detail (shared nhiều màn). Chưa sửa panel này; chỉ phần summary/screen-private được phép làm. Thay panel chung cần phân tích + owner duyệt.

## 2. Theo dõi thi công

Baseline main `f85ebc2`, ahead/behind 1/0, không tracked/staged WIP. File duy nhất ngoài worklog: `app/(crew)/progress.tsx`.

Ảnh `progress-before.png` trên fixture hiện hữu `ebcdca88` (QA-CREW-SAFETY-01, Submitted), cùng vị trí đầu màn với `progress-after.png`. Vấn đề: ID lẫn body; status nhỏ và không có nhãn; tuyến đường không có điểm neo thị giác; phần tóm tắt thiếu tầng phân cách với mốc thi công.

UI: đưa ID vào nền trung tính, title đầy đủ, hàng vị trí có icon, divider và cụm “Trạng thái nhiệm vụ” dùng CrewTaskStatus sẵn có. Không card lồng nhau. Summary dùng CrewContentTransition 280ms, Reduce Motion, không replayOnFocus, không bọc panel có input/CTA. Không thêm nút hay thay handler. Shared NormalRepairPanel/WO Detail giữ nguyên; timeline/checklist/CTA sâu chưa redesign vì ngoài allowlist shared.

Giữ nguyên task title/ID/route/status expressions, điều kiện NORMAL/CONDITIONAL_FT, stage="progress", CrewTaskBoundary operational=false, Back. AST helper: lần đầu báo khác vì prop presentation `ready` mới; helper cache được giới hạn bỏ qua ready của riêng CrewContentTransition, mọi action prop/non-JSX statements còn lại PASS. Manual diff xác nhận conditions/panel props unchanged.

- TypeScript `npx tsc --noEmit`: exit 0, `progress-typecheck.log`.
- `node --test tests/crew-flow-recovery.test.cjs tests/crew-nav01.test.cjs`: 84/84 PASS, 0 fail/skip; `progress-targeted.log` (LOGIC_TESTED).
- Full regression toàn bộ 156 file tests: `node --test --test-concurrency=2` **1842/1842 PASS**, 0 fail/skip, 246918.8115ms, exit 0; `progress-regression.log`.
- `git diff --check` exit 0; scan scoped không Ionicons/UD-06/secret hay URL literal mới. Manual review giữ nguyên guard/route/params/disabled/action callbacks.
- Native read-only: mở Progress từ Chi tiết; mở/thu gọn các bước, cuộn xuống cảnh báo, Back về đúng Chi tiết, mở lại Progress và Back. `progress-expanded.png` chứng minh các mốc có sẵn. Không restart/reset/seed/mutation.
- NATIVE_VERIFIED giới hạn layout/read/scroll/disclosure/Back/reentry. Entrance có trong code, ảnh settled không chứng minh duration/FPS; cảm giác chuyển động liên tục và Reduce Motion thực tế NOT_VERIFIED. Không claim E2E.
- NOT_VERIFIED: thi công/gửi/receipt, offline/error/loading chậm native, font scale lớn, positive started/finished context, thiết bị thật.

Mọi ảnh/log ở `.cache/crew-phase2-ui-20261119/`, không commit artifacts.

## 3. Hồ sơ hoàn tất thi công

Baseline main `4241fe8`, ahead/behind 2/0; chỉ own WIP của màn này. File source: `app/(crew)/complete.tsx`.

Baseline `complete-before.png`: ID lẫn metadata, title bị giới hạn hai dòng, trạng thái thiếu nhãn và phân cách. Chỉnh summary: ID nền trung tính, title đầy đủ, vị trí có icon khi dữ liệu hiện hữu, divider + nhãn trạng thái; CrewContentTransition ready chỉ bọc summary (280ms, Reduce Motion, không replayOnFocus). Không bọc form/checklist trong transition.

Giữ nguyên expressions task/title/ID/tuyến/status, điều kiện NORMAL/CONDITIONAL_FT, stage="closeout", CrewTaskBoundary operational=false và Back. NormalRepairPanel là shared re-export từ WO Detail nên không sửa checklist/ảnh/CTA bên trong. Màn chỉ hoàn tất phần screen-private; redesign sâu panel chung còn cần owner duyệt scope. Trạng thái “Đã gửi hồ sơ” của nhiệm vụ không được diễn giải thành thi công xong/PM chấp thuận; panel vẫn hiển thị “Chưa kết thúc thi công” và số đo/ảnh bằng 0 đúng nguồn hiện tại.

- `npx tsc --noEmit`: exit 0, `complete-typecheck.log`.
- `node --test tests/crew-flow-recovery.test.cjs tests/crew-nav01.test.cjs`: 84/84 PASS, 0 fail/skip, 19918.2917ms; `complete-targeted.log` (LOGIC_TESTED).
- Full regression 156 file: `node --test --test-concurrency=2`: 1842/1842 PASS, 0 fail/skip, 240403.4246ms, exit 0; `complete-regression.log`.
- AST helper baseline 4241fe8 PASS unchanged non-JSX statements/action props. Manual diff review xác nhận JSX conditions và panel props không đổi; `git diff --check` exit 0; scoped added-line scan không Ionicons/UD-06/secret/URL mới.
- Native fixture ebcdca88: đọc đầu màn, mở/thu gọn chi tiết bản lưu, cuộn phần ảnh/cảnh báo, Back về Chi tiết và mở lại Hoàn tất thành công. Không reset/restart/mutation.
- `complete-before.png` / `complete-after.png`: cùng đầu màn, cùng fixture settled; `complete-expanded.png` là ảnh cuộn riêng sau mở disclosure, không dùng so trực tiếp baseline. NATIVE_VERIFIED giới hạn layout/read/scroll/disclosure/Back/reentry.
- NOT_VERIFIED: mutation hoàn tất/gửi/upload/receipt, hồ sơ có ảnh/số đo, offline/error/loading chậm native, font scale lớn, OS Reduce Motion thực, motion timing/FPS và thiết bị thật. Không claim Android E2E.

Ảnh/log giữ trong `.cache/crew-phase2-ui-20261119/`, không stage.

## 4. Chỉnh sửa / bổ sung hồ sơ

Baseline main feda325; chỉ sửa app/(crew)/repair-correction.tsx và worklog. Baseline correction-before.png: trạng thái chữ nhỏ, ID hòa metadata, disclosure lịch sử thiếu phản hồi nhấn. Gom nhiệm vụ liên quan với ID nền trung tính/title đầy đủ; trạng thái body 14; lịch sử nền kem, CrewPressable lún/hồi/ripple hiện hữu (Reduce Motion); kỹ thuật và biên nhận chia dòng có nhãn/divider, giữ đầy đủ dữ liệu.

Giữ nguyên non-JSX statements, review.canSupplement, technical, rows order/conditions, phase/receipt semantics, route supplement/params/onPress và recovery/load helpers. AST baseline feda325 + manual full diff PASS. Không gọi mutation hay fake receipt.

- npx tsc --noEmit: exit 0, correction-typecheck.log.
- node --test tests/crew-repair-presentation.test.cjs tests/crew-flow-recovery.test.cjs tests/crew-g02b-recovery.test.cjs tests/t06de.test.cjs: 65/65 PASS, 0 fail/skip, 24248.6432ms; correction-targeted.log (LOGIC_TESTED).
- Full regression 156 file, node --test --test-concurrency=2: 1842/1842 PASS, 0 fail/skip, 235493.154ms, exit 0; correction-regression.log.
- git diff --check exit 0; scoped added-line scan không Ionicons/UD-06/secret/URL literal mới.
- Android fixture ebcdca88: xem trạng thái chưa có lượt gửi, giữ/thả disclosure lịch sử, mở/đọc lại lịch sử local (read), thu gọn và Back về Chi tiết. Quan sát lún/đổi nền khi giữ; correction-pressed.png. Không reset/restart/mutation.
- correction-before.png / correction-after.png cùng đầu màn settled; correction-expanded.png riêng sau mở lịch sử. Tất cả trong .cache/crew-phase2-ui-20261119/.
- NATIVE_VERIFIED giới hạn read/empty/disclosure/pressed/Back. NOT_VERIFIED: SUPPLEMENT/ACCEPT thật, populated receipt/history, mutation/recovery, native offline/error/loading chậm, font scale lớn, OS Reduce Motion, FPS/motion timing. Không claim Android E2E.