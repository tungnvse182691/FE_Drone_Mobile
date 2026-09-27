# Worklog: P3-06 - Nâng Cấp Luồng Drone, SQLite Offline Schema & Mock Fixtures Toàn Diện

**Ngày thực hiện:** 27/09/2026  
**Người thực hiện:** Antigravity AI Pair Programmer  
**Người duyệt:** Nguyễn Văn Tùng (Sếp / FE Lead & QA Lead)  
**Tiêu chuẩn:** R3 Canonical V2 / TCVN 10380:2014 / 09_Frontend Offline App Sync Spec  

---

## 1. Mục Tiêu Hoàn Thành (PROMPT 5 & PROMPT 6)
- **Prompt 5:** Nâng cấp trọn vẹn luồng Phi công Drone (`app/(drone)`):
  - Card Điểm tiếp cận (Access Point / Điểm cất-hạ cánh) kèm mô tả an toàn và tọa độ WGS84.
  - Nút CTA mở Google Maps dẫn đường WGS84 theo `Linking.openURL`.
  - Cấu hình thông số bay PM: Độ cao bay 45m (AGL), cảm biến 4K RGB 60fps + RTK cm, DSM OpenDroneMap (ODM).
  - Tích hợp `expo-document-picker` chọn video 4K RGB (`.mp4`) và file phụ đề GPS RTK (`.srt`).
  - Kiểm tra toàn vẹn & mã băm SHA-256. Quy trình trạng thái 4 bước: `LOCAL` $\rightarrow$ `QUEUED` $\rightarrow$ `UPLOADING` $\rightarrow$ `SERVER_CONFIRMED`.
  - Ghi nhận nhật ký chuyến bay với Drone `M350-HH-02` (DJI Matrice 350 RTK Hoàng Hải), trạm D-RTK 2, pin TB65, 420 ảnh trực giao.
- **Prompt 6:** Nâng cấp SQLite Offline-first & Mock Fixtures:
  - Cập nhật `src/offline/schema.sql`: bảng `local_draft` (thêm `reporter_submission`, `fast_track_completion`), bảng `task_cache` (hỗ trợ `policy` và `work_order`), bảng `media_file`.
  - Cập nhật `src/offline/database.ts`: hàm lưu/đọc `FastTrackPolicyVersion` và `RepairWorkOrder` từ cache, hàm quản lý local draft và media file.
  - Cập nhật `src/offline/upload-queue.ts`: state machine `DRAFT` $\rightarrow$ `WAITING_DEPENDENCIES` $\rightarrow$ `READY` $\rightarrow$ `IN_FLIGHT` $\rightarrow$ `ACKED`, helper `enqueuePayload`.
  - Cập nhật Mock Fixtures trong `src/api/mock/`:
    - `auth.ts`: Tài khoản test cho 3 vai trò (`crew@hoanghai.vn`, `pilot@hoanghai.vn`, `dan.nguyen@gmail.com`).
    - `tasks.ts`: Cung cấp 2 work order chuẩn (`WO-01` Fast Track, `WO-02` Measure Only đợt gom).
    - `defects.ts`: Cung cấp policy `FTP-2026-V1`.
  - Tự động gán `Idempotency-Key` (UUID) trong `src/api/client.ts` cho mọi mutation (`POST`, `PUT`, `PATCH`, `DELETE`).

---

## 2. Danh Sách File Đã Cập Nhật / Tạo Mới

| STT | Đường dẫn file | Nội dung thay đổi |
|---|---|---|
| 1 | `app/(drone)/request-detail.tsx` | Bổ sung Access Point card, Google Maps WGS84, ODM DSM specs, nút chấp nhận nhiệm vụ |
| 2 | `app/(drone)/upload.tsx` | Tích hợp DocumentPicker cho MP4 & SRT, SHA-256 check, pipeline 4 bước trực quan |
| 3 | `app/(drone)/log.tsx` | Featured Flight Log Card với M350-HH-02, D-RTK 2, pin TB65, 420 ảnh trực giao |
| 4 | `src/types/domain.ts` | Khai báo `AccessPoint`, `SurveyTask`, mở rộng `FlightLog` |
| 5 | `src/offline/schema.sql` | Cập nhật schema DDL SQLite theo spec 09_Frontend/09 |
| 6 | `src/offline/database.ts` | Helper functions cho policy cache, work order cache, draft, media |
| 7 | `src/offline/upload-queue.ts` | State machine theo 09_Offline_App_Sync_Spec, enqueuePayload cho Reporter & Fast Track |
| 8 | `src/api/client.ts` | Auto-inject `Idempotency-Key` cho mọi mutation request |
| 9 | `src/api/mock/auth.ts` | Chuẩn hóa tài khoản test cho 3 vai trò hiện trường Bê tông Hoàng Hải |
| 10 | `src/api/mock/tasks.ts` | Mock Work Orders: WO-01 (Fast Track eligible) & WO-02 (Measure only đợt gom) |
| 11 | `src/api/mock/defects.ts` | Thêm `FAST_TRACK_POLICY` (FTP-2026-V1) và API `getFastTrackPolicy` |

---

## 3. Kết Quả Kiểm Thử Tuân Thủ Toàn Diện (Checklist)

- [x] **0 LỖI TypeScript:** `npm run typecheck` (`tsc --noEmit`) đạt **0 errors**.
- [x] **Red Flags (LiDAR & Nhựa đường asphalt):** 0 từ khóa trong `app/` và `src/`.
- [x] **Zero Presentation Cost (UD-06):** 0 thông tin VNĐ, dự toán, kinh phí trên bất kỳ màn hình nào thuộc `app/`.
- [x] **Full Group Prefix Navigation:** 100% lệnh navigation đều có tiền tố ngoặc tròn `/(crew)/...`, `/(drone)/...`, `/(reporter)/...`, `/(auth)/...`.
- [x] **Idempotency-Key:** Interceptor `apiClient` tự động tiêm `Idempotency-Key` cho toàn bộ các mutation.
- [x] **Thiết bị bay Hoàng Hải:** Tiền tố `M350-HH-02` (DJI Matrice 350 RTK) và `Mavic3E-HH-01` (DJI Mavic 3 Enterprise) trên Tuyến ĐH.05 Bình Chánh.
