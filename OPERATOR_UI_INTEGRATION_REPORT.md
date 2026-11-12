# Operator UI integration — 2026-11-12

## Kết luận

**BLOCKED tại verification gate trước commit/merge/push.** Bản tích hợp chọn lọc đã sẵn để đọc diff và review mã; TypeScript, targeted và full regression đạt. Expo Doctor FAIL 1/20 checks do dependency patch mismatch có sẵn trong manifest/lockfile baseline. **ANDROID_E2E_NOT_VERIFIED**. Không nâng dependencies hoặc thay native config trong scope này.

Không commit, merge, cherry-pick, push, reset hay clean. Không sửa Docker/BE/database hiện có. Mọi thay đổi nằm trong worktree mới. Không dùng Metro hay Android build của checkout cũ làm bằng chứng.

## 1. Git safety và baseline

| Mục | Giá trị đã xác minh |
|---|---|
| Checkout gốc | `D:\Do_AN_Drone\FE_AppMobile` |
| Worktree mới | `C:\Users\ACER\.codex\worktrees\operator-ui-integration\FE_AppMobile` |
| Integration branch | `integration/operator-ui-20261112` |
| Integration HEAD, chưa commit | `da04a710508ad3c4235dd507b404234780971d26` |
| Branch gốc | `codex/operator-scoped-fixes-150228b`, vẫn `da04a71` |
| Local main | vẫn `c5afa0b2f3cdbbf3dcc58addd1b0fd05786f20da` |
| GitHub main, live `ls-remote` | vẫn `ff0f694606e26d20bf84cf4b232e2349dc76ecd5` |
| origin/main | khớp GitHub main; không cần fetch thay ref |
| Merge-base local main/Codex | `150228b8e5c8d4eeb5de5a950d5a1ec2922f2d74` |
| origin/main...Codex | 0 remote-only / 6 Codex-only |
| local main...Codex | 2 main-only / 44 Codex-only |

Worktree được tạo bằng công cụ quản lý worktree của Codex, sau đó tạo branch đúng từ SHA baseline trong checkout mới. Đường dẫn D: trong yêu cầu là ví dụ; worktree thực tế ở đường dẫn quản lý bên trên. Không checkout branch trong thư mục gốc. Remote đúng `https://github.com/tungnvse182691/FE_Drone_Mobile.git`.

Tracked status checkout gốc sạch trước/sau; 12 mục untracked gốc vẫn hiện diện: `.cache/`, `full-regression-07c.log`, `full-regression-final.log`, `full-regression-g02b-final.log`, `full-regression-image-evidence-final.log`, `full-regression-image-evidence.log`, `full-regression.log`, `modules/roadguard-offline-crypto/android/build/`, `mydatabase.db`, `op-fe08-full.log`, `op-fe08-targeted.log`, `targeted-recovery-final.log`. Không thao tác lên các mục này. Đây là kiểm tra status/presence, không phải chứng nhận hash đệ quy của artifacts đang có thể được process khác sử dụng.

Trong worktree mới, `npm ci --no-audit --no-fund` tạo dependencies riêng; tests tạo `.cache/` và các fixture/build test riêng. Logs nằm ở `.integration-evidence/`. Manifest/lockfile không thay đổi. Không dùng database hay native build của checkout gốc.

## 2. Danh sách thay đổi thực tế

