import type * as React from 'react';
import { memo } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { IconButton } from '#primitives/actions/icon-button';
import {
  type Section,
  type NavigationSection,
} from '../../../../lib/product/navigation/sections';
import { sectionAttentionCount } from '../../utils/attention-badge';
import { AttentionBadge } from '../attention-badge/attention-badge';
import { useRailTileStyle } from './rail-tile-style';

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
  className: string;
  'aria-current'?: 'page';
}

const tileClass = 'rounded-xl';

function selectionProps(selected: boolean): TileSelection {
  if (!selected)
    return { iconClassName: 'text-foreground/72', className: tileClass };

  return {
    iconClassName: 'text-foreground',
    'aria-current': 'page',
    className: cn(tileClass, 'bg-selected'),
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
      size="xl"
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

function RailSections(props: DesktopRailProps): React.JSX.Element {
  return (
    <View className="flex-1 gap-px web:-mt-0.5">
      {props.items.map((section) => (
        <SectionButton key={section.id} {...railSectionProps(section, props)} />
      ))}
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

function SidebarToggle(props: DesktopRailProps): React.JSX.Element {
  const { sidebarShown, onSidebarShownChange } = props;

  return (
    <IconButton
      icon="sidebar"
      iconRole="nav"
      iconClassName="text-muted-foreground"
      size="lg"
      variant="ghost"
      accessibilityLabel={sidebarShown ? 'Hide sidebar' : 'Show sidebar'}
      onPress={() => onSidebarShownChange(!sidebarShown)}
      className={tileClass}
    />
  );
}

// The separator starts below the window-controls row, clear of the traffic lights; a tablet has no such row, so it starts level with the first tile.
function RailEdge(props: { sidebarShown: boolean }): React.JSX.Element | null {
  if (!props.sidebarShown) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute bottom-4 right-0 top-4 w-px bg-hairline web:top-frame-control"
    />
  );
}

// The wide window's rail on the glass: a window-controls row, the sections, and the sidebar toggle at the bottom.
export const FrameRail = memo(function FrameRail(props: DesktopRailProps) {
  return (
    <View
      testID="desktop-rail"
      className="relative w-frame-rail shrink-0 items-center pb-2 native:pt-4"
    >
      {/* Electron draws the traffic lights here, and the window drags by it; a tablet has no window controls, so its first tile sits inset from the rail's top edge by the same 16 as its sides. */}
      <View className="hidden h-frame-control self-stretch web:flex web:[app-region:drag]" />
      <RailSections {...props} />
      {props.hasSidebar ? <SidebarToggle {...props} /> : null}
      <RailEdge sidebarShown={props.sidebarShown} />
    </View>
  );
});
