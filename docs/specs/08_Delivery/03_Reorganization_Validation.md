# RoadGuard — Kiểm tra sau sắp xếp

> Báo cáo này là snapshot trước REVIEW-01. Contract/auth và hash đã được cập nhật sau đó; xem05_Consistency_Risk_Review.md và manifest hiện tại.

**Ngày:** 27/09/2026. **Phạm vi:** cấu trúc tài liệu, liên kết và tính toàn vẹn file; không phải kiểm thử phần mềm.

Gói được dựng từ RoadGuard_Documentation_R3.zip, BA/Tech Supplement R3 v1 và FE Integration R3 v1 đã bàn giao. Không đọc các chỉnh sửa riêng trên máy Windows.

Thay đổi: đưa09_Frontend lên cùng cấp nhóm01–08; bổ sung README gốc cho BE/FE/QA; đặt chỉ mục FE tại09_Frontend/README.md; gom bản ghi bàn giao/manifest gốc vào08_Delivery; sửa liên kết relative theo tên mới. Không đổi business IDs, API fields hoặc schema constraints. Hash/manifest gốc giữ riêng với hậu tố original.

## Kết quả

- 84 đường dẫn Markdown được cập nhật theo cấu trúc/tên mới trước khi xử lý tham chiếu thiếu.
- 8 tên tài liệu thiếu được phát hiện tại16 vị trí. Liên kết dẫn đến danh sách thiếu có tên nguồn gốc; không tạo nội dung giả để thay tài liệu.
- 198 liên kết Markdown đến tệp nội bộ hiện tồn tại; đây là kiểm đường dẫn tệp, không kiểm mọi anchor của tài liệu cũ.
- OpenAPI trung tâm và snapshot FE giống nhau, giữ nguyên byte so với OpenAPI nguồn.
- Kiểm cấu trúc FE:153 schema,133 operations,66 schema refs;8 positive/4 negative fixtures đúng mong đợi;58 TC-FE,8 UAT-FE,16 FE-GAP. Structural checks PASS.
- Generated schema/type, baseline YAML và config/fixtures không bị đổi do sắp xếp; Markdown chỉ sửa đường dẫn/chú thích bàn giao, ngoài README và báo cáo mới.
- Manifest hiện tại là08_Delivery/manifest.json, ghi SHA256 cho các file khác trong gói. Manifest không tự hash chính nó. ZIP được kiểm integrity và đối chiếu hash từng file.

Giới hạn: chưa chạy full OpenAPI/JSON Schema standards validator, TypeScript compiler, Mermaid renderer hoặc build/app/API/device/UAT. Các test được soạn vẫn NOT_RUN. Việc sắp xếp không tự giải quyết Q01–Q18 hoặc16 FE-GAP.
