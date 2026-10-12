# Dependency declarations

## @expo/ui@57.0.22

`@expo__ui@57.0.22.patch` gives DockedSearchBar what Argo's Android header search needs from Paper:
- `containerColor` sets the bar's fill.
- `BackIcon` and `ClearIcon` slots add a leading Back button while the bar is open, and a trailing clear button while it holds text.
- `onExpandedChange` reports when the bar opens and closes.

Closing the bar, by Back or the system Back gesture, clears its text and focus. When its host re-attaches it, the open field takes focus back; this happens when a header drops its other items. Each slot button covers its React Native content, so the button receives the tap. The Back gesture comes from `activity-compose`, which the patch declares directly.

While open, the field fills the bar and the bar clears its header Toolbar's content insets, restoring them on close. Otherwise those insets stack on Material's own button spacing and push Back and clear off the page gutter. Android autolinking compiles `expo-ui` from source so the Kotlin patch applies instead of linking the precompiled AAR.

Remove the corresponding changes when the pinned Expo UI release ships a DockedSearchBar with these props and slots. The patch requires rebuilding the Android development client.

## react-native-screens@4.26.2

`react-native-screens@4.26.2.patch` makes the Android header Toolbar send its layout to the Shadow Tree when its content insets change, as it already does when its size changes. Without it, the open header search keeps the width it had beside the insets, so its clear button sits short of the page gutter.

Remove this patch when the pinned release updates the Shadow Tree on content inset changes. When upgrading, check `CustomToolbar.kt`. The patch requires rebuilding the Android development client.

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
