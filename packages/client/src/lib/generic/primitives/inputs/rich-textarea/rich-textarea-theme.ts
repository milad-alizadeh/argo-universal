import {
  markdownBlockClassNames,
  markdownLinkClassNames,
} from '#lib/generic/markdown-marks';
import { cn } from '#lib/generic/utils';

const listClassName = cn('my-1 pl-5', markdownBlockClassNames.domListMarker);
const heading = markdownBlockClassNames.heading;

// The Feed's block and link look in the editor's DOM; a list draws its own markers, in the Feed's marker colour.
export const blockThemeClassNames = {
  heading: {
    h1: heading,
    h2: heading,
    h3: heading,
    h4: heading,
    h5: heading,
    h6: heading,
  },
  list: {
    ul: cn('list-disc', listClassName),
    ol: cn('list-decimal', listClassName),
    nested: { listitem: 'list-none' },
  },
  quote: cn('my-1', markdownBlockClassNames.quote),
  code: cn(
    'my-1 block overflow-x-auto whitespace-pre px-3 py-2',
    markdownBlockClassNames.codeBlock,
    markdownBlockClassNames.codeText,
  ),
  link: cn(markdownLinkClassNames.underline, markdownLinkClassNames.domColor),
};
