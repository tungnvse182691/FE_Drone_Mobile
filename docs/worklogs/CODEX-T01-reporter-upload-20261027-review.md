# CODEX-T01 — API integration completed / Android acceptance pending

Ngày: 2026-10-27. Baseline: `83c4ad99e09f10c60df0164f89f275291f6fa1cb`.

**T01 API integration completed / Android acceptance pending.** Blocker T01-AUTH-RETRY đã đóng; không còn P0/P1 được phát hiện trong phạm vi review T01. Người dùng đã duyệt thêm `src/api/client.ts`, commit và push origin/main khi các gate đạt. Không sửa Backend, Docker, quyền role hoặc code Crew/Drone. Không coi toàn bộ sản phẩm là production-ready.

Đã đọc checklist tại `D:\Downloads\ROADFE_BE_BLOCKERS_CODEX_T01_2026-10-27.md`; blocker thiếu tài liệu trước đây đã giải quyết. Phạm vi theo yêu cầu trực tiếp và các phê duyệt bổ sung `app/_layout.tsx`, `src/api/client.ts`.

## File và diff

| File production đã sửa | Nội dung |
|---|---|
| `app/_layout.tsx` | AuthGuard kiểm tra user/token/status, role/must_change_password; Stack luôn mount, chuyển hướng trong effect |
| `src/api/uploads.ts` | Helper phiên hợp lệ/Reporter, OTP sáu số, strong ETag |
| `src/api/client.ts` | Ràng buộc sub/sid thật, synchronous request binding, refresh theo phiên, chặn stale callbacks và unsafe replay |
| `src/store/uploads.ts` | HTTP thật, partition actor, multipart theo partSize, ledger/khóa lệnh/ETag; VERIFIED từ metadata |
| `src/store/reporter.ts` | Nháp SQLite, URI/metadata, bind guest, serialize autosave, freeze lệnh, upload/POST/readback |
| `app/(reporter)/report.tsx` | Guest tạo nháp/chọn ảnh, auth-gate, phục hồi và gửi thật |
| `app/(reporter)/report-supplement.tsx` | File thật, giữ If-Match/key, readback; đường mở lại nháp khác |
| `app/(auth)/index.tsx` | Login hợp lệ rồi bind nháp/đi đúng role; bỏ POST pending report trực tiếp và panel điền credential demo cũ |
| `app/(auth)/otp-verify.tsx` | Bỏ shortcut `1 → 111111` và quick-fill; kiểm tra Reporter/token |

File mới trong commit: `tests/t01.test.cjs`, `tests/t01-client.test.cjs`, `tests/t01-ui.test.cjs`, `tests/t01-http-smoke.cjs` và báo cáo này. Patch để review ở artifact ngoài repo: `C:\Users\ACER\.codex\visualizations\2026\10\27\01a17dd5-f101-7230-b2f9-3f42a1b0f7fb\CODEX-T01-production.patch`; không commit bản sao patch có context lịch sử.

Patch production là diff của chín file production; bốn file test đọc riêng tại đường dẫn trên. Commit theo thông điệp đã duyệt: `fix(mobile): integrate reporter uploads and guard auth retries`. SHA/URL commit và kết quả push được báo sau thao tác Git, không tự tham chiếu SHA trong file của chính commit.

## Ma trận luồng

| Tình huống | Hành vi đã triển khai |
|---|---|
| Guest tạo nháp | Lưu mô tả, URI/metadata, tọa độ; không gọi upload Bearer |
| Guest gửi | Lưu submitRequested trước chuyển auth |
| Login/OTP | Cần token, user, role Reporter; xử lý must_change_password; bind nháp theo actor |
| Upload | API-211/214; PUT URL ký nguyên bản không Bearer; GET session API-212; complete API-213 |
| Xác minh | API-208 phải VERIFIED, có file ID/version/checksum/size hợp lệ |
| Tạo/bổ sung | Freeze payload/key/If-Match trước API-216/219; API-217 readback có file ID/version mới điều hướng thành công |
| Không rõ kết quả | Giữ payload/key/ledger để kiểm tra hoặc replay; không chế file ID/version |
| Nháp khác target | Giữ nháp có nội dung, có nút mở lại; nháp rỗng do mở form/GPS không chặn supplement |

