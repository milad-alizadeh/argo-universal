import { View } from 'react-native';
import { Text } from '#primitives/text';
import type { NavigationDestination } from '../navigation/context';
import { SettingsNavigationList } from './SettingsNavigationList';
import { type ShellSection, shellSections } from './shell-sections';

export interface SectionListProps {
  section: ShellSection;
  selectedDestination?: NavigationDestination;
}

// A section's list: full screen on a phone, and in the sidebar on a wide window.
export function SectionList({
  section,
  selectedDestination,
}: SectionListProps) {
  if (section === 'settings')
    return <SettingsNavigationList selectedDestination={selectedDestination} />;
  // Placeholders until each section's list screen is built.
  return (
    <View className="flex-1 p-6">
      <Text variant="muted">
        {shellSections[section].title} list will appear here.
      </Text>
    </View>
  );
}
