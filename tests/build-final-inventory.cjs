// Rebuild only the scoped, deduplicated inventory from Candidate3's actual method/path ledger.
// No network, credentials, SQL, mutations or FE source changes.
const fs=require('node:fs'),path=require('node:path');
const be=process.env.ROADFE_CANDIDATE_ROOT??'D:/Do_AN_Drone/RoadGuard-FE-Starter-Candidate3';
const ledger=fs.readFileSync(path.join(be,'docs/FE-OPERATION-ACCEPTANCE.md'),'utf8');
const operations=new Map([...ledger.matchAll(/^\| ((?:API|ADD)-\d+) \|[^|]+\| (GET|POST|PUT|DELETE|PATCH) `([^`]+)`/gm)].map(m=>[m[1],{id:m[1],method:m[2],path:m[3]}]));
if(operations.size!==260)throw Error('ledger inventory drift; re-pin source before rebuilding');
// Roles describe the effective actor/resource guard, not broad Swagger tags.
const common=`
002|Anonymous credentials|authApi.loginReal|auth/index|READ200_CURRENT|Android session issuance only; no business mutation proof
003|Refresh credential|client.refreshAccessToken|authenticated interceptors|NOT_RUN|contention/rotation on device
004|Authenticated current user|authApi.changePasswordReal|auth/force-change-password|NOT_RUN|disposable password fixture
005|Anonymous current credentials + operationId|authApi.forcedChangePasswordReal|auth/force-change-password|NOT_RUN|forced-password fixture
007|Authenticated current session|authApi.logoutReal|all role account/profile via auth store|NOT_RUN|server revocation proof
008|Anonymous request|authApi.requestPasswordRecoveryReal|reporter/account + auth recovery|NOT_RUN|202 request only; no reset-success claim
047|Authenticated current actor|authApi.fetchProfile|reporter/profile|NOT_RUN|live identity/readback fixture
`;
const crew=`
029|Crew own task file / Operator own uploaded file|crewApi.getCrewFileMetadata; droneApi.getOperatorFileMetadataReal dormant|Crew viewfinder/field-review + repair assessment; no mounted Drone caller|NOT_RUN|VERIFIED/checksum native storage proof
030|Authorized file owner/resource|NONE for Crew/Drone current journey|NONE|NOT_RUN|Drone video MIME contract gap; task evidence uses086
037|Crew assigned tasks|crewApi.listCrewInspectionTasksReal|crew/tasks/home/profile|READ200_CURRENT|pagination/refresh checked; native NOT_RUN
049|Crew active task/binding scope|crewApi.listCrewProjectsReal|crew/receiving-requests|READ200_CURRENT|project discovery not all memberships
078|Crew project task scope|crewApi.listProjectCrewTasksReal|NONE (unused wrapper)|NOT_RUN|do not equate wrapper with mounted workflow
080|Crew current assignment|crewApi.getFieldInspectionTaskDetailReal|wo-detail + FIELD/repair guards|READ200_CURRENT|strong task ETag; repairContext null on fixture
081|Crew current assignment + task state|crewApi.executeFieldCommand / acceptFieldTaskReal|wo-detail explicit accept|NOT_RUN|isolated FIELD command fixture
085|Crew task evidence scope|crewApi.getFieldEvidenceReal|FIELD review/evidence + repair claim via crewFieldDraft|NOT_RUN|genuine task evidence link and VERIFIED bytes
086|Crew task evidence scope|crewApi.downloadFieldEvidenceReal|FIELD review private preview|NOT_RUN|actual authenticated bytes/native media proof
087|Crew current assignment|crewApi.getFieldTaskGeometryReal|wo-detail/CrewTaskFacts|HTTP409_CURRENT|source_not_ready; positive segment-set fixture absent
088|Crew current assignment|crewApi.getFieldTaskHistoryReal|wo-detail/CrewTaskFacts|READ200_CURRENT|one assignment/six events; positive history only
091|Crew current assignment + task state|crewApi.executeFieldCommand / rejectFieldTaskReal|wo-detail explicit reject|NOT_RUN|isolated FIELD command fixture
093|Crew current assignment + task state|crewApi.executeFieldCommand / startFieldTaskReal|wo-detail explicit start|NOT_RUN|first-start origin/readback fixture
094|Crew current assignment|crewApi.getFieldTaskStartOriginReal|FIELD/repair guards and command readback|NOT_RUN|immutable first-start source absent
095|Crew current assignment + version|crewApi.submitFieldTaskReal|field-review via crewFieldDraft|NOT_RUN|VERIFIED evidence/measurement/location + isolated initial/supplement
096|Crew own submission/task|crewApi.getFieldSubmissionDetailReal|field-review + repair claim readback|NOT_RUN|real submission lineage fixture
113|Crew/PM scoped offline artifact|NONE admitted|NONE|NOT_RUN|BLOCKED_CRYPTO_CONTRACT KDF/AES-GCM handover
114|Crew/PM authorized recipient|crewOfflineWorkflow.readOfflineResource artifacts|NONE (unused generic branch)|NOT_RUN|authorized artifact/grant source
115|Crew/PM own imported batch|crewOfflineWorkflow.readOfflineResource batches|sync/CrewOfflinePanel explicit reconciliation|NEGATIVE_ONLY|positive signed batch fixture + native acceptance
116|Crew/PM own device|crewOfflineDevice.prepareDeviceEnrollment + dispatchOfflineIntent|NONE (button disabled)|NOT_RUN|BLOCKED_NATIVE; custody/restart + isolated assignment
117|Crew/PM own device|crewOfflineWorkflow.readOfflineResource devices|sync explicit received-device reconciliation|NEGATIVE_ONLY|registration/key/project fixture
118|Crew/PM own nonrevoked device|crewOfflineDevice.prepareDeviceRevocation + dispatchOfflineIntent|NONE (not enabled)|NOT_RUN|BLOCKED_NATIVE; received revoke + own GET confirmation implemented
120|Crew/PM authorized grant recipient|crewOfflineWorkflow.readOfflineResource grants|NONE (unused generic branch)|NOT_RUN|grant discovery/authorized source
122|Crew/PM authorized encrypted import|NONE admitted|NONE|NOT_RUN|BLOCKED_CRYPTO_CONTRACT
123|Crew/PM own origin admission|crewOfflineWorkflow.readOfflineResource origins|sync explicit recovery/reconciliation|NEGATIVE_ONLY|no invented server batchId; per-origin CAS LOGIC_TESTED
124|Crew/PM authorized package recipient|crewOfflineWorkflow.readOfflineResource packages|NONE (unused generic branch)|NOT_RUN|encrypted package/grant fixture
125|Crew/PM authorized encrypted export|NONE admitted|NONE|NOT_RUN|BLOCKED_CRYPTO_CONTRACT
127|Crew/PM own active assignment|crewOfflineDevice.prepareDeviceSnapshot + dispatchOfflineIntent|NONE (button disabled)|NOT_RUN|BLOCKED_NATIVE; genuine assignment/snapshot
128|Crew/PM own snapshot|crewOfflineWorkflow.readOfflineResource snapshots|sync explicit received-snapshot reconciliation|NEGATIVE_ONLY|own snapshot + source hash/version fixture
129|Crew/PM own exact single FIELD_START batch|crewSignedSync.prepareStartReconciliation + dispatchOfflineIntent|NONE for POST; sync received/unknown GET reconciliation|NOT_RUN|BLOCKED_NATIVE POST; known server batch115 + origin123 logic tested
130|Crew/PM signed direct sync|crewSignedSync.prepareSignedFieldBatch + dispatchOfflineIntent|NONE (button disabled)|NOT_RUN|BLOCKED_NATIVE + trusted producer unaccepted + dedicated fixture
135|Crew responsible recipient|crewReceivingWorkflow.listReceiving|receiving-requests|READ200_CURRENT|coverage restricted by discoverable project
136|Crew responsible recipient|crewReceivingWorkflow.readReceiving|receiving-requests explicit detail|READ200_CURRENT|own ETag verified; wrong recipient403; ACK mutation not authorized
137|Crew responsible recipient + current version|crewReceivingWorkflow.acknowledgeReceiving|receiving-requests explicit ACK|NOT_RUN|dedicated request/first ACK/readback fixture
146|Crew bound FastTrack item/policy|crewApi.getRepairEligibilityReal|NONE (FT controls blocked)|NOT_RUN|FT package/item/binding/itemVersion discovery; NORMAL not substitute
150|Crew current repair decision|crewSafetyWorkflow.safetyRequest (preparation denied)|NONE (disabled)|NOT_RUN|READBACK_GAP current decision/review request
152|Crew responsible safety actor|crewSafetyWorkflow.readSafetyMeasure|sync received-safety reconciliation not exposed; preparation guard only|NOT_RUN|measure/warning discovery gap; monitoring ETag
153|Crew responsible safety actor|crewSafetyWorkflow.safetyRequest checks (preparation denied)|NONE (disabled)|NOT_RUN|MEASUREMENT FieldInspectionEvidenceLink.Id source missing
154|Crew responsible safety actor|crewSafetyDraft installation journal/transport|NONE (disabled)|NOT_RUN|discovery + isolated fixture; acceptance false
155|Crew intended warning recipient|crewSafetyDraft acknowledgement journal/transport|NONE (disabled)|NOT_RUN|warning discovery + isolated fixture; acceptance false
156|Crew NORMAL binding + RepairItem version|crewApi.submitRepairAssessmentReal via crewRepairWorkflow|wo-detail explicit assessment|NOT_RUN|NORMAL repairContext null fixture; verified BEFORE/measurement
157|Crew NORMAL binding + finish/FIELD claim|crewApi.submitRepairAttemptReal via crewRepairWorkflow|complete explicit attempt|NOT_RUN|finish/submission/server hash lineage fixture
159|Crew PM-SUPPLEMENT repair binding|crewApi.supplementRepairAttemptReal dormant wrapper|NONE (correction UI blocked)|NOT_RUN|current PM review + intake/submission/version source
160|Crew NORMAL execution binding|crewApi.finishRepairExecutionReal via crewRepairWorkflow|complete explicit finish|NOT_RUN|genuine start receipt + immutable claim/readback fixture
161|Crew NORMAL READY assessment binding|crewApi.startRepairExecutionReal via crewRepairWorkflow|progress explicit start (no effect POST)|NOT_RUN|assessment receipt + first-start + itemVersion fixture
233|Crew/Operator own task upload|crewApi.createCrewUploadSession; droneApi.createOperatorUploadSessionReal|Crew viewfinder/field-review; Drone disabled|NOT_RUN|disposable private upload + Android MinIO proof
234|Crew/Operator own upload|crewApi.getCrewUploadSession; droneApi.getOperatorUploadSessionReal|Crew FIELD recovery; Drone log explicit read|NEGATIVE_ONLY|positive private upload fixture
235|Crew/Operator own upload + strong session version|crewApi.completeCrewUpload; droneApi.completeOperatorUploadReal|Crew FIELD; Drone disabled|NOT_RUN|complete is not VERIFIED
236|Crew/Operator own upload|crewApi.requestCrewUploadPartUrls; droneApi.getOperatorUploadPartUrlsReal|Crew FIELD; Drone disabled|NOT_RUN|stable signed URLs/private storage PUT; never rewrite URL
`;
const drone=`
025|Operator authorized dataset|droneApi.getOperatorDatasetCoverageReal|drone/log/DroneDatasetReadbackPanel|NEGATIVE_ONLY|401/404 only; positive dataset fixture
026|Operator authorized dataset|droneApi.getOperatorDatasetReal|drone/log/DroneDatasetReadbackPanel|NEGATIVE_ONLY|401/404 only; positive dataset fixture
038|Operator own assigned survey tasks|droneApi.listOperatorSurveyTasksReal|drone/home + requests|READ200_CURRENT|two actors/pages5+1; refresh/ownership checks
104|Operator assigned project/pins|droneApi.getOperatorGeometryPackageReal|drone/work-package|NOT_RUN|published geometry/source fixture
225|Operator current survey assignment|droneApi.getOperatorWorkPackageReal|work-package/request-detail/request-decline|NOT_RUN|pinned work-package fixture
226|Operator current survey assignment|droneApi.getOperatorSurveyTaskDetailReal|request-detail/request-decline/log/dataset readback|READ200_CURRENT|six own detail200; wrong Operator403
227|Operator current survey assignment|droneApi.acceptOperatorSurveyTaskReal dormant|NONE (disabled before transport)|NOT_RUN|FE immutable durable command/reconciliation missing
229|Operator assignment + active real aircraft|droneApi.submitOperatorDatasetReal dormant|NONE (disabled before transport)|NOT_RUN|device discovery + immutable dataset journal + fixture
230|Operator current survey assignment|droneApi.declineOperatorSurveyTaskReal dormant|NONE (disabled before transport)|NOT_RUN|FE immutable durable command/reconciliation missing
`;
const reporter=`
010|Anonymous registration|reporterApi.registerReporterReal|auth/register|NOT_RUN|memory-only immutable attempt; OTP fixture
011|Anonymous registration intent|reporterApi.resendReporterOtpReal|auth/otp-verify|NOT_RUN|server cooldown/immutable resend; Mailpit expiry/rate fixture
012|Anonymous registration intent + OTP|reporterApi.verifyReporterOtpReal|auth/otp-verify|NOT_RUN|OTP/error/session stale-result logic; Mailpit fixture
208|Reporter own private REPORT_PHOTO|uploads.httpUploadTransport.getFileMetadata|Reporter upload/report/supplement|NOT_RUN|VERIFIED/version/checksum and storage proof
209|Reporter own private VERIFIED file|NONE|NONE (private submitted evidence uses218)|NOT_RUN|no mounted queue-byte source
210|Reporter recipient report publication|reporterApi.downloadPublicationEvidenceReal|report-detail opt-in EvidencePreview|NEGATIVE_ONLY|anonymous401/authenticated absent404; positive/withdrawn/other-recipient/cache fixture
211|Reporter own private upload|uploads.httpUploadTransport.createSession|Reporter capture/upload/report/supplement|NOT_RUN|isolated upload; native URI/media/MinIO
212|Reporter own private upload|uploads.httpUploadTransport.getSession|Reporter queue recovery/poll|NOT_RUN|expiry/resume/restart fixture
213|Reporter own upload + strong session version|uploads.httpUploadTransport.completeUpload|Reporter queue/report/supplement|NOT_RUN|complete is not VERIFIED
214|Reporter own upload|uploads.httpUploadTransport.requestPartUrls|Reporter queue/report/supplement|NOT_RUN|private signed URLs/storage PUT/checksum
215|Reporter own reports|reporterApi.listMyReportsReal|Reporter home/track/profile|READ200_CURRENT|authorized list200; cursor count not total; cross-owner/refresh fixture
216|Reporter own VERIFIED files|reporterApi.submitReportReal via store/reporter|Reporter report|NOT_RUN|immutable draft + VERIFIED files +217 readback; disposable fixture
217|Reporter owning report|reporterApi.getOwnReportReal|report-detail/report-supplement + pending readback|NEGATIVE_ONLY|anonymous401/authenticated absent404; positive own/cross-owner/publication lineage fixture
218|Reporter owning report/evidence relation|reporterApi.downloadReportEvidenceReal|report-detail private evidence preview|NEGATIVE_ONLY|anonymous401/authenticated absent404; actual bytes/privacy/ownership fixture
219|Reporter owner + latest report ETag|reporterApi.submitReportSupplementReal via store/reporter|Reporter report-supplement|NOT_RUN|VERIFIED new files + stable payload/key +412 fixture
`;
const entries=[];
for(const [stream,rows] of Object.entries({common,crew,drone,reporter}))for(const line of rows.trim().split('\n')){
 const [n,role,wrapper,mounted,http,blocker]=line.split('|');const op=operations.get('API-'+n);if(!op)throw Error('missing API '+n);
 if(entries.some(x=>x.id===op.id))throw Error('duplicate API '+n);
 entries.push({...op,stream,role,wrapper,mounted,http,android:'NOT_RUN',nativeAdmission:'NOT_ACCEPTED',blocker});
}
// Shared upload/file rows assigned once to crew above; shared auth once to common.
for(const id of ['ADD-18','ADD-19']){const op=operations.get(id);entries.push({...op,stream:id==='ADD-19'?'infrastructure':'reporter-public-alternative',role:id==='ADD-19'?'Anonymous readiness':'Anonymous summary (not evidence210)',wrapper:'NONE',mounted:'NONE',http:id==='ADD-19'?'READ200_CURRENT':'NOT_RUN',android:'NOT_RUN',nativeAdmission:'NOT_APPLICABLE',blocker:id==='ADD-19'?'Not a Mobile business API':'genuine publicId/source mapping; separate from210'});}
entries.sort((a,b)=>a.id.localeCompare(b.id));
const result={sourceSha:'01cc4725b178199215b02f4ddf7093491a16f2f7',feBaseline:'1ed634640c23661e269c0c4c4c68253edd5da005',catalogSnapshot:241,pinnedOperations:260,scope:'All unique operations required by current three Mobile screen matrices plus scoped common/profile/project/file/public alternatives; not all Backend operations, not a completeness percentage. Includes missing/dormant capabilities explicitly.',entries};
fs.writeFileSync('docs/worklogs/FINAL-MOBILE-API-INVENTORY-2026-10-28.json',JSON.stringify(result,null,2)+'\n');
const rows=entries.map(x=>`| ${x.id} | ${x.method} \`${x.path}\` | ${x.role} | ${x.wrapper} | ${x.mounted} | ${x.http} | ${x.android} | ${x.blocker} |`);
fs.writeFileSync('docs/worklogs/FINAL-MOBILE-API-INVENTORY-2026-10-28.md',`# Final Mobile operation inventory\n\nSource: \`${result.sourceSha}\`; FE baseline \`${result.feBaseline}\`. Canonical241 is a historical Phase2C snapshot; pinned OpenAPI/ledger260 =241+19 additions, including /ready. Neither is a Mobile completion denominator.\n\nThis recomputation contains ${entries.filter(x=>x.id.startsWith('API-')).length} unique numbered Mobile requirement/surface operations plus ADD18 public alternative and ADD19 infrastructure. Common auth/file/upload are deduplicated. Missing and dormant APIs remain visible; do not call every row API_CONNECTED or HTTP_VERIFIED. Old54/79 figures used a different pre-1ed6346 surface and cannot measure this delivery. Source guards exclude PM151/158, Supervisor119/121/126/138 and projectwide PM reads.\n\nREAD200_CURRENT means only the bounded GET/login observation in this task, not mutation acceptance. NEGATIVE_ONLY means401/403/404 were observed, not a successful workflow. HTTP409_CURRENT is source_not_ready, not positive geometry. Other historical HTTP evidence is not promoted into this run. Every Android/native runtime acceptance is NOT_RUN/NOT_ACCEPTED; arm64+x86 debug BUILD_VERIFIED is recorded separately in FINAL-NATIVE. Raw MinIO PUT is transport, not a new canonical ID.\n\n| ID | Method/path | Effective BE actor/scope | FE wrapper | Mounted caller/reachability | HTTP current | Android | Gate / missing proof |\n|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n\nNo mounted callers are claimed for generic unused offline read branches or blocked Drone mutation wrappers. API078 wrapper exists but current inbox uses037. API030 video MIME issue stays open; private Crew evidence uses085/086 and Reporter uses218/210. ADD02/03/08/09/10 are not inferred to provide Crew discovery permission merely because routes exist; source-backed role-scoped fixture/discovery is required. API035 /me has an unused auth wrapper, not a current screen requirement.\n`);
console.log('Inventory: '+entries.filter(x=>x.id.startsWith('API-')).length+' unique canonical requirements; 2 explicitly separate additions');
