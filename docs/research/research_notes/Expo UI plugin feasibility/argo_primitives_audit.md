# Argo's UI primitives: how they are built on iOS and Android, and whether a JSON tree could drive them

Scope: code reading only, no files edited, nothing run on a simulator. All paths are relative to `/Users/milad/Developer/argo-universal`. `PRIM` below = `packages/client/src/lib/generic/primitives`. `SYM` = `packages/client/src/lib/generic/symbols`. Line numbers come from the checkout on `main` at commit 9ae20ba5 (2026-10-14). "Source" links are repo files, since this question has no web sources. Anything marked (inferred) is my reading of the code, not something I ran or the repo states.

## Q1. Which primitives exist, and where do they live?

### Takeaway
Screens import controls from `#primitives/*` (ADR-0020), which maps to `PRIM`. There are about 30 primitives in `PRIM`, plus a "product" layer (`packages/client/src/lib/product`) that holds page chrome, header, scroll-fade and markdown pieces. Several things in the research report's vocabulary table do not exist yet as primitives: Page, Nav, Section-as-heading, Banner, Properties/Property, Avatar, Stack, and a pure-data Text/Markdown.

### Cited Findings
Import alias: `#primitives/*` -> `./src/lib/generic/primitives/*` — [packages/client/package.json:13-16](../../../../packages/client/package.json)

ADR-0020 states the rule (screens import controls only from `#primitives`, never `@expo/ui`) and the three drawings (iOS SwiftUI in a `Host`, Android Compose, web/desktop Uniwind or Expo UI universal) — [docs/adr/0020-argo-owns-its-primitives.md](../../../adr/0020-argo-owns-its-primitives.md)

Primitive folders and their main files (every folder has `*.stories.tsx`, many have `*.test.stories.tsx`):

| Group | Primitive | Entry file(s) |
|---|---|---|
| buttons | Button | `PRIM/buttons/button/button.tsx` (re-exports `button-view`), props in `button-props.ts` |
| buttons | IconButton | `PRIM/buttons/icon-button/icon-button.tsx`, `icon-button-props.ts` |
| buttons | MenuButton, FilterPill, ButtonGroup | `PRIM/buttons/menu-button/menu-button.tsx`, `filter-pill/filter-pill.tsx`, `button-group/button-group.tsx` |
| display | Text (roles) | `PRIM/display/text/text.tsx` |
| display | Badge | `PRIM/display/badge/badge.tsx` |
| display | Icon (+IconSlot, IconSpinner) | `SYM/icon.tsx` (not under `PRIM`) |
| display | Spinner, Collapsible, DisclosureChevron, SelectedCheck, LiquidGlass | `PRIM/display/*` |
| fields | FieldGroup | `PRIM/fields/field-group/field-group-view{,.ios,.android}.tsx` |
| fields | FieldSection | `PRIM/fields/field-section/field-section-view{,.ios,.android}.tsx` |
| fields | FieldRow (hosts an arbitrary RN row) | `PRIM/fields/field-row/field-row-view{,.ios,.android}.tsx` |
| fields | FieldInput, StandaloneFieldInput | `PRIM/fields/field-input/field-input-view{,.ios,.android}.tsx`, `standalone-field-input.*` |
| lists | ListItem | `PRIM/lists/list-item/list-item-view{,.ios,.android}.tsx` |
| lists | NavigationItem (drawer row) | `PRIM/lists/navigation-item/navigation-item{,.android}.tsx` |
| inputs | Picker | `PRIM/inputs/picker/picker{,.ios,.android}.tsx`, `picker-props.ts` |
| inputs | Switch, Slider, SegmentedControl, Checkbox | `PRIM/inputs/switch/*`, `slider/*`, `segmented-control/*`, `checkbox/*` |
| inputs | Input, Textarea, Select, RichTextarea (Lexical, web only), ComboboxSearch, SearchField, ListSearchBar | `PRIM/inputs/*` |
| overlays | Menu (single-select radio menu) | `PRIM/overlays/menu/menu{,.ios,.android}.tsx`, `menu-props.ts` |
| overlays | Alert | `PRIM/overlays/alert/alert{,.ios,.android}.tsx`, `alert-props.ts` |
| overlays | BottomSheet, FormSheet, Dialog, Popover, InfoPopover, DropdownMenu, Portal, Toast | `PRIM/overlays/*` |
| other | Pressable (re-export of RN `Pressable`), NativeOnlyAnimatedView, native helpers (`Host`, `ControlHost`, theme/typography bridges) | `PRIM/pressable/pressable.tsx`, `PRIM/native/*` |

Product layer used by screens (not under `#primitives`, but plugin-relevant):
- `ScreenHeader` + `ScreenHeaderProvider` (sets the native stack header) — [packages/client/src/lib/product/navigation/screen-header.tsx:26-75](../../../../packages/client/src/lib/product/navigation/screen-header.tsx)
- `PageHeader` (wide window only) — [packages/client/src/lib/product/page-header.tsx:9-37](../../../../packages/client/src/lib/product/page-header.tsx)
- `SettingsPage` (wide: centred column; phone: just children) — [packages/client/src/lib/product/settings-page.tsx](../../../../packages/client/src/lib/product/settings-page.tsx)
- `HeaderButton` — [packages/client/src/lib/product/header-button.tsx:14-88](../../../../packages/client/src/lib/product/header-button.tsx)
- `ScrollFadeView`, `ScrollFadeList` (LegendList + edge fades) — `packages/client/src/lib/product/scroll-fade/scroll-fade.tsx`, `scroll-fade-list.tsx:111-127`
- `FieldList` (sections as a virtualised list on wide, `FieldGroup` on phone) — `packages/client/src/lib/product/field-list/field-list-view.native.tsx:17-30`, `field-list-view.tsx`
- `FeedMarkdown` (marked lexer to RN views) — `packages/client/src/lib/product/markdown/feed-markdown.tsx`
- `Screen`, `KeyboardAvoidingContent` — `packages/client/src/lib/product/screen/screen.tsx:18-53`

Missing from the repo versus the report's vocabulary table: a grep for avatar/banner finds only the connection feature's own `connection-banner.tsx`, so there is no generic Avatar or Banner primitive. There is no Page/Nav/Properties/Property primitive and no `Stack` layout primitive; layout lives inside each view with Uniwind classes. No file under `docs/adr/` mentions plugins in a design sense (only incidental matches).

### Inferences
- A plugin registry would have to start from about 12 existing primitives that are already mostly data-driven (Button, ListItem, FieldSection/FieldGroup, Picker, Switch, Slider, SegmentedControl, Checkbox, Menu, Alert, Badge, Icon, FieldInput, Spinner, Text) and add new ones for Banner, Properties, Avatar, Stack, Page and Nav.
- The report's `Page`, `Nav`, `Properties` have natural homes in `ScreenHeader`/`SettingsPage`/`FieldGroup` but would be new code.

