import { useState, type ReactElement } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { PickerMenu } from './list-item-picker-menu.ios';
import type { ListItemPickerProps } from './list-item-picker-props';
import { PickerRow } from './list-item-picker-row';

// Keep the row in React Native; the SwiftUI menu hosts only its transparent hit target.
export function ListItemPicker<Value extends string>(
  props: ListItemPickerProps<Value>,
): ReactElement {
  const { size, onLayout } = useRowLayout();

  return (
    <View onLayout={onLayout}>
      <View accessibilityElementsHidden>
        <PickerRow {...props} />
      </View>
      <View className="absolute inset-0">
        <PickerMenu {...props} size={size} />
      </View>
    </View>
  );
}

type Size = { width: number; height: number };

type RowLayout = { size: Size; onLayout: (event: LayoutChangeEvent) => void };

function useRowLayout(): RowLayout {
  const [size, setSize] = useState({ width: 0, height: 0 });

  return { size, onLayout: ({ nativeEvent }) => setSize(nativeEvent.layout) };
}
