# Crew UI/UX Phase 2 — 19/11/2026

Mode: **IMPLEMENT_AND_SELF_REVIEW**, Codex; không phải independent review.
Scope: bảy route còn lại, presentation/motion only. Android Pixel_6_Pro (emulator-5554, Android 14, 1440×3120), Expo Go, Metro 8081 đang chạy. Giữ main; không push, reset, restart app/emulator, seed hay thay dữ liệu pending.

## Checkpoint inventory

| Màn | Baseline HEAD | Trạng thái | Commit local |
|---|---|---|---|
| Bản đồ nhiệm vụ | 0a89e94 | Gates PASS, native empty/read/back/pressed | f85ebc2 |
| Theo dõi thi công | f85ebc2 | Gates PASS; native read/disclosure/Back | 4241fe8 |
| Hồ sơ hoàn tất thi công | 4241fe8 | Gates PASS; native read/disclosure/Back | feda325 |
| Chỉnh sửa / bổ sung | feda325 | Gates PASS; native empty/history/pressed/Back | 605c029 |
| Dẫn đường | 605c029 | Gates PASS; native empty/sheet/navigation | 5791edd |
| Chụp ảnh | 5791edd | Gates PASS; native blocked/Back/reentry | 8f1e6fe |
| Hồ sơ hiện trường | 8f1e6fe | Gates PASS; native read/scroll/refresh/disclosure/Back | e993688 |

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
## 5. Dẫn đường

Baseline main 605c029; tracked/staged sạch, ahead/behind 4/0, preserve untracked. File app/(crew)/navigation.tsx. Dùng deep link đúng host exp://127.0.0.1:8081 quan sát từ Expo Go dev menu, ID task/project thật ebcdca88/72f84201; không restart/reset/reload/seed. Lần đầu escape URL sai tạo Unmatched Route do lệnh test; đã sửa URL, không sửa router/guard. navigation-before.png là ảnh URL sai, KHÔNG dùng baseline; baseline hợp lệ navigation-before-valid.png.

Baseline: Back đè status bar, empty title lớn/đậm và thông báo rời, tuyến bị cắt, tọa độ chữ nhỏ và fallback Chưa có GPS gây nhầm nguồn. Chỉnh map container vào safe area (style flex), empty thành cụm neutral/cream icon, title16/body14; tuyến full text, địa chỉ/divider + tọa độ có nhãn, action wrap minWidth144. Chỉ Back dùng CrewPressable cream/pressed, không scale map hay drag handle.

Giữ toàn bộ map props/markers/coordinate expressions, openGoogleMaps intent, disabled, handlers/routes/params, sheet geometry/collapse-offset/onLayout/PanResponder và springs. AST baseline605c029 PASS, manual full diff PASS. Springs kéo sheet hiện hữu chưa có Reduce Motion: giữ nguyên vì task cấm đổi handler; đây là hạn chế sẵn có, không nhận đã xử lý. CrewPressable mới có Reduce Motion.

- TypeScript exit0, navigation-typecheck.log.
- node --test tests/crew-nav01.test.cjs tests/crew-map-geometry.test.cjs tests/c10bc-ui.test.cjs: 53/53 PASS, 0fail/skip,18200.8178ms, navigation-targeted.log.
- Android: thiếu tọa độ thật; Google Maps disabled, tap header thu/mở sheet, Xem nhiệm vụ đến đúng ebcdca88, Android Back trở lại Navigation. navigation-after.png cùng fixture/expanded; navigation-collapsed.png là trạng thái riêng. NATIVE_VERIFIED giới hạn read/layout/sheet/navigation; không claim E2E/FPS.
- NOT_VERIFIED: map populated/pan/zoom/Google Maps external intent vì thiếu tọa độ, native large font/OS Reduce Motion/error/offline. Không xin quyền GPS hay thay dữ liệu.
- Full regression 156 file: node --test --test-concurrency=2, 1842/1842 PASS, 0fail/skip,228435.5629ms,exit0; navigation-regression.log. git diff --check exit0, added-line scan không Ionicons/UD-06/secret/URL mới. Kéo thử sheet chưa xác minh được chuyển trạng thái; tap thu/mở đã xác minh, không nhận drag PASS.

## 6. Chụp ảnh

Baseline main 5791edd, ahead/behind5/0, tracked/staged sạch trước edit. Chỉ app/(crew)/viewfinder.tsx và worklog. Android baseline viewfinder-before.png từ task ebcdca88 đã Submitted: guard capture khóa thật; text sát mép/không title/Back full width. Source review thêm: mode row không wrap, metadata GPS font9, camera utility chỉ đổi nền khi nhấn. Không bypass guard để chụp baseline camera active.

