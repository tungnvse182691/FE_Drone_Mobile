---
# RoadGuard FE_AppMobile — Kế hoạch Person 1
> **Người thực hiện:** [Tùng]  
> **Giai đoạn:** Foundation + Auth + Repair Crew + Project Manager  
> **Phân vai nghiệp vụ:** Quản trị nền tảng hệ thống + Khảo sát & Thi công hiện trường + Xác minh AI & Lập kế hoạch  
> **Mục tiêu bàn giao:** App chạy được, Auth/Crew/PM hoàn chỉnh, Drone/Sup là placeholder để Hoàng làm tiếp

---

## PHASE 1.0 — Scaffold & Nền móng (Foundation)

> **Kết quả kỳ vọng:** `npx expo start` không crash, cấu trúc folder đúng theo `BOOTSTRAP_PROMPT.md`, TypeScript 0 lỗi

- [x] **1.0.1** Khởi tạo: `npx create-expo-app FE_AppMobile --template blank-typescript`
- [x] **1.0.2** Cài đủ dependencies theo BOOTSTRAP_PROMPT.md Mục "Dependencies cần cài"
- [x] **1.0.3** Cấu hình `app.json`: scheme `roadguard`, plugins, package `com.cattuong.roadguard`, backgroundColor `#C9A227`
- [x] **1.0.4** Tạo `src/design-tokens.ts` — màu, typography, spacing, radius (lấy đúng từ BOOTSTRAP_PROMPT.md)
- [ ] **1.0.5** Đặt font `Sansation.ttf` vào `assets/fonts/` (tải thủ công — không có trên Google Fonts)
- [x] **1.0.6** Tạo `src/types/enums.ts` — 8 enums: `RoleCode`, `SyncStatus`, `IntegrationStatus`, `DefectStatus`, `Severity`, `RepairBatchStatus`, `FieldInspectionTaskStatus`, `MeasurementType`
- [x] **1.0.7** Tạo `src/types/domain.ts` — đủ interfaces gồm các field gap đã bồi (`instrument_name`, `measurement_method`, `measured_at`, `location` Point, `evidence_file_id`, `road_section_version_id`, `email`)
- [x] **1.0.8** Tạo bộ Components: `Button`, `Card`, `Chip`, `InputField`, `BottomNav`, `SafeAreaScreen`, `FAB`, `Toast`, `StatusBadge`, `EmptyState`, `ViewFinder`
- [x] **1.0.9** Tạo `src/store/auth.ts` — Zustand: user, role, token, login/logout
- [x] **1.0.10** Tạo `src/store/offline.ts` — Zustand: queueCount, pendingItems
- [x] **1.0.11** Tạo `src/offline/schema.sql` — DDL 6 bảng: `local_draft`, `outbox`, `media_file`, `survey_cache`, `defect_cache`, `task_cache`
- [x] **1.0.12** Tạo `src/offline/database.ts` — SQLite init + CRUD helpers
- [x] **1.0.13** Tạo `src/offline/checksum.ts` — SHA-256 (expo-crypto), tính TRƯỚC khi gửi
- [x] **1.0.14** Tạo `src/offline/upload-queue.ts` — Worker: QUEUED→UPLOADING→SERVER_CONFIRMED, retry max 5, quá ngưỡng→INVALID
- [x] **1.0.15** Tạo `src/api/client.ts` — Axios + interceptor (401, must_change_password)
- [x] **1.0.16** Tạo mock fixtures: `src/api/mock/auth.ts`, `surveys.ts`, `defects.ts`, `repair-batches.ts`
- [x] **1.0.17** Tạo `app/_layout.tsx` — Root: SessionProvider + AuthGuard

**📝 Nghiệm thu 1.0:** `npx expo start` OK + `npx tsc --noEmit` = 0 lỗi → Đã xuất `docs/worklogs/P1-01-foundation-completion.md`

---

## PHASE 1.1 — Phân khu Xác thực `(auth)` — 3 màn

- [x] **1.1.1** `app/(auth)/_layout.tsx` — Stack layout, không BottomNav
- [x] **1.1.2** `app/(auth)/index.tsx` — M-AUTH-01: Splash (logo Cát Tường vàng đồng)
- [x] **1.1.3** `app/(auth)/login.tsx` — M-AUTH-02: Đăng nhập, điều hướng theo role
- [x] **1.1.4** `app/(auth)/force-change-password.tsx` — CN10: chặn mọi màn, bắt đổi password

**📝 Nghiệm thu 1.1:** Đã hoàn thành và kiểm thử thực tế trên Android emulator.

---

## PHASE 1.2 — Phân khu Đội Sửa Chữa `(crew)` — 10 màn

> ⚠️ Đổi vai: Tùng đảm nhận và đã hoàn thành hoàn chỉnh 10 màn Repair Crew (M-CREW-01..11). Drone Operator chuyển cho Hoàng (Person 2).

