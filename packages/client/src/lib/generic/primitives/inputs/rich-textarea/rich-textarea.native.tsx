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
  disabled = false,
  fieldClassName: _fieldClassName,
  autoFocus: _autoFocus,
  ...field
}: RichTextareaProps): TextInputProps {
  return {
    ...field,
    editable: !disabled,
    placeholderTextColorClassName:
      'accent-muted-foreground/70 dark:accent-muted-foreground',
  };
}

const fieldClassName = (props: RichTextareaProps): string =>
  cn(
    'w-full text-foreground',
    plainFieldClassName,
    props.fieldClassName,
    props.disabled === true && 'opacity-50',
  );

function RichTextarea(props: RichTextareaProps): React.JSX.Element {
  return (
    <TextInput
      {...plainFieldProps(props)}
      multiline
      textAlignVertical="top"
      style={{ maxHeight: maximumVisibleLines * lineHeight }}
      className={fieldClassName(props)}
    />
  );
}

export { RichTextarea };

RichTextarea satisfies React.ComponentType<RichTextareaProps>;
