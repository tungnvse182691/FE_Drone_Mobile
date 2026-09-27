# Document contract gate — REVIEW-01

Gói hiện đã nằm trong repository, nhưng chưa có bằng chứng hook này được cài và enforce trong CI production. Các lệnh sau chạy được trong checkout và cần được đưa vào pipeline trước merge/release; không tuyên bố CI production đã được bật.

```text
python 09_Frontend/contracts/check_contracts.py
python 09_Frontend/contracts/validate_package.py
```

Windows CMD có thể chạy `ci\check-docs.cmd`. Check hash chỉ dùng Python stdlib; validator cần PyYAML theo dependency pin của repository. Pipeline phải fail khi exit code khác0; không dùng continue-on-error. Hai YAML phải bằng nhau theo SHA256 của bytes và bằng contract.lock.json. Thiếu file, sửa riêng một YAML, hoặc sửa cả hai nhưng không review/update lock đều fail. `build_contracts.py` cũng chạy gate trước khi sinh types.

Update contract: sửa canonical → review diff/compatibility → cập nhật snapshot và lock/hash/version trong cùng change được review → regenerate types/schema/catalog → chạy checks → provider/consumer tests. Lock không phải chữ ký phê duyệt; thay cả YAML và lock không thể tự chứng minh business approval. Git review/branch protection phải enforce theo repo thật. Dùng `.gitattributes` của repo để giữ YAML LF, tránh CRLF làm đổi byte hash ngoài ý định.

Script validate cấu trúc không thay full OpenAPI validator, TypeScript compiler, provider/device/UAT tests hoặc gate Q02/Q03/Q04/Q17. Không vì contract hash PASS mà gán readiness nghiệp vụ PASS.
