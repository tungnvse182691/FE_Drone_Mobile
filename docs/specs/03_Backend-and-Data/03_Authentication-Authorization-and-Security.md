# Authentication, authorization và security boundaries

**Phase 2B · 15/10/2026 · source pin `1b577d703cda203c6066eba98ff005341739849e` · independent JEV review pending.**

[Canonical entrance](../README.md) · [Phase 2A workflows (owner PASS)](../02_Business-Workflows/README.md) · [Phase 2B review](PHASE2B_REVIEW_REPORT.md) · [Open status/GAP registry](../00_Governance/03_Implementation-and-Verification-Status.md).

`CURRENT_VERIFIED` ở đây = observed source/static metadata, không deployed acceptance. Owner decisions và latest [HUY specification](../../../planning/development/HUY-FINAL-INTEGRATION.md) xác định `TARGET_CONFIRMED`; [confirmed decisions](../../product/confirmed-decisions.md) giữ qualifiers. `PROPOSED`, `HISTORICAL`, `NOT_VERIFIED` theo [authority/legend](../00_Governance/01_Authority-and-Source-of-Truth.md). Phase 0 model/API capture được dùng sau recheck 1334 source hashes, không gọi SQL hay tuyên bố fresh runtime capture. Technical identifiers RoadGuardSystem và routes hiện hữu được giữ; product HoangHaiWarrantySystem, Supervisor/PM Web, Reporter/Operator/Crew Mobile React Native Expo.

## Trust boundaries: identity → role → project → resource → current source

An authenticated request still needs current actor/status/issued-role/password/session checks, effective membership where applicable, resource ownership/current assignment and source/version admission. Supervisor global scope is not universal authority to execute PM/Crew-only commands. PM membership does not grant Supervisor NORMAL approval/final. Reporter ownership is independent of project membership. Target client platform isn't a wire role check: some legacy cookie-compatible Reporter routes remain, while product primary client is Expo Mobile.

| Boundary | Implementation | What it does not establish |
|---|---|---|
| Human bearer | JwtBearerConfiguration + AuthoritativeSessionValidator/AuthService | A valid signature alone doesn't prove current role/session or task assignment |
| Web cookie | WebCookieConfiguration / WebAuthController / WebCookieRequestMiddleware | Cookie eligibility isn't every bearer route or CSRF bypass |
| Project membership | ProjectScopeGuard + current persistence guards | Supervisor scope return does not alone check all user/resource states |
| Private evidence | ReporterReport/Case/publication/file guards | File UUID/checksum is not a download grant |
| AI callback | AiServiceBearer + AiCallback policy | Service identity doesn't fix attempt/result provenance fencing |
| Offline | Registered public key + canonical signature/current admission | Signature isn't person identity, UTC truth or an irrevocable permission |

## Web cookie, CSRF và persistent login

Default policy scheme RoadGuardUser chooses bearer when Authorization header exists; otherwise cookie RoadGuardWeb only for eligible metadata/path plus session cookie. Legacy path predicates remain part of selector and must be read exactly; don't infer eligibility from platform or rename routes. Session cookie `__Host-RoadGuardSession`, renewal `__Host-RoadGuardRenewal`, CSRF `__Host-RoadGuardCsrf`; HttpOnly/Secure, path `/`, SameSite=Lax per config/controller. Ticket is finite 12h, sliding disabled. Current session validator checks issued role, current user, revocation and transport; bounded legacy sessions remain bounded. PersistentRenewable session has no ordinary server idle/max expiry, not a perpetual access ticket.

Web flow GET `/api/v1/auth/web/csrf`, POST login/renew/logout, GET session. CSRF header `X-CSRF-TOKEN`; auth controller validates login/renew/logout explicitly, middleware validates unsafe methods for cookie-authenticated other paths. Renewal rejects Authorization header; mixed authenticated bearer/cookie of different actors is rejected at middleware. Bearer-only requests aren't protected with a cookie CSRF token as a substitute for bearer auth. WebCookieActivityFilter records authoritative activity under its allowlist/transport checks, not arbitrary client heartbeats.

