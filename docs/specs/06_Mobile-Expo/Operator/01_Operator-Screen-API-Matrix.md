# Operator screen/API matrix

Actor: `DRONE_OPERATOR`; client: React Native + Expo; transport: bearer token. PM creates and assigns survey work on Web. Operator can read and act only on a current assignment, task, device and pinned project scope.

| Screen | Reads | Commands | DTO/headers/state | Status/evidence |
|---|---|---|---|---|
| O-01 Session | none | API-002 login; API-003 refresh; API-007 logout | Bearer access token; refresh token in OS secure storage | `CURRENT_IMPLEMENTED_BE`, `PROPOSED_EXPO`, `NOT_VERIFIED_EXPO_E2E` |
| O-02 Work list | API-038 `GET /api/v1/me/survey-tasks` (`cursor`, `limit`); API-226 task detail | None | `SurveyTaskPageV2ResponseDto`; current Operator and project scope; loading/empty/retry | `CURRENT_IMPLEMENTED_BE`; source `SurveyV2Controller.ListMyTasks` / `SurveyV2Service.ListMyTasksAsync` |
| O-03 Task detail/accept | API-226 | API-227 `POST /api/v1/survey-tasks/{taskId}/accept`, K/version as DTO requires | 401/403/404/409/412 must preserve task version and refetch | `CURRENT_IMPLEMENTED_BE`; `PROPOSED_EXPO` |
| O-04 Decline/supplement | API-226 | API-230 decline (K + If-Match, `SurveyTaskReasonV2RequestDto`) | PM owns API-232 supplement; Operator reads the returned/assigned supplement task; no reassignment | `CURRENT_IMPLEMENTED_BE`; `TARGET_CONFIRMED` |
| O-05 Work package | API-225, API-104 geometry package | None | Display pinned geometry/segment scope and upload purpose; no projectwide map grant | `CURRENT_IMPLEMENTED_BE`; `PROPOSED_EXPO` |
| O-06 Capture/upload | API-234 upload status; API-029 file metadata | API-233 create, API-236 part URLs, API-235 complete; raw storage PUT | `SURVEY_VIDEO`/`TELEMETRY` current task; file URI/size/checksum/ETag; complete is not VERIFIED | `CURRENT_IMPLEMENTED_BE`; `NOT_VERIFIED_EXPO_E2E` |
| O-07 Dataset submit | API-226 task; API-026 dataset read; API-025 coverage after submission | API-229 `POST /api/v1/survey-tasks/{taskId}/datasets` (K + If-Match, `SubmitDatasetRequestDto`) | Verified files, active device, route/version pins and optional video/telemetry pairs; missing telemetry is not coverage PASS | `CURRENT_IMPLEMENTED_BE`; `PROPOSED_EXPO` |
| O-08 History/recovery | API-226 task; API-234 upload status | Replay original command only with exact K/payload after unknown outcome | PM handles API-231 reassignment; Operator cannot call it. 401 relogin; 403 stop; 409/412 refetch and reconcile | `CURRENT_IMPLEMENTED_BE`; `NOT_VERIFIED_EXPO_E2E` |

Operator must never call PM geometry mutation, processing decision, candidate/Defect decision, repair approval, Crew execution or offline grant commands. DJI SDK, automatic flight ingestion and real GPS capture are `NOT_VERIFIED_EXPO_E2E`; the app may accept user-selected files while preserving declared provenance.
