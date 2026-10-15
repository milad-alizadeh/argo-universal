import type * as React from 'react';
import { memo } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { IconButton } from '#primitives/buttons/icon-button';
import {
  type Section,
  sectionOrder,
  sections,
} from '../../../../lib/product/navigation/sections';
import { sectionAttentionCount } from '../../state/attention-badge';
import { AttentionBadge } from '../attention-badge/attention-badge';

interface DesktopRailProps {
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
  section: Section;
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
    className: cn(tileClass, 'bg-selected shadow-inset'),
  };
}

function SectionTile(props: SectionButtonProps): React.JSX.Element {
  const { title, icon } = sections[props.section];

  return (
    <IconButton
      icon={icon}
      iconRole="nav"
      iconFilled={props.selected}
      size="xl"
      variant="ghost"
      accessibilityLabel={title}
      onPress={() => props.onSectionChange(props.section)}
      {...selectionProps(props.selected)}
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
    <View className="-mt-0.5 flex-1 gap-px">
      {sectionOrder.map((section) => (
        <SectionButton
          key={section}
          section={section}
          selected={props.selectedSection === section}
          attentionCount={sectionAttentionCount(section, props.attentionCount)}
          onSectionChange={props.onSectionChange}
        />
      ))}
    </View>
  );
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

function RailEdge(props: { sidebarShown: boolean }): React.JSX.Element | null {
  if (!props.sidebarShown) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute bottom-4 right-0 top-4 w-px bg-hairline"
    />
  );
}

// The wide window's rail on the glass: a window-controls row, the sections, and the sidebar toggle at the bottom.
export const FrameRail = memo(function FrameRail(props: DesktopRailProps) {
  return (
    <View
      testID="desktop-rail"
      className="relative w-frame-rail shrink-0 items-center pb-2"
    >
      {/* Electron draws the traffic lights here, and the window drags by it. */}
      <View className="h-frame-control self-stretch web:[app-region:drag]" />
      <RailSections {...props} />
      <SidebarToggle {...props} />
      <RailEdge sidebarShown={props.sidebarShown} />
    </View>
  );
});
