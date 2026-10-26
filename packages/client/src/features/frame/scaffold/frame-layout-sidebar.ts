import {
  contentFloor,
  preferredListWidth,
  railZone,
} from './frame-layout-measures';
import type { FrameLayout, FrameLayoutInput } from './frame-layout-types';

type Thresholds = FrameLayout['thresholds'];

const listContentFloor = (input: FrameLayoutInput): number =>
  input.inspectorState === 'expanded' ? 0 : contentFloor(input.measures);

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

export const listAvailable = (input: FrameLayoutInput): boolean =>
  listCapacity(input) >= input.measures.listWidth;

const requested = (input: FrameLayoutInput): boolean =>
  input.sidebarShown && input.sidebarRequested === true && listAvailable(input);

export const listOpenWidth = (input: FrameLayoutInput): number =>
  requested(input)
    ? Math.min(preferredListWidth(input), listCapacity(input))
    : preferredListWidth(input);

// An explicit sidebar request takes the region from the Workbench; ordinary resize still folds the sidebar first.
export function requestedThresholds(
  input: FrameLayoutInput,
  thresholds: Thresholds,
): Thresholds {
  if (!requested(input)) return thresholds;

  return {
    listFold: input.width - listCapacity(input) + input.measures.listWidth,
    workbenchUndock: thresholds.listFold,
  };
}