| File | UI mang sang | Logic được bảo toàn |
|---|---|---|
| `src/components/drone/OperatorTaskRow.tsx` | Nhãn `NHIỆM VỤ HIỆN TẠI` cho Accepted/InProgress và dạng UPPER_SNAKE tương ứng, lấy ý tưởng từ c5afa0b | Row mới, rail/dot/icon/status, code ngắn, scope thật, callback task hiện hành; không suy quyền hành động từ nhãn |
| `app/(drone)/profile.tsx` | Avatar 48px + thông tin nằm ngang, header gọn; logout/modal footer tối thiểu 48px; gộp lời nhắc bảo toàn dữ liệu vào link hàng đợi | User/employee code thật; đổi mật khẩu, mở Sync, logout và modal giữ nguyên; không xóa dữ liệu pending |
| `app/(drone)/sync.tsx` | Hash và nhãn queue tăng 10 → 12px | Toàn bộ component/render/callback trước StyleSheet byte-identical baseline, gồm phân vùng identity, đọc SQLite, ACK cục bộ ≠ receipt và chặn purge |
| `src/components/drone/DroneTaskCommandPanel.tsx` | Chỉ đưa nút đọc lại recovery list lên hàng tiêu đề có wrap; dùng text button 48px | Toàn bộ DroneTaskCommandPanel byte-identical; load/list guard, busy lock, actor/session/env và route task giữ nguyên |
| `tests/operator-ui-integration.test.cjs` (mới) | Test phân biệt trạng thái active/terminal/unknown và callback | Không sửa assertion/harness/test cũ; test mới FAIL trước sửa rồi PASS sau sửa |
| `OPERATOR_UI_INTEGRATION_REPORT.md`, `.integration-evidence/` | Báo cáo và bằng chứng | Chưa stage/commit |

Nhãn “hiện tại” là mô tả status cho từng task: có thể nhiều task Accepted/InProgress cùng hiển thị. Không khẳng định chỉ có một task đang hoạt động và không thêm mutation authority.

## 3. Conflict matrix và quyết định cho toàn bộ 22 file của hai UI commits

Mô phỏng đọc-only: `git merge-tree 150228b da04a71 c5afa0b`. Không apply output, không ghi tree object/index. Kết quả **13 file có content conflict markers**. `changed in both` không tự có nghĩa là content conflict. Cột Conflict dưới đây là mô phỏng full merge; cột Quyết định là cách tích hợp thực tế.

