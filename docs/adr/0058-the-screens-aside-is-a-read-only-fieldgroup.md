# The Screen's aside is a read-only FieldGroup

[ADR-0049](0049-a-screen-frames-its-page-with-aside-bleed-and-footer.md) put the page's one `Metadata` in `Screen.aside`. Metadata's five fields (`Label`, `Link`, `Pills`, `StatusDot`, `Avatar`) matched the Issue tracker's sidebar row for row, so a pull request, a deploy or a document would each have needed new field types. Its phone and in-List drawings were also a copy of what `FieldGroup.Value` and `FieldGroup.Link` already are. Only its wide-window drawings belonged to it: the aside's column, the wrapping row of Pills and the icon-only Pills (owner, #2224).

## Decision

- **`Screen.aside` takes a `FieldGroup`.** Its place is ADR-0049's, unchanged: a column at the trailing edge when the reading column keeps the medium width, a row of Pills under the title when it does not, and icon-only Pills below medium. A phone draws the aside as Pills or icons too.
- **`Metadata` and every `Metadata.*` field are deleted**, `Metadata.Picker` with them.
- **`FieldGroup.Value` takes kit components as its value**: `Label`, `Pill`, `StatusDot`, `Avatar`, `Link` and `Icon`. Its string `value` stays for words, and is now optional. The children say what the old fields said: Pills that follow each other are one value, a `StatusDot` colours the words after it (a `Label`, or the row's `value`), an `Icon` leads the value after it, and each `Avatar` and each `Link` is a value of its own. Several in one row are allowed. `StatusDot` joins the Plugin wire for this.
- **`FieldGroup.Picker` gains what `Metadata.Picker` did**: `createLabel`, `onToggle` and `onCreate`, beside its `searchable`, `loading` and `loadError`, and the options' `color` and `avatar`. `onToggle` reports `{ value, on }`, acknowledged, because an Operation param cannot hold a list, so a `multiple` pick reports the one option it toggled; `onCreate` reports the typed text, acknowledged. `onValueChange` stays for a single pick and is now optional. It takes the same children as a Value, the value shown: in a read-only FieldGroup the value is the button that opens the choices' page.
- **A FieldGroup draws read-only** in a Screen's aside, and wherever a row's value is kit components, which SwiftUI's Form and a Compose tree cannot hold. It then draws Metadata's own drawing, moved under `field-group/properties/`: the aside's column, Pills or icons where the aside put it, one more section inside a List, and otherwise grouped rows on a phone and the column on the web. Its rows are its Values and Pickers; it draws no other row. Any other FieldGroup is the Form ADR-0042 describes.
- **The Plugin wire version and its minimum go from 8 to 9** ([ADR-0034](0034-plugin-apps-check-one-wire-version.md)). An older App sees "Update Argo to see this" in place of a page with an aside.

[ADR-0042](0042-field-groups-and-lists-are-separate-kit-components.md) still holds: a FieldGroup holds a page's fixed rows and a List shows data, and they stay separate kit components. A read-only FieldGroup is still a FieldGroup of fixed rows, an item's properties, drawn without the Form because its values are kit content; it never becomes a List and holds no data rows. ADR-0042's own rows keep its one-line Form drawing.

## Considered options

- **Keep Metadata and add field types as Plugins need them.** Rejected: every new kind of item needs a new type, and the phone drawings stay a copy of FieldGroup's.
- **A value slot of plain text only.** Rejected: an Issue's labels and assignees are Pills and people, which words cannot show.
- **Draw the aside's rows in the Form on a phone.** Rejected for now: the Form scrolls itself and takes the column, which the aside cannot give it, and a Pill or an Avatar cannot sit in a SwiftUI Form.
