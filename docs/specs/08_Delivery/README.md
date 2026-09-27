# RoadGuard — Hồ sơ bàn giao

Ngày 27/09/2026. README ở thư mục gốc là điểm bắt đầu cho BE/FE.

| Tệp | Vai trò |
|---|---|
| [00_Original_Documentation_Index.md](00_Original_Documentation_Index.md) | Chỉ mục bộ nghiệp vụ trước khi sắp xếp; giữ lịch sử, đã cập nhật liên kết |
| [01_Supplement_Index.md](01_Supplement_Index.md) | Chỉ mục gói BA/Tech trước; hash nguồn mô tả snapshot lúc bàn giao |
| [02_Package_Validation.md](02_Package_Validation.md) | Kết quả kiểm cấu trúc gói BA/Tech trước, không phải test app |
| [FE_R3/Package_Validation_Original.md](FE_R3/Package_Validation_Original.md) | Báo cáo kiểm gói FE trước khi chuyển thư mục |
| [BA_R3/manifest.original.json](BA_R3/manifest.original.json) | Manifest gốc BA/Tech; paths/hashes thuộc gói gốc |
| [FE_R3/manifest.original.json](FE_R3/manifest.original.json) | Manifest gốc FE; paths/hashes thuộc gói gốc |
| [FE_R3/source_manifest.original.json](FE_R3/source_manifest.original.json) | Hash nguồn đầu vào gói FE gốc |
| [03_Reorganization_Validation.md](03_Reorganization_Validation.md) | Báo cáo kiểm tra gói sau sắp xếp này |
| [04_Missing_Referenced_Documents.md](04_Missing_Referenced_Documents.md) | Các tham chiếu cũ thiếu file, không giả nội dung thay thế |
| [05_Consistency_Risk_Review.md](05_Consistency_Risk_Review.md) | REVIEW-01: auth, sync gaps, hash gate và acceptance blockers |
| [manifest.json](manifest.json) | Paths và SHA256 của gói sau sắp xếp, không tự bao gồm chính nó |

Manifest `*.original.json` là bằng chứng lịch sử, không dùng để validate các đường dẫn mới. File `manifest.json` cùng thư mục này là manifest của bản hiện tại. Chưa có kết quả chạy ứng dụng/BE/thiết bị thực tế.
