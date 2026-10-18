---
status: accepted
---

# One List and one ListItem, drawn by Argo everywhere

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
- **One row anatomy.** `ListItem` keeps Spec 0017's slots: `media`, `leading`, `title`, `trailing`, `subtitle`, `meta`, `progress`, `badge`, `accessories`, `actions`.
  - Settings rows are variants of it: `disclosure` (opens a page), `value` (trailing value), `choice` (single or multiple, with a check), `toggle` (a trailing Switch) and `destructive`.
  - Native system controls stay native inside slots: the toggle's Switch, inline Pickers and steppers are Expo UI's universal controls, each in its own `Host`.
- **Native is the visual reference.** Each appearance copies the stock iOS and Material rows: heights, insets, section corners, separators, state tints and chevrons, drawn from ADR-0026 tokens. When Argo's copy and the OS differ, the copy changes. Paper has one `ListItem` master and one `List` master, each with Desktop, iOS and Android states. The owner-approved numbers stand: 54 rows, a 24 icon, a 16 gap, a side margin of 20 and a section corner of 24.
- **Sheets and forms.** `Sheet.Page` and `Drill` keep the native NavigationStack on iOS, and host a `List` as React Native content. Forms avoid the keyboard and move focus through `react-native-keyboard-controller`. Android forms stay plain stacked Material text fields outside rows, as ADR-0020 says.
- **Accessibility.** `ListItem` reports its role, selected and disabled states, and its value. Its text follows the type roles, so it scales with Dynamic Type and Android font scale. Native controls in slots keep their own accessibility.
- **Badges.** All rows use Argo's badge. This replaces ADR-0020's "Badges follow their row" for rows; the Android drawer keeps its native item.
- **Settings disclosures.** Native disclosure inside a Form goes away with the Form; Collapsible stays Argo-drawn everywhere.
- **The Plugin wire** has one `List` and one `ListItem` part, so ADR-0031's `GroupedList` and `VirtualList` become `List` with an appearance. The old names stay as aliases that lower to `List` until no first-party Plugin uses them.

## Consequences

- ADR-0020's "Native grouped sections" and "Custom symbols in native rows" sections no longer apply to rows. Native rows were the only reason for them.
- #999 (grouped-row parity) is replaced by the merge. #965 and #966 move screens onto `List`. Settings, Projects, the Composer options, elicitation forms, Plugin settings and Combobox results move as well.
- The iOS drawer, the Android drawer (`DrawerItem`) and the rail are not lists of content, and stay as they are.
- Paper merges the GroupedListItem, GroupedRow and VirtualListItem masters into `ListItem`, and GroupedList and VirtualList into `List`.

## Considered options

- **Keep both families with a usage rule.** Rejected: the rule is fuzzy, every row is kept in step twice, and native rows still can't virtualise or host Plugin slots.
- **One `ListItem` API with two renderers:** native for fixed small lists, LegendList for data. Rejected: authors would stop choosing, but the parity work and the measured hosting would stay.
- **Native rows everywhere.** Rejected: no virtualisation for Sessions or Plugin data, and Argo's content rows (ADR-0020, "Argo draws its own content") need Argo's layout.
- **Drop the grouped look and keep native lists for settings only.** Rejected: settings would still be a second family, and the owner wants one list item that covers settings and content.
