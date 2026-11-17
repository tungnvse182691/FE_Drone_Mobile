# Crew Home — UI, motion và nghiên cứu thiết kế

- Ngày: 18/11/2026 (UTC+7).
- Người thực hiện: Codex. Mode: IMPLEMENT_AND_SELF_REVIEW.
- Base SHA: b0859f183427f9167d001575eb5b7783fd408fd6, branch main.
- Phạm vi: một batch Home, thuần trình bày và phản hồi tương tác. Chưa nghiệm thu toàn bộ Crew.
- Không đổi BE, API, DTO, eligibility, assessment, start/finish, media, journal, retry hoặc quyền. Không thêm dependency/config. Không push.

## 1. Baseline và quyết định

Ảnh Android thật: [trước](../../../.cache/crew-uiux-motion-20261118/home-before.png), [sau mới nhất](../../../.cache/crew-uiux-motion-20261118/home-final.png), [danh sách có màu chế độ/trạng thái](../../../.cache/crew-uiux-motion-20261118/home-after-colors.png).

| Vấn đề nhìn thấy ở baseline | Thay đổi trong batch |
|---|---|
| Viền vàng xuất hiện trên KPI, badge và mọi task, làm chúng có trọng lượng gần nhau | Viền trung tính cho nội dung; màu theo ý nghĩa công việc |
| Hai KPI cùng nền trắng, phải đọc số/chữ mới phân biệt | Chưa hoàn thành nền hổ phách; hoàn thành nền xanh lá |
| Chữ trắng trên CTA vàng khó đọc | Chữ/icon tối trên vàng thương hiệu |
| CTA nhận việc cũng dùng vàng, khó phân biệt với CTA chụp ảnh | Nút phụ nền xanh dương, chữ xanh đậm; pressed state riêng |
| Badge thiếu mã nhân viên quá nổi, cạnh tranh với tên | Giảm nhấn bằng màu trung tính, cho phép wrap |
| Chip chỉ đo kiểm chữ cam nhạt; dấu chấm không mô tả loại việc | Chip xanh dương + icon thước; sửa có điều kiện xanh ngọc + icon dụng cụ; giữ label thực |
| Task chưa hiển thị trạng thái rõ trên Home | Tái dùng CrewTaskStatus đang có, đọc status thật và crewStatusLabel |
| Chỉ đổi màu khi nhấn; chưa có chuyển tiếp dữ liệu | Thêm press scale và chuyển tiếp ngắn cho nội dung đọc thật |

Sau phản hồi owner về màu và motion, palette được tách rõ hơn; press scale tăng từ 0.985 lên 0.96. Không tái cấu trúc navigation hoặc sắp xếp lại luồng nghiệp vụ.

### Hệ thống nhỏ áp dụng

- Giữ Roboto; tên 22/28, title 16/22.4, body 14/21, chip 12/18. Không đổi font toàn app.
- Spacing 4/8/16/24 từ tokens; card radius 12, elevation 0, nền trung tính.
- Vàng #C9A227 cho CTA chính; xanh dương cho tác vụ phụ/đo kiểm; xanh ngọc cho chế độ sửa có điều kiện. Màu chế độ không có nghĩa đủ eligibility.
- Label + icon luôn đi cùng màu; không dùng màu làm kênh thông tin duy nhất.
- CTA minHeight 52; giữ font scaling mặc định, flexShrink/wrap ở phần chỉnh. Native large-font vẫn chưa kiểm chứng.
- Không thêm ảnh trang trí, gradient, số thứ tự giả hoặc card mới chỉ để lấp chỗ trống.

## 2. Nghiên cứu và cách đánh giá

Đọc nguồn công khai, không cài skill/repo hay sao chép template:

