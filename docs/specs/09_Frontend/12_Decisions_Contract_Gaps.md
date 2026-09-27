# RoadGuard — 12. Quyết định cần chốt và contract gaps

**Phiên bản:** FE-R3-v1 • **Ngày:** 27/09/2026 • **Trạng thái:** đặc tả đề xuất để FE/BE/QA review, chưa xác nhận triển khai.

## 1. Quy tắc áp dụng

Các mã FE-GAP mới bổ sung cho TECH-GAP/RTM-GAP và Q01–Q18 cũ; không thay thế hoặc tự đóng chúng. “Chặn” là gate trước khi tuyên bố feature production đầy đủ, không chặn soạn tài liệu/mock hoặc capture dữ liệu an toàn. Owner bên dưới là vai trò đề xuất, chưa phải người nhận task thực tế; không bịa deadline/effort.

Giữ nguyên baseline YAML. Bổ sung contract chỉ sau PO/BE/FE review và version hóa. JSON Schema/TS trong gói phản ánh bản gốc, không lén thêm endpoint. Realtime schema và local types được đặt tên proposed/local để không nhầm wire contract đã có.

| ID | Khoảng trống có căn cứ | Owner đề xuất | Quyết định / deliverable cần có | Ảnh hưởng |
|---|---|---|---|---|
| FE-GAP-01 | REVIEW-01: 401/code catalog đã bổ sung ở draft; TTL/rotation timeout/provider tests còn mở | BE/Security | Bổ sung status/code, TTL/session/reuse behavior; xác nhận credential invalid vs transient; test concurrent refresh | Chặn auth production |
| FE-GAP-02 | Web token persistence/BFF chưa chốt | FE/BE/Security | Chọn BFF cookie hoặc bearer threat model, CSRF/CORS/logout và endpoint; không chỉ env flag | Chặn session web production |
| FE-GAP-03 | OAuth chưa thuộc baseline | PO/BE | Xác nhận có/không SSO; nếu có chốt provider/PKCE/linking | Conditional, không chặn email/password |
| FE-GAP-04 | List chưa filter/sort/total và cursor snapshot semantics | BE/FE | Allowlist query, stable order, cursor expiry/isolation/error, read-model fields | Chặn filter/sort server nâng cao |
| FE-GAP-05 | Sync chỉ 3 kind; taskId REPAIR_START mơ hồ, offline evaluation chưa có | BE/BA/FE | Define ID aggregate, phase evaluation, expectedVersion nguồn; survey/rework dùng endpoint đúng hoặc extension | Chặn sync đầy đủ Fast Track/Approval offline |
| FE-GAP-06 | Upload thiếu received parts/required headers/session expiry/abort | BE/Storage | Server reconciliation part ledger, PUT idempotence, CORS ETag, checksum/verify terminal recovery | Chặn cam kết resume sau mất ACK |
| FE-GAP-07 | Snapshot thiếu assignmentId/hash/schema/geometry; chưa có repair/survey pack | BE/BA | Snapshot scoped đủ metadata, file provenance, destination, readiness và version ràng buộc | Chặn pack tác nghiệp hoàn chỉnh |
| FE-GAP-08 | Dedup retention/status lookup chưa chốt | BE | Operation-level dedup lâu đủ cho offline không TTL, tombstone/lookup/unknown outcome sau expiry | Chặn retry muộn an toàn |
| FE-GAP-09 | Q04/Q17 conflict và tài khoản khóa chưa có quyết định/API | PO/BA/Security | Actor xử lý, chấp nhận evidence thực tế, chuyển giao có audit, không bypass quyền | Chặn xử lý conflict end-to-end |
| FE-GAP-10 | Sync deviceId chưa rõ client installation hay thiết bị bay | BE/BA | Không dùng Device model/firmware/parser làm mặc định; chốt enrollment/trust/reinstall/actor binding | Chặn enrollment sync production |
| FE-GAP-11 | Realtime chưa endpoint/auth/replay | BE/FE | Giữ polling MVP; chỉ bổ sung transport/ticket/session và fan-out nếu scope được duyệt | Conditional |
| FE-GAP-12 | Hostnames, rate quota, file limit chưa được cung cấp | DevOps/BE/PO | Điền URL thật/CORS/timeout quota/count/size; benchmark network thực | Chặn environment release |
| FE-GAP-13 | Web offline có phải scope như Android không | PO/FE | Default tài liệu: web cache/nháp; Android full tác nghiệp. Nếu PWA full cần persistence/eviction/worker test riêng | Chặn cam kết PWA full |
| FE-GAP-14 | Evidence provenance chi tiết DD chưa có đủ field wire | BE/BA | Bind source kind/report photo/survey frame/measurement/file/hash/time/attempt, không ép nhãn bằng file ID đơn thuần | Chặn tái dùng BEFORE audit đầy đủ |
| FE-GAP-15 | Policy evaluator thiếu rounding, multiple rule logic, exclusions máy đọc | BA/BE/FE | Rule schema AND/OR, precision, unknown behavior, version engine và test vectors đối xứng | Chặn tự động ELIGIBLE offline |
| FE-GAP-16 | RepairAttempt DB/API states và Actor scope projection chưa map đủ | BE/FE | Enum mapping có version; membership/assignment read model để UI không suy quyền từ role | Chặn state/action UI tương ứng |

