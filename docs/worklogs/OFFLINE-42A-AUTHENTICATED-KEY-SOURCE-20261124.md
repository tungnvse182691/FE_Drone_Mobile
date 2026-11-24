# 42A authenticated key source — integration boundary

Reviewer: Codex; mode: IMPLEMENT_AND_SELF_REVIEW of the authorized six-workstream task.
FE baseline: `275bf52`. This checkpoint changes documentation only.

## Source pins and exact review scope

- Deployed/local BE: `fb2761619cce11e05e439f322efbf41e00f8a7bf`.
- Remote develop observed using `git ls-remote origin refs/heads/develop`:
  `b891e88ea20073bab7b110f301b7b37ebfa1c40c`.
- Fetched remote objects, inspected `git diff fb27616..FETCH_HEAD` and
  `git show origin/develop:deploy/fe-handoff/POST-T1-T3-BE-CLOSEOUT.md`.
  Local BE HEAD and source were not changed. No Docker/SQL/MinIO operation.
- No delta in OfflineWorkflowController, Offline DTOs or Offline repository.
  The new Supervisor `handover-documents` inventory is construction-document
  discovery; it does not discover 42A devices, keys or recipient grants.

## Actual contract boundaries

1. `OfflineWorkflowController.cs:22` exposes known-ID device GET, not a device directory.
2. `OfflineWorkflowRepository.cs:88` returns 403 for RepairCrew reading a device
   whose ActorId differs from the current actor. Knowing its registration ID
   does not remove this guard.
3. `OfflineWorkflowRepository.Transfer.cs`, `ReadTransferAsync`, grants only
   Supervisor or the current unrevoked recipient actor/role access to grant GET.
   GrantView includes source/recipient registration IDs, scope, hash, expiry and
   revocation; not an independently authenticated public-key pair.
4. Package GET returns source registration ID, cipherPackageJson, signed manifest,
   payload/manifest hashes and signature. The sender key inside cipherPackageJson
   is part of the imported envelope. FE must not use it as its own trust anchor.
5. Source package export precedes Supervisor grant issuance. Do not require a
   preexisting grant to export or manufacture a local grant to break that cycle.

## Question for BE / integration owner

`BE_DISCOVERY_GAP`: which authorized channel supplies the current independently
registered public keys for a **different actor**, for both source-side recipient
selection and recipient-side verification of the source?

An existing documented, authenticated distribution channel can satisfy this;
this report does not prescribe a public directory or demand relaxed device GET.
If an endpoint is selected, it must bind project, actor, device registration,
installation identity, role, revision, signing/encryption public keys and key
fingerprint, current access and revocation. Private keys remain on the device.
Grant/package ID delivery after client restart also needs a documented channel.

Do not use a Supervisor bearer token in Mobile, grant extra roles, or trust a key
typed/pasted from an untrusted package. No such workaround was implemented.

## Distinct FE and environment work still remaining

This source boundary does not explain away the remaining FE work: enrollment and
snapshot actions, immutable offline field dispatch and per-origin readback,
real handover export/import/endorsement callers, encrypted runtime database and
all media readers/writers, interrupted migration, legacy recovery and three-role
Android E2E are not complete.

The emulator provides SOFTWARE EC keys. Hardware-backed production acceptance
cannot be obtained by rerunning Node/.NET tests or changing the acceptance flag.
Physical Android evidence is required for TEE/StrongBox policy. iOS native
implementation/evidence remains outside the Android proof.

## Verification and limits

This discovery conclusion is SOURCE_REVIEWED, not HTTP_VERIFIED. No cross-actor
403 request was executed against a real fixture in this checkpoint. No API
mutation, seed, grant or import was sent. Prior foundation/bridge tests prove
protocol primitives only; they do not prove business handover.

At FE implementation checkpoint `275bf52`: TypeScript exit0, full regression
2095/2095, Android embedded build/install and Crew local-read empty/back/reconnect
executed; see `OFFLINE-LOCAL-DRAFT-INSPECTION-20261124-review.md` for exact evidence.
None of these results certifies completion of the six workstreams.
