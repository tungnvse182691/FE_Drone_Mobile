# Crew deep consistency — 19/11/2026

Mode: IMPLEMENT_AND_SELF_REVIEW (Codex), không phải independent review hay owner approval.
Base: main `0206b84d059b31f9d9a8cffc82d9255e38b9f2c9`. Không fetch/pull/push, đổi branch, restart app/emulator hoặc thay dữ liệu.

## Phạm vi và thứ tự

A Chi tiết → B1 Theo dõi thi công → B2 Hồ sơ hoàn tất → B3 Kết quả/bổ sung → C Khuyết tật → D Hồ sơ hiện trường (3 modes) → E Kiểm tra an toàn. Mỗi checkpoint source/test/native/worklog/commit riêng. Chỉ UI; giữ handlers, điều kiện, route params, identity, API, receipt, journal.

## Audit và hướng áp dụng

Đọc AGENTS, DESIGN, tokens, worklog 18/11 và summary/phase2 19/11; đối chiếu ảnh native hiện tại và ảnh cũ. Áp dụng roadguard/code-review, mobile-design, vercel-react-native-skills, Expo building-native-ui/animations. Owner feedback là authority về hướng trình bày, test không thay duyệt hình thức.

1. Hero Chi tiết thiếu ID, title đậm và icon chiếm chiều ngang: đưa ID thật thành nhãn, title Roboto regular 16/22 wrap.
2. Status/mode nằm hai hàng: gom thành hàng wrap, giữ hai nhãn riêng.
3. Các heading đều cùng cỡ title: phân cấp section 14/20, body 14/21, hint 12.
4. Khoảng padding/margin cộng dồn làm ít thông tin trên màn: nhóm liên quan với padding/gap 8–12.
5. Nút đọc phụ trải hết ngang: giới hạn theo nội dung, vẫn min48dp và wrap.
6. Nhóm an toàn có nền card trong card: dùng divider giữa biện pháp/quyết định.
7. Ba lối mở planned repair chung một khung: từng hàng kem viền nhẹ48dp, không card bao lồng.
8. Plan tiếp tục lồng card: đưa thành section divider. Shared non-overview vẫn giữ style cũ, sẽ kiểm B1/B2.
9. B1/B2 shared panels còn dày/nhãn uppercase, B2 có tím: cần baseline từng màn trước sửa.
10. Safety modal done trống theo owner: kiểm read-only ở E, không gửi thêm để dựng trạng thái.

## A — Chi tiết nhiệm vụ

Files: `app/(crew)/wo-detail.tsx`, `src/components/crew/CrewTaskFacts.tsx`, `src/components/crew/CrewRepairFacts.tsx`.

- Thực hiện các mục1–8. Bỏ replayOnFocus riêng content transition Chi tiết; giữ entry transition. RepairFacts refresh/disclosure dùng CrewPressable có scale/ripple, kế thừa Reduce Motion. Button chung không có spring, không nhận là đã thêm spring cho mọi nút.
- Android emulator-5554 / Pixel_6_Pro,1440×3120, Expo Go đang mở. Fixture `ebcdca88-ce04-40e9-80b5-be23e1286a13`, project `72f84201-c001-4000-8000-000000000001`, Submitted/NORMAL. Không mutation.
- Native đọc vị trí/lịch sử:3 sự kiện; đóng disclosure. Đọc hồ sơ an toàn:1 biện pháp đã lắp,4 kiểm tra,1 ảnh đủ điều kiện,0 request; mở/đóng disclosure. Nội dung/time vẫn giữ nguyên; không xem Submitted là hoàn tất.
- Evidence folder `.cache/crew-deep-consistency-20261119/`: `A-detail-before-top.png` → `A-detail-after-top.png`; `A-detail-before-history.png` → `A-detail-after-history.png`; `A-detail-before-safety.png` → `A-detail-after-safety.png`; `A-detail-before-plan-lower.png` → `A-detail-after-plan.png`. Cùng task/state, offset scroll không trùng pixel do chiều cao section thay đổi. Ảnh after-history cắt sự kiện3 tại dock; hierarchy lần scroll tiếp xác nhận đủ3. Ảnh plan before/after đã xem trực tiếp.
- Self-run `npx tsc --noEmit`: exit0. Targeted6 files (crew-c3-detail, crew-c10bc, c10bc-ui, crew-safety-discovery, crew-nav01, crew-home-motion):82/82 PASS (`A-targeted.log`). Full `node --test --test-concurrency=2 tests/*.test.cjs`:1846/1846 PASS,167863.7575ms (`A-full.log`).
- AST presentation comparison against0206b84:3 files PASS (non-JSX statements/action/disabled/loading/identity/accessibilityState); manual diff reviewed. `git diff --check` PASS. No services/hooks/DTOs modified.
- NOT_TESTED: native offline/error, font scaling, OS Reduce Motion toggle, measured FPS, mutation/receipt/upload/restart; không chứng minh bằng test Node. Route traversal checkpoint tiếp tục B/C. Chưa có owner visual approval.

## B1/B2/B3/C/D/E

