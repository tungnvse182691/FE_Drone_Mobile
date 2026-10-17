# Báo Cáo Nghiệm Thu & Thẩm Định Mã Nguồn — Code Review Worklog

- **Thời gian:** 2026-10-17 (UTC+7)
- **Người thẩm định:** AI Auto-Reviewer (theo ủy quyền QA Lead — RoadGuard Canonical 17_10)
- **Feature / Màn hình:** Phần 5 — Cross-cutting: (5.1) Fast Track eligibility server-driven qua API-146 · (5.2) GPS `PositionDto` có `accuracyMeters` + `source` · (5.3) kind đồng bộ offline → 6 giá trị canonical (Crew)
- **Nhánh / Commit:** `tung` @ `b89ebc4`
- **Vòng Auto-Fix đã chạy:** 1 / 5 (chỉ 1 vòng cần thiết; compiler xanh ngay từ checkpoint đầu)

---

## 1. Danh Sách Tệp Can Thiệp

| File | Thay đổi |
|---|---|
| `src/types/position.ts` | **Mới (5.2).** `PointDto`, `PositionDto`, `ReportEvidenceLocationDto`, `PositionSource`, `ReportLocationSource`; helpers `isPlausibleLatitude/Longitude`, `isZeroCoordinate`, `hasUsableCoordinate`, `locationSourceFor`, `toPositionSource`, `buildPosition`, `buildReportEvidenceLocation`; `ZERO_EPSILON = 1e-6`. Bất biến: `source` bắt buộc; `(0,0)` → `null`; `accuracyMeters` chỉ giữ số hữu hạn ≥ 0. |
| `src/api/uploads.ts` | **Sửa (5.2).** `LocationSource = ReportLocationSource`; re-export `buildReportEvidenceLocation`, `locationSourceFor` từ `position.ts` (xoá định nghĩa trùng cũ). |
| `src/store/uploads.ts` | **Sửa (5.2).** Thêm cột `accuracy_meters REAL` vào DDL `upload_ledger`; `migrateLedger(db)` chạy `PRAGMA table_info` + `ALTER TABLE ... ADD COLUMN` idempotent cho DB từ Phần 2; `UploadLedgerRow`, `UploadQueueItem`, `EnqueuePhotoInput` bổ sung `accuracyMeters`; `mapRow`/`persistItem`/`enqueuePhoto` truyền + guard toạ độ (`hasUsableCoordinate`), toạ độ rác → `locationSource='UNKNOWN'`, `accuracyMeters=null`. |
| `src/components/ViewFinder.tsx` | **Sửa (5.2).** `Coords` thêm `accuracyMeters: number \| null`; `watchPositionAsync` gán từ `location.coords.accuracy` (hữu hạn → số, ngược lại `null`). |
| `app/(reporter)/capture.tsx` | **Sửa (5.2).** `Coordinates` thêm `accuracyMeters`; `requestLocation` chặn `(0,0)` (→ `null` + thông báo trạng thái); `ingestAsset` dùng `hasUsableCoordinate` + truyền `accuracyMeters` + `locationSourceFor(usable)`. |
| `app/(reporter)/report.tsx` | **Sửa (5.2).** `Coords` thêm `accuracyMeters`; chặn `(0,0)` khi lấy vị trí; payload thêm `location_source` + `location: buildReportEvidenceLocation(...)` (khớp `CreateReporterReportRequestDto`/`ReportEvidenceInputDto`). |
| `src/api/mock/reporter.ts` | **Sửa (5.2).** `ReportCreate` mở rộng `location_source?: ReportLocationSource` + `location?: ReportEvidenceLocationDto \| null`. |
| `src/api/mock/crew-inspection.ts` | **Sửa (5.1) + (5.2).** (5.1) `startCrewFieldSession`/`updateCrewMeasurement` không còn tự đánh giá policy → `evaluation_code='PENDING'`, `policy_id=null`; `evaluateFastTrack` chuyển thành hàm nội bộ (không export); thêm `applyEligibility`, `RepairEligibilityInput`, `RepairEligibility`, `ELIGIBILITY_FAIL_CLOSED_MESSAGE`, `buildEligibilityReasons`, `fetchRepairEligibility` (mô phỏng API-146). (5.2) Thêm `FieldCoordinates` (khớp `accuracyMeters` của `PositionDto`), thay các literal `{ latitude; longitude }` bằng `FieldCoordinates`. |
| `app/(crew)/wo-detail.tsx` | **Sửa (5.1).** Thay `useMemo` đánh giá policy cục bộ bằng state `eligibility` (`idle/loading/ready/error`) + `useEffect` debounce 400ms gọi API-146, **fail-closed** (lỗi → `NOT_ELIGIBLE`). Bỏ `FAST_TRACK_POLICY`/`evaluateFastTrack` khỏi import, bỏ chip preset, bỏ câu "Ngưỡng quy chuẩn" → câu ghi chú policy trung tính. `primaryLabel/primaryDisabled/primaryBlockedReason` theo `fastTrackEligible` + `eligibilityPending`. |
| `src/offline/operation-kind.ts` | **Mới (5.3).** `OFFLINE_OPERATION_KINDS` = 6 giá trị canonical (`FIELD_ACCEPT`, `FIELD_START`, `FIELD_SUBMISSION`, `REPAIR_ASSESSMENT`, `REPAIR_EXECUTION_START`, `REPAIR_EXECUTION_FINISH`); type `OfflineOperationKind`; `isOfflineOperationKind`. Cố ý KHÔNG chứa alias/khoá cũ. |
| `src/types/domain.ts` | **Sửa (5.3).** Adapter wire: `LEGACY_OFFLINE_OPERATION_KIND_ALIASES`, `normalizeOfflineOperationKind(raw)` (trả `null` khi lạ → fail-closed), `toSyncWireKind(kind)` (`FIELD_SUBMISSION→INSPECTION_SUBMIT`, `REPAIR_EXECUTION_START→REPAIR_START`, `REPAIR_EXECUTION_FINISH→REPAIR_SUBMIT`; 3 kind không dispatchable → `null`). |
| `app/(crew)/sync.tsx` | **Sửa (5.3).** Dispatch: `normalizeOfflineOperationKind(payload.kind ?? item.kind)` → `toSyncWireKind` → `BLOCKED_CONTRACT` (`UNMAPPED_OPERATION_KIND`) nếu không ánh xạ được. `OUTBOX_KIND_LABELS` phủ 6 kind canonical + khoá legacy để hiển thị hàng cũ. |
| `app/(crew)/complete.tsx` | **Sửa (5.3).** Ghi outbox `kind='REPAIR_EXECUTION_FINISH'` (thay `REPAIR_SUBMIT`) cho cả `enqueue` và `local_draft`; cập nhật scope idempotency key. |
| `app/(crew)/report-defect.tsx` | **Sửa (5.3).** Ghi `kind='FIELD_SUBMISSION'` (thay `DEFECT_REPORT`). |
| `app/(crew)/viewfinder.tsx` | **Sửa (5.2).** `captureCoords` truyền `accuracyMeters: coords?.accuracyMeters ?? null` vào phiên hiện trường (không đánh rơi trường vừa thêm ở ViewFinder). |
| `src/offline/schema.sql` | **Sửa (5.3).** Cập nhật chú thích cột `kind`: `local_draft`/`outbox`/`offline_pending`/`offline_outbox` → trỏ bộ 6 canonical; `wire_command.kind` → kind wire của `SyncOperation`; `task_cache.kind` rút về đúng giá trị đang dùng (`policy`, `work_order`). |
| `src/offline/upload-queue.ts` | **Sửa (5.3).** Giữ `kind: string` (KHÔNG ép `OfflineOperationKind`) + doc-comment: Crew dùng 6 kind canonical, Drone/Reporter dùng từ vựng riêng; ánh xạ wire ở tầng dispatch. |