- [Material 3 color roles](https://m3.material.io/styles/color/the-color-system/): phân cấp action/surface và ghép màu chữ với nền. Áp dụng một CTA chính, tonal secondary và neutral surfaces.
- [Material motion](https://m3.material.io/styles/motion): motion phục vụ tương tác. Thời lượng trong batch là lựa chọn cục bộ với stack hiện tại, không tuyên bố tuân thủ chính xác hệ physics M3 Expressive.
- [Apple HIG motion](https://developer.apple.com/design/human-interface-guidelines/motion): phản hồi ngắn, có mục đích và tôn trọng accessibility; Android vẫn là chuẩn chính.
- [Paper Button](https://oss.callstack.com/react-native-paper/docs/components/Button/Button): contained/tonal theo mức nhấn, loading/disabled tách biệt; [Card source](https://github.com/callstack/react-native-paper/blob/main/src/components/Card/Card.tsx): phân biệt contained/outlined/elevated. Chỉ tham khảo pattern, không cài Paper.
- [Anthropic frontend-design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): thiết kế từ ngành/người dùng thực, cấu trúc có ý nghĩa và tự critique qua screenshot. Đây là tài liệu tham khảo, không thay AGENTS hay font bắt buộc. Không bê nguyên phong cách web sang native.
- [Laws of UX](https://lawsofux.com/laws/): vùng chạm, nhóm thông tin và giảm lựa chọn cạnh tranh.
- [Figma mobile kits](https://www.figma.com/templates/mobile-ui-kit/): đọc trang công khai về hệ component; không nhập kit/file.
- [Mobbin](https://mobbin.com/): chỉ xem trang công khai, chưa xem thư viện sau đăng nhập. [Page Flows](https://pageflows.com/): bị 403; không nhận đã học pattern bên trong.

Checklist review riêng cho Crew hiện trường:

1. Nhìn nhanh có biết tác vụ chính và bước kế tiếp không?
2. Có phân biệt chế độ công việc với trạng thái xử lý qua chữ/icon không?
3. Có đọc được hạn, vị trí và trạng thái mà không mở sâu không?
4. CTA có tên mô tả hành động và vùng chạm đủ lớn không?
5. Khi chờ/lỗi/offline, UI có giữ đúng dữ liệu và hướng xử lý hiện hành không?
6. Motion có trả lời thao tác vừa làm, tắt được theo OS và không trì hoãn API không?
7. Mỗi màu/viền/card có chức năng cụ thể không? Nếu bỏ đi không mất thông tin thì cần cân nhắc bỏ.

Giới hạn còn thấy: hero/KPI chiếm nhiều diện tích; chỉ một phần task đầu hiện trên viewport. Muốn đưa danh sách lên cao cần proposal trước/sau và owner duyệt vì thay đổi layout lớn. Không tự thay đổi trong batch này.

## 3. Motion thực tế

- Ba nút Home: thu 0.96 trong 100ms, trở lại 1 trong 180ms; original onPress chạy như cũ.
- Task card: native Android ripple, không listener Reduce Motion trên từng row.
- Nội dung danh sách khi query có dữ liệu/revision thật: opacity 0.45 → 1, translateY 10 → 0 trong 240ms; không remount children.
- Hai skeleton tĩnh chỉ khi query thật đang pending lần đầu và chưa có task. Không shimmer/animation lặp gây tốn pin.
- Reduce Motion mặc định bảo thủ, đọc OS và nghe thay đổi trực tiếp; cancel/reset khi disable/unmount. Không có animation thành công giả.
- Không thêm accordion hoặc navigation transition. Hiệu ứng chuyển trang thấy trong video là navigation sẵn có.

[Video Android đầy đủ](../../../.cache/crew-uiux-motion-20261118/home-motion-verified.mp4), [đoạn bấm/quay lại](../../../.cache/crew-uiux-motion-20261118/home-motion-demo.mp4), [frames press](../../../.cache/crew-uiux-motion-20261118/press-frames.png).

Video có pressed color và scale nhẹ ở nút nhận việc, mở trang nhận việc, Back về Home rồi refetch. Có transition nội dung khi đọc lại. Không dùng frame rate của file video để kết luận FPS của app.

## 4. Files changed

- app/(crew)/home.tsx: presentation, status component, pending placeholders, motion wrappers.
- src/components/crew/CrewMotion.tsx: opt-in Crew press/content motion và live accessibility preference.
- src/components/crew/crewHomeTones.ts: helper chỉ màu/icon, không cấp authority.
- tests/crew-home-motion.test.cjs: accessibility, disabled/callback forwarding, concrete native styles, real revisions, màu/contrast, navigation identity và pending/error.
- tests/crew-c2-home-layout.test.cjs: mocks cho components tái dùng.
- Worklog này: evidence, research, giới hạn.

## 5. Verification

| Gate | Kết quả và giới hạn |
|---|---|
| npx tsc --noEmit | PASS, exit 0 |
| node --test tests/crew-home-motion.test.cjs tests/crew-c2-home-layout.test.cjs tests/crew-polish-layout.test.cjs | 13 PASS |
| node --test tests/*.test.cjs | 1836 PASS, 0 fail/skip; log .cache/crew-uiux-motion-20261118/regression-final.log |
| git diff --check | PASS; chỉ cảnh báo LF/CRLF |
| MaterialIcons | Không có Ionicons trong app/src |
| UD-06, changed-file secret scan | Không match ở changed source/tests |
| Routes / API | Giữ group prefix, params, project/version gating; không thêm mutation/caller API |
| Android Home → Tasks → Back | Đã thao tác thật |
| Android Home → task detail → Back | Đã mở task Submitted sẵn có, không mutation |
| Android Home → receiving → Back | Đã thao tác thật, không nhận việc/ACK |
| Scroll và refresh | Đã thao tác thật, header/dock còn hiện; refresh chỉ đọc |
| Keyboard / accordion | N/A: Home không có input/accordion |
| Native initial loading, offline/error | NOT_VERIFIED; không đổi network/storage. Logic pending/error có test |
| Native OS Reduce Motion, font scaling | NOT_VERIFIED; listener/race/disabled có logic tests |
| FPS / Android thật | NOT_VERIFIED; không có đo hiệu năng hoặc thiết bị vật lý |
| Release APK / iPhone / Expo Doctor | NOT_RUN; không thay native config/dependency trong batch |
| Upload/SQLite/restart/receipt mutation | NOT_RUN trong batch UI; không nhận full business E2E từ tests Node |

Android evidence giới hạn ở Pixel_6_Pro emulator-5554 Android 14, Expo Go. Không thay thế release APK proof.

### Scoped invariants self-review

MaterialIcons, zero financial presentation, full route group, Crew-only scope, defect catalog unchanged, Hoàng Hải branding, contracts unchanged và existing error component preserved: đạt trong diff. Không tuyên bố toàn app được audit lại qua một batch Home.

Lượt reviewer subagent riêng, AUDIT_READ_ONLY (không sửa file/index): không tìm actionable finding trong scope. Reviewer tự chạy tsc exit 0, hai scoped test files 8/8 PASS và diff check exit 0. Reviewer không thao tác Android; native evidence phía trên do implementer thực hiện, không gán cho review độc lập.

### Self-fix có bằng chứng

Animated Pressable ban đầu nhận style callback làm native mất nền/layout. Đổi sang style array cụ thể, giữ pressed state và callbacks; test concrete pressed styles tái hiện lỗi trước fix, sau fix PASS. Screenshot/video xác nhận nền và layout hiện đúng. Không đổi business để xử lý lỗi hiển thị.

## 6. Bàn giao checkpoint

Implementation local commit: 92cecd9 (feat(crew): clarify home colors and accessible press motion). Báo cáo nghiên cứu/evidence nằm trong commit tài liệu tiếp theo.

Chỉ commit local các file đã liệt kê; giữ nguyên untracked artifacts, database, logs, build outputs và Docker/emulator. Các màn Tasks, detail, field-review, receiving và sync còn cần batch baseline riêng; chưa nhận đã hoàn thành UI toàn Crew.

## 7. Follow-up: phản hồi motion khó nhận thấy

Owner phản hồi dùng app không thấy hiệu ứng. Phạm vi trước chỉ ba nút Home và transition khi query có revision mới; cached navigation không replay. Native ripple của task đặt sau Card nền opaque. Báo cáo trước không đồng nghĩa toàn Crew đã có motion.

Correction chỉ ba file source/test: Home, CrewMotion và crew-home-motion.test.cjs. Một wrapper toàn nội dung Home (header/dock giữ nguyên) replay khi screen focus và read revision; opacity 0.25→1, translateY 18→0 trong 280ms. Không remount children hoặc trì hoãn original onPress. Foreground Android ripple cho ba nút và Home task cards; press scale cũ giữ nguyên. Reduce Motion listener và fail-static còn nguyên. Không sửa route, API caller, guards hay nghiệp vụ.

Hai test mới chạy RED trước implementation (7 pass/2 fail), sau sửa targeted 15/15 PASS. Final source: npx tsc --noEmit exit 0; node --test tests/*.test.cjs 1838 PASS, 0 fail/skip, exit 0 (regression-focus-fix.log); git diff --check exit 0. Remote main vẫn b0859f183427f9167d001575eb5b7783fd408fd6, không push.

Android 14 Pixel_6_Pro / emulator-5554 / Expo Go: Home→Tasks→Home, Home→receiving→Back, chỉ điều hướng/read. Video normal speed home-focus-fix.mp4 có transition khi quay lại Home và khi read revision mới; press-fix-frames.png thấy nền nút nhận việc đậm lên trước navigation. focus-fix-frames.png thấy nội dung Home mờ rồi rõ. Clip home-focus-demo.mp4 là đoạn 11–17 giây của recording, không slow motion. Các artifact nằm tại .cache/crew-uiux-motion-20261118/. Không dùng frame rate recording kết luận FPS ứng dụng.

NOT_VERIFIED: physical Android/FPS/release APK, native offline/error/loading lần đầu, OS Reduce Motion toggle/font scaling. Accordion và motion màn Crew khác chưa triển khai. Screenshot baseline/home-final ở checkpoint trước giữ nguyên; correction không rearrange layout. Reference chính cho foreground ripple: React Native 0.88 Pressable docs, https://github.com/react/react-native-website/blob/main/website/versioned_docs/version-0.88/pressable.md.

## 8. Follow-up: nút Tải thêm mềm hơn

Owner yêu cầu redesign nút Tải thêm. Scope: presentation của CrewInboxState tại app/(crew)/tasks.tsx, dùng chung ở Home/Công việc. Bỏ viền đậm, nền xám xanh nhạt #EDF2F6, bo radius.full, thêm MaterialIcons expand-more. Giữ Button hiện có, 48dp minimum target, pressed background, title, loading/disabled, hasNextPage/error gating và fetchNextPage callback nguyên vẹn. Không sửa shared Button hoặc business/API. Test fixture bổ sung radius token vì test trích riêng hàm render.

Android emulator screenshot trước/sau đã đọc trực tiếp qua mobile_take_screenshot trong phiên; ảnh trước lưu .cache/crew-uiux-motion-20261118/load-more-before.png, ảnh sau hiển thị inline trong tool output (không có file after được lưu). Native xác nhận hình dáng/nền/icon mới tại Home. Không nhận đã test press/loading native trong batch này: sau screenshot, lần inspect kế tiếp thấy danh sách đã tải hết và nút biến mất; không gán thao tác đó cho agent. Không sửa cache để tạo lại trạng thái. Native Tasks visual, font scaling, offline và loading: NOT_VERIFIED.

Verification trên final source: targeted bốn files crew-ui-restore, dot-c-crew-filter, crew-c2-home-layout, crew-home-motion: 29/29 PASS; npx tsc --noEmit exit 0; full regression 1838/1838 PASS, 0 fail/skip, exit 0 (load-more-regression.log, 91495ms); git diff --check PASS. Diff self-review: giữ callback/conditions, không mutation hoặc thay đổi quyền/route. Changed source không thêm Ionicons, tài chính hay secret. Local commit riêng; không push, bảo toàn toàn bộ untracked artifacts.
