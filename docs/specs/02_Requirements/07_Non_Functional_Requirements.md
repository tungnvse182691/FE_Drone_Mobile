# RoadGuard — 14. Non-Functional Requirements (NFR)

**Phiên bản:** EXT-R3-2026-09-26-v1 • **Ngày:** 26/09/2026 • **Trạng thái:** bản đặc tả bổ sung để review, chưa xác nhận triển khai hoặc nghiệm thu.

**Nguồn chuẩn:** 9 tệp người dùng cung cấp ngày 26/09/2026; xem bảng nguồn trong README. Quyết định CHỐT/KẾ THỪA trong nguồn giữ nguyên. Các chi tiết mới dưới nhãn **ĐỀ XUẤT** phải được PO/chủ dự án duyệt trước khi thành baseline. Q01–Q18 vẫn theo Mô tả dự án §21; không tự giải quyết bằng tài liệu này. Mã trường ở đây là mapping logic, không xác nhận schema/endpoint đã tồn tại.

## 14.1 Phạm vi và nguyên tắc nghiệm thu

Chi tiết hóa NFR-01–14 của FRD §5, không đánh số lại. Các invariant từ nguồn giữ nguyên; cách thử và mục tiêu số mới là ĐỀ XUẤT. Chưa benchmark, pentest, restore hoặc chứng nhận tuân thủ. Các NFR áp dụng toàn API/tệp/worker/Web/Android, theo module được chọn cho release; track nghiên cứu AI tách khỏi MVP.

Một NFR chỉ được pass khi có build, cấu hình môi trường, dữ liệu/workload, cách đo, kết quả, evidence và người duyệt. Chỉ tiêu TBD không được tự pass hoặc coi là miễn kiểm tra; ghi BLOCKED cho gate liên quan và chốt trước release.

## 14.2 Danh mục và cách kiểm chứng

| NFR | Nhóm | Yêu cầu | Phương pháp | Tiêu chí/mức độ | Owner/test |
| --- | --- | --- | --- | --- | --- |
| 01 | Bảo mật và phân quyền | Không đọc/ghi/tải tệp trái scope; không secret trong log; quyền server request kế tiếp | Ma trận 5 role × đúng/sai project/owner; thử ID trực tiếp và file download; thu hồi role/token; kiểm log đã redaction | 0 lần truy cập trái quyền trong bộ ca được duyệt; không khẳng định bao phủ mọi tấn công | BE/Security; TC-N01 |
| 02 | Bền vững và idempotency | Request cùng key+payload không tạo hai tác động; khác payload trả conflict | Ngắt sau DB commit trước response; retry; kill worker; so sánh số object/event/item | Một kết quả nghiệp vụ/key; không mất commit đã ACK; key retention phải chốt cho offline replay | BE/P2; TC-N02 |
| 03 | Concurrency và audit | Stale write không ghi đè; quyết định truy được actor/before/after/version | Hai PM đọc v1, A lưu v2, B ghi từ v1; xem audit | B bị conflict; dữ liệu A giữ nguyên; quyết định mới có audit | BE/P2; TC-N03 |
| 04 | Offline bền vững | Task/policy/ảnh đã lưu tồn tại sau restart; không hết quyền tác nghiệp chỉ do thời gian mất mạng | Airplane, force-stop, reboot; hết token rồi sync; đầy đĩa lúc ghi | Không báo đã lưu trước durable write; phục hồi queue, không xóa pending; Q04/17 cho conflict/recovery | Android; TC-N04 |
| 05 | Toàn vẹn tệp | Đúng nội dung/checksum/reference trước xác nhận hoàn tất | Thiếu part, đổi byte, MIME giả, URL hết hạn, retry multipart | Không complete thiếu/hỏng; không dùng ETag multipart giả MD5; resume có kiểm quyền | BE/Android; TC-N05 |
| 06 | Hiệu năng API | Metadata không chờ video/AI dài; pagination và tải theo scope | Đo p50/p95/p99, error rate, throughput; cold/warm riêng, workload §14.3 | PERF-TBD; đề xuất metadata p95 ≤2s, lỗi server <1% ở tải baseline; chưa là SLA | Tech Lead/QA/PO; TC-N06 |
| 07 | Bản đồ và khả năng mở rộng truy vấn | Viewport/zoom; không tải toàn bộ video/tấm dự án | Pan/zoom, đổi nhánh với dataset đã chốt; đo network/memory/render | MAP-TBD; đề xuất time-to-interactive overlay p95 ≤3s trên thiết bị baseline; chưa chốt FPS/RAM | FE/BE; TC-N07 |
| 08 | Sao lưu/khôi phục | Restore DB và object storage cùng căn cứ nhất quán | Restore môi trường cách ly; đối chiếu FK/checksum/đếm hồ sơ; không gửi thông báo thật | OPS-TBD; đề xuất RPO ≤24h, RTO ≤8h để thảo luận, phải được chủ dự án ký chốt | Ops/P2; TC-N08 |
| 09 | Quan sát vận hành | Correlation xuyên request/outbox/job; lỗi retry và queue age có theo dõi | Gây lỗi storage/AI; trace từ report đến job; kiểm redaction | Tra được nguyên nhân, retry count và owner xử lý; ngưỡng alert/retention log OPS-TBD | Ops/BE; TC-N09 |
| 10 | Tái lập AI | Manifest/model/config/raw immutable; mock tách real; late result không ghi đè | Replay job, model khác, split khác; kiểm hash và lineage | Mọi kết quả có nguồn/version; accuracy AI-TBD theo dataset; mock không chứng minh accuracy | AI/BE; TC-N10 |
| 11 | Migration và tương thích | Không mất lịch sử/enum legacy; đọc được snapshot cũ | Migration bản sao data thực đã bảo vệ PII; backfill null có kiểm; restore trước rollback phá hủy | Đối chiếu counts/FK/enum/hash; không tạo GPS hoặc BEFORE giả; plan rollback được duyệt | P2; TC-N11 |
| 12 | Khả dụng và ngôn ngữ | Tiếng Việt, đơn vị và source rõ; offline/conflict/pending khác nhau | Walkthrough WF, keyboard/focus, số thập phân/lat-lon/m-mm | Không nhầm đơn vị/trạng thái trong ca; lỗi có hành động phục hồi; accessibility chi tiết cần chốt | UX/FE/QA; TC-N12 |
| 13 | Tương thích thiết bị | Ma trận OS/browser/drone/firmware/video parser có version | Chạy thao tác trọng tâm trên từng thiết bị được chọn | Mỗi ô áp dụng có result; chưa chọn version/hardware thì BLOCKED, không “hỗ trợ mọi Android” | PO/QA; TC-N13 |
| 14 | Giấy phép và quyền dữ liệu | Package/model/weights/map/dataset có nguồn và quyền sử dụng | Kiểm BOM, license, model hash, quyền offline tiles, quyền ảnh huấn luyện | Không phát hành thành phần chưa được rà quyền theo phạm vi sản phẩm | Tech Lead/chủ dự án; TC-N14 |

