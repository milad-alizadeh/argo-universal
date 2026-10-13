import type * as React from 'react';
import { memo } from 'react';
import { View } from 'react-native';
import { Badge } from '#lib/generic/primitives/display/badge/badge';
import { Text } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';
import { IconButton } from '../../../../lib/generic/primitives/buttons/icon-button/icon-button';
import { attentionBadge } from '../../state/attention-badge';
import { type Section, shellSections } from '../shell-sections';

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

const railSections = ['sessions', 'issues', 'atlas', 'settings'] as const;
const tileClass = 'rounded-selection';

function selectionProps(selected: boolean): TileSelection {
  if (!selected)
    return { iconClassName: 'text-foreground/72', className: tileClass };
  return {
    iconClassName: 'text-foreground',
    'aria-current': 'page',
    className: cn(tileClass, 'bg-selected'),
  };
}

function SectionTile(props: SectionButtonProps): React.JSX.Element {
  const { title, icon } = shellSections[props.section];
  return (
    <IconButton
      icon={icon}
      iconRole="nav"
      filled={props.selected}
      size="2xl"
      variant="ghost"
      accessibilityLabel={title}
      onPress={() => props.onSectionChange(props.section)}
      {...selectionProps(props.selected)}
    />
  );
}

function SectionBadge(props: SectionButtonProps): React.JSX.Element | null {
  const badge = attentionBadge(props.attentionCount);
  if (!badge) return null;
  return (
    <Badge
      pointerEvents="none"
      className="absolute right-0.5 top-0.5 min-w-4 border-0 bg-warning px-1 py-0"
      accessibilityLabel={badge.label}
    >
      <Text role="badge" className="text-warning-foreground">
        {badge.text}
      </Text>
    </Badge>
  );
}

const SectionButton = memo(function SectionButton(props: SectionButtonProps) {
  return (
    <View>
      <SectionTile {...props} />
      <SectionBadge {...props} />
    </View>
  );
});

function RailSections(props: DesktopRailProps): React.JSX.Element {
  return (
    <View className="-mt-0.5 flex-1 gap-px">
      {railSections.map((section) => (
        <SectionButton
          key={section}
          section={section}
          selected={props.selectedSection === section}
          attentionCount={section === 'sessions' ? props.attentionCount : 0}
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
      size="xl"
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
      className="absolute bottom-4 right-0 top-4 w-px bg-selected"
    />
  );
}

// The wide window's rail on the glass: a window-controls row, the sections, and the sidebar toggle at the bottom.
export const DesktopRail = memo(function DesktopRail(props: DesktopRailProps) {
  return (
    <View
      testID="desktop-rail"
      className="relative w-shell-rail shrink-0 items-center pb-2"
    >
      {/* Electron draws the traffic lights here, and the window drags by it. */}
      <View className="h-shell-control self-stretch web:[app-region:drag]" />
      <RailSections {...props} />
      <SidebarToggle {...props} />
      <RailEdge sidebarShown={props.sidebarShown} />
    </View>
  );
});
