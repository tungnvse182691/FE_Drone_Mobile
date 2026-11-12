# ROADGUARD-FE-EXPO58-PATCH-HARDENING

Date: 2026-11-12. Mode: IMPLEMENT_AND_SELF_REVIEW.

## Decision

**READY_FOR_ANDROID_ACCEPTANCE**. Expo Doctor **20/20, exit 0**. No commit, merge, push, branch/worktree creation or native configuration change was performed. **ANDROID_E2E_NOT_VERIFIED**: no new Android build or device E2E was executed. Doctor and Node tests do not prove native acceptance.

## Scope and preserved state

Worktree: `C:/Users/ACER/.codex/worktrees/operator-ui-integration/FE_AppMobile`.
Branch: `integration/operator-ui-20261112`.
HEAD: `da04a710508ad3c4235dd507b404234780971d26`.
Runtime: Node v22.15.1, npm 10.9.2, Windows PowerShell.
Evidence below is relative to `.integration-evidence/expo58-patch-20261112/`.

| File | Change in this task |
|---|---|
| package.json | Exactly 13 direct dependency ranges changed to the targets below |
| package-lock.json | Root ranges synchronized; Expo transitive graph and missing required peer graph resolved |
| EXPO58_PATCH_HARDENING_REPORT.md | This report |
| .integration-evidence/expo58-patch-20261112/ | New logs, exit codes, snapshots, scope verifier and isolated regression outputs |

Four pre-existing UI source diffs (Profile, Sync, DroneTaskCommandPanel, OperatorTaskRow), `tests/operator-ui-integration.test.cjs` and `OPERATOR_UI_INTEGRATION_REPORT.md` remain byte-identical to preflight (SHA256 verified). All 403 pre-existing integration cache files retain their SHA256. No source/test assertion/native/app config change was needed. Original FE checkout was only read; its tracked status remains clean and the same 12 untracked entries remain.

The six functional commits e80156a, da6aade, d578313, ed3199b, 6f1abd7 and da04a71 remain ancestors of HEAD. This task does not re-integrate UI commits 3cbfa6d/c5afa0b or alter the earlier UI integration decisions.

## Direct dependency before/after

Before values are installed versions; after ranges are `~` plus the listed version. Manifest, lock root, locked node and installed package were checked for equality. React 19.3.0 and React Native 0.88.1 remain unchanged; Expo SDK remains 58.0.x.

| Package | Before | After |
|---|---|---|
| expo | 58.0.23 | 58.0.24 |
| expo-constants | 58.0.15 | 58.0.16 |
| expo-crypto | 58.0.7 | 58.0.8 |
| expo-document-picker | 58.0.4 | 58.0.5 |
| expo-font | 58.0.11 | 58.0.12 |
| expo-linking | 58.0.16 | 58.0.17 |
| expo-location | 58.0.20 | 58.0.21 |
| expo-media-library | 58.0.13 | 58.0.14 |
| expo-router | 58.0.30 | 58.0.31 |
| expo-secure-store | 58.0.2 | 58.0.3 |
| expo-splash-screen | 58.0.13 | 58.0.14 |
| expo-sqlite | 58.0.15 | 58.0.16 |
| expo-status-bar | 58.0.4 | 58.0.5 |

Preflight reproduced 13 mismatches and Doctor 19/20 (both exit 1). Exact registry versions and upstream dependency metadata were checked: `registry-targets.log`.

## Install and peer dependency findings

Initial npm config inherited `legacy-peer-deps=true` (`npm-policy.log`). Initial install/ci success therefore was not accepted as complete peer verification. No global config was edited. Subsequent commands explicitly used process-only `npm_config_legacy_peer_deps=false` and `npm_config_force=false`.

With validation enabled, the old lock failed `npm ci` with EUSAGE for missing required peer packages, not ERESOLVE (`npm-ci-peer-validation.log`). Existing react-native-worklets 0.13.0 requires @react-native/metro-config. The same targeted install resolved its required peer graph without adding a direct dependency. Final ci and npm ls both exit 0. No force, peer bypass, validation exclusion or manual node_modules edit was used to obtain final results. Optional peers immer/use-sync-external-store remain absent and are reported as optional by npm ls; there is no missing required peer failure.

Exact targeted command (second run with the process settings above):

```powershell
npm install --no-audit --no-fund 'expo@~58.0.24' 'expo-constants@~58.0.16' 'expo-crypto@~58.0.8' 'expo-document-picker@~58.0.5' 'expo-font@~58.0.12' 'expo-linking@~58.0.17' 'expo-location@~58.0.21' 'expo-media-library@~58.0.14' 'expo-router@~58.0.31' 'expo-secure-store@~58.0.3' 'expo-splash-screen@~58.0.14' 'expo-sqlite@~58.0.16' 'expo-status-bar@~58.0.5'
npm ci --no-audit --no-fund
npm ls --all
```

