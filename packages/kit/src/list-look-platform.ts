import type { PlatformOSType } from 'react-native';

export type PhoneDrawing = 'ios' | 'android';

// How a platform draws a grouped List: the web as itself, iOS and Android as their own, and every other platform as iOS.
export type Drawing = PhoneDrawing | 'web';

const drawings = {
  web: 'web',
  ios: 'ios',
  android: 'android',
  macos: 'ios',
  windows: 'ios',
  native: 'ios',
} satisfies Record<PlatformOSType, Drawing>;

export const drawingOf = (platform: PlatformOSType): Drawing =>
  drawings[platform];

// The glyph a row that pushes a page ends with; Android draws none.
export type DisclosureGlyph = 'disclosure' | 'web-disclosure';

// Where a row's value and description go: iOS keeps the value trailing and the description as the group's footer, Android puts both under the title, the web puts the description there.
export type ValuePlacement =
  | 'trailing'
  | 'under-title'
  | 'description-under-title';

// What marks the row the user is on, so no separator touches its tint: the web's hovered row, iOS's pressed one.
export type RowHighlight = 'hover' | 'press';

/*
 * How a List says rows are being selected:
 * - edit-mode: iOS's Select button, then Select All, the count and Done, with the actions in a bottom toolbar;
 * - selected-rows: the web's bar while any row is selected, with no close button;
 * - contextual: Material's contextual bar while selecting, close first and the actions last.
 */
export type SelectionBar = 'edit-mode' | 'selected-rows' | 'contextual';

// Where a selecting row draws its mark: iOS's circle leads the row, Android's checkbox trails it.
export type SelectionMark = 'leading' | 'trailing';

export interface PlatformFacts {
  // A section's description shows as its footer; Android puts it on the row.
  footerShown: boolean;
  // A List's page footer leads with an info icon, as Android's FooterPreference does.
  footerIcon: boolean;
  // The chevron of a row that pushes a page, if the platform draws one.
  chevron?: DisclosureGlyph;
  // A table row that opens its detail shows the chevron; only iOS draws it.
  pushChevron: boolean;
  valuePlacement: ValuePlacement;
  // The class a pressed ListItem takes: the web's and iOS's tint, none elsewhere.
  pressedTint: string;
  // Android's Pressable draws its ripple, so a Table grid row or a VirtualListItem takes no pressed tint there.
  ripple: boolean;
  rowHighlight?: RowHighlight;
  // The web's wide window can draw the tree: lanes, rails and folding.
  treeCapable: boolean;
  // Rows are DOM elements: a radio row draws as a radio, keyboard focus shows a ring, and the List takes aria props.
  domRows: boolean;
  // iOS's bars blur what scrolls under them, so its List draws no scroll fade at its top and bottom.
  edgeFades: boolean;
  selectionBar: SelectionBar;
  selectionMark?: SelectionMark;
  // Rows select by click, Shift-click and Cmd- or Ctrl-click, with no selecting mode to enter, as the web's lists do.
  pointerSelection: boolean;
  // A long press starts selecting, as Android's lists do.
  longPressSelects: boolean;
  // While selecting, a row outside the selection drops its own Actions, as Android's contextual bar acts on the selection only.
  selectingDropsRowActions: boolean;
  // A row's own selected mark stands until the user selects rows, as the web's sidebar marks the open page.
  primarySelectionStands: boolean;
}

const pressed = 'active:bg-pressed';

const web = {
  footerShown: true,
  footerIcon: false,
  chevron: 'web-disclosure',
  pushChevron: false,
  valuePlacement: 'description-under-title',
  pressedTint: pressed,
  ripple: false,
  rowHighlight: 'hover',
  treeCapable: true,
  domRows: true,
  edgeFades: true,
  selectionBar: 'selected-rows',
  selectionMark: undefined,
  pointerSelection: true,
  longPressSelects: false,
  selectingDropsRowActions: false,
  primarySelectionStands: true,
} satisfies PlatformFacts;

const ios = {
  footerShown: true,
  footerIcon: false,
  chevron: 'disclosure',
  pushChevron: true,
  valuePlacement: 'trailing',
  pressedTint: pressed,
  ripple: false,
  rowHighlight: 'press',
  treeCapable: false,
  domRows: false,
  edgeFades: false,
  selectionBar: 'edit-mode',
  selectionMark: 'leading',
  pointerSelection: false,
  longPressSelects: false,
  selectingDropsRowActions: false,
  primarySelectionStands: false,
} satisfies PlatformFacts;

const android = {
  footerShown: false,
  footerIcon: true,
  chevron: undefined,
  pushChevron: false,
  valuePlacement: 'under-title',
  pressedTint: '',
  ripple: true,
  rowHighlight: undefined,
  treeCapable: false,
  domRows: false,
  edgeFades: true,
  selectionBar: 'contextual',
  selectionMark: 'trailing',
  pointerSelection: false,
  longPressSelects: true,
  selectingDropsRowActions: true,
  primarySelectionStands: false,
} satisfies PlatformFacts;

// Windows and other native platforms keep the trailing value, the footer, the web's chevron and a plain tint on drawn rows, with no ListItem press tint or row highlight.
const otherNative = {
  footerShown: true,
  footerIcon: false,
  chevron: 'web-disclosure',
  pushChevron: false,
  valuePlacement: 'trailing',
  pressedTint: '',
  ripple: false,
  rowHighlight: undefined,
  treeCapable: false,
  domRows: false,
  edgeFades: true,
  selectionBar: 'contextual',
  selectionMark: undefined,
  pointerSelection: false,
  longPressSelects: false,
  selectingDropsRowActions: false,
  primarySelectionStands: false,
} satisfies PlatformFacts;

// The one place the platforms' conventions are asked; every part of a List reads the answer from its List look. macOS draws SF Symbols, so it takes iOS's chevron.
const platformFacts = {
  web,
  ios,
  android,
  macos: { ...otherNative, chevron: 'disclosure' },
  windows: otherNative,
  native: otherNative,
} satisfies Record<PlatformOSType, PlatformFacts>;

export const platformFactsOf = (platform: PlatformOSType): PlatformFacts =>
  platformFacts[platform];
