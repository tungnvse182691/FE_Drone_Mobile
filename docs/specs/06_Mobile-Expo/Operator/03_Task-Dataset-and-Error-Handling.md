# Operator task, dataset and error handling

## State handling

Server task status is authoritative (`NewAssigned`, `Accepted`, `InProgress`, `Submitted`, `SupplementRequired`, `Completed`, `Rejected`, `Cancelled`, `Postponed` where the command permits). The app renders unknown states safely and never advances a task locally.

| Failure | Client action | Do not do |
|---|---|---|
| 401 | Refresh once with rotation; retry only the original request if the session remains valid | Loop refresh or log tokens |
| 403 | Show assignment/role/scope denial and stop | Hide denial by enabling another task |
| 404 | Remove stale task from active queue after user-visible notice | Recreate a task |
| 409/412 | Refetch task/upload/dataset and show version conflict | Last-write-wins |
| 428 | Collect required K/version/header and retry same command | Generate a new task identity |
| 429/5xx/timeout | Backoff; keep exact command as `UNKNOWN` until reconciliation | Blind duplicate upload/submit |
| complete accepted but not VERIFIED | Poll API-234; allow retry only under current session/version | Submit dataset as verified |
| network loss | Resume protected upload/command queue when online | Claim offline Operator signed sync is implemented |

Dataset submission must prove current assignment, active device, matching project/route/version, verified video/SRT/GPS files and integrity. PM owns supplement/reassignment through API-231/232. Operator cannot change model version, candidate decision or Defect state.

**Evidence:** API-226–232, API-233–236, `SurveyV2PersistenceService` and Phase 2A workflow 05. Runtime Expo/Android tests are `NOT_VERIFIED_EXPO_E2E`; Backend API tests do not prove native capture.
