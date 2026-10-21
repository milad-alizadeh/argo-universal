import type { FrameGeometry } from './frame-geometry-types';
import type { ScaffoldGeometryInput } from './scaffold-geometry';

export const preferredSidebarWidth = (input: ScaffoldGeometryInput): number =>
  Math.max(input.measures.listWidth, input.preferredListWidth);

const contentFloor = ({
  measures,
  inspectorState,
}: ScaffoldGeometryInput): number =>
  inspectorState === 'expanded'
    ? 0
    : measures.composerWidth + measures.contentGutter * 2;

const minimumStageRegion = (input: ScaffoldGeometryInput): number =>
  input.inspectorState === 'closed'
    ? 0
    : input.measures.inspectorWidth + input.measures.paneGap;

function sidebarCapacity(input: ScaffoldGeometryInput): number {
  const { measures } = input;

  return (
    input.width -
    measures.railWidth -
    measures.inset * 2 -
    contentFloor(input) -
    minimumStageRegion(input)
  );
}

export const sidebarAvailable = (input: ScaffoldGeometryInput): boolean =>
  sidebarCapacity(input) >= input.measures.listWidth;

const requested = (input: ScaffoldGeometryInput): boolean =>
  input.sidebarShown &&
  input.sidebarRequested === true &&
  sidebarAvailable(input);

export const sidebarWidth = (input: ScaffoldGeometryInput): number =>
  requested(input)
    ? Math.min(preferredSidebarWidth(input), sidebarCapacity(input))
    : preferredSidebarWidth(input);

// An explicit sidebar request takes the region from the Workbench; ordinary resize still folds the sidebar first.
export function sidebarThresholds(
  input: ScaffoldGeometryInput,
  thresholds: FrameGeometry['thresholds'],
): FrameGeometry['thresholds'] {
  if (!requested(input)) return thresholds;

  return {
    listFold: input.width - sidebarCapacity(input) + input.measures.listWidth,
    workbenchUndock: thresholds.listFold,
  };
}
