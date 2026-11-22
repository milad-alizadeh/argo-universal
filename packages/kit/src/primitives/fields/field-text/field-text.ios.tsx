import {
  LabeledContent,
  VStack,
  SecureField,
  TextField,
  type TextFieldProps,
  type TextFieldRef,
  useNativeState,
} from '@expo/ui/swift-ui';
import {
  disabled,
  accessibilityLabel,
  accessibilityHint,
  autocorrectionDisabled,
  textInputAutocapitalization,
  keyboardType,
  multilineTextAlignment,
  onSubmit,
} from '@expo/ui/swift-ui/modifiers';
import { type ReactElement, type RefObject, useEffect, useRef } from 'react';
import { RowTitle } from '#primitives/fields/field-row';
import type { FieldTextProps } from './field-text-props';
import { fieldTextTone } from './field-text-tone';

type SwiftKeyboard = Parameters<typeof keyboardType>[0];

type FieldAlignment = 'leading' | 'trailing';

export function FieldText(props: FieldTextProps): ReactElement {
  const alignment = props.hideTitle
    ? 'leading'
    : (props.iosValuePlacement ?? 'leading');

  const field = useFieldProps(props, alignment);

  const input = props.secure ? (
    <SecureField {...field} />
  ) : (
    <TextField {...field} />
  );

  const title = props.hideTitle ? null : (
    <RowTitle {...props} tone={fieldTextTone(props.error)} />
  );

  if (alignment === 'trailing')
    return <LabeledContent label={title}>{input}</LabeledContent>;

  return (
    <VStack alignment="leading" spacing={8}>
      {title}
      {input}
    </VStack>
  );
}

function useFieldProps(
  props: FieldTextProps,
  alignment: FieldAlignment,
): TextFieldProps {
  const text = useSwiftFieldText(props.value);
  const ref = useRef<TextFieldRef>(null);

  return {
    ref,
    text,
    autoFocus: props.autoFocus,
    axis: props.multiline ? 'vertical' : 'horizontal',
    placeholder: props.placeholder,
    onTextChange: props.onChangeText,
    onFocusChange: (focused) => focusChanged(props, ref, focused),
    modifiers: modifiers(props, alignment),
  };
}

// SwiftUI has no select-on-focus; the field takes the whole text as its selection once it has focus (iOS 18+). Losing focus is a blur.
function focusChanged(
  props: FieldTextProps,
  ref: RefObject<TextFieldRef | null>,
  focused: boolean,
): void {
  if (focused) selectAll(props, ref);
  else props.onBlur?.();
}

function selectAll(
  props: FieldTextProps,
  ref: RefObject<TextFieldRef | null>,
): void {
  if (selectsOnFocus(props))
    void ref.current?.setSelection(0, props.value.length);
}

function modifiers(
  props: FieldTextProps,
  alignment: FieldAlignment,
): TextFieldProps['modifiers'] {
  return [
    multilineTextAlignment(alignment),
    accessibilityLabel(props.title),
    ...errorHint(props.error),
    ...secureModifiers(props.secure),
    keyboardType(swiftKeyboard(props.keyboardType)),
    disabled(props.disabled ?? false),
    ...(props.onSubmit ? [onSubmit(() => props.onSubmit?.())] : []),
  ];
}

function swiftKeyboard(type: FieldTextProps['keyboardType']): SwiftKeyboard {
  if (type === 'number-pad') return 'numeric';

  return type ?? 'default';
}

// The SwiftUI field holds its text in native state; a value the caller changes is written back.
function useSwiftFieldText(
  value: string,
): ReturnType<typeof useNativeState<string>> {
  const text = useNativeState(value);

  useEffect(() => {
    if (text.get() !== value) text.set(value);
  }, [text, value]);

  return text;
}

const secretModifiers = [
  autocorrectionDisabled(),
  textInputAutocapitalization('never'),
];

const selectsOnFocus = (props: FieldTextProps): boolean =>
  props.selectTextOnFocus === true && !props.secure;

const errorHint = (error?: string): NonNullable<TextFieldProps['modifiers']> =>
  error ? [accessibilityHint(error)] : [];

const secureModifiers = (
  secure?: boolean,
): NonNullable<TextFieldProps['modifiers']> => (secure ? secretModifiers : []);
