# Crew UI/UX Phase 2 — 19/11/2026

Mode: **IMPLEMENT_AND_SELF_REVIEW**, Codex; không phải independent review.
Scope: bảy route còn lại, presentation/motion only. Android Pixel_6_Pro (emulator-5554, Android 14, 1440×3120), Expo Go, Metro 8081 đang chạy. Giữ main; không push, reset, restart app/emulator, seed hay thay dữ liệu pending.

## Checkpoint inventory

| Màn | Baseline HEAD | Trạng thái | Commit local |
|---|---|---|---|
| Bản đồ nhiệm vụ | 0a89e94 | Gates PASS, native empty/read/back/pressed | Commit chứa checkpoint 1; SHA bổ sung ở checkpoint tiếp theo |
| Theo dõi thi công | Chưa bắt đầu | Pending | — |
| Hồ sơ hoàn tất thi công | Chưa bắt đầu | Pending | — |
| Chỉnh sửa / bổ sung | Chưa bắt đầu | Pending | — |
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
