# Báo cáo tổng hợp Crew UI/UX và Motion — RoadGuard

- Ngày tổng hợp: **19/11/2026, múi giờ Asia/Saigon**.
- Người tổng hợp: Codex; chế độ tổng hợp tài liệu và tự kiểm chứng, không phải review độc lập.
- Repo: `D:/Do_AN_Drone/FE_AppMobile`; nhánh làm việc: **main**.
- Mốc source cuối của phần UI trong báo cáo: **b48007d**.
- Nguồn đối chiếu: Git history, source hiện hành và [worklog chi tiết](D:/Do_AN_Drone/FE_AppMobile/docs/worklogs/2026-11-18-crew-uiux-checkpoint.md).
- Phạm vi chính: Trang chủ → Công việc → Đồng bộ → Hồ sơ, bao gồm các lượt chỉnh theo ảnh và phản hồi của anh Tùng. Các màn đã chỉnh ở đợt trước được ghi riêng ở mục 7.
- Báo cáo này chỉ thêm tài liệu; không sửa code ứng dụng, BE hoặc dữ liệu.

## 1. Hướng UI chủ dự án đã làm rõ

Yêu cầu xuyên suốt là **nội dung có tổ chức, chữ tập trung thành cụm, vùng thao tác dễ nhận ra và các màn nhất quán**. Tối giản vẫn phải đủ thông tin và có điểm tựa thị giác; không để màn hình thành những dòng chữ rời rạc giữa khoảng trắng.

| Mong muốn của anh Tùng | Cách áp dụng cho các lần làm tiếp |
|---|---|
| Chữ không nằm rải rác khắp màn | Gom nội dung cùng chủ đề thành một section; nhãn, giá trị, thời gian và hành động liên quan đặt gần nhau |
| Khung nhiệm vụ không trống, không quá sơ sài | Tách rõ tiêu đề, nội dung và vùng thao tác bằng khoảng cách, nền nhẹ hoặc đường phân cách; tránh thêm nhiều lớp card |
| Các màn giống cùng một sản phẩm | Dùng cùng nhịp chữ, khoảng cách, bo góc, chip và cách thể hiện nút; Trang chủ là điểm tham chiếu của đợt này |
| Chữ không quá to hoặc đen đậm | Chỉ nhấn tiêu đề/ID cần đọc nhanh; thông tin phụ nhỏ hơn, màu dịu hơn nhưng vẫn đọc được |
| Màu sắc giúp phân biệt | Nền trung tính cho nội dung; vàng kem nhẹ cho các nút đã được yêu cầu; vàng thương hiệu dùng có tiết chế |
| Không tím lòe loẹt, không màu nào cũng giống nhau | Không đưa tím/gradient vào hướng thiết kế; phân biệt nội dung, trạng thái và hành động bằng vai trò cụ thể |
| Bấm phải cảm nhận được | Giữ ripple, thu nhẹ khi nhấn và trả về mềm ở các control đã tích hợp; không chờ animation mới chạy handler |
| Không mang cảm giác UI AI dập khuôn | Thiết kế theo dữ liệu và thao tác Crew thực tế; không thêm KPI giả, icon vô nghĩa, banner trang trí hoặc nội dung mẫu |

Đây là định hướng đã hiểu từ phản hồi của chủ dự án, chưa phải tuyên bố rằng mọi màn Crew đã đạt yêu cầu. Khi mở màn tiếp theo vẫn phải xem UI thật, đối chiếu dữ liệu và xin duyệt nếu thay đổi lớn về bố cục/luồng.

## 2. Trang chủ — những gì đã chỉnh

Source chính: [home.tsx](D:/Do_AN_Drone/FE_AppMobile/app/(crew)/home.tsx), [CrewHomeTaskPressable.tsx](D:/Do_AN_Drone/FE_AppMobile/src/components/crew/CrewHomeTaskPressable.tsx). Khung danh sách dùng chung nằm trong [tasks.tsx](D:/Do_AN_Drone/FE_AppMobile/app/(crew)/tasks.tsx).

### Cụm đầu trang, thống kê và hành động

