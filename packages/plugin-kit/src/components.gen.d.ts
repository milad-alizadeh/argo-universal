/* Generated from Contracts kit components and prop descriptions by `pnpm docs:build`. Do not edit by hand. */
import type { ComponentType, ReactElement } from 'react';
import type { PluginComponents, PluginProps } from './index';

// Only the components are exported; the hint types below stay in this file.
export {};

type RequiredProps<Props> = {
  [Prop in keyof Props]-?: Record<never, never> extends Pick<Props, Prop>
    ? never
    : Prop;
}[keyof Props];

type HintValues<Props, Hints> = {
  [Prop in keyof Hints]: Prop extends keyof Props ? Props[Prop] : never;
};

// Keys come from the hints, so editors show each prop's description; the schema still owns values and optionality.
// It distributes over a union of props, so each alternative keeps its own required keys.
type Hinted<Props, Hints> = Props extends unknown
  ? Required<
      Pick<
        HintValues<Props, Hints>,
        Extract<RequiredProps<Props>, keyof Hints>
      >
    > &
      Partial<
        Pick<
          HintValues<Props, Hints>,
          Exclude<Extract<keyof Props, keyof Hints>, RequiredProps<Props>>
        >
      > &
      Omit<Props, keyof Hints>
  : never;

declare const listComponent: PluginComponents['List'];
declare const tableComponent: PluginComponents['Table'];

type ActionSectionHints = {
  /** Optional Section heading. */
  title: unknown;
};

type ActionHints = {
  /** The Action label and accessible name. */
  label: unknown;
  /** The leading Argo icon; a Screen header shows only Actions with one as buttons, and a submenu needs one. */
  icon: unknown;
  /** Desktop shortcut; Plugins cannot take reserved keys. */
  shortcut: unknown;
  /** Destructive Actions appear last in their own Section. */
  tone: unknown;
  /** Disable activation without hiding the Action. */
  disabled: unknown;
  /** Marks the chosen Action in a submenu of choices, drawn with a check; a top-level header Action is a verb and does not use it. */
  selected: unknown;
  /** The Plugin handler or built-in App Action. */
  onPress: unknown;
  /** An Alert answer that dismisses the question, or one that destroys data. */
  role: unknown;
  /** A count or status dot on the icon. */
  badge: unknown;
};

type SplitButtonHints = {
  /** Primary action label. */
  label: unknown;
  /** Spoken primary action name. */
  accessibilityLabel: unknown;
  /** Primary action icon. */
  icon: unknown;
  /** Primary action. */
  onPress: unknown;
  /** Spoken secondary menu name. */
  menuLabel: unknown;
  /** Filled treatment. */
  primary: unknown;
  /** Disable activation. */
  disabled: unknown;
  /** Both segments' Button size; xs draws as sm. */
  size: unknown;
  /** Fill the row always, or only when narrow. */
  fullWidth: unknown;
  /** value for this kit component. */
  value: unknown;
  /** options for this kit component. */
  options: unknown;
  /** Action or Plugin event invoked by onValueChange. */
  onValueChange: unknown;
};

type IconButtonHints = {
  /** The icon drawn by the button. */
  icon: unknown;
  /** Spoken action name. */
  accessibilityLabel: unknown;
  /** Disable activation. */
  disabled: unknown;
  /** Action run on activation. */
  onPress: unknown;
  /** Draw the filled icon, for a button that is on. */
  selected: unknown;
  /** Button size. */
  size: unknown;
  /** Button treatment. */
  variant: unknown;
};

type ButtonHints = {
  /** The button label. */
  label: unknown;
  /** The button treatment: filled, outlined, text, or danger text. */
  variant: unknown;
  /** The button size. */
  size: unknown;
  /** Whether activation is disabled. */
  disabled: unknown;
  /** The action run on activation. */
  onPress: unknown;
  /** An icon before the label: one of Argo’s, or an SF Symbol and Material Symbol pair. */
  icon: unknown;
  /** Fill the row always, or only in a narrow window. */
  fullWidth: unknown;
  /** Whether the action is running; activation is disabled. */
  loading: unknown;
  /** Spoken name when the visible label says too little. */
  accessibilityLabel: unknown;
};

type MarkdownHints = {
  /** Markdown source text. */
  text: unknown;
  /** Show a caret at the end of the content. */
  streaming: unknown;
};

type CodeHints = {
  /** Plain text to display and copy. */
  code: unknown;
  /** Language tag for syntax highlighting. */
  language: unknown;
  /** File path shown in the header. */
  path: unknown;
  /** Diff hunks; Copy copies their patch and long diffs start with five lines. */
  diff: unknown;
};

type LinkHints = {
  /** Visible link label. */
  label: unknown;
  /** An http, https or mailto URL. */
  href: unknown;
  /** An absolute route within the App. */
  route: unknown;
};

