// Long lists use the shared searchable Combobox on both phones.
import type { ReactElement } from 'react';
import { Combobox } from '#primitives/inputs/combobox';
import type { PickerProps } from './picker-props';

export const drillInLimit = 7;

export function PickerDrillIn<Value extends string>(
  props: PickerProps<Value>,
): ReactElement {
  return (
    <Combobox
      {...props}
      options={props.options.map((option) => ({
        ...option,
        subtitle: option.subtitle,
      }))}
    />
  );
}
