# RoadGuard — 11. FE / Offline Test Cases và UAT

**Phiên bản:** FE-R3-v1 • **Ngày:** 27/09/2026 • **Trạng thái:** đặc tả đề xuất để FE/BE/QA review, chưa xác nhận triển khai.

## 1. Cách sử dụng

Tất cả ca dưới đây ở trạng thái **NOT_RUN**. Đây là thiết kế test, không có môi trường/app để chạy. Mỗi ca lưu build/platform/contract hash, account-role, fixture IDs, steps thực tế, observed result, evidence đã redact, defect ID và reviewer. TC gắn FE-GAP chỉ được pass sau contract được duyệt; mock pass không thay provider/device test.

Test data: account Supervisor/PM-A/PM-B/Crew-A/Crew-B/Operator/Reporter tách scope; task INSPECT_AND_REPAIR, MEASURE_ONLY, APPROVAL_TRACK và survey; policy valid/blocked/unknown; ảnh BEFORE/AFTER có hash; video multipart; hai thiết bị và network fault injector. Không dùng dữ liệu thật không được phép.

Mỗi dòng dưới là một ca độc lập: cột bối cảnh là tiền điều kiện; thực hiện hành động rồi đối chiếu toàn bộ expected. Test thao tác ghi cần kiểm cả DB server/dedup/outbox và local persistence, không chỉ screenshot toast.

