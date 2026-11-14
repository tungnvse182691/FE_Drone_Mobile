# Operator cold start, cached reads and navigation

- Codex IMPLEMENT_AND_SELF_REVIEW; FE base 28d0513 on main.
- BE pinned 85879fe9082774cf5098a9ba281f56b9c651f8ea; local sandbox API18181.
- Android14, Pixel 6 Pro emulator-5554, Expo Go, Metro8090, Operator A.
- Scope: Operator layout, layout regression, shared test hook stub, this evidence.

## Actual Android checks

QA task c35a0c8c-2a7d-4c77-ade9-a0b9eedbd6ac was read online first.
Disabling Wi-Fi/data did not prevent emulator access to the host API; this was
not counted as an offline pass. Restored both settings. Pausing the sandbox API
produced a real pending/timeout read. Subsequently unpaused and stopped only
the API container to produce connection failure without waiting through every
transport retry. SQL, MinIO and stored data were preserved.

ANDROID_E2E_VERIFIED, warm cached reads: refresh while API unavailable restored
the task, survey scope, deadline and access point with the timestamped
"Bản lưu trên máy" notice. Accept/decline controls were absent: cached ETags
cannot grant mutation authority. No command was prepared or dispatched.

Cold force-stop/reopen while the API remained unavailable showed the session
recovery screen. Therefore fully offline cold entry is NOT supported by this
observed flow, even though snapshots persist. Current auth keeps access tokens
in memory and requires a successful secure refresh before authenticated entry.
Did not bypass the guard or manufacture a session. Started the API container,
tapped Thử lại, and recovered the same Operator detail without password login.
Container was healthy after recovery. This test does not certify a signed
offline queue, native cryptography or offline map tiles.

## UI defect reproduced and fixed

After cold reopen, the bottom navigation retained an initial larger viewport.
Native hierarchy showed tab icons at y2942 but labels below the app viewport;
screenshot confirmed clipped labels. The layout used Math.max for every height
change at the same width, incorrectly retaining Android's startup system-bar
height correction as if it were keyboard resize.

The layout now accepts small height corrections bounded by the actual top and
bottom system insets. Larger keyboard shrink still retains the full viewport
until keyboardDidShow hides navigation. SafeAreaView still owns bottom padding,
Stack remains mounted, and focused maps still hide navigation.

Reference: official useSafeAreaInsets documentation and Android inset sources,
consulted via Context7 /appandflow/react-native-safe-area-context:
https://appandflow.github.io/react-native-safe-area-context/api/use-safe-area-insets/

ANDROID_E2E_VERIFIED after fix: cold force-stop/reopen into request-decline,
all four labels visible at y2954 within app height3036; focus reason field,
keyboard appears with navigation hidden and the input visible; dismiss keyboard,
all four labels return at y2954. Reason left empty, no decline command sent.
Expo Go needed a second VIEW launch to foreground the experience after cold
LauncherActivity; recovered without clearing data. No AndroidRuntime fatal log
was observed in the bounded check. This is one Android14 gesture-navigation
device, not a certification of every keyboard/window configuration.

## Executed verification

- Regression red: 892 retained instead of 868 after system-bar shrink.
- Green node --test tests/operator-navigation-ime.test.cjs: 3/3.
- node --test tests/operator-offline-cache.test.cjs: 4/4 (logic, not native proof).
- npm run typecheck: exit0.
- node --test tests/*.test.cjs: 1664/1664, zero failed/skipped/cancelled,
  155582.8675ms; .cache/operator-cold-start-regression-20261115.log.
- git diff --check: exit0. No package, provider, native config or BE changes.

The API-232 supplement child ID missing from parent GET remains the separate
BE discovery/readback gap documented in OPERATOR-SUPPLEMENT-ANDROID-20261115.md.
Cold offline authentication is a separate client capability limitation, not
evidence that BE lacks the Operator task GET API.
