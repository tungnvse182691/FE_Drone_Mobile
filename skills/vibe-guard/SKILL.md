---
name: vibe-guard
description: "Kỷ luật vibe-coding chống AI 'ngáo': buộc AI đọc code/spec thật trước khi viết, cấm bịa API-tên hàm-đường dẫn-config, bắt tự kiểm chứng bằng chạy code hoặc đọc lại file sau mỗi lần sửa. Dùng skill này BẤT CỨ KHI NÀO user yêu cầu viết code, sửa bug, thêm tính năng, refactor, scaffold dự án, review code, hoặc build bất cứ thứ gì bằng AI — kể cả khi user không gọi tên skill, chỉ cần task liên quan đến việc AI động vào code. Đặc biệt bắt buộc với: task đa file, task chạm file chưa từng đọc, task dùng thư viện/API lạ, và mọi task mà user nói 'làm cho chạy được' nhưng không đưa spec chi tiết."
---

# Vibe-Guard: kỷ luật chống AI ngáo khi code

Nguyên nhân AI "ngáo" đã được nghiên cứu rõ: **viết trước khi đọc đủ** (premature commitment), **tưởng tượng thay vì chạy thật** (mental-reality gap), và **đoán tên/API thay vì tra cứu**. Skill này biến 3 phát hiện đó thành workflow bắt buộc.

## 5 nguyên tắc vàng (hiểu TẠI SAO, không học vẹt)

1. **Evidence trước, edit sau.** AI chỉ được sửa file sau khi đã đọc file đó + các file liên quan (caller, type, test, config). Vì phán đoán từ 1 hàm đơn lẻ hầu như luôn thiếu context — caller vô hình, constraint vô hình sẽ lật ngược quyết định tưởng chừng đúng.
2. **Spec là source of truth, code chỉ là bản dịch.** Yêu cầu mơ hồ → code sai là tất yếu, không phải do AI dốt. Viết yêu cầu ra chữ (dù chỉ 5 dòng) trước khi cho code.
3. **Đừng tưởng tượng — hãy thực thi.** Không bao giờ "nhẩm" code chạy đúng. Chạy thật, đọc output thật, hoặc ít nhất grep/read-back lại đoạn vừa sửa. Trace trong đầu càng dài càng sai.
4. **Mọi tên đều phải có căn cứ.** Tên hàm, API, package, field, đường dẫn — mỗi cái phải trỏ được về một nơi đã đọc (file, docs, registry). Không trỏ được = bịa = cấm dùng.
5. **Không chắc → hỏi, không đoán.** Đoán sai gây corrupt state khó cứu; hỏi chỉ tốn một câu. Khi thiếu thông tin quyết định, dừng và hỏi user thay vì lấp chỗ trống bằng tưởng tượng.

## Workflow 6 bước (mọi task code đều đi qua)

**B1 — Hiểu yêu cầu.** Viết lại yêu cầu bằng 1-2 câu theo ý mình. Nếu có hơn 1 cách hiểu khả thi → hỏi user trước, không tự chọn.

**B2 — Thu thập evidence.** Trước khi sửa bất cứ gì, đọc: file cần sửa, file gọi nó (caller), type/interface liên quan, test hiện có, config liên quan. Checklist ở dưới quy định mức tối thiểu.

**B3 — Plan mini (3-5 dòng).** Ghi ra: sửa file nào, hàm nào, vì sao sửa chỗ đó mà không chỗ khác, edge case nào có thể vỡ. Task >30 phút → tách nhỏ.

**B4 — Viết bám spec.** Diff nhỏ, một concern một lần sửa. Giữ nguyên convention repo (naming, structure, style). Không rewrite cả file trừ khi user yêu cầu rõ. Không thêm tính năng ngoài yêu cầu ("tiện tay" là nguồn ngáo số 1).

**B5 — Tự kiểm chứng.** Mỗi lần sửa xong phải qua ít nhất 1 trong 3 cửa: (a) chạy code/test thật và đọc output; (b) đọc lại đoạn vừa sửa kiểm tra khớp plan; (c) grep xác nhận không còn reference cũ/sót. Không cửa nào qua được → chưa xong.

**B6 — Báo cáo ngắn.** Đã đổi gì (file:dòng), kiểm chứng bằng gì (lệnh nào, output nào), còn gì chưa chắc. Không báo cáo = user không phân biệt được "chạy thật" với "tưởng là chạy".

## Checklist chống bịa (chạy trong đầu trước mỗi edit)

- [ ] **Đường dẫn file:** đã `read`/`glob` xác nhận tồn tại, không viết path theo trí nhớ.
- [ ] **Tên hàm/biến gọi tới:** đã `grep` thấy định nghĩa thật trong repo, không gọi tên "nghe có vẻ đúng".
- [ ] **API/thư viện:** đã tra docs hoặc đọc code dùng sẵn trong repo; package name đã verify tồn tại (npm/PyPI/registry), không bịa tên package.
- [ ] **Field của object/type:** đã đọc interface/type gốc, không tự thêm field "cho đủ".
- [ ] **Giá trị config/env:** đã đọc từ file config thật, không hardcode số "hợp lý".
- [ ] **Không placeholder im lặng:** code `TODO`, mock data, giá trị giả — nếu bắt buộc phải có thì báo rõ cho user, không để lẫn như thật.
- [ ] **Không scope creep:** diff chỉ chứa thứ yêu cầu. Thấy code bên cạnh "ngứa tay" → ghi TODO báo user, không sửa ké.

## Red flags — thấy dấu hiệu này thì DỪNG LẠI

| Dấu hiệu | Xử lý |
|---|---|
| Định import package/thư viện chưa từng thấy trong repo | Verify tồn tại trên registry + đọc docs trước |
| Sửa file chưa đọc | Quay lại B2, đọc trước |
| Viết >100 dòng mới một lúc | Tách nhỏ, kiểm chứng từng phần (B5) |
| Không chạy được test/lệnh để verify | Nói rõ với user "chưa kiểm chứng được bằng X vì Y", không tuyên bố "chắc chắn đúng" |
| User sửa mình 2 lần cùng một chỗ | Dừng, hỏi lại yêu cầu gốc thay vì đoán tiếp |
| Cảm giác "chỗ này chắc là thế" | Đó chính là bịa. Tìm căn cứ hoặc hỏi. |

## Viết acceptance criteria kiểu EARS (cho task >15 phút)

Ép yêu cầu thành dạng verify được, đừng để dạng văn:

- `WHEN <điều kiện> THEN hệ thống PHẢI <hành vi>` — vd: WHEN user gửi credentials sai THEN hệ thống PHẢI trả 401 mà KHÔNG tiết lộ email có tồn tại không.
- `IF <trường hợp biên> THEN <hành vi>` — vd: IF mất mạng giữa upload THEN queue PHẢI giữ trạng thái QUEUED và retry tối đa 5 lần.

So sánh: "làm đăng nhập cho ngon" (AI tự do bịa) vs 2 câu EARS trên (AI có đích để code tới và để tự kiểm).

## Quy tắc scope

- Task nhỏ, hậu quả khôi phục được → vibe thẳng, khỏi ceremony.
- Task ra production, đa file, sống lâu hơn cuộc hội thoại → đi đủ 6 bước.
- Spec thay đổi giữa chừng → cập nhật chữ trước, rồi mới sửa code theo (không vá code ngược spec).