- Điều chỉnh thứ bậc lời chào, thông tin phụ, ô thống kê và nút hành động; giảm cảm giác mọi thành phần cùng đậm/nổi như nhau.
- Ô thống kê nền trắng, điểm nhấn tiết chế; theo phản hồi “hai ô hơi nhỏ” đã tăng chiều cao tối thiểu lên 112dp, padding dọc 20dp, số 28/34.
- Lời chào 20/26, nhãn thống kê 13/18; không thay công thức hoặc nguồn dữ liệu thống kê.
- Nút chụp/ghi nhận giữ vai trò chính bằng màu vàng; nút tiếp nhận dùng xử lý trung tính có viền. Không đổi đích điều hướng hay handler.

### Thẻ nhiệm vụ

- Khoảng cách giữa các thẻ 12dp, bo góc 12dp; tên nhiệm vụ 16/22 dễ đọc, metadata nhẹ hơn.
- Cho tên nhiệm vụ và thông tin tuyến/vị trí xuống dòng để không mất thông tin vì giới hạn dòng trình bày.
- Mỗi thẻ giữ trật tự: chế độ + hạn → tên → vị trí → trạng thái, mã nhiệm vụ và Chi tiết.
- ID/mã WO có nền trung tính nhẹ và padding riêng để nhận ra nhanh; không đổi nội dung định danh từ dữ liệu.
- Thẻ có phản hồi nhấn mềm theo yêu cầu “bong bóng”: thu nhẹ rồi bật về; mô tả kỹ thuật ở mục 6.

### Khung “Nhiệm vụ được giao” và Tải thêm

- Home và Công việc dùng chung một khung trình bày: vùng tiêu đề nền ấm rất nhạt `#FBF8EE`, đường phân cách `#E9E1CC`.
- Tiêu đề 16/22, metadata 12/18; nút Tải lại có viền, vùng chạm tối thiểu 48dp.
- Thời gian cập nhật và Tải thêm gom vào footer, cho xuống dòng khi thiếu chỗ.
- Tải thêm đã qua lượt chỉnh từ nút lớn sang nút gọn có viền; bản khung cuối dùng chiều rộng tối thiểu 132dp, chiều cao chạm tối thiểu 48dp.
- Giữ nguyên điều kiện có trang tiếp theo, loading, disabled, callback và dữ liệu. Không thêm số tổng giả.

Commit: `8ba570b`, `cb3a06f`, `a6a79bb`, `baf87ee`; phần ID/chung với Tasks: `0b660ad`; khung danh sách cuối: `6a93b82`.

## 3. Công việc — đồng bộ với Trang chủ

Source: [tasks.tsx](D:/Do_AN_Drone/FE_AppMobile/app/(crew)/tasks.tsx).

- Chỉnh chữ, khoảng cách và cách xử lý thẻ theo Home: tên 16/22, thông tin phụ nhỏ hơn, nhịp thẻ 12dp.
- Trạng thái tab được chọn và viền bộ lọc dịu, rõ; bỏ cảm giác nhiều vùng màu đậm tranh nhau thu hút.
- Thẻ dùng lại phản hồi nhấn của Home, giữ đúng callback/disabled/params.
- Mã nhiệm vụ được làm rõ bằng nhãn nền trung tính, tách với ngày/thời gian.
- Nhận cùng khung Nhiệm vụ được giao, nút Tải lại và footer Tải thêm như mô tả ở mục 2.
- Không sửa bộ lọc, phân trang, thứ tự dữ liệu, điều kiện mở nhiệm vụ hoặc API.

Android đã thử: tab hoàn thành, bộ lọc chỉ đo, quay lại danh sách đang làm, cuộn, nhấn thẻ vào chi tiết rồi Back; trạng thái bộ lọc được giữ. Đã quan sát Tải thêm busy/disabled và dữ liệu cũ còn hiển thị. **Chưa xác minh nhân quả một lần bấm Tải thêm tạo ra trang dữ liệu mới thành công qua HTTP thực.**

Commit chính của đợt tiếp tục: `0b660ad`, `6a93b82`. Các lượt nền trước đó: `d464c59`, `abc1257`, `e690db1`.

## 4. Đồng bộ — gom hồ sơ, bằng chứng và hành động

Source: [sync.tsx](D:/Do_AN_Drone/FE_AppMobile/app/(crew)/sync.tsx), [CrewLocalDraftPanel.tsx](D:/Do_AN_Drone/FE_AppMobile/src/components/crew/CrewLocalDraftPanel.tsx), [CrewOfflinePanel.tsx](D:/Do_AN_Drone/FE_AppMobile/src/components/crew/CrewOfflinePanel.tsx).

### Hồ sơ trên thiết bị

