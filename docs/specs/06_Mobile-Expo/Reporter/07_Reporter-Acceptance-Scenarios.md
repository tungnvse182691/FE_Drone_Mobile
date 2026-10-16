# Reporter acceptance scenarios

These are acceptance scenarios for the Mobile team. They are a test plan, not execution evidence. All scenarios are `NOT_VERIFIED_EXPO_E2E` until run on a real Android/Expo build against an isolated backend and storage environment.

| ID | Scenario | Expected evidence |
|---|---|---|
| EX-01 | Register with valid/invalid email and password | API-010 DTO validation, intent response, no password in logs/storage |
| EX-02 | Verify OTP, resend cooldown, expiry and attempt limit | API-011/012 status/ProblemDetails; SMTP delivery separately recorded |
| EX-03 | Reporter Android login and role | API-002 returns Reporter bearer session; no Web cookie/CSRF; wrong role blocked |
| EX-04 | Access expiry and rotated refresh | API-003 single-flight refresh, atomic token replacement, replay once; revoked family returns to login |
| EX-05 | Logout and app restart | API-007 idempotent logout; secrets/cache cleanup follows policy |
| EX-06 | Camera/gallery permission and optional GPS | API-211 receives final JPEG/PNG/checksum; UNKNOWN GPS has no location; EXIF policy documented |
| EX-07 | Multipart upload happy path | API-211→214→raw PUT→213; part ETags and strong V preserved |
| EX-08 | URL expiry, timeout and process kill during upload | API-212 reconciliation resumes known parts; no duplicate command or leaked token |
| EX-09 | Verification pending/failed | API-208 polling stops on VERIFIED/FAILED; API-216 is disabled until VERIFIED |
| EX-10 | Create report and unknown response | API-216 creates one report/one unassigned Case; exact K replay returns same outcome |
| EX-11 | Own list/detail and privacy | API-215/217 render projection; another report/file gives privacy-safe 403/404 |
| EX-12 | Supplement with fresh evidence | API-219 succeeds with strong V; stale V gives 412 and user review |
| EX-13 | Published update/evidence | API-217 publicUpdates and API-210 authorized content only; no internal Case/Defect route |
| EX-14 | Offline/reconnect boundary | Online command queue marks unknown and reconciles; no claim of signed Crew offline support |
| EX-15 | Native security review | SecureStore/keychain, screenshots/logs, backup exclusion, uninstall/reinstall and local file/database encryption are inspected and recorded |

Backend unit/domain evidence in prior audits is not Android acceptance. Run HTTP/SQL tests only with isolated resources; record BE verified, mock verified and external/deployment evidence separately. Do not mark MinIO, SMTP, FCM, native crypto or Expo E2E PASS from static source.
