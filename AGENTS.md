# AGENTS.md — RoadGuard Mobile

Entrypoint cho mọi agent. Chỉ đọc thêm nguồn đúng task; không nạp toàn bộ specs, worklogs hoặc skill references.

## 1. Authority và phạm vi

Áp dụng [canonical governance](docs/specs/00_Governance/01_Authority-and-Source-of-Truth.md):

| Trục | Authority |
|---|---|
| Business | Quyết định owner mới nhất có scope/ngày/nguồn + canonical governance |
| Implementation | Controller/DTO/service/repository/guard BE tại SHA đã pin + HTTP contract được ủy quyền |
| Verification | Lệnh thực thi, SHA, môi trường, output và giới hạn; logic/HTTP/native/Android là các trục riêng |
| Lịch sử | Scaffold, mock, worklog/spec cũ chỉ để truy vết, không cấp production authority |

Canonical 17_10 đè tài liệu lịch sử (`14-9/`, `22_9/`, `27_9_V3`, `28_9`, spec v1/v2), không đè quyết định owner hiện hành, governance, current BE hoặc executed evidence. Owner khác source: ghi EXPECTED/ACTUAL + `PRODUCT_SOURCE_GAP`. Thiếu wire/guard: `BE_CONTRACT_GAP`; thiếu discovery: `BE_DISCOVERY_GAP`; thiếu fixture: `BE_FIXTURE_BLOCKED`. Fail closed bước phụ thuộc, tiếp tục phần độc lập an toàn.

Catalog 241 operations / 223 paths / 357 schemas / 47 controllers là snapshot Phase2C 15/10/2026 tại `36c3a1d273f17dd29b816136ae0182a821fd79e4`, không phải số lượng hiện hành. Inventory mới phải có method/path/actor/status/SHA/delta; không tự đổi thành 260.

Chỉ làm scope owner giao. Codex implement theo allowlist ở chế độ `IMPLEMENT_AND_SELF_REVIEW`; independent reviewer/Muse mặc định `AUDIT_READ_ONLY` (chỉ đọc/search/git show/báo trong chat; không sửa source, worklog, fixture, index hay commit). Ngoài scope: báo file/lý do/tác động trước khi sửa. Worklog chỉ ghi khi task cho phép, attribution đúng mode/reviewer/SHA/evidence.

## 2. Invariants sản phẩm

- **Bê tông Hoàng Hải** — Công ty TNHH Xây dựng Bê tông Hoàng Hải; package `com.hoanghai.roadguard`, scheme `roadguard`, email nội bộ `@hoanghai.vn`. Bỏ Cát Tường/`com.cattuong`/`@cattuong.vn`/`CT-`; không tự chế prefix `HH-`.
- Mobile chỉ có `REPAIR_CREW` (`(crew)`), `DRONE_OPERATOR` (`(drone)`), `REPORTER` (`(reporter)`). PM/Supervisor thuộc Web; bản mobile lịch sử tại `8df1740` không cấp quyền hiện hành. Wire→local role phải qua adapter. Reporter đăng ký email + password + OTP, không tự thêm tracking công khai.
- Fast Track: task cho phép đo và sửa, có BEFORE, API-146/policy revision cùng Crew package/item/binding/itemVersion thật và mọi precondition verified. Server quyết định eligibility, không hardcode ngưỡng. `MEASURE_ONLY` cấm sửa; AFTER gửi PM trực tiếp đánh giá/đóng lỗi, không thêm Supervisor gate. Reporter/Drone BEFORE được tái dùng khi đúng vị trí/hiện trạng và có nguồn.
- UD-06: UI `app/` không input/render tiền, dự toán, kinh phí hoặc định mức/tiêu hao vật tư. Dùng **phương án kỹ thuật + kích thước thực tế (m²/cm/m) + thời hạn**.
- BTXM theo TCVN 10380:2014 (dày 18–22cm, tấm 3.5m × 5.0m); cấm asphalt/LiDAR. Khảo sát 4K RGB + DSM/OpenDroneMap. Pilot ĐH.05, Bình Chánh: Vĩnh Lộc B, Cầu Bà Lát Km01+850, Tân Kiên Km03+100; không biến pilot thành dữ liệu runtime giả.
- Nguồn defect: `src/constants/defect-types.ts`, `DefectTypeCode`, `defectTypeLabel(code)`; chỉ `POTH_DEEP`, `DEPR_POND`, `EDGE_BRK`, `SLAB_CRK`, `SHLD_EROS`.
- GeoJSON/WGS84 wire `[lon, lat]`; Google Maps dẫn Crew đến defect, Drone đến rendezvous/access point.

