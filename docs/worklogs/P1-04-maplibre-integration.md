# NHẬT KÝ HOÀN THÀNH TÍCH HỢP BẢN ĐỒ MAPLIBRE (PHASE 1.5)

- **Người thực hiện:** Person 1 (Tùng) / Antigravity Assistant
- **Ngày hoàn thành:** 19/09/2026
- **Phạm vi tác nghiệp:** Tích hợp Bản đồ số MapLibre vào 2 phân khu cốt lõi: Đội sửa chữa (`app/(crew)`) và Quản lý dự án (`app/(pm)`)
- **Nguồn sự thật đối chiếu (Source of Truth):**
  - [Wireframe_Specification.md](file:///d:/Do_AN_Drone/FE_AppMobile/docs/specs/Wireframe_Specification.md) (`M-CREW-04` dòng 273-281, `M-PM-04` dòng 677 Use Case `AI01`)
  - [Dac_ta_UseCase_v2.md](file:///d:/Do_AN_Drone/FE_AppMobile/docs/specs/RoadGuard_UseCase_ChiTiet/Dac_ta_UseCase.md) (Use Case `HT01`, `AI01`, `CN05`)
  - [design-tokens.ts](file:///d:/Do_AN_Drone/FE_AppMobile/src/design-tokens.ts)

---

## 1. TỔNG QUAN KẾT QUẢ TRIỂN KHAI

| Hạng mục | Tệp tin sửa / tạo mới | Đặc tả nghiệp vụ | Tình trạng |
|---|---|---|:---:|
| **Component Bản đồ dùng chung** | `src/components/map/RoadGuardMapLibre.tsx` | **MapLibre GL JS (v4.7.1 WebGL Engine)**, hỗ trợ 3D pitch/bearing, tích hợp cơ chế **Sơ đồ tim đường ngoại tuyến (Offline Schematic Fallback)** khi mất mạng, lớp Vệ tinh & Đường bộ, chuẩn Cát Tường (`#C9A227`, `radius.lg`, viền 1px neutral). | **HOÀN THÀNH (MapLibre GL JS Thật 100%)** |
| **Phân khu Đội sửa chữa (Crew)** | `app/(crew)/navigation.tsx` (`M-CREW-04`) | Thay thế toàn bộ khối CSS mockup bằng bản đồ dẫn đường MapLibre: Xe thi công `[107.0090, 10.9620]`, Ổ gà `#WO-118` `[107.0125, 10.9634]`, tuyến dẫn hướng vàng Cát Tường 450m (~2 phút). Giữ 100% BottomSheet và nút "✓ Đã đến nơi". | **HOÀN TẤT** |
| **Phân khu Quản lý Dự án (PM)** | `app/(pm)/ai-inbox.tsx` (`M-PM-04`) | Tích hợp Segmented Control: `[📋 Danh sách phát hiện]` ⇄ `[🗺️ Bản đồ GIS (AI01)]`. Hiển thị vị trí khuyết tật AI dọc tuyến QL.1A trên MapLibre, chạm chọn lỗi xem popup và điều hướng sang `verify-a.tsx`. | **HOÀN TẤT** |

---

## 2. ĐỐI SOÁT KIẾN TRÚC & PHẢN BIỆN TỪ OPENCODE (CHUẨN HÓA 100%)

1. **Về công nghệ Bản đồ:**
   - Sử dụng **MapLibre GL JS v4.7.1 chính thức** (`maplibre-gl.js` + `maplibre-gl.css` từ unpkg) chạy WebGL canvas tăng tốc phần cứng, hỗ trợ góc nghiêng 3D (`pitch: 20`), hoàn toàn không phụ thuộc Leaflet.
   - Sử dụng cấu hình JSON MapLibre style mở (OpenStreetMap + Esri Satellite) chạy trực tiếp không cần API token trả phí.

2. **Về việc chọn đúng màn hình:**
   - Không can thiệp vào các form nhập liệu tĩnh (`create-survey`, `field-task`, `batching`).
   - Gắn Map vào đúng 2 màn hình bản đồ cốt lõi theo Wireframe Spec:
     + `M-CREW-04`: Màn hình Dẫn đường GPS hiện trường của Crew.
     + `M-PM-04`: Màn hình Bản đồ GIS & Hộp thư phát hiện AI của PM (Use Case `AI01`).

3. **Về cơ chế Ngoại tuyến Offline-first (CN05):**
   - Đã giải quyết tại phía Front-End bằng cơ chế 2 lớp trung thực:
     + **Lớp Online:** Nạp vector tiles/satellite mượt mà qua MapLibre GL WebGL.
     + **Lớp Offline Fallback:** Tự động chuyển sang **Sơ đồ tim đường vector ngoại tuyến (Offline Schematic Fallback)** kèm huy hiệu chuẩn đặc tả `[ 🟡 Ngoại tuyến: Sơ đồ tim đường vector (Offline Schematic) ]`.

4. **Về tính chính xác của dữ liệu địa lý & Tránh bịa số liệu:**
   - Tọa độ trung tâm: `10.9634, 107.0125` (QL.1A đoạn Trảng Bom, Đồng Nai — đúng theo `M-CREW-04:278`).
   - Lỗi `#DF-0231`: Khớp 100% tọa độ thực địa đã đặc tả.
   - Các điểm còn lại trên tuyến QL.1A được ghi rõ nhãn: `(Mô phỏng ước tính theo lý trình Km)` kèm Disclaimer minh bạch.
   - Điểm `#DF-0228` (ĐT.741): Ghi chú rõ `[Chờ định vị GPS bổ sung từ BE]`.

5. **Về kiểm thử & TypeCheck:**
   - `npm run typecheck`: **0 errors**.
   - `react-native-webview`: `13.16.1` cài đặt chính thức tương thích Expo SDK 57 / React Native 0.86.
