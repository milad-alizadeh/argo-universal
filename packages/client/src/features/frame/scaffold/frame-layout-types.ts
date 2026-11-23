import type { PaneSpan } from '../utils/pane-shift';

// The Inspector: closed, open beside the page, or expanded over it.
export type InspectorState = 'closed' | 'open' | 'expanded';

/*
 * The Workbench never takes width from the page: it is drawn over the page's trailing edge, in the gutter beside the
 * content when the page is wide enough by Codex's thresholds (the content centring beside it on a page too narrow to
 * keep it centred), over the centred content while its toggle holds it open on a narrower page, or not at all.
 * Effective placement follows the width budget; the separate intent survives automatic hiding.
 */
export type WorkbenchState = 'gutter' | 'auto-hidden' | 'overlay' | 'hidden';

// What the person asked of the Workbench's one toggle: nothing yet, so it shows when the gutter has room, or to show it (an overlay when it does not fit) or hide it.
export type WorkbenchIntent = 'auto' | 'shown' | 'hidden';

// The Frame's sizes, read from its tokens and the platform.
export interface FrameMeasures {
  listWidth: number;
  inspectorWidth: number;
  railWidth: number;
  inset: number;
  // The title bar's row, which starts one inset below the window's top.
  titleBarHeight: number;
  workbenchWidth: number;
  paneGap: number;
  composerWidth: number;
  contentGutter: number;
  contentMaximum: number;
}

// What the person asked for; the layout grants it as far as the window's width allows.
interface FrameIntent {
  sidebarShown: boolean;
  // The sidebar toggle was pressed, so the list takes the Workbench's room instead of folding first.
  sidebarRequested?: boolean;
  inspectorState: InspectorState;
  // The page has Workbench cards to show.
  workbenchAvailable: boolean;
  workbenchIntent: WorkbenchIntent;
  // The toggle opened the Workbench over the content on a page too narrow for it in the gutter, as Codex's popover; it closes again when the page holds it.
  workbenchPopover?: boolean;
  // The page has no list beside it, as a Plugin page without its own: the rail stays, the way to another section.
  listless?: boolean;
}

export interface FrameLayoutInput extends FrameIntent {
  width: number;
  measures: FrameMeasures;
  preferredListWidth: number;
  preferredInspectorWidth: number;
  // Whether the Inspector's width is its default, which no drag set: it widens into room the list leaves and never folds the list for it.
  inspectorUndragged?: boolean;
  // The page's width a drag of the Inspector left, which lowers the content's floor until the Inspector closes.
  draggedContentFloor?: number;
}

/*
 * A divider between two regions. A drag keeps the pane between `minimum` and `maximum`; below half the
 * minimum it closes the pane, and above `expandAbove` it expands it. `gap` is what the pane keeps beside it. `reach` is how far the handle itself goes.
 */
export interface ResizeHandle {
  left: number;
  value: number;
  reach: number;
  gap: number;
  minimum: number;
  maximum: number;
  expandAbove: number;
}

export type ResizeOutcome = 'closed' | 'expanded' | number;

/*
 * What a pane opening, closing or folding, or the Workbench showing, changes, and so what the Frame animates on: a type
 * alias, so `transitionKeyOf` takes it as the plain record it serialises.
 */
export type FrameArrangement = {
  sidebarShown: boolean;
  inspectorState: InspectorState;
  listFolded: boolean;
  workbench: WorkbenchState;
};

export interface ListRegion extends PaneSpan {
  folded: boolean;
  // The list's width while it shows, which its content keeps while it folds.
  openWidth: number;
}

export interface WorkbenchRegion extends PaneSpan {
  state: WorkbenchState;
  // The page is wide enough for the Workbench in its gutter, so its toggle sets the person's intent rather than opening it over the content.
  fits: boolean;
}

export interface InspectorRegion extends PaneSpan {
  open: boolean;
  expanded: boolean;
}

// Every region of a wide window, along the window from its left edge.
export interface FrameLayout {
  // The panes start under the title bar.
  panesTop: number;
  // The window widths below which the list folds and the Workbench no longer fits in the content's gutters.
  thresholds: { listFold: number; workbenchGutter: number };
  rail: PaneSpan;
  list: ListRegion;
  // The rail and the list with their insets: the permanent drawer's width, 0 once the sidebar closes.
  sidebarWidth: number;
  page: PaneSpan & { hidden: boolean };
  // The page's content column, with its two gutters: centred in the page, or in the room beside a Workbench in the gutter.
  content: PaneSpan;
  // How far the Workbench moved the content column from the page's centre, towards its leading edge.
  contentShift: number;
  workbench: WorkbenchRegion;
  inspector: InspectorRegion;
  handles: { list: ResizeHandle | null; inspector: ResizeHandle };
  // Changes only when a pane opens, closes or folds, or the Workbench shows or hides, so a window resize or a drag moves the Frame at once.
  transitionKey: string;
}
