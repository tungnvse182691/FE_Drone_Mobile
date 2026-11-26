# OFFLINE GROUP 1-3-4-6 — ANTIGRAVITY HANDOFF (2026-11-26)

## 0. Tóm tắt điều hành

- **FE Mobile:** `D:\Do_AN_Drone\FE_AppMobile`, branch `main`, ahead on `origin/main` (`092edda86cd6336163ff224b3b5e298a68711bb7`, chưa push), gồm các commit bổ sung sau `5d9c8af`:
  - `fcdb189` — `fix(offline): support 3-session A->B->C admission recovery and atomic draft CAS` (P1-A `A->B->C` lineage qua `session-confirm` không `revocation`; P1-B bảo toàn `createKey`, `completeKey`, `coordinates`, `postRepairCapture`, `offlineUpload`, `verified`/`upload` + SQLite CAS `UPDATE ... WHERE id=? AND kind=? AND payload=?`)
  - `423b23e` — `test(offline): add P1-B CAS race test and repair sign diagnostic`
  - Commit cuối cùng bổ sung chẩn đoán `CrewOfflinePanel` và cập nhật handoff.
- **BE & Web (read-only):** `RoadGuardSystem-develop` branch `develop`, HEAD `b8f718dd372b9aa8b2923045fdcd82dd0e5e0583` (`roadguard-crew-sandbox-{api-1,mailpit-1,sql-1,minio-1}`).
- **APK QA trên `emulator-5554`:** `D:\Do_AN_Drone\FE_AppMobile\android\app\build\outputs\apk\release\app-release.apk` (SHA256 `D5DB216F00474312961BE99A8F5B918E145E2059075486F33AA36457AEB05774`, đã cài đặt và test trực tiếp trên `emulator-5554`).
- **Quality Gates sau chỉnh sửa cuối:**
  - `npx tsc --noEmit`: **PASS** (`0`).
  - `git diff --check`: **PASS** (`0`).
  - Targeted Group 3 & P1-A/B/C tests: `c10bc-journal.test.cjs` + `c10bc-workflow.test.cjs` **55/55 PASS**; Group 3 media/DB crypto (`encrypted-database.test.cjs`, `offline-local-file-crypto.test.cjs`, `offline-media-access.test.cjs`, `crew-media-vault.test.cjs`, `reporter-media-vault.test.cjs`) **25/25 PASS**.
  - Full regression (`node --test --test-concurrency=4 tests/*.test.cjs`): **2244/2244 PASS** (`0 fail, 0 cancelled, 0 skipped`, `281,570.8 ms`).

---

## 1. Khôi phục MinIO QA & Kết nối Android

- **Root cause:** `roadguard-crew-sandbox-minio-1` chỉ bind `127.0.0.1:19101->9000/tcp`, trong khi BE ký presigned URL với host `http://192.168.1.211:19101`.
- **Khôi phục an toàn:** Chạy user-mode local TCP forwarder (`192.168.1.211:19101 -> 127.0.0.1:19101`), giữ nguyên presigned URLs, API image và Docker volumes; `adb reverse tcp:18181 tcp:18181` đang hoạt động.
- **Kiểm tra thực tế:**
  - Windows: `127.0.0.1:18181` -> `200`, `127.0.0.1:19101` -> `200`, `192.168.1.211:19101/minio/health/live` -> `HTTP 200`.
  - Android `emulator-5554`: `192.168.1.211:19101/minio/health/live` -> `HTTP/1.1 200 OK`, upload thật thành công cho cả Reporter và Crew.

---

## 2. Ma trận nghiệm thu 3 vai trò (Groups 1, 3, 4, 6)

