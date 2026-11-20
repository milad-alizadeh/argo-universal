import type { FrameLayoutInput, WorkbenchState } from './frame-layout-types';

// Drawn placements keep the same cards mounted; hidden states wait at the trailing edge.
export const workbenchDrawn = (state: WorkbenchState): boolean =>
  state === 'gutter' || state === 'overlay';

const unavailable = (input: FrameLayoutInput): boolean =>
  !input.workbenchAvailable || input.inspectorState === 'expanded';

/*
 * Codex's summary panel thresholds, for its 300-wide panel beside its capped thread: the panel shows in the gutter
 * while each side of the centred thread keeps 180, and the thread stays centred in the page once each side keeps
 * 400; between them the thread centres beside the panel. A wider card raises the first by half its extra width and
 * the second by all of it, as Codex's do.
 */
const codexPanelWidth = 300;

const codexSideForGutter = 180;

const codexSideForCentred = 400;

const cappedRegion = ({ measures }: FrameLayoutInput): number =>
  measures.contentMaximum + measures.contentGutter * 2;

const extraCardWidth = ({ measures }: FrameLayoutInput): number =>
  measures.workbenchWidth - codexPanelWidth;

// The narrowest page that draws the Workbench in its gutter.
export const pageWidthForGutter = (input: FrameLayoutInput): number =>
  cappedRegion(input) + codexSideForGutter * 2 + extraCardWidth(input);

// The narrowest page that keeps the content centred in it beside a Workbench in the gutter.
export const pageWidthForCentred = (input: FrameLayoutInput): number =>
  cappedRegion(input) + (codexSideForCentred + extraCardWidth(input)) * 2;

export const workbenchFits = (
  input: FrameLayoutInput,
  available: number,
): boolean => available >= pageWidthForGutter(input);

const hiddenBy = (input: FrameLayoutInput): WorkbenchState =>
  input.workbenchIntent === 'hidden' ? 'hidden' : 'auto-hidden';

const placedState = (input: FrameLayoutInput, fits: boolean): WorkbenchState =>
  fits ? fittedState(input) : poppedState(input);

const fittedState = (input: FrameLayoutInput): WorkbenchState =>
  input.workbenchIntent === 'hidden' ? 'hidden' : 'gutter';

const poppedState = (input: FrameLayoutInput): WorkbenchState =>
  input.workbenchPopover ? 'overlay' : hiddenBy(input);

// As Codex's summary panel: the intent places it in the gutter of a page that holds it; a narrower page draws it only while its toggle holds it open over the content.
export function workbenchState(
  input: FrameLayoutInput,
  available: number,
): WorkbenchState {
  if (unavailable(input)) return 'hidden';

  return placedState(input, workbenchFits(input, available));
}