- ID nhiệm vụ thành nhãn rõ hơn: chữ 14/20, nền trung tính nhẹ, padding 6/8.
- Số đo và ảnh chia thành hai cụm có icon có ý nghĩa; thời gian có icon đồng hồ.
- Thông tin “Nháp chưa gửi”, “Có lịch sử gửi…” hoặc “Nháp từ lần đăng nhập trước” nằm trong vùng nền trung tính; giữ nguyên điều kiện và nội dung thật.
- Mở hồ sơ có viền, vùng chạm tối thiểu 48dp, căn về vùng hành động; nút Xem thêm/Thu gọn có label rõ.
- Theo yêu cầu mới nhất, **Mở hồ sơ và Xem thêm nhiệm vụ có nền vàng kem `#FBF8EE` giống Tải lại**. Nền khi nhấn của Xem thêm là `#F3ECD6`; chữ vẫn tối và viền vẫn rõ.
- Không đổi route `/(crew)/field-review`, projectId/taskId, guard danh tính hoặc số bản lưu.
- Đánh đổi đã ghi nhận: các hàng thoáng và rõ hơn nên phần đầu màn hiển thị khoảng hai hồ sơ thay vì ba; nội dung còn lại vẫn cuộn được, không bị bỏ đi.

### Tải lại và loading

- Thay nút icon đơn lẻ bằng khung có icon + chữ “Tải lại”, tối thiểu rộng 124dp và cao 48dp.
- Khi trạng thái đọc thật đang chạy, label thành “Đang đọc…”, giữ khóa bấm/busy hiện có.
- Nút nền vàng kem; icon/spinner dùng token vàng thương hiệu hiện có; nền nhấn `#F3ECD6`.
- Loading của hồ sơ cục bộ có thông báo trong khung nền ấm: “Đang đọc hồ sơ trên thiết bị…”, thay cho spinner đứng riêng cạnh tiêu đề.
- Dữ liệu cũ vẫn được giữ trong lúc đọc. Không thêm thời gian chờ giả, không tạo loading giả, không hiển thị thành công theo animation.

### Hàng đợi và chi tiết kỹ thuật

- Số thống kê hàng đợi 28/34, chữ số tabular và khoảng thở rõ hơn.
- Nút mở chi tiết kỹ thuật/đọc nhật ký có vùng thao tác rõ, dùng phản hồi CrewPressable hiện có ở các control đã tích hợp.
- Bỏ phát lại hiệu ứng cả trang mỗi lần focus về Sync.
- Không sửa trạng thái journal, gửi/đối soát, retry, idempotency, upload hoặc cách tính receipt.

Android đã thử: cuộn, mở/thu danh sách, thấy nhiệm vụ thứ tư; mở hồ sơ `9b840ab7`, sau đó `6b12946c`, rồi Back quay về Sync; mở phần kỹ thuật và quan sát nội dung. Không gửi/đối soát hoặc sửa hồ sơ để kiểm UI.

Commit: `4675045` → `914574a` → `b48007d`; lượt nền trước: `c446548`.

## 5. Hồ sơ — thống kê và cài đặt dễ quét

Source: [profile.tsx](D:/Do_AN_Drone/FE_AppMobile/app/(crew)/profile.tsx).

- Nhãn thống kê dùng chữ thường đầu câu, Roboto regular 12/18, cho xuống dòng; số 28/34 thẳng hàng.
- Badge vai trò trung tính; tiêu đề phần cài đặt 13/18.
- Hàng cài đặt tối thiểu 64dp, bo góc 8dp; giữ phản hồi nhấn sẵn có.
- Bỏ phát lại hiệu ứng cả trang khi quay về để tránh chuyển động thừa.
- Giữ nguyên danh tính, công thức thống kê, nhắc giới hạn dữ liệu và hành động/route.

Android đã thử: xem đầu trang, cuộn cài đặt, mở thông tin cá nhân và đóng bằng OK, vào đổi mật khẩu rồi quay lại, mở trợ giúp, đi tới Đồng bộ qua cài đặt rồi Android Back. Form đổi mật khẩu để trống, không submit; không logout. Android Back không đóng Alert thông tin cá nhân trong lần thử, nút OK đóng được.

Commit: `1e69c1a`; lượt nền trước: `134a062`.

## 6. Motion thực tế đã có và giới hạn

