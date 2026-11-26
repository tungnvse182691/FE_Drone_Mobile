---
name: code-review
description: Use when reviewing RoadGuard source or diffs, self-reviewing an authorized implementation checkpoint, or checking evidence and commit gates; select checks by scope and risk.
---

# Code review — quality gate

Đọc `AGENTS.md` cho authority và boundaries; implementation theo roadguard, UI theo DESIGN. Review source không phải nghiệm thu runtime. Không chạy mọi check sau từng edit nhỏ.

## 1. Mode và phạm vi

- `AUDIT_READ_ONLY` mặc định cho independent review: đọc/search/git show và báo trong chat; không sửa source/worklog/fixture/index/commit/BE. Phát hiện P0/P1 có proof phải báo sớm. Nếu owner chỉ giao review thì đề xuất sửa cụ thể, không tự implement.
- `IMPLEMENT_AND_SELF_REVIEW`: chỉ scope/allowlist được giao; đọc diff, tìm root cause, tự sửa và kiểm lại tối đa 5 vòng. Không nhận independent review là self-review, không đổi test/fixture/assertion để che lỗi hoặc giảm gate.
- Trước review ghi baseline/range/SHA/branch/WIP, mode, scope và evidence đã có. Chọn caller và đường đi có rủi ro, không bulk-read cả repo.

## 2. Chọn mức kiểm chứng

| Thay đổi | Trong lúc làm | Gate checkpoint trước commit |
|---|---|---|
| Markdown/rule thuần | Invariants trước/sau, link/path, metadata/routing/discovery | Đọc lại diff, kiểm cấu trúc instruction nếu có test phù hợp, `git diff --check`; không build/full runtime regression |
| Runtime TS/logic/API/offline | `npx tsc --noEmit` + targeted tests liên quan sau nhóm thay đổi | TypeScript 0 lỗi, targeted + full regression, diff/secret checks và các gate rủi ro bên dưới |
| UI/navigation | Các check runtime trên + đọc DESIGN, kiểm caller/route mount | Android thực, từng CTA/states/back/keyboard/scroll/safe area/persistence, screenshot trước/sau |
| Native/provider/build config | Kiểm cấu hình/source, targeted interoperability | Native build/device/key lifecycle và Android liên quan; Node không thay proof native |

Chạy lệnh full regression đã được repo/checkpoint chốt (hiện có `node --test --test-concurrency=4 tests/*.test.cjs`), ghi exact command/output/SHA/env. Kiểm script/config trước khi dùng, không mặc định lệnh cũ đúng mọi môi trường. Tái dùng evidence chỉ khi source liên quan và điều kiện không đổi; không suy PASS cho source sửa sau APK. Thiếu mandatory evidence ghi `NOT_RUN`/blocker. Khi prompt owner giao verification cho agent khác, checkpoint code đã qua gate trong phạm vi được giao được commit local với acceptance pending; ghi riêng gate Android/native/HTTP còn thiếu, không coi là nghiệm thu đầy đủ hoặc tự đánh dấu DONE. Task review bị cấm test/build thì chỉ đọc và phân biệt reported evidence với evidence tự chạy.

## 3. Checklist theo đường đi rủi ro

### Source, route và API

- Đọc diff + caller/type/test/config; route thực mount/reachable, đúng group và role, Root Stack ổn định; không chỉ kiểm chuỗi route.
- Method/path/actor/permission/body/header/version/idempotency theo pinned current BE. Verify preconditions và source lineage, không tự tạo API/enum/ID. Fail closed khi guard/contract thiếu; owner business khác implementation ghi gap, không tự duyệt wire.
- FastTrack API-146/policy/package/item/binding/itemVersion + BEFORE thật; MEASURE_ONLY không sửa, PM nghiệm thu, không Supervisor gate. NORMAL context không thay bootstrap. Correction cần lineage thật.
- Xác minh wrapper có caller (`API_CONNECTED`) khác HTTP đã chạy. HTTP phải ghi method/path/actor/fixture/status/receipt/readback và quyền nguồn; không mutation trên dữ liệu dùng chung.

### Offline, upload và recovery

- Durable journal trước POST, bất biến actor/env/session/resource/body/version/key/signed bytes. Double tap/concurrent call không tạo hai mutation. Retry/timeout/cancel/lost response không đổi key/body hoặc fake success.
- Persistence thật qua SQLite restart/force-stop, pending media/vault và journal còn nguyên; logout không mất dữ liệu. Complete upload khác `VERIFIED`; file verified khác submitted/finished/PM accepted.
- Per-item durable receipt/readback đúng origin/effect/kind/source, không lấy batch 200 làm ACK mọi item. Không fake rowversion/ID/hash hoặc dùng task ETag cho item.
- Cross-session recovery kiểm đồng thời immutable old record + current authority: actor/role/env/partition/registration/session-confirm/revocation, đổi session giữa await. Bao phủ old upload RECEIVED/UNKNOWN_OUTCOME, lost create response/remote mapping, old draft write/media access và CAS conflict; một FIELD mới gửi thành công không chứng minh recovery cũ.
- Editor/cache source phải kiểm saved identity/project/task/assignment/version/ETag/history/rejected/source snapshot và start origin. Không bỏ validation vì tránh import cycle.
- Error/409/412/428/retry/backoff theo operation; unknown code có fallback và giữ source để trace. Không tự retry auth/OTP hoặc biến token expiry local thành revocation offline.