Chi tiết theo [permission matrix](docs/specs/01_Product-and-Roles/02_Actor-Client-Permission-Matrix.md), `docs/specs/02_Business-Workflows/`, screen/API matrix đúng role trong `docs/specs/06_Mobile-Expo/` và current BE guard.

## 3. Invariants kỹ thuật và dữ liệu

- Giữ Expo Router + TypeScript, Zustand, TanStack Query, expo-sqlite, các module Expo camera/location/media-library/file-system/document-picker, axios, safe-area/gesture hiện hành. Cấm Redux Toolkit/React Navigation thuần. Không tự thêm package/provider/native crypto/plugin/app config; cần approval cụ thể và native proof phù hợp.
- Root `<Stack />` luôn mount; auth/must-change-password/role guard điều hướng trong `useEffect`, entrypoint `app/index.tsx`. Route có group đầy đủ (`/(crew)/…`, `/(drone)/…`, `/(reporter)/…`, `/(auth)/…`), mapping ở `src/constants/routes.ts`. Không import ngược từ `app/_layout.tsx`, không conditional `<Redirect />` thay Stack.
- Journal durable trước POST; identity actor/environment/session/resource, body, version, Idempotency-Key bất biến. Exact replay giữ actor/body/key. Timeout/cancel giữ `UNKNOWN_OUTCOME`; logout không xóa pending; kiểm session sau mọi await/restart. Không fake ID/hash/version/ACK; task/eligibility ETag không phải RepairItem rowversion. Batch HTTP 200/local ACK không thay durable per-item receipt/readback.
- Server là authority về quyền/policy/assignment. NORMAL repairContext không thay FastTrack bootstrap; correction cần current review/intake lineage. Không runtime mock/adapter giả lấp BE gap.
- Không log token/password/OTP/signed URL/PII; không lưu private key plaintext trong SQLite/AsyncStorage. SecureStore tự nó không chứng minh EC signer/hardware-backed key.

## 4. Git, tool, fixture và artifact

- Trước edit và push: kiểm HEAD/branch, fetch `origin/main`, tracked/untracked và WIP. Gặp tracked WIP agent khác thì dừng báo, không overwrite. Giữ branch hiện tại (`main` cho task Offline này); không tự switch/reset/clean/stash, tạo clone/worktree/backup/source copy.
- Stage đường dẫn cụ thể. Commit local từng checkpoint đạt gate; push chỉ khi owner cho phép, kiểm remote không tiến lên, không force-push. Không commit APK, `.cache`, build output, `.cxx`, log QA tạm.
- BE Candidate3 chỉ đọc; đối chiếu remote develop, pin SHA, dùng `git show`/`git grep` ở repo có sẵn, không chép source BE hàng loạt. HTTP mutation chỉ trên fixture riêng được ủy quyền; không dùng assignment/demo chung, SQL hay Docker mutation nếu chưa có owner cho phép cụ thể.
- Không xóa file/artifact/DB/journal/media/pending upload/dữ liệu người dùng nếu chưa được duyệt đường dẫn cụ thể. Bảo toàn untracked và WIP. Chỉ liệt kê artifact hết tác dụng để owner xét duyệt.
- Trước native build: kiểm dung lượng, API host, thiết bị, native config, đường dẫn build; gom thay đổi liên quan, tái dùng cache/output. Ưu tiên giữ APK nghiệm thu mới nhất + một rollback đã xác minh; không nhân APK theo sửa nhỏ hay tạo evidence trùng.

