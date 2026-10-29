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
import { dockedWorkbench, reservedWorkbench } from './frame-layout-workbench';

export { resizeOutcome } from './frame-layout-handles';

export { workbenchDrawn } from './frame-layout-workbench';

export type * from './frame-layout-types';

// Docked, every region needs its room beside the content's floor; the Workbench undocks first, then the list folds.
function budgetThresholds(input: FrameLayoutInput): FrameLayout['thresholds'] {
  const folded = railZone(input.measures) + contentFloor(input.measures);

  const workbenchUndock =
    folded + reservedWorkbench(input) + inspectorBudget(input);

  return {
    listFold: workbenchUndock + preferredListWidth(input),
    workbenchUndock,
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

function pageRegion(
  input: FrameLayoutInput,
  contentStart: number,
  { inspector, workbench }: Pick<FrameLayout, 'inspector' | 'workbench'>,
): FrameLayout['page'] {
  const trailing =
    dockedWorkbench(input, workbench.state) +
    occupied(inspector.width, input.measures.paneGap);

  const hidden = inspector.expanded || workbench.state === 'dedicated';

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
  const workbench = workbenchRegion(input, inspector, contentStart);

  return {
    ...leading,
    inspector,
    page: pageRegion(input, contentStart, { inspector, workbench }),
    workbench,
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
 * The content keeps its floor first, then the Workbench undocks, then the list folds.
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