### Gaps
- I did not read Feed, Composer or Sessions feature components (ADR-0020 says those stay RN views on every platform), so I did not audit them as candidate plugin primitives.
- I did not open every web-only file (Dialog, Select, DropdownMenu, Popover internals); they are `@rn-primitives` based per ADR-0020.

## Q2. For each primitive: iOS vs Android vs web drawing, where the Host is, and sizing

### Takeaway
There is no single Host. Every standalone native control creates its own `Host` (Button, Menu, Picker, Switch, Slider, SegmentedControl, Alert, InfoPopover, BottomSheet, standalone FieldInput), mostly with `matchContents`. Grouped lists use one Host per FieldGroup (iOS: a fill-the-parent Host around a SwiftUI `Form`; Android: an RN `ScrollView` around a vertically content-sized Host around a Compose `Column`). Rows, sections and inputs inside a group are plain SwiftUI/Compose nodes with no Host of their own. Wide windows (a Uniwind breakpoint, not just desktop) swap the native drawing for the web drawing inside the same primitive file.

### Cited Findings
**The Host wrapper.** `Host` from `@expo/ui` wrapped to inject Argo's colour scheme and a Material seed colour; on Android it also wraps children in a `MaterialPalette` — [PRIM/native/host.tsx:17-40](../../../../packages/client/src/lib/generic/primitives/native/host.tsx). `ControlHost` renders a Host only if a parent has not already declared `NativeControl`, so a control inside a row shares the row's Host instead of nesting — [PRIM/native/native-control.tsx:4-23](../../../../packages/client/src/lib/generic/primitives/native/native-control.tsx).

**"Wide" switch.** Native `.ios`/`.android` files call `useWide()` and return the web drawing when true, e.g. `FieldGroup`, `FieldSection`, `ListItem`, `FieldInput`, `FieldRow` — [PRIM/lists/list-item/list-item-view.ios.tsx:25-29](../../../../packages/client/src/lib/generic/primitives/lists/list-item/list-item-view.ios.tsx), [PRIM/fields/field-group/field-group-view.ios.tsx:13-16](../../../../packages/client/src/lib/generic/primitives/fields/field-group/field-group-view.ios.tsx). `useWide` is `useResolveClassNames('hidden wide:flex').display === 'flex'` — [packages/client/src/lib/generic/use-wide/use-wide.ts:3-5](../../../../packages/client/src/lib/generic/use-wide/use-wide.ts).

Per-primitive table (iOS = SwiftUI via `@expo/ui/swift-ui`, Android = Compose via `@expo/ui/jetpack-compose`; "RN" = React Native + Uniwind):

| Primitive | iOS | Android | Web/desktop | Host placement and sizing |
|---|---|---|---|---|
| **Button** | `Button` + `HStack` + `Text` + `ProgressView` (`button-view.ios.tsx:1-14,28-40`) | `Button`/`OutlinedButton`/`FilledTonalButton`/`TextButton` + `Row` + `Text` (`button-view.android.tsx:25-31`) | RN `ContentButton` (`button-view.tsx:1-4`) | One Host per button: `matchContents {vertical:true, horizontal: fullWidth!==true}`, `ignoreSafeArea 'all'` (`button-state.ts:43-51`). `appearance: 'content'` opts into an RN-drawn button instead (`button-native.tsx:14-19`). |
| **ListItem** | `HStack` (static) or `Button` > `HStack`/`VStack` row; list modifiers (`list-item-view.ios.tsx:42-119`, `list-item-row.ios.tsx`) | Compose `Surface` (static) or `Button` > `Column`/`Row` (`list-item-view.android.tsx:33-90`, `list-item-android-row.tsx:33-45`) | RN `View`/`Pressable` with Uniwind classes (`list-item-view.tsx:19-35`) | No Host of its own on phone: must sit under a FieldGroup's Host (inferred, since it returns SwiftUI/Compose nodes). iOS row min height 44, Android 56 (`list-item-row.ios.tsx:20`, `list-item-android-row.tsx:23`). |
| **FieldGroup** | `Host` (flex:1, `matchContents={false}`) > `Form` (grouped) or `List` (navigation) (`field-group-view.ios.tsx:18-39`) | RN `ScrollView` > `Host matchContents {vertical:true}` > Compose `Column` with `spacedBy 24` (`field-group-view.android.tsx:31-42,66-79`). Comment: React Native scrolls, not Compose, so a native sheet can take drags (`:30`). | RN `ScrollView` with Uniwind (`field-group-view.tsx:11-41`) | One Host per group. |
| **FieldSection** | SwiftUI `Section` with header `Text`, footer `Text` (`field-section-view.ios.tsx:19-26`) | Compose `Column` with caption `Text`, rows `Column` clipped with a rounded shape and `spacedBy 1`; `textFields` flag removes card and footer (`field-section-view.android.tsx:24-33,57-64`) | RN `View` with `rounded-2xl` rows and footer `Text` (`field-section-view.tsx:10-24`) | No Host. |
| **FieldRow** | SwiftUI `Section` wrapping `HostedRow` (`RNHostView` around an RN view that reports its height) (`field-row-view.ios.tsx:15-27`, `field-group-row.tsx:11-53`) | `HostedRow` directly (`field-row-view.android.tsx:7-15`) | passthrough | Hosts arbitrary RN content inside a native list; height learned from `onLayout`, initial height from `h-11` (`field-group-row.tsx:12-31`). |
| **FieldInput** | `LabeledContent` + SwiftUI `TextField`, `useNativeState` (`field-input-view.ios.tsx:41-83`) | Compose `TextField` filled field with `Label/Placeholder/SupportingText` slots (`field-input-view.android.tsx:30-35,76-105`) | RN `Input` | Row form has no Host. `StandaloneFieldInput` adds a Host: `matchContents {vertical:true}`, `width:'100%'` (`standalone-native-field.tsx:11-26`). |
| **Picker** | `Menu` + inline `Picker` for up to 7 options, else a `Button` row that drills into a search list (`picker.ios.tsx:8-37`, `picker-menu.ios.tsx:16-27,80-90`) | Compose `Surface` row that opens an `AlertDialog`-style radio dialog (`picker.android.tsx`, `picker-row.android.tsx:1-50`) | `Select` (`@rn-primitives/select`) (`picker.tsx:15-73`) | Own Host per Picker: `matchContents:true` if inside a ListItem (via `useInListItem()` context), else `{vertical:true}` + width 100% (`picker-native.tsx:37-55`). |
| **Switch** | `Toggle` (`switch-view.ios.tsx:14-26`) | Compose `Switch` with Material colour overrides (`switch-view.android.tsx:12-26`) | `@rn-primitives/switch` | `ControlHost matchContents` (shares parent Host when inside `NativeControl`). |
| **Slider** | universal `@expo/ui` `Slider` (SwiftUI on iOS) (`slider-view.ios.tsx:12-25`) | Compose `Slider` (`NativeSlider` import) | custom range input (`slider-view.tsx`) | `ControlHost matchContents {vertical:true}`, width 100%. |
| **SegmentedControl** | SwiftUI `Picker` with `pickerStyle('segmented')` (`segmented-control.ios.tsx:12-20,42-50`) | Compose (file `segmented-control.android.tsx`, not read) | RN | Host: `matchContents {vertical:true}`, width 100% (`segmented-control-host.native.tsx`). |
| **Menu** | `Menu` > inline `Picker` of `Text` tagged options; trigger is RN content in `RNHostView` (`menu.ios.tsx:17-32,48-83`) | Compose `DropdownMenu` with `Trigger`/`Items` (`menu.android.tsx:10-25,48-62`) | `@rn-primitives/dropdown-menu` radio group (`menu.tsx:29-93`) | `Host matchContents` on both phones. |
| **Alert** | `Alert` or (if any action is destructive) `ConfirmationDialog` anchored on an empty `Text` (`alert.ios.tsx:16-26,99-102`) | Compose `AlertDialog`, drawn only while `open` (`alert.android.tsx:12-35`) | `@rn-primitives/dialog`, centred (`alert.tsx:21-27`) | `Host matchContents`. |
| **BottomSheet** | `BottomSheet` (Expo UI) > `RNHostView` > RN `View`/`ScrollView` content (`bottom-sheet.tsx:34-39`, `bottom-sheet-viewport.tsx:7-20`); detents via `presentationDetents` | `ModalBottomSheet` in an absolutely-positioned `Host`; content in `RNHostView` (`bottom-sheet.android.tsx:30-42,101-111`, `bottom-sheet-hosted-content.android.tsx:28-39`) | custom `.web.tsx` sheet | `Host matchContents` (iOS); `Host position:absolute, pointerEvents none` (Android). With `size:'form'` and a router context it renders `null` and routes the content into an expo-router form-sheet screen (`bottom-sheet.tsx:27-31`, `form-sheet/form-sheet.tsx:4-19`). |
| **InfoPopover** | SwiftUI `Popover` with an RN trigger (`info-popover.ios.tsx:15-27`) | `.android.tsx` (not read) | Radix-style popover | `Host matchContents`. |
| **Checkbox** | SwiftUI `Button` row with `NativeSymbol` (`checkbox.ios.tsx`) | `.android.tsx` (not read) | `@rn-primitives` | Host (`createNativeCheckbox`). |
| **Text** | RN `Text` with Uniwind `type-*` role classes on every platform (`text.tsx:8-26,67-79`) | same | same | n/a. Inside a SwiftUI/Compose tree, native `Text` is used instead and styled with `useSwiftUITextModifiers`/`useComposeTextStyle` (`native-typography.ts:37-50`). |
| **Badge** | RN `View`+`Text` with Uniwind (`badge.tsx:55-110`) | same | same | n/a. Inside a native row it is an RN view in an `RNHostView` (accessory path). |
| **Icon** | `expo-symbols` `SymbolView` through `SymbolGlyph`; inside SwiftUI trees `NativeSymbol` uses SwiftUI `Image` (`SYM/native-symbol.ios.tsx:19-32`) | `SymbolView` with Material font; inside Compose trees `NativeSymbol` wraps the RN `Icon` in `RNHostView` (`SYM/native-symbol.tsx:18-29`) | Material font, or macOS SF images over IPC | n/a |
| **Spinner** | RN `ActivityIndicator` everywhere (`spinner.tsx`) | same | same | n/a |