type VideoHints = {
  /** The video, from `argo.assets.resolve`: a Plugin file, or a remote URL the Server fetched. */
  source: unknown;
  /** An image drawn before play, from `argo.assets.resolve`: a Plugin file, or a remote URL the Server fetched. */
  poster: unknown;
  /** Frame aspect: landscape 16:9 (default), square 1:1, portrait 9:16. */
  aspect: unknown;
  /** Corner radius token: control (default) or none. */
  radius: unknown;
  /** Play at once, muted and looping, with the controls hidden until tapped. Stays paused with Reduce Motion. */
  autoPlay: unknown;
  /** Spoken name of the video. */
  accessibilityLabel: unknown;
};

type AudioHints = {
  /** The audio, from `argo.assets.resolve`: a Plugin file, or a remote URL the Server fetched. */
  source: unknown;
  /** Spoken name of the audio; names its play button and scrubber. */
  accessibilityLabel: unknown;
};

type ImageHints = {
  /** Image resolved by argo.assets.resolve; loaded through the Server. */
  source: unknown;
  /** Appearance-specific sources, falling back to light then source. */
  sources: unknown;
  /** Frame aspect, or the image’s intrinsic ratio. */
  aspect: unknown;
  /** Fill and crop, or show the whole image. */
  fit: unknown;
  /** Semantic frame radius. */
  radius: unknown;
  /** Spoken description of the image. */
  accessibilityLabel: unknown;
};

type AvatarHints = {
  /** Name used for fallback initials; absent names show a person symbol. */
  name: unknown;
  /** Avatar resolved by argo.assets.resolve; loaded through the Server. */
  src: unknown;
  /** Avatar size. */
  size: unknown;
  /** Spoken identity. */
  accessibilityLabel: unknown;
  /** Status mark over the avatar. */
  status: unknown;
};

type IconHints = {
  /** An Argo icon or an SF and Material symbol pair. */
  name: unknown;
  /** Semantic icon size, optionally by Size class. */
  size: unknown;
  /** Use the platform filled variant. */
  filled: unknown;
  /** Semantic symbol tone. */
  tone: unknown;
  /** Status mark over the symbol. */
  status: unknown;
};

type TextHints = {
  /** Text content in source order. */
  children: unknown;
  /** The typography role, optionally by Size class. */
  role: unknown;
  /** The Argo semantic text tone. */
  tone: unknown;
  /** Optional spoken label; defaults to the text content. */
  accessibilityLabel: unknown;
};

type LabelHints = {
  /** An optional Argo icon name or an SF and Material symbol pair; without one the Label shows only its text. */
  icon: unknown;
  /** The text displayed by the kit component. */
  text: unknown;
  /** The Argo semantic tone. */
  tone: unknown;
  /** Optional spoken description. */
  accessibilityLabel: unknown;
};

type SegmentedControlHints = {
  /** The visible and accessible label. */
  label: unknown;
  /** The mutually exclusive views, all visible at once. */
  options: unknown;
  /** The selected view. */
  value: unknown;
  /** Action or Plugin event invoked by onValueChange. */
  onValueChange: unknown;
  /** Whether the whole control is unavailable. */
  disabled: unknown;
};

type SliderHints = {
  /** The current range value. */
  value: unknown;
  /** The lowest allowed value. */
  minimumValue: unknown;
  /** The highest allowed value. */
  maximumValue: unknown;
  /** The increment between allowed values. */
  step: unknown;
  /** Called with the new range value. */
  onValueChange: unknown;
  /** The spoken name of the range control. */
  accessibilityLabel: unknown;
  /** The displayed description of the current value. */
  valueLabel: unknown;
  /** Whether interaction is disabled. */
  disabled: unknown;
};

type FieldGroupHints = {
  /** Every row holds still. */
  disabled: unknown;
};

type FieldGroupSectionHints = {
  /** The heading above the section. */
  title: unknown;
  /** Supporting text below the section. */
  footer: unknown;
};

type FieldGroupValueHints = {
  /** The row’s identity for a grouped List with onMove: the List keys the row by it and reports it as a move’s id. A FieldGroup outside such a List draws nothing from it. */
  id: unknown;
  /** The row’s label. */
  title: unknown;
  /** Whether the row is disabled. */
  disabled: unknown;
  /** A leading SF Symbol and Material Symbol. */
  leading: unknown;
  /** The read-only value at the row’s end. */
  value: unknown;
  /** The row is a placeholder while its value is on its way: a bar as wide as the title stands in for it, and assistive technology skips it. */
  loading: unknown;
};

type FieldGroupLinkHints = {
  /** The row’s identity for a grouped List with onMove: the List keys the row by it and reports it as a move’s id. A FieldGroup outside such a List draws nothing from it. */
  id: unknown;
  /** The row’s label. */
  title: unknown;
  /** Whether the row is disabled. */
  disabled: unknown;
  /** A leading icon: one of Argo’s symbols, or an SF Symbol and Material Symbol pair of the page’s own. */
  leading: unknown;
  /** What the page it opens holds, such as a count: before the chevron on iOS and the web, under the title on Android. */
  value: unknown;
  /** Action or Plugin event invoked by onPress. */
  onPress: unknown;
};

