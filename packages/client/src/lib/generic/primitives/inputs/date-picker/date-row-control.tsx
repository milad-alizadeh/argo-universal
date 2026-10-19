import { createElement, type ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { requiredLabel } from '#primitives/fields/field';
import { useFooterDescription } from '#primitives/fields/field-description';
import { cn } from '../../../utils';
import { isInvalid } from './date-picker-invalid';
import type { DatePickerProps } from './date-picker-props';
import { inputType } from './date-picker-value';

const rowClasses = cn(
  'min-w-0 flex-1 flex-row items-center gap-4',
  'web:focus-within:outline-2 web:focus-within:outline-focus web:focus-within:-outline-offset-2',
);

// The browser's own date, time or datetime-local input: it formats the value and draws its picker.
export function DateRowControl(props: DatePickerProps): ReactElement {
  return (
    <View className={rowClasses}>
      <RowLabel {...props} />
      <DateInput {...props} />
    </View>
  );
}

function RowLabel(props: DatePickerProps): ReactElement {
  const tone = cn(
    'shrink-0',
    props.disabled && 'text-muted-foreground',
    isInvalid(props) && 'text-danger',
  );

  return (
    <Text aria-hidden role="body" className={tone}>
      {requiredLabel(props)}
    </Text>
  );
}

const inputClasses =
  'type-body min-w-0 flex-1 bg-transparent text-foreground outline-none disabled:text-muted-foreground';

function DateInput(props: DatePickerProps): ReactElement {
  const invalid = isInvalid(props);

  return createElement('input', {
    ...inputBehaviour(props),
    'aria-label': props.label,
    'aria-invalid': invalid,
    'aria-describedby': useFooterDescription({ invalid }),
    className: inputClasses,
  });
}

function inputBehaviour(
  props: DatePickerProps,
): React.InputHTMLAttributes<HTMLInputElement> {
  return {
    type: inputType(props.mode),
    value: props.value ?? '',
    required: props.required,
    disabled: props.disabled,
    onChange: (event) => props.onValueChange(event.target.value),
    onBlur: props.onBlur,
  };
}
