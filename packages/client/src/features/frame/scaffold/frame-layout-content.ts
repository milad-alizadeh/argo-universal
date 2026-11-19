import { contentSpan } from '../../../lib/product/content-rule';
import type { PaneSpan } from '../utils/pane-shift';
import type { FrameLayoutInput } from './frame-layout-types';

// The page's one content column, with its two gutters: always centred in the page, whatever the Workbench does.
export const contentRegion = (
  { measures }: FrameLayoutInput,
  page: PaneSpan,
): PaneSpan =>
  contentSpan(page, {
    maximum: measures.contentMaximum,
    gutter: measures.contentGutter,
  });
