# FieldGroups and Lists are separate kit components

A FieldGroup holds a page's fixed rows of values and controls and a List shows data; the kit gives each its own component (owner, 2026-10-23). This supersedes the parts of [ADR-0032](0032-one-list-and-one-list-item-drawn-by-argo-everywhere.md) that put settings on `List appearance="grouped"` and have Argo draw every row, and the text-field, destructive-row and footer rules of [ADR-0033](0033-list-items-follow-each-platforms-settings-conventions.md). The data-list half of ADR-0032 stands: one `ListItem` anatomy on LegendList.

ADR-0032 merged the two so that no screen had to pick a family. In practice the merge made `ListItem` carry every settings control (Toggle, TextField, Picker, Stepper, Radio, Field) and made `List` copy the native grouped look by hand on LegendList: row positions, group ends, insets, press tiles, keyboard handling and per-platform pickers and steppers. That copy has to chase every OS restyle, and settings pages are short and fixed, so they never needed LegendList. The reasons ADR-0032 gave against native rows (custom Slots, `custom.*` symbols and React Native content in a row) are all list needs. Rows of fixed types have none of them.

Most settings pages don't submit: their values save as they change, and many rows only show a value or open a page. So the container takes Expo's name, `FieldGroup`, and there is no separate Form component: a page that submits is a FieldGroup with a button below it.

Expo UI's universal `List` doesn't replace LegendList for data: on web it is a plain `View`, and on phones SwiftUI `List` and Compose `LazyColumn` draw cells lazily but React still mounts every child, so a long Sessions list is not virtualised.

## Decision

- **`FieldGroup`** holds a page's fixed set of rows: Project details, Connection, Plugin settings and short choice sheets.
  - Its API is Expo UI's universal `FieldGroup` and `FieldGroup.Section` (`title`, `footer`), so the kit can move onto Expo's own once Expo draws these rows natively.
    - On iOS and web it is Expo's universal `FieldGroup`, passed through (SwiftUI `Form` on iOS). Web styling against Argo's tokens is later work.
    - On Android the kit draws its own `FieldGroup` and `Section` in Jetpack Compose, copying Expo's layout, shapes and colours. Expo's Android Section wraps every child in a Compose `ListItem`'s headline (expo/expo#50086), so a row could never be a full Material `ListItem`. The kit's Section draws each row as itself, and this file goes when Expo fixes the wrapping.
  - Its rows are fixed types, each with one props type that mirrors Expo's universal `ListItem` (`title`, `leading`, `trailing`, `onPress`). A row is one line on every platform (the one exception is below). It has no supporting text, and its explanation goes in its Section's `footer`, as iOS Settings does, so iOS and Android lay out the same (owner, 2026-10-23). `Toggle` and `Slider` use Expo's universal `Switch` and `Slider` on every platform and take no leading icon, as Settings puts icons on rows that open a page; on Android they sit in the row's `ListItem` (the Switch trailing, the Slider under the title). The other rows draw each platform's stock row with Expo's platform components, because Expo's universal components draw them wrong or don't have them:
    - iOS with SwiftUI's own row pieces: `LabeledContent` (`Value`), `Label` (a leading icon), `Picker` with its label, and a pressable row ending in the stock disclosure chevron (`Link`);
    - Android with Material 3's one-line `ListItem` (headline, leading and trailing content). A `TextField` or `SecretField` follows Android Settings' `EditTextPreference`: the row shows the title, with the value (masked for a secret) as its supporting line once there is one, and pressing it opens a Material `AlertDialog` holding the text field with Cancel and OK (owner, 2026-10-23). Android has no text field inside a settings row;
    - web with Expo's universal components, except the `Picker` and the text fields: Expo's web Picker takes no styling and its TextInput draws a bordered box, so the web uses the kit's borderless Select and bare input, laid out as iOS's rows.

    On iOS and web a text field's title takes a fixed 100pt column and truncates on one line, so a section's inputs start in one column (owner, 2026-10-23).

    The rows are `Value`, `Link`, `Picker`, `Toggle`, `TextField` and `SecretField` (which also take numbers) and `Slider`. There is no Radio (a single choice is a `Picker`), no Stepper, and no Checkbox: an on/off setting is a `Toggle` on every platform, as Settings draws it on iOS and Android (owner, 2026-10-23). A row has no free Slots.
  - Every child of a `FieldGroup` is drawn in a section card, as Settings does on both platforms. A button in a section is the kit's own `Button` in its `text` or `danger` look, as in Settings' "Reset" rows; FieldGroup has no button row of its own (owner, 2026-10-23). Footers render as each platform draws them.
