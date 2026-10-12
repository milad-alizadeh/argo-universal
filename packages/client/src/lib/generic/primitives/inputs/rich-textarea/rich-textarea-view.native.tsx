import type * as React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '#lib/generic/utils';
import {
  plainFieldClassName,
  type RichTextareaProps,
} from './rich-textarea-props';

// The phone drawing: a plain native text area that grows to 6 lines, then scrolls (no numberOfLines).
const maximumVisibleLines = 6;
const lineHeight = 20;

function plainFieldProps({
  onSubmit: _onSubmit,
  editable = true,
  ...field
}: RichTextareaProps): TextInputProps {
  return {
    ...field,
    editable,
    placeholderTextColorClassName: 'accent-muted-foreground/70',
  };
}

function RichTextarea(props: RichTextareaProps): React.JSX.Element {
  return (
    <TextInput
      {...plainFieldProps(props)}
      multiline
      textAlignVertical="top"
      style={{ maxHeight: maximumVisibleLines * lineHeight }}
      className={cn(
        'w-full text-foreground',
        plainFieldClassName,
        props.editable === false && 'opacity-50',
      )}
    />
  );
}

export { RichTextarea };