| File | Conflict | Quyết định | Xử lý/rủi ro/test |
|---|---|---|---|
| `app/(drone)/_layout.tsx` | Không | SUPERSEDED | Giữ tab routes/prefix hiện hành; bỏ prop appearance cũ. Route/navigation regression |
| `app/(drone)/home.tsx` | Có | SUPERSEDED + marker qua shared row | Giữ compact header, KPI tải/đang làm/đã nộp, stale/error/skeleton và scope async; không khôi phục list inline cũ. UI05, wave1, row test mới |
| `app/(drone)/requests.tsx` | Có | SUPERSEDED + marker qua shared row | Giữ pagination/filter/count loaded rows, task ID và read scope; không áp nhãn cho mọi task chỉ vì đang ở tab ongoing. UI05, wave1 |
| `app/(drone)/request-detail.tsx` | Có | SUPERSEDED | Giữ hero/status/technical accordion mới, API thật, actor/task/version/ETag guard, access point hợp lệ và command panel cả khi GET lỗi/offline. UI06, package45, selection/recovery |
| `app/(drone)/work-package.tsx` | Có | SUPERSEDED | Giữ UI06, API-225/104, pinned geometry/source validation, segment filter, kỹ thuật và trạng thái thiếu bằng chứng. Không quay về layout cũ làm mất metadata. UI06, ui02c, wave1 |
| `app/(drone)/log.tsx` | Có | SUPERSEDED + marker qua shared row | Giữ recovery ở đầu, scope environment/session, authorized readbacks và full-ID reveal; bỏ việc đẩy recovery xuống dưới tasks. h01c, package6, wave1 |
| `app/(drone)/sync.tsx` | Có | CONFLICT — selective resolved | Chỉ tăng font. Bỏ summary/refresh rewrite và nhãn queue cũ vì cần giữ nghĩa local ACK/receipt hiện hành. ui02b, Android01 hook tests, recovery |
| `app/(drone)/profile.tsx` | Có | CONFLICT — selective resolved | Header ngang, target 48px, gộp retention copy; bỏ màu đỏ hardcode cũ. Không tạo stats/device giả. Full regression; Android long text/modal còn thiếu |
| `app/(auth)/force-change-password.tsx` | Có | ALREADY_IMPLEMENTED | Đã có SafeArea header, ScrollView/flexGrow, Android KeyboardAvoiding height, nút back 48px; giữ password identity/replay/forced/session logic mới. Full auth/password tests; keyboard native chưa chạy |
| `src/components/BottomNav.tsx` | Không | NEEDS_MANUAL_REVIEW — giữ HEAD | Bỏ appearance/operator active dark override; HEAD dùng gold active token và route matching mới. Không đổi Crew/Reporter. Review màu native sau |
| `src/components/Button.tsx` | Có | ALREADY_IMPLEMENTED / SUPERSEDED | Primary đã dùng gold/dark tokens; giữ spinner + loading title, disabled/accessibility và min48; bỏ appearance prop trùng. Full UI/button regressions |
| `src/components/SafeAreaScreen.tsx` | Không | NEEDS_MANUAL_REVIEW — giữ HEAD | Không thêm padding24 vào các màn. Default96 và Detail marginBottom -72 hiện hữu cần native layout proof trước thay; chưa chứng minh scroll cuối màn |
| `src/components/drone/DroneTaskCommandPanel.tsx` | Có | CONFLICT — selective resolved | Chỉ header/button của RecoveryList; dispatcher và panel lỗi/offline không đổi. package45, journal, dataset replay, recovery |
| `src/components/drone/OperatorUI.tsx` | Không | SUPERSEDED | Không tạo mới component trùng AppHeader/OperatorTaskRow/status đang có; không cần harness cũ để render component này |
| `tests/drone-android01-ui.test.cjs` | Có | SUPERSEDED | Giữ assertions cho cấu trúc hiện hành. Tên Android trong Node suite không phải Android E2E |
| `tests/drone-ui02b.test.cjs` | Có | SUPERSEDED | Không port selectors của layout cũ; giữ kiểm tra kỹ thuật/điều hướng/Sync hiện hành |
| `tests/drone-ui02c.test.cjs` | Không | SUPERSEDED | Giữ back target/hình học thực và assertions hiện hành |
| `tests/h01c.test.cjs` | Không | SUPERSEDED | Không thêm mock OperatorUI không tồn tại; giữ readback/session tests |
| `tests/helpers/roadfe-screen.cjs` | Không | SUPERSEDED | Không chép bộ expand OperatorUI vào harness; không đổi shared harness |
| `tests/operator-ui04.test.cjs` | Không | SUPERSEDED | Không mang test cho component cũ không được mang sang; coverage hiện hành UI05/UI06 và test marker mới |
| `tests/package6-drone-recovery-ui.test.cjs` | Có | SUPERSEDED | Giữ nguyên assertions preservation/session/copy/SQLite read failure |
| `tests/wave1-drone.test.cjs` | Không | SUPERSEDED | Giữ access point/source/scope/pagination assertions hiện hành |

## 4. Chứng minh bảo toàn 6 commit chức năng

`verify-invariants.cjs` kiểm tra từng commit là ancestor của HEAD, allowlist chỉ 4 source files, và các function/handler trọng yếu không thay đổi. Không chỉ dựa vào việc commit có mặt trong lịch sử.

| Commit | Chức năng | Bằng chứng bảo toàn |
|---|---|---|
| e80156a | Crew camera supplement return | Camera/Crew route và nguồn nghiệp vụ không diff; full regression |
| da6aade | Reporter durable upload cancellation/recovery | Reporter/store/API/offline không diff; full regression |
| d578313 | Crew durable upload cancellation/recovery | Crew journal/offline/queue không diff; full regression |
| ed3199b | Drone eligible selection/upload cancellation contracts | Upload/API/contracts/journals không diff; targeted + full |
| 6f1abd7 | Eligible drone selector guard | Selection logic/hooks không diff; package6 selection tests |
| da04a71 | Persist eligible selection, Crew offline panel | Baseline trực tiếp; persistence/offline source không diff; session/recovery regression |

