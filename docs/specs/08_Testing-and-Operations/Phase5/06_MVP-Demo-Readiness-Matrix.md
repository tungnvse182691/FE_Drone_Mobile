# MVP demo readiness

**Source baseline:** `d1e529a5d1b6a95fa18d9448f7d75468463390df` · `huy-review` · 15/10/2026. Documentation/static audit only; independent JEV **PENDING**.


**Overall: BLOCKED for a complete real-client, real-YOLO MVP demo.** Backend-source readiness and baseline CI are useful evidence, but no complete journey here is READY_BY_EVIDENCE as a deployed integration. A mock demonstration must be explicitly labelled and cannot stand in for real provider, private-storage or native proof.

| Journey stage | Actual Backend/API evidence | Web/Expo implementation | Real provider / E2E | Verdict / dependency |
|---|---|---|---|---|
| Reporter registration/OTP/login | API-002/003/007/010–012, current auth/session/Reporter registration source | Handoff only; native token storage NOT_VERIFIED | SMTP and exact native journey NOT_RUN | PARTIAL; P1-05 |
| Reporter photo/report/supplement/publication | API-208/210–219 private ownership/VERIFIED/report/current recipient source | 10 proposed screens, no build evidence | Real private upload/download/publication E2E NOT_RUN | PARTIAL; worker, P1-04/05 |
| Supervisor triage unassigned Case | Case source and Web actor/transport evidence in workflow03/matrix | Proposed Web UI | Browser E2E NOT_RUN | PARTIAL; preserve triage before PM, no direct Reporter→PM bypass |
| PM candidate decision/Defect | KEEP_NEW/LINK_EXISTING/REJECT source persistence | Proposed Web UI; some other Web commands transport blocked | Matching/provider and UI E2E NOT_RUN | PARTIAL; P1-03, WEB-T01 |
| Operator assigned survey | API-038/225–232 source; Operator accept/decline/submit, PM assign/reassign | 8 proposed screens; no Expo/DJI evidence | Native task capture E2E NOT_RUN | PARTIAL; no missing-list claim |
| Video/SRT/GPS dataset | Task-scoped upload API-233–236, dataset API-229, checksum/version/provenance | File picker/camera/telemetry proposed | Storage/verification Production topology NOT_VERIFIED | PARTIAL; complete≠VERIFIED, SRT absence not coverage PASS |
| FastAPI YOLO inference/callback | BE jobs/attempt/callback DTO/auth exist; AI worker mock branches and incompatible callback | AI source snapshot only | Real model adoption/authenticated callback/metrics NOT_RUN | BLOCKED; P1-01/02/05 |
| Candidate assessment from actual AI result | BE persists detections/candidates, PM decides | Proposed Web | Actual video→real detection→PM decision NOT_RUN | PARTIAL; synthetic evidence cannot establish this journey |
| Crew FIELD measurement/review | API-078–096 source, assignment/first-start/parent lineage/PM review | 11 Crew screens proposed | Native measurement/provenance and H3 root cause NOT_VERIFIED | PARTIAL; physical dimensions from Crew only; P2-07 localized |
| NORMAL/FT repair and final | Repair producer/execution/policy/safety/final guards; NORMAL Supervisor final vs FT PM final | No actual Web/Expo build; Crew repair bootstrap unresolved | Full assignment→evidence→review→final NOT_RUN | BLOCKED for full demo; WEB-T01/P5-G02/P2-06 |
| Offline/handover support | Typed snapshots/signed per-item admission/source custody present | Native signed queue/keys/files not supplied | Device interoperability/key loss NOT_RUN | NOT_VERIFIED; no Reporter/Operator signed-offline extension |
| Notifications/export/retention | Outbox/duty/publication/export snapshot/current-membership/retention source | Handoff only | SMTP/FCM/MinIO/deployed retention/restore NOT_RUN | PARTIAL; P1-05/P2-06; no publication implied by private evidence existence |

The minimal source-backed Reporter online flow remains usable as an implementation target without Drone Survey or Crew device enrollment. This is not a claim that Production uploads currently auto-verify or that a native client exists. Closure gates and owners are in the [register](05_Open-GAP-and-Decision-Register.md).
