---
# RoadGuard FE_AppMobile — Kế hoạch Person 2 (Hoàng)
> **Người thực hiện:** Hoàng  
> **Giai đoạn:** Repair Crew + Supervisor  
> **Phân vai nghiệp vụ:** Toàn bộ luồng **"Hạ nguồn"** — Nhận lệnh công tác → Sửa chữa hiện trường → Chụp nghiệm thu → Supervisor phê duyệt → Ký đóng đợt  
> **Điều kiện nhận bàn giao:** Person 1 đã push branch `phase-1-complete` — App chạy, Auth/Drone/PM hoàn chỉnh, Crew/Sup là placeholder

---

## NHẬN BÀN GIAO TỪ PERSON 1

```bash
git clone <repository-url>
cd FE_AppMobile
npm install
npx expo start        # Kiểm tra app bật lên OK
```

> **Kiểm tra bàn giao:**
> - Login Drone → vào đủ 7 màn ✅
> - Login PM → vào đủ 14 màn, thấy Batching/Submit logic ✅
> - Login Crew → thấy placeholder text (chưa có UI thật) → Hoàng sẽ làm
> - Login Sup → thấy placeholder text → Hoàng sẽ làm

> **ĐỌC BẮT BUỘC TRƯỚC KHI CODE:**
> 1. `AGENTS.md` — Hiến pháp repo, CẤM TUYỆT ĐỐI
> 2. `skills/roadguard/SKILL.md` — Kỷ luật + đặc tả kỹ thuật
> 3. `BOOTSTRAP_PROMPT.md` — Bản vẽ thi công chi tiết

---

## PHASE 2.1 — Phân khu Repair Crew `(crew)` — 10 màn ⭐ PHẦN CÓ NHIỀU PHẦN CỨNG NHẤT

> **Màn hình:** M-CREW-01 → M-CREW-11  
> ⚠️ Không có M-CREW-05 riêng — màn đó đã được Person 1 gộp vào `field-task.tsx` của (pm)

- [ ] **2.1.1** `app/(crew)/_layout.tsx` — BottomNav 4 tab: Home / Tasks / Sync / Profile (XÓA placeholder cũ, thay bằng thật)
- [ ] **2.1.2** `app/(crew)/home.tsx` — M-CREW-01: Dashboard Đội 01 — Trần Văn Vượng (đội trưởng), Nguyễn Văn Tuấn (CT-RC-084)
- [ ] **2.1.3** `app/(crew)/tasks.tsx` — M-CREW-02: Danh sách công việc của tôi (FAB bottom:96 right:16)
- [ ] **2.1.4** `app/(crew)/wo-detail.tsx` — M-CREW-03: Chi tiết lệnh công tác #WO-118
- [ ] **2.1.5** `app/(crew)/navigation.tsx` — M-CREW-04: Dẫn đường GPS đến vị trí thi công (expo-location + bản đồ)
- [ ] **2.1.6** `app/(crew)/viewfinder.tsx` — M-CREW-06: Kính ngắm chụp ảnh nghiệm thu
  > ⚠️ Màn này dùng `ViewFinder` component (Person 1 đã tạo sẵn). Cần có:
  > - Camera live preview (expo-camera)
  > - Watermark GPS timestamp góc dưới
  > - Thước đo ảo (virtual ruler overlay)
  > - Nền camera: `#0F172A` (dark navy — KHÔNG dùng đen thuần)
- [ ] **2.1.7** `app/(crew)/progress.tsx` — M-CREW-07: Cập nhật tiến độ thi công (% hoàn thành)
- [ ] **2.1.8** `app/(crew)/report-defect.tsx` — M-CREW-08: Báo cáo lỗi phát sinh mới tại hiện trường
- [ ] **2.1.9** `app/(crew)/complete.tsx` — M-CREW-09: Hoàn tất công việc (gửi ảnh BEFORE/AFTER `RepairEvidence`)
  > ⚠️ `RepairEvidence.kind` chỉ có `'BEFORE' | 'AFTER'` — KHÔNG tự thêm value khác
