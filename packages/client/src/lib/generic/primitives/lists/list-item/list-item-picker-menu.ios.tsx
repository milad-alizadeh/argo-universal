import { Menu, RNHostView, Toggle } from '@expo/ui/swift-ui';
import { accessibilityLabel, disabled } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement, ComponentProps } from 'react';
import { View } from 'react-native';
import { Host } from '#primitives/native/host';
import {
  pickerRowValue,
  type ListItemPickerProps,
} from './list-item-picker-props';

type Size = { width: number; height: number };

type MenuProps<Value extends string> = ListItemPickerProps<Value> & {
  size: Size;
};

export function PickerMenu<Value extends string>(
  props: MenuProps<Value>,
): ReactElement {
  return (
    <Host matchContents ignoreSafeArea="all">
      <NativeMenu {...props} />
    </Host>
  );
}

function NativeMenu<Value extends string>(
  props: MenuProps<Value>,
): ReactElement {
  return (
    <Menu
      label={<Trigger size={props.size} />}
      modifiers={menuModifiers(props)}
    >
      <Options {...props} />
    </Menu>
  );
}

function Trigger({ size }: { size: Size }): ReactElement {
  return (
    <RNHostView matchContents>
      <View style={size} />
    </RNHostView>
  );
}

function menuModifiers(
  props: ListItemPickerProps,
): ComponentProps<typeof Menu>['modifiers'] {
  return [
    accessibilityLabel(`${props.title}, ${pickerRowValue(props)}`),
    disabled(!!props.disabled),
  ];
}

function Options<Value extends string>(
  props: ListItemPickerProps<Value>,
): ReactElement {
  return (
    <>
      {props.options.map((option) => (
        <Choice key={option.value} {...props} option={option} />
      ))}
    </>
  );
}

type ChoiceProps<Value extends string> = ListItemPickerProps<Value> & {
  option: ListItemPickerProps<Value>['options'][number];
};

function Choice<Value extends string>({
  option,
  value,
  onValueChange,
}: ChoiceProps<Value>): ReactElement {
  return (
    <Toggle
      label={option.label}
      isOn={option.value === value}
      modifiers={[disabled(!!option.disabled)]}
      onIsOnChange={() => onValueChange(option.value)}
    />
  );
}
