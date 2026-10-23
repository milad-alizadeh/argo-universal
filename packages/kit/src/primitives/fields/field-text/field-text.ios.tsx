import {
  HStack,
  SecureField,
  TextField,
  type TextFieldProps,
  type TextFieldRef,
  useNativeState,
} from '@expo/ui/swift-ui';
import {
  disabled,
  frame,
  keyboardType,
  lineLimit,
  multilineTextAlignment,
  onSubmit,
  truncationMode,
} from '@expo/ui/swift-ui/modifiers';
import { type ReactElement, type RefObject, useEffect, useRef } from 'react';
import { RowTitle } from '#primitives/fields/field-row';
import type { FieldGroupKitProps } from '../../kit-props';

type FieldTextProps = FieldGroupKitProps<'FieldGroup.TextField'> & {
  secure?: boolean;
};

type SwiftKeyboard = Parameters<typeof keyboardType>[0];

/*
 * A stock Settings form row (Settings > VPN > Add Configuration): the title, then the input, its text
 * leading-aligned. The title takes a fixed width and truncates on one line, so the inputs of a section's rows
 * start in one column.
 */
export function FieldText(props: FieldTextProps): ReactElement {
  const field = useFieldProps(props);

  return (
    <HStack spacing={8}>
      {props.hideTitle ? null : (
        <HStack modifiers={titleColumn}>
          <RowTitle {...props} />
        </HStack>
      )}
      {props.secure ? <SecureField {...field} /> : <TextField {...field} />}
    </HStack>
  );
}

const titleWidth = 100;

const titleColumn = [
  frame({ width: titleWidth, alignment: 'leading' }),
  lineLimit(1),
  truncationMode('tail'),
];

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
  if (props.selectTextOnFocus)
    void ref.current?.setSelection(0, props.value.length);
}

function modifiers(props: FieldTextProps): TextFieldProps['modifiers'] {
  return [
    multilineTextAlignment('leading'),
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
