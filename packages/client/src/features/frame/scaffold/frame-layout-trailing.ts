import type { PaneSpan } from '../utils/pane-shift';
import {
  contentFloor,
  inspectorWidth,
  occupied,
} from './frame-layout-measures';
import type {
  FrameLayoutInput,
  InspectorRegion,
  WorkbenchIntent,
  WorkbenchRegion,
  WorkbenchState,
} from './frame-layout-types';

// Docked and floating show the Workbench; hidden and auto-hidden wait at the window's edge.
export const workbenchDrawn = (state: WorkbenchState): boolean =>
  state === 'docked' || state === 'floating';

const unavailable = (input: FrameLayoutInput): boolean =>
  !input.workbenchAvailable || input.inspectorState === 'expanded';

const dockedState = (intent: WorkbenchIntent): WorkbenchState =>
  intent === 'hidden' ? 'hidden' : 'docked';

const floatingState = (intent: WorkbenchIntent): WorkbenchState =>
  intent === 'shown' ? 'floating' : 'auto-hidden';

export function workbenchState(
  input: FrameLayoutInput,
  undock: number,
): WorkbenchState {
  if (unavailable(input)) return 'hidden';

  return input.width >= undock
    ? dockedState(input.workbenchIntent)
    : floatingState(input.workbenchIntent);
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

// A Workbench that is not drawn waits at the window's trailing inset, where it slides in from.
export function workbenchRegion(
  input: FrameLayoutInput,
  state: WorkbenchState,
  inspector: PaneSpan,
): WorkbenchRegion {
  const width = drawnWorkbenchWidth(input, state);

  const trailing =
    width > 0 ? occupied(inspector.width, input.measures.paneGap) : 0;

  return {
    state,
    width,
    offset: input.width - trailing - input.measures.inset - width,
  };
}

// The widest the Inspector gets beside the page while the content keeps its floor.
export function inspectorLimit(
  input: FrameLayoutInput,
  contentStart: number,
): number {
  const { measures } = input;

  const room =
    input.width - contentStart - measures.paneGap - contentFloor(measures);

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
