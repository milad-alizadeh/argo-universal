import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
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
      <SelectionMark selected={props.option.value === props.value} />
      <OptionIcon icon={props.option.icon} />
      <OptionText option={props.option} />
    </button>
  );
}

// A folder or file glyph beside the label, muted as Paper draws it.
function OptionIcon({
  icon,
}: Pick<ComboboxOption<string>, 'icon'>): ReactElement | null {
  return icon ? (
    <View className={firstLine}>
      <Icon name={icon} role="body" tone="muted" aria-hidden />
    </View>
  ) : null;
}

// Paper's popover rows: the check and icon slots are as tall as the label's first line, so a path below never moves them.
const firstLine = 'h-6 shrink-0 items-center justify-center wide-type:h-5';

function SelectionMark({ selected }: { selected: boolean }): ReactElement {
  return (
    <View className={cn(firstLine, 'w-4')}>
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
  return 'min-h-10 w-full flex items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-hover active:bg-pressed focus-visible:bg-hover focus-visible:outline-none disabled:opacity-50 wide:min-h-9 wide:gap-2 wide:px-2';
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
  return option.subtitle ? (
    <Text role={option.code ? 'secondary-code' : 'secondary'} numberOfLines={1}>
      {option.subtitle}
    </Text>
  ) : null;
}
