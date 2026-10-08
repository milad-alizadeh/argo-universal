import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { Text } from '#primitives/text';
import type { NavigationDestination } from '../navigation/context';
import type { ScreenHeaderProps } from '../navigation/screen-header';
import {
  SessionsHeader,
  SessionsScreen,
  sessionsHeaderItems,
  useSessionsFilter,
} from '../screens/sessions-screen';
import { SettingsNavigationList } from './settings-navigation-list';
import { type ShellSection, shellSections } from './shell-sections';

export interface SectionList {
  // The list's own part of the wide window's header row, when it has one.
  header?: ReactNode;
  // The list's trailing items and search in a phone's native header.
  phoneHeader?: Pick<ScreenHeaderProps, 'right' | 'search'>;
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
      phoneHeader: {
        right: sessionsHeaderItems(sessionsFilter),
        search: {
          placeholder: 'Search Sessions',
          onChangeText: sessionsFilter.onQueryChange,
        },
      },
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
      // Insets itself below a transparent header.
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-gutter py-6"
      >
        <Text variant="muted">
          {shellSections[section].title} list will appear here.
        </Text>
      </ScrollView>
    ),
  };
}
