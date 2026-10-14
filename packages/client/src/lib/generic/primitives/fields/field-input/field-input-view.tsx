import type * as React from 'react';
import { type TextInputProps, View } from 'react-native';
import { cn } from '../../../utils';
import { Text } from '../../display/text/text';
import { Input } from '../../inputs/input/input';
import { rowClasses } from '../../lists/list-item/list-item-styles';
import { useFooterDescription } from '../field-footer';
import type { FieldInputProps } from '../field-props';

export const isInvalid = (props: Pick<FieldInputProps, 'errors'>): boolean =>
  (props.errors?.length ?? 0) > 0;

// A section row: the label, then the field filling the rest; the row shows the focus ring.
export function FieldInput(props: FieldInputProps): React.JSX.Element {
  return (
    <View
      className={cn(
        rowClasses({ title: props.label }, false),
        'web:focus-within:outline-2 web:focus-within:outline-ring web:focus-within:-outline-offset-2',
      )}
    >
      <RowLabel {...props} />
      <RowInput {...props} />
    </View>
  );
}

function RowLabel(props: FieldInputProps): React.JSX.Element {
  return (
    <Text
      aria-hidden
      role="body"
      className={cn(
        'shrink-0',
        props.disabled && 'text-muted-foreground',
        isInvalid(props) && 'text-destructive',
      )}
    >
      {props.label}
    </Text>
  );
}

function RowInput(props: FieldInputProps): React.JSX.Element {
  const accessibility = useInputAccessibility(props);

  return (
    <Input
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

function useInputAccessibility(props: FieldInputProps): InputAccessibility {
  return {
    accessibilityLabel: props.label,
    'aria-invalid': isInvalid(props),
    'aria-describedby': useFooterDescription({
      invalid: isInvalid(props),
      hint: props.hint,
    }),
  };
}

function inputBehaviour(props: FieldInputProps): InputProps {
  return {
    value: props.value,
    placeholder: props.placeholder,
    onChangeText: props.onChange,
    onBlur: props.onBlur,
    editable: !props.disabled,
    autoCapitalize: 'none',
    autoCorrect: false,
  };
}

const inputClasses = (mono: FieldInputProps['mono']): string =>
  cn(
    mono ? 'type-code' : 'type-body',
    'h-6 flex-1 rounded-none web:rounded-none border-0 bg-transparent px-0 py-0 shadow-none sm:h-6 web:focus-visible:ring-0 dark:bg-transparent',
  );
