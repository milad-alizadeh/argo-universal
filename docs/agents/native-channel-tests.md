# Native channel tests

The channel's record path on a phone (decrypt, WebSocket upgrade and frames) is native code in `apps/universal-app/modules/argo-channel`. Its cores have no Expo in them, so they run on their own against vectors the JavaScript side makes from the Server's cipher.

- **The vectors** are `modules/argo-channel/fixtures/channel-vectors.json`. `packages/client/src/features/connection/api/channel/native-channel-vectors.integration.test.ts` fails when the file differs from what the Server's cipher makes; regenerate with `UPDATE_NATIVE_FIXTURE=1 pnpm exec vitest run <that file>`.
- **iOS** (`ios/ChannelCore.swift`): `swift test` in `modules/argo-channel/swift-tests`. The package links the core in; it needs Xcode, not a simulator.
- **Android** (`android/.../ChannelCore.kt`): `ChannelCoreTest.kt` is a JUnit test on the JVM. Run it from a prebuilt Android project with `./gradlew :argo-channel:testDebugUnitTest`. It has not run in CI or on the machines that wrote it.

The sockets (`ChannelSocket.swift`, `ArgoChannelModule.*`) are not covered; they need a device.
