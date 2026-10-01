# RoadGuard — 5. Auth & Permission Model

**Phiên bản:** TECH-R3-2026-09-26-v1 • **Trạng thái:** thiết kế đề xuất dựa trên bộ RoadGuard R3. Chưa có repository, ERD hiện hành, OpenAPI thực tế hoặc môi trường chạy để đối chiếu. Không khẳng định endpoint/code/transaction dưới đây đã được triển khai.

**Ưu tiên nguồn:** [decision register](../../../../planning/V2/V2-3_DECISION_REGISTER.md) áp dụng D01-D28/32-44; chỉ gate kỹ thuật được register giữ lại còn mở. Không tự sửa enum số, chuyển DB, nâng framework hoặc đổi runtime/Done từ thiết kế.

## 5.1 Nguyên tắc bắt buộc

RBAC theo role **kết hợp kiểm thuộc tính đối tượng**. Backend không tin role/projectId/ownerId từ client, không chỉ verify JWT signature rồi đọc DB. Mỗi request cần: account active → token/session chưa bị thu hồi → role hiện hành → membership còn hiệu lực hoặc Reporter ownership → assignment/phạm vi → state/version/điều kiện nghiệp vụ. Thiếu một điều kiện thì deny.

Supervisor (Admin) là quyền trong danh mục được cấp quản trị; không suy quyền toàn bộ mọi tenant nếu hệ thống sau này có multi-tenant. Một PM chính/project; PM được giao nhiều project. Crew là đội tác nghiệp có đội trưởng đăng nhập, không tự coi đội là tài khoản dùng chung. Thành viên không có account vẫn có thể được lưu tên người thực hiện theo DD.

## 5.2 Ma trận quyền nghiệp vụ

| Chức năng | Supervisor/Admin | PM | Crew | Operator | Reporter |
|---|---|---|---|---|---|
| Tạo project, giao PM, accounts/membership | Có theo scope quản trị | Không | Không | Không | Không |
| Nhập/chỉnh route draft, chia segment | Xác nhận route version; không thay vai trò PM nhập | Có dự án mình | Đọc phần task | Đọc phần task | Không |
| Gửi phản ánh/đọc kết quả public | Không qua API Reporter trừ khi có vai trò phù hợp riêng | Nội bộ qua case, không giả ownership | Ghi lỗi mới qua luồng task đề xuất riêng | Theo phạm vi đã giao | Chỉ phản ánh mình, phải xác minh email |
| Phân cấp/chọn kiểm chứng/gom đo/ưu tiên | Điều phối ban đầu theo quyền, không thay PM quyết định thường lệ | Có project mình | Đề xuất/báo, không đổi chính thức | Báo thiếu dữ liệu | Không |
| Soạn policy | Quản trị rule nền theo quyền; Q02 không tự thêm duyệt policy | Soạn; quyền activate chi tiết Q02 | Đọc snapshot được giao | Không cần policy sửa | Không |
| Đo | Không thay Crew | Giao và review | Theo assignment/task | Không | Không |
| Sửa Fast Track | Nhận thông báo sau PM đóng | Giao nhiệm vụ/policy; review/đóng | Chỉ đúng task, policy, evidence, không PM block | Không | Không |
| Duyệt APPROVAL_TRACK | Quyết định từng item | Trình/chỉnh phần bị trả | Không | Không | Không |
| Giao/đổi đội sửa | Không tự thay vai trò PM | Theo nhánh đã đủ quyền | Nhận/từ chối trước nhận; không tự chuyển đội | Không | Không |
| Nghiệm thu/đóng | APPROVAL_TRACK; case hỗn hợp đủ phần | Đóng FT; kiểm và trình nhánh duyệt | Gửi kết quả, không đóng | Không | Không |
| Bay/upload khảo sát | Giám sát | Giao/bổ sung/xác nhận baseline | Không | Đúng task, nhận/từ chối, nộp dữ liệu | Không |
| Dashboard/export | Danh mục quyền quản trị | Chỉ project mình | Tiến độ task riêng | Tiến độ task riêng | Public timeline ownership |
| Xóa/hold | Duyệt, đặt/gỡ hold | Yêu cầu đủ hạn | Không | Không | Không xóa hồ sơ nội bộ |
| Model/nhãn | Phát hành model/export nhãn đã duyệt | Duyệt nhãn đúng scope | Không | Không | Không |

