import type { PaneSpan } from '../utils/pane-shift';
import { contentFloor, inspectorWidth } from './frame-layout-measures';
import type {
  FrameLayoutInput,
  InspectorRegion,
  WorkbenchRegion,
  WorkbenchState,
} from './frame-layout-types';
import {
  workbenchDrawn,
  workbenchFits,
  workbenchState,
} from './frame-layout-workbench';

// The page's trailing edge less the inset, which with the Inspector open leaves the pane gap before it.
const trailingEdge = ({ measures }: FrameLayoutInput, page: PaneSpan): number =>
  page.offset + page.width - measures.inset;

// A card's width, or what the page has when a dragged Inspector left it narrower, so the cards never reach under the Inspector.
function drawnWorkbenchWidth(
  input: FrameLayoutInput,
  state: WorkbenchState,
  page: PaneSpan,
): number {
  if (!workbenchDrawn(state)) return 0;

  const room = Math.max(0, trailingEdge(input, page) - page.offset);

  return Math.min(input.measures.workbenchWidth, room);
}

/*
 * A Workbench that is not drawn waits just past the page, at the window's edge or the open Inspector's, which it slides
 * in from under: waiting inside the page, its cards would show at the page's edge as it slid out.
 */
const waitingOffset = (
  input: FrameLayoutInput,
  inspector: Pick<InspectorRegion, 'offset' | 'open'>,
): number => (inspector.open ? inspector.offset : input.width);

// Over the page's trailing edge, in its gutter or over its content, between the page's leading edge and the Inspector.
export function workbenchRegion(
  input: FrameLayoutInput,
  page: PaneSpan,
  inspector: Pick<InspectorRegion, 'offset' | 'open'>,
): WorkbenchRegion {
  const state = workbenchState(input, page.width);
  const width = drawnWorkbenchWidth(input, state, page);

  const offset = workbenchDrawn(state)
    ? Math.max(page.offset, trailingEdge(input, page) - width)
    : waitingOffset(input, inspector);

  return { state, width, offset, fits: workbenchFits(input, page.width) };
}

// The widest the Inspector gets beside the page while the content keeps `floor`: its own floor, or the least a drag leaves it.
export function inspectorLimit(
  input: FrameLayoutInput,
  contentStart: number,
  floor = contentFloor(input),
): number {
  const { measures } = input;
  const room = input.width - contentStart - measures.paneGap - floor;

  return Math.max(measures.inspectorWidth, room);
}

const openWidth = (
  input: FrameLayoutInput,
  contentStart: number,
  available: number,
): number =>
  Math.min(
    available,
    inspectorWidth(input),
    inspectorLimit(input, contentStart),
  );

function inspectorSpanWidth(
  input: FrameLayoutInput,
  contentStart: number,
): number {
  // With nothing beside the page the Inspector still keeps the window's inset on its leading side.
  const start = Math.max(contentStart, input.measures.inset);
  const available = Math.max(0, input.width - start - input.measures.inset);

  if (input.inspectorState === 'closed') return 0;

  return input.inspectorState === 'expanded'
    ? available
    : openWidth(input, contentStart, available);
}

export function inspectorRegion(
  input: FrameLayoutInput,
  contentStart: number,
): InspectorRegion {
  const width = inspectorSpanWidth(input, contentStart);

  return {
    offset: input.width - input.measures.inset - width,
    width,
    open: input.inspectorState !== 'closed',
    expanded: input.inspectorState === 'expanded',
  };
}
