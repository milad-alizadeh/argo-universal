import type { PaneSpan } from '../utils/pane-shift';
import type { FrameGeometry } from './frame-geometry-types';
import type { ScaffoldGeometryInput } from './scaffold-geometry';

export function workbenchState(
  input: ScaffoldGeometryInput,
  threshold: number,
): FrameGeometry['workbenchState'] {
  if (unavailable(input)) return 'hidden';

  return input.width >= threshold
    ? dockedState(input.workbenchShown)
    : floatingState(input.workbenchShown);
}

const dockedState = (
  shown: boolean | undefined,
): FrameGeometry['workbenchState'] => (shown === false ? 'hidden' : 'docked');

const floatingState = (
  shown: boolean | undefined,
): FrameGeometry['workbenchState'] =>
  shown === true ? 'floating' : 'auto-hidden';

export function workbenchWidth(
  input: ScaffoldGeometryInput,
  state: FrameGeometry['workbenchState'],
): number {
  if (state === 'hidden' || state === 'auto-hidden') return 0;

  return Math.min(
    input.measures.workbenchWidth,
    Math.max(0, input.width - input.measures.inset * 2),
  );
}

function unavailable(input: ScaffoldGeometryInput): boolean {
  return (
    input.workbenchAvailable === false || input.inspectorState === 'expanded'
  );
}

export function frameWorkbench(
  input: ScaffoldGeometryInput,
  stageRegion: number,
  state: FrameGeometry['workbenchState'],
): PaneSpan {
  const width = workbenchWidth(input, state);

  return {
    offset: input.width - stageRegion - input.measures.inset - width,
    width,
  };
}

export function workbenchRegion(input: ScaffoldGeometryInput): number {
  return input.workbenchAvailable === false
    ? 0
    : input.measures.workbenchWidth + input.measures.paneGap;
}
