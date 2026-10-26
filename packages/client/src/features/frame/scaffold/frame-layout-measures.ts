import type { FrameLayoutInput, FrameMeasures } from './frame-layout-types';

// The narrowest the content column gets: the Composer and a gutter on each side.
export const contentFloor = (measures: FrameMeasures): number =>
  measures.composerWidth + measures.contentGutter * 2;

// A region that is drawn takes its gap beside it too.
export const occupied = (width: number, gap: number): number =>
  width > 0 ? width + gap : 0;

// The rail with the frame inset on both sides.
export const railZone = ({ railWidth, inset }: FrameMeasures): number =>
  railWidth + inset * 2;

export const preferredListWidth = (input: FrameLayoutInput): number =>
  Math.max(input.measures.listWidth, input.preferredListWidth);

export const inspectorWidth = (input: FrameLayoutInput): number =>
  Math.max(input.measures.inspectorWidth, input.preferredInspectorWidth);

// The Inspector's room beside the page at its preferred width.
export const inspectorBudget = (input: FrameLayoutInput): number =>
  input.inspectorState === 'closed'
    ? 0
    : inspectorWidth(input) + input.measures.paneGap;
