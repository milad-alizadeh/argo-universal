# Dependency declarations

## expo-symbols@57.0.3

`expo-symbols@57.0.3.patch` lets `SymbolView` on iOS fall back to `UIImage(named:)` when the name is not a system symbol, so it draws Argo's custom symbols from the app's asset catalog (ADR-0019). System symbols load exactly as before.

It also disables font scaling on the internal Material font glyph on Android, so a 16dp icon stays inside its 16dp box at enlarged font settings instead of being clipped. Labels and values keep their normal font scaling.

Remove the corresponding changes when `expo-symbols` supports asset-catalog symbols and keeps font glyphs within their fixed-size boxes. When upgrading, check `ios/SymbolView.swift`, `src/SymbolView.tsx` and its published JavaScript.

## react-native@0.86.3

`react-native@0.86.3.patch` adds `blockquote` and `code` to the two published `Role` declarations. React Native Web already maps these roles to their semantic HTML elements. Argo selects them only on web; native roles and all dependency runtime files stay unchanged.

Remove this patch when the pinned React Native declarations include both roles. When upgrading React Native, check both declaration entry points before carrying the patch forward.

## xstate@5.33.2

`xstate@5.33.2.patch` changes graph declarations only. Graph traversal accepts the machine's public events and XState's native framework events, while retaining the actual logic's snapshot, input and emitted-event types. Public actor event types stay unchanged.

Public payloads retain their required fields. Framework payloads use XState's own types. Delayed events use the native `xstate.after.*` descriptor format; model transition coverage verifies which descriptors are registered by each machine.

Remove this patch when the pinned XState release provides these graph signatures. It changes no runtime files or dependency versions.

## node-pty@1.1.0

`node-pty@1.1.0.patch` makes `scripts/post-install.js` mark the prebuilt `spawn-helper` executable on macOS (arm64 and x64), so the Server can spawn terminal processes. Without it the helper keeps the mode it had in the package and spawning fails with a permissions error.

Remove this patch when the pinned `node-pty` release ships `spawn-helper` as executable.

## @expo/ui@57.0.22

`@expo__ui@57.0.22.patch` exposes Compose's `clearAndSetSemantics {}` as the `clearSemantics()` modifier. GroupedListItem uses it to suppress duplicate text without hiding sibling controls.

Rebuild the Android development client after applying this patch. Remove the patch when Expo UI exposes this Compose API.
