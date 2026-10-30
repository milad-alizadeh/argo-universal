import type { PluginBadge } from '@repo/contracts/plugins/runtime';
import type { BadgeCount } from '@repo/kit/badge-count';
import { Icon } from '@repo/kit/primitives/content/icon';
import { ScrollView } from '@repo/kit/primitives/layout/scroll-view';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { memo } from 'react';
import { Pressable, View, type PressableStateCallbackType } from 'react-native';
import {
  type Section,
  type NavigationSection,
} from '../../../../lib/product/navigation/sections';
import { sectionBadge } from '../../utils/section-badge';
import { AttentionBadge } from '../attention-badge/attention-badge';
import { railTiles, useRailTileStyle } from './rail-tile-style';

export interface FrameRailProps {
  items: readonly NavigationSection[];
  // A Plugin page has no list, so no sidebar to toggle.
  hasSidebar: boolean;
  selectedSection: Section;
  attentionCount: number;
  // Each Plugin nav item's own count.
  pluginBadges?: readonly PluginBadge[];
  sidebarShown: boolean;
  onSectionChange: (section: Section) => void;
  onSidebarShownChange: (shown: boolean) => void;
}

type SectionButtonProps = Pick<FrameRailProps, 'onSectionChange'> & {
  section: NavigationSection;
  badge: BadgeCount;
  selected: boolean;
};

type HoverState = PressableStateCallbackType & { hovered?: boolean };

type TileIconProps = Pick<SectionButtonProps, 'section' | 'selected'> & {
  // A pointer over the tile darkens its icon; touch has no hover, so native keeps the muted tone.
  hovered: boolean;
};

const tileClass = (selected: boolean): string =>
  cn(
    'items-center justify-center web:transition-colors web:duration-150 web:active:bg-pressed web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-focus',
    selected
      ? 'web:hover-capable:hover:ring-1 web:hover-capable:hover:ring-border'
      : 'web:hover-capable:hover:bg-hover',
    railTiles.size,
    railTiles.corners,
    selected && railTiles.selected,
  );

function TileIcon(props: TileIconProps): React.JSX.Element {
  return (
    <Icon
      name={props.section.icon}
      size="md"
      filled={props.selected}
      tone={props.selected || props.hovered ? undefined : 'muted'}
    />
  );
}

const tileAccessibility = (props: SectionButtonProps) =>
  ({
    accessibilityRole: 'button',
    accessibilityLabel: props.section.title,
    'aria-current': props.selected ? 'page' : undefined,
  }) as const;

function SectionTile(props: SectionButtonProps): React.JSX.Element {
  // Android fills the selected tile from the Material palette; the style wins over the class there.
  const style = useRailTileStyle(props.selected);

  return (
    <Pressable
      {...tileAccessibility(props)}
      onPress={() => props.onSectionChange(props.section.id)}
      className={tileClass(props.selected)}
      style={style}
    >
      {(state: HoverState) => (
        <TileIcon {...props} hovered={state.hovered === true} />
      )}
    </Pressable>
  );
}

const SectionButton = memo(function SectionButton(props: SectionButtonProps) {
  return (
    <View>
      <SectionTile {...props} />
      <AttentionBadge badge={props.badge} />
    </View>
  );
});

// The sections scroll once Plugins add more than the window holds.
function RailSections(props: FrameRailProps): React.JSX.Element {
  const tiles = props.items.map((section) => (
    <SectionButton key={section.id} {...railSectionProps(section, props)} />
  ));

  const column = props.sidebarShown
    ? railTiles.column
    : railTiles.collapsedColumn;

  return (
    <View className="min-h-0 flex-1 self-stretch">
      <ScrollView accessibilityLabel="Sections">
        <View className={cn('items-center', column)}>{tiles}</View>
      </ScrollView>
    </View>
  );
}

function railSectionProps(
  section: NavigationSection,
  props: FrameRailProps,
): SectionButtonProps {
  return {
    section,
    selected: props.selectedSection === section.id,
    badge: sectionBadge(
      section.id,
      props.attentionCount,
      props.pluginBadges ?? [],
    ),
    onSectionChange: props.onSectionChange,
  };
}

// A tablet's separator starts level with the first tile; the desktop's tinted rail needs none (Paper Variant B).
function RailEdge(props: { sidebarShown: boolean }): React.JSX.Element | null {
  if (!props.sidebarShown) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute bottom-4 right-0 top-4 w-px bg-hairline web:hidden"
    />
  );
}

// The desktop tiles keep the same 8px inset at the top and sides of the glass panel.
export const FrameRail = memo(function FrameRail(props: FrameRailProps) {
  return (
    <View
      testID="desktop-rail"
      className="relative w-frame-rail shrink-0 items-center web:pt-2"
    >
      <RailSections {...props} />
      <RailEdge sidebarShown={props.sidebarShown} />
    </View>
  );
});