Chưa hoàn tất; không dùng các commit Phase2 làm bằng chứng duyệt cho task này.

## B1 — Theo dõi thi công

Files: `app/(crew)/progress.tsx`, `app/(crew)/wo-detail.tsx`. Hero kem padding12, ID nền trắng, title regular16/22; nhóm bước hiện tại rõ nhãn/value, disclosure48dp dùng CrewPressable scale/ripple có Reduce Motion. Số đo/ảnh là hai cột có divider thay hai ô xám, giữ nguyên nguồn và điều kiện.

- Android cùng fixture A: mở/thu đủ4 bước, cuộn hồ sơ trước sửa, mở/thu lịch sử kỹ thuật và Back về Chi tiết. Không bấm CTA mutation;0 số đo/0 ảnh đúng nháp scope hiện tại; cảnh báo nháp phiên cũ giữ nguyên.
- Before `B1-before-top.png` → final `B1-after-top.png`; expanded final `B1-after-steps-stable.png`; technical `B1-after-history.png` trong cùng evidence folder. `B1-after-steps.png` chỉ là ảnh tương tác đang ripple, KHÔNG dùng final. Top cùng scroll đầu; lower offsets thay đổi theo chiều cao.
- Self-run TypeScript exit0; targeted5 files96/96 PASS (`B1-targeted.log`); full1846/1846 PASS161842.2238ms (`B1-full.log`). AST2 files against051cac8 + manual diff + diff check PASS. Không đổi handlers/guards/data expressions.
- NOT_TESTED: started/finished fixture, native offline/error, font scaling, OS Reduce Motion toggle, FPS, mutations/receipts/upload. Tests không thay native/owner approval.

## B2 — Hồ sơ hoàn tất thi công

Files: `app/(crew)/complete.tsx`, `app/(crew)/wo-detail.tsx`. Hero kem padding12/ID trắng/title regular16/22; closeout heading14/20; bỏ tím ở trạng thái đã gửi, neutral ở chưa kết thúc. Ba số đếm có divider thay ô xám lớn; disclosure48dp CrewPressable, nút đọc phụ theo nội dung nền kem. Không đổi điều kiện/handlers/nguồn số đếm hay trạng thái.

- Android cùng fixture A/B1: đọc trạng thái nhiệm vụ Đã gửi hồ sơ và hạng mục Chưa kết thúc thi công riêng; mở/đóng bản lưu (0 số đo/0 BEFORE/0 AFTER), xem phương án/lịch sử, Back về Chi tiết. Không mutation.
- Evidence: `B2-before-top.png` → `B2-after-top.png`; `B2-before-expanded.png` → `B2-after-evidence-stable.png`, đã xem trực tiếp. Ảnh expanded trước ở đầu scroll; final ở vị trí thấp hơn để thấy đầy đủ bản lưu. `B2-after-expanded.png` bị reset disclosure bởi Fast Refresh nên không dùng làm proof expanded.
- Self-run TypeScript exit0; targeted5 files96/96 PASS13333.9819ms (`B2-targeted.log`); full1846/1846 PASS165088.0011ms (`B2-full.log`). AST2 files against b8f8ac3, manual diff và diff check PASS. Shared NormalRepairPanel callers: detail overview, progress, complete; style closeout tách progressWork của B1. Không services/hooks/DTO thay đổi.
- NOT_TESTED: finished/serverSubmitted closeout fixture, native offline/error, font scaling, OS Reduce Motion toggle, measured FPS, mutation/receipt/upload. Không nhận owner visual approval.

## B3 — Kết quả và yêu cầu bổ sung

File: `app/(crew)/repair-correction.tsx`. Summary nền kem padding12/gap8; title regular16/22, body14/21; ID nền trắng, nhóm nhiệm vụ có divider. Disclosure lịch sử48dp giữ CrewPressable/Reduce Motion; heading lịch sử14/20 và nút đọc lại theo nội dung nền kem. Giữ toàn bộ repairReviewPresentation, accepted/tone, recovery và journal hooks.

- Android cùng fixture A/B1/B2: Chưa có lượt gửi / Chưa có hồ sơ sửa chữa; mở/thu lịch sử, đọc lại lịch sử biên nhận (vẫn rỗng), Back về đúng Chi tiết. Không mutation. Caller search ReceiptHistory/Recovery chỉ có trong file này.
- Evidence: `B3-before-top.png` (saved, chưa xem trực tiếp); `B3-before-history.png` (đã xem, gồm phần top) → `B3-after-top.png`, `B3-after-history.png` (đã xem, ổn định). Cùng task/state, disclosure mở lại sau Fast Refresh.
- Self-run TypeScript exit0; targeted5 files96/96 PASS13456.0826ms (`B3-targeted.log`); full1846/1846 PASS165696.0049ms (`B3-full.log`). AST against228a91b và manual diff PASS; git diff --check PASS. Không đổi handlers, disabled/loading, data/conditions hay API.
- NOT_TESTED: SUPPLEMENT/ACCEPT/waiting states native, offline/error, OS Reduce Motion/font scaling/FPS, mutation/upload/server receipts. Chưa có owner visual approval.

