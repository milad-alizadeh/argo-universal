# The Screen's aside holds the Settings FieldGroup rows

[ADR-0049](0049-a-screen-frames-its-page-with-aside-bleed-and-footer.md) put the page's one `Metadata` in `Screen.aside`. Metadata's five fields matched the Issue tracker's sidebar row for row (a status dot, label Pills, an avatar, a link and a "None" label), and on a phone it drew grouped label-and-value rows, a second drawing of what `FieldGroup.Value` and `FieldGroup.Link` already are. A first attempt to fold it into FieldGroup kept a hand-drawn read-only path, with kit components as row values and its own column, Pills and icon drawings; the owner rejected it, because it left two drawings of the same rows (owner, 2026-11-16, #2224).

## Decision

- **`Screen.aside` takes a plain `FieldGroup`** of `FieldGroup.Value`, `FieldGroup.Link` and `FieldGroup.Picker` rows, drawn as [ADR-0042](0042-field-groups-and-lists-are-separate-kit-components.md) draws them in Settings: SwiftUI's Form and `LabeledContent` on iOS, the one-line Material `ListItem` on Android, Expo's FieldGroup on the web. There is one drawing of each row on each platform.
- **Values are text.** A status is a `FieldGroup.Value` with its `dot`, which joins the wire for this; labels are one value of their names joined; an assignee is a name. Pills, avatars and coloured labels in property values are given up.
- **In the aside the FieldGroup sizes to its rows.** The page's FieldGroup scrolls itself and takes the content column. In the aside, the kit's `aside` list place, it draws the same Form, sections and rows without scrolling, and takes no column: on the web Expo's scroll view sizes to its sections, on iOS SwiftUI's Form has scrolling disabled in a Host that takes its height, and on Android the kit's Compose FieldGroup is a `Column` rather than a `LazyColumn` in such a Host. It scrolls with the aside's column or with the body it leads.
- **The aside has two places**: its own column at the trailing edge, from ADR-0049's width rule unchanged, or the lead above the body, where the content's top holds it, on a narrower window and on a phone. The row of Pills and the icon-only Pills are deleted.
- **`Metadata`, its five fields and `Metadata.Picker` are deleted**, with their schemas and drawings. The Issue tracker's properties are FieldGroup rows.
- **Editing stays on `FieldGroup.Picker`.** It gains `createLabel` and the acknowledged `onToggle` (`{ value, on }`) and `onCreate` (the typed text) events that `Metadata.Picker` had. An Operation param cannot hold a list, so a `multiple` pick reports the one option it toggled. Its page already draws the create row and the options' colour dots and avatars, so these add no row drawing. `onValueChange` is optional.
- **The Plugin wire version and its minimum go from 8 to 9** ([ADR-0034](0034-plugin-apps-check-one-wire-version.md)). An App on 8 can't draw these trees: its `Screen.aside` takes only `Metadata`, so an aside holding a FieldGroup fails its schema, and its `FieldGroup.Picker` requires `onValueChange`, which a Plugin's `multiple` Picker now leaves out.

ADR-0042 holds as written: a FieldGroup holds a page's fixed rows and a List shows data. The aside's FieldGroup is the same component, rows and drawings, laid out without its own scrolling.

## Considered options

- **A read-only FieldGroup with kit components as row values and its own aside drawings** (#2278). Rejected by the owner: two drawings of the same rows, and an aside that doesn't match Settings.
- **Keep Metadata and add field types as Plugins need them.** Rejected: every new kind of item would need a new type, and its phone drawing copies FieldGroup's.
