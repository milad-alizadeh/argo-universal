import { Icon } from '@repo/kit/primitives/content/icon';
import { ScrollView } from '@repo/kit/primitives/layout/scroll-view';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import {
  type Section,
  type NavigationSection,
} from '../../../../lib/product/navigation/sections';
import { sectionAttentionCount } from '../../utils/attention-badge';
import { AttentionBadge } from '../attention-badge/attention-badge';
import { railTiles, useRailTileStyle } from './rail-tile-style';

export interface FrameRailProps {
  items: readonly NavigationSection[];
  // A Plugin page has no list, so no sidebar to toggle.
  hasSidebar: boolean;
  selectedSection: Section;
  attentionCount: number;
  sidebarShown: boolean;
  onSectionChange: (section: Section) => void;
  onSidebarShownChange: (shown: boolean) => void;
}

type SectionButtonProps = Pick<
  FrameRailProps,
  'attentionCount' | 'onSectionChange'
> & {
  section: NavigationSection;
  selected: boolean;
};

const tileClass = (selected: boolean): string =>
  cn(
    'items-center justify-center web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-focus',
    railTiles.size,
    railTiles.corners,
    selected && railTiles.selected,
  );

function TileIcon(props: SectionButtonProps): React.JSX.Element {
  return (
    <Icon
      name={props.section.icon}
      role="nav"
      filled={props.selected}
      tone={props.selected ? undefined : 'muted'}
    />
  );
}

function SectionTile(props: SectionButtonProps): React.JSX.Element {
  // Android fills the selected tile from the Material palette; the style wins over the class there.
  const style = useRailTileStyle(props.selected);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.section.title}
      aria-current={props.selected ? 'page' : undefined}
      onPress={() => props.onSectionChange(props.section.id)}
      className={tileClass(props.selected)}
      style={style}
    >
      <TileIcon {...props} />
    </Pressable>
  );
}

const SectionButton = memo(function SectionButton(props: SectionButtonProps) {
  return (
    <View>
      <SectionTile {...props} />
      <AttentionBadge count={props.attentionCount} />
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
    attentionCount: sectionAttentionCount(section.id, props.attentionCount),
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
