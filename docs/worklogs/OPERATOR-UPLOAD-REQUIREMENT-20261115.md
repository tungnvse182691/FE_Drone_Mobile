# Operator upload: missing-input guidance and Android draft recovery

- Codex IMPLEMENT_AND_SELF_REVIEW; FE base 2320db3, main.
- BE origin/develop fetched: 85879fe9082774cf5098a9ba281f56b9c651f8ea.
- Scope: upload screen, existing UI regression, this evidence.
- Android14 Pixel 6 Pro, Expo Go, Metro8090, Operator A; sandbox API18181 healthy.

## Source and finding

Read Operator screen/API matrix and task/dataset error handling, upload caller,
SubmitDatasetRequestDto and SurveyV2Controller.SubmitDataset at pinned BE.
RecordedAt and video are required; the existing FE checks active device selection
and durable journal before starting. This change preserves those conditions,
headers, command bodies, replay and server validation.

ANDROID_E2E_VERIFIED: on the accepted isolated supplement task
4a230453-2292-44fd-9f53-6e18b57c8a89, selected real eligible aircraft
RG-DRONE-0001 and existing QA-operator-synthetic.mp4 through Android DocumentsUI.
The app copied and hashed the file and listed it as local, not server verified.
Saved a local draft with recording time intentionally empty. The disabled submit
button provided no reason on the original screen.

## Fix and verification

Added one compact informational row beside submit, identifying the next unmet
existing requirement. It does not require telemetry when the current flow allows
it to be absent, and does not grant submission or fake verification.

- Regression first failed: disabled dataset submission must explain the next requirement.
- node --test tests/operator-ui06-crew.test.cjs tests/final-drone.test.cjs: 49/49.
- npm run typecheck: exit0.
- node --test tests/*.test.cjs: 1664/1664, zero failed/skipped/cancelled,
  146752.3512ms; .cache/operator-submit-hint-regression-20261115.log.
- git diff --check: exit0.

ANDROID_E2E_VERIFIED after fix: force-stop/reopen preserved the selected aircraft
and selected video; draft recovery message explicitly says not sent. Scrolled to
the action and inspected screenshot and hierarchy: recording-time requirement
readable above disabled submit, within viewport, navigation labels visible.
No upload or dataset POST was triggered in this checkpoint. Synthetic QA video
is not evidence of real surveyed geometry, coverage or flight provenance.

Separate remaining findings: parent supplement GET does not retain child ID
(OPERATOR-SUPPLEMENT-ANDROID-20261115.md); offline cold authentication remains
limited (OPERATOR-COLD-START-ANDROID-20261115.md). These are not resolved here.
