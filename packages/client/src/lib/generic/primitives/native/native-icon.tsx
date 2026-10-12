import { RNHostView } from '@expo/ui';
import type * as React from 'react';
import { View } from 'react-native';
import { Icon, type IconProps, type IconRole } from '../../symbols/icon';
import { useIconBox } from '../../symbols/icon-role';

// Argo's Icon inside a native row or bar, sized to its glyph; the row it sits in names it for screen readers.
export function NativeIcon(
  props: Pick<IconProps, 'name' | 'filled' | 'className'> & { role: IconRole },
): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <View
        collapsable={false}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={useIconBox(props.role)}
      >
        <Icon {...props} />
      </View>
    </RNHostView>
  );
}
