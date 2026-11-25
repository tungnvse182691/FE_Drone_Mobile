# Reporter encrypted photo checkpoint

Reviewer: Codex, IMPLEMENT_AND_SELF_REVIEW. Baseline 48db447, main.
Remote main fetched unchanged at 71aeb0a. No push.

## Implementation

New authenticated Reporter photos are sealed using the existing native vault;
account/environment/role references survive draft and upload ledger persistence.
Recorded references read authenticated, bounded chunks with full checksum proof;
native failure cannot fall back to the retained plaintext source. Guest or absent
native provider retains legacy behavior, with no encryption claim. Capture queue
admission now preserves the image before publishing it. Reusing verified photos
retains the reference and its size/hash. SQLite migration adds media_vault without
replacing existing rows. No HTTP payload, GPS semantics, UI layout or receipt rules
changed. Original files remain for preview/recovery; no full at-rest claim.

## Executed evidence

- TypeScript exit 0, reporter-vault-typecheck-final.log.
- Full regression 2127/2127, reporter-vault-regression.log.
- Final focused run 10/10, reporter-vault-targeted-final.log.
- Earlier combined targeted run 26/26. Initial RED and fixture repair retained.
- git diff --check passed.
- Release build and install-r passed, no emulator restart/data reset.
- APK SHA256 F7B7FD942F807762E28E810DA5545B1DE7DE10E84295F40AE3A9EF2FBEB852BE.

Actual emulator-5554 / Android14 / Reporter-b: disabled WiFi/mobile data, opened
camera, captured synthetic emulator image, typed QA-VAULT-REPORTER-20261125
description, pressed Send. Upload could not reach storage; command remained.
Force-stopped/reopened only the app. Home recovery listed one command; explicitly
opened it and saw the same photo, description and captured coordinates. Enabled
networking and explicitly pressed Send. Normal app reached report detail.

Authenticated GET reports and GET report detail returned 200: exactly one match,
report 6deb93e9-7e12-4102-acde-fe68e799c769, exact description, one evidence file
4c8cf2f6-e90d-4781-8831-9d75e7a79212, version AAAAAAAFGg4=, CAPTURE location.
Evidence: reporter-vault-command-restored.png, reporter-vault-submitted.png,
reporter-vault-http-readback.json under .cache/offline-session-20261124/.

Important test distinction: the first attempt only typed without pressing Send;
the new-form route correctly returned an empty form. Its misleadingly named
reporter-vault-offline-restored.png is NOT restoration proof. The later command
restoration screenshot is the valid proof. New form selects a new slot; existing
commands are opened through Home recovery. ADB loopback API remained available;
this proves network-disabled storage failure, not a fully unreachable API host.

## Limits

ANDROID_E2E_VERIFIED for this capture/send interruption, app restart, explicit
recovery/manual resume and published report readback. Not automatic resend, large
file interruption, physical GPS, iOS or TEE proof. Existing emulator keys SOFTWARE.
No pending/historical media deleted or rewritten. Crew storage integration, legacy
migration and 42A peer key discovery remain separate. English screenshot text was
FE storage QA text translated earlier, not backend output.
