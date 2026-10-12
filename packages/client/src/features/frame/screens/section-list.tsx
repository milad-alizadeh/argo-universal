import { type ReactNode, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  SessionsHeader,
  SessionsScreen,
  sessionsHeaderItems,
  sessionsHeaderSearch,
  useSessionsFilter,
} from '#features/sessions';
import { SettingsNavigationList } from '#features/settings';
import { Text } from '#lib/generic/primitives/display/text/text';
import { SearchField } from '#lib/generic/primitives/inputs/search-field/search-field';
import { ListTitle } from '#lib/product/list-title';
import {
  type NavigationDestination,
  useNavigate,
} from '#lib/product/navigation/context';
import type { ScreenHeaderProps } from '#lib/product/navigation/screen-header';
import type { Section } from '../../../lib/product/navigation/sections';
import { shellSections } from '../components/shell-sections';

export interface SectionList {
  // The list's own part of the wide window's header row, when it has one.
  header?: ReactNode;
  // The list's trailing items and search in a phone's native header.
  phoneHeader?: Pick<ScreenHeaderProps, 'right' | 'search'>;
  list: ReactNode;
}

function openSessionId(
  destination: NavigationDestination | undefined,
): string | undefined {
  return destination?.to === 'session' ? destination.id : undefined;
}

// A section's list and its header row: full screen on a phone, and in the sidebar on a wide window.
export function useSectionList(
  section: Section,
  selectedDestination?: NavigationDestination,
): SectionList {
  const sessionsFilter = useSessionsFilter();
  const [settingsQuery, setSettingsQuery] = useState('');
  const navigate = useNavigate();
  const newSession = (): void => navigate({ to: 'new-session' });
  if (section === 'sessions')
    return {
      header: <SessionsHeader {...sessionsFilter} onNewSession={newSession} />,
      phoneHeader: {
        right: sessionsHeaderItems(sessionsFilter),
        search: sessionsHeaderSearch(sessionsFilter, newSession),
      },
      list: (
        <SessionsScreen
          query={sessionsFilter.query}
          archived={sessionsFilter.archived}
          selectedSessionId={openSessionId(selectedDestination)}
        />
      ),
    };
  if (section === 'settings')
    return {
      header: (
        <SearchField
          label="Search Settings"
          value={settingsQuery}
          onChangeText={setSettingsQuery}
          title={<ListTitle>Settings</ListTitle>}
        />
      ),
      list: (
        <SettingsNavigationList
          selectedDestination={selectedDestination}
          query={settingsQuery}
        />
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
        <Text role="secondary">
          {shellSections[section].title} list will appear here.
        </Text>
      </ScrollView>
    ),
  };
}