type FieldGroupToggleHints = {
  /** The row’s identity for a grouped List with onMove: the List keys the row by it and reports it as a move’s id. A FieldGroup outside such a List draws nothing from it. */
  id: unknown;
  /** The row’s label. */
  title: unknown;
  /** Whether the row is disabled. */
  disabled: unknown;
  /** Whether the field is on. */
  value: unknown;
  /** Action or Plugin event invoked by onValueChange. */
  onValueChange: unknown;
};

type FieldGroupPickerHints = {
  /** The row’s identity for a grouped List with onMove: the List keys the row by it and reports it as a move’s id. A FieldGroup outside such a List draws nothing from it. */
  id: unknown;
  /** The row’s label. */
  title: unknown;
  /** Whether the row is disabled. */
  disabled: unknown;
  /** A leading SF Symbol and Material Symbol. */
  leading: unknown;
  /** The chosen option value, or the list of them when `multiple`. */
  value: unknown;
  /** The options to choose from. */
  options: unknown;
  /** Where the choices open: `menu` in place, for a short known list; `page` on a page of their own, for a long or searchable one; `inline` as rows of the enclosing section with a check on the chosen ones, for a short list shown in place in a form. */
  presentation: unknown;
  /** The text shown for the current choice, in place of the chosen labels. */
  summary: unknown;
  /** What opens the choices: `row`, the default, is a FieldGroup row; `pill` is a label and a down chevron that sits in a toolbar or the Composer, outside a FieldGroup, and always opens the choices on a page or popover. */
  trigger: unknown;
  /** The options are still loading. */
  loading: unknown;
  /** Why the options failed to load; shown below the rows. */
  loadError: unknown;
  /** A search field above the choices; only a `page` has one. */
  searchable: unknown;
  /** Several options can be chosen; `value` is then a list. */
  multiple: unknown;
  /** The `page`'s one action, such as "Add Agents": in the pushed page's header on phones, an icon button when it has an icon; a button below the choices in a desktop popover, which has no header. */
  footerAction: unknown;
  /** Action or Plugin event invoked by onValueChange. */
  onValueChange: unknown;
};

type FieldGroupDatePickerHints = {
  /** The row’s identity for a grouped List with onMove: the List keys the row by it and reports it as a move’s id. A FieldGroup outside such a List draws nothing from it. */
  id: unknown;
  /** The row’s label. */
  title: unknown;
  /** Whether the row is disabled. */
  disabled: unknown;
  /** A leading SF Symbol and Material Symbol. */
  leading: unknown;
  /** Local ISO value: `YYYY-MM-DD`, `HH:mm`, or `YYYY-MM-DDTHH:mm` by mode. */
  value: unknown;
  /** Pick a date, a time, or both. */
  mode: unknown;
  /** Reports a picked value. */
  onValueChange: unknown;
};

type FieldGroupSliderHints = {
  /** The row’s identity for a grouped List with onMove: the List keys the row by it and reports it as a move’s id. A FieldGroup outside such a List draws nothing from it. */
  id: unknown;
  /** The row’s label. */
  title: unknown;
  /** Whether the row is disabled. */
  disabled: unknown;
  /** The current value. */
  value: unknown;
  /** The minimum value. */
  min: unknown;
  /** The maximum value. */
  max: unknown;
  /** The increment. */
  step: unknown;
  /** The value in words, such as “Medium”: shown at the row’s end and announced with the title by assistive technology. */
  valueLabel: unknown;
  /** Action or Plugin event invoked by onValueChange. */
  onValueChange: unknown;
};

type FieldGroupTextFieldHints = {
  /** The row’s identity for a grouped List with onMove: the List keys the row by it and reports it as a move’s id. A FieldGroup outside such a List draws nothing from it. */
  id: unknown;
  /** The row’s label. */
  title: unknown;
  /** Whether the row is disabled. */
  disabled: unknown;
  /** A leading SF Symbol and Material Symbol. */
  leading: unknown;
  /** The current text. */
  value: unknown;
  /** Action or Plugin event invoked by onChangeText. */
  onChangeText: unknown;
  /** Example shown while empty. */
  placeholder: unknown;
  /** Rejection reason; also set Section.footer to show it. */
  error: unknown;
  /** The keyboard Expo UI TextInput shows; a number is a number-pad or decimal-pad. */
  keyboardType: unknown;
  /** The field grows with its text over several lines, for a long answer. */
  multiline: unknown;
  /** The title names the field for assistive technology but is not drawn, for a field whose surroundings already name it. */
  hideTitle: unknown;
  /** Focus the field as the row appears; on Android, open its dialog. */
  autoFocus: unknown;
  /** Select all of the text when the field takes focus. */
  selectTextOnFocus: unknown;
  /** Action or Plugin event invoked by onFocus. */
  onFocus: unknown;
  /** Action or Plugin event invoked by onBlur. */
  onBlur: unknown;
  /** Action or Plugin event invoked by onSubmit. */
  onSubmit: unknown;
};

