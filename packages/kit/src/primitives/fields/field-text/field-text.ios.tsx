import {
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

/*
 * The title above the input, both leading-aligned, at every width: a long title wraps on its own lines and is
 * never cut short beside the value.
 */
export function FieldText(props: FieldTextProps): ReactElement {
  const field = useFieldProps(props);

  return (
    <VStack alignment="leading" spacing={8}>
      {props.hideTitle ? null : (
        <RowTitle {...props} tone={fieldTextTone(props.error)} />
      )}
      {props.secure ? <SecureField {...field} /> : <TextField {...field} />}
    </VStack>
  );
}

function useFieldProps(props: FieldTextProps): TextFieldProps {
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
    modifiers: modifiers(props),
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

function modifiers(props: FieldTextProps): TextFieldProps['modifiers'] {
  return [
    multilineTextAlignment('leading'),
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
