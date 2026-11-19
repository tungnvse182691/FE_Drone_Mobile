# Crew — hướng dẫn ngưỡng đo sửa nhanh, 2026-11-19

## Phạm vi và authority

- Codex, IMPLEMENT_AND_SELF_REVIEW; đây là self-review, không phải independent review.
- Owner cho phép thêm cảnh báo trong từng editor số đo, sau đó yêu cầu thu gọn, đóng/mở, đổi khoảng hiển thị theo đơn vị và căn giữa chữ.
- Branch main, starting HEAD a1add42; origin/main fetched 0206b84d059b31f9d9a8cffc82d9255e38b9f2c9. Không push, đổi branch, reset/clean/stash, sửa BE hay xóa untracked.
- Canonical: docs/specs/02_Business-Workflows/08_FastTrack-Policy-and-Confirmation.md. API-146 là authority eligibility; số đo trong khoảng không cấp quyền thi công.
- BE runtime source đối chiếu: a54c806d3d3e9f58b678af4cae4aced58a506945; checkout BE fe08de0, remote develop 4934103d125be1caca4c6a588eed3768c9cafee4 không được coi là runtime đang chạy.
- Nguồn runtime: RepairEligibilityReadDtos.cs (RepairMeasurementRule), RepairEligibilityRepository.cs, RepairPolicyAndAuthorization.cs. Min/max inclusive; guard đơn vị exact. Wire task modes MEASURE_ONLY / CONDITIONAL_FT / NORMAL.

## Thay đổi

- src/api/crewApi.ts: thêm optional rules vào type read DTO, không đổi request hay response runtime.
- src/components/crew/CrewFastTrackMeasurementGuide.tsx: read-only wrapper kiểm assignment/session và API-146, bỏ kết quả stale/unmount; retry chống trùng. Không refetch khi gõ hoặc đổi đơn vị/đóng mở.
- Chính sách phải CONFIGURED, có revision/hash và rules hợp lệ. Không hardcode ngưỡng; thiếu rule/source hoặc chính sách không dùng được thì hiện chưa xác định.
- Khung vàng nhạt, MaterialIcons, 48dp touch target; mặc định một hàng tiêu đề + khoảng đo + chevron, căn giữa theo chiều dọc. Bấm mở xem thông điệp đối chiếu, nguồn policy và nhắc giữ số đo thực tế. CrewMotion press feedback/content transition dùng Reduce Motion sẵn có; không animation liên tục.
- Quy đổi mm/cm/m chỉ cho khoảng tham chiếu hiển thị, dịch chữ số thập phân để tránh sai số nhân/chia floating point. Giữ nguyên số đo/đơn vị input và guard BE. Mở rộng ghi chính sách gốc khi khác đơn vị, cảnh báo exact unit mismatch. Theo owner, lời giải thích và cảnh báo đối chiếu nằm trong phần mở rộng khi có khoảng đo.
- app/(crew)/field-review.tsx: chỉ import + JSX guide trong editor đang mở của task đã verify mode CONDITIONAL_FT, normalMeasurement và không read-only. Không hiện cho MEASURE_ONLY/NORMAL, supplement hoặc repair claim. Không thay handler, navigation, save, assessment/start/finish/upload/journal/CTA.
- Tests: component policy/unit/session/retry/accordion và integration kiểm mode, truyền đúng task/project, giữ giá trị khi lưu nháp.

## HTTP_VERIFIED — read only

- Android Expo Go, actor REPAIR_CREW, sandbox SUA-NHANH-MOI-05.
- project 72f84201-c001-4000-8000-000000000001; task 3f261a8d-209f-49ce-948d-de1041f61458.
- package d3ab9b56-29f1-40cc-8c8c-4886c2c48f38; item 541797da-bb33-4397-a265-2dfeedde2bda.
- Wrapper GET task → GET /projects/{projectId}/repair-packages/{packageId}/items/{itemId}/eligibility → GET task: HTTP 200 quan sát qua Metro.
- Policy revision ef8d6335-8517-48c9-ac0e-60d307b338e4, CONFIGURED, DepressionDepth cm minimum 0 maximum 10; content hash db2e483fe60ca1a9c13a2913333da1e2c7e9f5f322a3c364222f9c0978c26436.
- Không POST/seed/start/finish/assessment trong checkpoint này. Không dùng eligible=true để báo UI thành công.

## Android và ảnh

Pixel_6_Pro / emulator-5554, 1440x3120, Expo Go; normal navigation và Fast Refresh, không restart/reload app/emulator hay xóa cache.

Artifacts tại .cache/crew-measurement-policy-20261119/ (untracked, không commit binary):

- before.png: editor trước tích hợp, có input 33 cm chưa lưu được quan sát trong lúc người dùng tương tác. Sau Fast Refresh tải lại nháp đã có 2 cm. Đây không phải phép so sánh giá trị input bất biến; thay đổi UI không tự chuyển 33 thành 2.
- after.png: bản panel đầy đủ trước owner yêu cầu thu gọn.
- unit-mismatch.png / out-of-range.png: 2 mm lệch policy cm; 23 cm vượt khoảng. Sau thử đã khôi phục 2 cm, không gửi đánh giá.
- final-cm.png: panel một hàng căn giữa, 0–10 cm, không có dòng giải thích khi đóng. Đã xem ảnh trực tiếp.
- final-mm.png: chọn mm hiển thị 0–100 mm, input vẫn 2.
- final-m.png: chọn m hiển thị 0–0,1 m, input vẫn 2.
- final-expanded.png: bấm mở hiện cảnh báo policy dùng cm và ngưỡng gốc 0–10 cm. Hierarchy native xác nhận nội dung và mở/đóng. Kết thúc khôi phục input 2 cm và đóng panel.
- Native đã kiểm mở editor, đổi đơn vị, đóng/mở panel, keyboard và quay lại editor; chỉ chứng minh UI/read trong fixture này, không phải full start/finish ANDROID_E2E_VERIFIED.
- Metro error summary cuối: No items. Không kết luận mọi warning toàn app đã hết.