## C — Khuyết tật thuộc nhiệm vụ

Files: `app/(crew)/report-defect.tsx`, `tests/crew-ui-patch11.test.cjs`. Nhãn sentence case đưa vào cùng khung nội dung; ID trắng trước title regular16/22 trên nền kem. Banner một lớp thay card trong card, vị trí dùng divider; nhóm padding12/gap8, nút xem hồ sơ theo nội dung48dp nền kem. Không bỏ dữ liệu. Bỏ replayOnFocus, vẫn giữ entry transition. Test chỉ cập nhật bốn nhãn presentation từ uppercase sang sentence case; không nới gate nghiệp vụ.

- Android cùng fixture A: cuộn đầu/cuối, mở Xem hồ sơ đã nộp → đúng Hồ sơ hiện trường ebcdca88, Back về Khuyết tật; Về chi tiết nhiệm vụ → đúng task Chi tiết. Không mutation; missing classification/coords vẫn đúng nguồn.
- Evidence `C-before-top.png` / `C-before-lower.png` → `C-after-top.png` / `C-after-lower.png`. Before-lower và after-top đã xem trực tiếp. Cùng task/state; lower offset thay đổi khi tổng chiều cao giảm. Không dùng màn Hồ sơ làm ảnh C.
- Self-run TypeScript exit0; targeted5 files77/77 PASS9606.3681ms (`C-targeted.log`); full1846/1846 PASS170221.8655ms (`C-full.log`). AST against67445a2 non-JSX/action props PASS; manual JSX điều kiện/nguồn/route params không đổi, diff check PASS.
- NOT_TESTED: có tọa độ/phân loại và chưa có hồ sơ trên native, offline/error, font scaling, OS Reduce Motion toggle, FPS. Không camera/upload/submit. Chưa owner visual approval.

## D — Hồ sơ hiện trường

File: `app/(crew)/field-review.tsx`. Hero kem padding12, ID trắng viền vàng, title regular16/22; heading14/20. Nhóm số đo/ảnh/vị trí sát hơn, vị trí và giải thích recovery dùng divider. Nút đọc/chỉnh theo nội dung, min48dp. Ảnh máy chủ dùng CrewPressable có ripple/scale/Reduce Motion; placeholder4:3 ghi rõ “Chạm để tải ảnh”, ảnh local giữ nguyên nhánh render. Không đổi state, handlers, điều kiện, API hay lưu nháp.

- Native baseline đã đọc ba modes: FastTrack `9b840ab7`, planned `c0b9c48f`, measure-only `970f90aa`; cùng project72f84201-c001-4000-8000-000000000001. Không ép nháp qua phiên.
- Planned: after-top title dài wrap; vẫn5cm/5ảnh, cuộn đủ5 placeholder. Bấm ảnh đầu mở ảnh thật, đóng preview, Back đúng Chi tiết rồi về Tasks. Chỉ chứng minh ảnh đầu tải/xem được, không nhận cả5 ảnh đã tải hay HTTP trace verified.
- Measure-only: after vẫn2cm, dụng cụ/phương pháp “tay”,2ảnh; mở/thu giải thích nháp phiên cũ, đọc đủ nội dung; không bấm tạo nháp/đối soát. Cuộn thấy đủ hai placeholder.
- Before→after trong evidence folder: `D-planned-before-top.png`→`D-planned-after-top.png`, `D-planned-before-evidence.png`→`D-planned-after-evidence.png`; `D-measure-before-top.png`→`D-measure-after-top.png`, `D-measure-before-evidence.png`→`D-measure-after-evidence.png`. Ảnh final top/evidence đã xem trực tiếp. Recovery mở: `D-measure-after-recovery.png`; ảnh tải thật: `D-planned-after-preview.png`. Scroll lower không trùng pixel do chiều cao thay đổi.
- Self-run TypeScript exit0; targeted6 files82/82 PASS16481.9444ms (`D-targeted.log`); full1846/1846 PASS170064.4139ms (`D-full.log`). AST against8bbb634 giữ non-JSX/action props PASS; manual diff, diff check PASS. Không fixture hardcode.
- NOT_TESTED: FastTrack after (baseline `D-fasttrack-before-top.png`/lower có); edit measurement/location/camera/submit/upload không thao tác để bảo toàn draft; native offline/error, font scaling, OS Reduce Motion toggle, FPS.
- Native blocker sau khi rời measure-only sang Sync: mở hồ sơ9b840ab7 không đến được đúng task; app hiện Chi tiết970f90aa. Nút về danh sách/tab/Back Android chưa chuyển màn qua nhiều lần quan sát; press phản hồi và Metro/CDP còn kết nối, console error/warn truy vấn không có mục mới. Chưa xác định nguyên nhân, KHÔNG quy kết do BE hay sửa navigation ngoài scope. Không restart/reload; đã hỏi owner quyền mở lại riêng app để tiếp tục FastTrack/E. Không nhận route toàn app PASS từ ca này.
- Chưa owner visual approval. Scope E chưa sửa; chờ vào đúng modal lấy baseline native.
