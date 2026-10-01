# RoadGuard — 12. Quyết định cần chốt và contract gaps

**Phiên bản:** FE-R3-v1 • **Ngày:** 27/09/2026 • **Trạng thái:** đặc tả đề xuất để FE/BE/QA review, chưa xác nhận triển khai.

## 1. Quy tắc áp dụng

Các mã FE-GAP bổ sung cho TECH-GAP/RTM-GAP. [Decision register](../../../../planning/V2/V2-3_DECISION_REGISTER.md) supersede nhãn OPEN lịch sử đúng phạm vi; business decision đã có không bị hỏi lại, còn wire/runtime/test gate vẫn giữ. “Chặn” là gate trước khi tuyên bố production đầy đủ, không chặn thiết kế/mock/capture an toàn.

Giữ nguyên baseline YAML. Bổ sung contract chỉ sau PO/BE/FE review và version hóa. JSON Schema/TS trong gói phản ánh bản gốc, không lén thêm endpoint. Realtime schema và local types được đặt tên proposed/local để không nhầm wire contract đã có.

| ID | Khoảng trống có căn cứ | Owner đề xuất | Quyết định / deliverable cần có | Ảnh hưởng |
|---|---|---|---|---|
| FE-GAP-01 | 36A/37 đã chốt transport và pilot TTL/OTP; runtime/session/reuse/provider tests chưa có | BE/Security | Web server session 30m idle/12h max; Android access15m/rotating refresh30d; OTP10m/5 tries/resend limits; implement/test compatibility | Chặn auth production verification, không chặn quyết định |
| FE-GAP-02 | 36A chọn secure HttpOnly cookie + server session cho web | FE/BE/Security | CSRF, CORS, logout/revocation, data-protection deployment và compatibility với bearer hiện tại | Chặn session web runtime |
| FE-GAP-03 | D25 xác nhận chưa tích hợp Google/Microsoft SSO | PO/BE | Không thêm OAuth vào baseline; tạo decision mới nếu scope đổi | Deferred, không chặn email/password |
| FE-GAP-04 | List chưa filter/sort/total và cursor snapshot semantics | BE/FE | Allowlist query, stable order, cursor expiry/isolation/error, read-model fields | Chặn filter/sort server nâng cao |
| FE-GAP-05 | Sync chỉ 3 kind; taskId REPAIR_START mơ hồ, offline evaluation chưa có | BE/BA/FE | Define ID aggregate, phase evaluation, expectedVersion nguồn; survey/rework dùng endpoint đúng hoặc extension | Chặn sync đầy đủ Fast Track/Approval offline |
| FE-GAP-06 | Upload thiếu received parts/required headers/session expiry/abort | BE/Storage | Server reconciliation part ledger, PUT idempotence, CORS ETag, checksum/verify terminal recovery | Chặn cam kết resume sau mất ACK |
| FE-GAP-07 | Snapshot thiếu assignmentId/hash/schema/geometry; chưa có repair/survey pack | BE/BA | Snapshot scoped đủ metadata, file provenance, destination, readiness và version ràng buộc | Chặn pack tác nghiệp hoàn chỉnh |
| FE-GAP-08 | Dedup retention/status lookup chưa chốt | BE | Operation-level dedup lâu đủ cho offline không TTL, tombstone/lookup/unknown outcome sau expiry | Chặn retry muộn an toàn |
| FE-GAP-09 | D05/D06/42A đã chốt handover/rescue authority; chưa có wire lifecycle/API | BA/BE/Security | Acknowledgement/conflict/rescue grant/receipt, original actor, device/key proof và atomic race tests | Chặn xử lý conflict end-to-end, không phải business OPEN |
| FE-GAP-10 | Sync deviceId chưa rõ client installation hay thiết bị bay | BE/BA | Không dùng Device model/firmware/parser làm mặc định; chốt enrollment/trust/reinstall/actor binding | Chặn enrollment sync production |
| FE-GAP-11 | Realtime chưa endpoint/auth/replay | BE/FE | Giữ polling MVP; chỉ bổ sung transport/ticket/session và fan-out nếu scope được duyệt | Conditional |
| FE-GAP-12 | 38 chọn file/dataset limits; hostname/rate/provider multipart detail chưa có | DevOps/BE/PO | Áp config pilot, điền URL/CORS/part sizing/session TTL và benchmark network/provider thực | Chặn environment release |
| FE-GAP-13 | D24: Android offline; web cần mạng cho nghiệp vụ, không cam kết PWA full | FE | Thiết kế cache/draft web trong scope; PWA full cần decision mới | Closed business scope; runtime delivery external |
| FE-GAP-14 | Evidence provenance chi tiết DD chưa có đủ field wire | BE/BA | Bind source kind/report photo/survey frame/measurement/file/hash/time/attempt, không ép nhãn bằng file ID đơn thuần | Chặn tái dùng BEFORE audit đầy đủ |
| FE-GAP-15 | Policy evaluator thiếu rounding, multiple rule logic, exclusions máy đọc | BA/BE/FE | Rule schema AND/OR, precision, unknown behavior, version engine và test vectors đối xứng | Chặn tự động ELIGIBLE offline |
| FE-GAP-16 | RepairAttempt DB/API states và Actor scope projection chưa map đủ | BE/FE | Enum mapping có version; membership/assignment read model để UI không suy quyền từ role | Chặn state/action UI tương ứng |

