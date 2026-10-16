# Integration acceptance checklist

**Source baseline:** `d1e529a5d1b6a95fa18d9448f7d75468463390df` · `huy-review` · 15/10/2026. Documentation/static audit only; independent JEV **PENDING**.


All unchecked scenarios below are **NOT_RUN in Phase 5**. Source-presence/static-validator results are separate and recorded in the review report. Execute in isolated test infrastructure with approved accounts/data, capture exact SHA/config/clock/commands/logs and expected/actual; never use shared Production data as a fixture.

| ID | Scenario / authoritative expectation | Required evidence / parent |
|---|---|---|
| A01 | Reporter registration→OTP→Android login→refresh rotation→logout; expired/reused refresh rejected; current account changes enforced | Native + SMTP trace; no secrets in logs/cache; P1-05 |
| A02 | Own private multipart: create/parts/ETag/SHA256/complete/poll VERIFIED; restart/timeout/expired URL/disk-full and failed worker recovery | Real storage and Production worker configuration/logs; complete≠VERIFIED |
| A03 | Report independent Survey; same-K unknown-outcome replay does not duplicate; changed body/K/version conflicts reconcile | Reporter native+BE flow; API-216/219 |
| A04 | Cross-owner report/private/publication access denied; permission revoked while storage open closes content path | Delayed-open temporal negative tests; P1-04 |
| A05 | Supervisor triages unassigned Case, PM assigned scope; conclusion/publication distinct; no fake Survey for Reporter | Real Web session/Case source trace; P2-07 localized negative case |
| A06 | Cookie login/bootstrap/renew/logout/CSRF positive+negative; Bearer-only Web operation remains blocked until approved correction | Browser tests at exact SHA; 43 mappings/40 APIs; WEB-T01 |
| A07 | PM KEEP_NEW/LINK_EXISTING/REJECT; stale head/target/current membership replay rejected; AI never creates Defect | Actual candidate source+decision+audit; P1-03 |
| A08 | Operator assigned list/detail/accept/decline, no PM reassignment/supplement or Crew sync; wrong assignment/device denied | Native survey task/DTO and negative HTTP tests |
| A09 | Video/SRT/GPS/road geometry pins survive upload/dataset/job; absent telemetry not coverage PASS; GIS section differs image mask | Real file checksums/CRS/time/frame/source artifact chain |
| A10 | Real YOLO checkpoint/hash/class mapping/version/evaluation; authenticated adopted dispatch/callback raw-result VERIFIED provenance | Real provider integration, not MockAIAdapter; P1-01/05 |
| A11 | Old/inactive/out-of-order attempt, changed manifest/model/mode and cross-job receipt replay fail correctly | Reproducible callback negative tests; P1-02 |
| A12 | Crew FIELD accept/start/submit; PM supplement uses API-092 then API-095 latest ParentSubmissionId; immutable first start; measurement provenance | Native+isolated SQL/HTTP trace; H3 controlled clock/fixture root-cause proof |
| A13 | Trace assigned Crew repair item/current command version/attempt; API-141/148 denied; eligibility hash not reused as rowversion | Existing producer/read bootstrap proof before endpoint proposal; P5-G02 |
| A14 | NORMAL PM proposal→Supervisor approval→PM assignment→Crew→PM review→Supervisor final; wrong actors denied | Current membership/assignment/version/policy/evidence negatives |
| A15 | FT eligibility/policy/coverage guards, PM final, Supervisor information only; revoke/stale/replayed authority rejected | Full workflow plus notification recipient/outbox/dedup; P2-06 |
| A16 | Device enrollment separate public encryption/signing SPKI keys; P1363 canonical claim/manifest/interoperability; no Reporter/Operator privilege | Golden bytes + native key custody/revocation/snapshot conflict tests |
| A17 | Signed per-item pending/conflict/replay and handover preserve source actor/origin/snapshot; HTTP200 not all ACK; lost-key/uninstall warning | Native queue/restart/export/import/reconciliation; no escrow assumption |
| A18 | SQLite/cache/photo/temp/EXIF/backups encrypted as selected policy; account switch/logout/lock/restore cleanup; keys cannot leak | Device filesystem inspection and key lifecycle evidence; P1-05 |
| A19 | Supervisor export requires effective project membership; download reauthorizes after storage await; snapshot/holds preserve source | API-074–077 positive/negative/current-revocation tests at current source |
| A20 | SMTP/MinIO/FCM auth/recipient/TLS/retry/expiry, backup restore/retention/deployment probes | Real environment evidence, config redacted; P1-05 |

Do not turn a checklist row into PASS because Backend CI succeeded. Report BE verified, mock verified, native/external/deployment verified separately; attach failing assertion/stack trace if any. Documentation-only correction does not authorize runtime remediation.
