# Operator focused map checkpoint — 2026-11-14

Mode: Codex IMPLEMENT_AND_SELF_REVIEW (not independent review).
FE base: `9ee98979ed1c59fafd7c8fa1013adb75f1cc1632` on main.
BE contract pin: `85879fe9082774cf5098a9ba281f56b9c651f8ea`, `deploy/fe-handoff/TASK-MAP-WGS84.md`.
Environment: local API port 18181, Docker `roadguard-crew-sandbox-api:crew-85879fe`; Android emulator-5554 / Expo Go / Metro 8082.

## Scope

- Extract existing scoped API-225/API-104 reads into useOperatorWorkPackage.
- Replace embedded Operator work-package map with a button opening `/(drone)/survey-map`.
- Dedicated MapLibre canvas, assigned segment selector, access-point focus, back and refresh. Hide bottom dock only on this route; retain mounted Stack.
- Preserve actor/session checks, cache notices, pinned geometry source validation and longitude-first coordinates. No BE source, packages, native configuration or mutation contracts changed.

## Executed verification

- LOGIC_TESTED: `node --test tests/operator-map.test.cjs tests/operator-navigation-ime.test.cjs tests/wave1-drone.test.cjs`: 52 pass, zero failures.
- LOGIC_TESTED: `node --test tests/*.test.cjs`: 1608 pass, zero failures/cancellations. Local output `.cache/map-screen-regression-final.log` (not committed).
- `npx tsc --noEmit`: exit 0; repeated before delivery.
- `git diff --check`: exit 0. Icon and financial UI scans returned no matches.
- HTTP_VERIFIED: PM created isolated survey-task marker fixtures through existing POST `/api/v1/projects/{projectId}/survey-tasks` (201); Operator API-225 and pinned API-104 reads returned 200. Durable local journal `.cache/map-vietnam-points-journal.json` written before POST; all recorded outcomes read back.
- Cần Giờ task `adca9ee1-b02a-4132-99ee-d2a96ffc19cf`, point `[106.89,10.52]`, from https://www.unesco.org/en/mab/can-gio-mangrove . Additional marker fixtures Hội An `24fa45f1-7941-47ef-94ec-b1589c53fda6` and Huế `f0c59895-6458-48fe-b0e8-428ef696ab5b` also read back.
- ANDROID_E2E_VERIFIED (limited to Operator map entry and interaction): authenticated Operator opened Cần Giờ work package, tapped new map entry, saw dedicated canvas without bottom dock, focused access point, panned, zoomed, recentered and selected assigned segment. Screenshots inspected: `.cache/map-can-gio-focus.png`, `.cache/map-can-gio-gestures.png`, `.cache/map-selected-segment.png`. Final segment selection shows the old fixture's broad bounds; this is not proof of a real surveyed route.
- Runtime recovery: stale Metro 8081 replaced with 8082. Expo Go restarted after transient SQLite module error; no app storage reset or uninstall. Operator session restored using authorized account. CI Metro mode does not watch source edits automatically.

## Limits / remaining dependencies

- These fixtures verify real landmark/reference marker coordinates only. They reuse the existing pinned QA survey scope; the synthetic route does not represent Cần Giờ/Hội An/Huế roads. Cần Giờ UNESCO regional reference lies in the Lòng Tàu river area; it is not a verified takeoff/access site.
- No actual route/source geometry was invented or overwritten to match a landmark. Authentic road geometry needs a valid source preparation workflow/fixture.
- Existing Crew source_not_ready fixtures and null defectTarget records remain separate data/source issues. This checkpoint does not claim they were repaired.
- Full three-role/offline review and full Crew navigation acceptance remain NOT_RUN in this checkpoint. No new GPS confirmation support is claimed; Crew checklist contract remains unchanged.
