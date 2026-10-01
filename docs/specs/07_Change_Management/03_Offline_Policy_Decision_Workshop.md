# RoadGuard - Offline/policy decision crosswalk

**Original agenda:** 27/09/2026. **Current crosswalk:** 28/09/2026.  
Nguồn hiện hành: [V2 decision register](../../../../planning/V2/V2-3_DECISION_REGISTER.md). Agenda cũ không phải bằng chứng phê duyệt, nhưng D03-D06 và 42A sau đó đã chốt business authority. Tài liệu này giữ gate thiết kế/kiểm thử còn lại, không hỏi lại quyết định đã có.

| ID | Business decision | businessStatus | Contract/verification gate còn lại | Affected scope |
|---|---|---|---|---|
| Q02 | Supervisor ban hành framework công ty; PM cấu hình/kích hoạt trong giới hạn; vượt giới hạn cần phê duyệt; không duyệt từng Fast Track. | `APPROVED` (D03) | Framework/profile/version/exception schema, permission matrix, audit và tests. | FR-15/18; P1-043..045 |
| Q03 | Fast Track giới hạn ở đường đã bàn giao đang bảo hành/bảo trì và method phù hợp; không có production threshold nếu thiếu hồ sơ. | `APPROVED_SCOPE` + `OPEN_TECHNICAL` (D04) | Hồ sơ method/material, unit/precision/AND-OR/exclusion/stop/release values và test vectors. | Policy/evaluator |
| Q04 | Đội mới chỉ start cùng scope sau xác nhận đội cũ dừng/bàn giao; PM có thể ghi căn cứ ngoài app; late work vào conflict. | `APPROVED` (D05) | Acknowledgement identity/scope/source, atomic reassign/start, conflict intake/resolve API và race tests. | FR-22; P1-057; P2-029 |
| Q17 | Supervisor cho phép handover dữ liệu; PM đúng project nhận; giữ original actor/source. Export cứu dữ liệu mã hóa chỉ khi còn truy cập thiết bị. | `APPROVED` (D06/42A) | Rescue grant/receipt, device/key proof, retention/chain of custody, endpoint/security/AC. | FR-22 rescue E2E |

## Required scenario design

Q04 contract phải phân biệt đội cũ chưa làm/đang làm/đã làm chưa sync; đội mới đã nhận/chưa nhận; policy đổi; PM block; case đã đóng. Client offline không bị thu hồi tức thì, nhưng snapshot không cho hai đội cùng bắt đầu một scope và late evidence không tự nghiệm thu.

Q17 contract phải phân biệt logout, token expiry, suspension, lost device và lost key. Không dùng PM login để giả Crew upload. Rescue chỉ nhận evidence trong scope được phép, giữ actor/time/source, không cấp quyền làm công việc mới.

Q03 dùng schema typed, whitelist operator và unit conversion. Missing task value trả `INSUFFICIENT_DATA`; invalid profile trả `INVALID_CONFIGURATION`. TEST template không cấp quyền sửa production.

## Completion gate

Business decision rows above không còn OPEN. End-to-end feature chỉ được `VERIFIED` sau contract review, implementation comparison và required tests. Core queue/durability/dedup độc lập có thể kiểm riêng; một happy path online không chứng minh FR-22.

## Backlog corrections

| Item | Current decision |
|---|---|
| Retention | 41A đã chọn policy dự án; thiếu warranty end giữ `WAITING_RETENTION_BASIS`; worker/hold/reference/race/restore vẫn cần thiết kế và test. |
| Route/mobile | D17/D18: GPX/ordered points hiện tại; phone GPS recorder later; real bytes/CRS/parser verification còn gate. |
| US-10 labels | 34A: PM review trong project, chỉ approved labels được export; map vào FR-36 và test permission/schema. |
| Web/Android/AI | D23/D24/44: external teams; BE owner chịu contract/adapter/fixtures/integration, contact/ETA chưa cung cấp. |
