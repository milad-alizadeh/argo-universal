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
import { gutterPage } from './frame-layout-workbench';

export { resizeOutcome } from './frame-layout-handles';

export { workbenchDrawn } from './frame-layout-workbench';

export type * from './frame-layout-types';

// The list folds when the page would go below the content's floor; the Workbench, which takes no width, hides when the page's gutters no longer hold it.
function budgetThresholds(input: FrameLayoutInput): FrameLayout['thresholds'] {
  const leading =
    railZone(input.measures) +
    inspectorBudget(input) +
    (input.sidebarShown ? preferredListWidth(input) : 0);

  return {
    listFold:
      railZone(input.measures) +
      contentFloor(input.measures) +
      inspectorBudget(input) +
      preferredListWidth(input),
    workbenchGutter: leading + gutterPage(input),
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

const contentRegion = (
  { measures }: FrameLayoutInput,
  page: PaneSpan,
): PaneSpan =>
  contentSpan(page, {
    maximum: measures.contentMaximum,
    gutter: measures.contentGutter,
  });

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
 * The content keeps its floor before the list folds; the Workbench takes no width and shows where the page's gutter holds it.
 */
export function frameLayout(input: FrameLayoutInput): FrameLayout {
  const thresholds = requestedThresholds(input, budgetThresholds(input));
  const placed = placeRegions(input, thresholds);
  const content = contentRegion(input, placed.page);

  return {
    ...placed,
    panesTop: input.measures.bandHeight,
    thresholds,
    sidebarWidth: railZone(input.measures) + placed.list.width,
    content,
    handles: resizeHandles(input, placed),
    bandTitleLeading: bandTitleLeading(input, content),
    transitionKey: transitionKeyOf(arrangement(input, placed)),
  };
}
