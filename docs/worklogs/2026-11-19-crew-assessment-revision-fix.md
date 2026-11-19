# Crew — sửa đánh giá trước thi công khi nháp thay đổi

## Scope và authority

- Mode: Codex `IMPLEMENT_AND_SELF_REVIEW`; không phải independent review.
- FE base: `main`, `8be3fad`. Owner cho phép sửa workflow FE của lỗi 23 cm → 2 cm.
- BE runtime source đã đối chiếu: `a54c806d3d3e9f58b678af4cae4aced58a506945` (Docker sandbox); BE chỉ đọc.
- Không thay BE, API shape, policy threshold, quyền, navigation, dependencies hoặc app config. Không restart/reload app/emulator, không seed lại.
- Fetch `origin/main` trước commit: `0206b84` là ancestor của HEAD; local main có sẵn 10 commit chưa push trước task. Không pull/đổi branch/push.

## EXPECTED / ACTUAL và nguyên nhân

- EXPECTED: sửa số đo/ảnh/vị trí trước thi công phải gửi một đánh giá mới; chỉ dùng receipt mới nhất đã đối soát và kiểm tra API-146 khi bắt đầu.
- ACTUAL trước fix: đánh giá cũ chứa 23 cm đã READY. Sau khi lưu nháp 2 cm, FE vẫn ẩn nút gửi đánh giá vì READY; API-146 tiếp tục đánh giá dữ liệu 23 cm trên server.
- READY xác nhận độ đầy đủ của đánh giá, không đồng nghĩa đủ điều kiện Fast Track. BE cho phép đánh giá lại trước thi công khi hạng mục còn Assigned; không cần sửa ngưỡng hay seed lại.

## Thay đổi

### Core workflow / journal

- `src/api/crewRepairDraft.ts`: so sánh nội dung assessment với FIELD draft (số đo, ảnh BEFORE/MEASUREMENT và location proof), không tính metadata vận chuyển; không coi ảnh AFTER là thay đổi nguồn trước sửa. Cho tạo assessment READY mới chỉ khi nguồn thực sự thay đổi, giữ nguyên mọi hàng/receipt/key cũ.
- Start journal chỉ nhận assessment cuối cùng đã CONFIRMED/READY đúng binding, first-start và item version.
- `src/api/crewRepairWorkflow.ts`: kiểm tra nguồn FIELD trước/sau eligibility ở prepare và trước gửi lần đầu của start. Nháp khác assessment chặn start. Lệnh đã PENDING/unknown vẫn replay nguyên body/key/version, không bị viết lại bởi nháp mới.
- Giữ guard session/actor/environment, binding/version, lệnh chưa rõ kết quả, rejection và chống gửi trùng.

### Giao diện tiến trình

- `app/(crew)/wo-detail.tsx`: hiển thị “Cần gửi lại đánh giá” và lý do; cho gửi lại đánh giá đã thay đổi; ẩn start dùng nguồn cũ. Sau thao tác đọc lại cả lịch sử và FIELD draft. Nếu đọc lại lỗi thì khóa lệnh mới và giữ lịch sử đang có.
- Không tự coi nháp đã lưu là đánh giá đã gửi hoặc thi công đã bắt đầu.

### Tests

- Thêm `tests/crew-reassessment.test.cjs`: revision 23→2, receipt bất biến, concurrent preparation, session/binding/version/rejection/unknown guards, SQLite close/reopen, unchanged-source duplicate, stale prepared start, immutable unknown replay và so sánh nguồn.
- Thêm `tests/crew-reassessment-presentation.test.cjs`: mount tiến trình READY không đổi và READY đã đổi; nút đúng trạng thái, không tự POST khi mount.
- Cập nhật fixture tại `tests/t06b.test.cjs`, `tests/hardening-repair.test.cjs`, `tests/crew-flow-recovery.test.cjs` để cung cấp FIELD draft đúng session và payload thật cho guard mới; không bỏ assertion cũ.

## Executed evidence

| Lệnh / thao tác | Kết quả |
| --- | --- |
| `node --test tests/crew-reassessment.test.cjs tests/crew-reassessment-presentation.test.cjs` | PASS 15/15; `.cache/reassessment-expanded-final.log` |
| `node --test tests/wave1-crew.test.cjs tests/crew-flow-recovery.test.cjs tests/crew-reassessment.test.cjs tests/hardening-repair.test.cjs` trước tách presentation / bổ sung ca | PASS 102/102; `.cache/reassessment-targeted3.log` |
| `node --test tests/*.test.cjs` sau toàn bộ thay đổi | PASS 1868/1868, fail/skipped/cancelled 0; `.cache/reassessment-full-final.log` |
| `npx tsc --noEmit` | PASS, exit 0 |
| `git diff --check` | PASS |
| Scan `Ionicons` trong app/src và từ ngữ chi phí trong màn sửa | Không có match |

