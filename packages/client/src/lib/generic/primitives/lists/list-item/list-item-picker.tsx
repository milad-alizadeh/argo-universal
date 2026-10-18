import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Menu } from '#primitives/overlays/menu';
import type { ListItemPickerProps } from './list-item-picker-props';
import { PickerRow } from './list-item-picker-row';

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
