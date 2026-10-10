import { RNHostView } from '@expo/ui';
import type * as React from 'react';
import { View } from 'react-native';
import { Icon, iconSizeStyle } from '../symbols/icon';
import type { IconName } from '../symbols/icon-names';
import type { ListItemProps } from './field-props';

export function NativeRowIcon({ icon }: { icon: IconName }): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <View
        collapsable={false}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={iconSizeStyle('lg')}
      >
        <Icon name={icon} size="lg" />
      </View>
    </RNHostView>
  );
}

function NativeRowAttention({
  visible = true,
}: {
  visible?: boolean;
}): React.JSX.Element | null {
  if (!visible) return null;
  return (
    <RNHostView matchContents>
      <View
        collapsable={false}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="rounded-full bg-warning"
        style={{ width: 8, height: 8 }}
      />
    </RNHostView>
  );
}

function NativeRowAccessory({
  accessory,
}: Pick<ListItemProps, 'accessory'>): React.JSX.Element | null {
  return accessory ? <RNHostView matchContents>{accessory}</RNHostView> : null;
}

export function NativeRowStatus(
  props: Pick<ListItemProps, 'needsAttention' | 'accessory'>,
): React.JSX.Element {
  return (
    <>
      <NativeRowAttention visible={!!props.needsAttention} />
      <NativeRowAccessory accessory={props.accessory} />
    </>
  );
}
