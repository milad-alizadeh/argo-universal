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

const railSections = ['sessions', 'issues', 'atlas', 'settings'] as const;
const tileClass = 'rounded-selection';

const SectionButton = memo(function SectionButton({
  section,
  selected,
  attentionCount,
  onSectionChange,
}: Pick<DesktopRailProps, 'attentionCount' | 'onSectionChange'> & {
  section: Section;
  selected: boolean;
}) {
  const { title, icon } = shellSections[section];
  const badge = attentionBadge(attentionCount);
  return (
    <View>
      <IconButton
        icon={icon}
        iconRole="nav"
        filled={selected}
        iconClassName={selected ? 'text-foreground' : 'text-foreground/72'}
        size="2xl"
        variant="ghost"
        accessibilityLabel={title}
        aria-current={selected ? 'page' : undefined}
        onPress={() => onSectionChange(section)}
        className={cn(tileClass, selected && 'bg-selected')}
      />
      {badge && (
        <Badge
          pointerEvents="none"
          className="absolute right-0.5 top-0.5 min-w-4 border-0 bg-warning px-1 py-0"
          accessibilityLabel={badge.label}
        >
          <Text role="badge" className="text-warning-foreground">
            {badge.text}
          </Text>
        </Badge>
      )}
    </View>
  );
});

// The wide window's rail on the glass: a window-controls row, the sections, and the sidebar toggle at the bottom.
export const DesktopRail = memo(function DesktopRail({
  selectedSection,
  attentionCount,
  sidebarShown,
  onSectionChange,
  onSidebarShownChange,
}: DesktopRailProps) {
  return (
    <View
      testID="desktop-rail"
      className="relative w-shell-rail shrink-0 items-center pb-2"
    >
      {/* Electron draws the traffic lights here, and the window drags by it. */}
      <View className="h-shell-control self-stretch web:[app-region:drag]" />
      <View className="-mt-0.5 flex-1 gap-px">
        {railSections.map((section) => (
          <SectionButton
            key={section}
            section={section}
            selected={selectedSection === section}
            attentionCount={section === 'sessions' ? attentionCount : 0}
            onSectionChange={onSectionChange}
          />
        ))}
      </View>
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
      {sidebarShown && (
        <View
          pointerEvents="none"
          className="absolute bottom-4 right-0 top-4 w-px bg-selected"
        />
      )}
    </View>
  );
});
