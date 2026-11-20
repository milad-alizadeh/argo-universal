import { contentSpan } from '../../../lib/product/content-rule';
import type { PaneSpan } from '../utils/pane-shift';
import type { FrameLayout, FrameLayoutInput } from './frame-layout-types';
import { workbenchDrawn } from './frame-layout-workbench';

type Placed = Pick<FrameLayout, 'page' | 'workbench'>;

const centredContent = (
  { measures }: FrameLayoutInput,
  page: PaneSpan,
): PaneSpan =>
  contentSpan(page, {
    maximum: measures.contentMaximum,
    gutter: measures.contentGutter,
  });

// How far the column moves towards the page's leading edge so a drawn Workbench, in the gutter or over the content, keeps its gap from it: nothing where the trailing gutter alone holds it. The shift is padding, so past the capped width the column narrows as it moves, and it narrows no further than the Composer's width.
function contentShift(
  input: FrameLayoutInput,
  { page, workbench }: Placed,
): number {
  if (!workbenchDrawn(workbench.state)) return 0;

  const { contentGutter, composerWidth, paneGap } = input.measures;
  const centred = centredContent(input, page);
  const clear = workbench.offset - paneGap;
  const moved = centred.offset + centred.width - contentGutter - clear;
  const narrowed = (page.offset + page.width - contentGutter - clear) / 2;
  const room = (page.width - contentGutter * 2 - composerWidth) / 2;

  return Math.max(0, Math.min(moved, narrowed, room));
}

// The content column: centred in the page, or beside a Workbench the page's gutter alone does not hold, over the content as well as in the gutter.
export function contentRegion(
  input: FrameLayoutInput,
  placed: Placed,
): Pick<FrameLayout, 'content' | 'contentShift'> {
  const { page } = placed;
  const shift = contentShift(input, placed);
  const width = page.width - shift * 2;

  return {
    content: centredContent(input, { offset: page.offset, width }),
    contentShift: shift,
  };
}
