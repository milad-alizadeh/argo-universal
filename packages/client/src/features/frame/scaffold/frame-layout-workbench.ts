import type {
  FrameLayoutInput,
  WorkbenchIntent,
  WorkbenchState,
} from './frame-layout-types';

// Drawn placements keep the same cards mounted; hidden states wait at the trailing edge.
export const workbenchDrawn = (state: WorkbenchState): boolean =>
  state === 'gutter' || state === 'overlay';

const unavailable = (input: FrameLayoutInput): boolean =>
  !input.workbenchAvailable || input.inspectorState === 'expanded';

// The narrowest page whose two gutters together hold the Workbench: the capped column keeps its leading gutter, then its gap, the Workbench and the inset.
export function pageWidthForGutter({ measures }: FrameLayoutInput): number {
  const workbench = measures.paneGap + measures.workbenchWidth + measures.inset;

  return measures.contentGutter + measures.contentMaximum + workbench;
}

const unavailableOrHidden = (input: FrameLayoutInput): boolean =>
  unavailable(input) || input.workbenchIntent === 'hidden';

const requestedState = (intent: WorkbenchIntent): WorkbenchState =>
  intent === 'shown' ? 'overlay' : 'auto-hidden';

const fittedState = (
  input: FrameLayoutInput,
  available: number,
): WorkbenchState =>
  available >= pageWidthForGutter(input)
    ? 'gutter'
    : requestedState(input.workbenchIntent);

export function workbenchState(
  input: FrameLayoutInput,
  available: number,
): WorkbenchState {
  return unavailableOrHidden(input) ? 'hidden' : fittedState(input, available);
}