## Kiểm chứng cuối cùng

| Kiểm tra | Kết quả và giới hạn |
|---|---|
| `npm run typecheck` | PASS, exit 0 (`tsc --noEmit`) |
| `node --test tests/t01.test.cjs tests/t01-client.test.cjs tests/t01-ui.test.cjs` | PASS, 49/49, exit 0 (20 T01 cũ + 25 interceptor + 4 UI effect) |
| `git diff --check` | PASS, exit 0; Git có thông báo autocrlf, không có lỗi whitespace |
| HEAD / origin trước commit | Đúng baseline; fetch origin main thành công, không có commit mới từ remote |
| `/ready` | HTTP 200, đã đo lại sau review |
| API thật upload/create/supplement/readback | HTTP VERIFIED; smoke exit 0 |
| AuthGuard guest/restored thiếu token/ba role/must_change_password | PASS logic helper; native navigation NOT RUN |
| Guest upload, sai role, OTP validator | PASS logic; OTP HTTP thật thành công |
| Logout/relogin, phục hồi URI/key, unknown outcome | PASS logic với DB/native boundary giả lập; restart app thật NOT RUN |
| Đổi account giữa hai bước upload và retry nội bộ Axios | PASS logic với Axios interceptor thật và adapter/timer kiểm soát |
| HTTP 400/401/403/409/412/428/503 khi ghi report | PASS logic: giữ lệnh/key, không báo thành công |
| Wrong-role HTTP thật | NOT RUN: chưa có fixture non-Reporter được tạo cho test |
| Android E2E | NOT RUN: `D:\Android\SDK\platform-tools\adb.exe devices -l` không có thiết bị |
| Android → MinIO | NOT RUN: chưa có device để đo; không sửa URL hoặc port |

Test thực thi TS production qua transpile/vm. 20 test T01 thay native/DB/HTTP ở boundary. 25 test client chạy Axios thật, chỉ thay adapter/timer/auth bridge; 4 test UI chạy effect của screen với thứ tự GPS/restore có kiểm soát. Không chứng minh tiến trình Android, SecureStore/Zustand hydrate thật hoặc navigation Fabric. HTTP smoke mới dùng Axios production cho protected API, fetch cho auth bootstrap/negative bearer/MinIO, không phải app chạy trên Android.

### HTTP evidence đã chạy

Script `tests/t01-http-smoke.cjs` chạy chủ động bằng `node tests/t01-http-smoke.cjs`; tạo Reporter test riêng ở local, lấy OTP thật qua Mailpit, dùng PNG fixture nhỏ. Không in token, mật khẩu, OTP, URL ký hoặc raw body. Lượt xác minh lại sau sửa client: exit 0, các protected operation đi qua Axios/interceptors production và JWT sub/sid thật.

| Phép đo | HTTP / assertion thực tế |
|---|---|
| `/ready`; anonymous/bad Bearer GET reports | 200; 401; 401 |
| Register; OTP verify; OTP bearer `/me`; Android login | 202; 200; 200; 200; role REPORTER và token thật |
| API-211 create + cùng key replay | 201/201, cùng session ID |
| API-214 part URLs; storage PUT nguyên URL không Bearer | 200; 200 và ETag |
| API-212 session | 200, version/ETag authoritative |
| API-213 thiếu precondition; complete; cùng key replay | 428; 202; 202 |
| API-208 metadata | 200 → VERIFIED; checksum/size/version hợp lệ; hai upload |
| API-216 create; cùng key replay | 201/201, cùng report ID |
| API-217 readback | 200, evidence khớp file ID/version |
| API-219 malformed If-Match | 400 |
| API-219 supplement; cùng key replay | 200/200 |
| API-219 key mới, If-Match cũ | 412 |
| API-217 supplement readback | 200, evidence khớp và đúng một supplement |