---

## 2. Kết Quả Compiler Gate

- **Lệnh:** `npx tsc --noEmit`
- **Kết quả:** **0 errors ✅** (exit code 0)
- **Checkpoint đã chạy:** sau 5.2 → 0; sau 5.1 → 0; sau khi sửa 5.3 (`complete`/`report-defect`/`schema.sql`/`upload-queue`) → 0; sau khi thread `accuracyMeters` qua `viewfinder.tsx`/`FieldCoordinates` → 0; xác nhận cuối trước commit → 0.

---

## 3. Kết Quả 8 Bộ Lọc Kỷ Luật

| # | Bộ lọc | Trạng thái |
|---|---|---|
| I-01 | Iconography (MaterialIcons only) | ✅ PASS — 0 `Ionicons` trong toàn bộ tệp thay đổi |
| I-02 | UD-06 Zero Cost | ✅ PASS — 0 tiền/VNĐ/dự toán/đơn giá trong `app/` |
| I-03 | Fabric-Safe Navigation | ✅ PASS — không đụng `app/_layout.tsx`; không thêm `<Redirect>`; route giữ group prefix |
| I-04 | Platform Scope (3 roles Mobile) | ✅ PASS — chỉ Crew/Drone/Reporter; không có màn PM/Supervisor mới |
| I-05 | Defect Types (5 mã BTXM) | ✅ PASS — 0 mã tự chế; `report-defect.tsx` giữ `defect_type_code` trong bộ 5, chữ nhập tay chỉ vào `defect_type_custom` |
| I-06 | Branding & Tech Standards | ✅ PASS — không LiDAR/asphalt; không tự chế prefix `HH-` |
| I-07 | Data Contract (Canonical 17_10) | ✅ PASS — GPS thiếu → `null`, **không** `{latitude:0, longitude:0}`; UUID dạng string; enum giữ chữ hoa; toạ độ wire `[lon, lat]` với `PositionDto.point` đúng thứ tự |
| I-08 | Error Handling Convention | ✅ PASS — fail-closed dùng message trung tính (không khẳng định "Gửi thất bại" khi chỉ là không đối chiếu được với máy chủ); không double-submit (cờ `submitting`/`eligibilityPending` chặn nút) |

