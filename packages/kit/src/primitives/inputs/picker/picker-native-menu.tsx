// iOS: Expo UI's universal Picker, SwiftUI's menu Picker. Android draws the same Material exposed dropdown with Argo's colours.
import { Picker as UniversalPicker } from '@expo/ui';
import { createElement, type ReactElement } from 'react';
import type { PickerMenuProps } from './picker-native-menu-props';

export function PickerNativeMenu(props: PickerMenuProps): ReactElement {
  return createElement(
    UniversalPicker<string>,
    {
      selectedValue: props.selectedValue,
      onValueChange: props.onValueChange,
      enabled: props.enabled,
    },
    props.items.map((item) => (
      <UniversalPicker.Item key={item.value} {...item} />
    )),
  );
}
