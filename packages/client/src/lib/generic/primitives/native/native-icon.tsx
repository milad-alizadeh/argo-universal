import { RNHostView } from '@expo/ui';
import type * as React from 'react';
import { View } from 'react-native';
import {
  Icon,
  type IconProps,
  type IconSize,
  iconSizeStyle,
} from '../../symbols/icon';

// Argo's Icon inside a native row or bar, sized to its glyph; the row it sits in names it for screen readers.
export function NativeIcon(
  props: Pick<IconProps, 'name' | 'filled' | 'className'> & { size: IconSize },
): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <View
        collapsable={false}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={iconSizeStyle(props.size)}
      >
        <Icon {...props} />
      </View>
    </RNHostView>
  );
}
