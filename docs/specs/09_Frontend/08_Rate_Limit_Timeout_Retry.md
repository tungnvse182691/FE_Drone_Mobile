# RoadGuard — 08. Rate Limit / Timeout / Retry

**Phiên bản:** FE-R3-v1 • **Ngày:** 27/09/2026 • **Trạng thái:** đặc tả đề xuất để FE/BE/QA review, chưa xác nhận triển khai.

## 1. Phân biệt ba việc

Timeout client chỉ kết thúc chờ, không hủy transaction server. HTTP504 từ gateway cũng có thể xảy ra sau khi server đã commit. Retry không được tạo side effect mới. `retryable` là tín hiệu lỗi, không thay idempotency. Hủy request bằng AbortController/cancellation token không chứng minh BE rollback.

## 2. Budget đề xuất cho FE, cần đo trước freeze

| Tác vụ | Timeout mỗi request | Retry tự động |
|---|---|---|
| GET JSON | 15 giây | Tối đa 2 lần thêm khi transient, có jitter |
| Login/OTP/refresh | 15 giây | Không generic retry; refresh do auth coordinator |
| Mutation metadata có dedup | 30 giây | Tối đa 2 lần thêm cùng key/payload; unknown outcome giữ queue |
| Upload một part | 120 giây đề xuất | Tối đa 3 lần thêm, cùng session/part/bytes khi provider cho phép |
| Poll job | 15 giây mỗi GET | Theo lịch polling, không cộng thêm nhiều lớp retry |
| Download lớn | Budget theo byte/mạng và progress stall, đề xuất stall 60 giây | Chỉ resume khi server hỗ trợ, baseline chưa khai Range |
| Background sync | Tối đa 5 attempt transient trong một lượt drain | Sau đó PAUSED_RETRY, lên lịch lượt sau hoặc user resume, không xóa việc |

Các số trên là client defaults đề xuất, không giới hạn BE đã công bố. Không tự cắt job AI sau 30 giây. `timeout` khác deadline job, token TTL, upload session expiry và thời hạn nghiệp vụ.

## 3. 429 và Retry-After

Parse header theo cả delay-seconds và HTTP-date. Với HTTP-date dùng Date server nếu có để giảm clock skew; nếu thiếu thì client clock với cảnh báo lệch. Thời điểm request kế tiếp không sớm hơn Retry-After. Giá trị quá xa tương lai: pause và thông báo, không clamp xuống để gọi sớm. Missing/malformed: fallback exponential jitter và log contract gap.

Formula đề xuất: delay = max(serverMinimumDelay, random(0, min(30000, 1000 * 2^attempt))). Thêm jitter không được trừ thời gian server yêu cầu. Persist nextRetryAt cho queue, và actor/endpoint cooldown để restart app không flood. Client pause button không reset quota; foreground/background worker dùng chung coordinator. Scope limit (user/IP/project/route), quota và header RateLimit cụ thể chưa được BE cung cấp; không hiển thị remaining giả.

Login/OTP có cooldown riêng; không retry tự động gây OTP flood hoặc account lock. Khi hết countdown mới enable resend, vẫn xử lý 429 nếu server chưa cho phép. Không thay IP/account để né rate limit.

## 4. Ma trận retry

| Kết quả | GET | Mutation |
|---|---|---|
| Mất mạng, 502/503/504 | Backoff có budget | Replay chỉ có dedup, giữ key và body; nếu không thì đối chiếu trước |
| 500 | Retry có giới hạn theo policy | Chỉ khi lỗi được xác định transient/dedup; unknown outcome giữ |
| 429 | Chờ header rồi retry | Cùng key, không phát command mới |
| 401 | Chỉ TOKEN_EXPIRED qua auth coordinator một lần; mã khác không refresh | Replay sau auth chỉ khi an toàn và cùng identity |
| 403/404 | Không generic retry | Dừng scope, giữ local |
| 409 in progress | Theo chỉ dẫn/đối chiếu | Same key/payload; không key mới |
| 409 state/idempotency mismatch | Không | Conflict/hỗ trợ; không auto retry |
| 412 | Refetch | Người dùng/logic nghiệp vụ giải quyết; không overwrite |
| 422/400/413/415/428 | Sửa request/config | Không retry mù; evidence pending là code409 riêng |
| 2xx body invalid | Báo contract error | Chưa ACK; đối chiếu kết quả |
| User cancel | Không toast/retry bắt buộc | UNKNOWN_OUTCOME nếu đã gửi, không tự đánh canceled server |

Nếu thư viện HTTP retry và query library cùng retry sẽ nhân số lượt; chỉ một tầng sở hữu retry. Circuit breaker đề xuất mở sau 5 lỗi mạng/5xx liên tiếp cùng API trong 30 giây, nghỉ30 giây rồi một half-open probe GET đã có quyền. 4xx nghiệp vụ không tính outage. Không thêm `/health` khi baseline chưa có; request tiếp theo hoặc `/me` online được dùng kiểm API reachability đúng mục đích.

## 5. UI loading và recover

0–1 giây: trạng thái đang gửi; sau khoảng1 giây hiện spinner và disable double-submit. Sau timeout: “Chưa xác nhận được kết quả, đang kiểm tra” cho mutation, không “Gửi thất bại chắc chắn”. Cho rời màn hình khi ý định đã lưu bền vững, badge pending và operation ID nội bộ. Progress upload theo byte xác nhận; 100% byte chưa là VERIFIED. Không fake % cho job không có progressPercent.

Nút “Thử lại” sau timeout dùng operation cũ; nút “Chỉnh sửa” cần resolve outcome trước khi tạo command mới. Unknown outcome dedup retention hết hạn là blocker FE-GAP-08: chuyển hỗ trợ, không regenerate key. Mutation ledger lưu key/body hash/serialized request/result; không log raw credentials.

## 6. Network state

`navigator.onLine`/connectivity callback chỉ là gợi ý. Wi-Fi có thể captive portal, DNS lỗi, proxy lỗi hoặc API down. Không bật nhãn “Đã đồng bộ” chỉ vì online=true. Phân biệt OFFLINE, CONNECTING, API_UNREACHABLE, AUTH_REQUIRED, THROTTLED, SYNCING, UP_TO_DATE. Local capture không bị disable chỉ do network indicator. Lượt sync được trigger bởi app foreground, user sync, network regain, scheduled worker; tất cả phải đi qua cùng lease/lock.

## V2(3) amendment — 2026-09-28

This document follows `planning/V2/V2-3_DECISION_REGISTER.md`. D01-D28 are approved business decisions; `APPROVED_PILOT_CONFIG` and `APPROVED_TARGET` are not empirical verification. The document must distinguish `contractStatus`, `implementationStatus`, and `verificationStatus`. Reporter email/password plus one-time email OTP is the approved authentication flow; web cookie transport, pilot limits, retention and performance values remain configuration/target registers. Fast Track uses measurement-only intake followed by a separately authorized PM repair task; policy framework, reopen, partial publication, handover/conflict, BEFORE incident, curing and traffic release remain explicit contracts. Offline evaluation and AI two-stage processing are proposed until schema, fixtures and runtime/provider evidence pass.
