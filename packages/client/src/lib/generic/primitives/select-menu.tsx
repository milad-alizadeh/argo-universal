import type { ReactElement } from 'react';
import { cn } from '#lib/generic/utils';
import { useInListItem } from './list-item-accessory';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import type { SelectVariant } from './select-styles';

interface SelectMenuOption<Value extends string> {
  value: Value;
  label: string;
}
export interface SelectMenuProps<Value extends string> {
  value?: Value;
  options: readonly SelectMenuOption<Value>[];
  onValueChange: (value: Value) => void;
  accessibilityLabel: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  // Plain has no border or background. A ListItem's accessory takes it by default.
  variant?: SelectVariant;
}
function selectMenuClassName(
  variant: SelectVariant,
  invalid?: boolean,
): string | undefined {
  if (variant === 'plain') return undefined;
  return cn(
    'h-9 sm:h-9 w-full! bg-background dark:bg-background',
    invalid && 'border-destructive',
  );
}

function SelectMenuValue<Value extends string>(
  props: SelectMenuProps<Value>,
): ReactElement {
  return (
    <SelectValue
      className="type-control"
      placeholder={props.placeholder ?? 'Choose…'}
    />
  );
}
function SelectMenuTrigger<Value extends string>(
  props: SelectMenuProps<Value>,
): ReactElement {
  const inListItem = useInListItem();
  const variant = props.variant ?? (inListItem ? 'plain' : 'default');
  return (
    <SelectTrigger
      accessibilityLabel={props.accessibilityLabel}
      disabled={props.disabled}
      variant={variant}
      className={selectMenuClassName(variant, props.invalid)}
    >
      <SelectMenuValue {...props} />
    </SelectTrigger>
  );
}
function SelectMenuItems<Value extends string>({
  options,
}: SelectMenuProps<Value>): ReactElement {
  return (
    <SelectContent>
      {options.map((option) => (
        <SelectItem
          key={option.value}
          value={option.value}
          label={option.label}
        />
      ))}
    </SelectContent>
  );
}
function chooseMenuOption<Value extends string>(
  props: SelectMenuProps<Value>,
  value?: string,
): void {
  const option = props.options.find((item) => item.value === value);
  if (option) props.onValueChange(option.value);
}
export function SelectMenu<Value extends string>(
  props: SelectMenuProps<Value>,
): ReactElement {
  const chosen = props.options.find((option) => option.value === props.value);
  return (
    <Select
      value={chosen}
      onValueChange={(next) => chooseMenuOption(props, next?.value)}
      disabled={props.disabled}
    >
      <SelectMenuTrigger {...props} />
      <SelectMenuItems {...props} />
    </Select>
  );
}
