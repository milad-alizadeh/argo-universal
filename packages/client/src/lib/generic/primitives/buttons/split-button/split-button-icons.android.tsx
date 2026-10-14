import { DropdownMenuItem, RNHostView } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { SelectedCheck } from '#primitives/display/selected-check';

// The chevron is drawn by React Native inside its stock button; it never takes the touch.
export function ChevronIcon(): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Icon name="chevron-down" role="control" />
      </View>
    </RNHostView>
  );
}

// The chosen item's trailing check.
export function ItemCheck(): React.JSX.Element {
  return (
    <DropdownMenuItem.TrailingIcon>
      <RNHostView matchContents>
        <SelectedCheck />
      </RNHostView>
    </DropdownMenuItem.TrailingIcon>
  );
}
