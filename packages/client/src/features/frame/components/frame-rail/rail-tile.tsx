import type { BadgeCount } from '@repo/kit/badge-count';
import { Icon } from '@repo/kit/primitives/content/icon';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { memo } from 'react';
import { Pressable, View, type PressableStateCallbackType } from 'react-native';
import {
  type Section,
  type NavigationSection,
} from '../../../../lib/product/navigation/sections';
import { AttentionBadge } from '../attention-badge/attention-badge';
import { railTiles, useRailTileStyle } from './rail-tile-style';

export interface RailTileProps {
  section: NavigationSection;
  badge: BadgeCount;
  selected: boolean;
  onSectionChange: (section: Section) => void;
}

// react-native-web adds `hovered` to Pressable's state; native has none, so touch never reads hover.
type HoverState = PressableStateCallbackType & { hovered?: boolean };

// The CSS fills are gated on `(hover: hover)`; the icon tone follows the same gate so a tap on touch never leaves it dark.
const pointerCanHover = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: hover)').matches;

type TileIconProps = Pick<RailTileProps, 'section' | 'selected'> & {
  // A pointer over the tile darkens its icon; touch has no hover, so native keeps the muted tone.
  hovered: boolean;
};

// The hover, pressed and selected tints every ghost control in Argo takes.
const tileClass = (selected: boolean): string =>
  cn(
    'items-center justify-center web:transition-colors web:duration-150 web:hover-capable:hover:bg-hover web:active:bg-pressed',
    railTiles.size,
    railTiles.corners,
    selected && railTiles.selected,
  );

function TileIcon(props: TileIconProps): React.JSX.Element {
  return (
    <Icon
      name={props.section.icon}
      size="md"
      tone={props.selected || props.hovered ? undefined : 'muted'}
    />
  );
}

const tileIcon = (
  props: RailTileProps,
  state: HoverState,
): React.JSX.Element => (
  <TileIcon {...props} hovered={state.hovered === true && pointerCanHover()} />
);

const tileAccessibility = (props: RailTileProps) =>
  ({
    accessibilityRole: 'button',
    accessibilityLabel: props.section.title,
    'aria-current': props.selected ? 'page' : undefined,
  }) as const;

function SectionTile(props: RailTileProps): React.JSX.Element {
  // Android fills the selected tile from the Material palette; the style wins over the class there.
  const style = useRailTileStyle(props.selected);

  return (
    <Pressable
      {...tileAccessibility(props)}
      onPress={() => props.onSectionChange(props.section.id)}
      className={tileClass(props.selected)}
      style={style}
    >
      {(state: HoverState) => tileIcon(props, state)}
    </Pressable>
  );
}

/*
 * Icons stay outlined when selected, since a Plugin's own icon has no filled twin; a marker at the rail's edge says
 * which section is open instead. Android's Material indicator needs none.
 */
function SelectedMarker(props: { selected: boolean }): React.ReactNode {
  if (!props.selected || !railTiles.marker) return null;

  return (
    <View
      testID="rail-selected-marker"
      pointerEvents="none"
      className={cn(
        'absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-foreground',
        railTiles.marker,
      )}
    />
  );
}

export const RailTile = memo(function RailTile(props: RailTileProps) {
  return (
    <View>
      <SelectedMarker selected={props.selected} />
      <SectionTile {...props} />
      <AttentionBadge badge={props.badge} />
    </View>
  );
});