Supervisor không mặc nhiên được dùng endpoint PM thay actor PM chỉ vì cấp cao hơn. Nếu cần delegated PM phải có quyết định và audit rõ; chưa có trong baseline này.

## 5.3 Policy cho endpoint

Danh sách operation → role/policy đầy đủ tại §3.3 và YAML. Đây là hợp đồng bổ sung cho `security: bearerAuth`; generator phải triển khai policy filters/application checks thủ công.

| Nhóm policy | Kiểm tra đối tượng/state bắt buộc |
| --- | --- |
| admin | Current Supervisor và phạm vi quản trị; audit; thay role/reset/suspend revoke sessions trong transaction. |
| ai | PM/Supervisor tạo/retry; Operator chỉ read job task mình; callback riêng service audience+jobAttempt binding, không user JWT. |
| analytics | PM project, Supervisor danh mục; query aggregate đã lọc scope trước tính tổng. |
| auth | Public auth chịu rate-limit; intent/invitation/refresh là credential riêng. Self chỉ subject hiện tại; mustChangePassword chỉ được đổi password/logout/me tối thiểu. |
| case | PM project; Supervisor triage unassigned case; closeMixed chỉ Supervisor sau tất cả acceptance. Public projection riêng. |
| catalog | Read nội bộ đúng module; chỉnh chỉ Admin; ngừng không xóa lịch sử. |
| defect | PM decide; Crew/Operator read chỉ lỗi gắn task của họ, không toàn project. |
| emergency | PM kích hoạt riêng, lý do/scope tạm/năng lực đội; không suy từ urgency. |
| export | Kiểm quyền lúc tạo và lúc tải; quyền mất thì không trả tệp cũ chỉ vì export được tạo trước đó. |
| file | Kiểm owner+purpose+target/project tại init/part-url/complete/get/download; Reporter chỉ ảnh mình hoặc ảnh được công bố liên quan; không theo fileId tồn tại. |
| inspection | Crew lead đúng crew/active assignment/task; task_mode/policy/PM block check; PM assign đúng project. |
| notification | Chỉ recipient; event không lộ object/name ngoài scope dù đã nhận notification trước thu hồi. |
| plan | PM project, concurrency version aggregate kế hoạch; gợi ý hệ thống không thay thứ tự. |
| policy | PM create; activate conditional Q02/03; Crew chỉ version tham chiếu task đang được phép đọc. |
| project | Supervisor quản lý; read nội bộ cần active membership cho PM/Operator/Crew và chỉ projection/phạm vi cần thiết. |
| repair | Crew đúng assignment; PM review FT, Supervisor accept Approval Track; decision không tự cấp quyền nếu state sai. |
| report | Reporter verified; owner_id từ subject; ownership lại khi file download; không trả internal Case. |
| retention | PM request; Supervisor approve/hold; recheck retention+hold trước effect; không delete synchronous từ request. |
| route | PM project cho draft/segment; Supervisor confirm; published version immutable. |
| survey | Operator đúng assignment; PM scope; cancel chỉ trước dataset verified; baseline từng band đủ điều kiện. |
| sync | Account active khi sync, actor/device hợp lệ; kiểm từng command theo policy nguyên thủy và snapshot; conflict giữ local, không cấp quyền hiện hành bằng snapshot cũ. |

## 5.4 Session/token — chi tiết kỹ thuật đề xuất

Access JWT ngắn hạn, refresh token rotate và lưu hash; TTL cụ thể SECURITY-TBD, không tự ấn định số ngày từ bản này. Claims tối thiểu `sub`, `sid`, `iat`, `exp`, `iss`, `aud`, security version. Role claim chỉ tối ưu UI, server tra quyền hiện hành hoặc cache có invalidation bảo đảm request kế tiếp nhận revocation. Không cache vô hạn quyền.

