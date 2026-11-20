import { contentSpan } from '../../../lib/product/content-rule';
import type { PaneSpan } from '../utils/pane-shift';
import type { FrameLayout, FrameLayoutInput } from './frame-layout-types';
import { pageWidthForCentred } from './frame-layout-workbench';

type Placed = Pick<FrameLayout, 'page' | 'workbench'>;

const centredContent = (
  { measures }: FrameLayoutInput,
  page: PaneSpan,
): PaneSpan =>
  contentSpan(page, {
    maximum: measures.contentMaximum,
    gutter: measures.contentGutter,
  });

// How far the column moves towards the page's leading edge for a Workbench in the gutter: nothing on a page wide enough to keep it centred, and otherwise Codex's half of the card and the inset. The shift is padding on the trailing side, so where that leaves less than the cap the column narrows rather than run under the cards. An overlaid Workbench floats over the centred column and moves nothing.
function contentShift(
  input: FrameLayoutInput,
  { page, workbench }: Placed,
): number {
  if (workbench.state !== 'gutter') return 0;

  if (page.width >= pageWidthForCentred(input)) return 0;

  const { workbenchWidth, inset } = input.measures;

  return (workbenchWidth + inset) / 2;
}

// The content column: centred in the page, or centred in the room beside a Workbench in the gutter of a page too narrow to keep it centred.
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
