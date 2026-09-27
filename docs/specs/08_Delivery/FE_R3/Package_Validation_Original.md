# RoadGuard — Kiểm tra gói FE-R3-v1

> Bản ghi từ gói bàn giao trước. Các hash/kết quả kiểm tra trong nội dung mô tả snapshot gốc, không phải xác nhận gói sau sắp xếp. Xem README gốc và 08_Delivery/03_Reorganization_Validation.md để kiểm bản hiện tại.
Ngày 27/09/2026. Kiểm tra tài liệu và artifact, không phải test phần mềm.

## Phạm vi kiểm tra

Script `09_Frontend/contracts/validate_package.py` kiểm tra: JSON Schema projection bằng toàn bộ schema baseline sau đổi đường dẫn ref; refs nội bộ giải được; operationId duy nhất; đủ153 structural TS types; positive/negative fixtures bằng validator nhỏ cho tập constraint được dùng; liên kết Markdown và code fences;58 test case IDs,8 UAT IDs,16 gap IDs không thiếu/trùng theo kiểm tra trong script. Script này không thay full standards validator.

## Kết quả đã chạy

**STRUCTURAL_CHECKS_PASS**:153 schema,133 operation IDs duy nhất,66 schema refs giải được,153 TS type declarations;8 positive fixtures và4 negative fixtures đúng kết quả mong đợi;25 liên kết Markdown tồn tại;58 TC-FE,8 UAT-FE và16 FE-GAP. Constraint JSON Schema giữ nguyên so với baseline sau đổi ref.

SHA256 baseline: `e417db34ebea5278c53c023520a6da5ece067b6422e188213d0efe980b79cce2`.

## Chưa kiểm chứng

- Chưa chạy TypeScript compiler hoặc full OpenAPI/JSON Schema2020-12 validator (không có sẵn trong môi trường kiểm tra).
- Chưa render Mermaid; đã kiểm hàng rào code, không tuyên bố renderer pass.
- Chưa chạy app/build/browser/Android hoặc gọi BE thật vì chưa có repository và môi trường.
- Chưa kiểm login/refresh thật, SQL transaction, storage provider, quota, performance, UAT.58 ca kiểm thử và8 hành trình UAT vẫn NOT_RUN.
- Config là mẫu; staging/prod cố ý chưa dùng được đến khi thay hostname và chọn auth adapter.
- Full offline rollout phụ thuộc các FE-GAP, đặc biệt snapshot/evaluation, upload reconciliation, dedup, device identity, Q04/Q17.

## Tái kiểm

Python3 có PyYAML: chạy `python 09_Frontend/contracts/build_contracts.py`, sau đó `python 09_Frontend/contracts/validate_package.py` từ thư mục gốc gói. Typecheck/schema standards/provider tests phải bổ sung trong repository thật. `manifest.json` ghi hash từng file trước đóng ZIP; manifest không tự chứa hash của chính nó hoặc của ZIP để tránh vòng tham chiếu.
