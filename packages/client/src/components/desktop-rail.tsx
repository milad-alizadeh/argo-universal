import type * as React from 'react';
import { memo } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { Badge } from '#primitives/badge';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';
import { maximumAttentionBadgeCount } from './attention-badge';
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
  return (
    <Button
      key={section}
      variant="ghost"
      className={cn(
        'size-10 sm:size-10 rounded-md border border-transparent p-0 transition-none',
        selected && 'border-border bg-card shadow-sm',
      )}
      accessibilityLabel={title}
      accessibilityState={{ selected: selected }}
      aria-selected={selected}
      onPress={() => onSectionChange(section)}
    >
      <Icon
        size="lg"
        name={icon}
        filled={selected}
        className={cn(!selected && 'text-muted-foreground')}
      />
      {section === 'sessions' && attentionCount > 0 && (
        <Badge
          className="absolute -right-1 -top-1 min-w-4 border-0 bg-warning px-1 py-0"
          accessibilityLabel={`${attentionCount} ${attentionCount === 1 ? 'Session needs' : 'Sessions need'} attention`}
        >
          <Text className="text-[10px] font-semibold text-warning-foreground">
            {attentionCount > maximumAttentionBadgeCount
              ? `${maximumAttentionBadgeCount}+`
              : attentionCount}
          </Text>
        </Badge>
      )}
    </Button>
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
