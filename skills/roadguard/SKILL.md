---
name: roadguard
description: Use when implementing RoadGuard Mobile API, role workflows, state, session, offline queue, upload or recovery logic; read only the source and contract for the current operation.
---

# RoadGuard — implementation

Authority, business/security invariants, Git/data/tool boundaries và routing nằm tại `AGENTS.md`. UI theo `skills/DESIGN.md`; kiểm checkpoint theo `skills/code-review/SKILL.md`. Vibe-guard đã tích hợp tại đây, không nạp thêm skill đó.

## 1. Đọc trước, thay đổi có căn cứ

1. Xác định thao tác người dùng, role, operation, phạm vi file và kết quả cần chứng minh. Roadmap không tự cấp scope implement.
2. Đọc file định sửa + caller + type + test + config liên quan. Tìm định nghĩa thật của tên hàm/field/route/package; không dùng tên theo trí nhớ. Tra current BE tại pinned SHA cho DTO, enum, permission, guard, headers và preconditions.
3. Tái dùng wrapper/auth/session, camera/GPS, upload, journal, cache và shared component hiện có. Không tạo flow song song hoặc fallback mock để làm có vẻ chạy được. Mock chỉ trong isolated test/dev harness.
4. Sửa concern nhỏ trong scope; không refactor toàn suite hoặc mở rộng module không liên quan. Sau lỗi phải xác định giả thuyết/root cause và kiểm bằng evidence, không lặp lệnh không có câu hỏi mới.

Nguồn chọn lọc: `docs/specs/04_API-Contracts/02_Full-API-Catalog.md`, `05_Idempotency-Concurrency-and-Errors.md`, `07_Offline-Sync-and-Crypto-Wire.md`; screen/API matrix đúng role. Catalog là declared contract, không chứng minh HTTP đã chạy. `BOOTSTRAP_PROMPT.md`/mock/scaffold không cấp production authority.

## 2. Ba role và server authority

- Crew: đo, BEFORE/AFTER, FIELD/REPAIR, Fast Track theo API-146/policy và bootstrap thật. Không lấy số đo local, NORMAL repairContext, notification hay cache làm quyền mutation. Correction cần current review/intake lineage. Không tự quyết severity cuối hoặc suy depth từ AI bbox.
- Drone: nhiệm vụ khảo sát, điểm tiếp cận, dataset/upload theo current guard; không tự mở capability bị thiếu contract/provider/fixture.
- Reporter: email/password/OTP, phản ánh/bổ sung/tra cứu đã đăng nhập theo contract; không chế public tracking. Không tự thêm retry login/OTP/refresh ngoài cơ chế auth đã duyệt.
- Adapter map wire `DroneOperator`/`RepairCrew` sang local `DRONE_OPERATOR`/`REPAIR_CREW`. Không suy wire enum từ tên UI hoặc spec cũ. PM/Supervisor không thành runtime Mobile role.

## 3. API và state

- Xác minh method/path/actor/header/body/response/error và caller. Dùng ID server thật, UUID hợp lệ, RFC3339 có timezone, nullable GPS và pagination thực; không gửi temp ID/unknown enum lên wire.
- Preserve problem status/code/source. `application/problem+json` đọc theo từng operation; code lạ dùng fallback Việt trung tính. Không tự tạo bảng mã lỗi chung. Tôn trọng 409/412/428, ETag/If-Match và Idempotency-Key đúng resource; thiếu key API-130 trả 428.
- Không silent overwrite assignment/policy/version hoặc optimistic critical approval/close/role change. Mọi mutation cần source identity và preconditions hiện hành. Task ETag/eligibility ETag không thay RepairItem rowversion.
- Mọi async flow kiểm actor/environment/session/resource trước và sau await, kể cả load cache, picker, upload, navigation return và process restart. Scope đổi phải hủy quyền thao tác, bảo toàn dữ liệu cũ để đối soát.
- Token hết hạn local không tự chứng minh quyền offline đã bị thu hồi; capture chỉ trong downloaded authority/policy được duyệt. Dispatch/reconcile cần current authenticated authority và guard thật, không dùng cached authority thay session hiện tại.