type FieldGroupSecretFieldHints = {
  /** The row’s identity for a grouped List with onMove: the List keys the row by it and reports it as a move’s id. A FieldGroup outside such a List draws nothing from it. */
  id: unknown;
  /** The row’s label. */
  title: unknown;
  /** Whether the row is disabled. */
  disabled: unknown;
  /** A leading SF Symbol and Material Symbol. */
  leading: unknown;
  /** The current text. */
  value: unknown;
  /** Action or Plugin event invoked by onChangeText. */
  onChangeText: unknown;
  /** Example shown while empty. */
  placeholder: unknown;
  /** Rejection reason; also set Section.footer to show it. */
  error: unknown;
  /** The keyboard Expo UI TextInput shows; a number is a number-pad or decimal-pad. */
  keyboardType: unknown;
  /** The field grows with its text over several lines, for a long answer. */
  multiline: unknown;
  /** The title names the field for assistive technology but is not drawn, for a field whose surroundings already name it. */
  hideTitle: unknown;
  /** Focus the field as the row appears; on Android, open its dialog. */
  autoFocus: unknown;
  /** Select all of the text when the field takes focus. */
  selectTextOnFocus: unknown;
  /** Action or Plugin event invoked by onFocus. */
  onFocus: unknown;
  /** Action or Plugin event invoked by onBlur. */
  onBlur: unknown;
  /** Action or Plugin event invoked by onSubmit. */
  onSubmit: unknown;
};

type SpacerHints = {

};

type GridHints = {
  /** Equal columns, optionally per Size class. Phones draw at most two. */
  columns: unknown;
  /** Spacing token between cells. */
  gap: unknown;
};

type SurfaceHints = {
  /** Named Surface with its fill, radius and depth. */
  kind: unknown;
  /** Spacing token inside the Surface. */
  padding: unknown;
  /** Action run on activation. */
  onPress: unknown;
};

type CardHints = {
  /** The card title on its header line. */
  title: unknown;
  /** The card's spoken name; defaults to title and subtitle. */
  accessibilityLabel: unknown;
  /** The Surface the card is drawn on. */
  kind: unknown;
  /** compact draws tighter padding and a smaller gap under the title, for cards stacked in a narrow column. */
  density: unknown;
  /** A second line below the title. */
  subtitle: unknown;
  /** Action run when the card is pressed. */
  onPress: unknown;
  /** The title, with a disclosure chevron after it, toggles the body. */
  collapsible: unknown;
  /** Controlled open state of a collapsible card. */
  open: unknown;
  /** Initial uncontrolled open state of a collapsible card. */
  defaultOpen: unknown;
  /** Reports changes to the open state. */
  onOpenChange: unknown;
};

type ScrollViewHints = {
  /** Spoken name of the scroll region. */
  accessibilityLabel: unknown;
  /** Scroll direction. */
  direction: unknown;
};

type StackHints = {
  /** A spacing token between children. */
  gap: unknown;
  /** Cross-axis alignment. */
  align: unknown;
  /** The direction of the layout. */
  direction: unknown;
};

type ListHints = {
  /** The spoken name of the list. */
  accessibilityLabel: unknown;
  /** Loads automatically near the end, or the top with anchor=end. */
  pagination: unknown;
  /** Stock pull to refresh on phones; waits for the handler to settle. */
  onRefresh: unknown;
  /** Content selection; desktop modifiers, iOS edit mode, Android long press. */
  selection: unknown;
  /** Starts at the newest row and follows it until the reader scrolls away. */
  anchor: unknown;
  /** App filters loaded rows; plugin receives throttled search text. */
  searchMode: unknown;
  /** Action or Plugin event invoked by onSearchTextChange. */
  onSearchTextChange: unknown;
  /** Rows, media tiles, or lanes: each Section a column, side by side, on a wide desktop or web window; phones draw lanes as ordinary sections. */
  layout: unknown;
  /** Turns moving on in a column or lanes; a grid or horizontal shelf does not move. A row with an id moves within and between Sections by drag, long press and drag on phones, or its Move Actions. Reports where it lands; the List redraws when the rows change. */
  onMove: unknown;
  /** Vertical content or a horizontal shelf. */
  direction: unknown;
  /** Column count, capped at 2/4/6 by Size class; auto fits tileSize. */
  columns: unknown;
  /** Minimum tile width; phones cap grids at two columns, lg at one. */
  tileSize: unknown;
  /** Media aspect: square 1:1, landscape 16:10, portrait 3:4. */
  aspect: unknown;
  /** The list appearance: plain rows, cards, or grouped, one card per section in the look of a FieldGroup section (a look only, for long lists). */
  appearance: unknown;
  /** compact draws each row as one line on a wide desktop or web window; phones always draw regular rows. */
  density: unknown;
  /** Page-level supporting text. */
  footer: unknown;
  /** Whether the list is loading. */
  isLoading: unknown;
  /** Input items, expanded in the worker; pair with renderItem. */
  items: unknown;
  /** Renders one keyed child for each item; receives the item and its index. */
  renderItem: unknown;
};