| Vai trò / Luồng | Trạng thái | Kết quả & Evidence thực tế |
|---|---|---|
| **Operator (`2fb2b846`, 51.45 MB MP4)** | `ANDROID_E2E_VERIFIED` + `HTTP_VERIFIED` | Đã hoàn tất upload `51,449,564` B qua MinIO `192.168.1.211:19101` và submit thành công (`SUBMITTED`, `version=AAAAAAAGUo0=`), không tạo duplicate. |
| **Reporter (`3ec0b71f`)** | `ANDROID_E2E_VERIFIED` + `HTTP_VERIFIED` | Sửa lỗi `DocumentPicker` bị `useFocusEffect` blur xóa ảnh (`a1247ca`). Test trên `emulator-5554`: chọn ảnh, nhập `"QA offline reporter E2E 20261126"`, double-tap `Gửi phản ánh` -> upload `100%` -> `VERIFIED` -> `POST /reports` tạo **1** report `3ec0b71f-a406-49ae-8098-350779c312ce` (`version=AAAAAAAGWwI=`, evidence `abcf71d2-4d2e-4ca4-bf69-398a32bc4fa2`, `fileId=6e74d10f-e1a3-4051-ab26-ec0f7d8185d4`, `EVIDENCE_BYTES=148988`); BE readback `COUNT: 1`; `am force-stop` + mở lại không duplicate. |
| **Crew FIELD (`cd648179`)** | `ANDROID_E2E_VERIFIED` + `HTTP_VERIFIED` | Khôi phục cross-session `signed-field-batch` có kiểm soát sau `session-confirm` (`6a5aaaa`) và resolve `firstStartOriginId` (`095c2185-ceeb-45c9-b975-1d71784cc2ca`) từ snapshot/journal/matching retained editor source (`ea28498`, `f780a18`, `ae50691`, `1bfcb12`). Test offline trên `emulator-5554`: nhập `2.5 cm` (`RULER`), `Lý trình 50 m`, chụp 1 ảnh `BEFORE` (`Chờ tải`), tắt Wi-Fi/Data -> nhấn `Ký hồ sơ từ nháp đã lưu` -> `Đã ký hồ sơ từ nháp đã lưu`. Bật mạng -> tab `Đồng bộ` nhấn `Gửi gói đã ký` -> upload MinIO -> `VERIFIED` -> exact replay -> `RECONCILED` (`Lịch sử đã xác nhận (4)`). BE readback `GET /projects/.../field-inspection-tasks/cd648179...` xác nhận `STATUS: Submitted`, `VER: AAAAAAAGYfA=`, `SUB: f2402317-24ac-43d9-b5c3-c2a3edb6c1da`. |
| **Crew REPAIR (`4755fa5d` `REPAIR_ASSESSMENT`, `a8ed2e80`)** | `4755fa5d` `REPAIR_ASSESSMENT` `ANDROID_E2E_VERIFIED` + `HTTP_VERIFIED`; `REPAIR_EXECUTION_START/FINISH` `BLOCKED_BY_BE` / `BLOCKED_POLICY` | Trên `emulator-5554` (APK `D5DB216F...5774`), `4755fa5d-72d6-488e-8896-2c40e4ca1c59` (`InProgress`, `firstStartOriginId=5376cd8a-df37-4281-b1ce-880ff1f47a53`, `itemId=57145baa-69c9-4f40-9371-397110a183bb`) đã nhập `3.5 cm` (`RULER`, `QA_repair_ruler`), `Lý trình 50 m`, chụp 1 ảnh `BEFORE` -> ký `REPAIR_ASSESSMENT` -> gửi qua `Đồng bộ` -> upload MinIO -> `VERIFIED` -> `RECONCILED` (`Lịch sử đã xác nhận (7)`). BE readback `GET /projects/72f84201-c001-4000-8000-000000000001/field-inspection-tasks/4755fa5d-72d6-488e-8896-2c40e4ca1c59` xác nhận `repairContext.itemVersion` chuyển từ `AAAAAAACe5g=` sang `AAAAAAAGbWA=`. Bước kế tiếp `REPAIR_EXECUTION_START` ở mode `NORMAL` bị BE chặn hợp lệ (`RepairWorkflowRepository.Execution.cs:127`: `normal_plan_not_approved`, cần PM/Supervisor phê duyệt `ApprovedBy`/`ApprovedPlanHash` và không có tài khoản PM/Supervisor trong QA sandbox; toàn bộ fixture `FAST_TRACK` trên BE đã `EXECUTION_EXPIRED` từ 2026-11-16). `a8ed2e80` fail-closed `offline_repair_first_start_required` do `originalVerifiedStart: null`. |
| **Nhóm 3 — Mã hóa DB, Media & Cache** | `LOGIC_TESTED` & `NATIVE_VERIFIED` (`emulator-5554`) | Kiểm tra `run-as com.hoanghai.roadguard` trên `emulator-5554`: `files/SQLite/roadguard.encrypted.v1.db` (`471,040` B, cập nhật `2026-11-26 13:43`), `files/roadguard-media-v1/` (**18** bucket dirs chứa `.rgc` encrypted containers). Dữ liệu plaintext cũ được giữ nguyên để chờ duyệt xóa riêng (`REMAINING_CLEANUP_APPROVAL`): `files/SQLite/roadguard.db` (`143,360` B), `files/crew-field/` (`4` ảnh `.jpg`), `files/drone-sources-v1/` (`3` `.mp4`, gồm `51,449,564` B), `files/reporter-photos-v1/` (`8` ảnh), `cache/Camera/` (`9` ảnh). |
| **Nhóm 4 — Cô lập & Phục hồi** | `ANDROID_E2E_VERIFIED` + `LOGIC_TESTED` (`2241/2241`) | Xác minh `cross-session` có `session-confirm` không adopt nhầm lệnh cũ, giữ nguyên `old.identity`/`body`/`key`, không tạo import cycle (`crew-flow-recovery.test.cjs` PASS), cold-start fail-closed và cô lập 3 vai trò không `pm clear`. |
