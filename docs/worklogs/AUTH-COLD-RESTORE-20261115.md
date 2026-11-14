# Android session restoration — 2026-11-15

Reviewer: Codex. Mode: IMPLEMENT_AND_SELF_REVIEW.
FE baseline: `af8bd06`. BE source: `85879fe9082774cf5098a9ba281f56b9c651f8ea`.
Environment: local API sandbox 18181, MinIO 19101, emulator-5554 / Android 14 / Expo Go / Metro 8090.

## Cause and fix

Cold start previously recovered only the refresh secret, without obtaining an access token. Logging in again created another session, correctly preventing old session-bound commands from replaying.

- SecureStore now holds a versioned, environment/actor/session-bound refresh credential and a pending rotation key. Access tokens remain in memory.
- The rotation key is persisted before API-003. Timeout/restart retries retain the exact token and key. BE AuthService preserves SessionId and supports keyed rotation receipts.
- Serialized writes and generation checks prevent an old refresh from overwriting logout or a newer login. Storage failure prevents the refresh POST.
- Auth routing waits for restoration while Stack remains mounted. Connection failures show bounded retry/login controls using existing components.
- Legacy raw credentials require a fresh login. Historical pending commands remain preserved and are not rebound to that new session.
- No BE source, provider, package, native configuration, SQL data, or historical media/command changes.

## Executed gates

- `npm run typecheck`: exit 0.
- `node --test tests/*.test.cjs`: 1,654 passed, 0 failed/cancelled/skipped. Log `.cache/auth-recovery-final-20261115.log`.
- Focused secure-session, auth-store and HTTP interceptor checks: 43 passed, 0 failed. Log `.cache/auth-recovery-focused-20261115.log`.
- `git diff --check`: clean. App scan for Ionicons and prohibited financial UI strings: no matches.
- Self review covered production applyTokenPair callers, memory-only access token, immutable refresh retry, actor/environment/session separation and late responses.

## Observed Android checks

- A fresh Reporter login followed by process termination/reopen restored the authenticated home without another password login.
- Dedicated report description `QA_PROCESS_KILL_20261115_SECURE_RESTORE`: force-stop during the visible upload phase preserved the description, one 9,735,587-byte photo, queue item `e129bf80-07b1-4c65-ac1c-510c016ed552`, upload `5a5f521c-a360-44f7-8d7a-3a9355ec6074`, and file `a46056e4-6b0b-443d-9d89-b7c1c16ff26f`. Reopen restored the authenticated form; explicit send resumed the same upload.
- At 03:58 UTC+7 Android navigated to the submitted detail with one photo. GET upload and file returned HTTP 200 / VERIFIED; GET own reports returned exactly one matching QA description, with no next cursor. Bounded readback `.cache/reporter-secure-readback-20261115.json`. Read-only before/after SQLite snapshots confirmed unchanged upload partition and acknowledged parts 1/2. The resumed transfer was slow but made measurable progress; no extra create command was issued to bypass it.
- UI inspection on 1440×3120 Android covered restored form, active upload/verification states and submitted detail; screenshot showed bounded cards and CTA without overlapping text.

## Additional account-isolation evidence

- Reporter A logout → Reporter B login: no A history, uploads or photos visible. Deep-linking A's report displayed a generic load error without its content/actions. Returning to A restored its own history.
- B HTTP reads of A report/file/upload returned 404 (`not_found`, `file_not_found`, `upload_session_not_found`); B own list returned 200 with zero reports. Bounded output `.cache/reporter-other-account-20261115.json`.
- Operator task `c85bbf13-3b25-477f-8d3b-bfaf487fb466`: local capture timestamp `2026-11-15 08:30` survived force-stop/reopen/login. No dataset was submitted by this draft check.

## Limits

These observations do not certify hardware-backed storage, backup/uninstall behavior, native offline cryptography, every refresh failure mode, or the full three-role audit. Expo Go evidence is not a release build security certification. Emulator GPS is simulated and is not a Vietnam survey fixture.