## 2. Quyết định mặc định dùng để viết bộ tài liệu

- Web React/TypeScript/Vite là ứng viên theo nguồn, không xác nhận repo đã dùng. Android Kotlin là baseline tác nghiệp offline.
- D25: email/password + Reporter email OTP một lần; chưa có SSO. D36A: web secure cookie/server session, Android access/refresh token; runtime compatibility chưa được suy là implemented.
- Polling MVP; socket hint optional. Không xây event bus như điều kiện để đồng bộ được.
- Cursor pagination theo YAML; filter/sort mới chỉ đề xuất, không tự gửi tham số chưa khai báo.
- Offline capture giữ không TTL tác nghiệp. Server auth/assignment/version checks vẫn chạy khi reconnect.
- Không tự quyết định ngưỡng Q03. D05/D06/42A áp dụng cho conflict/rescue; wire/security tests còn gate. Không yêu cầu Supervisor duyệt từng Fast Track trước thi công.

## 3. Ba câu hỏi ưu tiên để chốt bản tiếp theo

1. Cung cấp contact/ETA cho external Web/Android/AI teams khi integration scheduling cần; ownership đã chốt bởi D44.
2. Cung cấp hostname/provider/license và deployment constraints để hoàn thiện environment, CORS, storage multipart và offline map; không bịa endpoint/provider.
3. Cung cấp real video/SRT/route JSON bytes khi làm parser/integration validation; schema/mock không bị chặn trong lúc chờ.

Thiếu các input kỹ thuật trên không phủ nhận quyết định nghiệp vụ. Q04/Q17 workshop nay tập trung wire lifecycle, security và test matrix, không hỏi lại authority đã chốt.

## 4. Thứ tự hiện thực đề xuất

Sprint/effort chưa ước lượng. Thứ tự dependency: contract auth/error/config → typed client + runtime schema → local durability + partition → download pack → media upload recovery → command sync/dedup → conflict/revocation → full field UAT. Realtime sau polling ổn định. API gaps ảnh hưởng toàn vẹn dữ liệu phải resolve trước tuyên bố hoàn tất offline, không đẩy sang cosmetic backlog.

## REVIEW-01

Historical REVIEW-01: catalog/401 đã sửa; khi đó TTL, Q02/Q04/Q17 còn ghi OPEN. Decision register ngày 28/09 supersede business labels này bằng D03/D05/D06/36A/37/42A. FE-GAP-05 amendment vẫn `NOT_ENABLED` cho tới khi schema/ordering/fixtures/runtime được hoàn thiện; Q03 technical basis vẫn mở.

## V2(3) amendment — 2026-09-28

This document follows `planning/V2/V2-3_DECISION_REGISTER.md`. D01-D28 and 32-44 apply at their recorded business status. `APPROVED_DESIGN`, `APPROVED_PILOT_CONFIG`, policy and targets are not runtime or empirical verification. Offline evaluation and AI two-stage processing remain contract/runtime gaps until schema, fixtures and provider evidence pass.
