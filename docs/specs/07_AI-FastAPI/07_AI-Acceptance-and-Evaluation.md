# AI acceptance and evaluation

| Scenario | Evidence required | Current status |
|---|---|---|
| Backend creates job and emits pinned manifest/attempt | API-044 source + HTTP test | Source verified; HTTP/E2E NOT_RUN |
| AI accepts adopted manifest and returns job status | approved provider contract + deployed request | NOT_VERIFIED; local worker source only |
| Real video + SRT produces timestamped candidates | real files, released checkpoint, provenance | NOT_VERIFIED |
| Missing/corrupt video or SRT is classified | deterministic provider test | NOT_VERIFIED |
| Callback accepts valid result under AI identity | API-031 auth and DTO test | Backend source verified; external caller NOT_RUN |
| Late/replayed callback is fenced | attempt race/replay test | P1-02, NOT_VERIFIED |
| Candidate remains PM decision and Crew measurement | workflow/API authorization tests | source/workflow documented; E2E NOT_RUN |
| Model version/checksum and raw artifact remain traceable | database + object storage inspection | NOT_VERIFIED |

Static checks performed for this phase are documentation/source inspections only. No FastAPI process, real YOLO checkpoint, MinIO, TLS, deployment, Android/Web client, or cross-service E2E test was run. Model quality metrics are therefore not claimed. See Phase 2C API contracts and Phase 2B integration-boundary notes for Backend evidence.
