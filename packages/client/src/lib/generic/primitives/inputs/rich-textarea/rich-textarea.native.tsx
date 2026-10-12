import type * as React from 'react';
import { useState } from 'react';
import type { TextInputContentSizeChangeEvent } from 'react-native';
import { Textarea } from '../textarea/textarea';
import {
  plainFieldClassName,
  plainFieldProps,
  type RichTextareaProps,
} from './rich-textarea-props';

// The phone drawing: a plain native text area that grows a line at a time to 6 lines, then scrolls.
const maximumVisibleLines = 6;
const lineHeight = 20;
const maximumTextHeight = maximumVisibleLines * lineHeight;

function RichTextarea(props: RichTextareaProps): React.JSX.Element {
  const [textHeight, setTextHeight] = useState(
    Math.min(maximumVisibleLines, props.value.split('\n').length) * lineHeight,
  );
  return (
    <Textarea
      {...plainFieldProps(props)}
      numberOfLines={maximumVisibleLines}
      scrollEnabled={textHeight >= maximumTextHeight}
      onContentSizeChange={(event) => setTextHeight(visibleHeight(event))}
      style={{ height: textHeight }}
      className={plainFieldClassName}
    />
  );
}

function visibleHeight(event: TextInputContentSizeChangeEvent): number {
  const { height } = event.nativeEvent.contentSize;
  return Math.max(lineHeight, Math.min(maximumTextHeight, height));
}

export { RichTextarea };
