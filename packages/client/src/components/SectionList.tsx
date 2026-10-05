import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import type { NavigationDestination } from '../navigation/context';
import {
  SessionsHeader,
  SessionsScreen,
  useSessionsFilter,
} from '../screens/SessionsScreen';
import { SettingsNavigationList } from './SettingsNavigationList';
import { type ShellSection, shellSections } from './shell-sections';

export interface SectionList {
  // The list's own part of the shell's header row, when it has one.
  header?: ReactNode;
  list: ReactNode;
}

// A section's list and its header row: full screen on a phone, and in the sidebar on a wide window.
export function useSectionList(
  section: ShellSection,
  selectedDestination?: NavigationDestination,
): SectionList {
  const sessionsFilter = useSessionsFilter();
  if (section === 'sessions')
    return {
      header: <SessionsHeader {...sessionsFilter} />,
      list: (
        <SessionsScreen
          query={sessionsFilter.query}
          archived={sessionsFilter.archived}
        />
      ),
    };
  if (section === 'settings')
    return {
      list: (
        <SettingsNavigationList selectedDestination={selectedDestination} />
      ),
    };
  // Placeholders until each section's list screen is built.
  return {
    list: (
      <View className="flex-1 p-6">
        <Text variant="muted">
          {shellSections[section].title} list will appear here.
        </Text>
      </View>
    ),
  };
}