type ListSectionHints = {
  /** The Section identity a move reports. */
  id: unknown;
  /** The section choice mode. */
  selectionMode: unknown;
  /** Selected row ids. */
  selection: unknown;
  /** Action or Plugin event invoked by onSelectionChange. */
  onSelectionChange: unknown;
  /** The row or section title. */
  title: unknown;
  /** A second line below the title. */
  subtitle: unknown;
  /** Supporting text below the section. */
  footer: unknown;
};

type ListItemHints = {
  /** The row identity within its List or choice section. */
  id: unknown;
  /** Footer on iOS and desktop; supporting text on Android. */
  description: unknown;
  /** The row or section title. */
  title: unknown;
  /** A second line below the title. */
  subtitle: unknown;
  /** Optional secondary row value. */
  value: unknown;
  /** A count or status badge over the leading lane. */
  badge: unknown;
  /** Progress along the bottom of the row. */
  progress: unknown;
  /** Whether the item is selected. */
  selected: unknown;
  /** A finished item, such as a closed Issue or an archived Session: its title reads muted. */
  finished: unknown;
  /** Whether row activation is disabled. */
  disabled: unknown;
  /** Optional spoken label; defaults to title and value. */
  accessibilityLabel: unknown;
  /** The action run on activation. */
  onPress: unknown;
};

type TableHints = {
  /** The columns in order; the first one names each row. */
  columns: unknown;
  /** Compact widths draw a list of rows, or keep the grid and scroll sideways. */
  compactLayout: unknown;
  /** The sorted column; the Plugin sorts the rows. */
  sort: unknown;
  /** Action or Plugin event invoked by onSortChange. */
  onSortChange: unknown;
  /** The row choice mode. */
  selectionMode: unknown;
  /** Selected row ids. */
  selection: unknown;
  /** Action or Plugin event invoked by onSelectionChange. */
  onSelectionChange: unknown;
  /** Spoken name of the table. */
  accessibilityLabel: unknown;
  /** Input items, expanded in the worker; pair with renderItem. */
  items: unknown;
  /** Renders one keyed child for each item; receives the item and its index. */
  renderItem: unknown;
};

type TableRowHints = {
  /** The row identity for selection. */
  id: unknown;
  /** Optional spoken label; defaults to the cell texts. */
  accessibilityLabel: unknown;
  /** The primary action, run on activation at regular widths. */
  onPress: unknown;
};

type TableCellHints = {
  /** The id of the column this cell fills. */
  column: unknown;
  /** The cell text; also the spoken and compact value. */
  text: unknown;
};

type AlertHints = {
  /** Whether the alert is open. */
  open: unknown;
  /** Reports dismissal. */
  onOpenChange: unknown;
  /** Question heading. */
  title: unknown;
  /** Question detail. */
  message: unknown;
};

type SheetHints = {
  /** Whether the sheet is open. */
  open: unknown;
  /** Reports open state changes. */
  onOpenChange: unknown;
  /** Spoken sheet name. */
  label: unknown;
  /** Heights the sheet may rest at. */
  detents: unknown;
  /** Opening height. */
  initialDetent: unknown;
  /** Allow dismissal by system gestures. */
  dismissible: unknown;
};

type ScreenHints = {
  /** The single-line screen title. */
  title: unknown;
  /** A muted line under the title on wide windows; phones hide it. */
  caption: unknown;
  /** Native search on phones; expanding header search on web. */
  search: unknown;
  /** The search query; drafts stay in the App. */
  value: unknown;
  /** Receive the search query when it changes. */
  onChangeText: unknown;
  /** How wide the content runs on a window wider than the reading column: `content` keeps it to that centred column, `full` fills the screen, as a table, board or canvas wants. Both keep the screen’s side margins. */
  width: unknown;
};

type ListDetailHints = {
  /** The list’s title: the list screen’s header on compact windows, where the list is the screen and the header returns to it when the item closes, and the heading above the list on wide windows. */
  title: unknown;
};

type DetailHints = {
  /** The content drawn by the Markdown kit component. */
  markdown: unknown;
  /** Show the content loading state; the Metadata stays. */
  isLoading: unknown;
};

