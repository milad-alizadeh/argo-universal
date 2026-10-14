# Expo UI (@expo/ui) for UI trees built dynamically from runtime data

Research date: 2026-10-14. "Latest" npm tags at that date: `expo` 57.0.28, `@expo/ui` 57.0.23 (`latest`/`sdk-57`); SDK 58 / `@expo/ui` 58.0.16 is on the `next` tag (beta). Source-code reads are from `expo/expo` `main`, which is already SDK 58 (`@expo/ui` 58.0.x), so some source facts (recycled lists, `LazyVStack.ForEach`, `LazyColumn.Items`) are NOT in the stable SDK 57 line unless stated.

## 1. Current status and versions (late 2026); what changed in recent SDKs

### Takeaway
Expo UI's SwiftUI and Jetpack Compose APIs were declared stable in SDK 56 (May 2026); the current stable SDK is 57 (June 2026) and SDK 58 (RN 0.88 RC, iOS 27) has been in beta since 15 Sept 2026. The universal layer (`@expo/ui`) is a "first iteration"; web is experimental. The package still ships frequent patches (~28 releases of 56.x/57.x/58.x since May), so the API is stable in name but the behaviour around dynamic content is still being fixed.

### Cited Findings
- "Starting with SDK 56, @expo/ui is stable"; Expo adds "Stable doesn't mean done" and "From this release forward, the API is mostly stable." — [Expo blog: Expo UI stable in SDK 56](https://expo.dev/blog/expo-ui-stable-sdk-56)
- SDK 56 released 2026-05-21 with React Native 0.85 / React 19.2; SwiftUI and Compose APIs stable after SDK 53/54/55 iteration; Expo UI is in the default `create-expo-app` template and available in Expo Go. — [Expo SDK 56 changelog](https://expo.dev/changelog/sdk-56)
- SDK 56 introduced universal components (`Host`, `Row`, `Column`, `ScrollView`, `Text`, `TextInput`, `Button`, `Switch`, `Slider`, `Checkbox`, `BottomSheet`), backed by `@expo/ui/jetpack-compose` on Android, `@expo/ui/swift-ui` on iOS, and react-dom/react-native-web on web; web APIs experimental. — [SDK 56 changelog](https://expo.dev/changelog/sdk-56)
- The blog states the universal layer is "a first iteration", that "Some universal components work well on all three platforms; others don't", and that some platform features (e.g. `glassEffect()`, `DockedSearchBar`) need the platform packages. — [Expo blog](https://expo.dev/blog/expo-ui-stable-sdk-56)
- Universal docs list 18 components: BottomSheet, Button, Checkbox, Collapsible, Column, FieldGroup, Host, Icon, List, Picker, RNHostView, Row, ScrollView, Slider, Spacer, Switch, Text, TextInput; on Android/iOS they delegate to the platform packages. — [Docs: universal](https://docs.expo.dev/versions/latest/sdk/ui/universal/)
- SDK 57 released 2026-06-30: RN 0.86, React 19.2; described as a small release; no Expo UI-specific section found in its summary. — [SDK 57 changelog](https://expo.dev/changelog/sdk-57) (search summary; the page body was not fully read)
- SDK 58 entered beta 2026-09-15 (RN 0.88 RC, targets iOS 27, scene lifecycle migration); stable follows RN 0.88. npm shows `next` = 58 and `latest` = 57. — [SDK 58 beta announcement](https://expo.dev/changelog/sdk-58-beta); npm dist-tags checked via `npm view expo dist-tags` / `npm view @expo/ui dist-tags` on 2026-10-14
- `@expo/ui` 58.0.0 (2026-09-10) breaking changes: iOS `Host` now top-leads its content instead of centring (matches Android); `HStack`/`VStack`/`GlassEffectContainer` unset `spacing` now forwards `nil` (system default) instead of 0; Android `RNHostView` `style` prop removed in favour of `modifiers`. — [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md)
- Modifiers: imported from `@expo/ui/swift-ui/modifiers` and passed as an array in the `modifiers` prop; array order matters on Compose too. Custom modifiers register by name in a native `ViewModifierRegistry`; JS side is a config object `{name, params}`. — [Docs: SwiftUI overview](https://docs.expo.dev/guides/expo-ui-swift-ui/), [Docs: Jetpack Compose](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/), [Docs: Extending Expo UI (SwiftUI)](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/extending/)
- SDK 56 added synchronous `WorkletCallback` props and native-state-backed `TextField` value for flicker-free controlled inputs. — [Search summary of SDK 56 notes](https://expo.dev/changelog/sdk-56)
- Cold-start cost: an open issue reports ~380 ms added to iOS cold start just by installing `@expo/ui` (not importing it), median of 9 release launches on SDK 57.0.26. — [expo/expo#51042](https://github.com/expo/expo/issues/51042) (single external report, unconfirmed by Expo)
- Android: `@expo/ui` hard-pins `androidx.compose.material3:1.5.0-alpha17`, reported as conflicting with other Compose-based native libraries (`NoSuchMethodError: ExposedDropdownMenuBox`). Open. — [expo/expo#50050](https://github.com/expo/expo/issues/50050)

### Inferences
- For Argo, "stable" means the exported API names/shape follow native SwiftUI/Compose, not that every runtime path is exercised; fixes for hosting/children/touch issues landed continuously through 58.0.16.
- Argo should decide whether it targets stable SDK 57 or SDK 58 beta. Large-list support (section 4) and `measure()` fixes only exist in 58.

### Gaps
- Did not read the full SDK 57 changelog page body or the SDK 58 release notes (the SDK 58 changelog URL returned 404; Expo says full notes arrive at stable).
- No stable-release date for SDK 58 found as of 2026-10-14.

## 2. How it works under the hood

### Takeaway
Only `Host` is a real native view (a React Native `View` hosting a `UIHostingController` on iOS, a Compose view on Android). Every other Expo UI component is a "virtual" Fabric view: on iOS an `NSObject` (not a UIView) that holds props and children and is rendered by a SwiftUI struct; on Android an `ExpoComposeView` whose `Content()` is called by its parent's composition. React reconciliation therefore maps to child-array changes on the parent's props, which SwiftUI/Compose re-render natively. The tree is a plain React tree, so a JSON-to-component registry maps naturally.

### Cited Findings
- `Host` is "the container for SwiftUI views, comparable to `<svg>`"; it "uses `UIHostingController`" on iOS; crossing React Native -> SwiftUI requires it. — [Docs: SwiftUI overview](https://docs.expo.dev/guides/expo-ui-swift-ui/), [Docs: Expo UI overview](https://docs.expo.dev/versions/latest/sdk/ui/)
- iOS source comment: `SwiftUIVirtualView` is "An NSObject acting as a fake UIView for RCTMountingManager to represent a SwiftUI view ... Used in production builds for minimal overhead." Fabric's `mountChildComponentView` / `unmountChildComponentView` are forwarded into the parent's `props.children`. A UIView-based dev variant emits an error if a component is placed without a `<Host>`. — [SwiftUIVirtualView.swift](https://github.com/expo/expo/blob/main/packages/expo-modules-core/ios/Core/Views/SwiftUI/SwiftUIVirtualView.swift)
- Props are an `ObservableObject` ("Props object that stores all the props ... observed object passed into the content view"); `children: [any AnyChild]?` is "An array of views passed by React as children." — [SwiftUIVirtualView.swift](https://github.com/expo/expo/blob/main/packages/expo-modules-core/ios/Core/Views/SwiftUI/SwiftUIVirtualView.swift), [SwiftUIViewProps.swift](https://github.com/expo/expo/blob/main/packages/expo-modules-core/ios/Core/Views/SwiftUI/SwiftUIViewProps.swift)
- Child identity: `AnyChild.childIdentity` defaults to `.object(ObjectIdentifier)` (the native virtual view's identity); a `StringIdentityChild` can supply a string identity (used for recycled list rows). — [AnyChild.swift](https://github.com/expo/expo/blob/main/packages/expo-modules-core/ios/Core/Views/SwiftUI/AnyChild.swift)
- iOS `List.ForEach` (element-children form) renders `ForEach(props.children ?? [], id: \.childIdentity)`, i.e. SwiftUI identity follows the React-mounted native view. — [ListForEachView.swift](https://github.com/expo/expo/blob/main/packages/expo-ui/ios/ListForEachView.swift)
- A React Native `View` placed inside an Expo UI tree "switches back to React Native rendering"; to use SwiftUI again inside it, a new `Host` is needed. RN components as children of SwiftUI components are wrapped automatically in a `UIViewRepresentable`. — [Docs: Host](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/host/), [Docs: Expo UI overview](https://docs.expo.dev/versions/latest/sdk/ui/)
- iOS hosts RN views in SwiftUI via a `ReactViewIsolationContainer`, because SwiftUI mutates hosted views (autoresizingMask, frame, visibility), "sometimes asynchronously after teardown, corrupting unmounted or recycled React views" (fix for expo/expo#47706). — [SwiftUIViewHost.swift](https://github.com/expo/expo/blob/main/packages/expo-modules-core/ios/Core/Views/SwiftUI/SwiftUIViewHost.swift)
- Android: components are `ExpoComposeView` (Android `ViewGroup`s) whose composable `Content()` is invoked by the parent; `Children()` composes each child inside `key(child)` (the view instance), and a changelog entry says "Use view hash code as key for `Children`" (jetpack-compose, ~55.x). Hosted RN children (`shouldUseAndroidLayout`) render themselves and are skipped. — [ExpoComposeView.kt](https://github.com/expo/expo/blob/main/packages/expo-modules-core/android/src/compose/expo/modules/kotlin/views/ExpoComposeView.kt), [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md)
- Android `LazyColumn` view tracks `onViewAdded`/`onViewRemoved` into a child-count state and emits one `item {}` per child view. — [LazyColumnView.kt](https://github.com/expo/expo/blob/main/packages/expo-ui/android/src/main/java/expo/modules/ui/LazyColumnView.kt)
- The package's own contributor guide: "Bridge native components to JavaScript with as little abstraction as possible"; exported components mirror native names; "modifiers stay as modifiers." — [expo-ui CLAUDE.md](https://github.com/expo/expo/blob/main/packages/expo-ui/CLAUDE.md)
- Prop updates: a changelog fix addressed "modifier application rebuilding a fresh `AnyViewModifier` every body evaluation, which defeated AttributeGraph subtree pruning during scroll" (58.0.0). — [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md)
- Custom views and modifiers: native view registered with `ExpoUIView(...)`, JS side wraps with `requireNativeView`; children rendered natively with `Children()`. — [Docs: Extending Expo UI](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/extending/)
- Not a JS re-implementation: "There's no JS re-implementation in between" for universal components. — [Expo blog](https://expo.dev/blog/expo-ui-stable-sdk-56)

### Inferences
- Because identity on both platforms is "the native view instance", React `key`s matter only insofar as React preserves or recreates the Fabric view; stable keys keep SwiftUI/Compose state (scroll, focus, animations), changed keys recreate native views. Docs do not state this explicitly; derived from the source above.
- A JSON-to-registry renderer is just ordinary React; nothing requires static component trees. The risk is in native-side edge cases (section 3 and 4), not in the reconciler model.
- Every Expo UI element is cheap-ish (no UIView on iOS), but each is still a Fabric shadow node + native object; trees of thousands of nodes were not benchmarked by Expo.

### Gaps
- No Expo document describing the reconciler → native mapping; this section is reconstructed from source.
- No official statement about SwiftUI identity vs React `key` for non-list children.
- Not verified: exact rendering path on iOS for modifiers arrays when the array changes every render (the 58.0.0 fix suggests a perf concern).

## 3. Host boundaries: sizing, nesting, RN in native, native in RN, layout bugs

### Takeaway
Host boundaries are the most fragile part. `matchContents` can only be set at mount, scroll containers and flexible views need definite sizes, a Host inside a Host is a (dev-warned) error unless bridged with `RNHostView`, and several touch/measure/safe-area bugs were fixed only in 57.0.x/58.x. A plugin renderer should use one Host per plugin surface with fixed or flex sizing, and avoid nesting Hosts.

### Cited Findings
- `matchContents` (default false) sizes the Host to its SwiftUI content; "can be only set once on mount"; it maps to SwiftUI `.fixedSize`, so do not apply it on a scroll axis (use `{vertical: true}` with finite width); `Slider` and linear `ProgressView` become near-zero-width under it. — [Docs: Host](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/host/)
- `useViewportSizeMeasurement` (default false) proposes the viewport size to SwiftUI layout, which helps views like `Form` fill the screen. `ignoreSafeArea`, `colorScheme`, `layoutDirection`, `seedColor`, `onLayoutContent` are Host props. — [Docs: Host](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/host/)
- Inside a Host, Yoga does not apply: layout uses `HStack`/`VStack` on iOS or `Row`/`Column` on Android; flexbox styles apply to the Host only. — [Docs: Expo UI overview](https://docs.expo.dev/versions/latest/sdk/ui/), [Expo blog](https://expo.dev/blog/expo-ui-stable-sdk-56)
- Nesting: an RN view inside a Host reverts to RN rendering; a new Host is needed to go back to SwiftUI "even if an outer Host exists"; `RNHostView` is the way to put RN views inside SwiftUI. 58.0.x added a development warning when a `Host` renders directly inside another `Host` without an `RNHostView`. — [Docs: Host](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/host/), [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md)
- `RNHostView` (iOS/tvOS, Android): syncs SwiftUI layout back into Yoga by updating the shadow node size; "Only the first child is measured and laid out"; `matchContents` is mount-only (58.0.x: accepts `{horizontal, vertical}`). Without `matchContents` the RN content fills the parent's size. — [Docs: RNHostView (SwiftUI)](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/rnhostview/), [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md)
- `FieldGroup`/`List` need a definite-sized parent: maintainer reply: "`FieldGroup` is using `LazyColumn` on android and `Form` on iOS which needs a definite sized parent. You can put fixed height to `Host` or pass `flex: 1`." — [expo/expo#46203](https://github.com/expo/expo/issues/46203) (closed; Expo promised a docs note and better error)
- iOS: `Host` mounted during a repeat `fullScreenModal` presentation renders with no safe area; open. — [expo/expo#51288](https://github.com/expo/expo/issues/51288)
- iOS: `matchContents` Host mispositioned content at/off viewport edge (closed). — [expo/expo#42576](https://github.com/expo/expo/issues/42576) (title only read)
- iOS: `measure()` of RN views hosted via `RNHostView` is wrong (page-height offset in the second page of a PagerView); maintainer says fixed in SDK 58 (#50715); open on SDK 57. — [expo/expo#51501](https://github.com/expo/expo/issues/51501)
- iOS crash: unmounting an `@expo/ui` component fired a final `GeometryChangeModifier` layout event after Fabric nulled the event emitter (EXC_BAD_ACCESS), fixed in SDK 55 beta. — [expo/expo#42628](https://github.com/expo/expo/issues/42628)
- iOS crash: SIGABRT when a `TextField` nested in a container inside `Form` is unmounted after a route push while focused; closed 2026-07-13; changelog documents fixes that blur hosted text inputs before React removes native views and `resignFirstResponderInSubtree`. — [expo/expo#47682](https://github.com/expo/expo/issues/47682), [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md), [ExpoSwiftUI.swift](https://github.com/expo/expo/blob/main/packages/expo-modules-core/ios/Core/Views/SwiftUI/ExpoSwiftUI.swift)
- iOS: `BottomSheet` unmounted in the same tick as a JS-driven dismiss left later RN `Modal`s untappable (touch handler left attached by `RNHostView`); fixed in 57.0.x. Same symptom reported still present on Android 57.0.6. — [expo/expo#47708](https://github.com/expo/expo/issues/47708), [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md)
- Android: hosted `Pressable` in `RNHostView` dropped presses on any finger movement (e.g. in a `LazyRow`); fixed 57.0.x; further touch-target fixes in 58.0.0 and 58.0.16 (ripple container stealing touches). — [expo/expo#48131](https://github.com/expo/expo/issues/48131), [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md)
- Android: intermittent "performMeasureAndLayout called during measure layout" crash with `matchContents` Host + Reanimated; fixed by posting `onLayoutContent` after measure (58.0.x). — [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md)
- iOS: an empty `RNHostView` used to take up a spurious row in a `FieldGroup`/`Form` section; now renders nothing until a child mounts. — [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md)
- Fixed: `matchContents` `RNHostView` inside `matchContents` `Host` grew the layout every pass. — [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md)
- Using Expo UI components outside a `Host` previously crashed at runtime; fixed to a logged "Missing Host" error (55.x). — [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md), [ExpoComposeView.kt](https://github.com/expo/expo/blob/main/packages/expo-modules-core/android/src/compose/expo/modules/kotlin/views/ExpoComposeView.kt)
- Keyboard: React Native treats the whole `<Host>` as the text input for keyboard-dismiss purposes. — [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md) (58.0.0 fix note)

### Inferences
- Plugin trees must be wrapped by exactly one Host per surface; the renderer registry should reject or auto-bridge any plugin node that would put a RN `View` (or another Host) inside a native component unless wrapped in `RNHostView`.
- `matchContents` being mount-only means a JSON patch that toggles sizing mode must remount the Host (change its `key`).
- The renderer should refuse mixing a RN-hosted element inside lists/rows on Android until the touch fixes are confirmed on the targeted SDK.

### Gaps
- No official guidance on nested-scroll or multi-Host-per-screen performance.
- iOS 27 / SDK 58 interactions with Host sizing not verified.

## 4. Dynamic children: add/remove/reorder, conditionals, large lists, update frequency, animation

### Takeaway
Plain React add/remove/conditional rendering works and is explicitly supported (docs say to use conditional rendering for Compose dialogs), but through SDK 57 `List` and `LazyColumn` are "not truly lazy yet": React creates every row up front. SDK 58 (beta) adds recycled, data/`keyExtractor`-driven lists (`List.ForEach`, `LazyVStack/HStack.ForEach`, `LazyColumn/LazyRow.Items`). Animated removal has a known iOS gap. Expo publishes no row-count guidance or benchmarks.

### Cited Findings
- SDK 57-line docs, SwiftUI `List`: "React creates every row up front, so large lists can be slow to mount"; recommends FlashList or Legend List for large lists. — [Docs: List](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/list/)
- Compose `LazyColumn` docs: "not truly lazy yet": "the native side only composes visible items, but React still creates every child up front." — [Docs: LazyColumn](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/lazycolumn/)
- SDK 58 line: iOS `List.ForEach` "recycles rows from a small pool around the visible range" (#49975, 58.0.5/6); Android `LazyColumn.Items` / `LazyRow.Items` added likewise (#50258); iOS `LazyVStack.ForEach` / `LazyHStack.ForEach` added in 58.0.9 (#50579). Set `recycling={false}` to render every row. Element children for `List.ForEach` are deprecated (dev `console.warn`). — [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md), [ListForEach.tsx](https://github.com/expo/expo/blob/main/packages/expo-ui/src/swift-ui/List/ListForEach.tsx)
- Recycled-list API (source): `data`, `keyExtractor` (must return a unique string per item; otherwise throws), `children: ({item, index}) => ReactElement`; defaults `overscanCount` 10, `estimatedItemSize` 64; "wrap [the render function] in `useCallback`, or every row re-renders on each parent render"; recycled rows reuse local state; rows show placeholders while JS prepares content; item `index` renders in slot `index % capacity`; late native events carry a `revision` and are dropped if stale; `recycling` "Set it once; changing it remounts the rows." — [DataListForEach.tsx](https://github.com/expo/expo/blob/main/packages/expo-ui/src/swift-ui/List/DataListForEach.tsx), [useRecycledRows.tsx](https://github.com/expo/expo/blob/main/packages/expo-ui/src/recycling/useRecycledRows.tsx)
- Selection/delete/move on iOS lists: `List.ForEach` inside `List`; `onDelete(indices)`, `onMove(sourceIndices, destination)`; edit mode via `environment('editMode','active')`; rows identified with the `tag` modifier. — [Docs: List](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/list/)
- Conditional children: Android `FieldGroup` rendered an empty row/section when a conditional child evaluated to `false` (`{condition && <FieldGroup.Section>…}`); fixed in 56.0.16 (#46874). — [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md)
- Android `AlertDialog` API change: `visible` prop removed; "use conditional render[ing]" to show/hide. — [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md)
- iOS bug (open, SDK 57.0.27, `@expo/ui` 57.0.22): children of a view removed inside an animated transaction "disappear before its removal transition finishes" — each child plays its own removal transition, unlike plain SwiftUI. — [expo/expo#51263](https://github.com/expo/expo/issues/51263)
- `geometryGroup` modifier added because "a `Button` inside a container with an `animation` modifier can draw its label away from its own background while the animation runs." — [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md)
- Frequent updates: `useNativeState` shares observable state between JS and native views to enable "flicker-free, UI-thread-driven controls"; a follow-up post is planned. Controlled `Slider` ignoring `value` updates after first drag (fixed 58.0.0); controlled `Toggle` now "fully controlled: when `isOn` is set, it only moves once JS updates the prop"; `TextField` selection crashes when JS replaces text mid-typing (fixed 57.0.x). — [Expo blog](https://expo.dev/blog/expo-ui-stable-sdk-56), [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md)
- Interactive-input unmount safety: hosted `TextField`/`SecureField` are now blurred before React removes native views (58.0.0, #49348). — [@expo/ui CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md)

### Inferences
- For plugin JSON patches: add/remove/reorder of ordinary leaf and container children is the supported path (it is the React model); the risky cases are (a) focused text inputs being removed, (b) animated removals on iOS, (c) toggling mount-only props (`matchContents`, `recycling`).
- Practical ceiling: on SDK 57 expect a few dozen rows per `List`/`LazyColumn` before mount cost matters (no Expo number exists; this is a judgement from the "creates every child up front" wording). Longer lists need SDK 58's `data`/`keyExtractor` forms, which the JSON schema should model explicitly (a `list` node with `items` + `key`) rather than as free-form children.
- Keep per-patch work as ordinary React state updates in the renderer; do not hand-roll native updates. Controlled inputs need `useNativeState`/worklet callbacks to avoid round-trip flicker.

### Gaps
- No benchmark or Expo statement of safe row counts or re-render rates.
- Reorder behaviour of non-list children not documented; only inferred from identity code.
- #51263's current status and any workaround not reported.

## 5. Android Compose parity gaps vs iOS

### Takeaway
Expo exposes platform-specific component sets that do not match one-to-one: the SwiftUI package has ~50 components, the Compose package ~50 different ones. Only the 18-component universal set is intended to be cross-platform, and Expo itself says parity is incomplete. Known concrete Android deltas are layout/ripple bugs and a dependency pin.

### Cited Findings
- Expo: "Some universal components work well on all three platforms; others don't." Universal layer is "a first iteration." — [Expo blog](https://expo.dev/blog/expo-ui-stable-sdk-56)
- Source listing of `packages/expo-ui/src` (main/SDK 58): SwiftUI includes e.g. Form, Section, NavigationStack/NavigationLink/NavigationSplitView, TabView, Toolbar, Chart, Gauge, ContextMenu, SwipeActions, DisclosureGroup, ControlGroup, ShareLink, GlassEffectContainer, Grid, ZStack, LazyVStack/LazyHStack; Compose includes e.g. Card, Chip, Carousel, FlowRow, ModalBottomSheet, NavigationBar, PullToRefreshBox, SearchBar/DockedSearchBar, Snackbar, Tooltip, ListItem, HorizontalPager, Badge/BadgedBox. Universal set: BottomSheet, Button, Checkbox, Collapsible, Column, FieldGroup, Host, Icon, List, ListItem, Picker, RNHostView, Row, ScrollView, Slider, Spacer, Switch, Text, TextInput. — [expo-ui/src tree (GitHub API listing, 2026-10-14)](https://github.com/expo/expo/tree/main/packages/expo-ui/src)
- Universal `FieldGroup`: "On Android, `FieldGroup` renders a Material 3 grouped list"; iOS uses `Form`, Android uses `LazyColumn`. — [Expo blog](https://expo.dev/blog/expo-ui-stable-sdk-56), [expo/expo#46203](https://github.com/expo/expo/issues/46203)
- Android `ListItem` inside `FieldGroup.Section` renders inside a second Material `ListItem` (double surface, inset tap target); iOS correct. Open. — [expo/expo#50086](https://github.com/expo/expo/issues/50086)
- Android `Button` ignores the `size` modifier because of the 48dp minimum interactive size. Open. — [expo/expo#50087](https://github.com/expo/expo/issues/50087)
- Universal `Row` with `onPress` lacks a pressed background; `Spacer` in a universal `Row` was not clickable (closed). — [expo/expo#48031](https://github.com/expo/expo/issues/48031), [expo/expo#48030](https://github.com/expo/expo/issues/48030)
- Android `MenuView` popup content invisible after keyboard dismissal. Open. — [expo/expo#50655](https://github.com/expo/expo/issues/50655) (title only read)
- Android 7 (API 24/25) was unusable until 57.0.x because `android.graphics.Color` props had no converter. — [expo/expo#47546](https://github.com/expo/expo/issues/47546)
- iOS-only reachable features include Liquid Glass (`glassEffect` needs Xcode 26+/iOS 26+), `NavigationStack`, etc.; TV platforms lack some APIs. — [Docs: SwiftUI overview](https://docs.expo.dev/guides/expo-ui-swift-ui/), [Expo blog](https://expo.dev/blog/expo-ui-stable-sdk-56)
- Callstack talk summary: "some components available in SwiftUI don't yet have equivalents in Jetpack Compose." — [Callstack event page](https://www.callstack.com/events/expo-ui-meets-native-jetpack-compose-and-swiftui-in-practice) (secondary source, via search summary)

### Inferences
- A JSON schema whose node types are the 18 universal components is the only set with an intended shared contract; Argo's registry can add platform-extra node types behind explicit `ios`/`android` capability flags.
- The renderer needs a per-platform "unsupported node" fallback, because Compose lacks SwiftUI-style `Form`/`Section`/`Menu` semantic parity beyond the universal wrappers.

### Gaps
- No official parity matrix exists in the docs I fetched; the listing above is only a directory-name comparison and not a behavioural comparison.
- Did not read per-component universal pages (e.g. `universal/fieldgroup`, `universal/list`) for stated platform differences.

## 6. Known GitHub issues and Expo team guidance relevant to dynamic trees

### Takeaway
There is a steady stream of Host/RNHostView/unmount/focus/touch bugs fixed within weeks by the Expo team (mostly the maintainer `intergalacticspacehighway`), plus a few open ones; no one has publicly reported or documented a JSON-driven renderer. The package label is `📦 @expo/ui`; 23 labelled issues exist (open+closed) at the time of search.

### Cited Findings
- Label list (`gh issue list --label "📦 @expo/ui" --state all`, 2026-10-14) shows 23 issues, 8 open: #50555, #50087, #50086, #50050, #48031, #47765, #44739, #44144. Many relevant issues are unlabelled and titled `[ui]`/`[expo-ui]`, so the label undercounts. — GitHub issues for [expo/expo](https://github.com/expo/expo/issues?q=label%3A%22%F0%9F%93%A6+%40expo%2Fui%22)
- Open dynamic-tree relevant: #51263 (animated removal transitions), #51288 (Host safe area on repeat modal), #51501 (measure inside PagerView), #50086 (Android ListItem double wrap), #51042 (cold start), #50050 (Material3 alpha pin), #48834 (MaskedView does not size from children). — [#51263](https://github.com/expo/expo/issues/51263), [#51288](https://github.com/expo/expo/issues/51288), [#51501](https://github.com/expo/expo/issues/51501), [#50086](https://github.com/expo/expo/issues/50086), [#51042](https://github.com/expo/expo/issues/51042), [#50050](https://github.com/expo/expo/issues/50050), [#48834](https://github.com/expo/expo/issues/48834) (title only)
- Closed, relevant: #42628 (unmount crash, fixed 55 beta), #47682 (focused TextField unmount crash), #47708 (BottomSheet unmount breaks Modals), #46203 (FieldGroup needs sized Host), #48131 (RNHostView drops presses in LazyRow), #46154 (Slider stray baseline), #43178 (ColorPicker onSelectionChange never fired). — [expo/expo issues](https://github.com/expo/expo/issues)
- Expo team guidance: contributors are told to keep native views "thin wrappers", mirror native APIs, expose imperative APIs where native has them. — [expo-ui CLAUDE.md](https://github.com/expo/expo/blob/main/packages/expo-ui/CLAUDE.md)
- Docs for SwiftUI/Compose `Host` pages do not mention a limit on tree size, hosting multiple Hosts, or JSON/dynamic tree construction; the only dynamic-list guidance is "use FlashList/Legend List for large lists" (57) and the new data/keyExtractor recycled lists (58). — [Docs: List](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/list/), [Docs: LazyColumn](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/lazycolumn/)
- No Expo-sanctioned server-driven-UI pattern found; search returned third-party SDUI projects (Nimbus, json-to-compose) only. — [Search results](https://github.com/topics/server-driven-ui)

### Inferences
- Treat unmount of focused inputs, sheet/dialog dismissal in the same tick as unmount, and animated removals as the test cases for the renderer's contract tests; they are exactly the shapes of previously reported crashes.
- Because bug fixes keep landing in 57.0.x and 58.x, pinning an exact `@expo/ui` version in Argo and adding a regression suite for dynamic patches is more important than the "stable" label suggests.

### Gaps
- Not every `@expo/ui` bug in `expo/expo` carries the label; a title search ("expo-ui", "[ui]") was used but could be incomplete.
- Did not read Expo Go vs dev-build differences in detail (native module; custom views/modifiers need a dev build).
- Expo team talks / conference sessions on Expo UI internals not searched beyond one Callstack page.
