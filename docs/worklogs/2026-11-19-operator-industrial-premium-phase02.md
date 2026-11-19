# Operator Industrial Premium Phase02 — A + B

Mode: IMPLEMENT_AND_SELF_REVIEW (Codex, không phải review độc lập).
Owner scope: Khảo sát rồi Chi tiết, dừng sau A+B. Branch main; không push.
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