Renewal cookie protects credential with DataProtection purpose `RoadGuard.WebRenewal.v1`; MaxAge 365 days is browser cookie setting, not a guarantee of server session survival or cross-replica keyring. DataProtection persistence/shared keyring and HTTPS/proxy/origin deployment acceptance remain NOT_VERIFIED. Don't expose refresh token or disable validation to handle expired ticket.

## Mobile bearer, onboarding và credentials

Keep actual `/api/v1/auth/android/*` routes; Android is a compatibility identifier, product Mobile is React Native Expo. AuthService creates persistent renewable session/refresh credential and finite Android 15-minute access token; refresh rotates with durable current-session/replay safeguards. AccessTokenFactory uses configured issuer/audience/signing key ID, validator accepts known active/retained keys according to source. Logout/revoke/role change/inactive/forced password change can remove access despite persistent login. No iOS/native token-storage acceptance implied.

Reporter registration intent/OTP/invitation/reset/password flows are in workflow 01; options defaults 10-minute OTP, 5 attempts, resend 60 seconds/3 per15minutes are config defaults, not deployed SMTP evidence. ASP.NET Identity stores/hash checks and secret-backed fingerprints are source mechanisms; do not document raw password, token, OTP, device metadata or signing key in logs/reports.

## Resource authorization, idempotency và concurrency

Every module has exact authority: Case unassigned triage Supervisor, assigned Case PM; candidate decision PM; FIELD current Crew; NORMAL Supervisor approval/final versus FT PM final; policy PM versus road coverage Supervisor. Read authority can differ from write, and original actor can differ from handover importer. Recheck current role/membership/assignment/source under durability seam when implemented; don't claim every compatibility route is equally fenced.

IdempotencyRecord unique scope `(ActorUserId, ProjectId, Operation, IdempotencyKey)` plus RequestFingerprint distinguishes same request replay from changed content. IdempotencyOperationService supports ordinary/Serializable transaction and optional receiptAccessGuard before replay/conflict; **optional guard means one cannot infer all callers revalidate rights**. Current role/resource checks in each caller matter. SQL execution strategy retries transient failures, clears/reloads durable receipt on competing unique/commit ambiguity; not network exactly-once delivery or proof external side effects won't repeat.

If-Match/ETag versions can be Base64 rowversion or module content/version tokens; K is not version or signature. Header required/shape/status differs by action. Use current [API inventory](../../audit/HHWS-DOCS-REBUILD-01/02_FULL_API_INVENTORY.md) and controller DTO; no common global 409/412/428 mapping invented. Receipt doesn't preserve access after revocation where current-rights guard applies; offline replay still has registration/source/assignment admission.

## Evidence privacy và known gaps

Private Reporter FileScope has owner, null project/target, REPORT_PHOTO; report/supplement only verified own evidence. PM/Supervisor read via Case/project/current source; publication explicitly pins selected evidence/recipients. Conclusion isn't publication. Exports have authorized immutable snapshot and post-storage-await guard; raw blob URL/cached UUID isn't permission.

**P1-04 / PARTIAL**: ReporterEvidenceService.DownloadAsync/DownloadPublicationAsync checks rights before OpenRead storage await without equivalent post-await revalidation. This is source risk; delayed-open exploit/cross-owner leakage NOT_VERIFIED. Don't claim source fixed or encryption cures authorization. Recommend bounded BE guard/dispose and negative tests separately. **P1-02** callback latest-attempt/full receipt binding and **P1-03** matching remain; **P1-05** live Web/Expo/provider/security acceptance unverified. P2-06 notification and P2-07 localized producer gate stay in status registry.

## Local encryption and assurance boundary

Backend encrypted handover protects a bounded package, not Expo SQLite, photos, thumbnails, cache or queue at rest. SQLCipher/equivalent + encrypted files + secure data/private keys are FE implementation responsibility with native architecture PROPOSED/NOT_VERIFIED. Backend registration stores public keys; no private-key escrow/recovery inferred. ECDSA proves key possession/content binding under algorithm/registry assumptions, not person presence, accurate GPS/measurements or historic UTC. Do not describe hardware-backed Android Keystore or Expo adapter as implemented without consumer evidence.

Related workflows: identity (01), Reporter/Case (03), candidate (04), FIELD (06), NORMAL/FT (07/08), offline (09) and notifications/export (10) at [workflow index](../02_Business-Workflows/README.md). **Judgment PARTIAL**; mechanisms source verified, runtime/native/threat reproduction not run in Phase 2B.

