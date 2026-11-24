# Owned local draft inventory extension

Codex — IMPLEMENT_AND_SELF_REVIEW, based on 1050854, 2026-11-25.

Recovery inspection now includes owned Crew repair command and receiving-ACK
metadata in addition to field drafts. It checks actor/environment/session and
the exact persisted row key; unknown shapes and recovery overlays stay intact
and are not adopted. Receiving references are labelled as receiving requests.
No command, token, file URI, key or mutation authority is returned by this reader.
Local phases are not projected as durable server acknowledgments.

## Evidence

- TDD red: the new fixture initially returned zero instead of two summaries.
  `.cache/offline-session-20261124/legacy-reader-red.log`.
- `node --test tests/local-draft-read.test.cjs tests/local-draft-view.test.cjs tests/auth-cold-restore.test.cjs`:
  12/12 PASS, `legacy-reader-targeted.log` in the same directory.
- Real SQLite fixtures verify actor/environment/session isolation and unchanged
  complete source rows. Repair overlays and forged keys are excluded.
- Full regression: 2104/2104 PASS, `resume-full-serial2.log`.
- `npx tsc --noEmit`: exit0, `resume-tsc-final.log`; diff check exit0.

This is LOGIC_TESTED read-only inventory, not restoration of editing access,
replay acceptance, nonempty Android recovery or three-role E2E. Existing native
recovery screen evidence remains limited to the previous empty-state/UI checkpoint.
