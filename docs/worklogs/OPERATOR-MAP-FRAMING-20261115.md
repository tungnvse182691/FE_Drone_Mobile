# Operator MapLibre camera framing

- Mode: Codex IMPLEMENT_AND_SELF_REVIEW; base FE 62442b5 on main.
- BE pinned origin/develop: 85879fe9082774cf5098a9ba281f56b9c651f8ea (fetched again).
- Scope: RoadGuardMapLibre framing, Operator survey-map caller, regression tests.
- Contract: deploy/fe-handoff/TASK-MAP-WGS84.md, API-104 pinned refs and WGS84 [longitude, latitude]; no metric fallback or source-coordinate changes.

## Diagnosis and fix

Selected survey segment was fitted together with a distant access marker, making
the line too small. Added optional route camera framing, enabled only on the
Operator full-screen map. Both initial fit and recenter follow that choice.
Markers retain their server coordinates. Default behavior for other callers is
unchanged; access focus still fits the actual access marker.

Reference: official MapLibre LineString fitBounds example:
https://maplibre.org/maplibre-gl-js/docs/examples/zoomto-linestring/

## Executed evidence

- Regression red: selected route included distant marker, assertion failed.
- LOGIC_TESTED: node --test tests/hardening-map.test.cjs tests/operator-map.test.cjs: 24/24.
- npm run typecheck: exit 0; git diff --check: exit 0.
- Full node --test tests/*.test.cjs: 1662/1662, 0 fail, 157449.1106 ms;
  local output .cache/map-framing-regression-20261115.log.
- ANDROID_E2E_VERIFIED: Pixel 6 Pro emulator-5554 Android 14, Expo Go, Metro
  8090; Operator A task 4a230453-2292-44fd-9f53-6e18b57c8a89. Opened map,
  selected both segments, focused access point, panned, and tapped recenter.
  Screenshot confirms separate header, segment buttons, unobstructed canvas and
  point-of-access action. Read-only WebView CDP confirms loaded/tilesLoaded true,
  route framing without marker bounds, and access center [106.56,10.76], zoom16.5.

## Data limit

This legacy QA source has segments near [105,9.951046] but access point
[106.56,10.76]. The line is offshore on real tiles. Camera fix is verified;
this is not evidence that the legacy source is a real survey in Binh Chanh.
No new BE WGS84 contract gap, no BE edits, no fabricated coordinates.
This checkpoint does not claim full three-role acceptance or offline crypto acceptance.
