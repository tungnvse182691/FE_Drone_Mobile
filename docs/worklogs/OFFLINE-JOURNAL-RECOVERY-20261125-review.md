# Signed journal recovery inventory — 2026-11-25

Mode: Codex IMPLEMENT_AND_SELF_REVIEW; not independent review.
Source baseline: 745e0c92097fa2a86599e8833e1650ac810ccb1e, main.

## Change and boundaries

The failed-session local inventory omitted C10BC_IMMUTABLE_COMMAND_V1 even
though the signed journal is durable in local_draft. Share its existing strict
decoder and include only records matching actor, environment, session scope,
role, partition and physical row key. Render a sanitized journal summary.
Do not expose request body, proof, key, receipt or local phase; do not replay,
adopt, alter or delete a command. T05A records lack environment provenance and
remain preserved and excluded. No authentication or mutation authority added.

## Executed verification

- New SQLite test failed first (0 !== 1), then passed after implementation.
- node --test tests/local-draft-read.test.cjs tests/c10bc-journal.test.cjs:
  15/15 PASS. Ownership/malformed rows/secret exclusion/read-only invariants.
- npx tsc --noEmit: exit 0; recovery-inventory-tsc.log.
- node --test --test-concurrency=1 <all tests/*.test.cjs>: 2106/2106 PASS,
  0 failed/skipped/cancelled; recovery-inventory-full.log.
- Embedded Android release: BUILD SUCCESSFUL, recovery-inventory-build.log.
  APK SHA256 97AA401BABEB59F61CC72ED9FBC89C980A1CA8F75C11BB1E3EAED4734C027BEA.
- Installed with adb install -r. Actual emulator-5554 / Pixel_6_Pro:
  Crew Home restored; disabled Wi-Fi/data, app-only cold restart, opened local
  inventory. Dedicated task 064aa120-8d11-4765-897f-44f30cd089bf still showed
  0 photos / 1 measurement / local-not-sent. Restored radios and API/MinIO
  reverse mappings. Screenshot crew-recovery-new-build-offline.png.
- git diff --check: PASS. Reviewed changed source: no credentials, external
  logging, authority unlock, business API or route changes.

Logs/screenshots above are under .cache/offline-session-20261124/ (untracked).
Android verifies preserved field-draft inventory and boot with the new module
dependency; no native C10BC journal exists in this app to verify its rendering.
That family has LOGIC_TESTED SQLite evidence, not Android signed-send acceptance.
No emulator restart, database deletion, data reset or push performed.
