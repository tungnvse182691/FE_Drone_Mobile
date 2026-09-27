# RoadGuard — 3. API Specification (OpenAPI)

**Phiên bản:** TECH-R3-2026-09-26-v1 • **Trạng thái:** thiết kế đề xuất dựa trên bộ RoadGuard R3. Chưa có repository, ERD hiện hành, OpenAPI thực tế hoặc môi trường chạy để đối chiếu. Không khẳng định endpoint/code/transaction dưới đây đã được triển khai.

**Ưu tiên nguồn:** quyết định CHỐT/KẾ THỪA trong bộ tài liệu R3 giữ nguyên; chi tiết kỹ thuật mới cần P1/P2/FE/AI review. Q01–Q18 giữ mở theo Mô tả dự án §21. Không tự sửa enum số, chuyển DB, nâng framework hoặc đổi trạng thái Done từ các bản thiết kế này.

## 3.1 Đầu ra và phạm vi sử dụng

File máy đọc: [RoadGuard_OpenAPI_v1.yaml](openapi.yaml), OpenAPI **3.1.1**, version `0.1.0-draft`, base URL tương đối `/api/v1`. Đây là contract mục tiêu để review/codegen, không phải kết quả reverse-engineer code. Không có URL production hoặc secret trong file.

Các extension `x-fr`, `x-roles`, `x-permission-policy`, `x-readiness`, `x-open-decisions` giúp AI/QA truy vết. Chúng không phải cơ chế bảo mật tự động của OpenAPI generator; backend phải hiện thực policies. `PROPOSED_CONTRACT` nghĩa là hình dạng API đề xuất; `CONDITIONAL` nghĩa là một phần hành vi cần quyết định bổ sung.

**Cách dùng để sinh code:** đọc Auth/Permission và Error Handling → rà tên schema/enum hiện có → review operation/scope → khóa phiên bản YAML → sinh DTO/client → triển khai application service/authorization/transaction → chạy contract + negative tests. Không sinh CRUD trực tiếp từ database, không expose entity persistence toàn bộ.

## 3.2 Quy ước toàn cục

| Thành phần | Contract đề xuất |
|---|---|
| Media type | JSON `application/json`; tệp download `application/octet-stream`; không nhét base64 video vào JSON |
| Tên trường | camelCase; UUID dạng string; timestamp RFC3339 UTC có offset; ngày nghiệp vụ `YYYY-MM-DD` |
| Đơn vị | Có trường unit; tọa độ Point đặt tên longitude/latitude; GeoJSON array lon,lat; không đổi m/mm ngầm |
| Enum | Chuỗi API có ý nghĩa; phải map enum cũ qua adapter, không đổi giá trị số trong DB. status chưa khóa để string có mô tả, không tự sinh enum suy đoán |
| Null/absent | Required, nullable và optional khác nhau; không dùng 0/(0,0)/LOW thay dữ liệu chưa biết |
| Danh sách | `items`, `nextCursor`, `asOf`; limit 1–100, default25 là đề xuất contract. Cursor gắn scope/filter/version, không cho dùng cursor người khác |
| Phân quyền | Login + current role + membership/ownership + assignment + business state; xem phần 5 |
| Concurrency | `If-Match` cho mutation aggregate đã đọc; response `ETag` strong quoted opaque; thiếu 428, stale412 |
| Idempotency | `Idempotency-Key` cho command được YAML yêu cầu; scope actor+operation+target, hash payload; cùng key khác payload409 |
| Long-running | Commit job/manifest/outbox rồi trả202; poll trạng thái, không giữ HTTP chờ AI/export/verify video |
| Lỗi | `{code,message,details,traceId,retryable}`; không trả200 với error ở endpoint thông thường |
| Offline sync | Envelope hợp lệ200 và outcome từng operation; không biến 200 thành toàn bộ batch đã thành công |
| File | Tạo upload → part URLs → PUT bytes → complete202 → poll VERIFIED → liên kết evidence. Download gateway kiểm quyền mỗi request |

