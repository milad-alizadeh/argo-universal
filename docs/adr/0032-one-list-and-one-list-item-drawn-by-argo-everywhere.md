# One List and one ListItem, drawn by Argo everywhere

[ADR-0042](0042-field-groups-and-lists-are-separate-kit-components.md) supersedes the `grouped` appearance, the settings wrappers on `ListItem` and Argo drawing settings rows on phones: those are now `FieldGroup` and its rows. ADR-0042 also replaces `Drill` and the Combobox's results with `FieldGroup.Picker` pages. The data-list half stands.

This amends [ADR-0020](0020-argo-owns-its-primitives.md) for lists and rows (Spec 0017 #959). Argo has two list families:

- `GroupedList`, `GroupedListSection` and `GroupedListItem` draw native rows on phones: SwiftUI's FieldGroup on iOS, stock Compose ListItems on Android.
- `VirtualList` and `VirtualListItem` draw Argo's own rows on LegendList, with a `grouped` appearance that copies the native look.

The two families overlap almost entirely, and the split costs more than it gives:

- Every screen and every Plugin author has to choose a family, and the rule ("rows that edit a value" against "rows from data") is fuzzy. Projects, Agents and Combobox results have each landed on the wrong side.
- The same row is drawn twice in code and three times in Paper (GroupedListItem, GroupedRow, VirtualListItem). #999 was opened only to keep the copies in step.
- Native lists don't virtualise, and Expo UI says its List is not for long lists.
- React Native content inside a native row needs a hosted view sized by measuring (`GroupedListContent`). `custom.*` symbols can't draw in a native row at all (ADR-0020, "Custom symbols in native rows").
- Plugin rows with custom slots (ADR-0031) fit native rows badly.

What the native rows give that Argo's can't match is small:

- Native controls inside rows: an Expo UI Switch or Picker can sit in a slot instead.
- Form keyboard handling: `react-native-keyboard-controller` is already a dependency.
- The OS's next restyle, free: Argo already copies the look by hand for the web and desktop, and for `VirtualListItem`.

## Decision

- **One `List` and one `ListItem`.** They replace `GroupedList`, `GroupedListSection`, `GroupedListItem`, `GroupedListContent`, `GroupedListSwitchItem`, `VirtualList`, `VirtualListItem` and `VirtualListSectionHeader`. There is one props type for web, iOS and Android, as ADR-0020 requires.
- **Argo draws every row, on every platform.** `List` always renders on LegendList, with fixed children or with `items` and `renderItem`, and sections. Phones no longer draw rows with FieldGroup or Compose ListItem.
- **Appearances, not families.** `List appearance` is one of:
  - `plain`: full-width rows, as iOS's plain List and Material's list.
  - `grouped`: inset sections for settings, forms and sheet pages, as iOS 26 inset-grouped and Material's grouped list.
  - `cards`: a separate card per item, as the Sessions list.

  The slots never change with the appearance. `layout="grid"`, `direction`, `columns` and the list behaviours of Spec 0017 apply to every appearance.
- **One row anatomy.** Amended by the owner on 2026-10-18 after a council review of the first Paper master. `ListItem` is the only kit component that draws a row, in five lanes:
  - `leading`: fixed width, an Icon, Avatar or logo, with `badge` on its top-end corner;
  - the content lane: `title`, `subtitle` and `meta` (Labels, Pills, StatusDots and small IconButtons), filling the row and truncating;
  - `trailing`: content, such as a value, a time, a Pill or a StatusDot, or one call-to-action `Button` outside settings rows (ADR-0033, as amended), end-aligned and as wide as its content, with a fixed gap before the accessory. A value is title-size text, never mono or a code style, paths included;
  - `accessory`: one fixed box for a system indicator, a chevron, check, radio, checkbox, Switch or stepper. Only the kit fills it; authors never do;
  - `progress`: along the bottom edge, under every lane.

  `title`, `subtitle` and `value` are strings; `badge` and `progress` are typed props, not free nodes. The node slots are `leading`, `trailing`, `meta` and `media` (drawn only by `layout="grid"`). `actions` feeds the context menu, swipe actions and desktop hover icons and never draws inline. Spec 0017's `accessories` merges into `trailing`. Each lane box is one title line tall and top-aligned, and the accessory centres on the row, so one- and two-line rows read as centred and three-line rows sit at the top, as iOS and Material do. Height comes from the line count, never from the kind of row.

  `ListItem` takes no layout props. A read-only label and value, such as a Metadata field, is `ListItem.Field` (`title`, the value as children, and `valueLabel` for its spoken label). It is kit-only, never on the wire. It copies `LabeledContent`. On iOS, the label takes at most half the row and the value takes the rest, so a long value, such as a line of Pills with `+N`, gets a width that doesn't depend on its content. Android puts the value in `meta`, under the label. Desktop and web stack the label above the value. Amended by the owner on 2026-10-19 (#1059), replacing the kit-only `labelPlacement="beside"` prop added for #1055.

  Amended by the owner on 2026-10-27 (Paper "Issue row"). `List` takes `density`, `regular` by default or `compact`, the same words as `Card`'s. A compact List draws each row as one line, 36 tall, on a wide desktop or web window: `leading` in a 16 lane, then `subtitle` muted and inline before the title (an Issue's number), the title truncating, `meta` after it, then `trailing`. This is the one exception to height following the line count. Phones and narrow windows draw regular rows. The Sessions sidebar uses it too, so the kit-only `sidebar` prop on `ListItem` is now only `true` for a row in a sidebar tile. Rows nest by writing child `ListItem`s inside a `ListItem`, on the wire as well: `ListItem` now takes `ListItem` children. The `List` flattens the tree so every row is its own cell. On a wide desktop or web window each level adds a 16 lane before the content, a parent draws a fold chevron there and its children draw rails, with the last ending in an elbow. The kit owns the fold state: open by default, the chevron toggles it from the pointer or the keyboard and reports it as expanded. Phones draw children flat after their parent, with no indent and no rails. `ListItem` also takes `finished`, for a closed Issue or an archived Session: its title reads muted.

  `ListItem` has one kit-only node slot, `control`, added for the owner's request of 2026-10-19 that the Effort slider span the full row (#1069). It takes a control such as a Slider and draws it on its own line under the title and value, as wide as the row's content, on every platform. It is a slot for content, not a layout prop, and it is not in the Contracts schema.
