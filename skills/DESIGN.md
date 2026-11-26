# RoadGuard — UI/UX rules

Nguồn UI chính. Mọi task sửa hoặc kiểm thử/review UI đọc phần liên quan trước khi làm. Authority/business/security theo `AGENTS.md`; external skills chỉ tư vấn, không cấp quyền đổi API, package, navigation hoặc design tokens.

## 1. Nhận diện và nền tảng

- Bê tông Hoàng Hải; Splash/Loading dùng `assets/logo_hoanghai.png` đầy đủ tên/slogan. Màn nội bộ/AppHeader/login/App Icon dùng `assets/logo_hoanghai_icon.png` chỉ biểu tượng xe bồn, không chữ.
- Android-first, Expo Router hiện hành, shared `AppHeader`/`SafeAreaScreen`/`Card`/`Button`/`BottomNav`/badge. Tái dùng component/variant trước khi tạo mới; không đổi default toàn app để sửa riêng một màn.
- `src/design-tokens.ts` là nguồn màu/typography/spacing/radius. Navy/secondary `#2D3748`, primary gold `#C9A227`, brandGold `#8C6D1F`, primaryDark `#6B5219`; chữ `#1A1D20`, surface trắng, nền `#F8F9FA`, border `#E2E5E9`. Giữ semantic success/warning/error/info hiện hành; không màu tím/Dynamic Color mặc định, gradient hoặc shadow đậm.
- Roboto cho nội dung chức năng, Roboto Medium cho tiêu đề/label/KPI; Sansation chỉ thương hiệu/headline. Theo typography tokens: headline 24, title 20/16, body 16/14, label 14/11, caption 12 với line height hiện có. Không ép font scale hoặc nhồi chữ nhỏ để vừa layout.
- Spacing nền 4/8/16/24/32dp; margin màn và padding card 16dp. Radius mặc định card 12, input/button 8, chip pill; dùng token/component thật, không sao chép một bảng token khác. Scoped owner overrides ở mục 6 có ưu tiên trong đúng màn, không thay token global.
- Chỉ MaterialIcons, không Ionicons/emoji hoặc icon màu tự chế. Icon truyền nghĩa phải có text/accessibility label; icon trang trí không tạo focus thừa.
- UD-06: không tiền/dự toán/chi phí/định mức vật tư; hiển thị phương án kỹ thuật, kích thước thực tế và hạn hoàn thành. Hiển thị defect bằng helper chuẩn, không raw enum.

## 2. Hierarchy, card và mật độ

- Viewport đầu trả lời: đang xử lý việc gì, trạng thái thật, bước tiếp theo. Tách title → thông tin quyết định → metadata; không rải text ngang cấp. Nhóm theo tác vụ, dùng heading/divider và spacing có hệ thống.
- Card cùng loại phải chung radius/padding/header/status placement; chỉ card có nội dung/hành động riêng mới tách. Không bọc mọi dòng thành card, lạm dụng border/shadow hoặc tạo khoảng trống vô ích. Dense row dành cho danh sách, card rộng dành cho quyết định/nhập liệu.
- Ưu tiên thông tin hiện trường cần dùng: vị trí, trạng thái, kích thước, hạn, ảnh và hành động. Metadata kỹ thuật nằm trong disclosure phụ; UUID/ETag/version/JSON/journal/sid/admission/snapshot không thành nội dung chính của người dùng.
- Không thêm KPI, priority, notification dot, progress hay bản đồ/GPS giả. Không giấu chức năng bắt buộc để làm màn gọn hơn. Tính nhất quán giữa role giữ bằng component và hành vi chung, không ép nghiệp vụ khác nhau thành cùng flow.
- Chữ dài có wrap hoặc disclosure rõ; không truncate trạng thái/lý do khóa/lỗi quan trọng. Mã/tên có thể ellipsize nếu có cách xem đầy đủ. Tránh fixed height chứa text động và chuỗi mã đẩy vỡ hàng.

## 3. CTA và hành trình

