# Session restore transport diagnosis

Codex — IMPLEMENT_AND_SELF_REVIEW, main based on dfa18eb, 2026-11-25.

## Cause and executed evidence

The installed embedded-JavaScript Android QA app logged `AUTH_RESTORE_FAILED network`.
The live `adb -s emulator-5554 reverse --list` inventory was empty. Host API health
was HTTP200, which did not establish emulator connectivity. Restoring only
tcp:18181 and tcp:19101 and tapping the existing Retry restored the same Crew
session/Home without another login. A subsequent force-stop/start of only the app
also restored Home automatically. Emulator, credentials and app data were retained.

## Change

Auth restore logs an allowlisted category/status only. Raw messages, request and
response bodies, config, credentials and tokens are never logged. QA instructions
now require checking the current reverse inventory after ADB reconnects.

## Verification

- `node --test --test-concurrency=2 tests/*.test.cjs`: 2104/2104 PASS,
  `.cache/offline-session-20261124/resume-full-serial2.log`.
- Auth/storage targeted: 21/21 PASS, `resume-targeted.log` in the same directory.
- `npx tsc --noEmit`: exit0, `resume-tsc-final.log`.
- `git diff --check`: exit0.
- Android real retry and fresh app process: same Crew Home observed. This is
  session/connectivity evidence, not signed offline sending or three-role E2E.

No auth bypass, data clearing, emulator restart, BE source change or push.