- **A page that submits** is a `FieldGroup` with its buttons placed by the screen below and outside it, so they have no section card: a dialog that creates something has one submit `Button`, and an Elicitation opens a sheet holding a `FieldGroup` with Skip and Submit below it (owner, 2026-10-23). The screen holds the field state (TanStack Form); the kit has no `Form` component.
- **Settings navigation** is neither; it becomes a native list in later work.
- **`List`** is for data of any length: Sessions, Agents, Projects and Plugin data. It is LegendList on every platform, with `sections` flattened into heading and item rows, `getItemType` per kind, `recycleItems` and sticky headings. `ListItem` keeps ADR-0032's anatomy (leading, title, subtitle, meta, trailing, accessory, progress and `actions`) and is the only row it draws.
  - `List appearance` is `plain` or `cards`. `grouped` is removed: a List no longer copies the native grouped look, and a page that wants it is a FieldGroup.
  - `ListItem` no longer has settings wrappers. `ListItem.Toggle`, `.TextField`, `.Picker` and `.Link` become FieldGroup rows, `.Button` becomes the kit `Button` in a section, `.Field` becomes `FieldGroup.Value`, and `.Stepper` goes.
  - Grid layout, shelves, tiles and Spec 0017's list behaviours stay on `List`.
- **One schema per component.** Each FieldGroup, row and List component has one Zod schema in Contracts; the kit props type and the Plugin wire component derive from it, with one props type for web, iOS and Android (ADR-0020).
- **The Plugin wire follows.** The `ListItem.*` settings components become `FieldGroup`, `FieldGroup.Section` and its rows, `List appearance` loses `grouped`, and the wire version and minimum move up (ADR-0034). Plugin settings render as a FieldGroup.

## Consequences

- The grouped-look code on LegendList and the settings wrappers on `ListItem` are deleted, along with their platform files. The current `fields/` folder (StackedForm, field layout, description and errors) and the inputs' row modes are deleted; `fields/` holds `field-group/` and one folder per row.
- A Plugin built for the older wire stops loading until it moves its settings rows to FieldGroup and its grouped Lists to `plain` or `cards`.
- FieldGroup rows take each platform's stock look from its own components. Argo stops matching row heights, insets and tints by hand.
- The kit keeps a `.ios` and an `.android` file per row, and an Android FieldGroup, until Expo's universal components draw these rows natively.
- Phone FieldGroups are SwiftUI and Compose trees, so they can't hold React Native content. A settings need that needs custom content becomes a List row or its own page.

## Considered options

- **Keep one List with a `grouped` appearance (ADR-0032).** Rejected: the settings controls and the copied native look are most of the list code, and they track the OS by hand.
- **Call the container `Form`.** Rejected: most settings pages don't submit, and the kit keeps Expo's names.
- **A `Form` component (a FieldGroup plus a submit button).** Rejected: it held no state of its own and added nothing a screen's own button doesn't.
- **Rows from Expo's universal components only.** Rejected: on iOS a universal `Picker` inside a `Row` draws a second, taller row and the universal `Icon` has no weight for the stock chevron; on Android every row sits inside a `ListItem` headline.
- **Expo UI's universal `List` for data lists.** Rejected: not virtualised on web, and React mounts every row on phones.
- **Keep `grouped` on List for Plugin data.** Rejected: it brings back the copied native look. A Plugin that wants grouped values uses FieldGroup.
