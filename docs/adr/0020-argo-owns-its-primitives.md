# Argo owns its primitives

Screens import every control from `#primitives` and nothing else (owner, 2026-10-10). React Native Reusables, shadcn copies drawn with React Native views, made the phone look like a web page and left two kits competing on screens that already use native controls. Argo owns its primitives instead; this replaces the Reusables line in ADR-0001.

## Decision

- **One API, up to three drawings.** A primitive has one TypeScript type shared by all its platform files. Screens never import `@expo/ui`, `@rn-primitives`, SwiftUI or Compose types.
- **Phones draw with Expo UI's universal components** (amended 2026-10-15, Spec 0015 #724 decision 8, #756). Each primitive has one `<name>.native.tsx` built from root `@expo/ui` (BottomSheet, Button, Checkbox, Collapsible, Column, FieldGroup, Host, Icon, List, ListItem, Picker, Row, ScrollView, Slider, Spacer, Switch, Text, TextInput), with platform modifiers where a detail needs them. A primitive keeps separate `.ios.tsx` and `.android.tsx` files only where the platforms truly differ, and a one-line comment says why. This replaces the earlier split into SwiftUI controls on iOS and Compose controls on Android.
- **Where no universal component exists**, menus use Expo UI's `MenuView` drop-in; anything else uses the stock SwiftUI or Compose control (Alert, FilterChip and similar). Never hand-built, never patched.
- **Colours the Expo way.** The `Host` takes `seedColor` from the accent token and `colorScheme` from the Appearance. Android generates its Material 3 palette from the seed and iOS uses it as the tint. No control sets its own Compose `colors`, and Paper's native frames follow the generated palette.
- **Web and desktop** use Expo UI's universal drawing when it meets the approved Paper master's look, states and behaviour; otherwise they use Argo's own React Native Web views, styled with Uniwind (the plain `.tsx` file). This replaces the blanket exclusion of Expo UI's web drawing (owner, 2026-10-10, #419); screens still use Argo's shared primitive API.
- **Data props, not children.** SwiftUI and Compose buttons cannot take Argo `Text` children, so native-drawn primitives take `label`, `value`, `options` and similar props.
- **No `className`, `style` or `*ClassName` slot on kit components** outside `lib/generic` (amended 2026-10-14, Spec 0015 #724). Layout and look come from props and the token roles of ADR-0026. An oxlint rule enforces it, with a shrinking allowlist (ADR-0016, application 13). This replaces the earlier split, where Argo-drawn primitives kept `className`.
- **Argo draws its own content.** The Feed, Session rows, the Composer surface, request cards, code, badges on content rows, Pills and icon buttons stay React Native views styled with Uniwind on every platform. The Feed, the Composer and request cards move onto kit components (Surface, Markdown, Code) over time; until then the lint rule allowlists their files. Native drawing is for system controls inside system containers: grouped settings lists, the controls in them, menus, sheets, alerts and dialogs.
- **`@rn-primitives` stays only underneath web primitives** that need Radix keyboard, focus and collision handling (dialog, popover, dropdown-menu, portal, and select while it is needed). Only web primitive files and the portal host import it.

## When Expo UI's web drawing does not fit

In SDK 57, radii, heights, padding, font stack and destructive red are fixed in a `StyleSheet`. The shared `style` prop is limited to padding, background, radius, border, opacity, width and height. The controls have no `className`. Button has three variants. Colours are CSS variables. Compare each control with its approved Paper master, including interaction states, before choosing its drawing. FieldSection's white bordered card and dividers do not match Argo's grouped muted cards; ListItem lacks the required hover, focus and selected drawings. Those controls keep Argo's own web drawings.

## Android grouped lists use Expo UI's FieldGroup

GroupedList and GroupedListSection draw with the universal FieldGroup on both phones (amended 2026-10-15, Spec 0015 #724 decision 8). Its fixed tile colour and padding are accepted as Material's look. This replaces the earlier Argo Compose composition and its theme bridge.

## Custom symbols in native rows

This amends ADR-0019. SwiftUI `Image` draws only system symbols, so `custom.<name>` symbols such as `custom.robot` cannot render inside a native row. Native rows draw Argo's `Icon` inside an `RNHostView` sized to its contents, with leading list icons in the `row` role. Icon dimensions are encapsulated in the Icon component, and callers choose a role (owner correction, 2026-10-10; roles replaced named sizes, 2026-10-12, ADR-0019). Disclosure chevrons stay system-drawn. Android Paper frames use Material Symbols, as ADR-0019 sets.

## Phone patterns (owner, 2026-10-14, after the Paper audit)

The audit of the Foundations Paper file against stock `@expo/ui` 57 settled these:

- **FilterPill is native on phones**: SwiftUI `Toggle` in the button style on iOS (Off is a grey capsule, On fills in Argo's accent), Material 3 `FilterChip` with Material's colours on Android. Web and desktop keep Argo's pill.
- **Badges follow their row.** Native rows (grouped settings rows, the Android drawer) use the native badge: SwiftUI `.badge()`, Material 3 `Badge`. Argo-drawn rows (VirtualList rows, the iOS drawer, the rail) use Argo's badge. Counts only.
- **Search is a header action.** iOS keeps the native stack's search bar, docked at the bottom on iOS 26. Android puts Material's search icon button last in the top app bar; tapping it swaps the app bar for a full-width search bar on the same screen (back, field, clear) built from stock Compose parts, and the list below filters in place. Back clears the query and restores the app bar. There is no new route and no bar inside the list (Material 3 Search, "search icon button" entry with full-screen focused search).
- **Inspector**: a native bottom sheet in compact and medium windows (an iPad shows it as a centred form sheet), its own panel in wide windows. Neither platform has a native side sheet.
- **Phone headers are single-line native headers.** Anything a design puts on a second line moves into the page content.
- **Phones draw no focus rings or hover states**; the system draws focus and press feedback.
- **The Feed's Collapsible stays Argo-drawn.** A native disclosure per Feed item would need a native host per item and would break LegendList's layout animation; native disclosure belongs only inside a native settings Form.
- **CodeField is Argo-drawn** on every platform: drawn slots over one hidden text input, so paste and one-time-code autofill keep working.

## Considered options

- Keep Reusables and restyle it: two kits stay side by side, and the phone still looks like the web.
- Use Expo UI's universal components everywhere, web included: controls that cannot match the approved Paper masters keep Argo's drawings, and Android's field group is the wrong pattern.
- Draw everything natively, Feed included: dense Argo content needs Argo's own design and layout control.
