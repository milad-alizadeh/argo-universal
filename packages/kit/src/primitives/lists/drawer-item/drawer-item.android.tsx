// Android only: its drawer item is Material's pill, while iOS draws the drawer row in React Native as the web does.
import { RNHostView, Row } from '@expo/ui';
import { Badge, Text } from '@expo/ui/jetpack-compose';
import {
  type ModifierConfig,
  defaultMinSize,
  fillMaxWidth,
  padding,
  selectable,
  semantics,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { View } from 'react-native';
import { type CountBadge, countBadge } from '#kit/badge-count';
import { Icon, IconSlot } from '#primitives/content/icon';
import { NativeText } from '#primitives/content/native-text';
import { Host } from '#primitives/native/host';
import { useMaterialPalette } from '#primitives/native/material-palette';
import type { IconSymbol } from '../../../symbols/icon-symbol';
import { cn } from '../../../utils';
import type { DrawerItemProps } from './drawer-item-props';

// Material 3's navigation drawer item: a pill at least 56dp high, tinted when selected. It grows with its label, which an enlarged font size wraps onto more lines.
const itemMinHeight = 56;

const verticalPadding = 8;

const startPadding = 16;

const endPadding = 24;

const iconGap = 12;

export function DrawerItem(props: DrawerItemProps): React.JSX.Element {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <DrawerItemRow {...props} />
    </Host>
  );
}

// A selectable tab row, so TalkBack says which destination is the current one.
function DrawerItemRow(props: DrawerItemProps): React.JSX.Element {
  const badge = countBadge(props.badge);

  return (
    <Row
      alignment="center"
      spacing={iconGap}
      style={usePillStyle(props.selected)}
      modifiers={tabModifiers(props, badge)}
    >
      <DrawerItemIcon {...props} />
      <DrawerItemLabel {...props} />
      {badge && <NativeBadge badge={badge} />}
    </Row>
  );
}

function usePillStyle(
  selected: boolean,
): React.ComponentProps<typeof Row>['style'] {
  // The theme's selection tint, as on every other selected row, in place of Material's secondary container.
  const highlight = useMaterialPalette().roles.selected;

  return {
    borderRadius: itemMinHeight / 2,
    backgroundColor: selected ? highlight : 'transparent',
  };
}

// The press ripple fills the pill, so the padding comes after the selectable. The minimum height is a modifier because the universal style has a height but no minimum.
function tabModifiers(
  { label, selected, onPress }: DrawerItemProps,
  badge: CountBadge | undefined,
): ModifierConfig[] {
  const description = [label, badge?.label].filter(Boolean).join(', ');

  return [
    fillMaxWidth(),
    defaultMinSize({ minHeight: itemMinHeight }),
    selectable(selected, onPress, 'tab'),
    semantics({ contentDescription: description }),
    padding(startPadding, verticalPadding, endPadding, verticalPadding),
  ];
}

// Both glyphs stay mounted, since swapping one in loads its image and leaves a blank frame.
function DrawerItemIcon({
  icon,
  selected,
}: DrawerItemProps): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <IconSlot size="lg" collapsable={false}>
        <IconLayer icon={icon} filled shown={selected} />
        <IconLayer icon={icon} filled={false} shown={!selected} />
      </IconSlot>
    </RNHostView>
  );
}

interface IconLayerProps {
  icon: IconSymbol;
  filled: boolean;
  shown: boolean;
}

function IconLayer({ icon, filled, shown }: IconLayerProps): React.JSX.Element {
  const tone = filled ? 'text-foreground' : 'text-muted-foreground';

  return (
    <View className={cn('absolute', !shown && 'opacity-0')}>
      <Icon name={icon} filled={filled} className={tone} />
    </View>
  );
}

function DrawerItemLabel({ label }: DrawerItemProps): React.JSX.Element {
  return (
    <NativeText role="control" modifiers={[weight(1)]}>
      {label}
    </NativeText>
  );
}

// Material's Badge, on the Host's error role (Argo's danger red); TalkBack reads it with the row.
function NativeBadge({ badge }: { badge: CountBadge }): React.JSX.Element {
  return (
    <Badge>
      <Text>{badge.text}</Text>
    </Badge>
  );
}

DrawerItem satisfies React.ComponentType<DrawerItemProps>;