Evidence: `install-peer-validated.log`, `final-npm-ci.log`, `final-npm-tree.log` and corresponding `.exit` files.

## Lockfile review and native risk

Compared to pre-task lock: **11 added package paths, 7 removed, 50 version changes (13 direct, 37 transitive), 1 metadata-only change**. Root entry excluded from these counts. Detailed list: `lock-summary.json`. Git diff: package-lock 431 additions/332 deletions; package.json 13 additions/13 deletions.

- Expo 58.0.24 requires newer CLI/config/Metro/preset/assets/autolinking/core dependencies. Upstream transitive versions include expo-modules-core/autolinking/server 58.1.0, expo-modules-cli 0.5.0 and modules-macros 0.33.0. These are transitive requirements of the requested Expo patch, not a root SDK minor upgrade. See registry metadata and `transitive-explain.log`.
- Babel patch resolutions, ws and brace-expansion patches are in the affected dependency graph. Polyfills 0.88.1 were deduplicated to root; old redundant paths and unused getenv/glob/minipass/path-scurry nodes were removed by npm.
- Required peer completion added Metro config/transformer and RN Babel preset 0.88.1, Babel plugins and nested Flow parser/ESTree nodes. Existing root flow-parser remains unchanged. TypeScript metadata changed, not its version.
- Native module/toolchain changes need a fresh build from this integration worktree. An older development client or Metro attached to the original FE is not acceptance evidence. No native build/config or emulator data was modified here.

## Final verification after peer-complete npm ci

All listed final gates ran against the final installed tree.

| Gate | Result | Evidence |
|---|---|---|
| Reproducible npm ci, peer bypass disabled | PASS, exit 0 | final-npm-ci.log/.exit |
| npm ls --all | PASS, exit 0 | final-npm-tree.log/.exit |
| npx --no-install tsc --noEmit | PASS, exit 0 | final-typecheck.log/.exit |
| Targeted Operator/UI/recovery/session/password/scope | PASS 291/291; 0 skipped; exit 0 | final-targeted.log/.exit |
| Full Node regression | PASS 1360/1360; 0 skipped; exit 0 | final-full.log/.exit |
| CI=1 npx --no-install expo install --check | PASS, up to date; exit 0 | final-expo-check.log/.exit |
| CI=1 npx --yes expo-doctor | EXPO_DOCTOR_PASS 20/20; exit 0 | final-doctor.log/.exit |
| Scope, SHA256 preservation, versions, refs | PASS, exit 0 | post-regression-scope.log/.exit |
| git diff --check | PASS, exit 0 | final-diff-check.exit |
| Conflict markers in dependency files | PASS, no matches (rg exit 1) | final-conflict-scan.log |
| Added dependency diff secret-pattern scan | PASS, 0 findings; heuristic scope only | final-secret-scan.log |
| Android/native build/E2E | ANDROID_E2E_NOT_VERIFIED / NOT_RUN | No native execution in this task |
| Live HTTP/session/offline native recovery | NOT_RUN | Node regression is LOGIC_TESTED, not HTTP/NATIVE proof |

Regression commands used the same 99 test file bytes as integration. To preserve existing build/cache artifacts, CWD was `.integration-evidence/expo58-patch-20261112/regression-cwd`, inside this same worktree; source/modules/node_modules are junctions to the integration tree, test files and root manifests are hardlinks. Manifest and lock SHA256 match actual worktree files. New compilation output goes to this task's fresh cache. No test source or assertions were altered. Targeted and full raw logs contain the executed test names/results.

```powershell
# Full (CWD as described above)
$testFiles=@(Get-ChildItem -LiteralPath tests -Filter '*.test.cjs' -File | Sort-Object Name | ForEach-Object {$_.FullName})
& node --test --test-reporter=tap @testFiles
# Targeted: same enumeration plus filter before sorting:
# Where-Object {$_.Name -match 'operator|drone|recovery|session|password|scope'}
```

## Ref protection and delivery

Final read-only `git ls-remote origin refs/heads/main` confirmed GitHub main **ff0f694606e26d20bf84cf4b232e2349dc76ecd5**. Local main remains **c5afa0b2f3cdbbf3dcc58addd1b0fd05786f20da**. Original Codex branch and integration HEAD remain **da04a710508ad3c4235dd507b404234780971d26**. See `preflight-git.log`, `final-git.log` and scope verifier.

No files were staged or committed. Review this dependency diff and report before any next step. Next acceptance requires a build from this worktree and actual Android checks of login/Force Change Password, Operator navigation, commands/readback, session/actor switching, offline pending-command recovery and upload continuity with an authorized fixture. No Android PASS or release readiness is claimed.