## Source evidence và verification boundary

Symbol/line dưới đây tại `1b577d703cda203c6066eba98ff005341739849e`. Partial declarations được bổ sung bằng method locator; không coi một interface/DI entry là bằng chứng mọi runtime branch đã chạy.

- [AuthService](../../../RoadGuardSystem.Services/Implementations/Authentication/AuthService.cs#L13): source declaration.
- [AuthoritativeSessionValidator](../../../RoadGuardSystem.Services/Implementations/Authentication/AuthoritativeSessionValidator.cs#L15): source declaration.
- [JwtBearerConfiguration](../../../RoadGuardSystem.API/Authentication/JwtBearerConfiguration.cs#L15): source declaration.
- [AiServiceJwtBearerConfiguration](../../../RoadGuardSystem.API/Authentication/AiServiceJwtBearerConfiguration.cs#L8): source declaration.
- [WebCookieConfiguration](../../../RoadGuardSystem.API/Authentication/WebCookieConfiguration.cs#L10): source declaration.
- [WebCookieRequestMiddleware](../../../RoadGuardSystem.API/Middlewares/WebCookieRequestMiddleware.cs#L11): source declaration.
- [WebCookieActivityFilter](../../../RoadGuardSystem.API/Authentication/WebCookieActivityFilter.cs#L11): source declaration.
- [WebAuthController](../../../RoadGuardSystem.API/Controllers/WebAuthController.cs#L20): source declaration.
- [ProjectScopeGuard](../../../RoadGuardSystem.Services/Implementations/Authorization/ProjectScopeGuard.cs#L6): source declaration.
- [IdentityRepository](../../../RoadGuardSystem.Repositories/Implementations/Identity/IdentityRepository.AccountUpdates.cs#L10): source declaration.
- [IdempotencyOperationService](../../../RoadGuardSystem.Repositories/Idempotency/IdempotencyOperationService.cs#L8): source declaration.
- [ReporterEvidenceService](../../../RoadGuardSystem.Services/Implementations/Files/ReporterEvidenceService.cs#L15): source declaration.
- [ExportService](../../../RoadGuardSystem.Services/Implementations/Exports/ExportService.cs#L16): source declaration.
- [OfflineDeviceKeys](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineDeviceKeys.cs#L6): source declaration.
- [AuthService.LoginAsync](../../../RoadGuardSystem.Services/Implementations/Authentication/AuthService.cs#L49): method source.
- [AuthService.RefreshAsync](../../../RoadGuardSystem.Services/Implementations/Authentication/AuthService.cs#L126): method source.
- [IdempotencyOperationService.ExecuteSerializableAsync](../../../RoadGuardSystem.Repositories/Idempotency/IdempotencyOperationService.cs#L45): method source.
- [IdempotencyOperationService.ExecuteSerializableAsync](../../../RoadGuardSystem.Repositories/Idempotency/IdempotencyOperationService.cs#L60): method source.
- [ReporterEvidenceService.DownloadAsync](../../../RoadGuardSystem.Services/Implementations/Files/ReporterEvidenceService.cs#L174): method source.
- [ExportService.ContentAsync](../../../RoadGuardSystem.Services/Implementations/Exports/ExportService.cs#L136): method source.

Business/SQL/HTTP/native/external tests Phase 2B **NOT_RUN** (docs-only). Fresh static link/reference/hash/diff checks nằm trong [review report](PHASE2B_REVIEW_REPORT.md). Test source/checkpoint cũ chỉ `HISTORICAL` theo revision, không runtime PASS mới. Independent JEV **PENDING**.

## Phase 5 current-source clarification

At `d1e529a5d1b6a95fa18d9448f7d75468463390df`, export access (API-074–077) requires current effective project membership even for Supervisor. `ExportService.AuthorizeAsync` L33–42 calls `HasCurrentProjectMembershipAsync`; `ExportRepository.AdmitAsync` enforces membership role/status/dates during capture/replay. Global reporting authority does not grant private export access. This restriction was introduced after the Phase 2 source pin (commits `e59027b`, `c093ba6`); earlier source evidence is historical for this guard. No runtime check is rerun by this documentation correction.
