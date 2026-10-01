# RoadGuard — 13. Nguồn và giới hạn xác minh

**Phiên bản:** FE-R3-v1 • **Ngày:** 27/09/2026 • **Trạng thái:** đặc tả đề xuất để FE/BE/QA review, chưa xác nhận triển khai.

## 1. Nguồn dự án đã đọc

- RoadGuard_FRD_SRS(1).md: FR-01/03/17–27, phần offline-first, polling MVP, tech direction.
- RoadGuard_Business_Rules(1).md: nguồn lịch sử; Q01-Q18 được crosswalk với D01-D28/32-44 trong decision register.
- Data_Dictionary.md: §9.4 evidence/attempt, §9.5 snapshot/sync/destination, Q04/Q17.
- RoadGuard_05_Auth_Permission_Model.md: actor/scope/session, offline và upload trust boundary.
- RoadGuard_08_Error_Handling_Convention.md: error/code, idempotency, sync outcomes, local errors.
- RoadGuard_07_Tech_Stack_Convention.md: web candidate, Android baseline, codegen và local durability.
- RoadGuard_OpenAPI_v1.yaml: nguồn trực tiếp cho 153 schema và133 operation, sao nguyên byte vào contracts.

Hash nguồn được ghi trong [source_manifest.original.json](../08_Delivery/FE_R3/source_manifest.original.json). Bộ này không đọc repository hay môi trường chạy vì chưa được cung cấp. Không tuyên bố endpoints đã triển khai, auth/cookie đã bật hoặc UAT đã pass.

## 2. Nguồn kỹ thuật sơ cấp, tra cứu 27/09/2026

| Nguồn | Phần dùng / giới hạn |
|---|---|
| [Android — Build an offline-first app](https://developer.android.com/topic/architecture/data-layer/offline-first) | Repository kết hợp local/network, durable queued sync; WorkManager là scheduler tham khảo. Toàn bộ quy tắc RoadGuard do nguồn dự án/thiết kế đề xuất quyết định |
| [Vite — Env Variables and Modes](https://vite.dev/guide/env-and-mode) | VITE_* được expose cho client; cấu hình build/mode. Không pin version framework |
| [MDN — WebSocket constructor](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket) | Browser constructor URL/subprotocol, không tham số arbitrary HTTP auth header |
| [MDN — Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) | Browser storage có quota/eviction; không coi PWA cache bền vững tuyệt đối |
| [MDN — Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine) | Chỉ là tín hiệu connectivity, không chứng minh API reachable |
| [MDN — Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After) | Header có delay-seconds hoặc HTTP-date |
| [RFC9700 — OAuth2 Security BCP](https://www.rfc-editor.org/info/rfc9700/) | Tham khảo hướng authorization code/PKCE và refresh rotation khi bổ sung OAuth; không tự thêm OAuth vào scope |

Các nguồn không quyết định threshold/TTL/quota của RoadGuard. Mọi con số timeout/poll/retry trong bộ này là đề xuất FE, cần benchmark và review với BE.

## 3. Thiếu dữ liệu hiện tại

Chưa có actual response samples, deployment hostname/provider, supported device matrix hoặc provider contract tests. D24/36A/37/38 và D05/D06/42A đã chốt scope/config/authority tương ứng; implementation compatibility, multipart detail và conflict/rescue wire lifecycle vẫn cần kiểm chứng. JSON Schema/TS/fixtures không thay provider/consumer tests.

## REVIEW-01 provenance

Manifest nguồn original mô tả input trước review. Canonical/snapshot hiện được sửa có chủ đích ở auth401 và info.version; hash mới trong contracts/contract.lock.json và báo cáo review. Không dùng hash nguồn cũ để chứng nhận contract hiện hành.

## V2(3) amendment — 2026-09-28

This document follows `planning/V2/V2-3_DECISION_REGISTER.md`. D01-D28 are approved business decisions; `APPROVED_PILOT_CONFIG` and `APPROVED_TARGET` are not empirical verification. The document must distinguish `contractStatus`, `implementationStatus`, and `verificationStatus`. Reporter email/password plus one-time email OTP is the approved authentication flow; web cookie transport, pilot limits, retention and performance values remain configuration/target registers. Fast Track uses measurement-only intake followed by a separately authorized PM repair task; policy framework, reopen, partial publication, handover/conflict, BEFORE incident, curing and traffic release remain explicit contracts. Offline evaluation and AI two-stage processing are proposed until schema, fixtures and runtime/provider evidence pass.
