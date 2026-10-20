import type { ReactElement } from 'react';
import { Icon } from '#primitives/content/icon';
import { ListItemFrame } from './list-item';
import {
  pickerRowValue,
  type ListItemPickerProps,
} from './list-item-picker-props';

export function PickerRow<Value extends string>(
  props: ListItemPickerProps<Value>,
): ReactElement {
  return (
    <ListItemFrame
      {...props}
      role="button"
      value={pickerRowValue(props)}
      trailing={
        <Icon name="chevron-up-down" role="chevron" className="text-tertiary" />
      }
    />
  );
}