type MetadataHints = {
  /** Optional section heading; on desktop and web, beside a Detail's content, it defaults to Properties. */
  title: unknown;
};

type MetadataLabelHints = {
  /** The field label. */
  title: unknown;
  /** Override the spoken field name and value. */
  accessibilityLabel: unknown;
  /** The field value. */
  text: unknown;
  /** icon for this kit component. */
  icon: unknown;
};

type MetadataLinkHints = {
  /** The field label. */
  title: unknown;
  /** Override the spoken field name and value. */
  accessibilityLabel: unknown;
  /** The displayed link text. */
  text: unknown;
  /** An http, https or mailto URL, or an absolute route within the App. */
  href: unknown;
};

type MetadataPillsHints = {
  /** The field label. */
  title: unknown;
  /** Override the spoken field name and value. */
  accessibilityLabel: unknown;
};

type MetadataStatusDotHints = {
  /** The field label. */
  title: unknown;
  /** Override the spoken field name and value. */
  accessibilityLabel: unknown;
  /** The status text. */
  text: unknown;
  /** tone for this kit component. */
  tone: unknown;
};

type MetadataAvatarHints = {
  /** The field label. */
  title: unknown;
  /** Override the spoken field name and value. */
  accessibilityLabel: unknown;
  /** The person’s displayed name. */
  name: unknown;
  /** Optional avatar image URI. */
  src: unknown;
};

type ProgressBarHints = {
  /** Progress from zero to one. */
  value: unknown;
  /** The Argo semantic tone. */
  tone: unknown;
  /** Show a running sweep over the progress. */
  active: unknown;
  /** Optional spoken description. */
  accessibilityLabel: unknown;
};

type PillHints = {
  /** The text displayed by the kit component. */
  text: unknown;
  /** A semantic metadata label or an interactive control with shared pill geometry. */
  variant: unknown;
  /** A plain control, or explicit floating glass for status pills. */
  appearance: unknown;
  /** Leading icon, aligned by the Pill. */
  icon: unknown;
  /** A count before the label. */
  count: unknown;
  /** Semantic count color without changing the pill geometry. */
  countTone: unknown;
  /** Supporting text beside the label, such as the selected effort. */
  detail: unknown;
  /** Disclosure direction for a control that opens content. */
  disclosure: unknown;
  /** Keep the control label accessible while showing only its leading icon. */
  iconOnly: unknown;
  /** Let the control fill its available row width. */
  fill: unknown;
  /** Whether an interactive toggle pill is selected. */
  selected: unknown;
  /** Disable control activation. */
  disabled: unknown;
  /** Spoken control name; defaults to its text. */
  accessibilityLabel: unknown;
  /** Control activation. */
  onPress: unknown;
  /** The Argo semantic tone. */
  tone: unknown;
  /** A tracker label color as #rrggbb: the text takes it, over a lighter fill of it. */
  color: unknown;
};

type EmptyStateHints = {
  /** Optional native symbol name. */
  icon: unknown;
  /** The empty state heading. */
  title: unknown;
  /** Optional supporting text. */
  description: unknown;
};

type SvgHints = {
  /** Sanitized SVG markup to draw. */
  xml: unknown;
  /** The accessible name of the artwork. */
  label: unknown;
  /** The semantic artwork color. */
  tone: unknown;
  /** The artwork width divided by its height. */
  aspectRatio: unknown;
  /** The action run when the artwork is pressed. */
  onPress: unknown;
};

type ChartHints = {
  /** kind for this kit component. */
  kind: unknown;
  /** label for this kit component. */
  label: unknown;
  /** stacked for this kit component. */
  stacked: unknown;
  /** Gridlines behind the plot at each axis tick. */
  grid: unknown;
  /** The action run when the artwork is pressed. */
  onPress: unknown;
  /** series for this kit component. */
  series: unknown;
};

type CanvasHints = {
  /** label for this kit component. */
  label: unknown;
  /** width for this kit component. */
  width: unknown;
  /** height for this kit component. */
  height: unknown;
  /** aspect Ratio for this kit component. */
  aspectRatio: unknown;
  /** camera for this kit component. */
  camera: unknown;
  /** selected Key for this kit component. */
  selectedKey: unknown;
};

type CanvasRectHints = {
  /** tone for this kit component. */
  tone: unknown;
  /** intensity for this kit component. */
  intensity: unknown;
  /** fill for this kit component. */
  fill: unknown;
  /** stroke for this kit component. */
  stroke: unknown;
  /** stroke Width for this kit component. */
  strokeWidth: unknown;
  /** label for this kit component. */
  label: unknown;
  /** The action run when the artwork is pressed. */
  onPress: unknown;
  /** x for this kit component. */
  x: unknown;
  /** y for this kit component. */
  y: unknown;
  /** width for this kit component. */
  width: unknown;
  /** height for this kit component. */
  height: unknown;
  /** rx for this kit component. */
  rx: unknown;
  /** ry for this kit component. */
  ry: unknown;
};

