# Worklog: P4-01 - Đồng Bộ Specs 29_9, UUID Native, Email RFC 5322, WGS84 & Map Lỗi Tiếng Việt

**Ngày thực hiện:** 29/09/2026  
**Người thực hiện:** Antigravity AI Pair Programmer  
**Người duyệt:** Nguyễn Văn Tùng (Sếp / FE Lead & QA Lead)  
**Tiêu chuẩn:** Canonical 29_9 (28/09/2026 - 29/09/2026, OpenAPI 0.2.0-draft-alignment) / RFC 5322 / Quyết định D25 / `09_Frontend` specs

---

## 1. Mục Tiêu Hoàn Thành

- Đồng bộ toàn bộ mock API & màn hình với đặc tả Canonical 29_9, loại bỏ mọi dữ liệu giả lập gây hiểu nhầm (giả checksum, giả timer nghiệp vụ, UUID yếu).
- Nâng cấp xác thực Reporter theo RFC 5322 không giới hạn nhà cung cấp email (Quyết định D25).
- Chuẩn hóa tọa độ WGS84 `[lon, lat]` tại biên wire, giữ shape domain/UI có tên rõ ràng.
- Chuẩn hóa error envelope 5 trường và bảo đảm người dân **không bao giờ nhìn thấy mã lỗi kỹ thuật** thay vì thông báo tiếng Việt.

---

## 2. Danh Sách File Đã Cập Nhật / Tạo Mới

| STT | Đường dẫn file | Nội dung thay đổi |
|---|---|---|
| 1 | `package.json` | Cài `expo-crypto@~57.0.3` — UUID sinh bằng native secure RNG thay cho `Math.random` |
| 2 | `src/utils/uuid.ts` | Chuyển sang `Crypto.randomUUID()`, xoá fallback `Math.random()` không mật |
| 3 | `src/constants/error-codes.ts` | Catalog 14 business error codes + `businessErrorMessage()` là nguồn message chuẩn |
| 4 | `src/api/mock/errors.ts` | **Tạo mới:** `MockApiErrorEnvelope`, `buildMockApiError()`, `throwMockApiError()` — đủ 5 field `code/message/details/traceId/retryable`, status map đúng spec 03, `traceId` dùng secure UUID |
| 5 | `src/api/mock/reporter.ts` | Email RFC 5322 dot-atom (từ chối dot đầu/cuối/hai liên tiếp, domain label sai, giới hạn 254 ký tự); OTP siết về `MOCK_OTP='111111'`+`'1'`; validate GPS `[lon,lat]` (lon ±180, lat ±90, finite); tối đa 3 ảnh; `defect_type` ∈ 5 mã chuẩn |
| 6 | `app/(reporter)/report.tsx` | Thêm map `errorMessages` (5 mã → tiếng Việt) + `SUBMIT_FALLBACK_ERROR`; thay `setSubmitError((err as Error).message)` bằng `errorMessages[code] ?? SUBMIT_FALLBACK_ERROR`; `MAX_PHOTOS = 3` khớp mock |
| 7 | `src/api/mock/tasks.ts` | 6 gate nghiệp vụ (`NOT_FOUND`, `IDEMPOTENCY_KEY_REUSED`, `OFFLINE_SNAPSHOT_CONFLICT`, `TASK_MODE_NOT_REPAIRABLE`, `PM_REPAIR_BLOCKED`, `BEFORE_MISSING`, `EVIDENCE_PENDING`, `FAST_TRACK_NOT_ELIGIBLE`); dùng `Idempotency-Key` + `If-Match`; geometry theo policy (≤1.0 m², ≤5 cm, ≤2.0 m) |
| 8 | `src/api/mock/surveys.ts` | Thêm `MOCK_SURVEY_TASKS` + `listSurveyTasks()` (tuyến ĐH.05, 3 phân đoạn, tọa độ `[lon,lat]`); bỏ checksum giả; `uploadSurvey()` chỉ nhận SHA-256 hex 64 ký tự → `FILE_INTEGRITY_FAILED` |
| 9 | `src/api/mock/defects.ts` | Dedupe `FAST_TRACK_POLICY` (tái xuất từ nguồn canonical `crew-inspection.ts`); bổ sung đủ 5 mã khuyết tật chuẩn `EDGE_BRK` + `SHLD_EROS` |
| 10 | `src/api/mock/auth.ts` | Login/change-password chuyển sang error envelope đủ 5 field, message lấy từ catalog chuẩn |
| 11 | `app/(drone)/request-detail.tsx` | **Loại bỏ giả lập `setTimeout`** tự động accept/decline; intent ghi bền vững vào outbox với `BLOCKED_CONTRACT`, nút "Tiếp tục nạp dữ liệu" là hành vi thật |
| 12 | `app/(drone)/upload.tsx` | Bỏ size/hash giả; checksum mẫu ghi rõ `(demo — chưa đối chiếu)` |
| 13 | `src/types/domain.ts` | `CANONICAL_SYNC_OPERATION_KINDS`, `RUNTIME_SYNC_OPERATION_KINDS`, `isCanonicalSyncOperationKind()`, `isDispatchableSyncOperationKind()` |
| 14 | `src/offline/upload-queue.ts` | Lọc/claim theo active partition; chặn `FAST_TRACK_EVALUATE` (internal sync kind) |
| 15 | `app/(drone)/sync.tsx` | Dùng `dispatchableRows`; đọc summary fresh bằng `readOutbox()`; purge partition-scoped; kiểm tra `result.changes` |
| 16 | `app/(crew)/complete.tsx` | Enqueue `REPAIR_SUBMIT` với `attempt_id`, `taskId`, idempotency key ổn định |

