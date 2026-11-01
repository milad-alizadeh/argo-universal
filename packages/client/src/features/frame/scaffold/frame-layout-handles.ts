import type { PaneSpan } from '../utils/pane-shift';
import { contentFloor, listMaximum, railZone } from './frame-layout-measures';
import { inspectorLimit } from './frame-layout-trailing';
import type {
  FrameLayout,
  FrameLayoutInput,
  InspectorRegion,
  ResizeHandle,
  ResizeOutcome,
} from './frame-layout-types';

interface PlacedPanes {
  list: PaneSpan;
  page: PaneSpan;
  inspector: InspectorRegion;
}

// The list can grow until the page keeps the content's floor; beside an expanded Inspector, until the Inspector keeps its default width.
function listLimit(
  input: FrameLayoutInput,
  { list, page }: PlacedPanes,
): number {
  const { width, measures } = input;

  if (input.inspectorState === 'expanded') {
    return Math.max(
      0,
      width - railZone(measures) - measures.inset - measures.inspectorWidth,
    );
  }

  return Math.max(0, list.width + page.width - contentFloor(measures));
}

// A divider on a pane's trailing edge, which drags that pane's width.
const trailingEdge = ({
  offset,
  width,
}: PaneSpan): Pick<ResizeHandle, 'left' | 'value'> => ({
  left: offset + width,
  value: width,
});

function listHandle(
  input: FrameLayoutInput,
  panes: PlacedPanes,
): ResizeHandle | null {
  const { listWidth } = input.measures;
  const maximum = Math.min(listMaximum, listLimit(input, panes));

  if (maximum <= listWidth) return null;

  return {
    ...trailingEdge(panes.list),
    reach: maximum,
    minimum: listWidth,
    maximum,
    expandAbove: Number.POSITIVE_INFINITY,
  };
}

// Closed, the grip uses the window's trailing inset; expanded, it stays on the Inspector's side of the sidebar gutter.
const inspectorHandleLeft = (
  { measures }: FrameLayoutInput,
  { offset, open, expanded }: InspectorRegion,
): number => offset + (!open || expanded ? measures.inset : 0);

// The Inspector keeps beside the page up to the content's floor, and expands once a drag leaves the content less than half of it.
function inspectorHandle(
  input: FrameLayoutInput,
  { page, inspector }: PlacedPanes,
): ResizeHandle {
  const { measures } = input;
  const pageArea = Math.max(0, input.width - page.offset);

  return {
    left: inspectorHandleLeft(input, inspector),
    value: inspector.width,
    reach: pageArea,
    minimum: measures.inspectorWidth,
    maximum: inspectorLimit(input, page.offset),
    expandAbove: pageArea - contentFloor(measures) / 2,
  };
}

export function resizeHandles(
  input: FrameLayoutInput,
  panes: PlacedPanes,
): FrameLayout['handles'] {
  return {
    list: listHandle(input, panes),
    inspector: inspectorHandle(input, panes),
  };
}

// Where a drag to `width` leaves its pane: closed, expanded, or at a width the layout keeps.
export function resizeOutcome(
  handle: ResizeHandle,
  width: number,
): ResizeOutcome {
  if (width < handle.minimum / 2) return 'closed';

  if (width > handle.expandAbove) return 'expanded';

  return Math.max(handle.minimum, Math.min(handle.maximum, width));
}
