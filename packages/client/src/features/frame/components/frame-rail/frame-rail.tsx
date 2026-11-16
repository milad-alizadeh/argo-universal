import type { PluginBadge } from '@repo/contracts/plugins/runtime';
import { ScrollView } from '@repo/kit/primitives/layout/scroll-view';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { memo } from 'react';
import { View } from 'react-native';
import {
  type Section,
  type NavigationSection,
} from '../../../../lib/product/navigation/sections';
import { sectionBadge } from '../../utils/section-badge';
import { RailTile, type RailTileProps } from './rail-tile';
import { railTiles } from './rail-tile-style';

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

// The sections scroll once Plugins add more than the window holds.
function RailSections(props: FrameRailProps): React.JSX.Element {
  const tiles = props.items.map((section) => (
    <RailTile key={section.id} {...railSectionProps(section, props)} />
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
): RailTileProps {
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