## Verification thực chạy

- TDD: 15 ca policy fail trước component; integration fail trước JSX; accordion fail trước nút đóng/mở (accordion-red.log).
- LOGIC_TESTED: node --test tests/crew-measurement-policy-guide.test.cjs tests/crew-field-instrument-edit.test.cjs tests/crew-fasttrack-eligibility-read.test.cjs — PASS 38/38 (targeted.log).
- node --test tests/*.test.cjs — PASS 1886/1886, 0 fail/cancel/skip; 119569.9082ms (full-final.log). Sau đó chỉnh thuần style căn giữa; targeted 38/38 chạy lại PASS.
- npx tsc --noEmit — exit 0. Thay đổi sau typecheck chỉ style căn giữa, không đổi type.
- git diff --check và staged diff check — PASS; warning LF→CRLF là thông báo Git, không lỗi whitespace.
- Changed component/test scan không có Ionicons, secret literals, chi phí, LiDAR/asphalt. API type và screen diff được rà soát: không sửa handler/command hoặc mutation authority.
- NOT_RUN native: offline/revoked policy/session switch, Reduce Motion OS toggle, font scaling cực lớn, task Area thứ hai, full start/finish/upload. Các nhánh policy/session/retry/mode được kiểm bằng test harness, không thay native proof.
- FPS chưa đo; không tuyên bố 60 FPS. Không quay video.

## Commits

- d33bb60: read-only policy component, additive DTO typing và tests.
- 2c07ef7: accordion gọn, căn giữa và khoảng tham chiếu theo đơn vị, tests.
- Checkpoint tích hợp screen/tests/worklog được commit local riêng sau các gate trên; SHA tra git log theo subject feat(crew): show measurement policy guide in conditional task editors.

Không sửa BE, threshold, số đo thực, navigation hoặc workflow. Các artifact untracked cũ được bảo toàn.

## Checkpoint: chỉ hiện hướng dẫn cho số đo có rule (owner yêu cầu tiếp nối)

- Mode IMPLEMENT_AND_SELF_REVIEW; base main 793b61e; fetch origin/main trước edit, không tracked WIP. Remote vẫn 0206b84; không push/đổi branch.
- Sửa đúng CrewFastTrackMeasurementGuide.tsx: chỉ khi policy CONFIGURED, revision/hash/source và toàn bộ rules hợp lệ nhưng không có code tương ứng mới trả notApplicable và ẩn panel. Không dùng label Bổ sung hay hardcode danh sách loại đo để quyết định ẩn. Policy thiếu/hỏng/revoked và lỗi đọc vẫn có thông báo + retry; không biến unknown thành không áp dụng.
- Không sửa API, giá trị/đơn vị input, save/assessment/start/finish, navigation hay authority. Tests chứng minh Area có rule vẫn hiện khoảng riêng, cả năm loại không có rule đều ẩn, chuyển lại loại có rule hiện đúng, không đọc lại khi đổi loại.
- TDD: red.log 17 pass/2 fail trước sửa; targeted 40/40 PASS; full regression 1888/1888 PASS, 0 fail/cancel/skip, 125168.4067ms. npx tsc --noEmit exit 0; git diff --check PASS. Logs tại .cache/crew-policy-optional-20261119/.
- Android Pixel_6_Pro: mở trực tiếp năm editor Độ chênh tấm, Diện tích hư hại, Kích thước xói lở, Chiều dài/Chiều rộng chỗ lõm trên fixture SUA-NHANH-MOI-05; hierarchy xác nhận phần nhập vẫn có và panel không hiện sau đọc. Quay lại Độ sâu: 2 cm và ngưỡng 0–10 cm còn nguyên. Không lưu nháp hay gửi mutation. Những mục thêm trống để kiểm tra được bỏ qua nút có sẵn; không sửa nháp đã lưu.
- before.png và after.png: Độ chênh tấm trước/sau, đã xem ảnh. Before dùng mm, sau thêm lại editor mặc định cm sau Fast Refresh; không phải bằng chứng đổi input/unit bất biến. retained-depth.png ghi ngưỡng thật còn hiện. Fast Refresh làm editor quay về hồ sơ theo state hiện tại; không restart/reload thủ công app/emulator.
- NOT_RUN native: offline/revoked/malformed policy/session switch, task thứ hai có Area rule, full start/finish/upload. Các nhánh lỗi/rule/session được kiểm bằng harness; không nhận là Android E2E toàn workflow. Không thêm motion mới, giữ CrewMotion/Reduce Motion hiện có; FPS chưa đo.
- Self-review diff: chỉ component trình bày, targeted test và worklog; giữ MaterialIcons, không secret literal, không chi phí/định mức. Git artifacts/untracked cũ được giữ nguyên.
