import * as RadixSelect from '@radix-ui/react-select';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useOpenState } from '#primitives/overlays/open-state';
import type { FieldPickerOption } from './field-picker-model';
import { SelectContent } from './field-picker-select-content';
import { SelectTrigger } from './field-picker-select-trigger';

export type FieldPickerSelectProps = {
  title: string;
  value: string;
  options: readonly FieldPickerOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  // Shown while no option is chosen, as the schema's `summary` is everywhere else.
  summary?: string;
  // The row's title, drawn inside the trigger so the whole row presses.
  lead?: ReactNode;
};

// Radix reserves the empty string to clear a select, and a choice such as "None" may be one: it travels as this.
const emptyValue = 'field-picker-empty';

const toRadix = (value: string): string => (value === '' ? emptyValue : value);

// Radix shows its placeholder only for the empty string, so a value no option has stands as that.
const radixValue = (props: FieldPickerSelectProps): string =>
  props.options.some((option) => option.value === props.value)
    ? toRadix(props.value)
    : '';

const fromRadix = (value: string): string =>
  value === emptyValue ? '' : value;

/*
 * The borderless web select a settings row ends in: the chosen label and the up-down chevron, no box, on Radix
 * Select. Private to the picker; Expo UI's web Picker takes no styling and draws a bordered box.
 */
export function FieldPickerSelect(
  props: FieldPickerSelectProps,
): React.JSX.Element {
  const state = useOpenState({});

  return (
    <RadixSelect.Root
      {...state}
      value={radixValue(props)}
      onValueChange={(value) => props.onValueChange(fromRadix(value))}
      disabled={props.disabled}
    >
      <Body {...props} onOpen={() => state.onOpenChange(true)} />
    </RadixSelect.Root>
  );
}

const Body = (
  props: FieldPickerSelectProps & { onOpen: () => void },
): React.JSX.Element => (
  <View>
    <SelectTrigger {...props} />
    <SelectContent
      options={props.options.map((option) => ({
        ...option,
        value: toRadix(option.value),
      }))}
    />
  </View>
);
