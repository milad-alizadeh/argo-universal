import { contentSpan } from '../../../lib/product/content-rule';
import { transitionKeyOf } from '../utils/frame-timing';
import type { PaneSpan } from '../utils/pane-shift';
import { resizeHandles } from './frame-layout-handles';
import {
  contentFloor,
  inspectorBudget,
  occupied,
  preferredListWidth,
  railZone,
} from './frame-layout-measures';
import {
  listAvailable,
  listOpenWidth,
  requestedThresholds,
} from './frame-layout-sidebar';
import { inspectorRegion, workbenchRegion } from './frame-layout-trailing';
import type {
  FrameArrangement,
  FrameLayout,
  FrameLayoutInput,
  ListRegion,
} from './frame-layout-types';
import { pageWidthForGutter } from './frame-layout-workbench';

export { resizeOutcome, widthBeside } from './frame-layout-handles';

export { workbenchDrawn } from './frame-layout-workbench';

export type * from './frame-layout-types';

// The list folds when the page would go below the content's floor; the Workbench, which takes no width, hides when the page's two gutters together no longer hold it.
function budgetThresholds(input: FrameLayoutInput): FrameLayout['thresholds'] {
  const base = railZone(input.measures) + inspectorBudget(input);
  const list = preferredListWidth(input);

  return {
    listFold: base + contentFloor(input) + list,
    workbenchGutter:
      base + (input.sidebarShown ? list : 0) + pageWidthForGutter(input),
  };
}

function listRegion(input: FrameLayoutInput, listFold: number): ListRegion {
  const folded = !input.sidebarShown || input.width < listFold;
  const openWidth = listOpenWidth(input);

  return {
    offset: input.measures.inset + input.measures.railWidth,
    width: folded ? 0 : openWidth,
    folded,
    openWidth,
    available: listAvailable(input),
  };
}

// Everything beside the list but the Inspector: the Workbench is drawn over the page, never beside it.
function pageRegion(
  input: FrameLayoutInput,
  contentStart: number,
  inspector: FrameLayout['inspector'],
): FrameLayout['page'] {
  const trailing = occupied(inspector.width, input.measures.paneGap);
  const hidden = inspector.expanded;

  return {
    offset: contentStart,
    width: hidden ? 0 : Math.max(0, input.width - contentStart - trailing),
    hidden,
  };
}

const centredContent = (
  { measures }: FrameLayoutInput,
  page: PaneSpan,
): PaneSpan =>
  contentSpan(page, {
    maximum: measures.contentMaximum,
    gutter: measures.contentGutter,
  });

// How far the centred content moves towards the page's leading edge so a Workbench in the gutter keeps its gap from the column: nothing where the trailing gutter alone holds it.
function contentShift(
  { measures }: FrameLayoutInput,
  centred: PaneSpan,
  workbench: FrameLayout['workbench'],
): number {
  if (workbench.state !== 'gutter') return 0;

  const columnEnd = centred.offset + centred.width - measures.contentGutter;

  return Math.max(0, columnEnd + measures.paneGap - workbench.offset);
}

// The content column: centred in the page, or beside a Workbench that the trailing gutter alone does not hold.
function contentRegion(
  input: FrameLayoutInput,
  { page, workbench }: Placed,
): Pick<FrameLayout, 'content' | 'contentShift'> {
  const centred = centredContent(input, page);
  const shift = contentShift(input, centred, workbench);

  return {
    content: { ...centred, offset: centred.offset - shift },
    contentShift: shift,
  };
}

// The title starts on the content column's leading edge, and never under the band's leading group.
const bandTitleLeading = (
  { measures }: FrameLayoutInput,
  content: PaneSpan,
): number =>
  Math.max(0, content.offset - measures.bandLeading) + measures.contentGutter;

type Placed = Pick<
  FrameLayout,
  'rail' | 'list' | 'inspector' | 'page' | 'workbench'
>;

// The rail and the list, and where the page starts after them.
function leadingRegions(
  input: FrameLayoutInput,
  { listFold }: FrameLayout['thresholds'],
): Pick<FrameLayout, 'rail' | 'list'> & { contentStart: number } {
  const { inset, railWidth } = input.measures;
  const list = listRegion(input, listFold);

  return {
    rail: { offset: inset, width: railWidth },
    list,
    contentStart: list.offset + list.width + inset,
  };
}

function placeRegions(
  input: FrameLayoutInput,
  thresholds: FrameLayout['thresholds'],
): Placed {
  const { contentStart, ...leading } = leadingRegions(input, thresholds);
  const inspector = inspectorRegion(input, contentStart);
  const page = pageRegion(input, contentStart, inspector);

  return {
    ...leading,
    inspector,
    page,
    workbench: workbenchRegion(input, page),
  };
}

const arrangement = (
  input: FrameLayoutInput,
  placed: Placed,
): FrameArrangement => ({
  sidebarShown: input.sidebarShown,
  inspectorState: input.inspectorState,
  listFolded: placed.list.folded,
  workbench: placed.workbench.state,
});

/*
 * A wide window's Frame: the window's width, the Frame's measures, the preferred pane widths and what the
 * person asked of the sidebar, the Workbench and the Inspector in; every region, divider and resize limit out.
 * The content keeps its floor before the list folds; the Workbench takes no width and shows where the page's gutters hold it, the content moving aside where the trailing one alone does not.
 */
export function frameLayout(input: FrameLayoutInput): FrameLayout {
  const thresholds = requestedThresholds(input, budgetThresholds(input));
  const placed = placeRegions(input, thresholds);
  const column = contentRegion(input, placed);

  return {
    ...placed,
    ...column,
    panesTop: input.measures.bandHeight,
    thresholds,
    sidebarWidth: railZone(input.measures) + placed.list.width,
    handles: resizeHandles(input, placed),
    bandTitleLeading: bandTitleLeading(input, column.content),
    transitionKey: transitionKeyOf(arrangement(input, placed)),
  };
}