---

## 4. Self-Healing Log — Nhật Ký Tự Sửa

### Attempt #1 / 5
- **Lỗi phát hiện:** Gate 3 (mục 6 của Phần 5) quét khoá offline cũ trong `src/offline/` còn dư 3 dòng:
  1. `src/offline/operation-kind.ts:8` — doc-comment còn viết literal `'DEFECT_REPORT'`, `'REPAIR_SUBMIT'`.
  2. `src/offline/schema.sql:64` — chú thích `task_cache.kind` liệt kê `flight_log | field_inspection_task | repair_item` (chỉ `policy`/`work_order` thực dùng).
  3. `src/offline/schema.sql:160` — chú thích `wire_command.kind` liệt kê literal kind wire (`REPAIR_SUBMIT`, …).
- **Hành vi đúng theo Canonical 17_10:** `src/offline/` phải sạch khoá cũ; việc ánh xạ canonical ⇄ kind wire phải nằm ở tầng `src/types/domain.ts`, không nằm trong tầng offline.
- **Fix đã áp dụng:** (1) diễn đạt lại comment theo ngữ nghĩa ("báo lỗi phát sinh", "nộp kết quả sửa chữa"); (2) rút gọn liệt kê về `'policy' | 'work_order'`; (3) trỏ về `RUNTIME_SYNC_OPERATION_KINDS` trong `src/types/domain.ts`.
- **Kết quả verify:** Gate 3 chạy lại → **0 match (PASS)**.

