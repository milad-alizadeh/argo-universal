# Argo owns its primitives

Screens import every control from `#primitives` and nothing else (owner, 2026-10-10). React Native Reusables, shadcn copies drawn with React Native views, made the phone look like a web page and left two kits competing on screens that already use native controls. Argo owns its primitives instead; this replaces the Reusables line in ADR-0001.

## Decision

Amended 2026-10-15: native system colours bind to Argo tokens through public colour props; Android menus draw on Compose `DropdownMenu`.

Amended 2026-10-16 (Spec 0010 #432): no `@rn-primitives` anywhere. Web primitives use Radix directly, phones use Expo UI's universal components or Argo's own drawing, and portals use `@gorhom/portal`.


- **One API, up to three drawings.** A primitive has one TypeScript type shared by all its platform files. Screens never import `@expo/ui`, Radix, SwiftUI or Compose types.
- **Phones draw with Expo UI's universal components** (amended 2026-10-15, Spec 0015 #724 decision 8, #756). Each primitive has one `<name>.native.tsx` built from root `@expo/ui` (BottomSheet, Button, Checkbox, Collapsible, Column, FieldGroup, Host, Icon, List, ListItem, Picker, Row, ScrollView, Slider, Spacer, Switch, Text, TextInput), with platform modifiers where a detail needs them. A primitive keeps separate `.ios.tsx` and `.android.tsx` files only where the platforms truly differ, and a one-line comment says why. This replaces the earlier split into SwiftUI controls on iOS and Compose controls on Android.
- **Where no universal component exists**, the primitive uses the stock SwiftUI or Compose control (Alert, FilterChip, OutlinedTextField and similar). Menus use Expo UI's `MenuView` drop-in on iOS and Compose's `DropdownMenu` on Android, so the Android container can take `--color-card` (owner, 2026-10-15, #794). Never hand-built, never patched.
- **Colours use public component APIs** (owner amendment, 2026-10-15). The `Host` keeps `seedColor` from the accent token and `colorScheme` from the Appearance. Primitives may pass Argo tokens through documented component colour props and modifiers to match Paper. Android sheets use `containerColor` and `contentColor`; rows and selection controls use their public `colors` props. Map primary text to `foreground`, secondary text to `muted-foreground`, row surfaces to `card`, and the surrounding surface to `content`. Keep this mapping inside the shared primitives. Screens expose no platform colour props. Native controls retain their shapes, typography and behaviour. Do not patch dependencies, access internal palette contexts, or introduce native theme bridges. When a universal wrapper hides a required public colour API, the primitive may compose stock platform controls instead. Report any remaining unsupported colour rather than overriding an internal implementation. Danger controls and invalid fields keep the danger token on both platforms.
- **Native system colours bind to Argo tokens** (owner, 2026-10-15). A control may set Compose `colors`, SwiftUI `titleColor` and similar colour props, but only to token values, never raw colours. Shapes, sizes and typography stay stock. Set only the colours Paper names; every other slot keeps the platform default. Android's OutlinedTextField, for example, takes `border` on its resting and disabled outline, `accent` on focus and `danger` on error, and keeps Material's text and label colours.
- **Web and desktop** use Expo UI's universal drawing when it meets the approved Paper master's look, states and behaviour; otherwise they use Argo's own React Native Web views, styled with Uniwind (the plain `.tsx` file). This replaces the blanket exclusion of Expo UI's web drawing (owner, 2026-10-10, #419); screens still use Argo's shared primitive API.
- **Combobox search is shared React Native** (owner, 2026-10-15). Choice lists use the same borderless muted input across web, iOS and Android. This is an explicit exception to native text fields; header search keeps its platform pattern. Sheet presentations use the content token through their header and bottom safe area.
- **Data props, not children.** SwiftUI and Compose buttons cannot take Argo `Text` children, so native-drawn primitives take `label`, `value`, `options` and similar props.
- **No `className`, `style` or `*ClassName` slot on kit components** outside `@repo/kit` (amended 2026-10-14, Spec 0015 #724). Layout and look come from props and the token roles of ADR-0026. An oxlint rule enforces it, with a shrinking allowlist (ADR-0016, application 13). This replaces the earlier split, where Argo-drawn primitives kept `className`.
- **Argo draws its own content.** The Feed, Session rows, the Composer surface, request cards, code, badges on content rows, Pills and icon buttons stay React Native views styled with Uniwind on every platform. The Feed, the Composer and request cards move onto kit components (Surface, Markdown, Code) over time; until then the lint rule allowlists their files. Native drawing is for system controls inside system containers: grouped settings lists, the controls in them, menus, sheets, alerts and dialogs.
- **Web primitives use Radix directly** where they need its keyboard, focus and collision handling: dialog, popover, dropdown-menu, select and collapsible (amended 2026-10-16, #432). Only web primitive files (the plain `.tsx`) import `@radix-ui/*`. No `@rn-primitives` package is used anywhere. Phones use Expo UI's universal components or Argo's own drawing: a popover shows its content in Argo's Sheet, and the Dialog keeps its centred card on wide phone windows. Switch is Argo-drawn on web on the ARIA switch pattern. Portals use `@gorhom/portal`: the app root's PortalProvider holds the default host, and named PortalHosts hold a region's content.

## When Expo UI's web drawing does not fit

In SDK 57, radii, heights, padding, font stack and destructive red are fixed in a `StyleSheet`. The shared `style` prop is limited to padding, background, radius, border, opacity, width and height. The controls have no `className`. Button has three variants. Colours are CSS variables. Compare each control with its approved Paper master, including interaction states, before choosing its drawing. FieldSection's white bordered card and dividers do not match Argo's grouped card rows; ListItem lacks the required hover, focus and selected drawings. Those controls keep Argo's own web drawings.

## Native grouped sections

[ADR-0032](0032-one-list-and-one-list-item-drawn-by-argo-everywhere.md) (owner, 2026-10-18) replaces native rows with one Argo-drawn `List` and `ListItem`; this section and "Custom symbols in native rows" then no longer apply to rows.

GroupedListSection uses SwiftUI's universal FieldGroup on iOS. On Android, it composes stock ListItem controls through Expo UI's public API (owner amendment, 2026-10-15). The universal FieldGroup.Section fixes each tile to its generated Material palette and exposes no row-colour prop. Android's shared section therefore supplies the grouped clipping and spacing, while each GroupedListItem owns its native ListItem and public colour props. This also keeps grouping correct when callers put several rows in a section through a child component. React Native scrolls the sections because a lazy native list cannot sit inside the page's React Native scroll view.

## Custom symbols in native rows

This amends ADR-0019. SwiftUI `Image` draws only system symbols, so `custom.<name>` symbols such as `custom.robot` cannot render inside a native row. Native rows draw Argo's `Icon` inside an `RNHostView` sized to its contents, with leading list icons in the `row` role. Icon dimensions are encapsulated in the Icon component, and callers choose a role (owner correction, 2026-10-10; roles replaced named sizes, 2026-10-12, ADR-0019). Disclosure chevrons stay system-drawn. Android Paper frames use Material Symbols, as ADR-0019 sets.

## Phone patterns (owner, 2026-10-14, after the Paper audit)

The audit of the Foundations Paper file against stock `@expo/ui` 57 settled these:

- **FilterPill is native on phones**: SwiftUI `Toggle` in the button style on iOS (Off is a grey capsule, On fills in Argo's accent), Material 3 `FilterChip` on Android, its container, label and outline bound to Argo's tokens. Web and desktop keep Argo's pill.
- **Badges follow their row.** Native rows (grouped settings rows, the Android drawer) use the native badge: SwiftUI `.badge()`, Material 3 `Badge`. Argo-drawn rows (VirtualList rows, the iOS drawer, the rail) use Argo's badge. Counts only.
- **Search is a header action.** iOS keeps the native stack's search bar, docked at the bottom on iOS 26. Android puts Material's search icon button last in the top app bar; tapping it swaps the app bar for a full-width search bar on the same screen (back, field, clear) built from stock Compose parts, and the list below filters in place. Back clears the query and restores the app bar. There is no new route and no bar inside the list (Material 3 Search, "search icon button" entry with full-screen focused search).
- **Workbench**: a native bottom sheet in compact and medium windows (an iPad shows it as a centred form sheet), its own panel in wide windows. Neither platform has a native side sheet.
- **Phone headers are single-line native headers.** Anything a design puts on a second line moves into the page content.
- **Phones draw no focus rings or hover states**; the system draws focus and press feedback.
- **The Feed's Collapsible stays Argo-drawn.** A native disclosure per Feed item would need a native host per item and would break LegendList's layout animation; native disclosure belongs only inside a native settings Form.
- **CodeField is Argo-drawn** on every platform: drawn slots over one hidden text input, so paste and one-time-code autofill keep working.

## Considered options

- Keep Reusables and restyle it: two kits stay side by side, and the phone still looks like the web.
- Use Expo UI's universal components everywhere, web included: controls that cannot match the approved Paper masters keep Argo's drawings, and Android's field group is the wrong pattern.
- Draw everything natively, Feed included: dense Argo content needs Argo's own design and layout control.
