import type { BandLeading } from './band-leading';
import type { FrameLayout, FrameMeasures } from './frame-layout';

// A box in the window, from the frame's top-left corner.
export interface WindowBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The title bar's buttons, the gap between neighbours, and the capsule's room around them.
export const bandButton = 32;

export const bandButtonGap = 4;

export const capsulePadding = 2;

// The page's heading starts this far in from the page's edge beside an open sidebar, and this far after a capsule.
const titleGaps = { besidePanel: 16, afterCapsule: 10, beforeControls: 8 };

// The open Inspector's top row keeps its first button this far inside the panel's leading edge.
export const inspectorRowPadding = 8;

export interface BandGeometryInput {
  layout: Pick<
    FrameLayout,
    'list' | 'page' | 'inspector' | 'panesTop' | 'sidebarWidth'
  > & {
    measures: Pick<FrameMeasures, 'inset' | 'paneGap'>;
    bandLeading: BandLeading;
    safeTop: number;
    width: number;
  };
  // Whether the page has a list, so a sidebar whose toggle the leading capsule holds.
  listed: boolean;
  // Whether the title bar has Back and Forward.
  history: boolean;
  // The Session's Expand and Inspector toggle, pinned at the row's end.
  session: boolean;
  // The page's buttons and the Workbench toggle, which ride the Inspector's edge, as laid out.
  movingWidth: number;
}

// The buttons pinned at the trailing end: Expand, then the Inspector toggle.
export const pinnedWidth = (session: boolean): number =>
  session ? bandButton * 2 + bandButtonGap : 0;

type RowInput = {
  layout: Pick<BandGeometryInput['layout'], 'safeTop' | 'panesTop'>;
};

const buttonTop = ({ layout }: RowInput): number =>
  layout.safeTop + (layout.panesTop - bandButton) / 2;

const pillOf = (input: RowInput, x: number, buttons: number): WindowBox => ({
  x,
  y: buttonTop(input) - capsulePadding,
  width: buttons + capsulePadding * 2,
  height: bandButton + capsulePadding * 2,
});

const historyWidth = bandButton * 2 + bandButtonGap;

export function historyLeft({ layout, listed }: BandGeometryInput): number {
  if (!listed) return layout.bandLeading.toggle;

  if (layout.list.folded)
    return layout.bandLeading.toggle + bandButton + bandButtonGap;

  return (
    layout.sidebarWidth - layout.measures.inset - capsulePadding - historyWidth
  );
}

// The closed sidebar's capsule round its toggle, Back and Forward.
export const leadingPill = (
  input: RowInput & {
    layout: Pick<BandGeometryInput['layout'], 'bandLeading'>;
  } & Pick<BandGeometryInput, 'history'>,
): WindowBox =>
  pillOf(
    input,
    input.layout.bandLeading.toggle - capsulePadding,
    bandButton + (input.history ? bandButtonGap + historyWidth : 0),
  );

// The buttons on the closed Inspector's capsule: the page's and the Workbench's, then the pinned pair.
export function trailingButtons({
  session,
  movingWidth,
}: BandGeometryInput): number {
  const pinned = pinnedWidth(session);
  const gap = pinned > 0 && movingWidth > 0 ? bandButtonGap : 0;

  return movingWidth + gap + pinned;
}

// The closed Inspector's capsule, ending on the panes' right edge; none with no buttons to hold.
export function trailingPill(input: BandGeometryInput): WindowBox | null {
  const buttons = trailingButtons(input);

  if (buttons === 0) return null;
  const { width, measures } = input.layout;

  return pillOf(
    input,
    width - measures.inset - buttons - capsulePadding * 2,
    buttons,
  );
}

// From the window's right edge to the pinned pair's trailing edge, open or closed.
export const pinnedRight = ({ layout }: BandGeometryInput): number =>
  layout.measures.inset + capsulePadding;

/*
 * Where the moving buttons stand: in the open Inspector's top row, its padding inside the panel's edge; on the closed
 * Inspector's capsule, a gap before the pinned pair, from the window's right edge as the pinned pair is.
 */
export function movingPlace(
  input: BandGeometryInput,
): { left: number } | { right: number } {
  const { inspector } = input.layout;

  if (inspector.open) return { left: inspector.offset + inspectorRowPadding };
  const pinned = pinnedWidth(input.session);

  return {
    right: pinnedRight(input) + pinned + (pinned > 0 ? bandButtonGap : 0),
  };
}

// The heading's span in the window: from the page's edge or the capsule, to the Inspector or the capsule.
export interface TitleSpan {
  left: number;
  right: number;
}

function titleLeft(input: BandGeometryInput): number {
  const { layout } = input;

  if (!input.listed)
    return (
      layout.bandLeading.toggle +
      (input.history ? historyWidth : 0) +
      titleGaps.afterCapsule
    );

  if (!layout.list.folded) return layout.page.offset + titleGaps.besidePanel;
  const pill = leadingPill(input);

  return pill.x + pill.width + titleGaps.afterCapsule;
}

function titleRight(input: BandGeometryInput): number {
  const { layout } = input;

  if (layout.inspector.open)
    return (
      layout.width -
      layout.inspector.offset +
      layout.measures.paneGap +
      titleGaps.beforeControls
    );
  const pill = trailingPill(input);

  return pill
    ? layout.width - pill.x + titleGaps.afterCapsule
    : layout.measures.inset + titleGaps.beforeControls;
}

export const titleSpan = (input: BandGeometryInput): TitleSpan => ({
  left: titleLeft(input),
  right: titleRight(input),
});
