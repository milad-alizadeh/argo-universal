import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import { cn } from '../../../utils';
import type { ComboboxContentProps, ComboboxOption } from './combobox-props';

export type OptionProps<Value extends string> = ComboboxContentProps<Value> & {
  option: ComboboxOption<Value>;
};

export function ComboboxOptionRow<Value extends string>(
  props: OptionProps<Value>,
): ReactElement {
  return (
    <button {...buttonProps(props)}>
      {props.option.icon && (
        <Icon name={props.option.icon} role="row" aria-hidden />
      )}
      <OptionText option={props.option} />
      {props.option.value === props.value && (
        <Icon name="check" role="mark" aria-hidden />
      )}
    </button>
  );
}

function buttonProps<Value extends string>(
  props: OptionProps<Value>,
): React.ComponentProps<'button'> {
  return {
    type: 'button',
    role: 'radio',
    'aria-label': props.option.accessibilityLabel ?? props.option.label,
    ...optionState(props),
    onClick: () => {
      props.onValueChange(props.option.value);
      props.onClose?.();
    },
    className: optionClass(props.option.value === props.value),
  };
}

function optionState<Value extends string>(
  props: OptionProps<Value>,
): Pick<React.ComponentProps<'button'>, 'disabled' | 'aria-checked'> {
  return {
    disabled: props.option.disabled || props.disabled,
    'aria-checked': props.option.value === props.value,
  };
}

function optionClass(selected: boolean): string {
  return cn(
    'min-h-10 w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-50',
    selected && 'bg-selected',
  );
}

function OptionText({
  option,
}: {
  option: ComboboxOption<string>;
}): ReactElement {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <Text>{option.label}</Text>
      <Supporting option={option} />
    </View>
  );
}

function Supporting({
  option,
}: {
  option: ComboboxOption<string>;
}): ReactElement | null {
  return option.supporting ? (
    <Text role={option.code ? 'code' : 'secondary'}>{option.supporting}</Text>
  ) : null;
}
