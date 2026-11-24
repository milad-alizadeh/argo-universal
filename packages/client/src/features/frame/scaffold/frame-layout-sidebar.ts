import {
  contentFloor,
  preferredListWidth,
  railZone,
} from './frame-layout-measures';
import type { FrameLayout, FrameLayoutInput } from './frame-layout-types';

type Thresholds = FrameLayout['thresholds'];

const listContentFloor = (input: FrameLayoutInput): number =>
  input.inspectorState === 'expanded' ? 0 : contentFloor(input);

const minimumInspectorRegion = (input: FrameLayoutInput): number =>
  input.inspectorState === 'closed'
    ? 0
    : input.measures.inspectorWidth + input.measures.paneGap;

// What is left for the list once the content keeps its floor and the Inspector its default width.
function listCapacity(input: FrameLayoutInput): number {
  return (
    input.width -
    railZone(input.measures) -
    listContentFloor(input) -
    minimumInspectorRegion(input)
  );
}

const listAvailable = (input: FrameLayoutInput): boolean =>
  listCapacity(input) >= input.measures.listWidth;

const protectsSidebar = (input: FrameLayoutInput): boolean =>
  input.sidebarShown &&
  (input.sidebarRequested === true || input.inspectorState === 'open');

export const listOpenWidth = (input: FrameLayoutInput): number =>
  protectsSidebar(input) && listAvailable(input)
    ? Math.min(preferredListWidth(input), listCapacity(input))
    : preferredListWidth(input);

// Keep both panes at their minimum widths before folding the sidebar.
export function requestedThresholds(
  input: FrameLayoutInput,
  thresholds: Thresholds,
): Thresholds {
  if (!protectsSidebar(input)) return thresholds;

  return {
    listFold: input.width - listCapacity(input) + input.measures.listWidth,
    workbenchGutter: thresholds.workbenchGutter,
  };
}
