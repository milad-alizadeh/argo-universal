# Dependency declarations

## @expo/ui@57.0.22

`@expo__ui@57.0.22.patch` exposes DropdownMenu's `cornerRadius`, `borderWidth` and `borderColor` through its published types and Compose props, then passes them to Material's native menu shape and BorderStroke. Argo's Android Menu uses the approved 16dp radius. Android autolinking compiles `expo-ui` from source so the Kotlin patch applies instead of linking the precompiled AAR. Menus without the prop retain Material's default shape.

Remove this patch when the pinned Expo UI release ships the documented `cornerRadius` prop. It requires rebuilding the Android development client.

## expo-symbols@57.0.3

`expo-symbols@57.0.3.patch` lets `SymbolView` on iOS fall back to `UIImage(named:)` when the name is not a system symbol, so it draws Argo's custom symbols from the app's asset catalog (ADR-0019). System symbols load exactly as before. The Android fallback renders its Material glyph without text scaling, so a 16dp icon stays inside its 16dp box at enlarged font settings; text labels still scale.

It also disables font scaling on the internal Material font glyph. The icon's fixed-size box otherwise clips its enlarged glyph at Android's large text settings. Labels and values keep their normal font scaling.

Remove the corresponding changes when `expo-symbols` supports asset-catalog symbols and keeps font glyphs within their fixed-size boxes. When upgrading, check `ios/SymbolView.swift`, `src/SymbolView.tsx` and its published JavaScript.

## react-native@0.86.3

`react-native@0.86.3.patch` adds `blockquote` and `code` to the two published `Role` declarations. React Native Web already maps these roles to their semantic HTML elements. Argo selects them only on web; native roles and all dependency runtime files stay unchanged.

Remove this patch when the pinned React Native declarations include both roles. When upgrading React Native, check both declaration entry points before carrying the patch forward.

## xstate@5.33.2

`xstate@5.33.2.patch` changes graph declarations only. Graph traversal accepts the machine's public events and XState's native framework events, while retaining the actual logic's snapshot, input and emitted-event types. Public actor event types stay unchanged.

Public payloads retain their required fields. Framework payloads use XState's own types. Delayed events use the native `xstate.after.*` descriptor format; model transition coverage verifies which descriptors are registered by each machine.

Remove this patch when the pinned XState release provides these graph signatures. It changes no runtime files or dependency versions.