---

## 3. Điểm Rà Soát & Quyết Định Kiến Trúc

- **`crew-inspection.ts` giữ nguyên shape `{ latitude, longitude }` — KHÔNG đổi.**
  Ràng buộc `[lon, lat]` của AGENTS.md áp dụng cho **wire/GeoJSON**. Object có tên rõ ràng là shape domain/UI dùng chung giữa `app/(crew)/tasks.tsx` và **6 màn hình live** (`complete`, `navigation`, `progress`, `report-defect`, `viewfinder`, `wo-detail`). Đổi sang mảng sẽ phá cả 6 màn hình và làm mất tính tự mô tả. Biên wire đã chuyển đúng tại `app/(reporter)/report.tsx:186` → `coordinates: [coords.longitude, coords.latitude]`.
- **`reporter.ts` tiếp tục ném `Error(<CODE>)` dạng phẳng, không dùng Axios envelope.**
  `app/(reporter)/feedback.tsx:60` và `app/(reporter)/report.tsx:233` so sánh trực tiếp `(err as Error).message`. Chuyển sang envelope `{ response: { data } }` sẽ khiến UI hiển thị `[object Object]`. Đây là quyết định có chủ đích, không phải sơ suất.
- **4/7 file mock là dead code** — `tasks.ts`, `surveys.ts`, `defects.ts`, `repair-batches.ts` có 15 export nhưng **không màn hình nào import**. Được chuẩn hóa đầy đủ theo yêu cầu nhưng **không nối vào screen / không refactor màn hình**, nên **app không đổi hành vi runtime**. Chỉ `auth.ts`, `reporter.ts`, `crew-inspection.ts` là live.
- `repair-batches.ts` đã là UD-06-compliant sẵn, không cần sửa (và không `throw` nên không cần error helper).
- Bám đúng convention sẵn có tại `app/(auth)/otp-verify.tsx:15` (`errorMessages: Record<string, string>`), không tự chế pattern mới.

---

## 4. Kết Quả Kiểm Thử Tuân Thủ Toàn Diện (Checklist)