Nguồn định dạng OpenAPI: [OpenAPI Specification 3.1.1](https://spec.openapis.org/oas/v3.1.1.html), đã tra cứu 26/09/2026. Chọn 3.1.1 để có contract rõ; không tuyên bố đây là bản mới nhất. Kiểm generator/tooling của repo có hỗ trợ JSON Schema 2020-12 trước dùng `prefixItems`/union null.

## 3.3 Danh mục endpoint chính thức của bản draft

Bảng này được sinh từ cùng YAML: request/response là tên schema, `—` nghĩa không body; mã thành công cụ thể theo operation. Errors chi tiết và headers nằm YAML. Mọi endpoint vẫn phải đọc quy tắc business/permission liên quan, không suy quyền từ HTTP verb.

| Method/path | operationId | Input schema | Output / HTTP | Role | Policy | FR / điều kiện |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /auth/login` | login | LoginRequest | TokenPair / 200 | PUBLIC | auth.public | FR-01 |
| `POST /auth/refresh` | refreshTokens | RefreshRequest | TokenPair / 200 | PUBLIC | auth.refresh | FR-01 |
| `POST /auth/logout` | logout | — | — / 204 | SUPERVISOR, PM, OPERATOR, CREW, REPORTER | auth.self | FR-01 |
| `POST /auth/password-recovery-requests` | requestPasswordRecovery | ForgotPassword | — / 202 | PUBLIC | auth.public | FR-01 |
| `POST /auth/change-password` | changePassword | ChangePassword | — / 204 | SUPERVISOR, PM, OPERATOR, CREW, REPORTER | auth.self | FR-01 |
| `POST /auth/reporter-registrations` | registerReporter | RegisterReporter | RegistrationIntent / 202 | PUBLIC | auth.public | FR-03 |
| `POST /auth/reporter-registrations/verify` | verifyReporterOtp | VerifyOtp | TokenPair / 200 | PUBLIC | auth.intent | FR-03 |
| `POST /auth/reporter-registrations/resend` | resendReporterOtp | ResendOtp | RegistrationIntent / 202 | PUBLIC | auth.intent | FR-03 |
| `POST /invitations/accept` | acceptInvitation | AcceptInvitation | TokenPair / 200 | PUBLIC | auth.invitation | FR-02 |
| `POST /invitations` | createInvitation | InvitationRequest | Invitation / 201 | SUPERVISOR | admin.invite | FR-02 |
| `GET /me` | getMe | — | Actor / 200 | SUPERVISOR, PM, OPERATOR, CREW, REPORTER | auth.self | FR-01 |
| `PATCH /me` | updateMe | ProfileUpdate | Actor / 200 | SUPERVISOR, PM, OPERATOR, CREW, REPORTER | auth.self | FR-01 |
| `POST /users/{userId}/password-reset` | adminResetPassword | ResetPassword | — / 204 | SUPERVISOR | admin.accounts | FR-01, FR-36 |
| `PATCH /users/{userId}` | updateAccount | AccountUpdate | Actor / 200 | SUPERVISOR | admin.accounts | FR-36 |
| `GET /notifications` | listNotifications | — | NotificationPage / 200 | SUPERVISOR, PM, OPERATOR, CREW, REPORTER | notification.owner | FR-34 |
| `POST /notifications/{notificationId}/read` | readNotification | — | Notification / 200 | SUPERVISOR, PM, OPERATOR, CREW, REPORTER | notification.owner | FR-34 |
| `GET /projects` | listProjects | — | ProjectPage / 200 | SUPERVISOR, PM, OPERATOR, CREW | project.read | FR-01, FR-04 |
| `POST /projects` | createProject | ProjectCreate | Project / 201 | SUPERVISOR | project.create | FR-04 |
| `GET /projects/{projectId}` | getProject | — | Project / 200 | SUPERVISOR, PM, OPERATOR, CREW | project.read | FR-04 |
| `PATCH /projects/{projectId}` | updateProject | ProjectUpdate | Project / 200 | SUPERVISOR | project.manage | FR-04 |
| `POST /projects/{projectId}/close` | closeProject | Reason | Project / 200 | SUPERVISOR | project.manage | FR-04 |
| `POST /projects/{projectId}/memberships` | setMembership | MembershipRequest | Membership / 201 | SUPERVISOR | admin.membership | FR-01, FR-04 |
| `GET /projects/{projectId}/crews` | listCrews | — | CrewPage / 200 | SUPERVISOR, PM | project.read | FR-20 |
| `POST /projects/{projectId}/crews` | createCrew | CrewCreate | Crew / 201 | SUPERVISOR | admin.membership | FR-20 |
| `POST /projects/{projectId}/route-drafts` | createRouteDraft | RouteDraftRequest | RouteVersion / 201 | PM | route.edit | FR-05, FR-06; Q13 |
| `GET /route-versions/{routeVersionId}` | getRouteVersion | — | RouteVersion / 200 | SUPERVISOR, PM, OPERATOR, CREW | project.resource.read | FR-05, FR-06 |
| `PUT /route-versions/{routeVersionId}/draft` | updateRouteDraft | RouteDraftRequest | RouteVersion / 200 | PM | route.edit | FR-06; Q13 |
| `POST /route-versions/{routeVersionId}/confirm` | confirmRoute | — | RouteVersion / 200 | SUPERVISOR | route.confirm | FR-07 |
| `POST /projects/{projectId}/segment-set-previews` | previewSegmentSet | SegmentRequest | SegmentSet / 201 | PM | route.edit | FR-08 |
| `POST /segment-sets/{segmentSetId}/publish` | publishSegmentSet | — | SegmentSet / 200 | PM | route.publishSegments | FR-08 |
| `POST /projects/{projectId}/branches` | createBranch | BranchRequest | Branch / 201 | PM | route.edit | FR-09; Q18 |
| `POST /projects/{projectId}/slabs` | createSlab | SlabRequest | Slab / 201 | PM | route.edit | FR-10; Q10,Q18 |
| `POST /reports` | createReport | ReportCreate | IncidentReport / 201 | REPORTER | report.owner | FR-11 |
| `GET /reports` | listOwnReports | — | PublicReportPage / 200 | REPORTER | report.owner | FR-11 |
| `GET /reports/{reportId}` | getOwnReport | — | PublicReport / 200 | REPORTER | report.owner | FR-25 |
| `POST /reports/{reportId}/supplements` | supplementReport | ReportCreate | IncidentReport / 200 | REPORTER | report.owner | FR-11 |
| `GET /projects/{projectId}/cases` | listCases | — | CasePage / 200 | SUPERVISOR, PM | case.read | FR-13 |
| `GET /cases/{caseId}` | getCase | — | Case / 200 | SUPERVISOR, PM | case.read | FR-13 |
| `POST /cases/{caseId}/triage` | triageCase | TriageCase | Case / 200 | SUPERVISOR, PM | case.triage | FR-13 |
| `POST /cases/{caseId}/report-links` | linkReports | LinkReports | Case / 200 | PM | case.decide | FR-12; Q09 |
| `POST /cases/{caseId}/conclusion` | concludeCase | CaseConclusion | Case / 200 | PM | case.decide | FR-13 |
| `POST /cases/{caseId}/publish` | publishCase | PublishCase | Case / 200 | PM | case.publish | FR-25 |
| `POST /cases/{caseId}/close` | closeMixedCase | Reason | Case / 200 | SUPERVISOR | case.closeMixed | FR-23 |
| `GET /projects/{projectId}/defects` | listDefects | — | DefectPage / 200 | SUPERVISOR, PM, OPERATOR, CREW | defect.read | FR-10, FR-13 |
| `GET /defects/{defectId}` | getDefect | — | Defect / 200 | SUPERVISOR, PM, OPERATOR, CREW | defect.read | FR-13 |
| `POST /defects/{defectId}/assessments` | assessDefect | DefectAssessment | Defect / 200 | PM | defect.decide | FR-14 |
| `POST /defects/{defectId}/verification` | verifyDefect | VerifyDefect | Defect / 200 | PM | defect.decide | FR-13 |
| `POST /defects/{defectId}/recurrence-assessments` | assessRecurrence | RecurrenceAssessment | Defect / 200 | PM | defect.decide | FR-24 |
| `PUT /projects/{projectId}/work-order` | setWorkOrder | OrderRequest | WorkOrder / 200 | PM | plan.decide | FR-14 |
| `POST /projects/{projectId}/policy-versions` | createPolicyVersion | PolicyRequest | PolicyVersion / 201 | PM | policy.create | FR-15 |
| `GET /policy-versions/{policyVersionId}` | getPolicyVersion | — | PolicyVersion / 200 | SUPERVISOR, PM, OPERATOR, CREW | policy.read | FR-15 |
| `POST /policy-versions/{policyVersionId}/activate` | activatePolicyVersion | — | PolicyVersion / 200 | PM | policy.activate | FR-15; Q02,Q03 |
| `POST /projects/{projectId}/inspection-tasks` | createInspectionTask | InspectionTaskCreate | InspectionTask / 201 | PM | inspection.assign | FR-17, FR-18, FR-20 |
| `POST /projects/{projectId}/inspection-batches` | createInspectionBatch | InspectionBatchCreate | InspectionBatch / 201 | PM | inspection.assign | FR-16 |
| `GET /inspection-tasks/{taskId}` | getInspectionTask | — | InspectionTask / 200 | CREW, SUPERVISOR, PM | inspection.read | FR-17, FR-22 |
| `POST /inspection-tasks/{taskId}/accept` | acceptInspectionTask | — | InspectionTask / 200 | CREW | inspection.assigned | FR-17 |
| `POST /inspection-tasks/{taskId}/decline` | declineInspectionTask | Reason | InspectionTask / 200 | CREW | inspection.assigned | FR-17 |
| `POST /inspection-tasks/{taskId}/sessions` | submitInspection | InspectionSubmit | InspectionSession / 201 | CREW | inspection.assigned | FR-17 |
| `POST /inspection-tasks/{taskId}/evaluations` | evaluateFastTrack | EvaluationRequest | Evaluation / 201 | CREW | inspection.assigned | FR-18 |
| `POST /projects/{projectId}/repair-packages` | createRepairPackage | PackageCreate | RepairPackage / 201 | PM | repair.plan | FR-19 |
| `POST /repair-packages/{packageId}/submit` | submitRepairPackage | — | RepairPackage / 200 | PM | repair.plan | FR-19 |
| `POST /repair-items/{itemId}/decisions` | decideRepairItem | ItemDecision | RepairItem / 200 | SUPERVISOR | repair.approve | FR-19 |
| `POST /repair-items/{itemId}/assignments` | assignRepairItem | RepairAssign | RepairItem / 201 | PM | repair.assign | FR-20 |
| `POST /repair-items/{itemId}/reassignments` | reassignRepairItem | Reassignment | RepairItem / 200 | PM | repair.assign | FR-20; Q04 |
| `POST /repair-attempts` | startRepairAttempt | StartAttempt | RepairAttempt / 201 | CREW | repair.assigned | FR-18, FR-21 |
| `POST /repair-attempts/{attemptId}/submit` | submitRepairAttempt | SubmitAttempt | RepairAttempt / 200 | CREW | repair.assigned | FR-21 |
| `POST /repair-attempts/{attemptId}/review` | reviewRepairAttempt | ReviewAttempt | RepairAttempt / 200 | PM | repair.pmReview | FR-23 |
| `POST /repair-attempts/{attemptId}/acceptance` | acceptApprovalAttempt | ReviewAttempt | RepairAttempt / 200 | SUPERVISOR | repair.supervisorAccept | FR-23 |
| `POST /projects/{projectId}/emergency-tasks` | createEmergencyTask | EmergencyCreate | RepairItem / 201 | PM | emergency.activate | FR-37; Q18 |
| `POST /projects/{projectId}/survey-tasks` | createSurveyTask | SurveyCreate | SurveyTask / 201 | PM | survey.assign | FR-26 |
| `GET /survey-tasks/{taskId}` | getSurveyTask | — | SurveyTask / 200 | OPERATOR, SUPERVISOR, PM | survey.read | FR-26 |
| `POST /survey-tasks/{taskId}/accept` | acceptSurveyTask | — | SurveyTask / 200 | OPERATOR | survey.assigned | FR-26 |
| `POST /survey-tasks/{taskId}/decline` | declineSurveyTask | Reason | SurveyTask / 200 | OPERATOR | survey.assigned | FR-26 |
| `POST /survey-tasks/{taskId}/cancel` | cancelSurveyTask | Reason | SurveyTask / 200 | PM | survey.assign | FR-26 |
| `POST /survey-tasks/{taskId}/reassign` | reassignSurveyTask | SurveyReassign | SurveyTask / 200 | PM | survey.assign | FR-26 |
| `POST /survey-tasks/{taskId}/supplements` | requestSurveySupplement | SupplementRequest | SurveyTask / 201 | PM | survey.assign | FR-26 |
| `PUT /survey-tasks/{taskId}/access-point` | setSurveyAccessPoint | AccessPointUpdate | SurveyTask / 200 | PM | survey.assign | FR-32; Q12 |
| `POST /survey-tasks/{taskId}/datasets` | submitDataset | DatasetSubmit | Dataset / 201 | OPERATOR | survey.assigned | FR-27 |
| `GET /datasets/{datasetId}/coverage` | getDatasetCoverage | — | CoverageResultPage / 200 | OPERATOR, SUPERVISOR, PM | survey.read | FR-28 |
| `POST /projects/{projectId}/baselines` | confirmBaseline | BaselineConfirm | Ack / 201 | PM | survey.baseline | FR-30; Q11 |
| `POST /projects/{projectId}/mission-exports` | exportMission | MissionExport | Job / 202 | PM | survey.assign | FR-33; Q14,Q18 |
| `POST /uploads` | createUploadSession | UploadCreate | UploadSession / 201 | SUPERVISOR, PM, OPERATOR, CREW, REPORTER | file.writeScope | FR-21, FR-27 |
| `POST /uploads/{uploadId}/part-urls` | getUploadPartUrls | UploadPartsRequest | UploadPartUrls / 200 | SUPERVISOR, PM, OPERATOR, CREW, REPORTER | file.uploadOwner | FR-22, FR-27 |
| `POST /uploads/{uploadId}/complete` | completeUpload | UploadComplete | UploadSession / 202 | SUPERVISOR, PM, OPERATOR, CREW, REPORTER | file.uploadOwner | FR-21, FR-27 |
| `GET /uploads/{uploadId}` | getUploadSession | — | UploadSession / 200 | SUPERVISOR, PM, OPERATOR, CREW, REPORTER | file.uploadOwner | FR-22, FR-27 |
| `GET /files/{fileId}` | getFileMetadata | — | FileMetadata / 200 | SUPERVISOR, PM, OPERATOR, CREW, REPORTER | file.readScope | FR-21, FR-35 |
| `GET /files/{fileId}/content` | downloadFile | — | binary / 200 | SUPERVISOR, PM, OPERATOR, CREW, REPORTER | file.readScope | FR-01, FR-35 |
| `POST /sync/batches` | syncOperations | SyncBatch | SyncResult / 200 | CREW, OPERATOR | sync.actorScope | FR-22 |
| `POST /processing-jobs` | createProcessingJob | ProcessingCreate | Job / 202 | SUPERVISOR, PM | ai.createJob | FR-29 |
| `GET /processing-jobs/{jobId}` | getProcessingJob | — | Job / 200 | SUPERVISOR, PM, OPERATOR | ai.readJob | FR-29 |
| `POST /processing-jobs/{jobId}/retry` | retryProcessingJob | Reason | Job / 202 | SUPERVISOR, PM | ai.retry | FR-29 |
| `POST /internal/processing-jobs/{jobId}/results` | receiveAiResult | AiResult | Job / 200 | AI_SERVICE | ai.callback | FR-29 |
| `POST /projects/{projectId}/validation-runs` | createValidationRun | ValidationRunCreate | Job / 202 | PM | ai.validation | FR-31 |
| `GET /validation-runs/{runId}` | getValidationResult | — | ValidationResult / 200 | SUPERVISOR, PM | ai.validationRead | FR-31 |
| `POST /labels/{labelId}/review` | reviewTrainingLabel | LabelReview | Ack / 200 | PM | ai.labelReview | FR-36; GAP-01 |
| `GET /projects/{projectId}/dashboard` | getDashboard | — | Dashboard / 200 | SUPERVISOR, PM | analytics.read | FR-34 |
| `GET /projects/{projectId}/timeline` | getProjectTimeline | — | EventPage / 200 | SUPERVISOR, PM | analytics.read | FR-34 |
| `POST /exports` | createExport | ExportRequest | Job / 202 | SUPERVISOR, PM | export.create | FR-35 |
| `GET /exports/{exportId}` | getExport | — | Job / 200 | SUPERVISOR, PM | export.read | FR-35 |
| `GET /audit-events` | listAuditEvents | — | EventPage / 200 | SUPERVISOR | admin.audit | FR-36 |
| `POST /model-versions` | createModelVersion | ModelCreate | ModelVersion / 201 | SUPERVISOR | admin.model | FR-36 |
| `POST /model-versions/{modelVersionId}/activate` | activateModelVersion | Reason | ModelVersion / 200 | SUPERVISOR | admin.model | FR-36 |
| `POST /model-versions/{modelVersionId}/retire` | retireModelVersion | Reason | ModelVersion / 200 | SUPERVISOR | admin.model | FR-36 |
| `POST /devices` | createDevice | DeviceCreate | Device / 201 | SUPERVISOR | admin.devices | FR-36 |
| `GET /catalog/defect-types` | listDefectTypes | — | CatalogEntryPage / 200 | SUPERVISOR, PM, OPERATOR, CREW | catalog.read | FR-36 |
| `PUT /catalog/defect-types/{code}` | updateDefectType | CatalogEntryUpdate | CatalogEntry / 200 | SUPERVISOR | admin.catalog | FR-36 |
| `GET /reminder-configuration` | getReminderConfig | — | ReminderConfig / 200 | SUPERVISOR | admin.config | FR-36 |
| `PUT /reminder-configuration` | setReminderConfig | ReminderConfigUpdate | ReminderConfig / 200 | SUPERVISOR | admin.config | FR-36 |
| `POST /retention/deletion-requests` | requestDeletion | DeletionRequest | RetentionRequest / 201 | PM | retention.request | FR-35 |
| `POST /retention/deletion-requests/{requestId}/decision` | decideDeletion | RetentionDecision | RetentionRequest / 200 | SUPERVISOR | retention.approve | FR-35 |
| `PUT /projects/{projectId}/legal-hold` | setLegalHold | LegalHoldRequest | Project / 200 | SUPERVISOR | retention.hold | FR-35 |
| `GET /me/inspection-tasks` | listMyInspectionTasks | — | InspectionTaskPage / 200 | CREW | inspection.assigned | FR-17, FR-22 |
| `GET /me/repair-items` | listMyRepairItems | — | RepairItemPage / 200 | CREW | repair.assigned | FR-20 |
| `GET /me/survey-tasks` | listMySurveyTasks | — | SurveyTaskPage / 200 | OPERATOR | survey.assigned | FR-26 |
| `GET /inspection-tasks/{taskId}/snapshot` | getInspectionSnapshot | — | TaskSnapshot / 200 | CREW | inspection.assigned | FR-15, FR-18, FR-22 |
| `POST /projects/{projectId}/defects` | createPreliminaryDefect | DefectCreate | Defect / 201 | PM | defect.decide | FR-13 |
| `PUT /defects/{defectId}/slab-links` | setDefectSlabLinks | SlabLinks | Defect / 200 | PM | defect.decide | FR-10; Q10 |
| `POST /projects/{projectId}/survey-plans` | createSurveyPlan | PlanCreate | SurveyPlan / 201 | PM | survey.assign | FR-26, FR-30 |
| `POST /survey-plans/{planId}/postpone` | postponeSurveyPlan | Reason | SurveyPlan / 200 | PM | survey.assign | FR-26 |
| `POST /training-exports` | exportApprovedLabels | TrainingExportRequest | Job / 202 | SUPERVISOR | admin.model | FR-36; GAP-01 |
| `GET /admin/processing-jobs` | listAdminJobs | — | JobPage / 200 | SUPERVISOR | admin.operations | FR-36 |
| `GET /users/{userId}` | getAccount | — | Actor / 200 | SUPERVISOR | admin.accounts | FR-36 |
| `GET /projects/{projectId}/work-order` | getWorkOrder | — | WorkOrder / 200 | PM | plan.decide | FR-14 |
| `GET /jobs/{jobId}` | getAsyncJob | — | Job / 200 | SUPERVISOR, PM, OPERATOR | ai.readJob | FR-29, FR-31, FR-33, FR-35, FR-36 |
| `GET /repair-items/{itemId}` | getRepairItem | — | RepairItem / 200 | SUPERVISOR, PM, CREW | repair.read | FR-20, FR-23 |
| `GET /repair-attempts/{attemptId}` | getRepairAttempt | — | RepairAttempt / 200 | SUPERVISOR, PM, CREW | repair.read | FR-21, FR-23 |
| `GET /repair-packages/{packageId}` | getRepairPackage | — | RepairPackage / 200 | SUPERVISOR, PM | repair.read | FR-19 |
| `GET /segment-sets/{segmentSetId}` | getSegmentSet | — | SegmentSet / 200 | SUPERVISOR, PM, OPERATOR, CREW | project.resource.read | FR-08 |
| `GET /retention/deletion-requests/{requestId}` | getDeletionRequest | — | RetentionRequest / 200 | SUPERVISOR, PM | retention.read | FR-35 |
| `GET /model-versions/{modelVersionId}` | getModelVersion | — | ModelVersion / 200 | SUPERVISOR | admin.model | FR-36 |
| `GET /notifications/{notificationId}` | getNotification | — | Notification / 200 | SUPERVISOR, PM, OPERATOR, CREW, REPORTER | notification.owner | FR-34 |
| `POST /repair-items/{itemId}/revisions` | reviseRepairItem | ProposalRevision | RepairItem / 201 | PM | repair.plan | FR-19 |
| `POST /repair-attempts/{attemptId}/rework-attempts` | startReworkAttempt | ReworkCreate | RepairAttempt / 201 | CREW | repair.assigned | FR-24 |

## 3.4 Invariant cross-field và cross-resource

JSON Schema kiểm shape/type/basic range; application service/DB kiểm nghiệp vụ dưới đây trong transaction thích hợp. Không coi request vượt schema là đã có quyền.

1. Mọi ID trong command cùng project/context/version hợp lệ; FK tồn tại chưa đủ. Reporter không tự chọn role/project membership/ownerId. PM không cập nhật tài khoản Supervisor qua project API.
2. INSPECT_AND_REPAIR phải có policy áp dụng, một lỗi nhỏ nằm phạm vi được giao, PM block=false, đủ phép đo/BEFORE; batch nhiều lỗi luôn MEASURE_ONLY. `Evaluation.ELIGIBLE` không ghi đè task mode hoặc assignment.
3. Item APPROVAL_TRACK phải có Defect VERIFIED, evidence và decision APPROVE trước giao thi công. Fast Track không buộc PM VERIFIED/duyệt từng số đo trước sửa.
4. `ReviewAttempt.ACCEPT` bởi PM: Fast Track đóng theo thẩm quyền + outbox thông báo; APPROVAL_TRACK chỉ ghi PM kiểm đạt, chưa phải nghiệm thu Supervisor. Payload `RepairAttempt.status` là trạng thái aggregate attempt, **không suy ra item/case đã đóng**; đọc acceptanceStatus/branch. Endpoint acceptance Supervisor từ chối dùng cho FT.
5. Thiếu BEFORE trước sửa chặn app bắt đầu; nếu thực tế đã sửa rồi mất BEFORE thì giữ ngoại lệ Q06, không upload AFTER rồi gắn BEFORE để qua validate. AFTER chưa VERIFIED thì submit chính thức chưa thành công.
6. REJECT proposal giữ Defect mở; công bố toàn case cần điều kiện nền Case Verified + phần bắt buộc đạt + PM chọn ảnh. Không hỗ trợ partial publication/reopen khi Q07/08 chưa chốt.
7. Vị trí SRT, quality và coverage là ba trạng thái riêng; baseline chỉ cặp segment/band đủ điều kiện. No detections không tự NO_DEFECT hoặc đủ coverage.
8. Job/result phải khớp dataset/manifest/model/config/scope; old attempt không thay kết quả current. Callback service chỉ được đúng job/attempt, không quyền ghi Defect chính thức.
9. `periodFrom < periodTo`, `endMeters > startMeters`, ranh segment không hở/chồng; bề rộng phải dương; SRID nguồn/metric có căn cứ. GeoJSON luôn WGS84, không đổi nhãn để giả transform.
10. Hold kiểm tại lúc đề nghị/duyệt và ngay trước xóa. Duyệt xóa không đồng nghĩa object đã xóa; job lỗi giữ trạng thái/audit và retry có kiểm.

## 3.5 Idempotency, concurrency và transaction contract

Mỗi command nhận key có record gồm actor/scope, route+method+target, payload hash, status và response/resource reference. Kiểm quyền hiện tại trước trả response lưu, tránh replay lộ dữ liệu sau thu hồi. Cùng key/hash trả cùng kết quả; khác hash409 `IDEMPOTENCY_KEY_REUSED`; đang chạy trả409 `OPERATION_IN_PROGRESS` và retryAfter khi biết. Side effect nghiệp vụ, idempotency result và outbox phải commit cùng DB transaction.

Nếu cần lưu kết quả chứa access token, tránh lưu token thô trong idempotency log. Các flow OTP/accept invitation xử lý intent one-use và response replay có bảo vệ riêng; không cho key khác kích hoạt account lần nữa. Refresh không dựa cache idempotency mà rotate token family có kiểm concurrency; client serialize refresh.

Mutation `If-Match` cần GET hoặc response trước đó để lấy version. Bản draft có GET lấy version của aggregate plan/config/item/attempt/account; client lấy ETag trước mutation. Trong sync, `expectedVersion`/snapshot theo từng operation thay header batch. Transaction từng operation: kết quả APPLIED/DUPLICATE được ACK riêng; conflict không xóa local bytes. Không tự áp thứ tự last-write-wins.

Không giữ DB transaction trong lúc gọi AI/email/object storage. Outbox/worker xử lý các side effect; object upload là staging ngoài transaction, chỉ finalize metadata sau integrity. Xem sequence SQ-01–06.

## 3.6 Ví dụ request/response quan trọng

Ví dụ payload theo YAML, ID giả chỉ dùng test. Giá trị policy/type vẫn phải lấy cấu hình dự án thật.

```http
POST /api/v1/projects/00000000-0000-4000-8000-000000000001/inspection-batches
Authorization: Bearer <access-token>
Idempotency-Key: test-batch-001
Content-Type: application/json

{"defectIds":["00000000-0000-4000-8000-000000000011","00000000-0000-4000-8000-000000000012"],"crewId":"00000000-0000-4000-8000-000000000020"}
```

```json
{"id":"00000000-0000-4000-8000-000000000030","taskIds":["00000000-0000-4000-8000-000000000031"],"mode":"MEASURE_ONLY","version":"opaque-v1"}
```

```http
POST /api/v1/repair-attempts/00000000-0000-4000-8000-000000000040/review
Authorization: Bearer <pm-access-token>
If-Match: "opaque-v2"
Idempotency-Key: test-ft-review-001
Content-Type: application/json

{"decision":"ACCEPT"}
```

Với FT đủ điều kiện, response200 + attempt ACCEPTED; transaction có review/đóng lỗi/audit/outbox báo Supervisor. Không trả một approval request cho Supervisor. Với APPROVAL_TRACK, PM review trả PM_CHECKED chờ Supervisor; chỉ endpoint acceptance hợp lệ chuyển ACCEPTED. Cần map trạng thái này vào enum hiện có khi triển khai, xem TECH-GAP-02.

## 3.7 Các giới hạn phải đóng trước contract freeze

| Gap | Phần còn phải đối chiếu/hoàn thiện | Không được tự làm |
|---|---|---|
| TECH-GAP-01 | Enum/status/catalog ReporterType/severity/band so với DD và code; field lengths, MIME/size/precision, pagination/filter từng màn hình | Không hard-code enum DB từ enum YAML hoặc gọi string chưa khóa là đủ schema production |
| TECH-GAP-02 | Map lifecycle attempt/item/case vào DB hiện có; PM_CHECKED trong YAML tách khỏi ACCEPTED; rework/revision đã có endpoint | Không dùng một status ACCEPTED để đóng cả case; bản YAML đã tách item acceptance nhưng cần state machine cuối |
| TECH-GAP-03 | Q01/02/03/04/05/06/07/08/10/11/12/13/14/17/18 và nguồn assignment offline | Không activate conditional endpoint trước quyết định; không thêm gate Supervisor cho FT |
| TECH-GAP-04 | Subflows ít ưu tiên: sửa/gộp/tách segment thủ công, undo merge, sửa đội trưởng, reassignment inspection, risk comparison filters, rule version admin, RouteCapture Sprint2, orthomosaic UI | Tạo endpoint/schema bổ sung khi scope được giao; không tuyên bố 133 operations phủ mọi nhánh của 134 mã UC |
| TECH-GAP-05 | Thực thi retention job/export/task trạng thái terminal và support job poll cho loại job ngoài processing | YAML đã có Job.jobType và GET /jobs/{jobId}; cần hiện thực registry/policy theo loại, không poll sai route |
| TECH-GAP-06 | Cấp service token, object upload worker nội bộ, snapshot media/map cache, token storage/Web architecture | Không dùng user token cho AI; không biến TanStack cache thành durable outbox |

Bản này là thiết kế endpoint cho toàn nhóm FR và chi tiết hơn cho luồng trọng tâm. Mỗi module phải đóng gap tương ứng trước dùng để sinh code hoàn chỉnh. Ghi CR-018 và RTM khi thêm/sửa, không chỉnh các file nguồn cũ trong gói bổ sung này.

## REVIEW-01 — auth response amendment

Contract0.1.1-draft-review1 bổ sung401 cho login/refresh, phân mã theo Error Handling §8.7. Các response thành công và union sync hiện hành giữ nguyên. Chỉ TOKEN_EXPIRED cho phép nhánh refresh một lần; proposal evaluation nằm ở06_Sync_Evaluation_Amendment_Proposal.md, chưa enabled. Canonical/snapshot được hash-gate trước validate/codegen.
