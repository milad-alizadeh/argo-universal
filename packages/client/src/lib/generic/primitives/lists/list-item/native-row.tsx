import { RNHostView } from '@expo/ui';
import { Column } from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  padding as composePadding,
} from '@expo/ui/jetpack-compose/modifiers';
import { VStack } from '@expo/ui/swift-ui';
import { padding as swiftPadding } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import type { ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { Icon, iconSizeStyle } from '../../../symbols/icon';
import type { IconName } from '../../../symbols/icon-names';
import { type ListItemProps, listItemStatus } from '../../fields/field-props';
import { NativeControl } from '../../native/native-control';
import { ListItemAccessory } from './list-item-accessory';
import { StatusDot } from './status-dot';

const detailGutter = 16;
const detailBottom = 12;

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
  props: Pick<
    ListItemProps,
    'needsAttention' | 'status' | 'accessory' | 'control'
  >,
): React.JSX.Element {
  return (
    <>
      <NativeRowDot {...props} />
      <NativeRowAccessory accessory={props.accessory} />
      {props.control && <NativeControl>{props.control}</NativeControl>}
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

export function NativeRowDetail({
  detail,
}: Pick<ListItemProps, 'detail'>): React.JSX.Element | null {
  if (!detail) return null;
  const control = <NativeControl>{detail}</NativeControl>;
  return Platform.OS === 'ios' ? (
    <VStack modifiers={[swiftPadding({ bottom: detailBottom })]}>
      {control}
    </VStack>
  ) : (
    <Column
      modifiers={[
        fillMaxWidth(),
        composePadding(detailGutter, 0, detailGutter, detailBottom),
      ]}
    >
      {control}
    </Column>
  );
}
