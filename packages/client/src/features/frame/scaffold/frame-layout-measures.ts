import type { FrameLayoutInput, FrameMeasures } from './frame-layout-types';

// The narrowest a drag of the Inspector leaves the page; past it the Inspector expands.
export const contentMinimum = 200;

// The content's floor before a drag lowers it: the Composer and a gutter on each side.
const defaultContentFloor = (measures: FrameMeasures): number =>
  measures.composerWidth + measures.contentGutter * 2;

const draggedFloor = (input: FrameLayoutInput, floor: number): number =>
  Math.min(floor, Math.max(contentMinimum, input.draggedContentFloor ?? floor));

// The narrowest the layout makes the content column: the Composer and a gutter on each side, or less while an Inspector a drag made wider than that stays open.
export function contentFloor(input: FrameLayoutInput): number {
  const floor = defaultContentFloor(input.measures);

  return input.inspectorState === 'closed' ? floor : draggedFloor(input, floor);
}

// A region that is drawn takes its gap beside it too.
export const occupied = (width: number, gap: number): number =>
  width > 0 ? width + gap : 0;

// The rail with the frame inset on both sides.
export const railZone = ({ railWidth, inset }: FrameMeasures): number =>
  railWidth + inset * 2;

// The widest the list is dragged to, and the widest it opens to for large text.
export const listMaximum = 460;

// Until a drag sets it, the list is as wide as the text size asks, up to the widest a drag allows.
export const listWidthForText = (
  listWidth: number,
  fontScale: number,
): number =>
  Math.min(listMaximum, Math.round(listWidth * Math.max(1, fontScale)));

export const preferredListWidth = (input: FrameLayoutInput): number =>
  Math.max(input.measures.listWidth, input.preferredListWidth);

export const inspectorWidth = (input: FrameLayoutInput): number =>
  Math.max(input.measures.inspectorWidth, input.preferredInspectorWidth);

// The Inspector's room beside the page at its preferred width.
export const inspectorBudget = (input: FrameLayoutInput): number =>
  input.inspectorState === 'closed'
    ? 0
    : inspectorWidth(input) + input.measures.paneGap;
