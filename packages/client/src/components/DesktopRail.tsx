import { memo } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { Badge } from '#primitives/badge';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Icon } from './Icon';
import { type ShellSection, shellSections } from './shell-sections';

interface DesktopRailProps {
  selectedSection: ShellSection;
  attentionCount: number;
  onSectionChange: (section: ShellSection) => void;
}

const SectionButton = memo(function SectionButton({
  section,
  selected,
  attentionCount,
  onSectionChange,
}: Omit<DesktopRailProps, 'selectedSection'> & {
  section: ShellSection;
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
        as={icon}
        weight={selected ? 'fill' : 'regular'}
        className={cn(!selected && 'text-muted-foreground')}
      />
      {section === 'sessions' && attentionCount > 0 && (
        <Badge
          className="absolute -right-1 -top-1 min-w-4 border-0 bg-warning px-1 py-0"
          accessibilityLabel={`${attentionCount} ${attentionCount === 1 ? 'Session needs' : 'Sessions need'} attention`}
        >
          <Text className="text-[10px] font-semibold text-warning-foreground">
            {attentionCount > 99 ? '99+' : attentionCount}
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
  const sectionButton = (section: ShellSection) => (
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