## 2. Quyết định mặc định dùng để viết bộ tài liệu

- Web React/TypeScript/Vite là ứng viên theo nguồn, không xác nhận repo đã dùng. Android Kotlin là baseline tác nghiệp offline.
- API REST bearer/email-password/OTP là baseline; OAuth và BFF production là conditional.
- Polling MVP; socket hint optional. Không xây event bus như điều kiện để đồng bộ được.
- Cursor pagination theo YAML; filter/sort mới chỉ đề xuất, không tự gửi tham số chưa khai báo.
- Offline capture giữ không TTL tác nghiệp. Server auth/assignment/version checks vẫn chạy khi reconnect.
- Không tự quyết định ngưỡng policy, Q04 conflict hoặc Q17 tài khoản suspend, không yêu cầu Supervisor duyệt sửa Fast Track trước thi công.

## 3. Ba câu hỏi ưu tiên để chốt bản tiếp theo

1. FE bạn muốn gồm **web quản trị + app Android Kotlin** như baseline, hay cần **web/PWA cũng tác nghiệp offline đầy đủ**? Nếu framework khác, cung cấp package/README repo.
2. Đăng nhập dùng **email/mật khẩu + OTP Reporter** hay thêm **Google/Microsoft SSO**? Web production có đồng ý BFF cùng origin để giữ token phía server không?
3. Có URL dev/staging/prod và BE đang chạy/repository để kiểm contract không? Nếu chưa, giữ placeholder và mock có nhãn.

Chưa có câu trả lời không làm mất bộ tài liệu; các default/gate được giữ rõ. Q04/Q17 cần workshop BA riêng trước nghiệm thu conflict; không gộp quyền xử lý vào câu hỏi chọn framework.

## 4. Thứ tự hiện thực đề xuất

Sprint/effort chưa ước lượng. Thứ tự dependency: contract auth/error/config → typed client + runtime schema → local durability + partition → download pack → media upload recovery → command sync/dedup → conflict/revocation → full field UAT. Realtime sau polling ổn định. API gaps ảnh hưởng toàn vẹn dữ liệu phải resolve trước tuyên bố hoàn tất offline, không đẩy sang cosmetic backlog.

## REVIEW-01

FE-GAP-01: đã sửa phần catalog/401 responses trong draft; rotation timeout/TTL/provider tests còn OPEN. FE-GAP-05: [amendment evaluation](../05_Technical/06_Sync_Evaluation_Amendment_Proposal.md) đã soạn nhưng NOT_ENABLED, không đóng gap. Hash gate tooling đã có, CI repository thực chưa cài. Các Q02/Q03/Q04/Q17 chưa APPROVED.