| ID | Nhóm | Tiền điều kiện / tình huống | Hành động | Expected result | Trace |
|---|---|---|---|---|---|
| TC-FE-01 | Auth | Login hợp lệ online | Gửi đúng LoginRequest; nhận TokenPair rồi /me | Mở đúng actor; không log token/password; partition đúng | FR-01 |
| TC-FE-02 | Auth | Sai password | BE trả lỗi credentials theo contract đã chốt | Thông báo chung, giữ email; không lộ tồn tại account | FR-01; GAP-01 |
| TC-FE-03 | Auth | mustChangePassword=true | Login rồi mở deep link nghiệp vụ | Chuyển đổi mật khẩu; không thực hiện nghiệp vụ | FR-01 |
| TC-FE-04 | Auth | 10 request 401 cùng phiên | Giả access hết hạn, phát 10 GET | Một refresh; mỗi request replay tối đa1; không refresh storm | FR-01 |
| TC-FE-05 | Auth | Refresh revoked | Refresh trả401 SESSION_REVOKED | Một yêu cầu login, giữ queue/evidence | FR-01/22 |
| TC-FE-06 | Auth | Refresh response bị mất | Server rotate rồi ngắt mạng trước response | Không loop token cũ; unknown session, login lại an toàn | GAP-01 |
| TC-FE-07 | Auth | Logout trong lúc refresh | Delay refresh, logout, cho response về sau | Không resurrect session, worker dừng | FR-01 |
| TC-FE-08 | Auth | OTP/resend 429 | Nhấn resend liên tục trong cooldown | Một request hợp lệ, đếm ngược Retry-After, không auto spam | FR-03 |
| TC-FE-09 | Auth | Role không có scope | PM-A mở project-B hoặc Reporter mở report người khác | Không lộ cache/dữ liệu; BE403/404; UI không dựa role đơn thuần | FR-01/25 |
| TC-FE-10 | Auth | Token hết hạn offline | Đã tải task hợp lệ, mất mạng qua exp, restart | Local unlock đúng account, vẫn lưu dữ liệu; sync cần auth lại | FR-22 |
| TC-FE-11 | Error | 422 array index sau reorder | Gửi measurements, reorder khi chờ, nhận index0 lỗi | Lỗi đúng local row ID hoặc summary; không gắn hàng khác | NFR-12 |
| TC-FE-12 | Error | Gateway trả HTML504 | POST có key, proxy504 text/html | Fallback an toàn; UNKNOWN_OUTCOME, không render HTML/success | FR-22 |
| TC-FE-13 | Error | HTTP200 sai schema | Sync response thiếu field required | Không ACK; báo CLIENT_CONTRACT_MISMATCH | FR-22 |
| TC-FE-14 | Error | 204 không body | Logout/change-password thành công204 | Không lỗi JSON parse; xử lý success đúng | FR-01 |
| TC-FE-15 | Paging | Hai trang cursor | GET page1 rồi nextCursor, limit25 | Encode opaque cursor, không dùng page, ghép đúng IDs | Contract |
| TC-FE-16 | Paging | Đổi filter khi request cũ chạy | Mock extension approved, đổi query rồi cho cũ về trễ | Reset cursor; bỏ response generation cũ | GAP-04 |
| TC-FE-17 | Paging | Cursor expiry | BE trả lỗi cursor đã chốt | Reload page1; không retry cursor vô hạn | GAP-04 |
| TC-FE-18 | Realtime | Reconnect không replay | Bỏ event khi disconnect, reconnect | Refetch resource/list; không đánh sync ACK từ event | FR-34 |
| TC-FE-19 | Realtime | Event trùng/đảo thứ tự | Phát hai eventId trùng và changed cũ | Dedupe/refetch; không downgrade state hoặc cộng badge mù | GAP-11 |
| TC-FE-20 | Config | Prod URL placeholder | Build config còn <production-host> hoặc mock=true | Fail config/release gate; không gửi đến URL giả | GAP-12 |
| TC-FE-21 | Config | Đổi staging sang prod | Có queue staging pending, đổi env | Không gửi queue staging sang prod, namespace riêng | FR-22 |
| TC-FE-22 | Retry | Retry-After hai format | Mock429 delay-seconds rồi HTTP-date | Không gửi trước hạn, không clamp sớm; cooldown chung | NFR resilience |
| TC-FE-23 | Retry | POST timeout sau commit | Commit một operation rồi timeout, retry cùng key | Một business record, DUPLICATE/reference cũ | FR-22 |
| TC-FE-24 | Retry | Cùng key khác payload | Chỉnh wire payload sau gửi, replay | BE409; FE dừng, không tự key mới để bypass | FR-22 |
| TC-FE-25 | Local | Kill sau file rename trước DB | Fault injection tại cửa sổ file/DB | Startup phát hiện orphan, không báo saved giả, không mất file vô cớ | FR-21/22 |
| TC-FE-26 | Local | Storage full | Fill disk rồi capture/lưu form | Báo chưa lưu, không xóa evidence pending; không tăng saved count | FR-22 |
| TC-FE-27 | Local | Logout có dữ liệu pending | Logout rồi login account khác | Partition cũ bị khóa; data không mất và không lộ account khác | FR-01/22 |
| TC-FE-28 | Local | User suspend khi offline | Capture offline; online nhận revoke | Dừng server mutation, giữ dữ liệu và Q17 recovery | Q17; GAP-09 |
| TC-FE-29 | Pack | Snapshot có metadata thiếu bytes | Tải snapshot nhưng fail một BEFORE | Không ready sửa offline; retry từng file; không coi metadata là download | FR-21/22 |
| TC-FE-30 | Pack | Map chưa tải | Metadata/evidence đủ nhưng map font/tile thiếu | Báo map unavailable, không hứa directions; không mất form | FR-22 |
| TC-FE-31 | Sync | Partial batch | A applied,B conflict,C rejected | ACK chỉ A; B/C giữ đúng state, không rollback A | FR-22 |
| TC-FE-32 | Sync | Thiếu/trùng result | BE200 thiếu B hoặc trùng operationId | Không ACK envelope mù; reconcile/replay, báo contract issue | FR-22 |
| TC-FE-33 | Sync | Crash sau commit trước local ACK | BE commit, kill app, mở lại | Replay stable operation/key; không tạo lần sửa thứ hai | FR-22 |
| TC-FE-34 | Sync | Dependency unresolved | Start chưa ACK, submit có local attempt ID | Không gửi temp ID; WAITING_DEPENDENCIES đến mapping server | FR-22 |
| TC-FE-35 | Sync | Hai runner | Foreground sync và background trigger đồng thời | Một lease/generation; dedup BE vẫn bảo vệ | FR-22 |
| TC-FE-36 | Upload | URL part expired | PUT storage403 expired, RoadGuard token còn hợp lệ | Gia hạn part URL qua API, không logout/refresh mù | FR-27 |
| TC-FE-37 | Upload | Part ACK lost | Storage nhận part, mất response rồi restart | Reconcile/resend theo contract; không sai parts/bytes; GAP-06 gate | FR-27 |
| TC-FE-38 | Upload | Complete rồi verifying | Complete trả202, upload byte100% | Chờ VERIFIED; không gửi command phụ thuộc hoặc xóa gốc | FR-21/27 |
| TC-FE-39 | Upload | Checksum mismatch | Cố ý sửa bytes sau hash | Server từ chối; giữ file gốc/diagnostic; không ACK | FR-21/27 |
| TC-FE-40 | Upload | Signed PUT cross-origin | Quan sát request storage | Không gửi bearer/refresh RoadGuard; headers đúng provider | FR-01 |
| TC-FE-41 | Fast Track | Task đủ policy, một lỗi nhỏ | Tải snapshot hợp lệ, offline đo/BEFORE/sửa/AFTER | Lưu local có provenance; không PM duyệt từng số đo; không ACCEPTED local | FR-17/18/21 |
| TC-FE-42 | Fast Track | MEASURE_ONLY dù số đo nhỏ | Batch nhiều lỗi đo đạt | Không bật sửa; chỉ nộp đo, báo PM | FR-17/18 |
| TC-FE-43 | Fast Track | Policy thiếu precision/exclusion semantics | Local evaluation không đủ contract | Không default ELIGIBLE; BLOCKED_CONTRACT/insufficient rõ | GAP-15 |
| TC-FE-44 | Fast Track | PM block/đổi đội trong khi offline | Làm theo snapshot cũ rồi reconnect khác assignment | CONFLICT, giữ thực tế thi công; không fake evaluation server | Q04; GAP-05/09 |
| TC-FE-45 | Repair | Thiếu BEFORE sau khi đã sửa | Chỉ có AFTER, user muốn đổi nhãn | Không hợp thức hóa; ghi ngoại lệ Q06 chờ PM | FR-21; Q06 |
| TC-FE-46 | Repair | Sửa lại | Attempt trước REWORK_REQUIRED, ghi lần mới | Attempt/evidence mới, giữ lịch sử; không overwrite cũ | FR-24 |
| TC-FE-47 | Operator | Video offline rồi sync | Task đã nhận, video+telemetry durable, mạng trở lại | Upload verified rồi datasets endpoint; không kind survey giả trong sync | FR-26/27 |
| TC-FE-48 | Conflict | 412 không overwrite | Server đổi version trước gửi | Giữ base/local/server; không auto retry If-Match mới | FR-22 |
| TC-FE-49 | Time | Clock lệch +24h | Capture time sai, upload/poll dùng server Date | Lưu nguồn thời gian, không dùng client time làm quyền/order chắc chắn | DD §9.5 |
| TC-FE-50 | Migration | Update khi queue unknown | Command v1 đang unknown, app local schema v2 | Giữ exact wire body/hash; không drop queue/destructive migration | FR-22 |
| TC-FE-51 | Cleanup | User clear cache | Có media verified+acked và pending/conflict | Chỉ dọn bản đủ điều kiện user chọn; pending được bảo vệ | FR-22 |
| TC-FE-52 | UI | Upload xong chưa PM review | Repair submit ACK, server chưa acceptance | Hiển thị đã gửi/chờ kiểm, không “Đã nghiệm thu” | FR-23 |
| TC-FE-53 | Paging | Offline search subset | Chỉ tải page1, tìm item thuộc page2 | Nhãn trong dữ liệu đã tải; không kết luận toàn project không có | NFR-12 |
| TC-FE-54 | Contract | Unknown enum/status | BE trả enum mới hoặc status string chưa map | Read fallback/contract diagnostic; không mở action sai | Contract |
| TC-FE-55 | Network | Wi-Fi có captive portal | Connectivity online nhưng API unreachable | Local tiếp tục; không badge synced; retry có budget | FR-22 |
| TC-FE-56 | Dedup | Replay quá retention chưa rõ | Giữ operation lâu rồi send sau TTL chưa chốt | Không tự new key; support/reconciliation, gate GAP-08 | FR-22 |
| TC-FE-57 | Web | Cookie BFF CSRF | Khi BFF approved, request từ origin khác thiếu CSRF | BE từ chối; frontend không coi CORS thay CSRF | GAP-02 |
| TC-FE-58 | Recovery | App cold-start không task pack | Cài mới offline, bấm nhận task | Không tạo assignment/quyền local giả; hướng dẫn online chuẩn bị | FR-22 |