| Thành phần | Hiệu ứng thực tế | Giới hạn |
|---|---|---|
| Thẻ nhiệm vụ Home/Tasks | Nhấn thu scale 0.97 trong 80ms; thả bật về bằng spring stiffness 260, damping 16, mass 0.6; ripple Android | Handler chạy theo Pressable hiện có, không đợi spring; không phóng to liên tục |
| Control dùng CrewPressable | Thu 0.96 trong 100ms, trả về 180ms, ripple Android | Chỉ các control đã bọc helper; không suy mọi nút đều có spring |
| Nội dung dùng CrewContentTransition | Fade/translate ngắn 280ms khi ready theo caller | Không remount dữ liệu; Home không phát lại theo focus/revision; Sync/Profile bỏ replayOnFocus |
| Tải lại Sync | Đổi icon/spinner và label theo trạng thái đọc thật; nền phản hồi nhấn | Không phải animation báo hoàn tất hoặc ACK |
| Xem thêm Sync | Feedback nhấn, nền vàng đậm nhẹ lúc nhấn, rồi mở danh sách theo handler cũ | Chưa thêm animation chiều cao accordion |
| Mở hồ sơ Sync | Thêm nền vàng kem cho shared Button hiện có | Không thêm spring mới và không sửa shared Button |

Các helper đọc và lắng nghe Reduce Motion, ban đầu giữ tĩnh khi chưa biết setting. Đây là khả năng của source/tests; **chưa bật/tắt Reduce Motion trên Android để nghiệm thu thực tế**. Ảnh tĩnh chứng minh bố cục và trạng thái giữ nhấn, không chứng minh FPS. Không có số đo để tuyên bố 60 FPS.

## 7. Các màn đã chỉnh ở checkpoint trước, không làm lại ở đợt cuối

Các thông tin dưới đây lấy từ Git/worklog lịch sử, phân biệt với lượt Home/Tasks/Sync/Profile vừa hoàn tất.

| Màn | Phần đã làm | Commit / trạng thái |
|---|---|---|
| Tiếp nhận (`receiving.tsx`) | Viền, khoảng cách thẻ và feedback nhấn theo hệ Crew | `555b77f`; đã mở trợ giúp, chi tiết yêu cầu đóng và Back |
| Chi tiết nhiệm vụ (`wo-detail.tsx`) | Nền/thẻ, typography và lịch sử nhất quán Home; vùng thông tin nhiệm vụ trong CrewTaskFacts | `8afd815`; đã cuộn, tải facts, mở lịch sử 3 → 6, mở kỹ thuật |
| Thông tin khuyết tật (`report-defect.tsx`) | Nội dung dễ đọc, card trung tính và transition | `6adfce0`; liên kết hồ sơ đã nộp vẫn mở được |
| Bản đồ nhiệm vụ (`task-map.tsx`) | Chỉ kiểm tra empty state/quay lại với fixture thiếu tọa độ | Không sửa source trong checkpoint này; bản đồ có tọa độ chưa được nghiệm thu |

Inventory hiện tại có **14 file màn Crew**, không tính `_layout.tsx`. Các màn `progress`, `complete`, `repair-correction`, `navigation`, `viewfinder`, `field-review` còn cần audit UI đầy đủ trước khi mở phạm vi chỉnh tiếp. Field Review đã được mở để kiểm navigation, không đồng nghĩa đã thiết kế lại màn đó. Báo cáo không xác nhận toàn bộ 14 màn đã hoàn thiện.

## 8. Ảnh trước/sau và bằng chứng Android

Môi trường đã dùng: Pixel_6_Pro, emulator-5554, Android 14, Expo Go đang chạy. Đợt tiếp tục dùng Fast Refresh, không quay video. Các ảnh nằm trong `.cache/`, đang untracked và được bảo toàn; **push báo cáo không đưa ảnh local lên GitHub**. Muốn chia sẻ ảnh qua máy khác cần một đợt đóng gói riêng được cho phép.