- Mỗi trạng thái có một hành động chính rõ ràng; tối đa một CTA chính màu gold mỗi màn. Tab active/KPI dùng gold theo tokens. Giữ CTA phụ khi có mục đích nghiệp vụ khác; không hai nút cùng chức năng, không nút không handler hoặc dẫn tới màn không giải quyết được.
- Mỗi CTA phải xác định: authority/precondition → handler → trạng thái đang làm → kết quả hoặc cách phục hồi. Busy guard chặn double tap; disabled có lý do ngắn cạnh nút và bước khắc phục có thật. Không chỉ giảm opacity hay đổi text để che logic sai.
- Giữ chuẩn bị → xác nhận gửi khi workflow yêu cầu; không tự dispatch/replay mutation đã xử lý, không thêm Undo cho mutation server đã commit. Không dùng optimistic success cho gửi/hoàn tất/phê duyệt khi chưa có evidence tương ứng.
- Navigation dùng routes tập trung và full group prefix; back/re-entry không mất form, ảnh hoặc pending command. Tránh vòng Sync → dữ liệu nhiệm vụ → offline → Sync không tạo bước tiến. Thiếu capability phải có điểm dừng với lý do, không CTA hứa gửi được.
- Khi task implement cho phép sửa UI, xử lý UI lỗi/rườm rà trong chính scope; root cause logic trước, rồi trình bày. Không chỉ ghi TODO, không tự redesign toàn app. Audit thực tế và có owner duyệt trước sửa bố cục lớn; triển khai phạm vi nhỏ.

## 4. Copy, trạng thái và offline

- Tiếng Việt ngắn, động từ cụ thể, thuật ngữ người hiện trường hiểu. Label cạnh input, đơn vị cạnh giá trị (m²/cm/m), không dùng placeholder thay label. Error có text + icon, focus field lỗi đầu tiên, giữ dữ liệu đã nhập.
- Tách loading lần đầu, refreshing có stale content, empty, no permission, offline, error và success. Skeleton chỉ lần đầu; refresh không xóa nội dung đã tải. Loading có timeout/error/retry phù hợp; không vô hạn hoặc silent failure. Retry không tự đổi immutable command.
- Upload gộp một vùng tiến độ, không toast mỗi chunk/retry. Hiển thị nguồn ảnh, thời gian/GPS thật, trạng thái local/upload/verification/submission riêng; không tick xanh khi chỉ có local hash hoặc upload 100%.

| Tình huống đã xác minh | Copy phù hợp |
|---|---|
| Draft durable local | Đã lưu trên thiết bị |
| Pending do mạng | Chờ kết nối |
| Bytes đang gửi | Đang tải ảnh |
| Chờ file verification | Đang xác minh |
| Timeout chưa rõ kết quả | Chưa xác nhận được kết quả, đang kiểm tra |
| Cần đối soát | Cần kiểm tra lại |
| Hồ sơ được server nhận đúng contract | Đã gửi hồ sơ |
| PM nghiệm thu có evidence | Đã nghiệm thu |

- Offline badge tác nghiệp hiển thị trạng thái mạng, cache timestamp thật, last API probe và khả năng gửi/queue riêng. Không dùng `navigator.onLine` làm authority, không bịa “Đã tải lúc”; chưa tải phải nói chưa có dữ liệu. API probe thành công không là durable ACK.
- Offline không tự khóa capture/form nếu downloaded capability/policy còn cho phép; cũng không mở quyền từ cached data. Khi thực sự `BLOCKED_CONTRACT`/thiếu provider/fixture, khóa action tương ứng và giải thích; không giữ blocker lịch sử nếu capability hiện tại đã thay đổi và được verify.
- FastTrack chip: “Đo & Sửa nhanh” xanh nhạt `#E9F7EC`/success, “Chỉ đo đợt” nền `#F1F3F5`/secondary; chữ thuần, không emoji. “Đạt Policy Sửa Nhanh” chỉ sau API-146 + bootstrap/preconditions thật; chưa đạt hiển thị lý do/chuyển PM theo workflow. Đủ số đo local chỉ là “Đã nhập dữ liệu”.
- Reporter timeline theo trạng thái thực: gửi → tiếp nhận → khảo sát/đo → sửa → nghiệm thu; không tự đánh dấu bước. Rating 1–5 sao (32dp, vùng chạm đủ), góp ý ngắn. OTP 6 ô 44×48dp, hỗ trợ focus/paste; resend theo guard/cooldown contract (mẫu 60s không tự override server).

`LOCAL_SAVED ≠ SENT ≠ FILE_VERIFIED ≠ WORK_FINISHED ≠ PM_ACCEPTED ≠ PUBLISHED`.

## 5. Android, accessibility và motion