## 2. Hành trình UAT tích hợp

| ID | Actor / hành trình | Điểm xác nhận nghiệp vụ |
|---|---|---|
| UAT-FE-01 | Crew tải task → airplane mode → restart → đo → BEFORE → sửa FT → AFTER → reconnect → PM kiểm đóng | Không mất dữ liệu/không TTL tác nghiệp/không chờ duyệt từng số đo; server intake gaps phải đóng trước pass |
| UAT-FE-02 | Crew MEASURE_ONLY nhiều lỗi → nhập thiếu một lỗi → sync partial → bổ sung theo Q05 | Không sửa dù số đo nhỏ; không đánh cả batch hoàn tất nếu thiếu |
| UAT-FE-03 | PM đổi assignment lúc Crew offline → Crew reconnect | Giữ evidence/snapshot cũ, conflict có người xử lý đúng Q04, không silent overwrite |
| UAT-FE-04 | Operator quay video lớn → mạng chập chờn → kill app → resume → verify → dataset/job | Không nhân dataset, không xóa video trước verified, coverage unknown thể hiện đúng |
| UAT-FE-05 | Account hết hạn/suspend khi có pending → login lại hoặc bàn giao theo Q17 | Không lộ account khác, không xóa queue hoặc bypass quyền |
| UAT-FE-06 | Web PM review → token expiry → retry → response mất sau commit → mở lại màn hình | Một quyết định được audit, UI đúng server, không thao tác trùng |
| UAT-FE-07 | Update app/local DB khi pending + disk gần đầy | Dữ liệu khôi phục được, schema migration không drop/overwrite command unknown |
| UAT-FE-08 | Reporter xem timeline/public evidence trong lúc nội bộ thay quyền/trạng thái | Không lộ case nội bộ, upload không tự công bố repaired |

