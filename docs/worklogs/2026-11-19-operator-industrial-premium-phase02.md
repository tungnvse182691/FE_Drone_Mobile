# Operator Industrial Premium Phase02 — A → I

Mode: IMPLEMENT_AND_SELF_REVIEW (Codex, không phải review độc lập).
Owner scope hiện hành: hoàn tất A→I theo addendum continue-all, ghi đè checkpoint dừng A+B. Branch main; không push.
Base: 5430eec9ca73cb30d46ad5bccf085cd4ab2de3e4; origin/main đã fetch: 1c852e9.

## A — Khảo sát

### Audit / thay đổi

- Baseline có mã/phạm vi/trạng thái phân tán, controls lặp màu vàng. Gom filter và số lượng đã tải thành một cụm; refresh/history bề mặt trắng, target 48dp.
- Card chia identity + tiêu đề, footer nền trung tính gom trạng thái/phân đoạn; ID chữ xanh than, tabular figures. Bo 16dp, không shadow, không card lồng.
- Giữ nguyên classifyTab, count, filter, cursor, thứ tự và handler. Chữ “trong 50 nhiệm vụ đã tải” không phải total backend.
- Giữ motion nhấn scale .985 + ripple của AnimatedPressable/Reanimated; không thêm entrance lặp. Reduce Motion theo component sẵn có, không chỉnh global.
- Shared OperatorTaskRow chỉ có caller Requests. Home có row cục bộ; helper visual và Skeleton mà Home import không thay đổi. Không tác động Crew/Reporter.

### Bằng chứng Android

Expo Go, emulator-5554, Pixel 6 Pro Android14, 1440×3120, phiên hiện có; chỉ Fast Refresh, không restart/reload/reset/logout.

- BEFORE: `.cache/industrial-premium-phase02/requests-before-stable.png`.
- AFTER: `.cache/industrial-premium-phase02/requests-filter-ongoing-after.png`; `requests-supplement-after.png`.
- Đã mở dropdown, chọn Đang thực hiện (10/50), Cần bổ sung (2/50), refresh, mở Chi tiết Đã nộp và Back, mở Chi tiết Đã nhận.
- Scroll Chi tiết đã dịch nội dung xuống tới Video và disclosure; không suy từ gesture đơn thuần thành list scroll PASS.
- NOT_RUN native: list empty/error/initial loading, tải thêm, font phóng lớn, chiều rộng nhỏ, Reduce Motion OS, đo FPS. Không mutation để tạo trạng thái.
- `requests-before.png` là ảnh giữa transition, không dùng nghiệm thu; `requests-ongoing-after.png` thực tế là Detail, không dùng so sánh Requests. Giữ nguyên artifact.

### Gate đã chạy

- `npx tsc --noEmit`: PASS, exit0.
- `node --test --test-concurrency=2 tests/operator-ui05.test.cjs tests/operator-ui06-crew.test.cjs tests/drone-ui02a.test.cjs tests/operator-refresh-ui.test.cjs tests/operator-ui-integration.test.cjs tests/operator-home-premium.test.cjs`: PASS 98/98. Log `.cache/industrial-premium-phase02/requests-targeted-final.log`.
- Full regression: `node --test --test-concurrency=2` với toàn bộ `tests/*.test.cjs`: PASS 1928/1928, 0 fail; 201406.7077ms. Log `.cache/industrial-premium-phase02/requests-regression-final.log`.
- Lần regression đầu: 11 lỗi cùng assertion màu viền cũ; sửa đúng expectation #DCE2E7 và radius16, giữ assertion trạng thái/callback. Đổi tên test Crew thành Operator đúng component được mount.
- `git diff --check`: PASS. Diff tự review chỉ JSX/style và kỳ vọng presentation của test. Icon mới MaterialIcons; scan Ionicons app/src không match; không thêm tiền tệ, secret, API hoặc route.
- UI còn giới hạn: “NHIỆM VỤ HIỆN TẠI” vẫn là nhãn cũ, có thể xuống dòng ở font lớn; chưa có native large-font proof. Card ưu tiên đọc rõ hơn là mật độ tối đa.

Commit checkpoint A: xem Git history commit chứa phần này (không ghi SHA tự tham chiếu).

## Owner addendum — continue all