UI: trạng thái khóa thành một cụm neutral, icon camera-off, title16/body14 và Back gọn >=48dp, ScrollView cho chữ lớn. Camera active: thanh mode có wrap, font14 nhẹ hơn, metadata caption12 và wrap, provenance footer body14; nút close/flash/mode/gallery/switch dùng CrewPressable hiện hữu (100ms lún/180ms hồi/ripple/Reduce Motion). Không animate preview/watermark/form; không sửa shared ViewFinder/CrewMotion/Button.

Giữ nguyên toàn bộ non-JSX statements và action props (AST baseline5791edd PASS); manual diff giữ mode filter/conditions, disabled/busy/shooting, handlers/routes/params, capture lifecycle/GPS/provenance/notice/local recovery/guard. AFTER confirmation white text/checkbox/handler giữ nguyên.

- npx tsc --noEmit exit0; viewfinder-typecheck.log.
- node --test tests/crew-after-camera-guidance.test.cjs tests/crew-camera-lifecycle.test.cjs tests/crew-flow-recovery.test.cjs tests/crew-nav01.test.cjs:91/91 PASS,0fail/skip,21254.6679ms; viewfinder-targeted.log (LOGIC_TESTED).
- Android: đọc blocked state, tap Quay lại về Navigation, mở lại bằng URI đúng task, Android Back trở lại; không restart/reset/reload/capture/save/gallery/GPS permission. viewfinder-before.png / viewfinder-after.png cùng task/blocked state.
- NATIVE_VERIFIED giới hạn blocked layout/Back/reentry; camera active preview, flash/switch/gallery/mode/pressed, shutter/capture/save/upload/AFTER, offline/error, native large font/Reduce Motion và FPS NOT_VERIFIED. Motion có trong code/Node không được coi là native camera proof. Cần fixture riêng cho phép capture để kiểm chứng thêm; giữ dữ liệu nháp cũ.
- git diff --check exit0; scoped added-line scan không Ionicons/UD-06/secret/URL mới. Full regression 156 file: node --test --test-concurrency=2,1842/1842 PASS,0fail/skip,241111.0816ms,exit0; viewfinder-regression.log.
## 7. Hồ sơ hiện trường

Baseline main 8f1e6fe, tracked/staged sạch, ahead/behind6/0. Chỉ app/(crew)/field-review.tsx và worklog. field-review-before.png: thiếu mã nhiệm vụ, title đậm/cạnh tranh với số đo, refresh icon đứng rời, recovery disclosure không rõ vùng chạm, nhãn dụng cụ/phương pháp nhỏ và cột cứng86dp.

Thay đổi: ID nền trung tính từ wo_code hoặc prefix ID thật; title đầy đủ font16/500; divider và nhãn trạng thái; kết quả hồ sơ giữ nguyên semantics, tải lại có label/kem/viền/disabled opacity. Loading có cụm indicator + label trong cùng điều kiện thật. Giá trị số đo label14, nhãn body14 và row wrap linh hoạt; không sửa dữ liệu/đơn vị/unknownReason. Disclosure lỗi/thông báo/recovery/help dùng CrewPressable hiện hữu (100ms lún/180ms hồi/ripple, Reduce Motion), vùng chạm48dp. Không scale form/map/ảnh, không thêm success optimistic hoặc animation lặp. Modal fade/slide hiện hữu chưa có Reduce Motion; giữ nguyên và không nhận đã khắc phục.

Giữ toàn bộ non-JSX business statements, action props, conditions/loading/disabled, validation/GPS, draft/session isolation/recovery/ACK/replay, provenance, upload, route/params/handlers. AST baseline8f1e6fe PASS; manual full diff kiểm JSX conditions và props không đổi. Không bấm tạo nháp/gửi/đối soát/chụp/lưu để lấy screenshot.

