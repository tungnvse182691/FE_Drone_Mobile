# RoadFE FE-AUTO-01

Run from the repo with existing local dependencies (no install):

```powershell
node tests/automation/run.cjs
# Optional Candidate3 read smoke; login is the sole POST, no workflow writes:
node tests/automation/run.cjs --http-read
```

The runner executes all `tests/*.test.cjs` exactly once, `npm run typecheck`, and
`git diff --check`. It saves sanitized logs and a machine-readable manifest under
`.cache/fe-auto-*`. A nonzero test/typecheck/diff exit or skipped/cancelled test
fails the gate. The manifest identifies HEAD and explicitly labels a working-tree
run. It does not certify Android or full API acceptance.

## Actual behavior coverage

| Feature | Automation reused/added | Evidence boundary |
|---|---|---|
| Auth roles, OTP, password/recovery, immutable retry | T01/T02, client, hardening suites | LOGIC_TESTED, native/network replaced |
| Guest draft cannot be adopted by unrelated login/OTP | fix01-reporter, fix01-ui | Real store and TSX handlers, deterministic hook harness |
| Autosave, camera, readback after logout/account/environment/session switch or unmount | fix01-ui, existing isolation suite | LOGIC_TESTED; not a React renderer or Android camera |
| Unresolved/referenced ledger survives delete, timeout and restart | fix01-sqlite | Production SQL/helpers on isolated on-disk Node SQLite, closed/reopened connections; not Android process-death evidence |
| Crew/Drone/offline safety gates and reconciliation | Existing T04 onward, C10/H01/final suites | Existing logic coverage reused, no blocked mutation enabled |
| Reporter resource authorization/read | Optional existing final-reporter-http-smoke | Real HTTP list200 and negative401/404 only; no positive private-byte claim |

No Report5 expected results or PASS labels are treated as requirements/evidence.
Fixtures in Node are synthetic boundaries, never server success evidence.
Passwords/OTP in tests are synthetic; no test logs real credentials or private bytes.

## Android/native acceptance pending

Status is **NOT_RUN** for this task; no emulator, adb actions or native E2E are
started by the runner. Execute only after explicit device approval, a compatible
development APK, and private authorized Backend fixtures exist. Required scenarios:

1. Guest A types/captures, B logs in or verifies OTP: no A content visible/uploaded;
   original local data survives restart without automatic ownership assignment.
2. Owner draft recovers on the same environment/session; different actor/session
   stays isolated. Include login/AuthGuard mounted together and slow SQLite.
3. Native permission denied, GPS timeout, camera cancellation, background/unmount:
   no invented location or late cross-session image/UI write.
4. Kill app after complete POST/while VERIFYING: ledger IDs, ETags, checksum and
   version remain; reconcile using the same command before reporting success.
5. VERIFIED private evidence + report/supplement readback on private fixtures only.
6. Existing Crew/Drone/signed-sync blocked capabilities remain locked.

Positive upload/report/supplement HTTP is **BE_FIXTURE_BLOCKED** without a private
fixture. Keystore/native SQLite/process death/full navigation are **NOT_RUN** until
executed on an approved runtime. No passed Node test upgrades either status.
