import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import type { GroupedListItemProps } from './grouped-list-item-props';

// Paper's compact popover rows put the selected value below their label.
export function OverlayRowTitle(props: GroupedListItemProps): ReactElement {
  return (
    <View className="min-w-0 flex-1">
      <Text aria-hidden>{props.label}</Text>
      <View className="flex-row items-center gap-2">
        {props.valueLeading}
        <Text aria-hidden role="secondary">
          {props.value}
        </Text>
      </View>
    </View>
  );
}
