import { RNHostView } from '@expo/ui';
import type * as React from 'react';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon, iconSizeStyle } from '../../../symbols/icon';
import type { IconName } from '../../../symbols/icon-names';
import { type ListItemProps, listItemStatus } from '../../fields/field-props';
import { ListItemAccessory } from './list-item-accessory';
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

// An image, such as an Agent's logo, centred in the native row's 24 icon slot.
export function NativeRowImage({
  image,
}: {
  image: ReactElement;
}): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <View
        collapsable={false}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="items-center justify-center"
        style={iconSizeStyle('lg')}
      >
        {image}
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
  if (!accessory) return null;
  return (
    <RNHostView matchContents>
      <ListItemAccessory>{accessory}</ListItemAccessory>
    </RNHostView>
  );
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

// The row's image when it has one, else its icon.
export function NativeRowGlyph({
  icon,
  leading,
}: {
  icon?: IconName;
  leading?: ReactElement;
}): React.JSX.Element | null {
  if (leading) return <NativeRowImage image={leading} />;
  return icon ? <NativeRowIcon icon={icon} /> : null;
}
