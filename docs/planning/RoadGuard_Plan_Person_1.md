---
# RoadGuard FE_AppMobile — Kế hoạch Person 1
> **Người thực hiện:** [Tùng]  
> **Giai đoạn:** Foundation + Auth + Drone + Project Manager  
> **Phân vai nghiệp vụ:** Toàn bộ luồng **"Thượng nguồn"** — Khởi tạo hệ thống → Lệnh bay → Xác minh AI → Gộp đợt sửa → Trình phê duyệt  
> **Mục tiêu bàn giao:** App chạy được, Auth/Drone/PM hoàn chỉnh, Crew/Sup là placeholder để Hoàng làm tiếp

---

## PHASE 1.0 — Scaffold & Nền móng (Foundation)

> **Kết quả kỳ vọng:** `npx expo start` không crash, cấu trúc folder đúng theo `BOOTSTRAP_PROMPT.md`, TypeScript 0 lỗi

- [ ] **1.0.1** Khởi tạo: `npx create-expo-app FE_AppMobile --template blank-typescript`
- [ ] **1.0.2** Cài đủ dependencies theo BOOTSTRAP_PROMPT.md Mục "Dependencies cần cài"
- [ ] **1.0.3** Cấu hình `app.json`: scheme `roadguard`, plugins, package `com.cattuong.roadguard`, backgroundColor `#C9A227`
- [ ] **1.0.4** Tạo `src/design-tokens.ts` — màu, typography, spacing, radius (lấy đúng từ BOOTSTRAP_PROMPT.md)
- [ ] **1.0.5** Đặt font `Sansation.ttf` vào `assets/fonts/` (tải thủ công — không có trên Google Fonts)
- [ ] **1.0.6** Tạo `src/types/enums.ts` — 8 enums: `RoleCode`, `SyncStatus`, `IntegrationStatus`, `DefectStatus`, `Severity`, `RepairBatchStatus`, `FieldInspectionTaskStatus`, `MeasurementType`
- [ ] **1.0.7** Tạo `src/types/domain.ts` — đủ interfaces gồm các field gap đã bồi (`instrument_name`, `measurement_method`, `measured_at`, `location` Point, `evidence_file_id`, `road_section_version_id`)
- [ ] **1.0.8** Tạo bộ Components: `Button`, `Card`, `Chip`, `InputField`, `BottomNav`, `SafeAreaScreen`, `FAB`, `Toast`, `StatusBadge`, `EmptyState`, `ViewFinder`
- [ ] **1.0.9** Tạo `src/store/auth.ts` — Zustand: user, role, token, login/logout
- [ ] **1.0.10** Tạo `src/store/offline.ts` — Zustand: queueCount, pendingItems
- [ ] **1.0.11** Tạo `src/offline/schema.sql` — DDL 6 bảng: `local_draft`, `outbox`, `media_file`, `survey_cache`, `defect_cache`, `task_cache`
- [ ] **1.0.12** Tạo `src/offline/database.ts` — SQLite init + CRUD helpers
- [ ] **1.0.13** Tạo `src/offline/checksum.ts` — SHA-256 (expo-crypto), tính TRƯỚC khi gửi
- [ ] **1.0.14** Tạo `src/offline/upload-queue.ts` — Worker: QUEUED→UPLOADING→SERVER_CONFIRMED, retry max 5, quá ngưỡng→INVALID
- [ ] **1.0.15** Tạo `src/api/client.ts` — Axios + interceptor (401, must_change_password)
- [ ] **1.0.16** Tạo mock fixtures: `src/api/mock/auth.ts`, `surveys.ts`, `defects.ts`, `repair-batches.ts`
- [ ] **1.0.17** Tạo `app/_layout.tsx` — Root: SessionProvider + AuthGuard

**📝 Nghiệm thu 1.0:** `npx expo start` OK + `npx tsc --noEmit` = 0 lỗi → Xuất `docs/worklogs/P1-00-scaffold-completion.md`

---

## PHASE 1.1 — Phân khu Xác thực `(auth)` — 3 màn

- [ ] **1.1.1** `app/(auth)/_layout.tsx` — Stack layout, không BottomNav
- [ ] **1.1.2** `app/(auth)/index.tsx` — M-AUTH-01: Splash (logo Cát Tường vàng đồng)
- [ ] **1.1.3** `app/(auth)/login.tsx` — M-AUTH-02: Đăng nhập, điều hướng theo role
- [ ] **1.1.4** `app/(auth)/force-change-password.tsx` — CN10: chặn mọi màn, bắt đổi password

**📝 Nghiệm thu 1.1:** → Xuất `docs/worklogs/P1-01-auth-completion.md`

---

## PHASE 1.2 — Phân khu Phi công Drone `(drone)` — 7 màn

