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

export function SelectMenu<Value extends string>({
  value,
  options,
  onValueChange,
  accessibilityLabel,
  placeholder = 'Choose…',
  disabled,
  invalid,
}: SelectMenuProps<Value>) {
  const chosen = options.find((option) => option.value === value);
  return (
    <Select
      value={chosen}
      onValueChange={(next) => {
        const option = options.find((item) => item.value === next?.value);
        if (option) onValueChange(option.value);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        className={cn(
          'h-9 sm:h-9 w-full! bg-background dark:bg-background',
          invalid && 'border-destructive',
        )}
      >
        <SelectValue className="type-control" placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            label={option.label}
          />
        ))}
      </SelectContent>
    </Select>
  );
}
