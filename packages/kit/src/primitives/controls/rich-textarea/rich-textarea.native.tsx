import type * as React from 'react';
import { useImperativeHandle, useRef } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { cn } from '#kit/utils';
import {
  useNativeSuggestions,
  type NativeSuggestions,
} from './rich-textarea-native-suggestions';
import {
  plainFieldClassName,
  type RichTextareaHandle,
  type RichTextareaProps,
} from './rich-textarea-props';
import { SuggestionPortal } from './rich-textarea-suggestion-list';
import type { SuggestionSource } from './rich-textarea-suggestions';

type TextInputInstance = React.ComponentRef<typeof TextInput>;

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
  ref: _ref,
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

const fieldLook = {
  multiline: true,
  textAlignVertical: 'top',
  style: { maxHeight: maximumVisibleLines * lineHeight },
} as const;

interface PlainFieldProps {
  props: RichTextareaProps;
  inputRef: React.Ref<TextInputInstance>;
  fieldProps: NativeSuggestions['fieldProps'];
}

function PlainField({
  props,
  inputRef,
  fieldProps,
}: PlainFieldProps): React.JSX.Element {
  return (
    <TextInput
      ref={inputRef}
      {...plainFieldProps(props)}
      {...fieldProps}
      {...fieldLook}
      className={fieldClassName(props)}
    />
  );
}

// The handle's `insertWord`, which focuses the field before writing into it.
function useFieldHandle(
  props: RichTextareaProps,
  insertWord: RichTextareaHandle['insertWord'],
): React.RefObject<TextInputInstance | null> {
  const inputRef = useRef<TextInputInstance>(null);

  const handle = (): RichTextareaHandle => ({
    insertWord: (word): void => {
      inputRef.current?.focus();
      insertWord(word);
    },
  });

  useImperativeHandle(props.ref, handle, [insertWord]);

  return inputRef;
}

function RichTextarea(props: RichTextareaProps): React.JSX.Element {
  const { groups, choose, fieldProps, insertWord } = useNativeSuggestions(
    props.value,
    props.onChangeText,
    props.suggestions ?? noSuggestions,
  );

  const inputRef = useFieldHandle(props, insertWord);

  return (
    <View className="w-full">
      {groups ? <SuggestionPortal groups={groups} onChoose={choose} /> : null}
      <PlainField props={props} inputRef={inputRef} fieldProps={fieldProps} />
    </View>
  );
}

export { RichTextarea };

RichTextarea satisfies React.ComponentType<RichTextareaProps>;
