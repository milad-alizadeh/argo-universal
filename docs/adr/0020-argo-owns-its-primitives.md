# Argo owns its primitives

Argo's controls are its own primitives, in `packages/client/src/lib/generic/primitives` (Spec 0010, owner, 2026-10-10). They replace React Native Reusables, the shadcn copies that drew web-style controls on the phone and competed with the native controls Argo already shipped. This amends [ADR-0001](0001-one-expo-app-for-every-platform.md), whose stack named React Native Reusables, and [ADR-0019](0019-icons-are-native-symbols.md) for icons inside native rows.

## Decision

Screens import controls from the primitives folder only. A primitive has one API and up to three drawings:

- **iOS:** the SwiftUI control from `@expo/ui`, inside a `Host`, in the `.ios.tsx` file.
- **Android:** the Jetpack Compose control from `@expo/ui` in Material 3, in the `.android.tsx` file. Where Expo UI's Android control is the wrong pattern, Argo composes its own: the field group, the Picker as a two-line row with a radio dialog, and menus.
- **Web and desktop:** Argo's own React Native Web views, styled with Uniwind, in the plain `.tsx` file. Expo UI's web fallback is never used.

`@rn-primitives` remains only inside web primitive files and the portal host, where a web control needs Radix's keyboard, focus and collision handling.

Native drawing is for system controls inside system containers: grouped settings lists and the buttons, switches, sliders, checkboxes, pickers and form fields in them, menus, sheets, alerts and dialogs. Content that Argo draws itself stays React Native views styled with Uniwind on every platform: the Feed, Session rows, the Composer surface, request cards, code, badges, chips, and icon and toolbar buttons.

## The primitive contract

- A primitive's public API is one TypeScript type shared by all its platform files. Screens never import `@expo/ui`, `@rn-primitives`, SwiftUI or Compose types.
- Primitives that draw natively take data props, not children, because SwiftUI and Compose buttons cannot take Argo `Text` children: Button takes `label` and `icon`; ListItem takes `title`, `value`, `icon`, `accessory` and `onPress`; Picker takes `label`, `value`, `options` and `onChange`. `TextClassContext` stays private to web drawings and Argo-drawn content.
- Native-drawn primitives take no `className`; layout needs become props such as `fullWidth` and `size`. Argo-drawn primitives (Text, Badge, Card, IconButton, Collapsible) keep `className`.
- Names follow Expo UI's universal components where the concept matches: FieldGroup, FieldSection, ListItem, Picker, Switch, Slider, Checkbox, Button, TextInput.
- Values are controlled. TextInput keeps `value` and `onChangeText` so TanStack Form works, and its native files bridge to Expo UI's observable state. Switch takes `value` and `onValueChange`.
- One theme hook resolves Argo's tokens at runtime and re-resolves when the theme changes. Every native control gets explicit colours from it, including disabled and unchecked slots. Android never uses the Host palette or Material You: dynamic colour is off, and Material roles map to Argo tokens (primary → primary, onPrimary → primary-foreground, surface → background, surfaceContainer → muted, surfaceContainerHigh → popover, onSurface → foreground, onSurfaceVariant → muted-foreground, outline → border, error → destructive).
- Every `Host` takes `colorScheme` from Uniwind's resolved theme, so native controls follow Argo's Appearance setting.
- A primitive that is a whole native container (FieldGroup, a sheet, a menu, a dialog) owns one `Host` for its children. A standalone native control uses a `Host` that matches its contents and grows with text size. React Native content inside a native container goes in an `RNHostView` row with a clear background and zero insets, never above the container.
- A control without visible text, such as an icon button, switch or slider, takes a required `accessibilityLabel`.

## Which controls draw natively

