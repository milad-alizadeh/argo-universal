import { markdownBlockClassNames } from '#lib/generic/markdown-marks';
import { cn } from '#lib/generic/utils';

const listClassName = 'my-1 pl-5 marker:text-muted-foreground';

// The Feed's block look in the editor's DOM; a list draws its own markers, in the Feed's marker colour.
export const blockThemeClassNames = {
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
};
