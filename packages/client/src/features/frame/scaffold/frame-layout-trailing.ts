import type { PaneSpan } from '../utils/pane-shift';
import { contentFloor, inspectorWidth } from './frame-layout-measures';
import type {
  FrameLayoutInput,
  InspectorRegion,
  WorkbenchRegion,
  WorkbenchState,
} from './frame-layout-types';
import { workbenchDrawn, workbenchState } from './frame-layout-workbench';

function drawnWorkbenchWidth(
  { width, measures }: FrameLayoutInput,
  state: WorkbenchState,
): number {
  if (!workbenchDrawn(state)) return 0;

  return Math.min(
    measures.workbenchWidth,
    Math.max(0, width - measures.inset * 2),
  );
}

// Over the page's trailing edge, in its gutter or over its content; it never crosses the page's leading edge. A Workbench that is not drawn waits at the window's trailing inset, where it slides in from.
export function workbenchRegion(
  input: FrameLayoutInput,
  page: PaneSpan,
): WorkbenchRegion {
  const state = workbenchState(input, page.width);
  const width = drawnWorkbenchWidth(input, state);

  return { state, width, offset: workbenchOffset(input, width, page) };
}

function workbenchOffset(
  input: FrameLayoutInput,
  width: number,
  page: PaneSpan,
): number {
  if (width === 0) return input.width - input.measures.inset;

  const trailingEdge = page.offset + page.width - input.measures.inset;

  return Math.max(page.offset, trailingEdge - width);
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
  const available = Math.max(
    0,
    input.width - contentStart - input.measures.inset,
  );

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