- TypeScript exit0, field-review-typecheck.log; targeted 133/133 PASS,0fail/skip,24001.4471ms, field-review-targeted.log (LOGIC_TESTED).
- Targeted command: node --test tests/crew-field-feedback-state.test.cjs tests/crew-field-ux-01.test.cjs tests/crew-field-instrument-edit.test.cjs tests/crew-flow-recovery.test.cjs tests/crew-g02b-supplement.test.cjs tests/crew-g02b-recovery.test.cjs tests/crew-polish-layout.test.cjs tests/crew-nav01.test.cjs.
- Android fixture ebcdca88/72f84201, trạng thái Submitted, hồ sơ revision1 cần bổ sung, nháp thuộc phiên cũ; đúng nguồn thật. Đã đọc đầu màn, mở/đóng giải thích, giữ/thả nút (quan sát lún/đổi nền/ripple), tải lại bằng handler cũ, cuộn qua ba số đo/thông tin thiếu/ảnh đã gửi, Back về Navigation và mở lại Field Review đúng ID, trạng thái nháp/receipt giữ nguyên. Không sửa dữ liệu/khởi động lại app hoặc emulator.
- field-review-before.png / field-review-after.png cùng đầu màn settled; field-review-expanded.png, field-review-pressed.png, field-review-measurements.png là trạng thái bổ sung, không dùng thay baseline. NATIVE_VERIFIED giới hạn các thao tác đọc nêu trên.
- NOT_VERIFIED: form editable/focus/keyboard/save/restore, chụp/upload/gửi/receipt/recovery; populated photo download/preview; native offline/error/loading chậm, large font, OS Reduce Motion, motion timing/FPS. Hiện có nháp lịch sử nên không tạo nháp mới để test. Không claim Android E2E hoặc HTTP mutation.
- git diff --check exit0; scoped added-line scan không Ionicons/UD-06/secret/URL mới.
- Full regression final tree:156 file, node --test --test-concurrency=2,1842/1842 PASS,0fail/skip,255029.7679ms,exit0; field-review-regression.log.

## Rà soát phạm vi cuối phiên

AST presentation helper đối chiếu baseline0a89e94 cho cả7 file source PASS: non-JSX statements và action props không đổi. Manual diff từng checkpoint bổ sung kiểm chứng JSX conditions/guards; AST không thay thế native hay review. Chỉ7 file source riêng trong scope và worklog thay đổi; task-map route wrapper không sửa, private CrewTaskMap là caller riêng đã xác minh. Shared Button/Card/AppHeader/NormalRepairPanel/CrewMotion,7 màn cũ,API/BE/config/dependency không đổi.

Giới hạn cần owner duyệt: Progress/Complete dùng NormalRepairPanel re-export từ WO Detail; chưa redesign sâu panel vì sẽ chạm shared scope ngoài task. Bản đồ có tọa độ, positive SUPPLEMENT/receipt, camera active và mutation trọn luồng cần fixture riêng/permission; không fake dữ liệu. Không đo FPS, không nhận60FPS. Dừng sau checkpoint7, không push/đổi branch hoặc sang màn khác.

## Ảnh đối chiếu

Cùng fixture settled ở đầu màn, trừ các giới hạn đã ghi trong từng checkpoint. Ảnh chỉ giữ local, không commit cache.

| Màn | Trước | Sau |
|---|---|---|
| Bản đồ nhiệm vụ | [Trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-phase2-ui-20261119/task-map-before.png) | [Sau](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-phase2-ui-20261119/task-map-after.png) |
| Tiến độ | [Trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-phase2-ui-20261119/progress-before.png) | [Sau](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-phase2-ui-20261119/progress-after.png) |
| Hoàn tất | [Trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-phase2-ui-20261119/complete-before.png) | [Sau](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-phase2-ui-20261119/complete-after.png) |
| Bổ sung | [Trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-phase2-ui-20261119/correction-before.png) | [Sau](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-phase2-ui-20261119/correction-after.png) |
| Dẫn đường | [Trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-phase2-ui-20261119/navigation-before-valid.png) | [Sau](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-phase2-ui-20261119/navigation-after.png) |
| Camera (guard khóa) | [Trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-phase2-ui-20261119/viewfinder-before.png) | [Sau](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-phase2-ui-20261119/viewfinder-after.png) |
| Hồ sơ hiện trường | [Trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-phase2-ui-20261119/field-review-before.png) | [Sau](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-phase2-ui-20261119/field-review-after.png) |

Remote main kiểm read-only qua git ls-remote origin refs/heads/main tại cuối phiên:0a89e945402d00e2f0195fa45d3eae68ec1eacae, không tiến lên so với baseline đã fetch. Không push. Source final7/7 checkpoint đã đối chiếu với baseline; gates software PASS không mở rộng native proof đã ghi.

Checkpoint7 commit local e993688. Bảy source checkpoint: f85ebc2,4241fe8,feda325,605c029,5791edd,8f1e6fe,e993688. Commit docs cuối chỉ ghi SHA/biên bản, không sửa source sau full regression. Trước docs commit: main ahead7/behind0, tracked source sạch; chỉ worklog đang cập nhật. Untracked cache/log/mydatabase.db/Android build giữ nguyên.
