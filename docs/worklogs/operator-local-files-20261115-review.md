# Operator cold offline files — 2026-11-15

Codex, IMPLEMENT_AND_SELF_REVIEW. Base FE 099043f; BE pinned 85879fe. Scope: select existing/private source files and edit an offline draft. No upload dispatch, backend edits or new dependencies.

## Change and self-review

- Added a local file runtime authorized by the secure local account/environment scope. Existing private files remain partitioned by actor/environment/task; account changes invalidate reads and late picker results.
- New source preservation requires the exact cached API-226 assignment for provenance, validates task/operator/project/version, copies to a private partial file, checks size, renames and hashes before selection. Cache is never mutation authority.
- Added retained-file selection and MP4/SRT picking to the local draft screen. No upload/session/dataset is created. Original files, journals and SQLite are retained.
- Native test found that the picker cache URI reported size 78 but was not accessible (`File.exists` false). Using the granted source URI, matching the existing online picker, fixed this fixture without weakening file checks. No claim that all Android document providers behave identically.
- No debug logs, credentials, signed URLs or upload identifiers added to production output. Reviewed diff and session checks.

## Executed evidence

- `npm run typecheck`: exit 0.
- `node --test tests/operator-local-files-ui.test.cjs tests/package6-drone-files.test.cjs tests/operator-local-detail.test.cjs`: 18/18 pass.
- `node --test tests/*.test.cjs`: 1695/1695 pass, log `.cache/operator-local-files-full-final.log`.
- `git diff --check`: clean.
- ANDROID_E2E_VERIFIED: Pixel_6_Pro, Android 14, Expo Go/Metro 8094. Removed only API ADB reverse 18181, preserving Metro connection. Opened cached private QA task 9cb55c3f…, reused retained 49.1 MiB video, picked the existing 78-byte synthetic SRT, saved draft, force-stopped Expo Go and reopened from its URL UI. Opened the same cached task: recordedAt `2026-11-15 08:30`, video and SRT references and both retained files were present. Screenshot `.cache/operator-offline-reopened.png`. This fixture SRT has no GPS; no coverage claim.
- Logic tests cover no-network local preservation, missing assignment denial, late account change and single-flight save. Android account switch/races remain separate acceptance.

## Limits

Cold map is NOT_DONE: local recovery currently exposes the cached access coordinate and work summary, while MapLibre GL JS and raster tiles require remote resources. Geometry cache alone does not prove an offline basemap. Global Sync dispatch remains NOT_DONE; recovery rows open explicit guarded workflows. No native result is inferred from Node tests. No push.
