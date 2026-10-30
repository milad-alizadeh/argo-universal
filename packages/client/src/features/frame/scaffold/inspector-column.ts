import type { SizeClass } from '@repo/kit/use-size-class/size-class';
import type { InspectorState, ResizeOutcome } from './frame-layout';
import { isFramed } from './is-framed';

/*
 * The Inspector column's open state and every move between its states. The band's buttons, the dividers and the
 * hosted page only name a move; this module decides where it lands and who is told.
 */

// The Frame's state of the column: what a move reads, and who it tells.
export interface InspectorColumnState {
  inspectorState: InspectorState;
  onInspectorStateChange: (state: InspectorState) => void;
}

// How the shown page opens its own Inspector.
export interface InspectorOpener {
  band?: { session?: { onInspectorToggle?: () => void } | null } | null;
}

export interface InspectorOffer extends InspectorOpener {
  // Whether the shown page has an Inspector to open; the page's opener counts too.
  inspectorAvailable: boolean;
}

export type InspectorMove =
  // The band's toggle: closed opens, anything else closes.
  | 'toggle'
  // Expand to fill the page's area, or restore beside it.
  | { expanded: boolean }
  // A divider drag ended: a width keeps the column open beside the page; closing and expanding come from `resizeOutcome`.
  | { dragged: ResizeOutcome };

// Only a wide window has the Inspector's own column; elsewhere the page's Inspector is its own sheet, so the column stays closed.
export const shownInspectorState = (
  sizeClass: SizeClass,
  state: InspectorState,
): InspectorState => (isFramed(sizeClass) ? state : 'closed');

const expandedState = (expanded: boolean): InspectorState =>
  expanded ? 'expanded' : 'open';

const dragState = (outcome: ResizeOutcome): InspectorState =>
  typeof outcome === 'number' ? 'open' : outcome;

const toggled = (state: InspectorState): InspectorState =>
  state === 'closed' ? 'open' : 'closed';

export function nextInspectorState(
  state: InspectorState,
  move: InspectorMove,
): InspectorState {
  if (move === 'toggle') return toggled(state);

  return 'expanded' in move
    ? expandedState(move.expanded)
    : dragState(move.dragged);
}

const pageOpener = (page: InspectorOpener): (() => void) | undefined =>
  page.band?.session?.onInspectorToggle;

export const inspectorOffered = (offer: InspectorOffer): boolean =>
  offer.inspectorAvailable || Boolean(pageOpener(offer));

// A closed column's toggle goes through the page, which opens its own Inspector and so holds it open.
const opensOnPage = (
  column: InspectorColumnState,
  move: InspectorMove,
): boolean => move === 'toggle' && column.inspectorState === 'closed';

function settle(column: InspectorColumnState, next: InspectorState): void {
  if (next !== column.inspectorState) column.onInspectorStateChange(next);
}

export function moveInspector(
  column: InspectorColumnState & InspectorOpener,
  move: InspectorMove,
): void {
  const opener = pageOpener(column);

  if (opener && opensOnPage(column, move)) opener();
  else settle(column, nextInspectorState(column.inspectorState, move));
}

// The page holds its Inspector open; the Frame holds only whether the open one fills the page's area.
export const hostedInspectorState = (
  open: boolean,
  expanded: boolean,
): InspectorState => (open ? expandedState(expanded) : 'closed');

export interface HostedChange {
  expanded: boolean;
  // What to tell the page, or null when it already agrees.
  open: boolean | null;
}

export function hostedChange(
  open: boolean,
  next: InspectorState,
): HostedChange {
  const wanted = next !== 'closed';

  return {
    expanded: next === 'expanded',
    open: wanted === open ? null : wanted,
  };
}
