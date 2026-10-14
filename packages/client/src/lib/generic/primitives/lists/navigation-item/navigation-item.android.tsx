import {
  RNHostView,
  Row,
  Text,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import {
  type ModifierConfig,
  background,
  fillMaxWidth,
  height,
  padding,
  selectable,
  semantics,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { Icon, IconSlot } from '#primitives/display/icon';
import { Host } from '#primitives/native/host';
import { roundedClip } from '#primitives/native/native-modifiers';
import { useComposeTextStyle } from '#primitives/native/native-typography';
import type { IconName } from '../../../symbols/icon-names';
import { cn } from '../../../utils';
import type { NavigationItemProps } from './navigation-item.tsx';

// Material 3's navigation drawer item: a 56dp pill, tinted when selected.
const itemHeight = 56;

const startPadding = 16;

const endPadding = 24;

const iconGap = 12;

export function NavigationItem(props: NavigationItemProps): React.JSX.Element {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <NavigationItemRow {...props} />
    </Host>
  );
}

// A selectable tab row, so TalkBack says which destination is the current one.
function NavigationItemRow(props: NavigationItemProps): React.JSX.Element {
  return (
    <Row
      horizontalArrangement={{ spacedBy: iconGap }}
      verticalAlignment="center"
      modifiers={[...usePillModifiers(props.selected), ...tabModifiers(props)]}
    >
      <NavigationItemIcon {...props} />
      <NavigationItemLabel {...props} />
      <NativeBadge badge={props.badge} />
    </Row>
  );
}

function usePillModifiers(selected: boolean): ModifierConfig[] {
  // The theme's selection tint, as on every other selected row, in place of Material's secondary container.
  const highlight = String(useCSSVariable('--color-selected'));

  return [
    fillMaxWidth(),
    height(itemHeight),
    roundedClip(itemHeight / 2),
    background(selected ? highlight : 'transparent'),
  ];
}

function tabModifiers({
  title,
  selected,
  badge,
  onPress,
}: NavigationItemProps): ModifierConfig[] {
  const description = [title, badge?.label].filter(Boolean).join(', ');

  return [
    selectable(selected, onPress, 'tab'),
    semantics({ contentDescription: description }),
    padding(startPadding, 0, endPadding, 0),
  ];
}

// Both glyphs stay mounted, since swapping one in loads its image and leaves a blank frame.
function NavigationItemIcon({
  icon,
  selected,
}: NavigationItemProps): React.JSX.Element {
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
  icon: IconName;
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

function NavigationItemLabel({
  title,
  selected,
}: NavigationItemProps): React.JSX.Element {
  const colors = useMaterialColors();
  const color = selected ? colors.onSurface : colors.onSurfaceVariant;
  const style = useComposeTextStyle('control');

  return (
    <Text color={color} style={style} maxLines={1} modifiers={[weight(1)]}>
      {title}
    </Text>
  );
}

function NativeBadge({
  badge,
}: Pick<NavigationItemProps, 'badge'>): React.JSX.Element | null {
  if (!badge) return null;

  return <RNHostView matchContents>{badge.element}</RNHostView>;
}
