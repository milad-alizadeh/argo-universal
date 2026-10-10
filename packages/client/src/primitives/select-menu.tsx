import type { ReactElement } from 'react';
import { cn } from '#lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

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
}
function selectMenuClassName(invalid?: boolean): string {
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
  const classes = selectMenuClassName(props.invalid);
  return (
    <SelectTrigger
      accessibilityLabel={props.accessibilityLabel}
      disabled={props.disabled}
      className={classes}
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
