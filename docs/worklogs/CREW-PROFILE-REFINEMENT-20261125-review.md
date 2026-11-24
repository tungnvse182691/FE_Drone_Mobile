# Crew Profile refinement — 2026-11-25

Reviewer: Codex, IMPLEMENT_AND_SELF_REVIEW. Baseline `6991ed0`, main.

## Scope

- `app/(crew)/profile.tsx`: compact account card, grouped contact metadata,
  one loaded-subset caption, token colors, compact wrapping stats, setting icons.
- Profile presentation assertions in two existing regression files.
- No count formula, network callback, route, logout or queue behavior changed.

## Executed evidence

- `node --test tests/dot-b-sync-profile.test.cjs tests/crew-home-motion.test.cjs tests/crew-tasks-v2.test.cjs`: 19/19.
- `npx tsc --noEmit`: exit 0, `profile-refine-tsc.log`.
- `node --test tests/*.test.cjs`: 2106/2106, `profile-refine-full-r2.log`.
  Initial run: 2105/2106; remaining failure checked the old capitalized caption.
  Updated that presentation assertion; the loaded-subset limitation remains.
- `git diff --check`: passed before checkpoint.
- Embedded Android release build succeeded; APK SHA256
  `F0C256D309EC7AE7B9A566A342B9EB88F31DFFADBC06E0D3541EA9329318CE2B`.
- Installed with `adb install -r`, preserving app data. On Pixel_6_Pro:
  profile refresh retained 4 completed / 46 incomplete / 50 loaded, matching Home.
- Before: `D:/Screenshots/Screenshot_1795545585.png`.
- Actual native screenshots in `.cache/offline-session-20261124/`:
  `profile-refine-after.png`, `profile-refine-font130.png`.
  Inspected normal and 130% text: labels wrap and settings scroll; no clipping.
  System font scale restored to 1.0. Narrow viewport NOT_RUN.

## Separate stability finding

Android configuration recreation exposed an existing global Expo Router bridge
failure on bottom-tab press: `The imperative router is unavailable before the
first render has finished`. Reproduced twice (01:51 and 01:55 Android logcat).
App-only cold reopen recovers the same authenticated Crew session. Fix is a
separate navigation checkpoint; UI evidence above does not certify that fix or
completion of the six offline workstreams. Emulator was never restarted/reset.

No push, backend mutation, data removal, dependency or native configuration edit.