Smoke ban đầu chờ 10 giây nên timeout; đối chiếu UploadVerificationWorker (poll mỗi 30 giây), tăng budget lên 90 giây. Lượt xác minh lại dùng production Axios hoàn tất exit 0. Sandbox chặn socket ở lượt đầu; sau khi chạy ngoài sandbox theo quyền được duyệt, /ready 200 và workflow đạt. HTTP thật không gây lỗi mạng/đổi actor có chủ đích; các race này được kiểm thử bằng interceptor thật với adapter kiểm soát. Sửa GPS sau HTTP smoke không đổi transport.

## T01-AUTH-RETRY — ĐÃ ĐÓNG

### Bằng chứng lỗi trước sửa

File `src/api/client.ts` đã được duyệt và sửa. Các dòng dưới đây là vị trí ở baseline:

- Dòng 291–302: request interceptor đọc `bridge.getAccessToken()` hiện tại và đặt lại Authorization, kể cả retry.
- Dòng 354–357: transport retry chờ backoff rồi gọi lại `apiClient.request(config)`, không ràng buộc actor ban đầu.
- Dòng 332–338: nhánh 401 cho replay bằng token hiện tại khi khác token lúc gửi; khác token không chứng minh cùng actor.
- Trình tự nguy hiểm theo source: A POST reports/supplements → lỗi mạng/503 → logout A/login B trong backoff → interceptor đặt token B lên cùng body/key của A. Assert owner trong store nằm ngoài Axios nên không chặn replay nội bộ.
- Regression thực thi interceptor thật đã tái hiện lỗi trước sửa: đổi actor trong backoff, refresh cũ ghi đè B/logout B, response cũ gây side effect, unsafe POST replay. Sau sửa các test đạt.

### Cơ chế sau sửa

- JWT `sub` + `sid` được đọc để so tính liên tục, theo AccessTokenFactory/AuthService Candidate3; không dùng claim chưa verify để cấp quyền, không tạo session version giả. BE vẫn xác thực token.
- Request interceptor synchronous để gắn phiên ngay lúc gọi; chặn cả stale response thành công/lỗi trước khi caller nhận dữ liệu hoặc auth callback chạy.
- Refresh single flight theo sub/sid; trước apply pair kiểm tra nguyên access + refresh snapshot còn thuộc phiên ban đầu và pair trả về cùng sub/sid. Flight cũ không xóa flight mới.
- Lỗi/refresh thất bại của phiên cũ không logout hoặc yêu cầu đổi mật khẩu phiên mới. Refresh hợp lệ cùng phiên vẫn hoạt động; token mới trong cùng sid được phép dùng cho retry hợp lệ.
- GET/HEAD/OPTIONS có thể retry. POST chỉ auto replay khi có key và thuộc Reporter endpoints đã xác minh idempotency trong T01. Body/key/If-Match giữ nguyên. POST khác vẫn gửi lần đầu và được refresh credentials khi hợp lệ, nhưng không tự replay; caller giữ quyền đối soát kết quả. Crew/Drone mutation chưa được mở rộng chính sách retry tại T01.
- Logout dùng bearer đã capture của phiên cũ, không bị thay bằng bearer mới, không retry hoặc phát auth side effect.

25 test interceptor bao phủ 503/timeout đổi A→B, refresh cũ thành công/thất bại, refresh cùng A single flight, response 401/403 cũ, login lại cùng actor khác sid, request synchronous, guest không tự nhận bearer, keyed POST bất biến, unsafe POST không replay, concurrent flight A/B, cancelled request, bare login, GET của Reporter/Crew/Drone và refresh mutation Crew/Drone không replay.

## Bảng UI / API / Workflow trong phạm vi T01

