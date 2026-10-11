import { RNHostView } from '@expo/ui';
import type * as React from 'react';
import { View } from 'react-native';
import { Icon, iconSizeStyle } from '../symbols/icon';
import type { IconName } from '../symbols/icon-names';
import { type ListItemProps, listItemStatus } from './field-props';
import { StatusDot } from './status-dot';

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

function NativeRowDot(
  props: Pick<ListItemProps, 'needsAttention' | 'status'>,
): React.JSX.Element | null {
  const status = listItemStatus(props);
  if (!status) return null;
  return (
    <RNHostView matchContents>
      <StatusDot status={status} />
    </RNHostView>
  );
}

function NativeRowAccessory({
  accessory,
}: Pick<ListItemProps, 'accessory'>): React.JSX.Element | null {
  return accessory ? <RNHostView matchContents>{accessory}</RNHostView> : null;
}

export function NativeRowStatus(
  props: Pick<ListItemProps, 'needsAttention' | 'status' | 'accessory'>,
): React.JSX.Element {
  return (
    <>
      <NativeRowDot {...props} />
      <NativeRowAccessory accessory={props.accessory} />
    </>
  );
}