Where primitives use `@expo/ui` universal (`from '@expo/ui'`): only `Host`, `RNHostView`, `Row` (hosted row), `Slider` (iOS only) and the dead `hosted-field-group.native.tsx` — grep over `PRIM`. Everything else imports `@expo/ui/swift-ui` or `@expo/ui/jetpack-compose` in platform files. Counts of `@expo/ui` imports by folder: ListItem 9, Picker 8, BottomSheet 7, `native/` 6, FieldInput 5, Menu 4, FieldGroup 4 (grep, `packages/client/src`).

**Argo draws its own content in RN, not natively** — Feed, Session rows, Composer, request cards, code, badges, chips, icon buttons stay RN+Uniwind on every platform — [docs/adr/0020-argo-owns-its-primitives.md](../../../adr/0020-argo-owns-its-primitives.md) ("Argo draws its own content").

**Android FieldGroup/FieldSection/ListItem are Argo's own Compose compositions, not Expo UI's FieldGroup**, because Expo's matches sections by component identity and nests ListItems wrongly — same ADR, section "Why Android does not use Expo UI's FieldGroup".

**Headers are not primitives that draw.** `ScreenHeader` is a component that renders `null` or calls a context-supplied component; the app's `NativeScreenHeader` sets `Stack.Screen` options (`headerRight`/`unstable_headerRightItems`, `headerSearchBarOptions`) — [packages/client/src/lib/product/navigation/screen-header.tsx:49-75](../../../../packages/client/src/lib/product/navigation/screen-header.tsx), [apps/universal-app/src/navigation/native-screen-header.ios.tsx:20-41](../../../../apps/universal-app/src/navigation/native-screen-header.ios.tsx), [apps/universal-app/src/navigation/header-right-items.tsx:10-27](../../../../apps/universal-app/src/navigation/header-right-items.tsx).

**Scroll views and fades.** `ScrollFadeView` and `ScrollFadeList` are RN `ScrollView`/`LegendList` inside `ScrollFadeFrame`, which overlays reanimated edge gradients in the surface colour — [packages/client/src/lib/product/scroll-fade/scroll-fade.tsx:11-23](../../../../packages/client/src/lib/product/scroll-fade/scroll-fade.tsx), [scroll-fade-list.tsx:111-127](../../../../packages/client/src/lib/product/scroll-fade/scroll-fade-list.tsx), [scroll-fade-frame-view.tsx:117-130](../../../../packages/client/src/lib/product/scroll-fade/scroll-fade-frame-view.tsx). The phone Settings lists do not use LegendList at all; they use the native Form/Column of `FieldGroup`, with LegendList only for the wide window — [packages/client/src/lib/product/field-list/field-list-view.native.tsx:13-30](../../../../packages/client/src/lib/product/field-list/field-list-view.native.tsx).

**Theme bridge.** Native controls read Argo's Uniwind tokens through `useNativeTheme()` (`tint`, `muted`, `destructive`, ...) and convert them to Swift/Compose colours — [packages/client/src/lib/generic/native-theme.ts:6-60](../../../../packages/client/src/lib/generic/native-theme.ts). A plugin tree that names only tokens/enums would fit this; there is no `className` on native-drawn primitives (ADR-0020: "Data props, not children").

