import type * as React from 'react';
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
  onSectionChange: (section: Section) => void;
}

const SectionButton = memo(function SectionButton({
  section,
  selected,
  attentionCount,
  onSectionChange,
}: Omit<DesktopRailProps, 'selectedSection'> & {
  section: Section;
  selected: boolean;
}) {
  const { title, icon } = shellSections[section];
  const badge = attentionBadge(attentionCount);
  return (
    <Pressable
      key={section}
      accessibilityLabel={title}
      accessibilityState={{ selected: selected }}
      aria-pressed={selected}
      onPress={() => onSectionChange(section)}
      role="button"
      className={contentActionClass({
        variant: 'ghost',
        className: cn(
          'size-10 sm:size-10 rounded-md border border-transparent p-0 transition-none',
          selected && 'border-border bg-card shadow-sm',
        ),
      })}
    >
      <Icon
        size="lg"
        name={icon}
        filled={selected}
        className={cn(!selected && 'text-muted-foreground')}
      />
      {section === 'sessions' && badge && (
        <Badge
          className="absolute -right-1 -top-1 min-w-4 border-0 bg-warning px-1 py-0"
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

export const DesktopRail = memo(function DesktopRail({
  selectedSection,
  attentionCount,
  onSectionChange,
}: DesktopRailProps) {
  const sectionButton = (section: Section): React.JSX.Element => (
    <SectionButton
      key={section}
      section={section}
      selected={selectedSection === section}
      attentionCount={section === 'sessions' ? attentionCount : 0}
      onSectionChange={onSectionChange}
    />
  );
  return (
    <View testID="desktop-rail" className="w-shell-bar items-center pb-3">
      <View className="h-shell-bar" />
      <View className="gap-1">
        {(['sessions', 'issues', 'atlas'] as const).map(sectionButton)}
      </View>
      <View className="flex-1" />
      {sectionButton('settings')}
    </View>
  );
});
