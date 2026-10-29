import type { PaneSpan } from '../utils/pane-shift';

// The Inspector: closed, open beside the page, or expanded over it.
export type InspectorState = 'closed' | 'open' | 'expanded';

// Effective placement follows the width budget; the separate intent survives automatic hiding.
export type WorkbenchState =
  | 'gutter'
  | 'docked'
  | 'auto-hidden'
  | 'dedicated'
  | 'hidden';

// What the person asked of the Workbench's one toggle: nothing yet, so it docks when the window has room, or to show it or hide it.
export type WorkbenchIntent = 'auto' | 'shown' | 'hidden';

// The Frame's sizes, read from its tokens and the platform.
export interface FrameMeasures {
  listWidth: number;
  inspectorWidth: number;
  railWidth: number;
  inset: number;
  bandHeight: number;
  // The band's leading group: the window's own controls, then the sidebar toggle.
  bandLeading: number;
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
}

export interface FrameLayoutInput extends FrameIntent {
  width: number;
  measures: FrameMeasures;
  preferredListWidth: number;
  preferredInspectorWidth: number;
}

/*
 * A divider between two regions. A drag keeps the pane between `minimum` and `maximum`; below half the
 * minimum it closes the pane, and above `expandAbove` it expands it. `reach` is how far the handle itself goes.
 */
export interface ResizeHandle {
  left: number;
  value: number;
  reach: number;
  minimum: number;
  maximum: number;
  expandAbove: number;
}

export type ResizeOutcome = 'closed' | 'expanded' | number;

/*
 * What a pane opening, closing, folding or docking changes, and so what the Frame animates on: a type
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
  // There is room to show the list.
  available: boolean;
}

export interface WorkbenchRegion extends PaneSpan {
  state: WorkbenchState;
}

export interface InspectorRegion extends PaneSpan {
  open: boolean;
  expanded: boolean;
}

// Every region of a wide window, along the window from its left edge.
export interface FrameLayout {
  // The panes start under the window band.
  panesTop: number;
  // The window widths below which the list folds and the Workbench undocks.
  thresholds: { listFold: number; workbenchUndock: number };
  rail: PaneSpan;
  list: ListRegion;
  // The rail and the list with their insets: the permanent drawer's width.
  sidebarWidth: number;
  page: PaneSpan & { hidden: boolean };
  // The page's centred content column, with its two gutters.
  content: PaneSpan;
  workbench: WorkbenchRegion;
  inspector: InspectorRegion;
  handles: { list: ResizeHandle | null; inspector: ResizeHandle };
  // The band title's distance from the leading group, so it starts on the content column's leading edge.
  bandTitleLeading: number;
  // Changes only when a pane opens, closes, folds or docks, so a window resize or a drag moves the Frame at once.
  transitionKey: string;
}