## 14.3 Workload, SLO và scale — mẫu chốt trước đo

| Tham số | Đề xuất đầu vào thử, không phải dữ liệu sản xuất | Ai chốt |
|---|---|---|
| Người dùng đồng thời | 50 tại baseline; tăng 2×/5× để tìm điểm bão hòa | PO + Tech Lead |
| Dữ liệu nghiệp vụ | 20 dự án, 100.000 Defect, 500.000 report/observation; tấm/version theo tuyến mẫu | P2 + PO |
| Hỗn hợp metadata | 80% đọc/20% ghi; đo query map riêng; không suy là mô hình tải thật | QA + BE |
| Upload | 5 upload đồng thời; video kích thước/codec từ thiết bị thật; test mạng yếu riêng | Operator + Android |
| Chạy tải | Warm-up 5 phút + steady 30 phút; cold cache một lượt riêng | QA |
| Môi trường | CPU/RAM/DB tier/storage/network/region/build phải điền trước chạy | Ops |
| AI | Dataset split theo tuyến/chuyến/thời gian; số mẫu mỗi loại, GPU/CPU và ngưỡng pass AI-TBD | AI + PM |

Ghi cả latency DB, external dependency, queue wait và processing time; không cộng thời gian chạy AI vào latency nhận JobId. Tỷ lệ lỗi excludes lỗi 4xx cố ý trong bộ negative tests và phải công bố cách phân loại. Scale worker không tạo hai tác động vì lease/unique key; thử đụng lease và kết quả đến muộn. Không thêm microservice/Kubernetes chỉ vì có yêu cầu scale.

## 14.4 NFR bổ sung mới — ĐỀ XUẤT

