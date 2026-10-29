import { contentFloor, occupied } from './frame-layout-measures';
import type {
  FrameLayoutInput,
  WorkbenchIntent,
  WorkbenchState,
} from './frame-layout-types';

// Drawn placements keep the same cards mounted; hidden states wait at the trailing edge.
export const workbenchDrawn = (state: WorkbenchState): boolean =>
  state === 'gutter' || state === 'docked' || state === 'dedicated';

const unavailable = (input: FrameLayoutInput): boolean =>
  !input.workbenchAvailable || input.inspectorState === 'expanded';

function gutterFits(
  { measures }: FrameLayoutInput,
  available: number,
): boolean {
  const gutter = measures.workbenchWidth + measures.paneGap + measures.inset;

  return available >= measures.contentMaximum + gutter * 2;
}

const unavailableOrHidden = (input: FrameLayoutInput): boolean =>
  unavailable(input) || input.workbenchIntent === 'hidden';

const requestedState = (intent: WorkbenchIntent): WorkbenchState =>
  intent === 'shown' ? 'dedicated' : 'auto-hidden';

function fittedState(
  input: FrameLayoutInput,
  available: number,
): WorkbenchState {
  if (gutterFits(input, available)) return 'gutter';

  const docked =
    available >= contentFloor(input.measures) + reservedWorkbench(input);

  return docked ? 'docked' : requestedState(input.workbenchIntent);
}

export function workbenchState(
  input: FrameLayoutInput,
  available: number,
): WorkbenchState {
  return unavailableOrHidden(input) ? 'hidden' : fittedState(input, available);
}

// The Workbench's room beside the content whenever the page has one, which the thresholds budget for.
export const reservedWorkbench = (input: FrameLayoutInput): number =>
  input.workbenchAvailable
    ? input.measures.workbenchWidth + input.measures.paneGap
    : 0;

export const dockedWorkbench = (
  input: FrameLayoutInput,
  state: WorkbenchState,
): number =>
  occupied(
    state === 'docked' ? input.measures.workbenchWidth : 0,
    input.measures.paneGap,
  );
