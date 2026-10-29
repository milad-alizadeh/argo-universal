import type { PaneSpan } from '../utils/pane-shift';
import {
  contentFloor,
  inspectorWidth,
  occupied,
} from './frame-layout-measures';
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

// A Workbench that is not drawn waits at the window's trailing inset, where it slides in from.
export function workbenchRegion(
  input: FrameLayoutInput,
  inspector: PaneSpan,
  contentStart: number,
): WorkbenchRegion {
  const host = conversationHost(input, inspector, contentStart);
  const state = workbenchState(input, host.width);
  const width = drawnWorkbenchWidth(input, state);

  return {
    state,
    width,
    offset: workbenchOffset(input, { state, width }, host),
  };
}

function conversationHost(
  input: FrameLayoutInput,
  inspector: PaneSpan,
  contentStart: number,
): PaneSpan {
  return {
    offset: contentStart,
    width:
      input.width -
      contentStart -
      occupied(inspector.width, input.measures.paneGap),
  };
}

function workbenchOffset(
  input: FrameLayoutInput,
  { state, width }: Pick<WorkbenchRegion, 'state' | 'width'>,
  host: PaneSpan,
): number {
  if (state === 'dedicated') return host.offset + (host.width - width) / 2;

  const trailing = width > 0 ? input.width - host.offset - host.width : 0;

  return input.width - trailing - input.measures.inset - width;
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
