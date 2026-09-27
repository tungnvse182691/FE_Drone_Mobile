# RoadGuard — 07. Environment và Base URL

**Phiên bản:** FE-R3-v1 • **Ngày:** 27/09/2026 • **Trạng thái:** đặc tả đề xuất để FE/BE/QA review, chưa xác nhận triển khai.

## 1. URL hiện có và cấu hình

OpenAPI chỉ khai báo relative base `/api/v1`. Chưa có hostname dev/staging/prod được cung cấp. Không dùng URL giả như endpoint thật hoặc đưa production credential vào mẫu.

| Môi trường | API URL | Realtime | Dữ liệu |
|---|---|---|---|
| Local web dev | `/api/v1` qua dev proxy đến BE local do repo cấu hình | disabled | Seed giả |
| Staging | `https://<staging-host>/api/v1` hoặc same-origin proxy, cần điền | disabled mặc định | Account test và dữ liệu đã bảo vệ |
| Production | `https://<production-host>/api/v1` hoặc same-origin BFF, cần điền | Chỉ bật khi contract approved | Quyền thật, không seed/mock |
| Android | Absolute HTTPS URL theo build flavor | optional | DB/key/queue partition theo môi trường |

`<...>` là placeholder, không phải DNS dùng được. Với Android localhost trỏ thiết bị đang chạy, không mặc nhiên trỏ máy BE. Địa chỉ dev phải do team cấu hình cho emulator/thiết bị; không tắt TLS validation trong release để tiện dev.

## 2. Vite candidate config

Mẫu nằm trong `config/env.development.example`, `env.staging.example`, `env.production.example`; sao chép thành `.env.development.local` hoặc file phù hợp dự án. Vite là ứng viên baseline, nếu repo dùng framework khác thì đổi adapter config, không ép migration.

Biến public đề xuất: VITE_APP_ENV, VITE_API_BASE_URL, VITE_AUTH_MODE, VITE_REALTIME_ENABLED, VITE_REALTIME_URL, VITE_API_TIMEOUT_MS, VITE_CONTRACT_VERSION, VITE_ENABLE_MOCKS. Tất cả giá trị env là string, parse boolean bằng `=== "true"`, parse integer và kiểm range; không dùng Boolean("false").

VITE_* được đưa vào bundle client: chỉ cấu hình công khai. Không chứa client secret, refresh token, signing key, DB connection, storage credential hoặc API key bí mật. Token bản đồ public nếu provider cho phép phải giới hạn domain/quota theo policy provider. Native app bundle cũng không là kho secret.

Config được kiểm trước request: URL phải same-origin relative bắt đầu `/` (không `//`) hoặc absolute HTTPS ở staging/prod; cấm placeholder còn tồn tại; reject userinfo và fragment; pin/allowlist API origin theo release. Kết hợp base + path giữ `/api/v1` đúng một lần, kiểm bằng unit test. Không lấy API URL từ query string người dùng.

## 3. Build và runtime config

Vite env thông thường được thay lúc build; đổi env trên máy chủ tĩnh không tự đổi bundle. Chọn build riêng từng môi trường hoặc public runtime config bootstrap đã version, không trộn cả hai âm thầm. `config/config.ts.example` không phải file triển khai đã kiểm; quy tắc trên là acceptance.

Staging/prod fail-closed nếu AUTH_MODE vẫn unset; prototype có thể bearer_memory. BFF mode chỉ được dùng sau endpoint/security spec chốt; không chỉ đổi env và kỳ vọng API bearer tự hỗ trợ cookie. Realtime disabled thì không mở kết nối và không cần URL.

## 4. CORS và HTTP headers

BE allowlist origin cụ thể theo environment; cần cho Authorization, Content-Type, Idempotency-Key, If-Match và CSRF header nếu BFF đã chốt. Expose ETag, Location, Retry-After và correlation header nếu có để browser đọc được. Cookie credentials không đi với wildcard origin. Không dùng `mode:no-cors` để chữa lỗi CORS vì response opaque không usable.

Storage signed PUT CORS riêng: allowed method/header đúng provider, expose part ETag nếu complete dùng ETag. Client không tự thêm RoadGuard auth header vào storage origin. Tải `/files/{fileId}/content` qua authenticated gateway; không đưa bearer vào img src query. Blob URL tạo từ fetch phải revoke khi bỏ view; permission change clear cache theo policy nhưng giữ evidence chưa sync ở vùng bảo vệ.

## 5. Partition, logs và release

Namespace local: environmentId + API origin + actorId + schemaVersion. Cấm sync queue staging sang prod khi đổi config. Đổi môi trường yêu cầu logout và chọn partition mới; không tự migrate IDs/credential. Hiển thị badge STAGING/DEV rõ; production không chứa mock switch cho user bật dữ liệu giả.

Release metadata gồm appVersion/buildId/contract hash/local schema version. Không gửi các header mới chưa thống nhất; ghi local diagnostics trước. Service worker nếu dùng: không cache auth, mutation, signed URL và dữ liệu account thiếu partition; update app không auto reload khi form/queue đang ghi. Không xóa IndexedDB bằng cleanup cache app shell.

## 6. Checklist bàn giao môi trường

Team điền hostname/origin, auth adapter, CORS expose, TLS, storage CORS, contract hash, mock disabled, telemetry redact và account test. Smoke test: login → `/me` → list → mutation idempotent → upload/complete → refresh → logout; kiểm bằng browser và Android đúng môi trường. Chưa có URL thật nên gói này không ghi smoke test đã chạy.