type CanvasCircleHints = {
  /** tone for this kit component. */
  tone: unknown;
  /** intensity for this kit component. */
  intensity: unknown;
  /** fill for this kit component. */
  fill: unknown;
  /** stroke for this kit component. */
  stroke: unknown;
  /** stroke Width for this kit component. */
  strokeWidth: unknown;
  /** label for this kit component. */
  label: unknown;
  /** The action run when the artwork is pressed. */
  onPress: unknown;
  /** cx for this kit component. */
  cx: unknown;
  /** cy for this kit component. */
  cy: unknown;
  /** r for this kit component. */
  r: unknown;
};

type CanvasLineHints = {
  /** tone for this kit component. */
  tone: unknown;
  /** intensity for this kit component. */
  intensity: unknown;
  /** fill for this kit component. */
  fill: unknown;
  /** stroke for this kit component. */
  stroke: unknown;
  /** stroke Width for this kit component. */
  strokeWidth: unknown;
  /** label for this kit component. */
  label: unknown;
  /** The action run when the artwork is pressed. */
  onPress: unknown;
  /** x1 for this kit component. */
  x1: unknown;
  /** y1 for this kit component. */
  y1: unknown;
  /** x2 for this kit component. */
  x2: unknown;
  /** y2 for this kit component. */
  y2: unknown;
};

type CanvasPathHints = {
  /** tone for this kit component. */
  tone: unknown;
  /** intensity for this kit component. */
  intensity: unknown;
  /** fill for this kit component. */
  fill: unknown;
  /** stroke for this kit component. */
  stroke: unknown;
  /** stroke Width for this kit component. */
  strokeWidth: unknown;
  /** label for this kit component. */
  label: unknown;
  /** The action run when the artwork is pressed. */
  onPress: unknown;
  /** d for this kit component. */
  d: unknown;
};

type CanvasTextHints = {
  /** tone for this kit component. */
  tone: unknown;
  /** intensity for this kit component. */
  intensity: unknown;
  /** fill for this kit component. */
  fill: unknown;
  /** stroke for this kit component. */
  stroke: unknown;
  /** stroke Width for this kit component. */
  strokeWidth: unknown;
  /** label for this kit component. */
  label: unknown;
  /** The action run when the artwork is pressed. */
  onPress: unknown;
  /** x for this kit component. */
  x: unknown;
  /** y for this kit component. */
  y: unknown;
  /** text for this kit component. */
  text: unknown;
};

type CanvasGroupHints = {
  /** tone for this kit component. */
  tone: unknown;
  /** intensity for this kit component. */
  intensity: unknown;
  /** fill for this kit component. */
  fill: unknown;
  /** stroke for this kit component. */
  stroke: unknown;
  /** stroke Width for this kit component. */
  strokeWidth: unknown;
  /** label for this kit component. */
  label: unknown;
  /** The action run when the artwork is pressed. */
  onPress: unknown;
  /** translate for this kit component. */
  translate: unknown;
  /** scale for this kit component. */
  scale: unknown;
  /** rotate for this kit component. */
  rotate: unknown;
};

export const Action: ComponentType<Hinted<PluginProps['Action'], ActionHints>> & {
  Section: ComponentType<Hinted<PluginProps['Action.Section'], ActionSectionHints>>;
};

export const SplitButton: ComponentType<Hinted<PluginProps['SplitButton'], SplitButtonHints>>;

export const IconButton: ComponentType<Hinted<PluginProps['IconButton'], IconButtonHints>>;

export const Button: ComponentType<Hinted<PluginProps['Button'], ButtonHints>>;

export const Markdown: ComponentType<Hinted<PluginProps['Markdown'], MarkdownHints>>;

export const Code: ComponentType<Hinted<PluginProps['Code'], CodeHints>>;

export const Link: ComponentType<Hinted<PluginProps['Link'], LinkHints>>;

export const Video: ComponentType<Hinted<PluginProps['Video'], VideoHints>>;

export const Audio: ComponentType<Hinted<PluginProps['Audio'], AudioHints>>;

export const Image: ComponentType<Hinted<PluginProps['Image'], ImageHints>>;

export const Avatar: ComponentType<Hinted<PluginProps['Avatar'], AvatarHints>>;

export const Icon: ComponentType<Hinted<PluginProps['Icon'], IconHints>>;

export const Text: ComponentType<Hinted<PluginProps['Text'], TextHints>>;

export const Label: ComponentType<Hinted<PluginProps['Label'], LabelHints>>;

export const SegmentedControl: ComponentType<Hinted<PluginProps['SegmentedControl'], SegmentedControlHints>>;

export const Slider: ComponentType<Hinted<PluginProps['Slider'], SliderHints>>;