- [ ] **1.2.1** `app/(drone)/_layout.tsx` — BottomNav 4 tab: Home / Requests / Sync / Profile
- [ ] **1.2.2** `app/(drone)/home.tsx` — M-DRONE-01: Dashboard Nguyễn Văn An (CT-2089)
- [ ] **1.2.3** `app/(drone)/requests.tsx` — M-DRONE-02: Danh sách yêu cầu (FAB bottom:96 right:16)
- [ ] **1.2.4** `app/(drone)/request-detail.tsx` — M-DRONE-03: Chi tiết #REQ-KS-089
- [ ] **1.2.5** `app/(drone)/upload.tsx` — M-DRONE-04: Nạp video/SRT từ thẻ SD + offline queue
- [ ] **1.2.6** `app/(drone)/log.tsx` — M-DRONE-05: Nhật ký chuyến bay
- [ ] **1.2.7** `app/(drone)/sync.tsx` — M-DRONE-06: Đồng bộ (StatusBadge)
- [ ] **1.2.8** `app/(drone)/profile.tsx` — M-DRONE-07: Hồ sơ cá nhân

**📝 Nghiệm thu 1.2:** → Xuất `docs/worklogs/P1-02-drone-completion.md`

---

## PHASE 1.3 — Phân khu Project Manager `(pm)` — 14 màn ⭐ PHẦN NẶNG NHẤT

> **Màn hình:** M-PM-01 → M-PM-15  
> ⚠️ Gộp: `M-PM-06/14` → 1 file `verify-b.tsx` | `M-PM-07/M-CREW-05` → 1 file `field-task.tsx` | `M-SUP-07` KHÔNG thuộc phase này

- [ ] **1.3.1** `app/(pm)/_layout.tsx` — BottomNav 4 tab: Home / Surveys / Verify / Profile
- [ ] **1.3.2** `app/(pm)/home.tsx` — M-PM-01: Dashboard Nguyễn Thùy Lan (PM-0428)
- [ ] **1.3.3** `app/(pm)/surveys.tsx` — M-PM-02: Danh sách khảo sát (FAB bottom:96 right:16)
- [ ] **1.3.4** `app/(pm)/create-survey.tsx` — M-PM-03: Tạo yêu cầu khảo sát
- [ ] **1.3.5** `app/(pm)/ai-inbox.tsx` — M-PM-04: Hộp thư xác minh AI (Defect OPEN)
- [ ] **1.3.6** `app/(pm)/verify-a.tsx` — M-PM-05: Xác minh Bounding Box AI
- [ ] **1.3.7** `app/(pm)/verify-b.tsx` — **M-PM-06/14 GỘP** — So sánh đa kỳ & Baseline
- [ ] **1.3.8** `app/(pm)/field-task.tsx` — **M-PM-07/M-CREW-05 GỘP** — Giao đo thực địa + nhập GroundTruthMeasurement
  > 🔴 **UD-05:** Defect chỉ VERIFIED sau khi có FieldInspectionTask đạt chuẩn — KHÔNG shortcut
- [ ] **1.3.9** `app/(pm)/batching.tsx` — M-PM-08: Gộp đợt sửa
  > 🔴 **UD-06:** `estimated_total_cost` = SUM tự tính — KHÔNG có input nhập tay
- [ ] **1.3.10** `app/(pm)/submit-approval.tsx` — M-PM-09: Trình duyệt #REQ-045 (42.500.000 VNĐ)
- [ ] **1.3.11** `app/(pm)/resubmit.tsx` — M-PM-10: Chỉnh sửa & gửi lại (REVISION_REQUIRED)
- [ ] **1.3.12** `app/(pm)/submitted-tab.tsx` — M-PM-11: Tab đã gửi duyệt
- [ ] **1.3.13** `app/(pm)/assign-crew.tsx` — M-PM-12: Giao việc Crew sau APPROVED
- [ ] **1.3.14** `app/(pm)/wo-confirm.tsx` — M-PM-13: Xác nhận nghiệm thu hoàn thành
- [ ] **1.3.15** `app/(pm)/profile.tsx` — M-PM-15: Hồ sơ PM

**📝 Nghiệm thu 1.3:** Login PM → luồng: Inbox AI → Verify B → Field Task → Batching → Submit → Assign Crew → Xuất `docs/worklogs/P1-03-pm-completion.md`

---

## PHASE 1.4 — Placeholder Crew & Supervisor (bàn giao Hoàng)

> Tạo đủ file với placeholder UI — KHÔNG cần logic, chỉ cần routing không 404

- [ ] **1.4.1** `app/(crew)/_layout.tsx` + 10 file `.tsx` placeholder
- [ ] **1.4.2** `app/(sup)/_layout.tsx` + 7 file `.tsx` placeholder
- [ ] **1.4.3** Xác nhận: 4 vai trò chuyển đổi được, BottomNav render đúng

**📝 Nghiệm thu 1.4:** → Xuất `docs/worklogs/P1-04-placeholder-completion.md`

---

## BÀN GIAO CHO HOÀNG

- [ ] `git push` branch `phase-1-complete`
- [ ] Thông báo Hoàng: clone về, `npm install`, `npx expo start` → fill vào `(crew)` và `(sup)`
- [ ] Hoàng đọc `docs/planning/RoadGuard_Plan_Person_2.md`
