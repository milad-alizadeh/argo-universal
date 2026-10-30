import type * as React from 'react';
import { useImperativeHandle, useRef } from 'react';
import {
  TextInput,
  useWindowDimensions,
  View,
  type TextInputProps,
} from 'react-native';
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

type TextInputInstance = React.ComponentRef<typeof TextInput>;

// The phone drawing: a plain native text area that grows to 6 lines, then scrolls (no numberOfLines).
const maximumVisibleLines = 6;

// The control role's line height at the unscaled text size.
const lineHeight = 20;

/*
 * Six lines means six of the reader's own lines. Kit text scales with Dynamic Type (ADR-0032), so the cap
 * scales with it; held at the unscaled 120, the largest sizes fit barely two lines and cut the first one in
 * half (#1529).
 */
function useFieldMaxHeight(): number {
  const { fontScale } = useWindowDimensions();

  return maximumVisibleLines * lineHeight * Math.max(1, fontScale);
}

// What the text field takes: the drawing's own props stay out of it.
function textFieldProps({
  onSubmit: _onSubmit,
  disabled: _disabled,
  fieldClassName: _fieldClassName,
  autoFocus: _autoFocus,
  references: _references,
  suggestions: _suggestions,
  onResourcesChange: _onResourcesChange,
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
} as const;

const useFieldLook = (): TextInputProps => ({
  ...fieldLook,
  style: { maxHeight: useFieldMaxHeight() },
});

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
      {...useFieldLook()}
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
  const { groups, choose, fieldProps, insertWord } =
    useNativeSuggestions(props);

  const inputRef = useFieldHandle(props, insertWord);

  return (
    <View className="w-full min-h-0 shrink">
      {groups ? <SuggestionPortal groups={groups} onChoose={choose} /> : null}
      <PlainField props={props} inputRef={inputRef} fieldProps={fieldProps} />
    </View>
  );
}

export { RichTextarea };

RichTextarea satisfies React.ComponentType<RichTextareaProps>;
