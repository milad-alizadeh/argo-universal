import type * as React from 'react';
import { cn } from '#lib/generic/utils';
import { Textarea } from '../textarea/textarea';
import {
  plainFieldClassName,
  plainFieldProps,
  type RichTextareaProps,
} from './rich-textarea-props';

// The web drawing: today's plain field, growing with its content to 10 lines, then scrolling.
function RichTextarea(props: RichTextareaProps): React.JSX.Element {
  return (
    <Textarea
      {...plainFieldProps(props)}
      numberOfLines={1}
      className={cn(
        plainFieldClassName,
        'max-h-[10lh] overflow-y-auto resize-none focus-visible:ring-0',
      )}
    />
  );
}

export { RichTextarea };
