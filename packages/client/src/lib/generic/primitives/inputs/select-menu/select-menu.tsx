import type { ReactElement } from 'react';
import { cn } from '#lib/generic/utils';
import { useWide } from '../../../use-wide/use-wide';
import { useInListItem } from '../../lists/list-item/list-item-accessory';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../select/select';
import type { SelectVariant } from '../select/select-styles';

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
  variant?: SelectVariant;
  // The values are code, such as branch names, and draw in the mono face.
  code?: boolean;
}
function selectMenuClassName({
  invalid,
  variant,
}: Pick<SelectMenuProps<string>, 'invalid' | 'variant'>): string {
  return cn(
    variant !== 'plain' &&
      'h-9 sm:h-9 w-full! bg-background dark:bg-background',
    invalid && 'border-destructive',
  );
}

// A plain picker on a phone row shows its value like a row value: body size, muted (Paper 2V85).
const rowValueClassName =
  'text-base leading-6 font-normal text-muted-foreground';
const isRowValue = (
  variant: SelectVariant | undefined,
  wide: boolean,
): boolean => variant === 'plain' && !wide;

function valueClassName(
  { code, variant }: Pick<SelectMenuProps<string>, 'code' | 'variant'>,
  wide: boolean,
): string {
  if (code) return 'type-code';
  return isRowValue(variant, wide) ? rowValueClassName : 'type-control';
}

function SelectMenuValue<Value extends string>(
  props: SelectMenuProps<Value>,
): ReactElement {
  return (
    <SelectValue
      className={valueClassName(props, useWide())}
      placeholder={props.placeholder ?? 'Choose…'}
    />
  );
}
function SelectMenuTrigger<Value extends string>(
  props: SelectMenuProps<Value>,
): ReactElement {
  const inListItem = useInListItem();
  // A ListItem's accessory is plain unless it asks otherwise.
  const variant = props.variant ?? (inListItem ? 'plain' : 'default');
  return (
    <SelectTrigger
      accessibilityLabel={props.accessibilityLabel}
      disabled={props.disabled}
      variant={variant}
      className={selectMenuClassName({ invalid: props.invalid, variant })}
    >
      <SelectMenuValue {...props} variant={variant} />
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
