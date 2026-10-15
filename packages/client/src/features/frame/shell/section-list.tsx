import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { ScrollView } from 'react-native';
import { SessionsHeader, useSessionsFilter } from '#features/sessions';
import { ListTitle } from '#lib/product/list-title';
import {
  type NavigationDestination,
  useNavigate,
} from '#lib/product/navigation/context';
import { Text } from '#primitives/display/text';
import { SearchField } from '#primitives/inputs/search-field';
import type { Section } from '../../../lib/product/navigation/sections';
import { SessionsScreen } from '../../../screens/sessions/sessions-screen';
import { SettingsNavigationList } from '../../../screens/settings/settings-navigation-list';
import { shellSections } from '../components/shell-sections';

export interface SectionList {
  // The list's own part of the wide window's header row, when it has one.
  header?: ReactNode;
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
    list: sessionsScreen(sessionsFilter, selectedDestination),
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

// A placeholder until the section's list screen is built; insets itself below a transparent header.
export function PlaceholderList({
  section,
}: {
  section: Section;
}): React.JSX.Element {
  const { title } = shellSections[section];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-gutter py-6"
    >
      <Text role="secondary">{title} list will appear here.</Text>
    </ScrollView>
  );
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

  return { list: <PlaceholderList section={section} /> };
}