| Phần | Trước | Sau |
|---|---|---|
| Home đầu trang/thống kê | [Ảnh trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-home-ui-20261118/before-top.png) | [Ảnh sau](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-home-ui-20261118/after-top.png) |
| Home thẻ nhiệm vụ | [Ảnh trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-home-ui-20261118/before-tasks.png) | [Ảnh sau](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-home-ui-20261118/after-tasks.png) |
| Home khung danh sách cuối | [Ảnh trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-panels-refine-20261118/home-before.png) | [Ảnh sau](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-panels-refine-20261118/home-after.png), [đã ổn định](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-panels-refine-20261118/home-after-settled.png) |
| Công việc | [Ảnh trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-tabs-ui-20261118/tasks-before.png) | [Ảnh sau bố cục](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-tabs-ui-20261118/tasks-final-after.png), [khung cuối](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-panels-refine-20261118/tasks-after.png) |
| Sync hồ sơ | [Ảnh trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-panels-refine-20261118/sync-before.png) | [Gom thông tin](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-panels-refine-20261118/sync-after.png) |
| Sync nút vàng nhẹ | [Nút trắng trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-panels-refine-20261118/sync-actions-before.png) | [Tải lại + Mở hồ sơ](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-panels-refine-20261118/sync-actions-after.png), [Xem thêm](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-panels-refine-20261118/sync-actions-footer-after.png) |
| Sync hàng đợi | [Ảnh trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-tabs-ui-20261118/sync-queue-before.png) | [Ảnh sau](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-tabs-ui-20261118/sync-queue-after.png) |
| Hồ sơ | [Ảnh trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-tabs-ui-20261118/profile-before.png) | [Ảnh sau](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-tabs-ui-20261118/profile-after.png), [cài đặt](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-tabs-ui-20261118/profile-settings-after.png) |

Ảnh giữ nhấn: [thẻ Home](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-home-ui-20261118/task-pressed-after.png), [thẻ Tasks](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-tabs-ui-20261118/tasks-pressed.png).

Ảnh checkpoint cũ: [Tiếp nhận trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-all-uiux-20261118/receiving-detail-before.png) / [sau](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-all-uiux-20261118/receiving-detail-after.png); [Chi tiết trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-all-uiux-20261118/detail-before.png) / [sau](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-all-uiux-20261118/detail-after.png); [Khuyết tật trước](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-all-uiux-20261118/report-defect-before.png) / [sau](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-all-uiux-20261118/report-defect-after.png).

Lưu ý evidence: vị trí cuộn/trạng thái loading của một số cặp khác nhau. `home-after.png` có nút busy; `home-after-settled.png` không còn trang tiếp theo. Không dùng `crew-panels-refine-20261118/home-after-scroll.png` làm ảnh Home vì thực tế chụp Sync; không dùng `crew-all-uiux-20261118/sync-before.png` làm ảnh Sync vì chứa Tasks. `sync-loading-gold-after.png` ở vị trí cuộn, không phải ảnh chứng minh đầu trang cuối.

## 9. Kiểm chứng đã chạy

Đây là tổng hợp **kết quả đã chạy ở các checkpoint**, không phải một lần chạy mới trong task viết báo cáo.

| Checkpoint | Targeted PASS | Full regression PASS |
|---|---:|---:|
| Home press cuối, theo worklog | 121 | 1841/1841 |
| Tasks + ID Home (`0b660ad`) | 88 | 1841/1841 |
| Sync (`4675045`) | 35 | 1841/1841; chạy trước hai chỉnh màu/gap cuối, được phủ lại trong full Profile |
| Profile (`1e69c1a`) | 91 | 1841/1841; phủ source kết hợp Home/Tasks/Sync/Profile |
| Khung Home/Tasks (`6a93b82`) | 97 | 1841/1841 |
| Gom hồ sơ Sync (`914574a`) | 23 | 1841/1841 |
| Loading + vàng nhẹ (`b48007d`) | 40 | **1842/1842**, 156 test files, 0 fail/skipped, 180972.9079ms |

Lệnh full cuối: `node --test --test-concurrency=2` với danh sách tất cả `tests/*.test.cjs`. Log: [loading-actions-final-regression.log](D:/Do_AN_Drone/FE_AppMobile/.cache/crew-panels-refine-20261118/loading-actions-final-regression.log).

TypeScript `npx tsc --noEmit` exit 0 ở checkpoint cuối. `git diff --check` PASS; scan icon/UD-06 trong source thay đổi không có match cấm. AST comparison với `baf87ee` cho các file áp dụng giữ nguyên non-JSX statements và action props; đã đọc diff điều kiện hiển thị. Đây là bằng chứng bổ sung, không phải chứng minh hình thức rằng mọi regression đều bất khả thi.

Test mới của loading dùng promise đọc đang pending để kiểm tra label/busy/disabled, giữ panel, chặn bấm lặp và trở về label sau khi đọc xong. Một assertion cũ đòi fixed width đã fail ở lượt đầu; sửa thành yêu cầu kích thước chạm tối thiểu, chiều cao linh hoạt và wrapping, rồi chạy lại PASS. Không làm yếu guard nghiệp vụ để test qua.

