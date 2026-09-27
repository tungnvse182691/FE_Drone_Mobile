# RoadGuard — 06. Realtime và polling

**Phiên bản:** FE-R3-v1 • **Ngày:** 27/09/2026 • **Trạng thái:** đặc tả đề xuất để FE/BE/QA review, chưa xác nhận triển khai.

## 1. Quyết định baseline

FRD §7 chọn polling ở MVP; OpenAPI không có WebSocket/SSE hub, ticket endpoint hoặc replay cursor. **V1 triển khai polling trước.** Notification bền vững trên server, socket chỉ hỗ trợ độ trễ; không dùng event để ACK offline operation, nghiệm thu hay quyết định quyền cuối cùng.

| Resource | Endpoint baseline | Poll interval FE đề xuất khi visible |
|---|---|---|
| Notification | GET `/notifications?limit=25` | 30 giây + jitter |
| Jobs đang chạy | GET `/jobs/{jobId}` hoặc endpoint job cụ thể trong Location | 5 giây tăng đến 30 giây |
| Task detail đang mở | GET đúng inspection/survey/repair resource | 30 giây hoặc refresh khi focus |
| Dashboard | GET `/projects/{projectId}/dashboard` | 60 giây |

Đây là budget FE đề xuất, không SLA server. Pause background web tab/offline/logout; app foreground/focus refetch có debounce. Poll không chồng request, coalesce cùng resource, tôn trọng 429 cooldown; terminal job dừng. Long job sau thời gian UI budget vẫn RUNNING, chuyển màn hình theo dõi thay vì gán FAILED. So version equality để phát hiện thay đổi, không so thứ tự opaque version.

## 2. Event extension conditional

Nếu cần realtime, đề xuất transport WebSocket theo protocol `roadguard.events.v1`; URI thực tế/hub framework chờ BE, không tự gọi `/hub` hay `/ws`. Schema máy đọc trong contracts chỉ mô tả business hint, không phải AsyncAPI của server đã có.

```json
{
  "schemaVersion": 1,
  "eventId": "11111111-1111-4111-8111-111111111111",
  "type": "job.changed",
  "occurredAt": "2026-09-26T18:00:00Z",
  "resource": {
    "type": "job",
    "id": "22222222-2222-4222-8222-222222222222"
  }
}
```

Payload chỉ có ID đã được authorize và event metadata. Không đưa ảnh, vị trí, nội dung báo cáo, token hoặc message tự do vào event. Không đưa version làm monotonic sequence; FE nhận event thì invalidate/refetch resource có quyền.

| Event đề xuất | Khi BE phát, sau commit/outbox | FE |
|---|---|---|
| notification.created | Notification bền vững đã tạo cho recipient | Refetch danh sách, badge không tăng mù vì duplicate |
| task.changed | Assignment/mode/state/scope thay đổi | Refetch task; giữ snapshot local immutable, kiểm conflict |
| policy.changed | Policy version mới được phát hành theo quyết định quyền | Refresh metadata; không âm thầm thay policy của việc đang làm offline |
| repair.changed | Attempt/review/acceptance thay đổi | Refetch, chỉ thể hiện state server đã xác nhận |
| job.changed | Job progress/status được lưu | Refetch job, terminal dừng poll |
| file.verified | Server xác minh file thành công | GET metadata rồi unblock dependency |
| access.changed | Quyền/membership thay đổi | Refetch `/me` và scope, đóng view trái quyền, giữ local partition bảo vệ |

`access.changed` không bảo đảm đến được client trước mất quyền; middleware vẫn enforce mỗi request. Event system không phát cho group chỉ vì client gửi projectId. Subscribe server-derived channels theo actor/membership/assignment.

## 3. Kết nối và bảo mật đề xuất

Browser WebSocket API không nhận arbitrary Authorization header như fetch. Không bỏ access token dài hạn lên query string. Nếu dùng BFF cookie session: same-origin WSS, kiểm Origin allowlist và CSRF/cross-site handshake policy. Nếu chọn bearer/native hoặc SPA không BFF: cần BE thiết kế short-lived one-use connection ticket được lấy qua HTTPS authenticated API, ràng buộc user/scope/expiry; endpoint chưa có. Không tự chế ticket phía FE.

Refresh HTTP token không tự cập nhật quyền socket. Hết phiên/revoked: đóng socket, chờ auth coordinator; không gửi refresh token qua socket. Server phải revalidate subscription khi quyền thay đổi. Không expose socket URL chứa secret trong telemetry.

## 4. Delivery và reconnect

Đề xuất at-least-once hints, có thể trùng/mất/đảo thứ tự; eventId dùng dedup cache có giới hạn, không là số sequence. Không áp payload đè local. Reconnect exponential jitter 1–30 giây đề xuất; reset sau kết nối ổn định; offline/cooldown dừng. Heartbeat chỉ triển khai theo protocol đã chốt; không giả browser gửi được WebSocket protocol ping frame tùy ý.

Không có durable replay contract v1: sau reconnect refetch tất cả resource đang theo dõi + danh sách task/notification trang đầu, tiếp tục pagination khi cần. Không dùng EventPage audit như feed đồng bộ incremental. Nếu tương lai thêm stream cursor, cần retention, gap/reset/tombstone, ack và scope revocation contract trước bật; eventId/occurredAt không đủ làm cursor.

Unknown event schema/type: bỏ event có telemetry, fallback refetch có rate budget; không crash app. Event đến trước GET đọc thấy commit phải được outbox/consistency BE giải quyết; FE có một revalidate có backoff, không tự đánh thành công. Polling vẫn là fallback khi socket không hoạt động.
