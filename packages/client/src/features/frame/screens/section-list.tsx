import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  SessionsHeader,
  SessionsPhoneToolbar,
  SessionsScreen,
  sessionsHeaderItems,
  sessionsHeaderSearch,
  useSessionsFilter,
} from '#features/sessions';
import { SettingsNavigationList } from '#features/settings';
import { ListTitle } from '#lib/product/list-title';
import {
  type NavigationDestination,
  useNavigate,
} from '#lib/product/navigation/context';
import type { ScreenHeaderProps } from '#lib/product/navigation/screen-header';
import { Text } from '#primitives/display/text';
import { SearchField } from '#primitives/inputs/search-field';
import type { Section } from '../../../lib/product/navigation/sections';
import { shellSections } from '../components/shell-sections';

export interface SectionList {
  // The list's own part of the wide window's header row, when it has one.
  header?: ReactNode;
  // The list's trailing items and search in a phone's native header.
  phoneHeader?: Pick<ScreenHeaderProps, 'right' | 'search'>;
  // The list's own native toolbar and search bar in a phone's header.
  phoneToolbar?: ReactNode;
  list: ReactNode;
}

function openSessionId(
  destination: NavigationDestination | undefined,
): string | undefined {
  return destination?.to === 'session' ? destination.id : undefined;
}

type SessionsFilter = ReturnType<typeof useSessionsFilter>;

type SettingsSearch = [string, (query: string) => void];

interface SessionsListSource {
  sessionsFilter: SessionsFilter;
  navigate: ReturnType<typeof useNavigate>;
  selectedDestination?: NavigationDestination;
}

function sessionsScreen(
  sessionsFilter: SessionsFilter,
  selectedDestination?: NavigationDestination,
): React.JSX.Element {
  return (
    <SessionsScreen
      query={sessionsFilter.query}
      onQueryChange={sessionsFilter.onQueryChange}
      archived={sessionsFilter.archived}
      selectedSessionId={openSessionId(selectedDestination)}
    />
  );
}

function sessionsList({
  sessionsFilter,
  navigate,
  selectedDestination,
}: SessionsListSource): SectionList {
  const newSession = (): void => navigate({ to: 'new-session' });

  return {
    header: <SessionsHeader {...sessionsFilter} onNewSession={newSession} />,
    ...sessionsPhoneHeader(sessionsFilter, newSession),
    list: sessionsScreen(sessionsFilter, selectedDestination),
  };
}

// The web header row's items and search, and the native toolbar and search bar.
function sessionsPhoneHeader(
  sessionsFilter: SessionsFilter,
  newSession: () => void,
): Pick<SectionList, 'phoneHeader' | 'phoneToolbar'> {
  return {
    phoneHeader: {
      right: sessionsHeaderItems(sessionsFilter),
      search: sessionsHeaderSearch(sessionsFilter, newSession),
    },
    phoneToolbar: (
      <SessionsPhoneToolbar {...sessionsFilter} onNewSession={newSession} />
    ),
  };
}

function settingsSearchField([
  settingsQuery,
  setSettingsQuery,
]: SettingsSearch): React.JSX.Element {
  return (
    <SearchField
      label="Search Settings"
      value={settingsQuery}
      onChangeText={setSettingsQuery}
      title={<ListTitle>Settings</ListTitle>}
    />
  );
}

function settingsList(
  settingsSearch: SettingsSearch,
  selectedDestination?: NavigationDestination,
): SectionList {
  return {
    header: settingsSearchField(settingsSearch),
    list: (
      <SettingsNavigationList
        selectedDestination={selectedDestination}
        query={settingsSearch[0]}
      />
    ),
  };
}

// Placeholders until each section's list screen is built.
function placeholderList(section: Section): SectionList {
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

// A section's list and its header row: full screen on a phone, and in the sidebar on a wide window.
export function useSectionList(
  section: Section,
  selectedDestination?: NavigationDestination,
): SectionList {
  const sessionsFilter = useSessionsFilter();
  const settingsSearch = useState('');
  const navigate = useNavigate();

  if (section === 'sessions')
    return sessionsList({ sessionsFilter, navigate, selectedDestination });

  if (section === 'settings')
    return settingsList(settingsSearch, selectedDestination);

  return placeholderList(section);
}
