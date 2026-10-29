import type * as React from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { cn } from '#kit/utils';
import {
  useNativeSuggestions,
  type NativeSuggestions,
} from './rich-textarea-native-suggestions';
import {
  plainFieldClassName,
  type RichTextareaProps,
} from './rich-textarea-props';
import { SuggestionPortal } from './rich-textarea-suggestion-list';
import type { SuggestionSource } from './rich-textarea-suggestions';

// The phone drawing: a plain native text area that grows to 6 lines, then scrolls (no numberOfLines).
const maximumVisibleLines = 6;

const lineHeight = 20;

const noSuggestions: readonly SuggestionSource[] = [];

// What the text field takes: the drawing's own props stay out of it.
function textFieldProps({
  onSubmit: _onSubmit,
  disabled: _disabled,
  fieldClassName: _fieldClassName,
  autoFocus: _autoFocus,
  references: _references,
  suggestions: _suggestions,
  ...field
}: RichTextareaProps): TextInputProps {
  return field;
}

const plainFieldProps = (props: RichTextareaProps): TextInputProps => ({
  ...textFieldProps(props),
  editable: props.disabled !== true,
  placeholderTextColorClassName:
    'accent-muted-foreground/70 dark:accent-muted-foreground',
});

const fieldClassName = (props: RichTextareaProps): string =>
  cn(
    // Clipped, so the lines scrolled past the six it shows stay inside the card instead of painting over its edge.
    'w-full overflow-hidden text-foreground',
    plainFieldClassName,
    props.fieldClassName,
    props.disabled === true && 'opacity-50',
  );

interface PlainFieldProps {
  props: RichTextareaProps;
  fieldProps: NativeSuggestions['fieldProps'];
}

function PlainField({ props, fieldProps }: PlainFieldProps): React.JSX.Element {
  return (
    <TextInput
      {...plainFieldProps(props)}
      {...fieldProps}
      multiline
      textAlignVertical="top"
      style={{ maxHeight: maximumVisibleLines * lineHeight }}
      className={fieldClassName(props)}
    />
  );
}

function RichTextarea(props: RichTextareaProps): React.JSX.Element {
  const { groups, choose, fieldProps } = useNativeSuggestions(
    props.value,
    props.onChangeText,
    props.suggestions ?? noSuggestions,
  );

  return (
    <View className="w-full">
      {groups ? <SuggestionPortal groups={groups} onChoose={choose} /> : null}
      <PlainField props={props} fieldProps={fieldProps} />
    </View>
  );
}

export { RichTextarea };

RichTextarea satisfies React.ComponentType<RichTextareaProps>;
