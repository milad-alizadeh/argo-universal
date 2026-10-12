import { memo } from 'react';
import { View } from 'react-native';
import { Badge } from '#lib/generic/primitives/badge';
import { Text } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';
import {
  Pressable,
  contentActionClass,
} from '../../../lib/generic/primitives/pressable';
import { Icon } from '../../../lib/generic/symbols/icon';
import { attentionBadge } from '../state/attention-badge';
import { type Section, shellSections } from './shell-sections';

interface DesktopRailProps {
  selectedSection: Section;
  attentionCount: number;
  sidebarShown: boolean;
  onSectionChange: (section: Section) => void;
  onSidebarShownChange: (shown: boolean) => void;
}

const railSections = ['sessions', 'issues', 'atlas', 'settings'] as const;
const tileClass = 'rounded-selection p-0 transition-none';

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
    <Pressable
      accessibilityLabel={title}
      aria-current={selected ? 'page' : undefined}
      onPress={() => onSectionChange(section)}
      role="button"
      className={contentActionClass({
        variant: 'ghost',
        className: cn(
          'size-12 sm:size-12',
          tileClass,
          selected && 'bg-selected',
        ),
      })}
    >
      <Icon
        size="lg"
        name={icon}
        filled={selected}
        className={selected ? 'text-foreground' : 'text-foreground/72'}
      />
      {badge && (
        <Badge
          className="absolute right-0.5 top-0.5 min-w-4 border-0 bg-warning px-1 py-0"
          accessibilityLabel={badge.label}
        >
          <Text role="badge" className="text-warning-foreground">
            {badge.text}
          </Text>
        </Badge>
      )}
    </Pressable>
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
      <View className="-mt-0.5 flex-1">
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
      <Pressable
        accessibilityLabel={sidebarShown ? 'Hide sidebar' : 'Show sidebar'}
        onPress={() => onSidebarShownChange(!sidebarShown)}
        role="button"
        className={contentActionClass({
          variant: 'ghost',
          className: cn('size-11 sm:size-11', tileClass),
        })}
      >
        <Icon size="lg" name="sidebar" className="text-muted-foreground" />
      </Pressable>
      {sidebarShown && (
        <View
          pointerEvents="none"
          className="absolute bottom-4 right-0 top-4 w-px bg-selected"
        />
      )}
    </View>
  );
});
