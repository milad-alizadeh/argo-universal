import type * as React from 'react';
import { type TextInputProps, View } from 'react-native';
import { Text } from '#primitives/content/text';
import { useFooterDescription } from '#primitives/fields/field-description';
import { cn } from '../../../utils';
import { BareTextInput } from './text-input-bare';
import { requiredLabel } from './text-input-label';
import {
  isInvalid,
  keyboardOf,
  type PhoneFieldProps,
} from './text-input-props';
import { FieldSpinner } from './text-input-spinner';

// A section row: the label, then the field filling the rest; the row shows the focus ring.
export function RowTextInput(props: PhoneFieldProps): React.JSX.Element {
  return (
    <View
      className={cn(
        'min-w-0 flex-1 flex-row items-center gap-4',
        'web:focus-within:outline-2 web:focus-within:outline-focus web:focus-within:-outline-offset-2',
      )}
    >
      {!props.labelHidden && <RowLabel {...props} />}
      <RowInput {...props} />
      <FieldSpinner {...props} />
    </View>
  );
}

function RowLabel(props: PhoneFieldProps): React.JSX.Element {
  return (
    <Text
      aria-hidden
      role="body"
      className={cn(
        'shrink-0',
        props.disabled && 'text-muted-foreground',
        isInvalid(props) && 'text-danger',
      )}
    >
      {requiredLabel(props)}
    </Text>
  );
}

function RowInput(props: PhoneFieldProps): React.JSX.Element {
  const accessibility = useInputAccessibility(props);

  return (
    <BareTextInput
      variant="bare"
      {...accessibility}
      {...inputBehaviour(props)}
      className={inputClasses(props.mono)}
    />
  );
}

type InputProps = TextInputProps;

interface InputAccessibility {
  accessibilityLabel: string;
  'aria-invalid': boolean;
  'aria-describedby': ReturnType<typeof useFooterDescription>;
}

function useInputAccessibility(props: PhoneFieldProps): InputAccessibility {
  return {
    accessibilityLabel: props.label,
    'aria-invalid': isInvalid(props),
    'aria-describedby': useFooterDescription({
      invalid: isInvalid(props),
      hint: props.hint,
    }),
  };
}

function inputBehaviour(props: PhoneFieldProps): InputProps {
  return {
    value: props.value,
    placeholder: props.placeholder,
    onChangeText: props.onChangeText,
    onBlur: props.onBlur,
    editable: !props.disabled,
    ...keyboardOf(props),
    autoCapitalize: 'none',
    autoCorrect: false,
    autoFocus: props.focusOnOpen,
    selectTextOnFocus: props.selectOnFocus,
    onSubmitEditing: props.onSubmit,
  };
}

const inputClasses = (mono: PhoneFieldProps['mono']): string =>
  cn(
    mono ? 'type-code' : 'type-body',
    'h-6 wide-type:h-5 flex-1 rounded-none web:rounded-none border-0 bg-transparent px-0 py-0 shadow-none web:focus-visible:ring-0 dark:bg-transparent',
  );

RowTextInput satisfies React.ComponentType<PhoneFieldProps>;