## 10. Phần chưa xác minh và giới hạn bàn giao

- **NOT_VERIFIED:** ảnh native đúng thời điểm loading đang chạy; tốc độ đọc nhanh nên chưa có ảnh busy cuối đáng tin. Node test kiểm label/guard không thay bằng chứng native.
- **NOT_VERIFIED:** HTTP readback trang mới sau bấm Tải thêm.
- **NOT_RUN:** native bật/tắt Reduce Motion, font hệ thống phóng lớn; font scale đã đọc là 1.0 ở lượt Sync.
- **NOT_RUN:** đo FPS, Android máy thật/APK phát hành, iPhone tương thích trong đợt này.
- **NOT_RUN:** chủ động gây offline/error trên native, keyboard nhập/submission, logout, restart/persistence/session switch E2E.
- Không chạy mutation start/finish/upload/send/reconcile/receipt để kiểm UI; không suy quyền hoặc trạng thái hoàn tất từ test trình bày.
- Không khẳng định đã thêm skeleton cho mọi màn hoặc animation chiều cao accordion.

## 11. Danh sách commit và file của đợt tiếp tục

| Commit | Nội dung |
|---|---|
| `af5ad9c` | Ghim skill mobile-design |
| `85cb609` | Ghim hướng dẫn React Native performance |
| `40acc6e` | Tích hợp hướng dẫn skill theo phạm vi |
| `c68096e` | Sửa tên Expo skill theo bundle thực tế |
| `8ba570b` | Home: phân cấp thống kê và CTA |
| `cb3a06f` | Home: tăng kích thước hai ô thống kê |
| `a6a79bb` | Home: thẻ dễ đọc và entry motion |
| `baf87ee` | Home: phản hồi nhấn spring |
| `0b660ad` | Tasks: đồng bộ Home; ID và Tải thêm |
| `4675045` | Sync: hồ sơ/hàng đợi/control |
| `1e69c1a` | Profile: thống kê và cài đặt |
| `6a93b82` | Khung Nhiệm vụ được giao dùng chung |
| `914574a` | Sync: gom bằng chứng và hành động |
| `b48007d` | Sync: loading rõ và nút nền vàng nhẹ |

Source UI thay đổi từ `63f0962..b48007d`: Home, Tasks, Sync, Profile; CrewHomeTaskPressable, CrewLocalDraftPanel, CrewOfflinePanel. Test điều chỉnh/thêm: crew-c2-home-layout, crew-home-motion, crew-home-task-press, crew-polish-layout, crew-sync-empty-legacy, crew-ui-restore, dot-c-crew-filter. Worklog chi tiết được bổ sung theo checkpoint. Skill/hướng dẫn là các commit riêng, không phải dependency của app.

Tham khảo đã áp dụng có chọn lọc: mobile-design, vercel-react-native-skills, Expo building-native-ui/animations; Android card guidance và Law of Proximity theo worklog. Không tuyên bố đã xem đầy đủ thư viện Mobbin/Page Flows khi nội dung truy cập không đủ.

## 12. Git và bảo toàn phạm vi

Trước tạo báo cáo: main ở `b48007d`, không có tracked WIP, có 14 commit local sau origin/main `63f0962`. Đã fetch origin main và kiểm tra history. File báo cáo này sẽ được commit riêng; theo yêu cầu mới nhất của anh Tùng, push toàn bộ commit local lên main sau kiểm tra fast-forward. Kết quả push/SHA tài liệu được báo trong chat sau khi lệnh chạy thật; mục này không ghi trước là đã push thành công.

Giữ nguyên `.cache/`, các log untracked, Android build output, `mydatabase.db` và dữ liệu pending. Không stage ảnh/log, không reset/clean/stash, không tạo/đổi/xóa nhánh. Không sửa BE/API/workflow/quyền/offline/idempotency trong các checkpoint UI của đợt tiếp tục. Không chỉnh Operator/Reporter. Không thay package/config/tokens toàn app để làm đẹp.

Hướng làm tiếp khi được giao: xem màn thật → xác định cụm nội dung và hành động → dùng cùng ngôn ngữ UI đã chốt ở trên → chỉnh trong phạm vi → kiểm chứng Android/test → commit nhỏ. Không tự chuyển sang các màn còn lại chỉ vì báo cáo đã liệt kê chúng.
