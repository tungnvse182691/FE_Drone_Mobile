# CODEX-T02 — Auth password & recovery review

- Date: 2026-10-27 (UTC+7). Baseline: `42a10adc5442087ae959820a25e3218b475dfe93`, branch `main`.
- Scope: API-004/005/008 integration; existing UI retained. No BE, Docker, client retry, Reporter upload, Crew or Drone changes.
- Review: Codex self-review plus independent read-only T02 review; no actionable P0/P1/P2 findings reported. No known open P0 within this diff.

## Files and decisions

| File | Change |
|---|---|
| app/(auth)/force-change-password.tsx | Real API-004/005; validation/loading/error; memory-only immutable command; same-session completion checks; logout and relogin after success |
| app/(auth)/index.tsx | Retain successful login + mustChangePassword handling; explicit password-change-required error opens anonymous forced form; relogin success notice |
| app/(reporter)/account.tsx | Real API-008; 202 acknowledges receipt only; block repeated writes after uncertain outcome |
| src/api/authApi.ts | Exact wire wrappers; stable command identity/key; safe errors; session continuity helper |
| src/store/auth.ts | Ephemeral username context for anonymous forced form, excluded from persistence |
| app/_layout.tsx | Permit voluntary password form for valid sessions and anonymous API-005 form with explicit context; Stack stays mounted |
| tests/t02.test.cjs | 20 wrapper, validation, command, screen logic and navigation regressions |
| tests/t02-http-smoke.cjs | Opt-in real Axios/wrapper smoke using a new disposable Reporter fixture |

AuthGuard evidence: the previous authenticated `inAuth` redirect immediately sent a voluntary password-change visit home. The exception now permits only the password form; anonymous context grants no private-route access.

Candidate3 source inspected: AuthController, authentication DTOs, AuthService, IdentityCredentialVerifier, IdentityRepository.PasswordChanges and JwtBearerConfiguration; API catalog operations 004/005/008. Login normally returns 200 with mustChangePassword, rather than necessarily returning 403. Password changes revoke sessions/security stamp. Candidate3 deliberately allows committed API-004 replay with the same key on the revoked session.

Command payloads and passwords exist only in component memory. Identical payload and session retain a key; edited payload or another session gets a fresh key. Session continuity uses actual JWT sub/sid, including refresh within the same session. Late completion cannot log out a different signed-in session. No password is persisted, passed in navigation or logged. Restart discards the password command: after an uncertain outcome, check by logging in with the new password before issuing another change. Recovery has no idempotency contract and is not automatically replayed; uncertainty blocks resubmission while the form remains mounted, and instructs the user to contact support.

## Verification

| Gate | Result |
|---|---|
| npm run typecheck | PASS, exit 0 (tsc --noEmit) |
| node --test --test-reporter=spec tests/t01.test.cjs tests/t01-client.test.cjs tests/t01-ui.test.cjs tests/t02.test.cjs | PASS, 69 tests / 0 failures (49 unchanged T01 + 20 T02) |
| node tests/t02-http-smoke.cjs | PASS, exit 0; HTTP evidence below |
| git diff --check | PASS |
| Scope / secret review | Explicit allowlist only; no real passwords, tokens, OTP values, signed URLs, .env or personal data added |

Screen tests execute production hook logic through a deterministic native/UI boundary harness; they are not Android rendering or device acceptance. Timeout/backoff and actor switching use controlled regression fixtures. No shared demo account password was changed.

### Real HTTP evidence, Candidate3 loopback, 2026-10-27

| Operation | Observed |
|---|---|
| /ready | 200 |
| Private Reporter fixture setup | Registration 202, OTP verification 200, login 200, mustChangePassword=false |
| API-004 | Wrong current password 401; policy validation 400; successful change 204 |
| API-004 replay | Same command + old revoked bearer 204; new key + revoked bearer 401; same command after new login 204; changed payload + reused key 409 |
| Credential check after change | Old password login 401; new password login 200 |
| API-005 negative cases | Invalid DTO 400; wrong credentials 401; non-forced private Reporter 409 |
| API-008 | Receipt 202; invalid email 400; no reset/email-delivery claim |

## Eight scoped review invariants

| Invariant | Result |
|---|---|
| Icons | PASS: changed screens retain MaterialIcons; no Ionicons introduced |
| UD-06 | PASS: no financial UI introduced |
| Fabric navigation | PASS: Stack retained, AuthGuard in effect, full group routes |
| Mobile role scope | PASS: no role permission change |
| Defect types | N/A: no defect classification change |
| Branding/technical standards | PASS: no branding/assets/technology change |
| DTO/data contract | PASS: exact request DTOs, Bearer+key for 004, anonymous operationId for 005, email for 008 |
| Error handling | PASS: safe text, double-submit protection, uncertain results distinguished from success |

Self-correction: command completion snapshots primitive ownership fields so switching actors cannot inherit effects; refresh continuity uses sub/sid rather than token equality. Test harness setup errors were corrected before meaningful regression verification. HTTP replay expectations were corrected against authoritative BE source and measured behavior; BE was not edited.

## UI / API / workflow and remaining acceptance

| UI | API | Workflow |
|---|---|---|
| Password change form: existing layout, validation/loading/error | API-004 HTTP VERIFIED | Success requires relogin; timeout manual retry preserves command |
| Forced password form + login routing | API-005 negative HTTP cases VERIFIED; successful 204 NOT RUN | 200+mustChangePassword=true and explicit error routing logic PASS; private forced fixture unavailable |
| Reporter account recovery: loading/error/receipt notice | API-008 HTTP VERIFIED (receipt only) | Support request recorded; actual recovery resolution outside this endpoint |

- No auth mock imports remain in the targeted password/recovery screens. Other screens and mock modules outside T02 were not migrated or broadly audited.
- API-005 successful forced change and login with mustChangePassword=true: HTTP NOT RUN, no private forced fixture. Do not claim API-005 success HTTP VERIFIED.
- JWT expiration by elapsed time: HTTP NOT RUN; revoked-session 401 verified, error handling covered by logic tests.
- ANDROID E2E: NOT RUN; no emulator opened. Native navigation, restart and keyboard behavior await device acceptance.
- API integration ready for review with the limits above; not a claim of full product acceptance or production readiness. No T03 work performed.
