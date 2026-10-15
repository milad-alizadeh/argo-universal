import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import type { ComboboxContentProps, ComboboxOption } from './combobox-props';

export type OptionProps<Value extends string> = ComboboxContentProps<Value> & {
  option: ComboboxOption<Value>;
};

export function ComboboxOptionRow<Value extends string>(
  props: OptionProps<Value>,
): ReactElement {
  return (
    <button {...buttonProps(props)}>
      <SelectionMark selected={props.option.value === props.value} />
      {props.option.icon && (
        <Icon name={props.option.icon} role="row" aria-hidden />
      )}
      <OptionText option={props.option} />
    </button>
  );
}

function SelectionMark({ selected }: { selected: boolean }): ReactElement {
  return (
    <View className="w-4 shrink-0 items-center">
      {selected && <Icon name="check" role="control" aria-hidden />}
    </View>
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
    className: optionClass(),
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

function optionClass(): string {
  return 'min-h-10 w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-muted active:bg-border focus-visible:bg-muted focus-visible:outline-none disabled:opacity-50 wide:min-h-9 wide:gap-2 wide:px-2';
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