| ID | Yêu cầu bổ sung | Cách nghiệm thu | Test |
|---|---|---|---|
| NFR-X01 | HTTPS; mã hóa dữ liệu nhạy cảm khi lưu theo hạ tầng; secrets ngoài repo; khóa có quản lý/rotation; backup được kiểm soát | Kiểm cấu hình transport/storage/secret scan; rotate khóa không làm mất dữ liệu; không hứa encryption thay quyền truy cập | TC-NX01 |
| NFR-X02 | Privacy theo mục đích; tối thiểu dữ liệu; public projection riêng; thời hạn theo nhóm dữ liệu | Inventory dữ liệu/owner/mục đích/retention; thử Reporter A không thấy B khi case gộp; quy trình xử lý quyền dữ liệu phải giữ nghĩa vụ lưu hợp lệ | TC-NX02 |
| NFR-X03 | Chống abuse và input nguy hiểm: rate limit auth/OTP/upload, giới hạn byte/type, parser GPX tắt DTD/external entity | Thử rate limit trả 429 và retry-after; XML external entity không truy cập mạng; file giả không được hoàn tất; ngưỡng security config TBD | TC-NX03 |
| NFR-X04 | Vận hành/deploy có health/readiness, rolling change tương thích, rollback và xử lý sự cố | Test dependency down không báo ready giả; rollback schema phải theo plan; theo dõi backlog trước/sau deploy | TC-NX04 |

## 14.5 Tuân thủ: sàng lọc phạm vi, chưa là chứng nhận

| Chủ đề | Đánh giá RoadGuard | Việc cần chốt/evidence |
|---|---|---|
| Việt Nam — bảo vệ dữ liệu cá nhân | Có tài khoản, email, ảnh và dữ liệu vị trí nên cần rà phạm vi xử lý. Luật 91/2025/QH15 có hiệu lực từ 01/01/2026 theo nguồn chính thức [L1] | Đơn vị phụ trách pháp lý xác định vai trò, cơ sở xử lý, thông báo, quyền dữ liệu, bên xử lý/cloud, chuyển dữ liệu và văn bản hướng dẫn áp dụng; không tự đặt thời hạn pháp định |
| GDPR | Không mặc định áp dụng chỉ vì phần mềm có email. Điều 3 quy định phạm vi lãnh thổ [L2]; chưa có thông tin về cơ sở hoạt động/đối tượng EU của RoadGuard | Đánh giá căn cứ áp dụng; nếu có, lập ma trận nghĩa vụ/control/evidence và phê duyệt riêng |
| PCI-DSS | Phạm vi hiện tại không có thanh toán thẻ. PCI SSC mô tả phạm vi cho đơn vị xử lý dữ liệu thẻ hoặc ảnh hưởng môi trường dữ liệu thẻ [L3] | Chưa có căn cứ áp PCI như gate RoadGuard; rà lại nếu tích hợp thanh toán hoặc hạ tầng liên quan CDE |
| Lưu hồ sơ | “Hết bảo hành +5 năm” kế thừa BC10/QT13/BR-45 như quy tắc dự án | Không gọi đây là kết luận pháp luật cho mọi dữ liệu; giữ tranh chấp ưu tiên; cần retention matrix riêng cho log, PII, video, backup |
| Drone/bản đồ/dữ liệu AI | Không điều khiển drone; giấy phép thư viện không thay quyền bay/ảnh/tile | Operator/chủ dự án xác nhận thủ tục, quyền dữ liệu, điều khoản nhà cung cấp theo địa điểm thực tế |

Nguồn chính thức tra cứu 26/09/2026:
- [L1 — Luật 91/2025/QH15, Cổng văn bản Chính phủ](https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroupid=3).
- [L2 — GDPR, Điều 3, EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/art_3/oj).
- [L3 — PCI DSS, Intended Audience, PCI SSC](https://www.pcisecuritystandards.org/standards/pci-dss/).

## 14.6 Gate và hồ sơ kiểm thử NFR

Mỗi TC-N/TC-NX dùng phương pháp và expected tại hàng tương ứng: (1) chuẩn bị môi trường/workload đã chốt; (2) thực hiện tình huống, lưu mốc; (3) đo/đối chiếu expected; (4) ghi actual, số liệu thô và evidence. Chưa có ngưỡng/môi trường → NOT_RUN và CONDITIONAL, không ghi PASS.

Gate đề xuất: không còn lỗi mất dữ liệu hoặc truy cập trái quyền; restore đã chứng minh; phần định lượng áp dụng đã chốt và đạt; ma trận thiết bị đủ kết quả; privacy/license có owner duyệt. PO có thể loại module khỏi scope có ghi nhận; không dùng waiver để biến lỗi phân quyền thành đạt. Quy trình phê duyệt release cần đội dự án xác nhận.