### Security/privacy và contract isolation

- Actor/session/environment switch, role/device/registration mismatch và revoked/missing confirmation phải fail closed; kiểm guard sau await/restart. Không lấy cache/notification/local size làm authority.
- Không plaintext private key, secret/token/password/OTP/PII/signed URL trong source/log/evidence; SecureStore không tự chứng minh signer/hardware backing. Không lấp gap bằng runtime mock.
- Quét diff và caller bị ảnh hưởng cho privacy/secret. Quét icon/UD-06 trên toàn runtime UI `app/` và shared UI `src/`: chỉ MaterialIcons, không Ionicons; không tiền/định mức vật tư. `rg` exit 1 nghĩa không có match, exit ≥2 là lỗi tool; match cần đọc ngữ cảnh, không tự coi mọi chữ là vi phạm. Không xóa guard từ chối PM/Web role hợp lệ chỉ vì thấy tên role.

### UI/Android

- Đọc DESIGN và mobile-design đúng phần, xem Android thực trước/sau. Hierarchy/card/spacing/CTA nhất quán; sửa root cause trong scope, không chỉ text che sai state. Redesign lớn cần owner scope riêng.
- Mỗi CTA có mục đích riêng, handler, authority/precondition, busy/double-tap guard và kết quả xác minh. Disabled có lý do. Không duplicate action, navigation loop, dead end, raw UUID/enum/JSON hoặc fake success.
- Loading có kết thúc/recovery; phân biệt empty/no-permission/offline/error/stale. Kiểm picker chọn/cancel/focus/blur/unmount, session đổi, draft cũ/pending/supplement, back/re-entry và persistence.
- Keyboard không che input/CTA, scroll/safe area/responsive/font scaling/overflow, touch targets, screen reader/contrast và Reduce Motion. Screenshot trước/sau bắt buộc cho UI đổi; video không bắt buộc. Không kết luận UI đẹp từ JSX hay Android E2E từ Node tests.

## 4. Evidence và findings

| Label | Chỉ chứng minh |
|---|---|
| `API_CONNECTED` | Real wrapper/caller; chưa chứng minh HTTP |
| `LOGIC_TESTED` | Logic/fixture tests thực thi; không phải native/HTTP |
| `PROTOCOL_INTEROP_TESTED` | Byte/signature/reference parity trên vector và numeric domain đã chạy |
| `HTTP_VERIFIED` | Method/path/actor/fixture/status/readback thật, ghi read hay mutation |
| `NATIVE_VERIFIED` | Native provider/build/key lifecycle trên device với giới hạn |
| `ANDROID_E2E_VERIFIED` | Luồng Android thực đã chạy trên APK/source đã ghi |
| `NOT_RUN` | Chưa chạy, nêu lý do và gate còn thiếu |
| `BE_CONTRACT_GAP` / `BE_DISCOVERY_GAP` / `BE_FIXTURE_BLOCKED` | Thiếu contract / discovery / fixture; không gọi chung là BE chưa có API |

`PRODUCT_SOURCE_GAP` theo governance. Kết quả ghi rõ PASS/FAIL/BLOCKED/NOT_RUN theo từng trục; phân biệt tự kiểm với báo cáo lịch sử. `LOCAL_SAVED ≠ SENT ≠ FILE_VERIFIED ≠ WORK_FINISHED ≠ PM_ACCEPTED ≠ PUBLISHED`.

Mỗi finding: severity (P0 khẩn cấp/P1 cần sửa/P2 cần xử lý/P3 nhỏ), SHA + file:dòng, điều kiện/repro/call chain, EXPECTED/ACTUAL, tác động, evidence đã thực thi hay static, giới hạn và đề xuất sửa cụ thể. Không nâng một nghi ngờ thành lỗi đã chứng minh. Báo thiếu evidence riêng với lỗi runtime.

## 5. Commit gate

Đọc toàn diff cuối, đối chiếu allowlist/WIP và owner decisions, không lẫn runtime/BE/artifact ngoài scope. `git diff --check`, secret/privacy checks phù hợp và gates ở bảng trên phải có output. Stage từng đường dẫn; kiểm staged diff trước commit. Commit local chỉ checkpoint đủ gate, không push nếu owner chưa cho phép. Final ghi thay đổi/vì sao, evidence/SHA/env, risk/gaps, artifact cần giữ và gate chưa chạy; không lấy số test/commit làm nghiệm thu nghiệp vụ.