## 4. Offline, media và journal

- Kiểm `src/offline/database.ts`, migration và caller hiện hành trước sửa SQLite; `src/offline/schema.sql` chỉ conceptual scaffold, không mặc định DDL runtime.
- Phân biệt draft, intent, immutable wire command, upload ledger, mapping, conflict và receipt. State theo implementation/contract: `DRAFT → WAITING_DEPENDENCIES → READY → IN_FLIGHT → ACKED`; lỗi có `CONFLICT`, `REJECTED`, `PAUSED_RETRY`, `UNKNOWN_OUTCOME`, capability có `BLOCKED_CONTRACT`/`AUTH_REQUIRED`. Không ép các tầng thành một cờ success.
- Media: temp → close → SHA-256 → atomic rename → SQLite commit. Không gửi bytes/hash placeholder. Giữ media/vault/journal pending qua logout/restart; upload complete hoặc 100% không phải file `VERIFIED`, không phải nộp hồ sơ.
- Durable journal trước POST. Actor/environment/session/resource, payload/version/key và signed bytes giữ nguyên. Timeout/cancel/lost response giữ unknown outcome, đọc receipt/mapping và replay đúng body/key; không tạo intent/key mới để né kết quả chưa rõ.
- Signed batch chỉ PM/Crew theo API-130 (không cấp PM route Mobile); ECDSA P-256, SPKI DER Base64, chữ ký P1363 64 byte, canonical bytes theo wire, không thay bằng `JSON.stringify`. Reporter/Drone không tự dùng signed batch.
- Cross-session recovery: tách immutable identity của lệnh cũ khỏi current authenticated authority. Chỉ tiếp tục khi đúng actor/role/environment/partition, device registration và session-confirm hiện hành, không revoked; kiểm lại sau mọi await. Không rewrite old scope/body/key để qua guard. Áp dụng nhất quán cho batch, admission-upload intent, draft writer và media access; CAS phải giữ nguyên source.
- Admission phải đối chiếu batch/origin/task/assignment/snapshot/actor/registration, captures/hash/size/purpose và mapping server thật. Lost create response phải đọc mapping trước quyết định replay; RECEIVED không tự POST lại. Không fake file ID hoặc durable ACK.
- Batch 200 hoặc local ACK chưa là durable per-item receipt. Chỉ reconcile bằng receipt/readback đúng origin/effect/kind/source/actor, server version và quyền thực. Không dùng source UI yếu hơn validated reader để cấp start origin/mutation authority.

## 5. Source, test và checkpoint hiệu quả

- Giữ test cạnh phạm vi/module đang có; thêm case vào suite phù hợp, không nhét mọi thứ vào file test tổng hay đổi fixture/assertion để ép PASS. Artifact QA tạm ở nơi hiện có, không tạo báo cáo/log trùng nội dung.
- Trong lúc sửa dùng targeted check theo rủi ro; full regression ở checkpoint runtime trước commit theo code-review. Không chạy lại cả bộ sau mỗi sửa nhỏ. Evidence cũ chỉ tái dùng nếu SHA/source liên quan, command, environment và preconditions vẫn khớp; ghi rõ giới hạn.
- Hoàn tất checkpoint hiện tại trước mở checkpoint khác. Đo tiến độ bằng thao tác dùng được + dữ liệu BE/receipt xác nhận, không đếm file/test/commit làm độ hoàn thành.
- Thiếu decision/contract/discovery/fixture: ghi EXPECTED/ACTUAL, operation/actor/SHA, guard hoặc output chặn, label gap đúng `AGENTS.md`, bước phụ thuộc và phần độc lập tiếp tục. Không hợp thức hóa gap bằng adapter giả; không hỏi lại quyết định đã có.