| Màn/khối | UI theo source | API | Workflow và phần chưa nghiệm thu |
|---|---|---|---|
| AuthGuard | Đủ token/status/role/must_change_password, Stack mounted | Session continuity client đã test | Logic PASS; navigation Fabric trên Android NOT RUN |
| Login | Form, lỗi, thông báo nháp, role routing | Login HTTP 200 | Bind nháp rồi về form; native guest→login→form NOT RUN |
| OTP | Nhập sáu số, lỗi/cooldown/resend, không shortcut | Register202, verify200, /me200 | HTTP+validator PASS; UI resend/OTP native NOT RUN |
| Reporter tạo report | Nháp/chọn ảnh/GPS/auth-gate/lỗi/retry đã nối | Upload VERIFIED, create201/readback200 | Logic+HTTP PASS; ảnh cache/restart native chưa xác minh |
| Reporter supplement | Restore ảnh/nội dung/coords, khóa lệnh, mở nháp khác | Upload VERIFIED, supplement200/readback200; stale412 | Logic/HTTP PASS; UI giải quyết terminal conflict/chủ động bỏ frozen command còn thiếu |
| Trạng thái upload/lỗi | Chặn báo thành công trước VERIFIED+readback; thông báo chờ/lỗi | 428/400/412 đã đo; 401 anonymous/bad bearer đã đo | Có retry kiểm tra cùng lệnh; UI tiến độ từng part và reconciliation nâng cao chưa hoàn chỉnh |

Các màn có UI code và pipeline T01 đã nối; không gắn nhãn UI hoàn chỉnh trên thiết bị khi chưa chạy Android. Luồng giải quyết conflict nâng cao còn thiếu UI như bảng; không tự rebase hoặc báo thành công để lấp khoảng trống.

### Giới hạn nghiệm thu khác

1. Android E2E/restart/navigation NOT RUN; chưa có ANDROID E2E PASS.
2. SQLite giữ URI/metadata/key; ảnh vẫn ở cache gốc. OS xóa cache thì fail closed, yêu cầu chọn lại. Độ bền file qua restart/cache cleanup chưa kiểm chứng trên native.
3. Frozen request/lỗi upload terminal không tự rebase/version/key mới. Cần kiểm tra thủ công trước khi giải quyết xung đột; chưa có luồng bỏ/giải quyết lệnh không rõ kết quả hoàn chỉnh.
4. Wrong-role HTTP chưa chạy; chỉ có logic sai role và HTTP 401 anonymous/bad Bearer.

## Review / nhật ký

- Áp dụng `roadguard` và `code-review`; giữ MaterialIcons, UD-06, full route group, Stack mounted; không thêm enum/mã khuyết tật hoặc thay stack/định danh.
- Quét `rg -n 'Ionicons' app src` và UD-06 `vnđ|vnd|chi phí|dự toán|kinh phí|định mức|đơn giá|₫` không có kết quả.
- Reviewer độc lập chạy lại typecheck/tests; tìm lỗi nháp rỗng và blocker retry.
- Nháp rỗng: test tái hiện FAIL, sửa trong allowlist, 20/20 PASS; reviewer xem lại xác nhận không có finding quan trọng mới ở phần sửa.
- Các sửa đã kiểm chứng: bỏ OTP shortcut, sửa overlay type, serialize autosave để giữ identity/key, giữ lệnh khi unknown outcome. Unit test không thay cho API/native.
- Review client phát hiện refresh bị gắn nhầm vào mayReplay; đã tách hai việc và thêm test Crew/Drone RED→GREEN.
- Review cuối phát hiện GPS ghi đè supplement đã freeze: thêm test hai thứ tự/null/non-null, RED 3 FAIL/1 PASS; sửa rồi GREEN 4/4. Reviewer xác nhận finding đã đóng, không có P0/P1 mới trong patch cuối.
- Các gate máy local cần mạng/.git được chạy với quyền ngoài sandbox sau khi sandbox chặn; không thay đổi cấu hình mạng/Docker.
- Cổng dữ liệu nhạy cảm: bỏ panel credential demo có sẵn trong màn login được sửa; không thêm credential thực, dữ liệu cá nhân, URL ký hoặc .env. Fixture test là dữ liệu tổng hợp; password/OTP thật của smoke chỉ tồn tại trong bộ nhớ, không log/commit.

**Kết luận: T01 API integration completed / Android acceptance pending. Typecheck0, 49/49 tests PASS, HTTP VERIFIED. P0 mở trong phạm vi T01: không có finding đã biết. Android E2E NOT RUN; không production-ready. Không bắt đầu T02.**