Đối chiếu UI commits: 3cbfa6d được đọc từng file, chỉ lấy phần Profile/Sync/recovery còn phù hợp; các rewrite màn/component/harness cũ được thay thế bởi implementation mới hơn. c5afa0b: password layout đã có; current-task indicator được bổ sung vào shared row; border/status/code ngắn hiện có được giữ. Hai commit UI không được thêm nguyên khối vào lịch sử; kết quả chọn lọc còn uncommitted.

`src/api`, `src/hooks`, `src/offline`, `src/store`, upload screens, package/config và toàn bộ tests đã có đều không diff so với da04a71. Panel đầy đủ byte-identical; chỉ RecoveryList JSX thay đổi. Vì vậy identity, Idempotency-Key, If-Match, immutable payload/version, journal-before-POST, readback và pending/UNKNOWN_OUTCOME không bị refactor UI ghi đè. Đây là bằng chứng source + LOGIC_TESTED, chưa là HTTP/NATIVE proof mới.

## 5. Verification đã chạy trong worktree tích hợp

Node v22.15.1, Windows PowerShell. Baseline và integration chạy trên cùng checkout mới; không dùng output checkout gốc.

| Gate | Kết quả | Evidence |
|---|---|---|
| Baseline TypeScript | PASS, exit0 | `.integration-evidence/baseline-typecheck.log` (rỗng vì không có diagnostic) |
| Baseline full, 98 files | PASS 1359/1359, 0 skipped | `.integration-evidence/baseline-full.log` |
| Marker test trước implement | FAIL Accepted, expected1/actual0 | Executed trong phiên; sau implement PASS, không thay assertion |
| Integration TypeScript | PASS, exit0 | `.integration-evidence/integrated-typecheck.log` |
| Targeted Operator/UI/recovery/session/password, 20 files | PASS 291/291, 0 skipped | `.integration-evidence/integrated-targeted.log` |
| Integration full, 99 files | PASS 1360/1360, 0 skipped | `.integration-evidence/integrated-full.log` |
| Expo Doctor | **FAIL** 19/20 checks passed; exit1 | `.integration-evidence/expo-doctor.log` |
| git diff --check | PASS | `.integration-evidence/invariants.log` |
| Conflict marker scan app/src/tests | PASS, 0 hits | `.integration-evidence/conflict-scan.log` |
| Ancestors/allowlist/handler preservation | PASS | `.integration-evidence/invariants.log` + executable verifier |
| GitHub main/nhánh gốc/status | PASS tại 00:48 +07 ngày 12/11 | `.integration-evidence/git-final.log` |
| Android/native layout/E2E | **NOT_RUN — ANDROID_E2E_NOT_VERIFIED** | adb thấy emulator-5554; không tạo/cài/chạy build của integration |
| Real HTTP mutation/readback | NOT_RUN | Không tạo fixture, không thực hiện API writes; không có HTTP_VERIFIED mới |

Exact test invocation: `node --test --test-reporter=tap` với danh sách tuyệt đối của `Get-ChildItem tests -Filter '*.test.cjs' -File | Sort-Object Name`. Targeted dùng cùng lệnh với filter filename `operator|drone|recovery|session|password|scope`; full dùng tất cả. Typecheck: `npx --no-install tsc --noEmit`. Doctor: `npx --yes expo-doctor`. Invariants: `node .integration-evidence/verify-invariants.cjs`. Scan: `rg -n '^(<<<<<<< |=======\s*$|>>>>>>> )' app src tests`.

Targeted/full thực sự bao gồm: actor/session/environment đổi giữa await, ABA bounce/logout-relogin, journal SQLite close/reopen, pending immutable replay, old-session deny, readback không tự supersede PREPARED/UNKNOWN/RECEIPT, command recovery vẫn truy cập khi detail GET forbidden, scope geometry mismatch, upload cancellation và persisted selection. Tên test và kết quả đầy đủ trong TAP logs. Node hook harness và fixture tests được gắn **LOGIC_TESTED**, không thay cho Android/HTTP thực.