- [ ] **2.1.10** `app/(crew)/sync.tsx` — M-CREW-10: Đồng bộ ngoại tuyến (StatusBadge, outbox queue)
- [ ] **2.1.11** `app/(crew)/profile.tsx` — M-CREW-11: Hồ sơ kỹ thuật viên

**📝 Nghiệm thu 2.1:** Login Crew → luồng: Nhận WO → GPS → Chụp ảnh viewfinder → Hoàn tất → Sync → Xuất `docs/worklogs/P2-01-crew-completion.md`

---

## PHASE 2.2 — Phân khu Supervisor `(sup)` — 7 màn

> **Màn hình:** M-SUP-01 → M-SUP-08  
> ⚠️ M-SUP-07 (Quản trị hệ thống) tích hợp dưới dạng Tab/Section bên trong `profile.tsx` — KHÔNG tạo file riêng

- [ ] **2.2.1** `app/(sup)/_layout.tsx` — BottomNav 4 tab: Home / Approve / Reports / Profile (XÓA placeholder, thay bằng thật)
- [ ] **2.2.2** `app/(sup)/home.tsx` — M-SUP-01: Dashboard Trần Thế Hùng (NV-8842) — tổng quan hệ thống, task cần duyệt
- [ ] **2.2.3** `app/(sup)/approve.tsx` — M-SUP-02: Thẩm định & phê duyệt đợt sửa #REQ-045 (Chấp thuận / Từ chối có lý do / Yêu cầu chỉnh sửa)
- [ ] **2.2.4** `app/(sup)/risk.tsx` — M-SUP-03: Tổng quan rủi ro các tuyến đường (danh sách + Chip severity)
- [ ] **2.2.5** `app/(sup)/reports.tsx` — M-SUP-04: Báo cáo & thống kê kinh phí (74.900.000 VNĐ tổng)
- [ ] **2.2.6** `app/(sup)/export-modal.tsx` — M-SUP-05: Modal xuất hồ sơ hoàn công PDF/ZIP
- [ ] **2.2.7** `app/(sup)/profile.tsx` — **M-SUP-06 + M-SUP-07 GỘP** — Hồ sơ Supervisor + Tab quản trị tài khoản/nhân sự/danh mục TCVN
  > ⚠️ KHÔNG tạo file `sup-07.tsx` riêng — dùng tabs/sections bên trong `profile.tsx`
- [ ] **2.2.8** `app/(sup)/signoff.tsx` — M-SUP-08: Ký đóng đợt sửa chữa (chữ ký cảm ứng tay)

**📝 Nghiệm thu 2.2:** Login Sup → luồng: Xem đợt → Phê duyệt → Xuất PDF → Ký đóng → Xuất `docs/worklogs/P2-02-supervisor-completion.md`

---

## PHASE 2.3 — Kết nối End-to-End & Nghiệm thu toàn hệ thống

- [ ] **2.3.1** Test luồng hoàn chỉnh trên **1 thiết bị Android thật**:
  - `Drone` upload video → `PM` xác minh AI → `PM` giao đo thực địa → `PM` gộp đợt → `Sup` phê duyệt → `PM` giao Crew → `Crew` sửa + chụp nghiệm thu → `Sup` ký đóng đợt
- [ ] **2.3.2** Test **Offline Queue** thực tế: bật Airplane mode → thao tác → bật mạng lại → xem StatusBadge chuyển `QUEUED → SERVER_CONFIRMED`
- [ ] **2.3.3** Xuất `docs/worklogs/P2-03-e2e-integration-completion.md`

---

## BÀN GIAO HOÀN CHỈNH

- [ ] Merge `phase-2-complete` vào `main`
- [ ] Tag release: `v1.0.0-mobile-fe-complete`
- [ ] Demo trực tiếp trên Android cho Boss và PM duyệt
