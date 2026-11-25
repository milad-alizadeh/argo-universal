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

Use React Native DevTools on a real build. #1844 tracks it. What an iOS Simulator run of #2685 found:

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
- **Readable stack for a Release-only crash.** A Release stack is Hermes bytecode offsets, and a `SOURCEMAP_FILE` map did not line up with them (it named unrelated files). Serve the JS in production mode to a Debug build instead: build Debug once, then `TMPDIR=<own dir>/ CI=1 pnpm exec expo start --port 8081 --no-dev` in `apps/universal-app` (`--no-minify` is not a flag of `start`), install the Debug app, `xcrun simctl openurl <udid> "argo://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"` and tap the system "Open" sheet. The red box then has plain JS line and column numbers in the served bundle: fetch it with `curl -H "expo-platform: ios" -H "accept: application/expo+json" http://127.0.0.1:8081/` (the `launchAsset.url` field) and read the line. A dev-mode Metro (no `--no-dev`) shows a component stack for errors that an error boundary catches. A JS-only fix is then a reload, not a build.
- **Two launch failures found this way (#2685).** (1) `packages/client/src/features/connection/api/channel/media-store.native.ts` imported `./media-store`, which Metro resolves to itself on iOS and Android, so `memoryMedia` was `undefined` and the module threw `TypeError: undefined is not a function` at load (Metro warns `Require cycle: media-store.native.ts -> media-store.native.ts`). Only a native bundle shows it. (2) On `origin/main`, `DesktopConversationProvider` mounts `ServerConversationHost` on any iPhone (`phoneConversationEnvironment`, #2606), and its `useConversationStatus` calls `useTRPC()` before any Server exists, so a clean install showed `useTRPC() can only be used inside of a <TRPCProvider>`. `EXPO_PUBLIC_ARGO_PAIR_LINK` was not the cause of either.
- **Timings without a UI tool.** Record with `xcrun simctl io <udid> recordVideo --codec=h264 <file>` (it writes a frame only when the screen changes, about 60 per second while moving, so the file ends at the last change), read every frame's grid with AVAssetReader and take the mean absolute difference between frames. The first change after the tap is the start, the last change over 0.3 is settled, and bursts of change over 3.0 after the 0.6 s push are first draw plus jumps. Tap by accessibility label from the XCUITest driver; to find a row in a long list type into the Sessions search first. Sync a recording to wall time with an event whose epoch you know, such as a prompt sent to the Server, which draws a row within about 50 ms.
- **Reconnect.** Close the proxy's listener and sockets for 6 s and send prompts to the Server during it; the time from the proxy's "network back" line to the first changed frame was 3.8 s on both builds, and the socket reopened 3.72 to 3.76 s after the return, so it is the App's own retry delay. Owner-side `devices.unpair` closes the channel and the App keeps a blank Session with no message, on `origin/main` as well.
- **Keep one server up at a time.** A SIGTERM did not stop the seeded Server driver reliably and it kept the control port; use `kill -9` before starting the next build's Server.

## Stop a fix regressing

Add a test with `renderCounter` from `packages/kit/mocks/render-counts.ts` in the component's `.test.stories.tsx`, and see it fail on a deliberate regression. It says which components rendered, and which props changed. `feed-streaming-renders.test.stories.tsx` and `list-grouping.test.stories.tsx` are the examples.

Storybook runs React Compiler on Argo's own sources, as the App does (`apps/storybook/.storybook/react-compiler.ts`), so a story's render counts are what ships. A story can still count more than the App if it builds its view differently. Check a surprising count against the App before filing it.

Build a story's view the way the App builds it. A Feed story that skips `keepUnchangedItems` reports every row updating, which the App doesn't do.
