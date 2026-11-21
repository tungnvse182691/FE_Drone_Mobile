# Crew Taste — Chi tiết nhiệm vụ, phương án D

- Ngày: 21/11/2026. Codex, `IMPLEMENT_AND_SELF_REVIEW` (không phải independent review).
- Baseline: main, `ddb1e6338ddbb2d4e907a70dfd1b51385b715d8b`.
- Owner duyệt D, sau đó yêu cầu thu gọn Mở bản đồ về một góc và làm khối bản đồ nổi bật hơn. Owner cho phép tiếp tục kiểm tra emulator, không restart/reload/reset.
- Commit: checkpoint chứa tài liệu này; tra SHA bằng `git log -1 --format=%H -- docs/worklogs/2026-11-21-crew-taste-detail-d.md`.

## Scope và thay đổi

| File | Nội dung |
|---|---|
| `app/(crew)/wo-detail.tsx` | Tách nhận diện nhiệm vụ khỏi khối tình trạng navy; CTA vàng chữ tối; phân cấp hướng dẫn/thời hạn; hành động phụ trung tính; giảm icon trang trí. Chỉ JSX/style CrewFieldActions. |
| `src/components/crew/CrewTaskFacts.tsx` | Vị trí/lịch sử có heading rõ, timeline trung tính, disclosure nhẹ. Khối bản đồ nền kem viền vàng nhạt, nút gọn bên phải, vùng chạm tối thiểu 48dp, wrap khi thiếu chiều rộng. |
| `tests/crew-ui-patch11.test.cjs` | Thay assertion regex phụ thuộc InputField nằm trực tiếp dưới guard bằng AST kiểm tra chính guard, binding và số lượng InputField. |
| `tests/crew-taste-detail-facts.test.cjs` | Hai test hành vi đọc tường minh, lịch sử đầy đủ, đóng/mở, params bản đồ gốc và lỗi quyền 403. |

Không thay API/DTO/guards/handler/params/journal/offline/recovery, shared Button, tokens, header/safe area, Home hoặc role khác. `NormalRepairBootstrap` và `RepairFieldSummary` được so sánh source với HEAD: giống nguyên bản. `detailHeading` cũ giữ nguyên cho caller dùng chung; heading Taste dùng style riêng. Evidence: `.cache/crew-taste-detail-implement-20261121/diff-scope.txt`.

## Android thực tế

- Pixel_6_Pro, emulator-5554, Android 14/API 34, 1440×3120, density 3.5; Expo Go 58.0.5, Metro hiện có.
- Fixture đang có: task `60a04265-501d-45dd-9d4e-43486ce37311`, project `72f84201-c001-4000-8000-000000000001`, `Submitted / MEASURE_ONLY`, tiêu đề Sandbox Crew FIELD fixture. Không hardcode dữ liệu vào UI, không tạo mutation.
- Kiểm tra top, cuộn xuống, đọc Vị trí/lịch sử tường minh; mặc định 3/6 sự kiện; mở đủ 6 và lý do bổ sung đầy đủ; thu gọn; mở/đóng kỹ thuật, mã gốc/version/status còn đủ.
- Mở bản đồ từ nút gọn → màn bản đồ báo chưa có vị trí (đúng dữ liệu fixture chưa có tọa độ) → Back về đúng Chi tiết, lịch sử đã tải vẫn còn. Cuộn về đầu → Quay lại danh sách → Công việc đúng task 60a04265 trong danh sách (kiểm hierarchy sau Back).
- Hồ sơ khuyết tật liên quan được quan sát rồi Back về Chi tiết; lúc đầu có thao tác owner xen kẽ nên không dùng lần mở đó làm bằng chứng riêng cho callback.
- Không reload/restart emulator/app, logout, submit/save/upload/replay hay đổi dữ liệu.

### Ảnh BEFORE / AFTER thật

BEFORE: `.cache/crew-taste-detail-demo-20261121/detail-before-top.png`, `detail-before-lower.png`, `detail-before-history-expanded.png`. Không dùng `detail-before.png` vì là trạng thái loading.

AFTER trong `.cache/crew-taste-detail-implement-20261121/`:

- `detail-after-top-final.png`: nhận diện, tình trạng và CTA.
- `detail-after-map-compact.png`: khối bản đồ sau feedback cuối, nút x926/y998, 354×168px (48dp cao).
- `detail-after-history.png`, `detail-after-history-expanded.png`: 3/6 sự kiện và đầy đủ lý do.
- `detail-after-technical.png`: UUID/version/status đầy đủ.
- `detail-map-navigation.png`: điều hướng bản đồ trạng thái thiếu vị trí.

Đây là ảnh Android thật; concept D tại `.cache/crew-taste-detail-demo-20261121/detail-concept-D-full.png` chỉ là tài liệu duyệt thiết kế, không phải Android AFTER.

## Executed gates

1. `npx tsc --noEmit` — exit 0, không lỗi. Log `typecheck-final.log`.
2. `node --test tests/crew-c3-detail.test.cjs tests/crew-ui-restore.test.cjs tests/t05a.test.cjs tests/t05b.test.cjs tests/t06b.test.cjs tests/t06c.test.cjs tests/t06de.test.cjs tests/crew-repair-presentation.test.cjs tests/crew-ui-patch11.test.cjs tests/crew-taste-detail-facts.test.cjs` — 255/255 PASS, exit 0. Log `targeted-final.log`.
3. `node --test --test-concurrency=2 tests/*.test.cjs` — 1959/1959 PASS, 0 fail, exit 0, 200932.7533ms. Log authoritative `full-regression-final2.log`, chạy sau mọi source edit cuối.
4. `git diff --check` — PASS. Soát diff: presentation + test, không đổi logic. Quét changed files Ionicons/UD-06/credential assignments: không match. Icon còn lại MaterialIcons; không thêm font/dependency/config.

Các log trên ở `.cache/crew-taste-detail-implement-20261121/`. Một lượt đầu lỗi assertion JSX cũ vì thêm wrapper nền sáng cho InputField; sửa assertion AST vẫn xác minh guard `!blocked('reject')`, reason/setReason; chạy lại targeted và full xanh. Không xóa hoặc bỏ test lỗi. Baseline Operator URL hết hạn không fail trong lượt full cuối này.

## Giới hạn

- ANDROID_E2E_VERIFIED chỉ các thao tác đọc/cuộn/disclosure/bản đồ/Back ghi trên; LOGIC_TESTED cho fixture tests, không thay bằng bằng chứng native/mutation.
- NOT_VERIFIED native: font lớn, màn hẹp khác thiết bị, TalkBack, Reduce Motion, vị trí bản đồ có tọa độ, trạng thái NORMAL/CONDITIONAL_FT, reject/accept/start/pending/error native và CTA mở hồ sơ đã gửi. Không thực thi mutation để tạo ảnh.
- Không nghiệm thu camera/dẫn đường hay sửa lỗi safe area trong checkpoint này. Không thay thiết kế màn Crew khác. Màn tiếp theo cần demo/duyệt theo quy trình Taste trước khi implement.
- Commit local trên main; không push/fetch/pull hoặc đổi branch. Untracked cache/log/build/db có sẵn được giữ nguyên.