Owner mở rộng checkpoint ngày 19/11: hoàn tất A→I tuần tự, không dừng A+B. Chỉ UI/motion; không push hoặc mutation lấy bằng chứng. A 513aee2 giữ nguyên.

## B — Chi tiết nhiệm vụ

- Gom phạm vi + hạn bay vào overview; mã/status cùng hàng wrap. Bỏ icon trang trí assignment/layers/route/event/coordinate. Điểm tiếp cận thành nhóm riêng, hành động phụ trung tính; CTA gửi dữ liệu giữ nguyên.
- Disclosure/Google Maps dùng AnimatedPressable sẵn có (ripple + nhấn nhẹ, Reduce Motion kế thừa). Video heading/action wrap; không đổi player/modal/lifecycle. CommandPanel chỉ opt-in presentation premium, caller khác giữ mặc định.
- Files: app/(drone)/request-detail.tsx; src/components/drone/DroneTaskCommandPanel.tsx; src/components/drone/OperatorSubmittedVideos.tsx.
- Android Expo Go emulator-5554: xem Đã nhận 1f6b0d1c; scroll tới disclosure, mở Thông tin kỹ thuật thấy ID/version thật; Detail→Gói công việc→Back và Detail→Upload→Back hoạt động. Không gửi dữ liệu. BEFORE detail-before.png (Đã nộp 25324063); AFTER detail-accepted-after.png (Đã nhận 1f6b0d1c), detail-technical-after.png. Hai ảnh khác task/status nên không dùng so sánh dữ liệu. detail-accepted-before.png có Refreshing overlay; không dùng làm baseline sạch. detail-disclosure-after.png thực tế WorkPackage, không coi là disclosure.
- npx tsc --noEmit: PASS exit0 (chạy lại sau sửa prop order).
- Targeted 8 file drone-ui02a/b, operator-ui03/ui06/integration, video-viewer/playback/orientation: 122/122 PASS, detail-targeted.log.
- Full regression detail-regression.log: 1927/1928, một regex đòi key/taskId liền nhau. Giữ nguyên thứ tự prop cũ rồi chạy lại tests/final-drone.test.cjs: 23/23 PASS (detail-regression-recheck.log). Không thay assertion business.
- git diff --check PASS. Self-review: prefix logic Detail, dispatcher/journal và RecoveryList, prefix lifecycle/modal video không đổi; chỉ JSX/style/optional presentation.
- NOT_VERIFIED: Google Maps app ngoài, mở player thực, nhận/từ chối/upload, empty/error/offline, OS Reduce Motion, font lớn/thiết bị hẹp và FPS. Không suy Node tests thành Android E2E toàn workflow.
- Commit B: commit chứa mục này; SHA sẽ được ghi ở checkpoint kế tiếp.

## C — Từ chối nhiệm vụ (20/11)

B commit: cf5e3b0. C source: app/(drone)/request-decline.tsx.
- Baseline decline-before.png: hàng dữ liệu xa nhau, giá trị chưa phân cấp, vàng ở thông báo/mã cạnh CTA. Đổi sang label/value navy với nhịp hàng rõ, wrap khi thiếu rộng; mã tabular trung tính, tiêu đề16/24. Khối lệnh opt-in premium của B; nút quay lại radius12 và khoảng cách12 với khối nhập.
- Android task2b0dc125: mở Từ chối từ Chi tiết, xem lý do khóa và Back về Chi tiết. Không nhập/lưu/gửi từ chối. AFTER decline-after.png chụp trước chỉnh marginBottom12 cuối (chỉ khoảng cách nút/panel); không claim ảnh này chứng minh margin cuối.
- npx tsc --noEmit exit0. Targeted/regression liên quan: drone-ui02a, drone-android01-ui, final-drone, package45-drone, operator-ui03: 99/99 PASS (decline-targeted.log). git diff --check PASS. Phần chỉ style cuối không đổi TS shape/behavior.
- Self-review: logic trước renderBody và callback/condition không thay; command panel mutation/journal không sửa. Shared default giữ nguyên. Không thêm icon/cost/API/route.
- NOT_VERIFIED: bàn phím/nhập dài native, confirm/receipt/unknown outcome, offline/error, font lớn, Reduce Motion OS, FPS/APK/iPhone. Không mutation lấy bằng chứng. Full suite sẽ chạy ở final frozen source.
- Commit C: commit chứa mục này; SHA ghi ở checkpoint kế tiếp.