| Primitive | iOS | Android | Web and desktop |
| --- | --- | --- | --- |
| FieldGroup, FieldSection | SwiftUI `Form`, inset grouped | Argo's Compose composition | Argo grouped cards |
| ListItem | Form row, system chevron for drill-in | Material ListItem drawn by Argo's FieldSection | Argo row |
| Picker | `Picker(label)` menu up to 7 options; above that a drill-in row to an Argo list with search | Argo two-line row and radio dialog | Argo field on `@rn-primitives/select` |
| Switch, Slider | SwiftUI | Material 3 | Argo, with ARIA roles |
| Checkbox | Form row with a trailing checkmark | Material 3 Checkbox | Argo, `role="checkbox"` |
| Button (system action) | SwiftUI Button | Material Button | Argo Button |
| TextInput (form fields) | SwiftUI TextField | Material OutlinedTextField | Argo Input |
| Menu | SwiftUI Menu | Compose DropdownMenu | `@rn-primitives/dropdown-menu` |
| Sheet | formSheet route, or SwiftUI BottomSheet for single-page content | formSheet route, or ModalBottomSheet | Popover when wide, bottom sheet on `@rn-primitives/dialog` when narrow |
| Dialog, confirm | SwiftUI ConfirmationDialog or alert | Material AlertDialog | `@rn-primitives/dialog` |
| InfoPopover | SwiftUI popover | Material RichTooltip | `@rn-primitives/popover` |
| SegmentedControl | SwiftUI segmented Picker | Material SegmentedButton | Argo |
| Spinner | system | system | Argo |
| IconButton, ToolbarButton, Combobox, Textarea, Text, Badge, Card, Collapsible, ButtonGroup, SplitButton, Portal | Argo-drawn | Argo-drawn | Argo-drawn |

Buttons inside Argo-drawn content (Feed, request cards, Composer, Session header, rail, toolbar) stay Argo-drawn on every platform, as IconButton or Button with `appearance: 'content'`.

## Why not Expo UI's web components

Expo UI's web components fix their radii, heights, padding, font stack and destructive red in a `StyleSheet`. Their `style` prop takes only padding, background, radius, border, opacity, width and height, they have no `className`, and Button has only three variants. Only their colours are CSS variables. They cannot draw Argo's approved web and desktop designs.

## Why not Expo UI's FieldGroup on Android

Expo UI's universal FieldGroup cannot be used or wrapped on Android:

- It hard-codes the tile colour (surfaceContainer) and a content padding of 16, with no navigation-bar inset.
- It matches sections by component identity, so an Argo wrapper becomes a row inside an implicit section.
- Its FieldSection puts every child inside a Compose ListItem's headline, so a nested ListItem draws a second, white ListItem inside the muted tile: the inset doubles, rows grow and the ripple stops short of the tile.

Argo's Android FieldGroup and FieldSection are Argo's own Compose compositions, adapted from Expo's. Colours come from the theme hook, the bottom inset from safe-area context, and each row's ListItem is drawn from its props with `clickable` on the clipped tile. Switch rows are `toggleable` with the switch role across the whole tile; radio rows are `selectable` inside a `selectableGroup`. On both platforms the FieldGroup is the screen's scroll container: its Host fills the screen, the screen drops its React Native scroll wrapper, and it is never wrapped in KeyboardAvoidingView.

## Icons inside native rows

SwiftUI `Image` draws only system symbols, so a custom symbol such as `custom.robot`, the Agent icon, cannot render in a SwiftUI row. This amends ADR-0019's custom symbols:

- Native rows draw Argo's `Icon` inside an `RNHostView` sized to its contents.
- Leading row icons use `--spacing-icon-md`.
- Disclosure chevrons are system-drawn.
- Android Paper frames draw Material Symbols.

## Considered options

- Keep React Native Reusables. Rejected: it draws web controls on the phone, two kits compete on screens that already use native controls, and Argo treated the copied folder as vendored, so lint, jscpd, knip and the Prickles canon skipped code Argo owns. Its real dependency, `@rn-primitives`, stays where the web needs it.
- Expo UI's universal components on every platform, web included. Rejected for the web for the reasons above, and for Android's FieldGroup.
- Argo-drawn controls on the phone too. Rejected: the owner wants the system look and behaviour on iOS and Android.