Web chọn cơ chế lưu refresh sau rà kiến trúc hiện hành. Nếu BFF/cookie HttpOnly/Secure, cần CSRF cho mutation và cập nhật OpenAPI security tương ứng; bản YAML hiện mô tả **bearer API cho client/native**, không đồng thời tuyên bố cookie flow đã có. Không lưu refresh/token nhạy cảm trong localStorage như quyết định mặc định. Android lưu secret qua cơ chế bảo vệ nền tảng; SQLite/Room cho dữ liệu nghiệp vụ không thay kho khóa.

Login hết hạn/role đổi/reset/suspend: revoke theo CN01/QT02. Token hết hạn không xóa offline queue. Client đăng nhập lại trước gửi server; nếu tài khoản ngừng, D06/42A yêu cầu Supervisor cho phép handover và PM đúng project nhận, giữ actor/source; rescue endpoint chưa được coi là implemented. Không cấp token vô hạn.

Reporter registration tạo PENDING; không business token trước OTP hợp lệ. OTP hash, expiry, max attempts, resend cooldown; phản hồi không tiết lộ email tồn tại. Invitation token một lần gắn email/role/scope do Supervisor quyết định, không cho accept payload đổi role. Supervisor reset buộc đổi lần login kế; không bao giờ hiển thị mật khẩu cũ.

## 5.5 Offline, tệp và integration trust boundary

Offline snapshot là bằng chứng quyền/điều kiện đã nhận tại thời điểm tải, không là token API. Crew có thể thực hiện nhiệm vụ đủ điều kiện khi offline không có timer tự hết quyền nghiệp vụ. D05 yêu cầu acknowledgement trước khi đội mới start cùng scope; khi sync khác version/assignment/policy, giữ bằng chứng và conflict cho PM, không tự downgrade policy hoặc nghiệm thu.

Upload dùng signed **PUT** giới hạn object/part/purpose/time; cấp lại URL phải kiểm quyền. Read dùng gateway authorization mỗi request để đáp ứng FR-01 khi quyền đổi. Nếu repo dùng signed GET, phải phân tích cửa sổ truy cập sau revocation và điều chỉnh thiết kế có quyết định; không hứa revoke ngay một URL đã ký độc lập.

AI service dùng audience/credential riêng, không role người dùng. Token/certificate service được cấp qua hạ tầng, không có endpoint cấp service token công khai trong draft. Result callback bind job/attempt/manifest/model; signature/token hợp lệ vẫn phải kiểm schema/hash/file ownership. AI không được trực tiếp ghi business tables hay quyết định nghiệm thu.

## 5.6 Quy tắc chống IDOR và test tối thiểu

Default deny; chỉ lấy projection đã allowlist. Query lấy object theo scope ngay trong DB thay vì tải rộng rồi lọc UI. Đối tượng không thuộc scope trả404 để không lộ sự tồn tại; hành động sai role nhưng object được biết hợp lệ có thể403 theo convention. Audit deny có trace và reason code, không log dữ liệu của object trái quyền.

Test bắt buộc: PM-A đọc/đổi projectB; CrewA gửi task CrewB; ReporterR1 đọc ảnh R2 trong case gộp; sửa role/ownerId trong JSON; URL tệp cũ sau revoke; export snapshot sau mất quyền; callback AI dùng user token/sai attempt; replay idempotency sau revoke; suspended account sync còn data local. Trace TC-F01/22/25/35, TC-N01, UAT-05/11.

## V2(3) amendment — 2026-09-28

This document follows `planning/V2/V2-3_DECISION_REGISTER.md`. Reporter email/password plus one-time email OTP is approved by D25. Web secure cookie/server session and Android access/refresh transport are `APPROVED_DESIGN` under 36A; TTL/OTP values in 37 are `APPROVED_PILOT_CONFIG`. These decisions require compatibility, CSRF/CORS/session implementation and tests and are not claims that runtime already changed. Offline handover/rescue authority follows D05/D06/42A; wire lifecycle and security verification remain open.