## D — Gói công việc (20/11)

C commit: 4a0dae9. Files: app/(drone)/work-package.tsx; tests/package45-drone.test.cjs.
- Audit native: nhiều icon vàng lặp, ID giống thông báo, tọa độ chật. Dùng nhãn/value responsive, ID navy/tabular, map-entry navy có hành động thật, tiêu đề sentence case; phân đoạn dùng hàng có divider thay card lồng. Giữ mọi thông tin BE, kể cả guidance SRT/GPS lịch sử (chưa đối chiếu thay đổi contract trong task UI này).
- Android Expo Go task2b0dc125: BEFORE work-package-before.png; AFTER work-package-after.png; work-package-segment-after.png mở phân đoạn1 (trạm0–100m); work-package-technical-after.png mở ID kỹ thuật. Scroll và disclosure thực đã chạy. Motion nhấn/ripple sẵn có, không đổi callback/geometry selection/pinned refs.
- npx tsc --noEmit PASS exit0. Targeted drone-ui02a/b/c, operator-map, package45-drone, wave1-drone: 116/116 PASS, work-package-targeted-final.log. Lần đầu6 lỗi cùng expectation uppercase NHIỆM VỤ; cập nhật đúng copy sentence case, giữ assertion invalid GPS/geometry/error. git diff --check PASS.
- NOT_VERIFIED: loading/error/offline native, large font/narrow device, Reduce Motion OS/FPS/APK. Tests Node không thay native/HTTP. Không mutation. Full suite cuối phiên.
- Commit D: commit chứa mục này, SHA ghi checkpoint sau.

## E — Bản đồ khảo sát (20/11)

D commit: 8fab41c. File: app/(drone)/survey-map.tsx.
- Baseline survey-map-before.png: các chip vàng/icon tuyến lặp, điểm tiếp cận cùng màu khiến khó phân biệt selection. Chuyển selected segment sang navy/white, bỏ icon trang trí segment, giữ nút48dp; focus access nền vàng nhạt chỉ khi chọn, nút mặc định trung tính. Loading thêm label thật, không fake progress.
- Android: survey-map-after.png và survey-map-access-after.png. Mở từ Gói công việc, chọn Đoạn1 (hierarchy selected đổi đúng), focus Điểm tiếp cận, Back về Gói. Không sửa MapLibre/key/coordinates/markers hay bất kỳ handler nào. Press/ripple/Reduce Motion từ AnimatedPressable hiện có.
- Map baseline ban đầu trắng; sau khi chờ/Fast Refresh có line vàng trên nền xanh và marker khi focus. KHÔNG coi đây là fix runtime/tiles: kiểm chứng địa lý/basemap đầy đủ NOT_VERIFIED.
- npx tsc --noEmit exit0; operator-map + wave1-drone + drone-ui02b:64/64 PASS (survey-map-targeted.log), geometry/source/assigned scope tests giữ nguyên. git diff --check PASS.
- NOT_VERIFIED: network error/offline/empty native, pinch/pan/tile correctness, font lớn, OS Reduce Motion, FPS/APK/iPhone. Full regression cuối phiên. Không mutation.
- Commit E: commit chứa mục này, SHA ghi checkpoint sau.

## F — Tải dữ liệu khảo sát (20/11)

E commit: b5c4ea0. File: app/(drone)/upload.tsx.
- Baseline upload-before-stable.png: icon tiêu đề lặp, các hành động phụ cùng vàng với CTA. Dùng title/navy và caption slate, bỏ icon Máy bay/Tệp đã lưu; nút chọn/đổi tệp và lưu nháp trung tính radius12. Hàng wrap và tiến trình tabular; không đổi công thức progress, receipt hoặc điều kiện.
- AnimatedPressable cho disclosure Tệp đã lưu, timing150ms/Reduce Motion kế thừa; không trì hoãn handler. Button/choice còn lại giữ phản hồi hiện có.
- Android Expo Go task Đã nhận2fb2b846: AFTER upload-after.png; mở Tệp đã lưu thấy empty thật0, scroll tới CTA khóa kèm lý do chọn MP4 (upload-storage-after.png), Back về Chi tiết. Không chọn file/máy bay, lưu nháp hoặc submit. upload-before.png thực tế Chi tiết, không dùng làm baseline Upload.
- npx tsc --noEmit exit0 (upload-tsc.log). node --test package45-drone, package6-drone-files/selection/dataset-replay, operator-upload-draft/storage-transfer/recording-time, drone-android01-ui:61/61 PASS (upload-targeted.log). git diff --check PASS.
- Self-review: prefix nghiệp vụ trước fileCard nguyên vẹn; onPress/disabled/callback/route/receipt và file URI không đổi. Không sửa shared component.
- NOT_VERIFIED: upload/VERIFY_PENDING/pause/cancel/replay native, selected file/keyboard/long filename native, network error/offline, font lớn/Reduce Motion OS/FPS/APK. Không mutation lấy bằng chứng. Full regression cuối phiên.
- Commit F: commit chứa mục này; SHA ghi checkpoint tiếp.