export const FieldGroup: ComponentType<Hinted<PluginProps['FieldGroup'], FieldGroupHints>> & {
  Section: ComponentType<Hinted<PluginProps['FieldGroup.Section'], FieldGroupSectionHints>>;
  Value: ComponentType<Hinted<PluginProps['FieldGroup.Value'], FieldGroupValueHints>>;
  Link: ComponentType<Hinted<PluginProps['FieldGroup.Link'], FieldGroupLinkHints>>;
  Toggle: ComponentType<Hinted<PluginProps['FieldGroup.Toggle'], FieldGroupToggleHints>>;
  Picker: ComponentType<Hinted<PluginProps['FieldGroup.Picker'], FieldGroupPickerHints>>;
  DatePicker: ComponentType<Hinted<PluginProps['FieldGroup.DatePicker'], FieldGroupDatePickerHints>>;
  Slider: ComponentType<Hinted<PluginProps['FieldGroup.Slider'], FieldGroupSliderHints>>;
  TextField: ComponentType<Hinted<PluginProps['FieldGroup.TextField'], FieldGroupTextFieldHints>>;
  SecretField: ComponentType<Hinted<PluginProps['FieldGroup.SecretField'], FieldGroupSecretFieldHints>>;
};

export const Spacer: ComponentType<Hinted<PluginProps['Spacer'], SpacerHints>>;

export const Grid: ComponentType<Hinted<PluginProps['Grid'], GridHints>>;

export const Surface: ComponentType<Hinted<PluginProps['Surface'], SurfaceHints>>;

export const Card: ComponentType<Hinted<PluginProps['Card'], CardHints>>;

export const ScrollView: ComponentType<Hinted<PluginProps['ScrollView'], ScrollViewHints>>;

export const Stack: ComponentType<Hinted<PluginProps['Stack'], StackHints>>;

export const List: (<Item>(
  props: Hinted<Parameters<typeof listComponent<Item>>[0], ListHints>,
) => ReactElement | null) & {
  Section: ComponentType<Hinted<PluginProps['List.Section'], ListSectionHints>>;
};

export const ListItem: ComponentType<Hinted<PluginProps['ListItem'], ListItemHints>>;

export const Table: (<Item>(
  props: Hinted<Parameters<typeof tableComponent<Item>>[0], TableHints>,
) => ReactElement | null) & {
  Row: ComponentType<Hinted<PluginProps['Table.Row'], TableRowHints>>;
  Cell: ComponentType<Hinted<PluginProps['Table.Cell'], TableCellHints>>;
};

export const Alert: ComponentType<Hinted<PluginProps['Alert'], AlertHints>>;

export const Sheet: ComponentType<Hinted<PluginProps['Sheet'], SheetHints>>;

export const Screen: ComponentType<Hinted<PluginProps['Screen'], ScreenHints>>;

export const ListDetail: ComponentType<Hinted<PluginProps['ListDetail'], ListDetailHints>>;

export const Detail: ComponentType<Hinted<PluginProps['Detail'], DetailHints>>;

export const Metadata: ComponentType<Hinted<PluginProps['Metadata'], MetadataHints>> & {
  Label: ComponentType<Hinted<PluginProps['Metadata.Label'], MetadataLabelHints>>;
  Link: ComponentType<Hinted<PluginProps['Metadata.Link'], MetadataLinkHints>>;
  Pills: ComponentType<Hinted<PluginProps['Metadata.Pills'], MetadataPillsHints>>;
  StatusDot: ComponentType<Hinted<PluginProps['Metadata.StatusDot'], MetadataStatusDotHints>>;
  Avatar: ComponentType<Hinted<PluginProps['Metadata.Avatar'], MetadataAvatarHints>>;
};

export const ProgressBar: ComponentType<Hinted<PluginProps['ProgressBar'], ProgressBarHints>>;

export const Pill: ComponentType<Hinted<PluginProps['Pill'], PillHints>>;

export const EmptyState: ComponentType<Hinted<PluginProps['EmptyState'], EmptyStateHints>>;

export const Svg: ComponentType<Hinted<PluginProps['Svg'], SvgHints>>;

export const Chart: ComponentType<Hinted<PluginProps['Chart'], ChartHints>>;

export const Canvas: ComponentType<Hinted<PluginProps['Canvas'], CanvasHints>> & {
  Rect: ComponentType<Hinted<PluginProps['Canvas.Rect'], CanvasRectHints>>;
  Circle: ComponentType<Hinted<PluginProps['Canvas.Circle'], CanvasCircleHints>>;
  Line: ComponentType<Hinted<PluginProps['Canvas.Line'], CanvasLineHints>>;
  Path: ComponentType<Hinted<PluginProps['Canvas.Path'], CanvasPathHints>>;
  Text: ComponentType<Hinted<PluginProps['Canvas.Text'], CanvasTextHints>>;
  Group: ComponentType<Hinted<PluginProps['Canvas.Group'], CanvasGroupHints>>;
};
