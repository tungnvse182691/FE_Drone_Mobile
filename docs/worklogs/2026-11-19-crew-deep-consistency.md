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