### Inferences
- Host cost model: a page of 10 standalone Buttons would be 10 Hosts; a plugin page that renders many small controls outside a FieldGroup could create many native views (not measured).
- Because `useWide()` is breakpoint-based, an iPad or a wide window shows the RN drawing from the same primitive file; a plugin author would not see the difference, but QA matrix grows (phone native vs wide RN).
- iOS FieldGroup is a `Form` that SwiftUI sizes lazily; a plugin could safely emit hundreds of rows only through this path or through `ScrollFadeList` on wide (inferred from the field-list comment "which renders its rows lazily").

### Gaps
- I did not read `segmented-control.android.tsx`, `checkbox.android.tsx`, `info-popover.android.tsx`, `slider-view.android.tsx` in full; the table cells are from imports and the grep output.
- I did not verify any behaviour on a simulator.

## Q3. Composition: which primitives take children, do children cross RN and SwiftUI/Compose, and what breaks with dynamic children?

### Takeaway
Children cross the boundary in both directions, but only through three mechanisms: `RNHostView` (RN inside SwiftUI/Compose), the `NativeControl` shared-Host trick (controls inside a row), and nested `Host` (a Picker inside a ListItem accessory creates a Host inside an `RNHostView` inside the group's Host). Most children are typed `ReactNode` or `ReactElement`. Argo's FieldGroup/FieldSection accept any React component that eventually renders native nodes, so mapped arrays and conditional rows work, but Android row heights are measured after layout and wide windows key rows by `row.key ?? index`.

### Cited Findings
**FieldGroup children.** iOS passes `children` straight to a SwiftUI `Form` or `List`; Android puts `{search}{children}` in a Compose `Column` — [PRIM/fields/field-group/field-group-view.ios.tsx:28-40](../../../../packages/client/src/lib/generic/primitives/fields/field-group/field-group-view.ios.tsx), [field-group-view.android.tsx:67-79](../../../../packages/client/src/lib/generic/primitives/fields/field-group/field-group-view.android.tsx). `FieldGroupProps.children` is `ReactNode`; also `variant: 'grouped'|'navigation'`, `fit`, `search: ListSearchBarProps` (Android only), `onContentHeightChange` — [PRIM/fields/field-props.ts:7-16](../../../../packages/client/src/lib/generic/primitives/fields/field-props.ts).

**Custom components between group and section work.** `ProjectSections` renders `FieldGroup` containing custom components `NewSessionsSection` and `RemoveProject`, which render `FieldSection`; and `ProjectSections` has `{otherDevice ? <ListItem .../> : null}` and `BaseBranchRow` returning `null` conditionally — [packages/client/src/features/settings/components/project-detail-view/project-detail-view.tsx:99-119](../../../../packages/client/src/features/settings/components/project-detail-view/project-detail-view.tsx), [project-detail-new-sessions.tsx:40-60](../../../../packages/client/src/features/settings/components/project-detail-view/project-detail-new-sessions.tsx). So conditional and wrapped rows are normal on both phones.

**A dead-code counterexample.** `hosted-field-group.native.tsx` builds sections by `Children.toArray(...).filter(isValidElement)` and re-wraps every child row in `HostedRow`; that version would break on wrapper components. A grep for `hosted-field-group` across `packages` and `apps` finds no importer (only itself), so it appears unused — [PRIM/fields/field-group/hosted-field-group.native.tsx:63-90](../../../../packages/client/src/lib/generic/primitives/fields/field-group/hosted-field-group.native.tsx).

**FieldSection.** Takes `children`, `title`, `footer`, `footerTone`, `textFields` — [PRIM/fields/field-props.ts:18-29](../../../../packages/client/src/lib/generic/primitives/fields/field-props.ts). `textFields` is a hint the caller sets because the section "holds FieldInputs" (Android draws bare Material fields, no card, no footer). That is a prop that depends on what the children are.

**ListItem slots are React elements.** `leading`, `valueLeading`, `accessory`, `control`, `detail` are `ReactElement`; `ref`, `onHoverIn/Out` (RN Pressable types), `aria-*`, `id` also present — [PRIM/fields/field-props.ts:48-94](../../../../packages/client/src/lib/generic/primitives/fields/field-props.ts). On native:
- `leading`, `valueLeading` and `accessory` are drawn in `RNHostView matchContents` (RN inside SwiftUI/Compose) — [PRIM/lists/list-item/native-row.tsx:28-67](../../../../packages/client/src/lib/generic/primitives/lists/list-item/native-row.tsx).
- `control` and `detail` are wrapped in `NativeControl` so a Switch or Slider reuses the row's Host: `{props.control && <NativeControl>{props.control}</NativeControl>}` and `NativeRowDetail` inside `VStack`/`Column` — same file `:79,97-135`.
- A Picker passed as `accessory` creates its own `Host` inside the `RNHostView`, sized with `matchContents` because `useInListItem()` is true — [PRIM/inputs/picker/picker-native.tsx:37-55](../../../../packages/client/src/lib/generic/primitives/inputs/picker/picker-native.tsx), [project-detail-new-sessions.tsx:29-36](../../../../packages/client/src/features/settings/components/project-detail-view/project-detail-new-sessions.tsx), [list-item-accessory.tsx:8-20](../../../../packages/client/src/lib/generic/primitives/lists/list-item/list-item-accessory.tsx).

**Menu.** `trigger: ReactElement` is RN content hosted in `RNHostView` on both phones and made `pointerEvents="none"` (the native menu owns taps) — [PRIM/overlays/menu/menu.ios.tsx:48-60](../../../../packages/client/src/lib/generic/primitives/overlays/menu/menu.ios.tsx), [menu-trigger.android.tsx:6-55](../../../../packages/client/src/lib/generic/primitives/overlays/menu/menu-trigger.android.tsx). `choices` is a flat list `{value,label}`: single-select radio menu only (no icons, sub-menus, dividers, action items).

**BottomSheet content.** `children: ReactNode` is RN inside `RNHostView` inside the sheet's Host (iOS), or `RNHostView` inside `ModalBottomSheet` inside an absolute Host (Android). A FieldGroup inside a sheet therefore nests Host > SwiftUI sheet > RNHostView > RN `View` > FieldGroup Host > `Form` — [PRIM/overlays/bottom-sheet/bottom-sheet-viewport.tsx:7-20,36-50](../../../../packages/client/src/lib/generic/primitives/overlays/bottom-sheet/bottom-sheet-viewport.tsx), [bottom-sheet-hosted-content.android.tsx:28-39](../../../../packages/client/src/lib/generic/primitives/overlays/bottom-sheet/bottom-sheet-hosted-content.android.tsx). Sheet content that scrolls itself passes `contentScrolls` (`bottom-sheet.types.ts:16-17`) so the group's scroll and the sheet's do not clash. In the routed form-sheet path the sheet's `children` are kept in a context and rendered by a different route, `FormSheetRoot`/`FormSheetChoices` — [PRIM/overlays/form-sheet/form-sheet-page.tsx:18-60](../../../../packages/client/src/lib/generic/primitives/overlays/form-sheet/form-sheet-page.tsx), [form-sheet.tsx:4-19](../../../../packages/client/src/lib/generic/primitives/overlays/form-sheet/form-sheet.tsx).

**Things that depend on children identity, keys or counts:**
- iOS `ListItem` is keyed by a theme token so SwiftUI discards cached separator tint: `<NativeRow key={colors.separator} .../>` — [PRIM/lists/list-item/list-item-view.ios.tsx:23-34](../../../../packages/client/src/lib/generic/primitives/lists/list-item/list-item-view.ios.tsx).
- Android `HostedRow` initialises its height from the `h-11` token then updates it from `onLayout` state; a row whose content changes height re-measures after layout (so there can be a one-frame mismatch; inferred) — [PRIM/fields/field-group/field-group-row.tsx:11-31,49-53](../../../../packages/client/src/lib/generic/primitives/fields/field-group/field-group-row.tsx).
- Android FieldGroup's `Host` has no viewport measurement because it would "cap the rows at the screen's height and clip a longer list" (comment at `field-group-view.android.tsx:36`). Row count growth is therefore safe, but the content-size callback `onContentHeightChange` is the only way a sheet fits it (`:44-64`).
- Wide `FieldList` flattens sections to entries keyed by `` `${key}:${row.key ?? index}` `` and rows must be `ReactElement` with their own keys — [packages/client/src/lib/product/field-list/field-list-entries.ts:3-8,30-41](../../../../packages/client/src/lib/product/field-list/field-list-entries.ts). A plugin row without a stable id would key by index.
- `Alert` on Android renders nothing while closed; on iOS the `Alert` stays mounted with an empty anchor `Text` — [alert.android.tsx:12-20](../../../../packages/client/src/lib/generic/primitives/overlays/alert/alert.android.tsx), [alert.ios.tsx:99-102](../../../../packages/client/src/lib/generic/primitives/overlays/alert/alert.ios.tsx).
- `Picker` picks `NativeMenuPicker` for 7 or fewer options and a drill-in row beyond that, so a changing option count changes the control kind — [PRIM/inputs/picker/picker.ios.tsx:8,29-37](../../../../packages/client/src/lib/generic/primitives/inputs/picker/picker.ios.tsx).
- Text and Badge are RN views. Dropped directly into an iOS `Form` or Compose `Column` as children they would need an `RNHostView` or the `FieldRow` wrapper; the repo does this wrapping explicitly (`FieldRow`) rather than automatically (inferred from `field-row-view.ios.tsx:11-27`).

**Wide-window children** are plain RN: `FieldSection` and `ListItem` web drawings use `FieldRowEnd`, `FieldRowCorners`, `FieldRowHover` React contexts that the `FieldList` virtualised path supplies because LegendList wraps each row in its own container (`field-layout.ts:18-42`). A plugin list on wide that bypasses `FieldList` and just nests `ListItem`s inside `FieldSection` uses CSS (`overflow-hidden rounded-2xl`) instead.

### Inferences
- A JSON-tree renderer must preserve "rows live inside FieldSection inside FieldGroup" as a type rule. Rendering a `ListItem` node at the page root on a phone would put SwiftUI/Compose nodes outside any `Host` and probably fail (inferred from `ListItem.ios` returning `HStack`/`Button` with no Host).
- Node types should be grouped into "native-list children" (ListItem, FieldInput, Picker, Switch row, FieldRow) and "free-standing" (Button, Badge, Text, Menu, etc.), and the registry should wrap or reject accordingly. Today the app code, not the primitives, enforces this.
- Mapped arrays and changing counts are fine at the React level because FieldGroup is a thin wrapper over SwiftUI/Compose children. The risk is Android row heights and wide `FieldList` keys; stable node ids as React keys (as the report proposes) cover both.
- Any slot typed `ReactElement`/`ReactNode` (ListItem `leading`/`accessory`/`control`/`detail`, Menu `trigger`, BottomSheet `footer`/`trigger`, SearchField `title`/`actions`, ScreenHeader `left`/`right`) needs a restricted child set in a plugin tree (e.g. `accessory` accepts only Badge or Avatar nodes), because arbitrary child trees there cross the RN-inside-native boundary.

### Gaps
- I did not trace Expo UI's reconciliation of SwiftUI children by key (inside `@expo/ui`), so I cannot say whether reordering rows preserves native row state.
- No test run for 100+ dynamic rows on a device.

## Q4. Are props plain data, or ReactNodes, render functions and style objects? Which need a data-only variant?

### Takeaway
The core input and overlay primitives already have data-only props (Picker, Menu, SegmentedControl, Slider, Alert, Checkbox, Button, FieldInput, InfoPopover, Spinner). ListItem, BottomSheet, SearchField, Switch, Text, Badge, IconButton and ScreenHeader mix data with ReactNodes, RN style types, refs or RN `ComponentProps`. Callbacks are everywhere; for a JSON tree each becomes an event id.

### Cited Findings
**Already plain-data (strings, enums, booleans, arrays of `{value,label}`, callbacks only):**
- `ButtonDataProps`: `label`, `icon: IconName`, `variant` (`default|outline|secondary|ghost|link`), `role: 'destructive'`, `size`, `fullWidth`, `loading`, `disabled`, `onPress`, `accessibilityLabel`, `testID`; `children`, `className`, `style` typed `never`. The extra `appearance: 'content'` form adds `leading/trailing: ReactElement`, `className`, `style`, `ref` — [PRIM/buttons/button/button-props.ts:15-51](../../../../packages/client/src/lib/generic/primitives/buttons/button/button-props.ts).
- `PickerProps<Value extends string>`: `label`, `required`, `value`, `options: {value,label,disabled?,supportingText?}[]`, `onChange`, `placeholder`, `disabled`, `invalid`, `errors`, `hint`, `loading`, `error`, `appearance`, `onBlur` — [PRIM/inputs/picker/picker-props.ts:1-25](../../../../packages/client/src/lib/generic/primitives/inputs/picker/picker-props.ts).
- `MenuProps`: `accessibilityLabel`, `value`, `choices[]`, `onValueChange`, `disabled`, plus `trigger: ReactElement` — [PRIM/overlays/menu/menu-props.ts:3-10](../../../../packages/client/src/lib/generic/primitives/overlays/menu/menu-props.ts).
- `SegmentedControlProps`, `SliderProps` (numbers + labels), `CheckboxProps`, `AlertProps` (`open`, `onOpenChange`, `title`, `message`, `actions[{label, role, onPress}]`), `InfoPopoverProps` (`accessibilityLabel`, `text`), `SpinnerProps` (`label`), `Toast` (`title`, `message`, `tone`) — files named in Q1; e.g. [PRIM/overlays/alert/alert-props.ts:1-18](../../../../packages/client/src/lib/generic/primitives/overlays/alert/alert-props.ts), [PRIM/inputs/slider/slider-props.ts:1-10](../../../../packages/client/src/lib/generic/primitives/inputs/slider/slider-props.ts), [PRIM/inputs/segmented-control/segmented-control-props.ts:1-7](../../../../packages/client/src/lib/generic/primitives/inputs/segmented-control/segmented-control-props.ts).
- `FieldInputProps`: `label`, `value`, `onChange`, `onBlur`, `placeholder`, `errors`, `hint`, `mono`, `disabled`. `FieldErrors` is `readonly (string | {message} | undefined)[]` — [PRIM/fields/field-props.ts:32-46](../../../../packages/client/src/lib/generic/primitives/fields/field-props.ts), [field-errors.ts:1-11](../../../../packages/client/src/lib/generic/primitives/fields/field-errors.ts).
- ADR-0020 sets the policy: native-drawn primitives take `label`, `value`, `options` and similar props and no `className`.

**Mixed props (a data-only variant would be needed):**
- `ListItemProps`: data fields `title`, `value`, `subtitle {text, code}`, `icon: IconName`, `disclosure`, `selected`, `disabled`, `status {tone,label}`, `needsAttention`, `loading`, `code`, `tone`, `size: 'large'`, `href`, `checked`, `role`; React fields `leading`, `valueLeading`, `accessory`, `control`, `detail` (ReactElement), `ref`, `onHoverIn/Out`, `aria-*` — [PRIM/fields/field-props.ts:48-94](../../../../packages/client/src/lib/generic/primitives/fields/field-props.ts).
- `BottomSheetProps`: `style?: StyleProp<ViewStyle>`, `trigger: ReactElement`, `footer: ReactNode`, `children: ReactNode`, plus enums (`size`, `surface`, `initialSize`) and booleans — [PRIM/overlays/bottom-sheet/bottom-sheet.types.ts:4-25](../../../../packages/client/src/lib/generic/primitives/overlays/bottom-sheet/bottom-sheet.types.ts).
- `SwitchProps` is `React.ComponentProps<typeof SwitchPrimitives.Root> & {size}`, so it inherits `className`, `style`, `asChild`, etc. — [PRIM/inputs/switch/switch-props.ts:1-6](../../../../packages/client/src/lib/generic/primitives/inputs/switch/switch-props.ts). Native drawings read only `checked`, `onCheckedChange`, `disabled`, `accessibilityLabel`.
- `Text`: RN `Text` props + `role` (title, heading, body, secondary, control, badge, code, nav-title, nav-action), `semanticRole`, `asChild`, `className` — [PRIM/display/text/text.tsx:8-36](../../../../packages/client/src/lib/generic/primitives/display/text/text.tsx).
- `Badge`: `React.ComponentProps<typeof View>` + `tone` (`muted|info|success|warning|destructive`), `variant`, `asChild`, `className` — [PRIM/display/badge/badge.tsx:55-80](../../../../packages/client/src/lib/generic/primitives/display/badge/badge.tsx). It has the token-style `tone` enum the report wants but children are the label text.
- `IconButtonProps`: RN Pressable props plus `icon`, `accessibilityLabel`, `size`, `variant`, `iconClassName`, `iconWeight` — [PRIM/buttons/icon-button/icon-button-props.ts:1-28](../../../../packages/client/src/lib/generic/primitives/buttons/icon-button/icon-button-props.ts).
- `SearchFieldProps`: `label`, `value`, `onChangeText`, plus `title: ReactNode`, `actions?: ReactNode` — [PRIM/inputs/search-field/search-field.tsx:13-21](../../../../packages/client/src/lib/generic/primitives/inputs/search-field/search-field.tsx).
- `ScreenHeaderProps`: `title`, `left?: ReactNode`, `right?: ReactElement[]`, `search {placeholder, onChangeText, action {icon, accessibilityLabel, onPress}}`; `HeaderButtonProps`: `icon`, `accessibilityLabel`, `onPress`, `paired`, `dot: 'attention'|'filter'` — [screen-header.tsx:12-32](../../../../packages/client/src/lib/product/navigation/screen-header.tsx), [header-button.tsx:14-25](../../../../packages/client/src/lib/product/header-button.tsx).
- `PageHeaderProps`: `title: ReactNode`, `actions?: ReactNode` — [page-header.tsx:9-16](../../../../packages/client/src/lib/product/page-header.tsx).
- `FieldListSection`: `title`, `footer`, `rows: readonly ReactElement[]` — [field-list-entries.ts:3-8](../../../../packages/client/src/lib/product/field-list/field-list-entries.ts).
- `ScrollFadeListProps<T>` = `LegendListProps<T>` (`renderItem` function, `data`, refs) + fade options (`edges`, `surfaceClassName`, `depth`, `inset`) + `maxHeight` — [scroll-fade-list.tsx:37-42](../../../../packages/client/src/lib/product/scroll-fade/scroll-fade-list.tsx). `ScrollFadeView` = `ScrollViewProps & ScrollFadeOptions`. These take style/class strings and render functions, so a plugin cannot pass them as data; the plugin node would be a "List" node whose children are keyed nodes, and the registry would supply `renderItem`.
- `LiquidGlassProps`: `fallbackClassName`, `className`, `children` — a style-carrying primitive that should not be exposed to plugins.
- `FeedMarkdown`: `text`, `streaming`, `variant` (`feed|proposal|summary`) — already data-only, string in — [feed-markdown.tsx:7-12,19-35](../../../../packages/client/src/lib/product/markdown/feed-markdown.tsx).

**Renderability verdict per primitive (inferred from the props above)**

| Primitive | Data-only today? | What a plugin node would need |
|---|---|---|
| Button, Picker, Menu (choices only), SegmentedControl, Slider, Checkbox, Alert, InfoPopover, Spinner, FieldInput, Toast | yes | callbacks become event ids; Menu `trigger` must become a node or a fixed label+icon |
| ListItem | mostly | strip `ref`, hover handlers, `aria-*`; replace `leading`, `valueLeading`, `accessory`, `control`, `detail` with restricted child nodes (Badge, Icon, Switch, Slider, Picker) |
| FieldGroup, FieldSection | yes for data (`variant`, `title`, `footer`, `footerTone`) | children restricted to rows; `textFields` should be inferred, `search` is Android-only config |
| Switch | needs a small data variant (`checked`, `disabled`, `accessibilityLabel`) | do not expose `className/style` from `ComponentProps<Root>` |
| Text, Badge | need a data variant (`text` or children string, `role`/`tone`) | no `className/asChild` |
| Icon | data (`name`, `role`, `filled`) but `name` must be validated (see Q5) | `className`, `weight` not exposed |
| BottomSheet / Dialog | needs a data variant | `open`, `onOpenChange`, `label`, `size`, `fit`, `footer`, `children`; no `style`, `trigger` as element |
| ScreenHeader / HeaderButton | needs a data variant (title, `actions[{icon,label,id,dot}]`, search config) | rendered through context, not by a plugin node tree directly |
| SearchField, PageHeader | need data variants | `title/actions` ReactNodes -> typed children or strings |
| ScrollFadeView/List, FieldList | no | a "List" node with keyed children; fade, `estimatedItemSize`, `getItemType` set by the registry |
| LiquidGlass, NativeOnlyAnimatedView, RichTextarea, Collapsible (RN-primitives props), Popover/Portal | no | keep internal |

### Inferences
- A rule of thumb for a plugin catalog: each node's props are exactly the intersection of the primitive's data fields; everything typed `ReactNode`, `ReactElement`, `StyleProp`, `className`, `ref`, `onHover*`, `aria-*` is excluded or replaced by a typed child list.
- The code already separates "data" from "content" in Button (`appearance: 'content'` vs `'system'`), so a similar split (`system` only) is the natural plugin surface.

### Gaps
- I did not read every `*-props.ts` (Checkbox beyond lines 1-40, IconButton rendering, Input/Textarea/Select/Collapsible props).

## Q5. Icons: how do names map to SF Symbols and Material, and can a plugin name an icon by string?

### Takeaway
An icon is a string key of a closed map, `iconSymbols`, typed `IconName`. A runtime list `iconNames` is exported, so a registry can validate a plugin's string. Unknown names are not handled by `Icon` (it indexes the map directly), so the registry must validate first. Arbitrary SF or Material names are not possible: Android's glyph font is subset to the map, and iOS names are type-checked and limited to SF Symbols 4 plus Argo's custom asset-catalog symbols.

### Cited Findings
`iconSymbols` is built from four spreads (`fileSymbols`, `formatSymbols`, `statusSymbols`) and an inline list; each entry is `{ sf, sfFilled?, material }`, `as const satisfies Record<string, SymbolSource>`; `IconName = keyof typeof iconSymbols`; `iconNames` is the runtime key list (`isIconName` is declared but not exported) — [SYM/icon-names.ts:1-9,138-152](../../../../packages/client/src/lib/generic/symbols/icon-names.ts). Roughly 140 names in total (grep count of entry lines: 105 in `icon-names.ts`, 15 file, 7 format, 13 status; approximate).

`SymbolSource`: `sf: AppleSymbol` (SF name or `custom.<name>`), `sfFilled`, `material: AndroidSymbol`; SF names must stay within SF Symbols 4 (iOS 16.4) — [SYM/symbol-source.ts:1-9](../../../../packages/client/src/lib/generic/symbols/symbol-source.ts).

`Icon` component: `IconProps { name: IconName; role: IconRole; filled?; className?; weight?; testID? }`; it does `const symbol = iconSymbols[name]` then `appleSymbol(symbol, filled)` with no existence check — [SYM/icon.tsx:25-60](../../../../packages/client/src/lib/generic/symbols/icon.tsx). Passing an unknown string would reach `symbol.material` of `undefined` (inferred crash).

Roles instead of sizes: `body 16/20`, `secondary 12/16`, `control 16/16`, `mark 14/14`, `row 20/24`, `action 20/20`, `nav 24/24`, `title 24/24` (wide/phone) — [SYM/icon-role.ts:7-30](../../../../packages/client/src/lib/generic/symbols/icon-role.ts). `argo/icon-role` lint rule bans sizes (ADR-0019).

Native trees cannot hold the RN `Icon`:
- iOS SwiftUI trees use `NativeSymbol` = SwiftUI `Image` with `systemName` or `assetName` for `custom.*` — [SYM/native-symbol.ios.tsx:12-32](../../../../packages/client/src/lib/generic/symbols/native-symbol.ios.tsx).
- Android Compose trees use `NativeSymbol` = `RNHostView` around the RN `Icon` — [SYM/native-symbol.tsx:18-29](../../../../packages/client/src/lib/generic/symbols/native-symbol.tsx).
- ADR-0020 notes that custom symbols (e.g. `custom.robot`) cannot render in SwiftUI `Image` as system symbols, so native rows draw Argo's `Icon` in an `RNHostView` for those; disclosure chevrons stay system-drawn.

ADR-0019: SF Symbols on iOS, Material Symbols on Android/web; macOS Electron draws SF Symbols at runtime through IPC with a validated request; custom symbols are paths in `custom-symbol-paths.json` written to the iOS asset catalog by the Expo plugin `with-custom-symbols.mjs`; filled variants use a bundled Material filled font "subset to Argo's icon map" (`SYM/assets/material-filled.ttf`) — [docs/adr/0019-icons-are-native-symbols.md](../../../adr/0019-icons-are-native-symbols.md).

The patch to `expo-symbols` makes `SymbolView` fall back to `UIImage(named:)` for custom names, and disables Android font scaling on the glyph — [patches/README.md](../../../../patches/README.md) (expo-symbols section).

### Inferences
- A plugin can safely name an icon by a string restricted to `IconName` (~140 values), validated server-side against a generated copy of `iconNames` and again in the registry before calling `Icon`. This also means the vocabulary is closed at build time: adding an icon for a plugin needs an Argo release (map entry, SF name check, Material name check, font subset, possibly an asset-catalog symbol).
- The report's example `icon: { name: "status-in-progress" }` and `"cloud-rain"`, `"calendar"` are not in the map: `status-in-progress` does not exist in `status-symbols.ts` (has `pending`, `passed`, `failed`, ...), and I did not see `cloud-rain` or `calendar` (`cycle` uses `calendar.badge.clock`). The report's examples need either new entries or different names.
- Plugin-supplied bitmaps/SVGs would need a new primitive (e.g. Image or Avatar), not the icon map.

### Gaps
- I did not diff the Android font subset against the icon map; ADR-0019 states it, I did not verify the build step.
- Did not check whether other keys in `icon-names.ts` collide with likely plugin names.

## Q6. Patches, native modules and versions

### Takeaway
On `main`, `@expo/ui@57.0.22`, `expo-symbols@57.0.3`, `react-native@0.86.3`, `xstate@5.33.2` and `node-pty@1.1.0` are patched. The `@expo/ui` patch changes Android Kotlin and types (cornerRadius/borderWidth/borderColor on DropdownMenu, a `clearSemantics` modifier, an `onWindowInsetsChanged` modifier, and a ModalBottomSheet expand fix). An unmerged branch `spec-648/remove-expo-ui-patch` (commit 3fca120d, 2026-10-14) removes the `@expo/ui` patch. The user memory file says it was removed the same day; main does not yet contain it.

### Cited Findings
Patched dependencies: `"@expo/ui@57.0.22"`, `expo-symbols@57.0.3`, `node-pty@1.1.0`, `react-native@0.86.3`, `xstate@5.33.2` — [pnpm-workspace.yaml:168-173](../../../../pnpm-workspace.yaml).

Versions: catalog `"@expo/ui": 57.0.22` (`pnpm-workspace.yaml:35`); `expo: ~57.0.26` (`:99`), `expo-router ~57.0.24` (`:105`), `expo-symbols ~57.0.3` (`:108`), `react-native 0.86.3` (`:118`), `react-native-reanimated 4.5.1` (`:122`), `@legendapp/list 3.6.0` (`:18`). Installed in `apps/universal-app/node_modules`: `@expo/ui` 57.0.22, `expo` 57.0.26 (`package.json` "version" fields). The ADR text says "SDK 57" ([ADR-0020](../../../adr/0020-argo-owns-its-primitives.md)).

`@expo/ui` patch contents (`patches/@expo__ui@57.0.22.patch`, 222 lines): `ModalBottomSheetView.kt` (expand after first visible state), `ModifierRegistry.kt` (new `clearSemantics`, `onWindowInsetsChanged` modifiers), `menu/DropdownMenu.kt` and `DropdownMenuRecords.kt` (corner radius, border), plus matching `build/*.d.ts` and `src/*` TypeScript. `patches/README.md` says Android autolinking compiles `expo-ui` from source so the Kotlin patch applies and removal "requires rebuilding the Android development client" — [patches/README.md](../../../../patches/README.md), [patches/@expo__ui@57.0.22.patch:1-222](../../../../patches/@expo__ui@57.0.22.patch). Uses in primitives: `clearSemantics` in `list-item-android-row.tsx:8,59,89` and `list-item-view.android.tsx`; Android Menu passes none of the corner props (README).

Branch state: `git merge-base --is-ancestor 3fca120d main` -> not in main; branch `origin/spec-648/remove-expo-ui-patch`, commit "Remove the @expo/ui patch; use stock Expo UI on Android", dated 2026-10-14. The user's memory index says "whole @expo/ui patch removed 2026-10-14; never re-add; ask before touching other patches" — this conflicts with `main` having the patch; most likely the removal is on the branch and not yet merged (inferred).

Other patches: `react-native` adds `blockquote`/`code` to `Role` types (web only); `xstate` graph types; `expo-symbols` as above — [patches/README.md](../../../../patches/README.md).

Expo UI components Argo relies on (from imports): SwiftUI — `Host`(universal), `Button`, `HStack`, `VStack`, `Text`, `Menu`, `Picker`, `Toggle`, `Section`, `Form`, `List`, `LabeledContent`, `TextField`, `Image`, `ProgressView`, `Popover`, `Alert`, `ConfirmationDialog`, `BottomSheet`, `RNHostView`, `Group`, `Spacer`; Compose — `Button`, `OutlinedButton`, `FilledTonalButton`, `TextButton`, `Row`, `Column`, `Surface`, `Text`, `TextField`, `Switch`, `Slider`, `DropdownMenu`, `AlertDialog`, `ModalBottomSheet`, `CircularProgressIndicator`, `RNHostView`; plus the modifier libraries for both. Several modifiers (`listRowInsets`, `alignmentGuide`, `presentationDetents`, `semantics`, ...) are used heavily — grep of imports across `packages/client/src`.

ADR-0020 itself documents Expo UI limits in SDK 57: styles are in a `StyleSheet`, shared `style` limited to padding/background/radius/border/opacity/width/height, no `className`, Button has three variants, colours are CSS variables on web — [docs/adr/0020-argo-owns-its-primitives.md](../../../adr/0020-argo-owns-its-primitives.md).

### Inferences
- Because the phone UI relies on modifier objects (`listRowInsets`, `semantics`, `frame`, ...) produced in JS and serialised across the bridge, the registry layer should never accept modifiers or colours from plugins; they are fixed inside each primitive.
- The `@expo/ui` patch affects only Android Kotlin features that are Argo-internal (menu shape, semantics, window insets); it does not constrain a plugin catalog. If the branch lands, the Android dev client must be rebuilt.

### Gaps
- I did not inspect `node_modules/@expo/ui` source to list its full component set or check which SwiftUI/Compose components exist beyond what Argo imports (that is a different researcher's scope).
- I could not confirm from the repo whether the user memory's "removed" statement refers to this branch or another one; only the branch evidence above.

## Q7. Storybook: are primitives rendered from props, so JSON fixtures would be easy?

### Takeaway
Storybook renders views from plain typed props fixtures and spies (ADR-0021). Primitive stories are hand-written JSX compositions called `Variations`, not data-driven, but the data-only primitives (Picker, Menu, Alert, Button, ...) are driven entirely by props and could take JSON fixtures after a registry exists. No tRPC or fixture-by-procedure layer exists to reuse.

### Cited Findings
ADR-0021: "A connected screen is two files": thin screen shell and a view that "takes props only. Storybook renders views from plain props fixtures and callback spies" — [docs/adr/0021-storybook-renders-views-from-props.md](../../../adr/0021-storybook-renders-views-from-props.md). Stories may not import tRPC, TanStack Query or data hooks (oxlint enforced).

Storybook rules: one `Variations` presentation story per primitive, titles by folder (`Design System/Primitives/<Name>`), play functions only in `*.test.stories.tsx`, no style assertions in tests, fixtures beside their story, shared harness exported as `@repo/client/storybook` — [docs/agents/storybook.md](../../../agents/storybook.md).

Examples: `ListItem` story renders `GroupedRows` and `SidebarRows` mocks (`PRIM/lists/list-item/list-item.stories.tsx`, `meta.title: 'Design System/Primitives/ListItem'`, `parameters: { screenPreview: true }`); `FieldGroup` story hand-builds `<FieldGroup><FieldSection title="Server"><ListItem .../></FieldSection>...` with `action('open list item')` spies — [PRIM/fields/field-group/field-group.stories.tsx:1-60](../../../../packages/client/src/lib/generic/primitives/fields/field-group/field-group.stories.tsx).

Two Storybook hosts: web (`apps/storybook`, `@storybook/react-native-web-vite` 10.6.1, CI-run) and on-device (`apps/universal-app/.rnstorybook`, dev-only route `src/app/(dev)/storybook.tsx`, `@storybook/react-native` 10.6.0) — ADR-0021 and `pnpm-workspace.yaml:74-75`. "There is no native CI (ADR-0011), so a primitive's iOS and Android drawings are checked in the iOS and Android Storybook previews" — docs/agents/storybook.md.

### Inferences
- A JSON-tree renderer could get one story per fixture file easily: it would be a view that takes `{ tree }` props and maps through the registry. This fits ADR-0021 (view from props, no tRPC) and the "one `Variations` story" pattern could be generated from a folder of fixtures.
- Native drawings still need manual checking on the simulators, as the docs say.

### Gaps
- I did not read `docs/agents/testing-seams.md` or `docs/agents/paper.md`; neither was needed for this audit but they govern how any new primitive/test would be added.
- No existing JSON fixture or tree-rendering story exists in the repo (searched primitives and mocks by listing; not exhaustively).
