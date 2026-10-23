import type * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './picker-select';

export type PlainPickerProps = {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
};

// The borderless web select a settings row ends in: the chosen label and the up-down chevron, no box.
export function PlainPicker(props: PlainPickerProps): React.JSX.Element {
  return (
    <Select
      value={props.value}
      onValueChange={props.onValueChange}
      disabled={props.disabled}
    >
      <PlainTrigger {...props} />
      <SelectContent>{props.options.map(plainItem)}</SelectContent>
    </Select>
  );
}

const plainItem = (
  option: PlainPickerProps['options'][number],
): React.JSX.Element => <SelectItem key={option.value} {...option} />;

function PlainTrigger(props: PlainPickerProps): React.JSX.Element {
  const chosen = props.options.find((option) => option.value === props.value);

  return (
    <SelectTrigger
      variant="plain"
      accessibilityLabel={props.label}
      disabled={props.disabled}
    >
      <SelectValue className="type-body" placeholder={chosen?.label} />
    </SelectTrigger>
  );
}
