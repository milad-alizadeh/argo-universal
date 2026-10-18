import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Menu } from '#primitives/overlays/menu';
import { ListItemFrame } from './list-item';
import {
  pickerRowValue,
  type ListItemPickerProps,
} from './list-item-picker-props';

export type { ListItemPickerProps } from './list-item-picker-props';

export function ListItemPicker<Value extends string>(
  props: ListItemPickerProps<Value>,
): ReactElement {
  return (
    <View role="group" accessibilityLabel={props.title}>
      <PickerMenu {...props} />
    </View>
  );
}

function PickerRow(props: ListItemPickerProps): ReactElement {
  return (
    <ListItemFrame
      {...props}
      role="button"
      value={pickerRowValue(props)}
      accessory={<Icon name="chevron-up-down" role="row" />}
    />
  );
}

function PickerMenu<Value extends string>(
  props: ListItemPickerProps<Value>,
): ReactElement {
  return (
    <Menu
      accessibilityLabel={props.title}
      value={props.value ?? ''}
      options={props.options}
      onValueChange={props.onValueChange}
      disabled={props.disabled}
      loading={props.loading}
      trigger={<PickerRow {...props} />}
    />
  );
}
