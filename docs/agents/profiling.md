# Profiling

Look at which components render and why. Those counts stay the same on a busy machine; timings don't, so read timings only from a profiling build, and never a dev one.

## Profile the App on web

1. Start a Server with a seed tier. It prints its URL and runs until stopped. `PERF_FEED_ROWS` is 100, 1000 or 10000; `PERF_SESSIONS` is 100, 241 or 1000.

   ```sh
   PERF_FEED_ROWS=1000 PERF_SESSIONS=100 pnpm --filter @repo/tools perf:seed
   ```

   CI seeds only the smallest tier in `tools/perf/seed-tiers.integration.test.mts`. After a change to seeding, run that file with `PERF_SEED_ALL_TIERS=1` to seed every tier.

2. Build for that URL, then serve the build. `build:profiling` uses `react-dom/profiling`, the one production React whose Profiler reports timings, and leaves names unminified so components are readable.

   ```sh
   EXPO_PUBLIC_ARGO_SERVER_URL=<url> pnpm --filter @repo/universal-app build:profiling
   pnpm --filter @repo/universal-app exec expo serve
   ```

3. Record in the React DevTools Profiler with "Record why each component rendered" on. Chrome's Performance panel shows the React tracks beside layout and paint.

A static dev export doesn't work here: its page stays empty.

## Profile on iOS and Android

Use React Native DevTools on a real build. #1844 tracks it. What an iOS Simulator run of #2685 found (no timings were reached; see the last bullets):

**Build a Release app for your own simulator** (never a dev build for timings):

```sh
xcrun simctl create "Argo Perf" com.apple.CoreSimulator.SimDeviceType.iPhone-18-Pro com.apple.CoreSimulator.SimRuntime.iOS-27-2
cd apps/universal-app
EXPO_PUBLIC_ARGO_PAIR_LINK=1 CI=1 pnpm exec expo prebuild --platform ios --no-install
(cd ios && pod install)   # picks up react-native-quick-crypto and modules/argo-channel
cd ios && EXPO_PUBLIC_ARGO_PAIR_LINK=1 CI=1 TMPDIR=<own dir>/ xcodebuild -workspace Argo.xcworkspace -scheme Argo \
  -configuration Release -sdk iphonesimulator -destination id=<udid> -derivedDataPath <own dd> build
xcrun simctl install <udid> <own dd>/Build/Products/Release-iphonesimulator/Argo.app
```

- Give every checkout its own `TMPDIR` (with a trailing slash, created first) when it runs `xcodebuild`. Metro's transform cache is `$TMPDIR/metro-cache`, shared by every checkout on the Mac, and a Before build followed by an After build failed with `Unable to resolve module ./../../../../../../../before/packages/...` from `expo/dom/entry.js`: the cache held the other checkout's paths. Do not delete `/tmp/metro-cache`; other agents use it. `EXPO_METRO_CACHE_KEY_VERSION` did not help.
- Two checkouts can each run `pnpm install`, `expo prebuild` and `pod install` at once. A Release build is about 10 minutes, a cold `pod install` about 4.
- `EXPO_PUBLIC_ARGO_PAIR_LINK=1` is the build flag that lets `argo://pair?invite=<writePairingInvite(invite)>&host=127.0.0.1&port=<port>` pair the App with no camera. The owner side is `connectOwner` from `e2e/owner.ts`: `pairing.mint`, then `pairing.allow` on the `pairing.registered` stream. The system's "Open in Argo?" sheet needs one tap.
- The seeded Server needs the E2E Engine bundle first (`e2e/engine-bundle.ts`, normally Playwright's global setup), or it exits with `Cannot find module .../e2e/.engine/e2e-engine.mjs`.
- Xcode 27.2 here has no Simulator.app, `simctl` has no tap or swipe, and `maestro`, `idb`, `axe` and `ffmpeg` are not installed. What worked: an XCUITest bundle (no host app, `XCUIApplication(bundleIdentifier: "dev.argo.app")`) built with the `xcodeproj` gem from CocoaPods' Ruby (`GEM_HOME=/opt/homebrew/Cellar/cocoapods/<v>/libexec /opt/homebrew/opt/ruby/bin/ruby`), started with `xcodebuild test-without-building`, which polls command files under `/tmp` (a simulator process can read host paths) and taps by label, by coordinate, or on the springboard's `Open`. Frames come from `xcrun simctl io <udid> recordVideo` read with AVAssetReader in a small Swift tool.
- A Release app logs no JS `console.log`, but a fatal JS error shows in `xcrun simctl spawn <udid> log show --last 3m --predicate 'process == "Argo" AND eventMessage CONTAINS "Unhandled"'`. Release stacks are Hermes bytecode offsets, not source lines.
- A TCP proxy between the App and the Server (paired through the proxy's port) shows the upgrade headers (`x-argo-compression`), bytes per connection, and simulates a network drop by closing its listener and its sockets; the Server and its data stay untouched.
- Open on #2685 (origin/main `ca5a7cf13` and `7ed2fb779`): a clean install of either Release build did not reach the pairing screen. Before showed the error boundary `Error: useTRPC() can only be used inside of a <TRPCProvider>`; After aborted with `Unhandled JS Exception: TypeError: undefined is not a function` while loading a route module. Both were built with `EXPO_PUBLIC_ARGO_PAIR_LINK=1` and a private `TMPDIR`. Whether the flag or the build setup is at fault is not known.

## Stop a fix regressing

Add a test with `renderCounter` from `packages/kit/mocks/render-counts.ts` in the component's `.test.stories.tsx`, and see it fail on a deliberate regression. It says which components rendered, and which props changed. `feed-streaming-renders.test.stories.tsx` and `list-grouping.test.stories.tsx` are the examples.

Storybook runs React Compiler on Argo's own sources, as the App does (`apps/storybook/.storybook/react-compiler.ts`), so a story's render counts are what ships. A story can still count more than the App if it builds its view differently. Check a surprising count against the App before filing it.

Build a story's view the way the App builds it. A Feed story that skips `keepUnchangedItems` reports every row updating, which the App doesn't do.