Self-review: đối chiếu diff, current BE AssessAsync/StartAsync và eligibility policy; không thêm route/role/defect code/branding/financial UI, không sửa journal replay đã gửi. Changed-file scan không phát hiện credential/private key được thêm.

## ANDROID_E2E_VERIFIED / HTTP_VERIFIED — sandbox riêng

Android Pixel_6_Pro (`emulator-5554`), Expo Go đang chạy. Fixture `SUA-NHANH-MOI-05`, task `3f261a8d-209f-49ce-948d-de1041f61458`.

1. Nháp sửa 2 cm hiển thị yêu cầu gửi lại đánh giá, không cho start với assessment cũ `7fda4a1e-b834-46ca-bedc-fcef5471e18b`.
2. Người dùng bấm gửi lại: POST assessment **201**, assessment mới `73f1f440-fbe1-478f-9003-b0ab64fc38da`, PRE_EXECUTION / READY, missingReasons rỗng.
3. GET eligibility **200**, `eligible=true`, assessmentId đúng ID mới, missingReasons rỗng.
4. Bấm Bắt đầu thi công: POST execution-start **201**, start `5ce7ad60-1551-414f-baa1-e35cc101ec90` tham chiếu assessment mới.
5. GET task **200** đọc lại task và repairContext đều InProgress; itemVersion `AAAAAAADh64=`. Android hiển thị “Đang thi công”. Không kết thúc thi công hoặc nộp hồ sơ trong test này.

Ảnh trong `.cache/crew-reassessment-20261119/` (giữ untracked theo quy tắc owner):

- `before.png`: baseline.
- `changed-draft-resubmit.png`: nháp đổi cần đánh giá mới.
- `new-assessment-eligible.png`: BE xác nhận đủ điều kiện với assessment mới.
- `after-start-confirmed.png`: tiến trình đang thi công sau receipt thật.

## NOT_RUN / giới hạn

- Native offline/timeout/session switching và native process restart: NOT_RUN; không restart app theo ràng buộc owner. Các tình huống tương ứng có logic/journal tests, không nhận là native proof.
- SQLite close/reopen là Node SQLite test, không phải Android restart persistence test.
- Chưa test hết mọi loại hư hại/policy hoặc NORMAL trên Android trong task này; không cam kết loại bỏ mọi lỗi tương lai.
- Các log full/targeted cũ được giữ; run cuối nêu trên là kết quả nghiệm thu. Artifact/cache/media/untracked cũ được bảo toàn.

## Khảo sát ý tưởng hiển thị loại nhiệm vụ và ngưỡng (chỉ đề xuất)

- Current BE task mode phân biệt `MEASURE_ONLY`, `CONDITIONAL_FT`, `NORMAL`; repair context tương ứng FAST_TRACK/NORMAL. Không dùng enum authorization 2 giá trị để suy ra toàn bộ task modes.
- API-146 `RepairEligibilityReadView` có `rules` gồm code/unit/minimum/maximum, policyRevisionId/contentHash/state, missingReasons, assessmentId và execution time window.
- BE `RepairEligibilityRepository` lấy rules từ policy revision của current binding, không phải hằng số chung. Policy `Evaluate` chấp nhận khoảng gồm cả hai đầu và kiểm đúng đơn vị.
- FE `RepairEligibilityReadView` hiện chưa khai báo `rules` và thời gian; `CrewFastTrackEligibility` chưa trình bày ngưỡng. Có thể bổ sung FE riêng với validation và nhãn số đo, không cần sửa BE cho cảnh báo ngưỡng cơ bản.
- Ví dụ fixture đã kiểm tra trả DepressionDepth 0–10 cm; đây là policy sandbox, KHÔNG quy định chung cho mọi nhiệm vụ. Không hardcode hoặc khuyến khích đổi số đo thực để vừa ngưỡng.
- Số đo trong khoảng chưa đủ cho phép thi công: vẫn phải đủ ảnh, nguồn/vị trí, phạm vi bảo hành/bàn giao, quyền hiện hành, thời gian và kết quả API-146. Thiếu policy hoặc đọc lỗi phải thông báo chưa xác định, không tự đặt khoảng.
- Chưa triển khai UI cảnh báo mới trong task sửa lỗi này.