- **Settings rows are thin wrappers, not variants.** There is no `variant` prop. Each wrapper is named after the SwiftUI view it copies, takes `ListItem`'s `title`, `subtitle`, `leading` and `disabled` plus its control's props, and only fills `ListItem`'s lanes, so it cannot draw a row of its own:
  - `ListItem.Link` (`href` or `onPress`, optional `value`): the chevron in `accessory`, the value in `trailing`. Copies `NavigationLink`.
  - `ListItem.Toggle` (`value`, `onValueChange`): the Expo UI Switch in `accessory`, and the whole row toggles with the switch role. Copies `Toggle`, and Compose's `Modifier.toggleable`.
  - `ListItem.Picker` and `ListItem.Stepper`: the native control in `accessory` or `trailing`, in its own `Host`. Copies `Picker(.menu)` and `Stepper`.
  - `ListItem.TextField` (`label`, `value`, `onChangeText`): the field in the row, filling it. Copies `TextField` in a `Form`.
  - `ListItem.Button` (`tone`: `accent` or `danger`, `onPress`): an action row. Copies `Button(role:)`.

  A plain `ListItem` with `value` and no `href` is a read-only value row, as `LabeledContent`. Choice is not a row type: `List.Section` takes `selectionMode` (`single` or `multiple`), `selection` and `onSelectionChange`, as SwiftUI `List(selection:)`, and the kit draws the check, radio or checkbox in each row's `accessory`. A page can hold several choice groups, one per Section.
- **Platform placement lives in the kit, never in screens or Plugins.** Server-side Plugin JSX never sees the platform, so every platform difference in ADR-0033 is drawn from one tree:
  - a row's `description` is the section footer on iOS, and the row's subtitle, under its title, on desktop, web and Android (amended by the owner on 2026-10-19, Paper "Settings · Porcelain");
  - `value` is trailing text before the chevron on iOS and desktop, and the subtitle on Android;
  - a Section holding only `ListItem.TextField`s renders as stacked Material fields on Android;
  - a Section holding only `ListItem.Button`s with `tone="danger"` renders as danger text Buttons below the list on Android.

  Screens don't branch on `Platform.OS` for any of these.