## G — Đồng bộ (20/11)

F commit: b8acea9. File: app/(drone)/sync.tsx.
- Baseline sync-before.png: summary/queue cùng bề mặt, chữ in hoa cạnh các section. Tạo khối tổng quan navy, thông tin phụ tương phản cao, nút đọc lại vàng nhẹ; section sentence case, tabs selected navy, queue row padding16 và nhãn wrap. Không dựng trạng thái gửi/receipt.
- Android Expo Go: sync-after.png, sync-scroll-after.png. Bấm Đọc lại hàng đợi thấy thông báo chỉ làm mới trên thiết bị; scroll thấy hai hồ sơ VERIFIED chưa nộp và yêu cầu UNKNOWN thật. Không mở/replay/mutation hồ sơ. Recovery child/default giữ nguyên; không sửa dữ liệu đang chờ.
- npx tsc --noEmit PASS exit0 (sync-tsc-final.log); targeted drone-ui02c + drone-android01-ui + package6-drone-recovery-ui + dot-b-sync-profile:69/69 PASS (sync-targeted-final.log). Lần typecheck đầu phát hiện duplicate style gap, đã xóa và chạy lại thành công. git diff --check PASS.
- Self-review: STATE_PRESENTATION, queue identity/filter, reload và safe-purge handler, child recovery không đổi. Chỉ JSX copy/style. Giữ Pressable/type/48dp và phản hồi pressed hiện có; không thêm motion liên tục.
- NOT_VERIFIED: outbox tabs có dữ liệu (outbox0 trong phiên), loading/error/offline native, lịch sử mở rộng, replay/session switch/restart native, font lớn/Reduce Motion OS/FPS/APK. Full regression cuối phiên.
- Commit G: commit chứa mục này; SHA ghi checkpoint sau.

## H — Nhật ký (20/11)

G commit: d596055. File: app/(drone)/log.tsx.
- BEFORE log-before.png và log-lookup-before.png: tab vàng và nhiều khối tra cứu giống nhau, thiếu label luôn nhìn thấy. AFTER log-after.png và log-lookup-after.png: selected tab navy, title phân cấp, label riêng cho UUID, các nhóm tra cứu dùng divider thay card lặp; hành động phụ trắng, nút mở nâng cao vàng nhẹ. Giữ đúng hai tab Lệnh đã lưu / Tra cứu.
- Android Expo Go: mở/thu nhóm tra cứu, xem cả hai tab; nhập abc vào mã nhiệm vụ thấy nút đọc vẫn disabled; đóng bàn phím rồi đổi tab qua lại vẫn giữ abc. Back header rời Nhật ký. Không GET hoặc mutation để tạo dữ liệu kết quả. Các ảnh AFTER chụp trước khi nhập abc; hierarchy kiểm chứng riêng trạng thái nhập.
- npx tsc --noEmit: PASS exit0 (log-tsc.log). Targeted operator-log-tabs + drone-ui02c + operator-ui-integration + package45-drone:38/38 PASS (log-targeted.log). git diff --check PASS.
- Self-review: không đổi handler/session/GET/UUID validation, mounting input, recovery và tab state. Giữ AnimatedPressable/CrewContentTransition sẵn có; không thêm entrance lặp hoặc animation liên tục.
- NOT_VERIFIED: server readback có kết quả/error/loading native, dataset input dưới keyboard, font lớn/narrow device, Reduce Motion OS, FPS/APK/iPhone. Full regression cuối phiên.
- Commit H: commit chứa mục này, SHA ghi checkpoint tiếp.
