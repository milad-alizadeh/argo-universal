# List items follow each platform's settings conventions

This amends [ADR-0032](0032-one-list-and-one-list-item-drawn-by-argo-everywhere.md) (Spec 0017 #959). ADR-0032 gives every platform the same `ListItem` slots and settings variants, and says the stock iOS and Material rows are the visual reference. Drawing the first `ListItem` master showed that three of its parts copy iOS and have no Android counterpart:

- **Section footers.** SwiftUI `Section` and Expo UI `FieldGroup.Section` take a `footer`, and iOS Settings explains each group under it. Material 3 lists and Android's `PreferenceCategory` have a title but no footer. A Material row carries its own description as supporting text (`ListItem supportingContent`, `Preference summary`). Android Settings adds at most one page footer (SettingsLib `FooterPreference`): an info icon and text, last on the screen.
- **Destructive rows.** iOS draws `Button(role: .destructive)` as a red row alone in the last `Section` of a Form. Android Settings never draws a destructive row: Uninstall, Forget and Remove are buttons outside the list, confirmed by an `AlertDialog`.
- **Buttons in rows.** Material's `ListItem` trailing slot holds meta text, an icon, a switch or a checkbox. iOS rows navigate, select or toggle. Neither platform puts a call-to-action button inside a row, but ADR-0032's `actions` slot allows one.

## Decision

- **`Section footer` is iOS and desktop only.** Desktop and web draw it as iOS does. On Android the section draws no footer, and a description belongs on the row:
  - a row's own description is its `subtitle` on every platform, so Android loses nothing;
  - a section footer that explains one row (a toggle, a value) is that row's `description`: the kit draws it as the section footer on iOS and desktop and as the row's subtitle on Android (ADR-0032, as amended);
  - `List footer` is page-level text drawn once after the last section. On Android it draws with an info icon, as `FooterPreference`; on iOS and desktop it draws as the last section's footer.
- **`destructive` is a row on iOS and desktop, a Button on Android.** On iOS and desktop it stays a danger-red row alone in the last section. On Android the same `ListItem.Button tone="danger"` renders the danger text `Button` below the list, outside any section. Both confirm with the stock Alert (ADR-0020).
- **No buttons inside rows.** The trailing slot holds a value, a chevron, a check, a radio, a checkbox or a Switch, never a `Button`. `actions` means swipe actions and the context menu only, as SwiftUI `swipeActions` and `contextMenu`. A row that needs a call to action, such as Install or Sign in, is a card, not a `ListItem`.
- **Text inputs follow each platform's form.**
  - iOS and desktop: a single-line field sits inside a grouped row, as SwiftUI `TextField` in a Form: `ListItem.TextField`, the Expo UI `TextInput` filling the row in its own `Host` (ADR-0032), with the label as placeholder or leading text. A multi-line field fills its own section. Help and validation text go in that section's footer.
  - Android: the same `ListItem.TextField`s render as Material text fields that stand alone, stacked outside rows, as ADR-0020 already says. Each field shows its label, its help text and its error as the field's own supporting text, with a character count when there is a limit. Multi-line is the same field with more lines.
  - Forms submit from a button or the header, never from a row. Field state uses TanStack Form, and the keyboard is handled by `react-native-keyboard-controller` (ADR-0032).

## Consequences

- `ListItem` never takes a `Button` in `trailing`; the Agents card and other CTA rows become cards.
- `ListItem` rows gain `description`, and `List` gains `footer`. The Plugin wire's `List` and `ListItem` parts (ADR-0031) take the same props, so Plugin settings get the Android behaviour for free.
- Settings, Project details, Plugin settings and the elicitation forms move descriptions accordingly as #1007 moves them onto `List appearance="grouped"`.
- The Paper `ListItem` master shows the Android section with row subtitles, a page footer and a destructive Button.

## Considered options

- **Draw iOS footers and destructive rows on Android too.** Rejected: ADR-0032 makes the stock rows the reference, and Android has neither.
- **Drop section footers everywhere and use only subtitles.** Rejected: iOS Settings explains groups in footers, and long explanations crowd a row.
- **Keep buttons in rows as an `actions` slot.** Rejected: neither platform does it, and a second tap target makes the row's own tap ambiguous.
