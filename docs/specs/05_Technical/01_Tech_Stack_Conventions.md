# RoadGuard — 7. Tech Stack & Convention

**Phiên bản:** TECH-R3-2026-09-26-v1 • **Trạng thái:** thiết kế đề xuất dựa trên bộ RoadGuard R3. Chưa có repository, ERD hiện hành, OpenAPI thực tế hoặc môi trường chạy để đối chiếu. Không khẳng định endpoint/code/transaction dưới đây đã được triển khai.

**Ưu tiên nguồn:** [decision register](../../../../planning/V2/V2-3_DECISION_REGISTER.md) áp dụng D01-D28/32-44; chỉ gate kỹ thuật được register giữ lại còn mở. Không tự sửa enum số, chuyển DB, nâng framework hoặc đổi runtime/Done từ thiết kế.

## 7.1 Quyết định nền và chi tiết đề xuất

Kế thừa FRD §7: BE C#/.NET + SQL Server, Android Kotlin, map MapLibre, AI Python qua adapter. Web React/TypeScript/Vite là ứng viên từ FRD, chưa xác nhận framework repo. Không đổi PostgreSQL chỉ vì DD dùng kiểu logic JSONB/TIMESTAMPTZ; P2 map sang SQL Server đúng code hiện có.

| Lớp | Baseline định hướng | Convention / điều kiện |
|---|---|---|
| Backend | ASP.NET Core + EF Core; modular application + durable worker | Repo hiện có ưu tiên. Nếu mới và tương thích, .NET10 LTS là ứng viên theo nguồn Microsoft; không tự nâng checkout |
| DB/spatial | SQL Server; NetTopologySuite mapping đã kiểm | Chọn geometry/geography rõ; CRS transform adapter; SRID tag không tự transform |
| Storage/job | Object storage qua interface; DB outbox + worker | Không upload video qua metadata endpoint; không dùng in-memory queue làm nguồn sự thật |
| Web | React + TypeScript + Vite nếu chưa có baseline khác | TanStack Query cho server state; MapLibre cho map; cache không thay offline evidence store |
| Android | Kotlin; Room; WorkManager; CameraX/MapLibre Native theo thử nghiệm | Durable local DB/outbox + file store; không hứa OS luôn cho chạy nền |
| AI | Python worker/API adapter, PyTorch/OpenCV/FFmpeg theo benchmark | Model choice/weights/license chưa chốt; mock riêng; không DB direct business writes |
| Quan sát | Correlation/tracing theo FRD, OpenTelemetry là ứng viên | Không PII/secrets trong span/log |
| Contract | OpenAPI3.1.1 + JSON Schemas; codegen theo tool repo | Verify generator compatibility trước chọn package; pin versions trong lockfile |

Nguồn xác minh lựa chọn LTS: [Microsoft .NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), tra cứu 26/09/2026. Không pin patch từ bài viết; manifest/lockfiles của repo và bản bảo mật đã kiểm là nguồn version thực. Nguồn thư viện chi tiết giữ tại FRD §7–8; bản này không chọn model/package mới vượt các ứng viên đã nêu.

## 7.2 Cấu trúc thư mục đề xuất nếu repo chưa có convention

```text
src/
  RoadGuard.Api/              controllers, auth filters, error mapping
  RoadGuard.Application/     use cases, DTO mapping, validators, ports
  RoadGuard.Domain/          entities, invariants, value objects, domain events
  RoadGuard.Infrastructure/  EF mappings, repositories, storage, email, AI adapter
  RoadGuard.Worker/          outbox, upload verify, AI dispatch, export, retention
web/
  src/features/             auth, projects, routes, incidents, repairs, surveys, analytics
  src/shared/               API client, errors, UI primitives, map helpers
android/
  app/src/main/             feature screens, local DB, outbox, sync, media, maps
ai/
  app/                      contract adapters, manifests, pipelines, workers
  tests/                    adapter/schema/fixture checks
contracts/
  openapi/                  YAML pinned by version
  schemas/                  model/config/manifest snapshots
  fixtures/                 redacted contract examples
  generated/                generated clients, do not hand edit
tests/
  domain/                   permission/state/invariant tests
  integration/              API + DB + storage boundary tests
  contract/                 OpenAPI/provider/consumer validation
  e2e/                      field and approval workflows
docs/
  adr/                      decisions and superseded links
  migrations/               impact, backfill, rollback evidence
```

Đây là danh sách đường dẫn, không là cấu trúc đã có. Khi có repository: đọc AGENTS/README/solution/package files rồi mapping modules vào cấu trúc hiện hành; không di chuyển toàn code để giống template. Dependency: Domain không phụ thuộc EF/HTTP; Application điều phối qua ports; Infrastructure implement; Api/Worker là composition roots. Không bắt buộc mỗi thư mục thành microservice.

## 7.3 Naming và kiểu dữ liệu