- [x] **1.2.1** `app/(crew)/_layout.tsx` — BottomNav 4 tab: Trang chủ / Công việc / Đồng bộ / Hồ sơ
- [x] **1.2.2** `app/(crew)/home.tsx` — M-CREW-01: Dashboard Đội 01 (kết nối user động, 4 việc đang làm)
- [x] **1.2.3** `app/(crew)/tasks.tsx` — M-CREW-02: Danh sách công việc (Đang làm + Hoàn thành nghiệm thu)
- [x] **1.2.4** `app/(crew)/wo-detail.tsx` — M-CREW-03: Chi tiết lệnh công tác #WO-118
- [x] **1.2.5** `app/(crew)/navigation.tsx` — M-CREW-04: Dẫn đường GPS đến vị trí thi công
- [x] **1.2.6** `app/(crew)/viewfinder.tsx` — M-CREW-06: Kính ngắm chụp ảnh nghiệm thu (CameraView self-closing)
- [x] **1.2.7** `app/(crew)/progress.tsx` — M-CREW-07: Cập nhật tiến độ thi công
- [x] **1.2.8** `app/(crew)/report-defect.tsx` — M-CREW-08: Báo cáo lỗi phát sinh mới tại hiện trường
- [x] **1.2.9** `app/(crew)/complete.tsx` — M-CREW-09: Hoàn tất công việc & nghiệm thu
- [x] **1.2.10** `app/(crew)/sync.tsx` — M-CREW-10: Hàng đợi đồng bộ ngoại tuyến
- [x] **1.2.11** `app/(crew)/profile.tsx` — M-CREW-11: Hồ sơ kỹ thuật viên & đổi mật khẩu

**📝 Nghiệm thu 1.2:** → Đã xuất `docs/worklogs/P1-02-crew-completion.md`


---

## PHASE 1.3 — Phân khu Project Manager `(pm)` — 14 màn ⭐ PHẦN NẶNG NHẤT

> **Màn hình:** M-PM-01 → M-PM-15  
> ⚠️ Gộp: `M-PM-06/14` → 1 file `verify-b.tsx` | `M-PM-07/M-CREW-05` → 1 file `field-task.tsx` | `M-SUP-07` KHÔNG thuộc phase này

- [x] **1.3.1** `app/(pm)/_layout.tsx` — BottomNav 4 tab: Home / Surveys / Verify / Profile
- [x] **1.3.2** `app/(pm)/home.tsx` — M-PM-01: Dashboard Nguyễn Thùy Lan (PM-0428)
- [x] **1.3.3** `app/(pm)/surveys.tsx` — M-PM-02: Danh sách khảo sát (FAB bottom:96 right:16)
- [x] **1.3.4** `app/(pm)/create-survey.tsx` — M-PM-03: Tạo yêu cầu khảo sát
- [x] **1.3.5** `app/(pm)/ai-inbox.tsx` — M-PM-04: Hộp thư xác minh AI (Defect OPEN)
- [x] **1.3.6** `app/(pm)/verify-a.tsx` — M-PM-05: Xác minh Bounding Box AI
- [x] **1.3.7** `app/(pm)/verify-b.tsx` — **M-PM-06/14 GỘP** — So sánh đa kỳ & Baseline
- [x] **1.3.8** `app/(pm)/field-task.tsx` — **M-PM-07/M-CREW-05 GỘP** — Giao đo thực địa + nhập GroundTruthMeasurement
  > 🔴 **UD-05:** Defect chỉ VERIFIED sau khi có FieldInspectionTask đạt chuẩn — KHÔNG shortcut
- [x] **1.3.9** `app/(pm)/batching.tsx` — M-PM-08: Gộp đợt sửa
  > 🔴 **UD-06:** `estimated_total_cost` = SUM tự tính — KHÔNG có input nhập tay
- [x] **1.3.10** `app/(pm)/submit-approval.tsx` — M-PM-09: Trình duyệt #REQ-045 (42.500.000 VNĐ)
- [x] **1.3.11** `app/(pm)/resubmit.tsx` — M-PM-10: Chỉnh sửa & gửi lại (REVISION_REQUIRED)
- [x] **1.3.12** `app/(pm)/submitted-tab.tsx` — M-PM-11: Tab đã gửi duyệt
- [x] **1.3.13** `app/(pm)/assign-crew.tsx` — M-PM-12: Giao việc Crew sau APPROVED
- [x] **1.3.14** `app/(pm)/wo-confirm.tsx` — M-PM-13: Xác nhận nghiệm thu hoàn thành
- [x] **1.3.15** `app/(pm)/profile.tsx` — M-PM-15: Hồ sơ PM

**📝 Nghiệm thu 1.3:** Login PM → luồng: Inbox AI → Verify B → Field Task → Batching → Submit → Assign Crew → Xuất `docs/worklogs/P1-03-pm-completion.md`

---

## PHASE 1.4 — Placeholder Drone & Supervisor (bàn giao Hoàng)

> Tạo đủ file với placeholder UI — KHÔNG cần logic, chỉ cần routing không 404

- [x] **1.4.1** `app/(drone)/_layout.tsx` + 7 file `.tsx` placeholder
- [x] **1.4.2** `app/(sup)/_layout.tsx` + 7 file `.tsx` placeholder
- [ ] **1.4.3** Xác nhận: 4 vai trò chuyển đổi được, BottomNav render đúng

---

## BÀN GIAO CHO HOÀNG

- [ ] Hoàng nhận nhánh `hoang` hoặc checkout từ `tung`
- [ ] Thông báo Hoàng: clone về, `npm install`, `npx expo start` → fill vào `(drone)` và `(sup)`
- [ ] Hoàng đọc `HUONG_DAN_HOANG_VIBE_CODE.md` và `docs/planning/RoadGuard_Plan_Person_2.md`

