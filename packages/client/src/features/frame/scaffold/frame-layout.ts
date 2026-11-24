import { transitionKeyOf } from '../utils/frame-timing';
import { contentRegion } from './frame-layout-content';
import { resizeHandles } from './frame-layout-handles';
import {
  contentFloor,
  inspectorBudget,
  inspectorClaim,
  occupied,
  preferredListWidth,
  railZone,
} from './frame-layout-measures';
import { listOpenWidth, requestedThresholds } from './frame-layout-sidebar';
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

// The list folds when the page would go below the content's floor; the Workbench, which takes no width, hides when the page is too narrow for it in the gutter.
function budgetThresholds(input: FrameLayoutInput): FrameLayout['thresholds'] {
  const list = preferredListWidth(input);

  return {
    listFold:
      railZone(input.measures) +
      inspectorClaim(input) +
      contentFloor(input) +
      list,
    workbenchGutter:
      inspectorBudget(input) +
      (input.sidebarShown ? list : 0) +
      (input.sidebarShown || input.listless ? railZone(input.measures) : 0) +
      pageWidthForGutter(input),
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

type Placed = Pick<
  FrameLayout,
  'rail' | 'list' | 'inspector' | 'page' | 'workbench'
>;

// A closed sidebar hides the rail with the list; a page with no list keeps the rail alone.
const railShown = (input: FrameLayoutInput, list: ListRegion): boolean =>
  !list.folded || input.listless === true;

// The rail and the list, and where the page starts after them: at the window's edge once the sidebar closes.
function leadingRegions(
  input: FrameLayoutInput,
  { listFold }: FrameLayout['thresholds'],
): Pick<FrameLayout, 'rail' | 'list'> & { contentStart: number } {
  const { inset, railWidth } = input.measures;
  const list = listRegion(input, listFold);
  const shown = railShown(input, list);

  return {
    rail: { offset: inset, width: shown ? railWidth : 0 },
    list,
    contentStart: shown ? list.offset + list.width + inset : 0,
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
    workbench: workbenchRegion(input, page, inspector),
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
 * The content keeps its floor before the list folds; the Workbench takes no width and shows where the page's gutters hold it, the content centring beside it on a page too narrow to keep it centred.
 */
export function frameLayout(input: FrameLayoutInput): FrameLayout {
  const thresholds = requestedThresholds(input, budgetThresholds(input));
  const placed = placeRegions(input, thresholds);
  const column = contentRegion(input, placed);

  return {
    ...placed,
    ...column,
    panesTop: input.measures.titleBarTop + input.measures.titleBarHeight,
    thresholds,
    sidebarWidth:
      placed.rail.width > 0 ? railZone(input.measures) + placed.list.width : 0,
    handles: resizeHandles(input, placed),
    transitionKey: transitionKeyOf(arrangement(input, placed)),
  };
}
