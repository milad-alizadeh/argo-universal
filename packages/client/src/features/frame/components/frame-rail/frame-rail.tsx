import type * as React from 'react';
import { memo } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { IconButton } from '#primitives/actions/icon-button';
import { ScrollView } from '#primitives/layout/scroll-view';
import {
  type Section,
  type NavigationSection,
} from '../../../../lib/product/navigation/sections';
import { sectionAttentionCount } from '../../utils/attention-badge';
import { AttentionBadge } from '../attention-badge/attention-badge';
import { railTiles, useRailTileStyle } from './rail-tile-style';

interface DesktopRailProps {
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
  DesktopRailProps,
  'attentionCount' | 'onSectionChange'
> & {
  section: NavigationSection;
  selected: boolean;
};

interface TileSelection {
  iconClassName: string;
  iconWeight?: 'light';
  className: string;
  'aria-current'?: 'page';
}

/*
 * Paper draws SF Regular outlines at 24, the selected one filled. Where the browser draws Material Symbols, Light is
 * the stroke closest to that; the filled glyph keeps Argo's one filled font. Dark greys the outlines to
 * muted-foreground, as Graphite does.
 */
const railIconWeight = 'light';

function selectionProps(selected: boolean): TileSelection {
  if (!selected)
    return {
      iconClassName: 'text-foreground/72 dark:text-muted-foreground',
      iconWeight: railIconWeight,
      className: railTiles.corners,
    };

  return {
    iconClassName: 'text-foreground',
    'aria-current': 'page',
    className: cn(railTiles.corners, railTiles.selected),
  };
}

// Android fills the selected tile from the Material palette; the style wins over the class there.
function useTileSelection(
  selected: boolean,
): TileSelection & { style: ReturnType<typeof useRailTileStyle> } {
  return { ...selectionProps(selected), style: useRailTileStyle(selected) };
}

function SectionTile(props: SectionButtonProps): React.JSX.Element {
  const { title, icon } = props.section;

  return (
    <IconButton
      icon={icon}
      iconRole="nav"
      iconFilled={props.selected}
      size={railTiles.size}
      variant="ghost"
      accessibilityLabel={title}
      onPress={() => props.onSectionChange(props.section.id)}
      {...useTileSelection(props.selected)}
    />
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
function RailSections(props: DesktopRailProps): React.JSX.Element {
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
  props: DesktopRailProps,
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

// The wide window's sections start at the glass panel's top; window controls belong to the band.
export const FrameRail = memo(function FrameRail(props: DesktopRailProps) {
  return (
    <View
      testID="desktop-rail"
      className="relative w-frame-rail shrink-0 items-center"
    >
      <RailSections {...props} />
      <RailEdge sidebarShown={props.sidebarShown} />
    </View>
  );
});
