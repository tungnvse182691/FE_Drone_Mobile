# RoadGuard — Quyết định trước freeze offline/policy

**Ngày:** 27/09/2026. **Trạng thái tất cả Q dưới đây:** OPEN / chưa có người dùng phê duyệt. Đây là agenda và decision template, không phải biên bản workshop đã diễn ra.

| ID | Cần quyết định cụ thể | Người cần tham gia (vai trò đề xuất) | Deliverable bắt buộc | Gate |
|---|---|---|---|---|
| Q02 | PM được activate trong policy công ty đến đâu? Ai sửa phạm vi/ban hành phiên bản? Quy tắc supersede task cũ? | PO/công ty, BA, PM, BE/Security | Permission matrix + state transitions + audit; không tự thêm Supervisor duyệt mọi lần sửa | FR-15/18 activation |
| Q03 | Loại lỗi/ngưỡng/đơn vị/precision, AND-OR nhiều rule, exclusions, biện pháp/dụng cụ/vật tư/hạn mức | PO/chuyên môn, PM, BA, BE/FE | Rule schema máy đọc, policy version và test vectors hợp lệ/biên/thiếu | FR-15/18 evaluation |
| Q04 | Đổi/thu hồi/chuyển đội khi máy đang offline: nhận lệnh lúc nào, chống sửa trùng, tiếp nhận việc đã làm và ai giải quyết? | PO, BA, PM, Crew, BE/FE | Ma trận từng case + state machine/endpoint conflict + actor/quyền/audit + AC | FR-22 conflict và FR-18 offline E2E |
| Q17 | Tài khoản suspend còn evidence: ai tiếp nhận, xác minh người/thiết bị, mã hóa/chuyển giao, liên kết hồ sơ và bảo toàn actor gốc? | PO, Supervisor, Security, BA, BE/FE | Quy trình rescue có quyền, retention/chain of custody, endpoints, AC; không đổi ownership âm thầm | FR-22 rescue E2E |

## Case phải bàn trong workshop

Q04: đội cũ chưa làm / đang làm / đã làm nhưng chưa sync; đội mới đã nhận / chưa nhận; policy đổi nhưng quyền cũ vẫn đủ / PM đã block; case đã đóng. Mỗi case cần quyết định ai xem evidence, ai có quyền chấp nhận/liên kết/tạo remediation, và trạng thái công việc tiếp theo. App không thu hồi tức thời trên máy mất mạng; không đưa TTL tác nghiệp trái quyết định cũ vào giải pháp.

Q17: user tự logout / token hết hạn / account bị suspend / thiết bị mất khóa / mất máy. Các trường hợp không giống nhau. Không thể dựa vào login của PM để upload như Crew; cần giữ actor/time/source và audit transfer. Quy trình export cứu dữ liệu phải có bảo vệ, không zip ảnh công khai như fallback tự động.

## Mẫu quyết định cho từng Q

- Decision ID và version; trạng thái OPEN / APPROVED / REJECTED / SUPERSEDED.
- Quyết định, phạm vi áp dụng và ngoại lệ; phần nào giữ nguyên nghiệp vụ cũ.
- Owner, người có thẩm quyền phê duyệt, ngày, bằng chứng phê duyệt.
- FR/BR/UC/AC/API/schema/state machine/permission/test cần cập nhật.
- Migration/compatibility cho task pack và app đang offline.
- Gate mở lại khi nào; test nào cần chạy, ai xác nhận.

Chỉ sau quyết định approved, contract cập nhật và tests pass mới ghi nghiệm thu end-to-end. Core durability/queue/dedup không phụ thuộc các lựa chọn này vẫn có thể phát triển và kiểm riêng. Không ghi cả FR-22 PASS chỉ từ một happy path online.

## Ưu tiên backlog đã rà lại

| Mục | Kết luận |
|---|---|
| Retention matrix | Có thể mở rộng sau, nhưng thời hạn giữ/xóa evidence, legal hold và dedup ledger cần chốt trước release các chức năng liên quan. Không xếp toàn bộ retention vào backlog xanh nếu app đã dọn/xóa hoặc retry muộn |
| Route track drone | Đã có GAP-02; tạo FR riêng khi Q14/Q15/Q18 và phạm vi Sprint2 chốt. Không tự thêm vào Sprint1 |
| US-10 duyệt nhãn | GAP-01/CR-017 đã có. Chốt bổ sung trace vào FR-36 hay FR riêng; không tự tạo FR-38 khi PO chưa chọn cách quản lý scope |
