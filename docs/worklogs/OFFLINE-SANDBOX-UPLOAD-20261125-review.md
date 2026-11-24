# Sandbox storage transport and Reporter offline recovery

Codex — IMPLEMENT_AND_SELF_REVIEW, 2026-11-25. Baseline `2871fc5`, main.
Scope: QA build overlay, read-only instrumentation and documentation only.

## Root cause and change

The QA Android policy allowed loopback HTTP, but the existing Docker API signs
storage URLs for `192.168.1.211:19101`. Instrumentation measured loopback=true,
sandbox storage=false, public HTTP=false before this change. An explicit
`-Droadguard.native.storageQaHost=192.168.1.211` now generates one exact-domain
exception, only with the existing `loopbackQa=true` opt-in. Input is restricted
to one private IPv4 literal. Default release configuration remains unchanged.
No signed URL rewriting, BE/config changes or application UI/runtime changes.

After install-r, instrumentation measured loopback=true, sandbox storage=true,
public HTTP=false. Build succeeded with the invocation documented in the probe
README, x86_64, existing short CMake staging and QA optimization flags.
APK SHA256: `2EC6E09F31169B00A4A81006BA210462BF999AB30A48C65531963868513C3A82`.

## Android and HTTP evidence

Dedicated synthetic Reporter-b scenario, not shared business data:

1. Wi-Fi/mobile data off and API reverse mapping removed; camera captured a
   synthetic emulator photo. Submit preserved the draft and command on failure.
2. App-only force-stop/reopen retained draft `874bdbd1-e63a-46b7-b1a7-da1ed6c7b429`,
   its exact description and photo. Restored network/session and explicitly
   resumed the same draft. No emulator restart or data reset.
3. With corrected QA policy, the pending image uploaded, passed verification,
   and the app navigated to the submitted report detail.
4. Own-report HTTP list/detail readback returned 200, exactly one matching report:
   `762778aa-76d5-4c5e-9445-097644932ecf`, one evidence file
   `ff0ed45a-efcc-4564-8ec0-666928407db6`, version `AAAAAAAE76A=`, CAPTURE location.
5. Another app-only cold restart retained the Reporter session, showed the report
   on Home and opened its detail. Repeated HTTP readback still found exactly one.

Labels: ANDROID_E2E_VERIFIED for this explicit Reporter draft recovery/send;
HTTP_VERIFIED for own list/detail readback. This does not prove automatic replay,
termination during every upload stage, or exactly-once behavior for all roles.
Emulator GPS is synthetic, not real field location evidence.

Operator-b: radio-off/API-reverse-removed app restart retained task `0cc54aca`
and the recording date `2026-11-25 02:25`; network restore/session retry reopened
the same upload form. No video submission: upload/exactly-once remains NOT_RUN.

## Preservation and checks

Read-only instrumentation before/after install showed identical DB hashes:
original 143360 bytes, SHA256
`c3f7ade280db3802a5717c7648076464efbc52351b5e627918564f9a51a64fed`;
encrypted 172032 bytes, SHA256
`31a3912d78b9fe8e5cbbf38febdb56a76432c51dd8383aa776d1bb6d76196612`.
These measurements bracket installation, not the later legitimate report save.
The plaintext original is retained; full at-rest coverage is not accepted.

- `npx tsc --noEmit`: exit 0, empty diagnostic log.
- `node --test --test-concurrency=2 tests/*.test.cjs`: 2111/2111 PASS.
- `git diff --check`: PASS.
- `git fetch origin`: origin/main unchanged at `71aeb0ab45fbc71bf75121e6c221acac108b4ad5`.
- Self-review: scoped QA policy, no bearer header added to storage, no secrets in
  changed files, no reset/stash/cleanup, no push or emulator restart.

Evidence under `.cache/offline-session-20261124/`: `network-policy-before.txt`,
`network-policy-after.txt`, `network-qa-build.log`, `network-qa-tsc.log`,
`network-qa-regression.log`, `reporter-http-readback.json`,
`reporter-offline-captured.png`, `reporter-offline-restarted.png`,
`reporter-online-success.png`, `reporter-online-restarted.png`,
`operator-offline-restarted.png`, `operator-online-restored.png`.

Remaining six-workstream gates include runtime media encryption/migration,
native hardware acceptance, authenticated 42A peer-key discovery, actual Crew
signed send and remaining role interruption cases. This checkpoint does not
unlock production capabilities or claim those gates passed.