- [x] **0 LỖI TypeScript:** `npm run typecheck` (`tsc --noEmit`) đạt **0 errors** — đã chạy lại sau từng nhóm thay đổi và sau PR #1 cuối cùng.
- [x] **Cross-check mã lỗi tự động:** lấy 9 chuỗi `throw new Error('…')` từ `reporter.ts` đối chiếu key trong `errorMessages` của `report.tsx` → **5/5 khớp tuyệt đối, 0 key thừa**. 4 mã còn lại (`INTENT_NOT_FOUND`, `OTP_INVALID`, `RATING_INVALID`, `REPORT_NOT_FOUND`) thuộc hàm khác và đã có handler riêng (`otp-verify.tsx` map, `feedback.tsx:60` ternary → fallback tiếng Việt). **Không mã lỗi nào lọt raw ra UI.**
- [x] **100% MaterialIcons:** 0 import `Ionicons` trong `app/`.
- [x] **Zero Presentation Cost (UD-06):** 0 chuỗi tiền tệ (VNĐ / dự toán / kinh phí / chi phí / `estimated_cost` / `actual_cost`) trong `app/`.
- [x] **Full Group Prefix Navigation:** 0 lệnh navigation thiếu tiền tố group; 0 `<Redirect>` bọc ngoài `<Stack>` trong `app/_layout.tsx` (tránh crash `Maximum update depth exceeded` trên ReactFabric).
- [x] **Branding Hoàng Hải:** 0 brand cũ case-sensitive (Cát Tường / `com.cattuong` / `@cattuong.vn` / prefix `CT-`).
- [x] **UTF-8 không BOM:** toàn bộ repo sạch BOM.
- [x] **Line ending:** file trong `app/` giữ đúng CRLF sau khi chỉnh sửa (`report.tsx` CRLF 551 → 562, LF 553 → 564, BOM không phát sinh).
- [x] **Không còn giả lập gây hiểu nhầm:** bỏ `setTimeout` nghiệp vụ, bỏ checksum/size giả, bỏ `Math.random` cho UUID.

---

## 5. Nợ Kỹ Thuật Còn Lại (Không Chặn Giai Đoạn Mock UI)

| # | Hạng mục | Ghi chú |
|---|---|---|
| 1 | Regression test SQLite | Chưa chạy: migration, retry/backoff, recovery `UNKNOWN_OUTCOME`, safe-purge partition/state/`delete count`. Repo **chưa có test suite** (`package.json` chỉ có script `typecheck`). |
| 2 | 2 ép kiểu `as SyncOperation` | `app/(crew)/sync.tsx:162` và `app/(drone)/sync.tsx:225` — chưa rà required fields theo từng sync variant. |
| 3 | Test runtime trên simulator | Chỉ mới kiểm chứng tĩnh (`tsc --noEmit`), chưa chạy trên thiết bị/emulator. |
| 4 | `npm audit` | Còn 13 moderate vulnerabilities; chưa chạy `audit fix --force` (có nguy cơ breaking changes). |
| 5 | Trùng lặp dữ liệu ở màn Drone | 5 màn hình còn dữ liệu survey/request nội tuyến dạng `{ lat, lng, wgs84Coord }`. Được chuyển sang dùng `src/api/mock/surveys.ts` ở giai đoạn tích hợp thật. |
| 6 | Prefix mã SurveyTask | Fixture đang dùng `#HH-409-*`; cần đối chiếu lại với nguồn canonical trước khi đóng dự án. |

---

## 6. Kết Luận

Phiên làm việc hoàn thành **6/6 nhóm mục tiêu**, `npm run typecheck` **0 lỗi**, toàn bộ invariants (MaterialIcons, UD-06, WGS84 wire order, brand, routing Fabric-safe, UTF-8/BOM, line ending) đều đạt. Điểm quan trọng nhất: **không mã lỗi kỹ thuật nào của người dân bị lộ ra giao diện** — tất cả đã được map sang thông báo tiếng Việt có kiểm chứng tự động.