- Safe area theo thiết bị, status/navigation bar không che nội dung/CTA. Kiểm màn nhỏ, landscape/cửa sổ thay đổi và font scaling tối thiểu 1.15; layout co giãn/wrap, scroll được nội dung dài, không khóa font scaling. Không kéo dãn card trống chỉ để lấp màn.
- Keyboard không che input/lỗi/CTA; dùng tránh bàn phím và scroll tới field focus. Giữ form khi picker chọn/cancel, blur/focus, back, unmount/restart và scope đổi theo policy. Không để kết quả picker phiên cũ ghi vào form/actor mới.
- Touch target tối thiểu 48×48dp kể cả icon/rating, khoảng cách tránh bấm nhầm. Text contrast WCAG AA; trạng thái không chỉ dựa vào màu, có nhãn/icon. Thứ tự screen reader có nghĩa, label/role/busy/disabled phù hợp.
- Motion chỉ giải thích thay đổi trạng thái hoặc phản hồi thao tác: ngắn, không cản đọc/chạm, không shimmer/loop trang trí. Tôn trọng Reduce Motion; giảm/tắt chuyển động không thiết yếu, giữ phản hồi bằng text/icon/state. Không kéo mutation theo thời điểm animation kết thúc; tránh animation làm render/list chậm.
- Mọi checkpoint đổi UI: kiểm Android thực, từng CTA, loading/empty/error/offline, navigation/back, keyboard/scroll/safe area, font overflow/scaling và không mất dữ liệu; screenshot trước/sau. Không bắt buộc video. JSX/component/Node test không thay Android acceptance; chưa chạy ghi `NOT_RUN`.

## 6. Scoped owner decisions còn hiệu lực

### Operator OP-UI-05 — owner 04/11/2026

Chỉ Home/Requests (Phase 1):

- Main card radius 20dp, dense row 12dp; margin/padding 16, gap card 12, section 24, internal 4/8/16. Không đổi token/default Card/Chip/Button.
- KPI Roboto Medium 28sp/500 tabular; Sansation chỉ thương hiệu. Surface trắng, nền/border/text theo mục 1. Gold CTA chữ tối `#1A1D20` (override có scope cho `onPrimary` mặc định).
- Shadow tối đa opacity .08/radius 18/elevation 3; không tint vàng/gradient/shimmer. MaterialIcons, touch 48dp, font scale 1.15.
- Home/Requests dùng chung task row, status API thật; không suy priority/current task. Header compact Operator không notification dot/thông báo hệ thống giả.

### Operator OP-UI-06 — owner 05/11/2026

Chỉ Detail, Gói công việc, shared task row Home/Requests; Upload chỉ evidence row/lý do khóa nộp. Không đổi KPI/filter/API/quyền/flow xác nhận lệnh:

- Rail trái 4dp: mới/giao lại/cần bổ sung/tạm hoãn → warning; đã nhận/đang làm → brandGold; hoàn tất → success; từ chối/hủy → error; đã nộp/unknown → secondary. Không suy ưu tiên/current task.
- Chip riêng Operator pastel theo status, dot 6dp + MaterialIcon + nhãn Việt; chữ primaryDark trên pastel cam, secondary trên xanh/đỏ/xám, đạt AA. Không đổi shared variant.
- Card chính 20/dense 12, padding/margin 16/gap 12; header icon vàng 16dp + title + mã 8 ký tự. Hero rail vàng chỉ mới/giao lại/cần bổ sung.
- Nhóm IN HOA, divider mảnh, info row icon vàng + giá trị Roboto Medium. UUID/version trong kỹ thuật đóng/mở; tọa độ 6 số thập phân + B/N/Đ/T theo dấu thật.
- CTA inline cao ≥52dp/radius 12/gold chữ neutral; khi có secondary tỷ lệ 1:2. Disabled opacity .5 + hộp lý do/icon thông tin. Giữ chuẩn bị → xác nhận; không tự gửi lại journal.
- Evidence chưa preview: placeholder dashed cao 150dp; tag nguồn/tên/time/GPS thật. Local hash không là VERIFIED. DTO gói công việc tại quyết định này không có file/dataset: không dựng hàng giả/gọi thêm API; chỉ thay khi current contract và scope cho phép.
- Gói công việc read-only, phạm vi đã pin nằm viewport đầu; chỉ đếm phân đoạn của ref đang xem. Upload giữ `DRONE_DATASET_BLOCK_REASON` khi capability/guard tương ứng còn thiếu; muốn mở cần verify source và authority, không tự bỏ guard.
- Không FAB/map/GPS/demo giả/đổi token default hoặc tác động Crew/Reporter. Keyboard Android và UUID upload ở Log không nằm trong nghiệm thu OP-UI-06; vẫn áp dụng gate khi task mới chạm các phần đó.

## 7. Đọc chuyên môn đúng phạm vi

UI implement/review dùng `.agents/skills/mobile-design/SKILL.md`, chỉ references đúng vấn đề. Performance/list/render/animation/native dùng Vercel rule phù hợp, không compiled AGENTS/all rules mặc định. Expo `building-native-ui` và animation reference dùng khi cần. Redesign skill explicit owner only, mặc định read-only audit. Quyền nghiệp vụ/journal/draft/upload/idempotency không thay đổi chỉ để làm UI gọn.
