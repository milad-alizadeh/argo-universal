import {
  HStack,
  SecureField,
  TextField,
  type TextFieldProps,
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
import { type ReactElement, useEffect } from 'react';
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
      <HStack modifiers={titleColumn}>
        <RowTitle {...props} />
      </HStack>
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

  return {
    text,
    placeholder: props.placeholder,
    onTextChange: props.onChangeText,
    onFocusChange: (focused: boolean): void => {
      if (!focused) props.onBlur?.();
    },
    modifiers: modifiers(props),
  };
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
