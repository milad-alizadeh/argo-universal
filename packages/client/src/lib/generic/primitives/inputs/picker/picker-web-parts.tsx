import { createElement } from 'react';
import { Text } from '#primitives/display/text';
import type { FieldDescription } from '#primitives/fields/field-description';
import { cn } from '../../../utils';
import type { PickerOption, PickerProps } from './picker-props';
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './picker-select';
import { pickerOptionsMessage, pickerValue } from './picker-selection';

type TriggerProps<Value extends string> = PickerProps<Value> &
  FieldDescription & { row: boolean };

type TriggerAttributes = React.ComponentProps<typeof SelectTrigger> & {
  'aria-invalid': boolean;
  'aria-describedby'?: string;
};

export function PickerTrigger<Value extends string>(
  props: TriggerProps<Value>,
): React.JSX.Element {
  return createElement(
    SelectTrigger,
    triggerProps(props),
    <SelectValue className="type-control" placeholder={pickerValue(props)} />,
  );
}

function triggerProps<Value extends string>(
  props: TriggerProps<Value>,
): TriggerAttributes {
  return {
    accessibilityLabel: props.label,
    disabled: props.disabled,
    'aria-invalid': props.invalid,
    'aria-describedby': props.descriptionId,
    variant: props.row ? 'plain' : 'default',
    className: triggerClassName(props),
  };
}

function triggerClassName(props: { row: boolean; invalid: boolean }): string {
  return cn(
    !props.row && 'h-9 sm:h-9 w-full! rounded-lg bg-card',
    props.invalid && 'border-danger',
  );
}

export function PickerContent<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  const message = pickerOptionsMessage(props);

  return createElement(
    SelectContent,
    {},
    message ? (
      <OptionsMessage message={message} failure={!!props.loadError} />
    ) : (
      <PickerOptions {...props} />
    ),
  );
}

function OptionsMessage(props: {
  message: string;
  failure: boolean;
}): React.JSX.Element {
  return (
    <Text
      role="secondary"
      accessibilityRole={props.failure ? 'alert' : 'status'}
      className="p-3"
    >
      {props.message}
    </Text>
  );
}

function PickerOptions<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  return (
    <>
      {props.options.map((option) => (
        <WebOption key={option.value} option={option} />
      ))}
    </>
  );
}

function WebOption(props: { option: PickerOption<string> }): React.JSX.Element {
  const { value, label, disabled } = props.option;

  return <SelectItem value={value} label={label} disabled={disabled} />;
}
