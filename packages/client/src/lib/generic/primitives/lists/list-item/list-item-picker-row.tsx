import type { ReactElement } from 'react';
import { Icon } from '#primitives/content/icon';
import { ListItemFrame } from './list-item';
import {
  pickerRowValue,
  type ListItemPickerProps,
} from './list-item-picker-props';

export function PickerRow(props: ListItemPickerProps): ReactElement {
  return (
    <ListItemFrame
      {...props}
      role="button"
      value={pickerRowValue(props)}
      accessory={<Icon name="chevron-up-down" role="row" />}
    />
  );
}