### Ghi chú (không phải lỗi cần fix)
- `src/types/position.ts:144` có literal `{latitude:0, longitude:0}` nhưng nằm trong **doc-comment mô tả điều CẤM** (bỏ hẳn khối `location` thay vì gửi toạ độ rác) → không phải vi phạm I-07.
- Không có vòng fix compiler nào cần thiết (compiler xanh ở mọi checkpoint).

---

## 5. Canonical 17_10 Alignment Check

- [x] **Fast Track server-driven:** app đọc eligibility qua API-146 (`fetchRepairEligibility`), fail-closed khi lỗi; **không** hardcode ngưỡng trong app (`evaluateFastTrack` không còn export, 0 match trong `app/`).
- [x] **MEASURE_ONLY chỉ đo, KHÔNG sửa:** `wo-detail.tsx` chặn hành động sửa và hiển thị nhánh trạng thái riêng cho `MEASURE_ONLY`.
- [x] **BEFORE bắt buộc trước Start Repair:** `primaryDisabled` gồm `!beforeSelected` (phải có `before_evidence_id`).
- [x] **Saved ≠ Sent ≠ Verified ≠ Done:** máy trạng thái outbox (`offline_outbox`/`LocalState`) giữ nguyên, không đánh tráo.
- [x] **Không có trường tiền tệ/VNĐ/đơn giá** trong bất kỳ màn hình nào.
- [x] **GPS:** thiếu toạ độ → `null`, cấm `(0,0)`; `accuracyMeters` không bịa số.
- [ ] **Optimistic UI:** không áp dụng cho phê duyệt/đóng hồ sơ (ngoài phạm vi Phần 5).
- [ ] **State Machine đầy đủ (skeleton/empty/error/offline/stale):** ngoài phạm vi Phần 5 (không sửa màn danh sách).
- [ ] **Offline badge xuyên màn hình:** ngoài phạm vi Phần 5.

---

## 6. Sai Lệch Đã Biết (Deviation) & Việc Cần Xác Minh Với BE Thật

**Sai lệch có chủ đích:**
1. `app/(crew)/report-defect.tsx`: `DEFECT_REPORT` → `FIELD_SUBMISSION` (không tồn tại kind canonical "defect report"; chọn kind canonical gần nhất).
2. Adapter `/sync/batches` đặt ở `src/types/domain.ts` (không nằm trong `src/offline/` như bản nháp ban đầu).
3. `/offline/import` + ký ECDSA P-256 (SPKI/DER/P1363) **chưa** làm — thuộc **Phần 7**.
4. Mở rộng nhỏ ngoài danh mục 5.2 gốc: `app/(crew)/viewfinder.tsx` + `FieldCoordinates` trong `crew-inspection.ts` để thread `accuracyMeters`.
5. `src/api/mock/surveys.ts` vẫn giữ `OperatorPointDto`/`OperatorPositionDto` riêng (tech debt, ngoài phạm vi).

**Cần xác minh với BE (`HoangAnhVu2207/RoadGuardSystem`, nhánh `huy-review`):**
- Hình dạng thực của `RepairEligibilityReadView` / khối `missingReasons` + `policyRevisionId` và status lỗi của **API-146**.
- BE có enforce ngưỡng server-side (không chỉ trả eligibility) hay không.
- Wire offline thật `/api/v1/projects/{projectId}/offline/import` + envelope ký (Phần 7).

---

## 7. Kết Luận

- **Trạng thái cuối:** ✅ **APPROVED FOR MERGE** (đã push `origin/tung` @ `b89ebc4`; `main` giữ nguyên `22a4983`).
- **Lỗi tồn đọng:** không có lỗi compiler/invariant.
- **Ghi chú:** File worklog này được ghi theo yêu cầu trực tiếp của Sếp (override điều kiện "không chạm `docs/`" của prompt Phần 5).
