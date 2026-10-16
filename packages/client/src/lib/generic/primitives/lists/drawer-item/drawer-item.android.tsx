// Android only: its drawer item is Material's pill, while iOS draws the drawer row in React Native as the web does.
import { RNHostView, Row } from '@expo/ui';
import { Badge, Text } from '@expo/ui/jetpack-compose';
import {
  type ModifierConfig,
  fillMaxWidth,
  padding,
  selectable,
  semantics,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { type CountBadge, countBadge } from '#lib/generic/badge-count';
import { Icon, IconSlot } from '#primitives/display/icon';
import { NativeText } from '#primitives/display/native-text';
import { Host } from '#primitives/native/host';
import type { IconSymbol } from '../../../symbols/icon-symbol';
import { cn } from '../../../utils';
import type { DrawerItemProps } from './drawer-item-props';

// Material 3's navigation drawer item: a 56dp pill, tinted when selected.
const itemHeight = 56;

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
  const highlight = String(useCSSVariable('--color-selected'));

  return {
    height: itemHeight,
    borderRadius: itemHeight / 2,
    backgroundColor: selected ? highlight : 'transparent',
  };
}

// The press ripple fills the pill, so the padding comes after the selectable.
function tabModifiers(
  { label, selected, onPress }: DrawerItemProps,
  badge: CountBadge | undefined,
): ModifierConfig[] {
  const description = [label, badge?.label].filter(Boolean).join(', ');

  return [
    fillMaxWidth(),
    selectable(selected, onPress, 'tab'),
    semantics({ contentDescription: description }),
    padding(startPadding, 0, endPadding, 0),
  ];
}

// Both glyphs stay mounted, since swapping one in loads its image and leaves a blank frame.
function DrawerItemIcon({
  icon,
  selected,
}: DrawerItemProps): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <IconSlot role="nav" collapsable={false}>
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
      <Icon name={icon} role="nav" filled={filled} className={tone} />
    </View>
  );
}

function DrawerItemLabel({ label }: DrawerItemProps): React.JSX.Element {
  return (
    <NativeText role="control" numberOfLines={1} modifiers={[weight(1)]}>
      {label}
    </NativeText>
  );
}

// Material's Badge in Argo's danger red; TalkBack reads it with the row.
function NativeBadge({ badge }: { badge: CountBadge }): React.JSX.Element {
  const container = String(useCSSVariable('--color-danger'));
  const content = String(useCSSVariable('--color-primary-foreground'));

  return (
    <Badge containerColor={container} contentColor={content}>
      <Text>{badge.text}</Text>
    </Badge>
  );
}

DrawerItem satisfies React.ComponentType<DrawerItemProps>;