## 5. Hoàn thành checkpoint

**Backend-first bắt buộc — owner 26/11/2026:** trước triển khai/sửa chức năng phải đọc source FE, source BE tại SHA đã pin, nghiệp vụ và API contract liên quan. Tận dụng API/workflow/permission, fixture/tài khoản QA hợp lệ, module/helper/component và Docker/emulator/tool được cấp; chi tiết thực thi tại `skills/roadguard/SKILL.md` mục 1. Không báo BE thiếu khi chưa chứng minh capability thực sự thiếu và không có phương án hợp lệ trong hệ thống hiện hành; báo cáo phải có source:line, API và chính xác phần cần bổ sung. Không tự sửa BE, bịa API, bypass bảo mật hoặc giả thành công.

Tìm root cause, sửa trong scope, kiểm lại rồi tiếp tục; không chỉ đổi text che lỗi, không để TODO cho UI lỗi trong scope implement đã giao. Không hỏi lại approval hoặc thay đổi nhỏ đã được ủy quyền. Chỉ dừng bước phụ thuộc khi thiếu contract/authority/policy/quyền tool; không dùng một blocker dừng cả task. Tự review/sửa tối đa 5 vòng trong scope; vẫn chưa đạt thì báo evidence và gate còn thiếu.

Gate theo `skills/code-review/SKILL.md`: typecheck, targeted và full regression tại checkpoint runtime, routes/permissions/preconditions, replay/isolation/recovery, receipt/readback, privacy/secret scan, diff check; UI phải có Android thực và screenshot trước/sau. Task Markdown thuần kiểm cấu trúc/link/invariants/diff, không chạy runtime regression/build chỉ để báo cáo. Không tự đánh dấu DONE khi còn mandatory gate thiếu.

Thực hiện **Implement → Verify → Review → Commit**, rồi chủ động tiếp tục checkpoint kế tiếp đã được owner giao; không chờ nhắc lại, không tự mở rộng scope. Nếu một phần thật sự bị chặn, bảo toàn dữ liệu và hoàn thành mọi phần độc lập còn khả thi.

## 6. Skill routing (đọc theo nhu cầu)

| Task | Nguồn cần đọc |
|---|---|
| API/logic/nghiệp vụ | AGENTS + `skills/roadguard/SKILL.md` + contract/source đúng operation |
| Sửa hoặc kiểm thử/review UI | AGENTS + phần liên quan `skills/DESIGN.md` + `.agents/skills/mobile-design/SKILL.md`; thêm roadguard nếu chạm nghiệp vụ |
| Performance/list/animation/render/native/RN patterns | AGENTS + `.agents/skills/vercel-react-native-skills/SKILL.md` và rule đúng vấn đề; không mặc định đọc compiled AGENTS/all rules |
| Review/commit gate | AGENTS + `skills/code-review/SKILL.md` + diff/source đúng scope |
| Redesign | `.agents/skills/redesign-existing-projects/` chỉ khi owner gọi rõ; mặc định read-only audit |
| Build | Build instructions và evidence đúng môi trường; không chạy build nếu task cấm |

Expo plugin dùng theo nhu cầu (UI: `building-native-ui`, motion: `references/animations.md`); không giả định tên skill chưa cài, không copy plugin vào repo hay sửa global skill/IDE. External skill không đè owner/canonical/BE/design tokens. `vibe-guard` chỉ historical reference, đã tích hợp vào roadguard, không kích hoạt đồng thời. `skills/BOOTSTRAP_PROMPT.md` là historical scaffold, không mandatory reading. Giữ specs/worklogs/references; chỉ đọc đúng role/operation/checkpoint.
