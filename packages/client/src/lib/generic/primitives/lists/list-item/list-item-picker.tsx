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
      onValueChange={(next) => choose(props, next)}
      disabled={props.disabled}
      loading={props.loading}
      trigger={<PickerRow {...props} />}
    />
  );
}

function choose<Value extends string>(
  props: ListItemPickerProps<Value>,
  next: string,
): void {
  const option = props.options.find((item) => item.value === next);

  if (option) props.onValueChange(option.value);
}
