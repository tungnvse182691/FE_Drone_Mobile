# 📘 CẨM NANG VIBE CODE CHO HOÀNG (PERSON 2) — DỰ ÁN ROADGUARD

> **Dành riêng cho:** Hoàng (Person 2).  
> **Phân công chính thức:** **Drone Operator (7 màn)** + **Supervisor (7 màn)** = **14 màn hình**.  
> **Phương pháp làm việc:** **Vibe Coding với AI** (OpenCode / Cursor / Claude Code / Antigravity). Bạn không cần tự viết từng dòng code phức tạp, nhưng **bắt buộc phải biết cách ra lệnh (prompt), kiểm tra và nghiệm thu** theo hướng dẫn này để sản phẩm không bị lỗi.

---

## 🧭 MỤC LỤC
1. [Phân vai chính thức của Hoàng](#1-phân-vai-chính-thức-của-hoàng)
2. [Cách lấy code về máy từ nhánh của Tùng](#2-cách-lấy-code-về-máy-từ-nhánh-của-tùng)
3. [Cẩm nang tài liệu — Phải đọc file nào trong `14-9`?](#3-cẩm-nang-tài-liệu--phải-đọc-file-nào-trong-14-9)
4. [Quy trình Vibe Code 4 bước chuẩn chỉ](#4-quy-trình-vibe-code-4-bước-chuẩn-chỉ)
5. [Danh sách 14 màn hình cần làm (Drone + Supervisor)](#5-danh-sách-14-màn-hình-cần-làm-drone--supervisor)
6. [3 Quy tắc sống còn (Tránh lỗi màn hình đen)](#6-3-quy-tắc-sống-còn-tránh-lỗi-màn-hình-đen)
7. [Cách lưu & đẩy code lên nhánh của bạn](#7-cách-lưu--đẩy-code-lên-nhánh-của-bạn)
8. [Mẫu Prompt chuẩn chỉ cần Copy-Paste cho AI](#8-mẫu-prompt-chuẩn-chỉ-cần-copy-paste-cho-ai)

---

## 1. PHÂN VAI CHÍNH THỨC CỦA HOÀNG

Trong đồ án RoadGuard, bạn đảm nhận 2 vai trò cực kỳ quan trọng và đẹp mắt:
* **Phân khu 1 — Phi công Drone `(drone)` (7 màn):**
  * Nhận yêu cầu bay khảo sát mặt đường.
  * Nạp video chuyến bay và tệp phụ đề SRT từ thẻ nhớ SD.
  * Ghi nhật ký chuyến bay và đồng bộ ngoại tuyến.
* **Phân khu 2 — Giám sát viên Supervisor `(sup)` (7 màn):**
  * Dashboard giám sát tổng thể mạng lưới đường.
  * Thẩm định & phê duyệt đợt sửa chữa do PM trình lên (Duyệt / Từ chối / Yêu cầu sửa đổi).
  * Xem báo cáo kinh phí và xuất hồ sơ hoàn công (PDF / gói ZIP).
  * Ký duyệt đóng đợt sửa chữa bằng vẽ cảm ứng tay.

👉 **Kho mẫu tham khảo:** Bộ code mẫu của Drone đã được lưu sẵn tại `D:\Do_AN_Drone\backup_drone_completed\screens\` để bạn mở ra xem tham khảo bất cứ lúc nào!

---

## 2. CÁCH LẤY CODE VỀ MÁY TỪ NHÁNH CỦA TÙNG

Tùng đã chuẩn bị sẵn toàn bộ nền móng (Foundation + Auth + Đội sửa chữa Crew) trên nhánh `tung`. Bạn lấy code về máy của bạn như sau:

```bash
# 1. Clone repo từ GitHub về máy
git clone https://github.com/tungnvse182691/FE_Drone_Mobile.git

# 2. Đi vào thư mục dự án
cd FE_Drone_Mobile

# 3. Tạo nhánh hoang dựa trên nhánh tung của bạn Tùng
git checkout -b hoang origin/tung

# 4. Cài đặt các thư viện
npm install

# 5. Khởi chạy app
npx expo start
```
* Bấm phím **`a`** trên terminal để mở app trên máy ảo Android.
* **Tài khoản Drone:** `drone@cattuong.vn` | Mk: `123456`
* **Tài khoản Supervisor:** `sup@cattuong.vn` | Mk: `123456`

---

## 3. CẨM NANG TÀI LIỆU — PHẢI ĐỌC FILE NÀO TRONG `14-9`?

Khi bảo AI làm việc, bạn cần chỉ cho AI đọc đúng các file tài liệu sau:

### A. Thư mục `D:\Do_AN_Drone\14-9\` (Nghiệp vụ)
1. **`14-9/V2/Dac_ta_UseCase_v2.md`** ⭐ *(Bắt buộc đọc)*:
   * Đọc các Use Case của **Drone**: từ **UC-011** đến **UC-020** (Tiếp nhận khảo sát, nhập video thẻ SD, nhật ký chuyến bay).
   * Đọc các Use Case của **Supervisor**: từ **UC-037** đến **UC-052** (Xem dashboard giám sát, duyệt đợt sửa chữa, xuất biên bản, ký đóng đợt).
2. **`14-9/V2/User_Stories_Acceptance_Criteria_v2.md`**:
   * Tiêu chí nghiệm thu logic (Acceptance Criteria).
3. **`14-9/Build/RoadGuard_Data_Dictionary_v1.md`**:
   * Từ điển dữ liệu chuẩn (tên trường, enum có sẵn).

### B. Thư mục `D:\Do_AN_Drone\RoadGuard_Wireframes\` (Giao diện chuẩn)
1. **`RoadGuard_Wireframes/index.html`** ⭐:
   * **Click đúp mở bằng trình duyệt Chrome/Edge!** Bấm vào vai trò Drone và Supervisor để nhìn tận mắt bố cục màn hình thật.
2. **`RoadGuard_Wireframes/Wireframe_Specification.md`**:
   * Văn bản mô tả chi tiết từng màn M-DRONE-01..07 và M-SUP-01..08.

### C. Trong thư mục code `FE_AppMobile/`
1. **`AGENTS.md`** ⭐: Hiến pháp repo, bắt buộc AI phải đọc đầu tiên.
2. **`skills/roadguard/SKILL.md`**: Bộ design tokens và quy tắc kỹ thuật.
3. **`src/constants/routes.ts`**: Nơi lưu hằng số đường dẫn navigation.

---

## 4. QUY TRÌNH VIBE CODE 4 BƯỚC CHUẨN CHỈ

Làm **từng màn hình một** theo chu trình:
1. **Bước 1 — Chọn 1 màn hình cần làm.**
2. **Bước 2 — Copy Mẫu Prompt ở Mục 8 bên dưới gửi cho AI.**
3. **Bước 3 — Bắt buộc chạy kiểm tra TypeScript:**
   ```bash
   npm run typecheck
   ```
   *(Phải đạt 0 lỗi mới là code đạt chuẩn).*
4. **Bước 4 — Bấm `r` trên terminal Expo để kiểm tra thực tế trên máy ảo Android.**

---

## 5. DANH SÁCH 14 MÀN HÌNH CẦN LÀM (DRONE + SUPERVISOR)

### Nhóm 1: Phi công Drone `app/(drone)/` (7 màn)
| File | Mã màn | Chức năng chính |
|---|---|---|
| `home.tsx` | M-DRONE-01 | Dashboard Nguyễn Văn An (CT-2089), yêu cầu bay mới |
| `requests.tsx` | M-DRONE-02 | Danh sách yêu cầu bay (FAB (+) góc bottom:96 right:16) |
| `request-detail.tsx` | M-DRONE-03 | Chi tiết yêu cầu khảo sát, thông số bay |
| `upload.tsx` | M-DRONE-04 | Nạp video và SRT từ thẻ SD |
| `log.tsx` | M-DRONE-05 | Nhật ký chuyến bay |
| `sync.tsx` | M-DRONE-06 | Hàng đợi đồng bộ ngoại tuyến |
| `profile.tsx` | M-DRONE-07 | Hồ sơ phi công & đăng xuất |

### Nhóm 2: Giám sát viên Supervisor `app/(sup)/` (7 màn)
| File | Mã màn | Chức năng chính |
|---|---|---|
| `_layout.tsx` | Layout | BottomNav 4 tab: Trang chủ, Phê duyệt, Báo cáo, Hồ sơ |
| `home.tsx` | M-SUP-01 | Dashboard Giám sát viên Trần Thế Hùng (NV-8842) |
| `approve.tsx` | M-SUP-02 | Thẩm định & duyệt đợt sửa (Chấp thuận / Từ chối có lý do) |
| `risk.tsx` | M-SUP-03 | Danh sách & mức độ rủi ro các tuyến đường |
| `reports.tsx` | M-SUP-04 | Báo cáo kinh phí & tiến độ hoàn công |
| `export-modal.tsx` | M-SUP-05 | Modal xuất hồ sơ hoàn công PDF/ZIP |
| `profile.tsx` | M-SUP-06+07 | **GỘP:** Hồ sơ + Quản trị tiêu chuẩn kỹ thuật TCVN |
| `signoff.tsx` | M-SUP-08 | Ký đóng đợt sửa chữa bằng cảm ứng tay |

---

## 6. 3 QUY TẮC SỐNG CÒN (TRÁNH LỖI MÀN HÌNH ĐEN)

1. **Full Group Prefix khi điều hướng:**
   * ❌ SAI: `router.push('/drone/log')`, `router.push('/sup/home')`
   * ✅ ĐÚNG: `router.push('/(drone)/log')`, `router.push('/(sup)/home')`
2. **1 Nút vàng đồng Cát Tường (`#C9A227`):** Chỉ dùng cho duy nhất 1 nút CTA chính trên mỗi màn hình.
3. **Màn M-SUP-07:** Tích hợp vào trong `profile.tsx`, không tạo file `sup-07.tsx` riêng.

---

## 7. CÁCH LƯU & ĐẨY CODE LÊN NHÁNH CỦA BẠN

Khi làm xong và test chạy mượt mà:
```bash
git status
git add .
git commit -m "feat(drone): hoan thanh man M-DRONE-01"
git push -u origin hoang
```
*(Bạn chỉ đẩy lên nhánh `hoang` của bạn, không đụng vào `main` hay `develop`).*

---

## 8. MẪU PROMPT CHUẨN CHỈ CẦN COPY-PASTE CHO AI

```markdown
Bạn là trợ lý lập trình cho dự án RoadGuard (React Native + Expo Router + TypeScript).

TRƯỚC KHI CODE, HÃY ĐỌC CÁC FILE NGUỒN-SỰ-THẬT SAU:
1. `FE_AppMobile/AGENTS.md` (Hiến pháp repo - tuân thủ nghiêm ngặt các điều CẤM)
2. `FE_AppMobile/skills/roadguard/SKILL.md` (Design tokens, components chuẩn, kiến trúc)
3. `RoadGuard_Wireframes/Wireframe_Specification.md` (Đặc tả chi tiết giao diện màn hình)
4. Mở xem code mẫu trong `RoadGuard_Wireframes/index.html` tại mục tương ứng.

NHIỆM VỤ HIỆN TẠI:
Hãy xây dựng màn hình: [ĐIỀN TÊN MÀN VÀ FILE VÀO ĐÂY]

YÊU CẦU BẮT BUỘC:
- Dùng các components dựng sẵn trong `src/components/` (AppHeader, Card, Button, Chip, SafeAreaScreen, FAB...).
- Màu sắc và font lấy từ `src/design-tokens.ts` (màu chính primary: #C9A227, chỉ dùng cho tối đa 1 nút CTA chính).
- Điều hướng (router.push/replace) BẮT BUỘC phải dùng đầy đủ tiền tố group có ngoặc tròn: `/(drone)/...` hoặc `/(sup)/...`. TUYỆT ĐỐI KHÔNG dùng shorthand `/drone/...` vì sẽ gây lỗi màn hình đen Unmatched Route.
- Tuyệt đối không thêm thư viện ngoài package.json.
- Sau khi viết xong, hãy chạy kiểm tra `npm run typecheck` và đảm bảo đạt 0 lỗi.
```