- **Native system controls stay native inside the accessory:** the Switch, inline Pickers and steppers are Expo UI's universal controls, each in its own `Host`.
- **Native is the visual reference.** Each appearance copies the stock iOS and Material rows: heights, insets, section corners, separators, state tints and chevrons, drawn from ADR-0026 tokens. When Argo's copy and the OS differ, the copy changes. Paper has three masters, `ListItem`, `List.Section` and `List`, each with Desktop, iOS and Android states; only `ListItem` carries the state matrix, and every other frame (lines, appearances, settings rows, fields, tiles) is a clone with its layer names matching the code. The owner-approved numbers stand: rows padded 16 above and below on every platform, so a one-line row is 52 on desktop and 56 on phones, a 24 icon, a 16 gap, a side margin of 20 and a section corner of 24. Section headers and footers start at the inset (20 on desktop, 16 on phones), not at the title. Amended by the owner on 2026-10-19 (Paper "Settings · Porcelain"): on desktop and web a grouped section is one card, `--color-card` with a 1px `--color-hairline` edge and the 2xl radius, its rows 16 from the edge and separated by hairlines inset 16 on both sides, none after the last; its header is the foreground, flush with the card and 12 above it, and cards sit 24 apart. On phones a grouped List's headers and footers use neutral-600 on the grouped grey. A collapsible section's open or closed icon sits in its header's leading slot (a chevron by default, or a custom pair such as a folder open and closed), never trailing.
- **Rows in a web popover are menu rows.** Added by the owner on 2026-10-19 (#1069). A `List` inside a web popover, the New Session Agent picker included, draws its rows as Paper's Combobox master does, not as settings rows: the master's compact row height and padding instead of a settings row's, the menu-row radius (`rounded-xl`), a leading check on the chosen row instead of a selected fill, and distinct `hover` and `pressed` tints. The arrow keys, Home and End move between that `List`'s rows, as in a Combobox; other popover content, such as a form's buttons, keeps the browser's keys. The kit switches on the popover, so screens and Plugins pass the same `List`. Phones are unchanged: there a popover is a Sheet, and its rows stay grouped.
- **A listbox's option is tinted, not checked.** Amended by the owner on 2026-10-30 (#1321). The Composer's `/` and `#` suggestion menu is a `List` in a web popover, but its rows are a listbox's options rather than menu rows: the field below keeps focus and the keyboard, names the highlighted row through `aria-activedescendant`, and moves the highlight with the arrow keys. A highlight is not a choice, so such a row takes a selected fill and no leading check, which is the one exception to "Rows in a web popover are menu rows" above. `ListItem` takes `role="option"` for it, and only that role tints inside a menu look.

- **Sheets and forms.** `Sheet.Screen` and `Drill` keep the native NavigationStack on iOS, and host a `List` as React Native content. Forms avoid the keyboard and move focus through `react-native-keyboard-controller`. Android forms stay plain stacked Material text fields outside rows, as ADR-0020 says.
- **Accessibility.** `ListItem` reports its role, selected and disabled states, and its value. Its text follows the type roles, so it scales with Dynamic Type and Android font scale. Native controls in slots keep their own accessibility.
- **Badges.** All rows use Argo's badge. This replaces ADR-0020's "Badges follow their row" for rows; the Android drawer keeps its native item.
- **Settings disclosures.** Native disclosure inside a Form goes away with the Form; Collapsible stays Argo-drawn everywhere.
- **The Plugin wire** has `List`, `List.Section`, `ListItem` and the five wrappers. Their Contracts schemas refuse controls in `trailing`, so a misplaced Switch fails in the author's editor. `GroupedList` and `VirtualList` become `List` with an appearance. The old names are gone, with no aliases: [ADR-0034](0034-plugin-apps-check-one-wire-version.md) removed lowering.

## Consequences

- ADR-0020's "Native grouped sections" and "Custom symbols in native rows" sections no longer apply to rows. Native rows were the only reason for them.
- #999 (grouped-row parity) is replaced by the merge. #965 and #966 move screens onto `List`. Settings, Projects, the Composer options, elicitation forms, Plugin settings and Combobox results move as well.
- The iOS drawer, the Android drawer (`DrawerItem`) and the rail are not lists of content, and stay as they are.
- Paper merges the GroupedListItem, GroupedRow and VirtualListItem masters into `ListItem`, and GroupedList and VirtualList into `List`.

## Considered options

- **Keep both families with a usage rule.** Rejected: the rule is fuzzy, every row is kept in step twice, and native rows still can't virtualise or host Plugin slots.
- **One `ListItem` API with two renderers:** native for fixed small lists, LegendList for data. Rejected: authors would stop choosing, but the parity work and the measured hosting would stay.
- **Native rows everywhere.** Rejected: no virtualisation for Sessions or Plugin data, and Argo's content rows (ADR-0020, "Argo draws its own content") need Argo's layout.
- **Settings rows as a `variant` prop on `ListItem`** (`disclosure`, `value`, `choice`, `toggle`, `destructive`), as first accepted. Rejected on review: each variant became its own drawing in Paper (gap 12, centred, no lanes), the props type needs a union whose valid props change per variant, and screens and Plugins had to know where Android moves values, descriptions and destructive actions.
- **Controls that become rows inside a List,** as a bare SwiftUI `Toggle` in a `Form`. Rejected: one kit component would render two ways depending on its parent, so the Server couldn't check a tree against its schema and Paper couldn't name it 1-to-1. The wrappers keep SwiftUI's names without the context switch.
- **Drop the grouped look and keep native lists for settings only.** Rejected: settings would still be a second family, and the owner wants one list item that covers settings and content.