| Loại | Quy ước đề xuất |
|---|---|
| C# | Types/methods PascalCase, locals/parameters camelCase; Async suffix; CancellationToken ở I/O; nullable enabled nếu tương thích repo |
| HTTP | plural resource nouns, lowercase kebab-case paths, actions rõ cho transition; operationId verb+resource camelCase |
| JSON | camelCase; UUID string; UTC DateTimeOffset; date-only cho ngày bàn giao; field có unit khi là số đo |
| SQL | Giữ convention/schema/enum hiện có; migration explicit; unique constraints cho dedup; không rename hàng loạt |
| TS | strict theo baseline; không any cho DTO; component PascalCase; generated client từ cùng YAML; không tự đổi response error shape |
| Kotlin | class PascalCase, fun/property camelCase; sealed result cho local saved/pending/synced/conflict; không nuốt lỗi sync |
| Python | module/function snake_case; typed input/output; schema version ở manifest; environment/requirements lock theo repo |
| IDs/events | UUID cho business ID; opaque version/ETag; event/operation ID riêng, không dùng timestamp làm unique dedup |
| Units | m/mm rõ; precision theo phép đo/policy; backend chuyển và audit; không dùng float so sánh equality ngưỡng khi chưa quy định precision |

DTO không expose password hash, security stamp, internal object key, cả Case cho Reporter hoặc signed URLs trong audit. Không parse opaque concurrency version như số sequence trên client. Không dùng status chung cho task/approval/repair/sync/acceptance.

## 7.4 Quy tắc hiện thực domain và persistence

- Command kiểm quyền hiện hành, version, required evidence, same-project, state transition trước commit. Với thao tác quyết định, audit và outbox nằm cùng transaction.
- Enum DB cũ được giữ; API strings map rõ. Bổ sung trạng thái phải có migration/compatibility và cập nhật state machine, RTM/test.
- Tệp immutable theo file ID/hash; evidence tái dùng giữ source/time/attempt. Thay nội dung tạo version, không mutate ảnh nguồn cũ.
- Map preview FE chỉ trợ giúp; tính mét/công bố dùng BE và CRS đã kiểm. Không tính độ sâu từ bbox hoặc chép GPS drone thành tọa độ lỗi.
- Async jobs persisted trước202; retry không nhân business object; worker lease/attempt ID và late result guard. Outbox at-least-once, consumer idempotent; không hứa exactly-once transport.
- Offline DB transaction lưu queue/metadata phù hợp với durability file; chỉ hiển thị “Đã lưu” sau an toàn. Cleanup chỉ bản server verified và người dùng chủ động chọn theo CN09.
- Mọi migration có before/after, backfill và rollback/recovery. Không tạo giá trị giả chỉ để NOT NULL pass. Field logical JSONB trong DD map SQL Server JSON representation theo repo, không lén thay database.

## 7.5 Chất lượng code, commit và CI — đề xuất

Mỗi task ghi FR/US/AC/API operationId, phạm vi Q đã chốt, acceptance test và phần out of scope. Review ưu tiên invariant/permission/data loss trước cosmetic. Không tái cấu trúc toàn module khi task là một delta nhỏ.

CI cần: build/lint/typecheck theo repo → schema/OpenAPI refs và breaking-change check → domain/integration tests theo rủi ro → migration check trên snapshot đã bảo vệ dữ liệu → secret/license checks → artifact version. Không cần test trùng implementation cho text/format nhỏ; bắt buộc meaningful tests cho quyền, retry/concurrency, evidence, state transitions và migration.

Generated code phải có header tool/version, từ YAML pin hash. Không sửa tay generated client; sửa source contract rồi regenerate. Build/lockfiles định danh dependency thật; không đưa “latest” vào manifest để tự nâng trong mỗi lần sinh code. Commit message theo convention repository; nếu chưa có, dùng `feat/fix/docs/test` và requirement ID. Không tự chọn cloud provider/deploy khi chỉ được giao viết đặc tả.

## 7.6 Mẫu giao task cho AI coding agent

```text
Nguồn: bộ RoadGuard R3 + TECH-R3 + OpenAPI hash đã review.
Mục tiêu: triển khai [FR/US/AC] qua [operationId].
Trước sửa: đọc repo instructions, tìm code/migrations tương ứng, liệt kê delta.
Giữ: enum/data legacy; quyền theo task mode/branch; owner/project guards.
Không tự chốt: Q còn mở, threshold policy, phạm vi Sprint, actor phát hành policy.
Thực hiện: DTO -> guard -> domain -> persistence/outbox -> API/error mapping -> client.
Kiểm: happy path + wrong role/scope + stale version + retry + missing evidence.
Bàn giao: files changed, build/test evidence, migration/recovery, remaining Q.
```

## V2(3) amendment — 2026-09-28

This document follows `planning/V2/V2-3_DECISION_REGISTER.md`. D01-D28 are approved business decisions; `APPROVED_PILOT_CONFIG` and `APPROVED_TARGET` are not empirical verification. The document must distinguish `contractStatus`, `implementationStatus`, and `verificationStatus`. Reporter email/password plus one-time email OTP is the approved authentication flow; web cookie transport, pilot limits, retention and performance values remain configuration/target registers. Fast Track uses measurement-only intake followed by a separately authorized PM repair task; policy framework, reopen, partial publication, handover/conflict, BEFORE incident, curing and traffic release remain explicit contracts. Offline evaluation and AI two-stage processing are proposed until schema, fixtures and runtime/provider evidence pass.