## 3. Ma trận thiết bị và bằng chứng

Chốt minimum Android API/thiết bị/camera/storage/RAM thực trước test; chưa có thì TBD. Web kiểm browser mục tiêu và nhiều tab; nếu PWA full scope thêm persistence denied/eviction/private mode/service worker update. Android kiểm battery saver, background restrictions, kill process, reboot, metered network, mất quyền camera/storage và clock skew. OS không cho worker chạy ngay phải hiện pending và resume foreground đúng, không coi đó là đã sync.

Exit criteria đề xuất: không lỗi mất dữ liệu/trái quyền/duplicate business side effect; các ca auth/queue/media/conflict bắt buộc pass trên thiết bị; blockers liên quan scope được đóng bằng quyết định/contract; PO xác nhận UAT với evidence. Performance quota phải benchmark riêng, không suy từ tài liệu. Mọi lỗi còn mở có owner/severity/decision, không đổi test status thành pass để đạt tỷ lệ.

## REVIEW-01 — Acceptance readiness

TC-FE-04 chỉ dùng401 TOKEN_EXPIRED; thêm kiểm CREDENTIAL_INVALID/TOKEN_INVALID/TOKEN_MISSING/REFRESH_TOKEN_EXPIRED/SESSION_REVOKED không kích hoạt generic refresh. TC-FE-28/44 và UAT-FE-03/05 BLOCKED_BY_DECISION Q04/Q17; test hiện có vẫn NOT_RUN. Q02/Q03 cùng gap evaluator là gate trước khi nhận UAT-FE-01 end-to-end. Không đồng nhất “đã soạn test” với “có thể nghiệm thu”.
