# RoadGuard — Hồ sơ bàn giao

## V2(3) review overlay — 2026-09-28

The current package is a documentation overlay. D01-D28 and pilot/configuration status are recorded in `planning/V2/V2-3_DECISION_REGISTER.md`; this folder records regenerated canonical/snapshot artifacts and review evidence. Historical `*.original.*` files remain immutable. Manifest revision `V2(3)-REVIEW-02` does not claim backend, AI provider, browser/device or performance verification.

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
| [04_Missing_Referenced_Documents.md](04_Missing_Referenced_Documents.md) | Đối chiếu tám tham chiếu từng bị ghi thiếu với source thật; giữ anchor lịch sử |
| [05_Consistency_Risk_Review.md](05_Consistency_Risk_Review.md) | REVIEW-01: auth, sync gaps, hash gate và acceptance blockers |
| [manifest.json](manifest.json) | Paths và SHA256 của gói sau sắp xếp, không tự bao gồm chính nó |

Manifest `*.original.json` là bằng chứng lịch sử, không dùng để validate các đường dẫn mới. File `manifest.json` cùng thư mục này là manifest của bản hiện tại. Chưa có kết quả chạy ứng dụng/BE/thiết bị thực tế.

Kết quả reconciliation ngày 28/09/2026: cả tám mục có source candidate trong checkout; một ADR là current reference, hai nguồn đã bị V2 canonical thay thế cho bảo trì hiện hành, năm mapping còn lại là historical target/proposal. Xem task [`DOC-V2-RECON`](../../../../planning/V2/Governance/DOC-V2-RECON.md) để biết mục đã đọc và evidence.