Doctor báo 13 package patch mismatch: expo 58.0.23→~58.0.24; constants .15→.16; crypto .7→.8; document-picker .4→.5; font .11→.12; linking .16→.17; location .20→.21; media-library .13→.14; router .30→.31; secure-store .2→.3; splash-screen .13→.14; sqlite .15→.16; status-bar .4→.5 (các suffix thuộc 58.0.x). Manifest/lockfile không diff, vì vậy không phải dependency delta của UI integration. Không tự nâng package hoặc bỏ check để ép PASS.

## 6. Mock imports

`rg -n 'mock/' app src --glob '*.ts' --glob '*.tsx'`: `src/store/reporter.ts` import type; `src/api/crewApi.ts` import type; `src/api/reporterApi.ts` import type và export type. Các reference này bị TypeScript erase, không phải runtime mock caller. Không tìm thấy runtime import bằng scan literal này; không tuyên bố scan bao phủ mọi dynamic/computed import. Không xóa `src/api/mock/` hay types.

## 7. UI còn khác thiết kế cũ và rủi ro

- Header/card/KPI của UI05/UI06 được giữ, không phục hồi OperatorUI cũ. Bảo toàn API errors, skeleton/stale/pagination và technical disclosure.
- Log giữ recovery trước tasks; giảm nguy cơ lệnh pending bị khuất.
- Sync vẫn giữ summary và nút refresh có chữ, không chuyển sang icon-only. Copy phân biệt local ACK và receipt được giữ nguyên.
- BottomNav vẫn gold active; chưa đưa appearance prop toàn cục vào shared component.
- Không đổi SafeArea padding và margin âm Detail khi chưa kiểm native; vùng cuối màn, bàn phím, font scale và màn hẹp còn cần Android proof.
- Profile mới cần kiểm wrap họ tên dài, mã nhân viên, modal, font lớn. Refresh recovery chuyển lên đầu cần kiểm wrap và focus/touch trên Android. Nhãn trạng thái thêm chiều cao row.
- Doctor là gate chưa đạt. Nâng SDK patch cần scope/approval riêng và native regression phù hợp, không thực hiện trong task UI này.

## 8. Android/regression checkpoint tiếp theo

1. Reviewer xem 4 source diffs + test mới; quyết định dependency patch remediation riêng, không sửa checkout gốc.
2. Build và ghi nhận SHA + uncommitted diff hash của chính integration worktree; khởi động Metro từ đúng worktree/port. Không dùng app đã chạy checkout cũ làm proof.
3. Dùng tài khoản/fixture được phép: Home/Requests pagination/filter/status/navigation; Detail/WP scope, access point, read-only technical accordion; panel vẫn mở khi offline/GET403/GET lỗi.
4. Kiểm PREPARED và UNKNOWN_OUTCOME qua restart/offline, không auto resend; explicit exact replay giữ body/key/version/headers; task readback không tự clear pending. Mutation chỉ với fixture được owner ủy quyền.
5. Đổi actor/session/environment, logout-relogin, late response/copy; xác minh pending còn nguyên và không lộ sang tài khoản khác. Sync read failure/reopen và local ACK chưa thành receipt.
6. Log readback đúng task/owner/file; Profile logout/đổi mật khẩu; forced/optional password với bàn phím, back/safe area; font scale và 48px targets. Không xóa database/log/cache để làm test sạch.
7. Sau thay đổi sửa gate, chạy lại kiểm tra liên quan và full regression theo phạm vi thực; báo ANDROID_E2E_VERIFIED chỉ khi đã có executed evidence đúng build và scope.

## 9. Rollback và điểm dừng

Chưa có commit nên không có thay đổi nào cần rollback trên main/branch gốc. Giữ nguyên worktree integration để điều tra/review; vẫn có baseline da04a71 và hai UI commits trên local main. Không reset/clean hay xóa artifacts. Nếu hủy phương án, lưu diff, test mới và evidence trước khi dùng quy trình archive worktree được owner cho phép; không tự xóa trong task này.

**Đã dừng trước final commit, merge và push.** Chủ dự án/reviewer có thể review ngay; trạng thái toàn bộ gate vẫn **BLOCKED**, với Doctor FAIL và Android E2E chưa verified được nêu rõ.
